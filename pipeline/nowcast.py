"""
Daily update without the full archive.

Downloads the last few days of near-real-time VIIRS data (NOAA-20 + NOAA-21) from NASA FIRMS,
turns it into the Mee Fire Index with the same rules as harmonize.py, writes those days into
the site's existing calendars, and recomputes every area's status against its stored normals.

It needs only what is already published in web/public/data, plus a FIRMS key, and the Python
standard library. It runs every day on GitHub Actions (.github/workflows/daily-update.yml).

Same rules as the full pipeline:
  - VIIRS confidence nominal/high, repeats counted once
  - detection -> 0.01 deg cell -> township (cell centre inside the township polygon)
  - township MFI = mean over observing VIIRS satellites of (NOAA-20 count, NOAA-21 count x factor)
  - state and national MFI = sum of their townships
  - status: far above normal if 7-day MFI >= max(p90, 10), above normal if >= max(p75, 5)

Usage:
  FIRMS_MAP_KEY=... python pipeline/nowcast.py            # download + update
  python pipeline/nowcast.py --raw data/raw --end 2026-11-13   # use local CSVs (testing)
"""
import argparse
import csv
import io
import json
import math
import os
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web" / "public" / "data"
BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
BBOX = "92,5,110,29"           # same box as the archive download
CELL = 0.01
WINDOW_DAYS = 10
SOURCES = {"N20": "VIIRS_NOAA20_NRT", "N21": "VIIRS_NOAA21_NRT"}
DEFAULT_N21_FACTOR = 1.0       # used only if factors.json is missing


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ---------------------------------------------------------------- data in
def fetch(source: str, start: date, days: int, key: str) -> str:
    url = f"{BASE}/{key}/{source}/{BBOX}/{days}/{start.isoformat()}"
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                text = r.read().decode("utf-8")
            if "latitude" in text.split("\n", 1)[0].lower():
                return text
            raise RuntimeError(text.strip()[:200])
        except Exception as e:  # noqa: BLE001 - retry any network/API hiccup
            if "invalid" in str(e).lower() and "key" in str(e).lower():
                sys.exit("FIRMS says the MAP_KEY is invalid.")
            log(f"{source} {start}: attempt {attempt} failed ({e}); retrying")
            time.sleep(5 * attempt)
    sys.exit(f"Could not download {source} from {start} after 5 attempts.")


def download(start: date, end: date, key: str) -> dict[str, str]:
    out = {}
    for grp, src in SOURCES.items():
        parts, d = [], start
        while d <= end:
            n = min(5, (end - d).days + 1)
            parts.append(fetch(src, d, n, key))
            d += timedelta(days=n)
        out[grp] = "\n".join(parts)
        log(f"{src}: downloaded {start} to {end}")
    return out


def read_local(raw: Path) -> dict[str, str]:
    out = {}
    for grp, src in SOURCES.items():
        files = sorted((raw / src).glob("*.csv"))
        out[grp] = "\n".join(f.read_text(encoding="utf-8") for f in files)
    return out


def parse(text: str, start: date, end: date):
    """Yield (lat, lon, day) for clean detections; also return the set of days with any data."""
    seen, rows, observed = set(), [], set()
    header = None
    for line in text.splitlines():
        if not line.strip():
            continue
        if line.lower().startswith("latitude"):
            header = next(csv.reader([line]))
            continue
        if header is None:
            continue
        r = dict(zip(header, next(csv.reader([line]))))
        try:
            day = date.fromisoformat(r["acq_date"])
            lat, lon = float(r["latitude"]), float(r["longitude"])
        except (KeyError, ValueError):
            continue
        if not (start <= day <= end):
            continue
        observed.add(day)  # the satellite delivered data for this day (any confidence)
        if r.get("confidence", "").strip().lower() not in ("n", "h", "nominal", "high"):
            continue
        k = (lat, lon, day, r.get("acq_time"))
        if k in seen:
            continue
        seen.add(k)
        rows.append((lat, lon, day))
    return rows, observed


