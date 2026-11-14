"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">{t.notFound.title}</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-2">{t.notFound.text}</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">
        {t.area.backToMap}
      </Link>
    </div>
  );
}
