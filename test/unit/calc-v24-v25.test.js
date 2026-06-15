// spec-v24 (conduit-bending suite, welding/metal/layout, rolling offset, audio
// electronics, and the tire-gearing / spl-distance / bend-allowance
// enhancements) and spec-v25 (surveying coordinate, traverse, curve,
// earthwork, and grading) unit tests. Pins the published constants and the
// multiplier tables so a future edit that swaps an operator or a coefficient
// fails loudly. The canonical worked example for each tile is also exercised
// by the worked-examples runner; this file adds the alternate modes, the
// multiplier-table cross-checks, the inverse round-trips, and the additive
// enhancement behavior (backward-compatible defaults).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeConduitOffset, computeConduitSaddle, computeConduit90Stub,
} from "../../calc-fab.js";
import {
  computeWeldHeatInput, computeMetalWeight, computeLayoutSquaring,
  computeHorizontalCurve, computeVerticalCurve, computeEarthworkEndArea, computeSlopeStakeCutFill,
  computeBendAllowance,
} from "../../calc-construction.js";
import { computeRollingOffset } from "../../calc-cross.js";
import { computeSpeakerImpedance, computeDecibelConverter, computeAmpPowerSpl, computeSPL } from "../../calc-stage.js";
import { computeTireGearing } from "../../calc-mechanic.js";
import { computeAreaByCoordinates, computeTraverseClosure } from "../../calc-survey.js";

const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

// --- A.1 conduit-offset: the cosecant multiplier table ---
test("conduit-offset: cosecant multipliers 30/45/22.5/60 deg match the field rules", () => {
  assert.ok(near(computeConduitOffset({ offset_in: 1, angle_deg: 30 }).multiplier, 2.0));
  assert.ok(near(computeConduitOffset({ offset_in: 1, angle_deg: 45 }).multiplier, 1.41421));
  assert.ok(near(computeConduitOffset({ offset_in: 1, angle_deg: 22.5 }).multiplier, 2.61313));
  assert.ok(near(computeConduitOffset({ offset_in: 1, angle_deg: 60 }).multiplier, 1.1547));
  assert.ok(near(computeConduitOffset({ offset_in: 1, angle_deg: 10 }).multiplier, 5.7588, 1e-3));
  assert.ok("error" in computeConduitOffset({ offset_in: 0, angle_deg: 30 }));
});

// --- A.2 conduit-saddle: both presets, four-point ---
test("conduit-saddle: 60/30 preset and four-point mode stay finite", () => {
  const s = computeConduitSaddle({ mode: "three-point", depth_in: 3, preset: "60/30" });
  assert.ok(near(s.mark_spacing_in, 6.0));
  assert.ok(near(s.shrink_in, 0.75));
  assert.strictEqual(s.center_bend_deg, 60);
  const f = computeConduitSaddle({ mode: "four-point", depth_in: 2, preset: "45/22.5", width_in: 6 });
  assert.ok(Number.isFinite(f.mark_spacing_in));
  assert.ok("error" in computeConduitSaddle({ mode: "three-point", depth_in: -1, preset: "45/22.5" }));
});

// --- A.3 conduit-90-stub: back-to-back, segment, impractical flag ---
test("conduit-90-stub: segment shot count, impractical-deduct flag", () => {
  assert.strictEqual(computeConduit90Stub({ mode: "segment-90", radius_in: 10, per_shot_deg: 5 }).n_shots, 18);
  assert.ok(near(computeConduit90Stub({ mode: "segment-90", radius_in: 10, per_shot_deg: 5 }).arc_per_shot_in, 0.87266, 1e-3));
  const imp = computeConduit90Stub({ mode: "stub-up", height_in: 4, deduct_in: 6 });
  assert.strictEqual(imp.impractical, true);
  assert.ok("error" in computeConduit90Stub({ mode: "segment-90", radius_in: 0, per_shot_deg: 5 }));
});

