// The token block and the font requests, derived exactly as Struq's block lab derives them (lib/lab/tokens.ts,
// lib/canon/surface-ladder.ts, lib/canon/palette-roles.ts, lib/canon/font-sources.ts), so a block in a client
// project wears the same colours and faces it was judged in. Pure functions, no I/O: canon.mjs writes, tests compare.

/* ------------------------------------------------------------------ colour */
const linearise = (byte) => {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const encode = (linear) => {
  const v = linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.round(Math.min(255, Math.max(0, v * 255)));
};

function oklabToLinear({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}
function linearToOklab({ r, g, b }) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** A canon colour (hex or oklch) as linear RGB, or null (background-exposure.ts parseColor). */
export function parseLinear(value) {
  const v = String(value).trim();
  if (v.startsWith("#")) {
    const body = v.slice(1);
    const parts =
      body.length === 3
        ? body.split("").map((c) => parseInt(c + c, 16))
        : body.length === 6
          ? [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16))
          : null;
    if (!parts || parts.some(Number.isNaN)) return null;
    return { r: linearise(parts[0]), g: linearise(parts[1]), b: linearise(parts[2]) };
  }
  if (!v.toLowerCase().startsWith("oklch")) return null;
  const m = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i.exec(v);
  if (!m) return null;
  let L = parseFloat(m[1]);
  if (v.includes("%")) L /= 100;
  const C = parseFloat(m[2]);
  const h = (parseFloat(m[3]) * Math.PI) / 180;
  return oklabToLinear({ L, a: C * Math.cos(h), b: C * Math.sin(h) });
}

export function toHex(c) {
  const clamp = (n) => Math.min(1, Math.max(0, n));
  return `#${[c.r, c.g, c.b].map((x) => encode(clamp(x)).toString(16).padStart(2, "0")).join("")}`;
}

/** sRGB bytes, oklch clamped into gamut first (facets.ts parseColor). */
function parseBytes(input) {
  const value = String(input).trim().toLowerCase();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const d = hex[1].length === 3 ? hex[1].split("").map((x) => x + x).join("") : hex[1];
    return { r: parseInt(d.slice(0, 2), 16), g: parseInt(d.slice(2, 4), 16), b: parseInt(d.slice(4, 6), 16) };
  }
  const ok = value.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/);
  if (!ok) return null;
  const L = ok[1].endsWith("%") ? Number(ok[1].slice(0, -1)) / 100 : Number(ok[1]);
  const h = (Number(ok[3]) * Math.PI) / 180;
  const lin = oklabToLinear({ L, a: Number(ok[2]) * Math.cos(h), b: Number(ok[2]) * Math.sin(h) });
  const enc = (c) => {
    const x = Math.min(1, Math.max(0, c));
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, g)) * 255);
  };
  return { r: enc(lin.r), g: enc(lin.g), b: enc(lin.b) };
}
const luminance = ({ r, g, b }) => 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);

