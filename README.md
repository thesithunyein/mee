# Mee (မီး): Myanmar's fire calendar from NASA satellites

**NASA Space Apps Challenge 2026 · Challenge: Harmonization of MODIS and VIIRS Hot Spots**
Team Solobeat (solo) · Yangon local event

Mee merges NASA active-fire detections from five satellites into one consistent record, so you can see **when and where each township in Myanmar burns, whether this season is unusual, and how it compares with past years**.

> Live app: _link added at submission_
> Demo video: _link added at submission_

---

## Why I built this

I live in Myanmar. Every dry season (roughly January to May), burning across the country and its border areas fills the air with haze. NASA satellites record every one of these fires, but the record is split across sensors that see fire differently:

- **MODIS** (Terra and Aqua, 1 km pixels) has data since 2000.
- **VIIRS** (Suomi NPP, NOAA-20, NOAA-21, 375 m pixels) has data since 2012 and detects far more small fires.

So raw counts can't be compared across years. In my Myanmar data, NOAA-20 VIIRS recorded about 300,000 detections in 2019 while MODIS recorded about 57,000 for the same area and year.

The satellites are also changing right now. FIRMS stopped producing Suomi NPP fire data on 2 November 2026, and NASA plans to end Terra and Aqua MODIS data collection in 2027. Any simple fire chart will show drops or jumps caused by satellites switching off, not by real changes in fire. Mee is built to keep the record consistent through those changes.

## What it does

- **Burning calendar:** for Myanmar, each of its 14 states/regions and each of its 330 townships: one row per year, one column per day, coloured by fire activity.
- **This season vs normal:** the current 7-day fire index against the range seen in past years on the same dates (median to 90th percentile).
- **Unusual-condition flags:** each area is marked Normal, Elevated or High based on its own history for this time of year.
- **Season statistics:** start, peak and end of each year's burning season, total compared with a typical year.
- **Map and search:** all townships coloured by current status; search any township or state.
- **CSV download:** daily harmonized values for any area.

Built for emergency responders (when are critical periods, where is activity unusual), scientists (a consistent long-term record) and land managers (historical fire patterns for their own area).

## How the harmonization works

1. **Download** every MODIS and VIIRS active-fire detection for mainland Southeast Asia from the NASA FIRMS API (standard-processing archive + near-real-time), in 5-day chunks.
2. **Clean:** keep presumed vegetation fires only (`type = 0` where available), MODIS confidence ≥ 30, VIIRS confidence nominal/high; remove duplicates.
3. **Assign** each detection to its township and state (geoBoundaries, 330 townships / 14 states).
4. **Calibrate each satellite separately** to a single reference scale, **NOAA-20 VIIRS**, the sensor that keeps operating. For every state and calendar month, the factor is the ratio of NOAA-20 detections to the other satellite's detections, using only days when both were observing. Where a state-month has too little data (< 30 detections on either side), it falls back to the national monthly factor, then the national factor.
5. **Mee Fire Index (MFI)** for each township and day: the average of the calibrated VIIRS estimates available that day, or calibrated MODIS on days before VIIRS existed. The unit is "NOAA-20-equivalent detections", so history is expressed in the scale of the satellite that will keep running.
6. **Normals:** 50th / 75th / 90th percentiles of the 7-day MFI for each day of the year (±7 days), using only days a satellite actually observed.
7. **Validation:** hold out a full year, fit the MODIS → NOAA-20 factors on all other years, predict the held-out year from MODIS alone and compare with what NOAA-20 actually recorded, before and after calibration. _Results are shown on the Method page in the app._

### Limits (stated honestly)

- Active-fire detections count fire pixels, not burned area or emissions.
- Clouds and smoke hide fires; detection probability differs by region and season.
- Calibration factors are statistical averages per state and month; individual days can differ.
- Township boundaries are from 2023 geoBoundaries data and may not match every official boundary.

## Run it yourself

Requirements: Python 3.11+, Node 20+, a free FIRMS MAP_KEY (https://firms.modaps.eosdis.nasa.gov/api/map_key/).

```bash
# pipeline
cd pipeline
python -m venv .venv && .venv/Scripts/activate        # Windows
python -m pip install -r requirements.txt
echo FIRMS_MAP_KEY=your_key > .env

python download_firms.py --availability
python download_firms.py --source VIIRS_NOAA20_SP --start 2018-04-01 --end 2026-07-31
python download_firms.py --source MODIS_SP --start 2000-11-01 --end 2026-08-31
# ... plus VIIRS_SNPP_SP, VIIRS_NOAA21_SP and the *_NRT sources

python process.py      # clean + assign townships + daily aggregates
python harmonize.py    # calibration, fire index, validation, normals, seasons
python export_web.py   # static JSON for the web app

# web app
cd ../web
npm install
npm run dev            # http://localhost:3000
```

## Project structure

```
pipeline/   Python: FIRMS download, cleaning, harmonization, export (DuckDB)
web/        Next.js app; reads static JSON from web/public/data
```

## Data and credits

- **NASA FIRMS:** MODIS Collection 6.1 active fires (MCD14), VIIRS 375 m active fires (Suomi NPP, NOAA-20, NOAA-21). NASA LANCE / FIRMS, operated by NASA ESDIS.
- **Boundaries:** geoBoundaries gbOpen, Myanmar ADM1 and ADM3, CC BY 4.0, from The Myanmar Analytics Project / USAID.
- Mee is an independent project made for NASA Space Apps 2026. It is not endorsed by NASA.

## Use of AI tools

I used Claude (Anthropic) as a coding assistant while building Mee: help writing and debugging the pipeline scripts and web components, and checking API documentation. The product itself contains no AI: every number is computed by the deterministic steps above. Design decisions, data choices and testing are my own.

## License

MIT. See [LICENSE](LICENSE).
