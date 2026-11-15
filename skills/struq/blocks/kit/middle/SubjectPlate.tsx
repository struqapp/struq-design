"use client";
// components/struq/kit/middle/SubjectPlate.tsx (Struq recipe)
// The trade's own object, drawn properly, set with a short text: the scene that replaces the invented diagram. An
// app's screen or its invoice, a plumber's section drawing of a fitting or a quote, a pattern piece, a mug in section,
// a conference ticket. The piece is a kit/subject component the agent fills from the brief only. Three variants, each
// extracted from a source:
//
// - "beside": the piece across seven columns, the heading and one or two paragraphs across four, one empty column as
//   the breath; the text stands on the piece's foot. From kit/quiet/PhotoText, with the piece in place of the photo.
// - "under": the piece large and centred, the heading beside it in the margin columns on its first line, the text
//   under it as a caption. From kit/quiet/Statement and the layouts on app/lab/subject.
// - "two": two related pieces side by side (a quote and its invoice), one caption under both. From app/lab/subject.
//
// <SubjectPlate variant="beside" heading="An invoice that chases itself." text={["Tally sends it, reminds them and marks it paid."]}
//   caption="An invoice as Tally sends it" piece={<Document kind="invoice" currency="EUR" lines={[...]} />} />
//
// Props
// - piece: a kit/subject component (Document, AppScreen, Ticket, PatternPaper, SectionDrawing), filled from the brief.
// - second: optional, a second piece for "two".
// - heading: optional, at h2. text: optional, one or two paragraphs. caption: optional, small, under the piece (or
//   under both): it sets what the piece is ("An invoice as Tally sends it"), so example amounts read as an example of
//   the kind, never as a real client's total.
// - variant: "beside" (default), "under" or "two". side: "left" (default) or "right", the piece's side in "beside".
// - tone: "ground" (default), "inverse" or "field" (scene-inverse, scene-field in blocks.css). className: on the root.
//
// Empty slots and fallbacks (code, not advice): "two" without a second piece renders "beside"; "beside" with neither a
// heading nor text renders "under" (a piece beside an empty column reads unfinished). No caption: no caption line. No
// heading: the piece opens the scene. The piece carries only what its own props allow; each subject part already
// refuses guessed dates and numbers, and this scene adds no slot for a client name, a reference or a total.
// resolveSubjectVariant() returns the variant that renders.
//
// Mounting: a page section of its own. The root carries data-scene="subject", data-variant (the rendered one),
// data-energy="1" and data-middle. No pin.
//
// Motion (kit/feel.ts, data-temperament on <body>): the heading's lines rise (./entrance), the paragraphs and the
// caption follow; the piece builds on its own timeline with the scroll (the drawing's lines, the ticket's grid, the
// screen's one state change), which is the scene's one loud move: crisp builds in one pass, slow in held steps, by the
// piece's own feel. Reduced motion: the composed scene, the piece finished. Without scripts: composed.
//
// Phones: heading, the piece at full width (each piece has its own narrow layout), then the text and the caption.
import { useRef, type ReactNode } from "react";
import { useGSAP } from "../gsap";
import { LABEL, SHEET_GRID } from "../quiet/sheet";
import { entrance } from "./entrance";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type SubjectVariant = "beside" | "under" | "two";

type Props = {
  piece: ReactNode;
  second?: ReactNode;
  heading?: string;
  text?: string[];
  caption?: string;
  side?: "left" | "right";
  variant?: SubjectVariant;
  tone?: SceneTone;
  className?: string;
};

/** The variant that renders: two needs its second piece, beside needs words to stand beside the piece. */
export function resolveSubjectVariant(variant: SubjectVariant, plate: { second?: ReactNode; heading?: string; text?: string[] }): SubjectVariant {
  if (variant === "two" && !plate.second) return "beside";
  const words = Boolean(plate.heading || plate.text?.length);
  if ((variant === "beside" || variant === "two") && !plate.second && !words) return "under";
  return variant;
}

