// spec-v12 Group V: EMS / Pre-hospital starter. Three tiles:
//
//   V.1 Glasgow Coma Scale (GCS)
//   V.2 Parkland formula (burn fluid resuscitation)
//   V.5 Cincinnati Prehospital Stroke Scale (CPSS)
//
// EVERY Group V tile is a math aid, NEVER a substitute for online
// medical command or the receiving facility's protocols. Each tile
// renders the spec-v10 §B.1 limitation banner above the inputs;
// canonical copy lives in limitation-banner.js. Each citation carries
// the v12-introduced GOVERNANCE.ems_prehospital variant in
// citations.js.
//
// Spec-v12 §13.1 explicitly overrides the spec.md / spec-v9 §11
// "live drug-dosing or clinical decision support" exclusion for the
// bounded Group V scope: pure-math aids only, with prominent
// medical-director-governs framing. The classical scales below
// (GCS, Parkland, CPSS) are public-domain peer-reviewed scales
// long since published in field-EMS reference materials; this
// tile presents the same math any agency protocol references.

import { DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

// ====================================================================
// V.1 Glasgow Coma Scale (GCS)
// ====================================================================
//
// Teasdale & Jennett, "Assessment of coma and impaired consciousness,"
// Lancet 304:7872 (1974). Three components summed:
//
//   Eye opening (E):     1 (none) ... 4 (spontaneous)
//   Verbal response (V): 1 (none) ... 5 (oriented). For intubated
//                        patients, V is recorded as "T" and the total
//                        is not interpretable.
//   Motor response (M):  1 (none) ... 6 (obeys commands)
//
// Total 3 (deep coma) to 15 (fully awake). Severity bands per ACEP /
// ACS Committee on Trauma:
//   mild     13-15
//   moderate 9-12
//   severe   3-8

export function computeGCS({ eye, verbal, motor, intubated }) {
  const E = Number(eye);
  const V = Number(verbal);
  const M = Number(motor);
  const intub = intubated === true || intubated === "true" || intubated === 1 || intubated === "1";
  if (!Number.isFinite(E) || E < 1 || E > 4) return { error: "Eye opening must be 1 (none) to 4 (spontaneous)." };
  if (!intub && (!Number.isFinite(V) || V < 1 || V > 5)) return { error: "Verbal response must be 1 (none) to 5 (oriented), or set Intubated = yes." };
  if (!Number.isFinite(M) || M < 1 || M > 6) return { error: "Motor response must be 1 (none) to 6 (obeys commands)." };
  if (intub) {
    return {
      eye: E, verbal: "T", motor: M,
      total: null,
      total_label: "Not interpretable (intubated): record as " + E + "T" + M,
      severity: null,
      severity_label: "Not interpretable while intubated",
    };
  }
  const total = E + V + M;
  let severity;
  if (total >= 13) severity = "mild";
  else if (total >= 9) severity = "moderate";
  else severity = "severe";
  return {
    eye: E, verbal: V, motor: M,
    total,
    total_label: String(total),
    severity,
    severity_label: severity + " (" + (severity === "mild" ? "13-15" : severity === "moderate" ? "9-12" : "3-8") + ")",
  };
}

export const gcsExample = {
  inputs: { eye: 3, verbal: 4, motor: 5, intubated: false },
  expected: { total: 12, severity: "moderate" },
};

const EYE_OPTS = [
  { value: "4", label: "4 - Spontaneous" },
  { value: "3", label: "3 - To voice" },
  { value: "2", label: "2 - To pain" },
  { value: "1", label: "1 - None" },
];
const VERBAL_OPTS = [
  { value: "5", label: "5 - Oriented" },
  { value: "4", label: "4 - Confused conversation" },
  { value: "3", label: "3 - Inappropriate words" },
  { value: "2", label: "2 - Incomprehensible sounds" },
  { value: "1", label: "1 - None" },
];
const MOTOR_OPTS = [
  { value: "6", label: "6 - Obeys commands" },
  { value: "5", label: "5 - Localizes to pain" },
  { value: "4", label: "4 - Withdraws from pain" },
  { value: "3", label: "3 - Abnormal flexion (decorticate)" },
  { value: "2", label: "2 - Abnormal extension (decerebrate)" },
  { value: "1", label: "1 - None" },
];

export function renderGCS(inputRegion, outputRegion, citationEl) {
  // Per spec-v12 §6: render the limitation banner above the inputs.
  const copy = getLimitationCopy("glasgow-coma-scale");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Teasdale and Jennett, Lancet 304:7872 (1974). Bands per ACEP / ACS Committee on Trauma. Receiving facility physician governs final disposition; this tile is a structured score, not a triage decision.";
  const E = makeSelect("Eye opening", "gcs-e", EYE_OPTS);
  const V = makeSelect("Verbal response", "gcs-v", VERBAL_OPTS);
  const M = makeSelect("Motor response", "gcs-m", MOTOR_OPTS);
  const I = makeSelect("Intubated?", "gcs-i", [
    { value: "false", label: "No" }, { value: "true", label: "Yes (records V as T)" },
  ]);
  for (const f of [E, V, M, I]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    E.select.value = "3"; V.select.value = "4"; M.select.value = "5"; I.select.value = "false";
    update();
  });
  const oTotal = makeOutputLine(outputRegion, "Total GCS", "gcs-out-total");
  const oSeverity = makeOutputLine(outputRegion, "Severity band", "gcs-out-sev");
  const oComponents = makeOutputLine(outputRegion, "Component breakdown (E / V / M)", "gcs-out-evm");
  const update = debounce(() => {
    const r = computeGCS({
      eye: E.select.value, verbal: V.select.value, motor: M.select.value, intubated: I.select.value,
    });
    if (r.error) {
      oTotal.textContent = r.error; oSeverity.textContent = "-"; oComponents.textContent = "-";
      return;
    }
    oTotal.textContent = r.total_label;
    oSeverity.textContent = r.severity_label;
    oComponents.textContent = "E " + r.eye + " / V " + r.verbal + " / M " + r.motor;
  }, DEBOUNCE_MS);
  for (const sel of [E.select, V.select, M.select, I.select]) sel.addEventListener("change", update);
}

