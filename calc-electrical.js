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

// --- Utility 67: Solar PV String Sizing ---

// dims: in { args: dimensionless } out: { max_series: dimensionless, min_series: dimensionless, cold_voc_V: M L^2 T^-3 I^-1, warm_vmp_V: M L^2 T^-3 I^-1 }
export function computePVStringSizing({
  module_voc_V, module_vmp_V, voc_temp_coeff_pct_per_C,
  record_low_C, record_high_C,
  inverter_mppt_min_V, inverter_mppt_max_V, inverter_vdc_max_V,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!module_voc_V || !module_vmp_V) return { error: "Module Voc and Vmp are required." };
  const coeff = Math.abs(Number(voc_temp_coeff_pct_per_C) || 0);
  const cold_voc = module_voc_V * (1 + coeff * (25 - record_low_C) / 100);
  const warm_vmp = module_vmp_V * (1 - coeff * (record_high_C - 25) / 100);
  const max_series = Math.floor((Number(inverter_vdc_max_V) || 0) / cold_voc);
  const min_series = Math.ceil((Number(inverter_mppt_min_V) || 0) / warm_vmp);
  const flag = min_series > max_series;
  return { cold_voc_V: cold_voc, warm_vmp_V: warm_vmp, max_series, min_series, mppt_max_V: inverter_mppt_max_V, flag };
}

export const pvStringSizingExample = {
  inputs: {
    module_voc_V: 40, module_vmp_V: 33, voc_temp_coeff_pct_per_C: 0.30,
    record_low_C: -10, record_high_C: 45,
    inverter_mppt_min_V: 200, inverter_mppt_max_V: 480, inverter_vdc_max_V: 600,
  },
  expectedRange: { max_series: { min: 12, max: 14 }, min_series: { min: 6, max: 8 } },
};

// --- Utility 68: Battery Runtime ---

