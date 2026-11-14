"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import SeasonChart from "@/components/SeasonChart";
import StatusPill from "@/components/StatusPill";
import TelegramCta from "@/components/TelegramCta";
import { BackIcon, DownloadIcon } from "@/components/Icons";
import { fmt, fmtDate, fmtDay, type AreaDetail } from "@/lib/types";

export default function AreaView() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<AreaDetail | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(`/data/area/${encodeURIComponent(decodeURIComponent(id))}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setA)
      .catch(() => setErr(true));
  }, [id]);

  const complete = useMemo(() => (a ? a.seasons.filter((s) => s.complete_year && s.total > 0) : []), [a]);
  const current = a?.seasons.find((s) => s.year === Number(a.last_date.slice(0, 4)));

  if (err)
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold">No fire record for this place</h1>
        <p className="mt-2 text-ink-2">Satellites saw no fires here, or the link is wrong.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Back to the map</Link>
      </div>
    );
  if (!a)
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-cell" />
        <div className="h-72 animate-pulse rounded-3xl bg-cell" />
      </div>
    );

  const csv = () => {
    const rows = ["date,fires"];
    a.years.forEach((y, yi) =>
      a.calendar[yi].forEach((v, d) => {
        const dt = new Date(Date.UTC(y, 0, d + 1));
        if (dt.getUTCFullYear() === y && dt.toISOString().slice(0, 10) <= a.last_date) rows.push(`${dt.toISOString().slice(0, 10)},${v}`);
      }),
    );
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mee_${a.name.replace(/\s+/g, "_")}_daily.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const ratio = a.status.p50 > 0 ? a.status.r7 / a.status.p50 : null;
  const stats: [string, string][] = [
    ["This year so far", current ? fmt(current.total) : "–"],
    ["Typical full year", complete.length ? fmt(median(complete.map((s) => s.total))) : "–"],
    ["Season start", fmtDay(current?.start_date)],
    ["Busiest week", fmtDay(current?.peak_date)],
  ];

  return (
    <div className="space-y-16">
      <header>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <BackIcon className="h-4 w-4" /> Map
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{a.name}</h1>
          <StatusPill status={a.status.level} />
          <span className="sm:ml-auto"><TelegramCta place={a.name} /></span>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 text-ink-2">
          <span>{a.level === "township" ? `Township in ${a.state}` : a.level === "state" ? "State or region" : "Whole country"}</span>
          <span className="text-ink-3">Data to {fmtDate(a.last_date)}</span>
        </p>

        <div className="mt-10 grid gap-8 border-y border-line py-8 sm:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <div className="text-sm text-ink-2">Last 7 days</div>
            <div className="mt-1 text-5xl font-semibold tracking-tight">{fmt(a.status.r7)}</div>
            <div className="mt-1 text-sm text-ink-2">
              {ratio == null ? "No normal yet" : `Normal is about ${fmt(a.status.p50)}`}
            </div>
          </div>
          {stats.map(([k, v]) => (
            <div key={k} className="sm:border-l sm:border-line sm:pl-6">
              <div className="text-sm text-ink-2">{k}</div>
              <div className="mt-1 text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Fire calendar</h2>
        <p className="mt-1 text-ink-2">One row per year, one square per day. Darker means more fire.</p>
        <div className="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-8">
          <CalendarHeatmap years={a.years} calendar={a.calendar} lastDate={a.last_date} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">This year against normal</h2>
        <p className="mt-1 text-ink-2">Fires per 7 days. The shaded band is what past years looked like on the same dates.</p>
        <div className="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-8">
          <SeasonChart years={a.years} calendar={a.calendar} normals={a.normals} lastDate={a.last_date} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Year by year</h2>
            <p className="mt-1 text-ink-2">Fire season totals and dates.</p>
          </div>
          <button
            onClick={csv}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
          >
            <DownloadIcon className="h-4 w-4" /> Download daily data (CSV)
          </button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
            <thead className="text-ink-3">
              <tr className="border-b border-line">
                {["Year", "Fires", "vs typical", "Start", "Busiest week", "End"].map((h) => (
                  <th key={h} className="py-3 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...a.seasons].reverse().map((s) => (
                <tr key={s.year}>
                  <td className="py-3 pr-4 font-medium">
                    {s.year}
                    {!s.complete_year && <span className="ml-2 font-normal text-ink-3">so far</span>}
                  </td>
                  <td className="py-3 pr-4">{fmt(s.total)}</td>
                  <td className="py-3 pr-4">
                    {s.vs_median != null && s.complete_year ? <VsBar v={s.vs_median} /> : <span className="text-ink-3">–</span>}
                  </td>
                  <td className="py-3 pr-4">{fmtDay(s.start_date)}</td>
                  <td className="py-3 pr-4">{fmtDay(s.peak_date)}</td>
                  <td className="py-3 pr-4">{s.complete_year ? fmtDay(s.end_date) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function VsBar({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-cell">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.min(100, v * 50)}%`, background: v > 1.15 ? "#E0451B" : v < 0.85 ? "#8A958F" : "#F3A83B" }}
        />
        <span className="absolute inset-y-0 left-1/2 w-px bg-ink-3" />
      </span>
      {pct}%
    </span>
  );
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
