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

// ====================================================================
// V.13 Anion gap
// ====================================================================
//
// AG = Na - (Cl + HCO3). Optional K-included variant: AG_K = (Na + K)
// - (Cl + HCO3). Reference range (no K): 8-12 mEq/L; with K: 12-16.
// Albumin correction (Figge): AG_corrected = AG + 2.5 * (4.0 -
// albumin_g_dL). Hypoalbuminemia lowers measured AG by ~2.5 per
// 1 g/dL drop in albumin.

export function computeAnionGap({ na, cl, hco3, k, albumin_g_dL }) {
  const Na = Number(na);
  const Cl = Number(cl);
  const HCO3 = Number(hco3);
  if (!Number.isFinite(Na) || Na < 100 || Na > 180) return { error: "Sodium must be 100 to 180 mEq/L." };
  if (!Number.isFinite(Cl) || Cl < 70 || Cl > 140) return { error: "Chloride must be 70 to 140 mEq/L." };
  if (!Number.isFinite(HCO3) || HCO3 < 2 || HCO3 > 50) return { error: "Bicarbonate must be 2 to 50 mEq/L." };
  const has_k = k !== "" && k !== undefined && k !== null;
  const K = has_k ? Number(k) : null;
  if (has_k && (!Number.isFinite(K) || K < 1 || K > 10)) return { error: "Potassium must be 1 to 10 mEq/L (leave blank to omit)." };
  const has_alb = albumin_g_dL !== "" && albumin_g_dL !== undefined && albumin_g_dL !== null;
  const Alb = has_alb ? Number(albumin_g_dL) : null;
  if (has_alb && (!Number.isFinite(Alb) || Alb < 0.5 || Alb > 7)) return { error: "Albumin must be 0.5 to 7 g/dL (leave blank to skip correction)." };
  const ag_no_k = Na - (Cl + HCO3);
  const ag_with_k = has_k ? (Na + K) - (Cl + HCO3) : null;
  const ag_corrected = has_alb ? ag_no_k + 2.5 * (4.0 - Alb) : null;
  // Band per the no-K AG (most US labs report this variant):
  let band;
  if (ag_no_k < 8) band = "low (< 8): hypoalbuminemia, paraproteinemia, or lab artifact";
  else if (ag_no_k <= 12) band = "normal (8-12)";
  else if (ag_no_k <= 20) band = "elevated (13-20): consider high-AG metabolic acidosis (MUDPILES)";
  else band = "high (> 20): high-AG metabolic acidosis likely";
  return {
    na: Na, cl: Cl, hco3: HCO3, k: K, albumin_g_dL: Alb,
    anion_gap: ag_no_k,
    anion_gap_with_k: ag_with_k,
    anion_gap_corrected: ag_corrected,
    band,
  };
}

export const anionGapExample = {
  inputs: { na: 140, cl: 104, hco3: 24 },
  // 140 - (104 + 24) = 12.
  expected: { anion_gap: 12 },
};

export function renderAnionGap(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("anion-gap");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: AG = Na - (Cl + HCO3). Optional K-included variant AG_K = (Na + K) - (Cl + HCO3). Reference range (no K) 8-12 mEq/L; with K 12-16. Albumin correction per Figge et al., J Lab Clin Med 1998: AG_corrected = AG + 2.5 * (4.0 - albumin_g_dL). Receiving facility governs interpretation; this tile is the structured arithmetic.";
  const N = makeNumber("Sodium (Na, mEq/L)", "ag-na", { step: "any", min: "100", max: "180" });
  const C = makeNumber("Chloride (Cl, mEq/L)", "ag-cl", { step: "any", min: "70", max: "140" });
  const B = makeNumber("Bicarbonate (HCO3, mEq/L)", "ag-hco3", { step: "any", min: "2", max: "50" });
  const K = makeNumber("Potassium (K, mEq/L; optional for K-included AG)", "ag-k", { step: "any", min: "1", max: "10" });
  const A = makeNumber("Albumin (g/dL; optional for correction)", "ag-alb", { step: "any", min: "0.5", max: "7" });
  for (const f of [N, C, B, K, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    N.input.value = String(anionGapExample.inputs.na);
    C.input.value = String(anionGapExample.inputs.cl);
    B.input.value = String(anionGapExample.inputs.hco3);
    K.input.value = ""; A.input.value = "";
    update();
  });
  const oAG = makeOutputLine(outputRegion, "Anion gap (mEq/L)", "ag-out-ag");
  const oAGK = makeOutputLine(outputRegion, "Anion gap with K (mEq/L)", "ag-out-agk");
  const oAGC = makeOutputLine(outputRegion, "Albumin-corrected AG", "ag-out-agc");
  const oBand = makeOutputLine(outputRegion, "Band", "ag-out-band");
  const update = debounce(() => {
    const r = computeAnionGap({
      na: N.input.value, cl: C.input.value, hco3: B.input.value,
      k: K.input.value, albumin_g_dL: A.input.value,
    });
    if (r.error) {
      oAG.textContent = r.error;
      for (const o of [oAGK, oAGC, oBand]) o.textContent = "-";
      return;
    }
    oAG.textContent = fmt(r.anion_gap, 1);
    oAGK.textContent = r.anion_gap_with_k === null ? "(K not entered)" : fmt(r.anion_gap_with_k, 1);
    oAGC.textContent = r.anion_gap_corrected === null ? "(albumin not entered)" : fmt(r.anion_gap_corrected, 1);
    oBand.textContent = r.band;
  }, DEBOUNCE_MS);
  for (const el of [N.input, C.input, B.input, K.input, A.input]) el.addEventListener("input", update);
}

// ====================================================================
// V.14 Corrected calcium (for albumin)
// ====================================================================
//
// Payne formula (Payne et al., BMJ 1973):
//   Ca_corrected_mg_dL = Ca_measured + 0.8 * (4.0 - albumin_g_dL)
// Adjusts the total-calcium for the albumin-bound fraction. Ionized
// calcium (the physiologically active form) is the gold standard and
// is unaffected by albumin; the Payne correction is a screening
// adjustment, not a substitute for an ionized-Ca measurement.

export function computeCorrectedCalcium({ ca_measured, albumin_g_dL }) {
  const Ca = Number(ca_measured);
  const Alb = Number(albumin_g_dL);
  if (!Number.isFinite(Ca) || Ca < 4 || Ca > 20) return { error: "Measured calcium must be 4 to 20 mg/dL." };
  if (!Number.isFinite(Alb) || Alb < 0.5 || Alb > 7) return { error: "Albumin must be 0.5 to 7 g/dL." };
  const corrected = Ca + 0.8 * (4.0 - Alb);
  let band;
  if (corrected < 8.5) band = "low (< 8.5 mg/dL): hypocalcemia; check ionized Ca";
  else if (corrected <= 10.5) band = "normal (8.5-10.5 mg/dL)";
  else band = "high (> 10.5 mg/dL): hypercalcemia; check ionized Ca";
  return {
    ca_measured: Ca, albumin_g_dL: Alb,
    ca_corrected_mg_dL: corrected,
    adjustment: corrected - Ca,
    band,
  };
}

export const correctedCalciumExample = {
  inputs: { ca_measured: 8.0, albumin_g_dL: 2.0 },
  // 8.0 + 0.8 * (4.0 - 2.0) = 8.0 + 1.6 = 9.6.
  expected: { ca_corrected_mg_dL: 9.6 },
};

