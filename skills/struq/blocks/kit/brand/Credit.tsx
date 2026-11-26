// brand/Credit.tsx (Struq kit): the one quiet credit line, "Made with Struq" in the site's language, linking to
// struq.app, in the footer's smallest type. lib/site.ts `credit: false` removes it; it is on by default.
//
//   <Credit lang={site.lang} off={site.credit === false} />
//
// The footer blocks (footer-reveal, footer-contact) render it on their foot line from their `credit` prop: pass
// credit={site.credit === false ? false : site.lang}. A footer you wrote yourself places <Credit> on its last line.
const WORDS: Record<string, string> = {
  nl: "Gemaakt met Struq",
  nb: "Laget med Struq",
  no: "Laget med Struq",
  nn: "Laga med Struq",
  da: "Lavet med Struq",
  sv: "Gjord med Struq",
  de: "Gemacht mit Struq",
  fr: "Réalisé avec Struq",
  es: "Hecho con Struq",
  it: "Realizzato con Struq",
  en: "Made with Struq",
};

export function creditWords(lang = "en") {
  return WORDS[lang.toLowerCase().split("-")[0]] ?? WORDS.en;
}

export function Credit({ lang = "en", off = false, className = "" }: { lang?: string; off?: boolean; className?: string }) {
  if (off) return null;
  return (
    <a
      href="https://struq.app"
      data-struq-credit=""
      className={`text-small text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline ${className}`}
    >
      {creditWords(lang)}
    </a>
  );
}

/** The 404's words, for the languages the credit knows; site.notFound overrides any of them. */
const LOST: Record<string, { title: string; text: string; home: string }> = {
  nl: { title: "Deze pagina is er niet.", text: "Het adres klopt niet, of de pagina is verhuisd.", home: "Naar de voorpagina" },
  nb: { title: "Denne siden finnes ikke.", text: "Adressen stemmer ikke, eller siden er flyttet.", home: "Til forsiden" },
  no: { title: "Denne siden finnes ikke.", text: "Adressen stemmer ikke, eller siden er flyttet.", home: "Til forsiden" },
  da: { title: "Siden findes ikke.", text: "Adressen passer ikke, eller siden er flyttet.", home: "Til forsiden" },
  sv: { title: "Sidan finns inte.", text: "Adressen stämmer inte, eller så har sidan flyttat.", home: "Till startsidan" },
  de: { title: "Diese Seite gibt es nicht.", text: "Die Adresse stimmt nicht, oder die Seite ist umgezogen.", home: "Zur Startseite" },
  fr: { title: "Cette page n'existe pas.", text: "L'adresse est inexacte, ou la page a changé de place.", home: "Retour à l'accueil" },
  en: { title: "This page is not here.", text: "The address is wrong, or the page has moved.", home: "Back to the front page" },
};

export function notFoundWords(lang = "en", own: { title?: string; text?: string; home?: string } = {}) {
  return { ...(LOST[lang.toLowerCase().split("-")[0]] ?? LOST.en), ...own };
}
