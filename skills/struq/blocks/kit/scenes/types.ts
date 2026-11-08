// components/struq/scenes/types.ts (Struq recipe)
// The contract every hero scene follows. HeroCanvas owns the renderer, the clock, the pointer,
// the pause, the poster and the quiet zones; a scene owns only what it draws.
import type * as THREE_NS from "three";

export type Palette = {
  /** CSS colour strings, already resolved to rgb() from the :root tokens. */
  surface: string;
  surface2: string;
  ink: string;
  accent: string;
};

export type SceneState = {
  /** Seconds on gsap.ticker. Scenes scale it down: an ambient field moves at 0.02 to 0.06 of it. */
  time: number;
  /** Smoothed pointer, -1 to 1 on both axes, y up. A gentle modulation only, never the subject. */
  pointer: { x: number; y: number };
  /** 0 to 1: how far the pointer is engaged; eases in on move and out when it rests or leaves. */
  presence: number;
  /** 0 to 1: how far the hero has scrolled out of view. */
  scroll: number;
  /** 0 to 1: recent pointer speed, decays on its own. */
  velocity: number;
  /**
   * Up to four rects behind the copy (elements marked data-quiet in the hero), in device pixels with
   * a bottom-left origin like gl_FragCoord: [left, bottom, right, top] per rect, zeros when unused.
   */
  quiet: Float32Array;
  /** The soft edge around each quiet rect, in device pixels. */
  feather: number;
};

export type SceneInput = {
  THREE: typeof THREE_NS;
  renderer: THREE_NS.WebGLRenderer;
  palette: Palette;
  image?: { src: string; width: number; height: number };
  grade: number;
  /** True on a dark palette: the quiet level and the line weights differ per ground. */
  dark: boolean;
};

export type HeroScene = {
  scene: THREE_NS.Scene;
  camera: THREE_NS.Camera;
  update(state: SceneState): void;
  /** Width and height in CSS pixels; read renderer.getPixelRatio() for device pixels. */
  resize(width: number, height: number): void;
  /** A multi-pass scene renders itself; otherwise HeroCanvas renders scene with camera. */
  render?(renderer: THREE_NS.WebGLRenderer): void;
  dispose(): void;
};

export type CreateScene = (input: SceneInput) => Promise<HeroScene>;

/** Shared GLSL: hash, value noise and fbm. Run noise per field cell, never per screen pixel, where you can. */
export const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
`;

/**
 * The hush behind the copy. Inside a quiet rect the field does not scale down to a dark box: it meets
 * a soft ceiling (uQuietLevel), so faint light passes as it is and only the bright parts are held
 * down. The feather lies outside each rect, so the copy itself sits at full quiet.
 */
export const QUIET_GLSL = /* glsl */ `
  uniform vec4 uQuiet[4];
  uniform float uFeather;
  uniform float uQuietLevel;
  float quietBox(vec2 p, vec4 r, float f) {
    vec2 a = smoothstep(r.xy - f, r.xy, p);
    vec2 b = 1.0 - smoothstep(r.zw, r.zw + f, p);
    return a.x * a.y * b.x * b.y;
  }
  float quiet(vec2 p) {
    float m = 0.0;
    for (int i = 0; i < 4; i++) {
      vec4 r = uQuiet[i];
      if (r.z > r.x) m = max(m, quietBox(p, r, uFeather));
    }
    return m;
  }
  float hush(float v, vec2 p) {
    float q = quiet(p);
    return mix(v, uQuietLevel * (1.0 - exp(-v / uQuietLevel)), q);
  }
`;

/** The uniforms QUIET_GLSL reads, and the update that copies HeroCanvas's rects into them. */
export function quietUniforms(THREE: typeof THREE_NS, level: number) {
  const uniforms = {
    uQuiet: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uFeather: { value: 48 },
    uQuietLevel: { value: level },
  };
  const update = (state: SceneState) => {
    for (let i = 0; i < 4; i++) {
      uniforms.uQuiet.value[i].set(state.quiet[i * 4], state.quiet[i * 4 + 1], state.quiet[i * 4 + 2], state.quiet[i * 4 + 3]);
    }
    uniforms.uFeather.value = state.feather;
  };
  return { uniforms, update };
}
