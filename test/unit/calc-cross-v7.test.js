// Unit tests for calc-cross.js v7 utility 253 (fall protection). Per spec-v7 Step 63.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFallProtectionClearance, fallProtectionClearanceExample,
  FALL_PROTECTION_DECEL, CROSS_RENDERERS,
} from "../../calc-cross.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("253 example yields finite outputs", () => {
  const r = computeFallProtectionClearance(fallProtectionClearanceExample.inputs);
  assert.ok(r.required_clearance_ft > 0);
  assert.ok(typeof r.flag === "string");
});

test("253 required = free_fall + decel + worker + harness + safety", () => {
  const r = computeFallProtectionClearance({
    connector: "shock-absorbing-lanyard-6ft",
    worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 0,
  });
  // 6 + 3.5 + 5 + 1 + 1 = 16.5 ft
  assert.ok(close(r.required_clearance_ft, 16.5, 0.01));
});

test("253 SRL connector shorter required clearance (small free-fall + small decel)", () => {
  const a = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1 });
  const b = computeFallProtectionClearance({ connector: "self-retracting-overhead", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1 });
  assert.ok(b.required_clearance_ft < a.required_clearance_ft);
});

test("253 PASS when actual clearance > required", () => {
  const r = computeFallProtectionClearance({ ...fallProtectionClearanceExample.inputs, actual_clearance_ft: 25 });
  assert.match(r.flag, /PASS/);
});

test("253 FAIL when actual clearance < required (negative remaining)", () => {
  const r = computeFallProtectionClearance({ ...fallProtectionClearanceExample.inputs, actual_clearance_ft: 10 });
  assert.match(r.flag, /FAIL/);
  assert.ok(r.remaining_clearance_ft < 0);
});

test("253 free_fall override applies", () => {
  const r = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", free_fall_ft_override: 3, worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1 });
  // 3 + 3.5 + 5 + 1 + 1 = 13.5
  assert.ok(close(r.required_clearance_ft, 13.5, 0.01));
});

test("253 decel override applies", () => {
  const r = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", decel_ft_override: 4.5, worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1 });
  // 6 + 4.5 + 5 + 1 + 1 = 17.5
  assert.ok(close(r.required_clearance_ft, 17.5, 0.01));
});

test("253 unknown connector errors", () => {
  assert.ok(computeFallProtectionClearance({ connector: "no-such" }).error);
});

test("253 negative worker height / stretch / safety errors", () => {
  assert.ok(computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: -1 }).error);
  assert.ok(computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", harness_stretch_ft: -1 }).error);
  assert.ok(computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", safety_factor_ft: -1 }).error);
});

test("253 FALL_PROTECTION_DECEL has expected connector types", () => {
  for (const k of ["shock-absorbing-lanyard-6ft", "shock-absorbing-lanyard-12ft", "self-retracting-leading-edge", "self-retracting-overhead"]) {
    assert.ok(FALL_PROTECTION_DECEL[k]);
  }
});

test("253 status without actual clearance flags '(actual clearance not entered)'", () => {
  const r = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", actual_clearance_ft: 0 });
  assert.match(r.flag, /not entered/);
});

test("CROSS_RENDERERS exposes fall-protection-clearance", () => {
  assert.equal(typeof CROSS_RENDERERS["fall-protection-clearance"], "function");
});
