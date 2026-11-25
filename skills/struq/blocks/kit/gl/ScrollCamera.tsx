"use client";
// components/struq/kit/gl/ScrollCamera.tsx (Struq kit): the camera as a choreographed move on the scroll.
//
// Give it keyframes at points of one progress value (0 to 1) and it travels between them, eased and damped so it
// follows the scroll with weight instead of snapping to it. Write the beats in STRUQ.md first, then the keys:
//   <ScrollCamera progress={progress} path={[
//     { at: 0,    position: [0, 0.4, 7],   target: [0, 0.2, 0] },   // the object small, the headline reads
//     { at: 0.45, position: [1.6, 0.2, 3.6], target: [0, 0, 0] },   // circle in to the shoulder as the light comes up
//     { at: 1,    position: [0, -0.6, 4.4], target: [0, 0.3, 0] },  // settle low, looking up into the glow
//   ]} />
// Between two keys the move eases in and out (smoothstep), so every beat lands and holds for a moment.
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import type { Signal } from "./signals";

export type CameraKey = { at: number; position: [number, number, number]; target?: [number, number, number]; fov?: number };

type Props = {
  progress: Signal;
  path: CameraKey[];
  /** How quickly the camera catches up, higher is tighter. Default 3.5. */
  follow?: number;
  /**
   * The closest the camera may come to what it looks at, in scene units. Default 3.2: an object about 2 tall stays
   * whole in frame. A camera inside the glass shows one blurred blob, never the object; lower it only for a detail
   * shot you have looked at.
   */
  minDistance?: number;
};

export function ScrollCamera({ progress, path, follow = 3.5, minDistance = 3.2 }: Props) {
  const camera = useThree((s) => s.camera);
  const keys = useMemo(() => [...path].sort((a, b) => a.at - b.at), [path]);
  const scratch = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), lookNow: new Vector3(0, 0, 0), b: new Vector3() }), []);

  useFrame((_, delta) => {
    const p = MathUtils.clamp(progress.current, 0, 1);
    let i = keys.findIndex((k) => k.at > p);
    if (i === -1) i = keys.length - 1;
    const a = keys[Math.max(0, i - 1)];
    const b = keys[i];
    const span = b.at - a.at || 1;
    const t = MathUtils.smoothstep(MathUtils.clamp((p - a.at) / span, 0, 1), 0, 1);
    scratch.pos.set(...a.position).lerp(scratch.b.set(...b.position), t);
    scratch.look.set(...(a.target ?? [0, 0, 0])).lerp(scratch.b.set(...(b.target ?? [0, 0, 0])), t);
    // Never closer than minDistance to the target: keep the direction, push the camera back along it.
    scratch.b.copy(scratch.pos).sub(scratch.look);
    if (scratch.b.length() < minDistance) scratch.pos.copy(scratch.look).add(scratch.b.setLength(minDistance));
    const k = 1 - Math.exp(-follow * delta);
    camera.position.lerp(scratch.pos, k);
    scratch.lookNow.lerp(scratch.look, k);
    camera.lookAt(scratch.lookNow);
    const lens = camera as PerspectiveCamera;
    if (lens.isPerspectiveCamera && (a.fov || b.fov)) {
      const fovA = a.fov ?? lens.fov;
      const fovB = b.fov ?? fovA;
      lens.fov = MathUtils.lerp(lens.fov, MathUtils.lerp(fovA, fovB, t), k);
      lens.updateProjectionMatrix();
    }
  });
  return null;
}
