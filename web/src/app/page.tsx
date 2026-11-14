"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import AreaSearch from "@/components/AreaSearch";
import Faq from "@/components/Faq";
import StatusPill from "@/components/StatusPill";
import TelegramCta from "@/components/TelegramCta";
import { CalendarIcon, ChevronIcon, MatchIcon, SatelliteIcon } from "@/components/Icons";
import { useLang } from "@/lib/i18n";
import { fmt, observedYears, onlyYears, placeLabel, type AreaDetail, type AreaSummary } from "@/lib/types";

const MyanmarMap = dynamic(() => import("@/components/MyanmarMap"), { ssr: false });

const STEP_ICONS = [SatelliteIcon, MatchIcon, CalendarIcon];

export default function Home() {
  const { t } = useLang();
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [mmr, setMmr] = useState<AreaDetail | null>(null);

  useEffect(() => {
    fetch("/data/areas.json").then((r) => r.json()).then(setAreas);
    fetch("/data/area/MMR.json").then((r) => r.json()).then((m: AreaDetail) => setMmr(onlyYears(m, observedYears(m))));
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
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
              {t.hero.sub}
            </p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-3">
            <AreaSearch areas={areas} />
            <TelegramCta />
          </div>
        </div>

        <figure className="mt-12 rounded-3xl border border-line bg-white p-5 sm:p-8">
          {mmr ? (
            <div className="reveal">
              <CalendarHeatmap years={mmr.years} calendar={mmr.calendar} lastDate={mmr.last_date} rowHeight={mmr.years.length > 12 ? 17 : 26} />
            </div>
          ) : (
            <div className="h-[230px] animate-pulse rounded-xl bg-cell" />
          )}
          <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm text-ink-2">
            <span>{t.hero.caption}</span>
            <Link href="/area/MMR" className="inline-flex items-center gap-1 font-medium text-ink hover:text-ember">
              {t.hero.open} <ChevronIcon className="h-4 w-4" />
            </Link>
          </figcaption>
        </figure>
      </section>

      <section className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t.week.title}</h2>
          {mmr && (
            <p className="mt-2 text-ink-2">{t.week.latest(t.date(mmr.last_date))}</p>
          )}
          <div className="mt-8">
            <MyanmarMap />
          </div>
        </div>

        <div className="lg:pt-16">
          {mmr && (
            <Link href="/area/MMR" className="group block rounded-3xl bg-ink p-7 text-paper">
              <div className="flex items-center justify-between">
                <span className="text-sm text-paper/70">{t.week.card}</span>
                <StatusPill status={mmr.status.level} />
              </div>
              <div className="mt-6 text-6xl font-semibold tracking-tight">{fmt(mmr.status.r7)}</div>
              <div className="mt-2 text-paper/70">{t.week.normalAbout(fmt(mmr.status.p50))}</div>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#F6B44B] group-hover:underline">
                {t.week.seeCalendar} <ChevronIcon className="h-4 w-4" />
              </div>
            </Link>
          )}

          <h3 className="mt-12 font-semibold">{t.week.aboveNow}</h3>
          {areas.length > 0 && unusual.length === 0 && (
            <p className="mt-3 text-ink-2">{t.week.allNormal}</p>
          )}
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {unusual.slice(0, 8).map((a) => (
              <li key={a.area_id}>
                <Link href={`/area/${encodeURIComponent(a.area_id)}`} className="flex items-center justify-between gap-4 py-3.5 hover:bg-white">
                  <span className="min-w-0">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-ink-3"> {placeLabel(a.state)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-sm tabular-nums text-ink-2 sm:inline">{t.week.firesShort(fmt(a.r7))}</span>
                    <StatusPill status={a.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {unusual.length > 8 && <p className="mt-3 text-sm text-ink-3">{t.week.more(unusual.length - 8)}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">{t.how}</h2>
        <ol className="mt-8 grid gap-10 sm:grid-cols-3">
          {t.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
            <li key={s.title}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ember">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm tabular-nums text-ink-3">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 leading-relaxed text-ink-2">{s.text}</p>
            </li>
            );
          })}
        </ol>
        <Link href="/method" className="mt-8 inline-flex items-center gap-1 text-sm font-medium hover:text-ember">
          {t.readMethod} <ChevronIcon className="h-4 w-4" />
        </Link>
      </section>

      <Faq />
    </div>
  );
}
