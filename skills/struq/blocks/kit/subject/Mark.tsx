// components/struq/kit/subject/Mark.tsx (Struq recipe)
// The client's mark on a subject piece: their own logo when the caller has one, otherwise a small monogram drawn from
// their name (two initials in the display face, set in a solid disc of the accent). Never a stock icon.
//
// <Mark name="Atelier Oude Delft" />            -> a disc with "AO"
// <Mark name="Kraan & Zn." logo="/logo.svg" />  -> the logo, at the mark's height
//
// Props
// - name: the client's name; the monogram's letters and the logo's alt text.
// - logo: optional image src. Shown at the mark's height, its own width.
// - size: the mark's height in rem. Default 2.5.
// - shape: "round" (default) or "square" for the monogram.
import type { CSSProperties } from "react";
import { initials } from "./format";

type Props = {
  name: string;
  logo?: string;
  size?: number;
  shape?: "round" | "square";
  className?: string;
};

export function Mark({ name, logo, size = 2.5, shape = "round", className = "" }: Props) {
  const box: CSSProperties = { height: `${size}rem` };
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={name} style={box} className={`block w-auto ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      // Never under 12px: a small mark sets its letters in the body face at 12px, a large one in the display face.
      style={{ ...box, width: `${size}rem`, fontSize: `${Math.max(size * 0.4, 0.75)}rem` }}
      className={`inline-grid shrink-0 place-items-center bg-accent leading-none text-accent-ink ${
        size >= 2 ? "font-display tracking-[-0.02em]" : "font-body font-medium tracking-[-0.01em]"
      } ${
        shape === "round" ? "rounded-full" : "rounded-[0.2em]"
      } ${className}`}
    >
      <span className="translate-y-[0.03em]">{initials(name)}</span>
    </span>
  );
}
