// components/struq/kit/drawn/index.ts (Struq recipe)
// The drawn pieces: precise line drawings of a trade's own construction, set in the page's ink and accent and built by
// a progress value the scene drives from its scroll. Where real-time 3D would look like a game, a drawing at the
// quality of a fine technical illustration carries the signature: true proportions, hatching by material, consistent
// stroke weights in screen pixels, names on leaders. Read each file header for its props.
export { RoofSection, ROOF_LAYERS, roofLayerAt, roofLayerProgress } from "./RoofSection";
export type { RoofCover, RoofLayer } from "./RoofSection";
