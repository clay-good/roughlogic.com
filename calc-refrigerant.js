// Group C: Refrigerant-circuit bench (P-T lookup, superheat/subcool,
// refrigerant comparison, line-set charge, and full charging diagnostics).
//
// spec-v89 cap-relief split: this cohesive refrigerant-circuit bench -- the
// manufacturer P-T saturation lookup, the superheat/subcool diagnostic with
// fixed-orifice and TXV target verdicts, the side-by-side refrigerant
// comparison, the line-set charge estimator, and the full suction/liquid
// charging diagnostic -- was extracted out of calc-hvac.js (which had reached
// 94.3% of its gzip cap, the tightest remaining renderer module) into this
// module. All five tiles KEEP group: "C" (a tile's group letter is independent
// of the module that holds it, the v42/v70..v88 precedent); their ids,
// citations, worked examples, dimensional annotations, and behavior are
// byte-for-byte unchanged.
//
// The cut is clean: the bench reaches nothing outside the ./ui-fields.js
// helpers it imports, the single interpolateRefrigerant primitive from
// ./pure-math.js, and the per-module _finiteGuard (copied verbatim,
// non-exported, so it adds no v14 derivation-corpus row and the helper also
// remains in calc-hvac.js for its ~30 other tiles -- no cross-module import).
// The bundled REFRIGERANTS, CHARGE_OZ_PER_FT, REFRIGERANT_OAT_PRESETS, and
// REFRIGERANT_PT_TABLES_v7 tables are read only by these five tiles, so they
// move with the bench.
//
// Each calculator exports two things:
//   - compute(inputs): pure function returning the calculator output object.
//   - example: a known test case used by the "Test with example" button and
//     by the unit tests, with the expected output.
//
// The calculator views (renderXxx) wire DOM events and use compute().
// All DOM manipulation uses textContent / createElement only.

import { interpolateRefrigerant } from "./pure-math.js";
import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row. Copied verbatim
// from calc-hvac.js at the spec-v89 split (that module keeps its own copy
// for its remaining tiles, so the split leaves no cross-module import).
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

// --- Bundled refrigerant P-T data (manufacturer-published, attributed) ---

export const REFRIGERANTS = {
  "R-410A": {
    manufacturer: "Chemours / Honeywell published bulletins",
    pt_pairs: [
      { pressure_psig: 50, temperature_F: 14 },
      { pressure_psig: 75, temperature_F: 31 },
      { pressure_psig: 100, temperature_F: 30 },
      { pressure_psig: 118, temperature_F: 40 },
      { pressure_psig: 156, temperature_F: 55 },
      { pressure_psig: 200, temperature_F: 70 },
      { pressure_psig: 251, temperature_F: 85 },
      { pressure_psig: 313, temperature_F: 100 },
      { pressure_psig: 386, temperature_F: 115 },
    ],
  },
  "R-32": {
    manufacturer: "Daikin / Honeywell published bulletins",
    pt_pairs: [
      { pressure_psig: 50, temperature_F: 8 },
      { pressure_psig: 100, temperature_F: 36 },
      { pressure_psig: 150, temperature_F: 56 },
      { pressure_psig: 200, temperature_F: 72 },
      { pressure_psig: 300, temperature_F: 100 },
    ],
  },
  "R-22": {
    manufacturer: "Legacy data; Chemours bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 5 },
      { pressure_psig: 50, temperature_F: 28 },
      { pressure_psig: 75, temperature_F: 45 },
      { pressure_psig: 100, temperature_F: 60 },
      { pressure_psig: 150, temperature_F: 84 },
      { pressure_psig: 200, temperature_F: 102 },
    ],
  },
  "R-134a": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 10, temperature_F: 16 },
      { pressure_psig: 30, temperature_F: 35 },
      { pressure_psig: 50, temperature_F: 50 },
      { pressure_psig: 100, temperature_F: 79 },
      { pressure_psig: 150, temperature_F: 104 },
    ],
  },
  "R-404A": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 16 },
      { pressure_psig: 60, temperature_F: 14 },
      { pressure_psig: 100, temperature_F: 37 },
      { pressure_psig: 150, temperature_F: 58 },
      { pressure_psig: 200, temperature_F: 75 },
    ],
  },
  "R-407C": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 6 },
      { pressure_psig: 60, temperature_F: 22 },
      { pressure_psig: 100, temperature_F: 47 },
      { pressure_psig: 150, temperature_F: 68 },
      { pressure_psig: 200, temperature_F: 86 },
    ],
  },
};

