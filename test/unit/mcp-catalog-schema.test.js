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

test("a bespoke-renderer tile still names its answers from its printed captions", async () => {
  // No schema means no format closure, so no display string -- but the caption
  // the calculator prints above each number is extracted for its own page, and
  // the door reports it keyed by the compute result key.
  const d = await describe({ id: "final-grade-needed" });
  assert.equal(d.inputs_source, "compute", "no schema for this renderer");
  assert.equal(d.outputs_source, "captions");
  const needed = d.outputs.find((o) => o.key === "needed_pct");
  assert.equal(needed.label, "Needed final score");
  assert.equal(needed.unit, null, "an extracted display affix is not a unit and is not reported as one");

  const r = await run({ id: "final-grade-needed" });
  const row = r.outputs.find((o) => o.key === "needed_pct");
  assert.equal(row.label, "Needed final score");
  assert.equal(row.display, null, "a bespoke renderer has no format closure");
  assert.ok("needed_pct" in r.result, "and the key joins straight onto the raw result");
});

test("a captioned output is never a key the result does not carry", async () => {
  // The captions are extracted from display code, which can name an input
  // element or a mode the tile is not in. On a page that caption has nothing to
  // label; through the door it would be a claim about an answer that is absent.
  const r = await run({ id: "conduit-90-stub" });
  for (const o of r.outputs || []) {
    assert.ok(Object.prototype.hasOwnProperty.call(r.result, o.key),
      `advertised output ${o.key} is absent from the result`);
  }
});