// ====================================================================
// V.2 Parkland formula (burn fluid resuscitation)
// ====================================================================
//
// Baxter & Shires (1968) / Parkland Hospital Burn Unit; codified in
// the American Burn Association Advanced Burn Life Support (ABLS)
// course. The 24-hour Lactated Ringer's volume after a thermal burn:
//
//   V_24hr = 4 mL/kg/%TBSA
//
// Half the volume is given in the first 8 hours (timed from the
// burn, not from EMS contact), the remaining half over hours 8-24.

export function computeParkland({ weight_kg, tbsa_percent, hours_since_burn }) {
  const wt = Number(weight_kg);
  const tbsa = Number(tbsa_percent);
  const since = Number(hours_since_burn);
  if (!Number.isFinite(wt) || wt <= 0) return { error: "Enter a positive weight in kg." };
  if (!Number.isFinite(tbsa) || tbsa < 0 || tbsa > 100) return { error: "TBSA percent must be 0 to 100." };
  if (!Number.isFinite(since) || since < 0 || since > 24) return { error: "Hours since burn must be 0 to 24." };
  if (wt > 250) return { error: "Weight above 250 kg flagged; verify." };
  const total_mL = 4 * wt * tbsa;
  const first_8hr_mL = total_mL / 2;
  const second_16hr_mL = total_mL / 2;
  // Remaining first-8 volume given hours-since-burn elapsed:
  const remaining_first_8 = Math.max(0, first_8hr_mL * (1 - since / 8));
  const remaining_hours_first_8 = Math.max(0, 8 - since);
  const rate_now_mL_per_hr = remaining_hours_first_8 > 0
    ? remaining_first_8 / remaining_hours_first_8
    : second_16hr_mL / 16;
  // Pediatric over-resuscitation flag (TBSA > 30 + small child) is
  // out of scope for the starter; a follow-up tile can add the Cincinnati
  // pediatric modification. The renderer warns when TBSA > 50.
  return {
    total_24hr_mL: total_mL,
    first_8hr_mL,
    second_16hr_mL,
    current_rate_mL_per_hr: rate_now_mL_per_hr,
    remaining_first_8_mL: remaining_first_8,
    remaining_first_8_hours: remaining_hours_first_8,
    flag_high_tbsa: tbsa > 50,
  };
}

export const parklandExample = {
  inputs: { weight_kg: 75, tbsa_percent: 30, hours_since_burn: 0 },
  // 4 * 75 * 30 = 9000 mL total; 4500 first 8 hr (562.5 mL/hr); 4500 next 16 hr (281.25 mL/hr).
  expected: { total_24hr_mL: 9000, first_8hr_mL: 4500, current_rate_mL_per_hr: 562.5 },
};

