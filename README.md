<h1 align="center">
  <a href="https://struq.app/skill">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/banner-dark.svg">
      <img alt="Struq skill: studio-grade sites from the AI you already use." src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/banner-light.svg" width="100%">
    </picture>
  </a>
</h1>

<p align="center">
  Struq is a free, open-source design skill for Claude Code, Cursor, Codex and other AI coding tools: your AI settles the direction, type, colour and motion before it builds, so your site looks studio-made, not AI-made.
</p>

<p align="center">
  <a href="https://struq.app/skill">Website</a>
  &nbsp;&middot;&nbsp;
  <a href="https://www.npmjs.com/package/@struq/skill">npm</a>
  &nbsp;&middot;&nbsp;
  <a href="skills/struq/blocks/CATALOG.md">The blocks</a>
  &nbsp;&middot;&nbsp;
  <a href="https://struq.app/icons">Struq Icons</a>
  &nbsp;&middot;&nbsp;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<br>

```bash
npx @struq/skill@latest
```

It finds the AI tools on your machine and installs the skill into each of them. Then give your agent a brief:

```text
/struq a portfolio for an architecture studio in Rotterdam, dark, calm, lots of photography
```

It plans the site, stops once to show you the plan, and builds only after you say yes.

| Agent | How to call it |
|---|---|
| Claude Code | `/struq <brief>`, or `/struq:struq <brief>` when installed as a plugin |
| Codex | `$struq <brief>` |
| Cursor, OpenCode | name it: "use the struq skill to build ..." |

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/agents-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/agents-light.svg" width="26" height="26" alt=""></picture> Same brief, two agents

Three briefs, each built twice by the same model with the same materials: once as a plain coding agent, once with `/struq`. Look at the left column first.

**Dev-tool landing page**

| Plain agent | With the Struq skill |
|---|---|
| ![Tidewater, built by a plain agent](https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/docs/compare/saas-plain.webp) | ![Tidewater, built with the Struq skill](https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/docs/compare/saas-struq.webp) |

<details>
<summary><b>Seen the left one before?</b></summary>
<br>

You have. It is the dark developer-tool template, item for item: the green glow, the pill above the headline, the install line in a terminal box. The Struq build went light and built the page around the trace waterfall itself, assembling as you scroll.

</details>

**Ceramicist portfolio, no logo, no photos**

| Plain agent | With the Struq skill |
|---|---|
| ![Ana Ferreira, built by a plain agent](https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/docs/compare/ceramics-plain.webp) | ![Ana Ferreira, built with the Struq skill](https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/docs/compare/ceramics-struq.webp) |

<details>
<summary><b>Where did "12 restaurants" come from?</b></summary>
<br>

Nowhere. The brief gave no figures, no quote and no bio, and the plain agent wrote all of them: a stat strip, a chef's quote, a life story. The Struq skill never invents a testimonial or a number. With no photos to work from, it drew a single-line profile of each piece instead, and that line became the motif of the whole site.

</details>

**E-bike launch, existing brand, wants 3D**

| Plain agent | With the Struq skill |
|---|---|
| ![Vela Mono, built by a plain agent](https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/docs/compare/ebike-plain.webp) | ![Vela Mono, built with the Struq skill](https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/docs/compare/ebike-struq.webp) |

<details>
<summary><b>Both built a pinned 3D bike. So what is the difference?</b></summary>
<br>

The closest pair of the three. The plain build filled the page with a spec sheet the brand never published. The Struq build took the lime belt as its one motif and left the unknown specs out, openly, rather than guessing them.

</details>

Where the Struq skill still loses: craft. The plain builds aim lower and break less; some Struq builds had reveal states that captured empty. That is what gets fixed next.

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/layers-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/layers-light.svg" width="26" height="26" alt=""></picture> The blocks carry the motion

Your agent picks the direction, sets the order and writes the copy. The motion comes from Struq's own catalogue: 44 admitted blocks, each a real React file with three variants, working in light and dark.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/blocks-dark.webp">
  <img alt="Six Struq blocks playing at once: a preloader, a hero, a page transition, a manifesto scrub, an image growing to full bleed and a WebGL background." src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/blocks-light.webp" width="100%">
</picture>

<details>
<summary><b>All 44, by kind</b></summary>
<br>

| Kind | Blocks |
|---|---|
| Preloaders | 4 |
| Page transitions | 3 |
| Headers | 2 |
| Heroes | 5 |
| WebGL backgrounds | 3 |
| Showpieces | 9 |
| Scene transition | 1 |
| Sections | 15 |
| Footers | 2 |

Each one with its files, packages, props and variants: [the catalogue](skills/struq/blocks/CATALOG.md). Every GSAP plugin they use is free on npm.

</details>

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/brush-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/brush-light.svg" width="26" height="26" alt=""></picture> What is in the skill

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/kit-dark.svg">
  <img alt="Six parts: blocks, direction, photos, craft, a check, and the Struq MCP." src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/kit-light.svg" width="100%">
</picture>

<details>
<summary><b>The parts, in detail</b></summary>
<br>