/** WCAG contrast ratio between two canon colours. */
export function contrast(a, b) {
  const ca = parseBytes(a);
  const cb = parseBytes(b);
  if (!ca || !cb) return 0;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Lightness for light or dark: OKLCH L, else the HSL lightness of a hex (lib/lab/tokens.ts). */
export function lightness(v) {
  const m = String(v).match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (m) return m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const h = String(v).match(/^#([0-9a-f]{6})$/i);
  if (!h) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16) / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

/* ------------------------------------------------------------------- roles */
const NEAR_WHITE = "oklch(0.98 0.005 85)";
const NEAR_BLACK = "oklch(0.16 0.01 60)";

function inkFor(ground, own) {
  const ranked = [...own, NEAR_WHITE, NEAR_BLACK]
    .map((ink, order) => ({ ink, order, ratio: contrast(ground, ink) }))
    .sort((a, b) => b.ratio - a.ratio || a.order - b.order);
  const ownPassing = ranked.find((e) => e.order < own.length && e.ratio >= 4.5);
  return (ownPassing ?? ranked[0]).ink;
}

function deepenedField(accent, light) {
  const base = parseLinear(accent);
  if (!base) return { field: accent, ink: inkFor(accent, light) };
  for (let step = 0; step <= 12; step += 1) {
    const f = Math.pow(0.9, step);
    const field = step === 0 ? accent : toHex({ r: base.r * f, g: base.g * f, b: base.b * f });
    const ink = inkFor(field, light);
    if (contrast(field, ink) >= 4.5) return { field, ink };
  }
  return { field: accent, ink: inkFor(accent, light) };
}

/** The field and inverse roles: authored on the palette, else derived from its own colours (palette-roles.ts). */
export function paletteRoles(palette) {
  if (palette.roles) return palette.roles;
  const { background, text, accent } = palette.colors;
  const ink = inkFor(accent, [background, text]);
  const { field, ink: fieldInk } =
    contrast(accent, ink) >= 4.5 ? { field: accent, ink } : deepenedField(accent, [background, text]);
  return { field, fieldInk, inverse: text, inverseInk: background };
}

/** A deeper surface step held on the ground's own hue (surface-ladder.ts). */
export function surfaceStep(surface, ink, pct) {
  const s = parseLinear(surface);
  const k = parseLinear(ink);
  if (!s || !k) return `color-mix(in oklab, ${surface}, ${ink} ${pct}%)`;
  const a = linearToOklab(s);
  const b = linearToOklab(k);
  const t = pct / 100;
  const mixed = { L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t };
  let C = Math.hypot(mixed.a, mixed.b);
  const H = Math.hypot(a.a, a.b) < 0.002 ? Math.atan2(mixed.b, mixed.a) : Math.atan2(a.b, a.a);
  const inGamut = (c) => [c.r, c.g, c.b].every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  while (C > 0 && !inGamut(oklabToLinear({ L: mixed.L, a: C * Math.cos(H), b: C * Math.sin(H) }))) C -= 0.001;
  const deg = ((H * 180) / Math.PI + 360) % 360;
  return `oklch(${mixed.L.toFixed(4)} ${Math.max(0, C).toFixed(4)} ${deg.toFixed(2)})`;
}

/* ------------------------------------------------------------------- faces */
export const headFamily = (stack) => (String(stack ?? "").split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "");

/** The token block, as [name, value] pairs in the lab's order (lib/lab/tokens.ts paletteTokens). */
export function paletteTokens(palette, pairing) {
  const c = palette.colors;
  const roles = paletteRoles(palette);
  const dark = lightness(c.background) < 0.5;
  const accentInk = contrast(c.accent, c.background) >= contrast(c.accent, c.text) ? c.background : c.text;
  const tokens = [
    ["--surface-0", c.background],
    ["--surface-1", c.surface],
    ["--surface-2", surfaceStep(c.surface, c.text, dark ? 9 : 7)],
    ["--surface-3", surfaceStep(c.surface, c.text, dark ? 18 : 16)],
    ["--ink", c.text],
    ["--ink-muted", `color-mix(in oklab, var(--ink) ${dark ? 70 : 66}%, var(--surface-0))`],
    ["--accent", c.accent],
    ["--accent-ink", accentInk],
    ["--accent-2", c.accentAlt ?? c.surface],
    ["--line", "color-mix(in oklab, var(--ink) 13%, transparent)"],
    ["--on-photo", dark ? c.text : c.background],
    ["--photo-ground", dark ? c.background : roles.inverse],
    ["--inverse", roles.inverse],
    ["--on-inverse", roles.inverseInk],
    ["--field", roles.field],
    ["--on-field", roles.fieldInk],
    ["color-scheme", dark ? "dark" : "light"],
    ["--display-weight", String(pairing.displayScale?.weight ?? 300)],
    ["--face-display", `"${headFamily(pairing.display)}"`],
    ["--face-body", `"${headFamily(pairing.body)}"`],
  ];
  if (pairing.accentItalic) tokens.push(["--face-accent", `"${headFamily(pairing.accentItalic)}"`]);
  return tokens;
}

/**
 * Stylesheet URLs for a pairing's faces (lib/lab/tokens.ts fontHrefs): per Google family the face's real weight range
 * and the bare family as a fallback, because css2 refuses a request that names a weight the family lacks.
 */
export function fontHrefs(pairing, { fontWeights = {}, fontProviders = {} } = {}) {
  const hrefs = [];
  const faces = [
    { stack: pairing.display, italic: false },
    { stack: pairing.body, italic: false },
    ...(pairing.accentItalic ? [{ stack: pairing.accentItalic, italic: true }] : []),
  ];
  for (const { stack, italic } of faces) {
    const family = headFamily(stack);
    const provider = fontProviders[family];
    if (!provider || provider === "system") continue;
    if (provider === "fontshare") {
      hrefs.push(`https://api.fontshare.com/v2/css?f[]=${family.toLowerCase().replace(/\s+/g, "-")}@300,400,500,600,700&display=swap`);
      continue;
    }
    const name = family.replace(/\s+/g, "+");
    const range = fontWeights[family];
    const axis = range && range[0] < range[1] ? `${range[0]}..${range[1]}` : null;
    hrefs.push(
      italic
        ? `https://fonts.googleapis.com/css2?family=${name}:${axis ? `ital,wght@1,${axis}` : "ital@1"}&display=swap`
        : `https://fonts.googleapis.com/css2?family=${name}${axis ? `:wght@${axis}` : ""}&display=swap`,
    );
    hrefs.push(`https://fonts.googleapis.com/css2?family=${name}${italic ? ":ital@1" : ""}&display=swap`);
  }
  return [...new Set(hrefs)];
}
