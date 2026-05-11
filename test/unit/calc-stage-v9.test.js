// v9 §H.2 unit tests for spl-atmospheric (SPL at distance with ANSI
// S1.26-2014 atmospheric absorption). Spec-v9 §H.2 calls for 8 tests
// including 95 dB / 1 m source at 30 m and 100 m.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSPLAtmospheric, splAtmosphericExample,
  SPL_OCTAVE_BANDS_HZ, _v9_atmosphericAbsorption,
  STAGE_RENDERERS,
} from "../../calc-stage.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("spl-atmospheric: 95 dB / 1 m source at 30 m, 20 C / 50% RH / 101.325 kPa -> ~65 dB at 1 kHz", () => {
  const r = computeSPLAtmospheric(splAtmosphericExample.inputs);
  assert.ok(!r.error);
  // Inverse-square: 95 - 20*log10(30) = 95 - 29.54 = 65.46 dB.
  assert.ok(closePct(r.inverse_square_dB, 29.54, 0.5));
  // 1 kHz absorption at 20/50/101.325 ~ 0.005 dB/m, so -0.15 dB over 30 m.
  assert.ok(r.SPL_far_1kHz_dB < 65.46);
  assert.ok(r.SPL_far_1kHz_dB > 64.5);
});

test("spl-atmospheric: 95 dB / 1 m source at 100 m, high-frequency absorption is significant", () => {
  const r = computeSPLAtmospheric({ ...splAtmosphericExample.inputs, d_far_m: 100 });
  assert.ok(!r.error);
  // Inverse-square at 100 m = 40 dB.
  assert.ok(closePct(r.inverse_square_dB, 40, 0.5));
  const band_1k = r.bands.find((b) => b.f_Hz === 1000);
  const band_8k = r.bands.find((b) => b.f_Hz === 8000);
  // 8 kHz absorption per ANSI S1.26 at 20 C / 50% RH ~ 0.085 dB/m, so >5 dB over 100 m extra.
  assert.ok(band_1k.SPL_far_dB - band_8k.SPL_far_dB > 5);
});

test("spl-atmospheric: returns seven octave bands (125 Hz to 8 kHz)", () => {
  const r = computeSPLAtmospheric(splAtmosphericExample.inputs);
  assert.equal(r.bands.length, 7);
  assert.deepEqual(r.bands.map((b) => b.f_Hz), SPL_OCTAVE_BANDS_HZ);
});

test("spl-atmospheric: higher frequency = higher alpha (monotonic over 125-8 kHz)", () => {
  const r = computeSPLAtmospheric(splAtmosphericExample.inputs);
  for (let i = 1; i < r.bands.length; i++) {
    assert.ok(r.bands[i].alpha_dB_per_m > r.bands[i - 1].alpha_dB_per_m,
      r.bands[i].f_Hz + " Hz alpha not above " + r.bands[i - 1].f_Hz + " Hz alpha");
  }
});

test("spl-atmospheric: distance below reference rejected", () => {
  const r = computeSPLAtmospheric({ ...splAtmosphericExample.inputs, d_ref_m: 1, d_far_m: 0.5 });
  assert.match(r.error, /below the reference/);
});

test("spl-atmospheric: zero / negative distances rejected", () => {
  assert.ok(computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 0, d_far_m: 30 }).error);
  assert.ok(computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m: 0 }).error);
});

test("spl-atmospheric: RH outside 0-100 rejected", () => {
  assert.match(computeSPLAtmospheric({ ...splAtmosphericExample.inputs, RH_percent: -5 }).error, /humidity/);
  assert.match(computeSPLAtmospheric({ ...splAtmosphericExample.inputs, RH_percent: 120 }).error, /humidity/);
});

test("spl-atmospheric: temperature outside -20 to 50 C warns (does not reject)", () => {
  const r = computeSPLAtmospheric({ ...splAtmosphericExample.inputs, temperature_C: 60 });
  assert.ok(!r.error);
  assert.ok(r.warnings.some((w) => /typical-validity range/i.test(w)));
});

test("spl-atmospheric: 4 kHz alpha at 20 C / 50% RH / 101.325 kPa lands in the 0.02-0.04 dB/m range", () => {
  // ANSI S1.26 reference value at 20/50/101.325 for 4 kHz is ~0.029 dB/m.
  const alpha = _v9_atmosphericAbsorption({ f_Hz: 4000, T_K: 293.15, h_r: 0.5, p_a_kPa: 101.325 });
  assert.ok(alpha > 0.02 && alpha < 0.04, "4 kHz alpha out of expected range: " + alpha);
});

test("spl-atmospheric: humidity strongly affects mid-frequency absorption (4 kHz dryer = higher alpha)", () => {
  const dry = _v9_atmosphericAbsorption({ f_Hz: 4000, T_K: 293.15, h_r: 0.1, p_a_kPa: 101.325 });
  const humid = _v9_atmosphericAbsorption({ f_Hz: 4000, T_K: 293.15, h_r: 0.8, p_a_kPa: 101.325 });
  // Dry air strongly absorbs mid-frequencies (4 kHz peak around 10-20% RH at 20 C).
  assert.ok(dry > humid * 1.5, "expected dry-air 4 kHz absorption to dominate humid; got dry=" + dry + " humid=" + humid);
});

test("spl-atmospheric: inverse-square attenuation alone matches 20*log10(d_far/d_ref)", () => {
  const r = computeSPLAtmospheric({ source_SPL_dB: 100, d_ref_m: 1, d_far_m: 10, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 });
  assert.ok(closePct(r.inverse_square_dB, 20, 1e-6));
});

test("spl-atmospheric: STAGE_RENDERERS exposes spl-atmospheric", () => {
  assert.equal(typeof STAGE_RENDERERS["spl-atmospheric"], "function");
});
