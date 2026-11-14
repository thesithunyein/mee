"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ember } from "@/lib/geo";
import { MONTHS, MONTH_START_DOY, doyToLabel, fmt } from "@/lib/types";

interface Props {
  years: number[];
  calendar: number[][];
  lastDate: string;
  rowHeight?: number;
}

const HEADER_H = 22;

export default function CalendarHeatmap({ years, calendar, lastDate, rowHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number; title: string; value: string } | null>(null);

  const labelW = width < 520 ? 34 : 44;
  const rowH = rowHeight ?? (years.length > 20 ? 14 : 20);
  const height = HEADER_H + years.length * rowH;

  // sqrt scale keeps small burning days visible; cap at the 99th percentile
  const vmax = useMemo(() => {
    const vals = calendar.flat().filter((v) => v > 0).sort((a, b) => a - b);
    if (!vals.length) return 1;
    return Math.max(1, vals[Math.floor(vals.length * 0.99)]);
  }, [calendar]);

  const last = useMemo(() => new Date(lastDate + "T00:00:00Z"), [lastDate]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(300, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !width) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cellW = (width - labelW) / 366;
    const gap = cellW > 2.2 ? 0.5 : 0;
    ctx.font = "500 11px ui-sans-serif, system-ui";
    ctx.fillStyle = "#8A958F";
    ctx.textBaseline = "middle";
    MONTH_START_DOY.forEach((d, i) =>
      ctx.fillText(width < 520 ? MONTHS[i][0] : MONTHS[i], labelW + (d - 1) * cellW + 1, HEADER_H / 2),
    );

    years.forEach((y, yi) => {
      const top = HEADER_H + yi * rowH;
      ctx.fillStyle = "#56635C";
      ctx.textAlign = "right";
      ctx.fillText(width < 520 ? `'${String(y).slice(2)}` : String(y), labelW - 8, top + rowH / 2);
      ctx.textAlign = "left";
      const row = calendar[yi];
      for (let d = 0; d < 366; d++) {
        const date = new Date(Date.UTC(y, 0, d + 1));
        if (date.getUTCFullYear() !== y || date > last) continue;
        const v = row[d];
        ctx.fillStyle = v > 0 ? ember(0.08 + 0.92 * Math.min(1, Math.sqrt(v / vmax))) : "#E9ECE7";
        ctx.fillRect(labelW + d * cellW, top + 1.5, Math.max(cellW - gap, 0.8), rowH - 3);
      }
    });
  }, [width, height, years, calendar, vmax, rowH, last, labelW]);

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const cellW = (width - labelW) / 366;
    const d = Math.floor((x - labelW) / cellW);
    const yi = Math.floor((y - HEADER_H) / rowH);
    if (d < 0 || d >= 366 || yi < 0 || yi >= years.length) return setHover(null);
    const date = new Date(Date.UTC(years[yi], 0, d + 1));
    if (date > last || date.getUTCFullYear() !== years[yi]) return setHover(null);
    setHover({ x, y, title: `${doyToLabel(d + 1)} ${years[yi]}`, value: `${fmt(calendar[yi][d])} fires` });
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        style={{ width: width || "100%", height }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block touch-pan-y"
        role="img"
        aria-label={`Daily fire calendar, ${years[0]} to ${years[years.length - 1]}`}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(23,33,28,0.35)]"
          style={{ left: Math.min(hover.x + 14, width - 150), top: hover.y + 14 }}
        >
          <div className="text-ink-3">{hover.title}</div>
          <div className="font-semibold tabular-nums text-ink">{hover.value}</div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        <span>None</span>
        <span className="h-2.5 w-3 rounded-[2px] bg-cell" />
        <div
          className="h-2.5 w-36 rounded-[2px]"
          style={{ background: `linear-gradient(to right, ${[0.08, 0.3, 0.55, 0.8, 1].map(ember).join(",")})` }}
        />
        <span>Most fire</span>
      </div>
    </div>
  );
}
