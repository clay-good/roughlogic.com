// Unit tests for calc-hvac.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  manualJCooling,
  manualJHeating,
  computeDuctSize,
  computeStaticPressureHvac,
  computeRefrigerantPT,
  computeSuperheatSubcool,
  computeSeerEer,
  computeBalancePoint,
  computeSHR,
  computeCfmPerTon,
  computeCombustionAir,
  manualJCoolingExample,
  manualJHeatingExample,
  ductSizingExample,
  staticPressureHvacExample,
  refrigerantPTExample,
  superheatSubcoolExample,
  seerEerExample,
  shrExample,
  cfmPerTonExample,
} from "../../calc-hvac.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Manual J cooling (Utility 21) ---

test("Manual J cooling example: 1500 ft^2 home returns positive load and reasonable tons", () => {
  const r = manualJCooling(manualJCoolingExample.inputs);
  assert.ok(r.total_BTU_hr > 0);
  assert.ok(r.tons > manualJCoolingExample.expectedRange.tons.min);
  assert.ok(r.tons < manualJCoolingExample.expectedRange.tons.max);
});

test("Manual J cooling: hotter outdoor temp -> larger total load", () => {
  const a = manualJCooling({ ...manualJCoolingExample.inputs, outdoor_design_F: 85 });
  const b = manualJCooling({ ...manualJCoolingExample.inputs, outdoor_design_F: 100 });
  assert.ok(b.total_BTU_hr > a.total_BTU_hr);
});

test("Manual J cooling: better insulation -> smaller load", () => {
  const a = manualJCooling({ ...manualJCoolingExample.inputs, insulation_level: "poor" });
  const b = manualJCooling({ ...manualJCoolingExample.inputs, insulation_level: "good" });
  assert.ok(b.total_BTU_hr < a.total_BTU_hr);
});

test("Manual J cooling: SHR within (0,1] when total > 0", () => {
  const r = manualJCooling(manualJCoolingExample.inputs);
  assert.ok(r.SHR > 0 && r.SHR <= 1);
});

// --- Manual J heating (Utility 22) ---

test("Manual J heating example: returns positive load", () => {
  const r = manualJHeating(manualJHeatingExample.inputs);
  assert.ok(r.total_BTU_hr > 0);
});

test("Manual J heating: colder outdoor -> larger load", () => {
  const a = manualJHeating({ ...manualJHeatingExample.inputs, outdoor_design_F: 30 });
  const b = manualJHeating({ ...manualJHeatingExample.inputs, outdoor_design_F: -10 });
  assert.ok(b.total_BTU_hr > a.total_BTU_hr);
});

test("Manual J heating: outdoor >= indoor -> zero or near-zero load", () => {
  const r = manualJHeating({ ...manualJHeatingExample.inputs, outdoor_design_F: 80, indoor_design_F: 70 });
  assert.equal(r.total_BTU_hr, 0);
});

// --- Duct sizing (Utility 23) ---

test("Duct sizing example: 400 CFM at 0.08 in/100ft yields a duct in expected range", () => {
  const r = computeDuctSize(ductSizingExample.inputs);
  assert.ok(r.round_diameter_in > ductSizingExample.expectedRange.round_diameter_in.min);
  assert.ok(r.round_diameter_in < ductSizingExample.expectedRange.round_diameter_in.max);
});

test("Duct sizing: more CFM at same friction -> larger duct", () => {
  const a = computeDuctSize({ cfm: 200, friction_in_wc_per_100ft: 0.08 });
  const b = computeDuctSize({ cfm: 800, friction_in_wc_per_100ft: 0.08 });
  assert.ok(b.round_diameter_in > a.round_diameter_in);
});

test("Duct sizing: invalid input returns error", () => {
  const r = computeDuctSize({ cfm: 0, friction_in_wc_per_100ft: 0.08 });
  assert.ok(r.error);
});

// --- Static pressure (Utility 24) ---

test("Static pressure example: filter+coil+supply+return = 0.70 in w.c.", () => {
  const r = computeStaticPressureHvac(staticPressureHvacExample.inputs);
  assert.ok(close(r.total_in_wc, staticPressureHvacExample.expected.total_in_wc, 1e-9));
});

