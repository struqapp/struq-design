// brand/symbol.ts (Struq kit): the client's mark as data, authored per site in lib/site.ts (brand.symbol) by the
// method in references/identity.md. One shape serves the header, the favicon, the app icons and the link preview.
//
//   symbol: {
//     viewBox: "1.5 1 48 48",              // the 48 grid; shift the origin to centre on visual mass, never the box
//     weight: 2,                           // the stroke width of every stroked path that names none (default 2)
//     paths: [
//       { d: "M23 5h2v11.25h-2z" },                        // tone "ink" (default): the site's ink, currentColor
//       { d: "M24 44.75A14.25 14.25 0 0 1 24 16.25", stroke: 2 },   // a stroked path (keyline 2 on the 48 grid)
//       { d: "M24 15.25A15.25 15.25 0 0 1 24 45.75Z", tone: "accent" }, // the accent: one part, never the whole mark
//     ],
//   }
//
// Fill rules: `rule: "evenodd"` cuts a counter. Keep to one or two tones and one or two weights.
export type MarkPath = {
  d: string;
  tone?: "ink" | "accent";
  /** Stroke this path instead of filling it, at this width (or the symbol's weight when true). */
  stroke?: number | true;
  rule?: "nonzero" | "evenodd";
};

export type MarkSymbol = {
  viewBox: string;
  paths: readonly MarkPath[];
  /** The default stroke width for stroked paths. */
  weight?: number;
};

/** The SVG attributes of one path, with the ink and accent as given (CSS values or hex). */
export function pathAttrs(p: MarkPath, symbol: MarkSymbol, ink: string, accent: string) {
  const color = p.tone === "accent" ? accent : ink;
  if (p.stroke) {
    const width = p.stroke === true ? (symbol.weight ?? 2) : p.stroke;
    return { d: p.d, fill: "none", stroke: color, strokeWidth: width };
  }
  return { d: p.d, fill: color, fillRule: p.rule ?? "nonzero" };
}

/** The symbol as an SVG string, for a static file or a data URL. */
export function symbolSvg(symbol: MarkSymbol, ink: string, accent: string, size = 48): string {
  const body = symbol.paths
    .map((p) => {
      const a = pathAttrs(p, symbol, ink, accent);
      return "stroke" in a
        ? `<path d="${a.d}" fill="none" stroke="${a.stroke}" stroke-width="${a.strokeWidth}"/>`
        : `<path d="${a.d}" fill="${a.fill}" fill-rule="${a.fillRule}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${symbol.viewBox}">${body}</svg>`;
}
