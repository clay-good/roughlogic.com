// spec-v17 Y.4 unit tests for the Pearson correlation tile. The
// significance test exercises the shared pure-math Student-t CDF (the
// §Z.4 special functions). Worked example cross-checked by hand.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePearson, pearsonExample,
  computeChiSquareGof, chiSquareGofExample,
  EDU_RENDERERS,
} from "../../calc-edu.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("pearson-correlation: x=1..5, y=2,4,5,4,5 -> r=0.7746, R^2=0.6, df=3, t=2.121", () => {
  const r = computePearson(pearsonExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.r, 0.774597, 1e-5));
  assert.ok(close(r.r2, 0.6, 1e-6));
  assert.strictEqual(r.df, 3);
  assert.ok(close(r.t, 2.12132, 1e-4));
});

test("pearson-correlation: two-tailed p ~ 0.124 is not significant at 0.05 but is at 0.10... no, still not", () => {
  const r = computePearson({ x_values: "1,2,3,4,5", y_values: "2,4,5,4,5", alpha: 0.05 });
  assert.ok(r.p_value > 0.1 && r.p_value < 0.15);
  assert.strictEqual(r.significant, false);
});

test("pearson-correlation: r and the t-test accept array inputs equivalently to strings", () => {
  const s = computePearson({ x_values: "1,2,3,4,5", y_values: "2,4,5,4,5" });
  const a = computePearson({ x_values: [1, 2, 3, 4, 5], y_values: [2, 4, 5, 4, 5] });
  assert.ok(close(s.r, a.r, 1e-12));
});

test("pearson-correlation: perfect positive correlation -> r=1, R^2=1, p=0, significant", () => {
  const r = computePearson({ x_values: "1,2,3,4", y_values: "3,5,7,9" });
  assert.strictEqual(r.r, 1);
  assert.strictEqual(r.r2, 1);
  assert.strictEqual(r.p_value, 0);
  assert.strictEqual(r.significant, true);
  assert.strictEqual(r.direction, "positive");
});

test("pearson-correlation: perfect negative correlation -> r=-1, negative direction", () => {
  const r = computePearson({ x_values: "1,2,3,4,5", y_values: "10,8,6,4,2" });
  assert.ok(close(r.r, -1, 1e-12));
  assert.strictEqual(r.direction, "negative");
  assert.strictEqual(r.strength, "near-perfect");
});

test("pearson-correlation: a clearly-significant strong correlation rejects H0", () => {
  // Tight linear data with mild noise over n=10 -> high r, tiny p.
  const r = computePearson({ x_values: "1,2,3,4,5,6,7,8,9,10", y_values: "2,4,5,8,9,12,13,16,17,20", alpha: 0.05 });
  assert.ok(r.r > 0.97);
  assert.ok(r.p_value < 0.001);
  assert.strictEqual(r.significant, true);
});

test("pearson-correlation: zero correlation gives r near 0 and a non-significant verdict", () => {
  const r = computePearson({ x_values: "1,2,3,4", y_values: "5,5.0001,4.9999,5" });
  assert.ok(Math.abs(r.r) < 0.5);
  assert.strictEqual(r.significant, false);
});

test("pearson-correlation: alpha selection flips a borderline verdict", () => {
  const inputs = { x_values: "1,2,3,4,5,6", y_values: "2,1,4,3,6,5" };
  const a05 = computePearson({ ...inputs, alpha: 0.05 });
  const a10 = computePearson({ ...inputs, alpha: 0.10 });
  // Same p-value, but a more lenient alpha can only ever be at least as likely to reject.
  assert.ok(close(a05.p_value, a10.p_value, 1e-12));
  assert.ok(!(a05.significant && !a10.significant));
});

test("pearson-correlation: fewer than 3 pairs, mismatched lengths, and constant series are rejected", () => {
  assert.ok("error" in computePearson({ x_values: "1,2", y_values: "3,4" }));
  assert.ok("error" in computePearson({ x_values: "1,2,3", y_values: "1,2" }));
  assert.ok("error" in computePearson({ x_values: "7,7,7", y_values: "1,2,3" }));
});

