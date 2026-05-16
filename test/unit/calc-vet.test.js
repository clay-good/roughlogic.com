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
  computeBloodworkRanges, bloodworkExample,
  computeUrineSG, urineSGExample,
  computeTargetWeightLoss, targetWeightLossExample,
  computeToxicity, toxicityExample,
  computeBreedPredispositions, breedPredispositionsExample,
  computeSteadyStateConcentration, steadyStateExample,
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

// --- U.10 Bloodwork reference ranges ---

test("computeBloodworkRanges: dog returns 5 CBC and 9 chemistry analytes", () => {
  const r = computeBloodworkRanges(bloodworkExample.inputs);
  assert.equal(r.cbc.length, 5);
  assert.equal(r.chem.length, 9);
  assert.equal(r.species, "dog");
});

test("computeBloodworkRanges: each entry carries a name and range string", () => {
  const r = computeBloodworkRanges({ species: "cat" });
  for (const e of [...r.cbc, ...r.chem]) {
    assert.ok(typeof e.name === "string" && e.name.length > 0);
    assert.ok(typeof e.range === "string" && e.range.length > 0);
  }
});

test("computeBloodworkRanges: horse chem swaps ALT for AST + GGT (ruminant / equine convention)", () => {
  const horse = computeBloodworkRanges({ species: "horse" });
  const names = horse.chem.map((e) => e.name).join(" ");
  assert.match(names, /AST/);
  assert.match(names, /GGT/);
});

test("computeBloodworkRanges: unknown species rejected", () => {
  assert.ok(computeBloodworkRanges({ species: "iguana" }).error);
});

// --- U.11 Urine specific gravity bands ---

test("computeUrineSG: dog well-concentrated cutoff is >= 1.030", () => {
  const r = computeUrineSG(urineSGExample.inputs);
  assert.equal(r.bands.well_concentrated, ">= 1.030");
  assert.equal(r.bands.isosthenuric, "1.008 - 1.012");
});

test("computeUrineSG: cat well-concentrated cutoff is >= 1.035 (obligate concentrator)", () => {
  const r = computeUrineSG({ species: "cat" });
  assert.equal(r.bands.well_concentrated, ">= 1.035");
});

test("computeUrineSG: horse and cow surfaced with typical-range band", () => {
  assert.ok(computeUrineSG({ species: "horse" }).bands.typical);
  assert.ok(computeUrineSG({ species: "cow" }).bands.typical);
});

test("computeUrineSG: unknown species rejected", () => {
  assert.ok(computeUrineSG({ species: "ferret" }).error);
});

// --- U.14 Target weight-loss plan ---

test("computeTargetWeightLoss: 30 kg dog -> 25 kg target -> target RER ~ 782.6 kcal/day", () => {
  const r = computeTargetWeightLoss(targetWeightLossExample.inputs);
  assert.ok(Math.abs(r.target_RER_kcal_per_day - 782.62) < 0.5);
  assert.equal(r.deficit_kg, 5);
  assert.ok(Math.abs(r.weeks.at_1_5_pct_per_wk - 11.11) < 0.1);
});

test("computeTargetWeightLoss: 2% per week is faster than 1% per week", () => {
  const r = computeTargetWeightLoss({ current_weight: 30, target_weight: 25, weight_unit: "kg", species: "dog" });
  assert.ok(r.weeks.at_2_pct_per_wk < r.weeks.at_1_pct_per_wk);
  // 1% rate: 5 / 0.30 = ~16.67 weeks.
  assert.ok(Math.abs(r.weeks.at_1_pct_per_wk - 16.667) < 0.1);
});

test("computeTargetWeightLoss: cups/day computed when kcal/cup is supplied", () => {
  const r = computeTargetWeightLoss(targetWeightLossExample.inputs);
  // target_RER / 300 kcal/cup = 782.62 / 300 = ~2.609.
  assert.ok(Math.abs(r.cups_per_day - 2.609) < 0.05);
});

