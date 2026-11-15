"use client";
// components/struq/kit/quiet/Close.tsx (Struq recipe)
// The page's last scene before the footer, built from the motion primitives (../motion) and timed by the site's
// temperament. Three shapes; none of them is the site's name at full width, which is never a close.
//
// - "idea": the idea's last line rises out of its masks (RevealText), a ScrubLine draws the motif's line under it as
//   the reader arrives, and the doors sit below. For a site whose last word is the idea itself.
// - "echo": the opening comes back smaller. Its first line wipes in (MaskWipe) or its photo is uncovered
//   (ImageCurtain), at a fraction of its first size, with the doors beside or under it. For a film that ends where it
//   began.
// - "door": the brief gave real ways in (an address, a phone number, an email, a booking or shop URL) and they are the
//   close: set large, each a HoverLink (or a Pressable for a booking or a shop), with the idea in one line above. For
//   a place people visit, call or book.
//
// <Close shape="idea" line="Grown slowly, poured by hand." accent="slowly" motif={{ path: "M2 40 C 120 0, 240 80, 398 30", viewBox: "0 0 400 80" }}
//   doors={[{ kind: "email", href: "mailto:hello@kiln.studio", label: "hello@kiln.studio" }]} />
// <Close shape="echo" echo={{ media: <img src="/hero.jpg" alt="The kiln at dawn" className="h-full w-full object-cover" /> }} line="Back to the kiln." />
// <Close shape="door" line="Bread from four in the morning." doors={[
//   { kind: "address", href: "https://maps.app.goo.gl/...", label: "Oudegracht 12, Utrecht" },
//   { kind: "phone", href: "tel:+31301234567", label: "030 123 45 67" },
//   { kind: "booking", href: "https://book.example/table", label: "Book a table" },
// ]} credit="Bakkerij Oud, since 1962" />
//
// Props
// - shape: "idea" (default), "echo" or "door".
// - line: the idea's line, plain text. idea: the line itself (short, two or three lines at h2). door: one line above
//   the doors. echo: optional, a short lead beside the echo.
// - accent: the site's one accent word, again: set in the pairing's italic accent face where it first stands in line
//   or echo.line (../accent). A word the line does not hold changes nothing.
// - echo (shape "echo"): { line?: string; media?: ReactNode; reveal?: "wipe" | "curtain"; className?: string }. line is
//   the opening's first line, set at h2 (not the opening's poster size); media is the opening's photo (an img, a
//   next/image with fill), shown at about half the page's width, sized by className (default aspect-[4/3]). reveal:
//   "curtain" (default for media) or "wipe" (always for a line).
// - motif (shape "idea"): { path?: string; viewBox?: string }, the ScrubLine under the line. A path echoes a drawn
//   motif; without one it is a straight rule.
// - doors: the real ways in, from the brief only: { label, href?, kind? } with kind "address" | "phone" | "email" |
//   "booking" | "shop" | "link". With an href a door is a HoverLink, or a Pressable when it is a booking or a shop;
//   an address without an href is plain text. With no doors given nothing is rendered for them: never a placeholder,
//   never an invitation without a destination.
// - credit: a small line at the foot (credit, legal, year). wordmark: the name at text size in the foot, if at all.
// - look: the HoverLink look, the site's one ("draw" default, "slide", "color").
// - className: on the root, for example "scene-inverse" or "scene-field".
//
// Mounting: the last section before the footer. The root carries data-scene="close", data-energy="1" and
// data-close-shape. Motion: it enters once, from the primitives: RevealText on the line, ScrubLine scrubbed under it,
// MaskWipe or ImageCurtain on the echo; doors answer hover and press by the feel. No pin. Reduced motion, no scripts
// or the server render: every primitive shows its final state. Phones: one column, the doors stacked.
import type { ReactNode } from "react";
import { withAccent } from "../accent";
import { HoverLink } from "../motion/HoverLink";
import { ImageCurtain } from "../motion/ImageCurtain";
import { MaskWipe } from "../motion/MaskWipe";
import { Pressable } from "../motion/Pressable";
import { RevealText } from "../motion/RevealText";
import { ScrubLine } from "../motion/ScrubLine";
import { LABEL, SCENE_SPACE, SHEET_GRID } from "./sheet";

export type CloseShape = "idea" | "echo" | "door";

export type Door = {
  label: string;
  href?: string;
  kind?: "address" | "phone" | "email" | "booking" | "shop" | "link";
};

type Props = {
  shape?: CloseShape;
  line?: string;
  accent?: string;
  echo?: { line?: string; media?: ReactNode; reveal?: "wipe" | "curtain"; className?: string };
  motif?: { path?: string; viewBox?: string };
  doors?: readonly Door[];
  credit?: string;
  wordmark?: string;
  look?: "draw" | "slide" | "color";
  className?: string;
};

