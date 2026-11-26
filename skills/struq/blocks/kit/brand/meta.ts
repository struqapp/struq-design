// brand/meta.ts (Struq kit): the metadata, the structured data and the plain-text files of a site, from lib/site.ts.
//
//   app/layout.tsx       export const metadata = siteMetadata(site); export const viewport = siteViewport(site);
//                        <html lang={site.lang}> and <JsonLd site={site} /> inside <body>
//   app/sitemap.ts       export default () => siteSitemap(site)
//   app/robots.ts        export default () => siteRobots(site)
//   app/manifest.ts      export default () => siteManifest(site)
//   app/llms.txt/route   new Response(llmsText(site))
//
// Only facts present in site.ts are written; a missing address, phone or price stays missing (brand/facts.ts lists
// the fields). The JSON-LD type follows site.kind: shop -> Store, local -> LocalBusiness, service ->
// ProfessionalService, restaurant -> Restaurant, event -> Event, else Organization; site.schemaType names a subtype.
import type { Metadata, MetadataRoute, Viewport } from "next";
import { siteEmail, siteUrl, type SiteFacts } from "./facts";

export function siteMetadata(site: SiteFacts): Metadata {
  const url = siteUrl(site);
  return {
    metadataBase: new URL(url),
    title: { default: site.meta.title, template: `%s | ${site.name}` },
    description: site.meta.description,
    applicationName: site.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: site.name,
      title: site.meta.title,
      description: site.meta.description,
      ...(site.locale ? { locale: site.locale.replace("-", "_") } : {}),
    },
    twitter: { card: "summary_large_image", title: site.meta.title, description: site.meta.description },
  };
}

export function siteViewport(site: SiteFacts): Viewport {
  return { themeColor: site.brand.colors.ground };
}

const TYPE: Record<NonNullable<SiteFacts["kind"]>, string> = {
  shop: "Store",
  local: "LocalBusiness",
  service: "ProfessionalService",
  restaurant: "Restaurant",
  event: "Event",
  organization: "Organization",
};

/** The JSON-LD object for the site's kind, with only the facts it has. */
export function jsonLd(site: SiteFacts): Record<string, unknown> {
  const url = siteUrl(site);
  const kind = site.kind ?? "organization";
  const type = site.schemaType ?? TYPE[kind];
  const email = siteEmail(site);
  const a = site.address;
  const city = a?.city ?? site.place;
  const address =
    a || city
      ? {
          "@type": "PostalAddress",
          ...(a?.street ? { streetAddress: a.street } : {}),
          ...(a?.postalCode ? { postalCode: a.postalCode } : {}),
          ...(city ? { addressLocality: city } : {}),
          ...(a?.country ? { addressCountry: a.country } : {}),
        }
      : undefined;
  if (kind === "event" && site.event) {
    const e = site.event;
    return {
      "@context": "https://schema.org",
      "@type": type,
      name: e.name,
      startDate: e.startDate,
      ...(e.endDate ? { endDate: e.endDate } : {}),
      ...(e.location || address ? { location: { "@type": "Place", ...(e.location ? { name: e.location } : {}), ...(address ? { address } : {}) } } : {}),
      organizer: { "@type": "Organization", name: site.name, url },
      description: site.meta.description,
      url,
    };
  }
  const business = kind !== "organization";
  const products = (site.products ?? []).map((p) => ({
    "@type": "Product",
    name: p.name,
    ...(p.text ? { description: p.text } : {}),
    ...(p.price != null && p.currency ? { offers: { "@type": "Offer", price: String(p.price), priceCurrency: p.currency } } : {}),
  }));
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}/#org`,
    name: site.name,
    url,
    logo: `${url}/icons/512`,
    ...(business ? { image: `${url}/opengraph-image` } : {}),
    description: site.meta.description,
    ...(address ? { address } : {}),
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(email ? { email } : {}),
    ...(site.social?.length ? { sameAs: site.social } : {}),
    ...(business && site.hours?.length ? { openingHours: site.hours.map((h) => `${h.days} ${h.from}-${h.to}`) } : {}),
    ...(products.length && (kind === "shop" || kind === "local") ? { makesOffer: products.map((itemOffered) => ({ "@type": "Offer", itemOffered })) } : {}),
  };
}

export function siteSitemap(site: SiteFacts): MetadataRoute.Sitemap {
  const url = siteUrl(site);
  return (site.routes ?? ["/"]).map((r, i) => ({ url: `${url}${r === "/" ? "" : r}`, changeFrequency: "monthly", priority: i === 0 ? 1 : 0.7 }));
}

export function siteRobots(site: SiteFacts): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }], sitemap: `${siteUrl(site)}/sitemap.xml` };
}

export function siteManifest(site: SiteFacts): MetadataRoute.Manifest {
  const { ground } = site.brand.colors;
  return {
    name: site.name,
    short_name: site.name,
    description: site.meta.description,
    lang: site.lang,
    start_url: "/",
    display: "standalone",
    background_color: ground,
    theme_color: ground,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

/** llms.txt (llmstxt.org): what the business is, what it offers and how to reach it, from site.ts alone. */
export function llmsText(site: SiteFacts): string {
  const url = siteUrl(site);
  const email = siteEmail(site);
  const out = [`# ${site.name}`, "", `> ${site.trade ?? site.meta.description}`, ""];
  if (site.trade) out.push(site.meta.description, "");
  const facts = [
    site.place || site.address?.city ? `- Place: ${[site.address?.street, site.address?.postalCode, site.address?.city ?? site.place, site.address?.country].filter(Boolean).join(", ")}` : "",
    site.phone ? `- Phone: ${site.phone}` : "",
    email ? `- Email: ${email}` : "",
    site.door && !site.door.placeholder && !site.door.href.startsWith("mailto:") ? `- ${site.door.label}: ${site.door.href.startsWith("/") ? url + site.door.href : site.door.href}` : "",
    ...(site.hours ?? []).map((h) => `- Open: ${h.days} ${h.from}-${h.to}`),
    ...(site.social ?? []).map((s) => `- Elsewhere: ${s}`),
  ].filter(Boolean);
  if (facts.length) out.push("## Facts", "", ...facts, "");
  if (site.products?.length) {
    out.push("## Offers", "");
    for (const p of site.products) out.push(`- ${p.name}${p.text ? `: ${p.text}` : ""}${p.price != null && p.currency ? ` (${p.price} ${p.currency})` : ""}`);
    out.push("");
  }
  out.push("## Pages", "", ...(site.routes ?? ["/"]).map((r) => `- [${r === "/" ? site.name : r}](${url}${r === "/" ? "/" : r})`), "");
  return out.join("\n");
}