export function renderCorrectedCalcium(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("corrected-calcium");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Payne et al., 'Interpretation of serum calcium in patients with abnormal serum proteins,' BMJ 4:5893 (1973). Ca_corrected = Ca_measured + 0.8 * (4.0 - albumin_g_dL). The correction is a screening adjustment; ionized calcium is the physiologically active form and is the gold-standard measurement.";
  const Ca = makeNumber("Measured total calcium (mg/dL)", "cc-ca", { step: "any", min: "4", max: "20" });
  const A = makeNumber("Albumin (g/dL)", "cc-alb", { step: "any", min: "0.5", max: "7" });
  for (const f of [Ca, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    Ca.input.value = String(correctedCalciumExample.inputs.ca_measured);
    A.input.value = String(correctedCalciumExample.inputs.albumin_g_dL);
    update();
  });
  const oCorr = makeOutputLine(outputRegion, "Corrected calcium (mg/dL)", "cc-out-corr");
  const oAdj = makeOutputLine(outputRegion, "Albumin adjustment applied", "cc-out-adj");
  const oBand = makeOutputLine(outputRegion, "Band", "cc-out-band");
  const update = debounce(() => {
    const r = computeCorrectedCalcium({ ca_measured: Ca.input.value, albumin_g_dL: A.input.value });
    if (r.error) {
      oCorr.textContent = r.error; oAdj.textContent = "-"; oBand.textContent = "-";
      return;
    }
    oCorr.textContent = fmt(r.ca_corrected_mg_dL, 2);
    oAdj.textContent = (r.adjustment >= 0 ? "+" : "") + fmt(r.adjustment, 2) + " mg/dL";
    oBand.textContent = r.band;
  }, DEBOUNCE_MS);
  for (const el of [Ca.input, A.input]) el.addEventListener("input", update);
}

// ====================================================================
// V.16 CHA2DS2-VASc score (atrial fibrillation stroke risk)
// ====================================================================
//
// Lip et al., Chest 137:2 (2010). Atrial-fibrillation stroke-risk
// stratification:
//   C  Congestive heart failure       1
//   H  Hypertension                   1
//   A2 Age >= 75                      2
//   D  Diabetes                       1
//   S2 Prior stroke / TIA / TE        2
//   V  Vascular disease (MI, PAD, ao) 1
//   A  Age 65-74                      1
//   Sc Sex (female)                   1
// Maximum 9. AHA / ACC / HRS 2019 guideline: men >=2 and women >=3
// warrant oral anticoagulation; men ==1 and women ==2 are "consider."

export function computeCHA2DS2VASc({ chf, htn, age, diabetes, stroke_history, vascular, sex }) {
  const ageN = Number(age);
  if (!Number.isFinite(ageN) || ageN < 18 || ageN > 120) return { error: "Age must be 18 to 120." };
  const S = String(sex).toLowerCase();
  if (S !== "male" && S !== "female") return { error: "Sex must be 'male' or 'female'." };
  const truthy = (v) => v === true || v === "true" || v === 1 || v === "1";
  const parts = [];
  let score = 0;
  if (truthy(chf)) { parts.push({ k: "C (CHF)", v: 1 }); score += 1; }
  if (truthy(htn)) { parts.push({ k: "H (hypertension)", v: 1 }); score += 1; }
  if (ageN >= 75) { parts.push({ k: "A2 (age >= 75)", v: 2 }); score += 2; }
  else if (ageN >= 65) { parts.push({ k: "A (age 65-74)", v: 1 }); score += 1; }
  if (truthy(diabetes)) { parts.push({ k: "D (diabetes)", v: 1 }); score += 1; }
  if (truthy(stroke_history)) { parts.push({ k: "S2 (prior stroke / TIA / TE)", v: 2 }); score += 2; }
  if (truthy(vascular)) { parts.push({ k: "V (vascular disease)", v: 1 }); score += 1; }
  if (S === "female") { parts.push({ k: "Sc (female sex)", v: 1 }); score += 1; }
  // 2019 AHA / ACC / HRS recommendation bands:
  let recommendation;
  if (S === "male") {
    if (score >= 2) recommendation = "Score >= 2 (men): oral anticoagulation recommended.";
    else if (score === 1) recommendation = "Score 1 (men): consider oral anticoagulation; shared decision-making.";
    else recommendation = "Score 0 (men): no anticoagulation per current guideline.";
  } else {
    if (score >= 3) recommendation = "Score >= 3 (women): oral anticoagulation recommended.";
    else if (score === 2) recommendation = "Score 2 (women): consider oral anticoagulation; shared decision-making.";
    else recommendation = "Score 0-1 (women): no anticoagulation per current guideline.";
  }
  return { score, max: 9, components: parts, sex: S, age: ageN, recommendation };
}

export const cha2ds2vascExample = {
  inputs: { chf: false, htn: true, age: 70, diabetes: true, stroke_history: false, vascular: false, sex: "male" },
  // H (1) + A 65-74 (1) + D (1) = 3.
  expected: { score: 3 },
};

const YN_OPTS = [{ value: "false", label: "No" }, { value: "true", label: "Yes" }];
const SEX_OPTS = [{ value: "male", label: "Male" }, { value: "female", label: "Female" }];

export function renderCHA2DS2VASc(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("cha2ds2-vasc");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Lip et al., 'Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation,' Chest 137:2 (2010). Anticoagulation thresholds per the 2019 AHA / ACC / HRS Focused Update on AF (Circulation). Free at heart.org and circulation-online. Treating cardiologist or anticoagulation clinic governs.";
  const C = makeSelect("Congestive heart failure", "cv-c", YN_OPTS);
  const H = makeSelect("Hypertension (treated or systolic >= 140 / diastolic >= 90)", "cv-h", YN_OPTS);
  const A = makeNumber("Age (years)", "cv-a", { step: "1", min: "18", max: "120" });
  const D = makeSelect("Diabetes mellitus", "cv-d", YN_OPTS);
  const S = makeSelect("Prior stroke / TIA / thromboembolism", "cv-s", YN_OPTS);
  const V = makeSelect("Vascular disease (prior MI, PAD, aortic plaque)", "cv-v", YN_OPTS);
  const X = makeSelect("Sex", "cv-x", SEX_OPTS);
  for (const f of [C, H, A, D, S, V, X]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    C.select.value = "false"; H.select.value = "true";
    A.input.value = String(cha2ds2vascExample.inputs.age);
    D.select.value = "true"; S.select.value = "false"; V.select.value = "false";
    X.select.value = "male";
    update();
  });
  const oScore = makeOutputLine(outputRegion, "CHA2DS2-VASc score (0-9)", "cv-out-score");
  const oParts = makeOutputLine(outputRegion, "Components contributing", "cv-out-parts");
  const oRec = makeOutputLine(outputRegion, "Guideline recommendation", "cv-out-rec");
  const update = debounce(() => {
    const r = computeCHA2DS2VASc({
      chf: C.select.value, htn: H.select.value, age: A.input.value, diabetes: D.select.value,
      stroke_history: S.select.value, vascular: V.select.value, sex: X.select.value,
    });
    if (r.error) {
      oScore.textContent = r.error; oParts.textContent = "-"; oRec.textContent = "-";
      return;
    }
    oScore.textContent = String(r.score) + " of " + r.max;
    oParts.textContent = r.components.length === 0 ? "(none)" : r.components.map((p) => p.k + " +" + p.v).join(", ");
    oRec.textContent = r.recommendation;
  }, DEBOUNCE_MS);
  for (const el of [A.input]) el.addEventListener("input", update);
  for (const sel of [C.select, H.select, D.select, S.select, V.select, X.select]) sel.addEventListener("change", update);
}

