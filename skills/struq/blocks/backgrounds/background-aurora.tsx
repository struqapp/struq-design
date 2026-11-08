"use client";
// background-aurora (Struq background recipe): Noorderlicht
// A full-screen hero whose ground is a live field of northern light: slow curtains, each hanging up from a folding
// lower edge, brightest along that edge and where a fold turns side on, with long vertical rays drifting through them.
// On a dark palette the light is the accent laid over the ground, its brightest cores leaning toward the ink: real
// light. On a light palette it is a pale glow on paper, the curtain lifting toward a near white with only a faint
// shade of the accent at its thin edges. The headline (light display weight), one lead sentence and one text link
// stand on the calm side, clear of the curtains.
//
// <BackgroundAurora variant="veil" lines={["Ruimte voor", "het licht."]} lead="..." link={{ href: "/werk", label: "Bekijk het werk" }} />
//
// Three variants, three compositions of the same field:
//   veil     one tall curtain standing in the right third, two pleats crossing as it sways; the type on the calm left.
//   horizon  a low band of light along the foot of the screen under the type, rising a little as the hero scrolls away.
//   drift    the curtains across the upper half, travelling slowly sideways and bending away from the pointer.
//
// The field: raw WebGL2, one full-screen pass at reduced resolution (the light is soft, so half scale stays sharp
// enough; a fine dither keeps the upscale free of bands). The device pixel ratio is capped at 1.5. Phones get a
// lighter pass (lower scale, no fine ray layer, 30 frames a second) that still moves. The loop pauses off screen and
// in a hidden tab, survives a lost context, and lets everything go on unmount.
//
// Colour comes from the tokens on the block's root (--surface-0, --accent, --ink), read at runtime and again whenever
// the page switches palette or theme. No colour lives in this file.
//
// Contrast is measured, not trusted: every text box (data-quiet) gets a ceiling, the brightest the field may be under
// it so the text there still holds its ratio (display 3:1, small text 4.5:1) against the real colours, computed with
// the same colour math the shader uses. The compositions keep the curtains clear of the type, so the ceiling only
// catches a stray ray, and it meets the field softly: faint light runs on behind the text, no veil and no cutout.
//
// Entrance: the canvas stays hidden until its first frame is drawn, then fades in while the light dawns; the type
// rises through masks once its face is in (capped). Reduced motion: one rendered still frame, held, type in place. No
// WebGL: the same field drawn once, small, on a 2D canvas. No scripts: the composed hero on the plain ground; with
// scripts the type waits below its masks and is released by the CSS after 3 seconds if the script never runs
// (blocks.css, "--- background-aurora ---").
import { useEffect, useRef } from "react";
import { ScrollTrigger, gsap, useGSAP } from "../kit/gsap";

export type AuroraVariant = "veil" | "horizon" | "drift";

/** The variants, first is the default, for the catalogue and the lab picker. */
export const AURORA_VARIANTS: { id: AuroraVariant; title: string; does: string }[] = [
  { id: "veil", title: "Gordijn", does: "One tall curtain of light standing in the right third, swaying; the type on the calm left." },
  { id: "horizon", title: "Horizon", does: "A low band of light along the foot of the screen under the type, rising as the hero scrolls away." },
  { id: "drift", title: "Drift", does: "Curtains across the upper half, drifting sideways and bending away from the pointer." },
];

type Props = {
  variant?: AuroraVariant;
  /** The headline, one entry per line. Two short lines read best. */
  lines: string[];
  /** One lead sentence. */
  lead: string;
  /** One text link. */
  link: { href: string; label: string };
  className?: string;
};

const MODE: Record<AuroraVariant, number> = { veil: 0, horizon: 1, drift: 2 };

// The moment of the field the reduced motion still and the first frame start from: curtains well formed.
const T0 = 37;

// How softly a text box's ceiling meets the field around it, in canvas heights.
const FEATHER = 0.1;

