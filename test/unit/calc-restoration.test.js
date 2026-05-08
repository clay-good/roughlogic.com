// Unit tests for calc-restoration.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePsychrometric,
  computeDryingGoal,
  computeDehumidifierSize,
  computeAirMovers,
  computeWaterReference,
  computeDryingTime,
  computeMoldRisk,
  computePPE,
  psychrometricExample,
  airMoversExample,
  moldExample,
} from "../../calc-restoration.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 32: Psychrometric ---

test("Psychrometric example: 75 F, 50 RH -> GPP and dew point in expected ranges", () => {
  const r = computePsychrometric(psychrometricExample.inputs);
  assert.ok(r.GPP > psychrometricExample.expectedRange.GPP.min);
  assert.ok(r.GPP < psychrometricExample.expectedRange.GPP.max);
  assert.ok(r.dew_point_F > psychrometricExample.expectedRange.dew_point_F.min);
  assert.ok(r.dew_point_F < psychrometricExample.expectedRange.dew_point_F.max);
});

test("Psychrometric: dew point equals dry bulb at 100 percent RH", () => {
  const r = computePsychrometric({ temperature_F: 70, RH_percent: 100 });
  assert.ok(close(r.dew_point_F, 70, 0.1));
});

test("Psychrometric: higher RH at fixed T -> higher GPP", () => {
  const a = computePsychrometric({ temperature_F: 75, RH_percent: 30 });
  const b = computePsychrometric({ temperature_F: 75, RH_percent: 70 });
  assert.ok(b.GPP > a.GPP);
});

// --- Utility 33: Drying Goal ---

test("Drying goal: target GPP equals outdoor minus margin", () => {
  const r = computeDryingGoal({ outdoor_temperature_F: 80, outdoor_RH_percent: 70, indoor_temperature_F: 72, margin_GPP: 10 });
  assert.ok(close(r.target_indoor_GPP, r.outdoor_GPP - 10, 1e-9));
});

test("Drying goal: indoor RH is in (0, 100]", () => {
  const r = computeDryingGoal({ outdoor_temperature_F: 80, outdoor_RH_percent: 70, indoor_temperature_F: 72, margin_GPP: 10 });
  assert.ok(r.target_indoor_RH_percent >= 0 && r.target_indoor_RH_percent <= 100);
});

// --- Utility 34: Dehumidifier ---

test("Dehumidifier: 5000 ft^3 class 2 returns AHAM in expected range", () => {
  const r = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "2" });
  assert.ok(r.aham_pints_per_day > 150);
  assert.ok(r.aham_pints_per_day < 250);
});

test("Dehumidifier: higher class -> larger capacity", () => {
  const a = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "1" });
  const b = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "4" });
  assert.ok(b.aham_pints_per_day > a.aham_pints_per_day);
});

test("Dehumidifier: field method exceeds AHAM rating", () => {
  const r = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "2" });
  assert.ok(r.field_pints_per_day > r.aham_pints_per_day);
});

// --- Utility 35: Air Movers ---

test("Air movers example: 800 ft^2 class 2 -> 8 movers", () => {
  const r = computeAirMovers(airMoversExample.inputs);
  assert.equal(r.air_mover_count, airMoversExample.expected.air_mover_count);
});

test("Air movers: higher class -> more movers per area", () => {
  const a = computeAirMovers({ affected_area_ft2: 600, water_class: "1" });
  const b = computeAirMovers({ affected_area_ft2: 600, water_class: "4" });
  assert.ok(b.air_mover_count > a.air_mover_count);
});

test("Air movers: unknown class returns error", () => {
  const r = computeAirMovers({ affected_area_ft2: 600, water_class: "9" });
  assert.ok(r.error);
});

// --- Utility 36: Water Reference ---

test("Water reference: 3 categories and 4 classes", () => {
  const r = computeWaterReference();
  assert.equal(r.categories.length, 3);
  assert.equal(r.classes.length, 4);
});

// --- Utility 37: Drying Times ---

test("Drying times: known material returns days and notes", () => {
  const r = computeDryingTime({ material: "drywall" });
  assert.ok(r.typical_days);
  assert.ok(r.notes);
});

test("Drying times: unknown material returns error", () => {
  const r = computeDryingTime({ material: "unobtanium" });
  assert.ok(r.error);
});

// --- Utility 38: Mold ---

test("Mold example: 75 RH 75 F 48 hrs -> high risk", () => {
  const r = computeMoldRisk(moldExample.inputs);
  assert.equal(r.risk, moldExample.expected.risk);
});

test("Mold: low RH returns low risk", () => {
  const r = computeMoldRisk({ rh_percent: 40, temperature_F: 70, hours_elevated: 100 });
  assert.equal(r.risk, "low");
});

test("Mold: cold conditions are out of typical range", () => {
  const r = computeMoldRisk({ rh_percent: 90, temperature_F: 30, hours_elevated: 200 });
  assert.ok(r.risk.startsWith("low"));
});

// --- Utility 39: PPE ---

test("PPE: category 3 recommends fluid-impervious suit", () => {
  const r = computePPE({ category: "3" });
  assert.ok(r.ppe.toLowerCase().includes("fluid-impervious"));
});

test("PPE: unknown category returns error", () => {
  const r = computePPE({ category: "5" });
  assert.ok(r.error);
});
