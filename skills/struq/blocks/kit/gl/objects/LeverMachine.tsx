"use client";
// components/struq/kit/gl/objects/LeverMachine.tsx (Struq kit): a vintage Italian lever espresso machine, finished.
//
// Every part built as what it is, at the scale of a hand: a turned boiler with banded rings, a domed cap and a finial;
// a group head with a turned bell and beads and a pivot between two cheek plates; a tapered lever with a turned wooden or
// bakelite handle; a portafilter with its ears, two spouts and a handle; a slotted drip-tray grille with a cup on it;
// a pressure gauge with a printed face, a needle and glass; a sight glass; a steam wand with a knurled valve; an
// enamelled base with a seam, a trim band, a badge, a pilot lamp and turned feet. Use it as it is and adjust the props
// to the business (the café's colour, its metal); never rebuild one from boxes.
//
//   <Stage light="warm" post={{ bloom: 0.9, grain: 0.04 }}>
//     <Backdrop ground="#100c0a" glow="#9a5a32" light={0.6} />
//     <LeverMachine body="#7a1f1a" metal="chrome" lever={pull} glow={1} steam={pull} />
//   </Stage>
//
// Size and origin: the feet stand on y = -1; the boiler finial is at about y = 0.83 and the lever handle at about
// y = 1.12 at rest. It is 1.16 wide; the front (group, cup, badge) faces +z. Best seen from a three quarter view from
// the front right, for example camera at [3.2, 1.1, 4.4] looking at [0, 0, 0.1].
//
// Props:
// - body: the enamel colour of the base housing. Default a deep oxblood.
// - metal: "chrome" | "brass" | "copper" for the boiler, group, trim and fittings. Default "chrome".
// - handle: "wood" | "bakelite" for the lever and portafilter grips. Default "wood".
// - lever: 0 (at rest, up) to 1 (pulled down), a number or a Signal such as a scroll span. Damped, so a jump eases.
// - glow: 0 to 1 (number or Signal): the machine on. The pilot lamp and the sight glass light warm, and the gauge
//   needle climbs to working pressure. Default 1.
// - steam: 0 to 1 (number or Signal): soft wisps rising off the cup and the group. Default 0.
// - cup: show the espresso cup on the grille. Default true.
// - shadow: a soft contact shadow under the feet. Default true.
// - turn: an extra angle about the vertical axis in radians (number or Signal), on top of the slow spin.
// - spin, lean: the slow turn and the lean toward the pointer. Default true.
// - position, scale.
import { RoundedBox, Shadow } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  MathUtils,
  NormalBlending,
  Path,
  Quaternion,
  RepeatWrapping,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Curve,
  type Group,
  type MeshPhysicalMaterial,
  type PointLight,
} from "three";
import { METALS, knurled, read, slab, turned, useObjectMotion, type MetalName, type Value } from "./parts";

type Props = {
  body?: string;
  metal?: MetalName;
  handle?: "wood" | "bakelite";
  lever?: Value;
  glow?: Value;
  steam?: Value;
  cup?: boolean;
  shadow?: boolean;
  turn?: Value;
  spin?: boolean;
  lean?: boolean;
  position?: [number, number, number];
  scale?: number;
};

// Layout, in model units. The boiler stands behind, the group in front of it on the centre line.
const BOILER_Z = -0.12;
const GROUP_Z = 0.42;
const DECK = -0.545; // the top of the base trim, where boiler and tray stand
const PIVOT_Y = 0.43;
const GAUGE_PHI = 0.95; // the gauge faces front right, toward the three quarter camera
const GLASS_PHI = 1.75; // the sight glass on the right flank

const WARM = "#ffa04a";

/** A tube that tapers from r0 to r1 along its curve, as a forged lever does. */
function taperedTube(curve: Curve<Vector3>, segments: number, radial: number, r0: number, r1: number) {
  const g = new TubeGeometry(curve, segments, 1, radial, false);
  const pos = g.attributes.position;
  const p = new Vector3();
  const c = new Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, c);
    const r = MathUtils.lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Point a turned part (built along +y) along a direction. */
function along(dir: Vector3) {
  return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
}

