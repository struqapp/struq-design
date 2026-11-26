"use client";
// app/scenes/Rommene.tsx: where it hangs. The kit's ServicesList rows on the left; the row nearest the middle of the
// screen is the active room, written on the section as data-room, and world.tsx hangs the lamp to match (low over the
// table, three in a row over the counter, a long cord in the stairwell). On a phone the section has its own ground
// and the list stands alone.
import { useRef } from "react";
import { ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { ServicesList } from "@/components/struq/kit/middle";
import { site } from "@/lib/site";

export function Rommene() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const r = root.current;
    if (!r) return;
    const rows = Array.from(r.querySelectorAll<HTMLElement>("li"));
    const set = (active: number) => {
      r.dataset.room = String(active);
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
    <section ref={root} id="rommene" data-beat="rommene" data-scene="rommene" data-energy="1" data-bar-tone="ground" className="halden-rooms relative bg-surface-1 md:bg-transparent">
      <div className="flex min-h-svh flex-col justify-center md:w-[54%] md:py-24">
        <ServicesList variant="rows" className="w-full bg-transparent! pb-16! md:pb-0!" heading={site.rommene.title} services={site.rommene.rooms} />
      </div>
    </section>
  );
}
