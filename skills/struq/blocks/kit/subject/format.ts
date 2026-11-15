// components/struq/kit/subject/format.ts (Struq recipe)
// The subject pieces' shared handwriting: money and dates through Intl in the client's locale, initials for a drawn
// monogram, a seed from a name, and the figure classes every amount carries. Pure functions, no React.
//
// money(1250, "nl-NL", "EUR")          -> "€ 1.250,00"
// amount(1250, "nl-NL", "EUR")         -> "1.250,00"   (the line items' figure, no symbol)
// dateText("2026-11-15", "en-GB")      -> "15 November 2026"
// initials("Atelier Oude Delft")       -> "AO"

/** Every amount and figure: tabular lining figures, never broken across lines (blocks.css, the subject section). */
export const FIGURES = "subject-figures";

/** How many fraction digits a currency shows in a locale (EUR 2, JPY 0). */
export function currencyDigits(locale: string, currency: string): number {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Rounded to the currency's own digits, so a total adds up to the cents it shows. */
export function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** The amount with its currency symbol, set the locale's way. */
export function money(value: number, locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** The amount alone, with the currency's digits and the locale's separators: the figure a line item column holds. */
export function amount(value: number, locale: string, currency: string): string {
  const digits = currencyDigits(locale, currency);
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}

/** A plain number in the locale (a quantity, a rate). */
export function number(value: number, locale: string, maxDigits = 2): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits }).format(value);
  } catch {
    return String(value);
  }
}

/**
 * An ISO date (2026-11-15) in the locale. Read and written in UTC, so the server and the browser print the same day
 * whatever their time zones. A string that is no ISO date comes back as it went in.
 */
export function dateText(iso: string, locale: string, style: "long" | "medium" | "short" = "long"): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "UTC" }).format(date);
  } catch {
    return iso;
  }
}

/** Day and month parts of an ISO date, for a ticket's large date figures. */
export function dateParts(iso: string, locale: string): { day: string; month: string; year: string; weekday: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const part = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
    } catch {
      return "";
    }
  };
  return { day: part({ day: "numeric" }), month: part({ month: "short" }), year: m[1], weekday: part({ weekday: "short" }) };
}

/** Two letters from a name: the first letters of its first two words, or the first two of a single word. */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s&-]/gu, "")
    .split(/[\s-]+/)
    .filter((word) => /\p{L}/u.test(word));
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** The letters of a name, spaces and punctuation out, upper case: what a ticket's pattern is set from. */
export function lettersOf(name: string): string[] {
  return Array.from(name.toUpperCase().replace(/[^\p{L}\p{N}]/gu, ""));
}

/** A small stable number from a text (FNV-1a), so a pattern drawn from a name is the same on every render. */
export function seed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A figure stays with its unit and a "No." with its figure: "500 mg", "15 mm", "Nr. 4" never part at a line end. */
export function keepUnits(text: string): string {
  return text
    .replace(/(\d)\s+(?=[\p{L}%°€£$]{1,4}(?![\p{L}]))/gu, "$1 ")
    .replace(/(\b(?:No|Nr|Rx)\.?)\s+(?=\d)/g, "$1 ");
}

/** The language of a locale, for the default labels ("nl-NL" -> "nl"). */
export function languageOf(locale: string): string {
  return locale.toLowerCase().split(/[-_]/)[0] ?? "en";
}
