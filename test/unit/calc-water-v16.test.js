// spec-v16 Group M unit tests for the four first-principles water /
// wastewater tiles landed in v16: N.1 pool-turnover, N.3 well-drawdown,
// N.4 cooling-water-makeup, and N.5 chlorine-decay. Worked examples
// cross-check against the published references named in each tile's
// citation (NSPF CPO Handbook, AWWA A100 / USGS, CTI / ASHRAE, EPA
// 815-R-02-020 / AWWA M14).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePoolTurnover, poolTurnoverExample, POOL_CHLORINE_TYPES,
  computeWellDrawdown, wellDrawdownExample,
  computeCoolingWaterMakeup, coolingWaterMakeupExample,
  computeChlorineDecay, chlorineDecayExample,
  WATER_RENDERERS,
} from "../../calc-water.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

// --- N.1 Pool turnover and chlorine demand (8 tests) -----------------

test("pool-turnover: 20,000 gal at 6 hr -> 55.6 GPM; 2 ppm cal-hypo -> 0.513 lb", () => {
  const r = computePoolTurnover(poolTurnoverExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.turnover_gpm, 55.556, 0.5));
  assert.ok(closePct(r.dose_pure_lb, 0.3336, 0.5));
  assert.ok(closePct(r.chlorine_product_lb, 0.5132, 0.5));
});

test("pool-turnover: GPM = volume / (turnover hr * 60)", () => {
  const r = computePoolTurnover({ pool_volume_gal: 36000, turnover_hr: 8, chlorine_ppm: 2 });
  assert.ok(close(r.turnover_gpm, 36000 / (8 * 60), 1e-9));
});

test("pool-turnover: pure chlorine dose = volume * ppm * 8.34 / 1e6", () => {
  const r = computePoolTurnover({ pool_volume_gal: 50000, turnover_hr: 6, chlorine_ppm: 3 });
  assert.ok(close(r.dose_pure_lb, (50000 * 3 * 8.34) / 1e6, 1e-9));
});

test("pool-turnover: product weight scales inversely with available-chlorine fraction", () => {
  const cal = computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 6, chlorine_ppm: 2, chlorine_type: "cal_hypo" });
  const tri = computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 6, chlorine_ppm: 2, chlorine_type: "trichlor" });
  const bleach = computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 6, chlorine_ppm: 2, chlorine_type: "liquid_bleach" });
  assert.ok(tri.chlorine_product_lb < cal.chlorine_product_lb);
  assert.ok(bleach.chlorine_product_lb > cal.chlorine_product_lb);
  assert.ok(close(cal.chlorine_product_lb, cal.dose_pure_lb / POOL_CHLORINE_TYPES.cal_hypo.frac, 1e-9));
});

test("pool-turnover: shorter turnover demands more flow", () => {
  const six = computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 6 });
  const eight = computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 8 });
  assert.ok(six.turnover_gpm > eight.turnover_gpm);
});

test("pool-turnover: turnover above 24 hr is flagged", () => {
  const r = computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 30, chlorine_ppm: 2 });
  assert.ok(r.warnings.some((w) => /24 hr/.test(w)));
});

test("pool-turnover: a closure-threshold chlorine target is rejected", () => {
  assert.ok("error" in computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 6, chlorine_ppm: 11 }));
});

test("pool-turnover: non-positive volume and turnover are rejected", () => {
  assert.ok("error" in computePoolTurnover({ pool_volume_gal: 0 }));
  assert.ok("error" in computePoolTurnover({ pool_volume_gal: 20000, turnover_hr: 0 }));
});

// --- N.3 Well drawdown and specific capacity (6 tests) ---------------

test("well-drawdown: static 50, pumping 80, 30 GPM -> drawdown 30, 1.0 GPM/ft, 100 ft setting", () => {
  const r = computeWellDrawdown(wellDrawdownExample.inputs);
  assert.ok(!r.error);
  assert.strictEqual(r.drawdown_ft, 30);
  assert.ok(close(r.specific_capacity_gpm_ft, 1.0, 1e-9));
  assert.strictEqual(r.pump_setting_ft, 100);
});

