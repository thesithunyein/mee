// Server-only helpers for the Telegram bot and the daily alert job.
// Storage is Upstash Redis over its REST API (no SDK). Env vars:
//   TELEGRAM_BOT_TOKEN        from @BotFather
//   TELEGRAM_WEBHOOK_SECRET   any random string; Telegram echoes it on every update
//   CRON_SECRET               protects the cron + setup routes (Vercel sends it to crons)
//   KV_REST_API_URL / KV_REST_API_TOKEN   (or UPSTASH_REDIS_REST_URL / _TOKEN)
//   TELEGRAM_CHANNEL_ID       optional: public channel for a daily summary, e.g. @mee_fire
import type { AreaSummary, Meta, Status } from "@/lib/types";
import { fmtDate } from "@/lib/types";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const alertsConfigured = () => Boolean(TOKEN && REDIS_URL && REDIS_TOKEN);

// ---------- Telegram ----------
export type InlineButton = { text: string; callback_data?: string; url?: string };

export async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await r.json()) as { ok: boolean; result?: unknown; description?: string; error_code?: number };
}

export function send(chatId: number | string, text: string, buttons?: InlineButton[][]) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

// ---------- Redis (Upstash REST) ----------
type Cmd = (string | number)[];

export async function redis<T = unknown>(cmd: Cmd): Promise<T> {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: T; error?: string };
  if (j.error) throw new Error(`redis: ${j.error}`);
  return j.result as T;
}

export async function redisPipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (!cmds.length) return [];
  const r = await fetch(`${REDIS_URL.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: unknown; error?: string }[];
  return j.map((x) => x.result);
}

// Keys
//   subs:<area_id>      set of chat ids following an area
//   chat:<chat_id>      set of area ids a chat follows
//   followed_areas      set of area ids with at least one follower
//   lvl:<area_id>       last status level the alert job saw for the area
export async function follow(chatId: number, areaId: string) {
  await redisPipeline([
    ["SADD", `subs:${areaId}`, chatId],
    ["SADD", `chat:${chatId}`, areaId],
    ["SADD", "followed_areas", areaId],
  ]);
}

export async function unfollow(chatId: number, areaId: string) {
  await redisPipeline([
    ["SREM", `subs:${areaId}`, chatId],
    ["SREM", `chat:${chatId}`, areaId],
  ]);
  const left = await redis<number>(["SCARD", `subs:${areaId}`]);
  if (!left) await redis(["SREM", "followed_areas", areaId]);
}

export const followedBy = (chatId: number) => redis<string[]>(["SMEMBERS", `chat:${chatId}`]);

// ---------- Site data ----------
export async function loadData(origin: string): Promise<{ areas: AreaSummary[]; meta: Meta }> {
  const [areas, meta] = await Promise.all([
    fetch(`${origin}/data/areas.json`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`${origin}/data/meta.json`, { cache: "no-store" }).then((r) => r.json()),
  ]);
  return { areas, meta };
}

export function findAreas(areas: AreaSummary[], q: string): AreaSummary[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const exact = areas.filter((a) => a.name.toLowerCase() === s);
  if (exact.length) return exact;
  return areas
    .filter((a) => a.name.toLowerCase().includes(s) || (a.level === "state" && a.state?.toLowerCase() === s))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(s)) - Number(!b.name.toLowerCase().startsWith(s)))
    .slice(0, 6);
}

export const LEVEL_TEXT: Record<Status, string> = {
  normal: "⚪ Normal",
  elevated: "🟠 Above normal",
  high: "🔴 Far above normal",
};

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (x: number) => Math.round(x).toLocaleString("en-US");

export function placeName(a: AreaSummary) {
  return a.level === "township" && a.state ? `${esc(a.name)}, ${esc(a.state)}` : esc(a.name);
}

export function areaUrl(origin: string, a: AreaSummary) {
  return `${origin}/area/${encodeURIComponent(a.area_id)}`;
}

export function statusText(a: AreaSummary, meta: Meta, origin: string) {
  return [
    `<b>${placeName(a)}</b>`,
    LEVEL_TEXT[a.status],
    `Last 7 days: ${n(a.r7)} fires. Normal for this week: up to ${n(a.p75)}.`,
    `<i>Data to ${fmtDate(meta.last_date)}</i>`,
    areaUrl(origin, a),
  ].join("\n");
}
