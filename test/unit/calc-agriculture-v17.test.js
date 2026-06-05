// spec-v17 Phase L (Agriculture) unit tests for the first-principles tiles:
// L.1 irrigation-requirement, L.3 cattle-stocking-rate, L.4 grain-bin-capacity,
// L.2 npk-blend, and L.5 tank-mix. Worked examples cross-check against the
// published references named in each citation (FAO 56, USDA NRCS, USDA FGIS,
// EPA pesticide label / FIFRA).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeIrrigationRequirement, irrigationRequirementExample, FAO56_CROP_KC, IRRIGATION_EFFICIENCY_PCT,
  computeStockingRate, stockingRateExample, ANIMAL_UNIT_EQUIV,
  computeGrainBin, grainBinExample, GRAIN_TEST_WEIGHT_LB_BU,
  computeNpkBlend, npkBlendExample, CROP_NUTRIENT_DEMAND,
  computeTankMix, tankMixExample,
  AGRICULTURE_RENDERERS,
} from "../../calc-agriculture.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

// --- L.1 Irrigation requirement (8 tests) ----------------------------

test("irrigation-requirement: corn at 0.25 in/day over 30 days, 90% drip, 1 in rain -> 9 in ET, 8.889 in gross", () => {
  const r = computeIrrigationRequirement(irrigationRequirementExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.et_crop_in, 9, 1e-9));
  assert.ok(close(r.net_in, 8, 1e-9));
  assert.ok(closePct(r.gross_in, 8.889, 0.1));
});

test("irrigation-requirement: ET_crop = Kc x ET0 x days", () => {
  const r = computeIrrigationRequirement({ crop: "alfalfa", et_ref_in_per_day: 0.3, period_days: 10, area_acres: 40, efficiency_pct: 75, rainfall_in: 0 });
  assert.ok(close(r.kc, FAO56_CROP_KC.alfalfa, 1e-12));
  assert.ok(close(r.et_crop_in, FAO56_CROP_KC.alfalfa * 0.3 * 10, 1e-9));
});

test("irrigation-requirement: gross depth divides net by efficiency", () => {
  const r = computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0.25, period_days: 30, area_acres: 80, efficiency_pct: 75, rainfall_in: 1 });
  assert.ok(close(r.gross_in, r.net_in / 0.75, 1e-9));
  assert.strictEqual(IRRIGATION_EFFICIENCY_PCT.sprinkler, 75);
});

test("irrigation-requirement: acre-feet = gross_in x acres / 12 and gallons = acre-ft x 325851", () => {
  const r = computeIrrigationRequirement(irrigationRequirementExample.inputs);
  assert.ok(close(r.acre_ft, (r.gross_in * r.area_acres) / 12, 1e-9));
  assert.ok(close(r.gallons, r.acre_ft * 325851, 1e-3));
  assert.ok(closePct(r.acre_ft, 59.26, 0.1));
});

test("irrigation-requirement: rainfall exceeding ET zeroes the net requirement and warns", () => {
  const r = computeIrrigationRequirement({ crop: "pasture", et_ref_in_per_day: 0.1, period_days: 5, area_acres: 10, efficiency_pct: 75, rainfall_in: 5 });
  assert.strictEqual(r.net_in, 0);
  assert.strictEqual(r.acre_ft, 0);
  assert.ok(r.warnings.some((w) => /no irrigation/i.test(w)));
});

test("irrigation-requirement: higher efficiency lowers the gross depth", () => {
  const drip = computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0.25, period_days: 30, area_acres: 80, efficiency_pct: 90, rainfall_in: 0 });
  const flood = computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0.25, period_days: 30, area_acres: 80, efficiency_pct: 50, rainfall_in: 0 });
  assert.ok(flood.gross_in > drip.gross_in);
});

test("irrigation-requirement: every bundled crop carries a Kc in the 0.2-1.4 range", () => {
  for (const [crop, kc] of Object.entries(FAO56_CROP_KC)) {
    assert.ok(kc >= 0.2 && kc <= 1.4, crop + " Kc out of range");
  }
});

test("irrigation-requirement: unknown crop, non-positive ET0 / days / area, bad efficiency are rejected", () => {
  assert.ok("error" in computeIrrigationRequirement({ crop: "moon-cheese", et_ref_in_per_day: 0.2, period_days: 10, area_acres: 5 }));
  assert.ok("error" in computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0, period_days: 10, area_acres: 5 }));
  assert.ok("error" in computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0.2, period_days: 0, area_acres: 5 }));
  assert.ok("error" in computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0.2, period_days: 10, area_acres: 0 }));
  assert.ok("error" in computeIrrigationRequirement({ crop: "corn", et_ref_in_per_day: 0.2, period_days: 10, area_acres: 5, efficiency_pct: 0 }));
});

