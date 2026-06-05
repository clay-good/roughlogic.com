// spec-v17 Phase L (Agriculture) unit tests for the three first-principles
// tiles that open v17: L.1 irrigation-requirement, L.3 cattle-stocking-rate,
// and L.4 grain-bin-capacity. Worked examples cross-check against the
// published references named in each citation (FAO 56, USDA NRCS, USDA FGIS).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeIrrigationRequirement, irrigationRequirementExample, FAO56_CROP_KC, IRRIGATION_EFFICIENCY_PCT,
  computeStockingRate, stockingRateExample, ANIMAL_UNIT_EQUIV,
  computeGrainBin, grainBinExample, GRAIN_TEST_WEIGHT_LB_BU,
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

// --- Wiring sentinel -------------------------------------------------

test("v17 agriculture renderers are registered in AGRICULTURE_RENDERERS", () => {
  for (const id of ["irrigation-requirement", "cattle-stocking-rate", "grain-bin-capacity"]) {
    assert.strictEqual(typeof AGRICULTURE_RENDERERS[id], "function", id + " renderer missing");
  }
});