| Part | What it is |
|---|---|
| Blocks | The 44 admitted blocks in `skills/struq/blocks/`, with the kit they stand on. A copy of Struq's own set, refreshed at every release. |
| Direction | Struq's palettes and type pairings, written as the one token block the blocks read (surface ladder, contrast scenes, the accent's ink) with each face loaded at its real weights. Offline, no account. |
| Photos | Art-directed CC0 packs from the Struq beeldbank, picked by the brief and filtered to what fits the client. |
| Craft | The rules for the code between the blocks: clips from numbers, whole pixels, decode before show, scroll-tied and reversing, a gate with a 3 s fallback, type on the measured calm side of a photo. |
| Check | `check.mjs`: the tell list (eyebrows, pills, gradients, glow, mono, Inter, default purple, numbered steps, icon grids, dashes) and what a page owes its blocks. |
| MCP | With the Struq MCP connected, the same four jobs come from `struq_richting`, `struq_blokken`, `struq_blok` and `struq_controle`. Without it the skill works from its own copy. |

Stack: Next.js App Router and Tailwind v4 (Vite by hand, see `references/stack-targets.md`).

</details>

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/compass-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/compass-light.svg" width="26" height="26" alt=""></picture> How a build runs

- **Direction.** The site is planned as one film: a motion language (weight, cut or curtain), one idea, one motif, and a storyboard of scenes with the handovers between them. Then a palette, a type pairing and a photo pack from Struq's canon. All of it in one `STRUQ.md`, and no block goes in until that plan passes its own check.
- **One stop.** It shows you that plan and asks once: approve it, and send a logo, photos or real numbers if you have them. It does not ask again.
- **Blocks.** It installs each block with everything it imports, writes the tokens and fonts, and composes the page with your real copy.
- **Check.** `check.mjs` runs until the page passes. With a browser tool it also looks at the page at phone and desktop width and fixes what it sees.

| Command | What it does |
|---|---|
| `/struq <brief>` | Plans, stops once for your approval, builds, checks and fixes |
| `/struq redesign <path>` | Keeps your brand, copy and components; swaps in blocks where the page is weakest |
| `/struq audit <path-or-url>` | Changes nothing. Returns every tell with its fix and the three changes that pay off most |
| `/struq direct <brief>` | Directed mode, for one continuous 3D experience across chapters |

In Codex the command is `$struq`; as a Claude Code plugin it is `/struq:struq`.

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/download-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/download-light.svg" width="26" height="26" alt=""></picture> Install

```bash
npx @struq/skill@latest
```

That covers Claude Code, Cursor, Codex, OpenCode, Gemini CLI, Copilot and Windsurf. Run it again to update; `npx @struq/skill@latest remove` takes it out. Node 18 or newer.

<details>
<summary><b>One tool only, per project, or another installer</b></summary>
<br>

```bash
# one tool only, or into the current project instead of your home folder
npx @struq/skill@latest --claude
npx @struq/skill@latest --project

# with the open skills CLI, which knows 70+ agents
npx skills add struqapp/struq-design -g
```

As a Claude Code plugin (the command is then `/struq:struq`):

```text
/plugin marketplace add struqapp/struq-design
/plugin install struq@struq
```

The screenshot step uses whatever browser tool your agent has (Playwright or similar).

</details>

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/palette-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/palette-light.svg" width="26" height="26" alt=""></picture> The icons it reaches for

Struq builds use [Struq Icons](https://struq.app/icons) by default: 182 icons in two tones, and each of the 118 full icons makes one small move under the cursor that says what it does. Every icon on this page is one of them.

<a href="https://struq.app/icons">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/npm/@struq/icons@1/readme/motion-dark.svg">
    <img alt="Eight Struq icons playing their hover motion: lock, delete, settings, mail, history, sound, hint, bug." src="https://cdn.jsdelivr.net/npm/@struq/icons@1/readme/motion-light.svg" width="100%">
  </picture>
</a>

```bash
npm install @struq/icons
```

<br>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/shield-dark.svg"><img src="https://cdn.jsdelivr.net/gh/struqapp/struq-design@main/assets/readme/h/shield-light.svg" width="26" height="26" alt=""></picture> What it fetches and sends

The Struq skill is instructions, the block files and five small Node scripts (`blocks.mjs`, `canon.mjs`, `images.mjs`, `check.mjs`, `log.mjs`) that your agent runs in your project. They read and write files there, including a build log, `STRUQ-LOG.md`.

- **Blocks and canon** ship inside the skill. Nothing is fetched to install a block or write the tokens.
- **Fonts** load from Google Fonts (or Fontshare, for a face that lives there) in the visitor's browser, as on any site with web fonts.
- **Photos**, for every slot your own photos do not fill: `images.mjs` reads the public pack list at `https://struq.app/api/media/packs` and downloads the chosen images from `https://struq.app/media/packs/`, or from the same paths on the old domain when struq.app does not answer. Offline it writes plates graded to your palette instead.
- **The MCP** (`https://struq.app/api/mcp`), if you connect it: your agent calls Struq's tools with your brief. Nothing else leaves your machine.
- **The installer** downloads the package from npm, looks for your AI tools' folders in your home folder and copies the skill into them. It sends nothing.

<br>

## License

MIT. Made by [Struq](https://struq.app).
