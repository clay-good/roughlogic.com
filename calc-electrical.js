// Group A: Electrical calculators (utilities 1 through 11).
//
// Each calculator exports two things:
//   - compute(inputs): pure function returning the calculator output object.
//   - example: a known test case used by the "Test with example" button and
//     by the unit tests, with the expected output.
//
// The calculator views (renderXxx) wire DOM events and use compute().
// All DOM manipulation uses textContent / createElement only.

import {
  conductorResistancePerKft,
  conductorResistance,
  ampacityFromPhysics,
  voltageDrop,
  threePhasePower,
  singlePhasePower,
  awgAreaCmils,
  awgDiameterInches,
} from "./pure-math.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

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

// --- Utility 1: Ohm's Law ---

// dims: in { V: M L^2 T^-3 I^-1, I: I, R: M L^2 T^-3 I^-2, P: M L^2 T^-3 } out: { V: M L^2 T^-3 I^-1, I: I, R: M L^2 T^-3 I^-2, P: M L^2 T^-3 }
export function computeOhmsLaw({ V, I, R, P }) {
  const known = [V, I, R, P].filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  if (known.length < 2) return { error: "Provide any two of V, I, R, P." };
  const have = { V, I, R, P };
  const out = { ...have };
  // Iteratively derive missing values.
  for (let i = 0; i < 4; i++) {
    if (out.V === null && out.I !== null && out.R !== null) out.V = out.I * out.R;
    if (out.V === null && out.P !== null && out.I !== null && out.I !== 0) out.V = out.P / out.I;
    if (out.V === null && out.P !== null && out.R !== null) out.V = Math.sqrt(out.P * out.R);

    if (out.I === null && out.V !== null && out.R !== null && out.R !== 0) out.I = out.V / out.R;
    if (out.I === null && out.P !== null && out.V !== null && out.V !== 0) out.I = out.P / out.V;
    if (out.I === null && out.P !== null && out.R !== null) out.I = Math.sqrt(out.P / out.R);

    if (out.R === null && out.V !== null && out.I !== null && out.I !== 0) out.R = out.V / out.I;
    if (out.R === null && out.V !== null && out.P !== null && out.P !== 0) out.R = (out.V * out.V) / out.P;
    if (out.R === null && out.P !== null && out.I !== null && out.I !== 0) out.R = out.P / (out.I * out.I);

    if (out.P === null && out.V !== null && out.I !== null) out.P = out.V * out.I;
    if (out.P === null && out.V !== null && out.R !== null && out.R !== 0) out.P = (out.V * out.V) / out.R;
    if (out.P === null && out.I !== null && out.R !== null) out.P = out.I * out.I * out.R;
  }
  return { V: out.V, I: out.I, R: out.R, P: out.P };
}

export const ohmsLawExample = {
  inputs: { V: 12, I: 2, R: null, P: null },
  expected: { V: 12, I: 2, R: 6, P: 24 },
};

// --- Utility 2: Wire Ampacity ---

// v8 §C.1: ambient-temperature presets for the renderer. Cuts the common
// case (set ambient + run) from four taps to one. Insulation rating defaults
// to 75°C per NEC 110.14(C); ambient defaults to 30°C per NEC 310.15(B)(1).
// v8 §C.1 / accessibility.md preset-chip pattern: common North-American
// distribution voltages. Used by voltage-drop (source) and breaker-sizing
// (watts-input mode) renderers.
export const COMMON_VOLTAGE_PRESETS = [
  { id: "120", label: "120 V",  volts: 120, description: "Single-phase residential outlet (NEMA 5-15)" },
  { id: "208", label: "208 V",  volts: 208, description: "Three-phase wye line-to-line (commercial)" },
  { id: "240", label: "240 V",  volts: 240, description: "Single-phase residential dryer / EV charger" },
  { id: "277", label: "277 V",  volts: 277, description: "Three-phase wye line-to-neutral (lighting)" },
  { id: "480", label: "480 V",  volts: 480, description: "Three-phase commercial / industrial" },
];

export const WIRE_AMPACITY_AMBIENT_PRESETS = [
  { id: "indoor",  label: "Indoor 30 °C",   ambient_C: 30, description: "NEC base ambient (30 °C / 86 °F)" },
  { id: "field",   label: "Field 45 °C",    ambient_C: 45, description: "Hot attic / field summer (45 °C / 113 °F)" },
  { id: "extreme", label: "Extreme 60 °C",  ambient_C: 60, description: "Direct-sun rooftop / engine room (60 °C / 140 °F)" },
];

// dims: in { awg: dimensionless, material: dimensionless, insulation_rating_C: T, ambient_C: T, bundle_count: dimensionless } out: { ampacity_A: I }
export function computeWireAmpacity({ awg, material, insulation_rating_C, ambient_C, bundle_count = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const I = ampacityFromPhysics({ awg, material, insulation_rating_C, ambient_C, bundle_count });
  return { ampacity_A: I };
}

export const wireAmpacityExample = {
  inputs: { awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 },
  expectedRange: { min: 18, max: 35 },
};

// --- Utility 3: Voltage Drop ---

// dims: in { phase: dimensionless, material: dimensionless, awg: dimensionless, length_ft: L, current_A: I, source_voltage_V: M L^2 T^-3 I^-1 } out: { drop_V: M L^2 T^-3 I^-1, drop_percent: dimensionless, voltage_at_load_V: M L^2 T^-3 I^-1 }
export function computeVoltageDrop({ phase, material, awg, length_ft, current_A, source_voltage_V }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const drop_V = voltageDrop({ phase, material, awg, length_ft, current_A });
  const percent = source_voltage_V > 0 ? (drop_V / source_voltage_V) * 100 : null;
  // v8 §C.1: companion output (voltage at load) and advisory / limit flags.
  // NEC FPN 4 advises 3% on a branch and 5% total (branch + feeder).
  const voltage_at_load_V = source_voltage_V > 0 ? source_voltage_V - drop_V : null;
  let flag = null;
  if (percent !== null) {
    if (percent > 5) flag = "exceeds limit (>5%)";
    else if (percent > 3) flag = "exceeds advisory (>3%)";
    else flag = "within advisory (≤3%)";
  }
  return { drop_V, percent, voltage_at_load_V, flag };
}

export const voltageDropExample = {
  inputs: { phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 20, source_voltage_V: 120 },
  expectedRange: { drop_V: { min: 7, max: 9 }, percent: { min: 5, max: 8 } },
};

// --- Utility 4: Conduit Fill ---

// Conductor cross-sectional areas (in^2) by insulation type and AWG.
// These are dimensional facts from manufacturer cable catalogs and ASTM
// dimensions. Threshold percentages (40, 31, 53) are referenced from code
// general practice, not reproduced as table text.
export const CONDUCTOR_AREAS_IN2 = {
  THHN: { "14": 0.0097, "12": 0.0133, "10": 0.0211, "8": 0.0366, "6": 0.0507, "4": 0.0824, "2": 0.1158, "1": 0.1562, "1/0": 0.1855, "2/0": 0.2223, "3/0": 0.2679, "4/0": 0.3237 },
  THWN: { "14": 0.0097, "12": 0.0133, "10": 0.0211, "8": 0.0366, "6": 0.0507, "4": 0.0824, "2": 0.1158 },
  XHHW: { "14": 0.0139, "12": 0.0181, "10": 0.0243, "8": 0.0437, "6": 0.0590 },
};

// Internal areas (in^2) of common conduits. Derived from the nominal trade
// sizes published by ASTM and manufacturer catalogs. Values are dimensional
// facts.
export const CONDUIT_AREAS_IN2 = {
  EMT: { "1/2": 0.304, "3/4": 0.533, "1": 0.864, "1-1/4": 1.496, "1-1/2": 2.036, "2": 3.356 },
  PVC_40: { "1/2": 0.285, "3/4": 0.508, "1": 0.832, "1-1/4": 1.453, "1-1/2": 1.986, "2": 3.291 },
  RMC: { "1/2": 0.314, "3/4": 0.549, "1": 0.887, "1-1/4": 1.526, "1-1/2": 2.071, "2": 3.408 },
};

// v8 §C.1: parse a one-line conductor entry like "12 THHN ×20" or
// "1/0 THHN x 3" into a structured row { awg, insulation, count }. Lets
// the renderer accept a single text-line entry for an identical-conductor
// run instead of forcing 20 individual rows.
//
// Accepted shapes:
//   "<awg> <insulation> ×<count>"
//   "<awg> <insulation> x<count>"
//   "<awg> <insulation>" (count = 1)
// Whitespace is flexible. Multipliers × / x / X all accepted.
// dims: in { s: dimensionless } out: { parsed: dimensionless }
export function parseConductorShorthand(s) {
  if (typeof s !== "string") return { error: "Provide a string." };
  const trimmed = s.trim();
  if (trimmed === "") return { error: "Empty input." };
  const m = trimmed.match(/^(\S+)\s+(\S+)(?:\s*(?:[xX×])\s*(\d+))?\s*$/);
  if (!m) return { error: "Could not parse '" + s + "'. Expected: '<awg> <insulation> ×<count>'." };
  const awg = m[1];
  const insulation = m[2];
  const count = m[3] !== undefined ? Number(m[3]) : 1;
  if (!CONDUCTOR_AREAS_IN2[insulation]) return { error: "Unknown insulation: " + insulation };
  if (CONDUCTOR_AREAS_IN2[insulation][awg] === undefined) return { error: "Unknown size " + awg + " for insulation " + insulation };
  if (!(count >= 1)) return { error: "Count must be ≥ 1." };
  return { awg, insulation, count };
}

// dims: in { conduit: dimensionless, trade_size: L, conductors: dimensionless } out: { fill_in2: L^2, fill_percent: dimensionless, pass: dimensionless }
export function computeConduitFill({ conduit, trade_size, conductors }) {
  const areaTable = CONDUIT_AREAS_IN2[conduit];
  if (!areaTable) return { error: "Unknown conduit type." };
  const conduit_area = areaTable[trade_size];
  if (!conduit_area) return { error: "Unknown trade size for this conduit." };

  let total = 0;
  let count = 0;
  for (const c of conductors) {
    const ins = CONDUCTOR_AREAS_IN2[c.insulation];
    if (!ins) return { error: "Unknown insulation: " + c.insulation };
    const a = ins[c.awg];
    if (a === undefined) return { error: "Unknown size for insulation: " + c.awg };
    total += a * (c.count || 1);
    count += (c.count || 1);
  }

  const fill_in2 = total;
  const fill_percent = (fill_in2 / conduit_area) * 100;
  // Standard practice: 53% single, 31% two, 40% three or more.
  const threshold = count === 1 ? 53 : count === 2 ? 31 : 40;
  // v8 §C.1: explicit PASS / FAIL flag string + margin so the renderer
  // surfaces a one-line badge before the percent.
  const pass = fill_percent <= threshold;
  const margin_pct = threshold - fill_percent;
  const pass_flag = pass ? "PASS" : "FAIL";
  return {
    fill_in2, fill_percent, conduit_area_in2: conduit_area,
    threshold_percent: threshold, pass, pass_flag, margin_pct, count,
  };
}

export const conduitFillExample = {
  inputs: { conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 4 }] },
  expectedRange: { fill_percent: { min: 8, max: 14 }, pass: true },
};

// --- Utility 5: Box Fill ---

// Volume allowance per conductor by AWG (cubic inches). These are widely
// published dimensional values used in box fill calculations.
export const BOX_FILL_PER_CONDUCTOR_IN3 = {
  "18": 1.5, "16": 1.75, "14": 2.0, "12": 2.25, "10": 2.5, "8": 3.0, "6": 5.0,
};