// ---------------------------------------------------------------------------------------------------------------
// The shader. Space: u is the canvas in fractions (0,0 bottom left), p the same in canvas heights, so the light keeps
// its shape at any aspect. Noise never runs more than a handful of times per pixel.

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform int uMode;
uniform float uNarrow;
uniform int uFine;
uniform vec3 uGround;
uniform vec3 uAccent;
uniform vec3 uInk;
uniform float uStrength;
uniform float uCore;
uniform int uLight;
uniform float uIntro;
uniform float uLeave;
uniform vec3 uPtr;
uniform vec4 uQuiet[3];
uniform float uCeil[3];
uniform vec2 uFeather;
out vec4 o;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float gs(float x) { return exp(-x * x); }

// The folding lower edge of a curtain at s (along the curtain), in canvas heights.
float edgeAt(float s, float base, float amp, float t, float seed) {
  return base + amp * sin(s * 1.9 - t * 0.11 + seed) + 0.5 * amp * sin(s * 5.3 + t * 0.07 + 2.0 * seed)
    + 1.4 * amp * (n3(vec3(s * 0.9 - t * 0.04, seed, t * 0.05)) - 0.5);
}

// One curtain: light hanging up from its folding edge, brightest along the edge and where a fold turns side on,
// drawn in long vertical rays.
float sheet(float y, float s, float base, float amp, float hang, float t, float seed) {
  float e = edgeAt(s, base, amp, t, seed);
  float slope = (edgeAt(s + 0.03, base, amp, t, seed) - e) / 0.03;
  float d = y - e;
  // Two ray frequencies that never line up, so the rays fall unevenly instead of in a regular row, and each ray
  // reaches its own height.
  float r1 = n3(vec3(s * 13.0 - t * 0.14, d * 1.1, t * 0.07 + seed));
  float r2 = n3(vec3(s * 31.0 + t * 0.09, d * 0.7, t * 0.05 + seed * 1.7));
  float hg = hang * (0.6 + 0.25 * sin(s * 4.3 + seed) * sin(s * 1.7 - t * 0.02 + 2.0 * seed) + 0.15 * sin(s * 23.0 + 3.1 * seed));
  // On paper the hem fades out a little wider, so it reads as glow and not as a drawn edge.
  float below = uLight == 1 ? 0.08 : 0.022;
  float prof = d < 0.0 ? gs(d / below) : 0.5 * exp(-d / hg) + 0.5 * gs(d / 0.04);
  float rays = 0.07 + 0.93 * smoothstep(0.2, 0.9, sqrt(r1 * r2));
  if (uFine == 1) rays *= 0.6 + 0.4 * n3(vec3(s * 55.0 + t * 0.1, d * 2.0, t * 0.12 + seed));
  float fold = 1.0 + 1.2 * smoothstep(0.03, 0.22, abs(slope));
  return prof * rays * fold;
}

float box(vec2 p, vec4 r, vec2 f) {
  vec2 a = smoothstep(r.xy - f, r.xy, p);
  vec2 b = 1.0 - smoothstep(r.zw, r.zw + f, p);
  return a.x * a.y * b.x * b.y;
}

