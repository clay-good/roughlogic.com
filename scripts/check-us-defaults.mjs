#!/usr/bin/env node
// spec-v593 US-customary-defaults lint (the 30th gate).
//
// "US standards only" appears in every spec header since v106; this gate
// turns the units half of that line into an enforced invariant. It
// static-scans every calc-*.js renderer source for the regression class
// the 2026-07-10 full-catalog audit actually found:
//
//   1. Metric-defaulted unit selects: a makeSelect option list whose
//      DEFAULT option (selected: true, else the first option) carries a
//      metric token while a sibling option is the US counterpart.
//   2. Metric-labeled fields: a make* field label whose parenthetical
//      unit matches the metric denylist -- "(m)", "(deg C)", "(kPa)" --
//      without a matching allowlist entry. Input labels, factory `label:`
//      properties, AND the output labels makeOutputLine takes after its
//      region argument -- the last of those was claimed by this header and
//      not actually scanned until 2026-09-04.
//
// The allowlist (scripts/us-defaults-allowlist.json) codifies the spec
// §2 exception class: metric that IS US trade practice (NEC deg C
// columns, kW/kWh billing, mg/L water ops, product-spec mm, SI-defined
// standards, lab practice). Additions are reviewed against the §2 acid
// test: would a US tradesperson read this number in this unit off their
// own instrument, code table, or product label?
//
// Honest scope: a label-token heuristic. It catches metric-labeled
// fields and metric-defaulted selects; it cannot prove semantic
// correctness of default VALUES (the wallpaper-rolls Euro-size case is
// review's job). No network. No mutation. Pure read-and-report.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const allowlist = JSON.parse(
  await readFile(resolve(ROOT, "scripts", "us-defaults-allowlist.json"), "utf8"),
);

// Parenthetical unit tokens that read metric-first to a US tradesperson.
// Matched against each comma/slash-separated part of a label parenthetical.
const METRIC_LABEL_TOKENS = new Set([
  "m", "km", "cm", "mm", "kg", "g", "c", "deg c", "degrees c",
  "kpa", "hpa", "mbar", "bar", "l", "l/min", "ml", "m3", "m^3",
  "m/s", "m2", "m^2", "km/h", "kph", "meters", "metres",
  // Superscript / degree spellings of the same units, so the labels that
  // now read "m²" and "°C" stay as visible to this gate as "m^2" and "C".
  "m²", "m³", "°c", "degc",
]);

// Select-default detection: metric token in the defaulted option's
// label/value with a US counterpart among its siblings.
const METRIC_OPTION_RE = /\b(celsius|kilometres|kilometers|metres|meters|deg c)\b/i;
const US_OPTION_RE = /\b(fahrenheit|miles|feet|deg f)\b/i;

// An entry exempts a hit when its module matches and its token appears in the
// hit. A blanket module-wide exemption is spelled "*" and must name a module --
// it used to be spelled by accident, as an empty `match`, because
// `hit.includes("")` is always true. One row did exactly that and switched the
// whole check off for calc-lab.js while reading, in a list of 71, like one more
// token exemption. Blanket is a legitimate answer for a module that is SI by
// professional practice; it just has to be said out loud.
for (const e of allowlist.entries) {
  if (typeof e.match !== "string" || e.match === "") {
    console.error(
      'FAIL: us-defaults allowlist entry for ' + e.module + ' has an empty `match`, which exempts every ' +
      'label in scope. Use "*" for a deliberate module-wide exemption.',
    );
    process.exit(1);
  }
  if (e.match === "*" && e.module === "*") {
    console.error('FAIL: us-defaults allowlist entry with module "*" and match "*" would exempt the whole catalog.');
    process.exit(1);
  }
}

const used = new Set();
function allowed(file, hit) {
  let any = false;
  for (const e of allowlist.entries) {
    if ((e.module === "*" || e.module === file) &&
        (e.match === "*" || hit.toLowerCase().includes(e.match.toLowerCase()))) {
      used.add(e);
      any = true;
    }
  }
  return any;
}

// Extract the source text of every `name(...)` call, balancing parens.
function calls(src, name) {
  const out = [];
  let idx = 0;
  while ((idx = src.indexOf(name + "(", idx)) !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = idx + name.length; i < src.length; i++) {
      const ch = src[i];
      if (ch === "(") depth++;
      else if (ch === ")") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) break;
    out.push({ text: src.slice(idx, end + 1), line: src.slice(0, idx).split("\n").length });
    idx = end + 1;
  }
  return out;
}

const errors = [];
const files = (await readdir(ROOT)).filter((f) => /^calc-[a-z0-9-]+\.js$/.test(f)).sort();