export function renderParkland(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("parkland-formula");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Baxter & Shires, 'Fluid Volume and Electrolyte Changes in the Early Post-burn Period,' Clinics in Plastic Surgery (1974). ABA Advanced Burn Life Support (ABLS) course. Receiving burn center governs the actual resuscitation; this tile is a structured estimate for transport planning.";
  const W = makeNumber("Patient weight (kg)", "pk-w", { step: "any", min: "0" });
  const T = makeNumber("Burned body surface area (TBSA, percent)", "pk-t", { step: "any", min: "0", max: "100" });
  const H = makeNumber("Hours since burn (0 if at time of injury)", "pk-h", { step: "any", min: "0", max: "24", value: "0" });
  for (const f of [W, T, H]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    W.input.value = String(parklandExample.inputs.weight_kg);
    T.input.value = String(parklandExample.inputs.tbsa_percent);
    H.input.value = String(parklandExample.inputs.hours_since_burn);
    update();
  });
  const oTotal = makeOutputLine(outputRegion, "Total 24-hour fluid (Lactated Ringer's, mL)", "pk-out-total");
  const oFirst8 = makeOutputLine(outputRegion, "First 8 hours from burn (mL)", "pk-out-first8");
  const oSecond16 = makeOutputLine(outputRegion, "Hours 8 to 24 from burn (mL)", "pk-out-second16");
  const oRate = makeOutputLine(outputRegion, "Current rate (mL/hr; reflects hours-since-burn)", "pk-out-rate");
  const oRem = makeOutputLine(outputRegion, "First-8 remaining volume / time", "pk-out-rem");
  const oFlag = makeOutputLine(outputRegion, "High-TBSA flag", "pk-out-flag");
  const update = debounce(() => {
    const r = computeParkland({
      weight_kg: W.input.value, tbsa_percent: T.input.value, hours_since_burn: H.input.value,
    });
    if (r.error) {
      oTotal.textContent = r.error;
      for (const o of [oFirst8, oSecond16, oRate, oRem, oFlag]) o.textContent = "-";
      return;
    }
    oTotal.textContent = fmt(r.total_24hr_mL, 0);
    oFirst8.textContent = fmt(r.first_8hr_mL, 0);
    oSecond16.textContent = fmt(r.second_16hr_mL, 0);
    oRate.textContent = fmt(r.current_rate_mL_per_hr, 1);
    oRem.textContent = fmt(r.remaining_first_8_mL, 0) + " mL over " + fmt(r.remaining_first_8_hours, 2) + " hr";
    oFlag.textContent = r.flag_high_tbsa
      ? "TBSA > 50%: verify with burn center; over-resuscitation risk is high."
      : "Within typical Parkland range.";
  }, DEBOUNCE_MS);
  for (const el of [W.input, T.input, H.input]) el.addEventListener("input", update);
}

// ====================================================================
// V.5 Cincinnati Prehospital Stroke Scale (CPSS)
// ====================================================================
//
// Kothari, Pancioli, Liu, Brott, Broderick (1999). Three binary
// findings; any single abnormal raises the probability of stroke.

export function computeCPSS({ facial_droop, arm_drift, abnormal_speech }) {
  const findings = [
    { name: "facial droop", abnormal: facial_droop === true || facial_droop === "true" || facial_droop === 1 || facial_droop === "1" },
    { name: "arm drift", abnormal: arm_drift === true || arm_drift === "true" || arm_drift === 1 || arm_drift === "1" },
    { name: "abnormal speech", abnormal: abnormal_speech === true || abnormal_speech === "true" || abnormal_speech === 1 || abnormal_speech === "1" },
  ];
  const abnormal_count = findings.filter((f) => f.abnormal).length;
  const abnormal_findings = findings.filter((f) => f.abnormal).map((f) => f.name);
  // Per Kothari 1999: any single abnormal finding gives ~72% sensitivity
  // for stroke; all three abnormal gives ~85%. The tile reports the
  // count, not a numerical probability (the original cohort was small
  // and modern thrombectomy criteria make any abnormal finding action-
  // able regardless).
  let interpretation;
  if (abnormal_count === 0) {
    interpretation = "No CPSS findings positive. Stroke is less likely; continue assessment for other causes. Transport per protocol.";
  } else {
    interpretation = "Positive CPSS (" + abnormal_count + " of 3). Suspect stroke. Note last-known-well time. Transport to a stroke center per regional protocol. Notify the receiving facility.";
  }
  return {
    abnormal_count,
    abnormal_findings,
    positive: abnormal_count > 0,
    interpretation,
  };
}

export const cpssExample = {
  inputs: { facial_droop: true, arm_drift: true, abnormal_speech: false },
  expected: { abnormal_count: 2, positive: true },
};

export function renderCPSS(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("cincinnati-stroke-scale");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Kothari, Pancioli, Liu, Brott, Broderick, 'Cincinnati Prehospital Stroke Scale: reproducibility and validity,' Annals of Emergency Medicine 33:4 (1999). Receiving facility governs final disposition; suspected stroke goes to a stroke center per regional protocol.";
  const BOOL = [{ value: "false", label: "Normal" }, { value: "true", label: "Abnormal" }];
  const F = makeSelect("Facial droop", "cpss-f", BOOL);
  const A = makeSelect("Arm drift (10 sec, both arms)", "cpss-a", BOOL);
  const S = makeSelect("Speech (repeat 'You can't teach an old dog new tricks')", "cpss-s", BOOL);
  for (const f of [F, A, S]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    F.select.value = "true"; A.select.value = "true"; S.select.value = "false";
    update();
  });
  const oCount = makeOutputLine(outputRegion, "Abnormal findings (count of 3)", "cpss-out-count");
  const oFindings = makeOutputLine(outputRegion, "Abnormal findings", "cpss-out-findings");
  const oInterp = makeOutputLine(outputRegion, "Interpretation", "cpss-out-interp");
  const update = debounce(() => {
    const r = computeCPSS({
      facial_droop: F.select.value, arm_drift: A.select.value, abnormal_speech: S.select.value,
    });
    oCount.textContent = String(r.abnormal_count) + " of 3";
    oFindings.textContent = r.abnormal_findings.length === 0 ? "(none)" : r.abnormal_findings.join(", ");
    oInterp.textContent = r.interpretation;
  }, DEBOUNCE_MS);
  for (const sel of [F.select, A.select, S.select]) sel.addEventListener("change", update);
}

