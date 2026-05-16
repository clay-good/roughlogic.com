// Unit tests for calc-ems.js (spec-v12 Group V starter: V.1 GCS,
// V.2 Parkland, V.5 Cincinnati Prehospital Stroke Scale). All three
// tiles are math aids; the receiving facility and medical director
// govern. Tests assert against the original published worked examples.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGCS, gcsExample,
  computeParkland, parklandExample,
  computeCPSS, cpssExample,
  computeAPGAR, apgarExample,
  computeIvDripRate, ivDripExample,
  computeO2CylinderTime, o2CylinderExample,
  computePediatricWeight, pedsWeightExample,
  computeShockIndex, shockIndexExample,
  computeMAP, mapExample,
  computeAnionGap, anionGapExample,
  computeCorrectedCalcium, correctedCalciumExample,
  computeCHA2DS2VASc, cha2ds2vascExample,
  computeWellsDVT, wellsDVTExample,
  computeWellsPE, wellsPEExample,
  computePERC, percExample,
  computeRuleOf9s, ruleOf9sExample,
  computePedsVitals, pedsVitalsExample,
  computeNIHSS, nihssExample,
  EMS_RENDERERS,
} from "../../calc-ems.js";

// --- V.1 GCS ---

test("computeGCS: E=3 V=4 M=5 -> total 12, moderate band", () => {
  const r = computeGCS(gcsExample.inputs);
  assert.equal(r.total, 12);
  assert.equal(r.severity, "moderate");
});

test("computeGCS: severity bands at the boundaries", () => {
  assert.equal(computeGCS({ eye: 1, verbal: 1, motor: 1 }).severity, "severe");      // 3
  assert.equal(computeGCS({ eye: 4, verbal: 4, motor: 4 }).severity, "moderate");    // 12 -> wait
  // E=4 V=4 M=4 = 12 -> moderate (9-12). Let's test 13 = mild:
  assert.equal(computeGCS({ eye: 4, verbal: 4, motor: 5 }).severity, "mild");        // 13
  assert.equal(computeGCS({ eye: 4, verbal: 5, motor: 6 }).severity, "mild");        // 15
});

test("computeGCS: intubated case returns null total and special label", () => {
  const r = computeGCS({ eye: 2, verbal: 1, motor: 4, intubated: true });
  assert.equal(r.total, null);
  assert.equal(r.verbal, "T");
  assert.match(r.total_label, /Not interpretable/);
  assert.equal(r.severity, null);
});

test("computeGCS: out-of-range eye / verbal / motor rejected", () => {
  assert.ok(computeGCS({ eye: 5, verbal: 4, motor: 5 }).error);
  assert.ok(computeGCS({ eye: 3, verbal: 6, motor: 5 }).error);
  assert.ok(computeGCS({ eye: 3, verbal: 4, motor: 7 }).error);
});

// --- V.2 Parkland ---

test("computeParkland: 75 kg / 30 percent TBSA at burn time -> 9000 mL / 4500 first 8 / 562.5 mL/hr", () => {
  const r = computeParkland(parklandExample.inputs);
  assert.equal(r.total_24hr_mL, 9000);
  assert.equal(r.first_8hr_mL, 4500);
  assert.equal(r.second_16hr_mL, 4500);
  assert.equal(r.current_rate_mL_per_hr, 562.5);
});

test("computeParkland: rate adjusts when hours-since-burn > 0", () => {
  // 2 hr post-burn: 6 hr remaining for the first 8; remaining vol = 4500 * (1 - 2/8) = 3375.
  // rate = 3375 / 6 = 562.5 (same as fresh because Parkland is linear in time).
  // Wait — that's still 562.5 because (1 - 2/8) = 0.75 and 6/8 = 0.75. So rate stays.
  // Better test: hours_since_burn = 8 (just hitting the maintenance phase) -> rate = 4500/16 = 281.25.
  const r = computeParkland({ weight_kg: 75, tbsa_percent: 30, hours_since_burn: 8 });
  assert.equal(r.remaining_first_8_mL, 0);
  assert.equal(r.current_rate_mL_per_hr, 281.25);
});

test("computeParkland: TBSA > 50 raises the high-tbsa flag", () => {
  const r = computeParkland({ weight_kg: 75, tbsa_percent: 60, hours_since_burn: 0 });
  assert.equal(r.flag_high_tbsa, true);
});

