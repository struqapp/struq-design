// components/struq/kit/motion/Pressable.tsx (Struq recipe)
// A button or link that answers the hand: it lifts a little under the pointer and gives way when pressed. Pick the
// press style once per site. CSS only, so it works before hydration and in a server component. Extracted from the
// live site's .btn press (a 1px sink in about 0.12s, settling back on the arrival ease) and the kit MagneticButton's
// rising ink fill, here on the press.
//
// <Pressable href="#book" press="sink" className="bg-accent px-8 py-4 text-small font-medium text-accent-ink">Book a table</Pressable>
//
// Props
// - href: renders an <a>; without it a <button type="button"> (pass type="submit" for a form). onClick, disabled,
//   aria-* and the rest pass through.
// - press: "sink" (default: it moves down by the feel's sink) or "fill" (an ink fill floods up from the bottom edge
//   and the label turns to the ground colour). Set --press-fill on it to fill with another colour.
// - lift: the hover lift by the feel's --press-lift (default true). Off for buttons in a dense row.
// - className: the look (ground, ink, padding, type). Pressable adds only the behaviour.
//
// Motion: the press goes in over --dur-press-in and settles back over --dur-press-out on --ease-enter; the lift and
// the hover share the settle. Keyboard focus lifts as hover does and keeps the locked focus ring. Reduced motion: no
// lift and no sink; the fill still shows, cut in.
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Common = {
  children: ReactNode;
  press?: "sink" | "fill";
  lift?: boolean;
  className?: string;
};

type Props = Common &
  (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className">)
    | ({ href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">)
  );

export function Pressable(props: Props) {
  const { children, press = "sink", lift = true, className = "", ...rest } = props;
  const data = { "data-pressable": press, "data-lift": lift ? "" : undefined };
  const inner = (
    <>
      {press === "fill" ? <span aria-hidden data-press-fill="" /> : null}
      <span data-press-label="">{children}</span>
    </>
  );
  if ("href" in rest && typeof rest.href === "string") {
    const anchor = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a {...anchor} {...data} className={`relative inline-flex items-center justify-center ${className}`}>
        {inner}
      </a>
    );
  }
  const button = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" {...button} {...data} className={`relative inline-flex items-center justify-center ${className}`}>
      {inner}
    </button>
  );
}
