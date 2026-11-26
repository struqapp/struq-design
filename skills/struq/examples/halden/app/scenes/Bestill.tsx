"use client";
// app/scenes/Bestill.tsx: the close, on the page's own ground (it covers the world). The cord draws down to a small
// drawn pendant, the motif's last line, then the kit's order close: the four shapes on hairlines and the one door.
import { Close } from "@/components/struq/kit/quiet";
import { ScrubLine } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";

export function Bestill() {
  return (
    <section id="bestill" data-beat="bestill" data-bar-tone="ground" className="relative bg-surface-0">
      <div className="mx-auto flex max-w-[96rem] flex-col px-4 pt-[8svh] md:px-[4vw]">
        <ScrubLine axis="y" className="ml-[1.375rem] h-[12svh] text-ink-muted" start="top 90%" end="top 45%" />
        <svg viewBox="-24 -4 48 52" className="h-14 w-11 text-ink" aria-hidden>
          <path d="M-4.2 0 L-3.9 3.4 L3.9 3.4 L4.2 0 Z" fill="currentColor" />
          <path d="M-3.2 3.4 C-3.2 7 -16 10 -16 24 C-16 35 -8 42 0 42 C8 42 16 35 16 24 C16 10 3.2 7 3.2 3.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="0" cy="22" r="2.2" className="fill-accent" />
        </svg>
      </div>
      <Close
        shape="order"
        locale={site.locale}
        line={site.order.line}
        items={site.products.map(({ name, text }) => ({ name, text }))}
        doors={[site.door]}
        className="bg-transparent pt-10!"
      />
    </section>
  );
}
