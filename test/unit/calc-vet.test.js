// Unit tests for calc-vet.js (spec-v12 Group U starter: U.1
// weight-based dose, U.2 maintenance fluid rate, U.3 RER/MER).
// All three tiles are math aids; the attending veterinarian governs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeVetDose, vetDoseExample,
  computeMaintenanceFluid, maintenanceFluidExample,
  computeEnergyRequirement, energyExample,
  computeBCSReference, bcsExample,
  computePetAge, petAgeExample,
  computeGestation, gestationExample,
  computeETTSizing, ettExample,
  computeAnesthesiaVitals, anesthesiaVitalsExample,
  computeASAReference, asaExample,
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

// --- U.6 BCS reference ---

test("computeBCSReference: dog returns 9 bands on the 1-9 scale", () => {
  const r = computeBCSReference(bcsExample.inputs);
  assert.equal(r.species, "dog");
  assert.equal(r.bands.length, 9);
  assert.equal(r.bands[0].score, 1);
  assert.equal(r.bands[8].score, 9);
  assert.match(r.scale, /1-9/);
});

test("computeBCSReference: cat returns its own 9-band table", () => {
  const r = computeBCSReference({ species: "cat" });
  assert.equal(r.species, "cat");
  assert.equal(r.bands.length, 9);
  // Cat band 1 description differs from dog band 1 (the texts differ).
  const dog = computeBCSReference({ species: "dog" });
  assert.notEqual(r.bands[0].description, dog.bands[0].description);
});

test("computeBCSReference: invalid species rejected", () => {
  assert.ok(computeBCSReference({ species: "rabbit" }).error);
});

// --- U.7 Pet age ---

test("computePetAge: 5-year medium dog -> 39 human years", () => {
  const r = computePetAge(petAgeExample.inputs);
  assert.equal(r.human_age_equivalent_years, 39);
});

test("computePetAge: 1-year-old maps to 15", () => {
  const r = computePetAge({ species: "dog", pet_age_years: 1, size_band: "medium" });
  assert.equal(r.human_age_equivalent_years, 15);
});

test("computePetAge: 2-year-old maps to 24 across both species", () => {
  const dog = computePetAge({ species: "dog", pet_age_years: 2, size_band: "medium" });
  const cat = computePetAge({ species: "cat", pet_age_years: 2 });
  assert.equal(dog.human_age_equivalent_years, 24);
  assert.equal(cat.human_age_equivalent_years, 24);
});

test("computePetAge: larger size band ages dogs faster post-year-2", () => {
  const small = computePetAge({ species: "dog", pet_age_years: 5, size_band: "small" });
  const giant = computePetAge({ species: "dog", pet_age_years: 5, size_band: "giant" });
  assert.ok(giant.human_age_equivalent_years > small.human_age_equivalent_years);
});

test("computePetAge: cat year 5 = 24 + 3*4 = 36", () => {
  const r = computePetAge({ species: "cat", pet_age_years: 5 });
  assert.equal(r.human_age_equivalent_years, 36);
});

test("computePetAge: out-of-range age / unknown species / band rejected", () => {
  assert.ok(computePetAge({ species: "dog", pet_age_years: -1, size_band: "medium" }).error);
  assert.ok(computePetAge({ species: "dog", pet_age_years: 35, size_band: "medium" }).error);
  assert.ok(computePetAge({ species: "hamster", pet_age_years: 2 }).error);
  assert.ok(computePetAge({ species: "dog", pet_age_years: 5, size_band: "tiny" }).error);
});

// --- U.15 Gestation ---

test("computeGestation: dog bred 2026-03-01 -> due 2026-05-03", () => {
  const r = computeGestation(gestationExample.inputs);
  assert.equal(r.estimated_due_date_iso, "2026-05-03");
  assert.equal(r.range_low_iso, "2026-04-28");
  assert.equal(r.range_high_iso, "2026-05-08");
  assert.equal(r.gestation_days_mean, 63);
});

