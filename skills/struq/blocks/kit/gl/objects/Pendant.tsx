"use client";
// components/struq/kit/gl/objects/Pendant.tsx (Struq kit): a hand-blown glass pendant, finished, ready to hang.
//
// A blown shade with a real wall and lip (the scene bent through it), a little lean and wobble from the blower's hand,
// an Edison bulb inside with a caged filament that blooms with `glow`, a turned socket, a cap with a knurled ring and
// a fabric cord. Use it as it is and adjust the props to the business; it is drawn to the standard a lighting brand
// would shoot.
//
//   <Stage light="night" post={{ bloom: 1.1, grain: 0.04 }}>
//     <Backdrop ground="#0b0a09" glow="#b8743f" light={glow} />
//     <Pendant shape="globe" tint="#e9b27c" cap="brass" glow={glow} />
//   </Stage>
//
// Size and origin: about 2 units tall. The cap top, where it hangs, is at y = 1; the glass reaches down to about
// y = -1 (globe and drop) or y = -0.8 (bell and cone, which are open at the bottom). The cord runs up from y = 1 for
// `cordLength`. It swings from the cap, so scroll speed reads as weight.
//
// Props:
// - shape: "globe" | "drop" | "bell" | "cone". Default "globe".
// - tint: the colour light takes on through the glass (amber, smoke, sea green). Default a pale amber.
// - cap: "brass" | "black" | "copper". Default "brass".
// - cordLength: how far the cord runs up from the cap. Default 3 (out of frame).
// - glow: 0 (off) to 1 (lit), a number or a Signal such as useScrollProgress. The filament heats, the bulb and the
//   wall warm, and a light inside lights the room.
// - turn: an extra angle about the vertical axis in radians (number or Signal), on top of the slow spin.
// - spin, lean: the slow turn and the lean toward the pointer. Default true.
// - seed: the blower's hand; another number gives another lean and wobble. Default 1.
// - position, scale.
import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MathUtils,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
  type PointLight,
} from "three";
import { knurled, lathe, read, resample, turned, useObjectMotion, type Value } from "./parts";

export type PendantShape = "globe" | "drop" | "bell" | "cone";
export type PendantCap = "brass" | "black" | "copper";

type Props = {
  shape?: PendantShape;
  tint?: string;
  cap?: PendantCap;
  cordLength?: number;
  glow?: Value;
  turn?: Value;
  spin?: boolean;
  lean?: boolean;
  seed?: number;
  position?: [number, number, number];
  scale?: number;
};

type Form = {
  /** The outer silhouette, bottom up, ending in the neck under the cap. */
  profile: [number, number][];
  /** Open at the bottom: a rolled lip at the rim. */
  open: boolean;
  /** Where the bulb hangs (its bottom) and how big it is. */
  bulb: [number, number];
};

const FORMS: Record<PendantShape, Form> = {
  globe: {
    profile: [
      [0, -1], [0.2, -0.982], [0.4, -0.9], [0.56, -0.78], [0.68, -0.62], [0.76, -0.42], [0.79, -0.2], [0.77, 0.02],
      [0.7, 0.22], [0.58, 0.4], [0.44, 0.54], [0.3, 0.64], [0.21, 0.7], [0.165, 0.75], [0.155, 0.8],
    ],
    open: false,
    bulb: [-0.36, 1.25],
  },
  drop: {
    profile: [
      [0, -1.02], [0.12, -0.995], [0.26, -0.92], [0.38, -0.79], [0.47, -0.61], [0.53, -0.4], [0.55, -0.17],
      [0.52, 0.06], [0.45, 0.28], [0.35, 0.47], [0.25, 0.61], [0.19, 0.7], [0.162, 0.76], [0.155, 0.8],
    ],
    open: false,
    bulb: [-0.46, 1.0],
  },
  bell: {
    profile: [
      [0.88, -0.72], [0.86, -0.66], [0.8, -0.54], [0.72, -0.38], [0.62, -0.2], [0.51, 0.0], [0.4, 0.2], [0.3, 0.41],
      [0.22, 0.59], [0.175, 0.71], [0.155, 0.8],
    ],
    open: true,
    bulb: [-0.5, 1],
  },
  cone: {
    profile: [
      [0.8, -0.82], [0.775, -0.76], [0.67, -0.52], [0.54, -0.22], [0.41, 0.08], [0.3, 0.36], [0.21, 0.6], [0.165, 0.74],
      [0.155, 0.8],
    ],
    open: true,
    bulb: [-0.56, 1],
  },
};