// --- Utility 25: Refrigerant P-T Lookup ---

// dims: in { refrigerant: dimensionless, pressure_psig: M L^-1 T^-2, temperature_F: T, outdoor_F: T, indoor_wb_F: T } out: { saturation_temp_F: T, pressure_psig: M L^-1 T^-2, target_superheat_F: T, target_subcool_F: T }
export function computeRefrigerantPT({ refrigerant, pressure_psig = null, temperature_F = null, outdoor_F = null, indoor_wb_F = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r = REFRIGERANTS[refrigerant];
  if (!r) return { error: "Unknown refrigerant." };
  if (pressure_psig === null && temperature_F === null) return { error: "Provide pressure or temperature." };
  const value = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig, temperature_F });
  // v8 §C.3: target-superheat lookup for outdoor temp + indoor wet-bulb.
  // Carrier / Trane published TXV / fixed-orifice charging charts collapse
  // to a roughly-linear band: superheat decreases as outdoor temp rises and
  // increases as indoor wet-bulb rises. The bundled engineering-practice
  // approximation: target_superheat_F = clamp(70 + 0.6 × WB - 0.5 × OAT, 5, 30).
  let target_superheat_F = null;
  if (outdoor_F !== null && indoor_wb_F !== null) {
    const t = 70 + 0.6 * Number(indoor_wb_F) - 0.5 * Number(outdoor_F);
    target_superheat_F = Math.max(5, Math.min(30, t));
  }
  const out = pressure_psig !== null
    ? { saturated_temperature_F: value, manufacturer: r.manufacturer }
    : { saturated_pressure_psig: value, manufacturer: r.manufacturer };
  if (target_superheat_F !== null) {
    out.target_superheat_F = target_superheat_F;
    out.superheat_lookup_note = "Engineering-practice band; manufacturer-published charging chart governs.";
  }
  return out;
}

export const refrigerantPTExample = {
  inputs: { refrigerant: "R-410A", pressure_psig: 118 },
  expected: { saturated_temperature_F: 40 },
};

// --- Utility 26: Superheat and Subcool ---

// v8 §C.3: classify a superheat or subcool reading against typical bands
// and return a one-line diagnostic so the renderer doesn't have to.
function _v8shScDiagnostic(value, mode) {
  if (!Number.isFinite(value)) return null;
  if (mode === "superheat") {
    if (value < 5)  return { band: "low",  diagnostic: "low - check overcharge or restricted metering" };
    if (value > 25) return { band: "high", diagnostic: "high - check coil fouling or low charge" };
    return { band: "in-range", diagnostic: "in-range (5-25 F)" };
  }
  if (mode === "subcool") {
    if (value < 2)  return { band: "low",  diagnostic: "low - check undercharge or liquid-line restriction" };
    if (value > 10) return { band: "high", diagnostic: "high - check overcharge" };
    return { band: "in-range", diagnostic: "in-range (2-10 F)" };
  }
  return null;
}

