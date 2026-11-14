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
    return gj.features.map((f) => ({ d: path(f), p: f.properties }));
  }, [gj]);

  if (!gj) return <div className="flex h-[640px] items-center justify-center text-slate-500">Loading map…</div>;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Myanmar townships by current fire status">
        {paths.map(({ d, p }) => (
          <path
            key={p.area_id}
            d={d}
            fill={STATUS_COLOR[p.status] ?? STATUS_COLOR.normal}
            stroke="#0b1220"
            strokeWidth={0.4}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
            onClick={() => router.push(`/area/${encodeURIComponent(p.area_id)}`)}
          />
        ))}
      </svg>
      <div className="absolute left-2 top-2 rounded-md bg-slate-900/90 px-3 py-2 text-sm ring-1 ring-slate-700">
        {hover ? (
          <>
            <div className="font-medium text-slate-100">{hover.name}</div>
            <div className="text-slate-400">{STATUS_LABEL[hover.status]}. Click for details</div>
          </>
        ) : (
          <div className="text-slate-400">Hover a township</div>
        )}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        {(Object.keys(STATUS_COLOR) as Status[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
