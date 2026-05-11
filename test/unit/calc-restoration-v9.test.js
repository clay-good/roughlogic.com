// v9 §H.1 unit tests for the restoration psychrometric drying log
// (IICRC S500 boundary-humidity test). Spec-v9 §H.1 calls for 8 tests
// including a 7-day drying-log fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDryingLog, dryingLogExample, RESTORATION_RENDERERS,
} from "../../calc-restoration.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("drying-log: 7-day example trends chamber GPP below ambient on every reading (boundary pass)", () => {
  const r = computeDryingLog(dryingLogExample.inputs);
  assert.ok(!r.error);
  assert.equal(r.rows.length, 7);
  assert.equal(r.boundary_pass_all, true);
  for (const row of r.rows) assert.equal(row.boundary_pass, true);
});

test("drying-log: trend slope is negative (chamber drying), days_to_target is computed", () => {
  const r = computeDryingLog(dryingLogExample.inputs);
  assert.ok(r.trend_GPP_per_day < 0);
  assert.ok(r.days_to_target !== null);
  assert.ok(r.days_to_target >= 0);
});

test("drying-log: per-reading GPP shows ambient and chamber values plus a boundary margin", () => {
  const r = computeDryingLog(dryingLogExample.inputs);
  for (const row of r.rows) {
    assert.ok(row.ambient_GPP > 0);
    assert.ok(row.chamber_GPP >= 0);
    assert.ok(close(row.boundary_margin_GPP, row.ambient_GPP - row.chamber_GPP, 1e-6));
  }
});

test("drying-log: chamber GPP at or above ambient surfaces boundary-failure warning", () => {
  const r = computeDryingLog({
    readings: [
      { day_index: 0, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 70, chamber_RH: 70 },
      { day_index: 1, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 70, chamber_RH: 65 },
    ],
  });
  assert.equal(r.boundary_pass_all, false);
  assert.ok(r.warnings.some((w) => /boundary-humidity test/i.test(w)));
});

test("drying-log: flat / rising chamber GPP trend warns 'drying is not progressing'", () => {
  const r = computeDryingLog({
    readings: [
      { day_index: 0, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 80, chamber_RH: 50 },
      { day_index: 1, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 80, chamber_RH: 52 },
      { day_index: 2, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 80, chamber_RH: 54 },
    ],
  });
  assert.ok(r.warnings.some((w) => /not progressing/i.test(w)));
});

test("drying-log: single-reading log warns and reports no trend slope", () => {
  const r = computeDryingLog({
    readings: [{ day_index: 0, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 88, chamber_RH: 45 }],
  });
  assert.ok(r.warnings.some((w) => /Single reading/i.test(w)));
  assert.equal(r.days_to_target, null);
});

test("drying-log: empty readings rejected; non-array rejected", () => {
  assert.match(computeDryingLog({ readings: [] }).error, /at least one/);
  assert.ok(computeDryingLog({}).error);
});

test("drying-log: more than 14 readings rejected", () => {
  const readings = [];
  for (let i = 0; i < 15; i++) readings.push({ day_index: i, ambient_T_F: 72, ambient_RH: 55, chamber_T_F: 85, chamber_RH: 45 });
  const r = computeDryingLog({ readings });
  assert.match(r.error, /14 readings/);
});

test("drying-log: missing / non-numeric reading field rejected", () => {
  const r = computeDryingLog({
    readings: [{ day_index: 0, ambient_T_F: 72, ambient_RH: "n/a", chamber_T_F: 85, chamber_RH: 45 }],
  });
  assert.match(r.error, /missing or non-numeric/);
});

test("drying-log: RH out of 0-100 range rejected", () => {
  const r = computeDryingLog({
    readings: [{ day_index: 0, ambient_T_F: 72, ambient_RH: 120, chamber_T_F: 85, chamber_RH: 45 }],
  });
  assert.match(r.error, /RH/);
});

test("drying-log: explicit target GPP overrides the default ambient-minus-5 floor", () => {
  const a = computeDryingLog(dryingLogExample.inputs);
  const b = computeDryingLog({ ...dryingLogExample.inputs, drying_target_GPP: 30 });
  assert.notEqual(a.target_GPP, b.target_GPP);
  assert.equal(b.target_GPP, 30);
});

test("drying-log: RESTORATION_RENDERERS exposes drying-log", () => {
  assert.equal(typeof RESTORATION_RENDERERS["drying-log"], "function");
});
