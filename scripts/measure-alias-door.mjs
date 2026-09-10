#!/usr/bin/env node
// Harness: does every curated alias term reach its own tile on the agent door?
//
// The alias corpus is the catalog's own statement of how people ask for these
// calculators -- ~22,500 phrases a maintainer wrote against a specific tile.
// `answer_query`'s governing rule for them has always been "a human wrote that
// phrase against that tile; nothing here outranks it", but the rule was
// implemented as a search over the ranked top 3, so it could only rescue a
// target the ranker had already placed there. Six terms had their target
// ranked lower, or not at all, and the door answered NO_MATCH -- telling an
// agent no calculator matched a phrase the catalog itself maps:
//
//     "sheave"                        -> block-redirect-load
//     "what size wire"                -> min-conductor-for-vd
//     "what size weld"                -> steel-fillet-weld-size
//     "shaft size for torque"         -> shaft-diameter-for-torsion
//     "size a weir for flow"          -> weir-head-from-flow
//     "how much can i build on my lot" -> floor-area-ratio
//
// ("how much can i build on my lot" did not put floor-area-ratio in the top
// TEN.) An exact term is now resolved from the corpus itself.
//
// This sweep runs the whole door once per term and takes about seven minutes,
// which is why it lives here rather than in the lint chain -- the same place
// measure-query-fill.mjs and measure-ranking.mjs live. Run it after any change
// to ranking, to the alias corpus, or to how answer_query picks a tile.
// test/unit/mcp-catalog.test.js keeps the six above, plus a deterministic slice
// of the corpus, as fast standing regressions.
//
// Zero dependencies, no network. `node scripts/measure-alias-door.mjs [--limit N]`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const { answerQuery } = await import(resolve(ROOT, "mcp/catalog.mjs"));
const raw = JSON.parse(await readFile(resolve(ROOT, "data/search/aliases.json"), "utf8"));

// Keyed exactly as the door keys them: lowercased and trimmed. A term that two
// tiles share states no preference, so the ranker is the right arbiter and the
// term is not swept here.
const byTerm = new Map();
for (const row of raw.aliases || []) {
  if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
  const term = row.term.toLowerCase().trim();
  if (!term) continue;
  const set = byTerm.get(term);
  if (set) set.add(row.target);
  else byTerm.set(term, new Set([row.target]));
}
const unique = [...byTerm.entries()].filter(([, v]) => v.size === 1);
const shared = byTerm.size - unique.length;

const started = Date.now();
const misses = [];
let n = 0;
for (const [term, set] of unique) {
  if (n >= limit) break;
  n += 1;
  const want = [...set][0];
  const out = await answerQuery({ query: term });
  if (out.id !== want) misses.push({ term, got: out.id ?? null, status: out.status, want });
}

const secs = ((Date.now() - started) / 1000).toFixed(0);
for (const m of misses) {
  console.log(`  MISS ${JSON.stringify(m.term)} -> ${m.got ?? m.status} (want ${m.want})`);
}
console.log(
  `measure-alias-door: ${n} unambiguous curated term(s) swept in ${secs}s -- ` +
  `${n - misses.length} reached their tile, ${misses.length} did not` +
  (shared ? `; ${shared} shared term(s) left to the ranker.` : "."),
);
process.exit(misses.length ? 1 : 0);
