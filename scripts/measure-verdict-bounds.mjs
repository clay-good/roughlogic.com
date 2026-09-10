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
// WHY IT COMPARES RATHER THAN PATTERN-MATCHES. A first attempt matched result
// strings against a "passing" vocabulary and was useless: nearly every hit was
// a static `note:` field whose prose happens to contain "passes" or "within",
// and it missed voltage-drop entirely. Requiring the string to DIFFER between
// the in-range and the out-of-range run excludes static prose by construction,
// because static prose does not change.
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

for (const tool of TOOLS) {
  let card;
  try { card = await describe({ id: tool.id }); } catch { continue; }
  const example = card.example && card.example.inputs;
  if (!example || !Object.keys(example).length) continue;

  const bounded = (card.inputs || []).filter((f) => {
    const attrs = f && f.attrs;
    if (!attrs || attrs.min === undefined || attrs.min === null) return false;
    return f.key in example && Number.isFinite(Number(example[f.key]));
  });
  if (!bounded.length) continue;

  let base;
  try { base = (await run({ id: tool.id, inputs: { ...example } })).result; } catch { continue; }
  if (!base || base.error) continue;
  const strings = Object.entries(base).filter(([, v]) => typeof v === "string");
  if (!strings.length) continue;
  scanned += 1;

  for (const field of bounded) {
    const min = Number(field.attrs.min);
    const value = min - (Math.abs(Number(example[field.key])) + 1);
    let out;
    try { out = (await run({ id: tool.id, inputs: { ...example, [field.key]: value } })).result; } catch { continue; }
    // A compute that refuses is the outcome this harness wants.
    if (!out || out.error) continue;
    probes += 1;
    for (const [key, was] of strings) {
      if (typeof out[key] === "string" && out[key] !== was) {
        flips.push({ id: tool.id, field: field.key, value, min, key, was, now: out[key] });
      }
    }
  }
}

const cut = (s) => (s.length > 46 ? s.slice(0, 46) + "..." : s);
for (const f of flips) {
  console.log(`  ${f.id}  ${f.field}=${f.value} (min ${f.min})  ${f.key}: ${JSON.stringify(cut(f.was))} -> ${JSON.stringify(cut(f.now))}`);
}
console.log(
  `measure-verdict-bounds: ${scanned} tile(s) with a bounded numeric input and a string output; ` +
  `${probes} out-of-range run(s) answered instead of refusing; ${flips.length} conclusion(s) changed.`,
);
