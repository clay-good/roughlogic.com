// Group D: Water Damage and Mold Restoration calculators (32 through 39).
//
// Water classes/categories, drying times, mold conditions, and PPE selection
// reference IICRC S500 by name only; the standard text is not reproduced.

import { psychrometric, F_to_C } from "./pure-math.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};


// --- Utility 32: Psychrometric Calculator ---

// dims: in { temperature_F: T, RH_percent: dimensionless, atmospheric_pressure_hPa: M L^-1 T^-2 }
//        out: { dew_point_F: T, GPP: dimensionless, vapor_pressure_hPa: M L^-1 T^-2, saturation_pressure_hPa: M L^-1 T^-2, specific_humidity_kg_kg: dimensionless }
// (Temperature inputs / outputs carry the §7.1 base-token `T`;
//  pressure surfaces as `M L^-1 T^-2` (one pascal = kg m^-1 s^-2).
//  Grains-per-pound is a dimensionless mass-fraction (7000 grains
//  per pound divides out). RH and specific humidity are dimensionless.)
export function computePsychrometric({ temperature_F, RH_percent, atmospheric_pressure_hPa = 1013.25 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T_C = F_to_C(temperature_F);
  const r = psychrometric({ T_C, RH_percent, P_hPa: atmospheric_pressure_hPa });
  return {
    dew_point_F: Number.isFinite(r.dewPoint_C) ? r.dewPoint_C * 9 / 5 + 32 : null,
    GPP: r.GPP,
    vapor_pressure_hPa: r.e_hPa,
    saturation_pressure_hPa: r.e_s_hPa,
    specific_humidity_kg_kg: r.W_kg_kg,
  };
}

export const psychrometricExample = {
  inputs: { temperature_F: 75, RH_percent: 50 },
  expectedRange: { GPP: { min: 55, max: 75 }, dew_point_F: { min: 50, max: 60 } },
};

// --- Utility 33: Drying Goal ---
//
// Target indoor GPP based on outdoor conditions. The standard restoration
// rule is to dry the structure to a GPP at least 5 to 10 grains below the
// outdoor GPP so moisture moves out of materials when ventilated.

// dims: in { outdoor_temperature_F: T, outdoor_RH_percent: dimensionless, indoor_temperature_F: T, margin_GPP: dimensionless }
//        out: { outdoor_GPP: dimensionless, target_indoor_GPP: dimensionless, target_indoor_RH_percent: dimensionless }
// (Restoration rule of thumb: target indoor GPP at least 5-10
//  grains below outdoor. GPP is a dimensionless mass-fraction
//  (grains-per-pound); temperatures carry `T`; RH and margin are
//  dimensionless percentages / counts.)
export function computeDryingGoal({ outdoor_temperature_F, outdoor_RH_percent, indoor_temperature_F = 70, margin_GPP = 10 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const out = computePsychrometric({ temperature_F: outdoor_temperature_F, RH_percent: outdoor_RH_percent });
  const target_GPP = Math.max(0, out.GPP - margin_GPP);
  // Convert target GPP back into an indoor RH at indoor temperature.
  // RH = e / e_s. e from W = 0.622 * e / (P - e); GPP = W * 7000 -> W = GPP/7000.
  const W = target_GPP / 7000;
  const P = 1013.25;
  const e = (W * P) / (0.622 + W);
  // saturation at indoor temp
  const T_C = F_to_C(indoor_temperature_F);
  const e_s = 6.1094 * Math.exp((17.625 * T_C) / (T_C + 243.04));
  const indoor_RH_percent = (e / e_s) * 100;
  return {
    outdoor_GPP: out.GPP,
    target_indoor_GPP: target_GPP,
    target_indoor_RH_percent: Math.max(0, Math.min(100, indoor_RH_percent)),
  };
}

export const dryingGoalExample = {
  inputs: { outdoor_temperature_F: 80, outdoor_RH_percent: 70, indoor_temperature_F: 72, margin_GPP: 10 },
};

// --- Utility 34: Dehumidifier Sizing ---
//
// Two methods. AHAM (rated at 80 F / 60 percent RH) and a field method that
// accounts for the actual load class. Returns capacity in pints per day.

const AHAM_PINTS_PER_FT3_BY_CLASS = {
  // Conservative engineering values per IICRC consensus practice.
  "1": 0.025,
  "2": 0.040,
  "3": 0.060,
  "4": 0.080,
};

// dims: in { room_cubic_feet: L^3, water_class: dimensionless, expected_pints_per_day: L^3 T^-1 }
//        out: { aham_pints_per_day: L^3 T^-1, field_pints_per_day: L^3 T^-1, expected_pints_per_day: L^3 T^-1, recommendation: L^3 T^-1, operational_guidance: dimensionless }
// (Room volume is `L^3`; IICRC water-class token is categorical.
//  Pints-per-day is volume-per-time `L^3 T^-1`. The AHAM 80F/60%RH
//  rating and the 1.55x field-method factor are dimensionless
//  multipliers; the operational-guidance string is categorical.)
export function computeDehumidifierSize({ room_cubic_feet, water_class = "2", expected_pints_per_day = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const factor = AHAM_PINTS_PER_FT3_BY_CLASS[String(water_class)];
  const aham = factor ? room_cubic_feet * factor : null;
  // Field method: scale by 1.55x to account for actual job conditions.
  const field = aham !== null ? aham * 1.55 : null;
  // v8 §C.6: operational guidance based on the field-method recommendation.
  // Sizing thresholds mirror commercial LGR / dessicant unit ratings.
  let operational_guidance = null;
  if (field !== null) {
    if (field <= 75)        operational_guidance = "one small portable LGR (~ 75 PPD AHAM) is sufficient";
    else if (field <= 130)  operational_guidance = "one mid-range LGR (~ 130 PPD AHAM) sufficient; consider two smaller units for redundancy";
    else if (field <= 250)  operational_guidance = "one large LGR (~ 250 PPD AHAM) or two mid-range units; redundancy preferred for Class 3 / Cat 3";
    else                    operational_guidance = "stage two-or-more large LGRs OR a single dessicant unit; verify air-balance";
  }
  return {
    aham_pints_per_day: aham,
    field_pints_per_day: field,
    expected_pints_per_day,
    recommendation: field ?? expected_pints_per_day,
    operational_guidance,
  };
}

export const dehumidifierExample = {
  inputs: { room_cubic_feet: 5000, water_class: "2" },
  expectedRange: { aham_pints_per_day: { min: 150, max: 250 } },
};

// --- Utility 35: Air Mover Placement ---
//
// IICRC S500 references suggest one air mover per 10-16 ft of wall in
// affected areas, or one per 50 to 150 ft^2 of affected floor area
// depending on water class. We use 100 ft^2 per air mover as a midpoint
// for class 2 with class-driven scaling.

const AIR_MOVER_FT2_PER_UNIT_BY_CLASS = {
  "1": 150,
  "2": 100,
  "3": 75,
  "4": 50,
};

// dims: in { affected_area_ft2: L^2, water_class: dimensionless }
//        out: { air_mover_count: dimensionless, ft2_per_unit: L^2, total_cfm: L^3 T^-1, cfm_per_ft2: L T^-1, placement_pattern: dimensionless, placement_note: dimensionless }
// (Affected area is `L^2`; per-class coverage is also `L^2`. CFM
//  is volume-per-time `L^3 T^-1`; CFM per ft^2 collapses to a
//  surface-velocity `L T^-1`. Air-mover count and the categorical
//  placement-pattern token are dimensionless.)
export function computeAirMovers({ affected_area_ft2, water_class = "2" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ft2_per = AIR_MOVER_FT2_PER_UNIT_BY_CLASS[String(water_class)];
  if (!ft2_per) return { error: "Unknown water class." };
  const count = Math.ceil(affected_area_ft2 / ft2_per);
  // Typical air mover ~ 2500 CFM at low setting. Coverage in CFM/ft^2.
  const cfm_per_unit = 2500;
  const total_cfm = count * cfm_per_unit;
  const cfm_per_ft2 = affected_area_ft2 > 0 ? total_cfm / affected_area_ft2 : 0;
  // v8 §C.6: placement pattern guidance per IICRC S500 §12 typical.
  // 1-3 units → corner placement (45° vortex). 4-6 → corners + perimeter.
  // 7+ → continuous perimeter spaced at 10-16 linear ft.
  let placement_pattern, placement_note;
  if (count <= 3) {
    placement_pattern = "corners";
    placement_note = "Place each unit in a corner aimed across the wall at a 45° angle. Creates a circulating vortex over the affected floor.";
  } else if (count <= 6) {
    placement_pattern = "corners + perimeter";
    placement_note = "Start with corner placement; add units along the perimeter at 10-16 linear ft spacing. Aim each unit so the airflow rotates in the same direction.";
  } else {
    placement_pattern = "continuous perimeter";
    placement_note = "Space units along the perimeter at 10-16 linear ft. Aim to maintain a single direction of airflow rotation. Verify coverage at the chamber corners.";
  }
  return {
    air_mover_count: count, ft2_per_unit: ft2_per, total_cfm, cfm_per_ft2,
    placement_pattern, placement_note,
  };
}

export const airMoversExample = {
  inputs: { affected_area_ft2: 800, water_class: "2" },
  expected: { air_mover_count: 8 },
};

// --- Utility 36: Class and Category of Water Loss Reference ---

export const WATER_CATEGORIES = [
  { id: "1", name: "Category 1", summary: "Water from a sanitary source. Generally clean. Time and contact may shift to category 2 or 3." },
  { id: "2", name: "Category 2", summary: "Significantly contaminated water that could cause discomfort or sickness if consumed." },
  { id: "3", name: "Category 3", summary: "Grossly contaminated water. May contain pathogens, sewage, or harmful chemicals." },
];

export const WATER_CLASSES = [
  { id: "1", name: "Class 1", summary: "Least amount of water absorption and evaporation load. Slow evaporation. Limited area." },
  { id: "2", name: "Class 2", summary: "Significant amount of water absorption and evaporation load. Wet carpet, cushions, structural components." },
  { id: "3", name: "Class 3", summary: "Greatest amount of water absorption and evaporation load. Water from overhead, saturated walls and ceilings." },
  { id: "4", name: "Class 4", summary: "Specialty drying situations. Materials with low porosity holding bound water (hardwood, plaster, masonry)." },
];

// dims: in { args: dimensionless } out: { categories: dimensionless, classes: dimensionless }
// (Pure categorical IICRC S500 water-category and water-class
//  reference lookup.)
export function computeWaterReference() {
  return { categories: WATER_CATEGORIES, classes: WATER_CLASSES };
}

// --- Utility 37: Material Drying Times Reference ---

export const DRYING_TIMES = {
  drywall: { typical_days: "2-4", notes: "Faster with airflow. Saturated drywall is often replaced." },
  carpet_padding: { typical_days: "1-2", notes: "Padding usually replaced; carpet face dries faster than back." },
  hardwood_floor: { typical_days: "5-10+", notes: "Bound water dries slowly; specialty drying is often required." },
  plaster: { typical_days: "5-14", notes: "Low porosity; drying time depends on thickness and lath." },
  concrete_slab: { typical_days: "varies", notes: "Bound moisture can persist for weeks; measure with a calibrated meter." },
  framing_lumber: { typical_days: "3-7", notes: "Target moisture content below 16 percent for common framing." },
};

// dims: in { material: dimensionless } out: { material: dimensionless, typical_days: dimensionless, notes: dimensionless }
// (Pure categorical material-drying-time reference lookup; typical
//  days values are reference text spans, not measured quantities.)
export function computeDryingTime({ material }) {
  const m = DRYING_TIMES[material];
  if (!m) return { error: "Unknown material." };
  return { material, typical_days: m.typical_days, notes: m.notes };
}

// --- Utility 38: Mold Growth Conditions ---

// dims: in { rh_percent: dimensionless, temperature_F: T, hours_elevated: T }
//        out: { risk: dimensionless, threshold_rh_growth_percent: dimensionless, threshold_rh_high_percent: dimensionless, minimum_growth_temperature_F: T, typical_germination_hours: T, notes: dimensionless }
// (RH percent and risk-band token are dimensionless; temperatures
//  and the germination-hours interval carry the §7.1 base-token `T`.)
export function computeMoldRisk({ rh_percent, temperature_F, hours_elevated }) {
  let risk = "low";
  if (rh_percent >= 70 && hours_elevated >= 24) risk = "high";
  else if (rh_percent >= 60 && hours_elevated >= 48) risk = "moderate";
  if (temperature_F < 40 || temperature_F > 100) risk = "low (out of typical growth range)";
  return {
    risk,
    threshold_rh_growth_percent: 60,
    threshold_rh_high_percent: 70,
    minimum_growth_temperature_F: 40,
    typical_germination_hours: 24,
    notes: "Risk increases with sustained elevated RH on a food source. Reduce moisture below 60 percent RH to inhibit growth.",
  };
}

export const moldExample = {
  inputs: { rh_percent: 75, temperature_F: 75, hours_elevated: 48 },
  expected: { risk: "high" },
};

// --- Utility 39: PPE Selection ---

export const PPE_RECOMMENDATIONS = {
  "1": { ppe: "Nitrile gloves, safety glasses, work clothing. N95 if visibly dusty work.", notes: "Category 1 work is similar to general construction PPE." },
  "2": { ppe: "Nitrile gloves, splash-resistant goggles, N95 respirator, fluid-resistant outer garment.", notes: "Avoid skin contact and dust exposure." },
  "3": { ppe: "Full-face P100 respirator (or PAPR), nitrile gloves under chemical-resistant outer gloves, fluid-impervious suit, rubber boots, splash-resistant goggles.", notes: "Sewage and biohazard. Decontaminate and discard outer garments per facility policy." },
};

// dims: in { category: dimensionless } out: { category: dimensionless, ppe: dimensionless, notes: dimensionless }
// (Pure categorical PPE-by-water-category lookup.)
export function computePPE({ category }) {
  const e = PPE_RECOMMENDATIONS[String(category)];
  if (!e) return { error: "Unknown category. Use 1, 2, or 3." };
  return { category, ppe: e.ppe, notes: e.notes };
}

// --- Renderers ---

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPsychrometric(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: August-Roche-Magnus saturation vapor pressure approximation; standard psychrometric definitions.";
  const T = makeNumber("Temperature (F)", "py-t", { step: "any" });
  const RH = makeNumber("Relative humidity (percent)", "py-rh", { step: "any", min: "0", max: "100" });
  const P = makeNumber("Atmospheric pressure (hPa)", "py-p", { step: "any", min: "800", max: "1200", value: "1013.25" });
  P.input.value = "1013.25";
  for (const f of [T, RH, P]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { T.input.value = "75"; RH.input.value = "50"; P.input.value = "1013.25"; update(); });
  const oDP = makeOutputLine(outputRegion, "Dew point", "py-out-dp");
  const oGP = makeOutputLine(outputRegion, "Grains per pound", "py-out-gp");
  const oVP = makeOutputLine(outputRegion, "Vapor pressure", "py-out-vp");
  const update = debounce(() => {
    const r = computePsychrometric({ temperature_F: Number(T.input.value) || 0, RH_percent: Number(RH.input.value) || 0, atmospheric_pressure_hPa: Number(P.input.value) || 1013.25 });
    oDP.textContent = fmt(r.dew_point_F, 1) + " F";
    oGP.textContent = fmt(r.GPP, 1);
    oVP.textContent = fmt(r.vapor_pressure_hPa, 2) + " hPa";
  }, DEBOUNCE_MS);
  for (const el of [T.input, RH.input, P.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderDryingGoal(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard restoration rule of thumb. Target indoor GPP at least 5 to 10 grains below outdoor GPP for effective drying.";
  const oT = makeNumber("Outdoor temperature (F)", "dg-ot", { step: "any" });
  const oR = makeNumber("Outdoor RH (percent)", "dg-or", { step: "any", min: "0", max: "100" });
  const iT = makeNumber("Indoor temperature (F)", "dg-it", { step: "any", value: "72" });
  iT.input.value = "72";
  const m = makeNumber("Margin (GPP below outdoor)", "dg-m", { step: "any", min: "0", value: "10" });
  m.input.value = "10";
  for (const f of [oT, oR, iT, m]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oT.input.value = "80"; oR.input.value = "70"; iT.input.value = "72"; m.input.value = "10"; update(); });
  const ogpp = makeOutputLine(outputRegion, "Outdoor GPP", "dg-out-ogpp");
  const tgpp = makeOutputLine(outputRegion, "Target indoor GPP", "dg-out-tgpp");
  const trh = makeOutputLine(outputRegion, "Target indoor RH", "dg-out-trh");
  const update = debounce(() => {
    const r = computeDryingGoal({
      outdoor_temperature_F: Number(oT.input.value) || 0,
      outdoor_RH_percent: Number(oR.input.value) || 0,
      indoor_temperature_F: Number(iT.input.value) || 72,
      margin_GPP: Number(m.input.value) || 10,
    });
    ogpp.textContent = fmt(r.outdoor_GPP, 1);
    tgpp.textContent = fmt(r.target_indoor_GPP, 1);
    trh.textContent = fmt(r.target_indoor_RH_percent, 1) + " %";
  }, DEBOUNCE_MS);
  for (const el of [oT.input, oR.input, iT.input, m.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderDehumidifier(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AHAM rating method (80 F / 60 percent RH) and an engineering field method scaled by job conditions. References IICRC S500.";
  const v = makeNumber("Room volume (ft^3)", "dh-v", { step: "any", min: "0" });
  const c = makeSelect("Water class", "dh-c", [
    { value: "1", label: "Class 1" }, { value: "2", label: "Class 2", selected: true }, { value: "3", label: "Class 3" }, { value: "4", label: "Class 4" },
  ]);
  for (const f of [v, c]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { v.input.value = "5000"; c.select.value = "2"; update(); });
  const oA = makeOutputLine(outputRegion, "AHAM pints/day", "dh-out-a");
  const oF = makeOutputLine(outputRegion, "Field pints/day", "dh-out-f");
  // v8 §C.6: operational guidance ("one large LGR or two mid-range for redundancy") row.
  const oG = makeOutputLine(outputRegion, "Operational guidance", "dh-out-g");
  const update = debounce(() => {
    const r = computeDehumidifierSize({ room_cubic_feet: Number(v.input.value) || 0, water_class: c.select.value });
    oA.textContent = fmt(r.aham_pints_per_day, 1);
    oF.textContent = fmt(r.field_pints_per_day, 1);
    oG.textContent = r.operational_guidance ?? "-";
  }, DEBOUNCE_MS);
  for (const el of [v.input, c.select]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderAirMovers(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500 consensus practice (referenced; not reproduced). Coverage in ft^2 per air mover varies by water class.";
  const a = makeNumber("Affected area (ft^2)", "am-a", { step: "any", min: "0" });
  const c = makeSelect("Water class", "am-c", [
    { value: "1", label: "Class 1" }, { value: "2", label: "Class 2", selected: true }, { value: "3", label: "Class 3" }, { value: "4", label: "Class 4" },
  ]);
  for (const f of [a, c]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "800"; c.select.value = "2"; update(); });
  const oC = makeOutputLine(outputRegion, "Air mover count", "am-out-c");
  const oCFM = makeOutputLine(outputRegion, "Total CFM", "am-out-cfm");
  // v8 §C.6: placement-pattern + placement-note rows per IICRC S500 §12 typical.
  const oP = makeOutputLine(outputRegion, "Placement pattern", "am-out-p");
  const oN = makeOutputLine(outputRegion, "Placement note", "am-out-n");
  const update = debounce(() => {
    const r = computeAirMovers({ affected_area_ft2: Number(a.input.value) || 0, water_class: c.select.value });
    if (r.error) { oC.textContent = r.error; oCFM.textContent = "-"; oP.textContent = "-"; oN.textContent = "-"; return; }
    oC.textContent = String(r.air_mover_count) + " (" + r.ft2_per_unit + " ft^2 each)";
    oCFM.textContent = fmt(r.total_cfm, 0) + " CFM";
    oP.textContent = r.placement_pattern;
    oN.textContent = r.placement_note;
  }, DEBOUNCE_MS);
  for (const el of [a.input, c.select]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderWaterClasses(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summaries by the project author. References IICRC S500 by name; the standard text is not reproduced.";
  const r = computeWaterReference();
  const sec1 = document.createElement("section");
  const h1 = document.createElement("h2"); h1.textContent = "Categories"; sec1.appendChild(h1);
  const dl1 = document.createElement("dl");
  for (const c of r.categories) {
    const dt = document.createElement("dt"); dt.textContent = c.name; dl1.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = c.summary; dl1.appendChild(dd);
  }
  sec1.appendChild(dl1); outputRegion.appendChild(sec1);
  const sec2 = document.createElement("section");
  const h2 = document.createElement("h2"); h2.textContent = "Classes"; sec2.appendChild(h2);
  const dl2 = document.createElement("dl");
  for (const c of r.classes) {
    const dt = document.createElement("dt"); dt.textContent = c.name; dl2.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = c.summary; dl2.appendChild(dd);
  }
  sec2.appendChild(dl2); outputRegion.appendChild(sec2);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderDryingTimes(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English notes on typical drying behavior of common building materials.";
  const m = makeSelect("Material", "dt-m", Object.keys(DRYING_TIMES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  inputRegion.appendChild(m.wrap);
  attachExampleButton(inputRegion, () => { m.select.value = "drywall"; update(); });
  const oD = makeOutputLine(outputRegion, "Typical drying", "dt-out-d");
  const oN = makeOutputLine(outputRegion, "Notes", "dt-out-n");
  const update = debounce(() => {
    const r = computeDryingTime({ material: m.select.value });
    if (r.error) { oD.textContent = r.error; oN.textContent = "-"; return; }
    oD.textContent = r.typical_days + " days"; oN.textContent = r.notes;
  }, DEBOUNCE_MS);
  m.select.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderMold(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public mold-growth research literature summarized in original plain English. Risk increases with sustained elevated RH on a food source.";
  const rh = makeNumber("Relative humidity (percent)", "mr-rh", { step: "any", min: "0", max: "100" });
  const T = makeNumber("Temperature (F)", "mr-t", { step: "any" });
  const h = makeNumber("Hours of elevated humidity", "mr-h", { step: "any", min: "0" });
  for (const f of [rh, T, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rh.input.value = "75"; T.input.value = "75"; h.input.value = "48"; update(); });
  const oR = makeOutputLine(outputRegion, "Risk", "mr-out");
  const update = debounce(() => {
    const r = computeMoldRisk({ rh_percent: Number(rh.input.value) || 0, temperature_F: Number(T.input.value) || 0, hours_elevated: Number(h.input.value) || 0 });
    oR.textContent = r.risk;
  }, DEBOUNCE_MS);
  for (const el of [rh.input, T.input, h.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPPE(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Typical PPE selection per OSHA general duty considerations and IICRC S500 (referenced, not reproduced).";
  const c = makeSelect("Water category", "ppe-c", [
    { value: "1", label: "Category 1" }, { value: "2", label: "Category 2", selected: true }, { value: "3", label: "Category 3" },
  ]);
  inputRegion.appendChild(c.wrap);
  attachExampleButton(inputRegion, () => { c.select.value = "3"; update(); });
  const oP = makeOutputLine(outputRegion, "Recommended PPE", "ppe-out-p");
  const oN = makeOutputLine(outputRegion, "Notes", "ppe-out-n");
  const update = debounce(() => {
    const r = computePPE({ category: c.select.value });
    if (r.error) { oP.textContent = r.error; oN.textContent = "-"; return; }
    oP.textContent = r.ppe; oN.textContent = r.notes;
  }, DEBOUNCE_MS);
  c.select.addEventListener("input", update);
}

// =====================================================================
// v2 utilities (86-89): spec-v2.md section 2 Group D extensions.
// =====================================================================

// --- Utility 86: Standing Water Volume ---
//
// gallons = area_ft2 * depth_in / 12 * 7.48052
// (1 ft^3 = 7.48052 gal)

// dims: in { area_ft2: L^2, depth_in: L }
//        out: { gallons: L^3, cubic_feet: L^3, pounds: M }
// (Area `L^2` * depth `L` = volume `L^3`; the 7.48052 gal/ft^3 and
//  62.4 lb/ft^3 (water-at-60F) constants absorb the unit
//  conversion to volume `L^3` and mass `M` respectively.)
export function computeStandingWater({ area_ft2, depth_in }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(area_ft2) || 0;
  const d = Number(depth_in) || 0;
  if (a <= 0 || d <= 0) return { error: "Provide positive area and depth." };
  const cubic_feet = (a * d) / 12;
  const gallons = cubic_feet * 7.48052;
  const pounds = cubic_feet * 62.4;
  return { gallons, cubic_feet, pounds };
}

export const standingWaterExample = {
  inputs: { area_ft2: 500, depth_in: 1 },
  expectedRange: { gallons: { min: 310, max: 315 } },
};

// --- Utility 87: Negative Air Machine (NAM) Sizing ---
//
// Required CFM = volume_ft^3 * ACH / 60.

export const NAM_UNIT_SIZES_CFM = [500, 1000, 2000];

// dims: in { room_volume_ft3: L^3, target_ach: T^-1 }
//        out: { required_cfm: L^3 T^-1, recommendations: dimensionless }
// (Room volume `L^3` * air-changes-per-hour `T^-1` / 60 = CFM
//  `L^3 T^-1`. The recommendations array enumerates the standard
//  500 / 1000 / 2000 CFM unit sizes (each `L^3 T^-1` internally)
//  with dimensionless unit counts.)
export function computeNAMSizing({ room_volume_ft3, target_ach = 6 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const v = Number(room_volume_ft3) || 0;
  const ach = Number(target_ach) || 0;
  if (v <= 0 || ach <= 0) return { error: "Provide positive volume and ACH." };
  const required_cfm = (v * ach) / 60;
  // Recommend NAM count using the largest unit that divides cleanly, then
  // size up. We pick the smallest unit count that meets demand.
  const recommendations = NAM_UNIT_SIZES_CFM.map((unit) => ({
    unit_cfm: unit,
    units_needed: Math.ceil(required_cfm / unit),
    total_cfm: Math.ceil(required_cfm / unit) * unit,
  }));
  return { required_cfm, recommendations };
}

export const namSizingExample = {
  inputs: { room_volume_ft3: 8000, target_ach: 6 },
  expected: { required_cfm: 800 },
};

// --- Utility 88: HEPA Scrubber Filter Life ---
//
// filter_days = capacity_loading / (CFM * hours_per_day * loading_per_CFM_hour)
// Bundled per-category loading values (low/medium/high).

export const HEPA_LOADING = {
  // grams of particulate per CFM-hour (typical engineering values).
  loading_per_CFM_hour: { low: 0.02, medium: 0.05, high: 0.10 },
  // grams capacity per filter (typical commercial HEPA pre-filter assembly).
  default_capacity_grams: 1500,
};

// dims: in { cfm: L^3 T^-1, hours_per_day: T, particulate_category: dimensionless, capacity_grams: M, job_days: dimensionless, filter_cost_usd: dimensionless }
//        out: { days: T, grams_per_day: M T^-1, capacity_grams: M, particulate_category: dimensionless, filters_for_job: dimensionless, total_cost_usd: dimensionless }
// (Loading rate (g per CFM-hour) is `M L^-3` (mass per
//  volume-time-product), so cfm `L^3 T^-1` * hours `T` * loading
//  rate = mass `M`. Days-of-filter-life = capacity `M` / grams-
//  per-day `M T^-1` = `T`. Job-days and filters_for_job are
//  dimensionless integer counts; monetary outputs are dimensionless
//  dollar aggregates per the §7.1 convention.)
export function computeHEPALife({ cfm, hours_per_day, particulate_category = "medium", capacity_grams = HEPA_LOADING.default_capacity_grams, job_days = 0, filter_cost_usd = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = Number(cfm) || 0;
  const h = Number(hours_per_day) || 0;
  const cap = Number(capacity_grams) || 0;
  const rate = HEPA_LOADING.loading_per_CFM_hour[particulate_category];
  if (rate === undefined) return { error: "Unknown particulate category." };
  if (c <= 0 || h <= 0 || cap <= 0) return { error: "Provide positive CFM, hours, capacity." };
  const grams_per_day = c * h * rate;
  const days = cap / grams_per_day;
  // v8 §C.6: full-job filter count + optional cost.
  const filters_for_job = job_days > 0 && days > 0 ? Math.ceil(job_days / days) : null;
  const total_cost_usd = filters_for_job !== null && filter_cost_usd > 0
    ? filters_for_job * filter_cost_usd : null;
  return {
    days, grams_per_day, capacity_grams: cap, particulate_category,
    filters_for_job, total_cost_usd,
  };
}

export const hepaLifeExample = {
  inputs: { cfm: 600, hours_per_day: 24, particulate_category: "medium" },
  expectedRange: { days: { min: 1, max: 5 } },
};

// --- Utility 89: Thermal Imager Delta-T Reference ---

export const THERMAL_DELTA_T_REFERENCE = [
  { scenario: "Moisture intrusion behind drywall", typical_delta_T_F: "2 to 5", note: "Wet substrate cools the surface relative to surrounding dry areas; difference grows with evaporation." },
  { scenario: "Missing or compressed insulation", typical_delta_T_F: "3 to 10", note: "Heat-flow gradient through the assembly creates a visible thermal pattern at the cavity boundary." },
  { scenario: "Active leak around penetration", typical_delta_T_F: "3 to 8", note: "Cool tail downstream of the leak path; reflects evaporative cooling and conductive loss." },
  { scenario: "Electrical hotspot (loose lug, overloaded conductor)", typical_delta_T_F: "10 to 50+", note: "Compare phase to phase under load; a single hot lug indicates a loose or oxidized connection." },
  { scenario: "Bearing or motor overheating", typical_delta_T_F: "10 to 30", note: "Compare to ambient and similar units; trend over time matters more than a single reading." },
];

// dims: in { args: dimensionless } out: { scenarios: dimensionless }
// (Pure categorical thermal-imager delta-T scenario reference.)
export function computeThermalDeltaTReference() {
  return { scenarios: THERMAL_DELTA_T_REFERENCE };
}

export const thermalDeltaTExample = {
  inputs: {},
  expected: { count: THERMAL_DELTA_T_REFERENCE.length },
};

// --- v2 view renderers ---

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderStandingWater(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 1 ft^3 = 7.48052 gal. gallons = area_ft^2 * depth_in / 12 * 7.48052. Water at 60 F ~ 62.4 lb/ft^3.";
  const a = makeNumber("Affected area (ft^2)", "sw-a", { step: "any", min: "0" });
  const d = makeNumber("Standing depth (in)", "sw-d", { step: "any", min: "0" });
  for (const f of [a, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "500"; d.input.value = "1"; update(); });
  const oG = makeOutputLine(outputRegion, "Volume", "sw-out-g");
  const oC = makeOutputLine(outputRegion, "Cubic feet", "sw-out-c");
  const oW = makeOutputLine(outputRegion, "Weight", "sw-out-w");
  const update = debounce(() => {
    const r = computeStandingWater({ area_ft2: Number(a.input.value) || 0, depth_in: Number(d.input.value) || 0 });
    if (r.error) { oG.textContent = r.error; oC.textContent = "-"; oW.textContent = "-"; return; }
    oG.textContent = fmt(r.gallons, 1) + " gal";
    oC.textContent = fmt(r.cubic_feet, 2) + " ft^3";
    oW.textContent = fmt(r.pounds, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const el of [a.input, d.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderNAMSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Required CFM = room volume * ACH / 60. Typical NAM unit sizes 500 / 1000 / 2000 CFM (manufacturer technical bulletins).";
  const v = makeNumber("Room volume (ft^3)", "nam-v", { step: "any", min: "0" });
  const ach = makeNumber("Target air changes per hour", "nam-ach", { step: "any", min: "0", value: "6" });
  ach.input.value = "6";
  for (const f of [v, ach]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { v.input.value = "8000"; ach.input.value = "6"; update(); });
  const oC = makeOutputLine(outputRegion, "Required CFM", "nam-out-c");
  const o500 = makeOutputLine(outputRegion, "Using 500 CFM units", "nam-out-500");
  const o1000 = makeOutputLine(outputRegion, "Using 1000 CFM units", "nam-out-1000");
  const o2000 = makeOutputLine(outputRegion, "Using 2000 CFM units", "nam-out-2000");
  const update = debounce(() => {
    const r = computeNAMSizing({
      room_volume_ft3: Number(v.input.value) || 0,
      target_ach: Number(ach.input.value) || 0,
    });
    if (r.error) { oC.textContent = r.error; o500.textContent = "-"; o1000.textContent = "-"; o2000.textContent = "-"; return; }
    oC.textContent = fmt(r.required_cfm, 0) + " CFM";
    const get = (cfm) => r.recommendations.find((x) => x.unit_cfm === cfm);
    o500.textContent = get(500).units_needed + " unit(s) (" + get(500).total_cfm + " CFM)";
    o1000.textContent = get(1000).units_needed + " unit(s) (" + get(1000).total_cfm + " CFM)";
    o2000.textContent = get(2000).units_needed + " unit(s) (" + get(2000).total_cfm + " CFM)";
  }, DEBOUNCE_MS);
  for (const el of [v.input, ach.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderHEPALife(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Estimated days = filter capacity (g) / (CFM * hours/day * loading rate). Loading rates from typical commercial HEPA pre-filter behavior.";
  const cfm = makeNumber("CFM", "hl-c", { step: "any", min: "0" });
  const hpd = makeNumber("Hours per day", "hl-h", { step: "any", min: "0", max: "24", value: "24" });
  hpd.input.value = "24";
  const cap = makeNumber("Filter capacity (g)", "hl-cap", { step: "any", min: "0", value: "1500" });
  cap.input.value = "1500";
  const cat = makeSelect("Particulate category", "hl-cat", [
    { value: "low", label: "Low (light dust)" },
    { value: "medium", label: "Medium (typical remediation)", selected: true },
    { value: "high", label: "High (heavy demolition)" },
  ]);
  // v8 §C.6: optional job duration + filter cost so the renderer can show
  // total filters needed for the full job and total cost.
  const jd = makeNumber("Job duration (days, optional)", "hl-jd", { step: "any", min: "0" });
  const fc = makeNumber("Filter cost ($, optional)", "hl-fc", { step: "any", min: "0" });
  for (const f of [cfm, hpd, cap, cat, jd, fc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "600"; hpd.input.value = "24"; cap.input.value = "1500"; cat.select.value = "medium"; update(); });
  const oD = makeOutputLine(outputRegion, "Estimated filter life", "hl-out-d");
  const oG = makeOutputLine(outputRegion, "Loading rate", "hl-out-g");
  const oFJ = makeOutputLine(outputRegion, "Filters for full job (if days supplied)", "hl-out-fj");
  const oTC = makeOutputLine(outputRegion, "Total filter cost", "hl-out-tc");
  const update = debounce(() => {
    const r = computeHEPALife({
      cfm: Number(cfm.input.value) || 0,
      hours_per_day: Number(hpd.input.value) || 0,
      capacity_grams: Number(cap.input.value) || 0,
      particulate_category: cat.select.value,
      job_days: Number(jd.input.value) || 0,
      filter_cost_usd: Number(fc.input.value) || 0,
    });
    if (r.error) { oD.textContent = r.error; oG.textContent = "-"; oFJ.textContent = "-"; oTC.textContent = "-"; return; }
    oD.textContent = fmt(r.days, 1) + " days";
    oG.textContent = fmt(r.grams_per_day, 1) + " g/day";
    oFJ.textContent = r.filters_for_job === null ? "-" : String(r.filters_for_job) + " filter(s) for the full job";
    oTC.textContent = r.total_cost_usd === null ? "-" : "$" + fmt(r.total_cost_usd, 2);
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, hpd.input, cap.input, cat.select, jd.input, fc.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderThermalDeltaT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summaries of typical surface-temperature differentials. NFA / OSHA training generally; not a substitute for vendor-specific imaging guidance.";
  const note = document.createElement("p");
  note.textContent = "Use these as orientation. Always compare like-to-like: same load, same ambient, same time of day. Trend matters more than a single reading.";
  inputRegion.appendChild(note);
  const dl = document.createElement("dl");
  for (const s of THERMAL_DELTA_T_REFERENCE) {
    const dt = document.createElement("dt");
    dt.textContent = s.scenario + " (" + s.typical_delta_T_F + " F)";
    dl.appendChild(dt);
    const dd = document.createElement("dd");
    dd.textContent = s.note;
    dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// =====================================================================
// v3 utilities (145, 146). See spec-v3.md section 2.4.
// =====================================================================

// --- Utility 145: Containment Air Balance ---
//
// Q (cfm) = 2610 * A (in^2) * sqrt(delta_P (in wc))
// (orifice flow form for negative-pressure containment).

// dims: in { containment_volume_ft3: L^3, target_dp_in_wc: M L^-1 T^-2, leakage_area_in2: L^2 }
//        out: { required_cfm: L^3 T^-1, recommendations: dimensionless }
// (Public orifice-flow form Q (cfm) = 2610 * A (in^2) * sqrt(dP
//  (in wc)). Pressure in inches-water-column is `M L^-1 T^-2`;
//  leakage area is `L^2`; the 2610 constant absorbs the cfm + in^2
//  + in-WC unit conversions. Required CFM surfaces as volume-per-
//  time `L^3 T^-1`.)
export function computeContainmentAirBalance({
  containment_volume_ft3 = 0, target_dp_in_wc = 0.02, leakage_area_in2 = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(containment_volume_ft3 > 0)) return { error: "Containment volume must be positive." };
  if (!(target_dp_in_wc > 0)) return { error: "Target pressure differential must be positive." };
  if (!(leakage_area_in2 >= 0)) return { error: "Leakage area must be non-negative." };
  const required_cfm = 2610 * leakage_area_in2 * Math.sqrt(target_dp_in_wc);
  // Recommend NAM count from typical 500 / 1000 / 2000 CFM units (reuse u87 logic).
  const recommendations = NAM_UNIT_SIZES_CFM.map((unit) => ({
    unit_cfm: unit,
    units_needed: Math.ceil(required_cfm / unit),
    total_cfm: Math.ceil(required_cfm / unit) * unit,
  }));
  return { required_cfm, recommendations };
}

export const containmentAirBalanceExample = {
  inputs: { containment_volume_ft3: 10000, target_dp_in_wc: 0.02, leakage_area_in2: 12 },
};

// --- Utility 146: Drying Chamber Air Turnover ---
//
// ACH = (air_mover_cfm + dehu_cfm) * 60 / chamber_volume_ft3

// dims: in { chamber_volume_ft3: L^3, target_ach: T^-1, air_mover_total_cfm: L^3 T^-1, dehu_cfm: L^3 T^-1 }
//        out: { actual_ach: T^-1, required_cfm: L^3 T^-1, gap_cfm: L^3 T^-1 }
// (ACH = total CFM `L^3 T^-1` * 60 (min/hr) / chamber volume `L^3`
//  = inverse-time `T^-1`. The 60 constant absorbs the min->hr leg
//  of the unit conversion.)
export function computeChamberTurnover({
  chamber_volume_ft3 = 0, target_ach = 60, air_mover_total_cfm = 0, dehu_cfm = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(chamber_volume_ft3 > 0)) return { error: "Chamber volume must be positive." };
  if (!(target_ach > 0)) return { error: "Target ACH must be positive." };
  if (air_mover_total_cfm < 0 || dehu_cfm < 0) return { error: "CFM values must be non-negative." };
  const total_cfm = air_mover_total_cfm + dehu_cfm;
  const actual_ach = (total_cfm * 60) / chamber_volume_ft3;
  const required_cfm = (target_ach * chamber_volume_ft3) / 60;
  const gap_cfm = Math.max(0, required_cfm - total_cfm);
  return { actual_ach, required_cfm, gap_cfm };
}

export const chamberTurnoverExample = {
  inputs: { chamber_volume_ft3: 1500, target_ach: 60, air_mover_total_cfm: 1200, dehu_cfm: 250 },
};

// --- v3 renderers ---

import {
  DEBOUNCE_MS as _D3, debounce as _deb3, makeNumber as _mn3,
  makeOutputLine as _mo3, attachExampleButton as _ae3, fmt as _fmt3,
} from "./ui-fields.js";

function renderContainmentAirBalance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public orifice-flow form Q (cfm) = 2610 * A (in^2) * sqrt(delta_P (in wc)). Engineering practice.";
  _ae3(inputRegion, () => fillExample(containmentAirBalanceExample.inputs));
  const v = _mn3("Containment volume (ft^3)", "cb-v", { step: "any", min: "0" });
  const dp = _mn3("Target pressure differential (in wc)", "cb-dp", { step: "any", min: "0", value: "0.02" });
  dp.input.value = "0.02";
  const a = _mn3("Estimated leakage area (in^2)", "cb-a", { step: "any", min: "0" });
  for (const f of [v, dp, a]) inputRegion.appendChild(f.wrap);
  const oR = _mo3(outputRegion, "Required net negative CFM", "cb-out-r");
  const oU = _mo3(outputRegion, "Recommended NAMs", "cb-out-u");
  function fillExample(x) { v.input.value = x.containment_volume_ft3; dp.input.value = x.target_dp_in_wc; a.input.value = x.leakage_area_in2; update(); }
  const update = _deb3(() => {
    const r = computeContainmentAirBalance({
      containment_volume_ft3: Number(v.input.value) || 0,
      target_dp_in_wc: Number(dp.input.value) || 0,
      leakage_area_in2: Number(a.input.value) || 0,
    });
    if (r.error) { oR.textContent = r.error; oU.textContent = "-"; return; }
    oR.textContent = _fmt3(r.required_cfm, 0) + " cfm";
    oU.textContent = r.recommendations.map((x) => x.units_needed + "x " + x.unit_cfm + " cfm").join(", ");
  }, _D3);
  for (const el of [v.input, dp.input, a.input]) el.addEventListener("input", update);
}

function renderChamberTurnover(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ACH = (air mover total cfm + dehu cfm) * 60 / chamber volume. Companion to NAM sizing.";
  _ae3(inputRegion, () => fillExample(chamberTurnoverExample.inputs));
  const v = _mn3("Chamber volume (ft^3)", "ct-v", { step: "any", min: "0" });
  const t = _mn3("Target ACH", "ct-t", { step: "any", min: "0", value: "60" });
  t.input.value = "60";
  const am = _mn3("Air mover total CFM", "ct-am", { step: "any", min: "0" });
  const dh = _mn3("Dehumidifier CFM", "ct-dh", { step: "any", min: "0" });
  for (const f of [v, t, am, dh]) inputRegion.appendChild(f.wrap);
  const oA = _mo3(outputRegion, "Actual ACH", "ct-out-a");
  const oR = _mo3(outputRegion, "Required CFM", "ct-out-r");
  const oG = _mo3(outputRegion, "Gap to target", "ct-out-g");
  function fillExample(x) { v.input.value = x.chamber_volume_ft3; t.input.value = x.target_ach; am.input.value = x.air_mover_total_cfm; dh.input.value = x.dehu_cfm; update(); }
  const update = _deb3(() => {
    const r = computeChamberTurnover({
      chamber_volume_ft3: Number(v.input.value) || 0, target_ach: Number(t.input.value) || 0,
      air_mover_total_cfm: Number(am.input.value) || 0, dehu_cfm: Number(dh.input.value) || 0,
    });
    if (r.error) { oA.textContent = r.error; oR.textContent = "-"; oG.textContent = "-"; return; }
    oA.textContent = _fmt3(r.actual_ach, 1) + " ACH";
    oR.textContent = _fmt3(r.required_cfm, 0) + " cfm";
    oG.textContent = _fmt3(r.gap_cfm, 0) + " cfm";
  }, _D3);
  for (const el of [v.input, t.input, am.input, dh.input]) el.addEventListener("input", update);
}

export const RESTORATION_RENDERERS = {
  "psychrometric": renderPsychrometric,
  "drying-goal": renderDryingGoal,
  "dehumidifier": renderDehumidifier,
  "air-movers": renderAirMovers,
  "water-classes": renderWaterClasses,
  "drying-times": renderDryingTimes,
  "mold": renderMold,
  "ppe": renderPPE,
  // v2
  "standing-water": renderStandingWater,
  "nam-sizing": renderNAMSizing,
  "hepa-filter-life": renderHEPALife,
  "thermal-delta-t": renderThermalDeltaT,
  // v3
  "containment-air-balance": renderContainmentAirBalance,
  "chamber-turnover": renderChamberTurnover,
};

// v9 §H.1 restoration psychrometric drying log.
// Multi-row drying-log tile: paired ambient / chamber readings per day,
// boundary-humidity test per IICRC S500. Returns GPP at each reading,
// a per-day boundary-pass flag, the chamber-GPP trend slope, and an
// estimated dry-down completion date.

function _v9_rGPP(T_F, RH) {
  const r = computePsychrometric({ temperature_F: T_F, RH_percent: RH });
  return r.GPP;
}

function _v9_linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0 };
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// dims: in { readings: dimensionless, drying_target_GPP: dimensionless }
//        out: { rows: dimensionless, boundary_pass_all: dimensionless, trend_GPP_per_day: T^-1, target_GPP: dimensionless, days_to_target: T, warnings: dimensionless }
// (Readings is a caller-typed dimensionless array of per-day
//  ambient/chamber observations. GPP is a dimensionless mass-
//  fraction; per-day GPP trend collapses to inverse-time `T^-1`.
//  Days-to-target carries the §7.1 base-token `T`. Boundary-pass
//  flags and warning strings are categorical (dimensionless).)
export function computeDryingLog({
  readings = [],
  drying_target_GPP = null,
} = {}) {
  if (!Array.isArray(readings) || readings.length === 0) return { error: "Provide at least one drying-log reading." };
  if (readings.length > 14) return { error: "Up to 14 readings supported (one per day for a typical drying job)." };
  for (const r of readings) {
    for (const k of ["ambient_T_F", "ambient_RH", "chamber_T_F", "chamber_RH"]) {
      if (!Number.isFinite(Number(r[k]))) return { error: "Reading missing or non-numeric field '" + k + "'." };
    }
    if (Number(r.ambient_RH) < 0 || Number(r.ambient_RH) > 100) return { error: "Ambient RH must be 0 - 100 percent." };
    if (Number(r.chamber_RH) < 0 || Number(r.chamber_RH) > 100) return { error: "Chamber RH must be 0 - 100 percent." };
  }

  const rows = readings.map((r, i) => {
    const a_GPP = _v9_rGPP(Number(r.ambient_T_F), Number(r.ambient_RH));
    const c_GPP = _v9_rGPP(Number(r.chamber_T_F), Number(r.chamber_RH));
    const boundary_pass = c_GPP < a_GPP; // chamber must trend below ambient.
    const day_index = Number.isFinite(Number(r.day_index)) ? Number(r.day_index) : i;
    return {
      day_index,
      ambient_GPP: a_GPP,
      chamber_GPP: c_GPP,
      boundary_pass,
      boundary_margin_GPP: a_GPP - c_GPP,
    };
  });

  const xs = rows.map((r) => r.day_index);
  const ys = rows.map((r) => r.chamber_GPP);
  const { slope, intercept } = _v9_linearRegression(xs, ys);
  // Slope in GPP per day index unit (typically days).
  const trend_GPP_per_day = slope;

  // Estimate dry-down completion: when chamber_GPP <= target.
  // target default: boundary check uses ambient floor at last reading minus 5 grains.
  const last = rows[rows.length - 1];
  const target = (drying_target_GPP !== null && Number.isFinite(Number(drying_target_GPP)))
    ? Number(drying_target_GPP)
    : Math.max(0, last.ambient_GPP - 5);
  let days_to_target = null;
  if (rows.length >= 2 && trend_GPP_per_day < 0) {
    // chamber_GPP(t) = intercept + slope * t. Solve for t when y = target.
    const t_target = (target - intercept) / slope;
    // DR-28 (D-1/C-1): a near-zero (or -0) slope can drive t_target to
    // +/-Infinity, which Math.max would pass through as a non-finite field.
    // Guard finiteness before the projection is used.
    if (Number.isFinite(t_target)) days_to_target = Math.max(0, t_target - last.day_index);
  }

  const warnings = [];
  const failing_days = rows.filter((r) => !r.boundary_pass);
  if (failing_days.length > 0) warnings.push(failing_days.length + " day(s) failed the boundary-humidity test (chamber GPP at or above ambient GPP); check equipment placement and exhaust per IICRC S500.");
  if (rows.length >= 2 && trend_GPP_per_day >= 0) warnings.push("Chamber GPP trend is flat or rising; drying is not progressing - re-evaluate the drying plan.");
  if (rows.length < 2) warnings.push("Single reading: no trend slope or dry-down estimate available. Add additional daily readings to compute the trend.");

  return {
    rows,
    boundary_pass_all: failing_days.length === 0,
    trend_GPP_per_day,
    target_GPP: target,
    days_to_target,
    warnings,
  };
}

export const dryingLogExample = {
  // Spec-v9 §H.1 worked example: 7-day drying log showing chamber GPP
  // trending below ambient GPP throughout. Ambient at warm-humid summer
  // conditions; chamber heated and dehumidified so chamber GPP stays
  // below ambient on day 0 and trends down across the week.
  inputs: {
    readings: [
      { day_index: 0, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 90, chamber_RH: 30 },
      { day_index: 1, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 90, chamber_RH: 27 },
      { day_index: 2, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 88, chamber_RH: 24 },
      { day_index: 3, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 86, chamber_RH: 22 },
      { day_index: 4, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 84, chamber_RH: 20 },
      { day_index: 5, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 82, chamber_RH: 18 },
      { day_index: 6, ambient_T_F: 78, ambient_RH: 60, chamber_T_F: 80, chamber_RH: 16 },
    ],
  },
};

function _v9d_renderDryingLog(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per IICRC S500-2021 (Standard for Professional Water Damage Restoration). IICRC certification governs. Boundary-humidity test - chamber GPP must trend below ambient GPP for drying to be in progress - is the public method; the standard governs acceptance. Free at iicrc.org for TOC; full standard is licensed.";

  const help = document.createElement("p");
  help.className = "tile-help";
  help.textContent = "Enter daily readings as JSON: array of { day_index, ambient_T_F, ambient_RH, chamber_T_F, chamber_RH }. Up to 14 rows.";
  inputRegion.appendChild(help);

  const log = makeText("Drying log (JSON array)", "dl-log", { rows: "6" });
  log.input.value = JSON.stringify(dryingLogExample.inputs.readings, null, 2);
  inputRegion.appendChild(log.wrap);
  const target = makeNumber("Drying target (grains/lb; blank = ambient GPP minus 5)", "dl-target", { step: "any", min: "0" });
  inputRegion.appendChild(target.wrap);

  attachExampleButton(inputRegion, () => {
    log.input.value = JSON.stringify(dryingLogExample.inputs.readings, null, 2);
    target.input.value = "";
    update();
  });

  const oBP = makeOutputLine(outputRegion, "Boundary-pass (all days)", "dl-out-bp");
  const oSL = makeOutputLine(outputRegion, "Chamber GPP trend (GPP / day)", "dl-out-sl");
  const oTG = makeOutputLine(outputRegion, "Target GPP", "dl-out-tg");
  const oDT = makeOutputLine(outputRegion, "Days remaining to target", "dl-out-dt");
  const oTbl = makeOutputLine(outputRegion, "Per-day rows", "dl-out-tbl");
  const oW = makeOutputLine(outputRegion, "Notes", "dl-out-w");

  const update = debounce(() => {
    let readings;
    try {
      readings = JSON.parse(log.input.value);
    } catch {
      oBP.textContent = "Drying log must be valid JSON.";
      oSL.textContent = ""; oTG.textContent = ""; oDT.textContent = ""; oTbl.textContent = ""; oW.textContent = "";
      return;
    }
    const r = computeDryingLog({
      readings,
      drying_target_GPP: target.input.value === "" ? null : Number(target.input.value),
    });
    if (r.error) {
      oBP.textContent = r.error;
      oSL.textContent = ""; oTG.textContent = ""; oDT.textContent = ""; oTbl.textContent = ""; oW.textContent = "";
      return;
    }
    oBP.textContent = r.boundary_pass_all ? "PASS - chamber GPP below ambient on every reading" : "FAIL - chamber GPP at or above ambient on at least one reading";
    oSL.textContent = fmt(r.trend_GPP_per_day, 2) + " GPP / day";
    oTG.textContent = fmt(r.target_GPP, 1) + " GPP";
    oDT.textContent = r.days_to_target == null ? "n/a (trend not negative)" : fmt(r.days_to_target, 1) + " day(s)";
    oTbl.textContent = r.rows.map((row) => "day " + row.day_index + ": amb " + fmt(row.ambient_GPP, 1) + " / chmb " + fmt(row.chamber_GPP, 1) + (row.boundary_pass ? " (pass)" : " (FAIL)")).join("; ");
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  log.input.addEventListener("input", update);
  target.input.addEventListener("input", update);
}

RESTORATION_RENDERERS["drying-log"] = _v9d_renderDryingLog;

// --- spec-v16 D.5 Equipment power draw vs available circuit capacity --

// Representative running-current nameplate values (amps at 120 V) for
// common water-damage drying equipment. These are typical published
// cut-sheet values (Phoenix / Dri-Eaz / B-Air class units); the user
// overrides per the actual nameplate on the unit in hand. Inlined (not a
// data shard): the values are user-overridable defaults, not a fixed
// reference table.
export const RESTORATION_EQUIPMENT_AMPS = {
  lgr_dehu: { amps: 8.5, label: "LGR refrigerant dehumidifier" },
  air_mover: { amps: 2.5, label: "1/4 HP air mover" },
  hepa_500: { amps: 3.5, label: "HEPA air scrubber (500 CFM)" },
  heat_dryer: { amps: 12, label: "Heat-drying / heat-pump unit" },
};

// NEC 210.20(A): a branch circuit supplying a continuous load (3 hr or
// more, which drying equipment is) must be sized so the continuous load
// does not exceed 80% of the breaker rating.
const _V16D_CONTINUOUS_FACTOR = 0.8;

// dims: in { args: dimensionless } out: { total_amps: I, continuous_limit_A: I, circuits_required: dimensionless, total_va: M L^2 T^-3 }
export function computeEquipmentCircuitLoad({
  qty_lgr_dehu = 0,
  qty_air_mover = 0,
  qty_hepa_500 = 0,
  qty_heat_dryer = 0,
  other_amps = 0,
  breaker_A = 20,
  voltage = 120,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const counts = {
    lgr_dehu: Math.max(0, Math.floor(Number(qty_lgr_dehu) || 0)),
    air_mover: Math.max(0, Math.floor(Number(qty_air_mover) || 0)),
    hepa_500: Math.max(0, Math.floor(Number(qty_hepa_500) || 0)),
    heat_dryer: Math.max(0, Math.floor(Number(qty_heat_dryer) || 0)),
  };
  const other = Math.max(0, Number(other_amps) || 0);
  const breaker = Number(breaker_A) || 0;
  const volts = Number(voltage) || 120;
  if (!(breaker > 0)) return { error: "Enter a positive branch-circuit breaker rating (A)." };

  let total_amps = other;
  const breakdown = [];
  let max_unit_amps = 0;
  for (const [key, n] of Object.entries(counts)) {
    if (n <= 0) continue;
    const a = RESTORATION_EQUIPMENT_AMPS[key].amps;
    total_amps += n * a;
    max_unit_amps = Math.max(max_unit_amps, a);
    breakdown.push({ key, label: RESTORATION_EQUIPMENT_AMPS[key].label, qty: n, unit_amps: a, group_amps: n * a });
  }
  if (total_amps <= 0) return { error: "Enter at least one piece of equipment (or an other-load amperage)." };

  const continuous_limit_A = _V16D_CONTINUOUS_FACTOR * breaker;
  const circuits_required = Math.ceil(total_amps / continuous_limit_A);
  const total_va = total_amps * volts;
  // Utilization if every unit shared one breaker (the field shortcut to avoid).
  const single_circuit_utilization = total_amps / breaker;

  const warnings = [];
  // The headline NEC check: a continuous load above 80% of the breaker
  // cannot share one circuit.
  if (total_amps > continuous_limit_A + 1e-9) {
    warnings.push("Total continuous draw " + total_amps.toFixed(1) + " A exceeds the " + continuous_limit_A.toFixed(1) + " A (80% of " + breaker + " A) NEC 210.20(A) limit for one circuit; spread the equipment across " + circuits_required + " circuits.");
  }
  // A single unit that cannot even fit on its own dedicated circuit.
  if (max_unit_amps > continuous_limit_A + 1e-9) {
    warnings.push("A single unit draws " + max_unit_amps.toFixed(1) + " A, above the " + continuous_limit_A.toFixed(1) + " A continuous limit of one " + breaker + " A circuit; it needs a larger dedicated circuit.");
  }

  return {
    breakdown,
    other_amps: other,
    breaker_A: breaker,
    voltage: volts,
    total_amps,
    continuous_limit_A,
    circuits_required,
    total_va,
    single_circuit_utilization,
    max_unit_amps,
    warnings,
  };
}

export const equipmentCircuitLoadExample = {
  // 4 air movers (4 x 2.5 = 10 A) + 1 LGR dehumidifier (8.5 A) = 18.5 A
  // on 20 A / 120 V circuits. NEC 210.20(A) continuous limit = 0.8 x 20
  // = 16 A per circuit, so the set needs 2 circuits (18.5 / 16 -> 2).
  inputs: { qty_air_mover: 4, qty_lgr_dehu: 1, breaker_A: 20, voltage: 120 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16d_renderEquipmentCircuitLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: total draw = sum(quantity x nameplate amps); NEC 2023 210.20(A) limits a continuous load to 80% of the branch-circuit rating, so circuits required = ceil(total / (0.8 x breaker)). Nameplate amps are representative cut-sheet defaults (Phoenix / Dri-Eaz / B-Air class); the actual unit nameplate governs. Free at nfpa.org/freeaccess for NFPA 70 (NEC).";
  const lgr = makeNumber("LGR dehumidifiers (8.5 A)", "ec5-lgr", { step: "1", min: "0", value: "1" });
  const am = makeNumber("Air movers (2.5 A)", "ec5-am", { step: "1", min: "0", value: "4" });
  const hepa = makeNumber("HEPA scrubbers, 500 CFM (3.5 A)", "ec5-hepa", { step: "1", min: "0", value: "0" });
  const heat = makeNumber("Heat-drying units (12 A)", "ec5-heat", { step: "1", min: "0", value: "0" });
  const other = makeNumber("Other continuous load (A, optional)", "ec5-other", { step: "any", min: "0" });
  const breaker = makeSelect("Breaker rating (A)", "ec5-breaker", [
    { value: "15", label: "15 A" },
    { value: "20", label: "20 A", selected: true },
    { value: "30", label: "30 A" },
  ]);
  const volts = makeSelect("Circuit voltage", "ec5-volts", [
    { value: "120", label: "120 V", selected: true },
    { value: "240", label: "240 V" },
  ]);
  for (const f of [lgr, am, hepa, heat, other, breaker, volts]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    lgr.input.value = "1"; am.input.value = "4"; hepa.input.value = "0"; heat.input.value = "0";
    other.input.value = ""; breaker.select.value = "20"; volts.select.value = "120"; update();
  });

  const oTotal = makeOutputLine(outputRegion, "Total continuous draw", "ec5-out-total");
  const oLimit = makeOutputLine(outputRegion, "Continuous limit / circuit", "ec5-out-limit");
  const oCirc = makeOutputLine(outputRegion, "Circuits required", "ec5-out-circ");
  const oNote = makeOutputLine(outputRegion, "Notes", "ec5-out-note");

  const update = debounce(() => {
    const r = computeEquipmentCircuitLoad({
      qty_lgr_dehu: lgr.input.value === "" ? 0 : Number(lgr.input.value),
      qty_air_mover: am.input.value === "" ? 0 : Number(am.input.value),
      qty_hepa_500: hepa.input.value === "" ? 0 : Number(hepa.input.value),
      qty_heat_dryer: heat.input.value === "" ? 0 : Number(heat.input.value),
      other_amps: other.input.value === "" ? 0 : Number(other.input.value),
      breaker_A: Number(breaker.select.value),
      voltage: Number(volts.select.value),
    });
    if (r.error) { oTotal.textContent = r.error; oLimit.textContent = "-"; oCirc.textContent = "-"; oNote.textContent = ""; return; }
    oTotal.textContent = fmt(r.total_amps, 1) + " A (" + fmt(r.total_va, 0) + " VA at " + r.voltage + " V)";
    oLimit.textContent = fmt(r.continuous_limit_A, 1) + " A (80% of " + r.breaker_A + " A)";
    oCirc.textContent = r.circuits_required + " circuit(s) at " + r.breaker_A + " A";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Fits on " + r.circuits_required + " circuit(s) within the NEC 210.20(A) continuous limit.";
  }, DEBOUNCE_MS);
  for (const el of [lgr.input, am.input, hepa.input, heat.input, other.input]) el.addEventListener("input", update);
  for (const s of [breaker.select, volts.select]) s.addEventListener("change", update);
}

RESTORATION_RENDERERS["equipment-power-draw"] = _v16d_renderEquipmentCircuitLoad;

// =====================================================================
// v23 shared simple-renderer (select + number fields). Non-exported.
// =====================================================================
function _v23SimpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select" ? makeSelect(f.label, f.id, f.options) : makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) { if (f.kind === "select") field.select.value = f.default; else field.input.value = String(f.default); }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key]; else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = f.kind === "select" ? fields[f.key].select.value : (Number(fields[f.key].input.value) || 0);
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) (f.kind === "select" ? fields[f.key].select : fields[f.key].input).addEventListener("input", update);
  };
}

// =====================================================================
// v23 D.1: Drying-chamber fresh-air / CO2 buildup (ASHRAE 62.1 mass balance)
// =====================================================================
// dims: in { containment_volume_ft3: dimensionless, co2_generation_cfm: dimensionless, target_indoor_ppm: dimensionless, outdoor_ppm: dimensionless } out: { fresh_air_cfm: dimensionless, ach: dimensionless, above_target: dimensionless }
export function computeDryingChamberCO2({ containment_volume_ft3 = 0, co2_generation_cfm = 0, target_indoor_ppm = 1000, outdoor_ppm = 420 } = {}) {
  const V = Number(containment_volume_ft3) || 0;
  const gen = Number(co2_generation_cfm) || 0;
  const Ci = Number(target_indoor_ppm) || 0;
  const Co = Number(outdoor_ppm) || 0;
  if (!(V > 0 && Number.isFinite(V))) return { error: "Containment volume must be positive (ft^3)." };
  if (!(gen > 0 && Number.isFinite(gen))) return { error: "CO2 generation must be positive (cfm of CO2)." };
  if (!(Number.isFinite(Ci) && Number.isFinite(Co) && Ci > Co)) return { error: "Target indoor CO2 must exceed outdoor CO2 (no driving gradient otherwise)." };
  const fresh_air_cfm = (gen * 1e6) / (Ci - Co);
  const ach = (fresh_air_cfm * 60) / V;
  const above_target = Ci > 1000;
  return { fresh_air_cfm, ach, above_target };
}
export const dryingChamberCO2Example = { inputs: { containment_volume_ft3: 2000, co2_generation_cfm: 0.06, target_indoor_ppm: 1000, outdoor_ppm: 400 } };
const renderDryingChamberCO2 = _v23SimpleRenderer({
  citation: "Citation: Per the ASHRAE 62.1 ventilation-rate mass-balance basis (Q_fresh = generation / (C_indoor - C_outdoor); ACH = Q*60 / V). Complements the chamber-turnover tile (which sizes air movers, not fresh air). IICRC S500 governs the drying plan.",
  example: dryingChamberCO2Example.inputs,
  fields: [
    { key: "containment_volume_ft3", label: "Containment volume (ft^3)", kind: "number" },
    { key: "co2_generation_cfm", label: "CO2 generation (cfm of CO2)", kind: "number" },
    { key: "target_indoor_ppm", label: "Target indoor CO2 (ppm)", kind: "number", default: 1000 },
    { key: "outdoor_ppm", label: "Outdoor CO2 (ppm)", kind: "number", default: 420 },
  ],
  outputs: [
    { key: "fresh", id: "dcc-out-f", label: "Required fresh air", value: (r) => fmt(r.fresh_air_cfm, 1) + " cfm" + (r.above_target ? " (target > 1000 ppm - increase fresh air)" : "") },
    { key: "ach", id: "dcc-out-a", label: "Air changes per hour", value: (r) => fmt(r.ach, 2) + " ACH" },
  ],
  compute: computeDryingChamberCO2,
});
RESTORATION_RENDERERS["drying-chamber-co2"] = renderDryingChamberCO2;

// ===========================================================================
// spec-v20 Phase D - two new restoration tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 D.1: Moisture removed by grain depression (`grains-removed`) ---
// dG = inlet - outlet; mass air = CFM*60/13.33 lb-dry-air/hr; water lb/hr =
// mass-air * dG / 7000; gal = lb/hr * hours / 8.345.
// dims: in { cfm: L^3*T^-1, inlet_gpp: dimensionless, outlet_gpp: dimensionless, hours: dimensionless } out: { water_lb_hr: M*T^-1, water_gal: L^3 }
export function computeGrainsRemoved({ cfm = 0, inlet_gpp = 0, outlet_gpp = 0, hours = 0 } = {}) {
  const CFM = Number(cfm) || 0;
  const inG = Number(inlet_gpp) || 0;
  const outG = Number(outlet_gpp) || 0;
  const hrs = Number(hours) || 0;
  if (!(CFM > 0 && Number.isFinite(CFM))) return { error: "Process airflow must be positive (CFM)." };
  if (!Number.isFinite(inG) || !Number.isFinite(outG)) return { error: "Grain readings must be finite (GPP)." };
  if (outG >= inG) return { error: "Outlet GPP must be below inlet GPP (sensor/placement error otherwise)." };
  if (!(hrs >= 0 && Number.isFinite(hrs))) return { error: "Run hours must be non-negative." };
  const dG = inG - outG;
  const massAir = CFM * 60 / 13.33; // lb dry air per hour
  const lbHr = massAir * dG / 7000;
  const pintsHr = lbHr * 8 / 8.345;
  const gal = lbHr * hrs / 8.345;
  return {
    grain_depression_gpp: dG,
    water_lb_hr: Number.isFinite(lbHr) ? lbHr : null,
    water_pints_hr: Number.isFinite(pintsHr) ? pintsHr : null,
    water_gal: Number.isFinite(gal) ? gal : null,
    note: "First-principles psychrometric mass balance (7000 grains/lb; ~13.33 ft3/lb dry air). Verifies in-situ performance from measured inlet/outlet readings, not the AHAM rating. The 13.33 humid-volume constant drifts at high temperature. IICRC S500 governs the drying plan.",
  };
}
export const grainsRemovedExample = { inputs: { cfm: 250, inlet_gpp: 90, outlet_gpp: 50, hours: 24 } };

function renderGrainsRemoved(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles psychrometric mass balance (7000 grains/lb; ~13.33 ft3/lb dry air at standard conditions). IICRC S500 grain-depression field method, by name. Distinct from the psychrometric and dehumidifier-sizing tiles - this verifies in-situ performance from measured inlet/outlet readings. IICRC S500 governs the drying plan.";
  const cfm = makeNumber("Process airflow (CFM)", "gr-cfm", { step: "any", min: "0", value: "250" });
  cfm.input.value = "250";
  const inG = makeNumber("Inlet grains-per-pound (GPP)", "gr-in", { step: "any", min: "0", value: "90" });
  inG.input.value = "90";
  const outG = makeNumber("Outlet grains-per-pound (GPP)", "gr-out", { step: "any", min: "0", value: "50" });
  outG.input.value = "50";
  const hrs = makeNumber("Run hours", "gr-hrs", { step: "any", min: "0", value: "24" });
  hrs.input.value = "24";
  for (const f of [cfm, inG, outG, hrs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "250"; inG.input.value = "90"; outG.input.value = "50"; hrs.input.value = "24"; update(); });
  const oDG = makeOutputLine(outputRegion, "Grain depression", "gr-out-dg");
  const oRate = makeOutputLine(outputRegion, "Water removal rate", "gr-out-rate");
  const oGal = makeOutputLine(outputRegion, "Total water over run", "gr-out-gal");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrainsRemoved({ cfm: readNum(cfm.input), inlet_gpp: readNum(inG.input), outlet_gpp: readNum(outG.input), hours: readNum(hrs.input) });
    if (r.error) { oDG.textContent = r.error; oRate.textContent = ""; oGal.textContent = ""; return; }
    oDG.textContent = fmt(r.grain_depression_gpp, 1) + " GPP";
    oRate.textContent = fmt(r.water_lb_hr, 2) + " lb/hr (" + fmt(r.water_pints_hr, 2) + " pints/hr)";
    oGal.textContent = fmt(r.water_gal, 1) + " gal";
  }, DEBOUNCE_MS);
  for (const f of [cfm.input, inG.input, outG.input, hrs.input]) f.addEventListener("input", update);
}
RESTORATION_RENDERERS["grains-removed"] = renderGrainsRemoved;

// --- v20 D.2: Evaporation load / dehu demand (`evaporation-load`) ---
// load_gal = area * load_factor(class); lb = gal * 8.345; first-24h pints =
// load_gal * 8 * fraction; suggested AHAM pints = target / derating.
const WATER_CLASS_LOAD_GAL_FT2 = { 1: 0.02, 2: 0.04, 3: 0.08, 4: 0.1 };
// dims: in { area_ft2: L^2, water_class: dimensionless, ceiling_ft: L, load_factor: dimensionless, first24_fraction: dimensionless, derating: dimensionless } out: { load_gal: L^3, aham_pints: dimensionless }
export function computeEvaporationLoad({ area_ft2 = 0, water_class = 3, ceiling_ft = 8, load_factor = 0, first24_fraction = 0.4, derating = 0.5 } = {}) {
  const area = Number(area_ft2) || 0;
  const cls = Math.round(Number(water_class) || 0);
  let lf = Number(load_factor) || 0;
  const frac = Number(first24_fraction);
  const der = Number(derating);
  if (!(area > 0 && Number.isFinite(area))) return { error: "Affected floor area must be positive (ft2)." };
  if (!(cls >= 1 && cls <= 4)) return { error: "Water class must be 1-4." };
  if (!(lf > 0)) lf = WATER_CLASS_LOAD_GAL_FT2[cls];
  if (!(lf > 0 && Number.isFinite(lf))) return { error: "Load factor must be positive (gal/ft2)." };
  if (!(frac > 0 && frac <= 1)) return { error: "First-24-hour fraction must be in (0, 1]." };
  if (!(der > 0 && der <= 1)) return { error: "Dehumidifier derating factor must be in (0, 1]." };
  const loadGal = area * lf;
  const loadLb = loadGal * 8.345;
  const first24Pints = loadGal * 8 * frac;
  const ahamPints = first24Pints / der;
  return {
    load_gal: Number.isFinite(loadGal) ? loadGal : null,
    load_lb: Number.isFinite(loadLb) ? loadLb : null,
    first24_pints: Number.isFinite(first24Pints) ? first24Pints : null,
    aham_pints: Number.isFinite(ahamPints) ? ahamPints : null,
    load_factor_used: lf,
    note: "Per-class load factors are editable field estimates - the output is only as good as the class assessment. Class 4 (bound water) is non-linear in area. Ignores HVAC / open-air contribution. IICRC S500 governs.",
  };
}
export const evaporationLoadExample = { inputs: { area_ft2: 800, water_class: 3, ceiling_ft: 8, load_factor: 0.08, first24_fraction: 0.4, derating: 0.5 } };

function renderEvaporationLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the IICRC S500 water-class framework and evaporation-load drying principle, by name (not reproduced); per-class load factors are editable field defaults the user tunes to the standard and the job. Class 4 (bound water) is non-linear in area. IICRC S500 governs.";
  const area = makeNumber("Affected floor area (ft2)", "el-area", { step: "any", min: "0", value: "800" });
  area.input.value = "800";
  const cls = makeSelect("Water class", "el-cls", [1, 2, 3, 4].map((c) => ({ value: String(c), label: "Class " + c, selected: c === 3 })));
  const lf = makeNumber("Load factor (gal/ft2, blank = class default)", "el-lf", { step: "any", min: "0" });
  const frac = makeNumber("First-24-hour fraction (0-1)", "el-frac", { step: "any", min: "0", max: "1", value: "0.4" });
  frac.input.value = "0.4";
  const der = makeNumber("Dehumidifier derating factor (0-1)", "el-der", { step: "any", min: "0", max: "1", value: "0.5" });
  der.input.value = "0.5";
  for (const f of [area, cls, lf, frac, der]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "800"; cls.select.value = "3"; lf.input.value = ""; frac.input.value = "0.4"; der.input.value = "0.5"; update(); });
  const oLoad = makeOutputLine(outputRegion, "Initial water load", "el-out-load");
  const o24 = makeOutputLine(outputRegion, "First-24-hour removal target", "el-out-24");
  const oAHAM = makeOutputLine(outputRegion, "Suggested AHAM pints", "el-out-aham");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEvaporationLoad({ area_ft2: readNum(area.input), water_class: Number(cls.select.value), load_factor: readNum(lf.input), first24_fraction: frac.input.value === "" ? 0.4 : readNum(frac.input), derating: der.input.value === "" ? 0.5 : readNum(der.input) });
    if (r.error) { oLoad.textContent = r.error; o24.textContent = ""; oAHAM.textContent = ""; return; }
    oLoad.textContent = fmt(r.load_gal, 1) + " gal (" + fmt(r.load_lb, 0) + " lb)";
    o24.textContent = fmt(r.first24_pints, 1) + " pints";
    oAHAM.textContent = fmt(r.aham_pints, 0) + " AHAM pints";
  }, DEBOUNCE_MS);
  for (const f of [area.input, cls.select, lf.input, frac.input, der.input]) f.addEventListener("input", update);
}
RESTORATION_RENDERERS["evaporation-load"] = renderEvaporationLoad;

// =====================================================================
// spec-v58: Mold remediation scoping (Group D).
// =====================================================================

// --- mold-remediation-level: Remediation Scope by Affected Area ---
//
// Deterministic EPA 402-K-01-001 area band + NYC DOHMH level (Level V on
// any HVAC involvement) -> containment, PPE tier, IEP, and clearance
// recommendations. Scope guidance, not a hazard judgment.
// dims: in { affected_area_ft2: L^2, porous: dimensionless, hvac_involved: dimensionless, vulnerable_occupant: dimensionless }
//        out: { band: dimensionless, level: dimensionless, containment: dimensionless, ppe_tier: dimensionless, iep_assess: dimensionless, clearance: dimensionless }
// (Affected area carries L^2; the porous / HVAC / vulnerable flags and
//  every output token are categorical. A bounded five-band lookup, not a
//  measurement.)
export function computeMoldRemediationLevel({ affected_area_ft2, porous = false, hvac_involved = false, vulnerable_occupant = false } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(affected_area_ft2) || 0;
  if (!(area > 0 && Number.isFinite(area))) return { error: "Affected area must be positive (ft2)." };
  const porousB = !!porous, hvac = !!hvac_involved, vuln = !!vulnerable_occupant;
  // EPA 402-K-01-001 area bands.
  const band = area < 10 ? "small" : area <= 100 ? "medium" : "large";
  // NYC DOHMH levels; HVAC-system involvement overrides to Level V.
  let level;
  if (hvac) level = "Level V";
  else if (area < 10) level = "Level I";
  else if (area <= 30) level = "Level II";
  else if (area <= 100) level = "Level III";
  else level = "Level IV";
  const full = band === "large" || hvac || (band === "medium" && porousB);
  const containment = full
    ? "full (decontamination chamber + negative air)"
    : "limited (poly sheeting + negative air)";
  const ppe_tier = band === "large"
    ? "full-face respirator / PAPR, suit, gloves"
    : band === "medium"
    ? "half-face P100 respirator, suit, gloves, eye protection"
    : "N95 respirator, gloves, eye protection";
  const iep_assess = (area > 100 || hvac || vuln) ? "recommended" : "optional";
  const clearance = (band !== "small" || hvac || vuln) ? "recommended" : "optional";
  return {
    band, level, containment, ppe_tier, iep_assess, clearance,
    note: "Scope guidance keyed to EPA 402-K-01-001, the NYC DOHMH guidelines, and IICRC S520 - not a substitute for an assessment. Sum visible plus reasonably suspected growth; the highest moisture reading and the protocol govern the cut line. Hidden Condition 3 growth can exceed the visible estimate; a vulnerable occupant raises the recommended controls independent of area. HVAC involvement overrides to Level V.",
  };
}

export const moldRemediationLevelExample = {
  inputs: { affected_area_ft2: 45, porous: true, hvac_involved: false, vulnerable_occupant: false },
  expected: { band: "medium", level: "Level III" },
};

function renderMoldRemediationLevel(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EPA 402-K-01-001 (Mold Remediation in Schools and Commercial Buildings, free at epa.gov/mold) area bands; NYC DOHMH Guidelines on Assessment and Remediation of Fungi levels; IICRC S520-2024 (licensed) by name. Scope guidance; the protocol of the assessor and remediator governs.";
  const area = makeNumber("Affected area (ft2, summed visible + suspected)", "mrl-area", { step: "any", min: "0" });
  const porous = makeCheckbox("Porous material present (drywall, carpet, ceiling tile, insulation)", "mrl-porous");
  const hvac = makeCheckbox("Growth in or fed by the HVAC system", "mrl-hvac");
  const vuln = makeCheckbox("Vulnerable occupant (infant, elderly, asthmatic, immunocompromised)", "mrl-vuln");
  for (const f of [area, porous, hvac, vuln]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "45"; porous.input.checked = true; hvac.input.checked = false; vuln.input.checked = false; update(); });
  const oBand = makeOutputLine(outputRegion, "EPA band", "mrl-out-band");
  const oLevel = makeOutputLine(outputRegion, "NYC DOHMH level", "mrl-out-level");
  const oCont = makeOutputLine(outputRegion, "Containment", "mrl-out-cont");
  const oPPE = makeOutputLine(outputRegion, "PPE tier", "mrl-out-ppe");
  const oIEP = makeOutputLine(outputRegion, "Independent assessor", "mrl-out-iep");
  const oClr = makeOutputLine(outputRegion, "Post-remediation verification", "mrl-out-clr");
  const update = debounce(() => {
    const r = computeMoldRemediationLevel({
      affected_area_ft2: Number(area.input.value) || 0,
      porous: porous.input.checked, hvac_involved: hvac.input.checked, vulnerable_occupant: vuln.input.checked,
    });
    if (r.error) { oBand.textContent = r.error; for (const o of [oLevel, oCont, oPPE, oIEP, oClr]) o.textContent = "-"; return; }
    oBand.textContent = r.band; oLevel.textContent = r.level; oCont.textContent = r.containment;
    oPPE.textContent = r.ppe_tier; oIEP.textContent = r.iep_assess; oClr.textContent = r.clearance;
  }, DEBOUNCE_MS);
  for (const el of [area.input, porous.input, hvac.input, vuln.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["mold-remediation-level"] = renderMoldRemediationLevel;

// --- mold-conditions: IICRC S520 Condition Reference ---
//
// Reference page, no compute, parallel to water-classes. The three S520
// Conditions in plain English; remediation returns Condition 2 and 3 to 1.
export const MOLD_CONDITIONS = [
  { name: "Condition 1 (normal fungal ecology)", summary: "An indoor environment that may have settled spores, fungal fragments, or traces of growth whose identity, location, and quantity are reflective of a normal fungal ecology for a similar indoor environment. This is the goal state of remediation." },
  { name: "Condition 2 (settled spores)", summary: "An indoor environment primarily contaminated with settled spores dispersed directly or indirectly from a Condition 3 area. No actual growth, but an elevated settled-spore load." },
  { name: "Condition 3 (actual growth)", summary: "An indoor environment contaminated with actual mold growth and associated spores. Growth may be active or dormant, visible or hidden." },
];

// dims: in { args: dimensionless } out: { conditions: dimensionless, goal: dimensionless }
// (Pure categorical IICRC S520-2024 Condition reference lookup; no compute.)
export function computeMoldConditions() {
  return { conditions: MOLD_CONDITIONS, goal: "Goal of remediation: return Condition 2 and Condition 3 areas to Condition 1." };
}

function renderMoldConditions(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S520-2024 (Standard for Professional Mold Remediation, licensed) Condition framework, named by section; original plain-English summaries by the project author. The standard text is not reproduced.";
  const r = computeMoldConditions();
  const sec = document.createElement("section");
  const h = document.createElement("h2"); h.textContent = "IICRC S520 Conditions"; sec.appendChild(h);
  const dl = document.createElement("dl");
  for (const c of r.conditions) {
    const dt = document.createElement("dt"); dt.textContent = c.name; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = c.summary; dl.appendChild(dd);
  }
  sec.appendChild(dl); outputRegion.appendChild(sec);
  const p = document.createElement("p"); p.textContent = r.goal; outputRegion.appendChild(p);
}
RESTORATION_RENDERERS["mold-conditions"] = renderMoldConditions;

// =====================================================================
// spec-v59: Remediation chemistry and air sampling (Group D).
// =====================================================================

// --- antimicrobial-dilution: Antimicrobial Mix and Coverage ---
//
// finished_gal = area / coverage; conc_oz_per_gal = oz_per_gal (mode A) or
// 128/(N+1) (mode B, 1:N by volume; 128 fl oz per gallon); concentrate_oz =
// finished_gal * conc_oz_per_gal; water_gal = finished_gal - conc_oz/128;
// tanks = ceil(finished_gal / tank); per-tank conc = conc_oz_per_gal * tank.
// dims: in { affected_area_ft2: L^2, coverage_ft2_per_gal: L^-1, tank_size_gal: L^3, mode: dimensionless, oz_per_gal: dimensionless, ratio_N: dimensionless }
//        out: { finished_gal: L^3, water_gal: L^3, concentrate_oz: dimensionless, per_tank_conc_oz: dimensionless, tanks_needed: dimensionless }
// (Area L^2 over coverage L^-1 = finished volume L^3; fluid-ounce amounts are
//  marked dimensionless (the 128 fl oz/gal constant absorbs the unit), the
//  evaporation-load pints precedent.)
export function computeAntimicrobialDilution({ affected_area_ft2, coverage_ft2_per_gal, tank_size_gal, mode = "oz_per_gal", oz_per_gal = 0, ratio_N = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(affected_area_ft2) || 0;
  const cov = Number(coverage_ft2_per_gal) || 0;
  const tank = Number(tank_size_gal) || 0;
  if (!(area > 0)) return { error: "Affected area must be positive (ft2)." };
  if (!(cov > 0)) return { error: "Coverage rate must be positive (ft2/gal)." };
  if (!(tank > 0)) return { error: "Tank size must be positive (gal)." };
  let concPerGal;
  if (mode === "ratio") {
    const N = Number(ratio_N) || 0;
    if (!(N >= 1)) return { error: "Dilution ratio 1:N must have N >= 1." };
    concPerGal = 128 / (N + 1);
  } else {
    concPerGal = Number(oz_per_gal) || 0;
    if (!(concPerGal > 0)) return { error: "Concentrate oz per gallon must be positive." };
  }
  const finishedGal = area / cov;
  const concentrateOz = finishedGal * concPerGal;
  const waterGal = finishedGal - concentrateOz / 128;
  const tanksNeeded = Math.ceil(finishedGal / tank);
  const perTankConcOz = concPerGal * tank;
  return {
    finished_gal: finishedGal,
    water_gal: waterGal,
    concentrate_oz: concentrateOz,
    per_tank_conc_oz: perTankConcOz,
    tanks_needed: tanksNeeded,
    conc_oz_per_gal: concPerGal,
    note: "Read and follow the EPA-registered product label - the label is the law (FIFRA). The dilution and coverage defaults are placeholders, not a recommendation. Antimicrobials do not substitute for the physical removal of mold growth (IICRC S520); apply after cleaning, where the protocol calls for it. The label's contact / dwell time governs efficacy.",
  };
}

export const antimicrobialDilutionExample = {
  inputs: { affected_area_ft2: 400, coverage_ft2_per_gal: 200, tank_size_gal: 1.5, mode: "oz_per_gal", oz_per_gal: 4 },
  expectedRange: { finished_gal: { min: 1.99, max: 2.01 }, concentrate_oz: { min: 7.99, max: 8.01 } },
};

function renderAntimicrobialDilution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The EPA-registered product label governs (FIFRA - the label is the law); dilution and coverage are read off the label, the defaults here are placeholders. IICRC S520-2024 by name: antimicrobials do not replace physical removal of growth. 128 fl oz per US gallon.";
  const area = makeNumber("Area to treat (ft2)", "ad-area", { step: "any", min: "0" });
  const cov = makeNumber("Label coverage (ft2 per gallon)", "ad-cov", { step: "any", min: "0", value: "200" });
  cov.input.value = "200";
  const tank = makeNumber("Sprayer tank size (gal)", "ad-tank", { step: "any", min: "0", value: "1.5" });
  tank.input.value = "1.5";
  const mode = makeSelect("Dilution mode", "ad-mode", [
    { value: "oz_per_gal", label: "Ounces per gallon", selected: true }, { value: "ratio", label: "Ratio 1:N" },
  ]);
  const oz = makeNumber("Concentrate (oz per finished gallon)", "ad-oz", { step: "any", min: "0", value: "4" });
  oz.input.value = "4";
  const ratio = makeNumber("Ratio 1:N (parts water)", "ad-ratio", { step: "any", min: "1" });
  for (const f of [area, cov, tank, mode, oz, ratio]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "400"; cov.input.value = "200"; tank.input.value = "1.5"; mode.select.value = "oz_per_gal"; oz.input.value = "4"; ratio.input.value = ""; update(); });
  const oFin = makeOutputLine(outputRegion, "Finished solution", "ad-out-fin");
  const oConc = makeOutputLine(outputRegion, "Total concentrate", "ad-out-conc");
  const oWater = makeOutputLine(outputRegion, "Total water", "ad-out-water");
  const oTank = makeOutputLine(outputRegion, "Per full tank", "ad-out-tank");
  const oFills = makeOutputLine(outputRegion, "Tank fills", "ad-out-fills");
  const update = debounce(() => {
    const r = computeAntimicrobialDilution({
      affected_area_ft2: Number(area.input.value) || 0,
      coverage_ft2_per_gal: Number(cov.input.value) || 0,
      tank_size_gal: Number(tank.input.value) || 0,
      mode: mode.select.value,
      oz_per_gal: Number(oz.input.value) || 0,
      ratio_N: Number(ratio.input.value) || 0,
    });
    if (r.error) { oFin.textContent = r.error; for (const o of [oConc, oWater, oTank, oFills]) o.textContent = "-"; return; }
    oFin.textContent = fmt(r.finished_gal, 2) + " gal";
    oConc.textContent = fmt(r.concentrate_oz, 2) + " oz (" + fmt(r.conc_oz_per_gal, 2) + " oz/gal)";
    oWater.textContent = fmt(r.water_gal, 2) + " gal";
    oTank.textContent = fmt(r.per_tank_conc_oz, 2) + " oz concentrate";
    oFills.textContent = String(r.tanks_needed);
  }, DEBOUNCE_MS);
  for (const el of [area.input, cov.input, tank.input, mode.select, oz.input, ratio.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["antimicrobial-dilution"] = renderAntimicrobialDilution;

// --- air-sample-volume: Air Sample Run Time and Volume ---
//
// run_time_min = target_volume / flow; total_volume = target * count;
// total_time = run_time * count (sequential on one pump).
// dims: in { flow_rate_lpm: L^3 T^-1, target_volume_L: L^3, sample_count: dimensionless }
//        out: { run_time_min: T, run_time_sec: T, total_volume_L: L^3, total_time_min: T }
// (Target volume L^3 over flow L^3 T^-1 = time T; the count is dimensionless.)
export function computeAirSampleVolume({ flow_rate_lpm, target_volume_L, sample_count = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(flow_rate_lpm) || 0;
  const vol = Number(target_volume_L) || 0;
  const count = Math.round(Number(sample_count) || 0);
  if (!(flow > 0)) return { error: "Flow rate must be positive (L/min)." };
  if (!(vol > 0)) return { error: "Target volume must be positive (L)." };
  if (!(count >= 1)) return { error: "Sample count must be at least 1." };
  const runMin = vol / flow;
  const runSec = runMin * 60;
  const totalVol = vol * count;
  const totalMin = runMin * count;
  return {
    run_time_min: runMin,
    run_time_sec: runSec,
    total_volume_L: totalVol,
    total_time_min: totalMin,
    note: "The calibrated flow on the rotameter governs, not the pump's nominal rating. The cassette manufacturer's instructions and ASTM D7391 set the acceptable volume window for the medium - over-sampling overloads the trap, under-sampling misses low counts. An AIHA-accredited laboratory governs the analysis. Standard event design is at least one outdoor control plus one sample per affected area.",
  };
}

export const airSampleVolumeExample = {
  inputs: { flow_rate_lpm: 15, target_volume_L: 75, sample_count: 3 },
  expectedRange: { run_time_min: { min: 4.99, max: 5.01 }, total_volume_L: { min: 224.9, max: 225.1 } },
};

function renderAirSampleVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASTM D7391 (spore-trap method) and the cassette manufacturer's instructions set the acceptable sampled-volume window; an AIHA-accredited laboratory governs the analysis. Run time = target volume / calibrated flow.";
  const flow = makeNumber("Pump flow (L/min, calibrated)", "as-flow", { step: "any", min: "0", value: "15" });
  flow.input.value = "15";
  const vol = makeNumber("Target volume per cassette (L)", "as-vol", { step: "any", min: "0", value: "75" });
  vol.input.value = "75";
  const count = makeNumber("Cassettes in the event (incl. outdoor control)", "as-count", { step: "1", min: "1", value: "3" });
  count.input.value = "3";
  for (const f of [flow, vol, count]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "15"; vol.input.value = "75"; count.input.value = "3"; update(); });
  const oRun = makeOutputLine(outputRegion, "Run time per cassette", "as-out-run");
  const oTotVol = makeOutputLine(outputRegion, "Total sampled volume", "as-out-totvol");
  const oTotTime = makeOutputLine(outputRegion, "Total pump time (sequential)", "as-out-tottime");
  const update = debounce(() => {
    const r = computeAirSampleVolume({
      flow_rate_lpm: Number(flow.input.value) || 0,
      target_volume_L: Number(vol.input.value) || 0,
      sample_count: Number(count.input.value) || 0,
    });
    if (r.error) { oRun.textContent = r.error; oTotVol.textContent = "-"; oTotTime.textContent = "-"; return; }
    oRun.textContent = fmt(r.run_time_min, 2) + " min (" + fmt(r.run_time_sec, 0) + " s)";
    oTotVol.textContent = fmt(r.total_volume_L, 0) + " L";
    oTotTime.textContent = fmt(r.total_time_min, 1) + " min";
  }, DEBOUNCE_MS);
  for (const el of [flow.input, vol.input, count.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["air-sample-volume"] = renderAirSampleVolume;

// =====================================================================
// spec-v60: Water-loss documentation (Group D).
// =====================================================================

// --- moisture-dry-goal: Dry Standard vs Affected Reading ---
//
// delta = affected - reference (the unaffected dry standard);
// at_dry_standard = delta <= acceptable_delta; points_to_go =
// max(0, delta - acceptable_delta).
// dims: in { reference_reading: dimensionless, affected_reading: dimensionless, acceptable_delta: dimensionless }
//        out: { delta: dimensionless, points_to_go: dimensionless, at_dry_standard: dimensionless }
// (Moisture-meter readings are a dimensionless scale (relative or % MC); the
//  delta and the verdict are dimensionless.)
export function computeMoistureDryGoal({ reference_reading, affected_reading, acceptable_delta = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ref = Number(reference_reading);
  const aff = Number(affected_reading);
  const allow = Number(acceptable_delta);
  if (!Number.isFinite(ref) || !Number.isFinite(aff)) return { error: "Readings must be finite numbers." };
  if (!(allow > 0)) return { error: "Acceptable delta must be positive." };
  const delta = aff - ref;
  const atDry = delta <= allow;
  const pointsToGo = Math.max(0, delta - allow);
  return {
    delta,
    points_to_go: pointsToGo,
    at_dry_standard: atDry,
    verdict: atDry ? "at dry standard" : "continue drying",
    note: "The reference must be the same material, meter, mode, and scale as the affected reading (a pin meter reads relative on non-wood; a wood scale is only valid on wood). The dry standard is the unaffected reading, not a fixed number. The protocol and a calibrated meter govern acceptance (IICRC S500).",
  };
}

export const moistureDryGoalExample = {
  inputs: { reference_reading: 12, affected_reading: 35, acceptable_delta: 4 },
  expected: { delta: 23, points_to_go: 19, at_dry_standard: false },
};

function renderMoistureDryGoal(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500-2021 dry-standard concept by name (not reproduced): a material is dry when its moisture content matches similar unaffected material in the same structure. The protocol and a calibrated meter govern.";
  const ref = makeNumber("Unaffected reference reading (dry standard)", "mdg-ref", { step: "any" });
  const aff = makeNumber("Affected material reading", "mdg-aff", { step: "any" });
  const allow = makeNumber("Acceptable delta above standard", "mdg-allow", { step: "any", min: "0", value: "4" });
  allow.input.value = "4";
  for (const f of [ref, aff, allow]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.input.value = "12"; aff.input.value = "35"; allow.input.value = "4"; update(); });
  const oDelta = makeOutputLine(outputRegion, "Delta above standard", "mdg-out-delta");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "mdg-out-verdict");
  const oGo = makeOutputLine(outputRegion, "Points still to remove", "mdg-out-go");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computeMoistureDryGoal({ reference_reading: readNum(ref.input), affected_reading: readNum(aff.input), acceptable_delta: allow.input.value === "" ? 4 : Number(allow.input.value) });
    if (r.error) { oDelta.textContent = r.error; oVerdict.textContent = "-"; oGo.textContent = "-"; return; }
    oDelta.textContent = fmt(r.delta, 1);
    oVerdict.textContent = r.verdict;
    oGo.textContent = fmt(r.points_to_go, 1);
  }, DEBOUNCE_MS);
  for (const el of [ref.input, aff.input, allow.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["moisture-dry-goal"] = renderMoistureDryGoal;

// --- flood-cut-quantity: Flood-Cut Demolition Take-Off ---
//
// drywall_ft2 = run * (cut_height/12) * faces; sheets = ceil(drywall/32);
// baseboard_lf = run; insulation_ft2 = insulated ? run * (cut_height/12) : 0.
// dims: in { wall_run_lf: L, cut_height_in: L, two_sided: dimensionless, insulated: dimensionless }
//        out: { drywall_ft2: L^2, baseboard_lf: L, insulation_ft2: L^2, sheets_4x8: dimensionless }
// (Wall run L times cut height L = removed area L^2; the 32 ft^2-per-sheet
//  constant makes the sheet count dimensionless; baseboard is a length L.)
export function computeFloodCutQuantity({ wall_run_lf, cut_height_in = 24, two_sided = false, insulated = false } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const run = Number(wall_run_lf) || 0;
  const cut = Number(cut_height_in) || 0;
  if (!(run > 0)) return { error: "Wall run must be positive (linear ft)." };
  if (!(cut > 0)) return { error: "Cut height must be positive (in)." };
  const faces = two_sided ? 2 : 1;
  const drywallFt2 = run * (cut / 12) * faces;
  const sheets = Math.ceil(drywallFt2 / 32);
  const baseboardLf = run;
  const insulationFt2 = insulated ? run * (cut / 12) : 0;
  return {
    drywall_ft2: drywallFt2,
    baseboard_lf: baseboardLf,
    insulation_ft2: insulationFt2,
    sheets_4x8: sheets,
    note: "The cut height is a field decision driven by the highest moisture reading (the wick line measured with a meter), not a fixed 2 ft rule. Category 3 losses typically require removing all wet porous material, which can exceed the cut. Pre-1980 structures require lead / asbestos assessment before any demolition.",
  };
}

export const floodCutQuantityExample = {
  inputs: { wall_run_lf: 60, cut_height_in: 24, two_sided: false, insulated: true },
  expected: { drywall_ft2: 120, sheets_4x8: 4, baseboard_lf: 60, insulation_ft2: 120 },
};

function renderFloodCutQuantity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500-2021 structural-removal principle by name (not reproduced). 4x8 drywall sheet = 32 ft^2. The cut height is a field decision driven by the highest moisture reading; Category 3 may require removing all wet porous material.";
  const run = makeNumber("Affected wall run (linear ft)", "fcq-run", { step: "any", min: "0" });
  const cut = makeNumber("Cut height (in)", "fcq-cut", { step: "any", min: "0", value: "24" });
  cut.input.value = "24";
  const two = makeCheckbox("Cavity wet on both wall faces", "fcq-two");
  const ins = makeCheckbox("Cavity holds batt insulation to remove", "fcq-ins");
  for (const f of [run, cut, two, ins]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { run.input.value = "60"; cut.input.value = "24"; two.input.checked = false; ins.input.checked = true; update(); });
  const oDry = makeOutputLine(outputRegion, "Drywall removed", "fcq-out-dry");
  const oSheets = makeOutputLine(outputRegion, "4x8 sheets to replace", "fcq-out-sheets");
  const oBase = makeOutputLine(outputRegion, "Baseboard", "fcq-out-base");
  const oIns = makeOutputLine(outputRegion, "Batt insulation", "fcq-out-ins");
  const update = debounce(() => {
    const r = computeFloodCutQuantity({
      wall_run_lf: Number(run.input.value) || 0,
      cut_height_in: cut.input.value === "" ? 24 : Number(cut.input.value),
      two_sided: two.input.checked, insulated: ins.input.checked,
    });
    if (r.error) { oDry.textContent = r.error; for (const o of [oSheets, oBase, oIns]) o.textContent = "-"; return; }
    oDry.textContent = fmt(r.drywall_ft2, 0) + " ft^2";
    oSheets.textContent = String(r.sheets_4x8);
    oBase.textContent = fmt(r.baseboard_lf, 0) + " LF";
    oIns.textContent = fmt(r.insulation_ft2, 0) + " ft^2";
  }, DEBOUNCE_MS);
  for (const el of [run.input, cut.input, two.input, ins.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["flood-cut-quantity"] = renderFloodCutQuantity;

// =====================================================================
// spec-v69: Asbestos / lead abatement containment take-off (Group D).
// =====================================================================

// --- abatement-containment: Containment Poly, Negative Air, and Waste ---
//
// poly = (floor_sf x floor_layers + wall_sf x wall_layers) x 1.10;
// req_cfm = volume x ach / 60; nam_count = ceil(req_cfm / nam_cfm);
// waste_bags = ceil(debris_cy x 27 / 4.4).
// dims: in { room_len_ft: L, room_wid_ft: L, room_ht_ft: L, ach_target: dimensionless, nam_cfm: L^3 T^-1, debris_cy: L^3, floor_layers: dimensionless, wall_layers: dimensionless } out: { poly_sf: L^2, req_cfm: L^3 T^-1, nam_count: dimensionless, waste_bags: dimensionless }
// (Room dimensions are lengths L; the poly area is L^2; the required exhaust and
//  machine airflow are volume-rates L^3 T^-1; the machine and bag counts are
//  dimensionless.)
export function computeAbatementContainment({ room_len_ft, room_wid_ft, room_ht_ft, ach_target = 4, nam_cfm = 1500, debris_cy = 0, floor_layers = 2, wall_layers = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(room_len_ft);
  const wid = Number(room_wid_ft);
  const ht = Number(room_ht_ft);
  const ach = Number(ach_target);
  const nam = Number(nam_cfm);
  const debris = Number(debris_cy);
  const floorLayers = Number(floor_layers);
  const wallLayers = Number(wall_layers);
  if (!Number.isFinite(len) || len <= 0) return { error: "Length must be a positive finite number (ft)." };
  if (!Number.isFinite(wid) || wid <= 0) return { error: "Width must be a positive finite number (ft)." };
  if (!Number.isFinite(ht) || ht <= 0) return { error: "Height must be a positive finite number (ft)." };
  if (!Number.isFinite(ach) || ach <= 0) return { error: "Air changes per hour must be a positive finite number." };
  if (!Number.isFinite(nam) || nam <= 0) return { error: "Negative-air machine airflow must be a positive finite number (cfm)." };
  if (!Number.isFinite(debris) || debris < 0) return { error: "Debris volume must be a non-negative finite number (cy)." };
  if (!Number.isFinite(floorLayers) || floorLayers < 0) return { error: "Floor layers must be a non-negative finite number." };
  if (!Number.isFinite(wallLayers) || wallLayers < 0) return { error: "Wall layers must be a non-negative finite number." };
  const volumeCf = len * wid * ht;
  const floorSf = len * wid;
  const wallSf = 2 * (len + wid) * ht;
  const polySf = (floorSf * floorLayers + wallSf * wallLayers) * 1.10;
  const reqCfm = volumeCf * ach / 60;
  const namCount = Math.ceil(reqCfm / nam);
  const wasteBags = Math.ceil(debris * 27 / 4.4);
  if (![polySf, reqCfm, namCount, wasteBags].every(Number.isFinite)) return { error: "Containment math is not a finite value." };
  return {
    poly_sf: polySf,
    req_cfm: reqCfm,
    nam_count: namCount,
    waste_bags: wasteBags,
    volume_cf: volumeCf,
    note: "4 air changes per hour and the negative-pressure containment are industry practice for asbestos, and the actual negative pressure is verified continuously with a manometer, not assumed. This is a take-off, not an abatement plan - a licensed asbestos / certified lead (RRP) contractor governs the design, the decon, and the air clearance. Asbestos waste is RACM and lead debris is regulated: double-bagged, labeled, and manifested to a permitted facility. OSHA 1926.1101 / 1926.62 and EPA NESHAP / RRP requirements are not optional.",
  };
}

function _v69renderAbatementContainment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EPA NESHAP 40 CFR 61 Subpart M (asbestos), EPA RRP 40 CFR 745 (lead), and OSHA 1926.1101 / 1926.62 by name. poly = (floor x layers + wall x layers) x 1.10; req cfm = volume x ACH / 60; bags from debris volume. A licensed / certified contractor governs.";
  const len = makeNumber("Containment length (ft)", "ac-len", { step: "any", min: "0" });
  const wid = makeNumber("Containment width (ft)", "ac-wid", { step: "any", min: "0" });
  const ht = makeNumber("Containment height (ft)", "ac-ht", { step: "any", min: "0" });
  const ach = makeNumber("Air changes per hour", "ac-ach", { step: "any", min: "0", value: "4" });
  ach.input.value = "4";
  const nam = makeNumber("One negative-air machine airflow (cfm)", "ac-nam", { step: "any", min: "0", value: "1500" });
  nam.input.value = "1500";
  const debris = makeNumber("Regulated debris to bag (cy)", "ac-debris", { step: "any", min: "0", value: "0" });
  debris.input.value = "0";
  for (const f of [len, wid, ht, ach, nam, debris]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "20"; wid.input.value = "15"; ht.input.value = "9"; ach.input.value = "4"; nam.input.value = "1500"; debris.input.value = "3"; update(); });
  const oPoly = makeOutputLine(outputRegion, "Poly sheeting (incl. 10% laps)", "ac-out-poly");
  const oCfm = makeOutputLine(outputRegion, "Required exhaust airflow", "ac-out-cfm");
  const oNam = makeOutputLine(outputRegion, "Negative-air machines", "ac-out-nam");
  const oBags = makeOutputLine(outputRegion, "Regulated-waste bags", "ac-out-bags");
  const update = debounce(() => {
    const r = computeAbatementContainment({ room_len_ft: Number(len.input.value) || 0, room_wid_ft: Number(wid.input.value) || 0, room_ht_ft: Number(ht.input.value) || 0, ach_target: ach.input.value === "" ? 4 : Number(ach.input.value), nam_cfm: nam.input.value === "" ? 1500 : Number(nam.input.value), debris_cy: debris.input.value === "" ? 0 : Number(debris.input.value) });
    if (r.error) { oPoly.textContent = r.error; for (const o of [oCfm, oNam, oBags]) o.textContent = "-"; return; }
    oPoly.textContent = fmt(r.poly_sf, 0) + " ft^2";
    oCfm.textContent = fmt(r.req_cfm, 0) + " cfm";
    oNam.textContent = r.nam_count + " machine" + (r.nam_count === 1 ? "" : "s");
    oBags.textContent = r.waste_bags + " bags";
  }, DEBOUNCE_MS);
  for (const f of [len, wid, ht, ach, nam, debris]) f.input.addEventListener("input", update);
}
RESTORATION_RENDERERS["abatement-containment"] = _v69renderAbatementContainment;
