// Unit tests for calc-kitchen.js v4 utilities (222-226).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRecipeScale, recipeScaleExample, INGREDIENT_DENSITIES_G_PER_CUP,
  computeYieldEP, yieldEPExample,
  computeCoolingCurve, coolingCurveExample,
  computePlateCost, plateCostExample,
  computePanConversion, panConversionExample, PAN_CAPACITIES_QT,
  KITCHEN_RENDERERS,
} from "../../calc-kitchen.js";
import { computeGreaseDuctCleaningInterval, computeWalkInDoorInfiltration } from "../../calc-kitchen.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 222 Recipe scaling
test("Recipe: example yields factor 2.5", () => { const r = computeRecipeScale(recipeScaleExample.inputs); assert.equal(r.factor, 2.5); });
test("Recipe: rows scaled", () => { const r = computeRecipeScale(recipeScaleExample.inputs); assert.equal(r.rows[0].quantity, 5); });
test("Recipe: empty rows errors", () => { const r = computeRecipeScale({ rows: [], original_yield: 12, target_yield: 30 }); assert.ok(r.error); });
test("Recipe: zero yield errors", () => { const r = computeRecipeScale({ rows: [{ ingredient: "flour_ap", quantity: 1, unit: "cup" }], original_yield: 0, target_yield: 30 }); assert.ok(r.error); });
test("Recipe: cup -> g for known ingredient", () => { const r = computeRecipeScale({ rows: [{ ingredient: "flour_ap", quantity: 2, unit: "cup" }], original_yield: 12, target_yield: 30 }); assert.equal(r.rows[0].alt_unit, "g"); });
test("Recipe: egg fractional -> g", () => { const r = computeRecipeScale({ rows: [{ ingredient: "egg_whole", quantity: 1, unit: "egg" }], original_yield: 2, target_yield: 5 }); assert.equal(r.rows[0].alt_unit, "g"); });
test("Recipe: factor < 1 reduces", () => { const r = computeRecipeScale({ rows: [{ ingredient: "flour_ap", quantity: 4, unit: "cup" }], original_yield: 12, target_yield: 6 }); assert.equal(r.rows[0].quantity, 2); });
test("Recipe: ingredient densities all positive", () => { for (const k of Object.keys(INGREDIENT_DENSITIES_G_PER_CUP)) assert.ok(INGREDIENT_DENSITIES_G_PER_CUP[k] > 0); });
test("Recipe: negative qty errors", () => { const r = computeRecipeScale({ rows: [{ ingredient: "flour_ap", quantity: -1, unit: "cup" }], original_yield: 12, target_yield: 30 }); assert.ok(r.error); });
test("Recipe: row count preserved", () => { const r = computeRecipeScale(recipeScaleExample.inputs); assert.equal(r.rows.length, 4); });

// 223 Yield EP
test("Yield: example pass", () => { const r = computeYieldEP(yieldEPExample.inputs); assert.ok(r.yield_pct > 0 && r.yield_pct < 100); });
test("Yield: zero AP errors", () => { const r = computeYieldEP({ ap_weight: 0, trim_weight: 1, cooking_loss_pct: 10, ap_cost_per_lb: 5 }); assert.ok(r.error); });
test("Yield: trim > AP errors", () => { const r = computeYieldEP({ ap_weight: 5, trim_weight: 6, cooking_loss_pct: 10, ap_cost_per_lb: 5 }); assert.ok(r.error); });
test("Yield: cooking loss > 100 errors", () => { const r = computeYieldEP({ ap_weight: 10, trim_weight: 1, cooking_loss_pct: 150, ap_cost_per_lb: 5 }); assert.ok(r.error); });
test("Yield: 100% no loss = AP weight", () => { const r = computeYieldEP({ ap_weight: 10, trim_weight: 0, cooking_loss_pct: 0, ap_cost_per_lb: 5 }); assert.equal(r.ep_weight, 10); });
test("Yield: EP cost = AP cost / yield", () => { const r = computeYieldEP({ ap_weight: 10, trim_weight: 2, cooking_loss_pct: 0, ap_cost_per_lb: 5 }); assert.ok(close(r.ep_cost_per_lb, 5 / 0.8, 0.01)); });
test("Yield: zero AP cost -> EP cost null", () => { const r = computeYieldEP({ ap_weight: 10, trim_weight: 1, cooking_loss_pct: 10, ap_cost_per_lb: 0 }); assert.equal(r.ep_cost_per_lb, null); });
test("Yield: cooking_loss reduces EP", () => { const a = computeYieldEP({ ap_weight: 10, trim_weight: 0, cooking_loss_pct: 0, ap_cost_per_lb: 5 }); const b = computeYieldEP({ ap_weight: 10, trim_weight: 0, cooking_loss_pct: 25, ap_cost_per_lb: 5 }); assert.ok(b.ep_weight < a.ep_weight); });
test("Yield: 100% trim -> 0 EP", () => { const r = computeYieldEP({ ap_weight: 10, trim_weight: 10, cooking_loss_pct: 0, ap_cost_per_lb: 5 }); assert.equal(r.ep_weight, 0); });
test("Yield: yield_pct positive normal case", () => { const r = computeYieldEP(yieldEPExample.inputs); assert.ok(r.yield_pct > 50); });

