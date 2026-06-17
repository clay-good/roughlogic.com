// Unit tests for calc-hvac.js v2 utilities (79-85). 10+ cases per utility.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeApproachDeltaT,
  computeOutdoorAirMix,
  computeEquivalentLength,
  computeWetBulbPsychrometer,
  computeInsulationThickness,
  computeEvaporativeCooling,
  FITTING_EQUIVALENT_LENGTH_FT,
  HFG_WATER_BTU_PER_LB,
  approachDeltaTExample,
  outdoorAirMixExample,
  equivalentLengthExample,
  wetBulbPsychrometerExample,
  insulationThicknessExample,
  evaporativeCoolingExample,
} from "../../calc-hvac.js";
// spec-v89: refrigerant-circuit bench relocated to calc-refrigerant.js.
import {
  computeRefrigerantCharge,
  computeCompareRefrigerants,
  CHARGE_OZ_PER_FT,
  refrigerantChargeExample,
  compareRefrigerantsExample,
} from "../../calc-refrigerant.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 79: Refrigerant Charge ---

test("Refrigerant charge: example matches sum of (ft * oz_per_ft)", () => {
  const r = computeRefrigerantCharge(refrigerantChargeExample.inputs);
  assert.ok(close(r.total_oz, refrigerantChargeExample.expected.total_oz));
});

test("Refrigerant charge: lb = oz / 16", () => {
  const r = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "1/2", length_ft: 32 }] });
  assert.ok(close(r.total_lb, r.total_oz / 16));
});

test("Refrigerant charge: unknown refrigerant errors", () => {
  const r = computeRefrigerantCharge({ refrigerant: "R-9999", sections: [] });
  assert.ok(r.error);
});

test("Refrigerant charge: unknown diameter errors", () => {
  const r = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "7/8", length_ft: 10 }] });
  assert.ok(r.error);
});

test("Refrigerant charge: empty sections -> 0 oz", () => {
  const r = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [] });
  assert.equal(r.total_oz, 0);
});

test("Refrigerant charge: doubled length doubles charge", () => {
  const a = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "3/8", length_ft: 25 }] });
  const b = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "3/8", length_ft: 50 }] });
  assert.ok(close(b.total_oz, 2 * a.total_oz));
});

test("Refrigerant charge: larger diameter yields more oz", () => {
  const a = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "1/4", length_ft: 25 }] });
  const b = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "3/4", length_ft: 25 }] });
  assert.ok(b.total_oz > a.total_oz);
});

test("Refrigerant charge: detail per section returned", () => {
  const r = computeRefrigerantCharge({ refrigerant: "R-410A", sections: [{ diameter: "3/8", length_ft: 25 }, { diameter: "3/4", length_ft: 25 }] });
  assert.equal(r.sections.length, 2);
});

test("Refrigerant charge: R-134a oz_per_ft is lower than R-410A", () => {
  assert.ok(CHARGE_OZ_PER_FT["R-134a"]["3/8"] < CHARGE_OZ_PER_FT["R-410A"]["3/8"]);
});

test("Refrigerant charge: every refrigerant has 5 diameter rows", () => {
  for (const r of Object.values(CHARGE_OZ_PER_FT)) {
    assert.equal(Object.keys(r).length, 5);
  }
});

// --- Utility 80: Approach and Delta-T ---

test("Approach delta-T: example matches", () => {
  const r = computeApproachDeltaT(approachDeltaTExample.inputs);
  assert.equal(r.approach_F, 15);
  assert.equal(r.delta_T_F, 20);
});

test("Approach delta-T: bands labelled normal in example", () => {
  const r = computeApproachDeltaT(approachDeltaTExample.inputs);
  assert.equal(r.approach_band, "normal");
  assert.equal(r.delta_T_band, "normal");
});

test("Approach delta-T: low approach flagged", () => {
  const r = computeApproachDeltaT({ outdoor_F: 90, condenser_saturation_F: 92, supply_F: 55, return_F: 75 });
  assert.equal(r.approach_band, "low");
});

