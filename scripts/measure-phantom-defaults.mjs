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

// Which of these the page now DISCLOSES. `whenBlank` is what the steps panel
// prints for a blank box the calculator still computes with; it is deliberately
// not part of the MCP input contract (`describe_calculator` still reports
// `default: null`, so the agent door keeps refusing a default the page does not
// show), which is why it has to be read from the renderer source here.
// scripts/check-blank-defaults.mjs holds each one to its compute's signature.
const { readFileSync, readdirSync } = await import("node:fs");
// Tied to the TILE, not just the module: a key name can appear in several
// specs in one file, and a measurement that over-counts its own progress is
// worth less than no measurement.
const disclosed = new Map();   // tile id -> Set of field keys
const blockAt = (src, at) => {
  let depth = 0;
  for (let i = at; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") { depth -= 1; if (!depth) return src.slice(at, i + 1); }
  }
  return "";
};
for (const name of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
  const src = readFileSync(resolve(ROOT, name), "utf8");
  if (!src.includes("whenBlank:")) continue;
  for (const m of src.matchAll(/RENDERERS\[\s*"([a-z0-9-]+)"\s*\]\s*=\s*_simpleRenderer\(\s*\{/g)) {
    const spec = blockAt(src, m.index + m[0].length - 1);
    if (!spec.includes("whenBlank:")) continue;
    const keys = new Set();
    for (const f of spec.matchAll(/\{[^{}\n]*\bkey:\s*"([^"]+)"[^{}\n]*\bwhenBlank:/g)) keys.add(f[1]);
    disclosed.set(m[1], keys);
  }
}
const isDisclosed = (id, key) => {
  const keys = disclosed.get(id);
  return Boolean(keys && keys.has(key));
};

let tiles = 0, fields = 0, echoed = 0, refused = 0, zeroLike = 0, shown = 0;
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
    if (isDisclosed(t.id, key)) { shown++; continue; }
    if (SHOW_ALL || rows.length < 40) rows.push(`${t.id}.${key} (${inp.label})${echo ? ` -- the answer echoes ${used}` : ""}`);
  }
  if (hit) tiles++;
}

console.log(`measure-phantom-defaults: ${fields} field(s) on ${tiles} tile(s) whose EMPTY box computes with a number the reader did not type.`);
console.log(`  now DISCLOSED -- the steps panel prints it as the default (whenBlank): ${shown}`);
console.log(`  still shown on no surface: ${fields - shown}`);
console.log(`  recoverable from the answer itself (the result echoes the key): ${echoed}`);
console.log(`  not a phantom -- a blank box behaves as zero: ${zeroLike}`);
console.log(`  not a phantom -- the calculator refuses a blank: ${refused}`);
for (const l of rows) console.log("    " + l);
if (!SHOW_ALL && fields > rows.length) console.log(`    ... and ${fields - rows.length} more (--all)`);
