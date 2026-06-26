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
  DEBOUNCE_MS, debounce, makeNumber, makeTextarea, makeSelect, makeCheckbox,
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

  const exampleText = dryingLogExample.inputs.readings
    .map((r) => [r.ambient_T_F, r.ambient_RH, r.chamber_T_F, r.chamber_RH].join(", "))
    .join("\n");

  const help = document.createElement("p");
  help.className = "tile-help";
  help.textContent = "One line per day, in drying order. Each line is four numbers separated by commas: outside air temp (F), outside RH (%), drying-chamber temp (F), chamber RH (%). Up to 14 days.";
  inputRegion.appendChild(help);

  const log = makeTextarea("Daily readings (one line per day: outside F, outside RH, chamber F, chamber RH)", "dl-log", { rows: "8" });
  log.input.value = exampleText;
  inputRegion.appendChild(log.wrap);
  const target = makeNumber("Drying target (grains/lb; blank = outside GPP minus 5)", "dl-target", { step: "any", min: "0" });
  inputRegion.appendChild(target.wrap);

  attachExampleButton(inputRegion, () => {
    log.input.value = exampleText;
    target.input.value = "";
    update();
  });

  const oBP = makeOutputLine(outputRegion, "Boundary-pass (all days)", "dl-out-bp");
  const oSL = makeOutputLine(outputRegion, "Chamber GPP trend (GPP / day)", "dl-out-sl");
  const oTG = makeOutputLine(outputRegion, "Target GPP", "dl-out-tg");
  const oDT = makeOutputLine(outputRegion, "Days remaining to target", "dl-out-dt");
  const oTbl = makeOutputLine(outputRegion, "Per-day rows", "dl-out-tbl");
  const oW = makeOutputLine(outputRegion, "Notes", "dl-out-w");

  function parseReadings(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(",").map((s) => Number(s.trim()));
      if (parts.length < 4 || parts.some((n) => !Number.isFinite(n))) return null;
      out.push({ ambient_T_F: parts[0], ambient_RH: parts[1], chamber_T_F: parts[2], chamber_RH: parts[3] });
    }
    return out;
  }

  const update = debounce(() => {
    const readings = parseReadings(log.input.value);
    if (readings === null) {
      oBP.textContent = "Each line needs four numbers separated by commas: outside F, outside RH, chamber F, chamber RH.";
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
    oTbl.textContent = r.rows.map((row, i) => "Day " + (i + 1) + ": outside " + fmt(row.ambient_GPP, 1) + " GPP / chamber " + fmt(row.chamber_GPP, 1) + " GPP" + (row.boundary_pass ? " (pass)" : " (FAIL)")).join("; ");
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
// spec-v119: wood-emc (Group D) - equilibrium moisture content of wood from
// air temperature and relative humidity, via the USDA Forest Products Lab
// (Hailwood-Horrobin) sorption equation. The moisture content wood drifts
// toward at given conditions - the reference for a restoration drying goal.
// =====================================================================

// dims: in { temperature_F: T, rh_pct: dimensionless } out: { emc_pct: dimensionless }
export function computeWoodEmc({ temperature_F = 0, rh_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (rh_pct < 0 || rh_pct > 100) return { error: "Relative humidity must be between 0 and 100 percent." };
  const T = temperature_F;
  const h = rh_pct / 100;
  const W = 330 + 0.452 * T + 0.00415 * T * T;
  const K = 0.791 + 0.000463 * T - 0.000000844 * T * T;
  const K1 = 6.34 + 0.000775 * T - 0.0000935 * T * T;
  const K2 = 1.09 + 0.0284 * T - 0.0000904 * T * T;
  const Kh = K * h;
  if (!(W > 0) || Kh >= 1) return { error: "Inputs fall outside the sorption model's valid range." };
  const term1 = Kh / (1 - Kh);
  const num = K1 * Kh + 2 * K1 * K2 * Kh * Kh;
  const den = 1 + K1 * Kh + K1 * K2 * Kh * Kh;
  const emc_pct = (1800 / W) * (term1 + num / den);
  if (!Number.isFinite(emc_pct)) return { error: "EMC is not a finite value." };
  return {
    emc_pct,
    note: "Equilibrium moisture content (EMC) is the moisture content wood drifts toward at a given temperature and relative humidity, from the USDA Forest Products Laboratory (Hailwood-Horrobin) sorption equation. It is the target a restoration drying setup moves a material toward - lower the air's RH (dehumidify) to lower the EMC and the wood follows. The exact value varies by species and history; the IICRC S500 dry standard and the dry, unaffected reference reading (not a single computed number) govern when a material is called 'dry.'",
  };
}
export const woodEmcExample = { inputs: { temperature_F: 70, rh_pct: 50 } };

function renderWoodEmc(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USDA Forest Products Laboratory Wood Handbook (Hailwood-Horrobin sorption equation, by name, not reproduced) with its four temperature polynomials W, K, K1, K2 (T in degrees F). The exact EMC varies by species; the IICRC S500 dry standard and the unaffected reference reading govern.";
  const temp = makeNumber("Air temperature (F)", "emc-t", { step: "any", value: "70" });
  const rh = makeNumber("Relative humidity (%)", "emc-rh", { step: "any", min: "0", max: "100", value: "50" });
  temp.input.value = "70"; rh.input.value = "50";
  for (const f of [temp, rh]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { temp.input.value = "70"; rh.input.value = "50"; update(); });
  const oE = makeOutputLine(outputRegion, "Equilibrium moisture content", "emc-out-e");
  const oN = makeOutputLine(outputRegion, "Note", "emc-out-n");
  const update = debounce(() => {
    const r = computeWoodEmc({ temperature_F: Number(temp.input.value) || 0, rh_pct: Number(rh.input.value) || 0 });
    if (r.error) { oE.textContent = r.error; oN.textContent = "-"; return; }
    oE.textContent = fmt(r.emc_pct, 1) + "%";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [temp.input, rh.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["wood-emc"] = renderWoodEmc;

// =====================================================================
// spec-v136..v140 (Group D) - the on-arrival water-loss bench: the
// flood-cut demolition takeoff, the overhead collapse screen, the
// dehumidifier field derate, the S500 class-of-loss screen, and the
// desiccant process-airflow sizing. All lazy-loaded, absent from home
// first paint. IICRC S500 referenced by name; the meter, the inspector,
// and the manufacturer's performance map govern, not these screens.
// =====================================================================

// --- spec-v136: flood-cut-takeoff (Group D) ---
// Wicking-height flood cut turned into the demolition takeoff a tech
// writes on the wall before the saw comes out. Pure wall geometry; the
// moisture meter sets the cut line, not a round number.
// dims: in { wall_perimeter_ft: L, cut_height_in: L, removed_faces: dimensionless, has_insulation: dimensionless, has_baseboard: dimensionless }
//        out: { cut_line_lf: L, drywall_sf: L^2, drywall_sheets: dimensionless, insulation_sf: L^2, baseboard_lf: L }
export function computeFloodCutTakeoff({ wall_perimeter_ft = 0, cut_height_in = 24, removed_faces = 1, has_insulation = 1, has_baseboard = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const perim = Number(wall_perimeter_ft) || 0;
  const cut = Number(cut_height_in) || 0;
  const faces = Number(removed_faces) || 0;
  if (!(perim > 0)) return { error: "Wall perimeter must be positive (ft)." };
  if (!(cut > 0)) return { error: "Cut height must be positive (in)." };
  if (!(faces >= 1)) return { error: "Removed faces must be at least 1." };
  const ins = has_insulation ? 1 : 0;
  const base = has_baseboard ? 1 : 0;
  const cut_height_ft = cut / 12;
  const cut_line_lf = perim;
  const drywall_sf = perim * cut_height_ft * faces;
  const drywall_sheets = Math.ceil(drywall_sf / 32); // standard 4x8 sheet = 32 ft^2
  const insulation_sf = ins ? perim * cut_height_ft : 0;
  const baseboard_lf = base ? perim : 0;
  return { cut_line_lf, drywall_sf, drywall_sheets, insulation_sf, baseboard_lf };
}
export const floodCutTakeoffExample = { inputs: { wall_perimeter_ft: 60, cut_height_in: 24, removed_faces: 1, has_insulation: 1, has_baseboard: 1 } };

function renderFloodCutTakeoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Flood-cut demolition takeoff geometry per IICRC S500 practice, by name (not reproduced): cut a few inches above the highest moisture-meter reading. drywall_sf = perimeter * (cut_height_in/12) * faces; standard 4x8 board = 32 ft^2. The moisture meter governs the cut line, not a round number.";
  const perim = makeNumber("Affected wall run / perimeter (ft)", "fct-p", { step: "any", min: "0" });
  const cut = makeNumber("Flood-cut height above floor (in)", "fct-h", { step: "any", min: "0", value: "24" });
  cut.input.value = "24";
  const faces = makeNumber("Board faces opened (1, or 2 for a wet partition)", "fct-f", { step: "1", min: "1", value: "1" });
  faces.input.value = "1";
  const ins = makeCheckbox("Cavity insulation present", "fct-i", true);
  const base = makeCheckbox("Baseboard / trim to pull", "fct-b", true);
  for (const f of [perim, cut, faces, ins, base]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { perim.input.value = "60"; cut.input.value = "24"; faces.input.value = "1"; ins.input.checked = true; base.input.checked = true; update(); });
  const oCut = makeOutputLine(outputRegion, "Score-cut line", "fct-out-cut");
  const oBoard = makeOutputLine(outputRegion, "Drywall removed", "fct-out-board");
  const oSheets = makeOutputLine(outputRegion, "Replacement 4x8 sheets", "fct-out-sheets");
  const oIns = makeOutputLine(outputRegion, "Cavity insulation removed", "fct-out-ins");
  const oBase = makeOutputLine(outputRegion, "Baseboard to pull", "fct-out-base");
  const update = debounce(() => {
    const r = computeFloodCutTakeoff({
      wall_perimeter_ft: Number(perim.input.value) || 0,
      cut_height_in: Number(cut.input.value) || 0,
      removed_faces: Number(faces.input.value) || 0,
      has_insulation: ins.input.checked ? 1 : 0,
      has_baseboard: base.input.checked ? 1 : 0,
    });
    if (r.error) { oCut.textContent = r.error; oBoard.textContent = "-"; oSheets.textContent = "-"; oIns.textContent = "-"; oBase.textContent = "-"; return; }
    oCut.textContent = fmt(r.cut_line_lf, 0) + " lf";
    oBoard.textContent = fmt(r.drywall_sf, 0) + " ft^2";
    oSheets.textContent = r.drywall_sheets + " sheet(s)";
    oIns.textContent = r.insulation_sf > 0 ? fmt(r.insulation_sf, 0) + " ft^2" : "none";
    oBase.textContent = r.baseboard_lf > 0 ? fmt(r.baseboard_lf, 0) + " lf" : "none";
  }, DEBOUNCE_MS);
  for (const el of [perim.input, cut.input, faces.input, ins.input, base.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["flood-cut-takeoff"] = renderFloodCutTakeoff;

// --- spec-v137: ceiling-water-load (Group D) ---
// Trapped overhead water turned into the distributed load and the
// drain-before-entry call. A foot of water is 62.4 psf; wet gypsum lets
// go well below any structural rating. The threshold is an editable
// screen, not a code capacity.
// dims: in { pooled_area_ft2: L^2, avg_depth_in: L, threshold_psf: M L^-2 }
//        out: { water_volume_gal: L^3, water_weight_lb: M, load_psf: M L^-2, drain_first: dimensionless }
export function computeCeilingWaterLoad({ pooled_area_ft2 = 0, avg_depth_in = 0, threshold_psf = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(pooled_area_ft2) || 0;
  const depth = Number(avg_depth_in) || 0;
  const thr = Number(threshold_psf) || 0;
  if (!(area > 0)) return { error: "Pooled area must be positive (ft2)." };
  if (!(depth > 0)) return { error: "Average depth must be positive (in)." };
  const depth_ft = depth / 12;
  const water_volume_gal = area * depth_ft * 7.48052; // 1 ft^3 = 7.48052 gal
  const water_weight_lb = area * depth_ft * 62.4;      // water ~ 62.4 lb/ft^3
  const load_psf = depth_ft * 62.4;                    // distributed load, depth-only
  const drain_first = load_psf > thr;
  return { water_volume_gal, water_weight_lb, load_psf, drain_first };
}
export const ceilingWaterLoadExample = { inputs: { pooled_area_ft2: 20, avg_depth_in: 2, threshold_psf: 5 } };

function renderCeilingWaterLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hydrostatic load load_psf = (depth_in/12) * 62.4, with water at ~62.4 lb/ft^3 and 7.48052 gal/ft^3. IICRC S500 safety practice, by name. The threshold is an editable drain-first screen, NOT a code capacity - the fastening, span, and a structural engineer govern.";
  const area = makeNumber("Bulging / saturated ceiling area (ft^2)", "cwl-a", { step: "any", min: "0" });
  const depth = makeNumber("Average trapped water depth (in)", "cwl-d", { step: "any", min: "0" });
  const thr = makeNumber("Drain-first screen load (psf, editable)", "cwl-t", { step: "any", min: "0", value: "5" });
  thr.input.value = "5";
  for (const f of [area, depth, thr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "20"; depth.input.value = "2"; thr.input.value = "5"; update(); });
  const oLoad = makeOutputLine(outputRegion, "Distributed load", "cwl-out-load");
  const oWt = makeOutputLine(outputRegion, "Total trapped weight", "cwl-out-wt");
  const oVol = makeOutputLine(outputRegion, "Trapped water volume", "cwl-out-vol");
  const oFlag = makeOutputLine(outputRegion, "Drain before working beneath?", "cwl-out-flag");
  const update = debounce(() => {
    const r = computeCeilingWaterLoad({
      pooled_area_ft2: Number(area.input.value) || 0,
      avg_depth_in: Number(depth.input.value) || 0,
      threshold_psf: Number(thr.input.value) || 0,
    });
    if (r.error) { oLoad.textContent = r.error; oWt.textContent = "-"; oVol.textContent = "-"; oFlag.textContent = "-"; return; }
    oLoad.textContent = fmt(r.load_psf, 1) + " lb/ft^2";
    oWt.textContent = fmt(r.water_weight_lb, 0) + " lb";
    oVol.textContent = fmt(r.water_volume_gal, 1) + " gal";
    oFlag.textContent = r.drain_first ? "YES - punch-drain from a safe distance first" : "below screen - still verify the fastening";
  }, DEBOUNCE_MS);
  for (const el of [area.input, depth.input, thr.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["ceiling-water-load"] = renderCeilingWaterLoad;

// --- spec-v138: dehumidifier-derate (Group D) ---
// Nameplate AHAM pints derated to field output at the current chamber
// grain depression, and the honest unit count that follows - which goes
// UP, not down, as the chamber dries (the classic drying plateau). The
// operator reads the derate off the unit's own performance curve.
// dims: in { aham_pints_per_day: M T^-1, derate_factor: dimensionless, required_pints_per_day: M T^-1 }
//        out: { effective_pints: M T^-1, units_by_nameplate: dimensionless, units_by_field: dimensionless, shortfall_units: dimensionless }
export function computeDehumidifierDerate({ aham_pints_per_day = 0, derate_factor = 0.5, required_pints_per_day = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const aham = Number(aham_pints_per_day) || 0;
  const derate = Number(derate_factor) || 0;
  const demand = Number(required_pints_per_day) || 0;
  if (!(aham > 0)) return { error: "AHAM nameplate rating must be positive (pints/day)." };
  if (!(demand > 0)) return { error: "Required removal must be positive (pints/day)." };
  if (!(derate > 0 && derate <= 1)) return { error: "Derate factor must be in (0, 1]." };
  const effective_pints = aham * derate;
  const units_by_nameplate = Math.ceil(demand / aham);
  const units_by_field = Math.ceil(demand / effective_pints);
  const shortfall_units = units_by_field - units_by_nameplate;
  return { effective_pints, units_by_nameplate, units_by_field, shortfall_units };
}
export const dehumidifierDerateExample = { inputs: { aham_pints_per_day: 130, derate_factor: 0.5, required_pints_per_day: 300 } };

function renderDehumidifierDerate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500 cautions that the AHAM nameplate (a high-grain-depression test condition) overstates field output as the chamber dries, by name. effective = nameplate * derate; the derate is read off the unit's published performance curve at the measured chamber GPP. The curve and psychrometric reality govern; this carries the multiplication and the count.";
  const aham = makeNumber("Nameplate AHAM rating (pints/day)", "ddr-a", { step: "any", min: "0", value: "130" });
  aham.input.value = "130";
  const derate = makeNumber("Derate factor (0-1, off the unit's curve)", "ddr-d", { step: "any", min: "0", max: "1", value: "0.5" });
  derate.input.value = "0.5";
  const demand = makeNumber("Required removal (pints/day)", "ddr-r", { step: "any", min: "0" });
  for (const f of [aham, derate, demand]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { aham.input.value = "130"; derate.input.value = "0.5"; demand.input.value = "300"; update(); });
  const oEff = makeOutputLine(outputRegion, "Field-effective output per unit", "ddr-out-eff");
  const oNom = makeOutputLine(outputRegion, "Units by nameplate (optimistic)", "ddr-out-nom");
  const oField = makeOutputLine(outputRegion, "Units by field output (honest)", "ddr-out-field");
  const oShort = makeOutputLine(outputRegion, "Shortfall the nameplate hides", "ddr-out-short");
  const update = debounce(() => {
    const r = computeDehumidifierDerate({
      aham_pints_per_day: Number(aham.input.value) || 0,
      derate_factor: Number(derate.input.value) || 0,
      required_pints_per_day: Number(demand.input.value) || 0,
    });
    if (r.error) { oEff.textContent = r.error; oNom.textContent = "-"; oField.textContent = "-"; oShort.textContent = "-"; return; }
    oEff.textContent = fmt(r.effective_pints, 0) + " pints/day";
    oNom.textContent = r.units_by_nameplate + " unit(s)";
    oField.textContent = r.units_by_field + " unit(s)";
    oShort.textContent = (r.shortfall_units > 0 ? "+" : "") + r.shortfall_units + " unit(s)";
  }, DEBOUNCE_MS);
  for (const el of [aham.input, derate.input, demand.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["dehumidifier-derate"] = renderDehumidifierDerate;

// --- spec-v139: class-of-loss-screen (Group D) ---
// Wetted-surface field read turned into a candidate S500 Class of water
// intrusion - the input every drying-load tile already assumes - plus
// the matching per-class evaporation factor to feed evaporation-load.
// A deterministic screen, not a verdict; the inspector and the moisture
// map govern the classification.
// dims: in { floor_wet_fraction: dimensionless, wall_wet_fraction: dimensionless, wick_height_ft: L, low_evap_materials: dimensionless }
//        out: { water_class: dimensionless, rationale: dimensionless, evap_factor_gal_ft2: dimensionless }
export function computeWaterClassScreen({ floor_wet_fraction = 0, wall_wet_fraction = 0, wick_height_ft = 0, low_evap_materials = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const floor = Number(floor_wet_fraction);
  const wall = Number(wall_wet_fraction);
  const wick = Number(wick_height_ft);
  if (!(floor >= 0 && floor <= 1)) return { error: "Floor wet fraction must be in [0, 1]." };
  if (!(wall >= 0 && wall <= 1)) return { error: "Wall wet fraction must be in [0, 1]." };
  if (!(wick >= 0)) return { error: "Wick height must be non-negative (ft)." };
  const lowEvap = low_evap_materials ? 1 : 0;
  let water_class, rationale;
  if (lowEvap) {
    water_class = 4;
    rationale = "Low-evaporation materials wet (hardwood, plaster, lightweight concrete, masonry) - specialty Class 4 drying regardless of the wetted fractions.";
  } else if (wick > 2.0 || wall >= 0.40) {
    water_class = 3;
    rationale = "Wicking above 24 in or much of the wall wet (overhead / saturated walls) - Class 3, the greatest absorption and evaporation load.";
  } else if (floor >= 0.40) {
    water_class = 2;
    rationale = "Entire floor and pad wet, wicking under 24 in - Class 2, significant absorption.";
  } else {
    water_class = 1;
    rationale = "Small affected area, low porosity, minimal wicking - Class 1, least absorption.";
  }
  const evap_factor_gal_ft2 = WATER_CLASS_LOAD_GAL_FT2[water_class];
  return { water_class, rationale, evap_factor_gal_ft2 };
}
export const waterClassScreenExample = { inputs: { floor_wet_fraction: 1.0, wall_wet_fraction: 0.30, wick_height_ft: 1.5, low_evap_materials: 0 } };

function renderWaterClassScreen(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500 Class-of-loss definitions and the 24 in (2 ft) wick threshold, by name (not reproduced). A deterministic screen evaluated top-down: low-evaporation materials -> Class 4; wick > 2 ft or wall >= 40% -> Class 3; floor >= 40% -> Class 2; else Class 1. The inspector's classification and a moisture map govern; this proposes a Class and states the rationale.";
  const floor = makeNumber("Floor area wet (fraction 0-1)", "cls-floor", { step: "any", min: "0", max: "1" });
  const wall = makeNumber("Wall area wet (fraction 0-1)", "cls-wall", { step: "any", min: "0", max: "1" });
  const wick = makeNumber("Highest wicking up the walls (ft)", "cls-wick", { step: "any", min: "0" });
  const lowEvap = makeCheckbox("Low-evaporation materials wet (hardwood / plaster / masonry)", "cls-le", false);
  for (const f of [floor, wall, wick, lowEvap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { floor.input.value = "1.0"; wall.input.value = "0.30"; wick.input.value = "1.5"; lowEvap.input.checked = false; update(); });
  const oClass = makeOutputLine(outputRegion, "Candidate water class", "cls-out-class");
  const oWhy = makeOutputLine(outputRegion, "Rationale", "cls-out-why");
  const oFactor = makeOutputLine(outputRegion, "Evaporation load factor (feeds evaporation-load)", "cls-out-factor");
  const update = debounce(() => {
    const r = computeWaterClassScreen({
      floor_wet_fraction: Number(floor.input.value) || 0,
      wall_wet_fraction: Number(wall.input.value) || 0,
      wick_height_ft: Number(wick.input.value) || 0,
      low_evap_materials: lowEvap.input.checked ? 1 : 0,
    });
    if (r.error) { oClass.textContent = r.error; oWhy.textContent = "-"; oFactor.textContent = "-"; return; }
    oClass.textContent = "Class " + r.water_class;
    oWhy.textContent = r.rationale;
    oFactor.textContent = r.evap_factor_gal_ft2 + " gal/ft^2";
  }, DEBOUNCE_MS);
  for (const el of [floor.input, wall.input, wick.input, lowEvap.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["class-of-loss-screen"] = renderWaterClassScreen;

// --- spec-v140: desiccant-airflow-sizing (Group D) ---
// Desiccant dehumidifier sized by process airflow - the deep / low-temp
// drying path the refrigerant sizing never covers, from the same
// psychrometric mass balance grains-removed uses in reverse. The
// performance map governs the achievable depression; reactivation air
// ducts outside.
// dims: in { required_pints_per_day: M T^-1, design_grain_depression: dimensionless, nameplate_process_cfm: L^3 T^-1 }
//        out: { lb_per_hr: M T^-1, process_cfm: L^3 T^-1, units_needed: dimensionless }
export function computeDesiccantAirflow({ required_pints_per_day = 0, design_grain_depression = 60, nameplate_process_cfm = 2000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const demand = Number(required_pints_per_day) || 0;
  const depression = Number(design_grain_depression) || 0;
  const nameplate = Number(nameplate_process_cfm) || 0;
  if (!(demand > 0)) return { error: "Required removal must be positive (pints/day)." };
  if (!(depression > 0)) return { error: "Design grain depression must be positive." };
  if (!(nameplate > 0)) return { error: "Nameplate process airflow must be positive (cfm)." };
  // 1.043 lb/pint water; 4.5 = 60 min/hr * 0.075 lb/ft^3 standard air; 7000 grains/lb.
  const lb_per_hr = (demand * 1.043) / 24;
  const process_cfm = (lb_per_hr * 7000) / (4.5 * depression);
  const units_needed = Math.ceil(process_cfm / nameplate);
  return { lb_per_hr, process_cfm, units_needed };
}
export const desiccantAirflowExample = { inputs: { required_pints_per_day: 300, design_grain_depression: 60, nameplate_process_cfm: 2000 } };

function renderDesiccantAirflow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Psychrometric mass balance, desiccant process-airflow method, by name (IICRC S500). process_cfm = lb/hr * 7000 / (4.5 * depression), with 4.5 = 60 min/hr * 0.075 lb/ft^3 standard air, 7000 grains/lb, 1.043 lb/pint. The manufacturer's performance map and chamber conditions govern the achievable depression; reactivation exhaust air must be ducted outside.";
  const demand = makeNumber("Water-removal demand (pints/day)", "des-r", { step: "any", min: "0" });
  const depression = makeNumber("Design grain depression (grains/lb across the wheel)", "des-g", { step: "any", min: "0", value: "60" });
  depression.input.value = "60";
  const nameplate = makeNumber("Candidate unit process airflow (cfm)", "des-n", { step: "any", min: "0", value: "2000" });
  nameplate.input.value = "2000";
  for (const f of [demand, depression, nameplate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { demand.input.value = "300"; depression.input.value = "60"; nameplate.input.value = "2000"; update(); });
  const oRate = makeOutputLine(outputRegion, "Removal rate", "des-out-rate");
  const oCfm = makeOutputLine(outputRegion, "Required process airflow", "des-out-cfm");
  const oUnits = makeOutputLine(outputRegion, "Desiccant units needed", "des-out-units");
  const update = debounce(() => {
    const r = computeDesiccantAirflow({
      required_pints_per_day: Number(demand.input.value) || 0,
      design_grain_depression: Number(depression.input.value) || 0,
      nameplate_process_cfm: Number(nameplate.input.value) || 0,
    });
    if (r.error) { oRate.textContent = r.error; oCfm.textContent = "-"; oUnits.textContent = "-"; return; }
    oRate.textContent = fmt(r.lb_per_hr, 2) + " lb/hr";
    oCfm.textContent = fmt(r.process_cfm, 0) + " cfm";
    oUnits.textContent = r.units_needed + " unit(s)";
  }, DEBOUNCE_MS);
  for (const el of [demand.input, depression.input, nameplate.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["desiccant-airflow-sizing"] = renderDesiccantAirflow;

// =====================================================================
// spec-v189..v198: water-damage restoration second/third pass (Group D).
// Closes the structural-drying loop (balance, bound water, completion
// projection), the antimicrobial dwell/keep-wet reference, the S500
// carpet and category decisions, occupied-space hydroxyl deodorization,
// and injection wall-cavity drying. All lazy-loaded; absent from the
// home first paint. ANSI/IICRC S500/S520/S700 govern.
// =====================================================================

// --- spec-v189: Drying-system balance (`drying-balance`) ---
// balance_ppd = installed - evap; ratio = installed / evap; verdict from
// the ratio against the target margin (default 1.2).
// dims: in { evap_load_ppd: L^3 T^-1, installed_ppd: L^3 T^-1, target_margin: dimensionless } out: { balance_ppd: L^3 T^-1, ratio: dimensionless }
export function computeDryingBalance({ evap_load_ppd = 0, installed_ppd = 0, target_margin = 1.2 } = {}) {
  const evap = Number(evap_load_ppd);
  const installed = Number(installed_ppd);
  let margin = Number(target_margin);
  if (!Number.isFinite(evap) || !Number.isFinite(installed) || !Number.isFinite(margin)) return { error: "Inputs must be finite numbers." };
  if (!(evap > 0)) return { error: "Evaporation load must be positive (pints/day)." };
  if (!(installed > 0)) return { error: "Installed dehumidification capacity must be positive (pints/day)." };
  if (!(margin > 0)) margin = 1.2;
  const balance = installed - evap;
  const ratio = installed / evap;
  let verdict;
  let add_ppd = 0;
  if (ratio >= margin) {
    verdict = "Balanced with margin.";
  } else if (ratio >= 1) {
    verdict = "Meeting the load with no margin - add capacity or improve airflow.";
    add_ppd = margin * evap - installed;
  } else {
    verdict = "Deficit - chamber over-humidifying; add capacity.";
    add_ppd = margin * evap - installed;
  }
  return {
    balance_ppd: Number.isFinite(balance) ? balance : null,
    ratio: Number.isFinite(ratio) ? ratio : null,
    verdict,
    add_ppd: add_ppd > 0 ? add_ppd : 0,
    note: "Field dehumidification capacity falls below the AHAM nameplate as the air dries. The restorer's daily monitoring governs. IICRC S500 governs.",
  };
}
export const dryingBalanceExample = { inputs: { evap_load_ppd: 200, installed_ppd: 260, target_margin: 1.2 } };

function renderDryingBalance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Balanced-drying-system principle (ANSI/IICRC S500), by name. A balanced system keeps installed dehumidification at or above the evaporation load with margin. Field capacity is below the AHAM nameplate as grain depression falls; the restorer's daily monitoring governs equipment adjustments.";
  const evap = makeNumber("Evaporation load (pints/day, from evaporation-load)", "db-evap", { step: "any", min: "0", value: "200" });
  evap.input.value = "200";
  const installed = makeNumber("Installed dehu capacity (pints/day; field, not AHAM)", "db-inst", { step: "any", min: "0", value: "260" });
  installed.input.value = "260";
  const margin = makeNumber("Target capacity-to-load ratio", "db-margin", { step: "any", min: "0", value: "1.2" });
  margin.input.value = "1.2";
  for (const f of [evap, installed, margin]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { evap.input.value = "200"; installed.input.value = "260"; margin.input.value = "1.2"; update(); });
  const oBal = makeOutputLine(outputRegion, "Balance", "db-out-bal");
  const oRatio = makeOutputLine(outputRegion, "Capacity-to-load ratio", "db-out-ratio");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "db-out-verdict");
  const update = debounce(() => {
    const r = computeDryingBalance({ evap_load_ppd: Number(evap.input.value) || 0, installed_ppd: Number(installed.input.value) || 0, target_margin: margin.input.value === "" ? 1.2 : Number(margin.input.value) });
    if (r.error) { oBal.textContent = r.error; oRatio.textContent = "-"; oVerdict.textContent = "-"; return; }
    oBal.textContent = fmt(r.balance_ppd, 0) + " ppd";
    oRatio.textContent = fmt(r.ratio, 2);
    oVerdict.textContent = r.verdict + (r.add_ppd > 0 ? " Add about " + fmt(r.add_ppd, 0) + " ppd." : "");
  }, DEBOUNCE_MS);
  for (const el of [evap.input, installed.input, margin.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["drying-balance"] = renderDryingBalance;

// --- spec-v190: Bound water in wet materials (`bound-water`) ---
// dry_mass = volume * dry_density; water_lb = dry_mass * (mc_cur - mc_goal)/100;
// water_gal = water_lb / 8.34 (lb/gal).
// dims: in { material_volume_ft3: L^3, dry_density_lb_ft3: M L^-3, mc_current_pct: dimensionless, mc_goal_pct: dimensionless } out: { dry_mass_lb: M, water_lb: M, water_gal: L^3 }
export function computeBoundWater({ material_volume_ft3 = 0, dry_density_lb_ft3 = 0, mc_current_pct = 0, mc_goal_pct = 0 } = {}) {
  const vol = Number(material_volume_ft3);
  const density = Number(dry_density_lb_ft3);
  const cur = Number(mc_current_pct);
  const goal = Number(mc_goal_pct);
  if (![vol, density, cur, goal].every(Number.isFinite)) return { error: "Inputs must be finite numbers." };
  if (!(vol > 0)) return { error: "Material volume must be positive (ft^3)." };
  if (!(density > 0)) return { error: "Dry density must be positive (lb/ft^3)." };
  if (!(cur > goal)) return { error: "Current moisture content must be above the goal." };
  const dryMass = vol * density;
  const waterLb = dryMass * (cur - goal) / 100;
  const waterGal = waterLb / 8.34;
  return {
    dry_mass_lb: Number.isFinite(dryMass) ? dryMass : null,
    water_lb: Number.isFinite(waterLb) ? waterLb : null,
    water_gal: Number.isFinite(waterGal) ? waterGal : null,
    note: "Moisture content is on a dry-weight basis (consistent with wood-emc). Dry density and material moisture vary by species and product; this is a planning estimate, not a gravimetric measurement. In-situ meter readings and IICRC S500 govern.",
  };
}
export const boundWaterExample = { inputs: { material_volume_ft3: 10, dry_density_lb_ft3: 32, mc_current_pct: 40, mc_goal_pct: 12 } };

function renderBoundWater(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Gravimetric water-mass relation (ANSI/IICRC S500), by name. Moisture content is dry-weight basis (consistent with wood-emc). Dry density and material moisture vary by species and product; meter readings and the restorer's judgment govern. This is a planning estimate, not a gravimetric measurement.";
  const vol = makeNumber("Material volume (ft^3, area x thickness)", "bw-vol", { step: "any", min: "0", value: "10" });
  vol.input.value = "10";
  const density = makeNumber("Oven-dry density (lb/ft^3; softwood ~32, gypsum ~40)", "bw-den", { step: "any", min: "0", value: "32" });
  density.input.value = "32";
  const cur = makeNumber("Current moisture content (percent)", "bw-cur", { step: "any", min: "0", value: "40" });
  cur.input.value = "40";
  const goal = makeNumber("Goal moisture content (percent)", "bw-goal", { step: "any", min: "0", value: "12" });
  goal.input.value = "12";
  for (const f of [vol, density, cur, goal]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vol.input.value = "10"; density.input.value = "32"; cur.input.value = "40"; goal.input.value = "12"; update(); });
  const oMass = makeOutputLine(outputRegion, "Oven-dry mass", "bw-out-mass");
  const oLb = makeOutputLine(outputRegion, "Water to evaporate", "bw-out-lb");
  const oGal = makeOutputLine(outputRegion, "Water volume", "bw-out-gal");
  const update = debounce(() => {
    const r = computeBoundWater({ material_volume_ft3: Number(vol.input.value) || 0, dry_density_lb_ft3: Number(density.input.value) || 0, mc_current_pct: Number(cur.input.value) || 0, mc_goal_pct: Number(goal.input.value) || 0 });
    if (r.error) { oMass.textContent = r.error; oLb.textContent = "-"; oGal.textContent = "-"; return; }
    oMass.textContent = fmt(r.dry_mass_lb, 0) + " lb";
    oLb.textContent = fmt(r.water_lb, 1) + " lb";
    oGal.textContent = fmt(r.water_gal, 1) + " gal";
  }, DEBOUNCE_MS);
  for (const el of [vol.input, density.input, cur.input, goal.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["bound-water"] = renderBoundWater;

// --- spec-v193: Disinfectant contact (dwell) time reference (`disinfectant-dwell`) ---
const DISINFECTANT_DWELL = {
  quat: { label: "quaternary ammonium (quat)", contact: "10 min" },
  ahp: { label: "accelerated hydrogen peroxide (AHP)", contact: "1-5 min" },
  bleach: { label: "sodium hypochlorite (bleach solution)", contact: "10 min" },
  phenolic: { label: "phenolic", contact: "10 min" },
  botanical: { label: "botanical / thymol", contact: "10 min" },
};
// dims: in { product_class: dimensionless } out: { typical_contact_min: dimensionless, keep_wet_rule: dimensionless, pre_clean_rule: dimensionless, authority: dimensionless }
export function computeDisinfectantDwell({ product_class = "quat" } = {}) {
  const row = DISINFECTANT_DWELL[product_class];
  if (!row) return { error: "Unknown product class." };
  return {
    product_class: row.label,
    typical_contact_min: row.contact,
    keep_wet_rule: "Keep the surface visibly wet for the full contact time; re-apply if it dries.",
    pre_clean_rule: "Pre-clean to remove soil first; disinfectant cannot penetrate organic load.",
    authority: "The EPA-registered product label governs the exact dwell (FIFRA).",
  };
}
export const disinfectantDwellExample = { inputs: { product_class: "quat" } };

function renderDisinfectantDwell(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Antimicrobial contact-time principle (ANSI/IICRC S500 and S520), by name. Antimicrobials are EPA-registered pesticides whose label is the legal authority (FIFRA); the ranges shown are guidance and the specific product label governs the exact dwell. The surface must stay visibly wet for the full contact time, and disinfection requires pre-cleaning because product cannot penetrate soil.";
  const cls = makeSelect("Product class", "dd-cls", [
    { value: "quat", label: "Quaternary ammonium (quat)", selected: true },
    { value: "ahp", label: "Accelerated hydrogen peroxide (AHP)" },
    { value: "bleach", label: "Sodium hypochlorite (bleach solution)" },
    { value: "phenolic", label: "Phenolic" },
    { value: "botanical", label: "Botanical / thymol" },
  ]);
  inputRegion.appendChild(cls.wrap);
  attachExampleButton(inputRegion, () => { cls.select.value = "quat"; update(); });
  const oContact = makeOutputLine(outputRegion, "Typical wet contact time", "dd-out-contact");
  const oWet = makeOutputLine(outputRegion, "Keep-wet rule", "dd-out-wet");
  const oClean = makeOutputLine(outputRegion, "Pre-clean rule", "dd-out-clean");
  const oAuth = makeOutputLine(outputRegion, "Authority", "dd-out-auth");
  const update = debounce(() => {
    const r = computeDisinfectantDwell({ product_class: cls.select.value });
    if (r.error) { oContact.textContent = r.error; oWet.textContent = "-"; oClean.textContent = "-"; oAuth.textContent = "-"; return; }
    oContact.textContent = r.typical_contact_min;
    oWet.textContent = r.keep_wet_rule;
    oClean.textContent = r.pre_clean_rule;
    oAuth.textContent = r.authority;
  }, DEBOUNCE_MS);
  cls.select.addEventListener("input", update);
}
RESTORATION_RENDERERS["disinfectant-dwell"] = renderDisinfectantDwell;

// --- spec-v194: Carpet / cushion restore-vs-replace reference (`carpet-restore-replace`) ---
const WATER_CATEGORY_LABELS = {
  cat1: "Category 1 (clean)",
  cat2: "Category 2 (gray)",
  cat3: "Category 3 (black)",
};
// dims: in { water_category: dimensionless, component: dimensionless, delaminated: dimensionless } out: { decision: dimensionless, rationale: dimensionless }
export function computeCarpetRestoreReplace({ water_category = "cat1", component = "carpet", delaminated = 0 } = {}) {
  const cat = WATER_CATEGORY_LABELS[water_category];
  if (!cat) return { error: "Unknown water category." };
  if (component !== "carpet" && component !== "cushion") return { error: "Component must be carpet or cushion." };
  const delam = Number(delaminated) ? 1 : 0;
  let decision;
  let rationale;
  if (component === "carpet" && delam === 1) {
    decision = "Replace (delamination).";
    rationale = "Delaminated carpet is replaced regardless of category.";
  } else if (water_category === "cat3") {
    decision = "Remove and dispose (not restorable).";
    rationale = "Category 3 porous flooring is generally removed and disposed.";
  } else if (component === "cushion") {
    decision = "Typically remove and replace.";
    rationale = "Saturated cushion (pad) is usually removed; replacement costs less than drying.";
  } else if (water_category === "cat2") {
    decision = "Restorable case-by-case after cleaning and sanitizing.";
    rationale = "Category 2 carpet may be restored after cleaning; the cushion is removed.";
  } else {
    decision = "May be dried in place or floated and restored.";
    rationale = "Category 1 carpet that is not delaminated can usually be dried and saved.";
  }
  return {
    water_category: cat,
    decision,
    rationale,
    note: "A professional determination case by case: age, condition, contamination, customer agreement, and the AHJ all bear on it. IICRC S500 governs.",
  };
}
export const carpetRestoreReplaceExample = { inputs: { water_category: "cat1", component: "carpet", delaminated: 0 } };

function renderCarpetRestoreReplace(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Carpet and cushion restore-vs-replace mapping (ANSI/IICRC S500), by name. The decision is a professional determination case by case (age, condition, contamination, customer agreement, and the AHJ all bear on it). Delaminated carpet is replaced; saturated cushion in any category is typically removed; Category 3 porous flooring is generally removed and disposed.";
  const cat = makeSelect("Water category", "cr-cat", [
    { value: "cat1", label: "Category 1 (clean)", selected: true },
    { value: "cat2", label: "Category 2 (gray)" },
    { value: "cat3", label: "Category 3 (black)" },
  ]);
  const comp = makeSelect("Component", "cr-comp", [
    { value: "carpet", label: "Carpet", selected: true },
    { value: "cushion", label: "Cushion / pad" },
  ]);
  const delam = makeCheckbox("Carpet delamination present", "cr-delam");
  for (const f of [cat, comp, delam]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cat.select.value = "cat1"; comp.select.value = "carpet"; delam.input.checked = false; update(); });
  const oDec = makeOutputLine(outputRegion, "Decision", "cr-out-dec");
  const oWhy = makeOutputLine(outputRegion, "Rationale", "cr-out-why");
  const update = debounce(() => {
    const r = computeCarpetRestoreReplace({ water_category: cat.select.value, component: comp.select.value, delaminated: delam.input.checked ? 1 : 0 });
    if (r.error) { oDec.textContent = r.error; oWhy.textContent = "-"; return; }
    oDec.textContent = r.decision;
    oWhy.textContent = r.rationale;
  }, DEBOUNCE_MS);
  for (const el of [cat.select, comp.select, delam.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["carpet-restore-replace"] = renderCarpetRestoreReplace;

// --- spec-v195: Water category deterioration over time (`category-deterioration`) ---
// dims: in { origin_category: dimensionless, elapsed_hours: T, warm_environment: dimensionless, contacted_contaminant: dimensionless } out: { likely_category: dimensionless }
export function computeCategoryDeterioration({ origin_category = "cat1", elapsed_hours = 0, warm_environment = 0, contacted_contaminant = 0 } = {}) {
  const origin = WATER_CATEGORY_LABELS[origin_category];
  if (!origin) return { error: "Unknown origin category." };
  const hours = Number(elapsed_hours);
  if (!Number.isFinite(hours) || hours < 0) return { error: "Elapsed time must be a finite, non-negative number of hours." };
  const warm = Number(warm_environment) ? 1 : 0;
  const contaminant = Number(contacted_contaminant) ? 1 : 0;
  const threshold = warm ? 24 : 48;
  let likely = origin_category;
  let rationale;
  if (contaminant === 1) {
    likely = "cat3";
    rationale = "Contact with soil, sewage, or contaminated materials escalates toward Category 3 regardless of the clock.";
  } else if (origin_category === "cat1" && hours >= threshold) {
    likely = "cat2";
    rationale = "Standing time and temperature have driven microbial amplification; clean water reclassifies to Category 2.";
  } else if (origin_category === "cat2" && warm === 1 && hours >= threshold) {
    likely = "cat3";
    rationale = "Category 2 left wet and warm may degrade to Category 3.";
  } else {
    rationale = "Within the amplification window for the conditions; remains at the origin category. When in doubt, assume the higher category.";
  }
  return {
    origin_category: origin,
    likely_category: WATER_CATEGORY_LABELS[likely],
    rationale,
    note: "Category is a professional determination made at the time of restoration, not by the source alone. The amplification window commonly cited is on the order of 48-72 hours under favorable conditions. When in doubt, the higher category is assumed. IICRC S500 governs.",
  };
}
export const categoryDeteriorationExample = { inputs: { origin_category: "cat1", elapsed_hours: 72, warm_environment: 1, contacted_contaminant: 0 } };

function renderCategoryDeterioration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Category-at-time-of-remediation principle (ANSI/IICRC S500), by name. Category is a professional determination made at the time of restoration, not by the source alone; elevated temperature and contact with contaminated materials accelerate the shift. The amplification window commonly cited is 48-72 hours under favorable conditions. When in doubt, the higher category is assumed.";
  const cat = makeSelect("Origin category", "cd-cat", [
    { value: "cat1", label: "Category 1 (clean)", selected: true },
    { value: "cat2", label: "Category 2 (gray)" },
    { value: "cat3", label: "Category 3 (black)" },
  ]);
  const hours = makeNumber("Elapsed wet time (hours)", "cd-hours", { step: "any", min: "0", value: "72" });
  hours.input.value = "72";
  const warm = makeCheckbox("Warm environment (favors microbial amplification)", "cd-warm");
  warm.input.checked = true;
  const contaminant = makeCheckbox("Contacted soil / sewage / contaminated materials", "cd-contam");
  for (const f of [cat, hours, warm, contaminant]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cat.select.value = "cat1"; hours.input.value = "72"; warm.input.checked = true; contaminant.input.checked = false; update(); });
  const oLikely = makeOutputLine(outputRegion, "Likely current category", "cd-out-likely");
  const oWhy = makeOutputLine(outputRegion, "Rationale", "cd-out-why");
  const update = debounce(() => {
    const r = computeCategoryDeterioration({ origin_category: cat.select.value, elapsed_hours: Number(hours.input.value) || 0, warm_environment: warm.input.checked ? 1 : 0, contacted_contaminant: contaminant.input.checked ? 1 : 0 });
    if (r.error) { oLikely.textContent = r.error; oWhy.textContent = "-"; return; }
    oLikely.textContent = r.likely_category;
    oWhy.textContent = r.rationale;
  }, DEBOUNCE_MS);
  for (const el of [cat.select, hours.input, warm.input, contaminant.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["category-deterioration"] = renderCategoryDeterioration;

// --- spec-v196: Hydroxyl generator sizing (`hydroxyl-sizing`) ---
// units = ceil(structure_volume / unit_coverage); occupied-safe; run continuously.
// dims: in { structure_volume_ft3: L^3, unit_coverage_ft3: L^3, expected_days: T } out: { units: dimensionless, expected_days: T }
export function computeHydroxylSizing({ structure_volume_ft3 = 0, unit_coverage_ft3 = 0, expected_days = 3 } = {}) {
  const vol = Number(structure_volume_ft3);
  const coverage = Number(unit_coverage_ft3);
  const days = Number(expected_days);
  if (!Number.isFinite(vol) || !Number.isFinite(coverage) || !Number.isFinite(days)) return { error: "Inputs must be finite numbers." };
  if (!(vol > 0)) return { error: "Structure volume must be positive (ft^3)." };
  if (!(coverage > 0)) return { error: "Unit coverage rating must be positive (ft^3/unit)." };
  const units = Math.ceil(vol / coverage);
  return {
    units,
    expected_days: days > 0 ? days : null,
    note: "Hydroxyl generators are safe for occupied spaces (unlike ozone, which requires an evacuated, sealed structure) but work more slowly, commonly running continuously for several days. Coverage and run times are manufacturer-specific. Remove the odor source and clean smoke residue first. The manufacturer and IICRC S700 govern.",
  };
}
export const hydroxylSizingExample = { inputs: { structure_volume_ft3: 12000, unit_coverage_ft3: 6000, expected_days: 3 } };

function renderHydroxylSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Volume-and-coverage sizing (ANSI/IICRC S700), by name. Hydroxyl generators are safe for occupied spaces but work more slowly than ozone, commonly running continuously for several days. Coverage ratings and run times are manufacturer-specific. Severe odor still requires source removal and cleaning first. The manufacturer and S700 govern.";
  const vol = makeNumber("Structure volume (ft^3)", "hx-vol", { step: "any", min: "0", value: "12000" });
  vol.input.value = "12000";
  const coverage = makeNumber("Coverage per generator (ft^3/unit)", "hx-cov", { step: "any", min: "0", value: "6000" });
  coverage.input.value = "6000";
  const days = makeNumber("Anticipated continuous run time (days)", "hx-days", { step: "any", min: "0", value: "3" });
  days.input.value = "3";
  for (const f of [vol, coverage, days]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vol.input.value = "12000"; coverage.input.value = "6000"; days.input.value = "3"; update(); });
  const oUnits = makeOutputLine(outputRegion, "Hydroxyl generators needed", "hx-out-units");
  const oRun = makeOutputLine(outputRegion, "Run time", "hx-out-run");
  const update = debounce(() => {
    const r = computeHydroxylSizing({ structure_volume_ft3: Number(vol.input.value) || 0, unit_coverage_ft3: Number(coverage.input.value) || 0, expected_days: days.input.value === "" ? 3 : Number(days.input.value) });
    if (r.error) { oUnits.textContent = r.error; oRun.textContent = "-"; return; }
    oUnits.textContent = r.units + " unit(s)";
    oRun.textContent = (r.expected_days ? fmt(r.expected_days, 0) + " day(s), " : "") + "run continuously; occupied-safe.";
  }, DEBOUNCE_MS);
  for (const el of [vol.input, coverage.input, days.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["hydroxyl-sizing"] = renderHydroxylSizing;

// --- spec-v197: Injection / wall-cavity drying system sizing (`cavity-drying-system`) ---
// bays = ceil(wall_ft * 12 / stud_spacing_in); ports = bays * ports_per_bay;
// systems = ceil(ports / ports_per_system).
// dims: in { affected_wall_ft: L, stud_spacing_in: L, ports_per_bay: dimensionless, ports_per_system: dimensionless } out: { bays: dimensionless, ports: dimensionless, systems: dimensionless }
export function computeCavityDryingSystem({ affected_wall_ft = 0, stud_spacing_in = 16, ports_per_bay = 1, ports_per_system = 12 } = {}) {
  const wall = Number(affected_wall_ft);
  const spacing = Number(stud_spacing_in);
  const perBay = Number(ports_per_bay);
  const perSystem = Number(ports_per_system);
  if (![wall, spacing, perBay, perSystem].every(Number.isFinite)) return { error: "Inputs must be finite numbers." };
  if (!(wall > 0)) return { error: "Affected wall length must be positive (ft)." };
  if (!(spacing > 0)) return { error: "Stud spacing must be positive (in)." };
  if (!(perBay > 0)) return { error: "Ports per bay must be positive." };
  if (!(perSystem > 0)) return { error: "Ports per system must be positive." };
  const bays = Math.ceil(wall * 12 / spacing);
  const ports = bays * perBay;
  const systems = Math.ceil(ports / perSystem);
  return {
    bays,
    ports,
    systems,
    note: "Port count, airflow per port, and ports per system are equipment-manufacturer specific (the bundled defaults are typical, not prescriptive). Respect cavity contamination: do not push Category 2/3 cavity air into clean spaces. The cavity-drying decision versus a flood cut and access drilling follow IICRC S500.",
  };
}
export const cavityDryingSystemExample = { inputs: { affected_wall_ft: 32, stud_spacing_in: 16, ports_per_bay: 1, ports_per_system: 12 } };

function renderCavityDryingSystem(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bays-from-length geometry (ANSI/IICRC S500), by name. Port count, airflow per port, and ports per system are equipment-manufacturer specific; the bundled defaults are typical, not prescriptive. Respect cavity air-pressure direction and contamination - do not push Category 2/3 cavity air into clean spaces. The cavity-drying decision versus a flood cut follows S500.";
  const wall = makeNumber("Affected wall length (ft)", "cs-wall", { step: "any", min: "0", value: "32" });
  wall.input.value = "32";
  const spacing = makeNumber("Stud spacing (in, on-center)", "cs-spacing", { step: "any", min: "0", value: "16" });
  spacing.input.value = "16";
  const perBay = makeNumber("Injection ports per stud bay", "cs-perbay", { step: "any", min: "0", value: "1" });
  perBay.input.value = "1";
  const perSystem = makeNumber("Ports a single air system serves", "cs-persys", { step: "any", min: "0", value: "12" });
  perSystem.input.value = "12";
  for (const f of [wall, spacing, perBay, perSystem]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wall.input.value = "32"; spacing.input.value = "16"; perBay.input.value = "1"; perSystem.input.value = "12"; update(); });
  const oBays = makeOutputLine(outputRegion, "Stud bays", "cs-out-bays");
  const oPorts = makeOutputLine(outputRegion, "Injection ports", "cs-out-ports");
  const oSystems = makeOutputLine(outputRegion, "Air systems", "cs-out-sys");
  const update = debounce(() => {
    const r = computeCavityDryingSystem({ affected_wall_ft: Number(wall.input.value) || 0, stud_spacing_in: spacing.input.value === "" ? 16 : Number(spacing.input.value), ports_per_bay: perBay.input.value === "" ? 1 : Number(perBay.input.value), ports_per_system: perSystem.input.value === "" ? 12 : Number(perSystem.input.value) });
    if (r.error) { oBays.textContent = r.error; oPorts.textContent = "-"; oSystems.textContent = "-"; return; }
    oBays.textContent = r.bays + " bays";
    oPorts.textContent = r.ports + " ports";
    oSystems.textContent = r.systems + " system(s)";
  }, DEBOUNCE_MS);
  for (const el of [wall.input, spacing.input, perBay.input, perSystem.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["cavity-drying-system"] = renderCavityDryingSystem;

// --- spec-v198: Drying completion projection (`dry-time-projection`) ---
// remaining = current - goal; days = remaining / daily_drop (constant-rate,
// optimistic near goal). A non-positive daily drop reports "not progressing".
// dims: in { current_mc_pct: dimensionless, goal_mc_pct: dimensionless, daily_drop_pct: dimensionless } out: { remaining_pts: dimensionless, days_to_goal: T }
export function computeDryTimeProjection({ current_mc_pct = 0, goal_mc_pct = 0, daily_drop_pct = 0 } = {}) {
  const cur = Number(current_mc_pct);
  const goal = Number(goal_mc_pct);
  const drop = Number(daily_drop_pct);
  if (![cur, goal, drop].every(Number.isFinite)) return { error: "Inputs must be finite numbers." };
  if (!(cur > goal)) return { error: "Current reading must be above the goal." };
  const remaining = cur - goal;
  if (!(drop > 0)) {
    return {
      remaining_pts: remaining,
      days_to_goal: null,
      progressing: false,
      note: "Not progressing - reassess airflow, dehumidification, and access.",
    };
  }
  const days = remaining / drop;
  return {
    remaining_pts: remaining,
    days_to_goal: Number.isFinite(days) ? days : null,
    progressing: true,
    note: "Drying is non-linear and slows near the goal, so this constant-rate projection runs optimistic at the end. The drying-log boundary readings and the restorer's daily monitoring govern the actual endpoint. The dry standard is the unaffected reference. IICRC S500 governs.",
  };
}
export const dryTimeProjectionExample = { inputs: { current_mc_pct: 28, goal_mc_pct: 12, daily_drop_pct: 4 } };

function renderDryTimeProjection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Linear-trend completion projection (ANSI/IICRC S500), by name. Drying is non-linear and slows as it approaches the goal, so a constant-rate projection is a planning estimate that runs optimistic near the end. The drying-log boundary readings and the restorer's daily monitoring govern the actual endpoint; the dry standard is the unaffected reference, not an absolute number.";
  const cur = makeNumber("Current moisture content (percent)", "dt-cur", { step: "any", min: "0", value: "28" });
  cur.input.value = "28";
  const goal = makeNumber("Goal moisture content (percent)", "dt-goal", { step: "any", min: "0", value: "12" });
  goal.input.value = "12";
  const drop = makeNumber("Drop over the last 24 hours (points)", "dt-drop", { step: "any", value: "4" });
  drop.input.value = "4";
  for (const f of [cur, goal, drop]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cur.input.value = "28"; goal.input.value = "12"; drop.input.value = "4"; update(); });
  const oRem = makeOutputLine(outputRegion, "Remaining to goal", "dt-out-rem");
  const oDays = makeOutputLine(outputRegion, "Projected days to goal", "dt-out-days");
  const update = debounce(() => {
    const r = computeDryTimeProjection({ current_mc_pct: Number(cur.input.value) || 0, goal_mc_pct: Number(goal.input.value) || 0, daily_drop_pct: Number(drop.input.value) || 0 });
    if (r.error) { oRem.textContent = r.error; oDays.textContent = "-"; return; }
    oRem.textContent = fmt(r.remaining_pts, 1) + " points";
    oDays.textContent = r.progressing ? fmt(r.days_to_goal, 1) + " days (optimistic near goal)" : r.note;
  }, DEBOUNCE_MS);
  for (const el of [cur.input, goal.input, drop.input]) el.addEventListener("input", update);
}
RESTORATION_RENDERERS["dry-time-projection"] = renderDryTimeProjection;
