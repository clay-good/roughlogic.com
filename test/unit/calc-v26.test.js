// spec-v26 unit tests: electrician feeder/transformer (Group A), plumber
// blend/tank/velocity (Group B), and the pipefitter's bench (Group G). Pins
// the published constants, the alternate modes, the inverse round-trips, and
// the edge-case flags (over-limit, impractical, degenerate, over-yield). The
// canonical worked example for each tile is also exercised by the
// worked-examples runner; this file adds the modes and the flag thresholds.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMotorFeederMultiple, computeTransformerConductorProtection,
} from "../../calc-feeder.js";
import {
  computeMixedWaterTemp, computePressureTankDrawdown, computePipeVelocity,
} from "../../calc-plumbing.js";
import {
  computePipeFittingTakeout, computePipeMiterCut, computePipeTemplateWrap, computeFlangeBoltTorque,
} from "../../calc-fab.js";

const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

// --- A.1 motor-feeder-multiple ---
test("motor-feeder-multiple: 430.24 conductor and 430.62 device, next size down", () => {
  const r = computeMotorFeederMultiple({ motors: [{ flc_A: 28, branch_device_A: 40 }, { flc_A: 16, branch_device_A: 25 }, { flc_A: 10, branch_device_A: 15 }] });
  assert.strictEqual(r.conductor_min_A, 61); // 1.25*28 + 16 + 10
  assert.strictEqual(r.feeder_ocpd_raw_A, 66); // 40 + 16 + 10
  assert.strictEqual(r.feeder_ocpd_max_A, 60); // next standard size down
  // single motor reproduces the motor-branch 125% conductor (C-4 cross-check)
  const one = computeMotorFeederMultiple({ motors: [{ flc_A: 28, branch_device_A: 40 }] });
  assert.ok(near(one.conductor_min_A, 35)); // 1.25 * 28
  assert.ok("error" in computeMotorFeederMultiple({ motors: [] }));
  assert.ok("error" in computeMotorFeederMultiple({ motors: [{ flc_A: 0, branch_device_A: 40 }] }));
});

// --- A.2 transformer-conductor-protection ---
test("transformer-conductor-protection: FLA and 450.3(B) bands", () => {
  const r = computeTransformerConductorProtection({ kva: 45, primary_v: 480, secondary_v: 208, phase: 3, secondary_protection: false });
  assert.ok(near(r.primary_fla_A, 54.1274, 1e-2));
  assert.ok(near(r.secondary_fla_A, 124.9094, 1e-2));
  assert.strictEqual(r.primary_ocpd_max_A, 70); // 1.25*54.13 = 67.66 -> next std up 70 (Note 1)
  // FLA cross-check single phase
  const sp = computeTransformerConductorProtection({ kva: 10, primary_v: 240, secondary_v: 120, phase: 1, secondary_protection: false });
  assert.ok(near(sp.primary_fla_A, 41.6667, 1e-2)); // 10000/240
  // primary-and-secondary changes the band (250% primary)
  const both = computeTransformerConductorProtection({ kva: 45, primary_v: 480, secondary_v: 208, phase: 3, secondary_protection: true });
  assert.ok(both.secondary_ocpd_max_A !== null);
  assert.ok(both.primary_ocpd_max_A >= r.primary_ocpd_max_A); // 250% allowance > 125%
  assert.ok("error" in computeTransformerConductorProtection({ kva: 45, primary_v: 0, secondary_v: 208, phase: 3 }));
});

// --- B.1 mixed-water-temp ---
test("mixed-water-temp: blend, ratio, and hot-flow modes + scald flag", () => {
  assert.strictEqual(computeMixedWaterTemp({ mode: "find-blend", hot_temp_F: 140, cold_temp_F: 60, hot_gpm: 1, cold_gpm: 1 }).blend_temp_F, 100);
  const ratio = computeMixedWaterTemp({ mode: "find-mix-ratio", hot_temp_F: 140, cold_temp_F: 60, target_temp_F: 105 });
  assert.ok(near(ratio.hot_fraction, 0.5625));
  assert.ok(near(ratio.percent_hot, 56.25));
  const hf = computeMixedWaterTemp({ mode: "find-hot-flow", hot_temp_F: 140, cold_temp_F: 60, target_temp_F: 100, cold_gpm: 1 });
  assert.ok(near(hf.hot_gpm, 1)); // 100 F is the midpoint -> equal flows
  // a target above the hot supply is rejected
  assert.ok("error" in computeMixedWaterTemp({ mode: "find-mix-ratio", hot_temp_F: 140, cold_temp_F: 60, target_temp_F: 150 }));
  // a delivered temperature above the scald limit fires the flag, not a block
  const hot = computeMixedWaterTemp({ mode: "find-blend", hot_temp_F: 160, cold_temp_F: 60, hot_gpm: 3, cold_gpm: 1 });
  assert.ok(hot.blend_temp_F > 120);
  assert.ok(hot.notes.some((n) => n.toLowerCase().includes("scald")));
  assert.ok("error" in computeMixedWaterTemp({ mode: "find-blend", hot_temp_F: 140, cold_temp_F: 60, hot_gpm: 0, cold_gpm: 0 }));
});