// ====================================================================
// V.4 APGAR score
// ====================================================================
//
// Apgar, Virginia, "A Proposal for a New Method of Evaluation of the
// Newborn Infant," Anesthesia & Analgesia 32 (1953). Five components,
// each 0-2, summed to a 0-10 score. Recorded at 1 minute and 5 minutes;
// some agencies extend to 10 minutes for severely-depressed infants.
//
//   A - Appearance (skin color):  0 blue / pale, 1 acrocyanotic, 2 pink
//   P - Pulse (heart rate):       0 absent, 1 < 100, 2 >= 100
//   G - Grimace (reflex):         0 no response, 1 grimace, 2 cough/sneeze
//   A - Activity (muscle tone):   0 limp, 1 some flexion, 2 active
//   R - Respiration:              0 absent, 1 weak / irregular, 2 strong / crying

export function computeAPGAR({ appearance, pulse, grimace, activity, respiration }) {
  const parts = { appearance, pulse, grimace, activity, respiration };
  const out = {};
  for (const [k, v] of Object.entries(parts)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 2) {
      return { error: "All five APGAR components must be 0, 1, or 2." };
    }
    out[k] = n;
  }
  const total = out.appearance + out.pulse + out.grimace + out.activity + out.respiration;
  let band, action;
  if (total >= 7) {
    band = "vigorous (7-10)";
    action = "Routine post-delivery care.";
  } else if (total >= 4) {
    band = "moderately depressed (4-6)";
    action = "Stimulation, warmth, possible positive-pressure ventilation. Reassess at 5 minutes.";
  } else {
    band = "severely depressed (0-3)";
    action = "Immediate resuscitation per NRP. Reassess and extend scoring to 10 minutes if score stays below 7.";
  }
  return { ...out, total, band, action };
}

export const apgarExample = {
  inputs: { appearance: 2, pulse: 2, grimace: 1, activity: 2, respiration: 2 },
  expected: { total: 9, band: "vigorous (7-10)" },
};

const APGAR_OPT = [
  { value: "2", label: "2" }, { value: "1", label: "1" }, { value: "0", label: "0" },
];

export function renderAPGAR(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("apgar-score");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Apgar, V., 'A Proposal for a New Method of Evaluation of the Newborn Infant,' Anesthesia & Analgesia 32 (1953). Score recorded at 1 minute and 5 minutes after birth (and again at 10 minutes if the 5-minute score is below 7 per AAP / ACOG). Resuscitation governed by current NRP protocol; this tile is a structured score, not a resuscitation algorithm.";
  const A = makeSelect("Appearance (color)", "ap-a", APGAR_OPT);
  const P = makeSelect("Pulse (heart rate)", "ap-p", APGAR_OPT);
  const G = makeSelect("Grimace (reflex)", "ap-g", APGAR_OPT);
  const M = makeSelect("Activity (muscle tone)", "ap-m", APGAR_OPT);
  const R = makeSelect("Respiration", "ap-r", APGAR_OPT);
  for (const f of [A, P, G, M, R]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    A.select.value = "2"; P.select.value = "2"; G.select.value = "1"; M.select.value = "2"; R.select.value = "2";
    update();
  });
  const oTotal = makeOutputLine(outputRegion, "Total APGAR score", "ap-out-total");
  const oBand = makeOutputLine(outputRegion, "Band", "ap-out-band");
  const oAction = makeOutputLine(outputRegion, "Suggested action", "ap-out-action");
  const update = debounce(() => {
    const r = computeAPGAR({
      appearance: A.select.value, pulse: P.select.value, grimace: G.select.value,
      activity: M.select.value, respiration: R.select.value,
    });
    if (r.error) {
      oTotal.textContent = r.error; oBand.textContent = "-"; oAction.textContent = "-";
      return;
    }
    oTotal.textContent = String(r.total);
    oBand.textContent = r.band;
    oAction.textContent = r.action;
  }, DEBOUNCE_MS);
  for (const sel of [A.select, P.select, G.select, M.select, R.select]) sel.addEventListener("change", update);
}

// ====================================================================
// V.8 IV drip rate
// ====================================================================
//
// gtts/min = (volume_mL * drop_factor_gtt_per_mL) / time_min.
// Drop factor is set by the IV set:
//   10 gtt/mL (macro, blood-set), 15 gtt/mL (standard macro),
//   20 gtt/mL (some macro sets), 60 gtt/mL (pediatric / micro).

export function computeIvDripRate({ volume_mL, time_min, drop_factor_gtt_per_mL }) {
  const V = Number(volume_mL);
  const T = Number(time_min);
  const F = Number(drop_factor_gtt_per_mL);
  if (!Number.isFinite(V) || V <= 0) return { error: "Enter a positive volume in mL." };
  if (!Number.isFinite(T) || T <= 0) return { error: "Enter a positive time in minutes." };
  if (!Number.isFinite(F) || F < 10 || F > 60) return { error: "Drop factor must be 10, 15, 20, or 60 gtt/mL (set the IV-set label)." };
  const rate_mL_per_hr = (V / T) * 60;
  const gtts_per_min = (V * F) / T;
  return {
    volume_mL: V, time_min: T, drop_factor_gtt_per_mL: F,
    rate_mL_per_hr,
    gtts_per_min,
  };
}

