"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import SeasonChart from "@/components/SeasonChart";
import StatusPill from "@/components/StatusPill";
import TelegramCta from "@/components/TelegramCta";
import { BackIcon, DownloadIcon } from "@/components/Icons";
import { useLang, type Dict } from "@/lib/i18n";
import { doyLabelIn, fmt, observedYears, onlyYears, placeLabel, type AreaDetail } from "@/lib/types";

export default function AreaView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const [a, setA] = useState<AreaDetail | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/data/area/${encodeURIComponent(decodeURIComponent(id))}.json`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/data/area/MMR.json").then((r) => r.json()),
    ])
      .then(([area, national]: [AreaDetail, AreaDetail]) => setA(onlyYears(area, observedYears(national))))
      .catch(() => setErr(true));
  }, [id]);

  const complete = useMemo(() => (a ? a.seasons.filter((s) => s.complete_year && s.total > 0) : []), [a]);
  const current = a?.seasons.find((s) => s.year === Number(a.last_date.slice(0, 4)));

  if (err)
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold">{t.area.notFoundTitle}</h1>
        <p className="mt-2 text-ink-2">{t.area.notFoundText}</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">{t.area.backToMap}</Link>
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

  const day = (iso: string | null | undefined) => (iso ? t.date(iso, false) : "–");
  const stats: [string, string][] = [
    [t.area.thisYear, current ? fmt(current.total) : "–"],
    [t.area.typicalYear, complete.length ? fmt(median(complete.map((s) => s.total))) : "–"],
    [t.area.seasonStart, day(current?.start_date)],
    [t.area.busiest, day(current?.peak_date)],
  ];
  const summary = summarize(a, t);

  return (
    <div className="space-y-16">
      <header>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <BackIcon className="h-4 w-4" /> {t.area.back}
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{placeLabel(a.name)}</h1>
          <StatusPill status={a.status.level} />
          <span className="sm:ml-auto"><TelegramCta place={placeLabel(a.name)} /></span>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 text-ink-2">
          <span>{a.level === "township" ? t.area.township(placeLabel(a.state)) : a.level === "state" ? t.area.state : t.area.country}</span>
          <span className="text-ink-3">{t.area.dataTo(t.date(a.last_date))}</span>
        </p>
        {summary && (
          <p className="mt-6 max-w-2xl border-l-2 border-ember pl-4 text-lg leading-relaxed">{summary}</p>
        )}

        <div className="mt-10 grid gap-8 border-y border-line py-8 sm:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <div className="text-sm text-ink-2">{t.area.last7}</div>
            <div className="mt-1 text-5xl font-semibold tracking-tight">{fmt(a.status.r7)}</div>
            <div className="mt-1 text-sm text-ink-2">
              {t.area.normalAbout(fmt(a.status.p50))}
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
        <h2 className="text-2xl font-semibold tracking-tight">{t.area.calTitle}</h2>
        <p className="mt-1 text-ink-2">{t.area.calDesc}</p>
        <div className="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-8">
          <CalendarHeatmap years={a.years} calendar={a.calendar} lastDate={a.last_date} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">{t.area.chartTitle}</h2>
        <p className="mt-1 text-ink-2">{t.area.chartDesc}</p>
        <div className="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-8">
          <SeasonChart years={a.years} calendar={a.calendar} normals={a.normals} lastDate={a.last_date} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t.area.tableTitle}</h2>
            <p className="mt-1 text-ink-2">{t.area.tableDesc}</p>
          </div>
          <button
            onClick={csv}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
          >
            <DownloadIcon className="h-4 w-4" /> {t.area.download}
          </button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
            <thead className="text-ink-3">
              <tr className="border-b border-line">
                {t.area.cols.map((h) => (
                  <th key={h} className="py-3 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...a.seasons].reverse().map((s) => (
                <tr key={s.year}>
                  <td className="py-3 pr-4 font-medium">
                    {s.year}
                    {!s.complete_year && <span className="ml-2 font-normal text-ink-3">{t.area.soFar}</span>}
                  </td>
                  <td className="py-3 pr-4">{fmt(s.total)}</td>
                  <td className="py-3 pr-4">
                    {s.vs_median != null && s.complete_year ? <VsBar v={s.vs_median} /> : <span className="text-ink-3">–</span>}
                  </td>
                  <td className="py-3 pr-4">{day(s.start_date)}</td>
                  <td className="py-3 pr-4">{day(s.peak_date)}</td>
                  <td className="py-3 pr-4">{s.complete_year ? day(s.end_date) : "–"}</td>
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

// Season days count from September, so a season running Dec -> Apr stays in one block.
const shift = (doy: number) => (doy > 243 ? doy - 366 : doy);
const doyOf = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
};
const unshift = (d: number) => (d < 1 ? d + 366 : d);

function summarize(a: AreaDetail, t: Dict): string | null {
  const today = t.date(a.last_date, false);
  const first = t.summary.level(placeLabel(a.name), a.status.level, today);
  const seasons = a.seasons.filter((s) => s.complete_year && s.total > 0 && s.start_date && s.peak_date && s.end_date);
  if (seasons.length < 3) return first;
  const start = Math.round(median(seasons.map((s) => shift(doyOf(s.start_date!)))));
  const peak = Math.round(median(seasons.map((s) => shift(doyOf(s.peak_date!)))));
  const end = Math.round(median(seasons.map((s) => shift(doyOf(s.end_date!)))));
  const now = shift(doyOf(a.last_date));
  const label = (d: number) => doyLabelIn(unshift(d), t.months);
  if (now < start) return `${first} ${t.summary.before(label(start), label(peak), start - now)}`;
  if (now <= end) return `${first} ${t.summary.during(label(peak))}`;
  return `${first} ${t.summary.after(label(start))}`;
}