// --- L.3 Cattle stocking rate (6 tests) ------------------------------

test("cattle-stocking-rate: 160 ac, 1500 lb/ac, 40% util, cow-calf, 30 head -> 96,000 lb, 123.08 AUMs, 123 days", () => {
  const r = computeStockingRate(stockingRateExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.available_forage_lb, 96000, 1e-6));
  assert.ok(closePct(r.aums_available, 123.08, 0.1));
  assert.ok(closePct(r.grazing_days, 123.08, 0.1));
});

test("cattle-stocking-rate: available forage = production x area x utilization", () => {
  const r = computeStockingRate({ area_acres: 100, forage_lb_per_acre: 2000, utilization_pct: 50, animal_class: "cow_calf", herd_size: 0 });
  assert.ok(close(r.available_forage_lb, 2000 * 100 * 0.5, 1e-6));
  assert.ok(close(r.aums_available, (2000 * 100 * 0.5) / 780, 1e-9));
});

test("cattle-stocking-rate: AU equivalents scale the head supported", () => {
  const cow = computeStockingRate({ area_acres: 100, forage_lb_per_acre: 1000, utilization_pct: 50, animal_class: "cow_calf" });
  const sheep = computeStockingRate({ area_acres: 100, forage_lb_per_acre: 1000, utilization_pct: 50, animal_class: "sheep" });
  // Same forage carries 5x as many 0.2-AU sheep as 1.0-AU cow-calf pairs.
  assert.ok(closePct(sheep.head_one_month, cow.head_one_month / ANIMAL_UNIT_EQUIV.sheep, 0.1));
});

test("cattle-stocking-rate: grazing days scale inversely with herd size", () => {
  const small = computeStockingRate({ area_acres: 160, forage_lb_per_acre: 1500, utilization_pct: 40, animal_class: "cow_calf", herd_size: 15 });
  const big = computeStockingRate({ area_acres: 160, forage_lb_per_acre: 1500, utilization_pct: 40, animal_class: "cow_calf", herd_size: 30 });
  assert.ok(closePct(small.grazing_days, big.grazing_days * 2, 0.1));
});

test("cattle-stocking-rate: utilization above 60% warns of overgrazing", () => {
  const r = computeStockingRate({ area_acres: 100, forage_lb_per_acre: 1000, utilization_pct: 70, animal_class: "cow_calf" });
  assert.ok(r.warnings.some((w) => /overgraz/i.test(w)));
});

test("cattle-stocking-rate: unknown class and out-of-range inputs are rejected", () => {
  assert.ok("error" in computeStockingRate({ area_acres: 100, forage_lb_per_acre: 1000, utilization_pct: 40, animal_class: "dragon" }));
  assert.ok("error" in computeStockingRate({ area_acres: 0, forage_lb_per_acre: 1000, utilization_pct: 40, animal_class: "cow_calf" }));
  assert.ok("error" in computeStockingRate({ area_acres: 100, forage_lb_per_acre: 1000, utilization_pct: 0, animal_class: "cow_calf" }));
});

// --- L.4 Grain bin capacity (6 tests) --------------------------------

test("grain-bin-capacity: 30 ft x 20 ft eave + 8 ft cone, corn -> 14,137 + 1,885 ft^3, ~12,875 bu", () => {
  const r = computeGrainBin(grainBinExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.cylinder_ft3, 14137.2, 0.05));
  assert.ok(closePct(r.cone_ft3, 1884.96, 0.05));
  assert.ok(closePct(r.total_bushels, 12875, 0.1));
});

test("grain-bin-capacity: cylinder volume = pi (d/2)^2 x eave height", () => {
  const r = computeGrainBin({ diameter_ft: 24, eave_height_ft: 16, peak_height_ft: 0, grain: "wheat" });
  assert.ok(close(r.cylinder_ft3, Math.PI * 144 * 16, 1e-6));
  assert.ok(close(r.cone_ft3, 0, 1e-12));
});

test("grain-bin-capacity: bushels = ft^3 x 0.8036 and weight = bushels x test weight", () => {
  const r = computeGrainBin(grainBinExample.inputs);
  assert.ok(close(r.total_bushels, r.total_ft3 * 0.8036, 1e-6));
  assert.ok(close(r.weight_lb, r.total_bushels * GRAIN_TEST_WEIGHT_LB_BU.corn, 1e-6));
});

