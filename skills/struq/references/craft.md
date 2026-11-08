# Craft: what makes the blocks feel high end

The blocks already do all of this. Read it when you write the glue between blocks, adapt one, or build a section the
catalogue does not have: your code has to hold the same bar or it shows as the seam.

## Motion

- **One clock.** Lenis runs on `gsap.ticker` (`kit/SmoothScroll.tsx`, mounted once in the layout); ScrollTrigger reads
  it. No second `requestAnimationFrame` loop, no `anticipatePin` with smooth scroll. A menu or overlay calls
  `getLenis()?.stop()` and `start()`.
- **Clip from numbers.** A reveal is a clip on a layer already at its full size, never a scale of the box. Tween plain
  numbers (top, right, bottom, left, radius) and write `clip-path: inset(...)` from them in `onUpdate`; never tween
  one clip-path string into another, which GSAP interpolates through broken intermediate values.
- **Whole pixels.** Round every computed translate, clip edge and fitted size to whole pixels (`Math.round`, or
  `gsap.utils.snap(1)`), so type and hairlines never sit on half pixels and shimmer while they move.
- **Decode before show.** `await img.decode()` (with a catch) before a photo is revealed, cut to or swapped in; a
  sequence of photos starts only when all are decoded. A reveal over an undecoded image shows a blank frame.
- **Scroll-tied and reversing.** A scroll effect scrubs (`scrub: true` or a short number) and runs backwards when the
  visitor scrolls back: scrolling up re-sets the large wordmark, closes the print, lowers the line. A one-way
  entrance on scroll reads as a template. Entrances on load play once.
- **Hold on the key frames.** A pinned stretch spends part of its length still on each composed frame. One idea per
  screen, long eases (`expo.out` in, `power4.inOut` for curtains), nothing bounces.
- **Every entrance moves and fades,** never opacity alone. Lines rise through masks (`SplitText` with `mask: "lines"`,
  the `.struq-line-mask` padding keeps descenders).
- **One handover signal.** Preloaders and page transitions close a cover (`data-curtain="closed"` on `<html>`) and fire
  `curtain:lift` when it opens; a hero runs its entrance through `whenUncovered` from
  `preloaders/preloader-slices-uncovered.ts`, so the same entrance serves the first load and every navigation.

## The gate

- `<html class="sq-js">` is set by an inline script before first paint (the layout recipe). The kit's CSS hides only
  under `.sq-js`: `[data-split]`, `[data-reveal]` children and `[data-frame="mask"]` wait for `data-ready`, and a CSS
  animation shows them anyway after 3 s. A visitor without JavaScript, or a script that throws, still gets the page.
- Never hide content with an inline `opacity: 0` or a class your script removes. Use the gate attributes, or your own
  rule under `.sq-js` with the same 3 s fallback.
- Under `prefers-reduced-motion` every block lands on a composed still: the final frame, no pin, no scrub. Phones get
  the same still where a pin would fight the thumb.

## Photos and type on photos

- **The calm side is measured.** `kit/photo-read.ts` reads the photo's luminance under the type's box; the heroes put
  the headline on the side that needs the weaker veil. The beeldbank's `negativeSpace` sets the first paint and
  breaks a tie; pass `side` only when you know better.
- **A light veil.** Type over a photo gets the weakest flat veil that gives the headline 3:1 and a running line 4.5:1,
  measured from that photo, capped at about a quarter. Never a gradient scrim, never a dark band by habit.
  `--photo-ground` is the palette's own dark ground for a bar or band laid over a photo.
- **Never an empty frame.** Every image slot holds a real photo from `lib/struq-images.ts` or the client. A photo shows
  the world around the client, never their own room, team or product unless it is theirs; captions come from the alt.

## Type

- **Light display weights.** The display face runs at the pairing's weight (`--display-weight`, 300 for most, 400 where
  the face starts at 400, 700 or 800 only for the poster pairings). Never `font-bold` on a heading; hierarchy comes
  from scale: `text-display`, `text-h2`, `text-h3`, `text-lead`, `text-body`, `text-small`.
- **Real faces, measured.** A line fitted to the width (a wordmark, a poster line) is measured after
  `document.fonts.ready` with the loaded face, and refitted on `loadingdone`. Never fit with the fallback face, and
  never ask Google for a weight the family does not ship: `canon.mjs type` requests each face's real range.
- **Word spacing at poster size:** 0.06 to 0.1em on display lines, so tight tracking never runs two words into one.
- One italic accent face at most, on one word of the page.
- One fluid root-rem knob (`html { font-size: clamp(...) }` in globals.css): author in rem; breakpoints change the
  layout, never the size.

## Colour and surface

- Tokens only: `--surface-0` to `--surface-3`, `--ink`, `--ink-muted`, `--accent`, `--accent-ink`, `--line`,
  `--on-photo`, `--photo-ground`, `--inverse`, `--on-inverse`, `--field`, `--on-field`. The surface steps hold the
  ground's hue; mixes are `in oklab`, never `in oklch` (an oklch mix walks round the hue wheel and turns cream lilac).
- **One contrast scene,** at most two: wrap a section in `scene-inverse` (the palette's dark ground, light type) or
  `scene-field` (the accent at full strength); every block inside follows the turned tokens.
- Elevation is a surface step plus a hairline, never a shadow. Radius 0 to 4px. Flat fills, no gradients, no glass.

## Composition

- The display type is the composition, not a heading above it: 12 to 20vw on the poster lines, small body beside it.
- Vary the sections: after a split comes a full-bleed band or hairline rows, never three equal cards. Section padding
  varies by role; one section should feel too empty by template standards.
- Never two pinned pieces back to back: a plain section breathes between them.
