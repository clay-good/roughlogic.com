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
