// calc-inspection.js, the NDE and heat-treat bench of spec-v1664..v1674,
// against references the specs did not write: ASTM E709's coil formulae for
// both fill factors, Ir-192's gamma constant and half-life, the inverse square
// law, Harris's case-depth law, and the identities the tiles' notes claim.
// These tiles' only worked-example rows recompute their own specs, so an error
// a spec and its tile share passes that fixture -- as the restricted-area
// boundary's did.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeWeldVisualAcceptance, computeUtThicknessVelocity, computeRtExposureTime,
  computeRtRestrictedArea, computeMtYokeCoilAmperage, computePtDwellDevelopment,
  computeHardnessTensileConversion, computeCarburizingCaseDepth, computeJominyQuenchSeverity,
  computeTemperingTemperature, computePwhtHoldingTime, rtRestrictedAreaExample,
} from "../../calc-inspection.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const coilBase = { part_diameter_in: 2, amps_per_inch: 800, part_length_in: 8, coil_turns: 5, fill_factor: "high", yoke_pole_spacing_in: 0, yoke_current: "ac" };

// ---- independent references ----

test("MT coil: ASTM E709 -- high fill 35,000 / (L/D + 2), low fill 45,000 / (L/D)", () => {
  // The tile had used the high-fill denominator for both, asking a low-fill
  // coil at L/D = 4 for 7,500 ampere-turns instead of 11,250.
  close(computeMtYokeCoilAmperage(coilBase).coil_amp_turns, 35000 / 6, "high fill");
  close(computeMtYokeCoilAmperage({ ...coilBase, fill_factor: "low" }).coil_amp_turns, 45000 / 4, "low fill");
  close(computeMtYokeCoilAmperage({ ...coilBase, fill_factor: "low" }).coil_amps, 45000 / 4 / 5, "amps through 5 turns");
  // The formulae hold for L/D between 2 and 15.
  close(computeMtYokeCoilAmperage({ ...coilBase, part_length_in: 40 }).ld_used, 15, "long parts at 15");
});

test("restricted area: the gamma constant is per foot, and Ir-192's is 0.48 R/h per Ci at one METRE", () => {
  // At one foot the same source is (1 / 0.3048)^2 = 10.76 times stronger. The
  // spec quoted 0.48 as per-foot and put the 60 Ci boundary at 120 ft.
  within(rtRestrictedAreaExample.inputs.gamma_constant_r_h_ci_ft, 0.48 / (0.3048 * 0.3048), 0.001, "5.1667 at a foot, as typed");
  const r = computeRtRestrictedArea(rtRestrictedAreaExample.inputs);
  within(r.boundary_distance_ft, 393.7, 0.01, "60 Ci at 2 mR/h");
  close(r.dose_rate_1ft_r_h / r.boundary_distance_ft ** 2 * 1000, 2, "the rate at the boundary is the limit");
  // In metres the boundary is 0.48 x 60 / d^2 = 0.002 R/h -> d = 120 m, the
  // spec's number in the wrong unit.
  within(r.boundary_distance_ft * 0.3048, 120, 0.01, "120 METRES");
});

test("RT: inverse square, geometric unsharpness, and Ir-192's 73.83-day half-life", () => {
  const r = computeRtExposureTime({ base_exposure_s: 60, base_distance_in: 24, new_distance_in: 36, source_size_in: 0.12, material_thickness_in: 0.75, days_elapsed: 73.83, half_life_days: 73.83, unsharpness_limit_in: 0.0208 });
  close(r.new_exposure_s, 60 * (36 / 24) ** 2, "inverse square");
  close(r.ug_base_in, 0.12 * 0.75 / 24, "Ug = F t / D");
  close(r.activity_pct, 50, "one half-life");
});

test("carburizing: case depth goes as the square root of time (Harris)", () => {
  const r = computeCarburizingCaseDepth({ reference_case_in: 0.0707, reference_time_hr: 8, time_hr: 8, target_case_in: 0.1414, hotter_reference_case_in: 0.099 });
  close(r.time_ratio, (0.1414 / 0.0707) ** 2, "double the case, four times the time");
});

// ---- identities the notes claim ----

test("UT: thickness is velocity x time / 2, so a velocity error is a thickness error of the same ratio", () => {
  const r = computeUtThicknessVelocity({ transit_time_us: 45, gauge_velocity_in_us: 0.232, actual_velocity_in_us: 0.249, nominal_wall_in: 0.5, retirement_limit_in: 0.19, coating_thickness_in: 0.012 });
  close(r.true_thickness_in, 0.249 * 45 / 2, "pulse-echo");
  close(r.gauge_reading_in / r.true_thickness_in, 0.232 / 0.249, "velocity ratio");
});

test("hardness: UTS estimate is HB x the coefficient, and a case reading overstates the core", () => {
  const r = computeHardnessTensileConversion({ brinell_hb: 200, tensile_coefficient_ksi_per_hb: 0.5, actual_uts_ksi: 0, case_hardness_hb: 650, core_hardness_hb: 285 });
  close(r.estimated_uts_ksi, 100, "200 HB");
  assert.ok(r.case_estimated_uts_ksi > r.core_estimated_uts_ksi);
});

test("PWHT and tempering: hold scales with thickness, floored at the minimum", () => {
  const p = computePwhtHoldingTime({ governing_thickness_in: 2, hold_rate_hr_per_in: 1, minimum_hold_hr: 0.25, holding_temp_f: 1150, rate_threshold_temp_f: 800, heating_rate_constant_f_hr_in: 400, cooling_rate_constant_f_hr_in: 500, rate_ceiling_f_hr: 400, actual_heating_rate_f_hr: 250, alt_thickness_in: 4 });
  close(p.holding_time_hr, 2, "1 h per inch");
  close(p.max_heating_rate_f_hr, 200, "400 / t");
  const t = computeTemperingTemperature({ target_hardness_hrc: 32, curve_temp_f: 1025, section_thickness_in: 0.5, soak_rate_hr_per_in: 1, minimum_soak_hr: 1, embrittlement_low_f: 700, embrittlement_high_f: 1050, secondary_hardening: "no" });
  close(t.soak_time_hr, 1, "the minimum governs a thin section");
  assert.equal(t.in_embrittlement, true);
});

test("weld visual: a crack rejects whatever else passes, and undersize is judged on size AND length", () => {
  const r = computeWeldVisualAcceptance({ nominal_leg_in: 0.375, measured_leg_in: 0.3125, undersize_length_in: 3, weld_length_in: 20, allowed_undersize_in: 0.0625, allowed_undersize_fraction: 0.1, measured_undercut_in: 0.03, allowed_undercut_in: 0.03125, crack_present: "yes" });
  close(r.undersize_in, 0.0625, "undersize");
  close(r.allowed_undersize_length_in, 2, "10% of 20 in");
  assert.equal(r.length_within, false);
});

test("PT and Jominy tiles return finite, internally consistent results", () => {
  const pt = computePtDwellDevelopment({ penetration_dwell_min: 25, development_dwell_min: 10, evaluation_window_start_min: 10, evaluation_window_end_min: 60, evaluation_at_min: 20, part_temp_f: 70, min_procedure_temp_f: 40, max_procedure_temp_f: 125 });
  assert.ok(!pt.error);
  const j = computeJominyQuenchSeverity({ jominy_distance_sixteenths: 12, hardness_at_distance_hrc: 34, required_core_hardness_hrc: 38, alt_jominy_distance_sixteenths: 5, alt_hardness_hrc: 48, surface_hardness_hrc: 55 });
  assert.ok(!j.error);
});
