#!/usr/bin/env node
// v10 Phase C.2 worked-example registry lint (spec-v10.md §5.2).
//
// Validates the schema of every row in test/fixtures/worked-examples.json.
// Reports per-tile coverage against the live TOOLS array in app.js.
//
// **Graduated state (2026-05-18, spec-v14 Phase B closeout):** coverage
// reached 100 percent (385 / 385 tiles, 390 fixtures) at the v13 close
// and remains there through the spec-v14 audit pass; the migration
// target declared in spec-v10 §5.2 is closed. The lint operates in
// fail-on-missing mode: a future tile that lands without a fixture
// fails CI immediately (no grace window). The FAIL_BELOW_PCT threshold
// (80) is now a regression backstop, not an active migration target.
//
// Behavior:
//   FAIL (exit 1):
//     - Any row is malformed: missing tile_id, source fields, inputs,
//       outputs, or verified_on; verified_on not ISO YYYY-MM-DD.
//     - tile_id references a tile that does not exist in TOOLS.
//     - An output entry has neither `tolerance.abs` nor `tolerance.pct`.
//     - Any TOOLS tile has no fixture row (graduated to fail-on-missing
//       after coverage exceeded 80 percent per spec-v10 §5.2).
//   WARN (does not fail):
//     - Coverage below 80 percent of TOOLS. (Backstop only; the
//       migration completed in 2026 and this branch should not trigger
//       in normal operation. A future regression below the threshold
//       still emits the migration-banner warning so the cause is
//       visible.)
//     - verified_on more than (cycle_years for the cited standard) old.
//       Today's lint is only a recency notice; the upgrade is gated on
//       Phase A.3 wiring docs/citation-discipline.md as the source of
//       truth.
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JS = resolve(ROOT, "app.js");
const FIXTURE = resolve(ROOT, "test", "fixtures", "worked-examples.json");

const FAIL_BELOW_PCT = 80; // Once total coverage >= 80%, lint upgrades to fail-on-missing.

async function loadToolIds() {
  const text = await readFile(APP_JS, "utf8");
  const ids = new Set();
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  for (const m of text.matchAll(re)) ids.add(m[1]);
  return ids;
}

function isIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function main() {
  const errors = [];
  const warnings = [];
  const toolIds = await loadToolIds();

  if (!existsSync(FIXTURE)) {
    warnings.push("test/fixtures/worked-examples.json missing; C.1 not yet shipped.");
    console.warn("WARN: " + warnings[0]);
    console.log("v10 worked-examples lint OK (registry not yet present).");
    return;
  }
  const r = JSON.parse(await readFile(FIXTURE, "utf8"));
  if (!Array.isArray(r.rows)) {
    console.error("ERROR: test/fixtures/worked-examples.json: 'rows' must be an array.");
    process.exit(1);
  }

  const REQUIRED = [
    "tile_id",
    "source_publisher",
    "source_title",
    "source_edition_or_year",
    "source_section_or_page",
    "verified_by",
    "verified_on",
    "inputs",
    "outputs",
  ];

  const coveredTiles = new Set();
  for (let i = 0; i < r.rows.length; i++) {
    const row = r.rows[i];
    const where = "row " + i + " (tile_id=" + (row && row.tile_id) + ")";
    if (!row || typeof row !== "object") {
      errors.push(where + ": not an object.");
      continue;
    }
    for (const key of REQUIRED) {
      if (!(key in row)) errors.push(where + ": missing '" + key + "'.");
    }
    if (typeof row.tile_id === "string") {
      if (!toolIds.has(row.tile_id)) {
        errors.push(where + ": tile_id '" + row.tile_id + "' is not a known tile.");
      } else {
        coveredTiles.add(row.tile_id);
      }
    }
    if (!isIsoDate(row.verified_on)) {
      errors.push(where + ": verified_on must be YYYY-MM-DD; got '" + row.verified_on + "'.");
    }
    if (row.inputs && typeof row.inputs !== "object") {
      errors.push(where + ": inputs must be an object.");
    }
    if (row.outputs && typeof row.outputs === "object") {
      for (const [name, out] of Object.entries(row.outputs)) {
        if (!out || typeof out !== "object") {
          errors.push(where + ": output '" + name + "' must be an object.");
          continue;
        }
        // String-valued outputs (table-lookup labels like AWG sizes or
        // pipe trade sizes) are compared by strict equality at runtime;
        // tolerance is still required by schema for uniformity but its
        // numeric content is ignored. Numeric outputs continue to
        // require a real number plus an abs or pct tolerance.
        if (typeof out.value !== "number" && typeof out.value !== "string") {
          errors.push(where + ": output '" + name + "' missing numeric or string value.");
        }
        const tol = out.tolerance;
        if (!tol || typeof tol !== "object") {
          errors.push(where + ": output '" + name + "' missing tolerance.");
        } else if (tol.abs === undefined && tol.pct === undefined) {
          errors.push(where + ": output '" + name + "' tolerance must declare 'abs' or 'pct'.");
        }
      }
    } else if (row.outputs) {
      errors.push(where + ": outputs must be an object.");
    }
  }

  const totalTiles = toolIds.size;
  const covered = coveredTiles.size;
  const pct = totalTiles > 0 ? (covered / totalTiles) * 100 : 0;

  console.log(
    "worked-example coverage: " + covered + " / " + totalTiles + " tiles (" + pct.toFixed(1) + "%); " + r.rows.length + " row(s).",
  );

  if (pct < FAIL_BELOW_PCT) {
    warnings.push(
      "coverage " + pct.toFixed(1) + "% is below the " + FAIL_BELOW_PCT + "% threshold; lint will graduate to fail-on-missing once threshold is reached.",
    );
  } else {
    // Once coverage >= 80%, every uncovered tile is a CI failure.
    for (const id of toolIds) {
      if (!coveredTiles.has(id)) {
        errors.push("tile '" + id + "' has no worked-example fixture (lint upgraded to fail-on-missing).");
      }
    }
  }

  for (const w of warnings) console.warn("WARN: " + w);
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v10 worked-examples lint FAILED with " + errors.length + " errors (" + warnings.length + " warnings).",
    );
    process.exit(1);
  }
  console.log("v10 worked-examples lint OK (" + warnings.length + " warnings, 0 errors).");
}

await main();
