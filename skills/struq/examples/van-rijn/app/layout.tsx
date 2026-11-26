// app/layout.tsx (Struq recipe). The inline script puts `sq-js` on <html> before first paint: the kit's motion gate
// keys off it, so an animated element never flashes before its entrance, shows anyway after 3 s, and a visitor without
// JavaScript sees the page. data-blocks on <body data-temperament="weighted"> is the scope every block and the STRUQ
// TOKENS block read. The stack preloader runs photoless: its panels stack like the layers of a roof and land on the
// opening's own ground. viewport-fit=cover lets the call bar sit above a phone's home indicator.
import type { Metadata, Viewport } from "next";
import { PreloaderStack } from "../components/struq/preloaders/preloader-stack";
import { SmoothScroll } from "../components/struq/kit/SmoothScroll";
import { fontHrefs } from "./fonts";
import { site } from "@/lib/site";
import { siteMetadata, siteViewport, JsonLd } from "@/components/struq/kit/brand";
import "@struq/icons/tokens.css";
import "@struq/icons/icons.css";
import "@struq/icons/states.css";
import "./globals.css";

export const metadata: Metadata = siteMetadata(site);
export const viewport: Viewport = { ...siteViewport(site), width: "device-width", initialScale: 1, viewportFit: "cover" };

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
        <JsonLd site={site} />
        <PreloaderStack name={site.preloader} opening="photoless" />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
