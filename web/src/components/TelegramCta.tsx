import { SendIcon } from "@/components/Icons";

// Shown only when the bot exists (NEXT_PUBLIC_TELEGRAM_BOT = bot username, without @).
const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT;

export default function TelegramCta({ place }: { place?: string }) {
  if (!BOT) return null;
  return (
    <a
      href={`https://t.me/${BOT}`}
      className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium hover:border-ink-3"
    >
      <SendIcon className="h-4 w-4 text-ember" />
      {place ? `Get alerts for ${place}` : "Get fire alerts on Telegram"}
    </a>
  );
}