export const ivDripExample = {
  inputs: { volume_mL: 1000, time_min: 480, drop_factor_gtt_per_mL: 15 },
  // 1000 mL / 480 min * 60 = 125 mL/hr.
  // gtts/min = 1000 * 15 / 480 = 31.25.
  expected: { rate_mL_per_hr: 125, gtts_per_min: 31.25 },
};

const DROP_FACTOR_OPTS = [
  { value: "10", label: "10 gtt/mL (macro / blood)" },
  { value: "15", label: "15 gtt/mL (macro standard)" },
  { value: "20", label: "20 gtt/mL (macro)" },
  { value: "60", label: "60 gtt/mL (pediatric / micro)" },
];

export function renderIvDripRate(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("iv-drip-rate");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: gtts/min = (volume * drop_factor) / time_min. Drop factor is printed on the IV-set label (10 / 15 / 20 macro; 60 micro). Mean infusion rate (mL/hr) is the second cross-check. EMS medical director and receiving facility govern the actual infusion order.";
  const V = makeNumber("Volume to infuse (mL)", "iv-v", { step: "any", min: "0" });
  const T = makeNumber("Time (minutes)", "iv-t", { step: "any", min: "0" });
  const F = makeSelect("Drop factor (gtt/mL)", "iv-f", DROP_FACTOR_OPTS);
  for (const f of [V, T, F]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    V.input.value = String(ivDripExample.inputs.volume_mL);
    T.input.value = String(ivDripExample.inputs.time_min);
    F.select.value = String(ivDripExample.inputs.drop_factor_gtt_per_mL);
    update();
  });
  const oRate = makeOutputLine(outputRegion, "Hourly infusion rate (mL/hr)", "iv-out-rate");
  const oGtts = makeOutputLine(outputRegion, "Drops per minute", "iv-out-gtts");
  const update = debounce(() => {
    const r = computeIvDripRate({
      volume_mL: V.input.value, time_min: T.input.value, drop_factor_gtt_per_mL: F.select.value,
    });
    if (r.error) { oRate.textContent = r.error; oGtts.textContent = "-"; return; }
    oRate.textContent = fmt(r.rate_mL_per_hr, 2);
    oGtts.textContent = fmt(r.gtts_per_min, 2);
  }, DEBOUNCE_MS);
  for (const el of [V.input, T.input]) el.addEventListener("input", update);
  F.select.addEventListener("change", update);
}

// ====================================================================
// V.10 O2 cylinder duration
// ====================================================================
//
// duration_minutes = ((cylinder_pressure_psi - reserve_psi) * tank_factor) / flow_L_per_min
// Tank factors per AARC clinical practice (D = 0.16, E = 0.28, M = 1.56,
// G = 2.41, H = 3.14). The factor is the cylinder's full-content L
// divided by its service pressure psi; for a D cylinder full at
// 2200 psi with 350 L content, factor = 350/2200 ~= 0.16.

const TANK_FACTORS = { D: 0.16, E: 0.28, M: 1.56, G: 2.41, H: 3.14 };

export function computeO2CylinderTime({ cylinder, pressure_psi, reserve_psi, flow_lpm }) {
  const C = String(cylinder).toUpperCase();
  if (!TANK_FACTORS[C]) return { error: "Cylinder must be one of D, E, M, G, H." };
  const P = Number(pressure_psi);
  const R = Number(reserve_psi);
  const F = Number(flow_lpm);
  if (!Number.isFinite(P) || P < 0 || P > 2400) return { error: "Pressure must be 0 to 2400 psi (typical D/E full at 2000-2200)." };
  if (!Number.isFinite(R) || R < 0 || R > P) return { error: "Reserve pressure must be between 0 and the current cylinder pressure." };
  if (!Number.isFinite(F) || F < 0.25 || F > 25) return { error: "Flow rate must be 0.25 to 25 L/min." };
  const factor = TANK_FACTORS[C];
  const minutes_to_reserve = ((P - R) * factor) / F;
  const minutes_to_empty = (P * factor) / F;
  const hours_to_reserve = Math.floor(minutes_to_reserve / 60);
  const mins_to_reserve_remainder = Math.round(minutes_to_reserve - hours_to_reserve * 60);
  return {
    cylinder: C,
    tank_factor: factor,
    minutes_to_reserve,
    minutes_to_empty,
    hhmm_to_reserve: String(hours_to_reserve).padStart(2, "0") + ":" + String(mins_to_reserve_remainder).padStart(2, "0"),
    reserve_warning: R < 200 ? "Reserve pressure below 200 psi: very little safety margin." : null,
  };
}

export const o2CylinderExample = {
  inputs: { cylinder: "D", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 },
  // (2000 - 200) * 0.16 / 4 = 288/4 = 72 minutes to reserve.
  expected: { minutes_to_reserve: 72 },
};

const CYLINDER_OPTS = [
  { value: "D", label: "D (350 L; 30-min nominal)" },
  { value: "E", label: "E (625 L; ~30-min nominal)" },
  { value: "M", label: "M (3000 L; large portable)" },
  { value: "G", label: "G (5300 L)" },
  { value: "H", label: "H (6900 L; large home)" },
];

