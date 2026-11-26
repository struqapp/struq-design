"use client";
// app/world.tsx: the signature. One blown glass pendant behind the whole page, keyed by the page's beats.
//
// World is the fixed canvas behind the type; BeatCamera picks the angle for each beat; Framed keeps the lamp whole
// and on the side the type leaves free. The lamp is the kit's Pendant, so every scene below only says where it is,
// how big, and how lit:
//   pusten    the gather hangs hot on its cord, swells to the globe and cools to clear glass
//   formen    the drawing's own ground covers the world; the lamp waits on the right
//   veggen    four more blown forms are lowered beside it and lit one by one: the row of five
//   rommene   the lamp hangs as the active room says (low, three in a row, long cord); the wall's pool warms
//   blatimen  the lamp in the middle, looked up at, lit; the pool opens round it
//   bestill   the order's ground covers it, still lit
//
// The frame box: Framed measures what it holds once. The lamps live in a group marked `unframed` beside an invisible
// box the size of one pendant, so the lamp can swell, drop or share the frame without Framed rescaling it.
//
// The row: the kit's Pendant renders the scene through its own glass (one extra pass each), which five at once cannot
// afford. The lamp keeps the Pendant; the four beside it are RowLamp, the same forms in plain physical glass with a
// filament and no light of their own (a light that comes and goes recompiles every material on the page).
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, LatheGeometry, MathUtils, Vector2, type Group, type MeshBasicMaterial } from "three";
import { BeatCamera, BeatsProvider, Framed, PROFILES, Pendant, World, useBeats, type Signal } from "@/components/struq/kit/gl";
import { site } from "@/lib/site";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const between = (t: number, a: number, b: number) => smooth(clamp01((t - a) / (b - a)));
const signal = (get: () => number): Signal => ({
  get current() {
    return get();
  },
});

type Profile = ReadonlyArray<readonly [number, number]>;
const CONE: Profile = [[0.8, -0.82], [0.775, -0.76], [0.67, -0.52], [0.54, -0.22], [0.41, 0.08], [0.3, 0.36], [0.21, 0.6], [0.165, 0.74], [0.155, 0.8]];
const FORM: Record<string, Profile> = { globe: PROFILES["pendant-globe"], drop: PROFILES["pendant-drop"], bell: PROFILES["pendant-bell"], cone: CONE };

/** The lamp that carries the page is the first product. */
const HERO = site.products[0];
/** The row in Veggen, left of the lamp: the other products, then a second globe in smoke, so no two are alike. */
const ROW = [
  ...site.products.slice(1).map((p) => ({ shape: p.shape as string, tint: p.tint })),
  { shape: "globe", tint: "#8e9a94" },
].map((p, i) => ({ ...p, y: [0.45, -0.15, 0.6, 0.05][i], scale: [0.78, 0.8, 0.74, 0.76][i] }));

/** Which room the Rommene list has active: the scene writes it on its section. */
const activeRoom = () => Number(document.querySelector<HTMLElement>("[data-beat='rommene']")?.dataset.room ?? 0);

