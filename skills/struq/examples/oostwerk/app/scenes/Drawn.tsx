"use client";
// app/scenes/Drawn.tsx: "From drawing to doorway." A museum's visit page at a wide screen and on a phone. Until the
// scene enters, the page is its sketch: pencil boxes in the ink, layout notes in the accent italic, the photo slot
// crossed and the first headline struck through. As it enters (held a beat on the drawing), the page is built block
// by block with its type, colour and image, the paper turns to the page's own ground and the pencil leaves. Plays
// once; quiet in the film (it enters once and holds). No pin.
// Reduced motion and no scripts: the built page.
import { useRef } from "react";
import { Reveal } from "@/components/struq/kit/Reveal";
import { SplitHeadline } from "@/components/struq/kit/SplitHeadline";
import { feel } from "@/components/struq/kit/feel";
import { gsap, useGSAP } from "@/components/struq/kit/gsap";
import { site } from "@/lib/site";
import { images } from "@/lib/struq-images";
import { SitePage } from "./SitePage";

const visitPhoto = { ...images.column[2], alt: "A tall column of clean-cut white paper catching daylight from the side" };

export function Drawn() {
  const root = useRef<HTMLElement>(null);
  const d = site.drawn;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const pages = gsap.utils.toArray<HTMLElement>("[data-site-page]", el);
        const wires = pages.flatMap((pg) => Array.from(pg.querySelectorAll<HTMLElement>("[data-wire-line]")));
        const sketch = pages.flatMap((pg) => Array.from(pg.querySelectorAll<HTMLElement>("[data-sketch]")));
        const fills = pages.flatMap((pg) => Array.from(pg.querySelectorAll<HTMLElement>("[data-fill]")));
        const paper = pages.map((pg) => pg.querySelector<HTMLElement>("[data-paper]")).filter(Boolean);
        // Until it enters, the page is its drawing: pencil boxes, the notes, the crossed photo, the struck headline.
        gsap.set(paper, { opacity: 1 });
        gsap.set(wires, { opacity: 1 });
        gsap.set(sketch, { opacity: 1 });
        gsap.set(fills, { clipPath: "inset(100% 0% 0% 0%)" });
        // As it enters, held a beat on the drawing, the page is built block by block and the pencil leaves. Once.
        const f = feel(el);
        gsap
          .timeline({ delay: 0.6, scrollTrigger: { trigger: el.querySelector("[data-pages]"), start: "top 55%", once: true } })
          .to(sketch, { opacity: 0, duration: 0.5, stagger: 0.04, ease: f.ease.exit })
          .to(fills, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, stagger: 0.07, ease: f.ease.enter }, 0.25)
          .to(paper, { opacity: 0, duration: 0.6, ease: "none" }, 0.35)
          .to(wires, { opacity: 0, duration: 0.5 }, ">-0.2");
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="drawn" data-scene="drawn" data-energy="1" data-bar-tone="ground" className="relative bg-surface-0 pt-28 pb-12 md:pt-36 md:pb-14">
      <div className="grid grid-cols-12 gap-x-sheet-gutter gap-y-10 px-sheet-margin">
        <div className="col-span-12 flex flex-col gap-5 md:col-span-5 md:pt-8">
          <SplitHeadline as="h2" on="scroll" className="font-display text-h2 text-ink">
            {d.heading}
          </SplitHeadline>
          <Reveal>
            <p className="text-body max-w-[38ch] text-ink-muted">{d.text}</p>
          </Reveal>
        </div>
        <figure data-pages="" className="col-span-12 m-0 md:col-span-7">
          <div className="relative flex items-end gap-[3%]">
            <div className="relative w-[74%] md:w-[78%]">
              <SitePage {...d.sample} image={visitPhoto} sketch={d.sketch} tone="ink" layout="poster" paper className="aspect-[16/10] w-full" />
            </div>
            <div className="relative w-[23%] md:w-[19%]">
              <SitePage {...d.sample} image={visitPhoto} sketch={d.sketch} tone="ink" layout="poster" frame="phone" paper className="aspect-[9/19] w-full" />
            </div>
          </div>
          <figcaption className="text-small mt-5 text-ink-muted">{d.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
