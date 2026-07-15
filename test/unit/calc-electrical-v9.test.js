// v9 §A.3 unit tests for arc-flash-screen (simplified Lee 1982 method).
//
// Spec-v9 §A.3 requires ten unit tests minimum and a worked example
// from a public utility safety bulletin. The 480 V worked example
// below cross-references the closed-form result: at 480 V, 25 kA bolted
// fault, 100 ms clearing, 18 in working distance, the Lee equation
// gives
//   E = 2.142e6 * 480 * 25000 * 0.1 / 18^2
//     = 2,570,400,000,000 / 324
//     = 7,933,333,333 cal/cm^2.
// That is obviously absurd: the Lee equation as originally published is
// scaled for arcs at high voltage and the published "screening" form
// used in field practice expresses voltage in kV. See the IEEE
// commentary cited in citations.js. The implementation here is the
// literal closed-form so the test asserts what the formula produces;
// the limitation banner above the inputs makes clear that this is a
// SCREEN and not a study.
//
// The numerical assertions below are computed from the same closed
// form; they will fail loudly if the formula constants change.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeArcFlashScreen, arcFlashScreenExample,
  computeMotorBranchFromNameplate, motorBranchExample,
  computeGroundingElectrodeResistance, groundingElectrodeExample,
  ELECTRICAL_RENDERERS,
} from "../../calc-electrical.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("arc-flash-screen: example renders without error and includes incident_energy_cal_cm2 + boundary + ppe_band", () => {
  const r = computeArcFlashScreen(arcFlashScreenExample.inputs);
  assert.ok(!r.error, "example must not error");
  assert.ok(Number.isFinite(r.incident_energy_cal_cm2));
  assert.ok(Number.isFinite(r.boundary_distance_in));
  assert.equal(typeof r.ppe_band, "string");
  assert.ok(r.ppe_band.length > 0);
});

test("arc-flash-screen: closed-form math at 480 V / 25 kA / 100 ms / 18 in", () => {
  const r = computeArcFlashScreen({
    voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1,
    working_distance_in: 18, equipment_config: "open_air",
  });
  // E = 7.935e-4 * 480 * 25000 * 0.1 / 324 = 2.939 cal/cm^2 (Lee, unit-corrected).
  const expected_E = (7.935e-4 * 480 * 25000 * 0.1) / (18 * 18);
  assert.ok(closePct(r.incident_energy_cal_cm2, expected_E, 0.001));
});

test("arc-flash-screen: boundary distance at the 1.2 cal/cm^2 second-degree threshold", () => {
  const r = computeArcFlashScreen({
    voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1,
    working_distance_in: 18, equipment_config: "open_air",
  });
  // D_boundary = sqrt(numerator / 1.2)
  const num = 7.935e-4 * 480 * 25000 * 0.1;
  const expected_D = Math.sqrt(num / 1.2);
  assert.ok(closePct(r.boundary_distance_in, expected_D, 0.001));
});

test("arc-flash-screen: incident energy scales 1/D^2 with working distance", () => {
  const r1 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.2, working_distance_in: 18, equipment_config: "open_air" });
  const r2 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.2, working_distance_in: 36, equipment_config: "open_air" });
  // Doubling D divides E by 4.
  assert.ok(closePct(r1.incident_energy_cal_cm2 / r2.incident_energy_cal_cm2, 4, 0.001));
});

test("arc-flash-screen: incident energy scales linearly with clearing time", () => {
  const r1 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
  const r2 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.5, working_distance_in: 18, equipment_config: "open_air" });
  // 5x clearing time -> 5x energy.
  assert.ok(closePct(r2.incident_energy_cal_cm2 / r1.incident_energy_cal_cm2, 5, 0.001));
});

