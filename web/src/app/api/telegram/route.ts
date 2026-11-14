import {
  alertsConfigured, chatLang, esc, findAreas, follow, followedBy, levelText, loadData, placeName, send,
  setChatLang, statusText, tg, unfollow, type BotLang,
} from "@/lib/alerts";

type From = { language_code?: string };
type Update = {
  message?: { chat: { id: number }; from?: From; text?: string };
  callback_query?: { id: string; data?: string; from?: From; message?: { chat: { id: number }; message_id: number } };
};

const T = {
  en: {
    help: [
      "<b>Mee</b> watches NASA satellite fire data for every township in Myanmar.",
      "",
      "Send a township or state name to see this week's fire level.",
      "Tap <b>Follow</b> and Mee will message you when fires there go above normal, and again when they settle.",
      "",
      "/list  places you follow",
      "/stop  stop all alerts",
      "/burmese  မြန်မာဘာသာ",
    ].join("\n"),
    noneFollowed: "You don't follow any place yet. Send a township name to start.",
    youFollow: "<b>You follow</b>",
    unfollowX: (n: string) => `Unfollow ${n}`,
    stopped: "All alerts stopped. Send a township name any time to follow again.",
    noMatch: "No match. Check the spelling, or try the state name.",
    which: "Which one?",
    gone: "That place is no longer in the data.",
    follow: "Follow: alert me",
    unfollow: "Unfollow",
    following: (n: string) => `Following <b>${n}</b>. You'll get a message when its fire level changes.`,
    followingShort: (n: string) => `Following ${n}`,
    unfollowed: (n: string) => `Unfollowed <b>${n}</b>.`,
    unfollowedShort: (n: string) => `Unfollowed ${n}`,
    langSet: "Language set to English.",
  },
  my: {
    help: [
      "<b>Mee</b> သည် မြန်မာနိုင်ငံ မြို့နယ်တိုင်းအတွက် NASA ဂြိုဟ်တု မီးဒေတာကို စောင့်ကြည့်သည်။",
      "",
      "ဒီအပတ် မီးအခြေအနေ သိရန် မြို့နယ် သို့မဟုတ် ပြည်နယ်/တိုင်း အမည်ကို (English ဖြင့်) ပို့ပါ။",
      "<b>Follow</b> ကိုနှိပ်ပါက ထိုနေရာတွင် မီး ပုံမှန်ထက် များလာသည့်အခါနှင့် ပြန်ကျသွားသည့်အခါ Mee က သတိပေးပါမည်။",
      "",
      "/list  စောင့်ကြည့်နေသော နေရာများ",
      "/stop  သတိပေးချက် အားလုံး ရပ်ရန်",
      "/english  English",
    ].join("\n"),
    noneFollowed: "စောင့်ကြည့်နေသော နေရာ မရှိသေးပါ။ စတင်ရန် မြို့နယ်အမည် ပို့ပါ။",
    youFollow: "<b>စောင့်ကြည့်နေသော နေရာများ</b>",
    unfollowX: (n: string) => `${n} ကို ရပ်ရန်`,
    stopped: "သတိပေးချက် အားလုံး ရပ်လိုက်ပြီ။ ပြန်စောင့်ကြည့်ရန် မြို့နယ်အမည် ပို့ပါ။",
    noMatch: "မတွေ့ပါ။ စာလုံးပေါင်း စစ်ပါ သို့မဟုတ် ပြည်နယ်/တိုင်း အမည်ဖြင့် ရှာပါ။",
    which: "ဘယ်နေရာလဲ။",
    gone: "ထိုနေရာ ဒေတာတွင် မရှိတော့ပါ။",
    follow: "စောင့်ကြည့်မည် (သတိပေးရန်)",
    unfollow: "ရပ်မည်",
    following: (n: string) => `<b>${n}</b> ကို စောင့်ကြည့်နေပြီ။ မီးအခြေအနေ ပြောင်းလဲသည့်အခါ သတိပေးပါမည်။`,
    followingShort: (n: string) => `${n} ကို စောင့်ကြည့်နေပြီ`,
    unfollowed: (n: string) => `<b>${n}</b> ကို ရပ်လိုက်ပြီ။`,
    unfollowedShort: (n: string) => `${n} ကို ရပ်လိုက်ပြီ`,
    langSet: "ဘာသာစကားကို မြန်မာ သို့ ပြောင်းလိုက်ပြီ။",
  },
} satisfies Record<BotLang, unknown>;

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (!alertsConfigured()) return new Response("not configured", { status: 503 });

  const u = (await req.json()) as Update;
  const origin = new URL(req.url).origin;

  try {
    if (u.callback_query) await onButton(u.callback_query, origin);
    else if (u.message?.text) await onText(u.message.chat.id, u.message.text.trim(), u.message.from, origin);
  } catch (e) {
    console.error("telegram update failed", e);
  }
  // Always 200 so Telegram does not retry the same update forever.
  return Response.json({ ok: true });
}

