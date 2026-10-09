// The "Test with example" button must load the tile's own worked example.
//
// check-example-parity pins each `<name>Example` export to the fixture the page
// prints, and example-parity-runtime drives the tiles that have NO export. A
// third class fell between them: a tile WITH an export whose renderer fills the
// button from inline literals instead. Those literals drifted unseen --
// char-depth-capacity added a 0.2 in layer the example leaves at 0, sprayer-
// calibration filled 20 ft where the example has a 1.667 ft nozzle spacing, and
// gas-leak-hole-diameter opened at 3.15 cfh against the printed 7.72 (all found
// 2026-10-03).
//
// The check: every number the button types must be one of the example's input
// values or one of the compute's own defaults. A reviewed exception fills a
// field the example does not use (another mode, a unit-converted twin, a list).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REVIEWED = new Map([
  ["cctv-storage", "50% motion duty fills the motion-mode field"],
  ["cctv-retention-days", "50% motion duty fills the motion-mode field"],
  ["recirc-loop-sizing", "fills the optional annual-cost extension fields"],
  ["sanitary-dfu", "fixture counts are an object, not scalar inputs"],
  ["pipe-velocity", "0.75 is the nominal size select; fillID() writes the 0.785 in ID"],
  ["radiant-floor-output", "30 Btu/h-ft2 fills the inverse-mode target"],
  ["soil-permeability", "fills the falling-head fields as well"],
  ["gear-cascade", "the gear train is a list input"],
  ["well-drawdown", "fills the optional recovery and Jacob fields"],
  ["langelier-index", "77 F is the example's 25 C in the imperial field"],
  ["spl-atmospheric", "the form is imperial; the example is metric"],
  ["amp-power-spl", "3.28 ft is the example's 1 m"],
  ["azimuth-bearing-conversion", "41.5 fills the bearing-to-azimuth mode"],
]);

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)) || Math.abs(a - b) < 0.0006;

