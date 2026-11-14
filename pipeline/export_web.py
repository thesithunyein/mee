"""
Stage 3: export harmonized results as small static JSON files for the web app.

Writes into web/public/data/:
  areas.json                  every township/state/national area with its current status
  area/<area_id>.json         burning calendar (year x day-of-year MFI), normals, seasons
  townships.geojson           simplified township boundaries (with area_id + current level)
  validation.json             hold-out validation results (+ weekly series for the chart)
  meta.json                   data coverage, sources, generated time

Usage: python export_web.py
"""
import json
import time
from datetime import date, datetime, timezone
from pathlib import Path

import duckdb
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "processed"
BND = ROOT / "data" / "boundaries"
WEB = ROOT / "web" / "public" / "data"
(WEB / "area").mkdir(parents=True, exist_ok=True)

ADM3_SIMPLIFIED = ("https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/"
                   "MMR/ADM3/geoBoundaries-MMR-ADM3_simplified.geojson")
FIRST_YEAR = 2001


def p(path: Path) -> str:
    return path.as_posix()


def level_for(r7: float, p75: float, p90: float) -> str:
    # Small absolute floor so a township with 1-2 detections isn't flagged as "high"
    if r7 >= max(p90, 10):
        return "high"
    if r7 >= max(p75, 5):
        return "elevated"
    return "normal"


