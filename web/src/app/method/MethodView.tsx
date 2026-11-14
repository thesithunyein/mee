"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { METHOD } from "./text";
import Validation from "./Validation";

export default function MethodView() {
  const { lang } = useLang();
  const m = METHOD[lang];
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{m.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-2">{m.intro}</p>

      <ol className="mt-14 space-y-10">
        {m.steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-4">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-sm font-semibold tabular-nums text-ember">
              {i + 1}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-1 leading-relaxed text-ink-2">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Validation />

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">{m.limitsTitle}</h2>
        <ul className="mt-5 space-y-3 text-ink-2">
          {m.limits.map((l) => (
            <li key={l} className="flex gap-3 leading-relaxed">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
              {l}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{m.dataTitle}</h2>
        <ul className="mt-5 space-y-3 leading-relaxed text-ink-2">
          {m.data.map((d) => (
            <li key={d.link.href}>
              {d.text}{" "}
              <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href={d.link.href}>
                {d.link.label}
              </a>
            </li>
          ))}
        </ul>
        <Link href="/" className="mt-10 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">
          {m.openMap}
        </Link>
      </section>
    </article>
  );
}
