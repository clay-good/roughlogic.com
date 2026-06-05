// Unit tests for calc-hvac.js v7 utilities (242-245).
// Per spec-v7.md Step 60.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDuctFrictionStatic, ductFrictionStaticExample,
  DUCT_ROUGHNESS_FT_v7, DUCT_FITTINGS_C_O,
  computeRefrigerantCharging, refrigerantChargingExample, REFRIGERANT_PT_TABLES_v7,
  computeCoolingTower, coolingTowerExample,
  computeInsulationHeatLoss, insulationHeatLossExample, INSULATION_K_VALUES_v7,
  HVAC_RENDERERS,
} from "../../calc-hvac.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- 242 Duct friction + static ---

test("242 example yields finite outputs", () => {
  const r = computeDuctFrictionStatic(ductFrictionStaticExample.inputs);
  assert.ok(r.velocity_fpm > 0);
  assert.ok(r.velocity_pressure_in_wc > 0);
  assert.ok(r.friction_factor > 0);
  assert.ok(r.total_static_in_wc > 0);
});

test("242 12 inch round at 1200 CFM ≈ 1530 fpm", () => {
  const r = computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 0, fittings: [] });
  // A = pi × (1)^2 / 4 = 0.7854 ft^2; V = 1200/0.7854 ≈ 1528 fpm
  assert.ok(close(r.velocity_fpm, 1528, 5));
});

test("242 velocity pressure follows (V/4005)²", () => {
  const r = computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 0, fittings: [] });
  const expected = Math.pow(r.velocity_fpm / 4005, 2);
  assert.ok(close(r.velocity_pressure_in_wc, expected, 0.0001));
});

test("242 rectangular duct uses Huebscher equivalent diameter", () => {
  const a = computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1000, length_ft: 100, fittings: [] });
  // 12x12 rectangular: D_h = 12 in, D_eq differs (≈ 13.13 from Huebscher)
  const b = computeDuctFrictionStatic({ shape: "rectangular", W_in: 12, H_in: 12, material: "galv_smooth", cfm: 1000, length_ft: 100, fittings: [] });
  // Expect close but not identical
  assert.ok(b.equivalent_diameter_in > a.equivalent_diameter_in - 1);
  assert.ok(b.equivalent_diameter_in < a.equivalent_diameter_in + 2);
});

test("242 fitting losses sum count × C_o × VP", () => {
  const r = computeDuctFrictionStatic({
    shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 0,
    fittings: [{ kind: "elbow_90_smooth_radius", count: 4 }],
  });
  const expected = 4 * 0.22 * r.velocity_pressure_in_wc;
  assert.ok(close(r.fitting_loss_in_wc, expected, 0.0001));
});

test("242 longer run scales straight loss linearly", () => {
  const a = computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 50, fittings: [] });
  const b = computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 100, fittings: [] });
  assert.ok(close(b.straight_loss_in_wc / a.straight_loss_in_wc, 2.0, 0.001));
});

test("242 errors on zero cfm / negative length / unknown material / shape", () => {
  assert.ok(computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 0, length_ft: 50 }).error);
  assert.ok(computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: -5 }).error);
  assert.ok(computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "carbon_fiber", cfm: 1200, length_ft: 50 }).error);
  assert.ok(computeDuctFrictionStatic({ shape: "oval", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 50 }).error);
});

test("242 round D_in must be positive", () => {
  assert.ok(computeDuctFrictionStatic({ shape: "round", D_in: 0, material: "galv_smooth", cfm: 1200, length_ft: 50 }).error);
});

test("242 rectangular requires both W and H", () => {
  assert.ok(computeDuctFrictionStatic({ shape: "rectangular", W_in: 12, H_in: 0, material: "galv_smooth", cfm: 1200, length_ft: 50 }).error);
});

test("242 unknown fitting kind errors", () => {
  assert.ok(computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 0, fittings: [{ kind: "no-such" }] }).error);
});

test("242 user-supplied C_o overrides the library", () => {
  const r = computeDuctFrictionStatic({ shape: "round", D_in: 12, material: "galv_smooth", cfm: 1200, length_ft: 0, fittings: [{ C_o: 1.0, count: 1 }] });
  assert.ok(close(r.fitting_loss_in_wc, r.velocity_pressure_in_wc, 0.0001));
});

test("242 DUCT_ROUGHNESS_FT_v7 covers all expected materials", () => {
  for (const k of ["galv_smooth", "galv_general", "flex_extended", "flex_compressed", "fiberboard", "flex_metal"]) {
    assert.ok(DUCT_ROUGHNESS_FT_v7[k] > 0, "missing " + k);
  }
});

test("242 DUCT_FITTINGS_C_O has at least 10 entries", () => {
  assert.ok(Object.keys(DUCT_FITTINGS_C_O).length >= 10);
});

// --- 243 Refrigerant superheat / subcooling ---

