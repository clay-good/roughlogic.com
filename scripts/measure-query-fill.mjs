#!/usr/bin/env node
// spec-v1340 measurement, made repeatable.
//
// The one lens that can judge query-fill across the whole catalog: every tile
// carries a publisher-verified worked example, so re-phrasing that example as
// the question a person would type gives 1,331 queries whose right answer is
// already known. Recovery is how many fields come back; WRONG is how many come
// back holding a value the example did not have -- and wrong is the number
// that matters, because a wrong value is a confident wrong answer on a job.
//
// The v1340 pass was run by hand and its numbers live in the spec. This makes
// it a script so the next change to query-fill.js can be measured against the
// same lens rather than argued about: 62.4% recovered, 0 tiles wrong.
//
// Not a lint gate (it is a measurement, and the honest baseline moves with the
// catalog). Run it before and after any query-fill change:
//
//   node scripts/measure-query-fill.mjs            summary
//   node scripts/measure-query-fill.mjs --wrong    every wrong value, named
//   node scripts/measure-query-fill.mjs --misses   fields no phrasing recovers
//   node scripts/measure-query-fill.mjs --terse     values only, no field names

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOW_WRONG = process.argv.includes("--wrong");
const SHOW_MISSES = process.argv.includes("--misses");
// The harsh lens. Default phrasing hands the extractor each field's own name,
// which is how a careful person types and how spec-v1340 measured. --terse
// drops the names and leaves only values and units -- "4 in, 50 ft" -- which
// is how a person in a hurry types, and it is the only phrasing that can show
// a value landing in the wrong field for want of a name to hold it.
const TERSE = process.argv.includes("--terse");
// `--shapes` groups the tiles that recovered NOTHING by why. Added 2026-09-02,
// when the terse lens sat at 28.7% and the obvious question was how much of the
// remainder is reachable at all. Answer: most of it is not. See the note beside
// the census printer at the bottom.
const SHOW_SHAPES = process.argv.includes("--shapes");
const NONE_SHAPES = new Map();
const NONE_SAMPLES = new Map();
// The phrasing the site teaches and the ranker rewards: the calculator's name,
// then the values. It is the only mode that exercises the rule keeping a tile's
// own name from being read as a field name.
const NAMED = process.argv.includes("--named");

const { queryFill } = await import(resolve(ROOT, "query-fill.js"));
const { describe } = await import(resolve(ROOT, "mcp", "catalog.mjs"));

// The field index the browser reads, merged back into one map.
const FIELD_DIR = resolve(ROOT, "data", "fields");
const rowsByTile = new Map();
for (const name of await readdir(FIELD_DIR)) {
  if (!name.endsWith(".json") || name === "manifest.json") continue;
  const shard = JSON.parse(await readFile(resolve(FIELD_DIR, name), "utf8"));
  for (const [id, rows] of Object.entries(shard.tiles || {})) rowsByTile.set(id, rows);
}

// The example, phrased the way someone would say it: the field's own label
// lead, its value, and the unit the label declares. Nothing is invented -- if
// the reader would not say the unit, the label does not carry one either.
//
// Numbers inside the LABEL are dropped ("Measured 8-hr TWA" -> "measured twa",
// "Design rainfall, 100-yr / 1-hr" -> "design rainfall"). A person types
// "rainfall 4 in/hr", never the label's own thresholds back at it, and leaving
// them in measures the harness rather than the extractor: every one of the 11
// wrong values this found on its first run was the label's number being read
// as the reader's.
function phrase(rows, inputs) {
  const parts = [];
  for (const row of rows) {
    const v = inputs[row.d];
    if (v === null || v === undefined || v === "") continue;
    const label = TERSE ? "" : String(row.l).split(/\s+/).filter((w) => !/\d/.test(w)).join(" ").trim();
    if (row.k === "select" || row.k === "checkbox") parts.push(`${label} ${v}`.trim());
    else parts.push(`${label} ${v}${row.u ? " " + row.u : ""}`.trim());
  }
  return parts.join(", ");
}

function sameValue(got, want) {
  if (got === undefined) return false;
  const a = Number(got), b = Number(want);
  if (Number.isFinite(a) && Number.isFinite(b)) {
    // The fill converts into the field's own unit, so equality is numeric with
    // room for the rounding a conversion leaves behind.
    return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-4);
  }
  return String(got).toLowerCase() === String(want).toLowerCase();
}

