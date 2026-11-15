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
        || /= (?:Number\()?([a-z_][a-z0-9_]*)\)? > 0 \? (?:Number\()?\1\)? : (?:[0-9.]*[1-9]|0\.\d+ \*)/.exec(line);
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
