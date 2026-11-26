"use client";
// components/struq/kit/gl/world/World.tsx (Struq kit): one 3D world behind the whole page.
//
// The object the visitor meets at the opening stays with them: it moves aside while the craft is told, comes back
// when the material is the point, lights up for the centerpiece and settles by the door. World is the one fixed
// canvas for that, always BEHIND the type (a fixed Stage at -z-10: a world canvas above the page paints the object
// over every headline it passes), with a lit wall that follows the camera and the page's beats for everything inside.
//
// Mark each section of <main> with data-beat, then load the world in its own chunk:
//   // app/PageWorld.tsx
//   "use client";
//   // imports: BeatCamera, Framed, TurnedObject, World and useBeats, all from the kit's gl folder
//   function Pendant() {
//     const { on } = useBeats();
//     return <TurnedObject profile="pendant-globe" material="glass" hang glow={on("finale")} />;
//   }
//   export default function PageWorld() {
//     return (
//       <World light="night" label="A blown glass pendant that lights up as the page goes on">
//         <BeatCamera keys={{ opening: { position: [0, 0.3, 8] }, craft: { position: [2.5, 0.8, 7] } }} />
//         <Framed side={{ opening: "right", craft: "left", finale: "center" }}>
//           <Pendant />
//         </Framed>
//       </World>
//     );
//   }
//   // in the page: const PageWorld = dynamic(() => import(<your PageWorld file>), { ssr: false });
//   <main><PageWorld /><section data-beat="opening">...</section>...</main>
//
// Props:
//   light     the light room the object reflects: "studio" | "warm" | "night" | "daylight". Default "night".
//   post      the post stack (Stage's), or false. Default a little bloom and grain.
//   ground    the wall's far colour. Default the palette's --surface-0, so the world meets the page ground.
//   glow      the colour of the pool of light on the wall. Default the palette's --accent.
//   pool      how open that pool is, 0 to 1, a number or a Signal (on("finale")). Default 0.25.
//   camera    the start fov and position. Default fov 30 at [0, 0.3, 8].
//   poster    the still shown before the first frame and kept without WebGL.
//   label     what the world shows, for screen readers.
//   root      the element that holds the data-beat sections. Default "main".
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import { MathUtils, type Group } from "three";
import { Backdrop } from "../Backdrop";
import { Stage, type StageLight, type StagePost } from "../Stage";
import { useTokenColor, type Signal } from "../signals";
import { BeatsProvider, useBeats, useHasBeats } from "./beats";

type Props = {
  children: ReactNode;
  light?: StageLight;
  post?: StagePost | false;
  ground?: string;
  glow?: string;
  pool?: number | Signal;
  camera?: { fov?: number; position?: [number, number, number] };
  poster?: ReactNode;
  label?: string;
  root?: string;
};

const WALL = 8;

/**
 * The lit wall. Its pool of light sits behind the framed object as the camera sees it (the line from the eye through
 * the object to the wall), so the glass always has light to bend and the type stays on the darker ground. The wall
 * is far wider than the frame, so its edge never shows.
 */
function Wall({ ground, glow, pool }: { ground?: string; glow?: string; pool: number | Signal }) {
  const group = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const { focus } = useBeats();
  const surface = useTokenColor("--surface-0", "#0c0b0a");
  const accent = useTokenColor("--accent", "#b8743f");
  const seen = useRef(false);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const c = camera.position;
    let x = c.x;
    let y = c.y;
    const f = focus.current;
    if (f && c.z - f[2] > 0.1) {
      const t = (c.z + WALL) / (c.z - f[2]);
      x = c.x + (f[0] - c.x) * t;
      // The Backdrop's pool sits 0.4 above its centre.
      y = c.y + (f[1] - c.y) * t - 0.4;
    }
    const k = seen.current ? 1 - Math.exp(-6 * delta) : 1;
    seen.current = true;
    g.position.set(MathUtils.lerp(g.position.x, x, k), MathUtils.lerp(g.position.y, y, k), 0);
  });
  return (
    <group ref={group}>
      <Backdrop ground={ground ?? `#${surface.getHexString()}`} glow={glow ?? `#${accent.getHexString()}`} light={pool} distance={WALL} />
    </group>
  );
}

export function World({
  children,
  light = "night",
  post = { bloom: 1.1, grain: 0.04, vignette: 0.4 },
  ground,
  glow,
  pool = 0.25,
  camera = { fov: 30, position: [0, 0.3, 8] },
  poster,
  label,
  root = "main",
}: Props) {
  const inside = useHasBeats();
  const stage = (
    // -z-10 and fixed: behind every line of type on the page, for the whole page. Never remove the -z-10.
    <Stage className="pointer-events-none fixed inset-0 -z-10" light={light} post={post} camera={camera} poster={poster} label={label}>
      <Wall ground={ground} glow={glow} pool={pool} />
      {children}
    </Stage>
  );
  return inside ? stage : <BeatsProvider root={root}>{stage}</BeatsProvider>;
}