def main() -> None:
    t0 = time.time()
    con = duckdb.connect()
    con.execute(f"CREATE TABLE mfi AS SELECT * FROM '{p(OUT / 'mfi_day.parquet')}'")
    con.execute(f"CREATE TABLE normals AS SELECT * FROM '{p(OUT / 'normals.parquet')}'")
    con.execute(f"CREATE TABLE seasons AS SELECT * FROM '{p(OUT / 'seasons.parquet')}'")

    last = con.execute("SELECT max(date) FROM mfi").fetchone()[0]
    last = pd.Timestamp(last).date()
    last_doy = last.timetuple().tm_yday

    areas = con.execute("""
        SELECT level, area_id, any_value(name) AS name, any_value(state) AS state
        FROM mfi GROUP BY 1, 2
    """).df()

    # Current 7-day MFI per area, compared with the normal for today's day-of-year
    cur = con.execute(f"""
        WITH r AS (
          SELECT level, area_id, sum(mfi) AS r7
          FROM mfi WHERE date > DATE '{last}' - INTERVAL 7 DAY AND date <= DATE '{last}'
          GROUP BY 1, 2
        )
        SELECT n.level, n.area_id, coalesce(r.r7, 0) AS r7, n.p50, n.p75, n.p90
        FROM normals n LEFT JOIN r USING (level, area_id)
        WHERE n.doy = {last_doy}
    """).df()
    areas = areas.merge(cur, on=["level", "area_id"], how="left").fillna({"r7": 0, "p50": 0, "p75": 0, "p90": 0})
    areas["status"] = [level_for(a, b, c) for a, b, c in zip(areas.r7, areas.p75, areas.p90)]

    # Long-term totals for ranking/search
    tot = con.execute(f"""
        SELECT level, area_id, round(avg(total)) AS avg_annual
        FROM seasons WHERE complete_year GROUP BY 1, 2
    """).df()
    areas = areas.merge(tot, on=["level", "area_id"], how="left").fillna({"avg_annual": 0})

    first_year = max(FIRST_YEAR, int(con.execute("SELECT min(year(date)) FROM mfi").fetchone()[0]))
    years = list(range(first_year, last.year + 1))
    n_written = 0
    for _, a in areas.iterrows():
        lv, aid = a.level, a.area_id
        d = con.execute(f"""
            SELECT year(date) AS y, dayofyear(date) AS doy, mfi
            FROM mfi WHERE level = '{lv}' AND area_id = '{aid}' AND year(date) >= {first_year}
        """).df()
        cal = {y: [0] * 366 for y in years}
        for y, doy, v in d.itertuples(index=False):
            cal[int(y)][int(doy) - 1] = round(float(v), 1)
        nm = con.execute(f"""
            SELECT doy, p50, p75, p90 FROM normals
            WHERE level = '{lv}' AND area_id = '{aid}' ORDER BY doy
        """).df()
        se = con.execute(f"""
            SELECT yr AS year, round(total) AS total, start_date, peak_date, end_date,
                   round(peak_r7) AS peak_7day, rank_desc AS rank, round(vs_median, 2) AS vs_median,
                   complete_year
            FROM seasons WHERE level = '{lv}' AND area_id = '{aid}' AND yr >= {first_year}
            ORDER BY yr
        """).df()
        for c in ("start_date", "peak_date", "end_date"):
            se[c] = se[c].astype(str).replace({"NaT": None, "None": None})
        payload = {
            "level": lv, "area_id": aid, "name": a["name"],
            "state": a.state if isinstance(a.state, str) else None,
            "last_date": str(last),
            "status": {"level": a.status, "r7": round(a.r7, 1),
                       "p50": round(a.p50, 1), "p75": round(a.p75, 1), "p90": round(a.p90, 1)},
            "years": years,
            "calendar": [cal[y] for y in years],
            "normals": {
                "p50": [round(x, 1) for x in nm.p50.tolist()],
                "p75": [round(x, 1) for x in nm.p75.tolist()],
                "p90": [round(x, 1) for x in nm.p90.tolist()],
            },
            "seasons": json.loads(se.to_json(orient="records")),
        }
        (WEB / "area" / f"{aid}.json").write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False))
        n_written += 1

    areas_out = areas[["level", "area_id", "name", "state", "status", "r7", "p75", "p90", "avg_annual"]].copy()
    areas_out["r7"] = areas_out["r7"].round(1)
    areas_out["state"] = areas_out["state"].where(areas_out["state"].notna(), None)
    (WEB / "areas.json").write_text(areas_out.to_json(orient="records"))

    # Township boundaries for the map (simplified), tagged with current status
    simp = BND / "MMR_ADM3_simplified.geojson"
    if not simp.exists():
        simp.write_bytes(requests.get(ADM3_SIMPLIFIED, timeout=120).content)
    gj = json.loads(simp.read_text(encoding="utf-8"))
    status = dict(zip(areas.area_id, areas.status))
    for f in gj["features"]:
        sid = f["properties"].get("shapeID")
        f["properties"] = {"area_id": sid, "name": f["properties"].get("shapeName"),
                           "status": status.get(sid, "normal")}
    (WEB / "townships.geojson").write_text(json.dumps(gj, separators=(",", ":")))

    # Validation + meta
    val = json.loads((OUT / "validation.json").read_text())
    vw = pd.read_parquet(OUT / "validation_weekly.parquet")
    vw["week"] = vw["week"].astype(str)
    val["weekly"] = vw.to_dict(orient="records")
    (WEB / "validation.json").write_text(json.dumps(val, default=str))

    # Calibration factors, so the daily near-real-time update (nowcast.py) uses the same scale
    try:
        fac = pd.read_parquet(OUT / "factors.parquet")
        fj = {}
        for src in ("N21", "SNPP", "MODIS"):
            sub = fac[fac.src == src]
            fj[src] = {
                st: {str(int(m)): (None if pd.isna(f) else round(float(f), 4)) for m, f in zip(g.month, g.factor)}
                for st, g in sub.groupby("state")
            }
            fj[f"{src}_national"] = round(float(sub.factor.median()), 4) if len(sub) else None
        (WEB / "factors.json").write_text(json.dumps(fj, separators=(",", ":")))
    except Exception as e:  # never block the export over this file
        print(f"WARNING: factors.json not written ({e})")

    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "last_date": str(last),
        "first_year": years[0],
        "unit": "Mee Fire Index (NOAA-20 VIIRS-equivalent active-fire detections)",
        "sources": [
            "NASA FIRMS: MODIS Collection 6.1 active fires (Terra, Aqua), SP + NRT",
            "NASA FIRMS: VIIRS 375 m active fires (Suomi NPP, NOAA-20, NOAA-21), SP + NRT",
            "Boundaries: geoBoundaries gbOpen MMR ADM1/ADM3 (CC BY 4.0), Myanmar Analytics Project / USAID",
        ],
    }
    (WEB / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"exported {n_written} areas, last date {last}, in {time.time() - t0:.0f}s")
    print(areas_out.status.value_counts().to_string())


if __name__ == "__main__":
    main()
