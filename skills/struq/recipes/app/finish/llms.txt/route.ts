// app/llms.txt/route.ts (Struq finish): /llms.txt, what the business is, what it offers and how to reach it, written
// from lib/site.ts at build time, so it never drifts from the page.
import { llmsText } from "@/components/struq/kit/brand";
import { site } from "@/lib/site";

export function GET() {
  return new Response(llmsText(site), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
