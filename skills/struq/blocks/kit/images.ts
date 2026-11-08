// The image a block receives. In a client project the skill's images.mjs writes the list of these from a
// beeldbank pack; the lab passes a few fixed beeldbank photos so every block is judged on real photography.

export type StruqImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** "16:9", "21:9", "3:2", "4:5" or "1:1" */
  ratio: string;
  /** What the photo shows, in more words than the alt: read it to choose the right slot. */
  description: string;
  /** The photo's calm side ("left", "right", "top", "bottom", "center"): where copy reads over it. */
  negativeSpace?: string;
  /** Set on fallback plates (SVG), which next/image must not optimise. */
  unoptimized?: boolean;
};
