// components/struq/accent.ts (Struq recipe)
// The site's one accent word: the same word, set in the pairing's italic accent face (--face-accent), in the opening
// headline and again in the last scene. Every block that takes an `accent` prop marks it with this one helper, so the
// word looks the same wherever it stands.
//
// withAccent("Waar valt het licht?", "licht")        -> Waar valt het <em>licht</em>?
// accentLines(["Ruimte die", "blijft."], "blijft")   -> ["Ruimte die", <>...<em>blijft</em>.</>]
//
// The match: the first time the word stands in the text as a whole word, case-insensitive, with the text's own casing
// kept. Punctuation attached to the word (or passed with it, "vuur.") stays outside the mark. A word the text does not
// hold changes nothing and throws nothing: the text comes back as it went in.
//
// The mark is a plain inline <em>: it stays a text-level element, so SplitText carries it into whichever line it lands
// on when it cuts (and cuts again on a resize), and it sits inside the line's mask (.struq-line-mask), whose room
// above and below the line holds the accent face's tallest and deepest glyph. Its size and leading are the line's
// own; only the face and the slant change. A block that fits its type to a width measures with the mark in place, and
// waits for the accent face with accentFaceReady before it trusts a measure.
import { createElement, Fragment, type ReactNode } from "react";

/** The accent's classes: the pairing's accent face (blocks.css --font-accent), italic. Nothing else changes. */
export const ACCENT_CLASS = "font-accent italic";

export type AccentParts = { before: string; word: string; after: string };

/** The word itself: the accent with any punctuation or space around it taken off. */
function coreOf(accent: string) {
  return accent.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/** Where the accent stands in the text, split around it; null when the text does not hold it. */
export function findAccent(text: string, accent?: string): AccentParts | null {
  const word = accent ? coreOf(accent) : "";
  if (!word || !text) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").exec(text);
  if (!match) return null;
  return {
    before: text.slice(0, match.index),
    word: match[0],
    after: text.slice(match.index + match[0].length),
  };
}

function marked({ before, word, after }: AccentParts): ReactNode {
  return createElement(Fragment, null, before, createElement("em", { className: ACCENT_CLASS, "data-accent": "" }, word), after);
}

/** The text with its accent word (the first time it occurs) in the accent face; the text itself when it is absent. */
export function withAccent(text: string, accent?: string): ReactNode {
  const parts = findAccent(text, accent);
  return parts ? marked(parts) : text;
}

/**
 * A headline given as lines (or as words, for a block that sets one word per row): the first line that holds the
 * accent gets the mark, every other line comes back as the same string.
 */
export function accentLines(lines: readonly string[], accent?: string): ReactNode[] {
  let done = false;
  return lines.map((line) => {
    if (done) return line;
    const parts = findAccent(line, accent);
    if (!parts) return line;
    done = true;
    return marked(parts);
  });
}

/**
 * Resolves once the accent face of every mark under `root` is loaded (or failed), so a fit measures the italic as it
 * will stand. Resolves at once when there is no mark, no font loading API, or nothing to wait for.
 */
export function accentFaceReady(root: ParentNode | null | undefined): Promise<void> {
  if (!root || typeof document === "undefined" || !document.fonts?.load) return Promise.resolve();
  const loads = Array.from(root.querySelectorAll<HTMLElement>("[data-accent]")).map((mark) => {
    const cs = getComputedStyle(mark);
    return document.fonts
      .load(`${cs.fontStyle} ${cs.fontWeight} 16px ${cs.fontFamily}`, mark.textContent || undefined)
      .catch(() => []);
  });
  return Promise.all(loads).then(() => undefined);
}
