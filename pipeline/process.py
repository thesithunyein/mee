"""
Stage 1: raw FIRMS CSVs -> clean detections -> township/state daily aggregates.

Runs on whatever has been downloaded so far (safe to re-run as downloads finish).

Outputs (data/processed/):
  detections.parquet     clean vegetation-fire detections, all sensors, SE Asia box
  cell_area.parquet      0.01-degree cell -> township/state lookup (Myanmar)
  area_day.parquet       township x day x stream: count, frp_sum
  state_day.parquet      state x day x stream: count, frp_sum

Streams (one per satellite, so calibration can be done per satellite):
  MODIS_T (Terra), MODIS_A (Aqua), VIIRS_SNPP, VIIRS_NOAA20, VIIRS_NOAA21

Usage:  python process.py
"""
import json
import time
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
import requests
import shapely
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
BND = ROOT / "data" / "boundaries"
OUT.mkdir(parents=True, exist_ok=True)
BND.mkdir(parents=True, exist_ok=True)

# geoBoundaries gbOpen MMR (CC BY 4.0, Myanmar Analytics Project / USAID). Cite in the app.
BOUNDARY_URLS = {
    "ADM1": "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MMR/ADM1/geoBoundaries-MMR-ADM1.geojson",
    "ADM3": "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MMR/ADM3/geoBoundaries-MMR-ADM3.geojson",
}
MMR_BBOX = (92.1, 9.5, 101.2, 28.6)  # west, south, east, north
CELL = 0.01  # degrees, for point -> township lookup


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def get_boundaries(level: str) -> dict:
    path = BND / f"MMR_{level}.geojson"
    if not path.exists():
        log(f"downloading {level} boundaries...")
        r = requests.get(BOUNDARY_URLS[level], timeout=120)
        r.raise_for_status()
        path.write_bytes(r.content)
    return json.loads(path.read_text(encoding="utf-8"))


def build_detections(con: duckdb.DuckDBPyConnection) -> None:
    files = list(RAW.glob("*/*.csv"))
    if not files:
        raise SystemExit("No CSVs in data/raw yet.")
    log(f"reading {len(files):,} CSV chunks")
    glob = str(RAW / "*" / "*.csv").replace("\\", "/")

    # Read everything as text first: column types differ between MODIS and VIIRS.
    con.execute(f"""
        CREATE OR REPLACE TABLE raw AS
        SELECT * FROM read_csv('{glob}', all_varchar=true, union_by_name=true,
                               filename=true, header=true, ignore_errors=true)
    """)
    cols = {r[0] for r in con.execute("DESCRIBE raw").fetchall()}
    type_expr = "type" if "type" in cols else "NULL"

    con.execute(f"""
        CREATE OR REPLACE TABLE det AS
        WITH t AS (
          SELECT
            regexp_extract(replace(filename, '\\', '/'), '/raw/([^/]+)/', 1) AS source,
            TRY_CAST(latitude AS DOUBLE)  AS lat,
            TRY_CAST(longitude AS DOUBLE) AS lon,
            TRY_CAST(acq_date AS DATE)    AS acq_date,
            acq_time,
            upper(trim(satellite))        AS sat_raw,
            lower(trim(confidence))       AS conf_raw,
            TRY_CAST(frp AS DOUBLE)       AS frp,
            daynight,
            {type_expr}                   AS type_raw
          FROM raw
        )
        SELECT
          source,
          CASE
            WHEN source LIKE 'MODIS%' AND sat_raw IN ('T','TERRA') THEN 'MODIS_T'
            WHEN source LIKE 'MODIS%' AND sat_raw IN ('A','AQUA')  THEN 'MODIS_A'
            WHEN source LIKE 'VIIRS_SNPP%'   THEN 'VIIRS_SNPP'
            WHEN source LIKE 'VIIRS_NOAA20%' THEN 'VIIRS_NOAA20'
            WHEN source LIKE 'VIIRS_NOAA21%' THEN 'VIIRS_NOAA21'
          END AS stream,
          CASE WHEN source LIKE '%_SP' THEN 'SP' ELSE 'NRT' END AS product,
          lat, lon, acq_date, acq_time, frp, daynight, conf_raw, type_raw
        FROM t
        WHERE lat IS NOT NULL AND lon IS NOT NULL AND acq_date IS NOT NULL
    """)
    n_all = con.execute("SELECT count(*) FROM det").fetchone()[0]

    # Quality filters:
    #  - vegetation fires only (type 0) where the field exists (SP data)
    #  - MODIS confidence >= 30 ; VIIRS confidence nominal/high
    con.execute("""
        CREATE OR REPLACE TABLE clean AS
        SELECT DISTINCT ON (stream, lat, lon, acq_date, acq_time) *
        FROM det
        WHERE stream IS NOT NULL
          AND (type_raw IS NULL OR trim(type_raw) IN ('', '0'))
          AND (
                (stream LIKE 'MODIS%' AND TRY_CAST(conf_raw AS INTEGER) >= 30)
             OR (stream LIKE 'VIIRS%' AND conf_raw IN ('n','h','nominal','high'))
          )
    """)
    n_clean = con.execute("SELECT count(*) FROM clean").fetchone()[0]
    con.execute(f"COPY clean TO '{(OUT / 'detections.parquet').as_posix()}' (FORMAT parquet)")
    log(f"detections: {n_all:,} raw -> {n_clean:,} clean ({n_clean / max(n_all,1):.0%} kept)")

    unknown = con.execute("SELECT count(*) FROM det WHERE stream IS NULL").fetchone()[0]
    if unknown:
        codes = con.execute("""
            SELECT DISTINCT regexp_extract(replace(filename, '\\', '/'), '/raw/([^/]+)/', 1) AS source,
                   upper(trim(satellite)) AS sat
            FROM raw LIMIT 20
        """).fetchall()
        log(f"WARNING: {unknown:,} rows with unknown satellite code. Seen (source, satellite): {codes}")


