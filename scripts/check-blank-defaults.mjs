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
// Reads the renderer source rather than the schema, because `whenBlank` is
// deliberately NOT part of the MCP input contract: `describe_calculator` still
// reports `default: null` for these fields, so the agent door keeps refusing a
// default the page does not show (the rule commit c970d044 established).
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

// Brace-match forward from `at` (which must sit on an opening brace).
function block(src, at) {
  let depth = 0;
  for (let i = at; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") { depth -= 1; if (!depth) return src.slice(at, i + 1); }
  }
  return "";
}

const errors = [];
let checked = 0, specs = 0;

for (const name of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
  const src = readFileSync(resolve(ROOT, name), "utf8");
  if (!src.includes("whenBlank:")) continue;
  const mod = await import(pathToFileURL(resolve(ROOT, name)).href);

  // Each `_simpleRenderer({ ... })` spec: the compute it names, and every
  // field in it that declares a whenBlank.
  for (const m of src.matchAll(/_simpleRenderer\(\s*(\{)/g)) {
    const spec = block(src, m.index + m[0].length - 1);
    if (!spec || !spec.includes("whenBlank:")) continue;
    specs += 1;
    const cm = spec.match(/\bcompute:\s*([A-Za-z_$][\w$]*)/);
    if (!cm) { errors.push(`${name}: a spec declares whenBlank but names no compute`); continue; }
    const fn = mod[cm[1]];
    if (typeof fn !== "function") { errors.push(`${name}: ${cm[1]} is not an exported function`); continue; }
    const defs = sigDefaults(fn);
    if (!defs) { errors.push(`${name}: ${cm[1]} has no destructured parameter to read`); continue; }

    for (const f of spec.matchAll(/\{[^{}\n]*\bkey:\s*"([^"]+)"[^{}\n]*\bwhenBlank:\s*(-?[\d.]+)[^{}\n]*\}/g)) {
      const [, key, claimed] = f;
      checked += 1;
      if (!defs.has(key)) {
        errors.push(`${name}: ${cm[1]}({ ${key} }) declares no numeric default, but the field claims whenBlank ${claimed}`);
        continue;
      }
      const real = defs.get(key);
      if (Number(claimed) !== real) {
        errors.push(`${name}: ${cm[1]}({ ${key} }) defaults to ${real}, but the field claims whenBlank ${claimed}`);
      }
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error("  - " + e);
  console.error(`check-blank-defaults FAILED: ${errors.length} field(s) claim a default their compute does not apply.`);
  process.exit(1);
}
console.log(`check-blank-defaults OK: ${checked} whenBlank value(s) across ${specs} renderer spec(s) match the default their compute applies.`);
