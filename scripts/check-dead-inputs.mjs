#!/usr/bin/env node
// Dead compute-input lint.
//
// A calculator compute function destructures its inputs from a single object
// parameter: `export function computeFoo({ a = 0, b = 0 }) { ... }`. Every name
// in that destructuring pattern is, by construction, an input the tile collects
// from the user (the renderer's `fields` array maps one control to each key and
// passes them straight through). A destructured name that NEVER appears in the
// function body is therefore a control the user can set that the math silently
// ignores -- the worst failure mode for a field aid, because the displayed
// answer looks authoritative while a deliberately-entered input did nothing.
//
// This defect class is invisible to every other gate: the render-leak sweep
// (spec-v18 §5.4) only flags NaN/Infinity/undefined output tokens, so a
// dead input that leaves the answer finite-but-fixed passes; the dimensions
// gate only checks that the `// dims:` annotation parses; and the worked-example
// fixtures assert outputs, which by definition don't move when an ignored input
// changes. It is the static cousin of the spec-v0.83.1 trench-slope bug (a
// `surcharge ? 1.0 : 1.0` no-op factor) -- there the param was referenced but
// inertly; here it is never referenced at all.
//
// The 2026-06-26 sweep that introduced this gate removed ten such params across
// eight functions: six were live rendered fields whose controls did nothing
// (water-meter `available_loss_psi`, SRT `ras_flow_mgd`/`ras_tss_mg_l`,
// wind-pressure `roof_type`, heat-stress `wind_mph`, ev-charger
// `charger_voltage`) and four were vestigial signature/example params with no
// rendered control (economizer `changeover_db_f`/`supply_temp_f`, evaporation
// `ceiling_ft`, slope-stake `convention`).
//
// The rule: in any calc-*.js (and pure-math.js), no exported function may
// destructure an input name it never references in its body. Deterministic,
// offline, built-ins only. Wired into `npm run lint`.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(), "..");
function dirname() {
  return resolve(fileURLToPath(import.meta.url), "..");
}

// Pull the bound variable names out of a single object-destructuring parameter
// block. Handles `name`, `name = default`, and `key: bound` (the BOUND name is
// what the body uses). Skips rest elements and anything that isn't a plain
// identifier binding (nested patterns are not used by the compute functions).
function destructuredNames(paramBlock) {
  const names = [];
  let depth = 0, cur = "";
  const parts = [];
  for (const ch of paramBlock) {
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  for (const raw of parts) {
    let p = raw.trim();
    if (!p || p.startsWith("...")) continue;
    p = p.split("=")[0].trim(); // drop default
    // `key: bound` -> the body references `bound`.
    const colon = p.indexOf(":");
    if (colon >= 0) p = p.slice(colon + 1).trim();
    if (/^[A-Za-z_$][\w$]*$/.test(p)) names.push(p);
  }
  return names;
}

function findings(source) {
  const out = [];
  // `export function NAME ( { ...params } )` -- the destructured first param
  // may span lines; capture up to the closing brace of the pattern.
  const re = /export\s+function\s+([A-Za-z0-9_$]+)\s*\(\s*\{([\s\S]*?)\}\s*(?:=\s*\{\}\s*)?\)\s*\{/g;
  let m;
  while ((m = re.exec(source))) {
    const fnName = m[1];
    const params = destructuredNames(m[2]);
    if (params.length === 0) continue;
    // Brace-match the body from the opening `{` just consumed.
    const bodyStart = re.lastIndex - 1;
    let depth = 0, end = -1;
    for (let i = bodyStart; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const body = source.slice(bodyStart + 1, end);
    for (const name of params) {
      const wre = new RegExp("\\b" + name.replace(/\$/g, "\\$") + "\\b", "g");
      if (!(body.match(wre) || []).length) out.push({ fnName, name });
    }
  }
  return out;
}

async function main() {
  const files = (await readdir(ROOT)).filter((f) => /^calc-.*\.js$/.test(f) || f === "pure-math.js");
  files.sort();
  const errors = [];
  for (const file of files) {
    const src = await readFile(resolve(ROOT, file), "utf8");
    for (const f of findings(src)) {
      errors.push(`${file} :: ${f.fnName} destructures input "${f.name}" but never references it in the body (a control that silently does nothing).`);
    }
  }
  if (errors.length) {
    console.error("check-dead-inputs FAILED:");
    for (const e of errors) console.error("  - " + e);
    console.error("  Either use the input in the computation, or remove the field, its example key, and its `// dims:` entry.");
    process.exit(1);
  }
  console.log(`check-dead-inputs OK: no compute function destructures an input it never uses (${files.length} modules swept).`);
}

main().catch((e) => {
  console.error("check-dead-inputs: unexpected error", e);
  process.exit(1);
});