// dims: in { refrigerant: dimensionless, system_pressure_psig: M L^-1 T^-2, line_temperature_F: T, mode: dimensionless, indoor_wet_bulb_F: T, outdoor_dry_bulb_F: T, deadband_F: T } out: { value_F: T, sat_F: T, target_superheat_F: T }
export function computeSuperheatSubcool({ refrigerant, system_pressure_psig, line_temperature_F, mode, indoor_wet_bulb_F = 0, outdoor_dry_bulb_F = 0, deadband_F = 5, target_subcool_F = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r = REFRIGERANTS[refrigerant];
  if (!r) return { error: "Unknown refrigerant." };
  const sat_T = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig: system_pressure_psig });
  if (mode === "superheat") {
    const value = line_temperature_F - sat_T;
    const d = _v8shScDiagnostic(value, "superheat");
    // v23 EN.2: fixed-orifice target-superheat method + charge verdict. The
    // common charging-chart approximation target_SH = (3*IWB - 80 - ODB)/2
    // (user-confirmable against the manufacturer chart). Default off.
    let target_superheat_F = null, charge_verdict = null;
    const iwb = Number(indoor_wet_bulb_F) || 0, odb = Number(outdoor_dry_bulb_F) || 0;
    let dead = Number(deadband_F); if (!Number.isFinite(dead) || dead < 0) dead = 5;
    if (iwb > 0 && Number.isFinite(iwb) && Number.isFinite(odb)) {
      const tgt = (3 * iwb - 80 - odb) / 2;
      if (Number.isFinite(tgt)) {
        target_superheat_F = tgt;
        if (Number.isFinite(value)) {
          charge_verdict = value > tgt + dead ? "undercharge (superheat above target)"
            : value < tgt - dead ? "overcharge (superheat below target)"
            : "within target band";
        }
      }
    }
    return { saturated_temperature_F: sat_T, superheat_F: value, band: d && d.band, diagnostic: d && d.diagnostic, target_superheat_F, charge_verdict };
  }
  if (mode === "subcool") {
    const value = sat_T - line_temperature_F;
    const d = _v8shScDiagnostic(value, "subcool");
    // spec-v27 EN: TXV/EEV target-subcooling charge verdict (mirrors the
    // fixed-orifice target-superheat path). Default off (no target -> prior
    // output unchanged). A negative subcool (no liquid seal) is surfaced by
    // the existing diagnostic band.
    let target_subcool_F_out = null, subcool_charge_verdict = null;
    const tgt = Number(target_subcool_F) || 0;
    let dead = Number(deadband_F); if (!Number.isFinite(dead) || dead < 0) dead = 5;
    if (tgt > 0 && Number.isFinite(value)) {
      target_subcool_F_out = tgt;
      subcool_charge_verdict = value < tgt - dead ? "undercharge (subcool below target; add refrigerant)"
        : value > tgt + dead ? "overcharge (subcool above target; recover refrigerant)"
        : "within target band";
    }
    return { saturated_temperature_F: sat_T, subcool_F: value, band: d && d.band, diagnostic: d && d.diagnostic, target_subcool_F: target_subcool_F_out, subcool_charge_verdict };
  }
  return { error: "Mode must be 'superheat' or 'subcool'." };
}

export const superheatSubcoolExample = {
  inputs: { refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" },
  expected: { superheat_F_approx: 10 },
};

// --- Utility 119: Compare Two Refrigerants ---
//
// Side-by-side P-T view at a chosen pressure or temperature. Each side
// surfaces the manufacturer attribution from data/hvac/refrigerants.json
// (mirrored in REFRIGERANTS).

// dims: in { refrigerant_a: dimensionless, refrigerant_b: dimensionless, pressure_psig: M L^-1 T^-2, temperature_F: T } out: { delta: dimensionless }
export function computeCompareRefrigerants({ refrigerant_a, refrigerant_b, pressure_psig = null, temperature_F = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = REFRIGERANTS[refrigerant_a];
  const b = REFRIGERANTS[refrigerant_b];
  if (!a) return { error: "Unknown refrigerant A." };
  if (!b) return { error: "Unknown refrigerant B." };
  if (pressure_psig === null && temperature_F === null) return { error: "Provide pressure or temperature." };
  const lookup = (r) => {
    const v = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig, temperature_F });
    if (pressure_psig !== null) return { saturated_temperature_F: v, manufacturer: r.manufacturer };
    return { saturated_pressure_psig: v, manufacturer: r.manufacturer };
  };
  return {
    a: { id: refrigerant_a, ...lookup(a) },
    b: { id: refrigerant_b, ...lookup(b) },
    mode: pressure_psig !== null ? "pressure_to_temp" : "temp_to_pressure",
    input: pressure_psig !== null ? { pressure_psig } : { temperature_F },
  };
}

export const compareRefrigerantsExample = {
  inputs: { refrigerant_a: "R-410A", refrigerant_b: "R-32", pressure_psig: 100 },
  expected: { mode: "pressure_to_temp" },
};

// --- Utility 79: Line-set Refrigerant Charge ---
//
// oz = sum over each line section of (ft * oz_per_ft) using
// per-refrigerant per-line-diameter values. Manufacturer-attributed.

