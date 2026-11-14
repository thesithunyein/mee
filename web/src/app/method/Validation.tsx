"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { METHOD } from "./text";

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
  const { lang } = useLang();
  const c = METHOD[lang].check;
  const [v, setV] = useState<V | null>(null);
  useEffect(() => {
    fetch("/data/validation.json").then((r) => r.json()).then(setV).catch(() => {});
  }, []);
  if (!v || v.r_cal == null) return null;

  const rows: [string, string, string][] = [
    [c.rows[0], v.r_raw?.toFixed(2) ?? "–", v.r_cal?.toFixed(2) ?? "–"],
    [c.rows[1], pct(v.mape_raw), pct(v.mape_cal)],
    [c.rows[2], pct(v.national_annual_error_raw), pct(v.national_annual_error_cal)],
  ];
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold tracking-tight">{c.title}</h2>
      <p className="mt-2 leading-relaxed text-ink-2">
        {c.intro(v.holdout_year)}
      </p>
      <table className="mt-6 w-full text-left text-sm tabular-nums">
        <thead className="text-ink-3">
          <tr className="border-b border-line">
            <th className="py-3 pr-4 font-medium"> </th>
            <th className="py-3 pr-4 font-medium">{c.cols[1]}</th>
            <th className="py-3 font-medium">{c.cols[2]}</th>
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
