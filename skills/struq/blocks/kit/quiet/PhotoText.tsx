"use client";
// components/struq/kit/quiet/PhotoText.tsx (Struq recipe)
// A photograph and a short text, set on the page grid: the photo across seven columns, the heading and one or two
// paragraphs across four, one empty column between them as the breath. The text stands on the photo's foot (its last
// line on the photo's lower edge), so the two read as one composition; the caption hangs under the photo, the label at
// the far end of that same line.
//
// <PhotoText image={images.card[1]} ratio="4/3" side="left" heading="Gedraaid, niet gegoten."
//   text={["Elke kom begint als een klomp van vier kilo.", "Wat scheef groeit, mag blijven."]}
//   caption="De draaischijf, ochtendlicht" label="Hoofdstuk twee" />
//
// Props
// - image: a StruqImage. ratio: a CSS aspect ratio for its frame, "4/3" by default ("1/1", "4/5", "3/2" work).
// - side: "left" (default) puts the photo on the left and the text on the right; "right" mirrors it.
// - heading: a short heading, at h2 size. text: one paragraph, or two as a pair.
// - caption: small, under the photo. label: small, sentence case, at the far end of the caption's line.
// - className: on the root, for example "scene-inverse" or "scene-field".
//
// Mounting: a page section of its own. The root carries data-scene="photo-text" and data-energy="1".
// Motion: it enters once. The photo opens from its foot (MediaFrame, no parallax), the heading's lines rise through
// their masks (SplitHeadline), the paragraphs and the caption line follow (Reveal). No pin, no scrub, no hover motion.
// Reduced motion: a short fade. Without scripts: the composed scene. Phones: photo, caption line, then the text.
import { MediaFrame } from "../MediaFrame";
import { Reveal } from "../Reveal";
import { SplitHeadline } from "../SplitHeadline";
import type { StruqImage } from "../images";
import { LABEL, SCENE_SPACE, SHEET_GRID } from "./sheet";

type Props = {
  image: StruqImage;
  ratio?: string;
  side?: "left" | "right";
  heading: string;
  text: string | [string, string];
  caption?: string;
  label?: string;
  className?: string;
};

export function PhotoText({ image, ratio = "4/3", side = "left", heading, text, caption, label, className = "" }: Props) {
  const left = side === "left";
  const paragraphs = Array.isArray(text) ? text : [text];
  return (
    <section data-scene="photo-text" data-energy="1" className={`text-ink ${SCENE_SPACE} ${className}`}>
      <div className={`gap-y-6 md:gap-y-5 ${SHEET_GRID}`}>
        <div className={`col-span-12 md:row-start-1 md:col-span-7 ${left ? "md:col-start-1" : "md:col-start-6"}`}>
          <MediaFrame image={image} ratio={ratio} parallax={false} sizes="(min-width: 768px) 58vw, 100vw" />
        </div>
        {caption || label ? (
          <Reveal
            y={12}
            className={`col-span-12 flex items-baseline justify-between gap-6 md:row-start-2 md:col-span-7 ${
              left ? "md:col-start-1" : "md:col-start-6"
            }`}
          >
            {caption ? <p className={LABEL}>{caption}</p> : <span />}
            {label ? <p className={`${LABEL} text-right`}>{label}</p> : null}
          </Reveal>
        ) : null}
        <div
          className={`col-span-12 mt-10 md:row-start-1 md:col-span-4 md:mt-0 md:self-end ${
            left ? "md:col-start-9" : "md:col-start-1"
          }`}
        >
          <SplitHeadline as="h2" on="scroll" className="m-0 text-h2">
            {heading}
          </SplitHeadline>
          <Reveal y={24} className="mt-8 grid gap-5 md:mt-10">
            {paragraphs.map((p) => (
              <p key={p} className="m-0 max-w-[38ch] text-body text-ink-muted">
                {p}
              </p>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