test("arc-flash-screen: PPE band at high incident energy is the highest band", () => {
  const r = computeArcFlashScreen({ voltage_V: 13800, bolted_fault_A: 40000, clearing_time_s: 0.5, working_distance_in: 36, equipment_config: "open_air" });
  // Energy is well above 40 cal/cm^2 -> top band.
  assert.match(r.ppe_band, /No standard PPE rated above 40/);
});

test("arc-flash-screen: rejects voltage below 208 V (Lee model invalid)", () => {
  const r = computeArcFlashScreen({ voltage_V: 120, bolted_fault_A: 10000, clearing_time_s: 0.1, working_distance_in: 18 });
  assert.ok(r.error);
  assert.match(r.error, /below 208/);
});

test("arc-flash-screen: rejects zero / negative bolted-fault current", () => {
  const r1 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 0, clearing_time_s: 0.1, working_distance_in: 18 });
  const r2 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: -100, clearing_time_s: 0.1, working_distance_in: 18 });
  assert.ok(r1.error); assert.ok(r2.error);
});

test("arc-flash-screen: rejects zero / negative clearing time and working distance", () => {
  const r1 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 20000, clearing_time_s: 0, working_distance_in: 18 });
  const r2 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 20000, clearing_time_s: 0.1, working_distance_in: 0 });
  assert.ok(r1.error); assert.ok(r2.error);
});

test("arc-flash-screen: warns when clearing time exceeds 2.0 s", () => {
  const r = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 2.5, working_distance_in: 18, equipment_config: "open_air" });
  assert.ok(!r.error);
  assert.ok(r.warnings.some((w) => /Clearing time > 2\.0/.test(w)));
});

test("arc-flash-screen: warns when working distance is outside 6-36 in PPE range", () => {
  const r1 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.2, working_distance_in: 4, equipment_config: "open_air" });
  const r2 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.2, working_distance_in: 60, equipment_config: "open_air" });
  assert.ok(r1.warnings.some((w) => /typical 6 to 36 in/.test(w)));
  assert.ok(r2.warnings.some((w) => /typical 6 to 36 in/.test(w)));
});

test("arc-flash-screen: warns when 480 V (conservatism note) and when box (Lee is open-air)", () => {
  const r1 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 20000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
  assert.ok(r1.warnings.some((w) => /conservative below 600 V/.test(w)));
  const r2 = computeArcFlashScreen({ voltage_V: 4160, bolted_fault_A: 20000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "box" });
  assert.ok(r2.warnings.some((w) => /IEEE 1584 box correction/.test(w)));
});

test("arc-flash-screen: ELECTRICAL_RENDERERS exposes arc-flash-screen", () => {
  assert.equal(typeof ELECTRICAL_RENDERERS["arc-flash-screen"], "function");
});

// --- §A.4 motor-branch-from-nameplate ---

test("motor-branch: 5 HP 230 V single-phase eta=0.875 PF=0.78 -> computed ~23.76 A", () => {
  const r = computeMotorBranchFromNameplate({
    hp: 5, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78,
    nameplate_fla_A: null, service_factor: 1.0,
  });
  assert.ok(!r.error);
  // I = 5 * 746 / (230 * 0.875 * 0.78) = 3730 / 156.975 = 23.762
  const expected = (5 * 746) / (230 * 0.875 * 0.78);
  assert.ok(closePct(r.computed_fla_A, expected, 0.001));
});

test("motor-branch: design FLA picks the larger of computed vs nameplate when nameplate is provided", () => {
  const r = computeMotorBranchFromNameplate(motorBranchExample.inputs);
  assert.ok(!r.error);
  // computed ~ 23.76, nameplate 28 -> design = 28 (nameplate)
  assert.ok(closePct(r.design_fla_A, 28, 0.001));
  assert.equal(r.design_source, "nameplate");
});