// ====================================================================
// V.17 Wells DVT score (Wells DVT Criteria)
// ====================================================================
//
// Per Wells, Anderson, Rodger, et al., 'Value of assessment of pretest
// probability of deep-vein thrombosis in clinical management,' Lancet
// 350:9094 (1997), with the 2003 modification (Wells et al., New
// England Journal of Medicine 349:13). Score bands: low <= 0;
// moderate 1-2; high >= 3 (original 3-band); two-band variant per
// the 2003 modification: DVT unlikely <= 1, likely >= 2.

function toBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

const WELLS_DVT_CRITERIA = [
  { key: "active_cancer",                 label: "Active cancer (treatment ongoing or within 6 mo, or palliative)", points: 1 },
  { key: "paralysis_paresis",             label: "Paralysis, paresis, or recent plaster immobilization of leg",      points: 1 },
  { key: "bedridden_or_surgery",          label: "Recently bedridden >= 3 days, or major surgery within 12 weeks",   points: 1 },
  { key: "tenderness_deep_venous_system", label: "Localized tenderness along the deep venous system",                points: 1 },
  { key: "entire_leg_swollen",            label: "Entire leg swollen",                                               points: 1 },
  { key: "calf_swelling_3cm",             label: "Calf swelling >= 3 cm vs. asymptomatic side (measured 10 cm below tibial tuberosity)", points: 1 },
  { key: "pitting_edema_symptomatic_leg", label: "Pitting edema (greater on symptomatic leg)",                       points: 1 },
  { key: "collateral_superficial_veins",  label: "Collateral superficial veins (non-varicose)",                      points: 1 },
  { key: "prior_dvt",                     label: "Previously documented DVT (Wells 2003 modification)",              points: 1 },
  { key: "alternative_diagnosis_likely",  label: "Alternative diagnosis at least as likely as DVT",                  points: -2 },
];

export function computeWellsDVT(input) {
  const components = [];
  let score = 0;
  for (const c of WELLS_DVT_CRITERIA) {
    if (toBool(input[c.key])) {
      components.push({ label: c.label, points: c.points });
      score += c.points;
    }
  }
  let band_two, band_three;
  band_two = score >= 2 ? "DVT likely (Wells 2003 modification, two-band)" : "DVT unlikely (Wells 2003 modification, two-band)";
  if (score <= 0) band_three = "Low pretest probability (original three-band)";
  else if (score <= 2) band_three = "Moderate pretest probability (original three-band)";
  else band_three = "High pretest probability (original three-band)";
  return { score, components, band_two, band_three, recommendation: score >= 2 ? "DVT likely -> proximal compression ultrasound; consider D-dimer per local protocol." : "DVT unlikely -> sensitive D-dimer (high-sensitivity assay); if negative, DVT effectively excluded per Wells 2003." };
}

export const wellsDVTExample = {
  inputs: { active_cancer: true, calf_swelling_3cm: true, entire_leg_swollen: false, prior_dvt: true, alternative_diagnosis_likely: false },
  // Active cancer (1) + calf swelling (1) + prior DVT (1) = 3. High; likely.
  expected: { score: 3 },
};

export function renderWellsDVT(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("wells-dvt");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Wells et al., 'Value of assessment of pretest probability of deep-vein thrombosis in clinical management,' Lancet 350:9094 (1997). 2003 modification per Wells et al., NEJM 349:13. Bands and follow-on testing per the modern ACEP and ACCP guidelines. Free at PubMed (PMID 9351504, PMID 14507948).";
  const fields = WELLS_DVT_CRITERIA.map((c) => ({ c, field: makeSelect(c.label, "wdvt-" + c.key, YN_OPTS) }));
  for (const f of fields) inputRegion.appendChild(f.field.wrap);
  attachExampleButton(inputRegion, () => {
    for (const f of fields) f.field.select.value = "false";
    for (const k of ["active_cancer", "calf_swelling_3cm", "prior_dvt"]) {
      const m = fields.find((x) => x.c.key === k);
      if (m) m.field.select.value = "true";
    }
    update();
  });
  const oScore = makeOutputLine(outputRegion, "Wells DVT score", "wdvt-out-score");
  const oTwo = makeOutputLine(outputRegion, "Two-band (Wells 2003)", "wdvt-out-2");
  const oThree = makeOutputLine(outputRegion, "Three-band (original)", "wdvt-out-3");
  const oRec = makeOutputLine(outputRegion, "Recommended next step", "wdvt-out-rec");
  const update = debounce(() => {
    const inputObj = {};
    for (const f of fields) inputObj[f.c.key] = f.field.select.value;
    const r = computeWellsDVT(inputObj);
    oScore.textContent = String(r.score);
    oTwo.textContent = r.band_two;
    oThree.textContent = r.band_three;
    oRec.textContent = r.recommendation;
  }, DEBOUNCE_MS);
  for (const f of fields) f.field.select.addEventListener("change", update);
}

// ====================================================================
// V.18 Wells PE score (Wells Criteria for Pulmonary Embolism)
// ====================================================================
//
// Per Wells et al., 'Derivation of a simple clinical model to
// categorize patients probability of pulmonary embolism,' Thrombosis
// and Haemostasis 83:3 (2000), with subsequent two-band simplification
// (>= 4.5 'PE likely'; < 4.5 'PE unlikely') and three-band stratification
// (low < 2; moderate 2-6; high > 6).

const WELLS_PE_CRITERIA = [
  { key: "clinical_signs_dvt",            label: "Clinical signs and symptoms of DVT (leg swelling + pain on palpation)", points: 3 },
  { key: "alternative_diagnosis_less_likely", label: "Alternative diagnosis less likely than PE",                            points: 3 },
  { key: "hr_over_100",                   label: "Heart rate > 100 bpm",                                                 points: 1.5 },
  { key: "immobilization_or_surgery",     label: "Immobilization >= 3 days or surgery in past 4 weeks",                   points: 1.5 },
  { key: "prior_dvt_pe",                  label: "Previous DVT or PE",                                                   points: 1.5 },
  { key: "hemoptysis",                    label: "Hemoptysis",                                                            points: 1 },
  { key: "malignancy",                    label: "Malignancy (on treatment, treated in last 6 mo, or palliative)",        points: 1 },
];

export function computeWellsPE(input) {
  const components = [];
  let score = 0;
  for (const c of WELLS_PE_CRITERIA) {
    if (toBool(input[c.key])) {
      components.push({ label: c.label, points: c.points });
      score += c.points;
    }
  }
  let band_two = score >= 4.5 ? "PE likely (two-band)" : "PE unlikely (two-band)";
  let band_three;
  if (score < 2) band_three = "Low (three-band)";
  else if (score <= 6) band_three = "Moderate (three-band)";
  else band_three = "High (three-band)";
  const recommendation = band_two.startsWith("PE likely")
    ? "PE likely -> CT pulmonary angiogram (or V/Q if contrast contraindicated)."
    : "PE unlikely -> high-sensitivity D-dimer; if negative, PE effectively excluded per the modern ACEP / ESC guideline.";
  return { score, components, band_two, band_three, recommendation };
}

export const wellsPEExample = {
  inputs: { clinical_signs_dvt: true, alternative_diagnosis_less_likely: true, hr_over_100: true, immobilization_or_surgery: false, prior_dvt_pe: false, hemoptysis: false, malignancy: false },
  // Signs of DVT (3) + alt dx less likely (3) + HR > 100 (1.5) = 7.5. High; likely.
  expected: { score: 7.5 },
};