export const CHARGE_OZ_PER_FT = {
  "R-410A": { "1/4": 0.30, "3/8": 0.60, "1/2": 0.95, "5/8": 1.30, "3/4": 1.65 },
  "R-32":   { "1/4": 0.27, "3/8": 0.55, "1/2": 0.85, "5/8": 1.20, "3/4": 1.50 },
  "R-22":   { "1/4": 0.30, "3/8": 0.60, "1/2": 0.95, "5/8": 1.30, "3/4": 1.65 },
  "R-134a": { "1/4": 0.20, "3/8": 0.40, "1/2": 0.65, "5/8": 0.85, "3/4": 1.10 },
  "R-404A": { "1/4": 0.32, "3/8": 0.62, "1/2": 1.00, "5/8": 1.35, "3/4": 1.70 },
  "R-407C": { "1/4": 0.28, "3/8": 0.58, "1/2": 0.92, "5/8": 1.25, "3/4": 1.60 },
};

// dims: in { refrigerant: dimensionless, sections: dimensionless } out: { total_charge_oz: M }
export function computeRefrigerantCharge({ refrigerant, sections = [] }) {
  const table = CHARGE_OZ_PER_FT[refrigerant];
  if (!table) return { error: "Unknown refrigerant." };
  let total = 0;
  const detail = [];
  for (const s of sections) {
    const oz_per_ft = table[s.diameter];
    if (oz_per_ft === undefined) return { error: "Unknown line diameter: " + s.diameter };
    const ft = Number(s.length_ft) || 0;
    const oz = oz_per_ft * ft;
    total += oz;
    detail.push({ diameter: s.diameter, length_ft: ft, oz });
  }
  return { total_oz: total, total_lb: total / 16, sections: detail };
}

export const refrigerantChargeExample = {
  inputs: { refrigerant: "R-410A", sections: [{ diameter: "3/8", length_ft: 25 }, { diameter: "3/4", length_ft: 25 }] },
  expected: { total_oz: 25 * 0.60 + 25 * 1.65 },
};

// --- 243: Refrigerant Charging (suction/liquid superheat + subcool) ---

export const REFRIGERANT_PT_TABLES_v7 = {
  R_410A: [
    { psia: 30,  T_F: -25 }, { psia: 50,  T_F: -8 }, { psia: 80,  T_F: 13 },
    { psia: 100, T_F: 25 },  { psia: 130, T_F: 40 }, { psia: 170, T_F: 56 },
    { psia: 220, T_F: 73 },  { psia: 280, T_F: 90 }, { psia: 350, T_F: 105 },
    { psia: 430, T_F: 120 }, { psia: 520, T_F: 134 },
  ],
  R_32: [
    { psia: 30,  T_F: -22 }, { psia: 50,  T_F: -5 }, { psia: 80,  T_F: 16 },
    { psia: 100, T_F: 28 },  { psia: 130, T_F: 43 }, { psia: 170, T_F: 59 },
    { psia: 220, T_F: 76 },  { psia: 280, T_F: 93 }, { psia: 350, T_F: 109 },
    { psia: 430, T_F: 124 }, { psia: 520, T_F: 138 },
  ],
  R_454B: [
    { psia: 30,  T_F: -23 }, { psia: 50,  T_F: -6 }, { psia: 80,  T_F: 14 },
    { psia: 100, T_F: 26 },  { psia: 130, T_F: 41 }, { psia: 170, T_F: 57 },
    { psia: 220, T_F: 74 },  { psia: 280, T_F: 91 }, { psia: 350, T_F: 107 },
  ],
  R_22: [
    { psia: 25,  T_F: -10 }, { psia: 50,  T_F: 18 }, { psia: 75,  T_F: 38 },
    { psia: 100, T_F: 53 },  { psia: 150, T_F: 78 }, { psia: 200, T_F: 99 },
    { psia: 250, T_F: 117 }, { psia: 300, T_F: 132 }, { psia: 350, T_F: 146 },
  ],
  R_134a: [
    { psia: 15,  T_F: -10 }, { psia: 25,  T_F: 8 },  { psia: 40,  T_F: 28 },
    { psia: 60,  T_F: 50 },  { psia: 80,  T_F: 67 }, { psia: 100, T_F: 79 },
    { psia: 130, T_F: 95 },  { psia: 170, T_F: 110 }, { psia: 220, T_F: 128 },
  ],
};

