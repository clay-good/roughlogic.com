// Unit tests for calc-vet.js (spec-v12 Group U starter: U.1
// weight-based dose, U.2 maintenance fluid rate, U.3 RER/MER).
// All three tiles are math aids; the attending veterinarian governs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeVetDose, vetDoseExample,
  computeMaintenanceFluid, maintenanceFluidExample,
  computeEnergyRequirement, energyExample,
  VET_RENDERERS,
} from "../../calc-vet.js";

// --- U.1 Vet dose ---

test("computeVetDose: 20 kg dog, 5 mg/kg, 50 mg/mL -> 100 mg, 2.0 mL", () => {
  const r = computeVetDose(vetDoseExample.inputs);
  assert.equal(r.total_dose_mg, 100);
  assert.equal(r.volume_mL, 2.0);
  assert.equal(r.weight_kg, 20);
});

test("computeVetDose: lb-to-kg conversion accurate to NIST SP 811", () => {
  // 44.092 lb = exactly 20 kg.
  const r = computeVetDose({ weight: 44.092, weight_unit: "lb", dose_mg_per_kg: 5, concentration_mg_per_mL: 50 });
  assert.ok(Math.abs(r.weight_kg - 20) < 0.001);
  assert.ok(Math.abs(r.total_dose_mg - 100) < 0.01);
});

test("computeVetDose: tiny-volume practical flag fires when volume < 0.05 mL", () => {
  // 0.1 kg patient at 1 mg/kg with 500 mg/mL stock -> 0.0002 mL. Patient too small though.
  // Use 0.5 kg / 1 mg/kg / 100 mg/mL = 0.005 mL.
  const r = computeVetDose({ weight: 0.5, weight_unit: "kg", dose_mg_per_kg: 1, concentration_mg_per_mL: 100 });
  assert.match(r.practical_flag, /< 0.05 mL/);
});

test("computeVetDose: large-volume practical flag fires when volume > 50 mL", () => {
  // 50 kg dog, 100 mg/kg, 50 mg/mL = 100 mL.
  const r = computeVetDose({ weight: 50, weight_unit: "kg", dose_mg_per_kg: 100, concentration_mg_per_mL: 50 });
  assert.match(r.practical_flag, /> 50 mL/);
});

test("computeVetDose: out-of-range weight / dose / concentration rejected", () => {
  assert.ok(computeVetDose({ weight: 0, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 50 }).error);
  assert.ok(computeVetDose({ weight: 0.01, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 50 }).error);
  assert.ok(computeVetDose({ weight: 2000, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 50 }).error);
  assert.ok(computeVetDose({ weight: 20, weight_unit: "kg", dose_mg_per_kg: -1, concentration_mg_per_mL: 50 }).error);
  assert.ok(computeVetDose({ weight: 20, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 0 }).error);
});

// --- U.2 Maintenance fluid ---

test("computeMaintenanceFluid: 20 kg dog, 5% dehydration, 24 hr window -> 50 maintenance + 41.67 replacement = 91.67 mL/hr", () => {
  const r = computeMaintenanceFluid(maintenanceFluidExample.inputs);
  assert.equal(r.maintenance_mL_per_hr, 50);
  assert.equal(r.maintenance_mL_per_day, 1200);
  assert.equal(r.replacement_total_mL, 1000);
  assert.ok(Math.abs(r.replacement_rate_mL_per_hr - 41.667) < 0.01);
  assert.ok(Math.abs(r.total_rate_mL_per_hr - 91.667) < 0.01);
});

test("computeMaintenanceFluid: cat uses the same 60 mL/kg/day basis as dog", () => {
  const r = computeMaintenanceFluid({ weight: 5, weight_unit: "kg", species: "cat", dehydration_percent: 0, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 });
  assert.equal(r.basis_mL_per_kg_per_day, 60);
  assert.ok(Math.abs(r.maintenance_mL_per_hr - 12.5) < 0.001);
});

test("computeMaintenanceFluid: horse uses 50 mL/kg/day basis", () => {
  const r = computeMaintenanceFluid({ weight: 500, weight_unit: "kg", species: "horse", dehydration_percent: 0, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 });
  assert.equal(r.basis_mL_per_kg_per_day, 50);
  assert.ok(Math.abs(r.maintenance_mL_per_day - 25000) < 0.001);
});

test("computeMaintenanceFluid: severe-dehydration flag fires at > 8 percent", () => {
  const r = computeMaintenanceFluid({ weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 10, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 });
  assert.equal(r.severe_dehydration_flag, true);
});

test("computeMaintenanceFluid: drops/min for 60 vs 10 gtt/mL sets differ by 6x", () => {
  const r = computeMaintenanceFluid(maintenanceFluidExample.inputs);
  assert.ok(Math.abs(r.gtts_per_min_60_set / r.gtts_per_min_10_set - 6) < 1e-9);
});

test("computeMaintenanceFluid: invalid species / dehydration / window rejected", () => {
  assert.ok(computeMaintenanceFluid({ weight: 20, weight_unit: "kg", species: "iguana", dehydration_percent: 5, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 }).error);
  assert.ok(computeMaintenanceFluid({ weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 20, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 }).error);
  assert.ok(computeMaintenanceFluid({ weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 5, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 100 }).error);
});

// --- U.3 RER / MER ---

test("computeEnergyRequirement: 10 kg active dog -> RER 393.64, MER 629.83", () => {
  const r = computeEnergyRequirement(energyExample.inputs);
  assert.ok(Math.abs(r.RER_kcal_per_day - 393.64) < 0.5, "RER " + r.RER_kcal_per_day);
  assert.ok(Math.abs(r.MER_kcal_per_day - 629.83) < 0.5, "MER " + r.MER_kcal_per_day);
  assert.equal(r.activity_factor, 1.6);
});

test("computeEnergyRequirement: cups/day = MER / kcal_per_cup when supplied", () => {
  const r = computeEnergyRequirement(energyExample.inputs);
  assert.ok(Math.abs(r.cups_per_day - r.MER_kcal_per_day / 400) < 1e-9);
});

test("computeEnergyRequirement: weight-loss factor is below sedentary for dogs and cats", () => {
  const dogActive = computeEnergyRequirement({ weight: 10, weight_unit: "kg", species: "dog", activity: "active", kcal_per_cup: 0 });
  const dogLoss = computeEnergyRequirement({ weight: 10, weight_unit: "kg", species: "dog", activity: "weight_loss", kcal_per_cup: 0 });
  assert.ok(dogLoss.MER_kcal_per_day < dogActive.MER_kcal_per_day);
  const catLoss = computeEnergyRequirement({ weight: 5, weight_unit: "kg", species: "cat", activity: "weight_loss", kcal_per_cup: 0 });
  assert.equal(catLoss.activity_factor, 0.8);
});

test("computeEnergyRequirement: invalid species / activity rejected", () => {
  assert.ok(computeEnergyRequirement({ weight: 10, weight_unit: "kg", species: "rabbit", activity: "active", kcal_per_cup: 0 }).error);
  assert.ok(computeEnergyRequirement({ weight: 10, weight_unit: "kg", species: "dog", activity: "lactation", kcal_per_cup: 0 }).error);  // lactation is cat-only in this starter
});

test("all three Group U renderers exposed in VET_RENDERERS", () => {
  for (const key of ["vet-weight-based-dose", "vet-maintenance-fluid", "vet-energy-requirement"]) {
    assert.ok(typeof VET_RENDERERS[key] === "function", key + " must be registered");
  }
});
