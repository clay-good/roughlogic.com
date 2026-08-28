#!/usr/bin/env node
// Every value inside a list input must reach the calculation.
//
// 53 tiles take a structured list -- a row of point loads, a duty log, a
// fixture schedule -- and the sub-keys inside those rows are the one part of a
// worked example that NOTHING else checks. The fixture runner compares the
// tile's published answers to its published inputs, so a fixture and a compute
// that agree on being wrong agree silently.
//
// That is not hypothetical. `truss-capacity` published three point loads under
// `load_lb` while `computeTrussCapacity` reads `weight_lb`: every load computed
// as ZERO, and the tile printed a safety factor for an unloaded truss. It took
// a hand-run browser sweep to find, and nothing in the build would have caught
// it coming back.
//
// THE TEST IS BEHAVIOURAL, not a source parse: perturb one value and require
// some answer to move. A key the compute never reads cannot change an answer.
//
// Four things had to be got right, each of them a false positive first:
//
//   ONE ELEMENT, NOT ALL   Scaling every element by the same factor cancels in
//                          any normalised quantity. `seismic-overturning-moment`
//                          distributes base shear by w*h / sum(w*h), so
//                          multiplying every story weight changes nothing --
//                          correct, and invisible to a uniform perturbation.
//   BOTH DIRECTIONS        A clamp absorbs one of them. `growing-degree-days`
//                          caps Tmax at a cutoff, so a raised Tmax comes out
//                          identical while a lowered one moves.
//   NEVER PERTURB A ZERO   Multiplying zero is a no-op. Four well-read keys
//                          reported as ignored because their first element was
//                          0 (`traverse-closure` opens on azimuth 0).
//   ONLY JUDGE WHAT RAN    An out-of-range perturbation makes the calculator
//                          return an error -- a duty cycle of 8.5, a DMX
//                          address of 607. That says nothing about whether the
//                          key is read, so it is not evidence either way.
//
// Deliberately NO allowlist: it is clean at zero today, so a list would exist
// only to absorb the first regression silently.
//
// Standalone Node 20, built-ins only. Runs in well under a second.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");

const { run } = await import(resolve(ROOT, "mcp", "catalog.mjs"));
const raw = JSON.parse(await readFile(resolve(ROOT, "test", "fixtures", "worked-examples.json"), "utf8"));

// Every finite number anywhere in a result, in a stable order.
function numbers(value) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "number") { if (Number.isFinite(v)) out.push(v); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return out;
}

const unchanged = (a, b) =>
  a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= Math.max(1e-9, Math.abs(b[i]) * 1e-9));

const failures = [];
const seen = new Set();
let tilesWithLists = 0, probed = 0;

for (const row of raw.rows) {
  if (seen.has(row.tile_id)) continue;
  seen.add(row.tile_id);
  const inputs = row.inputs || {};
  let counted = false;

  for (const [key, value] of Object.entries(inputs)) {
    if (!Array.isArray(value) || !value.length) continue;
    if (!value.every((v) => v && typeof v === "object" && !Array.isArray(v))) continue;
    // Numeric in EVERY element: a sub-key that is a name or a date carries no
    // arithmetic and is not expected to move an answer.
    const subKeys = [...new Set(value.flatMap((o) => Object.keys(o)))]
      .filter((k) => value.every((o) => typeof o[k] === "number" && Number.isFinite(o[k])));
    if (!subKeys.length) continue;

    let base;
    try { base = await run({ id: row.tile_id, inputs: structuredClone(inputs) }); } catch { continue; }
    if (!base.result || base.result.error) continue;
    const baseline = numbers(base.result);
    if (!baseline.length) continue;
    if (!counted) { tilesWithLists++; counted = true; }

    for (const sub of subKeys) {
      probed++;
      let index = value.findIndex((e) => e[sub] !== 0);
      const additive = index === -1;
      if (additive) index = 0;
      const shifts = additive ? [(x) => x + 1, (x) => x - 1] : [(x) => x * 1.5, (x) => x * 0.5];

      let moved = false, ran = 0;
      for (const shift of shifts) {
        const mutated = structuredClone(inputs);
        mutated[key][index][sub] = shift(mutated[key][index][sub]);
        let out;
        try { out = await run({ id: row.tile_id, inputs: mutated }); } catch { continue; }
        if (!out.result || out.result.error) continue;
        ran++;
        if (!unchanged(numbers(out.result), baseline)) { moved = true; break; }
      }
      if (ran && !moved) {
        failures.push(
          `${row.tile_id}: "${key}[].${sub}" changes no answer. The calculator never reads it, ` +
          `so the value the example supplies is discarded — check the sub-key name against the compute.`,
        );
      } else if (VERBOSE && !ran) {
        console.log(`  note: ${row.tile_id}.${key}[].${sub} — every perturbation left the field's range; not judged.`);
      }
    }
  }
}

if (failures.length) {
  for (const f of failures) console.error("ERROR: " + f);
  console.error(`check-list-inputs FAILED: ${failures.length} list value(s) never reach the calculation.`);
  process.exit(1);
}

console.log(
  `check-list-inputs OK: ${probed} numeric sub-keys across ${tilesWithLists} tiles with list inputs ` +
  `all reach the calculation.`,
);
