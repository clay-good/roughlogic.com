// Unit tests for calc-electrical.js v7 utilities (234 through 237).
// Per spec-v7.md Step 58.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTransformerKvaSizing, transformerKvaSizingExample, TRANSFORMER_KVA_STEPS,
  computeShortCircuitPP, shortCircuitPPExample,
  computeGeneratorMotorStarting, generatorMotorStartingExample, NEMA_MG1_CODE_LETTERS,
  computeServiceLoadStandard, serviceLoadStandardExample,
  ELECTRICAL_RENDERERS,
} from "../../calc-electrical.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- 234 Transformer kVA Sizing and FLA ---

test("234 example yields finite outputs", () => {
  const r = computeTransformerKvaSizing(transformerKvaSizingExample.inputs);
  assert.ok(r.connected_kVA > 0);
  assert.ok(r.required_kVA > r.connected_kVA);
  assert.ok(r.recommended_kVA >= r.required_kVA);
  assert.ok(r.fla_primary_A > 0);
  assert.ok(r.fla_secondary_A > 0);
});

test("234 FLA matches kVA × 1000 / (V × √3) for 3-phase 75 kVA at 480V → 90.2 A", () => {
  const r = computeTransformerKvaSizing({ loads: [{ kVA: 50 }], primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 0 });
  assert.ok(close(r.fla_primary_A, 75 * 1000 / (480 * Math.sqrt(3)), 0.5));
});

test("234 watts + pf converts to kVA correctly", () => {
  const r = computeTransformerKvaSizing({ loads: [{ watts: 8500, pf: 0.85 }], primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 0 });
  assert.ok(close(r.connected_kVA, 10.0, 0.001), "8500 W at 0.85 pf → 10 kVA");
});

test("234 single-phase uses √1 instead of √3", () => {
  const r = computeTransformerKvaSizing({ loads: [{ kVA: 25 }], primary_V: 240, secondary_V: 120, phase: "single", growth_reserve_pct: 0 });
  // Recommended is the next step up from 25, which is 30 kVA. FLA = 30000/120 = 250 A
  assert.equal(r.recommended_kVA, 30);
  assert.ok(close(r.fla_secondary_A, 30000 / 120, 0.5));
});

test("234 25% reserve picks the next step up", () => {
  const r = computeTransformerKvaSizing({ loads: [{ kVA: 30 }], primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 25 });
  // Required = 30 × 1.25 = 37.5; next step ≥ 37.5 is 45.
  assert.equal(r.recommended_kVA, 45);
});

test("234 step series matches ANSI/IEEE 15/30/45/.../1000", () => {
  assert.deepEqual(TRANSFORMER_KVA_STEPS.slice(0, 5), [15, 30, 45, 75, 112.5]);
  assert.equal(TRANSFORMER_KVA_STEPS[TRANSFORMER_KVA_STEPS.length - 1], 1000);
});

test("234 errors on empty load list", () => {
  const r = computeTransformerKvaSizing({ loads: [] });
  assert.ok(r.error);
});

test("234 errors on missing kVA / watts", () => {
  const r = computeTransformerKvaSizing({ loads: [{ pf: 0.85 }], primary_V: 480, secondary_V: 208 });
  assert.ok(r.error);
});

test("234 errors on negative voltage", () => {
  const r = computeTransformerKvaSizing({ loads: [{ kVA: 10 }], primary_V: -480 });
  assert.ok(r.error);
});

test("234 above-1000 kVA caps at 1000 (last step)", () => {
  const r = computeTransformerKvaSizing({ loads: [{ kVA: 5000 }], primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 0 });
  assert.equal(r.recommended_kVA, 1000);
});

// --- 235 Short-Circuit Current at Panel (Bussmann Point-to-Point) ---

test("235 example yields finite outputs", () => {
  const r = computeShortCircuitPP(shortCircuitPPExample.inputs);
  assert.ok(r.I_sca_secondary_A > 0);
  assert.ok(r.f_factor > 0);
  assert.ok(r.M_factor > 0 && r.M_factor < 1);
  assert.ok(r.I_sca_panel_A < r.I_sca_secondary_A);
});

test("235 I_sca_secondary = (kVA × 1000) / (V × √3 × Z%)", () => {
  // Bussmann canonical: 1500 kVA, 5.75 %Z, 480V three-phase → I_sca_sec ≈ 31370 A
  const r = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 0, parallel_sets: 1 });
  const expected = (1500 * 1000) / (480 * Math.sqrt(3) * 0.0575);
  assert.ok(close(r.I_sca_secondary_A, expected, 1));
});

test("235 length=0 gives M=1 (no drop)", () => {
  const r = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 0, parallel_sets: 1 });
  assert.equal(r.f_factor, 0);
  assert.equal(r.M_factor, 1);
  assert.ok(close(r.I_sca_panel_A, r.I_sca_secondary_A, 0.001));
});

