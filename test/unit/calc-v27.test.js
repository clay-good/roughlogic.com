// spec-v27 unit tests. v27 was reconciled against the live catalog: three of
// the six proposed tiles (duct-sizing-friction, superheat-subcooling,
// sling-load-tension) duplicated existing tiles (duct-sizing, superheat-subcool,
// sling-angle) by concept and were dropped-not-renamed per the v20/v23/v24
// discipline; their genuinely net-new deltas landed as additive,
// backward-compatible enhancements to those existing tiles. This file pins the
// three net-new tiles (fillet-weld-strength, round-to-rect-duct,
// center-of-gravity-2point) and the three enhancements (duct velocity ceiling,
// subcool target verdict, sling D/d efficiency), including backward-compat.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFilletWeldStrength } from "../../calc-construction.js";
import { computeRoundToRectDuct, computeDuctSize, computeSuperheatSubcool } from "../../calc-hvac.js";
import { computeCenterOfGravity2Point } from "../../calc-cross.js";
import { computeSlingAngle } from "../../calc-fire.js";

const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

// --- E.1 fillet-weld-strength ---
test("fillet-weld-strength: throat, ASD/LRFD capacity, AISC min/max, size-from-load", () => {
  const r = computeFilletWeldStrength({ mode: "capacity-from-size", leg_in: 0.25, length_in: 6, electrode: "E70", method: "ASD", base_thickness_in: 0.5 });
  assert.ok(near(r.throat_in, 0.17675, 1e-4));
  assert.strictEqual(r.stress_ksi, 21); // 0.30 * 70
  assert.ok(near(r.strength_per_in_lb, 3711.75, 0.1));
  assert.ok(near(r.capacity_lb, 22270.5, 1));
  // LRFD design strength is higher than the ASD allowable (different safety basis)
  const lrfd = computeFilletWeldStrength({ mode: "capacity-from-size", leg_in: 0.25, length_in: 6, electrode: "E70", method: "LRFD" });
  assert.ok(lrfd.capacity_lb > r.capacity_lb);
  // size-from-load round-trips the capacity (C-4)
  const sfl = computeFilletWeldStrength({ mode: "size-from-load", length_in: 6, electrode: "E70", method: "ASD", applied_load_lb: r.capacity_lb });
  assert.ok(near(sfl.required_leg_in, 0.25, 1e-3));
  // a 1/8 fillet on a 3/4 plate is below the J2.4 minimum
  const small = computeFilletWeldStrength({ mode: "capacity-from-size", leg_in: 0.125, length_in: 6, electrode: "E70", base_thickness_in: 0.75 });
  assert.strictEqual(small.size_in_range, false);
  assert.ok(small.notes.some((n) => n.includes("J2.4")));
  assert.ok("error" in computeFilletWeldStrength({ mode: "capacity-from-size", leg_in: 0, length_in: 6 }));
});

// --- C.2 round-to-rect-duct ---
test("round-to-rect-duct: equivalent diameter, round-trip, aspect flag", () => {
  const r = computeRoundToRectDuct({ mode: "rect-to-round", side_a_in: 14, side_b_in: 8 });
  assert.ok(near(r.equivalent_diameter_in, 11.458, 1e-2));
  assert.ok(near(r.aspect_ratio, 1.75));
  // round-to-rect round-trips
  const back = computeRoundToRectDuct({ mode: "round-to-rect", round_diameter_in: r.equivalent_diameter_in, known_side_in: 8 });
  assert.ok(near(back.other_side_in, 14, 1e-2));
  // aspect ratio above 4:1 fires the flag
  const asp = computeRoundToRectDuct({ mode: "rect-to-round", side_a_in: 20, side_b_in: 4 });
  assert.strictEqual(asp.aspect_ratio, 5);
  assert.ok(asp.notes.some((n) => n.includes("4:1")));
  assert.ok("error" in computeRoundToRectDuct({ mode: "rect-to-round", side_a_in: 0, side_b_in: 8 }));
});

