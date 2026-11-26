// brand/images.tsx (Struq kit): the image files every site ships, drawn from lib/site.ts with next/og: the favicon, the
// Apple touch icon, the manifest's icons (one of them maskable) and the link preview (Open Graph and X).
//
//   app/icon.tsx            export default () => iconImage(site, "favicon")       32 px, the symbol on its tile
//   app/apple-icon.tsx      export default () => iconImage(site, "apple")         180 px, full bleed: iOS rounds it
//   app/icons/[kind]/route  iconImage(site, "any", 192 | 512), iconImage(site, "maskable")
//   app/opengraph-image.tsx export default () => ogImage(site)                   1200 x 630
//
// Padding follows each platform's safe zone: the favicon fills its tile (16 px leaves no room to spare), the Apple icon
// keeps the symbol inside 70 percent, a manifest icon inside 78, the maskable one inside the 80 percent circle Android
// may cut (60 percent box). The symbol's own 48 grid keeps its margin on top of that.
// The image renderer cannot read CSS tokens: the colours are site.brand.colors, plain hex. No gradients, no shadow.
import { ImageResponse } from "next/og";
import type { SiteFacts } from "./facts";
import { pathAttrs, type MarkSymbol } from "./symbol";

export type IconKind = "favicon" | "apple" | "any" | "maskable";

const SHAPE: Record<IconKind, { size: number; box: number; radius: number }> = {
  favicon: { size: 32, box: 0.94, radius: 0.22 },
  apple: { size: 180, box: 0.7, radius: 0 },
  any: { size: 512, box: 0.78, radius: 0.22 },
  maskable: { size: 512, box: 0.6, radius: 0 },
};

function SymbolSvg({ symbol, size, ink, accent }: { symbol: MarkSymbol; size: number; ink: string; accent: string }) {
  return (
    <svg width={size} height={size} viewBox={symbol.viewBox}>
      {symbol.paths.map((p, i) => (
        <path key={i} {...pathAttrs(p, symbol, ink, accent)} />
      ))}
    </svg>
  );
}

/** The symbol on its tile in the palette, for satori (next/og). */
export function AppIcon({ site, size, kind }: { site: SiteFacts; size: number; kind: IconKind }) {
  const { ground, ink, accent } = site.brand.colors;
  const s = SHAPE[kind];
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ground,
        borderRadius: Math.round(size * s.radius),
      }}
    >
      <SymbolSvg symbol={site.brand.symbol} size={Math.round(size * s.box)} ink={ink} accent={accent} />
    </div>
  );
}

/** An icon as a PNG response. `size` overrides the kind's own size (the manifest's 192). */
export function iconImage(site: SiteFacts, kind: IconKind, size = SHAPE[kind].size) {
  return new ImageResponse(<AppIcon site={site} size={size} kind={kind} />, { width: size, height: size });
}

/** One weight of a Google face as TrueType, for satori; null when it cannot be fetched (offline build). */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const q = `family=${family.trim().replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(`https://fonts.googleapis.com/css2?${q}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The link preview: the ground of the palette, the logo top left, the site's line large in the display face bottom
 * left, the symbol large on the right in ink and accent. With brand.image (a real photo the client gave, a public
 * path) the photo takes the right half instead of the symbol.
 */
export async function ogImage(site: SiteFacts, origin = "") {
  const { ground, ink, accent } = site.brand.colors;
  const family = site.brand.face?.family ?? "Fraunces";
  const weight = site.brand.face?.weight ?? 400;
  const line = site.trade ?? site.meta.description;
  const font = await googleFont(family, weight, `${site.name}${line}`);
  const face = font ? family : "serif";
  const symbol = site.brand.symbol;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: ground, color: ink, fontFamily: face }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 72px 80px", width: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 44, letterSpacing: "-0.01em" }}>
            <SymbolSvg symbol={symbol} size={56} ink={ink} accent={accent} />
            <span>{site.name}</span>
          </div>
          <div style={{ display: "flex", fontSize: line.length > 60 ? 52 : 64, lineHeight: 1.08, letterSpacing: "-0.015em" }}>{line}</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {site.brand.image && origin ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${origin}${site.brand.image}`} width={440} height={630} style={{ objectFit: "cover" }} alt="" />
          ) : (
            <SymbolSvg symbol={symbol} size={360} ink={ink} accent={accent} />
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: font ? [{ name: family, data: font, weight: weight as 400, style: "normal" }] : [] },
  );
}
