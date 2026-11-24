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
// own signature default applies -- and "show the steps" used to skip an
// `undefined` param, so the value appeared on NO surface. A reader looking at an
// empty "Water temperature (F)" and a finished answer had no way to learn that
// 60 F was used. The agent door already refuses these (`inputDefaults` takes a
// default only where the field's OWN declared default agrees one exists); the
// page is the surface this measures.
//
// IT ASKS THE PAGE, NOT THE COMPUTE. The first version of this harness ran each
// tile with a key absent and with an explicit 0 and called the difference a
// hidden value. That is the right question to ask of a compute and the wrong one
// to ask of a page: it never looks at what the RENDERER sends. A hand-written
// renderer that reads a blank box as `null` (ohms-law's readNum) or as
// `Number(v) || 0` passes a value, so the signature default never applies and
// nothing is hidden -- and the compute probe counted 190 such fields as hidden
// while missing real ones the worked example happened not to carry. Nor may the
// sweep CLEAR the boxes: a field that declares a default is prefilled, the
// reader can read it, and clearing it measures a reader who deleted a shown
// value instead (that mistake reported 1,591 phantoms, 748 of them visible).
//
// So: render every tile under the fake DOM with the compute spied on, leave the
// boxes exactly as the renderer built them, and report every argument that
// arrives `undefined` while its compute declares a non-zero default. That is
// the page as it opens.
//
// Measured 2026-11-24: 768 fields on 360 tiles, and EVERY ONE IS DISCLOSED --
// the field carries `whenBlank` and the steps panel prints it as "60 (default,
// box left blank)". The last six lived on hand-written renderers that pass the
// panel a list of key NAMES and read values back off the page, where a blank
// box has nothing to read; each one's label already stated the number, so the
// box is prefilled instead. Hold this at zero: a new field that computes with
// a number the reader cannot see should fail review, not be counted.
// scripts/check-blank-defaults.mjs holds every published value to its compute's
// own signature, and test/unit/steps-panel-guard.test.js holds it to the page.
//
// About two minutes. Zero dependencies, no network.
//
//   node scripts/measure-phantom-defaults.mjs [--all]
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOW_ALL = process.argv.includes("--all");

// The page's own behaviour, from the fake-DOM sweep (it installs globals and a
// module loader hook, so it runs in its own process).
const sweep = JSON.parse(execFileSync(process.execPath,
  [resolve(ROOT, "test", "fixtures", "render-blank-arg-sweep.js")],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }));

const { RENDERER_MAP } = await import(pathToFileURL(resolve(ROOT, "test", "fixtures", "renderer-map.js")).href);
const { COMPUTE_MAP } = await import(pathToFileURL(resolve(ROOT, "test", "fixtures", "compute-map.js")).href);

// The numeric literal defaults of a destructured single-object parameter.
function sigDefaults(fn) {
  const src = String(fn).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const open = src.indexOf("(");
  const brace = src.indexOf("{", open);
  if (open === -1 || brace === -1 || src.slice(open, brace).includes(")")) return null;
  let depth = 0, end = -1;
  for (let i = brace; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") { depth -= 1; if (!depth) { end = i; break; } }
  }
  if (end === -1) return null;
  const parts = []; depth = 0; let cur = "";
  for (const ch of src.slice(brace + 1, end)) {
    if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
    if (ch === "," && !depth) { parts.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  const map = new Map();
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const name = p.slice(0, eq).trim(), raw = p.slice(eq + 1).trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name) && /^-?\d+(?:\.\d+)?$/.test(raw)) map.set(name, Number(raw));
  }
  return map;
}

const imp = (rel) => import(pathToFileURL(resolve(ROOT, "test", "fixtures", rel)).href);
let fields = 0, shown = 0;
const tiles = new Set(), left = [];

for (const [id, keys] of Object.entries(sweep.undefinedArgs || {})) {
  const creg = COMPUTE_MAP[id], rreg = RENDERER_MAP[id];
  if (!creg || !rreg) continue;
  let cmod, rmod;
  try { cmod = await imp(creg.module); rmod = await imp(rreg.module); } catch { continue; }
  const compute = cmod[creg.fn];
  if (typeof compute !== "function") continue;
  const defs = sigDefaults(compute);
  if (!defs) continue;
  const rf = (rmod[rreg.exportName] || {})[id];
  const blanks = (rf && rf.schema && rf.schema.blankDefaults) || {};
  for (const key of keys) {
    const used = defs.get(key);
    if (used === undefined || used === 0) continue;   // a blank box IS zero: nothing hidden
    fields += 1; tiles.add(id);
    if (key in blanks) shown += 1;
    else left.push(`${id}.${key} = ${used}`);
  }
}

console.log(`measure-phantom-defaults: ${fields} field(s) on ${tiles.size} tile(s) whose EMPTY box computes with a number the reader did not type.`);
console.log(`  DISCLOSED -- the field carries whenBlank and the steps panel prints it: ${shown}`);
console.log(`  still shown on no surface: ${fields - shown}`);
console.log(`  (${sweep.rendered} tile(s) rendered; ${sweep.tiles} reached their compute from an untouched page)`);
for (const l of (SHOW_ALL ? left : left.slice(0, 40))) console.log("    " + l);
if (!SHOW_ALL && left.length > 40) console.log(`    ... and ${left.length - 40} more (--all)`);