test("Static pressure: empty list -> 0", () => {
  const r = computeStaticPressureHvac({ elements: [] });
  assert.equal(r.total_in_wc, 0);
});

// --- Refrigerant P-T (Utility 25) ---

test("Refrigerant P-T example: R-410A at 118 psig -> 40 F", () => {
  const r = computeRefrigerantPT(refrigerantPTExample.inputs);
  assert.equal(r.saturated_temperature_F, refrigerantPTExample.expected.saturated_temperature_F);
});

test("Refrigerant P-T: by temperature returns interpolated pressure", () => {
  const r = computeRefrigerantPT({ refrigerant: "R-410A", temperature_F: 40 });
  assert.ok(r.saturated_pressure_psig > 100 && r.saturated_pressure_psig < 130);
});

test("Refrigerant P-T: unknown refrigerant returns error", () => {
  const r = computeRefrigerantPT({ refrigerant: "R-NOPE", pressure_psig: 100 });
  assert.ok(r.error);
});

// --- Superheat / subcool (Utility 26) ---

test("Superheat: 410A at 118 psig (Tsat ~ 40 F), line 50 F -> ~ 10 F superheat", () => {
  const r = computeSuperheatSubcool(superheatSubcoolExample.inputs);
  assert.ok(close(r.superheat_F, superheatSubcoolExample.expected.superheat_F_approx, 1));
});

test("Subcool: line cooler than saturated -> positive subcool", () => {
  const r = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 200, line_temperature_F: 60, mode: "subcool" });
  assert.ok(r.subcool_F > 0);
});

// --- SEER/EER (Utility 27) ---

test("SEER from EER: 12 EER -> ~ 13.4 SEER", () => {
  const r = computeSeerEer(seerEerExample.inputs);
  assert.ok(r.SEER > seerEerExample.expectedRange.SEER.min);
  assert.ok(r.SEER < seerEerExample.expectedRange.SEER.max);
});

test("Round trip SEER -> EER -> SEER recovers original (within tolerance)", () => {
  const a = computeSeerEer({ value: 16, from: "SEER" });
  const b = computeSeerEer({ value: a.EER, from: "EER" });
  assert.ok(close(b.SEER, 16, 0.01));
});

// --- Balance point (Utility 28) ---

test("Balance point: with inputs, returns a temperature", () => {
  const r = computeBalancePoint({ heating_capacity_btu_hr_at_design: 30000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 });
  assert.ok(Number.isFinite(r.balance_point_F));
});

test("Balance point: lower capacity raises balance point (more aux heat needed)", () => {
  const a = computeBalancePoint({ heating_capacity_btu_hr_at_design: 36000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 });
  const b = computeBalancePoint({ heating_capacity_btu_hr_at_design: 24000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 });
  assert.ok(b.balance_point_F > a.balance_point_F);
});

// --- SHR (Utility 29) ---

test("SHR example: 24000 / 30000 = 0.8", () => {
  const r = computeSHR(shrExample.inputs);
  assert.ok(close(r.SHR, shrExample.expected.SHR, 1e-9));
});

test("SHR: total = 0 returns error", () => {
  const r = computeSHR({ sensible_btu_hr: 1, total_btu_hr: 0 });
  assert.ok(r.error);
});

// --- CFM per Ton (Utility 30) ---

test("CFM per Ton example: 3 tons standard -> 1200 CFM", () => {
  const r = computeCfmPerTon(cfmPerTonExample.inputs);
  assert.equal(r.total_cfm, cfmPerTonExample.expected.total_cfm);
});

test("CFM per Ton: dry climate -> 450 CFM/ton", () => {
  const r = computeCfmPerTon({ tons: 2, climate: "dry" });
  assert.equal(r.cfm_per_ton, 450);
  assert.equal(r.total_cfm, 900);
});

// --- Combustion air (Utility 31) ---

test("Combustion air: large room is adequate by volume", () => {
  const r = computeCombustionAir({ btu_input: 80000, room_volume_ft3: 5000 });
  assert.equal(r.adequate_by_volume, true);
});

test("Combustion air: small room requires opening", () => {
  const r = computeCombustionAir({ btu_input: 100000, room_volume_ft3: 1000 });
  assert.equal(r.adequate_by_volume, false);
  assert.ok(r.opening_outdoor_in2 > 0);
});
