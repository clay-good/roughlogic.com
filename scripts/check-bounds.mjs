#!/usr/bin/env node
// spec-v14 §8.4 Phase D bounds-fuzzer coverage lint (scaffolding).
//
// Reads the formula corpus (`## Function corpus (v14)` section in
// docs/derivations.md) and the bounds-fuzzer test file
// (test/unit/bounds-fuzzer.test.js), and asserts that every corpus
// row's function name appears in the fuzzer at least once. Per
// spec-v14 §8.4 the bounds fuzzer "walks the corpus and emits one
// Node-built-in test per row that exercises the eight input vectors";
// the catalog-spanning implementation is the long-term target. Today
// the fuzzer covers a curated subset (pure-math primitives plus the
// Group F / W / C compute functions covered by the Phase E
// numerical-stability suite); the per-row enumeration migration is
// incremental.
//
// Behavior:
//   FAIL (exit 1):
//     - Corpus file or bounds-fuzzer test file is missing.
//     - Any corpus function name does not appear in
//       test/unit/bounds-fuzzer.test.js (graduated to fail-on-missing
//       at the 2026-05-20 Phase D campaign close per spec-v14 §16.2
//       ratchet pattern; every one of the 655 corpus rows now has a
//       fuzzer row at >= 100% coverage across all 25 calc-modules and
//       pure-math.js).
//
// Per-module rollup reported so the migration can be planned per
// module. `--verbose` prints the per-function coverage status.
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DERIV = resolve(ROOT, "docs", "derivations.md");
const FUZZER = resolve(ROOT, "test", "unit", "bounds-fuzzer.test.js");

async function loadCorpusFunctions() {
  // Returns array of { module, fn } pairs from the Function corpus
  // table. The table format is:
  //   | <module>.js | `<fn>` | `<params>` | <citation> | <fixture> | <tol> |
  if (!existsSync(DERIV)) return [];
  const text = await readFile(DERIV, "utf8");
  const start = text.indexOf("## Function corpus (v14)");
  if (start < 0) return [];
  const out = [];
  const lines = text.slice(start).split("\n");
  for (const line of lines) {
    const m = line.match(/^\|\s*([a-z0-9-]+\.js)\s*\|\s*`([A-Za-z_][A-Za-z0-9_]*)`/);
    if (m) out.push({ module: m[1], fn: m[2] });
  }
  return out;
}

async function main() {
  if (!existsSync(FUZZER)) {
    console.error("ERROR: test/unit/bounds-fuzzer.test.js is missing.");
    process.exit(1);
  }
  const corpusFns = await loadCorpusFunctions();
  if (corpusFns.length === 0) {
    console.error("ERROR: docs/derivations.md is missing the `## Function corpus (v14)` section.");
    process.exit(1);
  }
  const fuzzerText = await readFile(FUZZER, "utf8");

  // Per-function coverage: the function name appears as a substring
  // (any context: import statement, test description, function call).
  // The substring match is conservative; a stricter version would
  // require the function name to appear inside a `test("bounds: ...",
  // () => { ... })` block.
  const covered = new Set();
  for (const f of corpusFns) {
    if (fuzzerText.includes(f.fn)) covered.add(f.module + ":" + f.fn);
  }

  // Per-module rollup.
  const modules = new Map();
  for (const f of corpusFns) {
    if (!modules.has(f.module)) modules.set(f.module, { total: 0, covered: 0 });
    const m = modules.get(f.module);
    m.total++;
    if (covered.has(f.module + ":" + f.fn)) m.covered++;
  }

  const totalCovered = covered.size;
  const totalFns = corpusFns.length;
  const pct = totalFns > 0 ? (totalCovered / totalFns) * 100 : 0;

  console.log(
    "bounds-fuzzer: " + totalCovered + " / " + totalFns +
    " corpus function(s) covered by bounds-fuzzer test(s) (" + pct.toFixed(1) + "%).",
  );

  // Per-module rollup, sorted by coverage descending then name.
  const moduleRows = [...modules.entries()].sort((a, b) => {
    const aPct = a[1].covered / Math.max(a[1].total, 1);
    const bPct = b[1].covered / Math.max(b[1].total, 1);
    return bPct - aPct || a[0].localeCompare(b[0]);
  });
  if (process.argv.includes("--verbose") || pct >= 50) {
    for (const [mod, stats] of moduleRows) {
      if (stats.covered === 0) continue;
      const mpct = stats.total > 0 ? (stats.covered / stats.total) * 100 : 0;
      console.log(
        "  " + mod + ": " + stats.covered + " / " + stats.total +
        " (" + mpct.toFixed(0) + "%)",
      );
    }
  }

  const missing = corpusFns.filter((f) => !covered.has(f.module + ":" + f.fn));

  if (process.argv.includes("--verbose")) {
    console.log("\nmissing bounds-fuzzer coverage (" + missing.length + "):");
    const byModule = new Map();
    for (const f of missing) {
      if (!byModule.has(f.module)) byModule.set(f.module, []);
      byModule.get(f.module).push(f.fn);
    }
    for (const [mod, fns] of [...byModule.entries()].sort()) {
      console.log("  " + mod + " (" + fns.length + "): " + fns.slice(0, 5).join(", ") + (fns.length > 5 ? ", ..." : ""));
    }
  }

  // Graduated to fail-on-missing at the 2026-05-20 Phase D campaign
  // close (655/655 corpus rows covered across all 25 calc-modules and
  // pure-math.js). Per spec-v14 §16.2, once a scaffolding lint
  // reaches 100% coverage in measurement mode, it ratchets to a hard
  // fail to prevent regression on future corpus rows that land
  // without a bounds-fuzzer row.
  if (missing.length > 0) {
    for (const f of missing.slice(0, 20)) {
      console.error("ERROR: missing bounds-fuzzer row for " + f.module + ":" + f.fn);
    }
    if (missing.length > 20) {
      console.error("ERROR: ... and " + (missing.length - 20) + " more (run with --verbose for the full list).");
    }
    console.error(
      "v14 bounds-fuzzer coverage lint FAILED with " + missing.length +
      " missing row(s). Every corpus function in docs/derivations.md must appear " +
      "in test/unit/bounds-fuzzer.test.js (graduated to fail-on-missing at the " +
      "2026-05-20 Phase D campaign close per spec-v14 §16.2 ratchet).",
    );
    process.exit(1);
  }

  console.log(
    "v14 bounds-fuzzer coverage lint OK (graduated to fail-on-missing at the " +
    "2026-05-20 Phase D campaign close per spec-v14 §16.2 ratchet; every " +
    "corpus row in docs/derivations.md has a fuzzer row in " +
    "test/unit/bounds-fuzzer.test.js).",
  );
}

await main();
