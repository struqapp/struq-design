"use client";
// contact-form (Struq section recipe)
// The one place a studio site asks for input: a name, an e-mail address, a short "Waar gaat het over?" and one
// optional choice (real radio inputs, styled as quiet rings). One submit, a text link with an arrow, never a filled
// button. Three compositions:
//
// - lines: a display line and a short note on the left, the fields on the right. Each label rests inside its field and
//   lifts to a small label above it when the field is focused or filled; each field is only a baseline rule that draws
//   in the accent from the left on focus (and draws back the way it came on leaving).
// - sentence: the form is a sentence the reader completes ("Ik ben [naam], bereikbaar op [e-mail], en ik wil het
//   hebben over [onderwerp]"), the blanks inline at display size in a light weight, each growing with what is typed.
//   Below 768 px the clauses stack, each fragment the label above its own field, in the same voice.
// - steps: one question at a time at display size. Enter or "Volgende" moves on, "Terug" goes back, the answers so far
//   stay small above the question, a thin rule fills as the questions are answered. Every move puts the focus in the
//   new question's field, so a screen reader hears the question as it arrives.
//
// <ContactForm variant="lines" action="/contact" onSubmit={(values) => fetch(...)} email="studio@noord.nl" />
//
// Every state is designed: rest, focus, typing, filled, invalid (said in plain Dutch beside the field once the reader
// leaves it or submits, never while typing; it clears as soon as the field is right), sending (the arrow travels, the
// fields are read-only), sent (the form gives way to a thank-you in the same place, which takes the focus) and failed
// (everything typed stays, the button says "Opnieuw versturen"). Every message has a slot of its own from the start,
// and the thank-you shares the form's cell, so no state moves the page.
//
// Without scripts it is a plain form: `action` and `method` post it, `required` and `type="email"` validate it
// natively, the steps stand stacked. The block itself never touches the network; `onSubmit` returns a promise and the
// block only reads whether it resolved. All motion is CSS transitions (blocks.css, "--- contact-form ---"), so an
// overtaken move reverses from where it is. Reduced motion: the same states as cuts and short fades.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export const CONTACT_FORM_VARIANTS = [
  { id: "lines", title: "Lijnen" },
  { id: "sentence", title: "Zin" },
  { id: "steps", title: "Stappen" },
] as const;

export type ContactFormVariant = (typeof CONTACT_FORM_VARIANTS)[number]["id"];

export type ContactFormValues = { naam: string; email: string; onderwerp: string; soort: string };

type Props = {
  variant?: ContactFormVariant;
  /** Where the form posts without scripts (and with scripts when no `onSubmit` is given). */
  action: string;
  method?: "post" | "get";
  /** Sends the message. Resolve for sent, reject for failed; the block never calls the network itself. */
  onSubmit?: (values: ContactFormValues) => Promise<unknown>;
  /** lines: the display line beside the form. sentence and steps: the section's name for screen readers. */
  title?: string;
  /** lines: the short note under the display line. */
  intro?: string;
  /** lines: an address to mail instead. */
  email?: string;
  /** The optional choice. An empty list leaves it out. */
  choices?: string[];
  /** The thank-you's second line: what happens next. */
  next?: string;
  className?: string;
};

type Field = "naam" | "email" | "onderwerp";
type Status = "idle" | "sending" | "sent" | "failed";