function useEntrance(ref: React.RefObject<HTMLElement | null>, key: string) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [key] },
  );
}

function Paragraphs({ text, className = "" }: { text?: string[]; className?: string }) {
  if (!text?.length) return null;
  return (
    <div className={`grid gap-5 ${className}`}>
      {text.slice(0, 2).map((p) => (
        <p key={p} data-part="detail" className="m-0 max-w-[38ch] text-body text-ink-muted">
          {p}
        </p>
      ))}
    </div>
  );
}

function Caption({ caption, className = "" }: { caption?: string; className?: string }) {
  if (!caption) return null;
  return (
    <p data-part="detail" className={`${LABEL} ${className}`}>
      {caption}
    </p>
  );
}

type VariantProps = Omit<Props, "variant" | "tone" | "className"> & { tone: SceneTone; className: string };

function Beside({ piece, heading, text, caption, side = "left", tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, `beside:${side}`);
  const left = side === "left";
  return (
    <section ref={ref} data-scene="subject" data-variant="beside" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`gap-y-6 md:gap-y-5 ${SHEET_GRID}`}>
        <div className={`col-span-12 min-w-0 md:row-start-1 md:col-span-7 ${left ? "md:col-start-1" : "md:col-start-6"}`}>{piece}</div>
        {caption ? <Caption caption={caption} className={`col-span-12 md:row-start-2 md:col-span-7 ${left ? "md:col-start-1" : "md:col-start-6"}`} /> : null}
        <div className={`col-span-12 mt-10 md:row-start-1 md:col-span-4 md:mt-0 md:self-end ${left ? "md:col-start-9" : "md:col-start-1"}`}>
          {heading ? (
            <h2 data-part="heading" className="m-0 text-h2">
              {heading}
            </h2>
          ) : null}
          <Paragraphs text={text} className={heading ? "mt-8 md:mt-10" : ""} />
        </div>
      </div>
    </section>
  );
}

function Under({ piece, heading, text, caption, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "under");
  return (
    <section ref={ref} data-scene="subject" data-variant="under" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`items-start gap-y-10 ${SHEET_GRID}`}>
        {heading ? (
          <h2 data-part="heading" className="col-span-12 m-0 max-w-[14ch] text-h2 md:col-span-3 md:col-start-1 md:row-start-1 md:text-h3">
            {heading}
          </h2>
        ) : null}
        <div className="col-span-12 min-w-0 md:col-span-8 md:col-start-5 md:row-start-1 lg:col-span-6 lg:col-start-4">{piece}</div>
        {caption || text?.length ? (
          <div className="col-span-12 md:col-span-8 md:col-start-5 lg:col-span-6 lg:col-start-4">
            <Caption caption={caption} />
            <Paragraphs text={text} className={caption ? "mt-6" : ""} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Two({ piece, second, heading, text, caption, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "two");
  return (
    <section ref={ref} data-scene="subject" data-variant="two" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`items-start gap-y-12 ${SHEET_GRID}`}>
        {heading || text?.length ? (
          <div className="col-span-12 mb-4 md:col-span-7 md:mb-10">
            {heading ? (
              <h2 data-part="heading" className="m-0 max-w-[18ch] text-h2">
                {heading}
              </h2>
            ) : null}
            <Paragraphs text={text} className={heading ? "mt-8" : ""} />
          </div>
        ) : null}
        <div className="col-span-12 min-w-0 md:col-span-6">{piece}</div>
        <div className="col-span-12 min-w-0 md:col-span-6 md:mt-[10svh]">{second}</div>
        <Caption caption={caption} className="col-span-12" />
      </div>
    </section>
  );
}

export function SubjectPlate({ variant = "beside", tone = "ground", className = "", ...plate }: Props) {
  const v = resolveSubjectVariant(variant, plate);
  const common = { ...plate, tone, className };
  if (v === "two") return <Two {...common} />;
  if (v === "under") return <Under {...common} />;
  return <Beside {...common} />;
}
