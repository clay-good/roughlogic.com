// spec-v1184: the MCP catalog exposes renderer field schemas (select options,
// labels, units-in-label, min/max) and validates enums on run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, run, runMany } from "../../mcp/catalog.mjs";

test("describe exposes select options for a schema-covered tile", async () => {
  const d = await describe({ id: "pull-box-sizing" });
  assert.equal(d.inputs_source, "renderer");
  const pt = d.inputs.find((i) => i.key === "pull_type");
  assert.ok(pt, "pull_type field present");
  assert.equal(pt.kind, "select");
  const values = pt.options.map((o) => o.value);
  assert.deepEqual(values, ["straight", "angle"]);
  // Outputs are exposed with their human labels.
  assert.ok(Array.isArray(d.outputs) && d.outputs.length > 0);
  assert.ok(d.outputs.every((o) => typeof o.key === "string" && typeof o.label === "string"));
});

test("run rejects an out-of-set enum, naming the allowed values", async () => {
  await assert.rejects(
    () => run({ id: "pull-box-sizing", inputs: { pull_type: "diagonal", largest_raceway_in: 3, other_raceways_in: 0 } }),
    (e) => {
      assert.match(e.message, /pull_type/);
      assert.match(e.message, /"straight"/);
      assert.match(e.message, /"angle"/);
      return true;
    },
  );
});

test("run accepts a valid enum and computes", async () => {
  const r = await run({ id: "pull-box-sizing", inputs: { pull_type: "angle", largest_raceway_in: 3, other_raceways_in: 2 } });
  assert.equal(r.result.angle_min, 20); // 6*3 + 2
  assert.equal(r.result.governing, 20);
});

test("run renders outputs with the display string a person sees (spec-v1189)", async () => {
  const r = await run({ id: "pull-box-sizing", inputs: { pull_type: "straight", largest_raceway_in: 3, other_raceways_in: 0 } });
  assert.ok(Array.isArray(r.outputs));
  const g = r.outputs.find((o) => o.key === "g");
  assert.equal(g.display, "24.0 in (straight pull)");
  assert.equal(g.label, "Minimum box dimension");
  // The raw result stays authoritative alongside the rendered view.
  assert.equal(r.result.governing, 24);
});

test("describe outputs carry label + unit but never leak the format closure", async () => {
  const d = await describe({ id: "pull-box-sizing" });
  assert.ok(d.outputs.every((o) => typeof o.label === "string" && !("format" in o)));
});

test("a bespoke-renderer tile has no rendered outputs and does not crash", async () => {
  const r = await run({ id: "voltage-drop" });
  assert.ok(!("outputs" in r));
  assert.ok(r.result && typeof r.result === "object");
});

test("run warns on an out-of-range number but still returns a result (spec-v1190)", async () => {
  const inputs = { mounting_height_ft: 10, angle_deg: 95, target_fc: 30 };
  const r = await run({ id: "luminaire-height-for-illuminance", inputs });
  const w = r.warnings.find((x) => x.key === "angle_deg");
  assert.ok(w, "angle_deg warning present");
  assert.equal(w.rule, "max");
  assert.equal(w.limit, 89.9);
  assert.ok("result" in r, "result still returned despite the warning");
});

test("run on an in-range worked example carries no warnings", async () => {
  const r = await run({ id: "pull-box-sizing" });
  assert.deepEqual(r.warnings, []);
});

test("describe and run expose the limitation banner for a screening tile (spec-v1190)", async () => {
  const d = await describe({ id: "manual-j-cooling" });
  assert.match(d.limitation.headline, /Not a Manual J/);
  const r = await run({ id: "manual-j-cooling" });
  assert.match(r.limitation.headline, /Not a Manual J/);
});

test("a tile without a limitation banner reports limitation: null", async () => {
  const d = await describe({ id: "pull-box-sizing" });
  assert.equal(d.limitation, null);
});

test("run_calculators evaluates a batch, isolating a bad item (spec-v1187)", async () => {
  const r = await runMany({ calls: [
    { id: "pull-box-sizing", inputs: { pull_type: "straight", largest_raceway_in: 2, other_raceways_in: 0 } },
    { id: "no-such-tile", inputs: {} },
    { id: "pull-box-sizing", inputs: { pull_type: "straight", largest_raceway_in: 3, other_raceways_in: 0 } },
  ] });
  assert.equal(r.count, 3);
  assert.equal(r.results[0].result.governing, 16);
  assert.match(r.results[1].error, /no-such-tile/);
  assert.equal(r.results[2].result.governing, 24);
});

test("run_calculators rejects an over-cap batch, naming the cap", async () => {
  await assert.rejects(
    () => runMany({ calls: new Array(51).fill({ id: "pull-box-sizing" }) }),
    /max 50/,
  );
});

test("a bespoke-renderer tile degrades to compute introspection, no crash", async () => {
  const d = await describe({ id: "voltage-drop" });
  assert.equal(d.inputs_source, "compute");
  assert.ok(Array.isArray(d.inputs) && d.inputs.length > 0);
  assert.ok(d.inputs.every((i) => typeof i.name === "string"));
});

test("a tile whose renderer wraps compute with unit conversion degrades to the runnable params", async () => {
  // dyno-correction-sae's fields are US units (baro_inhg) but its compute-map
  // fn takes SI params (baro_mbar); describe must advertise what run honors.
  const d = await describe({ id: "dyno-correction-sae" });
  assert.equal(d.inputs_source, "compute");
  const keys = d.inputs.map((i) => i.name);
  assert.ok(keys.includes("baro_mbar"), "advertises the compute param, not the renderer field key");
  assert.ok(!keys.includes("baro_inhg"));
});
