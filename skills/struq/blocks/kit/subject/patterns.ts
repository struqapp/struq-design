// components/struq/kit/subject/patterns.ts (Struq recipe)
// The pattern pieces PatternPaper draws: five women's blocks at about a European size 38, in centimetres, each the
// net piece (the stitching line) as straight and cubic segments, from which the cut line is offset outward. Drafted
// the way a block is drafted, and checked against the anatomy every block shares:
// - Bodice front: front neck 8.5 deep and 7 wide, a quarter curve that leaves the shoulder at a right angle and meets
//   centre front square; shoulder sloping 20 degrees; the armhole scoops inward to the cross-front (17.6) before it
//   swings out to the underarm; waist dart under the bust point; centre front on the fold.
// - Bodice back: back neck only 2.2 deep; a longer shoulder; a shallower armhole (cross-back 18.8); waist dart;
//   centre back on the fold.
// - Sleeve: a set-in sleeve cap, an S curve each side (the underarm part scoops, the crown part swells), crown 14 high,
//   the front side steeper than the back; underarm seams tapering to the wrist; a 3 cm hem.
// - Skirt panel: an A-line front, the waist rising 1.5 to the side, a hip curve to 20 below the waist, a flared side
//   seam, the hem curved to meet the side seam and the fold square; a 4 cm hem; centre front on the fold.
// - Trouser front: the crotch curve scoops inward from the centre front line to the crotch point 27 below the
//   waist; the crease line (grain) halfway across the hip; knee and hem narrower; a 4 cm hem.
// Notches: one on a front armhole, two on a back armhole (and on the sleeve's back), as every commercial pattern marks
// them. Each template ends where it starts, so the outline closes.
import type { Outline, Pt } from "./draw";

export type PieceName = "bodice-front" | "bodice-back" | "sleeve" | "skirt-panel" | "trouser-front";

export type PatternTemplate = {
  outline: Outline;
  /** The seam allowance where a segment does not set its own. */
  allowance: number;
  /** The straight grain arrow, from and to. */
  grain: [Pt, Pt];
  /** A fold edge: the segment index lying on it and its bracket's span along it (two points on the fold). */
  fold?: { side: "CF" | "CB"; from: Pt; to: Pt };
  /** Notches: on segment `seg` at t (0 to 1); `count` 2 for a back notch. */
  notches: { seg: number; t: number; count?: 1 | 2 }[];
  /** Darts: the two legs on segment `seg` at t1 and t2, the apex. */
  darts: { seg: number; t1: number; t2: number; apex: Pt }[];
  /** The label block's top left corner and its width, in the piece's units. */
  label: { at: Pt; width: number };
  /** True when the piece is cut as a pair (no fold). */
  pair: boolean;
  /** Long pieces lie on their side on a wide sheet. */
  long?: boolean;
  /** Where the label block stands once a long piece is turned (turned coordinates). */
  turnedLabel?: { at: Pt; width: number };
};

