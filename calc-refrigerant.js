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
      { pressure_psig: 50, temperature_F: 1 },
      { pressure_psig: 75, temperature_F: 18 },
      { pressure_psig: 100, temperature_F: 32 },
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
      { pressure_psig: 50, temperature_F: 1 },
      { pressure_psig: 100, temperature_F: 30 },
      { pressure_psig: 150, temperature_F: 52 },
      { pressure_psig: 200, temperature_F: 68 },
      { pressure_psig: 300, temperature_F: 94 },
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
      { pressure_psig: 10, temperature_F: 7 },
      { pressure_psig: 30, temperature_F: 35 },
      { pressure_psig: 50, temperature_F: 54 },
      { pressure_psig: 100, temperature_F: 88 },
      { pressure_psig: 150, temperature_F: 111 },
    ],
  },
  "R-404A": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: -2 },
      { pressure_psig: 60, temperature_F: 24 },
      { pressure_psig: 100, temperature_F: 48 },
      { pressure_psig: 150, temperature_F: 71 },
      { pressure_psig: 200, temperature_F: 89 },
    ],
  },
  "R-407C": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 12 },
      { pressure_psig: 60, temperature_F: 38 },
      { pressure_psig: 100, temperature_F: 62 },
      { pressure_psig: 150, temperature_F: 84 },
      { pressure_psig: 200, temperature_F: 101 },
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
  // The published fixed-orifice charging-chart approximation is
  // target_SH = (3 × IWB − 80 − ODB) / 2 (superheat falls as outdoor temp
  // rises and rises with indoor wet-bulb) -- the same identity the sibling
  // superheat-subcool tile uses; the two must agree on this quantity. Clamped
  // to a sane [5, 30] °F band only at the extremes of the chart's domain.
  let target_superheat_F = null;
  if (outdoor_F !== null && indoor_wb_F !== null) {
    const t = (3 * Number(indoor_wb_F) - 80 - Number(outdoor_F)) / 2;
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
    { psia: 30,  T_F: -34 }, { psia: 50,  T_F: -11 }, { psia: 80,  T_F: 12 },
    { psia: 100, T_F: 24 },  { psia: 130, T_F: 39 }, { psia: 170, T_F: 55 },
    { psia: 220, T_F: 71 },  { psia: 280, T_F: 88 }, { psia: 350, T_F: 104 },
    { psia: 430, T_F: 120 }, { psia: 520, T_F: 135 },
  ],
  R_32: [
    { psia: 30,  T_F: -34 }, { psia: 50,  T_F: -12 }, { psia: 80,  T_F: 11 },
    { psia: 100, T_F: 23 },  { psia: 130, T_F: 37 }, { psia: 170, T_F: 53 },
    { psia: 220, T_F: 70 },  { psia: 280, T_F: 86 }, { psia: 350, T_F: 102 },
    { psia: 430, T_F: 117 }, { psia: 520, T_F: 132 },
  ],
  R_454B: [
    { psia: 30,  T_F: -31 }, { psia: 50,  T_F: -9 }, { psia: 80,  T_F: 15 },
    { psia: 100, T_F: 27 },  { psia: 130, T_F: 42 }, { psia: 170, T_F: 58 },
    { psia: 220, T_F: 75 },  { psia: 280, T_F: 91 }, { psia: 350, T_F: 108 },
  ],
  R_22: [
    { psia: 25,  T_F: -20 }, { psia: 50,  T_F: 13 }, { psia: 75,  T_F: 34 },
    { psia: 100, T_F: 51 },  { psia: 150, T_F: 76 }, { psia: 200, T_F: 96 },
    { psia: 250, T_F: 113 }, { psia: 300, T_F: 127 }, { psia: 350, T_F: 140 },
  ],
  R_134a: [
    { psia: 15,  T_F: -16 }, { psia: 25,  T_F: 7 },  { psia: 40,  T_F: 29 },
    { psia: 60,  T_F: 50 },  { psia: 80,  T_F: 66 }, { psia: 100, T_F: 79 },
    { psia: 130, T_F: 96 },  { psia: 170, T_F: 113 }, { psia: 220, T_F: 132 },
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

// ===================== spec-v320..v322: refrigeration-cycle batch =====================
// The P-h-diagram quantities the catalog uses but never computes: the
// refrigerant mass flow from the load and the refrigeration effect, the cycle
// COP and its Carnot ceiling, and the condenser total heat of rejection.

// dims: in { q: M L^2 T^-3, unit_tons: dimensionless, h1_btulb: L^2 T^-2, h4_btulb: L^2 T^-2 } out: { re_btulb: L^2 T^-2, m_dot_lbmin: M T^-1, m_dot_lbh: M T^-1 }
export function computeRefrigerantMassFlow({ q = 0, unit_tons = 0, h1_btulb = 0, h4_btulb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(q > 0)) return { error: "Capacity must be positive." };
  const re_btulb = h1_btulb - h4_btulb;
  if (!(re_btulb > 0)) return { error: "The refrigeration effect must be positive (h1 must exceed h4)." };
  const q_btumin = unit_tons === 1 ? q * 200 : q / 60;
  const m_dot_lbmin = q_btumin / re_btulb;
  const m_dot_lbh = m_dot_lbmin * 60;
  return {
    re_btulb, m_dot_lbmin, m_dot_lbh,
    note: "Refrigerant mass flow m_dot = Q / (h1 - h4), the cooling load over the refrigeration effect RE = h1 - h4 (the evaporator enthalpy rise off the P-h diagram), with 1 ton = 200 Btu/min = 12,000 Btu/h and h4 = hf at the condensing pressure (isenthalpic throttling). A lower refrigeration effect (a warmer, less-subcooled liquid line) demands more mass flow for the same tons, which is why subcooling matters to capacity. Take the enthalpies off the refrigerant's P-h diagram or tables at the operating condition; steady flow, 100% evaporator effectiveness - it does not compute the compressor displacement, the volumetric efficiency, or the enthalpies themselves. An engineering aid; the refrigerant property data at the operating condition govern.",
  };
}
export const refrigerantMassFlowExample = { inputs: { q: 5, unit_tons: 1, h1_btulb: 180, h4_btulb: 120 } };

function _v320renderRefrigerantMassFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: refrigerant mass flow m_dot = Q / (h1 - h4), the refrigeration effect RE = h1 - h4 from the P-h diagram, 1 ton = 200 Btu/min, and h4 = hf at the condenser (isenthalpic throttling), by name. Enter the enthalpies; steady flow. An engineering aid; the refrigerant property data govern.";
  const q = makeNumber("Capacity (tons, or Btu/h if unit set to 0)", "rmf-q", { step: "any", min: "0" });
  const unit = makeSelect("Capacity unit", "rmf-unit", [{ value: "1", label: "Tons" }, { value: "0", label: "Btu/h" }]);
  const h1 = makeNumber("Suction enthalpy h1 (Btu/lb)", "rmf-h1", { step: "any" });
  const h4 = makeNumber("Evaporator-inlet enthalpy h4 (Btu/lb)", "rmf-h4", { step: "any" });
  for (const f of [q, unit, h1, h4]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "5"; unit.select.value = "1"; h1.input.value = "180"; h4.input.value = "120"; update(); });
  const oRe = makeOutputLine(outputRegion, "Refrigeration effect", "rmf-out-re");
  const oM = makeOutputLine(outputRegion, "Refrigerant mass flow", "rmf-out-m");
  const oNote = makeOutputLine(outputRegion, "Note", "rmf-out-note");
  const update = debounce(() => {
    const r = computeRefrigerantMassFlow({ q: Number(q.input.value) || 0, unit_tons: Number(unit.select.value), h1_btulb: Number(h1.input.value) || 0, h4_btulb: Number(h4.input.value) || 0 });
    if (r.error) { oRe.textContent = r.error; oM.textContent = "-"; oNote.textContent = "-"; return; }
    oRe.textContent = fmt(r.re_btulb, 1) + " Btu/lb";
    oM.textContent = fmt(r.m_dot_lbmin, 1) + " lb/min (" + fmt(r.m_dot_lbh, 0) + " lb/h)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q.input, unit.select, h1.input, h4.input]) f.addEventListener(f === unit.select ? "change" : "input", update);
}
REFRIGERANT_RENDERERS["refrigerant-mass-flow"] = _v320renderRefrigerantMassFlow;

// dims: in { h1_btulb: L^2 T^-2, h2_btulb: L^2 T^-2, h4_btulb: L^2 T^-2, tevap_f: T, tcond_f: T } out: { cop: dimensionless, cop_carnot: dimensionless, eta_2nd: dimensionless, eer: dimensionless }
export function computeRefrigerationCop({ h1_btulb = 0, h2_btulb = 0, h4_btulb = 0, tevap_f = 0, tcond_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const re = h1_btulb - h4_btulb;
  const w = h2_btulb - h1_btulb;
  if (!(re > 0)) return { error: "The refrigeration effect must be positive (h1 must exceed h4)." };
  if (!(w > 0)) return { error: "The compressor work must be positive (h2 must exceed h1)." };
  const cop = re / w;
  const eer = 3.412 * cop;
  const t_evap_r = tevap_f + 459.67;
  const t_cond_r = tcond_f + 459.67;
  if (!(t_cond_r > t_evap_r)) return { error: "The condenser temperature must exceed the evaporator temperature." };
  const cop_carnot = t_evap_r / (t_cond_r - t_evap_r);
  const eta_2nd = cop / cop_carnot;
  return {
    cop, cop_carnot, eta_2nd, eer,
    note: "Cooling coefficient of performance COP = (h1 - h4)/(h2 - h1), the refrigeration effect over the compressor work off the P-h diagram; the Carnot ceiling COP_Carnot = T_evap/(T_cond - T_evap) in absolute (Rankine) temperature; the second-law efficiency COP/COP_Carnot; and EER = 3.412 x COP. A smaller lift (a higher evaporator, a cooler condenser) raises the Carnot ceiling - the lever a tech pulls for efficiency. Enter the enthalpies from the P-h diagram (ideal isentropic or actual work), saturation temperatures for the Carnot lift; the system COP is lower once motor/drive and parasitic loads are added. An engineering aid; the refrigerant property data and measured state points govern.",
  };
}
export const refrigerationCopExample = { inputs: { h1_btulb: 180, h2_btulb: 205, h4_btulb: 120, tevap_f: 40, tcond_f: 120 } };

function _v321renderRefrigerationCop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cooling COP = (h1 - h4)/(h2 - h1), the Carnot limit COP_Carnot = T_evap/(T_cond - T_evap) in Rankine, the second-law efficiency COP/COP_Carnot, and EER = 3.412 x COP, by name. Enter the P-h enthalpies and saturation temperatures; no parasitic loads. An engineering aid; the property data govern.";
  const h1 = makeNumber("Suction enthalpy h1 (Btu/lb)", "rc-h1", { step: "any" });
  const h2 = makeNumber("Discharge enthalpy h2 (Btu/lb)", "rc-h2", { step: "any" });
  const h4 = makeNumber("Evaporator-inlet enthalpy h4 (Btu/lb)", "rc-h4", { step: "any" });
  const te = makeNumber("Evaporator saturation temp (F)", "rc-te", { step: "any" });
  const tc = makeNumber("Condenser saturation temp (F)", "rc-tc", { step: "any" });
  for (const f of [h1, h2, h4, te, tc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h1.input.value = "180"; h2.input.value = "205"; h4.input.value = "120"; te.input.value = "40"; tc.input.value = "120"; update(); });
  const oCop = makeOutputLine(outputRegion, "Cycle COP (EER)", "rc-out-cop");
  const oCarnot = makeOutputLine(outputRegion, "Carnot COP / second-law efficiency", "rc-out-carnot");
  const oNote = makeOutputLine(outputRegion, "Note", "rc-out-note");
  const update = debounce(() => {
    const r = computeRefrigerationCop({ h1_btulb: Number(h1.input.value) || 0, h2_btulb: Number(h2.input.value) || 0, h4_btulb: Number(h4.input.value) || 0, tevap_f: Number(te.input.value) || 0, tcond_f: Number(tc.input.value) || 0 });
    if (r.error) { oCop.textContent = r.error; oCarnot.textContent = "-"; oNote.textContent = "-"; return; }
    oCop.textContent = fmt(r.cop, 2) + " (EER " + fmt(r.eer, 2) + ")";
    oCarnot.textContent = fmt(r.cop_carnot, 2) + " / " + fmt(r.eta_2nd * 100, 0) + "% of ideal";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [h1, h2, h4, te, tc]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["refrigeration-cop"] = _v321renderRefrigerationCop;

// dims: in { q_evap: M L^2 T^-3, unit_tons: dimensionless, cop: dimensionless } out: { w_comp_btuh: M L^2 T^-3, thr_btuh: M L^2 T^-3, thr_tons: M L^2 T^-3, factor: dimensionless }
export function computeCondenserHeatRejection({ q_evap = 0, unit_tons = 0, cop = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(q_evap > 0)) return { error: "Evaporator capacity must be positive." };
  if (!(cop > 0)) return { error: "COP must be positive." };
  const q_btuh = unit_tons === 1 ? q_evap * 12000 : q_evap;
  const w_comp_btuh = q_btuh / cop;
  const thr_btuh = q_btuh + w_comp_btuh;
  const factor = 1 + 1 / cop;
  const thr_tons = thr_btuh / 12000;
  return {
    w_comp_btuh, thr_btuh, thr_tons, factor,
    note: "Total heat of rejection THR = Q_evap + W_comp = Q_evap (1 + 1/COP), the compressor work W_comp = Q_evap/COP added to the evaporator load - the number that sizes the condenser, the cooling tower, or the air-cooled coil. The heat-rejection factor 1 + 1/COP is about 1.25 for comfort cooling and higher at lower COP / low-temperature refrigeration, so a struggling (low-COP) system overloads its own condenser and drives head pressure higher still. Uses the compressor work implied by the COP; the condenser is assumed to reject the full evaporator-plus-compressor heat (no desuperheater/heat-recovery split), and motor heat rejected outside the refrigerant (a hermetic compressor adds it) is not included. An engineering aid; the equipment's rated heat-of-rejection data govern.",
  };
}
export const condenserHeatRejectionExample = { inputs: { q_evap: 5, unit_tons: 1, cop: 2.4 } };

function _v322renderCondenserHeatRejection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: total heat of rejection THR = Q_evap (1 + 1/COP), compressor work W_comp = Q_evap/COP, and the ~1.25 comfort-cooling heat-rejection factor, by name. No heat-recovery split or hermetic motor heat. An engineering aid; the rated heat-of-rejection data govern.";
  const q = makeNumber("Evaporator capacity (tons, or Btu/h if unit set to 0)", "chr-q", { step: "any", min: "0" });
  const unit = makeSelect("Capacity unit", "chr-unit", [{ value: "1", label: "Tons" }, { value: "0", label: "Btu/h" }]);
  const cop = makeNumber("Coefficient of performance COP", "chr-cop", { step: "any", min: "0" });
  for (const f of [q, unit, cop]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "5"; unit.select.value = "1"; cop.input.value = "2.4"; update(); });
  const oW = makeOutputLine(outputRegion, "Compressor work", "chr-out-w");
  const oThr = makeOutputLine(outputRegion, "Total heat of rejection", "chr-out-thr");
  const oFactor = makeOutputLine(outputRegion, "Heat-rejection factor", "chr-out-factor");
  const oNote = makeOutputLine(outputRegion, "Note", "chr-out-note");
  const update = debounce(() => {
    const r = computeCondenserHeatRejection({ q_evap: Number(q.input.value) || 0, unit_tons: Number(unit.select.value), cop: Number(cop.input.value) || 0 });
    if (r.error) { oW.textContent = r.error; oThr.textContent = "-"; oFactor.textContent = "-"; oNote.textContent = "-"; return; }
    oW.textContent = fmt(r.w_comp_btuh, 0) + " Btu/h";
    oThr.textContent = fmt(r.thr_btuh, 0) + " Btu/h (" + fmt(r.thr_tons, 2) + " tons)";
    oFactor.textContent = fmt(r.factor, 3) + " (THR / Q_evap)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q.input, unit.select, cop.input]) f.addEventListener(f === unit.select ? "change" : "input", update);
}
REFRIGERANT_RENDERERS["condenser-heat-rejection"] = _v322renderCondenserHeatRejection;

// condenser-cop-for-heat-rejection: inverse of condenser-heat-rejection. The forward tile gives the total heat of
// rejection from the COP; the inverse backs out the implied COP from a measured or rated heat of rejection and the
// evaporator capacity, so a commissioning tech reads the operating efficiency off the condenser duty. From
// THR = Q_evap (1 + 1/COP), COP = Q_evap / (THR - Q_evap). THR must exceed Q_evap (compressor work adds heat).
// dims: in { q_evap: M L^2 T^-3, target_thr: M L^2 T^-3, unit_tons: dimensionless } out: { cop: dimensionless, w_comp_btuh: M L^2 T^-3, factor: dimensionless }
export function computeCondenserCopForHeatRejection({ q_evap = 0, target_thr = 0, unit_tons = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(q_evap) || 0;
  const thr = Number(target_thr) || 0;
  if (!(q > 0)) return { error: "Evaporator capacity must be positive." };
  if (!(thr > 0)) return { error: "Total heat of rejection must be positive." };
  if (!(thr > q)) return { error: "The heat of rejection must exceed the evaporator capacity (the compressor work adds heat)." };
  const q_btuh = unit_tons === 1 ? q * 12000 : q;
  const thr_btuh = unit_tons === 1 ? thr * 12000 : thr;
  const w_comp_btuh = thr_btuh - q_btuh;
  const cop = q_btuh / w_comp_btuh;
  const factor = thr_btuh / q_btuh;
  if (![cop, w_comp_btuh, factor].every(Number.isFinite)) return { error: "COP math is not a finite value." };
  return {
    cop, w_comp_btuh, factor,
    note: "Implied COP from the heat of rejection: from THR = Q_evap + W_comp = Q_evap (1 + 1/COP), the compressor work is W_comp = THR - Q_evap and COP = Q_evap / (THR - Q_evap). This reads the operating efficiency off the condenser duty and the cooling capacity - a low COP means a large heat-rejection factor (THR/Q_evap), so a struggling system overloads its own condenser and drives head pressure higher still. This uses the compressor work implied by the heat balance; motor heat rejected outside the refrigerant (a hermetic compressor adds it) inflates the measured THR and lowers the apparent COP, and any desuperheater / heat-recovery split must be added back. An engineering aid; the equipment's rated data govern.",
  };
}
export const condenserCopForHeatRejectionExample = { inputs: { q_evap: 60000, target_thr: 100000, unit_tons: 0 } };

function _renderCondenserCopForHeatRejection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: total heat of rejection THR = Q_evap (1 + 1/COP) solved for the COP: COP = Q_evap / (THR - Q_evap); compressor work W_comp = THR - Q_evap. Hermetic motor heat inflates the measured THR and lowers the apparent COP. An engineering aid; the rated heat-of-rejection data govern.";
  const q = makeNumber("Evaporator capacity (tons, or Btu/h if unit set to 0)", "ccp-q", { step: "any", min: "0" });
  const unit = makeSelect("Capacity unit", "ccp-unit", [{ value: "1", label: "Tons" }, { value: "0", label: "Btu/h" }]);
  const thr = makeNumber("Total heat of rejection (same unit as capacity)", "ccp-thr", { step: "any", min: "0" });
  for (const f of [q, unit, thr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "60000"; unit.select.value = "0"; thr.input.value = "100000"; update(); });
  const oCop = makeOutputLine(outputRegion, "Implied COP", "ccp-out-cop");
  const oW = makeOutputLine(outputRegion, "Compressor work", "ccp-out-w");
  const oFactor = makeOutputLine(outputRegion, "Heat-rejection factor", "ccp-out-factor");
  const oNote = makeOutputLine(outputRegion, "Note", "ccp-out-note");
  const update = debounce(() => {
    const r = computeCondenserCopForHeatRejection({ q_evap: Number(q.input.value) || 0, target_thr: Number(thr.input.value) || 0, unit_tons: Number(unit.select.value) });
    if (r.error) { oCop.textContent = r.error; oW.textContent = "-"; oFactor.textContent = "-"; oNote.textContent = "-"; return; }
    oCop.textContent = fmt(r.cop, 2);
    oW.textContent = fmt(r.w_comp_btuh, 0) + " Btu/h";
    oFactor.textContent = fmt(r.factor, 3) + " (THR / Q_evap)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q.input, thr.input]) f.addEventListener("input", update);
  unit.select.addEventListener("change", update);
}
REFRIGERANT_RENDERERS["condenser-cop-for-heat-rejection"] = _renderCondenserCopForHeatRejection;

// ===================== spec-v432..v434: walk-in refrigeration trio (Group C) =====================

// dims: in { u_factor: dimensionless, area_ft2: L^2, delta_t_f: T, infiltration_btuh: M L^2 T^-3, product_btuh: M L^2 T^-3, internal_btuh: M L^2 T^-3, safety: dimensionless } out: { transmission_btuh: M L^2 T^-3, total_btuh: M L^2 T^-3, tons: dimensionless }
export function computeWalkInCoolerLoad({ u_factor = 0, area_ft2 = 0, delta_t_f = 0, infiltration_btuh = 0, product_btuh = 0, internal_btuh = 0, safety = 1.10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const u = Number(u_factor) || 0;
  const area = Number(area_ft2) || 0;
  const dt = Number(delta_t_f) || 0;
  const infil = Number(infiltration_btuh) || 0;
  const prod = Number(product_btuh) || 0;
  const internal = Number(internal_btuh) || 0;
  const sf = Number(safety) > 0 ? Number(safety) : 1.10;
  if (!(u > 0)) return { error: "Panel U-factor must be positive (Btu/hr-ft^2-F)." };
  if (!(area > 0)) return { error: "Envelope area must be positive (ft^2)." };
  if (!(dt > 0)) return { error: "Temperature difference must be positive (F)." };
  if (infil < 0 || prod < 0 || internal < 0) return { error: "Load components must be non-negative (Btu/hr)." };
  const transmission_btuh = u * area * dt;
  const subtotal_btuh = transmission_btuh + infil + prod + internal;
  const total_btuh = subtotal_btuh * sf;
  return {
    transmission_btuh, subtotal_btuh, total_btuh, tons: total_btuh / 12000,
    note: "Walk-in cooler/freezer heat load: the transmission (conduction) through the panels = U x envelope area x the ambient-to-box temperature difference, plus the infiltration/door load, the product load (see product-pull-down-load), and the internal load (lights, evaporator-fan motors, people), all times a safety factor (commonly 1.10). Thicker insulation (a lower U) shrinks the transmission and the compressor directly. The evaporator is usually sized for an 18-hour run so the equipment total = load x 24/18. A sizing aid; the manufacturer's box-load method and the equipment ratings govern.",
  };
}
export const walkInCoolerLoadExample = { inputs: { u_factor: 0.05, area_ft2: 800, delta_t_f: 60, infiltration_btuh: 3000, product_btuh: 5000, internal_btuh: 1500, safety: 1.10 } };
function _v432renderWalkInCoolerLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Walk-in cooler heat load (ASHRAE Refrigeration / box-load practice): transmission = U x area x deltaT, plus infiltration + product + internal loads, times a safety factor (~1.10). Size the evaporator for an ~18-hour run. A sizing aid; the box-load method and equipment ratings govern.";
  const u = makeNumber("Panel U-factor (4 in ~0.05, 6 in ~0.03)", "wic-u", { step: "any", min: "0" }); u.input.value = "0.05";
  const area = makeNumber("Envelope area (ft^2)", "wic-a", { step: "any", min: "0" }); area.input.value = "800";
  const dt = makeNumber("Ambient-to-box deltaT (F)", "wic-dt", { step: "any", min: "0" }); dt.input.value = "60";
  const infil = makeNumber("Infiltration/door load (Btu/hr)", "wic-inf", { step: "any", min: "0" }); infil.input.value = "3000";
  const prod = makeNumber("Product load (Btu/hr)", "wic-prod", { step: "any", min: "0" }); prod.input.value = "5000";
  const internal = makeNumber("Internal load: lights/motors/people (Btu/hr)", "wic-int", { step: "any", min: "0" }); internal.input.value = "1500";
  const sf = makeNumber("Safety factor (default 1.10)", "wic-sf", { step: "any", min: "0" }); sf.input.value = "1.10";
  for (const f of [u, area, dt, infil, prod, internal, sf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { u.input.value = "0.05"; area.input.value = "800"; dt.input.value = "60"; infil.input.value = "3000"; prod.input.value = "5000"; internal.input.value = "1500"; sf.input.value = "1.10"; update(); });
  const oT = makeOutputLine(outputRegion, "Transmission load", "wic-out-t");
  const oTot = makeOutputLine(outputRegion, "Total load", "wic-out-tot");
  const oNote = makeOutputLine(outputRegion, "Note", "wic-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWalkInCoolerLoad({ u_factor: readNum(u.input), area_ft2: readNum(area.input), delta_t_f: readNum(dt.input), infiltration_btuh: readNum(infil.input), product_btuh: readNum(prod.input), internal_btuh: readNum(internal.input), safety: readNum(sf.input) });
    if (r.error) { oT.textContent = r.error; oTot.textContent = "-"; oNote.textContent = ""; return; }
    oT.textContent = fmt(r.transmission_btuh, 0) + " Btu/hr";
    oTot.textContent = fmt(r.total_btuh, 0) + " Btu/hr (" + fmt(r.tons, 2) + " tons)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [u, area, dt, infil, prod, internal, sf]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["walk-in-cooler-load"] = _v432renderWalkInCoolerLoad;

// dims: in { mass_lb: M, cp_above: dimensionless, t_enter_f: T, t_storage_f: T, t_freeze_f: T, hif_btu_lb: dimensionless, cp_below: dimensionless, hours: dimensionless } out: { q_btu: M L^2 T^-2, rate_btuh: M L^2 T^-3 }
export function computeProductPullDownLoad({ mass_lb = 0, cp_above = 0, t_enter_f = 0, t_storage_f = 0, t_freeze_f = 0, hif_btu_lb = 0, cp_below = 0, hours = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mass = Number(mass_lb) || 0;
  const cpa = Number(cp_above) || 0;
  const tEnter = Number(t_enter_f);
  const tStore = Number(t_storage_f);
  const tFreeze = Number(t_freeze_f) || 0;
  const hif = Number(hif_btu_lb) || 0;
  const cpb = Number(cp_below) || 0;
  const hrs = Number(hours) || 0;
  if (!(mass > 0)) return { error: "Product mass must be positive (lb)." };
  if (!(cpa > 0)) return { error: "Specific heat above freezing must be positive (Btu/lb-F)." };
  if (!Number.isFinite(tEnter) || !Number.isFinite(tStore)) return { error: "Enter valid temperatures (F)." };
  if (!(hrs > 0)) return { error: "Pull-down time must be positive (hr)." };
  const freezing = tFreeze !== 0 && tStore < tFreeze && hif > 0;
  let q_btu;
  if (freezing) {
    q_btu = mass * cpa * (tEnter - tFreeze) + mass * hif + mass * cpb * (tFreeze - tStore);
  } else {
    q_btu = mass * cpa * (tEnter - tStore);
  }
  const rate_btuh = q_btu / hrs;
  return {
    q_btu, rate_btuh, freezing,
    note: "Product pull-down (respiration and cooling) load: the heat to bring the product from its entering temperature to storage over the pull-down period. Above freezing it is a single sensible term mass x cp x deltaT; for a freezer it is the sensible cooling to the freezing point, plus the latent heat of fusion (the bulk of the load), plus the sensible cooling of the frozen product to storage. The rate = total heat / the pull-down hours (commonly 24) is the product contribution to the box load. Respiration heat of live produce is a separate, smaller add. A sizing aid; the product property tables (ASHRAE Refrigeration) govern.",
  };
}
export const productPullDownLoadExample = { inputs: { mass_lb: 2000, cp_above: 0.9, t_enter_f: 80, t_storage_f: 35, t_freeze_f: 0, hif_btu_lb: 0, cp_below: 0, hours: 24 } };
function _v433renderProductPullDownLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Product pull-down load (ASHRAE Refrigeration): above freezing Q = m cp deltaT; for a freezer Q = sensible-to-freezing + m x latent heat of fusion + sensible-of-frozen; rate = Q / pull-down hours. A sizing aid; the product property tables govern.";
  const mass = makeNumber("Product mass (lb)", "ppd-m", { step: "any", min: "0" }); mass.input.value = "2000";
  const cpa = makeNumber("Specific heat above freezing (Btu/lb-F)", "ppd-cpa", { step: "any", min: "0" }); cpa.input.value = "0.9";
  const tEnter = makeNumber("Entering temperature (F)", "ppd-te", { step: "any" }); tEnter.input.value = "80";
  const tStore = makeNumber("Storage (target) temperature (F)", "ppd-ts", { step: "any" }); tStore.input.value = "35";
  const tFreeze = makeNumber("Freezing point (F, optional for freezers)", "ppd-tf", { step: "any" }); tFreeze.input.value = "";
  const hif = makeNumber("Latent heat of fusion (Btu/lb, optional)", "ppd-hif", { step: "any", min: "0" }); hif.input.value = "";
  const cpb = makeNumber("Specific heat below freezing (Btu/lb-F, optional)", "ppd-cpb", { step: "any", min: "0" }); cpb.input.value = "";
  const hrs = makeNumber("Pull-down time (hr)", "ppd-h", { step: "any", min: "0" }); hrs.input.value = "24";
  for (const f of [mass, cpa, tEnter, tStore, tFreeze, hif, cpb, hrs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mass.input.value = "2000"; cpa.input.value = "0.9"; tEnter.input.value = "80"; tStore.input.value = "35"; tFreeze.input.value = ""; hif.input.value = ""; cpb.input.value = ""; hrs.input.value = "24"; update(); });
  const oQ = makeOutputLine(outputRegion, "Total heat to remove", "ppd-out-q");
  const oR = makeOutputLine(outputRegion, "Load rate", "ppd-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "ppd-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeProductPullDownLoad({ mass_lb: readNum(mass.input), cp_above: readNum(cpa.input), t_enter_f: readNum(tEnter.input), t_storage_f: readNum(tStore.input), t_freeze_f: readNum(tFreeze.input), hif_btu_lb: readNum(hif.input), cp_below: readNum(cpb.input), hours: readNum(hrs.input) });
    if (r.error) { oQ.textContent = r.error; oR.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.q_btu, 0) + " Btu" + (r.freezing ? " (incl. latent freezing)" : "");
    oR.textContent = fmt(r.rate_btuh, 0) + " Btu/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mass, cpa, tEnter, tStore, tFreeze, hif, cpb, hrs]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["product-pull-down-load"] = _v433renderProductPullDownLoad;

// product-pull-down-time: inverse of product-pull-down-load. The forward tile
// gives rate = Q / hours; given the refrigeration capacity dedicated to the
// product load, the pull-down time is hours = Q / capacity. Q (with the freezer
// latent branch) is reused from computeProductPullDownLoad at hours = 1.
// dims: in { mass_lb: M, cp_above: dimensionless, t_enter_f: T, t_storage_f: T, t_freeze_f: T, hif_btu_lb: dimensionless, cp_below: dimensionless, capacity_btuh: M L^2 T^-3 } out: { hours: dimensionless, q_btu: M L^2 T^-2 }
export function computeProductPullDownTime({ mass_lb = 0, cp_above = 0, t_enter_f = 0, t_storage_f = 0, t_freeze_f = 0, hif_btu_lb = 0, cp_below = 0, capacity_btuh = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(capacity_btuh) || 0;
  if (!(cap > 0)) return { error: "Available refrigeration capacity must be positive (Btu/hr)." };
  const base = computeProductPullDownLoad({ mass_lb, cp_above, t_enter_f, t_storage_f, t_freeze_f, hif_btu_lb, cp_below, hours: 1 });
  if (base.error) return { error: base.error };
  if (!(base.q_btu > 0)) return { error: "Pull-down heat is not positive; the product must enter warmer than storage." };
  const hours = base.q_btu / cap;
  return {
    hours, q_btu: base.q_btu, rate_btuh: cap, freezing: base.freezing,
    note: "Pull-down time = total product heat / the refrigeration capacity dedicated to product load. Q above freezing is a single sensible term m x cp x deltaT; for a freezer it adds the latent heat of fusion (the bulk) plus the sensible cooling of the frozen product. If the time exceeds the design window (commonly 24 h), add capacity or stage the loading. A sizing aid; the product property tables (ASHRAE Refrigeration) govern.",
  };
}
export const productPullDownTimeExample = { inputs: { mass_lb: 2000, cp_above: 0.9, t_enter_f: 80, t_storage_f: 35, capacity_btuh: 3375 } };
function _v698renderProductPullDownTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Product pull-down time (ASHRAE Refrigeration): hours = Q / capacity, with Q = m cp deltaT above freezing, or sensible-to-freezing + m x latent heat of fusion + sensible-of-frozen for a freezer. A sizing aid; the product property tables govern.";
  const mass = makeNumber("Product mass (lb)", "ppt-m", { step: "any", min: "0" }); mass.input.value = "2000";
  const cpa = makeNumber("Specific heat above freezing (Btu/lb-F)", "ppt-cpa", { step: "any", min: "0" }); cpa.input.value = "0.9";
  const tEnter = makeNumber("Entering temperature (F)", "ppt-te", { step: "any" }); tEnter.input.value = "80";
  const tStore = makeNumber("Storage (target) temperature (F)", "ppt-ts", { step: "any" }); tStore.input.value = "35";
  const tFreeze = makeNumber("Freezing point (F, optional for freezers)", "ppt-tf", { step: "any" }); tFreeze.input.value = "";
  const hif = makeNumber("Latent heat of fusion (Btu/lb, optional)", "ppt-hif", { step: "any", min: "0" }); hif.input.value = "";
  const cpb = makeNumber("Specific heat below freezing (Btu/lb-F, optional)", "ppt-cpb", { step: "any", min: "0" }); cpb.input.value = "";
  const cap = makeNumber("Refrigeration capacity for product (Btu/hr)", "ppt-cap", { step: "any", min: "0" }); cap.input.value = "3375";
  for (const f of [mass, cpa, tEnter, tStore, tFreeze, hif, cpb, cap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mass.input.value = "2000"; cpa.input.value = "0.9"; tEnter.input.value = "80"; tStore.input.value = "35"; tFreeze.input.value = ""; hif.input.value = ""; cpb.input.value = ""; cap.input.value = "3375"; update(); });
  const oH = makeOutputLine(outputRegion, "Pull-down time", "ppt-out-h");
  const oQ = makeOutputLine(outputRegion, "Total heat to remove", "ppt-out-q");
  const oNote = makeOutputLine(outputRegion, "Note", "ppt-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeProductPullDownTime({ mass_lb: readNum(mass.input), cp_above: readNum(cpa.input), t_enter_f: readNum(tEnter.input), t_storage_f: readNum(tStore.input), t_freeze_f: readNum(tFreeze.input), hif_btu_lb: readNum(hif.input), cp_below: readNum(cpb.input), capacity_btuh: readNum(cap.input) });
    if (r.error) { oH.textContent = r.error; oQ.textContent = "-"; oNote.textContent = ""; return; }
    oH.textContent = fmt(r.hours, 1) + " hr";
    oQ.textContent = fmt(r.q_btu, 0) + " Btu" + (r.freezing ? " (incl. latent freezing)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mass, cpa, tEnter, tStore, tFreeze, hif, cpb, cap]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["product-pull-down-time"] = _v698renderProductPullDownTime;

// dims: in { box_temp_f: T, sst_f: T } out: { dtd: T }
export function computeEvaporatorTdDtd({ box_temp_f = 0, sst_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const box = Number(box_temp_f);
  const sst = Number(sst_f);
  if (!Number.isFinite(box) || !Number.isFinite(sst)) return { error: "Enter valid temperatures (F)." };
  const dtd = box - sst;
  if (!(dtd > 0)) return { error: "Saturated suction must be below the box temperature (a positive TD is required)." };
  let band;
  if (dtd <= 10) band = "~90% RH (produce, flowers, cut greens)";
  else if (dtd <= 12) band = "~80-85% RH (general walk-in cooler)";
  else if (dtd <= 16) band = "~75-80% RH (meat, packaged goods)";
  else band = "<70% RH (low-humidity / frozen storage)";
  return {
    dtd, band,
    note: "Evaporator design TD (DTD) = box temperature - the saturated suction temperature at the coil, the single number that sets the resulting box humidity. A small TD (a coil running close to the box temperature) holds a high relative humidity for produce and flowers; a large TD dries the air, which suits packaged or frozen goods but wilts produce. Common bands: <=10 F ~90% RH, 10-12 F ~80-85%, 12-16 F ~75-80%, >16 F <70%. Coil selection trades TD (humidity) against coil size (a smaller TD needs more coil). A selection aid; the coil manufacturer's rating at the design TD governs.",
  };
}
export const evaporatorTdDtdExample = { inputs: { box_temp_f: 35, sst_f: 25 } };
function _v434renderEvaporatorTdDtd(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Evaporator design TD (DTD) = box temperature - saturated suction temperature, which sets the box humidity: a small TD holds high RH (produce), a large TD dries the air (packaged/frozen). A selection aid; the coil manufacturer's rating at the design TD governs.";
  const box = makeNumber("Box (room) temperature (F)", "etd-box", { step: "any" }); box.input.value = "35";
  const sst = makeNumber("Saturated suction temperature (F)", "etd-sst", { step: "any" }); sst.input.value = "25";
  for (const f of [box, sst]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { box.input.value = "35"; sst.input.value = "25"; update(); });
  const oD = makeOutputLine(outputRegion, "Design TD (DTD)", "etd-out-d");
  const oB = makeOutputLine(outputRegion, "Expected humidity band", "etd-out-b");
  const oNote = makeOutputLine(outputRegion, "Note", "etd-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEvaporatorTdDtd({ box_temp_f: readNum(box.input), sst_f: readNum(sst.input) });
    if (r.error) { oD.textContent = r.error; oB.textContent = "-"; oNote.textContent = ""; return; }
    oD.textContent = fmt(r.dtd, 1) + " F";
    oB.textContent = r.band;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [box, sst]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["evaporator-td-dtd"] = _v434renderEvaporatorTdDtd;

// ===================== spec-v586 C: liquid-line subcooling to prevent flash gas =====================
// dP_lift = static_gradient*lift. dP_total = dP_lift + friction. required_subcool = dP_total/pt_slope.
// dims: in { vertical_lift_ft: L, friction_dp_psi: M L^-1 T^-2, static_gradient: dimensionless, pt_slope: dimensionless } out: { dp_lift_psi: M L^-1 T^-2, dp_total_psi: M L^-1 T^-2, required_subcool_f: T }
export function computeFlashGasSubcool({ vertical_lift_ft = 0, friction_dp_psi = 0, static_gradient = 0.43, pt_slope = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lift = Number(vertical_lift_ft) || 0;
  const friction = Number(friction_dp_psi) || 0;
  const grad = Number(static_gradient) || 0;
  const slope = Number(pt_slope) || 0;
  if (lift < 0) return { error: "Vertical lift cannot be negative (ft)." };
  if (friction < 0) return { error: "Friction pressure drop cannot be negative (psi)." };
  if (grad < 0) return { error: "Static gradient cannot be negative (psi/ft)." };
  if (!(slope > 0)) return { error: "Pressure-temperature slope must be positive (psi/degF)." };
  const dp_lift_psi = grad * lift;
  const dp_total_psi = dp_lift_psi + friction;
  const required_subcool_f = dp_total_psi / slope;
  const meets_target = required_subcool_f >= 8 && required_subcool_f <= 12;
  return {
    dp_lift_psi, dp_total_psi, required_subcool_f, meets_target,
    note: "Techs often credit only the friction and forget the 0.43 psi/ft vertical-lift column, which dominates on a tall riser. Liquid-line heat gain also flashes liquid. Subcooling should be measured at the metering device, not the condenser outlet. The 5 psi/degF P-T slope flattens at higher pressure (an approximation). Add margin to reach the 8 to 12 F field target. The manufacturer data and the actual refrigerant govern - a design aid, not a commissioning measurement.",
  };
}
export const flashGasSubcoolExample = { inputs: { vertical_lift_ft: 40, friction_dp_psi: 15, static_gradient: 0.43, pt_slope: 5 } };
function _v586renderFlashGasSubcool(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A design aid, not a commissioning measurement; the manufacturer data and the actual refrigerant govern. Citation: ASHRAE Refrigeration Handbook / refrigerant piping guides liquid-line subcooling to prevent flash gas, by name. dP_lift = static_gradient x lift (0.43 psi/ft R-410A liquid); dP_total = dP_lift + friction; required_subcool = dP_total / pt_slope (~5 psi/degF R-410A near condensing). Techs often forget the vertical-lift column that dominates on a tall riser; measure subcooling at the metering device, add margin to the 8-12 F field target.";
  const lift = makeNumber("Vertical liquid lift (ft, evap above condenser)", "fgs-lift", { step: "any", min: "0", value: "40" }); lift.input.value = "40";
  const friction = makeNumber("Liquid-line friction drop (psi)", "fgs-fric", { step: "any", min: "0", value: "15" }); friction.input.value = "15";
  const grad = makeNumber("Static gradient (psi/ft, 0.43 R-410A liquid)", "fgs-grad", { step: "any", min: "0", value: "0.43" }); grad.input.value = "0.43";
  const slope = makeNumber("P-T slope near condensing (psi/degF, ~5 R-410A)", "fgs-slope", { step: "any", min: "0", value: "5" }); slope.input.value = "5";
  for (const f of [lift, friction, grad, slope]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lift.input.value = "40"; friction.input.value = "15"; grad.input.value = "0.43"; slope.input.value = "5"; update(); });
  const oLift = makeOutputLine(outputRegion, "Static-lift pressure drop", "fgs-out-lift");
  const oTotal = makeOutputLine(outputRegion, "Total pressure drop", "fgs-out-total");
  const oSub = makeOutputLine(outputRegion, "Required subcooling", "fgs-out-sub");
  const oNote = makeOutputLine(outputRegion, "Note", "fgs-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeFlashGasSubcool({ vertical_lift_ft: readNum(lift.input), friction_dp_psi: readNum(friction.input), static_gradient: grad.input.value === "" ? 0.43 : readNum(grad.input), pt_slope: slope.input.value === "" ? 5 : readNum(slope.input) });
    if (r.error) { oLift.textContent = r.error; oTotal.textContent = "-"; oSub.textContent = "-"; oNote.textContent = ""; return; }
    oLift.textContent = fmt(r.dp_lift_psi, 1) + " psi";
    oTotal.textContent = fmt(r.dp_total_psi, 1) + " psi";
    oSub.textContent = fmt(r.required_subcool_f, 1) + " F minimum (add margin to 8-12 F target)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [lift, friction, grad, slope]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["flash-gas-subcool"] = _v586renderFlashGasSubcool;

// ===================== spec-v792 C: compressor theoretical displacement =====================
// Swept-volume geometry: each cylinder sweeps (pi/4) D^2 L per revolution; times cylinders times
// RPM is the volumetric flow rate at 100% volumetric efficiency. Divide in^3/min by 1728 for CFM.
// dims: in { bore_in: L, stroke_in: L, cylinders: dimensionless, rpm: T^-1 } out: { displacement_cid_per_rev: L^3, displacement_cfm: L^3 T^-1 }
export function computeCompressorDisplacement({ bore_in = 0, stroke_in = 0, cylinders = 0, rpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bore = Number(bore_in) || 0;
  const stroke = Number(stroke_in) || 0;
  const n = Number(cylinders) || 0;
  const speed = Number(rpm) || 0;
  if (!(bore > 0)) return { error: "Bore must be positive (in)." };
  if (!(stroke > 0)) return { error: "Stroke must be positive (in)." };
  if (!(n >= 1)) return { error: "Cylinder count must be at least 1." };
  if (!(speed > 0)) return { error: "Speed must be positive (RPM)." };
  const displacement_cid_per_rev = (Math.PI / 4) * bore * bore * stroke * n;
  const displacement_cid_per_min = displacement_cid_per_rev * speed;
  const displacement_cfm = displacement_cid_per_min / 1728;
  if (![displacement_cid_per_rev, displacement_cfm].every(Number.isFinite)) return { error: "Compressor-displacement math is not a finite value." };
  return {
    displacement_cid_per_rev, displacement_cid_per_min, displacement_cfm,
    note: "Theoretical (swept) displacement of a reciprocating compressor: each cylinder sweeps (pi/4) x bore^2 x stroke per revolution, so the pumped volume is (pi/4) x bore^2 x stroke x cylinders x RPM, converted to CFM by dividing in^3/min by 1728. This is the DISPLACEMENT at 100% volumetric efficiency -- the actual delivered (suction) volume is this times the volumetric efficiency, which falls as the compression ratio rises (clearance-volume re-expansion), as valves and rings leak, and as the suction gas heats up, so a real compressor moves noticeably less. It is the geometric ceiling the pumping capacity is measured against and the number to compare two compressors on. Reciprocating positive-displacement only; scroll, screw, and rotary machines have their own displacement definitions. A comparison figure; the compressor's rated capacity at the operating condition governs.",
  };
}
export const compressorDisplacementExample = { inputs: { bore_in: 2.0, stroke_in: 1.5, cylinders: 4, rpm: 1750 } };
function _v792renderCompressorDisplacement(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: reciprocating compressor theoretical displacement (ASHRAE Refrigeration; positive-displacement swept-volume geometry): displacement = (pi/4) x bore^2 x stroke x cylinders x RPM, / 1728 for CFM. This is the 100%-volumetric-efficiency ceiling; actual delivered volume = displacement x volumetric efficiency, which drops with compression ratio, leakage, and suction superheat. Reciprocating only. A comparison figure; the rated capacity at the operating condition governs.";
  const bore = makeNumber("Bore (in)", "cdisp-bore", { step: "any", min: "0" }); bore.input.value = "2.0";
  const stroke = makeNumber("Stroke (in)", "cdisp-stroke", { step: "any", min: "0" }); stroke.input.value = "1.5";
  const cyl = makeNumber("Number of cylinders", "cdisp-cyl", { step: "1", min: "1" }); cyl.input.value = "4";
  const rpm = makeNumber("Speed (RPM)", "cdisp-rpm", { step: "any", min: "0" }); rpm.input.value = "1750";
  for (const f of [bore, stroke, cyl, rpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bore.input.value = "2.0"; stroke.input.value = "1.5"; cyl.input.value = "4"; rpm.input.value = "1750"; update(); });
  const oR = makeOutputLine(outputRegion, "Displacement per revolution", "cdisp-out-r");
  const oC = makeOutputLine(outputRegion, "Theoretical displacement", "cdisp-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "cdisp-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCompressorDisplacement({ bore_in: readNum(bore.input), stroke_in: readNum(stroke.input), cylinders: readNum(cyl.input), rpm: readNum(rpm.input) });
    if (r.error) { oR.textContent = r.error; oC.textContent = "-"; oNote.textContent = ""; return; }
    oR.textContent = fmt(r.displacement_cid_per_rev, 2) + " in^3/rev";
    oC.textContent = fmt(r.displacement_cfm, 2) + " CFM (" + fmt(r.displacement_cid_per_min, 0) + " in^3/min) at 100% VE";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bore, stroke, cyl, rpm]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["compressor-displacement"] = _v792renderCompressorDisplacement;

// ===================== spec-v861: line-set length refrigerant charge adder =====================
// dims: in { lineset_length_ft: L, factory_charge_length_ft: L, rate_oz_per_ft: M L^-1 } out: { extra_oz: M, extra_lb: M }
export function computeRefrigerantLinesetChargeAdjust({ lineset_length_ft = 60, factory_charge_length_ft = 15, rate_oz_per_ft = 0.6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lineset_length_ft > 0)) return { error: "Line-set length must be positive (ft)." };
  if (!(rate_oz_per_ft > 0)) return { error: "Charge rate must be positive (oz/ft)." };
  if (factory_charge_length_ft < 0) return { error: "Factory length cannot be negative (ft)." };
  const extra_oz = Math.max(0, lineset_length_ft - factory_charge_length_ft) * rate_oz_per_ft;
  const extra_lb = extra_oz / 16;
  if (![extra_oz, extra_lb].every(Number.isFinite)) return { error: "Charge-adder math is not a finite value." };
  return {
    extra_oz,
    extra_lb,
    note: "The per-foot rate and the factory pre-charge length come from the equipment nameplate - they vary by refrigerant and liquid-line size (R-410A on a 3/8 in liquid line runs about 0.6 oz/ft). Only the liquid line adds meaningful charge. Over- or under-charging cuts capacity and drives callbacks; the total is weighed in, not guessed.",
  };
}

export const refrigerantLinesetChargeAdjustExample = { inputs: { lineset_length_ft: 60, factory_charge_length_ft: 15, rate_oz_per_ft: 0.6 } };

function _v861renderRefrigerantLinesetChargeAdjust(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: charge-adder identity by name. extra = max(0, actual line-set length - factory pre-charge length) x rate (oz/ft). The rate and factory length come from the nameplate; only the liquid line adds meaningful charge, and the total is weighed in.";
  const ll = makeNumber("Actual line-set length (ft)", "rlc-ll", { step: "any", min: "0", value: "60" });
  ll.input.value = "60";
  const fl = makeNumber("Factory pre-charge length (ft)", "rlc-fl", { step: "any", min: "0", value: "15" });
  fl.input.value = "15";
  const rt = makeNumber("Charge rate (oz/ft)", "rlc-rt", { step: "any", min: "0", value: "0.6" });
  rt.input.value = "0.6";
  for (const f of [ll, fl, rt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ll.input.value = "60"; fl.input.value = "15"; rt.input.value = "0.6"; update(); });
  const oOz = makeOutputLine(outputRegion, "Refrigerant to add", "rlc-out-oz");
  const update = debounce(() => {
    const r = computeRefrigerantLinesetChargeAdjust({
      lineset_length_ft: ll.input.value === "" ? 60 : Number(ll.input.value), factory_charge_length_ft: fl.input.value === "" ? 0 : Number(fl.input.value),
      rate_oz_per_ft: rt.input.value === "" ? 0.6 : Number(rt.input.value),
    });
    if (r.error) { oOz.textContent = r.error; return; }
    oOz.textContent = fmt(r.extra_oz, 1) + " oz (" + fmt(r.extra_lb, 2) + " lb)";
  }, DEBOUNCE_MS);
  for (const f of [ll, fl, rt]) f.input.addEventListener("input", update);
}
REFRIGERANT_RENDERERS["refrigerant-lineset-charge-adjust"] = _v861renderRefrigerantLinesetChargeAdjust;
