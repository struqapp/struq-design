// app/fonts.ts (Struq recipe). canon.mjs type <pairing> rewrites this file; the default is serif-editorial.
// Each Google face is asked for its real weight range, then as the bare family as a fallback, because Google refuses a
// request for a weight the family lacks. The layout puts one <link> per URL in <head>; the token block in globals.css
// names the faces (--face-display, --face-body, --face-accent), so the blocks measure with the real face.
export const fontHrefs: string[] = [
  "https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&display=swap",
  "https://fonts.googleapis.com/css2?family=Fraunces&display=swap",
  "https://fonts.googleapis.com/css2?family=Urbanist:wght@100..900&display=swap",
  "https://fonts.googleapis.com/css2?family=Urbanist&display=swap",
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,100..900&display=swap",
  "https://fonts.googleapis.com/css2?family=Fraunces:ital@1&display=swap",
];
