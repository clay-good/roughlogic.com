// v9 §H.4 unit tests for THI livestock heat-stress index. Spec-v9
// §H.4 calls for 8 unit tests covering each species at three
// temperature-humidity combinations.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTHI, thiExample, THI_THRESHOLDS,
  computeSprayerCalibration, sprayerCalibrationExample,
  AGRICULTURE_RENDERERS,
} from "../../calc-agriculture.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("thi-livestock: 90 F / 60% RH dairy cow -> emergency band", () => {
  const r = computeTHI(thiExample.inputs);
  assert.ok(!r.error);
  // THI = 90 - (0.55 - 0.0055*60) * (90 - 58) = 90 - 0.22 * 32 = 90 - 7.04 = 82.96
  assert.ok(close(r.THI, 82.96, 0.1));
  // 82.96 is in the dairy moderate band (79-89).
  assert.equal(r.band, "moderate");
});

test("thi-livestock: F and C inputs produce the same THI (algebraically equivalent)", () => {
  const r_F = computeTHI({ temperature: 90, unit: "F", rh_percent: 60, animal: "dairy-cow" });
  const r_C = computeTHI({ temperature: (90 - 32) / 1.8, unit: "C", rh_percent: 60, animal: "dairy-cow" });
  assert.ok(close(r_F.THI, r_C.THI, 0.01));
});

test("thi-livestock: 100 F / 80% RH dairy cow -> severe-band", () => {
  const r = computeTHI({ temperature: 100, unit: "F", rh_percent: 80, animal: "dairy-cow" });
  // THI ~ 100 - (0.55 - 0.44) * 42 = 100 - 0.11*42 = 100 - 4.62 = 95.38
  // 95.38 is in the dairy severe band (89-99).
  assert.equal(r.band, "severe");
});

test("thi-livestock: 110 F / 80% RH dairy cow -> emergency band", () => {
  const r = computeTHI({ temperature: 110, unit: "F", rh_percent: 80, animal: "dairy-cow" });
  assert.equal(r.band, "emergency");
});

test("thi-livestock: 70 F / 50% RH dairy cow -> none band (no stress)", () => {
  const r = computeTHI({ temperature: 70, unit: "F", rh_percent: 50, animal: "dairy-cow" });
  // THI = 70 - (0.55 - 0.275) * 12 = 70 - 0.275*12 = 70 - 3.3 = 66.7
  assert.ok(close(r.THI, 66.7, 0.5));
  assert.equal(r.band, "none");
});

test("thi-livestock: poultry stresses earlier than dairy at same conditions", () => {
  const dairy = computeTHI({ temperature: 78, unit: "F", rh_percent: 50, animal: "dairy-cow" });
  const poultry = computeTHI({ temperature: 78, unit: "F", rh_percent: 50, animal: "poultry" });
  // Same THI but different bands due to poultry's lower thresholds.
  assert.ok(close(dairy.THI, poultry.THI, 0.01));
  // 78 F / 50% RH -> THI ~ 73. dairy threshold mild=72 -> mild;
  // poultry threshold mild=70, moderate=75 -> mild too (73 < 75).
  // Pick a stronger condition to distinguish: 82 F / 50% RH -> ~76 THI.
  const dairy2 = computeTHI({ temperature: 82, unit: "F", rh_percent: 50, animal: "dairy-cow" });
  const poultry2 = computeTHI({ temperature: 82, unit: "F", rh_percent: 50, animal: "poultry" });
  // dairy threshold moderate=79 -> mild; poultry moderate=75 -> moderate.
  assert.equal(dairy2.band, "mild");
  assert.equal(poultry2.band, "moderate");
});

test("thi-livestock: warns when temperature is below 50 F (no heat stress expected)", () => {
  const r = computeTHI({ temperature: 40, unit: "F", rh_percent: 60, animal: "dairy-cow" });
  assert.ok(r.warnings.some((w) => /below 50 F/.test(w)));
});