def build_cell_lookup(con: duckdb.DuckDBPyConnection) -> None:
    w, s, e, n = MMR_BBOX
    cells = con.execute(f"""
        SELECT DISTINCT
          floor(lon / {CELL})::BIGINT AS cx,
          floor(lat / {CELL})::BIGINT AS cy
        FROM clean
        WHERE lon BETWEEN {w} AND {e} AND lat BETWEEN {s} AND {n}
    """).df()
    log(f"unique {CELL} deg cells in Myanmar box: {len(cells):,}")

    xs = (cells["cx"].to_numpy() + 0.5) * CELL
    ys = (cells["cy"].to_numpy() + 0.5) * CELL
    pts = shapely.points(xs, ys)

    def assign(level: str) -> tuple[np.ndarray, np.ndarray]:
        gj = get_boundaries(level)
        geoms = [shape(f["geometry"]) for f in gj["features"]]
        names = np.array([f["properties"].get("shapeName") for f in gj["features"]], dtype=object)
        ids = np.array([f["properties"].get("shapeID") for f in gj["features"]], dtype=object)
        tree = shapely.STRtree(geoms)
        pt_idx, geom_idx = tree.query(pts, predicate="within")
        out_name = np.full(len(pts), None, dtype=object)
        out_id = np.full(len(pts), None, dtype=object)
        out_name[pt_idx] = names[geom_idx]
        out_id[pt_idx] = ids[geom_idx]
        return out_id, out_name

    cells["township_id"], cells["township"] = assign("ADM3")
    cells["state_id"], cells["state"] = assign("ADM1")
    cells = cells[cells["township_id"].notna()]
    cells.to_parquet(OUT / "cell_area.parquet", index=False)
    log(f"cells inside Myanmar townships: {len(cells):,}")


def build_aggregates(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(f"CREATE OR REPLACE TABLE cell_area AS SELECT * FROM '{(OUT / 'cell_area.parquet').as_posix()}'")
    con.execute(f"""
        CREATE OR REPLACE TABLE mm AS
        SELECT c.*, a.township_id, a.township, a.state_id, a.state
        FROM clean c
        JOIN cell_area a
          ON a.cx = floor(c.lon / {CELL})::BIGINT
         AND a.cy = floor(c.lat / {CELL})::BIGINT
    """)
    con.execute(f"""
        COPY (
          SELECT township_id, any_value(township) AS township, any_value(state) AS state,
                 acq_date AS date, stream, count(*) AS n, round(sum(frp), 2) AS frp_sum
          FROM mm GROUP BY township_id, acq_date, stream
        ) TO '{(OUT / 'area_day.parquet').as_posix()}' (FORMAT parquet)
    """)
    con.execute(f"""
        COPY (
          SELECT state_id, any_value(state) AS state,
                 acq_date AS date, stream, count(*) AS n, round(sum(frp), 2) AS frp_sum
          FROM mm GROUP BY state_id, acq_date, stream
        ) TO '{(OUT / 'state_day.parquet').as_posix()}' (FORMAT parquet)
    """)
    log("aggregates written")


def sanity(con: duckdb.DuckDBPyConnection) -> None:
    print("\n=== Myanmar detections per stream per year (clean) ===")
    df = con.execute("""
        SELECT year(acq_date) AS year, stream, count(*) AS n
        FROM mm GROUP BY 1, 2 ORDER BY 1, 2
    """).df()
    if len(df):
        print(df.pivot(index="year", columns="stream", values="n").fillna(0).astype(int).to_string())
    print("\n=== Top 10 townships, March (all years, all streams) ===")
    print(con.execute("""
        SELECT township, state, count(*) AS n
        FROM mm WHERE month(acq_date) = 3
        GROUP BY 1, 2 ORDER BY n DESC LIMIT 10
    """).df().to_string(index=False))


if __name__ == "__main__":
    t0 = time.time()
    con = duckdb.connect()
    build_detections(con)
    build_cell_lookup(con)
    build_aggregates(con)
    sanity(con)
    log(f"done in {time.time() - t0:.0f}s")
