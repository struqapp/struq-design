"use client";
// components/struq/kit/gl/TurnedObject.tsx (Struq kit): a turned or blown object in real material, lit from inside.
//
// Spins a profile (profiles.ts, or the client's own silhouette) into a mesh with a real wall, so glass has a lip and
// a thickness to refract through. Materials:
// - "glass": MeshTransmissionMaterial, the scene behind bent through the wall, tinted by `tint` with depth;
// - "ceramic": a glazed physical material with clearcoat and a little sheen;
// - "metal": brushed metal that reflects the Stage's light room.
// `glow` (0 to 1, a number or a Signal from useScrollProgress) lights it from inside: a filament pushed past 1 so the
// Stage's bloom catches it, plus a point light so the glow also lights the wall. `hang` adds a cap and a cord, for a
// pendant. It sways with the scroll speed and leans toward the pointer; turn either off with spin={false} or
// lean={false}.
//
//   <TurnedObject profile="pendant-globe" material="glass" tint="#e9b27c" glow={progress} hang />
import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  LatheGeometry,
  MathUtils,
  ShaderMaterial,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import { PROFILES, type Profile, type ProfileName } from "./profiles";
import { usePointer, useScrollVelocity, type Signal } from "./signals";

type Props = {
  profile?: ProfileName | Profile;
  material?: "glass" | "ceramic" | "metal";
  /** Surface colour: the glaze, the metal, or the glass's own tint at the surface. */
  color?: string;
  /** Glass only: the colour light takes on as it travels through the wall (attenuation). */
  tint?: string;
  /** Wall thickness in profile units. Default 0.06. */
  wall?: number;
  /** Inner light, 0 (off) to 1 (full). */
  glow?: number | Signal;
  /** The colour of the inner light. Default a warm filament. */
  glowColor?: string;
  /** Add a cap and a cord above, for a pendant. */
  hang?: boolean;
  /** Turn slowly and faster with the scroll speed. Default true. */
  spin?: boolean;
  /** Lean toward the pointer. Default true. */
  lean?: boolean;
  scale?: number;
  position?: [number, number, number];
};

const read = (v: number | Signal | undefined) => (typeof v === "number" ? v : (v?.current ?? 0));

/**
 * The outer silhouette, resampled along a smooth curve so the edge never reads as facets, offset inward by `wall`
 * along its normal and closed into one outline for the lathe.
 */
function wallOutline(profile: Profile, wall: number) {
  const outer = new SplineCurve(profile.map(([r, y]) => new Vector2(r, y))).getSpacedPoints(120).map((p) => new Vector2(Math.max(0, p.x), p.y));
  const inner = outer.map((p, i) => {
    const a = outer[Math.max(0, i - 1)];
    const b = outer[Math.min(outer.length - 1, i + 1)];
    const n = new Vector2(b.y - a.y, -(b.x - a.x)).normalize();
    return new Vector2(Math.max(0, p.x - n.x * wall), p.y - n.y * wall);
  });
  return [...outer, ...inner.reverse(), outer[0].clone()];
}