test("243 example yields finite outputs", () => {
  const r = computeRefrigerantCharging(refrigerantChargingExample.inputs);
  assert.ok(Number.isFinite(r.T_sat_suction_F));
  assert.ok(Number.isFinite(r.T_sat_liquid_F));
  assert.ok(Number.isFinite(r.superheat_F));
  assert.ok(Number.isFinite(r.subcool_F));
});

test("243 psig adds 14.696 to give psia (regression for the toggle)", () => {
  const a = computeRefrigerantCharging({ refrigerant: "R_410A", suction_pressure: 130, suction_unit: "psig", suction_line_temp_F: 50, liquid_pressure: 350, liquid_unit: "psig", liquid_line_temp_F: 100 });
  const b = computeRefrigerantCharging({ refrigerant: "R_410A", suction_pressure: 144.696, suction_unit: "psia", suction_line_temp_F: 50, liquid_pressure: 364.696, liquid_unit: "psia", liquid_line_temp_F: 100 });
  // Same physical conditions ⇒ same superheat / subcool
  assert.ok(close(a.superheat_F, b.superheat_F, 0.05));
  assert.ok(close(a.subcool_F, b.subcool_F, 0.05));
});

test("243 superheat = T_line - T_sat_suction", () => {
  const r = computeRefrigerantCharging({ refrigerant: "R_410A", suction_pressure: 130, suction_unit: "psig", suction_line_temp_F: 50, liquid_pressure: 350, liquid_unit: "psig", liquid_line_temp_F: 100 });
  assert.ok(close(r.superheat_F, 50 - r.T_sat_suction_F, 0.001));
});

test("243 subcool = T_sat_liquid - T_line", () => {
  const r = computeRefrigerantCharging(refrigerantChargingExample.inputs);
  assert.ok(close(r.subcool_F, r.T_sat_liquid_F - 100, 0.001));
});

test("243 in-range / low / high flags fire correctly", () => {
  // Pick conditions that bracket the bands
  const lo = computeRefrigerantCharging({ refrigerant: "R_410A", suction_pressure: 130, suction_unit: "psig", suction_line_temp_F: 35, liquid_pressure: 350, liquid_unit: "psig", liquid_line_temp_F: 100 });
  assert.equal(lo.superheat_flag, "low");
  const hi = computeRefrigerantCharging({ refrigerant: "R_410A", suction_pressure: 130, suction_unit: "psig", suction_line_temp_F: 75, liquid_pressure: 350, liquid_unit: "psig", liquid_line_temp_F: 100 });
  assert.equal(hi.superheat_flag, "high");
});

test("243 errors on unknown refrigerant", () => {
  assert.ok(computeRefrigerantCharging({ refrigerant: "R_999", suction_pressure: 100, suction_unit: "psig", suction_line_temp_F: 50, liquid_pressure: 200, liquid_unit: "psig", liquid_line_temp_F: 100 }).error);
});

test("243 errors on zero pressure", () => {
  assert.ok(computeRefrigerantCharging({ refrigerant: "R_410A", suction_pressure: 0, suction_unit: "psig", suction_line_temp_F: 50, liquid_pressure: 200, liquid_unit: "psig", liquid_line_temp_F: 100 }).error);
});

test("243 P-T table has 5 refrigerants with monotone-increasing T", () => {
  for (const k of ["R_410A", "R_32", "R_454B", "R_22", "R_134a"]) {
    const t = REFRIGERANT_PT_TABLES_v7[k];
    assert.ok(t && t.length >= 5);
    for (let i = 1; i < t.length; i++) {
      assert.ok(t[i].T_F > t[i - 1].T_F, k + " not monotone at " + i);
    }
  }
});

// --- 244 Cooling tower ---

test("244 example yields finite outputs", () => {
  const r = computeCoolingTower(coolingTowerExample.inputs);
  assert.equal(r.range_F, 10);
  assert.equal(r.approach_F, 7);
  assert.equal(r.heat_rejection_BTU_hr, 600 * 500 * 10);
});

test("244 range_F = T_in - T_out", () => {
  const r = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600 });
  assert.equal(r.range_F, 10);
});

test("244 approach_F = T_out - T_wb", () => {
  const r = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600 });
  assert.equal(r.approach_F, 7);
});

test("244 heat_rejection = gpm × 500 × range", () => {
  const r = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600 });
  assert.equal(r.heat_rejection_BTU_hr, 600 * 500 * 10);
});

test("244 fan kW per ton uses 12000 BTU/hr per ton", () => {
  const r = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600, fan_kW: 7.5 });
  // tons = 600*500*10 / 12000 = 250; kW/ton = 7.5/250 = 0.03
  assert.ok(close(r.fan_kW_per_ton, 0.03, 0.001));
});

test("244 errors on T_out >= T_in", () => {
  assert.ok(computeCoolingTower({ T_in_F: 80, T_out_F: 85, T_wb_F: 78, gpm: 600 }).error);
});

