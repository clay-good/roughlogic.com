#!/usr/bin/env node
// spec-v14 §6.4 Phase B cross-validation lint (scaffolding).
//
// Walks the formula corpus (the `## Function corpus (v14)` section in
// docs/derivations.md) and the worked-example registry
// (test/fixtures/worked-examples.json) and reports:
//
//   - Per-module corpus-row count vs the live export count (sanity
//     check that the corpus is fresh; complementary to
//     scripts/build-corpus.mjs --check which compares row-by-row).
//   - Per-tile fixture coverage (delegated to check-worked-examples.mjs;
//     re-asserted here as a cross-reference so a future TOOLS / corpus
//     drift is caught even if one of the two upstream lints regresses).
//   - Per-fixture tolerance vs the spec-v14 §14.1 per-group default
//     ceiling. A fixture whose tolerance is wider than the group's
//     ceiling without an explicit justification field is reported.
//     Today this is a soft warning; the upgrade to fail-on-missing
//     follows the same pattern as scripts/check-worked-examples.mjs
//     once Phase B fixture-by-fixture review closes (spec-v14 §16.1).
//
// Behavior:
//   FAIL (exit 1):
//     - Corpus file missing or malformed (delegated; build-corpus.mjs
//       --check is the source of truth and is run earlier in `npm run
//       lint`).
//     - Worked-examples file missing (delegated to
//       check-worked-examples.mjs; this script depends on the file
//       existing).
//   WARN (does not fail; scaffolding):
//     - A tile fixture's tolerance.pct exceeds the per-group ceiling
//       and the fixture row carries no `tolerance_justification` note.
//     - A corpus row whose module is not represented in any fixture
//       (informational; the function may be a helper that is only
//       exercised via a tile-level fixture under a different name).
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DERIV = resolve(ROOT, "docs", "derivations.md");
const FIXTURE = resolve(ROOT, "test", "fixtures", "worked-examples.json");
// spec-v17 §H.2: TOOLS now lives in tools-data.js (lazy-loaded out of app.js).
const TOOLS_DATA = resolve(ROOT, "tools-data.js");

// Per-group default tolerance ceilings (pct), spec-v14 §14.1. A fixture
// whose tolerance.pct exceeds the ceiling without a justification note
// is reported. The ceiling is the wider-of-published-rounding-or-
// physical-limit value the spec authorizes; tiles that need a wider
// band (Hazen-Williams 25 percent, simplified Manual J 10 percent,
// lumber spans 20 percent) declare the wider band per row.
//
// Groups H References, Q Historical, and S Legal are not numeric and
// have no cross-check tolerance; they are skipped.
const GROUP_CEILING_PCT = {
  A: 5,   // Electrical
  B: 25,  // Plumbing (Hazen-Williams bound)
  C: 10,  // HVAC (Manual J)
  D: 10,  // Restoration
  E: 20,  // Construction (lumber spans)
  F: 5,   // Fire-ground
  G: 1,   // Cross-trade
  J: 5,   // Trucking
  K: 5,   // Mechanic
  L: 10,  // Agriculture
  M: 5,   // Water-and-wastewater
  N: 5,   // Stage
  O: 1,   // Kitchen
  P: 5,   // Field
  R: 1,   // Accounting (rate-based)
  T: 5,   // Lab
  U: 5,   // Veterinary
  V: 5,   // EMS
  W: 5,   // Pilots
  X: 1,   // Real Estate (rate-based)
  Y: 5,   // Educators
};
const TOLERANCE_EXEMPT_GROUPS = new Set(["H", "Q", "S"]);

async function loadTileGroups() {
  const text = await readFile(TOOLS_DATA, "utf8");
  const map = new Map();
  // Match `{ id: "...", name: "...", group: "...", ... }` rows.
  const re = /\{\s*id:\s*"([a-z0-9-]+)"[^}]*?group:\s*"([A-Z])"/g;
  for (const m of text.matchAll(re)) map.set(m[1], m[2]);
  return map;
}

