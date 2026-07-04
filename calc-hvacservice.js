// Group C (cont.): HVAC field-service bench.
// spec-v102 establishes this new lazy-loaded renderer module for the
// field-service and startup/recovery numbers a tech needs at the unit,
// relieving the standing calc-hvac.js cap watch instead of bumping that
// module again. Every tile keeps group: "C" (a tile's group letter is
// independent of the module that holds it -- the v28/v70..v100 split
// precedent). Tiles:
//   v102 condensate-drain, recovery-cylinder
//   v104 hvac-equipment-circuit, run-capacitor-microfarad
//   v105 vacuum-decay-test, nitrogen-pressure-test
//   v110 gas-meter-clock, furnace-temp-rise (gas-heat start-up)
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

// ===================== spec-v105: evacuation standing-decay (blank-off) test =====================

// The micron decay test: evacuate to a target (commonly 500 microns), valve
// off the pump, and watch the gauge over a timed window. The rise is rise =
// end - start and the rate is rise / hold. A vacuum that holds at or below
// the pass ceiling is tight and dry; one that climbs past it is either
// residual moisture/outgassing (the rise plateaus) or a leak (it climbs
// steadily). Pure rise/time arithmetic plus a threshold verdict.
// dims: in { start_micron: M L^-1 T^-2, end_micron: M L^-1 T^-2, hold_min: T, pass_ceiling_micron: M L^-1 T^-2 } out: { rise_micron: M L^-1 T^-2, rate_micron_per_min: M L^-1 T^-3 }
export function computeVacuumDecayTest({ start_micron = 0, end_micron = 0, hold_min = 0, pass_ceiling_micron = 500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(start_micron > 0)) return { error: "Starting vacuum level must be positive (microns)." };
  if (!(end_micron > 0)) return { error: "Ending vacuum level must be positive (microns)." };
  if (!(hold_min > 0)) return { error: "Hold time must be positive (minutes)." };
  if (!(pass_ceiling_micron > 0)) return { error: "Pass ceiling must be positive (microns)." };
  const rise_micron = end_micron - start_micron;
  const rate_micron_per_min = rise_micron / hold_min;
  let verdict;
  if (end_micron <= pass_ceiling_micron) {
    verdict = "holds at or below the " + fmt(pass_ceiling_micron, 0) + "-micron ceiling - the system is tight and dry, ok to charge";
  } else {
    verdict = "rose to " + fmt(end_micron, 0) + " microns, above the " + fmt(pass_ceiling_micron, 0) + "-micron ceiling - not ready: a rise that plateaus is residual moisture or outgassing (keep evacuating), a rise that climbs steadily is a leak (pressure-test to find it)";
  }
  return {
    rise_micron, rate_micron_per_min, verdict,
    note: "The standing decay (blank-off) test isolates the pump and watches the gauge: evacuate to the target, close the valve to the pump, and time the rise. The 500-micron pass ceiling is the common HVAC field convention (ACCA Standard 4 / AHRI / the equipment manual) and is editable - some manufacturers call for a deeper hold. Use an electronic micron (vacuum) gauge, not the compound gauge on the manifold. A rise that levels off below ~1000-1500 microns is usually moisture still boiling off; a steady climb that does not plateau is a leak. The equipment manufacturer and the licensed tech govern.",
  };
}
const vacuumDecayExample = { inputs: { start_micron: 300, end_micron: 450, hold_min: 15, pass_ceiling_micron: 500 } };
HVACSERVICE_RENDERERS["vacuum-decay-test"] = _simpleRenderer({
  citation: "Citation: first-principles standing-decay arithmetic (rise = end - start; rate = rise / hold). The 500-micron evacuation target and the valve-off blank-off (decay) test are the common HVAC field convention (ACCA Standard 4 / AHRI / equipment manual, by name); the pass ceiling is an editable field value.",
  example: vacuumDecayExample.inputs,
  fields: [
    { key: "start_micron", label: "Vacuum at valve-off (microns)", kind: "number" },
    { key: "end_micron", label: "Vacuum after hold (microns)", kind: "number" },
    { key: "hold_min", label: "Hold time (min)", kind: "number" },
    { key: "pass_ceiling_micron", label: "Pass ceiling (microns)", kind: "number", default: 500 },
  ],
  outputs: [
    { key: "r", id: "vdt-out-r", label: "Total rise", value: (r) => fmt(r.rise_micron, 0) + " microns" },
    { key: "t", id: "vdt-out-t", label: "Rise rate", value: (r) => fmt(r.rate_micron_per_min, 1) + " microns/min" },
    { key: "v", id: "vdt-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "vdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVacuumDecayTest,
});

// ===================== spec-v105: nitrogen standing-pressure test (Gay-Lussac correction) =====================

const _F_TO_R = 459.67;
// A standing nitrogen pressure test held over hours sees the gauge move with
// ambient temperature alone (Gay-Lussac's law at constant volume: P/T is
// constant in ABSOLUTE units). This separates the thermal swing from a real
// leak: expected_P2_abs = P1_abs x T2/T1, and any pressure lost below that
// expected value is the leak.
// dims: in { start_psig: M L^-1 T^-2, start_temp_F: T, end_temp_F: T, end_psig: M L^-1 T^-2, atm_psi: M L^-1 T^-2, tolerance_psi: M L^-1 T^-2 } out: { expected_psig: M L^-1 T^-2, leak_drop_psi: M L^-1 T^-2, gauge_change_psi: M L^-1 T^-2 }
export function computeNitrogenPressureTest({ start_psig = 0, start_temp_F = 0, end_temp_F = 0, end_psig = 0, atm_psi = 14.7, tolerance_psi = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(start_psig > 0)) return { error: "Starting test pressure must be positive (psig)." };
  if (end_psig < 0) return { error: "Ending pressure must be non-negative (psig)." };
  if (!(atm_psi > 0)) return { error: "Atmospheric pressure must be positive (psi)." };
  if (tolerance_psi < 0) return { error: "Tolerance must be non-negative (psi)." };
  const t1_R = start_temp_F + _F_TO_R;
  const t2_R = end_temp_F + _F_TO_R;
  if (!(t1_R > 0) || !(t2_R > 0)) return { error: "Temperatures must be above absolute zero (-459.67 F)." };
  const p1_abs = start_psig + atm_psi;
  const expected_abs = p1_abs * (t2_R / t1_R);
  const expected_psig = expected_abs - atm_psi;
  const leak_drop_psi = expected_psig - end_psig;
  const gauge_change_psi = end_psig - start_psig;
  let verdict;
  if (Math.abs(leak_drop_psi) <= tolerance_psi) {
    verdict = "holds - the " + fmt(gauge_change_psi, 1) + " psi gauge change is explained by the temperature swing (tight, within +/-" + fmt(tolerance_psi, 1) + " psi)";
  } else if (leak_drop_psi > tolerance_psi) {
    verdict = "lost " + fmt(leak_drop_psi, 1) + " psi below the temperature-corrected " + fmt(expected_psig, 1) + " psig - a leak; soap-test the joints";
  } else {
    verdict = "reads " + fmt(-leak_drop_psi, 1) + " psi above the temperature-corrected " + fmt(expected_psig, 1) + " psig - re-check the gauge and the two temperature readings";
  }
  return {
    expected_psig, leak_drop_psi, gauge_change_psi, verdict,
    note: "Gay-Lussac's law: at a fixed volume P/T is constant in ABSOLUTE units, so the gauge reads P1_abs x T2/T1 after the temperature moves with no leak (pressures in psia = psig + atmospheric, temperatures in Rankine = F + 459.67). The leak figure is what the system lost BELOW that temperature-corrected value. Use dry nitrogen (never oxygen or acetylene), a regulated test pressure within the equipment and component ratings, and read both temperatures at the same place on the system. The equipment ratings and the AHJ govern.",
  };
}
const nitrogenPressureExample = { inputs: { start_psig: 150, start_temp_F: 70, end_temp_F: 50, end_psig: 144, atm_psi: 14.7, tolerance_psi: 1 } };
HVACSERVICE_RENDERERS["nitrogen-pressure-test"] = _simpleRenderer({
  citation: "Citation: first-principles Gay-Lussac's law - at constant volume P/T is constant in absolute units, so expected_psig = (start_psig + atm) x (end_R / start_R) - atm with R = F + 459.67 (public physics). The standing nitrogen pressure test with temperature correction is standard refrigeration leak-check practice; the equipment ratings and the AHJ govern.",
  example: nitrogenPressureExample.inputs,
  fields: [
    { key: "start_psig", label: "Test pressure at start (psig)", kind: "number" },
    { key: "start_temp_F", label: "Temperature at start (F)", kind: "number" },
    { key: "end_temp_F", label: "Temperature at end (F)", kind: "number" },
    { key: "end_psig", label: "Gauge pressure at end (psig)", kind: "number" },
    { key: "atm_psi", label: "Atmospheric pressure (psi)", kind: "number", default: 14.7 },
    { key: "tolerance_psi", label: "Leak tolerance (psi)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "e", id: "npt-out-e", label: "Temperature-corrected expected", value: (r) => fmt(r.expected_psig, 1) + " psig" },
    { key: "l", id: "npt-out-l", label: "Pressure lost to leak", value: (r) => fmt(r.leak_drop_psi, 1) + " psi" },
    { key: "g", id: "npt-out-g", label: "Raw gauge change", value: (r) => fmt(r.gauge_change_psi, 1) + " psi" },
    { key: "v", id: "npt-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "npt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeNitrogenPressureTest,
});

// ===================== spec-v110: gas-meter clocking (actual firing rate) =====================

const _SEC_PER_HR = 3600;
// Clock the meter: with every other gas appliance off, time one revolution of
// a known test dial. The flow is cfh = (3600 / sec_per_rev) x dial_size_cf and
// the firing rate is cfh x the fuel heating value. Compare to the nameplate.
// dims: in { sec_per_rev: T, dial_size_cf: L^3, heating_value_btu_cf: M L^-1 T^-2, nameplate_input_btuh: M L^2 T^-3 } out: { cfh: L^3 T^-1, actual_input_btuh: M L^2 T^-3 }
export function computeGasMeterClock({ sec_per_rev = 0, dial_size_cf = 0, heating_value_btu_cf = 1030, nameplate_input_btuh = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(sec_per_rev > 0)) return { error: "Seconds per revolution must be positive." };
  if (!(dial_size_cf > 0)) return { error: "Test-dial size must be positive (cubic feet per revolution)." };
  if (!(heating_value_btu_cf > 0)) return { error: "Heating value must be positive (BTU per cubic foot)." };
  if (nameplate_input_btuh < 0) return { error: "Nameplate input must be non-negative (BTU/hr)." };
  const cfh = (_SEC_PER_HR / sec_per_rev) * dial_size_cf;
  const actual_input_btuh = cfh * heating_value_btu_cf;
  let verdict;
  if (!(nameplate_input_btuh > 0)) {
    verdict = "Enter the nameplate input to compare the clocked rate against it.";
  } else {
    const pct = (actual_input_btuh / nameplate_input_btuh - 1) * 100;
    if (Math.abs(pct) <= 5) verdict = "firing on rate - within 5% of the " + fmt(nameplate_input_btuh, 0) + " BTU/hr nameplate";
    else if (pct > 5) verdict = "overfired - " + fmt(pct, 0) + "% above the nameplate; reduce manifold pressure or check the orifice";
    else verdict = "underfired - " + fmt(-pct, 0) + "% below the nameplate; check gas pressure, the orifice, or the meter";
  }
  return {
    cfh, actual_input_btuh, verdict,
    note: "Clock the meter with EVERY other gas appliance off (pilots included): time one full revolution of a known test dial, then cfh = (3600 / seconds-per-rev) x dial size, and the firing rate is cfh x the fuel heating value. The default 1030 BTU/cf is a typical natural-gas value - the gas utility's actual heating value governs (it varies by supply); for LP set it to about 2500 BTU/cf. Compare the clocked rate to the rating-plate input and adjust manifold pressure only within the manufacturer's stamped range. The equipment manual and the licensed tech govern.",
  };
}
const gasMeterClockExample = { inputs: { sec_per_rev: 37, dial_size_cf: 1, heating_value_btu_cf: 1030, nameplate_input_btuh: 100000 } };
HVACSERVICE_RENDERERS["gas-meter-clock"] = _simpleRenderer({
  citation: "Citation: first-principles meter-clocking arithmetic - cfh = (3600 / seconds-per-rev) x dial size; firing rate = cfh x heating value (public). The default 1030 BTU/cf natural-gas (about 2500 for LP) heating value is an editable field; the gas utility's actual heating value and the equipment rating plate govern.",
  example: gasMeterClockExample.inputs,
  fields: [
    { key: "sec_per_rev", label: "Seconds per revolution", kind: "number" },
    { key: "dial_size_cf", label: "Test-dial size (cf/rev)", kind: "number" },
    { key: "heating_value_btu_cf", label: "Heating value (BTU/cf)", kind: "number", default: 1030 },
    { key: "nameplate_input_btuh", label: "Nameplate input (BTU/hr, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "c", id: "gmc-out-c", label: "Gas flow", value: (r) => fmt(r.cfh, 1) + " cfh" },
    { key: "i", id: "gmc-out-i", label: "Actual firing rate", value: (r) => fmt(r.actual_input_btuh, 0) + " BTU/hr" },
    { key: "v", id: "gmc-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "gmc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGasMeterClock,
});

// ===================== spec-v110: furnace temperature rise and derived airflow =====================

const _SENSIBLE_HEAT_FACTOR = 1.08; // BTU/hr per CFM per F, sea level.
// Read supply and return air temperatures and check the rise against the
// rating-plate range; derive airflow from the heat output via the sensible-heat
// relation Qs = 1.08 x CFM x delta-T, solved for CFM.
// dims: in { return_air_F: T, supply_air_F: T, input_btuh: M L^2 T^-3, efficiency_pct: dimensionless, rise_min_F: T, rise_max_F: T } out: { delta_T_F: T, output_btuh: M L^2 T^-3, cfm: L^3 T^-1 }
export function computeFurnaceTempRise({ return_air_F = 0, supply_air_F = 0, input_btuh = 0, efficiency_pct = 80, rise_min_F = 40, rise_max_F = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(input_btuh > 0)) return { error: "Furnace input must be positive (BTU/hr)." };
  if (!(efficiency_pct > 0)) return { error: "Efficiency must be positive (percent)." };
  if (rise_min_F < 0 || rise_max_F < 0) return { error: "Rating-plate rise limits must be non-negative." };
  const delta_T_F = supply_air_F - return_air_F;
  if (!(delta_T_F > 0)) return { error: "Supply air must be warmer than return air (positive temperature rise)." };
  const output_btuh = input_btuh * efficiency_pct / 100;
  const cfm = output_btuh / (_SENSIBLE_HEAT_FACTOR * delta_T_F);
  let verdict;
  if (delta_T_F < rise_min_F) verdict = "rise low (" + fmt(delta_T_F, 0) + " F, below the " + fmt(rise_min_F, 0) + " F minimum) - airflow too high, or the burner is underfired";
  else if (delta_T_F > rise_max_F) verdict = "rise high (" + fmt(delta_T_F, 0) + " F, above the " + fmt(rise_max_F, 0) + " F maximum) - airflow too low; check the filter, ductwork, and blower speed";
  else verdict = "rise in range (" + fmt(delta_T_F, 0) + " F, within " + fmt(rise_min_F, 0) + " to " + fmt(rise_max_F, 0) + " F)";
  return {
    delta_T_F, output_btuh, cfm, verdict,
    note: "The temperature rise is supply-air minus return-air dry-bulb, read in the plenums clear of radiant view of the heat exchanger. The rating plate stamps the allowed rise range (commonly 40 to 70 F) - it is the governing limit; the derived CFM comes from the sensible-heat relation Qs = 1.08 x CFM x delta-T solved for airflow, with output = input x efficiency (default 80%, an editable nameplate value). The 1.08 factor is sea-level standard air; at altitude or with high humidity it falls, and the rating-plate range still governs. The equipment manufacturer and the licensed tech govern.",
  };
}
const furnaceTempRiseExample = { inputs: { return_air_F: 70, supply_air_F: 120, input_btuh: 100000, efficiency_pct: 80, rise_min_F: 40, rise_max_F: 70 } };
HVACSERVICE_RENDERERS["furnace-temp-rise"] = _simpleRenderer({
  citation: "Citation: first-principles sensible-heat relation Qs = 1.08 x CFM x delta-T solved for airflow, with output = input x efficiency (public); the 1.08 sea-level air factor and the default 80% efficiency are editable. The rating-plate temperature-rise range and the equipment manufacturer govern.",
  example: furnaceTempRiseExample.inputs,
  fields: [
    { key: "return_air_F", label: "Return-air temp (F)", kind: "number" },
    { key: "supply_air_F", label: "Supply-air temp (F)", kind: "number" },
    { key: "input_btuh", label: "Furnace input (BTU/hr)", kind: "number" },
    { key: "efficiency_pct", label: "Efficiency (%)", kind: "number", default: 80 },
    { key: "rise_min_F", label: "Plate min rise (F)", kind: "number", default: 40 },
    { key: "rise_max_F", label: "Plate max rise (F)", kind: "number", default: 70 },
  ],
  outputs: [
    { key: "d", id: "ftr-out-d", label: "Temperature rise", value: (r) => fmt(r.delta_T_F, 1) + " F" },
    { key: "o", id: "ftr-out-o", label: "Heat output", value: (r) => fmt(r.output_btuh, 0) + " BTU/hr" },
    { key: "c", id: "ftr-out-c", label: "Derived airflow", value: (r) => fmt(r.cfm, 0) + " CFM" },
    { key: "v", id: "ftr-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "ftr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFurnaceTempRise,
});

// ===================== spec-v218: blower-door air-tightness (ACH50) =====================

// dims: in { cfm50: L^3 T^-1, volume_ft3: L^3, n_factor: dimensionless, target_ach50: dimensionless } out: { ach50: T^-1, ach_nat: T^-1, cfm_nat: L^3 T^-1 }
export function computeBlowerDoorAch50({ cfm50 = 0, volume_ft3 = 0, n_factor = 17, target_ach50 = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cfm50 > 0)) return { error: "Measured CFM50 must be positive (cfm)." };
  if (!(volume_ft3 > 0)) return { error: "Conditioned volume must be positive (ft^3)." };
  if (!(n_factor > 0)) return { error: "N-factor must be positive." };
  if (!(target_ach50 > 0)) return { error: "Target ACH50 must be positive." };
  const ach50 = cfm50 * 60 / volume_ft3;
  const pass = ach50 <= target_ach50;
  const verdict = pass
    ? "PASS - meets the " + fmt(target_ach50, 1) + " ACH50 target"
    : "FAIL - exceeds the " + fmt(target_ach50, 1) + " ACH50 target; air-seal and retest";
  const ach_nat = ach50 / n_factor;
  const cfm_nat = ach_nat * volume_ft3 / 60;
  return {
    ach50, pass, verdict, ach_nat, cfm_nat,
    note: "ACH50 = CFM50 x 60 / conditioned volume normalizes the blower-door reading to air changes per hour at 50 Pa; the IECC R402.4.1.2 limit is <= 3 ACH50 in climate zones 3-8 and <= 5 in zones 1-2 (the editable target). The natural air change divides ACH50 by the LBL N-factor (default 17), which depends on climate zone, building height, and wind shielding - a sheltered one-story and an exposed three-story differ by roughly a factor of two. Volume is the conditioned volume, not the floor area. A field normalization, not a rater's signed test report. ASTM E779 / E1827 are the test methods.",
  };
}
const blowerDoorAch50Example = { inputs: { cfm50: 960, volume_ft3: 12800, n_factor: 17, target_ach50: 3 } };
HVACSERVICE_RENDERERS["blower-door-ach50"] = _simpleRenderer({
  citation: "Citation: ACH50 = CFM50 x 60 / conditioned volume (the blower-door normalization) and the LBL natural-infiltration divide-by-N rule (by name); IECC R402.4.1.2 sets the air-leakage limit in ACH50 (<= 3 in CZ 3-8, <= 5 in CZ 1-2); ASTM E779 / E1827 are the test methods. The N-factor varies with climate zone, building height, and wind shielding. A field normalization, not a rater's signed report.",
  example: blowerDoorAch50Example.inputs,
  fields: [
    { key: "cfm50", label: "Blower-door reading CFM50 (cfm)", kind: "number" },
    { key: "volume_ft3", label: "Conditioned volume (ft^3)", kind: "number" },
    { key: "n_factor", label: "LBL N-factor (ACH50 -> natural)", kind: "number", default: 17 },
    { key: "target_ach50", label: "Target ACH50 (IECC limit)", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "a", id: "bda-out-a", label: "ACH50", value: (r) => fmt(r.ach50, 2) + " ACH50" },
    { key: "v", id: "bda-out-v", label: "Code check", value: (r) => r.verdict },
    { key: "n", id: "bda-out-n", label: "Natural air change", value: (r) => fmt(r.ach_nat, 3) + " ACH" },
    { key: "c", id: "bda-out-c", label: "Natural infiltration", value: (r) => fmt(r.cfm_nat, 1) + " cfm" },
    { key: "z", id: "bda-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlowerDoorAch50,
});

// ===================== spec-v219: ASHRAE 62.2 whole-house ventilation =====================

// dims: in { floor_area_ft2: L^2, bedrooms: dimensionless, infil_credit_cfm: L^3 T^-1 } out: { q_tot: L^3 T^-1, q_fan: L^3 T^-1 }
export function computeAshrae622Ventilation({ floor_area_ft2 = 0, bedrooms = 0, infil_credit_cfm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(floor_area_ft2 > 0)) return { error: "Conditioned floor area must be positive (ft^2)." };
  if (bedrooms < 0) return { error: "Bedroom count cannot be negative." };
  if (infil_credit_cfm < 0) return { error: "Infiltration credit cannot be negative (cfm)." };
  const q_tot = 0.03 * floor_area_ft2 + 7.5 * (bedrooms + 1);
  const q_fan = Math.max(0, q_tot - infil_credit_cfm);
  const verdict = q_fan > 0
    ? "Continuous whole-house fan required: " + fmt(q_fan, 0) + " cfm"
    : "Infiltration credit meets Qtot - no continuous fan required by 62.2";
  return {
    q_tot, q_fan, verdict,
    note: "ASHRAE 62.2-2019 Eq. 4.1a: Qtot = 0.03 x CFA + 7.5 x (Nbr + 1) sets the total required ventilation from floor area and bedrooms only (occupants assumed Nbr + 1); the fan flow is Qtot minus the infiltration credit. The conservative default is zero credit - size the fan to the full Qtot. The credit comes from the measured air-tightness (the blower-door natural infiltration) per the 62.2 infiltration method. Local kitchen and bath exhaust is a separate 62.2 requirement this tile does not cover. A sizing aid, not a 62.2 compliance certificate.",
  };
}
const ashrae622VentilationExample = { inputs: { floor_area_ft2: 2000, bedrooms: 3, infil_credit_cfm: 0 } };
HVACSERVICE_RENDERERS["ashrae-622-ventilation"] = _simpleRenderer({
  citation: "Citation: ASHRAE 62.2-2019 §4.1 whole-house ventilation Qtot = 0.03 x Afloor + 7.5 x (Nbr + 1), and the fan flow Qfan = Qtot - Qinf (by name). The infiltration credit comes from the measured air-tightness; the conservative default is zero credit. Local kitchen/bath exhaust is a separate 62.2 requirement. A sizing aid, not a compliance certificate.",
  example: ashrae622VentilationExample.inputs,
  fields: [
    { key: "floor_area_ft2", label: "Conditioned floor area (ft^2)", kind: "number" },
    { key: "bedrooms", label: "Bedrooms (Nbr)", kind: "number" },
    { key: "infil_credit_cfm", label: "Infiltration credit Qinf (cfm)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "t", id: "a62-out-t", label: "Total required Qtot", value: (r) => fmt(r.q_tot, 1) + " cfm" },
    { key: "f", id: "a62-out-f", label: "Continuous fan Qfan", value: (r) => fmt(r.q_fan, 1) + " cfm" },
    { key: "v", id: "a62-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "a62-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAshrae622Ventilation,
});

// ===================== spec-v220: infiltration heating / cooling load =====================

// dims: in { cfm: L^3 T^-1, delta_t_f: T, delta_gr: dimensionless } out: { q_sensible: M L^2 T^-3, q_latent: M L^2 T^-3, q_total: M L^2 T^-3 }
export function computeInfiltrationLoad({ cfm = 0, delta_t_f = 0, delta_gr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cfm > 0)) return { error: "Infiltration airflow must be positive (cfm)." };
  if (delta_gr < 0) return { error: "Humidity-ratio difference cannot be negative (grains/lb)." };
  const q_sensible = 1.08 * cfm * delta_t_f;
  const q_latent = 0.68 * cfm * delta_gr;
  const q_total = q_sensible + q_latent;
  return {
    q_sensible, q_latent, q_total,
    note: "ASHRAE air-side equations: sensible Qs = 1.08 x CFM x delta-T and latent Ql = 0.68 x CFM x delta-grains. The 1.08 and 0.68 are sea-level standard-air constants (an altitude correction is a separate adjustment). The airflow is the natural infiltration from a blower-door test or a design estimate; enter the design dry-bulb difference and, for cooling, the indoor-outdoor humidity-ratio difference in grains/lb (zero for a heating load, so the latent term drops out). This is the infiltration component only - envelope conduction, solar, and internal gains are separate Manual J line items. A design-load aid, not a stamped Manual J.",
  };
}
const infiltrationLoadExample = { inputs: { cfm: 56.5, delta_t_f: 70, delta_gr: 0 } };
HVACSERVICE_RENDERERS["infiltration-load"] = _simpleRenderer({
  citation: "Citation: ASHRAE Handbook of Fundamentals air-side sensible Qs = 1.08 x CFM x delta-T and latent Ql = 0.68 x CFM x delta-grains (by name). The 1.08 and 0.68 are sea-level standard-air constants. The airflow is the natural infiltration from a blower-door test or a design estimate. The infiltration component of the load only, not a stamped Manual J.",
  example: infiltrationLoadExample.inputs,
  fields: [
    { key: "cfm", label: "Infiltration airflow (cfm)", kind: "number" },
    { key: "delta_t_f", label: "Design indoor-outdoor delta-T (F)", kind: "number" },
    { key: "delta_gr", label: "Humidity-ratio diff (grains/lb)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "s", id: "ifl-out-s", label: "Sensible load", value: (r) => fmt(r.q_sensible, 0) + " Btu/h" },
    { key: "l", id: "ifl-out-l", label: "Latent load", value: (r) => fmt(r.q_latent, 0) + " Btu/h" },
    { key: "t", id: "ifl-out-t", label: "Total infiltration load", value: (r) => fmt(r.q_total, 0) + " Btu/h" },
    { key: "n", id: "ifl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInfiltrationLoad,
});

// ===================== spec-v386: measured outside-air percent from mixed-air temperatures =====================

// dims: in { t_ra_f: T, t_ma_f: T, t_oa_f: T } out: { pct_oa: dimensionless }
export function computeOutsideAirPercentTemps({ t_ra_f = 0, t_ma_f = 0, t_oa_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ra = Number(t_ra_f), ma = Number(t_ma_f), oa = Number(t_oa_f);
  if (ra === oa) return { error: "Return and outdoor temperatures must differ (zero denominator)." };
  const lo = Math.min(ra, oa), hi = Math.max(ra, oa);
  if (ma < lo || ma > hi) return { error: "Mixed-air temperature is outside the return/outdoor band -- check the sensor or the reading." };
  const pct_oa = 100 * (ra - ma) / (ra - oa);
  const low_spread = Math.abs(ra - oa) < 10;
  return {
    pct_oa, low_spread,
    note: "Measured outside-air fraction from a mixed-air temperature balance: %OA = 100 (T_ra - T_ma) / (T_ra - T_oa). The mixed-air temperature is the flow-weighted blend of return and outside air, so its position between the two reads the damper's actual outside-air fraction - the field check against the design minimum ventilation. Use well-mixed, shielded dry-bulb readings; a return-to-outdoor spread under about 10 F makes the result sensitive to sensor error. A field aid; a direct airflow measurement is more reliable.",
  };
}
const outsideAirPercentTempsExample = { inputs: { t_ra_f: 75, t_ma_f: 68, t_oa_f: 40 } };
HVACSERVICE_RENDERERS["outside-air-percent-temps"] = _simpleRenderer({
  citation: "Citation: The mixed-air temperature balance %OA = 100 (T_ra - T_ma) / (T_ra - T_oa) (ASHRAE / AABC-NEBB field practice), the standard field check of the outside-air damper fraction against the design minimum. Needs well-mixed, shielded dry-bulb readings; a small return-to-outdoor spread (under ~10 F) makes it sensitive to sensor error. A field aid, not a substitute for a direct airflow measurement.",
  example: outsideAirPercentTempsExample.inputs,
  fields: [
    { key: "t_ra_f", label: "Return-air temperature T_ra (F)", kind: "number", default: 75 },
    { key: "t_ma_f", label: "Mixed-air temperature T_ma (F)", kind: "number", default: 68 },
    { key: "t_oa_f", label: "Outdoor-air temperature T_oa (F)", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "pct", id: "oapt-out-pct", label: "Outside-air fraction", value: (r) => fmt(r.pct_oa, 1) + "% OA" },
    { key: "rel", id: "oapt-out-rel", label: "Reliability", value: (r) => r.low_spread ? "LOW SPREAD (< 10 F return-to-outdoor; sensitive to sensor error)" : "adequate temperature spread" },
    { key: "n", id: "oapt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOutsideAirPercentTemps,
});
