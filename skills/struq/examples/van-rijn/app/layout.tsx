// app/layout.tsx (Struq recipe). The inline script puts `sq-js` on <html> before first paint: the kit's motion gate
// keys off it, so an animated element never flashes before its entrance, shows anyway after 3 s, and a visitor without
// JavaScript sees the page. data-blocks on <body data-temperament="weighted"> is the scope every block and the STRUQ
// TOKENS block read. The stack preloader runs photoless: its panels stack like the layers of a roof and land on the
// opening's own ground.
import type { Metadata, Viewport } from "next";
import { PreloaderStack } from "../components/struq/preloaders/preloader-stack";
import { SmoothScroll } from "../components/struq/kit/SmoothScroll";
import { fontHrefs } from "./fonts";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = { title: site.meta.title, description: site.meta.description };
/** viewport-fit=cover, so the call bar can sit above a phone's home indicator (env(safe-area-inset-bottom)). */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={site.lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('sq-js')" }} />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {fontHrefs.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body data-blocks="" data-temperament="weighted" className="bg-surface-0 text-ink">
        <PreloaderStack name={site.name} opening="photoless" />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
