#!/usr/bin/env node
// Struq imagery: download one beeldbank pack into the project.
//
//   node <skill-dir>/scripts/images.mjs <pack-slug>          run from the project root
//   node <skill-dir>/scripts/images.mjs <pack-slug> --dir ./my-site
//   node <skill-dir>/scripts/images.mjs --list                every pack, with what it shows
//   node <skill-dir>/scripts/images.mjs --brief "<the brief>"  picks the pack and the fitting photos
//   node <skill-dir>/scripts/images.mjs <pack-slug> --brief "<the brief>"
//
// With --brief (always pass it): the pack follows Struq's rule (scripts/packs.mjs) when no slug is
// given, and photos whose alt names a subject the client does not do are left out, best fit first.
//
// What it does, in order:
// 1. Reads the pack from https://struq.app/api/media/packs/<slug> (public, no key, CC0 images),
//    or from https://struq.nl when struq.app does not answer.
// 2. Downloads all 24 images to public/images/<slot>-<n>.webp and checks each one is a real image.
// 3. Writes lib/struq-images.ts (src/lib/ when the project uses src/): every image with its alt,
//    size and description, grouped by slot, plus the credit line. Components import from it.
// 4. If Struq cannot be reached, or a file fails its check, it writes a graded fallback plate
//    in the site palette for that slot instead, so no frame is ever empty, and says so.
//
// Node 18 or later, no dependencies. Safe to run again: a file is kept only when the last run
// downloaded it from the same source (struq-pack.json records each one); a file from another pack
// is replaced, and a slot file the new pack no longer fills is removed.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { appendLog } from "./log.mjs";
import { fitImages, packForBrief, packReason } from "./packs.mjs";

// Struq lives at struq.app. The old domain struq.nl keeps answering the pack API and the media for
// installed skills, so a run tries struq.app first and falls back to struq.nl when struq.app gives a
// network error, a non-2xx answer or something that is not the pack.
// STRUQ_API_BASE points a test run at another Struq environment (for example https://staging.struq.app),
// with no fallback. Real users never set it: the default is production.
const DEFAULT_BASES = ["https://struq.app", "https://struq.nl"];
const BASES = process.env.STRUQ_API_BASE ? [process.env.STRUQ_API_BASE.replace(/\/+$/, "")] : DEFAULT_BASES;
const PACKS = "/api/media/packs";
const HOSTS = BASES.map((b) => b.replace(/^https?:\/\//, "")).join(" and ");
/** The base that last answered the pack API; image downloads try it first. */
let activeBase = BASES[0];
/** The bases in the order to try: the one that answered first, then the rest. */
const basesInOrder = () => [activeBase, ...BASES.filter((b) => b !== activeBase)];
/** Download URLs on the same bases as the API (directPath), or the absolute publicUrl. */
const imageUrls = (img) => (img.directPath ? basesInOrder().map((b) => `${b}${img.directPath}`) : [img.publicUrl]);
const SLOTS = ["hero", "band", "card", "column", "detail", "backdrop"];
const FALLBACK_COUNTS = { hero: 3, band: 2, card: 8, column: 4, detail: 4, backdrop: 3 };
const FALLBACK_SIZE = {
  hero: [2048, 1152],
  band: [2352, 1008],
  card: [2048, 1365],
  column: [1600, 2000],
  detail: [1600, 1600],
  backdrop: [2048, 1152],
};

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const root = resolve(flag("--dir") ?? process.cwd());
const brief = flag("--brief");
const slug = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--dir" && args[i - 1] !== "--brief") ?? (brief ? packForBrief(brief) : undefined);
const why = brief && !args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--dir" && args[i - 1] !== "--brief") ? packReason(brief) : "named on the command line";

/** GET a path of the pack API from each base in turn; the first JSON answer wins and sets activeBase. */
async function getJson(path) {
  const errors = [];
  for (const base of basesInOrder()) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`${url} answered ${res.status}`);
      const json = await res.json();
      activeBase = base;
      return json;
    } catch (error) {
      errors.push(error.message.startsWith(url) ? error.message : `${url}: ${error.message}`);
    }
  }
  throw new Error(errors.join("; "));
}

function isImage(buf) {
  if (!buf || buf.length < 8000) return false;
  const ascii = (a, b) => buf.subarray(a, b).toString("latin1");
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return true;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && ascii(1, 4) === "PNG") return true;
  if (ascii(4, 12) === "ftypavif") return true;
  return false;
}

function fileIsImage(path) {
  try {
    return statSync(path).size > 8000 && isImage(readFileSync(path));
  } catch {
    return false;
  }
}