# ---------------------------------------------------------------- geometry
class Townships:
    """Point-in-polygon on the published township shapes, with a bounding-box prefilter."""

    def __init__(self, gj: dict):
        self.items = []
        for f in gj["features"]:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            xs = [x for poly in polys for x, _ in poly[0]]
            ys = [y for poly in polys for _, y in poly[0]]
            self.items.append((f["properties"]["area_id"], (min(xs), min(ys), max(xs), max(ys)), polys))
        self.cache: dict[tuple[int, int], str | None] = {}

    @staticmethod
    def _in_ring(x: float, y: float, ring) -> bool:
        inside, j = False, len(ring) - 1
        for i in range(len(ring)):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
        return inside

    def lookup(self, lat: float, lon: float) -> str | None:
        cell = (math.floor(lon / CELL), math.floor(lat / CELL))
        if cell in self.cache:
            return self.cache[cell]
        x, y = (cell[0] + 0.5) * CELL, (cell[1] + 0.5) * CELL
        hit = None
        for aid, (x0, y0, x1, y1), polys in self.items:
            if x0 <= x <= x1 and y0 <= y <= y1:
                for poly in polys:
                    if self._in_ring(x, y, poly[0]) and not any(self._in_ring(x, y, h) for h in poly[1:]):
                        hit = aid
                        break
            if hit:
                break
        self.cache[cell] = hit
        return hit


# ---------------------------------------------------------------- status
def level_for(r7: float, p75: float, p90: float) -> str:
    if r7 >= max(p90, 10):
        return "high"
    if r7 >= max(p75, 5):
        return "elevated"
    return "normal"


def day_index(a: dict, d: date) -> tuple[int, int] | None:
    if d.year not in a["years"]:
        return None
    return a["years"].index(d.year), d.timetuple().tm_yday - 1


def ensure_year(a: dict, year: int) -> None:
    if year not in a["years"]:
        a["years"].append(year)
        a["calendar"].append([0] * 366)


