// components/struq/kit/gl/profiles.ts (Struq kit): silhouettes for turned objects.
//
// A profile is the outer half-silhouette of something made on a lathe or a blowpipe: [radius, height] pairs from the
// bottom up, in units where the object is about 2 tall. TurnedObject spins it into a mesh with a real wall. Draw your
// own from the client's object: trace its silhouette in 20 to 40 points, with the lip and the shoulder where they are.
// Never a sphere on a stick.
export type Profile = ReadonlyArray<readonly [number, number]>;

export const PROFILES = {
  /** A blown pendant globe: a soft round body, a short neck into the cap. */
  "pendant-globe": [
    [0.0, -1.0], [0.18, -0.985], [0.36, -0.94], [0.52, -0.86], [0.66, -0.75], [0.77, -0.61], [0.85, -0.45],
    [0.9, -0.27], [0.92, -0.08], [0.9, 0.1], [0.85, 0.28], [0.76, 0.45], [0.64, 0.6], [0.5, 0.72], [0.36, 0.8],
    [0.25, 0.86], [0.19, 0.92], [0.17, 1.0],
  ],
  /** A pendant bell: a narrow crown flaring to an open rim. */
  "pendant-bell": [
    [1.0, -0.62], [0.98, -0.56], [0.92, -0.44], [0.84, -0.3], [0.74, -0.14], [0.62, 0.04], [0.5, 0.22],
    [0.38, 0.42], [0.28, 0.6], [0.21, 0.78], [0.17, 0.92], [0.16, 1.0],
  ],
  /** A tall blown teardrop: the gather as it leaves the pipe. */
  "pendant-drop": [
    [0.0, -1.1], [0.14, -1.08], [0.3, -1.0], [0.44, -0.88], [0.55, -0.72], [0.62, -0.52], [0.64, -0.3],
    [0.62, -0.06], [0.56, 0.18], [0.46, 0.42], [0.34, 0.62], [0.24, 0.8], [0.18, 0.94], [0.16, 1.05],
  ],
  /** A thrown vase: foot, belly, waist, flared lip. */
  vase: [
    [0.0, -1.0], [0.42, -1.0], [0.46, -0.96], [0.5, -0.8], [0.62, -0.55], [0.7, -0.3], [0.68, -0.05],
    [0.56, 0.22], [0.4, 0.45], [0.32, 0.62], [0.32, 0.78], [0.38, 0.92], [0.44, 1.0],
  ],
  /** A cup or tumbler: a flat foot, a straight wall with a slight taper. */
  cup: [[0.0, -0.8], [0.52, -0.8], [0.55, -0.76], [0.58, -0.4], [0.62, 0.2], [0.66, 0.8]],
  /** A bottle: shoulder, neck and lip. */
  bottle: [
    [0.0, -1.2], [0.5, -1.2], [0.54, -1.15], [0.55, -0.4], [0.53, 0.05], [0.44, 0.3], [0.28, 0.48],
    [0.2, 0.62], [0.19, 1.0], [0.22, 1.05], [0.22, 1.12],
  ],
} as const satisfies Record<string, Profile>;

export type ProfileName = keyof typeof PROFILES;
