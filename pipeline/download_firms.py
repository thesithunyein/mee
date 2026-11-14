"""
Download NASA FIRMS active-fire detections for a bounding box, in 5-day chunks.

- Resumable: each chunk is saved as data/raw/<SOURCE>/<YYYY-MM-DD>.csv and skipped if it exists.
- Throttled + retries with backoff (FIRMS limit: 5,000 transactions / 10 min).
- FIRMS sometimes returns an error message as plain text with HTTP 200, so the
  response is only saved if its first line looks like a CSV header.

Usage (from the pipeline/ folder, venv active):
  python download_firms.py --source VIIRS_NOAA20_SP --start 2018-01-01 --end 2026-11-10
  python download_firms.py --availability          # show date coverage per source
"""
import argparse
import os
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()
MAP_KEY = os.getenv("FIRMS_MAP_KEY")
BASE = "https://firms.modaps.eosdis.nasa.gov/api"

# Mainland Southeast Asia (west,south,east,north). Myanmar is inside it.
DEFAULT_BBOX = "92,5,110,29"
CHUNK_DAYS = 5          # FIRMS area API allows 1-5 days per call
SLEEP_BETWEEN = 0.6     # seconds between calls
MAX_RETRIES = 5

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def availability() -> None:
    url = f"{BASE}/data_availability/csv/{MAP_KEY}/all"
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    print(r.text)


def looks_like_csv(text: str) -> bool:
    first = text.lstrip().split("\n", 1)[0].lower()
    return "latitude" in first and "longitude" in first


def fetch_chunk(source: str, bbox: str, day: date) -> str | None:
    url = f"{BASE}/area/csv/{MAP_KEY}/{source}/{bbox}/{CHUNK_DAYS}/{day.isoformat()}"
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 200 and looks_like_csv(r.text):
                return r.text
            msg = r.text.strip()[:200]
            # Rate limit or temporary error: back off and retry
            wait = min(60, 5 * attempt)
            print(f"  [{day}] attempt {attempt}: HTTP {r.status_code} '{msg}' -> retry in {wait}s")
            if "invalid" in msg.lower() and "key" in msg.lower():
                die("FIRMS says the MAP_KEY is invalid. Check pipeline/.env")
            time.sleep(wait)
        except requests.RequestException as e:
            wait = min(60, 5 * attempt)
            print(f"  [{day}] attempt {attempt}: {e} -> retry in {wait}s")
            time.sleep(wait)
    return None


def download(source: str, start: date, end: date, bbox: str) -> None:
    out_dir = RAW_DIR / source
    out_dir.mkdir(parents=True, exist_ok=True)

    days = []
    d = start
    while d <= end:
        days.append(d)
        d += timedelta(days=CHUNK_DAYS)

    total, done, failed, rows = len(days), 0, [], 0
    t0 = time.time()
    for i, day in enumerate(days, 1):
        path = out_dir / f"{day.isoformat()}.csv"
        if path.exists():
            done += 1
            continue
        text = fetch_chunk(source, bbox, day)
        if text is None:
            failed.append(day.isoformat())
        else:
            path.write_text(text, encoding="utf-8")
            n = max(0, text.count("\n") - 1)
            rows += n
            done += 1
        if i % 20 == 0 or i == total:
            mins = (time.time() - t0) / 60
            print(f"{source}: {i}/{total} chunks, {rows:,} new rows, {mins:.1f} min")
        time.sleep(SLEEP_BETWEEN)

    print(f"\nDONE {source}: {done}/{total} chunks saved, {rows:,} new rows.")
    if failed:
        print(f"Failed chunks ({len(failed)}), re-run the same command to retry: {failed[:10]}...")


def parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


if __name__ == "__main__":
    if not MAP_KEY:
        die("FIRMS_MAP_KEY missing. Put it in pipeline/.env")

    p = argparse.ArgumentParser()
    p.add_argument("--availability", action="store_true", help="print date coverage per source")
    p.add_argument("--source", help="e.g. MODIS_SP, VIIRS_SNPP_SP, VIIRS_NOAA20_SP, VIIRS_NOAA21_SP, *_NRT")
    p.add_argument("--start", help="YYYY-MM-DD")
    p.add_argument("--end", help="YYYY-MM-DD")
    p.add_argument("--bbox", default=DEFAULT_BBOX, help="west,south,east,north")
    a = p.parse_args()

    if a.availability:
        availability()
        sys.exit(0)
    if not (a.source and a.start and a.end):
        die("need --source, --start and --end (or --availability)")
    download(a.source, parse_date(a.start), parse_date(a.end), a.bbox)
