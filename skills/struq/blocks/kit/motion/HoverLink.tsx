// components/struq/kit/motion/HoverLink.tsx (Struq recipe)
// A text link with the site's one hover style. Pick the style once per site and use it for every text link on it
// (nav, footer, inline, "view the work"). CSS only, so it works before hydration and in a server component. Extracted
// from the live site's .link (one rule, one origin, reverses from wherever it is) and the kit's footer rule draw.
//
// <HoverLink href="/work" look="draw">See the work</HoverLink>
//
// Props
// - href, children, and any other <a> attribute (target, rel, aria-current, onClick).
// - look: "draw" (default: a rule draws in from the left under the text and draws back the same way), "slide" (the
//   resting rule slides out to the right and a new one slides in from the left) or "color" (the text turns to the
//   accent, no rule).
// - className: on the <a>. The link inherits its type and colour; set them on it or its parent.
//
// Motion: the rule moves over the feel's --dur-hover-line on --ease-enter, the colour over --dur-hover-color, read from
// [data-temperament] (blocks.css, "--- motion ---"). Keyboard focus shows the same state as hover, plus the locked
// focus ring. Reduced motion: the same states, cut in without movement.
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
  href: string;
  children: ReactNode;
  look?: "draw" | "slide" | "color";
  className?: string;
};

export function HoverLink({ href, children, look = "draw", className = "", ...rest }: Props) {
  return (
    <a {...rest} href={href} data-hover-link={look} className={className}>
      {children}
    </a>
  );
}
