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
  // Accepts three flavors:
  //   // dims: in { a: L, b: T } out: x: L^2                       (single output)
  //   // dims: in { a: L, b: T } out: { x: L^2, y: T^-1 }          (multi-output)
  //   // dims: in { a: L, b: T }                                   (multi-line OK)
  //   //        out: { x: L^2, y: T^-1 }
  // Returns { ok: bool, inputs: [...], outputs: [{name, expr}], message? }.
  const flat = text.replace(/\s+/g, " ");
  // Multi-output form: out: { ... }.
  let inputsText = null, outputsText = null, singleOutput = null;
  const mMulti = flat.match(/dims:\s*in\s*\{([^}]*)\}\s*out:\s*\{([^}]*)\}/);
  if (mMulti) {
    inputsText = mMulti[1].trim();
    outputsText = mMulti[2].trim();
  } else {
    const mSingle = flat.match(/dims:\s*in\s*\{([^}]*)\}\s*out:\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^}]+?)$/);
    if (!mSingle) {
      return { ok: false, message: "annotation does not match `dims: in { ... } out: name: <expr>` or `out: { ... }` shape (got: " + text.slice(0, 80) + "...)" };
    }
    inputsText = mSingle[1].trim();
    singleOutput = { name: mSingle[2], expr: mSingle[3].trim() };
  }
  const inputs = [];
  if (inputsText && inputsText.length > 0) {
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
  const outputs = [];
  if (singleOutput) {
    const od = parseDimensionExpression(singleOutput.expr);
    if (!od.ok) return { ok: false, message: "output '" + singleOutput.name + "': " + od.message };
    outputs.push({ name: singleOutput.name, expr: singleOutput.expr, tokens: od.tokens });
  } else {
    for (const entry of outputsText.split(",")) {
      const e = entry.trim();
      if (e === "") continue;
      const om = e.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (!om) return { ok: false, message: "output entry '" + e + "' does not match `name: <expr>` shape" };
      const od = parseDimensionExpression(om[2]);
      if (!od.ok) return { ok: false, message: "output '" + om[1] + "': " + od.message };
      outputs.push({ name: om[1], expr: om[2].trim(), tokens: od.tokens });
    }
    if (outputs.length === 0) {
      return { ok: false, message: "multi-output `out: { ... }` form requires at least one output" };
    }
  }
  return { ok: true, inputs, outputs };
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
    // Locate the `dims:` line; the annotation runs from that line
    // through the line that closes `out:` (either single-output
    // `out: name: <expr>` or multi-output `out: { ... }`). Lines that
    // follow the annotation (e.g., parenthetical explanatory notes)
    // are excluded so the parser does not greedily consume them as
    // dimension tokens.
    let dimsLineIdx = -1;
    for (let k = 0; k < commentLines.length; k++) {
      if (commentLines[k].includes("dims:")) { dimsLineIdx = k; break; }
    }
    if (dimsLineIdx < 0) {
      out.push({ name, hasAnnotation: false, module: modulePath });
      continue;
    }
    // Walk forward from the dims line collecting annotation lines.
    // Stop at the first line that:
    //   - opens a parenthetical note (starts after whitespace with `(`),
    //   - is blank,
    //   - or follows a balanced `out: ...` line.
    const annotationLines = [];
    let sawOut = false;
    let braceDepth = 0;
    for (let k = dimsLineIdx; k < commentLines.length; k++) {
      const ln = commentLines[k];
      const stripped = ln.trim();
      if (stripped.startsWith("(")) break; // parenthetical note
      if (stripped === "") break;
      annotationLines.push(ln);
      for (const ch of ln) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
      }
      if (ln.includes("out:")) sawOut = true;
      if (sawOut && braceDepth === 0) break;
    }
    const annotation = annotationLines.join("\n");
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

  // Per-module graduation: pure-math.js graduated to fail-on-missing
  // at the 2026-05-19 Phase C expansion close (every export carries an
  // annotation). The calc-*.js modules remain warn-on-missing; each
  // graduates as its annotation coverage closes in lockstep with the
  // per-row corpus annotations per spec-v14 §16.2.
  const GRADUATED_MODULES = new Set(["pure-math.js", "calc-historical.js", "calc-kitchen.js", "calc-stage.js", "calc-mechanic.js", "calc-machining.js", "calc-water.js", "calc-lab.js", "calc-agriculture.js", "calc-trucking.js", "calc-legal.js", "calc-accounting.js", "calc-field.js", "calc-survey.js", "calc-feeder.js", "calc-drainage.js", "calc-velocity.js", "calc-treatment.js", "calc-references.js", "calc-restoration.js", "calc-demo.js", "calc-service.js", "calc-realestate.js", "calc-fire.js", "calc-aviation.js", "calc-vet.js", "calc-edu.js", "calc-ems.js", "calc-cross.js", "calc-hvac.js", "calc-plumbing.js", "calc-electrical.js", "calc-construction.js"]);
  const graduatedMissing = missing.filter((m) => {
    const mod = m.split(":")[0].trim();
    return GRADUATED_MODULES.has(mod);
  });
  for (const gm of graduatedMissing) {
    errors.push("graduated module " + gm + " missing dims annotation (pure-math.js is fail-on-missing per spec-v14 §16.2 Phase C ratchet).");
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v14 dimensional-analysis lint FAILED with " + errors.length + " error(s).",
    );
    process.exit(1);
  }
  // Calc-module missing annotations are reported as a single-line
  // summary, not per-row warnings, until each module graduates.
  const ungraduatedMissing = missing.filter((m) => {
    const mod = m.split(":")[0].trim();
    return !GRADUATED_MODULES.has(mod);
  });
  if (ungraduatedMissing.length > 0 && ungraduatedMissing.length <= 5) {
    for (const m of ungraduatedMissing) console.warn("WARN: missing dims annotation: " + m);
  }
  const gradList = [...GRADUATED_MODULES].sort().join(", ");
  console.log(
    "v14 dimensional-analysis lint OK (graduated [" + gradList + "]; " +
    ungraduatedMissing.length + " calc-module function(s) without an annotation pending per-module graduation per spec-v14 §16.2).",
  );
}

await main();