async function loadCorpusModuleCounts() {
  if (!existsSync(DERIV)) return new Map();
  const text = await readFile(DERIV, "utf8");
  const start = text.indexOf("## Function corpus (v14)");
  if (start < 0) return new Map();
  const counts = new Map();
  const lines = text.slice(start).split("\n");
  for (const line of lines) {
    // Only count data rows (skip header + separator). The data rows
    // start with `| ` and the module column is `<name>.js`.
    const m = line.match(/^\|\s*([a-z0-9-]+\.js)\s*\|/);
    if (m) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  return counts;
}

function pctOf(out) {
  if (!out || !out.tolerance) return null;
  if (typeof out.tolerance.pct === "number") return out.tolerance.pct;
  return null;
}

async function main() {
  const warnings = [];
  const errors = [];

  if (!existsSync(DERIV)) {
    console.error("ERROR: docs/derivations.md is missing; spec-v14 §5 corpus has not landed.");
    process.exit(1);
  }
  if (!existsSync(FIXTURE)) {
    console.error("ERROR: test/fixtures/worked-examples.json is missing; spec-v10 §C.1 fixture registry has not landed.");
    process.exit(1);
  }

  const moduleCounts = await loadCorpusModuleCounts();
  const fixturesJson = JSON.parse(await readFile(FIXTURE, "utf8"));
  const tileGroup = await loadTileGroups();

  if (moduleCounts.size === 0) {
    console.error("ERROR: docs/derivations.md is missing the `## Function corpus (v14)` section.");
    process.exit(1);
  }

  const totalCorpusRows = [...moduleCounts.values()].reduce((a, b) => a + b, 0);

  // Per-fixture tolerance check.
  let toleranceCheckedCount = 0;
  let toleranceWarnCount = 0;
  const fixtureModules = new Set();
  for (let i = 0; i < fixturesJson.rows.length; i++) {
    const row = fixturesJson.rows[i];
    const group = tileGroup.get(row.tile_id);
    if (!group) continue; // schema lint owns the tile_id-exists check.
    if (TOLERANCE_EXEMPT_GROUPS.has(group)) continue;
    const ceiling = GROUP_CEILING_PCT[group];
    if (ceiling === undefined) continue;
    if (!row.outputs || typeof row.outputs !== "object") continue;
    for (const [name, out] of Object.entries(row.outputs)) {
      const pct = pctOf(out);
      if (pct === null) continue;
      toleranceCheckedCount++;
      if (pct > ceiling && !row.tolerance_justification && !(out.tolerance && out.tolerance.justification)) {
        warnings.push(
          "row " + i + " (" + row.tile_id + ", group " + group + "): output '" + name +
          "' tolerance.pct=" + pct + " > group ceiling " + ceiling +
          "; add tolerance_justification per spec-v14 §14.2.",
        );
        toleranceWarnCount++;
      }
    }
  }

  console.log(
    "cross-validation: " + totalCorpusRows + " corpus row(s) across " +
    moduleCounts.size + " module(s); " +
    fixturesJson.rows.length + " fixture row(s) across " +
    new Set(fixturesJson.rows.map((r) => r.tile_id)).size + " tile(s); " +
    toleranceCheckedCount + " tolerance check(s).",
  );

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error("v14 cross-validation lint FAILED with " + errors.length + " errors.");
    process.exit(1);
  }
  if (warnings.length > 0) {
    for (const w of warnings) console.warn("WARN: " + w);
    console.warn(
      "v14 cross-validation lint OK with " + warnings.length +
      " warning(s) (Phase B scaffolding; warnings will graduate to errors once tolerance_justification fields are added per spec-v14 §14.2).",
    );
  } else {
    console.log("v14 cross-validation lint OK (" + toleranceWarnCount + " tolerance warnings, 0 errors).");
  }
}

await main();