// 224 Cooling curve
test("Cool: example finite", () => { const r = computeCoolingCurve(coolingCurveExample.inputs); assert.ok(r.phase1_minutes > 0); assert.ok(r.phase2_minutes > 0); });
test("Cool: ice bath fastest", () => { const a = computeCoolingCurve({ ...coolingCurveExample.inputs, container: "full_pan_4in" }); const b = computeCoolingCurve({ ...coolingCurveExample.inputs, container: "ice_bath" }); assert.ok(b.phase1_minutes < a.phase1_minutes); });
test("Cool: zero start temp errors", () => { const r = computeCoolingCurve({ start_F: 60, ambient_F: 70, container: "full_pan_4in", product_type: "thick_liquid" }); assert.ok(r.error); });
test("Cool: unknown container errors", () => { const r = computeCoolingCurve({ start_F: 165, ambient_F: 70, container: "x", product_type: "thick_liquid" }); assert.ok(r.error); });
test("Cool: phase 1 fail at >120 min", () => { const r = computeCoolingCurve({ start_F: 165, ambient_F: 90, container: "full_pan_4in", product_type: "dense_solid" }); if (r.phase1_minutes > 120) assert.equal(r.phase1_pass, false); });
test("Cool: blast chiller passes", () => { const r = computeCoolingCurve({ start_F: 165, ambient_F: 70, container: "blast_chiller", product_type: "thin_liquid" }); assert.equal(r.phase1_pass, true); });
test("Cool: cooler ambient -> faster", () => { const a = computeCoolingCurve({ ...coolingCurveExample.inputs, ambient_F: 90 }); const b = computeCoolingCurve({ ...coolingCurveExample.inputs, ambient_F: 50 }); assert.ok(b.phase1_minutes < a.phase1_minutes); });
test("Cool: phase 2 ~1.6x phase 1", () => { const r = computeCoolingCurve(coolingCurveExample.inputs); assert.ok(close(r.phase2_minutes / r.phase1_minutes, 1.6, 0.01)); });
test("Cool: dense solid slowest", () => { const a = computeCoolingCurve({ ...coolingCurveExample.inputs, product_type: "thin_liquid" }); const b = computeCoolingCurve({ ...coolingCurveExample.inputs, product_type: "dense_solid" }); assert.ok(b.phase1_minutes > a.phase1_minutes); });
test("Cool: unknown product errors", () => { const r = computeCoolingCurve({ start_F: 165, ambient_F: 70, container: "full_pan_4in", product_type: "x" }); assert.ok(r.error); });

// 225 Plate cost
test("Plate: example finite", () => { const r = computePlateCost(plateCostExample.inputs); assert.ok(r.plate_cost > 0); assert.ok(r.suggested_price > r.plate_cost); });
test("Plate: empty list errors", () => { const r = computePlateCost({ ingredients: [], target_food_cost_pct: 30 }); assert.ok(r.error); });
test("Plate: 30% food cost -> price = cost / 0.3", () => { const r = computePlateCost({ ingredients: [{ name: "x", lbs: 1, cost_per_lb: 6 }], target_food_cost_pct: 30 }); assert.ok(close(r.suggested_price, 6 / 0.3, 0.001)); });
test("Plate: contribution margin = price - cost", () => { const r = computePlateCost(plateCostExample.inputs); assert.ok(close(r.contribution_margin, r.suggested_price - r.plate_cost, 0.01)); });
test("Plate: bad food cost % errors", () => { const r = computePlateCost({ ingredients: [{ name: "x", lbs: 1, cost_per_lb: 6 }], target_food_cost_pct: 0 }); assert.ok(r.error); });
test("Plate: high cost flagged", () => { const r = computePlateCost({ ingredients: [{ name: "x", lbs: 5, cost_per_lb: 100 }], target_food_cost_pct: 30 }); assert.match(r.sanity_flag, /above/); });
test("Plate: low cost flagged", () => { const r = computePlateCost({ ingredients: [{ name: "x", lbs: 0.05, cost_per_lb: 1 }], target_food_cost_pct: 30 }); assert.match(r.sanity_flag, /below/); });
test("Plate: negative lbs errors", () => { const r = computePlateCost({ ingredients: [{ name: "x", lbs: -1, cost_per_lb: 6 }], target_food_cost_pct: 30 }); assert.ok(r.error); });
test("Plate: scales linearly", () => { const a = computePlateCost({ ingredients: [{ name: "x", lbs: 1, cost_per_lb: 5 }], target_food_cost_pct: 30 }); const b = computePlateCost({ ingredients: [{ name: "x", lbs: 2, cost_per_lb: 5 }], target_food_cost_pct: 30 }); assert.ok(close(b.plate_cost / a.plate_cost, 2, 0.001)); });
test("Plate: 50% food cost = 2x markup", () => { const r = computePlateCost({ ingredients: [{ name: "x", lbs: 1, cost_per_lb: 5 }], target_food_cost_pct: 50 }); assert.ok(close(r.suggested_price, 10, 0.001)); });