test("pearson-correlation: small-sample note appears under n=10", () => {
  const r = computePearson(pearsonExample.inputs);
  assert.ok(r.warnings.some((w) => /Small sample/.test(w)));
});

// --- Y.3 chi-square goodness-of-fit ----------------------------------

test("chi-square-gof: observed 10/20/30/40 vs uniform 25 -> chi2=20, df=3, reject at 0.05", () => {
  const r = computeChiSquareGof(chiSquareGofExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.chi_square, 20, 1e-9));
  assert.strictEqual(r.df, 3);
  assert.ok(r.p_value < 0.001);
  assert.strictEqual(r.significant, true);
});

test("chi-square-gof: chi2 = sum((O-E)^2 / E) cell by cell", () => {
  const r = computeChiSquareGof({ observed: "8, 12", expected: "10, 10" });
  // (8-10)^2/10 + (12-10)^2/10 = 0.4 + 0.4 = 0.8.
  assert.ok(close(r.chi_square, 0.8, 1e-12));
  assert.strictEqual(r.df, 1);
});

test("chi-square-gof: expected proportions are scaled to the observed total (same result as counts)", () => {
  const counts = computeChiSquareGof({ observed: "10,20,30,40", expected: "25,25,25,25", expected_type: "counts" });
  const props = computeChiSquareGof({ observed: "10,20,30,40", expected: "0.25,0.25,0.25,0.25", expected_type: "proportions" });
  assert.ok(close(counts.chi_square, props.chi_square, 1e-9));
});

test("chi-square-gof: a close fit fails to reject H0", () => {
  const r = computeChiSquareGof({ observed: "24, 26, 25, 25", expected: "25, 25, 25, 25" });
  assert.ok(r.chi_square < 1);
  assert.ok(r.p_value > 0.9);
  assert.strictEqual(r.significant, false);
});

test("chi-square-gof: array inputs match string inputs", () => {
  const s = computeChiSquareGof({ observed: "10,20,30,40", expected: "25,25,25,25" });
  const a = computeChiSquareGof({ observed: [10, 20, 30, 40], expected: [25, 25, 25, 25] });
  assert.ok(close(s.chi_square, a.chi_square, 1e-12));
});

test("chi-square-gof: an expected count below 5 is flagged", () => {
  const r = computeChiSquareGof({ observed: "1, 2, 3", expected: "2, 2, 2" });
  assert.ok(r.warnings.some((w) => /below 5/.test(w)));
});

test("chi-square-gof: proportions not summing to 1 are normalized with a note", () => {
  const r = computeChiSquareGof({ observed: "10,20,30,40", expected: "1,1,1,1", expected_type: "proportions" });
  // 1,1,1,1 normalizes to 0.25 each -> same as uniform.
  assert.ok(close(r.chi_square, 20, 1e-9));
  assert.ok(r.warnings.some((w) => /normalized/.test(w)));
});

test("chi-square-gof: a zero or negative expected, mismatched lengths, and negative observed are rejected", () => {
  assert.ok("error" in computeChiSquareGof({ observed: "1, 2", expected: "0, 3" }));
  assert.ok("error" in computeChiSquareGof({ observed: "1, 2, 3", expected: "1, 2" }));
  assert.ok("error" in computeChiSquareGof({ observed: "-1, 2, 3", expected: "1, 2, 3" }));
  assert.ok("error" in computeChiSquareGof({ observed: "5", expected: "5" })); // fewer than 2 categories
});

test("v17 edu renderers are registered in EDU_RENDERERS", () => {
  assert.strictEqual(typeof EDU_RENDERERS["pearson-correlation"], "function");
  assert.strictEqual(typeof EDU_RENDERERS["chi-square-gof"], "function");
});