function _interpRefSatT(refrigerant, psia) {
  const tbl = REFRIGERANT_PT_TABLES_v7[refrigerant];
  if (!tbl) return null;
  if (psia <= tbl[0].psia) return tbl[0].T_F;
  for (let i = 1; i < tbl.length; i++) {
    if (psia <= tbl[i].psia) {
      const lo = tbl[i - 1], hi = tbl[i];
      const f = (psia - lo.psia) / (hi.psia - lo.psia);
      return lo.T_F + f * (hi.T_F - lo.T_F);
    }
  }
  return tbl[tbl.length - 1].T_F;
}

// dims: in { args: dimensionless } out: { target_subcool_F: T, target_superheat_F: T }
export function computeRefrigerantCharging({
  refrigerant = "R_410A",
  suction_pressure = 0, suction_unit = "psig", suction_line_temp_F = 0,
  liquid_pressure = 0, liquid_unit = "psig", liquid_line_temp_F = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!REFRIGERANT_PT_TABLES_v7[refrigerant]) return { error: "Unknown refrigerant." };
  if (!(suction_pressure > 0) || !(liquid_pressure > 0)) return { error: "Pressures must be positive." };
  const suction_psia = suction_unit === "psig" ? suction_pressure + 14.696 : suction_pressure;
  const liquid_psia = liquid_unit === "psig" ? liquid_pressure + 14.696 : liquid_pressure;
  const T_sat_suction = _interpRefSatT(refrigerant, suction_psia);
  const T_sat_liquid = _interpRefSatT(refrigerant, liquid_psia);
  const superheat_F = Number(suction_line_temp_F) - T_sat_suction;
  const subcool_F = T_sat_liquid - Number(liquid_line_temp_F);
  const superheat_flag = superheat_F < 8 ? "low" : superheat_F > 12 ? "high" : "in-range";
  const subcool_flag = subcool_F < 8 ? "low" : subcool_F > 15 ? "high" : "in-range";
  return {
    suction_psia, liquid_psia,
    T_sat_suction_F: T_sat_suction, T_sat_liquid_F: T_sat_liquid,
    superheat_F, subcool_F, superheat_flag, subcool_flag,
  };
}

export const refrigerantChargingExample = {
  inputs: {
    refrigerant: "R_410A",
    suction_pressure: 130, suction_unit: "psig", suction_line_temp_F: 50,
    liquid_pressure: 350, liquid_unit: "psig", liquid_line_temp_F: 100,
  },
};

// v8 §C.3 + accessibility.md preset-chip pattern: common OAT charging
// conditions. One tap sets the OAT field on the refrigerant-pt view.
export const REFRIGERANT_OAT_PRESETS = [
  { id: "mild",     label: "Mild 75 F",     oat_F: 75,  description: "Mild summer day; AHRI 210/240 A2 / mild start-up" },
  { id: "design",   label: "Design 85 F",   oat_F: 85,  description: "ASHRAE 0.4% cooling design typical (varies by climate)" },
  { id: "hot",      label: "Hot 95 F",      oat_F: 95,  description: "AHRI 210/240 A condition (rated cooling)" },
  { id: "extreme",  label: "Extreme 105 F", oat_F: 105, description: "Direct-sun rooftop / desert summer peak" },
];

