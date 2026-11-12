"use client";
// components/struq/kit/quiet/Rows.tsx (Struq recipe)
// A short list set as hairline rows on the page grid: a term in the display face, one sentence in the body face beside
// it, a hairline from --line above every row and under the last. Never numbered: the terms carry the order. An
// optional heading opens the scene (the label beside it in the margin columns, on its first baseline) and an optional
// upright photo stands in its own column beside the rows, level with the first hairline.
//
// <Rows heading="Hoe een kom ontstaat." label="Vier stappen, zes weken" image={images.column[2]}
//   rows={[{ term: "Draaien", text: "Op de schijf, uit één klomp, in een ochtend." }, ...]} />
//
// Props
// - rows: { term, text }[], three to six. term: one or two words. text: one sentence.
// - heading: optional, at h2 size. label: optional, small, sentence case, beside the heading (or the first row).
// - image: optional StruqImage, shown upright (4/5) in three columns beside the rows; the rows take eight.
// - className: on the root, for example "scene-inverse" or "scene-field".
//
// Mounting: a page section of its own. The root carries data-scene="rows" and data-energy="1". The rows sit on the
// page's own columns (subgrid), so every term starts on the same column as the heading and the blocks around it.
// Motion: it enters once. The heading's lines rise through their masks, the rows follow one after another (Reveal), the
// photo opens from its foot (MediaFrame, no parallax). No pin, no scrub, no hover motion. Reduced motion: a short
// fade. Without scripts: the composed scene. Phones: heading, label, the rows with the sentence under its term, photo.
import { MediaFrame } from "../MediaFrame";
import { Reveal } from "../Reveal";
import { SplitHeadline } from "../SplitHeadline";
import type { StruqImage } from "../images";
import { LABEL, SCENE_SPACE, SHEET_GRID } from "./sheet";

type Row = { term: string; text: string };

type Props = {
  rows: Row[];
  heading?: string;
  label?: string;
  image?: StruqImage;
  className?: string;
};

export function Rows({ rows, heading, label, image, className = "" }: Props) {
  const wide = !image;
  return (
    <section data-scene="rows" data-energy="1" className={`text-ink ${SCENE_SPACE} ${className}`}>
      <div className={`items-start gap-y-10 md:gap-y-16 ${SHEET_GRID}`}>
        {heading ? (
          <SplitHeadline as="h2" on="scroll" className="col-span-12 m-0 text-h2 md:col-span-7 md:self-baseline">
            {heading}
          </SplitHeadline>
        ) : null}
        {label ? (
          <Reveal y={16} className="col-span-8 md:col-span-2 md:col-start-11 md:self-baseline">
            <p className={LABEL}>{label}</p>
          </Reveal>
        ) : null}
        <Reveal
          as="ul"
          y={24}
          stagger={0.07}
          className={`col-span-12 m-0 grid list-none border-b border-line p-0 md:grid-cols-subgrid ${
            wide ? "md:col-span-12" : "md:col-span-8"
          }`}
        >
          {rows.map((row) => (
            <li
              key={row.term}
              className="grid gap-y-2 border-t border-line py-6 md:col-span-full md:grid-cols-subgrid md:items-baseline md:py-8"
            >
              <h3 className="m-0 text-h3 md:col-span-3">{row.term}</h3>
              <p className={`m-0 max-w-[48ch] text-body text-ink-muted ${wide ? "md:col-span-6 md:col-start-5" : "md:col-span-5"}`}>
                {row.text}
              </p>
            </li>
          ))}
        </Reveal>
        {image ? (
          <div className="col-span-8 col-start-5 md:col-span-3 md:col-start-10">
            <MediaFrame image={image} ratio="4/5" parallax={false} sizes="(min-width: 768px) 25vw, 66vw" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