let tiles = 0, all = 0, some = 0, none = 0;
let fields = 0, recovered = 0, wrong = 0;
const wrongRows = [], missRows = [];

for (const [id, rows] of rowsByTile) {
  let example, name = id;
  try {
    const d = await describe({ id });
    example = d.example && d.example.inputs;
    if (d.name) name = d.name;
  } catch { continue; }
  if (!example || typeof example !== "object") continue;

  const want = rows.filter((r) => {
    const v = example[r.d];
    return v !== null && v !== undefined && v !== "";
  });
  if (!want.length) continue;

  tiles++;
  const q = NAMED ? `${name} ${phrase(rows, example)}` : phrase(rows, example);
  const filled = (queryFill(q, rows, NAMED ? { name } : undefined) || {}).filled || {};
  let hit = 0, bad = 0;
  for (const row of want) {
    fields++;
    if (!(row.d in filled)) { missRows.push(`${id}.${row.d} (${row.l})`); continue; }
    if (sameValue(filled[row.d], example[row.d])) { hit++; recovered++; }
    else {
      bad++; wrong++;
      wrongRows.push(`${id}.${row.d} (${row.l}): filled ${JSON.stringify(filled[row.d])}, example has ${JSON.stringify(example[row.d])}`);
    }
  }
  if (bad) { /* counted below by tile */ }
  if (hit === want.length) all++;
  else if (hit > 0) some++;
  else {
    none++;
    if (SHOW_SHAPES) {
      const units = want.map((r) => r.u || null);
      const kinds = want.map((r) => r.k);
      const key = kinds.every((k) => k === "select" || k === "checkbox") ? "every field is a select or checkbox"
        : units.every((u) => !u) ? "no field declares a unit"
        : units.filter(Boolean).length !== new Set(units.filter(Boolean)).size ? "two or more fields share one unit"
        : "other";
      NONE_SHAPES.set(key, (NONE_SHAPES.get(key) || 0) + 1);
      const seen = NONE_SAMPLES.get(key) || [];
      if (seen.length < 4) { seen.push(`${id}  q=${JSON.stringify(q).slice(0, 62)}`); NONE_SAMPLES.set(key, seen); }
    }
  }
}

// Why the tiles that recovered nothing recovered nothing.
//
// Measured 2026-09-02 in terse mode: 356 of the 552 have TWO OR MORE FIELDS
// SHARING ONE UNIT ("480 v, 475 v, 470 v" against three volts fields), and 127
// have NO FIELD DECLARING A UNIT AT ALL. Both are genuinely ambiguous once the
// field names are gone, which is what terse mode removes.
//
// The tempting fix is positional: fill same-unit fields in declaration order.
// It is refused, and the refusal belongs here rather than in someone's head,
// because this harness CANNOT HONESTLY MEASURE IT. `phrase()` builds the query
// by walking `rows` in order, so a positional rule would score against a query
// this file wrote in exactly that order -- measuring the harness, not the
// extractor, the same trap the label-number note above records. A real reader
// types the values they have, in the order they think of them.
if (SHOW_SHAPES) {
  console.log("--- tiles that recovered nothing, by shape ---");
  for (const [k, v] of [...NONE_SHAPES].sort((a, b) => b[1] - a[1])) {
    console.log(String(v).padStart(5) + "  " + k);
    for (const sample of NONE_SAMPLES.get(k) || []) console.log("        " + sample);
  }
}

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : "0.0") + "%";
if (SHOW_WRONG) for (const r of wrongRows) console.log("WRONG  " + r);
if (SHOW_MISSES) for (const r of missRows.slice(0, 200)) console.log("miss   " + r);

console.log(
  `measure-query-fill${TERSE ? " (terse: values only, no field names)" : ""}${NAMED ? " (named: the tile name, then the values)" : ""}: ${tiles} tiles measured -- ` +
  `every value recovered ${all} (${pct(all, tiles)}), some ${some} (${pct(some, tiles)}), none ${none} (${pct(none, tiles)}).`,
);
console.log(
  `fields recovered ${recovered} / ${fields} (${pct(recovered, fields)}); ` +
  `WRONG values ${wrong}${wrong ? " -- re-run with --wrong" : ""}.`,
);
