// why: blocks.mjs add and canon.mjs palette and type refuse until STRUQ.md passes the plan check and STRUQ-LOG.md holds
// the user's reply. Tests that install a block or write the canon start from a project that has both; this writes it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** A weight storyboard that passes `check.mjs --plan` with no quiet or loud warning. */
export const WEIGHT_BOARD = [
  'Arrival (frame) preloader-stack | lands on: the hero print',
  'Opening (loud) hero-framed:wand | on screen: one bowl as a small print',
  'Statement (quiet) own scene, SplitHeadline | on screen: one sentence at 14vw',
  'About (loud) about-studio:wandeling | on screen: who makes it',
  'Approach (quiet) approach:schuif | on screen: the four steps',
  'Centerpiece (loud) image-to-fullbleed | on screen: one bowl at full size',
  'Release (quiet) own scene | on screen: a photo and two sentences',
  'Close (quiet) own scene | echoes the opening | footer: wordmark-finale',
];

/** STRUQ.md with a treatment head and the given storyboard lines. */
export function treatment({ language = 'weight', motif = 'frame', centerpiece = 'image-to-fullbleed', board = WEIGHT_BOARD } = {}) {
  return `# STRUQ.md: fixture
Brief: a ceramics studio in Deventer
Idea: A bowl is done when it is used.
Language: ${language}
Motif: ${motif}: one object on its plank
Lexicon: klei, glazuur, oven, serie
Palette: frontier-mizu-greige-bronze (slow ceramic restraint)
Type: serif-editorial: Fraunces + Urbanist
Images: pack vitrine
Centerpiece: ${centerpiece}: the one moment
Tone arc: paper, paper, paper, paper, paper, ink, paper, paper
Storyboard:
${board.map((line, i) => `${i + 1}. ${line}`).join('\n')}
Assumptions: none
`;
}

export const APPROVAL_LOG = `# STRUQ-LOG.md: fixture

## Step 2 Approval (1 Nov 2026, 10:02)
Asked: Akkoord? Heb je een logo, foto's of echte cijfers, stuur ze nu.
Reply: "akkoord, bouw maar"
`;

/**
 * Write the treatment and, unless `approved` is false, the logged approval into `dir`. `plan: null` leaves STRUQ.md
 * out; `pages` is the number of page.tsx routes under app/.
 */
export function approvedProject(dir, { plan = treatment(), approved = true, pages = 1 } = {}) {
  if (plan !== null) writeFileSync(join(dir, 'STRUQ.md'), plan);
  if (approved) writeFileSync(join(dir, 'STRUQ-LOG.md'), APPROVAL_LOG);
  mkdirSync(join(dir, 'app'), { recursive: true });
  for (let n = 0; n < pages; n++) {
    const at = n === 0 ? join(dir, 'app') : join(dir, 'app', `route-${n}`);
    mkdirSync(at, { recursive: true });
    writeFileSync(join(at, 'page.tsx'), 'export default function Page() { return null; }\n');
  }
  return dir;
}
