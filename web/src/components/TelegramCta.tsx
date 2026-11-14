"use client";

import { SendIcon } from "@/components/Icons";
import { useLang } from "@/lib/i18n";

// Shown only when the bot exists (NEXT_PUBLIC_TELEGRAM_BOT = bot username, without @).
const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT;

export default function TelegramCta({ place }: { place?: string }) {
  const { t } = useLang();
  if (!BOT) return null;
  return (
    <a
      href={`https://t.me/${BOT}`}
      className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium hover:border-ink-3"
    >
      <SendIcon className="h-4 w-4 shrink-0 text-ember" />
      {place ? t.telegram.place(place) : t.telegram.all}
    </a>
  );
}
