// v8 Phase E.3 / E.4 / E.5 - utilities 255, 256, 257.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDuctLeakage, ductLeakageExample, SMACNA_LEAKAGE_CLASSES, HVAC_RENDERERS,
} from "../../calc-hvac.js";
import {
  computeResidentialFraming, residentialFramingExample, CONSTRUCTION_RENDERERS,
} from "../../calc-construction.js";
import {
  computeCoagulantDose, coagulantDoseExample, COAGULANT_PRODUCTS, WATER_RENDERERS,
} from "../../calc-water.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- 255 Duct leakage ---

test("255 example yields finite outputs", () => {
  const r = computeDuctLeakage(ductLeakageExample.inputs);
  assert.ok(r.leakage_cfm >= 0);
  assert.ok(r.leakage_pct >= 0);
  assert.ok(r.effective_class > 0);
  assert.ok(typeof r.pass === "boolean");
});

test("255 leak scales with sqrt(P) (orifice-flow regression)", () => {
  // Same physical leak: 60 CFM lost at 1 in WC vs. 60 / sqrt(2) at 2 in WC normalize to same.
  const a = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 6 });
  const b = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1200 - 60 * Math.sqrt(2), duct_surface_ft2: 600, test_pressure_inwc: 2.0, design_class: 6 });
  assert.ok(close(a.leak_at_1inwc, b.leak_at_1inwc, 0.5));
});

test("255 PASS when leak per 100 ft2 <= class limit", () => {
  // 60 CFM / 600 ft^2 × 100 = 10 CFM/100ft^2 at 1 in WC. Class 12 = 12 limit ⇒ PASS.
  const r = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 12 });
  assert.equal(r.pass, true);
});

test("255 FAIL when leak exceeds the design class", () => {
  // 60 CFM / 600 ft^2 × 100 = 10 ⇒ exceeds Class 6 (6 limit) ⇒ FAIL.
  const r = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 6 });
  assert.equal(r.pass, false);
});

test("255 zero leak case yields effective class 3 (tightest)", () => {
  const r = computeDuctLeakage({ design_cfm: 1000, measured_cfm: 1000, duct_surface_ft2: 500, test_pressure_inwc: 1.0, design_class: 6 });
  assert.equal(r.effective_class, 3);
  assert.equal(r.pass, true);
});

test("255 SMACNA_LEAKAGE_CLASSES has 5 expected classes", () => {
  for (const k of [3, 6, 12, 24, 48]) assert.ok(SMACNA_LEAKAGE_CLASSES[k]);
});

test("255 errors on zero design CFM / negative measured / unknown class", () => {
  assert.ok(computeDuctLeakage({ design_cfm: 0, measured_cfm: 1000, duct_surface_ft2: 500, test_pressure_inwc: 1, design_class: 6 }).error);
  assert.ok(computeDuctLeakage({ design_cfm: 1000, measured_cfm: -1, duct_surface_ft2: 500, test_pressure_inwc: 1, design_class: 6 }).error);
  assert.ok(computeDuctLeakage({ design_cfm: 1000, measured_cfm: 1000, duct_surface_ft2: 500, test_pressure_inwc: 1, design_class: 99 }).error);
});

test("255 HVAC_RENDERERS exposes duct-leakage", () => {
  assert.equal(typeof HVAC_RENDERERS["duct-leakage"], "function");
});

// --- 256 Residential framing ---

test("256 example yields finite outputs", () => {
  const r = computeResidentialFraming(residentialFramingExample.inputs);
  assert.ok(r.stud_count > 0);
  assert.ok(r.plate_lf > 0);
  assert.ok(r.joist_count > 0);
  assert.ok(r.rafter_count > 0);
  assert.ok(r.total_bf > 0);
});

test("256 stud_count = ceil(perimeter/stud_oc) + 8", () => {
  const r = computeResidentialFraming({ footprint_ft2: 1200, perimeter_ft: 144, wall_height_ft: 8, stud_oc_in: 16, joist_span_ft: 14, joist_oc_in: 16, rafter_span_ft: 14, rafter_oc_in: 24, building_run_ft: 14, pitch: 6 });
  // 144 / (16/12) = 108; + 8 corner allowance = 116
  assert.equal(r.stud_count, 116);
});