test("computeGestation: horse uses 340-day mean", () => {
  const r = computeGestation({ species: "horse", breeding_date_iso: "2026-01-01" });
  assert.equal(r.gestation_days_mean, 340);
  // 2026-01-01 + 340 = 2026-12-07.
  assert.equal(r.estimated_due_date_iso, "2026-12-07");
});

test("computeGestation: invalid date / species rejected", () => {
  assert.ok(computeGestation({ species: "dog", breeding_date_iso: "not a date" }).error);
  assert.ok(computeGestation({ species: "iguana", breeding_date_iso: "2026-03-01" }).error);
});

// --- U.4 ETT sizing ---

test("computeETTSizing: 20 kg dog -> 8.0 mm ETT, 20-ga IVC", () => {
  const r = computeETTSizing(ettExample.inputs);
  assert.equal(r.ett_mm_id, 8.0);
  assert.equal(r.ivc_gauge, 20);
  assert.equal(r.band_max_kg, 25);
});

test("computeETTSizing: lb input converts before banding", () => {
  // 44.092 lb = 20 kg exactly per NIST conversion.
  const r = computeETTSizing({ species: "dog", weight: 44.092, weight_unit: "lb" });
  assert.equal(r.ett_mm_id, 8.0);
});

test("computeETTSizing: 4 kg cat -> 3.5 mm ETT, 22-ga IVC", () => {
  const r = computeETTSizing({ species: "cat", weight_kg: 4 });
  assert.equal(r.ett_mm_id, 3.5);
  assert.equal(r.ivc_gauge, 22);
});

test("computeETTSizing: large draft horse -> 26 mm ETT", () => {
  const r = computeETTSizing({ species: "horse", weight_kg: 800 });
  assert.equal(r.ett_mm_id, 26.0);
});

test("computeETTSizing: unknown species / out-of-range weight rejected", () => {
  assert.ok(computeETTSizing({ species: "bird", weight_kg: 1 }).error);
  assert.ok(computeETTSizing({ species: "dog", weight_kg: 0 }).error);
  assert.ok(computeETTSizing({ species: "dog", weight_kg: 2000 }).error);
});

// --- U.12 Anesthesia vitals ---

test("computeAnesthesiaVitals: dog returns canonical HR/RR/MAP/SpO2/ETCO2 ranges", () => {
  const r = computeAnesthesiaVitals(anesthesiaVitalsExample.inputs);
  assert.match(r.ranges.hr_bpm, /60-140/);
  assert.match(r.ranges.spo2_percent, />= 95/);
});

test("computeAnesthesiaVitals: horse has different (lower) HR + (higher) ETCO2 range than dog", () => {
  const dog = computeAnesthesiaVitals({ species: "dog" });
  const horse = computeAnesthesiaVitals({ species: "horse" });
  assert.notEqual(dog.ranges.hr_bpm, horse.ranges.hr_bpm);
  assert.notEqual(dog.ranges.etco2_mmHg, horse.ranges.etco2_mmHg);
});

test("computeAnesthesiaVitals: unknown species rejected", () => {
  assert.ok(computeAnesthesiaVitals({ species: "iguana" }).error);
});

// --- U.18 ASA classification ---

test("computeASAReference: returns 5 numbered classes plus the E modifier", () => {
  const r = computeASAReference();
  assert.equal(r.classes.length, 6);
  assert.equal(r.classes[0].class, "I");
  assert.equal(r.classes[4].class, "V");
  assert.equal(r.classes[5].class, "E");
});

test("computeASAReference: each entry has a label and description", () => {
  const r = computeASAReference();
  for (const c of r.classes) {
    assert.ok(typeof c.label === "string" && c.label.length > 0);
    assert.ok(typeof c.description === "string" && c.description.length > 10);
  }
});

test("all nine Group U renderers exposed in VET_RENDERERS", () => {
  for (const key of ["vet-weight-based-dose", "vet-maintenance-fluid", "vet-energy-requirement", "vet-bcs-reference", "vet-pet-age", "vet-gestation", "vet-ett-sizing", "vet-anesthesia-vitals", "vet-asa-classification"]) {
    assert.ok(typeof VET_RENDERERS[key] === "function", key + " must be registered");
  }
});
