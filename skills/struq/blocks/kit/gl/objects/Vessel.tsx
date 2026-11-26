"use client";
// components/struq/kit/gl/objects/Vessel.tsx (Struq kit): a thrown ceramic piece, glazed, with its clay showing.
//
// A wheel-thrown pot with a real wall, a trimmed foot ring and a rolled lip. The throwing rings spiral up the wall
// (stronger inside, as the potter's fingers leave them), the glaze breaks lighter on their crests and pools darker
// where it stops, and it stops above the foot in an uneven line with a few drips, so the bare clay shows underneath.
// Use it as it is and adjust the props to the business: a studio's own glaze and clay body, its own form.
//
//   <Stage light="studio" post={{ bloom: 0.4, grain: 0.04 }}>
//     <Backdrop ground="#151311" glow="#8a6a4c" light={0.5} />
//     <Vessel form="vase" glaze="#2f4b46" clay="#b98b66" finish="satin" />
//   </Stage>
//
// Size and origin: centred on the origin, the foot standing on y = -1 for the vase and the bottle (2 tall), on
// y = -0.48 for the bowl (2 wide, 0.96 tall) and y = -0.65 for the cup (1.3 tall). FORM_FOOT gives each one, for a
// shelf or a contact shadow.
//
// Props:
// - form: "vase" | "bowl" | "cup" | "bottle". Default "vase".
// - glaze: the glaze colour. Default a pale celadon.
// - clay: the clay body, bare at the foot. Default a toasted stoneware.
// - finish: "gloss" (wet and bright), "satin" (soft sheen) or "crackle" (gloss with a fine craze). Default "satin".
// - glow: 0 to 1 (number or Signal): a warm light pooled inside the piece, as if a candle stood in it. Default 0.
// - turn: an extra angle about the vertical axis in radians (number or Signal), on top of the slow spin.
// - spin, lean: the slow turn and the lean toward the pointer. Default true.
// - seed: the potter's hand; another number gives another glaze line and drips. Default 3.
// - shadow: a soft contact shadow under the foot. Default true.
// - position, scale.
import { Shadow } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, Float32BufferAttribute, MathUtils, Vector3, type Group, type PointLight } from "three";
import { lathe, read, resample, useObjectMotion, type Value } from "./parts";

export type VesselForm = "vase" | "bowl" | "cup" | "bottle";
export type VesselFinish = "gloss" | "satin" | "crackle";

type Props = {
  form?: VesselForm;
  glaze?: string;
  clay?: string;
  finish?: VesselFinish;
  glow?: Value;
  turn?: Value;
  spin?: boolean;
  lean?: boolean;
  seed?: number;
  shadow?: boolean;
  position?: [number, number, number];
  scale?: number;
};

type Shape = {
  /** The whole section, foot centre out, up the outside, over the lip and down the inside: [radius, height]. */
  outline: [number, number][];
  /** Where the glaze stops above the foot, in the outline's units. */
  glazeLine: number;
};

const SHAPES: Record<VesselForm, Shape> = {
  vase: {
    outline: [
      [0, 0.04], [0.28, 0.04], [0.3, 0.014], [0.33, 0], [0.39, 0], [0.41, 0.018], [0.42, 0.07], [0.46, 0.16], [0.56, 0.36],
      [0.64, 0.6], [0.66, 0.82], [0.62, 1.04], [0.52, 1.24], [0.4, 1.42], [0.33, 1.58], [0.31, 1.72], [0.33, 1.86],
      [0.38, 1.955], [0.405, 1.99], [0.39, 2.0], [0.37, 1.99], [0.33, 1.93], [0.285, 1.86], [0.265, 1.72], [0.285, 1.58],
      [0.355, 1.42], [0.47, 1.24], [0.57, 1.04], [0.61, 0.82], [0.59, 0.6], [0.51, 0.37], [0.41, 0.22], [0.26, 0.14], [0, 0.12],
    ],
    glazeLine: 0.24,
  },
  bowl: {
    outline: [
      [0, 0.035], [0.3, 0.035], [0.32, 0.012], [0.35, 0], [0.42, 0], [0.44, 0.018], [0.45, 0.06], [0.52, 0.13], [0.66, 0.26],
      [0.8, 0.42], [0.9, 0.6], [0.96, 0.78], [0.985, 0.9], [0.99, 0.94], [0.978, 0.96], [0.96, 0.95], [0.945, 0.86],
      [0.9, 0.7], [0.81, 0.53], [0.68, 0.38], [0.53, 0.25], [0.34, 0.16], [0, 0.13],
    ],
    glazeLine: 0.13,
  },
  cup: {
    outline: [
      [0, 0.03], [0.26, 0.03], [0.28, 0.01], [0.3, 0], [0.36, 0], [0.38, 0.018], [0.385, 0.07], [0.42, 0.12], [0.5, 0.22],
      [0.55, 0.4], [0.57, 0.7], [0.585, 1.0], [0.598, 1.22], [0.6, 1.27], [0.588, 1.295], [0.568, 1.28], [0.556, 1.0],
      [0.536, 0.7], [0.512, 0.42], [0.45, 0.25], [0.3, 0.17], [0, 0.155],
    ],
    glazeLine: 0.2,
  },
  bottle: {
    outline: [
      [0, 0.035], [0.4, 0.035], [0.42, 0.012], [0.45, 0], [0.5, 0], [0.52, 0.018], [0.53, 0.08], [0.56, 0.3], [0.57, 0.7],
      [0.55, 0.95], [0.46, 1.12], [0.32, 1.24], [0.2, 1.34], [0.155, 1.46], [0.15, 1.7], [0.16, 1.86], [0.185, 1.94],
      [0.192, 1.985], [0.178, 2.0], [0.16, 1.985], [0.15, 1.93], [0.115, 1.86], [0.105, 1.7], [0.11, 1.46], [0.15, 1.34],
      [0.28, 1.22], [0.42, 1.1], [0.51, 0.95], [0.53, 0.7], [0.52, 0.3], [0.46, 0.16], [0.3, 0.12], [0, 0.11],
    ],
    glazeLine: 0.25,
  },
};