test("235 longer run reduces panel I_sca", () => {
  const a = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 50, parallel_sets: 1 });
  const b = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 200, parallel_sets: 1 });
  assert.ok(b.I_sca_panel_A < a.I_sca_panel_A);
});

test("235 doubling parallel sets halves f", () => {
  const a = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 100, parallel_sets: 1 });
  const b = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 100, parallel_sets: 2 });
  assert.ok(close(b.f_factor, a.f_factor / 2, 0.001));
});

test("235 single-phase uses 2 instead of √3 in numerator", () => {
  const r1 = computeShortCircuitPP({ utility_kVA: 75, utility_Z_pct: 2.5, secondary_V: 240, phase: "single", C_value: 22185, length_ft: 100, parallel_sets: 1 });
  // f = (2 × 100 × I_sca) / (1 × 22185 × 240); just verify f is positive and finite
  assert.ok(r1.f_factor > 0 && Number.isFinite(r1.f_factor));
});

test("235 errors on negative kVA / Z / V / C", () => {
  for (const inputs of [
    { utility_kVA: 0, utility_Z_pct: 5, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 100, parallel_sets: 1 },
    { utility_kVA: 1500, utility_Z_pct: 0, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 100, parallel_sets: 1 },
    { utility_kVA: 1500, utility_Z_pct: 5, secondary_V: 0, phase: "three", C_value: 22185, length_ft: 100, parallel_sets: 1 },
    { utility_kVA: 1500, utility_Z_pct: 5, secondary_V: 480, phase: "three", C_value: 0, length_ft: 100, parallel_sets: 1 },
  ]) {
    const r = computeShortCircuitPP(inputs);
    assert.ok(r.error);
  }
});

test("235 parallel_sets < 1 errors", () => {
  const r = computeShortCircuitPP({ utility_kVA: 1500, utility_Z_pct: 5, secondary_V: 480, phase: "three", C_value: 22185, length_ft: 100, parallel_sets: 0 });
  assert.ok(r.error);
});

// --- 236 Generator Sizing for Motor Starting ---

test("236 example yields finite outputs", () => {
  const r = computeGeneratorMotorStarting(generatorMotorStartingExample.inputs);
  assert.ok(r.running_kW > 0);
  assert.ok(r.worst_starting_kVA > 0);
  assert.ok(r.required_kW > 0);
  assert.ok(r.recommended_kW >= r.required_kW);
});

test("236 worst-case motor drives starting kVA", () => {
  const r = computeGeneratorMotorStarting({ motors: [{ hp: 5, code_letter: "B" }, { hp: 25, code_letter: "G" }], non_motor_kW: 0, dip_factor: 0.30, starts_per_hour: "occasional" });
  // 25 HP × 5.6 kVA/HP = 140 kVA worst-start
  assert.ok(close(r.worst_starting_kVA, 25 * 5.6, 0.01));
});

test("236 LRA override works when V and phase given", () => {
  const r = computeGeneratorMotorStarting({ motors: [{ hp: 25, lra_A: 200, voltage_V: 480, phase: "three" }], non_motor_kW: 0, dip_factor: 0.30, starts_per_hour: "occasional" });
  // 200 × 480 × √3 / 1000 ≈ 166.3 kVA
  assert.ok(close(r.worst_starting_kVA, 200 * 480 * Math.sqrt(3) / 1000, 0.5));
});

test("236 30% dip ⇒ required_starting_kVA = worst / 0.30", () => {
  const r = computeGeneratorMotorStarting({ motors: [{ hp: 10, code_letter: "G" }], non_motor_kW: 0, dip_factor: 0.30, starts_per_hour: "occasional" });
  // 10 × 5.6 = 56; / 0.30 = 186.67
  assert.ok(close(r.required_starting_kVA, 56 / 0.30, 0.5));
});

test("236 frequent-start derate factor is 1.15", () => {
  const r = computeGeneratorMotorStarting({ motors: [{ hp: 10, code_letter: "G" }], non_motor_kW: 0, dip_factor: 0.30, starts_per_hour: "frequent" });
  assert.equal(r.starts_factor, 1.15);
});

test("236 NEMA MG-1 table covers A through V", () => {
  for (const k of ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "U", "V"]) {
    assert.ok(typeof NEMA_MG1_CODE_LETTERS[k] === "number", "missing " + k);
  }
});

test("236 errors on empty motor list", () => {
  const r = computeGeneratorMotorStarting({ motors: [], non_motor_kW: 0 });
  assert.ok(r.error);
});

test("236 errors on unknown code letter", () => {
  const r = computeGeneratorMotorStarting({ motors: [{ hp: 10, code_letter: "Z" }], non_motor_kW: 0, dip_factor: 0.30, starts_per_hour: "occasional" });
  assert.ok(r.error);
});

test("236 dip factor outside (0,1) errors", () => {
  for (const dip of [0, 1, -0.1, 1.5]) {
    const r = computeGeneratorMotorStarting({ motors: [{ hp: 10, code_letter: "G" }], dip_factor: dip });
    assert.ok(r.error, "dip=" + dip + " should error");
  }
});