const FIELDS: Field[] = ["naam", "email", "onderwerp"];
const STEPS = ["naam", "email", "onderwerp", "soort"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_CHOICES = ["Nieuwbouw", "Verbouwing", "Interieur", "Iets anders"];

/** What is wrong with a field, in plain Dutch, or null when it is right. */
function check(field: Field, v: ContactFormValues): string | null {
  const s = v[field].trim();
  if (field === "naam") return s ? null : "Vul je naam in.";
  if (field === "email") {
    if (!s) return "Vul je e-mailadres in.";
    return EMAIL.test(s) ? null : "Dit lijkt nog geen e-mailadres.";
  }
  return s ? null : "Vertel kort waar het over gaat.";
}

// True once the block has hydrated: until then the form is the plain, natively validated one.
const noop = () => () => {};
const useLive = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** A field that grows with its text: a hidden copy of the value sizes the cell the field fills. */
function Grow({
  text,
  multiline = false,
  block = false,
  children,
}: {
  text: string;
  multiline?: boolean;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      data-cf-grow=""
      data-multiline={multiline ? "" : undefined}
      data-block={block ? "" : undefined}
      data-mirror={text}
    >
      {children}
      <span aria-hidden data-cf-rule="" />
    </span>
  );
}

const Arrow = ({ back = false }: { back?: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-[0.72em] w-[0.72em] shrink-0 ${back ? "rotate-180" : ""}`}
  >
    <path d="M3 12h17M14 5.5l6.5 6.5-6.5 6.5" />
  </svg>
);

export function ContactForm({
  variant = "lines",
  action,
  method = "post",
  onSubmit,
  title = "Vertel ons over je plek.",
  intro = "Een huis, een verbouwing, een winkel die beter kan. Schrijf in een paar zinnen wat je voor ogen hebt; we lezen alles zelf.",
  email,
  choices = DEFAULT_CHOICES,
  next = "We reageren binnen twee werkdagen.",
  className = "",
}: Props) {
  const uid = useId();
  const id = (part: string) => `${uid}-${part}`;
  const live = useLive();
  const [values, setValues] = useState<ContactFormValues>({ naam: "", email: "", onderwerp: "", soort: "" });
  const [shown, setShown] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [step, setStep] = useState(0);
  const dirty = useRef(new Set<Field>());
  // Every send carries an id; a result only lands while it is still the current one (and the block still mounted).
  const attempt = useRef(0);
  const focusNext = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const thanksRef = useRef<HTMLDivElement>(null);
  const sending = status === "sending";
  const last = STEPS.length - 1;
  const hasChoices = choices.length > 0;

  // The focus moves after the state it waits for has been drawn: a step made current, the thank-you shown.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    if (target === "thanks") thanksRef.current?.focus({ preventScroll: true });
    else document.getElementById(target)?.focus({ preventScroll: variant === "steps" });
  });

  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  function change(field: keyof ContactFormValues, value: string) {
    if (sending) return;
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (field === "soort") return;
    dirty.current.add(field);
    // While typing a message only ever goes away, the moment the field is right; it is never added.
    if (shown[field] && !check(field, nextValues)) setShown((s) => ({ ...s, [field]: undefined }));
  }

  function leave(field: Field) {
    if (!dirty.current.has(field) && !shown[field]) return;
    const msg = check(field, values) ?? undefined;
    setShown((s) => (s[field] === msg ? s : { ...s, [field]: msg }));
  }

  const soortTarget = () => {
    const i = choices.indexOf(values.soort);
    return id(`soort-${i < 0 ? 0 : i}`);
  };

  function go(to: number) {
    setStep(to);
    focusNext.current = STEPS[to] === "soort" ? soortTarget() : id(STEPS[to]);
  }

  function advance() {
    if (sending) return;
    const key = STEPS[step];
    if (key !== "soort") {
      const msg = check(key, values);
      if (msg) {
        setShown((s) => ({ ...s, [key]: msg }));
        focusNext.current = id(key);
        return;
      }
    }
    if (step >= last || (STEPS[step + 1] === "soort" && !hasChoices)) {
      formRef.current?.requestSubmit();
      return;
    }
    go(step + 1);
  }

  function stepKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    advance();
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    if (sending) {
      e.preventDefault();
      return;
    }
    const errors: Partial<Record<Field, string>> = {};
    for (const f of FIELDS) errors[f] = check(f, values) ?? undefined;
    const first = FIELDS.find((f) => errors[f]);
    if (first) {
      e.preventDefault();
      setShown(errors);
      if (variant === "steps") setStep(STEPS.indexOf(first));
      focusNext.current = id(first);
      return;
    }
    // Without a handler the browser posts the form to `action`, as it does without scripts.
    if (!onSubmit) return;
    e.preventDefault();
    const mine = ++attempt.current;
    setShown({});
    setStatus("sending");
    try {
      await onSubmit({
        naam: values.naam.trim(),
        email: values.email.trim(),
        onderwerp: values.onderwerp.trim(),
        soort: values.soort,
      });
      if (mine !== attempt.current) return;
      focusNext.current = "thanks";
      setStatus("sent");
    } catch {
      if (mine !== attempt.current) return;
      setStatus("failed");
    }
  }

  const fieldProps = (f: Field) => ({
    id: id(f),
    name: f,
    value: values[f],
    required: true,
    readOnly: sending,
    "aria-invalid": shown[f] ? true : undefined,
    "aria-describedby": shown[f] ? id(`${f}-msg`) : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(f, e.target.value),
    onBlur: () => leave(f),
  });

  const naamProps = { ...fieldProps("naam"), type: "text", autoComplete: "name", autoCapitalize: "words" } as const;
  const emailProps = {
    ...fieldProps("email"),
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    autoCapitalize: "off",
    spellCheck: false,
  } as const;
  const onderwerpProps = { ...fieldProps("onderwerp"), rows: 1, cols: 1 } as const;

  const msg = (f: Field) => (
    <span id={id(`${f}-msg`)} data-cf-msg="">
      {shown[f] ?? ""}
    </span>
  );

  const firstName = values.naam.trim().split(/\s+/)[0] ?? "";

  // The link-style button: large type, an arrow, a faint line at rest and a full one that draws on hover or focus.
  const linkButton = (label: string, props: { type: "submit" | "button"; onClick?: () => void; send?: boolean }) => (
    <button
      type={props.type}
      onClick={props.onClick}
      data-cf-link=""
      data-cf-send={props.send ? "" : undefined}
      aria-disabled={sending || undefined}
      className="group/cf relative inline-flex items-center gap-[0.42em] py-[0.2em] font-display text-[clamp(1.5rem,1.1rem+1.2vw,2.375rem)] leading-[1.1] tracking-[-0.01em]"
    >
      <span>{label}</span>
      <span data-cf-arrow="" className="inline-flex overflow-hidden py-[0.1em]">
        <Arrow />
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-current opacity-25" />
      <span
        aria-hidden
        data-cf-draw=""
        className="absolute inset-x-0 bottom-0 h-[2px] origin-right scale-x-0 bg-current transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cf:origin-left group-hover/cf:scale-x-100 group-focus-visible/cf:origin-left group-focus-visible/cf:scale-x-100 motion-reduce:transition-none"
      />
    </button>
  );

  // While sending the label holds still; the travelling arrow and the faded fields say it (the status line says it
  // to a screen reader). A label one syllable away would read as a glitch.
  const sendLabel = status === "failed" && !sending ? "Opnieuw versturen" : "Verstuur";
  const send = linkButton(sendLabel, { type: "submit", send: true });

  // The failure is said where it happened, beside the button, in a slot that is always there.
  const fail = (
    <p role="alert" data-cf-fail="" className="mt-4 min-h-[3em] text-small text-ink md:min-h-[1.5em]">
      {status === "failed" ? "Versturen lukte niet. Je tekst staat er nog; probeer het opnieuw." : ""}
    </p>
  );

  const liveRegion = (
    <p role="status" className="sr-only">
      {sending ? "Je bericht wordt verstuurd." : status === "sent" ? "Verstuurd." : ""}
    </p>
  );

  const radios = (size: "body" | "large", legend: ReactNode) =>
    hasChoices ? (
      <fieldset data-cf-choices="" className="min-w-0">
        {legend}
        <div className={`flex flex-wrap ${size === "large" ? "gap-x-10 gap-y-5" : "gap-x-8 gap-y-3"}`}>
          {choices.map((c, i) => (
            <label
              key={c}
              data-cf-choice=""
              className={`inline-flex cursor-pointer items-center gap-[0.6em] ${size === "large" ? "font-display text-[clamp(1.375rem,1.05rem+1.2vw,2.25rem)] leading-[1.2]" : "text-body"}`}
            >
              <input
                type="radio"
                name="soort"
                value={c}
                id={id(`soort-${i}`)}
                checked={values.soort === c}
                onChange={() => change("soort", c)}
                onKeyDown={variant === "steps" ? stepKey : undefined}
                data-cf-radio=""
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
    ) : null;

  const thanks = (size: "lead" | "display") => (
    <div
      ref={thanksRef}
      tabIndex={-1}
      data-cf-thanks=""
      inert={status !== "sent"}
      className={`outline-none ${size === "display" ? "self-center" : "self-start"}`}
    >
      <p
        className={`font-display ${size === "display" ? "text-[clamp(2.5rem,1.1rem+4.6vw,6rem)] leading-[1.02]" : "text-h2"} tracking-[-0.02em]`}
      >
        <span className="struq-line-mask block">
          <span data-cf-rise="" className="block">
            {firstName ? `Dank je, ${firstName}.` : "Dank je."}
          </span>
        </span>
      </p>
      <p data-cf-soft="" className="mt-6 max-w-[40ch] text-lead text-ink-muted">
        Je bericht is binnen. {next}
      </p>
    </div>
  );

  const formProps = {
    ref: formRef,
    action,
    method,
    noValidate: live,
    onSubmit: submit,
    inert: status === "sent",
    "aria-busy": sending || undefined,
    "aria-labelledby": id("title"),
  } as const;

  const root = (children: ReactNode, extra: string) => (
    <section
      data-contact-form={variant}
      data-state={status}
      data-ready={live ? "" : undefined}
      aria-labelledby={id("title")}
      className={`relative bg-surface-0 px-6 text-ink md:px-[4vw] ${extra} ${className}`}
    >
      {children}
      {liveRegion}
    </section>
  );

  if (variant === "sentence") {
    return root(
      <>
        <h2 id={id("title")} className="sr-only">
          {title}
        </h2>
        <div data-cf-stage="" className="mx-auto w-full max-w-[86rem]">
          <form {...formProps} data-cf-form="">
            <div data-cf-fields="">
              <div data-cf-sentence="" className="font-display">
                <span data-cf-clause="">
                  <label htmlFor={id("naam")}>
                    Ik ben<span className="sr-only"> (je naam)</span>
                  </label>{" "}
                  <span data-cf-blank="" data-invalid={shown.naam ? "" : undefined}>
                    <Grow text={values.naam || "je naam"}>
                      <input {...naamProps} placeholder="je naam" size={1} />
                    </Grow>
                    {msg("naam")}
                  </span>
                  <span data-cf-comma="">,</span>
                </span>{" "}
                <span data-cf-clause="">
                  <label htmlFor={id("email")}>
                    bereikbaar op<span className="sr-only"> (je e-mailadres)</span>
                  </label>{" "}
                  <span data-cf-blank="" data-invalid={shown.email ? "" : undefined}>
                    <Grow text={values.email || "je e-mailadres"}>
                      <input {...emailProps} placeholder="je e-mailadres" size={1} />
                    </Grow>
                    {msg("email")}
                  </span>
                  <span data-cf-comma="">,</span>
                </span>{" "}
                <span data-cf-clause="">
                  <label htmlFor={id("onderwerp")}>
                    en ik wil het hebben over<span className="sr-only"> (waar gaat het over?)</span>
                  </label>{" "}
                  <span data-cf-blank="" data-multiline="" data-invalid={shown.onderwerp ? "" : undefined}>
                    <Grow text={values.onderwerp || "je plek of je plan"} multiline>
                      <textarea {...onderwerpProps} placeholder="je plek of je plan" />
                    </Grow>
                    {msg("onderwerp")}
                  </span>
                  <span data-cf-comma="">.</span>
                </span>
              </div>
              <div className="mt-[7svh]">
                {radios("body", <legend className="mb-4 text-small text-ink-muted">Het gaat om</legend>)}
              </div>
            </div>
            <div className="mt-[6svh]">
              {send}
              {fail}
            </div>
          </form>
          {thanks("display")}
        </div>
      </>,
      "py-[16svh]",
    );
  }

  if (variant === "steps") {
    const pos = (i: number) => (i < step ? "before" : i > step ? "after" : "current");
    const progress = status === "sent" ? 1 : step / STEPS.length;
    const answered = STEPS.slice(0, live ? step : 0)
      .map((k) => values[k].trim())
      .filter(Boolean)
      // A list of answers, not a sentence: no capital in the middle of it.
      .map((a, i) => (i === 0 ? a : a.charAt(0).toLowerCase() + a.slice(1)));
    const question = "block font-display text-[clamp(2.25rem,1.1rem+3.8vw,5rem)] leading-[1.04] tracking-[-0.02em]";
    const answer = "font-display text-[clamp(1.75rem,1rem+2.4vw,3.25rem)]";
    const stepBox = (i: number, children: ReactNode) => (
      <div
        key={STEPS[i]}
        data-cf-step=""
        data-pos={live ? pos(i) : undefined}
        inert={live && i !== step}
        className="min-w-0"
      >
        {children}
      </div>
    );
    return root(
      <>
        <h2 id={id("title")} className="sr-only">
          {title}
        </h2>
        <div data-cf-stage="" className="mx-auto w-full max-w-[68rem]">
          <form {...formProps} data-cf-form="">
            <div aria-hidden data-cf-progress="" className="relative mb-[6svh] h-px overflow-hidden bg-line">
              <span
                data-cf-fill=""
                className="absolute inset-0 origin-left bg-accent"
                style={{ transform: `scaleX(${live ? progress : 0})` }}
              />
            </div>
            {/* The answers so far, small, and the way back. Always one line high, so nothing below moves. */}
            <div className="mb-[4svh] flex min-h-[1.75em] items-baseline justify-between gap-6 text-small text-ink-muted">
              <p data-cf-trail="" className="min-w-0 truncate">
                {answered.join(", ")}
              </p>
              {live ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!sending && step > 0) go(step - 1);
                  }}
                  aria-disabled={sending || undefined}
                  className={`inline-flex shrink-0 items-center gap-2 underline decoration-1 underline-offset-4 ${step === 0 || status === "sent" ? "invisible" : ""}`}
                >
                  <Arrow back />
                  Terug
                </button>
              ) : null}
            </div>
            <div data-cf-steps="" data-cf-fields="">
              {stepBox(
                0,
                <>
                  <label htmlFor={id("naam")} className={question}>
                    Hoe heet je?
                  </label>
                  <div className={`mt-[4svh] ${answer}`} data-invalid={shown.naam ? "" : undefined}>
                    <Grow text={values.naam} block>
                      <input {...naamProps} enterKeyHint="next" onKeyDown={stepKey} size={1} />
                    </Grow>
                  </div>
                  {msg("naam")}
                </>,
              )}
              {stepBox(
                1,
                <>
                  <label htmlFor={id("email")} className={question}>
                    Op welk e-mailadres kunnen we je bereiken?
                  </label>
                  <div className={`mt-[4svh] ${answer}`} data-invalid={shown.email ? "" : undefined}>
                    <Grow text={values.email} block>
                      <input {...emailProps} enterKeyHint="next" onKeyDown={stepKey} size={1} />
                    </Grow>
                  </div>
                  {msg("email")}
                </>,
              )}
              {stepBox(
                2,
                <>
                  <label htmlFor={id("onderwerp")} className={question}>
                    Waar gaat het over?
                  </label>
                  <div className={`mt-[4svh] ${answer}`} data-invalid={shown.onderwerp ? "" : undefined}>
                    <Grow text={values.onderwerp} multiline block>
                      <textarea {...onderwerpProps} enterKeyHint={hasChoices ? "next" : "send"} onKeyDown={stepKey} />
                    </Grow>
                  </div>
                  {msg("onderwerp")}
                </>,
              )}
              {hasChoices
                ? stepBox(
                    3,
                    <>
                      {radios(
                        "large",
                        <legend className={`${question} mb-[4svh]`}>
                          Gaat het om nieuwbouw, een verbouwing of interieur?
                        </legend>,
                      )}
                      <p className="mt-5 text-small text-ink-muted">Dit mag je overslaan.</p>
                    </>,
                  )
                : null}
            </div>
            <div className="mt-[5svh] flex flex-wrap items-baseline gap-x-6 gap-y-2">
              {!live || step === last || (step === 2 && !hasChoices)
                ? send
                : linkButton("Volgende", { type: "button", onClick: advance })}
              {live && step < last ? (
                <span className="hidden text-small text-ink-muted [@media(hover:hover)]:inline">of druk op Enter</span>
              ) : null}
            </div>
            {fail}
          </form>
          {thanks("display")}
        </div>
      </>,
      "flex min-h-[90svh] flex-col justify-center py-[12svh]",
    );
  }

  return root(
    <div className="mx-auto grid w-full max-w-[96rem] gap-y-14 md:grid-cols-12 md:gap-x-[4vw]">
      <div className="md:col-span-5">
        <h2 id={id("title")} className="font-display max-w-[11ch] text-h2">
          {title}
        </h2>
        {intro ? <p className="mt-8 max-w-[36ch] text-lead text-ink-muted">{intro}</p> : null}
        {email ? (
          <p className="mt-6 text-body text-ink-muted">
            Liever mailen?{" "}
            <a href={`mailto:${email}`} className="text-ink underline decoration-1 underline-offset-4">
              {email}
            </a>
          </p>
        ) : null}
      </div>
      <div data-cf-stage="" className="md:col-span-7">
        <form {...formProps} data-cf-form="">
          <div data-cf-fields="" className="grid gap-x-10 gap-y-3 md:grid-cols-2">
            <div data-cf-float="" data-invalid={shown.naam ? "" : undefined}>
              <Grow text={values.naam} block>
                <input {...naamProps} placeholder=" " size={1} />
              </Grow>
              <label htmlFor={id("naam")}>Naam</label>
              {msg("naam")}
            </div>
            <div data-cf-float="" data-invalid={shown.email ? "" : undefined}>
              <Grow text={values.email} block>
                <input {...emailProps} placeholder=" " size={1} />
              </Grow>
              <label htmlFor={id("email")}>E-mailadres</label>
              {msg("email")}
            </div>
            <div data-cf-float="" data-invalid={shown.onderwerp ? "" : undefined} className="md:col-span-2">
              <Grow text={values.onderwerp} multiline block>
                <textarea {...onderwerpProps} placeholder=" " />
              </Grow>
              <label htmlFor={id("onderwerp")}>Waar gaat het over?</label>
              {msg("onderwerp")}
            </div>
            <div className="md:col-span-2">
              {radios("body", <legend className="mb-4 text-small text-ink-muted">Het gaat om</legend>)}
            </div>
          </div>
          <div className="mt-12">
            {send}
            {fail}
          </div>
        </form>
        {thanks("lead")}
      </div>
    </div>,
    "py-[16svh]",
  );
}
