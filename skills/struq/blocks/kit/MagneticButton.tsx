"use client";
// components/struq/MagneticButton.tsx (Struq recipe)
// The page's primary call to action. It leans toward the pointer (the label leans further, which
// reads as depth), a fill rises from the bottom edge on hover, and it springs back on leave.
// quickTo runs on gsap.ticker, the page's one clock. Touch screens and reduced motion get a still
// button with the same fill.
//
// <MagneticButton href="#reserveren">Reserveer een tafel</MagneticButton>
import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** "solid" is the accent button; "line" is ink on a hairline. */
  variant?: "solid" | "line";
  /** "lg" for the hero opener: a confident rectangle, never a pill. */
  size?: "md" | "lg";
  strength?: number;
};

export function MagneticButton({ children, href, onClick, className = "", variant = "solid", size = "md", strength = 0.3 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const label = el.querySelector<HTMLElement>("[data-label]");
        const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
        const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
        const lx = label ? gsap.quickTo(label, "x", { duration: 0.6, ease: "power3.out" }) : null;
        const ly = label ? gsap.quickTo(label, "y", { duration: 0.6, ease: "power3.out" }) : null;
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          x(dx * strength);
          y(dy * strength);
          lx?.(dx * strength * 0.5);
          ly?.(dy * strength * 0.5);
        };
        const leave = () => {
          gsap.to(label ? [el, label] : el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const look =
    variant === "solid"
      ? "bg-accent text-accent-ink"
      : "text-ink shadow-[inset_0_0_0_1px_var(--line)]";
  // The hover fill is the ink on both variants; the label turns to the page surface over it.
  const inner = (
    <>
      <span
        aria-hidden
        className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
      />
      <span data-label="" className="relative inline-block transition-colors duration-500 group-hover:text-surface-0">
        {children}
      </span>
    </>
  );
  const base = `group relative inline-flex items-center overflow-hidden ${size === "lg" ? "px-10 py-5 text-lead md:px-12 md:py-6" : "px-8 py-4 text-small"} font-medium ${look} ${className}`;

  if (href) {
    return (
      <a ref={ref as React.RefObject<HTMLAnchorElement>} href={href} className={base}>
        {inner}
      </a>
    );
  }
  return (
    <button ref={ref as React.RefObject<HTMLButtonElement>} type="button" onClick={onClick} className={base}>
      {inner}
    </button>
  );
}
