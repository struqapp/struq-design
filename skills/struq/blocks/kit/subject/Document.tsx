"use client";
// components/struq/kit/subject/Document.tsx (Struq recipe)
// A typeset paper document of a trade: an invoice, a quote, a receipt, a packing slip, a menu or a prescription
// label, set the way a good print shop would set it. The client's mark (their logo, or a monogram drawn from their
// name), the document number, dates, the parties, line items with quantities and amounts in tabular figures aligned
// on the decimal, subtotal, the tax line with its rate, the total, the payment line and the small print. Money and
// dates go through Intl in the client's locale and currency. The builder fills data; the typesetting lives here.
//
// <Document kind="invoice" locale="nl-NL" currency="EUR" number="2026-0142"
//   from={{ name: "Kraan & Zn. Installatietechniek", lines: ["Havenstraat 12", "3011 AB Rotterdam"] }}
//   to={{ name: "Familie de Wit", lines: ["Lindelaan 4", "3062 KL Rotterdam"] }}
//   fields={[{ label: "Factuurdatum", date: "2026-11-15" }, { label: "Vervaldatum", date: "2026-11-29" }]}
//   lines={[{ item: "Knelkoppeling 15 mm vervangen", qty: 2, price: 38.5 }, { item: "Voorrijkosten", amount: 45 }]}
//   tax={{ rate: 21 }} payment="Graag binnen 14 dagen op NL91 ABNA 0417 1643 00 onder vermelding van 2026-0142."
//   footer="KvK 81234567, btw NL0012.34.567.B01" caption="Een factuur zoals Kraan & Zn. hem verstuurt" />
//
// Props
// - kind: "invoice" (default), "quote", "receipt", "packing-slip", "menu" or "label" (a prescription or product label).
//   It sets the layout and the default title; every label can be overridden.
// - from: the issuer. name, lines (address, phone), logo (an image src; without it a monogram from the name).
// - to: optional, the other party: name, lines, label ("Billed to", "Ship to", the patient on a label).
// - number: the document number, set in tabular figures. title: overrides the kind's title ("Credit note").
// - fields: { label, value } or { label, date } pairs (dates as ISO 2026-11-15, written in the locale). Issue date,
//   due date, reference, table number, refills: whatever the document carries, in the client's words.
// - headline, text: a large line and a paragraph (the drug and its instructions on a label, a menu's season).
// - lines: { item, note?, qty?, unit?, price?, amount? }[]; amount defaults to qty times price. A { heading, lines }
//   entry starts a group (a menu's courses). Amounts sit in a column without symbol, aligned on the decimal.
// - tax: { rate, label?, included? }. rate in percent. included: the prices already hold it (a receipt), so the total
//   stays and the tax line says how much of it is tax.
// - payment: the payment line, in the client's words. footer: the small print.
// - currency (ISO 4217, default "EUR") and locale (BCP 47, default "en-GB"). The default labels follow the locale's
//   language (English or Dutch); pass labels for any other.
// - paper: "print" (default) a printed sheet in the palette's light colour and dark ink, whatever the scene;
//   "scene" the scene's own surface, for a document shown inside an AppScreen.
// - edge: "plain" (default), "fold" (a crease a third of the way down), "perforated" (the payment line on a tear-off
//   slip) or "torn" (a receipt's torn foot).
// - caption: a line under the sheet, in the scene's ink ("Sample invoice"). Saying it is a sample is the caller's job.
// - build: "scroll" (default) or "static".
// - className: on the figure. Width: the figure fills its column; the sheet keeps its own measure inside it.
//
// Mounting: inside any section, in a column of its own (an invoice wants six or more of twelve columns on a wide
// screen; a receipt or label four). The root is a <figure data-subject="document">.
//
// Motion: tied to the scroll. As the sheet comes up through the view its lines set in one after another and the total
// counts up from zero; it stands finished once its foot is in view. Reduced motion, build="static" or no scripts: the
// finished sheet, nothing moves.
import { useRef, type ReactNode } from "react";
import { useScrollBuild, countUp } from "./build";
import { amount, currencyDigits, dateText, FIGURES, keepUnits, languageOf, money, number as numberText, round } from "./format";
import { Mark } from "./Mark";

