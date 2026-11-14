// The source stamp look.mjs writes into .struq/look.json and check.mjs reads back: a hash over every file under app/
// and components/ (src/app and src/components too), plus the newest of them. When the hash no longer matches, the
// look was taken of an older page and has to be taken again.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOTS = ["app", "components", "src/app", "src/components"];
const SKIP = new Set(["node_modules", ".next", ".git", ".struq"]);

function walk(dir, acc) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of names) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else acc.push({ full, mtime: st.mtimeMs });
  }
  return acc;
}

/** { hash, files, newest: { file, mtime } } for the project's page source. */
export function sourceStamp(root) {
  const files = ROOTS.flatMap((d) => walk(join(root, d), []))
    .map((f) => ({ ...f, rel: relative(root, f.full).split(sep).join("/") }))
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  const hash = createHash("sha1");
  let newest = { file: null, mtime: 0 };
  for (const f of files) {
    hash.update(`${f.rel}\n`);
    hash.update(readFileSync(f.full));
    hash.update("\n");
    if (f.mtime > newest.mtime) newest = { file: f.rel, mtime: f.mtime };
  }
  return { hash: hash.digest("hex"), files: files.length, newest };
}
