export type Status = "normal" | "elevated" | "high";

export interface AreaSummary {
  level: "township" | "state" | "national";
  area_id: string;
  name: string;
  state: string | null;
  status: Status;
  r7: number;
  p75: number;
  p90: number;
  avg_annual: number;
}

export interface Season {
  year: number;
  total: number;
  start_date: string | null;
  peak_date: string | null;
  end_date: string | null;
  peak_7day: number;
  rank: number;
  vs_median: number | null;
  complete_year: boolean;
}

export interface AreaDetail {
  level: AreaSummary["level"];
  area_id: string;
  name: string;
  state: string | null;
  last_date: string;
  status: { level: Status; r7: number; p50: number; p75: number; p90: number };
  years: number[];
  calendar: number[][]; // [yearIndex][dayOfYear-1] daily MFI
  normals: { p50: number[]; p75: number[]; p90: number[] }; // 7-day MFI by day-of-year
  seasons: Season[];
}

export interface Meta {
  generated_at: string;
  last_date: string;
  first_year: number;
  unit: string;
  sources: string[];
}

export const STATUS_COLOR: Record<Status, string> = {
  normal: "#D3DAD4",
  elevated: "#F3A83B",
  high: "#D93A1E",
};

export const STATUS_LABEL: Record<Status, string> = {
  normal: "Normal",
  elevated: "Above normal",
  high: "Far above normal",
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Day-of-year (1-based, leap-year layout) where each month starts
export const MONTH_START_DOY = [1, 32, 61, 92, 122, 153, 183, 214, 245, 275, 306, 336];

export function doyToLabel(doy: number): string {
  let m = 11;
  while (m > 0 && MONTH_START_DOY[m] > doy) m--;
  return `${MONTHS[m]} ${doy - MONTH_START_DOY[m] + 1}`;
}

export function rolling7(row: number[]): number[] {
  const out = new Array(row.length).fill(0);
  let s = 0;
  for (let i = 0; i < row.length; i++) {
    s += row[i];
    if (i >= 7) s -= row[i - 7];
    out[i] = s;
  }
  return out;
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// Years with any satellite data nationally. Years still being downloaded have no data
// anywhere and must not be drawn as "no fire".
export function observedYears(national: AreaDetail): Set<number> {
  return new Set(national.years.filter((_, i) => national.calendar[i].some((v) => v > 0)));
}

export function onlyYears(a: AreaDetail, keep: Set<number>): AreaDetail {
  const idx = a.years.map((y, i) => [y, i] as const).filter(([y]) => keep.has(y));
  return {
    ...a,
    years: idx.map(([y]) => y),
    calendar: idx.map(([, i]) => a.calendar[i]),
    seasons: a.seasons.filter((s) => keep.has(s.year)),
  };
}

// Day-of-year (1-based) to "14 Nov" for a real year, so leap and non-leap years both label right.
export function dateLabelIn(year: number, doy: number, months: string[]): string {
  const d = new Date(Date.UTC(year, 0, doy));
  if (d.getUTCFullYear() !== year) return "";
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

export function doyLabelIn(doy: number, months: string[]): string {
  let m = 11;
  while (m > 0 && MONTH_START_DOY[m] > doy) m--;
  return `${doy - MONTH_START_DOY[m] + 1} ${months[m]}`;
}

// Spelling fixes for names in the boundary data (ids stay unchanged)
const NAME_FIX: Record<string, string> = { Saigang: "Sagaing", Tanitharyi: "Tanintharyi" };
export const placeLabel = (s?: string | null): string => (s ? (NAME_FIX[s] ?? s) : "");