// 226 Pan conversion
test("Pan: example yields finite", () => { const r = computePanConversion(panConversionExample.inputs); assert.ok(r.pans_needed >= 1); });
test("Pan: target_servings + portion sets total qt", () => { const r = computePanConversion({ target_qt: 0, target_servings: 50, portion_oz: 4, pan_size: "full", pan_depth_in: 4 }); assert.ok(close(r.total_qt, (50 * 4) / 32, 0.001)); });
test("Pan: 4 in depth triggers cooling warning", () => { const r = computePanConversion({ target_qt: 5, target_servings: 0, portion_oz: 4, pan_size: "full", pan_depth_in: 4 }); assert.ok(r.cooling_warning); });
test("Pan: 2.5 in depth no warning", () => { const r = computePanConversion({ target_qt: 5, target_servings: 0, portion_oz: 4, pan_size: "full", pan_depth_in: 2.5 }); assert.equal(r.cooling_warning, null); });
test("Pan: unknown size errors", () => { const r = computePanConversion({ target_qt: 5, target_servings: 0, portion_oz: 4, pan_size: "x", pan_depth_in: 4 }); assert.ok(r.error); });
test("Pan: unknown depth errors", () => { const r = computePanConversion({ target_qt: 5, target_servings: 0, portion_oz: 4, pan_size: "full", pan_depth_in: 99 }); assert.ok(r.error); });
test("Pan: zero everything errors", () => { const r = computePanConversion({ target_qt: 0, target_servings: 0, portion_oz: 0, pan_size: "full", pan_depth_in: 4 }); assert.ok(r.error); });
test("Pan: pans_needed rounds up", () => { const r = computePanConversion({ target_qt: 14, target_servings: 0, portion_oz: 0, pan_size: "full", pan_depth_in: 4 }); assert.equal(r.pans_needed, 2); });
test("Pan: every size has 2.5 / 4 / 6 capacities", () => { for (const k of Object.keys(PAN_CAPACITIES_QT)) { const row = PAN_CAPACITIES_QT[k]; assert.ok(row[2.5] > 0 && row[4] > 0 && row[6] > 0); } });
test("Pan: deeper pan more capacity", () => { const a = computePanConversion({ target_qt: 100, target_servings: 0, portion_oz: 0, pan_size: "full", pan_depth_in: 2.5 }); const b = computePanConversion({ target_qt: 100, target_servings: 0, portion_oz: 0, pan_size: "full", pan_depth_in: 6 }); assert.ok(b.capacity_qt > a.capacity_qt); });

// Renderers
test("KITCHEN_RENDERERS: 5 ids", () => { for (const id of ["recipe-scale","yield-ep","cooling-curve","plate-cost","pan-conversion"]) assert.equal(typeof KITCHEN_RENDERERS[id], "function", id); });

// ---- References the specs did not write (spec-v1637, spec-v1638) ----
// The worked-example fixture recomputes each spec's own example, so a spec and
// its tile that share an error agree with each other; these hold the tiles to
// NFPA 96's printed values and to the ASHRAE relations directly.

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

const GDCI = { inspection_interval_months: 3, months_since_inspection: 2, measured_thickness_um: 0, cleaning_trigger_um: 2000, inspection_point_trigger_um: 3175, is_designated_point: 0 };

test("grease duct: NFPA 96 Table 11.4 schedule gives 12, 4, 2 and 1 inspections a year", () => {
  // NFPA 96 (2021) Table 11.4: monthly (solid fuel), quarterly (high volume),
  // semiannually (moderate volume), annually (low volume).
  for (const [months, perYear] of [[1, 12], [3, 4], [6, 2], [12, 1]]) {
    within(computeGreaseDuctCleaningInterval({ ...GDCI, inspection_interval_months: months }).inspections_per_year, perYear, 1e-9, `${months} month interval`);
  }
});

