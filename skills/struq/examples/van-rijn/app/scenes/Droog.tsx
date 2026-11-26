"use client";
// app/scenes/Droog.tsx: the opening. The h1, one line on the work and both doors on the left, over the world; the
// finished roof on the right, in the rain (world.tsx). Held for 2.3 screens (sticky, never a GSAP pin, so the beats
// measure its real length): the rain stops, then the tiles lift off as Lagen comes in. The phone number is on the
// first screen at every width, set as the page's one filled button. On a phone the type sits in the lower half,
// under the roof, clear of the call bar.
import { useRef } from "react";
import { SplitHeadline } from "@/components/struq/kit/SplitHeadline";
import { HoverLink, Pressable } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";
import { useLeave } from "./leave";

export function Droog() {
  const root = useRef<HTMLElement>(null);
  const type = useRef<HTMLDivElement>(null);
  useLeave(root, type);
  const { phone, quote, opening } = site;

  return (
    <section ref={root} id="droog" data-beat="droog" data-scene="droog" data-energy="3" data-bar-tone="ground" className="relative h-[230svh]">
      <div ref={type} className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col justify-end px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:justify-center md:px-[4vw] md:pb-0">
        <div className="md:max-w-[46%]">
          <SplitHeadline as="h1" className="font-display text-display text-ink max-w-[9ch]">
            {opening.title}
          </SplitHeadline>
          <p className="text-lead text-ink mt-4 max-w-[30ch] md:mt-8">{opening.lead}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 md:mt-10">
            <Pressable href={phone.href} data-door-placeholder="" press="fill" className="bg-accent px-6 py-3.5 font-body text-lead font-medium whitespace-nowrap text-accent-ink md:px-8 md:py-4">
              {opening.call}
            </Pressable>
            <HoverLink href={quote.href} data-door-placeholder="" className="font-body text-lead text-ink">
              {quote.label}
            </HoverLink>
          </div>
        </div>
      </div>
    </section>
  );
}
