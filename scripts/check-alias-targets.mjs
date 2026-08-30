#!/usr/bin/env node
// An alias that names a calculator must point at that calculator.
//
// data/search/aliases.json maps free-text terms to tile ids, and a term is not
// only a routing key: aliasIndex() in search-discovery.js folds every term into
// its TARGET tile's ranking corpus. So a row pointing at the wrong tile does
// not merely fail to route -- it teaches the ranker that "chlorine demand" is
// vocabulary belonging to Pool Turnover, and scores that tile up for it.
//
// Thirteen rows were doing exactly that, all of them written before the sibling
// tile they name had landed: "lumen method" pointed at the lux converter while
// a tile ID'd `lumen-method` existed, "occupant load" at internal heat gains
// while the IBC 1004.5 tile existed, "gross rent multiplier" at the Schedule E
// worksheet. In every case the ranker already showed the id-matching tile first
// -- the exact-name/id sort key landed 2026-08-30 -- so the rows were both
// invisible to the reader and actively wrong about which tile they described.
//
// The rule: if a term is exactly a tile's id, it targets that tile; failing
// that, if it is exactly one tile's name, it targets that tile. Anything else
// is unconstrained, which is most of the file -- vocabulary, misspellings and
// question phrasings are the point of it.
//
// Deliberately no allowlist. Every row passes today, and an exemption list
// would exist only to absorb the first regression silently.
//
// Standalone Node 20, built-ins only.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const { TOOLS } = await import(new URL("../tools-data.js", import.meta.url).href);
const master = JSON.parse(await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8"));

const byId = new Map(TOOLS.map((t) => [t.id, t]));
const idByNormId = new Map(TOOLS.map((t) => [norm(t.id), t.id]));
// A name shared by two tiles constrains nothing: there is no single right
// target, and picking one would be this gate inventing a decision.
const nameCounts = new Map();
for (const t of TOOLS) nameCounts.set(norm(t.name), (nameCounts.get(norm(t.name)) || 0) + 1);
const idByNormName = new Map(
  TOOLS.filter((t) => nameCounts.get(norm(t.name)) === 1).map((t) => [norm(t.name), t.id])
);

// The `kind` vocabulary, read out of the file's own `_schema` line rather than
// restated here, so the two cannot drift apart -- which they had: the schema
// named three kinds while `question` accounted for 13,688 of the 21,072 rows,
// the largest kind in the file and the only one it did not mention.
const declaredKinds = new Set(
  [...String(master._schema || "").matchAll(/'([a-z]+)'/g)].map((m) => m[1])
);

const errors = [];
let constrained = 0;
if (declaredKinds.size === 0) {
  errors.push("  data/search/aliases.json `_schema` no longer names any kind; the vocabulary check has nothing to enforce");
}
for (const row of master.aliases || []) {
  if (!row || typeof row.kind !== "string") continue;
  if (!declaredKinds.has(row.kind)) {
    errors.push(`  "${row.term}" has kind "${row.kind}", which the file's own _schema does not name (${[...declaredKinds].join(", ")})`);
  }
}
for (const row of master.aliases || []) {
  if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
  if (!byId.has(row.target)) continue; // build-alias-shards --check owns dangling targets
  const n = norm(row.term);
  const want = idByNormId.get(n) || idByNormName.get(n);
  if (!want) continue;
  constrained++;
  if (want !== row.target) {
    errors.push(`  "${row.term}" targets ${row.target}, but a tile is ${want}`);
  } else if (VERBOSE) {
    console.log(`  ok "${row.term}" -> ${want}`);
  }
}

if (errors.length) {
  console.error(`check-alias-targets FAILED with ${errors.length} problem(s):`);
  for (const e of errors) console.error(e);
  console.error("Fix the row in data/search/aliases.json (re-point the target, or use a kind the _schema names) and rerun scripts/build-alias-shards.mjs.");
  process.exit(1);
}
console.log(`check-alias-targets OK: ${constrained} of ${(master.aliases || []).length} alias terms name a tile exactly and every one targets it; every row carries one of the ${declaredKinds.size} kinds the file declares.`);
