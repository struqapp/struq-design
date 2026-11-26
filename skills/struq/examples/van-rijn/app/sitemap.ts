// app/sitemap.ts (Struq finish): every route in site.routes (default "/"), on site.url or NEXT_PUBLIC_SITE_URL.
import type { MetadataRoute } from "next";
import { siteSitemap } from "@/components/struq/kit/brand";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return siteSitemap(site);
}
