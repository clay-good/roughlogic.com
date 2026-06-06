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

// ---------------------------------------------------------------------------
// v23 Part II batch 2 (15 new tiles)
// ---------------------------------------------------------------------------
import { computeWallBracingLength, computeDeckLedgerFasteners } from "../../calc-construction.js";
import { computeCargoSecurementWLL, computeFuelTaxIFTA } from "../../calc-trucking.js";
import { computeScrewConveyor } from "../../calc-mechanic.js";
import { computeTrapSealLoss, computeWaterMeterSizing } from "../../calc-plumbing.js";
import { computeDryingChamberCO2 } from "../../calc-restoration.js";
import { computePesticideReiPhi } from "../../calc-agriculture.js";
import { computeBackflowTestPSI } from "../../calc-water.js";
import { computeGelPercentAgarose } from "../../calc-lab.js";
import { computePediatricTubeDepth } from "../../calc-ems.js";
import { computeWeightShiftFuelBurn } from "../../calc-aviation.js";
import { computeDepreciationRecapture, computeRentRollVacancy } from "../../calc-realestate.js";

// E.1 wall-bracing-length
test("wall-bracing-length: 20% of a 40 ft line -> 8 ft required, 9 ft provided passes", () => {
  const r = computeWallBracingLength({ wall_line_length_ft: 40, bracing_percent: 20, provided_length_ft: 9 });
  assert.ok(Math.abs(r.required_length_ft - 8) < 1e-9);
  assert.strictEqual(r.pass, true);
  assert.strictEqual(computeWallBracingLength({ wall_line_length_ft: 40, bracing_percent: 20, provided_length_ft: 6 }).pass, false);
});
test("wall-bracing-length: non-positive line and out-of-range percent rejected; no provided -> null verdict", () => {
  assert.ok("error" in computeWallBracingLength({ wall_line_length_ft: 0, bracing_percent: 20 }));
  assert.ok("error" in computeWallBracingLength({ wall_line_length_ft: 40, bracing_percent: 0 }));
  assert.ok("error" in computeWallBracingLength({ wall_line_length_ft: 40, bracing_percent: 120 }));
  assert.strictEqual(computeWallBracingLength({ wall_line_length_ft: 40, bracing_percent: 20 }).pass, null);
});

// E.2 deck-ledger-fasteners
test("deck-ledger-fasteners: 16 ft ledger at 16 in OC -> 13 fasteners, within table", () => {
  const r = computeDeckLedgerFasteners({ joist_span_ft: 12, spacing_in: 16, ledger_length_ft: 16 });
  assert.strictEqual(r.fastener_count, 13);
  assert.strictEqual(r.pass, true);
});
test("deck-ledger-fasteners: span over 18 ft flags out-of-table; non-positive inputs rejected", () => {
  assert.strictEqual(computeDeckLedgerFasteners({ joist_span_ft: 20, spacing_in: 16, ledger_length_ft: 16 }).pass, false);
  assert.ok("error" in computeDeckLedgerFasteners({ joist_span_ft: 12, spacing_in: 0, ledger_length_ft: 16 }));
  assert.ok("error" in computeDeckLedgerFasteners({ joist_span_ft: 12, spacing_in: 16, ledger_length_ft: 0 }));
});

// J.1 cargo-securement-wll
test("cargo-securement-wll: 4 x 1500 lb -> 6000 aggregate >= 4000 required, 2 min tiedowns, pass", () => {
  const r = computeCargoSecurementWLL({ cargo_weight_lb: 8000, tiedown_count: 4, wll_each_lb: 1500, cargo_length_ft: 16 });
  assert.strictEqual(r.aggregate_wll_lb, 6000);
  assert.strictEqual(r.required_wll_lb, 4000);
  assert.strictEqual(r.min_tiedowns, 2);
  assert.strictEqual(r.pass, true);
});
test("cargo-securement-wll: under-WLL fails; non-positive inputs rejected", () => {
  assert.strictEqual(computeCargoSecurementWLL({ cargo_weight_lb: 8000, tiedown_count: 2, wll_each_lb: 1500, cargo_length_ft: 16 }).pass, false);
  assert.ok("error" in computeCargoSecurementWLL({ cargo_weight_lb: 0, tiedown_count: 4, wll_each_lb: 1500, cargo_length_ft: 16 }));
  assert.ok("error" in computeCargoSecurementWLL({ cargo_weight_lb: 8000, tiedown_count: 0, wll_each_lb: 1500, cargo_length_ft: 16 }));
});

