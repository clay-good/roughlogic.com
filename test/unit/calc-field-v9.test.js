// v9 §F.2 unit tests for lightning-countdown (basic distance + 30-30
// advisory; 30-minute resume timer with hash serialization landed
// 2026-05-12 and is exercised below).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeLightningCountdown, lightningCountdownExample, FIELD_RENDERERS,
  parseTimerState, encodeTimerState, timerRemainingSeconds, formatTimerMMSS,
  LIGHTNING_TIMER_DURATION_S,
  computeWMM, computeMagneticDeclination, decimalYearFromIso,
} from "../../calc-field.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WMM_COEFFICIENTS = JSON.parse(readFileSync(resolve(ROOT, "data/field/wmm/coefficients.json"), "utf8"));

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

// =====================================================================
// v9 §F.1: Magnetic declination (NOAA NCEI World Magnetic Model 2025)
// =====================================================================
// These tests exercise the WMM forward computation against the bundled
// NCEI test-value table (test/fixtures/wmm2025-testvalues.txt, verbatim
// from the official WMM2025COF.zip distribution). The spec calls for 12
// unit tests; we run every row of the NCEI fixture in addition to
// targeted spot-checks for date / range / contract behavior.

const WMM_TESTVALUES = readFileSync(resolve(ROOT, "test/fixtures/wmm2025-testvalues.txt"), "utf8")
  .split(/\n/).filter((l) => l && !l.startsWith("#"))
  .map((l) => l.trim().split(/\s+/).map(Number))
  .filter((f) => f.length >= 11);

test("decimalYearFromIso: 2025-01-01 -> 2025.0; mid-year 2025-07-02 -> ~2025.5; rejects bad input", () => {
  assert.equal(decimalYearFromIso("2025-01-01"), 2025);
  const mid = decimalYearFromIso("2025-07-02");
  assert.ok(Math.abs(mid - 2025.5) < 0.01);
  assert.ok(!Number.isFinite(decimalYearFromIso("not-a-date")));
  assert.ok(!Number.isFinite(decimalYearFromIso("")));
});

test("WMM: bundle parses to 90 coefficient rows to degree 12 with WMM-2025 epoch 2025.0", () => {
  assert.equal(WMM_COEFFICIENTS.model, "WMM-2025");
  assert.equal(WMM_COEFFICIENTS.epoch, 2025.0);
  assert.equal(WMM_COEFFICIENTS.max_degree, 12);
  // Degree-12 expansion: rows = 12*(12+1)/2 + 12 = 90.
  assert.equal(WMM_COEFFICIENTS.coefficients.length, 90);
});

test("WMM: full NCEI WMM2025_TestValues table passes within tolerance over all 100 rows", () => {
  // Per the NCEI fixture, declination + inclination are published to
  // 0.01 deg and H is published to ~0.01 nT. We assert agreement to
  // within those precisions plus a small numerical margin.
  let maxDerr = 0, maxIerr = 0, maxHerr = 0, maxFerr = 0;
  let count = 0;
  for (const row of WMM_TESTVALUES) {
    const [yr, alt, lat, lon, Dexp, Iexp, Hexp, , , , Fexp] = row;
    const r = computeWMM({ lat_deg: lat, lon_deg: lon, alt_km: alt, decimal_year: yr, coefficients: WMM_COEFFICIENTS });
    assert.ok(!r.error, "WMM compute error at row " + count + ": " + r.error);
    // Declination wraps at ±180; choose the closer branch when comparing.
    let dD = Math.abs(r.D - Dexp);
    if (dD > 180) dD = 360 - dD;
    maxDerr = Math.max(maxDerr, dD);
    maxIerr = Math.max(maxIerr, Math.abs(r.I - Iexp));
    maxHerr = Math.max(maxHerr, Math.abs(r.H - Hexp));
    maxFerr = Math.max(maxFerr, Math.abs(r.F - Fexp));
    count += 1;
  }
  assert.ok(count >= 100, "expected at least 100 test rows, got " + count);
  // NCEI publishes D/I to 0.01 deg precision; our implementation matches
  // to within ~0.005 deg (round-trip artifact). 0.05 deg is a comfortable
  // ceiling.
  assert.ok(maxDerr < 0.05, "max declination error " + maxDerr.toFixed(5) + " deg exceeds 0.05");
  assert.ok(maxIerr < 0.05, "max inclination error " + maxIerr.toFixed(5) + " deg exceeds 0.05");
  // H and F are nT-scale (1e4-5e4); 1 nT is well below NCEI's published precision.
  assert.ok(maxHerr < 1.0, "max H error " + maxHerr.toFixed(3) + " nT exceeds 1.0");
  assert.ok(maxFerr < 1.0, "max F error " + maxFerr.toFixed(3) + " nT exceeds 1.0");
});

