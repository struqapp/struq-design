"use client";
// app/scenes/Offerte.tsx: the close. The kit's order close: the question turned to the offer in one line, the five
// kinds of work on hairlines (no prices: the brief gave none), the quote as the large door and the phone beside it.
import { Close } from "@/components/struq/kit/quiet";
import { site } from "@/lib/site";

export function Offerte() {
  return (
    <section id="offerte" data-bar-tone="ground" className="relative bg-surface-0">
      <Close shape="order" locale={site.locale} line={site.offerte.title} items={site.offerte.services} doors={[site.quote, site.call]} />
    </section>
  );
}
