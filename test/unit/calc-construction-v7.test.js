// Unit tests for calc-construction.js v7 utilities (246-251).
// Per spec-v7.md Step 61.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStairStringerV7 as computeStairStringer, stairStringerExampleV7,
  computeHipValleyRafter, hipValleyRafterExample,
  computeRebarSchedule, rebarScheduleExample,
  REBAR_UNIT_WEIGHTS, REBAR_BAR_DIAMETERS_IN,
  computePlywoodSpan, plywoodSpanExample, APA_SPAN_RATINGS,
  computeHelicalPile, helicalPileExample, HELICAL_PILE_KT,
  computeCraneLiftCheck, craneLiftCheckExample,
  CONSTRUCTION_RENDERERS,
} from "../../calc-construction.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- 246 Stair Stringer ---

test("246 example yields finite outputs", () => {
  const r = computeStairStringer(stairStringerExampleV7.inputs);
  assert.ok(r.riser_count > 0);
  assert.ok(r.exact_rise_in > 0);
  assert.ok(r.stringer_length_in > 0);
});

test("246 109 in / 7 in target → 16 risers, exact rise 6.8125", () => {
  const r = computeStairStringer({ total_rise_in: 109, target_rise_in: 7.0, target_tread_in: 11, nosing_in: 1, stringer_thickness_in: 11.25, code_max_rise_in: 7.75, code_min_tread_in: 10 });
  assert.equal(r.riser_count, 16);
  assert.ok(close(r.exact_rise_in, 109 / 16, 0.001));
});

test("246 stringer hypotenuse = sqrt(rise² + run²)", () => {
  const r = computeStairStringer(stairStringerExampleV7.inputs);
  const expected = Math.sqrt(109 * 109 + r.total_run_in * r.total_run_in);
  assert.ok(close(r.stringer_length_in, expected, 0.001));
});

test("246 rise pass when exact_rise <= code_max", () => {
  const r = computeStairStringer({ total_rise_in: 109, target_rise_in: 7.0, target_tread_in: 11, nosing_in: 1, stringer_thickness_in: 11.25, code_max_rise_in: 7.75, code_min_tread_in: 10 });
  assert.equal(r.rise_pass, true);
});

test("246 rise FAIL when exact_rise > code_max", () => {
  // 60 in / 7 target → 9 risers; exact = 6.67. To force fail, set max=6.
  const r = computeStairStringer({ total_rise_in: 60, target_rise_in: 7, target_tread_in: 11, nosing_in: 1, stringer_thickness_in: 11.25, code_max_rise_in: 6, code_min_tread_in: 10 });
  assert.equal(r.rise_pass, false);
});

test("246 tread FAIL when target + nosing < code_min", () => {
  const r = computeStairStringer({ total_rise_in: 109, target_rise_in: 7, target_tread_in: 9, nosing_in: 0, stringer_thickness_in: 11.25, code_max_rise_in: 7.75, code_min_tread_in: 10 });
  assert.equal(r.tread_pass, false);
});

test("246 errors on zero / negative inputs", () => {
  assert.ok(computeStairStringer({ total_rise_in: 0, target_rise_in: 7, target_tread_in: 11 }).error);
  assert.ok(computeStairStringer({ total_rise_in: 109, target_rise_in: 0, target_tread_in: 11 }).error);
  assert.ok(computeStairStringer({ total_rise_in: 109, target_rise_in: 7, target_tread_in: 0 }).error);
});

test("246 angle_deg matches atan2(rise, run)", () => {
  const r = computeStairStringer(stairStringerExampleV7.inputs);
  const expected = Math.atan2(109, r.total_run_in) * 180 / Math.PI;
  assert.ok(close(r.angle_deg, expected, 0.001));
});

test("246 throat_in is positive for an 11.25 inch stringer at 7 inch / 11 inch", () => {
  const r = computeStairStringer(stairStringerExampleV7.inputs);
  assert.ok(r.throat_in > 0);
});

// --- 247 Hip / Valley / Jack Rafter ---

test("247 example yields finite outputs", () => {
  const r = computeHipValleyRafter(hipValleyRafterExample.inputs);
  assert.ok(r.common_run_multiplier > 0);
  assert.ok(r.hip_run_multiplier > r.common_run_multiplier);
  assert.ok(r.common_length_ft > 0);
  assert.ok(r.hip_length_ft > 0);
});

test("247 common multiplier sqrt(P²+144)/12 verified at 6/12", () => {
  const r = computeHipValleyRafter({ run_ft: 14, pitch: 6, pitch_irregular: 0, overhang_in: 0, jack_oc_in: 16 });
  const expected = Math.sqrt(36 + 144) / 12; // 13.4164/12 ≈ 1.118
  assert.ok(close(r.common_run_multiplier, expected, 0.0001));
});

