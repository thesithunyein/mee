import { alertsConfigured, chatLang, redis, redisPipeline, send } from "@/lib/alerts";
import { delNear, fetchFires, firesFor, nearText, type NearSub } from "@/lib/near";
import { townshipAt } from "@/lib/pip";

// Runs every hour (vercel.json). For each chat with a nearby-fire alert, sends one message
// about new NOAA-20 / NOAA-21 detections within its radius. Each detection is sent once.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("forbidden", { status: 403 });
  }
  if (!alertsConfigured()) return new Response("not configured", { status: 503 });
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return Response.json({ skipped: "FIRMS_MAP_KEY not set" });

  const chats = await redis<string[]>(["SMEMBERS", "near_chats"]);
  if (!chats.length) return Response.json({ chats: 0 });

  const fires = await fetchFires(key);
  const raw = (await redisPipeline(chats.map((c) => ["GET", `near:${c}`]))) as (string | null)[];
  const now = Date.now();
  const origin = new URL(req.url).origin;
  let townships: Parameters<typeof townshipAt>[0] | null = null;

  let sent = 0;
  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    if (!raw[i]) {
      await redis(["SREM", "near_chats", chat]);
      continue;
    }
    const sub = JSON.parse(raw[i] as string) as NearSub;
    const hits = firesFor(sub, fires, now);
    if (!hits.length) continue;

    // Drop detections this chat has already been told about.
    const seen = (await redis<number[]>(["SMISMEMBER", `near_seen:${chat}`, ...hits.map((h) => h.id)])) ?? [];
    const fresh = hits.filter((_, k) => !seen[k]);
    if (!fresh.length) continue;

    // Township page for the nearest fire, when it falls inside a Myanmar township.
    if (!townships) townships = await fetch(`${origin}/data/townships.geojson`).then((r) => r.json()).catch(() => null);
    const t = townships ? townshipAt(townships, fresh[0].lon, fresh[0].lat) : null;
    const link = t ? `${origin}/area/${encodeURIComponent(t.area_id)}` : null;

    const lang = await chatLang(chat);
    const r = await send(chat, nearText(lang, sub, fresh, link));
    if (r.ok) {
      sent++;
      await redisPipeline([
        ["SADD", `near_seen:${chat}`, ...fresh.map((h) => h.id)],
        ["EXPIRE", `near_seen:${chat}`, 3 * 24 * 3600],
      ]);
    } else if (r.error_code === 403) {
      // The user blocked the bot: forget the alert.
      await delNear(chat);
    }
  }
  return Response.json({ chats: chats.length, fires: fires.length, sent });
}
