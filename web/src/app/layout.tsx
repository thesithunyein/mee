import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Noto_Sans_Myanmar } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], weight: ["400", "500", "700"], variable: "--font-myanmar", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://meefire.app"),
  openGraph: {
    title: "Mee · Myanmar fire calendar",
    description: "When and where Myanmar burns, day by day, from NASA satellite data.",
    url: "https://meefire.app",
    siteName: "Mee",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: "Mee", statusBarStyle: "default" },
  title: "Mee · Myanmar fire calendar",
  description: "When and where Myanmar burns, day by day, from NASA satellite fire data. See if this week is normal for your township.",
};

export const viewport: Viewport = { themeColor: "#F6F7F4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${myanmar.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink">
        <LangProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">{children}</main>
          <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
