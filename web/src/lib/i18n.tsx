"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Status } from "@/lib/types";

export type Lang = "en" | "my";

const MONTHS_MY = ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const en = {
  nav: { map: "Map", myanmar: "Myanmar", how: "How it works" },
  footer: { credit: "Fire data from NASA FIRMS. Maps from geoBoundaries (CC BY 4.0).", questions: "Questions", source: "Source code", notNasa: "Not affiliated with NASA" },
  status: { normal: "Normal", elevated: "Above normal", high: "Far above normal" } as Record<Status, string>,
  hero: {
    title: "Myanmar's fire seasons, day by day.",
    sub: "NASA satellite fire data for every township, in one calendar. See when fires usually come, and if this week is normal.",
    caption: "All of Myanmar. One row per year, one square per day.",
    open: "Open Myanmar",
  },
  search: {
    label: "Search a township or state",
    placeholder: "Search a township or state",
    none: "No match. Try a nearby town or the state name.",
    state: "state",
  },
  locate: {
    button: "Use my location",
    finding: "Finding your township…",
    denied: "Location is off. Allow it in your browser, or search by name.",
    outside: "You seem to be outside Myanmar. Search by name instead.",
    failed: "Couldn't get your location. Search by name instead.",
  },
  week: {
    title: "This week",
    latest: (d: string) => `Latest data: ${d}`,
    card: "Myanmar, last 7 days",
    normalAbout: (n: string) => `fires. Normal for this week is about ${n}.`,
    seeCalendar: "See the full calendar",
    aboveNow: "Above normal now",
    allNormal: "Every township is in its normal range.",
    more: (n: number) => `${n} more on the map.`,
    firesShort: (n: string) => `${n} fires`,
    tap: "Tap a township",
    openPlace: "Open",
  },
  steps: [
    { title: "Collect", text: "Daily fire detections from five NASA satellites, through NASA FIRMS." },
    { title: "Match", text: "Each satellite is scaled to one shared unit, so old and new years compare fairly." },
    { title: "Compare", text: "Each week is checked against the same dates in every past year." },
  ],
  how: "How it works",
  readMethod: "Read the method",
  faqTitle: "Questions",
  faqMissing: "Something missing?",
  faqAsk: "Ask on GitHub",
  telegram: { all: "Get fire alerts on Telegram", place: (p: string) => `Get alerts for ${p}` },
  legend: { none: "None", most: "Most fire" },
  tip: {
    fires: (n: string) => `${n} fires`,
    weekTo: (d: string) => `Week to ${d}`,
    normal: (n: string) => `Normal ${n}`,
  },
  chart: { year: "Year", normalRange: "Normal range" },
  area: {
    back: "Map",
    township: (s: string) => `Township in ${s}`,
    state: "State or region",
    country: "Whole country",
    dataTo: (d: string) => `Data to ${d}`,
    last7: "Last 7 days",
    normalAbout: (n: string) => `Normal is about ${n}`,
    noNormal: "No normal yet",
    thisYear: "This year so far",
    typicalYear: "Typical full year",
    seasonStart: "Season start",
    busiest: "Busiest week",
    calTitle: "Fire calendar",
    calDesc: "One row per year, one square per day. Darker means more fire.",
    chartTitle: "This year against normal",
    chartDesc: "Fires per 7 days. The shaded band is what past years looked like on the same dates.",
    tableTitle: "Year by year",
    tableDesc: "Fire season totals and dates.",
    download: "Download daily data (CSV)",
    cols: ["Year", "Fires", "vs typical", "Start", "Busiest week", "End"],
    soFar: "so far",
    notFoundTitle: "No fire record for this place",
    notFoundText: "Satellites saw no fires here, or the link is wrong.",
    backToMap: "Back to the map",
  },
  summary: {
    level: (name: string, level: Status, date: string) =>
      level === "normal"
        ? `Fire activity in ${name} is normal for ${date}.`
        : level === "elevated"
          ? `Fire activity in ${name} is above normal for ${date}.`
          : `Fire activity in ${name} is far above normal for ${date}. Check conditions on the ground.`,
    before: (start: string, peak: string, days: number) =>
      `The fire season usually starts around ${start} and is busiest around ${peak}. That's about ${days} days from now.`,
    during: (peak: string) => `The fire season is under way. It is usually busiest around ${peak}.`,
    after: (start: string) => `The main fire season is over. The next one usually starts around ${start}.`,
  },
  date: (iso: string, withYear = true) => {
    const d = new Date(iso + "T00:00:00Z");
    return `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
  },
  months: MONTHS_EN,
  monthsShort: MONTHS_EN,
  faq: [
    ["What is Mee?", "A free fire calendar for Myanmar. It shows when and where fires happen in every township and state, and whether this week is normal for the time of year."],
    ["Who is it for?", "Disaster and forest teams, farmers' groups, health workers watching smoke, researchers and journalists. Anyone who needs to know when the burning season starts and how bad it is."],
    ["Where does the data come from?", "From NASA FIRMS, which publishes fire detections from the MODIS and VIIRS instruments on five satellites. Township borders come from geoBoundaries."],
    ["What does one fire mean here?", "One hot spot seen from space, on a common scale. A big fire can show as many hot spots, so treat the number as fire activity, not a count of separate fires."],
    ["Why not just use NASA's map?", "Each satellite sees fires differently, and older ones are switching off. Raw counts jump when a satellite is added or lost. Mee puts them all on one scale, so 2005 and 2025 can be compared fairly."],
    ["What happens when old satellites stop?", "Nothing breaks. MODIS ends in 2027 and Suomi NPP has stopped, but NOAA-20 and NOAA-21 keep flying. Mee already converts every satellite to the NOAA-20 scale, so the record from 2000 stays comparable, and new satellites are added the same way."],
    ["What do Normal, Above normal and Far above normal mean?", "Mee compares the last 7 days with the same week in every past year. Above normal means busier than 3 out of 4 past years. Far above normal means busier than 9 out of 10."],
    ["How up to date is it?", "Mee updates itself every morning with NASA's newest data. Every page shows the date of its latest data."],
    ["Does it see every fire?", "No. Satellites miss small fires, fires under cloud or thick smoke, and fires that burn between passes. Use Mee for patterns and early warning, and check on the ground before acting."],
    ["Can I use the data?", "Yes. Every area page has a CSV download. Please credit NASA FIRMS and Mee. The code is open source under the MIT license."],
    ["Who made Mee?", "Sithu Nyein, a software engineer in Yangon. Mee is independent and not affiliated with NASA."],
  ] as [string, string][],
};

export type Dict = typeof en;

const my: Dict = {
  nav: { map: "မြေပုံ", myanmar: "မြန်မာ", how: "လုပ်ဆောင်ပုံ" },
  footer: { credit: "မီးဒေတာ NASA FIRMS မှ။ မြေပုံ geoBoundaries (CC BY 4.0) မှ။", questions: "မေးခွန်းများ", source: "ကုဒ်", notNasa: "NASA နှင့် မသက်ဆိုင်ပါ" },
  status: { normal: "ပုံမှန်", elevated: "ပုံမှန်ထက် များ", high: "ပုံမှန်ထက် အလွန်များ" },
  hero: {
    title: "မြန်မာနိုင်ငံ မီးလောင်ရာသီ၊ နေ့စဉ်",
    sub: "မြို့နယ်တိုင်းအတွက် NASA ဂြိုဟ်တု မီးဒေတာကို ပြက္ခဒိန်တစ်ခုတည်းတွင် ကြည့်ပါ။ မီးများ ဘယ်အချိန် လာတတ်သလဲ၊ ဒီအပတ် ပုံမှန်လား သိနိုင်သည်။",
    caption: "မြန်မာနိုင်ငံ တစ်ခုလုံး။ တစ်တန်းလျှင် တစ်နှစ်၊ တစ်ကွက်လျှင် တစ်ရက်။",
    open: "မြန်မာ ကိုဖွင့်ရန်",
  },
  search: {
    label: "မြို့နယ် သို့မဟုတ် ပြည်နယ်/တိုင်း ရှာရန်",
    placeholder: "မြို့နယ် သို့မဟုတ် ပြည်နယ်/တိုင်း ရှာပါ (English)",
    none: "မတွေ့ပါ။ အနီးရှိမြို့ သို့မဟုတ် ပြည်နယ်/တိုင်း အမည်ဖြင့် ရှာကြည့်ပါ။",
    state: "ပြည်နယ်/တိုင်း",
  },
  locate: {
    button: "ကျွန်ုပ်၏ တည်နေရာ သုံးမည်",
    finding: "သင့်မြို့နယ်ကို ရှာနေသည်…",
    denied: "တည်နေရာ ပိတ်ထားသည်။ browser တွင် ခွင့်ပြုပါ သို့မဟုတ် အမည်ဖြင့် ရှာပါ။",
    outside: "သင် မြန်မာနိုင်ငံ ပြင်ပတွင် ရှိနေပုံရသည်။ အမည်ဖြင့် ရှာပါ။",
    failed: "တည်နေရာ မရပါ။ အမည်ဖြင့် ရှာပါ။",
  },
  week: {
    title: "ဒီအပတ်",
    latest: (d) => `နောက်ဆုံးဒေတာ: ${d}`,
    card: "မြန်မာ၊ နောက်ဆုံး ၇ ရက်",
    normalAbout: (n) => `မီးပွိုင့်။ ဒီအပတ်အတွက် ပုံမှန်မှာ ${n} ခန့်။`,
    seeCalendar: "ပြက္ခဒိန် အပြည့်ကြည့်ရန်",
    aboveNow: "ယခု ပုံမှန်ထက် များနေသော နေရာများ",
    allNormal: "မြို့နယ်အားလုံး ပုံမှန် အတိုင်းအတာအတွင်း ရှိသည်။",
    more: (n) => `မြေပုံတွင် နောက်ထပ် ${n} ခု`,
    firesShort: (n) => `မီးပွိုင့် ${n}`,
    tap: "မြို့နယ်တစ်ခု နှိပ်ပါ",
    openPlace: "ကြည့်ရန်",
  },
  steps: [
    { title: "စုဆောင်း", text: "NASA FIRMS မှတစ်ဆင့် NASA ဂြိုဟ်တု ငါးစင်း၏ နေ့စဉ် မီးပွိုင့်များ။" },
    { title: "ညှိ", text: "ဂြိုဟ်တုတိုင်းကို စကေးတစ်ခုတည်းသို့ ညှိထားသဖြင့် နှစ်ဟောင်းနှစ်သစ်ကို မျှတစွာ နှိုင်းယှဉ်နိုင်သည်။" },
    { title: "နှိုင်းယှဉ်", text: "အပတ်တိုင်းကို ယခင်နှစ်များ၏ တူညီသော ရက်များနှင့် နှိုင်းယှဉ်သည်။" },
  ],
  how: "လုပ်ဆောင်ပုံ",
  readMethod: "နည်းလမ်း အသေးစိတ် (English)",
  faqTitle: "မေးလေ့ရှိသော မေးခွန်းများ",
  faqMissing: "မေးစရာ ရှိပါသလား။",
  faqAsk: "GitHub တွင် မေးပါ",
  telegram: { all: "Telegram တွင် မီးသတိပေးချက် ရယူရန်", place: (p) => `${p} အတွက် သတိပေးချက် ရယူရန်` },
  legend: { none: "မရှိ", most: "အများဆုံး" },
  tip: {
    fires: (n) => `မီးပွိုင့် ${n}`,
    weekTo: (d) => `${d} အထိ အပတ်`,
    normal: (n) => `ပုံမှန် ${n}`,
  },
  chart: { year: "နှစ်", normalRange: "ပုံမှန် အတိုင်းအတာ" },
  area: {
    back: "မြေပုံ",
    township: (s) => `${s} ရှိ မြို့နယ်`,
    state: "ပြည်နယ်/တိုင်းဒေသကြီး",
    country: "တစ်နိုင်ငံလုံး",
    dataTo: (d) => `${d} အထိ ဒေတာ`,
    last7: "နောက်ဆုံး ၇ ရက်",
    normalAbout: (n) => `ပုံမှန် ${n} ခန့်`,
    noNormal: "ပုံမှန်တန်ဖိုး မရှိသေး",
    thisYear: "ယခုနှစ် ယခုထိ",
    typicalYear: "ပုံမှန် တစ်နှစ်စာ",
    seasonStart: "ရာသီ စတင်",
    busiest: "အများဆုံး အပတ်",
    calTitle: "မီး ပြက္ခဒိန်",
    calDesc: "တစ်တန်းလျှင် တစ်နှစ်၊ တစ်ကွက်လျှင် တစ်ရက်။ အရောင်ရင့်လေ မီးများလေ။",
    chartTitle: "ယခုနှစ်နှင့် ပုံမှန် နှိုင်းယှဉ်ချက်",
    chartDesc: "၇ ရက်စာ မီးပွိုင့်။ အရိပ်ပိုင်းသည် ယခင်နှစ်များ၏ တူညီသောရက်များတွင် ဖြစ်ခဲ့ပုံ ဖြစ်သည်။",
    tableTitle: "နှစ်အလိုက်",
    tableDesc: "မီးရာသီ စုစုပေါင်းနှင့် ရက်စွဲများ။",
    download: "နေ့စဉ်ဒေတာ ဒေါင်းလုဒ် (CSV)",
    cols: ["နှစ်", "မီးပွိုင့်", "ပုံမှန်နှင့်", "စတင်", "အများဆုံးအပတ်", "ပြီးဆုံး"],
    soFar: "ယခုထိ",
    notFoundTitle: "ဤနေရာအတွက် မီးမှတ်တမ်း မရှိပါ",
    notFoundText: "ဂြိုဟ်တုများ ဤနေရာတွင် မီးမတွေ့ခဲ့ပါ၊ သို့မဟုတ် လင့်ခ် မှားနေသည်။",
    backToMap: "မြေပုံသို့ ပြန်ရန်",
  },
  summary: {
    level: (name, level, date) =>
      level === "normal"
        ? `${date} အတွက် ${name} ၏ မီးလောင်မှု ပုံမှန် ဖြစ်သည်။`
        : level === "elevated"
          ? `${date} အတွက် ${name} ၏ မီးလောင်မှု ပုံမှန်ထက် များနေသည်။`
          : `${date} အတွက် ${name} ၏ မီးလောင်မှု ပုံမှန်ထက် အလွန်များနေသည်။ မြေပြင်အခြေအနေကို စစ်ဆေးပါ။`,
    before: (start, peak, days) =>
      `မီးရာသီသည် ပုံမှန်အားဖြင့် ${start} ဝန်းကျင်တွင် စတင်ပြီး ${peak} ဝန်းကျင်တွင် အများဆုံး ဖြစ်သည်။ ယခုမှ ရက် ${days} ခန့် လိုသေးသည်။`,
    during: (peak) => `မီးရာသီ ရောက်နေပြီ ဖြစ်သည်။ ပုံမှန်အားဖြင့် ${peak} ဝန်းကျင်တွင် အများဆုံး ဖြစ်သည်။`,
    after: (start) => `အဓိက မီးရာသီ ပြီးဆုံးပြီ။ နောက်ရာသီသည် ပုံမှန်အားဖြင့် ${start} ဝန်းကျင်တွင် စတင်သည်။`,
  },
  date: (iso, withYear = true) => {
    const d = new Date(iso + "T00:00:00Z");
    return `${d.getUTCDate()} ${MONTHS_MY[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
  },
  months: MONTHS_MY,
  monthsShort: ["ဇန်", "ဖေ", "မတ်", "ဧ", "မေ", "ဇွန်", "ဇူ", "ဩ", "စက်", "အောက်", "နို", "ဒီ"],
  faq: [
    ["Mee ဆိုတာ ဘာလဲ။", "မြန်မာနိုင်ငံအတွက် အခမဲ့ မီးပြက္ခဒိန် ဖြစ်သည်။ မြို့နယ်နှင့် ပြည်နယ်/တိုင်းတိုင်းတွင် မီးများ ဘယ်အချိန်၊ ဘယ်နေရာတွင် ဖြစ်သလဲ၊ ဒီအပတ်သည် ယခုအချိန်အတွက် ပုံမှန်လား ပြသည်။"],
    ["ဘယ်သူတွေအတွက်လဲ။", "ဘေးအန္တရာယ်နှင့် သစ်တောအဖွဲ့များ၊ လယ်သမားအဖွဲ့များ၊ မီးခိုးကို စောင့်ကြည့်သော ကျန်းမာရေးဝန်ထမ်းများ၊ သုတေသီများနှင့် သတင်းထောက်များ။ မီးရာသီ ဘယ်အချိန် စမလဲ၊ ဘယ်လောက် ဆိုးမလဲ သိရန် လိုသူတိုင်း။"],
    ["ဒေတာ ဘယ်ကလာလဲ။", "ဂြိုဟ်တု ငါးစင်းပေါ်ရှိ MODIS နှင့် VIIRS ကိရိယာများ၏ မီးပွိုင့်များကို ထုတ်ပြန်သော NASA FIRMS မှ ဖြစ်သည်။ မြို့နယ်နယ်နိမိတ်များမှာ geoBoundaries မှ ဖြစ်သည်။"],
    ["မီးပွိုင့် တစ်ခုဆိုတာ ဘာလဲ။", "အာကာသမှ မြင်ရသော ပူပြင်းသည့် အစက်တစ်ခု ဖြစ်ပြီး စကေးတစ်ခုတည်းဖြင့် တွက်ထားသည်။ မီးကြီးတစ်ခုသည် အစက်များစွာ ဖြစ်နိုင်သဖြင့် မီးလောင်မှု ပမာဏအဖြစ် ယူဆပါ၊ မီးအရေအတွက် မဟုတ်ပါ။"],
    ["NASA မြေပုံကို ဘာကြောင့် တိုက်ရိုက် မသုံးတာလဲ။", "ဂြိုဟ်တုတစ်စင်းစီ မီးကို မတူညီစွာ မြင်ပြီး ဂြိုဟ်တုဟောင်းများ ရပ်နားနေသည်။ ဂြိုဟ်တု ထပ်တိုး/ပျောက်သည့်အခါ ကိန်းဂဏန်းများ ခုန်တက်/ကျသွားသည်။ Mee သည် အားလုံးကို စကေးတစ်ခုတည်းသို့ ညှိထားသဖြင့် ၂၀၀၅ နှင့် ၂၀၂၅ ကို မျှတစွာ နှိုင်းယှဉ်နိုင်သည်။"],
    ["ဂြိုဟ်တုဟောင်းများ ရပ်သွားရင် ဘာဖြစ်မလဲ။", "ဘာမှ မပျက်ပါ။ MODIS သည် ၂၀၂၇ တွင် ပြီးဆုံးမည်ဖြစ်ပြီး Suomi NPP ရပ်သွားပြီ ဖြစ်သော်လည်း NOAA-20 နှင့် NOAA-21 ဆက်ပျံသန်းနေသည်။ Mee သည် ဂြိုဟ်တုတိုင်းကို NOAA-20 စကေးသို့ ပြောင်းထားပြီးဖြစ်၍ ၂၀၀၀ ခုနှစ်မှစသော မှတ်တမ်း နှိုင်းယှဉ်နိုင်ဆဲ ဖြစ်ပြီး ဂြိုဟ်တုအသစ်များကိုလည်း ထိုနည်းအတိုင်း ထည့်နိုင်သည်။"],
    ["ပုံမှန်၊ ပုံမှန်ထက်များ၊ ပုံမှန်ထက် အလွန်များ ဆိုတာ ဘာလဲ။", "နောက်ဆုံး ၇ ရက်ကို ယခင်နှစ်တိုင်း၏ တူညီသောအပတ်နှင့် နှိုင်းယှဉ်သည်။ ပုံမှန်ထက်များ ဆိုသည်မှာ ယခင်နှစ် ၄ နှစ်တွင် ၃ နှစ်ထက် များသည်။ ပုံမှန်ထက် အလွန်များ ဆိုသည်မှာ ၁၀ နှစ်တွင် ၉ နှစ်ထက် များသည်။"],
    ["ဘယ်လောက် နောက်ဆုံးရလဲ။", "Mee သည် နံနက်တိုင်း NASA ၏ နောက်ဆုံးဒေတာဖြင့် အလိုအလျောက် အပ်ဒိတ်လုပ်သည်။ စာမျက်နှာတိုင်းတွင် နောက်ဆုံးဒေတာ ရက်စွဲ ပြထားသည်။"],
    ["မီးအားလုံးကို မြင်ရသလား။", "မမြင်ရပါ။ မီးငယ်များ၊ တိမ် သို့မဟုတ် မီးခိုးထူအောက်ရှိ မီးများနှင့် ဂြိုဟ်တု ဖြတ်သန်းချိန်ကြားတွင် လောင်သော မီးများကို လွတ်သွားနိုင်သည်။ ပုံစံနှင့် ကြိုတင်သတိပေးချက်အတွက် သုံးပြီး အရေးယူမည့်အခါ မြေပြင်တွင် စစ်ဆေးပါ။"],
    ["ဒေတာကို သုံးလို့ရလား။", "ရပါသည်။ စာမျက်နှာတိုင်းတွင် CSV ဒေါင်းလုဒ် ရှိသည်။ NASA FIRMS နှင့် Mee ကို ဖော်ပြပေးပါ။ ကုဒ်သည် MIT လိုင်စင်ဖြင့် open source ဖြစ်သည်။"],
    ["Mee ကို ဘယ်သူ လုပ်တာလဲ။", "ရန်ကုန်ရှိ software engineer Sithu Nyein ဖြစ်သည်။ Mee သည် လွတ်လပ်သော project ဖြစ်ပြီး NASA နှင့် မသက်ဆိုင်ပါ။"],
  ],
};

const DICTS: Record<Lang, Dict> = { en, my };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: en });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("mee-lang");
    } catch {}
    const initial: Lang =
      saved === "my" || saved === "en" ? saved : navigator.language?.toLowerCase().startsWith("my") ? "my" : "en";
    setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("mee-lang", l);
    } catch {}
  }, []);

  return <LangContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
