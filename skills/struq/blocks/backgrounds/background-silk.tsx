"use client";
// background-silk (Struq background recipe)
// Zijde: a sheet of silk in raking light. Long soft folds with a sheen that travels slowly over their crests, the
// sheen in the palette's accent, the cloth one step off the page ground (its surface token). Slow and heavy, like
// expensive fabric, never a liquid. A port of the field idea from Vapor's Zijde (lib/ambient/backdrops/silk.ts:
// diagonal satin folds bent by slow noise, the light catching each crest), drawn here as a continuous surface with a
// real normal and a low light instead of a halftone grid. Raw WebGL (GLSL ES 1.00, so a WebGL1 context runs it too),
// no three.js, self-contained.
//
// <BackgroundSilk variant="fold" lines={["Zacht licht,", "zware stof."]} accent="licht" lead="..." link={{ href: "#werk", label: "Bekijk het werk" }} />
//
// `accent` (optional) is the site's one accent word: where it first stands in the headline it is set in the pairing's
// italic accent face, inside its line's mask, and the type's box is read once that face is in. The Statement and the
// Close carry the same word. Left out, or not in the headline, the hero is exactly as it was.
//
// Three compositions of the same cloth:
// - fold: one large diagonal fold through the right half; the type stands on the calm left. The pointer turns the
//   light a little, so the sheen slides along the fold like a sleeve tilted to a window.
// - ripple: the cloth across the whole screen in low relief, fuller toward the upper right; the pointer sends a slow
//   ripple through it. The type stands bottom left.
// - drape: the cloth hangs from the top edge in pleats to a hem that falls toward the right; the type stands below the
//   hem. Scrolling the hero away draws the cloth down over it and the pleats stretch.
//
// Colour comes from the tokens on the block's own root (ground, surface, ink, accent), read at runtime and read again
// when the lab switches palette or theme, so every palette works light and dark. Behind the type the cloth lies
// flatter (the field itself is quieter there, no veil), and how flat is measured from the drawn pixels: the display
// type holds 3:1 and the small text 4.5:1 over the brightest or darkest pixel under it, with a margin for the moving
// sheen. That measure is taken once (and again on a resize or a palette switch), at three moments of the wandering
// light, and the cloth eases toward it.
//
// Entrance: the canvas is hidden until its first frame is drawn, then fades in; the folds rise from a flat sheet and the
// type rises through masks once nothing covers the page (whenUncovered: a preloader or page transition has started to
// leave, or there is none). Performance: device pixel ratio capped at 1.5, the field drawn at 0.9 of that on a 1x
// screen and two thirds on a dense one (half on phones, with fewer noise octaves), paused off screen and in a hidden
// tab, everything disposed on
// unmount, context loss survived. Reduced motion: one still frame, held. No WebGL: the plain ground with the type.
// No scripts: the composed hero on the plain ground (blocks.css, "--- background-silk ---").
import { useRef } from "react";
import { accentFaceReady, accentLines } from "../kit/accent";
import { gsap, useGSAP } from "../kit/gsap";
import { whenUncovered } from "../preloaders/preloader-slices-uncovered";

export const SILK_VARIANTS = [
  { id: "fold", title: "Plooi" },
  { id: "ripple", title: "Rimpeling" },
  { id: "drape", title: "Draperie" },
] as const;

export type SilkVariant = (typeof SILK_VARIANTS)[number]["id"];

type Props = {
  variant?: SilkVariant;
  /** The headline, one entry per line. Two short lines read best. */
  lines: string[];
  /** The site's one accent word: where it first stands in the headline it is set in the pairing's italic accent face
   * (--face-accent), as the Statement and the Close set it. A word the headline does not hold changes nothing. */
  accent?: string;
  /** One lead sentence under the headline. */
  lead: string;
  /** One text link. */
  link: { href: string; label: string };
  className?: string;
};

type Rgb = [number, number, number];
type Box = { x0: number; y0: number; x1: number; y1: number };

