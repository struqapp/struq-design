// app/scenes/Chrome.tsx: the frame round the scenes. The header bar (labels in the site's language) and the foot:
// the name at text size, the trade in one line, the chapters again.
import { HeaderBar } from "@/components/struq/headers/header-bar";
import { site } from "@/lib/site";

export function Header() {
  const { links, menu, menuHref, label } = site.nav;
  return <HeaderBar variant="quiet" name={site.name} links={[...links]} menuHref={menuHref} menuLabel={menu} navLabel={label} />;
}

export function Footer() {
  return (
    <footer data-bar-tone="ground" className="relative bg-surface-0">
      <div className="mx-auto grid max-w-[96rem] gap-10 px-4 pt-16 pb-12 md:grid-cols-12 md:px-[4vw] md:pt-24">
        <div className="md:col-span-5">
          <p className="font-display text-h3 text-ink">{site.name}</p>
          <p className="text-body text-ink-muted mt-2">{site.trade}</p>
        </div>
        <nav id="meny" aria-label={site.nav.chapters} className="md:col-span-4 md:col-start-9">
          <ul className="grid gap-2">
            {site.nav.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-body text-ink underline-offset-4 hover:underline">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
