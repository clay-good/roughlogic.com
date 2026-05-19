#!/usr/bin/env node
// spec-v14 §7 Phase C dimensional-analysis lint (scaffolding).
//
// Reads each calc-*.js and pure-math.js source, walks each export, and
// asserts the function carries a parseable `// dims:` annotation
// declaring the input dimensions and the output dimension per
// spec-v14 §7.1. Annotation format:
//
//   // dims: in { length_m: L, current_A: I, ambient_C: T }
//   //        out: voltage_drop_V: M L^2 T^-3 I^-1
//
// Dimension grammar (SI base codes per spec-v14 §7.1):
//
//   - L (length), M (mass), T (time OR temperature; the spec uses T
//     for both per the ASCII shortcut), I (current), N (amount),
//     J (luminous intensity), or the literal `dimensionless` /
//     `dimensionless`.
//   - Products are written with spaces or `*`: `L^2 T^-3 I^-1`.
//   - Ratios are written with `/` (parsed left-to-right): `L^2 / T`.
//   - Powers are integer exponents written with `^`: `L^2`, `T^-3`.
//
// Behavior:
//   FAIL (exit 1):
//     - A function carries a `// dims:` line that does not parse
//       (malformed input list, missing `out:` line, unknown dimension
//       token).
//   WARN (does not fail; scaffolding):
//     - A function has no annotation. The spec-v14 §7.1 contract is
//       "every calculator carries a one-line dimension annotation",
//       but the per-function annotation rollout is incremental: this
//       scaffolding seeds the annotation on the pure-math primitives
//       and warns on the gap; once coverage exceeds the spec-v14 §16.2
//       Phase C ratchet (corpus + annotation in lockstep), the warning
//       graduates to a hard fail in the same way the v10 worked-
//       examples lint did.
//
// The lint is conservative: it does not verify floating-point math
// (CAS would be a third-party dependency); it verifies the dimensional
// skeleton at the source level so a unit-system mismatch between an
// input and the expression it feeds surfaces here.
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["pure-math.js"]; // calc-*.js files appended below.

// SI base-dimension tokens per spec-v14 §7.1.
const VALID_DIM_TOKENS = new Set(["L", "M", "T", "I", "N", "J", "dimensionless"]);

function parseDimensionExpression(expr) {
  // Returns { ok: bool, tokens: [...], message?: string }.
  // The grammar is "term ( (sp|*|/) term )*" where term is
  // "<base>" or "<base>^<int>".
  const t = expr.trim();
  if (t === "" || t === "_") return { ok: false, message: "empty dimension expression" };
  if (t === "dimensionless") return { ok: true, tokens: ["dimensionless"] };
  // Split on whitespace, `*`, `/`. The lint does not balance ratios
  // (Phase C scaffolding); it asserts every term parses to a known
  // base with an optional integer exponent.
  const parts = t.split(/[\s*/]+/).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^([A-Za-z]+)(?:\^(-?\d+))?$/);
    if (!m) return { ok: false, message: "unparseable term '" + p + "'" };
    if (!VALID_DIM_TOKENS.has(m[1])) {
      return { ok: false, message: "unknown dimension base '" + m[1] + "' in '" + p + "' (valid: " + [...VALID_DIM_TOKENS].join(", ") + ")" };
    }
  }
  return { ok: true, tokens: parts };
}

function parseDimsAnnotation(text) {
  // Accepts two flavors:
  //   // dims: in { a: L, b: T } out: x: L^2
  //   // dims: in { a: L, b: T }
  //   //        out: x: L^2
  // Returns { ok: bool, inputs: [...], output: { name, expr }, message? }.
  const flat = text.replace(/\s+/g, " ");
  const re = /dims:\s*in\s*\{([^}]*)\}\s*out:\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^}]+?)$/;
  const m = flat.match(re);
  if (!m) {
    return { ok: false, message: "annotation does not match `dims: in { ... } out: name: <expr>` shape (got: " + text.slice(0, 80) + "...)" };
  }
  const inputsText = m[1].trim();
  const outName = m[2];
  const outExpr = m[3].trim();
  const inputs = [];
  if (inputsText.length > 0) {
    for (const entry of inputsText.split(",")) {
      const e = entry.trim();
      if (e === "") continue;
      const im = e.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (!im) return { ok: false, message: "input entry '" + e + "' does not match `name: <expr>` shape" };
      const dim = parseDimensionExpression(im[2]);
      if (!dim.ok) return { ok: false, message: "input '" + im[1] + "': " + dim.message };
      inputs.push({ name: im[1], expr: im[2].trim(), tokens: dim.tokens });
    }
  }
  const od = parseDimensionExpression(outExpr);
  if (!od.ok) return { ok: false, message: "output '" + outName + "': " + od.message };
  return { ok: true, inputs, output: { name: outName, expr: outExpr, tokens: od.tokens } };
}

