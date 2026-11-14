// This site's hand, kept in .struq/draw.json: two languages, two light and two dark palettes, three type pairings,
// five openings and five centerpieces. Dealt once by hand.mjs, the same module the Struq MCP deals with (copied from
// Struq's blocks/film/hand.mjs on release), so the skill and the MCP give a site the same kind of hand and check a
// plan against it the same way. canon.mjs draw and blocks.mjs arc both read it here.
//
// Proof runs of 2026-11-14 showed why there is a hand at all: listing every option, even shuffled, and naming the
// reflexes still drew most sites to the same few picks. A dealt hand makes every site start from a different place;
// the agent still chooses within it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dealHand, handPools, isHandId } from "./hand.mjs";
import { appendLog } from "./log.mjs";
import { lightness } from "./tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (...p) => JSON.parse(readFileSync(join(here, "..", ...p), "utf8"));

/** The pools out of the skill's canon and catalogue, as the MCP builds them out of Struq's. */
export function pools() {
  const canon = read("canon", "canon.json");
  const catalog = read("blocks", "catalog.json");
  const blocks = Array.isArray(catalog) ? catalog : catalog.blocks;
  return handPools({
    palettes: canon.palettes.map((p) => ({ id: p.id, light: lightness(p.colors.background) >= 0.5, autoPick: p.autoPick })),
    pairings: canon.pairings.map((t) => ({ id: t.id, autoPick: t.autoPick })),
    catalog: blocks.map((b) => ({ slug: b.slug, role: b.role, home: b.home })),
  });
}

/** The project's hand: read from .struq/draw.json, or dealt now and saved. `fresh` says whether it was just dealt. */
export function projectHand(root) {
  const file = join(root, ".struq", "draw.json");
  const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  if (saved && isHandId(saved.id) && saved.openings && saved.pairings) return { hand: saved, fresh: false };
  const hand = dealHand(pools());
  mkdirSync(join(root, ".struq"), { recursive: true });
  writeFileSync(file, JSON.stringify(hand, null, 2) + "\n");
  appendLog(root, "Step 2 Draw", [
    `Hand ${hand.id} dealt: languages ${hand.languages.join(", ")}; palettes ${hand.palettes.join(", ")}; pairings ${hand.pairings.join(", ")}; openings ${hand.openings.join(", ")}; centerpieces ${hand.centerpieces.join(", ")}.`,
  ]);
  return { hand, fresh: true };
}

/** The saved hand, or null when none was dealt. */
export function savedHand(root) {
  const file = join(root, ".struq", "draw.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