test("computeParkland: weight or TBSA out of range rejected", () => {
  assert.ok(computeParkland({ weight_kg: 0, tbsa_percent: 30, hours_since_burn: 0 }).error);
  assert.ok(computeParkland({ weight_kg: 75, tbsa_percent: 120, hours_since_burn: 0 }).error);
  assert.ok(computeParkland({ weight_kg: 75, tbsa_percent: 30, hours_since_burn: 30 }).error);
});

// --- V.5 CPSS ---

test("computeCPSS: facial droop + arm drift abnormal, speech normal -> 2 of 3, positive", () => {
  const r = computeCPSS(cpssExample.inputs);
  assert.equal(r.abnormal_count, 2);
  assert.equal(r.positive, true);
  assert.deepEqual(r.abnormal_findings.sort(), ["arm drift", "facial droop"]);
  assert.match(r.interpretation, /Positive CPSS/);
});

test("computeCPSS: all three normal -> 0 of 3, negative screen", () => {
  const r = computeCPSS({ facial_droop: false, arm_drift: false, abnormal_speech: false });
  assert.equal(r.abnormal_count, 0);
  assert.equal(r.positive, false);
  assert.deepEqual(r.abnormal_findings, []);
});

test("computeCPSS: all three abnormal -> 3 of 3, positive (highest sensitivity)", () => {
  const r = computeCPSS({ facial_droop: true, arm_drift: true, abnormal_speech: true });
  assert.equal(r.abnormal_count, 3);
  assert.equal(r.positive, true);
});

test("computeCPSS: accepts boolean-coercion forms ('true' / 1 / true)", () => {
  // Each form must produce the same result.
  for (const v of [true, "true", 1, "1"]) {
    const r = computeCPSS({ facial_droop: v, arm_drift: false, abnormal_speech: false });
    assert.equal(r.abnormal_count, 1, "input form " + JSON.stringify(v));
  }
});

// --- V.4 APGAR ---

test("computeAPGAR: A=2 P=2 G=1 A=2 R=2 -> 9 (vigorous)", () => {
  const r = computeAPGAR(apgarExample.inputs);
  assert.equal(r.total, 9);
  assert.equal(r.band, "vigorous (7-10)");
  assert.match(r.action, /Routine/);
});

test("computeAPGAR: severely-depressed band at 3 or below", () => {
  const r = computeAPGAR({ appearance: 0, pulse: 1, grimace: 0, activity: 1, respiration: 0 });
  assert.equal(r.total, 2);
  assert.match(r.band, /severely depressed/);
  assert.match(r.action, /Immediate resuscitation/);
});

test("computeAPGAR: moderately-depressed band 4-6", () => {
  const r = computeAPGAR({ appearance: 1, pulse: 1, grimace: 1, activity: 1, respiration: 1 });
  assert.equal(r.total, 5);
  assert.match(r.band, /moderately depressed/);
});

test("computeAPGAR: out-of-range component rejected", () => {
  assert.ok(computeAPGAR({ appearance: 3, pulse: 2, grimace: 2, activity: 2, respiration: 2 }).error);
  assert.ok(computeAPGAR({ appearance: -1, pulse: 2, grimace: 2, activity: 2, respiration: 2 }).error);
});

// --- V.8 IV drip rate ---

test("computeIvDripRate: 1000 mL over 8 hr at 15 gtt/mL -> 125 mL/hr, 31.25 gtts/min", () => {
  const r = computeIvDripRate(ivDripExample.inputs);
  assert.ok(Math.abs(r.rate_mL_per_hr - 125) < 1e-9, "rate " + r.rate_mL_per_hr);
  assert.ok(Math.abs(r.gtts_per_min - 31.25) < 1e-9, "gtts " + r.gtts_per_min);
});

test("computeIvDripRate: pediatric micro set (60 gtt/mL) produces 4x more drops than 15 gtt/mL macro", () => {
  const macro = computeIvDripRate({ volume_mL: 100, time_min: 60, drop_factor_gtt_per_mL: 15 });
  const micro = computeIvDripRate({ volume_mL: 100, time_min: 60, drop_factor_gtt_per_mL: 60 });
  assert.ok(Math.abs(micro.gtts_per_min / macro.gtts_per_min - 4) < 1e-9);
});

