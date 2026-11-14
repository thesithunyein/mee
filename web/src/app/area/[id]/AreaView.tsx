"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import SeasonChart from "@/components/SeasonChart";
import { STATUS_COLOR, STATUS_LABEL, fmt, type AreaDetail } from "@/lib/types";

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

  if (err) return <p className="text-slate-400">No fire data for this area. <Link href="/" className="text-orange-400">Back to map</Link></p>;
  if (!a) return <p className="text-slate-500">Loading…</p>;

  const csv = () => {
    const rows = ["date,mee_fire_index"];
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

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Map</Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{a.name}</h1>
          {a.level === "township" && a.state && <span className="text-slate-400">{a.state}</span>}
          <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: STATUS_COLOR[a.status.level] }}>
            {STATUS_LABEL[a.status.level]}
          </span>
        </div>
        <p className="mt-2 text-slate-300">
          Last 7 days (to {a.last_date}): <b>{fmt(a.status.r7)}</b>. Normal for this date is about {fmt(a.status.p50)},
          elevated above {fmt(a.status.p75)}, high above {fmt(a.status.p90)}.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["This year so far", current ? fmt(current.total) : "–"],
          ["Typical full year", complete.length ? fmt(median(complete.map((s) => s.total))) : "–"],
          ["Peak this year", current?.peak_date ?? "–"],
          ["Season start this year", current?.start_date ?? "–"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
            <div className="text-xs text-slate-400">{k}</div>
            <div className="mt-1 text-xl font-semibold">{v}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
        <h2 className="text-lg font-medium">Burning calendar</h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">
          Each row is a year, each column a day. Colour shows the daily Mee Fire Index (harmonized across all five satellites).
        </p>
        <CalendarHeatmap years={a.years} calendar={a.calendar} lastDate={a.last_date} />
      </section>

      <section className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
        <h2 className="text-lg font-medium">This season vs normal</h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">7-day fire index compared with the range seen in past years on the same dates.</p>
        <SeasonChart years={a.years} calendar={a.calendar} normals={a.normals} lastDate={a.last_date} />
      </section>

      <section className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Seasons by year</h2>
          <button onClick={csv} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm ring-1 ring-slate-700 hover:bg-slate-700">
            Download daily CSV
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-4 font-normal">Year</th>
                <th className="py-2 pr-4 font-normal">Total</th>
                <th className="py-2 pr-4 font-normal">vs typical</th>
                <th className="py-2 pr-4 font-normal">Start</th>
                <th className="py-2 pr-4 font-normal">Peak week</th>
                <th className="py-2 pr-4 font-normal">End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[...a.seasons].reverse().map((s) => (
                <tr key={s.year}>
                  <td className="py-2 pr-4">{s.year}{!s.complete_year && <span className="text-slate-500"> (partial)</span>}</td>
                  <td className="py-2 pr-4">{fmt(s.total)}</td>
                  <td className="py-2 pr-4">{s.vs_median != null ? `${Math.round(s.vs_median * 100)}%` : "–"}</td>
                  <td className="py-2 pr-4">{s.start_date ?? "–"}</td>
                  <td className="py-2 pr-4">{s.peak_date ?? "–"}</td>
                  <td className="py-2 pr-4">{s.end_date ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