type Party = { name: string; lines?: string[] };
type Issuer = Party & { logo?: string };
type Recipient = Party & { label?: string };
type Field = { label: string; value?: string; date?: string };
type Line = { item: string; note?: string; qty?: number; unit?: string; price?: number; amount?: number };
type Group = { heading: string; lines: Line[] };
type Kind = "invoice" | "quote" | "receipt" | "packing-slip" | "menu" | "label";
type DocumentLabels = {
  title: string;
  number: string;
  to: string;
  item: string;
  qty: string;
  price: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  included: string;
};

type Props = {
  kind?: Kind;
  from: Issuer;
  to?: Recipient;
  number?: string;
  title?: string;
  fields?: Field[];
  headline?: string;
  text?: string;
  lines?: (Line | Group)[];
  tax?: { rate: number; label?: string; included?: boolean };
  payment?: string;
  footer?: string;
  currency?: string;
  locale?: string;
  labels?: Partial<DocumentLabels>;
  paper?: "print" | "scene";
  edge?: "plain" | "fold" | "perforated" | "torn";
  caption?: string;
  build?: "scroll" | "static";
  className?: string;
};

const TITLES: Record<string, Record<Kind, string>> = {
  en: { invoice: "Invoice", quote: "Quote", receipt: "Receipt", "packing-slip": "Packing slip", menu: "Menu", label: "" },
  nl: { invoice: "Factuur", quote: "Offerte", receipt: "Kassabon", "packing-slip": "Pakbon", menu: "Menukaart", label: "" },
};

const LABELS: Record<string, Omit<DocumentLabels, "title" | "to"> & { to: Record<Kind, string> }> = {
  en: {
    number: "No.",
    to: { invoice: "Billed to", quote: "Prepared for", receipt: "Customer", "packing-slip": "Ship to", menu: "", label: "Patient" },
    item: "Description",
    qty: "Qty",
    price: "Price",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "VAT",
    total: "Total",
    included: "incl.",
  },
  nl: {
    number: "Nr.",
    to: { invoice: "Factuur aan", quote: "Opgesteld voor", receipt: "Klant", "packing-slip": "Afleveradres", menu: "", label: "Patiënt" },
    item: "Omschrijving",
    qty: "Aantal",
    price: "Prijs",
    amount: "Bedrag",
    subtotal: "Subtotaal",
    tax: "Btw",
    total: "Totaal",
    included: "incl.",
  },
};

function labelsFor(kind: Kind, locale: string, own: Partial<DocumentLabels> = {}): DocumentLabels {
  const lang = LABELS[languageOf(locale)] ? languageOf(locale) : "en";
  const base = LABELS[lang];
  return { ...base, title: TITLES[lang][kind], to: base.to[kind], ...own };
}

const isGroup = (entry: Line | Group): entry is Group => "heading" in entry && Array.isArray((entry as Group).lines);

const lineAmount = (line: Line) =>
  line.amount ?? (line.price !== undefined ? (line.qty ?? 1) * line.price : undefined);

/** Small text: never under 12px. */
const SMALL = "text-[0.75rem] leading-[1.5]";
const LABEL = `${SMALL} text-ink-muted`;
const BODY = "text-[0.875rem] leading-[1.55] @lg:text-[0.9375rem]";