/** Where each form's foot stands once centred, for a shelf or a contact shadow. */
export const FORM_FOOT: Record<VesselForm, number> = { vase: -1, bowl: -0.48, cup: -0.6475, bottle: -1 };

const SEGMENTS = 144;
const RING_PERIOD = 0.072;

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Spin the section, centre it, and throw it: spiral rings on the wall and a hair of ovality from the hand. */
function thrown(shape: Shape, seed: number) {
  const pts = resample(shape.outline, 460);
  let lipIndex = 0;
  pts.forEach((p, i) => {
    if (p.y > pts[lipIndex].y) lipIndex = i;
  });
  const top = pts[lipIndex].y;
  const half = top / 2;
  const g = lathe(pts, SEGMENTS);
  const rows = pts.length;
  const pos = g.attributes.position;
  const side = new Float32Array(pos.count);
  const v = new Vector3();
  const freq = (Math.PI * 2) / RING_PERIOD;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const j = i % rows;
    const phi = (Math.floor(i / rows) / SEGMENTS) * Math.PI * 2;
    const inner = j > lipIndex;
    side[i] = inner ? 1 : 0;
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-5) {
      pos.setY(i, v.y - half);
      continue;
    }
    // Rings fade out at the foot (trimmed smooth) and at the lip (compressed by the potter's chamois).
    const h = v.y / top;
    const fade = MathUtils.smoothstep(v.y, 0.12, 0.3) * (1 - MathUtils.smoothstep(h, 0.9, 0.985));
    // Uneven, as a hand leaves them: the depth wanders with height and round the pot, the pitch drifts a little.
    const wander = 0.55 + 0.45 * Math.sin(v.y * 7.3 + seed * 2.1 + Math.sin(phi * 2 + seed) * 0.8);
    const ring = Math.sin(v.y * freq + phi + Math.sin(v.y * 3.1 + seed) * 0.9) * (inner ? 0.0045 : 0.0013) * fade * wander;
    const oval = 1 + 0.009 * h * Math.sin(phi * 2 + seed);
    const k = ((r + ring) * oval) / r;
    pos.setXYZ(i, v.x * k, v.y - half, v.z * k);
  }
  g.setAttribute("aSide", new Float32BufferAttribute(side, 1));
  g.computeVertexNormals();
  const radius = Math.max(...pts.map((p) => p.x));
  return { geometry: g, half, top, radius };
}

const FINISHES: Record<VesselFinish, { roughness: number; clearcoat: number; crackle: number }> = {
  gloss: { roughness: 0.12, clearcoat: 1, crackle: 0 },
  satin: { roughness: 0.34, clearcoat: 0.4, crackle: 0 },
  crackle: { roughness: 0.14, clearcoat: 1, crackle: 1 },
};

