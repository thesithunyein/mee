"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/Icons";
import { MeeMark } from "@/components/Logo";
import { useLang } from "@/lib/i18n";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT;

export function SiteHeader() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const link = "rounded-full px-3 py-1.5 text-ink-2 hover:bg-cell hover:text-ink";

  // Links close the menu themselves; also close on Escape and on back/forward.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", close);
    };
  }, [open]);

  const items: { key: keyof typeof t.menu.items; href: string; external?: boolean }[] = [
    { key: "map", href: "/" },
    { key: "myanmar", href: "/area/MMR" },
    { key: "how", href: "/method" },
    { key: "faq", href: "/#faq" },
    ...(BOT ? [{ key: "alerts" as const, href: `https://t.me/${BOT}`, external: true }] : []),
  ];

  const langToggle = (
    <div className="flex rounded-full border border-line bg-white p-0.5" role="group" aria-label="Language">
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
  );

  return (
    <header className="relative border-b border-line">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Mee home">
          <MeeMark size={26} />
          <span className="text-lg font-semibold tracking-tight">Mee</span>
          <span className="font-my text-base leading-none text-ink-2">မီး</span>
        </Link>

        {/* Wide screens: links in a row */}
        <div className="hidden items-center gap-0.5 whitespace-nowrap text-sm md:flex">
          <Link href="/" className={link}>{t.nav.map}</Link>
          <Link href="/area/MMR" className={link}>{t.nav.myanmar}</Link>
          <Link href="/method" className={link}>{t.nav.how}</Link>
          <Link href="/#faq" className={link}>{t.nav.faq}</Link>
          <div className="ml-2">{langToggle}</div>
        </div>

        {/* Phones: language + menu button */}
        <div className="flex items-center gap-2 md:hidden">
          {langToggle}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? t.menu.close : t.menu.open}
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white"
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="site-menu" className="absolute inset-x-0 top-full z-40 border-b border-line bg-paper shadow-[0_24px_40px_-24px_rgba(23,33,28,0.35)] md:hidden">
          <ul className="mx-auto max-w-6xl divide-y divide-line px-5 py-2">
            {items.map(({ key, href, external }) => {
              const [title, sub] = t.menu.items[key];
              const body = (
                <>
                  <span className="block text-base font-medium">{title}</span>
                  <span className="block text-sm text-ink-2">{sub}</span>
                </>
              );
              return (
                <li key={key}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener" className="block py-3.5" onClick={() => setOpen(false)}>{body}</a>
                  ) : (
                    <Link href={href} className="block py-3.5" onClick={() => setOpen(false)}>{body}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