// --- B.2 pressure-tank-drawdown ---
test("pressure-tank-drawdown: Boyle's-law drawdown and size round-trip", () => {
  const r = computePressureTankDrawdown({ mode: "find-drawdown", tank_volume_gal: 44, cut_in_psi: 40, cut_out_psi: 60, pump_gpm: 10 });
  assert.ok(near(r.drawdown_gal, 11.3497, 1e-2));
  assert.strictEqual(r.precharge_psi, 38); // default cut-in - 2
  assert.ok(near(r.runtime_min, 1.135, 1e-2));
  // size mode round-trips the drawdown (C-4)
  const sized = computePressureTankDrawdown({ mode: "size-the-tank", target_drawdown_gal: r.drawdown_gal, cut_in_psi: 40, cut_out_psi: 60 });
  assert.ok(near(sized.tank_volume_gal, 44, 1e-3));
  // cut-out <= cut-in rejected; precharge >= cut-in flagged (not negative drawdown)
  assert.ok("error" in computePressureTankDrawdown({ mode: "find-drawdown", tank_volume_gal: 44, cut_in_psi: 60, cut_out_psi: 40 }));
  const high = computePressureTankDrawdown({ mode: "find-drawdown", tank_volume_gal: 44, cut_in_psi: 40, cut_out_psi: 60, precharge_psi: 45 });
  assert.ok(high.notes.some((n) => n.includes("will not draw down")));
  // pump_gpm = 0 suppresses runtime rather than dividing by zero
  const noPump = computePressureTankDrawdown({ mode: "find-drawdown", tank_volume_gal: 44, cut_in_psi: 40, cut_out_psi: 60 });
  assert.strictEqual(noPump.runtime_min, null);
});

// --- B.3 pipe-velocity ---
test("pipe-velocity: continuity, ceiling verdict, and max-flow round-trip", () => {
  const r = computePipeVelocity({ mode: "velocity-from-flow", flow_gpm: 10, diameter_in: 0.785, material: "copper", service: "hot" });
  assert.ok(near(r.velocity_fps, 6.629, 1e-2));
  assert.strictEqual(r.ceiling_fps, 5);
  assert.strictEqual(r.verdict, "over-limit");
  // cold service raises the copper ceiling to 8 ft/s
  const cold = computePipeVelocity({ mode: "velocity-from-flow", flow_gpm: 10, diameter_in: 0.785, material: "copper", service: "cold" });
  assert.strictEqual(cold.ceiling_fps, 8);
  // max-flow mode round-trips the velocity (C-4)
  const mf = computePipeVelocity({ mode: "max-flow-for-velocity", diameter_in: 0.785, material: "copper", service: "hot", target_velocity_fps: r.velocity_fps });
  assert.ok(near(mf.max_flow_gpm, 10, 1e-2));
  assert.ok("error" in computePipeVelocity({ flow_gpm: 10, diameter_in: 0 }));
});

// --- G.1 pipe-fitting-takeout ---
test("pipe-fitting-takeout: center-to-center cut and impractical flag", () => {
  assert.strictEqual(computePipeFittingTakeout({ reference: "center-to-center", dimension_in: 24, takeout_a_in: 1.5, takeout_b_in: 1.5, makeup_a_in: 0.5, makeup_b_in: 0.5 }).cut_length_in, 22);
  // face-to-face does not subtract take-outs
  assert.strictEqual(computePipeFittingTakeout({ reference: "face-to-face", dimension_in: 24, takeout_a_in: 1.5, takeout_b_in: 1.5, makeup_a_in: 0.5, makeup_b_in: 0.5 }).cut_length_in, 25);
  // fittings consume the whole run -> flagged impractical, not leaked negative
  const small = computePipeFittingTakeout({ reference: "center-to-center", dimension_in: 2, takeout_a_in: 1.5, takeout_b_in: 1.5 });
  assert.ok(small.impractical);
  assert.ok("error" in computePipeFittingTakeout({ dimension_in: 0 }));
});