test("grease duct: the NFPA 96 depth criteria hold at their printed inch values", () => {
  // NFPA 96 (2021) 12.6.1.1 prints each depth inch-first: 0.078 in (2000 um) in
  // the system, 0.125 in (3175 um) in a fan housing. 1 in = 25,400 um exactly
  // (the 1959 international inch), so a depth-comb reading of exactly 0.078 in
  // is 1,981.2 um and must trigger; 0.077 in (1,955.8 um) must not.
  const at = (inch, fan) => computeGreaseDuctCleaningInterval({ ...GDCI, measured_thickness_um: inch * 25400, is_designated_point: fan });
  assert.equal(at(0.078, 0).cleaning_triggered, true, "0.078 in in the duct");
  assert.equal(at(0.077, 0).cleaning_triggered, false, "0.077 in in the duct");
  assert.equal(at(0.125, 1).cleaning_triggered, true, "0.125 in in a fan housing");
  assert.equal(at(0.124, 1).cleaning_triggered, false, "0.124 in in a fan housing");
  assert.equal(at(0.1, 1).cleaning_triggered, false, "0.100 in is over the duct trigger but under the fan housing's");
  within(at(0.078, 0).measured_thickness_in, 0.078, 1e-9, "um back to in");
  within(computeGreaseDuctCleaningInterval(GDCI).trigger_thickness_in, 2000 / 25400, 1e-9, "2,000 um is 0.0787 in");
  within(3175 / 25400, 0.125, 1e-12, "3,175 um is exactly 1/8 in");
  assert.equal(computeGreaseDuctCleaningInterval(GDCI).clean_to_um, 50, "clean to 0.002 in (50 um)");
});

test("grease duct: the schedule and the measurement are separate tests", () => {
  // On schedule but over the trigger still means clean; overdue but clean is still overdue.
  const a = computeGreaseDuctCleaningInterval({ ...GDCI, months_since_inspection: 1, measured_thickness_um: 2500 });
  assert.equal(a.inspection_overdue, false); assert.equal(a.cleaning_triggered, true);
  const b = computeGreaseDuctCleaningInterval({ ...GDCI, months_since_inspection: 7, measured_thickness_um: 100 });
  assert.equal(b.inspection_overdue, true); assert.equal(b.cleaning_triggered, false);
  within(b.months_overdue, 4, 1e-9, "7 months against a quarterly interval");
  assert.equal(computeGreaseDuctCleaningInterval({ ...GDCI, months_since_inspection: 3 }).inspection_overdue, false, "due today is not overdue");
});

// walk-in-door-infiltration against ASHRAE Refrigeration Handbook (2018) ch. 24,
// eqs. (14)-(16): the Gosney-Olama full-open load
//   q = 0.221 A (hi - hr) rho_r (1 - rho_i/rho_r)^0.5 (g H)^0.5 Fm   [kW, SI]
//   Fm = [2 / (1 + (rho_r/rho_i)^(1/3))]^1.5
// and the average load qt = q Dt Df (1 - E), with the doorway open-time factor
// Dt = (P theta_p + 60 theta_o) / (3600 theta_d). Worked entirely in SI and
// converted at the end, so the tile's 60 min/h, cfm and Btu conversions are
// checked rather than repeated.
const KJKG_PER_BTULB = 2.326;       // IT Btu/lb to kJ/kg, exact by definition
const CFM_PER_M3S = 2118.880;       // 35.31467 ft3/m3 x 60 s/min
const LBFT3_PER_KGM3 = 0.06242796;  // 1 kg/m3 in lb/ft3
const BTUH_PER_KW = 3412.142;

function gosneyOlama({ width_m, height_m, ti_c, tr_c, dh_kjkg }) {
  const P = 101325, Rd = 287.055;                  // dry-air density, ideal gas
  const rho_i = P / (Rd * (ti_c + 273.15)), rho_r = P / (Rd * (tr_c + 273.15));
  const Fm = (2 / (1 + (rho_r / rho_i) ** (1 / 3))) ** 1.5;
  const A = width_m * height_m;
  const flow_m3s = 0.221 * A * Math.sqrt(1 - rho_i / rho_r) * Math.sqrt(9.80665 * height_m) * Fm;
  const q_kw = 0.221 * A * dh_kjkg * rho_r * Math.sqrt(1 - rho_i / rho_r) * Math.sqrt(9.80665 * height_m) * Fm;
  return { rho_r, flow_m3s, q_kw };
}

