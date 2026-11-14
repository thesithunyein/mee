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
const H = 300;
const PAD = { l: 52, r: 12, t: 20, b: 30 };

export default function SeasonChart({ years, calendar, normals, lastDate }: Props) {
  const lastYear = Number(lastDate.slice(0, 4));
  const [year, setYear] = useState(lastYear);
  const [hoverDoy, setHoverDoy] = useState<number | null>(null);

  const yi = years.indexOf(year);
  const series = useMemo(() => {
    const row = yi >= 0 ? calendar[yi] : new Array(366).fill(0);
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
  const h = hoverDoy && hoverDoy <= lastDoy ? hoverDoy : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
        <label className="flex items-center gap-2">
          <span className="sr-only">Year</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-full border border-line bg-white px-3 py-1.5 font-medium text-ink"
          >
            {[...years].reverse().map((yy) => <option key={yy} value={yy}>{yy}</option>)}
          </select>
        </label>
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 rounded bg-ember" />{year}</span>
        <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-[#FBE9C6]" />Normal range</span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y"
          role="img"
          aria-label={`7-day fire count in ${year} against the normal range`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const d = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 365) + 1;
            setHoverDoy(d >= 1 && d <= 366 ? d : null);
          }}
          onPointerLeave={() => setHoverDoy(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#E4E8E3" />
              <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#8A958F">
                {fmt(t)}
              </text>
            </g>
          ))}
          {MONTH_START_DOY.map((d, i) => (
            <text key={d} x={x(d) + 2} y={H - 8} fontSize="11" fill="#8A958F">{MONTHS[i]}</text>
          ))}
          <polygon points={band} fill="#FBE9C6" />
          <polyline points={p50line} fill="none" stroke="#F3A83B" strokeDasharray="3 4" />
          <polyline points={line} fill="none" stroke="#E0451B" strokeWidth="2.2" strokeLinejoin="round" />
          {h && (
            <g>
              <line x1={x(h)} x2={x(h)} y1={PAD.t} y2={H - PAD.b} stroke="#C9D0CA" />
              <circle cx={x(h)} cy={y(series[h - 1])} r="4.5" fill="#fff" stroke="#E0451B" strokeWidth="2" />
            </g>
          )}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(23,33,28,0.35)]"
            style={{ left: `min(calc(${(x(h) / W) * 100}% + 10px), calc(100% - 170px))` }}
          >
            <div className="text-ink-3">Week to {doyToLabel(h)}</div>
            <div className="font-semibold tabular-nums">{fmt(series[h - 1])} fires</div>
            <div className="tabular-nums text-ink-2">Normal {fmt(normals.p50[h - 1])}</div>
          </div>
        )}
      </div>
    </div>
  );
}
