import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mee: Myanmar fire calendar from NASA satellites",
  description:
    "Mee merges 25 years of NASA MODIS and VIIRS fire detections into one consistent burning-activity calendar, with unusual-condition flags and early warning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <header className="border-b border-slate-800">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-orange-400">Mee</span>
              <span className="text-sm text-slate-400">မီး</span>
            </Link>
            <div className="flex gap-5 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">Map</Link>
              <Link href="/area/MMR" className="hover:text-white">Myanmar</Link>
              <Link href="/method" className="hover:text-white">Method</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs leading-relaxed text-slate-500">
          Data: NASA FIRMS active fires from MODIS (Terra, Aqua) and VIIRS (Suomi NPP, NOAA-20, NOAA-21).
          Boundaries: geoBoundaries (CC BY 4.0), Myanmar Analytics Project / USAID. Mee is an independent
          project built for NASA Space Apps 2026 and is not endorsed by NASA.
        </footer>
      </body>
    </html>
  );
}
