"use client";

import { useLang } from "@/lib/i18n";

export default function Faq() {
  const { t } = useLang();
  return (
    <section id="faq" className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t.faqTitle}</h2>
        <p className="mt-2 max-w-xs text-ink-2">
          {t.faqMissing}{" "}
          <a href="https://github.com/thesithunyein/mee/issues" className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            {t.faqAsk}
          </a>
        </p>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {t.faq.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <span className="relative h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true">
                <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded bg-current" />
                <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
              </span>
            </summary>
            <p className="max-w-2xl pb-6 leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