test("grain-bin-capacity: the packing factor scales total capacity", () => {
  const free = computeGrainBin({ diameter_ft: 30, eave_height_ft: 20, peak_height_ft: 8, grain: "corn", packing_factor: 1.0 });
  const packed = computeGrainBin({ diameter_ft: 30, eave_height_ft: 20, peak_height_ft: 8, grain: "corn", packing_factor: 1.05 });
  assert.ok(closePct(packed.total_bushels, free.total_bushels * 1.05, 0.01));
});

test("grain-bin-capacity: grain choice changes the weight via test weight", () => {
  const corn = computeGrainBin({ diameter_ft: 30, eave_height_ft: 20, peak_height_ft: 0, grain: "corn" });
  const oats = computeGrainBin({ diameter_ft: 30, eave_height_ft: 20, peak_height_ft: 0, grain: "oats" });
  assert.ok(close(corn.total_bushels, oats.total_bushels, 1e-6)); // same volume
  assert.ok(corn.weight_lb > oats.weight_lb); // 56 vs 32 lb/bu
});

test("grain-bin-capacity: unknown grain and non-positive geometry are rejected", () => {
  assert.ok("error" in computeGrainBin({ diameter_ft: 30, eave_height_ft: 20, grain: "quinoa" }));
  assert.ok("error" in computeGrainBin({ diameter_ft: 0, eave_height_ft: 20, grain: "corn" }));
  assert.ok("error" in computeGrainBin({ diameter_ft: 30, eave_height_ft: 0, grain: "corn" }));
});

// --- L.2 NPK blend from soil test ------------------------------------

test("npk-blend: corn, soil credit 20/10/15, 80 acres -> rec 130/50/25, urea 240/DAP 109/potash 42 lb/acre", () => {
  const r = computeNpkBlend(npkBlendExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.rec_n_lb_per_acre, 130, 1e-9));
  assert.ok(close(r.rec_p_lb_per_acre, 50, 1e-9));
  assert.ok(close(r.rec_k_lb_per_acre, 25, 1e-9));
  assert.ok(closePct(r.urea_lb_per_acre, 240.08, 0.1));
  assert.ok(closePct(r.dap_lb_per_acre, 108.70, 0.1));
  assert.ok(closePct(r.mop_lb_per_acre, 41.67, 0.1));
});

test("npk-blend: recommendation = max(0, crop demand - soil-test credit)", () => {
  const r = computeNpkBlend({ crop: "corn", soil_n_lb_per_acre: 50, soil_p_lb_per_acre: 0, soil_k_lb_per_acre: 0, area_acres: 1 });
  assert.ok(close(r.rec_n_lb_per_acre, CROP_NUTRIENT_DEMAND.corn.n - 50, 1e-9));
  assert.ok(close(r.rec_p_lb_per_acre, CROP_NUTRIENT_DEMAND.corn.p, 1e-9));
});

test("npk-blend: the three-straight blend delivers exactly the recommendation for each nutrient", () => {
  const r = computeNpkBlend(npkBlendExample.inputs);
  assert.ok(close(r.n_delivered_lb_per_acre, r.rec_n_lb_per_acre, 1e-6));
  assert.ok(close(r.p_delivered_lb_per_acre, r.rec_p_lb_per_acre, 1e-6));
  assert.ok(close(r.k_delivered_lb_per_acre, r.rec_k_lb_per_acre, 1e-6));
});

test("npk-blend: DAP's nitrogen is credited against the urea requirement", () => {
  const r = computeNpkBlend(npkBlendExample.inputs);
  const nFromDap = r.dap_lb_per_acre * 0.18;
  assert.ok(close(r.urea_lb_per_acre, (r.rec_n_lb_per_acre - nFromDap) / 0.46, 1e-6));
});

test("npk-blend: totals scale by field area", () => {
  const r = computeNpkBlend(npkBlendExample.inputs);
  assert.ok(close(r.urea_total_lb, r.urea_lb_per_acre * 80, 1e-6));
  assert.ok(close(r.mop_total_lb, r.mop_lb_per_acre * 80, 1e-6));
});

test("npk-blend: legumes (soybeans, alfalfa) carry zero fertilizer-N demand and warn", () => {
  const r = computeNpkBlend({ crop: "soybeans", area_acres: 10 });
  assert.equal(CROP_NUTRIENT_DEMAND.soybeans.n, 0);
  assert.equal(r.rec_n_lb_per_acre, 0);
  assert.equal(r.urea_lb_per_acre, 0);
  assert.ok(r.warnings.some((w) => /legume/i.test(w)));
});

test("npk-blend: a soil test at or above demand recommends no fertilizer", () => {
  const r = computeNpkBlend({ crop: "corn", soil_n_lb_per_acre: 300, soil_p_lb_per_acre: 300, soil_k_lb_per_acre: 300, area_acres: 5 });
  assert.equal(r.rec_n_lb_per_acre, 0);
  assert.equal(r.rec_p_lb_per_acre, 0);
  assert.equal(r.rec_k_lb_per_acre, 0);
  assert.ok(r.warnings.some((w) => /no fertilizer/i.test(w)));
});

