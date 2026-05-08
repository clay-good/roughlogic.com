// Unit tests for calc-fire.js v7 utility 252 (ISO NFF). Per spec-v7 Step 62.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeIsoNeededFireFlow, isoNeededFireFlowExample,
  ISO_CONSTRUCTION_F, NFF_MAX_GPM, NFF_MIN_GPM, NFF_ROUND_INCREMENT,
  FIRE_RENDERERS,
} from "../../calc-fire.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("252 example yields finite NFF", () => {
  const r = computeIsoNeededFireFlow(isoNeededFireFlowExample.inputs);
  assert.ok(r.NFF_gpm > 0);
  assert.ok(r.Ci_capped > 0);
});

test("252 Ci = 18 × F × sqrt(A_eff)", () => {
  const r = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 1, construction_class: 2, occupancy_factor: 1.0, exposure_distance_ft: 999, exposure_communication_factor: 0 });
  // F=1.0 for class 2; A_eff = 5000 (1 story); Ci = 18 × 1.0 × sqrt(5000) ≈ 1273
  assert.ok(close(r.Ci_raw, 18 * 1.0 * Math.sqrt(5000), 0.01));
});

test("252 stories multiplier capped at 3 for non-fire-resistive", () => {
  const a = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 3, construction_class: 2, exposure_distance_ft: 999 });
  const b = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 10, construction_class: 2, exposure_distance_ft: 999 });
  assert.equal(a.A_eff_ft2, b.A_eff_ft2);
});

test("252 fire-resistive (class 5/6) does NOT multiply by stories", () => {
  const r = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 5, construction_class: 6, exposure_distance_ft: 999 });
  assert.equal(r.A_eff_ft2, 5000);
});

test("252 NFF rounded to nearest 250 gpm", () => {
  const r = computeIsoNeededFireFlow(isoNeededFireFlowExample.inputs);
  assert.equal(r.NFF_gpm % NFF_ROUND_INCREMENT, 0);
});

test("252 NFF capped at 12000 gpm", () => {
  // Force a very large building: 100k ft^2, 3-story, frame.
  const r = computeIsoNeededFireFlow({ area_ft2: 100000, stories: 3, construction_class: 1, occupancy_factor: 1.25, exposure_distance_ft: 10, exposure_communication_factor: 0.30 });
  assert.equal(r.NFF_gpm, NFF_MAX_GPM);
});

test("252 NFF floored at 500 gpm", () => {
  const r = computeIsoNeededFireFlow({ area_ft2: 200, stories: 1, construction_class: 6, occupancy_factor: 0.75, exposure_distance_ft: 200, exposure_communication_factor: 0 });
  assert.ok(r.NFF_gpm >= NFF_MIN_GPM);
});

test("252 exposure factor X scales by distance band", () => {
  const close_in = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 1, construction_class: 2, exposure_distance_ft: 8 });
  const far_out = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 1, construction_class: 2, exposure_distance_ft: 200 });
  assert.equal(close_in.X_exposure, 0.25);
  assert.equal(far_out.X_exposure, 0);
});

test("252 ISO_CONSTRUCTION_F covers classes 1 through 6", () => {
  for (const k of [1, 2, 3, 4, 5, 6]) assert.ok(ISO_CONSTRUCTION_F[k] > 0);
});

test("252 errors on zero area / unknown class / invalid Oi", () => {
  assert.ok(computeIsoNeededFireFlow({ area_ft2: 0, construction_class: 2 }).error);
  assert.ok(computeIsoNeededFireFlow({ area_ft2: 5000, construction_class: 99 }).error);
  assert.ok(computeIsoNeededFireFlow({ area_ft2: 5000, construction_class: 2, occupancy_factor: 0 }).error);
});

test("252 stories < 1 errors", () => {
  assert.ok(computeIsoNeededFireFlow({ area_ft2: 5000, stories: 0, construction_class: 2 }).error);
});

test("FIRE_RENDERERS exposes iso-nff", () => {
  assert.equal(typeof FIRE_RENDERERS["iso-nff"], "function");
});