const DPR_CAP = 1.5;
const INTRO = 2.8; // seconds for the folds to rise from a flat sheet
const STILL_T = 26; // the moment a reduced-motion still is drawn at
const HUSH_START = 0.4; // how much relief the cloth keeps behind the type before measuring
const HUSHES = [0.4, 0.3, 0.2, 0.1, 0]; // tried in turn, one per frame, until the type holds
const PROBES = [0, 35, 70]; // seconds ahead the sheen is read at: now, a quarter and half a turn of the light later
const RINGS = 6;

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Space p: x and y in screen heights from the bottom left, so the folds keep their size on any aspect.
const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntro;
uniform float uVariant;
uniform float uPortrait;
uniform vec3 uG;
uniform vec3 uS;
uniform vec3 uI;
uniform vec3 uA;
uniform vec3 uP;
uniform float uDarkGround;
uniform vec3 uPtr;
uniform vec4 uRip[${RINGS}];
uniform vec4 uQHead;
uniform vec4 uQSmall;
uniform float uFeather;
uniform float uHush;
uniform float uScroll;
uniform float uAz;
uniform float uOct;
uniform float uFloor;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uOct) break;
    v += a * n3(p);
    s += a;
    p = p * 2.03 + vec3(1.7, -3.1, 2.3);
    a *= 0.5;
  }
  return v / s;
}

// Fold: one large diagonal fold through the right half (across the top on a tall screen), smaller folds beside it,
// a long slow swell over the whole sheet.
float hFold(vec2 p, float a, float t) {
  vec2 o = mix(vec2(0.74 * a, 0.5), vec2(0.6 * a, 0.74), uPortrait);
  // About 53 degrees on a wide screen: one real diagonal from the lower middle to the upper right.
  vec2 dir = normalize(mix(vec2(0.75, 1.0), vec2(1.0, 0.42), uPortrait));
  vec2 nr = vec2(dir.y, -dir.x);
  float w = fbm(vec3(p * 0.8 + 3.0, t * 0.016)) - 0.5;
  vec2 r = p - o;
  float along = dot(r, dir);
  float d = dot(r, nr) + w * 0.2 + 0.04 * sin(along * 1.7 + t * 0.05);
  float wid = d < 0.0 ? 0.17 : 0.085;
  float big = 0.1 * exp(-d * d / (wid * wid));
  // A lesser fold falling beside it, on its shadow side.
  float d2 = d + 0.3 + 0.05 * sin(along * 2.3 - t * 0.04);
  float wid2 = d2 < 0.0 ? 0.11 : 0.06;
  big += 0.045 * exp(-d2 * d2 / (wid2 * wid2));
  float u = d * 13.0 + w * 2.5 - t * 0.06;
  float small = 0.028 * (sin(u) + 0.3 * sin(2.0 * u + 1.3)) * exp(-abs(d) * 1.6);
  float swell = 0.018 * sin(dot(p, vec2(0.6, 0.8)) * 3.0 + w * 2.0 + t * 0.03);
  float side = mix(smoothstep(0.3 * a, 0.68 * a, p.x), smoothstep(0.34, 0.7, p.y), uPortrait);
  return (big + small) * side + swell * mix(0.2, 1.0, side);
}

// Ripple: long low folds over the whole screen, fuller toward the upper right. The pointer sends a slow ripple through
// them: a band that runs out across the folds (stretched along them, so it reads as cloth, not a drop in water), and
// as it passes the folds lift and shift a little, then settle.
float hRipple(vec2 p, float a, float t) {
  // The crests rise to the right, across the light from the upper left, so it rakes them instead of running along.
  vec2 across = vec2(-0.6, 0.8);
  vec2 along = vec2(0.8, 0.6);
  float pulse = 0.0;
  for (int k = 0; k < ${RINGS}; k++) {
    vec4 rp = uRip[k];
    if (rp.w <= 0.0) continue;
    vec2 r = p - rp.xy / uRes.y;
    float y = dot(r, along);
    float dd = abs(dot(r, across)) - rp.z * 0.13;
    float life = (1.0 - smoothstep(2.5, 7.5, rp.z)) * smoothstep(0.0, 1.0, rp.z);
    pulse += exp(-dd * dd / 0.01) * exp(-y * y / 0.35) * life * rp.w;
  }
  pulse = min(pulse, 1.4);
  float w = fbm(vec3(p * 0.7 + 7.0, t * 0.014)) - 0.5;
  float u = dot(p, across) * 12.0 + w * 3.0 - t * 0.05 + pulse * 1.1;
  // A dark ground shows less of a shallow crest, so the relief is fuller there.
  float folds = mix(0.022, 0.03, uDarkGround) * (sin(u) + 0.35 * sin(2.0 * u + 0.7));
  float u2 = dot(p, vec2(-0.5, 0.87)) * 4.0 + w * 2.0 + t * 0.02;
  float weight = mix(0.4, 1.0, smoothstep(0.15, 0.9, (p.x / a) * 0.6 + p.y * 0.4));
  return (folds * (1.0 + pulse * 0.9) + 0.026 * sin(u2)) * weight;
}