test("every inline example button types only the example's values or the compute's defaults", async () => {
  const map = readFileSync(resolve(ROOT, "test/fixtures/renderer-map.js"), "utf8");
  const bad = [];
  let checked = 0;
  for (const m of map.matchAll(/"([a-z0-9-]+)":\s*\{\s*module:\s*"([^"]+)"/g)) {
    const [, id, modPath] = m;
    const reg = COMPUTE_MAP[id];
    if (!reg || REVIEWED.has(id)) continue;
    const src = readFileSync(resolve(ROOT, modPath.replace(/^\.\.\/\.\.\//, "")), "utf8");
    const a = new RegExp('\\["' + id + '"\\]\\s*=\\s*(\\w+)\\s*;').exec(src);
    if (!a) continue;
    const f = new RegExp("function " + a[1] + "\\s*\\(").exec(src);
    if (!f) continue;
    const body = src.slice(f.index, src.indexOf("\n}\n", f.index));
    const k = body.indexOf("attachExampleButton(");
    if (k < 0) continue;
    let d = 0, j = k + "attachExampleButton".length;
    for (; j < body.length; j++) { if (body[j] === "(") d++; else if (body[j] === ")" && --d === 0) break; }
    const typed = [...body.slice(k, j).matchAll(/\.value = "(-?[\d.]+(?:e[-+]?\d+)?)"/g)].map((x) => Number(x[1]));
    if (!typed.length) continue;
    const mod = await importCalc(reg.module);
    const stem = reg.fn.replace(/^compute/, "");
    const names = [stem[0].toLowerCase() + stem.slice(1) + "Example", camel(id) + "Example"].map((n) => n.toLowerCase());
    const key = Object.keys(mod).find((x) => names.includes(x.toLowerCase()));
    if (!key || !mod[key].inputs) continue;
    const numbers = (v) => typeof v === "number" ? [v]
      : typeof v === "string" && /^[-\d., ]+$/.test(v) ? v.split(",").map(Number)
      : v && typeof v === "object" ? Object.values(v).flatMap(numbers) : [];
    const allowed = numbers(mod[key].inputs);
    const fsrc = mod[reg.fn].toString();
    const sig = fsrc.slice(0, fsrc.indexOf("{", fsrc.indexOf("}") + 1));
    for (const dflt of sig.matchAll(/\b\w+ = (-?[\d.]+(?:e[-+]?\d+)?)/g)) allowed.push(Number(dflt[1]));
    checked++;
    const stray = typed.filter((t) => !allowed.some((v) => near(t, v)));
    if (stray.length) bad.push(`${id}: button types ${JSON.stringify(stray)} not in ${key}`);
  }
  assert.ok(checked > 600, `only ${checked} inline buttons were checked; the renderer-map scan broke`);
  assert.deepEqual(bad, []);
});

// The same drift in a renderer's blank-field fallback (`key: f.input.value === ""
// ? N : ...`): a reader who leaves an optional field blank should get the compute's
// documented default. 2026-10-03: 14 fallbacks typed 0 where the compute defaults
// to 5% grade, a 12 in drum, 15 ft of makeup, 5% waste... and rainwater catchment
// fell back to 0.62 (the gal/in-ft^2 constant misread as an efficiency).
const FALLBACK_REVIEWED = new Map([
  ["calc-hvacservice.js:air_temp_f", "a measurement; 70 F room air, as the example"],
  ["calc-instrumentation.js:flow_high", "the transmitter range, 500 as the example"],
  ["calc-instrumentation.js:resistance_ohms", "a measurement, 20,000 as the example"],
  ["calc-lab.js:temperature_c", "the renderers call computeVanDerWaals (a measured temperature) and computeOsmolarity (37 C), not Nernst"],
]);

test("a blank optional field falls back to the compute's own default", () => {
  const bad = [];
  for (const f of readdirSync(ROOT).filter((x) => /^calc-.*\.js$/.test(x))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const sigs = [...src.matchAll(/export function (compute\w+)\(\{([^}]*)\}/g)].map((m) => ({
      fn: m[1], at: m.index,
      defs: Object.fromEntries([...m[2].matchAll(/(\w+)\s*=\s*(-?[\d.]+(?:e[-+]?\d+)?)/g)].map((d) => [d[1], Number(d[2])])),
    }));
    for (const m of src.matchAll(/(\w+):\s*\w+\.input\.value\s*===\s*""\s*\?\s*(-?[\d.]+(?:e[-+]?\d+)?)\s*:/g)) {
      const [, key, fb] = m;
      if (FALLBACK_REVIEWED.has(f + ":" + key)) continue;
      const before = sigs.filter((s) => key in s.defs && s.at < m.index);
      const s = before[before.length - 1] || sigs.find((x) => key in x.defs);
      if (s && Math.abs(s.defs[key] - Number(fb)) > 1e-9) bad.push(`${f}:${src.slice(0, m.index).split("\n").length} ${key} blank -> ${fb}, ${s.fn} default ${s.defs[key]}`);
    }
  }
  assert.deepEqual(bad, []);
});

// The `Number(f.input.value) || 0` form on a field with no prefilled value: a
// blank computes as 0. Where the compute documents another default AND still
// returns an answer at 0, the page silently gives a different result than the
// tile describes (2026-10-03: blank fall-protection fields dropped 7 ft of
// clearance; blank NEC circuit counts read 0). Fields where 0 is a real value
// or a measurement the reader supplies are listed with that reason.
const ZERO_REVIEWED = new Set([
  "calc-construction.js:pitch", "calc-construction.js:overhang_in", // a flat roof, no overhang
  "calc-contractorfinance.js:payroll_pct", "calc-contractorfinance.js:overhead_pct",
  "calc-contractorfinance.js:profit_pct", "calc-contractorfinance.js:retainage_pct", // a blank percentage reads as none
  "calc-electrical.js:run_length_ft", "calc-electrical.js:growth_reserve_pct", // measured; no reserve
  "calc-fab.js:kerf_in", "calc-hvac.js:thickness_in", "calc-plumbing.js:run_length_ft", // measured
  "calc-plumbing.js:side_slope_z", // z = 0 is a rectangular channel
  "calc-plumbingcode.js:horizontal_to_opening_ft", "calc-plumbingcode.js:side_bar_from_rear_in",
  "calc-plumbingcode.js:rear_toward_side_in", "calc-plumbingcode.js:rear_toward_open_in",
  "calc-plumbingcode.js:standoff_in", "calc-plumbingcode.js:clear_space_in", // field measurements
  "calc-survey.js:tape_weight_plf", "calc-survey.js:standard_pull_lb", // the tape's own properties, entered
]);

test("a blank unprefilled field does not silently compute as zero against a documented default", async () => {
  const bad = [];
  for (const f of readdirSync(ROOT).filter((x) => /^calc-.*\.js$/.test(x))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const sigs = [...src.matchAll(/export function (compute\w+)\(\{([^}]*)\}/g)].map((m) => ({
      fn: m[1], at: m.index,
      defs: Object.fromEntries([...m[2].matchAll(/(\w+)\s*=\s*(-?[\d.]+(?:e[-+]?\d+)?)/g)].map((d) => [d[1], Number(d[2])])),
    }));
    let mod = null;
    for (const m of src.matchAll(/(\w+):\s*Number\((\w+)\.input\.value\)\s*\|\|\s*(-?[\d.]+(?:e[-+]?\d+)?)\b/g)) {
      const [, key, v, fb] = m;
      if (ZERO_REVIEWED.has(f + ":" + key)) continue;
      const before = sigs.filter((s) => key in s.defs && s.at < m.index);
      const s = before[before.length - 1] || sigs.find((x) => key in x.defs);
      if (!s || Math.abs(s.defs[key] - Number(fb)) <= 1e-9) continue;
      const decls = [...src.slice(0, m.index).matchAll(new RegExp("const " + v + " = (\\w+)\\(([^;]*)\\);", "g"))];
      if (decls.length && /\bvalue:\s*"/.test(decls[decls.length - 1][2])) continue; // prefilled: blank is a deliberate clear
      mod = mod || await import(resolve(ROOT, f));
      const fn = mod[s.fn];
      if (typeof fn !== "function") continue;
      const exKey = Object.keys(mod).find((k) => k.toLowerCase() === s.fn.replace(/^compute/, "").toLowerCase() + "example");
      const base = exKey && mod[exKey].inputs ? { ...mod[exKey].inputs } : {};
      let a, b;
      try { a = fn({ ...base }); b = fn({ ...base, [key]: Number(fb) }); } catch { continue; }
      if (!a || a.error || !b || b.error) continue;
      if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${f}:${src.slice(0, m.index).split("\n").length} ${key} blank -> ${fb} computes; ${s.fn} documents ${s.defs[key]}`);
    }
  }
  assert.deepEqual(bad, []);
});

// The same check through the shared spec renderers (_simpleRenderer, _r, _rEnv...),
// which read every blank number field as 0. 2026-10-03: 127 optional parameters
// -- waste %, laps, allowances, coefficients, ambient temperatures, the ASCE 7
// rain-on-snow 8 psf -- gained a visible default equal to the compute's own.
// The reviewed fields are counts, sizes and measured values the reader must
// supply, where a prefilled sample number could pass for data.
const SCHEMA_REVIEWED = new Set(["formwork-pressure:wall_height_ft", "smoke-alarm-placement:sleeping_areas", "co-alarm-placement:sleeping_areas", "seismic-overturning-stability:sds", "plumbing-fixture-count:distribution", "scaffold-leg-load:platform_dead_lb", "scaffold-leg-load:num_workers", "scaffold-leg-load:material_lb", "mass-concrete-temp-rise:placing_temp_f", "duct-bank-concrete:num_conduits", "tapered-roof-insulation:start_thk_in", "metal-stud-takeoff:openings", "metal-stud-takeoff:extra_per_opening", "anchor-epoxy-volume:bar_dia_in", "joist-hanger-count:ends_per_joist", "joist-hanger-count:nails_per_hanger", "roof-insulation-fasteners:field_boards", "roof-insulation-fasteners:field_per_board", "roof-insulation-fasteners:perimeter_boards", "roof-insulation-fasteners:perimeter_per_board", "roof-insulation-fasteners:corner_boards", "roof-insulation-fasteners:corner_per_board", "chain-link-fence-takeoff:corners", "allowable-area:open_width_ft", "paver-patio:base_depth_in", "paver-patio:sand_depth_in", "attic-ventilation:intake_vent_nfa_sqin", "attic-ventilation:ridge_nfa_per_lf_sqin", "crawl-space-ventilation:corner_count", "concrete-isolation-joint:num_columns", "concrete-isolation-joint:column_perimeter_ft", "niosh-lifting:V_in", "niosh-lifting:frequency_per_min", "heat-treat-soak-time:start_temp_f", "invoice-factoring-cost:fee_pct", "idle-fuel-cost:miles_per_engine_hour", "brake-pad-life:rotor_mass_lb", "paint-mix-ratio:part_hardener", "line-array-splay:ear_height_ft", "delay-tower-alignment:compare_temp_f", "warewasher-hot-water:supply_temp_f", "tphc-window:start_temp_f", "steam-kettle-heatup:start_temp_f", "dough-water-temperature:flour_temp_f", "dough-water-temperature:room_temp_f", "litter-carry-team:support_personnel", "depreciation-recapture:max_1250_rate_pct", ]);

test("a spec-renderer number field with no prefill does not silently compute as zero against a documented default", async () => {
  const rmap = readFileSync(resolve(ROOT, "test/fixtures/renderer-map.js"), "utf8");
  const bad = [];
  for (const m of rmap.matchAll(/"([a-z0-9-]+)":\s*\{\s*module:\s*"([^"]+)",\s*exportName:\s*"(\w+)"/g)) {
    const [, id, mod, exp] = m;
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const R = (await importCalc(mod))[exp]?.[id];
    if (!R?.schema) continue;
    const C = await importCalc(reg.module);
    const cf = C[reg.fn];
    if (typeof cf !== "function") continue;
    const s = cf.toString();
    const sig = s.slice(0, s.indexOf("{", s.indexOf("}") + 1));
    const defs = Object.fromEntries([...sig.matchAll(/(\w+)\s*=\s*(-?[\d.]+(?:e[-+]?\d+)?)/g)].map((d) => [d[1], Number(d[2])]));
    const exKey = Object.keys(C).find((k) => k.toLowerCase() === reg.fn.replace(/^compute/, "").toLowerCase() + "example");
    const base = exKey && C[exKey].inputs ? { ...C[exKey].inputs } : {};
    for (const inp of R.schema.inputs) {
      if (inp.kind === "select" || (inp.default !== null && inp.default !== undefined)) continue;
      const d = defs[inp.key];
      if (d === undefined || d === 0 || SCHEMA_REVIEWED.has(id + ":" + inp.key)) continue;
      let a, b;
      try { a = cf({ ...base }); b = cf({ ...base, [inp.key]: 0 }); } catch { continue; }
      if (!a || a.error || !b || b.error || JSON.stringify(a) === JSON.stringify(b)) continue;
      bad.push(`${id}: ${inp.key} has no default; blank computes as 0, the compute documents ${d}`);
    }
  }
  assert.deepEqual(bad, []);
});

// A prefilled default must be the compute's own default (or the worked example's
// value). 2026-10-03: a codemod read the compute default 11.5e6 as 11.5, and
// shaft-torsion opened at a 2,887,037-degree twist until an audit caught it.
test("a spec-renderer prefilled default equals the compute default or the example value", async () => {
  const rmap = readFileSync(resolve(ROOT, "test/fixtures/renderer-map.js"), "utf8");
  const bad = [];
  for (const m of rmap.matchAll(/"([a-z0-9-]+)":\s*\{\s*module:\s*"([^"]+)",\s*exportName:\s*"(\w+)"/g)) {
    const [, id, mod, exp] = m;
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const R = (await importCalc(mod))[exp]?.[id];
    if (!R?.schema) continue;
    const C = await importCalc(reg.module);
    const cf = C[reg.fn];
    if (typeof cf !== "function") continue;
    const s = cf.toString();
    const sig = s.slice(0, s.indexOf("{", s.indexOf("}") + 1));
    const defs = Object.fromEntries([...sig.matchAll(/(\w+)\s*=\s*(-?[\d.]+(?:e[-+]?\d+)?)/g)].map((d) => [d[1], Number(d[2])]));
    const exKey = Object.keys(C).find((k) => k.toLowerCase() === reg.fn.replace(/^compute/, "").toLowerCase() + "example");
    const ex = exKey && C[exKey].inputs ? C[exKey].inputs : {};
    for (const inp of R.schema.inputs) {
      if (inp.kind === "select" || typeof inp.default !== "number") continue;
      const d = defs[inp.key];
      if (d === undefined || d === 0 || near(inp.default, d) || (typeof ex[inp.key] === "number" && near(inp.default, ex[inp.key]))) continue;
      if (Math.abs(inp.default / d) < 1e-3 || Math.abs(inp.default / d) > 1e3) bad.push(`${id}: ${inp.key} prefills ${inp.default}, the compute defaults to ${d}`);
    }
  }
  assert.deepEqual(bad, []);
});

// A label that promises a default must deliver it. 2026-10-03: "Climb gradient
// (ft/nm, 200 default)", "Turndown fraction (default 0.30)" and others sent a
// blank as 0. A spec field whose label names a default must be prefilled with it.
test("a spec-renderer field whose label states a default is prefilled with that default", async () => {
  const rmap = readFileSync(resolve(ROOT, "test/fixtures/renderer-map.js"), "utf8");
  const bad = [];
  for (const m of rmap.matchAll(/"([a-z0-9-]+)":\s*\{\s*module:\s*"([^"]+)",\s*exportName:\s*"(\w+)"/g)) {
    const [, id, mod, exp] = m;
    const R = (await importCalc(mod))[exp]?.[id];
    if (!R?.schema) continue;
    for (const inp of R.schema.inputs) {
      if (inp.kind === "select") continue;
      const lm = /\bdefault[:\s]+~?(-?\d[\d.,]*\d|-?\d)|(-?\d[\d.,]*\d|-?\d)\s+default\b/i.exec(inp.label || "");
      if (!lm) continue;
      const stated = Number((lm[1] || lm[2]).replace(/,/g, ""));
      if (!Number.isFinite(stated)) continue;
      const pre = inp.default ?? (inp.attrs && inp.attrs.value !== undefined ? Number(inp.attrs.value) : null);
      if (pre === null || pre === undefined || !near(Number(pre), stated)) bad.push(`${id}: ${inp.key} label says default ${stated}, prefill ${pre}`);
    }
  }
  assert.deepEqual(bad, []);
});

// A prefill is the compute's own default, measured, not read. A calculator
// opens empty (README; 543e0972), and a box that opens filled must hold what
// the compute assumes when the box is absent -- otherwise the page and the
// agent door (which omits the key) answer the same question differently, and
// a sample number passes for the reader's data. 2026-10-05: 827 fields across
// the trade expansions had been prefilled with their tile's worked example
// (levee 3 ft x 500 ft, 13 boxes of a blast design); 797 now open blank and 30
// show the compute's own default instead.
//
// Checked by behavior: the first worked example with the field omitted must
// answer exactly as with the field set to its prefill. The reviewed entries are
// standing published values the page shows and the compute does not encode
// (the door requires them).
const PREFILL_REVIEWED = new Map([
  ["time-alignment::ambient_F", "68 F standard; the compute's null means ask"],
  ["flocculation-g-value::water_temp_f", "59 F design water; null means use mu directly"],
  ["dyno-correction-sae::baro_inhg", "SAE J1349 standard dry-air pressure"],
  ["brake-pad-life::stops_per_mile", "typical urban stop rate shown as a starting point"],
  ["pallet-loadout::cases_per_pallet", "standard GMA-pallet case count"],
  ["tire-gearing::top_gear_ratio", "common overdrive ratio"],
  ["crop-yield::rows_per_pass", "six-row head"],
  ["wallpaper-rolls::roll_width_in", "standard American single roll, 27 in"],
  ["wallpaper-rolls::roll_len_in", "standard American single roll, 27 ft"],
  ["pool-heater-size::target_hours", "the published heat-up planning time"],
  ["seismic-design-spectral-acceleration::fa", "Site Class B, Fa = 1.0"],
  ["seismic-design-spectral-acceleration::fv", "Site Class B, Fv = 1.0"],
  ["srw-geogrid-spacing::base_course_buried_in", "6 in buried base course"],
  ["grout-lift-pour-height::max_pour_height_ft", "TMS 602 5 ft 4 in lift"],
  ["grout-lift-pour-height::max_lift_height_ft", "TMS 602 5 ft 4 in lift"],
  ["kitchen-makeup-air-deficit::door_closer_force_lbf", "8 lbf closer"],
  ["lead-dust-clearance::clearance_limit_ug_ft2", "EPA floor clearance 5 ug/ft2 (2024 rule)"],
]);

test("a prefilled default answers the same as the compute's own default", async () => {
  const { describe } = await import("../../mcp/catalog.mjs");
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const first = new Map();
  for (const r of rows) if (!first.has(r.tile_id)) first.set(r.tile_id, r.inputs);
  const stable = (o) => JSON.stringify(o, (k, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v));
  const bad = [];
  const seen = new Set();
  for (const [id, inputs] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    const d = await describe({ id });
    if (!d || !d.inputs) continue;
    for (const f of d.inputs) {
      if (f.default == null || f.default === "") continue;
      const k = id + "::" + f.key;
      const omitted = { ...inputs };
      delete omitted[f.key];
      const value = f.kind === "number" ? Number(f.default) : f.default;
      let a, b;
      try { a = fn(omitted); b = fn({ ...inputs, [f.key]: value }); } catch { continue; }
      if (stable(a) === stable(b)) continue;
      seen.add(k);
      if (!PREFILL_REVIEWED.has(k)) bad.push(`${k} prefills ${JSON.stringify(f.default)}${a && a.error ? " but the compute has no default" : ", which is not the compute's default"}`);
    }
  }
  assert.deepEqual(bad, []);
  const stale = [...PREFILL_REVIEWED.keys()].filter((k) => !seen.has(k));
  assert.deepEqual(stale, [], "reviewed but now in parity; remove from PREFILL_REVIEWED");
});