// --- E.1 weld-heat-input: kJ/mm toggle, WPS pass/fail, eta bounds ---
test("weld-heat-input: kJ/mm conversion and WPS range flag", () => {
  const r = computeWeldHeatInput({ process: "SMAW", voltage_V: 25, current_A: 200, travel_in_min: 8, efficiency: 0.8 });
  assert.ok(near(r.heat_input_kj_mm, 30 * 0.0393701, 1e-4));
  const pass = computeWeldHeatInput({ process: "SMAW", voltage_V: 25, current_A: 200, travel_in_min: 8, efficiency: 0.8, wps_min_kj_in: 20, wps_max_kj_in: 35 });
  assert.strictEqual(pass.pass, true);
  const fail = computeWeldHeatInput({ process: "SMAW", voltage_V: 25, current_A: 200, travel_in_min: 8, efficiency: 0.8, wps_min_kj_in: 5, wps_max_kj_in: 25 });
  assert.strictEqual(fail.pass, false);
  assert.ok("error" in computeWeldHeatInput({ process: "SMAW", voltage_V: 25, current_A: 200, travel_in_min: 8, efficiency: 1.5 }));
});

// --- E.2 metal-weight: tube area, hex area, lb<->kg ---
test("metal-weight: tube and hex cross sections, kg round-trip", () => {
  assert.ok(near(computeMetalWeight({ shape: "round-tube", dia_in: 2, id_in: 1.5, length_in: 10, quantity: 1, density_lb_in3: 0.2836 }).cross_section_area_in2, 1.37445, 1e-4));
  assert.ok(near(computeMetalWeight({ shape: "hex-bar", width_in: 1, length_in: 10, quantity: 1, density_lb_in3: 0.2836 }).cross_section_area_in2, 0.866, 1e-3));
  const r = computeMetalWeight({ shape: "plate", width_in: 12, thickness_in: 1, length_in: 120, quantity: 1, density_lb_in3: 0.2836 });
  assert.ok(near(r.weight_total_kg, 408.384 * 0.453592, 1e-2));
  assert.ok("error" in computeMetalWeight({ shape: "plate", width_in: 12, thickness_in: 1, length_in: 120, quantity: 1, density_lb_in3: -1 }));
});

// --- E.3 layout-squaring: check-square mode ---
test("layout-squaring: check-square out-of-square and 12-16-20 triple", () => {
  assert.strictEqual(computeLayoutSquaring({ mode: "find-diagonal", side_a: 12, side_b: 16 }).ideal_diagonal, 20);
  const sq = computeLayoutSquaring({ mode: "check-square", side_a: 3, side_b: 4, diag1: 5, diag2: 5 });
  assert.strictEqual(sq.out_of_square, 0);
  const off = computeLayoutSquaring({ mode: "check-square", side_a: 3, side_b: 4, diag1: 5.2, diag2: 5 });
  assert.ok(near(off.out_of_square, 0.2));
  assert.ok("error" in computeLayoutSquaring({ mode: "find-diagonal", side_a: -1, side_b: 4 }));
});

// --- v25 E.1 horizontal-curve: degree mode + external + PC/PT ---
test("horizontal-curve: degree-definition mode and PC/PT stationing", () => {
  const r = computeHorizontalCurve({ mode: "degree", degree_of_curve: 5.72958, delta_deg: 30, pi_station_ft: 5000 });
  assert.ok(near(r.radius_ft, 1000, 0.5));
  assert.ok(near(r.external_ft, 35.276, 1e-2));
  assert.ok(near(r.pt_station_ft - r.pc_station_ft, r.curve_length_ft, 1e-6));
  assert.ok("error" in computeHorizontalCurve({ mode: "radius", radius_ft: 1000, delta_deg: 200 }));
});

// --- v25 E.2 vertical-curve: BVC/EVC + straight-grade degenerate ---
test("vertical-curve: BVC/EVC elevations and equal-grade straight path", () => {
  const r = computeVerticalCurve({ g1_pct: 3, g2_pct: -2, length_ft: 400, pvi_station_ft: 5000, pvi_elevation_ft: 100 });
  assert.ok(near(r.bvc_elev_ft, 94, 1e-6));
  assert.ok(near(r.evc_elev_ft, 96, 1e-6));
  assert.strictEqual(r.turning_type, "crest");
  const flat = computeVerticalCurve({ g1_pct: 2, g2_pct: 2, length_ft: 400, pvi_station_ft: 5000, pvi_elevation_ft: 100 });
  assert.strictEqual(flat.turning_station_ft, null);
  assert.ok("error" in computeVerticalCurve({ g1_pct: 3, g2_pct: -2, length_ft: 0, pvi_station_ft: 5000, pvi_elevation_ft: 100 }));
});

