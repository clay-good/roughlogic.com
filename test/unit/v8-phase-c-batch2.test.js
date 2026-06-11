// v8 Phase C batch 2 - 7 more per-tool refinements (spec §5).

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeVoltageImbalance, NEMA_HP_DERATE_TABLE } from "../../calc-electrical.js";
import { computeExpansionTank } from "../../calc-plumbing.js";
import { computeGasPipeSizing } from "../../calc-gas.js";
import { manualJHeating } from "../../calc-hvac.js";
import { computeDIM } from "../../calc-trucking.js";
import { computeBrakePadLife } from "../../calc-mechanic.js";
import { computeTimberCruise } from "../../calc-agriculture.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- C.1 voltage-imbalance NEMA derate table ---

test("C.1 voltage-imbalance NEMA derate at 0% imbalance is 0", () => {
  const r = computeVoltageImbalance({ V_a: 480, V_b: 480, V_c: 480 });
  assert.equal(r.nema_hp_derate_pct, 0);
});

test("C.1 voltage-imbalance NEMA derate scales 0 → 2 → 4 across the 1-2% band", () => {
  // 480/480/472.8 yields ~ 1.005% imbalance; derate ~ 2.0%.
  const r = computeVoltageImbalance({ V_a: 480, V_b: 480, V_c: 472.8 });
  assert.ok(close(r.imbalance_percent, 1.0, 0.05));
  assert.ok(close(r.nema_hp_derate_pct, 2.0, 0.3));
});

test("C.1 voltage-imbalance NEMA derate caps at 25% for ≥ 5% imbalance", () => {
  // Force >5% imbalance.
  const r = computeVoltageImbalance({ V_a: 480, V_b: 480, V_c: 432 });
  assert.ok(r.imbalance_percent > 5);
  assert.equal(r.nema_hp_derate_pct, 25);
});

test("C.1 voltage-imbalance returns the published NEMA table for renderer use", () => {
  const r = computeVoltageImbalance({ V_a: 480, V_b: 478, V_c: 476 });
  assert.deepEqual(r.nema_table, NEMA_HP_DERATE_TABLE);
});

// --- C.2 expansion-tank pre-charge pressure ---

test("C.2 expansion-tank reports precharge_psi = fill_pressure", () => {
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.equal(r.precharge_psi, 12);
});

test("C.2 expansion-tank includes a placement_note", () => {
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.match(r.placement_note, /pump/);
  assert.match(r.placement_note, /Pre-charge/);
});

// --- C.2 gas-pipe-sizing achieved pressure drop ---

test("C.2 gas-pipe-sizing reports dP_achieved_in_wc when sized", () => {
  const r = computeGasPipeSizing({ btu_load: 100000, length_ft: 50, gas: "natural_gas" });
  assert.ok(r.dP_achieved_in_wc !== undefined);
  // Achieved drop should be at most the design drop (sized at or above capacity).
  if (r.dP_achieved_in_wc !== null) {
    assert.ok(r.dP_achieved_in_wc <= r.dP_in_wc + 0.0001);
  }
});

test("C.2 gas-pipe-sizing dP_achieved_in_wc null when no size fits", () => {
  // Massive load on a short small pipe.
  const r = computeGasPipeSizing({ btu_load: 100000000, length_ft: 1000, gas: "natural_gas" });
  assert.equal(r.dP_achieved_in_wc, null);
});

// --- C.3 manual-j-heating tons output ---

test("C.3 manual-j-heating returns tons = total_BTU_hr / 12000", () => {
  const r = manualJHeating({ floor_area_ft2: 1500, wall_area_ft2: 1200, window_area_ft2: 200, ceiling_area_ft2: 1500, insulation_level: "average", window_type: "double", outdoor_design_F: 10, indoor_design_F: 70 });
  assert.ok(close(r.tons, r.total_BTU_hr / 12000, 0.001));
});

// --- C.5 dim-weight break-even volume ---

test("C.5 dim-weight breakeven_in3 = actual_weight × divisor", () => {
  const r = computeDIM({ length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 20, carrier: "UPS_Daily" });
  // UPS_Daily divisor = 139; 20 × 139 = 2780 in³
  assert.equal(r.breakeven_in3, 20 * 139);
});

test("C.5 dim-weight billing_basis flips at the cross-over", () => {
  // 24×18×12 = 5184 in³; / 139 = 37.3 lb DIM. With 50 lb actual ⇒ actual; with 20 lb actual ⇒ DIM.
  const a = computeDIM({ length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 50, carrier: "UPS_Daily" });
  const b = computeDIM({ length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 20, carrier: "UPS_Daily" });
  assert.match(a.billing_basis, /weigh-out/);
  assert.match(b.billing_basis, /cube-out/);
});

test("C.5 dim-weight breakeven_in3 null when actual_weight = 0", () => {
  const r = computeDIM({ length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 0, carrier: "UPS_Daily" });
  assert.equal(r.breakeven_in3, null);
});

// --- C.5 brake-pad-life cost per 100k miles ---

test("C.5 brake-pad-life cost null when no $/set supplied", () => {
  const r = computeBrakePadLife({ vehicle_weight_lb: 4000, speed_delta_mph: 30, stops_per_mile: 1, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
  assert.equal(r.cost_per_100k_miles_usd, null);
});

test("C.5 brake-pad-life cost = $/set × 100000 / miles_until_worn", () => {
  const r = computeBrakePadLife({ vehicle_weight_lb: 4000, speed_delta_mph: 30, stops_per_mile: 1, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18, pad_set_cost_usd: 80 });
  assert.ok(close(r.cost_per_100k_miles_usd, (80 * 100000) / r.miles_until_worn, 0.01));
});

// --- C.6 timber-cruise stand value ---

test("C.6 timber-cruise value null when no $/bf supplied", () => {
  const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "doyle" });
  assert.equal(r.value_usd, null);
});

test("C.6 timber-cruise value = bf × $/bf", () => {
  const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "doyle", price_per_bf: 0.65 });
  // Doyle: (14 - 4)² × (16/16) = 100 bf; value = 100 × 0.65 = 65
  assert.ok(close(r.value_usd, 100 * 0.65, 0.01));
});
