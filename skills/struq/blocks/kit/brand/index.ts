// brand (Struq kit): the client's identity and the files that finish a site, all read from lib/site.ts.
// The mark is designed per site (references/identity.md); `node <skill-dir>/scripts/blocks.mjs finish` writes the app
// files that use these. The image helpers (images.tsx) import next/og: import them from "./images" in the route files
// only, never into a client component.
export { Logo, Mark } from "./Logo";
export { JsonLd } from "./JsonLd";
export { Credit, creditWords, notFoundWords } from "./Credit";
export { siteMetadata, siteViewport, jsonLd, siteSitemap, siteRobots, siteManifest, llmsText } from "./meta";
export { siteUrl, siteEmail, type SiteFacts } from "./facts";
export { symbolSvg, pathAttrs, type MarkSymbol, type MarkPath } from "./symbol";
