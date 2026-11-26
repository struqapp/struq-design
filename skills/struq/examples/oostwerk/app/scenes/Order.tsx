"use client";
// app/scenes/Order.tsx: the order close, on the night ground the street leaves. The line stands on the water above
// (./Street); here only what the studio takes on (by audience, the brief's two, a concrete line each; no prices) and,
// beside the rows on a wide screen and under them on a phone, the one door: the placeholder mail until the studio
// gives a real one.
import { Close } from "@/components/struq/kit/quiet";
import { site } from "@/lib/site";

export function Order() {
  const c = site.close;
  return (
    <div id="contact" data-bar-tone="inverse" className="scene-inverse relative bg-inverse">
      <Close shape="order" items={c.items} doors={[site.door]} locale={site.locale} className="!pt-14 !pb-16 md:!pt-16 md:!pb-20" />
    </div>
  );
}
