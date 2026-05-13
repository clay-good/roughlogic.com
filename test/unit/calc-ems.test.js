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

test("all nine Group V renderers exposed in EMS_RENDERERS", () => {
  for (const key of ["glasgow-coma-scale", "parkland-formula", "cincinnati-stroke-scale", "apgar-score", "iv-drip-rate", "o2-cylinder-duration", "pediatric-weight-estimate", "shock-index", "mean-arterial-pressure"]) {
    assert.ok(typeof EMS_RENDERERS[key] === "function", key + " must be registered");
  }
});