const FINISH: Record<PendantCap, { color: string; metalness: number; roughness: number; clearcoat: number }> = {
  brass: { color: "#d4ad66", metalness: 1, roughness: 0.24, clearcoat: 0.7 },
  copper: { color: "#cf8a60", metalness: 1, roughness: 0.26, clearcoat: 0.7 },
  black: { color: "#16161a", metalness: 0.55, roughness: 0.42, clearcoat: 0.35 },
};

const WARM = "#ffb066";
const _c = new Color();

/** The glass wall: the silhouette offset inward along its normal, closed, spun, and given the blower's hand. */
function blownWall(profile: [number, number][], wall: number, seed: number) {
  const outer = resample(profile, 140);
  const inner = outer.map((p, i) => {
    const a = outer[Math.max(0, i - 1)];
    const b = outer[Math.min(outer.length - 1, i + 1)];
    const n = new Vector2(b.y - a.y, -(b.x - a.x)).normalize();
    return new Vector2(Math.max(0, p.x - n.x * wall), p.y - n.y * wall);
  });
  return byHand(lathe([...outer, ...inner.reverse(), outer[0].clone()], 128), seed);
}

/** The blower's hand: a lean to one side and a slow wobble round the belly, nothing at the neck. */
function byHand(g: BufferGeometry, seed: number) {
  const pos = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.x, v.z);
    // Strongest at the belly, nothing at the neck, so the cap always sits true.
    const belly = MathUtils.clamp((0.72 - v.y) / 1.2, 0, 1);
    const k = 1 + 0.022 * belly * (Math.sin(a * 2 + seed) * 0.6 + Math.sin(a * 3 + seed * 1.7) * 0.4);
    pos.setXYZ(i, v.x * k + 0.025 * belly * belly * Math.cos(seed), v.y, v.z * k + 0.025 * belly * belly * Math.sin(seed));
  }
  g.computeVertexNormals();
  return g;
}

