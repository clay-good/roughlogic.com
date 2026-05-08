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
