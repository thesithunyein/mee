"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { STATUS_COLOR, STATUS_LABEL, fmt, type AreaSummary, type Meta } from "@/lib/types";

const MyanmarMap = dynamic(() => import("@/components/MyanmarMap"), { ssr: false });

export default function Home() {
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/data/areas.json").then((r) => r.json()).then(setAreas);
    fetch("/data/meta.json").then((r) => r.json()).then(setMeta);
  }, []);

  const national = areas.find((a) => a.level === "national");
  const townships = useMemo(() => areas.filter((a) => a.level === "township"), [areas]);
  const unusual = useMemo(
    () =>
      townships
        .filter((a) => a.status !== "normal")
        .sort((a, b) => b.r7 / Math.max(b.p90, 1) - a.r7 / Math.max(a.p90, 1))
        .slice(0, 8),
    [townships],
  );
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return areas
      .filter((a) => a.name?.toLowerCase().includes(s) || a.state?.toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, areas]);

  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          When and where Myanmar burns, and whether this season is unusual.
        </h1>
        <p className="mt-4 text-slate-300">
          Mee merges 25 years of NASA fire detections from five satellites (MODIS on Terra and Aqua,
          VIIRS on Suomi NPP, NOAA-20 and NOAA-21) into one consistent fire index, so every township&apos;s
          burning season can be compared fairly across years, even as older satellites switch off.
        </p>
        {meta && (
          <p className="mt-2 text-sm text-slate-500">
            Data through {meta.last_date}. Unit: {meta.unit}.
          </p>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Townships: last 7 days vs normal for this date</h2>
          <MyanmarMap />
        </div>

        <div className="space-y-8">
          {national && (
            <Link
              href="/area/MMR"
              className="block rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800 hover:ring-orange-500/50"
            >
              <div className="text-sm text-slate-400">Myanmar, last 7 days</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-semibold">{fmt(national.r7)}</span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium text-white"
                  style={{ background: STATUS_COLOR[national.status] }}
                >
                  {STATUS_LABEL[national.status]}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Normal for this date: up to {fmt(national.p75)} · High above {fmt(national.p90)}
              </div>
              <div className="mt-3 text-sm text-orange-400">Open the national burning calendar →</div>
            </Link>
          )}

          <div>
            <label htmlFor="search" className="text-sm text-slate-300">Find a township or state</label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Hsipaw, Shan, Hakha"
              className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-orange-500"
            />
            {results.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-800 rounded-lg bg-slate-900 ring-1 ring-slate-800">
                {results.map((a) => (
                  <li key={a.area_id}>
                    <Link href={`/area/${encodeURIComponent(a.area_id)}`} className="flex justify-between px-3 py-2 hover:bg-slate-800">
                      <span>
                        {a.name}
                        {a.level === "township" && a.state && <span className="text-slate-500">, {a.state}</span>}
                        {a.level === "state" && <span className="text-slate-500"> (state)</span>}
                      </span>
                      <span className="text-xs" style={{ color: STATUS_COLOR[a.status] === STATUS_COLOR.normal ? "#94a3b8" : STATUS_COLOR[a.status] }}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-300">Most unusual right now</h2>
            {unusual.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No township is above its normal range.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {unusual.map((a) => (
                  <li key={a.area_id}>
                    <Link
                      href={`/area/${encodeURIComponent(a.area_id)}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-slate-900"
                    >
                      <span>
                        {a.name} <span className="text-slate-500">{a.state}</span>
                      </span>
                      <span className="text-sm text-slate-300">
                        {fmt(a.r7)} <span className="text-slate-500">vs normal ≤ {fmt(a.p75)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
