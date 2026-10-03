// Group C: HVAC airside field-method calculators.
//
// Split intact from calc-hvac.js by spec-v1870. Calculator IDs, formulas,
// fields, outputs, citations, examples, and Group C assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine,
  attachExampleButton, fmt,
} from "./ui-fields.js";

const _finiteGuardEnv = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) return { error: "All numeric inputs must be finite numbers." };
    }
  }
  return null;
};
function _rEnv(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) { for (const f of spec.fields) { if (v[f.key] === undefined) continue; fields[f.key].input.value = v[f.key]; } update(); }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const HVACAIRSIDE_RENDERERS = {};

// =====================================================================
// spec-v347..v349: air-distribution / air-property batch (Group C). The
// duct-and-grille field numbers the load and friction tiles never give:
// duct heat gain through unconditioned space (v347), grille face velocity
// and free-area sizing (v348), and the altitude/temperature air-density
// correction that turns ACFM into SCFM (v349).
// =====================================================================

// dims: in { R_duct: dimensionless, A_ft2: L^2, dT_F: T, cfm: L^3 T^-1 } out: { Q_btuh: M L^2 T^-3, dT_air: T }
export function computeDuctHeatGain({ R_duct = 0, A_ft2 = 0, dT_F = 0, cfm = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(R_duct > 0)) return { error: "Duct insulation R-value must be positive." };
  if (!(A_ft2 > 0)) return { error: "Duct surface area must be positive (ft^2)." };
  if (!(cfm > 0)) return { error: "Airflow must be positive (cfm)." };
  const U = 1 / R_duct;
  const Q_btuh = U * A_ft2 * dT_F;
  const dT_air = Q_btuh / (1.08 * cfm);
  // The air cannot change by more than the driving difference; the linear U A dT model breaks down long before that
  // (R 0.1 at 100 cfm used to report a 602 F rise against a 65 F difference).
  if (Math.abs(dT_air) >= Math.abs(dT_F) && dT_F !== 0) return { error: "The air-temperature change would exceed the driving difference: the linear model does not apply (too little R or airflow); use an exponential leaving-temperature model." };
  return {
    U, Q_btuh, dT_air,
    note: "Conductive duct heat gain/loss through unconditioned space: U = 1/R, Q = U A dT with dT the ambient-minus-in-duct temperature (positive = the duct gains heat, e.g. a cold supply in a hot attic), and the resulting air temperature change dT_air = Q / (1.08 x cfm). Doubling the duct R-value halves the loss - the linear return that pays for attic-duct insulation - and halving the airflow doubles the per-cfm temperature swing. Steady-state conduction only; no radiant gain, air leakage, or latent transfer. A design aid; the ductwork design and the ambient conditions govern.",
  };
}
export const ductHeatGainExample = { inputs: { R_duct: 4, A_ft2: 100, dT_F: 65, cfm: 1000 } };
HVACAIRSIDE_RENDERERS["duct-heat-gain"] = _rEnv({
  citation: "Citation: Conductive duct heat gain Q = U A dT with U = 1/R (ASHRAE Handbook - Fundamentals / duct-design method), and the air temperature change dT_air = Q / (1.08 x cfm). Steady-state conduction, no leakage or radiant gain. A design aid; the ductwork design governs.",
  example: ductHeatGainExample.inputs,
  fields: [
    { key: "R_duct", label: "Duct insulation R (h-ft2-F/Btu)", kind: "number" },
    { key: "A_ft2", label: "Duct surface area (ft²)", kind: "number" },
    { key: "dT_F", label: "Ambient minus in-duct temp (F, signed)", kind: "number" },
    { key: "cfm", label: "Airflow (cfm)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "dhg-out-q", label: "Heat gain (+) / loss (-)", value: (r) => fmt(r.Q_btuh, 0) + " Btu/h" },
    { key: "dt", id: "dhg-out-dt", label: "Air temperature change", value: (r) => fmt(r.dT_air, 2) + " F" },
    { key: "n", id: "dhg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDuctHeatGain,
});

// dims: in { mode: dimensionless, cfm: L^3 T^-1, ratio: dimensionless, A_gross_ft2: L^2, V_target: L T^-1 } out: { V_face: L T^-1, A_gross_req_ft2: L^2 }
export function computeGrilleFaceVelocity({ mode = "velocity", cfm = 0, ratio = 0.75, A_gross_ft2 = 0, V_target = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  const r = Number(ratio) || 0;
  if (!(q > 0)) return { error: "Airflow must be positive (cfm)." };
  if (!(r > 0 && r <= 1)) return { error: "Free-area ratio must be between 0 and 1." };
  if (mode === "size") {
    const v = Number(V_target) || 0;
    if (!(v > 0)) return { error: "Target face velocity must be positive (fpm)." };
    const A_gross_req_ft2 = q / (v * r);
    if (!Number.isFinite(A_gross_req_ft2)) return { error: "Required grille area is not valid." };
    return { mode: "size", A_gross_req_ft2, A_gross_req_in2: A_gross_req_ft2 * 144, V_face: null };
  }
  const A_gross = Number(A_gross_ft2) || 0;
  if (!(A_gross > 0)) return { error: "Gross grille area must be positive (ft^2)." };
  const A_free = A_gross * r;
  const V_face = q / A_free;
  if (!Number.isFinite(V_face)) return { error: "Face velocity is not valid." };
  let band;
  // Hart & Cooley Engineering Data (2026): supply 500-800 fpm (700 a common target), returns 400-600 fpm maximum.
  // Until 2026-09-26 anything over 700 fpm read "high", flagging H&C's own common target.
  if (V_face < 400) band = "quiet (< 400 fpm)";
  else if (V_face < 500) band = "low supply / return band (400-500 fpm)";
  else if (V_face <= 600) band = "supply band; the return maximum (500-600 fpm)";
  else if (V_face <= 800) band = "supply band, too fast for a return (600-800 fpm; 700 a common supply target)";
  else band = "high (> 800 fpm; noise and draft risk)";
  return { mode: "velocity", V_face, band, A_gross_req_ft2: null };
}
export const grilleFaceVelocityExample = { inputs: { mode: "size", cfm: 400, ratio: 0.75, V_target: 500 } };

function _renderGrilleFaceVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Grille/register sizing from the free area: face velocity V = cfm / (gross area x free-area ratio), or the required gross area = cfm / (target velocity x ratio). Supply grilles run about 500-800 fpm (700 a common target) and returns 400-600 fpm maximum (Hart & Cooley), which is why a return is larger than a supply for the same airflow. Enter the manufacturer's effective area Ak / gross area as the ratio (Ak is lab-measured; the daylight free area reads the velocity low). The manufacturer's data govern the selection.";
  const mode = makeSelect("Solve for", "gfv-mode", [
    { value: "size", label: "Required grille size (from a target velocity)" },
    { value: "velocity", label: "Face velocity (from a gross grille size)" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const cfm = makeNumber("Airflow (cfm)", "gfv-cfm", { step: "any", min: "0" });
  const ratio = makeNumber("Effective-area ratio Ak / gross (0-1, default 0.75; from the maker's Ak)", "gfv-ratio", { step: "any", min: "0", max: "1" }); ratio.input.value = "0.75";
  const vtar = makeNumber("Target face velocity (fpm)", "gfv-vtar", { step: "any", min: "0" });
  const agr = makeNumber("Gross grille area (ft²)", "gfv-agr", { step: "any", min: "0" });
  for (const f of [cfm, ratio, vtar, agr]) inputRegion.appendChild(f.wrap);
  const oOut = makeOutputLine(outputRegion, "Result", "gfv-out");
  const oBand = makeOutputLine(outputRegion, "Velocity band", "gfv-out-band");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isSize = mode.select.value === "size";
    vtar.wrap.style.display = isSize ? "" : "none";
    agr.wrap.style.display = isSize ? "none" : "";
  }
  const update = debounce(() => {
    const r = computeGrilleFaceVelocity({ mode: mode.select.value, cfm: readNum(cfm.input), ratio: readNum(ratio.input), A_gross_ft2: readNum(agr.input), V_target: readNum(vtar.input) });
    if (r.error) { oOut.textContent = r.error; oBand.textContent = "-"; return; }
    if (r.mode === "size") { oOut.textContent = fmt(r.A_gross_req_ft2, 2) + " ft^2 gross (" + fmt(r.A_gross_req_in2, 0) + " in^2)"; oBand.textContent = "-"; return; }
    oOut.textContent = fmt(r.V_face, 0) + " fpm face velocity";
    oBand.textContent = r.band;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "size"; syncFields(); cfm.input.value = "400"; ratio.input.value = "0.75"; vtar.input.value = "500"; agr.input.value = ""; update(); });
  mode.select.addEventListener("change", () => { syncFields(); update(); });
  for (const f of [cfm.input, ratio.input, vtar.input, agr.input]) f.addEventListener("input", update);
  syncFields();
}
HVACAIRSIDE_RENDERERS["grille-face-velocity"] = _renderGrilleFaceVelocity;

// ===================== spec-v482: ADPI room air diffusion selection (ASHRAE) =====================
// The ASHRAE Handbook -- Fundamentals "Space Air Diffusion" ADPI Selection Guide,
// per outlet type and cooling load (Btu/hr-ft^2): { opt: T/L for max ADPI, max:
// achievable ADPI, thr: the published "ADPI greater than" threshold, lo/hi: the
// T/L band over which ADPI stays above that threshold (null = no band published
// at that load). Throw is T0.25 (50 fpm) for all rows here except ceiling slot,
// which is T0.5 (100 fpm). The light-troffer row is omitted: its throw basis is
// inconsistent across the published reproductions. Values from the ASHRAE table
// as reproduced in the Price / Krueger / Titus engineering guides.
const _ADPI_TABLE = {
  "high-sidewall": { throw: "T0.25 (50 fpm)", 80: { opt: 1.8, max: 68, thr: null, lo: null, hi: null }, 60: { opt: 1.8, max: 72, thr: 70, lo: 1.5, hi: 2.2 }, 40: { opt: 1.6, max: 78, thr: 70, lo: 1.2, hi: 2.3 }, 20: { opt: 1.5, max: 85, thr: 80, lo: 1.0, hi: 1.9 } },
  "circular-ceiling": { throw: "T0.25 (50 fpm)", 80: { opt: 0.8, max: 76, thr: 70, lo: 0.7, hi: 1.3 }, 60: { opt: 0.8, max: 83, thr: 80, lo: 0.7, hi: 1.2 }, 40: { opt: 0.8, max: 88, thr: 80, lo: 0.5, hi: 1.5 }, 20: { opt: 0.8, max: 93, thr: 80, lo: 0.4, hi: 1.7 } },
  "sill-straight": { throw: "T0.25 (50 fpm)", 80: { opt: 1.7, max: 61, thr: 60, lo: 1.5, hi: 1.7 }, 60: { opt: 1.7, max: 72, thr: 70, lo: 1.4, hi: 1.7 }, 40: { opt: 1.3, max: 86, thr: 80, lo: 1.2, hi: 1.8 }, 20: { opt: 0.9, max: 95, thr: 90, lo: 0.8, hi: 1.3 } },
  "sill-spread": { throw: "T0.25 (50 fpm)", 80: { opt: 0.7, max: 94, thr: 90, lo: 0.6, hi: 1.5 }, 60: { opt: 0.7, max: 94, thr: 80, lo: 0.6, hi: 1.7 }, 40: { opt: 0.7, max: 94, thr: null, lo: null, hi: null }, 20: { opt: 0.7, max: 94, thr: null, lo: null, hi: null } },
  "ceiling-slot": { throw: "T0.5 (100 fpm)", 80: { opt: 0.3, max: 85, thr: 80, lo: 0.3, hi: 0.7 }, 60: { opt: 0.3, max: 88, thr: 80, lo: 0.3, hi: 0.8 }, 40: { opt: 0.3, max: 91, thr: 80, lo: 0.3, hi: 1.1 }, 20: { opt: 0.3, max: 92, thr: 80, lo: 0.3, hi: 1.5 } },
};
const _ADPI_PERFORATED = { throw: "T0.25 (50 fpm)", opt: 2.0, max: 96, thr: 80, lo: 1.0, hi: 3.4 };
const _ADPI_LOADS = [20, 40, 60, 80];

// dims: in { diffuser_type: dimensionless, cooling_load: dimensionless, throw_ft: L, char_length_ft: L } out: { ratio: dimensionless, opt_ratio: dimensionless, max_adpi: dimensionless, threshold: dimensionless, target_throw_ft: L }
export function computeAdpiSelection({ diffuser_type = "circular-ceiling", cooling_load = 40, throw_ft = 0, char_length_ft = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const Tt = Number(throw_ft) || 0;
  const L = Number(char_length_ft) || 0;
  if (!(Tt > 0)) return { error: "Throw must be positive (ft)." };
  if (!(L > 0)) return { error: "Characteristic length must be positive (ft)." };
  let row, throwBasis, load_used;
  if (diffuser_type === "perforated") {
    row = _ADPI_PERFORATED; throwBasis = _ADPI_PERFORATED.throw; load_used = null;
  } else {
    const t = _ADPI_TABLE[diffuser_type];
    if (!t) return { error: "Unknown diffuser type." };
    const load = Number(cooling_load) || 40;
    load_used = _ADPI_LOADS.reduce((a, b) => (Math.abs(b - load) < Math.abs(a - load) ? b : a));
    row = t[load_used]; throwBasis = t.throw;
  }
  const ratio = Tt / L;
  const has_band = row.lo != null && row.hi != null;
  const in_band = has_band && ratio >= row.lo && ratio <= row.hi;
  const target_throw_ft = row.opt * L;
  return {
    ratio, opt_ratio: row.opt, max_adpi: row.max, threshold: row.thr,
    band_lo: row.lo, band_hi: row.hi, has_band, in_band, target_throw_ft,
    throw_basis: throwBasis, load_used,
    note: "ASHRAE Handbook -- Fundamentals Space Air Diffusion, ADPI Selection Guide: the outlet's throw-to-characteristic-length ratio T/L predicts the Air Diffusion Performance Index (the fraction of occupied-zone points inside the draft-comfort envelope). Each outlet type and cooling load has a T/L for maximum ADPI and a band over which ADPI stays above the published threshold; a heavier load caps the achievable ADPI regardless of throw. Enter the manufacturer's isothermal catalog throw to the outlet's terminal velocity (" + throwBasis + " for this type) and the characteristic length L (to the wall or the midplane between outlets, per the ASHRAE footnote, adjusted from the 9 ft tabulated ceiling). Cooling mode only; the light-troffer row, heating, and the noise-criterion selection are separate. A selection aid, not a stamped air-distribution design.",
  };
}
export const adpiSelectionExample = { inputs: { diffuser_type: "circular-ceiling", cooling_load: 40, throw_ft: 8, char_length_ft: 10 } };

function _renderAdpiSelection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE Handbook -- Fundamentals, Space Air Diffusion, ADPI Selection Guide (throw per ASHRAE Standard 70, ADPI per Standard 113; the Miller / Nevins Kansas State research). T/L predicts the Air Diffusion Performance Index; each outlet type and cooling load has a max-ADPI T/L and an above-threshold band. Isothermal catalog throw to the outlet's terminal velocity (50 fpm most; 100 fpm ceiling slots). Cooling mode; a selection aid, the manufacturer's data and the design engineer govern.";
  const type = makeSelect("Outlet type", "adpi-type", [
    { value: "high-sidewall", label: "High sidewall grille (T0.25)" },
    { value: "circular-ceiling", label: "Circular ceiling diffuser (T0.25)" },
    { value: "sill-straight", label: "Sill grille, straight vanes (T0.25)" },
    { value: "sill-spread", label: "Sill grille, spread vanes (T0.25)" },
    { value: "ceiling-slot", label: "Ceiling slot diffuser (T0.5)" },
    { value: "perforated", label: "Perforated / louvered ceiling (T0.25)" },
  ]);
  type.select.value = "circular-ceiling";
  const load = makeSelect("Room cooling load (Btu/hr-ft²)", "adpi-load", [
    { value: "20", label: "20 (light)" }, { value: "40", label: "40" }, { value: "60", label: "60" }, { value: "80", label: "80 (heavy)" },
  ]);
  load.select.value = "40";
  inputRegion.appendChild(type.wrap); inputRegion.appendChild(load.wrap);
  const thr = makeNumber("Catalog isothermal throw T (ft)", "adpi-throw", { step: "any", min: "0" });
  const clen = makeNumber("Characteristic length L (ft)", "adpi-l", { step: "any", min: "0" });
  for (const f of [thr, clen]) inputRegion.appendChild(f.wrap);
  const oRatio = makeOutputLine(outputRegion, "T/L ratio", "adpi-out-ratio");
  const oOpt = makeOutputLine(outputRegion, "Optimum T/L (max ADPI)", "adpi-out-opt");
  const oAdpi = makeOutputLine(outputRegion, "Achievable ADPI at this load", "adpi-out-adpi");
  const oBand = makeOutputLine(outputRegion, "Comfort band", "adpi-out-band");
  const oTarget = makeOutputLine(outputRegion, "Throw to spec for max ADPI", "adpi-out-target");
  const oNote = makeOutputLine(outputRegion, "Note", "adpi-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() { load.wrap.style.display = type.select.value === "perforated" ? "none" : ""; }
  const update = debounce(() => {
    const r = computeAdpiSelection({ diffuser_type: type.select.value, cooling_load: load.select.value, throw_ft: readNum(thr.input), char_length_ft: readNum(clen.input) });
    if (r.error) { oRatio.textContent = r.error; oOpt.textContent = "-"; oAdpi.textContent = "-"; oBand.textContent = "-"; oTarget.textContent = "-"; oNote.textContent = ""; return; }
    oRatio.textContent = fmt(r.ratio, 2);
    oOpt.textContent = fmt(r.opt_ratio, 2);
    oAdpi.textContent = "up to ADPI " + fmt(r.max_adpi, 0) + (r.max_adpi < 80 ? " (load caps comfort below 80)" : "");
    oBand.textContent = r.has_band
      ? (r.in_band ? "in the band" : "OUTSIDE the band") + " (ADPI > " + fmt(r.threshold, 0) + " for T/L " + fmt(r.band_lo, 1) + " to " + fmt(r.band_hi, 1) + ")"
      : "no band above threshold at this load (optimum only)";
    oTarget.textContent = fmt(r.target_throw_ft, 1) + " ft (T/L " + fmt(r.opt_ratio, 2) + " x L)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { type.select.value = "circular-ceiling"; load.select.value = "40"; thr.input.value = "8"; clen.input.value = "10"; syncFields(); update(); });
  type.select.addEventListener("change", () => { syncFields(); update(); });
  load.select.addEventListener("change", update);
  for (const f of [thr.input, clen.input]) f.addEventListener("input", update);
  syncFields();
}
HVACAIRSIDE_RENDERERS["adpi-diffuser-selection"] = _renderAdpiSelection;

// ===================== spec-v483: vibration isolation efficiency (ASHRAE) =====================

// dims: in { equipment_rpm: T^-1, static_deflection_in: L } out: { fn_hz: T^-1, fn_cpm: T^-1, disturbing_hz: T^-1, ratio: dimensionless, transmissibility: dimensionless, efficiency_pct: dimensionless }
export function computeVibrationIsolation({ equipment_rpm = 0, static_deflection_in = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const rpm = Number(equipment_rpm) || 0;
  const defl = Number(static_deflection_in) || 0;
  if (!(rpm > 0)) return { error: "Running speed must be positive (rpm)." };
  if (!(defl > 0)) return { error: "Static deflection must be positive (in)." };
  // ASHRAE / Den Hartog single-DOF isolator: fn = (1/2pi) sqrt(g/defl), g = 386.4 in/s^2 -> 3.13/sqrt(defl) Hz.
  const fn_hz = 3.13 / Math.sqrt(defl);
  const fn_cpm = fn_hz * 60;
  const disturbing_hz = rpm / 60;
  const ratio = disturbing_hz / fn_hz;
  const isolating = ratio > Math.SQRT2;
  const transmissibility = 1 / Math.abs(ratio * ratio - 1);
  const efficiency_pct = isolating ? (1 - transmissibility) * 100 : null;
  return {
    fn_hz, fn_cpm, disturbing_hz, ratio, transmissibility, efficiency_pct, isolating,
    note: "ASHRAE Handbook -- Fundamentals, Sound and Vibration: the single-degree-of-freedom vibration isolator. The isolated system's natural frequency fn = 3.13 / sqrt(static deflection in inches) Hz (= (1/2pi) sqrt(g/deflection)); the disturbing frequency is the running speed rpm/60 Hz (the lowest forcing frequency, which isolates worst); the transmissibility T = 1 / |(f/fn)^2 - 1| is the fraction of the shaking force that still reaches the structure, and the isolation efficiency is (1 - T). Isolation requires the frequency ratio to exceed sqrt(2) = 1.414; below that the mount amplifies the vibration (true resonance at a ratio of 1), and the fix is a stiffer isolator (less deflection raises fn). The undamped idealization (damping trims high-frequency isolation slightly but tames the resonant peak). The deflection is the isolator's rated value under the actual load; the equipment unbalance, floor stiffness, seismic restraint, and the isolator selection are the mechanical engineer's. A design aid, not a stamped vibration-isolation design.",
  };
}
export const vibrationIsolationExample = { inputs: { equipment_rpm: 900, static_deflection_in: 1 } };

function _renderVibrationIsolation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE Handbook -- Fundamentals, Sound and Vibration (single-DOF isolator). Natural frequency fn = 3.13/sqrt(static deflection in inches) Hz; disturbing frequency = rpm/60; transmissibility T = 1/|(f/fn)^2 - 1|; isolation efficiency = (1 - T). Isolation needs a frequency ratio over sqrt(2) = 1.414, else the mount amplifies (resonance at 1). Undamped idealization; the rated isolator deflection under load governs. A design aid, not a stamped vibration-isolation design.";
  const rpm = makeNumber("Equipment running speed (rpm)", "vib-rpm", { step: "any", min: "0" });
  const defl = makeNumber("Isolator static deflection under load (in)", "vib-defl", { step: "any", min: "0" });
  for (const f of [rpm, defl]) inputRegion.appendChild(f.wrap);
  const oFn = makeOutputLine(outputRegion, "System natural frequency", "vib-out-fn");
  const oFd = makeOutputLine(outputRegion, "Disturbing frequency", "vib-out-fd");
  const oR = makeOutputLine(outputRegion, "Frequency ratio f/fn", "vib-out-r");
  const oT = makeOutputLine(outputRegion, "Transmissibility", "vib-out-t");
  const oEff = makeOutputLine(outputRegion, "Isolation efficiency", "vib-out-eff");
  const oNote = makeOutputLine(outputRegion, "Note", "vib-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVibrationIsolation({ equipment_rpm: readNum(rpm.input), static_deflection_in: readNum(defl.input) });
    if (r.error) { oFn.textContent = r.error; oFd.textContent = "-"; oR.textContent = "-"; oT.textContent = "-"; oEff.textContent = "-"; oNote.textContent = ""; return; }
    oFn.textContent = fmt(r.fn_hz, 2) + " Hz (" + fmt(r.fn_cpm, 0) + " cpm)";
    oFd.textContent = fmt(r.disturbing_hz, 2) + " Hz";
    oR.textContent = fmt(r.ratio, 2) + (r.isolating ? " (over sqrt(2): isolating)" : " (under sqrt(2): amplifying)");
    oT.textContent = fmt(r.transmissibility, 3);
    oEff.textContent = r.isolating ? fmt(r.efficiency_pct, 1) + "%" : "none - the mount AMPLIFIES " + fmt(r.transmissibility, 1) + "x (near resonance; use a stiffer isolator)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { rpm.input.value = "900"; defl.input.value = "1"; update(); });
  for (const f of [rpm.input, defl.input]) f.addEventListener("input", update);
}
HVACAIRSIDE_RENDERERS["vibration-isolation"] = _renderVibrationIsolation;

// dims: in { equipment_rpm: T^-1, target_efficiency: dimensionless } out: { transmissibility: dimensionless, ratio: dimensionless, fn_hz: T^-1, deflection_in: L }
export function computeIsolatorDeflection({ equipment_rpm = 0, target_efficiency = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const rpm = Number(equipment_rpm) || 0;
  const eff = Number(target_efficiency) || 0;
  if (!(rpm > 0)) return { error: "Running speed must be positive (rpm)." };
  if (!(eff > 0 && eff < 100)) return { error: "Target isolation efficiency must be between 0 and 100 percent (exclusive)." };
  const transmissibility = 1 - eff / 100;
  const ratio = Math.sqrt(1 + 1 / transmissibility);
  const disturbing_hz = rpm / 60;
  const fn_hz = disturbing_hz / ratio;
  const deflection_in = Math.pow(3.13 / fn_hz, 2);
  return {
    transmissibility, ratio, disturbing_hz, fn_hz, deflection_in,
    note: "ASHRAE / Den Hartog single-degree-of-freedom isolator inverted for the required static deflection: from the target transmissibility T = 1 - efficiency, the required frequency ratio is sqrt(1 + 1/T) (always > sqrt(2), so the mount isolates rather than amplifies), the required natural frequency is fn = (rpm/60)/ratio, and the required static deflection is (3.13/fn)^2 in (fn = 3.13/sqrt(deflection), the inverse of the forward tile). The softer the mount (more deflection, lower fn), the better the isolation. Undamped idealization; the result is the isolator's rated deflection under the actual load. The isolator selection, floor stiffness, and seismic restraint are the mechanical engineer's. A design aid, not a stamped vibration-isolation design.",
  };
}
export const isolatorDeflectionExample = { inputs: { equipment_rpm: 900, target_efficiency: 90 } };
HVACAIRSIDE_RENDERERS["isolator-deflection"] = _rEnv({
  citation: "Citation: ASHRAE / Den Hartog single-DOF isolator inverted -- required static deflection = (3.13/fn)^2 in with fn = (rpm/60)/sqrt(1 + 1/T), T = 1 - efficiency, by name. The frequency ratio always exceeds sqrt(2). Undamped idealization; the isolator selection and floor stiffness are the mechanical engineer's. A design aid, not a stamped design.",
  example: isolatorDeflectionExample.inputs,
  fields: [
    { key: "equipment_rpm", label: "Running speed (rpm)", kind: "number" },
    { key: "target_efficiency", label: "Target isolation efficiency (%)", kind: "number" },
  ],
  outputs: [
    { key: "defl", id: "isod-out-defl", label: "Required static deflection", value: (r) => fmt(r.deflection_in, 2) + " in" },
    { key: "fn", id: "isod-out-fn", label: "Isolator natural frequency / ratio", value: (r) => fmt(r.fn_hz, 2) + " Hz (ratio " + fmt(r.ratio, 2) + ")" },
    { key: "n", id: "isod-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIsolatorDeflection,
});

// dims: in { elev_ft: L, T_F: T, acfm: L^3 T^-1, rated_sp: dimensionless } out: { DF: dimensionless, SCFM: L^3 T^-1, const_corr: dimensionless, sp_corr: dimensionless }
export function computeAirDensityCorrection({ elev_ft = 0, T_F = 70, acfm = 0, rated_sp = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const elev = Number(elev_ft) || 0;
  const T = Number(T_F);
  if (!Number.isFinite(T)) return { error: "Enter a valid air temperature (F)." };
  if (!(460 + T > 0)) return { error: "Temperature is below absolute zero." };
  const alt_factor = Math.pow(1 - 6.8754e-6 * elev, 5.2559);
  if (!Number.isFinite(alt_factor) || alt_factor <= 0) return { error: "Elevation is out of range." };
  const temp_factor = 530 / (460 + T);
  const DF = alt_factor * temp_factor;
  const acfm_v = Number(acfm) || 0;
  const SCFM = acfm_v > 0 ? acfm_v * DF : null;
  const const_corr = 1.08 * DF;
  const sp_v = Number(rated_sp) || 0;
  const sp_corr = sp_v > 0 ? sp_v * DF : null;
  return {
    alt_factor, temp_factor, DF, SCFM, const_corr, sp_corr,
    note: "Air density factor DF vs standard air (0.075 lb/ft^3, 70 F sea level): the altitude factor (1 - 6.8754e-6 x elev)^5.2559 and the temperature factor 530/(460 + T), multiplied. Thinner air (high altitude or hot air) carries less mass per cfm, so SCFM = ACFM x DF, the sensible constant 1.08 scales to 1.08 x DF, and a sea-level-rated fan delivers rated_sp x DF of static. A 5,000 ft site runs about 16% thinner; 120 F rooftop air is about 9% thinner even at sea level, which is why summer rooftop capacity lags the rating. A correction factor; the fan curve and the equipment ratings at the actual condition govern.",
  };
}
export const airDensityCorrectionExample = { inputs: { elev_ft: 5000, T_F: 70, acfm: 1000, rated_sp: 0.5 } };
HVACAIRSIDE_RENDERERS["air-density-correction"] = _rEnv({
  citation: "Citation: Air density correction (ASHRAE Handbook - Fundamentals): altitude factor (1 - 6.8754e-6 x elev)^5.2559, temperature factor 530/(460 + T_F), density factor DF = their product; SCFM = ACFM x DF, corrected sensible constant 1.08 x DF, delivered fan static = rated x DF. A correction factor; the fan curve and equipment ratings govern.",
  example: airDensityCorrectionExample.inputs,
  fields: [
    { key: "elev_ft", label: "Site elevation (ft)", kind: "number" },
    { key: "T_F", label: "Air temperature (°F)", kind: "number" },
    { key: "acfm", label: "Actual airflow ACFM (cfm, optional)", kind: "number" },
    { key: "rated_sp", label: "Sea-level rated fan static (in-wc, optional)", kind: "number" },
  ],
  outputs: [
    { key: "df", id: "adc-out-df", label: "Density factor DF", value: (r) => fmt(r.DF, 3) + " (alt " + fmt(r.alt_factor, 3) + " x temp " + fmt(r.temp_factor, 3) + ")" },
    { key: "scfm", id: "adc-out-scfm", label: "Standard airflow SCFM", value: (r) => r.SCFM == null ? "(enter ACFM)" : fmt(r.SCFM, 0) + " scfm" },
    { key: "cc", id: "adc-out-cc", label: "Corrected sensible constant", value: (r) => fmt(r.const_corr, 3) + " (vs 1.08)" },
    { key: "sp", id: "adc-out-sp", label: "Delivered fan static", value: (r) => r.sp_corr == null ? "(enter rated static)" : fmt(r.sp_corr, 3) + " in-wc" },
    { key: "n", id: "adc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirDensityCorrection,
});

// =====================================================================
// spec-v375..v377: psychrometric coil-analysis trio (Group C).
// =====================================================================

// dims: in { t_db_f: T, w_lb_lb: dimensionless } out: { h: L^2 T^-2, h_sensible: L^2 T^-2, h_latent: L^2 T^-2 }
export function computeMoistAirEnthalpy({ t_db_f = 0, w_lb_lb = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const t = Number(t_db_f);
  const w = Number(w_lb_lb);
  if (w < 0) return { error: "Humidity ratio must be non-negative (lb water / lb dry air)." };
  const h_sensible = 0.240 * t;
  const h_latent = w * (1061 + 0.444 * t);
  const h = h_sensible + h_latent;
  return {
    h, h_sensible, h_latent,
    note: "ASHRAE I-P moist-air enthalpy h = 0.240 t + W (1061 + 0.444 t) Btu per lb dry air: 0.240 is the dry-air specific heat, 1061 the enthalpy of saturated water vapor at 0 F (measured from liquid water at 32 F; dry air is referenced to 0 F), 0.444 the water-vapor specific heat. The humidity ratio W (lb water / lb dry air) is the moisture input - pair with outdoor-air-mix or a psychrometric chart to get W from RH. This is the total heat content of one air state; a cooling coil removes the difference between two of these. Sea-level coefficients; a design aid, not a substitute for a measured chart state or equipment ratings.",
  };
}
export const moistAirEnthalpyExample = { inputs: { t_db_f: 80, w_lb_lb: 0.0112 } };
HVACAIRSIDE_RENDERERS["moist-air-enthalpy"] = _rEnv({
  citation: "Citation: Moist-air enthalpy (ASHRAE Handbook - Fundamentals): h = 0.240 t + W (1061 + 0.444 t) Btu per lb dry air, with t the dry-bulb (F) and W the humidity ratio (lb water / lb dry air). 0.240 = dry-air specific heat, 1061 = enthalpy of saturated vapor at 0 F (from liquid water at 32 F), 0.444 = water-vapor specific heat. Total heat content of one air state; pair with outdoor-air-mix or a psychrometric chart for W. Sea-level coefficients; a design aid, not a substitute for a measured chart state or equipment ratings.",
  example: moistAirEnthalpyExample.inputs,
  fields: [
    { key: "t_db_f", label: "Dry-bulb temperature (°F)", kind: "number" },
    { key: "w_lb_lb", label: "Humidity ratio W (lb water / lb dry air)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "mae-out-h", label: "Enthalpy h", value: (r) => fmt(r.h, 2) + " Btu/lb dry air" },
    { key: "split", id: "mae-out-split", label: "Sensible + latent", value: (r) => fmt(r.h_sensible, 2) + " + " + fmt(r.h_latent, 2) + " Btu/lb" },
    { key: "n", id: "mae-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMoistAirEnthalpy,
});

// dims: in { enthalpy_btu: L^2 T^-2, w_lb_lb: dimensionless } out: { t_db_f: T, h_sensible: L^2 T^-2, h_latent: L^2 T^-2 }
export function computeDrybulbFromEnthalpy({ enthalpy_btu = 0, w_lb_lb = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const h = Number(enthalpy_btu);
  const w = Number(w_lb_lb);
  if (w < 0) return { error: "Humidity ratio must be non-negative (lb water / lb dry air)." };
  const denom = 0.240 + 0.444 * w;
  const t_db_f = (h - 1061 * w) / denom;
  const h_latent = w * (1061 + 0.444 * t_db_f);
  const h_sensible = h - h_latent;
  return {
    t_db_f, h_sensible, h_latent,
    note: "The dry-bulb temperature of a moist-air state from its enthalpy and humidity ratio, the inverse of the moist-air-enthalpy tile: solving h = 0.240 t + W (1061 + 0.444 t) for t gives t = (h - 1061 W) / (0.240 + 0.444 W) deg F. Use it to recover the dry-bulb of a coil's entering or leaving state when a psychrometric analysis gives the enthalpy and the humidity ratio but not the temperature directly. 0.240 is the dry-air specific heat, 1061 the enthalpy of saturated vapor at 0 F (from liquid water at 32 F), and 0.444 the water-vapor specific heat (ASHRAE I-P, sea level). The humidity ratio must come from the chart or the RH; this returns the dry-bulb of one state, not the wet-bulb or dew point. A design aid, not a substitute for a measured chart state or equipment ratings.",
  };
}
export const drybulbFromEnthalpyExample = { inputs: { enthalpy_btu: 31.48, w_lb_lb: 0.0112 } };
HVACAIRSIDE_RENDERERS["drybulb-from-enthalpy"] = _rEnv({
  citation: "Citation: Moist-air enthalpy (ASHRAE Handbook - Fundamentals) solved for the dry-bulb: t = (h - 1061 W) / (0.240 + 0.444 W) deg F, the inverse of h = 0.240 t + W (1061 + 0.444 t). 0.240 = dry-air specific heat, 1061 = enthalpy of saturated vapor at 0 F (from liquid water at 32 F), 0.444 = water-vapor specific heat. The humidity ratio comes from the chart or RH. Sea-level coefficients; a design aid, not a substitute for a measured chart state or equipment ratings.",
  example: drybulbFromEnthalpyExample.inputs,
  fields: [
    { key: "enthalpy_btu", label: "Enthalpy h (Btu/lb dry air)", kind: "number" },
    { key: "w_lb_lb", label: "Humidity ratio W (lb water / lb dry air)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "dbe-out-t", label: "Dry-bulb temperature", value: (r) => fmt(r.t_db_f, 1) + " F" },
    { key: "split", id: "dbe-out-split", label: "Sensible + latent", value: (r) => fmt(r.h_sensible, 2) + " + " + fmt(r.h_latent, 2) + " Btu/lb" },
    { key: "n", id: "dbe-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDrybulbFromEnthalpy,
});

// dims: in { cfm: L^3 T^-1, h_ent_btu: L^2 T^-2, h_lvg_btu: L^2 T^-2 } out: { q_btuh: M L^2 T^-3, tons: M L^2 T^-3, dh: L^2 T^-2 }
export function computeCoolingCoilTotalLoad({ cfm = 0, h_ent_btu = 0, h_lvg_btu = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  if (!(q > 0)) return { error: "Airflow must be positive (cfm)." };
  const dh = Number(h_ent_btu) - Number(h_lvg_btu);
  const q_btuh = 4.5 * q * dh;
  const tons = q_btuh / 12000;
  return {
    q_btuh, tons, dh,
    heating: dh < -1e-9,
    note: "Total coil load Q = 4.5 x CFM x (h_ent - h_lvg) Btu/hr, where 4.5 = 60 min/hr x 0.075 lb/ft^3 standard air density. This is the whole heat the coil removes - sensible drop plus condensed moisture (latent) - not the dry-bulb-only 1.08 x CFM x deltaT, which misses the latent load. Feed the entering and leaving enthalpies from moist-air-enthalpy. tons = Q / 12000. A leaving enthalpy above entering returns a negative Q (the coil is heating). A design aid; the equipment ratings govern.",
  };
}
export const coolingCoilTotalLoadExample = { inputs: { cfm: 2000, h_ent_btu: 31.48, h_lvg_btu: 22.97 } };
HVACAIRSIDE_RENDERERS["cooling-coil-total-load"] = _rEnv({
  citation: "Citation: Cooling-coil total load (ASHRAE Handbook - Fundamentals): Q = 4.5 x CFM x (h_ent - h_lvg) Btu/hr, with 4.5 = 60 x 0.075 (standard air) and enthalpies from moist-air-enthalpy; tons = Q / 12000. Captures the full sensible-plus-latent heat the coil removes, unlike the dry-bulb 1.08 x CFM x deltaT. A leaving enthalpy above entering gives a negative Q (heating). A design aid; equipment ratings govern.",
  example: coolingCoilTotalLoadExample.inputs,
  fields: [
    { key: "cfm", label: "Airflow across the coil (cfm)", kind: "number" },
    { key: "h_ent_btu", label: "Entering-air enthalpy (Btu/lb)", kind: "number" },
    { key: "h_lvg_btu", label: "Leaving-air enthalpy (Btu/lb)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "cctl-out-q", label: "Total coil load", value: (r) => (r.heating ? "heating: " : "") + fmt(r.q_btuh, 0) + " Btu/hr" },
    { key: "tons", id: "cctl-out-tons", label: "Tons", value: (r) => fmt(r.tons, 2) + " tons (dh = " + fmt(r.dh, 2) + " Btu/lb)" },
    { key: "n", id: "cctl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoolingCoilTotalLoad,
});

// dims: in { t_ent_f: T, t_lvg_f: T, t_adp_f: T } out: { bf: dimensionless, cf: dimensionless }
export function computeCoilBypassFactor({ t_ent_f = 0, t_lvg_f = 0, t_adp_f = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const te = Number(t_ent_f);
  const tl = Number(t_lvg_f);
  const ta = Number(t_adp_f);
  if (!(te > ta)) return { error: "Entering dry-bulb must be above the apparatus dew point." };
  const bf = (tl - ta) / (te - ta);
  if (!(bf >= 0 && bf <= 1)) return { error: "Leaving temperature must be between the apparatus dew point and the entering temperature (bypass factor outside [0,1])." };
  const cf = 1 - bf;
  return {
    bf, cf,
    note: "Bypass factor BF = (t_lvg - t_adp) / (t_ent - t_adp), contact factor CF = 1 - BF, where the apparatus dew point (ADP) is the effective coil-surface temperature the air is driven toward. BF is the fraction of air that slips past the coil unconditioned; a lower BF (deeper, slower coil) contacts more air and dehumidifies better. Leaving air cannot be colder than the ADP or warmer than entering. A design aid; the coil rating and ADP selection govern.",
  };
}
export const coilBypassFactorExample = { inputs: { t_ent_f: 80, t_lvg_f: 55, t_adp_f: 50 } };
HVACAIRSIDE_RENDERERS["coil-bypass-factor"] = _rEnv({
  citation: "Citation: Coil bypass / contact factor (ASHRAE Handbook - Fundamentals): BF = (t_lvg - t_adp) / (t_ent - t_adp), CF = 1 - BF, with the apparatus dew point (ADP) the effective coil-surface temperature. BF is the fraction of air bypassing the coil unconditioned; a lower BF dehumidifies better. Leaving air lies between the ADP and the entering temperature. A design aid; the coil rating governs.",
  example: coilBypassFactorExample.inputs,
  fields: [
    { key: "t_ent_f", label: "Entering-air dry-bulb (°F)", kind: "number" },
    { key: "t_lvg_f", label: "Leaving-air dry-bulb (°F)", kind: "number" },
    { key: "t_adp_f", label: "Apparatus dew point ADP (°F)", kind: "number" },
  ],
  outputs: [
    { key: "bf", id: "cbf-out-bf", label: "Bypass factor BF", value: (r) => fmt(r.bf, 3) },
    { key: "cf", id: "cbf-out-cf", label: "Contact factor CF", value: (r) => fmt(r.cf, 3) },
    { key: "n", id: "cbf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoilBypassFactor,
});

// ===================== spec-v384: fan affinity laws (HVAC airflow field-methods trio) =====================

// dims: in { q1_cfm: L^3 T^-1, sp1_inwg: dimensionless, bhp1_hp: M L^2 T^-3, n1: T^-1, n2: T^-1 } out: { r: dimensionless, q2_cfm: L^3 T^-1, sp2_inwg: dimensionless, bhp2_hp: M L^2 T^-3 }
export function computeFanAffinityLaws({ q1_cfm = 0, sp1_inwg = 0, bhp1_hp = 0, n1 = 0, n2 = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const N1 = Number(n1) || 0, N2 = Number(n2) || 0;
  if (!(N1 > 0)) return { error: "Baseline speed N1 must be positive (rpm)." };
  if (!(N2 > 0)) return { error: "New speed N2 must be positive (rpm)." };
  const r = N2 / N1;
  const q2_cfm = (Number(q1_cfm) || 0) * r;
  const sp2_inwg = (Number(sp1_inwg) || 0) * r * r;
  const bhp2_hp = (Number(bhp1_hp) || 0) * r * r * r;
  return {
    r, q2_cfm, sp2_inwg, bhp2_hp,
    note: "Fan affinity laws for a fixed fan changing speed: airflow scales with speed (Q2 = Q1 r), static pressure with the square (SP2 = SP1 r^2), and brake horsepower with the cube (BHP2 = BHP1 r^3), where r = N2/N1. The cube law is why a small speed cut saves large power (a 25% slowdown cuts power ~58%), the core of VFD energy savings. Valid for the same fan on its system curve; it does not account for motor/drive efficiency shifts, belt losses, or a changed system curve. A field aid; the fan curve and equipment ratings govern.",
  };
}
export const fanAffinityLawsExample = { inputs: { q1_cfm: 10000, sp1_inwg: 1.0, bhp1_hp: 5.0, n1: 900, n2: 1200 } };
HVACAIRSIDE_RENDERERS["fan-affinity-laws"] = _rEnv({
  citation: "Citation: Fan affinity laws (AMCA / ASHRAE Handbook - Fundamentals) for a fixed fan at a changed speed: Q2 = Q1 (N2/N1), SP2 = SP1 (N2/N1)^2, BHP2 = BHP1 (N2/N1)^3. The cube-law power relation is the basis of VFD energy savings. Valid for the same fan on the same system curve; it does not capture motor/drive efficiency changes or a shifted system curve. A field aid; the fan curve and equipment ratings govern.",
  example: fanAffinityLawsExample.inputs,
  fields: [
    { key: "q1_cfm", label: "Baseline airflow Q1 (cfm)", kind: "number" },
    { key: "sp1_inwg", label: "Baseline static pressure SP1 (in wg)", kind: "number" },
    { key: "bhp1_hp", label: "Baseline brake horsepower BHP1 (hp)", kind: "number" },
    { key: "n1", label: "Baseline speed N1 (rpm)", kind: "number" },
    { key: "n2", label: "New speed N2 (rpm)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "fal-out-r", label: "Speed ratio r = N2/N1", value: (r) => fmt(r.r, 4) },
    { key: "q", id: "fal-out-q", label: "New airflow Q2 = Q1 r", value: (r) => fmt(r.q2_cfm, 0) + " cfm" },
    { key: "sp", id: "fal-out-sp", label: "New static SP2 = SP1 r²", value: (r) => fmt(r.sp2_inwg, 2) + " in wg" },
    { key: "bhp", id: "fal-out-bhp", label: "New power BHP2 = BHP1 r³", value: (r) => fmt(r.bhp2_hp, 2) + " hp" },
    { key: "n", id: "fal-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFanAffinityLaws,
});

// ===================== spec-v387: Darcy friction factor (water-system hydraulics trio) =====================

// dims: in { reynolds: dimensionless, rel_roughness: dimensionless } out: { f: dimensionless }
export function computeColebrookFrictionFactor({ reynolds = 0, rel_roughness = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const re = Number(reynolds) || 0;
  const rr = Number(rel_roughness) || 0;
  if (!(re > 0)) return { error: "Reynolds number must be positive." };
  if (rr < 0) return { error: "Relative roughness must be non-negative." };
  const laminar = re < 2300;
  const transitional = re >= 2300 && re <= 4000;
  const f = laminar ? 64 / re : 0.25 / Math.pow(Math.log10(rr / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
  const regime = laminar ? "laminar (f = 64/Re)" : transitional ? "transitional (2300-4000; f is indeterminate, estimate shown)" : "turbulent (Swamee-Jain)";
  return {
    f, regime, laminar, transitional,
    note: "Darcy-Weisbach friction factor f: laminar (Re < 2300) is exactly 64/Re, independent of roughness; turbulent uses the Swamee-Jain explicit fit to the Colebrook equation, f = 0.25 / [log10(eps/D / 3.7 + 5.74 / Re^0.9)]^2, within ~1% of Moody-chart values for 5000 < Re < 1e8 and eps/D < 0.05. The 2300-4000 transition band is physically indeterminate; the turbulent estimate is flagged there. Feeds the head-loss h = f (L/D) V^2/(2g). A design aid; the system analysis governs.",
  };
}
export const colebrookFrictionFactorExample = { inputs: { reynolds: 100000, rel_roughness: 0.0003 } };
HVACAIRSIDE_RENDERERS["colebrook-friction-factor"] = _rEnv({
  citation: "Citation: Darcy friction factor -- laminar f = 64/Re, and the Swamee-Jain (1976) explicit approximation to the Colebrook-White equation f = 0.25 / [log10(eps/D / 3.7 + 5.74 / Re^0.9)]^2 for turbulent flow (within ~1% of the Colebrook/Moody value over 5000 < Re < 1e8, eps/D <= 0.05). The 2300-4000 transition is indeterminate. Feeds the Darcy-Weisbach head loss h = f (L/D) V^2/(2g). A design aid; the system analysis governs.",
  example: colebrookFrictionFactorExample.inputs,
  fields: [
    { key: "reynolds", label: "Reynolds number Re", kind: "number" },
    { key: "rel_roughness", label: "Relative roughness eps/D", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "cff-out-f", label: "Darcy friction factor f", value: (r) => fmt(r.f, 4) },
    { key: "reg", id: "cff-out-reg", label: "Flow regime", value: (r) => r.regime },
    { key: "n", id: "cff-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeColebrookFrictionFactor,
});

// ===================== spec-v408: Manual D friction rate (HVAC duct-design trio) =====================

// dims: in { blower_esp_inwg: dimensionless, component_drop_inwg: dimensionless, tel_ft: L } out: { asp_inwg: dimensionless, fr_inwg_100ft: dimensionless }
export function computeManualDFrictionRate({ blower_esp_inwg = 0, component_drop_inwg = 0, tel_ft = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const esp = Number(blower_esp_inwg) || 0;
  const drops = Number(component_drop_inwg) || 0;
  const tel = Number(tel_ft) || 0;
  if (!(esp > 0)) return { error: "Blower external static pressure must be positive (in wg)." };
  if (drops < 0) return { error: "Component pressure drops must be non-negative (in wg)." };
  if (!(tel > 0)) return { error: "Total effective length must be positive (ft)." };
  const asp_inwg = esp - drops;
  if (!(asp_inwg > 0)) return { error: "Component drops meet or exceed the blower static -- no available static for the ducts (unworkable; reduce drops or pick a stronger blower)." };
  const fr_inwg_100ft = asp_inwg * 100 / tel;
  return {
    asp_inwg, fr_inwg_100ft,
    note: "ACCA Manual D friction rate: the available static pressure ASP = blower rated external static at design CFM - the sum of component drops (coil, filter, registers/grilles, dampers, balancing), and the design friction rate FR = ASP x 100 / total effective length (in wg per 100 ft). The TEL is the longest supply-plus-return path including the equivalent lengths of the fittings, not the physical run. A typical FR target is 0.06-0.10; a lower rate needs larger ducts. A design aid; a full Manual D duct layout governs.",
  };
}
export const manualDFrictionRateExample = { inputs: { blower_esp_inwg: 0.60, component_drop_inwg: 0.42, tel_ft: 180 } };
HVACAIRSIDE_RENDERERS["manual-d-friction-rate"] = _rEnv({
  citation: "Citation: ACCA Manual D friction rate: available static pressure ASP = blower rated ESP - total component drops, design friction rate FR = ASP x 100 / total effective length (in wg per 100 ft). The TEL includes the fitting equivalent lengths, not just the physical run. A design aid; the full Manual D layout governs.",
  example: manualDFrictionRateExample.inputs,
  fields: [
    { key: "blower_esp_inwg", label: "Blower rated ESP at design CFM (in wg)", kind: "number" },
    { key: "component_drop_inwg", label: "Total component drops (in wg)", kind: "number" },
    { key: "tel_ft", label: "Total effective length (ft)", kind: "number" },
  ],
  outputs: [
    { key: "asp", id: "mdf-out-asp", label: "Available static pressure", value: (r) => fmt(r.asp_inwg, 2) + " in wg" },
    { key: "fr", id: "mdf-out-fr", label: "Design friction rate", value: (r) => fmt(r.fr_inwg_100ft, 3) + " in wg/100 ft" },
    { key: "n", id: "mdf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeManualDFrictionRate,
});