test("npk-blend: unknown crop and non-positive area are rejected", () => {
  assert.ok("error" in computeNpkBlend({ crop: "kelp", area_acres: 10 }));
  assert.ok("error" in computeNpkBlend({ crop: "corn", area_acres: 0 }));
});

// --- L.5 Pesticide tank-mix and acres-per-tank -----------------------

test("tank-mix: 300 gal / 15 GPA, 1.5 pt/acre, 80 acres -> 20 acres/tank, 30 pt/tank, 4 tanks, 1,200 gal water", () => {
  const r = computeTankMix(tankMixExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.acres_per_tank, 20, 1e-9));
  assert.ok(close(r.product_per_tank_unit, 30, 1e-9));
  assert.equal(r.tanks_needed, 4);
  assert.ok(close(r.total_carrier_water_gal, 1200, 1e-9));
});

test("tank-mix: acres per tank = tank capacity / GPA", () => {
  const r = computeTankMix({ tank_gal: 500, spray_volume_gpa: 20, product_rate_per_acre: 2, product_unit: "fl_oz" });
  assert.ok(close(r.acres_per_tank, 25, 1e-9));
  assert.ok(close(r.product_per_tank_unit, 50, 1e-9));
});

test("tank-mix: liquid product converts to gallons and millilitres", () => {
  const r = computeTankMix(tankMixExample.inputs); // 30 pt
  assert.ok(close(r.liquid.gal, 30 / 8, 1e-9)); // 3.75 gal
  assert.ok(close(r.liquid.fl_oz, 30 * 16, 1e-9));
  assert.ok(close(r.liquid.ml, 30 * 16 * 29.5735, 1e-6));
  assert.equal(r.dry, null);
});

test("tank-mix: dry product converts to pounds and grams", () => {
  const r = computeTankMix({ tank_gal: 200, spray_volume_gpa: 20, product_rate_per_acre: 8, product_unit: "oz", field_area_acres: 40 });
  assert.ok(close(r.dry.lb, r.product_per_tank_unit / 16, 1e-9));
  assert.ok(close(r.dry.g, r.product_per_tank_unit * 28.3495, 1e-6));
  assert.equal(r.liquid, null);
});

test("tank-mix: a partial last tank rounds the tank count up", () => {
  const r = computeTankMix({ tank_gal: 300, spray_volume_gpa: 15, product_rate_per_acre: 1.5, product_unit: "pt", field_area_acres: 85 });
  assert.equal(r.tanks_needed, 5); // ceil(85/20)
});

test("tank-mix: field totals scale by area (product and carrier water)", () => {
  const r = computeTankMix(tankMixExample.inputs);
  assert.ok(close(r.total_product_unit, 80 * 1.5, 1e-9));
  assert.ok(close(r.total_carrier_water_gal, 80 * 15, 1e-9));
  assert.ok(close(r.total_liquid.gal, 120 / 8, 1e-9));
});

test("tank-mix: omitting field area yields per-tank figures without tank count", () => {
  const r = computeTankMix({ tank_gal: 300, spray_volume_gpa: 15, product_rate_per_acre: 1.5, product_unit: "pt" });
  assert.ok(close(r.acres_per_tank, 20, 1e-9));
  assert.equal(r.tanks_needed, undefined);
});

test("tank-mix: a GPA outside 5-30 warns; unknown unit and non-positive inputs are rejected", () => {
  assert.ok(computeTankMix({ tank_gal: 100, spray_volume_gpa: 3, product_rate_per_acre: 1, product_unit: "pt" }).warnings.some((w) => /GPA/.test(w)));
  assert.ok("error" in computeTankMix({ tank_gal: 100, spray_volume_gpa: 15, product_rate_per_acre: 1, product_unit: "furlong" }));
  assert.ok("error" in computeTankMix({ tank_gal: 0, spray_volume_gpa: 15, product_rate_per_acre: 1, product_unit: "pt" }));
  assert.ok("error" in computeTankMix({ tank_gal: 100, spray_volume_gpa: 15, product_rate_per_acre: 0, product_unit: "pt" }));
});

// --- Wiring sentinel -------------------------------------------------

test("v17 agriculture renderers are registered in AGRICULTURE_RENDERERS", () => {
  for (const id of ["irrigation-requirement", "cattle-stocking-rate", "grain-bin-capacity", "npk-blend", "tank-mix"]) {
    assert.strictEqual(typeof AGRICULTURE_RENDERERS[id], "function", id + " renderer missing");
  }
});
