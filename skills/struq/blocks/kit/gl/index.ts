// components/struq/kit/gl (Struq kit): real-time 3D at studio level, on the page's one GSAP clock.
// Installed with `blocks.mjs add gl` (it also installs three and the React Three packages). Read
// references/realtime.md for the craft; read each file's header for its props.
export { Stage, type StageLight, type StagePost } from "./Stage";
export { TurnedObject } from "./TurnedObject";
export { ScrollCamera, type CameraKey } from "./ScrollCamera";
export { Backdrop } from "./Backdrop";
export { Pendant, LeverMachine, Vessel, FORM_FOOT, METALS, type PendantShape, type PendantCap, type VesselForm, type VesselFinish, type MetalName } from "./objects";
export { Roof, roofLayers, roofLayerAt, type RoofCover, type RoofLayer, type RoofColors } from "./objects";
export { PROFILES, type Profile, type ProfileName } from "./profiles";
export { useScrollProgress, useScrollVelocity, usePointer, useTokenColor, prefersReducedMotion, span, type Signal } from "./signals";
// One world behind the whole page: World (the fixed canvas, behind the type), the beats of the page's data-beat
// sections, a camera keyed by them and Framed, which keeps the object whole and on the free side.
export { World } from "./world/World";
export { BeatsProvider, useBeats, type Beats, type BeatRange } from "./world/beats";
export { BeatCamera, type BeatPose } from "./world/BeatCamera";
export { Framed, type FrameSide } from "./world/Framed";