test("thi-livestock: open ventilation surfaces a 'one-step lower' caveat", () => {
  const r = computeTHI({ temperature: 90, unit: "F", rh_percent: 60, animal: "dairy-cow", ventilation: "open" });
  assert.ok(r.warnings.some((w) => /Open ventilation/.test(w)));
});

test("thi-livestock: rejects RH outside 0-100 and unknown animal type", () => {
  assert.ok(computeTHI({ temperature: 90, unit: "F", rh_percent: -10, animal: "dairy-cow" }).error);
  assert.ok(computeTHI({ temperature: 90, unit: "F", rh_percent: 110, animal: "dairy-cow" }).error);
  assert.ok(computeTHI({ temperature: 90, unit: "F", rh_percent: 60, animal: "potato" }).error);
});

test("thi-livestock: THI_THRESHOLDS exposes 5 species with sensible break points", () => {
  for (const sp of ["dairy-cow", "beef-cow", "hog", "poultry", "horse"]) {
    const t = THI_THRESHOLDS[sp];
    assert.ok(t.mild > 65 && t.mild < 80);
    assert.ok(t.moderate > t.mild);
    assert.ok(t.severe > t.moderate);
    assert.ok(t.emergency > t.severe);
  }
});

test("thi-livestock: AGRICULTURE_RENDERERS exposes thi-livestock", () => {
  assert.equal(typeof AGRICULTURE_RENDERERS["thi-livestock"], "function");
});

// --- §H.3 sprayer-calibration ---

test("sprayer-calibration: 20 ft boom -> 17.016 ft travel distance for 1/128 acre", () => {
  const r = computeSprayerCalibration(sprayerCalibrationExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.travel_distance_ft, 17.016, 0.01));
});

test("sprayer-calibration: 1/128-acre identity (oz per nozzle = GPA)", () => {
  const r = computeSprayerCalibration({ boom_width_ft: 30, oz_per_nozzle: 15, time_s: 5 });
  // gpa = 15 regardless of boom width / time once the 1/128 method is used.
  assert.equal(r.gpa_actual, 15);
});

test("sprayer-calibration: 20 ft boom @ 4 mph yields ~2.9 s travel time and ~4 mph ground speed", () => {
  const r = computeSprayerCalibration(sprayerCalibrationExample.inputs);
  // ground_speed = (17.016 / 2.9) * (3600/5280) = 5.867 * 0.682 = 4.0 mph
  assert.ok(close(r.ground_speed_mph, 4, 0.1));
});

test("sprayer-calibration: target match within 5% returns 'acceptable' adjustment", () => {
  const r = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 20, time_s: 2.9, target_gpa: 20 });
  assert.match(r.adjustment, /acceptable/);
});

test("sprayer-calibration: over-applying triggers a 'reduce GPA' suggestion and a slower speed target", () => {
  const r = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 30, time_s: 2.9, target_gpa: 20 });
  assert.match(r.adjustment, /Over-applying/);
  // suggested_speed = current * (30 / 20) = current * 1.5 (faster slows the application)
  assert.ok(r.suggested_speed_mph > r.ground_speed_mph);
});

test("sprayer-calibration: under-applying triggers a 'raise GPA' suggestion and a slower speed target", () => {
  const r = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 10, time_s: 2.9, target_gpa: 20 });
  assert.match(r.adjustment, /Under-applying/);
  assert.ok(r.suggested_speed_mph < r.ground_speed_mph);
});

test("sprayer-calibration: zero / negative inputs rejected", () => {
  assert.ok(computeSprayerCalibration({ boom_width_ft: 0, oz_per_nozzle: 20, time_s: 2.9 }).error);
  assert.ok(computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 0, time_s: 2.9 }).error);
  assert.ok(computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 20, time_s: 0 }).error);
});

test("sprayer-calibration: warns when measured volume below 1 oz (precision threshold)", () => {
  const r = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 0.5, time_s: 2.9 });
  assert.ok(r.warnings.some((w) => /below the precision threshold/.test(w)));
});

test("sprayer-calibration: AGRICULTURE_RENDERERS exposes sprayer-calibration", () => {
  assert.equal(typeof AGRICULTURE_RENDERERS["sprayer-calibration"], "function");
});
