"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inferno as interpolateInferno } from "@/lib/geo";
import { MONTHS, MONTH_START_DOY, doyToLabel, fmt } from "@/lib/types";

interface Props {
  years: number[];
  calendar: number[][];
  lastDate: string;
}

const LABEL_W = 44;
const HEADER_H = 20;

export default function CalendarHeatmap({ years, calendar, lastDate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const rowH = years.length > 20 ? 14 : 18;
  const height = HEADER_H + years.length * rowH;

  // Colour scale: sqrt so small burning days stay visible; cap at the 99th percentile
  const vmax = useMemo(() => {
    const vals = calendar.flat().filter((v) => v > 0).sort((a, b) => a - b);
    if (!vals.length) return 1;
    return Math.max(1, vals[Math.floor(vals.length * 0.99)]);
  }, [calendar]);

  const last = useMemo(() => new Date(lastDate + "T00:00:00Z"), [lastDate]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(600, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cellW = (width - LABEL_W) / 366;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillStyle = "#94a3b8";
    ctx.textBaseline = "middle";
    MONTH_START_DOY.forEach((d, i) => ctx.fillText(MONTHS[i], LABEL_W + (d - 1) * cellW + 2, HEADER_H / 2));

    years.forEach((y, yi) => {
      const top = HEADER_H + yi * rowH;
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      ctx.fillText(String(y), LABEL_W - 6, top + rowH / 2);
      ctx.textAlign = "left";
      const row = calendar[yi];
      for (let d = 0; d < 366; d++) {
        const date = new Date(Date.UTC(y, 0, d + 1));
        if (date.getUTCFullYear() !== y || date > last) continue; // non-leap day 366 / future
        const v = row[d];
        ctx.fillStyle = v > 0 ? interpolateInferno(0.15 + 0.85 * Math.min(1, Math.sqrt(v / vmax))) : "#0f172a";
        ctx.fillRect(LABEL_W + d * cellW, top + 1, Math.ceil(cellW), rowH - 2);
      }
    });
  }, [width, height, years, calendar, vmax, rowH, last]);

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const cellW = (width - LABEL_W) / 366;
    const d = Math.floor((x - LABEL_W) / cellW);
    const yi = Math.floor((y - HEADER_H) / rowH);
    if (d < 0 || d >= 366 || yi < 0 || yi >= years.length) return setHover(null);
    const v = calendar[yi][d];
    setHover({ x, y, text: `${doyToLabel(d + 1)}, ${years[yi]}: ${fmt(v)} fire index` });
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        className="block"
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-slate-900/95 px-2 py-1 text-xs text-slate-100 shadow ring-1 ring-slate-700"
          style={{ left: Math.min(hover.x + 12, width - 220), top: hover.y + 12 }}
        >
          {hover.text}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span>Less</span>
        <div
          className="h-2 w-40 rounded"
          style={{
            background: `linear-gradient(to right, ${[0.15, 0.4, 0.6, 0.8, 1]
              .map((t) => interpolateInferno(t))
              .join(",")})`,
          }}
        />
        <span>More fire activity</span>
      </div>
    </div>
  );
}
