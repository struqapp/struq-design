// app/opengraph-image.tsx (Struq finish): the link preview, 1200 x 630, in the palette and the display face: the logo,
// the site's line (site.trade, else the description) and the symbol large. From lib/site.ts.
import { OG_SIZE, ogImage } from "@/components/struq/kit/brand/images";
import { site } from "@/lib/site";

export const alt = site.meta.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogImage(site);
}
