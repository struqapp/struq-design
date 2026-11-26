// app/apple-icon.tsx (Struq finish): the home-screen icon, full bleed (iOS rounds it), the symbol inside 70 percent.
import { iconImage } from "@/components/struq/kit/brand/images";
import { site } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return iconImage(site, "apple");
}
