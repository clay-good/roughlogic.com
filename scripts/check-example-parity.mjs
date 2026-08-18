#!/usr/bin/env node
// Worked-example parity: the number a page prints must be the number the tool loads.
//
// Every tile carries its worked example twice. `test/fixtures/worked-examples.json`
// is the publisher-verified one -- `check-worked-examples` pins it to a real
// reference, the static shell prints it as "You enter / You get", and the shell's
// "Run the calculator" link carries `?example=1` precisely so the live tool opens
// on the numbers the reader just read. The tool's own copy is the `<name>Example`
// export that its "Test with example" button and its input placeholders come from.
//
// Nothing kept the two in step, so they drifted: ohms-law printed V=120 / I=10 and
// opened at V=12 / I=2, and voltage-drop printed AWG 10 / 150 ft / 240 V and opened
// at AWG 12 / 100 ft / 120 V. A reader who follows the Run link sees a different
// worked example than the one that just taught them the tile.
//
// This gate compares the two, keyed off compute-map.js (tile id -> module + compute
// fn; the example export is the same stem, `computeVoltageDrop` -> `voltageDropExample`).
// Tiles whose export does not resolve by that convention are reported but not failed.
//
// Ratcheted, per the v14 §16.2 convention: the known-divergent set lives in
// scripts/example-parity-baseline.json and only a NEW divergence fails. Fixing one
// means deleting its line from the baseline. Standalone Node, built-ins only.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPUTE_MAP, importCalc } from "../test/fixtures/compute-map.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = resolve(ROOT, "scripts", "example-parity-baseline.json");
const write = process.argv.includes("--write");
const verbose = process.argv.includes("--verbose");

const rows = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8")).rows;
const fixture = new Map();
for (const r of rows) if (!fixture.has(r.tile_id)) fixture.set(r.tile_id, r);

const same = (a, b) =>
  (typeof a === "number" && typeof b === "number")
    ? Math.abs(a - b) <= Math.max(Math.abs(b) * 1e-6, 1e-12)
    : String(a) === String(b);

const diverged = [];
let compared = 0;
let unresolved = 0;

const modCache = new Map();
for (const [id, reg] of Object.entries(COMPUTE_MAP)) {
  const row = fixture.get(id);
  if (!row) continue;
  if (!modCache.has(reg.module)) modCache.set(reg.module, await importCalc(reg.module));
  const mod = modCache.get(reg.module);
  const stem = reg.fn.replace(/^compute/, "");
  const name = stem.charAt(0).toLowerCase() + stem.slice(1) + "Example";
  const ex = mod[name];
  if (!ex || !ex.inputs) { unresolved++; continue; }
  compared++;
  const diffs = [];
  for (const [k, v] of Object.entries(row.inputs)) {
    if (v === null || v === undefined) continue;
    if (!(k in ex.inputs)) continue; // fixture supersets the rendered fields; not a drift
    if (!same(ex.inputs[k], v)) diffs.push(`${k}: page=${JSON.stringify(v)} tool=${JSON.stringify(ex.inputs[k])}`);
  }
  if (diffs.length) diverged.push({ id, diffs });
}

diverged.sort((a, b) => a.id.localeCompare(b.id));
const nowIds = diverged.map((d) => d.id);

if (write) {
  writeFileSync(BASELINE, JSON.stringify({
    _comment: "Tiles whose printed worked example still disagrees with the tool's own example. Ratcheted: check-example-parity fails on any tile NOT listed here. Fixing a tile means deleting its id. Never add an id without fixing something else first.",
    tiles: nowIds,
  }, null, 2) + "\n");
  console.log(`check-example-parity: wrote baseline with ${nowIds.length} known-divergent tiles.`);
  process.exit(0);
}

const baseline = new Set(JSON.parse(readFileSync(BASELINE, "utf8")).tiles);
const regressions = diverged.filter((d) => !baseline.has(d.id));
const fixedSinceBaseline = [...baseline].filter((id) => !nowIds.includes(id));

if (verbose) for (const d of diverged) console.log(`  ${d.id}: ${d.diffs.join(" | ")}`);

if (regressions.length) {
  console.error(`check-example-parity: ${regressions.length} tile(s) newly print one worked example and load another:`);
  for (const d of regressions) console.error(`  - ${d.id}: ${d.diffs.join(" | ")}`);
  console.error("Fix the tile's `<name>Example` export (and its \"Test with example\" filler) to match test/fixtures/worked-examples.json.");
  process.exit(1);
}
if (fixedSinceBaseline.length) {
  console.error(`check-example-parity: ${fixedSinceBaseline.length} tile(s) are fixed but still listed in the baseline; run \`node scripts/check-example-parity.mjs --write\` and commit:`);
  for (const id of fixedSinceBaseline) console.error(`  - ${id}`);
  process.exit(1);
}
console.log(`check-example-parity OK: ${compared} tiles compared, ${diverged.length} known divergences (baseline), 0 new (${unresolved} tiles have no example export to compare).`);