export function Vessel({
  form = "vase",
  glaze = "#c3cfbf",
  clay = "#b8875f",
  finish = "satin",
  glow,
  turn,
  spin = true,
  lean = true,
  seed = 3,
  shadow = true,
  position = [0, 0, 0],
  scale = 1,
}: Props) {
  const pivot = useRef<Group>(null);
  const body = useRef<Group>(null);
  const lamp = useRef<PointLight>(null);
  const level = useRef(0);
  useObjectMotion({ pivot, body, spin, lean, turn });
  const shape = SHAPES[form];
  const { geometry, half, top, radius } = useMemo(() => thrown(shape, seed), [shape, seed]);

  const uniforms = useMemo(() => {
    const r = rand(seed);
    // A handful of drips where the glaze ran in the kiln: an angle, a length and a width each.
    const drips = Array.from({ length: 8 }, (_, i) => new Vector3(((i + r() * 0.7) / 8) * Math.PI * 2 - Math.PI, r() < 0.7 ? 0.05 + r() * 0.13 : 0.02, 0.03 + r() * 0.05));
    return {
      uGlaze: { value: new Color(glaze) },
      uClay: { value: new Color(clay) },
      uLine: { value: shape.glazeLine - half },
      uDrips: { value: drips },
      uSeed: { value: seed },
      uGlazeRough: { value: FINISHES[finish].roughness },
      uCrackle: { value: FINISHES[finish].crackle },
      uFreq: { value: (Math.PI * 2) / RING_PERIOD },
      uTop: { value: top - half },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, half, top, seed, finish]);

  useFrame((_, delta) => {
    uniforms.uGlaze.value.set(glaze);
    uniforms.uClay.value.set(clay);
    level.current = MathUtils.damp(level.current, MathUtils.clamp(read(glow), 0, 1), 3, delta);
    if (lamp.current) lamp.current.intensity = level.current * level.current * 6;
  });

  const onBeforeCompile = (shader: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aSide;\nvarying vec3 vLocal;\nvarying float vSide;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;\nvSide = aSide;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform vec3 uGlaze; uniform vec3 uClay; uniform float uLine; uniform vec3 uDrips[8]; uniform float uSeed;
        uniform float uGlazeRough; uniform float uCrackle; uniform float uFreq; uniform float uTop;
        varying vec3 vLocal; varying float vSide;
        float vHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        vec3 vHash3(vec3 p) { return vec3(vHash(p), vHash(p + 13.1), vHash(p + 27.7)); }
        // Crazing: the edge between cells of a 3D cell noise.
        float craze(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); float d1 = 8.0; float d2 = 8.0;
          for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
            vec3 o = vec3(float(x), float(y), float(z));
            float d = length(o + vHash3(i + o) - f);
            if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
          }
          return d2 - d1;
        }`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        float ang = atan(vLocal.x, vLocal.z);
        float line = uLine + 0.014 * sin(ang * 3.0 + uSeed) + 0.008 * sin(ang * 7.0 + uSeed * 2.3);
        for (int i = 0; i < 8; i++) {
          float da = abs(mod(ang - uDrips[i].x + PI, 2.0 * PI) - PI);
          line -= uDrips[i].y * exp(-pow(da / uDrips[i].z, 2.0) * 2.2);
        }
        float above = vLocal.y - line;
        float glazed = max(vSide, smoothstep(-0.003, 0.003, above));
        // Thick where it stopped (a darker, richer bead), thin on the ring crests (it breaks lighter).
        float bead = (1.0 - vSide) * (1.0 - smoothstep(0.0, 0.07, above)) * glazed;
        float crest = sin(vLocal.y * uFreq + ang + sin(vLocal.y * 3.1 + uSeed) * 0.9) * 0.5 + 0.5;
        // A slow mottle where the glaze went on thicker or thinner, and a break to the clay at the rim.
        float mottle = sin(vLocal.y * 5.3 + sin(ang * 3.0 + uSeed) * 1.7) * sin(ang * 2.0 + vLocal.y * 2.1 + uSeed) * 0.5 + 0.5;
        float rim = smoothstep(uTop - 0.06, uTop, vLocal.y);
        vec3 glazeCol = uGlaze * mix(1.0, 0.6, bead) * mix(0.8, 1.2, mottle);
        glazeCol = mix(glazeCol, mix(glazeCol, uClay, 0.4) * 1.15, crest * 0.1 * (1.0 - vSide));
        glazeCol = mix(glazeCol, uClay * 1.1, rim * 0.45);
        glazeCol *= mix(1.0, 0.8, vSide * smoothstep(0.0, -0.5, vLocal.y));
        if (uCrackle > 0.5) glazeCol *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.035, craze(vLocal * vec3(9.0, 6.0, 9.0))));
        float speck = step(0.93, vHash(floor(vLocal * 160.0)));
        vec3 clayCol = uClay * (0.9 + 0.1 * vHash(floor(vLocal * 60.0))) * (1.0 - speck * 0.45);
        diffuseColor.rgb = mix(clayCol, glazeCol, glazed);`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.88, uGlazeRough, glazed);")
      .replace(
        "#include <lights_physical_fragment>",
        "#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= glazed;\n#endif",
      );
  };

  const f = FINISHES[finish];
  return (
    <group position={position} scale={scale}>
      <group ref={pivot} position={[0, -half, 0]}>
        <group ref={body} position={[0, half, 0]}>
          <mesh geometry={geometry}>
            <meshPhysicalMaterial
              key={`${form}-${finish}-${seed}`}
              color="#ffffff"
              roughness={f.roughness}
              clearcoat={f.clearcoat}
              clearcoatRoughness={finish === "satin" ? 0.28 : 0.04}
              sheen={finish === "satin" ? 0.35 : 0}
              sheenRoughness={0.5}
              sheenColor="#ffffff"
              side={DoubleSide}
              onBeforeCompile={onBeforeCompile}
              customProgramCacheKey={() => `struq-vessel-${finish}`}
            />
          </mesh>
          {glow !== undefined ? <pointLight ref={lamp} position={[0, half * 0.6, 0]} color="#ffb066" distance={3} decay={1.6} /> : null}
        </group>
      </group>
      {shadow ? <Shadow color="#000000" colorStop={0} opacity={0.5} fog={false} position={[0, -half + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[radius * 3.2, radius * 3.2, 1]} /> : null}
    </group>
  );
}

