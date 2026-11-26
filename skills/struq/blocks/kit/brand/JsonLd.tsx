// brand/JsonLd.tsx (Struq kit): the site's structured data as one script in <body>, from lib/site.ts (meta.ts jsonLd).
//   <JsonLd site={site} />
import type { SiteFacts } from "./facts";
import { jsonLd } from "./meta";

export function JsonLd({ site }: { site: SiteFacts }) {
  // "<" is escaped so no text in site.ts can close the script early.
  const json = JSON.stringify(jsonLd(site)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
