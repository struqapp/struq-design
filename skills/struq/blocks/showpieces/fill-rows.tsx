"use client";
// toonstuk-fill-rows (Struq showpiece recipe)
// A list of services or chapters set as large hairline rows. On hover and on keyboard focus a row
// floods with the accent from the bottom edge, its title turns to the accent's ink and nudges in,
// and its detail slides in beside it. The rows enter with a staggered rise as the list arrives.
// Lead for an agency or a creative brand (or toonstuk-scrub-connector instead).
//
// <FillRows rows={[{ title: "Identiteit", text: "Een merk dat zich in een oogopslag laat herkennen.", href: "#identiteit" }]} />
//
// Reduced motion: the fill changes without travel. Phones: the detail sits under each title.
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";

type Row = { title: string; text: string; href?: string };

export function FillRows({ rows, className = "" }: { rows: Row[]; className?: string }) {
  const list = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const el = list.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(el.children, {
          yPercent: 40,
          autoAlpha: 0,
          duration: 1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: list },
  );

  return (
    <ul ref={list} data-showpiece="fill-rows" className={`border-t border-line ${className}`}>
      {rows.map((row) => {
        const inner = (
          <>
            <span
              aria-hidden
              className="absolute inset-0 origin-bottom scale-y-0 bg-accent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
            />
            <span className="font-display relative block text-[11vw] leading-[1] tracking-[-0.03em] transition-[color,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[1.5vw] group-hover:text-accent-ink group-focus-visible:translate-x-[1.5vw] group-focus-visible:text-accent-ink motion-reduce:transition-none md:text-[6vw]">
              {row.title}
            </span>
            <span className="relative block max-w-[34ch] text-body text-ink-muted transition-[color,opacity,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-accent-ink group-focus-visible:text-accent-ink motion-reduce:transition-none md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">
              {row.text}
            </span>
          </>
        );
        const cls = "group relative grid gap-3 overflow-hidden px-6 py-8 outline-none md:grid-cols-[1fr_auto] md:items-end md:px-[5vw] md:py-[3vw]";
        return (
          <li key={row.title} className="border-b border-line">
            {row.href ? (
              <Link href={row.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div tabIndex={0} className={cls}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
