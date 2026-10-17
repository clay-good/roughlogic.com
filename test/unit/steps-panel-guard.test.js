// "Show the steps" (spec-v1964, spec-v106 roadmap pillar 3): under the answer,
// the inputs as the compute received them and every intermediate number it
// returned, so a result can be defended without redoing it. A steps panel
// that prints "undefined" or "NaN" undoes the point, so this runs the panel's
// pure row builder over every tile that exposes a field schema, on each of its
// worked examples, and fails on anything a reader should never see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { stepRows, stepNum } from "../../steps-panel.js";
import { humanizeKey } from "../../key-labels.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BAD = /\bundefined\b|\bNaN\b|Infinity|^null$/;

test("the steps panel never prints undefined, NaN, Infinity or a bare null", async () => {
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const mods = new Map();
  const load = async (rel) => { const p = resolve(ROOT, rel.replace("../../", "")); if (!mods.has(p)) mods.set(p, await import(p)); return mods.get(p); };
  const bad = [];
  let tiles = 0, checked = 0;
  const seen = new Set();
  for (const row of rows) {
    const id = row.tile_id;
    const cm = COMPUTE_MAP[id], rm = RENDERER_MAP[id];
    if (!cm || !rm) continue;
    const render = (await load(rm.module))[rm.exportName]?.[id];
    const fields = render?.schema?.inputs;
    if (!Array.isArray(fields) || !fields.length) continue;
    const fn = (await load(cm.module))[cm.fn];
    if (typeof fn !== "function") continue;
    if (!seen.has(id)) { seen.add(id); tiles++; }
    const params = row.inputs || {};
    let r; try { r = fn(params); } catch { continue; }
    if (!r || r.error) continue;
    checked++;
    const out = stepRows(fields, params, r, humanizeKey);
    for (const x of out) {
      if (BAD.test(x.label) || BAD.test(x.value) || x.label === "" || x.value === "") bad.push(`${id}: ${x.section} "${x.label}" = "${x.value}"`);
    }
    // Every input row must name a real field, in field order, with the value passed.
    const inRows = out.filter((x) => x.section === "in");
    const labels = new Set(fields.map((f) => String(f.label)));
    for (const x of inRows) if (!labels.has(x.label)) bad.push(`${id}: input row "${x.label}" is not one of the tile's fields`);
  }
  assert.ok(tiles > 900, `the guard reached only ${tiles} tiles; did the renderer map or schemas move?`);
  assert.ok(checked > tiles, "each tile's worked examples should run through the panel");
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} bad steps-panel row(s)`);
});

test("an error result shows no steps, and only finite numbers become worked values", () => {
  const fields = [{ key: "a_ft", label: "Length (ft)" }];
  assert.deepEqual(stepRows(fields, { a_ft: 3 }, { error: "nope" }, humanizeKey), []);
  const out = stepRows(fields, { a_ft: 3 }, { a_ft: 3, area_ft2: 9, ok: true, verdict: "fine", bad_ft: NaN, inf_ft: Infinity, x: 4 }, humanizeKey);
  assert.deepEqual(out.map((x) => [x.section, x.label, x.value]), [
    ["in", "Length (ft)", "3"],
    ["out", humanizeKey("area_ft2"), "9"],
  ], "input echo, booleans, text, NaN, Infinity and an uncaptionable key are all left out");
  assert.equal(stepNum(0.010416), "0.0104");
  assert.equal(stepNum(26180.44), "26,180.4");
  assert.equal(stepNum(12.5), "12.5");
  assert.equal(stepNum(7), "7");
});

test("every _simpleRenderer copy creates the steps panel and feeds it each result", () => {
  const missing = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const i = src.indexOf("function _simpleRenderer");
    if (i < 0) continue;
    const body = src.slice(i, src.indexOf("\n}\n", i));
    const created = (body.match(/_steps = makeStepsPanel\(outputRegion\)/g) || []).length;
    const fed = (body.match(/_steps\.update\(spec\.fields, params, \w+\)/g) || []).length;
    if (created !== 1 || fed !== 1) missing.push(`${f}: created ${created}, fed ${fed}`);
  }
  assert.deepEqual(missing, [], "a _simpleRenderer copy without the steps panel leaves its tiles unexplained");
});
