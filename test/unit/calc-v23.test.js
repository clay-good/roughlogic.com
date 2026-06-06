// spec-v23 unit tests for the new tiles landed in the v23 enhancement +
// expansion pass. Each tile is one formula, one cross-check, one tolerance,
// one named US authority. The assertions pin the published constants so a
// future edit that changed a constant or swapped an operator fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLuxFootcandle, luxFootcandleExample } from "../../calc-electrical.js";

// ---------------------------------------------------------------------------
// A.1 lux-to-footcandle (IES lumen method + exact unit identity)
// ---------------------------------------------------------------------------

test("lux-to-footcandle: 100 fc converts to 1076.4 lux (exact identity)", () => {
  const r = computeLuxFootcandle({ mode: "convert", footcandles: 100 });
  assert.ok(Math.abs(r.lux - 1076.4) < 0.01);
  assert.strictEqual(r.footcandles, 100);
});

test("lux-to-footcandle: example fixture round-trips fc -> lux", () => {
  const r = computeLuxFootcandle(luxFootcandleExample.inputs);
  assert.ok(Math.abs(r.lux - 1076.4) < 0.05);
});

test("lux-to-footcandle: lux -> fc inverse is consistent", () => {
  const r = computeLuxFootcandle({ mode: "convert", lux: 1076.4 });
  assert.ok(Math.abs(r.footcandles - 100) < 0.001);
});

test("lux-to-footcandle: lumen method averages fc = lumens*CU*LLF/area", () => {
  const r = computeLuxFootcandle({ mode: "room", lumens: 20000, area_ft2: 200, cu: 0.7, llf: 0.8 });
  assert.ok(Math.abs(r.footcandles - 56) < 0.001); // 20000*0.7*0.8/200
  assert.strictEqual(r.average, true);
  assert.ok(Math.abs(r.lux - 56 * 10.764) < 0.01);
});

test("lux-to-footcandle: empty convert and non-positive room inputs error", () => {
  assert.ok("error" in computeLuxFootcandle({ mode: "convert" }));
  assert.ok("error" in computeLuxFootcandle({ mode: "room", lumens: 0, area_ft2: 200 }));
  assert.ok("error" in computeLuxFootcandle({ mode: "room", lumens: 20000, area_ft2: 0 }));
});

test("lux-to-footcandle: CU and LLF must be in (0, 1]", () => {
  assert.ok("error" in computeLuxFootcandle({ mode: "room", lumens: 20000, area_ft2: 200, cu: 1.5, llf: 0.8 }));
  assert.ok("error" in computeLuxFootcandle({ mode: "room", lumens: 20000, area_ft2: 200, cu: 0.7, llf: 0 }));
  const ok = computeLuxFootcandle({ mode: "room", lumens: 20000, area_ft2: 200, cu: 1, llf: 1 });
  assert.ok(!("error" in ok));
});

import { computeDuctVelocityPressure, computeRefrigerantVelocity } from "../../calc-hvac.js";
import { computeFireStreamReaction, computeSprinklerKFactor } from "../../calc-fire.js";
import { computeValveFlowCoefficient } from "../../calc-mechanic.js";
import { computeOd600CellCount } from "../../calc-lab.js";
import { computeCurveGradeScaler } from "../../calc-edu.js";

// ---------------------------------------------------------------------------
// C.1 duct-velocity-pressure
// ---------------------------------------------------------------------------
test("duct-velocity-pressure: VP 0.25 -> V 2002.5 fpm and inverse round-trips", () => {
  const v = computeDuctVelocityPressure({ solve_for: "velocity", vp_inwc: 0.25 });
  assert.ok(Math.abs(v.velocity_fpm - 2002.5) < 0.1);
  const vp = computeDuctVelocityPressure({ solve_for: "vp", velocity_fpm: v.velocity_fpm });
  assert.ok(Math.abs(vp.vp_inwc - 0.25) < 1e-6);
});
test("duct-velocity-pressure: non-positive and Infinity inputs error", () => {
  assert.ok("error" in computeDuctVelocityPressure({ solve_for: "velocity", vp_inwc: 0 }));
  assert.ok("error" in computeDuctVelocityPressure({ solve_for: "velocity", vp_inwc: Infinity }));
  assert.ok("error" in computeDuctVelocityPressure({ solve_for: "vp", velocity_fpm: 0 }));
});

// ---------------------------------------------------------------------------
// C.2 refrigerant-velocity
// ---------------------------------------------------------------------------
test("refrigerant-velocity: 600 lb/hr, 0.5 ft^3/lb, 0.75 in -> ~1630 fpm and oil-return verdict", () => {
  const r = computeRefrigerantVelocity({ mass_flow_lb_hr: 600, line_id_in: 0.75, specific_volume_ft3_lb: 0.5, orientation: "riser" });
  assert.ok(Math.abs(r.velocity_fpm - 1629.75) < 1);
  assert.strictEqual(r.oil_return_min_fpm, 1500);
});
test("refrigerant-velocity: below-minimum and above-noise verdicts trip; non-finite rejected", () => {
  const slow = computeRefrigerantVelocity({ mass_flow_lb_hr: 100, line_id_in: 2, specific_volume_ft3_lb: 0.3, orientation: "riser" });
  assert.match(slow.verdict, /below/);
  assert.ok("error" in computeRefrigerantVelocity({ mass_flow_lb_hr: 600, line_id_in: 0.75, specific_volume_ft3_lb: 0 }));
});

