"use client";

import Link from "next/link";
import { MeeMark } from "@/components/Logo";
import { useLang } from "@/lib/i18n";

export function SiteHeader() {
  const { t, lang, setLang } = useLang();
  const link = "rounded-full px-2.5 py-1.5 text-ink-2 hover:bg-cell hover:text-ink sm:px-3";
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Mee home">
          <MeeMark size={26} />
          <span className="text-lg font-semibold tracking-tight">Mee</span>
          <span className="hidden font-my text-base leading-none text-ink-2 min-[420px]:inline">မီး</span>
        </Link>
        <div className="flex items-center gap-0.5 whitespace-nowrap text-sm">
          <Link href="/" className={`hidden sm:inline-block ${link}`}>{t.nav.map}</Link>
          <Link href="/area/MMR" className={link}>{t.nav.myanmar}</Link>
          <Link href="/method" className={`hidden min-[400px]:inline-block ${link}`}>{t.nav.how}</Link>
          <div className="ml-1 flex rounded-full border border-line bg-white p-0.5" role="group" aria-label="Language">
            {(["my", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${lang === l ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
              >
                {l === "my" ? "မြန်မာ" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-2 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <MeeMark size={18} />
          <span>{t.footer.credit}</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-ink-3">
          <Link href="/#faq" className="hover:text-ink">{t.footer.questions}</Link>
          <a href="https://github.com/thesithunyein/mee" className="hover:text-ink">{t.footer.source}</a>
          <span>{t.footer.notNasa}</span>
        </div>
      </div>
    </footer>
  );
}
