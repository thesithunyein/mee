// "Fire near me": a chat shares a location and a radius; an hourly job checks the newest
// NASA FIRMS VIIRS detections (NOAA-20, NOAA-21) and messages the chat about new fires in range.
// Kept separate from the township alerts so a failure here never touches them.
//
// Env: FIRMS_MAP_KEY (free NASA FIRMS map key). Without it the hourly job does nothing.
//
// Redis keys
//   near:<chat>           JSON {lat, lon, r, since}   the chat's location and radius (km)
//   near_chats            set of chats with a nearby-fire alert
//   near_pending:<chat>   "lat,lon" while the chat picks a radius (expires after 1 hour)
//   near_seen:<chat>      set of detection ids already sent (expires after 3 days)
import type { BotLang } from "@/lib/alerts";
import { redis, redisPipeline } from "@/lib/alerts";

export type NearSub = { lat: number; lon: number; r: number; since: number };
export type Fire = { id: string; lat: number; lon: number; at: number; sat: string; frp: number };

export const RADII = [10, 25, 50] as const;

// Myanmar plus about 50 km around it, so fires just over a border still count.
export const BOX = { w: 91.6, s: 9.0, e: 101.7, n: 29.1 };
export const inBox = (lat: number, lon: number) => lat >= BOX.s && lat <= BOX.n && lon >= BOX.w && lon <= BOX.e;

// ---------- storage ----------
export async function getNear(chat: number | string): Promise<NearSub | null> {
  const raw = await redis<string | null>(["GET", `near:${chat}`]);
  return raw ? (JSON.parse(raw) as NearSub) : null;
}

export async function setNear(chat: number | string, sub: NearSub) {
  await redisPipeline([
    ["SET", `near:${chat}`, JSON.stringify(sub)],
    ["SADD", "near_chats", chat],
    ["DEL", `near_pending:${chat}`],
  ]);
}

export async function delNear(chat: number | string) {
  await redisPipeline([
    ["DEL", `near:${chat}`],
    ["SREM", "near_chats", chat],
    ["DEL", `near_pending:${chat}`],
    ["DEL", `near_seen:${chat}`],
  ]);
}

export const setPending = (chat: number, lat: number, lon: number) =>
  redis(["SET", `near_pending:${chat}`, `${lat.toFixed(4)},${lon.toFixed(4)}`, "EX", 3600]);

export async function getPending(chat: number): Promise<{ lat: number; lon: number } | null> {
  const raw = await redis<string | null>(["GET", `near_pending:${chat}`]);
  if (!raw) return null;
  const [lat, lon] = raw.split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// ---------- geometry ----------
const R_EARTH = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

// Compass direction from (aLat, aLon) to (bLat, bLon), as one of 8 points (0 = north, clockwise).
export function direction8(aLat: number, aLon: number, bLat: number, bLon: number) {
  const y = Math.sin(rad(bLon - aLon)) * Math.cos(rad(bLat));
  const x = Math.cos(rad(aLat)) * Math.sin(rad(bLat)) - Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLon - aLon));
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round(((deg + 360) % 360) / 45) % 8;
}

const DIR = {
  en: ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"],
  my: ["မြောက်ဘက်", "အရှေ့မြောက်ဘက်", "အရှေ့ဘက်", "အရှေ့တောင်ဘက်", "တောင်ဘက်", "အနောက်တောင်ဘက်", "အနောက်ဘက်", "အနောက်မြောက်ဘက်"],
} satisfies Record<BotLang, string[]>;

// ---------- NASA FIRMS ----------
const SOURCES = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
const SAT: Record<string, string> = { N20: "NOAA-20", N21: "NOAA-21", N: "Suomi NPP" };

// Parse a FIRMS area CSV. Keeps nominal and high confidence detections only.
export function parseFirms(csv: string): Fire[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(",");
  const col = (k: string) => head.indexOf(k);
  const iLat = col("latitude"), iLon = col("longitude"), iDate = col("acq_date"), iTime = col("acq_time");
  const iSat = col("satellite"), iConf = col("confidence"), iFrp = col("frp");
  if (iLat < 0 || iLon < 0 || iDate < 0 || iTime < 0) return [];
  const out: Fire[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const conf = (c[iConf] ?? "").trim().toLowerCase();
    if (conf === "l" || conf === "low") continue;
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    const t = (c[iTime] ?? "").trim().padStart(4, "0");
    const at = Date.parse(`${c[iDate]}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(at)) continue;
    const sat = SAT[(c[iSat] ?? "").trim()] ?? (c[iSat] ?? "").trim();
    out.push({ id: `${lat.toFixed(4)},${lon.toFixed(4)},${at}`, lat, lon, at, sat, frp: Number(c[iFrp]) || 0 });
  }
  return out;
}

export async function fetchFires(key: string): Promise<Fire[]> {
  const box = `${BOX.w},${BOX.s},${BOX.e},${BOX.n}`;
  const all: Fire[] = [];
  for (const src of SOURCES) {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${src}/${box}/2`, { cache: "no-store" });
    if (!r.ok) throw new Error(`FIRMS ${src}: HTTP ${r.status}`);
    const text = await r.text();
    if (!text.startsWith("latitude")) throw new Error(`FIRMS ${src}: ${text.slice(0, 120)}`);
    all.push(...parseFirms(text));
  }
  return all;
}

