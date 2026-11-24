#!/usr/bin/env node
// Gate: every `whenBlank` a renderer declares is the value its compute really
// applies to an empty box.
//
// The declarative factories read a blank, non-required number box as
// `undefined` -- exactly what a destructuring default is for -- so the compute
// applies its own signature default, and "show the steps" skipped the row,
// leaving the number on no surface at all. A reader looking at an empty "Corner
// height (ft)" and a finished answer had no way to learn that 8 ft was used.
// `whenBlank` is what the steps panel prints for such a box.
//
// It is therefore a CLAIM ABOUT ANOTHER FUNCTION'S SIGNATURE, and those rot:
// change `corner_height_ft = 8` to `= 9` in the compute and the panel goes on
// saying 8, which is worse than saying nothing. This reads the signature and
// compares, so the claim cannot drift without turning the build red.
//
// Reads every tile's PUBLISHED map (`schema.blankDefaults`) through the
// renderer registry, not the module source. A source scan has to know which
// factory built the spec, and the modules use six aliases for it
// (_simpleRenderer, _simpleRendererG, _v23SimpleRenderer, _r, _rEnv, _rPool):
// scanning for one of them silently skipped a false claim on a `required`
// field in calc-kitchen.js, which is exactly what this gate exists to catch
// (2026-11-24). The registry is factory-agnostic and exact per tile.
//
// `blankDefaults` is deliberately NOT part of the MCP input contract:
// `describe_calculator` still reports `default: null` for these fields, so the
// agent door keeps refusing a default the page does not show (the rule commit
// c970d044 established). test/unit/steps-panel-guard.test.js pins that.
//
// Zero dependencies, no network. `node scripts/check-blank-defaults.mjs`.
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
    const name = p.slice(0, eq).trim();
    const raw = p.slice(eq + 1).trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(name) || !/^-?\d+(?:\.\d+)?$/.test(raw)) continue;
    map.set(name, Number(raw));
  }
  return map;
}

const errors = [];
let checked = 0, tiles = 0;

const { RENDERER_MAP } = await import(resolve(ROOT, "test", "fixtures", "renderer-map.js"));
const { COMPUTE_MAP } = await import(resolve(ROOT, "test", "fixtures", "compute-map.js"));

for (const [id, reg] of Object.entries(RENDERER_MAP)) {
  if (!reg || !reg.module || !reg.exportName) continue;
  let rmod;
  try { rmod = await import(pathToFileURL(resolve(ROOT, "test", "fixtures", reg.module)).href); } catch { continue; }
  const fn = (rmod[reg.exportName] || {})[id];
  const blanks = fn && fn.schema && fn.schema.blankDefaults;
  if (!blanks || !Object.keys(blanks).length) continue;
  tiles += 1;

  const creg = COMPUTE_MAP[id];
  if (!creg) { errors.push(`${id}: declares ${Object.keys(blanks).length} blank default(s) but has no compute registered`); continue; }
  let cmod;
  try { cmod = await import(pathToFileURL(resolve(ROOT, "test", "fixtures", creg.module)).href); } catch { errors.push(`${id}: its compute module will not import`); continue; }
  const compute = cmod[creg.fn];
  if (typeof compute !== "function") { errors.push(`${id}: ${creg.fn} is not an exported function`); continue; }
  const defs = sigDefaults(compute);
  if (!defs) { errors.push(`${id}: ${creg.fn} has no destructured parameter to read`); continue; }

  for (const [key, claimed] of Object.entries(blanks)) {
    checked += 1;
    if (!defs.has(key)) {
      errors.push(`${id}: ${creg.fn}({ ${key} }) declares no numeric default, but the field claims whenBlank ${claimed}`);
      continue;
    }
    const real = defs.get(key);
    if (Number(claimed) !== real) {
      errors.push(`${id}: ${creg.fn}({ ${key} }) defaults to ${real}, but the field claims whenBlank ${claimed}`);
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error("  - " + e);
  console.error(`check-blank-defaults FAILED: ${errors.length} field(s) claim a default their compute does not apply.`);
  process.exit(1);
}
console.log(`check-blank-defaults OK: ${checked} whenBlank value(s) across ${tiles} tile(s) match the default their compute applies.`);
