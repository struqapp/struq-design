"use client";
// app/scenes/Werk.tsx: what Van Rijn takes on. The kit's ServicesList rows on the left; the row nearest the middle
// of the screen is the active service, written on the section as data-row, and world.tsx turns the roof to match
// (lib/site.ts, each service's `roof`): a tile lifted and set back, a steeper pitch, the roof stripped and laid flat in
// bitumen, the gutter in the rain, the lead round the chimney, coming closer to what each one fixes. On a phone the
// roof rises out of the frame while the rows pass (world.tsx), so no row ever runs behind it.
import { useRef } from "react";
import { ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { ServicesList } from "@/components/struq/kit/middle";
import { site } from "@/lib/site";

export function Werk() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const r = root.current;
    if (!r) return;
    const rows = Array.from(r.querySelectorAll<HTMLElement>("li"));
    const set = (active: number) => {
      if (r.dataset.row === String(active)) return;
      r.dataset.row = String(active);
      rows.forEach((row, j) => row.toggleAttribute("data-active", active === j));
    };
    set(0);
    ScrollTrigger.create({
      trigger: r,
      start: "top bottom",
      end: "bottom top",
      onUpdate: () => {
        const mid = window.innerHeight / 2;
        let best = Infinity;
        let active = 0;
        rows.forEach((row, i) => {
          const b = row.getBoundingClientRect();
          const d = Math.abs(b.top + b.height / 2 - mid);
          if (d < best) [best, active] = [d, i];
        });
        set(active);
      },
    });
  });

  return (
    <section ref={root} id="werk" data-beat="werk" data-scene="werk" data-energy="1" data-bar-tone="ground" className="vanrijn-werk relative">
      <div className="flex min-h-svh flex-col justify-center md:w-[52%] md:py-28">
        <ServicesList
          variant="rows"
          className="w-full bg-transparent! pb-16! md:pb-0!"
          heading={site.werk.title}
          services={site.werk.services.map(({ name, text }) => ({ name, text }))}
        />
      </div>
    </section>
  );
}
