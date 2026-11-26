"use client";
// app/scenes/Daken.tsx: the city's roofs, in four generated stills set as the kit's GalleryRun sheet: tiles laid on
// the battens, slate after rain, a zinc gutter, the roofs of the old town. The captions say what each shows, never
// that it is this company's work. The line holds the run.
import { GalleryRun } from "@/components/struq/kit/middle";
import { site } from "@/lib/site";

export function Daken() {
  const { daken } = site;
  return (
    <section id="daken" data-bar-tone="ground" className="relative bg-surface-0">
      <GalleryRun variant="sheet" line={daken.line} images={daken.photos.map(({ caption, ...image }) => ({ image, caption }))} />
    </section>
  );
}