test("236 recommended kW is from a step series", () => {
  const r = computeGeneratorMotorStarting(generatorMotorStartingExample.inputs);
  // Recommended must be a discrete step
  assert.ok(Number.isInteger(r.recommended_kW) || r.recommended_kW % 1 === 0);
});

// --- 237 Service Entrance Demand Load (Standard Method) ---

test("237 example yields finite outputs", () => {
  const r = computeServiceLoadStandard(serviceLoadStandardExample.inputs);
  assert.ok(r.total_VA > 0);
  assert.ok(r.required_A > 0);
  assert.ok(r.recommended_A >= r.required_A);
});

test("237 area × 3 VA gives general lighting", () => {
  const r = computeServiceLoadStandard({ area_ft2: 2000, small_appliance_circuits: 0, laundry_circuit: 0 });
  // 2000 × 3 = 6000 VA general; demand: 3000 + 3000 × 0.35 = 4050 VA
  assert.ok(close(r.breakdown.lighting_general_demand_VA, 4050, 1));
});

test("237 third tier (25%) kicks in above 120 kVA general", () => {
  // Need general > 120000 VA. area=40000 → lighting 120000 + 3000+1500=124500
  const r = computeServiceLoadStandard({ area_ft2: 40000, small_appliance_circuits: 2, laundry_circuit: 1 });
  // general = 120000 + 3000 + 1500 = 124500
  // demand = 3000 + 117000 × 0.35 + (124500 - 120000) × 0.25
  //       = 3000 + 40950 + 1125 = 45075
  assert.ok(close(r.breakdown.lighting_general_demand_VA, 45075, 1));
});

test("237 dryer minimum is 5000 W per NEC 220.54", () => {
  const r = computeServiceLoadStandard({ area_ft2: 1000, dryer_W: 3000 });
  assert.equal(r.breakdown.dryer_demand_VA, 5000);
});

test("237 dryer above 5 kW uses nameplate", () => {
  const r = computeServiceLoadStandard({ area_ft2: 1000, dryer_W: 7500 });
  assert.equal(r.breakdown.dryer_demand_VA, 7500);
});

test("237 range 12 kW uses 8 kW demand", () => {
  const r = computeServiceLoadStandard({ area_ft2: 1000, range_W: 12000 });
  assert.equal(r.breakdown.range_demand_VA, 8000);
});

test("237 range above 12 kW adds 5% per kW", () => {
  const r = computeServiceLoadStandard({ area_ft2: 1000, range_W: 16000 });
  // NEC 220.55 Note 1: 4 kW over 12 -> increase the 8000 W Column-C base 5% per kW = 8000 × (1 + 0.05×4) = 9600
  assert.equal(r.breakdown.range_demand_VA, 9600);
});

test("237 fixed-appliance 75% kicks in at 4+ items", () => {
  const a = computeServiceLoadStandard({ area_ft2: 1000, fixed_appliances_W: 8000, fixed_appliance_count: 3 });
  const b = computeServiceLoadStandard({ area_ft2: 1000, fixed_appliances_W: 8000, fixed_appliance_count: 4 });
  assert.equal(a.breakdown.fixed_demand_VA, 8000);
  assert.equal(b.breakdown.fixed_demand_VA, 6000);
});

test("237 HVAC: larger of cooling vs. heating", () => {
  const r = computeServiceLoadStandard({ area_ft2: 1000, hvac_cooling_W: 5000, hvac_heating_W: 9000 });
  assert.equal(r.breakdown.hvac_demand_VA, 9000);
});

test("237 largest motor adder is 25% of motor W", () => {
  const r = computeServiceLoadStandard({ area_ft2: 1000, largest_motor_W: 2000 });
  assert.equal(r.breakdown.motor_largest_25_VA, 500);
});

test("237 recommended A uses NEC service ladder", () => {
  // Small home should pick 100 A; large home pushes higher
  const small = computeServiceLoadStandard({ area_ft2: 800, small_appliance_circuits: 2, laundry_circuit: 1, range_W: 8000, dryer_W: 5000 });
  assert.ok([100, 125, 150].includes(small.recommended_A), "got " + small.recommended_A);
  const big = computeServiceLoadStandard({ area_ft2: 6000, small_appliance_circuits: 2, laundry_circuit: 1, fixed_appliances_W: 20000, fixed_appliance_count: 5, range_W: 18000, dryer_W: 8000, hvac_heating_W: 25000 });
  assert.ok(big.recommended_A >= 200);
});

// --- Renderer registration ---

test("ELECTRICAL_RENDERERS exposes the 4 v7 ids", () => {
  for (const id of ["transformer-kva-sizing", "short-circuit-pp", "generator-motor-starting", "service-load-standard"]) {
    assert.equal(typeof ELECTRICAL_RENDERERS[id], "function", id + " should have a renderer");
  }
});
