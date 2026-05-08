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

// --- Utility 1: Ohm's Law ---

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

export function computeWireAmpacity({ awg, material, insulation_rating_C, ambient_C, bundle_count = 1 }) {
  const I = ampacityFromPhysics({ awg, material, insulation_rating_C, ambient_C, bundle_count });
  return { ampacity_A: I };
}

export const wireAmpacityExample = {
  inputs: { awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 },
  expectedRange: { min: 18, max: 35 },
};

// --- Utility 3: Voltage Drop ---

export function computeVoltageDrop({ phase, material, awg, length_ft, current_A, source_voltage_V }) {
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

export function computeBoxFill({ box_volume_in3, conductors_by_size, devices = 0, internal_clamps = false, largest_awg_for_clamp_and_device = "14" }) {
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

export function computeBreakerSize({ load_A, continuous, load_W = 0, voltage_V = 0, power_factor = 1, phase = "single" }) {
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

export function computeTransformerSize({ load_kW, power_factor = 1, primary_V, secondary_V, phase = "three" }) {
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

export function computeThreePhase({ V_LL, I_L, pf }) {
  return threePhasePower({ V_LL, I_L, pf });
}

export const threePhaseExample = {
  inputs: { V_LL: 480, I_L: 100, pf: 0.9 },
  expectedRange: { kW: { min: 74, max: 76 }, kVA: { min: 82, max: 84 } },
};

// --- Utility 10: Resistance of Copper and Aluminum at Temperature ---

export function computeConductorResistance({ material, awg, length_ft, temperature_C }) {
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

export function renderWireAmpacity(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 Table 310.16 (75°C column) with §310.15(B) ambient and conduit-fill adjustments. AHJ-adopted edition governs. Free at nfpa.org/freeaccess.";
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

export function renderConduitFill(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 Chapter 9, Table 4 (conduit areas) and Chapter 9, Table 5 (conductor areas). Fill thresholds 53% (1 conductor), 31% (2 conductors), 40% (≥ 3 conductors). AHJ governs. Free at nfpa.org/freeaccess.";
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
    outKVA.textContent = fmt(r.required_kVA, 2) + " kVA";
    // v8 §C.1: surface ANSI/IEEE C57 step + cap flag.
    const stepBadge = r.at_step_cap ? " (above 1000 kVA cap; engineering review required)" : " (ANSI/IEEE C57 step)";
    outNext.textContent = r.next_standard_kVA + " kVA" + stepBadge;
    outPri.textContent = fmt(r.primary_FLA_A, 2) + " A";
    outSec.textContent = fmt(r.secondary_FLA_A, 2) + " A";
  }, DEBOUNCE_MS);

  for (const el of [load.input, pf.input, primary.input, secondary.input, phase.select]) el.addEventListener("input", update);
}

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

export function computePVStringSizing({
  module_voc_V, module_vmp_V, voc_temp_coeff_pct_per_C,
  record_low_C, record_high_C,
  inverter_mppt_min_V, inverter_mppt_max_V, inverter_vdc_max_V,
}) {
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

export function computeBatteryRuntime({ amp_hours, system_V, dod_percent = 100, load_W, peukert_k = 1 }) {
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

export function computeLightingDensity({ area_ft2, occupancy_class }) {
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

export function renderServiceLoad(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: per NEC 2023 §220.12 (general lighting 3 VA/ft²), §220.42 (dwelling demand 3000 / 35% / 25% schedule), §220.82 (optional method). AHJ governs final service sizing. Free at nfpa.org/freeaccess.";
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

export function computePullingTension({
  cable_weight_lb_per_ft = 0,
  run_length_ft = 0,
  lubricant = "polymer",
  straight_run_ft = 0,
  bends = [],
}) {
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

export function computeBendRadius({ cable_type, cable_od_in }) {
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

export function computePFCorrection({ kW, pf1, pf2, system_V, phase = "single" }) {
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

export function computeMultiLoadVoltageDrop({
  material = "copper",
  awg = "12",
  source_voltage_V = 120,
  loads = [],
}) {
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

export function computeLVDCDrop({ system_V = 12, awg = "10", run_length_ft = 0, current_A = 0, application = "led_lighting" }) {
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

export function computePoEBudget({ poe_class = "at", category = "Cat6", run_length_ft = 100, ambient_C = 25 }) {
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
    const ph = document.createElement("select");
    for (const v of ["A", "B", "C"]) {
      const o = document.createElement("option"); o.value = v; o.textContent = "Phase " + v; if (v === phaseVal) o.selected = true; ph.appendChild(o);
    }
    const ld = document.createElement("input"); ld.type = "number"; ld.step = "any"; ld.min = "0"; ld.placeholder = "Load (W)"; ld.value = loadVal;
    wrap.appendChild(ph); wrap.appendChild(ld);
    list.appendChild(wrap);
    ph.addEventListener("input", update); ld.addEventListener("input", update);
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
    const d = document.createElement("input"); d.type = "number"; d.step = "any"; d.min = "0"; d.placeholder = "Distance (ft)";
    const c = document.createElement("input"); c.type = "number"; c.step = "any"; c.min = "0"; c.placeholder = "Load current (A)";
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

export function computeTransformerKvaSizing({
  loads = [],
  primary_V = 480,
  secondary_V = 208,
  phase = "three",
  growth_reserve_pct = 25,
} = {}) {
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

export function computeShortCircuitPP({
  utility_kVA = 0,
  utility_Z_pct = 0,
  secondary_V = 0,
  phase = "three",
  C_value = 0,
  length_ft = 0,
  parallel_sets = 1,
} = {}) {
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
