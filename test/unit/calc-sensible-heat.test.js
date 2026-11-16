// spec-v1996 sensible heat, checked by its own derivation and round trips.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSensibleHeatAirflow } from "../../calc-hvacairside.js";

test("sensible-heat-airflow: 1.08 is 60 x 0.075 x 0.24, and the three solves agree", () => {
  assert.ok(Math.abs(60 * 0.075 * 0.24 - 1.08) < 1e-12);
  for (const [c, t] of [[400, 20], [1200, -18], [55.5, 3.3], [10000, 45]]) {
    const q = computeSensibleHeatAirflow({ cfm: c, dt_f: t }).q_btuh;
    assert.ok(Math.abs(computeSensibleHeatAirflow({ q_btuh: q, dt_f: t }).cfm - c) < 1e-9);
    assert.ok(Math.abs(computeSensibleHeatAirflow({ q_btuh: q, cfm: c }).dt_f - t) < 1e-9);
  }
  // A thinner-air factor scales the answer linearly.
  assert.ok(Math.abs(computeSensibleHeatAirflow({ cfm: 400, dt_f: 20, factor: 0.9 }).q_btuh - 7200) < 1e-9);
});