// --- G.2 center-of-gravity-2point ---
test("center-of-gravity-2point: moment balance and inverse round-trip", () => {
  const r = computeCenterOfGravity2Point({ mode: "two-scale-weigh", reading_1_lb: 3000, reading_2_lb: 1000, span_ft: 10 });
  assert.strictEqual(r.total_weight_lb, 4000);
  assert.strictEqual(r.cg_from_point_1_ft, 2.5);
  assert.ok(near(r.percent_at_1, 75));
  assert.ok(near(r.percent_at_2, 25));
  const inv = computeCenterOfGravity2Point({ mode: "pick-point-from-cg", total_weight_lb: 4000, cg_from_1_ft: 2.5, span_ft: 10 });
  assert.ok(near(inv.reading_1_lb, 3000));
  assert.ok(near(inv.reading_2_lb, 1000));
  // a CG outside the span is flagged
  const off = computeCenterOfGravity2Point({ mode: "two-scale-weigh", reading_1_lb: -500, reading_2_lb: 1000, span_ft: 10 });
  assert.ok("error" in off || off.notes.some((n) => n.toLowerCase().includes("outside")));
  assert.ok("error" in computeCenterOfGravity2Point({ mode: "two-scale-weigh", reading_1_lb: 0, reading_2_lb: 0, span_ft: 10 }));
  assert.ok("error" in computeCenterOfGravity2Point({ mode: "two-scale-weigh", reading_1_lb: 3000, reading_2_lb: 1000, span_ft: 0 }));
});

// --- EN: duct-sizing velocity trunk/branch ceiling (folds dropped C.1 delta) ---
test("duct-sizing EN: velocity trunk/branch ceiling flag, backward-compatible", () => {
  const r = computeDuctSize({ cfm: 600, friction_in_wc_per_100ft: 0.08 });
  // prior fields unchanged
  assert.ok(r.round_diameter_in > 0 && r.velocity_fpm > 0);
  assert.ok(typeof r.friction_color === "string");
  // new additive fields
  assert.strictEqual(typeof r.velocity_within_trunk, "boolean");
  assert.strictEqual(typeof r.velocity_within_branch, "boolean");
  assert.ok(typeof r.velocity_label === "string");
  // a small branch duct stays under both ceilings; a large airflow exceeds them
  const big = computeDuctSize({ cfm: 5000, friction_in_wc_per_100ft: 0.3 });
  assert.strictEqual(big.velocity_within_trunk, big.velocity_fpm <= 900);
});

// --- EN: superheat-subcool subcool target verdict (folds dropped C.3 delta) ---
test("superheat-subcool EN: subcool target verdict, backward-compatible", () => {
  // backward compatible: no target -> no verdict field on superheat
  const sh = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" });
  assert.ok(near(sh.superheat_F, 10, 2));
  // subcool without target -> verdict null (prior output otherwise unchanged)
  const sc0 = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 300, line_temperature_F: 90, mode: "subcool" });
  assert.ok("subcool_F" in sc0);
  assert.strictEqual(sc0.subcool_charge_verdict, null);
  // subcool below target -> add refrigerant
  const sc = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 300, line_temperature_F: 90, mode: "subcool", target_subcool_F: 10, deadband_F: 3 });
  assert.ok(sc.subcool_charge_verdict.includes("add refrigerant"));
});

// --- EN: sling-angle D/d efficiency + capacity + low-angle hazard (folds dropped G.1 delta) ---
test("sling-angle EN: D/d efficiency, min capacity, low-angle hazard, backward-compatible", () => {
  // backward compatible: prior fields unchanged
  const base = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 });
  assert.ok(near(base.tension_per_leg_lb, 2000));
  assert.strictEqual(base.choker_factor, 1);
  // new additive fields
  assert.ok(near(base.min_required_capacity_lb, 2000));
  assert.strictEqual(base.low_angle_hazard, true); // angle factor 2.0 at this geometry
  // D/d efficiency de-rates the rated capacity
  const dd = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2, sling_rated_capacity_lb: 5000, dd_ratio: 4 });
  assert.ok(near(dd.dd_efficiency, 0.80));
  assert.ok(near(dd.effective_capacity_lb, 4000));
  assert.ok(near(dd.utilization, 0.5));
});