/** Tries each URL twice in turn; returns the URL that gave a real image, or null. */
async function download(urls, path) {
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!isImage(buf)) continue;
        writeFileSync(path, buf);
        return url;
      } catch {
        // retry once, then the next base, then fall back
      }
    }
  }
  return null;
}

function readPalette() {
  const palette = { s0: "#f5efe6", s1: "#ede4d6", s2: "#e1d4bf", s3: "#cdbb9f", ink: "#1e1a15", accent: "#8a3b22" };
  for (const file of ["app/globals.css", "src/app/globals.css", "src/styles/globals.css", "styles/globals.css"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const css = readFileSync(path, "utf8");
    // Literal colours only (hex or oklch); a color-mix() step falls back to its neighbour.
    const pick = (name) => css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{3,8}|oklch\\([^)]*\\))`))?.[1];
    palette.s0 = pick("surface-0") ?? palette.s0;
    palette.s1 = pick("surface-1") ?? palette.s1;
    palette.s2 = pick("surface-2") ?? (pick("surface-1") ? palette.s1 : palette.s2);
    palette.s3 = pick("surface-3") ?? (pick("surface-0") ? palette.s0 : palette.s3);
    palette.ink = pick("ink") ?? palette.ink;
    palette.accent = pick("accent") ?? palette.accent;
    break;
  }
  return palette;
}

// A graded plate in the site palette: two planes of light, a horizon hairline, film grain.
// Not a photo, but never an empty box: it reads as a deliberate abstract image.
function fallbackSvg(slot, n, [w, h], p) {
  let seed = (slot.length * 977 + n * 131) % 2147483647;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const x1 = Math.round(w * (0.15 + rnd() * 0.4));
  const x2 = Math.round(x1 + w * (0.25 + rnd() * 0.25));
  const tilt = Math.round(w * (0.08 + rnd() * 0.12));
  const horizon = Math.round(h * (0.55 + rnd() * 0.2));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="${Math.round(w / 60)}"/></filter>
  <rect width="${w}" height="${h}" fill="${p.s2}"/>
  <polygon filter="url(#soft)" points="${x1},0 ${x2},0 ${x2 + tilt},${h} ${x1 + tilt},${h}" fill="${p.s0}" opacity="0.85"/>
  <polygon filter="url(#soft)" points="${x2 + w * 0.05},0 ${x2 + w * 0.12},0 ${x2 + w * 0.12 + tilt},${h} ${x2 + w * 0.05 + tilt},${h}" fill="${p.s1}" opacity="0.7"/>
  <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${p.s3}" opacity="0.55"/>
  <rect y="${horizon}" width="${w}" height="2" fill="${p.ink}" opacity="0.35"/>
  <rect width="${w}" height="${h}" filter="url(#g)"/>
</svg>
`;
}

function libDir() {
  return existsSync(join(root, "src", "app")) ? join(root, "src", "lib") : join(root, "lib");
}

function writeModule(entries, packSlug, fallback, imageFit = "full") {
  const dir = libDir();
  mkdirSync(dir, { recursive: true });
  const grouped = Object.fromEntries(SLOTS.map((s) => [s, entries.filter((e) => e.slot === s)]));
  const body = SLOTS.map((s) => {
    const rows = grouped[s]
      .map((e) => {
        const fields = [
          `src: ${JSON.stringify(e.src)}`,
          `alt: ${JSON.stringify(e.alt)}`,
          `width: ${e.width}`,
          `height: ${e.height}`,
          `ratio: ${JSON.stringify(e.ratio)}`,
          `description: ${JSON.stringify(e.description)}`,
        ];
        if (e.negativeSpace) fields.push(`negativeSpace: ${JSON.stringify(e.negativeSpace)}`);
        if (e.unoptimized) fields.push("unoptimized: true");
        return `    { ${fields.join(", ")} },`;
      })
      .join("\n");
    return `  ${s}: [\n${rows}\n  ],`;
  }).join("\n");
  const source = `// Written by the Struq skill (scripts/images.mjs). Do not hand-edit the list: run the script again
// to change pack. Pack: ${packSlug}${fallback ? " (FALLBACK PLATES: Struq was unreachable, run the script again when online)" : ""}.
// Beeldbank images are CC0. Translate the alt texts when the site is not in Dutch.

export type StruqImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** "16:9", "21:9", "3:2", "4:5" or "1:1" */
  ratio: string;
  /** What the photo shows, in more words than the alt: read it to choose the right slot. */
  description: string;
  /** The photo's calm side ("left", "right", "top", "bottom", "center"): where copy reads over it. */
  negativeSpace?: string;
  /** Set on fallback plates (SVG), which next/image must not optimise. */
  unoptimized?: boolean;
};

export type ImageSlot = ${SLOTS.map((s) => JSON.stringify(s)).join(" | ")};

export const imagePack = ${JSON.stringify(packSlug)};

/**
 * "full": the pack shows this client's world. "partial": only the photos whose alt names something
 * the brief is about are here. "none": no photo fits, so the first screen is typographic or the
 * WebGL scene, and the approval stop asks the client for photos. Never fill a frame with an
 * off-topic photo.
 */
export const imageFit: "full" | "partial" | "none" = ${JSON.stringify(imageFit)};

/** The credit line for the footer: one quiet text-small link, never a badge. */
export const imageCredit = { label: "Beeld: Struq", href: "https://struq.app/photos" };

export const images: Record<ImageSlot, StruqImage[]> = {
${body}
};
`;
  const file = join(dir, "struq-images.ts");
  writeFileSync(file, source);
  return file;
}