// --- v25 E.3 earthwork: prismoidal + swell factor + yd3 ---
test("earthwork-end-area: prismoidal equals end-area for a linear section; swell factor", () => {
  const r = computeEarthworkEndArea({ areas: [100, 100], interval_ft: 100, mid_area_ft2: 100 });
  assert.strictEqual(r.prismoidal_ft3, 10000);
  assert.ok(near(r.total_yd3, 370.3704, 1e-3));
  const adj = computeEarthworkEndArea({ areas: [100, 100], interval_ft: 100, swell_shrink_factor: 1.25 });
  assert.strictEqual(adj.adjusted_ft3, 12500);
  assert.ok("error" in computeEarthworkEndArea({ areas: [100], interval_ft: 100 }));
});

// --- v25 E.4 slope-stake: fill direction + on-grade ---
test("slope-stake-cut-fill: fill case and on-grade zero", () => {
  const fill = computeSlopeStakeCutFill({ existing_elev_ft: 98, design_elev_ft: 100, slope_ratio_h: 2, offset_at_hinge_ft: 0 });
  assert.strictEqual(fill.which, "fill");
  assert.strictEqual(fill.catch_offset_ft, 4);
  const on = computeSlopeStakeCutFill({ existing_elev_ft: 100, design_elev_ft: 100, slope_ratio_h: 2 });
  assert.strictEqual(on.which, "on grade");
  assert.strictEqual(on.magnitude_ft, 0);
  assert.ok("error" in computeSlopeStakeCutFill({ existing_elev_ft: 100, design_elev_ft: 99, slope_ratio_h: 0 }));
});

// --- G.1 rolling-offset: multiplier table + degenerate ---
test("rolling-offset: cosecant table and run advance", () => {
  assert.ok(near(computeRollingOffset({ rise_in: 0, roll_in: 1, angle_deg: 22.5 }).multiplier, 2.61313));
  assert.ok(near(computeRollingOffset({ rise_in: 0, roll_in: 1, angle_deg: 11.25 }).multiplier, 5.12583, 1e-3));
  const r = computeRollingOffset({ rise_in: 12, roll_in: 9, angle_deg: 45 });
  assert.ok(near(r.travel_in, 21.2132));
  assert.ok(near(r.run_advance_in, 15));
  assert.ok("error" in computeRollingOffset({ rise_in: 12, roll_in: 9, angle_deg: 90 }));
});

// --- N.1 speaker-impedance: series + below-min flag ---
test("speaker-impedance: series sum, parallel split, below-amp-min verdict", () => {
  assert.strictEqual(computeSpeakerImpedance({ topology: "series", z_ohm: 8, count: 2 }).z_total_ohm, 16);
  assert.strictEqual(computeSpeakerImpedance({ topology: "parallel", z_ohm: 8, count: 4, amp_min_ohm: 4 }).safe, false);
  assert.strictEqual(computeSpeakerImpedance({ topology: "parallel", z_ohm: 8, count: 2, amp_min_ohm: 4 }).safe, true);
  assert.ok("error" in computeSpeakerImpedance({ topology: "series", z_ohm: 8, count: 0 }));
});

// --- N.2 decibel-converter: 20log voltage, dBu reference, combine ---
test("decibel-converter: voltage 20log, dBu back-solve, incoherent combine", () => {
  assert.ok(near(computeDecibelConverter({ mode: "voltage-ratio", v1: 1, v2: 2 }).db, 6.0206));
  assert.ok(near(computeDecibelConverter({ mode: "reference-level", level_db: 4, ref_type: "dBu" }).linear_value, 1.2283, 1e-3));
  assert.ok(near(computeDecibelConverter({ mode: "combine", levels: [90, 90] }).db, 93.0103));
  assert.ok("error" in computeDecibelConverter({ mode: "voltage-ratio", v1: 1, v2: 0 }));
});

// --- N.3 amp-power-spl: +3 dB doubling + inverse round-trip ---
test("amp-power-spl: power doubling gives +3 dB; inverse round-trips", () => {
  assert.ok(near(computeAmpPowerSpl({ sensitivity_db: 90, power_w: 200, distance_m: 1 }).spl_db, 113.0103));
  const inv = computeAmpPowerSpl({ sensitivity_db: 90, power_w: 100, distance_m: 1, target_spl_db: 110 });
  assert.ok(near(inv.power_for_target_w, 100, 1e-6));
  assert.ok("error" in computeAmpPowerSpl({ sensitivity_db: 90, power_w: 0, distance_m: 1 }));
});

