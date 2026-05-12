// v9 §F.2 unit tests for lightning-countdown (basic distance + 30-30
// advisory; 30-minute resume timer with hash serialization landed
// 2026-05-12 and is exercised below).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLightningCountdown, lightningCountdownExample, FIELD_RENDERERS,
  parseTimerState, encodeTimerState, timerRemainingSeconds, formatTimerMMSS,
  LIGHTNING_TIMER_DURATION_S,
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

// --- v9 §F.2 resume-timer state helpers ---

test("lightning-timer: idle states parse to {state:'idle'} (empty, null, garbage)", () => {
  assert.deepEqual(parseTimerState(""), { state: "idle" });
  assert.deepEqual(parseTimerState(null), { state: "idle" });
  assert.deepEqual(parseTimerState(undefined), { state: "idle" });
  assert.deepEqual(parseTimerState("garbage"), { state: "idle" });
  assert.deepEqual(parseTimerState("active:notanumber"), { state: "idle" });
  assert.deepEqual(parseTimerState("paused:0"), { state: "idle" });
  assert.deepEqual(parseTimerState("paused:-5"), { state: "idle" });
});

test("lightning-timer: active state round-trips through encode/parse", () => {
  const t = { state: "active", end_at_s: 1719873600 };
  const encoded = encodeTimerState(t);
  assert.equal(encoded, "active:1719873600");
  assert.deepEqual(parseTimerState(encoded), t);
});

test("lightning-timer: paused state round-trips through encode/parse", () => {
  const t = { state: "paused", remaining_s: 1234 };
  const encoded = encodeTimerState(t);
  assert.equal(encoded, "paused:1234");
  assert.deepEqual(parseTimerState(encoded), t);
});

test("lightning-timer: idle encodes to empty string", () => {
  assert.equal(encodeTimerState({ state: "idle" }), "");
  assert.equal(encodeTimerState(null), "");
  assert.equal(encodeTimerState({}), "");
});

test("lightning-timer: timerRemainingSeconds computes correctly across states", () => {
  // active: end_at - now, floor 0.
  assert.equal(
    timerRemainingSeconds({ state: "active", end_at_s: 1000 }, 800), 200
  );
  assert.equal(
    timerRemainingSeconds({ state: "active", end_at_s: 1000 }, 1200), 0
  );
  // paused: remaining_s passthrough.
  assert.equal(
    timerRemainingSeconds({ state: "paused", remaining_s: 500 }, 9999), 500
  );
  // idle: null.
  assert.equal(timerRemainingSeconds({ state: "idle" }, 0), null);
  assert.equal(timerRemainingSeconds(null, 0), null);
});

test("lightning-timer: formatTimerMMSS renders zero-padded MM:SS", () => {
  assert.equal(formatTimerMMSS(0), "00:00");
  assert.equal(formatTimerMMSS(59), "00:59");
  assert.equal(formatTimerMMSS(60), "01:00");
  assert.equal(formatTimerMMSS(LIGHTNING_TIMER_DURATION_S), "30:00");
  assert.equal(formatTimerMMSS(1234), "20:34");
  // Negative / NaN floor to 00:00.
  assert.equal(formatTimerMMSS(-5), "00:00");
  assert.equal(formatTimerMMSS(NaN), "00:00");
});

test("lightning-timer: LIGHTNING_TIMER_DURATION_S matches NWS 30-minute rule", () => {
  assert.equal(LIGHTNING_TIMER_DURATION_S, 1800);
});

test("lightning-timer: pause-then-resume preserves remaining seconds across encode", () => {
  // Wall-clock simulation: start with 30:00, advance 5 minutes, pause.
  const start_now = 10000;
  const active = { state: "active", end_at_s: start_now + LIGHTNING_TIMER_DURATION_S };
  const at_5min = start_now + 300;
  const rem = timerRemainingSeconds(active, at_5min);
  assert.equal(rem, LIGHTNING_TIMER_DURATION_S - 300);
  const paused = { state: "paused", remaining_s: rem };
  // Resume from paused 10 minutes later: end_at = now + remaining.
  const resume_now = at_5min + 600;
  const resumed = { state: "active", end_at_s: resume_now + paused.remaining_s };
  // Round-trip the resumed state through encode/parse and re-check.
  const parsed = parseTimerState(encodeTimerState(resumed));
  assert.deepEqual(parsed, resumed);
  // The remaining at the moment of resume equals the prior pause remaining.
  assert.equal(timerRemainingSeconds(parsed, resume_now), paused.remaining_s);
});
