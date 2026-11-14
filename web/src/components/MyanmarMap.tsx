"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronIcon } from "@/components/Icons";
import { fitProjection, type FeatureCollection } from "@/lib/geo";
import { useLang } from "@/lib/i18n";
import { STATUS_COLOR, type Status } from "@/lib/types";

type Props = { area_id: string; name: string; status: Status };

const W = 420;
const H = 640;

export default function MyanmarMap() {
  const { t } = useLang();
  const [gj, setGj] = useState<FeatureCollection<Props> | null>(null);
  const [hover, setHover] = useState<Props | null>(null);
  const [picked, setPicked] = useState<Props | null>(null);

  useEffect(() => {
    fetch("/data/townships.geojson").then((r) => r.json()).then(setGj);
  }, []);

  const paths = useMemo(() => {
    if (!gj) return [];
    const path = fitProjection(gj, W, H);
    const order: Record<Status, number> = { normal: 0, elevated: 1, high: 2 };
    return gj.features
      .map((f) => ({ d: path(f), p: f.properties }))
      .sort((a, b) => order[a.p.status] - order[b.p.status]);
  }, [gj]);

  if (!gj) return <div className="aspect-[420/640] w-full animate-pulse rounded-2xl bg-cell" />;

  const shown = picked ?? hover;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Myanmar townships coloured by fire level this week">
        {paths.map(({ d, p }) => (
          <path
            key={p.area_id}
            d={d}
            fill={shown?.area_id === p.area_id ? "#17211C" : (STATUS_COLOR[p.status] ?? STATUS_COLOR.normal)}
            stroke="#F6F7F4"
            strokeWidth={0.5}
            className="cursor-pointer"
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(p)}
            onPointerLeave={() => setHover(null)}
            onClick={() => setPicked(p)}
          >
            <title>{`${p.name}: ${t.status[p.status]}`}</title>
          </path>
        ))}
      </svg>
      <div className="absolute left-0 top-0 min-h-[52px] max-w-[70%] rounded-xl border border-line bg-white/90 px-3 py-2 text-sm backdrop-blur">
        {shown ? (
          <>
            <div className="font-semibold">{shown.name}</div>
            <div className="text-ink-2">{t.status[shown.status]}</div>
            {picked && (
              <Link
                href={`/area/${encodeURIComponent(picked.area_id)}`}
                className="mt-1.5 inline-flex items-center gap-1 font-medium text-ember"
              >
                {t.week.openPlace} <ChevronIcon className="h-4 w-4" />
              </Link>
            )}
          </>
        ) : (
          <div className="text-ink-3">{t.week.tap}</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {(Object.keys(STATUS_COLOR) as Status[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {t.status[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
