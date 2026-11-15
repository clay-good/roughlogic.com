// The compute-side half of typed-zero.test.js. That test traces what a page
// PASSES; the agent door calls computes directly, so a compute that reads 0 as
// "not given" (`Number(x) || 1`, `Math.max(1, Math.round(x))`) answers a
// question nobody asked. For every input of every tile's first worked-example
// row whose declared default is not 0: if passing 0 gives the same answer as
// omitting the input, while the row's own value gives a different one, 0 was
// swallowed into the default. Three were (service factor, snow events, walkway
// applications) on 2026-11-15, after a dozen more found through the page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";

const ROWS = JSON.parse(readFileSync(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;
const strip = (r) => JSON.stringify(r, (k, v) => (k === "note" || k === "notes" || k === "warnings" ? undefined : typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v));

test("compute zero default: no compute reads a passed 0 as its nonzero default", async () => {
  const first = new Map();
  for (const r of ROWS) if (!first.has(r.tile_id)) first.set(r.tile_id, r.inputs);
  const swallowed = [];
  let probed = 0;
  for (const [id, inputs] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const fn = (await import(new URL(reg.module, new URL("../fixtures/", import.meta.url)).href))[reg.fn];
    if (typeof fn !== "function") continue;
    const src = fn.toString();
    const sig = src.slice(0, src.indexOf(")") + 1);
    for (const [k, v] of Object.entries(inputs)) {
      if (typeof v !== "number" || v === 0) continue;
      const m = new RegExp("\\b" + k + "\\s*=\\s*(-?[\\d.]+)\\b").exec(sig);
      if (!m || Number(m[1]) === 0) continue;
      const omitted = { ...inputs };
      delete omitted[k];
      let a, z, base;
      try { a = fn(omitted); z = fn({ ...inputs, [k]: 0 }); base = fn(inputs); } catch { continue; }
      if (!a || a.error || !z || z.error || !base || base.error) continue;
      probed++;
      if (strip(a) !== strip(base) && strip(z) === strip(a)) swallowed.push(`${id}.${k} (default ${m[1]})`);
    }
  }
  assert.ok(probed > 300, `only ${probed} inputs probed`);
  assert.deepEqual(swallowed, [], 'refuse a 0 the compute cannot use (`if (k != null && k !== "" && !(Number(k) > 0)) return { error }`) instead of reading it as the default');
});

// The probe above sees only inputs a first fixture row sets. This reads the
// source: every `const x = Number(param) || <nonzero>;` must have a guard on
// that param earlier in the same function, so a passed 0 is refused rather than
// read as the default. Ten more were found this way on 2026-11-15.
const ZERO_MEANS_UNSET = new Map([
  ["calc-lowvoltage.js:derate_per_c", "a blank or zero coefficient means 'not entered' (the line says so); no cable has a zero de-rate"],
  ["calc-lowvoltage.js:panel_min_output_v", "the field says 'enter 0 to use 85% of nominal'; negatives are refused above it"],
  ["calc-openchannel.js:contraction_coeff", "declared default 0 = use the standard 0.61"],
  ["calc-openchannel.js:discharge_coeff", "declared default 0 = use the standard 0.9"],
  ["calc-plumbing.js:system_pressure_psi", "optional (declared default 0); blank or 0 assumes a 60 psi system"],
  ["calc-openchannel.js:coeff", "a weir coefficient of 0 (the declared default) means 'use the standard coefficient for this weir type'"],
]);

test("compute zero default: every `Number(param) || nonzero` is guarded or reviewed", async () => {
  const { readdirSync } = await import("node:fs");
  const root = new URL("../../", import.meta.url);
  const bad = [];
  for (const f of readdirSync(root).filter((n) => /^calc-.*\.js$/.test(n))) {
    const lines = readFileSync(new URL(f, root), "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = /= Number\(([a-z_][a-z0-9_]*)\) \|\| [0-9.]*[1-9][0-9.]*;/.exec(line)
        || /= (?:Number\()?([a-z_][a-z0-9_]*)\)? > 0 \? (?:Number\()?\1\)? : (?:[0-9.]*[1-9]|0\.\d+ \*)/.exec(line)
        || (/\.value\b/.test(line) ? null : /\(Number\(([a-z_][a-z0-9_]*)\) \|\| [0-9.]*[1-9][0-9.]*\)/.exec(line));
      if (!m) return;
      const p = m[1];
      let start = i;
      while (start > 0 && !/^export function /.test(lines[start])) start--;
      const above = lines.slice(start, i).join("\n");
      if (new RegExp("\\bif \\([^\\n]*\\b" + p + "\\b[^\\n]*\\) return \\{ error").test(above)) return;
      if (ZERO_MEANS_UNSET.has(f + ":" + p)) return;
      bad.push(`${f}:${i + 1} ${p}`);
    });
  }
  assert.deepEqual(bad, [], "guard the param above the line, or add it to ZERO_MEANS_UNSET with the reason 0 means unset");
});

// The negative twin: `Math.max(0, Number(param) || 0)` turned a typed -4 cameras
// into 0 cameras without a word (16 inputs until 2026-11-15). A clamp on a
// caller's own input needs a guard that refuses the negative first.
test("compute zero default: no input is clamped from negative to 0 without a guard", async () => {
  const { readdirSync } = await import("node:fs");
  const root = new URL("../../", import.meta.url);
  const bad = [];
  for (const f of readdirSync(root).filter((n) => /^calc-.*\.js$/.test(n))) {
    const lines = readFileSync(new URL(f, root), "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = /= Math\.max\(0, Number\(([a-z_][a-z0-9_]*)\) \|\| 0\);/.exec(line);
      if (!m) return;
      let start = i;
      while (start > 0 && !/^export function /.test(lines[start])) start--;
      if (new RegExp("\\bif \\([^\\n]*\\b" + m[1] + "\\b[^\\n]*\\) return \\{ error").test(lines.slice(start, i).join("\n"))) return;
      bad.push(`${f}:${i + 1} ${m[1]}`);
    });
  }
  assert.deepEqual(bad, [], 'refuse the negative above the clamp: `if (Number(p) < 0) return { error: "... cannot be negative." }`');
});

