// brand/Logo.tsx (Struq kit): the client's logo, the symbol and the wordmark, in the site's tokens.
//
//   <Logo name={site.name} symbol={site.brand.symbol} />                       horizontal: symbol, then the name
//   <Logo name={site.name} symbol={site.brand.symbol} layout="stacked" />      the symbol over the name, centred
//   <Logo name={site.name} symbol={site.brand.symbol} layout="symbol" />       the symbol alone, named for readers
//   <Mark symbol={site.brand.symbol} size="1.2em" />                           the symbol inline (the header's mark=)
//
// Props:
//   name        the wordmark, set in the display face (--face-display) at the size of the parent's type
//   symbol      the mark authored for this site (brand/symbol.ts, references/identity.md)
//   layout      "horizontal" (default) | "stacked" | "symbol"
//   size        the symbol's height as a CSS length (default 1.2em: about the cap height plus the overshoot)
//   tracking    the wordmark's letter-spacing in em, tuned for its size (default -0.01)
//   weight      the wordmark's weight (default: the token --display-weight)
//   className   on the outer element
// Colour comes from the tokens: the ink is currentColor (the parent's text colour, so the header's tone inks work),
// the accent is var(--logo-accent, var(--accent)). Set --logo-accent on a parent to change only the logo's accent.
// No hooks and no "use client": it renders on the server and inside a client block alike.
import type { CSSProperties } from "react";
import { pathAttrs, type MarkSymbol } from "./symbol";

const ACCENT = "var(--logo-accent, var(--accent))";

export function Mark({ symbol, size = "1.2em", label, className = "" }: { symbol: MarkSymbol; size?: string; label?: string; className?: string }) {
  return (
    <svg
      viewBox={symbol.viewBox}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      {symbol.paths.map((p, i) => (
        <path key={i} {...pathAttrs(p, symbol, "currentColor", ACCENT)} />
      ))}
    </svg>
  );
}

export function Logo({
  name,
  symbol,
  layout = "horizontal",
  size = "1.2em",
  tracking = -0.01,
  weight,
  className = "",
}: {
  name: string;
  symbol: MarkSymbol;
  layout?: "horizontal" | "stacked" | "symbol";
  size?: string;
  tracking?: number;
  weight?: number;
  className?: string;
}) {
  if (layout === "symbol") return <Mark symbol={symbol} size={size} label={name} className={className} />;
  const word: CSSProperties = {
    fontFamily: "var(--face-display), ui-serif, Georgia, serif",
    fontWeight: weight ?? ("var(--display-weight, 400)" as unknown as number),
    letterSpacing: `${tracking}em`,
    lineHeight: 1,
  };
  return (
    <span
      data-logo={layout}
      className={`inline-flex ${layout === "stacked" ? "flex-col items-center gap-[0.35em]" : "items-center gap-[0.4em]"} ${className}`}
    >
      <Mark symbol={symbol} size={layout === "stacked" ? `calc(${size} * 2)` : size} />
      <span style={word}>{name}</span>
    </span>
  );
}