export function renderO2CylinderTime(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("o2-cylinder-duration");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: duration_minutes = ((pressure - reserve) * tank_factor) / flow_lpm. Tank factors per AARC clinical practice (D=0.16, E=0.28, M=1.56, G=2.41, H=3.14). The 'reserve' pressure is what you plan to land at, not zero (cylinders should never be drawn to zero). EMS medical director and respiratory-therapy protocol govern the actual flow plan.";
  const C = makeSelect("Cylinder size", "o2-c", CYLINDER_OPTS);
  const P = makeNumber("Current pressure (psi)", "o2-p", { step: "any", min: "0", max: "2400" });
  const R = makeNumber("Reserve pressure (psi; minimum to land at)", "o2-r", { step: "any", min: "0", value: "200" });
  const F = makeNumber("Flow rate (L/min)", "o2-f", { step: "any", min: "0.25", max: "25" });
  for (const f of [C, P, R, F]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    C.select.value = String(o2CylinderExample.inputs.cylinder);
    P.input.value = String(o2CylinderExample.inputs.pressure_psi);
    R.input.value = String(o2CylinderExample.inputs.reserve_psi);
    F.input.value = String(o2CylinderExample.inputs.flow_lpm);
    update();
  });
  const oMins = makeOutputLine(outputRegion, "Time to reserve (minutes)", "o2-out-mins");
  const oHHMM = makeOutputLine(outputRegion, "Time to reserve (hh:mm)", "o2-out-hhmm");
  const oEmpty = makeOutputLine(outputRegion, "Time to empty (do not plan to)", "o2-out-empty");
  const oWarn = makeOutputLine(outputRegion, "Reserve warning", "o2-out-warn");
  const update = debounce(() => {
    const r = computeO2CylinderTime({
      cylinder: C.select.value, pressure_psi: P.input.value,
      reserve_psi: R.input.value, flow_lpm: F.input.value,
    });
    if (r.error) {
      oMins.textContent = r.error;
      for (const o of [oHHMM, oEmpty, oWarn]) o.textContent = "-";
      return;
    }
    oMins.textContent = fmt(r.minutes_to_reserve, 1);
    oHHMM.textContent = r.hhmm_to_reserve;
    oEmpty.textContent = fmt(r.minutes_to_empty, 1) + " min";
    oWarn.textContent = r.reserve_warning || "Reserve pressure is adequate (>= 200 psi).";
  }, DEBOUNCE_MS);
  for (const el of [P.input, R.input, F.input]) el.addEventListener("input", update);
  C.select.addEventListener("change", update);
}

// ====================================================================
// V.7 Pediatric weight estimation
// ====================================================================
//
// Two parallel published estimators for pediatric weight when a scale
// isn't available:
//
//   APLS formula (Advanced Paediatric Life Support, 6th ed.):
//     0-12 months: weight_kg = (age_months / 2) + 4
//     1-5 years:   weight_kg = (2 * age_years) + 8
//     6-12 years:  weight_kg = (3 * age_years) + 7
//
//   Length-based estimation per the underlying 50th-percentile WHO
//   growth curve, banded by Broselow-tape color zones:
//     gray (3-5 kg), pink (6-7), red (8-9), purple (10-11),
//     yellow (12-14), white (15-18), blue (19-23), orange (24-29),
//     green (30-36).
//   This tile uses age-derived weight; a separate clinical Broselow
//   tape is the gold standard if available (the licensed tape is
//   NOT bundled; only the underlying WHO weight-by-length relationship
//   is referenced).

export function computePediatricWeight({ age_years, age_months }) {
  const yr = Number(age_years);
  const mo = Number(age_months);
  if (Number.isFinite(mo) && mo >= 0 && mo <= 12) {
    if (mo < 0 || mo > 12) return { error: "Age in months must be 0-12." };
    const apls = (mo / 2) + 4;
    return {
      age_used: "months", age_value: mo,
      apls_kg: apls,
      formula: "(months / 2) + 4",
      pounds: apls * 2.2046226218,
    };
  }
  if (!Number.isFinite(yr) || yr < 0 || yr > 14) {
    return { error: "Enter age in months (0-12) OR years (1-14)." };
  }
  let apls, formula;
  if (yr >= 1 && yr <= 5) {
    apls = (2 * yr) + 8;
    formula = "(2 * years) + 8";
  } else if (yr > 5 && yr <= 12) {
    apls = (3 * yr) + 7;
    formula = "(3 * years) + 7";
  } else if (yr < 1) {
    // Years input < 1: prefer months path; fall back to 0-1y formula via months estimate.
    const mo_est = yr * 12;
    apls = (mo_est / 2) + 4;
    formula = "(months / 2) + 4  [years input converted to months]";
  } else {
    // > 12 yr: use adult dosing per APLS convention; flag.
    apls = (3 * yr) + 7;
    formula = "(3 * years) + 7  [> 12 yr; consider adult dosing per APLS]";
  }
  return {
    age_used: "years", age_value: yr,
    apls_kg: apls,
    formula,
    pounds: apls * 2.2046226218,
    flag: yr > 12 ? "Age > 12 yr: consider adult-weight dosing per APLS convention." : null,
  };
}

