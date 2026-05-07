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
  return { drop_V, percent };
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
  return { fill_in2, fill_percent, conduit_area_in2: conduit_area, threshold_percent: threshold, pass: fill_percent <= threshold, count };
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

export function computeBreakerSize({ load_A, continuous }) {
  const required = continuous ? load_A * 1.25 : load_A;
  const standardSizes = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400];
  const next = standardSizes.find((s) => s >= required) ?? required;
  return { required_A: required, next_standard_A: next };
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

export function computeTransformerSize({ load_kW, power_factor = 1, primary_V, secondary_V, phase = "three" }) {
  const kVA = power_factor > 0 ? load_kW / power_factor : load_kW;
  const sqrt3 = Math.sqrt(3);
  const primary_FLA = phase === "three" ? (kVA * 1000) / (sqrt3 * primary_V) : (kVA * 1000) / primary_V;
  const secondary_FLA = phase === "three" ? (kVA * 1000) / (sqrt3 * secondary_V) : (kVA * 1000) / secondary_V;
  // Round up to the next standard transformer kVA.
  const standardKVA = [3, 5, 7.5, 10, 15, 25, 37.5, 50, 75, 100, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000];
  const next = standardKVA.find((s) => s >= kVA) ?? kVA;
  return { required_kVA: kVA, next_standard_kVA: next, primary_FLA_A: primary_FLA, secondary_FLA_A: secondary_FLA };
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
  citationEl.textContent = "Citation: Heat-balance ampacity (IEEE conductor sizing methodology) using insulation manufacturer temperature ratings. See docs/derivations.md section 2.";
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
  const bun = makeNumber("Conductor bundle count", "wa-bun", { step: "1", min: "1", value: "1" });
  bun.input.value = "1";
  for (const f of [awg, mat, ins, amb, bun]) inputRegion.appendChild(f.wrap);

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
  for (const f of [phase, mat, awg, len, cur, src]) inputRegion.appendChild(f.wrap);

  const outV = makeOutputLine(outputRegion, "Voltage drop", "vd-out-v");
  const outP = makeOutputLine(outputRegion, "Percent drop", "vd-out-p");

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
  }, DEBOUNCE_MS);

  for (const el of [phase.select, mat.select, awg.select, len.input, cur.input, src.input]) el.addEventListener("input", update);
}

export function renderConduitFill(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Cross-sectional areas from manufacturer cable catalogs and ASTM dimensions. Thresholds (53 single, 31 two, 40 three or more) referenced as standard practice.";
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
    outPct.textContent = fmt(r.fill_percent, 1) + " %";
    outPass.textContent = (r.pass ? "Pass" : "Fail") + " (threshold " + r.threshold_percent + " %)";
  }, DEBOUNCE_MS);

  for (const el of [conduit.select, trade.select, insulation.select, awg.select, count.input]) el.addEventListener("input", update);
}

export function renderBoxFill(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Box-fill volume allowances per conductor from standard published values: 14 AWG 2.0 in^3, 12 AWG 2.25 in^3, 10 AWG 2.5 in^3, etc. Devices count twice the largest conductor; internal clamps count once.";
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
  citationEl.textContent = "Citation: Continuous-load 125 percent rule for branch-circuit overcurrent device sizing; standard breaker sizes per common manufacturer offerings.";
  attachExampleButton(inputRegion, () => fillExample({ load: 16, continuous: true }));

  const load = makeNumber("Load current (A)", "bs-load", { step: "any", min: "0" });
  const continuous = makeCheckbox("Continuous load (3 hours or more)", "bs-cont", true);
  for (const f of [load, continuous]) inputRegion.appendChild(f.wrap);

  const outReq = makeOutputLine(outputRegion, "Required ampacity", "bs-out-req");
  const outNext = makeOutputLine(outputRegion, "Next standard breaker", "bs-out-next");

  function fillExample(v) { load.input.value = v.load; continuous.input.checked = v.continuous; update(); }
  const update = debounce(() => {
    const r = computeBreakerSize({
      load_A: Number(load.input.value) || 0,
      continuous: continuous.input.checked,
    });
    outReq.textContent = fmt(r.required_A, 2) + " A";
    outNext.textContent = r.next_standard_A + " A";
  }, DEBOUNCE_MS);

  for (const el of [load.input, continuous.input]) el.addEventListener("input", update);
}

export function renderMotorFLA(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Compiled from NEMA-aligned manufacturer technical bulletins. Each value is published manufacturer technical data, used with attribution.";
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
    outNext.textContent = r.next_standard_kVA + " kVA";
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
  citationEl.textContent = "Citation: EGC sizing from underlying impedance considerations. Output matches NEC Table 250.122 for typical inputs by physics; the table is referenced, not reproduced.";
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

export function computeVoltageImbalance({ V_a, V_b, V_c }) {
  const v = [V_a, V_b, V_c].map(Number);
  if (v.some((x) => !Number.isFinite(x) || x <= 0)) return { error: "Provide three positive line voltages." };
  const avg = (v[0] + v[1] + v[2]) / 3;
  const max_dev = Math.max(...v.map((x) => Math.abs(x - avg)));
  const imbalance_percent = (max_dev / avg) * 100;
  const derate_factor = 1 - 2 * Math.pow(imbalance_percent / 100, 2);
  return { average_V: avg, max_deviation_V: max_dev, imbalance_percent, derate_factor };
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
  citationEl.textContent = "Citation: Standard residential demand factors (general lighting 3 W/ft^2; small-appliance and laundry 1500 W; first 3000 W at 100% then 35%; range first 8 kW at 100% then 40%; dryer 5 kW minimum). NEC referenced by section; AHJ governs final service sizing.";
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

  function fillExample(v) { a.input.value = v.V_a; b.input.value = v.V_b; c.input.value = v.V_c; update(); }
  const update = debounce(() => {
    const r = computeVoltageImbalance({
      V_a: Number(a.input.value) || 0,
      V_b: Number(b.input.value) || 0,
      V_c: Number(c.input.value) || 0,
    });
    if (r.error) { oAvg.textContent = r.error; oImb.textContent = "-"; oDer.textContent = "-"; return; }
    oAvg.textContent = fmt(r.average_V, 2) + " V";
    oImb.textContent = fmt(r.imbalance_percent, 3) + " %";
    oDer.textContent = fmt(r.derate_factor, 4);
  }, DEBOUNCE_MS);

  for (const el of [a.input, b.input, c.input]) el.addEventListener("input", update);
}

export function renderGFCIReference(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Original plain-English summaries of GFCI and AFCI requirements by occupancy area. NEC sections referenced by number; no code text reproduced. AHJ governs.";
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
  citationEl.textContent = "Citation: Public engineering benchmarks (ASHRAE 90.1 referenced by name only; values are widely cited engineering practice). Target W = area * W/ft^2.";
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
};
