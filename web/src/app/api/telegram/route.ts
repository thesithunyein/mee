import { placeLabel } from "@/lib/types";
import {
  alertsConfigured, chatLang, esc, findAreas, follow, followedBy, levelText, loadData, placeName, send,
  redisPipeline, setChatLang, statusText, tg, unfollow, type BotLang,
} from "@/lib/alerts";

type From = { language_code?: string };
type Update = {
  message?: { chat: { id: number }; from?: From; text?: string };
  callback_query?: { id: string; data?: string; from?: From; message?: { chat: { id: number }; message_id: number } };
};

const T = {
  en: {
    help: [
      "Hi, this is <b>Mee</b>. I keep an eye on NASA fire data for every township in Myanmar.",
      "",
      "Send me a township or state name, like <i>Hakha</i>, and I'll tell you how this week compares with a usual week.",
      "Tap <b>Follow</b> and I'll message you when fires there pick up, and again when they calm down.",
      "",
      "/list  places you follow",
      "/stop  stop all alerts",
      "/burmese  မြန်မာဘာသာ",
    ].join("\n"),
    noneFollowed: "You're not following any place yet. Send me a township name to start.",
    youFollow: "<b>Places you follow</b>",
    unfollowX: (n: string) => `Unfollow ${n}`,
    stopped: "Done, no more alerts. Send a township name any time to start again.",
    noMatch: "I couldn't find that. Check the spelling, or try the state name.",
    which: "Which one?",
    gone: "I can't find that place in the data any more.",
    follow: "Follow",
    unfollow: "Unfollow",
    following: (n: string) => `You're following <b>${n}</b>. I'll message you when fires there change.`,
    followingShort: (n: string) => `Following ${n}`,
    unfollowed: (n: string) => `You've stopped following <b>${n}</b>.`,
    unfollowedShort: (n: string) => `Unfollowed ${n}`,
    langSet: "OK, I'll reply in English.",
  },
  my: {
    help: [
      "မင်္ဂလာပါ၊ <b>Mee</b> ပါ။ မြန်မာပြည် မြို့နယ်တိုင်းရဲ့ NASA မီးဒေတာကို စောင့်ကြည့်ပေးပါတယ်။",
      "",
      "မြို့နယ် ဒါမှမဟုတ် ပြည်နယ်/တိုင်း နာမည်ကို English နဲ့ ပို့ပါ (ဥပမာ <i>Hakha</i>)။ ဒီအပတ် ပုံမှန်နဲ့ ဘယ်လိုလဲ ပြောပြပါမယ်။",
      "<b>စောင့်ကြည့်မယ်</b> ကိုနှိပ်ရင် အဲဒီမှာ မီးများလာတဲ့အခါနဲ့ ပြန်လျော့သွားတဲ့အခါ စာပို့ပေးပါမယ်။",
      "",
      "/list  စောင့်ကြည့်နေတဲ့ နေရာတွေ",
      "/stop  အသိပေးချက် အားလုံး ရပ်ရန်",
      "/english  English",
    ].join("\n"),
    noneFollowed: "စောင့်ကြည့်နေတဲ့ နေရာ မရှိသေးပါ။ စဖို့ မြို့နယ်နာမည် ပို့ပါ။",
    youFollow: "<b>စောင့်ကြည့်နေတဲ့ နေရာတွေ</b>",
    unfollowX: (n: string) => `${n} ကို မစောင့်ကြည့်တော့ဘူး`,
    stopped: "အသိပေးချက် အားလုံး ရပ်လိုက်ပါပြီ။ ပြန်စချင်ရင် မြို့နယ်နာမည် ပို့ပါ။",
    noMatch: "ရှာမတွေ့ပါ။ စာလုံးပေါင်း စစ်ကြည့်ပါ၊ ဒါမှမဟုတ် ပြည်နယ်/တိုင်း နာမည်နဲ့ ရှာပါ။",
    which: "ဘယ်နေရာကို ဆိုလိုတာလဲ။",
    gone: "အဲဒီနေရာ ဒေတာထဲမှာ မရှိတော့ပါ။",
    follow: "စောင့်ကြည့်မယ်",
    unfollow: "မစောင့်ကြည့်တော့ဘူး",
    following: (n: string) => `<b>${n}</b> ကို စောင့်ကြည့်နေပါပြီ။ မီးအခြေအနေ ပြောင်းရင် စာပို့ပေးပါမယ်။`,
    followingShort: (n: string) => `${n} ကို စောင့်ကြည့်နေပါပြီ`,
    unfollowed: (n: string) => `<b>${n}</b> ကို မစောင့်ကြည့်တော့ပါ။`,
    unfollowedShort: (n: string) => `${n} ကို မစောင့်ကြည့်တော့ပါ`,
    langSet: "ဟုတ်ကဲ့၊ မြန်မာလို ပြန်ဖြေပါမယ်။",
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
    // Forget this chat entirely: follows (above), its follow list and its language.
    await redisPipeline([["DEL", `chat:${chatId}`], ["DEL", `lang:${chatId}`]]);
    return send(chatId, s.stopped);
  }

  if (text.startsWith("/")) return send(chatId, s.help);

  const found = findAreas(areas, text);
  if (!found.length) return send(chatId, s.noMatch);
  if (found.length === 1) return showArea(chatId, found[0].area_id, origin, lang, { areas, meta });
  return send(chatId, s.which,
    found.map((a) => [{ text: a.level === "township" && a.state ? `${placeLabel(a.name)}, ${placeLabel(a.state)}` : placeLabel(a.name), callback_data: `s:${a.area_id}` }]));
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