test("247 hip multiplier sqrt(P²+288)/12 (16.97/12 at 0 pitch)", () => {
  const r = computeHipValleyRafter({ run_ft: 14, pitch: 0, pitch_irregular: 0, overhang_in: 0, jack_oc_in: 16 });
  // sqrt(0 + 288)/12 = 16.97/12
  assert.ok(close(r.hip_run_multiplier, 16.97 / 12, 0.001));
});

test("247 hip > common length (geometry)", () => {
  const r = computeHipValleyRafter(hipValleyRafterExample.inputs);
  assert.ok(r.hip_length_ft > r.common_length_ft);
});

test("247 jacks count grows as building run grows", () => {
  const a = computeHipValleyRafter({ run_ft: 8, pitch: 6, pitch_irregular: 0, overhang_in: 0, jack_oc_in: 16 });
  const b = computeHipValleyRafter({ run_ft: 16, pitch: 6, pitch_irregular: 0, overhang_in: 0, jack_oc_in: 16 });
  assert.ok(b.jacks.length > a.jacks.length);
});

test("247 irregular hip second slope renders when pitch_irregular > 0", () => {
  const r = computeHipValleyRafter({ run_ft: 14, pitch: 6, pitch_irregular: 8, overhang_in: 0, jack_oc_in: 16 });
  assert.ok(r.irregular);
  assert.equal(r.irregular.pitch_2, 8);
});

test("247 errors on zero / negative run", () => {
  assert.ok(computeHipValleyRafter({ run_ft: 0, pitch: 6 }).error);
});

// --- 248 Rebar Schedule ---

test("248 example yields finite outputs", () => {
  const r = computeRebarSchedule(rebarScheduleExample.inputs);
  assert.ok(r.detailed.length === 3);
  assert.ok(r.total_weight_lb > 0);
  assert.ok(r.by_size_lb["#5"] > 0);
});

test("248 unit-weight table covers #3 through #11", () => {
  for (const k of ["#3", "#4", "#5", "#6", "#7", "#8", "#9", "#10", "#11"]) {
    assert.ok(REBAR_UNIT_WEIGHTS[k] > 0, "missing " + k);
    assert.ok(REBAR_BAR_DIAMETERS_IN[k] > 0, "missing diameter " + k);
  }
});

test("248 90° bend adds 6 × bar_diameter to length", () => {
  // #5 has db = 0.625 in. Two 90° bends should add 12 × 0.625 = 7.5 in = 0.625 ft.
  const r = computeRebarSchedule({ rows: [{ size: "#5", straight_ft: 10, bends: ["bend_90", "bend_90"], pieces: 1 }] });
  assert.ok(close(r.detailed[0].cut_length_ft, 10 + 7.5 / 12, 0.001));
});

test("248 stirrup adds 14 × db", () => {
  const r = computeRebarSchedule({ rows: [{ size: "#4", straight_ft: 10, bends: ["stirrup"], pieces: 1 }] });
  // db = 0.500; 14 × 0.5 = 7 in
  assert.ok(close(r.detailed[0].cut_length_ft, 10 + 7 / 12, 0.001));
});

test("248 row weight = cut_length × unit_weight × pieces", () => {
  const r = computeRebarSchedule({ rows: [{ size: "#5", straight_ft: 20, bends: [], pieces: 12 }] });
  assert.ok(close(r.detailed[0].row_weight_lb, 20 * 1.043 * 12, 0.01));
});

test("248 unknown bar size errors", () => {
  assert.ok(computeRebarSchedule({ rows: [{ size: "#99", straight_ft: 10, bends: [], pieces: 1 }] }).error);
});

test("248 unknown bend type errors", () => {
  assert.ok(computeRebarSchedule({ rows: [{ size: "#5", straight_ft: 10, bends: ["bend_45"], pieces: 1 }] }).error);
});

test("248 empty rows error", () => {
  assert.ok(computeRebarSchedule({ rows: [] }).error);
});

// --- 249 Plywood Span ---

test("249 example PASSes for 24/16 roof at 24 in OC, 30+8 psf", () => {
  const r = computePlywoodSpan(plywoodSpanExample.inputs);
  assert.equal(r.pass, true);
});

test("249 spacing FAIL when support spacing > allowable", () => {
  const r = computePlywoodSpan({ span_rating: "24/16", panel_thickness_in: 0.5, application: "roof", support_spacing_in: 32, live_load_psf: 30, dead_load_psf: 8 });
  assert.equal(r.spacing_pass, false);
  assert.equal(r.pass, false);
});

test("249 live FAIL when live_load > allowable_live", () => {
  const r = computePlywoodSpan({ span_rating: "24/16", panel_thickness_in: 0.5, application: "roof", support_spacing_in: 24, live_load_psf: 60, dead_load_psf: 8 });
  assert.equal(r.live_pass, false);
});

test("249 24/0 has no floor entry", () => {
  const r = computePlywoodSpan({ span_rating: "24/0", application: "floor", support_spacing_in: 16, live_load_psf: 40, dead_load_psf: 10 });
  assert.ok(r.error);
});

