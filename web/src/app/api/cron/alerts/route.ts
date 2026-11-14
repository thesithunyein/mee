import {
  alertsConfigured, areaUrl, LEVEL_TEXT, loadData, placeName, redis, redisPipeline, send,
} from "@/lib/alerts";
import type { Status } from "@/lib/types";

// Runs daily (vercel.json). Messages followers when an area's fire level changes,
// and posts a short summary to the public channel if TELEGRAM_CHANNEL_ID is set.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("forbidden", { status: 403 });
  }
  if (!alertsConfigured()) return new Response("not configured", { status: 503 });

  const origin = new URL(req.url).origin;
  const { areas, meta } = await loadData(origin);
  const byId = new Map(areas.map((a) => [a.area_id, a]));

  // Only act once per data date: the site data changes when the pipeline runs.
  const lastRun = await redis<string | null>(["GET", "alerts:last_date"]);
  if (lastRun === meta.last_date && !new URL(req.url).searchParams.has("force")) {
    return Response.json({ skipped: "no new data", last_date: meta.last_date });
  }

  const ids = await redis<string[]>(["SMEMBERS", "followed_areas"]);
  const prev = (await redisPipeline(ids.map((id) => ["GET", `lvl:${id}`]))) as (Status | null)[];

  let sent = 0;
  const rank: Record<Status, number> = { normal: 0, elevated: 1, high: 2 };
  for (let i = 0; i < ids.length; i++) {
    const a = byId.get(ids[i]);
    if (!a) continue;
    const before = prev[i] ?? "normal";
    if (before === a.status) continue;
    await redis(["SET", `lvl:${a.area_id}`, a.status]);

    const up = rank[a.status] > rank[before];
    const text = [
      up ? `<b>Fire alert: ${placeName(a)}</b>` : `<b>Update: ${placeName(a)}</b>`,
      LEVEL_TEXT[a.status],
      up
        ? `${Math.round(a.r7).toLocaleString("en-US")} fires in the last 7 days. Normal for this week is up to ${Math.round(a.p75).toLocaleString("en-US")}.`
        : "Fire activity has dropped since the last update.",
      areaUrl(origin, a),
    ].join("\n");

    const chats = await redis<string[]>(["SMEMBERS", `subs:${a.area_id}`]);
    for (const chat of chats) {
      const r = await send(chat, text);
      if (r.ok) sent++;
      // 403: user blocked the bot. Drop the subscription.
      else if (r.error_code === 403) {
        await redisPipeline([["SREM", `subs:${a.area_id}`, chat], ["DEL", `chat:${chat}`]]);
      }
    }
  }

  let channel = false;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (channelId) {
    const high = areas
      .filter((a) => a.level === "township" && a.status === "high")
      .sort((a, b) => b.r7 - b.p90 - (a.r7 - a.p90));
    const text = high.length
      ? [
          `<b>Townships far above normal</b> (7 days to ${meta.last_date})`,
          ...high.slice(0, 15).map((a) => `🔴 ${placeName(a)}: ${Math.round(a.r7)} fires`),
          high.length > 15 ? `and ${high.length - 15} more` : "",
          origin,
        ].filter(Boolean).join("\n")
      : `No township is far above normal this week (data to ${meta.last_date}).\n${origin}`;
    channel = (await send(channelId, text)).ok;
  }

  await redis(["SET", "alerts:last_date", meta.last_date]);
  return Response.json({ last_date: meta.last_date, followed: ids.length, sent, channel });
}
