"use client";
// app/scenes/Veggen.tsx: "no two alike". The type holds on the left while world.tsx lowers four more forms beside
// the lamp and lights them one by one; on a phone the type sits low, the row travels past above it, and the type
// fades as the section lets go (useLeave).
import { useRef } from "react";
import { RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";
import { useLeave } from "./leave";

export function Veggen() {
  const root = useRef<HTMLElement>(null);
  const type = useRef<HTMLDivElement>(null);
  useLeave(root, type);
  return (
    <section ref={root} id="veggen" data-beat="veggen" data-scene="veggen" data-energy="2" data-bar-tone="ground" className="relative h-[200svh]">
      <div ref={type} className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col justify-end px-4 pb-[10svh] md:justify-center md:px-[4vw] md:pb-0">
        <div className="md:max-w-[30%]">
          <RevealText as="h2" className="font-display text-h2 text-ink max-w-[12ch]">
            {site.veggen.title}
          </RevealText>
          <p className="text-lead text-ink mt-6 max-w-[26rem]">{site.veggen.text}</p>
        </div>
      </div>
    </section>
  );
}
