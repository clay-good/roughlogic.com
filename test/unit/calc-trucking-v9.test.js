// v9 §D.2 unit tests for stopping sight distance (AASHTO Green Book).
// Spec-v9 §D.2 calls for 10 unit tests at 30, 45, 55, 65, 75 mph
// covering dry, wet, and downgrade scenarios.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStoppingSightDistance, stoppingSightDistanceExample,
  SSD_FRICTION_DEFAULTS, TRUCKING_RENDERERS,
} from "../../calc-trucking.js";

const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);
const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("ssd: 55 mph dry level -> 490 ft total (AASHTO worked example)", () => {
  const r = computeStoppingSightDistance(stoppingSightDistanceExample.inputs);
  assert.ok(!r.error);
  // d_pr = 1.47 * 55 * 2.5 = 202.125
  // d_br = 55^2 / (30 * 0.35) = 3025 / 10.5 = 288.10
  // total ~ 490
  assert.ok(closePct(r.perception_reaction_ft, 202.125, 0.5));
  assert.ok(closePct(r.braking_distance_ft, 288.10, 0.5));
  assert.ok(closePct(r.total_ssd_ft, 490, 0.5));
});

test("ssd: 30 mph dry level -> ~110 ft + 86 ft braking", () => {
  const r = computeStoppingSightDistance({ speed_mph: 30, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  // d_pr = 1.47 * 30 * 2.5 = 110.25
  // d_br = 900 / 10.5 = 85.71
  assert.ok(closePct(r.total_ssd_ft, 110.25 + 85.71, 0.5));
});

test("ssd: 75 mph dry level >> 55 mph dry level", () => {
  const r1 = computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  const r2 = computeStoppingSightDistance({ speed_mph: 75, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  assert.ok(r2.total_ssd_ft > r1.total_ssd_ft);
  // Braking is quadratic in speed; 75^2/55^2 = 1.86
  assert.ok(closePct(r2.braking_distance_ft / r1.braking_distance_ft, (75 * 75) / (55 * 55), 0.5));
});

test("ssd: wet pavement (f=0.20) lengthens braking distance vs dry (f=0.35)", () => {
  const dry = computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  const wet = computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.20, grade: 0 });
  assert.ok(wet.braking_distance_ft > dry.braking_distance_ft);
});

test("ssd: downgrade (negative grade) lengthens braking distance vs level", () => {
  const level = computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  const down = computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.35, grade: -0.05 });
  assert.ok(down.braking_distance_ft > level.braking_distance_ft);
});

test("ssd: 65 mph wet downhill ~10% grade is significantly longer than dry level", () => {
  const dry = computeStoppingSightDistance({ speed_mph: 65, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  const wet = computeStoppingSightDistance({ speed_mph: 65, reaction_time_s: 2.5, friction: 0.20, grade: -0.10 });
  // wet downhill should be much longer than dry level.
  assert.ok(wet.total_ssd_ft > dry.total_ssd_ft * 1.4);
});

test("ssd: rejects zero / negative speed, time, or impossible (f + g <= 0)", () => {
  assert.ok(computeStoppingSightDistance({ speed_mph: 0, reaction_time_s: 2.5, friction: 0.35, grade: 0 }).error);
  assert.ok(computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 0, friction: 0.35, grade: 0 }).error);
  // f + g = 0 -> cannot stop.
  assert.ok(computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.10, grade: -0.10 }).error);
});

test("ssd: warns when speed < 5 mph (below AASHTO design range)", () => {
  const r = computeStoppingSightDistance({ speed_mph: 3, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  assert.ok(r.warnings.some((w) => /below 5 mph/.test(w)));
});

test("ssd: warns when friction is below 0.05 (essentially uncontrolled)", () => {
  const r = computeStoppingSightDistance({ speed_mph: 25, reaction_time_s: 2.5, friction: 0.04, grade: 0.05 });
  assert.ok(r.warnings.some((w) => /essentially uncontrolled/.test(w)));
});

test("ssd: warns when grade magnitude exceeds 10% (extreme of AASHTO range)", () => {
  const r = computeStoppingSightDistance({ speed_mph: 45, reaction_time_s: 2.5, friction: 0.35, grade: 0.12 });
  assert.ok(r.warnings.some((w) => /above 10%/.test(w)));
});

test("ssd: SSD_FRICTION_DEFAULTS exposes named dry / wet / ice with sensible values", () => {
  assert.equal(SSD_FRICTION_DEFAULTS.dry.f, 0.35);
  assert.equal(SSD_FRICTION_DEFAULTS.wet.f, 0.20);
  assert.equal(SSD_FRICTION_DEFAULTS.ice.f, 0.10);
});

test("ssd: TRUCKING_RENDERERS exposes stopping-sight-distance", () => {
  assert.equal(typeof TRUCKING_RENDERERS["stopping-sight-distance"], "function");
});
