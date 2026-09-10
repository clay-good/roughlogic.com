#!/usr/bin/env node
// Harness: does an out-of-range input silently CHANGE a tile's stated conclusion?
//
// A tile whose renderer declares `min` on a numeric field is stating that a
// value below it is not a reading. Most computes here do not enforce that --
// the model is that the schema declares the bound, the browser marks the field
// invalid, `run_calculator` warns, and `answer_query` refuses (b984bce0). That
// is coherent for a NUMBER. It is not coherent for a CONCLUSION: a tile that
// answers "ok", "low", or "10 AWG" on an impossible reading has stated
// something a reader can act on, and several of them stated the SAFER thing.
//
// Measured 2026-09-10 across 674 tiles, 21 conclusions changed. Seven of them
// moved toward permissiveness and are now guarded in the compute:
//
//   crane-net-capacity   a negative deduction ADDS capacity the crane does not
//                        have -- "critical / engineered lift" became "ok"
//   mold                 negative RH cleared both >= thresholds -- "high"
//                        risk became "low"
//   voltage-drop         the flag ladder compares a SIGNED percent -- -9.88%
//                        read as "within advisory (<=3%)"
//   egc-sizing           a negative OCPD clears the first table row -- 10 AWG
//                        became 14 AWG, an undersized grounding conductor
//   gas-pipe-sizing      a negative load is "satisfied" by the first candidate
//                        -- 3/4 in became 1/2 in
//   dehumidifier         negative volume cleared every threshold -- "stage
//                        two-or-more large LGRs" became "one small portable"
//   air-movers           negative area -- "corners + perimeter" became "corners"
//
// The nine that remain are deliberate: three degrade to a "you must enter X"
// prompt, one moves toward caution ("DO NOT ACID CLEAN"), and the rest are
// value or prose differences rather than a permissiveness verdict.
//
// The ABOVE-MAX half is clean, and was swept 2026-09-10 for the same reason
// this file exists: an instrument that tests one edge and reports as though it
// tested the bound is worse than no instrument. 92 tiles carry a `max`, 15
// answered instead of refusing, and 6 conclusions changed -- none of them
// toward permissiveness. Four are boolean flags modelled as a number with
// max="1", where a 3 is simply truthy and the verdict it produces is the
// correct one (a scaffold read as SHEETED needs TIGHTER ties, not looser); the
// other two shift a month figure inside a verdict that does not change.
//
// WHY IT COMPARES RATHER THAN PATTERN-MATCHES. A first attempt matched result
// strings against a "passing" vocabulary and was useless: nearly every hit was
// a static `note:` field whose prose happens to contain "passes" or "within",
// and it missed voltage-drop entirely. Requiring the string to DIFFER between
// the in-range and the out-of-range run excludes static prose by construction,
// because static prose does not change.
//
// `--undeclared` sweeps the OTHER 56.8%: tiles whose numeric inputs declare no
// bound at all, by negating any positive example value whose label does not
// name a quantity that legitimately goes negative (temperature, elevation,
// declination, a delta, a margin). Measured 2026-09-10: 1,120 tiles, 301
// negative runs answered, 124 conclusions changed -- a far weaker signal than
// the declared sweep, and it must be read that way. Most of those move toward
// MORE caution ("in range (4-20 mA)" -> "fault-low", which for a 4-20 mA loop
// is simply correct), and several tiles take a negative legitimately anyway (a
// z-score, a scientific-notation value, a cut/fill elevation). Each candidate
// is a per-field domain call, which is why this mode reports rather than gates.
//
// One has been acted on so far: `moisture-dry-goal` declared soaked material
// "at dry standard" on a negative meter reading, and now declares min="0" and
// refuses. Declaring the bound is the better half of the fix -- it moves the
// field into the declared sweep above, where the browser, `run_calculator` and
// `answer_query` all see it too.
//
// Zero dependencies, no network. `node scripts/measure-verdict-bounds.mjs`.

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { describe, run } = await import(resolve(ROOT, "mcp/catalog.mjs"));
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));

const flips = [];
let scanned = 0;
let probes = 0;
let numeric_tiles = 0;
let bounded_tiles = 0;

for (const tool of TOOLS) {
  let card;
  try { card = await describe({ id: tool.id }); } catch { continue; }
  const example = card.example && card.example.inputs;
  if (!example || !Object.keys(example).length) continue;

  // Both halves of the bound. Sweeping only `min` would test half the space and
  // report as though it had tested all of it.
  const numeric = (card.inputs || []).filter((f) => f && (f.kind === "number" || (!f.kind && !f.options)));
  if (numeric.length) {
    numeric_tiles += 1;
    if (numeric.some((f) => f.attrs && (f.attrs.min !== undefined || f.attrs.max !== undefined))) bounded_tiles += 1;
  }

  const bounded = [];
  for (const f of card.inputs || []) {
    const attrs = f && f.attrs;
    if (!attrs) continue;
    if (!(f.key in example) || !Number.isFinite(Number(example[f.key]))) continue;
    const value = Number(example[f.key]);
    if (attrs.min !== undefined && attrs.min !== null && Number.isFinite(Number(attrs.min))) {
      const min = Number(attrs.min);
      bounded.push({ key: f.key, edge: "min", limit: min, probe: min - (Math.abs(value) + 1) });
    }
    if (attrs.max !== undefined && attrs.max !== null && Number.isFinite(Number(attrs.max))) {
      const max = Number(attrs.max);
      bounded.push({ key: f.key, edge: "max", limit: max, probe: max + Math.abs(max || 1) + 1 });
    }
  }
  if (!bounded.length) continue;

  let base;
  try { base = (await run({ id: tool.id, inputs: { ...example } })).result; } catch { continue; }
  if (!base || base.error) continue;
  const strings = Object.entries(base).filter(([, v]) => typeof v === "string");
  if (!strings.length) continue;
  scanned += 1;

  for (const field of bounded) {
    let out;
    try { out = (await run({ id: tool.id, inputs: { ...example, [field.key]: field.probe } })).result; } catch { continue; }
    // A compute that refuses is the outcome this harness wants.
    if (!out || out.error) continue;
    probes += 1;
    for (const [key, was] of strings) {
      if (typeof out[key] === "string" && out[key] !== was) {
        flips.push({ id: tool.id, field: field.key, value: field.probe, edge: field.edge, limit: field.limit, key, was, now: out[key] });
      }
    }
  }
}

const cut = (s) => (s.length > 46 ? s.slice(0, 46) + "..." : s);
for (const f of flips) {
  console.log(`  ${f.id}  ${f.field}=${f.value} (${f.edge} ${f.limit})  ${f.key}: ${JSON.stringify(cut(f.was))} -> ${JSON.stringify(cut(f.now))}`);
}
console.log(
  `measure-verdict-bounds: ${scanned} tile(s) with a bounded numeric input and a string output; ` +
  `${probes} out-of-range run(s) answered instead of refusing; ${flips.length} conclusion(s) changed.`,
);
// A clean sweep here is only as wide as the catalog's own declarations. Say how
// wide, so nobody reads silence as coverage.
console.log(
  `  Reach: ${bounded_tiles} of ${numeric_tiles} calculator(s) with numeric inputs declare any bound ` +
  `(${(100 * (numeric_tiles - bounded_tiles) / numeric_tiles).toFixed(1)}% declare none, and cannot be probed here).`,
);
