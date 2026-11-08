// photo-read (Struq kit)
// Reading what a photograph holds under a box on the screen, for the blocks that choose an ink or a veil from the
// photo itself. The whole image is drawn once to a small offscreen canvas and kept as a grid of luminances; a box is
// then mapped onto that grid through the element's object-fit: cover and its object-position.
//
// Why the whole image: with a srcset, img.naturalWidth is density-corrected (a 1920w file shown at 1440 reports
// 1440), while drawImage's source rectangle counts the file's real pixels. A sub-rectangle mapped from naturalWidth
// therefore lands up and to the left of where it should. Drawing the whole image to fill the grid only uses the ratio
// of naturalWidth to naturalHeight, which is right either way.
//
//   const ys = photoLuminances(img, frame, box);   // sorted ascending, or null when it cannot be read
//   const median = ys && ys[Math.floor(ys.length * 0.5)];
//
// Returns null, so the caller keeps its safe treatment, when the photo is not loaded, comes from another origin
// (reading it would taint the canvas) or the canvas cannot be read.

export type PhotoBox = { x: number; y: number; w: number; h: number };

const GRID_W = 320;

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

type Grid = { w: number; h: number; y: Float32Array };
const grids = new WeakMap<HTMLImageElement, { src: string; grid: Grid | null }>();

/** The photo's luminance on a small grid of the whole image, read once per source and kept. */
function gridOf(img: HTMLImageElement): Grid | null {
  const src = img.currentSrc || img.src;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!src || !img.complete || !iw || !ih) return null;
  const kept = grids.get(img);
  if (kept && kept.src === src) return kept.grid;
  let grid: Grid | null = null;
  try {
    if (new URL(src, location.href).origin !== location.origin) throw new Error("other origin");
    const w = GRID_W;
    const h = Math.max(1, Math.round((w * ih) / iw));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const y = new Float32Array(w * h);
      for (let k = 0; k < w * h; k += 1) {
        y[k] = 0.2126 * linear(d[k * 4] / 255) + 0.7152 * linear(d[k * 4 + 1] / 255) + 0.0722 * linear(d[k * 4 + 2] / 255);
      }
      grid = { w, h, y };
    }
  } catch {
    grid = null;
  }
  grids.set(img, { src, grid });
  return grid;
}

/** The element's object-position as two shares (0 to 1); percentages and keywords, anything else is centred. */
function positionOf(img: HTMLImageElement): [number, number] {
  const parts = (getComputedStyle(img).objectPosition || "50% 50%").trim().split(/\s+/);
  const share = (v: string | undefined) => {
    if (!v) return 0.5;
    if (v.endsWith("%")) {
      const n = parseFloat(v) / 100;
      return Number.isFinite(n) ? n : 0.5;
    }
    if (v === "left" || v === "top") return 0;
    if (v === "right" || v === "bottom") return 1;
    if (v === "center") return 0.5;
    return 0.5;
  };
  return [share(parts[0]), share(parts[1] ?? parts[0])];
}

/**
 * The luminances of the photo under `at`, sorted ascending. `frame` is the box the image is drawn into (object-fit:
 * cover at its object-position), in the same coordinates as `at`; pass `position` to override the element's own.
 */
export function photoLuminances(
  img: HTMLImageElement,
  frame: PhotoBox,
  at: PhotoBox,
  position?: [number, number],
): number[] | null {
  if (frame.w <= 0 || frame.h <= 0 || at.w <= 0 || at.h <= 0) return null;
  const g = gridOf(img);
  if (!g) return null;
  const [px, py] = position ?? positionOf(img);
  // Frame pixels per grid cell, and where the covered image starts in the frame.
  const c = Math.max(frame.w / g.w, frame.h / g.h);
  const ox = frame.x + (frame.w - g.w * c) * px;
  const oy = frame.y + (frame.h - g.h * c) * py;
  const x0 = Math.max(0, Math.floor((at.x - ox) / c));
  const x1 = Math.min(g.w, Math.max(x0 + 1, Math.ceil((at.x + at.w - ox) / c)));
  const y0 = Math.max(0, Math.floor((at.y - oy) / c));
  const y1 = Math.min(g.h, Math.max(y0 + 1, Math.ceil((at.y + at.h - oy) / c)));
  if (x0 >= g.w || y0 >= g.h || x1 <= 0 || y1 <= 0) return null;
  const ys: number[] = [];
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) ys.push(g.y[y * g.w + x]);
  return ys.length ? ys.sort((a, b) => a - b) : null;
}
