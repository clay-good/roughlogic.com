#!/usr/bin/env node
// spec-v14 §13.1 Phase I derivation-coverage lint (scaffolding).
//
// Reads the TOOLS array from app.js and the derivations document at
// docs/derivations.md, then reports per-tile coverage of the
// derivations document. A tile is "covered" when its tile_id appears
// in derivations.md (any section, any context). Per spec-v14 §13.1
// "every tile in the TOOLS array has a derivation row in
// docs/derivations.md that names the formula, the citation, and the
// worked-example fixture"; today the document organizes derivations
// by formula family (one section per formula, covering a tile family),
// so the per-tile mention rate is well below 100 percent and the
// migration to a per-tile row pattern is incremental.
//
// Behavior:
//   FAIL (exit 1):
//     - docs/derivations.md missing or unreadable.
//   WARN (does not fail; scaffolding):
//     - A TOOLS tile has no mention in derivations.md. The lint runs
//       in measurement mode at scaffolding close (385 - mention_count
//       gaps); once the migration to one row per tile lands, the
//       warning graduates to fail-on-missing (the same ratchet pattern
//       v10 worked-examples followed).
//
// Per-group breakdown reported so the migration can be planned per
// group. `--verbose` prints the per-tile mention status.
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// spec-v17 §H.2: TOOLS now lives in tools-data.js (lazy-loaded out of app.js).
const TOOLS_DATA = resolve(ROOT, "tools-data.js");
const DERIV = resolve(ROOT, "docs", "derivations.md");

async function loadTools() {
  // Returns array of { id, group } for every TOOLS entry in app.js.
  const text = await readFile(TOOLS_DATA, "utf8");
  const out = [];
  for (const m of text.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"[^}]*?group:\s*"([A-Z])"/g)) {
    out.push({ id: m[1], group: m[2] });
  }
  return out;
}

async function main() {
  if (!existsSync(DERIV)) {
    console.error("ERROR: docs/derivations.md is missing.");
    process.exit(1);
  }
  const tools = await loadTools();
  const derivText = await readFile(DERIV, "utf8");

  // Per-tile coverage: search for tile_id as a substring. The match is
  // conservative (any context including the corpus row's parameter
  // list, an in-text reference like `the ohms-law tile`, or a section
  // heading that names the tile). A future stricter version asserts
  // the tile id appears in a section heading or in a corpus row's
  // function-name column.
  const covered = new Set();
  for (const t of tools) {
    if (derivText.includes(t.id)) covered.add(t.id);
  }

  // Per-group rollup.
  const groups = new Map();
  for (const t of tools) {
    if (!groups.has(t.group)) groups.set(t.group, { total: 0, covered: 0 });
    const g = groups.get(t.group);
    g.total++;
    if (covered.has(t.id)) g.covered++;
  }

  const totalCovered = covered.size;
  const totalTools = tools.length;
  const pct = totalTools > 0 ? (totalCovered / totalTools) * 100 : 0;

  console.log(
    "derivation-coverage: " + totalCovered + " / " + totalTools +
    " tile(s) mentioned in derivations.md (" + pct.toFixed(1) + "%).",
  );

  // Per-group breakdown, sorted by group letter.
  const groupRows = [...groups.entries()].sort();
  if (process.argv.includes("--verbose") || pct >= 50) {
    for (const [g, stats] of groupRows) {
      const gpct = stats.total > 0 ? (stats.covered / stats.total) * 100 : 0;
      console.log(
        "  Group " + g + ": " + stats.covered + " / " + stats.total +
        " (" + gpct.toFixed(0) + "%)",
      );
    }
  }

  const missing = tools.filter((t) => !covered.has(t.id));

  if (process.argv.includes("--verbose")) {
    console.log("\nmissing tile mentions (" + missing.length + "):");
    for (const t of missing) {
      console.log("  [" + t.group + "] " + t.id);
    }
  }

  if (missing.length > 0) {
    for (const t of missing) {
      console.error(
        "ERROR: TOOLS tile '" + t.id + "' (Group " + t.group + ") is not " +
        "mentioned anywhere in docs/derivations.md; spec-v14 §13.1 requires " +
        "every tile to carry a derivation row. Re-run `npm run audit:tile-index` " +
        "to regenerate the per-tile index appendix.",
      );
    }
    console.error(
      "v14 derivation-coverage lint FAILED with " + missing.length + " missing tile(s).",
    );
    process.exit(1);
  }
  // What this gate establishes, held where a reader meets it. A tile counts as
  // covered when its tile_id appears anywhere in docs/derivations.md -- and the
  // document ends with a machine-generated per-tile index that lists every tile
  // by construction. Outside that generated block only 68 of 1,804 tile ids
  // (3.8%) appear at all, so the 100% this gate reports is satisfied by
  // build-tile-index.mjs having run, not by a derivation existing.
  //
  // What IS real is the 72 numbered formula-family sections, each deriving a
  // formula in full for a family of tiles. That is worth claiming; "every
  // formula has a written derivation" is not the same sentence.
  const derivations = await readFile(resolve(ROOT, "docs", "derivations.md"), "utf8");
  const families = (derivations.match(/^## \d+\. /gm) || []).length;
  const readmeText = await readFile(resolve(ROOT, "README.md"), "utf8");
  const row = readmeText.split("\n").find((l) => l.includes("`check-derivation-coverage`"));
  const derivErrors = [];
  if (row) {
    if (/every formula has a written derivation/i.test(row)) {
      derivErrors.push(
        "README.md says every formula has a written derivation. This gate asserts a " +
        "tile_id appears in docs/derivations.md, which the generated per-tile index " +
        "satisfies for every tile. Say what is actually derived.",
      );
    }
    const stated = /\*\*(\d+) formula families\*\*/.exec(row);
    if (!stated) {
      derivErrors.push(
        "README.md's check-derivation-coverage row does not state how many formula " +
        "families docs/derivations.md derives. It derives " + families + ".",
      );
    } else if (Number(stated[1]) !== families) {
      derivErrors.push(
        "README.md says " + stated[1] + " formula families; docs/derivations.md has " +
        families + " numbered sections.",
      );
    }
  }
  if (derivErrors.length > 0) {
    for (const e of derivErrors) console.error("ERROR: " + e);
    console.error("v14 derivation-coverage lint FAILED with " + derivErrors.length + " error(s).");
    process.exit(1);
  }


  console.log(
    "v14 derivation-coverage lint OK (graduated to fail-on-missing at the 2026-05-22 " +
    "Phase I §13.1 per-tile derivation-index closeout per spec-v14 §16.2 ratchet; " +
    "every TOOLS tile is mentioned in docs/derivations.md).",
  );
}

await main();
