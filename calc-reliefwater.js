// calc-reliefwater.js -- Groups M and G: emergency water and sanitation for
// disaster response and recovery.
//
// Band 1 of specs/scope-disaster-response.md (specs v1879-v1887). The catalog
// sized treatment plants, wells, and pumps, and nothing for the first days after
// a flood, a storm, or a main break: the bleach in a drum, the boil at altitude,
// the contact time of a bladder, the sampling that lifts a boil-water notice, a
// solar pump for a field clinic, a first-flush diverter, a lift station without
// power, and the toilets for a jobsite or a crew camp.
//
// Tiles (seven keep group "M", Water and Wastewater Operations; the two
// sanitation-count tiles keep group "G", Cross-Trade Utilities):
//   v1879 emergency-water-bleach-dose   v1884 first-flush-diverter
//   v1880 boil-water-altitude           v1885 lift-station-outage-storage
//   v1881 contact-time-baffling         v1886 osha-toilet-count          (G)
//   v1882 rtcr-coliform-samples         v1887 responder-camp-sanitation  (G)
//   v1883 solar-water-pump-sizing
//
// US sources only: EPA, CDC, the U.S. Standard Atmosphere, NIST, USDA NRCS, the
// Texas Water Development Board, the Ten States Standards, and OSHA. The federal
// tables reproduced here (40 CFR 141.857(b), 29 CFR 1926.51 Table D-1, 29 CFR
// 1910.141 Table J-1, 29 CFR 1928.110, 29 CFR 1910.142) are public domain and
// were read at law.cornell.edu on 2026-09-30. See spec-v1879.md through
// spec-v1887.md.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const value of Object.values(o)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

function _simpleRenderer(spec) {
  const render = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select"
        ? makeSelect(f.label, f.id || f.key, f.options)
        : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field[f.kind === "select" ? "select" : "input"].value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) {
        const el = fields[f.key][f.kind === "select" ? "select" : "input"];
        params[f.key] = f.kind === "select" ? el.value : Number(el.value) || 0;
      }
      const result = spec.compute(params);
      if (result.error) {
        for (const out of Object.values(outs)) out.textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }
    const debounced = debounce(update, DEBOUNCE_MS);
    for (const f of spec.fields) {
      fields[f.key][f.kind === "select" ? "select" : "input"].addEventListener("input", debounced);
    }
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key][f.kind === "select" ? "select" : "input"].value = String(spec.example[f.key]);
      }
      update();
    });
  };
  render.schema = {
    inputs: spec.fields.map((f) => ({
      key: f.key, label: f.label, kind: f.kind || "number",
      options: f.options || null, default: f.default ?? null, attrs: f.attrs ?? null,
    })),
    outputs: spec.outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation,
    scope: spec.scope ?? null,
  };
  return render;
}

export const RELIEFWATER_RENDERERS = {};

// Exact US customary conversions: a US gallon is 231 cubic inches, a cubic foot
// 1,728; a gallon is 3.785411784 L; a teaspoon is 1/768 gallon; a foot is
// 0.3048 m exactly; a psi is 6.894757293168361 kPa (0.45359237 kg x
// 9.80665 m/s^2 / 0.0254^2 m^2).
const _GAL_PER_FT3 = 1728 / 231;
const _L_PER_GAL = 3.785411784;
const _ML_PER_TSP = _L_PER_GAL * 1000 / 768;
const _M_PER_FT = 0.3048;
const _KPA_PER_PSI = 0.45359237 * 9.80665 / (0.0254 * 0.0254) / 1000;
const _W_PER_HP = 745.69987158227022;

// ===================== spec-v1879: emergency drinking water bleach dose =====================

// dims: in { water_volume: L^3, volume_unit: dimensionless, bleach_strength_pct: dimensionless, water_condition: dimensionless, drop_volume_ml: L^3 } out: { water_gal: L^3, water_l: L^3, drops_per_gal: L^-3, base_drops: dimensionless, base_tsp: L^3, base_ml: L^3, base_dose_mg_l: M L^-3, double_drops: dimensionless, double_tsp: L^3, double_ml: L^3, double_dose_mg_l: M L^-3, applied_drops: dimensionless, applied_tsp: L^3, applied_ml: L^3, applied_dose_mg_l: M L^-3, stand_min: T, retest_min: T, table_counted_dose_mg_l: M L^-3, table_measured_dose_mg_l: M L^-3, table_measured_ratio: dimensionless }
export function computeEmergencyWaterBleachDose({ water_volume = 0, volume_unit = "gal", bleach_strength_pct = 8.25, water_condition = "clear", drop_volume_ml = _ML_PER_TSP / 96 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(water_volume > 0)) return { error: "Water volume must be positive." };
  if (!(bleach_strength_pct > 0)) return { error: "Bleach strength must be positive." };
  if (bleach_strength_pct > 15) return { error: "Bleach strength above 15% is not a household or commercial liquid bleach; check the label." };
  if (!(drop_volume_ml > 0)) return { error: "Drop volume must be positive." };
  const toGal = { gal: 1, qt: 0.25, L: 1 / _L_PER_GAL };
  if (!(volume_unit in toGal)) return { error: "Volume unit must be gallons, quarts, or litres." };
  if (!["clear", "cloudy"].includes(water_condition)) return { error: "Water condition must be clear or cloudy." };
  const water_gal = water_volume * toGal[volume_unit];
  const water_l = water_gal * _L_PER_GAL;
  // The EPA table's per-gallon rates: 8 drops of 6% and 6 drops of 8.25%. Any
  // other strength is scaled from the 6% row to the same chlorine mass.
  const drops_per_gal = bleach_strength_pct === 8.25 ? 6 : 8 * 6 / bleach_strength_pct;
  const doseOf = (ml) => ml * bleach_strength_pct * 10 / water_l;
  const base_drops = drops_per_gal * water_gal;
  const base_ml = base_drops * drop_volume_ml;
  const base_tsp = base_ml / _ML_PER_TSP;
  const base_dose_mg_l = doseOf(base_ml);
  const double_drops = 2 * base_drops;
  const double_ml = 2 * base_ml;
  const double_tsp = 2 * base_tsp;
  const double_dose_mg_l = 2 * base_dose_mg_l;
  const cloudy = water_condition === "cloudy";
  const applied_drops = cloudy ? double_drops : base_drops;
  const applied_ml = cloudy ? double_ml : base_ml;
  const applied_tsp = cloudy ? double_tsp : base_tsp;
  const applied_dose_mg_l = cloudy ? double_dose_mg_l : base_dose_mg_l;
  // The table's one inconsistent row: 2 gallons of 6% printed as "16 drops
  // (1/4 tsp)". Counted at 1/96 tsp per drop it is 1/6 tsp.
  const two_gal_l = 2 * _L_PER_GAL;
  const table_counted_dose_mg_l = 16 * (_ML_PER_TSP / 96) * 6 * 10 / two_gal_l;
  const table_measured_dose_mg_l = 0.25 * _ML_PER_TSP * 6 * 10 / two_gal_l;
  const table_measured_ratio = table_measured_dose_mg_l / table_counted_dose_mg_l;
  return {
    water_gal, water_l, drops_per_gal, base_drops, base_tsp, base_ml, base_dose_mg_l,
    double_drops, double_tsp, double_ml, double_dose_mg_l,
    applied_drops, applied_tsp, applied_ml, applied_dose_mg_l,
    bleach_strength_pct, water_condition,
    rate_basis: bleach_strength_pct === 6 || bleach_strength_pct === 8.25 ? "the EPA table rate for this strength" : "scaled from the EPA 6% row (8 drops per gallon) to the same chlorine mass",
    stand_min: 30, retest_min: 15,
    table_counted_dose_mg_l, table_measured_dose_mg_l, table_measured_ratio,
    table_note: "The EPA table prints 2 gallons of 6% as \"16 drops (1/4 tsp)\"; at the 1/96 tsp drop every other row implies, 16 drops is 1/6 tsp. Measuring the printed 1/4 tsp doses 1.5 times the counted rate -- about 9.8 mg/L, the same as Ready.gov's 1/8 tsp per gallon -- against about 6.5 mg/L counted. Both are within what the procedure tolerates; the smell test governs either way.",
    note: "Settle cloudy water and filter it through a clean cloth or coffee filter first; the doubled dose covers the chlorine demand that filtering does not remove, and it is applied after the physical step, not instead of it. Use plain unscented liquid bleach: scented, splash-less, and color-safe products are excluded, and an old bottle delivers less than its label. Stir, stand 30 minutes, and check for a slight chlorine odor; without one, dose again and stand 15 minutes more. The mg/L shown is a dose from the nominal strength read as grams per 100 mL, accurate to roughly 10%, not a measured residual -- a free-chlorine test kit reading supersedes it. Bleach does not make water contaminated with fuel, solvents, pesticides, or other chemicals safe at any dose, does not reliably inactivate Cryptosporidium at these doses, and does not replace boiling where a boil-water notice is in force. The EPA and CDC emergency disinfection guidance, the local health department, and the water utility's public notice govern.",
  };
}

