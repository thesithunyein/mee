import {
  alertsConfigured, areaUrl, chatLang, followedBy, levelText, loadData, placeName, redis, redisPipeline, send,
} from "@/lib/alerts";
import { unfollow } from "@/lib/alerts";
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
    const fires = Math.round(a.r7).toLocaleString("en-US");
    const normal = Math.round(a.p75).toLocaleString("en-US");
    const chats = await redis<string[]>(["SMEMBERS", `subs:${a.area_id}`]);
    for (const chat of chats) {
      const lang = await chatLang(chat);
      const text = (lang === "my"
        ? [
            up ? `<b>မီးသတိပေးချက်: ${placeName(a)}</b>` : `<b>${placeName(a)}: မီးလျော့သွားပါပြီ</b>`,
            levelText(a.status, lang),
            up
              ? `နောက်ဆုံး ၇ ရက်မှာ မီးပွိုင့် ${fires} ခု။ ဒီအချိန်မှာ ပုံမှန်ဆို ${normal} ခုထိပဲ ရှိတတ်ပါတယ်။`
              : "နောက်ဆုံး အသိပေးချက်ထက် မီးလောင်မှု လျော့သွားပါပြီ။",
            areaUrl(origin, a),
          ]
        : [
            up ? `<b>Fire alert: ${placeName(a)}</b>` : `<b>${placeName(a)}: fires have eased</b>`,
            levelText(a.status, lang),
            up
              ? `${fires} fires in the last 7 days. A usual week at this time has up to ${normal}.`
              : "There are fewer fires than at the last alert.",
            areaUrl(origin, a),
          ]).join("\n");
      const r = await send(chat, text);
      if (r.ok) sent++;
      // 403: user blocked the bot. Drop the subscription.
      else if (r.error_code === 403) {
        for (const id of await followedBy(Number(chat))) await unfollow(Number(chat), id);
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
          `<b>Townships with much more fire than usual</b> (7 days to ${meta.last_date})`,
          ...high.slice(0, 15).map((a) => `🔴 ${placeName(a)}: ${Math.round(a.r7)} fires`),
          high.length > 15 ? `and ${high.length - 15} more` : "",
          origin,
        ].filter(Boolean).join("\n")
      : `No township has much more fire than usual this week (data to ${meta.last_date}).\n${origin}`;
    channel = (await send(channelId, text)).ok;
  }

  await redis(["SET", "alerts:last_date", meta.last_date]);
  return Response.json({ last_date: meta.last_date, followed: ids.length, sent, channel });
}