// ---------------------------------------------------------------------------
// F.1 fire-stream-reaction
// ---------------------------------------------------------------------------
test("fire-stream-reaction: smooth bore 1 in @ 50 psi -> 78.5 lb (hose team)", () => {
  const r = computeFireStreamReaction({ nozzle_type: "smooth", bore_in: 1.0, nozzle_pressure_psi: 50 });
  assert.ok(Math.abs(r.reaction_lb - 78.5) < 0.05);
  assert.match(r.staffing, /hose team/);
});
test("fire-stream-reaction: fog 150 gpm @ 100 psi -> 75.75 lb; NP<=0 rejected", () => {
  const r = computeFireStreamReaction({ nozzle_type: "fog", flow_gpm: 150, nozzle_pressure_psi: 100 });
  assert.ok(Math.abs(r.reaction_lb - 75.75) < 0.05);
  assert.ok("error" in computeFireStreamReaction({ nozzle_type: "fog", flow_gpm: 150, nozzle_pressure_psi: 0 }));
});

// ---------------------------------------------------------------------------
// F.2 sprinkler-k-factor
// ---------------------------------------------------------------------------
test("sprinkler-k-factor: K 5.6 @ 7 psi -> 14.82 gpm and the three solve-for modes are consistent", () => {
  const q = computeSprinklerKFactor({ solve_for: "flow", k_factor: 5.6, pressure_psi: 7 });
  assert.ok(Math.abs(q.flow_gpm - 14.816) < 0.01);
  const p = computeSprinklerKFactor({ solve_for: "pressure", k_factor: 5.6, flow_gpm: q.flow_gpm });
  assert.ok(Math.abs(p.pressure_psi - 7) < 0.001);
  const k = computeSprinklerKFactor({ solve_for: "k", flow_gpm: q.flow_gpm, pressure_psi: 7 });
  assert.ok(Math.abs(k.k_factor - 5.6) < 0.001);
});
test("sprinkler-k-factor: P<=0 rejected on flow and k solves", () => {
  assert.ok("error" in computeSprinklerKFactor({ solve_for: "flow", k_factor: 5.6, pressure_psi: 0 }));
  assert.ok("error" in computeSprinklerKFactor({ solve_for: "k", flow_gpm: 14, pressure_psi: 0 }));
});

// ---------------------------------------------------------------------------
// K.1 valve-flow-coefficient
// ---------------------------------------------------------------------------
test("valve-flow-coefficient: Cv 10, dP 25, SG 1 -> 50 gpm and inverse modes", () => {
  const q = computeValveFlowCoefficient({ solve_for: "flow", specific_gravity: 1, cv: 10, dp_psi: 25 });
  assert.ok(Math.abs(q.flow_gpm - 50) < 0.001);
  const cv = computeValveFlowCoefficient({ solve_for: "cv", specific_gravity: 1, flow_gpm: 50, dp_psi: 25 });
  assert.ok(Math.abs(cv.cv - 10) < 0.001);
  const dp = computeValveFlowCoefficient({ solve_for: "dp", specific_gravity: 1, cv: 10, flow_gpm: 50 });
  assert.ok(Math.abs(dp.dp_psi - 25) < 0.001);
});
test("valve-flow-coefficient: gas regime flagged; dP<=0 and SG<=0 rejected", () => {
  const gas = computeValveFlowCoefficient({ solve_for: "flow", fluid: "gas", specific_gravity: 0.6, cv: 10, dp_psi: 25 });
  assert.ok(gas.gas_note);
  assert.ok("error" in computeValveFlowCoefficient({ solve_for: "flow", specific_gravity: 1, cv: 10, dp_psi: 0 }));
  assert.ok("error" in computeValveFlowCoefficient({ solve_for: "flow", specific_gravity: 0, cv: 10, dp_psi: 25 }));
});

// ---------------------------------------------------------------------------
// T.2 od600-cell-count
// ---------------------------------------------------------------------------
test("od600-cell-count: OD 0.5 * 8e8 * 1 -> 4e8 cells/mL, in linear range", () => {
  const r = computeOd600CellCount({ od600: 0.5, factor_cells_per_od: 8e8, dilution: 1 });
  assert.strictEqual(r.cells_per_ml, 4e8);
  assert.strictEqual(r.in_linear_range, true);
});
test("od600-cell-count: above ~0.8 flagged; missing factor rejected", () => {
  assert.strictEqual(computeOd600CellCount({ od600: 1.0, factor_cells_per_od: 8e8, dilution: 1 }).in_linear_range, false);
  assert.ok("error" in computeOd600CellCount({ od600: 0.5, factor_cells_per_od: 0, dilution: 1 }));
});

// ---------------------------------------------------------------------------
// Y.1 curve-grade-scaler
// ---------------------------------------------------------------------------
test("curve-grade-scaler: square-root of 49 -> 70; flat add clamps at 100", () => {
  assert.ok(Math.abs(computeCurveGradeScaler({ method: "sqrt", raw_score: 49 }).curved - 70) < 0.001);
  assert.strictEqual(computeCurveGradeScaler({ method: "flat", raw_score: 90, param: 20 }).curved, 100);
});
test("curve-grade-scaler: linear rescale maps class mean to target and anchors 100; negative raw rejected", () => {
  const lin = computeCurveGradeScaler({ method: "linear", raw_score: 60, param: 75, class_mean: 60 });
  assert.ok(Math.abs(lin.curved - 75) < 0.001);
  assert.ok(Math.abs(computeCurveGradeScaler({ method: "linear", raw_score: 100, param: 75, class_mean: 60 }).curved - 100) < 0.001);
  assert.ok("error" in computeCurveGradeScaler({ method: "flat", raw_score: -5 }));
});
