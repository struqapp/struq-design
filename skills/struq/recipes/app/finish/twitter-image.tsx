// app/twitter-image.tsx (Struq finish): the same link preview for X, from lib/site.ts.
import { OG_SIZE, ogImage } from "@/components/struq/kit/brand/images";
import { site } from "@/lib/site";

export const alt = site.meta.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function TwitterImage() {
  return ogImage(site);
}