test("walk-in door: the tile reproduces ASHRAE's qt = q Dt Df (1 - E) on a Gosney-Olama doorway", () => {
  for (const c of [
    { wft: 4, hft: 7, ti: 30, tr: 2, dh: 40, P: 60, sec: 20, E: 0 },
    { wft: 3, hft: 7, ti: 25, tr: -20, dh: 55, P: 30, sec: 15, E: 0.85 },
    { wft: 5, hft: 8, ti: 35, tr: 3, dh: 62, P: 12, sec: 45, E: 0.95 },
  ]) {
    const g = gosneyOlama({ width_m: c.wft * 0.3048, height_m: c.hft * 0.3048, ti_c: c.ti, tr_c: c.tr, dh_kjkg: c.dh });
    const Dt = (c.P * c.sec + 60 * 0) / (3600 * 1); // one-hour period, no stand-open time
    const Df = 1;                                   // established flow; the tile takes Df inside the entered cfm
    const want_btuh = g.q_kw * Dt * Df * (1 - c.E) * BTUH_PER_KW;
    const r = computeWalkInDoorInfiltration({
      door_width_ft: c.wft, door_height_ft: c.hft, full_open_cfm: g.flow_m3s * CFM_PER_M3S,
      openings_per_hour: c.P, seconds_open_each: c.sec, protection_factor: 1 - c.E,
      enthalpy_difference_btu_lb: c.dh / KJKG_PER_BTULB, moisture_difference_lb_lb: 0,
      air_density_lb_ft3: g.rho_r * LBFT3_PER_KGM3,
    });
    within(r.door_open_factor, Dt, 1e-9, "Dt");
    within(r.total_load_btuh, want_btuh, 0.05, `qt, ${JSON.stringify(c)}`);
  }
});

test("walk-in door: the latent split matches ASHRAE's moist-air enthalpy equation", () => {
  // ASHRAE Fundamentals (2021) ch. 1 eq. (32): h = 0.240 t + W (1061 + 0.444 t),
  // Btu/lb dry air, t in F. The 1061 is the vapour enthalpy at 0 F, so for two
  // real states the tile's latent (dW x 1061) leaves exactly
  // 0.240 dt + 0.444 (Wi ti - Wr tr) per lb as the sensible remainder.
  const ti = 90, Wi = 0.0142, tr = 35, Wr = 0.0040;
  const h = (t, W) => 0.240 * t + W * (1061 + 0.444 * t);
  const r = computeWalkInDoorInfiltration({
    door_width_ft: 4, door_height_ft: 7, full_open_cfm: 2100, openings_per_hour: 60, seconds_open_each: 20,
    protection_factor: 1, enthalpy_difference_btu_lb: h(ti, Wi) - h(tr, Wr), moisture_difference_lb_lb: Wi - Wr, air_density_lb_ft3: 0.0790,
  });
  const m = r.mass_flow_lb_hr;
  within(m, 700 * 60 * 0.0790, 1e-9, "mass flow");
  within(r.sensible_load_btuh, m * (0.240 * (ti - tr) + 0.444 * (Wi * ti - Wr * tr)), 1e-9, "sensible remainder");
  within(r.frost_lb_day, m * (Wi - Wr) * 24, 1e-9, "water deposited a day");
});

test("walk-in door: ASHRAE's protective-device effectiveness enters as (1 - E), linearly", () => {
  // Strip curtains E = 0.95 new and 0.80-0.85 in service (ASHRAE Refrigeration ch. 24):
  // the tile's protection factor is 1 - E and the load scales with it exactly.
  const base = { door_width_ft: 4, door_height_ft: 7, full_open_cfm: 2100, openings_per_hour: 60, seconds_open_each: 20, enthalpy_difference_btu_lb: 24.5, moisture_difference_lb_lb: 0.0092 };
  const open = computeWalkInDoorInfiltration({ ...base, protection_factor: 1 }).total_load_btuh;
  for (const E of [0.95, 0.85, 0.8]) {
    const r = computeWalkInDoorInfiltration({ ...base, protection_factor: 1 - E });
    within(r.total_load_btuh, open * (1 - E), 1e-9, `E = ${E}`);
    within(r.unprotected_load_btuh, open, 1e-9, "unprotected baseline");
  }
  // Dt is linear in both openings and seconds, and a door open the whole hour is Dt = 1.
  within(computeWalkInDoorInfiltration({ ...base, protection_factor: 1, openings_per_hour: 120, seconds_open_each: 30 }).door_open_factor, 1, 1e-9, "open the whole hour");
});
