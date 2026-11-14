import {
  alertsConfigured, esc, findAreas, follow, followedBy, LEVEL_TEXT, loadData, placeName, send, statusText, tg, unfollow,
} from "@/lib/alerts";

type Update = {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number } };
};

const HELP = [
  "<b>Mee</b> watches NASA satellite fire data for every township in Myanmar.",
  "",
  "Send a township or state name to see this week's fire level.",
  "Tap <b>Follow</b> and Mee will message you when fires there go above normal, and again when they settle.",
  "",
  "/list  places you follow",
  "/stop  stop all alerts",
].join("\n");

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (!alertsConfigured()) return new Response("not configured", { status: 503 });

  const u = (await req.json()) as Update;
  const origin = new URL(req.url).origin;

  try {
    if (u.callback_query) await onButton(u.callback_query, origin);
    else if (u.message?.text) await onText(u.message.chat.id, u.message.text.trim(), origin);
  } catch (e) {
    console.error("telegram update failed", e);
  }
  // Always 200 so Telegram does not retry the same update forever.
  return Response.json({ ok: true });
}

async function onText(chatId: number, text: string, origin: string) {
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  if (cmd === "/start" || cmd === "/help") return send(chatId, HELP);

  const { areas, meta } = await loadData(origin);

  if (cmd === "/list") {
    const ids = await followedBy(chatId);
    if (!ids.length) return send(chatId, "You don't follow any place yet. Send a township name to start.");
    const lines = ids
      .map((id) => areas.find((a) => a.area_id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => `${LEVEL_TEXT[a.status]}  ${placeName(a)}`);
    return send(chatId, ["<b>You follow</b>", ...lines].join("\n"),
      ids.map((id) => {
        const a = areas.find((x) => x.area_id === id);
        return [{ text: `Unfollow ${a?.name ?? id}`, callback_data: `u:${id}` }];
      }));
  }

  if (cmd === "/stop") {
    const ids = await followedBy(chatId);
    for (const id of ids) await unfollow(chatId, id);
    return send(chatId, "All alerts stopped. Send a township name any time to follow again.");
  }

  if (text.startsWith("/")) return send(chatId, HELP);

  const found = findAreas(areas, text);
  if (!found.length) return send(chatId, "No match. Check the spelling, or try the state name.");
  if (found.length === 1) return showArea(chatId, found[0].area_id, origin, { areas, meta });
  return send(chatId, "Which one?",
    found.map((a) => [{ text: a.level === "township" && a.state ? `${a.name}, ${a.state}` : a.name, callback_data: `s:${a.area_id}` }]));
}

async function showArea(
  chatId: number, areaId: string, origin: string,
  data?: Awaited<ReturnType<typeof loadData>>,
) {
  const { areas, meta } = data ?? (await loadData(origin));
  const a = areas.find((x) => x.area_id === areaId);
  if (!a) return send(chatId, "That place is no longer in the data.");
  const following = (await followedBy(chatId)).includes(areaId);
  return send(chatId, statusText(a, meta, origin), [[
    following
      ? { text: "Unfollow", callback_data: `u:${areaId}` }
      : { text: "Follow: alert me", callback_data: `f:${areaId}` },
  ]]);
}

async function onButton(q: NonNullable<Update["callback_query"]>, origin: string) {
  const chatId = q.message?.chat.id;
  const [kind, ...rest] = (q.data ?? "").split(":");
  const areaId = rest.join(":");
  if (!chatId || !areaId) return tg("answerCallbackQuery", { callback_query_id: q.id });

  if (kind === "s") {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    return showArea(chatId, areaId, origin);
  }

  const { areas } = await loadData(origin);
  const a = areas.find((x) => x.area_id === areaId);
  const name = esc(a?.name ?? "this place");

  if (kind === "f") {
    await follow(chatId, areaId);
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: `Following ${name}` });
    return send(chatId, `Following <b>${name}</b>. You'll get a message when its fire level changes.`,
      [[{ text: "Unfollow", callback_data: `u:${areaId}` }]]);
  }
  if (kind === "u") {
    await unfollow(chatId, areaId);
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: `Unfollowed ${name}` });
    return send(chatId, `Unfollowed <b>${name}</b>.`);
  }
  return tg("answerCallbackQuery", { callback_query_id: q.id });
}
