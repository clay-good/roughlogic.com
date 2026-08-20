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
  const r = await run({ id: "anchor-embedment" }); // bespoke, options do not resolve statically (no schema)
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

test("describe returns the full example gallery with an example alias (spec-v1193)", async () => {
  const d = await describe({ id: "ohms-law" }); // ohms-law ships two worked examples
  assert.ok(Array.isArray(d.examples) && d.examples.length >= 2);
  assert.ok(d.examples.every((e) => e.inputs && e.outputs));
  // The single `example`/`source` aliases stay = examples[0] for older callers.
  assert.deepEqual(d.example.inputs, d.examples[0].inputs);
  assert.equal(d.source, d.examples[0].source);
});

test("describe returns a structured citation and resolved related tiles (spec-v1185)", async () => {
  const d = await describe({ id: "pull-box-sizing" });
  assert.match(d.citation.text, /NEC/);
  assert.ok(d.citation.locator, "locator from the worked example");
  assert.ok(Array.isArray(d.related) && d.related.length > 0);
  assert.ok(d.related.every((r) => typeof r.id === "string" && typeof r.name === "string"));
  // The flat `source` string stays as a compatibility alias.
  assert.equal(typeof d.source, "string");
});

test("related drops a dangling id that points at a never-landed tile (spec-v1185)", async () => {
  // rc-tbeam-flexure's curated list includes rc-beam-doubly-reinforced, which
  // is not a real tile; the resolver must drop it rather than surface a name-less id.
  const d = await describe({ id: "rc-tbeam-flexure" });
  assert.ok(d.related.every((r) => r.name), "every related id resolved to a real name");
  assert.ok(!d.related.some((r) => r.id === "rc-beam-doubly-reinforced"), "the dangling id is dropped");
});

test("flagship electrical tiles expose hand-authored schemas (spec-v1184 coverage growth)", async () => {
  const vd = await describe({ id: "voltage-drop" });
  assert.equal(vd.inputs_source, "renderer");
  assert.deepEqual(vd.inputs.find((i) => i.key === "phase").options.map((o) => o.value), ["single", "three"]);
  await assert.rejects(
    () => run({ id: "voltage-drop", inputs: { phase: "dual", material: "copper", awg: "12", length_ft: 100, current_A: 20, source_voltage_V: 120 } }),
    /Allowed: "single", "three"/,
  );
  const r = await run({ id: "voltage-drop", inputs: { phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 20, source_voltage_V: 120 } });
  assert.match(r.outputs.find((o) => o.key === "drop_V").display, /V$/);
  const ol = await describe({ id: "ohms-law" });
  assert.equal(ol.inputs_source, "renderer");
});

test("extracted bespoke schemas expose enum options and validate (spec-v1184 growth)", async () => {
  const d = await describe({ id: "conduit-fill" }); // bespoke renderer, schema from the extractor fixture
  assert.equal(d.inputs_source, "renderer");
  const conduit = d.inputs.find((i) => i.key === "conduit");
  assert.deepEqual(conduit.options.map((o) => o.value), ["EMT", "PVC_40", "RMC"]);
  await assert.rejects(() => run({ id: "conduit-fill", inputs: { conduit: "FLEX" } }), /Allowed/);
  // The extractor also carries the tile's citation text (attribution).
  assert.match(d.citation.text, /NEC/);
});

test("a numeric-select tile publishes its enum as numbers, and run honors both forms", async () => {
  // wire-ampacity's renderer does `Number(sel.select.value)`, so the compute
  // wants a number. The extractor publishes the enum as numbers rather than
  // withholding it, and run() snaps a string form onto the same option.
  const d = await describe({ id: "wire-ampacity" });
  assert.equal(d.inputs_source, "renderer");
  const rating = d.inputs.find((i) => i.key === "insulation_rating_C");
  assert.deepEqual(rating.options.map((o) => o.value), [60, 75, 90]);
  const asNumber = await run({ id: "wire-ampacity", inputs: { awg: "12", material: "copper", insulation_rating_C: 75 } });
  const asString = await run({ id: "wire-ampacity", inputs: { awg: "12", material: "copper", insulation_rating_C: "75" } });
  assert.deepEqual(asString.result, asNumber.result);
  await assert.rejects(() => run({ id: "wire-ampacity", inputs: { insulation_rating_C: 105 } }), /Allowed/);
});

