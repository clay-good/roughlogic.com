#!/usr/bin/env node
// v18 §6 tile-contract gate. Companion to check-bounds.mjs: where
// check-bounds asserts every corpus function is *covered* by a fuzzer row,
// this asserts every registered compute function honours the spec-v18 §2
// output contract over a structured input sweep (see
// test/fixtures/tile-contract.js for the invariants and tiering).
//
// Two failure modes:
//
//   Tier 1 (crasher) - a throw, hang, OOM, impurity, input mutation, or a
//     non-finite field on the canonical fixture input. ALWAYS fails the
//     gate; the backlog here must stay at zero.
//
//   Tier 2 (robustness backlog) - a perturbed numeric slot that leaks a
//     non-finite output instead of returning {error}. Ratcheted against
//     test/fixtures/contract-baseline.json: the gate fails only if a NEW
//     leak appears (a regression), per the v14 §16 ratchet. As modules are
//     hardened the baseline is tightened with `--update-baseline`.
//
// The sweep runs inside a worker with a heap cap and a wall-clock timeout
// so a regression that reintroduces an unbounded loop/array surfaces as a
// Tier-1 failure here rather than hanging CI forever.
//
// Flags:
//   --verbose          print every Tier-2 backlog entry, not just the count
//   --update-baseline  rewrite the baseline to the current Tier-2 set
//                      (refused while any Tier-1 violation exists)

import { Worker } from "node:worker_threads";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const VERBOSE = process.argv.includes("--verbose");
const UPDATE = process.argv.includes("--update-baseline");

const WORKER = new URL("./_contract-sweep-worker.mjs", import.meta.url);
const BASELINE = new URL("../test/fixtures/contract-baseline.json", import.meta.url);
const TIMEOUT_MS = 120000;
const HEAP_MB = 512;

function runSweep() {
  return new Promise((resolve, reject) => {
    const w = new Worker(WORKER, { resourceLimits: { maxOldGenerationSizeMb: HEAP_MB } });
    let done = false;
    const finish = (fn) => { if (!done) { done = true; w.terminate(); fn(); } };
    const t = setTimeout(() => finish(() => reject(new Error(
      `contract sweep did not finish within ${TIMEOUT_MS / 1000}s - a tile likely has an unbounded loop or allocation on a perturbed input (v18 C-6/D-6). Localise it with: node --test test/unit/tile-contract.test.js`,
    ))), TIMEOUT_MS);
    w.on("message", (m) => { clearTimeout(t); finish(() => resolve(m)); });
    w.on("error", (e) => { clearTimeout(t); finish(() => reject(new Error(
      `contract sweep worker crashed (likely OOM on a perturbed input, v18 C-6/D-6): ${e.message}`,
    ))); });
    w.on("exit", (code) => { clearTimeout(t); if (!done) { done = true; if (code !== 0) reject(new Error(`contract sweep worker exited ${code}`)); } });
  });
}

function loadBaseline() {
  if (!existsSync(BASELINE)) return { sigs: [] };
  return JSON.parse(readFileSync(BASELINE, "utf8"));
}

let result;
try {
  result = await runSweep();
} catch (e) {
  console.error("check-tile-contract FAILED:", e.message);
  process.exit(1);
}

const { tier1, tier2, ran, skipped } = result;
const currentSigs = new Set(tier2.map((r) => r.sig));

if (UPDATE) {
  if (tier1.length > 0) {
    console.error(`check-tile-contract: refusing --update-baseline with ${tier1.length} Tier-1 (crasher) violation(s) unfixed:`);
    for (const r of tier1) console.error("  CRASHER:", r.message);
    process.exit(1);
  }
  const sigs = [...currentSigs].sort();
  const payload = {
    _comment: "v18 §6 tile-contract Tier-2 backlog baseline. Each entry is a (tile::slot::badvalue) signature for a perturbed numeric input that leaks a non-finite output field instead of returning {error}. The gate fails on any signature NOT in this list (a regression). Shrink this list as modules are hardened; never grow it by hand. Regenerate with: node scripts/check-tile-contract.mjs --update-baseline",
    count: sigs.length,
    sigs,
  };
  writeFileSync(BASELINE, JSON.stringify(payload, null, 2) + "\n");
  console.log(`check-tile-contract: baseline rewritten - ${sigs.length} Tier-2 entries across ${ran} tiles.`);
  process.exit(0);
}

const baseline = loadBaseline();
const baseSet = new Set(baseline.sigs);
const regressions = [...currentSigs].filter((s) => !baseSet.has(s));
const cleared = baseline.sigs.filter((s) => !currentSigs.has(s));

let failed = false;

if (tier1.length > 0) {
  failed = true;
  console.error(`check-tile-contract: ${tier1.length} Tier-1 (crasher) violation(s) - these must be zero:`);
  for (const r of tier1) console.error("  CRASHER:", r.message);
}

if (regressions.length > 0) {
  failed = true;
  console.error(`check-tile-contract: ${regressions.length} NEW Tier-2 contract leak(s) not in the baseline (a regression):`);
  for (const sig of regressions) {
    const r = tier2.find((x) => x.sig === sig);
    console.error("  NEW LEAK:", r ? r.message : sig);
  }
  console.error("  Fix the leak (return {error} on the non-finite input), or, if intentional, run --update-baseline.");
}

if (failed) process.exit(1);

// Green. Report the standing backlog and any newly-cleared entries.
console.log(`check-tile-contract OK: ${ran} tiles swept (${skipped} unregistered), 0 Tier-1 crashers, ${currentSigs.size} Tier-2 backlog entr${currentSigs.size === 1 ? "y" : "ies"} (baseline ${baseline.sigs.length}).`);
if (cleared.length > 0) {
  console.log(`  ${cleared.length} baseline entr${cleared.length === 1 ? "y" : "ies"} now cleared - tighten the ratchet with: node scripts/check-tile-contract.mjs --update-baseline`);
}
if (VERBOSE && currentSigs.size > 0) {
  console.log("  Tier-2 backlog:");
  for (const r of tier2) console.log("    -", r.message);
}
process.exit(0);
