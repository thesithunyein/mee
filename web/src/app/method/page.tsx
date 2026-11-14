import type { Metadata } from "next";
import Link from "next/link";
import Validation from "./Validation";

export const metadata: Metadata = { title: "How it works · Mee" };

const STEPS = [
  {
    title: "Collect every fire detection",
    text: "Mee downloads all active-fire detections over Myanmar from NASA FIRMS: MODIS on Terra and Aqua since 2000, and VIIRS on Suomi NPP, NOAA-20 and NOAA-21 since 2012.",
  },
  {
    title: "Keep only real vegetation fires",
    text: "Detections flagged as gas flares, volcanoes or other static heat are removed. Low-confidence detections are dropped. Repeats are counted once.",
  },
  {
    title: "Put every satellite on one scale",
    text: "VIIRS sees far more small fires than MODIS. On days when both fly, Mee measures the gap for each state and month, then scales every satellite to match NOAA-20.",
  },
  {
    title: "Build the calendar",
    text: "The scaled counts are added up per township, per day. When several VIIRS satellites cover a day, Mee uses their average. Before 2012, scaled MODIS fills in.",
  },
  {
    title: "Define normal",
    text: "For each date, Mee looks at the 7-day total on the same dates in every past year. The middle value is normal. Above the 75th percentile is above normal. Above the 90th is far above normal.",
  },
];

const LIMITS = [
  "Satellites only see fires burning when they pass over. Cloud and smoke can hide fires.",
  "One count is one hot pixel, not one fire. A large fire can show as many pixels.",
  "Terra and Aqua will stop working in 2027, and Suomi NPP data stopped in November 2026. The scaling step is what keeps the record consistent after that.",
];

export default function MethodPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">How it works</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-2">
        Five satellites have watched Myanmar&apos;s fires, each with a different eye. Mee turns them into one record you can compare year to year.
      </p>

      <ol className="mt-14 space-y-10">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-sm font-semibold tabular-nums text-ember">
              {i + 1}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-1 leading-relaxed text-ink-2">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Validation />

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Limits</h2>
        <ul className="mt-5 space-y-3 text-ink-2">
          {LIMITS.map((l) => (
            <li key={l} className="flex gap-3 leading-relaxed">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
              {l}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">Data</h2>
        <ul className="mt-5 space-y-3 leading-relaxed text-ink-2">
          <li>
            NASA FIRMS active fires: MODIS Collection 6.1 and VIIRS 375 m (Suomi NPP, NOAA-20, NOAA-21).{" "}
            <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href="https://firms.modaps.eosdis.nasa.gov/">firms.modaps.eosdis.nasa.gov</a>
          </li>
          <li>
            Township and state borders: geoBoundaries, CC BY 4.0, from the Myanmar Analytics Project.{" "}
            <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href="https://www.geoboundaries.org/">geoboundaries.org</a>
          </li>
          <li>
            Code is open source under the MIT license.{" "}
            <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href="https://github.com/thesithunyein/mee">github.com/thesithunyein/mee</a>
          </li>
        </ul>
        <Link href="/" className="mt-10 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Open the map</Link>
      </section>
    </article>
  );
}
