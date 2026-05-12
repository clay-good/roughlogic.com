// spec-v12 Group U: Veterinary starter. Three tiles:
//
//   U.1 Species-aware weight-based dose
//   U.2 Maintenance fluid rate
//   U.3 Resting + metabolic energy requirement (RER / MER)
//
// EVERY Group U tile is a math aid, NEVER a substitute for a current
// drug formulary or an in-person veterinary exam. Each tile renders
// the spec-v10 §B.1 limitation banner above the inputs (canonical
// copy lives in limitation-banner.js) and carries the v12-introduced
// GOVERNANCE.veterinary variant in citations.js.
//
// Spec-v12 §13.1 explicitly overrides the spec.md / spec-v9 §11
// "live drug-dosing or clinical decision support" exclusion for the
// bounded Group U scope: pure-arithmetic dose / fluid / calorie math
// over the public AAHA / AAFP / Holliday-Segar conventions. The
// classical formulas below are taught in every vet-tech program
// and printed in Plumb's, the BSAVA Manual, and DiBartola's Fluid /
// Electrolyte / Acid-Base Disorders.

import { DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

const LB_PER_KG = 2.2046226218; // exact within IEEE-754; NIST SP 811.

function toKg(weight, unit) {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (unit === "lb") return w / LB_PER_KG;
  return w; // kg
}

// ====================================================================
// U.1 Species-aware weight-based dose
// ====================================================================
//
// Pure arithmetic over a user-supplied mg/kg dose and a user-supplied
// stock concentration. The tile bundles NO drug list: vet techs read
// the dose from the current formulary (Plumb's 10th ed. or the FDA-
// approved label) and type it in. The math is total_mg = dose * wt_kg;
// volume_mL = total_mg / concentration.

export function computeVetDose({ weight, weight_unit, dose_mg_per_kg, concentration_mg_per_mL }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  const dose = Number(dose_mg_per_kg);
  const conc = Number(concentration_mg_per_mL);
  if (!Number.isFinite(dose) || dose < 0) return { error: "Enter a non-negative dose in mg/kg." };
  if (!Number.isFinite(conc) || conc <= 0) return { error: "Enter a positive concentration in mg/mL." };
  if (wt_kg < 0.05) return { error: "Weight below 50 g flagged; verify (exotic / neonatal)." };
  if (wt_kg > 1000) return { error: "Weight above 1000 kg flagged; verify (large-animal)." };
  if (dose > 1000) return { error: "Dose above 1000 mg/kg flagged as implausible; verify." };
  const total_mg = dose * wt_kg;
  const volume_mL = total_mg / conc;
  // Practical flags: a draw under 0.05 mL is hard to measure accurately
  // even with a TB syringe; a draw over 50 mL is unusual for IV
  // push and warrants verification.
  let practical_flag = null;
  if (volume_mL > 0 && volume_mL < 0.05) practical_flag = "Volume < 0.05 mL: difficult to draw accurately; verify concentration or consider a dilution.";
  else if (volume_mL > 50) practical_flag = "Volume > 50 mL: unusually large; verify before administering.";
  return {
    weight_kg: wt_kg,
    total_dose_mg: total_mg,
    volume_mL,
    practical_flag,
  };
}

export const vetDoseExample = {
  inputs: { weight: 20, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 50 },
  // 5 * 20 = 100 mg total; 100 / 50 = 2.0 mL.
  expected: { total_dose_mg: 100, volume_mL: 2.0 },
};

export function renderVetDose(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-weight-based-dose");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: total_mg = dose_mg_per_kg * weight_kg; volume_mL = total_mg / concentration_mg_per_mL. No drug list is bundled; the user reads the dose and concentration from the current formulary (Plumb's Veterinary Drug Handbook 10th ed., USP Compendium, or FDA-approved labeling). Veterinarian governs the prescription; RVT / LVT governs the administration.";
  const W = makeNumber("Patient weight", "vd-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "vd-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const D = makeNumber("Dose (mg / kg)", "vd-d", { step: "any", min: "0" });
  const C = makeNumber("Stock concentration (mg / mL)", "vd-c", { step: "any", min: "0" });
  for (const f of [W, U, D, C]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    W.input.value = String(vetDoseExample.inputs.weight);
    U.select.value = vetDoseExample.inputs.weight_unit;
    D.input.value = String(vetDoseExample.inputs.dose_mg_per_kg);
    C.input.value = String(vetDoseExample.inputs.concentration_mg_per_mL);
    update();
  });
  const oWtKg = makeOutputLine(outputRegion, "Weight (kg, derived)", "vd-out-wtkg");
  const oTotal = makeOutputLine(outputRegion, "Total dose (mg)", "vd-out-total");
  const oVol = makeOutputLine(outputRegion, "Volume to draw (mL)", "vd-out-vol");
  const oFlag = makeOutputLine(outputRegion, "Practical flag", "vd-out-flag");
  const update = debounce(() => {
    const r = computeVetDose({
      weight: W.input.value, weight_unit: U.select.value,
      dose_mg_per_kg: D.input.value, concentration_mg_per_mL: C.input.value,
    });
    if (r.error) {
      oWtKg.textContent = r.error;
      for (const o of [oTotal, oVol, oFlag]) o.textContent = "-";
      return;
    }
    oWtKg.textContent = fmt(r.weight_kg, 3);
    oTotal.textContent = fmt(r.total_dose_mg, 2);
    oVol.textContent = fmt(r.volume_mL, 3);
    oFlag.textContent = r.practical_flag || "Within typical draw-volume range.";
  }, DEBOUNCE_MS);
  for (const el of [W.input, D.input, C.input]) el.addEventListener("input", update);
  U.select.addEventListener("change", update);
}

// ====================================================================
// U.2 Maintenance fluid rate
// ====================================================================
//
// Holliday-Segar adapted to veterinary use per DiBartola "Fluid,
// Electrolyte, and Acid-Base Disorders in Small Animal Practice"
// 4th ed. For dogs and cats:
//
//   maintenance_mL_per_hr = (weight_kg * 60) / 24
//                         = weight_kg * 2.5
//
// (Equivalently 60 mL/kg/day spread evenly across 24 hours; some
// references cite 40-60 mL/kg/day depending on body condition, so
// the tile exposes the constant as the standard 60 and warns when
// the dehydration adjustment pushes the total far outside the
// maintenance envelope.)
//
// Large animals (horse, cow) start at 50 mL/kg/day.

const FLUID_BASIS_ML_KG_DAY = {
  dog: 60,
  cat: 60,
  horse: 50,
  cow: 50,
};

export function computeMaintenanceFluid({ weight, weight_unit, species, dehydration_percent, ongoing_losses_mL_per_hr, rehydration_window_hr }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  const basis = FLUID_BASIS_ML_KG_DAY[String(species).toLowerCase()];
  if (!basis) return { error: "Species must be one of: dog, cat, horse, cow." };
  const dh = Number(dehydration_percent) || 0;
  const loss = Number(ongoing_losses_mL_per_hr) || 0;
  const window = Number(rehydration_window_hr) || 24;
  if (dh < 0 || dh > 15) return { error: "Dehydration percent must be 0 to 15." };
  if (loss < 0) return { error: "Ongoing losses cannot be negative." };
  if (window <= 0 || window > 72) return { error: "Rehydration window must be between 0 and 72 hours." };
  // Maintenance.
  const maintenance_mL_per_day = basis * wt_kg;
  const maintenance_mL_per_hr = maintenance_mL_per_day / 24;
  // Replacement volume = body weight (kg) * dehydration fraction * 1000 (kg of body water -> mL).
  const replacement_total_mL = wt_kg * (dh / 100) * 1000;
  const replacement_rate_mL_per_hr = replacement_total_mL / window;
  // Total infusion rate (with ongoing losses).
  const total_rate_mL_per_hr = maintenance_mL_per_hr + replacement_rate_mL_per_hr + loss;
  // Drops per minute for standard sets.
  const gtts_per_min_60 = total_rate_mL_per_hr; // 60 gtt/mL pediatric set
  const gtts_per_min_10 = total_rate_mL_per_hr / 6; // 10 gtt/mL adult set
  return {
    species,
    weight_kg: wt_kg,
    basis_mL_per_kg_per_day: basis,
    maintenance_mL_per_hr,
    maintenance_mL_per_day,
    replacement_total_mL,
    replacement_rate_mL_per_hr,
    ongoing_losses_mL_per_hr: loss,
    total_rate_mL_per_hr,
    gtts_per_min_60_set: gtts_per_min_60,
    gtts_per_min_10_set: gtts_per_min_10,
    severe_dehydration_flag: dh > 8,
  };
}

export const maintenanceFluidExample = {
  inputs: { weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 5, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 },
  // 20 kg dog: maintenance = 60*20 = 1200 mL/day = 50 mL/hr.
  // Replacement = 20 * 0.05 * 1000 = 1000 mL; over 24 hr = 41.67 mL/hr.
  // Total = 91.67 mL/hr.
  expected: { maintenance_mL_per_hr: 50, total_rate_mL_per_hr: 91.67 },
};

const SPECIES_OPTS = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "horse", label: "Horse" },
  { value: "cow", label: "Cow / cattle" },
];

