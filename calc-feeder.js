// Group A: feeder and transformer-conductor overcurrent sizing (spec-v26 part I).
//
// spec-v72 cap-relief split: the two spec-v26 electrical tiles
// (motor-feeder-multiple, transformer-conductor-protection) were extracted
// verbatim from calc-electrical.js (which sat at 96.7% of its size cap) into
// this module. Both tiles KEEP group "A" -- a tile's group letter is
// independent of the module that holds it (the v28/v30/v36/v39/v70/v71
// precedent). Their ids, citations, worked examples, dimensional annotations,
// and behavior are byte-for-byte unchanged. Lazy-loaded on first open of one
// of its tiles, so it is not in the home-view first-paint payload.

import {
  makeNumber as _v26makeNumber, makeSelect as _v26makeSelect, makeTextarea as _v26makeTextarea,
  makeOutputLine as _v26makeOut, attachExampleButton as _v26attachEx,
  debounce as _v26debounce, DEBOUNCE_MS as _V26_DEB, fmt as _v26fmt,
} from "./ui-fields.js";

// v18 §7 contract guard (copied per-module; non-exported, no derivation-corpus row).
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

export const FEEDER_RENDERERS = {};

// =====================================================================
// spec-v26 Part I - Group A: Electrical (2 tiles)
// Feeder for multiple motors (NEC 430.24 / 430.62) and transformer
// conductor + overcurrent protection (NEC 450.3(B) / 240.21(C)).
// =====================================================================

// NEC 240.6(A) standard overcurrent device ampere ratings.
const _V26_STD_OCPD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
function _v26StdDown(x) { let best = null; for (const s of _V26_STD_OCPD) { if (s <= x) best = s; } return best; }
function _v26StdUp(x) { for (const s of _V26_STD_OCPD) { if (s >= x) return s; } return null; }

// dims: in { motors: dimensionless, nonmotor_continuous_A: I, nonmotor_noncontinuous_A: I } out: { conductor_min_A: I, feeder_ocpd_max_A: I }
export function computeMotorFeederMultiple({ motors = [], nonmotor_continuous_A = 0, nonmotor_noncontinuous_A = 0 } = {}) {
  const _g = _finiteGuard({ nonmotor_continuous_A, nonmotor_noncontinuous_A }); if (_g) return _g;
  if (!Array.isArray(motors) || motors.length === 0) return { error: "Enter at least one motor (FLC and branch-device rating)." };
  const list = [];
  for (const m of motors) {
    const flc = Number(m && m.flc_A);
    const dev = Number(m && m.branch_device_A);
    if (!Number.isFinite(flc) || !(flc > 0)) return { error: "Each motor needs a positive table FLC (A)." };
    if (!Number.isFinite(dev) || !(dev > 0)) return { error: "Each motor needs a positive branch-circuit device rating (A)." };
    list.push({ flc, dev });
  }
  const nmC = Number(nonmotor_continuous_A) || 0;
  const nmN = Number(nonmotor_noncontinuous_A) || 0;
  if (nmC < 0 || nmN < 0) return { error: "Non-motor loads must be non-negative." };
  const nonmotor_load_A = nmC * 1.25 + nmN; // 125% of continuous per 215.2/215.3

  const sumFlc = list.reduce((a, m) => a + m.flc, 0);

  // 430.24 feeder conductor: 125% of the largest-FLC motor + 100% of the rest + non-motor.
  let largestFlc = list[0];
  for (const m of list) { if (m.flc > largestFlc.flc || (m.flc === largestFlc.flc && m.dev > largestFlc.dev)) largestFlc = m; }
  const conductor_min_A = 1.25 * largestFlc.flc + (sumFlc - largestFlc.flc) + nonmotor_load_A;

  // 430.62 feeder protection: largest branch device + FLC of the other motors + non-motor.
  let largestDev = list[0];
  for (const m of list) { if (m.dev > largestDev.dev || (m.dev === largestDev.dev && m.flc > largestDev.flc)) largestDev = m; }
  const feeder_ocpd_raw_A = largestDev.dev + (sumFlc - largestDev.flc) + nonmotor_load_A;
  // 430.62 does NOT round up; take the next-smaller standard size where the sum is not a standard rating.
  const isStd = _V26_STD_OCPD.includes(feeder_ocpd_raw_A);
  const feeder_ocpd_max_A = isStd ? feeder_ocpd_raw_A : _v26StdDown(feeder_ocpd_raw_A);

  const notes = [];
  if (!isStd) notes.push("430.62 feeder device is a maximum, not rounded up: " + _v26fmt(feeder_ocpd_raw_A, 1) + " A is not a standard rating, so the next size down (" + feeder_ocpd_max_A + " A) is used.");
  if (largestFlc !== largestDev) notes.push("The largest-FLC motor (drives the 125% conductor term) differs from the motor with the largest branch device (drives the 430.62 protection term).");
  notes.push("Table FLC (NEC 430.6(A)), not nameplate FLA, governs this sizing. The AHJ-adopted NEC edition governs.");

  return {
    motor_count: list.length,
    sum_flc_A: sumFlc,
    largest_motor_flc_A: largestFlc.flc,
    largest_branch_device_A: largestDev.dev,
    nonmotor_load_A,
    conductor_min_A,
    feeder_ocpd_raw_A,
    feeder_ocpd_max_A,
    notes,
  };
}

