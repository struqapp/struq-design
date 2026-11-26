// app/not-found.tsx (Struq finish): the 404 in the site's own style: the logo, one line in the display face, one plain
// sentence and the way home, in the site's language (site.notFound overrides the words). Restyle it as a scene of the
// site if the idea asks for it; keep the way home.
import Link from "next/link";
import { Logo, notFoundWords } from "@/components/struq/kit/brand";
import { site } from "@/lib/site";

export default function NotFound() {
  const words = notFoundWords(site.lang, (site as { notFound?: { title?: string; text?: string; home?: string } }).notFound);
  return (
    <main className="flex min-h-[100svh] flex-col justify-between bg-surface-0 px-sheet-margin py-8 text-ink">
      <Link href="/" className="self-start text-[1.375rem]" aria-label={site.name}>
        <Logo name={site.name} symbol={site.brand.symbol} />
      </Link>
      <div className="max-w-[40rem] pb-[12svh]">
        <h1 className="font-display text-h2 leading-[1.05]">{words.title}</h1>
        <p className="text-body mt-4 text-ink-muted">{words.text}</p>
        <p className="mt-8">
          <Link href="/" className="text-body text-ink underline underline-offset-4">
            {words.home}
          </Link>
        </p>
      </div>
    </main>
  );
}
