"use client";
// components/struq/kit/gl/world/Framed.tsx (Struq kit): keeps the hero object whole in frame, on the side the type
// leaves free.
//
// Wrap the object in it inside <World>. Framed measures the object once (its bounding box, the hanging cord left
// out), then every frame scales it to a share of the screen's height and places it on the side you name, at the
// depth the camera looks at. So it is the same size and in the same place at 390, 1024 and 1440 wide, whatever the
// camera does: the camera keys choose the angle, Framed keeps the framing.
//   <Framed side={{ opening: "right", craft: "left", finale: "center" }} size={{ finale: 0.7 }}>
//     <TurnedObject profile="pendant-globe" material="glass" hang glow={on("finale")} />
//   </Framed>
// Between two beats the object crosses the screen in the same half screen of scroll the camera moves in, while one
// section hands over to the next and the middle band of the screen is free of type, and it shrinks a little on the
// way. Lay the sections out to match: at least a screen tall, the type vertically centred on the free side.
// On a phone (the screen narrower than 0.8 of its height) the object moves to the upper centre and shrinks, so the
// type in the lower half of each section stays clear.
//
// Props:
//   side       "left" | "right" | "center", or one per beat ({ craft: "left" }); a beat left out keeps the side
//              before it. Default "right".
//   size       the share of the screen's height the object may fill, a number or one per beat. Default 0.62.
//   margin     the gap to the screen's edge, as a share of its width. Default 0.06.
//   phoneSize  the share of the screen's height on a phone. Default 0.36.
//   lead, travel  the same schedule as BeatCamera; change them on both or neither.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { Box3, Matrix4, MathUtils, Vector3, type Group, type Mesh, type Object3D, type PerspectiveCamera } from "three";
import { locate, useBeats, useStops } from "./beats";

export type FrameSide = "left" | "right" | "center";
type PerBeat<T> = T | Record<string, T>;

type Props = {
  children: ReactNode;
  side?: PerBeat<FrameSide>;
  size?: PerBeat<number>;
  margin?: number;
  phoneSize?: number;
  lead?: number;
  travel?: number;
};

/** The object's own box, in its own units, leaving out anything marked userData.unframed (a cord, a beam of light). */
function measure(root: Object3D) {
  root.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const box = new Box3();
  const part = new Box3();
  const m = new Matrix4();
  const visit = (o: Object3D) => {
    if (o.userData?.unframed) return;
    const geometry = (o as Mesh).geometry;
    if ((o as Mesh).isMesh && geometry) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(part.copy(geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inverse, o.matrixWorld)));
    }
    o.children.forEach(visit);
  };
  root.children.forEach(visit);
  return box;
}

function perBeat<T>(value: PerBeat<T>, names: string[], fallback: T): T[] {
  if (typeof value !== "object" || value === null) return names.map(() => value as T);
  const map = value as Record<string, T>;
  let last = fallback;
  return names.map((n) => (last = map[n] ?? last));
}

export function Framed({ children, side = "right", size = 0.62, margin = 0.06, phoneSize = 0.36, lead, travel }: Props) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const box = useRef<{ size: Vector3; center: Vector3 } | null>(null);
  const { page, focus } = useBeats();
  const stops = useStops(lead, travel);
  const names = useMemo(() => stops.map((s) => s.name), [stops]);
  const sides = useMemo(() => perBeat<FrameSide>(side, names, "right"), [side, names]);
  const sizes = useMemo(() => perBeat<number>(size, names, 0.62), [size, names]);
  const v = useMemo(() => ({ fwd: new Vector3(), right: new Vector3(), up: new Vector3(), goal: new Vector3() }), []);

  useFrame((state) => {
    const g = outer.current;
    if (!g || !inner.current) return;
    if (!box.current) {
      const b = measure(inner.current);
      if (b.isEmpty()) return;
      box.current = { size: b.getSize(new Vector3()), center: b.getCenter(new Vector3()) };
    }
    const { size: bs, center } = box.current;
    const camera = state.camera as PerspectiveCamera;
    camera.updateMatrixWorld();
    camera.getWorldDirection(v.fwd);
    v.right.setFromMatrixColumn(camera.matrixWorld, 0);
    v.up.setFromMatrixColumn(camera.matrixWorld, 1);
    // The plane the camera looks at: the depth of the world's origin, never closer than 2.
    const depth = Math.max(2, -camera.position.dot(v.fwd));
    const h = 2 * depth * Math.tan(MathUtils.degToRad((camera.fov ?? 32) / 2));
    const aspect = state.size.width / Math.max(1, state.size.height);
    const w = h * aspect;
    const bw = Math.max(bs.x, bs.z, 0.001);
    const bh = Math.max(bs.y, 0.001);

    let x = 0;
    let y = 0;
    let s: number;
    if (aspect < 0.8) {
      // Phone: the upper centre, small, under the header's band.
      s = Math.min((phoneSize * h) / bh, (0.7 * w) / bw);
      y = h / 2 - 0.12 * h - (bh * s) / 2;
    } else {
      const place = (i: number) => {
        const sd = sides[i] ?? "right";
        let sc = Math.min(((sizes[i] ?? 0.62) * h) / bh, ((sd === "center" ? 0.8 : 0.4) * w) / bw);
        // Never past the top or bottom edge, with the margin's air.
        sc = Math.min(sc, (0.88 * h) / bh);
        const px = sd === "center" ? 0 : Math.max(0, w / 2 - margin * w - (bw * sc) / 2) * (sd === "left" ? -1 : 1);
        return { px, sc };
      };
      if (!stops.length) {
        const only = place(0);
        x = only.px;
        s = only.sc;
      } else {
        const { a, b, t } = locate(stops, page.current);
        const pa = place(a);
        const pb = place(b);
        x = MathUtils.lerp(pa.px, pb.px, t);
        // A little smaller on the way across, so it passes between the outgoing and the incoming type.
        s = MathUtils.lerp(pa.sc, pb.sc, t) * (1 - 0.22 * Math.sin(Math.PI * t));
      }
    }

    v.goal.copy(camera.position).addScaledVector(v.fwd, depth).addScaledVector(v.right, x).addScaledVector(v.up, y);
    g.scale.setScalar(s);
    g.position.copy(v.goal).addScaledVector(center, -s);
    focus.current = [v.goal.x, v.goal.y, v.goal.z];
  });

  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