/** Wood grain running the length of a turned grip, drawn once. */
function grain(kind: "wood" | "bakelite") {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = kind === "wood" ? "#6b3f22" : "#24170f";
  x.fillRect(0, 0, 256, 64);
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const u = r() * 256;
    x.strokeStyle = kind === "wood" ? `rgba(${30 + r() * 40},${14 + r() * 18},${6},${0.25 + r() * 0.35})` : `rgba(70,40,22,${0.08 + r() * 0.12})`;
    x.lineWidth = 0.6 + r() * 2.4;
    x.beginPath();
    x.moveTo(u, 0);
    x.bezierCurveTo(u + r() * 10 - 5, 20, u + r() * 10 - 5, 44, u + r() * 6 - 3, 64);
    x.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The gauge face: cream enamel, a 0 to 2.5 bar scale, the working band in green and the top in red. */
function gaugeFace() {
  if (typeof document === "undefined") return null;
  const n = 512;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d")!;
  const m = n / 2;
  const g = x.createRadialGradient(m, m * 0.85, 20, m, m, m);
  g.addColorStop(0, "#f6f0e2");
  g.addColorStop(1, "#ddd3bd");
  x.fillStyle = g;
  x.fillRect(0, 0, n, n);
  const at = (v: number, r: number) => {
    const a = ((-135 + (v / 2.5) * 270) * Math.PI) / 180;
    return [m + Math.sin(a) * r, m - Math.cos(a) * r];
  };
  const arc = (from: number, to: number, r: number, w: number, color: string) => {
    x.strokeStyle = color;
    x.lineWidth = w;
    x.beginPath();
    x.arc(m, m, r, ((-225 + (from / 2.5) * 270) * Math.PI) / 180, ((-225 + (to / 2.5) * 270) * Math.PI) / 180);
    x.stroke();
  };
  arc(0.8, 1.3, m * 0.78, 18, "#4f7a55");
  arc(2.0, 2.5, m * 0.78, 18, "#a8322b");
  x.strokeStyle = "#1d1a17";
  for (let i = 0; i <= 50; i++) {
    const v = i * 0.05;
    const major = i % 10 === 0;
    const mid = i % 5 === 0;
    const [x0, y0] = at(v, m * (major ? 0.66 : mid ? 0.7 : 0.74));
    const [x1, y1] = at(v, m * 0.84);
    x.lineWidth = major ? 7 : mid ? 4 : 2;
    x.beginPath();
    x.moveTo(x0, y0);
    x.lineTo(x1, y1);
    x.stroke();
  }
  x.fillStyle = "#1d1a17";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = "600 46px Georgia, serif";
  ["0", "0.5", "1", "1.5", "2", "2.5"].forEach((label, i) => {
    const [lx, ly] = at(i * 0.5, m * 0.5);
    x.fillText(label, lx, ly);
  });
  x.font = "italic 34px Georgia, serif";
  x.fillText("bar", m, m + m * 0.42);
  x.lineWidth = 3;
  x.beginPath();
  x.arc(m, m, m * 0.97, 0, Math.PI * 2);
  x.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The drip-tray grille: a plate with stadium slots, extruded with a bevel so every slot edge catches light. */
function grilleGeometry(w: number, d: number) {
  const r = 0.03;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, d / 2 - r);
  s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, d / 2);
  s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -d / 2 + r);
  s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  const slots = 7;
  const half = 0.011;
  const len = w * 0.36;
  for (let i = 0; i < slots; i++) {
    const y = (i - (slots - 1) / 2) * ((d - 0.09) / (slots - 1));
    for (const side of [-1, 1]) {
      const cx = side * (len / 2 + 0.018);
      const h = new Path();
      h.moveTo(cx - len / 2, y - half);
      h.lineTo(cx + len / 2, y - half);
      h.absarc(cx + len / 2, y, half, -Math.PI / 2, Math.PI / 2, false);
      h.lineTo(cx - len / 2, y + half);
      h.absarc(cx - len / 2, y, half, Math.PI / 2, Math.PI * 1.5, false);
      s.holes.push(h);
    }
  }
  const g = new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A cheek plate for the lever pivot: a tab with a round head, bevelled. */
function cheekGeometry() {
  const s = new Shape();
  const w = 0.07;
  s.moveTo(-w, -0.1);
  s.lineTo(w, -0.1);
  s.lineTo(w, 0);
  s.absarc(0, 0, w, 0, Math.PI, false);
  s.lineTo(-w, -0.1);
  const g = new ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 3, curveSegments: 24 });
  g.translate(0, 0, -0.008);
  g.rotateY(Math.PI / 2);
  return g;
}