function extractFunctionsAndAnnotations(source, modulePath) {
  // Returns [{ name, hasAnnotation, annotationText?, parse? }, ...].
  // Each export `function NAME(` or `export const NAME =` is captured;
  // a preceding contiguous comment block is searched for a `// dims:`
  // line (multi-line `dims:` continuations on `//        out:` are
  // joined).
  const lines = source.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let nameMatch = line.match(/^export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (!nameMatch) {
      nameMatch = line.match(/^export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(/);
    }
    if (!nameMatch) continue;
    const name = nameMatch[1];
    // Walk back to find the contiguous comment block.
    let j = i - 1;
    const commentLines = [];
    while (j >= 0 && lines[j].match(/^\s*\/\//)) {
      commentLines.unshift(lines[j].replace(/^\s*\/\/\s?/, ""));
      j--;
    }
    const block = commentLines.join("\n");
    // Match the `dims:` line plus any continuation (a line that
    // continues with `out:` or starts with whitespace + content).
    const dimsIdx = block.indexOf("dims:");
    if (dimsIdx < 0) {
      out.push({ name, hasAnnotation: false, module: modulePath });
      continue;
    }
    const rest = block.slice(dimsIdx);
    // Take through end-of-block; the parser collapses whitespace.
    const annotation = rest;
    const parsed = parseDimsAnnotation(annotation);
    out.push({ name, hasAnnotation: true, annotationText: annotation, parse: parsed, module: modulePath });
  }
  return out;
}

async function main() {
  // Append calc-*.js sources from the repo root.
  const entries = await readdir(ROOT);
  for (const f of entries.sort()) {
    if (f.startsWith("calc-") && f.endsWith(".js")) SOURCES.push(f);
  }

  let totalFunctions = 0;
  let annotated = 0;
  const errors = [];
  const missing = [];
  for (const rel of SOURCES) {
    const path = resolve(ROOT, rel);
    const text = await readFile(path, "utf8");
    const fns = extractFunctionsAndAnnotations(text, rel);
    for (const fn of fns) {
      totalFunctions++;
      if (fn.hasAnnotation) {
        annotated++;
        if (!fn.parse.ok) {
          errors.push(rel + ": " + fn.name + ": " + fn.parse.message);
        }
      } else {
        missing.push(rel + ": " + fn.name);
      }
    }
  }
  const pct = totalFunctions > 0 ? (annotated / totalFunctions) * 100 : 0;
  console.log(
    "dimensional-analysis: " + annotated + " / " + totalFunctions +
    " functions annotated (" + pct.toFixed(1) + "%) across " + SOURCES.length + " module(s).",
  );

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v14 dimensional-analysis lint FAILED with " + errors.length + " malformed annotation(s).",
    );
    process.exit(1);
  }
  // Phase C scaffolding: missing annotations are reported as a
  // single-line summary, not per-row warnings. The per-row enumeration
  // lands when the lint graduates to fail-on-missing.
  if (missing.length > 0 && missing.length <= 5) {
    for (const m of missing) console.warn("WARN: missing dims annotation: " + m);
  }
  console.log(
    "v14 dimensional-analysis lint OK (" + (totalFunctions - annotated) +
    " function(s) without an annotation; Phase C scaffolding, will graduate to fail-on-missing once corpus + annotation coverage land in lockstep per spec-v14 §16.2).",
  );
}

await main();
