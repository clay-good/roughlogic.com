// v10 Phase A.3 follow-up: citation-runtime audit (spec-v10 §3.3).
//
// Spec-v10 §3.3 declares docs/citation-discipline.md the single source
// of truth for every per-tile source-stamp string. The eventual
// migration is for runtime [citations.js](../../citations.js) to
// import the generated JSON and for every renderer to read from there.
// In the interim, renderer modules still set the source stamp inline
// via `citationEl.textContent = "..."`. This test holds the v10 §3.3
// contract at two levels:
//
//   1. Hard floor (FAIL): an explicit `ALIGNED` set lists every tile
//      whose markdown stamp currently appears verbatim in some
//      `calc-*.js` renderer. Membership must not regress; once a tile
//      is in the floor, the renderer cannot drift from the markdown
//      without CI catching it.
//
//   2. Soft audit (informational): the remaining tiles whose markdown
//      stamp does NOT yet appear verbatim are listed. The list is
//      printed as a one-line diagnostic so a maintainer can pick a
//      tile per release to align (typically a tiny edit to the
//      renderer's inline stamp). When a tile aligns, its id moves
//      from "missing" to ALIGNED.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GEN = resolve(ROOT, "docs", "citation-strings.generated.json");

// Tiles whose markdown stamp currently matches the renderer source
// VERBATIM. Add to this set when a tile aligns; the test enforces that
// every member here continues to match. APPEND-ONLY - removing an id
// without a CHANGELOG entry would silently allow drift.
const ALIGNED = new Set([
  "breaker-sizing",
  "duct-sizing",
  "friction-loss",
  "hos-math",
  "motor-fla",
  "refrigerant-pt",
  "weight-balance",
  "wire-ampacity", // aligned 2026-05-10: dropped degree symbol, made and -> /
  "bridge-formula", // aligned 2026-05-10: × -> nothing, ≥ -> >=
  "combustion-air", // aligned 2026-05-10: ft³/in² -> ft^3/in^2
  "egc-sizing", // aligned 2026-05-10: id rename egc -> egc-sizing + add parenthetical
  "stairs", // aligned 2026-05-10: expanded markdown to match renderer
  "pipe-sizing", // aligned 2026-05-10: expanded markdown to match renderer
  "footing-area", // aligned 2026-05-10: expanded markdown to match renderer
  "sprinkler-density", // aligned 2026-05-10: ft² -> ft^2 in renderer + expanded markdown
  "septic-tank", // aligned 2026-05-10: ≥ / × -> >= / * in renderer + expanded markdown
  "gas-pipe-sizing", // aligned 2026-05-10: × -> * in renderer + expanded markdown
  "lighting-density", // aligned 2026-05-10: expanded markdown to match renderer
  "pdp", // aligned 2026-05-10: expanded markdown to match renderer
  "required-fire-flow", // aligned 2026-05-10: × -> * in renderer + expanded markdown
  "standpipe-friction", // aligned 2026-05-10: ² -> ^2 in renderer + expanded markdown
  "box-fill", // aligned 2026-05-10: expanded markdown to match renderer
  "conduit-fill", // aligned 2026-05-10: ≥ -> >= in renderer + expanded markdown
  "gfci-afci-reference", // aligned 2026-05-10: expanded markdown to match renderer
  "lumber-spans", // aligned 2026-05-10: ²/⁴/· -> ASCII in renderer + expanded markdown
  "rafter", // aligned 2026-05-10: ²/× -> ^2/* in renderer + expanded markdown
  "service-load", // aligned 2026-05-10: ft² -> ft^2 in renderer + expanded markdown
  "manual-j-cooling", // aligned 2026-05-10: split markdown row from manual-j-heating
  "manual-j-heating", // aligned 2026-05-10: split markdown row from manual-j-cooling
  "trap-arm", // aligned 2026-05-10: rewrote markdown to public-engineering wording
  "grease-trap", // aligned 2026-05-10: × -> * in renderer + expanded markdown to PDI G101
  "arc-flash-screen", // aligned 2026-05-10: shipped with matching markdown row
  "motor-branch-from-nameplate", // aligned 2026-05-10: shipped with matching markdown row
  "grounding-electrode", // aligned 2026-05-10: shipped with matching markdown row
  "outdoor-air-ventilation", // aligned 2026-05-10: shipped with matching markdown row
  "scba-cylinder-time", // aligned 2026-05-10: shipped with matching markdown row
  "stopping-sight-distance", // aligned 2026-05-10: shipped with matching markdown row
  "lightning-countdown", // aligned 2026-05-10: shipped with matching markdown row
  "thi-livestock", // aligned 2026-05-10: shipped with matching markdown row
  "sprayer-calibration", // aligned 2026-05-10: shipped with matching markdown row
  "sous-vide-pasteurization", // aligned 2026-05-11: shipped with matching markdown row
  "svi-sludge-index", // aligned 2026-05-11: shipped with matching markdown row
  "noise-dose", // aligned 2026-05-11: shipped with matching markdown row
  "nfpa-1142-water-supply", // aligned 2026-05-11: shipped with matching markdown row
  "excavation-bench-plan", // aligned 2026-05-11: shipped with matching markdown row
  "disinfection-ct", // aligned 2026-05-11: shipped with matching markdown row
  "hood-exhaust", // aligned 2026-05-11: shipped with matching markdown row
  "recirc-loop-sizing", // aligned 2026-05-11: shipped with matching markdown row
  "shr-latent", // aligned 2026-05-11: shipped with matching markdown row
  "spl-atmospheric", // aligned 2026-05-11: shipped with matching markdown row
  "drying-log", // aligned 2026-05-11: shipped with matching markdown row
  "confined-space-vent", // aligned 2026-05-11: shipped with matching markdown row
]);

async function loadCorpus() {
  const entries = await readdir(ROOT);
  const calcFiles = entries.filter(
    (f) => f.startsWith("calc-") && f.endsWith(".js"),
  );
  const parts = await Promise.all(
    calcFiles.map((f) => readFile(resolve(ROOT, f), "utf8")),
  );
  return parts.join("\n");
}

async function loadGenerated() {
  const text = await readFile(GEN, "utf8");
  return JSON.parse(text);
}

test("every ALIGNED tile's markdown stamp appears verbatim in calc-*.js", async () => {
  const corpus = await loadCorpus();
  const json = await loadGenerated();
  for (const id of ALIGNED) {
    const row = json.strings[id];
    assert.ok(row, "ALIGNED id '" + id + "' missing from citation-strings.generated.json");
    assert.ok(
      corpus.includes(row.stamp),
      "ALIGNED tile '" + id + "': stamp drifted from markdown.\n  expected: " + row.stamp,
    );
  }
});

test("citation-runtime audit: report per-tile alignment status", async () => {
  const corpus = await loadCorpus();
  const json = await loadGenerated();
  const matched = [];
  const missing = [];
  for (const [id, row] of Object.entries(json.strings)) {
    if (corpus.includes(row.stamp)) matched.push(id);
    else missing.push(id);
  }
  // Diagnostic. The numbers move as tiles align; a future maintainer
  // graduates this from "informational" to "fail when missing > N" once
  // the floor is high enough.
  console.log(
    "citation-runtime audit: " + matched.length + " aligned / " + missing.length + " misaligned (of " + Object.keys(json.strings).length + " tiles).",
  );
  if (missing.length > 0) {
    console.log("  not yet aligned: " + missing.join(", "));
  }
  // Sanity: at least the ALIGNED floor must hold.
  for (const id of ALIGNED) {
    assert.ok(matched.includes(id), id + ": fell out of matched set (regression).");
  }
});