async function onText(chatId: number, text: string, from: From | undefined, origin: string) {
  const cmd = text.split(/[\s@]/)[0].toLowerCase();

  if (cmd === "/burmese" || cmd === "/my" || cmd === "/english" || cmd === "/en") {
    const l: BotLang = cmd === "/burmese" || cmd === "/my" ? "my" : "en";
    await setChatLang(chatId, l);
    return send(chatId, `${T[l].langSet}\n\n${T[l].help}`);
  }

  const lang = await chatLang(chatId, from?.language_code);
  const s = T[lang];
  if (cmd === "/start" || cmd === "/help") return send(chatId, s.help);

  const { areas, meta } = await loadData(origin);

  if (cmd === "/list") {
    const ids = await followedBy(chatId);
    if (!ids.length) return send(chatId, s.noneFollowed);
    const lines = ids
      .map((id) => areas.find((a) => a.area_id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => `${levelText(a.status, lang)}  ${placeName(a)}`);
    return send(chatId, [s.youFollow, ...lines].join("\n"),
      ids.map((id) => {
        const a = areas.find((x) => x.area_id === id);
        return [{ text: s.unfollowX(a?.name ?? id), callback_data: `u:${id}` }];
      }));
  }

  if (cmd === "/stop") {
    const ids = await followedBy(chatId);
    for (const id of ids) await unfollow(chatId, id);
    return send(chatId, s.stopped);
  }

  if (text.startsWith("/")) return send(chatId, s.help);

  const found = findAreas(areas, text);
  if (!found.length) return send(chatId, s.noMatch);
  if (found.length === 1) return showArea(chatId, found[0].area_id, origin, lang, { areas, meta });
  return send(chatId, s.which,
    found.map((a) => [{ text: a.level === "township" && a.state ? `${a.name}, ${a.state}` : a.name, callback_data: `s:${a.area_id}` }]));
}

async function showArea(
  chatId: number, areaId: string, origin: string, lang: BotLang,
  data?: Awaited<ReturnType<typeof loadData>>,
) {
  const s = T[lang];
  const { areas, meta } = data ?? (await loadData(origin));
  const a = areas.find((x) => x.area_id === areaId);
  if (!a) return send(chatId, s.gone);
  const following = (await followedBy(chatId)).includes(areaId);
  return send(chatId, statusText(a, meta, origin, lang), [[
    following ? { text: s.unfollow, callback_data: `u:${areaId}` } : { text: s.follow, callback_data: `f:${areaId}` },
  ]]);
}

async function onButton(q: NonNullable<Update["callback_query"]>, origin: string) {
  const chatId = q.message?.chat.id;
  const [kind, ...rest] = (q.data ?? "").split(":");
  const areaId = rest.join(":");
  if (!chatId || !areaId) return tg("answerCallbackQuery", { callback_query_id: q.id });
  const lang = await chatLang(chatId, q.from?.language_code);
  const s = T[lang];

  if (kind === "s") {
    await tg("answerCallbackQuery", { callback_query_id: q.id });
    return showArea(chatId, areaId, origin, lang);
  }

  const { areas } = await loadData(origin);
  const a = areas.find((x) => x.area_id === areaId);
  const name = esc(a?.name ?? "—");

  if (kind === "f") {
    await follow(chatId, areaId);
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: s.followingShort(a?.name ?? "") });
    return send(chatId, s.following(name), [[{ text: s.unfollow, callback_data: `u:${areaId}` }]]);
  }
  if (kind === "u") {
    await unfollow(chatId, areaId);
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: s.unfollowedShort(a?.name ?? "") });
    return send(chatId, s.unfollowed(name));
  }
  return tg("answerCallbackQuery", { callback_query_id: q.id });
}
