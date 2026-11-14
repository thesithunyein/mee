import type { Metadata } from "next";
import Link from "next/link";
import { Schibsted_Grotesk, Noto_Sans_Myanmar } from "next/font/google";
import { MeeMark } from "@/components/Logo";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], weight: ["500", "700"], variable: "--font-myanmar", display: "swap" });

export const metadata: Metadata = {
  title: "Mee · Myanmar fire calendar",
  description: "When and where Myanmar burns, day by day, from NASA satellite fire data. See if this week is normal for your township.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${myanmar.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Mee home">
              <MeeMark size={26} />
              <span className="text-lg font-semibold tracking-tight">Mee</span>
              <span className="font-my text-base leading-none text-ink-2">မီး</span>
            </Link>
            <div className="flex gap-1 text-sm">
              <Link href="/" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-cell hover:text-ink">Map</Link>
              <Link href="/area/MMR" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-cell hover:text-ink">Myanmar</Link>
              <Link href="/method" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-cell hover:text-ink">How it works</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-2 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <MeeMark size={18} />
              <span>Fire data from NASA FIRMS. Maps from geoBoundaries (CC BY 4.0).</span>
            </div>
            <div className="text-ink-3">Independent project. Not affiliated with NASA.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
