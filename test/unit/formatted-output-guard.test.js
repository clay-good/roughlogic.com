// Every declarative renderer's output line, formatted from its worked examples and from each
// example with one input blanked or zeroed, must not print "undefined", "NaN", "Infinity", or a
// bare "null". The browser check (render-no-nan) covers the same leak, but it reads the page
// after a debounce and has passed over a real leak when the update landed late: inventory-
// turnover printed "median undefinedx" from 2026-09-09 to 2026-10-08 through two green runs.
// This runs the formatters directly, so the result does not depend on timing. The same strings
// are the `display` lines the MCP door returns.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";
import { RENDERER_MAP } from "../fixtures/renderer-map.js";

const BAD = /\bnull\b|\bundefined\b|\bNaN\b|\bInfinity\b/;
// Lines where the word is the subject matter, not a leak.
const ALLOWED = /\b(?:a|no|that|the|first|each) null\b/g;

const mod = (p) => import(new URL("../" + p.replace("../../", "../"), import.meta.url));

test("formatted outputs: no declarative renderer prints undefined, NaN, Infinity, or null", async () => {
  const rows = JSON.parse(await readFile(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;
  const leaks = [];
  let checked = 0;
  for (const [id, reg] of Object.entries(RENDERER_MAP)) {
    const c = COMPUTE_MAP[id];
    if (!c) continue;
    const outs = (await mod(reg.module))[reg.exportName]?.[id]?.schema?.outputs;
    const fn = (await mod(c.module))[c.fn];
    if (!outs || typeof fn !== "function") continue;
    const variants = [];
    for (const row of rows.filter((r) => r.tile_id === id)) {
      variants.push(["example", row.inputs]);
      for (const k of Object.keys(row.inputs)) {
        const blank = { ...row.inputs };
        delete blank[k];
        variants.push(["without " + k, blank]);
        if (typeof row.inputs[k] === "number") variants.push([k + " = 0", { ...row.inputs, [k]: 0 }]);
      }
    }
    for (const [tag, inputs] of variants) {
      let r;
      try { r = fn({ ...inputs }); } catch { continue; }
      if (!r || r.error) continue;
      for (const o of outs) {
        if (typeof o.format !== "function") continue;
        let text;
        try { text = String(o.format(r)); } catch (e) { leaks.push(`${id} (${tag}) ${o.key}: formatter throws ${e.message}`); continue; }
        checked++;
        const scrubbed = text.replace(ALLOWED, "");
        const m = scrubbed.match(BAD);
        if (m) leaks.push(`${id} (${tag}) ${o.key}: ...${scrubbed.slice(Math.max(0, m.index - 50), m.index + 20)}`);
      }
    }
  }
  assert.ok(checked > 50000, "the sweep formatted only " + checked + " lines; the registry or renderer map did not load");
  assert.deepEqual([...new Set(leaks)], []);
});