export function renderWellsPE(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("wells-pe");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Wells et al., 'Derivation of a simple clinical model to categorize patients probability of pulmonary embolism,' Thrombosis and Haemostasis 83:3 (2000). Two-band and three-band cutpoints per modern ACEP and ESC pulmonary-embolism guidelines. Free at PubMed (PMID 10744147).";
  const fields = WELLS_PE_CRITERIA.map((c) => ({ c, field: makeSelect(c.label, "wpe-" + c.key, YN_OPTS) }));
  for (const f of fields) inputRegion.appendChild(f.field.wrap);
  attachExampleButton(inputRegion, () => {
    for (const f of fields) f.field.select.value = "false";
    for (const k of ["clinical_signs_dvt", "alternative_diagnosis_less_likely", "hr_over_100"]) {
      const m = fields.find((x) => x.c.key === k);
      if (m) m.field.select.value = "true";
    }
    update();
  });
  const oScore = makeOutputLine(outputRegion, "Wells PE score", "wpe-out-score");
  const oTwo = makeOutputLine(outputRegion, "Two-band cutpoint", "wpe-out-2");
  const oThree = makeOutputLine(outputRegion, "Three-band cutpoint", "wpe-out-3");
  const oRec = makeOutputLine(outputRegion, "Recommended next step", "wpe-out-rec");
  const update = debounce(() => {
    const inputObj = {};
    for (const f of fields) inputObj[f.c.key] = f.field.select.value;
    const r = computeWellsPE(inputObj);
    oScore.textContent = fmt(r.score, 1);
    oTwo.textContent = r.band_two;
    oThree.textContent = r.band_three;
    oRec.textContent = r.recommendation;
  }, DEBOUNCE_MS);
  for (const f of fields) f.field.select.addEventListener("change", update);
}

// ====================================================================
// V.19 PERC rule (Pulmonary Embolism Rule-Out Criteria)
// ====================================================================
//
// Per Kline et al., 'Clinical criteria to prevent unnecessary diagnostic
// testing in emergency department patients with suspected pulmonary
// embolism,' Journal of Thrombosis and Haemostasis 2:8 (2004), with
// the validation cohort in Annals of Emergency Medicine (2008). The
// PERC rule applies ONLY to low-pretest-probability patients (Wells PE
// < 2 or gestalt low risk). All 8 criteria must be ABSENT for PERC to
// 'rule out' PE without D-dimer.

const PERC_CRITERIA = [
  { key: "age_under_50",       label: "Age < 50" },
  { key: "hr_under_100",       label: "Heart rate < 100 bpm" },
  { key: "spo2_ge_95",         label: "Pulse oximetry >= 95% on room air" },
  { key: "no_hemoptysis",      label: "No hemoptysis" },
  { key: "no_estrogen",        label: "No exogenous estrogen (OCP / HRT)" },
  { key: "no_prior_dvt_pe",    label: "No prior DVT / PE" },
  { key: "no_recent_surgery_or_trauma", label: "No recent surgery / trauma requiring hospitalization within 4 wk" },
  { key: "no_unilateral_leg_swelling",  label: "No unilateral leg swelling" },
];

export function computePERC(input) {
  // PERC 'rule out' fires only when ALL 8 criteria are TRUE (present in the
  // affirmative form above). If any is false, PERC is positive and does NOT
  // rule out PE.
  const failures = [];
  let satisfied = 0;
  for (const c of PERC_CRITERIA) {
    if (toBool(input[c.key])) satisfied += 1;
    else failures.push(c.label);
  }
  const all_satisfied = satisfied === PERC_CRITERIA.length;
  return {
    satisfied,
    total: PERC_CRITERIA.length,
    all_satisfied,
    failures,
    band: all_satisfied
      ? "PERC negative: in a low-pretest-probability patient, PE can be ruled out without D-dimer."
      : "PERC positive (at least one criterion not met): does NOT rule out PE; pursue D-dimer +/- CTPA per Wells PE band.",
    pretest_caveat: "PERC applies ONLY to a population with low pretest probability (Wells PE < 2 or gestalt low risk). A high pretest probability patient is NOT a candidate for PERC even if all 8 criteria are met.",
  };
}

export const percExample = {
  inputs: { age_under_50: true, hr_under_100: true, spo2_ge_95: true, no_hemoptysis: true, no_estrogen: true, no_prior_dvt_pe: true, no_recent_surgery_or_trauma: true, no_unilateral_leg_swelling: true },
  expected: { all_satisfied: true, satisfied: 8 },
};

export function renderPERC(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("perc-rule");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Kline et al., 'Clinical criteria to prevent unnecessary diagnostic testing in emergency department patients with suspected pulmonary embolism,' Journal of Thrombosis and Haemostasis 2:8 (2004). Validation per Kline et al., Annals of Emergency Medicine (2008). Free at PubMed (PMID 15304025, PMID 18249480).";
  const fields = PERC_CRITERIA.map((c) => ({ c, field: makeSelect(c.label, "perc-" + c.key, YN_OPTS) }));
  for (const f of fields) inputRegion.appendChild(f.field.wrap);
  attachExampleButton(inputRegion, () => {
    for (const f of fields) f.field.select.value = "true";
    update();
  });
  const oSat = makeOutputLine(outputRegion, "Criteria satisfied", "perc-out-sat");
  const oBand = makeOutputLine(outputRegion, "PERC verdict", "perc-out-band");
  const oFail = makeOutputLine(outputRegion, "Failures (if any)", "perc-out-fail");
  const oCaveat = makeOutputLine(outputRegion, "Pretest-probability caveat", "perc-out-caveat");
  const update = debounce(() => {
    const inputObj = {};
    for (const f of fields) inputObj[f.c.key] = f.field.select.value;
    const r = computePERC(inputObj);
    oSat.textContent = String(r.satisfied) + " of " + r.total;
    oBand.textContent = r.band;
    oFail.textContent = r.failures.length === 0 ? "(none)" : r.failures.join(" | ");
    oCaveat.textContent = r.pretest_caveat;
  }, DEBOUNCE_MS);
  for (const f of fields) f.field.select.addEventListener("change", update);
}

// ====================================================================
// V.3 Rule of 9s / Lund-Browder TBSA
// ====================================================================
//
// Total body surface area burned (TBSA) is the input to the Parkland
// formula (V.2). Two parallel published estimators:
//
//   Rule of 9s (Pulaski & Tennison, 1947). Adult body broken into
//     9-percent multiples:
//       head           9   (4.5 front + 4.5 back)
//       each arm       9   (4.5 front + 4.5 back)
//       anterior trunk 18
//       posterior trunk 18
//       each leg       18  (9 front + 9 back)
//       perineum       1
//
//   Lund-Browder (Lund & Browder, Annals of Surgery, 1944). Age-banded
//     correction: the head is proportionally larger and the legs
//     proportionally smaller in young children. The tile applies the
//     LB head and leg percents for adult (>= 15 yr), child (5-14),
//     and infant (0-4) when the user selects "Lund-Browder."
//
// The user toggles burned regions; the tile sums to a TBSA total
// per the chosen method.