test("256 plate_lf = ceil(perimeter × 3 × 1.10)", () => {
  const r = computeResidentialFraming({ footprint_ft2: 1200, perimeter_ft: 144, wall_height_ft: 8, stud_oc_in: 16, joist_span_ft: 14, joist_oc_in: 16, rafter_span_ft: 14, rafter_oc_in: 24, building_run_ft: 14, pitch: 6 });
  assert.equal(r.plate_lf, Math.ceil(144 * 3 * 1.10)); // 476
});

test("256 rafter length uses sqrt(P²+144)/12 × run", () => {
  const r = computeResidentialFraming({ ...residentialFramingExample.inputs, building_run_ft: 14, pitch: 6 });
  const expected = 14 * Math.sqrt(36 + 144) / 12;
  assert.ok(close(r.rafter_length_ft, expected, 0.01));
});

test("256 24 in OC stud spacing reduces stud count", () => {
  const a = computeResidentialFraming({ ...residentialFramingExample.inputs, stud_oc_in: 16 });
  const b = computeResidentialFraming({ ...residentialFramingExample.inputs, stud_oc_in: 24 });
  assert.ok(b.stud_count < a.stud_count);
});

test("256 unknown size errors", () => {
  assert.ok(computeResidentialFraming({ ...residentialFramingExample.inputs, stud_size: "2x99" }).error);
});

test("256 zero footprint / perimeter / wall_height errors", () => {
  assert.ok(computeResidentialFraming({ ...residentialFramingExample.inputs, footprint_ft2: 0 }).error);
  assert.ok(computeResidentialFraming({ ...residentialFramingExample.inputs, perimeter_ft: 0 }).error);
  assert.ok(computeResidentialFraming({ ...residentialFramingExample.inputs, wall_height_ft: 0 }).error);
});

test("256 summary text contains all four component counts", () => {
  const r = computeResidentialFraming(residentialFramingExample.inputs);
  assert.match(r.summary, /studs/);
  assert.match(r.summary, /plate/);
  assert.match(r.summary, /joists/);
  assert.match(r.summary, /rafters/);
});

test("256 CONSTRUCTION_RENDERERS exposes residential-framing", () => {
  assert.equal(typeof CONSTRUCTION_RENDERERS["residential-framing"], "function");
});

// --- 257 Coagulant dose ---

test("257 example yields finite outputs", () => {
  const r = computeCoagulantDose(coagulantDoseExample.inputs);
  assert.ok(r.pure_lb_day > 0);
  assert.ok(r.product_lb_day >= r.pure_lb_day);
  assert.ok(r.product_gal_day > 0);
});

test("257 pure_lb_day = MGD × mg/L × 8.34", () => {
  const r = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_liquid" });
  assert.ok(close(r.pure_lb_day, 5 * 20 * 8.34, 0.01));
});

test("257 alum dry product feed equals pure (100% strength)", () => {
  const r = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_dry" });
  assert.equal(r.product_lb_day, r.pure_lb_day);
});

test("257 alum liquid 48.5% needs ~ 2.06× more product than dry", () => {
  const dry = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_dry" });
  const liq = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_liquid" });
  assert.ok(close(liq.product_lb_day / dry.product_lb_day, 100 / 48.5, 0.001));
});

test("257 product gal_day = product_lb_day / (sg × 8.34)", () => {
  const r = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_liquid" });
  // sg = 1.33 → density 1.33 × 8.34 = 11.09 lb/gal
  assert.ok(close(r.product_gal_day, r.product_lb_day / (1.33 * 8.34), 0.05));
});

test("257 zero flow / dose errors", () => {
  assert.ok(computeCoagulantDose({ flow_mgd: 0, jar_test_dose_mg_l: 20, product: "alum_liquid" }).error);
  assert.ok(computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 0, product: "alum_liquid" }).error);
});

test("257 unknown product errors", () => {
  assert.ok(computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "lime" }).error);
});

test("257 COAGULANT_PRODUCTS includes alum dry/liquid, ferric, PAC", () => {
  for (const k of ["alum_dry", "alum_liquid", "ferric_chloride", "pac_liquid"]) {
    assert.ok(COAGULANT_PRODUCTS[k]);
    assert.ok(COAGULANT_PRODUCTS[k].strength_pct > 0);
    assert.ok(COAGULANT_PRODUCTS[k].sg > 0);
  }
});

test("257 WATER_RENDERERS exposes coagulant-dose", () => {
  assert.equal(typeof WATER_RENDERERS["coagulant-dose"], "function");
});
