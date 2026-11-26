"use client";
// app/scenes/Opening.tsx: the opening. The hero opener block with no photo, over the signature (./Facade): the canal at
// night fills the whole first screen, the street above and the water below, and "Always open." is set on the water.
// The choreography: the gate (the preloader) opens like a pair of doors onto the dark street, the quay lamps come on
// from the edges in, the far windows wake, the door flickers on last, and 1.05 s after the gate the line rises through
// its masks. On scroll the opener pins while the camera walks toward the lit door and the next scene slides over.
import { HeroOpener } from "@/components/struq/showpieces/hero-opener";
import { site } from "@/lib/site";
import { Facade } from "./Facade";

export function Opening() {
  const o = site.opening;
  return (
    <HeroOpener
      title={o.title}
      lead={o.lead}
      cta={{ href: site.door.href, label: o.cta }}
      backdrop={<Facade label={o.facade} open={o.hours.open} closed={o.hours.closed} />}
      barTone="inverse"
      delay={1.05}
    />
  );
}
