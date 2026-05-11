// v9 §F.2 unit tests for lightning-countdown (basic distance + 30-30
// advisory; timer state with hash serialization is a planned follow-up).
// Spec-v9 §F.2 calls for 6 unit tests minimum.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLightningCountdown, lightningCountdownExample, FIELD_RENDERERS,
} from "../../calc-field.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("lightning-countdown: example 15 s -> 3 mi, seek-shelter true", () => {
  const r = computeLightningCountdown(lightningCountdownExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.distance_miles, 3, 0.001));
  assert.equal(r.seek_shelter, true);
  assert.match(r.band, /seek shelter \(NWS 30-30 rule/);
});

test("lightning-countdown: 5 s ~ 1 mile by the sound-speed convention", () => {
  const r = computeLightningCountdown({ flash_to_bang_s: 5 });
  assert.ok(close(r.distance_miles, 1, 0.001));
});

test("lightning-countdown: under 5 s = imminent-danger band", () => {
  const r = computeLightningCountdown({ flash_to_bang_s: 3 });
  assert.match(r.band, /imminent danger/);
  assert.equal(r.seek_shelter, true);
});

test("lightning-countdown: 30 s flips seek_shelter to false (NWS 30-30 threshold)", () => {
  const r29 = computeLightningCountdown({ flash_to_bang_s: 29 });
  const r30 = computeLightningCountdown({ flash_to_bang_s: 30 });
  assert.equal(r29.seek_shelter, true);
  assert.equal(r30.seek_shelter, false);
});

test("lightning-countdown: above 60 s = storm-distant band", () => {
  const r = computeLightningCountdown({ flash_to_bang_s: 75 });
  assert.match(r.band, /storm distant/);
});

test("lightning-countdown: kilometers conversion (1 mi = 1.609 km)", () => {
  const r = computeLightningCountdown({ flash_to_bang_s: 5 });
  assert.ok(close(r.distance_km, 1.609344, 0.001));
});

test("lightning-countdown: rejects zero / negative seconds", () => {
  assert.ok(computeLightningCountdown({ flash_to_bang_s: 0 }).error);
  assert.ok(computeLightningCountdown({ flash_to_bang_s: -5 }).error);
});

test("lightning-countdown: FIELD_RENDERERS exposes lightning-countdown", () => {
  assert.equal(typeof FIELD_RENDERERS["lightning-countdown"], "function");
});