// Drape: pleats hanging from the top edge, shallow where they are gathered and deeper toward the hem. x is the pleat
// phase (also used for the wavy hem), y how far down the cloth the point is, 0 at the top and 1 at the hem.
vec2 drapeAt(vec2 p, float a, float t, out float hem) {
  float yt = 1.0 - p.y;
  float xn = p.x / a;
  float rest = mix(mix(0.3, 0.62, xn), mix(0.34, 0.46, xn), uPortrait);
  // Over the headline's columns the hem stays at least 0.08 screen heights above it (a soft min, so no kink), and it
  // falls to its own line again past the headline's right end.
  if (uQHead.z > uQHead.x) {
    float lim = max(1.0 - uQHead.w / uRes.y - 0.08, 0.05);
    float k = 0.03;
    float held = -k * log(exp(-rest / k) + exp(-lim / k));
    float x1 = uQHead.z / uRes.y;
    rest = mix(rest, held, 1.0 - smoothstep(x1, x1 + 0.35, p.x));
  }
  // The hem holds while the type leaves, then the cloth is drawn down; it never passes the hero's foot, so the hem
  // itself is the hand-over edge.
  hem = rest * mix(0.55, 1.0, uIntro) + max(uScroll - 0.3, 0.0) * 1.8;
  hem = min(hem, 1.0 - uFloor / uRes.y - 0.03);
  float yy = yt / (1.0 + uScroll * 1.5);
  float depth = clamp(yt / max(hem, 0.05), 0.0, 1.0);
  float w = fbm(vec3(p.x * 1.3 + 11.0, yy * 0.9, t * 0.015)) - 0.5;
  // Narrower pleats on a tall screen, so a phone still shows a run of them.
  float f = 22.0 * mix(1.0, 1.7, uPortrait) / (1.0 + uScroll * 0.35);
  float u = p.x * f + w * 4.5 + 0.8 * sin(p.x * 7.0 + 1.3) + 0.5 * sin(t * 0.07 + yy * 1.8) * depth;
  return vec2(u, depth);
}
float hDrape(vec2 p, float a, float t) {
  float hem;
  vec2 ud = drapeAt(p, a, t, hem);
  float amp = 0.02 * mix(0.3, 1.0, sqrt(ud.y)) * (1.0 + uScroll * 0.5);
  // Rounded pleats meeting in soft creases, as hung cloth does.
  float s = sin(ud.x * 0.5);
  return amp * (2.0 * sqrt(s * s + 0.012) - 1.0);
}

float H(vec2 p, float a, float t) {
  if (uVariant < 0.5) return hFold(p, a, t);
  if (uVariant < 1.5) return hRipple(p, a, t);
  return hDrape(p, a, t);
}