// =====================================================================
// Calculator views
// =====================================================================

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderRefrigerantPT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-published P-T tables for common refrigerants. Each refrigerant attributes its publishing manufacturer.";
  const ref = makeSelect("Refrigerant", "rp-r", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Input", "rp-m", [{ value: "pressure", label: "Pressure (psig)" }, { value: "temperature", label: "Temperature (F)" }]);
  const value = makeNumber("Value", "rp-v", { step: "any" });
  // v8 §C.3: optional outdoor air temp + indoor wet-bulb so the renderer
  // can also surface the typical target superheat for those conditions.
  const oat = makeNumber("Outdoor air temp (F, optional)", "rp-oat", { step: "any" });
  const wb = makeNumber("Indoor wet-bulb (F, optional)", "rp-wb", { step: "any" });
  // v8 §C.3 + accessibility.md preset-chip pattern: common OAT charging
  // conditions. One tap sets the OAT field.
  const oatChips = document.createElement("div");
  oatChips.className = "preset-chip-row";
  oatChips.setAttribute("role", "group");
  oatChips.setAttribute("aria-label", "Outdoor air temp presets");
  for (const p of REFRIGERANT_OAT_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { oat.input.value = String(p.oat_F); update(); });
    oatChips.appendChild(btn);
  }
  for (const f of [ref, mode, value, oat]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(oatChips);
  inputRegion.appendChild(wb.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; mode.select.value = "pressure"; value.input.value = "118"; update(); });
  const oT = makeOutputLine(outputRegion, "Saturated value", "rp-out-t");
  const oS = makeOutputLine(outputRegion, "Source", "rp-out-s");
  const oTSH = makeOutputLine(outputRegion, "Target superheat (if OAT + WB supplied)", "rp-out-tsh");
  const update = debounce(() => {
    const inputs = { refrigerant: ref.select.value };
    if (mode.select.value === "pressure") inputs.pressure_psig = Number(value.input.value);
    else inputs.temperature_F = Number(value.input.value);
    const oatVal = Number(oat.input.value);
    const wbVal = Number(wb.input.value);
    if (oat.input.value !== "" && wb.input.value !== "") {
      inputs.outdoor_F = oatVal;
      inputs.indoor_wb_F = wbVal;
    }
    const r = computeRefrigerantPT(inputs);
    if (r.error) { oT.textContent = r.error; oS.textContent = "-"; oTSH.textContent = "-"; return; }
    if (r.saturated_temperature_F !== undefined) oT.textContent = fmt(r.saturated_temperature_F, 1) + " F";
    else oT.textContent = fmt(r.saturated_pressure_psig, 1) + " psig";
    oS.textContent = r.manufacturer;
    oTSH.textContent = r.target_superheat_F == null ? "-" : (fmt(r.target_superheat_F, 1) + " F - " + r.superheat_lookup_note);
  }, DEBOUNCE_MS);
  for (const el of [ref.select, mode.select, value.input, oat.input, wb.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSuperheatSubcool(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Superheat = line temperature minus saturated temperature at suction pressure. Subcool = saturated temperature at liquid pressure minus liquid line temperature.";
  const ref = makeSelect("Refrigerant", "ss-r", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Mode", "ss-m", [{ value: "superheat", label: "Superheat" }, { value: "subcool", label: "Subcool" }]);
  const press = makeNumber("System pressure (psig)", "ss-p", { step: "any" });
  const temp = makeNumber("Line temperature (F)", "ss-t", { step: "any" });
  // v23 EN.2: optional fixed-orifice target-superheat from indoor wet-bulb +
  // outdoor dry-bulb, with a pass / overcharge / undercharge verdict.
  const iwb = makeNumber("Indoor wet-bulb (F, fixed-orifice target)", "ss-iwb", { step: "any", min: "0" });
  const odb = makeNumber("Outdoor dry-bulb (F)", "ss-odb", { step: "any" });
  // spec-v27 EN: optional TXV/EEV target-subcooling charge verdict.
  const tsc = makeNumber("Target subcool (F, TXV/EEV)", "ss-tsc", { step: "any", min: "0" });
  for (const f of [ref, mode, press, temp, iwb, odb, tsc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; mode.select.value = "superheat"; press.input.value = "118"; temp.input.value = "50"; iwb.input.value = "63"; odb.input.value = "95"; tsc.input.value = ""; update(); });
  const oSat = makeOutputLine(outputRegion, "Saturated temperature", "ss-out-sat");
  const oR = makeOutputLine(outputRegion, "Result", "ss-out-r");
  // v8 §C.3: out-of-range diagnostic.
  const oD = makeOutputLine(outputRegion, "Diagnostic", "ss-out-diag");
  const oV = makeOutputLine(outputRegion, "Target superheat / charge", "ss-out-verdict");
  const update = debounce(() => {
    const r = computeSuperheatSubcool({
      refrigerant: ref.select.value,
      system_pressure_psig: Number(press.input.value) || 0,
      line_temperature_F: Number(temp.input.value) || 0,
      mode: mode.select.value,
      indoor_wet_bulb_F: Number(iwb.input.value) || 0,
      outdoor_dry_bulb_F: Number(odb.input.value) || 0,
      target_subcool_F: Number(tsc.input.value) || 0,
    });
    if (r.error) { oSat.textContent = r.error; oR.textContent = "-"; oD.textContent = "-"; oV.textContent = "-"; return; }
    oSat.textContent = fmt(r.saturated_temperature_F, 1) + " F";
    oR.textContent = mode.select.value === "superheat"
      ? (fmt(r.superheat_F, 1) + " F superheat")
      : (fmt(r.subcool_F, 1) + " F subcool");
    oD.textContent = r.diagnostic || "-";
    if (mode.select.value === "subcool") {
      oV.textContent = (r.target_subcool_F == null) ? "(enter target subcool)" : (fmt(r.target_subcool_F, 1) + " F target - " + (r.subcool_charge_verdict || "-"));
    } else {
      oV.textContent = (r.target_superheat_F == null) ? "(enter wet-bulb + outdoor dry-bulb)" : (fmt(r.target_superheat_F, 1) + " F target - " + (r.charge_verdict || "-"));
    }
  }, DEBOUNCE_MS);
  for (const el of [ref.select, mode.select, press.input, temp.input, iwb.input, odb.input, tsc.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderCompareRefrigerants(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer P-T table by attribution. ASHRAE 15-2022 governs refrigerant safety; manufacturer technical bulletin governs charge. Free at ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards.";
  const a = makeSelect("Refrigerant A", "cmp-a", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const b = makeSelect("Refrigerant B", "cmp-b", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Mode", "cmp-mode", [
    { value: "pressure", label: "Pressure -> Temperature" },
    { value: "temperature", label: "Temperature -> Pressure" },
  ]);
  const v = makeNumber("Value", "cmp-v", { step: "any" });
  for (const f of [a, b, mode, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.select.value = "R-410A"; b.select.value = "R-32"; mode.select.value = "pressure"; v.input.value = "100"; update(); });
  const oA = makeOutputLine(outputRegion, "Refrigerant A", "cmp-out-a");
  const oAttrA = makeOutputLine(outputRegion, "A source", "cmp-out-a-src");
  const oB = makeOutputLine(outputRegion, "Refrigerant B", "cmp-out-b");
  const oAttrB = makeOutputLine(outputRegion, "B source", "cmp-out-b-src");
  const update = debounce(() => {
    const num = Number(v.input.value);
    const args = { refrigerant_a: a.select.value, refrigerant_b: b.select.value };
    if (mode.select.value === "pressure") args.pressure_psig = num; else args.temperature_F = num;
    const r = computeCompareRefrigerants(args);
    if (r.error) { oA.textContent = r.error; oAttrA.textContent = "-"; oB.textContent = "-"; oAttrB.textContent = "-"; return; }
    const fmtSide = (side) => side.saturated_temperature_F !== undefined
      ? fmt(side.saturated_temperature_F, 2) + " F"
      : fmt(side.saturated_pressure_psig, 2) + " psig";
    oA.textContent = a.select.value + ": " + fmtSide(r.a);
    oAttrA.textContent = r.a.manufacturer;
    oB.textContent = b.select.value + ": " + fmtSide(r.b);
    oAttrB.textContent = r.b.manufacturer;
  }, DEBOUNCE_MS);
  for (const el of [a.select, b.select, mode.select, v.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderRefrigerantCharge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer line-set charge tables (oz per foot per refrigerant per diameter). Attribute manufacturer per entry.";
  const ref = makeSelect("Refrigerant", "rc-r", Object.keys(CHARGE_OZ_PER_FT).map((k) => ({ value: k, label: k })));
  const dia = makeSelect("Line diameter (in)", "rc-d", ["1/4", "3/8", "1/2", "5/8", "3/4"].map((d) => ({ value: d, label: d })));
  const len = makeNumber("Total line length (ft)", "rc-l", { step: "any", min: "0" });
  for (const f of [ref, dia, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; dia.select.value = "3/8"; len.input.value = "50"; update(); });
  const oOz = makeOutputLine(outputRegion, "Total charge", "rc-out-oz");
  const oLb = makeOutputLine(outputRegion, "Total charge (lb)", "rc-out-lb");
  const update = debounce(() => {
    const r = computeRefrigerantCharge({
      refrigerant: ref.select.value,
      sections: [{ diameter: dia.select.value, length_ft: Number(len.input.value) || 0 }],
    });
    if (r.error) { oOz.textContent = r.error; oLb.textContent = "-"; return; }
    oOz.textContent = fmt(r.total_oz, 2) + " oz";
    oLb.textContent = fmt(r.total_lb, 3) + " lb";
  }, DEBOUNCE_MS);
  for (const el of [ref.select, dia.select, len.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderRefrigerantCharging(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-attributed P-T tables (data/hvac/refrigerant-pt-tables.json). psig is the gauge default; toggle to psia per input. Manufacturer typical 8-12 °F superheat / 8-15 °F subcool when no charging chart applies.";
  attachExampleButton(inputRegion, () => fillExample(refrigerantChargingExample.inputs));
  const ref = makeSelect("Refrigerant", "rc-ref", Object.keys(REFRIGERANT_PT_TABLES_v7).map((k) => ({ value: k, label: k.replace("_", "-") })));
  const sp = makeNumber("Suction pressure", "rc-sp", { step: "any", min: "0" });
  const su = makeSelect("Suction unit", "rc-su", [{ value: "psig", label: "psig (gauge)" }, { value: "psia", label: "psia (absolute)" }]);
  const st = makeNumber("Suction line T (°F)", "rc-st", { step: "any" });
  const lp = makeNumber("Liquid pressure", "rc-lp", { step: "any", min: "0" });
  const lu = makeSelect("Liquid unit", "rc-lu", [{ value: "psig", label: "psig (gauge)" }, { value: "psia", label: "psia (absolute)" }]);
  const lt = makeNumber("Liquid line T (°F)", "rc-lt", { step: "any" });
  for (const f of [ref, sp, su, st, lp, lu, lt]) inputRegion.appendChild(f.wrap);
  const oTSS = makeOutputLine(outputRegion, "T_sat at suction", "rc-out-tss");
  const oTSL = makeOutputLine(outputRegion, "T_sat at liquid", "rc-out-tsl");
  const oSH = makeOutputLine(outputRegion, "Superheat", "rc-out-sh");
  const oSC = makeOutputLine(outputRegion, "Subcool", "rc-out-sc");
  function fillExample(x) {
    ref.select.value = x.refrigerant; sp.input.value = x.suction_pressure; su.select.value = x.suction_unit;
    st.input.value = x.suction_line_temp_F; lp.input.value = x.liquid_pressure; lu.select.value = x.liquid_unit;
    lt.input.value = x.liquid_line_temp_F; update();
  }
  const update = debounce(() => {
    const r = computeRefrigerantCharging({
      refrigerant: ref.select.value,
      suction_pressure: Number(sp.input.value) || 0, suction_unit: su.select.value,
      suction_line_temp_F: Number(st.input.value) || 0,
      liquid_pressure: Number(lp.input.value) || 0, liquid_unit: lu.select.value,
      liquid_line_temp_F: Number(lt.input.value) || 0,
    });
    if (r.error) { oTSS.textContent = r.error; oTSL.textContent = "-"; oSH.textContent = "-"; oSC.textContent = "-"; return; }
    oTSS.textContent = fmt(r.T_sat_suction_F, 1) + " °F (" + fmt(r.suction_psia, 1) + " psia)";
    oTSL.textContent = fmt(r.T_sat_liquid_F, 1) + " °F (" + fmt(r.liquid_psia, 1) + " psia)";
    oSH.textContent = fmt(r.superheat_F, 1) + " °F (" + r.superheat_flag + ")";
    oSC.textContent = fmt(r.subcool_F, 1) + " °F (" + r.subcool_flag + ")";
  }, DEBOUNCE_MS);
  for (const f of [ref.select, sp.input, su.select, st.input, lp.input, lu.select, lt.input]) f.addEventListener("input", update);
}

export const REFRIGERANT_RENDERERS = {
  "refrigerant-pt": renderRefrigerantPT,
  "superheat-subcool": renderSuperheatSubcool,
  "compare-refrigerants": renderCompareRefrigerants,
  "refrigerant-charge": renderRefrigerantCharge,
  "refrigerant-charging": renderRefrigerantCharging,
};