export const emergencyWaterBleachDoseExample = { inputs: { water_volume: 55, volume_unit: "gal", bleach_strength_pct: 8.25, water_condition: "cloudy", drop_volume_ml: _ML_PER_TSP / 96 } };
RELIEFWATER_RENDERERS["emergency-water-bleach-dose"] = _simpleRenderer({
  citation: "Citation: EPA \"Emergency Disinfection of Drinking Water\" bleach table (8 drops of 6% or 6 drops of 8.25% bleach per gallon, doubled for cloudy, colored, or very cold water after settling and filtering; stand 30 minutes, check the odor, redose and stand 15 minutes) and CDC \"How to Make Water Safe in an Emergency\"; 1 drop = 1/96 tsp as the table's rows imply; dose mg/L = mL x strength% x 10 / litres. The local health department and the utility's public notice govern.",
  example: emergencyWaterBleachDoseExample.inputs,
  fields: [
    { key: "water_volume", label: "Water volume", default: 55 },
    { key: "volume_unit", label: "Volume unit", kind: "select", options: [{ value: "gal", label: "Gallons" }, { value: "qt", label: "Quarts" }, { value: "L", label: "Litres" }], default: "gal" },
    { key: "bleach_strength_pct", label: "Bleach strength (% sodium hypochlorite, 6 or 8.25 on most labels)", default: 8.25, attrs: { step: "any", min: "0", max: "15" } },
    { key: "water_condition", label: "Water condition", kind: "select", options: [{ value: "clear", label: "Clear" }, { value: "cloudy", label: "Cloudy, colored, or very cold (settle and filter first)" }], default: "clear" },
    { key: "drop_volume_ml", label: "Drop volume (mL; the table's 1/96 tsp is 0.0513)", default: _ML_PER_TSP / 96 },
  ],
  outputs: [
    { key: "applied", id: "ewb-out-a", label: "Bleach to add", value: (r) => fmt(r.applied_drops, 0) + " drops = " + fmt(r.applied_tsp, 2) + " tsp = " + fmt(r.applied_ml, 1) + " mL (" + (r.water_condition === "cloudy" ? "doubled" : "base rate") + ")" },
    { key: "dose", id: "ewb-out-d", label: "Dose delivered", unit: "mg/L", value: (r) => fmt(r.applied_dose_mg_l, 1) + " mg/L (a dose, not a residual)" },
    { key: "base", id: "ewb-out-b", label: "Base rate", value: (r) => fmt(r.base_drops, 0) + " drops, " + fmt(r.base_tsp, 2) + " tsp, " + fmt(r.base_ml, 1) + " mL -> " + fmt(r.base_dose_mg_l, 1) + " mg/L; " + fmt(r.drops_per_gal, 2) + " drops per gallon, " + r.rate_basis },
    { key: "double", id: "ewb-out-x", label: "Doubled rate", value: (r) => fmt(r.double_drops, 0) + " drops, " + fmt(r.double_tsp, 2) + " tsp, " + fmt(r.double_ml, 1) + " mL -> " + fmt(r.double_dose_mg_l, 1) + " mg/L" },
    { key: "wait", id: "ewb-out-w", label: "Wait and retest", value: (r) => "stir, stand " + r.stand_min + " min, check for a slight chlorine odor; none -> dose again and stand " + r.retest_min + " min more" },
    { key: "table", id: "ewb-out-t", label: "Where the EPA table disagrees with itself", value: (r) => "6%, 2 gal: counted " + fmt(r.table_counted_dose_mg_l, 1) + " mg/L, measured 1/4 tsp " + fmt(r.table_measured_dose_mg_l, 1) + " mg/L (" + fmt(r.table_measured_ratio, 2) + " x). " + r.table_note },
    { key: "note", id: "ewb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEmergencyWaterBleachDose,
});

// ===================== spec-v1880: boil-water time and boiling point at altitude =====================

// dims: in { elevation: L, elevation_unit: dimensionless } out: { elevation_ft: L, pressure_kpa: M L^-1 T^-2, pressure_psia: M L^-1 T^-2, boiling_point_k: T, boiling_point_c: T, boiling_point_f: T, drop_from_sea_level_f: T, epa_boil_min: T, cdc_boil_min: T, recommended_boil_min: T }
export function computeBoilWaterAltitude({ elevation = 0, elevation_unit = "ft" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!["ft", "m"].includes(elevation_unit)) return { error: "Elevation unit must be feet or metres." };
  const elevation_ft = elevation_unit === "m" ? elevation / _M_PER_FT : elevation;
  if (elevation_ft < -1500 || elevation_ft > 20000) return { error: "Elevation must be between -1,500 ft and 20,000 ft (the standard-atmosphere and Antoine fit range)." };
  // U.S. Standard Atmosphere (1976) troposphere, and NIST Antoine constants for
  // water: log10(P bar) = 5.08354 - 1663.125 / (T - 45.622).
  const pressureAt = (h) => 101.325 * Math.pow(1 - 6.87535e-6 * h, 5.25588);
  const boilK = (kpa) => 1663.125 / (5.08354 - Math.log10(kpa / 100)) + 45.622;
  const pressure_kpa = pressureAt(elevation_ft);
  const pressure_psia = pressure_kpa / _KPA_PER_PSI;
  const boiling_point_k = boilK(pressure_kpa);
  const boiling_point_c = boiling_point_k - 273.15;
  const boiling_point_f = boiling_point_c * 9 / 5 + 32;
  const sea_level_f = (boilK(101.325) - 273.15) * 9 / 5 + 32;
  const drop_from_sea_level_f = sea_level_f - boiling_point_f;
  const epa_boil_min = elevation_ft > 5000 ? 3 : 1;
  const cdc_boil_min = elevation_ft > 6500 ? 3 : 1;
  const recommended_boil_min = Math.max(epa_boil_min, cdc_boil_min);
  const agencies_disagree = epa_boil_min !== cdc_boil_min;
  return {
    elevation_ft, pressure_kpa, pressure_psia, boiling_point_k, boiling_point_c, boiling_point_f,
    drop_from_sea_level_f, epa_boil_min, cdc_boil_min, recommended_boil_min, agencies_disagree,
    split_verdict: agencies_disagree
      ? "THE AGENCIES DISAGREE here: the EPA's 3-minute rule starts above 5,000 ft and the CDC's above 6,500 ft. Boil 3 minutes -- the longer boil costs fuel and nothing else."
      : "the EPA and CDC agree at this elevation",
    note: "Boiling works by time at temperature, and altitude lowers the temperature: the boiling point falls roughly 1.8 degF per thousand feet near sea level, to under 194 degF at 10,000 ft. Inactivation is still fast at those temperatures, which is why the extra time is two minutes rather than twenty, but the guidance lengthens the boil to restore the margin. The EPA lengthens it to 3 minutes above 5,000 ft and the CDC above 6,500 ft; between the two the tile recommends the longer boil. The boiling point is for a standard atmosphere and plain water; weather moves it by a degree or so, and a low-pressure storm lowers it further. Boiling does not remove fuel, chemicals, or toxins and can concentrate them, and it does not decide when a boil-water notice may be lifted, which follows the utility's sampling and the primacy agency's decision. The EPA and CDC guidance, the local health department, and the utility's public notice govern.",
  };
}

export const boilWaterAltitudeExample = { inputs: { elevation: 6000, elevation_unit: "ft" } };
RELIEFWATER_RENDERERS["boil-water-altitude"] = _simpleRenderer({
  citation: "Citation: EPA \"Emergency Disinfection of Drinking Water\" (rolling boil 1 minute, 3 minutes above 5,000 ft) and CDC \"How to Make Water Safe in an Emergency\" (3 minutes above 6,500 ft); pressure from the U.S. Standard Atmosphere (1976), P = 101.325 x (1 - 6.87535e-6 h)^5.25588 kPa; boiling point from the NIST Chemistry WebBook Antoine constants for water. The local health department and the utility's boil-water notice govern.",
  example: boilWaterAltitudeExample.inputs,
  fields: [
    { key: "elevation", label: "Site elevation", default: 6000, attrs: { step: "any", min: "-1500" } },
    { key: "elevation_unit", label: "Elevation unit", kind: "select", options: [{ value: "ft", label: "Feet" }, { value: "m", label: "Metres" }], default: "ft" },
  ],
  outputs: [
    { key: "rec", id: "bwa-out-r", label: "Recommended rolling boil", unit: "min", value: (r) => r.recommended_boil_min + " min (EPA " + r.epa_boil_min + " min, CDC " + r.cdc_boil_min + " min)" },
    { key: "split", id: "bwa-out-s", label: "EPA and CDC", value: (r) => r.split_verdict },
    { key: "bp", id: "bwa-out-b", label: "Boiling point", value: (r) => fmt(r.boiling_point_f, 1) + " degF / " + fmt(r.boiling_point_c, 1) + " degC (" + fmt(r.drop_from_sea_level_f, 1) + " degF below sea level)" },
    { key: "p", id: "bwa-out-p", label: "Standard air pressure", value: (r) => fmt(r.pressure_kpa, 2) + " kPa / " + fmt(r.pressure_psia, 2) + " psia at " + fmt(r.elevation_ft, 0) + " ft" },
    { key: "note", id: "bwa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBoilWaterAltitude,
});

// ===================== spec-v1881: disinfection contact time from a baffling factor =====================

const _BAFFLING = { unbaffled: 0.1, poor: 0.3, average: 0.5, superior: 0.7, perfect: 1.0 };

// dims: in { vessel_shape: dimensionless, volume_gal: L^3, diameter_ft: L, length_ft: L, width_ft: L, min_depth_ft: L, peak_flow_gpm: L^3 T^-1, baffling_condition: dimensionless, custom_baffling_factor: dimensionless, residual_mg_l: M L^-3 } out: { vessel_volume_gal: L^3, tdt_min: T, baffling_factor: dimensionless, t10_min: T, t_unbaffled_min: T, t_poor_min: T, t_average_min: T, t_superior_min: T, t_perfect_min: T, ct_mg_min_l: M L^-3 T }
export function computeContactTimeBaffling({ vessel_shape = "volume", volume_gal = 0, diameter_ft = 0, length_ft = 0, width_ft = 0, min_depth_ft = 0, peak_flow_gpm = 0, baffling_condition = "unbaffled", custom_baffling_factor = 0, residual_mg_l = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let vessel_volume_gal;
  if (vessel_shape === "volume") {
    if (!(volume_gal > 0)) return { error: "Volume at the minimum operating level must be positive." };
    vessel_volume_gal = volume_gal;
  } else if (vessel_shape === "round") {
    if (!(diameter_ft > 0) || !(min_depth_ft > 0)) return { error: "Diameter and minimum operating depth must be positive." };
    vessel_volume_gal = Math.PI / 4 * diameter_ft * diameter_ft * min_depth_ft * _GAL_PER_FT3;
  } else if (vessel_shape === "rectangular") {
    if (!(length_ft > 0) || !(width_ft > 0) || !(min_depth_ft > 0)) return { error: "Length, width, and minimum operating depth must be positive." };
    vessel_volume_gal = length_ft * width_ft * min_depth_ft * _GAL_PER_FT3;
  } else {
    return { error: "Vessel shape must be an entered volume, round, or rectangular." };
  }
  if (!(peak_flow_gpm > 0)) return { error: "Peak hourly flow must be positive." };
  let baffling_factor;
  if (baffling_condition === "custom") baffling_factor = custom_baffling_factor;
  else if (baffling_condition in _BAFFLING) baffling_factor = _BAFFLING[baffling_condition];
  else return { error: "Baffling condition must be unbaffled, poor, average, superior, perfect, or custom." };
  if (!(baffling_factor >= 0.1 && baffling_factor <= 1.0)) return { error: "Baffling factor must be between 0.1 and 1.0." };
  if (!(residual_mg_l >= 0)) return { error: "Outlet residual cannot be negative." };
  const tdt_min = vessel_volume_gal / peak_flow_gpm;
  const t10_min = tdt_min * baffling_factor;
  const has_residual = residual_mg_l > 0;
  const ct_mg_min_l = residual_mg_l * t10_min;
  return {
    vessel_volume_gal, tdt_min, baffling_factor, t10_min,
    t_unbaffled_min: tdt_min * 0.1, t_poor_min: tdt_min * 0.3, t_average_min: tdt_min * 0.5,
    t_superior_min: tdt_min * 0.7, t_perfect_min: tdt_min,
    residual_mg_l, has_residual, ct_mg_min_l,
    note: "Contact time T (t10) is the time by which only 10% of the water has passed through, and a vessel reaches it far sooner than its volume suggests: water entering an unbaffled tank short-circuits to the outlet. The EPA baffling factor turns volume over flow into the defensible number, and a pillow bladder, frac tank, or tote piped with one inlet and one outlet is unbaffled or poorly baffled, so dividing its volume by the pump rate overstates contact time by three to ten times. A length of pipeline is close to plug flow and earns 1.0. Use the volume at the MINIMUM operating level and the PEAK hourly flow -- the conservative case the guidance requires. The factor is a judgment of the vessel's hydraulics; a tracer study supersedes it, and the primacy agency may require one or assign a factor. The residual is the outlet value. The required CT for a log inactivation is computed in disinfection-ct. EPA 815-R-20-003, the primacy agency, and the operator of record govern.",
  };
}

export const contactTimeBafflingExample = { inputs: { vessel_shape: "round", volume_gal: 0, diameter_ft: 40, length_ft: 0, width_ft: 0, min_depth_ft: 30, peak_flow_gpm: 347, baffling_condition: "unbaffled", custom_baffling_factor: 0, residual_mg_l: 0 } };
RELIEFWATER_RENDERERS["contact-time-baffling"] = _simpleRenderer({
  citation: "Citation: EPA 815-R-20-003, Disinfection Profiling and Benchmarking Technical Guidance Manual (June 2020), Section 4.4, Equation 4-3 (T = TDT x BF) and Table 4-2 baffling factors (unbaffled 0.1, poor 0.3, average 0.5, superior 0.7, perfect 1.0); TDT = volume at minimum operating level / peak hourly flow. The primacy agency's tracer-study or baffling-factor determination governs.",
  example: contactTimeBafflingExample.inputs,
  fields: [
    { key: "vessel_shape", label: "Vessel volume from", kind: "select", options: [{ value: "volume", label: "Entered volume" }, { value: "round", label: "Round tank dimensions" }, { value: "rectangular", label: "Rectangular tank dimensions" }], default: "volume" },
    { key: "volume_gal", label: "Volume at minimum operating level (gal)" },
    { key: "diameter_ft", label: "Round tank inside diameter (ft)" },
    { key: "length_ft", label: "Rectangular tank length (ft)" },
    { key: "width_ft", label: "Rectangular tank width (ft)" },
    { key: "min_depth_ft", label: "Minimum operating depth (ft)" },
    { key: "peak_flow_gpm", label: "Peak hourly flow (gpm)" },
    { key: "baffling_condition", label: "Baffling condition (EPA Table 4-2)", kind: "select", options: [{ value: "unbaffled", label: "Unbaffled, mixed flow (0.1)" }, { value: "poor", label: "Poor: single inlet/outlet, no baffles (0.3)" }, { value: "average", label: "Average: some intra-basin baffles (0.5)" }, { value: "superior", label: "Superior: serpentine baffling (0.7)" }, { value: "perfect", label: "Perfect: plug flow, pipeline (1.0)" }, { value: "custom", label: "Entered factor (tracer study or state)" }], default: "unbaffled" },
    { key: "custom_baffling_factor", label: "Entered baffling factor (0.1-1.0)", attrs: { step: "any", min: "0.1", max: "1" } },
    { key: "residual_mg_l", label: "Outlet free-chlorine residual (mg/L, optional)" },
  ],
  outputs: [
    { key: "t", id: "ctb-out-t", label: "Contact time T (t10)", unit: "min", value: (r) => fmt(r.t10_min, 1) + " min at BF " + fmt(r.baffling_factor, 2) },
    { key: "tdt", id: "ctb-out-d", label: "Theoretical detention time (volume / peak flow)", value: (r) => fmt(r.tdt_min, 1) + " min from " + fmt(r.vessel_volume_gal, 0) + " gal" },
    { key: "all", id: "ctb-out-a", label: "T at each EPA factor", value: (r) => "unbaffled " + fmt(r.t_unbaffled_min, 1) + ", poor " + fmt(r.t_poor_min, 1) + ", average " + fmt(r.t_average_min, 1) + ", superior " + fmt(r.t_superior_min, 1) + ", perfect " + fmt(r.t_perfect_min, 1) + " min" },
    { key: "ct", id: "ctb-out-c", label: "CT", value: (r) => r.has_residual ? fmt(r.ct_mg_min_l, 1) + " mg-min/L at " + fmt(r.residual_mg_l, 2) + " mg/L -- compare in disinfection-ct" : "enter the outlet residual for CT" },
    { key: "note", id: "ctb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeContactTimeBaffling,
});

// ===================== spec-v1882: total coliform routine and repeat sample count =====================

// 40 CFR 141.857(b), all 33 rows: [upper population bound, samples per month].
// Read at law.cornell.edu/cfr/text/40/141.857 on 2026-09-30.
const _RTCR_TABLE = [
  [2500, 2], [3300, 3], [4100, 4], [4900, 5], [5800, 6], [6700, 7], [7600, 8], [8500, 9],
  [12900, 10], [17200, 15], [21500, 20], [25000, 25], [33000, 30], [41000, 40], [50000, 50],
  [59000, 60], [70000, 70], [83000, 80], [96000, 90], [130000, 100], [220000, 120],
  [320000, 150], [450000, 180], [600000, 210], [780000, 240], [970000, 270], [1230000, 300],
  [1520000, 330], [1850000, 360], [2270000, 390], [3020000, 420], [3960000, 450], [Infinity, 480],
];

// dims: in { population_served: dimensionless, tc_positive_count: dimensionless, positive_repeat_count: dimensionless, routine_samples_taken: dimensionless } out: { routine_samples_per_month: dimensionless, routine_samples_counted: dimensionless, repeat_samples_required: dimensionless, repeat_deadline_hr: T, ecoli_analyses_required: dimensionless, total_samples: dimensionless, total_positives: dimensionless, tc_positive_pct: dimensionless, tc_positive_pct_routine: dimensionless }
export function computeRtcrColiformSamples({ population_served = 0, tc_positive_count = 0, positive_repeat_count = 0, routine_samples_taken = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(population_served > 0) || !Number.isInteger(population_served)) return { error: "Population served must be a positive whole number." };
  if (!(tc_positive_count >= 0) || !Number.isInteger(tc_positive_count)) return { error: "Total-coliform-positive routine samples cannot be negative and must be a whole number." };
  if (!(positive_repeat_count >= 0) || !Number.isInteger(positive_repeat_count)) return { error: "Positive repeat samples cannot be negative and must be a whole number." };
  if (!(routine_samples_taken >= 0) || !Number.isInteger(routine_samples_taken)) return { error: "Routine samples taken cannot be negative and must be a whole number (0 means the required number)." };
  const applies = population_served > 1000;
  const row = applies ? _RTCR_TABLE.find(([upper]) => population_served <= upper) : null;
  const routine_samples_per_month = applies ? row[1] : 0;
  const routine_samples_counted = applies ? (routine_samples_taken > 0 ? routine_samples_taken : routine_samples_per_month) : 0;
  if (applies && tc_positive_count > routine_samples_counted) return { error: "More positive samples than routine samples taken." };
  const repeat_samples_required = applies ? 3 * tc_positive_count : 0;
  if (applies && positive_repeat_count > repeat_samples_required) return { error: "More positive repeat samples than repeat samples required." };
  const repeat_deadline_hr = 24;
  const ecoli_analyses_required = applies ? tc_positive_count + positive_repeat_count : 0;
  const total_samples = routine_samples_counted + repeat_samples_required;
  const total_positives = applies ? tc_positive_count + positive_repeat_count : 0;
  const tc_positive_pct = total_samples > 0 ? 100 * total_positives / total_samples : 0;
  const tc_positive_pct_routine = routine_samples_counted > 0 ? 100 * tc_positive_count / routine_samples_counted : 0;
  const percent_basis = applies && routine_samples_counted >= 40;
  const level1_triggered = applies && (percent_basis ? tc_positive_pct > 5.0 : total_positives >= 2);
  const level1_basis = !applies ? "not evaluated -- 1,000 or fewer served"
    : percent_basis ? "percentage rule, 141.859(a)(1)(i): 40 or more samples a month, more than 5.0% TC-positive"
      : "count rule, 141.859(a)(1)(ii): fewer than 40 samples a month, 2 or more TC-positive";
  return {
    applies, population_served, routine_samples_per_month, routine_samples_counted,
    repeat_samples_required, repeat_deadline_hr, ecoli_analyses_required,
    total_samples, total_positives, tc_positive_pct, tc_positive_pct_routine,
    percent_basis, level1_triggered, level1_basis,
    // 141.858(a)(3): a TC-positive repeat means ANOTHER set of repeats, and the
    // sets continue until one is clean or a 141.859 trigger is exceeded.
    additional_repeat_set_required: applies && positive_repeat_count > 0 && !level1_triggered,
    routine_shortfall: applies && routine_samples_counted < routine_samples_per_month - 1e-9 * Math.abs(routine_samples_per_month),
    level1_verdict: !applies ? "not evaluated" : level1_triggered ? "LEVEL 1 ASSESSMENT TRIGGERED" : "no Level 1 trigger on these results",
    routing: applies ? "" : "A system serving 1,000 or fewer people samples under 40 CFR 141.854 (at least 1 routine sample per month for community systems, quarterly options for some non-community systems) and the state's schedule, not the 141.857(b) table.",
    note: "The routine count is a population lookup in 40 CFR 141.857(b), which is reproduced because it is public-domain federal regulation and its bands are regulatory choices, not a curve. Every total-coliform-positive routine sample needs at least 3 repeat samples, collected on the same day within 24 hours of notification (141.858(a)), and every TC-positive sample is analyzed for E. coli (141.858(b)). A system taking 40 or more samples a month is judged on the percentage of TC-positive samples, routine and repeat together; a smaller one is judged on a count of 2. Failing to collect every required repeat is a Level 1 trigger on its own (141.859(a)(1)(iii)), regardless of results -- the part most easily lost after a disaster. States with primacy may be more stringent, may extend the 24-hour deadline for logistical reasons, and set their own return-to-service and boil-water-notice requirements. It does not address systems serving 1,000 or fewer (141.854), seasonal start-up, repeat sample siting, the E. coli MCL (141.860), or the conduct of an assessment. 40 CFR 141 Subpart Y, the state primacy agency, and the operator of record govern.",
  };
}

export const rtcrColiformSamplesExample = { inputs: { population_served: 15000, tc_positive_count: 2, positive_repeat_count: 0, routine_samples_taken: 0 } };
RELIEFWATER_RENDERERS["rtcr-coliform-samples"] = _simpleRenderer({
  citation: "Citation: 40 CFR 141.857(b) routine monitoring frequency by population (33 bands, 1,001-2,500 -> 2 through 3,960,001 or more -> 480; federal, public domain, reproduced), 141.858(a)-(b) repeat monitoring and E. coli analysis, and 141.859(a)(1) Level 1 treatment technique triggers. The state primacy agency governs.",
  example: rtcrColiformSamplesExample.inputs,
  fields: [
    { key: "population_served", label: "Population served", attrs: { step: "1", min: "1" } },
    { key: "tc_positive_count", label: "Total-coliform-positive routine samples this month", attrs: { step: "1", min: "0" } },
    { key: "positive_repeat_count", label: "Positive repeat samples (optional)", attrs: { step: "1", min: "0" } },
    { key: "routine_samples_taken", label: "Routine samples actually taken (0 = the required number)", attrs: { step: "1", min: "0" } },
  ],
  outputs: [
    { key: "routine", id: "rtc-out-r", label: "Routine samples per month", value: (r) => r.applies ? r.routine_samples_per_month + " per 40 CFR 141.857(b)" + (r.routine_shortfall ? " -- ONLY " + r.routine_samples_counted + " TAKEN, a monitoring violation" : "") : r.routing },
    { key: "repeat", id: "rtc-out-p", label: "Repeat samples", value: (r) => r.applies ? r.repeat_samples_required + " repeat samples, same day, within " + r.repeat_deadline_hr + " h of notification" + (r.additional_repeat_set_required ? " -- AND, because a repeat was positive and no assessment is triggered, another set of 3 for each repeat set that had a positive, continuing until one set is clean (141.858(a)(3))" : "") : "-" },
    { key: "ecoli", id: "rtc-out-e", label: "E. coli analyses", value: (r) => r.applies ? r.ecoli_analyses_required + " (every TC-positive sample)" : "-" },
    { key: "pct", id: "rtc-out-c", label: "TC-positive share", value: (r) => r.applies ? fmt(r.total_positives, 0) + " of " + fmt(r.total_samples, 0) + " samples = " + fmt(r.tc_positive_pct, 1) + "% (routine only " + fmt(r.tc_positive_pct_routine, 1) + "%)" : "-" },
    { key: "level1", id: "rtc-out-l", label: "Level 1 trigger", value: (r) => r.level1_verdict + " -- " + r.level1_basis + "; any required repeat not taken also triggers" },
    { key: "note", id: "rtc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRtcrColiformSamples,
});

// ===================== spec-v1883: solar water pump array sizing =====================

// dims: in { daily_demand_gpd: L^3 T^-1, peak_sun_hours: T, tdh_ft: L, pump_efficiency: dimensionless, panel_derate: dimensionless, storage_days: T } out: { design_flow_gpm: L^3 T^-1, hydraulic_w: M L^2 T^-3, pump_input_w: M L^2 T^-3, array_min_w: M L^2 T^-3, workload_m4: L^4, storage_gal: L^3 }
export function computeSolarWaterPumpSizing({ daily_demand_gpd = 0, peak_sun_hours = 0, tdh_ft = 0, pump_efficiency = 0, panel_derate = 0.85, storage_days = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(daily_demand_gpd > 0)) return { error: "Daily water demand must be positive." };
  if (!(peak_sun_hours > 0)) return { error: "Peak sun hours must be positive." };
  if (peak_sun_hours > 24) return { error: "Peak sun hours cannot exceed 24." };
  if (!(tdh_ft > 0)) return { error: "Total dynamic head must be positive." };
  if (!(pump_efficiency > 0)) return { error: "Pump efficiency must be positive." };
  if (pump_efficiency > 1) return { error: "Pump efficiency cannot exceed 1.0 (enter a fraction, e.g. 0.60)." };
  if (!(panel_derate > 0)) return { error: "Panel derate must be positive." };
  if (panel_derate > 1) return { error: "Panel derate cannot exceed 1.0." };
  if (!(storage_days >= 0)) return { error: "Storage days cannot be negative." };
  // NRCS Eq. 7.1, 7.3, 7.5, 5.1. The Eq. 7.3 factor is 8.34 lb/gal / 33,000
  // ft-lb/min per hp x watts per hp = 0.18846 W per gpm-ft (printed 0.1885).
  const design_flow_gpm = daily_demand_gpd / (peak_sun_hours * 60);
  const hydraulic_w = 8.34 / 33000 * _W_PER_HP * tdh_ft * design_flow_gpm;
  const pump_input_w = hydraulic_w / pump_efficiency;
  const array_min_w = pump_input_w / panel_derate;
  const workload_m4 = tdh_ft * _M_PER_FT * daily_demand_gpd * _L_PER_GAL / 1000;
  const storage_gal = storage_days * daily_demand_gpd;
  const round_the_clock_gpm = daily_demand_gpd / 1440;
  const suitability = workload_m4 < 1500 ? "well suited to solar (hydraulic workload under 1,500 m^4)"
    : workload_m4 <= 2000 ? "marginal (1,500-2,000 m^4) -- compare a generator or grid connection"
      : "generally NOT suited to solar (over 2,000 m^4) -- a generator or grid connection is usually cheaper";
  return {
    design_flow_gpm, round_the_clock_gpm, hydraulic_w, pump_input_w, array_min_w,
    workload_m4, suitability, storage_gal, storage_days,
    note: "A solar pump compresses a day's water into the sunny hours, so its design flow is the daily demand divided by the peak sun hours, not by twenty-four, and the design month is the worst one -- the lowest peak sun hours in the season the water is needed, from NREL solar resource data for the site and tilt. The hydraulic workload is the NRCS screen for whether solar is the right tool at all. Storage is part of the design: the array makes water only while the sun is up, so a tank carries the night and overcast days; three days is the North Dakota NRCS requirement, used here as the editable default, and a tank is usually cheaper than batteries. This is a preliminary size assuming a direct-drive system with a flat pump efficiency; the pump's performance curve sets the actual operating point and efficiency and governs. It does not compute total dynamic head, well drawdown, wiring, controllers, or batteries. The NRCS technical note, the pump and module manufacturers' data, and the AHJ govern.",
  };
}

export const solarWaterPumpSizingExample = { inputs: { daily_demand_gpd: 1000, peak_sun_hours: 2.52, tdh_ft: 150, pump_efficiency: 0.6, panel_derate: 0.85, storage_days: 3 } };
RELIEFWATER_RENDERERS["solar-water-pump-sizing"] = _simpleRenderer({
  citation: "Citation: USDA NRCS North Dakota Technical Note No. 1, Design of Small Photovoltaic (PV) Solar-Powered Water Pump Systems (July 2017), Eq. 7.1 (Q = daily demand / peak sun hours), Eq. 7.3 (P = 0.1885 x TDH x Q / efficiency), Eq. 7.5 (array = P / derate), and Eq. 5.1 (hydraulic workload, m^4); 3 days of storage per the North Dakota NRCS requirement. The pump manufacturer's performance curve governs.",
  example: solarWaterPumpSizingExample.inputs,
  fields: [
    { key: "daily_demand_gpd", label: "Daily water demand (gal/day)" },
    { key: "peak_sun_hours", label: "Design-month peak sun hours (h/day)" },
    { key: "tdh_ft", label: "Total dynamic head (ft)" },
    { key: "pump_efficiency", label: "Pump (wire-to-water) efficiency (fraction)", attrs: { step: "any", min: "0", max: "1" } },
    { key: "panel_derate", label: "Panel derate (fraction, typically 0.85)", default: 0.85, attrs: { step: "any", min: "0", max: "1" } },
    { key: "storage_days", label: "Storage (days of demand)", default: 3 },
  ],
  outputs: [
    { key: "array", id: "swp-out-a", label: "Minimum array rating", unit: "W", value: (r) => fmt(r.array_min_w, 1) + " W" },
    { key: "flow", id: "swp-out-q", label: "Design flow", unit: "gpm", value: (r) => fmt(r.design_flow_gpm, 2) + " gpm (around the clock it would be " + fmt(r.round_the_clock_gpm, 2) + " gpm)" },
    { key: "pin", id: "swp-out-p", label: "Pump input power", unit: "W", value: (r) => fmt(r.pump_input_w, 1) + " W (" + fmt(r.hydraulic_w, 1) + " W delivered to the water)" },
    { key: "work", id: "swp-out-w", label: "Hydraulic workload", value: (r) => fmt(r.workload_m4, 1) + " m^4 -- " + r.suitability },
    { key: "store", id: "swp-out-s", label: "Storage tank", unit: "gal", value: (r) => fmt(r.storage_gal, 0) + " gal for " + fmt(r.storage_days, 1) + " days" },
    { key: "note", id: "swp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSolarWaterPumpSizing,
});

// ===================== spec-v1884: rainwater first-flush diversion volume and standpipe length =====================

// dims: in { roof_footprint_sqft: L^2, diversion_rate_gal_per_100sqft: L, standpipe_diameter_in: L } out: { diversion_gal: L^3, low_rate_gal: L^3, high_rate_gal: L^3, minimum_rule_gal: L^3, rain_depth_in: L, in_per_gal: L^-2, standpipe_length_in: L, standpipe_length_ft: L, low_length_ft: L, high_length_ft: L }
export function computeFirstFlushDiverter({ roof_footprint_sqft = 0, diversion_rate_gal_per_100sqft = 1, standpipe_diameter_in = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(roof_footprint_sqft > 0)) return { error: "Roof footprint must be positive." };
  if (!(diversion_rate_gal_per_100sqft > 0)) return { error: "Diversion rate must be positive." };
  if (!(standpipe_diameter_in > 0)) return { error: "Standpipe diameter must be positive." };
  const hundreds = roof_footprint_sqft / 100;
  const diversion_gal = hundreds * diversion_rate_gal_per_100sqft;
  const low_rate_gal = hundreds * 1;
  const high_rate_gal = hundreds * 2;
  const minimum_rule_gal = 10 * roof_footprint_sqft / 1000;
  // 231 cubic inches per gallon spread over the footprint in square inches.
  const rain_depth_in = diversion_gal * 231 / (roof_footprint_sqft * 144);
  const in_per_gal = 231 / (Math.PI / 4 * standpipe_diameter_in * standpipe_diameter_in);
  const standpipe_length_in = diversion_gal * in_per_gal;
  const standpipe_length_ft = standpipe_length_in / 12;
  const low_length_ft = low_rate_gal * in_per_gal / 12;
  const high_length_ft = high_rate_gal * in_per_gal / 12;
  const in_range = diversion_rate_gal_per_100sqft >= 1 && diversion_rate_gal_per_100sqft <= 2;
  return {
    diversion_gal, low_rate_gal, high_rate_gal, minimum_rule_gal, rain_depth_in,
    in_per_gal, standpipe_length_in, standpipe_length_ft, low_length_ft, high_length_ft,
    in_range,
    range_verdict: in_range ? "within the TWDB 1 to 2 gal per 100 sq ft range" : diversion_rate_gal_per_100sqft < 1 ? "BELOW the TWDB range and the 10 gal per 1,000 sq ft minimum" : "above the TWDB range -- more diversion than the rule of thumb asks",
    note: "The first flush washes the roof and carries what accumulated between rains -- dust, pollen, bird droppings, and after a storm, debris and ash. The Texas manual's 1 to 2 gal per 100 sq ft is a rule of thumb, and it says no exact calculation exists: dry days, roof surface, tree overhang, and season all move it; a dusty site, a long dry spell, or ash after a fire argues for the upper rate. The footprint is measured in plan, not along the slope, and each downspout gets its own diverter sized from the area that drains to it. A gallon occupies 33 in of 3-inch pipe but only 8 in of 6-inch pipe, which is why 6 or 8-inch standpipes are favored; nominal diameter is used, as the manual does. Diverting does not make rainwater potable: that takes filtration and disinfection appropriate to the use. It does not size gutters, screens, the tank, or the harvest, or the weep-hole drain-down. The TWDB manual, the local health department for potable use, and the AHJ govern.",
  };
}

export const firstFlushDiverterExample = { inputs: { roof_footprint_sqft: 1500, diversion_rate_gal_per_100sqft: 1, standpipe_diameter_in: 6 } };
RELIEFWATER_RENDERERS["first-flush-diverter"] = _simpleRenderer({
  citation: "Citation: Texas Water Development Board, The Texas Manual on Rainwater Harvesting, 3rd ed. (2005), Chapter 2, First-Flush Diverters (1 to 2 gal per 100 sq ft of roof footprint; 10 gal per 1,000 sq ft minimum); standpipe length per gallon = 231 in^3 / (pi/4 x d^2). The local health department (potable use) and the AHJ govern.",
  example: firstFlushDiverterExample.inputs,
  fields: [
    { key: "roof_footprint_sqft", label: "Roof footprint draining to the downspout (sq ft, plan)" },
    { key: "diversion_rate_gal_per_100sqft", label: "Diversion rate (gal per 100 sq ft, 1 to 2)", default: 1 },
    { key: "standpipe_diameter_in", label: "Standpipe nominal diameter (in)", default: 6 },
  ],
  outputs: [
    { key: "vol", id: "ffd-out-v", label: "Diversion volume", unit: "gal", value: (r) => fmt(r.diversion_gal, 1) + " gal -- " + r.range_verdict },
    { key: "len", id: "ffd-out-l", label: "Standpipe length", value: (r) => fmt(r.standpipe_length_in, 1) + " in = " + fmt(r.standpipe_length_ft, 1) + " ft (" + fmt(r.in_per_gal, 2) + " in per gallon)" },
    { key: "range", id: "ffd-out-r", label: "Across the TWDB range", value: (r) => fmt(r.low_rate_gal, 1) + " gal (" + fmt(r.low_length_ft, 1) + " ft) to " + fmt(r.high_rate_gal, 1) + " gal (" + fmt(r.high_length_ft, 1) + " ft); minimum rule " + fmt(r.minimum_rule_gal, 1) + " gal" },
    { key: "depth", id: "ffd-out-d", label: "Equivalent rain depth", unit: "in", value: (r) => fmt(r.rain_depth_in, 3) + " in of rain" },
    { key: "note", id: "ffd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFirstFlushDiverter,
});

// ===================== spec-v1885: lift station outage time to overflow and pump-and-haul loads =====================

// dims: in { wet_well_shape: dimensionless, wet_well_diameter_ft: L, wet_well_length_ft: L, wet_well_width_ft: L, storage_depth_ft: L, sewer_length_ft: L, sewer_diameter_in: L, inflow_gpm: L^3 T^-1, detection_min: T, travel_min: T, hookup_min: T, outage_hr: T, truck_capacity_gal: L^3 } out: { wet_well_gal: L^3, sewer_gal: L^3, storage_gal: L^3, sewer_share_pct: dimensionless, time_to_overflow_min: T, response_min: T, margin_min: T, shortfall_gal: L^3, outage_inflow_gal: L^3, haul_volume_gal: L^3, truck_loads: dimensionless }
export function computeLiftStationOutageStorage({ wet_well_shape = "round", wet_well_diameter_ft = 0, wet_well_length_ft = 0, wet_well_width_ft = 0, storage_depth_ft = 0, sewer_length_ft = 0, sewer_diameter_in = 0, inflow_gpm = 0, detection_min = 0, travel_min = 0, hookup_min = 0, outage_hr = 0, truck_capacity_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let area_ft2;
  if (wet_well_shape === "round") {
    if (!(wet_well_diameter_ft > 0)) return { error: "Wet-well diameter must be positive." };
    area_ft2 = Math.PI / 4 * wet_well_diameter_ft * wet_well_diameter_ft;
  } else if (wet_well_shape === "rectangular") {
    if (!(wet_well_length_ft > 0) || !(wet_well_width_ft > 0)) return { error: "Wet-well length and width must be positive." };
    area_ft2 = wet_well_length_ft * wet_well_width_ft;
  } else {
    return { error: "Wet-well shape must be round or rectangular." };
  }
  if (!(storage_depth_ft >= 0)) return { error: "Storage depth cannot be negative." };
  if (!(sewer_length_ft >= 0)) return { error: "Sewer length cannot be negative." };
  if (!(sewer_diameter_in >= 0)) return { error: "Sewer diameter cannot be negative." };
  if (sewer_length_ft > 0 && !(sewer_diameter_in > 0)) return { error: "Sewer diameter must be positive when a sewer length is entered." };
  if (!(inflow_gpm > 0)) return { error: "Inflow must be positive." };
  if (![detection_min, travel_min, hookup_min, outage_hr].every((v) => v >= 0)) return { error: "Response times and outage duration cannot be negative." };
  if (!(truck_capacity_gal > 0)) return { error: "Vacuum-truck capacity must be positive." };
  const wet_well_gal = area_ft2 * storage_depth_ft * _GAL_PER_FT3;
  // Full-pipe storage: pi/4 x (d/12)^2 ft^2 x 1728/231 gal/ft3 = 3 pi d^2 / 231
  // gal per ft (the 0.0408 d^2 of the field rule).
  const sewer_gal = 3 * Math.PI * sewer_diameter_in * sewer_diameter_in / 231 * sewer_length_ft;
  const storage_gal = wet_well_gal + sewer_gal;
  const sewer_share_pct = storage_gal > 0 ? 100 * sewer_gal / storage_gal : 0;
  const time_to_overflow_min = storage_gal / inflow_gpm;
  const response_min = detection_min + travel_min + hookup_min;
  const margin_min = time_to_overflow_min - response_min;
  const shortfall_gal = Math.max(0, inflow_gpm * response_min - storage_gal);
  const outage_inflow_gal = inflow_gpm * outage_hr * 60;
  const haul_volume_gal = Math.max(0, outage_inflow_gal - storage_gal);
  const truck_loads = haul_volume_gal > 0 ? Math.ceil(haul_volume_gal / truck_capacity_gal - 1e-9) : 0;
  const response_wins = margin_min >= -1e-9;
  return {
    wet_well_gal, sewer_gal, storage_gal, sewer_share_pct, time_to_overflow_min,
    response_min, margin_min, shortfall_gal, response_wins,
    outage_hr, outage_inflow_gal, haul_volume_gal, truck_loads,
    response_verdict: response_wins ? "the response arrives before overflow" : "THE RESPONSE LOSES THE RACE -- sewage spills before the generator is connected",
    note: "A lift station without power is a tank with a fixed volume and an inflow that does not stop. Everything above the high-level alarm and below the lowest point where sewage escapes -- a wet-well overflow, a manhole rim, or the lowest basement drain on the line -- is emergency storage, and the incoming gravity sewer adds to it as it surcharges. The Ten States Standards require that storage to cover detection of the failure plus the transport and connection of portable generating equipment, and in a regional outage the response is much longer than people guess. The shortfall is what ends up in basements. Use the wet-weather inflow for the event, not the dry-weather average: inflow and infiltration rise sharply in the storm that caused the outage. The sewer is treated as full-pipe storage and its slope is ignored, so the sewer figure is an upper bound. It does not size the generator, the pumps, or the wet well's working volume, and it does not address overflow permitting, spill reporting, or cleanup. The Ten States Standards, the state regulatory agency, and the utility's emergency response plan govern.",
  };
}

export const liftStationOutageStorageExample = { inputs: { wet_well_shape: "round", wet_well_diameter_ft: 8, wet_well_length_ft: 0, wet_well_width_ft: 0, storage_depth_ft: 3, sewer_length_ft: 1200, sewer_diameter_in: 8, inflow_gpm: 100, detection_min: 20, travel_min: 60, hookup_min: 25, outage_hr: 8, truck_capacity_gal: 3000 } };
RELIEFWATER_RENDERERS["lift-station-outage-storage"] = _simpleRenderer({
  citation: "Citation: Great Lakes-Upper Mississippi River Board, Recommended Standards for Wastewater Facilities (Ten States Standards), Sections 47.1, 47.2, and 47.433 (emergency storage to cover detection plus transport and connection of portable generating equipment); storage, time to overflow, shortfall, and haul loads by mass balance. The state regulatory agency and the utility's emergency response plan govern.",
  example: liftStationOutageStorageExample.inputs,
  fields: [
    { key: "wet_well_shape", label: "Wet-well shape", kind: "select", options: [{ value: "round", label: "Round" }, { value: "rectangular", label: "Rectangular" }], default: "round" },
    { key: "wet_well_diameter_ft", label: "Round wet-well inside diameter (ft)" },
    { key: "wet_well_length_ft", label: "Rectangular wet-well length (ft)" },
    { key: "wet_well_width_ft", label: "Rectangular wet-well width (ft)" },
    { key: "storage_depth_ft", label: "High-level alarm to overflow or lowest basement (ft)" },
    { key: "sewer_length_ft", label: "Gravity sewer below that elevation (ft)" },
    { key: "sewer_diameter_in", label: "Gravity sewer diameter (in)" },
    { key: "inflow_gpm", label: "Inflow during the outage (gpm, wet-weather)" },
    { key: "detection_min", label: "Detection and alert time (min)" },
    { key: "travel_min", label: "Travel time (min)" },
    { key: "hookup_min", label: "Generator hookup time (min)" },
    { key: "outage_hr", label: "Outage duration for pump-and-haul (h)" },
    { key: "truck_capacity_gal", label: "Vacuum-truck capacity (gal)" },
  ],
  outputs: [
    { key: "time", id: "lso-out-t", label: "Time to overflow", unit: "min", value: (r) => fmt(r.time_to_overflow_min, 1) + " min" },
    { key: "store", id: "lso-out-s", label: "Emergency storage", value: (r) => fmt(r.storage_gal, 0) + " gal (wet well " + fmt(r.wet_well_gal, 0) + ", sewer " + fmt(r.sewer_gal, 0) + " = " + fmt(r.sewer_share_pct, 0) + "% of it)" },
    { key: "resp", id: "lso-out-r", label: "Response against overflow", value: (r) => fmt(r.response_min, 0) + " min response, margin " + fmt(r.margin_min, 1) + " min -- " + r.response_verdict },
    { key: "short", id: "lso-out-x", label: "Shortfall that spills", unit: "gal", value: (r) => fmt(r.shortfall_gal, 0) + " gal" },
    { key: "haul", id: "lso-out-h", label: "Pump-and-haul for the outage", value: (r) => r.truck_loads + " truck loads (" + fmt(r.haul_volume_gal, 0) + " gal beyond storage over " + fmt(r.outage_hr, 1) + " h)" },
    { key: "note", id: "lso-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLiftStationOutageStorage,
});

// ===================== spec-v1886: worksite toilet and handwash count =====================

// 29 CFR 1910.141 Table J-1 rows to 150 employees: [upper bound, water closets].
const _J1 = [[15, 1], [35, 2], [55, 3], [80, 4], [110, 5], [150, 6]];
const _j1WaterClosets = (n) => { if (!(n > 0)) return 0; const row = _J1.find(([upper]) => n <= upper); return row ? row[1] : 6 + Math.ceil((n - 150) / 40 - 1e-9); };

// dims: in { industry: dimensionless, worker_count: dimensionless, used_by_women: dimensionless, women_count: dimensionless } out: { toilet_seats: dimensionless, urinals: dimensionless, water_closets_min: dimensionless, water_closets_men: dimensionless, water_closets_women: dimensionless, water_closet_floor: dimensionless, urinals_substitutable: dimensionless, handwash_facilities: dimensionless }
export function computeOshaToiletCount({ industry = "construction", worker_count = 0, used_by_women = "yes", women_count = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(worker_count >= 1) || !Number.isInteger(worker_count)) return { error: "Worker count must be a whole number of at least 1." };
  if (!["construction", "general", "agriculture"].includes(industry)) return { error: "Industry must be construction, general industry, or agriculture." };
  if (!["yes", "no"].includes(used_by_women)) return { error: "Used by women must be yes or no." };
  if (!(women_count >= 0) || !Number.isInteger(women_count) || women_count > worker_count) return { error: "The number of women must be a whole number from 0 to the worker count." };
  let water_closets_men = 0, water_closets_women = 0;
  let toilet_seats = 0, urinals = 0, water_closets_min = 0, water_closet_floor = 0, urinals_substitutable = 0, handwash_facilities = 0;
  let rule = "", boundary_note = "";
  if (industry === "construction") {
    // Table D-1 rows overlap at exactly 20; the per-40 row (1 seat + 1 urinal)
    // is the larger reading and is used there.
    if (worker_count < 20) {
      toilet_seats = 1;
      rule = "29 CFR 1926.51(c)(1) Table D-1: 20 or less -> 1 facility";
    } else if (worker_count < 200) {
      toilet_seats = Math.ceil(worker_count / 40 - 1e-9);
      urinals = toilet_seats;
      rule = "29 CFR 1926.51(c)(1) Table D-1: 20 or more -> 1 toilet seat and 1 urinal per 40 workers";
    } else {
      toilet_seats = Math.ceil(worker_count / 50 - 1e-9);
      urinals = toilet_seats;
      rule = "29 CFR 1926.51(c)(1) Table D-1: 200 or more -> 1 toilet seat and 1 urinal per 50 workers";
      const per40 = Math.ceil(worker_count / 40 - 1e-9);
      if (per40 > toilet_seats) boundary_note = "The per-40 row (used up to 199 workers) would ask for more at this headcount: " + per40 + " and " + per40 + " at one per 40 for " + worker_count + " workers. The table steps DOWN at 200; a site at the line should not read the drop as permission to remove units.";
    }
    if (worker_count === 20) boundary_note = "Table D-1's \"20 or less\" and \"20 or more\" rows overlap at exactly 20: the first gives 1 facility, the per-40 row 1 seat and 1 urinal. The larger reading is shown.";
  } else if (industry === "general") {
    // 1910.141(c)(1)(i): rooms separate for each sex, and "the number of
    // facilities to be provided for each sex shall be based on the number of
    // employees of that sex". Until 2026-10-01 the table was read on the whole
    // workforce: 100 men and 50 women got 6, not 5 + 3 = 8.
    const split = used_by_women === "yes" && women_count > 0 && women_count < worker_count;
    water_closets_men = split ? _j1WaterClosets(worker_count - women_count) : 0;
    water_closets_women = split ? _j1WaterClosets(women_count) : 0;
    water_closets_min = split ? water_closets_men + water_closets_women : _j1WaterClosets(worker_count);
    rule = "29 CFR 1910.141(c)(1)(i) Table J-1" + (split ? ", read separately for each sex: " + water_closets_men + " for " + (worker_count - women_count) + " men + " + water_closets_women + " for " + women_count + " women" : worker_count > 150 ? ": over 150 -> 6 + 1 per additional 40 employees" : "");
    toilet_seats = water_closets_min;
    water_closet_floor = water_closets_min;
    if (used_by_women === "no") {
      water_closet_floor = Math.ceil(2 / 3 * water_closets_min - 1e-9);
      urinals_substitutable = water_closets_min - water_closet_floor;
    }
    boundary_note = used_by_women === "no"
      ? "Footnote 1: where toilet rooms will not be used by women, urinals may replace water closets, but water closets may not fall below 2/3 of the table minimum -- " + water_closet_floor + " water closets plus up to " + urinals_substitutable + " urinals."
      : "Toilet rooms separate for each sex, each counted on its own headcount (enter the number of women); urinals may not replace water closets where the facilities are used by women. Single-occupancy rooms that lock from inside need not be separated by sex.";
  } else {
    // 29 CFR 1928.110(a): the section applies where 11 or more employees do
    // hand labor in the field on a given day.
    if (worker_count >= 11) {
      toilet_seats = Math.ceil(worker_count / 20 - 1e-9);
      handwash_facilities = toilet_seats;
      rule = "29 CFR 1928.110(c)(2)(i): 1 toilet and 1 handwashing facility per 20 employees or fraction, within a 1/4-mile walk (c)(2)(iii)";
      boundary_note = "Not required for employees whose field work, including travel to and from the field, lasts 3 hours or less in the day (1928.110(c)(2)(v)).";
    } else {
      rule = "29 CFR 1928.110(a): the field sanitation standard applies only where 11 or more employees do hand labor in the field on a given day";
      boundary_note = "Fewer than 11 field hand laborers: 1928.110 does not apply. State plans may require facilities at any size.";
    }
  }
  return {
    industry, worker_count, used_by_women, women_count, toilet_seats, urinals, water_closets_min, water_closets_men, water_closets_women, water_closet_floor,
    urinals_substitutable, handwash_facilities, rule, boundary_note,
    handwash_counted: industry === "agriculture",
    note: "Three industries, three federal tables, and they do not agree: demolition and debris work is construction (1926.51 Table D-1), a relief warehouse is general industry (1910.141 Table J-1), and field hand labor is agriculture (1928.110). Table D-1's rows overlap at exactly 20 workers and the count steps down at 200. The Table J-1 urinal footnote is a floor, not a substitution rate: urinals may stand in for water closets only where the facilities will not be used by women, and water closets cannot fall below 2/3 of the minimum. Handwashing is required alongside toilets under all three rules, but only the agricultural rule states it as a count. These are minimums; heat, shift overlap, and remote work areas commonly justify more. It does not apply the building code's fixture table, the labor camp standard for workers who sleep on site, or shelter standards; it does not set a portable-unit service interval or address the construction exemption for mobile crews, state plans, or accessibility. The cited OSHA standards, the state plan, and the competent person on site govern.",
  };
}

export const oshaToiletCountExample = { inputs: { industry: "construction", worker_count: 85, used_by_women: "yes", women_count: 0 } };
RELIEFWATER_RENDERERS["osha-toilet-count"] = _simpleRenderer({
  citation: "Citation: 29 CFR 1926.51(c)(1) Table D-1 (construction), 29 CFR 1910.141(c)(1)(i) Table J-1 and footnote 1 (general industry), and 29 CFR 1928.110(a) and (c)(2) (agriculture) -- federal regulation, public domain, reproduced. OSHA and the state plan govern.",
  example: oshaToiletCountExample.inputs,
  fields: [
    { key: "industry", label: "Industry", kind: "select", options: [{ value: "construction", label: "Construction (1926.51)" }, { value: "general", label: "General industry (1910.141)" }, { value: "agriculture", label: "Agriculture field work (1928.110)" }], default: "construction" },
    { key: "worker_count", label: "Number of workers", attrs: { step: "1", min: "1" } },
    { key: "used_by_women", label: "General industry: facilities used by women?", kind: "select", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No (urinals may substitute)" }], default: "yes" },
    { key: "women_count", label: "General industry: of the workers, women", attrs: { step: "1", min: "0" } },
  ],
  outputs: [
    { key: "count", id: "otc-out-c", label: "Required", value: (r) => r.industry === "construction" ? r.toilet_seats + " toilet seat(s) + " + r.urinals + " urinal(s)" : r.industry === "general" ? r.water_closets_min + " water closets" + (r.urinals_substitutable > 0 ? ", or " + r.water_closet_floor + " water closets + " + r.urinals_substitutable + " urinals" : "") : r.toilet_seats + " toilets + " + r.handwash_facilities + " handwashing facilities" },
    { key: "hand", id: "otc-out-h", label: "Handwashing", value: (r) => r.handwash_counted ? r.handwash_facilities + " facilities (counted by 1928.110)" : "required alongside toilets; this rule does not state a count" },
    { key: "rule", id: "otc-out-r", label: "Rule applied", value: (r) => r.rule },
    { key: "edge", id: "otc-out-b", label: "Table boundary", value: (r) => r.boundary_note || "no table boundary at this count" },
    { key: "note", id: "otc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOshaToiletCount,
});

// ===================== spec-v1887: responder base camp sanitation and water =====================

// dims: in { men_count: dimensionless, women_count: dimensionless, pressure_water: dimensionless } out: { toilets_men: dimensionless, toilets_women: dimensionless, toilets_total: dimensionless, urinals: dimensionless, handwash_basins: dimensionless, showerheads: dimensionless, laundry_trays: dimensionless, drinking_fountains: dimensionless, water_gal_per_day: L^3 T^-1, average_gph: L^3 T^-1, peak_gph: L^3 T^-1, peak_gpm: L^3 T^-1, sleeping_area_sqft: L^2 }
export function computeResponderCampSanitation({ men_count = 0, women_count = 0, pressure_water = "yes" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(men_count >= 0) || !(women_count >= 0)) return { error: "Occupant counts cannot be negative." };
  if (!(men_count + women_count >= 1)) return { error: "The camp must house at least 1 person." };
  if (!["yes", "no"].includes(pressure_water)) return { error: "Water under pressure must be yes or no." };
  const total = men_count + women_count;
  // 1910.142(d)(5): per sex, 1 per 15 of the maximum of that sex, minimum of
  // two units for any shared facility; a sex the camp does not house gets none.
  const perSex = (n) => (n > 0 ? Math.max(2, Math.ceil(n / 15 - 1e-9)) : 0);
  const toilets_men = perSex(men_count);
  const toilets_women = perSex(women_count);
  const toilets_total = toilets_men + toilets_women;
  const whole_camp_ratio = Math.ceil(total / 15 - 1e-9);
  const urinals = Math.ceil(men_count / 25 - 1e-9);
  const urinal_trough_ft = 2 * urinals;
  const handwash_basins = Math.ceil(total / 6 - 1e-9);
  const showerheads = Math.ceil(total / 10 - 1e-9);
  const laundry_trays = Math.ceil(total / 30 - 1e-9);
  const drinking_fountains = pressure_water === "yes" ? Math.ceil(total / 100 - 1e-9) : 0;
  const water_gal_per_day = 35 * total;
  const average_gph = water_gal_per_day / 24;
  const peak_gph = 2.5 * average_gph;
  const peak_gpm = peak_gph / 60;
  const sleeping_area_sqft = 50 * total;
  return {
    men_count, women_count, total_occupants: total, toilets_men, toilets_women, toilets_total, whole_camp_ratio,
    urinals, urinal_trough_ft, handwash_basins, showerheads, laundry_trays, drinking_fountains, pressure_water,
    water_gal_per_day, average_gph, peak_gph, peak_gpm, sleeping_area_sqft,
    minimum_governs: (men_count > 0 && men_count <= 15) || (women_count > 0 && women_count <= 15),
    distance_rules: "Toilet room within 200 ft of every sleeping-room door; no privy closer than 100 ft to a sleeping room, dining area, or kitchen (d)(3). Beds at least 36 in apart and 12 in off the floor, 7 ft ceiling (b)(2)-(b)(3).",
    note: "A camp is a small town, and 29 CFR 1910.142 sizes it like one. Toilets are counted separately for each sex against the maximum number of that sex the camp is designed to house, with a minimum of two in any shared facility, so the small side of a camp is set by the minimum, not the ratio; urinals are in addition to the men's toilets, not a substitute. The water figure sizes the infrastructure: 35 gallons per person per day covers drinking, cooking, bathing, and laundry, delivered at 2.5 times the average hourly rate because demand bunches at shift change -- the peak sizes a water trailer's pump, a temporary line, or a bladder's refill schedule. Sleeping space is 50 sq ft per occupant and is routinely violated when a camp is filled past its design population. Whether 1910.142 applies to a particular camp is a regulatory question, and state plans, local health codes, and agency base-camp standards may be more stringent. It does not address siting, drainage, refuse, food service, vector control, or first aid, or size power, water storage, or wastewater hauling. 29 CFR 1910.142, the state plan, and the local health department govern.",
  };
}

export const responderCampSanitationExample = { inputs: { men_count: 90, women_count: 30, pressure_water: "yes" } };
RELIEFWATER_RENDERERS["responder-camp-sanitation"] = _simpleRenderer({
  citation: "Citation: 29 CFR 1910.142, Temporary labor camps -- (b)(2) 50 sq ft per occupant and 7 ft ceiling, (c)(2) 35 gal per person per day at a peak of 2 1/2 x average hourly demand, (c)(4) 1 drinking fountain per 100 where water is under pressure, (d)(3) 200 ft to a toilet room, (d)(5) 1 unit per 15 of each sex, minimum 2 per shared facility, (d)(6) 1 urinal or 2 ft of trough per 25 men, (f)(1) 1 basin per 6, 1 showerhead per 10, 1 laundry tray per 30. Federal, public domain. OSHA, the state plan, and the local health department govern.",
  example: responderCampSanitationExample.inputs,
  fields: [
    { key: "men_count", label: "Men the camp is designed to house", attrs: { step: "1", min: "0" } },
    { key: "women_count", label: "Women the camp is designed to house", attrs: { step: "1", min: "0" } },
    { key: "pressure_water", label: "Water under pressure?", kind: "select", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No (hauled or gravity)" }], default: "yes" },
  ],
  outputs: [
    { key: "toilets", id: "rcs-out-t", label: "Toilets", value: (r) => r.toilets_total + " (men " + r.toilets_men + ", women " + r.toilets_women + "; the whole camp over 15 would give " + r.whole_camp_ratio + ")" },
    { key: "urinals", id: "rcs-out-u", label: "Urinals (in addition)", value: (r) => r.urinals + " units or " + r.urinal_trough_ft + " ft of trough" },
    { key: "wash", id: "rcs-out-w", label: "Basins, showers, laundry", value: (r) => r.handwash_basins + " handwash basins, " + r.showerheads + " showerheads, " + r.laundry_trays + " laundry trays" },
    { key: "fount", id: "rcs-out-f", label: "Drinking fountains", value: (r) => r.pressure_water === "yes" ? r.drinking_fountains + " fountains" : "not required without water under pressure; no common cups" },
    { key: "water", id: "rcs-out-q", label: "Water supply", value: (r) => fmt(r.water_gal_per_day, 0) + " gal/day; average " + fmt(r.average_gph, 1) + " gal/h, peak " + fmt(r.peak_gph, 1) + " gal/h = " + fmt(r.peak_gpm, 2) + " gpm" },
    { key: "sleep", id: "rcs-out-s", label: "Sleeping floor area", unit: "sq ft", value: (r) => fmt(r.sleeping_area_sqft, 0) + " sq ft minimum" },
    { key: "dist", id: "rcs-out-d", label: "Distance and spacing rules", value: (r) => r.distance_rules },
    { key: "note", id: "rcs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeResponderCampSanitation,
});
