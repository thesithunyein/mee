"use client";

import { useEffect, useState } from "react";

interface V {
  holdout_year: number;
  r_raw: number | null;
  r_cal: number | null;
  mape_raw: number | null;
  mape_cal: number | null;
  national_annual_error_raw: number | null;
  national_annual_error_cal: number | null;
}

const pct = (x: number | null) => (x == null ? "–" : `${Math.round(Math.abs(x) * 100)}%`);

// Only shown once the held-out year has been processed; no placeholder numbers.
export default function Validation() {
  const [v, setV] = useState<V | null>(null);
  useEffect(() => {
    fetch("/data/validation.json").then((r) => r.json()).then(setV).catch(() => {});
  }, []);
  if (!v || v.r_cal == null) return null;

  const rows: [string, string, string][] = [
    ["Weekly match with NOAA-20 (correlation)", v.r_raw?.toFixed(2) ?? "–", v.r_cal?.toFixed(2) ?? "–"],
    ["Typical weekly error", pct(v.mape_raw), pct(v.mape_cal)],
    ["Error in national yearly total", pct(v.national_annual_error_raw), pct(v.national_annual_error_cal)],
  ];
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold tracking-tight">Does the scaling work?</h2>
      <p className="mt-2 leading-relaxed text-ink-2">
        We left {v.holdout_year} out, scaled MODIS using the other years only, and compared it with what NOAA-20 really saw.
      </p>
      <table className="mt-6 w-full text-left text-sm tabular-nums">
        <thead className="text-ink-3">
          <tr className="border-b border-line">
            <th className="py-3 pr-4 font-medium"> </th>
            <th className="py-3 pr-4 font-medium">MODIS as is</th>
            <th className="py-3 font-medium">MODIS scaled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([k, a, b]) => (
            <tr key={k}>
              <td className="py-3 pr-4 text-ink-2">{k}</td>
              <td className="py-3 pr-4">{a}</td>
              <td className="py-3 font-semibold">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