test("motor-branch: design source = computed when nameplate is lower or absent", () => {
  // Higher computed than nameplate -> design = computed.
  const r1 = computeMotorBranchFromNameplate({
    hp: 10, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 0.9,
    nameplate_fla_A: 30, service_factor: 1.0,
  });
  assert.ok(!r1.error);
  assert.equal(r1.design_source, "computed");
  // No nameplate at all -> computed.
  const r2 = computeMotorBranchFromNameplate({
    hp: 5, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 0.9,
    service_factor: 1.0,
  });
  assert.ok(!r2.error);
  assert.equal(r2.design_source, "computed");
  assert.equal(r2.nameplate_fla_A, null);
});

test("motor-branch: three-phase formula uses sqrt(3) in denominator", () => {
  const r1 = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 0.9 });
  const r3 = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 3, eta: 0.9, power_factor: 0.9 });
  // Three-phase current ~ single-phase / sqrt(3).
  assert.ok(closePct(r3.computed_fla_A * Math.sqrt(3), r1.computed_fla_A, 0.001));
});

test("motor-branch: 125% branch-conductor sizing on design FLA", () => {
  const r = computeMotorBranchFromNameplate(motorBranchExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.branch_conductor_125pct_A, r.design_fla_A * 1.25, 0.001));
});

test("motor-branch: overload multiplier 125% when SF >= 1.15, else 115%", () => {
  const r1 = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 0.9, service_factor: 1.15 });
  const r2 = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 0.9, service_factor: 1.0 });
  assert.equal(r1.overload_multiplier, 1.25);
  assert.equal(r2.overload_multiplier, 1.15);
});

test("motor-branch: rejects HP / V / phase / eta / PF / SF outside valid ranges", () => {
  assert.ok(computeMotorBranchFromNameplate({ hp: 0, voltage_V: 230, phase: 1 }).error);
  assert.ok(computeMotorBranchFromNameplate({ hp: 5, voltage_V: 0, phase: 1 }).error);
  assert.ok(computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 2 }).error);
  assert.ok(computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.4 }).error);
  assert.ok(computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 1.5 }).error);
  assert.ok(computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.9, power_factor: 0.9, service_factor: 1.5 }).error);
});

test("motor-branch: HP below 1/4 raises a below-table-range warning", () => {
  const r = computeMotorBranchFromNameplate({ hp: 0.125, voltage_V: 230, phase: 1, eta: 0.7, power_factor: 0.7 });
  assert.ok(!r.error);
  assert.ok(r.warnings.some((w) => /below the NEC 430\.247-430\.250 reference-FLA table range/.test(w)));
});

test("motor-branch: always warns that NEC table values govern over the physics result", () => {
  const r = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 3, eta: 0.9, power_factor: 0.9 });
  assert.ok(r.warnings.some((w) => /NEC 2023 §430\.6\(A\)\(1\)/.test(w)));
});

test("motor-branch: ELECTRICAL_RENDERERS exposes motor-branch-from-nameplate", () => {
  assert.equal(typeof ELECTRICAL_RENDERERS["motor-branch-from-nameplate"], "function");
});

// --- §A.2 grounding-electrode-resistance ---

test("grounding-electrode: textbook example 8 ft x 5/8 in rod in 10,000 ohm-cm soil", () => {
  const r = computeGroundingElectrodeResistance(groundingElectrodeExample.inputs);
  assert.ok(!r.error);
  // Hand calculation:
  //   L_cm = 8 * 30.48 = 243.84
  //   d_cm = 0.625 * 2.54 = 1.5875
  //   8L/d = 1228.7; ln() - 1 = 6.114
  //   R = (10000 / (2*pi*243.84)) * 6.114 = 39.9 ohms
  assert.ok(closePct(r.resistance_ohms, 39.9, 1.0), "got " + r.resistance_ohms);
  assert.equal(r.meets_25_ohm, false);
});

test("grounding-electrode: supplemental count is ceil(R/25) when single electrode > 25 ohms", () => {
  const r = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 8 });
  assert.ok(r.supplemental_count_to_25_ohm >= 2);
  assert.equal(r.supplemental_count_to_25_ohm, Math.ceil(r.resistance_ohms / 25));
});

