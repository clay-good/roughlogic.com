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

import { DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";
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

// dims: in { weight: M, weight_unit: dimensionless, dose_mg_per_kg: dimensionless, concentration_mg_per_mL: dimensionless }
//        out: { weight_kg: M, total_dose_mg: dimensionless, volume_mL: L^3, practical_flag: dimensionless }
// (mg / kg and mg / mL surface as dimensionless caller-typed quantities per spec-v14 §7.1.)
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

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
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

// dims: in { weight: M, weight_unit: dimensionless, species: dimensionless, dehydration_percent: dimensionless, ongoing_losses_mL_per_hr: L^3 T^-1, rehydration_window_hr: T }
//        out: { species: dimensionless, weight_kg: M, basis_mL_per_kg_per_day: dimensionless, maintenance_mL_per_hr: L^3 T^-1, maintenance_mL_per_day: L^3 T^-1, replacement_total_mL: L^3, replacement_rate_mL_per_hr: L^3 T^-1, ongoing_losses_mL_per_hr: L^3 T^-1, total_rate_mL_per_hr: L^3 T^-1, gtts_per_min_60_set: T^-1, gtts_per_min_10_set: T^-1, severe_dehydration_flag: dimensionless }
export function computeMaintenanceFluid({ weight, weight_unit, species, dehydration_percent, ongoing_losses_mL_per_hr, rehydration_window_hr }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  const basis = FLUID_BASIS_ML_KG_DAY[String(species).toLowerCase()];
  if (!basis) return { error: "Species must be one of: dog, cat, horse, cow." };
  // DR-15: a garbled present value (e.g. "5o", "1OO") must error, not coerce
  // to 0 and silently drop replacement fluid. Absent fields keep their
  // default; present-but-non-finite fields are rejected.
  const absent = (v) => v === undefined || v === null || v === "";
  const dh = absent(dehydration_percent) ? 0 : Number(dehydration_percent);
  const loss = absent(ongoing_losses_mL_per_hr) ? 0 : Number(ongoing_losses_mL_per_hr);
  const window = absent(rehydration_window_hr) ? 24 : Number(rehydration_window_hr);
  if (!Number.isFinite(dh)) return { error: "Dehydration percent must be a number." };
  if (!Number.isFinite(loss)) return { error: "Ongoing losses must be a number." };
  if (!Number.isFinite(window)) return { error: "Rehydration window must be a number." };
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

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
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

// dims: in { weight: M, weight_unit: dimensionless, species: dimensionless, activity: dimensionless, kcal_per_cup: dimensionless }
//        out: { weight_kg: M, RER_kcal_per_day: dimensionless, activity_factor: dimensionless, MER_kcal_per_day: dimensionless, cups_per_day: dimensionless }
// (Caloric energy surfaces as dimensionless caller-typed kcal per spec-v14 §7.1.)
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

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
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

// ====================================================================
// U.6 Body Condition Score (BCS) reference
// ====================================================================
//
// AAHA / AAFP body-condition-score scale 1 to 9 (also 1-5 in some
// older systems; the 1-9 scale is the AAHA / WSAVA / AAFP modern
// consensus). Reference render: the tile prints the full 9-band
// description for the chosen species so a vet tech / owner can
// match the patient against verbal anchors.

const BCS_BANDS_DOG = [
  { score: 1, label: "Emaciated", description: "Ribs, lumbar vertebrae, pelvic bones, and all bony prominences evident from a distance. No discernible body fat. Obvious loss of muscle mass." },
  { score: 2, label: "Very thin", description: "Ribs, lumbar vertebrae, and pelvic bones easily visible. No palpable fat. Some evidence of other bony prominence. Minimal loss of muscle mass." },
  { score: 3, label: "Thin", description: "Ribs easily palpated and may be visible with no palpable fat. Tops of lumbar vertebrae visible. Pelvic bones becoming prominent. Obvious waist." },
  { score: 4, label: "Underweight", description: "Ribs easily palpable with minimal fat covering. Waist easily noted, viewed from above. Abdominal tuck evident." },
  { score: 5, label: "Ideal", description: "Ribs palpable without excess fat covering. Waist observed behind ribs when viewed from above. Abdomen tucked up when viewed from side." },
  { score: 6, label: "Overweight", description: "Ribs palpable with slight excess fat covering. Waist is discernible from above but is not prominent. Abdominal tuck apparent." },
  { score: 7, label: "Heavy", description: "Ribs palpable with difficulty; heavy fat cover. Noticeable fat deposits over lumbar area and base of tail. Waist absent or barely visible. Abdominal tuck may be present." },
  { score: 8, label: "Obese", description: "Ribs not palpable under very heavy fat cover, or palpable only with significant pressure. Heavy fat deposits over lumbar area and base of tail. Waist absent. No abdominal tuck. Obvious abdominal distention may be present." },
  { score: 9, label: "Severely obese", description: "Massive fat deposits over thorax, spine, and base of tail. Waist and abdominal tuck absent. Fat deposits on neck and limbs. Obvious abdominal distention." },
];

const BCS_BANDS_CAT = [
  { score: 1, label: "Emaciated", description: "Ribs visible on shorthaired cats. No palpable fat. Severe abdominal tuck. Lumbar vertebrae and wings of ilia easily palpated." },
  { score: 2, label: "Very thin", description: "Ribs easily palpable with minimal fat covering. Lumbar vertebrae obvious. Obvious waist behind ribs. Minimal abdominal fat." },
  { score: 3, label: "Thin", description: "Ribs easily palpable with minimal fat covering. Noticeable waist behind ribs. Slight abdominal tuck. Abdominal fat pad absent." },
  { score: 4, label: "Underweight", description: "Ribs palpable with minimal fat covering. Noticeable waist behind ribs. Slight abdominal tuck. Abdominal fat pad minimal." },
  { score: 5, label: "Ideal", description: "Well-proportioned. Observe waist behind ribs. Ribs palpable with slight fat covering. Abdominal fat pad minimal." },
  { score: 6, label: "Overweight", description: "Ribs palpable with slight excess fat covering. Waist and abdominal fat pad distinguishable but not obvious. Abdominal tuck absent." },
  { score: 7, label: "Heavy", description: "Ribs not easily palpated with moderate fat covering. Waist poorly discernible. Obvious rounding of abdomen. Moderate abdominal fat pad." },
  { score: 8, label: "Obese", description: "Ribs not palpable under excess fat covering. Waist absent. Obvious rounding of abdomen with prominent abdominal fat pad. Fat deposits present over lumbar area." },
  { score: 9, label: "Severely obese", description: "Ribs not palpable under heavy fat cover. Heavy fat deposits over lumbar area, face, and limbs. Distention of abdomen with no waist. Extensive abdominal fat deposits." },
];

// dims: in { species: dimensionless } out: { species: dimensionless, bands: dimensionless, scale: dimensionless }
// (Reference table; AAHA / AAFP / WSAVA 1-9 BCS bands are categorical.)
export function computeBCSReference({ species }) {
  const sp = String(species).toLowerCase();
  if (sp !== "dog" && sp !== "cat") return { error: "Species must be 'dog' or 'cat'." };
  const bands = sp === "dog" ? BCS_BANDS_DOG : BCS_BANDS_CAT;
  return { species: sp, bands, scale: "1-9 (AAHA / WSAVA / AAFP)" };
}

export const bcsExample = {
  inputs: { species: "dog" },
  expected: { scale: "1-9 (AAHA / WSAVA / AAFP)" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderBCSReference(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-bcs-reference");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: AAHA Canine Life Stage Guidelines (2019), AAFP Feline Life Stage Guidelines (2021), and WSAVA Global Nutrition Guidelines. The 1-9 BCS scale is the modern consensus; older 1-5 scales are not interchangeable. Veterinarian and RVT govern the in-clinic scoring; hands-on rib + waist palpation is part of every visit.";
  const S = makeSelect("Species", "bcs-s", [{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]);
  inputRegion.appendChild(S.wrap);
  attachExampleButton(inputRegion, () => { S.select.value = "dog"; update(); });
  const oScale = makeOutputLine(outputRegion, "Scale", "bcs-out-scale");
  const oBands = makeOutputLine(outputRegion, "Bands (1 to 9)", "bcs-out-bands");
  const update = debounce(() => {
    const r = computeBCSReference({ species: S.select.value });
    if (r.error) { oScale.textContent = r.error; oBands.textContent = "-"; return; }
    oScale.textContent = r.scale;
    oBands.textContent = r.bands.map((b) => b.score + " " + b.label + " - " + b.description).join("  |  ");
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
}

// ====================================================================
// U.7 Pet age in human-equivalent years
// ====================================================================
//
// Per the AAHA Canine Life Stage Guidelines (2019), the older
// "dog year = 7 human years" shortcut is incorrect. The modern
// guideline is:
//
//   Dogs:   1 dog year ≈ 15 human years for the first year, +9 for
//           the second, then +4 to +6 per year depending on size.
//   Cats:   year 1 ≈ 15; year 2 ≈ +9; then +4 per year (AAFP 2021).
//
// We use the simple piecewise scheme published by AAHA for dogs with
// a size-band multiplier, and the AAFP cat scheme.

const DOG_SIZE_FACTOR = {
  small: 4,    // <22 lb
  medium: 5,   // 22-50 lb
  large: 6,    // 51-100 lb
  giant: 7,    // >100 lb
};

// dims: in { species: dimensionless, pet_age_years: T, size_band: dimensionless }
//        out: { species: dimensionless, pet_age_years: T, size_band: dimensionless, human_age_equivalent_years: T }
export function computePetAge({ species, pet_age_years, size_band }) {
  const sp = String(species).toLowerCase();
  if (sp !== "dog" && sp !== "cat") return { error: "Species must be 'dog' or 'cat'." };
  const age = Number(pet_age_years);
  if (!Number.isFinite(age) || age < 0 || age > 30) return { error: "Pet age must be 0 to 30 years." };
  if (sp === "dog") {
    const band = String(size_band || "medium").toLowerCase();
    const factor = DOG_SIZE_FACTOR[band];
    if (!factor) return { error: "Dog size band must be small / medium / large / giant." };
    let human;
    if (age <= 1) human = age * 15;
    else if (age <= 2) human = 15 + (age - 1) * 9;
    else human = 24 + (age - 2) * factor;
    return { species: sp, pet_age_years: age, size_band: band, human_age_equivalent_years: human };
  }
  // Cat
  let human;
  if (age <= 1) human = age * 15;
  else if (age <= 2) human = 15 + (age - 1) * 9;
  else human = 24 + (age - 2) * 4;
  return { species: sp, pet_age_years: age, human_age_equivalent_years: human };
}

export const petAgeExample = {
  inputs: { species: "dog", pet_age_years: 5, size_band: "medium" },
  // year 1: 15; year 2: +9; years 2-5: +3*5 = 15. Total 15 + 9 + 15 = 39.
  expected: { human_age_equivalent_years: 39 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPetAge(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-pet-age");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: AAHA Canine Life Stage Guidelines (2019). AAFP Feline Life Stage Guidelines (2021). The popular '1 dog year = 7 human years' shortcut is incorrect; the AAHA piecewise scheme (15 / 24 / +size-factor per year) is the published modern equivalence. Veterinarian governs life-stage care decisions.";
  const S = makeSelect("Species", "pa-s", [{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]);
  const A = makeNumber("Pet age (years)", "pa-a", { step: "any", min: "0", max: "30" });
  const B = makeSelect("Size band (dogs only)", "pa-b", [
    { value: "small", label: "Small (< 22 lb)" },
    { value: "medium", label: "Medium (22 to 50 lb)" },
    { value: "large", label: "Large (51 to 100 lb)" },
    { value: "giant", label: "Giant (> 100 lb)" },
  ]);
  for (const f of [S, A, B]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    S.select.value = petAgeExample.inputs.species;
    A.input.value = String(petAgeExample.inputs.pet_age_years);
    B.select.value = petAgeExample.inputs.size_band;
    update();
  });
  const oHuman = makeOutputLine(outputRegion, "Human-equivalent age (years)", "pa-out-h");
  const oNote = makeOutputLine(outputRegion, "Note", "pa-out-note");
  const update = debounce(() => {
    const r = computePetAge({
      species: S.select.value, pet_age_years: A.input.value, size_band: B.select.value,
    });
    if (r.error) { oHuman.textContent = r.error; oNote.textContent = "-"; return; }
    oHuman.textContent = fmt(r.human_age_equivalent_years, 1);
    oNote.textContent = S.select.value === "dog"
      ? "Modern AAHA scheme: 15 in year 1, 24 by year 2, then +" + DOG_SIZE_FACTOR[B.select.value] + " human years per pet year for " + B.select.value + " breeds."
      : "AAFP scheme: 15 in year 1, 24 by year 2, then +4 human years per cat year.";
  }, DEBOUNCE_MS);
  for (const sel of [S.select, B.select]) sel.addEventListener("change", update);
  A.input.addEventListener("input", update);
}

// ====================================================================
// U.15 Pregnancy gestation calculator
// ====================================================================
//
// Estimated parturition date from a known breeding date plus the
// species-specific average gestation length:
//
//   Dog:    63 days (range 58 to 68)
//   Cat:    65 days (range 63 to 67)
//   Horse:  340 days (range 320 to 360)
//   Cow:    283 days (range 279 to 287)
//
// Useful for owner planning and for pre-whelping / pre-foaling prep.

const GESTATION_DAYS = {
  dog: { mean: 63, range_low: 58, range_high: 68 },
  cat: { mean: 65, range_low: 63, range_high: 67 },
  horse: { mean: 340, range_low: 320, range_high: 360 },
  cow: { mean: 283, range_low: 279, range_high: 287 },
};

function addDaysIsoVet(isoDate, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// dims: in { species: dimensionless, breeding_date_iso: dimensionless }
//        out: { species: dimensionless, breeding_date_iso: dimensionless, estimated_due_date_iso: dimensionless, range_low_iso: dimensionless, range_high_iso: dimensionless, gestation_days_mean: T, gestation_days_range: dimensionless }
export function computeGestation({ species, breeding_date_iso }) {
  const sp = String(species).toLowerCase();
  const cfg = GESTATION_DAYS[sp];
  if (!cfg) return { error: "Species must be one of: dog, cat, horse, cow." };
  if (typeof breeding_date_iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(breeding_date_iso)) {
    return { error: "Breeding date must be YYYY-MM-DD." };
  }
  const due = addDaysIsoVet(breeding_date_iso, cfg.mean);
  const early = addDaysIsoVet(breeding_date_iso, cfg.range_low);
  const late = addDaysIsoVet(breeding_date_iso, cfg.range_high);
  if (!due || !early || !late) return { error: "Invalid date arithmetic." };
  return {
    species: sp,
    breeding_date_iso,
    estimated_due_date_iso: due,
    range_low_iso: early,
    range_high_iso: late,
    gestation_days_mean: cfg.mean,
    gestation_days_range: cfg.range_low + "-" + cfg.range_high,
  };
}

export const gestationExample = {
  inputs: { species: "dog", breeding_date_iso: "2026-03-01" },
  // +63 = 2026-05-03; +58 = 2026-04-28; +68 = 2026-05-08.
  expected: { estimated_due_date_iso: "2026-05-03" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderGestation(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-gestation");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Standard gestation lengths. Dog 63 days (range 58-68), cat 65 (63-67), horse 340 (320-360), cow 283 (279-287). Variance is normal; the veterinarian assesses readiness via palpation, ultrasound, progesterone, and (in some species) milk-let-down. This tile is an owner-planning aid, not a clinical due-date.";
  const S = makeSelect("Species", "gst-s", [
    { value: "dog", label: "Dog (63 days)" },
    { value: "cat", label: "Cat (65 days)" },
    { value: "horse", label: "Horse (340 days)" },
    { value: "cow", label: "Cow / cattle (283 days)" },
  ]);
  const B = makeText("Breeding date (YYYY-MM-DD)", "gst-b", { placeholder: "2026-03-01" });
  for (const f of [S, B]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    S.select.value = gestationExample.inputs.species;
    B.input.value = gestationExample.inputs.breeding_date_iso;
    update();
  });
  const oDue = makeOutputLine(outputRegion, "Estimated due date", "gst-out-due");
  const oRange = makeOutputLine(outputRegion, "Likely range", "gst-out-range");
  const oDays = makeOutputLine(outputRegion, "Mean gestation (days)", "gst-out-days");
  const update = debounce(() => {
    const r = computeGestation({
      species: S.select.value, breeding_date_iso: B.input.value || "",
    });
    if (r.error) {
      oDue.textContent = r.error; oRange.textContent = "-"; oDays.textContent = "-";
      return;
    }
    oDue.textContent = r.estimated_due_date_iso;
    oRange.textContent = r.range_low_iso + " to " + r.range_high_iso;
    oDays.textContent = String(r.gestation_days_mean) + " (range " + r.gestation_days_range + ")";
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
  B.input.addEventListener("input", update);
}

// ====================================================================
// U.4 ETT and IV catheter sizing
// ====================================================================
//
// Bundled species-and-weight bands per BSAVA Manual of Canine and
// Feline Anaesthesia and Analgesia (3rd ed.) and Plumb's. The values
// here are gauges / mm ID typical for the weight band; the actual
// selection is made by the anesthetist at intubation. Birds, reptiles,
// and exotic mammals require species-specific references and are out
// of scope.
//
// The ETT recommendation is an INTERNAL DIAMETER (mm); IV catheter is
// the gauge (smaller number = larger bore). Both are starting points,
// not prescriptions.

const ETT_BANDS = {
  dog: [
    { max_kg: 3,    ett_mm_id: 4.0, ivc_gauge: 24, length_cm: 18 },
    { max_kg: 7,    ett_mm_id: 5.0, ivc_gauge: 22, length_cm: 22 },
    { max_kg: 15,   ett_mm_id: 6.5, ivc_gauge: 20, length_cm: 25 },
    { max_kg: 25,   ett_mm_id: 8.0, ivc_gauge: 20, length_cm: 28 },
    { max_kg: 40,   ett_mm_id: 9.0, ivc_gauge: 18, length_cm: 30 },
    { max_kg: 70,   ett_mm_id: 10.0, ivc_gauge: 16, length_cm: 33 },
    { max_kg: 200,  ett_mm_id: 12.0, ivc_gauge: 14, length_cm: 36 },
  ],
  cat: [
    { max_kg: 2,    ett_mm_id: 3.0, ivc_gauge: 24, length_cm: 12 },
    { max_kg: 4,    ett_mm_id: 3.5, ivc_gauge: 22, length_cm: 14 },
    { max_kg: 7,    ett_mm_id: 4.0, ivc_gauge: 22, length_cm: 16 },
    { max_kg: 15,   ett_mm_id: 4.5, ivc_gauge: 20, length_cm: 18 },
  ],
  horse: [
    { max_kg: 200,  ett_mm_id: 18.0, ivc_gauge: 14, length_cm: 60 },
    { max_kg: 500,  ett_mm_id: 22.0, ivc_gauge: 12, length_cm: 80 },
    { max_kg: 1000, ett_mm_id: 26.0, ivc_gauge: 10, length_cm: 95 },
  ],
  cow: [
    { max_kg: 200,  ett_mm_id: 18.0, ivc_gauge: 14, length_cm: 50 },
    { max_kg: 500,  ett_mm_id: 22.0, ivc_gauge: 12, length_cm: 70 },
    { max_kg: 1000, ett_mm_id: 26.0, ivc_gauge: 10, length_cm: 85 },
  ],
};

// dims: in { species: dimensionless, weight_kg: M, weight: M, weight_unit: dimensionless }
//        out: { species: dimensionless, weight_kg: M, band_max_kg: M, ett_mm_id: L, ivc_gauge: dimensionless, ett_length_cm: L, note: dimensionless }
export function computeETTSizing({ species, weight_kg, weight, weight_unit }) {
  const sp = String(species).toLowerCase();
  if (!ETT_BANDS[sp]) return { error: "Species must be one of: dog, cat, horse, cow." };
  // Accept either weight_kg directly OR (weight + weight_unit) for shared UI patterns.
  let wt_kg = Number(weight_kg);
  if (!Number.isFinite(wt_kg) || wt_kg <= 0) {
    wt_kg = toKg(weight, weight_unit);
  }
  if (!Number.isFinite(wt_kg) || wt_kg <= 0) return { error: "Enter a positive weight." };
  if (wt_kg > 1500) return { error: "Weight above 1500 kg outside the bundled band table." };
  const bands = ETT_BANDS[sp];
  let chosen = bands[bands.length - 1];
  for (const b of bands) {
    if (wt_kg <= b.max_kg) { chosen = b; break; }
  }
  return {
    species: sp,
    weight_kg: wt_kg,
    band_max_kg: chosen.max_kg,
    ett_mm_id: chosen.ett_mm_id,
    ivc_gauge: chosen.ivc_gauge,
    ett_length_cm: chosen.length_cm,
    note: "Starting point only; the anesthetist selects the actual tube and IVC at intubation / placement.",
  };
}

export const ettExample = {
  inputs: { species: "dog", weight_kg: 20 },
  // 20 kg falls in the 15-25 kg dog band: 8.0 mm ETT, 20 ga IVC.
  expected: { ett_mm_id: 8.0, ivc_gauge: 20 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderETTSizing(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-ett-sizing");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Per BSAVA Manual of Canine and Feline Anaesthesia and Analgesia (3rd ed.) reference bands, Plumb's, and standard veterinary anesthesia tables. Birds, reptiles, and exotic mammals require species-specific references and are NOT covered. The anesthetist selects the actual tube and catheter at intubation / placement.";
  const S = makeSelect("Species", "et-s", SPECIES_OPTS);
  const W = makeNumber("Patient weight", "et-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "et-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  for (const f of [S, W, U]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    S.select.value = ettExample.inputs.species;
    W.input.value = String(ettExample.inputs.weight_kg);
    U.select.value = "kg";
    update();
  });
  const oETT = makeOutputLine(outputRegion, "Recommended ETT internal diameter (mm)", "et-out-ett");
  const oLen = makeOutputLine(outputRegion, "Approximate ETT length (cm)", "et-out-len");
  const oIVC = makeOutputLine(outputRegion, "Recommended IV catheter gauge", "et-out-ivc");
  const oBand = makeOutputLine(outputRegion, "Band (max kg)", "et-out-band");
  const oNote = makeOutputLine(outputRegion, "Note", "et-out-note");
  const update = debounce(() => {
    const r = computeETTSizing({
      species: S.select.value, weight: W.input.value, weight_unit: U.select.value,
    });
    if (r.error) {
      oETT.textContent = r.error;
      for (const o of [oLen, oIVC, oBand, oNote]) o.textContent = "-";
      return;
    }
    oETT.textContent = fmt(r.ett_mm_id, 1);
    oLen.textContent = String(r.ett_length_cm);
    oIVC.textContent = String(r.ivc_gauge) + " gauge";
    oBand.textContent = "<= " + String(r.band_max_kg) + " kg";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const sel of [S.select, U.select]) sel.addEventListener("change", update);
  W.input.addEventListener("input", update);
}

// ====================================================================
// U.12 Anesthesia monitoring vitals reference
// ====================================================================
//
// Bundled normal ranges per species for HR, RR, MAP, SpO2, and ETCO2
// during inhalant anesthesia. Values are general-purpose anesthesia
// reference; individual patients may run outside these bands and the
// anesthetist's clinical judgment governs.

const ANESTHESIA_VITALS = {
  dog: {
    hr_bpm: "60-140",
    rr_bpm: "10-20",
    map_mmHg: ">= 60 (ideally 70-100)",
    spo2_percent: ">= 95",
    etco2_mmHg: "35-45",
  },
  cat: {
    hr_bpm: "100-200",
    rr_bpm: "10-30",
    map_mmHg: ">= 60 (ideally 65-100)",
    spo2_percent: ">= 95",
    etco2_mmHg: "35-45",
  },
  horse: {
    hr_bpm: "30-50",
    rr_bpm: "6-12",
    map_mmHg: ">= 70 (ideally 70-90; lower risks myopathy)",
    spo2_percent: ">= 90",
    etco2_mmHg: "40-50",
  },
  cow: {
    hr_bpm: "60-90",
    rr_bpm: "12-30",
    map_mmHg: ">= 70",
    spo2_percent: ">= 90",
    etco2_mmHg: "40-50",
  },
};

// dims: in { species: dimensionless } out: { species: dimensionless, ranges: dimensionless, note: dimensionless }
// (Reference table; HR / RR / MAP / SpO2 / ETCO2 ranges are categorical strings.)
export function computeAnesthesiaVitals({ species }) {
  const sp = String(species).toLowerCase();
  if (!ANESTHESIA_VITALS[sp]) return { error: "Species must be one of: dog, cat, horse, cow." };
  return {
    species: sp,
    ranges: ANESTHESIA_VITALS[sp],
    note: "Normal-range reference for inhalant anesthesia. Individual patients may run outside these bands; the anesthetist's clinical judgment and trend-watching govern.",
  };
}

export const anesthesiaVitalsExample = {
  inputs: { species: "dog" },
  expected: { hr_bpm: "60-140" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderAnesthesiaVitals(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-anesthesia-vitals");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Standard veterinary anesthesia monitoring ranges per BSAVA Manual of Canine and Feline Anaesthesia and Analgesia (3rd ed.) and Plumb's. Equine MAP of 70+ mmHg is the published myopathy-prevention floor (Donaldson, EVJ Supplement 1999). The anesthetist's clinical judgment and the trend over time govern, not any single number.";
  const S = makeSelect("Species", "av-s", SPECIES_OPTS);
  inputRegion.appendChild(S.wrap);
  attachExampleButton(inputRegion, () => { S.select.value = "dog"; update(); });
  const oHR = makeOutputLine(outputRegion, "Heart rate (bpm)", "av-out-hr");
  const oRR = makeOutputLine(outputRegion, "Respiratory rate (bpm)", "av-out-rr");
  const oMAP = makeOutputLine(outputRegion, "Mean arterial pressure (mmHg)", "av-out-map");
  const oSpO2 = makeOutputLine(outputRegion, "SpO2 (%)", "av-out-spo2");
  const oETCO2 = makeOutputLine(outputRegion, "ETCO2 (mmHg)", "av-out-etco2");
  const oNote = makeOutputLine(outputRegion, "Note", "av-out-note");
  const update = debounce(() => {
    const r = computeAnesthesiaVitals({ species: S.select.value });
    if (r.error) {
      oHR.textContent = r.error;
      for (const o of [oRR, oMAP, oSpO2, oETCO2, oNote]) o.textContent = "-";
      return;
    }
    oHR.textContent = r.ranges.hr_bpm;
    oRR.textContent = r.ranges.rr_bpm;
    oMAP.textContent = r.ranges.map_mmHg;
    oSpO2.textContent = r.ranges.spo2_percent;
    oETCO2.textContent = r.ranges.etco2_mmHg;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
}

// ====================================================================
// U.18 ASA physical-status classification reference
// ====================================================================
//
// ASA Physical Status I to V, with the E modifier for emergency.
// Originally a human-medicine scale (American Society of
// Anesthesiologists) adopted by veterinary anesthesia per the
// AVMA Guidelines for Anesthesia and the ACVAA monitoring guidelines.

const ASA_CLASSES = [
  { class: "I",    label: "Normal healthy", description: "A patient with no underlying disease (e.g., elective spay/neuter on a healthy young animal)." },
  { class: "II",   label: "Mild systemic disease", description: "A patient with mild systemic disease that does not currently impose anesthetic risk (e.g., well-controlled obesity, mild osteoarthritis, treated hypothyroidism)." },
  { class: "III",  label: "Severe systemic disease", description: "A patient with severe systemic disease that imposes anesthetic risk (e.g., compensated heart disease, controlled diabetes mellitus, anemia, fever)." },
  { class: "IV",   label: "Severe, constant life threat", description: "A patient with severe systemic disease that is a constant threat to life (e.g., heart failure, uremia, ketoacidosis, sepsis, severe trauma)." },
  { class: "V",    label: "Moribund", description: "A moribund patient not expected to survive without the procedure (e.g., shock, severe organ failure, terminal disease at end stage)." },
  { class: "E",    label: "Emergency modifier", description: "Suffix added to any class (e.g., IIIE) when the case is non-elective. Emergency status adds risk regardless of the base class." },
];

// dims: in { } out: { scale: dimensionless, classes: dimensionless, note: dimensionless }
// (Reference table; ASA Physical Status I-V classification is categorical.)
export function computeASAReference() {
  return {
    scale: "ASA Physical Status I-V (with E modifier)",
    classes: ASA_CLASSES,
    note: "Each anesthetic candidate is scored by the anesthetist after a pre-anesthetic exam. The score guides risk-stratified planning but does NOT predict outcome on its own.",
  };
}

export const asaExample = {
  inputs: {},
  expected: { class_count: 6 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderASAReference(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-asa-classification");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: ASA Physical Status classification (American Society of Anesthesiologists); adopted in veterinary anesthesia per AVMA Guidelines for Anesthesia and ACVAA monitoring guidelines. The classification is a structured pre-anesthetic risk descriptor; it does NOT predict outcome.";
  const r = computeASAReference();
  const oScale = makeOutputLine(outputRegion, "Scale", "asa-out-scale");
  const oClasses = makeOutputLine(outputRegion, "Classes", "asa-out-classes");
  const oNote = makeOutputLine(outputRegion, "Note", "asa-out-note");
  oScale.textContent = r.scale;
  oClasses.textContent = r.classes.map((c) => c.class + " (" + c.label + ") - " + c.description).join("  |  ");
  oNote.textContent = r.note;
}

// ====================================================================
// U.10 Bloodwork reference ranges (CBC + chemistry, by species)
// ====================================================================
//
// Reference render: typical adult normal ranges for the most common
// CBC and chemistry analytes by species. Values are the published
// ranges that ride on the back of every IDEXX / Antech / VetScan
// report. The ranges are NOT a diagnosis: trends over time, clinical
// signs, and the attending veterinarian's interpretation govern.
// Reference labs publish their own machine-specific ranges; the
// tile names them in the citation.

const BLOODWORK = {
  dog: {
    cbc: [
      { name: "HCT / PCV (%)", range: "37 - 55" },
      { name: "WBC (10^3 / uL)", range: "5.5 - 16.9" },
      { name: "Neutrophils (10^3 / uL)", range: "2.0 - 12.0" },
      { name: "Lymphocytes (10^3 / uL)", range: "0.5 - 4.9" },
      { name: "Platelets (10^3 / uL)", range: "175 - 500" },
    ],
    chem: [
      { name: "BUN (mg/dL)", range: "7 - 27" },
      { name: "Creatinine (mg/dL)", range: "0.5 - 1.8" },
      { name: "Glucose (mg/dL)", range: "70 - 138" },
      { name: "ALT (U/L)", range: "10 - 125" },
      { name: "ALP (U/L)", range: "23 - 212" },
      { name: "Total protein (g/dL)", range: "5.2 - 8.2" },
      { name: "Albumin (g/dL)", range: "2.3 - 4.0" },
      { name: "Sodium (mEq/L)", range: "144 - 160" },
      { name: "Potassium (mEq/L)", range: "3.5 - 5.8" },
    ],
  },
  cat: {
    cbc: [
      { name: "HCT / PCV (%)", range: "30 - 45" },
      { name: "WBC (10^3 / uL)", range: "3.5 - 16.0" },
      { name: "Neutrophils (10^3 / uL)", range: "2.5 - 12.5" },
      { name: "Lymphocytes (10^3 / uL)", range: "1.2 - 8.0" },
      { name: "Platelets (10^3 / uL)", range: "175 - 500" },
    ],
    chem: [
      { name: "BUN (mg/dL)", range: "16 - 36" },
      { name: "Creatinine (mg/dL)", range: "0.8 - 2.4" },
      { name: "Glucose (mg/dL)", range: "71 - 159 (stress hyperglycemia common)" },
      { name: "ALT (U/L)", range: "10 - 100" },
      { name: "ALP (U/L)", range: "6 - 102" },
      { name: "Total protein (g/dL)", range: "5.7 - 8.9" },
      { name: "Albumin (g/dL)", range: "2.3 - 3.9" },
      { name: "Sodium (mEq/L)", range: "146 - 158" },
      { name: "Potassium (mEq/L)", range: "3.7 - 5.4" },
    ],
  },
  horse: {
    cbc: [
      { name: "HCT / PCV (%)", range: "32 - 53 (varies with breed + excitement)" },
      { name: "WBC (10^3 / uL)", range: "5.4 - 14.3" },
      { name: "Neutrophils (10^3 / uL)", range: "2.3 - 8.6" },
      { name: "Lymphocytes (10^3 / uL)", range: "1.5 - 7.7" },
      { name: "Platelets (10^3 / uL)", range: "100 - 350" },
    ],
    chem: [
      { name: "BUN (mg/dL)", range: "10 - 24" },
      { name: "Creatinine (mg/dL)", range: "1.2 - 1.9" },
      { name: "Glucose (mg/dL)", range: "70 - 110" },
      { name: "AST (U/L)", range: "200 - 470" },
      { name: "GGT (U/L)", range: "5 - 25" },
      { name: "Total protein (g/dL)", range: "5.2 - 7.9" },
      { name: "Albumin (g/dL)", range: "2.6 - 3.7" },
      { name: "Sodium (mEq/L)", range: "133 - 145" },
      { name: "Potassium (mEq/L)", range: "2.4 - 4.7" },
    ],
  },
  cow: {
    cbc: [
      { name: "HCT / PCV (%)", range: "24 - 46" },
      { name: "WBC (10^3 / uL)", range: "4.0 - 12.0" },
      { name: "Neutrophils (10^3 / uL)", range: "0.6 - 4.0" },
      { name: "Lymphocytes (10^3 / uL)", range: "2.5 - 7.5" },
      { name: "Platelets (10^3 / uL)", range: "100 - 800" },
    ],
    chem: [
      { name: "BUN (mg/dL)", range: "6 - 27" },
      { name: "Creatinine (mg/dL)", range: "1.0 - 2.0" },
      { name: "Glucose (mg/dL)", range: "45 - 75 (lower than monogastrics)" },
      { name: "AST (U/L)", range: "78 - 132" },
      { name: "GGT (U/L)", range: "6 - 17" },
      { name: "Total protein (g/dL)", range: "6.7 - 7.5" },
      { name: "Albumin (g/dL)", range: "3.0 - 3.5" },
      { name: "Sodium (mEq/L)", range: "132 - 152" },
      { name: "Potassium (mEq/L)", range: "3.9 - 5.8" },
    ],
  },
};

// dims: in { species: dimensionless } out: { species: dimensionless, cbc: dimensionless, chem: dimensionless, note: dimensionless }
// (Reference table; CBC / chemistry adult reference ranges are categorical strings.)
export function computeBloodworkRanges({ species }) {
  const sp = String(species).toLowerCase();
  if (!BLOODWORK[sp]) return { error: "Species must be one of: dog, cat, horse, cow." };
  return {
    species: sp,
    cbc: BLOODWORK[sp].cbc,
    chem: BLOODWORK[sp].chem,
    note: "Reference-lab machine-specific ranges supersede generic bands. A value just outside the published range is not a diagnosis; trends and clinical context govern.",
  };
}

export const bloodworkExample = {
  inputs: { species: "dog" },
  expected: { cbc_count: 5, chem_count: 9 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderBloodworkRanges(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-bloodwork-ranges");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Composite of published adult-reference ranges from IDEXX, Antech, Abaxis VetScan, and the Merck Veterinary Manual (10th ed.) species chapters. The reporting lab's machine-specific range is the value of record; this tile is a quick orientation aid. Veterinarian governs interpretation.";
  const S = makeSelect("Species", "bw-s", [
    { value: "dog", label: "Dog" }, { value: "cat", label: "Cat" },
    { value: "horse", label: "Horse" }, { value: "cow", label: "Cow" },
  ]);
  inputRegion.appendChild(S.wrap);
  attachExampleButton(inputRegion, () => { S.select.value = "dog"; update(); });
  const oCBC = makeOutputLine(outputRegion, "CBC", "bw-out-cbc");
  const oChem = makeOutputLine(outputRegion, "Chemistry", "bw-out-chem");
  const oNote = makeOutputLine(outputRegion, "Note", "bw-out-note");
  const update = debounce(() => {
    const r = computeBloodworkRanges({ species: S.select.value });
    if (r.error) { oCBC.textContent = r.error; oChem.textContent = "-"; oNote.textContent = "-"; return; }
    oCBC.textContent = r.cbc.map((b) => b.name + " " + b.range).join("  |  ");
    oChem.textContent = r.chem.map((b) => b.name + " " + b.range).join("  |  ");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
}

// ====================================================================
// U.11 Urine specific gravity bands
// ====================================================================
//
// Urine SG bands by species. Isosthenuria (SG ~ plasma, 1.008-1.012)
// is the diagnostic flag: a dehydrated patient producing isosthenuric
// urine has lost concentrating ability. Healthy dogs typically
// concentrate to >= 1.030; healthy cats to >= 1.035; horses around
// 1.020-1.050; cattle 1.020-1.040. The bands below are the standard
// veterinary clinical-pathology cutpoints.

const USG_BANDS = {
  dog: {
    hyposthenuric: "< 1.008",
    isosthenuric: "1.008 - 1.012",
    minimally_concentrated: "1.013 - 1.029",
    well_concentrated: ">= 1.030",
    note: "A healthy hydrated dog should concentrate to >= 1.030; persistent SG < 1.030 with azotemia is a renal-loss flag.",
  },
  cat: {
    hyposthenuric: "< 1.008",
    isosthenuric: "1.008 - 1.012",
    minimally_concentrated: "1.013 - 1.034",
    well_concentrated: ">= 1.035",
    note: "Cats are obligate concentrators; healthy hydrated cats concentrate to >= 1.035. SG < 1.035 with azotemia warrants a renal workup.",
  },
  horse: {
    hyposthenuric: "< 1.008",
    isosthenuric: "1.008 - 1.014",
    typical: "1.020 - 1.050",
    note: "Horses produce variable USG with dietary load; trends and a paired chem panel are more informative than a single value.",
  },
  cow: {
    typical: "1.020 - 1.040",
    note: "Ruminant USG runs lower than monogastric on roughage diets; protein- and salt-load shifts the band substantially.",
  },
};

// dims: in { species: dimensionless } out: { species: dimensionless, bands: dimensionless }
// (Reference table; USG hyposthenuric / isosthenuric / well-concentrated bands are categorical strings.)
export function computeUrineSG({ species }) {
  const sp = String(species).toLowerCase();
  if (!USG_BANDS[sp]) return { error: "Species must be one of: dog, cat, horse, cow." };
  return { species: sp, bands: USG_BANDS[sp] };
}

export const urineSGExample = {
  inputs: { species: "dog" },
  expected: { well_concentrated: ">= 1.030" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderUrineSG(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-urine-sg");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Standard veterinary clinical-pathology cutpoints (Stockham + Scott, Fundamentals of Veterinary Clinical Pathology, 2nd ed.; Merck Veterinary Manual, 10th ed.; ACVIM IRIS guidelines for staging chronic kidney disease). USG is interpreted in light of hydration status and azotemia; veterinarian governs.";
  const S = makeSelect("Species", "usg-s", [
    { value: "dog", label: "Dog" }, { value: "cat", label: "Cat" },
    { value: "horse", label: "Horse" }, { value: "cow", label: "Cow" },
  ]);
  inputRegion.appendChild(S.wrap);
  attachExampleButton(inputRegion, () => { S.select.value = "dog"; update(); });
  const oBands = makeOutputLine(outputRegion, "Bands", "usg-out-bands");
  const oNote = makeOutputLine(outputRegion, "Note", "usg-out-note");
  const update = debounce(() => {
    const r = computeUrineSG({ species: S.select.value });
    if (r.error) { oBands.textContent = r.error; oNote.textContent = "-"; return; }
    const entries = Object.entries(r.bands).filter(([k]) => k !== "note");
    oBands.textContent = entries.map(([k, v]) => k.replace(/_/g, " ") + ": " + v).join("  |  ");
    oNote.textContent = r.bands.note || "-";
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
}

// ====================================================================
// U.14 Target weight-loss plan (reverse RER)
// ====================================================================
//
// Inputs: current weight, target weight, species, and an optional
// kcal/cup for the prescription diet. The plan is to feed the
// RER for the TARGET weight (the AAHA-published convention) so the
// patient slowly closes the gap. AAHA / WSAVA / Hand's recommend
// 1-2% body weight loss per week (1% for the typical pet, 2% for
// the medically supervised). The tile prints expected weeks to
// target at 1% / 1.5% / 2% per-week rates, and the daily kcal
// target = 70 * target_kg^0.75.

// dims: in { current_weight: M, target_weight: M, weight_unit: dimensionless, species: dimensionless, kcal_per_cup: dimensionless }
//        out: { species: dimensionless, current_weight_kg: M, target_weight_kg: M, deficit_kg: M, target_RER_kcal_per_day: dimensionless, cups_per_day: dimensionless, weeks: dimensionless }
export function computeTargetWeightLoss({ current_weight, target_weight, weight_unit, species, kcal_per_cup }) {
  const cur = toKg(current_weight, weight_unit);
  const tgt = toKg(target_weight, weight_unit);
  if (cur == null) return { error: "Enter a positive current weight." };
  if (tgt == null) return { error: "Enter a positive target weight." };
  if (tgt >= cur) return { error: "Target weight must be less than current weight; this tile plans weight loss." };
  if (cur > 100) return { error: "Current weight above 100 kg flagged; verify (large dogs ok, but tile is dog/cat oriented)." };
  const sp = String(species).toLowerCase();
  if (sp !== "dog" && sp !== "cat") return { error: "Species must be 'dog' or 'cat'." };
  const deficit_kg = cur - tgt;
  const target_RER = 70 * Math.pow(tgt, 0.75);
  // Weeks at the three published per-week loss rates.
  const weeks = {
    at_1_pct_per_wk: deficit_kg / (cur * 0.01),
    at_1_5_pct_per_wk: deficit_kg / (cur * 0.015),
    at_2_pct_per_wk: deficit_kg / (cur * 0.02),
  };
  const kpc = Number(kcal_per_cup);
  const cups_per_day = (Number.isFinite(kpc) && kpc > 0) ? target_RER / kpc : null;
  return {
    species: sp,
    current_weight_kg: cur,
    target_weight_kg: tgt,
    deficit_kg,
    target_RER_kcal_per_day: target_RER,
    cups_per_day,
    weeks,
  };
}

export const targetWeightLossExample = {
  inputs: { current_weight: 30, target_weight: 25, weight_unit: "kg", species: "dog", kcal_per_cup: 300 },
  // target_RER = 70 * 25^0.75 = 70 * 11.180 = 782.62. deficit = 5 kg.
  // weeks at 1.5% = 5 / (30 * 0.015) = 5 / 0.45 = 11.11.
  expected: { target_RER_kcal_per_day_approx: 782.62, weeks_at_1_5_pct_per_wk_approx: 11.11 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderTargetWeightLoss(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-target-weight-loss");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: AAHA Weight Management Guidelines for Dogs and Cats (2014). WSAVA Global Nutrition Guidelines. Hand's Small Animal Clinical Nutrition (5th ed.) chapter on weight management. Feed the RER for the TARGET weight, not the current; reassess every 2-4 weeks. Veterinarian governs medical clearance for weight-loss diet trials.";
  const CW = makeNumber("Current weight", "twl-cw", { step: "any", min: "0" });
  const TW = makeNumber("Target weight", "twl-tw", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "twl-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const S = makeSelect("Species", "twl-s", [{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]);
  const K = makeNumber("Diet caloric density (kcal/cup, optional)", "twl-k", { step: "any", min: "0", value: "0" });
  for (const f of [CW, TW, U, S, K]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    CW.input.value = String(targetWeightLossExample.inputs.current_weight);
    TW.input.value = String(targetWeightLossExample.inputs.target_weight);
    U.select.value = targetWeightLossExample.inputs.weight_unit;
    S.select.value = targetWeightLossExample.inputs.species;
    K.input.value = String(targetWeightLossExample.inputs.kcal_per_cup);
    update();
  });
  const oDeficit = makeOutputLine(outputRegion, "Deficit (kg)", "twl-out-d");
  const oRER = makeOutputLine(outputRegion, "Target RER (kcal/day)", "twl-out-rer");
  const oCups = makeOutputLine(outputRegion, "Cups per day (if kcal/cup supplied)", "twl-out-cups");
  const oW1 = makeOutputLine(outputRegion, "Weeks at 1% loss/wk", "twl-out-w1");
  const oW15 = makeOutputLine(outputRegion, "Weeks at 1.5% loss/wk", "twl-out-w15");
  const oW2 = makeOutputLine(outputRegion, "Weeks at 2% loss/wk", "twl-out-w2");
  const update = debounce(() => {
    const r = computeTargetWeightLoss({
      current_weight: CW.input.value, target_weight: TW.input.value,
      weight_unit: U.select.value, species: S.select.value, kcal_per_cup: K.input.value,
    });
    if (r.error) {
      oDeficit.textContent = r.error;
      for (const o of [oRER, oCups, oW1, oW15, oW2]) o.textContent = "-";
      return;
    }
    oDeficit.textContent = fmt(r.deficit_kg, 2);
    oRER.textContent = fmt(r.target_RER_kcal_per_day, 1);
    oCups.textContent = r.cups_per_day != null ? fmt(r.cups_per_day, 2) : "-";
    oW1.textContent = fmt(r.weeks.at_1_pct_per_wk, 1);
    oW15.textContent = fmt(r.weeks.at_1_5_pct_per_wk, 1);
    oW2.textContent = fmt(r.weeks.at_2_pct_per_wk, 1);
  }, DEBOUNCE_MS);
  for (const el of [CW.input, TW.input, K.input]) el.addEventListener("input", update);
  for (const sel of [U.select, S.select]) sel.addEventListener("change", update);
}

// ====================================================================
// U.5 Toxicity dose-by-weight (chocolate / xylitol / raisin / ethylene glycol)
// ====================================================================
//
// Screening estimator over ASPCA Animal Poison Control Center published
// toxic-dose thresholds. The tile bundles the canonical mg/kg or g/kg
// bands but ALWAYS prints the APCC consultation phone number; the
// default posture is overcaution. Owners and clinicians must call APCC
// (888-426-4435; consult fee applies) for any suspected ingestion.

const CHOCOLATE_THEOBROMINE_MG_PER_OZ = {
  white:        0.25,
  milk:         58,
  dark:         150,
  baking:       390,
  cocoa_powder: 800,
};

// Theobromine bands per Plumb's Veterinary Drug Handbook + ASPCA APCC
// published thresholds, in mg/kg.
const THEOBROMINE_BANDS = [
  { min_mg_per_kg: 20,  label: "Mild GI signs (vomiting / diarrhea / hyperactivity)" },
  { min_mg_per_kg: 40,  label: "Cardiotoxic signs (tachycardia, arrhythmias)" },
  { min_mg_per_kg: 60,  label: "Severe / seizure risk" },
  { min_mg_per_kg: 100, label: "Approaching LD50 (100-200 mg/kg dogs); emergency hospital care" },
];

function bandFor(value, bands) {
  let result = null;
  for (const b of bands) if (value >= b.min_mg_per_kg) result = b;
  return result;
}

function toxChocolate({ wt_kg, choc_type, choc_grams }) {
  const type = String(choc_type || "").toLowerCase();
  const conc = CHOCOLATE_THEOBROMINE_MG_PER_OZ[type];
  if (conc == null) return { error: "Chocolate type must be one of: white, milk, dark, baking, cocoa_powder." };
  const g = Number(choc_grams);
  if (!Number.isFinite(g) || g < 0) return { error: "Chocolate grams must be a non-negative number." };
  const oz = g / 28.3495;
  const total_theobromine_mg = oz * conc;
  const dose_mg_per_kg = total_theobromine_mg / wt_kg;
  const band = bandFor(dose_mg_per_kg, THEOBROMINE_BANDS);
  return {
    toxin: "chocolate",
    chocolate_type: type,
    chocolate_grams: g,
    chocolate_oz: oz,
    theobromine_mg_total: total_theobromine_mg,
    theobromine_mg_per_kg: dose_mg_per_kg,
    band_label: band ? band.label : "Below the 20 mg/kg mild-signs threshold (but call APCC for verification).",
    exceeded_mild_threshold: dose_mg_per_kg >= 20,
  };
}

function toxXylitol({ wt_kg, xylitol_grams }) {
  const g = Number(xylitol_grams);
  if (!Number.isFinite(g) || g < 0) return { error: "Xylitol grams must be a non-negative number." };
  const dose_g_per_kg = g / wt_kg;
  let band;
  if (dose_g_per_kg < 0.1) band = "Below the 0.1 g/kg hypoglycemia threshold (call APCC; cumulative exposure may still matter).";
  else if (dose_g_per_kg < 0.5) band = "Hypoglycemia risk (0.1 - 0.5 g/kg). Monitor BG; D5W if symptomatic.";
  else band = "Hepatotoxicity risk (>= 0.5 g/kg). Emergency hospital care; ALT / albumin / PT-PTT serial monitoring.";
  return {
    toxin: "xylitol",
    xylitol_grams: g,
    dose_g_per_kg,
    band_label: band,
    exceeded_hypoglycemia_threshold: dose_g_per_kg >= 0.1,
    exceeded_hepatic_threshold: dose_g_per_kg >= 0.5,
  };
}

function toxRaisinGrape({ wt_kg, raisin_grape_grams }) {
  const g = Number(raisin_grape_grams);
  if (!Number.isFinite(g) || g < 0) return { error: "Raisin / grape grams must be a non-negative number." };
  const dose_g_per_kg = g / wt_kg;
  // The toxic dose is highly variable per ASPCA; ANY ingestion can cause AKI
  // in susceptible dogs. The published reported-toxic range is 11.6-30 g/kg
  // but lower doses HAVE caused AKI. Default to overcaution.
  return {
    toxin: "raisin_grape",
    raisin_grape_grams: g,
    dose_g_per_kg,
    band_label: "Any ingestion may cause acute kidney injury per ASPCA. Reported toxic range: 11.6 - 30 g/kg but lower doses have caused AKI. Call APCC for ANY non-zero ingestion.",
    always_call_apcc: g > 0,
  };
}

function toxEthyleneGlycol({ wt_kg, ethylene_glycol_mL, species }) {
  const ml = Number(ethylene_glycol_mL);
  if (!Number.isFinite(ml) || ml < 0) return { error: "Antifreeze mL must be a non-negative number." };
  const sp = String(species || "dog").toLowerCase();
  // LD50 dog ~ 4.4 mL/kg; cat ~ 1.4 mL/kg (concentrated EG).
  const ld50_mL_per_kg = sp === "cat" ? 1.4 : 4.4;
  const dose_mL_per_kg = ml / wt_kg;
  const ratio = dose_mL_per_kg / ld50_mL_per_kg;
  let band;
  if (ratio < 0.25) band = "Below 25% of LD50 (still toxic; ANY antifreeze ingestion is a medical emergency).";
  else if (ratio < 1) band = "Approaching LD50 (25-100%). Emergency hospital; consider fomepizole (dog) or ethanol (cat) within 3-4 hr of ingestion.";
  else band = "Exceeds LD50. Aggressive antidote + dialysis indicated; prognosis time-dependent.";
  return {
    toxin: "ethylene_glycol",
    species: sp,
    antifreeze_mL: ml,
    dose_mL_per_kg,
    ld50_mL_per_kg,
    fraction_of_ld50: ratio,
    band_label: band,
    always_call_apcc: ml > 0,
  };
}

// dims: in { toxin: dimensionless, weight: M, weight_unit: dimensionless, species: dimensionless, choc_type: dimensionless, choc_grams: M, xylitol_grams: M, raisin_grape_grams: M, ethylene_glycol_mL: L^3 }
//        out: { toxicity_result: dimensionless }
// (Per-toxin LD50 / threshold lookup; the result shape varies by toxin and is treated as a categorical bag per spec-v14 §7.1.)
export function computeToxicity({ toxin, weight, weight_unit, species, choc_type, choc_grams, xylitol_grams, raisin_grape_grams, ethylene_glycol_mL }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive patient weight." };
  if (wt_kg < 0.1 || wt_kg > 100) return { error: "Weight below 0.1 kg or above 100 kg flagged; verify." };
  const t = String(toxin || "").toLowerCase();
  if (t === "chocolate") return { weight_kg: wt_kg, ...toxChocolate({ wt_kg, choc_type, choc_grams }) };
  if (t === "xylitol") return { weight_kg: wt_kg, ...toxXylitol({ wt_kg, xylitol_grams }) };
  if (t === "raisin_grape") return { weight_kg: wt_kg, ...toxRaisinGrape({ wt_kg, raisin_grape_grams }) };
  if (t === "ethylene_glycol") return { weight_kg: wt_kg, ...toxEthyleneGlycol({ wt_kg, ethylene_glycol_mL, species }) };
  return { error: "Toxin must be one of: chocolate, xylitol, raisin_grape, ethylene_glycol." };
}

export const toxicityExample = {
  inputs: { toxin: "chocolate", weight: 10, weight_unit: "kg", choc_type: "dark", choc_grams: 50 },
  // 50 g = 1.7637 oz; theobromine 1.7637 * 150 = 264.55 mg total; 26.455 mg/kg.
  // Band: mild GI signs (>= 20).
  expected: { theobromine_mg_per_kg_approx: 26.455, exceeded_mild_threshold: true },
};

const TOXIN_OPTS = [
  { value: "chocolate", label: "Chocolate" },
  { value: "xylitol", label: "Xylitol" },
  { value: "raisin_grape", label: "Raisin / grape" },
  { value: "ethylene_glycol", label: "Ethylene glycol (antifreeze)" },
];

const CHOC_TYPE_OPTS = [
  { value: "white", label: "White (~0.25 mg/oz theobromine)" },
  { value: "milk", label: "Milk (~58 mg/oz)" },
  { value: "dark", label: "Dark / semi-sweet (~150 mg/oz)" },
  { value: "baking", label: "Baking (~390 mg/oz)" },
  { value: "cocoa_powder", label: "Cocoa powder (~800 mg/oz)" },
];

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderToxicity(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-toxicity");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: ASPCA Animal Poison Control Center (APCC) published thresholds; Plumb's Veterinary Drug Handbook (10th ed.) toxicology chapter; theobromine LD50 per Gwaltney-Brant, Toxicology of Chocolate, Veterinary Medicine (2001). Xylitol thresholds per Dunayer + Gwaltney-Brant, JAVMA 229:7 (2006). Ethylene-glycol LD50 per Plumb's and standard veterinary toxicology references. ANY suspected ingestion: call APCC at 888-426-4435 (consult fee applies). The attending veterinarian governs.";
  const T = makeSelect("Toxin", "tox-t", TOXIN_OPTS);
  const W = makeNumber("Patient weight", "tox-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "tox-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const S = makeSelect("Species (for ethylene glycol LD50)", "tox-s", [{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]);
  const CT = makeSelect("Chocolate type (if applicable)", "tox-ct", CHOC_TYPE_OPTS);
  const CG = makeNumber("Chocolate (g)", "tox-cg", { step: "any", min: "0", value: "0" });
  const XG = makeNumber("Xylitol (g)", "tox-xg", { step: "any", min: "0", value: "0" });
  const RG = makeNumber("Raisin / grape (g)", "tox-rg", { step: "any", min: "0", value: "0" });
  const EG = makeNumber("Antifreeze (mL)", "tox-eg", { step: "any", min: "0", value: "0" });
  for (const f of [T, W, U, S, CT, CG, XG, RG, EG]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    T.select.value = "chocolate"; W.input.value = "10"; U.select.value = "kg";
    CT.select.value = "dark"; CG.input.value = "50";
    update();
  });
  const oBand = makeOutputLine(outputRegion, "Band", "tox-out-band");
  const oDose = makeOutputLine(outputRegion, "Dose", "tox-out-dose");
  const oAPCC = makeOutputLine(outputRegion, "ASPCA APCC", "tox-out-apcc");
  const update = debounce(() => {
    const r = computeToxicity({
      toxin: T.select.value, weight: W.input.value, weight_unit: U.select.value, species: S.select.value,
      choc_type: CT.select.value, choc_grams: CG.input.value,
      xylitol_grams: XG.input.value, raisin_grape_grams: RG.input.value, ethylene_glycol_mL: EG.input.value,
    });
    if (r.error) { oBand.textContent = r.error; oDose.textContent = "-"; oAPCC.textContent = "Call APCC for any concern: 888-426-4435"; return; }
    oBand.textContent = r.band_label;
    if (r.toxin === "chocolate") oDose.textContent = fmt(r.theobromine_mg_per_kg, 2) + " mg/kg theobromine (" + fmt(r.theobromine_mg_total, 1) + " mg total)";
    else if (r.toxin === "xylitol") oDose.textContent = fmt(r.dose_g_per_kg, 4) + " g/kg";
    else if (r.toxin === "raisin_grape") oDose.textContent = fmt(r.dose_g_per_kg, 4) + " g/kg";
    else if (r.toxin === "ethylene_glycol") oDose.textContent = fmt(r.dose_mL_per_kg, 4) + " mL/kg (LD50 " + r.ld50_mL_per_kg + " mL/kg " + r.species + ")";
    oAPCC.textContent = "Call ASPCA APCC: 888-426-4435 (consult fee applies). Default to overcaution.";
  }, DEBOUNCE_MS);
  for (const el of [W.input, CG.input, XG.input, RG.input, EG.input]) el.addEventListener("input", update);
  for (const sel of [T.select, U.select, S.select, CT.select]) sel.addEventListener("change", update);
}

// ====================================================================
// U.13 Common breed predispositions reference
// ====================================================================
//
// Lookup of selected high-yield breed-specific predispositions. The
// AKC Canine Health Foundation, the OFA CHIC database, the AAHA
// breed guides, and the published veterinary internal-medicine
// references are the source. This tile is a kneeboard-card aid:
// breed -> short list of conditions to consider on a workup.

const BREED_PREDISPOSITIONS = [
  { breed: "Collie / Australian Shepherd / Sheltie", conditions: ["MDR1 mutation (ivermectin / loperamide / chemotherapy sensitivity)", "Collie eye anomaly (CEA)"] },
  { breed: "Doberman Pinscher", conditions: ["Dilated cardiomyopathy (DCM)", "von Willebrand disease type I", "Wobbler syndrome (CVI)"] },
  { breed: "German Shepherd", conditions: ["GDV / bloat", "Degenerative myelopathy", "Hip + elbow dysplasia", "Exocrine pancreatic insufficiency"] },
  { breed: "Great Dane / large + giant breeds", conditions: ["GDV / bloat", "Dilated cardiomyopathy (DCM)", "Hypothyroidism", "Wobbler syndrome"] },
  { breed: "Bulldog / Pug / French Bulldog (brachycephalic)", conditions: ["Brachycephalic airway syndrome (BAS)", "Hip dysplasia (bulldog)", "Hemivertebrae (French + English bulldog)", "Cherry eye"] },
  { breed: "Cavalier King Charles Spaniel", conditions: ["Mitral valve disease (MMVD)", "Chiari-like malformation / syringomyelia", "Episodic falling syndrome"] },
  { breed: "Boxer", conditions: ["Arrhythmogenic right ventricular cardiomyopathy (boxer cardiomyopathy)", "Mast cell tumor", "Aortic stenosis"] },
  { breed: "Labrador Retriever", conditions: ["Hip + elbow dysplasia", "Exercise-induced collapse (EIC)", "Centronuclear myopathy", "Obesity tendency"] },
  { breed: "Golden Retriever", conditions: ["Hemangiosarcoma", "Lymphoma", "Hip + elbow dysplasia", "Hypothyroidism"] },
  { breed: "Dachshund", conditions: ["Intervertebral disc disease (IVDD type I)", "Patellar luxation"] },
  { breed: "Yorkshire Terrier / small breed", conditions: ["Patellar luxation", "Tracheal collapse", "Portosystemic shunt (PSS)", "Hypoglycemia (toy breeds, especially neonates)"] },
  { breed: "Maine Coon / large-breed cat", conditions: ["Hypertrophic cardiomyopathy (HCM)", "Hip dysplasia", "Spinal muscular atrophy"] },
  { breed: "Persian / Himalayan / brachycephalic cat", conditions: ["Polycystic kidney disease (PKD)", "Brachycephalic airway syndrome", "Dental crowding"] },
  { breed: "Siamese / Oriental breeds", conditions: ["Asthma", "Mediastinal lymphoma (FeLV-negative)", "Progressive retinal atrophy"] },
  { breed: "Ragdoll", conditions: ["Hypertrophic cardiomyopathy (HCM)", "Urolithiasis (calcium oxalate)"] },
];

// dims: in { query: dimensionless } out: { rows: dimensionless, query: dimensionless, count: dimensionless }
// (Reference / filter table; breed -> condition strings are categorical.)
export function computeBreedPredispositions({ query }) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length === 0) return { rows: BREED_PREDISPOSITIONS, query: "" };
  const matches = BREED_PREDISPOSITIONS.filter((row) =>
    row.breed.toLowerCase().includes(q) ||
    row.conditions.some((c) => c.toLowerCase().includes(q))
  );
  return { rows: matches, query: q, count: matches.length };
}

export const breedPredispositionsExample = {
  inputs: { query: "doberman" },
  expected: { count: 1 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderBreedPredispositions(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-breed-predispositions");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Composite of AKC Canine Health Foundation, OFA Canine Health Information Center (CHIC) database, AAHA breed guides, and the standard veterinary internal-medicine references (Ettinger + Feldman, Textbook of Veterinary Internal Medicine, 9th ed.; Nelson + Couto, Small Animal Internal Medicine, 6th ed.). Population-level associations only; individual patient history and exam govern the workup.";
  const Q = makeText("Breed or condition (optional filter)", "bp-q", { placeholder: "e.g. doberman, brachycephalic, GDV" });
  inputRegion.appendChild(Q.wrap);
  attachExampleButton(inputRegion, () => { Q.input.value = breedPredispositionsExample.inputs.query; update(); });
  const oCount = makeOutputLine(outputRegion, "Matches", "bp-out-count");
  const oRows = makeOutputLine(outputRegion, "Breed -> predispositions", "bp-out-rows");
  const update = debounce(() => {
    const r = computeBreedPredispositions({ query: Q.input.value || "" });
    oCount.textContent = String(r.rows.length);
    oRows.textContent = r.rows.length === 0
      ? "No match. Clear the filter to see the full list."
      : r.rows.map((row) => row.breed + ": " + row.conditions.join("; ")).join("  |  ");
  }, DEBOUNCE_MS);
  Q.input.addEventListener("input", update);
  update();
}

// ====================================================================
// U.16 Plasma drug concentration at steady state (PK)
// ====================================================================
//
// Steady-state plasma concentration of a drug:
//
//   Css = (Dose * F) / (CL * tau)
//
// where Dose is per-dose amount (mg), F is bioavailability fraction
// (0-1; 1 for IV), CL is clearance (mL/kg/min, internally to mL/min by
// patient weight), tau is dosing interval (hr). Standard clinical
// pharmacokinetic reference (Plumb's; Riviere + Papich, Veterinary
// Pharmacology and Therapeutics, 10th ed.).

// dims: in { dose_mg: dimensionless, bioavailability_F: dimensionless, clearance_mL_per_kg_per_min: dimensionless, tau_hr: T, weight: M, weight_unit: dimensionless }
//        out: { Css_ug_per_mL: dimensionless, Css_mg_per_L: dimensionless, weight_kg: M, CL_mL_per_min: L^3 T^-1, tau_min: T, formula: dimensionless }
// (Pharmacokinetic steady-state identity; per-mass clearance and ug/mL concentrations surface as dimensionless caller-typed.)
export function computeSteadyStateConcentration({ dose_mg, bioavailability_F, clearance_mL_per_kg_per_min, tau_hr, weight, weight_unit }) {
  const D = Number(dose_mg);
  const F = Number(bioavailability_F);
  const CL_per_kg = Number(clearance_mL_per_kg_per_min);
  const tau = Number(tau_hr);
  const wt_kg = toKg(weight, weight_unit);
  if (!Number.isFinite(D) || D <= 0) return { error: "Enter a positive dose in mg." };
  if (!Number.isFinite(F) || F <= 0 || F > 1) return { error: "Bioavailability F must be in (0, 1] (1 for IV)." };
  if (!Number.isFinite(CL_per_kg) || CL_per_kg <= 0) return { error: "Clearance must be positive (mL/kg/min)." };
  if (!Number.isFinite(tau) || tau <= 0 || tau > 168) return { error: "Dosing interval tau must be in (0, 168] hours." };
  if (wt_kg == null) return { error: "Enter a positive patient weight." };
  // Convert: CL (mL/min) = CL_per_kg * wt_kg. tau in min = tau_hr * 60.
  // Css (mg/mL) = (Dose_mg * F) / (CL_mL_per_min * tau_min). Multiply by 1000 -> ug/mL.
  const CL_mL_min = CL_per_kg * wt_kg;
  const tau_min = tau * 60;
  const Css_mg_per_mL = (D * F) / (CL_mL_min * tau_min);
  const Css_ug_per_mL = Css_mg_per_mL * 1000;
  return {
    Css_ug_per_mL,
    Css_mg_per_L: Css_ug_per_mL,
    weight_kg: wt_kg,
    CL_mL_per_min: CL_mL_min,
    tau_min,
    formula: "Css = (Dose * F) / (CL * tau)",
  };
}

export const steadyStateExample = {
  inputs: { dose_mg: 100, bioavailability_F: 1, clearance_mL_per_kg_per_min: 5, tau_hr: 8, weight: 10, weight_unit: "kg" },
  // CL = 5 * 10 = 50 mL/min; tau = 8 * 60 = 480 min.
  // Css = (100 * 1) / (50 * 480) = 100 / 24000 = 0.004167 mg/mL = 4.167 ug/mL.
  expected: { Css_ug_per_mL_approx: 4.167 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderSteadyStateConcentration(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-plasma-css");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Steady-state plasma drug concentration: Css = (Dose * F) / (CL * tau). Standard clinical pharmacokinetic identity per Riviere + Papich, Veterinary Pharmacology and Therapeutics (10th ed.) chapter 3; Plumb's Veterinary Drug Handbook (10th ed.) appendix on pharmacokinetic parameters. Veterinary clinical pharmacologist or board-certified internist governs dosing in renal / hepatic compromise where CL deviates from healthy-population values.";
  const D = makeNumber("Dose per administration (mg)", "css-d", { step: "any", min: "0" });
  const F = makeNumber("Bioavailability F (0 to 1; 1 for IV)", "css-f", { step: "any", min: "0", max: "1", value: "1" });
  const CL = makeNumber("Clearance (mL/kg/min)", "css-cl", { step: "any", min: "0" });
  const TAU = makeNumber("Dosing interval tau (hr)", "css-tau", { step: "any", min: "0", max: "168" });
  const W = makeNumber("Patient weight", "css-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "css-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  for (const f of [D, F, CL, TAU, W, U]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    D.input.value = String(steadyStateExample.inputs.dose_mg);
    F.input.value = String(steadyStateExample.inputs.bioavailability_F);
    CL.input.value = String(steadyStateExample.inputs.clearance_mL_per_kg_per_min);
    TAU.input.value = String(steadyStateExample.inputs.tau_hr);
    W.input.value = String(steadyStateExample.inputs.weight);
    U.select.value = steadyStateExample.inputs.weight_unit;
    update();
  });
  const oCss = makeOutputLine(outputRegion, "Css (steady-state concentration, ug/mL)", "css-out-css");
  const oFormula = makeOutputLine(outputRegion, "Formula", "css-out-formula");
  const oCL = makeOutputLine(outputRegion, "Patient CL (mL/min)", "css-out-cl");
  const update = debounce(() => {
    const r = computeSteadyStateConcentration({
      dose_mg: D.input.value, bioavailability_F: F.input.value,
      clearance_mL_per_kg_per_min: CL.input.value, tau_hr: TAU.input.value,
      weight: W.input.value, weight_unit: U.select.value,
    });
    if (r.error) { oCss.textContent = r.error; for (const o of [oFormula, oCL]) o.textContent = "-"; return; }
    oCss.textContent = fmt(r.Css_ug_per_mL, 4);
    oFormula.textContent = r.formula;
    oCL.textContent = fmt(r.CL_mL_per_min, 1);
  }, DEBOUNCE_MS);
  for (const el of [D.input, F.input, CL.input, TAU.input, W.input]) el.addEventListener("input", update);
  U.select.addEventListener("change", update);
}

// ====================================================================
// U.8 Vaccine schedule reference (AAHA dog / AAFP cat; rabies overlay)
// ====================================================================
//
// Reference-only render of the AAHA Canine Vaccination Guidelines
// (2022 update) and the AAFP Feline Vaccination Advisory Panel
// Report (2020 update). Each species splits into "core" (recommended
// for every patient absent contraindication) and "non-core"
// (lifestyle / risk-based). Rabies appears in BOTH species lists
// because the rabies schedule is governed by state-level Agency Having
// Jurisdiction (AHJ) statute, NOT by the guideline; this tile prints
// the "state law governs" overlay rather than attempting to encode
// 50 state-specific tables.

const VACCINE_SCHEDULE = {
  dog: {
    publisher: "AAHA Canine Vaccination Guidelines (2022 update)",
    core: [
      { vaccine: "DAP (distemper / adenovirus-2 / parvovirus)", schedule: "Puppy series: every 2-4 wk from 6-8 wk to >= 16 wk; booster at 1 yr; then every 3 yr." },
      { vaccine: "Rabies", schedule: "Single dose >= 12 wk; booster at 1 yr; then every 1 or 3 yr per state-AHJ statute (NOT the guideline)." },
    ],
    non_core: [
      { vaccine: "Leptospirosis (4-serovar)", schedule: "Two-dose initial series 2-4 wk apart from >= 12 wk; annual booster. AAHA recommends for most dogs given expanding geographic distribution." },
      { vaccine: "Bordetella bronchiseptica", schedule: "Intranasal / oral single dose or parenteral two-dose; annual for boarding / daycare / show dogs." },
      { vaccine: "Borrelia burgdorferi (Lyme)", schedule: "Two-dose initial series 2-4 wk apart from >= 8-9 wk; annual. Endemic regions only." },
      { vaccine: "Canine influenza (H3N2, H3N8)", schedule: "Two-dose initial series 2-4 wk apart; annual. Boarding / show / daycare risk." },
      { vaccine: "Crotalus atrox (rattlesnake)", schedule: "Per label, regional. Antibody-titer evidence limited; consult endemic-region veterinarian." },
    ],
  },
  cat: {
    publisher: "AAFP Feline Vaccination Advisory Panel Report (2020 update)",
    core: [
      { vaccine: "FVRCP (herpesvirus-1 / calicivirus / panleukopenia)", schedule: "Kitten series: every 3-4 wk from 6-8 wk to >= 16-20 wk; booster at 1 yr; then every 3 yr (low-risk adult)." },
      { vaccine: "Rabies", schedule: "Single dose >= 12 wk; booster at 1 yr; then every 1 or 3 yr per state-AHJ statute (NOT the guideline)." },
      { vaccine: "FeLV (feline leukemia virus)", schedule: "Core for ALL kittens per 2020 update: two-dose initial series 3-4 wk apart from >= 8 wk; booster at 1 yr; then risk-based." },
    ],
    non_core: [
      { vaccine: "FeLV (adult)", schedule: "Risk-based for adults: outdoor access, multi-cat household with FeLV+. Annual or every 2-3 yr per product label." },
      { vaccine: "Chlamydia felis", schedule: "Multi-cat / shelter situations with documented infection. Two-dose initial series; annual." },
      { vaccine: "Bordetella bronchiseptica", schedule: "Shelter / boarding. Intranasal single dose; annual." },
      { vaccine: "FIP (feline infectious peritonitis)", schedule: "Not generally recommended per AAFP; questionable efficacy." },
    ],
  },
};

// dims: in { species: dimensionless }
//        out: { species: dimensionless, publisher: dimensionless, core_count: dimensionless, non_core_count: dimensionless, core: dimensionless, non_core: dimensionless, rabies_overlay: dimensionless }
// (Reference table; AAHA / AAFP vaccine schedules + state-AHJ rabies overlay are categorical.)
export function computeVaccineSchedule({ species }) {
  const sp = String(species || "").toLowerCase();
  const entry = VACCINE_SCHEDULE[sp];
  if (!entry) return { error: "Species must be one of: dog, cat." };
  return {
    species: sp,
    publisher: entry.publisher,
    core_count: entry.core.length,
    non_core_count: entry.non_core.length,
    core: entry.core,
    non_core: entry.non_core,
    rabies_overlay: "Rabies vaccine interval is governed by state-AHJ statute, not by the AAHA / AAFP guideline. Defer to the state department of agriculture / public health for the legal interval and the certifying veterinarian list.",
  };
}

export const vaccineScheduleExample = {
  inputs: { species: "dog" },
  expected: { core_count: 2, non_core_count: 5 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderVaccineSchedule(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-vaccine-schedule");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: AAHA Canine Vaccination Guidelines (2022 update) and AAFP Feline Vaccination Advisory Panel Report (2020 update). Both are free at aaha.org and catvets.com. Rabies vaccination interval is governed by the state-level Agency Having Jurisdiction (AHJ) statute, NOT by the guideline; defer to the state department of agriculture / public health. The attending veterinarian governs the schedule for the individual patient (age, prior history, lifestyle, contraindications).";
  const S = makeSelect("Species", "vacc-s", [{ value: "dog", label: "Dog (AAHA 2022)" }, { value: "cat", label: "Cat (AAFP 2020)" }]);
  inputRegion.appendChild(S.wrap);
  attachExampleButton(inputRegion, () => { S.select.value = "dog"; update(); });
  const oPub = makeOutputLine(outputRegion, "Publisher", "vacc-out-pub");
  const oCore = makeOutputLine(outputRegion, "Core vaccines", "vacc-out-core");
  const oNon = makeOutputLine(outputRegion, "Non-core (risk-based)", "vacc-out-non");
  const oRabies = makeOutputLine(outputRegion, "Rabies overlay", "vacc-out-rabies");
  const update = debounce(() => {
    const r = computeVaccineSchedule({ species: S.select.value });
    if (r.error) { oPub.textContent = r.error; for (const o of [oCore, oNon, oRabies]) o.textContent = "-"; return; }
    oPub.textContent = r.publisher;
    oCore.textContent = r.core.map((v) => v.vaccine + ": " + v.schedule).join("  |  ");
    oNon.textContent = r.non_core.map((v) => v.vaccine + ": " + v.schedule).join("  |  ");
    oRabies.textContent = r.rabies_overlay;
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
  update();
}

// ====================================================================
// U.9 Heartworm preventive dose (FDA weight-band lookup)
// ====================================================================
//
// Per FDA-approved labeling published on DailyMed, the three most
// common monthly heartworm preventives stratify dosing by patient
// weight band. This tile is a bounded lookup, NOT a free-form dose
// computation. The strata below mirror the FDA labels:
//
// - Ivermectin -> Heartgard Plus (chewable, dogs):
//     up to 25 lb  -> 68 mcg ivermectin + 57 mg pyrantel (blue)
//     26-50 lb     -> 136 mcg + 114 mg (green)
//     51-100 lb    -> 272 mcg + 227 mg (brown)
//     > 100 lb     -> appropriate combination of above tablets
// - Milbemycin oxime -> Interceptor Plus (chewable, dogs):
//     2-8 lb       -> 2.3 mg milbemycin + 22.8 mg praziquantel
//     8.1-25 lb    -> 5.75 mg + 57 mg
//     25.1-50 lb   -> 11.5 mg + 114 mg
//     50.1-100 lb  -> 23 mg + 228 mg
// - Selamectin -> Revolution (topical, dogs):
//     up to 5.0 lb     -> 15 mg (mauve, 0.25 mL)
//     5.1-10.0 lb      -> 30 mg (purple, 0.25 mL)
//     10.1-20.0 lb     -> 60 mg (brown, 0.5 mL)
//     20.1-40.0 lb     -> 120 mg (red, 1.0 mL)
//     40.1-85.0 lb     -> 240 mg (teal, 2.0 mL)
//     85.1-130.0 lb    -> 360 mg (plum, 3.0 mL)

const HEARTWORM_STRATA = {
  ivermectin: {
    product: "Heartgard Plus (ivermectin + pyrantel) chewable, oral, dogs",
    bands: [
      { max_lb: 25,  label: "Blue tablet: 68 mcg ivermectin + 57 mg pyrantel (up to 25 lb)" },
      { max_lb: 50,  label: "Green tablet: 136 mcg ivermectin + 114 mg pyrantel (26-50 lb)" },
      { max_lb: 100, label: "Brown tablet: 272 mcg ivermectin + 227 mg pyrantel (51-100 lb)" },
      { max_lb: Infinity, label: "Above 100 lb: combine appropriate tablets per FDA label." },
    ],
  },
  milbemycin: {
    product: "Interceptor Plus (milbemycin oxime + praziquantel) chewable, oral, dogs",
    bands: [
      { max_lb: 8,   label: "2-8 lb: 2.3 mg milbemycin + 22.8 mg praziquantel" },
      { max_lb: 25,  label: "8.1-25 lb: 5.75 mg milbemycin + 57 mg praziquantel" },
      { max_lb: 50,  label: "25.1-50 lb: 11.5 mg milbemycin + 114 mg praziquantel" },
      { max_lb: 100, label: "50.1-100 lb: 23 mg milbemycin + 228 mg praziquantel" },
      { max_lb: Infinity, label: "Above 100 lb: combine appropriate tablets per FDA label." },
    ],
  },
  selamectin: {
    product: "Revolution (selamectin) topical, dogs",
    bands: [
      { max_lb: 5,    label: "Mauve tube: 15 mg selamectin (0.25 mL, up to 5 lb)" },
      { max_lb: 10,   label: "Purple tube: 30 mg selamectin (0.25 mL, 5.1-10 lb)" },
      { max_lb: 20,   label: "Brown tube: 60 mg selamectin (0.5 mL, 10.1-20 lb)" },
      { max_lb: 40,   label: "Red tube: 120 mg selamectin (1.0 mL, 20.1-40 lb)" },
      { max_lb: 85,   label: "Teal tube: 240 mg selamectin (2.0 mL, 40.1-85 lb)" },
      { max_lb: 130,  label: "Plum tube: 360 mg selamectin (3.0 mL, 85.1-130 lb)" },
      { max_lb: Infinity, label: "Above 130 lb: combine appropriate tubes per FDA label." },
    ],
  },
};

// dims: in { weight: M, weight_unit: dimensionless, active_ingredient: dimensionless }
//        out: { weight_kg: M, weight_lb: M, active_ingredient: dimensionless, product: dimensionless, band_label: dimensionless }
export function computeHeartwormDose({ weight, weight_unit, active_ingredient }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive patient weight." };
  if (wt_kg < 0.5 || wt_kg > 100) return { error: "Weight below 0.5 kg or above 100 kg flagged; verify." };
  const wt_lb = wt_kg * LB_PER_KG;
  const ai = String(active_ingredient || "").toLowerCase();
  const entry = HEARTWORM_STRATA[ai];
  if (!entry) return { error: "Active ingredient must be one of: ivermectin, milbemycin, selamectin." };
  let band = null;
  for (const b of entry.bands) {
    if (wt_lb <= b.max_lb) { band = b; break; }
  }
  return {
    weight_kg: wt_kg,
    weight_lb: wt_lb,
    active_ingredient: ai,
    product: entry.product,
    band_label: band ? band.label : "Above all labeled bands; combine tablets per FDA label.",
  };
}

export const heartwormExample = {
  inputs: { weight: 20, weight_unit: "kg", active_ingredient: "ivermectin" },
  // 20 kg = 44.09 lb -> Heartgard Plus green tablet (26-50 lb).
  expected: { band_label_contains: "Green tablet" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderHeartwormDose(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-heartworm-dose");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: FDA-approved product labeling per DailyMed (dailymed.nlm.nih.gov). Heartgard Plus (Boehringer Ingelheim), Interceptor Plus (Elanco), Revolution (Zoetis). The FDA label is the dose of record; this tile renders the labeled weight-band lookup only. American Heartworm Society (heartwormsociety.org) governs prevention strategy and treatment of confirmed infection. The attending veterinarian governs product selection and contraindications (MDR1 mutation, concurrent ivermectin sensitivity, age limits).";
  const W = makeNumber("Patient weight", "hw-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "hw-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const A = makeSelect("Active ingredient / product", "hw-a", [
    { value: "ivermectin", label: "Ivermectin (Heartgard Plus chewable)" },
    { value: "milbemycin", label: "Milbemycin oxime (Interceptor Plus chewable)" },
    { value: "selamectin", label: "Selamectin (Revolution topical)" },
  ]);
  for (const f of [W, U, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    W.input.value = String(heartwormExample.inputs.weight);
    U.select.value = heartwormExample.inputs.weight_unit;
    A.select.value = heartwormExample.inputs.active_ingredient;
    update();
  });
  const oWt = makeOutputLine(outputRegion, "Weight (kg / lb)", "hw-out-wt");
  const oProd = makeOutputLine(outputRegion, "Product", "hw-out-prod");
  const oBand = makeOutputLine(outputRegion, "Labeled band", "hw-out-band");
  const update = debounce(() => {
    const r = computeHeartwormDose({ weight: W.input.value, weight_unit: U.select.value, active_ingredient: A.select.value });
    if (r.error) { oBand.textContent = r.error; for (const o of [oWt, oProd]) o.textContent = "-"; return; }
    oWt.textContent = fmt(r.weight_kg, 2) + " kg / " + fmt(r.weight_lb, 1) + " lb";
    oProd.textContent = r.product;
    oBand.textContent = r.band_label;
  }, DEBOUNCE_MS);
  for (const el of [W.input]) el.addEventListener("input", update);
  for (const sel of [U.select, A.select]) sel.addEventListener("change", update);
}

// ====================================================================
// U.17 Crystalloid replacement plan (maintenance + per-loss worksheet)
// ====================================================================
//
// Combines U.2 maintenance with an itemized per-loss worksheet:
// vomiting, diarrhea, blood loss, surgical loss, all in mL/hr. Output
// is the consolidated mL/hr infusion rate AND the drops-per-minute for
// the two common drip sets (10 gtt/mL macro, 60 gtt/mL pediatric).
// Per DiBartola Fluid / Electrolyte / Acid-Base Disorders (4th ed.)
// with the Holliday-Segar adapted maintenance basis from U.2.

// dims: in { weight: M, weight_unit: dimensionless, species: dimensionless, dehydration_percent: dimensionless, vomiting_mL_per_hr: L^3 T^-1, diarrhea_mL_per_hr: L^3 T^-1, blood_loss_mL_per_hr: L^3 T^-1, surgical_loss_mL_per_hr: L^3 T^-1, rehydration_window_hr: T }
//        out: { species: dimensionless, weight_kg: M, basis_mL_per_kg_per_day: dimensionless, maintenance_mL_per_hr: L^3 T^-1, replacement_total_mL: L^3, replacement_rate_mL_per_hr: L^3 T^-1, losses_breakdown_mL_per_hr: dimensionless, losses_total_mL_per_hr: L^3 T^-1, total_rate_mL_per_hr: L^3 T^-1, gtts_per_min_10_set: T^-1, gtts_per_min_60_set: T^-1, recheck_reminder: dimensionless, severe_dehydration_flag: dimensionless }
export function computeCrystalloidPlan({
  weight, weight_unit, species, dehydration_percent,
  vomiting_mL_per_hr, diarrhea_mL_per_hr, blood_loss_mL_per_hr, surgical_loss_mL_per_hr,
  rehydration_window_hr,
}) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  const basis = FLUID_BASIS_ML_KG_DAY[String(species).toLowerCase()];
  if (!basis) return { error: "Species must be one of: dog, cat, horse, cow." };
  const dh = Number(dehydration_percent) || 0;
  if (dh < 0 || dh > 15) return { error: "Dehydration percent must be 0 to 15." };
  const window = Number(rehydration_window_hr) || 24;
  if (window <= 0 || window > 72) return { error: "Rehydration window must be between 0 and 72 hours." };
  const losses = {
    vomiting: Number(vomiting_mL_per_hr) || 0,
    diarrhea: Number(diarrhea_mL_per_hr) || 0,
    blood: Number(blood_loss_mL_per_hr) || 0,
    surgical: Number(surgical_loss_mL_per_hr) || 0,
  };
  for (const k of Object.keys(losses)) {
    if (losses[k] < 0) return { error: "Loss rates cannot be negative." };
  }
  const losses_total_mL_per_hr = losses.vomiting + losses.diarrhea + losses.blood + losses.surgical;
  const maintenance_mL_per_day = basis * wt_kg;
  const maintenance_mL_per_hr = maintenance_mL_per_day / 24;
  const replacement_total_mL = wt_kg * (dh / 100) * 1000;
  const replacement_rate_mL_per_hr = replacement_total_mL / window;
  const total_rate_mL_per_hr = maintenance_mL_per_hr + replacement_rate_mL_per_hr + losses_total_mL_per_hr;
  // Drops per minute: rate (mL/hr) * drops/mL / 60 min/hr.
  const gtts_per_min_10 = (total_rate_mL_per_hr * 10) / 60;
  const gtts_per_min_60 = (total_rate_mL_per_hr * 60) / 60;
  return {
    species: String(species).toLowerCase(),
    weight_kg: wt_kg,
    basis_mL_per_kg_per_day: basis,
    maintenance_mL_per_hr,
    replacement_total_mL,
    replacement_rate_mL_per_hr,
    losses_breakdown_mL_per_hr: losses,
    losses_total_mL_per_hr,
    total_rate_mL_per_hr,
    gtts_per_min_10_set: gtts_per_min_10,
    gtts_per_min_60_set: gtts_per_min_60,
    recheck_reminder: "Recheck patient status (mentation, perfusion, urine output, body weight) in 6 hours; adjust plan accordingly.",
    severe_dehydration_flag: dh > 8,
  };
}

export const crystalloidPlanExample = {
  inputs: {
    weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 5,
    vomiting_mL_per_hr: 50, diarrhea_mL_per_hr: 0, blood_loss_mL_per_hr: 0, surgical_loss_mL_per_hr: 0,
    rehydration_window_hr: 24,
  },
  // 20 kg dog: maintenance 60*20/24 = 50 mL/hr; replacement 20*0.05*1000/24 = 41.667 mL/hr;
  // losses 50 mL/hr; total = 141.667 mL/hr.
  expected: { maintenance_mL_per_hr: 50, total_rate_mL_per_hr_approx: 141.667 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderCrystalloidPlan(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-crystalloid-plan");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Maintenance basis per Holliday-Segar adapted for small animals; replacement and per-loss accounting per DiBartola, 'Fluid, Electrolyte, and Acid-Base Disorders in Small Animal Practice' (4th ed.). Drip-set conversions assume 10 gtt/mL macro and 60 gtt/mL pediatric sets. The attending veterinarian governs cardiac / renal / hepatic adjustments and recheck cadence.";
  const W = makeNumber("Patient weight", "cp-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "cp-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const S = makeSelect("Species", "cp-s", SPECIES_OPTS);
  const D = makeNumber("Estimated dehydration (percent, 0-15)", "cp-d", { step: "any", min: "0", max: "15", value: "0" });
  const V = makeNumber("Vomiting losses (mL/hr)", "cp-v", { step: "any", min: "0", value: "0" });
  const DI = makeNumber("Diarrhea losses (mL/hr)", "cp-di", { step: "any", min: "0", value: "0" });
  const B = makeNumber("Blood loss (mL/hr)", "cp-b", { step: "any", min: "0", value: "0" });
  const SX = makeNumber("Surgical / third-space loss (mL/hr)", "cp-sx", { step: "any", min: "0", value: "0" });
  const Win = makeNumber("Rehydration window (hr)", "cp-win", { step: "any", min: "0", max: "72", value: "24" });
  for (const f of [W, U, S, D, V, DI, B, SX, Win]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    W.input.value = "20"; U.select.value = "kg"; S.select.value = "dog";
    D.input.value = "5"; V.input.value = "50"; DI.input.value = "0";
    B.input.value = "0"; SX.input.value = "0"; Win.input.value = "24";
    update();
  });
  const oMaint = makeOutputLine(outputRegion, "Maintenance (mL/hr)", "cp-out-maint");
  const oRepl = makeOutputLine(outputRegion, "Replacement (mL/hr)", "cp-out-repl");
  const oLoss = makeOutputLine(outputRegion, "Losses total (mL/hr)", "cp-out-loss");
  const oTotal = makeOutputLine(outputRegion, "Total infusion rate (mL/hr)", "cp-out-total");
  const oG10 = makeOutputLine(outputRegion, "Drops/min (10 gtt/mL macro set)", "cp-out-g10");
  const oG60 = makeOutputLine(outputRegion, "Drops/min (60 gtt/mL pediatric set)", "cp-out-g60");
  const oRecheck = makeOutputLine(outputRegion, "Recheck", "cp-out-recheck");
  const update = debounce(() => {
    const r = computeCrystalloidPlan({
      weight: W.input.value, weight_unit: U.select.value, species: S.select.value,
      dehydration_percent: D.input.value,
      vomiting_mL_per_hr: V.input.value, diarrhea_mL_per_hr: DI.input.value,
      blood_loss_mL_per_hr: B.input.value, surgical_loss_mL_per_hr: SX.input.value,
      rehydration_window_hr: Win.input.value,
    });
    if (r.error) { oMaint.textContent = r.error; for (const o of [oRepl, oLoss, oTotal, oG10, oG60, oRecheck]) o.textContent = "-"; return; }
    oMaint.textContent = fmt(r.maintenance_mL_per_hr, 2);
    oRepl.textContent = fmt(r.replacement_rate_mL_per_hr, 2) + " (total replacement " + fmt(r.replacement_total_mL, 1) + " mL)";
    oLoss.textContent = fmt(r.losses_total_mL_per_hr, 2);
    oTotal.textContent = fmt(r.total_rate_mL_per_hr, 2);
    oG10.textContent = fmt(r.gtts_per_min_10_set, 1);
    oG60.textContent = fmt(r.gtts_per_min_60_set, 1);
    oRecheck.textContent = r.recheck_reminder;
  }, DEBOUNCE_MS);
  for (const el of [W.input, D.input, V.input, DI.input, B.input, SX.input, Win.input]) el.addEventListener("input", update);
  for (const sel of [U.select, S.select]) sel.addEventListener("change", update);
}

// --- Renderer registry ---

// ====================================================================
// U.1 Constant-rate infusion (CRI) drip rate
// ====================================================================
//
// The classic CRI bag method. A carrier bag of volume V is run over a
// planned duration T (rate = V / T mL/hr) and must deliver a target
// dose. Working in mg/hr:
//
//   mg_per_kg_per_hr = dose (mg/kg/hr), or dose(mcg/kg/min) * 60 / 1000
//   mg_per_hr        = mg_per_kg_per_hr * weight_kg
//   rate_mL_per_hr   = bag_volume_mL / duration_hr
//   total_drug_mg    = mg_per_hr * duration_hr     (drug added to the bag)
//   volume_to_add_mL = total_drug_mg / stock_conc_mg_per_mL
//   gtt_per_min      = rate_mL_per_hr * gtt_per_mL / 60
//
// Per Plumb's Veterinary Drug Handbook 10th ed. and the AVECCT CRI
// worksheets. Veterinarian governs the drug, dose, and rate.

const GTT_SETS = { "60": 60, "10": 10 };

// dims: in { stock_conc_mg_per_mL: dimensionless, dose: dimensionless, dose_unit: dimensionless, weight: M, weight_unit: dimensionless, bag_volume_mL: L^3, duration_hr: T, drip_set: dimensionless }
//        out: { total_drug_mg: dimensionless, infusion_rate_mL_per_hr: L^3 T^-1, mg_per_hr: dimensionless }
// (Drug masses in mg and concentrations in mg/mL surface as caller-typed
//  dimensionless quantities per spec-v14 §7.1; weight carries M, bag
//  volume L^3, duration T.)
export function computeVetCRI({ stock_conc_mg_per_mL, dose, dose_unit, weight, weight_unit, bag_volume_mL, duration_hr, drip_set }) {
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  const stock = Number(stock_conc_mg_per_mL);
  const d = Number(dose);
  const bag = Number(bag_volume_mL);
  const dur = Number(duration_hr);
  if (!Number.isFinite(stock) || stock <= 0) return { error: "Enter a positive stock concentration in mg/mL." };
  if (!Number.isFinite(d) || d < 0) return { error: "Enter a non-negative dose." };
  if (!Number.isFinite(bag) || bag <= 0) return { error: "Enter a positive carrier bag volume in mL." };
  if (!Number.isFinite(dur) || dur <= 0) return { error: "Enter a positive infusion duration in hours." };
  const unit = String(dose_unit || "mcg_kg_min");
  const mg_per_kg_per_hr = unit === "mg_kg_hr" ? d : d * 60 / 1000; // mcg/kg/min -> mg/kg/hr
  const mg_per_hr = mg_per_kg_per_hr * wt_kg;
  const total_drug_mg = mg_per_hr * dur;
  const volume_to_add_mL = total_drug_mg / stock;
  const infusion_rate_mL_per_hr = bag / dur;
  const gtt_per_mL = GTT_SETS[String(drip_set)] || 60;
  const gtt_per_min = infusion_rate_mL_per_hr * gtt_per_mL / 60;
  const bag_time_hr = infusion_rate_mL_per_hr > 0 ? bag / infusion_rate_mL_per_hr : 0;
  const flags = [];
  if (volume_to_add_mL > bag) flags.push("Drug volume to add exceeds the bag volume; use a higher-concentration stock or a larger bag.");
  if (infusion_rate_mL_per_hr > 500) flags.push("Infusion rate above 500 mL/hr is outside the typical gravity-drip range; use a pump.");
  return {
    weight_kg: wt_kg,
    mg_per_kg_per_hr,
    mg_per_hr,
    total_drug_mg,
    volume_to_add_mL,
    infusion_rate_mL_per_hr,
    gtt_per_mL,
    gtt_per_min,
    bag_time_hr,
    flags,
  };
}

export const vetCRIExample = {
  // 0.5 mcg/kg/min fentanyl, 15 kg dog, 24 hr, 250 mL bag, stock 0.05 mg/mL.
  // mg/kg/hr = 0.03; mg/hr = 0.45; total = 10.8 mg; rate = 250/24 = 10.4167 mL/hr.
  inputs: { stock_conc_mg_per_mL: 0.05, dose: 0.5, dose_unit: "mcg_kg_min", weight: 15, weight_unit: "kg", bag_volume_mL: 250, duration_hr: 24, drip_set: "60" },
  expected: { total_drug_mg: 10.8, infusion_rate_mL_per_hr: 10.4167 },
};

const DOSE_UNIT_OPTS = [
  { value: "mcg_kg_min", label: "mcg/kg/min" },
  { value: "mg_kg_hr", label: "mg/kg/hr" },
];
const DRIP_SET_OPTS = [
  { value: "60", label: "60 gtt/mL (microdrip)" },
  { value: "10", label: "10 gtt/mL (macrodrip)" },
];

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderVetCRI(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-cri");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: CRI bag method. mg/hr = dose * weight; total drug to add = mg/hr * duration; infusion rate = bag volume / duration; gtt/min = rate * gtt/mL / 60. Dose and stock concentration are read from the current formulary (Plumb's Veterinary Drug Handbook 10th ed.) and the AVECCT CRI worksheets. Veterinarian governs the drug, dose, and rate.";
  const drug = makeText("Drug (free text, optional)", "cri-drug", { placeholder: "fentanyl" });
  const C = makeNumber("Stock concentration (mg/mL)", "cri-c", { step: "any", min: "0" });
  const D = makeNumber("Target dose", "cri-d", { step: "any", min: "0" });
  const DU = makeSelect("Dose unit", "cri-du", DOSE_UNIT_OPTS);
  const W = makeNumber("Patient weight", "cri-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "cri-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const B = makeNumber("Carrier bag volume (mL)", "cri-b", { step: "any", min: "0" });
  const T = makeNumber("Infusion duration / bag life (hr)", "cri-t", { step: "any", min: "0" });
  const S = makeSelect("Drip set", "cri-s", DRIP_SET_OPTS);
  for (const f of [drug, C, D, DU, W, U, B, T, S]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = vetCRIExample.inputs;
    drug.input.value = "fentanyl"; C.input.value = String(ex.stock_conc_mg_per_mL);
    D.input.value = String(ex.dose); DU.select.value = ex.dose_unit;
    W.input.value = String(ex.weight); U.select.value = ex.weight_unit;
    B.input.value = String(ex.bag_volume_mL); T.input.value = String(ex.duration_hr);
    S.select.value = ex.drip_set; update();
  });
  const oTotal = makeOutputLine(outputRegion, "Drug to add to bag (mg)", "cri-out-total");
  const oVol = makeOutputLine(outputRegion, "Drug volume to add (mL)", "cri-out-vol");
  const oRate = makeOutputLine(outputRegion, "Infusion rate (mL/hr)", "cri-out-rate");
  const oGtt = makeOutputLine(outputRegion, "Drops per minute", "cri-out-gtt");
  const oMgHr = makeOutputLine(outputRegion, "Delivered (mg/hr)", "cri-out-mghr");
  const oFlag = makeOutputLine(outputRegion, "Flags", "cri-out-flag");
  const update = debounce(() => {
    const r = computeVetCRI({
      stock_conc_mg_per_mL: C.input.value, dose: D.input.value, dose_unit: DU.select.value,
      weight: W.input.value, weight_unit: U.select.value, bag_volume_mL: B.input.value,
      duration_hr: T.input.value, drip_set: S.select.value,
    });
    if (r.error) { oTotal.textContent = r.error; for (const o of [oVol, oRate, oGtt, oMgHr, oFlag]) o.textContent = "-"; return; }
    oTotal.textContent = fmt(r.total_drug_mg, 3) + " mg";
    oVol.textContent = fmt(r.volume_to_add_mL, 2) + " mL of stock";
    oRate.textContent = fmt(r.infusion_rate_mL_per_hr, 2) + " mL/hr";
    oGtt.textContent = fmt(r.gtt_per_min, 1) + " gtt/min (" + r.gtt_per_mL + " gtt/mL set)";
    oMgHr.textContent = fmt(r.mg_per_hr, 4) + " mg/hr";
    oFlag.textContent = r.flags.length ? r.flags.join(" | ") : "Within typical CRI range.";
  }, DEBOUNCE_MS);
  for (const el of [C.input, D.input, W.input, B.input, T.input]) el.addEventListener("input", update);
  for (const sel of [DU.select, U.select, S.select]) sel.addEventListener("change", update);
}

// ====================================================================
// U.3 Blood transfusion volume
// ====================================================================
//
// Standard veterinary transfusion-volume estimate:
//
//   volume_mL = BV_per_kg * weight_kg * (PCV_target - PCV_current) / PCV_donor
//
// where BV_per_kg is the species blood-volume estimate (dog 90, cat 60,
// horse 80 mL/kg). Per the ACVIM Transfusion Medicine Consensus
// Statement (2021). Cross-match before transfusion; monitor for
// reaction. Veterinarian governs.

const BLOOD_VOLUME_ML_KG = { dog: 90, cat: 60, horse: 80 };

// dims: in { species: dimensionless, weight: M, weight_unit: dimensionless, pcv_current: dimensionless, pcv_target: dimensionless, pcv_donor: dimensionless, rate_mL_per_kg_per_hr: dimensionless }
//        out: { volume_mL: L^3, infusion_rate_mL_per_hr: L^3 T^-1, duration_hr: T }
// (PCV percentages are dimensionless; weight M, volume L^3.)
export function computeVetTransfusion({ species, weight, weight_unit, pcv_current, pcv_target, pcv_donor, rate_mL_per_kg_per_hr }) {
  const sp = String(species).toLowerCase();
  const bv = BLOOD_VOLUME_ML_KG[sp];
  if (!bv) return { error: "Species must be one of: dog, cat, horse." };
  const wt_kg = toKg(weight, weight_unit);
  if (wt_kg == null) return { error: "Enter a positive weight." };
  const cur = Number(pcv_current), tgt = Number(pcv_target), don = Number(pcv_donor);
  if (!Number.isFinite(cur) || cur < 5 || cur > 70) return { error: "Current PCV must be 5 to 70 percent." };
  if (!Number.isFinite(tgt) || tgt < 5 || tgt > 70) return { error: "Target PCV must be 5 to 70 percent." };
  if (tgt <= cur) return { error: "Target PCV must exceed current PCV." };
  if (!Number.isFinite(don) || don < 35 || don > 70) return { error: "Donor PCV must be 35 to 70 percent." };
  const rate = (rate_mL_per_kg_per_hr === undefined || rate_mL_per_kg_per_hr === "" || rate_mL_per_kg_per_hr === null) ? 5 : Number(rate_mL_per_kg_per_hr);
  if (!Number.isFinite(rate) || rate <= 0) return { error: "Infusion rate must be positive (mL/kg/hr)." };
  const volume_mL = bv * wt_kg * (tgt - cur) / don;
  const infusion_rate_mL_per_hr = rate * wt_kg;
  const duration_hr = volume_mL / infusion_rate_mL_per_hr;
  const flags = [];
  if (tgt > 35) flags.push("Target PCV above 35 percent risks over-transfusion in an anemic patient.");
  if (duration_hr > 4) flags.push("Planned duration exceeds 4 hr; a single unit should infuse within 4 hr (bacterial-growth limit).");
  return { species: sp, weight_kg: wt_kg, blood_volume_mL_per_kg: bv, volume_mL, infusion_rate_mL_per_hr, duration_hr, flags };
}

export const vetTransfusionExample = {
  // Dog 20 kg, current PCV 15, target 25, donor 40, at 5 mL/kg/hr.
  // 90 * 20 * (25-15)/40 = 450 mL; rate 100 mL/hr; 4.5 hr.
  inputs: { species: "dog", weight: 20, weight_unit: "kg", pcv_current: 15, pcv_target: 25, pcv_donor: 40, rate_mL_per_kg_per_hr: 5 },
  expected: { volume_mL: 450, duration_hr: 4.5 },
};

const TRANSFUSION_SPECIES_OPTS = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "horse", label: "Horse" },
];

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderVetTransfusion(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("vet-transfusion");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: volume_mL = blood_volume_per_kg * weight_kg * (PCV_target - PCV_current) / PCV_donor (dog 90, cat 60, horse 80 mL/kg). Per the ACVIM Transfusion Medicine Consensus Statement (2021). Cross-match before transfusion and monitor for transfusion reaction. Veterinarian governs.";
  const SP = makeSelect("Species", "tx-sp", TRANSFUSION_SPECIES_OPTS);
  const W = makeNumber("Patient weight", "tx-w", { step: "any", min: "0" });
  const U = makeSelect("Weight unit", "tx-u", [{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]);
  const PC = makeNumber("Current PCV (percent)", "tx-pc", { step: "any", min: "0", max: "70" });
  const PT = makeNumber("Target PCV (percent)", "tx-pt", { step: "any", min: "0", max: "70" });
  const PD = makeNumber("Donor PCV (percent)", "tx-pd", { step: "any", min: "0", max: "70" });
  const R = makeNumber("Infusion rate (mL/kg/hr)", "tx-r", { step: "any", min: "0", value: "5" });
  for (const f of [SP, W, U, PC, PT, PD, R]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = vetTransfusionExample.inputs;
    SP.select.value = ex.species; W.input.value = String(ex.weight); U.select.value = ex.weight_unit;
    PC.input.value = String(ex.pcv_current); PT.input.value = String(ex.pcv_target); PD.input.value = String(ex.pcv_donor);
    R.input.value = String(ex.rate_mL_per_kg_per_hr); update();
  });
  const oVol = makeOutputLine(outputRegion, "Transfusion volume (mL)", "tx-out-vol");
  const oRate = makeOutputLine(outputRegion, "Infusion rate (mL/hr)", "tx-out-rate");
  const oDur = makeOutputLine(outputRegion, "Infusion duration (hr)", "tx-out-dur");
  const oFlag = makeOutputLine(outputRegion, "Flags", "tx-out-flag");
  const update = debounce(() => {
    const r = computeVetTransfusion({
      species: SP.select.value, weight: W.input.value, weight_unit: U.select.value,
      pcv_current: PC.input.value, pcv_target: PT.input.value, pcv_donor: PD.input.value,
      rate_mL_per_kg_per_hr: R.input.value,
    });
    if (r.error) { oVol.textContent = r.error; for (const o of [oRate, oDur, oFlag]) o.textContent = "-"; return; }
    oVol.textContent = fmt(r.volume_mL, 1) + " mL";
    oRate.textContent = fmt(r.infusion_rate_mL_per_hr, 1) + " mL/hr";
    oDur.textContent = fmt(r.duration_hr, 2) + " hr";
    oFlag.textContent = r.flags.length ? r.flags.join(" | ") : "Cross-match and monitor for reaction.";
  }, DEBOUNCE_MS);
  for (const el of [W.input, PC.input, PT.input, PD.input, R.input]) el.addEventListener("input", update);
  for (const sel of [SP.select, U.select]) sel.addEventListener("change", update);
}

// ====================================================================
// U.4 Equine body weight from heart-girth tape
// ====================================================================
//
// Carroll and Huntington (1988) heart-girth + body-length estimate
// (girth and length in inches):
//
//   BW_lb = girth_in^2 * length_in / 330   (horse)
//   BW_lb = girth_in^2 * length_in / 299   (pony)
//
// Hay feeding rate is 1.5 to 2.5 percent of body weight per day. Per
// Carroll C.L. and Huntington P.J., Equine Vet J 20(1) 1988.

// dims: in { girth_in: L, length_in: L, animal: dimensionless }
//        out: { bw_lb: M, bw_kg: M }
// (Girth and length in inches carry length dimension L; body weight M.)
export function computeEquineWeight({ girth_in, length_in, animal }) {
  const g = Number(girth_in);
  const l = Number(length_in);
  if (!Number.isFinite(g) || g <= 0) return { error: "Enter a positive heart girth in inches." };
  if (!Number.isFinite(l) || l <= 0) return { error: "Enter a positive body length in inches." };
  const divisor = String(animal) === "pony" ? 299 : 330;
  const bw_lb = g * g * l / divisor;
  const bw_kg = bw_lb / LB_PER_KG;
  const hay_low_lb = bw_lb * 0.015;
  const hay_high_lb = bw_lb * 0.025;
  const flags = [];
  if (g < 50 || g > 95) flags.push("Heart girth outside 50 to 95 in is beyond the published validation range.");
  return { bw_lb, bw_kg, divisor, hay_low_lb_per_day: hay_low_lb, hay_high_lb_per_day: hay_high_lb, flags };
}

export const equineWeightExample = {
  // Horse, girth 75 in, length 65 in: 75^2 * 65 / 330 = 1107.95 lb (502.56 kg).
  inputs: { girth_in: 75, length_in: 65, animal: "horse" },
  expected: { bw_lb: 1107.95, bw_kg: 502.56 },
};

const EQUINE_ANIMAL_OPTS = [
  { value: "horse", label: "Horse (/ 330)" },
  { value: "pony", label: "Pony (/ 299)" },
];

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderEquineWeight(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("equine-weight");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Carroll C.L. and Huntington P.J., 'Body condition scoring and weight estimation of horses,' Equine Vet J 20(1) 1988. BW_lb = girth_in^2 * length_in / 330 (horse) or / 299 (pony). Hay 1.5 to 2.5 percent of body weight per day; AAEP body-condition score governs nutrition. Veterinarian governs.";
  const G = makeNumber("Heart girth (in)", "eq-g", { step: "any", min: "0" });
  const L = makeNumber("Body length, point of shoulder to point of buttock (in)", "eq-l", { step: "any", min: "0" });
  const A = makeSelect("Animal", "eq-a", EQUINE_ANIMAL_OPTS);
  for (const f of [G, L, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = equineWeightExample.inputs;
    G.input.value = String(ex.girth_in); L.input.value = String(ex.length_in); A.select.value = ex.animal; update();
  });
  const oLb = makeOutputLine(outputRegion, "Estimated body weight (lb)", "eq-out-lb");
  const oKg = makeOutputLine(outputRegion, "Estimated body weight (kg)", "eq-out-kg");
  const oHay = makeOutputLine(outputRegion, "Hay (1.5-2.5% BW/day)", "eq-out-hay");
  const oFlag = makeOutputLine(outputRegion, "Flags", "eq-out-flag");
  const update = debounce(() => {
    const r = computeEquineWeight({ girth_in: G.input.value, length_in: L.input.value, animal: A.select.value });
    if (r.error) { oLb.textContent = r.error; for (const o of [oKg, oHay, oFlag]) o.textContent = "-"; return; }
    oLb.textContent = fmt(r.bw_lb, 1) + " lb";
    oKg.textContent = fmt(r.bw_kg, 1) + " kg";
    oHay.textContent = fmt(r.hay_low_lb_per_day, 1) + " to " + fmt(r.hay_high_lb_per_day, 1) + " lb/day";
    oFlag.textContent = r.flags.length ? r.flags.join(" | ") : "Within the published validation range.";
  }, DEBOUNCE_MS);
  for (const el of [G.input, L.input]) el.addEventListener("input", update);
  A.select.addEventListener("change", update);
}

export const VET_RENDERERS = {
  "vet-weight-based-dose": renderVetDose,
  "vet-maintenance-fluid": renderMaintenanceFluid,
  "vet-energy-requirement": renderEnergyRequirement,
  "vet-bcs-reference": renderBCSReference,
  "vet-pet-age": renderPetAge,
  "vet-gestation": renderGestation,
  "vet-ett-sizing": renderETTSizing,
  "vet-anesthesia-vitals": renderAnesthesiaVitals,
  "vet-asa-classification": renderASAReference,
  "vet-bloodwork-ranges": renderBloodworkRanges,
  "vet-urine-sg": renderUrineSG,
  "vet-target-weight-loss": renderTargetWeightLoss,
  "vet-toxicity": renderToxicity,
  "vet-breed-predispositions": renderBreedPredispositions,
  "vet-plasma-css": renderSteadyStateConcentration,
  "vet-vaccine-schedule": renderVaccineSchedule,
  "vet-heartworm-dose": renderHeartwormDose,
  "vet-crystalloid-plan": renderCrystalloidPlan,
  "vet-cri": renderVetCRI,
  "vet-transfusion": renderVetTransfusion,
  "equine-weight": renderEquineWeight,
};