test("computeIvDripRate: zero / negative / invalid drop factor rejected", () => {
  assert.ok(computeIvDripRate({ volume_mL: 1000, time_min: 0, drop_factor_gtt_per_mL: 15 }).error);
  assert.ok(computeIvDripRate({ volume_mL: 0, time_min: 60, drop_factor_gtt_per_mL: 15 }).error);
  assert.ok(computeIvDripRate({ volume_mL: 100, time_min: 60, drop_factor_gtt_per_mL: 5 }).error);
  assert.ok(computeIvDripRate({ volume_mL: 100, time_min: 60, drop_factor_gtt_per_mL: 100 }).error);
});

// --- V.10 O2 cylinder duration ---

test("computeO2CylinderTime: D-cylinder, 2000 psi, reserve 200, flow 4 LPM -> 72 min", () => {
  const r = computeO2CylinderTime(o2CylinderExample.inputs);
  assert.equal(r.minutes_to_reserve, 72);
  assert.equal(r.tank_factor, 0.16);
  assert.equal(r.hhmm_to_reserve, "01:12");
});

test("computeO2CylinderTime: larger tank factor produces longer duration at same pressure/flow", () => {
  const D = computeO2CylinderTime({ cylinder: "D", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 });
  const M = computeO2CylinderTime({ cylinder: "M", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 });
  assert.ok(M.minutes_to_reserve > D.minutes_to_reserve * 5);
});

test("computeO2CylinderTime: low reserve warning fires at < 200 psi", () => {
  const r = computeO2CylinderTime({ cylinder: "D", pressure_psi: 2000, reserve_psi: 100, flow_lpm: 4 });
  assert.match(r.reserve_warning, /below 200/);
});

test("computeO2CylinderTime: invalid cylinder / pressure / flow rejected", () => {
  assert.ok(computeO2CylinderTime({ cylinder: "Z", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 }).error);
  assert.ok(computeO2CylinderTime({ cylinder: "D", pressure_psi: -100, reserve_psi: 0, flow_lpm: 4 }).error);
  assert.ok(computeO2CylinderTime({ cylinder: "D", pressure_psi: 2000, reserve_psi: 2500, flow_lpm: 4 }).error);
  assert.ok(computeO2CylinderTime({ cylinder: "D", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 0.1 }).error);
});

// --- V.7 Pediatric weight ---

test("computePediatricWeight: 5-year-old -> 18 kg via APLS (2*yr + 8)", () => {
  const r = computePediatricWeight(pedsWeightExample.inputs);
  assert.equal(r.apls_kg, 18);
  assert.match(r.formula, /\(2 \* years\) \+ 8/);
});

test("computePediatricWeight: 6-month infant via (months/2 + 4)", () => {
  const r = computePediatricWeight({ age_months: 6 });
  assert.equal(r.apls_kg, 7);
  assert.equal(r.age_used, "months");
});

test("computePediatricWeight: 10-year-old via (3*yr + 7)", () => {
  const r = computePediatricWeight({ age_years: 10 });
  assert.equal(r.apls_kg, 37);
  assert.match(r.formula, /\(3 \* years\) \+ 7/);
});

test("computePediatricWeight: age > 12 yr flagged for adult dosing", () => {
  const r = computePediatricWeight({ age_years: 13 });
  assert.match(r.flag, /Age > 12 yr/);
});

test("computePediatricWeight: invalid input rejected", () => {
  assert.ok(computePediatricWeight({ age_years: -1 }).error);
  assert.ok(computePediatricWeight({ age_years: 20 }).error);
  assert.ok(computePediatricWeight({ age_months: 15 }).error);
});

test("computePediatricWeight: pound conversion uses NIST factor", () => {
  const r = computePediatricWeight({ age_years: 5 });  // 18 kg
  assert.ok(Math.abs(r.pounds - 18 * 2.2046226218) < 1e-9);
});

// --- V.11 Shock index ---

test("computeShockIndex: HR 120 / SBP 100 -> SI 1.20 (occult shock)", () => {
  const r = computeShockIndex(shockIndexExample.inputs);
  assert.equal(r.shock_index, 1.2);
  assert.match(r.band, /occult shock/);
});

test("computeShockIndex: bands at the boundaries", () => {
  assert.match(computeShockIndex({ hr_bpm: 50, sbp_mmHg: 120 }).band, /low/);     // 0.42
  assert.match(computeShockIndex({ hr_bpm: 72, sbp_mmHg: 120 }).band, /normal/);  // 0.60
  assert.match(computeShockIndex({ hr_bpm: 100, sbp_mmHg: 120 }).band, /mildly/); // 0.83
  assert.match(computeShockIndex({ hr_bpm: 130, sbp_mmHg: 100 }).band, /occult/); // 1.30
  assert.match(computeShockIndex({ hr_bpm: 160, sbp_mmHg: 90 }).band, /severe/);  // 1.78
});