// Region table: each entry has the percent per method.
// "ad" = adult / rule-of-9s; "lb_a" = LB adult; "lb_c" = LB child
// (5-14); "lb_i" = LB infant (0-4).
const TBSA_REGIONS = [
  { key: "head_front",   label: "Head, anterior (face / scalp front)",  ad: 4.5, lb_a: 3.5, lb_c: 6.5,  lb_i: 8.5 },
  { key: "head_back",    label: "Head, posterior (scalp back)",         ad: 4.5, lb_a: 3.5, lb_c: 6.5,  lb_i: 8.5 },
  { key: "arm_l_front",  label: "Left arm, anterior",                    ad: 4.5, lb_a: 4,   lb_c: 4,    lb_i: 4 },
  { key: "arm_l_back",   label: "Left arm, posterior",                   ad: 4.5, lb_a: 4,   lb_c: 4,    lb_i: 4 },
  { key: "arm_r_front",  label: "Right arm, anterior",                   ad: 4.5, lb_a: 4,   lb_c: 4,    lb_i: 4 },
  { key: "arm_r_back",   label: "Right arm, posterior",                  ad: 4.5, lb_a: 4,   lb_c: 4,    lb_i: 4 },
  { key: "trunk_front",  label: "Anterior trunk",                        ad: 18,  lb_a: 13,  lb_c: 13,   lb_i: 13 },
  { key: "trunk_back",   label: "Posterior trunk",                       ad: 18,  lb_a: 13,  lb_c: 13,   lb_i: 13 },
  { key: "leg_l_front",  label: "Left leg, anterior",                    ad: 9,   lb_a: 9.5, lb_c: 8.5,  lb_i: 6.5 },
  { key: "leg_l_back",   label: "Left leg, posterior",                   ad: 9,   lb_a: 9.5, lb_c: 8.5,  lb_i: 6.5 },
  { key: "leg_r_front",  label: "Right leg, anterior",                   ad: 9,   lb_a: 9.5, lb_c: 8.5,  lb_i: 6.5 },
  { key: "leg_r_back",   label: "Right leg, posterior",                  ad: 9,   lb_a: 9.5, lb_c: 8.5,  lb_i: 6.5 },
  { key: "perineum",     label: "Perineum / genitalia",                  ad: 1,   lb_a: 1,   lb_c: 1,    lb_i: 1 },
];

export function computeRuleOf9s(input) {
  const method = input && input.method ? String(input.method) : "rule_of_9s";
  const age_band = input && input.age_band ? String(input.age_band) : "adult";
  const pickField = (r) => {
    if (method === "rule_of_9s") return r.ad;
    if (age_band === "infant") return r.lb_i;
    if (age_band === "child") return r.lb_c;
    return r.lb_a;
  };
  const components = [];
  let total = 0;
  for (const r of TBSA_REGIONS) {
    if (toBool(input[r.key])) {
      const pct = pickField(r);
      total += pct;
      components.push({ label: r.label, percent: pct });
    }
  }
  if (total > 100) {
    return { total, components, method, age_band, error: "Selected regions exceed 100% TBSA; recheck region toggles." };
  }
  return {
    total,
    components,
    method,
    age_band,
    band:
      total >= 20
        ? "Major burn (>= 20% TBSA): meets ABA major-burn criterion. Transfer to a verified burn center per ABA guidelines."
        : total >= 10
          ? "Moderate burn (10-19% TBSA): IV fluids per Parkland; consider burn-center consult."
          : "Minor TBSA (< 10%): IV fluids may not be required by Parkland threshold; clinician judgment governs.",
  };
}

export const ruleOf9sExample = {
  inputs: { method: "rule_of_9s", age_band: "adult", arm_l_front: true, arm_l_back: true, trunk_front: true },
  // Adult: 4.5 + 4.5 + 18 = 27%.
  expected: { total: 27 },
};

export function renderRuleOf9s(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("rule-of-9s");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Rule of 9s per Pulaski & Tennison (1947); Lund-Browder chart per Lund & Browder, Annals of Surgery 79:3 (1944). Both adopted by the American Burn Association. Major-burn (>= 20% TBSA) and burn-center-transfer criteria per ABA Resources for Optimal Care of the Burn Injured Patient (2014).";
  const METHOD = makeSelect("Method", "tbsa-method", [
    { value: "rule_of_9s",   label: "Rule of 9s (adult)" },
    { value: "lund_browder", label: "Lund-Browder (age-banded)" },
  ]);
  const AGE = makeSelect("Age band (Lund-Browder only)", "tbsa-age", [
    { value: "adult",  label: "Adult (>= 15 yr)" },
    { value: "child",  label: "Child (5-14 yr)" },
    { value: "infant", label: "Infant / young child (0-4 yr)" },
  ]);
  inputRegion.appendChild(METHOD.wrap);
  inputRegion.appendChild(AGE.wrap);
  const fields = TBSA_REGIONS.map((r) => ({ r, field: makeSelect(r.label, "tbsa-" + r.key, YN_OPTS) }));
  for (const f of fields) inputRegion.appendChild(f.field.wrap);
  attachExampleButton(inputRegion, () => {
    METHOD.select.value = "rule_of_9s";
    AGE.select.value = "adult";
    for (const f of fields) f.field.select.value = "false";
    for (const k of ["arm_l_front", "arm_l_back", "trunk_front"]) {
      const m = fields.find((x) => x.r.key === k);
      if (m) m.field.select.value = "true";
    }
    update();
  });
  const oTotal = makeOutputLine(outputRegion, "Total TBSA (percent)", "tbsa-out-total");
  const oBand = makeOutputLine(outputRegion, "Severity band", "tbsa-out-band");
  const oList = makeOutputLine(outputRegion, "Regions counted", "tbsa-out-list");
  const update = debounce(() => {
    const inputObj = { method: METHOD.select.value, age_band: AGE.select.value };
    for (const f of fields) inputObj[f.r.key] = f.field.select.value;
    const r = computeRuleOf9s(inputObj);
    if (r.error) {
      oTotal.textContent = fmt(r.total, 1) + " %";
      oBand.textContent = r.error;
      oList.textContent = "-";
      return;
    }
    oTotal.textContent = fmt(r.total, 1) + " %";
    oBand.textContent = r.band;
    oList.textContent = r.components.length === 0 ? "(none)" : r.components.map((c) => c.label + " (" + fmt(c.percent, 1) + " %)").join(" | ");
  }, DEBOUNCE_MS);
  for (const sel of [METHOD.select, AGE.select, ...fields.map((f) => f.field.select)]) {
    sel.addEventListener("change", update);
  }
}

// ====================================================================
// V.15 Pediatric vital signs reference (AHA PALS)
// ====================================================================
//
// Reference table of HR, RR, and SBP normal ranges by age band per
// the American Heart Association PALS Provider Manual (2020). The
// tile is a lookup, not a calculation; the medical director and the
// receiving facility govern any clinical action.

const PEDS_VITALS = [
  { key: "neonate",   label: "Neonate (0-28 days)",     hr: "100-205 (awake) / 90-160 (asleep)", rr: "30-60", sbp: "67-84",  notes: "Newborn term." },
  { key: "infant",    label: "Infant (1-12 mo)",         hr: "100-180 / 90-160",                   rr: "30-53", sbp: "72-104", notes: "" },
  { key: "toddler",   label: "Toddler (1-2 yr)",         hr: "98-140 / 80-120",                    rr: "22-37", sbp: "86-106", notes: "" },
  { key: "preschool", label: "Preschool (3-5 yr)",       hr: "80-120 / 65-100",                    rr: "20-28", sbp: "89-112", notes: "" },
  { key: "school",    label: "School age (6-11 yr)",     hr: "75-118 / 58-90",                     rr: "18-25", sbp: "97-115", notes: "" },
  { key: "adolescent", label: "Adolescent (12-15 yr)",   hr: "60-100 / 50-90",                     rr: "12-20", sbp: "110-131", notes: "" },
];