/** The steam: soft sprites rising, widening and fading, drifting on their own seeds. */
function steamMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uScale: { value: 800 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime; uniform float uLevel; uniform float uScale;
      varying float vAlpha; varying float vSeed;
      void main() {
        float t = fract(uTime * (0.16 + 0.08 * aSeed) + aSeed * 7.31);
        vec3 p = position;
        p.x += sin(t * 5.0 + aSeed * 40.0) * 0.08 * t + t * 0.05;
        p.z += cos(t * 4.0 + aSeed * 23.0) * 0.05 * t + t * t * 0.3;
        p.y += t * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = mix(0.1, 0.45, t) * uScale / -mv.z;
        vAlpha = pow(sin(3.14159 * t), 0.8) * (1.0 - t * 0.5) * uLevel;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha; varying float vSeed;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q) * 2.0;
        float wisp = 0.65 + 0.35 * sin(q.x * 9.0 + vSeed * 30.0) * sin(q.y * 7.0 - vSeed * 11.0);
        float a = (1.0 - smoothstep(0.0, 1.0, d)) * wisp * vAlpha * 0.55;
        gl_FragColor = vec4(vec3(0.96, 0.94, 0.92), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
}

export function LeverMachine({
  body = "#6e1d19",
  metal = "chrome",
  handle = "wood",
  lever = 0,
  glow = 1,
  steam = 0,
  cup = true,
  shadow = true,
  turn,
  spin = true,
  lean = true,
  position = [0, 0, 0],
  scale = 1,
}: Props) {
  const pivot = useRef<Group>(null);
  const rig = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const needle = useRef<Group>(null);
  const pilot = useRef<MeshPhysicalMaterial>(null);
  const water = useRef<MeshPhysicalMaterial>(null);
  const lamp = useRef<PointLight>(null);
  const live = useRef({ lever: read(lever), glow: read(glow, 1), steam: 0, needle: 0 });
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  useObjectMotion({ pivot, body: rig, spin, lean, turn });

  const m = METALS[metal];
  const geo = useMemo(() => {
    const foot = turned([[0, 0], [0.05, 0], [0.064, 0.008], [0.07, 0.024], [0.064, 0.042], [0.05, 0.054], [0.042, 0.06], [0, 0.06]], 32, 32);
    // The boiler: a flange on the deck, two raised bands, a rolled rim, the dome and a turned finial.
    const boiler = turned(
      [
        [0, DECK], [0.4, DECK], [0.412, DECK + 0.012], [0.412, DECK + 0.036], [0.392, DECK + 0.046], [0.355, DECK + 0.054],
        [0.346, DECK + 0.07], [0.345, -0.27], [0.354, -0.262], [0.358, -0.245], [0.354, -0.228], [0.345, -0.22], [0.345, 0.27],
        [0.354, 0.278], [0.358, 0.295], [0.354, 0.312], [0.345, 0.32], [0.345, 0.43], [0.36, 0.438], [0.366, 0.455],
        [0.36, 0.472], [0.338, 0.48], [0.322, 0.51], [0.29, 0.56], [0.24, 0.605], [0.17, 0.64], [0.1, 0.66], [0.06, 0.667],
        [0.05, 0.675], [0.062, 0.688], [0.066, 0.703], [0.05, 0.713], [0.028, 0.725], [0.026, 0.745], [0.046, 0.762],
        [0.056, 0.785], [0.048, 0.808], [0.026, 0.824], [0, 0.828],
      ],
      128,
      260,
    );
    // The group: a bayonet collar, a bead, a swelling bell for the piston and spring, a bead and a cap; and the neck that
    // joins it to the boiler.
    const group = turned(
      [
        [0, -0.125], [0.1, -0.125], [0.132, -0.12], [0.152, -0.105], [0.157, -0.08], [0.152, -0.056], [0.132, -0.046],
        [0.112, -0.036], [0.104, -0.01], [0.104, 0.02], [0.112, 0.028], [0.116, 0.034], [0.112, 0.04], [0.108, 0.05],
        [0.114, 0.09], [0.126, 0.15], [0.128, 0.2], [0.122, 0.244], [0.114, 0.256], [0.124, 0.266], [0.132, 0.28],
        [0.128, 0.3], [0.112, 0.316], [0.08, 0.326], [0.04, 0.331], [0, 0.332],
      ],
      96,
      160,
    );
    const neck = turned([[0.11, 0], [0.13, 0.004], [0.134, 0.02], [0.118, 0.03], [0.088, 0.04], [0.085, 0.2], [0.095, 0.21], [0.1, 0.225]], 64, 48);
    const cheek = cheekGeometry();
    const pin = turned([[0, -0.105], [0.016, -0.104], [0.022, -0.097], [0.022, 0.097], [0.016, 0.104], [0, 0.105]], 32, 24);
    const hub = turned([[0.046, -0.054], [0.05, -0.05], [0.05, 0.05], [0.046, 0.054]], 48, 12);
    // The lever: a forged taper with a gentle outward bend near the grip.
    const leverCurve = new CatmullRomCurve3([new Vector3(0, 0.02, 0), new Vector3(0, 0.2, -0.004), new Vector3(0, 0.38, 0.006), new Vector3(0, 0.5, 0.035), new Vector3(0, 0.56, 0.07)]);
    const leverBar = taperedTube(leverCurve, 64, 16, 0.028, 0.017);
    const leverEnd = leverCurve.getPointAt(1);
    const leverDir = leverCurve.getTangentAt(1);
    const ferrule = turned([[0.016, 0], [0.024, 0.004], [0.027, 0.018], [0.025, 0.032], [0.022, 0.036]], 32, 16);
    const grip = turned([[0.02, 0.03], [0.032, 0.06], [0.04, 0.1], [0.045, 0.16], [0.046, 0.2], [0.043, 0.235], [0.034, 0.258], [0.018, 0.268], [0, 0.27]], 48, 48);
    // The portafilter: basket, ears, spout block, two spouts, an arm and a grip.
    const basket = turned([[0, -0.235], [0.08, -0.235], [0.106, -0.226], [0.118, -0.205], [0.122, -0.16], [0.134, -0.152], [0.136, -0.132], [0.128, -0.126], [0, -0.126]], 96, 48);
    const spoutBlock = turned([[0, -0.285], [0.02, -0.285], [0.034, -0.27], [0.036, -0.25], [0.03, -0.234], [0, -0.232]], 32, 24);
    const spout = (side: number) =>
      new TubeGeometry(new CatmullRomCurve3([new Vector3(0, -0.262, 0), new Vector3(side * 0.04, -0.268, 0), new Vector3(side * 0.058, -0.29, 0), new Vector3(side * 0.06, -0.318, 0)]), 16, 0.009, 10, false);
    const paArmCurve = new CatmullRomCurve3([new Vector3(0, -0.16, 0.1), new Vector3(0, -0.172, 0.2), new Vector3(0, -0.19, 0.29)]);
    const paArm = taperedTube(paArmCurve, 16, 14, 0.022, 0.018);
    const paEnd = paArmCurve.getPointAt(1);
    const paDir = paArmCurve.getTangentAt(1);
    const paGrip = turned([[0.019, 0], [0.026, 0.02], [0.031, 0.08], [0.034, 0.16], [0.034, 0.2], [0.03, 0.225], [0.018, 0.236], [0, 0.238]], 40, 40);
    // The gauge: a case, a rounded bezel, the stem and its hex nut.
    const gaugeCase = turned([[0, -0.045], [0.1, -0.045], [0.112, -0.038], [0.115, -0.01], [0.112, 0.0]], 96, 24).rotateX(Math.PI / 2);
    const bezel = turned([[0.098, 0.0], [0.116, 0.0], [0.124, 0.008], [0.124, 0.016], [0.117, 0.024], [0.104, 0.026], [0.098, 0.022]], 96, 32).rotateX(Math.PI / 2);
    const dome = turned([[0, 0.032], [0.05, 0.03], [0.09, 0.024], [0.102, 0.02]], 64, 16).rotateX(Math.PI / 2);
    const needleShape = new Shape();
    needleShape.moveTo(-0.007, -0.022);
    needleShape.lineTo(0.007, -0.022);
    needleShape.lineTo(0.0018, 0.082);
    needleShape.lineTo(-0.0018, 0.082);
    needleShape.closePath();
    const needleGeo = new ExtrudeGeometry(needleShape, { depth: 0.002, bevelEnabled: false });
    const stem = turned([[0.02, 0], [0.02, 0.05], [0.026, 0.05], [0.026, 0.07]], 24, 8).rotateX(Math.PI / 2);
    // The sight glass fittings and the steam valve.
    const fitting = turned([[0, -0.03], [0.028, -0.03], [0.036, -0.02], [0.036, 0.02], [0.028, 0.03], [0, 0.03]], 32, 20);
    const wandCurve = new CatmullRomCurve3([
      new Vector3(-0.36, 0.3, BOILER_Z), new Vector3(-0.44, 0.3, BOILER_Z + 0.02), new Vector3(-0.5, 0.24, BOILER_Z + 0.08),
      new Vector3(-0.52, 0.0, BOILER_Z + 0.2), new Vector3(-0.52, -0.22, BOILER_Z + 0.27),
    ]);
    const wand = new TubeGeometry(wandCurve, 64, 0.014, 12, false);
    const wandTip = wandCurve.getPointAt(1);
    const valveKnob = knurled(0.042, 0.05, 40, 0.07);
    const knobTop = turned([[0, 0.05], [0.04, 0.05], [0.032, 0.066], [0.012, 0.074], [0, 0.075]], 32, 16);
    // The base details: an oval badge, a pilot lamp bezel and jewel, a knurled switch.
    const badge = turned([[0, 0.006], [0.06, 0.006], [0.072, 0.004], [0.076, 0]], 64, 12).rotateX(Math.PI / 2);
    const emblemRim = new TorusGeometry(0.074, 0.005, 8, 64);
    const lampBezel = knurled(0.04, 0.022, 40, 0.06).rotateX(Math.PI / 2);
    const jewel = turned([[0, 0.034], [0.012, 0.033], [0.024, 0.028], [0.031, 0.02], [0.032, 0.0]], 32, 16).rotateX(Math.PI / 2);
    const switchKnob = knurled(0.044, 0.04, 36, 0.08).rotateX(Math.PI / 2);
    const grille = grilleGeometry(0.56, 0.38);
    // The base: a plinth, the enamelled housing in two parts with a dark seam between, the trim band on top, the tray.
    const plinth = slab(1.16, 1.08, 0.04, 0.09, 0.012);
    const lower = slab(1.1, 1.02, 0.132, 0.08, 0.012);
    const seam = slab(1.088, 1.008, 0.02, 0.074, 0);
    const upper = slab(1.1, 1.02, 0.212, 0.08, 0.012);
    const trim = slab(1.12, 1.04, 0.03, 0.085, 0.01);
    const tray = slab(0.6, 0.42, 0.05, 0.04, 0.012);
    // The cup and saucer, thrown white porcelain.
    const cupBody = turned([[0, 0], [0.04, 0], [0.046, 0.004], [0.062, 0.03], [0.07, 0.07], [0.073, 0.1], [0.069, 0.103], [0.064, 0.072], [0.056, 0.036], [0, 0.022]], 64, 64);
    const cupHandle = new TorusGeometry(0.026, 0.007, 10, 24, Math.PI * 1.2);
    const saucer = turned([[0, 0], [0.07, 0], [0.1, 0.008], [0.122, 0.02], [0.126, 0.025], [0.118, 0.024], [0.09, 0.014], [0.05, 0.012], [0, 0.012]], 72, 40);
    // The steam: soft sprites off the cup.
    const steamGeo = new BufferGeometry();
    const count = 56;
    const p = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 0.06;
      p[i * 3 + 1] = 0;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
      seed[i] = Math.random();
    }
    steamGeo.setAttribute("position", new BufferAttribute(p, 3));
    steamGeo.setAttribute("aSeed", new BufferAttribute(seed, 1));
    return {
      foot, boiler, group, neck, cheek, pin, hub, leverBar, leverEnd, leverDir, ferrule, grip, basket, spoutBlock,
      spoutL: spout(-1), spoutR: spout(1), paArm, paEnd, paDir, paGrip, gaugeCase, bezel, dome, needleGeo, stem, fitting,
      wand, wandTip, valveKnob, knobTop, badge, emblemRim, lampBezel, jewel, switchKnob, grille, plinth, lower, seam, upper, trim, tray, cupBody, cupHandle, saucer, steamGeo,
    };
  }, []);

  const gripMap = useMemo(() => grain(handle), [handle]);
  const face = useMemo(() => gaugeFace(), []);
  const steamMat = useMemo(() => steamMaterial(), []);
  const warm = useMemo(() => new Color(WARM), []);

  useFrame((state, delta) => {
    const s = live.current;
    s.lever = MathUtils.damp(s.lever, MathUtils.clamp(read(lever), 0, 1), 4, delta);
    s.glow = MathUtils.damp(s.glow, MathUtils.clamp(read(glow, 1), 0, 1), 3, delta);
    s.steam = MathUtils.damp(s.steam, MathUtils.clamp(read(steam), 0, 1), 2, delta);
    // A spring lever pulled down: from just past upright to a little below level, out over the front.
    if (arm.current) arm.current.rotation.x = MathUtils.lerp(0.16, 1.72, s.lever);
    // The gauge climbs to working pressure as the machine heats, and trembles a hair while it holds there.
    const bar = s.glow * (1.05 + 0.025 * Math.sin(state.clock.elapsedTime * 2.3)) + s.lever * 0.08;
    s.needle = MathUtils.damp(s.needle, bar, 2, delta);
    if (needle.current) needle.current.rotation.z = -((-135 + (s.needle / 2.5) * 270) * Math.PI) / 180;
    const g2 = s.glow * s.glow;
    if (pilot.current) pilot.current.emissive.copy(warm).multiplyScalar(0.05 + g2 * 2.4);
    if (water.current) water.current.emissive.copy(warm).multiplyScalar(0.02 + g2 * 0.9);
    if (lamp.current) lamp.current.intensity = g2 * 0.35;
    steamMat.uniforms.uTime.value = state.clock.elapsedTime;
    steamMat.uniforms.uLevel.value = s.steam;
    steamMat.uniforms.uScale.value = size.height * dpr * 0.5 * 2.4;
  });

  const metalMat = <meshPhysicalMaterial color={m.color} metalness={1} roughness={m.roughness} clearcoat={m.clearcoat} clearcoatRoughness={0.08} />;
  const satin = <meshPhysicalMaterial color={m.color} metalness={1} roughness={Math.min(0.5, m.roughness + 0.22)} />;
  const enamel = <meshPhysicalMaterial color={body} roughness={0.34} clearcoat={1} clearcoatRoughness={0.06} />;
  const gripMat =
    handle === "wood" ? (
      <meshPhysicalMaterial map={gripMap ?? undefined} color="#ffffff" roughness={0.42} clearcoat={0.55} clearcoatRoughness={0.2} />
    ) : (
      <meshPhysicalMaterial map={gripMap ?? undefined} color="#ffffff" roughness={0.26} clearcoat={0.9} clearcoatRoughness={0.1} />
    );
  const porcelain = <meshPhysicalMaterial color="#f4f1ea" roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} />;
  const gx = Math.sin(GAUGE_PHI) * 0.37;
  const gz = BOILER_Z + Math.cos(GAUGE_PHI) * 0.37;
  const sx = Math.sin(GLASS_PHI) * 0.382;
  const sz = BOILER_Z + Math.cos(GLASS_PHI) * 0.382;

  return (
    <group position={position} scale={scale}>
      <group ref={pivot} position={[0, -1, 0]}>
        <group ref={rig} position={[0, 1, 0]}>
          {/* Feet, plinth, enamelled housing, the seam and the trim band. */}
          {[[-0.48, -0.38], [0.48, -0.38], [-0.48, 0.5], [0.48, 0.5]].map(([x, z], i) => (
            <mesh key={i} geometry={geo.foot} position={[x, -1, z]}>
              {satin}
            </mesh>
          ))}
          <mesh geometry={geo.plinth} position={[0, -0.92, 0.06]}>
            {metalMat}
          </mesh>
          <mesh geometry={geo.lower} position={[0, -0.834, 0.06]}>
            {enamel}
          </mesh>
          <mesh geometry={geo.seam} position={[0, -0.769, 0.06]}>
            <meshStandardMaterial color="#0d0908" roughness={0.6} />
          </mesh>
          <mesh geometry={geo.upper} position={[0, -0.666, 0.06]}>
            {enamel}
          </mesh>
          <mesh geometry={geo.trim} position={[0, -0.56, 0.06]}>
            {metalMat}
          </mesh>
          {/* The badge, the pilot lamp and the switch on the housing front. */}
          <mesh geometry={geo.badge} position={[0, -0.69, 0.57]} scale={[1.9, 1, 1]}>
            <meshPhysicalMaterial color={METALS.brass.color} metalness={1} roughness={0.28} clearcoat={0.6} />
          </mesh>
          <mesh geometry={geo.lampBezel} position={[-0.36, -0.69, 0.568]}>
            {metalMat}
          </mesh>
          <mesh geometry={geo.jewel} position={[-0.36, -0.69, 0.58]}>
            <meshPhysicalMaterial ref={pilot} color="#ff9a3c" roughness={0.15} clearcoat={1} transmission={0.3} thickness={0.03} toneMapped={false} />
          </mesh>
          <pointLight ref={lamp} position={[-0.36, -0.66, 0.66]} color={WARM} distance={0.5} decay={2} />
          <mesh geometry={geo.switchKnob} position={[0.36, -0.69, 0.568]}>
            <meshPhysicalMaterial color="#1c1714" roughness={0.3} clearcoat={0.9} />
          </mesh>
          <RoundedBox args={[0.012, 0.05, 0.012]} radius={0.004} smoothness={2} position={[0.36, -0.672, 0.612]}>
            <meshStandardMaterial color="#e8e2d6" roughness={0.4} />
          </RoundedBox>
          {/* Drip tray and grille. */}
          <mesh geometry={geo.tray} position={[0, -0.52, 0.355]}>
            {satin}
          </mesh>
          <mesh geometry={geo.grille} position={[0, -0.497, 0.355]}>
            {metalMat}
          </mesh>
          {/* The boiler and what is mounted on it. */}
          <mesh geometry={geo.boiler} position={[0, 0, BOILER_Z]}>
            {metalMat}
          </mesh>
          <group position={[gx, 0.17, gz]} rotation={[0, GAUGE_PHI, 0]}>
            <mesh geometry={geo.stem} position={[0, 0, -0.115]}>
              {metalMat}
            </mesh>
            <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.024, 6]} />
              {metalMat}
            </mesh>
            <mesh geometry={geo.gaugeCase} position={[0, 0, 0]}>
              {metalMat}
            </mesh>
            <mesh position={[0, 0, 0.003]}>
              <circleGeometry args={[0.1, 64]} />
              <meshStandardMaterial map={face ?? undefined} roughness={0.55} />
            </mesh>
            <group ref={needle} position={[0, 0, 0.008]}>
              <mesh geometry={geo.needleGeo}>
                <meshStandardMaterial color="#8f1d17" roughness={0.4} />
              </mesh>
            </group>
            <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.01, 0.008, 20]} />
              {metalMat}
            </mesh>
            <mesh geometry={geo.dome}>
              <meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0} clearcoat={1} clearcoatRoughness={0} metalness={0} depthWrite={false} />
            </mesh>
            <mesh geometry={geo.bezel}>{metalMat}</mesh>
          </group>
          {/* The maker's emblem on the boiler, front left: a brass oval with a raised rim. */}
          <group position={[Math.sin(-0.62) * 0.348, 0.12, BOILER_Z + Math.cos(-0.62) * 0.348]} rotation={[0, -0.62, 0]}>
            <mesh geometry={geo.badge} scale={[1.25, 1.7, 1]}>
              <meshPhysicalMaterial color={METALS.brass.color} metalness={1} roughness={0.3} clearcoat={0.6} />
            </mesh>
            <mesh geometry={geo.emblemRim} scale={[1.25, 1.7, 1]}>
              <meshPhysicalMaterial color={METALS.brass.color} metalness={1} roughness={0.18} clearcoat={0.8} />
            </mesh>
          </group>
          {/* The sight glass: two fittings, the tube and the lit water in it. */}
          <group position={[sx, 0, sz]}>
            <mesh geometry={geo.fitting} position={[0, -0.36, 0]}>
              {metalMat}
            </mesh>
            <mesh geometry={geo.fitting} position={[0, 0.16, 0]}>
              {metalMat}
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.5, 24, 1, true]} />
              <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.01} roughness={0.02} clearcoat={1} side={DoubleSide} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.3, 20]} />
              <meshPhysicalMaterial ref={water} color="#c78a4a" roughness={0.1} transmission={0.4} thickness={0.05} />
            </mesh>
          </group>
          {/* The steam wand and its knurled valve. */}
          <mesh geometry={geo.wand}>{metalMat}</mesh>
          <mesh position={[geo.wandTip.x, geo.wandTip.y - 0.016, geo.wandTip.z]}>
            <cylinderGeometry args={[0.016, 0.01, 0.034, 16]} />
            {metalMat}
          </mesh>
          <group position={[-0.44, 0.31, BOILER_Z + 0.02]}>
            <mesh geometry={geo.valveKnob}>
              <meshPhysicalMaterial color="#1c1714" roughness={0.3} clearcoat={0.9} />
            </mesh>
            <mesh geometry={geo.knobTop}>
              <meshPhysicalMaterial color="#1c1714" roughness={0.3} clearcoat={0.9} />
            </mesh>
          </group>
          {/* The group head, its neck to the boiler and the pivot cheeks. */}
          <mesh geometry={geo.neck} position={[0, 0.1, BOILER_Z + 0.33]} rotation={[Math.PI / 2, 0, 0]}>
            {metalMat}
          </mesh>
          <group position={[0, 0, GROUP_Z]}>
            <mesh geometry={geo.group}>{metalMat}</mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} geometry={geo.cheek} position={[side * 0.068, PIVOT_Y, 0]}>
                {metalMat}
              </mesh>
            ))}
            <mesh geometry={geo.pin} position={[0, PIVOT_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
              {metalMat}
            </mesh>
            {/* The lever, turning about the pivot pin. */}
            <group ref={arm} position={[0, PIVOT_Y, 0]}>
              <mesh geometry={geo.hub} rotation={[0, 0, Math.PI / 2]}>
                {metalMat}
              </mesh>
              <mesh geometry={geo.leverBar}>{metalMat}</mesh>
              <group position={geo.leverEnd} quaternion={along(geo.leverDir)}>
                <mesh geometry={geo.ferrule}>{metalMat}</mesh>
                <mesh geometry={geo.grip}>{gripMat}</mesh>
              </group>
            </group>
            {/* The portafilter, locked in, its handle swung to the left so it reads in profile. */}
            <group rotation={[0, -0.55, 0]}>
              <mesh geometry={geo.basket}>{metalMat}</mesh>
              {[-1, 1].map((side) => (
                <RoundedBox key={side} args={[0.06, 0.02, 0.05]} radius={0.008} smoothness={3} position={[side * 0.15, -0.135, 0]}>
                  {metalMat}
                </RoundedBox>
              ))}
              <mesh geometry={geo.spoutBlock}>{metalMat}</mesh>
              <mesh geometry={geo.spoutL}>{metalMat}</mesh>
              <mesh geometry={geo.spoutR}>{metalMat}</mesh>
              <mesh geometry={geo.paArm}>{metalMat}</mesh>
              <group position={geo.paEnd} quaternion={along(geo.paDir)}>
                <mesh geometry={geo.paGrip}>{gripMat}</mesh>
              </group>
            </group>
          </group>
          {cup ? (
            <group position={[0, -0.494, GROUP_Z]}>
              <mesh geometry={geo.saucer}>{porcelain}</mesh>
              <group position={[0, 0.012, 0]}>
                <mesh geometry={geo.cupBody}>{porcelain}</mesh>
                <mesh geometry={geo.cupHandle} position={[0.078, 0.062, 0]} rotation={[0, 0, -Math.PI * 0.6]}>
                  {porcelain}
                </mesh>
                <mesh position={[0, 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.064, 40]} />
                  <meshPhysicalMaterial color="#9a5a2e" roughness={0.35} clearcoat={0.4} />
                </mesh>
              </group>
            </group>
          ) : null}
          <points geometry={geo.steamGeo} material={steamMat} position={[0, -0.37, GROUP_Z + 0.09]} frustumCulled={false} />
        </group>
      </group>
      {shadow ? <Shadow color="#000000" colorStop={0} opacity={0.55} fog={false} position={[0, -0.999, 0.06]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.0, 1.9, 1]} /> : null}
    </group>
  );
}