// J.2 fuel-tax-ifta
test("fuel-tax-ifta: 1200 mi / 6 MPG = 200 gal; net $15 due; credit when over-purchased", () => {
  const r = computeFuelTaxIFTA({ miles: 1200, fleet_mpg: 6, tax_rate_per_gal: 0.30, gallons_purchased: 150 });
  assert.ok(Math.abs(r.taxable_gallons - 200) < 1e-9);
  assert.ok(Math.abs(r.net_tax - 15) < 1e-9);
  assert.strictEqual(r.is_credit, false);
  assert.strictEqual(computeFuelTaxIFTA({ miles: 1200, fleet_mpg: 6, tax_rate_per_gal: 0.30, gallons_purchased: 300 }).is_credit, true);
});
test("fuel-tax-ifta: MPG = 0 rejected", () => {
  assert.ok("error" in computeFuelTaxIFTA({ miles: 1200, fleet_mpg: 0, tax_rate_per_gal: 0.30, gallons_purchased: 150 }));
});

// K.2 screw-conveyor
test("screw-conveyor: capacity scales with swept area, pitch, RPM, loading; mass rate with density", () => {
  const r = computeScrewConveyor({ screw_diameter_in: 9, shaft_diameter_in: 2.5, pitch_in: 9, rpm: 40, loading_fraction: 0.30, bulk_density_lb_ft3: 45 });
  assert.ok(Math.abs(r.capacity_ft3_hr - 220.157) < 0.5);
  assert.ok(Math.abs(r.mass_rate_lb_hr - 9907.06) < 2);
  assert.ok(Math.abs(r.mass_rate_ton_hr - r.mass_rate_lb_hr / 2000) < 1e-9);
});
test("screw-conveyor: shaft >= screw rejected; loading out of (0,1] rejected; no density -> null mass", () => {
  assert.ok("error" in computeScrewConveyor({ screw_diameter_in: 9, shaft_diameter_in: 9, pitch_in: 9, rpm: 40, loading_fraction: 0.3 }));
  assert.ok("error" in computeScrewConveyor({ screw_diameter_in: 9, shaft_diameter_in: 2.5, pitch_in: 9, rpm: 40, loading_fraction: 1.5 }));
  assert.strictEqual(computeScrewConveyor({ screw_diameter_in: 9, shaft_diameter_in: 2.5, pitch_in: 9, rpm: 40, loading_fraction: 0.3 }).mass_rate_lb_hr, null);
});

// B.1 trap-seal-loss
test("trap-seal-loss: 6 ft used of 8 ft permitted -> 75%, within limit, no siphonage", () => {
  const r = computeTrapSealLoss({ drain_diameter_in: 2, developed_distance_ft: 6, table_max_ft: 8, trap_seal_in: 2 });
  assert.strictEqual(r.percent_used, 75);
  assert.strictEqual(r.within_limit, true);
  assert.strictEqual(r.siphonage_risk, false);
});
test("trap-seal-loss: over-limit or shallow seal flags siphonage; non-positive rejected", () => {
  assert.strictEqual(computeTrapSealLoss({ drain_diameter_in: 2, developed_distance_ft: 10, table_max_ft: 8 }).siphonage_risk, true);
  assert.strictEqual(computeTrapSealLoss({ drain_diameter_in: 2, developed_distance_ft: 6, table_max_ft: 8, trap_seal_in: 0.5 }).siphonage_risk, true);
  assert.ok("error" in computeTrapSealLoss({ drain_diameter_in: 0, developed_distance_ft: 6, table_max_ft: 8 }));
});

// B.2 water-meter-sizing
test("water-meter-sizing: 30 of 50 gpm -> 60% used, 20 gpm headroom, adequate", () => {
  const r = computeWaterMeterSizing({ peak_demand_gpm: 30, normal_rating_gpm: 50, peak_rating_gpm: 100 });
  assert.strictEqual(r.percent_used, 60);
  assert.strictEqual(r.headroom_gpm, 20);
  assert.strictEqual(r.adequate, true);
  assert.strictEqual(r.above_peak_rating, false);
});
test("water-meter-sizing: above peak rating flags; non-positive rejected", () => {
  assert.strictEqual(computeWaterMeterSizing({ peak_demand_gpm: 120, normal_rating_gpm: 50, peak_rating_gpm: 100 }).above_peak_rating, true);
  assert.ok("error" in computeWaterMeterSizing({ peak_demand_gpm: 0, normal_rating_gpm: 50 }));
  assert.ok("error" in computeWaterMeterSizing({ peak_demand_gpm: 30, normal_rating_gpm: 0 }));
});

