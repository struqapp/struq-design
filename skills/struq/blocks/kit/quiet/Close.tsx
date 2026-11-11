"use client";
// components/struq/quiet/Close.tsx (Struq recipe)
// The page's last call: one line of type at the sheet's moment size from the grid's first column, and one link at the
// far end of the line under it, so the eye crosses the page once, from the big line to the small way out. An optional
// hairline frame around the line is the frame motif's last echo; an optional caption sits at the start of the link's
// line, a label in the margin columns beside the line.
//
// <Close line="Kom kijken in de werkplaats." link={{ href: "/contact", label: "Maak een afspraak" }}
//   caption="Open op zaterdag, 10 tot 16 uur" frame />
//
// Props
// - line: the closing sentence, plain text, short (it sets in two or three lines at moment size).
// - link: { href, label }, the one way out. Rendered as a plain <a>; wrap your own Link around it if you route.
// - frame: draws a hairline from --line around the line, one gutter inside it. Use it only when the site's motif is the
//   frame (it echoes the hero's or the centerpiece's frame).
// - caption: small, at the start of the link's line. label: small, beside the line in the margin columns.
// - className: on the root, for example "scene-inverse" or "scene-field".
//
// Mounting: the last section before the footer. The root carries data-scene="close" and data-energy="1".
// Motion: it enters once. The line's rows rise through their masks (SplitHeadline), the caption and the link follow
// (Reveal). No pin, no scrub, no hover motion: the link is underlined at rest and stays so. Reduced motion: a short
// fade. Without scripts: the composed scene. Phones: the line, the label, then the link with the caption under it.
import { Reveal } from "../Reveal";
import { SplitHeadline } from "../SplitHeadline";
import { LABEL, SCENE_SPACE, SHEET_GRID } from "./sheet";

type Props = {
  line: string;
  link: { href: string; label: string };
  frame?: boolean;
  caption?: string;
  label?: string;
  className?: string;
};

export function Close({ line, link, frame = false, caption, label, className = "" }: Props) {
  return (
    <section data-scene="close" data-energy="1" className={`text-ink ${SCENE_SPACE} ${className}`}>
      <div className={`items-start gap-y-10 md:items-baseline md:gap-y-20 ${SHEET_GRID}`}>
        {/* The frame's inset is in the line's own em, so it holds the mask's room for accents and descenders at any
            size and the hairline never crosses a letter. */}
        <div className={`col-span-12 md:col-span-10 ${frame ? "border border-line p-[0.35em] text-sheet-moment" : ""}`}>
          <SplitHeadline as="h2" on="scroll" className="m-0 text-sheet-moment">
            {line}
          </SplitHeadline>
        </div>
        {label ? (
          <Reveal y={16} className="col-span-8 md:col-span-2 md:col-start-11">
            <p className={LABEL}>{label}</p>
          </Reveal>
        ) : null}
        {/* The link first in reading order; on wide screens it takes the far end and the caption the start. */}
        <Reveal
          y={16}
          className="col-span-12 flex flex-col items-start gap-4 md:flex-row-reverse md:items-baseline md:justify-between md:gap-10"
        >
          <a
            href={link.href}
            className="font-body text-h3 font-medium text-ink underline decoration-1 underline-offset-[0.22em]"
          >
            {link.label}
          </a>
          {caption ? <p className={`${LABEL} max-w-[40ch]`}>{caption}</p> : null}
        </Reveal>
      </div>
    </section>
  );
}
