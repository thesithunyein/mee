const FAQ: [string, string][] = [
  [
    "What is Mee?",
    "A free fire calendar for Myanmar. It shows when and where fires happen in every township and state, and whether this week is normal for the time of year.",
  ],
  [
    "Who is it for?",
    "Disaster and forest teams, farmers' groups, health workers watching smoke, researchers and journalists. Anyone who needs to know when the burning season starts and how bad it is.",
  ],
  [
    "Where does the data come from?",
    "From NASA FIRMS, which publishes fire detections from the MODIS and VIIRS instruments on five satellites. Township borders come from geoBoundaries.",
  ],
  [
    "What does one fire mean here?",
    "One hot spot seen from space, on a common scale. A big fire can show as many hot spots, so treat the number as fire activity, not a count of separate fires.",
  ],
  [
    "Why not just use NASA's map?",
    "Each satellite sees fires differently, and older ones are switching off. Raw counts jump when a satellite is added or lost. Mee puts them all on one scale, so 2005 and 2025 can be compared fairly.",
  ],
  [
    "What do Normal, Above normal and Far above normal mean?",
    "Mee compares the last 7 days with the same week in every past year. Above normal means busier than 3 out of 4 past years. Far above normal means busier than 9 out of 10.",
  ],
  [
    "How up to date is it?",
    "Every page shows the date of its latest data. NASA releases new detections within hours of each satellite pass.",
  ],
  [
    "Does it see every fire?",
    "No. Satellites miss small fires, fires under cloud or thick smoke, and fires that burn between passes. Use Mee for patterns and early warning, and check on the ground before acting.",
  ],
  [
    "Can I use the data?",
    "Yes. Every area page has a CSV download. Please credit NASA FIRMS and Mee. The code is open source under the MIT license.",
  ],
  [
    "Who made Mee?",
    "Sithu Nyein, a software engineer in Yangon. Mee is independent and not affiliated with NASA.",
  ],
];

export default function Faq() {
  return (
    <section id="faq" className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
        <p className="mt-2 max-w-xs text-ink-2">
          Something missing?{" "}
          <a href="https://github.com/thesithunyein/mee/issues" className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            Ask on GitHub
          </a>
          .
        </p>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <span className="relative h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true">
                <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded bg-current" />
                <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
              </span>
            </summary>
            <p className="max-w-2xl pb-6 leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
