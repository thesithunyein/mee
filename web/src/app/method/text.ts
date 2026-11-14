import type { Lang } from "@/lib/i18n";

type Link = { label: string; href: string };

export const METHOD: Record<
  Lang,
  {
    title: string;
    intro: string;
    steps: { title: string; text: string }[];
    check: {
      title: string;
      intro: (year: number) => string;
      cols: [string, string, string];
      rows: [string, string, string];
    };
    limitsTitle: string;
    limits: string[];
    dataTitle: string;
    data: { text: string; link: Link }[];
    openMap: string;
  }
> = {
  en: {
    title: "How it works",
    intro:
      "Five satellites have recorded Myanmar's fires since 2000, but each one sees fire differently. Here's how Mee turns them into one record you can compare from year to year.",
    steps: [
      {
        title: "Get every fire the satellites saw",
        text: "Mee downloads every fire seen over Myanmar from NASA FIRMS: MODIS on Terra and Aqua since 2000, and VIIRS on Suomi NPP, NOAA-20 and NOAA-21 since 2012.",
      },
      {
        title: "Keep only real fires on the land",
        text: "Gas flares, volcanoes and factories are taken out. So are detections the satellite isn't sure about. If the same spot is seen twice, it counts once.",
      },
      {
        title: "Put all satellites on one scale",
        text: "VIIRS sees far more small fires than MODIS. On days when both were flying, Mee measures the difference for each state and month, then scales every satellite to match NOAA-20.",
      },
      {
        title: "Build the calendar",
        text: "The scaled counts are added up for each township and each day. When more than one VIIRS satellite covers a day, Mee uses their average. Before 2012, scaled MODIS fills in.",
      },
      {
        title: "Work out what normal looks like",
        text: "For each date, Mee looks at the 7-day total on the same dates in every past year. The middle value is normal. Busier than 3 in 4 past years is higher than usual. Busier than 9 in 10 is much higher than usual.",
      },
    ],
    check: {
      title: "Does it work?",
      intro: (y) =>
        `We hid ${y}, worked out the scaling from the other years only, then checked how close scaled MODIS came to what NOAA-20 actually saw that year.`,
      cols: ["", "MODIS as is", "MODIS scaled by Mee"],
      rows: ["How well the weeks line up (correlation)", "Usual error per week", "Error in Myanmar's yearly total"],
    },
    limitsTitle: "Limits",
    limits: [
      "Satellites only see fires that are burning when they pass over. Cloud and smoke can hide fires.",
      "One count is one hot spot, not one fire. A big fire can show up as many hot spots.",
      "Terra and Aqua stop in 2027, and Suomi NPP stopped in November 2026. Because everything is already on the NOAA-20 scale, the record stays consistent after they're gone.",
    ],
    dataTitle: "Data",
    data: [
      {
        text: "NASA FIRMS fire data: MODIS Collection 6.1 and VIIRS 375 m (Suomi NPP, NOAA-20, NOAA-21).",
        link: { label: "firms.modaps.eosdis.nasa.gov", href: "https://firms.modaps.eosdis.nasa.gov/" },
      },
      {
        text: "Township and state borders: geoBoundaries, CC BY 4.0, from the Myanmar Analytics Project.",
        link: { label: "geoboundaries.org", href: "https://www.geoboundaries.org/" },
      },
      {
        text: "The code is open source under the MIT license.",
        link: { label: "github.com/thesithunyein/mee", href: "https://github.com/thesithunyein/mee" },
      },
    ],
    openMap: "Open the map",
  },
  my: {
    title: "ဘယ်လို အလုပ်လုပ်လဲ",
    intro:
      "၂၀၀၀ ကစပြီး ဂြိုဟ်တု ငါးစင်းက မြန်မာပြည်ရဲ့ မီးတွေကို မှတ်တမ်းတင်ခဲ့ပါတယ်။ ဒါပေမဲ့ တစ်စင်းချင်းစီက မီးကို မတူအောင် မြင်ပါတယ်။ နှစ်စဉ် နှိုင်းယှဉ်လို့ရတဲ့ မှတ်တမ်းတစ်ခုတည်း ဖြစ်အောင် Mee က ဘယ်လိုလုပ်လဲ ဒီမှာ ရှင်းပြထားပါတယ်။",
    steps: [
      {
        title: "ဂြိုဟ်တုတွေ မြင်ခဲ့တဲ့ မီးအားလုံးကို ယူတယ်",
        text: "NASA FIRMS ကနေ မြန်မာပြည်အပေါ်က မီးပွိုင့်အားလုံးကို ဒေါင်းပါတယ်။ Terra နဲ့ Aqua ပေါ်က MODIS (၂၀၀၀ ကစ) နဲ့ Suomi NPP၊ NOAA-20၊ NOAA-21 ပေါ်က VIIRS (၂၀၁၂ ကစ) ပါ။",
      },
      {
        title: "မြေပေါ်က တကယ့်မီးတွေကိုပဲ ထားတယ်",
        text: "ဓာတ်ငွေ့မီးတိုင်၊ မီးတောင်နဲ့ စက်ရုံတွေကို ဖယ်ထုတ်ပါတယ်။ ဂြိုဟ်တုက သေချာမသိတဲ့ မီးပွိုင့်တွေကိုလည်း ဖယ်ပါတယ်။ နေရာတစ်ခုတည်းကို နှစ်ခါမြင်ရင် တစ်ခါပဲ ရေတွက်ပါတယ်။",
      },
      {
        title: "ဂြိုဟ်တုအားလုံးကို စကေးတစ်ခုတည်းပေါ် တင်တယ်",
        text: "VIIRS က MODIS ထက် မီးငယ်တွေကို အများကြီး ပိုမြင်ပါတယ်။ နှစ်ခုလုံး ပျံနေတဲ့ ရက်တွေမှာ ပြည်နယ်/တိုင်းနဲ့ လအလိုက် ကွာခြားချက်ကို တိုင်းပြီး ဂြိုဟ်တုတိုင်းကို NOAA-20 နဲ့ ညီအောင် ညှိပါတယ်။",
      },
      {
        title: "ပြက္ခဒိန် တည်ဆောက်တယ်",
        text: "ညှိပြီးသား ကိန်းဂဏန်းတွေကို မြို့နယ်အလိုက်၊ နေ့အလိုက် ပေါင်းပါတယ်။ တစ်ရက်တည်းမှာ VIIRS ဂြိုဟ်တု တစ်စင်းထက်ပိုရှိရင် ပျမ်းမျှကို သုံးပါတယ်။ ၂၀၁၂ မတိုင်ခင်ကတော့ ညှိထားတဲ့ MODIS ကို သုံးပါတယ်။",
      },
      {
        title: "ပုံမှန်က ဘယ်လိုလဲ တွက်တယ်",
        text: "ရက်တိုင်းအတွက် အရင်နှစ်တွေရဲ့ တူညီတဲ့ရက်တွေမှာ ၇ ရက်စာ စုစုပေါင်းကို ကြည့်ပါတယ်။ အလယ်တန်ဖိုးက ပုံမှန်ပါ။ အရင်နှစ် ၄ နှစ်မှာ ၃ နှစ်ထက် များရင် ပုံမှန်ထက် များ၊ ၁၀ နှစ်မှာ ၉ နှစ်ထက် များရင် ပုံမှန်ထက် အများကြီး များ လို့ ပြပါတယ်။",
      },
    ],
    check: {
      title: "တကယ် အလုပ်ဖြစ်လား။",
      intro: (y) =>
        `${y} ကို ဖယ်ထားပြီး ကျန်တဲ့နှစ်တွေနဲ့ပဲ ညှိနည်းကို တွက်ပါတယ်။ ပြီးမှ ညှိထားတဲ့ MODIS က အဲဒီနှစ်မှာ NOAA-20 တကယ်မြင်ခဲ့တာနဲ့ ဘယ်လောက် နီးလဲ စစ်ပါတယ်။`,
      cols: ["", "MODIS မူရင်း", "Mee ညှိပြီး"],
      rows: ["အပတ်တွေ ဘယ်လောက် ကိုက်ညီလဲ (correlation)", "တစ်ပတ်ချင်း ပုံမှန် အမှား", "မြန်မာ တစ်နိုင်ငံလုံး နှစ်စဉ်စုစုပေါင်း အမှား"],
    },
    limitsTitle: "ကန့်သတ်ချက်များ",
    limits: [
      "ဂြိုဟ်တု ဖြတ်သွားချိန်မှာ လောင်နေတဲ့ မီးကိုပဲ မြင်ပါတယ်။ တိမ်နဲ့ မီးခိုးက မီးကို ဖုံးထားနိုင်ပါတယ်။",
      "တစ်ခုက ပူတဲ့အစက် တစ်ခုပါ၊ မီးတစ်ခု မဟုတ်ပါ။ မီးကြီးတစ်ခုက အစက်တွေ အများကြီး ဖြစ်နိုင်ပါတယ်။",
      "Terra နဲ့ Aqua က ၂၀၂၇ မှာ ရပ်မယ်၊ Suomi NPP ကတော့ ၂၀၂၆ နိုဝင်ဘာမှာ ရပ်သွားပါပြီ။ အားလုံးကို NOAA-20 စကေးပေါ် တင်ထားပြီးသားမို့ သူတို့ မရှိတော့လည်း မှတ်တမ်းက ညီညွတ်နေဆဲပါ။",
    ],
    dataTitle: "ဒေတာ",
    data: [
      {
        text: "NASA FIRMS မီးဒေတာ: MODIS Collection 6.1 နဲ့ VIIRS 375 m (Suomi NPP၊ NOAA-20၊ NOAA-21)။",
        link: { label: "firms.modaps.eosdis.nasa.gov", href: "https://firms.modaps.eosdis.nasa.gov/" },
      },
      {
        text: "မြို့နယ်နဲ့ ပြည်နယ်/တိုင်း နယ်နိမိတ်: geoBoundaries (CC BY 4.0)၊ Myanmar Analytics Project ကပါ။",
        link: { label: "geoboundaries.org", href: "https://www.geoboundaries.org/" },
      },
      {
        text: "Code က MIT လိုင်စင်နဲ့ open source ပါ။",
        link: { label: "github.com/thesithunyein/mee", href: "https://github.com/thesithunyein/mee" },
      },
    ],
    openMap: "မြေပုံ ဖွင့်ရန်",
  },
};
