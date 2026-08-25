#!/usr/bin/env node
// Gate: every worked-example row printed on a tile page carries a caption, and
// the hand-authored captions that get it there stay honest.
//
// A tile page's "You enter / You get" table is the primary teaching device on
// the site. A row that prints a bare key -- "ka 0.3333" -- teaches nothing, so
// the catalog-wide count of uncaptioned rows must stay at zero.
//
// Captions come from three places, in this order of authority:
//   1. the renderer's own `render.schema`
//   2. scripts/extract-bespoke-schemas.mjs, which reads them out of the renderer
//   3. scripts/curated-labels.mjs, hand-authored, the floor
//
// Three assertions:
//   A. Every curated entry names a tile that exists and a key that actually
//      appears in that tile's printed worked example. A stale entry is dead
//      weight the next reader would trust.
//   B. No curated entry is shadowed by an extracted caption. When a renderer is
//      fixed so the extractor can read it, the curated entry must be deleted
//      rather than left behind as a second source of truth.
//   C. Zero rows across the whole catalog print an uncaptioned key.
//
// Zero dependencies. `node scripts/check-curated-labels.mjs [--verbose]`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const verbose = process.argv.includes("--verbose");
const problems = [];

const { CURATED_INPUT_LABELS, CURATED_OUTPUT_LABELS } = await import(resolve(ROOT, "scripts/curated-labels.mjs"));
const { inputLabels, outputLabels } = await import(resolve(ROOT, "mcp/catalog.mjs"));
const { BESPOKE_LABELS } = await import(resolve(ROOT, "test/fixtures/bespoke-labels.js"));
const { BESPOKE_OUTPUT_LABELS } = await import(resolve(ROOT, "test/fixtures/bespoke-output-labels.js"));
const { humanizeKey } = await import(resolve(ROOT, "scripts/build-shells.mjs"));

// The same one-row-per-tile selection build-shells makes: the first fixture row
// for a tile is the one its page prints.
const raw = JSON.parse(await readFile(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
const example = new Map();
for (const row of raw.rows || []) {
  if (row && row.tile_id && !example.has(row.tile_id)) example.set(row.tile_id, row);
}

// build-shells drops a row whose value renders empty, so only the rows that
// actually reach the page are counted.
const printed = (obj) => Object.entries(obj || {}).filter(([, v]) => {
  const val = (v && typeof v === "object" && !Array.isArray(v) && "value" in v) ? v.value : v;
  return val !== null && val !== undefined && val !== "";
}).map(([k]) => k);

// --- A + B: the curated map is live and unshadowed ---
for (const [side, curated, extracted] of [
  ["input", CURATED_INPUT_LABELS, BESPOKE_LABELS],
  ["output", CURATED_OUTPUT_LABELS, BESPOKE_OUTPUT_LABELS],
]) {
  for (const [id, keys] of Object.entries(curated)) {
    const row = example.get(id);
    if (!row) { problems.push(`${id}: curated ${side} labels for a tile with no worked example`); continue; }
    const live = new Set(printed(side === "input" ? row.inputs : row.outputs));
    for (const key of Object.keys(keys)) {
      if (!live.has(key)) {
        problems.push(`${id}.${key}: curated ${side} label names a key the page does not print -- delete it`);
      } else if (extracted[id] && extracted[id][key]) {
        problems.push(`${id}.${key}: curated ${side} label is shadowed by an extracted caption -- delete it`);
      }
    }
  }
}

// --- C: no uncaptioned row anywhere in the catalog ---
let rows = 0;
const bare = [];
for (const [id, row] of example) {
  const [inLab, outLab] = await Promise.all([inputLabels(id), outputLabels(id)]);
  for (const [side, obj, labels] of [["in", row.inputs, inLab], ["out", row.outputs, outLab]]) {
    for (const key of printed(obj)) {
      rows += 1;
      if (!labels[key] && !humanizeKey(key)) bare.push(`${id} [${side}] ${key}`);
    }
  }
}

if (bare.length) {
  problems.push(`${bare.length} worked-example rows print a bare key with no caption`);
  if (verbose) for (const b of bare) problems.push(`    ${b}`);
}

if (problems.length) {
  console.error("✗ check-curated-labels:");
  for (const p of problems) console.error("  " + p);
  if (!verbose && bare.length) console.error("  (re-run with --verbose to list them)");
  process.exit(1);
}

const curatedCount = [CURATED_INPUT_LABELS, CURATED_OUTPUT_LABELS]
  .reduce((n, m) => n + Object.values(m).reduce((k, v) => k + Object.keys(v).length, 0), 0);
console.log(`✓ check-curated-labels: ${rows} worked-example rows across ${example.size} tiles all carry a caption (${curatedCount} hand-authored).`);
