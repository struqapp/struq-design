# Struq

**Award-tier web design for your coding agent.**

Struq is a design skill for Claude Code, Codex, Cursor and OpenCode. Give it a brief and it builds a studio-grade site from Struq's catalogue of admitted blocks: preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each judged against an award-tier reference and shipped as real files with three variants. Your agent picks the direction and the order, writes the copy and joins the blocks; the blocks carry the motion.

The icon set the skill uses by default, Struq Icons, is browsable at [struq.nl/iconen](https://struq.nl/iconen).

```bash
npx @struq/skill@latest
```

It finds the AI tools on your machine and installs the skill into each of them. Then, in your agent:

```text
/struq a portfolio for an architecture studio in Rotterdam, dark, calm, lots of photography
```

| Agent | How to invoke |
|---|---|
| Claude Code (installed with `npx @struq/skill` or `npx skills`) | `/struq <brief>` |
| Claude Code (installed as a plugin) | `/struq:struq <brief>` |
| Codex | `$struq <brief>` |
| Cursor | invoke the struq skill by name: "use the struq skill to build ..." |
| OpenCode | invoke the struq skill by name: "use the struq skill to build ..." |

## Same brief, with and without Struq

Three briefs, each built twice by the same model with the same materials: once as a plain coding agent, once with `/struq`.

**Dev-tool landing page.** Without: the dark developer-tool template, item for item. With: a light page built around a trace waterfall that assembles as you scroll.

| Without | With Struq |
|---|---|
| ![Tidewater without Struq](docs/compare/saas-plain.webp) | ![Tidewater with Struq](docs/compare/saas-struq.webp) |

**Ceramicist portfolio.** Without: a tidy template with a stat strip, a chef quote and a bio the brief never supplied. With: a single-line profile drawing of each piece stands in for the missing photos and becomes the site's motif.

| Without | With Struq |
|---|---|
| ![Ana Ferreira without Struq](docs/compare/ceramics-plain.webp) | ![Ana Ferreira with Struq](docs/compare/ceramics-struq.webp) |

**E-bike launch.** The closest pair: both built a pinned 3D bike. Without: a spec sheet the brand never published. With: the lime belt as the one motif, and unknown specs openly held back.

| Without | With Struq |
|---|---|
| ![Vela Mono without Struq](docs/compare/ebike-plain.webp) | ![Vela Mono with Struq](docs/compare/ebike-struq.webp) |

Where Struq lost points: craft. The plain builds are less ambitious and break less; the Struq builds had reveal states that rendered empty in some captures. That is the next thing being fixed.

## What you get

| Part | What it is |
|---|---|
| Blocks | 44 admitted blocks in `skills/struq/blocks/` ([catalogue](skills/struq/blocks/CATALOG.md)): 4 preloaders, 3 page transitions, 2 headers, 5 heroes, 3 WebGL backgrounds, 9 showpieces, a scene transition, 15 sections and 2 footers, with the kit they stand on. A copy of Struq's own set, refreshed at every release. |
| Direction | Struq's palettes and type pairings, written as the one token block the blocks read (surface ladder, contrast scenes, the accent's ink) with each face loaded at its real weights. Offline, no account. |
| Photos | Art-directed CC0 packs from the Struq beeldbank, picked by the brief and filtered to what fits the client. |
| Craft | The rules that make the blocks feel high end, for the code between them: clips from numbers, whole pixels, decode before show, scroll-tied and reversing, a gate with a 3 s fallback, type on the measured calm side of a photo. |
| Check | `check.mjs`: the tell list (eyebrows, pills, gradients, glow, mono, Inter, default purple, numbered steps, icon grids, dashes) and what a page owes its blocks. |
| MCP | With the Struq MCP connected, the same four jobs come from `struq_richting`, `struq_blokken`, `struq_blok` and `struq_controle`. Without it the skill works from its own copy. |

Stack: Next.js App Router and Tailwind v4 (Vite by hand, see `references/stack-targets.md`). Every GSAP plugin used is free on npm. Icons: [Struq Icons](https://struq.nl/iconen) (`@struq/icons`, MIT) by default.

## Commands

| Command | What it does |
|---|---|
| `/struq <brief>` | Plans the site into one `STRUQ.md`, stops once for your approval, builds it, then runs its own check and, with a browser tool, screenshots it and fixes what it sees |
| `/struq redesign <path>` | Keeps your brand, copy and components; swaps in blocks where the page is weakest |
| `/struq audit <path-or-url>` | Changes nothing. Returns every tell with its fix and the three highest-payoff changes |
| `/struq direct <brief>` | Directed mode for one continuous 3D experience across chapters |

In Codex, use `$struq` instead of `/struq`; as a Claude Code plugin the command is `/struq:struq`.

## How a build runs

1. **Direction.** A palette, a type pairing and a photo pack from Struq's canon, and the order of the site from the catalogue: arrival, header, hero, manifesto, about, approach, work, closing call to action, footer. All in one `STRUQ.md`. It never invents testimonials or stats.
2. **One stop.** It shows the plan and asks once: approve, and send a logo, photos or real numbers if you have them.
3. **Blocks.** It installs each block with everything it imports, writes the tokens and fonts, and composes the page with your real copy.
4. **Check.** `check.mjs` runs until it passes; with a browser tool it also looks at the page at phone and desktop width and fixes what it sees.

## Install options

```bash
# every AI tool on this machine: Claude Code, Cursor, Codex, OpenCode, Gemini CLI, Copilot, Windsurf
npx @struq/skill@latest

# one tool only, or into the current project instead of your home folder
npx @struq/skill@latest --claude
npx @struq/skill@latest --project
```

Run it again to update, and `npx @struq/skill@latest remove` to take it out.

With the open skills CLI, which knows 70+ agents:

```bash
npx skills add struqnl/struq-design -g
```

As a Claude Code plugin (the command is then `/struq:struq`):

```text
/plugin marketplace add struqnl/struq-design
/plugin install struq@struq
```

Node 18+ is required. The screenshot step uses whatever browser tool your agent has (Playwright or similar).

## Struq Icons

Struq builds use [Struq Icons](https://struq.nl/iconen) by default: 182 two-tone icons, most with their own hover motion, MIT.

```bash
npm install @struq/icons
```

## What it fetches and sends

Struq is instructions, the block files and five small Node scripts (`blocks.mjs`, `canon.mjs`, `images.mjs`, `check.mjs`, `log.mjs`) that your agent runs in your project. They read and write files in your project, including a build log (`STRUQ-LOG.md`).

- **Blocks and canon.** Shipped inside the skill. Nothing is fetched to install a block or write the tokens.
- **Fonts.** The site links Google Fonts (or Fontshare for a face that lives there) from the visitor's browser, as any site with web fonts does.
- **Photos, for every slot your own photos do not fill.** `images.mjs` reads the public pack list at `https://struq.nl/api/media/packs` and downloads the chosen images from `https://struq.nl/media/packs/` into your project. Offline it writes plates graded to your palette instead.
- **The MCP, if you connect it.** Your agent calls Struq's tools with your brief; nothing else leaves your machine.
- **The installer.** `npx @struq/skill@latest` downloads the package from npm, looks for the AI tools' folders in your home folder and copies the skill into them. It sends nothing.

## License

MIT