test("249 unknown span rating errors", () => {
  assert.ok(computePlywoodSpan({ span_rating: "99/99", application: "roof", support_spacing_in: 24 }).error);
});

test("249 APA_SPAN_RATINGS covers the five bundled ratings", () => {
  for (const k of ["24/0", "24/16", "32/16", "40/20", "48/24"]) assert.ok(APA_SPAN_RATINGS[k]);
});

// --- 250 Helical Pile ---

test("250 example yields ultimate = Kt × torque", () => {
  const r = computeHelicalPile(helicalPileExample.inputs);
  // 1.5 in solid → Kt 10; 4500 ft·lb → 45000 lb ultimate
  assert.equal(r.Kt, 10);
  assert.equal(r.ultimate_lb, 45000);
});

test("250 allowable = ultimate / FS", () => {
  const r = computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 4000, factor_of_safety: 2 });
  assert.equal(r.allowable_lb, 4000 * 10 / 2);
});

test("250 larger shaft has smaller Kt (more conservative)", () => {
  assert.ok(HELICAL_PILE_KT["3.5_inch_pipe"].Kt < HELICAL_PILE_KT["1.5_inch_solid"].Kt);
});

test("250 unknown shaft errors", () => {
  assert.ok(computeHelicalPile({ shaft: "10_inch_h_pile", torque_ft_lb: 4000 }).error);
});

test("250 zero torque errors", () => {
  assert.ok(computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 0 }).error);
});

test("250 FS < 1 errors", () => {
  assert.ok(computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 4000, factor_of_safety: 0.5 }).error);
});

// --- 251 Crane Lift Quick ---

test("251 example yields finite outputs", () => {
  const r = computeCraneLiftCheck(craneLiftCheckExample.inputs);
  assert.ok(r.gross_load_lb > 0);
  assert.ok(r.per_leg_lb > 0);
  assert.equal(r.input_complete, true);
  assert.ok(typeof r.percent_of_chart === "number");
});

test("251 refuses to render percent-of-chart without chart capacity (input incomplete)", () => {
  const r = computeCraneLiftCheck({ load_lb: 8000, sling_legs: 4, sling_angle_deg: 60, chart_capacity_lb: 0 });
  assert.equal(r.input_complete, false);
  assert.match(r.message, /load chart governs/);
});

test("251 GREEN flag at < 75 percent", () => {
  const r = computeCraneLiftCheck({ load_lb: 5000, sling_legs: 1, sling_angle_deg: 90, chart_capacity_lb: 12000 });
  assert.equal(r.flag, "GREEN");
});

test("251 YELLOW flag at 75-90 percent", () => {
  const r = computeCraneLiftCheck({ load_lb: 9500, sling_legs: 1, sling_angle_deg: 90, chart_capacity_lb: 12000 });
  assert.equal(r.flag, "YELLOW");
});

test("251 RED flag at >= 90 percent", () => {
  const r = computeCraneLiftCheck({ load_lb: 11500, sling_legs: 1, sling_angle_deg: 90, chart_capacity_lb: 12000 });
  assert.equal(r.flag, "RED");
});

test("251 gross load = load + rigging + block + jib_deduct", () => {
  const r = computeCraneLiftCheck({ load_lb: 8000, rigging_lb: 600, block_lb: 250, jib_deduct_lb: 100, sling_legs: 4, sling_angle_deg: 60, chart_capacity_lb: 12000 });
  assert.equal(r.gross_load_lb, 8950);
});

test("251 per-leg tension matches W / (n × sin(theta/2))", () => {
  const r = computeCraneLiftCheck({ load_lb: 8000, sling_legs: 4, sling_angle_deg: 60, chart_capacity_lb: 12000 });
  const expected = 8000 / (4 * Math.sin(30 * Math.PI / 180));
  assert.ok(close(r.per_leg_lb, expected, 1));
});

test("251 zero load errors", () => {
  assert.ok(computeCraneLiftCheck({ load_lb: 0, sling_legs: 1, sling_angle_deg: 90 }).error);
});

test("251 sling angle outside (0,90] errors", () => {
  assert.ok(computeCraneLiftCheck({ load_lb: 1000, sling_legs: 1, sling_angle_deg: 0 }).error);
  assert.ok(computeCraneLiftCheck({ load_lb: 1000, sling_legs: 1, sling_angle_deg: 100 }).error);
});

// --- Renderer registry ---

test("CONSTRUCTION_RENDERERS exposes the 6 v7 ids", () => {
  for (const id of ["stair-stringer-layout", "hip-valley-rafter", "rebar-schedule", "plywood-span", "helical-pile", "crane-lift-quick"]) {
    assert.equal(typeof CONSTRUCTION_RENDERERS[id], "function", id + " should have a renderer");
  }
});