export function renderMaintenanceFluid(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-maintenance-fluid");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Holliday-Segar adapted for small animals per DiBartola, 'Fluid, Electrolyte, and Acid-Base Disorders in Small Animal Practice' (4th ed.). Maintenance basis: dog / cat 60 mL/kg/day; horse / cow 50 mL/kg/day. Replacement = body weight * dehydration fraction. Veterinarian governs adjustments for cardiac / renal / hepatic disease.";
  const W = makeNumber("Patient weight", "mf-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "mf-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const S = makeSelect("Species", "mf-s", SPECIES_OPTS);
  const D = makeNumber("Estimated dehydration (percent, 0-15)", "mf-d", { step: "any", min: "0", max: "15", value: "0" });
  const L = makeNumber("Ongoing losses (mL/hr; vomiting / diarrhea / drain)", "mf-l", { step: "any", min: "0", value: "0" });
  const Win = makeNumber("Rehydration window (hr)", "mf-win", { step: "any", min: "0", max: "72", value: "24" });
  for (const f of [W, U, S, D, L, Win]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    W.input.value = String(maintenanceFluidExample.inputs.weight);
    U.select.value = maintenanceFluidExample.inputs.weight_unit;
    S.select.value = maintenanceFluidExample.inputs.species;
    D.input.value = String(maintenanceFluidExample.inputs.dehydration_percent);
    L.input.value = String(maintenanceFluidExample.inputs.ongoing_losses_mL_per_hr);
    Win.input.value = String(maintenanceFluidExample.inputs.rehydration_window_hr);
    update();
  });
  const oMaint = makeOutputLine(outputRegion, "Maintenance rate (mL/hr)", "mf-out-maint");
  const oReplTot = makeOutputLine(outputRegion, "Replacement volume (mL)", "mf-out-repltot");
  const oReplRate = makeOutputLine(outputRegion, "Replacement rate over window (mL/hr)", "mf-out-replrate");
  const oTotal = makeOutputLine(outputRegion, "Total infusion rate (mL/hr)", "mf-out-total");
  const oG60 = makeOutputLine(outputRegion, "Drops/min on a 60 gtt/mL pediatric set", "mf-out-g60");
  const oG10 = makeOutputLine(outputRegion, "Drops/min on a 10 gtt/mL adult set", "mf-out-g10");
  const oFlag = makeOutputLine(outputRegion, "Severe-dehydration flag", "mf-out-flag");
  const update = debounce(() => {
    const r = computeMaintenanceFluid({
      weight: W.input.value, weight_unit: U.select.value, species: S.select.value,
      dehydration_percent: D.input.value, ongoing_losses_mL_per_hr: L.input.value,
      rehydration_window_hr: Win.input.value,
    });
    if (r.error) {
      oMaint.textContent = r.error;
      for (const o of [oReplTot, oReplRate, oTotal, oG60, oG10, oFlag]) o.textContent = "-";
      return;
    }
    oMaint.textContent = fmt(r.maintenance_mL_per_hr, 2);
    oReplTot.textContent = fmt(r.replacement_total_mL, 1);
    oReplRate.textContent = fmt(r.replacement_rate_mL_per_hr, 2);
    oTotal.textContent = fmt(r.total_rate_mL_per_hr, 2);
    oG60.textContent = fmt(r.gtts_per_min_60_set, 1);
    oG10.textContent = fmt(r.gtts_per_min_10_set, 1);
    oFlag.textContent = r.severe_dehydration_flag
      ? "Dehydration > 8%: severe; needs ICU-level monitoring and slower replacement window."
      : "Within typical replacement envelope.";
  }, DEBOUNCE_MS);
  for (const el of [W.input, D.input, L.input, Win.input]) el.addEventListener("input", update);
  for (const sel of [U.select, S.select]) sel.addEventListener("change", update);
}

