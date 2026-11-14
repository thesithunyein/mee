"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import AreaSearch from "@/components/AreaSearch";
import Faq from "@/components/Faq";
import StatusPill from "@/components/StatusPill";
import { CalendarIcon, ChevronIcon, MatchIcon, SatelliteIcon } from "@/components/Icons";
import { fmt, fmtDate, type AreaDetail, type AreaSummary } from "@/lib/types";

const MyanmarMap = dynamic(() => import("@/components/MyanmarMap"), { ssr: false });

const STEPS = [
  { icon: SatelliteIcon, title: "Collect", text: "Daily fire detections from five NASA satellites, through NASA FIRMS." },
  { icon: MatchIcon, title: "Match", text: "Each satellite is scaled to one shared unit, so old and new years compare fairly." },
  { icon: CalendarIcon, title: "Compare", text: "Each week is checked against the same dates in every past year." },
];

export default function Home() {
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [mmr, setMmr] = useState<AreaDetail | null>(null);

  useEffect(() => {
    fetch("/data/areas.json").then((r) => r.json()).then(setAreas);
    fetch("/data/area/MMR.json").then((r) => r.json()).then(setMmr);
  }, []);

  const unusual = useMemo(
    () =>
      areas
        .filter((a) => a.level === "township" && a.status !== "normal")
        .sort((a, b) => (a.status === b.status ? 0 : a.status === "high" ? -1 : 1) || b.r7 - b.p75 - (a.r7 - a.p75)),
    [areas],
  );

  return (
    <div className="space-y-20 sm:space-y-28">
      <section>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
              Myanmar&apos;s fire seasons, day by day.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
              NASA satellite fire data for every township, in one calendar. See when fires usually come, and if this week is normal.
            </p>
          </div>
          <AreaSearch areas={areas} />
        </div>

        <figure className="mt-12 rounded-3xl border border-line bg-white p-5 sm:p-8">
          {mmr ? (
            <div className="reveal">
              <CalendarHeatmap years={mmr.years} calendar={mmr.calendar} lastDate={mmr.last_date} rowHeight={26} />
            </div>
          ) : (
            <div className="h-[230px] animate-pulse rounded-xl bg-cell" />
          )}
          <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm text-ink-2">
            <span>All of Myanmar. One row per year, one square per day.</span>
            <Link href="/area/MMR" className="inline-flex items-center gap-1 font-medium text-ink hover:text-ember">
              Open Myanmar <ChevronIcon className="h-4 w-4" />
            </Link>
          </figcaption>
        </figure>
      </section>

      <section className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">This week</h2>
          {mmr && (
            <p className="mt-2 text-ink-2">Latest data: {fmtDate(mmr.last_date)}</p>
          )}
          <div className="mt-8">
            <MyanmarMap />
          </div>
        </div>

        <div className="lg:pt-16">
          {mmr && (
            <Link href="/area/MMR" className="group block rounded-3xl bg-ink p-7 text-paper">
              <div className="flex items-center justify-between">
                <span className="text-sm text-paper/70">Myanmar, last 7 days</span>
                <StatusPill status={mmr.status.level} />
              </div>
              <div className="mt-6 text-6xl font-semibold tracking-tight">{fmt(mmr.status.r7)}</div>
              <div className="mt-2 text-paper/70">fires. Normal for this week is about {fmt(mmr.status.p50)}.</div>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#F6B44B] group-hover:underline">
                See the full calendar <ChevronIcon className="h-4 w-4" />
              </div>
            </Link>
          )}

          <h3 className="mt-12 font-semibold">Above normal now</h3>
          {areas.length > 0 && unusual.length === 0 && (
            <p className="mt-3 text-ink-2">Every township is in its normal range.</p>
          )}
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {unusual.slice(0, 8).map((a) => (
              <li key={a.area_id}>
                <Link href={`/area/${encodeURIComponent(a.area_id)}`} className="flex items-center justify-between gap-4 py-3.5 hover:bg-white">
                  <span className="min-w-0">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-ink-3"> {a.state}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-sm tabular-nums text-ink-2 sm:inline">{fmt(a.r7)} fires</span>
                    <StatusPill status={a.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {unusual.length > 8 && <p className="mt-3 text-sm text-ink-3">{unusual.length - 8} more on the map.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ember">
                  <s.icon />
                </span>
                <span className="text-sm tabular-nums text-ink-3">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 leading-relaxed text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/method" className="mt-8 inline-flex items-center gap-1 text-sm font-medium hover:text-ember">
          Read the method <ChevronIcon className="h-4 w-4" />
        </Link>
      </section>

      <Faq />
    </div>
  );
}