export function computePedsVitals(input) {
  const band = input && input.age_band ? String(input.age_band) : "neonate";
  const row = PEDS_VITALS.find((b) => b.key === band);
  if (!row) return { error: "Select an age band." };
  // Hypotensive-SBP cutoff per PALS: < 60 (neonate), < 70 (infant), < 70 + 2*age (1-10 yr), < 90 (>= 10 yr).
  let hypotension_sbp;
  if (band === "neonate") hypotension_sbp = "SBP < 60 mmHg";
  else if (band === "infant") hypotension_sbp = "SBP < 70 mmHg";
  else if (band === "toddler") hypotension_sbp = "SBP < 70 + 2*age (~ < 74 at 2 yr)";
  else if (band === "preschool") hypotension_sbp = "SBP < 70 + 2*age (~ < 80 at 5 yr)";
  else if (band === "school") hypotension_sbp = "SBP < 70 + 2*age up to age 10 (~ < 90)";
  else hypotension_sbp = "SBP < 90 mmHg";
  return {
    band: row.key,
    label: row.label,
    hr_range: row.hr,
    rr_range: row.rr,
    sbp_range: row.sbp,
    hypotension_sbp,
    rows: PEDS_VITALS,
  };
}

export const pedsVitalsExample = {
  inputs: { age_band: "preschool" },
  // 3-5 yr per PALS: SBP normal band starts ~89.
  expected: { band: "preschool" },
};

export function renderPedsVitals(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("pediatric-vitals");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Pediatric vital-signs ranges per the American Heart Association PALS Provider Manual (2020 edition). Hypotensive-SBP definition per PALS: < 60 neonate, < 70 infant, < 70 + 2*age yr (1-10), < 90 (>= 10 yr). Receiving pediatric facility governs the clinical disposition.";
  const A = makeSelect("Age band", "pv-band", PEDS_VITALS.map((b) => ({ value: b.key, label: b.label })));
  inputRegion.appendChild(A.wrap);
  attachExampleButton(inputRegion, () => { A.select.value = pedsVitalsExample.inputs.age_band; update(); });
  const oLabel = makeOutputLine(outputRegion, "Age band", "pv-out-label");
  const oHR = makeOutputLine(outputRegion, "Heart rate (bpm; awake / asleep)", "pv-out-hr");
  const oRR = makeOutputLine(outputRegion, "Respiratory rate (breaths/min)", "pv-out-rr");
  const oSBP = makeOutputLine(outputRegion, "Systolic BP (mmHg, normal)", "pv-out-sbp");
  const oHypo = makeOutputLine(outputRegion, "Hypotensive-SBP cutoff (PALS)", "pv-out-hypo");
  const update = debounce(() => {
    const r = computePedsVitals({ age_band: A.select.value });
    if (r.error) { oLabel.textContent = r.error; for (const o of [oHR, oRR, oSBP, oHypo]) o.textContent = "-"; return; }
    oLabel.textContent = r.label;
    oHR.textContent = r.hr_range;
    oRR.textContent = r.rr_range;
    oSBP.textContent = r.sbp_range;
    oHypo.textContent = r.hypotension_sbp;
  }, DEBOUNCE_MS);
  A.select.addEventListener("change", update);
}

// ====================================================================
// V.20 NIH Stroke Scale (NIHSS)
// ====================================================================
//
// Per Brott et al., Stroke 20:7 (1989). Adopted by the AHA / ASA;
// public-domain instrument distributed by NIH. Fifteen items, each
// scored 0-N; total 0-42. Severity bands per the AHA/ASA literature:
//   0       no stroke symptoms
//   1-4     minor stroke
//   5-15    moderate stroke
//   16-20   moderate to severe stroke
//   21-42   severe stroke
//
// The tile is an arithmetic sum; the receiving stroke-center
// neurologist governs the clinical disposition and any tPA / EVT
// decision.

const NIHSS_ITEMS = [
  { key: "loc_consciousness",    label: "1a. Level of consciousness (0 alert ... 3 unresponsive)",         max: 3 },
  { key: "loc_questions",        label: "1b. LOC questions (0 both correct ... 2 neither)",                max: 2 },
  { key: "loc_commands",         label: "1c. LOC commands (0 both correct ... 2 neither)",                 max: 2 },
  { key: "best_gaze",            label: "2. Best gaze (0 normal ... 2 forced deviation)",                  max: 2 },
  { key: "visual",               label: "3. Visual fields (0 no loss ... 3 bilateral hemianopsia)",        max: 3 },
  { key: "facial_palsy",         label: "4. Facial palsy (0 normal ... 3 complete)",                      max: 3 },
  { key: "motor_arm_l",          label: "5a. Motor arm, left (0 no drift ... 4 no movement; 9 amputation)", max: 4 },
  { key: "motor_arm_r",          label: "5b. Motor arm, right (0 no drift ... 4 no movement; 9 amputation)", max: 4 },
  { key: "motor_leg_l",          label: "6a. Motor leg, left (0 no drift ... 4 no movement; 9 amputation)", max: 4 },
  { key: "motor_leg_r",          label: "6b. Motor leg, right (0 no drift ... 4 no movement; 9 amputation)", max: 4 },
  { key: "limb_ataxia",          label: "7. Limb ataxia (0 absent ... 2 present in two limbs)",            max: 2 },
  { key: "sensory",              label: "8. Sensory (0 normal ... 2 severe / total loss)",                 max: 2 },
  { key: "best_language",        label: "9. Best language (0 no aphasia ... 3 mute / global)",             max: 3 },
  { key: "dysarthria",           label: "10. Dysarthria (0 normal ... 2 severe; 9 intubated)",             max: 2 },
  { key: "extinction_inattention", label: "11. Extinction / inattention (0 normal ... 2 profound)",        max: 2 },
];

export function computeNIHSS(input) {
  const items = [];
  let total = 0;
  for (const it of NIHSS_ITEMS) {
    const raw = input ? input[it.key] : undefined;
    if (raw === undefined || raw === "" || raw === null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) return { error: it.label + ": expected a number." };
    // "9" is the published "untestable / amputation / intubated" code
    // for selected items; it is NOT added to the total.
    if (n === 9 && (it.key.startsWith("motor_") || it.key === "dysarthria")) {
      items.push({ label: it.label, score: 9, scored: false });
      continue;
    }
    if (n < 0 || n > it.max) {
      return { error: it.label + ": expected 0-" + it.max + " (or 9 for amputation / intubated, where applicable)." };
    }
    items.push({ label: it.label, score: n, scored: true });
    total += n;
  }
  let band;
  if (total === 0) band = "No stroke symptoms";
  else if (total <= 4) band = "Minor stroke";
  else if (total <= 15) band = "Moderate stroke";
  else if (total <= 20) band = "Moderate to severe stroke";
  else band = "Severe stroke";
  return { total, items, band, max_possible: 42 };
}