export const pedsWeightExample = {
  inputs: { age_years: 5 },
  // 1-5 yr formula: (2 * 5) + 8 = 18 kg.
  expected: { apls_kg: 18 },
};

export function renderPediatricWeight(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("pediatric-weight-estimate");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: APLS pediatric weight estimation formulas per Advanced Paediatric Life Support (6th ed.). 0-12 months: (months/2)+4 kg; 1-5 yr: (2*years)+8 kg; 6-12 yr: (3*years)+7 kg. Field-weighing on a calibrated scale is the gold standard; this tile is for resuscitation planning when no scale is available. The licensed Broselow tape uses length-based estimation and is NOT bundled.";
  const M = makeNumber("Age in months (0-12; use this for infants)", "pw-m", { step: "any", min: "0", max: "12", value: "" });
  const Y = makeNumber("Age in years (1-14)", "pw-y", { step: "any", min: "0", max: "14", value: "" });
  for (const f of [M, Y]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    M.input.value = ""; Y.input.value = String(pedsWeightExample.inputs.age_years); update();
  });
  const oKg = makeOutputLine(outputRegion, "Estimated weight (kg)", "pw-out-kg");
  const oLb = makeOutputLine(outputRegion, "Estimated weight (lb)", "pw-out-lb");
  const oFormula = makeOutputLine(outputRegion, "Formula used", "pw-out-formula");
  const oFlag = makeOutputLine(outputRegion, "Note", "pw-out-flag");
  const update = debounce(() => {
    const r = computePediatricWeight({ age_months: M.input.value, age_years: Y.input.value });
    if (r.error) {
      oKg.textContent = r.error;
      for (const o of [oLb, oFormula, oFlag]) o.textContent = "-";
      return;
    }
    oKg.textContent = fmt(r.apls_kg, 1);
    oLb.textContent = fmt(r.pounds, 1);
    oFormula.textContent = r.formula;
    oFlag.textContent = r.flag || "Estimate is a starting point; field-weigh if possible.";
  }, DEBOUNCE_MS);
  for (const el of [M.input, Y.input]) el.addEventListener("input", update);
}

// ====================================================================
// V.11 Shock index
// ====================================================================
//
// Shock index (Allgöwer 1967) = HR / SBP. A field early-warning marker
// for occult hemorrhagic shock; the literature consensus thresholds:
//   < 0.5  bradycardic / supranormal perfusion
//   0.5-0.7 normal
//   0.7-1.0 mildly elevated (consider closer monitoring)
//   1.0-1.4 elevated (occult shock; intervene + transport)
//   > 1.4  severe shock (rapid intervention required)

export function computeShockIndex({ hr_bpm, sbp_mmHg }) {
  const HR = Number(hr_bpm);
  const SBP = Number(sbp_mmHg);
  if (!Number.isFinite(HR) || HR <= 0) return { error: "Enter a positive heart rate (bpm)." };
  if (!Number.isFinite(SBP) || SBP <= 0) return { error: "Enter a positive systolic BP (mmHg)." };
  if (HR > 250) return { error: "HR > 250 flagged as implausible; verify input." };
  const si = HR / SBP;
  let band, action;
  if (si < 0.5) { band = "low (<0.5)"; action = "Bradycardic or supranormal perfusion; verify HR and SBP, consider underlying cause."; }
  else if (si < 0.7) { band = "normal (0.5-0.7)"; action = "Within typical hemodynamic range."; }
  else if (si < 1.0) { band = "mildly elevated (0.7-1.0)"; action = "Closer monitoring; trend HR / SBP / mental status."; }
  else if (si <= 1.4) { band = "elevated (1.0-1.4) - occult shock"; action = "Suspect occult hemorrhagic shock; establish IV access, identify source, transport to trauma center."; }
  else { band = "severe (>1.4) - decompensated shock"; action = "Aggressive resuscitation; expedite transport per regional trauma protocol."; }
  return { hr_bpm: HR, sbp_mmHg: SBP, shock_index: si, band, action };
}

export const shockIndexExample = {
  inputs: { hr_bpm: 120, sbp_mmHg: 100 },
  // 120 / 100 = 1.20 (occult shock band).
  expected: { shock_index: 1.2 },
};

