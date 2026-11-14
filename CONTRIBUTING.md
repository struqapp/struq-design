# Contributing to the Struq skill

Thanks for wanting to make it better. The most useful thing you can send is a real build: the brief you gave, the
agent and model, what came out, and where it went wrong. That is what moves the skill forward, more than any patch.

## Where things go

| You have | Send it to |
|---|---|
| A build that went wrong, an install that failed | [An issue](https://github.com/struqapp/struq-design/issues/new/choose), with your `STRUQ-LOG.md` |
| A question about using it | [Discussions, Q&A](https://github.com/struqapp/struq-design/discussions/categories/q-a) |
| A site you built with it | [Discussions, Show and tell](https://github.com/struqapp/struq-design/discussions/categories/show-and-tell) |
| An idea for a block, a direction or a rule | [Discussions, Ideas](https://github.com/struqapp/struq-design/discussions/categories/ideas) |
| A security problem | [A private advisory](https://github.com/struqapp/struq-design/security/advisories/new), see [SECURITY.md](SECURITY.md) |

## How the repository is laid out

| Path | What it is |
|---|---|
| `skills/struq/` | The skill itself, and the only folder the installers copy. `SKILL.md` is the entry point. |
| `skills/struq/blocks/` | The admitted blocks and the kit they stand on. A copy of Struq's catalogue, refreshed at every release. |
| `skills/struq/canon/` | Palettes, type pairings and the photo packs. Also refreshed from Struq at every release. |
| `skills/struq/scripts/` | The Node scripts your agent runs: `blocks.mjs`, `canon.mjs`, `images.mjs`, `check.mjs`, `log.mjs` and their helpers. |
| `skills/struq/references/` | The craft, the film grammar, the tells and the stack notes the skill reads while it works. |
| `cli/struq.mjs` | The zero-dependency installer behind `npx @struq/skill@latest`. |
| `plugin/`, `.claude-plugin/`, `.cursor-plugin/` | The Claude Code and Cursor plugin packaging, built by `npm run release:plugin`. |
| `test/` | `node --test` suites for the installer, the scripts and the plugin build. |
| `site/` | A landing page built from one `/struq` prompt, kept as a proof of a real run, with the friction it hit. Not shipped. |
| `docs/compare/` | The screenshots for the side-by-side comparisons in the README. |

## Making a change

1. Fork, then branch from `main`.
2. Keep the change to one idea. A rule change comes with the brief where the old rule went wrong.
3. Run the tests. Node 18 or newer, no install needed:

   ```bash
   npm test
   ```

4. For anything that changes how the skill plans or builds, do one real run with `/struq` in a scratch project and
   say in the pull request which agent and model you used. The tests check the scripts; only a run checks the skill.
5. Open the pull request. The template asks for the rest.

Blocks and canon come from Struq's own catalogue, which lives in a separate repository. A fix to a block file here is
welcome, and it gets ported upstream by hand so the next refresh does not undo it.

## The house rules

The skill holds every site it builds to these, so changes to it hold to them too:

- No invented facts. A brief without numbers gets no numbers, a brief without a quote gets no testimonial.
- No template tells: eyebrow labels above headings, pills, gradients, glow, default purple, Inter, numbered steps,
  icon grids. `check.mjs` lists them all.
- No design scores or counts of any kind, in the skill's output or in this repository.
- No em or en dashes in copy, comments or commit messages.

## Licence

By contributing you agree that your work is released under the [MIT licence](LICENSE), like the rest of the skill.
