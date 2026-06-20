// Group C (cont.): HVAC field-service bench.
// spec-v102 establishes this new lazy-loaded renderer module for the
// field-service and startup/recovery numbers a tech needs at the unit,
// relieving the standing calc-hvac.js cap watch instead of bumping that
// module again. Every tile keeps group: "C" (a tile's group letter is
// independent of the module that holds it -- the v28/v70..v100 split
// precedent). Tiles:
//   v102 condensate-drain, recovery-cylinder
//   v104 hvac-equipment-circuit, run-capacitor-microfarad
// The v102 pair is GOVERNANCE.general field-service arithmetic (the code
// and the equipment data govern). The v104 pair is the electrical side of
// the same service call: hvac-equipment-circuit is the NEC 440 nameplate
// MCA/MOCP math (GOVERNANCE.electrical) and run-capacitor-microfarad is the
// first-principles capacitive-reactance bench check a tech runs at the unit
// (GOVERNANCE.general). See spec-v102.md and spec-v104.md.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied
// verbatim from the sibling calc-* modules; non-exported, no corpus row).
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

// Compact renderer factory (number inputs only here; same shape as the
// calc-finish.js _simpleRenderer).
function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };
}

export const HVACSERVICE_RENDERERS = {};

// ===================== spec-v102: condensate rate, drain size, slope =====================