for (const file of files) {
  const src = await readFile(resolve(ROOT, file), "utf8");

  // Rule 1: metric-defaulted selects.
  for (const call of calls(src, "makeSelect")) {
    const options = [...call.text.matchAll(/\{[^{}]*\}/g)].map((m) => m[0]);
    if (options.length < 2) continue;
    const defaulted = options.find((o) => /selected:\s*true/.test(o)) || options[0];
    if (METRIC_OPTION_RE.test(defaulted) && options.some((o) => o !== defaulted && US_OPTION_RE.test(o))) {
      if (!allowed(file, call.text)) {
        errors.push(
          file + ":" + call.line + ": makeSelect defaults to a metric option (" +
          (defaulted.match(METRIC_OPTION_RE) || [])[0] + ") while a US sibling option exists.",
        );
      }
    }
  }

  // Rule 2: metric-labeled fields -- both direct make* calls and factory
  // field specs / output specs, whose labels live in `label: "..."`
  // properties.
  function checkLabel(labelText, line, kind) {
    for (const paren of labelText.matchAll(/\(([^()]*)\)/g)) {
      // "430.32(C)" and "220.61(C)" are code-section subdivisions, not degrees
      // Celsius. A parenthetical butted straight against a digit is a citation.
      if (/\d$/.test(labelText.slice(0, paren.index))) continue;
      const parts = paren[1].split(/[,/;]/).map((p) => p.trim().toLowerCase());
      // "(A/B/C)" is the three phases and "(A / B / C)" is a triangle's
      // vertices. A bare "c" alongside other bare letters is a label, not a unit.
      if (parts.length > 1 && parts.every((pp) => /^[a-z]$/.test(pp))) continue;
      const hit = parts.find((p) => METRIC_LABEL_TOKENS.has(p));
      if (hit && !allowed(file, labelText)) {
        errors.push(
          file + ":" + line + ": " + kind + " label \"" + labelText +
          "\" carries metric unit token \"" + hit + "\" with no allowlist entry.",
        );
        return;
      }
    }
  }
  // Any call shaped fn("Label ...", "dom-id", ...) is a field builder --
  // this catches makeNumber and every per-module alias (_mnF,
  // _v7makeNumber, ...) without maintaining an alias list.
  for (const m of src.matchAll(/\w+\(\s*"((?:[^"\\]|\\.)*)",\s*"[a-z0-9][a-z0-9_-]*"/g)) {
    checkLabel(m[1], src.slice(0, m.index).split("\n").length, "field");
  }
  for (const m of src.matchAll(/label:\s*"((?:[^"\\]|\\.)*)"/g)) {
    checkLabel(m[1], src.slice(0, m.index).split("\n").length, "field-spec");
  }
  // Output labels reach makeOutputLine AFTER the region argument, so the
  // field-builder pattern above -- which requires the string literal right
  // after the open paren -- never matched one. The gate's own header claims it
  // covers output specs, and it did cover the factory `label:` form; ten
  // region-first output labels carrying a metric token were invisible to it.
  for (const m of src.matchAll(
    /(\w*[Oo]utput\w*)\(\s*[A-Za-z_$][\w$.]*\s*,\s*"((?:[^"\\]|\\.)*)"\s*,/g,
  )) {
    checkLabel(m[2], src.slice(0, m.index).split("\n").length, "output");
  }
}

// An exemption that waives nothing is not a reviewed exception, it is a claim
// nobody can check -- and this file's header says entries are reviewed like
// citations. On 2026-09-04 seven of 73 matched no finding at all: four named a
// token combination the scanner can never produce ("uS/cm" splits to
// "us" + "cm at 25 c", neither a token), and three papered over false positives
// fixed properly in the same change. Fail on a dead entry so the list stays
// exactly as large as the exceptions it actually grants.
for (const e of allowlist.entries) {
  if (!used.has(e)) {
    errors.push(
      "us-defaults allowlist entry " + (e.module || "*") + " match=" + JSON.stringify(e.match) +
      " waives nothing: no label in the catalog is both flagged and matched by it. Remove it, " +
      "or fix the `match` string to the label it was written for.",
    );
  }
}

if (errors.length) {
  console.error("check-us-defaults: " + errors.length + " issue(s):");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  "check-us-defaults OK: " + files.length + " calc modules scanned; no metric-defaulted selects, " +
  "no unallowlisted metric input, field-spec or output label (" + allowlist.entries.length +
  " reviewed allowlist entries, every one of them waiving at least one live finding, " +
  allowlist.entries.filter((e) => e.match === "*").length + " of them module-wide).",
);
