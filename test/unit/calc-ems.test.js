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

test("all three Group V renderers exposed in EMS_RENDERERS", () => {
  for (const key of ["glasgow-coma-scale", "parkland-formula", "cincinnati-stroke-scale"]) {
    assert.ok(typeof EMS_RENDERERS[key] === "function", key + " must be registered");
  }
});