export function Document({
  kind = "invoice",
  from,
  to,
  number,
  title,
  fields = [],
  headline,
  text,
  lines = [],
  tax,
  payment,
  footer,
  currency = "EUR",
  locale = "en-GB",
  labels: own,
  paper = "print",
  edge = "plain",
  caption,
  build = "scroll",
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const labels = labelsFor(kind, locale, own);
  const heading = title ?? labels.title;

  const flat = lines.flatMap((entry) => (isGroup(entry) ? entry.lines : [entry]));
  const priced = kind !== "packing-slip" && flat.some((line) => lineAmount(line) !== undefined);
  const counted = kind !== "menu" && flat.some((line) => line.qty !== undefined);
  const unitPriced = priced && counted && flat.some((line) => line.price !== undefined);
  const digits = currencyDigits(locale, currency);
  const subtotal = round(
    flat.reduce((sum, line) => sum + (lineAmount(line) ?? 0), 0),
    digits,
  );
  const taxAmount = tax
    ? round(tax.included ? subtotal - subtotal / (1 + tax.rate / 100) : (subtotal * tax.rate) / 100, digits)
    : 0;
  const total = tax && !tax.included ? round(subtotal + taxAmount, digits) : subtotal;
  const totals = priced && kind !== "menu";

  useScrollBuild(
    root,
    build === "scroll",
    (el, tl) => {
      const rows = el.querySelectorAll("[data-doc-line]");
      tl.from(el.querySelectorAll("[data-doc-head] > *"), { autoAlpha: 0, y: 10, stagger: 0.1, duration: 0.6 });
      if (rows.length) tl.from(rows, { autoAlpha: 0, y: 8, stagger: 0.18, duration: 0.5 }, ">-0.1");
      const sums = el.querySelectorAll("[data-doc-sum]");
      if (sums.length) tl.from(sums, { autoAlpha: 0, y: 6, stagger: 0.12, duration: 0.4 }, ">-0.1");
      countUp(tl, el.querySelector<HTMLElement>("[data-count]"), (v) => money(v, locale, currency), "<");
      tl.from(el.querySelectorAll("[data-doc-foot]"), { autoAlpha: 0, duration: 0.4 }, ">-0.2");
    },
    [kind, lines.length, total],
  );

  const fieldValue = (field: Field) => (field.date ? dateText(field.date, locale, kind === "receipt" ? "medium" : "long") : field.value);
  const fig = (value: number) => amount(value, locale, currency);
  const taxLabel = tax ? `${tax.label ?? labels.tax} ${numberText(tax.rate, locale)}%` : "";

  const shared = { from, to, number, heading, fields, headline: headline && keepUnits(headline), text: text && keepUnits(text), labels, locale, fieldValue, fig, payment, footer };
  const sums = totals ? (
    <Totals
      subtotal={subtotal}
      taxAmount={taxAmount}
      total={total}
      tax={tax}
      taxLabel={taxLabel}
      labels={labels}
      locale={locale}
      currency={currency}
      compact={kind === "receipt"}
    />
  ) : null;

  const measure =
    kind === "receipt" ? "max-w-[22rem]" : kind === "label" ? "max-w-[34rem]" : kind === "menu" ? "max-w-[36rem]" : "max-w-[46rem]";

  return (
    <figure ref={root} data-subject="document" data-kind={kind} className={`@container m-0 ${className}`}>
      <div
        data-paper={paper}
        data-edge={edge}
        className={`subject-paper relative mx-auto w-full ${measure} ${kind === "label" ? "rounded-[0.75rem]" : ""} border border-line text-ink`}
      >
        {edge === "fold" ? <span aria-hidden="true" className="subject-fold" /> : null}
        {kind === "receipt" ? (
          <Receipt {...shared} lines={flat} counted={counted} priced={priced} sums={sums} />
        ) : kind === "menu" ? (
          <Menu {...shared} lines={lines} />
        ) : kind === "label" ? (
          <Label {...shared} />
        ) : (
          <Sheet
            {...shared}
            lines={lines}
            counted={counted}
            priced={priced}
            unitPriced={unitPriced}
            currency={currency}
            sums={sums}
            edge={edge}
          />
        )}
        {edge === "torn" ? <TornEdge /> : null}
      </div>
      {caption ? <figcaption className={`mx-auto mt-4 w-full ${measure} font-body text-sheet-label text-ink-muted`}>{caption}</figcaption> : null}
    </figure>
  );
}

type Shared = {
  from: Issuer;
  to?: Recipient;
  number?: string;
  heading: string;
  fields: Field[];
  headline?: string;
  text?: string;
  labels: DocumentLabels;
  locale: string;
  fieldValue: (field: Field) => string | undefined;
  fig: (value: number) => string;
  payment?: string;
  footer?: string;
};

function PartyBlock({ party, label }: { party: Recipient; label?: string }) {
  return (
    <div>
      {label ? <p className={`m-0 ${LABEL}`}>{label}</p> : null}
      <p className={`m-0 mt-1.5 font-medium ${BODY}`}>{party.name}</p>
      {party.lines?.map((line) => (
        <p key={line} className={`m-0 ${BODY} text-ink-muted`}>
          {line}
        </p>
      ))}
    </div>
  );
}

function FieldList({ fields, fieldValue, className = "" }: { fields: Field[]; fieldValue: Shared["fieldValue"]; className?: string }) {
  if (fields.length === 0) return null;
  return (
    <dl className={`m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 ${className}`}>
      {fields.map((field) => (
        <div key={field.label} className="contents">
          <dt className={LABEL}>{field.label}</dt>
          <dd className={`m-0 text-right ${SMALL} ${FIGURES}`}>{fieldValue(field)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Invoice, quote, packing slip: a sheet with a header, the parties, a ruled table and the sums under the amounts. */
function Sheet({
  from,
  to,
  number,
  heading,
  fields,
  headline,
  text,
  labels,
  fieldValue,
  fig,
  locale,
  payment,
  footer,
  lines,
  counted,
  priced,
  unitPriced,
  currency,
  sums,
  edge,
}: Shared & {
  lines: (Line | Group)[];
  counted: boolean;
  priced: boolean;
  unitPriced: boolean;
  currency: string;
  sums: ReactNode;
  edge: string;
}) {
  const cols = 1 + (counted ? 1 : 0) + (unitPriced ? 1 : 0) + (priced ? 1 : 0);
  return (
    <div className="px-[var(--pad)] pb-8 pt-7 [--pad:1.5rem] @lg:pb-12 @lg:pt-12 @lg:[--pad:3.5rem]">
      <div data-doc-head="" className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
        <div className="flex items-center gap-3.5">
          <Mark name={from.name} logo={from.logo} size={2.25} />
          <p className="m-0 max-w-[16rem] font-display text-[1.125rem] leading-[1.2] @lg:text-[1.25rem]">{from.name}</p>
        </div>
        {from.lines?.length ? (
          <address className={`not-italic ${SMALL} text-ink-muted @lg:text-right`}>
            {from.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        ) : null}
      </div>

      <div data-doc-head="" className="mt-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 @lg:mt-20">
        <p className="m-0 font-display text-[clamp(2.25rem,9cqi,3.75rem)] leading-[1] tracking-[-0.02em]">{heading}</p>
        {number ? (
          <p className={`m-0 ${BODY}`}>
            <span className="text-ink-muted">{labels.number} </span>
            <span className={FIGURES}>{number}</span>
          </p>
        ) : null}
      </div>

      {to || fields.length ? (
        <div data-doc-head="" className="mt-8 grid gap-x-10 gap-y-6 border-t border-line pt-6 @lg:grid-cols-2">
          {to ? <PartyBlock party={to} label={to.label ?? labels.to} /> : <span />}
          <FieldList fields={fields} fieldValue={fieldValue} className="self-start @lg:justify-self-end" />
        </div>
      ) : null}

      {headline || text ? (
        <div data-doc-head="" className="mt-8">
          {headline ? <p className="m-0 font-display text-[1.375rem] leading-[1.25]">{headline}</p> : null}
          {text ? <p className={`m-0 mt-2 max-w-[52ch] ${BODY} text-ink-muted`}>{text}</p> : null}
        </div>
      ) : null}

      {lines.length ? (
        <table className={`mt-10 w-full border-collapse ${BODY} @lg:mt-14`}>
          <thead>
            <tr className="border-b border-[color:var(--ink)]">
              <th scope="col" className={`pb-2.5 text-left font-normal ${LABEL}`}>
                {labels.item}
              </th>
              {counted ? (
                <th scope="col" className={`hidden pb-2.5 pl-4 text-right font-normal @md:table-cell ${LABEL}`}>
                  {labels.qty}
                </th>
              ) : null}
              {unitPriced ? (
                <th scope="col" className={`hidden pb-2.5 pl-4 text-right font-normal @lg:table-cell ${LABEL}`}>
                  {labels.price}
                </th>
              ) : null}
              {priced ? (
                <th scope="col" className={`pb-2.5 pl-4 text-right font-normal ${LABEL} whitespace-nowrap`}>
                  {labels.amount} <span className="opacity-80">{currency}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((entry, i) =>
              isGroup(entry) ? (
                <GroupRows key={`${entry.heading}-${i}`} group={entry} cols={cols} counted={counted} priced={priced} unitPriced={unitPriced} fig={fig} locale={locale} />
              ) : (
                <LineRow key={`${entry.item}-${i}`} line={entry} counted={counted} priced={priced} unitPriced={unitPriced} fig={fig} locale={locale} />
              ),
            )}
          </tbody>
        </table>
      ) : null}

      {sums}

      {payment ? (
        <div data-doc-foot="" className={edge === "perforated" ? "subject-slip mt-12 pt-7" : "mt-12"}>
          <p className={`m-0 max-w-[60ch] ${BODY}`}>{payment}</p>
        </div>
      ) : null}

      {footer ? (
        <p data-doc-foot="" className={`m-0 mt-10 border-t border-line pt-4 ${SMALL} text-ink-muted @lg:mt-16`}>
          {footer}
        </p>
      ) : null}
    </div>
  );
}

function LineRow({
  line,
  counted,
  priced,
  unitPriced,
  fig,
  locale,
}: {
  line: Line;
  counted: boolean;
  priced: boolean;
  unitPriced: boolean;
  fig: (value: number) => string;
  locale: string;
}) {
  const value = lineAmount(line);
  const qty = line.qty !== undefined ? `${numberText(line.qty, locale)}${line.unit ? ` ${line.unit}` : ""}` : "";
  return (
    <tr data-doc-line="" className="border-b border-line align-baseline">
      <td className="py-3 pr-2 @lg:py-3.5">
        <span className="block">{line.item}</span>
        {line.note ? <span className={`block ${SMALL} text-ink-muted`}>{line.note}</span> : null}
        {/* The quantity and price under the item where their columns do not fit. */}
        {counted && line.qty !== undefined ? (
          <span className={`block ${SMALL} text-ink-muted ${unitPriced ? "@lg:hidden" : "@md:hidden"}`}>
            <span className={FIGURES}>
              {qty}
              {unitPriced && line.price !== undefined ? ` × ${fig(line.price)}` : ""}
            </span>
          </span>
        ) : null}
      </td>
      {counted ? <td className={`hidden py-3 pl-4 text-right @md:table-cell @lg:py-3.5 ${FIGURES}`}>{qty}</td> : null}
      {unitPriced ? (
        <td className={`hidden py-3 pl-4 text-right text-ink-muted @lg:table-cell @lg:py-3.5 ${FIGURES}`}>
          {line.price !== undefined ? fig(line.price) : ""}
        </td>
      ) : null}
      {priced ? <td className={`py-3 pl-4 text-right @lg:py-3.5 ${FIGURES}`}>{value !== undefined ? fig(value) : ""}</td> : null}
    </tr>
  );
}

function GroupRows({
  group,
  cols,
  ...rest
}: {
  group: Group;
  cols: number;
  counted: boolean;
  priced: boolean;
  unitPriced: boolean;
  fig: (value: number) => string;
  locale: string;
}) {
  return (
    <>
      <tr data-doc-line="">
        <th scope="colgroup" colSpan={cols} className="pb-1 pt-6 text-left font-display text-[1.0625rem] font-normal">
          {group.heading}
        </th>
      </tr>
      {group.lines.map((line, i) => (
        <LineRow key={`${line.item}-${i}`} line={line} {...rest} />
      ))}
    </>
  );
}

function Totals({
  subtotal,
  taxAmount,
  total,
  tax,
  taxLabel,
  labels,
  locale,
  currency,
  compact,
}: {
  subtotal: number;
  taxAmount: number;
  total: number;
  tax?: { rate: number; label?: string; included?: boolean };
  taxLabel: string;
  labels: DocumentLabels;
  locale: string;
  currency: string;
  compact: boolean;
}) {
  const fig = (value: number) => amount(value, locale, currency);
  return (
    <dl className={`m-0 ml-auto grid grid-cols-[1fr_auto] gap-x-8 ${compact ? "mt-4 w-full" : "mt-6 w-full @lg:w-[58%]"} ${BODY}`}>
      {tax && !tax.included ? (
        <>
          <dt data-doc-sum="" className="py-1 text-ink-muted">
            {labels.subtotal}
          </dt>
          <dd data-doc-sum="" className={`m-0 py-1 text-right ${FIGURES}`}>
            {fig(subtotal)}
          </dd>
          <dt data-doc-sum="" className="py-1 text-ink-muted">
            {taxLabel}
          </dt>
          <dd data-doc-sum="" className={`m-0 py-1 text-right ${FIGURES}`}>
            {fig(taxAmount)}
          </dd>
        </>
      ) : null}
      <span data-doc-sum="" aria-hidden="true" className="col-span-2 mt-2 h-0 border-t border-[color:var(--ink)]" />
      <dt data-doc-sum="" className="self-baseline pt-3 font-medium">
        {labels.total}
      </dt>
      <dd data-doc-sum="" className="m-0 self-baseline pt-3 text-right">
        <span
          data-count={total}
          className={`font-display text-[1.625rem] leading-none tracking-[-0.01em] @lg:text-[2rem] ${FIGURES}`}
        >
          {money(total, locale, currency)}
        </span>
      </dd>
      {tax?.included ? (
        <>
          <dt data-doc-sum="" className={`pt-1.5 ${LABEL}`}>
            {labels.included} {taxLabel}
          </dt>
          <dd data-doc-sum="" className={`m-0 pt-1.5 text-right ${LABEL} ${FIGURES}`}>
            {fig(taxAmount)}
          </dd>
        </>
      ) : null}
    </dl>
  );
}

/** A till receipt: narrow, centred head, dashed rules, each line's quantity under its item. */
function Receipt({
  from,
  to,
  number,
  heading,
  fields,
  labels,
  fieldValue,
  fig,
  locale,
  payment,
  footer,
  lines,
  counted,
  priced,
  sums,
}: Shared & { lines: Line[]; counted: boolean; priced: boolean; sums: ReactNode }) {
  return (
    <div className="px-6 pb-9 pt-8 @sm:px-8">
      <div data-doc-head="" className="flex flex-col items-center text-center">
        <Mark name={from.name} logo={from.logo} size={2.5} />
        <p className="m-0 mt-3 font-display text-[1.25rem] leading-[1.2]">{from.name}</p>
        {from.lines?.map((line) => (
          <p key={line} className={`m-0 ${SMALL} text-ink-muted`}>
            {line}
          </p>
        ))}
      </div>
      <div data-doc-head="" className="subject-dashed mt-6 pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className={`m-0 ${BODY} font-medium`}>{heading}</p>
          {number ? <p className={`m-0 ${SMALL} ${FIGURES} text-ink-muted`}>{`${labels.number} ${number}`}</p> : null}
        </div>
        <FieldList fields={fields} fieldValue={fieldValue} className="mt-2" />
        {to ? <p className={`m-0 mt-2 ${SMALL} text-ink-muted`}>{`${to.label ?? labels.to}: ${to.name}`}</p> : null}
      </div>
      <ul className="subject-dashed m-0 mt-4 list-none p-0 pt-2">
        {lines.map((line, i) => {
          const value = lineAmount(line);
          return (
            <li key={`${line.item}-${i}`} data-doc-line="" className={`grid grid-cols-[1fr_auto] gap-x-4 py-1.5 ${BODY}`}>
              <span>{line.item}</span>
              <span className={`text-right ${FIGURES}`}>{priced && value !== undefined ? fig(value) : ""}</span>
              {counted && line.qty !== undefined && line.qty !== 1 ? (
                <span className={`${SMALL} text-ink-muted ${FIGURES}`}>
                  {numberText(line.qty, locale)}
                  {line.price !== undefined ? ` × ${fig(line.price)}` : ""}
                </span>
              ) : null}
              {line.note ? <span className={`col-span-2 ${SMALL} text-ink-muted`}>{line.note}</span> : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-2">{sums}</div>
      {payment ? (
        <p data-doc-foot="" className={`m-0 mt-5 ${SMALL} text-ink-muted`}>
          {payment}
        </p>
      ) : null}
      {footer ? (
        <p data-doc-foot="" className={`m-0 mt-6 text-center ${SMALL} text-ink-muted`}>
          {footer}
        </p>
      ) : null}
    </div>
  );
}

/** A menu: the house's name, the title large, courses as groups, each dish with its price on its first line. */
function Menu({ from, heading, fields, headline, text, fieldValue, fig, footer, lines }: Shared & { lines: (Line | Group)[] }) {
  const groups: Group[] = [];
  for (const entry of lines) {
    if (isGroup(entry)) groups.push(entry);
    else if (groups.length && groups[groups.length - 1].heading === "") groups[groups.length - 1].lines.push(entry);
    else groups.push({ heading: "", lines: [entry] });
  }
  return (
    <div className="px-7 pb-10 pt-9 @lg:px-14 @lg:pb-14 @lg:pt-12">
      <div data-doc-head="" className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Mark name={from.name} logo={from.logo} size={2} />
          <p className={`m-0 ${BODY} font-medium`}>{from.name}</p>
        </div>
        <FieldList fields={fields} fieldValue={fieldValue} />
      </div>
      <div data-doc-head="" className="mt-10 @lg:mt-14">
        <p className="m-0 font-display text-[clamp(2.5rem,11cqi,4rem)] leading-[0.95] tracking-[-0.02em]">{headline ?? heading}</p>
        {text ? <p className={`m-0 mt-4 max-w-[44ch] ${BODY} text-ink-muted`}>{text}</p> : null}
      </div>
      {groups.map((group, g) => (
        <section key={`${group.heading}-${g}`} className="mt-10 border-t border-line pt-5">
          {group.heading ? (
            <p data-doc-line="" className="m-0 font-display text-[1.25rem] leading-[1.2]">
              {group.heading}
            </p>
          ) : null}
          <ul className="m-0 mt-3 list-none p-0">
            {group.lines.map((line, i) => {
              const value = lineAmount(line);
              return (
                <li key={`${line.item}-${i}`} data-doc-line="" className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-2.5">
                  <span className={`${BODY} font-medium`}>{line.item}</span>
                  <span className={`${BODY} ${FIGURES}`}>{value !== undefined ? fig(value) : ""}</span>
                  {line.note ? <span className={`col-span-1 max-w-[46ch] ${SMALL} text-ink-muted`}>{line.note}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {footer ? (
        <p data-doc-foot="" className={`m-0 mt-10 border-t border-line pt-4 ${SMALL} text-ink-muted`}>
          {footer}
        </p>
      ) : null}
    </div>
  );
}

/** A dispensing or product label: the issuer's band, the person it is for, the product large, the instructions. */
function Label({ from, to, number, labels, fields, headline, text, fieldValue, footer }: Shared) {
  return (
    <div className="px-5 pb-5 pt-4 @md:px-7 @md:pb-6 @md:pt-5">
      <div data-doc-head="" className="flex items-center justify-between gap-4 border-b border-[color:var(--ink)] pb-3">
        <div className="flex items-center gap-2.5">
          <Mark name={from.name} logo={from.logo} size={1.75} />
          <div>
            <p className={`m-0 ${SMALL} font-medium text-ink`}>{from.name}</p>
            {from.lines?.length ? <p className={`m-0 ${SMALL} text-ink-muted`}>{from.lines.join(", ")}</p> : null}
          </div>
        </div>
        {number ? (
          <p className={`m-0 shrink-0 ${SMALL} ${FIGURES}`}>
            <span className="text-ink-muted">{labels.number} </span>
            {number}
          </p>
        ) : null}
      </div>
      <div data-doc-head="" className="pt-4">
        {to ? (
          <p className={`m-0 ${BODY}`}>
            <span className="text-ink-muted">{to.label ?? labels.to} </span>
            <span className="font-medium">{to.name}</span>
          </p>
        ) : null}
        {headline ? (
          <p className="m-0 mt-2 font-display text-[clamp(1.5rem,7cqi,2.125rem)] leading-[1.1] tracking-[-0.01em]">{headline}</p>
        ) : null}
        {text ? <p className="m-0 mt-3 text-[1rem] font-medium leading-[1.45] @md:text-[1.0625rem]">{text}</p> : null}
      </div>
      {fields.length ? (
        <dl data-doc-line="" className="m-0 mt-4 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-line pt-3 @md:grid-cols-4">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className={LABEL}>{field.label}</dt>
              <dd className={`m-0 ${SMALL} font-medium ${FIGURES}`}>{fieldValue(field)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {footer ? (
        <p data-doc-foot="" className={`m-0 mt-3 border-t border-line pt-2.5 ${SMALL} text-ink-muted`}>
          {footer}
        </p>
      ) : null}
    </div>
  );
}

/** A receipt's torn foot: the paper's own colour in a saw edge under the sheet. */
function TornEdge() {
  const teeth = 28;
  const points = Array.from({ length: teeth * 2 + 1 }, (_, i) => `${(i / (teeth * 2)) * 100},${i % 2 === 0 ? 0 : 6}`).join(" ");
  return (
    <svg aria-hidden="true" viewBox="0 0 100 6" preserveAspectRatio="none" className="subject-torn absolute left-[-1px] top-full block h-[0.5rem] w-[calc(100%+2px)]">
      <polygon points={`0,0 ${points} 100,0`} />
    </svg>
  );
}
