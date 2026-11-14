import { alertsConfigured, tg } from "@/lib/alerts";

// One-time: open /api/telegram/setup?key=<CRON_SECRET> after deploying to connect the bot.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!process.env.CRON_SECRET || url.searchParams.get("key") !== process.env.CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (!alertsConfigured()) {
    return Response.json({
      ok: false,
      missing: {
        TELEGRAM_BOT_TOKEN: !process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_WEBHOOK_SECRET: !process.env.TELEGRAM_WEBHOOK_SECRET,
        redis: !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
      },
    });
  }
  const hook = await tg("setWebhook", {
    url: `${url.origin}/api/telegram`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  const cmds = await tg("setMyCommands", {
    commands: [
      { command: "start", description: "How it works" },
      { command: "list", description: "Places you follow" },
      { command: "stop", description: "Stop all alerts" },
      { command: "burmese", description: "မြန်မာဘာသာ" },
      { command: "english", description: "English" },
    ],
  });
  const desc = await tg("setMyDescription", {
    description: "Free fire alerts for every township in Myanmar, from NASA satellite data. Send a township name to start. မြို့နယ်နာမည် ပို့ပြီး စလိုက်ပါ။",
  });
  const me = await tg("getMe", {});
  return Response.json({ webhook: hook, commands: cmds.ok, description: desc.ok, bot: me.result });
}
