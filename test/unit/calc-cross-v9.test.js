// v9 §C.5 unit tests for OSHA 1910.95 noise dose and 8-hr TWA. Spec
// calls for 12 unit tests including the OSHA Appendix A multi-level
// workshift worked example.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNoiseDose, noiseDoseExample, CROSS_RENDERERS } from "../../calc-cross.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("noise-dose: OSHA Appendix A worked example 88 dBA x 8 hr + 95 dBA x 2 hr -> ~125.7% dose, TWA ~91.6 dBA", () => {
  const r = computeNoiseDose(noiseDoseExample.inputs);
  assert.ok(!r.error);
  // T_88 = 8 / 2^(-0.4) = 8 * 1.32 = 10.56 hr
  // T_95 = 8 / 2^1 = 4 hr
  // D = (8/10.56 + 2/4) * 100 = 75.7 + 50 = 125.7
  assert.ok(closePct(r.total_dose_pct, 125.7, 1));
  // TWA = 16.61 * log10(1.257) + 90 ~ 91.65
  assert.ok(close(r.twa_dBA, 91.65, 0.5));
});

test("noise-dose: 90 dBA continuous for 8 hr is exactly 100% dose / TWA 90", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 90, hours: 8 }] });
  assert.ok(closePct(r.total_dose_pct, 100, 0.5));
  assert.ok(close(r.twa_dBA, 90, 0.5));
  assert.equal(r.pass_pel_90, true);
});

test("noise-dose: 85 dBA continuous for 8 hr ~ 50% dose (action level)", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 85, hours: 8 }] });
  // T_85 = 8 / 2^(-1) = 16 hr; D = 8/16 * 100 = 50%
  assert.ok(closePct(r.total_dose_pct, 50, 0.5));
  assert.equal(r.pass_action_level_85, true);
  assert.equal(r.pass_pel_90, true);
});

test("noise-dose: 95 dBA for 4 hr = 100% dose (PEL exactly met)", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 95, hours: 4 }] });
  // T_95 = 4 hr -> D = 4/4 * 100 = 100%
  assert.ok(closePct(r.total_dose_pct, 100, 0.5));
});

test("noise-dose: levels below 80 dBA contribute zero (OSHA threshold)", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 75, hours: 8 }, { level_dBA: 79.99, hours: 1 }] });
  assert.equal(r.total_dose_pct, 0);
  assert.equal(r.twa_dBA, null);
});

test("noise-dose: dose exceeding PEL fails the 100% test", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 100, hours: 4 }] });
  // T_100 = 8 / 2^2 = 2 hr -> D = 4/2 * 100 = 200%
  assert.equal(r.pass_pel_90, false);
});

test("noise-dose: rejects single-row duration > 16 hr", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 85, hours: 17 }] });
  assert.ok(r.error);
  assert.match(r.error, /16 hr/);
});

test("noise-dose: rejects total exposure > 24 hr across rows", () => {
  const r = computeNoiseDose({
    rows: [
      { level_dBA: 85, hours: 10 },
      { level_dBA: 90, hours: 10 },
      { level_dBA: 95, hours: 8 },
    ],
  });
  assert.ok(r.error);
  assert.match(r.error, /24 hr/);
});

test("noise-dose: rejects empty rows array", () => {
  assert.ok(computeNoiseDose({ rows: [] }).error);
  assert.ok(computeNoiseDose({}).error);
});

test("noise-dose: skips rows with non-numeric or zero hours but accepts others", () => {
  const r = computeNoiseDose({
    rows: [
      { level_dBA: 90, hours: 8 },
      { level_dBA: null, hours: 1 },
      { level_dBA: 85, hours: 0 },
    ],
  });
  assert.ok(!r.error);
  assert.ok(closePct(r.total_dose_pct, 100, 0.5));
  // per_row records the skipped reasons.
  const skipped = r.per_row.filter((x) => x.skipped);
  assert.ok(skipped.length === 2);
});

test("noise-dose: every result carries the 5 dB / 3 dB exchange-rate caveat", () => {
  const r = computeNoiseDose({ rows: [{ level_dBA: 90, hours: 8 }] });
  assert.ok(r.warnings.some((w) => /5 dB exchange rate/.test(w)));
  assert.ok(r.warnings.some((w) => /3 dB/.test(w)));
});

test("noise-dose: CROSS_RENDERERS exposes noise-dose", () => {
  assert.equal(typeof CROSS_RENDERERS["noise-dose"], "function");
});