test("a schema tile keeps its display-line outputs and marks their source", async () => {
  // The two key spaces are deliberate and distinguishable: a schema output is
  // keyed by the renderer's display line and carries a formatted string; a
  // captioned output is keyed by the compute result key and carries none.
  const d = await describe({ id: "pull-box-sizing" });
  assert.equal(d.outputs_source, "renderer");
  const r = await run({ id: "pull-box-sizing", inputs: { pull_type: "straight", largest_raceway_in: 3, other_raceways_in: 0 } });
  assert.equal(r.outputs.find((o) => o.key === "g").display, "24.0 in (straight pull)");
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

test("a US-facing tile over a metric correlation advertises the units its page shows", async () => {
  // dyno-correction-sae's fields are US units (baro_inhg) over a correlation
  // published in SI (baro_mbar). The compute takes BOTH families, so the door
  // advertises the page's own keys -- with labels, units and output
  // descriptors -- instead of degrading to bare SI param names.
  const d = await describe({ id: "dyno-correction-sae" });
  assert.equal(d.inputs_source, "renderer");
  const keys = d.inputs.map((i) => i.key ?? i.name);
  assert.ok(keys.includes("baro_inhg"), "advertises the key the page asks for");
  assert.ok(keys.includes("baro_mbar"), "and still names the correlation-native alternate");
  const inhg = d.inputs.find((i) => i.key === "baro_inhg");
  assert.match(inhg.label, /in Hg/, "carrying the unit in its label");
  assert.ok(d.outputs && d.outputs.length, "and the outputs a person sees");
});

test("the two unit families of a US-facing tile agree", async () => {
  // The page's example and the correlation-native fixture are the same
  // physical air; both must reach the same correction factor through run().
  const us = await run({
    id: "dyno-correction-sae",
    inputs: { observed_hp: 400, baro_inhg: 28.94, air_temp_f: 86, humidity_pct: 0 },
  });
  const si = await run({
    id: "dyno-correction-sae",
    inputs: { observed_hp: 400, baro_mbar: 28.94 * 33.8638866667, air_temp_c: 30, humidity_pct: 0 },
  });
  assert.ok(!us.result.error && !si.result.error);
  assert.ok(Math.abs(us.result.cf - si.result.cf) < 1e-12, "same correction factor either way");
  assert.deepEqual(us.warnings, [], "and the page's own keys draw no unknown-key warning");
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

// --- the agent door must advertise keys a caller can actually send ---
//
// Three tiles shipped advertising an input name no JSON object could carry, so
// the value never reached the compute and the tile answered from its default.
// The signature parser was reading the destructure as raw text: a maintainer
// comment between two parameters became part of the next name, and a renamed
// key was reported under its local alias.

test("a maintainer comment inside a destructure is not an input name", async () => {
  // npsh-a's signature carries `// positive if source above pump` between two
  // parameters. That comment used to swallow `friction_loss_ft`, so an agent
  // following describe() omitted friction loss and NPSHa came back 2 ft
  // HIGHER -- reading safer than the truth on a cavitation margin.
  const d = await describe({ id: "npsh-a" });
  const names = d.inputs.map((i) => i.name ?? i.key);
  assert.ok(names.includes("friction_loss_ft"), "friction loss is advertised");
  assert.ok(names.every((n) => /^[A-Za-z_$][\w$]*$/.test(n)), `malformed name in ${JSON.stringify(names)}`);
  const withLoss = await run({ id: "npsh-a", inputs: { water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2 } });
  const without = await run({ id: "npsh-a", inputs: { water_temp_F: 60, source_elevation_relative_ft: 5 } });
  assert.equal(withLoss.result.H_friction_ft, 2, "the advertised key reaches the compute");
  assert.ok(without.result.NPSHa_ft - withLoss.result.NPSHa_ft > 1.9, "omitting it overstates NPSHa by the friction head");
});

test("a renamed destructure advertises the key, not the local alias", async () => {
  // computeExteriorOpeningProtection destructures `{ protected: prot }`. The
  // door used to advertise "protected: prot", which an agent cannot send --
  // so every call read as unprotected and the allowable opening area was
  // computed against the wrong IBC 705.8 band.
  const d = await describe({ id: "exterior-opening-protection" });
  const names = d.inputs.map((i) => i.name ?? i.key);
  assert.ok(names.includes("protected"));
  assert.ok(!names.some((n) => n.includes(":")));
  const inputs = { fsd_ft: 7, wall_area: 400, actual_opening: 60 };
  const on = await run({ id: "exterior-opening-protection", inputs: { ...inputs, protected: true } });
  const off = await run({ id: "exterior-opening-protection", inputs: { ...inputs, protected: false } });
  assert.equal(on.result.allowable_pct, 25);
  assert.equal(off.result.allowable_pct, 10);
});

test("a compute whose signature cannot be read still advertises its inputs", async () => {
  // computeRentVsBuy takes a bare object, so there is no destructure to parse
  // and the door advertised nothing at all for a tile that needs 13 values.
  // The publisher-verified worked example supplies the key set instead.
  const d = await describe({ id: "rent-vs-buy" });
  const names = d.inputs.map((i) => i.name ?? i.key);
  assert.ok(names.length >= 13, `advertised only ${names.length} inputs`);
  for (const key of Object.keys(d.example.inputs)) {
    assert.ok(names.includes(key), `${key} is advertised`);
  }
});

test("every tile advertises every key its own worked example sets", async () => {
  // The example is authored separately from the signature, so it is an
  // independent statement of what the tile takes. A key it sets that the door
  // does not name is a value an agent would omit. Mirrors check-both-doors.
  const { TOOLS } = await import("../../tools-data.js");
  const missing = [];
  for (const t of TOOLS) {
    const d = await describe({ id: t.id });
    if (!d.example || !d.example.inputs) continue;
    const names = new Set((d.inputs || []).map((i) => i.name ?? i.key));
    for (const k of Object.keys(d.example.inputs)) if (!names.has(k)) missing.push(`${t.id}.${k}`);
  }
  assert.deepEqual(missing, []);
});

// --- answer_query reaches the tiles that have no field shard ---
//
// Only a tile with a renderer schema gets a data/fields shard, so 379 tiles
// fall to the describe() projection in fieldRowsFor. That projection required
// both `key` and `label`, and an introspected input has neither -- it has a
// `name` and nothing else -- so it returned an empty row list and a question
// about any of those tiles could only ever answer NO_VALUES.

test("a calculator with no renderer schema still yields fillable rows", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  // The box-culvert tiles carry no renderer schema, so they were absent from
  // the field index entirely. Their numeric fields are indexed now.
  const r = await answerQuery({ query: "box culvert headwater 36 in span 48 in rise 60 cfs" });
  assert.match(r.id, /^box-culvert-/, "the question reached a box-culvert tile");
  assert.notEqual(r.status, "NO_VALUES", "the projection produced rows to fill");
  assert.equal(Number(r.inputs.flow_cfs), 60);
});

test("a coded or list-valued input is never guessed at from a number in the question", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  // `config` wants "wingwall_30_75". A numeric extractor handed a projected row
  // with no options scrapes the first number it sees and fills the field with
  // "30" -- a confidently wrong answer. Twenty-one fields did exactly that.
  const r = await answerQuery({ query: "box culvert headwater 36 in span 48 in rise 60 cfs 30 degree wingwall" });
  assert.ok(!("config" in (r.inputs || {})), "config was not filled from a stray number");
});

// --- an input key the compute cannot receive ---
//
// `run` spreads the caller's object into the compute, so a key the destructure
// does not name is dropped without a word and the tile answers from its
// defaults: a confident number built on a value the caller believes it supplied.

test("run warns on an input key the calculator cannot receive", async () => {
  const r = await run({ id: "ohms-law", inputs: { V: 120, I: 10, Rr: 5 } });
  const w = r.warnings.find((x) => x.key === "Rr");
  assert.ok(w, "the misspelled key is named");
  assert.equal(w.rule, "unknown");
  assert.ok("result" in r, "advisory only -- the compute still answers");
});

test("the key the tile's own PAGE shows is honored, not warned about", async () => {
  // time-alignment was one of four tiles whose renderer converted units at the
  // boundary: the page asked for ambient_F, the compute took ambient_C, and an
  // agent replaying the page's example got a different answer. The compute now
  // takes either, so the page's key computes the page's answer.
  const f = await run({
    id: "time-alignment",
    inputs: { d_main_ft: 80, d_delay_ft: 30, ambient_F: 71.6, haas_offset_ms: 15 },
  });
  const c = await run({
    id: "time-alignment",
    inputs: { d_main_ft: 80, d_delay_ft: 30, ambient_C: 22, haas_offset_ms: 15 },
  });
  assert.deepEqual(f.warnings, [], "the page's key is a real input");
  assert.ok(Math.abs(f.result.recommended_delay_ms - c.result.recommended_delay_ms) < 1e-9,
    "71.6 F is 22 C and answers the same");
});

test("a compute that collects a shape-dependent key set is never warned about", async () => {
  // computeGeometry({ shape, ...args }) reads a different set of keys per
  // shape and every one is legitimate, so its parameter list cannot be checked
  // against a key list and is not.
  const r = await run({ id: "geometry", inputs: { shape: "circle", radius: 5 } });
  assert.deepEqual(r.warnings.filter((w) => w.rule === "unknown"), []);
  assert.ok(!r.result.error, "and it still computes");
});

test("every tile's own worked example runs warning-free through the door", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8"));
  const seen = new Set();
  const bad = [];
  for (const row of raw.rows) {
    if (seen.has(row.tile_id)) continue;
    seen.add(row.tile_id);
    // Explicit inputs, so the worked-example shortcut cannot skip the check.
    const out = await run({ id: row.tile_id, inputs: { ...row.inputs } });
    for (const w of out.warnings || []) if (w.rule === "unknown") bad.push(`${row.tile_id}.${w.key}`);
  }
  assert.deepEqual(bad, []);
});

test("an answer unit is applied to the number the renderer actually prints", async () => {
  // The affixes are extracted from a renderer's display expression, which may
  // scale the value first. `breakeven` prints
  // `fmt(r.contribution_margin_ratio * 100, 2) + "%"`, so recording "%" against
  // the raw 0.6 made the tile page read "0.6%" for a sixty-percent margin.
  const { formatWithUnit, outputUnits } = await import("../../mcp/catalog.mjs");
  const u = outputUnits("breakeven").contribution_margin_ratio;
  assert.equal(u.scale, 100, "the x100 the renderer applies is recorded, not discarded");
  assert.equal(formatWithUnit(u, 0.6, "0.6", "Contribution margin ratio"), "60%");

  // A scale that cannot be attributed to one line is not recorded at all:
  // riprap-d50 prints D50 on one line and the layer thickness (d50_in * 1.5) on
  // another, and reading the 1.5 off the wrong line reported 11.7 in as 17.6.
  const d50 = outputUnits("riprap-d50").d50_in;
  assert.ok(!d50 || typeof d50.scale !== "number", "an ambiguous scale is dropped, not guessed");
});

test("a unit that cannot be reproduced from the raw value is dropped", async () => {
  // `recirc-loop-sizing` prints `"1 / " + fmt(1 / r.recommended_hp, 0) + " HP"`.
  // A reciprocal cannot be rebuilt from the raw number, so " HP" is not kept --
  // it would have printed 0.333 HP where the tool says 1 / 3 HP.
  const { outputUnits } = await import("../../mcp/catalog.mjs");
  assert.ok(!outputUnits("recirc-loop-sizing").recommended_hp);
});

test("a renderer that imports the output factory under its own name is still read", async () => {
  // Twelve modules do `import { makeOutputLine as _moG, fmt as _fmtG }`, and
  // the extractor anchored on the literal name -- so it read NO output lines at
  // all for those renderers and 73 tiles named none of their answers. The
  // captions were in the source the whole time. (The input side hit the same
  // shape once: there it was a prefix a `\w*` still matched, `_v26makeNumber`.
  // A rename to `_v26makeOut` it cannot.)
  const d = await describe({ id: "rainwater-yield" }); // calc-cross.js, uses _moG
  assert.equal(d.outputs_source, "captions");
  assert.ok(d.outputs.some((o) => o.label === "Annual yield"), "reads the renamed factory's caption");
  const { outputUnits } = await import("../../mcp/catalog.mjs");
  assert.equal(outputUnits("rainwater-yield").annual_gal.suffix, " gal", "and the unit beside it");
});

test("a renderer that calls its result something other than r is still read", async () => {
  // The caption reads were anchored on a literal `r.`, but `overtime` holds its
  // result in `x` and twenty-one other tiles use `res` -- so four captions
  // ("Regular pay", "Overtime pay", "Double-time pay", "Gross pay") sat one
  // character away from being read, and the tile named none of its answers.
  const d = await describe({ id: "overtime" });
  assert.equal(d.outputs_source, "captions");
  const labels = d.outputs.map((o) => o.label);
  for (const want of ["Regular pay", "Overtime pay", "Gross pay"]) {
    assert.ok(labels.includes(want), `names "${want}"`);
  }
});

test("a renderer that renames the INPUT factories still exposes a field schema", async () => {
  // The same rename blind spot as the answer side, on the side that feeds
  // run()'s input contract and the website's one-box. `rope-ma` builds its
  // dropdown with `_msF(...)` -- makeSelect under another name -- so the strict
  // parser, which matched the literal `makeSelect(`, saw no fields at all.
  const d = await describe({ id: "rope-ma" });
  assert.equal(d.inputs_source, "renderer");
  const rig = d.inputs.find((i) => i.key === "rig");
  assert.equal(rig.kind, "select", "the dropdown is typed, not a bare param");
  assert.ok(rig.options.length > 1, "and its options resolve");
  // A typed select is also an enforced one.
  await assert.rejects(() => run({ id: "rope-ma", inputs: { rig: "not-a-rig" } }), /Allowed/);
});

test("a boolean answer is printed in the calculator's own words", async () => {
  // A worked-example fixture records a boolean as 0 or 1, and the tile page
  // printed that literally: `ltv` asked "PMI required?" and answered "0" where
  // the calculator says "No". The renderer states both words in one place.
  const { outputBooleans } = await import("../../mcp/catalog.mjs");
  assert.deepEqual(outputBooleans("ltv").pmi_required, { t: "Yes (LTV > 80%)", f: "No" });
  assert.deepEqual(outputBooleans("truss-capacity").pass, { t: "PASS", f: "FAIL" });

  // Only a COMPLETE ternary is taken. `sprinkler-density` writes
  // `r.meets_minimum === null ? "n/a" : (r.meets_minimum ? "yes" : "no (" + ...)`
  // -- the false branch is a fragment, and printing it alone would leave the
  // answer truncated mid-sentence, so the tile is refused rather than guessed.
  assert.ok(!outputBooleans("sprinkler-density").meets_minimum);
});

test("run returns the exact word for a boolean answer, and nothing invented for a number", async () => {
  // A boolean is the one case where the door can hand back a display string
  // without rebuilding anything: the renderer states both words as literals, so
  // the string for this state is verbatim what the page prints.
  const r = await run({ id: "ltv" });
  const pmi = r.outputs.find((o) => o.key === "pmi_required");
  assert.equal(pmi.display, "No");
  assert.equal(r.result.pmi_required, false, "and it agrees with the raw result");

  // Numbers stay bare. Their affixes sit around a display expression that may
  // scale the value, so prefix + raw + suffix is not the page's string.
  const ltv = r.outputs.find((o) => o.key === "ltv_percent");
  assert.equal(ltv.display, null);
  assert.equal(typeof r.result.ltv_percent, "number");
});

test("a curated alias corroborates the calculator it is curated for", async () => {
  // answer_query refuses to answer from a weak match: the question must carry
  // values or name the calculator. But the alias corpus exists precisely
  // because people do not use the name -- someone deliberately mapped "romex
  // ampacity" to the tile it answers -- and that mapping was not being counted.
  // Over a 300-term sample of the corpus, 70 questions came back NO_MATCH and
  // in 65 of them the ranker's top hit was already the alias's own target.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const r = await answerQuery({ query: "romex ampacity" });
  assert.notEqual(r.status, "NO_MATCH", "a curated phrasing resolves to its calculator");
  assert.ok(r.id, "and names which one");

  // The guard still holds where nothing corroborates: no values, no name, and
  // no curated mapping to the tile that ranked first.
  const none = await answerQuery({ query: "zzzz qqqq" });
  assert.equal(none.status, "NO_MATCH");
});

test("a rejected id or uri names the fix, and reports what was actually read", async () => {
  const { readResource } = await import("../../mcp/catalog.mjs");
  // An unknown id is the agent's most likely mistake, so say how to find a real
  // one rather than only that this one is wrong.
  await assert.rejects(() => describe({ id: "volts-drop" }), /unknown calculator id: "volts-drop"\. Call search_calculators/);
  await assert.rejects(() => run({ id: "volts-drop" }), /Call search_calculators/);
  // The uri error used to interpolate the raw argument, so a caller that passed
  // an object got "unknown resource uri: [object Object]" -- naming neither the
  // mistake nor the fix.
  await assert.rejects(() => readResource("roughlogic://nope"), /Valid forms are/);
});