// dims: in { amp_hours: I T, system_V: M L^2 T^-3 I^-1, dod_percent: dimensionless, load_W: M L^2 T^-3, peukert_k: dimensionless } out: { usable_wh: M L^2 T^-3 T, hours: T }
export function computeBatteryRuntime({ amp_hours, system_V, dod_percent = 100, load_W, peukert_k = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Ah = Number(amp_hours) || 0;
  const V = Number(system_V) || 0;
  const dod = (Number(dod_percent) || 0) / 100;
  const load = Number(load_W) || 0;
  if (Ah <= 0 || V <= 0 || load <= 0) return { error: "Provide positive Ah, system V, and load W." };
  const usable_Ah = Ah * dod;
  const usable_Wh = usable_Ah * V;
  const k = Number(peukert_k) || 1;
  let hours;
  if (k > 1) {
    // Peukert form per spec-v2 section 2: t = C / I^k, C in Ah, I in A.
    // Reduces to C / I (the simple form) when k = 1.
    const I = load / V;
    if (I <= 0) return { error: "Computed current is non-positive." };
    hours = usable_Ah / Math.pow(I, k);
  } else {
    hours = usable_Wh / load;
  }
  return { hours, minutes: hours * 60, usable_Wh };
}

export const batteryRuntimeExample = {
  inputs: { amp_hours: 100, system_V: 12, dod_percent: 80, load_W: 120, peukert_k: 1 },
  expectedRange: { hours: { min: 7, max: 9 } },
};

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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPVStringSizing(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Cold-temperature Voc inflation (V_oc_cold = V_oc * (1 + |coeff| * (25 - T_low) / 100)) and warm-temperature Vmp depression (V_mp_warm = V_mp * (1 - |coeff| * (T_high - 25) / 100)). See docs/derivations.md.";
  attachExampleButton(inputRegion, () => fillExample(pvStringSizingExample.inputs));

  const voc = makeNumber("Module Voc (V)", "pv-voc", { step: "any", min: "0" });
  const vmp = makeNumber("Module Vmp (V)", "pv-vmp", { step: "any", min: "0" });
  const coeff = makeNumber("Voc temp coeff (% per C, magnitude)", "pv-coeff", { step: "any" });
  const tlow = makeNumber("Record low temp (C)", "pv-tlow", { step: "any" });
  const thigh = makeNumber("Record high temp (C)", "pv-thigh", { step: "any" });
  const mppt_min = makeNumber("Inverter MPPT min (V)", "pv-mppt-min", { step: "any", min: "0" });
  const mppt_max = makeNumber("Inverter MPPT max (V)", "pv-mppt-max", { step: "any", min: "0" });
  const vdc_max = makeNumber("Inverter Vdc max (V)", "pv-vdc-max", { step: "any", min: "0" });
  for (const f of [voc, vmp, coeff, tlow, thigh, mppt_min, mppt_max, vdc_max]) inputRegion.appendChild(f.wrap);

  const oCold = makeOutputLine(outputRegion, "Cold Voc per module", "pv-out-cold");
  const oWarm = makeOutputLine(outputRegion, "Warm Vmp per module", "pv-out-warm");
  const oMax = makeOutputLine(outputRegion, "Max series count", "pv-out-max");
  const oMin = makeOutputLine(outputRegion, "Min series count", "pv-out-min");
  const oFlag = makeOutputLine(outputRegion, "Result", "pv-out-flag");

  function fillExample(v) {
    voc.input.value = v.module_voc_V; vmp.input.value = v.module_vmp_V; coeff.input.value = v.voc_temp_coeff_pct_per_C;
    tlow.input.value = v.record_low_C; thigh.input.value = v.record_high_C;
    mppt_min.input.value = v.inverter_mppt_min_V; mppt_max.input.value = v.inverter_mppt_max_V; vdc_max.input.value = v.inverter_vdc_max_V;
    update();
  }
  const update = debounce(() => {
    const r = computePVStringSizing({
      module_voc_V: Number(voc.input.value) || 0,
      module_vmp_V: Number(vmp.input.value) || 0,
      voc_temp_coeff_pct_per_C: Number(coeff.input.value) || 0,
      record_low_C: Number(tlow.input.value),
      record_high_C: Number(thigh.input.value),
      inverter_mppt_min_V: Number(mppt_min.input.value) || 0,
      inverter_mppt_max_V: Number(mppt_max.input.value) || 0,
      inverter_vdc_max_V: Number(vdc_max.input.value) || 0,
    });
    if (r.error) { oCold.textContent = r.error; oWarm.textContent = "-"; oMax.textContent = "-"; oMin.textContent = "-"; oFlag.textContent = "-"; return; }
    oCold.textContent = fmt(r.cold_voc_V, 2) + " V";
    oWarm.textContent = fmt(r.warm_vmp_V, 2) + " V";
    oMax.textContent = String(r.max_series);
    oMin.textContent = String(r.min_series);
    oFlag.textContent = r.flag ? "Infeasible: min series exceeds max series." : "Feasible";
  }, DEBOUNCE_MS);

  for (const el of [voc.input, vmp.input, coeff.input, tlow.input, thigh.input, mppt_min.input, mppt_max.input, vdc_max.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBatteryRuntime(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Runtime = (Ah * V * DoD) / load_W. Peukert form t = C * (C / I)^(k - 1) when k > 1 (battery technical bulletins).";
  attachExampleButton(inputRegion, () => fillExample(batteryRuntimeExample.inputs));

  const ah = makeNumber("Battery capacity (Ah)", "br-ah", { step: "any", min: "0" });
  const v = makeNumber("System voltage (V)", "br-v", { step: "any", min: "0" });
  const dod = makeNumber("Depth of discharge (%)", "br-dod", { step: "any", min: "0", max: "100", value: "100" });
  dod.input.value = "100";
  const load = makeNumber("Load (W)", "br-load", { step: "any", min: "0" });
  const k = makeNumber("Peukert exponent k (1 if unknown)", "br-k", { step: "any", min: "1", value: "1" });
  k.input.value = "1";
  for (const f of [ah, v, dod, load, k]) inputRegion.appendChild(f.wrap);

  const oH = makeOutputLine(outputRegion, "Runtime (hours)", "br-out-h");
  const oM = makeOutputLine(outputRegion, "Runtime (minutes)", "br-out-m");
  const oWh = makeOutputLine(outputRegion, "Usable energy", "br-out-wh");

  function fillExample(x) {
    ah.input.value = x.amp_hours; v.input.value = x.system_V; dod.input.value = x.dod_percent;
    load.input.value = x.load_W; k.input.value = x.peukert_k;
    update();
  }
  const update = debounce(() => {
    const r = computeBatteryRuntime({
      amp_hours: Number(ah.input.value) || 0,
      system_V: Number(v.input.value) || 0,
      dod_percent: Number(dod.input.value) || 0,
      load_W: Number(load.input.value) || 0,
      peukert_k: Number(k.input.value) || 1,
    });
    if (r.error) { oH.textContent = r.error; oM.textContent = "-"; oWh.textContent = "-"; return; }
    oH.textContent = fmt(r.hours, 2) + " hr";
    oM.textContent = fmt(r.minutes, 0) + " min";
    oWh.textContent = fmt(r.usable_Wh, 0) + " Wh";
  }, DEBOUNCE_MS);

  for (const el of [ah.input, v.input, dod.input, load.input, k.input]) el.addEventListener("input", update);
}

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
export function computeLVDCDrop({ system_V = 12, awg = "10", run_length_ft = 0, current_A = 0, application = "led_lighting" }) {
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
  return {
    drop_V,
    percent,
    application_tolerance_percent: tol ? tol.percent : null,
    acceptable,
    application_note: tol ? tol.note : null,
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
  const v_source = poe_class === "af" ? 44 : (poe_class === "at" ? 50 : 50);
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
  for (const f of [sv, aw, len, cur, app]) inputRegion.appendChild(f.wrap);

  const oD = makeOutputLine(outputRegion, "Drop", "lv-out-d");
  const oP = makeOutputLine(outputRegion, "Percent", "lv-out-p");
  const oA = makeOutputLine(outputRegion, "Application threshold", "lv-out-a");
  const oF = makeOutputLine(outputRegion, "Status", "lv-out-f");

  function fillExample(v) { sv.select.value = String(v.system_V); aw.select.value = v.awg; len.input.value = v.run_length_ft; cur.input.value = v.current_A; app.select.value = v.application; update(); }
  const update = debounce(() => {
    const r = computeLVDCDrop({
      system_V: Number(sv.select.value) || 12, awg: aw.select.value,
      run_length_ft: Number(len.input.value) || 0, current_A: Number(cur.input.value) || 0,
      application: app.select.value,
    });
    if (r.error) { oD.textContent = r.error; oP.textContent = "-"; oA.textContent = "-"; oF.textContent = "-"; return; }
    oD.textContent = fmt(r.drop_V, 3) + " V";
    oP.textContent = fmt(r.percent, 2) + " %";
    oA.textContent = fmt(r.application_tolerance_percent, 0) + " % - " + (r.application_note || "");
    oF.textContent = r.acceptable ? "within tolerance" : "exceeds tolerance";
  }, DEBOUNCE_MS);
  for (const el of [sv.select, aw.select, len.input, cur.input, app.select]) el.addEventListener("input", update);
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
  "pv-string-sizing": renderPVStringSizing,
  "battery-runtime": renderBatteryRuntime,
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

// --- v15 A.8: PV interconnection 120% busbar rule (NEC 705.12) ---
// The load-side connection of a PV inverter to an existing panel is limited
// by the busbar rating. A breaker landed at the opposite end of the busbar
// from the main gets the 120% allowance (705.12(B)(3)(2)); any other load-
// side position uses the plain sum-of-breakers <= busbar rule. A supply-side
// tap (705.11) is ahead of the service disconnect and is not subject to the
// busbar rule at all. The AHJ inspector reads the panel to verify position.

// dims: in { args: dimensionless } out: { sum_of_breakers_a: I, limit_a: I, passes: dimensionless }
export function computePvInterconnectionBusbar({
  main_breaker_a = 0,
  busbar_rating_a = 0,
  pv_existing_a = 0,
  pv_proposed_a = 0,
  method = "opposite_end_load_side",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const main = Number(main_breaker_a) || 0;
  const busbar = Number(busbar_rating_a) || 0;
  const pvE = Number(pv_existing_a) || 0;
  const pvP = Number(pv_proposed_a) || 0;
  if (!(main > 0)) return { error: "Main breaker rating must be positive (A)." };
  if (!(busbar > 0)) return { error: "Busbar rating must be positive (A)." };
  if (pvE < 0 || pvP < 0) return { error: "PV breaker ratings cannot be negative (A)." };
  const METHODS = new Set(["opposite_end_load_side", "load_side_other", "supply_side_tap"]);
  if (!METHODS.has(method)) {
    return { error: "Method must be one of: opposite_end_load_side, load_side_other, supply_side_tap." };
  }

  const warnings = [];
  if (main > busbar) warnings.push("Main breaker rating exceeds the busbar rating; that is a pre-existing NEC 408.36 condition independent of the PV interconnection.");
  if (pvP > 0.80 * main) warnings.push("Proposed PV breaker exceeds 80 percent of the main; a main-breaker downsize or a supply-side connection is usually required.");

  const sum = main + pvE + pvP;
  let limit_a = null;
  let passes;
  let basis;
  if (method === "supply_side_tap") {
    // NEC 705.11: a supply-side connection is ahead of the service disconnect
    // and is not subject to the 705.12 busbar loading rule; service-conductor
    // ampacity (705.11(B)) governs instead.
    passes = true;
    basis = "supply_side_705_11";
    warnings.push("Supply-side tap is not subject to the 705.12 busbar rule. Verify service-conductor ampacity per NEC 705.11(B); the AHJ governs.");
  } else if (method === "opposite_end_load_side") {
    limit_a = 1.20 * busbar; // NEC 705.12(B)(3)(2) 120% rule (breaker opposite the main)
    passes = sum <= limit_a + 1e-9;
    basis = "load_side_120_percent";
  } else {
    limit_a = busbar; // NEC 705.12(B)(3)(1) sum-of-breakers <= busbar rating
    passes = sum <= limit_a + 1e-9;
    basis = "load_side_100_percent";
  }

  let recommendation = "";
  if (!passes && limit_a !== null) {
    const downsized_main = Math.max(0, Math.floor(limit_a - pvE - pvP));
    recommendation = "Sum (" + sum + " A) exceeds the limit (" + limit_a + " A). Move the PV breaker to the opposite end of the busbar from the main for the 120% allowance, downsize the main to " + downsized_main + " A or less, or use a supply-side tap per NEC 705.11.";
  }

  return {
    sum_of_breakers_a: sum,
    limit_a,
    passes,
    basis,
    method,
    recommendation,
    warnings,
  };
}

export const pvInterconnectionBusbarExample = {
  // Canonical NEC 705.12 case: 200 A busbar, 200 A main, 40 A PV breaker at
  // the opposite end of the busbar. 1.20 * 200 = 240 A limit; 200 + 40 = 240
  // A sum; lands exactly at the limit and passes.
  inputs: {
    main_breaker_a: 200,
    busbar_rating_a: 200,
    pv_existing_a: 0,
    pv_proposed_a: 40,
    method: "opposite_end_load_side",
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPvInterconnectionBusbar(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC 2023 Article 705 (Interconnected Electric Power Production Sources). 705.12(B)(3) governs load-side interconnection (the 120% busbar allowance for a breaker at the opposite end of the busbar from the main); 705.11 governs supply-side connections. 'Opposite end of busbar' is a code term of art the AHJ inspector verifies at the panel. AHJ governs. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const method = makeSelect("Interconnection method", "bb-method", [
    { value: "opposite_end_load_side", label: "Load-side breaker, opposite end from main (120% rule)", selected: true },
    { value: "load_side_other", label: "Load-side, other position / line-tap (100% rule)" },
    { value: "supply_side_tap", label: "Supply-side tap (NEC 705.11; not a busbar rule)" },
  ]);
  const main = makeNumber("Main breaker rating (A)", "bb-main", { step: "any", min: "0", value: "200" });
  main.input.value = "200";
  const busbar = makeNumber("Panel busbar rating (A)", "bb-busbar", { step: "any", min: "0", value: "200" });
  busbar.input.value = "200";
  const pvE = makeNumber("Existing PV breaker (A; 0 if none)", "bb-pve", { step: "any", min: "0", value: "0" });
  pvE.input.value = "0";
  const pvP = makeNumber("Proposed PV breaker (A)", "bb-pvp", { step: "any", min: "0", value: "40" });
  pvP.input.value = "40";
  for (const f of [method, main, busbar, pvE, pvP]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    method.select.value = "opposite_end_load_side";
    main.input.value = "200"; busbar.input.value = "200"; pvE.input.value = "0"; pvP.input.value = "40";
    update();
  });

  const oSum = makeOutputLine(outputRegion, "Sum of breakers (A)", "bb-out-sum");
  const oLim = makeOutputLine(outputRegion, "Busbar limit (A)", "bb-out-lim");
  const oPass = makeOutputLine(outputRegion, "Verdict", "bb-out-pass");
  const oRec = makeOutputLine(outputRegion, "Notes", "bb-out-rec");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computePvInterconnectionBusbar({
      main_breaker_a: readNum(main.input),
      busbar_rating_a: readNum(busbar.input),
      pv_existing_a: readNum(pvE.input),
      pv_proposed_a: readNum(pvP.input),
      method: method.select.value,
    });
    if (r.error) {
      oSum.textContent = r.error; oLim.textContent = ""; oPass.textContent = ""; oRec.textContent = "";
      return;
    }
    oSum.textContent = fmt(r.sum_of_breakers_a, 1) + " A";
    oLim.textContent = r.limit_a === null ? "Not applicable (supply-side)" : fmt(r.limit_a, 1) + " A";
    oPass.textContent = r.passes ? "PASS" : "FAIL";
    const notes = [];
    if (r.recommendation) notes.push(r.recommendation);
    if (r.warnings.length) notes.push(...r.warnings);
    oRec.textContent = notes.length ? notes.join(" ") : "Within the NEC 705.12 busbar limit. AHJ verifies breaker position at the panel.";
  }, DEBOUNCE_MS);
  for (const f of [method.select, main.input, busbar.input, pvE.input, pvP.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["pv-interconnection-busbar"] = renderPvInterconnectionBusbar;

// --- v15 A.9: Off-grid battery bank sizing (IEEE 1013 / 1561) ---
// Required nameplate capacity from a daily energy budget, days of autonomy,
// the usable depth-of-discharge for the chemistry, and the round-trip
// efficiency. LFP industry practice uses ~80% DoD; flooded lead-acid ~50%.
// The manufacturer datasheet governs chemistry-specific derates.

// dims: in { args: dimensionless } out: { usable_wh: M L^2 T^-3 T, nameplate_wh: M L^2 T^-3 T, nameplate_ah: I T }
export function computeOffGridBattery({
  daily_load_wh = 0,
  days_autonomy = 3,
  dod_limit = 0.5,
  system_voltage_v = 48,
  round_trip_efficiency = 0.85,
  temperature_derate = 1.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const daily = Number(daily_load_wh) || 0;
  const days = Number(days_autonomy) || 0;
  const dod = Number(dod_limit) || 0;
  const V = Number(system_voltage_v) || 0;
  const eta = Number(round_trip_efficiency) || 0;
  const derate = Number(temperature_derate) || 0;
  if (!(daily > 0)) return { error: "Daily load must be positive (Wh/day)." };
  if (!(days > 0)) return { error: "Days of autonomy must be positive." };
  if (!(dod > 0 && dod <= 1)) return { error: "Depth-of-discharge limit must be in (0, 1]." };
  if (!(V > 0)) return { error: "System voltage must be positive (V)." };
  if (!(eta > 0 && eta <= 1)) return { error: "Round-trip efficiency must be in (0, 1]." };
  if (!(derate > 0 && derate <= 1)) return { error: "Temperature derate must be in (0, 1]." };

  const warnings = [];
  if (days > 5) warnings.push("Days of autonomy above 5 is a cost-driven edge case; most off-grid PV designs use 3 to 5 days.");
  if (dod < 0.3) warnings.push("Depth-of-discharge below 0.30 is conservative; verify against the chemistry datasheet.");
  if (![12, 24, 48].includes(V)) warnings.push("System voltage is not one of the standard 12 / 24 / 48 V; verify the bank configuration.");

  const usable_wh = daily * days;
  const nameplate_wh = usable_wh / (dod * eta * derate);
  const nameplate_ah = nameplate_wh / V;

  return {
    usable_wh,
    nameplate_wh,
    nameplate_ah,
    daily_load_wh: daily,
    days_autonomy: days,
    warnings,
  };
}

export const offGridBatteryExample = {
  // Flooded lead-acid 12 V off-grid example: 2,400 Wh/day, 3 days autonomy,
  // 50% DoD, 85% round-trip efficiency, no temperature derate.
  // usable = 2400 * 3 = 7,200 Wh; nameplate = 7200 / (0.5 * 0.85) = 16,941 Wh;
  // Ah = 16,941 / 12 = 1,412 Ah.
  inputs: {
    daily_load_wh: 2400,
    days_autonomy: 3,
    dod_limit: 0.5,
    system_voltage_v: 12,
    round_trip_efficiency: 0.85,
    temperature_derate: 1.0,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOffGridBattery(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per IEEE 1013 (Sizing Lead-Acid Batteries for Stand-Alone PV Systems) and IEEE 1561 (PV / Hybrid Power Systems). Flooded lead-acid uses ~50% usable depth-of-discharge; lithium-iron-phosphate (LFP) uses ~80%. The manufacturer datasheet governs the chemistry-specific derate. Free at standards.ieee.org for IEEE 1013 bibliographic data.";

  const daily = makeNumber("Daily load (Wh/day)", "ob-daily", { step: "any", min: "0", value: "2400" });
  daily.input.value = "2400";
  const days = makeNumber("Days of autonomy", "ob-days", { step: "any", min: "0", value: "3" });
  days.input.value = "3";
  const dod = makeNumber("Depth-of-discharge limit (0-1; 0.5 lead-acid / 0.8 LFP)", "ob-dod", { step: "any", min: "0", value: "0.5" });
  dod.input.value = "0.5";
  const volts = makeSelect("System DC voltage", "ob-v", [
    { value: "12", label: "12 V", selected: true },
    { value: "24", label: "24 V" },
    { value: "48", label: "48 V" },
  ]);
  const eta = makeNumber("Round-trip efficiency (0-1; 0.85 lead-acid / 0.95 LFP)", "ob-eta", { step: "any", min: "0", value: "0.85" });
  eta.input.value = "0.85";
  const derate = makeNumber("Temperature derate (0-1; 1.0 if none)", "ob-derate", { step: "any", min: "0", value: "1" });
  derate.input.value = "1";
  for (const f of [daily, days, dod, volts, eta, derate]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    daily.input.value = "2400"; days.input.value = "3"; dod.input.value = "0.5";
    volts.select.value = "12"; eta.input.value = "0.85"; derate.input.value = "1";
    update();
  });

  const oUse = makeOutputLine(outputRegion, "Usable energy required (Wh)", "ob-out-use");
  const oNp = makeOutputLine(outputRegion, "Nameplate capacity (Wh)", "ob-out-np");
  const oAh = makeOutputLine(outputRegion, "Nameplate capacity (Ah)", "ob-out-ah");
  const oW = makeOutputLine(outputRegion, "Notes", "ob-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeOffGridBattery({
      daily_load_wh: readNum(daily.input),
      days_autonomy: readNum(days.input),
      dod_limit: readNum(dod.input),
      system_voltage_v: Number(volts.select.value),
      round_trip_efficiency: readNum(eta.input),
      temperature_derate: readNum(derate.input),
    });
    if (r.error) {
      oUse.textContent = r.error; oNp.textContent = ""; oAh.textContent = ""; oW.textContent = "";
      return;
    }
    oUse.textContent = fmt(r.usable_wh, 0) + " Wh";
    oNp.textContent = fmt(r.nameplate_wh, 0) + " Wh";
    oAh.textContent = fmt(r.nameplate_ah, 0) + " Ah";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Manufacturer datasheet governs the chemistry-specific derate.";
  }, DEBOUNCE_MS);
  for (const f of [daily.input, days.input, dod.input, volts.select, eta.input, derate.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["off-grid-battery"] = renderOffGridBattery;

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
// EVSE is a continuous load: the branch circuit and overcurrent device are
// sized at 125% of the charger nameplate (625.41 / 625.42). The new load is
// added to the existing service demand to test panel headroom. Conductor sizing
// uses the same first-principles ampacity path as the v1 wire-ampacity tile
// (copper, 75 C terminations, 30 C ambient); verify against NEC 310.16.

const _EV_BREAKER_SIZES = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];
const _EV_CU_AWG = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"];

// dims: in { args: dimensionless } out: { continuous_circuit_a: I, recommended_breaker_a: I, new_panel_load_a: I, headroom_a: I }
export function computeEvChargerLoad({
  charger_amps = 0,
  charger_voltage = 240,
  main_breaker_a = 0,
  existing_load_a = 0,
  busbar_rating_a = 0,
  load_managed = false,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ch = Number(charger_amps) || 0;
  const main = Number(main_breaker_a) || 0;
  const existing = Number(existing_load_a) || 0;
  const busbar = Number(busbar_rating_a) || 0;
  if (!(ch > 0)) return { error: "Charger nameplate amperes must be positive (A)." };
  if (!(main > 0)) return { error: "Panel main breaker rating must be positive (A)." };
  if (existing < 0) return { error: "Existing service load cannot be negative (A)." };
  if (main <= 100 && ch > 80) return { error: "An 80 A+ charger on a 100 A or smaller panel is not feasible; a service upgrade is required." };

  const warnings = [];
  const continuous_circuit_a = ch * 1.25; // NEC 625.41 / 625.42 continuous load
  const recommended_breaker_a = _EV_BREAKER_SIZES.find((s) => s >= continuous_circuit_a) ?? continuous_circuit_a;

  // First-principles conductor pick: smallest copper AWG whose 75 C ampacity
  // covers the continuous circuit ampacity.
  let recommended_conductor_awg = null;
  for (const awg of _EV_CU_AWG) {
    const amp = ampacityFromPhysics({ material: "copper", awg, insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
    if (amp >= continuous_circuit_a) { recommended_conductor_awg = awg; break; }
  }

  const new_panel_load_a = existing + continuous_circuit_a;
  const headroom_a = main - new_panel_load_a;
  const headroom_pct = main > 0 ? (headroom_a / main) * 100 : 0;

  if (load_managed) warnings.push("With a 625.42(A) energy-management system the EVSE may be sized to its controlled output rather than full nameplate; use the controller's rated demand.");
  if (busbar > 0 && busbar < new_panel_load_a) warnings.push("Panel busbar rating (" + busbar + " A) is below the new total load; the busbar, not just the main, governs (NEC 408.36).");
  if (headroom_a < 0) warnings.push("New total load exceeds the main breaker rating; load management or a service upgrade is required.");
  else if (headroom_pct < 10) warnings.push("Panel headroom is under 10 percent; a NEC 220.83/220.87 load study or load management is recommended.");

  return {
    continuous_circuit_a,
    recommended_breaker_a,
    recommended_conductor_awg,
    new_panel_load_a,
    headroom_a,
    headroom_pct,
    warnings,
  };
}

export const evChargerLoadExample = {
  // 48 A charger on a 200 A service with 130 A existing load:
  // I_circuit = 48 * 1.25 = 60 A; 60 A breaker; new load = 190 A;
  // headroom = 10 A (5%, flagged marginal). (Mike Holt EV-charger article.)
  inputs: {
    charger_amps: 48,
    charger_voltage: 240,
    main_breaker_a: 200,
    existing_load_a: 130,
    busbar_rating_a: 200,
    load_managed: false,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderEvChargerLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC 2023 Article 625 (EV charging). 625.41/625.42 classify the EVSE as a continuous load (circuit and breaker at 125% of nameplate); 625.42(A) covers energy-management sizing. Panel load per NEC 220.83/220.87. Conductor is a first-principles estimate (copper, 75 C, 30 C ambient); verify against NEC 310.16. AHJ governs. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const ch = makeNumber("Charger nameplate (A)", "ev-ch", { step: "any", min: "0", value: "48" });
  ch.input.value = "48";
  const volt = makeSelect("Charger voltage", "ev-v", [
    { value: "240", label: "240 V (Level 2 residential)", selected: true },
    { value: "208", label: "208 V (commercial wye)" },
  ]);
  const main = makeNumber("Panel main breaker (A)", "ev-main", { step: "any", min: "0", value: "200" });
  main.input.value = "200";
  const existing = makeNumber("Existing service load (A)", "ev-exist", { step: "any", min: "0", value: "130" });
  existing.input.value = "130";
  const busbar = makeNumber("Panel busbar rating (A; 0 if unknown)", "ev-busbar", { step: "any", min: "0", value: "200" });
  busbar.input.value = "200";
  const managed = makeCheckbox("Load-managed (NEC 625.42(A) EMS)", "ev-managed");
  for (const f of [ch, volt, main, existing, busbar, managed]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    ch.input.value = "48"; volt.select.value = "240"; main.input.value = "200";
    existing.input.value = "130"; busbar.input.value = "200"; managed.input.checked = false;
    update();
  });

  const oCirc = makeOutputLine(outputRegion, "Continuous circuit ampacity (A)", "ev-out-circ");
  const oBrk = makeOutputLine(outputRegion, "Recommended breaker (A)", "ev-out-brk");
  const oCond = makeOutputLine(outputRegion, "Conductor (Cu, est.)", "ev-out-cond");
  const oLoad = makeOutputLine(outputRegion, "New panel total (A)", "ev-out-load");
  const oHead = makeOutputLine(outputRegion, "Panel headroom (A)", "ev-out-head");
  const oW = makeOutputLine(outputRegion, "Notes", "ev-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeEvChargerLoad({
      charger_amps: readNum(ch.input),
      charger_voltage: Number(volt.select.value),
      main_breaker_a: readNum(main.input),
      existing_load_a: readNum(existing.input),
      busbar_rating_a: readNum(busbar.input),
      load_managed: managed.input.checked,
    });
    if (r.error) {
      oCirc.textContent = r.error; oBrk.textContent = ""; oCond.textContent = ""; oLoad.textContent = ""; oHead.textContent = ""; oW.textContent = "";
      return;
    }
    oCirc.textContent = fmt(r.continuous_circuit_a, 1) + " A";
    oBrk.textContent = r.recommended_breaker_a + " A";
    oCond.textContent = r.recommended_conductor_awg ? r.recommended_conductor_awg + " AWG" : "above bundled range";
    oLoad.textContent = fmt(r.new_panel_load_a, 1) + " A";
    oHead.textContent = fmt(r.headroom_a, 1) + " A (" + fmt(r.headroom_pct, 1) + "%)";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Within panel headroom. Verify the conductor against NEC 310.16; AHJ governs.";
  }, DEBOUNCE_MS);
  for (const f of [ch.input, volt.select, main.input, existing.input, busbar.input, managed.input]) f.addEventListener("input", update);
}

ELECTRICAL_RENDERERS["ev-charger-load"] = renderEvChargerLoad;

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

// ===========================================================================
// spec-v20 Phase A - three new electrical tiles. Each is one formula, one
// cross-check, one tolerance, one named US authority, born into the v18/v21
// tile contract (no non-finite numeric output field, ever).
// ===========================================================================

// --- v20 A.1: Parallel conductor ampacity (`parallel-conductor-derate`) ---
// I_total = I_single * N * F_ccc * F_ambient; per-set current I_set = I_load/N.
// NEC permits paralleling only at 1/0 AWG and larger. The >3 current-carrying-
// conductor adjustment factor F_ccc is the NEC 310.15(C)(1) table.
const PARALLEL_PERMITTED = new Set([
  "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500",
  "600", "700", "750", "800", "900", "1000",
]);
const PARALLEL_NOT_PERMITTED = new Set(["14", "12", "10", "8", "6", "4", "3", "2", "1"]);
function cccAdjustmentFactor(n) {
  if (n <= 3) return 1.0;
  if (n <= 6) return 0.8;
  if (n <= 9) return 0.7;
  if (n <= 20) return 0.5;
  if (n <= 30) return 0.45;
  if (n <= 40) return 0.4;
  return 0.35;
}
// dims: in { i_single_A: I, n_sets: dimensionless, total_ccc: dimensionless, ambient_factor: dimensionless, i_load_A: I, conductor_size: dimensionless }
//        out: { i_total_A: I, i_set_A: I, adjustment_factor: dimensionless }
export function computeParallelConductorDerate({ i_single_A = 0, n_sets = 1, total_ccc = 0, ambient_factor = 1, i_load_A = 0, conductor_size = "" } = {}) {
  const Is = Number(i_single_A) || 0;
  const N = Math.round(Number(n_sets) || 0);
  const amb = Number(ambient_factor);
  const ccc = Math.round(Number(total_ccc) || 0);
  const size = String(conductor_size || "").trim();
  if (!(Is > 0 && Number.isFinite(Is))) return { error: "Single-conductor ampacity must be positive (A)." };
  if (!(N >= 1)) return { error: "Number of parallel sets must be at least 1." };
  if (!(amb > 0 && amb <= 1)) return { error: "Ambient-correction factor must be in (0, 1]." };
  if (size && PARALLEL_NOT_PERMITTED.has(size)) {
    return { error: "Paralleled conductors must be 1/0 AWG or larger (NEC 310.10). " + size + " AWG is not permitted in parallel." };
  }
  const fCcc = ccc > 3 ? cccAdjustmentFactor(ccc) : 1.0;
  const adjustment = fCcc * amb;
  const perSetAmpacity = Is * adjustment;
  const iTotal = perSetAmpacity * N;
  const load = Number(i_load_A) || 0;
  const iSet = load > 0 ? load / N : null;
  let adequacy = null;
  if (iSet != null) adequacy = perSetAmpacity >= iSet ? "Each set carries " + iSet.toFixed(1) + " A; per-set ampacity " + perSetAmpacity.toFixed(0) + " A is adequate." : "Per-set ampacity " + perSetAmpacity.toFixed(0) + " A is below the " + iSet.toFixed(1) + " A per-set load - increase conductor size or add a set.";
  return {
    i_total_A: Number.isFinite(iTotal) ? iTotal : null,
    per_set_ampacity_A: Number.isFinite(perSetAmpacity) ? perSetAmpacity : null,
    i_set_A: iSet != null && Number.isFinite(iSet) ? iSet : null,
    adjustment_factor: Number.isFinite(adjustment) ? adjustment : null,
    ccc_factor: fCcc,
    adequacy,
    permitted: !(size && PARALLEL_NOT_PERMITTED.has(size)),
  };
}
export const parallelConductorDerateExample = { inputs: { i_single_A: 200, n_sets: 3, total_ccc: 0, ambient_factor: 1, i_load_A: 0, conductor_size: "3/0" } };

function renderParallelConductorDerate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC (NFPA 70) - paralleled conductors (Article 310, parallel-conductor provisions, 1/0 AWG and larger) and the more-than-three current-carrying-conductor adjustment factor (310.15(C)(1)). All parallel sets must be identical length, material, and termination. Conductor ampacities user-supplied from the adopted NEC ampacity table; the AHJ-adopted edition governs. Free read-only at nfpa.org/freeaccess.";
  const sizes = ["1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600", "750"];
  const size = makeSelect("Conductor size (AWG / kcmil, 1/0+)", "pcd-size", sizes.map((s, i) => ({ value: s, label: s, selected: i === 2 })));
  const isingle = makeNumber("Single-conductor ampacity (A)", "pcd-is", { step: "any", min: "0", value: "200" });
  isingle.input.value = "200";
  const nsets = makeNumber("Number of parallel sets", "pcd-n", { step: "1", min: "1", value: "3" });
  nsets.input.value = "3";
  const ccc = makeNumber("Total current-carrying conductors in raceway (>3 for derate)", "pcd-ccc", { step: "1", min: "0" });
  const amb = makeNumber("Ambient-correction factor (0-1)", "pcd-amb", { step: "any", min: "0", max: "1", value: "1" });
  amb.input.value = "1";
  const load = makeNumber("Total load current (A, optional)", "pcd-load", { step: "any", min: "0" });
  for (const f of [size, isingle, nsets, ccc, amb, load]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    size.select.value = "3/0"; isingle.input.value = "200"; nsets.input.value = "3";
    ccc.input.value = ""; amb.input.value = "1"; load.input.value = ""; update();
  });

  const oTotal = makeOutputLine(outputRegion, "Total parallel ampacity", "pcd-out-total");
  const oFactor = makeOutputLine(outputRegion, "Adjustment factor applied", "pcd-out-factor");
  const oSet = makeOutputLine(outputRegion, "Per-set current", "pcd-out-set");
  const oNote = makeOutputLine(outputRegion, "Adequacy", "pcd-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeParallelConductorDerate({
      i_single_A: readNum(isingle.input), n_sets: readNum(nsets.input),
      total_ccc: readNum(ccc.input), ambient_factor: amb.input.value === "" ? 1 : readNum(amb.input),
      i_load_A: readNum(load.input), conductor_size: size.select.value,
    });
    if (r.error) { oTotal.textContent = r.error; oFactor.textContent = ""; oSet.textContent = ""; oNote.textContent = ""; return; }
    oTotal.textContent = fmt(r.i_total_A, 0) + " A (" + fmt(r.per_set_ampacity_A, 0) + " A per set)";
    oFactor.textContent = fmt(r.adjustment_factor, 3) + " (CCC " + fmt(r.ccc_factor, 2) + " x ambient)";
    oSet.textContent = r.i_set_A != null ? fmt(r.i_set_A, 1) + " A per set" : "Enter a load to size each set.";
    oNote.textContent = r.adequacy || "All sets must be identical length / material / termination.";
  }, DEBOUNCE_MS);
  for (const f of [size.select, isingle.input, nsets.input, ccc.input, amb.input, load.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["parallel-conductor-derate"] = renderParallelConductorDerate;

// --- v20 A.2: Three-phase neutral current (`neutral-current-3ph`) ---
// I_N = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia), the phasor sum of
// three 120-degree-displaced currents. With dominant triplens the neutral
// approaches 3 * I_triplen_per_phase (triplens add arithmetically).
// dims: in { ia_A: I, ib_A: I, ic_A: I, triplen_pct: dimensionless }
//        out: { neutral_A: I, harmonic_neutral_A: I }
export function computeNeutralCurrent3ph({ ia_A = 0, ib_A = 0, ic_A = 0, triplen_pct = 0 } = {}) {
  const a = Number(ia_A) || 0, b = Number(ib_A) || 0, c = Number(ic_A) || 0;
  const trip = Number(triplen_pct) || 0;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(trip)) return { error: "Phase currents and triplen content must be finite numbers." };
  if (a < 0 || b < 0 || c < 0) return { error: "Phase currents must be non-negative (A)." };
  if (!(a > 0 || b > 0 || c > 0)) return { error: "Enter at least one phase current (A)." };
  const inside = a * a + b * b + c * c - a * b - b * c - c * a;
  const In = Math.sqrt(Math.max(0, inside));
  const maxPhase = Math.max(a, b, c);
  const avgPhase = (a + b + c) / 3;
  const harmonicNeutral = trip > 0 ? 3 * (avgPhase * trip / 100) : null;
  const dominant = harmonicNeutral != null && harmonicNeutral > maxPhase;
  return {
    neutral_A: Number.isFinite(In) ? In : null,
    harmonic_neutral_A: harmonicNeutral != null && Number.isFinite(harmonicNeutral) ? harmonicNeutral : null,
    max_phase_A: maxPhase,
    neutral_is_ccc: dominant,
    note: dominant
      ? "Triplen-dominated: the neutral may exceed the phase current and counts as a current-carrying conductor (NEC 310.15(E), IEEE 519)."
      : (a === b && b === c ? "Balanced linear load - fundamental neutral current is zero." : "Unbalanced fundamental neutral current (RMS magnitude, not direction)."),
  };
}
export const neutralCurrent3phExample = { inputs: { ia_A: 100, ib_A: 80, ic_A: 60, triplen_pct: 0 } };

function renderNeutralCurrent3ph(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Phasor sum of three 120-degree-displaced currents (first principles). Neutral-as-current-carrying-conductor and harmonic guidance per NEC Article 310 and IEEE Std 519, by name; the AHJ-adopted edition governs. Result is RMS magnitude, not direction. Free read-only at nfpa.org/freeaccess.";
  const ia = makeNumber("Phase A current (A)", "nc-ia", { step: "any", min: "0", value: "100" });
  ia.input.value = "100";
  const ib = makeNumber("Phase B current (A)", "nc-ib", { step: "any", min: "0", value: "80" });
  ib.input.value = "80";
  const ic = makeNumber("Phase C current (A)", "nc-ic", { step: "any", min: "0", value: "60" });
  ic.input.value = "60";
  const trip = makeNumber("Per-phase triplen (3rd-harmonic) content (%, optional)", "nc-trip", { step: "any", min: "0", max: "100" });
  for (const f of [ia, ib, ic, trip]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ia.input.value = "100"; ib.input.value = "80"; ic.input.value = "60"; trip.input.value = ""; update(); });
  const oN = makeOutputLine(outputRegion, "Neutral current", "nc-out-n");
  const oH = makeOutputLine(outputRegion, "Harmonic-dominated estimate", "nc-out-h");
  const oNote = makeOutputLine(outputRegion, "Note", "nc-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeNeutralCurrent3ph({ ia_A: readNum(ia.input), ib_A: readNum(ib.input), ic_A: readNum(ic.input), triplen_pct: readNum(trip.input) });
    if (r.error) { oN.textContent = r.error; oH.textContent = ""; oNote.textContent = ""; return; }
    oN.textContent = fmt(r.neutral_A, 2) + " A";
    oH.textContent = r.harmonic_neutral_A != null ? fmt(r.harmonic_neutral_A, 1) + " A (~3 x triplen/phase)" : "Enter triplen % to estimate the harmonic neutral.";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ia.input, ib.input, ic.input, trip.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["neutral-current-3ph"] = renderNeutralCurrent3ph;

// --- v20 A.3: Motor starting voltage dip (`motor-vd-starting`) ---
// V_drop = (2 for 1-phase, sqrt(3) for 3-phase) * K * LRC * L / cmils;
// V_terminal = V_source - V_drop; %dip = V_drop / V_source * 100.
// dims: in { source_voltage_V: M*L^2*T^-3*I^-1, length_ft: L, cmils: L^2, lrc_A: I, phase: dimensionless, k_const: dimensionless, dip_limit_pct: dimensionless }
//        out: { v_drop_V: M*L^2*T^-3*I^-1, v_terminal_V: M*L^2*T^-3*I^-1, dip_pct: dimensionless }
export function computeMotorVdStarting({ source_voltage_V = 0, length_ft = 0, cmils = 0, lrc_A = 0, phase = "three", k_const = 12.9, dip_limit_pct = 15, lrc_estimated = false } = {}) {
  const V = Number(source_voltage_V) || 0;
  const L = Number(length_ft) || 0;
  const cm = Number(cmils) || 0;
  const lrc = Number(lrc_A) || 0;
  const K = Number(k_const) || 0;
  const limit = Number(dip_limit_pct);
  if (!(V > 0 && Number.isFinite(V))) return { error: "Source voltage must be positive (V)." };
  if (!(L > 0 && Number.isFinite(L))) return { error: "Conductor length must be positive (ft)." };
  if (!(cm > 0 && Number.isFinite(cm))) return { error: "Conductor circular mils must be positive." };
  if (!(lrc > 0 && Number.isFinite(lrc))) return { error: "Locked-rotor current must be positive (A)." };
  if (!(K > 0)) return { error: "Conductor constant K must be positive (Cu ~12.9, Al ~21.2)." };
  const factor = phase === "single" ? 2 : Math.sqrt(3);
  const vDrop = factor * K * lrc * L / cm;
  const vTerminal = V - vDrop;
  const dipPct = vDrop / V * 100;
  const lim = Number.isFinite(limit) && limit > 0 ? limit : 15;
  return {
    v_drop_V: Number.isFinite(vDrop) ? vDrop : null,
    v_terminal_V: Number.isFinite(vTerminal) ? vTerminal : null,
    dip_pct: Number.isFinite(dipPct) ? dipPct : null,
    pass: dipPct <= lim,
    dip_limit_pct: lim,
    note: (lrc_estimated ? "LRC estimated as 6x FLA (no code letter entered - confirm against the nameplate). " : "")
      + (dipPct > lim ? "Starting dip exceeds " + lim + "% - likely contactor dropout / failed start." : "Within the " + lim + "% starting-dip limit.")
      + " This is the starting dip, distinct from the steady-state voltage-drop tile.",
  };
}
export const motorVdStartingExample = { inputs: { source_voltage_V: 480, length_ft: 250, cmils: 250000, lrc_A: 180, phase: "three", k_const: 12.9, dip_limit_pct: 15 } };

function renderMotorVdStarting(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ohm's-law voltage-drop method (first principles); motor locked-rotor current per NEC Article 430 code-letter tables (user-supplied, or 6x FLA estimate); contactor pickup/dropout commonly ~85% nominal per NEMA ICS 2, by name. The AHJ governs. Distinct from the steady-state voltage-drop tile. Free read-only at nfpa.org/freeaccess.";
  const v = makeNumber("Source voltage (V)", "mvds-v", { step: "any", min: "0", value: "480" });
  v.input.value = "480";
  const phase = makeSelect("Phase", "mvds-phase", [{ value: "three", label: "3-phase", selected: true }, { value: "single", label: "1-phase" }]);
  const len = makeNumber("One-way conductor length (ft)", "mvds-len", { step: "any", min: "0", value: "250" });
  len.input.value = "250";
  const cm = makeNumber("Conductor circular mils (cmils)", "mvds-cm", { step: "any", min: "0", value: "250000" });
  cm.input.value = "250000";
  const lrc = makeNumber("Locked-rotor current (A)", "mvds-lrc", { step: "any", min: "0", value: "180" });
  lrc.input.value = "180";
  const k = makeSelect("Conductor material (K)", "mvds-k", [{ value: "12.9", label: "Copper (K=12.9)", selected: true }, { value: "21.2", label: "Aluminum (K=21.2)" }]);
  const limit = makeNumber("Dip limit (%)", "mvds-lim", { step: "any", min: "0", value: "15" });
  limit.input.value = "15";
  for (const f of [v, phase, len, cm, lrc, k, limit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    v.input.value = "480"; phase.select.value = "three"; len.input.value = "250";
    cm.input.value = "250000"; lrc.input.value = "180"; k.select.value = "12.9"; limit.input.value = "15"; update();
  });
  const oDrop = makeOutputLine(outputRegion, "Voltage drop during start", "mvds-out-drop");
  const oTerm = makeOutputLine(outputRegion, "Terminal voltage during start", "mvds-out-term");
  const oDip = makeOutputLine(outputRegion, "% dip / verdict", "mvds-out-dip");
  const oNote = makeOutputLine(outputRegion, "Note", "mvds-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorVdStarting({
      source_voltage_V: readNum(v.input), length_ft: readNum(len.input), cmils: readNum(cm.input),
      lrc_A: readNum(lrc.input), phase: phase.select.value, k_const: Number(k.select.value), dip_limit_pct: readNum(limit.input),
    });
    if (r.error) { oDrop.textContent = r.error; oTerm.textContent = ""; oDip.textContent = ""; oNote.textContent = ""; return; }
    oDrop.textContent = fmt(r.v_drop_V, 1) + " V";
    oTerm.textContent = fmt(r.v_terminal_V, 1) + " V";
    oDip.textContent = fmt(r.dip_pct, 2) + "% - " + (r.pass ? "PASS" : "FAIL");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [v.input, phase.select, len.input, cm.input, lrc.input, k.select, limit.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["motor-vd-starting"] = renderMotorVdStarting;

// --- v24 conduit bending: offset bend (`conduit-offset`) ---
// First-principles trig: mark spacing = offset / sin(angle); shrink = offset * tan(angle/2).
// dims: in { offset_in: L, angle_deg: dimensionless } out: { mark_spacing_in: L, shrink_in: L, multiplier: dimensionless, shrink_per_in: dimensionless }
export function computeConduitOffset({ offset_in = 0, angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const offset = Number(offset_in) || 0;
  const angle = Number(angle_deg);
  if (!(offset > 0)) return { error: "Offset depth must be greater than zero (in)." };
  if (!(angle > 0) || !(angle < 90)) return { error: "Bend angle must be between 0 and 90 degrees." };
  const rad = angle * Math.PI / 180;
  const sinA = Math.sin(rad);
  if (!(sinA > 0)) return { error: "Bend angle must be between 0 and 90 degrees." };
  const multiplier = 1 / sinA;
  const shrink_per_in = Math.tan(rad / 2);
  const mark_spacing_in = offset * multiplier;
  const shrink_in = offset * shrink_per_in;
  return {
    mark_spacing_in: Number.isFinite(mark_spacing_in) ? mark_spacing_in : null,
    shrink_in: Number.isFinite(shrink_in) ? shrink_in : null,
    multiplier: Number.isFinite(multiplier) ? multiplier : null,
    shrink_per_in: Number.isFinite(shrink_per_in) ? shrink_per_in : null,
    note: "Mark spacing = offset / sin(angle). Shrink uses the exact tan(angle/2); the 0.75x-per-inch rule of thumb is approximate. Confirm bender deduct/shoe figures against your tool.",
  };
}
export const conduitOffsetExample = { inputs: { offset_in: 6, angle_deg: 30 } };

function renderConduitOffset(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Conduit offset bending is first-principles trigonometry taught in the electrical apprenticeship; mark spacing and multipliers follow Ugly's Electrical References and NECA conduit-bending guidance by name. Bender deduct and shoe figures are tool-specific - confirm against your bender. See the cable-bend-radius tile for minimum conductor bend radius. The AHJ governs.";
  const offset = makeNumber("Offset depth (in)", "co-offset", { step: "any", min: "0", value: "6" });
  offset.input.value = "6";
  const angle = makeSelect("Bend angle", "co-angle", [
    { value: "10", label: "10 deg" },
    { value: "22.5", label: "22.5 deg" },
    { value: "30", label: "30 deg", selected: true },
    { value: "45", label: "45 deg" },
    { value: "60", label: "60 deg" },
  ]);
  for (const f of [offset, angle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { offset.input.value = "6"; angle.select.value = "30"; update(); });
  const oSpace = makeOutputLine(outputRegion, "Distance between marks", "co-out-space");
  const oShrink = makeOutputLine(outputRegion, "Total shrink", "co-out-shrink");
  const oMult = makeOutputLine(outputRegion, "Multiplier / shrink per inch", "co-out-mult");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeConduitOffset({ offset_in: readNum(offset.input), angle_deg: Number(angle.select.value) });
    if (r.error) { oSpace.textContent = r.error; oShrink.textContent = ""; oMult.textContent = ""; return; }
    oSpace.textContent = fmt(r.mark_spacing_in, 2) + " in";
    oShrink.textContent = fmt(r.shrink_in, 3) + " in";
    oMult.textContent = fmt(r.multiplier, 3) + " x  (" + fmt(r.shrink_per_in, 4) + " in/in)";
  }, DEBOUNCE_MS);
  for (const f of [offset.input, angle.select]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["conduit-offset"] = renderConduitOffset;

// --- v24 conduit bending: saddle bend (`conduit-saddle`) ---
// Three-point uses field multipliers (2.5x for 45/22.5, 2.0x for 60/30) and the 3/16-in-per-inch shrink rule
// for the 45/22.5 case; four-point is two back-to-back offsets each = depth / sin(theta) separated by width.
// dims: in { mode: dimensionless, depth_in: L, preset: dimensionless, width_in: L }
//        out: { mark_spacing_in: L, shrink_in: L, center_bend_deg: dimensionless, outer_bend_deg: dimensionless, width_in: L }
export function computeConduitSaddle({ mode = "three-point", depth_in = 0, preset = "45/22.5", width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const depth = Number(depth_in) || 0;
  if (!(depth > 0)) return { error: "Obstruction depth must be greater than zero (in)." };
  let centerBend, outerBend, fieldMultiplier, shrinkPerIn;
  if (preset === "60/30") { centerBend = 60; outerBend = 30; fieldMultiplier = 2.0; shrinkPerIn = 0.25; }
  else { centerBend = 45; outerBend = 22.5; fieldMultiplier = 2.5; shrinkPerIn = 3 / 16; }
  const outerRad = outerBend * Math.PI / 180;
  const sinOuter = Math.sin(outerRad);
  const exact_csc = sinOuter > 0 ? 1 / sinOuter : null;
  if (mode === "four-point") {
    const width = Number(width_in) || 0;
    if (!(width > 0)) return { error: "For a four-point saddle the obstruction width must be greater than zero (in)." };
    if (!(exact_csc !== null && Number.isFinite(exact_csc))) return { error: "Invalid outer bend angle." };
    const legSpacing = depth * exact_csc;
    return {
      mode: "four-point",
      mark_spacing_in: Number.isFinite(legSpacing) ? legSpacing : null,
      width_in: width,
      center_bend_deg: centerBend,
      outer_bend_deg: outerBend,
      shrink_in: null,
      note: "Four-point saddle = two back-to-back offsets, each leg spacing = depth / sin(outer angle), separated by the obstruction width. Bend all four at the outer angle. Confirm deduct against your bender.",
    };
  }
  // three-point
  const mark_spacing_in = depth * fieldMultiplier;
  const shrink_in = depth * shrinkPerIn;
  return {
    mode: "three-point",
    mark_spacing_in: Number.isFinite(mark_spacing_in) ? mark_spacing_in : null,
    shrink_in: Number.isFinite(shrink_in) ? shrink_in : null,
    center_bend_deg: centerBend,
    outer_bend_deg: outerBend,
    exact_outer_csc: Number.isFinite(exact_csc) ? exact_csc : null,
    note: "Three-point saddle: dial the center bend at " + centerBend + " deg and each outer bend at " + outerBend + " deg. Outer marks sit mark-spacing each side of the center mark using the field multiplier " + fieldMultiplier + "x; shrink uses the field rule (" + (preset === "60/30" ? "1/4" : "3/16") + " in per inch of depth). The exact cosecant of the outer angle is reported separately. Confirm against your bender.",
  };
}
export const conduitSaddleExample = { inputs: { mode: "three-point", depth_in: 3, preset: "45/22.5" } };

function renderConduitSaddle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Conduit saddle bending follows the field multipliers and shrink rules taught in the electrical apprenticeship and documented in Ugly's Electrical References and NECA conduit-bending guidance by name. Bender deduct and shoe figures are tool-specific - confirm against your bender. See the cable-bend-radius tile for minimum conductor bend radius. The AHJ governs.";
  const mode = makeSelect("Saddle type", "cs-mode", [
    { value: "three-point", label: "Three-point", selected: true },
    { value: "four-point", label: "Four-point" },
  ]);
  const depth = makeNumber("Obstruction depth (in)", "cs-depth", { step: "any", min: "0", value: "3" });
  depth.input.value = "3";
  const preset = makeSelect("Bend preset (center/outer)", "cs-preset", [
    { value: "45/22.5", label: "45/22.5 deg", selected: true },
    { value: "60/30", label: "60/30 deg" },
  ]);
  const width = makeNumber("Obstruction width (in, four-point only)", "cs-width", { step: "any", min: "0" });
  for (const f of [mode, depth, preset, width]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "three-point"; depth.input.value = "3"; preset.select.value = "45/22.5"; width.input.value = ""; update(); });
  const oSpace = makeOutputLine(outputRegion, "Mark spacing", "cs-out-space");
  const oShrink = makeOutputLine(outputRegion, "Total shrink / width", "cs-out-shrink");
  const oBends = makeOutputLine(outputRegion, "Bend angles to dial", "cs-out-bends");
  const oNote = makeOutputLine(outputRegion, "Note", "cs-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeConduitSaddle({ mode: mode.select.value, depth_in: readNum(depth.input), preset: preset.select.value, width_in: readNum(width.input) });
    if (r.error) { oSpace.textContent = r.error; oShrink.textContent = ""; oBends.textContent = ""; oNote.textContent = ""; return; }
    if (r.mode === "four-point") {
      oSpace.textContent = fmt(r.mark_spacing_in, 3) + " in per leg from each center";
      oShrink.textContent = "Obstruction width: " + fmt(r.width_in, 2) + " in";
    } else {
      oSpace.textContent = fmt(r.mark_spacing_in, 2) + " in each side of center";
      oShrink.textContent = fmt(r.shrink_in, 4) + " in shrink";
    }
    oBends.textContent = "Center " + fmt(r.center_bend_deg, 1) + " deg, outers " + fmt(r.outer_bend_deg, 1) + " deg";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mode.select, depth.input, preset.select, width.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["conduit-saddle"] = renderConduitSaddle;

// --- v24 conduit bending: 90-degree stub / back-to-back / segment (`conduit-90-stub`) ---
// stub-up: mark = height - deduct (flag, do not leak negative as valid). back-to-back: second mark = back-to-back dim.
// segment-90: n_shots = ceil(90 / per-shot angle); arc per shot = radius * (per-shot angle in radians).
// dims: in { mode: dimensionless, height_in: L, deduct_in: L, back_to_back_in: L, radius_in: L, per_shot_deg: dimensionless }
//        out: { mark_in: L, second_mark_in: L, n_shots: dimensionless, arc_per_shot_in: L }
export function computeConduit90Stub({ mode = "stub-up", height_in = 0, deduct_in = 0, back_to_back_in = 0, radius_in = 0, per_shot_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (mode === "segment-90") {
    const radius = Number(radius_in) || 0;
    const perShot = Number(per_shot_deg) || 0;
    if (!(radius > 0)) return { error: "Bend radius must be greater than zero (in)." };
    if (!(perShot > 0)) return { error: "Per-shot angle must be greater than zero (deg)." };
    const n_shots = Math.ceil(90 / perShot);
    const arc_per_shot_in = radius * (perShot * Math.PI / 180);
    const residual_deg = 90 - perShot * Math.floor(90 / perShot);
    return {
      mode: "segment-90",
      n_shots: Number.isFinite(n_shots) ? n_shots : null,
      arc_per_shot_in: Number.isFinite(arc_per_shot_in) ? arc_per_shot_in : null,
      residual_deg: Number.isFinite(residual_deg) ? residual_deg : null,
      note: "Segment 90: " + n_shots + " shots of " + perShot + " deg" + (residual_deg > 0 ? " (last shot covers the " + residual_deg + " deg residual since 90 is not divisible by the per-shot angle)" : "") + ". Arc length per shot = radius * angle(rad). Confirm against your bender.",
    };
  }
  const height = Number(height_in) || 0;
  const deduct = Number(deduct_in) || 0;
  if (!(height > 0)) return { error: "Stub height must be greater than zero (in)." };
  if (!(deduct >= 0)) return { error: "Bender deduct/take-up must be zero or greater (in)." };
  const mark_in = height - deduct;
  const impractical = mark_in < 0;
  if (mode === "back-to-back") {
    const b2b = Number(back_to_back_in) || 0;
    if (!(b2b > 0)) return { error: "Back-to-back dimension must be greater than zero (in)." };
    return {
      mode: "back-to-back",
      mark_in: Number.isFinite(mark_in) ? mark_in : null,
      second_mark_in: Number.isFinite(b2b) ? b2b : null,
      impractical: impractical,
      note: (impractical ? "Stub mark is negative (deduct exceeds height) - impractical, not a valid bend; pick a larger stub or smaller conduit. " : "") + "First mark = height - deduct; second mark at the back-to-back dimension, bent in the opposite direction. Confirm deduct against your bender.",
    };
  }
  return {
    mode: "stub-up",
    mark_in: Number.isFinite(mark_in) ? mark_in : null,
    impractical: impractical,
    note: (impractical ? "Stub mark is negative (deduct exceeds height) - impractical, not a valid bend; pick a larger stub or smaller conduit. " : "") + "Mark = stub height - bender deduct/take-up. Place the bender arrow at the mark. Confirm deduct against your bender.",
  };
}
export const conduit90StubExample = { inputs: { mode: "stub-up", height_in: 8, deduct_in: 6 } };

function renderConduit90Stub(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Conduit 90-degree stub, back-to-back, and segmented bends are first-principles geometry taught in the electrical apprenticeship; deduct/take-up figures (EMT 1/2 in ~5, 3/4 in ~6, 1 in ~8, 1-1/4 in ~11) are tool-specific - confirm against your bender per Ugly's Electrical References and NECA conduit-bending guidance by name. See the cable-bend-radius tile for minimum conductor bend radius. The AHJ governs.";
  const mode = makeSelect("Mode", "c90-mode", [
    { value: "stub-up", label: "Stub-up", selected: true },
    { value: "back-to-back", label: "Back-to-back" },
    { value: "segment-90", label: "Segmented 90" },
  ]);
  const height = makeNumber("Stub height (in)", "c90-height", { step: "any", min: "0", value: "8" });
  height.input.value = "8";
  const deduct = makeSelect("Bender deduct/take-up", "c90-deduct", [
    { value: "5", label: "EMT 1/2 in (deduct 5)" },
    { value: "6", label: "EMT 3/4 in (deduct 6)", selected: true },
    { value: "8", label: "EMT 1 in (deduct 8)" },
    { value: "11", label: "EMT 1-1/4 in (deduct 11)" },
  ]);
  const b2b = makeNumber("Back-to-back dim (in, back-to-back only)", "c90-b2b", { step: "any", min: "0" });
  const radius = makeNumber("Bend radius (in, segment only)", "c90-radius", { step: "any", min: "0" });
  const perShot = makeNumber("Per-shot angle (deg, segment only)", "c90-pershot", { step: "any", min: "0" });
  for (const f of [mode, height, deduct, b2b, radius, perShot]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "stub-up"; height.input.value = "8"; deduct.select.value = "6"; b2b.input.value = ""; radius.input.value = ""; perShot.input.value = ""; update(); });
  const oMark = makeOutputLine(outputRegion, "Mark / shots", "c90-out-mark");
  const oSecond = makeOutputLine(outputRegion, "Second mark / arc per shot", "c90-out-second");
  const oNote = makeOutputLine(outputRegion, "Note", "c90-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeConduit90Stub({
      mode: mode.select.value, height_in: readNum(height.input), deduct_in: Number(deduct.select.value),
      back_to_back_in: readNum(b2b.input), radius_in: readNum(radius.input), per_shot_deg: readNum(perShot.input),
    });
    if (r.error) { oMark.textContent = r.error; oSecond.textContent = ""; oNote.textContent = ""; return; }
    if (r.mode === "segment-90") {
      oMark.textContent = r.n_shots + " shots";
      oSecond.textContent = fmt(r.arc_per_shot_in, 3) + " in arc per shot";
    } else if (r.mode === "back-to-back") {
      oMark.textContent = (r.impractical ? "IMPRACTICAL " : "") + fmt(r.mark_in, 2) + " in (first mark)";
      oSecond.textContent = fmt(r.second_mark_in, 2) + " in (second mark)";
    } else {
      oMark.textContent = (r.impractical ? "IMPRACTICAL " : "") + fmt(r.mark_in, 2) + " in";
      oSecond.textContent = "";
    }
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mode.select, height.input, deduct.select, b2b.input, radius.input, perShot.input]) f.addEventListener("input", update);
}
ELECTRICAL_RENDERERS["conduit-90-stub"] = renderConduit90Stub;
