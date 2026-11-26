"use client";
// app/scenes/Lek.tsx: the phone door, for the visitor whose roof leaks today. The roof sits low on the left in the
// rain (world.tsx); the question, one line and the number, set large, on the right. On a phone the type sits in the
// lower half, under the roof.
import { useRef } from "react";
import { HoverLink, RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";
import { useLeave } from "./leave";

export function Lek() {
  const root = useRef<HTMLElement>(null);
  const type = useRef<HTMLDivElement>(null);
  useLeave(root, type);
  const { lek, phone } = site;

  return (
    <section ref={root} id="lek" data-beat="lek" data-scene="lek" data-energy="1" data-bar-tone="ground" className="relative h-[160svh]">
      <div ref={type} className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col justify-end px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:items-end md:justify-center md:px-[4vw] md:pb-0">
        <div className="md:w-[40%]">
          <RevealText as="h2" className="font-display text-h2 text-ink">
            {lek.title}
          </RevealText>
          <p className="text-lead text-ink mt-4 max-w-[28ch]">{lek.text}</p>
          <HoverLink href={phone.href} data-door-placeholder="" className="font-display text-h2 mt-6 inline-block whitespace-nowrap text-accent md:mt-8">
            {phone.label}
          </HoverLink>
        </div>
      </div>
    </section>
  );
}
