"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/Icons";
import StatusPill from "@/components/StatusPill";
import type { AreaSummary } from "@/lib/types";

export default function AreaSearch({ areas }: { areas: AreaSummary[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return areas
      .filter((a) => a.name?.toLowerCase().includes(s) || a.state?.toLowerCase().includes(s))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(s)) - Number(!b.name.toLowerCase().startsWith(s)))
      .slice(0, 7);
  }, [q, areas]);

  const go = (a: AreaSummary) => router.push(`/area/${encodeURIComponent(a.area_id)}`);

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="area-search" className="sr-only">Search a township or state</label>
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
            if (e.key === "Enter" && results[active]) go(results[active]);
          }}
          placeholder="Search a township or state"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
        />
      </div>
      {q.trim() && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-[0_16px_40px_-20px_rgba(23,33,28,0.35)]">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-ink-3">No match. Try a nearby town or the state name.</li>}
          {results.map((a, i) => (
            <li key={a.area_id}>
              <button
                onClick={() => go(a)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${i === active ? "bg-cell" : ""}`}
              >
                <span>
                  <span className="font-medium">{a.name}</span>
                  <span className="text-ink-3">
                    {a.level === "township" && a.state ? `, ${a.state}` : a.level === "state" ? ", state" : ""}
                  </span>
                </span>
                <StatusPill status={a.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
