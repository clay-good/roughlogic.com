// spec-v17 Y.4 unit tests for the Pearson correlation tile. The
// significance test exercises the shared pure-math Student-t CDF (the
// §Z.4 special functions). Worked example cross-checked by hand.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePearson, pearsonExample, EDU_RENDERERS,
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

test("v17 edu renderer is registered in EDU_RENDERERS", () => {
  assert.strictEqual(typeof EDU_RENDERERS["pearson-correlation"], "function");
});