// ====================================================================
// U.3 Resting and metabolic energy requirement (RER / MER)
// ====================================================================
//
// AAHA-AAFP Life Stage Guidelines (canine 2019, feline 2021). The
// public allometric formula for RER (resting energy requirement) is:
//
//   RER_kcal_per_day = 70 * weight_kg ^ 0.75
//
// MER (maintenance energy requirement) = RER * activity_factor where
// the factor depends on life stage and activity. AAHA / AAFP published
// ranges (dog / cat):
//
//   sedentary / neutered adult: 1.2 (dog) / 1.0-1.2 (cat)
//   active adult:               1.6 (dog) / 1.4 (cat)
//   working / pregnant / late:  2.0-5.0 (dog), 2.5 lactation (cat)
//   weight loss:                1.0 (dog), 0.8 (cat)
//   growth:                     2.0-3.0 (puppy / kitten)

const ACTIVITY_FACTORS = {
  dog: {
    sedentary: 1.2,
    active: 1.6,
    working: 3.0,
    growth: 2.5,
    weight_loss: 1.0,
  },
  cat: {
    sedentary: 1.0,
    active: 1.4,
    lactation: 2.5,
    growth: 2.5,
    weight_loss: 0.8,
  },
};

export function computeEnergyRequirement({ weight, weight_unit, species, activity, kcal_per_cup }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  if (wt_kg < 0.5 || wt_kg > 100) return { error: "Weight below 0.5 kg or above 100 kg flagged; verify." };
  const sp = String(species).toLowerCase();
  if (!ACTIVITY_FACTORS[sp]) return { error: "Species must be 'dog' or 'cat'." };
  const factor = ACTIVITY_FACTORS[sp][String(activity).toLowerCase()];
  if (!Number.isFinite(factor)) {
    return { error: "Activity must be one of: " + Object.keys(ACTIVITY_FACTORS[sp]).join(", ") + "." };
  }
  const RER = 70 * Math.pow(wt_kg, 0.75);
  const MER = RER * factor;
  // Cups per day if a per-cup kcal is supplied (typical kibble: 350-500 kcal/cup).
  const kpc = Number(kcal_per_cup);
  let cups_per_day = null;
  if (Number.isFinite(kpc) && kpc > 0) cups_per_day = MER / kpc;
  return {
    weight_kg: wt_kg,
    RER_kcal_per_day: RER,
    activity_factor: factor,
    MER_kcal_per_day: MER,
    cups_per_day,
  };
}