test("computeShockIndex: invalid input rejected", () => {
  assert.ok(computeShockIndex({ hr_bpm: 0, sbp_mmHg: 100 }).error);
  assert.ok(computeShockIndex({ hr_bpm: 80, sbp_mmHg: 0 }).error);
  assert.ok(computeShockIndex({ hr_bpm: 300, sbp_mmHg: 100 }).error);  // > 250 flagged
});

// --- V.12 MAP ---

test("computeMAP: 120/80 -> MAP 93.33, PP 40", () => {
  const r = computeMAP(mapExample.inputs);
  assert.ok(Math.abs(r.map_mmHg - 93.333) < 0.01);
  assert.equal(r.pulse_pressure_mmHg, 40);
  assert.match(r.band, /typical/);
});

test("computeMAP: DBP >= SBP rejected (invalid waveform)", () => {
  assert.ok(computeMAP({ sbp_mmHg: 80, dbp_mmHg: 80 }).error);
  assert.ok(computeMAP({ sbp_mmHg: 80, dbp_mmHg: 100 }).error);
});

test("computeMAP: bands at boundaries", () => {
  assert.match(computeMAP({ sbp_mmHg: 80, dbp_mmHg: 40 }).band, /below 60/);    // MAP = 53.3
  assert.match(computeMAP({ sbp_mmHg: 90, dbp_mmHg: 50 }).band, /marginal/);    // MAP = 63.3
  assert.match(computeMAP({ sbp_mmHg: 120, dbp_mmHg: 80 }).band, /typical/);
  assert.match(computeMAP({ sbp_mmHg: 170, dbp_mmHg: 100 }).band, /hypertensive/);  // MAP = 123.3
});

// --- V.13 Anion gap ---

test("computeAnionGap: Na 140 / Cl 104 / HCO3 24 -> AG 12 (high-normal)", () => {
  const r = computeAnionGap(anionGapExample.inputs);
  assert.equal(r.anion_gap, 12);
  assert.match(r.band, /normal/);
});

test("computeAnionGap: K-included variant adds K to the gap", () => {
  const r = computeAnionGap({ na: 140, cl: 104, hco3: 24, k: 4 });
  assert.equal(r.anion_gap, 12);
  assert.equal(r.anion_gap_with_k, 16);
});

test("computeAnionGap: Figge albumin correction adds 2.5 per 1 g/dL below 4.0", () => {
  const r = computeAnionGap({ na: 140, cl: 110, hco3: 18, albumin_g_dL: 2.0 });
  // AG = 140 - 128 = 12; corrected = 12 + 2.5 * (4.0 - 2.0) = 12 + 5 = 17.
  assert.equal(r.anion_gap, 12);
  assert.ok(Math.abs(r.anion_gap_corrected - 17) < 1e-9);
});

test("computeAnionGap: high-AG band fires above 12", () => {
  const r = computeAnionGap({ na: 140, cl: 95, hco3: 15 });
  // AG = 140 - 110 = 30 -> high.
  assert.equal(r.anion_gap, 30);
  assert.match(r.band, /high/);
});

test("computeAnionGap: invalid input rejected", () => {
  assert.ok(computeAnionGap({ na: 50, cl: 100, hco3: 24 }).error);
  assert.ok(computeAnionGap({ na: 140, cl: 50, hco3: 24 }).error);
  assert.ok(computeAnionGap({ na: 140, cl: 100, hco3: 100 }).error);
  assert.ok(computeAnionGap({ na: 140, cl: 100, hco3: 24, k: 20 }).error);
  assert.ok(computeAnionGap({ na: 140, cl: 100, hco3: 24, albumin_g_dL: 10 }).error);
});

// --- V.14 Corrected calcium ---

test("computeCorrectedCalcium: Ca 8.0 / albumin 2.0 -> 9.6 mg/dL (normal)", () => {
  const r = computeCorrectedCalcium(correctedCalciumExample.inputs);
  assert.ok(Math.abs(r.ca_corrected_mg_dL - 9.6) < 1e-9);
  assert.match(r.band, /normal/);
});

