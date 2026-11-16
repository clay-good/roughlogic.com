// spec-v1995 lawn fertilizer, checked against the published examples and by
// an independent route: the nitrogen actually spread must equal the rate asked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLawnFertilizerRate } from "../../calc-farmproduction.js";

test("lawn-fertilizer-rate: Penn State and UF/IFAS examples", () => {
  const psu = computeLawnFertilizerRate({ area_ft2: 30000, n_lb_per_1000: 1, n_pct: 26, p_pct: 5, k_pct: 10, bag_weight_lb: 50 });
  assert.equal(Math.round(psu.product_lb_per_1000 * 10) / 10, 3.8);
  assert.equal(Math.round(psu.p2o5_lb_per_1000 * 100) / 100, 0.19);
  assert.equal(Math.round(psu.bags_exact * 10) / 10, 2.3);
  // Penn State's per-acre step: 0.75 lb N from 16-8-8 is about 205 lb/acre (they round 4.7 first).
  const acre = computeLawnFertilizerRate({ area_ft2: 43560, n_lb_per_1000: 0.75, n_pct: 16 });
  assert.ok(Math.abs(acre.product_lb_per_acre - 204.19) < 0.01 && Math.abs(acre.product_lb - acre.product_lb_per_acre) < 1e-9);
  assert.equal(computeLawnFertilizerRate({ area_ft2: 5000, n_lb_per_1000: 1, n_pct: 16, k_pct: 8 }).product_lb, 31.25);
});

test("lawn-fertilizer-rate: the nitrogen spread is the nitrogen asked for", () => {
  for (const [A, N, n] of [[1000, 1, 46], [5000, 0.5, 10], [12345, 0.75, 32], [800, 2, 21]]) {
    const r = computeLawnFertilizerRate({ area_ft2: A, n_lb_per_1000: N, n_pct: n });
    assert.ok(Math.abs(r.product_lb * n / 100 - N * A / 1000) < 1e-9, `${A} ${N} ${n}`);
    assert.equal(r.high_rate, N > 1);
  }
});