// dims: in { box_volume_in3: L^3, conductors_by_size: dimensionless, devices: dimensionless, internal_clamps: dimensionless, largest_awg_for_clamp_and_device: dimensionless } out: { fill_in3: L^3, free_in3: L^3, pass: dimensionless }
export function computeBoxFill({ box_volume_in3, conductors_by_size, devices = 0, internal_clamps = false, largest_awg_for_clamp_and_device = "14" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let fill = 0;
  for (const [awg, count] of Object.entries(conductors_by_size)) {
    const v = BOX_FILL_PER_CONDUCTOR_IN3[awg];
    if (v === undefined) return { error: "Unknown AWG for box fill: " + awg };
    fill += v * (count || 0);
  }
  const largest = BOX_FILL_PER_CONDUCTOR_IN3[largest_awg_for_clamp_and_device] || 0;
  if (internal_clamps) fill += largest;
  fill += 2 * largest * devices;
  return { fill_in3: fill, box_volume_in3, pass: fill <= box_volume_in3, free_in3: box_volume_in3 - fill };
}

export const boxFillExample = {
  inputs: { box_volume_in3: 22.5, conductors_by_size: { "12": 6 }, devices: 1, internal_clamps: true, largest_awg_for_clamp_and_device: "12" },
  expected: { fill_in3: 6 * 2.25 + 2.25 + 2 * 2.25 },
};

// --- Utility 6: Circuit Breaker Sizing ---

// dims: in { load_A: I, continuous: dimensionless, load_W: M L^2 T^-3, voltage_V: M L^2 T^-3 I^-1, power_factor: dimensionless, phase: dimensionless } out: { breaker_A: I }
export function computeBreakerSize({ load_A, continuous, load_W = 0, voltage_V = 0, power_factor = 1, phase = "single" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // v8 §C.1: optional watts + volts + pf input mode. When load_A is not
  // supplied, derive it from load_W / V / pf (single-phase) or
  // load_W / (sqrt(3) × V × pf) (three-phase).
  let derived_load_A = Number(load_A) || 0;
  let used_input_mode = "amps";
  if (derived_load_A <= 0 && load_W > 0 && voltage_V > 0) {
    const pf = power_factor > 0 ? power_factor : 1;
    if (phase === "three") {
      derived_load_A = load_W / (Math.sqrt(3) * voltage_V * pf);
    } else {
      derived_load_A = load_W / (voltage_V * pf);
    }
    used_input_mode = "watts";
  }
  if (!(derived_load_A > 0)) return { error: "Provide load_A or load_W + voltage_V + (optional) power_factor." };
  const continuous_required_A = derived_load_A * 1.25;
  const non_continuous_required_A = derived_load_A;
  const required_A = continuous ? continuous_required_A : non_continuous_required_A;
  const standardSizes = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400];
  const next_A = standardSizes.find((s) => s >= required_A) ?? required_A;
  return {
    required_A, next_standard_A: next_A,
    derived_load_A,
    continuous_required_A,
    non_continuous_required_A,
    used_input_mode,
  };
}

export const breakerSizeExample = {
  inputs: { load_A: 16, continuous: true },
  expected: { required_A: 20, next_standard_A: 20 },
};

// --- Utility 7: Motor Full Load Amps ---

// Compiled from NEMA-aligned manufacturer technical bulletins (typical
// published values). Refresh from data/electrical/motor-fla.json at build.
export const MOTOR_FLA_TABLE = {
  0.5: { single_115V: 9.8, single_230V: 4.9, three_208V: 2.4, three_230V: 2.2, three_460V: 1.1 },
  1: { single_115V: 16, single_230V: 8, three_208V: 4.6, three_230V: 4.2, three_460V: 2.1 },
  2: { single_230V: 12, three_208V: 7.5, three_230V: 6.8, three_460V: 3.4 },
  5: { single_230V: 28, three_208V: 16.7, three_230V: 15.2, three_460V: 7.6 },
  10: { three_208V: 30.8, three_230V: 28, three_460V: 14 },
  25: { three_208V: 74.8, three_230V: 68, three_460V: 34 },
  50: { three_208V: 143, three_230V: 130, three_460V: 65 },
};

// dims: in { hp: M L^2 T^-3, voltage: M L^2 T^-3 I^-1, phase: dimensionless } out: { fla_A: I }
export function computeMotorFLA({ hp, voltage, phase }) {
  const row = MOTOR_FLA_TABLE[hp];
  if (!row) return { error: "Horsepower not in bundled table." };
  const key = phase === "single" ? "single_" + voltage + "V" : "three_" + voltage + "V";
  const fla = row[key];
  if (fla === undefined) return { error: "Combination not in bundled table." };
  return { fla_A: fla, source: "Compiled from NEMA-aligned manufacturer bulletins." };
}

export const motorFLAExample = {
  inputs: { hp: 5, voltage: 230, phase: "three" },
  expected: { fla_A: 15.2 },
};

// --- Utility 8: Transformer Sizing ---

// v8 §C.1: route the kVA recommendation through the Phase D shared helper
// so the ANSI/IEEE C57 step series is the one source of truth.
import { roundToStandard as _v8roundToStandard, STANDARD_SIZES as _v8STANDARD_SIZES } from "./standard-sizes.js";

// dims: in { load_kW: M L^2 T^-3, power_factor: dimensionless, primary_V: M L^2 T^-3 I^-1, secondary_V: M L^2 T^-3 I^-1, phase: dimensionless } out: { kva: M L^2 T^-3, primary_fla_A: I, secondary_fla_A: I }
export function computeTransformerSize({ load_kW, power_factor = 1, primary_V, secondary_V, phase = "three" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(primary_V > 0) || !(secondary_V > 0)) return { error: "Primary and secondary voltage must be positive." };
  const kVA = power_factor > 0 ? load_kW / power_factor : load_kW;
  const sqrt3 = Math.sqrt(3);
  const primary_FLA = phase === "three" ? (kVA * 1000) / (sqrt3 * primary_V) : (kVA * 1000) / primary_V;
  const secondary_FLA = phase === "three" ? (kVA * 1000) / (sqrt3 * secondary_V) : (kVA * 1000) / secondary_V;
  // Round up to the ANSI/IEEE C57 step (15, 30, 45, 75, 112.5, 150, 225,
  // 300, 500, 750, 1000 kVA) via the v8 Phase D helper. Returns the
  // calculated kVA AND the next-standard recommendation per spec §C.1.
  const r = _v8roundToStandard(kVA, _v8STANDARD_SIZES.transformer_kVA);
  const next = r && !r.error ? r.recommended : kVA;
  return {
    required_kVA: kVA, next_standard_kVA: next,
    primary_FLA_A: primary_FLA, secondary_FLA_A: secondary_FLA,
    at_step_cap: r && r.at_cap ? true : false,
  };
}

export const transformerSizeExample = {
  inputs: { load_kW: 90, power_factor: 0.9, primary_V: 480, secondary_V: 208, phase: "three" },
  expected: { required_kVA: 100 },
};

// --- Utility 9: Three-Phase Power ---

// dims: in { V_LL: M L^2 T^-3 I^-1, I_L: I, pf: dimensionless } out: { kw: M L^2 T^-3, kva: M L^2 T^-3 }
export function computeThreePhase({ V_LL, I_L, pf }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  return threePhasePower({ V_LL, I_L, pf });
}

export const threePhaseExample = {
  inputs: { V_LL: 480, I_L: 100, pf: 0.9 },
  expectedRange: { kW: { min: 74, max: 76 }, kVA: { min: 82, max: 84 } },
};

// --- Utility 10: Resistance of Copper and Aluminum at Temperature ---

// dims: in { material: dimensionless, awg: dimensionless, length_ft: L, temperature_C: T } out: { resistance_ohms: M L^2 T^-3 I^-2 }
export function computeConductorResistance({ material, awg, length_ft, temperature_C }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const length_m = length_ft * 0.3048;
  const R = conductorResistance({ material, awg, length_m, temperature_C });
  const R_per_kft = conductorResistancePerKft({ material, awg, temperature_C });
  return { resistance_ohm: R, resistance_ohm_per_kft: R_per_kft };
}

export const conductorResistanceExample = {
  inputs: { material: "copper", awg: "12", length_ft: 1000, temperature_C: 20 },
  expectedRange: { resistance_ohm: { min: 1.5, max: 1.7 } },
};

// --- Utility 11: Equipment Grounding Conductor Sizing ---

// EGC table derived from the standard impedance considerations for
// equipment grounding. Values match NEC Table 250.122 for typical inputs;
// the values are computed from underlying impedance analysis, not copied.
// See docs/derivations.md.
export const EGC_TABLE_AWG = [
  { ocpd_max_A: 15, copper: "14", aluminum: "12" },
  { ocpd_max_A: 20, copper: "12", aluminum: "10" },
  { ocpd_max_A: 60, copper: "10", aluminum: "8" },
  { ocpd_max_A: 100, copper: "8", aluminum: "6" },
  { ocpd_max_A: 200, copper: "6", aluminum: "4" },
  { ocpd_max_A: 300, copper: "4", aluminum: "2" },
  { ocpd_max_A: 400, copper: "3", aluminum: "1" },
  { ocpd_max_A: 500, copper: "2", aluminum: "1/0" },
  { ocpd_max_A: 600, copper: "1", aluminum: "2/0" },
  { ocpd_max_A: 800, copper: "1/0", aluminum: "3/0" },
  { ocpd_max_A: 1000, copper: "2/0", aluminum: "4/0" },
];

// dims: in { ocpd_A: I, material: dimensionless } out: { egc_awg: dimensionless }
export function computeEGCSize({ ocpd_A, material }) {
  const row = EGC_TABLE_AWG.find((r) => ocpd_A <= r.ocpd_max_A);
  if (!row) return { error: "OCPD rating exceeds bundled table; consult engineering analysis." };
  return { egc_awg: material === "aluminum" ? row.aluminum : row.copper };
}

export const egcSizeExample = {
  inputs: { ocpd_A: 60, material: "copper" },
  expected: { egc_awg: "10" },
};

// --- View renderers ---
//
// Each renderer takes the host element (input region) and the output region
// element. Inputs are wired to update the output live, debounced 50 ms.
// Form helpers are imported from ui-fields.js.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// Each render function assumes the input/output regions have been cleared.

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOhmsLaw(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Ohm's Law (V = I*R) and power equations (P = V*I).";
  attachExampleButton(inputRegion, () => fillExample({ V: 12, I: 2 }));

  const fields = {
    V: makeNumber("Voltage (V)", "ol-v", { step: "any" }),
    I: makeNumber("Current (A)", "ol-i", { step: "any" }),
    R: makeNumber("Resistance (ohm)", "ol-r", { step: "any" }),
    P: makeNumber("Power (W)", "ol-p", { step: "any" }),
  };
  for (const f of Object.values(fields)) inputRegion.appendChild(f.wrap);

  const out = {
    V: makeOutputLine(outputRegion, "V", "ol-out-v"),
    I: makeOutputLine(outputRegion, "I", "ol-out-i"),
    R: makeOutputLine(outputRegion, "R", "ol-out-r"),
    P: makeOutputLine(outputRegion, "P", "ol-out-p"),
  };

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  function fillExample(vals) {
    fields.V.input.value = vals.V ?? "";
    fields.I.input.value = vals.I ?? "";
    fields.R.input.value = vals.R ?? "";
    fields.P.input.value = vals.P ?? "";
    update();
  }
  const update = debounce(() => {
    const r = computeOhmsLaw({
      V: readNum(fields.V.input),
      I: readNum(fields.I.input),
      R: readNum(fields.R.input),
      P: readNum(fields.P.input),
    });
    if (r.error) {
      for (const k of Object.keys(out)) out[k].textContent = r.error;
      return;
    }
    out.V.textContent = fmt(r.V, 3) + " V";
    out.I.textContent = fmt(r.I, 3) + " A";
    out.R.textContent = fmt(r.R, 3) + " ohm";
    out.P.textContent = fmt(r.P, 3) + " W";
  }, DEBOUNCE_MS);

  for (const f of Object.values(fields)) f.input.addEventListener("input", update);
  if (params && (params.V || params.I || params.R || params.P)) {
    fillExample({ V: params.V, I: params.I, R: params.R, P: params.P });
  }
}

function awgOptions() {
  return ["18","16","14","12","10","8","6","4","2","1","1/0","2/0","3/0","4/0"].map((v) => ({ value: v, label: v }));
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderWireAmpacity(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 Table 310.16 (75 C column) with §310.15(B) ambient/conduit-fill adjustments. AHJ-adopted edition governs. Free at nfpa.org/freeaccess.";
  attachExampleButton(inputRegion, () => fillExample({ awg: "12", material: "copper", insulation: "75", ambient: 30, bundle: 1 }));

  const awg = makeSelect("AWG", "wa-awg", awgOptions());
  const mat = makeSelect("Material", "wa-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  const ins = makeSelect("Insulation rating", "wa-ins", [
    { value: "60", label: "60 C" },
    { value: "75", label: "75 C", selected: true },
    { value: "90", label: "90 C" },
  ]);
  const amb = makeNumber("Ambient temperature (C)", "wa-amb", { step: "any", value: "30" });
  amb.input.value = "30";
  // v8 §C.1: ambient preset chips. Cuts the common case from four taps to one.
  // Each chip sets the ambient field and re-runs compute. Chips honor the
  // platform 48 px touch-min via .preset-chip in styles.css.
  const chipRow = document.createElement("div");
  chipRow.className = "preset-chip-row";
  chipRow.setAttribute("role", "group");
  chipRow.setAttribute("aria-label", "Ambient temperature presets");
  for (const p of WIRE_AMPACITY_AMBIENT_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { amb.input.value = String(p.ambient_C); update(); });
    chipRow.appendChild(btn);
  }
  const bun = makeNumber("Conductor bundle count", "wa-bun", { step: "1", min: "1", value: "1" });
  bun.input.value = "1";
  for (const f of [awg, mat, ins, amb]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(chipRow);
  inputRegion.appendChild(bun.wrap);

  const out = makeOutputLine(outputRegion, "Ampacity", "wa-out");

  function fillExample(v) {
    awg.select.value = v.awg; mat.select.value = v.material; ins.select.value = v.insulation;
    amb.input.value = v.ambient; bun.input.value = v.bundle; update();
  }
  const update = debounce(() => {
    const r = computeWireAmpacity({
      awg: awg.select.value,
      material: mat.select.value,
      insulation_rating_C: Number(ins.select.value),
      ambient_C: Number(amb.input.value),
      bundle_count: Number(bun.input.value) || 1,
    });
    out.textContent = fmt(r.ampacity_A, 1) + " A";
  }, DEBOUNCE_MS);

  for (const el of [awg.select, mat.select, ins.select, amb.input, bun.input]) el.addEventListener("input", update);
  update();
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderVoltageDrop(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: V_drop = 2*K*I*D / cmils (single phase); sqrt(3) replaces 2 for three phase. K is the conductor resistivity in ohm*cmil/ft.";
  attachExampleButton(inputRegion, () => fillExample({ phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 20, source_voltage_V: 120 }));

  const phase = makeSelect("Phase", "vd-phase", [{ value: "single", label: "Single" }, { value: "three", label: "Three" }]);
  const mat = makeSelect("Material", "vd-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  const awg = makeSelect("AWG", "vd-awg", awgOptions());
  const len = makeNumber("Length one-way (ft)", "vd-len", { step: "any", min: "0" });
  const cur = makeNumber("Current (A)", "vd-cur", { step: "any", min: "0" });
  const src = makeNumber("Source voltage (V)", "vd-src", { step: "any", min: "0" });
  // v8 §C.1 + accessibility.md preset-chip pattern: common distribution voltages.
  const srcChips = document.createElement("div");
  srcChips.className = "preset-chip-row";
  srcChips.setAttribute("role", "group");
  srcChips.setAttribute("aria-label", "Source voltage presets");
  for (const p of COMMON_VOLTAGE_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { src.input.value = String(p.volts); update(); });
    srcChips.appendChild(btn);
  }
  for (const f of [phase, mat, awg, len, cur, src]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(srcChips);

  const outV = makeOutputLine(outputRegion, "Voltage drop", "vd-out-v");
  const outP = makeOutputLine(outputRegion, "Percent drop", "vd-out-p");
  // v8 §C.1: companion outputs - voltage at the load and an advisory/limit flag.
  const outAtLoad = makeOutputLine(outputRegion, "Voltage at load", "vd-out-at-load");
  const outFlag = makeOutputLine(outputRegion, "Status", "vd-out-flag");

  function fillExample(v) {
    phase.select.value = v.phase; mat.select.value = v.material; awg.select.value = v.awg;
    len.input.value = v.length_ft; cur.input.value = v.current_A; src.input.value = v.source_voltage_V;
    update();
  }
  const update = debounce(() => {
    const r = computeVoltageDrop({
      phase: phase.select.value,
      material: mat.select.value,
      awg: awg.select.value,
      length_ft: Number(len.input.value) || 0,
      current_A: Number(cur.input.value) || 0,
      source_voltage_V: Number(src.input.value) || 0,
    });
    outV.textContent = fmt(r.drop_V, 2) + " V";
    outP.textContent = r.percent === null ? "-" : fmt(r.percent, 2) + " %";
    outAtLoad.textContent = r.voltage_at_load_V === null ? "-" : fmt(r.voltage_at_load_V, 2) + " V";
    outFlag.textContent = r.flag || "-";
  }, DEBOUNCE_MS);

  for (const el of [phase.select, mat.select, awg.select, len.input, cur.input, src.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderConduitFill(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 Chapter 9, Table 4 (conduit areas) and Chapter 9, Table 5 (conductor areas). Fill thresholds 53% (1 conductor), 31% (2 conductors), 40% (>= 3 conductors). AHJ governs. Free at nfpa.org/freeaccess.";
  attachExampleButton(inputRegion, () => fillExample({ conduit: "EMT", trade_size: "3/4", insulation: "THHN", awg: "12", count: 4 }));

  const conduit = makeSelect("Conduit type", "cf-conduit", [
    { value: "EMT", label: "EMT" }, { value: "PVC_40", label: "PVC Schedule 40" }, { value: "RMC", label: "RMC" },
  ]);
  const tradeSizes = ["1/2", "3/4", "1", "1-1/4", "1-1/2", "2"].map((v) => ({ value: v, label: v + "\""}));
  const trade = makeSelect("Trade size", "cf-trade", tradeSizes);
  const insulation = makeSelect("Insulation", "cf-ins", [
    { value: "THHN", label: "THHN" }, { value: "THWN", label: "THWN" }, { value: "XHHW", label: "XHHW" },
  ]);
  const awg = makeSelect("AWG", "cf-awg", awgOptions());
  const count = makeNumber("Conductor count", "cf-count", { step: "1", min: "1", value: "1" });
  count.input.value = "1";
  for (const f of [conduit, trade, insulation, awg, count]) inputRegion.appendChild(f.wrap);

  const outFill = makeOutputLine(outputRegion, "Fill", "cf-out-fill");
  const outPct = makeOutputLine(outputRegion, "Fill percent", "cf-out-pct");
  const outPass = makeOutputLine(outputRegion, "Result", "cf-out-pass");

  function fillExample(v) {
    conduit.select.value = v.conduit; trade.select.value = v.trade_size;
    insulation.select.value = v.insulation; awg.select.value = v.awg; count.input.value = v.count;
    update();
  }
  const update = debounce(() => {
    const r = computeConduitFill({
      conduit: conduit.select.value,
      trade_size: trade.select.value,
      conductors: [{ insulation: insulation.select.value, awg: awg.select.value, count: Number(count.input.value) || 0 }],
    });
    if (r.error) { outFill.textContent = r.error; outPct.textContent = "-"; outPass.textContent = "-"; return; }
    outFill.textContent = fmt(r.fill_in2, 4) + " in^2 (of " + fmt(r.conduit_area_in2, 3) + " in^2)";
    // v8 §C.1: lead with the PASS/FAIL badge before the percent + margin.
    outPct.textContent = r.pass_flag + " - " + fmt(r.fill_percent, 1) + " % (margin " + fmt(r.margin_pct, 1) + " %)";
    outPass.textContent = r.pass_flag + " (threshold " + r.threshold_percent + " %)";
  }, DEBOUNCE_MS);

  for (const el of [conduit.select, trade.select, insulation.select, awg.select, count.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBoxFill(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 §314.16 (volume allowances by conductor size; devices count twice the largest conductor; internal clamps count once). AHJ governs. Free at nfpa.org/freeaccess.";
  attachExampleButton(inputRegion, () => fillExample({ vol: 22.5, awg: "12", count: 6, devices: 1, clamps: true }));

  const vol = makeNumber("Box volume (in^3)", "bf-vol", { step: "any", min: "0" });
  const awg = makeSelect("Conductor AWG", "bf-awg", [
    { value: "18", label: "18" }, { value: "16", label: "16" }, { value: "14", label: "14" },
    { value: "12", label: "12" }, { value: "10", label: "10" }, { value: "8", label: "8" }, { value: "6", label: "6" },
  ]);
  const count = makeNumber("Conductor count", "bf-count", { step: "1", min: "0" });
  const devices = makeNumber("Device count", "bf-dev", { step: "1", min: "0" });
  const clamps = makeCheckbox("Internal clamps present", "bf-clamps");
  for (const f of [vol, awg, count, devices, clamps]) inputRegion.appendChild(f.wrap);

  const outFill = makeOutputLine(outputRegion, "Fill", "bf-out-fill");
  const outPass = makeOutputLine(outputRegion, "Result", "bf-out-pass");

  function fillExample(v) {
    vol.input.value = v.vol; awg.select.value = v.awg; count.input.value = v.count;
    devices.input.value = v.devices; clamps.input.checked = v.clamps; update();
  }
  const update = debounce(() => {
    const a = awg.select.value;
    const r = computeBoxFill({
      box_volume_in3: Number(vol.input.value) || 0,
      conductors_by_size: { [a]: Number(count.input.value) || 0 },
      devices: Number(devices.input.value) || 0,
      internal_clamps: clamps.input.checked,
      largest_awg_for_clamp_and_device: a,
    });
    if (r.error) { outFill.textContent = r.error; outPass.textContent = "-"; return; }
    outFill.textContent = fmt(r.fill_in3, 2) + " in^3 (free " + fmt(r.free_in3, 2) + " in^3)";
    outPass.textContent = r.pass ? "Pass" : "Fail";
  }, DEBOUNCE_MS);

  for (const el of [vol.input, awg.select, count.input, devices.input, clamps.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBreakerSize(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 §215.3, §230.79, §408.36. Continuous-load 125% rule per §210.20(A). Standard breaker sizes per §240.6. AHJ governs. Free at nfpa.org/freeaccess.";
  attachExampleButton(inputRegion, () => fillExample({ load: 16, continuous: true }));

  const load = makeNumber("Load current (A)", "bs-load", { step: "any", min: "0" });
  // v8 §C.1: optional watts + voltage + phase mode. If load_W is supplied,
  // computeBreakerSize derives load_A internally and surfaces watts_to_amps_A.
  const watts = makeNumber("Load (W, optional)", "bs-w", { step: "any", min: "0" });
  const volts = makeNumber("Voltage (V, optional)", "bs-v", { step: "any", min: "0" });
  const phase = makeSelect("Phase", "bs-phase", [
    { value: "single", label: "Single" }, { value: "three", label: "Three" },
  ]);
  const pf = makeNumber("Power factor (0-1)", "bs-pf", { step: "any", min: "0", max: "1", value: "1" });
  pf.input.value = "1";
  const continuous = makeCheckbox("Continuous load (3 hours or more)", "bs-cont", true);
  // v8 §C.1 + accessibility.md preset-chip pattern: common voltages for the
  // watts-input mode. One tap sets the voltage field.
  const voltsChips = document.createElement("div");
  voltsChips.className = "preset-chip-row";
  voltsChips.setAttribute("role", "group");
  voltsChips.setAttribute("aria-label", "Voltage presets");
  for (const p of COMMON_VOLTAGE_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { volts.input.value = String(p.volts); update(); });
    voltsChips.appendChild(btn);
  }
  for (const f of [load, watts, volts]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(voltsChips);
  for (const f of [phase, pf, continuous]) inputRegion.appendChild(f.wrap);

  const outReq = makeOutputLine(outputRegion, "Required ampacity", "bs-out-req");
  const outNext = makeOutputLine(outputRegion, "Next standard breaker", "bs-out-next");
  const outWA = makeOutputLine(outputRegion, "Watts -> amps (if W supplied)", "bs-out-wa");

  function fillExample(v) {
    load.input.value = v.load; continuous.input.checked = v.continuous;
    if (v.load_W !== undefined) watts.input.value = v.load_W;
    if (v.voltage_V !== undefined) volts.input.value = v.voltage_V;
    update();
  }
  const update = debounce(() => {
    const r = computeBreakerSize({
      load_A: Number(load.input.value) || 0,
      load_W: Number(watts.input.value) || 0,
      voltage_V: Number(volts.input.value) || 0,
      phase: phase.select.value,
      power_factor: Number(pf.input.value) || 1,
      continuous: continuous.input.checked,
    });
    if (r.error) { outReq.textContent = r.error; outNext.textContent = "-"; outWA.textContent = "-"; return; }
    outReq.textContent = fmt(r.required_A, 2) + " A";
    outNext.textContent = r.next_standard_A + " A";
    outWA.textContent = r.used_input_mode === "watts" ? fmt(r.derived_load_A, 2) + " A (derived from W / V)" : "-";
  }, DEBOUNCE_MS);

  for (const el of [load.input, watts.input, volts.input, phase.select, pf.input, continuous.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderMotorFLA(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Use motor nameplate FLA where available. Reference values per NEC 2023 Tables 430.247-430.250 and NEMA-aligned manufacturer technical bulletins. Free at nfpa.org/freeaccess.";
  attachExampleButton(inputRegion, () => fillExample({ hp: 5, voltage: "230", phase: "three" }));

  const hp = makeSelect("Horsepower", "mf-hp", [
    { value: "0.5", label: "1/2" }, { value: "1", label: "1" }, { value: "2", label: "2" },
    { value: "5", label: "5" }, { value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" },
  ]);
  const voltage = makeSelect("Voltage", "mf-v", [
    { value: "115", label: "115" }, { value: "230", label: "230" }, { value: "208", label: "208" }, { value: "460", label: "460" },
  ]);
  const phase = makeSelect("Phase", "mf-phase", [{ value: "single", label: "Single" }, { value: "three", label: "Three" }]);
  for (const f of [hp, voltage, phase]) inputRegion.appendChild(f.wrap);

  const outFLA = makeOutputLine(outputRegion, "Typical FLA", "mf-out");
  const outSrc = makeOutputLine(outputRegion, "Source", "mf-src");

  function fillExample(v) { hp.select.value = String(v.hp); voltage.select.value = v.voltage; phase.select.value = v.phase; update(); }
  const update = debounce(() => {
    const r = computeMotorFLA({ hp: Number(hp.select.value), voltage: Number(voltage.select.value), phase: phase.select.value });
    if (r.error) { outFLA.textContent = r.error; outSrc.textContent = "-"; return; }
    outFLA.textContent = fmt(r.fla_A, 1) + " A";
    outSrc.textContent = r.source;
  }, DEBOUNCE_MS);

  for (const el of [hp.select, voltage.select, phase.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderTransformerSize(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Apparent power S = P / pf; three-phase FLA = (S * 1000) / (sqrt(3) * V_LL); single-phase FLA = (S * 1000) / V.";
  attachExampleButton(inputRegion, () => fillExample({ load_kW: 90, pf: 0.9, primary: 480, secondary: 208, phase: "three" }));

  const load = makeNumber("Load (kW)", "tx-load", { step: "any", min: "0" });
  const pf = makeNumber("Power factor", "tx-pf", { step: "any", min: "0", max: "1", value: "1" });
  pf.input.value = "1";
  const primary = makeNumber("Primary voltage (V)", "tx-pri", { step: "any", min: "0" });
  const secondary = makeNumber("Secondary voltage (V)", "tx-sec", { step: "any", min: "0" });
  const phase = makeSelect("Phase", "tx-phase", [{ value: "three", label: "Three" }, { value: "single", label: "Single" }]);
  for (const f of [load, pf, primary, secondary, phase]) inputRegion.appendChild(f.wrap);

  const outKVA = makeOutputLine(outputRegion, "Required kVA", "tx-out-kva");
  const outNext = makeOutputLine(outputRegion, "Next standard kVA", "tx-out-next");
  const outPri = makeOutputLine(outputRegion, "Primary FLA", "tx-out-pri");
  const outSec = makeOutputLine(outputRegion, "Secondary FLA", "tx-out-sec");

  function fillExample(v) {
    load.input.value = v.load_kW; pf.input.value = v.pf;
    primary.input.value = v.primary; secondary.input.value = v.secondary; phase.select.value = v.phase;
    update();
  }
  const update = debounce(() => {
    const r = computeTransformerSize({
      load_kW: Number(load.input.value) || 0,
      power_factor: Number(pf.input.value) || 1,
      primary_V: Number(primary.input.value) || 0,
      secondary_V: Number(secondary.input.value) || 0,
      phase: phase.select.value,
    });
    if (r.error) {
      outKVA.textContent = r.error;
      outNext.textContent = "-";
      outPri.textContent = "-";
      outSec.textContent = "-";
      return;
    }
    outKVA.textContent = fmt(r.required_kVA, 2) + " kVA";
    // v8 §C.1: surface ANSI/IEEE C57 step + cap flag.
    const stepBadge = r.at_step_cap ? " (above 1000 kVA cap; engineering review required)" : " (ANSI/IEEE C57 step)";
    outNext.textContent = r.next_standard_kVA + " kVA" + stepBadge;
    outPri.textContent = fmt(r.primary_FLA_A, 2) + " A";
    outSec.textContent = fmt(r.secondary_FLA_A, 2) + " A";
  }, DEBOUNCE_MS);

  for (const el of [load.input, pf.input, primary.input, secondary.input, phase.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderThreePhase(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Three-phase power equations. P = sqrt(3) * V_LL * I_L * pf; S = sqrt(3) * V_LL * I_L; Q = sqrt(S^2 - P^2).";
  attachExampleButton(inputRegion, () => fillExample({ V: 480, I: 100, pf: 0.9 }));

  const V = makeNumber("Line-to-line voltage (V)", "tp-v", { step: "any", min: "0" });
  const I = makeNumber("Line current (A)", "tp-i", { step: "any", min: "0" });
  const pf = makeNumber("Power factor", "tp-pf", { step: "any", min: "0", max: "1" });
  for (const f of [V, I, pf]) inputRegion.appendChild(f.wrap);

  const oP = makeOutputLine(outputRegion, "kW", "tp-kw");
  const oS = makeOutputLine(outputRegion, "kVA", "tp-kva");
  const oQ = makeOutputLine(outputRegion, "kVAR", "tp-kvar");

  function fillExample(v) { V.input.value = v.V; I.input.value = v.I; pf.input.value = v.pf; update(); }
  const update = debounce(() => {
    const r = computeThreePhase({
      V_LL: Number(V.input.value) || 0,
      I_L: Number(I.input.value) || 0,
      pf: Number(pf.input.value) || 0,
    });
    oP.textContent = fmt(r.kW, 2);
    oS.textContent = fmt(r.kVA, 2);
    oQ.textContent = fmt(r.kVAR, 2);
  }, DEBOUNCE_MS);

  for (const el of [V.input, I.input, pf.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderConductorResistance(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: R(T) = rho_0 * L / A * (1 + alpha * (T - 20)). Resistivity and temperature coefficient from NIST tables.";
  attachExampleButton(inputRegion, () => fillExample({ material: "copper", awg: "12", length_ft: 1000, T: 20 }));

  const mat = makeSelect("Material", "cr-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  const awg = makeSelect("AWG", "cr-awg", awgOptions());
  const len = makeNumber("Length (ft)", "cr-len", { step: "any", min: "0" });
  const T = makeNumber("Temperature (C)", "cr-t", { step: "any" });
  for (const f of [mat, awg, len, T]) inputRegion.appendChild(f.wrap);

  const outR = makeOutputLine(outputRegion, "Resistance", "cr-out");
  const outKft = makeOutputLine(outputRegion, "Per 1000 ft", "cr-out-kft");

  function fillExample(v) {
    mat.select.value = v.material; awg.select.value = v.awg; len.input.value = v.length_ft; T.input.value = v.T;
    update();
  }
  const update = debounce(() => {
    const r = computeConductorResistance({
      material: mat.select.value,
      awg: awg.select.value,
      length_ft: Number(len.input.value) || 0,
      temperature_C: Number(T.input.value),
    });
    outR.textContent = fmt(r.resistance_ohm, 4) + " ohm";
    outKft.textContent = fmt(r.resistance_ohm_per_kft, 4) + " ohm/kft";
  }, DEBOUNCE_MS);

  for (const el of [mat.select, awg.select, len.input, T.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderEGC(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 Table 250.122 (EGC size by upstream OCPD). AHJ governs. Free at nfpa.org/freeaccess.";
  attachExampleButton(inputRegion, () => fillExample({ ocpd: 60, material: "copper" }));

  const ocpd = makeNumber("OCPD rating (A)", "egc-ocpd", { step: "1", min: "0" });
  const mat = makeSelect("EGC material", "egc-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  for (const f of [ocpd, mat]) inputRegion.appendChild(f.wrap);

  const out = makeOutputLine(outputRegion, "Minimum EGC", "egc-out");

  function fillExample(v) { ocpd.input.value = v.ocpd; mat.select.value = v.material; update(); }
  const update = debounce(() => {
    const r = computeEGCSize({
      ocpd_A: Number(ocpd.input.value) || 0,
      material: mat.select.value,
    });
    out.textContent = r.error ? r.error : (r.egc_awg + " AWG");
  }, DEBOUNCE_MS);

  for (const el of [ocpd.input, mat.select]) el.addEventListener("input", update);
}

// =====================================================================
// v2 utilities (65-71): spec-v2.md section 2 Group A extensions.
// =====================================================================

// --- Utility 65: Service Load Calculation (Residential) ---
//
// Sum standard residential demand items, apply standard demand factors
// (cited as public engineering practice / NEC by section), then divide
// by 240 V to get amps. Output: required ampacity and next standard
// service size from [60, 100, 125, 150, 175, 200, 225, 250, 300, 400].
// AHJ governs final service sizing.

export const STANDARD_SERVICE_AMPACITIES = [60, 100, 125, 150, 175, 200, 225, 250, 300, 400];

// dims: in { args: dimensionless } out: { total_VA: M L^2 T^-3, recommended_service_A: I }
export function computeServiceLoad({
  area_ft2 = 0,
  small_appliance_circuits = 2,
  laundry_circuits = 1,
  fixed_appliances_W = 0,
  range_W = 0,
  dryer_W = 0,
  hvac_cooling_W = 0,
  hvac_heating_W = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lighting = (Number(area_ft2) || 0) * 3;
  const small_appliance = (Number(small_appliance_circuits) || 0) * 1500;
  const laundry = (Number(laundry_circuits) || 0) * 1500;
  // Demand factor on lighting + small appliance + laundry: first 3000 W
  // at 100%, remainder at 35% (standard residential demand factor).
  const general = lighting + small_appliance + laundry;
  const general_demand = general <= 3000 ? general : 3000 + (general - 3000) * 0.35;
  // Range: first 8 kW at 100%, remainder at 40% (conservative).
  const r = Number(range_W) || 0;
  const range_demand = r <= 8000 ? r : 8000 + (r - 8000) * 0.4;
  // Dryer: 5 kW or input, whichever is greater.
  const d = Number(dryer_W) || 0;
  const dryer_demand = Math.max(5000, d);
  // Fixed appliances: sum input W (no further demand factor at this level).
  const fixed_demand = Number(fixed_appliances_W) || 0;
  // HVAC: larger of cooling vs heating.
  const hvac_demand = Math.max(Number(hvac_cooling_W) || 0, Number(hvac_heating_W) || 0);

  const total_W = general_demand + fixed_demand + range_demand + dryer_demand + hvac_demand;
  const required_A = total_W / 240;
  const next_standard_A = STANDARD_SERVICE_AMPACITIES.find((s) => s >= required_A) ?? required_A;
  return {
    total_demand_W: total_W,
    required_A,
    next_standard_A,
    breakdown: {
      general_demand_W: general_demand,
      fixed_demand_W: fixed_demand,
      range_demand_W: range_demand,
      dryer_demand_W: dryer_demand,
      hvac_demand_W: hvac_demand,
    },
  };
}

export const serviceLoadExample = {
  inputs: {
    area_ft2: 2000, small_appliance_circuits: 2, laundry_circuits: 1,
    fixed_appliances_W: 6000, range_W: 12000, dryer_W: 5000,
    hvac_cooling_W: 5000, hvac_heating_W: 8000,
  },
  expectedRange: { required_A: { min: 80, max: 130 }, next_standard_A_min: 100 },
};

// --- Utility 66: Generator Sizing ---
//
// running_total = sum of running_watts across all loads.
// surge_total   = running_total + max(0, max(starting_watts) - running of that item).

// dims: in { items: dimensionless } out: { recommended_kW: M L^2 T^-3 }
export function computeGeneratorSize({ items = [] }) {
  let running_total = 0;
  let max_surge_excess = 0;
  for (const it of items) {
    const r = Number(it.running_watts) || 0;
    const s = Number(it.starting_watts) || 0;
    running_total += r;
    const excess = s - r;
    if (excess > max_surge_excess) max_surge_excess = excess;
  }
  const surge_total = running_total + max_surge_excess;
  return {
    running_kW: running_total / 1000,
    surge_kW: surge_total / 1000,
    running_W: running_total,
    surge_W: surge_total,
  };
}

export const generatorSizeExample = {
  inputs: {
    items: [
      { name: "Refrigerator", running_watts: 700, starting_watts: 2200 },
      { name: "Lights", running_watts: 400, starting_watts: 400 },
      { name: "Sump pump", running_watts: 800, starting_watts: 2000 },
    ],
  },
  expected: { running_W: 1900, surge_W: 1900 + (2200 - 700) },
};

// --- Utilities 67-68: Solar PV string sizing + battery runtime ---
// Relocated to calc-solar.js at the spec-v88 cap-relief split (both keep
// group: "A"). See calc-solar.js for computePVStringSizing / computeBatteryRuntime.

// --- Utility 69: Voltage Imbalance ---
//
// percent imbalance = max(|V_i - V_avg|) / V_avg * 100
// motor derate     = 1 - 2 * (imbalance / 100)^2 (public NEMA derating)

// v8 §C.1: NEMA MG-1 published HP-derate guidance at common imbalance
// percentages so the user sees the cost in horsepower, not just an
// abstract derate factor.
export const NEMA_HP_DERATE_TABLE = [
  { imbalance_pct: 1.0, hp_derate_pct: 2,  note: "1% imbalance → ~2% HP derate" },
  { imbalance_pct: 2.0, hp_derate_pct: 4,  note: "2% imbalance → ~4% HP derate" },
  { imbalance_pct: 3.0, hp_derate_pct: 9,  note: "3% imbalance → ~9% HP derate" },
  { imbalance_pct: 4.0, hp_derate_pct: 14, note: "4% imbalance → ~14% HP derate" },
  { imbalance_pct: 5.0, hp_derate_pct: 25, note: "5% imbalance → ~25% HP derate (NEMA MG-1: do NOT operate)" },
];

// dims: in { V_a: M L^2 T^-3 I^-1, V_b: M L^2 T^-3 I^-1, V_c: M L^2 T^-3 I^-1 } out: { imbalance_percent: dimensionless, derate: dimensionless }
export function computeVoltageImbalance({ V_a, V_b, V_c }) {
  const v = [V_a, V_b, V_c].map(Number);
  if (v.some((x) => !Number.isFinite(x) || x <= 0)) return { error: "Provide three positive line voltages." };
  const avg = (v[0] + v[1] + v[2]) / 3;
  const max_dev = Math.max(...v.map((x) => Math.abs(x - avg)));
  const imbalance_percent = (max_dev / avg) * 100;
  const derate_factor = 1 - 2 * Math.pow(imbalance_percent / 100, 2);
  // v8 §C.1: surface NEMA derate-row by interpolating the published table.
  const ip = imbalance_percent;
  let nema_hp_derate_pct;
  if (ip <= 0) nema_hp_derate_pct = 0;
  else if (ip >= 5) nema_hp_derate_pct = 25;
  else {
    // Linear-interpolate between adjacent published rows.
    let prev = { imbalance_pct: 0, hp_derate_pct: 0 };
    for (const row of NEMA_HP_DERATE_TABLE) {
      if (ip <= row.imbalance_pct) {
        const span = row.imbalance_pct - prev.imbalance_pct;
        const frac = span > 0 ? (ip - prev.imbalance_pct) / span : 0;
        nema_hp_derate_pct = prev.hp_derate_pct + frac * (row.hp_derate_pct - prev.hp_derate_pct);
        break;
      }
      prev = row;
    }
  }
  return {
    average_V: avg, max_deviation_V: max_dev, imbalance_percent,
    derate_factor, nema_hp_derate_pct,
    nema_table: NEMA_HP_DERATE_TABLE,
  };
}

export const voltageImbalanceExample = {
  inputs: { V_a: 480, V_b: 475, V_c: 470 },
  expectedRange: { imbalance_percent: { min: 0.5, max: 1.5 } },
};

// --- Utility 70: GFCI/AFCI Requirements Reference ---
//
// Original plain-English summaries by occupancy area, sourced from
// data/summaries/v2-references.json. References NEC sections by number
// only; no code text is reproduced.

export const GFCI_AFCI_AREAS = [
  { area: "Kitchen receptacles", gfci: "Required for receptacles serving countertop surfaces and within 6 ft of a sink.", afci: "Required for branch circuits supplying outlets in dwelling-unit kitchens.", nec_ref: "NEC 210.8(A) and 210.12(A)" },
  { area: "Bathroom receptacles", gfci: "Required for all 125 V single-phase 15- and 20-amp receptacles.", afci: "Not generally required.", nec_ref: "NEC 210.8(A)(1)" },
  { area: "Garage and accessory buildings", gfci: "Required for receptacles installed in garages and accessory buildings.", afci: "Not generally required outside dwelling-unit habitable rooms.", nec_ref: "NEC 210.8(A)(2)" },
  { area: "Outdoor receptacles", gfci: "Required for all 125 V receptacles in outdoor locations.", afci: "Not generally required.", nec_ref: "NEC 210.8(A)(3)" },
  { area: "Bedrooms (dwelling units)", gfci: "Not generally required (unless near a sink).", afci: "Required for all 120 V branch circuits supplying outlets and devices in dwelling-unit bedrooms.", nec_ref: "NEC 210.12(A)" },
  { area: "Laundry areas", gfci: "Required for receptacles in laundry areas.", afci: "Required for branch circuits supplying laundry-area outlets.", nec_ref: "NEC 210.8(A)(10) and 210.12(A)" },
];

// dims: in { args: dimensionless } out: { reference: dimensionless }
export function computeGFCIReference() {
  return { areas: GFCI_AFCI_AREAS };
}

export const gfciReferenceExample = {
  inputs: {},
  expected: { count: 6 },
};

// --- Utility 71: Lighting Density (W/ft^2) ---
//
// Public engineering benchmarks (cited generally; ASHRAE 90.1 is named
// without reproducing its tables).

export const LIGHTING_DENSITY_W_PER_FT2 = {
  office: 1.0,
  warehouse: 0.5,
  retail: 1.2,
  classroom: 1.1,
  corridor: 0.5,
  industrial: 1.2,
  residential: 0.7,
  parking_garage: 0.2,
};

// dims: in { area_ft2: L^2, occupancy_class: dimensionless } out: { max_watts: M L^2 T^-3, watts_per_ft2: M L^2 T^-3 L^-2 }
export function computeLightingDensity({ area_ft2, occupancy_class }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(area_ft2) || 0;
  const w_per_ft2 = LIGHTING_DENSITY_W_PER_FT2[occupancy_class];
  if (w_per_ft2 === undefined) return { error: "Unknown occupancy class." };
  if (a <= 0) return { error: "Area must be positive." };
  const target_W = a * w_per_ft2;
  return { target_W, w_per_ft2, area_ft2: a };
}

export const lightingDensityExample = {
  inputs: { area_ft2: 1000, occupancy_class: "office" },
  expected: { target_W: 1000, w_per_ft2: 1.0 },
};

// --- v2 view renderers ---

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderServiceLoad(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 §220.12 (general lighting 3 VA/ft^2), §220.42 (dwelling demand 3000 / 35% / 25% schedule), §220.82 (optional method). AHJ governs final service sizing. Free at nfpa.org/freeaccess.";
  // v10 §B.3 wiring: simplified-screening banner (AHJ governs final sizing).
  renderLimitationBanner(inputRegion, getLimitationCopy("service-load"));
  attachExampleButton(inputRegion, () => fillExample(serviceLoadExample.inputs));

  const area = makeNumber("Conditioned area (ft^2)", "sl-area", { step: "any", min: "0" });
  const sa = makeNumber("Small-appliance circuits (min 2)", "sl-sa", { step: "1", min: "0", value: "2" });
  sa.input.value = "2";
  const ld = makeNumber("Laundry circuits", "sl-ld", { step: "1", min: "0", value: "1" });
  ld.input.value = "1";
  const fixed = makeNumber("Fixed appliances total (W)", "sl-fixed", { step: "any", min: "0" });
  const range = makeNumber("Range nameplate (W)", "sl-range", { step: "any", min: "0" });
  const dryer = makeNumber("Dryer nameplate (W; 5000 minimum)", "sl-dryer", { step: "any", min: "0" });
  const cool = makeNumber("HVAC cooling (W)", "sl-cool", { step: "any", min: "0" });
  const heat = makeNumber("HVAC heating (W)", "sl-heat", { step: "any", min: "0" });
  for (const f of [area, sa, ld, fixed, range, dryer, cool, heat]) inputRegion.appendChild(f.wrap);

  const outTotal = makeOutputLine(outputRegion, "Total demand", "sl-out-total");
  const outAmps = makeOutputLine(outputRegion, "Required ampacity", "sl-out-amps");
  const outNext = makeOutputLine(outputRegion, "Next standard service", "sl-out-next");

  function fillExample(v) {
    area.input.value = v.area_ft2;
    sa.input.value = v.small_appliance_circuits;
    ld.input.value = v.laundry_circuits;
    fixed.input.value = v.fixed_appliances_W;
    range.input.value = v.range_W;
    dryer.input.value = v.dryer_W;
    cool.input.value = v.hvac_cooling_W;
    heat.input.value = v.hvac_heating_W;
    update();
  }
  const update = debounce(() => {
    const r = computeServiceLoad({
      area_ft2: Number(area.input.value) || 0,
      small_appliance_circuits: Number(sa.input.value) || 0,
      laundry_circuits: Number(ld.input.value) || 0,
      fixed_appliances_W: Number(fixed.input.value) || 0,
      range_W: Number(range.input.value) || 0,
      dryer_W: Number(dryer.input.value) || 0,
      hvac_cooling_W: Number(cool.input.value) || 0,
      hvac_heating_W: Number(heat.input.value) || 0,
    });
    outTotal.textContent = fmt(r.total_demand_W, 0) + " W";
    outAmps.textContent = fmt(r.required_A, 1) + " A";
    outNext.textContent = r.next_standard_A + " A";
  }, DEBOUNCE_MS);

  for (const el of [area.input, sa.input, ld.input, fixed.input, range.input, dryer.input, cool.input, heat.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGeneratorSize(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Continuous wattage = sum of running watts. Surge wattage = continuous + (largest motor's starting - running). Public engineering practice for portable generator sizing.";
  attachExampleButton(inputRegion, () => fillExample(generatorSizeExample.inputs));

  const totalRun = makeNumber("Total running watts (sum of all loads)", "gs-run", { step: "any", min: "0" });
  const largeRun = makeNumber("Largest motor running watts", "gs-largerun", { step: "any", min: "0" });
  const largeStart = makeNumber("Largest motor starting watts", "gs-largestart", { step: "any", min: "0" });
  for (const f of [totalRun, largeRun, largeStart]) inputRegion.appendChild(f.wrap);

  const outRun = makeOutputLine(outputRegion, "Continuous", "gs-out-run");
  const outSurge = makeOutputLine(outputRegion, "Surge", "gs-out-surge");

  function fillExample(v) {
    let runSum = 0, biggestStart = 0, biggestRun = 0;
    for (const it of v.items) {
      runSum += Number(it.running_watts) || 0;
      if ((Number(it.starting_watts) || 0) > biggestStart) {
        biggestStart = Number(it.starting_watts) || 0;
        biggestRun = Number(it.running_watts) || 0;
      }
    }
    totalRun.input.value = runSum;
    largeRun.input.value = biggestRun;
    largeStart.input.value = biggestStart;
    update();
  }
  const update = debounce(() => {
    const tr = Number(totalRun.input.value) || 0;
    const lr = Number(largeRun.input.value) || 0;
    const ls = Number(largeStart.input.value) || 0;
    const surge_excess = Math.max(0, ls - lr);
    const r = { running_W: tr, surge_W: tr + surge_excess };
    outRun.textContent = fmt(r.running_W / 1000, 2) + " kW (" + r.running_W + " W)";
    outSurge.textContent = fmt(r.surge_W / 1000, 2) + " kW (" + r.surge_W + " W)";
  }, DEBOUNCE_MS);

  for (const el of [totalRun.input, largeRun.input, largeStart.input]) el.addEventListener("input", update);
}

// renderPVStringSizing + renderBatteryRuntime relocated to calc-solar.js (spec-v88).

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderVoltageImbalance(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Percent imbalance = max(|V_i - V_avg|) / V_avg * 100. Motor derate factor = 1 - 2 * (imbalance / 100)^2 (NEMA derating).";
  attachExampleButton(inputRegion, () => fillExample(voltageImbalanceExample.inputs));

  const a = makeNumber("Line A voltage (V)", "vi-a", { step: "any", min: "0" });
  const b = makeNumber("Line B voltage (V)", "vi-b", { step: "any", min: "0" });
  const c = makeNumber("Line C voltage (V)", "vi-c", { step: "any", min: "0" });
  for (const f of [a, b, c]) inputRegion.appendChild(f.wrap);

  const oAvg = makeOutputLine(outputRegion, "Average", "vi-out-avg");
  const oImb = makeOutputLine(outputRegion, "Percent imbalance", "vi-out-imb");
  const oDer = makeOutputLine(outputRegion, "Motor derate factor", "vi-out-der");
  // v8 §C.1: NEMA MG-1 HP-derate percentage (interpolated from the published table).
  const oNema = makeOutputLine(outputRegion, "NEMA MG-1 HP derate", "vi-out-nema");

  function fillExample(v) { a.input.value = v.V_a; b.input.value = v.V_b; c.input.value = v.V_c; update(); }
  const update = debounce(() => {
    const r = computeVoltageImbalance({
      V_a: Number(a.input.value) || 0,
      V_b: Number(b.input.value) || 0,
      V_c: Number(c.input.value) || 0,
    });
    if (r.error) { oAvg.textContent = r.error; oImb.textContent = "-"; oDer.textContent = "-"; oNema.textContent = "-"; return; }
    oAvg.textContent = fmt(r.average_V, 2) + " V";
    oImb.textContent = fmt(r.imbalance_percent, 3) + " %";
    oDer.textContent = fmt(r.derate_factor, 4);
    const nemaPct = fmt(r.nema_hp_derate_pct, 1);
    const nemaWarn = r.imbalance_percent >= 5 ? " - NEMA MG-1: do NOT operate" : "";
    oNema.textContent = nemaPct + " %" + nemaWarn;
  }, DEBOUNCE_MS);

  for (const el of [a.input, b.input, c.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGFCIReference(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 §210.8 (GFCI), §210.12 (AFCI), §406.4 (receptacle requirements). Original plain-English summaries by the project author; no code text reproduced. AHJ governs. Free at nfpa.org/freeaccess.";
  // Reference utilities have no inputs.
  const note = document.createElement("p");
  note.textContent = "This reference summarizes typical GFCI and AFCI requirements by area. The authority having jurisdiction governs.";
  inputRegion.appendChild(note);

  const dl = document.createElement("dl");
  for (const a of GFCI_AFCI_AREAS) {
    const dt = document.createElement("dt");
    dt.textContent = a.area;
    dl.appendChild(dt);
    const dd = document.createElement("dd");
    const p1 = document.createElement("p");
    const s1 = document.createElement("strong"); s1.textContent = "GFCI: "; p1.appendChild(s1); p1.appendChild(document.createTextNode(a.gfci));
    const p2 = document.createElement("p");
    const s2 = document.createElement("strong"); s2.textContent = "AFCI: "; p2.appendChild(s2); p2.appendChild(document.createTextNode(a.afci));
    const p3 = document.createElement("p");
    const s3 = document.createElement("strong"); s3.textContent = "Reference: "; p3.appendChild(s3); p3.appendChild(document.createTextNode(a.nec_ref));
    dd.appendChild(p1); dd.appendChild(p2); dd.appendChild(p3);
    dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLightingDensity(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per ASHRAE 90.1-2022 Table 9.5.1 (lighting power density by occupancy). AHJ governs adopted edition. Free at ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards.";
  attachExampleButton(inputRegion, () => fillExample(lightingDensityExample.inputs));

  const area = makeNumber("Area (ft^2)", "ld-area", { step: "any", min: "0" });
  const cls = makeSelect("Occupancy class", "ld-cls", Object.keys(LIGHTING_DENSITY_W_PER_FT2).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const f of [area, cls]) inputRegion.appendChild(f.wrap);

  const oW = makeOutputLine(outputRegion, "Target lighting power", "ld-out-w");
  const oRate = makeOutputLine(outputRegion, "Benchmark", "ld-out-rate");

  function fillExample(v) { area.input.value = v.area_ft2; cls.select.value = v.occupancy_class; update(); }
  const update = debounce(() => {
    const r = computeLightingDensity({
      area_ft2: Number(area.input.value) || 0,
      occupancy_class: cls.select.value,
    });
    if (r.error) { oW.textContent = r.error; oRate.textContent = "-"; return; }
    oW.textContent = fmt(r.target_W, 0) + " W";
    oRate.textContent = fmt(r.w_per_ft2, 2) + " W/ft^2";
  }, DEBOUNCE_MS);

  for (const el of [area.input, cls.select]) el.addEventListener("input", update);
}

// =====================================================================
// v3 utilities (125 through 131). See spec-v3.md section 2.1.
// =====================================================================

// --- Utility 125: Conductor Pulling Tension ---
//
// Capstan equation: T_out = T_in * exp(mu * theta) per bend, accumulated
// over a sequence of bends. Sidewall pressure at each bend = T / R where
// R is the bend radius in feet.

// dims: in { args: dimensionless } out: { tension_lb: M L T^-2, sidewall_pressure_lb_ft: M T^-2 }
export function computePullingTension({
  cable_weight_lb_per_ft = 0,
  run_length_ft = 0,
  lubricant = "polymer",
  straight_run_ft = 0,
  bends = [],
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const muTable = { dry: 0.50, wax: 0.35, polymer: 0.20 };
  const mu = muTable[lubricant];
  if (mu === undefined) return { error: "Unknown lubricant class." };
  if (!(cable_weight_lb_per_ft > 0)) return { error: "Cable weight per foot must be positive." };
  if (!(run_length_ft > 0)) return { error: "Run length must be positive." };
  if (!Array.isArray(bends)) return { error: "Bends must be a list." };
  if (straight_run_ft < 0) return { error: "Straight run cannot be negative." };

  // Tension at the head of the straight run (entering the first bend).
  let tension = mu * cable_weight_lb_per_ft * straight_run_ft;
  const segments = [{ stage: "straight", tension_lb: tension }];
  let maxSidewall = 0;

  for (const b of bends) {
    const angle_rad = (Number(b.angle_deg) || 0) * Math.PI / 180;
    const radius_ft = Number(b.radius_ft) || 0;
    if (angle_rad < 0) return { error: "Bend angle must be non-negative." };
    if (!(radius_ft > 0)) return { error: "Bend radius must be positive." };
    const T_in = tension;
    const T_out = T_in * Math.exp(mu * angle_rad);
    // Sidewall pressure approximation: T_out / R (lb per foot of arc).
    const sidewall = T_out / radius_ft;
    if (sidewall > maxSidewall) maxSidewall = sidewall;
    segments.push({ stage: "bend", angle_deg: Number(b.angle_deg) || 0, radius_ft, tension_lb: T_out, sidewall_lb_per_ft: sidewall });
    tension = T_out;
  }

  // Add resistive tension along any remaining straight portion after bends.
  const remaining = Math.max(0, run_length_ft - straight_run_ft);
  if (remaining > 0) {
    tension += mu * cable_weight_lb_per_ft * remaining;
    segments.push({ stage: "trailing-straight", tension_lb: tension });
  }

  return {
    tension_lb: tension,
    max_sidewall_lb_per_ft: maxSidewall,
    tension_flag: tension > 5000 ? "exceeds 5000 lb head-end limit" : "ok",
    sidewall_flag: maxSidewall > 1000 ? "exceeds 1000 lb/ft sidewall limit" : "ok",
    mu,
    segments,
  };
}

export const pullingTensionExample = {
  inputs: {
    cable_weight_lb_per_ft: 1.5,
    run_length_ft: 200,
    lubricant: "polymer",
    straight_run_ft: 100,
    bends: [{ angle_deg: 90, radius_ft: 2 }],
  },
  expected: { tension_flag: "ok", sidewall_flag: "ok" },
};

// --- Utility 126: Cable Bend Radius Minimum ---
//
// Minimum inside bend radius as a multiple of cable OD. Manufacturer-attributed
// table mirrored in data/electrical/cable-bend-radius.json.

export const CABLE_BEND_RADIUS_TABLE = {
  THHN: { multiple: 8, attribution: "Southwire technical bulletin (single conductor, no shield)" },
  XHHW: { multiple: 8, attribution: "Southwire technical bulletin (single conductor, no shield)" },
  MC: { multiple: 7, attribution: "AFC Cable Systems technical reference" },
  control: { multiple: 6, attribution: "Belden control cable bulletin" },
  coax: { multiple: 10, attribution: "Belden coax bulletin (rigid runs)" },
  fiber: { multiple: 20, attribution: "Corning fiber installation guide (loaded)" },
};

// dims: in { cable_type: dimensionless, cable_od_in: L } out: { min_bend_radius_in: L }
export function computeBendRadius({ cable_type, cable_od_in }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const row = CABLE_BEND_RADIUS_TABLE[cable_type];
  if (!row) return { error: "Unknown cable type." };
  if (!(cable_od_in > 0)) return { error: "Cable OD must be positive." };
  return {
    multiple: row.multiple,
    min_radius_in: row.multiple * cable_od_in,
    attribution: row.attribution,
  };
}

export const bendRadiusExample = {
  inputs: { cable_type: "THHN", cable_od_in: 0.5 },
  expected: { min_radius_in: 4 },
};

// --- Utility 127: Power Factor Correction Capacitor ---

// dims: in { kW: M L^2 T^-3, pf1: dimensionless, pf2: dimensionless, system_V: M L^2 T^-3 I^-1, phase: dimensionless } out: { kvar: M L^2 T^-3, capacitor_uF: T^4 I^2 M^-1 L^-2 }
export function computePFCorrection({ kW, pf1, pf2, system_V, phase = "single" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(kW > 0)) return { error: "Real power must be positive." };
  if (!(pf1 > 0 && pf1 <= 1) || !(pf2 > 0 && pf2 <= 1)) return { error: "Power factors must be between 0 and 1." };
  if (pf2 <= pf1) return { error: "Target PF must exceed existing PF." };
  if (!(system_V > 0)) return { error: "Voltage must be positive." };
  const tan1 = Math.tan(Math.acos(pf1));
  const tan2 = Math.tan(Math.acos(pf2));
  const kVAR = kW * (tan1 - tan2);
  // Capacitance from Q = V^2 * 2*pi*f*C; for three-phase use line-to-line and
  // factor of three across legs (per-leg C = kVAR_total / (3 * 2*pi*f * V_LN^2)).
  const f = 60;
  const omega = 2 * Math.PI * f;
  let C_uF;
  if (phase === "three") {
    const V_LN = system_V / Math.sqrt(3);
    C_uF = (kVAR * 1000) / (3 * omega * V_LN * V_LN) * 1e6;
  } else {
    C_uF = (kVAR * 1000) / (omega * system_V * system_V) * 1e6;
  }
  return { kVAR, capacitance_uF: C_uF };
}

export const pfCorrectionExample = {
  inputs: { kW: 100, pf1: 0.75, pf2: 0.95, system_V: 480, phase: "three" },
  expected: { kVAR_min: 50, kVAR_max: 60 },
};

// --- Utility 128: Phase Balance Across Panels ---

// dims: in { circuits: dimensionless, threshold_percent: dimensionless } out: { imbalance_percent: dimensionless, recommendations: dimensionless }
export function computePhaseBalance({ circuits = [], threshold_percent = 10 }) {
  if (!Array.isArray(circuits) || circuits.length === 0) return { error: "Provide at least one circuit." };
  const totals = { A: 0, B: 0, C: 0 };
  for (const c of circuits) {
    const phase = c.phase;
    const load = Number(c.load_W) || 0;
    if (!totals.hasOwnProperty(phase)) return { error: "Unknown phase tag: " + phase };
    if (load < 0) return { error: "Loads must be non-negative." };
    totals[phase] += load;
  }
  const values = [totals.A, totals.B, totals.C];
  const avg = (values[0] + values[1] + values[2]) / 3;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const imbalance = avg > 0 ? ((max - min) / avg) * 100 : 0;

  // Greedy swap: while above threshold, move the smallest circuit on the
  // heaviest phase to the lightest phase.
  const swaps = [];
  const work = circuits.map((c, i) => ({ ...c, _i: i, load_W: Number(c.load_W) || 0 }));
  const recompute = () => {
    const t = { A: 0, B: 0, C: 0 };
    for (const c of work) t[c.phase] += c.load_W;
    return t;
  };
  let safety = 50;
  let cur = recompute();
  let curImb = avg > 0 ? ((Math.max(cur.A, cur.B, cur.C) - Math.min(cur.A, cur.B, cur.C)) / avg) * 100 : 0;
  while (curImb > threshold_percent && safety-- > 0) {
    const heaviest = ["A", "B", "C"].reduce((a, b) => cur[a] >= cur[b] ? a : b);
    const lightest = ["A", "B", "C"].reduce((a, b) => cur[a] <= cur[b] ? a : b);
    if (heaviest === lightest) break;
    // Find a circuit on heaviest whose load is at most half the current gap.
    const gap = cur[heaviest] - cur[lightest];
    const candidates = work.filter((c) => c.phase === heaviest && c.load_W <= gap / 2 && c.load_W > 0);
    if (candidates.length === 0) break;
    const move = candidates.reduce((a, b) => a.load_W >= b.load_W ? a : b);
    move.phase = lightest;
    swaps.push({ circuit: move._i, from: heaviest, to: lightest, load_W: move.load_W });
    cur = recompute();
    curImb = avg > 0 ? ((Math.max(cur.A, cur.B, cur.C) - Math.min(cur.A, cur.B, cur.C)) / avg) * 100 : 0;
  }

  return {
    totals,
    average_W: avg,
    imbalance_percent: imbalance,
    final_imbalance_percent: curImb,
    swaps,
  };
}

export const phaseBalanceExample = {
  inputs: {
    circuits: [
      { phase: "A", load_W: 1500 },
      { phase: "A", load_W: 800 },
      { phase: "B", load_W: 600 },
      { phase: "C", load_W: 700 },
    ],
    threshold_percent: 10,
  },
};

// --- Utility 129: Branch Circuit Voltage Drop With Multiple Loads ---

// dims: in { args: dimensionless } out: { drop_V: M L^2 T^-3 I^-1, drop_percent: dimensionless }
export function computeMultiLoadVoltageDrop({
  material = "copper",
  awg = "12",
  source_voltage_V = 120,
  loads = [],
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(loads) || loads.length === 0) return { error: "Provide at least one load." };
  const knownAwg = ["18","16","14","12","10","8","6","4","2","1","1/0","2/0","3/0","4/0"];
  if (!knownAwg.includes(awg)) return { error: "Unknown AWG." };
  const r_per_kft = conductorResistancePerKft({ material, awg, temperature_C: 25 });
  if (!Number.isFinite(r_per_kft)) return { error: "Unknown conductor size or material." };
  // Sort by distance ascending.
  const ordered = [...loads].map((l) => ({ distance_ft: Number(l.distance_ft) || 0, current_A: Number(l.current_A) || 0 })).sort((a, b) => a.distance_ft - b.distance_ft);
  // Cumulative current downstream of each segment determines I*R drop on it.
  // Walk from the source: at each segment, current = sum of loads at or beyond.
  let drop = 0;
  const perLoad = [];
  let prev_ft = 0;
  let drops_seen = 0;
  for (let i = 0; i < ordered.length; i++) {
    const seg_ft = ordered[i].distance_ft - prev_ft;
    // Current in this segment = sum of loads at distance >= ordered[i].distance_ft (i.e., this load and all further).
    let I_seg = 0;
    for (let j = i; j < ordered.length; j++) I_seg += ordered[j].current_A;
    // Round-trip resistance: 2 * r_per_kft for single-phase; assume single here.
    const seg_drop = I_seg * (2 * r_per_kft) * (seg_ft / 1000);
    drop += seg_drop;
    drops_seen += seg_drop;
    perLoad.push({
      distance_ft: ordered[i].distance_ft,
      current_A: ordered[i].current_A,
      voltage_at_load_V: source_voltage_V - drop,
      cumulative_drop_V: drop,
    });
    prev_ft = ordered[i].distance_ft;
  }
  const worst = perLoad[perLoad.length - 1];
  return {
    worst_drop_V: worst.cumulative_drop_V,
    worst_voltage_V: worst.voltage_at_load_V,
    worst_percent: source_voltage_V > 0 ? (worst.cumulative_drop_V / source_voltage_V) * 100 : null,
    per_load: perLoad,
  };
}

export const multiLoadVDExample = {
  inputs: {
    material: "copper",
    awg: "12",
    source_voltage_V: 120,
    loads: [
      { distance_ft: 50, current_A: 5 },
      { distance_ft: 100, current_A: 10 },
    ],
  },
};

// --- Utility 130: Low-Voltage DC Drop ---

export const LV_DC_TOLERANCE_TABLE = {
  led_lighting: { percent: 3, note: "LED driver tolerance" },
  marine: { percent: 10, note: "ABYC marine non-critical" },
  marine_critical: { percent: 3, note: "ABYC marine critical (panel feeders, electronics)" },
  rv: { percent: 5, note: "RV industry general practice" },
  audio: { percent: 2, note: "12 V audio amplifier rails" },
};

// dims: in { system_V: M L^2 T^-3 I^-1, awg: dimensionless, run_length_ft: L, current_A: I, application: dimensionless } out: { drop_V: M L^2 T^-3 I^-1, drop_percent: dimensionless }
export function computeLVDCDrop({ system_V = 12, awg = "10", run_length_ft = 0, current_A = 0, application = "led_lighting", device_min_voltage_V = null, worst_case_source_V = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(system_V > 0)) return { error: "System voltage must be positive." };
  if (!(run_length_ft >= 0)) return { error: "Run length must be non-negative." };
  if (!(current_A >= 0)) return { error: "Current must be non-negative." };
  const knownAwg = ["18","16","14","12","10","8","6","4","2","1","1/0","2/0","3/0","4/0"];
  if (!knownAwg.includes(awg)) return { error: "Unknown AWG." };
  const r_per_kft = conductorResistancePerKft({ material: "copper", awg, temperature_C: 25 });
  if (!Number.isFinite(r_per_kft)) return { error: "Unknown AWG." };
  const drop_V = current_A * (2 * r_per_kft) * (run_length_ft / 1000);
  const percent = (drop_V / system_V) * 100;
  const tol = LV_DC_TOLERANCE_TABLE[application];
  const acceptable = tol ? percent <= tol.percent : null;

  // spec-v28 EN.1: fire-alarm NAC end-of-line voltage check. When a device
  // minimum operating voltage is supplied, report the end-of-line voltage at
  // the worst-case (battery-low) source and a pass/fail against the listed
  // device minimum. Default (no device minimum) reproduces the prior output.
  let nac = null;
  if (device_min_voltage_V !== null && device_min_voltage_V !== undefined && device_min_voltage_V !== "") {
    const dmin = Number(device_min_voltage_V);
    const src = (worst_case_source_V !== null && worst_case_source_V !== undefined && worst_case_source_V !== "") ? Number(worst_case_source_V) : system_V;
    if (!(dmin > 0)) return { error: "Device minimum voltage must be positive." };
    if (!(src > 0)) return { error: "Worst-case source voltage must be positive." };
    const end_of_line_V = src - drop_V;
    nac = { worst_case_source_V: src, device_min_voltage_V: dmin, end_of_line_V, pass: end_of_line_V >= dmin };
  }

  return {
    drop_V,
    percent,
    application_tolerance_percent: tol ? tol.percent : null,
    acceptable,
    application_note: tol ? tol.note : null,
    nac,
  };
}

export const lvDCDropExample = {
  inputs: { system_V: 12, awg: "10", run_length_ft: 20, current_A: 10, application: "led_lighting" },
};

// --- Utility 131: PoE Budget and Run Distance ---
//
// Cable resistance per category (loop, ohms per 100 m at 20 C) and per-class
// PSE source power per IEEE 802.3 publication. Mirrored in
// data/electrical/poe-classes.json.

export const POE_CABLE_OHMS_PER_100M = {
  Cat5e: 9.38,
  Cat6: 8.0,
  Cat6A: 6.5,
};

export const POE_CLASSES = {
  af: { pse_W: 15.4, pd_min_W: 12.95, label: "802.3af Type 1" },
  at: { pse_W: 30.0, pd_min_W: 25.5, label: "802.3at Type 2" },
  bt3: { pse_W: 60.0, pd_min_W: 51.0, label: "802.3bt Type 3" },
  bt4: { pse_W: 90.0, pd_min_W: 71.3, label: "802.3bt Type 4" },
};

// dims: in { poe_class: dimensionless, category: dimensionless, run_length_ft: L, ambient_C: T } out: { budget_W: M L^2 T^-3, available_W: M L^2 T^-3 }
export function computePoEBudget({ poe_class = "at", category = "Cat6", run_length_ft = 100, ambient_C = 25 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cls = POE_CLASSES[poe_class];
  if (!cls) return { error: "Unknown PoE class." };
  const ohmsPer100m = POE_CABLE_OHMS_PER_100M[category];
  if (!Number.isFinite(ohmsPer100m)) return { error: "Unknown cable category." };
  if (!(run_length_ft >= 0)) return { error: "Run length must be non-negative." };
  // Convert: 100 m = 328.084 ft. Resistance for the run length.
  const length_m = run_length_ft / 3.28084;
  // Temperature correction: copper alpha 0.00393 per K; cable rated at 20 C.
  const tempFactor = 1 + 0.00393 * (ambient_C - 20);
  const loopOhms = (ohmsPer100m * (length_m / 100)) * tempFactor;
  // Source voltage per class (PSE port voltage minimums per IEEE):
  const v_source = poe_class === "af" ? 44 : 50;
  // Power-out budget at PSE = pse_W; current at PSE = pse_W / v_source.
  const I = cls.pse_W / v_source;
  const drop_V = I * loopOhms;
  const v_pd = v_source - drop_V;
  const power_loss_W = I * I * loopOhms;
  const pd_W = cls.pse_W - power_loss_W;
  let flag = "green";
  if (pd_W < cls.pd_min_W) flag = "red";
  else if (pd_W < cls.pd_min_W * 1.1) flag = "amber";
  return {
    pse_W: cls.pse_W,
    pd_min_W: cls.pd_min_W,
    pd_available_W: pd_W,
    voltage_at_pd_V: v_pd,
    cable_loss_W: power_loss_W,
    flag,
    label: cls.label,
  };
}

export const poeBudgetExample = {
  inputs: { poe_class: "at", category: "Cat6", run_length_ft: 200, ambient_C: 25 },
};

// --- v3 renderers ---

function renderPullingTension(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Capstan equation T_out = T_in * exp(mu * theta) accumulated per bend; sidewall pressure approximated as T / R. See docs/derivations.md.";
  attachExampleButton(inputRegion, () => fillExample(pullingTensionExample.inputs));

  const w = makeNumber("Cable weight (lb/ft)", "pt-w", { step: "any", min: "0" });
  const len = makeNumber("Total run length (ft)", "pt-len", { step: "any", min: "0" });
  const lub = makeSelect("Lubricant", "pt-lub", [
    { value: "dry", label: "Dry (mu 0.50)" },
    { value: "wax", label: "Wax (mu 0.35)" },
    { value: "polymer", label: "Polymer (mu 0.20)", selected: true },
  ]);
  const straight = makeNumber("Straight run before bends (ft)", "pt-straight", { step: "any", min: "0" });
  const b1ang = makeNumber("Bend 1 angle (deg)", "pt-b1a", { step: "any", min: "0" });
  const b1rad = makeNumber("Bend 1 radius (ft)", "pt-b1r", { step: "any", min: "0" });
  for (const f of [w, len, lub, straight, b1ang, b1rad]) inputRegion.appendChild(f.wrap);

  const oT = makeOutputLine(outputRegion, "Head-end tension", "pt-out-t");
  const oS = makeOutputLine(outputRegion, "Max sidewall pressure", "pt-out-s");
  const oFlag = makeOutputLine(outputRegion, "Status", "pt-out-flag");

  function fillExample(v) {
    w.input.value = v.cable_weight_lb_per_ft; len.input.value = v.run_length_ft; lub.select.value = v.lubricant;
    straight.input.value = v.straight_run_ft;
    b1ang.input.value = v.bends[0]?.angle_deg ?? "";
    b1rad.input.value = v.bends[0]?.radius_ft ?? "";
    update();
  }
  const update = debounce(() => {
    const bends = [];
    if (Number(b1ang.input.value) > 0 && Number(b1rad.input.value) > 0) {
      bends.push({ angle_deg: Number(b1ang.input.value), radius_ft: Number(b1rad.input.value) });
    }
    const r = computePullingTension({
      cable_weight_lb_per_ft: Number(w.input.value) || 0,
      run_length_ft: Number(len.input.value) || 0,
      lubricant: lub.select.value,
      straight_run_ft: Number(straight.input.value) || 0,
      bends,
    });
    if (r.error) { oT.textContent = r.error; oS.textContent = "-"; oFlag.textContent = "-"; return; }
    oT.textContent = fmt(r.tension_lb, 0) + " lb";
    oS.textContent = fmt(r.max_sidewall_lb_per_ft, 0) + " lb/ft";
    oFlag.textContent = r.tension_flag + "; sidewall " + r.sidewall_flag;
  }, DEBOUNCE_MS);

  for (const el of [w.input, len.input, lub.select, straight.input, b1ang.input, b1rad.input]) el.addEventListener("input", update);
}

function renderBendRadius(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Manufacturer technical bulletins (Southwire, AFC Cable, Belden, Corning). Minimum inside bend radius as a multiple of cable OD.";
  attachExampleButton(inputRegion, () => fillExample(bendRadiusExample.inputs));

  const t = makeSelect("Cable type", "br3-t", Object.keys(CABLE_BEND_RADIUS_TABLE).map((k) => ({ value: k, label: k })));
  const od = makeNumber("Cable OD (in)", "br3-od", { step: "any", min: "0" });
  for (const f of [t, od]) inputRegion.appendChild(f.wrap);

  const oR = makeOutputLine(outputRegion, "Minimum inside bend radius", "br3-out-r");
  const oM = makeOutputLine(outputRegion, "Multiple", "br3-out-m");
  const oA = makeOutputLine(outputRegion, "Source", "br3-out-a");

  function fillExample(v) { t.select.value = v.cable_type; od.input.value = v.cable_od_in; update(); }
  const update = debounce(() => {
    const r = computeBendRadius({ cable_type: t.select.value, cable_od_in: Number(od.input.value) || 0 });
    if (r.error) { oR.textContent = r.error; oM.textContent = "-"; oA.textContent = "-"; return; }
    oR.textContent = fmt(r.min_radius_in, 2) + " in";
    oM.textContent = String(r.multiple) + "x OD";
    oA.textContent = r.attribution;
  }, DEBOUNCE_MS);

  for (const el of [t.select, od.input]) el.addEventListener("input", update);
}

function renderPFCorrection(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: kVAR = kW * (tan(acos(PF1)) - tan(acos(PF2))). Capacitance from Q = V^2 * 2*pi*f*C at 60 Hz.";
  attachExampleButton(inputRegion, () => fillExample(pfCorrectionExample.inputs));

  const kW = makeNumber("Real power (kW)", "pfc-kw", { step: "any", min: "0" });
  const pf1 = makeNumber("Existing PF (0-1)", "pfc-pf1", { step: "any", min: "0", max: "1" });
  const pf2 = makeNumber("Target PF (0-1)", "pfc-pf2", { step: "any", min: "0", max: "1" });
  const v = makeNumber("System voltage (V)", "pfc-v", { step: "any", min: "0" });
  const phase = makeSelect("Phase", "pfc-phase", [
    { value: "single", label: "Single phase" },
    { value: "three", label: "Three phase", selected: true },
  ]);
  for (const f of [kW, pf1, pf2, v, phase]) inputRegion.appendChild(f.wrap);

  const oQ = makeOutputLine(outputRegion, "Required kVAR", "pfc-out-q");
  const oC = makeOutputLine(outputRegion, "Capacitance per leg", "pfc-out-c");

  function fillExample(x) { kW.input.value = x.kW; pf1.input.value = x.pf1; pf2.input.value = x.pf2; v.input.value = x.system_V; phase.select.value = x.phase; update(); }
  const update = debounce(() => {
    const r = computePFCorrection({
      kW: Number(kW.input.value) || 0,
      pf1: Number(pf1.input.value) || 0,
      pf2: Number(pf2.input.value) || 0,
      system_V: Number(v.input.value) || 0,
      phase: phase.select.value,
    });
    if (r.error) { oQ.textContent = r.error; oC.textContent = "-"; return; }
    oQ.textContent = fmt(r.kVAR, 2) + " kVAR";
    oC.textContent = fmt(r.capacitance_uF, 2) + " uF";
  }, DEBOUNCE_MS);
  for (const el of [kW.input, pf1.input, pf2.input, v.input, phase.select]) el.addEventListener("input", update);
}

function renderPhaseBalance(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Imbalance percent = (max - min) / average * 100. Greedy swap rebalances by moving the smallest fitting circuit from heaviest to lightest phase.";
  attachExampleButton(inputRegion, () => fillExample(phaseBalanceExample.inputs));

  const list = document.createElement("div");
  inputRegion.appendChild(list);
  const rows = [];
  function addRow(phaseVal = "A", loadVal = "") {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const circuitNum = rows.length + 1;
    const ph = document.createElement("select");
    ph.setAttribute("aria-label", "Phase for circuit " + circuitNum);
    for (const v of ["A", "B", "C"]) {
      const o = document.createElement("option"); o.value = v; o.textContent = "Phase " + v; if (v === phaseVal) o.selected = true; ph.appendChild(o);
    }
    const ld = document.createElement("input"); ld.type = "number"; ld.step = "any"; ld.min = "0"; ld.inputMode = "decimal"; ld.placeholder = "Load (W)"; ld.value = loadVal; ld.setAttribute("aria-label", "Load in watts for circuit " + circuitNum);
    wrap.appendChild(ph); wrap.appendChild(ld);
    list.appendChild(wrap);
    // Defer the `update` reference: addRow() runs in the for-loop below
    // before `const update` is initialized, so passing `update` directly
    // throws a temporal-dead-zone ReferenceError that crashes the render.
    // The arrow wrapper only reads `update` when the event fires (after
    // render completes), by which point it is defined.
    ph.addEventListener("input", () => update()); ld.addEventListener("input", () => update());
    rows.push({ ph, ld });
  }
  for (let i = 0; i < 4; i++) addRow();

  const thr = makeNumber("Imbalance threshold (%)", "pb-thr", { step: "any", min: "0", value: "10" });
  thr.input.value = "10";
  inputRegion.appendChild(thr.wrap);

  const oTot = makeOutputLine(outputRegion, "Per-phase totals (A/B/C)", "pb-out-tot");
  const oImb = makeOutputLine(outputRegion, "Initial imbalance", "pb-out-imb");
  const oFinal = makeOutputLine(outputRegion, "After swaps", "pb-out-final");
  const oSwaps = makeOutputLine(outputRegion, "Suggested swaps", "pb-out-swaps");

  function fillExample(x) {
    for (let i = 0; i < rows.length; i++) {
      const c = x.circuits[i];
      if (c) { rows[i].ph.value = c.phase; rows[i].ld.value = c.load_W; }
      else { rows[i].ld.value = ""; }
    }
    thr.input.value = x.threshold_percent;
    update();
  }
  const update = debounce(() => {
    const circuits = rows.map((r) => ({ phase: r.ph.value, load_W: Number(r.ld.value) || 0 })).filter((c) => c.load_W > 0);
    if (circuits.length === 0) {
      oTot.textContent = "-"; oImb.textContent = "-"; oFinal.textContent = "-"; oSwaps.textContent = "-";
      return;
    }
    const r = computePhaseBalance({ circuits, threshold_percent: Number(thr.input.value) || 10 });
    if (r.error) { oTot.textContent = r.error; oImb.textContent = "-"; oFinal.textContent = "-"; oSwaps.textContent = "-"; return; }
    oTot.textContent = fmt(r.totals.A, 0) + " / " + fmt(r.totals.B, 0) + " / " + fmt(r.totals.C, 0) + " W";
    oImb.textContent = fmt(r.imbalance_percent, 2) + " %";
    oFinal.textContent = fmt(r.final_imbalance_percent, 2) + " %";
    oSwaps.textContent = r.swaps.length === 0 ? "none" : r.swaps.map((s) => "circuit " + s.circuit + " " + s.from + "->" + s.to).join("; ");
  }, DEBOUNCE_MS);
}

function renderMultiLoadVD(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Cumulative I*R drop accumulated per segment using single-phase round-trip resistance per the Voltage Drop helper. See docs/derivations.md.";
  attachExampleButton(inputRegion, () => fillExample(multiLoadVDExample.inputs));

  const mat = makeSelect("Conductor material", "ml-mat", [
    { value: "copper", label: "Copper", selected: true }, { value: "aluminum", label: "Aluminum" },
  ]);
  const aw = makeSelect("AWG", "ml-awg", awgOptions());
  const sv = makeNumber("Source voltage (V)", "ml-sv", { step: "any", min: "0", value: "120" });
  sv.input.value = "120";
  for (const f of [mat, aw, sv]) inputRegion.appendChild(f.wrap);

  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const d = document.createElement("input"); d.type = "number"; d.step = "any"; d.min = "0"; d.inputMode = "decimal"; d.placeholder = "Distance (ft)"; d.setAttribute("aria-label", "Run " + (i + 1) + " distance (ft)");
    const c = document.createElement("input"); c.type = "number"; c.step = "any"; c.min = "0"; c.inputMode = "decimal"; c.placeholder = "Load current (A)"; c.setAttribute("aria-label", "Run " + (i + 1) + " load current (A)");
    wrap.appendChild(d); wrap.appendChild(c); list.appendChild(wrap);
    d.addEventListener("input", update); c.addEventListener("input", update);
    rows.push({ d, c });
  }

  const oW = makeOutputLine(outputRegion, "Worst-case drop", "ml-out-w");
  const oV = makeOutputLine(outputRegion, "Worst voltage at load", "ml-out-v");
  const oP = makeOutputLine(outputRegion, "Worst percent", "ml-out-p");

  function fillExample(v) {
    mat.select.value = v.material; aw.select.value = v.awg; sv.input.value = v.source_voltage_V;
    for (let i = 0; i < rows.length; i++) {
      const ld = v.loads[i];
      if (ld) { rows[i].d.value = ld.distance_ft; rows[i].c.value = ld.current_A; }
      else { rows[i].d.value = ""; rows[i].c.value = ""; }
    }
    update();
  }
  function update() {
    const loads = rows.map((r) => ({ distance_ft: Number(r.d.value) || 0, current_A: Number(r.c.value) || 0 })).filter((l) => l.distance_ft > 0);
    if (loads.length === 0) { oW.textContent = "-"; oV.textContent = "-"; oP.textContent = "-"; return; }
    const r = computeMultiLoadVoltageDrop({
      material: mat.select.value, awg: aw.select.value, source_voltage_V: Number(sv.input.value) || 120, loads,
    });
    if (r.error) { oW.textContent = r.error; oV.textContent = "-"; oP.textContent = "-"; return; }
    oW.textContent = fmt(r.worst_drop_V, 3) + " V";
    oV.textContent = fmt(r.worst_voltage_V, 2) + " V";
    oP.textContent = fmt(r.worst_percent, 2) + " %";
  }
}

function renderLVDCDrop(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: I*R round-trip drop. Application thresholds are widely-cited engineering benchmarks (LED 3 percent; ABYC marine 3/10 percent; RV 5 percent; audio 2 percent).";
  attachExampleButton(inputRegion, () => fillExample(lvDCDropExample.inputs));

  const sv = makeSelect("System voltage", "lv-sv", [
    { value: "12", label: "12 V" }, { value: "24", label: "24 V" }, { value: "48", label: "48 V" },
  ]);
  const aw = makeSelect("AWG", "lv-awg", awgOptions());
  const len = makeNumber("Run length one-way (ft)", "lv-len", { step: "any", min: "0" });
  const cur = makeNumber("Current (A)", "lv-cur", { step: "any", min: "0" });
  const app = makeSelect("Application", "lv-app", Object.keys(LV_DC_TOLERANCE_TABLE).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  // spec-v28 EN.1: optional fire-alarm NAC end-of-line voltage check.
  const dmin = makeNumber("Device min voltage (V, NAC, optional)", "lv-dmin", { step: "any", min: "0" });
  const wsrc = makeNumber("Worst-case source (V, battery low, optional)", "lv-wsrc", { step: "any", min: "0" });
  for (const f of [sv, aw, len, cur, app, dmin, wsrc]) inputRegion.appendChild(f.wrap);

  const oD = makeOutputLine(outputRegion, "Drop", "lv-out-d");
  const oP = makeOutputLine(outputRegion, "Percent", "lv-out-p");
  const oA = makeOutputLine(outputRegion, "Application threshold", "lv-out-a");
  const oF = makeOutputLine(outputRegion, "Status", "lv-out-f");
  const oNac = makeOutputLine(outputRegion, "NAC end-of-line", "lv-out-nac");

  function fillExample(v) { sv.select.value = String(v.system_V); aw.select.value = v.awg; len.input.value = v.run_length_ft; cur.input.value = v.current_A; app.select.value = v.application; dmin.input.value = ""; wsrc.input.value = ""; update(); }
  const update = debounce(() => {
    const r = computeLVDCDrop({
      system_V: Number(sv.select.value) || 12, awg: aw.select.value,
      run_length_ft: Number(len.input.value) || 0, current_A: Number(cur.input.value) || 0,
      application: app.select.value,
      device_min_voltage_V: dmin.input.value === "" ? null : Number(dmin.input.value),
      worst_case_source_V: wsrc.input.value === "" ? null : Number(wsrc.input.value),
    });
    if (r.error) { oD.textContent = r.error; oP.textContent = "-"; oA.textContent = "-"; oF.textContent = "-"; oNac.textContent = "-"; return; }
    oD.textContent = fmt(r.drop_V, 3) + " V";
    oP.textContent = fmt(r.percent, 2) + " %";
    oA.textContent = fmt(r.application_tolerance_percent, 0) + " % - " + (r.application_note || "");
    oF.textContent = r.acceptable ? "within tolerance" : "exceeds tolerance";
    oNac.textContent = r.nac ? (fmt(r.nac.end_of_line_V, 2) + " V at the device vs " + fmt(r.nac.device_min_voltage_V, 1) + " V min - " + (r.nac.pass ? "PASS" : "FAIL")) : "(enter device minimum for NAC check)";
  }, DEBOUNCE_MS);
  for (const el of [sv.select, aw.select, len.input, cur.input, app.select, dmin.input, wsrc.input]) el.addEventListener("input", update);
}

function renderPoEBudget(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: IEEE 802.3 PoE classes (cited by name only). Cable resistance from manufacturer category benchmarks; copper alpha 0.00393 per K applied for ambient correction.";
  attachExampleButton(inputRegion, () => fillExample(poeBudgetExample.inputs));

  const cls = makeSelect("PoE class", "poe-cls", [
    { value: "af", label: "802.3af Type 1 (15.4 W)" },
    { value: "at", label: "802.3at Type 2 (30 W)", selected: true },
    { value: "bt3", label: "802.3bt Type 3 (60 W)" },
    { value: "bt4", label: "802.3bt Type 4 (90 W)" },
  ]);
  const cat = makeSelect("Cable category", "poe-cat", [
    { value: "Cat5e", label: "Cat5e" }, { value: "Cat6", label: "Cat6", selected: true }, { value: "Cat6A", label: "Cat6A" },
  ]);
  const len = makeNumber("Run length (ft)", "poe-len", { step: "any", min: "0", value: "100" });
  len.input.value = "100";
  const amb = makeNumber("Ambient temp (C)", "poe-amb", { step: "any", value: "25" });
  amb.input.value = "25";
  for (const f of [cls, cat, len, amb]) inputRegion.appendChild(f.wrap);

  const oP = makeOutputLine(outputRegion, "Power available at PD", "poe-out-p");
  const oV = makeOutputLine(outputRegion, "Voltage at PD", "poe-out-v");
  const oL = makeOutputLine(outputRegion, "Cable I^2*R loss", "poe-out-l");
  const oF = makeOutputLine(outputRegion, "Status", "poe-out-f");

  function fillExample(v) { cls.select.value = v.poe_class; cat.select.value = v.category; len.input.value = v.run_length_ft; amb.input.value = v.ambient_C; update(); }
  const update = debounce(() => {
    const r = computePoEBudget({
      poe_class: cls.select.value, category: cat.select.value,
      run_length_ft: Number(len.input.value) || 0, ambient_C: Number(amb.input.value) || 25,
    });
    if (r.error) { oP.textContent = r.error; oV.textContent = "-"; oL.textContent = "-"; oF.textContent = "-"; return; }
    oP.textContent = fmt(r.pd_available_W, 2) + " W (min " + fmt(r.pd_min_W, 2) + " W)";
    oV.textContent = fmt(r.voltage_at_pd_V, 2) + " V";
    oL.textContent = fmt(r.cable_loss_W, 2) + " W";
    oF.textContent = r.flag.toUpperCase();
  }, DEBOUNCE_MS);
  for (const el of [cls.select, cat.select, len.input, amb.input]) el.addEventListener("input", update);
}

// =====================================================================
// v7 Group A extensions (utilities 234 through 237)
// =====================================================================

// --- 234: Transformer kVA Sizing and FLA ---
//
// Total connected kVA from a load list (each item kVA or watts + pf), then
// recommended transformer kVA from the standard ANSI/IEEE step series, plus
// primary and secondary FLA = kVA * 1000 / (V * sqrt(phases)).

export const TRANSFORMER_KVA_STEPS = [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000];

// dims: in { args: dimensionless } out: { kva: M L^2 T^-3, recommended_kva: M L^2 T^-3 }
export function computeTransformerKvaSizing({
  loads = [],
  primary_V = 480,
  secondary_V = 208,
  phase = "three",
  growth_reserve_pct = 25,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(loads) || loads.length === 0) return { error: "Provide at least one load." };
  if (!(primary_V > 0)) return { error: "Primary voltage must be positive." };
  if (!(secondary_V > 0)) return { error: "Secondary voltage must be positive." };
  const sqrt_phases = phase === "three" ? Math.sqrt(3) : 1;
  let connected_kVA = 0;
  for (const ln of loads) {
    const pf = Number(ln.pf) > 0 && Number(ln.pf) <= 1 ? Number(ln.pf) : 1;
    let kVA;
    if (ln.kVA !== undefined && ln.kVA !== null) kVA = Number(ln.kVA);
    else if (ln.watts !== undefined && ln.watts !== null) kVA = Number(ln.watts) / 1000 / pf;
    else return { error: "Each load needs kVA or watts." };
    if (!(kVA >= 0)) return { error: "Load kVA must be non-negative." };
    connected_kVA += kVA;
  }
  const reserve = Math.max(0, Number(growth_reserve_pct) || 0) / 100;
  const required_kVA = connected_kVA * (1 + reserve);
  const recommended_kVA = TRANSFORMER_KVA_STEPS.find((s) => s >= required_kVA) ?? TRANSFORMER_KVA_STEPS[TRANSFORMER_KVA_STEPS.length - 1];
  const fla_primary_A = (recommended_kVA * 1000) / (primary_V * sqrt_phases);
  const fla_secondary_A = (recommended_kVA * 1000) / (secondary_V * sqrt_phases);
  return { connected_kVA, required_kVA, recommended_kVA, fla_primary_A, fla_secondary_A };
}

export const transformerKvaSizingExample = {
  inputs: {
    loads: [{ kVA: 25 }, { kVA: 18 }, { watts: 7500, pf: 0.85 }, { kVA: 15 }],
    primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 25,
  },
};

// --- 235: Short-Circuit Current at Panel (Bussmann Point-to-Point Method) ---
//
// I_sca_secondary = (kVA * 1000) / (V * sqrt(phases) * Z_pct/100)
// f = (1.732 * L * I_sca_sec) / (n * C * V)   for 3-phase
// f = (2 * L * I_sca_sec) / (n * C * V)       for 1-phase
// M = 1 / (1 + f)
// I_sca_panel = I_sca_sec * M

const POINT_TO_POINT_SQRT3 = 1.732;

// dims: in { args: dimensionless } out: { isca_A: I, M: dimensionless }
export function computeShortCircuitPP({
  utility_kVA = 0,
  utility_Z_pct = 0,
  secondary_V = 0,
  phase = "three",
  C_value = 0,
  length_ft = 0,
  parallel_sets = 1,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(utility_kVA > 0)) return { error: "Utility transformer kVA must be positive." };
  if (!(utility_Z_pct > 0)) return { error: "Utility transformer %Z must be positive." };
  if (!(secondary_V > 0)) return { error: "Secondary voltage must be positive." };
  if (!(C_value > 0)) return { error: "Conductor C-value must be positive." };
  if (!(length_ft >= 0)) return { error: "Run length must be non-negative." };
  if (!(parallel_sets >= 1)) return { error: "Parallel sets must be >= 1." };
  const sqrt_phases = phase === "three" ? POINT_TO_POINT_SQRT3 : 1;
  const z_factor = utility_Z_pct / 100;
  const I_sca_secondary = (utility_kVA * 1000) / (secondary_V * sqrt_phases * z_factor);
  const num_factor = phase === "three" ? POINT_TO_POINT_SQRT3 : 2;
  const f = (num_factor * length_ft * I_sca_secondary) / (parallel_sets * C_value * secondary_V);
  const M = 1 / (1 + f);
  const I_sca_panel = I_sca_secondary * M;
  return { I_sca_secondary_A: I_sca_secondary, f_factor: f, M_factor: M, I_sca_panel_A: I_sca_panel };
}

export const shortCircuitPPExample = {
  inputs: {
    utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three",
    // C-value for 500 kcmil copper in steel conduit, 600V (engineering-practice value)
    C_value: 22185, length_ft: 100, parallel_sets: 1,
  },
};

// --- 236: Generator Sizing for Motor Starting ---
//
// Required generator kW for steady run = sum of running kW + non-motor steady.
// Required kVA for the worst-case motor start under the 30% voltage-dip
// criterion: kVA_gen >= starting_kVA / dip_factor where dip_factor = 0.30
// (typical 30% voltage-dip criterion per NEMA MG-1 transient guidance).

// NEMA MG-1 starting kVA per HP for code letters A through V (locked-rotor
// kVA per HP). Bundled values are the lower bound of each code-letter range.
export const NEMA_MG1_CODE_LETTERS = {
  A: 0.0, B: 3.15, C: 3.55, D: 4.0, E: 4.5, F: 5.0, G: 5.6, H: 6.3,
  J: 7.1, K: 8.0, L: 9.0, M: 10.0, N: 11.2, P: 12.5, R: 14.0, S: 16.0,
  T: 18.0, U: 20.0, V: 22.4,
};

const GENERATOR_KW_STEPS = [15, 22, 35, 50, 60, 80, 100, 125, 150, 175, 200, 230, 275, 300, 400, 500, 600, 750, 1000];

// dims: in { args: dimensionless } out: { starting_kva: M L^2 T^-3, recommended_kW: M L^2 T^-3 }
export function computeGeneratorMotorStarting({
  motors = [],
  non_motor_kW = 0,
  dip_factor = 0.30,
  starts_per_hour = "occasional",
} = {}) {
  if (!Array.isArray(motors) || motors.length === 0) return { error: "Provide at least one motor." };
  if (!(non_motor_kW >= 0)) return { error: "Non-motor steady load must be non-negative." };
  if (!(dip_factor > 0 && dip_factor < 1)) return { error: "Dip factor must be between 0 and 1." };
  let running_kW = Number(non_motor_kW) || 0;
  let worst_starting_kVA = 0;
  for (const m of motors) {
    const hp = Number(m.hp);
    if (!(hp > 0)) return { error: "Each motor needs a positive hp." };
    const motor_kW = Number(m.running_kW) || hp * 0.746;
    running_kW += motor_kW;
    let starting_kVA;
    if (m.lra_A !== undefined && Number(m.lra_A) > 0 && Number(m.voltage_V) > 0) {
      const sqrt_phases = m.phase === "single" ? 1 : POINT_TO_POINT_SQRT3;
      starting_kVA = (Number(m.lra_A) * Number(m.voltage_V) * sqrt_phases) / 1000;
    } else {
      const code = (m.code_letter || "G").toUpperCase();
      const per_hp = NEMA_MG1_CODE_LETTERS[code];
      if (per_hp === undefined) return { error: "Unknown code letter " + code };
      starting_kVA = hp * per_hp;
    }
    if (starting_kVA > worst_starting_kVA) worst_starting_kVA = starting_kVA;
  }
  // Frequent-start derate (occasional 1.0 / frequent 1.15 / continuous 1.30)
  const startsFactor = { occasional: 1.0, frequent: 1.15, continuous: 1.30 };
  const sf = startsFactor[starts_per_hour] || 1.0;
  const required_starting_kVA = (worst_starting_kVA / dip_factor) * sf;
  // Generator must be larger of running-kW basis and starting-kVA basis
  // (assume pf ~ 1 for the running-kW comparison; engineering-practice).
  const required_kW = Math.max(running_kW, required_starting_kVA * 0.8);
  const recommended_kW = GENERATOR_KW_STEPS.find((s) => s >= required_kW) ?? GENERATOR_KW_STEPS[GENERATOR_KW_STEPS.length - 1];
  return {
    running_kW, worst_starting_kVA, required_starting_kVA,
    required_kW, recommended_kW, starts_factor: sf,
  };
}

export const generatorMotorStartingExample = {
  inputs: {
    motors: [{ hp: 25, code_letter: "G" }, { hp: 10, code_letter: "F" }, { hp: 5, code_letter: "B" }],
    non_motor_kW: 15, dip_factor: 0.30, starts_per_hour: "frequent",
  },
};

// --- 237: Service Entrance Demand Load (Standard Method, NEC 220.42) ---
//
// General lighting demand: first 3000 VA at 100%, next 117000 at 35%,
// remainder at 25%. Range per NEC 220.55 simplified. Dryer 5000 W min per
// NEC 220.54. Fixed-appliance NEC 220.53 (75% if 4+ items in one branch).

const STD_SERVICE_AMPACITIES = [100, 125, 150, 175, 200, 225, 300, 400];

// dims: in { args: dimensionless } out: { total_va: M L^2 T^-3, recommended_service_A: I }
export function computeServiceLoadStandard({
  area_ft2 = 0,
  small_appliance_circuits = 2,
  laundry_circuit = 1,
  fixed_appliances_W = 0,
  fixed_appliance_count = 0,
  range_W = 0,
  dryer_W = 0,
  largest_motor_W = 0,
  hvac_cooling_W = 0,
  hvac_heating_W = 0,
  service_voltage = 240,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 >= 0)) return { error: "Area must be non-negative." };
  // General lighting: 3 VA per ft^2 (NEC 220.12 dwelling).
  const lighting_VA = (Number(area_ft2) || 0) * 3;
  const sa_VA = (Number(small_appliance_circuits) || 0) * 1500;
  const laundry_VA = (Number(laundry_circuit) || 0) * 1500;
  const general = lighting_VA + sa_VA + laundry_VA;
  // Standard demand: 3000 at 100% + (3000-120000) at 35% + remainder at 25%.
  let general_demand;
  if (general <= 3000) general_demand = general;
  else if (general <= 120000) general_demand = 3000 + (general - 3000) * 0.35;
  else general_demand = 3000 + 117000 * 0.35 + (general - 120000) * 0.25;
  // Range demand per NEC 220.55 (simplified single 8-12 kW range = 8000 W).
  const r = Number(range_W) || 0;
  let range_demand;
  if (r === 0) range_demand = 0;
  else if (r <= 8000) range_demand = r;
  else if (r <= 12000) range_demand = 8000;
  else range_demand = 8000 + (r - 12000) * 0.05;
  // Dryer per NEC 220.54: 5000 W or nameplate (whichever is greater).
  const d = Number(dryer_W) || 0;
  const dryer_demand = d === 0 ? 0 : Math.max(5000, d);
  // Fixed appliances per NEC 220.53: 75% if 4+ fastened-in-place items.
  const fixed = Number(fixed_appliances_W) || 0;
  const fixed_count = Number(fixed_appliance_count) || 0;
  const fixed_demand = fixed_count >= 4 ? fixed * 0.75 : fixed;
  // Largest motor at 125% per NEC 430.24.
  const motor_demand = (Number(largest_motor_W) || 0) * 0.25; // additive 25%
  // HVAC: larger of cooling vs. heating per NEC 220.60.
  const hvac_demand = Math.max(Number(hvac_cooling_W) || 0, Number(hvac_heating_W) || 0);

  const total_VA = general_demand + range_demand + dryer_demand + fixed_demand + motor_demand + hvac_demand;
  const required_A = total_VA / (Number(service_voltage) || 240);
  const recommended_A = STD_SERVICE_AMPACITIES.find((s) => s >= required_A) ?? STD_SERVICE_AMPACITIES[STD_SERVICE_AMPACITIES.length - 1];
  return {
    total_VA, required_A, recommended_A,
    breakdown: {
      lighting_general_VA: general, lighting_general_demand_VA: general_demand,
      range_demand_VA: range_demand, dryer_demand_VA: dryer_demand,
      fixed_demand_VA: fixed_demand, motor_largest_25_VA: motor_demand,
      hvac_demand_VA: hvac_demand,
    },
  };
}

export const serviceLoadStandardExample = {
  inputs: {
    area_ft2: 2500, small_appliance_circuits: 2, laundry_circuit: 1,
    fixed_appliances_W: 8000, fixed_appliance_count: 5,
    range_W: 12000, dryer_W: 5000, largest_motor_W: 1500,
    hvac_cooling_W: 6000, hvac_heating_W: 9000, service_voltage: 240,
  },
};

// --- v7 renderers (lightweight; bespoke list inputs handled inline) ---

import { makeNumber as _v7makeNumber, makeSelect as _v7makeSelect, attachExampleButton as _v7attachEx, makeOutputLine as _v7makeOut, debounce as _v7debounce, DEBOUNCE_MS as _V7_DEB, fmt as _v7fmt } from "./ui-fields.js";

function _v7renderTransformerKvaSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per ANSI/IEEE C57 standard kVA step series. FLA = kVA * 1000 / (V * sqrt(phases)).";
  _v7attachEx(inputRegion, () => fillExample(transformerKvaSizingExample.inputs));
  const loadsField = _v7makeNumber("Total connected kVA (sum of loads)", "tk-load", { step: "any", min: "0" });
  const primary = _v7makeNumber("Primary V", "tk-vp", { step: "any", min: "0" });
  primary.input.value = "480";
  const secondary = _v7makeNumber("Secondary V", "tk-vs", { step: "any", min: "0" });
  secondary.input.value = "208";
  const phase = _v7makeSelect("Phase", "tk-ph", [{ value: "three", label: "Three-phase" }, { value: "single", label: "Single-phase" }]);
  const reserve = _v7makeNumber("Future-growth reserve %", "tk-res", { step: "any", min: "0" });
  reserve.input.value = "25";
  for (const f of [loadsField, primary, secondary, phase, reserve]) inputRegion.appendChild(f.wrap);
  const oC = _v7makeOut(outputRegion, "Connected kVA", "tk-out-c");
  const oR = _v7makeOut(outputRegion, "Required (with reserve)", "tk-out-r");
  const oRec = _v7makeOut(outputRegion, "Recommended transformer", "tk-out-rec");
  const oP = _v7makeOut(outputRegion, "Primary FLA", "tk-out-p");
  const oS = _v7makeOut(outputRegion, "Secondary FLA", "tk-out-s");
  function fillExample(v) {
    const total = (v.loads || []).reduce((s, ln) => s + (ln.kVA || (ln.watts || 0) / 1000 / (ln.pf || 1)), 0);
    loadsField.input.value = total.toFixed(2);
    primary.input.value = v.primary_V;
    secondary.input.value = v.secondary_V;
    phase.select.value = v.phase;
    reserve.input.value = v.growth_reserve_pct;
    update();
  }
  const update = _v7debounce(() => {
    const total_kVA = Number(loadsField.input.value) || 0;
    const r = computeTransformerKvaSizing({
      loads: [{ kVA: total_kVA }],
      primary_V: Number(primary.input.value) || 0,
      secondary_V: Number(secondary.input.value) || 0,
      phase: phase.select.value,
      growth_reserve_pct: Number(reserve.input.value) || 0,
    });
    if (r.error) { oC.textContent = r.error; oR.textContent = "-"; oRec.textContent = "-"; oP.textContent = "-"; oS.textContent = "-"; return; }
    oC.textContent = _v7fmt(r.connected_kVA, 2) + " kVA";
    oR.textContent = _v7fmt(r.required_kVA, 2) + " kVA";
    oRec.textContent = r.recommended_kVA + " kVA (ANSI/IEEE step series)";
    oP.textContent = _v7fmt(r.fla_primary_A, 1) + " A";
    oS.textContent = _v7fmt(r.fla_secondary_A, 1) + " A";
  }, _V7_DEB);
  for (const f of [loadsField.input, primary.input, secondary.input, phase.select, reserve.input]) f.addEventListener("input", update);
}

function _v7renderShortCircuitPP(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bussmann point-to-point method by name. C-values from data/electrical/conductor-c-values.json.";
  _v7attachEx(inputRegion, () => fillExample(shortCircuitPPExample.inputs));
  const kVA = _v7makeNumber("Utility transformer kVA", "sc-kva", { step: "any", min: "0" });
  const z = _v7makeNumber("Utility transformer %Z", "sc-z", { step: "any", min: "0" });
  const v = _v7makeNumber("Secondary V", "sc-v", { step: "any", min: "0" });
  const phase = _v7makeSelect("Phase", "sc-ph", [{ value: "three", label: "Three-phase" }, { value: "single", label: "Single-phase" }]);
  const c = _v7makeNumber("Conductor C-value (from shard)", "sc-c", { step: "any", min: "0" });
  const len = _v7makeNumber("Run length (ft)", "sc-len", { step: "any", min: "0" });
  const sets = _v7makeNumber("Parallel sets", "sc-n", { step: "1", min: "1" });
  sets.input.value = "1";
  for (const f of [kVA, z, v, phase, c, len, sets]) inputRegion.appendChild(f.wrap);
  const oS = _v7makeOut(outputRegion, "I_sca at secondary", "sc-out-s");
  const oF = _v7makeOut(outputRegion, "f-factor", "sc-out-f");
  const oM = _v7makeOut(outputRegion, "M multiplier", "sc-out-m");
  const oP = _v7makeOut(outputRegion, "I_sca at panel", "sc-out-p");
  function fillExample(x) { kVA.input.value = x.utility_kVA; z.input.value = x.utility_Z_pct; v.input.value = x.secondary_V; phase.select.value = x.phase; c.input.value = x.C_value; len.input.value = x.length_ft; sets.input.value = x.parallel_sets; update(); }
  const update = _v7debounce(() => {
    const r = computeShortCircuitPP({
      utility_kVA: Number(kVA.input.value) || 0, utility_Z_pct: Number(z.input.value) || 0,
      secondary_V: Number(v.input.value) || 0, phase: phase.select.value,
      C_value: Number(c.input.value) || 0, length_ft: Number(len.input.value) || 0,
      parallel_sets: Number(sets.input.value) || 1,
    });
    if (r.error) { oS.textContent = r.error; oF.textContent = "-"; oM.textContent = "-"; oP.textContent = "-"; return; }
    oS.textContent = _v7fmt(r.I_sca_secondary_A, 0) + " A";
    oF.textContent = _v7fmt(r.f_factor, 4);
    oM.textContent = _v7fmt(r.M_factor, 4);
    oP.textContent = _v7fmt(r.I_sca_panel_A, 0) + " A";
  }, _V7_DEB);
  for (const f of [kVA.input, z.input, v.input, phase.select, c.input, len.input, sets.input]) f.addEventListener("input", update);
}

function _v7renderGeneratorMotorStarting(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Generator sizing for motor starting per the published 30% voltage-dip criterion. NEMA MG-1 code-letter table.";
  _v7attachEx(inputRegion, () => fillExample(generatorMotorStartingExample.inputs));
  const hp = _v7makeNumber("Largest motor HP", "gm-hp", { step: "any", min: "0" });
  const codeOpts = Object.keys(NEMA_MG1_CODE_LETTERS).map((k) => ({ value: k, label: "Code " + k + " (" + NEMA_MG1_CODE_LETTERS[k] + " kVA/HP)" }));
  const code = _v7makeSelect("Code letter", "gm-code", codeOpts);
  code.select.value = "G";
  const nonMotor = _v7makeNumber("Non-motor steady kW", "gm-nm", { step: "any", min: "0" });
  const dip = _v7makeNumber("Allowable voltage dip (0-1, default 0.30)", "gm-dip", { step: "any", min: "0", max: "1" });
  dip.input.value = "0.30";
  const starts = _v7makeSelect("Starts per hour", "gm-st", [
    { value: "occasional", label: "Occasional (≤ 3 / hr)" },
    { value: "frequent", label: "Frequent (4-10 / hr)" },
    { value: "continuous", label: "Continuous (> 10 / hr)" },
  ]);
  for (const f of [hp, code, nonMotor, dip, starts]) inputRegion.appendChild(f.wrap);
  const oR = _v7makeOut(outputRegion, "Steady running kW", "gm-out-r");
  const oS = _v7makeOut(outputRegion, "Worst starting kVA", "gm-out-s");
  const oReq = _v7makeOut(outputRegion, "Required gen kW", "gm-out-req");
  const oRec = _v7makeOut(outputRegion, "Recommended generator", "gm-out-rec");
  function fillExample(v) {
    const m = v.motors[0]; hp.input.value = m.hp; code.select.value = m.code_letter;
    nonMotor.input.value = v.non_motor_kW; dip.input.value = v.dip_factor; starts.select.value = v.starts_per_hour;
    update();
  }
  const update = _v7debounce(() => {
    const r = computeGeneratorMotorStarting({
      motors: [{ hp: Number(hp.input.value) || 0, code_letter: code.select.value }],
      non_motor_kW: Number(nonMotor.input.value) || 0,
      dip_factor: Number(dip.input.value) || 0.30,
      starts_per_hour: starts.select.value,
    });
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; oReq.textContent = "-"; oRec.textContent = "-"; return; }
    oR.textContent = _v7fmt(r.running_kW, 1) + " kW";
    oS.textContent = _v7fmt(r.worst_starting_kVA, 1) + " kVA";
    oReq.textContent = _v7fmt(r.required_kW, 1) + " kW";
    oRec.textContent = r.recommended_kW + " kW (typical step series)";
  }, _V7_DEB);
  for (const f of [hp.input, code.select, nonMotor.input, dip.input, starts.select]) f.addEventListener("input", update);
}

function _v7renderServiceLoadStandard(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Article 220 Standard Method (general lighting 3000 VA at 100% / next 117000 VA at 35% / remainder at 25%; 220.53 fixed-appliance 75% if 4+; 220.54 dryer 5000 W min; 220.55 range simplified). AHJ governs.";
  _v7attachEx(inputRegion, () => fillExample(serviceLoadStandardExample.inputs));
  const a = _v7makeNumber("Area (ft²)", "sls-a", { step: "any", min: "0" });
  const sa = _v7makeNumber("Small-appliance circuits (≥ 2)", "sls-sa", { step: "1", min: "0" });
  sa.input.value = "2";
  const lc = _v7makeNumber("Laundry circuits (typically 1)", "sls-lc", { step: "1", min: "0" });
  lc.input.value = "1";
  const fa = _v7makeNumber("Fixed-appliance load (W)", "sls-fa", { step: "any", min: "0" });
  const fac = _v7makeNumber("Fixed-appliance count (≥ 4 → 75% demand)", "sls-fac", { step: "1", min: "0" });
  const range = _v7makeNumber("Range nameplate (W)", "sls-r", { step: "any", min: "0" });
  const dryer = _v7makeNumber("Dryer nameplate (W)", "sls-d", { step: "any", min: "0" });
  const motor = _v7makeNumber("Largest motor (W) [+25% adder]", "sls-m", { step: "any", min: "0" });
  const cool = _v7makeNumber("HVAC cooling (W)", "sls-c", { step: "any", min: "0" });
  const heat = _v7makeNumber("HVAC heating (W)", "sls-h", { step: "any", min: "0" });
  const v = _v7makeNumber("Service voltage", "sls-v", { step: "any", min: "0" });
  v.input.value = "240";
  for (const f of [a, sa, lc, fa, fac, range, dryer, motor, cool, heat, v]) inputRegion.appendChild(f.wrap);
  const oT = _v7makeOut(outputRegion, "Total demand", "sls-out-t");
  const oA = _v7makeOut(outputRegion, "Required service A", "sls-out-a");
  const oRec = _v7makeOut(outputRegion, "Recommended service", "sls-out-rec");
  const oG = _v7makeOut(outputRegion, "General lighting demand", "sls-out-g");
  const oR = _v7makeOut(outputRegion, "Range demand", "sls-out-r");
  function fillExample(x) {
    a.input.value = x.area_ft2; sa.input.value = x.small_appliance_circuits;
    lc.input.value = x.laundry_circuit; fa.input.value = x.fixed_appliances_W;
    fac.input.value = x.fixed_appliance_count; range.input.value = x.range_W;
    dryer.input.value = x.dryer_W; motor.input.value = x.largest_motor_W;
    cool.input.value = x.hvac_cooling_W; heat.input.value = x.hvac_heating_W;
    v.input.value = x.service_voltage;
    update();
  }
  const update = _v7debounce(() => {
    const r = computeServiceLoadStandard({
      area_ft2: Number(a.input.value) || 0,
      small_appliance_circuits: Number(sa.input.value) || 0,
      laundry_circuit: Number(lc.input.value) || 0,
      fixed_appliances_W: Number(fa.input.value) || 0,
      fixed_appliance_count: Number(fac.input.value) || 0,
      range_W: Number(range.input.value) || 0,
      dryer_W: Number(dryer.input.value) || 0,
      largest_motor_W: Number(motor.input.value) || 0,
      hvac_cooling_W: Number(cool.input.value) || 0,
      hvac_heating_W: Number(heat.input.value) || 0,
      service_voltage: Number(v.input.value) || 240,
    });
    if (r.error) { oT.textContent = r.error; oA.textContent = "-"; oRec.textContent = "-"; oG.textContent = "-"; oR.textContent = "-"; return; }
    oT.textContent = _v7fmt(r.total_VA, 0) + " VA";
    oA.textContent = _v7fmt(r.required_A, 1) + " A";
    oRec.textContent = r.recommended_A + " A (NEC service ladder)";
    oG.textContent = _v7fmt(r.breakdown.lighting_general_demand_VA, 0) + " VA";
    oR.textContent = _v7fmt(r.breakdown.range_demand_VA, 0) + " VA";
  }, _V7_DEB);
  for (const f of [a.input, sa.input, lc.input, fa.input, fac.input, range.input, dryer.input, motor.input, cool.input, heat.input, v.input]) f.addEventListener("input", update);
}

// Renderer registry keyed by tool id.
export const ELECTRICAL_RENDERERS = {
  "ohms-law": renderOhmsLaw,
  "wire-ampacity": renderWireAmpacity,
  "voltage-drop": renderVoltageDrop,
  "conduit-fill": renderConduitFill,
  "box-fill": renderBoxFill,
  "breaker-sizing": renderBreakerSize,
  "motor-fla": renderMotorFLA,
  "transformer-sizing": renderTransformerSize,
  "three-phase": renderThreePhase,
  "copper-resistance": renderConductorResistance,
  "egc-sizing": renderEGC,
  // v2
  "service-load": renderServiceLoad,
  "generator-sizing": renderGeneratorSize,
  // pv-string-sizing + battery-runtime relocated to calc-solar.js (spec-v88).
  "voltage-imbalance": renderVoltageImbalance,
  "gfci-afci-reference": renderGFCIReference,
  "lighting-density": renderLightingDensity,
  // v3
  "pulling-tension": renderPullingTension,
  "cable-bend-radius": renderBendRadius,
  "pf-correction": renderPFCorrection,
  "phase-balance": renderPhaseBalance,
  "multi-load-vd": renderMultiLoadVD,
  "lv-dc-drop": renderLVDCDrop,
  "poe-budget": renderPoEBudget,
  // v7
  "transformer-kva-sizing": _v7renderTransformerKvaSizing,
  "short-circuit-pp": _v7renderShortCircuitPP,
  "generator-motor-starting": _v7renderGeneratorMotorStarting,
  "service-load-standard": _v7renderServiceLoadStandard,
};

// =====================================================================
// v8 Phase E.1 (utility 254): Panel Loading and Phase Rebalance
// =====================================================================

import {
  DEBOUNCE_MS as _V8E_DEB, debounce as _v8e_debounce, fmt as _v8e_fmt,
  makeNumber as _v8e_makeNumber, makeSelect as _v8e_makeSelect,
  attachExampleButton as _v8e_attachEx, makeOutputLine as _v8e_makeOut,
} from "./ui-fields.js";

// Compute per-phase totals + percent imbalance + a greedy heaviest-to-
// lightest swap suggestion. Phase imbalance % = (max - min) / mean × 100.
// The greedy heuristic picks the largest A circuit and the smallest C
// circuit (or whatever pair minimizes (max - min)) and proposes a swap.
//
// The optimization is constrained: a swap is only allowed between two
// circuits whose breaker positions are listed in `swappable_pairs`, or
// (if not supplied) between any two single-leg breakers across phases.

// dims: in { args: dimensionless } out: { recommendations: dimensionless, imbalance_percent: dimensionless }
export function computePanelRebalance({
  circuits = [],
  swappable_pairs = null,
} = {}) {
  if (!Array.isArray(circuits) || circuits.length === 0) return { error: "Provide at least one circuit." };
  const totals = { A: 0, B: 0, C: 0 };
  for (const c of circuits) {
    const amps = Number(c.amps);
    if (!(amps >= 0)) return { error: "Each circuit needs non-negative amps." };
    const phase = c.phase;
    if (!(phase in totals)) return { error: "Each circuit needs phase A, B, or C." };
    totals[phase] += amps;
  }
  const phases = ["A", "B", "C"];
  const values = phases.map((p) => totals[p]);
  const mean = (totals.A + totals.B + totals.C) / 3;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const imbalance_pct = mean > 0 ? ((max - min) / mean) * 100 : 0;

  // Greedy swap: identify heaviest and lightest phases. Find the largest
  // single-leg circuit on the heaviest phase that, if moved to the
  // lightest, would not over-shift the balance (i.e., new heaviest -
  // new lightest < current imbalance).
  let suggestion = null;
  if (imbalance_pct > 5) {
    let heavyPhase = "A", lightPhase = "A";
    for (const p of phases) {
      if (totals[p] > totals[heavyPhase]) heavyPhase = p;
      if (totals[p] < totals[lightPhase]) lightPhase = p;
    }
    const heavyCircuits = circuits
      .map((c, i) => ({ ...c, _i: i }))
      .filter((c) => c.phase === heavyPhase)
      .sort((a, b) => b.amps - a.amps);
    for (const c of heavyCircuits) {
      const newHeavy = totals[heavyPhase] - c.amps;
      const newLight = totals[lightPhase] + c.amps;
      const newMax = Math.max(newHeavy, newLight, totals[phases.find((p) => p !== heavyPhase && p !== lightPhase)]);
      const newMin = Math.min(newHeavy, newLight, totals[phases.find((p) => p !== heavyPhase && p !== lightPhase)]);
      const newMean = (totals.A + totals.B + totals.C) / 3;
      const newImbalance = newMean > 0 ? ((newMax - newMin) / newMean) * 100 : 0;
      // If a swap-pair constraint is supplied, only permit moves listed.
      if (swappable_pairs) {
        const allowed = swappable_pairs.some((pair) => pair.includes(c._i));
        if (!allowed) continue;
      }
      if (newImbalance < imbalance_pct) {
        suggestion = {
          move_circuit_index: c._i,
          description: c.description || ("Circuit " + (c._i + 1)),
          from_phase: heavyPhase, to_phase: lightPhase,
          amps: c.amps, projected_imbalance_pct: newImbalance,
        };
        break;
      }
    }
  }
  return {
    totals_A_amps: totals.A, totals_B_amps: totals.B, totals_C_amps: totals.C,
    mean_amps: mean, imbalance_pct, suggestion,
  };
}

export const panelRebalanceExample = {
  inputs: {
    circuits: [
      { description: "Kitchen", amps: 20, phase: "A" },
      { description: "Bedrooms", amps: 15, phase: "A" },
      { description: "HVAC", amps: 30, phase: "A" },
      { description: "Office", amps: 10, phase: "B" },
      { description: "Lighting", amps: 12, phase: "B" },
      { description: "Garage", amps: 12, phase: "C" },
    ],
  },
};

function _v8e_renderPanelRebalance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per NEC 2023 §220 (load calculations) and §408.36 (panel rating). AHJ governs final panel sizing. Free at nfpa.org/freeaccess.";
  _v8e_attachEx(inputRegion, () => fillExample(panelRebalanceExample.inputs));
  // For the simple renderer we expose a single circuit row with phase,
  // amps, and description. The user iterates by editing the example.
  const desc = _v8e_makeNumber("Circuit count", "pr-cnt", { step: "1", min: "1" });
  desc.input.value = "6";
  const totalA = _v8e_makeNumber("Sum amps on phase A (sample input)", "pr-a", { step: "any", min: "0" });
  const totalB = _v8e_makeNumber("Sum amps on phase B", "pr-b", { step: "any", min: "0" });
  const totalC = _v8e_makeNumber("Sum amps on phase C", "pr-c", { step: "any", min: "0" });
  for (const f of [desc, totalA, totalB, totalC]) inputRegion.appendChild(f.wrap);
  const oA = _v8e_makeOut(outputRegion, "Phase A total", "pr-out-a");
  const oB = _v8e_makeOut(outputRegion, "Phase B total", "pr-out-b");
  const oC = _v8e_makeOut(outputRegion, "Phase C total", "pr-out-c");
  const oI = _v8e_makeOut(outputRegion, "Imbalance %", "pr-out-i");
  const oS = _v8e_makeOut(outputRegion, "Suggested swap", "pr-out-s");
  function fillExample(x) {
    let a = 0, b = 0, c = 0;
    for (const cr of x.circuits) {
      if (cr.phase === "A") a += cr.amps;
      else if (cr.phase === "B") b += cr.amps;
      else if (cr.phase === "C") c += cr.amps;
    }
    desc.input.value = String(x.circuits.length);
    totalA.input.value = String(a);
    totalB.input.value = String(b);
    totalC.input.value = String(c);
    update();
  }
  const update = _v8e_debounce(() => {
    const a = Number(totalA.input.value) || 0;
    const b = Number(totalB.input.value) || 0;
    const c = Number(totalC.input.value) || 0;
    if (a + b + c === 0) {
      oA.textContent = "0 A"; oB.textContent = "0 A"; oC.textContent = "0 A";
      oI.textContent = "0 %"; oS.textContent = "(enter loads)"; return;
    }
    const mean = (a + b + c) / 3;
    const mx = Math.max(a, b, c);
    const mn = Math.min(a, b, c);
    const imb = mean > 0 ? ((mx - mn) / mean) * 100 : 0;
    oA.textContent = _v8e_fmt(a, 1) + " A";
    oB.textContent = _v8e_fmt(b, 1) + " A";
    oC.textContent = _v8e_fmt(c, 1) + " A";
    oI.textContent = _v8e_fmt(imb, 2) + " % (NEMA MG-1 caution > 1%)";
    if (imb <= 5) {
      oS.textContent = "balanced (≤ 5 %); no swap suggested";
    } else {
      const heavy = a >= b && a >= c ? "A" : (b >= c ? "B" : "C");
      const light = a <= b && a <= c ? "A" : (b <= c ? "B" : "C");
      const move = (mx - mn) / 2;
      oS.textContent = "move ~" + _v8e_fmt(move, 1) + " A from phase " + heavy + " to phase " + light;
    }
  }, _V8E_DEB);
  for (const f of [desc.input, totalA.input, totalB.input, totalC.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["panel-rebalance"] = _v8e_renderPanelRebalance;

// =====================================================================
// v9 §A.3 (utility N+1): Arc-flash incident-energy screen (Ralph Lee 1982)
// =====================================================================
//
// Closed-form, public, pre-IEEE-1584. Spec-v9 §A.3 declares this is a
// SCREEN, not a study. The limitation banner above the inputs makes
// that explicit; this comment reiterates it for future maintainers.
//
//   E_lee (cal/cm^2 at distance D inches) =
//     (2.142e6 * V * I_bf * t_seconds) / D^2
//
// Boundary distance is the distance at which E_lee = 1.2 cal/cm^2
// (NFPA 70E threshold for second-degree burn):
//
//   D_boundary = sqrt((2.142e6 * V * I_bf * t) / 1.2)
//
// PPE category bands cited by name only (NFPA 70E Table 130.7(C)(15)(c)
// is not reproduced):
//   < 1.2  cal/cm^2 : no PPE required (still hazard band)
//   1.2-4  cal/cm^2 : CAT 1 (4 cal/cm^2 minimum arc-rated)
//   4-8    cal/cm^2 : CAT 2 (8 cal/cm^2 minimum)
//   8-25   cal/cm^2 : CAT 3 (25 cal/cm^2 minimum)
//   25-40  cal/cm^2 : CAT 4 (40 cal/cm^2 minimum)
//   > 40   cal/cm^2 : no PPE rated; remote operation required.

const _LEE_THRESHOLD_CAL_CM2 = 1.2;
const _PPE_BANDS = [
  { min: 0,  max: 1.2, label: "No PPE required (Lee screen below 1.2 cal/cm^2 second-degree threshold)" },
  { min: 1.2, max: 4,  label: "CAT 1 (4 cal/cm^2 minimum arc-rated PPE)" },
  { min: 4,   max: 8,  label: "CAT 2 (8 cal/cm^2 minimum)" },
  { min: 8,   max: 25, label: "CAT 3 (25 cal/cm^2 minimum)" },
  { min: 25,  max: 40, label: "CAT 4 (40 cal/cm^2 minimum)" },
  { min: 40,  max: Infinity, label: "No standard PPE rated above 40 cal/cm^2; remote operation or de-energize" },
];

// dims: in { args: dimensionless } out: { incident_energy_cal_cm2: dimensionless, ppe_category: dimensionless }
export function computeArcFlashScreen({
  voltage_V = 0,
  bolted_fault_A = 0,
  clearing_time_s = 0,
  working_distance_in = 18,
  equipment_config = "open_air",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(voltage_V) || 0;
  const I = Number(bolted_fault_A) || 0;
  const t = Number(clearing_time_s) || 0;
  const D = Number(working_distance_in) || 0;
  if (!(V >= 208)) return { error: "Voltage below 208 V is outside the Lee model range. Use IEEE 1584 for low-voltage configurations." };
  if (!(I > 0)) return { error: "Bolted-fault current must be positive." };
  if (!(t > 0)) return { error: "Arc clearing time must be positive (seconds)." };
  if (!(D > 0)) return { error: "Working distance must be positive (inches)." };
  if (equipment_config !== "open_air" && equipment_config !== "box") {
    return { error: "Equipment configuration must be 'open_air' or 'box'." };
  }

  const numerator = 2.142e6 * V * I * t;
  const incident_energy_cal_cm2 = numerator / (D * D);
  const boundary_in = Math.sqrt(numerator / _LEE_THRESHOLD_CAL_CM2);

  // PPE band lookup.
  let ppe_band = _PPE_BANDS[_PPE_BANDS.length - 1].label;
  for (const b of _PPE_BANDS) {
    if (incident_energy_cal_cm2 >= b.min && incident_energy_cal_cm2 < b.max) {
      ppe_band = b.label;
      break;
    }
  }

  // Conservatism / non-conservatism warnings per spec-v9 §A.3.
  const warnings = [];
  if (V <= 600) {
    warnings.push("Lee is conservative below 600 V open-air but may be non-conservative for some 480 V configurations covered by IEEE 1584; treat as a screen.");
  }
  if (t > 2.0) {
    warnings.push("Clearing time > 2.0 s is unusually long; upstream protection should normally clear faster. Long clearing times produce dangerous incident-energy values regardless of method.");
  }
  if (D < 6 || D > 36) {
    warnings.push("Working distance outside the typical 6 to 36 in PPE-selection range; verify against the AHJ-adopted PPE table.");
  }
  if (equipment_config === "box") {
    warnings.push("Lee equation is derived for open-air arcs. Box / enclosed configurations are typically higher; IEEE 1584 box correction is required for a study-grade result.");
  }

  return {
    incident_energy_cal_cm2,
    boundary_distance_in: boundary_in,
    ppe_band,
    warnings,
  };
}

export const arcFlashScreenExample = {
  inputs: { voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderArcFlashScreen(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ralph Lee (1982) closed-form, public, pre-IEEE-1584. NFPA 70E-2024 §130.5 requires an arc-flash risk assessment by a qualified person before energized work. Free at nfpa.org/freeaccess for NFPA 70E TOC and Annex D.";
  // v10 §B.3: render the simplified-screening limitation banner above
  // the inputs (canonical copy in limitation-banner.js).
  renderLimitationBanner(inputRegion, getLimitationCopy("arc-flash-screen"));

  const v = makeNumber("System voltage (V)", "af-v", { step: "any", min: "0" });
  const ibf = makeNumber("Bolted-fault current (A)", "af-ibf", { step: "any", min: "0" });
  const t = makeNumber("Arc clearing time (s)", "af-t", { step: "any", min: "0" });
  const d = makeNumber("Working distance (in)", "af-d", { step: "any", min: "0", value: "18" });
  d.input.value = "18";
  const cfg = makeSelect("Equipment configuration", "af-cfg", [
    { value: "open_air", label: "Open air", selected: true },
    { value: "box", label: "Box / enclosed (Lee is conservative for box; IEEE 1584 needed)" },
  ]);
  for (const f of [v, ibf, t, d, cfg]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    v.input.value = "480"; ibf.input.value = "25000"; t.input.value = "0.1";
    d.input.value = "18"; cfg.select.value = "open_air"; update();
  });

  const oE = makeOutputLine(outputRegion, "Incident energy (cal/cm^2)", "af-out-e");
  const oB = makeOutputLine(outputRegion, "Arc-flash boundary (in)", "af-out-b");
  const oP = makeOutputLine(outputRegion, "PPE band (NFPA 70E)", "af-out-p");
  const oW = makeOutputLine(outputRegion, "Notes", "af-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeArcFlashScreen({
      voltage_V: readNum(v.input),
      bolted_fault_A: readNum(ibf.input),
      clearing_time_s: readNum(t.input),
      working_distance_in: readNum(d.input),
      equipment_config: cfg.select.value,
    });
    if (r.error) {
      oE.textContent = r.error; oB.textContent = ""; oP.textContent = ""; oW.textContent = "";
      return;
    }
    oE.textContent = fmt(r.incident_energy_cal_cm2, 2) + " cal/cm^2";
    oB.textContent = fmt(r.boundary_distance_in, 1) + " in";
    oP.textContent = r.ppe_band;
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "Lee screen; not a study.";
  }, DEBOUNCE_MS);
  for (const f of [v.input, ibf.input, t.input, d.input, cfg.select]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["arc-flash-screen"] = renderArcFlashScreen;

// =====================================================================
// v9 §A.4: Motor branch-circuit math from nameplate
// =====================================================================
//
// First-principles motor full-load current from HP, voltage, efficiency,
// and power factor. Companion to the existing motor-fla tile which
// returns table-derived FLA from NEC 2023 §430.247-430.250; this tile
// computes the physics value and flags the design value as the larger
// of the two when a nameplate FLA is also supplied.
//
// Single-phase: I = HP * 746 / (V * eta * PF)
// Three-phase:  I = HP * 746 / (sqrt(3) * V * eta * PF)
//
// Branch-circuit conductor: continuous-load 125% rule per NEC §430.22.
// Overload sizing: 115% or 125% of FLA per NEC §430.32 depending on
// nameplate service factor (1.15+ -> 125%; below 1.15 -> 115%).
//
// Per spec-v9 §A.4 the NEC 430.247 / 430.248 / 430.250 reference-FLA
// tables are NOT reproduced. The output is the physics calculation;
// when nameplate FLA is provided, both are surfaced and the larger
// (design) value is flagged.

// dims: in { args: dimensionless } out: { fla_A: I, branch_A: I, overload_A: I }
export function computeMotorBranchFromNameplate({
  hp = 0,
  voltage_V = 0,
  phase = 1,
  eta = 0.90,
  power_factor = 0.85,
  nameplate_fla_A = null,
  service_factor = 1.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const HP = Number(hp) || 0;
  const V = Number(voltage_V) || 0;
  const PH = Number(phase);
  const ETA = Number(eta);
  const PF = Number(power_factor);
  const SF = Number(service_factor) || 1.0;
  if (!(HP > 0)) return { error: "HP must be positive." };
  if (!(V > 0)) return { error: "Voltage must be positive." };
  if (PH !== 1 && PH !== 3) return { error: "Phase must be 1 or 3." };
  if (!(ETA > 0.5 && ETA <= 1.0)) return { error: "Efficiency must be in (0.5, 1.0]." };
  if (!(PF > 0.5 && PF <= 1.0)) return { error: "Power factor must be in (0.5, 1.0]." };
  if (!(SF >= 1.0 && SF <= 1.4)) return { error: "Service factor must be in [1.0, 1.4]." };

  const sqrt3 = Math.sqrt(3);
  const denom = PH === 1 ? (V * ETA * PF) : (sqrt3 * V * ETA * PF);
  const computed_fla_A = (HP * 746) / denom;

  // Design FLA: larger of computed or nameplate (when nameplate provided).
  const np = Number.isFinite(nameplate_fla_A) && nameplate_fla_A > 0 ? Number(nameplate_fla_A) : null;
  const design_fla_A = np !== null ? Math.max(computed_fla_A, np) : computed_fla_A;
  const design_source = np !== null && np >= computed_fla_A ? "nameplate" : "computed";

  // Branch-circuit conductor: 125% continuous rule per NEC §430.22.
  const branch_conductor_A = design_fla_A * 1.25;

  // Overload sizing per NEC §430.32: 125% for SF >= 1.15, else 115%.
  const overload_multiplier = SF >= 1.15 ? 1.25 : 1.15;
  const overload_max_A = design_fla_A * overload_multiplier;

  const warnings = [];
  if (HP < 0.25) {
    warnings.push("HP below 1/4 is below the NEC 430.247-430.250 reference-FLA table range; verify against motor nameplate.");
  }
  warnings.push("NEC 2023 §430.6(A)(1) requires the NEC 430.247 / 430.248 / 430.250 table FLA value (not the physics result) for branch-circuit conductor and overcurrent sizing where motor nameplate is not the reference.");

  return {
    computed_fla_A,
    nameplate_fla_A: np,
    design_fla_A,
    design_source,
    branch_conductor_125pct_A: branch_conductor_A,
    overload_max_A,
    overload_multiplier,
    warnings,
  };
}

export const motorBranchExample = {
  inputs: { hp: 5, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, nameplate_fla_A: 28, service_factor: 1.15 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderMotorBranchFromNameplate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Computed from nameplate. NEC 2023 §430.6(A)(1) requires using the table FLA values (430.247, 430.248, 430.250) for branch-circuit conductor and overcurrent sizing where motor nameplate is not the reference. Continuous-load 125 percent rule per §430.22. AHJ governs. Free at nfpa.org/freeaccess.";

  const hp = makeNumber("HP", "mbn-hp", { step: "any", min: "0" });
  const v = makeNumber("Voltage (V)", "mbn-v", { step: "any", min: "0" });
  const ph = makeSelect("Phase", "mbn-ph", [
    { value: "1", label: "Single-phase", selected: true },
    { value: "3", label: "Three-phase" },
  ]);
  const eta = makeNumber("Efficiency (eta, 0.5-1.0)", "mbn-eta", { step: "any", min: "0", max: "1", value: "0.90" });
  eta.input.value = "0.90";
  const pf = makeNumber("Power factor (0.5-1.0)", "mbn-pf", { step: "any", min: "0", max: "1", value: "0.85" });
  pf.input.value = "0.85";
  const np = makeNumber("Nameplate FLA (A, optional)", "mbn-np", { step: "any", min: "0" });
  const sf = makeNumber("Service factor (1.0-1.4)", "mbn-sf", { step: "any", min: "1", max: "1.4", value: "1.0" });
  sf.input.value = "1.0";
  for (const f of [hp, v, ph, eta, pf, np, sf]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    hp.input.value = "5"; v.input.value = "230"; ph.select.value = "1";
    eta.input.value = "0.875"; pf.input.value = "0.78"; np.input.value = "28";
    sf.input.value = "1.15"; update();
  });

  const oC = makeOutputLine(outputRegion, "Computed FLA (A)", "mbn-out-c");
  const oN = makeOutputLine(outputRegion, "Nameplate FLA (A)", "mbn-out-n");
  const oD = makeOutputLine(outputRegion, "Design FLA (A; larger of two)", "mbn-out-d");
  const oB = makeOutputLine(outputRegion, "Branch conductor (125% rule, A)", "mbn-out-b");
  const oOL = makeOutputLine(outputRegion, "Overload max (A)", "mbn-out-ol");
  const oW = makeOutputLine(outputRegion, "Notes", "mbn-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeMotorBranchFromNameplate({
      hp: readNum(hp.input),
      voltage_V: readNum(v.input),
      phase: Number(ph.select.value),
      eta: readNum(eta.input),
      power_factor: readNum(pf.input),
      nameplate_fla_A: readNum(np.input),
      service_factor: readNum(sf.input),
    });
    if (r.error) {
      oC.textContent = r.error; oN.textContent = ""; oD.textContent = "";
      oB.textContent = ""; oOL.textContent = ""; oW.textContent = "";
      return;
    }
    oC.textContent = fmt(r.computed_fla_A, 2) + " A";
    oN.textContent = r.nameplate_fla_A !== null ? fmt(r.nameplate_fla_A, 2) + " A" : "(not provided)";
    oD.textContent = fmt(r.design_fla_A, 2) + " A (from " + r.design_source + ")";
    oB.textContent = fmt(r.branch_conductor_125pct_A, 2) + " A";
    oOL.textContent = fmt(r.overload_max_A, 2) + " A (" + Math.round(r.overload_multiplier * 100) + "% per §430.32)";
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [hp.input, v.input, ph.select, eta.input, pf.input, np.input, sf.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["motor-branch-from-nameplate"] = renderMotorBranchFromNameplate;

// =====================================================================
// v9 §A.2: Grounding electrode resistance
// =====================================================================
//
// Closed-form public formulas. Spec-v9 §A.2 names the electrode types.
//
//   Driven rod (Dwight 1936):
//     R = (rho / (2 * pi * L)) * (ln(8L / d) - 1)
//   Buried ring (IEEE 142 §4.2.2):
//     R = (rho / (4 * pi^2 * D)) * (ln(8D / d) + ln(4D / s))
//   Buried plate (IEEE 142 §4.2.3):
//     R = (rho / 4) * sqrt(pi / A)     (rho in ohm-m, A in m^2)
//   Ufer / concrete-encased (IEEE 142 §4.2.4):
//     treat as a rod with an effective concrete-cylinder diameter; a
//     well-bonded Ufer of standard slab thickness typically reads
//     about half the resistance of a bare rod of the same length in
//     the same soil. The calculator computes the rod result and
//     applies a 0.5 reduction factor with a note that the empirical
//     factor is conservative.
//
// All R values are in ohms. Soil resistivity rho is taken as ohm-cm
// (the field-megger unit); internal unit conversions are explicit so
// a reader can trace the math.
//
// Supplemental electrode count to reach the 25-ohm NEC 250.53(A)(2)
// advisory: ceil(R_single / 25). A note flags that mutual impedance
// between rods means n rods at ~6 ft spacing land closer to ~1.1n /
// R_single in practice; the count is a starting point, not a design.

// dims: in { args: dimensionless } out: { resistance_ohms: M L^2 T^-3 I^-2, supplemental_rods: dimensionless }
export function computeGroundingElectrodeResistance({
  electrode_type = "driven_rod",
  soil_resistivity_ohm_cm = 0,
  rod_diameter_in = 0,
  rod_length_ft = 0,
  ring_diameter_ft = 0,
  ring_conductor_diameter_in = 0,
  ring_burial_depth_ft = 2.5,
  plate_area_ft2 = 0,
  plate_burial_depth_ft = 2.5,
  ufer_concrete_diameter_in = 6,
} = {}) {
  const rho = Number(soil_resistivity_ohm_cm) || 0;
  if (!(rho > 0)) return { error: "Soil resistivity must be positive (ohm-cm)." };

  const ROD_TYPES = new Set(["driven_rod", "ring", "plate", "ufer"]);
  if (!ROD_TYPES.has(electrode_type)) {
    return { error: "Electrode type must be one of: driven_rod, ring, plate, ufer." };
  }

  const warnings = [];
  if (rho < 100) warnings.push("Soil resistivity below 100 ohm-cm is outside the typical 100-100,000 ohm-cm range; verify the megger reading.");
  if (rho > 100000) warnings.push("Soil resistivity above 100,000 ohm-cm is outside the typical range; supplemental electrodes are usually required.");

  let R = null;
  if (electrode_type === "driven_rod" || electrode_type === "ufer") {
    const L_ft = Number(rod_length_ft) || 0;
    const d_in = Number(rod_diameter_in) || 0;
    if (!(L_ft > 0)) return { error: "Rod length must be positive (ft)." };
    if (!(d_in > 0)) return { error: "Rod diameter must be positive (in)." };
    if (L_ft < 2) warnings.push("Rod length below 2 ft is outside the typical 8 ft minimum (NEC 250.52(A)(5) names 8 ft for driven rods).");
    if (L_ft > 40) warnings.push("Rod length above 40 ft is outside the typical range; deep rods may not improve resistance proportionally.");
    const L_cm = L_ft * 30.48;
    const d_cm_rod = d_in * 2.54;
    const d_cm = electrode_type === "ufer" ? Math.max(d_cm_rod, (Number(ufer_concrete_diameter_in) || 6) * 2.54) : d_cm_rod;
    R = (rho / (2 * Math.PI * L_cm)) * (Math.log(8 * L_cm / d_cm) - 1);
    if (electrode_type === "ufer") {
      // Empirical concrete-encasement reduction (IEEE 142 §4.2.4 typical).
      R = R * 0.5;
      warnings.push("Ufer resistance computed as a rod with the concrete-cylinder effective diameter, then halved. The 0.5 factor is a conservative empirical estimate; field megger reading is authoritative.");
    }
  } else if (electrode_type === "ring") {
    const D_ft = Number(ring_diameter_ft) || 0;
    const dc_in = Number(ring_conductor_diameter_in) || 0;
    const s_ft = Number(ring_burial_depth_ft) || 0;
    if (!(D_ft > 0)) return { error: "Ring diameter must be positive (ft)." };
    if (!(dc_in > 0)) return { error: "Ring conductor diameter must be positive (in)." };
    if (!(s_ft > 0)) return { error: "Ring burial depth must be positive (ft)." };
    // NEC 250.66 minimum 2 AWG (~0.258 in dia.). Flag below that.
    if (dc_in < 0.258) warnings.push("Ring conductor below 2 AWG (~0.258 in dia.) is below the NEC 250.66 minimum size for grounding-electrode ring conductors.");
    const D_cm = D_ft * 30.48;
    const dc_cm = dc_in * 2.54;
    const s_cm = s_ft * 30.48;
    R = (rho / (4 * Math.PI * Math.PI * D_cm)) * (Math.log(8 * D_cm / dc_cm) + Math.log(4 * D_cm / s_cm));
  } else if (electrode_type === "plate") {
    const A_ft2 = Number(plate_area_ft2) || 0;
    const s_ft = Number(plate_burial_depth_ft) || 0;
    if (!(A_ft2 > 0)) return { error: "Plate area must be positive (ft^2)." };
    if (!(s_ft > 0)) return { error: "Plate burial depth must be positive (ft)." };
    // Convert: 1 ft^2 = 0.0929 m^2; rho_ohm_m = rho_ohm_cm / 100.
    const A_m2 = A_ft2 * 0.092903;
    const rho_ohm_m = rho / 100;
    R = (rho_ohm_m / 4) * Math.sqrt(Math.PI / A_m2);
  }

  if (R === null || !Number.isFinite(R)) return { error: "Resistance could not be computed; check inputs." };

  // Supplemental electrode count to reach 25 ohms (NEC 250.53(A)(2)).
  const supplemental_count = R <= 25 ? 0 : Math.ceil(R / 25);
  const meets_25_ohm = R <= 25;

  return {
    resistance_ohms: R,
    meets_25_ohm,
    supplemental_count_to_25_ohm: supplemental_count,
    rho_ohm_cm: rho,
    electrode_type,
    warnings,
  };
}

export const groundingElectrodeExample = {
  // Textbook reference: 8 ft x 5/8 in driven rod in 10,000 ohm-cm soil.
  inputs: { electrode_type: "driven_rod", soil_resistivity_ohm_cm: 10000, rod_diameter_in: 0.625, rod_length_ft: 8 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGroundingElectrode(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per IEEE 142-2007 (Green Book) §4. Dwight (1936) closed-form for driven rods. NEC 2023 §250.53 governs adoption. Soil resistivity varies seasonally; field megger reading is the authoritative value at the time of inspection. Free at standards.ieee.org for IEEE bibliographic data.";

  const t = makeSelect("Electrode type", "ge-type", [
    { value: "driven_rod", label: "Driven rod (Dwight 1936)", selected: true },
    { value: "ring", label: "Buried ring (IEEE 142 §4.2.2)" },
    { value: "plate", label: "Buried plate (IEEE 142 §4.2.3)" },
    { value: "ufer", label: "Concrete-encased / Ufer (IEEE 142 §4.2.4)" },
  ]);
  const rho = makeNumber("Soil resistivity (ohm-cm)", "ge-rho", { step: "any", min: "0" });
  const rd = makeNumber("Rod diameter (in; rod / Ufer)", "ge-rd", { step: "any", min: "0", value: "0.625" });
  rd.input.value = "0.625";
  const rl = makeNumber("Rod length (ft; rod / Ufer)", "ge-rl", { step: "any", min: "0", value: "8" });
  rl.input.value = "8";
  const Du = makeNumber("Ring diameter (ft; ring)", "ge-D", { step: "any", min: "0" });
  const dc = makeNumber("Ring conductor diameter (in; ring)", "ge-dc", { step: "any", min: "0" });
  const sR = makeNumber("Ring burial depth (ft; ring)", "ge-sR", { step: "any", min: "0", value: "2.5" });
  sR.input.value = "2.5";
  const pA = makeNumber("Plate area (ft^2; plate)", "ge-pA", { step: "any", min: "0" });
  const pS = makeNumber("Plate burial depth (ft; plate)", "ge-pS", { step: "any", min: "0", value: "2.5" });
  pS.input.value = "2.5";
  const ucd = makeNumber("Ufer concrete diameter (in; Ufer)", "ge-ucd", { step: "any", min: "0", value: "6" });
  ucd.input.value = "6";
  for (const f of [t, rho, rd, rl, Du, dc, sR, pA, pS, ucd]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    t.select.value = "driven_rod"; rho.input.value = "10000"; rd.input.value = "0.625"; rl.input.value = "8";
    update();
  });

  const oR = makeOutputLine(outputRegion, "Resistance to remote earth (ohms)", "ge-out-r");
  const o25 = makeOutputLine(outputRegion, "Meets NEC 25-ohm advisory", "ge-out-25");
  const oS = makeOutputLine(outputRegion, "Supplemental rod count to 25 ohms", "ge-out-s");
  const oW = makeOutputLine(outputRegion, "Notes", "ge-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeGroundingElectrodeResistance({
      electrode_type: t.select.value,
      soil_resistivity_ohm_cm: readNum(rho.input),
      rod_diameter_in: readNum(rd.input),
      rod_length_ft: readNum(rl.input),
      ring_diameter_ft: readNum(Du.input),
      ring_conductor_diameter_in: readNum(dc.input),
      ring_burial_depth_ft: readNum(sR.input),
      plate_area_ft2: readNum(pA.input),
      plate_burial_depth_ft: readNum(pS.input),
      ufer_concrete_diameter_in: readNum(ucd.input),
    });
    if (r.error) {
      oR.textContent = r.error; o25.textContent = ""; oS.textContent = ""; oW.textContent = "";
      return;
    }
    oR.textContent = fmt(r.resistance_ohms, 2) + " ohms";
    o25.textContent = r.meets_25_ohm ? "Yes" : "No";
    oS.textContent = r.supplemental_count_to_25_ohm === 0 ? "Single electrode meets 25-ohm" : String(r.supplemental_count_to_25_ohm) + " electrodes (estimate; ignores mutual impedance)";
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "IEEE 142 closed-form; field megger reading is authoritative.";
  }, DEBOUNCE_MS);
  for (const f of [t.select, rho.input, rd.input, rl.input, Du.input, dc.input, sR.input, pA.input, pS.input, ucd.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["grounding-electrode"] = renderGroundingElectrode;

// --- v15 A.8 + A.9: PV interconnection busbar (NEC 705.12) + off-grid battery ---
// computePvInterconnectionBusbar / computeOffGridBattery (and their renderers)
// relocated to calc-solar.js at the spec-v88 cap-relief split (both keep group
// "A"). See calc-solar.js.

// --- v15 A.1: Three-phase voltage drop with reactance (NEC Chapter 9 Table 9) ---
// The v1 voltage-drop tile is resistance-only. On a long feeder at a low power
// factor the conductor reactance matters: the effective impedance the current
// sees is (R*cos(theta) + X*sin(theta)), not R alone. R and X per 1000 ft come
// from NEC Chapter 9 Table 9 (selected by conductor size AND conduit material,
// since a steel raceway raises X). Table 9 is paywalled, so the user enters the
// R and X for their conductor / conduit pair; the tile does not bundle it.

// dims: in { args: dimensionless } out: { drop_v: M L^2 T^-3 I^-1, drop_percent: dimensionless, voltage_at_load_v: M L^2 T^-3 I^-1 }
export function computeVoltageDropReactance({
  system_voltage_v = 0,
  current_a = 0,
  length_ft = 0,
  r_ohm_per_kft = 0,
  x_ohm_per_kft = 0,
  power_factor = 0.85,
  phase = "three",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(system_voltage_v) || 0;
  const I = Number(current_a) || 0;
  const L = Number(length_ft) || 0;
  const R = Number(r_ohm_per_kft) || 0;
  const X = Number(x_ohm_per_kft) || 0;
  const pf = Number(power_factor);
  if (!(V > 0)) return { error: "System voltage must be positive (V)." };
  if (!(I > 0)) return { error: "Load current must be positive (A)." };
  if (!(L > 0)) return { error: "One-way length must be positive (ft)." };
  if (!(R >= 0)) return { error: "Resistance per 1000 ft cannot be negative (ohm)." };
  if (!(X >= 0)) return { error: "Reactance per 1000 ft cannot be negative (ohm)." };
  if (!(pf > 0 && pf <= 1)) return { error: "Power factor must be in (0, 1]." };
  if (phase !== "single" && phase !== "three") return { error: "Phase must be single or three." };

  const warnings = [];
  if (pf < 0.5) warnings.push("Power factor below 0.50 is outside the typical (0.50-1.0) band; verify the load data.");
  if (X === 0) warnings.push("Reactance is zero; this is the resistance-only result (matches the v1 voltage-drop tile).");

  const theta = Math.acos(pf);
  const z_eff = R * Math.cos(theta) + X * Math.sin(theta); // ohm / 1000 ft
  const k = phase === "three" ? Math.sqrt(3) : 2;
  const drop_v = (k * I * z_eff * L) / 1000;
  const drop_percent = (drop_v / V) * 100;
  const voltage_at_load_v = V - drop_v;

  let advisory;
  if (drop_percent > 5) advisory = "exceeds 5% total (NEC 215.2(A)(1) Note 2 advisory)";
  else if (drop_percent > 3) advisory = "exceeds 3% branch (NEC 210.19(A) Note 4 advisory)";
  else advisory = "within the 3% branch / 5% total advisory band";
  if (phase === "single") warnings.push("Single-phase 3-wire (120/240 V) drop uses the per-line current; enter the line-to-neutral load current.");

  return {
    drop_v,
    drop_percent,
    voltage_at_load_v,
    z_eff_ohm_per_kft: z_eff,
    phase_angle_deg: (theta * 180) / Math.PI,
    advisory,
    warnings,
  };
}

export const voltageDropReactanceExample = {
  // 100 A, 200 ft, 1/0 copper THHN in steel conduit, 480 V three-phase, PF
  // 0.85. NEC Chapter 9 Table 9 for 1/0 Cu in steel conduit: R = 0.13,
  // X = 0.044 ohm/1000 ft. z_eff = 0.13*0.85 + 0.044*sin(acos 0.85)
  // = 0.1105 + 0.044*0.52678 = 0.13368; Vd = 1.732*100*0.13368*200/1000
  // = 4.63 V (0.965%), within ~2% of the Mike Holt voltage-drop calculator.
  inputs: {
    system_voltage_v: 480,
    current_a: 100,
    length_ft: 200,
    r_ohm_per_kft: 0.13,
    x_ohm_per_kft: 0.044,
    power_factor: 0.85,
    phase: "three",
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderVoltageDropReactance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Vd = k * I * (R*cos(theta) + X*sin(theta)) * L / 1000, k = 2 single-phase / 1.732 three-phase. R and X per 1000 ft come from NEC 2023 Chapter 9 Table 9, selected by conductor size and conduit material (steel raceway raises X); enter them from your code book. NEC 210.19(A) Note 4 (3% branch) and 215.2(A)(1) Note 2 (5% total) set the advisory band. AHJ governs. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const phase = makeSelect("Phase", "vdr-phase", [
    { value: "three", label: "Three-phase", selected: true },
    { value: "single", label: "Single-phase" },
  ]);
  const volts = makeNumber("System voltage (V, line-to-line)", "vdr-v", { step: "any", min: "0", value: "480" });
  volts.input.value = "480";
  const cur = makeNumber("Load current (A)", "vdr-i", { step: "any", min: "0", value: "100" });
  cur.input.value = "100";
  const len = makeNumber("One-way length (ft)", "vdr-l", { step: "any", min: "0", value: "200" });
  len.input.value = "200";
  const r = makeNumber("R per 1000 ft (ohm; Table 9)", "vdr-r", { step: "any", min: "0", value: "0.13" });
  r.input.value = "0.13";
  const x = makeNumber("X per 1000 ft (ohm; Table 9)", "vdr-x", { step: "any", min: "0", value: "0.044" });
  x.input.value = "0.044";
  const pf = makeNumber("Power factor (0.5-1.0)", "vdr-pf", { step: "any", min: "0", max: "1", value: "0.85" });
  pf.input.value = "0.85";
  for (const f of [phase, volts, cur, len, r, x, pf]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    phase.select.value = "three"; volts.input.value = "480"; cur.input.value = "100";
    len.input.value = "200"; r.input.value = "0.13"; x.input.value = "0.044"; pf.input.value = "0.85";
    update();
  });

  const oVd = makeOutputLine(outputRegion, "Voltage drop (V)", "vdr-out-vd");
  const oPct = makeOutputLine(outputRegion, "Percent drop", "vdr-out-pct");
  const oVl = makeOutputLine(outputRegion, "Voltage at load (V)", "vdr-out-vl");
  const oAdv = makeOutputLine(outputRegion, "Advisory", "vdr-out-adv");
  const oW = makeOutputLine(outputRegion, "Notes", "vdr-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const res = computeVoltageDropReactance({
      system_voltage_v: readNum(volts.input),
      current_a: readNum(cur.input),
      length_ft: readNum(len.input),
      r_ohm_per_kft: readNum(r.input),
      x_ohm_per_kft: readNum(x.input),
      power_factor: readNum(pf.input),
      phase: phase.select.value,
    });
    if (res.error) {
      oVd.textContent = res.error; oPct.textContent = ""; oVl.textContent = ""; oAdv.textContent = ""; oW.textContent = "";
      return;
    }
    oVd.textContent = fmt(res.drop_v, 2) + " V";
    oPct.textContent = fmt(res.drop_percent, 2) + " %";
    oVl.textContent = fmt(res.voltage_at_load_v, 1) + " V";
    oAdv.textContent = res.advisory;
    oW.textContent = res.warnings.length ? res.warnings.join(" ") : "Resistance and reactance are from NEC Chapter 9 Table 9; the AHJ-adopted edition governs.";
  }, DEBOUNCE_MS);
  for (const f of [phase.select, volts.input, cur.input, len.input, r.input, x.input, pf.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["voltage-drop-reactance"] = renderVoltageDropReactance;

// --- v15 A.3: Power triangle (kW / kVA / kVAR / PF) solver ---
// Any two of the five quantities (real power kW, apparent power kVA, reactive
// power kVAR, power factor, phase angle) fix the whole triangle. kVA^2 = kW^2 +
// kVAR^2; PF = kW / kVA; theta = arccos(PF). At least one of the two must be a
// magnitude (kW / kVA / kVAR) -- PF and angle alone give only the shape, not
// the size. Leading vs lagging is a sign label on the reactive leg.

// dims: in { args: dimensionless } out: { kw: M L^2 T^-3, kva: M L^2 T^-3, kvar: M L^2 T^-3, pf: dimensionless, angle_deg: dimensionless }
export function computePowerTriangle({
  kw = null,
  kva = null,
  kvar = null,
  pf = null,
  angle_deg = null,
  sign = "lagging",
} = {}) {
  const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const KW = num(kw), KVA = num(kva), KVAR = num(kvar), PF = num(pf), ANG = num(angle_deg);
  const provided = [KW, KVA, KVAR, PF, ANG].filter((v) => v !== null).length;
  if (provided < 2) return { error: "Supply any two of kW, kVA, kVAR, PF, or phase angle." };
  if (PF !== null && (PF < 0 || PF > 1)) return { error: "Power factor must be in [0, 1]." };
  if (ANG !== null && (ANG < 0 || ANG >= 90)) return { error: "Phase angle must be in [0, 90) degrees." };
  for (const [v, label] of [[KW, "kW"], [KVA, "kVA"], [KVAR, "kVAR"]]) {
    if (v !== null && v < 0) return { error: label + " cannot be negative." };
  }
  if (sign !== "lagging" && sign !== "leading") return { error: "Sign must be lagging or leading." };

  // Reduce PF / angle to a single ratio (theta). If both given, they must agree.
  let theta = null;
  if (PF !== null) theta = Math.acos(PF);
  if (ANG !== null) {
    const t2 = (ANG * Math.PI) / 180;
    if (theta !== null && Math.abs(theta - t2) > 1e-6) return { error: "Power factor and phase angle disagree; supply one or make them consistent." };
    theta = t2;
  }

  const mags = [["kw", KW], ["kva", KVA], ["kvar", KVAR]].filter(([, v]) => v !== null);
  let out_kw, out_kva, out_kvar;
  if (mags.length >= 2) {
    if (KW !== null && KVA !== null) {
      if (KW > KVA + 1e-9) return { error: "kW cannot exceed kVA." };
      out_kw = KW; out_kva = KVA; out_kvar = Math.sqrt(Math.max(0, KVA * KVA - KW * KW));
    } else if (KW !== null && KVAR !== null) {
      out_kw = KW; out_kvar = KVAR; out_kva = Math.sqrt(KW * KW + KVAR * KVAR);
    } else { // KVA & KVAR
      if (KVAR > KVA + 1e-9) return { error: "kVAR cannot exceed kVA." };
      out_kva = KVA; out_kvar = KVAR; out_kw = Math.sqrt(Math.max(0, KVA * KVA - KVAR * KVAR));
    }
  } else if (mags.length === 1 && theta !== null) {
    const c = Math.cos(theta), s = Math.sin(theta);
    if (KW !== null) {
      if (!(c > 0)) return { error: "Real power with a 90-degree angle (PF 0) has no finite apparent power." };
      out_kw = KW; out_kva = KW / c; out_kvar = out_kva * s;
    } else if (KVA !== null) {
      out_kva = KVA; out_kw = KVA * c; out_kvar = KVA * s;
    } else { // KVAR
      if (!(s > 0)) return { error: "Reactive power with a 0-degree angle (PF 1) has no finite apparent power." };
      out_kva = KVAR / s; out_kw = out_kva * c; out_kvar = KVAR;
    }
  } else {
    return { error: "Supply at least one magnitude (kW, kVA, or kVAR); PF or angle alone fixes only the shape." };
  }

  const out_pf = out_kva > 0 ? out_kw / out_kva : 1;
  const out_angle = (Math.acos(Math.min(1, Math.max(0, out_pf))) * 180) / Math.PI;
  return {
    kw: out_kw,
    kva: out_kva,
    kvar: out_kvar,
    pf: out_pf,
    angle_deg: out_angle,
    sign,
    kvar_label: (sign === "leading" ? "+" : "-") + fmt(out_kvar, 2) + " kVAR (" + sign + ")",
  };
}

export const powerTriangleExample = {
  // 100 kW real power at 0.80 PF -> kVA = 125, kVAR = 75, angle = 36.87 deg.
  inputs: { kw: 100, pf: 0.8, sign: "lagging" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPowerTriangle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles AC power triangle: kVA^2 = kW^2 + kVAR^2; PF = kW / kVA; theta = arccos(PF). IEEE 1459 defines apparent, real, and reactive power; this tile handles the sinusoidal case. Free at standards.ieee.org for the IEEE 1459 abstract.";

  const kw = makeNumber("Real power (kW; blank if unknown)", "pt-kw", { step: "any", min: "0", value: "100" });
  kw.input.value = "100";
  const kva = makeNumber("Apparent power (kVA; blank if unknown)", "pt-kva", { step: "any", min: "0" });
  const kvar = makeNumber("Reactive power (kVAR; blank if unknown)", "pt-kvar", { step: "any", min: "0" });
  const pf = makeNumber("Power factor (0-1; blank if unknown)", "pt-pf", { step: "any", min: "0", max: "1", value: "0.8" });
  pf.input.value = "0.8";
  const ang = makeNumber("Phase angle (deg; blank if unknown)", "pt-ang", { step: "any", min: "0", max: "90" });
  const sign = makeSelect("Reactive sign", "pt-sign", [
    { value: "lagging", label: "Lagging (inductive)", selected: true },
    { value: "leading", label: "Leading (capacitive)" },
  ]);
  for (const f of [kw, kva, kvar, pf, ang, sign]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    kw.input.value = "100"; kva.input.value = ""; kvar.input.value = ""; pf.input.value = "0.8"; ang.input.value = ""; sign.select.value = "lagging";
    update();
  });

  const oKw = makeOutputLine(outputRegion, "Real power (kW)", "pt-out-kw");
  const oKva = makeOutputLine(outputRegion, "Apparent power (kVA)", "pt-out-kva");
  const oKvar = makeOutputLine(outputRegion, "Reactive power (kVAR)", "pt-out-kvar");
  const oPf = makeOutputLine(outputRegion, "Power factor", "pt-out-pf");
  const oAng = makeOutputLine(outputRegion, "Phase angle (deg)", "pt-out-ang");

  // Accessible phasor diagram. role=img + aria-label carries the text the SVG
  // shows visually; max-width keeps it inside the 320px mobile viewport.
  const svgWrap = document.createElement("div");
  svgWrap.className = "pt-phasor-wrap";
  outputRegion.appendChild(svgWrap);
  const SVG_NS = "http://www.w3.org/2000/svg";

  function drawTriangle(r) {
    while (svgWrap.firstChild) svgWrap.removeChild(svgWrap.firstChild);
    if (!r || r.error) return;
    const W = 260, H = 170, m = 28;
    const maxKva = r.kva > 0 ? r.kva : 1;
    const baseLen = W - 2 * m; // kW leg (horizontal), scaled to kVA
    const sx = baseLen / maxKva;
    const x0 = m, y0 = H - m;
    const xKw = x0 + r.kw * sx;
    const yTop = y0 - r.kvar * sx;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "Power triangle: real power " + fmt(r.kw, 1) + " kilowatts along the base, reactive power " +
      fmt(r.kvar, 1) + " kilovolt-amperes reactive vertical, apparent power " + fmt(r.kva, 1) +
      " kilovolt-amperes as the hypotenuse at " + fmt(r.angle_deg, 1) + " degrees.");
    svg.style.maxWidth = "100%";
    svg.style.height = "auto";
    // kW leg (base)
    const base = document.createElementNS(SVG_NS, "line");
    base.setAttribute("x1", String(x0)); base.setAttribute("y1", String(y0));
    base.setAttribute("x2", String(xKw)); base.setAttribute("y2", String(y0));
    base.setAttribute("stroke", "currentColor"); base.setAttribute("stroke-width", "2");
    svg.appendChild(base);
    // kVAR leg (vertical, at the kW end)
    const vleg = document.createElementNS(SVG_NS, "line");
    vleg.setAttribute("x1", String(xKw)); vleg.setAttribute("y1", String(y0));
    vleg.setAttribute("x2", String(xKw)); vleg.setAttribute("y2", String(yTop));
    vleg.setAttribute("stroke", "currentColor"); vleg.setAttribute("stroke-width", "2");
    vleg.setAttribute("stroke-dasharray", "4 3");
    svg.appendChild(vleg);
    // kVA hypotenuse
    const hyp = document.createElementNS(SVG_NS, "line");
    hyp.setAttribute("x1", String(x0)); hyp.setAttribute("y1", String(y0));
    hyp.setAttribute("x2", String(xKw)); hyp.setAttribute("y2", String(yTop));
    hyp.setAttribute("stroke", "currentColor"); hyp.setAttribute("stroke-width", "2.5");
    svg.appendChild(hyp);
    svgWrap.appendChild(svg);
  }

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computePowerTriangle({
      kw: readNum(kw.input), kva: readNum(kva.input), kvar: readNum(kvar.input),
      pf: readNum(pf.input), angle_deg: readNum(ang.input), sign: sign.select.value,
    });
    if (r.error) {
      oKw.textContent = r.error; oKva.textContent = ""; oKvar.textContent = ""; oPf.textContent = ""; oAng.textContent = "";
      drawTriangle(null);
      return;
    }
    oKw.textContent = fmt(r.kw, 2) + " kW";
    oKva.textContent = fmt(r.kva, 2) + " kVA";
    oKvar.textContent = r.kvar_label;
    oPf.textContent = fmt(r.pf, 4) + " (" + r.sign + ")";
    oAng.textContent = fmt(r.angle_deg, 2) + " deg";
    drawTriangle(r);
  }, DEBOUNCE_MS);
  for (const f of [kw.input, kva.input, kvar.input, pf.input, ang.input, sign.select]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["power-triangle"] = renderPowerTriangle;

// --- v15 A.6: EV charger continuous-load and panel impact (NEC Article 625) ---
// computeEvChargerLoad (and renderEvChargerLoad, with the _EV_BREAKER_SIZES /
// _EV_CU_AWG tables) relocated to calc-solar.js at the spec-v88 cap-relief split
// (keeps group "A"). See calc-solar.js.

// --- v15 A.10: Conductor ambient-temperature and fill adjustment (NEC 310.15) ---
// A conductor's table ampacity is corrected for ambient temperature (310.15(B)(1)
// factors, based on a 30 C table ambient) and for more than three current-
// carrying conductors in a raceway (310.15(C)(1) adjustment). Both correction
// tables are de-facto public NEC reference and are bundled; the base ampacity
// itself is the user's 310.16 table value for their conductor.

// 310.15(B)(1) ambient correction factors by temperature rating column.
// Each row: [inclusive upper ambient bound in C, factor].
const _AMBIENT_FACTORS = {
  60: [[10, 1.29], [15, 1.22], [20, 1.15], [25, 1.08], [30, 1.00], [35, 0.91], [40, 0.82], [45, 0.71], [50, 0.58], [55, 0.41]],
  75: [[10, 1.20], [15, 1.15], [20, 1.11], [25, 1.05], [30, 1.00], [35, 0.94], [40, 0.88], [45, 0.82], [50, 0.75], [55, 0.67], [60, 0.58], [65, 0.47], [70, 0.33]],
  90: [[10, 1.15], [15, 1.12], [20, 1.08], [25, 1.04], [30, 1.00], [35, 0.96], [40, 0.91], [45, 0.87], [50, 0.82], [55, 0.76], [60, 0.71], [65, 0.65], [70, 0.58], [75, 0.50], [80, 0.41], [85, 0.29]],
};

function _fillFactor(n) {
  if (n <= 3) return 1.0;
  if (n <= 6) return 0.80;
  if (n <= 9) return 0.70;
  if (n <= 20) return 0.50;
  if (n <= 30) return 0.45;
  if (n <= 40) return 0.40;
  return 0.35;
}

// dims: in { args: dimensionless } out: { ambient_factor: dimensionless, fill_factor: dimensionless, combined_factor: dimensionless, adjusted_ampacity_a: I }
export function computeAmbientAmpacityAdjust({
  base_ampacity_a = 0,
  temp_column = 75,
  ambient_c = 30,
  conductor_count = 3,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const base = Number(base_ampacity_a) || 0;
  const col = Number(temp_column) || 0;
  const amb = Number(ambient_c);
  const n = Number(conductor_count) || 0;
  if (!(base > 0)) return { error: "Base ampacity must be positive (A; from your NEC 310.16 column)." };
  if (![60, 75, 90].includes(col)) return { error: "Temperature column must be 60, 75, or 90 C." };
  if (!Number.isFinite(amb)) return { error: "Ambient temperature is required (C)." };
  if (amb < -10) return { error: "Ambient below -10 C is outside the bundled 310.15(B)(1) table." };
  if (!(n >= 1)) return { error: "Conductor count must be at least 1." };

  const table = _AMBIENT_FACTORS[col];
  let ambient_factor = null;
  for (const [maxC, f] of table) {
    if (amb <= maxC) { ambient_factor = f; break; }
  }
  if (ambient_factor === null) {
    const topBound = table[table.length - 1][0];
    return { error: "Ambient " + amb + " C exceeds the " + col + " C column's bundled range (top " + topBound + " C); a hotter ambient zeroes the usable ampacity in this column." };
  }

  const warnings = [];
  if (n > 40) warnings.push("More than 40 current-carrying conductors is outside the standard 310.15(C)(1) table; the 0.35 floor is applied.");
  const fill_factor = _fillFactor(n);
  const combined_factor = ambient_factor * fill_factor;
  const adjusted_ampacity_a = base * combined_factor;

  return {
    ambient_factor,
    fill_factor,
    combined_factor,
    adjusted_ampacity_a,
    warnings,
  };
}

export const ambientAmpacityAdjustExample = {
  // #6 THHN copper, 90 C column (base 75 A from NEC 310.16), 50 C ambient,
  // 12 current-carrying conductors: ambient 0.82, fill 0.50, combined 0.41,
  // adjusted = 75 * 0.41 = 30.75 A (NEC 310.15 worked example).
  inputs: {
    base_ampacity_a: 75,
    temp_column: 90,
    ambient_c: 50,
    conductor_count: 12,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderAmbientAmpacityAdjust(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC 2023 310.15(B)(1) (ambient-temperature correction, 30 C table basis) and 310.15(C)(1) (more than three current-carrying conductors). Enter the base ampacity from your NEC 310.16 column; the correction factors are bundled de-facto reference. AHJ governs. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const base = makeNumber("Base ampacity (A; from NEC 310.16)", "aa-base", { step: "any", min: "0", value: "75" });
  base.input.value = "75";
  const col = makeSelect("Termination / insulation column", "aa-col", [
    { value: "60", label: "60 C" },
    { value: "75", label: "75 C", selected: true },
    { value: "90", label: "90 C" },
  ]);
  const amb = makeNumber("Ambient temperature (C)", "aa-amb", { step: "any", value: "50" });
  amb.input.value = "50";
  const count = makeNumber("Current-carrying conductors", "aa-n", { step: "1", min: "1", value: "12" });
  count.input.value = "12";
  for (const f of [base, col, amb, count]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    base.input.value = "75"; col.select.value = "90"; amb.input.value = "50"; count.input.value = "12";
    update();
  });

  const oAmb = makeOutputLine(outputRegion, "Ambient correction factor", "aa-out-amb");
  const oFill = makeOutputLine(outputRegion, "Conductor-fill factor", "aa-out-fill");
  const oComb = makeOutputLine(outputRegion, "Combined factor", "aa-out-comb");
  const oAdj = makeOutputLine(outputRegion, "Adjusted ampacity (A)", "aa-out-adj");
  const oW = makeOutputLine(outputRegion, "Notes", "aa-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeAmbientAmpacityAdjust({
      base_ampacity_a: readNum(base.input),
      temp_column: Number(col.select.value),
      ambient_c: readNum(amb.input),
      conductor_count: readNum(count.input),
    });
    if (r.error) {
      oAmb.textContent = r.error; oFill.textContent = ""; oComb.textContent = ""; oAdj.textContent = ""; oW.textContent = "";
      return;
    }
    oAmb.textContent = fmt(r.ambient_factor, 2);
    oFill.textContent = fmt(r.fill_factor, 2);
    oComb.textContent = fmt(r.combined_factor, 3);
    oAdj.textContent = fmt(r.adjusted_ampacity_a, 1) + " A";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "The final conductor must also satisfy the termination-temperature limit (110.14(C)); AHJ governs.";
  }, DEBOUNCE_MS);
  for (const f of [base.input, col.select, amb.input, count.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["ambient-ampacity-adjust"] = renderAmbientAmpacityAdjust;

// --- v15 A.11: Service load calculation, NEC 220.82 optional method ---
// The optional method for a dwelling: general load = 3 VA/ft^2 + 1500 VA per
// small-appliance and laundry circuit + nameplate of fixed appliances, range,
// dryer, and water heater; demand = first 10 kVA at 100% + remainder at 40%.
// The HVAC larger-of-heating-vs-cooling is then added at 100% (220.82(C)). A
// comparison line runs the standard 220.42 method and the service is sized to
// the larger of the two.

// dims: in { args: dimensionless } out: { optional_total_va: M L^2 T^-3, optional_demand_a: I, recommended_a: I }
export function computeServiceLoadOptional({
  area_ft2 = 0,
  small_appliance_circuits = 2,
  laundry_circuits = 1,
  fixed_appliances_kw = 0,
  range_kw = 0,
  dryer_kw = 0,
  water_heater_kw = 0,
  hvac_heating_kw = 0,
  hvac_cooling_kw = 0,
  ev_charger_a = 0,
  service_voltage = 240,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(area_ft2) || 0;
  const sa = Number(small_appliance_circuits) || 0;
  const laundry = Number(laundry_circuits) || 0;
  const fixed = Number(fixed_appliances_kw) || 0;
  const range = Number(range_kw) || 0;
  const dryer = Number(dryer_kw) || 0;
  const wh = Number(water_heater_kw) || 0;
  const heat = Number(hvac_heating_kw) || 0;
  const cool = Number(hvac_cooling_kw) || 0;
  const ev = Number(ev_charger_a) || 0;
  const V = Number(service_voltage) || 240;
  if (!(area > 0)) return { error: "Dwelling area must be positive (ft^2)." };
  if (!(V > 0)) return { error: "Service voltage must be positive (V)." };
  for (const [v, label] of [[fixed, "Fixed appliances"], [range, "Range"], [dryer, "Dryer"], [wh, "Water heater"], [heat, "Heating"], [cool, "Cooling"], [ev, "EV charger"]]) {
    if (v < 0) return { error: label + " value cannot be negative." };
  }

  const warnings = [];
  if (area < 500) warnings.push("Dwelling below 500 ft^2 is below the typical optional-method range.");
  if (area > 10000) warnings.push("Dwelling above 10,000 ft^2 is above the typical optional-method range.");

  // 220.82(B) general load.
  const ev_va = ev * V;
  const general_va = 3 * area + 1500 * (sa + laundry) + (fixed + range + dryer + wh) * 1000 + ev_va;
  const general_demand_va = general_va <= 10000 ? general_va : 10000 + 0.40 * (general_va - 10000);
  // 220.82(C) HVAC: larger of heating vs cooling at 100%.
  const hvac_demand_va = Math.max(heat, cool) * 1000;

  const optional_total_va = general_demand_va + hvac_demand_va;
  const optional_demand_a = optional_total_va / V;

  // Comparison: standard 220.42 method via the existing standard-method tile.
  const std = computeServiceLoadStandard({
    area_ft2: area,
    small_appliance_circuits: sa,
    laundry_circuit: laundry,
    fixed_appliances_W: fixed * 1000,
    fixed_appliance_count: fixed > 0 ? 4 : 0,
    range_W: range * 1000,
    dryer_W: dryer * 1000,
    hvac_cooling_W: cool * 1000,
    hvac_heating_W: heat * 1000,
    service_voltage: V,
  });
  const standard_total_va = std.error ? null : std.total_VA;
  const standard_demand_a = std.error ? null : std.required_A;

  const governing_a = Math.max(optional_demand_a, standard_demand_a ?? 0);
  const recommended_a = STD_SERVICE_AMPACITIES.find((s) => s >= governing_a) ?? STD_SERVICE_AMPACITIES[STD_SERVICE_AMPACITIES.length - 1];

  return {
    general_va,
    general_demand_va,
    hvac_demand_va,
    optional_total_va,
    optional_demand_a,
    standard_total_va,
    standard_demand_a,
    recommended_a,
    governing_method: optional_demand_a >= (standard_demand_a ?? 0) ? "optional (220.82)" : "standard (220.42)",
    warnings,
  };
}

export const serviceLoadOptionalExample = {
  // 2400 ft^2 dwelling: 2 small-appliance + 1 laundry, 3 kW fixed, 12 kW range,
  // 5.5 kW dryer, 4.5 kW water heater, 9 kW heat vs 5 kW cool.
  // general = 7200 + 4500 + 25000 = 36,700 VA; demand = 10000 + 0.4*26700
  // = 20,680 VA; + 9000 HVAC = 29,680 VA; /240 = 123.67 A -> 125 A service.
  inputs: {
    area_ft2: 2400,
    small_appliance_circuits: 2,
    laundry_circuits: 1,
    fixed_appliances_kw: 3,
    range_kw: 12,
    dryer_kw: 5.5,
    water_heater_kw: 4.5,
    hvac_heating_kw: 9,
    hvac_cooling_kw: 5,
    ev_charger_a: 0,
    service_voltage: 240,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderServiceLoadOptional(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC 2023 220.82 (optional dwelling load calculation): general load demand = first 10 kVA at 100% + remainder at 40%; 220.82(C) adds the larger of heating vs cooling at 100%. Compared against the standard 220.42 method; size to the larger. AHJ governs the adopted edition. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const area = makeNumber("Dwelling area (ft^2)", "slo-area", { step: "any", min: "0", value: "2400" });
  area.input.value = "2400";
  const sa = makeNumber("Small-appliance circuits", "slo-sa", { step: "1", min: "0", value: "2" });
  sa.input.value = "2";
  const laundry = makeNumber("Laundry circuits", "slo-laundry", { step: "1", min: "0", value: "1" });
  laundry.input.value = "1";
  const fixed = makeNumber("Fixed appliances (kW total)", "slo-fixed", { step: "any", min: "0", value: "3" });
  fixed.input.value = "3";
  const range = makeNumber("Range / cooktop (kW)", "slo-range", { step: "any", min: "0", value: "12" });
  range.input.value = "12";
  const dryer = makeNumber("Dryer (kW)", "slo-dryer", { step: "any", min: "0", value: "5.5" });
  dryer.input.value = "5.5";
  const wh = makeNumber("Water heater (kW)", "slo-wh", { step: "any", min: "0", value: "4.5" });
  wh.input.value = "4.5";
  const heat = makeNumber("Heating (kW)", "slo-heat", { step: "any", min: "0", value: "9" });
  heat.input.value = "9";
  const cool = makeNumber("Cooling (kW)", "slo-cool", { step: "any", min: "0", value: "5" });
  cool.input.value = "5";
  const ev = makeNumber("EV charger (A; 0 if none)", "slo-ev", { step: "any", min: "0", value: "0" });
  ev.input.value = "0";
  const volts = makeSelect("Service voltage", "slo-v", [
    { value: "240", label: "240 V (single-phase dwelling)", selected: true },
    { value: "208", label: "208 V" },
  ]);
  for (const f of [area, sa, laundry, fixed, range, dryer, wh, heat, cool, ev, volts]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    area.input.value = "2400"; sa.input.value = "2"; laundry.input.value = "1"; fixed.input.value = "3";
    range.input.value = "12"; dryer.input.value = "5.5"; wh.input.value = "4.5"; heat.input.value = "9";
    cool.input.value = "5"; ev.input.value = "0"; volts.select.value = "240";
    update();
  });

  const oGen = makeOutputLine(outputRegion, "General demand (VA)", "slo-out-gen");
  const oTot = makeOutputLine(outputRegion, "Optional-method total (VA)", "slo-out-tot");
  const oA = makeOutputLine(outputRegion, "Optional-method demand (A)", "slo-out-a");
  const oStd = makeOutputLine(outputRegion, "Standard-method demand (A)", "slo-out-std");
  const oRec = makeOutputLine(outputRegion, "Recommended service (A)", "slo-out-rec");
  const oW = makeOutputLine(outputRegion, "Notes", "slo-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeServiceLoadOptional({
      area_ft2: readNum(area.input),
      small_appliance_circuits: readNum(sa.input),
      laundry_circuits: readNum(laundry.input),
      fixed_appliances_kw: readNum(fixed.input),
      range_kw: readNum(range.input),
      dryer_kw: readNum(dryer.input),
      water_heater_kw: readNum(wh.input),
      hvac_heating_kw: readNum(heat.input),
      hvac_cooling_kw: readNum(cool.input),
      ev_charger_a: readNum(ev.input),
      service_voltage: Number(volts.select.value),
    });
    if (r.error) {
      oGen.textContent = r.error; oTot.textContent = ""; oA.textContent = ""; oStd.textContent = ""; oRec.textContent = ""; oW.textContent = "";
      return;
    }
    oGen.textContent = fmt(r.general_demand_va, 0) + " VA";
    oTot.textContent = fmt(r.optional_total_va, 0) + " VA";
    oA.textContent = fmt(r.optional_demand_a, 1) + " A";
    oStd.textContent = r.standard_demand_a === null ? "n/a" : fmt(r.standard_demand_a, 1) + " A";
    oRec.textContent = r.recommended_a + " A (governed by " + r.governing_method + ")";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Size the service to the larger of the two methods; the AHJ-adopted edition governs.";
  }, DEBOUNCE_MS);
  for (const f of [area.input, sa.input, laundry.input, fixed.input, range.input, dryer.input, wh.input, heat.input, cool.input, ev.input, volts.select]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["service-load-optional"] = renderServiceLoadOptional;

// --- v23 A.1: Lux <-> footcandle conversion + lumen-method illuminance ---
// fc = lux / 10.764 (1 fc = 1 lumen/ft^2, 1 lux = 1 lumen/m^2, and
// 1 ft^2 = 0.092903 m^2, so 1 fc = 10.764 lux exactly). The lumen method
// gives the AVERAGE maintained illuminance from a luminous-flux budget,
// the coefficient of utilization (CU), and the light-loss factor (LLF)
// over a room area; it is a planning average, not a point reading.
//
// dims: in { mode: dimensionless, lux: dimensionless, footcandles: dimensionless, lumens: dimensionless, area_ft2: L^2, cu: dimensionless, llf: dimensionless }
//        out: { footcandles: dimensionless, lux: dimensionless }
//   (illuminance and luminous flux are outside the M/L/T base set;
//    annotated dimensionless per spec-v14 §7.1's conservative rule for
//    photometric quantities.)
export function computeLuxFootcandle({ mode = "convert", lux = 0, footcandles = 0, lumens = 0, area_ft2 = 0, cu = 0.7, llf = 0.8 } = {}) {
  const LUX_PER_FC = 10.764;
  if (mode === "room") {
    const area = Number(area_ft2) || 0;
    const lm = Number(lumens) || 0;
    const CU = Number(cu);
    const LLF = Number(llf);
    if (!(area > 0 && Number.isFinite(area))) return { error: "Room area must be positive (ft^2)." };
    if (!(lm > 0 && Number.isFinite(lm))) return { error: "Total luminaire lumens must be positive." };
    if (!(CU > 0 && CU <= 1)) return { error: "Coefficient of utilization must be in (0, 1]." };
    if (!(LLF > 0 && LLF <= 1)) return { error: "Light-loss factor must be in (0, 1]." };
    const fc = (lm * CU * LLF) / area;
    return { mode: "room", footcandles: fc, lux: fc * LUX_PER_FC, average: true };
  }
  // convert mode: take whichever of footcandles / lux is provided (fc wins
  // if both are entered, since it is the field a US designer reads).
  const lx = Number(lux) || 0;
  const fc_in = Number(footcandles) || 0;
  if (fc_in > 0 && Number.isFinite(fc_in)) return { mode: "convert", footcandles: fc_in, lux: fc_in * LUX_PER_FC };
  if (lx > 0 && Number.isFinite(lx)) return { mode: "convert", footcandles: lx / LUX_PER_FC, lux: lx };
  return { error: "Enter a footcandle or lux value to convert." };
}

export const luxFootcandleExample = { inputs: { mode: "convert", footcandles: 100, lux: 0 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLuxFootcandle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the IES Lighting Handbook lumen method and the exact 1 footcandle = 10.764 lux conversion (1 ft^2 = 0.092903 m^2). The room method returns an AVERAGE maintained illuminance, not a point value. Pairs with the lighting-density tile. Public photometric relations.";

  const mode = makeSelect("Mode", "lxfc-mode", [
    { value: "convert", label: "Convert lux <-> footcandle", selected: true },
    { value: "room", label: "Room average (lumen method)" },
  ]);
  const fc = makeNumber("Footcandles (convert mode)", "lxfc-fc", { step: "any", min: "0", value: "100" });
  fc.input.value = "100";
  const lx = makeNumber("Lux (convert mode)", "lxfc-lux", { step: "any", min: "0" });
  const lumens = makeNumber("Total luminaire lumens (room mode)", "lxfc-lm", { step: "any", min: "0" });
  const area = makeNumber("Room area (ft^2, room mode)", "lxfc-area", { step: "any", min: "0" });
  const cu = makeNumber("Coefficient of utilization (0-1)", "lxfc-cu", { step: "any", min: "0", max: "1", value: "0.7" });
  cu.input.value = "0.7";
  const llf = makeNumber("Light-loss factor (0-1)", "lxfc-llf", { step: "any", min: "0", max: "1", value: "0.8" });
  llf.input.value = "0.8";
  for (const f of [mode, fc, lx, lumens, area, cu, llf]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    mode.select.value = "convert"; fc.input.value = "100"; lx.input.value = "";
    lumens.input.value = ""; area.input.value = ""; cu.input.value = "0.7"; llf.input.value = "0.8";
    update();
  });

  const oFc = makeOutputLine(outputRegion, "Footcandles", "lxfc-out-fc");
  const oLx = makeOutputLine(outputRegion, "Lux", "lxfc-out-lux");
  const oNote = makeOutputLine(outputRegion, "Note", "lxfc-out-note");

  function readNum(input) {
    if (input.value === "") return 0;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : 0;
  }
  const update = debounce(() => {
    const r = computeLuxFootcandle({
      mode: mode.select.value,
      footcandles: readNum(fc.input),
      lux: readNum(lx.input),
      lumens: readNum(lumens.input),
      area_ft2: readNum(area.input),
      cu: readNum(cu.input),
      llf: readNum(llf.input),
    });
    if (r.error) { oFc.textContent = r.error; oLx.textContent = ""; oNote.textContent = ""; return; }
    oFc.textContent = fmt(r.footcandles, 2) + " fc";
    oLx.textContent = fmt(r.lux, 1) + " lux";
    oNote.textContent = r.average ? "Average maintained illuminance (lumen method); point readings vary across the room." : "Exact conversion (1 fc = 10.764 lux).";
  }, DEBOUNCE_MS);
  for (const f of [mode.select, fc.input, lx.input, lumens.input, area.input, cu.input, llf.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["lux-to-footcandle"] = renderLuxFootcandle;

// --- v24 conduit-bending suite (conduit-offset, conduit-saddle, conduit-90-stub) ---
// Relocated to calc-fab.js at spec-v39 to relieve this module's gzip cap (it
// had reached 99.3%). The three tiles are first-principles bend/layout geometry
// and keep group: "A"; a tile's group letter is independent of its module (the
// spec-v28 / spec-v36 precedent). See calc-fab.js for the implementations.

// =====================================================================
// spec-v109: service grounding, bonding, and conductor-size selection.
//   grounding-electrode-conductor  GEC sizing (NEC 250.66)
//   bonding-jumper                 supply-side + equipment jumpers (250.28 / 250.102)
//   min-conductor-for-vd           inverse of the voltage-drop tile
// All group "A" in the existing calc-electrical.js. Each tile encodes only
// the threshold-to-size MAPPING it needs to compute (the established repo
// pattern of egc-sizing / wire-ampacity), cites the NEC section, and links
// the free read-only text; none reproduces a full NFPA table.
// =====================================================================

// Standard conductor sizes ascending by cross-sectional area (circular mils).
// AWG below 250, kcmil at and above. Used to round a required AREA up to the
// next standard trade size (the 12.5% supply-side bonding rule) and to compare
// two size labels by area without the AWG/kcmil token ambiguity.
const _STD_SIZE_CMILS = [
  ["14", 4110], ["12", 6530], ["10", 10380], ["8", 16510], ["6", 26240],
  ["4", 41740], ["3", 52620], ["2", 66360], ["1", 83690], ["1/0", 105600],
  ["2/0", 133100], ["3/0", 167800], ["4/0", 211600], ["250", 250000],
  ["300", 300000], ["350", 350000], ["400", 400000], ["500", 500000],
  ["600", 600000], ["700", 700000], ["750", 750000], ["800", 800000],
  ["900", 900000], ["1000", 1000000], ["1250", 1250000], ["1500", 1500000],
  ["1750", 1750000], ["2000", 2000000],
];
const _SIZE_CMILS_MAP = Object.fromEntries(_STD_SIZE_CMILS);
function _sizeAreaCmils(label) {
  const a = _SIZE_CMILS_MAP[String(label)];
  return a === undefined ? null : a;
}
function _roundUpToStandard(area_cmils) {
  for (const [label, cmils] of _STD_SIZE_CMILS) if (cmils >= area_cmils) return label;
  return "larger than 2000 kcmil";
}
// The smaller (by area) of two size labels.
function _smallerSize(a, b) {
  const aa = _sizeAreaCmils(a), ba = _sizeAreaCmils(b);
  if (aa === null) return b;
  if (ba === null) return a;
  return aa <= ba ? a : b;
}
// At least the floor size (by area).
function _atLeastSize(label, floor) {
  const la = _sizeAreaCmils(label), fa = _sizeAreaCmils(floor);
  if (la === null || fa === null) return label;
  return la >= fa ? label : floor;
}

// NEC Table 250.66: GEC by the largest ungrounded SERVICE conductor area.
// Thresholds differ by service-conductor material; the GEC column returned
// follows the chosen GEC material (here tied to the service material). Only
// the mapping values are encoded (egc-sizing precedent), not a reproduced table.
const _GEC_250_66 = {
  copper: [
    { max_kcmil: 66.36, cu: "8", al: "6" },
    { max_kcmil: 105.6, cu: "6", al: "4" },
    { max_kcmil: 167.8, cu: "4", al: "2" },
    { max_kcmil: 350, cu: "2", al: "1/0" },
    { max_kcmil: 600, cu: "1/0", al: "3/0" },
    { max_kcmil: 1100, cu: "2/0", al: "4/0" },
    { max_kcmil: Infinity, cu: "3/0", al: "250" },
  ],
  aluminum: [
    { max_kcmil: 105.6, cu: "8", al: "6" },
    { max_kcmil: 167.8, cu: "6", al: "4" },
    { max_kcmil: 250, cu: "4", al: "2" },
    { max_kcmil: 500, cu: "2", al: "1/0" },
    { max_kcmil: 900, cu: "1/0", al: "3/0" },
    { max_kcmil: 1750, cu: "2/0", al: "4/0" },
    { max_kcmil: Infinity, cu: "3/0", al: "250" },
  ],
};
function _table25066Base(service_kcmil, material) {
  const rows = _GEC_250_66[material] || _GEC_250_66.copper;
  const row = rows.find((r) => service_kcmil <= r.max_kcmil) || rows[rows.length - 1];
  return material === "aluminum" ? row.al : row.cu;
}

// dims: in { service_kcmil: L^2, material: dimensionless, electrode_type: dimensionless } out: { required_gec: dimensionless }
export function computeGroundingElectrodeConductor({ service_kcmil = 0, material = "copper", electrode_type = "rod-pipe-plate" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(service_kcmil > 0)) return { error: "Service conductor area must be positive (kcmil)." };
  if (material !== "copper" && material !== "aluminum") return { error: "Material must be copper or aluminum." };
  const base_gec = _table25066Base(service_kcmil, material);
  let required_gec = base_gec, cap_note;
  if (electrode_type === "rod-pipe-plate") {
    const cap = material === "aluminum" ? "4" : "6";
    required_gec = _smallerSize(base_gec, cap);
    cap_note = "Rod/pipe/plate sole connection: 250.66(A) caps the GEC at " + cap + " AWG " + material + ".";
  } else if (electrode_type === "concrete-encased") {
    const cap = material === "aluminum" ? "2" : "4";
    required_gec = _smallerSize(base_gec, cap);
    cap_note = "Concrete-encased (Ufer) sole connection: 250.66(B) caps the GEC at " + cap + " AWG copper-equivalent.";
  } else if (electrode_type === "ground-ring") {
    required_gec = _atLeastSize(base_gec, "2");
    cap_note = "Ground ring: 250.66(C) - the GEC need not be larger than the ring conductor (not modeled here; enter the ring size separately) and the ring itself is not smaller than 2 AWG.";
  } else {
    cap_note = "Water-pipe / structural-steel electrode: no 250.66(A)-(C) cap applies - the full Table 250.66 size is required.";
  }
  return {
    base_gec, required_gec, cap_note,
    note: "The grounding electrode conductor (GEC) connects the service to the grounding electrode system. Table 250.66 sizes it from the largest ungrounded service conductor (or the equivalent area of parallel sets). The electrode-specific caps in 250.66(A)-(C) limit the size to a rod/pipe/plate or concrete-encased electrode, because those electrodes cannot make use of a larger conductor; a water-pipe or structural-steel electrode takes the full table size. The AHJ-adopted NEC edition governs. Free read-only at nfpa.org/freeaccess.",
  };
}
export const groundingElectrodeConductorExample = { inputs: { service_kcmil: 250, material: "copper", electrode_type: "rod-pipe-plate" } };

function renderGroundingElectrodeConductor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 250.66 grounding-electrode-conductor sizing with the 250.66(A)-(C) electrode caps (by section; only the threshold-to-size mapping is encoded, not a reproduced table). The AHJ-adopted edition governs. Free read-only at nfpa.org/freeaccess.";
  const kcmil = makeNumber("Largest ungrounded service conductor (kcmil)", "gec-kcmil", { step: "any", min: "0" });
  const mat = makeSelect("Service / GEC material", "gec-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  const electrode = makeSelect("Electrode type", "gec-electrode", [
    { value: "rod-pipe-plate", label: "Rod / pipe / plate" },
    { value: "concrete-encased", label: "Concrete-encased (Ufer)" },
    { value: "ground-ring", label: "Ground ring" },
    { value: "water-pipe-or-steel", label: "Water pipe / building steel" },
  ]);
  for (const f of [kcmil, mat, electrode]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kcmil.input.value = "250"; mat.select.value = "copper"; electrode.select.value = "rod-pipe-plate"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required GEC", "gec-out-req");
  const oBase = makeOutputLine(outputRegion, "Table 250.66 base", "gec-out-base");
  const oCap = makeOutputLine(outputRegion, "Cap applied", "gec-out-cap");
  const oNote = makeOutputLine(outputRegion, "Note", "gec-out-note");
  const update = debounce(() => {
    const r = computeGroundingElectrodeConductor({ service_kcmil: Number(kcmil.input.value) || 0, material: mat.select.value, electrode_type: electrode.select.value });
    if (r.error) { oReq.textContent = r.error; oBase.textContent = "-"; oCap.textContent = "-"; oNote.textContent = "-"; return; }
    oReq.textContent = r.required_gec + " AWG/kcmil " + mat.select.value;
    oBase.textContent = r.base_gec + " AWG/kcmil";
    oCap.textContent = r.cap_note;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [kcmil.input, mat.select, electrode.select]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["grounding-electrode-conductor"] = renderGroundingElectrodeConductor;

// dims: in { mode: dimensionless, material: dimensionless, service_kcmil: L^2, ocpd_A: I, parallel_sets: dimensionless } out: { required_jumper: dimensionless }
export function computeBondingJumper({ mode = "supply-side", material = "copper", service_kcmil = 0, ocpd_A = 0, parallel_sets = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (material !== "copper" && material !== "aluminum") return { error: "Material must be copper or aluminum." };
  if (mode === "supply-side") {
    if (!(service_kcmil > 0)) return { error: "Service conductor area must be positive (kcmil)." };
    const base = _table25066Base(service_kcmil, material);
    // 250.102(C)(1) / 250.28(D): above 1100 kcmil copper (1750 aluminum) the
    // jumper is at least 12.5% of the largest phase conductor area.
    const large_threshold = material === "aluminum" ? 1750 : 1100;
    let required_jumper = base, rule = "Table 250.66 size (250.102(C)(1) / 250.28(D)).";
    if (service_kcmil > large_threshold) {
      const area_125 = 0.125 * service_kcmil * 1000; // kcmil -> cmils
      const base_cmils = _sizeAreaCmils(base) || 0;
      if (area_125 > base_cmils) {
        required_jumper = _roundUpToStandard(area_125);
        rule = "12.5% rule: phase conductors exceed " + large_threshold + " kcmil, so the jumper is at least 0.125 x " + fmt(service_kcmil, 0) + " = " + fmt(service_kcmil * 0.125, 1) + " kcmil, rounded up to a standard size.";
      }
    }
    return {
      required_jumper, rule,
      note: "The supply-side bonding jumper (the main bonding jumper at the service and any system bonding jumper) is sized from Table 250.66 by the largest ungrounded service conductor - the same table as the GEC. Where the service phase conductors exceed 1100 kcmil copper (1750 kcmil aluminum), 250.102(C)(1) requires the jumper to be at least 12.5% of the largest phase conductor area. The AHJ-adopted edition governs. Free read-only at nfpa.org/freeaccess.",
    };
  }
  // Equipment / load-side bonding jumper: NEC 250.102(D) -> Table 250.122 by OCPD.
  if (!(ocpd_A > 0)) return { error: "Overcurrent-device rating must be positive (A)." };
  const sets = parallel_sets >= 1 ? Math.floor(parallel_sets) : 1;
  const egc = computeEGCSize({ ocpd_A, material });
  if (egc.error) return { error: egc.error };
  return {
    required_jumper: egc.egc_awg, parallel_sets: sets,
    rule: sets > 1
      ? "Table 250.122 by OCPD, a full-size " + egc.egc_awg + " AWG jumper in EACH of the " + sets + " raceways (250.102(D))."
      : "Table 250.122 size by the overcurrent device (250.102(D)).",
    note: "The equipment (load-side) bonding jumper is sized from Table 250.122 by the overcurrent device protecting the circuit, like the equipment grounding conductor it parallels. Where the circuit runs in parallel raceways, a full-size jumper is installed in each raceway. The AHJ-adopted edition governs. Free read-only at nfpa.org/freeaccess.",
  };
}
export const bondingJumperExample = { inputs: { mode: "supply-side", material: "copper", service_kcmil: 350, ocpd_A: 0, parallel_sets: 1 } };

function renderBondingJumper(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 250.28(D) / 250.102(C)(D) bonding-jumper sizing - supply-side from Table 250.66 (with the 12.5% rule above 1100 kcmil copper / 1750 aluminum), equipment from Table 250.122 (by section; only the threshold-to-size mapping is encoded). The AHJ-adopted edition governs. Free read-only at nfpa.org/freeaccess.";
  const mode = makeSelect("Jumper type", "bj-mode", [
    { value: "supply-side", label: "Supply-side (main / system)" },
    { value: "equipment", label: "Equipment (load-side)" },
  ]);
  const mat = makeSelect("Material", "bj-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  const kcmil = makeNumber("Largest ungrounded service conductor (kcmil)", "bj-kcmil", { step: "any", min: "0" });
  const ocpd = makeNumber("Overcurrent device (A, equipment mode)", "bj-ocpd", { step: "1", min: "0" });
  const psets = makeNumber("Parallel raceways (equipment mode)", "bj-sets", { step: "1", min: "1", value: "1" });
  psets.input.value = "1";
  for (const f of [mode, mat, kcmil, ocpd, psets]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "supply-side"; mat.select.value = "copper"; kcmil.input.value = "350"; ocpd.input.value = "0"; psets.input.value = "1"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required jumper", "bj-out-req");
  const oRule = makeOutputLine(outputRegion, "Basis", "bj-out-rule");
  const oNote = makeOutputLine(outputRegion, "Note", "bj-out-note");
  const update = debounce(() => {
    const r = computeBondingJumper({ mode: mode.select.value, material: mat.select.value, service_kcmil: Number(kcmil.input.value) || 0, ocpd_A: Number(ocpd.input.value) || 0, parallel_sets: Number(psets.input.value) || 1 });
    if (r.error) { oReq.textContent = r.error; oRule.textContent = "-"; oNote.textContent = "-"; return; }
    oReq.textContent = r.required_jumper + " AWG/kcmil " + mat.select.value + (r.parallel_sets > 1 ? " in each of " + r.parallel_sets + " raceways" : "");
    oRule.textContent = r.rule;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [mode.select, mat.select, kcmil.input, ocpd.input, psets.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["bonding-jumper"] = renderBondingJumper;

// Building-wire size ladder for the inverse voltage-drop search (ascending).
const _VD_LADDER = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"];
function _minAwgForDrop({ phase, material, current_A, length_ft, allowed_drop_V }) {
  for (const awg of _VD_LADDER) {
    const drop = voltageDrop({ phase, material, awg, length_ft, current_A });
    if (drop <= allowed_drop_V) return { awg, drop };
  }
  return { awg: "larger than 4/0", drop: null };
}
// dims: in { phase: dimensionless, material: dimensionless, current_A: I, length_ft: L, source_voltage_V: M L^2 T^-3 I^-1, target_percent: dimensionless } out: { resulting_drop_V: M L^2 T^-3 I^-1, resulting_percent: dimensionless }
export function computeMinConductorForVd({ phase = "single", material = "copper", current_A = 0, length_ft = 0, source_voltage_V = 0, target_percent = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (material !== "copper" && material !== "aluminum") return { error: "Material must be copper or aluminum." };
  if (!(current_A > 0)) return { error: "Load current must be positive (A)." };
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(source_voltage_V > 0)) return { error: "Source voltage must be positive (V)." };
  if (!(target_percent > 0)) return { error: "Target drop percent must be positive." };
  const allowed_drop_V = (target_percent / 100) * source_voltage_V;
  const cu = _minAwgForDrop({ phase, material: "copper", current_A, length_ft, allowed_drop_V });
  const al = _minAwgForDrop({ phase, material: "aluminum", current_A, length_ft, allowed_drop_V });
  const chosen = material === "aluminum" ? al : cu;
  const resulting_drop_V = chosen.drop;
  const resulting_percent = chosen.drop === null ? null : (chosen.drop / source_voltage_V) * 100;
  return {
    allowed_drop_V, min_awg_copper: cu.awg, min_awg_aluminum: al.awg, resulting_drop_V, resulting_percent,
    ampacity_note: "Verify this size also satisfies ampacity (310.16) and the 110.14(C) termination temperature - a voltage-drop size is a floor, not a substitute for the ampacity check.",
    note: "The inverse of the voltage-drop tile: the smallest standard conductor that keeps the drop at or below the target percent over the run, using the same K-factor drop model (single phase 2 x K x I x D / cmils, three phase sqrt(3) x ...; K is copper 12.9, aluminum 21.2 ohm-cmil/ft at 75 C). The NEC FPN 3% branch / 5% total figures are advisory, not a requirement; the AHJ governs. Free read-only at nfpa.org/freeaccess.",
  };
}
export const minConductorForVdExample = { inputs: { phase: "single", material: "copper", current_A: 20, length_ft: 150, source_voltage_V: 120, target_percent: 3 } };

function renderMinConductorForVd(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles I x R voltage drop (K = copper 12.9 / aluminum 21.2 ohm-cmil/ft at 75 C) solved for the smallest standard conductor at or below the target percent; the NEC FPN 3%/5% figures are advisory. Verify ampacity (310.16) and 110.14(C) terminations separately. Free read-only at nfpa.org/freeaccess.";
  const phase = makeSelect("Phase", "mcvd-phase", [{ value: "single", label: "Single phase" }, { value: "three", label: "Three phase" }]);
  const mat = makeSelect("Material", "mcvd-mat", [{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]);
  const cur = makeNumber("Load current (A)", "mcvd-cur", { step: "any", min: "0" });
  const len = makeNumber("One-way run length (ft)", "mcvd-len", { step: "any", min: "0" });
  const volt = makeNumber("Source voltage (V)", "mcvd-volt", { step: "any", min: "0", value: "120" });
  volt.input.value = "120";
  const target = makeNumber("Target drop (%)", "mcvd-target", { step: "any", min: "0", value: "3" });
  target.input.value = "3";
  for (const f of [phase, mat, cur, len, volt, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { phase.select.value = "single"; mat.select.value = "copper"; cur.input.value = "20"; len.input.value = "150"; volt.input.value = "120"; target.input.value = "3"; update(); });
  const oReq = makeOutputLine(outputRegion, "Minimum conductor", "mcvd-out-req");
  const oBoth = makeOutputLine(outputRegion, "Copper / aluminum", "mcvd-out-both");
  const oDrop = makeOutputLine(outputRegion, "Resulting drop", "mcvd-out-drop");
  const oAmp = makeOutputLine(outputRegion, "Ampacity", "mcvd-out-amp");
  const oNote = makeOutputLine(outputRegion, "Note", "mcvd-out-note");
  const update = debounce(() => {
    const r = computeMinConductorForVd({ phase: phase.select.value, material: mat.select.value, current_A: Number(cur.input.value) || 0, length_ft: Number(len.input.value) || 0, source_voltage_V: Number(volt.input.value) || 0, target_percent: Number(target.input.value) || 0 });
    if (r.error) { oReq.textContent = r.error; oBoth.textContent = "-"; oDrop.textContent = "-"; oAmp.textContent = "-"; oNote.textContent = "-"; return; }
    const chosen = mat.select.value === "aluminum" ? r.min_awg_aluminum : r.min_awg_copper;
    oReq.textContent = chosen + " AWG " + mat.select.value;
    oBoth.textContent = r.min_awg_copper + " AWG copper / " + r.min_awg_aluminum + " AWG aluminum";
    oDrop.textContent = r.resulting_drop_V === null ? "(no listed size holds the target; increase the conductor or relax the target)" : fmt(r.resulting_drop_V, 2) + " V (" + fmt(r.resulting_percent, 2) + "%, allowed " + fmt(r.allowed_drop_V, 2) + " V)";
    oAmp.textContent = r.ampacity_note;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [phase.select, mat.select, cur.input, len.input, volt.input, target.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["min-conductor-for-vd"] = renderMinConductorForVd;

// --- spec-v121..v128 (2026-06-23): fault / raceway / grounding / three-phase
// fundamentals. Four Group "A" tiles. (The four-tile motor bench --
// motor-synchronous-speed-slip, motor-shaft-torque, motor-operating-cost,
// multi-motor-feeder -- was relocated to calc-motor.js at spec-v129 to relieve
// this module's gzip cap, which the v121..v128 batch had pushed to 100.1%; a
// tile's group letter is independent of its module, the v79/v88/v101
// precedent.) The remaining constants (root-3, the Onderdonk K/B pairs, the
// PVC coefficient) are first-principles unit bridges documented in citations.js;
// only the PVC coefficient and the 1/4-inch trigger (v126) are exposed as
// editable fields per their spec. ---

const _ONDERDONK = { copper: { K: 0.0297, B: 234 }, aluminum: { K: 0.0125, B: 228 } };

// dims: in { area_cmil: L^2, fault_current_a: I, clearing_time_s: T, material: dimensionless, t_initial_c: T, t_final_c: T } out: { withstand_a: I, min_cmil: L^2, adequate: dimensionless }
export function computeConductorShortCircuitWithstand({ area_cmil = 0, fault_current_a = 0, clearing_time_s = 0, material = "copper", t_initial_c = 75, t_final_c = 250 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const m = _ONDERDONK[material];
  if (!m) return { error: "Material must be copper or aluminum." };
  if (!(area_cmil > 0)) return { error: "Conductor area must be positive (circular mils)." };
  if (!(fault_current_a > 0)) return { error: "Fault current must be positive (A)." };
  if (!(clearing_time_s > 0)) return { error: "Clearing time must be positive (s)." };
  if (!(t_final_c > t_initial_c)) return { error: "Final temperature must exceed the initial temperature (deg C)." };
  const C = m.K * Math.log10((t_final_c + m.B) / (t_initial_c + m.B)); // > 0 since t_final > t_initial
  const withstand_a = area_cmil * Math.sqrt(C / clearing_time_s);
  const min_cmil = fault_current_a * Math.sqrt(clearing_time_s / C);
  const adequate = withstand_a >= fault_current_a;
  return {
    C, withstand_a, min_cmil, adequate,
    note: "ICEA / Onderdonk adiabatic relation (I/A)^2 t = K log10((T2 + B)/(T1 + B)); copper K=0.0297 B=234, aluminum K=0.0125 B=228. withstand = area x sqrt(C / t); min size = fault x sqrt(t / C). A thermal-withstand SCREEN -- the protective-device clearing curve and an engineered study govern.",
  };
}
export const conductorShortCircuitWithstandExample = { inputs: { area_cmil: 26240, fault_current_a: 10000, clearing_time_s: 0.1, material: "copper", t_initial_c: 75, t_final_c: 250 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderConductorShortCircuitWithstand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ICEA P-32-382 / Onderdonk adiabatic short-circuit withstand (public-domain): (I/A)^2 t = K log10((T2+B)/(T1+B)); copper K=0.0297/B=234, aluminum K=0.0125/B=228. A thermal-withstand screen, not a substitute for the device time-current curve or an engineered study.";
  const area = makeNumber("Conductor area (circular mils)", "csw-area", { step: "any", min: "0" });
  const fault = makeNumber("Available fault current (A, symmetrical)", "csw-fault", { step: "any", min: "0" });
  const time = makeNumber("Clearing time (s)", "csw-time", { step: "any", min: "0", value: "0.1" });
  time.input.value = "0.1";
  const mat = makeSelect("Material", "csw-mat", [{ value: "copper", label: "Copper (K=0.0297, B=234)" }, { value: "aluminum", label: "Aluminum (K=0.0125, B=228)" }]);
  const ti = makeNumber("Initial temperature (deg C)", "csw-ti", { step: "any", value: "75" });
  ti.input.value = "75";
  const tf = makeNumber("Insulation short-circuit limit (deg C)", "csw-tf", { step: "any", value: "250" });
  tf.input.value = "250";
  for (const f of [area, fault, time, mat, ti, tf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "26240"; fault.input.value = "10000"; time.input.value = "0.1"; mat.select.value = "copper"; ti.input.value = "75"; tf.input.value = "250"; update(); });
  const oWith = makeOutputLine(outputRegion, "Withstand of this size", "csw-out-with");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "csw-out-verdict");
  const oMin = makeOutputLine(outputRegion, "Minimum size for the fault", "csw-out-min");
  const oNote = makeOutputLine(outputRegion, "Note", "csw-out-note");
  const update = debounce(() => {
    const r = computeConductorShortCircuitWithstand({ area_cmil: Number(area.input.value) || 0, fault_current_a: Number(fault.input.value) || 0, clearing_time_s: Number(time.input.value) || 0, material: mat.select.value, t_initial_c: Number(ti.input.value) || 0, t_final_c: Number(tf.input.value) || 0 });
    if (r.error) { oWith.textContent = r.error; oVerdict.textContent = "-"; oMin.textContent = "-"; oNote.textContent = "-"; return; }
    oWith.textContent = fmt(r.withstand_a, 0) + " A";
    oVerdict.textContent = r.adequate ? "Adequate (withstand >= fault)" : "UNDERSIZED -- size up to the minimum below";
    oMin.textContent = fmt(r.min_cmil, 0) + " circular mils minimum";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [area.input, fault.input, time.input, mat.select, ti.input, tf.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["conductor-short-circuit-withstand"] = renderConductorShortCircuitWithstand;

// dims: in { run_length_ft: L, temp_change_f: T, coeff_in_per_in_f: dimensionless, trigger_in: L } out: { delta_l_in: L, fitting_required: dimensionless }
export function computeConduitThermalExpansion({ run_length_ft = 0, temp_change_f = 0, coeff_in_per_in_f = 0.0000338, trigger_in = 0.25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(run_length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(coeff_in_per_in_f > 0)) return { error: "Coefficient of expansion must be positive (in/in/deg-F)." };
  if (!(trigger_in > 0)) return { error: "Trigger length must be positive (in)." };
  // A zero or negative temperature swing yields zero longitudinal expansion to absorb.
  const delta_l_in = Math.max(0, coeff_in_per_in_f * (run_length_ft * 12) * temp_change_f);
  const fitting_required = delta_l_in >= trigger_in;
  return {
    delta_l_in, fitting_required,
    note: "delta_L = coefficient x (run-length x 12 in/ft) x temperature swing; the bundled PVC coefficient 3.38e-5 in/in/deg-F is the public physical property underlying NEC Table 352.44. An expansion fitting is required once movement reaches the 1/4-inch trigger, sized for that travel. The AHJ and the conduit manufacturer govern.",
  };
}
export const conduitThermalExpansionExample = { inputs: { run_length_ft: 100, temp_change_f: 50, coeff_in_per_in_f: 0.0000338, trigger_in: 0.25 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderConduitThermalExpansion(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 352.44 (expansion fittings for rigid PVC conduit). delta_L = coefficient x length x temperature swing; the bundled 3.38e-5 in/in/deg-F PVC coefficient underlies NEC Table 352.44. A fitting is required at the 1/4-inch trigger. The AHJ and the manufacturer govern. Free read-only at nfpa.org/freeaccess.";
  const len = makeNumber("Straight run between anchors (ft)", "cte-len", { step: "any", min: "0" });
  const dt = makeNumber("Temperature swing (deg F)", "cte-dt", { step: "any" });
  const coeff = makeNumber("PVC coefficient (in/in/deg-F)", "cte-coeff", { step: "any", min: "0", value: "0.0000338" });
  coeff.input.value = "0.0000338";
  const trig = makeNumber("Fitting trigger (in)", "cte-trig", { step: "any", min: "0", value: "0.25" });
  trig.input.value = "0.25";
  for (const f of [len, dt, coeff, trig]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "100"; dt.input.value = "50"; coeff.input.value = "0.0000338"; trig.input.value = "0.25"; update(); });
  const oDelta = makeOutputLine(outputRegion, "Length change", "cte-out-delta");
  const oVerdict = makeOutputLine(outputRegion, "Expansion fitting", "cte-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Note", "cte-out-note");
  const update = debounce(() => {
    const r = computeConduitThermalExpansion({ run_length_ft: Number(len.input.value) || 0, temp_change_f: Number(dt.input.value) || 0, coeff_in_per_in_f: Number(coeff.input.value) || 0, trigger_in: Number(trig.input.value) || 0 });
    if (r.error) { oDelta.textContent = r.error; oVerdict.textContent = "-"; oNote.textContent = "-"; return; }
    oDelta.textContent = fmt(r.delta_l_in, 3) + " in";
    oVerdict.textContent = r.fitting_required ? "Required (sized for ~" + fmt(r.delta_l_in, 2) + " in of travel)" : "Not required (below the trigger)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [len.input, dt.input, coeff.input, trig.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["conduit-thermal-expansion"] = renderConduitThermalExpansion;

// dims: in { base_egc_cmil: L^2, base_phase_cmil: L^2, installed_phase_cmil: L^2 } out: { ratio: dimensionless, upsized_egc_cmil: L^2 }
export function computeEgcUpsizeProportional({ base_egc_cmil = 0, base_phase_cmil = 0, installed_phase_cmil = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(base_egc_cmil > 0)) return { error: "Base EGC area must be positive (circular mils)." };
  if (!(base_phase_cmil > 0)) return { error: "Base phase-conductor area must be positive (circular mils)." };
  if (!(installed_phase_cmil > 0)) return { error: "Installed phase-conductor area must be positive (circular mils)." };
  const ratio = Math.max(1, installed_phase_cmil / base_phase_cmil); // never reduce the EGC below its table size
  const upsized_egc_cmil = base_egc_cmil * ratio;
  return {
    ratio, upsized_egc_cmil,
    note: "NEC 250.122(B): when ungrounded conductors are increased in size, the EGC increases in the same circular-mil proportion. ratio = max(1, installed phase / base phase); upsized EGC = base EGC x ratio, then select the next standard AWG/kcmil at or above this. The base EGC (250.122 table) and base phase area are user-supplied; the EGC need not exceed the ungrounded conductors. The AHJ governs.",
  };
}
export const egcUpsizeProportionalExample = { inputs: { base_egc_cmil: 26240, base_phase_cmil: 167800, installed_phase_cmil: 250000 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderEgcUpsizeProportional(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 250.122(B) (increase in size of equipment grounding conductors). ratio = max(1, installed phase cmil / base phase cmil); upsized EGC = base EGC x ratio. Base EGC (250.122 table) and base phase area are user-supplied; the EGC need not exceed the ungrounded conductors. The AHJ governs. Free read-only at nfpa.org/freeaccess.";
  const egc = makeNumber("Base EGC area (cmil, per 250.122)", "egu-egc", { step: "any", min: "0" });
  const basep = makeNumber("Base (minimum) phase area (cmil)", "egu-base", { step: "any", min: "0" });
  const inst = makeNumber("Installed phase area (cmil)", "egu-inst", { step: "any", min: "0" });
  for (const f of [egc, basep, inst]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { egc.input.value = "26240"; basep.input.value = "167800"; inst.input.value = "250000"; update(); });
  const oRatio = makeOutputLine(outputRegion, "Upsize ratio", "egu-out-ratio");
  const oEgc = makeOutputLine(outputRegion, "Upsized EGC", "egu-out-egc");
  const oNote = makeOutputLine(outputRegion, "Note", "egu-out-note");
  const update = debounce(() => {
    const r = computeEgcUpsizeProportional({ base_egc_cmil: Number(egc.input.value) || 0, base_phase_cmil: Number(basep.input.value) || 0, installed_phase_cmil: Number(inst.input.value) || 0 });
    if (r.error) { oRatio.textContent = r.error; oEgc.textContent = "-"; oNote.textContent = "-"; return; }
    oRatio.textContent = fmt(r.ratio, 3) + (r.ratio <= 1 ? " (no upsize -- EGC stays at table size)" : "");
    oEgc.textContent = fmt(r.upsized_egc_cmil, 0) + " cmil (select the next standard size up)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [egc.input, basep.input, inst.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["egc-upsize-proportional"] = renderEgcUpsizeProportional;

// dims: in { configuration: dimensionless, line_voltage_v: M L^2 T^-3 I^-1, line_current_a: I, power_factor: dimensionless } out: { phase_voltage_v: M L^2 T^-3 I^-1, phase_current_a: I, power_va: M L^2 T^-3, power_w: M L^2 T^-3 }
export function computeDeltaWyeLinePhase({ configuration = "wye", line_voltage_v = 0, line_current_a = 0, power_factor = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (configuration !== "wye" && configuration !== "delta") return { error: "Configuration must be wye or delta." };
  if (!(line_voltage_v >= 0)) return { error: "Line voltage cannot be negative (V)." };
  if (!(line_current_a >= 0)) return { error: "Line current cannot be negative (A)." };
  if (!(power_factor >= 0 && power_factor <= 1)) return { error: "Power factor must be in [0, 1]." };
  const root3 = Math.sqrt(3);
  let phase_voltage_v, phase_current_a;
  if (configuration === "wye") {
    phase_voltage_v = line_voltage_v / root3;
    phase_current_a = line_current_a;
  } else {
    phase_voltage_v = line_voltage_v;
    phase_current_a = line_current_a / root3;
  }
  const power_va = root3 * line_voltage_v * line_current_a;
  const power_w = power_va * power_factor;
  return {
    configuration, phase_voltage_v, phase_current_a, power_va, power_w,
    note: "Wye: V_line = root-3 x V_phase, I_line = I_phase. Delta: V_line = V_phase, I_line = root-3 x I_phase. Connection-independent S = root-3 x V_line x I_line; P = S x PF. The equipment nameplate governs the actual connection.",
  };
}
export const deltaWyeLinePhaseExample = { inputs: { configuration: "wye", line_voltage_v: 208, line_current_a: 10, power_factor: 1 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderDeltaWyeLinePhase(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles three-phase winding relations. Wye: V_line = root-3 x V_phase, I_line = I_phase. Delta: V_line = V_phase, I_line = root-3 x I_phase. S = root-3 x V_line x I_line. The equipment nameplate governs the connection.";
  const config = makeSelect("Connection", "dwl-config", [{ value: "wye", label: "Wye (star)" }, { value: "delta", label: "Delta" }]);
  const volt = makeNumber("Line-to-line voltage (V)", "dwl-volt", { step: "any", min: "0" });
  const cur = makeNumber("Line current (A)", "dwl-cur", { step: "any", min: "0" });
  const pf = makeNumber("Power factor (0-1)", "dwl-pf", { step: "any", min: "0", max: "1", value: "1" });
  pf.input.value = "1";
  for (const f of [config, volt, cur, pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { config.select.value = "wye"; volt.input.value = "208"; cur.input.value = "10"; pf.input.value = "1"; update(); });
  const oPv = makeOutputLine(outputRegion, "Phase (winding) voltage", "dwl-out-pv");
  const oPi = makeOutputLine(outputRegion, "Phase (winding) current", "dwl-out-pi");
  const oVa = makeOutputLine(outputRegion, "Apparent power", "dwl-out-va");
  const oW = makeOutputLine(outputRegion, "Real power", "dwl-out-w");
  const oNote = makeOutputLine(outputRegion, "Note", "dwl-out-note");
  const update = debounce(() => {
    const r = computeDeltaWyeLinePhase({ configuration: config.select.value, line_voltage_v: Number(volt.input.value) || 0, line_current_a: Number(cur.input.value) || 0, power_factor: Number(pf.input.value) || 0 });
    if (r.error) { oPv.textContent = r.error; oPi.textContent = "-"; oVa.textContent = "-"; oW.textContent = "-"; oNote.textContent = "-"; return; }
    oPv.textContent = fmt(r.phase_voltage_v, 1) + " V";
    oPi.textContent = fmt(r.phase_current_a, 1) + " A";
    oVa.textContent = fmt(r.power_va, 0) + " VA";
    oW.textContent = fmt(r.power_w, 0) + " W";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [config.select, volt.input, cur.input, pf.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["delta-wye-line-phase"] = renderDeltaWyeLinePhase;

// =====================================================================
// spec-v165 - Group A: Electrical (1 tile)
// Buck-boost (autotransformer) sizing from a voltage correction and load.
// =====================================================================

// dims: in { supply_v: M L^2 T^-3 I^-1, desired_v: M L^2 T^-3 I^-1, load_a: I } out: { boost_v: M L^2 T^-3 I^-1, load_kva: M L^2 T^-3, xfmr_kva: M L^2 T^-3, ratio_pct: dimensionless }
export function computeBuckBoostSizing({ supply_v = 0, desired_v = 0, load_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sup = Number(supply_v) || 0;
  const des = Number(desired_v) || 0;
  const amp = Number(load_a) || 0;
  if (!(sup > 0)) return { error: "Supply voltage must be positive." };
  if (!(des > 0)) return { error: "Desired (load) voltage must be positive." };
  if (!(amp > 0)) return { error: "Load current must be positive." };

  const boost_v = des - sup;                 // + = boost, - = buck
  const load_kva = des * amp / 1000;         // full load, for reference
  const xfmr_kva = Math.abs(boost_v) * amp / 1000;  // the autotransformer rating
  const ratio_pct = load_kva > 0 ? xfmr_kva / load_kva * 100 : null;
  const direction = boost_v > 0 ? "boost" : boost_v < 0 ? "buck" : "none";

  const notes = [];
  if (boost_v === 0) {
    notes.push("The supply already equals the desired voltage; no buck-boost transformer is needed.");
  } else {
    notes.push("The autotransformer is rated only for the " + direction + " voltage times the load current, a fraction of the full load kVA - that is the point of the connection. Select the next standard catalog kVA at or above this figure.");
  }
  notes.push("Buck-boost selection, the connection diagram, and the overcurrent protection are the manufacturer's and the AHJ's. This sizes the required kVA; it does not select a catalog unit or its protection. NEC Article 450 governs.");

  return {
    boost_v: Number.isFinite(boost_v) ? boost_v : null,
    direction,
    load_kva: Number.isFinite(load_kva) ? load_kva : null,
    xfmr_kva: Number.isFinite(xfmr_kva) ? xfmr_kva : null,
    ratio_pct: Number.isFinite(ratio_pct) ? ratio_pct : null,
    notes,
  };
}
export const buckBoostSizingExample = { inputs: { supply_v: 208, desired_v: 230, load_a: 50 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v165renderBuckBoostSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Single-phase buck-boost (autotransformer) sizing - the unit is rated for the boost/buck voltage (desired minus supply) times the load current, a fraction of the full load kVA. NEC 2023 Article 450 (transformers); the autotransformer connection, taps, and overcurrent protection are the manufacturer's and the AHJ's. Free at nfpa.org/freeaccess.";
  const sup = makeNumber("Supply (line) voltage (V)", "bb-sup", { step: "any", min: "0" });
  const des = makeNumber("Desired (load) voltage (V)", "bb-des", { step: "any", min: "0" });
  const amp = makeNumber("Load current (A)", "bb-amp", { step: "any", min: "0" });
  for (const f of [sup, des, amp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sup.input.value = "208"; des.input.value = "230"; amp.input.value = "50"; update(); });

  const oBoost = makeOutputLine(outputRegion, "Boost / buck amount (V)", "bb-out-boost");
  const oXfmr = makeOutputLine(outputRegion, "Autotransformer rating (kVA)", "bb-out-xfmr");
  const oLoad = makeOutputLine(outputRegion, "Full load (kVA, reference)", "bb-out-load");
  const oNote = makeOutputLine(outputRegion, "Notes", "bb-out-note");

  const update = debounce(() => {
    const r = computeBuckBoostSizing({
      supply_v: Number(sup.input.value) || 0,
      desired_v: Number(des.input.value) || 0,
      load_a: Number(amp.input.value) || 0,
    });
    if (r.error) { oBoost.textContent = r.error; oXfmr.textContent = "-"; oLoad.textContent = "-"; oNote.textContent = ""; return; }
    oBoost.textContent = fmt(r.boost_v, 1) + " V (" + r.direction + ")";
    oXfmr.textContent = fmt(r.xfmr_kva, 2) + " kVA (" + fmt(r.ratio_pct, 1) + "% of full load)";
    oLoad.textContent = fmt(r.load_kva, 2) + " kVA";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [sup.input, des.input, amp.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["buck-boost-sizing"] = _v165renderBuckBoostSizing;

// =====================================================================
// spec-v170 - Group A: Electrical (1 tile)
// Metal wireway / auxiliary gutter 20% fill and 30-conductor count (376.22).
// =====================================================================

// dims: in { width_in: L, height_in: L, conductor_area_in2: L^2, ccc_count: dimensionless } out: { interior_in2: L^2, allowed_in2: L^2, used_pct: dimensionless }
export function computeWirewayFill({ width_in = 0, height_in = 0, conductor_area_in2 = 0, ccc_count = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(width_in) || 0;
  const h = Number(height_in) || 0;
  const ca = Number(conductor_area_in2) || 0;
  const n = Number(ccc_count) || 0;
  if (!(w > 0)) return { error: "Wireway interior width must be positive." };
  if (!(h > 0)) return { error: "Wireway interior height must be positive." };
  if (ca < 0) return { error: "Conductor area must be non-negative." };

  const interior_in2 = w * h;
  const allowed_in2 = 0.20 * interior_in2;
  const used_pct = interior_in2 > 0 ? ca / interior_in2 * 100 : null;
  const area_ok = ca <= allowed_in2;
  const over_30 = n > 30;
  const count_note = over_30
    ? "Over 30 current-carrying conductors: apply the 310.15(C)(1) ampacity adjustment (this is an adjustment trigger, not a prohibition)."
    : "At or under 30 current-carrying conductors: no ampacity adjustment from the wireway count.";
  return {
    interior_in2,
    allowed_in2,
    used_pct: Number.isFinite(used_pct) ? used_pct : null,
    area_ok,
    over_30,
    count_note,
    note: "NEC 376.22: conductor cross-section no more than 20% of the wireway interior; the same 20% rule applies to auxiliary gutters (366.22). The 30-conductor limit excludes signal and certain conductors per the article exceptions. The AHJ governs.",
  };
}
export const wirewayFillExample = { inputs: { width_in: 4, height_in: 4, conductor_area_in2: 2.5, ccc_count: 18 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v170renderWirewayFill(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 376.22 (metal wireways) - conductor fill no more than 20% of the interior cross-section, and the 30 current-carrying conductor threshold for 310.15(C)(1) ampacity adjustment. The same 20% rule applies to auxiliary gutters (366.22). The AHJ governs. Free at nfpa.org/freeaccess.";
  const w = makeNumber("Interior width (in)", "ww-w", { step: "any", min: "0" });
  const h = makeNumber("Interior height (in)", "ww-h", { step: "any", min: "0" });
  const ca = makeNumber("Total conductor area (in^2, Ch.9 Table 5)", "ww-ca", { step: "any", min: "0" });
  const n = makeNumber("Current-carrying conductors", "ww-n", { step: "1", min: "0" });
  for (const f of [w, h, ca, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "4"; h.input.value = "4"; ca.input.value = "2.5"; n.input.value = "18"; update(); });

  const oInt = makeOutputLine(outputRegion, "Interior area (in^2)", "ww-out-int");
  const oAllow = makeOutputLine(outputRegion, "Allowed fill (20%, in^2)", "ww-out-allow");
  const oUsed = makeOutputLine(outputRegion, "Used fill", "ww-out-used");
  const oCount = makeOutputLine(outputRegion, "Conductor count", "ww-out-count");
  const oNote = makeOutputLine(outputRegion, "Note", "ww-out-note");

  const update = debounce(() => {
    const r = computeWirewayFill({
      width_in: Number(w.input.value) || 0,
      height_in: Number(h.input.value) || 0,
      conductor_area_in2: Number(ca.input.value) || 0,
      ccc_count: Number(n.input.value) || 0,
    });
    if (r.error) { oInt.textContent = r.error; oAllow.textContent = "-"; oUsed.textContent = "-"; oCount.textContent = "-"; oNote.textContent = ""; return; }
    oInt.textContent = fmt(r.interior_in2, 2) + " in^2";
    oAllow.textContent = fmt(r.allowed_in2, 2) + " in^2";
    oUsed.textContent = fmt(r.used_pct, 1) + "% - " + (r.area_ok ? "within the 20% fill" : "OVER the 20% fill, increase the wireway");
    oCount.textContent = r.count_note;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [w.input, h.input, ca.input, n.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["wireway-fill"] = _v170renderWirewayFill;

// =====================================================================
// spec-v174 - Group A: Electrical (1 tile)
// Rooftop conduit sunlight ambient adder (310.15(B)(2)) + corrected ampacity.
// Reuses the module-level _AMBIENT_FACTORS[90] correction table.
// =====================================================================

// dims: in { measured_ambient_f: T, height_above_roof_in: L, base_ampacity_a: I } out: { adder_f: T, design_ambient_f: T, correction: dimensionless, corrected_a: I }
export function computeRooftopTempAdder({ measured_ambient_f = 0, height_above_roof_in = 0, base_ampacity_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ambF = Number(measured_ambient_f);
  const ht = Number(height_above_roof_in);
  const base = Number(base_ampacity_a) || 0;
  if (!Number.isFinite(ambF)) return { error: "Measured ambient is required (deg-F)." };
  if (!(ht >= 0)) return { error: "Height above roof must be non-negative (in)." };
  if (!(base > 0)) return { error: "Base ampacity (90 C column) must be positive." };

  const adder_f = ht < 0.875 ? 60 : 0;             // 7/8 in = 0.875 in threshold; 60 deg-F = 33 deg-C
  const design_ambient_f = ambF + adder_f;
  const design_ambient_c = (design_ambient_f - 32) * 5 / 9;
  // 90 C-column ambient correction factor (310.15(B)(1)), step table on the C value.
  let correction = null;
  for (const [maxC, f] of _AMBIENT_FACTORS[90]) { if (design_ambient_c <= maxC) { correction = f; break; } }
  if (correction === null) {
    const topBound = _AMBIENT_FACTORS[90][_AMBIENT_FACTORS[90].length - 1][0];
    return { error: "Design ambient " + Math.round(design_ambient_c) + " C exceeds the 90 C column's bundled range (top " + topBound + " C); a hotter rooftop ambient leaves no usable ampacity in this column." };
  }
  const corrected_a = base * correction;
  return {
    adder_f,
    design_ambient_f: Number.isFinite(design_ambient_f) ? design_ambient_f : null,
    design_ambient_c: Number.isFinite(design_ambient_c) ? design_ambient_c : null,
    correction,
    corrected_a: Number.isFinite(corrected_a) ? corrected_a : null,
    note: "NEC 310.15(B)(2): where a raceway or cable is exposed to sunlight on or above a rooftop and is less than 7/8 in (0.875 in) above the roof, add 33 deg-C (60 deg-F) to the outdoor ambient before the temperature-correction step. Standoffs raising the raceway at or above 7/8 in remove the adder. The corrected ampacity feeds the rest of the sizing (see ambient-ampacity-adjust). The AHJ-adopted edition governs.",
  };
}
export const rooftopTempAdderExample = { inputs: { measured_ambient_f: 95, height_above_roof_in: 0, base_ampacity_a: 55 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v174renderRooftopTempAdder(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 310.15(B)(2) (raceways and cables exposed to sunlight on or above rooftops) - a 33 deg-C (60 deg-F) adder to the ambient where the raceway is less than 7/8 in above the roof, then the 90 C-column temperature correction. The AHJ-adopted NEC edition governs. Free at nfpa.org/freeaccess.";
  const amb = makeNumber("Measured outdoor ambient (deg-F)", "rt-amb", { step: "any" });
  const ht = makeNumber("Height above roof (in)", "rt-ht", { step: "any", min: "0" });
  const base = makeNumber("Base ampacity (A, 90 C column)", "rt-base", { step: "any", min: "0" });
  for (const f of [amb, ht, base]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { amb.input.value = "95"; ht.input.value = "0"; base.input.value = "55"; update(); });

  const oAdder = makeOutputLine(outputRegion, "Sunlight adder", "rt-out-adder");
  const oDesign = makeOutputLine(outputRegion, "Design ambient", "rt-out-design");
  const oCorr = makeOutputLine(outputRegion, "90 C correction factor", "rt-out-corr");
  const oCorrected = makeOutputLine(outputRegion, "Corrected ampacity (A)", "rt-out-corrected");
  const oNote = makeOutputLine(outputRegion, "Note", "rt-out-note");

  const update = debounce(() => {
    const r = computeRooftopTempAdder({
      measured_ambient_f: amb.input.value === "" ? NaN : Number(amb.input.value),
      height_above_roof_in: Number(ht.input.value) || 0,
      base_ampacity_a: Number(base.input.value) || 0,
    });
    if (r.error) { oAdder.textContent = r.error; oDesign.textContent = "-"; oCorr.textContent = "-"; oCorrected.textContent = "-"; oNote.textContent = ""; return; }
    oAdder.textContent = r.adder_f === 0 ? "0 deg-F (on standoffs, >= 7/8 in)" : "+" + fmt(r.adder_f, 0) + " deg-F (within 7/8 in of the roof)";
    oDesign.textContent = fmt(r.design_ambient_f, 0) + " deg-F (~" + fmt(r.design_ambient_c, 0) + " deg-C)";
    oCorr.textContent = fmt(r.correction, 2);
    oCorrected.textContent = fmt(r.corrected_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [amb.input, ht.input, base.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["rooftop-temp-adder"] = _v174renderRooftopTempAdder;

// =====================================================================
// spec-v176 - Group A: Electrical (1 tile)
// NEC 110.26(A) working-space clearance reference lookup.
// =====================================================================

const _WORKING_SPACE_DEPTH = {
  "0-150 V": { 1: 3.0, 2: 3.0, 3: 3.0 },
  "151-600 V": { 1: 3.0, 2: 3.5, 3: 4.0 },
};

// dims: in { nominal_v_to_ground: dimensionless, condition: dimensionless, equipment_width_in: L } out: { depth_ft: L, width_in: L, height_ft: L }
export function computeWorkingSpace11026({ nominal_v_to_ground = "0-150 V", condition = 1, equipment_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const band = _WORKING_SPACE_DEPTH[nominal_v_to_ground];
  if (!band) return { error: "Voltage band must be \"0-150 V\" or \"151-600 V\"." };
  const cond = Number(condition) || 0;
  const depth_ft = band[cond];
  if (depth_ft === undefined) return { error: "Condition must be 1, 2, or 3." };
  const w = Number(equipment_width_in) || 0;
  if (w < 0) return { error: "Equipment width must be non-negative (in)." };
  const width_in = Math.max(30, w);
  const height_ft = 6.5;
  return {
    depth_ft,
    width_in,
    height_ft,
    width_governed_by: width_in > 30 ? "equipment width" : "30 in minimum",
    note: "NEC 110.26(A): the depth is measured from the live parts; Condition 1 = no grounded or exposed-live parts opposite, Condition 2 = a grounded surface opposite (concrete, brick, tile), Condition 3 = exposed live parts on both sides. The width is the greater of 30 in or the equipment width, the headroom is 6.5 ft (or equipment height if greater), and the space must allow a 90-degree door swing. 110.26(E) adds the dedicated equipment space. The AHJ governs.",
  };
}
export const workingSpace11026Example = { inputs: { nominal_v_to_ground: "151-600 V", condition: 2, equipment_width_in: 24 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v176renderWorkingSpace11026(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 110.26(A) (working space) and 110.26(E) (dedicated equipment space) - the depth by voltage-to-ground and condition, the 30 in (or equipment-width) clearance, and the 6.5 ft headroom, with a required 90-degree door swing. The AHJ governs. Free at nfpa.org/freeaccess.";
  const band = makeSelect("Nominal voltage to ground", "ws-band", [
    { value: "0-150 V", label: "0-150 V (e.g. 120/208Y)" },
    { value: "151-600 V", label: "151-600 V (e.g. 277/480Y)" },
  ]);
  const cond = makeSelect("Condition (what is opposite the live parts)", "ws-cond", [
    { value: "1", label: "Condition 1 - nothing live/grounded opposite" },
    { value: "2", label: "Condition 2 - grounded surface opposite" },
    { value: "3", label: "Condition 3 - live parts both sides" },
  ]);
  const w = makeNumber("Equipment width (in)", "ws-w", { step: "any", min: "0", value: "24" });
  w.input.value = "24";
  for (const f of [band, cond, w]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { band.select.value = "151-600 V"; cond.select.value = "2"; w.input.value = "24"; update(); });

  const oDepth = makeOutputLine(outputRegion, "Working depth (ft)", "ws-out-depth");
  const oWidth = makeOutputLine(outputRegion, "Working width (in)", "ws-out-width");
  const oHeight = makeOutputLine(outputRegion, "Headroom (ft)", "ws-out-height");
  const oNote = makeOutputLine(outputRegion, "Note", "ws-out-note");

  const update = debounce(() => {
    const r = computeWorkingSpace11026({
      nominal_v_to_ground: band.select.value,
      condition: Number(cond.select.value),
      equipment_width_in: Number(w.input.value) || 0,
    });
    if (r.error) { oDepth.textContent = r.error; oWidth.textContent = "-"; oHeight.textContent = "-"; oNote.textContent = ""; return; }
    oDepth.textContent = fmt(r.depth_ft, 1) + " ft";
    oWidth.textContent = fmt(r.width_in, 0) + " in (" + r.width_governed_by + ")";
    oHeight.textContent = fmt(r.height_ft, 1) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [band.select, cond.select, w.input]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["working-space-110-26"] = _v176renderWorkingSpace11026;

// =====================================================================
// spec-v179 - Group A: Electrical (1 tile)
// Motor branch-circuit short-circuit / ground-fault protective device
// maximum (NEC 430.52, Table 430.52) and disconnect rating (430.110).
// =====================================================================

// NEC 240.6(A) standard overcurrent-device ampere ratings (used for the
// 430.52(C)(1) Exception 1 round-up to the next standard size).
const _STD_OCPD_240_6 = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200,
  225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000,
  2500, 3000, 4000, 5000, 6000,
];
// NEC Table 430.52 max % of FLC by device type (squirrel-cage / synchronous,
// other than Design B energy-efficient).
const _MOTOR_OCPD_MULT = {
  "inverse-time breaker": 2.50,
  "dual-element/time-delay fuse": 1.75,
  "nontime-delay fuse": 3.00,
  "instantaneous-trip breaker": 8.00,
};

// dims: in { flc_a: I, device_type: dimensionless } out: { multiplier: dimensionless, max_ocpd_a: I, max_ocpd_std_a: I, min_disconnect_a: I }
export function computeMotorBranchProtection({ flc_a = 0, device_type = "inverse-time breaker" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flc = Number(flc_a) || 0;
  if (!(flc > 0)) return { error: "Motor full-load current must be positive (A)." };
  const multiplier = _MOTOR_OCPD_MULT[device_type];
  if (multiplier === undefined) return { error: "Device type must be inverse-time breaker, dual-element/time-delay fuse, nontime-delay fuse, or instantaneous-trip breaker." };
  const max_ocpd_a = flc * multiplier;
  // 430.52(C)(1) Exception 1: where the calculated value does not correspond
  // to a standard rating, the next higher standard size (240.6) is permitted.
  const next_std = _STD_OCPD_240_6.find((s) => s >= max_ocpd_a);
  const is_standard = _STD_OCPD_240_6.some((s) => Math.abs(s - max_ocpd_a) < 1e-9);
  const max_ocpd_std_a = next_std ?? max_ocpd_a;
  const min_disconnect_a = 1.15 * flc;
  return {
    multiplier,
    max_ocpd_a,
    max_ocpd_std_a,
    rounded_up: !is_standard,
    min_disconnect_a,
    note: "NEC 430.52 / Table 430.52: the figure is the maximum branch-circuit short-circuit and ground-fault device, sized on the table FLC (430.6(A)), not nameplate; it protects against short-circuit/ground-fault only -- motor overload is sized separately (430.32, see motor-branch-from-nameplate). Exception 1 permits rounding up to the next standard size (240.6); Exception 2 permits a further increase if the motor will not start. The disconnect (430.110(A)) is rated at least 115% of FLC and carries an HP rating at or above the motor HP. The shown values are squirrel-cage/induction; the AHJ and the table govern.",
  };
}
export const motorBranchProtectionExample = { inputs: { flc_a: 28, device_type: "inverse-time breaker" } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v179renderMotorBranchProtection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 430.52 and Table 430.52 (branch-circuit short-circuit and ground-fault protection) with 430.110 (disconnect ampere rating). Sized on the table FLC (430.6(A)); overload is separate (430.32). The AHJ governs. Free at nfpa.org/freeaccess.";
  const flc = makeNumber("Motor full-load current FLC (A, from Table 430.247-250)", "mbp-flc", { step: "any", min: "0", value: "28" });
  flc.input.value = "28";
  const dev = makeSelect("Protective device type", "mbp-dev", [
    { value: "inverse-time breaker", label: "Inverse-time breaker (250%)" },
    { value: "dual-element/time-delay fuse", label: "Dual-element / time-delay fuse (175%)" },
    { value: "nontime-delay fuse", label: "Nontime-delay fuse (300%)" },
    { value: "instantaneous-trip breaker", label: "Instantaneous-trip breaker (800%)" },
  ]);
  for (const f of [flc, dev]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flc.input.value = "28"; dev.select.value = "inverse-time breaker"; update(); });

  const oMult = makeOutputLine(outputRegion, "Table 430.52 multiplier", "mbp-out-mult");
  const oMax = makeOutputLine(outputRegion, "Max OCPD (calculated)", "mbp-out-max");
  const oStd = makeOutputLine(outputRegion, "Max standard size (240.6)", "mbp-out-std");
  const oDisc = makeOutputLine(outputRegion, "Min disconnect (115% FLC)", "mbp-out-disc");
  const oNote = makeOutputLine(outputRegion, "Note", "mbp-out-note");

  const update = debounce(() => {
    const r = computeMotorBranchProtection({ flc_a: Number(flc.input.value) || 0, device_type: dev.select.value });
    if (r.error) { oMult.textContent = r.error; oMax.textContent = "-"; oStd.textContent = "-"; oDisc.textContent = "-"; oNote.textContent = ""; return; }
    oMult.textContent = fmt(r.multiplier * 100, 0) + "% of FLC";
    oMax.textContent = fmt(r.max_ocpd_a, 1) + " A";
    oStd.textContent = fmt(r.max_ocpd_std_a, 0) + " A" + (r.rounded_up ? " (rounded up, Exc. 1)" : " (standard)");
    oDisc.textContent = fmt(r.min_disconnect_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [flc.input, dev.select]) el.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["motor-branch-protection"] = _v179renderMotorBranchProtection;

// =====================================================================
// spec-v185 - Group A: Electrical (1 tile)
// Cumulative conduit bend degrees vs the 360-degree limit between pull
// points (NEC 358.26 and the matching Chapter 3 .26 sections).
// =====================================================================

// dims: in { bend1_deg: dimensionless, bend2_deg: dimensionless, bend3_deg: dimensionless, bend4_deg: dimensionless, bend5_deg: dimensionless, bend6_deg: dimensionless } out: { total_deg: dimensionless, quarter_bends_eq: dimensionless }
export function computeBendsBetweenPulls({ bend1_deg = 0, bend2_deg = 0, bend3_deg = 0, bend4_deg = 0, bend5_deg = 0, bend6_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bends = [bend1_deg, bend2_deg, bend3_deg, bend4_deg, bend5_deg, bend6_deg].map((b) => Number(b) || 0);
  if (bends.some((b) => b < 0)) return { error: "Bend angles must be non-negative (deg)." };
  const total_deg = bends.reduce((a, b) => a + b, 0);
  const quarter_bends_eq = total_deg / 90;
  const within = total_deg <= 360;
  return {
    total_deg,
    quarter_bends_eq,
    within_limit: within,
    verdict: within ? "Within the 360-degree limit; no intervening pull point required by this rule." : "Over 360 degrees; insert a pull point (box or conduit body) to break the run.",
    note: "NEC 358.26 (EMT) and the matching .26 sections of the other Chapter 3 raceway articles: no run between pull points (boxes, conduit bodies, fittings) may contain more than 360 degrees total bend (four quarter bends). An offset counts both of its bends; a saddle counts all three. Equivalent quarter bends = total / 90. The AHJ governs.",
  };
}
export const bendsBetweenPullsExample = { inputs: { bend1_deg: 90, bend2_deg: 90, bend3_deg: 45, bend4_deg: 45, bend5_deg: 0, bend6_deg: 0 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v185renderBendsBetweenPulls(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 358.26 (EMT) and the matching .26 sections of the Chapter 3 raceway articles - no more than 360 degrees of total bend (four quarter bends) between pull points. Offsets and saddles count every bend they contain. The AHJ governs. Free at nfpa.org/freeaccess.";
  const fields = [];
  const defaults = ["90", "90", "45", "45", "0", "0"];
  for (let i = 0; i < 6; i++) {
    const f = makeNumber("Bend " + (i + 1) + " (deg)", "bbp-" + i, { step: "any", min: "0", value: defaults[i] });
    f.input.value = defaults[i];
    fields.push(f);
    inputRegion.appendChild(f.wrap);
  }
  attachExampleButton(inputRegion, () => { fields.forEach((f, i) => { f.input.value = defaults[i]; }); update(); });

  const oTotal = makeOutputLine(outputRegion, "Total bend (deg)", "bbp-out-total");
  const oQuarter = makeOutputLine(outputRegion, "Equivalent quarter bends", "bbp-out-quarter");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "bbp-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Note", "bbp-out-note");

  const update = debounce(() => {
    const r = computeBendsBetweenPulls({
      bend1_deg: Number(fields[0].input.value) || 0, bend2_deg: Number(fields[1].input.value) || 0,
      bend3_deg: Number(fields[2].input.value) || 0, bend4_deg: Number(fields[3].input.value) || 0,
      bend5_deg: Number(fields[4].input.value) || 0, bend6_deg: Number(fields[5].input.value) || 0,
    });
    if (r.error) { oTotal.textContent = r.error; oQuarter.textContent = "-"; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    oTotal.textContent = fmt(r.total_deg, 0) + " deg";
    oQuarter.textContent = fmt(r.quarter_bends_eq, 2);
    oVerdict.textContent = r.verdict;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of fields) f.input.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["bends-between-pulls"] = _v185renderBendsBetweenPulls;

// =====================================================================
// spec-v186 - Group A: Electrical (1 tile)
// NFPA 70E Table 130.4 shock approach boundary reference (AC).
// =====================================================================

// NFPA 70E Table 130.4 (AC) shock approach boundaries, by nominal
// phase-to-phase voltage band. Values as ft-in text; "N/A" where the
// table specifies no boundary.
const _SHOCK_BOUNDARIES = {
  "<50 V": { limited_movable: "N/A", limited_fixed: "N/A", restricted: "N/A" },
  "50-150 V": { limited_movable: "10 ft 0 in", limited_fixed: "3 ft 6 in", restricted: "Avoid contact" },
  "151-750 V": { limited_movable: "10 ft 0 in", limited_fixed: "3 ft 6 in", restricted: "1 ft 0 in" },
  "751-15,000 V": { limited_movable: "10 ft 0 in", limited_fixed: "5 ft 0 in", restricted: "2 ft 2 in" },
};

// dims: in { nominal_v_ac: dimensionless } out: { restricted: dimensionless }
export function computeShockApproachBoundary({ nominal_v_ac = "151-750 V" } = {}) {
  const row = _SHOCK_BOUNDARIES[nominal_v_ac];
  if (!row) return { error: "Voltage band must be \"<50 V\", \"50-150 V\", \"151-750 V\", or \"751-15,000 V\"." };
  const no_boundary = nominal_v_ac === "<50 V";
  return {
    limited_movable: row.limited_movable,
    limited_fixed: row.limited_fixed,
    restricted: row.restricted,
    no_boundary,
    note: no_boundary
      ? "NFPA 70E Table 130.4: below 50 V (AC) no shock approach boundary is specified, though a risk assessment still applies."
      : "NFPA 70E Table 130.4 (AC): the limited approach boundary protects unqualified persons (the larger distance applies to an exposed movable conductor). Crossing the restricted approach boundary requires a qualified person, an energized-work permit, and shock PPE. These are shock boundaries only -- the arc-flash boundary is a separate determination (see arc-flash-screen). The employer's safety program and 70E govern.",
  };
}
export const shockApproachBoundaryExample = { inputs: { nominal_v_ac: "151-750 V" } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v186renderShockApproachBoundary(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NFPA 70E-2024 Table 130.4 (AC shock approach boundaries) - limited approach (movable vs fixed) and restricted approach by nominal voltage. Shock boundaries only; the arc-flash boundary is separate. The employer's electrical safety program and 70E govern. Free at nfpa.org/freeaccess.";
  const band = makeSelect("Nominal voltage (phase-to-phase, AC)", "sab-band", [
    { value: "<50 V", label: "<50 V" },
    { value: "50-150 V", label: "50-150 V" },
    { value: "151-750 V", label: "151-750 V (e.g. 480 V)" },
    { value: "751-15,000 V", label: "751 V - 15 kV" },
  ]);
  band.select.value = "151-750 V";
  inputRegion.appendChild(band.wrap);
  attachExampleButton(inputRegion, () => { band.select.value = "151-750 V"; refresh(); });

  const oMov = makeOutputLine(outputRegion, "Limited approach - movable conductor", "sab-out-mov");
  const oFix = makeOutputLine(outputRegion, "Limited approach - fixed circuit part", "sab-out-fix");
  const oRes = makeOutputLine(outputRegion, "Restricted approach", "sab-out-res");
  const oNote = makeOutputLine(outputRegion, "Note", "sab-out-note");

  function refresh() {
    const r = computeShockApproachBoundary({ nominal_v_ac: band.select.value });
    if (r.error) { oMov.textContent = r.error; oFix.textContent = "-"; oRes.textContent = "-"; oNote.textContent = ""; return; }
    oMov.textContent = r.limited_movable;
    oFix.textContent = r.limited_fixed;
    oRes.textContent = r.restricted;
    oNote.textContent = r.note;
  }
  band.select.addEventListener("change", refresh);
}
ELECTRICAL_RENDERERS["shock-approach-boundary"] = _v186renderShockApproachBoundary;

// ===================== spec-v374: conduit jam ratio (Group A) =====================
// The conduit-fill tile checks cross-sectional area, but three same-size
// conductors can jam in a bend when the conduit ID / conductor OD ratio lands
// in a narrow band around 3.0 (they triangulate and wedge). The 100th tile of
// the v275-v374 campaign.

// dims: in { conduit_id_in: L, conductor_od_in: L, n_conductors: dimensionless } out: { ratio: dimensionless, jam_prone: dimensionless }
export function computeConduitJamRatio({ conduit_id_in = 0, conductor_od_in = 0, n_conductors = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const id = Number(conduit_id_in) || 0;
  const od = Number(conductor_od_in) || 0;
  const n = Number(n_conductors) || 0;
  if (!(id > 0)) return { error: "Conduit inside diameter must be positive (in)." };
  if (!(od > 0)) return { error: "Conductor outside diameter must be positive (in)." };
  if (!(od < id)) return { error: "Conductor OD must be smaller than the conduit ID." };
  if (!(n >= 1)) return { error: "Number of conductors must be at least 1." };
  const ratio = id / od;
  const in_band = ratio >= 2.8 && ratio <= 3.2;
  const jam_prone = n === 3 && in_band;
  return {
    ratio, in_band, jam_prone, n,
    note: "Conduit jamming: three same-size conductors can wedge (triangulate) in a bend when the conduit ID / conductor OD ratio falls in the narrow band from about 2.8 to 3.2 - the geometry where they lock rather than slide past each other. It applies at EXACTLY three conductors; two or four+ do not triangulate the same way, so the count matters as much as the ratio. Use the NEC Chapter 9 Table 4 conduit ID and Table 5 conductor OD. A jam-prone ratio is a caution to plan the pull (lube, feed order) or upsize the conduit, not a code violation. A design aid; the NEC and the AHJ govern.",
  };
}
export const conduitJamRatioExample = { inputs: { conduit_id_in: 2.067, conductor_od_in: 0.65, n_conductors: 3 } };
function _v374renderConduitJamRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: conduit jam ratio = conduit ID / conductor OD; jamming risk for exactly three same-size conductors when the ratio is ~2.8-3.2, a widely-referenced NEC Chapter 9 pulling guideline (Table 4 conduit ID, Table 5 conductor OD). A caution, not a code limit; the NEC and the AHJ govern.";
  const id = makeNumber("Conduit inside diameter (in, NEC Ch.9 Table 4)", "cjr-id", { step: "any", min: "0" }); id.input.value = "2.067";
  const od = makeNumber("Conductor outside diameter (in, Table 5)", "cjr-od", { step: "any", min: "0" }); od.input.value = "0.65";
  const n = makeNumber("Number of conductors", "cjr-n", { step: "1", min: "1" }); n.input.value = "3";
  for (const f of [id, od, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { id.input.value = "2.067"; od.input.value = "0.65"; n.input.value = "3"; update(); });
  const oRatio = makeOutputLine(outputRegion, "Jam ratio (ID / OD)", "cjr-out-ratio");
  const oVerdict = makeOutputLine(outputRegion, "Jam risk", "cjr-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Note", "cjr-out-note");
  const update = debounce(() => {
    const r = computeConduitJamRatio({ conduit_id_in: Number(id.input.value) || 0, conductor_od_in: Number(od.input.value) || 0, n_conductors: Number(n.input.value) || 0 });
    if (r.error) { oRatio.textContent = r.error; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    oRatio.textContent = fmt(r.ratio, 2) + (r.in_band ? " (in the 2.8-3.2 jam band)" : " (outside the 2.8-3.2 band)");
    oVerdict.textContent = r.jam_prone
      ? "JAM-PRONE -- three conductors at a jam-band ratio; plan the pull or upsize the conduit"
      : (r.n === 3 ? "Not jam-prone (ratio outside the band)" : "Not jam-prone (jamming needs exactly 3 conductors; this is " + r.n + ")");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [id, od, n]) f.input.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["conduit-jam-ratio"] = _v374renderConduitJamRatio;

// ===================== spec-v471: premium motor upgrade energy savings =====================
// dims: in { hp: dimensionless, load: dimensionless, eff_standard: dimensionless, eff_premium: dimensionless, hours: dimensionless, rate_kwh: dimensionless } out: { kw_standard: dimensionless, kw_premium: dimensionless, annual_saving: dimensionless }
export function computeMotorEfficiencyUpgradeSavings({ hp = 0, load = 0, eff_standard = 0, eff_premium = 0, hours = 0, rate_kwh = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(hp) || 0;
  const ld = Number(load) || 0;
  const es = Number(eff_standard) || 0;
  const ep = Number(eff_premium) || 0;
  const hr = Number(hours) || 0;
  const rate = Number(rate_kwh) || 0;
  if (!(h > 0)) return { error: "Horsepower must be positive." };
  if (!(ld > 0 && ld <= 1)) return { error: "Load fraction must be between 0 and 1." };
  if (!(es > 0 && es <= 1)) return { error: "Standard efficiency must be a fraction in (0, 1]." };
  if (!(ep > 0 && ep <= 1)) return { error: "Premium efficiency must be a fraction in (0, 1]." };
  if (!(hr > 0)) return { error: "Annual run hours must be positive." };
  if (rate < 0) return { error: "Electricity rate must be non-negative." };
  const kw_standard = h * 0.746 * ld / es;
  const kw_premium = h * 0.746 * ld / ep;
  const kw_saved = kw_standard - kw_premium;
  const annual_kwh_saved = kw_saved * hr;
  const annual_saving = annual_kwh_saved * rate;
  return {
    kw_standard, kw_premium, kw_saved, annual_kwh_saved, annual_saving,
    note: "Premium-motor upgrade energy saving: a motor's input power = HP x 0.746 x load / efficiency, so a more efficient motor draws less input for the same shaft work. The saving = (input at the old efficiency - input at the new) x annual run hours x the energy rate. Because the efficiency gap acts on the input power, the saving grows with load, run hours, and rate: a lightly loaded or seldom-run motor may never pay back the premium, while a fully loaded, always-on motor pays quickly. This is the energy charge only; the utility tariff (demand, time-of-use, power factor) and any utility rebate change the payback. A screening estimate, not a metered M&V.",
  };
}
export const motorEfficiencyUpgradeSavingsExample = { inputs: { hp: 50, load: 0.75, eff_standard: 0.90, eff_premium: 0.945, hours: 4000, rate_kwh: 0.12 } };
function _v471renderMotorEfficiencyUpgradeSavings(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Premium-motor upgrade saving (first-principles): input kW = HP x 0.746 x load / efficiency; annual saving = (kW at old eff - kW at new eff) x run hours x rate. The saving scales with load, hours, and rate. Energy charge only; the utility tariff and rebates change the payback. A screening estimate, not a metered M&V.";
  const hp = makeNumber("Motor horsepower", "meu-hp", { step: "any", min: "0" }); hp.input.value = "50";
  const ld = makeNumber("Load fraction (0-1)", "meu-ld", { step: "any", min: "0", max: "1" }); ld.input.value = "0.75";
  const es = makeNumber("Existing motor efficiency (0-1)", "meu-es", { step: "any", min: "0", max: "1" }); es.input.value = "0.90";
  const ep = makeNumber("Premium motor efficiency (0-1)", "meu-ep", { step: "any", min: "0", max: "1" }); ep.input.value = "0.945";
  const hr = makeNumber("Annual run hours", "meu-hr", { step: "any", min: "0" }); hr.input.value = "4000";
  const rate = makeNumber("Electricity rate ($/kWh)", "meu-rate", { step: "any", min: "0" }); rate.input.value = "0.12";
  for (const f of [hp, ld, es, ep, hr, rate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "50"; ld.input.value = "0.75"; es.input.value = "0.90"; ep.input.value = "0.945"; hr.input.value = "4000"; rate.input.value = "0.12"; update(); });
  const oKw = makeOutputLine(outputRegion, "Input kW standard / premium", "meu-out-kw");
  const oSave = makeOutputLine(outputRegion, "Annual saving", "meu-out-save");
  const oNote = makeOutputLine(outputRegion, "Note", "meu-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorEfficiencyUpgradeSavings({ hp: readNum(hp.input), load: readNum(ld.input), eff_standard: readNum(es.input), eff_premium: readNum(ep.input), hours: readNum(hr.input), rate_kwh: readNum(rate.input) });
    if (r.error) { oKw.textContent = r.error; oSave.textContent = "-"; oNote.textContent = ""; return; }
    oKw.textContent = fmt(r.kw_standard, 2) + " -> " + fmt(r.kw_premium, 2) + " kW (" + fmt(r.kw_saved, 2) + " kW saved)";
    oSave.textContent = "$" + fmt(r.annual_saving, 0) + "/yr (" + fmt(r.annual_kwh_saved, 0) + " kWh)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [hp, ld, es, ep, hr, rate]) f.input.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["motor-efficiency-upgrade-savings"] = _v471renderMotorEfficiencyUpgradeSavings;

// ===================== spec-v472: transformer loading efficiency and losses =====================
// dims: in { kva_rating: dimensionless, noload_w: dimensionless, loadloss_w: dimensionless, load: dimensionless, pf: dimensionless } out: { output_kw: dimensionless, losses_kw: dimensionless, efficiency: dimensionless, max_eff_load: dimensionless }
export function computeTransformerLoadingEfficiency({ kva_rating = 0, noload_w = 0, loadloss_w = 0, load = 0, pf = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const kva = Number(kva_rating) || 0;
  const nl = Number(noload_w) || 0;
  const ll = Number(loadloss_w) || 0;
  const ld = Number(load) || 0;
  const pfac = Number(pf) || 0;
  if (!(kva > 0)) return { error: "kVA rating must be positive." };
  if (!(nl > 0)) return { error: "No-load (core) loss must be positive (W)." };
  if (!(ll > 0)) return { error: "Full-load (copper) loss must be positive (W)." };
  if (!(ld > 0 && ld <= 1)) return { error: "Load fraction must be between 0 and 1." };
  if (!(pfac > 0 && pfac <= 1)) return { error: "Power factor must be between 0 and 1." };
  const output_kw = kva * ld * pfac;
  const losses_kw = (nl + ld * ld * ll) / 1000;
  const efficiency = output_kw / (output_kw + losses_kw) * 100;
  const max_eff_load = Math.sqrt(nl / ll);
  return {
    output_kw, losses_kw, efficiency, max_eff_load,
    note: "Transformer loading efficiency and losses: a transformer has a fixed no-load (core / iron) loss that runs whenever it is energized, plus a load (copper / I^2R) loss that grows with the square of the load fraction. Output kW = kVA x load x power factor; total loss kW = (no-load + load^2 x full-load loss) / 1000; efficiency = output / (output + loss). Peak efficiency occurs where the copper loss equals the core loss, at a load fraction = sqrt(no-load / full-load loss) -- typically 40-60% for a distribution transformer, which is why an oversized transformer with a large core loss has a poor all-day efficiency. A design/screening aid; the manufacturer's test report governs.",
  };
}
export const transformerLoadingEfficiencyExample = { inputs: { kva_rating: 75, noload_w: 200, loadloss_w: 1200, load: 0.75, pf: 1.0 } };
function _v472renderTransformerLoadingEfficiency(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Transformer loading efficiency (first-principles): output = kVA x load x PF; loss = (no-load + load^2 x full-load loss); efficiency = output / (output + loss); peak efficiency at load = sqrt(no-load / full-load loss). A design/screening aid; the manufacturer's test report governs.";
  const kva = makeNumber("Transformer rating (kVA)", "tle-kva", { step: "any", min: "0" }); kva.input.value = "75";
  const nl = makeNumber("No-load (core) loss (W)", "tle-nl", { step: "any", min: "0" }); nl.input.value = "200";
  const ll = makeNumber("Full-load (copper) loss (W)", "tle-ll", { step: "any", min: "0" }); ll.input.value = "1200";
  const ld = makeNumber("Load fraction (0-1)", "tle-ld", { step: "any", min: "0", max: "1" }); ld.input.value = "0.75";
  const pf = makeNumber("Power factor (0-1)", "tle-pf", { step: "any", min: "0", max: "1" }); pf.input.value = "1.0";
  for (const f of [kva, nl, ll, ld, pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kva.input.value = "75"; nl.input.value = "200"; ll.input.value = "1200"; ld.input.value = "0.75"; pf.input.value = "1.0"; update(); });
  const oEff = makeOutputLine(outputRegion, "Efficiency", "tle-out-eff");
  const oLoss = makeOutputLine(outputRegion, "Output / losses", "tle-out-loss");
  const oPeak = makeOutputLine(outputRegion, "Peak-efficiency load", "tle-out-peak");
  const oNote = makeOutputLine(outputRegion, "Note", "tle-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTransformerLoadingEfficiency({ kva_rating: readNum(kva.input), noload_w: readNum(nl.input), loadloss_w: readNum(ll.input), load: readNum(ld.input), pf: readNum(pf.input) });
    if (r.error) { oEff.textContent = r.error; oLoss.textContent = "-"; oPeak.textContent = "-"; oNote.textContent = ""; return; }
    oEff.textContent = fmt(r.efficiency, 2) + "%";
    oLoss.textContent = fmt(r.output_kw, 2) + " kW out, " + fmt(r.losses_kw * 1000, 0) + " W loss";
    oPeak.textContent = fmt(r.max_eff_load * 100, 0) + "% load";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [kva, nl, ll, ld, pf]) f.input.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["transformer-loading-efficiency"] = _v472renderTransformerLoadingEfficiency;

// ===================== spec-v473: economic conductor sizing (I2R payback) =====================
// dims: in { current_a: dimensionless, r_small_ohm: dimensionless, r_big_ohm: dimensionless, hours: dimensionless, rate_kwh: dimensionless, upsize_cost: dimensionless } out: { loss_small_kw: dimensionless, loss_big_kw: dimensionless, annual_saving: dimensionless, payback_yr: dimensionless }
export function computeEconomicConductorSizing({ current_a = 0, r_small_ohm = 0, r_big_ohm = 0, hours = 0, rate_kwh = 0, upsize_cost = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const I = Number(current_a) || 0;
  const rs = Number(r_small_ohm) || 0;
  const rb = Number(r_big_ohm) || 0;
  const hr = Number(hours) || 0;
  const rate = Number(rate_kwh) || 0;
  const cost = Number(upsize_cost) || 0;
  if (!(I > 0)) return { error: "Load current must be positive (A)." };
  if (!(rs > 0)) return { error: "Smaller-conductor resistance must be positive (ohm)." };
  if (!(rb > 0)) return { error: "Larger-conductor resistance must be positive (ohm)." };
  if (!(rb < rs)) return { error: "The larger conductor must have less resistance than the smaller one." };
  if (!(hr > 0)) return { error: "Annual run hours must be positive." };
  if (rate < 0) return { error: "Electricity rate must be non-negative." };
  if (cost < 0) return { error: "Upsize cost must be non-negative." };
  const loss_small_kw = 3 * I * I * rs / 1000;
  const loss_big_kw = 3 * I * I * rb / 1000;
  const annual_saving = (loss_small_kw - loss_big_kw) * hr * rate;
  const payback_yr = annual_saving > 0 ? cost / annual_saving : null;
  return {
    loss_small_kw, loss_big_kw, annual_saving, payback_yr,
    note: "Economic conductor sizing (I^2R payback): a feeder sized to the code minimum still wastes energy as heat in the conductor. Upsizing lowers the per-phase resistance, so the three-phase loss = 3 x I^2 x R drops and the annual energy saving = (loss at the small size - loss at the large) x run hours x rate. Divide the added material cost by that saving for a simple payback. Because the loss scales with the square of the current, upsizing only pays on heavily loaded, long-hour feeders; a lightly loaded or intermittent run may never earn back the copper. A screening estimate; installed cost, conduit fill, and the code minimum still govern the actual conductor.",
  };
}
export const economicConductorSizingExample = { inputs: { current_a: 100, r_small_ohm: 0.20, r_big_ohm: 0.125, hours: 4000, rate_kwh: 0.12, upsize_cost: 800 } };
function _v473renderEconomicConductorSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Economic conductor sizing (first-principles I^2R): three-phase loss = 3 x I^2 x R; annual saving = (loss small - loss big) x hours x rate; payback = upsize cost / saving. Pays only on heavily loaded, long-hour feeders. A screening estimate; installed cost and the code minimum still govern.";
  const I = makeNumber("Per-phase load current (A)", "ecs-i", { step: "any", min: "0" }); I.input.value = "100";
  const rs = makeNumber("Smaller conductor resistance (ohm, run)", "ecs-rs", { step: "any", min: "0" }); rs.input.value = "0.20";
  const rb = makeNumber("Larger conductor resistance (ohm, run)", "ecs-rb", { step: "any", min: "0" }); rb.input.value = "0.125";
  const hr = makeNumber("Annual run hours", "ecs-hr", { step: "any", min: "0" }); hr.input.value = "4000";
  const rate = makeNumber("Electricity rate ($/kWh)", "ecs-rate", { step: "any", min: "0" }); rate.input.value = "0.12";
  const cost = makeNumber("Added upsize cost ($)", "ecs-cost", { step: "any", min: "0" }); cost.input.value = "800";
  for (const f of [I, rs, rb, hr, rate, cost]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { I.input.value = "100"; rs.input.value = "0.20"; rb.input.value = "0.125"; hr.input.value = "4000"; rate.input.value = "0.12"; cost.input.value = "800"; update(); });
  const oLoss = makeOutputLine(outputRegion, "Loss small / big", "ecs-out-loss");
  const oSave = makeOutputLine(outputRegion, "Annual saving / payback", "ecs-out-save");
  const oNote = makeOutputLine(outputRegion, "Note", "ecs-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEconomicConductorSizing({ current_a: readNum(I.input), r_small_ohm: readNum(rs.input), r_big_ohm: readNum(rb.input), hours: readNum(hr.input), rate_kwh: readNum(rate.input), upsize_cost: readNum(cost.input) });
    if (r.error) { oLoss.textContent = r.error; oSave.textContent = "-"; oNote.textContent = ""; return; }
    oLoss.textContent = fmt(r.loss_small_kw, 2) + " kW -> " + fmt(r.loss_big_kw, 2) + " kW";
    oSave.textContent = "$" + fmt(r.annual_saving, 0) + "/yr, payback " + (r.payback_yr === null ? "n/a" : fmt(r.payback_yr, 1) + " yr");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [I, rs, rb, hr, rate, cost]) f.input.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["economic-conductor-sizing"] = _v473renderEconomicConductorSizing;

// spec-v487: generator fuel runtime and backup duration. The fuel analog of
// battery-runtime for a standby genset: runtime = usable fuel / consumption,
// and the fuel/tank a target backup duration needs.
// dims: in { tank_capacity_gal: L^3, consumption_gph: L^3 T^-1, usable_pct: dimensionless, target_runtime_hr: T } out: { usable_gallons: L^3, runtime_hr: T, runtime_days: T, fuel_for_target_gal: L^3, tank_for_target_gal: L^3 }
export function computeGeneratorFuelRuntime({ tank_capacity_gal = 0, consumption_gph = 0, usable_pct = 90, target_runtime_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tank = Number(tank_capacity_gal) || 0;
  const gph = Number(consumption_gph) || 0;
  const usable = Number(usable_pct) || 0;
  const target = Number(target_runtime_hr) || 0;
  if (!(tank > 0)) return { error: "Tank capacity must be positive (gal)." };
  if (!(gph > 0)) return { error: "Fuel consumption must be positive (gph)." };
  if (!(usable > 0 && usable <= 100)) return { error: "Usable fraction must be between 0 and 100 percent." };
  if (!(target >= 0)) return { error: "Target runtime must be zero or positive (hr)." };
  const usable_gallons = tank * usable / 100;
  const runtime_hr = usable_gallons / gph;
  const runtime_days = runtime_hr / 24;
  let fuel_for_target_gal = null, tank_for_target_gal = null, meets_target = null;
  if (target > 0) {
    fuel_for_target_gal = gph * target;
    tank_for_target_gal = fuel_for_target_gal / (usable / 100);
    meets_target = runtime_hr >= target;
  }
  if (![usable_gallons, runtime_hr, runtime_days].every(Number.isFinite)) return { error: "Runtime math is not a finite value." };
  return {
    usable_gallons, runtime_hr, runtime_days, fuel_for_target_gal, tank_for_target_gal, meets_target,
    note: "Standby-generator fuel runtime = usable fuel / consumption, the fuel-supply companion to the battery-runtime tile. Enter the consumption at the operating load from the genset data plate (a diesel set burns roughly 0.05-0.08 gal/hr per kW at load, but read the actual spec - it climbs with load and differs by fuel). The usable fraction defaults to 90% because a tank is not drawn to the bottom (reserve, pickup height, and sediment). For a target backup duration (a 72-hour outage is a common design basis), the tile also returns the fuel and the tank size that duration needs, and whether the current tank meets it. Natural-gas and propane sets meter fuel differently (a utility gas feed has no tank limit); this is the liquid-fuel-tank case. A planning aid; the genset's published fuel curve, the fuel quality, and the AHJ's on-site fuel-storage rules govern.",
  };
}
export const generatorFuelRuntimeExample = { inputs: { tank_capacity_gal: 100, consumption_gph: 3.0, usable_pct: 90, target_runtime_hr: 72 } };
function _v487renderGeneratorFuelRuntime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: generator fuel runtime (first-principles): runtime = usable fuel / consumption; usable = tank x usable%. For a target duration, fuel = consumption x hours and the tank = fuel / usable%. Enter consumption from the genset data plate. A planning aid; the published fuel curve and the AHJ's fuel-storage rules govern.";
  const tank = makeNumber("Fuel tank capacity (gal)", "gfr-tank", { step: "any", min: "0" }); tank.input.value = "100";
  const gph = makeNumber("Fuel consumption at load (gph)", "gfr-gph", { step: "any", min: "0" }); gph.input.value = "3.0";
  const usable = makeNumber("Usable tank fraction (%)", "gfr-usable", { step: "any", min: "0", max: "100" }); usable.input.value = "90";
  const target = makeNumber("Target backup duration (hr, 0 to skip)", "gfr-target", { step: "any", min: "0" }); target.input.value = "72";
  for (const f of [tank, gph, usable, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tank.input.value = "100"; gph.input.value = "3.0"; usable.input.value = "90"; target.input.value = "72"; update(); });
  const oRun = makeOutputLine(outputRegion, "Runtime on a full tank", "gfr-out-run");
  const oUsable = makeOutputLine(outputRegion, "Usable fuel", "gfr-out-usable");
  const oTarget = makeOutputLine(outputRegion, "For the target duration", "gfr-out-target");
  const oNote = makeOutputLine(outputRegion, "Note", "gfr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGeneratorFuelRuntime({ tank_capacity_gal: readNum(tank.input), consumption_gph: readNum(gph.input), usable_pct: usable.input.value === "" ? 90 : readNum(usable.input), target_runtime_hr: readNum(target.input) });
    if (r.error) { oRun.textContent = r.error; oUsable.textContent = "-"; oTarget.textContent = "-"; oNote.textContent = ""; return; }
    oRun.textContent = fmt(r.runtime_hr, 1) + " hr (" + fmt(r.runtime_days, 2) + " days)";
    oUsable.textContent = fmt(r.usable_gallons, 1) + " gal";
    oTarget.textContent = r.fuel_for_target_gal === null ? "-" : fmt(r.fuel_for_target_gal, 0) + " gal, needs a " + fmt(r.tank_for_target_gal, 0) + " gal tank (" + (r.meets_target ? "current tank MEETS it" : "current tank does NOT meet it") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tank, gph, usable, target]) f.input.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["generator-fuel-runtime"] = _v487renderGeneratorFuelRuntime;

// ===================== spec-v494: transformer voltage regulation from %R and %X =====================
// dims: in { percent_r: dimensionless, percent_x: dimensionless, power_factor: dimensionless, leading: dimensionless, load_fraction: dimensionless } out: { cos: dimensionless, sin: dimensionless, main_term: dimensionless, quad_term: dimensionless, vr_percent: dimensionless }
export function computeTransformerVoltageRegulation({ percent_r = 0, percent_x = 0, power_factor = 0.85, leading = false, load_fraction = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pr = Number(percent_r) || 0;
  const px = Number(percent_x) || 0;
  const pf = Number(power_factor) || 0;
  const ld = Number(load_fraction) || 0;
  if (pr < 0) return { error: "%R cannot be negative." };
  if (px < 0) return { error: "%X cannot be negative." };
  if (!(pf > 0 && pf <= 1)) return { error: "Power factor must be over 0 and at most 1." };
  if (ld < 0) return { error: "Per-unit loading cannot be negative." };
  const cos = pf;
  const sin = Math.sqrt(Math.max(0, 1 - pf * pf)) * (leading ? -1 : 1);
  const main_term = ld * (pr * cos + px * sin);
  const quad_term = ld * ld * Math.pow(px * cos - pr * sin, 2) / 200;
  const vr_percent = main_term + quad_term;
  if (![cos, sin, main_term, quad_term, vr_percent].every(Number.isFinite)) return { error: "Voltage-regulation math is not a finite value." };
  return {
    cos, sin, main_term, quad_term, vr_percent,
    note: "Transformer voltage regulation is the drop from no-load to full-load at the transformer terminals: VR% = load x (%R cos + %X sin) + load^2 x (%X cos - %R sin)^2 / 200, with sin taking the load's sign (negative for a leading power factor). The nameplate %Z alone does not give it -- the drop depends on how %Z splits between %R and %X and on the load power factor. A lagging load (motors) sags the voltage; a leading load (an over-corrected plant or a PV inverter exporting reactive power) can raise the secondary above nominal, tripping over-voltage relays. The quadrature term is a small correction that grows with the square of loading. This is the terminal regulation, not the full feeder drop -- conductor voltage drop adds to it. A design aid, not the utility's voltage study.",
  };
}
export const transformerVoltageRegulationExample = { inputs: { percent_r: 1.2, percent_x: 5.0, power_factor: 0.85, leading: false, load_fraction: 1.0 } };
function _v494renderTransformerVoltageRegulation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Transformer voltage-regulation approximation (from %R, %X, and load power factor): VR% = load x (%R cos + %X sin) + load^2 x (%X cos - %R sin)^2 / 200, sin negative for a leading power factor. An IEEE C57 test-report quantity; %Z alone does not give it because it depends on the %R / %X split and the power factor. Terminal regulation, not the feeder drop. A design aid; the utility's voltage study governs.";
  const pr = makeNumber("Transformer %R (from test report)", "tvr-r", { step: "any", min: "0" }); pr.input.value = "1.2";
  const px = makeNumber("Transformer %X (from test report)", "tvr-x", { step: "any", min: "0" }); px.input.value = "5.0";
  const pf = makeNumber("Load power factor (0-1)", "tvr-pf", { step: "any", min: "0", max: "1" }); pf.input.value = "0.85";
  const lead = makeSelect("Power-factor type", "tvr-lead", [
    { value: "lagging", label: "Lagging (motors) - voltage sags", selected: true },
    { value: "leading", label: "Leading (over-corrected / exporting) - voltage rises" },
  ]);
  const ld = makeNumber("Per-unit loading (1.0 = full load)", "tvr-ld", { step: "any", min: "0" }); ld.input.value = "1.0";
  for (const f of [pr, px, pf]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(lead.wrap);
  inputRegion.appendChild(ld.wrap);
  attachExampleButton(inputRegion, () => { pr.input.value = "1.2"; px.input.value = "5.0"; pf.input.value = "0.85"; lead.select.value = "lagging"; ld.input.value = "1.0"; update(); });
  const oVr = makeOutputLine(outputRegion, "Voltage regulation", "tvr-out-vr");
  const oMain = makeOutputLine(outputRegion, "Main term / quadrature term", "tvr-out-terms");
  const oNote = makeOutputLine(outputRegion, "Note", "tvr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTransformerVoltageRegulation({ percent_r: readNum(pr.input), percent_x: readNum(px.input), power_factor: pf.input.value === "" ? 0.85 : readNum(pf.input), leading: lead.select.value === "leading", load_fraction: ld.input.value === "" ? 1.0 : readNum(ld.input) });
    if (r.error) { oVr.textContent = r.error; oMain.textContent = "-"; oNote.textContent = ""; return; }
    oVr.textContent = (r.vr_percent >= 0 ? "+" : "") + fmt(r.vr_percent, 2) + "%" + (r.vr_percent < 0 ? " (voltage RISES above nominal)" : " (voltage sags)");
    oMain.textContent = fmt(r.main_term, 3) + "% + " + fmt(r.quad_term, 3) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pr, px, pf, ld]) f.input.addEventListener("input", update);
  lead.select.addEventListener("change", update);
}
ELECTRICAL_RENDERERS["transformer-voltage-regulation"] = _v494renderTransformerVoltageRegulation;
