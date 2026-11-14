"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fitProjection, type FeatureCollection } from "@/lib/geo";
import { STATUS_COLOR, STATUS_LABEL, type Status } from "@/lib/types";

type Props = { area_id: string; name: string; status: Status };

const W = 420;
const H = 640;

export default function MyanmarMap() {
  const router = useRouter();
  const [gj, setGj] = useState<FeatureCollection<Props> | null>(null);
  const [hover, setHover] = useState<Props | null>(null);

  useEffect(() => {
    fetch("/data/townships.geojson").then((r) => r.json()).then(setGj);
  }, []);

  const paths = useMemo(() => {
    if (!gj) return [];
    const path = fitProjection(gj, W, H);
    // draw normal townships first so highlighted ones sit on top
    const order: Record<Status, number> = { normal: 0, elevated: 1, high: 2 };
    return gj.features
      .map((f) => ({ d: path(f), p: f.properties }))
      .sort((a, b) => order[a.p.status] - order[b.p.status]);
  }, [gj]);

  if (!gj) return <div className="aspect-[420/640] w-full animate-pulse rounded-2xl bg-cell" />;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Myanmar townships coloured by fire level this week">
        {paths.map(({ d, p }) => (
          <path
            key={p.area_id}
            d={d}
            fill={hover?.area_id === p.area_id ? "#17211C" : (STATUS_COLOR[p.status] ?? STATUS_COLOR.normal)}
            stroke="#F6F7F4"
            strokeWidth={0.5}
            className="cursor-pointer"
            onPointerEnter={() => setHover(p)}
            onPointerLeave={() => setHover(null)}
            onClick={() => router.push(`/area/${encodeURIComponent(p.area_id)}`)}
          >
            <title>{`${p.name}: ${STATUS_LABEL[p.status]}`}</title>
          </path>
        ))}
      </svg>
      <div className="pointer-events-none absolute left-0 top-0 min-h-[52px] rounded-xl border border-line bg-white/90 px-3 py-2 text-sm backdrop-blur">
        {hover ? (
          <>
            <div className="font-semibold">{hover.name}</div>
            <div className="text-ink-2">{STATUS_LABEL[hover.status]}</div>
          </>
        ) : (
          <div className="text-ink-3">Tap a township</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {(Object.keys(STATUS_COLOR) as Status[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
