#!/usr/bin/env node
// Guard-only dead-input lint.
//
// The existing check-dead-inputs.mjs catches a compute parameter that is
// destructured and NEVER referenced. It misses a subtler, equally real class
// this repo has shipped repeatedly: a parameter that IS referenced, but ONLY
// in a validation guard (`if (!(x > 0)) return { error }`) and/or a `Number()`
// coercion, and never flows into a returned value. A user sets the rendered
// field and nothing changes -- "the worst failure mode for a safety aid."
// (Six such inputs were found and fixed on 2026-07-18: thinset bag_weight,
// brick-veneer spacing caps, residential-framing rafter_span, pallet-loadout
// case dims, containment-air-balance volume.)
//
// For each `export function computeXxx({ ...params })`, this gate:
//   1. Tracks each param plus the local alias of any `const A = Number(param)`.
//   2. Classifies every body line that references the param or its alias as a
//      GUARD (an `if (...) ... error` validation), a COERCION declaration, or
//      a REAL use (anything else -- arithmetic, assignment, return, push).
//   3. Fails if a param (and its alias) have ZERO real uses.
//
// Reviewed legitimate exceptions -- a parameter whose presence/value MEANS the
// case is out of scope, so erroring IS the correct behavior -- live in
// scripts/guard-only-inputs-allowlist.json (the same pattern as the
// us-defaults allowlist). Each entry is reviewed like a citation.
//
// Standalone Node 20, built-ins only. Wired into `npm run lint`.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const allowlist = JSON.parse(
  await readFile(resolve(ROOT, "scripts", "guard-only-inputs-allowlist.json"), "utf8"),
);
const allowed = new Set(allowlist.entries.map((e) => e.module + "::" + e.fn + "::" + e.param));

// A line is a validation guard if it is an `if (...)` whose consequent returns
// an error object. Single-line `if (cond) return { error: ... };` is the
// dominant form in this repo; also treat a bare `if (...)` line as a guard
// when the very next non-blank line returns an error.
function guardLineIndexes(lines) {
  const idx = new Set();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*if\s*\(/.test(l) && /return\s*\{\s*error/.test(l)) { idx.add(i); continue; }
    if (/^\s*if\s*\(/.test(l)) {
      // multi-line guard: next non-blank line returns an error
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && /^\s*return\s*\{\s*error/.test(lines[j])) { idx.add(i); }
    }
  }
  return idx;
}

// Read a brace-balanced `{ ... }` destructure starting at the `{` index.
function readBalanced(src, openIdx, open = "{", close = "}") {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) { depth--; if (depth === 0) return src.slice(openIdx + 1, i); }
  }
  return null;
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

// Split on TOP-LEVEL commas only (ignore commas inside (), [], {}, and strings).
function splitTopLevel(s) {
  const parts = [];
  let depth = 0, cur = "", q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q && s[i - 1] !== "\\") q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; cur += c; continue; }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

// The local binding name of a destructure part: `a` / `a = 1` -> a;
// `orig: alias` / `orig: alias = 1` -> alias (the name the body actually uses).
function bindingName(part) {
  let p = part.split("=")[0].trim();      // drop default
  if (p.includes(":")) p = p.split(":")[1].trim(); // rename -> local name
  return p;
}

function extractFunctions(src) {
  const out = [];
  const re = /export function (compute\w+)\(\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const braceIdx = src.indexOf("{", m.index + m[0].length - 1);
    const destructure = readBalanced(src, braceIdx);
    if (destructure == null) continue;
    const start = braceIdx + destructure.length + 2;
    const nextExp = src.indexOf("\nexport ", start);
    const body = src.slice(start, nextExp === -1 ? start + 8000 : nextExp);
    const params = splitTopLevel(stripComments(destructure))
      .map(bindingName)
      .filter((p) => p && /^[A-Za-z_$][\w$]*$/.test(p));
    out.push({ fn: m[1], params, body });
  }
  return out;
}

const errors = [];
let checked = 0;

const files = (await readdir(ROOT))
  .filter((f) => f.startsWith("calc-") && f.endsWith(".js"))
  .sort();

for (const file of files) {
  const src = await readFile(resolve(ROOT, file), "utf8");
  for (const { fn, params, body } of extractFunctions(src)) {
    const lines = body.split("\n");
    const guardIdx = guardLineIndexes(lines);
    for (const param of params) {
      checked++;
      // Find a coerced alias: `const ALIAS = Number(param ...)`.
      const aliasM = body.match(
        new RegExp("const\\s+(\\w+)\\s*=\\s*Number\\(\\s*" + param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b"),
      );
      const alias = aliasM ? aliasM[1] : null;
      const names = alias ? [param, alias] : [param];

      let realUses = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const refsName = names.some((n) => new RegExp("\\b" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(line));
        if (!refsName) continue;
        if (guardIdx.has(i)) continue; // guard line: not a real use
        // The coercion declaration `const ALIAS = Number(param)` is not a real use.
        if (alias && new RegExp("const\\s+" + alias + "\\s*=\\s*Number\\(").test(line) &&
            new RegExp("\\b" + param + "\\b").test(line)) continue;
        realUses++;
      }
      if (realUses === 0 && !allowed.has(file + "::" + fn + "::" + param)) {
        errors.push(
          file + ": " + fn + " parameter '" + param + "' is referenced only in a validation guard / coercion, " +
          "never in a returned value (guard-only dead input). Use it, remove it, or add a reviewed allowlist entry.",
        );
      }
    }
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error("ERROR: " + e);
  console.error("check-guard-only-inputs FAILED with " + errors.length + " guard-only dead input(s).");
  process.exit(1);
}
console.log(
  "check-guard-only-inputs OK: " + checked + " compute parameters swept; no unallowlisted guard-only dead inputs (" +
  allowlist.entries.length + " reviewed allowlist entries).",
);