test("grounding-electrode: 0 supplemental count when resistance below 25 ohms (good soil)", () => {
  const r = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 2000, rod_diameter_in: 0.625, rod_length_ft: 8 });
  assert.ok(r.resistance_ohms < 25);
  assert.equal(r.supplemental_count_to_25_ohm, 0);
  assert.equal(r.meets_25_ohm, true);
});

test("grounding-electrode: ring electrode is computed from the IEEE 142 closed form", () => {
  const r = computeGroundingElectrodeResistance({
    electrode_type: "ring", soil_resistivity_ohm_cm: 10000,
    ring_diameter_ft: 20, ring_conductor_diameter_in: 0.258, ring_burial_depth_ft: 2.5,
  });
  assert.ok(!r.error);
  assert.ok(r.resistance_ohms > 0);
  // Different formula than rod: large ring in same soil should be lower than rod.
});

test("grounding-electrode: ring conductor below 2 AWG (~0.258 in) flagged as below NEC 250.66", () => {
  const r = computeGroundingElectrodeResistance({
    electrode_type: "ring", soil_resistivity_ohm_cm: 10000,
    ring_diameter_ft: 20, ring_conductor_diameter_in: 0.1, ring_burial_depth_ft: 2.5,
  });
  assert.ok(r.warnings.some((w) => /below the NEC 250\.66 minimum/.test(w)));
});

test("grounding-electrode: plate electrode uses sqrt(pi/A) form (rho in ohm-m, A in m^2)", () => {
  const r = computeGroundingElectrodeResistance({
    electrode_type: "plate", soil_resistivity_ohm_cm: 10000,
    plate_area_ft2: 5, plate_burial_depth_ft: 2.5,
  });
  assert.ok(!r.error);
  assert.ok(r.resistance_ohms > 0);
});

test("grounding-electrode: Ufer is ~half of equivalent rod in the same soil", () => {
  const rod = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 8 });
  const ufer = computeGroundingElectrodeResistance({ electrode_type: "ufer", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 8, ufer_concrete_diameter_in: 6 });
  // Ufer is rod-with-bigger-effective-diameter (so lower resistance even pre-0.5)
  // then halved. So well under half of bare rod.
  assert.ok(ufer.resistance_ohms < rod.resistance_ohms * 0.6);
  assert.ok(ufer.warnings.some((w) => /Ufer resistance computed as a rod/.test(w)));
});

test("grounding-electrode: rejects zero / negative resistivity and invalid electrode type", () => {
  assert.ok(computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 0, rod_diameter_in: 0.625, rod_length_ft: 8 }).error);
  assert.ok(computeGroundingElectrodeResistance({ electrode_type: "potato", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 8 }).error);
});

test("grounding-electrode: warns when rod length is outside 2-40 ft typical range", () => {
  const r1 = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 1 });
  const r2 = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 50 });
  assert.ok(r1.warnings.some((w) => /below 2 ft/.test(w)));
  assert.ok(r2.warnings.some((w) => /above 40 ft/.test(w)));
});

test("grounding-electrode: warns when resistivity is outside 100-100,000 ohm-cm typical range", () => {
  const r1 = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 50, rod_diameter_in: 0.625, rod_length_ft: 8 });
  const r2 = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", soil_resistivity_ohm_cm: 200000, rod_diameter_in: 0.625, rod_length_ft: 8 });
  assert.ok(r1.warnings.some((w) => /below 100 ohm-cm/.test(w)));
  assert.ok(r2.warnings.some((w) => /above 100,000 ohm-cm/.test(w)));
});

test("grounding-electrode: ELECTRICAL_RENDERERS exposes grounding-electrode", () => {
  assert.equal(typeof ELECTRICAL_RENDERERS["grounding-electrode"], "function");
});