void main() {
  float a = uRes.x / uRes.y;
  vec2 u = gl_FragCoord.xy / uRes;
  vec2 p = vec2(u.x * a, u.y);
  float t = uTime;
  float light = 0.0;
  if (uMode == 0) {
    // veil: one tall curtain in the right third, two pleats swaying across each other.
    // On a phone the type stands at the foot, so the curtain hangs higher, above it.
    float cx = mix(0.735, 0.66, uNarrow);
    float wc = mix(0.1, 0.24, uNarrow);
    float sway = 0.03 * sin(u.y * 2.3 - t * 0.12) + 0.06 * (n3(vec3(u.y * 1.2 - t * 0.03, 7.0, t * 0.04)) - 0.5);
    float s = (u.x - sway) * a;
    float base = mix(0.16, 0.53, uNarrow) + 0.06 * uLeave;
    float top = 1.0 - smoothstep(0.72, 1.08, u.y);
    float c1 = gs((u.x - cx - sway) / wc);
    float c2 = gs((u.x - cx + 0.04 - 1.5 * sway) / (wc * 0.65));
    // The second pleat's hem rises and falls on its own, so the two hems never meet in one shelf.
    float base2 = base + 0.07 + 0.045 * sin(t * 0.09 + 1.3) + 0.02 * sin(s * 2.7 - t * 0.05);
    light = 1.2 * c1 * sheet(p.y, s, base, 0.03, mix(0.55, 0.3, uNarrow), t, 1.3)
      + 0.75 * c2 * sheet(p.y, s + 0.37, base2, 0.025, 0.4, t, 4.1);
    // The foot dissolves into the room instead of ending in a line.
    light *= mix(0.3, 1.0, smoothstep(base - 0.05, base + 0.16, p.y));
    light = light * top + 0.1 * gs((u.x - cx) / (wc * 2.6)) * smoothstep(base - 0.08, base + 0.35, u.y) * top;
    light *= 1.0 - 0.45 * uLeave;
  } else if (uMode == 1) {
    // horizon: a low band along the foot, stronger to the right, rising as the hero leaves. The second sheet is
    // fainter, longer and folds deeper, so its hem never runs parallel to the first.
    float base = mix(0.085, 0.1, uNarrow) + 0.12 * uLeave;
    float side = mix(0.4, 1.0, smoothstep(0.0, 0.85, u.x));
    light = 0.85 * sheet(p.y, p.x, base, 0.035, 0.13, t, 2.2)
      + 0.25 * sheet(p.y, p.x * 0.62 + 1.7, base + 0.085, 0.055, 0.09, t, 5.7);
    light = light * side + 0.09 * gs((u.y - base - 0.05) / 0.13) * side;
  } else {
    // drift: curtains across the upper half, weighted to the right, pushed gently away from the pointer. The hem
    // hangs clear above the type.
    vec2 pp = vec2(uPtr.x * a, uPtr.y);
    vec2 dv = p - pp;
    p -= dv * 0.5 * exp(-dot(dv, dv) / 0.08) * uPtr.z;
    float base = mix(0.66, 0.7, uNarrow) + 0.08 * uLeave;
    float side = mix(0.15, 1.0, smoothstep(0.25, 0.95, u.x));
    light = 0.8 * sheet(p.y, p.x - t * 0.012, base, 0.06, 0.2, t, 3.4)
      + 0.5 * sheet(p.y, p.x - t * 0.007 + 0.9, base + 0.12, 0.05, 0.15, t, 6.2);
    light = light * side + 0.05 * smoothstep(base - 0.06, base + 0.3, p.y) * side;
  }

  float lum = 1.0 - exp(-light * 2.2);
  float v = lum * uStrength * uIntro;
  // Behind text a soft ceiling, measured per text box, for the stray ray that reaches it: faint light passes, a
  // bright core is held down. A ceiling of 1 means the text holds against any light, and nothing is touched.
  float qmax = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 r = uQuiet[i];
    if (r.z <= r.x) continue;
    float q = box(u, r, uFeather);
    qmax = max(qmax, q);
    float c = max(uCeil[i], 0.001);
    if (c >= 1.0) continue;
    v = mix(v, c * (1.0 - exp(-v / c)), q);
  }
  vec3 col;
  if (uLight == 1) {
    // Light on paper: the body of the curtain lifts toward a near white of the ground itself; only where the light
    // is thin, on the fold sides and between the rays, does a faint shade of the accent show.
    vec3 glow = mix(1.0 - (1.0 - uGround) * 0.06, uAccent, 0.03);
    float tint = 0.1 * smoothstep(0.0, 0.18, v) * (1.0 - smoothstep(0.15, 0.4, v));
    // The light only ever brightens the paper; it never casts a shadow on it.
    col = max(mix(mix(uGround, uAccent, tint), glow, smoothstep(0.08, 0.6, v)), uGround);
  } else {
    // Light on a dark ground: real light, its brightest cores leaning toward the ink.
    float core = smoothstep(0.5, 0.95, lum) * uCore * uIntro * (1.0 - qmax);
    col = mix(mix(uGround, uAccent, v), uInk, core * 0.5);
  }
  col += (h21(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * (1.5 / 255.0);
  o = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------------------------------------------
// The same field in plain numbers, for a browser without WebGL2: drawn once, small, and stretched by the canvas.

const fract = (x: number) => x - Math.floor(x);
const mixN = (a: number, b: number, k: number) => a + (b - a) * k;
const gsN = (x: number) => Math.exp(-x * x);
const smooth = (e0: number, e1: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};
function h31(x: number, y: number, z: number) {
  x = fract(x * 0.3183099 + 0.1) * 17;
  y = fract(y * 0.3183099 + 0.1) * 17;
  z = fract(z * 0.3183099 + 0.1) * 17;
  return fract(x * y * z * (x + y + z));
}
function n3(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const q = (f: number) => f * f * f * (f * (f * 6 - 15) + 10);
  const fx = q(x - ix), fy = q(y - iy), fz = q(z - iz);
  const at = (a: number, b: number, c: number) => h31(ix + a, iy + b, iz + c);
  return mixN(
    mixN(mixN(at(0, 0, 0), at(1, 0, 0), fx), mixN(at(0, 1, 0), at(1, 1, 0), fx), fy),
    mixN(mixN(at(0, 0, 1), at(1, 0, 1), fx), mixN(at(0, 1, 1), at(1, 1, 1), fx), fy),
    fz,
  );
}
function edgeAtN(s: number, base: number, amp: number, t: number, seed: number) {
  return (
    base + amp * Math.sin(s * 1.9 - t * 0.11 + seed) + 0.5 * amp * Math.sin(s * 5.3 + t * 0.07 + 2 * seed) +
    1.4 * amp * (n3(s * 0.9 - t * 0.04, seed, t * 0.05) - 0.5)
  );
}
function sheetN(y: number, s: number, base: number, amp: number, hang: number, t: number, seed: number, below: number) {
  const e = edgeAtN(s, base, amp, t, seed);
  const slope = (edgeAtN(s + 0.03, base, amp, t, seed) - e) / 0.03;
  const d = y - e;
  const r1 = n3(s * 13 - t * 0.14, d * 1.1, t * 0.07 + seed);
  const r2 = n3(s * 31 + t * 0.09, d * 0.7, t * 0.05 + seed * 1.7);
  const hg = hang * (0.6 + 0.25 * Math.sin(s * 4.3 + seed) * Math.sin(s * 1.7 - t * 0.02 + 2 * seed) + 0.15 * Math.sin(s * 23 + 3.1 * seed));
  const prof = d < 0 ? gsN(d / below) : 0.5 * Math.exp(-d / hg) + 0.5 * gsN(d / 0.04);
  const rays = 0.07 + 0.93 * smooth(0.2, 0.9, Math.sqrt(r1 * r2));
  return prof * rays * (1 + 1.2 * smooth(0.03, 0.22, Math.abs(slope)));
}
function lightAt(ux: number, uy: number, a: number, mode: number, t: number, narrow: number, below: number) {
  const px = ux * a;
  const py = uy;
  if (mode === 0) {
    const cx = mixN(0.735, 0.66, narrow);
    const wc = mixN(0.1, 0.24, narrow);
    const sway = 0.03 * Math.sin(uy * 2.3 - t * 0.12) + 0.06 * (n3(uy * 1.2 - t * 0.03, 7, t * 0.04) - 0.5);
    const s = (ux - sway) * a;
    const base = mixN(0.16, 0.53, narrow);
    const top = 1 - smooth(0.72, 1.08, uy);
    const c1 = gsN((ux - cx - sway) / wc);
    const c2 = gsN((ux - cx + 0.04 - 1.5 * sway) / (wc * 0.65));
    const base2 = base + 0.07 + 0.045 * Math.sin(t * 0.09 + 1.3) + 0.02 * Math.sin(s * 2.7 - t * 0.05);
    const l =
      (1.2 * c1 * sheetN(py, s, base, 0.03, mixN(0.55, 0.3, narrow), t, 1.3, below) +
        0.75 * c2 * sheetN(py, s + 0.37, base2, 0.025, 0.4, t, 4.1, below)) *
      mixN(0.3, 1, smooth(base - 0.05, base + 0.16, py));
    return l * top + 0.1 * gsN((ux - cx) / (wc * 2.6)) * smooth(base - 0.08, base + 0.35, uy) * top;
  }
  if (mode === 1) {
    const base = mixN(0.085, 0.1, narrow);
    const side = mixN(0.4, 1, smooth(0, 0.85, ux));
    const l =
      0.85 * sheetN(py, px, base, 0.035, 0.13, t, 2.2, below) + 0.25 * sheetN(py, px * 0.62 + 1.7, base + 0.085, 0.055, 0.09, t, 5.7, below);
    return l * side + 0.09 * gsN((uy - base - 0.05) / 0.13) * side;
  }
  const base = mixN(0.66, 0.7, narrow);
  const side = mixN(0.15, 1, smooth(0.25, 0.95, ux));
  const l = 0.8 * sheetN(py, px - t * 0.012, base, 0.06, 0.2, t, 3.4, below) + 0.5 * sheetN(py, px - t * 0.007 + 0.9, base + 0.12, 0.05, 0.15, t, 6.2, below);
  return l * side + 0.05 * smooth(base - 0.06, base + 0.3, py) * side;
}

// ---------------------------------------------------------------------------------------------------------------
// Colour: the tokens resolved through a one pixel canvas, so every colour syntax (hex, oklch, color-mix) lands as sRGB.

type Rgb = [number, number, number];
type Colours = { ground: Rgb; accent: Rgb; ink: Rgb; light: boolean; strength: number; core: number };
type Zone = { rect: [number, number, number, number]; ceil: number };

let probe: CanvasRenderingContext2D | null = null;
function rgbOf(color: string): Rgb {
  if (!probe) {
    const cv = document.createElement("canvas");
    cv.width = 1;
    cv.height = 1;
    probe = cv.getContext("2d", { willReadFrequently: true });
  }
  if (!probe) return [0, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const mixRgb = (a: Rgb, b: Rgb, k: number): Rgb => [mixN(a[0], b[0], k), mixN(a[1], b[1], k), mixN(a[2], b[2], k)];

function readColours(el: HTMLElement): Colours {
  const css = getComputedStyle(el);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const ground = rgbOf(token("--surface-0", css.backgroundColor));
  const ink = rgbOf(token("--ink", css.color));
  const accent = rgbOf(token("--accent", css.color));
  const light = lum(ground) >= 0.2;
  // Light: a pale glow on paper with a faint accent shade at its thin edges. Dark: real light, its cores leaning
  // toward the ink.
  return { ground, accent, ink, light, strength: light ? 0.9 : 0.95, core: light ? 0 : 0.5 };
}

/** The colour of the field at strength `v` with ink core `core`: the shader's colour model in plain numbers. */
function colourAt(c: Colours, v: number, core: number): Rgb {
  if (c.light) {
    const glow = mixRgb(c.ground.map((x) => 1 - (1 - x) * 0.06) as Rgb, c.accent, 0.03);
    const tint = 0.1 * smooth(0, 0.18, v) * (1 - smooth(0.15, 0.4, v));
    const out = mixRgb(mixRgb(c.ground, c.accent, tint), glow, smooth(0.08, 0.6, v));
    return out.map((x, i) => Math.max(x, c.ground[i])) as Rgb;
  }
  return mixRgb(mixRgb(c.ground, c.accent, v), c.ink, core * 0.5);
}

/**
 * The brightest the field may be (0 to 1, the shader's own strength) under text of colour `text` for `ratio`, or 1
 * when the text holds against any light and the field may run on untouched.
 */
function ceilingFor(c: Colours, text: Rgb, ratio: number) {
  const lt = lum(text);
  let v = 0;
  for (let s = 0.01; s <= 1.0001; s += 0.01) {
    if (contrast(lum(colourAt(c, s, 0)), lt) < ratio) {
      // A small margin for the dither and rounding.
      return Math.max(0.002, v * 0.95);
    }
    v = s;
  }
  return 1;
}

// ---------------------------------------------------------------------------------------------------------------
// WebGL plumbing.

type Gl = {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  loc: Record<string, WebGLUniformLocation | null>;
};

const UNIFORMS = [
  "uRes", "uTime", "uMode", "uNarrow", "uFine", "uGround", "uAccent", "uInk", "uStrength", "uCore", "uLight", "uIntro", "uLeave",
  "uPtr", "uQuiet", "uCeil", "uFeather",
];

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (!gl.isContextLost()) console.warn("background-aurora:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function build(gl: WebGL2RenderingContext): Gl | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) return null;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // One triangle that covers the screen.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const loc: Gl["loc"] = {};
  for (const name of UNIFORMS) loc[name] = gl.getUniformLocation(program, name);
  return { program, vao, buffer, loc };
}

// ---------------------------------------------------------------------------------------------------------------

export function BackgroundAurora({ variant = "veil", lines, lead, link, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The field.
  useEffect(() => {
    const el = root.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const mode = MODE[variant];
    let gone = false;
    let colours = readColours(el);
    let zones: Zone[] = [];
    let narrow = false;
    let onScreen = true;
    let lost = false;
    let lit = false;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let introClock = 0;
    const leave = { now: 0, target: 0 };
    const ptr = { x: 0.5, y: 0.5, z: 0, tx: 0.5, ty: 0.5, tz: 0 };

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    let prog: Gl | null = gl ? build(gl) : null;

    const show = () => {
      if (lit) return;
      lit = true;
      // The frame is on screen once the browser has presented it: the canvas fades in from the next frame.
      requestAnimationFrame(() => {
        if (!gone) el.dataset.lit = "";
      });
    };

    const measure = () => {
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      zones = Array.from(el.querySelectorAll<HTMLElement>("[data-quiet]"))
        .slice(0, 3)
        .map((z) => {
          const r = z.getBoundingClientRect();
          const ratio = z.dataset.quiet === "display" ? 3 : 4.5;
          return {
            rect: [
              (r.left - box.left) / box.width,
              1 - (r.bottom - box.top) / box.height,
              (r.right - box.left) / box.width,
              1 - (r.top - box.top) / box.height,
            ],
            ceil: ceilingFor(colours, rgbOf(getComputedStyle(z).color), ratio),
          };
        });
    };

    // The still for a browser without WebGL2: the same field at a small size, drawn once.
    const drawStill = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 1 || h < 1) return;
      const cw = narrow ? 96 : 160;
      const ch = Math.max(2, Math.round((cw * h) / w));
      canvas.width = cw;
      canvas.height = ch;
      const img = ctx.createImageData(cw, ch);
      const a = w / h;
      for (let y = 0; y < ch; y += 1) {
        for (let x = 0; x < cw; x += 1) {
          const ux = (x + 0.5) / cw;
          const uy = 1 - (y + 0.5) / ch;
          const l = 1 - Math.exp(-lightAt(ux, uy, a, mode, T0, narrow ? 1 : 0, colours.light ? 0.08 : 0.022) * 2.2);
          let v = l * colours.strength;
          let q = 0;
          for (const z of zones) {
            const [x0, y0, x1, y1] = z.rect;
            const f = FEATHER;
            const inside =
              smooth(x0 - f / a, x0, ux) * smooth(y0 - f, y0, uy) * (1 - smooth(x1, x1 + f / a, ux)) * (1 - smooth(y1, y1 + f, uy));
            q = Math.max(q, inside);
            if (z.ceil < 1) v = mixN(v, z.ceil * (1 - Math.exp(-v / z.ceil)), inside);
          }
          const c = colourAt(colours, v, smooth(0.5, 0.95, l) * colours.core * (1 - q));
          const i = (y * cw + x) * 4;
          img.data[i] = c[0] * 255;
          img.data[i + 1] = c[1] * 255;
          img.data[i + 2] = c[2] * 255;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      show();
    };

    const draw = () => {
      if (!gl || !prog || lost) return;
      const { loc } = prog;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog.program);
      gl.bindVertexArray(prog.vao);
      const a = canvas.width / Math.max(1, canvas.height);
      const quiet = new Float32Array(12);
      const ceil = new Float32Array(3);
      zones.forEach((z, i) => {
        quiet.set(z.rect, i * 4);
        ceil[i] = z.ceil;
      });
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uTime, T0 + clock);
      gl.uniform1i(loc.uMode, mode);
      gl.uniform1f(loc.uNarrow, narrow ? 1 : 0);
      gl.uniform1i(loc.uFine, narrow ? 0 : 1);
      gl.uniform3fv(loc.uGround, colours.ground);
      gl.uniform3fv(loc.uAccent, colours.accent);
      gl.uniform3fv(loc.uInk, colours.ink);
      gl.uniform1f(loc.uStrength, colours.strength);
      gl.uniform1f(loc.uCore, colours.core);
      gl.uniform1i(loc.uLight, colours.light ? 1 : 0);
      // The light dawns over its first seconds; a held still is fully lit.
      const k = Math.min(1, introClock / 2.8);
      gl.uniform1f(loc.uIntro, reduce ? 1 : 1 - Math.pow(1 - k, 3));
      gl.uniform1f(loc.uLeave, leave.now);
      gl.uniform3f(loc.uPtr, ptr.x, ptr.y, ptr.z);
      gl.uniform4fv(loc.uQuiet, quiet);
      gl.uniform1fv(loc.uCeil, ceil);
      gl.uniform2f(loc.uFeather, FEATHER / a, FEATHER);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      show();
    };

    const active = () => !gone && !reduce && !lost && !!prog && onScreen && !document.hidden;
    const tick = (now: number) => {
      raf = 0;
      if (!active()) return;
      raf = requestAnimationFrame(tick);
      // Phones: thirty frames a second is plenty for light this slow.
      if (narrow && last && now - last < 31) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      introClock += dt;
      // The pointer eases in over about 0.18 s; the scroll settles like a camera, about 0.4 s.
      const kp = 1 - Math.exp(-dt / 0.06);
      ptr.x += (ptr.tx - ptr.x) * kp;
      ptr.y += (ptr.ty - ptr.y) * kp;
      ptr.z += (ptr.tz - ptr.z) * (1 - Math.exp(-dt / 0.12));
      leave.now += (leave.target - leave.now) * (1 - Math.exp(-dt / 0.12));
      draw();
    };
    const wake = () => {
      if (raf || !active()) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 1 || h < 1) return;
      narrow = w < 768;
      measure();
      if (!gl || !prog) {
        drawStill();
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const scale = narrow ? 0.5 : 0.75;
      canvas.width = Math.max(2, Math.round(w * dpr * scale));
      canvas.height = Math.max(2, Math.round(h * dpr * scale));
      // A resize clears the canvas: draw at once so it never shows blank.
      draw();
    };

    // Palette or theme switched: new colours, new ceilings, and a fresh frame even when the loop is paused.
    const recolour = () => {
      colours = readColours(el);
      measure();
      if (gl && prog) draw();
      else drawStill();
    };

    // Races get ids: only the latest font settle re-measures.
    let fontsId = 0;
    const refit = () => {
      const id = ++fontsId;
      document.fonts?.ready.then(() => {
        if (gone || id !== fontsId) return;
        measure();
        if (gl && prog) draw();
        else drawStill();
      });
    };

    const sized = new ResizeObserver(resize);
    sized.observe(el);
    resize();
    refit();
    document.fonts?.addEventListener?.("loadingdone", refit);

    const host = el.closest<HTMLElement>("[data-blocks]");
    const themed = new MutationObserver(recolour);
    if (host) themed.observe(host, { attributes: true, attributeFilter: ["style", "class"] });
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });

    const seen =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            onScreen = entries.some((e) => e.isIntersecting);
            wake();
          });
    seen?.observe(el);
    const visibility = () => wake();
    document.addEventListener("visibilitychange", visibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => {
      if (!gl) return;
      lost = false;
      prog = build(gl);
      resize();
      wake();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    // The scroll: the hero leaving the screen, 0 to 1.
    const trigger = reduce
      ? null
      : ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom top",
          onUpdate: (self) => {
            leave.target = self.progress;
          },
        });

    // The pointer, for drift only, on a fine pointer.
    const usePointer = mode === 2 && finePointer && !reduce;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      // Arriving from nowhere, the bend starts where the pointer is instead of sweeping in from the centre.
      if (ptr.z < 0.02) {
        ptr.x = x;
        ptr.y = y;
      }
      ptr.tx = x;
      ptr.ty = y;
      ptr.tz = inside ? 1 : 0;
    };
    const onOut = () => {
      ptr.tz = 0;
    };
    if (usePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onOut);
    }

    wake();

    return () => {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      sized.disconnect();
      themed.disconnect();
      seen?.disconnect();
      trigger?.kill();
      document.removeEventListener("visibilitychange", visibility);
      document.fonts?.removeEventListener?.("loadingdone", refit);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (usePointer) {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onOut);
      }
      if (gl && prog && !gl.isContextLost()) {
        gl.deleteBuffer(prog.buffer);
        gl.deleteVertexArray(prog.vao);
        gl.deleteProgram(prog.program);
      }
      prog = null;
      // The context itself is left to the browser: under strict mode the same canvas mounts again at once, and a
      // context lost on purpose would come back lost.
      delete el.dataset.lit;
    };
  }, [variant]);

  // The type: it rises through masks once its face is in (at most 1.2 s), or stays where the CSS fallback put it.
  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const rise = Array.from(el.querySelectorAll<HTMLElement>("[data-rise]"));
      if (!rise.length) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // A late script: once the CSS fallback has run its 3 s the lines are shown, and they stay. Decided once per
      // element, so strict mode's second run does not read the state its first run left behind.
      const fallback = rise[0]
        .getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "struq-bga-rise");
      el.dataset.shown ??= String(
        reduce || (fallback ? Number(fallback.currentTime ?? 0) >= 2900 : getComputedStyle(rise[0]).transform === "none"),
      );
      const shown = el.dataset.shown === "true";
      // y: 0 as well, or GSAP reads the CSS start state into a pixel offset and keeps it.
      gsap.set(rise, { y: 0, yPercent: shown ? 0 : 115 });
      el.dataset.ready = "";
      if (shown) return;
      let gone = false;
      const play = contextSafe(() => {
        if (gone) return;
        gsap.to(rise, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.09, delay: 0.15 });
      });
      const fonts = document.fonts?.ready ?? Promise.resolve();
      Promise.race([fonts, new Promise((r) => setTimeout(r, 1200))]).then(play);
      return () => {
        gone = true;
      };
    },
    { scope: root, dependencies: [variant] },
  );

  const mask = (child: React.ReactNode, key?: number) => (
    <span key={key} className="struq-line-mask block overflow-hidden">
      <span data-rise="" className="block">
        {child}
      </span>
    </span>
  );

  // Where the type stands, per composition: the calm left beside the curtain, above the band, or under the curtains.
  const place =
    variant === "horizon"
      ? "items-start pt-[15svh] md:pt-[17svh]"
      : variant === "drift"
        ? "items-end pb-[9svh] md:pb-[6svh]"
        : "items-end pb-[9svh] md:items-center md:pb-0";

  return (
    <section
      ref={root}
      data-bg-aurora=""
      data-variant={variant}
      suppressHydrationWarning
      className={`relative isolate flex h-svh min-h-[34rem] overflow-hidden bg-surface-0 text-ink ${className}`}
    >
      <canvas ref={canvasRef} data-field="" aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      <div className={`relative z-10 flex w-full px-6 md:px-[4vw] ${place}`}>
        <div className={variant === "veil" ? "md:max-w-[52%]" : "max-w-[min(100%,52rem)]"}>
          <h1
            data-quiet="display"
            className="w-fit font-display text-[clamp(2.9rem,12.5vw,4.5rem)] leading-[0.95] tracking-[-0.03em] md:text-[clamp(3.5rem,7vw,8rem)]"
          >
            {lines.map((line, i) => mask(line, i))}
          </h1>
          {/* The spacing sits on plain wrappers: the line mask's own negative margins would cancel it. */}
          <div className="mt-7 md:mt-10">
            <div data-quiet="small" className="struq-line-mask max-w-[34ch] overflow-hidden text-ink-muted">
              <p data-rise="" className="text-lead m-0">
                {lead}
              </p>
            </div>
          </div>
          <div className="mt-5 md:mt-6">
            <div data-quiet="small" className="struq-line-mask w-fit overflow-hidden">
              <span data-rise="" className="block">
                <a href={link.href} className="text-body underline decoration-1 underline-offset-[0.3em]">
                  {link.label}
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