test("Approach delta-T: high approach flagged", () => {
  const r = computeApproachDeltaT({ outdoor_F: 90, condenser_saturation_F: 130, supply_F: 55, return_F: 75 });
  assert.equal(r.approach_band, "high");
});

test("Approach delta-T: low delta-T flagged", () => {
  const r = computeApproachDeltaT({ outdoor_F: 90, condenser_saturation_F: 105, supply_F: 65, return_F: 75 });
  assert.equal(r.delta_T_band, "low");
});

test("Approach delta-T: high delta-T flagged", () => {
  const r = computeApproachDeltaT({ outdoor_F: 90, condenser_saturation_F: 105, supply_F: 40, return_F: 75 });
  assert.equal(r.delta_T_band, "high");
});

test("Approach delta-T: approach = sat - outdoor", () => {
  const r = computeApproachDeltaT({ outdoor_F: 80, condenser_saturation_F: 100, supply_F: 60, return_F: 75 });
  assert.equal(r.approach_F, 20);
});

test("Approach delta-T: delta_T = return - supply", () => {
  const r = computeApproachDeltaT({ outdoor_F: 80, condenser_saturation_F: 100, supply_F: 50, return_F: 70 });
  assert.equal(r.delta_T_F, 20);
});

test("Approach delta-T: zero supply/return yields delta_T 0 -> low band", () => {
  const r = computeApproachDeltaT({ outdoor_F: 80, condenser_saturation_F: 100, supply_F: 70, return_F: 70 });
  assert.equal(r.delta_T_F, 0);
  assert.equal(r.delta_T_band, "low");
});

test("Approach delta-T: configurable bands respected", () => {
  const r = computeApproachDeltaT({ outdoor_F: 90, condenser_saturation_F: 105, supply_F: 55, return_F: 75, delta_T_normal_low: 30, delta_T_normal_high: 50 });
  assert.equal(r.delta_T_band, "low");
});

// --- Utility 81: Outdoor Air Mix ---

test("OA mix: 0.2 fraction at 75/95 -> 79 F dry-bulb", () => {
  const r = computeOutdoorAirMix(outdoorAirMixExample.inputs);
  assert.ok(close(r.mixed_T_F, 79));
});

test("OA mix: 0% OA -> mixed_T equals return_T", () => {
  const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 0 });
  assert.equal(r.mixed_T_F, 75);
});

test("OA mix: 100% OA -> mixed_T equals outdoor_T", () => {
  const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 1 });
  assert.equal(r.mixed_T_F, 95);
});

test("OA mix: humid OA raises mixed grains", () => {
  const a = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 30, oa_fraction: 0.5 });
  const b = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 80, oa_fraction: 0.5 });
  assert.ok(b.mixed_GPP > a.mixed_GPP);
});

test("OA mix: fraction clamped to [0,1] when given negative", () => {
  const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: -0.5 });
  assert.equal(r.oa_fraction, 0);
});

test("OA mix: fraction clamped to [0,1] when given >1", () => {
  const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 1.5 });
  assert.equal(r.oa_fraction, 1);
});

test("OA mix: mixed humidity ratio between RA and OA", () => {
  const r = computeOutdoorAirMix(outdoorAirMixExample.inputs);
  const lo = Math.min(r.return_W_kg_kg, r.outdoor_W_kg_kg);
  const hi = Math.max(r.return_W_kg_kg, r.outdoor_W_kg_kg);
  assert.ok(r.mixed_W_kg_kg >= lo && r.mixed_W_kg_kg <= hi);
});

test("OA mix: mixed grains in valid positive range", () => {
  const r = computeOutdoorAirMix(outdoorAirMixExample.inputs);
  assert.ok(r.mixed_GPP > 0 && r.mixed_GPP < 500);
});

