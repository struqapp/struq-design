"use client";
// app/scenes/Lek.tsx: the phone door, for the visitor whose roof leaks today. An ink ground, the question and one line
// on the left, the number set large on the right where a thumb or a cursor finds it. The call bar steps aside while
// this holds the screen.
import { HoverLink, RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";

export function Lek() {
  const { lek, call: phone } = site;
  return (
    <section id="lek" data-scene="lek" data-energy="1" data-bar-tone="inverse" className="scene-inverse relative">
      <div className="mx-auto grid max-w-[96rem] gap-10 px-4 py-24 md:py-32 md:grid-cols-12 md:items-end md:gap-x-6 md:px-[4vw]">
        <div className="md:col-span-5">
          <RevealText as="h2" className="font-display text-h2 max-w-[10ch]">
            {lek.title}
          </RevealText>
          <p className="text-lead text-ink mt-5 max-w-[28ch]">{lek.text}</p>
        </div>
        <div className="md:col-span-6 md:col-start-7 md:text-right">
          <HoverLink href={phone.href} data-door-placeholder="" className="font-display text-h2 inline-block whitespace-nowrap">
            {phone.label}
          </HoverLink>
        </div>
      </div>
    </section>
  );
}
