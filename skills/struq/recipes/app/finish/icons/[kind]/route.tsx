// app/icons/[kind]/route.tsx (Struq finish): the manifest's icons, /icons/192, /icons/512 and /icons/maskable (the
// symbol inside Android's 80 percent safe circle), built once at build time from lib/site.ts.
import { iconImage } from "@/components/struq/kit/brand/images";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return [{ kind: "192" }, { kind: "512" }, { kind: "maskable" }];
}

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind === "maskable") return iconImage(site, "maskable");
  return iconImage(site, "any", kind === "192" ? 192 : 512);
}