test("OA mix: 0.5 fraction yields midpoint dry-bulb", () => {
  const r = computeOutdoorAirMix({ return_T_F: 70, return_RH_percent: 50, outdoor_T_F: 100, outdoor_RH_percent: 50, oa_fraction: 0.5 });
  assert.equal(r.mixed_T_F, 85);
});

test("OA mix: same RA and OA yields identical W", () => {
  const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 75, outdoor_RH_percent: 50, oa_fraction: 0.5 });
  assert.ok(close(r.return_W_kg_kg, r.outdoor_W_kg_kg, 1e-12));
  assert.ok(close(r.mixed_W_kg_kg, r.return_W_kg_kg, 1e-12));
});

// --- Utility 82: Equivalent Length ---

test("Equivalent length: example matches", () => {
  const r = computeEquivalentLength(equivalentLengthExample.inputs);
  assert.ok(close(r.total_equivalent_ft, equivalentLengthExample.expected.total_equivalent_ft));
});

test("Equivalent length: empty list -> 0", () => {
  const r = computeEquivalentLength({ items: [] });
  assert.equal(r.total_equivalent_ft, 0);
});

test("Equivalent length: unknown type returns error", () => {
  const r = computeEquivalentLength({ items: [{ type: "wormhole", diameter: "1", count: 1 }] });
  assert.ok(r.error);
});

test("Equivalent length: unknown diameter returns error", () => {
  const r = computeEquivalentLength({ items: [{ type: "elbow_45", diameter: "9", count: 1 }] });
  assert.ok(r.error);
});

test("Equivalent length: tee_branch greater than tee_run", () => {
  assert.ok(FITTING_EQUIVALENT_LENGTH_FT.tee_branch["1"] > FITTING_EQUIVALENT_LENGTH_FT.tee_run["1"]);
});

test("Equivalent length: scales with count", () => {
  const a = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count: 1 }] });
  const b = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count: 5 }] });
  assert.ok(close(b.total_equivalent_ft, 5 * a.total_equivalent_ft));
});

test("Equivalent length: larger diameter -> more equiv ft", () => {
  const a = computeEquivalentLength({ items: [{ type: "tee_branch", diameter: "0.5", count: 1 }] });
  const b = computeEquivalentLength({ items: [{ type: "tee_branch", diameter: "2", count: 1 }] });
  assert.ok(b.total_equivalent_ft > a.total_equivalent_ft);
});

test("Equivalent length: detail returned per item", () => {
  const r = computeEquivalentLength({ items: [{ type: "elbow_45", diameter: "1", count: 3 }] });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].count, 3);
});

test("Equivalent length: 8 fitting types bundled", () => {
  assert.equal(Object.keys(FITTING_EQUIVALENT_LENGTH_FT).length, 8);
});

test("Equivalent length: ball_valve at 1 in is small (< 1 ft)", () => {
  assert.ok(FITTING_EQUIVALENT_LENGTH_FT.ball_valve["1"] < 1);
});

// --- Utility 83: Wet-Bulb Psychrometer ---

test("Wet-bulb: example RH between 40 and 60 %", () => {
  const r = computeWetBulbPsychrometer(wetBulbPsychrometerExample.inputs);
  assert.ok(r.RH_percent > 40 && r.RH_percent < 60);
});

test("Wet-bulb: equal Td/Tw -> 100% RH", () => {
  const r = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F: 80 });
  assert.ok(r.RH_percent > 99);
});

test("Wet-bulb: Tw > Td returns error", () => {
  const r = computeWetBulbPsychrometer({ dry_bulb_F: 60, wet_bulb_F: 80 });
  assert.ok(r.error);
});

test("Wet-bulb: dew point <= dry-bulb", () => {
  const r = computeWetBulbPsychrometer(wetBulbPsychrometerExample.inputs);
  assert.ok(r.dew_point_F <= wetBulbPsychrometerExample.inputs.dry_bulb_F);
});

