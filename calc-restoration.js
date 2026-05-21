// Group D: Water Damage and Mold Restoration calculators (32 through 39).
//
// Water classes/categories, drying times, mold conditions, and PPE selection
// reference IICRC S500 by name only; the standard text is not reproduced.

import { psychrometric, F_to_C } from "./pure-math.js";

// --- Utility 32: Psychrometric Calculator ---

// dims: in { temperature_F: T, RH_percent: dimensionless, atmospheric_pressure_hPa: M L^-1 T^-2 }
//        out: { dew_point_F: T, GPP: dimensionless, vapor_pressure_hPa: M L^-1 T^-2, saturation_pressure_hPa: M L^-1 T^-2, specific_humidity_kg_kg: dimensionless }
// (Temperature inputs / outputs carry the §7.1 base-token `T`;
//  pressure surfaces as `M L^-1 T^-2` (one pascal = kg m^-1 s^-2).
//  Grains-per-pound is a dimensionless mass-fraction (7000 grains
//  per pound divides out). RH and specific humidity are dimensionless.)
export function computePsychrometric({ temperature_F, RH_percent, atmospheric_pressure_hPa = 1013.25 }) {
  const T_C = F_to_C(temperature_F);
  const r = psychrometric({ T_C, RH_percent, P_hPa: atmospheric_pressure_hPa });
  return {
    dew_point_F: r.dewPoint_C * 9 / 5 + 32,
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
    days_to_target = Math.max(0, t_target - last.day_index);
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
