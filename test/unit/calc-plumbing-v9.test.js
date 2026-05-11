// v9 §B.4 unit tests for the hot-water recirc loop-sizing tile.
// Spec-v9 §B.4 calls for 10 unit tests including a 200 ft 3/4-in copper
// loop with 1-in insulation.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRecircLoopSizing, recircLoopSizingExample,
  RECIRC_LOSS_U, COPPER_TYPE_L_ID_IN, RECIRC_PUMP_LADDER_HP,
  PLUMBING_RENDERERS,
} from "../../calc-plumbing.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("recirc-loop-sizing: 200 ft / 3/4-in / 1-in insulation / 120 F / 65 F / dT=10 -> q_per_ft 9.35 Btu/hr/ft, GPM 0.374", () => {
  const r = computeRecircLoopSizing(recircLoopSizingExample.inputs);
  assert.ok(!r.error);
  // U = 0.17 for 3/4 in + 1 in insulation; dT_pipe = 55 F.
  assert.ok(closePct(r.q_per_ft_btu_hr, 9.35, 0.5));
  assert.ok(closePct(r.Q_total_btu_hr, 1870, 0.5));
  assert.ok(closePct(r.gpm_required, 0.374, 1));
  assert.ok(r.head_ft > 0);
  assert.ok(r.pressure_psi > 0);
});

test("recirc-loop-sizing: bigger pipe at same dT increases U (q_per_ft) but lowers friction head", () => {
  const small = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.5", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  const big = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "1", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.ok(big.q_per_ft_btu_hr > small.q_per_ft_btu_hr);
  // 1-in pipe at higher flow has lower velocity (larger area) so head_ft drops.
  assert.ok(big.head_ft < small.head_ft);
});

test("recirc-loop-sizing: thicker insulation lowers U (less heat loss)", () => {
  const bare = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 0, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  const t1 = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  const t15 = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1.5, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.ok(bare.q_per_ft_btu_hr > t1.q_per_ft_btu_hr);
  assert.ok(t1.q_per_ft_btu_hr > t15.q_per_ft_btu_hr);
});

test("recirc-loop-sizing: insulation thickness 0 surfaces ASHRAE 90.1 non-compliance warning", () => {
  const r = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 0, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.ok(r.warnings.some((w) => /ASHRAE 90\.1/.test(w)));
});

test("recirc-loop-sizing: loop length under 50 ft warns 'may not need recirc'", () => {
  const r = computeRecircLoopSizing({ loop_length_ft: 30, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.ok(r.warnings.some((w) => /may not need recirculation/i.test(w)));
});

test("recirc-loop-sizing: hot supply <= ambient rejected", () => {
  const r = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 60, ambient_F: 65, set_point_delta_F: 10 });
  assert.match(r.error, /Hot-supply/);
});

test("recirc-loop-sizing: zero / negative length and set-point delta rejected", () => {
  assert.ok(computeRecircLoopSizing({ loop_length_ft: 0, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 }).error);
  assert.ok(computeRecircLoopSizing({ loop_length_ft: -5, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 }).error);
  assert.ok(computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 0 }).error);
});

test("recirc-loop-sizing: unknown nominal size rejected", () => {
  const r = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "6", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.match(r.error, /Unknown nominal/);
});

test("recirc-loop-sizing: insulation interpolation at 0.75-in is between 0.5 and 1 break points", () => {
  const t05 = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 0.5, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  const t075 = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 0.75, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  const t1 = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.ok(t075.U_coefficient < t05.U_coefficient);
  assert.ok(t075.U_coefficient > t1.U_coefficient);
});

test("recirc-loop-sizing: pump recommendation is on the standard HP ladder", () => {
  const r = computeRecircLoopSizing(recircLoopSizingExample.inputs);
  assert.ok(RECIRC_PUMP_LADDER_HP.includes(r.recommended_hp));
});

test("recirc-loop-sizing: lookup tables expose copper sizes 0.5 through 1.5 in with matching IDs", () => {
  for (const k of Object.keys(RECIRC_LOSS_U)) {
    assert.ok(COPPER_TYPE_L_ID_IN[k] > 0, "missing ID for nominal size " + k);
  }
  assert.equal(Object.keys(RECIRC_LOSS_U).length, 5);
});

test("recirc-loop-sizing: PLUMBING_RENDERERS exposes recirc-loop-sizing", () => {
  assert.equal(typeof PLUMBING_RENDERERS["recirc-loop-sizing"], "function");
});
