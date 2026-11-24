#!/usr/bin/env node
// Harness: a page field whose box is EMPTY while the calculator computes with a
// number the reader cannot see anywhere.
//
// The declarative renderer factories read a blank, non-required number box as
// `undefined`:
//
//     params[f.key] = f.required && blank ? null : blank ? undefined : Number(value)
//
// `undefined` is exactly what a destructuring default is for, so the compute's
// own signature default applies -- and "show the steps" skips an `undefined`
// param, so the value appears on NO surface. A reader looking at an empty
// "Corner height (ft)" and a finished answer has no way to learn that 8 ft was
// used. The agent door already refuses these (`inputDefaults` takes a default
// only where the field's OWN declared default agrees one exists, so a default
// that lives only in the compute signature is not an answer); the page is the
// remaining surface.
//
// This sweep is the measurement, not a remedy. For every tile whose inputs come
// from a renderer schema, it takes each number field whose declared default is
// null -- an empty box -- and compares running the tile with that key ABSENT
// against running it with an explicit 0. Where the two agree, a blank box means
// zero and nothing is hidden. Where the tile refuses, that is honest too. What
// is left is a silent third value.
//
// Measured 2026-11-23: 971 fields on 453 tiles. Only 19 are recoverable from the
// answer itself (the result echoes the key), so there is no cheap disclosure
// path -- a remedy has to choose between PREFILLING the number into the box, so
// the page shows what it computes with, and REFUSING a blank primary input. The
// first makes a number the reader did not type look like one they did; the
// second changes answers that are correct today. 17 fields whose own label
// states the value were prefilled on 2026-11-23 (commit 03be1c06) as the
// uncontroversial slice.
//
// About five minutes. Zero dependencies, no network.
//
//   node scripts/measure-phantom-defaults.mjs [--all]
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOW_ALL = process.argv.includes("--all");
const cat = await import(resolve(ROOT, "mcp", "catalog.mjs"));
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));

let tiles = 0, fields = 0, echoed = 0, refused = 0, zeroLike = 0;
const rows = [];

for (const t of TOOLS) {
  let d;
  try { d = await cat.describe({ id: t.id }); } catch { continue; }
  if (d.inputs_source !== "renderer") continue;
  const ex = d.example && d.example.inputs;
  if (!ex || typeof ex !== "object") continue;
  let hit = false;

  for (const inp of d.inputs || []) {
    if (inp.kind !== "number" && inp.kind !== undefined) continue;
    if (inp.default !== null && inp.default !== undefined) continue;   // the box shows a value
    const key = inp.key ?? inp.name;
    if (!(key in ex)) continue;

    const without = { ...ex };
    delete without[key];
    let absent, zero;
    try { absent = await cat.run({ id: t.id, inputs: without }); } catch { continue; }
    try { zero = await cat.run({ id: t.id, inputs: { ...without, [key]: 0 } }); } catch { continue; }
    if (JSON.stringify(absent && absent.result) === JSON.stringify(zero && zero.result)) { zeroLike++; continue; }
    if (absent && absent.result && absent.result.error) { refused++; continue; }

    fields++; hit = true;
    const used = absent.result && absent.result[key];
    const echo = typeof used === "number" && Number.isFinite(used);
    if (echo) echoed++;
    if (SHOW_ALL || rows.length < 40) rows.push(`${t.id}.${key} (${inp.label})${echo ? ` -- the answer echoes ${used}` : ""}`);
  }
  if (hit) tiles++;
}

console.log(`measure-phantom-defaults: ${fields} field(s) on ${tiles} tile(s) whose EMPTY box computes with a number shown nowhere.`);
console.log(`  recoverable from the answer itself (the result echoes the key): ${echoed}`);
console.log(`  not a phantom -- a blank box behaves as zero: ${zeroLike}`);
console.log(`  not a phantom -- the calculator refuses a blank: ${refused}`);
for (const l of rows) console.log("    " + l);
if (!SHOW_ALL && fields > rows.length) console.log(`    ... and ${fields - rows.length} more (--all)`);