/** A twill weave for the fabric cord, drawn once. */
function weave() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = "#1b1a19";
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = "#3a3633";
  x.lineWidth = 5;
  for (let i = -64; i < 128; i += 12) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 64, 64);
    x.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function Pendant({
  shape = "globe",
  tint = "#f2c993",
  cap = "brass",
  cordLength = 3,
  glow = 0,
  turn,
  spin = true,
  lean = true,
  seed = 1,
  position = [0, 0, 0],
  scale = 1,
}: Props) {
  const pivot = useRef<Group>(null);
  const body = useRef<Group>(null);
  const shade = useRef<MeshPhysicalMaterial>(null);
  const bulbGlass = useRef<MeshPhysicalMaterial>(null);
  const filament = useRef<MeshBasicMaterial>(null);
  const lamp = useRef<PointLight>(null);
  const level = useRef(read(glow));
  useObjectMotion({ pivot, body, spin, lean, turn, hang: true });

  const form = FORMS[shape];
  const finish = FINISH[cap];
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const [bulbBottom, bulbSize] = form.bulb;
  const bulbTop = bulbBottom + 0.5 * bulbSize;
  const filamentY = bulbBottom + 0.27 * bulbSize;

  const parts = useMemo(() => {
    const wall = blownWall(form.profile, 0.034, seed);
    const rim = form.open ? form.profile[0] : null;
    // An ST64 Edison bulb, socket up: narrow neck, full round bottom. Inner wall thin, as real bulb glass is.
    const bulb = turned(
      [
        [0, 0], [0.1, 0.01], [0.17, 0.06], [0.2, 0.14], [0.2, 0.24], [0.17, 0.33], [0.12, 0.4], [0.09, 0.45], [0.085, 0.5],
      ].map(([r, y]) => [r * bulbSize, bulbBottom + y * bulbSize] as [number, number]),
      64,
      64,
    );
    // The squirrel cage: one wire zigzagging round a ring, eight hairpins, the way an Edison filament is strung.
    const loops = 8;
    const cage = Array.from({ length: 321 }, (_, i) => {
      const t = i / 320;
      const a = t * Math.PI * 2;
      const tri = Math.abs(((t * loops * 2) % 2) - 1) * 2 - 1;
      return new Vector3(Math.sin(a) * 0.055 * bulbSize, filamentY + tri * 0.075 * bulbSize, Math.cos(a) * 0.055 * bulbSize);
    });
    const coil = new TubeGeometry(new CatmullRomCurve3(cage, true, "catmullrom", 0.1), 320, 0.0032, 5, true);
    // The glass stem and the two leads that carry the filament.
    const stem = turned(
      [[0, 0], [0.012, 0.0], [0.014, 0.12], [0.03, 0.2], [0.05, 0.25]].map(([r, y]) => [r * bulbSize, filamentY + 0.06 * bulbSize + y * bulbSize] as [number, number]),
      16,
      24,
    );
    // The socket: a turned shell with screw rings, then the threaded nipple up into the cap.
    const socketTop = bulbTop + 0.2;
    const socket = turned(
      [
        [0.07, bulbTop - 0.02], [0.088, bulbTop - 0.015], [0.092, bulbTop + 0.01], [0.092, bulbTop + 0.03], [0.083, bulbTop + 0.04],
        [0.083, bulbTop + 0.12], [0.09, bulbTop + 0.13], [0.09, bulbTop + 0.16], [0.075, socketTop - 0.01], [0.03, socketTop],
      ],
      48,
      60,
    );
    const ring = knurled(0.094, 0.026, 48, 0.05);
    const nipple = turned([[0.018, socketTop - 0.01], [0.02, socketTop], [0.02, 0.76], [0.018, 0.78]], 16, 8);
    // The cap: a rolled collar gripping the neck, a knurled ring, a domed cup and a turned cord grip.
    const collar = turned([[0.15, 0.735], [0.18, 0.737], [0.196, 0.75], [0.198, 0.775], [0.19, 0.792], [0.17, 0.795]], 96, 32);
    const knurl = knurled(0.212, 0.052, 84, 0.045);
    const cup = turned(
      [[0.17, 0.842], [0.198, 0.846], [0.202, 0.86], [0.202, 0.93], [0.192, 0.962], [0.165, 0.985], [0.11, 0.998], [0.05, 1.0], [0.0, 1.0]],
      96,
      48,
    );
    const grip = turned([[0, 1.0], [0.048, 1.0], [0.05, 1.012], [0.046, 1.025], [0.032, 1.035], [0.028, 1.09], [0.02, 1.1], [0, 1.1]], 32, 32);
    const lip = rim ? byHand(new TorusGeometry(rim[0] - 0.012, 0.02, 14, 128).rotateX(Math.PI / 2).translate(0, rim[1], 0), seed) : null;
    return { wall, bulb, coil, stem, socket, socketTop, ring, nipple, collar, knurl, cup, grip, lip };
  }, [form, seed, bulbBottom, bulbSize, bulbTop, filamentY]);

  const cord = useMemo(() => {
    const t = weave();
    if (t) t.repeat.set(1, cordLength * 18);
    return t;
  }, [cordLength]);

  const halo = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: new Color(WARM) }, uLevel: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vNormal; varying vec3 vView;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uLevel;
          varying vec3 vNormal; varying vec3 vView;
          void main() {
            float core = pow(max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
            gl_FragColor = vec4(uColor * core * uLevel * 1.4, core * uLevel);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const core = useMemo(() => {
    const m = halo.clone();
    m.uniforms = { uColor: { value: new Color("#ffc58a") }, uLevel: { value: 0 } };
    m.depthTest = false;
    return m;
  }, [halo]);
  const warm = useMemo(() => new Color(WARM), []);

  useFrame((_, delta) => {
    level.current = MathUtils.damp(level.current, MathUtils.clamp(read(glow), 0, 1), 3.5, delta);
    const l = level.current;
    const l2 = l * l;
    if (filament.current) filament.current.color.copy(warm).multiplyScalar(0.12 + l2 * 18);
    if (bulbGlass.current) bulbGlass.current.emissive.copy(warm).multiplyScalar(l2 * 0.55);
    if (shade.current) shade.current.emissive.copy(_c.copy(warm).multiplyScalar(l2 * 0.07));
    halo.uniforms.uLevel.value = l2;
    core.uniforms.uLevel.value = l2 * 2.2;
    if (lamp.current) lamp.current.intensity = l2 * 24;
  });

  const metal = <meshPhysicalMaterial color={finish.color} metalness={finish.metalness} roughness={finish.roughness} clearcoat={finish.clearcoat} clearcoatRoughness={0.12} />;

  return (
    <group position={position} scale={scale}>
      <group ref={pivot} position={[0, 1, 0]}>
        <group position={[0, -1, 0]}>
          <group ref={body}>
            <mesh geometry={parts.wall}>
              <MeshTransmissionMaterial
                ref={shade as never}
                color="#ffffff"
                transmission={1}
                thickness={0.12}
                roughness={0}
                ior={1.5}
                chromaticAberration={0.06}
                anisotropicBlur={0}
                distortion={0.025}
                distortionScale={0.3}
                temporalDistortion={0}
                attenuationColor={tint}
                attenuationDistance={2.6}
                clearcoat={1}
                clearcoatRoughness={0.02}
                iridescence={0.18}
                iridescenceIOR={1.25}
                specularIntensity={1}
                backside
                backsideThickness={0.12}
                samples={phone ? 4 : 8}
                resolution={phone ? 256 : 768}
                side={DoubleSide}
              />
            </mesh>
            {parts.lip ? (
              <mesh geometry={parts.lip}>
                <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.06} roughness={0.02} ior={1.5} attenuationColor={tint} attenuationDistance={0.25} clearcoat={1} />
              </mesh>
            ) : null}
            <mesh geometry={parts.bulb}>
              <meshPhysicalMaterial ref={bulbGlass} color="#fff6e8" transmission={1} thickness={0.01} roughness={0.04} ior={1.45} attenuationColor="#ffd9a0" attenuationDistance={0.6} transparent opacity={0.9} side={DoubleSide} />
            </mesh>
            <mesh geometry={parts.stem}>
              <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.02} roughness={0.08} transparent opacity={0.5} />
            </mesh>
            <mesh geometry={parts.coil}>
              <meshBasicMaterial ref={filament} toneMapped={false} />
            </mesh>
            <group position={[0, filamentY, 0]}>
              <mesh scale={0.34 * bulbSize}>
                <sphereGeometry args={[1, 32, 32]} />
                <primitive object={halo} attach="material" />
              </mesh>
              {/* The hot core seen through the glass: the shade's transmission pass dims what is inside it, so the
                  core is drawn again over the wall, small and additive, for the bloom to take. */}
              <mesh scale={0.16 * bulbSize} renderOrder={10}>
                <sphereGeometry args={[1, 24, 24]} />
                <primitive object={core} attach="material" />
              </mesh>
              <pointLight ref={lamp} color={WARM} distance={9} decay={1.5} />
            </group>
            <mesh geometry={parts.socket}>{metal}</mesh>
            <mesh geometry={parts.ring} position={[0, bulbTop + 0.045, 0]}>
              {metal}
            </mesh>
            <mesh geometry={parts.nipple}>{metal}</mesh>
          </group>
          <mesh geometry={parts.collar}>{metal}</mesh>
          <mesh geometry={parts.knurl} position={[0, 0.792, 0]}>
            {metal}
          </mesh>
          <mesh geometry={parts.cup}>{metal}</mesh>
          <mesh geometry={parts.grip}>{metal}</mesh>
          <mesh position={[0, 1.1 + cordLength / 2, 0]}>
            <cylinderGeometry args={[0.013, 0.013, cordLength, 12, 1, true]} />
            <meshPhysicalMaterial map={cord ?? undefined} color="#ffffff" roughness={0.85} sheen={1} sheenRoughness={0.6} sheenColor="#6a625a" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
