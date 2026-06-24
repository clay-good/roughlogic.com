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