test("Wet-bulb: GPP positive", () => {
  const r = computeWetBulbPsychrometer(wetBulbPsychrometerExample.inputs);
  assert.ok(r.GPP > 0);
});

test("Wet-bulb: drier (low Tw) yields lower RH", () => {
  const a = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F: 70 });
  const b = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F: 60 });
  assert.ok(b.RH_percent < a.RH_percent);
});

test("Wet-bulb: dew point at saturation equals Tw approximately", () => {
  const r = computeWetBulbPsychrometer({ dry_bulb_F: 70, wet_bulb_F: 70 });
  assert.ok(close(r.dew_point_F, 70, 1));
});

test("Wet-bulb: hotter air at same Tw -> lower RH", () => {
  const a = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F: 67 });
  const b = computeWetBulbPsychrometer({ dry_bulb_F: 100, wet_bulb_F: 67 });
  assert.ok(b.RH_percent < a.RH_percent);
});

test("Wet-bulb: returns numeric RH", () => {
  const r = computeWetBulbPsychrometer(wetBulbPsychrometerExample.inputs);
  assert.equal(typeof r.RH_percent, "number");
});

test("Wet-bulb: RH bounded [0,100]", () => {
  const r = computeWetBulbPsychrometer({ dry_bulb_F: 90, wet_bulb_F: 50 });
  assert.ok(r.RH_percent >= 0 && r.RH_percent <= 100);
});

// --- Utility 84: Insulation Thickness ---

test("Insulation: example yields positive thickness in band", () => {
  const r = computeInsulationThickness(insulationThicknessExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.thickness_in > 0.4 && r.thickness_in < 3.0);
});

test("Insulation: surface limit above pipe surface returns error", () => {
  const r = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 100, ambient_F: 75, surface_limit_F: 150, k_btu_in_per_hr_ft2_F: 0.27 });
  assert.ok(r.error);
});

test("Insulation: surface temp <= ambient returns error", () => {
  const r = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 75, ambient_F: 75, surface_limit_F: 100, k_btu_in_per_hr_ft2_F: 0.27 });
  assert.ok(r.error);
});

test("Insulation: surface limit at/below ambient returns error", () => {
  const r = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 70, k_btu_in_per_hr_ft2_F: 0.27 });
  assert.ok(r.error);
});

test("Insulation: hotter pipe needs more thickness", () => {
  const a = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 200, ambient_F: 75, surface_limit_F: 120, k_btu_in_per_hr_ft2_F: 0.27 });
  const b = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 350, ambient_F: 75, surface_limit_F: 120, k_btu_in_per_hr_ft2_F: 0.27 });
  assert.ok(b.thickness_in > a.thickness_in);
});

test("Insulation: lower k yields less thickness needed for same surface limit", () => {
  const hi = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 120, k_btu_in_per_hr_ft2_F: 0.27 });
  const lo = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 120, k_btu_in_per_hr_ft2_F: 0.16 });
  assert.ok(lo.thickness_in < hi.thickness_in);
});

test("Insulation: r2 > r1", () => {
  const r = computeInsulationThickness(insulationThicknessExample.inputs);
  assert.ok(r.r2_in > r.r1_in);
});

test("Insulation: thickness = r2 - r1", () => {
  const r = computeInsulationThickness(insulationThicknessExample.inputs);
  assert.ok(close(r.thickness_in, r.r2_in - r.r1_in));
});

test("Insulation: tighter surface limit -> more thickness", () => {
  const a = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 140, k_btu_in_per_hr_ft2_F: 0.27 });
  const b = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 110, k_btu_in_per_hr_ft2_F: 0.27 });
  assert.ok(b.thickness_in > a.thickness_in);
});

test("Insulation: r1 = pipe_od / 2", () => {
  const r = computeInsulationThickness(insulationThicknessExample.inputs);
  assert.ok(close(r.r1_in, insulationThicknessExample.inputs.pipe_od_in / 2));
});

