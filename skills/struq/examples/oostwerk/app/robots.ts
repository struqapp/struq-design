// app/robots.ts (Struq finish): open to every crawler, with the sitemap's address.
import type { MetadataRoute } from "next";
import { siteRobots } from "@/components/struq/kit/brand";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return siteRobots(site);
}