export const nihssExample = {
  // Canonical NIHSS scoring vignette: moderate left MCA syndrome.
  // 1a=1, 1b=1, 1c=0, 2=1, 3=2, 4=2, 5a=0, 5b=2, 6a=0, 6b=1,
  // 7=0, 8=1, 9=2, 10=1, 11=1 -> 15 (moderate stroke).
  inputs: {
    loc_consciousness: 1, loc_questions: 1, loc_commands: 0,
    best_gaze: 1, visual: 2, facial_palsy: 2,
    motor_arm_l: 0, motor_arm_r: 2, motor_leg_l: 0, motor_leg_r: 1,
    limb_ataxia: 0, sensory: 1, best_language: 2, dysarthria: 1,
    extinction_inattention: 1,
  },
  expected: { total: 15 },
};

export function renderNIHSS(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("nihss");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: Brott et al., 'Measurements of acute cerebral infarction: a clinical examination scale,' Stroke 20:7 (1989). Adopted by the AHA / ASA; instrument distributed by NIH (public domain). Severity bands per AHA / ASA stroke literature. Receiving stroke-center neurologist governs tPA / EVT decisions.";
  const fields = NIHSS_ITEMS.map((it) => ({
    it,
    field: makeNumber(it.label, "nihss-" + it.key, { step: "1", min: "0", max: "9", value: "" }),
  }));
  for (const f of fields) inputRegion.appendChild(f.field.wrap);
  attachExampleButton(inputRegion, () => {
    for (const f of fields) f.field.input.value = String(nihssExample.inputs[f.it.key]);
    update();
  });
  const oTotal = makeOutputLine(outputRegion, "NIHSS total (0-42)", "nihss-out-total");
  const oBand = makeOutputLine(outputRegion, "Severity band", "nihss-out-band");
  const oErr = makeOutputLine(outputRegion, "Validation", "nihss-out-err");
  const update = debounce(() => {
    const inputObj = {};
    for (const f of fields) inputObj[f.it.key] = f.field.input.value;
    const r = computeNIHSS(inputObj);
    if (r.error) {
      oTotal.textContent = "-";
      oBand.textContent = "-";
      oErr.textContent = r.error;
      return;
    }
    oTotal.textContent = String(r.total);
    oBand.textContent = r.band;
    oErr.textContent = "OK (items scored: " + r.items.filter((i) => i.scored).length + " of 15)";
  }, DEBOUNCE_MS);
  for (const f of fields) f.field.input.addEventListener("input", update);
}

// ====================================================================
// V.6 START / JumpSTART mass-casualty triage
// ====================================================================
//
// Simple Triage And Rapid Treatment (Newport Beach FD 1983; widely
// adopted). JumpSTART (Romig 1995) is the pediatric adaptation for
// patients <= 8 years old (or <= ~100 lb body habitus). Both produce
// a four-color tag: green (minor / walking wounded), yellow (delayed),
// red (immediate), black (deceased / expectant).
//
// Decision tree (adult START):
//   1) Walking?  yes -> GREEN.
//   2) Breathing? no -> reposition airway. Still no -> BLACK. Yes -> RED.
//   3) Respiratory rate > 30?  yes -> RED.
//   4) Perfusion (radial pulse OR cap refill <= 2s)?  no -> RED.
//   5) Mental status (obeys simple commands)?  no -> RED.
//   6) Otherwise -> YELLOW.
//
// JumpSTART (pediatric) differences:
//   - Apneic + with pulse: give 5 rescue breaths first. Still apneic -> BLACK.
//                          Resumed -> RED.
//   - Respiratory rate band 15-45 (RED if outside).
//   - Perfusion judged by palpable peripheral pulse (no cap-refill).
//   - Mental status via AVPU: A / V / appropriate-P -> YELLOW;
//                             inappropriate-P / U -> RED.
//
// The receiving incident commander governs final tag and disposition.

export function computeSTART(input) {
  const ped = input && (input.pediatric === true || input.pediatric === "true");
  // Walking
  if (toBool(input.walking)) {
    return { tag: "GREEN", path: ["Walking -> minor (green; re-evaluate)"], pediatric: ped };
  }
  const breathing = input.breathing; // "yes" / "no_now_yes_after_position" / "no"
  if (!breathing || breathing === "no") {
    if (ped) {
      // JumpSTART: pulse check, then 5 rescue breaths.
      if (!toBool(input.has_pulse)) {
        return { tag: "BLACK", path: ["Apneic + no pulse -> black (JumpSTART pediatric branch)"], pediatric: ped };
      }
      if (toBool(input.breaths_restored_after_5)) {
        return { tag: "RED", path: ["Apneic with pulse -> 5 rescue breaths -> breathing resumed -> red"], pediatric: ped };
      }
      return { tag: "BLACK", path: ["Apneic with pulse -> 5 rescue breaths failed -> black"], pediatric: ped };
    }
    return { tag: "BLACK", path: ["Apneic after airway repositioning -> black"], pediatric: ped };
  }
  if (breathing === "no_now_yes_after_position") {
    return { tag: "RED", path: ["Apneic until airway repositioned, now breathing -> red"], pediatric: ped };
  }
  // Breathing on own. Check RR.
  const rr = Number(input.resp_rate_per_min);
  if (!Number.isFinite(rr)) {
    return { error: "Respiratory rate (breaths/min) required when patient is breathing on own." };
  }
  const path = ["Walking? no", "Breathing on own? yes"];
  if (ped) {
    if (rr < 15 || rr > 45) {
      path.push("RR " + rr + " outside 15-45 -> red");
      return { tag: "RED", path, pediatric: ped };
    }
  } else {
    if (rr > 30) {
      path.push("RR " + rr + " > 30 -> red");
      return { tag: "RED", path, pediatric: ped };
    }
  }
  path.push("RR " + rr + " within band -> continue");
  // Perfusion
  const perfusion_ok = toBool(input.perfusion_ok);
  if (!perfusion_ok) {
    path.push(ped ? "No palpable peripheral pulse -> red" : "Radial pulse absent OR cap refill > 2s -> red");
    return { tag: "RED", path, pediatric: ped };
  }
  path.push("Perfusion OK");
  // Mental status
  if (ped) {
    const avpu = String(input.avpu || "").toUpperCase();
    if (avpu === "A" || avpu === "V" || avpu === "P_APPROPRIATE") {
      path.push("AVPU " + avpu + " -> yellow (delayed)");
      return { tag: "YELLOW", path, pediatric: ped };
    }
    path.push("AVPU " + (avpu || "(none)") + " (P inappropriate or U) -> red");
    return { tag: "RED", path, pediatric: ped };
  }
  if (toBool(input.obeys_commands)) {
    path.push("Obeys simple commands -> yellow (delayed)");
    return { tag: "YELLOW", path, pediatric: ped };
  }
  path.push("Does not obey commands -> red");
  return { tag: "RED", path, pediatric: ped };
}

export const startExample = {
  // Adult, not walking, breathing, RR 24, perfusion OK, obeys commands -> YELLOW.
  inputs: { pediatric: false, walking: false, breathing: "yes", resp_rate_per_min: 24, perfusion_ok: true, obeys_commands: true },
  expected: { tag: "YELLOW" },
};

