// v8 Phase C regression tests (spec-v8.md §5).
// Six per-tool UX refinements landed in this batch.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTransformerSize, computeVoltageDrop } from "../../calc-electrical.js";
import { computeFrictionLoss } from "../../calc-plumbing.js";
import { computeConcreteVolume } from "../../calc-construction.js";
import { computeDisplacementCR, computeFuelRange } from "../../calc-mechanic.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- C.1 transformer-sizing routes through ANSI/IEEE C57 step series ---

test("C.1 transformer 100 kVA required → next step 112.5 (ANSI/IEEE C57)", () => {
  const r = computeTransformerSize({ load_kW: 100, power_factor: 1, primary_V: 480, secondary_V: 208, phase: "three" });
  assert.equal(r.required_kVA, 100);
  assert.equal(r.next_standard_kVA, 112.5);
});

test("C.1 transformer 30 kVA exact match returns 30", () => {
  const r = computeTransformerSize({ load_kW: 30, power_factor: 1, primary_V: 480, secondary_V: 208, phase: "three" });
  assert.equal(r.next_standard_kVA, 30);
});

test("C.1 transformer 1500 kVA caps at 1000 (top of ladder) and flags at_step_cap", () => {
  const r = computeTransformerSize({ load_kW: 1500, power_factor: 1, primary_V: 480, secondary_V: 208, phase: "three" });
  assert.equal(r.next_standard_kVA, 1000);
  assert.equal(r.at_step_cap, true);
});

// --- C.1 voltage-drop voltage_at_load + advisory/limit flags ---

test("C.1 voltage-drop reports voltage_at_load = source - drop", () => {
  const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 50, current_A: 10, source_voltage_V: 120 });
  assert.ok(close(r.voltage_at_load_V, 120 - r.drop_V, 0.001));
});

test("C.1 voltage-drop flags 'within advisory' below 3%", () => {
  const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "10", length_ft: 50, current_A: 10, source_voltage_V: 120 });
  assert.match(r.flag, /within advisory/);
});

test("C.1 voltage-drop flags 'exceeds advisory' above 3%", () => {
  const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "14", length_ft: 100, current_A: 15, source_voltage_V: 120 });
  // 14 AWG, 100 ft, 15 A on 120 V single-phase produces ~ 6% drop.
  assert.match(r.flag, /exceeds (advisory|limit)/);
});

test("C.1 voltage-drop flags 'exceeds limit' above 5%", () => {
  const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "14", length_ft: 200, current_A: 20, source_voltage_V: 120 });
  // Forced large drop scenario.
  assert.match(r.flag, /exceeds limit/);
});

// --- C.2 friction-loss velocity + threshold flag ---

test("C.2 friction-loss reports velocity_ft_s for hazen-williams branch", () => {
  const r = computeFrictionLoss({ method: "hazen-williams", material: "copper", nominal_size: "1", length_ft: 100, flow_gpm: 10 });
  assert.ok(r.velocity_ft_s > 0);
});

test("C.2 friction-loss flags noise risk above 5 ft/s", () => {
  // 0.5 inch SCH40 (ID 0.622) at 10 GPM: velocity = 10 × 0.4085 / 0.622² ≈ 10.6 ft/s → erosion
  const r = computeFrictionLoss({ method: "hazen-williams", material: "copper", nominal_size: "0.5", length_ft: 50, flow_gpm: 10 });
  assert.match(r.velocity_flag, /erosion|noise/);
});

test("C.2 friction-loss flags within typical at low velocity", () => {
  // 2 inch copper at 5 GPM: ID ~ 1.959; velocity ~ 0.53 ft/s → within typical
  const r = computeFrictionLoss({ method: "hazen-williams", material: "copper", nominal_size: "2", length_ft: 50, flow_gpm: 5 });
  assert.match(r.velocity_flag, /within typical/);
});

test("C.2 friction-loss darcy-weisbach branch also reports velocity_flag", () => {
  const r = computeFrictionLoss({ method: "darcy-weisbach", material: "copper", nominal_size: "1", length_ft: 100, flow_gpm: 10 });
  assert.ok(r.velocity_flag);
});

// --- C.4 concrete bag count ---

test("C.4 concrete reports 60 lb and 80 lb bag counts", () => {
  const r = computeConcreteVolume({ shape: "slab", length_ft: 10, width_ft: 10, thickness_in: 4, waste_factor: 0.10 });
  assert.ok(r.bags_60lb > 0);
  assert.ok(r.bags_80lb > 0);
  // 10×10×4" = 33.33 ft³; with 10% = 36.7 ft³; / 0.45 = 81.5 → 82 60lb bags
  assert.ok(r.bags_60lb >= 80 && r.bags_60lb <= 85);
  // / 0.60 = 61.1 → 62 80lb bags
  assert.ok(r.bags_80lb >= 60 && r.bags_80lb <= 65);
});

test("C.4 concrete 80lb bags fewer than 60lb bags (denser fill per bag)", () => {
  const r = computeConcreteVolume({ shape: "slab", length_ft: 10, width_ft: 10, thickness_in: 4, waste_factor: 0.10 });
  assert.ok(r.bags_80lb < r.bags_60lb);
});

// --- C.5 displacement-cr requires_premium_octane flag ---

test("C.5 displacement-cr CR ≤ 10.5 → requires_premium_octane false", () => {
  // 350 SBC: 4.0 bore × 3.48 stroke × 8 cyl × 64 cc chambers ≈ 9.5:1
  const r = computeDisplacementCR({ bore_in: 4.0, stroke_in: 3.48, cylinders: 8, chamber_cc: 64, gasket_bore_in: 4.0, gasket_thickness_in: 0.040, deck_clearance_in: 0.020, dome_dish_cc: 0 });
  assert.ok(r.compression_ratio < 10.5);
  assert.equal(r.requires_premium_octane, false);
});

test("C.5 displacement-cr CR > 10.5 → requires_premium_octane true", () => {
  // Force a high CR: small chamber, no dish.
  const r = computeDisplacementCR({ bore_in: 4.0, stroke_in: 3.48, cylinders: 8, chamber_cc: 50, gasket_bore_in: 4.0, gasket_thickness_in: 0.040, deck_clearance_in: 0.005, dome_dish_cc: 0 });
  assert.ok(r.compression_ratio > 10.5);
  assert.equal(r.requires_premium_octane, true);
});

// --- C.5 fuel-range optional cost ---

test("C.5 fuel-range cost null when no $/gal supplied", () => {
  const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0 });
  assert.equal(r.fuel_cost_usd, null);
  assert.equal(r.cost_per_mile_usd, null);
});

test("C.5 fuel-range cost = tank × $/gal", () => {
  const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0, price_per_gal: 3.50 });
  assert.ok(close(r.fuel_cost_usd, 18 * 3.50, 0.001));
});

test("C.5 fuel-range cost_per_mile = total_cost / range_mi", () => {
  const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0, price_per_gal: 3.50 });
  assert.ok(close(r.cost_per_mile_usd, (18 * 3.50) / (18 * 28), 0.0001));
});