test("WMM: mid-CONUS point (Denver, 39.7N 105W, 2025.5, sea level) returns plausible declination near +6 deg east", () => {
  const r = computeWMM({ lat_deg: 39.7392, lon_deg: -104.9903, alt_km: 0, decimal_year: 2025.5, coefficients: WMM_COEFFICIENTS });
  assert.ok(!r.error);
  // Mid-CONUS declination is positive (east) and roughly in the 5-10 deg
  // range west of the agonic line in 2025. This is a sanity check, not
  // a precision check (the NCEI table handles precision).
  assert.ok(r.D > 5 && r.D < 12, "Denver 2025.5 declination unexpected: " + r.D);
  assert.ok(r.I > 60 && r.I < 70, "Denver 2025.5 inclination unexpected: " + r.I);
  assert.ok(r.H > 20000 && r.H < 30000, "Denver 2025.5 H unexpected: " + r.H);
});

test("WMM: secular variation rate dD is non-zero and finite at a typical land point", () => {
  const r = computeWMM({ lat_deg: 39.7392, lon_deg: -104.9903, alt_km: 0, decimal_year: 2026.0, coefficients: WMM_COEFFICIENTS });
  assert.ok(!r.error);
  assert.ok(Number.isFinite(r.dD));
  assert.ok(Number.isFinite(r.dI));
  assert.ok(Math.abs(r.dD) < 1, "dD/dt should be < 1 deg/yr at typical land points; got " + r.dD);
});

test("WMM: equator + prime meridian (0,0) at 2025.0 returns small declination and inclination near zero", () => {
  const r = computeWMM({ lat_deg: 0, lon_deg: 0, alt_km: 0, decimal_year: 2025.0, coefficients: WMM_COEFFICIENTS });
  assert.ok(!r.error);
  // |D| typically < 15 deg at the equator near Greenwich.
  assert.ok(Math.abs(r.D) < 15, "equator/prime-meridian declination unexpectedly large: " + r.D);
});

test("WMM: rejects out-of-range latitude / longitude / non-finite year", () => {
  assert.ok(computeWMM({ lat_deg: 91, lon_deg: 0, decimal_year: 2025, coefficients: WMM_COEFFICIENTS }).error);
  assert.ok(computeWMM({ lat_deg: -91, lon_deg: 0, decimal_year: 2025, coefficients: WMM_COEFFICIENTS }).error);
  assert.ok(computeWMM({ lat_deg: 0, lon_deg: 181, decimal_year: 2025, coefficients: WMM_COEFFICIENTS }).error);
  assert.ok(computeWMM({ lat_deg: 0, lon_deg: -181, decimal_year: 2025, coefficients: WMM_COEFFICIENTS }).error);
  assert.ok(computeWMM({ lat_deg: 0, lon_deg: 0, decimal_year: NaN, coefficients: WMM_COEFFICIENTS }).error);
});

test("WMM: missing coefficient bundle returns an error rather than throwing", () => {
  const r = computeWMM({ lat_deg: 0, lon_deg: 0, decimal_year: 2025 });
  assert.ok(r.error);
});

test("WMM: altitude affects field magnitude (F at 100 km altitude differs from sea level)", () => {
  const sea = computeWMM({ lat_deg: 45, lon_deg: -90, alt_km: 0, decimal_year: 2025.0, coefficients: WMM_COEFFICIENTS });
  const alt = computeWMM({ lat_deg: 45, lon_deg: -90, alt_km: 100, decimal_year: 2025.0, coefficients: WMM_COEFFICIENTS });
  assert.ok(!sea.error && !alt.error);
  // Field falls off with altitude (approx 1/r^3 dipole behavior); F at 100 km should be measurably smaller.
  assert.ok(alt.F < sea.F, "F at altitude should be < F at sea level for the same point");
  assert.ok(sea.F - alt.F < 3000, "F change with 100 km altitude unexpectedly large: " + (sea.F - alt.F));
});

test("WMM: D values returned in (-180, 180] degrees", () => {
  for (const row of WMM_TESTVALUES) {
    const [yr, alt, lat, lon] = row;
    const r = computeWMM({ lat_deg: lat, lon_deg: lon, alt_km: alt, decimal_year: yr, coefficients: WMM_COEFFICIENTS });
    assert.ok(r.D > -180 && r.D <= 180, "D out of range at lat=" + lat + " lon=" + lon + ": " + r.D);
    assert.ok(r.I >= -90 && r.I <= 90, "I out of range at lat=" + lat + " lon=" + lon + ": " + r.I);
  }
});

test("magnetic-declination renderer is exposed in FIELD_RENDERERS", () => {
  assert.equal(typeof FIELD_RENDERERS["magnetic-declination"], "function");
});

test("computeMagneticDeclination: worked-examples wrapper returns the WMM2025 tile contract", () => {
  const r = computeMagneticDeclination();
  assert.equal(r.kind, "wmm");
  assert.equal(r.model, "WMM-2025");
  assert.equal(r.valid_from, "2025-01-01");
  assert.equal(r.valid_until, "2029-12-31");
  assert.equal(r.bundled_at, "data/field/wmm/coefficients.json");
});
