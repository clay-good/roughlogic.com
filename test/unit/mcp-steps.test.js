// spec-v1972: "Show the steps" on the agent door. run_calculator,
// run_calculators and answer_query return the website panel's rows
// (steps-panel.js stepRows), so an agent asked "why 7.45 V?" can quote the
// inputs and worked values instead of inventing a derivation. These tests
// hold the door to that promise across the whole catalog.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { run, runMany, describe, answerQuery, inputLabels } from "../../mcp/catalog.mjs";
import { stepRows } from "../../steps-panel.js";
import { humanizeKey } from "../../key-labels.js";
import { TOOLS } from "../../tools-data.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BAD = /\bundefined\b|\bNaN\b|Infinity|^null$/;

test("every tile's worked example returns steps a reader should see", async () => {
  const bad = [];
  let withRows = 0;
  for (const t of TOOLS) {
    const out = await run({ id: t.id });
    if (out.result && out.result.error) { bad.push(`${t.id}: its worked example errored`); continue; }
    if (!Array.isArray(out.steps)) { bad.push(`${t.id}: no steps array`); continue; }
    const described = await describe({ id: t.id });
    const inputs = described.inputs || [];
    // Empty steps only where the tile takes no inputs at all (the reference
    // pages): those answer from their content, so there is nothing to show.
    if (out.steps.length === 0) {
      if (inputs.length) bad.push(`${t.id}: takes ${inputs.length} input(s) but returned no steps`);
      continue;
    }
    withRows++;
    // An input row's label is the page's own caption for that field: the
    // renderer schema's label, or for a hand-written renderer the caption the
    // static shell prints (inputLabels). describe_calculator reports the same
    // label where it has one.
    const labels = new Set([...inputs.map((f) => String(f.label || "")), ...Object.values(await inputLabels(t.id))]);
    for (const s of out.steps) {
      if (s.section !== "in" && s.section !== "out") bad.push(`${t.id}: section "${s.section}"`);
      if (!s.label || !s.value || BAD.test(s.label) || BAD.test(s.value)) bad.push(`${t.id}: ${s.section} "${s.label}" = "${s.value}"`);
      if (s.section === "in" && !labels.has(s.label)) bad.push(`${t.id}: input row "${s.label}" is not one of the tile's field captions`);
    }
  }
  assert.ok(withRows > 2200, `only ${withRows} tiles returned step rows; did the door stop attaching them?`);
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} bad step(s) on the agent door`);
});

test("the door's rows are the website panel's rows for the same inputs", async () => {
  // Built independently of the door: the renderer's own schema, the compute,
  // and stepRows -- exactly what the declarative panel draws on the page.
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const firstRow = new Map();
  for (const r of rows) if (!firstRow.has(r.tile_id)) firstRow.set(r.tile_id, r);
  const candidates = TOOLS.map((t) => t.id).filter((id) => COMPUTE_MAP[id] && RENDERER_MAP[id] && firstRow.has(id));
  const stride = Math.max(1, Math.floor(candidates.length / 50));
  const mismatch = [];
  let compared = 0;
  for (let i = 0; i < candidates.length && compared < 50; i += stride) {
    const id = candidates[i];
    const cm = COMPUTE_MAP[id], rm = RENDERER_MAP[id];
    const render = (await import(resolve(ROOT, rm.module.replace("../../", ""))))[rm.exportName]?.[id];
    const fields = render?.schema?.inputs;
    if (!Array.isArray(fields) || !fields.length) continue;
    const fn = (await import(resolve(ROOT, cm.module.replace("../../", ""))))[cm.fn];
    const inputs = firstRow.get(id).inputs || {};
    const page = stepRows(fields, inputs, fn({ ...inputs }), humanizeKey);
    const door = (await run({ id, inputs })).steps;
    compared++;
    try { assert.deepEqual(door, page); } catch { mismatch.push(id); }
  }
  assert.ok(compared >= 30, `only ${compared} declarative tiles compared`);
  assert.deepEqual(mismatch, [], "the agent door's steps differ from the website panel's");
});

test("an error result carries no steps", async () => {
  const out = await run({ id: "voltage-drop", inputs: { phase: "single", material: "copper", awg: "10", length_ft: -5, current_A: 20, source_voltage_V: 240 } });
  assert.ok(out.result.error);
  assert.equal("steps" in out, false);
});

test("voltage-drop's steps name the inputs and the 7.45 V drop", async () => {
  const out = await run({ id: "voltage-drop", inputs: { phase: "single", material: "copper", awg: "10", length_ft: 150, current_A: 20, source_voltage_V: 240 } });
  const ins = out.steps.filter((s) => s.section === "in").map((s) => [s.label, s.value]);
  assert.deepEqual(ins.find(([l]) => l === "Length one-way (ft)"), ["Length one-way (ft)", "150"]);
  assert.deepEqual(ins.find(([l]) => l === "Material"), ["Material", "Copper"], "a select prints the option text");
  assert.ok(out.steps.some((s) => s.section === "out" && s.value === "7.454"));
});

test("answer_query and run_calculators carry the steps too", async () => {
  const a = await answerQuery({ query: "voltage drop single phase copper 10 awg 150 ft 20 a 240 v" });
  assert.equal(a.status, "OK");
  assert.ok(Array.isArray(a.steps) && a.steps.length > 0);
  const m = await runMany({ calls: [{ id: "ohms-law" }, { id: "no-such-tile" }] });
  assert.ok(Array.isArray(m.results[0].steps) && m.results[0].steps.length > 0);
  assert.equal("steps" in m.results[1], false);
});