test("well-drawdown: drawdown = pumping - static", () => {
  const r = computeWellDrawdown({ static_level_ft: 40, pumping_level_ft: 95, discharge_gpm: 50 });
  assert.strictEqual(r.drawdown_ft, 55);
});

test("well-drawdown: specific capacity = discharge / drawdown", () => {
  const r = computeWellDrawdown({ static_level_ft: 40, pumping_level_ft: 90, discharge_gpm: 100 });
  assert.ok(close(r.specific_capacity_gpm_ft, 100 / 50, 1e-9));
});

test("well-drawdown: a low specific capacity is flagged marginal", () => {
  const r = computeWellDrawdown({ static_level_ft: 50, pumping_level_ft: 200, discharge_gpm: 30 });
  assert.ok(r.specific_capacity_gpm_ft < 0.5);
  assert.ok(r.warnings.some((w) => /marginal/i.test(w)));
});

test("well-drawdown: pump setting = pumping level + offset", () => {
  const r = computeWellDrawdown({ static_level_ft: 50, pumping_level_ft: 80, discharge_gpm: 30, pump_offset_ft: 35 });
  assert.strictEqual(r.pump_setting_ft, 115);
});

test("well-drawdown: pumping above static and zero discharge are rejected", () => {
  assert.ok("error" in computeWellDrawdown({ static_level_ft: 80, pumping_level_ft: 50, discharge_gpm: 30 }));
  assert.ok("error" in computeWellDrawdown({ static_level_ft: 50, pumping_level_ft: 80, discharge_gpm: 0 }));
});

// --- N.4 Cooling water makeup (8 tests) ------------------------------

test("cooling-water-makeup: 1000 GPM, 10 F, COC 4, drift 0.002 -> makeup 15.33 GPM", () => {
  const r = computeCoolingWaterMakeup(coolingWaterMakeupExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.evaporation_gpm, 10, 1e-9));
  assert.ok(close(r.blowdown_gpm, 10 / 3, 1e-9));
  assert.ok(close(r.drift_gpm, 2, 1e-9));
  assert.ok(closePct(r.makeup_gpm, 15.3333, 0.5));
});

test("cooling-water-makeup: evaporation = recirc * delta-T / 1000", () => {
  const r = computeCoolingWaterMakeup({ recirculation_gpm: 2000, delta_T_F: 15, coc: 5 });
  assert.ok(close(r.evaporation_gpm, (2000 * 15) / 1000, 1e-9));
});

test("cooling-water-makeup: blowdown = evaporation / (COC - 1)", () => {
  const r = computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 6 });
  assert.ok(close(r.blowdown_gpm, r.evaporation_gpm / 5, 1e-9));
});

test("cooling-water-makeup: drift = recirc * drift fraction", () => {
  const r = computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 4, drift_fraction: 0.003 });
  assert.ok(close(r.drift_gpm, 1000 * 0.003, 1e-9));
});

test("cooling-water-makeup: makeup = evaporation + blowdown + drift", () => {
  const r = computeCoolingWaterMakeup({ recirculation_gpm: 1500, delta_T_F: 12, coc: 5, drift_fraction: 0.002 });
  assert.ok(close(r.makeup_gpm, r.evaporation_gpm + r.blowdown_gpm + r.drift_gpm, 1e-9));
});

test("cooling-water-makeup: higher COC reduces blowdown", () => {
  const low = computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 3 });
  const high = computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 8 });
  assert.ok(high.blowdown_gpm < low.blowdown_gpm);
});

test("cooling-water-makeup: COC above 10 flags a scaling risk; excess drift flags the eliminator", () => {
  const scale = computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 12 });
  assert.ok(scale.warnings.some((w) => /scaling/i.test(w)));
  const drift = computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 4, drift_fraction: 0.01 });
  assert.ok(drift.warnings.some((w) => /drift/i.test(w)));
});