// And rounding: `Math.round(Number(param))` read 2.6 phases as 3 and year 3.5 as
// year 3 (five inputs until 2026-11-15). Rounding a caller's own input needs a
// guard on that input earlier in the function (an isInteger check or a refusal).
const ROUNDING_REVIEWED = new Set([
  "calc-edu.js:n", // the significant-figures helper's digit count, not a caller input
  "calc-agriculture.js:small_end_dib_in", // Scribner scaling reads the small-end diameter to the nearest inch, as scalers do
]);

test("compute zero default: no input is rounded silently", async () => {
  const { readdirSync } = await import("node:fs");
  const root = new URL("../../", import.meta.url);
  const bad = [];
  for (const f of readdirSync(root).filter((n) => /^calc-.*\.js$/.test(n))) {
    const lines = readFileSync(new URL(f, root), "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = /= Math\.(?:round|floor|ceil|trunc)\((?:Number\()?([a-z_][a-z0-9_]*)\)?\)?;/.exec(line);
      if (!m) return;
      let start = i;
      while (start > 0 && !/^export function /.test(lines[start])) start--;
      if (start === 0 && !/^export function /.test(lines[0])) return;
      const sig = lines.slice(start, start + 8).join("\n").split(") {")[0];
      if (!new RegExp("\\b" + m[1] + "\\b").test(sig)) return; // a local, not a caller input
      const body = lines.slice(start, i + 5).join("\n");
      // Only a check on the RAW input counts: an isInteger on it, or an exact comparison
      // of it with the rounded value. A range check on the rounded value does not.
      if (new RegExp("isInteger\\((?:Number\\()?" + m[1] + "\\b|Math\\.abs\\(Number\\(" + m[1] + "\\) - ").test(body)) return;
      if (ROUNDING_REVIEWED.has(f + ":" + m[1])) return;
      bad.push(`${f}:${i + 1} ${m[1]}`);
    });
  }
  assert.deepEqual(bad, [], "refuse a non-integer input (`Number.isInteger(Number(p))`) instead of rounding it");
});

// Absolute zero: 157 temperature inputs answered -500 F until 2026-11-15. The
// shared _finiteGuard now refuses a temperature-named key below absolute zero;
// differences (delta, rise, CLTD, change) are exempt by name.
test("compute zero default: no absolute temperature input answers below absolute zero", async () => {
  const first = new Map();
  for (const r of ROWS) if (!first.has(r.tile_id)) first.set(r.tile_id, r.inputs);
  const bad = [];
  for (const [id, inputs] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const fn = (await import(new URL(reg.module, new URL("../fixtures/", import.meta.url)).href))[reg.fn];
    if (typeof fn !== "function") continue;
    for (const [k, v] of Object.entries(inputs)) {
      if (typeof v !== "number") continue;
      const isF = /(_f|_degf|temp_?f)$/i.test(k) && !/delta|_dt_|_dt$|rise|drop|diff|offset|range|toleran|margin|per_|gradient|change|cltd|_td_|_td$|swing|span/i.test(k);
      if (!isF) continue;
      let r; try { r = fn({ ...inputs, [k]: -500 }); } catch { continue; }
      if (r && !r.error) bad.push(`${id}.${k}`);
    }
  }
  assert.deepEqual(bad, [], "call the module's _finiteGuard(arguments[0]) first; it refuses a temperature below -459.67 F");
});
