"""
Stage 2: per-satellite calibration -> Mee Fire Index (MFI) -> validation -> normals -> seasons.

Reference scale: VIIRS NOAA-20 (the current operational sensor). Every other stream
(MODIS Terra+Aqua, VIIRS Suomi NPP, VIIRS NOAA-21) is calibrated to "NOAA-20-equivalent
detections" per state x calendar month, using only days when both streams were observing.
So the 2000-2026 record sits on one scale, and it stays on that scale after MODIS and
Suomi NPP switch off.

MFI for a township-day:
  - if any VIIRS stream observed that day: mean of the calibrated VIIRS estimates available
  - else (2000-2012): calibrated MODIS

Validation: hold out one full year (HOLDOUT), fit MODIS->NOAA-20 on all other overlap years,
predict the hold-out year's weekly NOAA-20 detections per state from MODIS, and compare
with the actual NOAA-20 counts, before and after calibration.

Inputs : data/processed/area_day.parquet, cell_area.parquet  (from process.py)
         data/raw/<SOURCE>/*.csv file names (to know which days were actually observed)
Outputs: data/processed/factors.parquet, mfi_day.parquet, normals.parquet,
         seasons.parquet, validation.json, validation_weekly.parquet

Usage: python harmonize.py
"""
import json
import time
from datetime import date, timedelta
from pathlib import Path

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"

HOLDOUT = 2024           # full year with MODIS + SNPP + NOAA-20 + NOAA-21 all observing
MIN_DET = 30             # min detections on both sides to trust a state-month factor
PANEL_START = date(2001, 1, 1)
NORMAL_YEARS = (2001, 2025)   # complete years used for normals and rankings

# Availability windows reported by FIRMS /api/data_availability (14 Nov 2026).
AVAIL = {
    "MODIS_SP": ("2000-11-01", "2026-08-31"), "MODIS_NRT": ("2026-09-01", "2026-11-14"),
    "VIIRS_SNPP_SP": ("2012-01-20", "2026-07-31"), "VIIRS_SNPP_NRT": ("2026-08-01", "2026-11-02"),
    "VIIRS_NOAA20_SP": ("2018-04-01", "2026-07-31"), "VIIRS_NOAA20_NRT": ("2026-08-01", "2026-11-13"),
    "VIIRS_NOAA21_SP": ("2023-03-01", "2026-07-31"), "VIIRS_NOAA21_NRT": ("2024-01-17", "2026-11-13"),
}
GROUP = {"MODIS": "MODIS", "VIIRS_SNPP": "SNPP", "VIIRS_NOAA20": "N20", "VIIRS_NOAA21": "N21"}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def p(path: Path) -> str:
    return path.as_posix()


def coverage() -> pd.DataFrame:
    """Days each sensor group actually observed = downloaded chunks clipped to FIRMS availability."""
    rows = set()
    for src_dir in RAW.iterdir():
        if not src_dir.is_dir() or src_dir.name not in AVAIL:
            continue
        grp = next(g for k, g in GROUP.items() if src_dir.name.startswith(k))
        lo, hi = (date.fromisoformat(x) for x in AVAIL[src_dir.name])
        for f in src_dir.glob("*.csv"):
            d0 = date.fromisoformat(f.stem)
            for i in range(5):
                d = d0 + timedelta(days=i)
                if lo <= d <= hi:
                    rows.add((grp, d))
    df = pd.DataFrame(sorted(rows), columns=["grp", "date"])
    df["date"] = pd.to_datetime(df["date"])
    return df