test("cooling-water-makeup: non-positive recirc / delta-T and COC <= 1 are rejected", () => {
  assert.ok("error" in computeCoolingWaterMakeup({ recirculation_gpm: 0, delta_T_F: 10, coc: 4 }));
  assert.ok("error" in computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 0, coc: 4 }));
  assert.ok("error" in computeCoolingWaterMakeup({ recirculation_gpm: 1000, delta_T_F: 10, coc: 1 }));
});

// --- N.5 Chlorine residual decay (8 tests) ---------------------------

test("chlorine-decay: C0=2, k=0.1, t=10 -> 0.736 mg/L; target 0.2 -> 23.03 hr", () => {
  const r = computeChlorineDecay(chlorineDecayExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.residual_mg_l, 0.73576, 0.5));
  assert.ok(closePct(r.time_to_target_hr, 23.0259, 0.5));
});

test("chlorine-decay: residual follows C(t) = C0 * exp(-k t)", () => {
  const r = computeChlorineDecay({ initial_mg_l: 1.5, decay_k_per_hr: 0.2, time_hr: 5, target_mg_l: 0.2 });
  assert.ok(close(r.residual_mg_l, 1.5 * Math.exp(-0.2 * 5), 1e-9));
});

test("chlorine-decay: time to target = ln(C0/target) / k", () => {
  const r = computeChlorineDecay({ initial_mg_l: 1.0, decay_k_per_hr: 0.05, time_hr: 0, target_mg_l: 0.2 });
  assert.ok(close(r.time_to_target_hr, Math.log(1.0 / 0.2) / 0.05, 1e-9));
});

test("chlorine-decay: residual decays monotonically in time", () => {
  const a = computeChlorineDecay({ initial_mg_l: 2.0, decay_k_per_hr: 0.1, time_hr: 5, target_mg_l: 0.2 });
  const b = computeChlorineDecay({ initial_mg_l: 2.0, decay_k_per_hr: 0.1, time_hr: 15, target_mg_l: 0.2 });
  assert.ok(b.residual_mg_l < a.residual_mg_l);
});

test("chlorine-decay: a distribution velocity yields a booster distance = velocity * ttt * 3600", () => {
  const r = computeChlorineDecay({ initial_mg_l: 2.0, decay_k_per_hr: 0.1, time_hr: 10, target_mg_l: 0.2, velocity_fps: 2 });
  assert.ok(close(r.booster_distance_ft, 2 * r.time_to_target_hr * 3600, 1e-6));
});

test("chlorine-decay: booster distance is null without a velocity", () => {
  const r = computeChlorineDecay({ initial_mg_l: 2.0, decay_k_per_hr: 0.1, time_hr: 10, target_mg_l: 0.2 });
  assert.strictEqual(r.booster_distance_ft, null);
});

test("chlorine-decay: a high decay constant is flagged", () => {
  const r = computeChlorineDecay({ initial_mg_l: 2.0, decay_k_per_hr: 0.6, time_hr: 2, target_mg_l: 0.2 });
  assert.ok(r.warnings.some((w) => /0\.5/.test(w)));
});

test("chlorine-decay: non-positive initial / k / target are rejected", () => {
  assert.ok("error" in computeChlorineDecay({ initial_mg_l: 0, decay_k_per_hr: 0.1 }));
  assert.ok("error" in computeChlorineDecay({ initial_mg_l: 2, decay_k_per_hr: 0 }));
  assert.ok("error" in computeChlorineDecay({ initial_mg_l: 2, decay_k_per_hr: 0.1, target_mg_l: 0 }));
});

// --- Wiring sentinel -------------------------------------------------

test("v16 water renderers are registered in WATER_RENDERERS", () => {
  for (const id of ["pool-turnover", "well-drawdown", "cooling-water-makeup", "chlorine-decay"]) {
    assert.strictEqual(typeof WATER_RENDERERS[id], "function", id + " renderer missing");
  }
});