// --- Utility 85: Evaporative Cooling ---

test("Evaporative: example yields ~10540 BTU/hr", () => {
  const r = computeEvaporativeCooling(evaporativeCoolingExample.inputs);
  assert.equal(r.cooling_btu_hr, 10540);
});

test("Evaporative: tons = BTU/hr / 12000", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 12000 / HFG_WATER_BTU_PER_LB });
  assert.ok(close(r.cooling_tons, 1, 0.01));
});

test("Evaporative: zero rate returns error", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 0 });
  assert.ok(r.error);
});

test("Evaporative: doubled rate doubles cooling", () => {
  const a = computeEvaporativeCooling({ evaporation_rate_lb_hr: 5 });
  const b = computeEvaporativeCooling({ evaporation_rate_lb_hr: 10 });
  assert.ok(close(b.cooling_btu_hr, 2 * a.cooling_btu_hr));
});

test("Evaporative: custom h_fg respected", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 10, hfg_btu_per_lb: 1000 });
  assert.equal(r.cooling_btu_hr, 10000);
});

test("Evaporative: HFG default ~1054", () => {
  assert.equal(HFG_WATER_BTU_PER_LB, 1054);
});

test("Evaporative: negative rate returns error", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: -1 });
  assert.ok(r.error);
});

test("Evaporative: tons positive when cooling positive", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 24 });
  assert.ok(r.cooling_tons > 0);
});

test("Evaporative: 1 lb/hr -> 1054 BTU/hr", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 1 });
  assert.equal(r.cooling_btu_hr, 1054);
});

test("Evaporative: 100 lb/hr -> 105400 BTU/hr", () => {
  const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 100 });
  assert.equal(r.cooling_btu_hr, 105400);
});

// --- Utility 119: Compare Refrigerants ---

test("Compare: example R-410A vs R-32 at 100 psig returns mode pressure_to_temp", () => {
  const r = computeCompareRefrigerants(compareRefrigerantsExample.inputs);
  assert.equal(r.mode, "pressure_to_temp");
});

test("Compare: returns ids on both sides", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-32", pressure_psig: 100 });
  assert.equal(r.a.id, "R-410A");
  assert.equal(r.b.id, "R-32");
});

test("Compare: pressure mode returns saturated_temperature_F on each side", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-32", pressure_psig: 100 });
  assert.equal(typeof r.a.saturated_temperature_F, "number");
  assert.equal(typeof r.b.saturated_temperature_F, "number");
});

test("Compare: temperature mode returns saturated_pressure_psig on each side", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-22", temperature_F: 50 });
  assert.equal(typeof r.a.saturated_pressure_psig, "number");
  assert.equal(typeof r.b.saturated_pressure_psig, "number");
  assert.equal(r.mode, "temp_to_pressure");
});

test("Compare: unknown refrigerant A returns error", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-9999", refrigerant_b: "R-32", pressure_psig: 100 });
  assert.ok(r.error);
});

test("Compare: unknown refrigerant B returns error", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-9999", pressure_psig: 100 });
  assert.ok(r.error);
});

test("Compare: missing both inputs returns error", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-32" });
  assert.ok(r.error);
});

test("Compare: each side carries manufacturer attribution", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-32", pressure_psig: 100 });
  assert.ok(typeof r.a.manufacturer === "string" && r.a.manufacturer.length > 0);
  assert.ok(typeof r.b.manufacturer === "string" && r.b.manufacturer.length > 0);
});

test("Compare: same refrigerant on both sides yields equal results", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-410A", pressure_psig: 100 });
  assert.equal(r.a.saturated_temperature_F, r.b.saturated_temperature_F);
});

test("Compare: input echoed in result", () => {
  const r = computeCompareRefrigerants({ refrigerant_a: "R-410A", refrigerant_b: "R-32", pressure_psig: 118 });
  assert.equal(r.input.pressure_psig, 118);
});
