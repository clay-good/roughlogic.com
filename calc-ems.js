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

// --- Renderer registry ---

export const EMS_RENDERERS = {
  "glasgow-coma-scale": renderGCS,
  "parkland-formula": renderParkland,
  "cincinnati-stroke-scale": renderCPSS,
};
