"use client";
// app/scenes/Chrome.tsx: the frame round the scenes. The header bar (the mark, labels in the site's language, the
// phone number as its one action), the call bar and the foot.
//
// The call bar is the trade's own chrome: a visitor with a leak must reach the phone with a thumb on every screen. On
// a phone it is a bar across the bottom, Bellen and Offerte side by side, each 56px tall; on a wide screen the header
// carries the number, so the bar stays away. It slides off while Lek or the close holds the same doors large.
import { useState } from "react";
import { Call } from "@struq/icons";
import { HeaderBar } from "@/components/struq/headers/header-bar";
import { Credit, Mark } from "@/components/struq/kit/brand";
import { ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { HoverLink } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";

export function Header() {
  const { links, menu, menuHref, label } = site.nav;
  return (
    <HeaderBar
      variant="quiet"
      name={site.name}
      links={[...links]}
      action={{ label: site.call.label, href: site.call.href }}
      menuHref={menuHref}
      menuLabel={menu}
      navLabel={label}
      mark={<Mark symbol={site.brand.symbol} />}
    />
  );
}

export function CallBar() {
  const [hidden, setHidden] = useState(false);
  useGSAP(() => {
    const lek = document.getElementById("lek");
    const close = document.getElementById("offerte");
    if (!lek || !close) return;
    const shown = { lek: false, close: false };
    const update = () => setHidden(shown.lek || shown.close);
    ScrollTrigger.create({ trigger: lek, start: "top 60%", end: "bottom 40%", onToggle: (self) => ((shown.lek = self.isActive), update()) });
    ScrollTrigger.create({ trigger: close, start: "top 70%", end: () => ScrollTrigger.maxScroll(window) + 1, onToggle: (self) => ((shown.close = self.isActive), update()) });
  });
  const { call: phone, quote, callBar } = site;
  return (
    <nav
      aria-label={callBar.label}
      data-call-bar=""
      className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-surface-0 pb-[env(safe-area-inset-bottom)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${hidden ? "translate-y-full" : ""}`}
    >
      <a href={phone.href} data-door-placeholder="" className="flex h-14 items-center justify-center gap-2 bg-accent font-body text-body font-medium text-accent-ink">
        <Call aria-hidden className="size-[1.125rem]" />
        {callBar.call}
      </a>
      <a href={quote.href} data-door-placeholder="" className="flex h-14 items-center justify-center font-body text-body font-medium text-ink">
        {callBar.quote}
      </a>
    </nav>
  );
}

export function Footer() {
  const { call: phone, quote } = site;
  return (
    <footer data-scene="foot" data-bar-tone="ground" className="relative bg-surface-0">
      <div className="mx-auto grid max-w-[96rem] gap-10 border-t border-line px-4 pt-16 pb-28 md:grid-cols-12 md:px-[4vw] md:pt-20 md:pb-14">
        <div className="md:col-span-5">
          <p className="font-display text-h3 text-ink">{site.name}</p>
          <p className="text-body text-ink-muted mt-2 max-w-[34ch]">{site.trade}</p>
        </div>
        <ul className="grid content-start gap-2 md:col-span-3">
          <li>
            <HoverLink href={phone.href} data-door-placeholder="" className="text-body text-ink whitespace-nowrap">
              {phone.label}
            </HoverLink>
          </li>
          <li>
            <HoverLink href={quote.href} data-door-placeholder="" className="text-body text-ink">
              {quote.label}
            </HoverLink>
          </li>
        </ul>
        <nav id="menu" aria-label={site.nav.chapters} className="md:col-span-3 md:col-start-10">
          <ul className="grid content-start gap-2">
            {site.nav.links.map((l) => (
              <li key={l.href}>
                <HoverLink href={l.href} className="text-body text-ink">
                  {l.label}
                </HoverLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="md:col-span-12">
          <Credit lang={site.lang} off={!site.credit} />
        </p>
      </div>
    </footer>
  );
}
