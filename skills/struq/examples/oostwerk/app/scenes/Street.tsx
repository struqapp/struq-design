"use client";
// app/scenes/Street.tsx: the night again, the whole screen. The opening's canal returns with every light on, the water
// moving, the door still lit at the visitor's own hour, and the idea's last line set on the water where "Always open."
// stood: the ending answers the opening. The offer and the door follow straight under it (./Order).
import { RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";
import { Facade } from "./Facade";

export function Street() {
  const h = site.opening.hours;
  return (
    <section data-scene="street" data-energy="1" data-bar-tone="inverse" className="scene-inverse relative h-svh min-h-[34rem] overflow-hidden bg-inverse">
      <div aria-hidden={false} className="absolute inset-0">
        <Facade label={site.close.street} open={h.open} closed={h.closed} mode="close" />
      </div>
      <div className="absolute inset-x-0 bottom-0 px-sheet-margin pb-[7svh]">
        <RevealText as="h2" by="lines" className="m-0 max-w-[15ch] pb-[0.08em] font-display text-[clamp(2.75rem,1.2rem+5.2vw,6rem)] leading-[1] tracking-[-0.025em] text-on-inverse">
          {site.close.line}
        </RevealText>
      </div>
    </section>
  );
}
