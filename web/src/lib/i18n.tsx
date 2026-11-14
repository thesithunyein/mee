"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Status } from "@/lib/types";

export type Lang = "en" | "my";

const MONTHS_MY = ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const en = {
  nav: { map: "Map", myanmar: "Myanmar", how: "How it works" },
  footer: { credit: "Fire data from NASA FIRMS. Township maps from geoBoundaries (CC BY 4.0).", questions: "Questions", source: "Source code", notNasa: "Not connected to NASA" },
  status: { normal: "Normal", elevated: "Higher than usual", high: "Much higher than usual" } as Record<Status, string>,
  hero: {
    title: "When does Myanmar burn?",
    sub: "See fires in any township, compare this week with past years, and get a message when fires pick up.",
    caption: "All of Myanmar since 2001. Each row is a year, each square is a day.",
    open: "See all of Myanmar",
  },
  search: {
    label: "Search for a township or state",
    placeholder: "Township, state, or lat, lon",
    coords: (p: string) => `Find the township at ${p}`,
    noCoords: "That point is outside Myanmar.",
    none: "Nothing found. Try the state name.",
    state: "state",
  },
  locate: {
    button: "Use my location",
    finding: "Looking for your township…",
    denied: "Location is turned off. Turn it on, or type your township.",
    outside: "You seem to be outside Myanmar. Type a township instead.",
    failed: "Couldn't find your location. Type your township instead.",
  },
  week: {
    title: "This week",
    latest: (d: string) => `Data up to ${d}`,
    card: "Myanmar, last 7 days",
    normalAbout: (n: string) => `fires. A usual week at this time has about ${n}.`,
    seeCalendar: "See every year",
    aboveNow: "Busier than usual right now",
    allNormal: "Every township is at its usual level.",
    more: (n: number) => `${n} more on the map.`,
    firesShort: (n: string) => `${n} fires`,
    tap: "Tap a township",
    openPlace: "Open",
  },
  steps: [
    { title: "Satellites spot fires", text: "NASA satellites look for fires from space every day." },
    { title: "We line them up", text: "Five satellites see fire differently. We put them on one scale so old and new years can be compared." },
    { title: "We compare", text: "Each week is checked against the same week in past years." },
  ],
  how: "How it works",
  readMethod: "Read the full method",
  faqTitle: "Questions",
  faqMissing: "Have another question?",
  faqAsk: "Ask on GitHub",
  telegram: { all: "Get alerts on Telegram", place: (p: string) => `Get alerts for ${p}` },
  legend: { none: "No fires", most: "Many fires" },
  tip: {
    fires: (n: string) => `${n} fires`,
    weekTo: (d: string) => `Week ending ${d}`,
    normal: (n: string) => `Usual: ${n}`,
  },
  chart: { year: "Year", normalRange: "Usual range" },
  area: {
    back: "Map",
    township: (s: string) => `Township in ${s}`,
    state: "State or region",
    country: "All of Myanmar",
    dataTo: (d: string) => `Data up to ${d}`,
    last7: "Last 7 days",
    normalAbout: (n: string) => `Usual: about ${n}`,
    noNormal: "Usual: not known yet",
    thisYear: "This year",
    typicalYear: "A usual year",
    seasonStart: "Season started",
    busiest: "Busiest week",
    calTitle: "Fire calendar",
    calDesc: "Each row is a year, each square is a day. Darker means more fire.",
    chartTitle: "This year compared with a usual year",
    chartDesc: "Fires over 7 days. The shaded band shows what past years looked like at the same time.",
    tableTitle: "Year by year",
    tableDesc: "How big each fire season was, and when it started, peaked and ended.",
    download: "Download CSV",
    dlTitle: "Get the data",
    dlDesc: "Pick the dates you need and download the daily fire counts. Counts are on the NOAA-20 scale, so every year compares fairly.",
    from: "From",
    to: "To",
    rangeTotal: (n: string, d: string) => `${n} fires in ${d} days`,
    rangeBad: "The start date is after the end date.",
    cols: ["Year", "Fires", "Vs usual", "Started", "Busiest", "Ended"],
    soFar: "so far",
    notFoundTitle: "No fires recorded here",
    notFoundText: "Satellites haven't seen fires in this area, or the link is wrong.",
    backToMap: "Back to the map",
  },
  summary: {
    level: (name: string, level: Status, date: string) =>
      level === "normal"
        ? `As of ${date}, fires in ${name} are at the usual level for this time of year.`
        : level === "elevated"
          ? `As of ${date}, ${name} has more fires than usual for this time of year.`
          : `As of ${date}, ${name} has far more fires than usual. Check what's happening on the ground.`,
    before: (start: string, peak: string, days: number) =>
      `Fire season here usually starts around ${start}, about ${days} days from now, and is worst around ${peak}.`,
    during: (peak: string) => `Fire season is on now. It's usually worst around ${peak}.`,
    after: (start: string) => `This year's main fire season is over. The next one usually starts around ${start}.`,
  },
  date: (iso: string, withYear = true) => {
    const d = new Date(iso + "T00:00:00Z");
    return `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
  },
  months: MONTHS_EN,
  monthsShort: MONTHS_EN,
  faq: [
    ["What is Mee?", "A free website that shows when and where fires burn in Myanmar, township by township, and whether this week is busier than usual."],
    ["Who is it for?", "Anyone who has to plan for the fire season: disaster and forest teams, farmers, health workers dealing with smoke, researchers and reporters."],
    ["Where does the data come from?", "From NASA. Its FIRMS service shares the fires seen by five satellites, using the MODIS and VIIRS instruments. Township borders come from geoBoundaries."],
    ["What does one fire mean here?", "One hot spot seen by a satellite. A big fire can show up as many hot spots, so read the number as how much is burning, not how many separate fires there are."],
    ["Why not just use NASA's own map?", "NASA shows each satellite on its own, and they don't agree: newer satellites see many more small fires. Mee puts them on one scale, so you can fairly compare 2005 with 2025."],
    ["What happens when old satellites stop?", "Nothing breaks. MODIS ends in 2027 and Suomi NPP has already stopped, but NOAA-20 and NOAA-21 keep flying. Everything in Mee is already measured against NOAA-20, and new satellites can be added the same way."],
    ["What do the levels mean?", "We compare the last 7 days with the same week in past years. Higher than usual means busier than 3 in 4 past years. Much higher than usual means busier than 9 in 10."],
    ["How up to date is it?", "Mee updates itself every morning with NASA's latest data. Every page shows the date of its newest data."],
    ["Does it catch every fire?", "No. Satellites can miss small fires, fires under cloud or thick smoke, and fires that start and end between passes. Use Mee to spot patterns and early warnings, and check on the ground before you act."],
    ["Can I use the data?", "Yes. Download it from any township page. Please credit NASA FIRMS and Mee. The code is open source under the MIT license."],
    ["Who made Mee?", "Sithu Nyein, a software engineer in Yangon. Mee is independent and isn't connected to NASA."],
  ] as [string, string][],
};

export type Dict = typeof en;

const my: Dict = {
  nav: { map: "မြေပုံ", myanmar: "မြန်မာ", how: "ဘယ်လို အလုပ်လုပ်လဲ" },
  footer: { credit: "မီးဒေတာက NASA FIRMS ကပါ။ မြို့နယ်မြေပုံက geoBoundaries (CC BY 4.0) ကပါ။", questions: "မေးခွန်းများ", source: "Source code", notNasa: "NASA နဲ့ မသက်ဆိုင်ပါ" },
  status: { normal: "ပုံမှန်", elevated: "ပုံမှန်ထက် များ", high: "ပုံမှန်ထက် အများကြီး များ" },
  hero: {
    title: "မြန်မာပြည် ဘယ်အချိန် မီးလောင်လဲ",
    sub: "ဘယ်မြို့နယ်မဆို မီးလောင်မှုကို ကြည့်ပါ၊ ဒီအပတ်ကို အရင်နှစ်တွေနဲ့ နှိုင်းယှဉ်ပါ၊ မီးများလာရင် အသိပေးချက် ရယူပါ။",
    caption: "၂၀၀၁ ကစပြီး မြန်မာတစ်နိုင်ငံလုံး။ တစ်တန်းက တစ်နှစ်၊ တစ်ကွက်က တစ်ရက်။",
    open: "မြန်မာ အပြည့်ကြည့်ရန်",
  },
  search: {
    label: "မြို့နယ် ဒါမှမဟုတ် ပြည်နယ်/တိုင်း ရှာရန်",
    placeholder: "မြို့နယ်၊ ပြည်နယ်/တိုင်း၊ ဒါမှမဟုတ် lat, lon",
    coords: (p) => `${p} မှာရှိတဲ့ မြို့နယ်ကို ရှာမယ်`,
    noCoords: "ဒီနေရာက မြန်မာပြည် အပြင်မှာပါ။",
    none: "မတွေ့ပါ။ ပြည်နယ်/တိုင်း နာမည်နဲ့ ရှာကြည့်ပါ။",
    state: "ပြည်နယ်/တိုင်း",
  },
  locate: {
    button: "လက်ရှိနေရာကို သုံးမယ်",
    finding: "သင့်မြို့နယ်ကို ရှာနေပါတယ်…",
    denied: "တည်နေရာ ပိတ်ထားပါတယ်။ ဖွင့်ပေးပါ၊ ဒါမှမဟုတ် မြို့နယ်နာမည် ရိုက်ပါ။",
    outside: "မြန်မာပြည် အပြင်မှာ ရှိနေပုံရပါတယ်။ မြို့နယ်နာမည် ရိုက်ရှာပါ။",
    failed: "တည်နေရာ ရှာမရပါ။ မြို့နယ်နာမည် ရိုက်ရှာပါ။",
  },
  week: {
    title: "ဒီအပတ်",
    latest: (d) => `${d} အထိ ဒေတာ`,
    card: "မြန်မာ၊ နောက်ဆုံး ၇ ရက်",
    normalAbout: (n) => `မီးပွိုင့်။ ဒီအချိန်မှာ ပုံမှန်ဆို ${n} လောက် ရှိတတ်ပါတယ်။`,
    seeCalendar: "နှစ်အားလုံး ကြည့်ရန်",
    aboveNow: "အခု ပုံမှန်ထက် မီးများနေတဲ့ နေရာတွေ",
    allNormal: "မြို့နယ်အားလုံး ပုံမှန်ပါပဲ။",
    more: (n) => `မြေပုံမှာ နောက်ထပ် ${n} ခု ရှိပါတယ်။`,
    firesShort: (n) => `မီးပွိုင့် ${n}`,
    tap: "မြို့နယ်တစ်ခုကို နှိပ်ပါ",
    openPlace: "ကြည့်မယ်",
  },
  steps: [
    { title: "ဂြိုဟ်တုက မီးကို မြင်တယ်", text: "NASA ဂြိုဟ်တုတွေက နေ့တိုင်း အာကာသကနေ မီးတွေကို ရှာပါတယ်။" },
    { title: "စကေးတစ်ခုတည်း ညှိတယ်", text: "ဂြိုဟ်တု ငါးစင်းက မီးကို မတူအောင် မြင်ပါတယ်။ စကေးတစ်ခုတည်းပေါ် တင်ထားလို့ နှစ်ဟောင်းနှစ်သစ် နှိုင်းယှဉ်လို့ ရပါတယ်။" },
    { title: "နှိုင်းယှဉ်တယ်", text: "အပတ်တိုင်းကို အရင်နှစ်တွေရဲ့ တူညီတဲ့ အပတ်နဲ့ နှိုင်းယှဉ်ပါတယ်။" },
  ],
  how: "ဘယ်လို အလုပ်လုပ်လဲ",
  readMethod: "နည်းလမ်း အပြည့်အစုံ ဖတ်ရန်",
  faqTitle: "မေးလေ့ရှိတဲ့ မေးခွန်းများ",
  faqMissing: "တခြား မေးစရာ ရှိသေးလား။",
  faqAsk: "GitHub မှာ မေးပါ",
  telegram: { all: "Telegram မှာ အသိပေးချက် ရယူရန်", place: (p) => `${p} အတွက် အသိပေးချက် ရယူရန်` },
  legend: { none: "မီးမရှိ", most: "မီးများ" },
  tip: {
    fires: (n) => `မီးပွိုင့် ${n}`,
    weekTo: (d) => `${d} မှာ ဆုံးတဲ့ အပတ်`,
    normal: (n) => `ပုံမှန် ${n}`,
  },
  chart: { year: "နှစ်", normalRange: "ပုံမှန် အတိုင်းအတာ" },
  area: {
    back: "မြေပုံ",
    township: (s) => `${s} ထဲက မြို့နယ်`,
    state: "ပြည်နယ်/တိုင်းဒေသကြီး",
    country: "မြန်မာ တစ်နိုင်ငံလုံး",
    dataTo: (d) => `${d} အထိ ဒေတာ`,
    last7: "နောက်ဆုံး ၇ ရက်",
    normalAbout: (n) => `ပုံမှန် ${n} လောက်`,
    noNormal: "ပုံမှန် မသိရသေးပါ",
    thisYear: "ဒီနှစ်",
    typicalYear: "ပုံမှန်နှစ်",
    seasonStart: "ရာသီ စတဲ့နေ့",
    busiest: "အများဆုံး အပတ်",
    calTitle: "မီး ပြက္ခဒိန်",
    calDesc: "တစ်တန်းက တစ်နှစ်၊ တစ်ကွက်က တစ်ရက်။ အရောင်ရင့်လေ မီးများလေ။",
    chartTitle: "ဒီနှစ်နဲ့ ပုံမှန်နှစ် နှိုင်းယှဉ်ချက်",
    chartDesc: "၇ ရက်အတွင်း မီးပွိုင့်။ အရိပ်ပိုင်းက အရင်နှစ်တွေ ဒီအချိန်မှာ ဘယ်လောက် ရှိခဲ့လဲ ပြပါတယ်။",
    tableTitle: "နှစ်အလိုက်",
    tableDesc: "မီးရာသီတစ်ခုစီ ဘယ်လောက်ကြီးလဲ၊ ဘယ်တော့ စ၊ အများဆုံးဖြစ်၊ ပြီးလဲ။",
    download: "CSV ဒေါင်းမယ်",
    dlTitle: "ဒေတာ ယူရန်",
    dlDesc: "လိုချင်တဲ့ ရက်တွေကို ရွေးပြီး နေ့စဉ် မီးပွိုင့် အရေအတွက်ကို ဒေါင်းပါ။ အရေအတွက်တွေက NOAA-20 စကေးပေါ်မှာ ဖြစ်လို့ နှစ်တိုင်းကို တန်းတူ နှိုင်းယှဉ်လို့ ရပါတယ်။",
    from: "မှ",
    to: "အထိ",
    rangeTotal: (n, d) => `${d} ရက်အတွင်း မီးပွိုင့် ${n} ခု`,
    rangeBad: "စရက်က ဆုံးရက်ထက် နောက်ကျနေပါတယ်။",
    cols: ["နှစ်", "မီးပွိုင့်", "ပုံမှန်နဲ့", "စ", "အများဆုံး", "ပြီး"],
    soFar: "ယခုထိ",
    notFoundTitle: "ဒီနေရာမှာ မီးမှတ်တမ်း မရှိပါ",
    notFoundText: "ဂြိုဟ်တုတွေ ဒီနေရာမှာ မီးမတွေ့ခဲ့ပါ၊ ဒါမှမဟုတ် လင့်ခ် မှားနေပါတယ်။",
    backToMap: "မြေပုံကို ပြန်သွားရန်",
  },
  summary: {
    level: (name, level, date) =>
      level === "normal"
        ? `${date} အထိ ${name} မှာ မီးလောင်မှု ပုံမှန်ပါပဲ။`
        : level === "elevated"
          ? `${date} အထိ ${name} မှာ ဒီအချိန်အတွက် ပုံမှန်ထက် မီးများနေပါတယ်။`
          : `${date} အထိ ${name} မှာ ပုံမှန်ထက် မီးအများကြီး များနေပါတယ်။ မြေပြင်မှာ ဘာဖြစ်နေလဲ စစ်ကြည့်ပါ။`,
    before: (start, peak, days) =>
      `ဒီမှာ မီးရာသီက ပုံမှန်အားဖြင့် ${start} လောက်မှာ စတတ်ပါတယ် (နောက် ရက် ${days} လောက်)။ ${peak} လောက်မှာ အဆိုးဆုံး ဖြစ်တတ်ပါတယ်။`,
    during: (peak) => `မီးရာသီ ရောက်နေပါပြီ။ ပုံမှန်အားဖြင့် ${peak} လောက်မှာ အဆိုးဆုံး ဖြစ်တတ်ပါတယ်။`,
    after: (start) => `ဒီနှစ်ရဲ့ အဓိက မီးရာသီ ပြီးသွားပါပြီ။ နောက်ရာသီက ပုံမှန်အားဖြင့် ${start} လောက်မှာ စတတ်ပါတယ်။`,
  },
  date: (iso, withYear = true) => {
    const d = new Date(iso + "T00:00:00Z");
    return `${d.getUTCDate()} ${MONTHS_MY[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
  },
  months: MONTHS_MY,
  monthsShort: ["ဇန်", "ဖေ", "မတ်", "ဧ", "မေ", "ဇွန်", "ဇူ", "ဩ", "စက်", "အောက်", "နို", "ဒီ"],
  faq: [
    ["Mee ဆိုတာ ဘာလဲ။", "မြန်မာပြည်မှာ ဘယ်အချိန်၊ ဘယ်နေရာ မီးလောင်လဲ မြို့နယ်အလိုက် ပြပေးတဲ့ အခမဲ့ ဝက်ဘ်ဆိုက်ပါ။ ဒီအပတ် ပုံမှန်ထက် မီးများနေလားဆိုတာလည်း ပြပါတယ်။"],
    ["ဘယ်သူတွေအတွက်လဲ။", "မီးရာသီအတွက် ကြိုတင်ပြင်ဆင်ရမယ့် သူတိုင်းအတွက်ပါ။ ဘေးအန္တရာယ်နဲ့ သစ်တောအဖွဲ့တွေ၊ လယ်သမားတွေ၊ မီးခိုးကြောင့် ကျန်းမာရေး စောင့်ကြည့်ရသူတွေ၊ သုတေသီနဲ့ သတင်းထောက်တွေ။"],
    ["ဒေတာ ဘယ်ကလာလဲ။", "NASA ကပါ။ NASA ရဲ့ FIRMS က ဂြိုဟ်တု ငါးစင်း (MODIS နဲ့ VIIRS) မြင်တဲ့ မီးတွေကို ထုတ်ပေးပါတယ်။ မြို့နယ်နယ်နိမိတ်တွေက geoBoundaries ကပါ။"],
    ["မီးပွိုင့် တစ်ခုဆိုတာ ဘာလဲ။", "ဂြိုဟ်တုက မြင်တဲ့ ပူတဲ့အစက် တစ်ခုပါ။ မီးကြီးတစ်ခုက အစက်တွေ အများကြီး ဖြစ်နိုင်လို့ မီးဘယ်နှစ်ခုလဲ ဆိုတာထက် ဘယ်လောက် လောင်နေလဲလို့ ဖတ်ပါ။"],
    ["NASA မြေပုံကို ဘာလို့ တိုက်ရိုက် မသုံးတာလဲ။", "NASA က ဂြိုဟ်တုတစ်စင်းချင်းစီ သပ်သပ် ပြပြီး သူတို့ ကိန်းဂဏန်းတွေ မတူကြပါဘူး။ ဂြိုဟ်တုအသစ်တွေက မီးငယ်တွေကို ပိုမြင်ပါတယ်။ Mee က စကေးတစ်ခုတည်းပေါ် တင်ထားလို့ ၂၀၀၅ နဲ့ ၂၀၂၅ ကို တရားမျှတစွာ နှိုင်းယှဉ်လို့ ရပါတယ်။"],
    ["ဂြိုဟ်တုဟောင်းတွေ ရပ်သွားရင် ဘာဖြစ်မလဲ။", "ဘာမှ မပျက်ပါဘူး။ MODIS က ၂၀၂၇ မှာ ပြီးမယ်၊ Suomi NPP ကတော့ ရပ်သွားပါပြီ။ ဒါပေမဲ့ NOAA-20 နဲ့ NOAA-21 ဆက်ပျံနေပါတယ်။ Mee မှာ အားလုံးကို NOAA-20 နဲ့ ညှိတိုင်းထားပြီးသားမို့ ဂြိုဟ်တုအသစ်တွေကိုလည်း ဒီနည်းအတိုင်း ထည့်လို့ ရပါတယ်။"],
    ["အဆင့်တွေက ဘာကို ဆိုလိုလဲ။", "နောက်ဆုံး ၇ ရက်ကို အရင်နှစ်တွေရဲ့ တူညီတဲ့ အပတ်နဲ့ နှိုင်းယှဉ်ပါတယ်။ ပုံမှန်ထက် များ ဆိုတာ အရင်နှစ် ၄ နှစ်မှာ ၃ နှစ်ထက် များတာပါ။ ပုံမှန်ထက် အများကြီး များ ဆိုတာ ၁၀ နှစ်မှာ ၉ နှစ်ထက် များတာပါ။"],
    ["ဒေတာ ဘယ်လောက် နောက်ဆုံးရလဲ။", "Mee က မနက်တိုင်း NASA ရဲ့ နောက်ဆုံးဒေတာနဲ့ အလိုအလျောက် အပ်ဒိတ်လုပ်ပါတယ်။ စာမျက်နှာတိုင်းမှာ ဘယ်နေ့အထိ ဒေတာလဲ ပြထားပါတယ်။"],
    ["မီးအားလုံးကို မြင်ရလား။", "မမြင်ရပါဘူး။ မီးငယ်တွေ၊ တိမ် ဒါမှမဟုတ် မီးခိုးထူအောက်က မီးတွေ၊ ဂြိုဟ်တု မဖြတ်ခင် စပြီး ငြိမ်းသွားတဲ့ မီးတွေကို လွတ်သွားနိုင်ပါတယ်။ ပုံစံနဲ့ ကြိုတင်သတိပေးချက်အတွက် သုံးပြီး အရေးယူမယ်ဆိုရင် မြေပြင်မှာ စစ်ပါ။"],
    ["ဒေတာကို သုံးလို့ ရလား။", "ရပါတယ်။ မြို့နယ် စာမျက်နှာတိုင်းကနေ ဒေါင်းလို့ ရပါတယ်။ NASA FIRMS နဲ့ Mee ကို ဖော်ပြပေးပါ။ Code က MIT လိုင်စင်နဲ့ open source ပါ။"],
    ["Mee ကို ဘယ်သူ လုပ်တာလဲ။", "ရန်ကုန်က software engineer Sithu Nyein ပါ။ Mee က လွတ်လပ်တဲ့ project ဖြစ်ပြီး NASA နဲ့ မသက်ဆိုင်ပါ။"],
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