test("a bespoke-renderer tile degrades to compute introspection, no crash", async () => {
  const d = await describe({ id: "anchor-embedment" }); // bespoke, options do not resolve statically
  assert.equal(d.inputs_source, "compute");
  assert.ok(Array.isArray(d.inputs) && d.inputs.length > 0);
  assert.ok(d.inputs.every((i) => typeof i.name === "string"));
  // ...but its citation is still exposed via the extracted renderer citations.
  assert.match(d.citation.text, /Citation:/);
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

test("a number that spells a select option is accepted and normalized to that option", async () => {
  // pan-conversion's pan_depth_in is a <select> whose options are the strings
  // "2.5" / "4" / "6". Its own worked-example fixture records the input as the
  // number 4, so a strict includes() rejected the tile's published example
  // through the documented run path -- as it did for seven tiles.
  const out = await run({
    id: "pan-conversion",
    inputs: { target_servings: 120, portion_oz: 6, pan_size: "full", pan_depth_in: 4 },
  });
  assert.equal(out.inputs.pan_depth_in, "4", "normalized to the option the compute is written against");
  assert.equal(typeof out.inputs.pan_depth_in, "string");
  assert.ok(!out.result.error, "the compute runs on the normalized value");
});

test("a select value outside the option set is still rejected by name", async () => {
  await assert.rejects(
    () => run({ id: "pan-conversion", inputs: { pan_depth_in: 9 } }),
    /invalid value for "pan_depth_in": 9\. Allowed: "2\.5", "4", "6"\./,
  );
});

test("every tile's own worked example runs clean through the MCP run path", async () => {
  // The end-to-end version of the two cases above: whatever an agent reads off
  // describe() and replays must not be rejected by run().
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const path = fileURLToPath(new URL("../fixtures/worked-examples.json", import.meta.url));
  const rows = JSON.parse(await readFile(path, "utf8")).rows;
  const seen = new Set();
  const failures = [];
  for (const r of rows) {
    if (seen.has(r.tile_id)) continue;
    seen.add(r.tile_id);
    try {
      await run({ id: r.tile_id, inputs: r.inputs });
    } catch (e) {
      failures.push(`${r.tile_id}: ${e.message}`);
    }
  }
  assert.deepEqual(failures, [], "no tile may reject its own published example");
});

// The answer side of a worked example used to print the compute's raw result
// keys ("drop_V 7.45") because a renderer schema's output descriptors are
// display-line ids, not result keys. The captions the calculator itself prints
// above each output line are the honest source, and they are now extracted the
// same way the input labels are.
test("outputLabels names a result key with the caption the calculator prints", async () => {
  const { outputLabels } = await import("../../mcp/catalog.mjs");
  const vd = await outputLabels("voltage-drop");
  assert.equal(vd.drop_V, "Voltage drop");
  assert.equal(vd.percent, "Percent drop");
  // A line that shows two results is captioned for the one it leads with.
  const sd = await outputLabels("sprinkler-density");
  assert.equal(sd.total_gpm, "Total gpm");
  assert.equal(sd.density_gpm_per_ft2, undefined, "the second value on that line stays keyed");
  // An error branch never names the key it happens to print.
  for (const id of ["voltage-drop", "sprinkler-density", "acme-thread-depth"]) {
    const m = await outputLabels(id);
    assert.equal(m.error, undefined, `${id} must not label the error key`);
  }
});

// A declarative renderer describes each output line by its DISPLAY id ("v",
// "cf"), so reading `outputs[].key` as a result key named almost nothing --
// and once named the wrong number. The line's own formatter says which result
// the caption sits above.
test("outputLabels reads a declarative renderer's formatter, not its display id", async () => {
  const { outputLabels } = await import("../../mcp/catalog.mjs");
  // `{ key: "F", label: "Clamp load", value: (r) => fmt(r.F_lb, ...) }`: the
  // display id is "F", the caption belongs to `F_lb`.
  const bt = await outputLabels("bolt-torque");
  assert.equal(bt.F_lb, "Clamp load");
  assert.equal(bt.torque_ft_lb, "Torque");
  assert.equal(bt.F, undefined, "a display id is not a result key");
  const cmd = await outputLabels("concrete-mix-design");
  assert.equal(cmd.wc_ratio, "Water-to-cement");
  assert.equal(cmd.water_lb_yd3, "Water (lb/yd³)");
  // "12 x 8 = 96 panels" is captioned for the whole line, and its display id
  // ("panels") does not repeat the value the line leads with ("panels_l"), so
  // the caption names nothing rather than calling 96 the "Panel grid".
  const sc = await outputLabels("concrete-sawcut-footage");
  assert.equal(sc.panels, undefined, "an unconfirmed multi-value line names nothing");
  assert.equal(sc.panels_l, undefined);
  // But when the author's own display id repeats the leading key, that is them
  // naming it: "12 bags (11.6 before rounding)" is the bag count.
  const st = await outputLabels("stucco-coverage");
  assert.equal(st.bags, "Plaster bags");
});

// The formatter names a line's answers; a key it only TESTS picks the wording.
test("outputLabels skips a key the output line only tests", async () => {
  const { outputLabels } = await import("../../mcp/catalog.mjs");
  // `(r.heating ? "heating: " : "") + fmt(r.q_btuh, 0) + " Btu/hr"` -- the flag
  // in front chooses a word, so the caption belongs to the number behind it.
  const cc = await outputLabels("cooling-coil-total-load");
  assert.equal(cc.q_btuh, "Total coil load");
  assert.equal(cc.heating, undefined, "a flag that only picks wording is not an answer");
  // `(r.clamped ? " (clamped to 0)" : "")` trails rather than leads; same rule.
  const hp = await outputLabels("heat-pump-cold-capacity");
  assert.equal(hp.cap_design, "Delivered capacity at design");
  assert.equal(hp.aux_kw, "Auxiliary heat needed");
});

// "Verdict" is the name of a conclusion. Over the one key a line reports, that
// is exactly right; over a number carried along inside a sentence, it names
// something the reader cannot see.
test("outputLabels keeps a conclusion caption only where the line has one subject", async () => {
  const { outputLabels } = await import("../../mcp/catalog.mjs");
  // `(r) => r.all_pass ? "PASS" : "FAIL"` -- the verdict IS the answer.
  const gh = await outputLabels("guard-handrail-check");
  assert.equal(gh.all_pass, "Verdict");
  // `"FAILS: " + [... "area by " + fmt(r.area_deficit_sqin, 0) ...]` -- the
  // caption is for the sentence, not for the shortfall inside it.
  const ew = await outputLabels("egress-window-check");
  assert.equal(ew.area_deficit_sqin, undefined, "a verdict caption does not name a number it mentions");
  const ff = await outputLabels("fireplace-flue-area");
  assert.equal(ff.surplus_sqin, undefined);
  assert.equal(ff.required_area_sqin, "Required net flue area", "the quantity lines still name their key");
});

// A ratchet, not a target: the share of worked-example answer rows that print
// a name instead of a bare API key. Reading the formatters took it from 1,942
// to 2,989 of 4,844 rows. It may only go up.
test("worked-example answer rows are named, not keyed", async () => {
  const { outputLabels } = await import("../../mcp/catalog.mjs");
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8"));
  const rows = Array.isArray(raw) ? raw : (raw.examples || raw.rows || []);
  const seen = new Set();
  let total = 0, named = 0;
  for (const row of rows) {
    if (!row || !row.tile_id || seen.has(row.tile_id)) continue;
    seen.add(row.tile_id);
    const labels = await outputLabels(row.tile_id);
    for (const k of Object.keys(row.outputs || {})) { total += 1; if (labels[k]) named += 1; }
  }
  assert.ok(named >= 2989, `named answer rows fell to ${named} of ${total}; the floor is 2,989`);
});

// A bare `1200` does not say watts. `outputUnits` carries the text a
// hand-written renderer concatenates onto its answer, so the tile page can
// print the number the way the calculator prints it. Display-only: it never
// reaches a compute call, so the rule is only that it reads as a unit.
test("outputUnits reads as a unit, never as part of the number", async () => {
  const { BESPOKE_OUTPUT_UNITS } = await import("../fixtures/bespoke-output-units.js");
  const ids = Object.keys(BESPOKE_OUTPUT_UNITS);
  assert.ok(ids.length >= 658, `unit maps fell to ${ids.length} tiles; the floor is 658`);
  for (const id of ids) {
    for (const [key, u] of Object.entries(BESPOKE_OUTPUT_UNITS[id])) {
      const where = `${id}.${key}`;
      assert.equal(typeof u.prefix, "string", where);
      assert.equal(typeof u.suffix, "string", where);
      assert.ok(u.prefix !== "" || u.suffix !== "", `${where} records no unit at all`);
      assert.ok(u.suffix.length <= 16 && (u.prefix + u.suffix).length <= 24, `${where} is a sentence, not a unit`);
      // A digit against the number reads as part of it ("1200 3-phase").
      assert.ok(!/^\s*[\d.]/.test(u.suffix), `${where} starts with a digit`);
      if ("digits" in u) assert.ok(Number.isInteger(u.digits) && u.digits >= 0 && u.digits <= 10, `${where} decimals ${u.digits}`);
    }
  }
  const { outputUnits } = await import("../../mcp/catalog.mjs");
  assert.deepEqual(outputUnits("abrasive-blast").cfm, { prefix: "", suffix: " cfm", digits: 0 });
  assert.deepEqual(outputUnits("no-such-tile"), {});
});

// The answer string the calculator itself prints, for the renderers that carry
// a format closure. Same rule as the caption pass: only a line that resolves
// to one result key is reported, so a display is never shown against a number
// it is not about.
test("outputDisplays returns the string the calculator prints", async () => {
  const { outputDisplays } = await import("../../mcp/catalog.mjs");
  const ohm = await outputDisplays("ohms-law", { V: 120, I: 10, R: null, P: null });
  assert.equal(ohm.R, "12.00 ohm");
  assert.equal(ohm.P, "1200.00 W");
  // A bespoke renderer has no format closure and reports nothing rather than
  // guessing.
  assert.deepEqual(await outputDisplays("abrasive-blast", {}), {});
  assert.deepEqual(await outputDisplays("no-such-tile", {}), {});
});

// A ratchet, not a target: the share of worked-example answer rows that print
// with the unit the calculator shows. It may only go up.
test("worked-example answer rows carry their unit", async () => {
  const { outputDisplays, outputUnits } = await import("../../mcp/catalog.mjs");
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8"));
  const rows = Array.isArray(raw) ? raw : (raw.examples || raw.rows || []);
  const seen = new Set();
  let total = 0, united = 0;
  for (const row of rows) {
    if (!row || !row.tile_id || seen.has(row.tile_id)) continue;
    seen.add(row.tile_id);
    const units = outputUnits(row.tile_id);
    const displays = await outputDisplays(row.tile_id, row.inputs || {});
    for (const k of Object.keys(row.outputs || {})) { total += 1; if (units[k] || displays[k]) united += 1; }
  }
  assert.ok(united >= 2195, `answer rows with a unit fell to ${united} of ${total}; the floor is 2,195`);
});