// D.1 drying-chamber-co2
test("drying-chamber-co2: 0.06 cfm CO2, 1000-400 ppm, 2000 ft^3 -> 100 cfm, 3.0 ACH", () => {
  const r = computeDryingChamberCO2({ containment_volume_ft3: 2000, co2_generation_cfm: 0.06, target_indoor_ppm: 1000, outdoor_ppm: 400 });
  assert.ok(Math.abs(r.fresh_air_cfm - 100) < 1e-9);
  assert.ok(Math.abs(r.ach - 3) < 1e-9);
});
test("drying-chamber-co2: no driving gradient and non-positive volume rejected; target > 1000 flagged", () => {
  assert.ok("error" in computeDryingChamberCO2({ containment_volume_ft3: 2000, co2_generation_cfm: 0.06, target_indoor_ppm: 400, outdoor_ppm: 420 }));
  assert.ok("error" in computeDryingChamberCO2({ containment_volume_ft3: 0, co2_generation_cfm: 0.06 }));
  assert.strictEqual(computeDryingChamberCO2({ containment_volume_ft3: 2000, co2_generation_cfm: 0.06, target_indoor_ppm: 1500, outdoor_ppm: 400 }).above_target, true);
});

// L.1 pesticide-rei-phi
test("pesticide-rei-phi: REI 12 hr / 4 elapsed -> 8 hr remaining; PHI 7 d / 2 elapsed -> 5 d", () => {
  const r = computePesticideReiPhi({ rei_hours: 12, phi_days: 7, hours_since_application: 4, days_since_application: 2 });
  assert.strictEqual(r.rei_remaining_hours, 8);
  assert.strictEqual(r.phi_remaining_days, 5);
  assert.strictEqual(r.rei_clear, false);
  assert.strictEqual(r.early_entry_violation, true);
});
test("pesticide-rei-phi: cleared once elapsed >= interval; negative interval rejected", () => {
  const r = computePesticideReiPhi({ rei_hours: 12, phi_days: 7, hours_since_application: 20, days_since_application: 10 });
  assert.strictEqual(r.rei_clear, true);
  assert.strictEqual(r.phi_clear, true);
  assert.strictEqual(r.rei_remaining_hours, 0);
  assert.ok("error" in computePesticideReiPhi({ rei_hours: -1, phi_days: 7 }));
});

// M.1 backflow-test-psi
test("backflow-test-psi: RP #1 check 8 psid, relief 4 psid -> buffer 4, pass; DC each >= 1", () => {
  const r = computeBackflowTestPSI({ assembly_type: "rp", check1_psid: 8, relief_open_psid: 4, check2_psi: 3 });
  assert.strictEqual(r.buffer_psid, 4);
  assert.strictEqual(r.pass, true);
  assert.strictEqual(computeBackflowTestPSI({ assembly_type: "dc", check1_psid: 2, relief_open_psid: 0, check2_psi: 2 }).pass, true);
});
test("backflow-test-psi: RP fails at low #1 check or insufficient relief buffer; negative rejected", () => {
  assert.strictEqual(computeBackflowTestPSI({ assembly_type: "rp", check1_psid: 4, relief_open_psid: 1, check2_psi: 3 }).pass, false);
  assert.strictEqual(computeBackflowTestPSI({ assembly_type: "rp", check1_psid: 6, relief_open_psid: 5, check2_psi: 3 }).pass, false);
  assert.ok("error" in computeBackflowTestPSI({ assembly_type: "rp", check1_psid: -1 }));
});

// T.1 gel-percent-agarose
test("gel-percent-agarose: 10 kb -> 0.8% recommended; grams = percent/100 x volume", () => {
  const r = computeGelPercentAgarose({ target_bp_high: 10000, buffer_volume_ml: 100 });
  assert.strictEqual(r.recommended_percent, 0.8);
  assert.strictEqual(r.used_percent, 0.8);
  assert.ok(Math.abs(r.grams_agarose - 0.8) < 1e-9);
});
test("gel-percent-agarose: override percent used; clamped to band; no size/percent rejected; non-positive volume rejected", () => {
  assert.strictEqual(computeGelPercentAgarose({ gel_percent: 1.5, buffer_volume_ml: 200 }).used_percent, 1.5);
  assert.strictEqual(computeGelPercentAgarose({ gel_percent: 5, buffer_volume_ml: 100 }).used_percent, 3);
  assert.ok("error" in computeGelPercentAgarose({ buffer_volume_ml: 100 }));
  assert.ok("error" in computeGelPercentAgarose({ target_bp_high: 10000, buffer_volume_ml: 0 }));
});

