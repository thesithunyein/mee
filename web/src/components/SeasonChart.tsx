"use client";

import { useMemo, useState } from "react";
import { MONTHS, MONTH_START_DOY, fmt, rolling7, doyToLabel } from "@/lib/types";

interface Props {
  years: number[];
  calendar: number[][];
  normals: { p50: number[]; p75: number[]; p90: number[] };
  lastDate: string;
}

const W = 900;
const H = 280;
const PAD = { l: 48, r: 16, t: 16, b: 28 };

export default function SeasonChart({ years, calendar, normals, lastDate }: Props) {
  const lastYear = Number(lastDate.slice(0, 4));
  const [year, setYear] = useState(lastYear);
  const [hoverDoy, setHoverDoy] = useState<number | null>(null);

  const yi = years.indexOf(year);
  const series = useMemo(() => {
    const row = yi >= 0 ? calendar[yi] : new Array(366).fill(0);
    // include previous December so early-January 7-day sums are right
    const prev = yi > 0 ? calendar[yi - 1].slice(-7) : new Array(7).fill(0);
    return rolling7([...prev, ...row]).slice(7);
  }, [calendar, yi]);

  const lastDoy = useMemo(() => {
    if (year !== lastYear) return 366;
    const d = new Date(lastDate + "T00:00:00Z");
    return Math.floor((d.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1;
  }, [year, lastYear, lastDate]);

  const ymax = Math.max(1, ...normals.p90, ...series.slice(0, lastDoy)) * 1.1;
  const x = (doy: number) => PAD.l + ((doy - 1) / 365) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / ymax) * (H - PAD.t - PAD.b);

  const band = [
    ...normals.p90.map((v, i) => `${x(i + 1)},${y(v)}`),
    ...normals.p50.map((v, i) => `${x(i + 1)},${y(v)}`).reverse(),
  ].join(" ");
  const line = series.slice(0, lastDoy).map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");
  const p50line = normals.p50.map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * ymax);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="text-slate-400" htmlFor="year">Season</label>
        <select
          id="year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md bg-slate-800 px-2 py-1 text-slate-100 ring-1 ring-slate-700"
        >
          {[...years].reverse().map((yy) => (
            <option key={yy} value={yy}>{yy}</option>
          ))}
        </select>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="inline-block h-3 w-3 rounded-sm bg-orange-500/25 ring-1 ring-orange-500/40" /> Normal range (median to 90th percentile)
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="inline-block h-0.5 w-4 bg-orange-400" /> {year}, 7-day fire index
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const d = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 365) + 1;
          setHoverDoy(d >= 1 && d <= 366 ? d : null);
        }}
        onMouseLeave={() => setHoverDoy(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1e293b" />
            <text x={PAD.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#64748b">
              {fmt(t)}
            </text>
          </g>
        ))}
        {MONTH_START_DOY.map((d, i) => (
          <text key={d} x={x(d) + 2} y={H - 8} fontSize="11" fill="#64748b">{MONTHS[i]}</text>
        ))}
        <polygon points={band} fill="rgba(249,115,22,0.18)" />
        <polyline points={p50line} fill="none" stroke="rgba(249,115,22,0.45)" strokeDasharray="4 3" />
        <polyline points={line} fill="none" stroke="#fb923c" strokeWidth="2" />
        {hoverDoy && hoverDoy <= lastDoy && (
          <g>
            <line x1={x(hoverDoy)} x2={x(hoverDoy)} y1={PAD.t} y2={H - PAD.b} stroke="#475569" />
            <circle cx={x(hoverDoy)} cy={y(series[hoverDoy - 1])} r="4" fill="#fb923c" />
            <text x={Math.min(x(hoverDoy) + 8, W - 210)} y={PAD.t + 12} fontSize="12" fill="#e2e8f0">
              {doyToLabel(hoverDoy)}: {fmt(series[hoverDoy - 1])} (normal {fmt(normals.p50[hoverDoy - 1])}, high above {fmt(normals.p90[hoverDoy - 1])})
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
