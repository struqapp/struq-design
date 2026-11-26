// app/manifest.ts (Struq finish): the web app manifest: name, language, the palette's ground and the three icons.
import type { MetadataRoute } from "next";
import { siteManifest } from "@/components/struq/kit/brand";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return siteManifest(site);
}
