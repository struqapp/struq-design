"use client";
// components/struq/quiet/Statement.tsx (Struq recipe)
// The type moment of a quiet scene: one sentence at the sheet's moment size, set from the page grid's first column, on
// the same left edge as the header wordmark and the heroes' type. A small label stands in the margin columns beside the
// first line, on its baseline; a small upright photo hangs off the end of the last line, so the sentence and the
// picture read as one composed plate instead of a big line in an empty room.
//
// <Statement accent="hand" label="Werkplaats Zuid, sinds 1998" image={images.column[0]}>
//   Klei onthoudt elke hand die haar vormt.
// </Statement>
//
// Props
// - children: the sentence, plain text. Two to five lines at moment size on a wide screen.
// - accent: one word of the sentence, set in the pairing's italic accent face (--face-accent). One per page.
// - label: small, sentence case, body face. Beside the first line (wide screens), under the sentence (phones).
// - image: a StruqImage, shown upright (4/5) and small: two columns wide, five on a phone.
// - as: "h2" (default) or "p" when the page already has its heading here.
// - className: on the root, for example "scene-inverse" or "scene-field"; the tokens turn inside it.
//
// Mounting: a page section of its own, between two blocks. The root carries data-scene="statement" and
// data-energy="1", so the film check counts it as a quiet scene.
//
// Motion: it enters once. The lines rise through their masks as the sentence scrolls in (SplitHeadline), the label
// follows (Reveal), the photo opens from its foot (MediaFrame, no parallax). No pin, no scrub, no hover motion. Reduced
// motion: a short fade, nothing travels. Without scripts: the composed scene, the photo in its place on the grid.
//
// The hang: once the faces are in (document.fonts.ready) the end of the last line is measured, in whole pixels, from
// the line's mask (which never moves, so a line still rising reads where it will stand). If the photo fits between that
// end and the grid's right edge, one gutter on, it hangs there from the line's top; otherwise it keeps its place on the
// grid. Its place on the grid keeps its room either way, so the page never jumps when it moves. Measured again when
// the width changes.
import { useEffect, useRef } from "react";
import { ScrollTrigger } from "../gsap";
import { MediaFrame } from "../MediaFrame";
import { Reveal } from "../Reveal";
import { SplitHeadline } from "../SplitHeadline";
import type { StruqImage } from "../images";
import { LABEL, SCENE_SPACE, SHEET_GRID } from "./sheet";

type Props = {
  children: string;
  accent?: string;
  label?: string;
  image?: StruqImage;
  as?: "h2" | "p";
  className?: string;
};

/** The sentence, with its accent word (the first time it occurs) in the accent face. */
function withAccent(text: string, accent?: string) {
  const at = accent ? text.indexOf(accent) : -1;
  if (!accent || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <em className="font-accent italic">{accent}</em>
      {text.slice(at + accent.length)}
    </>
  );
}

/** Where the last line ends and where its line box starts, in viewport pixels. */
function lastLineEnd(head: HTMLElement) {
  const lines = head.querySelectorAll<HTMLElement>(".struq-line");
  const last = lines[lines.length - 1];
  const range = document.createRange();
  range.selectNodeContents(last ?? head);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
  const end = rects[rects.length - 1];
  if (!end) return null;
  const mask = last?.parentElement;
  if (!mask) return { right: end.right, top: end.top };
  // A cut line may still be rising inside its mask; the mask stands still, its padding is the room above the line.
  return { right: end.right, top: mask.getBoundingClientRect().top + (parseFloat(getComputedStyle(mask).paddingTop) || 0) };
}

export function Statement({ children, accent, label, image, as = "h2", className = "" }: Props) {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = grid.current;
    if (!box || !image) return;
    const head = box.querySelector<HTMLElement>("[data-split]");
    const slot = box.querySelector<HTMLElement>("[data-hang-slot]");
    const frame = box.querySelector<HTMLElement>("[data-hang-frame]");
    if (!head || !slot || !frame) return;
    let alive = true;
    let timer = 0;

    const unhang = () => {
      frame.style.position = "";
      frame.style.left = "";
      frame.style.top = "";
      frame.style.width = "";
      delete box.dataset.hang;
    };
    const place = () => {
      if (!alive) return;
      unhang();
      const g = box.getBoundingClientRect();
      const cs = getComputedStyle(box);
      const inner = Math.round(g.right - (parseFloat(cs.paddingRight) || 0) - g.left);
      const gap = Math.round(parseFloat(cs.columnGap) || 0);
      const w = Math.round(slot.getBoundingClientRect().width);
      const end = lastLineEnd(head);
      if (!end || w === 0) return;
      const x = Math.round(end.right - g.left) + gap;
      const y = Math.round(end.top - g.top);
      if (x + w > inner) return;
      // Never over the label: a one line sentence has the label beside it, a phone has it under the sentence.
      const tag = box.querySelector<HTMLElement>("[data-scene-label]")?.getBoundingClientRect();
      const h = Math.round((w * 5) / 4);
      if (tag && tag.width > 0) {
        const t = { left: tag.left - g.left, right: tag.right - g.left, top: tag.top - g.top, bottom: tag.bottom - g.top };
        if (x < t.right + gap && x + w + gap > t.left && y < t.bottom + gap && y + h + gap > t.top) return;
      }
      frame.style.position = "absolute";
      frame.style.left = `${x}px`;
      frame.style.top = `${y}px`;
      frame.style.width = `${w}px`;
      box.dataset.hang = "1";
      // The photo's entrance is triggered by where it stands, which just moved.
      ScrollTrigger.refresh();
    };
    const later = () => {
      window.clearTimeout(timer);
      // After SplitText's own re-cut on a width change.
      timer = window.setTimeout(place, 260);
    };

    (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(place));
    window.addEventListener("resize", later);
    document.fonts?.addEventListener?.("loadingdone", later);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener("resize", later);
      document.fonts?.removeEventListener?.("loadingdone", later);
      unhang();
    };
  }, [image, children, accent]);

  return (
    <section data-scene="statement" data-energy="1" className={`text-ink ${SCENE_SPACE} ${className}`}>
      <div ref={grid} className={`relative items-start gap-y-10 md:items-baseline md:gap-y-12 ${SHEET_GRID}`}>
        <SplitHeadline as={as} on="scroll" className="col-span-12 m-0 text-sheet-moment md:col-span-10">
          {withAccent(children, accent)}
        </SplitHeadline>
        {label ? (
          <Reveal y={16} className="col-span-6 md:col-span-2 md:col-start-11">
            <p data-scene-label="" className={LABEL}>
              {label}
            </p>
          </Reveal>
        ) : null}
        {image ? (
          // The photo's place on the grid: it keeps its room when the photo hangs off the last line instead.
          <div data-hang-slot="" className="col-span-5 col-start-8 aspect-[4/5] md:col-span-2 md:col-start-9 md:self-start">
            <div data-hang-frame="" className="w-full">
              <MediaFrame image={image} ratio="4/5" parallax={false} sizes="(min-width: 768px) 17vw, 40vw" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