// --- G.2 pipe-miter-cut ---
test("pipe-miter-cut: per-cut angle table and cutback", () => {
  assert.strictEqual(computePipeMiterCut({ total_angle_deg: 90, pieces: 2, outside_diameter_in: 12.75 }).miter_angle_deg, 45);
  assert.strictEqual(computePipeMiterCut({ total_angle_deg: 90, pieces: 2, outside_diameter_in: 12.75 }).n_welds, 1);
  assert.strictEqual(computePipeMiterCut({ total_angle_deg: 90, pieces: 3, outside_diameter_in: 12.75 }).miter_angle_deg, 22.5);
  assert.strictEqual(computePipeMiterCut({ total_angle_deg: 90, pieces: 4, outside_diameter_in: 12.75 }).miter_angle_deg, 15);
  assert.strictEqual(computePipeMiterCut({ total_angle_deg: 90, pieces: 4, outside_diameter_in: 12.75 }).n_welds, 3);
  assert.ok(near(computePipeMiterCut({ total_angle_deg: 90, pieces: 3, outside_diameter_in: 12.75 }).cutback_in, 5.2812, 1e-3));
  assert.ok("error" in computePipeMiterCut({ total_angle_deg: 90, pieces: 1, outside_diameter_in: 12.75 }));
  assert.ok("error" in computePipeMiterCut({ total_angle_deg: 200, pieces: 3, outside_diameter_in: 12.75 }));
});

// --- G.3 pipe-template-wrap ---
test("pipe-template-wrap: ordinate table, square cut, and station floor", () => {
  const r = computePipeTemplateWrap({ outside_diameter_in: 6.625, cut_angle_deg: 45, stations: 8 });
  assert.ok(near(r.max_ordinate_in, 6.625));
  assert.ok(near(r.circumference_in, Math.PI * 6.625));
  assert.strictEqual(r.ordinates.length, 8);
  // square cut -> all ordinates zero
  assert.ok(computePipeTemplateWrap({ outside_diameter_in: 6.625, cut_angle_deg: 0, stations: 8 }).ordinates.every((o) => o.ordinate_in === 0));
  assert.ok("error" in computePipeTemplateWrap({ outside_diameter_in: 6.625, cut_angle_deg: 45, stations: 3 }));
});

// --- G.4 flange-bolt-torque ---
test("flange-bolt-torque: preload, torque, cross sequence, over-yield flag", () => {
  const r = computeFlangeBoltTorque({ bolt_diameter_in: 0.75, bolt_count: 8, target_percent_yield: 50, yield_ksi: 105, nut_factor_k: 0.18 });
  assert.ok(near(r.preload_lb, 17535, 1));
  assert.ok(near(r.torque_ftlb, 197.27, 0.1));
  assert.deepStrictEqual(r.tightening_sequence, [1, 5, 3, 7, 2, 6, 4, 8]);
  // over-yield target is flagged, not silently produced
  assert.ok(computeFlangeBoltTorque({ bolt_diameter_in: 0.75, bolt_count: 8, target_percent_yield: 120, yield_ksi: 105, nut_factor_k: 0.18 }).notes.some((n) => n.includes("over-tension")));
  assert.ok("error" in computeFlangeBoltTorque({ bolt_diameter_in: 0, bolt_count: 8 }));
});

// Safety invariant over the ASME B1.1 bolt tensile-area lookup (UNC + 8UN) that
// backs flange-bolt preload/torque: tensile stress area must strictly increase
// with bolt diameter. An undersized area understates preload capacity and can
// over-torque a joint; a transcription error is caught here, not by point pins.
// Tested through the public compute so the private tables need no export.
test("flange-bolt: tensile stress area is strictly increasing in bolt diameter (UNC and 8UN, ASME B1.1)", () => {
  const areaFor = (d, series) => {
    const r = computeFlangeBoltTorque({ bolt_diameter_in: d, thread_series: series, bolt_count: 8, yield_ksi: 105 });
    return r.error ? null : r.tensile_area_in2;
  };
  const diameters = [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.375, 1.5, 1.75, 2];
  for (const series of ["UNC", "8UN"]) {
    let prev = -Infinity, seen = 0;
    for (const d of diameters) {
      const a = areaFor(d, series);
      if (a == null) continue;
      seen++;
      assert.ok(a > 0, `${series} ${d} in tensile area must be positive`);
      assert.ok(a < d * d, `${series} ${d} in tensile area ${a} exceeds the gross bolt area (impossible)`);
      assert.ok(a > prev, `${series} tensile area not increasing at ${d} in: ${a} <= ${prev}`);
      prev = a;
    }
    assert.ok(seen >= 5, `expected >= 5 ${series} sizes, saw ${seen}`);
  }
});
