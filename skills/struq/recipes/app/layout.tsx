// app/layout.tsx (Struq recipe). Set the title, the description and lang.
// The inline script puts `sq-js` on <html> before first paint: the kit's motion gate keys off it, so an animated
// element never flashes before its entrance, shows anyway after 3 s, and a visitor without JavaScript sees the page.
// data-blocks on <body> is the scope every block and the STRUQ TOKENS block read.
import type { Metadata } from "next";
import { SmoothScroll } from "../components/struq/kit/SmoothScroll";
import { fontHrefs } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "SITE_TITLE",
  description: "SITE_DESCRIPTION",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('sq-js')" }} />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {fontHrefs.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body data-blocks="">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