def main() -> None:
    t0 = time.time()
    con = duckdb.connect()
    con.execute("PRAGMA threads=4")

    cov = coverage()
    con.register("cov_df", cov)
    con.execute("CREATE TABLE cov AS SELECT grp, CAST(date AS DATE) AS date FROM cov_df")
    for g, n in con.execute("SELECT grp, count(*) FROM cov GROUP BY 1 ORDER BY 1").fetchall():
        log(f"coverage {g}: {n:,} days")

    # One state per township (most common non-null assignment; border cells can miss ADM1)
    con.execute(f"""
        CREATE TABLE tstate AS
        SELECT township_id, mode(state) AS state
        FROM '{p(OUT / "area_day.parquet")}'
        WHERE state IS NOT NULL
        GROUP BY township_id
    """)
    # Wide daily table per township: counts per sensor group (missing = 0)
    con.execute(f"""
        CREATE TABLE ad0 AS
        SELECT township_id, any_value(township) AS township, date,
          coalesce(sum(n) FILTER (WHERE stream IN ('MODIS_T','MODIS_A')), 0) AS modis,
          coalesce(sum(n) FILTER (WHERE stream = 'VIIRS_SNPP'),   0) AS snpp,
          coalesce(sum(n) FILTER (WHERE stream = 'VIIRS_NOAA20'), 0) AS n20,
          coalesce(sum(n) FILTER (WHERE stream = 'VIIRS_NOAA21'), 0) AS n21
        FROM '{p(OUT / "area_day.parquet")}'
        GROUP BY township_id, date
    """)
    con.execute("""
        CREATE TABLE ad AS
        SELECT a.township_id, a.township, t.state, a.date, a.modis, a.snpp, a.n20, a.n21
        FROM ad0 a LEFT JOIN tstate t USING (township_id)
    """)
    con.execute("DELETE FROM ad WHERE state IS NULL")
    # Day-level coverage flags
    con.execute("""
        CREATE TABLE dcov AS
        SELECT date,
          bool_or(grp = 'MODIS') AS c_modis, bool_or(grp = 'SNPP') AS c_snpp,
          bool_or(grp = 'N20')   AS c_n20,   bool_or(grp = 'N21')  AS c_n21
        FROM cov GROUP BY date
    """)
    con.execute("""
        CREATE TABLE sd AS
        SELECT a.state, a.date, sum(modis) AS modis, sum(snpp) AS snpp, sum(n20) AS n20, sum(n21) AS n21
        FROM ad a GROUP BY a.state, a.date
    """)

    def fit_factors(exclude_year: int | None) -> str:
        """Return SQL for a factors table (state, month, src, factor, level, n_ref, n_src)."""
        excl = f"AND year(s.date) <> {exclude_year}" if exclude_year else ""
        parts = []
        for src, col, flag in [("MODIS", "modis", "c_modis"), ("SNPP", "snpp", "c_snpp"), ("N21", "n21", "c_n21")]:
            parts.append(f"""
                SELECT s.state, month(s.date) AS month, '{src}' AS src,
                       sum(s.n20) AS n_ref, sum(s.{col}) AS n_src
                FROM sd s JOIN dcov d USING (date)
                WHERE d.c_n20 AND d.{flag} {excl}
                GROUP BY 1, 2, 3""")
        base = " UNION ALL ".join(parts)
        return f"""
            WITH sm AS ({base}),
            nm AS (SELECT month, src, sum(n_ref) AS n_ref, sum(n_src) AS n_src FROM sm GROUP BY 1, 2),
            na AS (SELECT src, sum(n_ref) AS n_ref, sum(n_src) AS n_src FROM sm GROUP BY 1),
            states AS (SELECT DISTINCT state FROM sd WHERE state IS NOT NULL),
            grid AS (SELECT st.state, m.month, s.src
                     FROM states st, range(1, 13) AS m(month), (VALUES ('MODIS'),('SNPP'),('N21')) s(src))
            SELECT g.state, g.month, g.src,
              CASE
                WHEN sm.n_ref >= {MIN_DET} AND sm.n_src >= {MIN_DET} THEN sm.n_ref / sm.n_src
                WHEN nm.n_ref >= {MIN_DET} AND nm.n_src >= {MIN_DET} THEN nm.n_ref / nm.n_src
                WHEN na.n_src > 0 THEN na.n_ref / na.n_src
              END AS factor,
              CASE
                WHEN sm.n_ref >= {MIN_DET} AND sm.n_src >= {MIN_DET} THEN 'state-month'
                WHEN nm.n_ref >= {MIN_DET} AND nm.n_src >= {MIN_DET} THEN 'national-month'
                ELSE 'national'
              END AS level,
              coalesce(sm.n_ref, 0) AS n_ref, coalesce(sm.n_src, 0) AS n_src
            FROM grid g
            LEFT JOIN sm ON sm.state = g.state AND sm.month = g.month AND sm.src = g.src
            LEFT JOIN nm ON nm.month = g.month AND nm.src = g.src
            LEFT JOIN na ON na.src = g.src
        """

    # ---------- Validation (hold-out year, MODIS -> NOAA-20) ----------
    con.execute(f"CREATE TABLE fval AS {fit_factors(HOLDOUT)}")
    con.execute(f"""
        CREATE TABLE vw AS
        SELECT s.state, date_trunc('week', s.date) AS week,
               sum(s.n20) AS actual, sum(s.modis) AS modis_raw,
               sum(s.modis * f.factor) AS modis_cal
        FROM sd s JOIN dcov d USING (date)
        JOIN fval f ON f.state = s.state AND f.month = month(s.date) AND f.src = 'MODIS'
        WHERE year(s.date) = {HOLDOUT} AND d.c_n20 AND d.c_modis
        GROUP BY 1, 2
    """)
    v = con.execute(f"""
        SELECT count(*) AS n_state_weeks,
          corr(modis_raw, actual) AS r_raw, corr(modis_cal, actual) AS r_cal,
          corr(ln(1 + modis_cal), ln(1 + actual)) AS r_log_cal,
          avg(abs(modis_raw - actual) / actual) FILTER (WHERE actual >= 50) AS mape_raw,
          avg(abs(modis_cal - actual) / actual) FILTER (WHERE actual >= 50) AS mape_cal,
          count(*) FILTER (WHERE actual >= 50) AS n_mape
        FROM vw
    """).df().iloc[0].to_dict()
    annual = con.execute("""
        SELECT state, sum(actual) AS actual, sum(modis_raw) AS modis_raw, sum(modis_cal) AS modis_cal,
               (sum(modis_cal) - sum(actual)) / nullif(sum(actual), 0) AS err_cal,
               (sum(modis_raw) - sum(actual)) / nullif(sum(actual), 0) AS err_raw
        FROM vw GROUP BY state ORDER BY actual DESC
    """).df()
    nat = annual[["actual", "modis_raw", "modis_cal"]].sum()
    validation = {
        "holdout_year": HOLDOUT,
        "method": "MODIS->NOAA-20 factors fit per state x month on all overlap years except the hold-out year",
        **{k: (None if pd.isna(x) else float(x)) for k, x in v.items()},
        "national_annual_error_raw": float((nat.modis_raw - nat.actual) / nat.actual) if nat.actual else None,
        "national_annual_error_cal": float((nat.modis_cal - nat.actual) / nat.actual) if nat.actual else None,
        "per_state": annual.round(3).to_dict(orient="records"),
    }
    (OUT / "validation.json").write_text(json.dumps(validation, indent=2, default=str))
    con.execute(f"""
        COPY (SELECT week, sum(actual) AS noaa20_actual, sum(modis_raw) AS modis_raw,
                     round(sum(modis_cal), 1) AS modis_calibrated
              FROM vw GROUP BY week ORDER BY week)
        TO '{p(OUT / "validation_weekly.parquet")}' (FORMAT parquet)
    """)
    log("validation written")

    # ---------- Final factors (all years) ----------
    con.execute(f"CREATE TABLE fac AS {fit_factors(None)}")
    con.execute(f"COPY fac TO '{p(OUT / 'factors.parquet')}' (FORMAT parquet)")

    # ---------- MFI per township-day (sparse: only days with detections) ----------
    con.execute("""
        CREATE TABLE mfi_t AS
        WITH x AS (
          SELECT a.township_id, a.township, a.state, a.date,
            CASE WHEN d.c_n20 THEN a.n20 ELSE 0 END AS e_n20,
            CASE WHEN d.c_snpp AND fs.factor IS NOT NULL THEN a.snpp * fs.factor ELSE 0 END AS e_snpp,
            CASE WHEN d.c_n21 AND f21.factor IS NOT NULL THEN a.n21 * f21.factor ELSE 0 END AS e_n21,
            CASE WHEN d.c_modis AND fm.factor IS NOT NULL THEN a.modis * fm.factor ELSE 0 END AS e_modis,
            (d.c_n20::INT + (d.c_snpp AND fs.factor IS NOT NULL)::INT
                          + (d.c_n21 AND f21.factor IS NOT NULL)::INT) AS k
          FROM ad a
          JOIN dcov d USING (date)
          JOIN fac fm  ON fm.state = a.state  AND fm.month = month(a.date)  AND fm.src = 'MODIS'
          JOIN fac fs  ON fs.state = a.state  AND fs.month = month(a.date)  AND fs.src = 'SNPP'
          JOIN fac f21 ON f21.state = a.state AND f21.month = month(a.date) AND f21.src = 'N21'
        )
        SELECT township_id, township, state, date,
               CASE WHEN k > 0 THEN (e_n20 + e_snpp + e_n21) / k ELSE e_modis END AS mfi
        FROM x
    """)
    # All levels: township, state, national
    con.execute("""
        CREATE TABLE mfi AS
        SELECT 'township' AS level, township_id AS area_id, township AS name, state, date, mfi FROM mfi_t
        UNION ALL
        SELECT 'state', state, state, state, date, sum(mfi) FROM mfi_t GROUP BY state, date
        UNION ALL
        SELECT 'national', 'MMR', 'Myanmar', NULL, date, sum(mfi) FROM mfi_t GROUP BY date
    """)
    con.execute(f"COPY (SELECT * FROM mfi WHERE mfi > 0) TO '{p(OUT / 'mfi_day.parquet')}' (FORMAT parquet)")
    log("MFI written")

    # ---------- Zero-filled panel + 7-day rolling sum ----------
    last = con.execute("SELECT max(date) FROM dcov").fetchone()[0]
    con.execute("CREATE TABLE areas AS SELECT DISTINCT level, area_id, name, state FROM mfi")
    # Only days that at least one satellite actually observed (no fake zeros for missing years)
    con.execute(f"""
        CREATE TABLE days AS
        SELECT date FROM dcov
        WHERE date >= DATE '{PANEL_START}' AND date <= DATE '{last}'
    """)
    con.execute("""
        CREATE TABLE panel AS
        SELECT a.level, a.area_id, d.date, coalesce(m.mfi, 0) AS mfi
        FROM areas a CROSS JOIN days d
        LEFT JOIN mfi m ON m.level = a.level AND m.area_id = a.area_id AND m.date = d.date
    """)
    con.execute("""
        CREATE TABLE roll AS
        SELECT level, area_id, date, year(date) AS yr, dayofyear(date) AS doy, mfi,
               sum(mfi) OVER (PARTITION BY level, area_id ORDER BY date
                              ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS r7
        FROM panel
    """)
    log("panel + rolling sums built")

    # ---------- Normals: percentiles of 7-day MFI for each day-of-year (+-7 days, all complete years) ----------
    y0, y1 = NORMAL_YEARS
    con.execute(f"""
        COPY (
          SELECT r.level, r.area_id,
                 ((r.doy - 1 + o.off + 366) % 366) + 1 AS doy,
                 quantile_cont(r.r7, 0.50) AS p50,
                 quantile_cont(r.r7, 0.75) AS p75,
                 quantile_cont(r.r7, 0.90) AS p90
          FROM roll r, range(-7, 8) AS o(off)
          WHERE r.yr BETWEEN {y0} AND {y1}
          GROUP BY 1, 2, 3
        ) TO '{p(OUT / "normals.parquet")}' (FORMAT parquet)
    """)
    log("normals written")

    # ---------- Seasons: per area per year ----------
    con.execute(f"""
        COPY (
          WITH c AS (
            SELECT level, area_id, yr, date, mfi, r7,
                   sum(mfi) OVER (PARTITION BY level, area_id, yr ORDER BY date) AS cum,
                   sum(mfi) OVER (PARTITION BY level, area_id, yr) AS total
            FROM roll
          ),
          s AS (
            SELECT level, area_id, yr,
                   any_value(total) AS total,
                   min(date) FILTER (WHERE total > 0 AND cum >= 0.05 * total) AS start_date,
                   arg_max(date, r7) AS peak_date,
                   max(r7) AS peak_r7,
                   min(date) FILTER (WHERE total > 0 AND cum >= 0.95 * total) AS end_date,
                   count(*) AS n_days
            FROM c GROUP BY 1, 2, 3
          )
          SELECT s.*,
                 rank() OVER (PARTITION BY level, area_id ORDER BY (yr BETWEEN {y0} AND {y1} AND n_days >= 350) DESC, total DESC) AS rank_desc,
                 total / nullif(median(CASE WHEN yr BETWEEN {y0} AND {y1} AND n_days >= 350 THEN total END)
                                OVER (PARTITION BY level, area_id), 0) AS vs_median,
                 (yr BETWEEN {y0} AND {y1} AND n_days >= 350) AS complete_year
          FROM s
        ) TO '{p(OUT / "seasons.parquet")}' (FORMAT parquet)
    """)
    log("seasons written")

    # ---------- Report ----------
    print("\n=== Validation (hold-out year %d) ===" % HOLDOUT)
    for k in ["n_state_weeks", "r_raw", "r_cal", "r_log_cal", "mape_raw", "mape_cal", "n_mape"]:
        print(f"  {k:14s} {validation.get(k)}")
    print(f"  national annual error: raw {validation['national_annual_error_raw']}, "
          f"calibrated {validation['national_annual_error_cal']}")
    print("\n=== Factor fallback levels ===")
    print(con.execute("SELECT src, level, count(*) n FROM fac GROUP BY 1,2 ORDER BY 1,2").df().to_string(index=False))
    print("\n=== Myanmar MFI per year (NOAA-20-equivalent detections) ===")
    print(con.execute("""
        SELECT year(date) AS year, round(sum(mfi)) AS mfi
        FROM mfi WHERE level = 'national' GROUP BY 1 ORDER BY 1
    """).df().to_string(index=False))
    log(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