export const PATTERN_PIECES: Record<PieceName, PatternTemplate> = {
  "bodice-front": {
    outline: {
      start: [0, 8.5],
      segs: [
        { to: [7, 0], c1: [3.86, 8.5], c2: [7, 4.69] },
        { to: [19.5, 4.5] },
        { to: [17.6, 14], c1: [18.9, 7.5], c2: [17.6, 10.5] },
        { to: [23, 21], c1: [17.6, 18.5], c2: [19.8, 21] },
        { to: [21.5, 38] },
        { to: [0, 39.5], c1: [14, 38.8], c2: [6, 39.5] },
        { to: [0, 8.5], fold: true },
      ],
    },
    allowance: 1.5,
    grain: [
      [16.4, 23],
      [16.4, 34],
    ],
    fold: { side: "CF", from: [0, 13], to: [0, 35] },
    notches: [
      { seg: 3, t: 0.18 },
      { seg: 4, t: 0.45 },
    ],
    darts: [{ seg: 5, t1: 0.44, t2: 0.62, apex: [9.5, 26] }],
    label: { at: [2, 11.2], width: 12.5 },
    pair: false,
  },
  "bodice-back": {
    outline: {
      start: [0, 2.2],
      segs: [
        { to: [7.5, 0], c1: [4.2, 2.2], c2: [7.5, 1.2] },
        { to: [20.5, 4.6] },
        { to: [18.8, 15], c1: [19.7, 8], c2: [18.8, 11.5] },
        { to: [23, 21.5], c1: [18.8, 18.8], c2: [20.3, 21.5] },
        { to: [21.5, 38.5] },
        { to: [0, 38], c1: [14, 38.4], c2: [6, 38] },
        { to: [0, 2.2], fold: true },
      ],
    },
    allowance: 1.5,
    grain: [
      [16.6, 23],
      [16.6, 34],
    ],
    fold: { side: "CB", from: [0, 8], to: [0, 34] },
    notches: [
      { seg: 3, t: 0.22, count: 2 },
      { seg: 4, t: 0.45 },
    ],
    darts: [{ seg: 5, t1: 0.43, t2: 0.59, apex: [10, 23] }],
    label: { at: [2, 7.5], width: 13 },
    pair: false,
  },
  sleeve: {
    outline: {
      start: [0, 14],
      segs: [
        { to: [8.5, 8], c1: [3.5, 14], c2: [6, 11.5] },
        { to: [17, 0], c1: [11, 4.5], c2: [13.5, 0] },
        { to: [25.8, 7.8], c1: [20.8, 0], c2: [23.3, 4.2] },
        { to: [34, 14], c1: [28.2, 11.2], c2: [30.6, 14] },
        { to: [29, 58] },
        { to: [5, 58], allowance: 3 },
        { to: [0, 14] },
      ],
    },
    allowance: 1.5,
    grain: [
      [17, 34],
      [17, 52],
    ],
    notches: [
      { seg: 0, t: 0.62, count: 2 },
      { seg: 1, t: 0.999 },
      { seg: 3, t: 0.4 },
    ],
    darts: [],
    label: { at: [8.6, 17.5], width: 16.8 },
    pair: true,
  },
  "skirt-panel": {
    outline: {
      start: [0, 1.5],
      segs: [
        { to: [18, 0], c1: [6, 1.5], c2: [13, 1.1] },
        { to: [22.5, 20], c1: [20.5, 6], c2: [21.8, 12] },
        { to: [29, 62] },
        { to: [0, 64], c1: [20, 63.4], c2: [10, 64], allowance: 4 },
        { to: [0, 1.5], fold: true },
      ],
    },
    allowance: 1.5,
    grain: [
      [17, 36],
      [17, 56],
    ],
    fold: { side: "CF", from: [0, 10], to: [0, 58] },
    notches: [
      { seg: 2, t: 0.02 },
      { seg: 0, t: 0.999 },
    ],
    darts: [{ seg: 0, t1: 0.455, t2: 0.585, apex: [9.75, 11] }],
    label: { at: [2.5, 18], width: 14 },
    pair: false,
  },
  "trouser-front": {
    outline: {
      start: [5.5, 0],
      segs: [
        { to: [23.5, 0.6] },
        { to: [25.8, 18], c1: [25.2, 6], c2: [25.8, 12] },
        { to: [23.4, 60], c1: [25.8, 36], c2: [23.4, 48] },
        { to: [22.4, 95] },
        { to: [3.4, 95], allowance: 4 },
        { to: [2.4, 60] },
        { to: [0, 27], c1: [2.4, 45], c2: [1.5, 34] },
        { to: [4.5, 18], c1: [3, 26.6], c2: [4.5, 23] },
        { to: [5.5, 0] },
      ],
    },
    allowance: 1.5,
    grain: [
      [12.9, 50],
      [12.9, 86],
    ],
    notches: [
      { seg: 7, t: 0.999 },
      { seg: 1, t: 0.999 },
      { seg: 2, t: 0.999 },
      { seg: 5, t: 0.999 },
    ],
    darts: [{ seg: 0, t1: 0.439, t2: 0.55, apex: [14.4, 9] }],
    label: { at: [6.2, 30], width: 13.5 },
    pair: true,
    long: true,
    turnedLabel: { at: [24, -22.5], width: 24 },
  },
};

/** A template turned a quarter (waist to the left), for a long piece on a wide sheet. */
export function turned(template: PatternTemplate): PatternTemplate {
  const t = (p: Pt): Pt => [p[1], -p[0]];
  return {
    ...template,
    outline: {
      start: t(template.outline.start),
      segs: template.outline.segs.map((seg) => ({
        ...seg,
        to: t(seg.to),
        c1: seg.c1 ? t(seg.c1) : undefined,
        c2: seg.c2 ? t(seg.c2) : undefined,
      })),
    },
    grain: [t(template.grain[0]), t(template.grain[1])],
    fold: template.fold ? { ...template.fold, from: t(template.fold.from), to: t(template.fold.to) } : undefined,
    darts: template.darts.map((dart) => ({ ...dart, apex: t(dart.apex) })),
    label: template.turnedLabel ?? { at: t([template.label.at[0] + template.label.width, template.label.at[1]]), width: template.label.width },
  };
}
