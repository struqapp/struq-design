// app/scenes/Chrome.tsx: the frame round the scenes. The menu curtain in the gate language (the preloader's): the mark
// beside the name and one button that rolls Menu to Close; the menu opens from one accent line, two edges parting like
// the gate and like the street's door, the chapters rising through their masks. And the foot: the name at text size,
// the trade in one line, the chapters again, the photo credit and the Struq line.
import { MenuCurtain } from "@/components/struq/headers/menu-curtain";
import { Credit, Mark } from "@/components/struq/kit/brand";
import { imageCredit } from "@/lib/struq-images";
import { site } from "@/lib/site";

export function Header() {
  const { menuItems, menu, close, label } = site.nav;
  return (
    <MenuCurtain
      variant="gate"
      name={site.name}
      items={[...menuItems]}
      contact={{ label: site.door.label, href: site.door.href }}
      place={site.place}
      labels={{ menu, close, nav: label }}
      mark={<Mark symbol={site.brand.symbol} />}
    />
  );
}

export function Footer() {
  return (
    <footer data-bar-tone="ground" className="relative bg-surface-0">
      <div className="grid gap-10 px-sheet-margin pt-16 pb-12 md:grid-cols-12 md:pt-24">
        <div className="md:col-span-5">
          <p className="flex items-center gap-3 font-display text-h3 text-ink">
            <span className="block h-[1.1em] w-[1.1em]">
              <Mark symbol={site.brand.symbol} />
            </span>
            {site.name}
          </p>
          <p className="text-body mt-3 max-w-[40ch] text-ink-muted">{site.trade}</p>
        </div>
        <nav id="site-index" aria-label={site.nav.chapters} className="md:col-span-3 md:col-start-8">
          <ul className="grid gap-1">
            {site.nav.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-flex min-h-11 min-w-11 items-center text-body text-ink underline-offset-4 hover:underline">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-6 md:col-span-12">
          <a href={imageCredit.href} className="inline-flex min-h-11 items-center text-small text-ink-muted underline-offset-4 hover:underline">
            {imageCredit.label}
          </a>
          <Credit lang={site.lang} off={!site.credit} />
        </div>
      </div>
    </footer>
  );
}