def update_status(a: dict, last: date) -> None:
    r7 = 0.0
    for i in range(7):
        ix = day_index(a, last - timedelta(days=i))
        if ix:
            r7 += a["calendar"][ix[0]][ix[1]]
    doy = last.timetuple().tm_yday - 1
    n = a["normals"]
    p50, p75, p90 = (n[k][doy] if doy < len(n[k]) else 0 for k in ("p50", "p75", "p90"))
    a["status"] = {"level": level_for(r7, p75, p90), "r7": round(r7, 1),
                   "p50": round(p50, 1), "p75": round(p75, 1), "p90": round(p90, 1)}
    a["last_date"] = last.isoformat()
    # running total for the current year
    yi = a["years"].index(last.year)
    total = round(sum(a["calendar"][yi]))
    season = next((s for s in a["seasons"] if s["year"] == last.year), None)
    if season is None:
        a["seasons"].append({"year": last.year, "total": total, "start_date": None, "peak_date": None,
                             "end_date": None, "peak_7day": None, "rank": None, "vs_median": None,
                             "complete_year": False})
    else:
        season["total"] = total


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, help="read <raw>/VIIRS_NOAA2x_NRT/*.csv instead of downloading")
    ap.add_argument("--end", type=date.fromisoformat, help="last day to update (default: today, UTC)")
    a = ap.parse_args()

    end = a.end or datetime.now(timezone.utc).date()
    start = end - timedelta(days=WINDOW_DAYS - 1)

    if a.raw:
        texts = read_local(a.raw)
    else:
        key = os.environ.get("FIRMS_MAP_KEY")
        if not key:
            sys.exit("FIRMS_MAP_KEY is not set.")
        texts = download(start, end, key)

    areas = json.loads((WEB / "areas.json").read_text())
    gj = json.loads((WEB / "townships.geojson").read_text())
    fpath = WEB / "factors.json"
    factors = json.loads(fpath.read_text()) if fpath.exists() else None
    if factors is None:
        log(f"factors.json not found: using NOAA-21 factor {DEFAULT_N21_FACTOR}")
    state_of = {x["area_id"]: x["state"] for x in areas if x["level"] == "township"}
    townships = [x["area_id"] for x in areas if x["level"] == "township"]

    geo = Townships(gj)
    counts: dict[tuple[str, date], dict[str, int]] = defaultdict(lambda: {"N20": 0, "N21": 0})
    observed: dict[str, set[date]] = {}
    for grp, text in texts.items():
        rows, obs = parse(text, start, end)
        observed[grp] = obs
        for lat, lon, d in rows:
            tid = geo.lookup(lat, lon)
            if tid in state_of:
                counts[(tid, d)][grp] += 1
        log(f"{grp}: {len(rows):,} clean detections, data for {len(obs)} days")

    days = sorted(observed["N20"] | observed["N21"])
    if not days:
        sys.exit("No near-real-time data in the window. Nothing updated.")

    def n21_factor(state: str | None, month: int) -> float:
        if not factors:
            return DEFAULT_N21_FACTOR
        f = (factors.get("N21", {}).get(state or "", {}) or {}).get(str(month))
        return f if f is not None else factors.get("N21_national", DEFAULT_N21_FACTOR)

    # Township MFI for every township and every observed day (zeros included)
    mfi: dict[str, dict[date, float]] = {t: {} for t in townships}
    for d in days:
        c20, c21 = d in observed["N20"], d in observed["N21"]
        k = int(c20) + int(c21)
        for t in townships:
            c = counts.get((t, d))
            if not c:
                mfi[t][d] = 0.0
                continue
            e = (c["N20"] if c20 else 0) + (c["N21"] * n21_factor(state_of[t], d.month) if c21 else 0)
            mfi[t][d] = e / k
    state_mfi: dict[str, dict[date, float]] = defaultdict(lambda: defaultdict(float))
    nat: dict[date, float] = defaultdict(float)
    for t, series in mfi.items():
        for d, v in series.items():
            state_mfi[state_of[t]][d] += v
            nat[d] += v

    last = days[-1]
    written = 0
    status_by_id = {}
    for x in areas:
        p = WEB / "area" / f"{x['area_id']}.json"
        if not p.exists():
            continue
        a_ = json.loads(p.read_text())
        series = mfi.get(x["area_id"]) if x["level"] == "township" else (
            state_mfi.get(x["area_id"], {}) if x["level"] == "state" else nat)
        ensure_year(a_, last.year)
        for d in days:
            ix = day_index(a_, d)
            if ix:
                a_["calendar"][ix[0]][ix[1]] = round(series.get(d, 0.0), 1)
        update_status(a_, last)
        p.write_text(json.dumps(a_, separators=(",", ":"), allow_nan=False))
        s = a_["status"]
        x.update({"status": s["level"], "r7": s["r7"], "p75": s["p75"], "p90": s["p90"]})
        status_by_id[x["area_id"]] = s["level"]
        written += 1

    (WEB / "areas.json").write_text(json.dumps(areas, separators=(",", ":")))
    for f in gj["features"]:
        f["properties"]["status"] = status_by_id.get(f["properties"]["area_id"], "normal")
    (WEB / "townships.geojson").write_text(json.dumps(gj, separators=(",", ":")))
    meta = json.loads((WEB / "meta.json").read_text())
    meta["last_date"] = last.isoformat()
    meta["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    meta["updated_by"] = "nowcast (near-real-time VIIRS)"
    (WEB / "meta.json").write_text(json.dumps(meta, indent=2))

    levels = defaultdict(int)
    for x in areas:
        if x["level"] == "township":
            levels[x["status"]] += 1
    log(f"updated {written} areas for {days[0]} to {last}; townships: {dict(levels)}")


if __name__ == "__main__":
    main()
