// app/icon.tsx (Struq finish): the favicon, the site's symbol on its tile, from lib/site.ts (brand.symbol, brand.colors).
import { iconImage } from "@/components/struq/kit/brand/images";
import { site } from "@/lib/site";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return iconImage(site, "favicon");
}
