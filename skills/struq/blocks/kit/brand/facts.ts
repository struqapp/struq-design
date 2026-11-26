// brand/facts.ts (Struq kit): the lib/site.ts fields the finishing files read, as one loose type. Every finishing file
// (the icons, the link preview, the metadata, the JSON-LD, the sitemap, robots, the manifest, llms.txt, the 404 and the
// footer credit) takes the site object and reads only these fields, so a fact lives in lib/site.ts once.
//
// Required:
//   name                 the business name, as the wordmark sets it
//   lang                 the page language, "nl", "nb", "en", "de" ... (html lang, the credit and the 404 words)
//   meta.title           the page title; the title template is "%s | <name>" for any other route
//   meta.description     one or two sentences: the meta description, the link preview and llms.txt
//   brand.symbol         the mark, authored per site (references/identity.md): { viewBox, paths, weight? }
//   brand.colors         plain hex for the image files (the image renderer cannot read CSS tokens):
//                        { ground, ink, accent }; ground is the app tile and the link preview's ground
// Read when present (a fact the brief did not give stays out, never invented):
//   url                  "https://halden.no"; else NEXT_PUBLIC_SITE_URL, else VERCEL_PROJECT_PRODUCTION_URL, else localhost
//   locale               "nb-NO", for openGraph.locale
//   trade                the site's one line: the link preview's line, llms.txt's first line
//   place                the city: addressLocality in the JSON-LD and llms.txt
//   kind                 "shop" | "local" | "service" | "restaurant" | "event" | "organization" (default): picks the
//                        JSON-LD type; schemaType names the subtype ("HomeGoodsStore", "CafeOrCoffeeShop", "Bakery")
//   address              { street, postalCode, city, country }
//   phone, email         as read; email also comes from a door that is a real mailto: (never a placeholder door)
//   hours                [{ days: "Mo-Fr", from: "09:00", to: "17:00" }]
//   social               ["https://instagram.com/..."]: sameAs
//   products             [{ name, text?, price?, currency? }]: Product entries for a shop, offers only with a price
//   event                { name, startDate, endDate?, location? } for kind "event"
//   door                 the site's one way to act ({ href, label, placeholder? }): llms.txt's "how to reach"
//   routes               ["/", "/werk"]: the sitemap; default ["/"]
//   brand.face           { family, weight } of the display face, for the link preview (Google Fonts); default serif
//   brand.image          a public path for the link preview instead of the drawn one (a real photo the client gave)
//   credit               false removes the footer's "Made with Struq" line; default on
//   notFound             { title, text, home } in the site's language; defaults exist for nl, nb, en, de, fr, sv, da
import type { MarkSymbol } from "./symbol";

export type SiteFacts = {
  name: string;
  lang: string;
  meta: { title: string; description: string };
  brand: {
    symbol: MarkSymbol;
    colors: { ground: string; ink: string; accent: string };
    face?: { family: string; weight?: number };
    image?: string;
  };
  url?: string;
  locale?: string;
  trade?: string;
  place?: string;
  kind?: "shop" | "local" | "service" | "restaurant" | "event" | "organization";
  schemaType?: string;
  address?: { street?: string; postalCode?: string; city?: string; country?: string };
  phone?: string;
  email?: string;
  hours?: { days: string; from: string; to: string }[];
  social?: string[];
  products?: readonly { name: string; text?: string; price?: number | string; currency?: string }[];
  event?: { name: string; startDate: string; endDate?: string; location?: string };
  door?: { href: string; label: string; placeholder?: boolean };
  routes?: readonly string[];
  credit?: boolean;
  notFound?: { title?: string; text?: string; home?: string };
};

/** The site's origin: site.url, then the deploy's env, then localhost. Never ends in a slash. */
export function siteUrl(site: Pick<SiteFacts, "url">): string {
  const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {};
  const raw =
    site.url ||
    env.NEXT_PUBLIC_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    `http://localhost:${env.PORT || 3000}`;
  return raw.replace(/\/+$/, "");
}

/** A real email: site.email, or the door's mailto: when the door is not the placeholder. */
export function siteEmail(site: SiteFacts): string | undefined {
  if (site.email) return site.email;
  const d = site.door;
  if (d && !d.placeholder && d.href.startsWith("mailto:")) return d.href.slice(7).split("?")[0];
  return undefined;
}