export function renderShockIndex(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("shock-index");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Shock index = HR / SBP, originally Allgöwer & Buri 1967 (Klinische Wochenschrift). The 1.0 / 1.4 thresholds are field-EMS consensus per multiple subsequent trauma-registry studies (Vandromme et al. J Trauma 2011; Mutschler et al. Crit Care 2013). A single elevated value is suggestive, not diagnostic; trend over serial readings.";
  const H = makeNumber("Heart rate (bpm)", "si-h", { step: "any", min: "0", max: "250" });
  const S = makeNumber("Systolic BP (mmHg)", "si-s", { step: "any", min: "0" });
  for (const f of [H, S]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    H.input.value = String(shockIndexExample.inputs.hr_bpm);
    S.input.value = String(shockIndexExample.inputs.sbp_mmHg);
    update();
  });
  const oSI = makeOutputLine(outputRegion, "Shock index (HR / SBP)", "si-out-si");
  const oBand = makeOutputLine(outputRegion, "Band", "si-out-band");
  const oAction = makeOutputLine(outputRegion, "Suggested action", "si-out-action");
  const update = debounce(() => {
    const r = computeShockIndex({ hr_bpm: H.input.value, sbp_mmHg: S.input.value });
    if (r.error) {
      oSI.textContent = r.error; oBand.textContent = "-"; oAction.textContent = "-";
      return;
    }
    oSI.textContent = fmt(r.shock_index, 2);
    oBand.textContent = r.band;
    oAction.textContent = r.action;
  }, DEBOUNCE_MS);
  for (const el of [H.input, S.input]) el.addEventListener("input", update);
}

// ====================================================================
// V.12 Mean arterial pressure (MAP)
// ====================================================================
//
// MAP = (SBP + 2 * DBP) / 3.
// This is the standard cuff-derived MAP formula; an arterial-line MAP
// uses the actual integral and differs slightly. >=65 mmHg is the
// minimum-perfusion floor per current Surviving Sepsis / Adult Trauma
// guidelines.

export function computeMAP({ sbp_mmHg, dbp_mmHg }) {
  const SBP = Number(sbp_mmHg);
  const DBP = Number(dbp_mmHg);
  if (!Number.isFinite(SBP) || SBP <= 0) return { error: "Enter a positive systolic BP." };
  if (!Number.isFinite(DBP) || DBP <= 0) return { error: "Enter a positive diastolic BP." };
  if (DBP >= SBP) return { error: "Diastolic BP must be less than systolic BP." };
  const map = (SBP + 2 * DBP) / 3;
  const pulse_pressure = SBP - DBP;
  let band, action;
  if (map < 60) { band = "below 60 (hypoperfusion)"; action = "Treat the underlying cause; sustained MAP < 60 risks end-organ injury."; }
  else if (map < 65) { band = "60-65 (marginal)"; action = "Below Surviving Sepsis / Adult Trauma 65-mmHg floor; consider fluids / vasopressor per protocol."; }
  else if (map <= 100) { band = "65-100 (typical)"; action = "Within normal hemodynamic range."; }
  else { band = "above 100 (hypertensive)"; action = "Sustained high MAP; identify cause."; }
  return {
    sbp_mmHg: SBP, dbp_mmHg: DBP,
    map_mmHg: map,
    pulse_pressure_mmHg: pulse_pressure,
    band, action,
  };
}

export const mapExample = {
  inputs: { sbp_mmHg: 120, dbp_mmHg: 80 },
  // MAP = (120 + 160) / 3 = 93.33.
  expected: { map_mmHg_approx: 93.33 },
};

export function renderMAP(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("mean-arterial-pressure");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: MAP = (SBP + 2 * DBP) / 3 (standard cuff-derived approximation). The >=65 mmHg minimum-perfusion floor per Surviving Sepsis Campaign (Evans et al. Crit Care Med 2021) and Adult Trauma Life Support. Arterial-line MAP uses the true waveform integral and differs slightly from the cuff formula; this tile is the field cuff calculation.";
  const S = makeNumber("Systolic BP (mmHg)", "mp-s", { step: "any", min: "0" });
  const D = makeNumber("Diastolic BP (mmHg)", "mp-d", { step: "any", min: "0" });
  for (const f of [S, D]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    S.input.value = String(mapExample.inputs.sbp_mmHg);
    D.input.value = String(mapExample.inputs.dbp_mmHg);
    update();
  });
  const oMAP = makeOutputLine(outputRegion, "MAP (mmHg)", "mp-out-map");
  const oPP = makeOutputLine(outputRegion, "Pulse pressure (SBP - DBP)", "mp-out-pp");
  const oBand = makeOutputLine(outputRegion, "Band", "mp-out-band");
  const oAction = makeOutputLine(outputRegion, "Suggested action", "mp-out-action");
  const update = debounce(() => {
    const r = computeMAP({ sbp_mmHg: S.input.value, dbp_mmHg: D.input.value });
    if (r.error) {
      oMAP.textContent = r.error;
      for (const o of [oPP, oBand, oAction]) o.textContent = "-";
      return;
    }
    oMAP.textContent = fmt(r.map_mmHg, 1);
    oPP.textContent = fmt(r.pulse_pressure_mmHg, 1);
    oBand.textContent = r.band;
    oAction.textContent = r.action;
  }, DEBOUNCE_MS);
  for (const el of [S.input, D.input]) el.addEventListener("input", update);
}

// --- Renderer registry ---

export const EMS_RENDERERS = {
  "glasgow-coma-scale": renderGCS,
  "parkland-formula": renderParkland,
  "cincinnati-stroke-scale": renderCPSS,
  "apgar-score": renderAPGAR,
  "iv-drip-rate": renderIvDripRate,
  "o2-cylinder-duration": renderO2CylinderTime,
  "pediatric-weight-estimate": renderPediatricWeight,
  "shock-index": renderShockIndex,
  "mean-arterial-pressure": renderMAP,
};