// The type's rects: the whole rect is fully quiet, the feather lies outside it.
float quiet(vec2 fc, vec4 r) {
  if (r.z <= r.x) return 0.0;
  vec2 lo = smoothstep(r.xy - uFeather, r.xy, fc);
  vec2 hi = 1.0 - smoothstep(r.zw, r.zw + uFeather, fc);
  return lo.x * lo.y * hi.x * hi.y;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float a = uRes.x / uRes.y;
  vec2 p = fc / uRes.y;
  float t = uTime;
  float e = 1.5 / uRes.y;
  float h0 = H(p, a, t);
  vec2 slope = vec2(H(p + vec2(e, 0.0), a, t) - h0, H(p + vec2(0.0, e), a, t) - h0) / e;
  float q = max(quiet(fc, uQHead), quiet(fc, uQSmall));
  // The folds rise in from a flat sheet, and lie flatter behind the type.
  slope *= uIntro * mix(1.0, uHush, q);
  vec3 n = normalize(vec3(-slope, 1.0));

  // A low light from the upper left that wanders slowly, so the sheen travels over the crests.
  float az = 2.3 + 0.32 * sin(t * 0.045) + uAz;
  // Ripple on a dark ground takes a lower light, so its shallow crests still catch the accent.
  float lz = mix(0.36, 0.28, uDarkGround * step(0.5, uVariant) * step(uVariant, 1.5));
  vec3 L = normalize(vec3(cos(az) * 0.9, sin(az) * 0.9, lz));
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  float diff = dot(n, L) / L.z;
  float nh = max(dot(n, Hv), 0.0);
  // The broad lobe is narrower on a light ground, so it reads as a sheen and never as a patch of colour.
  float ex = mix(24.0, 12.0, uDarkGround);
  float b0 = pow(Hv.z, ex);
  float broad = max(pow(nh, ex) - b0, 0.0) / (1.0 - b0);
  float narrow = max(pow(nh, 90.0) - pow(Hv.z, 90.0), 0.0);

  vec3 deep = mix(mix(mix(uS, uI, 0.26), uA, 0.06), uG * 0.4, uDarkGround);
  vec3 col = uS;
  col = mix(col, deep, smoothstep(0.0, 1.0, clamp(1.0 - diff, 0.0, 1.0)) * 0.85);
  col = mix(col, uP, clamp(diff - 1.0, 0.0, 1.0) * mix(0.7, 0.22, uDarkGround));
  // The far side of the sheet from the light falls off a little.
  float away = dot(p - vec2(0.5 * a, 0.5), normalize(L.xy));
  col = mix(col, deep, clamp(-away * 0.35, 0.0, 0.18));
  // On a light ground the accent is darker than the cloth: the broad sheen there leans to paper with only a trace of
  // the accent, and the accent itself is kept for the narrow line on the crest.
  col = mix(col, mix(mix(uP, uA, 0.25), uA, uDarkGround), broad * mix(0.45, 0.72, uDarkGround));
  col = mix(col, mix(uA, uP, mix(0.68, 0.55, uDarkGround)), narrow * 0.7);

  if (uVariant > 1.5) {
    float hem;
    vec2 ud = drapeAt(p, a, t, hem);
    float yt = 1.0 - p.y;
    float sh = sin(ud.x * 0.5);
    float edge = hem + 0.008 * (2.0 * sqrt(sh * sh + 0.012) - 1.0) * uIntro;
    float aa = 1.5 / uRes.y;
    float inside = 1.0 - smoothstep(edge - aa, edge + aa, yt);
    float shade = exp(-max(yt - edge, 0.0) / 0.035) * (1.0 - q * (1.0 - uHush));
    // The hem is the edge here; only its shadow is let go before the foot.
    shade *= smoothstep(uFloor, uFloor + 0.05 * uRes.y, fc.y);
    vec3 ground = mix(uG, deep, shade * 0.32);
    col = mix(ground, col, inside);
  } else {
    // The cloth settles into the page ground at the hero's foot (uFloor follows the drift), so the hand-over has no
    // seam.
    col = mix(uG, col, smoothstep(uFloor, uFloor + 0.05 * uRes.y, fc.y));
  }

  col += (h21(fc + fract(t * 7.0) * 61.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luminance = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** A colour token as the browser resolves it on the block root, as 0 to 1 sRGB channels. */
function readToken(host: Element, token: string, scratch: CanvasRenderingContext2D | null): Rgb {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  probe.style.color = `var(${token})`;
  host.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  if (!scratch) return [0.5, 0.5, 0.5];
  scratch.clearRect(0, 0, 1, 1);
  scratch.fillStyle = "#000";
  scratch.fillStyle = resolved;
  scratch.fillRect(0, 0, 1, 1);
  const [r = 128, g = 128, b = 128] = scratch.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/** The glyphs' horizontal extent with each mask's own (untransformed) vertical extent, unioned, in client pixels. */
function textBox(masks: Element[]): DOMRect | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const m of masks) {
    const range = document.createRange();
    range.selectNodeContents(m);
    const glyphs = range.getBoundingClientRect();
    const own = m.getBoundingClientRect();
    if (glyphs.width === 0) continue;
    x0 = Math.min(x0, glyphs.left);
    x1 = Math.max(x1, glyphs.right);
    y0 = Math.min(y0, own.top);
    y1 = Math.max(y1, own.bottom);
  }
  return x1 > x0 ? new DOMRect(x0, y0, x1 - x0, y1 - y0) : null;
}

type Field = {
  start: () => void;
  dispose: () => void;
};

/**
 * The cloth's runner: a canvas made here (so a remount gets a fresh context), one program, one triangle. Calls
 * `onFirst` once the first frame is on the canvas, or at once when there is no WebGL at all.
 */
function silkField(
  el: HTMLElement,
  holder: HTMLElement,
  variant: SilkVariant,
  reduce: boolean,
  onFirst: () => void,
): Field {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  holder.append(canvas);
  const scratch = document.createElement("canvas");
  scratch.width = 1;
  scratch.height = 1;
  const ctx2d = scratch.getContext("2d", { willReadFrequently: true });

  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "default",
  };
  const gl = (canvas.getContext("webgl2", attrs) ?? canvas.getContext("webgl", attrs)) as
    | WebGL2RenderingContext
    | WebGLRenderingContext
    | null;

  let firstDone = false;
  const first = () => {
    if (firstDone) return;
    firstDone = true;
    onFirst();
  };

  if (!gl) {
    canvas.remove();
    return { start: first, dispose: () => {} };
  }

  const phone = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  // A 1x screen draws near full size, or the crest highlights smear; a dense screen draws at two thirds.
  const scale = phone ? 0.5 : (window.devicePixelRatio || 1) >= 1.5 ? 0.66 : 0.9;
  const octaves = phone ? 2 : 3;
  const variantIndex = variant === "fold" ? 0 : variant === "ripple" ? 1 : 2;

  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let shaders: WebGLShader[] = [];
  const loc: Record<string, WebGLUniformLocation | null> = {};
  const NAMES = [
    "uRes", "uTime", "uIntro", "uVariant", "uPortrait", "uG", "uS", "uI", "uA", "uP", "uDarkGround", "uPtr", "uRip",
    "uQHead", "uQSmall", "uFeather", "uHush", "uScroll", "uAz", "uOct", "uFloor",
  ];

  const build = (): boolean => {
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        console.warn("background-silk:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return false;
    shaders = [vs, fs];
    program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "aPos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const n of NAMES) loc[n] = gl.getUniformLocation(program, n);
    gl.uniform1f(loc.uVariant, variantIndex);
    gl.uniform1f(loc.uOct, octaves);
    return true;
  };

  const release = () => {
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    for (const s of shaders) gl.deleteShader(s);
    program = null;
    buffer = null;
    shaders = [];
  };

  // State the loop owns.
  let time = reduce ? STILL_T : 0;
  /** When the folds started to rise; -1 while a cover is still over the page, so the sheet waits flat under it. */
  let introAt = -1;
  let stopRise = () => {};
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let lost = false;
  let disposed = false;
  let drawn = false;
  let hush = HUSH_START;
  let hushTarget = HUSH_START;
  let search = -1; // index into HUSHES under test, -1 when settled
  const probes = reduce ? [0] : PROBES;
  const ptr = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
  let tap = false;
  let az = 0;
  let scroll = 0;
  const rings = new Float32Array(RINGS * 4);
  let ringNext = 0;
  let lastRing = { x: 0, y: 0, at: -10 };

  let colours = { ink: 0, muted: 0 };
  let head: Box | null = null;
  let small: Box | null = null;

  const portrait = () => (canvas.height >= canvas.width ? 1 : 0);

  const readColours = () => {
    const g = readToken(el, "--surface-0", ctx2d);
    let s = readToken(el, "--surface-1", ctx2d);
    const i = readToken(el, "--ink", ctx2d);
    const m = readToken(el, "--ink-muted", ctx2d);
    const a = readToken(el, "--accent", ctx2d);
    const lg = luminance(g);
    const li = luminance(i);
    // A palette whose surface is the ground itself still gets a cloth one step off it.
    if (Math.abs(luminance(s) - lg) < 0.006) s = g.map((c, k) => c + (i[k] - c) * 0.06) as Rgb;
    const paper = li > lg ? i : g;
    colours = { ink: li, muted: luminance(m) };
    if (!program) return;
    gl.uniform3fv(loc.uG, g);
    gl.uniform3fv(loc.uS, s);
    gl.uniform3fv(loc.uI, i);
    gl.uniform3fv(loc.uA, a);
    gl.uniform3fv(loc.uP, paper);
    gl.uniform1f(loc.uDarkGround, lg < 0.18 ? 1 : 0);
  };

  // The type's boxes in canvas pixels (y up), read while the hero is at rest.
  const readBoxes = () => {
    const c = canvas.getBoundingClientRect();
    if (c.width === 0) return;
    const sx = canvas.width / c.width;
    const sy = canvas.height / c.height;
    const toBox = (r: DOMRect | null): Box | null =>
      r
        ? { x0: (r.left - c.left) * sx, y0: (c.bottom - r.bottom) * sy, x1: (r.right - c.left) * sx, y1: (c.bottom - r.top) * sy }
        : null;
    head = toBox(textBox(Array.from(el.querySelectorAll("[data-head] .struq-line-mask"))));
    small = toBox(textBox(Array.from(el.querySelectorAll("[data-small] .struq-line-mask"))));
    if (!program) return;
    const set = (l: WebGLUniformLocation | null, b: Box | null) =>
      gl.uniform4f(l, b?.x0 ?? 0, b?.y0 ?? 0, b?.x1 ?? 0, b?.y1 ?? 0);
    set(loc.uQHead, head);
    set(loc.uQSmall, small);
    // A wide feather, so the calm zone has no edge of its own.
    gl.uniform1f(loc.uFeather, 0.25 * canvas.height);
  };

  const resize = () => {
    const r = holder.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * scale;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (!program) return;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(loc.uRes, w, h);
    gl.uniform1f(loc.uPortrait, portrait());
    if (scroll < 0.01) readBoxes();
  };

  /**
   * The worst contrast under the type, as a share of what it needs (1 is exactly enough): the display type against
   * the ink at 3:1, the small text against the muted ink at 4.5:1. Read from the frame just drawn.
   */
  const contrastShare = (): number => {
    let worst = Infinity;
    const read = (b: Box | null, ink: number, need: number) => {
      if (!b) return;
      const x0 = Math.max(0, Math.floor(b.x0));
      const y0 = Math.max(0, Math.floor(b.y0));
      const w = Math.min(canvas.width, Math.ceil(b.x1)) - x0;
      const h = Math.min(canvas.height, Math.ceil(b.y1)) - y0;
      if (w <= 0 || h <= 0) return;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let k = 0; k < px.length; k += 12) {
        const l = luminance([px[k] / 255, px[k + 1] / 255, px[k + 2] / 255]);
        worst = Math.min(worst, contrast(l, ink) / need);
      }
    };
    read(head, colours.ink, 3);
    read(small, colours.muted, 4.5);
    return worst;
  };

  const intro = () => {
    if (reduce) return 1;
    if (introAt < 0) return 0;
    const x = Math.min(1, Math.max(0, (time - introAt) / INTRO));
    return 1 - Math.pow(1 - x, 3);
  };

  /**
   * One step of the hush search: the cloth at full relief and the hush under test, drawn at each probe moment and
   * read back. Drawn before the real frame in the same task, so the probe is never composited. The first hush that
   * holds with a margin for the sheen becomes the target, which the loop eases toward.
   */
  const probeStep = () => {
    if (search < 0 || scroll >= 0.01) return;
    if (!head && !small) {
      search = -1;
      return;
    }
    const h = HUSHES[search];
    gl.uniform1f(loc.uIntro, 1);
    gl.uniform1f(loc.uHush, h);
    gl.uniform1f(loc.uScroll, 0);
    let worst = Infinity;
    for (const ahead of probes) {
      gl.uniform1f(loc.uTime, time + ahead);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      worst = Math.min(worst, contrastShare());
    }
    if (worst >= 1.15 || search === HUSHES.length - 1) {
      hushTarget = h;
      search = -1;
    } else {
      search += 1;
    }
  };

  const draw = () => {
    if (!program || lost) return;
    probeStep();
    gl.uniform1f(loc.uTime, time);
    gl.uniform1f(loc.uIntro, intro());
    gl.uniform3f(loc.uPtr, ptr.x, ptr.y, ptr.z);
    gl.uniform4fv(loc.uRip, rings);
    gl.uniform1f(loc.uHush, hush);
    gl.uniform1f(loc.uScroll, scroll);
    gl.uniform1f(loc.uAz, az);
    // The hero's foot in canvas pixels: the canvas drifts down on scroll, so its own bottom edge is clipped below it.
    const c = canvas.getBoundingClientRect();
    const foot = el.getBoundingClientRect().bottom;
    gl.uniform1f(loc.uFloor, Math.max(0, c.bottom - foot) * (canvas.height / Math.max(1, c.height)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!drawn) {
      drawn = true;
      // The first frame is on the canvas; show it on the next frame, once it has been composited.
      requestAnimationFrame(() => {
        if (disposed) return;
        el.dataset.live = "";
        first();
      });
    }
  };

  const remeasure = () => {
    search = 0;
  };

  const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);

  const frame = (now: number) => {
    raf = 0;
    if (disposed || lost) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    time += dt;

    // The pointer eases in about 0.17s.
    const k = ease(dt, 0.055);
    ptr.x += (ptr.tx - ptr.x) * k;
    ptr.y += (ptr.ty - ptr.y) * k;
    ptr.z += (ptr.tz - ptr.z) * k;
    if (variant === "fold") {
      const target = ptr.tz > 0 ? (ptr.tx / canvas.width - 0.5) * 0.5 : 0;
      az += (target - az) * k;
    }
    if (variant === "ripple") {
      for (let r = 0; r < RINGS; r += 1) {
        if (rings[r * 4 + 3] <= 0) continue;
        rings[r * 4 + 2] += dt;
        if (rings[r * 4 + 2] > 8) rings[r * 4 + 3] = 0;
      }
      const moved = Math.hypot(ptr.x - lastRing.x, ptr.y - lastRing.y) / canvas.height;
      if (tap || (ptr.z > 0.5 && moved > 0.14 && time - lastRing.at > 0.45)) {
        // A touch starts its ring where the finger lands; a mouse leaves one behind as it travels.
        const x = tap ? ptr.tx : ptr.x;
        const y = tap ? ptr.ty : ptr.y;
        const o = ringNext * 4;
        rings[o] = x;
        rings[o + 1] = y;
        rings[o + 2] = 0;
        rings[o + 3] = 1;
        ringNext = (ringNext + 1) % RINGS;
        lastRing = { x, y, at: time };
      }
    }
    tap = false;
    // Paced close to the type's own scrubbed exit, so on drape the hem never runs ahead of the leaving copy.
    const r = el.getBoundingClientRect();
    const target = r.height > 0 ? Math.min(1, Math.max(0, -r.top / r.height)) : 0;
    scroll += (target - scroll) * ease(dt, 0.2);
    if (Math.abs(target - scroll) < 0.0005) scroll = target;

    hush += (hushTarget - hush) * ease(dt, 0.6);
    draw();
    schedule();
  };

  const running = () => !reduce && !disposed && !lost && onScreen && !document.hidden;
  const schedule = () => {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (reduce) {
      draw();
      return;
    }
    last = 0;
    schedule();
  };

  // Reduced motion and no loop: the hush searched out at once, then the still frame drawn with it.
  const still = () => {
    remeasure();
    for (let i = 0; i <= HUSHES.length && search !== -1; i += 1) probeStep();
    hush = hushTarget;
    draw();
  };

  const onPointer = (e: PointerEvent) => {
    const c = canvas.getBoundingClientRect();
    const inside = e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom;
    const sx = canvas.width / Math.max(1, c.width);
    const sy = canvas.height / Math.max(1, c.height);
    ptr.tx = (e.clientX - c.left) * sx;
    ptr.ty = (c.bottom - e.clientY) * sy;
    if (ptr.z < 0.01) {
      ptr.x = ptr.tx;
      ptr.y = ptr.ty;
      lastRing = { x: ptr.x, y: ptr.y, at: lastRing.at };
    }
    ptr.tz = inside ? 1 : 0;
  };
  const onLeave = () => {
    ptr.tz = 0;
  };
  const onDown = (e: PointerEvent) => {
    onPointer(e);
    if (ptr.tz > 0 && e.pointerType !== "mouse") tap = true;
  };
  // A finger that lifts leaves no pointer behind on the cloth.
  const onUp = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") ptr.tz = 0;
  };

  const resizeObserver = new ResizeObserver(() => {
    resize();
    remeasure();
    if (reduce) still();
  });
  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((en) => en.isIntersecting);
      kick();
    },
    { rootMargin: "64px" },
  );
  const onVisibility = () => kick();

  // Palette and theme: the lab swaps the tokens on [data-blocks]; a site swaps a class or data-theme on <html>.
  let colourFrame = 0;
  const onTokens = () => {
    cancelAnimationFrame(colourFrame);
    colourFrame = requestAnimationFrame(() => {
      readColours();
      remeasure();
      if (reduce) still();
      else kick();
    });
  };
  const tokens = new MutationObserver(onTokens);
  const scope = el.closest("[data-blocks]");
  if (scope) tokens.observe(scope, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
  tokens.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    lost = false;
    program = null;
    if (!build()) return;
    readColours();
    resize();
    if (reduce) still();
    else kick();
  };

  const onFonts = () => {
    if (disposed) return;
    if (scroll < 0.01) readBoxes();
    remeasure();
    if (reduce) still();
  };

  return {
    start() {
      if (!build()) {
        release();
        canvas.remove();
        first();
        return;
      }
      readColours();
      resize();
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      resizeObserver.observe(holder);
      io.observe(el);
      // The accent face too, when a word is marked: the type's box is read as it will stand.
      document.fonts?.ready.then(() => accentFaceReady(el)).then(onFonts);
      // The folds rise once nothing covers the page: at once, or as a preloader or page transition starts to leave.
      stopRise = whenUncovered(() => {
        introAt = time;
      });
      if (reduce) still();
      else kick();
    },
    dispose() {
      disposed = true;
      stopRise();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(colourFrame);
      resizeObserver.disconnect();
      io.disconnect();
      tokens.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
      (gl.getExtension("WEBGL_lose_context") as { loseContext: () => void } | null)?.loseContext();
      canvas.remove();
      delete el.dataset.live;
    },
  };
}