/** One of the row: a blown form in physical glass, a copper cap, a cord and a filament that lights with `glow`. */
function RowLamp({ profile, tint, glow, seed }: { profile: Profile; tint: string; glow: Signal; seed: number }) {
  const geometry = useMemo(() => new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 72), [profile]);
  const top = profile[profile.length - 1][1];
  const sway = useRef<Group>(null);
  const filament = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const g = glow.current;
    if (sway.current) sway.current.rotation.z = 0.025 * Math.sin(clock.elapsedTime * 0.6 + seed);
    if (filament.current) filament.current.color.setRGB(1, 0.62, 0.32).multiplyScalar(0.15 + g * g * 14);
  });
  return (
    <group ref={sway} position={[0, 1, 0]}>
      <group position={[0, -1, 0]}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.1} roughness={0.03} ior={1.5} attenuationColor={tint} attenuationDistance={1.4} clearcoat={1} side={DoubleSide} />
        </mesh>
        <mesh position={[0, (top + 1) / 2, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 1 - top + 0.02, 24]} />
          <meshPhysicalMaterial color="#cf8a60" metalness={1} roughness={0.26} clearcoat={0.7} />
        </mesh>
        <mesh position={[0, 1 + 4.5, 0]}>
          <cylinderGeometry args={[0.013, 0.013, 9, 8, 1, true]} />
          <meshStandardMaterial color="#2a2622" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.05, 0]} scale={[0.07, 0.16, 0.07]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial ref={filament} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Lamps() {
  const { beat, on } = useBeats();
  const s = useMemo(
    () => ({ opening: beat("pusten"), wall: beat("veggen"), wallOn: on("veggen"), rooms: on("rommene"), hour: on("blatimen") }),
    [beat, on],
  );
  const size = useThree((st) => st.size);
  const aspect = size.width / Math.max(1, size.height);
  const phone = aspect < 0.8;
  // The row closes up on a narrow wide screen (1024), so the leftmost lamp keeps clear of the type.
  const step = 1.05 * MathUtils.clamp((aspect - 1) / 0.6, 0.78, 1);

  const content = useRef<Group>(null);
  const hero = useRef<Group>(null);
  const others = useRef<(Group | null)[]>([]);
  const room = useRef([1, 0, 0]);

  const heroGlow = useMemo(
    () =>
      signal(() => {
        const hot = 1 - between(s.opening.current, 0.15, 0.7);
        const lit = 0.45 * between(s.wall.current, 0.62, 0.72) * s.wallOn.current;
        return Math.max(hot, lit, 0.35 * s.rooms.current, s.hour.current);
      }),
    [s],
  );
  const rowGlow = useMemo(
    () => ROW.map((_, i) => signal(() => Math.max(0.5 * between(s.wall.current, 0.2 + i * 0.1, 0.28 + i * 0.1) * s.wallOn.current, 0.3 * s.rooms.current))),
    [s],
  );

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-4 * delta);
    const wallOn = s.wallOn.current;
    const rooms = s.rooms.current;
    const r = activeRoom();
    room.current = room.current.map((v, i) => MathUtils.lerp(v, i === r ? 1 : 0, k));
    const [table, counter, stair] = room.current.map((v) => v * rooms);

    // The lamp: swells from the gather in the opening, cap fixed; lower over the table, smaller over the counter,
    // dropped on a long cord in the stairwell.
    const h = hero.current;
    if (h) {
      const swell = 0.62 + 0.38 * between(s.opening.current, 0.05, 0.6);
      const sc = swell * (1 - 0.12 * table - 0.3 * counter - 0.22 * stair);
      h.scale.setScalar(sc);
      h.position.y = 1 - sc - 0.25 * table - 0.55 * stair;
    }

    // The row: lowered one after another beside the lamp; over the counter two of them stand behind it.
    others.current.forEach((g, i) => {
      if (!g) return;
      const lowered = between(wallOn * 1.4 - i * 0.12, 0, 1);
      const behind = i < 2 ? counter : 0;
      g.visible = Math.max(lowered, behind) > 0.01;
      const w = behind > lowered ? 1 : 0;
      const rowX = -(i + 1) * step;
      const rowY = ROW[i].y + (1 - lowered) * 3.6;
      // Over the counter: caps level with the lamp's (both at 0.7 of their size), receding behind it.
      const backX = i === 0 ? -0.5 : -1.0;
      g.position.set(MathUtils.lerp(rowX, backX, w), MathUtils.lerp(rowY, 0.3 + (1 - behind) * 3, w), w * -(1.6 + i * 1.6));
      g.scale.setScalar(MathUtils.lerp(ROW[i].scale, 0.7, w));
    });

    // On a phone the row is wider than the screen: it shrinks and travels past as the page scrolls.
    const c = content.current;
    if (c) {
      const on = phone ? wallOn : 0;
      const shrink = 1 - 0.5 * on;
      c.scale.setScalar(shrink);
      c.position.x = on * shrink * MathUtils.lerp(0.6, 4 * step, s.wall.current);
    }
  });

  return (
    <>
      {/* The frame box: one pendant's size. Framed measures this, never the lamps. */}
      <mesh visible={false}>
        <boxGeometry args={[1.84, 2, 1.84]} />
      </mesh>
      <group ref={content} userData={{ unframed: true }}>
        <group ref={hero}>
          <Pendant shape={HERO.shape} tint={HERO.tint} cap="copper" cordLength={9} glow={heroGlow} seed={2.1} />
        </group>
        {ROW.map((p, i) => (
          <group key={i} ref={(g) => void (others.current[i] = g)} visible={false}>
            <RowLamp profile={FORM[p.shape]} tint={p.tint} glow={rowGlow[i]} seed={3 + i * 1.3} />
          </group>
        ))}
      </group>
    </>
  );
}

function Scene() {
  const { on } = useBeats();
  // The wall's pool of light: low in the dark, warmer for the rooms, wide open in the blue hour.
  const pool = useMemo(() => {
    const rooms = on("rommene");
    const hour = on("blatimen");
    return signal(() => Math.max(0.22, 0.32 * rooms.current, 0.45 * hour.current));
  }, [on]);

  return (
    <World light="night" pool={pool} label={site.world.label}>
      <BeatCamera
        keys={{
          pusten: { position: [0, 0.3, 8], target: [0, 0.1, 0] },
          veggen: { position: [1.4, 1.1, 7.6], target: [0, 0, 0] },
          rommene: { position: [-1.4, -0.3, 7.8], target: [0, 0.1, 0] },
          blatimen: { position: [0.4, -1.5, 7.2], target: [0, 0.3, 0] },
        }}
      />
      <Framed
        side={{ pusten: "right", veggen: "right", rommene: "right", blatimen: "center" }}
        size={{ pusten: 0.7, formen: 0.7, veggen: 0.26, rommene: 0.42, blatimen: 0.46 }}
      >
        <Lamps />
      </Framed>
    </World>
  );
}

export default function PageWorld() {
  return (
    <BeatsProvider>
      <Scene />
    </BeatsProvider>
  );
}