// V.1 pediatric-tube-depth
test("pediatric-tube-depth: 4 yr uncuffed -> ID 5.0 mm, depth 15 cm; cuffed lowers by 0.5", () => {
  const r = computePediatricTubeDepth({ age_years: 4, cuff: "uncuffed" });
  assert.ok(Math.abs(r.id_mm - 5) < 1e-9);
  assert.ok(Math.abs(r.depth_cm - 15) < 1e-9);
  assert.ok(Math.abs(computePediatricTubeDepth({ age_years: 4, cuff: "cuffed" }).id_mm - 4.5) < 1e-9);
});
test("pediatric-tube-depth: neonate flagged below 1 yr; negative age rejected", () => {
  assert.strictEqual(computePediatricTubeDepth({ age_years: 0.5 }).neonate, true);
  assert.ok("error" in computePediatricTubeDepth({ age_years: -1 }));
});

// W.1 weight-shift-fuel-burn
test("weight-shift-fuel-burn: 40 gal @ 95 in, 10 gph, 2 hr -> 1920 lb, CG 88.44 in within envelope", () => {
  const r = computeWeightShiftFuelBurn({ zfw_lb: 1800, zfw_moment_lbin: 158400, fuel_gal: 40, fuel_arm_in: 95, burn_gph: 10, elapsed_hr: 2, lb_per_gal: 6, fwd_limit_in: 82, aft_limit_in: 93 });
  assert.ok(Math.abs(r.weight_lb - 1920) < 1e-9);
  assert.ok(Math.abs(r.cg_in - 88.4375) < 1e-6);
  assert.strictEqual(r.within_limits, true);
});
test("weight-shift-fuel-burn: a forward fuel arm drives CG aft to the limit; ZFW <= 0 rejected", () => {
  // fuel arm 40 in (forward of the ~80 in CG): burning fuel moves CG aft.
  const r = computeWeightShiftFuelBurn({ zfw_lb: 1800, zfw_moment_lbin: 144000, fuel_gal: 40, fuel_arm_in: 40, burn_gph: 10, elapsed_hr: 0, lb_per_gal: 6, fwd_limit_in: 70, aft_limit_in: 79 });
  assert.ok(r.fuel_to_aft_gal !== null && Number.isFinite(r.fuel_to_aft_gal));
  assert.ok("error" in computeWeightShiftFuelBurn({ zfw_lb: 0, fuel_gal: 40 }));
});

// X.1 depreciation-recapture
test("depreciation-recapture: §1250 $100k SL, $150k gain -> $100k at 25% = $25k; §1245 at ordinary", () => {
  const r = computeDepreciationRecapture({ asset_class: "1250", accumulated_depreciation: 100000, total_gain: 150000, ordinary_rate_pct: 32, straight_line_depreciation: 100000 });
  assert.strictEqual(r.recaptured, 100000);
  assert.strictEqual(r.rate_applied_pct, 25);
  assert.strictEqual(r.recapture_tax, 25000);
  assert.strictEqual(r.remaining_capital_gain, 50000);
  const r45 = computeDepreciationRecapture({ asset_class: "1245", accumulated_depreciation: 40000, total_gain: 30000, ordinary_rate_pct: 24 });
  assert.strictEqual(r45.recaptured, 30000); // capped at the gain
  assert.ok(Math.abs(r45.recapture_tax - 7200) < 1e-9);
});
test("depreciation-recapture: recapture never exceeds gain; bad rate rejected", () => {
  const r = computeDepreciationRecapture({ asset_class: "1250", accumulated_depreciation: 200000, total_gain: 50000, ordinary_rate_pct: 32, straight_line_depreciation: 200000 });
  assert.ok(r.recaptured <= 50000);
  assert.ok("error" in computeDepreciationRecapture({ asset_class: "1245", accumulated_depreciation: 1, total_gain: 1, ordinary_rate_pct: 150 }));
});

// X.2 rent-roll-vacancy
test("rent-roll-vacancy: $120k PGR, 5%+2% loss, $6k other -> $8.4k loss, $117.6k EGI", () => {
  const r = computeRentRollVacancy({ potential_gross_rent: 120000, vacancy_rate_pct: 5, credit_loss_pct: 2, other_income: 6000 });
  assert.ok(Math.abs(r.vacancy_credit_loss - 8400) < 1e-9);
  assert.ok(Math.abs(r.effective_gross_income - 117600) < 1e-9);
  assert.ok(Math.abs(r.loss_percent_of_potential - 7) < 1e-9);
});
test("rent-roll-vacancy: vacancy + credit over 100% rejected; non-positive PGR rejected", () => {
  assert.ok("error" in computeRentRollVacancy({ potential_gross_rent: 120000, vacancy_rate_pct: 80, credit_loss_pct: 30 }));
  assert.ok("error" in computeRentRollVacancy({ potential_gross_rent: 0, vacancy_rate_pct: 5, credit_loss_pct: 2 }));
});