test("computeCorrectedCalcium: at albumin 4.0 no adjustment", () => {
  const r = computeCorrectedCalcium({ ca_measured: 9.0, albumin_g_dL: 4.0 });
  assert.equal(r.ca_corrected_mg_dL, 9.0);
  assert.equal(r.adjustment, 0);
});

test("computeCorrectedCalcium: hypocalcemia band fires below 8.5", () => {
  const r = computeCorrectedCalcium({ ca_measured: 7.0, albumin_g_dL: 4.0 });
  assert.match(r.band, /low/);
});

test("computeCorrectedCalcium: invalid input rejected", () => {
  assert.ok(computeCorrectedCalcium({ ca_measured: 0, albumin_g_dL: 4 }).error);
  assert.ok(computeCorrectedCalcium({ ca_measured: 9, albumin_g_dL: 0 }).error);
  assert.ok(computeCorrectedCalcium({ ca_measured: 9, albumin_g_dL: 10 }).error);
});

// --- V.16 CHA2DS2-VASc ---

test("computeCHA2DS2VASc: HTN + age 70 + DM (male) -> 3", () => {
  const r = computeCHA2DS2VASc(cha2ds2vascExample.inputs);
  assert.equal(r.score, 3);
  assert.match(r.recommendation, /recommended/);
});

test("computeCHA2DS2VASc: age 75 contributes 2 (A2 supersedes A)", () => {
  const r = computeCHA2DS2VASc({ chf: false, htn: false, age: 75, diabetes: false, stroke_history: false, vascular: false, sex: "male" });
  assert.equal(r.score, 2);
});

test("computeCHA2DS2VASc: female adds Sc +1", () => {
  const r = computeCHA2DS2VASc({ chf: false, htn: false, age: 60, diabetes: false, stroke_history: false, vascular: false, sex: "female" });
  assert.equal(r.score, 1);
  // Female score 0-1 -> no anticoagulation per 2019 guideline.
  assert.match(r.recommendation, /no anticoagulation/);
});

test("computeCHA2DS2VASc: prior stroke contributes S2 +2", () => {
  const r = computeCHA2DS2VASc({ chf: false, htn: false, age: 40, diabetes: false, stroke_history: true, vascular: false, sex: "male" });
  assert.equal(r.score, 2);
  assert.match(r.recommendation, /recommended/);
});

test("computeCHA2DS2VASc: invalid sex / age rejected", () => {
  assert.ok(computeCHA2DS2VASc({ ...cha2ds2vascExample.inputs, sex: "other" }).error);
  assert.ok(computeCHA2DS2VASc({ ...cha2ds2vascExample.inputs, age: 10 }).error);
});

