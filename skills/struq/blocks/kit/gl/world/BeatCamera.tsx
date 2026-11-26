"use client";
// components/struq/kit/gl/world/BeatCamera.tsx (Struq kit): the camera of one world, keyed by the page's beats.
//
// Name a pose for each section (its data-beat) and the camera holds it while that section has the screen, then moves
// to the next one in the half screen of scroll where one section hands over to the next. The move ends a little
// before the new section's top reaches the top of the screen (`lead`), so the object has arrived before the
// section's line is read and never swings through a headline on the way. Write it inside <World>:
//   <BeatCamera keys={{
//     opening: { position: [0, 0.3, 8], target: [0, 0.2, 0] },
//     craft: { position: [2.4, 0.6, 6.5], target: [0, 0, 0], phone: { position: [0, 0.6, 9] } },
//     close: { position: [-1, -0.4, 8.5], target: [0, 0.3, 0] },
//   }} />
// A beat without a key keeps the pose before it. The pose sets the angle on the object (from above, from below, from
// the side); where the object sits on the screen and how big it is belongs to Framed, so a camera key can never push
// the object off the frame or into the type.
//
// Props:
//   keys     the pose for each beat: position, target (default the origin), fov, and phone (a position and target
//            used below 768px wide)
//   lead     page units (0 to 1) the move ends before the beat starts. Default a quarter screen of scroll. Give
//            Framed the same lead if you change it.
//   travel   page units the move takes. Default half a screen of scroll.
//   follow   how quickly the camera catches up, higher is tighter. Default 3.5.
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { ScrollCamera, type CameraKey } from "../ScrollCamera";
import { useBeats, useStops } from "./beats";

type V3 = [number, number, number];
export type BeatPose = { position: V3; target?: V3; fov?: number; phone?: { position: V3; target?: V3 } };

type Props = {
  keys: Record<string, BeatPose>;
  lead?: number;
  travel?: number;
  follow?: number;
};

export function BeatCamera({ keys, lead, travel, follow = 3.5 }: Props) {
  const { ranges, page } = useBeats();
  const stops = useStops(lead, travel);
  const phone = useThree((s) => s.size.width < 768);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !ranges.length) return;
    const names = new Set(ranges.map((r) => r.name));
    const lost = Object.keys(keys).filter((k) => !names.has(k));
    if (lost.length) console.warn(`BeatCamera: no [data-beat] for ${lost.join(", ")} in <main>.`);
  }, [keys, ranges]);

  const path = useMemo<CameraKey[]>(() => {
    const first = Object.values(keys)[0];
    if (!first || !stops.length) return [];
    let pose: BeatPose = keys[stops[0].name] ?? first;
    const out: CameraKey[] = [];
    for (const s of stops) {
      pose = keys[s.name] ?? pose;
      const position = phone && pose.phone ? pose.phone.position : pose.position;
      const target = (phone && pose.phone?.target) || pose.target || [0, 0, 0];
      out.push({ at: s.at, position, target, fov: pose.fov });
      if (s.until > s.at) out.push({ at: s.until, position, target, fov: pose.fov });
    }
    return out;
  }, [keys, stops, phone]);

  if (!path.length) return null;
  return <ScrollCamera progress={page} path={path} follow={follow} minDistance={0.5} />;
}
