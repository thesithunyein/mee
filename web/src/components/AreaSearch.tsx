"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocateIcon, SearchIcon } from "@/components/Icons";
import StatusPill from "@/components/StatusPill";
import { useLang } from "@/lib/i18n";
import { townshipAt } from "@/lib/pip";
import { placeLabel, type AreaSummary } from "@/lib/types";

// "21.97, 96.08" or "96.08 21.97" -> { lat, lon }. Myanmar's latitude and longitude ranges
// don't overlap, so either order works.
function parseCoords(q: string): { lat: number; lon: number } | null {
  const m = q.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const isLat = (x: number) => x >= 5 && x <= 32;
  const isLon = (x: number) => x >= 85 && x <= 105;
  if (isLon(a) && isLat(b)) return { lat: b, lon: a };
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lon: b };
}

export default function AreaSearch({ areas }: { areas: AreaSummary[] }) {
  const router = useRouter();
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return areas
      .filter((a) => placeLabel(a.name).toLowerCase().includes(s) || placeLabel(a.state).toLowerCase().includes(s))
      .sort((a, b) => Number(!placeLabel(a.name).toLowerCase().startsWith(s)) - Number(!placeLabel(b.name).toLowerCase().startsWith(s)))
      .slice(0, 7);
  }, [q, areas]);

  const coords = useMemo(() => parseCoords(q), [q]);
  const go = (id: string) => router.push(`/area/${encodeURIComponent(id)}`);

  async function goTo(lon: number, lat: number, outsideMsg: string) {
    try {
      const fc = await fetch("/data/townships.geojson").then((r) => r.json());
      const hit = townshipAt(fc, lon, lat);
      if (!hit) return setLocMsg(outsideMsg);
      setLocMsg(null);
      go(hit.area_id);
    } catch {
      setLocMsg(t.locate.failed);
    }
  }

  function locate() {
    if (!navigator.geolocation) return setLocMsg(t.locate.failed);
    setLocMsg(t.locate.finding);
    navigator.geolocation.getCurrentPosition(
      (pos) => goTo(pos.coords.longitude, pos.coords.latitude, t.locate.outside),
      (err) => setLocMsg(err.code === err.PERMISSION_DENIED ? t.locate.denied : t.locate.failed),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative">
        <label htmlFor="area-search" className="sr-only">{t.search.label}</label>
        <div className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-[0_1px_0_rgba(23,33,28,0.04)] focus-within:border-ink-3">
          <SearchIcon className="shrink-0 text-ink-3" />
          <input
            id="area-search"
            value={q}
            autoComplete="off"
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && coords) goTo(coords.lon, coords.lat, t.search.noCoords);
              else if (e.key === "Enter" && results[active]) go(results[active].area_id);
            }}
            placeholder={t.search.placeholder}
            className="w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
        </div>
        {q.trim() && (
          <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-[0_16px_40px_-20px_rgba(23,33,28,0.35)]">
            {coords && (
              <li>
                <button
                  onClick={() => goTo(coords.lon, coords.lat, t.search.noCoords)}
                  className="flex w-full items-center gap-3 bg-cell px-4 py-2.5 text-left font-medium"
                >
                  <LocateIcon className="h-4 w-4 shrink-0 text-ember" />
                  {t.search.coords(`${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`)}
                </button>
              </li>
            )}
            {!coords && results.length === 0 && <li className="px-4 py-3 text-sm text-ink-3">{t.search.none}</li>}
            {results.map((a, i) => (
              <li key={a.area_id}>
                <button
                  onClick={() => go(a.area_id)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${i === active ? "bg-cell" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="font-medium">{placeLabel(a.name)}</span>
                    <span className="text-ink-3">
                      {a.level === "township" && a.state ? `, ${placeLabel(a.state)}` : a.level === "state" ? `, ${t.search.state}` : ""}
                    </span>
                  </span>
                  <StatusPill status={a.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={locate}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium hover:border-ink-3"
        >
          <LocateIcon className="h-4 w-4 shrink-0 text-ember" />
          {t.locate.button}
        </button>
        {locMsg && <span className="text-sm text-ink-2" role="status">{locMsg}</span>}
      </div>
    </div>
  );
}