/** file -> source from the last run's struq-pack.json; empty when there was no run or it is unreadable. */
function readManifest(outDir) {
  try {
    const data = JSON.parse(readFileSync(join(outDir, "struq-pack.json"), "utf8"));
    return new Map((data.images ?? []).map((i) => [i.file, i.source]));
  } catch {
    return new Map();
  }
}

/**
 * Removes the slot files (hero-1.webp, card-3.svg, ...) this run did not write, so a photo or plate
 * from an earlier pack can never sit under this pack's caption. Other files in public/images stay.
 */
function removeStale(outDir, manifest) {
  const written = new Set(manifest.map((m) => m.file.split("/").pop()));
  const slotFile = new RegExp(`^(${SLOTS.join("|")})-\\d+\\.(webp|svg)$`);
  for (const name of readdirSync(outDir)) {
    if (slotFile.test(name) && !written.has(name)) unlinkSync(join(outDir, name));
  }
}

async function list() {
  const index = await getJson(PACKS);
  console.log(`${index.packCount} packs, ${index.totalImages} images, ${index.license}\n`);
  for (const p of index.packs) console.log(`${p.slug.padEnd(10)} ${p.description}`);
}

async function main() {
  if (args.includes("--list")) return list();
  if (!slug) {
    console.error('Usage: node images.mjs --brief "<the brief>" | <pack-slug> --brief "<the brief>"   [--dir <project>]   (or --list)');
    process.exit(2);
  }
  if (!existsSync(join(root, "package.json"))) {
    console.error(`No package.json in ${root}. Run this from the project root, or pass --dir.`);
    process.exit(2);
  }
  const outDir = join(root, "public", "images");
  mkdirSync(outDir, { recursive: true });
  const palette = readPalette();
  const previous = readManifest(outDir);

  let pack = null;
  let droppedImages = [];
  let imageFit = "full";
  try {
    pack = await getJson(`${PACKS}/${encodeURIComponent(slug)}`);
    if (!Array.isArray(pack?.images) || pack.images.length === 0) throw new Error("pack has no images");
  } catch (error) {
    try {
      const index = await getJson(PACKS);
      const known = index.packs.map((p) => p.slug);
      if (!known.includes(slug)) {
        console.error(`Unknown pack "${slug}". Packs: ${known.join(", ")}`);
        process.exit(2);
      }
    } catch {
      // the API itself is down: fall through to the plates
    }
    console.warn(`WARN ${HOSTS} unreachable (${error.message}). Writing graded fallback plates instead.`);
    pack = null;
  }

  const entries = [];
  const manifest = [];
  let real = 0;
  let plates = 0;

  if (pack) {
    const counters = Object.fromEntries(SLOTS.map((s) => [s, 0]));
    if (brief) {
      const fit = fitImages(slug, brief, pack.images);
      pack.images = fit.keep;
      droppedImages = fit.dropped;
      imageFit = fit.fit;
    } else {
      console.warn('WARN no --brief: every photo of the pack is used. Pass --brief so photos of subjects this client does not do are left out.');
    }
    const jobs = pack.images
      .filter((img) => SLOTS.includes(img.slot))
      .map((img) => {
        const n = ++counters[img.slot];
        return { img, n, name: `${img.slot}-${n}` };
      });
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        const target = join(outDir, `${job.name}.webp`);
        const urls = imageUrls(job.img);
        const last = previous.get(`public/images/${job.name}.webp`);
        // The same photo from either base counts as the same source.
        const kept = urls.includes(last) && fileIsImage(target);
        const source = kept ? last : await download(urls, target);
        if (source) {
          real++;
          entries.push({
            slot: job.img.slot,
            order: job.n,
            src: `/images/${job.name}.webp`,
            alt: job.img.alt ?? "",
            width: job.img.width ?? FALLBACK_SIZE[job.img.slot][0],
            height: job.img.height ?? FALLBACK_SIZE[job.img.slot][1],
            ratio: job.img.aspectRatio ?? "",
            description: job.img.description ?? "",
            negativeSpace: job.img.negativeSpace ?? "",
          });
          // bytes lets check.mjs tell this file from one an earlier pack left under the same name.
          manifest.push({ file: `public/images/${job.name}.webp`, id: job.img.id, slot: job.img.slot, source, bytes: statSync(target).size });
        } else {
          plates++;
          const size = [job.img.width ?? FALLBACK_SIZE[job.img.slot][0], job.img.height ?? FALLBACK_SIZE[job.img.slot][1]];
          writeFileSync(join(outDir, `${job.name}.svg`), fallbackSvg(job.img.slot, job.n, size, palette));
          entries.push({
            slot: job.img.slot,
            order: job.n,
            src: `/images/${job.name}.svg`,
            alt: job.img.alt ?? "",
            width: size[0],
            height: size[1],
            ratio: job.img.aspectRatio ?? "",
            description: `Fallback plate (download failed). Planned: ${job.img.description ?? ""}`,
            unoptimized: true,
          });
          manifest.push({ file: `public/images/${job.name}.svg`, id: job.img.id, slot: job.img.slot, source: "fallback" });
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  } else {
    for (const slot of SLOTS) {
      for (let n = 1; n <= FALLBACK_COUNTS[slot]; n++) {
        plates++;
        const size = FALLBACK_SIZE[slot];
        writeFileSync(join(outDir, `${slot}-${n}.svg`), fallbackSvg(slot, n, size, palette));
        entries.push({
          slot,
          order: n,
          src: `/images/${slot}-${n}.svg`,
          alt: "",
          width: size[0],
          height: size[1],
          ratio: `${size[0]}:${size[1]}`,
          description: "Fallback plate in the site palette (Struq was unreachable).",
          unoptimized: true,
        });
        manifest.push({ file: `public/images/${slot}-${n}.svg`, id: null, slot, source: "fallback" });
      }
    }
  }

  entries.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || a.order - b.order);
  removeStale(outDir, manifest);
  writeFileSync(join(outDir, "struq-pack.json"), JSON.stringify({ pack: slug, images: manifest }, null, 2) + "\n");
  const module = writeModule(entries, slug, !pack, imageFit);

  console.log(`\nPack ${slug} (${why}): ${real} images downloaded and verified, ${plates} fallback plates.`);
  if (droppedImages.length) console.log(`Left out ${droppedImages.length} photos that do not fit this client (${[...new Set(droppedImages.map((d) => d.reason))].join("; ")}).`);
  console.log("Captions: write them from each photo's alt below. Never name a subject the photo does not show.");
  if (imageFit === "none") {
    console.log("NONE of this pack's photos fits the brief. Use no photos: a background block (aurora, silk, facets) carries the hero's type.");
    console.log("Say so at the approval stop: \"Ik heb geen foto's van je <product>: stuur ze, dan komen ze in de hero.\"");
  } else if (imageFit === "partial") {
    console.log(`Only ${entries.length} photo(s) fit: use them where their alt fits (the material, the city, the street), and nowhere else.`);
  }
  console.log(`Module: ${module.replace(root, ".")}  (import { images, imageCredit } from "@/lib/struq-images")\n`);
  for (const e of entries) {
    console.log(`${`images.${e.slot}[${e.order - 1}]`.padEnd(18)} ${e.ratio.padEnd(5)} ${e.description.slice(0, 110)}`);
  }
  if (plates > 0) {
    console.log(`\nWARN ${plates} slot(s) use fallback plates. Run this script again when Struq answers.`);
  }
  appendLog(root, "Step 4 Images", [
    `images.mjs: pack ${slug} (${why}), ${real} images downloaded and verified, ${plates} fallback plates.`,
    ...(droppedImages.length ? [`Left out ${droppedImages.length} photos that do not fit this client: ${[...new Set(droppedImages.map((d) => d.reason))].join("; ")}.`] : []),
    ...(imageFit !== "full" ? [`Image fit: ${imageFit}${imageFit === "none" ? ", the opener is typographic or WebGL, and the approval stop asks for photos" : ""}.`] : []),
    `Files in public/images, list in ${module.replace(root, ".")}${activeBase !== DEFAULT_BASES[0] ? `, from ${activeBase}` : ""}.`,
  ]);
  console.log(imageFit === "none" ? "\nOK no fitting photos: build the opener without them" : real > 0 ? "\nOK images ready" : "\nOK fallback plates ready (no frame is empty)");
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
