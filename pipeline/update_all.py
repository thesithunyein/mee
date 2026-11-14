"""
One command to bring Mee fully up to date:

  1. Download every FIRMS source Mee uses, 3 at a time (resumable: finished chunks are skipped).
     Near-real-time (NRT) chunks from the last REFRESH_DAYS are deleted first and fetched again,
     because the newest chunk is always incomplete when it is first downloaded.
  2. Run process.py -> harmonize.py -> export_web.py.

Usage (from the pipeline/ folder, venv active):
  python update_all.py                 # everything
  python update_all.py --nrt-only      # daily refresh: only the recent NRT feeds, then rebuild
  python update_all.py --skip-download # only rebuild from what is already downloaded
"""
import argparse
import subprocess
import sys
import threading
import time
from datetime import date, timedelta
from pathlib import Path

import download_firms as dl

HERE = Path(__file__).resolve().parent
TODAY = date.today()
REFRESH_DAYS = 10

NRT_JOBS = [
    ("VIIRS_NOAA20_NRT", date(2026, 8, 1), TODAY),
    ("VIIRS_NOAA21_NRT", date(2026, 8, 1), TODAY),
    ("MODIS_NRT", date(2026, 9, 1), TODAY),
]
HISTORY_JOBS = [
    ("VIIRS_SNPP_NRT", date(2026, 8, 1), date(2026, 11, 2)),   # Suomi NPP stopped 2 Nov 2026
    ("VIIRS_NOAA21_SP", date(2023, 3, 1), date(2026, 7, 31)),
    ("VIIRS_SNPP_SP", date(2012, 1, 20), date(2026, 7, 31)),
    ("MODIS_SP", date(2000, 11, 1), date(2018, 3, 31)),
    # already downloaded on 14 Nov; listed so a fresh machine gets them too
    ("VIIRS_NOAA20_SP", date(2018, 4, 1), date(2026, 7, 31)),
    ("MODIS_SP", date(2018, 4, 1), date(2026, 8, 31)),
]


def refresh_recent_nrt() -> None:
    cutoff = TODAY - timedelta(days=REFRESH_DAYS)
    for src, _, _ in NRT_JOBS:
        folder = dl.RAW_DIR / src
        if not folder.exists():
            continue
        for f in folder.glob("*.csv"):
            if date.fromisoformat(f.stem) >= cutoff:
                f.unlink()


def run_lanes(jobs: list[tuple[str, date, date]], lanes: int = 3) -> None:
    """Spread jobs over a few parallel lanes; each lane runs its jobs one after another."""
    buckets: list[list] = [[] for _ in range(lanes)]
    for i, job in enumerate(jobs):
        buckets[i % lanes].append(job)

    def lane(items):
        for src, start, end in items:
            dl.download(src, start, end, dl.DEFAULT_BBOX)

    threads = [threading.Thread(target=lane, args=(b,)) for b in buckets if b]
    for t in threads:
        t.start()
    for t in threads:
        t.join()


def rebuild() -> None:
    for script in ("process.py", "harmonize.py", "export_web.py"):
        print(f"\n=== {script} ===", flush=True)
        r = subprocess.run([sys.executable, script], cwd=HERE)
        if r.returncode != 0:
            sys.exit(f"{script} failed (exit {r.returncode}). Nothing was exported.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--nrt-only", action="store_true")
    p.add_argument("--skip-download", action="store_true")
    a = p.parse_args()

    if not dl.MAP_KEY:
        sys.exit("FIRMS_MAP_KEY missing. Put it in pipeline/.env")

    t0 = time.time()
    if not a.skip_download:
        refresh_recent_nrt()
        print("=== Downloading near-real-time feeds (this week) ===", flush=True)
        run_lanes(NRT_JOBS)
        if not a.nrt_only:
            print("\n=== Downloading history ===", flush=True)
            run_lanes(HISTORY_JOBS)
    rebuild()
    print(f"\nAll done in {(time.time() - t0) / 60:.0f} min. New site data is in web/public/data.")