export function renderSTART(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("start-triage");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: START per Newport Beach Fire Department / Hoag Hospital (1983); JumpSTART pediatric adaptation per Romig (1995). Decision tree summarized from CDC Field Triage Guidelines for Injured Patients (2021), public domain. Incident commander governs final tag and disposition.";
  const PED = makeSelect("Patient (pediatric for JumpSTART)", "tri-ped", [
    { value: "false", label: "Adult (START)" },
    { value: "true",  label: "Pediatric <= 8 yr (JumpSTART)" },
  ]);
  const W = makeSelect("Walking?", "tri-walk", YN_OPTS);
  const B = makeSelect("Breathing?", "tri-breath", [
    { value: "yes", label: "Yes (on own)" },
    { value: "no_now_yes_after_position", label: "Resumed after airway repositioning" },
    { value: "no",  label: "No (apneic)" },
  ]);
  const HP = makeSelect("Pulse present? (JumpSTART apneic branch)", "tri-pulse", YN_OPTS);
  const BR5 = makeSelect("Breathing resumed after 5 rescue breaths? (JumpSTART)", "tri-rb", YN_OPTS);
  const RR = makeNumber("Respiratory rate (breaths/min)", "tri-rr", { step: "1", min: "0", max: "120" });
  const PERF = makeSelect("Perfusion OK? (radial pulse / cap refill <= 2s adult; peripheral pulse peds)", "tri-perf", YN_OPTS);
  const OB = makeSelect("Obeys simple commands? (adult)", "tri-ob", YN_OPTS);
  const AVPU = makeSelect("AVPU mental status (pediatric)", "tri-avpu", [
    { value: "A", label: "A (alert)" },
    { value: "V", label: "V (responds to voice)" },
    { value: "P_APPROPRIATE", label: "P (appropriate response to pain)" },
    { value: "P_INAPPROPRIATE", label: "P (inappropriate response to pain)" },
    { value: "U", label: "U (unresponsive)" },
  ]);
  for (const f of [PED, W, B, HP, BR5, RR, PERF, OB, AVPU]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    PED.select.value = "false"; W.select.value = "false"; B.select.value = "yes";
    RR.input.value = "24"; PERF.select.value = "true"; OB.select.value = "true";
    update();
  });
  const oTag = makeOutputLine(outputRegion, "Triage tag", "tri-out-tag");
  const oPath = makeOutputLine(outputRegion, "Decision path", "tri-out-path");
  const update = debounce(() => {
    const r = computeSTART({
      pediatric: PED.select.value,
      walking: W.select.value,
      breathing: B.select.value,
      has_pulse: HP.select.value,
      breaths_restored_after_5: BR5.select.value,
      resp_rate_per_min: RR.input.value,
      perfusion_ok: PERF.select.value,
      obeys_commands: OB.select.value,
      avpu: AVPU.select.value,
    });
    if (r.error) { oTag.textContent = r.error; oPath.textContent = "-"; return; }
    oTag.textContent = r.tag + (r.pediatric ? " (JumpSTART pediatric)" : " (START adult)");
    oPath.textContent = r.path.join(" -> ");
  }, DEBOUNCE_MS);
  for (const el of [PED.select, W.select, B.select, HP.select, BR5.select, PERF.select, OB.select, AVPU.select]) el.addEventListener("change", update);
  RR.input.addEventListener("input", update);
}

// ====================================================================
// V.9 Drug concentration to volume
// ====================================================================
//
// First-principles arithmetic: volume_mL = ordered_dose_mg /
// stock_concentration_mg_per_mL. Optional convenience: derive the
// ordered dose from a per-kg dose * weight_kg input.
//
// The receiving facility and medical director govern the drug, the
// dose, and the route. This tile is a calm draw-volume cross-check
// before the syringe goes near the patient.

export function computeDrugConcentration(input) {
  let dose_mg = Number(input.ordered_dose_mg);
  const conc = Number(input.stock_concentration_mg_per_mL);
  if (!Number.isFinite(conc) || conc <= 0) return { error: "Stock concentration (mg/mL) must be greater than zero." };
  let derivation = null;
  if (!Number.isFinite(dose_mg) || dose_mg === 0) {
    const w = Number(input.weight_kg);
    const perkg = Number(input.dose_mg_per_kg);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(perkg) && perkg > 0) {
      dose_mg = w * perkg;
      derivation = "Ordered dose derived: " + perkg + " mg/kg * " + w + " kg = " + dose_mg + " mg";
    } else {
      return { error: "Provide ordered_dose_mg, OR provide both weight_kg and dose_mg_per_kg." };
    }
  }
  if (dose_mg < 0) return { error: "Ordered dose must be positive." };
  const volume_mL = dose_mg / conc;
  const flags = [];
  if (volume_mL > 50) flags.push("Volume > 50 mL: verify carefully (very large draw).");
  if (volume_mL < 0.05) flags.push("Volume < 0.05 mL: typically a tuberculin-syringe draw; verify.");
  return {
    dose_mg,
    concentration_mg_per_mL: conc,
    volume_mL,
    derivation,
    flags,
  };
}

export const drugConcentrationExample = {
  // 25 mg of diphenhydramine from a 50 mg/mL vial -> 0.5 mL.
  inputs: { ordered_dose_mg: 25, stock_concentration_mg_per_mL: 50 },
  expected: { volume_mL: 0.5 },
};

export function renderDrugConcentration(inputRegion, outputRegion, citationEl) {
  const copy = getLimitationCopy("drug-concentration");
  if (copy) renderLimitationBanner(inputRegion, copy);
  citationEl.textContent =
    "Citation: First-principles arithmetic over the drug-concentration label. Verify against the current local protocol and the receiving facility's medical director. The drug, dose, route, and rate are clinical decisions, not arithmetic decisions.";
  const D = makeNumber("Ordered dose (mg, optional if entering mg/kg + weight)", "dc-d", { step: "any", min: "0" });
  const C = makeNumber("Stock concentration (mg/mL)", "dc-c", { step: "any", min: "0.001" });
  const W = makeNumber("Patient weight (kg, optional)", "dc-w", { step: "any", min: "0" });
  const PK = makeNumber("Dose (mg/kg, optional)", "dc-pk", { step: "any", min: "0" });
  for (const f of [D, C, W, PK]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    D.input.value = "25"; C.input.value = "50"; W.input.value = ""; PK.input.value = ""; update();
  });
  const oVol = makeOutputLine(outputRegion, "Volume to draw (mL)", "dc-out-vol");
  const oDose = makeOutputLine(outputRegion, "Total dose (mg)", "dc-out-dose");
  const oDer = makeOutputLine(outputRegion, "Derivation note", "dc-out-der");
  const oFlag = makeOutputLine(outputRegion, "Flags", "dc-out-flag");
  const update = debounce(() => {
    const r = computeDrugConcentration({
      ordered_dose_mg: D.input.value,
      stock_concentration_mg_per_mL: C.input.value,
      weight_kg: W.input.value,
      dose_mg_per_kg: PK.input.value,
    });
    if (r.error) { oVol.textContent = r.error; for (const o of [oDose, oDer, oFlag]) o.textContent = "-"; return; }
    oVol.textContent = fmt(r.volume_mL, 2) + " mL";
    oDose.textContent = fmt(r.dose_mg, 2) + " mg";
    oDer.textContent = r.derivation || "Ordered dose provided directly.";
    oFlag.textContent = r.flags.length === 0 ? "(none)" : r.flags.join(" | ");
  }, DEBOUNCE_MS);
  for (const f of [D, C, W, PK]) f.input.addEventListener("input", update);
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
  "anion-gap": renderAnionGap,
  "corrected-calcium": renderCorrectedCalcium,
  "cha2ds2-vasc": renderCHA2DS2VASc,
  "wells-dvt": renderWellsDVT,
  "wells-pe": renderWellsPE,
  "perc-rule": renderPERC,
  "rule-of-9s": renderRuleOf9s,
  "pediatric-vitals": renderPedsVitals,
  "nihss": renderNIHSS,
  "start-triage": renderSTART,
  "drug-concentration": renderDrugConcentration,
};