export const energyExample = {
  inputs: { weight: 10, weight_unit: "kg", species: "dog", activity: "active", kcal_per_cup: 400 },
  // RER = 70 * 10^0.75 = 70 * 5.6234 = 393.64 kcal/day.
  // MER = 393.64 * 1.6 = 629.83.
  // Cups = 629.83 / 400 = 1.575.
  expected: { RER_kcal_per_day_approx: 393.64, MER_kcal_per_day_approx: 629.83 },
};

export function renderEnergyRequirement(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-energy-requirement");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Allometric RER = 70 * weight_kg ^ 0.75 (AAHA Canine Life Stage Guidelines 2019; AAFP Feline Life Stage Guidelines 2021). MER = RER * activity factor per the AAHA published factor ranges. Veterinarian governs in chronic disease states (cardiac, renal, hepatic, neoplasia, hyperthyroidism).";
  const W = makeNumber("Patient weight", "er-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "er-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const S = makeSelect("Species", "er-s", [
    { value: "dog", label: "Dog" }, { value: "cat", label: "Cat" },
  ]);
  const A = makeSelect("Life stage / activity", "er-a", [
    { value: "sedentary", label: "Sedentary / neutered adult" },
    { value: "active", label: "Active adult" },
    { value: "working", label: "Working (dog)" },
    { value: "lactation", label: "Lactation (cat)" },
    { value: "growth", label: "Growth (puppy / kitten)" },
    { value: "weight_loss", label: "Weight loss" },
  ]);
  const K = makeNumber("Diet caloric density (kcal/cup, optional)", "er-k", { step: "any", min: "0", value: "0" });
  for (const f of [W, U, S, A, K]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    W.input.value = String(energyExample.inputs.weight);
    U.select.value = energyExample.inputs.weight_unit;
    S.select.value = energyExample.inputs.species;
    A.select.value = energyExample.inputs.activity;
    K.input.value = String(energyExample.inputs.kcal_per_cup);
    update();
  });
  const oRER = makeOutputLine(outputRegion, "RER (kcal/day)", "er-out-rer");
  const oFactor = makeOutputLine(outputRegion, "Activity factor", "er-out-factor");
  const oMER = makeOutputLine(outputRegion, "MER (kcal/day)", "er-out-mer");
  const oCups = makeOutputLine(outputRegion, "Cups per day (if kcal/cup supplied)", "er-out-cups");
  const update = debounce(() => {
    const r = computeEnergyRequirement({
      weight: W.input.value, weight_unit: U.select.value, species: S.select.value,
      activity: A.select.value, kcal_per_cup: K.input.value,
    });
    if (r.error) {
      oRER.textContent = r.error;
      for (const o of [oFactor, oMER, oCups]) o.textContent = "-";
      return;
    }
    oRER.textContent = fmt(r.RER_kcal_per_day, 1);
    oFactor.textContent = fmt(r.activity_factor, 2) + "x";
    oMER.textContent = fmt(r.MER_kcal_per_day, 1);
    oCups.textContent = r.cups_per_day != null ? fmt(r.cups_per_day, 2) : "-";
  }, DEBOUNCE_MS);
  for (const el of [W.input, K.input]) el.addEventListener("input", update);
  for (const sel of [U.select, S.select, A.select]) sel.addEventListener("change", update);
}

// --- Renderer registry ---

export const VET_RENDERERS = {
  "vet-weight-based-dose": renderVetDose,
  "vet-maintenance-fluid": renderMaintenanceFluid,
  "vet-energy-requirement": renderEnergyRequirement,
};