const _PINTS_PER_GAL = 8;
function _condensateDrainSize(tons) {
  if (tons <= 20) return 0.75;
  if (tons <= 40) return 1.0;
  if (tons <= 90) return 1.25;
  if (tons <= 125) return 1.5;
  return 2.0;
}
// dims: in { tons: dimensionless, pints_per_ton_hr: dimensionless, run_ft: L, slope_in_per_ft: dimensionless } out: { rate_pints_hr: dimensionless, rate_gph: dimensionless, min_size_in: L, fall_in: L }
export function computeCondensateDrain({ tons = 0, pints_per_ton_hr = 3, run_ft = 0, slope_in_per_ft = 0.125 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (run_ft < 0 || slope_in_per_ft < 0) return { error: "Run and slope must be non-negative." };
  if (!(tons > 0)) return { error: "Cooling capacity must be positive (tons)." };
  if (!(pints_per_ton_hr > 0)) return { error: "Condensate rate must be positive (pints per ton-hour)." };
  const rate_pints_hr = tons * pints_per_ton_hr;
  const rate_gph = rate_pints_hr / _PINTS_PER_GAL;
  const min_size_in = _condensateDrainSize(tons);
  const fall_in = run_ft * slope_in_per_ft;
  return {
    rate_pints_hr, rate_gph, min_size_in, fall_in,
    note: "Condensate production tracks the LATENT load and indoor humidity - the per-ton rate here is a field estimate (about 2 to 4 pints per ton-hour is common in humid cooling), not a code value. The drain-size steps come from IMC 307.2.2 by equipment capacity; the line slopes not less than 1/8 in per foot toward the discharge (IMC 307.2.5). A draw-through coil needs a proper trap to break the negative pressure. The AHJ and the equipment manual govern.",
  };
}
const condensateDrainExample = { inputs: { tons: 3, pints_per_ton_hr: 3, run_ft: 20, slope_in_per_ft: 0.125 } };
HVACSERVICE_RENDERERS["condensate-drain"] = _simpleRenderer({
  citation: "Citation: IMC 307.2.2 condensate drain-size-by-capacity steps and the 307.2.5 not-less-than-1/8-in-per-foot slope (by name); 8 pints per gallon. The per-ton condensate rate is an editable field estimate, not a code value.",
  example: condensateDrainExample.inputs,
  fields: [
    { key: "tons", label: "Cooling capacity (tons)", kind: "number" },
    { key: "pints_per_ton_hr", label: "Condensate rate (pints/ton-hr)", kind: "number", default: 3 },
    { key: "run_ft", label: "Horizontal run (ft)", kind: "number", default: 0 },
    { key: "slope_in_per_ft", label: "Slope (in/ft)", kind: "number", default: 0.125 },
  ],
  outputs: [
    { key: "p", id: "cd-out-p", label: "Condensate rate", value: (r) => fmt(r.rate_pints_hr, 1) + " pints/hr" },
    { key: "g", id: "cd-out-g", label: "Condensate rate", value: (r) => fmt(r.rate_gph, 3) + " gph" },
    { key: "s", id: "cd-out-s", label: "Minimum drain size", value: (r) => fmt(r.min_size_in, 2) + " in" },
    { key: "f", id: "cd-out-f", label: "Fall over run", value: (r) => fmt(r.fall_in, 2) + " in" },
    { key: "n", id: "cd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCondensateDrain,
});

// ===================== spec-v102: recovery-cylinder 80% fill =====================

const _WATER_LB_PER_GAL = 8.34;
// dims: in { water_capacity_lb: M, refrig_density_lb_gal: dimensionless, current_net_lb: M, fill_fraction: dimensionless } out: { specific_gravity: dimensionless, max_net_lb: M, remaining_lb: M, pct_full: dimensionless }
export function computeRecoveryCylinder({ water_capacity_lb = 0, refrig_density_lb_gal = 0, current_net_lb = 0, fill_fraction = 0.8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (current_net_lb < 0) return { error: "Current charge must be non-negative." };
  if (!(water_capacity_lb > 0)) return { error: "Cylinder water capacity (WC) must be positive (lb)." };
  if (!(refrig_density_lb_gal > 0)) return { error: "Refrigerant liquid density must be positive (lb/gal)." };
  if (!(fill_fraction > 0 && fill_fraction <= 1)) return { error: "Fill fraction must be in (0, 1]." };
  const specific_gravity = refrig_density_lb_gal / _WATER_LB_PER_GAL;
  const max_net_lb = fill_fraction * water_capacity_lb * specific_gravity;
  const remaining_lb = Math.max(0, max_net_lb - current_net_lb);
  const pct_full = current_net_lb / max_net_lb * 100;
  const action = current_net_lb >= max_net_lb ? "do not fill" : "ok to fill";
  return {
    specific_gravity, max_net_lb, remaining_lb, pct_full, action,
    note: "The 80% rule leaves room for liquid expansion with temperature - never fill past it. Water capacity (WC) and tare are stamped on the cylinder, and the NET refrigerant is the gross on the scale minus the tare. Liquid density varies with refrigerant and temperature, so read it from the property sheet. Never mix refrigerants in a recovery cylinder, and use only a cylinder rated and in-date for recovery. EPA Section 608 governs handling.",
  };
}
const recoveryCylinderExample = { inputs: { water_capacity_lb: 50, refrig_density_lb_gal: 9.0, current_net_lb: 30, fill_fraction: 0.8 } };
HVACSERVICE_RENDERERS["recovery-cylinder"] = _simpleRenderer({
  citation: "Citation: DOT / AHRI 700 / EPA Section 608 recovery-cylinder practice (by name) - the 80% maximum fill, the stamped water-capacity (WC) and tare basis, and the never-mix-refrigerants rule; 8.34 lb per gallon water basis for specific gravity.",
  example: recoveryCylinderExample.inputs,
  fields: [
    { key: "water_capacity_lb", label: "Cylinder water capacity WC (lb)", kind: "number" },
    { key: "refrig_density_lb_gal", label: "Refrigerant liquid density (lb/gal)", kind: "number" },
    { key: "current_net_lb", label: "Refrigerant already in (net lb)", kind: "number", default: 0 },
    { key: "fill_fraction", label: "Max fill fraction", kind: "number", default: 0.8 },
  ],
  outputs: [
    { key: "m", id: "rc-out-m", label: "Max net at fill limit", value: (r) => fmt(r.max_net_lb, 1) + " lb" },
    { key: "r", id: "rc-out-r", label: "Remaining capacity", value: (r) => fmt(r.remaining_lb, 1) + " lb" },
    { key: "p", id: "rc-out-p", label: "Percent full", value: (r) => fmt(r.pct_full, 1) + "%" },
    { key: "a", id: "rc-out-a", label: "Action", value: (r) => r.action },
    { key: "n", id: "rc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRecoveryCylinder,
});

// ===================== spec-v104: HVAC equipment circuit (NEC 440 MCA/MOCP) =====================

// NEC 240.6(A) standard overcurrent-device ampere ratings. The branch-circuit
// MOCP is the largest standard size that does not EXCEED the calculated
// maximum (NEC 440.22 is a ceiling, so round DOWN, never up).
const _STD_OCPD_A = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200];
function _ocpdRoundDown(a) {
  let pick = _STD_OCPD_A[0];
  for (const s of _STD_OCPD_A) { if (s <= a) pick = s; else break; }
  return pick;
}
// dims: in { compressor_rla_A: I, fan_fla_A: I, other_load_A: I, installed_breaker_A: I } out: { mca_A: I, mocp_A: I, mocp_max_A: I, min_conductor_A: I }
export function computeHvacEquipmentCircuit({ compressor_rla_A = 0, fan_fla_A = 0, other_load_A = 0, installed_breaker_A = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(compressor_rla_A > 0)) return { error: "Compressor rated-load amps (RLA) must be positive." };
  if (fan_fla_A < 0 || other_load_A < 0 || installed_breaker_A < 0) return { error: "Fan, other-load, and breaker amps must be non-negative." };
  const sum_all = compressor_rla_A + fan_fla_A + other_load_A;
  const largest = Math.max(compressor_rla_A, fan_fla_A, other_load_A);
  const others = sum_all - largest;
  const mca_A = 1.25 * largest + others;
  const mocp_A = _ocpdRoundDown(1.75 * largest + others);
  const mocp_max_A = _ocpdRoundDown(2.25 * largest + others);
  const min_conductor_A = mca_A;
  let verdict;
  if (!(installed_breaker_A > 0)) verdict = "Enter the installed breaker size to check it against the maximum.";
  else if (installed_breaker_A <= mocp_A) verdict = "within the nameplate maximum (" + mocp_A + " A) - ok";
  else if (installed_breaker_A <= mocp_max_A) verdict = "above the 175% size, allowed only if needed to start (up to the 225% ceiling of " + mocp_max_A + " A)";
  else verdict = "exceeds the 225% ceiling of " + mocp_max_A + " A - too large";
  return {
    mca_A, mocp_A, mocp_max_A, min_conductor_A, verdict,
    note: "NEC 440.33: the minimum circuit ampacity (MCA) is 125% of the largest motor's RLA plus the sum of the other loads - size the conductor to carry at least the MCA. NEC 440.22(A): the maximum overcurrent device (MOCP) is 175% of the largest RLA plus the others, taken to the next standard size DOWN; only if that size will not let the equipment start may it go to 225%. RLA is the nameplate rated-load amps (not LRA). The equipment nameplate's stamped MCA/MOCP and the AHJ govern.",
  };
}
const hvacEquipmentCircuitExample = { inputs: { compressor_rla_A: 20, fan_fla_A: 1.5, other_load_A: 0, installed_breaker_A: 35 } };
HVACSERVICE_RENDERERS["hvac-equipment-circuit"] = _simpleRenderer({
  citation: "Citation: NEC 2023 (NFPA 70) 440.33 minimum circuit ampacity (125% of the largest motor + others) and 440.22(A) maximum overcurrent protection (175% to the next standard size down, 225% to start), with NEC 240.6(A) standard device sizes (by name). The nameplate MCA/MOCP and the AHJ govern. Free read-only at nfpa.org/freeaccess.",
  example: hvacEquipmentCircuitExample.inputs,
  fields: [
    { key: "compressor_rla_A", label: "Compressor RLA (A)", kind: "number" },
    { key: "fan_fla_A", label: "Condenser-fan FLA (A)", kind: "number", default: 0 },
    { key: "other_load_A", label: "Other loads (A)", kind: "number", default: 0 },
    { key: "installed_breaker_A", label: "Installed breaker (A, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "m", id: "hec-out-m", label: "Minimum circuit ampacity (MCA)", value: (r) => fmt(r.mca_A, 1) + " A" },
    { key: "o", id: "hec-out-o", label: "Max overcurrent (MOCP, 175%)", value: (r) => fmt(r.mocp_A, 0) + " A" },
    { key: "x", id: "hec-out-x", label: "Hard-start ceiling (225%)", value: (r) => fmt(r.mocp_max_A, 0) + " A" },
    { key: "v", id: "hec-out-v", label: "Installed breaker", value: (r) => r.verdict },
    { key: "n", id: "hec-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHvacEquipmentCircuit,
});

// ===================== spec-v104: run-capacitor microfarad check =====================

// The in-circuit capacitance test: a run capacitor's reactance is
// Xc = 1 / (2 x pi x f x C), so the current it passes is I = V / Xc =
// V x 2 x pi x f x C, and C = I / (2 x pi x f x V). At 60 Hz that is
// C[microfarad] = 1e6 x I / (2 x pi x 60 x V) ~= 2652 x I / V.
const _CAP_K_60HZ = 1e6 / (2 * Math.PI * 60);
// dims: in { rated_uf: M^-1 L^-2 T^4 I^2, measured_volts_V: M L^2 T^-3 I^-1, measured_amps_A: I, tolerance_pct: dimensionless } out: { measured_uf: M^-1 L^-2 T^4 I^2, pct_of_rated: dimensionless, low_uf: M^-1 L^-2 T^4 I^2, high_uf: M^-1 L^-2 T^4 I^2 }
export function computeRunCapacitorMicrofarad({ rated_uf = 0, measured_volts_V = 0, measured_amps_A = 0, tolerance_pct = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_uf > 0)) return { error: "Nameplate capacitor rating must be positive (microfarad)." };
  if (!(measured_volts_V > 0)) return { error: "Measured voltage across the capacitor must be positive (V)." };
  if (!(measured_amps_A > 0)) return { error: "Measured current through the capacitor must be positive (A)." };
  if (!(tolerance_pct >= 0 && tolerance_pct < 100)) return { error: "Tolerance must be in [0, 100) percent." };
  const measured_uf = _CAP_K_60HZ * measured_amps_A / measured_volts_V;
  const low_uf = rated_uf * (1 - tolerance_pct / 100);
  const high_uf = rated_uf * (1 + tolerance_pct / 100);
  const pct_of_rated = measured_uf / rated_uf * 100;
  let verdict;
  if (measured_uf < low_uf) verdict = "below tolerance - weak capacitor, replace";
  else if (measured_uf > high_uf) verdict = "above tolerance - replace the capacitor";
  else verdict = "within tolerance - capacitor is good";
  return {
    measured_uf, pct_of_rated, low_uf, high_uf, verdict,
    note: "The measured value is the in-circuit capacitance from C = I / (2 x pi x f x V) at 60 Hz (the ~2652 x amps / volts field rule). Read the amps with a clamp on the capacitor lead and the volts across its terminals with the unit running. Run capacitors are commonly held to about +/-6% (the editable tolerance), start capacitors to a wider band. A reading well below rating is a weak cap that runs the motor hot; replace with the same microfarad and an equal-or-higher voltage rating. Discharge the capacitor before touching the terminals.",
  };
}
const runCapacitorExample = { inputs: { rated_uf: 45, measured_volts_V: 370, measured_amps_A: 6.2, tolerance_pct: 6 } };
HVACSERVICE_RENDERERS["run-capacitor-microfarad"] = _simpleRenderer({
  citation: "Citation: first-principles capacitive reactance Xc = 1/(2 x pi x f x C), so C[microfarad] = 1e6 x I / (2 x pi x 60 x V) ~= 2652 x amps / volts at 60 Hz (public); the +/-6% run-capacitor tolerance is the common motor-capacitor convention (editable). Discharge before handling; the licensed tech governs.",
  example: runCapacitorExample.inputs,
  fields: [
    { key: "rated_uf", label: "Nameplate rating (uF)", kind: "number" },
    { key: "measured_volts_V", label: "Measured voltage across cap (V)", kind: "number" },
    { key: "measured_amps_A", label: "Measured current through cap (A)", kind: "number" },
    { key: "tolerance_pct", label: "Tolerance (%)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "u", id: "rcm-out-u", label: "Measured capacitance", value: (r) => fmt(r.measured_uf, 1) + " uF" },
    { key: "p", id: "rcm-out-p", label: "Percent of rating", value: (r) => fmt(r.pct_of_rated, 0) + "%" },
    { key: "b", id: "rcm-out-b", label: "Tolerance band", value: (r) => fmt(r.low_uf, 1) + " to " + fmt(r.high_uf, 1) + " uF" },
    { key: "v", id: "rcm-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "rcm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRunCapacitorMicrofarad,
});