test("all twelve Group V renderers exposed in EMS_RENDERERS", () => {
  for (const key of ["glasgow-coma-scale", "parkland-formula", "cincinnati-stroke-scale", "apgar-score", "iv-drip-rate", "o2-cylinder-duration", "pediatric-weight-estimate", "shock-index", "mean-arterial-pressure", "anion-gap", "corrected-calcium", "cha2ds2-vasc"]) {
    assert.ok(typeof EMS_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- V.17 Wells DVT ---

test("computeWellsDVT: active cancer + calf >= 3 cm + prior DVT -> score 3, high / likely", () => {
  const r = computeWellsDVT(wellsDVTExample.inputs);
  assert.equal(r.score, 3);
  assert.match(r.band_two, /DVT likely/);
  assert.match(r.band_three, /High/);
  assert.equal(r.components.length, 3);
});

test("computeWellsDVT: alternative diagnosis subtracts 2 (can produce negative score -> low band)", () => {
  const r = computeWellsDVT({ active_cancer: true, alternative_diagnosis_likely: true });
  assert.equal(r.score, -1);
  assert.match(r.band_two, /DVT unlikely/);
  assert.match(r.band_three, /Low/);
});

test("computeWellsDVT: empty input -> 0, unlikely / low, no components", () => {
  const r = computeWellsDVT({});
  assert.equal(r.score, 0);
  assert.equal(r.components.length, 0);
  assert.match(r.band_three, /Low/);
});

test("computeWellsDVT: two-band cutoff fires at score >= 2", () => {
  const r2 = computeWellsDVT({ active_cancer: true, prior_dvt: true });
  assert.equal(r2.score, 2);
  assert.match(r2.band_two, /DVT likely/);
  const r1 = computeWellsDVT({ active_cancer: true });
  assert.equal(r1.score, 1);
  assert.match(r1.band_two, /DVT unlikely/);
});

// --- V.18 Wells PE ---

test("computeWellsPE: signs DVT + alt dx less likely + HR>100 -> score 7.5, high / likely", () => {
  const r = computeWellsPE(wellsPEExample.inputs);
  assert.ok(Math.abs(r.score - 7.5) < 1e-9);
  assert.match(r.band_two, /PE likely/);
  assert.match(r.band_three, /High/);
});

test("computeWellsPE: two-band cutpoint at 4.5", () => {
  const just_under = computeWellsPE({ clinical_signs_dvt: true, hr_over_100: true });
  // 3 + 1.5 = 4.5; band_two is >= 4.5 -> likely.
  assert.ok(Math.abs(just_under.score - 4.5) < 1e-9);
  assert.match(just_under.band_two, /PE likely/);
  const below = computeWellsPE({ clinical_signs_dvt: true, hemoptysis: true });
  // 3 + 1 = 4; below 4.5.
  assert.match(below.band_two, /PE unlikely/);
});

test("computeWellsPE: three-band thresholds at 2 (low/mod) and 6 (mod/high)", () => {
  const low = computeWellsPE({ hemoptysis: true, malignancy: true });
  // 1 + 1 = 2 -> moderate (>= 2).
  assert.match(low.band_three, /Moderate/);
  const high = computeWellsPE({ clinical_signs_dvt: true, alternative_diagnosis_less_likely: true, hemoptysis: true });
  // 3 + 3 + 1 = 7 -> high (> 6).
  assert.match(high.band_three, /High/);
});

test("computeWellsPE: empty input -> 0, low, unlikely", () => {
  const r = computeWellsPE({});
  assert.equal(r.score, 0);
  assert.match(r.band_two, /PE unlikely/);
  assert.match(r.band_three, /Low/);
});

// --- V.19 PERC ---

test("computePERC: all 8 criteria satisfied -> PERC negative (rule out in low pretest)", () => {
  const r = computePERC(percExample.inputs);
  assert.equal(r.satisfied, 8);
  assert.equal(r.total, 8);
  assert.equal(r.all_satisfied, true);
  assert.match(r.band, /PERC negative/);
  assert.equal(r.failures.length, 0);
});

test("computePERC: any one criterion missing -> PERC positive (does NOT rule out)", () => {
  const r = computePERC({ ...percExample.inputs, age_under_50: false });
  assert.equal(r.satisfied, 7);
  assert.equal(r.all_satisfied, false);
  assert.match(r.band, /PERC positive/);
  assert.equal(r.failures.length, 1);
  assert.match(r.failures[0], /Age < 50/);
});

test("computePERC: empty input -> 0 satisfied, 8 failures", () => {
  const r = computePERC({});
  assert.equal(r.satisfied, 0);
  assert.equal(r.failures.length, 8);
  assert.match(r.band, /PERC positive/);
});

test("computePERC: pretest-probability caveat present on every result", () => {
  const r = computePERC(percExample.inputs);
  assert.match(r.pretest_caveat, /low pretest/i);
});

test("all fifteen Group V renderers exposed in EMS_RENDERERS after V.17 / V.18 / V.19", () => {
  for (const key of ["wells-dvt", "wells-pe", "perc-rule"]) {
    assert.ok(typeof EMS_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- V.3 Rule of 9s / Lund-Browder ---

test("computeRuleOf9s: adult Rule of 9s, left arm both surfaces + anterior trunk -> 27%", () => {
  const r = computeRuleOf9s(ruleOf9sExample.inputs);
  assert.equal(r.total, 27);
  assert.equal(r.method, "rule_of_9s");
  assert.equal(r.components.length, 3);
  assert.match(r.band, /Major burn/);
});

test("computeRuleOf9s: Lund-Browder infant head front+back is 17%, adult is 7%", () => {
  const infant = computeRuleOf9s({ method: "lund_browder", age_band: "infant", head_front: true, head_back: true });
  assert.equal(infant.total, 17);
  const adult = computeRuleOf9s({ method: "lund_browder", age_band: "adult", head_front: true, head_back: true });
  assert.equal(adult.total, 7);
});

test("computeRuleOf9s: empty input -> 0% TBSA, minor band, no components", () => {
  const r = computeRuleOf9s({});
  assert.equal(r.total, 0);
  assert.equal(r.components.length, 0);
  assert.match(r.band, /Minor TBSA/);
});

test("computeRuleOf9s: 20% threshold yields major-burn band (ABA)", () => {
  // Rule of 9s adult: anterior trunk (18) + perineum (1) + left arm front (4.5) ... pick anterior trunk + 1 leg front (9) = 27 -> major.
  // For boundary at exactly 20: anterior trunk (18) + perineum (1) + left arm front (4.5) -> 23.5 (major).
  const r = computeRuleOf9s({ method: "rule_of_9s", age_band: "adult", trunk_front: true, perineum: true, arm_l_front: true });
  assert.ok(r.total >= 20);
  assert.match(r.band, /Major burn/);
});

// --- V.15 Pediatric vital signs ---

test("computePedsVitals: preschool band returns row label and a non-empty HR range", () => {
  const r = computePedsVitals(pedsVitalsExample.inputs);
  assert.equal(r.band, "preschool");
  assert.match(r.label, /Preschool/);
  assert.ok(r.hr_range && r.hr_range.length > 0);
  assert.match(r.hypotension_sbp, /SBP </);
});

test("computePedsVitals: neonate band hypotension cutoff < 60 mmHg per PALS", () => {
  const r = computePedsVitals({ age_band: "neonate" });
  assert.match(r.hypotension_sbp, /< 60/);
});

test("computePedsVitals: adolescent band hypotension cutoff < 90 mmHg", () => {
  const r = computePedsVitals({ age_band: "adolescent" });
  assert.match(r.hypotension_sbp, /< 90/);
});

test("computePedsVitals: invalid band rejected", () => {
  assert.ok(computePedsVitals({ age_band: "nope" }).error);
});

// --- V.20 NIH Stroke Scale ---

test("computeNIHSS: canonical moderate-stroke vignette sums to 15", () => {
  const r = computeNIHSS(nihssExample.inputs);
  assert.equal(r.total, 15);
  assert.match(r.band, /Moderate stroke/);
  assert.equal(r.items.length, 15);
});

test("computeNIHSS: empty input -> 0, no-stroke-symptoms band", () => {
  const r = computeNIHSS({});
  assert.equal(r.total, 0);
  assert.match(r.band, /No stroke/);
});

test("computeNIHSS: minor-band threshold (total 1-4)", () => {
  assert.match(computeNIHSS({ loc_consciousness: 1 }).band, /Minor stroke/);
  assert.match(computeNIHSS({ loc_consciousness: 3, best_gaze: 1 }).band, /Minor stroke/);
});

test("computeNIHSS: 5 -> moderate, 16 -> moderate-to-severe, 21 -> severe", () => {
  assert.match(computeNIHSS({ loc_consciousness: 3, best_gaze: 2 }).band, /Moderate stroke/);
  // 16 = 3+2+3+3+3+2 (LOC 3, gaze 2, visual 3, facial 3, lang 3, sensory 2).
  assert.match(computeNIHSS({ loc_consciousness: 3, best_gaze: 2, visual: 3, facial_palsy: 3, best_language: 3, sensory: 2 }).band, /Moderate to severe/);
  // 21 = add motor arm L 4 + leg L 1.
  assert.match(computeNIHSS({ loc_consciousness: 3, best_gaze: 2, visual: 3, facial_palsy: 3, best_language: 3, sensory: 2, motor_arm_l: 4, motor_leg_l: 1 }).band, /Severe stroke/);
});

test("computeNIHSS: '9' on motor item is recorded but NOT added to total", () => {
  const r = computeNIHSS({ loc_consciousness: 2, motor_arm_l: 9, motor_arm_r: 0 });
  assert.equal(r.total, 2);
  const arm_l = r.items.find((i) => i.label.startsWith("5a"));
  assert.ok(arm_l && arm_l.score === 9 && arm_l.scored === false);
});

test("computeNIHSS: out-of-range value rejected", () => {
  assert.ok(computeNIHSS({ loc_consciousness: 99 }).error);
  assert.ok(computeNIHSS({ best_gaze: -1 }).error);
});

test("all eighteen Group V renderers exposed in EMS_RENDERERS after V.3 / V.15 / V.20", () => {
  for (const key of ["rule-of-9s", "pediatric-vitals", "nihss"]) {
    assert.ok(typeof EMS_RENDERERS[key] === "function", key + " must be registered");
  }
});