/** One door: a Pressable for a booking or a shop, a HoverLink for any other link, plain text without an href. */
function DoorItem({ door, size, look }: { door: Door; size: "large" | "small"; look: Props["look"] }) {
  const type = size === "large" ? "font-display text-h2" : "font-body text-h3 font-medium";
  if (!door.href) return <p className={`m-0 text-ink ${type}`}>{door.label}</p>;
  if (door.kind === "booking" || door.kind === "shop") {
    return (
      <Pressable
        href={door.href}
        press="fill"
        className={`w-fit px-8 py-4 text-ink shadow-[inset_0_0_0_1px_var(--line)] ${size === "large" ? "font-body text-h3 font-medium" : "font-body text-lead font-medium"}`}
      >
        {door.label}
      </Pressable>
    );
  }
  return (
    <HoverLink href={door.href} look={look} className={`w-fit text-ink ${type}`}>
      {door.label}
    </HoverLink>
  );
}

function Doors({ doors, size, look, className = "" }: { doors?: readonly Door[]; size: "large" | "small"; look: Props["look"]; className?: string }) {
  if (!doors || doors.length === 0) return null;
  return (
    <ul className={`m-0 flex list-none flex-col items-start p-0 ${size === "large" ? "gap-6 md:gap-8" : "gap-4"} ${className}`}>
      {doors.map((door) => (
        <li key={`${door.kind ?? "link"}:${door.label}`}>
          <DoorItem door={door} size={size} look={look} />
        </li>
      ))}
    </ul>
  );
}

function Foot({ credit, wordmark }: { credit?: string; wordmark?: string }) {
  if (!credit && !wordmark) return null;
  return (
    <div className="col-span-12 flex flex-col gap-1 border-t border-line pt-5 md:flex-row md:items-baseline md:justify-between">
      {wordmark ? <p className="m-0 font-body text-body font-medium text-ink">{wordmark}</p> : null}
      {credit ? <p className={LABEL}>{credit}</p> : null}
    </div>
  );
}

export function Close({
  shape = "idea",
  line,
  accent,
  echo,
  motif,
  doors,
  credit,
  wordmark,
  look = "draw",
  className = "",
}: Props) {
  return (
    <section data-scene="close" data-energy="1" data-close-shape={shape} className={`text-ink ${SCENE_SPACE} ${className}`}>
      <div className={`items-start gap-y-12 md:gap-y-20 ${SHEET_GRID}`}>
        {shape === "idea" ? (
          <>
            {line ? (
              <RevealText as="h2" by="lines" className="col-span-12 m-0 max-w-[20ch] font-display text-h2 md:col-span-9">
                {withAccent(line, accent)}
              </RevealText>
            ) : null}
            <div className="col-span-12 text-accent">
              {motif?.path ? (
                <ScrubLine path={motif.path} viewBox={motif.viewBox ?? "0 0 400 80"} className="h-16 w-full md:h-24" />
              ) : (
                <ScrubLine />
              )}
            </div>
            <Doors doors={doors} size="small" look={look} className="col-span-12 md:col-span-6 md:col-start-7" />
          </>
        ) : null}

        {shape === "echo" ? (
          <>
            {echo?.media ? (
              (echo.reveal ?? "curtain") === "curtain" ? (
                <ImageCurtain className={`col-span-12 md:col-span-6 ${echo.className ?? "aspect-[4/3]"}`}>{echo.media}</ImageCurtain>
              ) : (
                <MaskWipe from="left" settle className={`relative col-span-12 overflow-hidden md:col-span-6 ${echo.className ?? "aspect-[4/3]"}`}>
                  {echo.media}
                </MaskWipe>
              )
            ) : null}
            {echo?.line ? (
              <MaskWipe from="left" className={`col-span-12 ${echo.media ? "md:col-span-6" : "md:col-span-9"}`}>
                <p className="m-0 max-w-[20ch] font-display text-h2">{withAccent(echo.line, accent)}</p>
              </MaskWipe>
            ) : null}
            <div className={`col-span-12 flex flex-col gap-8 ${echo?.media && !echo.line ? "md:col-span-5 md:col-start-8 md:self-end" : "md:col-span-6 md:col-start-7"}`}>
              {line ? (
                <RevealText as="p" by="lines" className="m-0 max-w-[32ch] font-body text-lead text-ink-muted">
                  {withAccent(line, accent)}
                </RevealText>
              ) : null}
              <Doors doors={doors} size="small" look={look} />
            </div>
          </>
        ) : null}

        {shape === "door" ? (
          <>
            {line ? (
              <RevealText as="p" by="lines" className="col-span-12 m-0 max-w-[40ch] font-body text-lead text-ink-muted md:col-span-8">
                {withAccent(line, accent)}
              </RevealText>
            ) : null}
            <Doors doors={doors} size="large" look={look} className="col-span-12" />
          </>
        ) : null}

        <Foot credit={credit} wordmark={wordmark} />
      </div>
    </section>
  );
}
