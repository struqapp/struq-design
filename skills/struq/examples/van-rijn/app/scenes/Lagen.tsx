"use client";
// app/scenes/Lagen.tsx: the centerpiece. World.tsx builds the roof again from the rafters up while this scene names
// each layer as it lands: the list reads the same schedule as the world (schedule.ts) and the kit's roofLayerAt, so
// the layer in ink is the layer being laid. When the tiles and the gutter are on, the rain comes back and runs off.
// Held for five screens (sticky). On a wide screen the five layers stand as a list beside the roof; on a phone the
// active layer is set large under the roof, with the five names in one line above it.
import { useRef, useState } from "react";
import { roofLayerAt, roofLayers } from "@/components/struq/kit/gl";
import { ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";
import { useLeave } from "./leave";
import { lagenBuild } from "./schedule";

const LAYERS = roofLayers("tile");

export function Lagen() {
  const root = useRef<HTMLElement>(null);
  const type = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useLeave(root, type);

  useGSAP(() => {
    if (!root.current) return;
    ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom top",
      // A layer is named from the moment the one under it is finished, so the bare rafters read as "Sporen".
      onUpdate: (self) => setActive(roofLayerAt(Math.max(0, lagenBuild(self.progress) - 1e-4), LAYERS)),
    });
  });

  const { lagen } = site;
  const current = lagen.layers[active];
  return (
    <section ref={root} id="lagen" data-beat="lagen" data-scene="lagen" data-energy="3" data-bar-tone="ground" className="relative h-[520svh]">
      <div ref={type} className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col justify-end px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:justify-center md:px-[4vw] md:pb-0">
        <div className="md:max-w-[38%]">
          <RevealText as="h2" className="font-display text-h2 text-ink max-w-[13ch]">
            {lagen.title}
          </RevealText>
          <p className="text-body text-ink-muted mt-4 hidden max-w-[34ch] md:block">{lagen.lead}</p>

          {/* Wide screens: the five layers, the one being laid in ink with its line under it. */}
          <ul aria-label={lagen.label} className="mt-10 hidden border-t border-line md:block">
            {lagen.layers.map((layer, i) => (
              <li key={layer.name} aria-current={i === active ? "step" : undefined} className="border-b border-line py-3.5">
                <div className="flex items-baseline gap-4">
                  <span aria-hidden className={`h-px w-6 shrink-0 self-center bg-accent transition-transform duration-500 origin-left ${i === active ? "scale-x-100" : "scale-x-0"}`} />
                  <span className={`font-display text-h3 transition-colors duration-500 ${i === active ? "text-ink" : "text-ink-muted"}`}>{layer.name}</span>
                </div>
                <p className={`text-body text-ink ml-10 max-w-[34ch] overflow-hidden transition-[max-height,margin] duration-500 ${i === active ? "mt-1 max-h-24" : "max-h-0"}`}>{layer.text}</p>
              </li>
            ))}
          </ul>

          {/* Phones: the five names in one line, then the active layer large. */}
          <div className="mt-5 md:hidden">
            <p aria-hidden className="text-small flex flex-wrap gap-x-3">
              {lagen.layers.map((layer, i) => (
                <span key={layer.name} className={i === active ? "text-ink" : "text-ink-muted"}>
                  {layer.name}
                </span>
              ))}
            </p>
            <div aria-live="polite" className="mt-3 border-t border-line pt-3">
              <p className="font-display text-h3 text-ink">{current.name}</p>
              <p className="text-body text-ink mt-1 min-h-[3lh] max-w-[34ch]">{current.text}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