// Fires within the chat's radius, detected after it subscribed and within the last 12 hours.
export function firesFor(sub: NearSub, fires: Fire[], now: number) {
  const after = Math.max(sub.since - 3 * 3600_000, now - 12 * 3600_000);
  return fires
    .filter((f) => f.at >= after)
    .map((f) => ({ ...f, km: distanceKm(sub.lat, sub.lon, f.lat, f.lon) }))
    .filter((f) => f.km <= sub.r)
    .sort((a, b) => a.km - b.km);
}

// ---------- message ----------
const mmTime = (at: number) => {
  const d = new Date(at + 6.5 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

export function nearText(
  lang: BotLang, sub: NearSub, hits: (Fire & { km: number })[], townshipLink: string | null,
) {
  const f = hits[0];
  const km = f.km < 1 ? "<1" : String(Math.round(f.km));
  const dir = DIR[lang][direction8(sub.lat, sub.lon, f.lat, f.lon)];
  const map = `https://www.google.com/maps?q=${f.lat.toFixed(4)},${f.lon.toFixed(4)}`;
  const n = hits.length;
  if (lang === "my") {
    return [
      "🔥 <b>သင့်အနီးမှာ မီး</b>",
      `သင့်ဆီကနေ ${sub.r} ကီလိုမီတာအတွင်း မီးပွိုင့်အသစ် ${n} ခု တွေ့ပါတယ်။`,
      `အနီးဆုံးက ${dir} ${km} ကီလိုမီတာမှာပါ။ ${mmTime(f.at)} (မြန်မာစံတော်ချိန်) မှာ ${f.sat} က မြင်ခဲ့ပါတယ်။`,
      `<a href="${map}">မြေပုံမှာ ကြည့်ရန်</a>${townshipLink ? `\n<a href="${townshipLink}">မြို့နယ် စာမျက်နှာ</a>` : ""}`,
    ].join("\n");
  }
  return [
    "🔥 <b>Fire near you</b>",
    `${n} new fire ${n === 1 ? "detection" : "detections"} within ${sub.r} km of you.`,
    `The nearest is ${km} km ${dir}, seen by ${f.sat} at ${mmTime(f.at)} Myanmar time.`,
    `<a href="${map}">Open the map</a>${townshipLink ? `\n<a href="${townshipLink}">Township page</a>` : ""}`,
  ].join("\n");
}

export const NEAR_T = {
  en: {
    ask: "Tap the button below to share your location. I'll message you when a satellite sees a new fire near you.",
    share: "📍 Share my location",
    outside: "That location is outside Myanmar. Nearby fire alerts only work in Myanmar for now.",
    radius: "How far around you should I watch?",
    expired: "Please share your location again with /near.",
    on: (r: number) =>
      `Done. I'll check NASA data every hour and message you about new fires within <b>${r} km</b> of you.\n\nSatellites can miss small fires or fires under cloud, and sometimes see hot spots that aren't fires. Check before you act.\n\n/stopnear  stop nearby fire alerts`,
    off: "Nearby fire alerts are off.",
    none: "You don't have nearby fire alerts. Send /near to start.",
    listLine: (r: number) => `📍 Fires within ${r} km of your location`,
    stopBtn: "Stop nearby alerts",
    km: (r: number) => `${r} km`,
  },
  my: {
    ask: "အောက်က ခလုတ်ကို နှိပ်ပြီး သင့်တည်နေရာကို ပို့ပါ။ သင့်အနီးမှာ ဂြိုဟ်တုက မီးအသစ် မြင်ရင် စာပို့ပေးပါမယ်။",
    share: "📍 တည်နေရာ ပို့မယ်",
    outside: "ဒီတည်နေရာက မြန်မာပြည် အပြင်မှာပါ။ အနီးနားမီး အသိပေးချက်က လောလောဆယ် မြန်မာပြည်အတွက်ပဲ ရပါသေးတယ်။",
    radius: "သင့်ပတ်ဝန်းကျင် ဘယ်လောက်အကွာအဝေးအထိ စောင့်ကြည့်ပေးရမလဲ။",
    expired: "/near နဲ့ တည်နေရာကို ထပ်ပို့ပေးပါ။",
    on: (r: number) =>
      `ပြီးပါပြီ။ NASA ဒေတာကို တစ်နာရီတစ်ခါ စစ်ပြီး သင့်ဆီကနေ <b>${r} ကီလိုမီတာ</b> အတွင်း မီးအသစ် တွေ့ရင် စာပို့ပေးပါမယ်။\n\nဂြိုဟ်တုက မီးငယ်တွေ၊ တိမ်အောက်က မီးတွေကို လွတ်သွားနိုင်ပြီး မီးမဟုတ်တဲ့ ပူတဲ့နေရာတွေကိုလည်း တခါတလေ မြင်တတ်ပါတယ်။ မလုပ်ခင် စစ်ဆေးပါ။\n\n/stopnear  အနီးနားမီး အသိပေးချက် ရပ်ရန်`,
    off: "အနီးနားမီး အသိပေးချက်ကို ပိတ်လိုက်ပါပြီ။",
    none: "အနီးနားမီး အသိပေးချက် မဖွင့်ထားပါ။ စဖို့ /near ပို့ပါ။",
    listLine: (r: number) => `📍 သင့်တည်နေရာ ${r} ကီလိုမီတာအတွင်း မီးများ`,
    stopBtn: "အနီးနားမီး အသိပေးချက် ရပ်မယ်",
    km: (r: number) => `${r} ကီလိုမီတာ`,
  },
} satisfies Record<BotLang, unknown>;