export function BackgroundSilk({ variant = "fold", lines, accent, lead, link, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rise = q("[data-rise]");
      const holder = q("[data-field]")[0] as HTMLElement;
      const copy = q("[data-copy]")[0] as HTMLElement;

      // A late script: once the CSS fallback (3s) has shown the type it stays; decided once per element, from that
      // element's own fallback clock, so strict mode's second run reads the same answer.
      const clock = rise[0]
        ?.getAnimations()
        .find((an) => (an as CSSAnimation).animationName === "struq-silk-rise");
      el.dataset.shown ??= String(
        reduce || (clock ? Number(clock.currentTime ?? 0) >= 2900 : getComputedStyle(rise[0]).transform === "none"),
      );
      const shown = el.dataset.shown === "true";
      gsap.set(rise, { y: 0, yPercent: shown ? 0 : 115 });
      el.dataset.ready = "";

      const play = contextSafe(() => {
        if (!shown) gsap.to(rise, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, delay: 0.25 });
      });
      // The type rises with the first frame of the cloth, and only once nothing covers the page (a preloader or page
      // transition starting to leave, or none at all).
      let asked = false;
      let stop = () => {};
      const ready = () => {
        if (asked) return;
        asked = true;
        stop = whenUncovered(play);
      };
      // The type never waits long on a slow shader compile.
      const failsafe = window.setTimeout(ready, 1400);
      const field = silkField(el, holder, variant, reduce, ready);
      field.start();

      // The hand-over: the type leaves first; on fold and ripple the cloth drifts slower than the page, on drape it
      // stays put and the shader draws it down over the type.
      if (!reduce) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4 } });
        if (variant === "drape") {
          // The copy is gone by a quarter of the way; the shader holds the hem until 0.3, so the cloth never passes
          // over half faded type.
          tl.to(copy, { yPercent: -30, opacity: 0, ease: "none", duration: 0.24 }, 0).to({}, { duration: 0.76 }, 0.24);
        } else {
          tl.to(holder, { yPercent: 18, ease: "none", duration: 1 }, 0).to(copy, { yPercent: -45, ease: "none", duration: 0.6 }, 0);
        }
      }

      return () => {
        window.clearTimeout(failsafe);
        stop();
        field.dispose();
      };
    },
    { scope: root, dependencies: [variant], revertOnUpdate: true },
  );

  const mask = (child: React.ReactNode, key?: number) => (
    <span key={key} className="struq-line-mask block">
      <span data-rise="" className="block">
        {child}
      </span>
    </span>
  );

  // Where the type stands: fold on the calm left at the middle (at the foot on a tall screen, under the fold),
  // ripple and drape at the foot on the left.
  const place = variant === "fold" ? "justify-center portrait:justify-end" : "justify-end";

  return (
    <section
      ref={root}
      data-bg-silk=""
      data-variant={variant}
      suppressHydrationWarning
      className={`relative h-svh min-h-[34rem] overflow-hidden bg-surface-0 text-ink ${className}`}
    >
      <div data-field="" aria-hidden="true" className="absolute inset-0" />
      <div className={`relative flex h-full flex-col px-sheet-margin pb-[9vh] pt-[12vh] md:pb-[11vh] ${place}`}>
        <div data-copy="" className="max-w-[min(100%,40rem)]">
          <h1 data-head="" className="font-display text-[clamp(2.75rem,12.5vw,4.5rem)] leading-[0.98] tracking-[-0.03em] md:text-[clamp(3.75rem,6.6vw,7.5rem)]">
            {accentLines(lines, accent).map((line, i) => mask(line, i))}
          </h1>
          <div data-small="" className="mt-7 md:mt-9">
            {mask(<span className="block max-w-[34ch] text-[1.0625rem] leading-relaxed text-ink-muted md:text-lg">{lead}</span>)}
            <div className="mt-4">
              {mask(
                <a href={link.href} className="text-small inline-block underline decoration-1 underline-offset-4">
                  {link.label}
                </a>,
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
