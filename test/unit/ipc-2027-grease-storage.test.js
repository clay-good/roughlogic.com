// IPC 2027 1003.3.11.1 sizes a gravity grease interceptor as the separation volume
// (peak flow x 30 min) plus the grease stored over the designed service interval:
// meals/day x Table 1003.3.8 lb/meal x days, / 6.4 lb/gal (Equation 10-6). IPC 2021
// had only the separation volume. Read in both printings 2026-10-17.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGreaseTrap, FOG_LB_PER_MEAL } from "../../calc-plumbing.js";

test("grease storage is added to the separation volume when meals are entered", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 50, retention_minutes: 30, loading_factor: 1, meals_per_day: 500, grease_class: "high", service_days: 90 });
  assert.equal(r.separation_gal, 1500);
  assert.equal(r.fog_lb, 500 * 0.035 * 90); // 1,575 lb
  assert.ok(Math.abs(r.fog_storage_gal - 1575 / 6.4) < 1e-9); // 246.1 gal
  assert.ok(Math.abs(r.volume_gal - (1500 + 1575 / 6.4)) < 1e-9);
  assert.equal(r.interval_over, false);
});

test("Table 1003.3.8 values, flatware column, and the 90-day interval flag", () => {
  assert.deepEqual(FOG_LB_PER_MEAL, { low: [0.005, 0.0065], medium: [0.025, 0.0325], high: [0.035, 0.0455], "very-high": [0.058, 0.075] });
  assert.equal(computeGreaseTrap({ peak_flow_gpm: 10, meals_per_day: 100, grease_class: "very-high", with_flatware: "yes" }).lb_per_meal, 0.075);
  assert.equal(computeGreaseTrap({ peak_flow_gpm: 10, meals_per_day: 100, service_days: 120 }).interval_over, true);
});

test("with no meals entered the result is the separation volume alone, as before", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 50, retention_minutes: 30, loading_factor: 1.25 });
  assert.equal(r.volume_gal, 1875);
  assert.equal(r.fog_storage_gal, 0);
  assert.equal(r.recommended_nominal_gal, 2000);
  assert.ok(computeGreaseTrap({ peak_flow_gpm: 50, meals_per_day: 10, grease_class: "extreme" }).error);
});