export function TurnedObject({
  profile = "pendant-globe",
  material = "glass",
  color = material === "metal" ? "#b08d57" : material === "ceramic" ? "#efe8dc" : "#ffffff",
  tint = "#f2d4b0",
  wall = 0.06,
  glow,
  glowColor = "#ffb066",
  hang = false,
  spin = true,
  lean = true,
  scale = 1,
  position = [0, 0, 0],
}: Props) {
  const pivot = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const filament = useRef<MeshBasicMaterial>(null);
  const lamp = useRef<PointLight>(null);
  const velocity = useScrollVelocity();
  const pointer = usePointer();
  const points = typeof profile === "string" ? PROFILES[profile] : profile;
  const top = points[points.length - 1][1];
  const geometry = useMemo(() => {
    const g = new LatheGeometry(wallOutline(points, wall), 128);
    g.computeVertexNormals();
    return g;
  }, [points, wall]);
  const hot = useMemo(() => new Color(glowColor), [glowColor]);
  const coil = useMemo(() => {
    const turns = 9;
    const pts = Array.from({ length: turns * 24 + 1 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return new Vector3(Math.cos(a) * 0.022, (i / (turns * 24) - 0.5) * 0.16, Math.sin(a) * 0.022);
    });
    return new TubeGeometry(new CatmullRomCurve3(pts), turns * 24, 0.004, 6, false);
  }, []);
  const halo = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: new Color(glowColor) }, uLevel: { value: 0 } },
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
            float core = pow(max(dot(normalize(vNormal), normalize(vView)), 0.0), 4.0);
            gl_FragColor = vec4(uColor * core * uLevel * 1.6, core * uLevel);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [glowColor],
  );
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  useFrame((_, delta) => {
    const g = pivot.current;
    if (!g) return;
    const v = velocity.current;
    if (spin && body.current) body.current.rotation.y += delta * (0.12 + Math.abs(v) * 1.4);
    // A pendant swings from its cap: the pivot sits at the top, so the sway reads as weight.
    const swayGoal = hang ? -v * 0.12 : 0;
    g.rotation.z = MathUtils.damp(g.rotation.z, swayGoal + (lean ? -pointer.current.x * 0.06 : 0), 3, delta);
    g.rotation.x = MathUtils.damp(g.rotation.x, lean ? -pointer.current.y * 0.05 : 0, 3, delta);
    const level = MathUtils.clamp(read(glow), 0, 1);
    if (filament.current) filament.current.color.copy(hot).multiplyScalar(0.15 + level * level * 14);
    halo.uniforms.uLevel.value = level * level;
    if (lamp.current) lamp.current.intensity = level * level * 22;
  });

  return (
    <group position={position} scale={scale}>
      <group ref={pivot} position={[0, top, 0]}>
        <group position={[0, -top, 0]}>
          <mesh ref={body} geometry={geometry}>
            {material === "glass" ? (
              <MeshTransmissionMaterial
                color={color}
                transmission={1}
                thickness={0.28}
                roughness={0.015}
                ior={1.5}
                chromaticAberration={0.035}
                anisotropicBlur={0.05}
                distortion={0.04}
                distortionScale={0.25}
                temporalDistortion={0}
                attenuationColor={tint}
                attenuationDistance={2.6}
                clearcoat={1}
                clearcoatRoughness={0.03}
                iridescence={0.12}
                iridescenceIOR={1.25}
                backside
                backsideThickness={0.15}
                samples={phone ? 4 : 8}
                resolution={phone ? 256 : 768}
                side={DoubleSide}
              />
            ) : material === "ceramic" ? (
              <meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.7} clearcoatRoughness={0.18} sheen={0.25} sheenColor="#ffffff" side={DoubleSide} />
            ) : (
              <meshStandardMaterial color={color} metalness={1} roughness={0.3} side={DoubleSide} />
            )}
          </mesh>
          {glow !== undefined ? (
            <group position={[0, (points[0][1] + top) * 0.5, 0]}>
              {/* A short vertical coil, not a ball: it reads as a lamp, and bloom turns it into a hot core. */}
              <mesh geometry={coil}>
                <meshBasicMaterial ref={filament} toneMapped={false} />
              </mesh>
              {/* The halo: a soft volume of light around the coil, brightest at its heart, additive. */}
              <mesh scale={0.42}>
                <sphereGeometry args={[1, 48, 48]} />
                <primitive object={halo} attach="material" />
              </mesh>
              <pointLight ref={lamp} color={glowColor} distance={8} decay={1.6} />
            </group>
          ) : null}
        </group>
        {hang ? (
          <group>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.2, 0.22, 0.16, 64]} />
              <meshStandardMaterial color="#9c7a4a" metalness={1} roughness={0.32} />
            </mesh>
            {/* The cord runs out of the top of the frame on purpose: Framed leaves it out when it measures. */}
            <mesh position={[0, 4, 0]} userData={{ unframed: true }}>
              <cylinderGeometry args={[0.008, 0.008, 8, 8]} />
              <meshStandardMaterial color="#111111" roughness={0.6} />
            </mesh>
          </group>
        ) : null}
      </group>
    </group>
  );
}
