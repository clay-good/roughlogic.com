// Group D: Water Damage and Mold Restoration calculators (32 through 39).
//
// Water classes/categories, drying times, mold conditions, and PPE selection
// reference IICRC S500 by name only; the standard text is not reproduced.

import { psychrometric, F_to_C } from "./pure-math.js";

// --- Utility 32: Psychrometric Calculator ---

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

export function computeDehumidifierSize({ room_cubic_feet, water_class = "2", expected_pints_per_day = null }) {
  const factor = AHAM_PINTS_PER_FT3_BY_CLASS[String(water_class)];
  const aham = factor ? room_cubic_feet * factor : null;
  // Field method: scale by 1.55x to account for actual job conditions.
  const field = aham !== null ? aham * 1.55 : null;
  return {
    aham_pints_per_day: aham,
    field_pints_per_day: field,
    expected_pints_per_day,
    recommendation: field ?? expected_pints_per_day,
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

export function computeAirMovers({ affected_area_ft2, water_class = "2" }) {
  const ft2_per = AIR_MOVER_FT2_PER_UNIT_BY_CLASS[String(water_class)];
  if (!ft2_per) return { error: "Unknown water class." };
  const count = Math.ceil(affected_area_ft2 / ft2_per);
  // Typical air mover ~ 2500 CFM at low setting. Coverage in CFM/ft^2.
  const cfm_per_unit = 2500;
  const total_cfm = count * cfm_per_unit;
  const cfm_per_ft2 = affected_area_ft2 > 0 ? total_cfm / affected_area_ft2 : 0;
  return { air_mover_count: count, ft2_per_unit: ft2_per, total_cfm, cfm_per_ft2 };
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

export function computeDryingTime({ material }) {
  const m = DRYING_TIMES[material];
  if (!m) return { error: "Unknown material." };
  return { material, typical_days: m.typical_days, notes: m.notes };
}

// --- Utility 38: Mold Growth Conditions ---

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
  const update = debounce(() => {
    const r = computeDehumidifierSize({ room_cubic_feet: Number(v.input.value) || 0, water_class: c.select.value });
    oA.textContent = fmt(r.aham_pints_per_day, 1);
    oF.textContent = fmt(r.field_pints_per_day, 1);
  }, DEBOUNCE_MS);
  for (const el of [v.input, c.select]) el.addEventListener("input", update);
}

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
  const update = debounce(() => {
    const r = computeAirMovers({ affected_area_ft2: Number(a.input.value) || 0, water_class: c.select.value });
    if (r.error) { oC.textContent = r.error; oCFM.textContent = "-"; return; }
    oC.textContent = String(r.air_mover_count) + " (" + r.ft2_per_unit + " ft^2 each)";
    oCFM.textContent = fmt(r.total_cfm, 0) + " CFM";
  }, DEBOUNCE_MS);
  for (const el of [a.input, c.select]) el.addEventListener("input", update);
}

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

export function computeHEPALife({ cfm, hours_per_day, particulate_category = "medium", capacity_grams = HEPA_LOADING.default_capacity_grams }) {
  const c = Number(cfm) || 0;
  const h = Number(hours_per_day) || 0;
  const cap = Number(capacity_grams) || 0;
  const rate = HEPA_LOADING.loading_per_CFM_hour[particulate_category];
  if (rate === undefined) return { error: "Unknown particulate category." };
  if (c <= 0 || h <= 0 || cap <= 0) return { error: "Provide positive CFM, hours, capacity." };
  const grams_per_day = c * h * rate;
  const days = cap / grams_per_day;
  return { days, grams_per_day, capacity_grams: cap, particulate_category };
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

export function computeThermalDeltaTReference() {
  return { scenarios: THERMAL_DELTA_T_REFERENCE };
}

export const thermalDeltaTExample = {
  inputs: {},
  expected: { count: THERMAL_DELTA_T_REFERENCE.length },
};

// --- v2 view renderers ---

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
  for (const f of [cfm, hpd, cap, cat]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "600"; hpd.input.value = "24"; cap.input.value = "1500"; cat.select.value = "medium"; update(); });
  const oD = makeOutputLine(outputRegion, "Estimated filter life", "hl-out-d");
  const oG = makeOutputLine(outputRegion, "Loading rate", "hl-out-g");
  const update = debounce(() => {
    const r = computeHEPALife({
      cfm: Number(cfm.input.value) || 0,
      hours_per_day: Number(hpd.input.value) || 0,
      capacity_grams: Number(cap.input.value) || 0,
      particulate_category: cat.select.value,
    });
    if (r.error) { oD.textContent = r.error; oG.textContent = "-"; return; }
    oD.textContent = fmt(r.days, 1) + " days";
    oG.textContent = fmt(r.grams_per_day, 1) + " g/day";
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, hpd.input, cap.input, cat.select]) el.addEventListener("input", update);
}

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
};