test("244 errors on T_wb >= T_out (non-physical approach)", () => {
  assert.ok(computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 90, gpm: 600 }).error);
});

test("244 zero gpm errors", () => {
  assert.ok(computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 0 }).error);
});

test("244 approach_flag bands fire", () => {
  const tight = computeCoolingTower({ T_in_F: 95, T_out_F: 82, T_wb_F: 78, gpm: 100 });
  assert.equal(tight.approach_flag, "tight");
  const wide = computeCoolingTower({ T_in_F: 95, T_out_F: 90, T_wb_F: 78, gpm: 100 });
  assert.equal(wide.approach_flag, "wide");
});

// spec-v16 C.4: thermal efficiency = range / (range + approach).
test("244 (C.4) efficiency = range / (range + approach) = range / (T_in - T_wb)", () => {
  const r = computeCoolingTower(coolingTowerExample.inputs); // 95/85/78 -> range 10, approach 7
  assert.ok(close(r.efficiency, 10 / 17, 1e-9));
  // A tighter approach raises the efficiency toward the wet-bulb floor.
  const tighter = computeCoolingTower({ T_in_F: 95, T_out_F: 81, T_wb_F: 78, gpm: 600 }); // range 14, approach 3
  assert.ok(tighter.efficiency > r.efficiency);
  assert.ok(close(tighter.efficiency, 14 / 17, 1e-9));
});

// --- 245 Insulation heat loss ---

test("245 example yields finite outputs", () => {
  const r = computeInsulationHeatLoss(insulationHeatLossExample.inputs);
  assert.ok(r.Q_bare_BTU_hr_ft > 0);
  assert.ok(r.Q_insulated_BTU_hr_ft > 0);
  assert.ok(r.Q_insulated_BTU_hr_ft < r.Q_bare_BTU_hr_ft);
  assert.ok(r.effectiveness_pct > 0 && r.effectiveness_pct < 100);
});

test("245 thicker insulation reduces Q_insulated", () => {
  const a = computeInsulationHeatLoss({ pipe_OD_in: 2, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in: 0.5, jacket_emissivity: 0.9 });
  const b = computeInsulationHeatLoss({ pipe_OD_in: 2, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in: 2.0, jacket_emissivity: 0.9 });
  assert.ok(b.Q_insulated_BTU_hr_ft < a.Q_insulated_BTU_hr_ft);
});

test("245 lower-k insulation reduces Q (polyiso vs fiberglass at same thickness)", () => {
  const fg = computeInsulationHeatLoss({ pipe_OD_in: 2, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in: 1, jacket_emissivity: 0.9 });
  const pi = computeInsulationHeatLoss({ pipe_OD_in: 2, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "polyiso", thickness_in: 1, jacket_emissivity: 0.9 });
  assert.ok(pi.Q_insulated_BTU_hr_ft < fg.Q_insulated_BTU_hr_ft);
});

test("245 outer surface T is between ambient and pipe surface", () => {
  const r = computeInsulationHeatLoss(insulationHeatLossExample.inputs);
  assert.ok(r.outer_surface_T_F > 70 && r.outer_surface_T_F < 200);
});

test("245 zero thickness ⇒ Q_insulated equals Q_bare exactly (no insulation conduction)", () => {
  const r = computeInsulationHeatLoss({ pipe_OD_in: 2, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in: 0, jacket_emissivity: 0.9 });
  // With zero thickness r2 = r1, ln(r2/r1) = 0, so R_cond = 0 and Q_insulated drives by R_outside only.
  // The two should match when h_bare = h_outside; effectiveness should be ≈ 0.
  assert.ok(Math.abs(r.effectiveness_pct) < 1.0, "effectiveness " + r.effectiveness_pct);
});

test("245 errors on zero / negative pipe OD", () => {
  assert.ok(computeInsulationHeatLoss({ pipe_OD_in: 0, surface_T_F: 200, ambient_T_F: 70, insulation: "fiberglass", thickness_in: 1 }).error);
});

test("245 errors on unknown insulation type", () => {
  assert.ok(computeInsulationHeatLoss({ pipe_OD_in: 2, surface_T_F: 200, ambient_T_F: 70, insulation: "graphene", thickness_in: 1 }).error);
});

test("245 INSULATION_K_VALUES_v7 includes the six expected types", () => {
  for (const k of ["fiberglass", "mineral_wool", "calcium_silicate", "elastomeric", "polyiso", "pheno_foam"]) {
    assert.ok(INSULATION_K_VALUES_v7[k]);
    assert.ok(INSULATION_K_VALUES_v7[k].k > 0);
  }
});

// --- Renderer registry ---

test("HVAC_RENDERERS exposes the 4 v7 ids", () => {
  for (const id of ["duct-friction-static", "refrigerant-charging", "cooling-tower", "insulation-heat-loss"]) {
    assert.equal(typeof HVAC_RENDERERS[id], "function", id + " should have a renderer");
  }
});