test("computeTargetWeightLoss: lb inputs round-trip through kg", () => {
  const r = computeTargetWeightLoss({ current_weight: 66.139, target_weight: 55.116, weight_unit: "lb", species: "dog" });
  // 66.139 lb = 30 kg; 55.116 lb = 25 kg.
  assert.ok(Math.abs(r.current_weight_kg - 30) < 0.01);
  assert.ok(Math.abs(r.target_weight_kg - 25) < 0.01);
});

test("computeTargetWeightLoss: target >= current rejected (this tile is weight-loss only)", () => {
  assert.ok(computeTargetWeightLoss({ current_weight: 25, target_weight: 30, weight_unit: "kg", species: "dog" }).error);
  assert.ok(computeTargetWeightLoss({ current_weight: 25, target_weight: 25, weight_unit: "kg", species: "dog" }).error);
});

test("computeTargetWeightLoss: unknown species / non-positive weight rejected", () => {
  assert.ok(computeTargetWeightLoss({ current_weight: 30, target_weight: 25, weight_unit: "kg", species: "iguana" }).error);
  assert.ok(computeTargetWeightLoss({ current_weight: 0, target_weight: -1, weight_unit: "kg", species: "dog" }).error);
});

test("all twelve Group U renderers exposed in VET_RENDERERS after U.10 / U.11 / U.14", () => {
  for (const key of ["vet-bloodwork-ranges", "vet-urine-sg", "vet-target-weight-loss"]) {
    assert.ok(typeof VET_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- U.5 Toxicity dose-by-weight ---

test("computeToxicity: 10 kg dog + 50 g dark chocolate -> ~26.46 mg/kg theobromine; mild band", () => {
  const r = computeToxicity(toxicityExample.inputs);
  assert.ok(Math.abs(r.theobromine_mg_per_kg - 26.455) < 0.05);
  assert.equal(r.exceeded_mild_threshold, true);
  assert.match(r.band_label, /Mild GI signs/);
});

test("computeToxicity: chocolate baking type is much more concentrated than milk", () => {
  const milk = computeToxicity({ toxin: "chocolate", weight: 10, weight_unit: "kg", choc_type: "milk", choc_grams: 50 });
  const baking = computeToxicity({ toxin: "chocolate", weight: 10, weight_unit: "kg", choc_type: "baking", choc_grams: 50 });
  assert.ok(baking.theobromine_mg_per_kg > milk.theobromine_mg_per_kg * 5);
});

test("computeToxicity: xylitol 0.05 g/kg below the 0.1 g/kg hypoglycemia threshold", () => {
  const r = computeToxicity({ toxin: "xylitol", weight: 10, weight_unit: "kg", xylitol_grams: 0.5 });
  assert.ok(Math.abs(r.dose_g_per_kg - 0.05) < 1e-9);
  assert.equal(r.exceeded_hypoglycemia_threshold, false);
});

test("computeToxicity: xylitol >= 0.5 g/kg triggers the hepatotoxicity band", () => {
  const r = computeToxicity({ toxin: "xylitol", weight: 10, weight_unit: "kg", xylitol_grams: 6 });
  assert.ok(r.dose_g_per_kg >= 0.5);
  assert.equal(r.exceeded_hepatic_threshold, true);
  assert.match(r.band_label, /Hepatotoxicity/);
});

test("computeToxicity: ethylene glycol uses cat LD50 1.4 vs dog 4.4 mL/kg", () => {
  const dog = computeToxicity({ toxin: "ethylene_glycol", weight: 5, weight_unit: "kg", species: "dog", ethylene_glycol_mL: 22 });
  const cat = computeToxicity({ toxin: "ethylene_glycol", weight: 5, weight_unit: "kg", species: "cat", ethylene_glycol_mL: 22 });
  assert.equal(dog.ld50_mL_per_kg, 4.4);
  assert.equal(cat.ld50_mL_per_kg, 1.4);
  // Same mL / kg dose; cat fraction-of-LD50 is much larger.
  assert.ok(cat.fraction_of_ld50 > dog.fraction_of_ld50);
});

test("computeToxicity: raisin / grape always flags APCC for any non-zero ingestion", () => {
  const r = computeToxicity({ toxin: "raisin_grape", weight: 10, weight_unit: "kg", raisin_grape_grams: 5 });
  assert.equal(r.always_call_apcc, true);
  assert.match(r.band_label, /acute kidney injury/);
});

test("computeToxicity: unknown toxin / invalid chocolate type / invalid weight rejected", () => {
  assert.ok(computeToxicity({ toxin: "antifreeze", weight: 10, weight_unit: "kg" }).error);
  assert.ok(computeToxicity({ toxin: "chocolate", weight: 10, weight_unit: "kg", choc_type: "bonbon", choc_grams: 50 }).error);
  assert.ok(computeToxicity({ toxin: "chocolate", weight: 0, weight_unit: "kg", choc_type: "dark", choc_grams: 50 }).error);
});

// --- U.13 Breed predispositions ---

test("computeBreedPredispositions: 'doberman' returns one matched row (DCM / vWD / Wobbler)", () => {
  const r = computeBreedPredispositions(breedPredispositionsExample.inputs);
  assert.equal(r.rows.length, 1);
  assert.equal(r.count, 1);
  assert.match(r.rows[0].breed, /Doberman/);
});

test("computeBreedPredispositions: case-insensitive substring match on conditions too", () => {
  const r = computeBreedPredispositions({ query: "GDV" });
  // German Shepherd and Great Dane / large + giant breeds both mention GDV.
  assert.ok(r.rows.length >= 2);
});

test("computeBreedPredispositions: empty query returns the full table", () => {
  const r = computeBreedPredispositions({ query: "" });
  assert.ok(r.rows.length >= 10);
});

test("computeBreedPredispositions: no match returns zero rows", () => {
  const r = computeBreedPredispositions({ query: "xyz-not-a-breed" });
  assert.equal(r.rows.length, 0);
  assert.equal(r.count, 0);
});

// --- U.16 Plasma steady-state concentration ---

test("computeSteadyStateConcentration: 100 mg / F=1 / CL 5 mL/kg/min / tau 8 hr / 10 kg -> Css 4.167 ug/mL", () => {
  const r = computeSteadyStateConcentration(steadyStateExample.inputs);
  assert.ok(Math.abs(r.Css_ug_per_mL - 4.167) < 0.005);
  assert.equal(r.CL_mL_per_min, 50);
  assert.equal(r.tau_min, 480);
});

test("computeSteadyStateConcentration: F < 1 reduces Css linearly", () => {
  const full = computeSteadyStateConcentration(steadyStateExample.inputs);
  const half = computeSteadyStateConcentration({ ...steadyStateExample.inputs, bioavailability_F: 0.5 });
  assert.ok(Math.abs(half.Css_ug_per_mL - full.Css_ug_per_mL / 2) < 1e-6);
});

test("computeSteadyStateConcentration: doubling dose doubles Css", () => {
  const r1 = computeSteadyStateConcentration(steadyStateExample.inputs);
  const r2 = computeSteadyStateConcentration({ ...steadyStateExample.inputs, dose_mg: 200 });
  assert.ok(Math.abs(r2.Css_ug_per_mL - r1.Css_ug_per_mL * 2) < 1e-6);
});

test("computeSteadyStateConcentration: invalid inputs rejected (F out of range, tau too long, etc.)", () => {
  assert.ok(computeSteadyStateConcentration({ ...steadyStateExample.inputs, bioavailability_F: 0 }).error);
  assert.ok(computeSteadyStateConcentration({ ...steadyStateExample.inputs, bioavailability_F: 1.5 }).error);
  assert.ok(computeSteadyStateConcentration({ ...steadyStateExample.inputs, tau_hr: 200 }).error);
  assert.ok(computeSteadyStateConcentration({ ...steadyStateExample.inputs, clearance_mL_per_kg_per_min: 0 }).error);
  assert.ok(computeSteadyStateConcentration({ ...steadyStateExample.inputs, dose_mg: -10 }).error);
});

test("all fifteen Group U renderers exposed in VET_RENDERERS after U.5 / U.13 / U.16", () => {
  for (const key of ["vet-toxicity", "vet-breed-predispositions", "vet-plasma-css"]) {
    assert.ok(typeof VET_RENDERERS[key] === "function", key + " must be registered");
  }
});