// --- P.1 area-by-coordinates: winding flip + triangle ---
test("area-by-coordinates: winding sign and 3-4-5 triangle area", () => {
  const ccw = computeAreaByCoordinates({ points: [{ n: 0, e: 0 }, { n: 0, e: 100 }, { n: 100, e: 100 }, { n: 100, e: 0 }] });
  const cw = computeAreaByCoordinates({ points: [{ n: 0, e: 0 }, { n: 100, e: 0 }, { n: 100, e: 100 }, { n: 0, e: 100 }] });
  assert.strictEqual(ccw.area_ft2, cw.area_ft2);
  assert.notStrictEqual(ccw.winding, cw.winding);
  assert.strictEqual(computeAreaByCoordinates({ points: [{ n: 0, e: 0 }, { n: 0, e: 4 }, { n: 3, e: 0 }] }).area_ft2, 6);
  assert.ok("error" in computeAreaByCoordinates({ points: [{ n: 0, e: 0 }, { n: 1, e: 1 }] }));
});

// --- P.2 traverse-closure: perfect closure + open precision ---
test("traverse-closure: rectangle closes perfectly; open traverse precision ratio", () => {
  const rect = computeTraverseClosure({ courses: [{ azimuth_deg: 0, distance: 100 }, { azimuth_deg: 90, distance: 200 }, { azimuth_deg: 180, distance: 100 }, { azimuth_deg: 270, distance: 200 }] });
  assert.ok(rect.linear_misclosure < 1e-6);
  assert.strictEqual(rect.relative_precision_denominator, null);
  const open = computeTraverseClosure({ courses: [{ azimuth_deg: 0, distance: 100 }, { azimuth_deg: 90, distance: 100 }] });
  assert.ok(near(open.relative_precision_denominator, 1.41421));
  assert.ok("error" in computeTraverseClosure({ courses: [] }));
});

// --- EN.1 tire-gearing: speedometer error (additive, backward-compatible) ---
test("tire-gearing EN.1: equal tires give 0% error; larger tire under-reads; legacy fields intact", () => {
  const same = computeTireGearing({ original_size: "265/70R17", new_size: "265/70R17", axle_ratio: 3.55, top_gear_ratio: 0.69, indicated_mph: 60 });
  assert.strictEqual(same.speedo_error_pct, 0);
  assert.strictEqual(same.actual_mph, 60);
  assert.ok(Number.isFinite(same.cruise_mph)); // legacy output still present
  const bigger = computeTireGearing({ original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 3.55, top_gear_ratio: 0.69, indicated_mph: 60 });
  assert.ok(bigger.speedo_error_pct > 0);
  assert.ok(bigger.actual_mph > 60);
  const noind = computeTireGearing({ original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 3.55, top_gear_ratio: 0.69 });
  assert.strictEqual(noind.actual_mph, null);
});

// --- EN.2 spl-distance: incoherent source summation (additive) ---
test("spl-distance EN.2: N=1 reproduces base SPL; N=2 adds 3.01 dB; N<1 rejected", () => {
  const one = computeSPL({ L1_dB: 110, d1: 1, d2: 30, mode: "free_field", n_sources: 1 });
  assert.strictEqual(one.L2_combined_dB, one.L2_dB);
  const two = computeSPL({ L1_dB: 110, d1: 1, d2: 30, mode: "free_field", n_sources: 2 });
  assert.ok(near(two.L2_combined_dB - two.L2_dB, 3.0103));
  const base = computeSPL({ L1_dB: 110, d1: 1, d2: 30, mode: "free_field" });
  assert.ok(Number.isFinite(base.L2_dB)); // default n_sources keeps prior output
  assert.ok("error" in computeSPL({ L1_dB: 110, d1: 1, d2: 30, n_sources: 0 }));
});

// --- EN.3 bend-allowance: bend deduction (additive) ---
test("bend-allowance EN.3: BD = 2*OSSB - BA and flat = legs - BD", () => {
  const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
  assert.ok(Number.isFinite(r.bend_deduction_in));
  assert.ok(near(r.bend_deduction_in, 2 * r.setback_in - r.bend_allowance_in, 1e-9));
  assert.ok(near(r.flat_blank_in, 2 + 3 - r.bend_deduction_in, 1e-9));
});
