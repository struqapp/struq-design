// components/struq/kit/middle/entrance.ts (Struq recipe)
// The one entrance every middle scene shares: its parts in one timeline, fired once by one ScrollTrigger on the
// scene's root, in the locked order heading, then media, then details. A scene marks its parts and calls this from
// its own useGSAP; it is not a wrapper and decides nothing about layout.
//
// <h2 data-part="heading">...</h2>            lines rise through the shared descender-safe mask (RevealText's move)
// <div data-part="media" data-open="bottom">  opens from its foot (MaskWipe's move); data-open="margins" opens out of
//   <img .../>                                the page margins to the edges (the about-studio plate); the first child
// </div>                                      settles from the feel's media scale
// <p data-part="detail">...</p>               rises a block's travel from clear (Rise's move), one after another
//
// const stop = entrance(root, (tl, f, at) => tl.call(openFirstPanel, [], at.end));
//
// Every number comes from the feel of the root (kit/feel.ts, its nearest data-temperament). The root carries
// data-middle; blocks.css holds the parts in their start state before the build (the `.js` / `.sq-js` gate, with a
// 3 s fallback) and the build waits for the faces, capped, so lines are cut in the face they are read in. Reduced
// motion: nothing moves, the parts stand composed. Returns the cleanup.
import { feel, LOCKED, prefersReduced, type Feel } from "../feel";
import { gsap, ScrollTrigger, SplitText } from "../gsap";
import { riseFrom, riseTo } from "../motion/Rise";

/** Where each group starts in the timeline, in seconds, and where the timeline ends. */
export type EntranceMarks = { heading: number; media: number; details: number; end: number };

/** The longest the build waits for the display face, in ms. */
const FONT_CAP = 1200;
/** data-open="margins": the share of the width the plate starts inside, per side. */
const MARGIN = 6;

function faceReady() {
  const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
  return Promise.race([fonts ?? Promise.resolve(), new Promise((res) => window.setTimeout(res, FONT_CAP))]);
}

/**
 * One entrance per group, for a scene that runs long down the page (plates, a sheet of photos): the root is marked
 * ready at once and every element carrying data-middle-group (itself a data-middle root for the gate in blocks.css)
 * gets its own entrance and its own trigger, so a part far down the page opens when it arrives, not with the first.
 * Returns the cleanup.
 */
export function entranceEach(root: HTMLElement): () => void {
  root.dataset.ready = "1";
  const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-middle-group]")).map((group) => entrance(group));
  return () => {
    for (const stop of stops) stop();
  };
}

export function entrance(root: HTMLElement, extend?: (tl: gsap.core.Timeline, f: Feel, at: EntranceMarks) => void): () => void {
  if (prefersReduced()) {
    root.dataset.ready = "1";
    return () => {};
  }
  const f = feel(root);
  let alive = true;
  let tl: gsap.core.Timeline | null = null;
  let trigger: ScrollTrigger | null = null;
  const splits: SplitText[] = [];

  faceReady().then(() => {
    if (!alive) return;
    const heads = Array.from(root.querySelectorAll<HTMLElement>('[data-part="heading"]'));
    const media = Array.from(root.querySelectorAll<HTMLElement>('[data-part="media"]'));
    const details = Array.from(root.querySelectorAll<HTMLElement>('[data-part="detail"]'));
    const lines: Element[] = [];
    for (const head of heads) {
      let first = true;
      splits.push(
        SplitText.create(head, {
          type: "lines",
          mask: "lines",
          linesClass: "struq-line",
          autoSplit: true,
          onSplit(self) {
            // A later re-cut (a width change, a face landing) sets new lines at rest.
            if (!first) return;
            first = false;
            lines.push(...self.lines);
          },
        }),
      );
    }

    tl = gsap.timeline({ paused: true });
    if (lines.length) {
      tl.fromTo(lines, { yPercent: f.travel.text }, { yPercent: 0, duration: f.duration.line, ease: f.ease.enter, stagger: f.stagger.line }, 0);
    }
    const mediaAt = lines.length ? Math.round(f.duration.line * 0.35 * 1000) / 1000 : 0;
    media.forEach((m, i) => {
      const size = m.offsetHeight;
      const at = mediaAt + i * f.stagger.block * 2;
      const closed = m.dataset.open === "margins" ? `inset(0% ${MARGIN}% 0% ${MARGIN}%)` : "inset(100% 0% 0% 0%)";
      tl!.fromTo(m, { clipPath: closed }, { clipPath: "inset(0% 0% 0% 0%)", duration: f.dur("curtain", size), ease: f.ease.curtain }, at);
      const photo = m.firstElementChild;
      if (photo) tl!.fromTo(photo, { scale: f.travel.media }, { scale: 1, duration: f.dur("settle", size), ease: f.ease.enter }, at);
    });
    const detailsAt = media.length ? mediaAt + f.duration.enter * 0.5 : mediaAt;
    if (details.length) tl.fromTo(details, riseFrom(f), { ...riseTo(f), stagger: f.stagger.block }, detailsAt);
    extend?.(tl, f, { heading: 0, media: mediaAt, details: detailsAt, end: tl.duration() });

    root.dataset.ready = "1";
    const play = () => tl?.play();
    trigger = ScrollTrigger.create({ trigger: root, start: LOCKED.trigger.start, once: LOCKED.trigger.once, onEnter: play });
  });

  return () => {
    alive = false;
    trigger?.kill();
    tl?.revert();
    for (const split of splits) split.revert();
  };
}