export const motorFeederMultipleExample = {
  inputs: { motors: [{ flc_A: 28, branch_device_A: 40 }, { flc_A: 16, branch_device_A: 25 }, { flc_A: 10, branch_device_A: 15 }], nonmotor_continuous_A: 0, nonmotor_noncontinuous_A: 0 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderMotorFeederMultiple(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Feeder conductor and feeder overcurrent sizing for several motors on one feeder, per NEC 430.24 (conductor: 125% of the largest motor plus 100% of the rest) and NEC 430.62 (protection: the largest branch device plus the other motors' FLC), by name. Table FLC (not nameplate FLA) is used for this sizing per 430.6(A). The AHJ-adopted NEC edition governs. Free at nfpa.org/freeaccess.";
  const DEFAULT = "28,40\n16,25\n10,15";
  const list = _v26makeTextarea("Motors, one per line as FLC,branch-device (A)", "mfm-list", { rows: "4" });
  list.input.value = DEFAULT;
  const nmC = _v26makeNumber("Non-motor continuous load (A, optional)", "mfm-nmc", { step: "any", min: "0" });
  const nmN = _v26makeNumber("Non-motor non-continuous load (A, optional)", "mfm-nmn", { step: "any", min: "0" });
  for (const f of [list, nmC, nmN]) inputRegion.appendChild(f.wrap);
  _v26attachEx(inputRegion, () => { list.input.value = DEFAULT; nmC.input.value = ""; nmN.input.value = ""; update(); });

  const oCond = _v26makeOut(outputRegion, "Min feeder conductor ampacity (A)", "mfm-out-cond");
  const oDev = _v26makeOut(outputRegion, "Max feeder device (A)", "mfm-out-dev");
  const oLargest = _v26makeOut(outputRegion, "Largest motor / device", "mfm-out-large");
  const oNote = _v26makeOut(outputRegion, "Notes", "mfm-out-note");

  function parseMotors(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(",").map((s) => Number(s.trim()));
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
      out.push({ flc_A: parts[0], branch_device_A: parts[1] });
    }
    return out;
  }
  const update = _v26debounce(() => {
    const motors = parseMotors(list.input.value);
    if (motors === null) { oCond.textContent = "Each line must be FLC,device with finite numbers."; oDev.textContent = "-"; oLargest.textContent = "-"; oNote.textContent = ""; return; }
    const r = computeMotorFeederMultiple({ motors, nonmotor_continuous_A: Number(nmC.input.value) || 0, nonmotor_noncontinuous_A: Number(nmN.input.value) || 0 });
    if (r.error) { oCond.textContent = r.error; oDev.textContent = "-"; oLargest.textContent = "-"; oNote.textContent = ""; return; }
    oCond.textContent = _v26fmt(r.conductor_min_A, 1) + " A";
    oDev.textContent = r.feeder_ocpd_max_A + " A (raw max " + _v26fmt(r.feeder_ocpd_raw_A, 1) + " A)";
    oLargest.textContent = "largest FLC " + _v26fmt(r.largest_motor_flc_A, 1) + " A; largest branch device " + r.largest_branch_device_A + " A; " + r.motor_count + " motors, ΣFLC " + _v26fmt(r.sum_flc_A, 1) + " A";
    oNote.textContent = r.notes.join(" ");
  }, _V26_DEB);
  for (const f of [list.input, nmC.input, nmN.input]) f.addEventListener("input", update);
}
FEEDER_RENDERERS["motor-feeder-multiple"] = _v26renderMotorFeederMultiple;

// dims: in { kva: dimensionless, primary_v: dimensionless, secondary_v: dimensionless, phase: dimensionless } out: { primary_fla_A: I, secondary_fla_A: I, primary_ocpd_max_A: I, secondary_ocpd_max_A: I, secondary_conductor_min_A: I }
export function computeTransformerConductorProtection({ kva = 0, primary_v = 0, secondary_v = 0, phase = 3, secondary_protection = false } = {}) {
  const _g = _finiteGuard({ kva, primary_v, secondary_v }); if (_g) return _g;
  const KVA = Number(kva) || 0;
  const VP = Number(primary_v) || 0;
  const VS = Number(secondary_v) || 0;
  const PH = Number(phase);
  if (!(KVA > 0)) return { error: "kVA must be positive." };
  if (!(VP > 0)) return { error: "Primary voltage must be positive." };
  if (!(VS > 0)) return { error: "Secondary voltage must be positive." };
  if (PH !== 1 && PH !== 3) return { error: "Phase must be 1 or 3." };

  const f = PH === 1 ? 1 : Math.sqrt(3);
  const primary_fla_A = (KVA * 1000) / (f * VP);
  const secondary_fla_A = (KVA * 1000) / (f * VS);

  // NEC Table 450.3(B), transformers 1000 V and less.
  // Primary multiplier and whether Note 1 (next-higher standard size) applies.
  function primaryBand(I, secProtected) {
    if (secProtected) return { pct: 2.50, roundUp: false, label: "250% (primary, with secondary protection)" };
    if (I >= 9) return { pct: 1.25, roundUp: true, label: "125% (primary only, current >= 9 A)" };
    if (I >= 2) return { pct: 1.67, roundUp: false, label: "167% (primary only, 2 A <= current < 9 A)" };
    return { pct: 3.00, roundUp: false, label: "300% (primary only, current < 2 A)" };
  }
  function secondaryBand(I) {
    if (I >= 9) return { pct: 1.25, roundUp: true, label: "125% (secondary, current >= 9 A)" };
    return { pct: 1.67, roundUp: false, label: "167% (secondary, current < 9 A)" };
  }

  const pb = primaryBand(primary_fla_A, !!secondary_protection);
  const primary_raw_A = pb.pct * primary_fla_A;
  // Note 1 lets the 125% case go to the next higher standard size; the
  // 167%/250%/300% values are maxima (next size down / not exceeded).
  const primary_ocpd_max_A = pb.roundUp
    ? (_V26_STD_OCPD.includes(primary_raw_A) ? primary_raw_A : _v26StdUp(primary_raw_A))
    : (_V26_STD_OCPD.includes(primary_raw_A) ? primary_raw_A : _v26StdDown(primary_raw_A));

  let secondary_ocpd_max_A = null, sb = null, secondary_raw_A = null;
  if (secondary_protection) {
    sb = secondaryBand(secondary_fla_A);
    secondary_raw_A = sb.pct * secondary_fla_A;
    secondary_ocpd_max_A = sb.roundUp
      ? (_V26_STD_OCPD.includes(secondary_raw_A) ? secondary_raw_A : _v26StdUp(secondary_raw_A))
      : (_V26_STD_OCPD.includes(secondary_raw_A) ? secondary_raw_A : _v26StdDown(secondary_raw_A));
  }

  // 240.21(C): the secondary tap conductor must carry at least the secondary current.
  const secondary_conductor_min_A = secondary_fla_A;

  const notes = [];
  notes.push("Primary band: " + pb.label + (pb.roundUp ? " (Note 1: next higher standard size permitted)." : " (a maximum; not rounded up)."));
  if (secondary_protection && sb) notes.push("Secondary band: " + sb.label + (sb.roundUp ? " (Note 1 applies)." : " (a maximum)."));
  notes.push("Secondary conductor per NEC 240.21(C): ampacity >= secondary FLA for the tap length used. Computational aid for the <= 1000 V case; the AHJ-adopted NEC edition and the design engineer govern. Inrush/point-of-supply coordination is not modeled.");

  return {
    phase: PH,
    primary_fla_A,
    secondary_fla_A,
    primary_band: pb.label,
    primary_ocpd_max_A,
    secondary_protection: !!secondary_protection,
    secondary_band: sb ? sb.label : null,
    secondary_ocpd_max_A,
    secondary_conductor_min_A,
    notes,
  };
}

export const transformerConductorProtectionExample = {
  inputs: { kva: 45, primary_v: 480, secondary_v: 208, phase: 3, secondary_protection: false },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderTransformerConductorProtection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Transformer primary/secondary full-load current and the overcurrent-protection maxima per NEC Table 450.3(B), with the secondary-conductor tap rules of NEC 240.21(C), by name. A computational aid for the <= 1000 V case; the AHJ-adopted NEC edition and the design engineer govern. Free at nfpa.org/freeaccess.";
  const kva = _v26makeNumber("Transformer kVA", "tcp-kva", { step: "any", min: "0" });
  const vp = _v26makeNumber("Primary voltage (V)", "tcp-vp", { step: "any", min: "0" });
  const vs = _v26makeNumber("Secondary voltage (V)", "tcp-vs", { step: "any", min: "0" });
  const ph = _v26makeSelect("Phase", "tcp-ph", [
    { value: "3", label: "Three-phase", selected: true },
    { value: "1", label: "Single-phase" },
  ]);
  const sp = _v26makeSelect("Protection provided", "tcp-sp", [
    { value: "primary", label: "Primary only", selected: true },
    { value: "both", label: "Primary and secondary" },
  ]);
  for (const f of [kva, vp, vs, ph, sp]) inputRegion.appendChild(f.wrap);
  _v26attachEx(inputRegion, () => { kva.input.value = "45"; vp.input.value = "480"; vs.input.value = "208"; ph.select.value = "3"; sp.select.value = "primary"; update(); });

  const oP = _v26makeOut(outputRegion, "Primary FLA (A)", "tcp-out-p");
  const oS = _v26makeOut(outputRegion, "Secondary FLA (A)", "tcp-out-s");
  const oPO = _v26makeOut(outputRegion, "Max primary device (A)", "tcp-out-po");
  const oSO = _v26makeOut(outputRegion, "Max secondary device (A)", "tcp-out-so");
  const oSC = _v26makeOut(outputRegion, "Min secondary conductor (A)", "tcp-out-sc");
  const oNote = _v26makeOut(outputRegion, "Notes", "tcp-out-note");

  const update = _v26debounce(() => {
    const r = computeTransformerConductorProtection({
      kva: Number(kva.input.value) || 0,
      primary_v: Number(vp.input.value) || 0,
      secondary_v: Number(vs.input.value) || 0,
      phase: Number(ph.select.value),
      secondary_protection: sp.select.value === "both",
    });
    if (r.error) { oP.textContent = r.error; oS.textContent = "-"; oPO.textContent = "-"; oSO.textContent = "-"; oSC.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = _v26fmt(r.primary_fla_A, 2) + " A";
    oS.textContent = _v26fmt(r.secondary_fla_A, 2) + " A";
    oPO.textContent = r.primary_ocpd_max_A + " A - " + r.primary_band;
    oSO.textContent = r.secondary_protection ? (r.secondary_ocpd_max_A + " A - " + r.secondary_band) : "(primary-only: no secondary device)";
    oSC.textContent = _v26fmt(r.secondary_conductor_min_A, 2) + " A";
    oNote.textContent = r.notes.join(" ");
  }, _V26_DEB);
  for (const f of [kva.input, vp.input, vs.input]) f.addEventListener("input", update);
  for (const f of [ph.select, sp.select]) f.addEventListener("change", update);
}
FEEDER_RENDERERS["transformer-conductor-protection"] = _v26renderTransformerConductorProtection;

// =====================================================================
// spec-v164 - Group A: Electrical (1 tile)
// Feeder tap conductor 10-ft / 25-ft rule (NEC 240.21(B)(1)/(B)(2)).
// =====================================================================

// dims: in { feeder_ocpd_a: I, tap_length_ft: L, tap_ampacity_a: I } out: { min_tap_ampacity_a: I, margin_a: I }
export function computeFeederTapRule({ feeder_ocpd_a = 0, tap_length_ft = 0, tap_ampacity_a = 0 } = {}) {
  const _g = _finiteGuard({ feeder_ocpd_a, tap_length_ft, tap_ampacity_a }); if (_g) return _g;
  const ocpd = Number(feeder_ocpd_a) || 0;
  const len = Number(tap_length_ft) || 0;
  const amp = Number(tap_ampacity_a) || 0;
  if (!(ocpd > 0)) return { error: "Feeder OCPD rating must be positive." };
  if (!(len > 0)) return { error: "Tap length must be positive." };
  if (!(amp > 0)) return { error: "Tap conductor ampacity must be positive." };

  let rule, min_fraction, within;
  if (len <= 10) { rule = "10-ft tap (240.21(B)(1))"; min_fraction = 0.10; within = true; }
  else if (len <= 25) { rule = "25-ft tap (240.21(B)(2))"; min_fraction = 1 / 3; within = true; }
  else { rule = "neither short-tap rule applies"; min_fraction = null; within = false; }

  const notes = [];
  if (within) {
    notes.push("240.21(B) also requires: the tap conductor is protected from physical damage; for the 25-ft rule it terminates in a single OCPD rated no more than the tap ampacity; and the tap is rated at least the load it supplies.");
  } else {
    notes.push("The tap is longer than 25 ft, so neither short-tap rule (B)(1)/(B)(2) applies. Use 240.21(B)(3) (feeder tap, transformer), (B)(5) (outside taps), or protect the tap at its supply end.");
  }
  notes.push("Tap ampacity is the 75 C column value for the conductor. A computational aid for the <= 1000 V case; the AHJ-adopted NEC edition and the design engineer govern.");

  if (!within) {
    return {
      rule, within_short_tap_rule: false, min_fraction: null,
      min_tap_ampacity_a: null, tap_ampacity_a: amp, margin_a: null,
      acceptable: false, notes,
    };
  }
  const min_tap_ampacity_a = ocpd * min_fraction;
  const margin_a = amp - min_tap_ampacity_a;
  const acceptable = amp >= min_tap_ampacity_a;
  return {
    rule, within_short_tap_rule: true, min_fraction,
    min_tap_ampacity_a, tap_ampacity_a: amp, margin_a, acceptable, notes,
  };
}

export const feederTapRuleExample = {
  inputs: { feeder_ocpd_a: 400, tap_length_ft: 22, tap_ampacity_a: 150 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v164renderFeederTapRule(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Minimum feeder tap conductor ampacity under the 10-ft and 25-ft tap rules of NEC 240.21(B)(1) and (B)(2), by name: the tap must carry at least 1/10 (10 ft) or 1/3 (25 ft) of the feeder overcurrent device rating. A computational aid for the <= 1000 V case; the AHJ-adopted NEC edition and the design engineer govern, and the other conditions of 240.21(B) apply. Free at nfpa.org/freeaccess.";
  const ocpd = _v26makeNumber("Feeder OCPD rating (A)", "ftr-ocpd", { step: "any", min: "0" });
  const len = _v26makeNumber("Tap length (ft)", "ftr-len", { step: "any", min: "0" });
  const amp = _v26makeNumber("Proposed tap conductor ampacity (A, 75 C)", "ftr-amp", { step: "any", min: "0" });
  for (const f of [ocpd, len, amp]) inputRegion.appendChild(f.wrap);
  _v26attachEx(inputRegion, () => { ocpd.input.value = "400"; len.input.value = "22"; amp.input.value = "150"; update(); });

  const oRule = _v26makeOut(outputRegion, "Applicable rule", "ftr-out-rule");
  const oMin = _v26makeOut(outputRegion, "Minimum tap ampacity (A)", "ftr-out-min");
  const oVerdict = _v26makeOut(outputRegion, "Verdict", "ftr-out-verdict");
  const oNote = _v26makeOut(outputRegion, "Notes", "ftr-out-note");

  const update = _v26debounce(() => {
    const r = computeFeederTapRule({
      feeder_ocpd_a: Number(ocpd.input.value) || 0,
      tap_length_ft: Number(len.input.value) || 0,
      tap_ampacity_a: Number(amp.input.value) || 0,
    });
    if (r.error) { oRule.textContent = r.error; oMin.textContent = "-"; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    oRule.textContent = r.rule;
    if (!r.within_short_tap_rule) {
      oMin.textContent = "(no short-tap minimum applies)";
      oVerdict.textContent = "Outside the 10-ft and 25-ft rules - re-route, shorten, or protect the tap.";
    } else {
      oMin.textContent = _v26fmt(r.min_tap_ampacity_a, 1) + " A (feeder OCPD x " + (r.min_fraction === 0.1 ? "1/10" : "1/3") + ")";
      oVerdict.textContent = r.acceptable
        ? "Acceptable: tap " + _v26fmt(r.tap_ampacity_a, 0) + " A clears the " + _v26fmt(r.min_tap_ampacity_a, 1) + " A minimum (margin " + _v26fmt(r.margin_a, 1) + " A)."
        : "Undersized: tap " + _v26fmt(r.tap_ampacity_a, 0) + " A is below the " + _v26fmt(r.min_tap_ampacity_a, 1) + " A minimum (short " + _v26fmt(-r.margin_a, 1) + " A).";
    }
    oNote.textContent = r.notes.join(" ");
  }, _V26_DEB);
  for (const f of [ocpd.input, len.input, amp.input]) f.addEventListener("input", update);
}
FEEDER_RENDERERS["feeder-tap-rule"] = _v164renderFeederTapRule;

// =====================================================================
// spec-v280: continuous-load OCPD and conductor at 125% (NEC 210.20 /
// 215.3), Group A. The most-reused NEC sizing step as a standalone tile:
// A_min = 1.25 x continuous + noncontinuous (1.00 x for a 100%-rated
// assembly), device from the 240.6(A) standard ratings (ordered array,
// smallest first).
// =====================================================================
const _CLO_STD_240_6 = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];

// dims: in { l_cont_A: I, l_noncont_A: I, rated_100: dimensionless } out: { A_min: I, ocpd_A: I, mult: dimensionless }
export function computeContinuousLoadOcpd({ l_cont_A = 0, l_noncont_A = 0, rated_100 = false } = {}) {
  const _g = _finiteGuard({ l_cont_A, l_noncont_A }); if (_g) return _g;
  if (l_cont_A < 0 || l_noncont_A < 0) return { error: "Loads cannot be negative (A)." };
  if (!(l_cont_A + l_noncont_A > 0)) return { error: "Total load must be positive (A)." };
  const mult = rated_100 ? 1.00 : 1.25;
  const A_min = mult * l_cont_A + l_noncont_A;
  let ocpd_A = null;
  for (const s of _CLO_STD_240_6) {
    if (s >= A_min) { ocpd_A = s; break; }
  }
  if (ocpd_A === null) return { error: "The minimum rating exceeds the 240.6(A) standard sizes this tile carries (to 6000 A)." };
  return {
    mult, A_min, ocpd_A,
    note: "NEC 210.20(A) (branch) / 215.3 (feeder): the overcurrent device is rated not less than 125% of the continuous load (a load at its maximum for 3 hours or more) plus 100% of the noncontinuous load, and 210.19(A)/215.2(A) require the conductor (before ampacity adjustment) to carry the same sum; the device is the smallest 240.6(A) standard rating at or above it. Where the device and assembly are listed for 100% continuous operation, the 1.25 factor drops. No ambient/fill adjustment, no 110.14(C) termination limit, no 240.4(B) next-size-up conductor allowance, and equipment-specific rules (motor 430, HVAC 440, welder 630) are separate. A design aid; the AHJ governs.",
  };
}
export const continuousLoadOcpdExample = { inputs: { l_cont_A: 40, l_noncont_A: 20, rated_100: false } };

function _v280renderContinuousLoadOcpd(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 210.20(A) / 215.3 overcurrent and 210.19(A) / 215.2(A) conductor rule (A_min = 1.25 x continuous + noncontinuous; 1.00 x for a 100%-rated assembly), device from the 240.6(A) standard ratings, by name. Before ampacity adjustment; equipment-specific rules are separate. The AHJ governs.";
  const lc = _v26makeNumber("Continuous load (A, on 3 hours or more)", "clo-cont", { step: "any", min: "0" });
  const ln = _v26makeNumber("Noncontinuous load (A)", "clo-noncont", { step: "any", min: "0" });
  const rated = _v26makeSelect("Device and assembly rating", "clo-rated", [
    { value: "no", label: "Standard (80%-rated) - 125% factor" },
    { value: "yes", label: "Listed 100%-rated assembly" },
  ]);
  inputRegion.appendChild(lc.wrap);
  inputRegion.appendChild(ln.wrap);
  inputRegion.appendChild(rated.wrap);
  _v26attachEx(inputRegion, () => { lc.input.value = "40"; ln.input.value = "20"; rated.select.value = "no"; update(); });
  const oMin = _v26makeOut(outputRegion, "Minimum OCPD and conductor ampacity", "clo-out-min");
  const oDev = _v26makeOut(outputRegion, "Overcurrent device (240.6(A))", "clo-out-dev");
  const oNote = _v26makeOut(outputRegion, "Note", "clo-out-note");
  const update = _v26debounce(() => {
    const r = computeContinuousLoadOcpd({ l_cont_A: Number(lc.input.value) || 0, l_noncont_A: Number(ln.input.value) || 0, rated_100: rated.select.value === "yes" });
    if (r.error) { oMin.textContent = r.error; oDev.textContent = "-"; oNote.textContent = "-"; return; }
    oMin.textContent = _v26fmt(r.A_min, 1) + " A (" + _v26fmt(r.mult * 100, 0) + "% of continuous + 100% of noncontinuous)";
    oDev.textContent = _v26fmt(r.ocpd_A, 0) + " A";
    oNote.textContent = r.note;
  }, _V26_DEB);
  lc.input.addEventListener("input", update);
  ln.input.addEventListener("input", update);
  rated.select.addEventListener("change", update);
}
FEEDER_RENDERERS["continuous-load-ocpd"] = _v280renderContinuousLoadOcpd;

// ===================== spec-v493: generator output conductor at 115% (NEC 445.13) =====================

// dims: in { nameplate_current_a: I, gen_kw: M L^2 T^-3, voltage_v: M L^2 T^-3 I^-1, phase: dimensionless, power_factor: dimensionless, overload_limited: dimensionless } out: { nameplate_a: I, basis: dimensionless, required_ampacity_a: I }
export function computeGeneratorConductor445({ nameplate_current_a = 0, gen_kw = 0, voltage_v = 0, phase = 3, power_factor = 0.8, overload_limited = false } = {}) {
  const _g = _finiteGuard({ nameplate_current_a, gen_kw, voltage_v, power_factor }); if (_g) return _g;
  const npIn = Number(nameplate_current_a) || 0;
  const kw = Number(gen_kw) || 0;
  const v = Number(voltage_v) || 0;
  const ph = Number(phase) === 1 ? 1 : 3;
  const pf = Number(power_factor) || 0;
  let nameplate_a;
  if (npIn > 0) {
    nameplate_a = npIn;
  } else {
    if (!(kw > 0)) return { error: "Provide the nameplate current, or a positive generator kW to derive it." };
    if (!(v > 0)) return { error: "Voltage must be positive (V) to derive the nameplate current." };
    if (!(pf > 0 && pf <= 1)) return { error: "Power factor must be over 0 and at most 1." };
    nameplate_a = ph === 3 ? kw * 1000 / (Math.sqrt(3) * v * pf) : kw * 1000 / (v * pf);
  }
  if (!(nameplate_a > 0)) return { error: "Nameplate current must be positive (A)." };
  const basis = overload_limited ? 1.00 : 1.15;
  const required_ampacity_a = basis * nameplate_a;
  if (![nameplate_a, required_ampacity_a].every(Number.isFinite)) return { error: "Generator-conductor math is not a finite value." };
  return {
    nameplate_a, basis, required_ampacity_a,
    note: "NEC 445.13(A): the ampacity of generator output conductors (from the generator to its first overcurrent device) is not less than 115% of the generator nameplate current -- the nameplate, not 125% of a computed load and not the connected running load. Where the generator's design (overload protection, or an inherently overload-limited machine) prevents the output from exceeding the nameplate, the conductors may be sized at 100% of nameplate (the 445.13(A) exception). The conductor still must satisfy the 110.14(C) termination-temperature limit and any 310.15 ambient/fill adjustment, and neutral, tap, and AHJ provisions govern. A design aid, not the engineer of record.",
  };
}
export const generatorConductor445Example = { inputs: { nameplate_current_a: 0, gen_kw: 150, voltage_v: 480, phase: 3, power_factor: 0.8, overload_limited: false } };

function _v493renderGeneratorConductor445(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 445.13(A) generator output conductors: required ampacity = 115% of the generator nameplate current (100% where the design prevents output above nameplate). The basis is the nameplate, not 125% of a computed load. The 110.14(C) termination limit and 310.15 adjustments still apply. A design aid; the AHJ governs.";
  const np = _v26makeNumber("Nameplate current (A, 0 = derive from kW)", "gc4-np", { step: "any", min: "0" });
  const kw = _v26makeNumber("Generator real power (kW, used if nameplate is 0)", "gc4-kw", { step: "any", min: "0" });
  const v = _v26makeNumber("Voltage (V, line-to-line 3ph or line-to-neutral 1ph)", "gc4-v", { step: "any", min: "0" });
  const ph = _v26makeSelect("Phase", "gc4-ph", [
    { value: "3", label: "Three-phase", selected: true },
    { value: "1", label: "Single-phase" },
  ]);
  const pf = _v26makeNumber("Power factor", "gc4-pf", { step: "any", min: "0", max: "1" }); pf.input.value = "0.8";
  const ol = _v26makeSelect("Generator design", "gc4-ol", [
    { value: "no", label: "Standard - 115% of nameplate", selected: true },
    { value: "yes", label: "Overload-limited - 100% of nameplate" },
  ]);
  for (const f of [np, kw, v, ph, pf, ol]) inputRegion.appendChild(f.wrap);
  _v26attachEx(inputRegion, () => { np.input.value = "0"; kw.input.value = "150"; v.input.value = "480"; ph.select.value = "3"; pf.input.value = "0.8"; ol.select.value = "no"; update(); });
  const oNp = _v26makeOut(outputRegion, "Nameplate current", "gc4-out-np");
  const oBasis = _v26makeOut(outputRegion, "Applied basis", "gc4-out-basis");
  const oReq = _v26makeOut(outputRegion, "Required conductor ampacity", "gc4-out-req");
  const oNote = _v26makeOut(outputRegion, "Note", "gc4-out-note");
  const update = _v26debounce(() => {
    const r = computeGeneratorConductor445({ nameplate_current_a: Number(np.input.value) || 0, gen_kw: Number(kw.input.value) || 0, voltage_v: Number(v.input.value) || 0, phase: Number(ph.select.value), power_factor: pf.input.value === "" ? 0.8 : Number(pf.input.value), overload_limited: ol.select.value === "yes" });
    if (r.error) { oNp.textContent = r.error; oBasis.textContent = "-"; oReq.textContent = "-"; oNote.textContent = "-"; return; }
    oNp.textContent = _v26fmt(r.nameplate_a, 1) + " A";
    oBasis.textContent = _v26fmt(r.basis * 100, 0) + "% of nameplate";
    oReq.textContent = _v26fmt(r.required_ampacity_a, 1) + " A";
    oNote.textContent = r.note;
  }, _V26_DEB);
  for (const f of [np, kw, v, pf]) f.input.addEventListener("input", update);
  for (const f of [ph, ol]) f.select.addEventListener("change", update);
}
FEEDER_RENDERERS["generator-conductor-445"] = _v493renderGeneratorConductor445;

// ===================== spec-v519: existing-facility load by peak demand (NEC 220.87) =====================
// dims: in { recorded_peak_a: I, new_load_a: I, service_rating_a: I, pv_or_peakshave: dimensionless } out: { basis_a: I, total_a: I, headroom_a: I, fits: dimensionless }
export function computeExistingLoad22087({ recorded_peak_a = 0, new_load_a = 0, service_rating_a = 0, pv_or_peakshave = false } = {}) {
  const _g = _finiteGuard({ recorded_peak_a, new_load_a, service_rating_a }); if (_g) return _g;
  const peak = Number(recorded_peak_a) || 0;
  const nl = Number(new_load_a) || 0;
  const rating = Number(service_rating_a) || 0;
  if (!(peak > 0)) return { error: "Recorded peak demand must be positive (A)." };
  if (nl < 0) return { error: "New load cannot be negative (A)." };
  if (!(rating > 0)) return { error: "Service rating must be positive (A)." };
  const basis_a = 1.25 * peak;
  const total_a = basis_a + nl;
  const headroom_a = rating - total_a;
  const fits = headroom_a >= 0 && !pv_or_peakshave;
  if (![basis_a, total_a, headroom_a].every(Number.isFinite)) return { error: "Existing-load math is not a finite value." };
  return {
    basis_a, total_a, headroom_a, fits, pv_or_peakshave: !!pv_or_peakshave,
    note: "NEC 220.87 determining existing loads: instead of summing connected loads (which overstates what a service carries), take the maximum demand the utility actually METERED over the last year (or a 30-day recording) and add 125% of it to the new load. basis = 1.25 x recorded peak, total = basis + new load, headroom = service rating - total. This tells a contractor whether an EV charger or heat pump fits without a costly service upgrade, because a building rarely runs near its connected total. The data must span at least a year (or a 30-day recording per 220.87), and the method is VOID where the recorded demand already reflects on-site PV or a peak-shaving system that hides the true peak. A design aid; the AHJ and the utility data govern.",
  };
}
export const existingLoad22087Example = { inputs: { recorded_peak_a: 120, new_load_a: 40, service_rating_a: 200, pv_or_peakshave: false } };

function _v519renderExistingLoad22087(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 220.87 (determining existing loads): basis = 125% of the maximum demand the utility metered (a year of data, or a 30-day recording); total = basis + new load; headroom = service rating - total. Void where the recorded data reflects on-site PV or peak-shaving that hides the true peak. A design aid; the AHJ and utility data govern.";
  const peak = _v26makeNumber("Recorded peak demand (A, metered over the last year)", "el2-peak", { step: "any", min: "0" });
  const nl = _v26makeNumber("New load to add (A, continuous-equivalent)", "el2-new", { step: "any", min: "0" });
  const rating = _v26makeNumber("Existing service rating (A)", "el2-rating", { step: "any", min: "0" });
  const pv = _v26makeSelect("Recorded data reflects PV / peak-shaving?", "el2-pv", [
    { value: "no", label: "No - clean metered demand", selected: true },
    { value: "yes", label: "Yes - 220.87 does not apply" },
  ]);
  for (const f of [peak, nl, rating, pv]) inputRegion.appendChild(f.wrap);
  _v26attachEx(inputRegion, () => { peak.input.value = "120"; nl.input.value = "40"; rating.input.value = "200"; pv.select.value = "no"; update(); });
  const oBasis = _v26makeOut(outputRegion, "125% basis (of metered peak)", "el2-out-basis");
  const oTotal = _v26makeOut(outputRegion, "Total load (basis + new)", "el2-out-total");
  const oHead = _v26makeOut(outputRegion, "Headroom under the service", "el2-out-head");
  const oNote = _v26makeOut(outputRegion, "Note", "el2-out-note");
  const update = _v26debounce(() => {
    const r = computeExistingLoad22087({ recorded_peak_a: Number(peak.input.value) || 0, new_load_a: Number(nl.input.value) || 0, service_rating_a: Number(rating.input.value) || 0, pv_or_peakshave: pv.select.value === "yes" });
    if (r.error) { oBasis.textContent = r.error; oTotal.textContent = "-"; oHead.textContent = "-"; oNote.textContent = "-"; return; }
    oBasis.textContent = _v26fmt(r.basis_a, 1) + " A";
    oTotal.textContent = _v26fmt(r.total_a, 1) + " A";
    oHead.textContent = _v26fmt(r.headroom_a, 1) + " A" + (r.pv_or_peakshave ? " -- but 220.87 does not apply (PV / peak-shaving)" : r.fits ? " -- FITS, no upgrade needed" : " -- OVER, upgrade or load management needed");
    oNote.textContent = r.note;
  }, _V26_DEB);
  for (const f of [peak, nl, rating]) f.input.addEventListener("input", update);
  pv.select.addEventListener("change", update);
}
FEEDER_RENDERERS["existing-load-220-87"] = _v519renderExistingLoad22087;

// --- spec-v561 A: EV load-management (EVEMS) diversified service load (NEC 625.42) ---
// unmanaged = 1.25 x per_charger x count. managed = evems > 0 ? (setpoint125 ? 1.25 : 1.0) x evems : unmanaged.
// dims: in { charger_count: dimensionless, per_charger_a: I, evems_limit_a: I, apply_125_setpoint: dimensionless } out: { unmanaged_sum_a: I, managed_demand_a: I, freed_headroom_a: I }
export function computeEvLoadManagementEms({ charger_count = 0, per_charger_a = 0, evems_limit_a = 0, apply_125_setpoint = true } = {}) {
  const _g = _finiteGuard({ charger_count, per_charger_a, evems_limit_a }); if (_g) return _g;
  const n = Number(charger_count) || 0;
  const per = Number(per_charger_a) || 0;
  const limit = Number(evems_limit_a) || 0;
  const setpoint125 = apply_125_setpoint === true || apply_125_setpoint === "yes";
  if (!(n >= 1)) return { error: "Charger count must be at least 1." };
  if (!(per > 0)) return { error: "Per-charger rating must be positive (A)." };
  if (limit < 0) return { error: "EVEMS limit cannot be negative (A)." };
  const unmanaged_sum_a = 1.25 * per * n;
  const managed = limit > 0;
  if (managed && !(limit > 0)) return { error: "EVEMS limit must be positive when management is used." };
  const managed_demand_a = managed ? (setpoint125 ? 1.25 : 1.0) * limit : unmanaged_sum_a;
  const freed_headroom_a = unmanaged_sum_a - managed_demand_a;
  return {
    unmanaged_sum_a, managed_demand_a, freed_headroom_a, managed, setpoint125,
    note: "Without an EVEMS the service must carry the sum of all chargers at 125% (forcing an upgrade); a listed EVEMS lets the demand be the aggregate limit it enforces rather than the sum. The 2026 NEC (625.48) applies the 125% continuous factor to the EVEMS setpoint. The EVEMS must be listed and its setpoint enforced in hardware. NEC 625.42(A) permits the management; the NEC and the AHJ govern.",
  };
}
export const evLoadManagementEmsExample = { inputs: { charger_count: 4, per_charger_a: 40, evems_limit_a: 80, apply_125_setpoint: true } };

function _v561renderEvLoadManagementEms(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 625.42(A) energy management systems (EVEMS) with the 2026 625.48 continuous factor: un-managed = 1.25 x per-charger x count; managed demand = 1.25 x EVEMS aggregate limit; freed headroom is the difference. A listed EVEMS lets the demand be the enforced aggregate limit, not the sum. The EVEMS must be listed and its setpoint enforced in hardware. The NEC and the AHJ govern.";
  const n = _v26makeNumber("Number of EVSE (chargers)", "evems-n", { step: "1", min: "1" });
  const per = _v26makeNumber("Per-charger continuous rating (A)", "evems-per", { step: "any", min: "0" });
  const limit = _v26makeNumber("EVEMS aggregate limit (A, 0 = no management)", "evems-limit", { step: "any", min: "0" });
  const sp = _v26makeSelect("Apply the 2026 125% factor to the setpoint?", "evems-sp", [
    { value: "yes", label: "Yes (2026 625.48 continuous)", selected: true },
    { value: "no", label: "No (setpoint at 100%)" },
  ]);
  for (const f of [n, per, limit, sp]) inputRegion.appendChild(f.wrap);
  _v26attachEx(inputRegion, () => { n.input.value = "4"; per.input.value = "40"; limit.input.value = "80"; sp.select.value = "yes"; update(); });
  const oSum = _v26makeOut(outputRegion, "Un-managed sum (125% of all)", "evems-out-sum");
  const oDem = _v26makeOut(outputRegion, "Managed demand", "evems-out-dem");
  const oFree = _v26makeOut(outputRegion, "Freed headroom", "evems-out-free");
  const oNote = _v26makeOut(outputRegion, "Note", "evems-out-note");
  const update = _v26debounce(() => {
    const r = computeEvLoadManagementEms({ charger_count: Number(n.input.value) || 0, per_charger_a: Number(per.input.value) || 0, evems_limit_a: Number(limit.input.value) || 0, apply_125_setpoint: sp.select.value === "yes" });
    if (r.error) { oSum.textContent = r.error; oDem.textContent = "-"; oFree.textContent = "-"; oNote.textContent = "-"; return; }
    oSum.textContent = _v26fmt(r.unmanaged_sum_a, 1) + " A";
    oDem.textContent = _v26fmt(r.managed_demand_a, 1) + " A" + (r.managed ? " (EVEMS aggregate)" : " (no management - full sum)");
    oFree.textContent = _v26fmt(r.freed_headroom_a, 1) + " A" + (r.managed ? " freed vs the un-managed sum" : "");
    oNote.textContent = r.note;
  }, _V26_DEB);
  for (const f of [n, per, limit]) f.input.addEventListener("input", update);
  sp.select.addEventListener("change", update);
}
FEEDER_RENDERERS["ev-load-management-ems"] = _v561renderEvLoadManagementEms;
