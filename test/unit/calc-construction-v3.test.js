// Unit tests for calc-construction.js v3 utilities (147-158).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDrywall, drywallExample,
  computeRoofingSquares, roofingSquaresExample, SHINGLE_BUNDLES_PER_SQUARE,
  computeAsphaltTonnage, asphaltTonnageExample,
  computeAggregate, aggregateExample, AGGREGATE_DENSITIES_PCF,
  computeMortarMix, mortarMixExample,
  computeConcreteMixDesign, concreteMixDesignExample, ACI_211_W_C,
  computeBoltTorque, boltTorqueExample, BOLT_PROOF_LOADS_PSI,
  computeBendAllowance, bendAllowanceExample,
  computeSpeedsAndFeeds, speedsAndFeedsExample, SFM_TABLE,
  computeWeldUsage, weldUsageExample, WELD_DEPOSITION_EFFICIENCY,
  computeDemoDebris, demoDebrisExample, DEMO_DEBRIS_PCF, DUMPSTER_SIZES_YD3,
  computeFormworkPressure, formworkPressureExample, ACI_C_W,
} from "../../calc-construction.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 147 Drywall
test("Drywall: example yields sheet count", () => { const r = computeDrywall(drywallExample.inputs); assert.ok(r.sheets > 0); assert.ok(r.mud_gal > 0); });
test("Drywall: 4x12 needs fewer sheets than 4x8", () => { const a = computeDrywall({ wall_area_ft2: 1000, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 10 }); const b = computeDrywall({ wall_area_ft2: 1000, ceiling_area_ft2: 0, sheet_size: "4x12", waste_percent: 10 }); assert.ok(b.sheets < a.sheets); });
test("Drywall: zero areas error", () => { const r = computeDrywall({ wall_area_ft2: 0, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 10 }); assert.ok(r.error); });
test("Drywall: unknown size errors", () => { const r = computeDrywall({ wall_area_ft2: 100, ceiling_area_ft2: 0, sheet_size: "4x99", waste_percent: 10 }); assert.ok(r.error); });
test("Drywall: mud scales with total area", () => { const r = computeDrywall({ wall_area_ft2: 1000, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 0 }); assert.ok(close(r.mud_gal, 1000 * 0.053, 0.001)); });
test("Drywall: tape lf = total ft^2", () => { const r = computeDrywall({ wall_area_ft2: 800, ceiling_area_ft2: 200, sheet_size: "4x8", waste_percent: 0 }); assert.ok(close(r.tape_lf, 1000, 0.001)); });
test("Drywall: ceiling screws > wall screws per sheet", () => { const w = computeDrywall({ wall_area_ft2: 320, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 0 }); const c = computeDrywall({ wall_area_ft2: 0, ceiling_area_ft2: 320, sheet_size: "4x8", waste_percent: 0 }); assert.ok(c.screws > w.screws); });
test("Drywall: more waste -> more sheets", () => { const a = computeDrywall({ wall_area_ft2: 1000, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 0 }); const b = computeDrywall({ wall_area_ft2: 1000, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 25 }); assert.ok(b.sheets >= a.sheets); });
test("Drywall: negative area errors", () => { const r = computeDrywall({ wall_area_ft2: -1, ceiling_area_ft2: 0, sheet_size: "4x8", waste_percent: 10 }); assert.ok(r.error); });
test("Drywall: total ft2 returned", () => { const r = computeDrywall({ wall_area_ft2: 800, ceiling_area_ft2: 200, sheet_size: "4x8", waste_percent: 0 }); assert.equal(r.total_ft2, 1000); });

// 148 Roofing
test("Roofing: example yields squares", () => { const r = computeRoofingSquares(roofingSquaresExample.inputs); assert.ok(r.squares > 22); });
test("Roofing: bundles = ceil(squares * BPS)", () => { const r = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "architectural", perimeter_ft: 200 }); assert.ok(r.bundles >= Math.ceil(r.squares * 3)); });
test("Roofing: steeper pitch -> bigger waste factor", () => { const a = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "architectural", perimeter_ft: 200 }); const b = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 14, shingle_product: "architectural", perimeter_ft: 200 }); assert.ok(b.waste_factor > a.waste_factor); });
test("Roofing: premium uses 4 bundles/sq", () => { assert.equal(SHINGLE_BUNDLES_PER_SQUARE.premium, 4); });
test("Roofing: zero area errors", () => { const r = computeRoofingSquares({ roof_area_ft2: 0, pitch_rise: 4, shingle_product: "architectural", perimeter_ft: 200 }); assert.ok(r.error); });
test("Roofing: pitch >24 errors", () => { const r = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 30, shingle_product: "architectural", perimeter_ft: 200 }); assert.ok(r.error); });
test("Roofing: unknown product errors", () => { const r = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "x", perimeter_ft: 200 }); assert.ok(r.error); });
test("Roofing: drip edge equals perimeter", () => { const r = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "architectural", perimeter_ft: 175 }); assert.equal(r.drip_edge_lf, 175); });
test("Roofing: underlayment ~ squares/4", () => { const r = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "architectural", perimeter_ft: 200 }); assert.ok(r.underlayment_rolls >= Math.ceil(r.squares / 4) - 1); });
test("Roofing: 3-tab vs architectural same bundles", () => { const a = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "3-tab", perimeter_ft: 200 }); const b = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "architectural", perimeter_ft: 200 }); assert.equal(a.bundles, b.bundles); });

// 149 Asphalt
test("Asphalt: example yields ~ 90.6 tons", () => { const r = computeAsphaltTonnage(asphaltTonnageExample.inputs); assert.ok(close(r.tons, (5000 * 0.25 * 145) / 2000, 0.5)); });
test("Asphalt: zero depth errors", () => { const r = computeAsphaltTonnage({ area_ft2: 5000, depth_in: 0, density_pcf: 145 }); assert.ok(r.error); });
test("Asphalt: zero area errors", () => { const r = computeAsphaltTonnage({ area_ft2: 0, depth_in: 3, density_pcf: 145 }); assert.ok(r.error); });
test("Asphalt: zero density errors", () => { const r = computeAsphaltTonnage({ area_ft2: 100, depth_in: 3, density_pcf: 0 }); assert.ok(r.error); });
test("Asphalt: scales linearly with depth", () => { const a = computeAsphaltTonnage({ area_ft2: 1000, depth_in: 2, density_pcf: 145 }); const b = computeAsphaltTonnage({ area_ft2: 1000, depth_in: 4, density_pcf: 145 }); assert.ok(close(b.tons / a.tons, 2, 0.001)); });
test("Asphalt: truck loads >= 1 when tons > 0", () => { const r = computeAsphaltTonnage({ area_ft2: 1000, depth_in: 3, density_pcf: 145 }); assert.ok(r.truck_loads_at_20T >= 1); });
test("Asphalt: 21 tons -> 2 trucks", () => { const r = computeAsphaltTonnage({ area_ft2: 1158, depth_in: 3, density_pcf: 145 }); assert.ok(r.truck_loads_at_20T === 2 || r.truck_loads_at_20T === 3); });
test("Asphalt: volume = area * depth/12", () => { const r = computeAsphaltTonnage({ area_ft2: 100, depth_in: 6, density_pcf: 145 }); assert.equal(r.volume_ft3, 50); });
test("Asphalt: density change scales tons", () => { const a = computeAsphaltTonnage({ area_ft2: 100, depth_in: 3, density_pcf: 100 }); const b = computeAsphaltTonnage({ area_ft2: 100, depth_in: 3, density_pcf: 200 }); assert.ok(close(b.tons / a.tons, 2, 0.001)); });
test("Asphalt: small area returns finite", () => { const r = computeAsphaltTonnage({ area_ft2: 1, depth_in: 1, density_pcf: 145 }); assert.ok(Number.isFinite(r.tons)); });

// 150 Aggregate
test("Aggregate: cubic yards = vol/27", () => { const r = computeAggregate(aggregateExample.inputs); assert.ok(close(r.cubic_yards, (1000 * 4 / 12) / 27, 0.001)); });
test("Aggregate: unknown material errors", () => { const r = computeAggregate({ area_ft2: 100, depth_in: 4, material: "spam" }); assert.ok(r.error); });
test("Aggregate: zero area errors", () => { const r = computeAggregate({ area_ft2: 0, depth_in: 4, material: "crushed_stone" }); assert.ok(r.error); });
test("Aggregate: density returned", () => { const r = computeAggregate({ area_ft2: 100, depth_in: 4, material: "road_base" }); assert.equal(r.pcf, 130); });
test("Aggregate: every density positive", () => { for (const [k, v] of Object.entries(AGGREGATE_DENSITIES_PCF)) assert.ok(v > 0, k); });
test("Aggregate: tons scale with depth", () => { const a = computeAggregate({ area_ft2: 100, depth_in: 2, material: "crushed_stone" }); const b = computeAggregate({ area_ft2: 100, depth_in: 4, material: "crushed_stone" }); assert.ok(close(b.tons / a.tons, 2, 0.001)); });
test("Aggregate: pea gravel less dense than road base", () => { const a = computeAggregate({ area_ft2: 100, depth_in: 4, material: "pea_gravel" }); const b = computeAggregate({ area_ft2: 100, depth_in: 4, material: "road_base" }); assert.ok(b.tons > a.tons); });
test("Aggregate: zero depth errors", () => { const r = computeAggregate({ area_ft2: 100, depth_in: 0, material: "sand" }); assert.ok(r.error); });
test("Aggregate: sand 100 pcf", () => { assert.equal(AGGREGATE_DENSITIES_PCF.sand, 100); });
test("Aggregate: cubic yards positive", () => { const r = computeAggregate({ area_ft2: 50, depth_in: 6, material: "sand" }); assert.ok(r.cubic_yards > 0); });

// 151 Mortar
test("Mortar: 600 bricks 3/8 joint -> 20 bags", () => { const r = computeMortarMix(mortarMixExample.inputs); assert.equal(r.bags, 20); });
test("Mortar: 60 CMU -> 6 bags", () => { const r = computeMortarMix({ unit_count: 60, unit_kind: "cmu_8", joint_in: 0.375, mortar_type: "S" }); assert.equal(r.bags, 6); });
test("Mortar: zero unit count errors", () => { const r = computeMortarMix({ unit_count: 0, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" }); assert.ok(r.error); });
test("Mortar: unknown type errors", () => { const r = computeMortarMix({ unit_count: 100, unit_kind: "brick", joint_in: 0.375, mortar_type: "Q" }); assert.ok(r.error); });
test("Mortar: unknown unit kind errors", () => { const r = computeMortarMix({ unit_count: 100, unit_kind: "x", joint_in: 0.375, mortar_type: "N" }); assert.ok(r.error); });
test("Mortar: thicker joint -> more bags", () => { const a = computeMortarMix({ unit_count: 600, unit_kind: "brick", joint_in: 0.25, mortar_type: "N" }); const b = computeMortarMix({ unit_count: 600, unit_kind: "brick", joint_in: 0.5, mortar_type: "N" }); assert.ok(b.bags > a.bags); });
test("Mortar: bags rounds up", () => { const r = computeMortarMix({ unit_count: 31, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" }); assert.equal(r.bags, 2); });
test("Mortar: type S valid", () => { const r = computeMortarMix({ unit_count: 100, unit_kind: "brick", joint_in: 0.375, mortar_type: "S" }); assert.equal(r.mortar_type, "S"); });
test("Mortar: joint factor returned", () => { const r = computeMortarMix({ unit_count: 100, unit_kind: "brick", joint_in: 0.5, mortar_type: "N" }); assert.ok(close(r.joint_factor, 4 / 3, 0.001)); });
test("Mortar: small count rounds up", () => { const r = computeMortarMix({ unit_count: 1, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" }); assert.equal(r.bags, 1); });

// 152 Concrete mix
test("Mix design: example yields w/c ~ 0.48", () => { const r = computeConcreteMixDesign(concreteMixDesignExample.inputs); assert.ok(close(r.wc_ratio, 0.48, 0.01)); });
test("Mix design: marine has lower w/c than interior", () => { const a = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 }); const b = computeConcreteMixDesign({ strength_psi: 4000, exposure: "marine", max_aggregate_in: 1, slump_in: 4 }); assert.ok(b.wc_ratio <= a.wc_ratio); });
test("Mix design: unknown exposure errors", () => { const r = computeConcreteMixDesign({ strength_psi: 4000, exposure: "x", max_aggregate_in: 1, slump_in: 4 }); assert.ok(r.error); });
test("Mix design: low strength errors", () => { const r = computeConcreteMixDesign({ strength_psi: 1000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 }); assert.ok(r.error); });
test("Mix design: cement bags positive", () => { const r = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 }); assert.ok(r.cement_bags_yd3 > 0); });
test("Mix design: higher slump -> more water", () => { const a = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 }); const b = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 1, slump_in: 7 }); assert.ok(b.water_lb_yd3 > a.water_lb_yd3); });
test("Mix design: bigger aggregate -> less water", () => { const a = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 0.5, slump_in: 4 }); const b = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 2, slump_in: 4 }); assert.ok(b.water_lb_yd3 <= a.water_lb_yd3); });
test("Mix design: every exposure has 6000 psi entry", () => { for (const k of Object.keys(ACI_211_W_C)) assert.ok(ACI_211_W_C[k][6000] > 0, k); });
test("Mix design: high strength clamps to lowest w/c", () => { const r = computeConcreteMixDesign({ strength_psi: 8000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 }); assert.ok(close(r.wc_ratio, ACI_211_W_C.interior[6000], 0.001)); });
test("Mix design: fine aggregate non-negative", () => { const r = computeConcreteMixDesign({ strength_psi: 4000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 }); assert.ok(r.fine_lb_yd3 >= 0); });

// 153 Bolt torque
test("Bolt torque: example yields finite torque", () => { const r = computeBoltTorque(boltTorqueExample.inputs); assert.ok(r.torque_ft_lb > 0); });
test("Bolt torque: SAE 8 > SAE 5 at same diameter", () => { const a = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 }); const b = computeBoltTorque({ grade: "SAE_8", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 }); assert.ok(b.torque_ft_lb > a.torque_ft_lb); });
test("Bolt torque: anti-seize K < dry K", () => { const a = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 }); const b = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "antiseize", preload_fraction: 0.75 }); assert.ok(b.torque_ft_lb < a.torque_ft_lb); });
test("Bolt torque: unknown grade errors", () => { const r = computeBoltTorque({ grade: "x", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 }); assert.ok(r.error); });
test("Bolt torque: unknown lube errors", () => { const r = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "x", preload_fraction: 0.75 }); assert.ok(r.error); });
test("Bolt torque: zero diameter errors", () => { const r = computeBoltTorque({ grade: "SAE_5", diameter_in: 0, lubrication: "dry", preload_fraction: 0.75 }); assert.ok(r.error); });
test("Bolt torque: out-of-range preload errors", () => { const r = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 1.5 }); assert.ok(r.error); });
test("Bolt torque: unsupported diameter errors", () => { const r = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.123, lubrication: "dry", preload_fraction: 0.75 }); assert.ok(r.error); });
test("Bolt torque: scales linearly with preload", () => { const a = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.5 }); const b = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 1.0 }); assert.ok(close(b.torque_ft_lb / a.torque_ft_lb, 2, 0.001)); });
test("Bolt torque: every grade has positive proof load", () => { for (const k of Object.keys(BOLT_PROOF_LOADS_PSI)) assert.ok(BOLT_PROOF_LOADS_PSI[k] > 0); });

// 154 Bend allowance
test("Bend: BA matches formula", () => { const r = computeBendAllowance(bendAllowanceExample.inputs); const ba = (Math.PI / 180) * 90 * (0.125 + 0.44 * 0.06); assert.ok(close(r.bend_allowance_in, ba, 0.001)); });
test("Bend: zero thickness errors", () => { const r = computeBendAllowance({ thickness_in: 0, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 1, leg_b_in: 1 }); assert.ok(r.error); });
test("Bend: bend angle 0 errors", () => { const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 0, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 1, leg_b_in: 1 }); assert.ok(r.error); });
test("Bend: bend angle 200 errors", () => { const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 200, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 1, leg_b_in: 1 }); assert.ok(r.error); });
test("Bend: negative inside radius errors", () => { const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: -1, k_factor: 0.44, leg_a_in: 1, leg_b_in: 1 }); assert.ok(r.error); });
test("Bend: hard K (0.33) < soft K (0.44) BA", () => { const a = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 0, leg_b_in: 0 }); const b = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.33, leg_a_in: 0, leg_b_in: 0 }); assert.ok(b.bend_allowance_in < a.bend_allowance_in); });
test("Bend: 180 deg out of range", () => { const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 180, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 1, leg_b_in: 1 }); assert.ok(r.error); });
test("Bend: flat blank scales with legs", () => { const a = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 1, leg_b_in: 1 }); const b = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 5, leg_b_in: 5 }); assert.ok(b.flat_blank_in > a.flat_blank_in); });
test("Bend: scaling angle linearly scales BA", () => { const a = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 30, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 0, leg_b_in: 0 }); const b = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 60, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 0, leg_b_in: 0 }); assert.ok(close(b.bend_allowance_in / a.bend_allowance_in, 2, 0.001)); });
test("Bend: positive results", () => { const r = computeBendAllowance({ thickness_in: 0.1, bend_angle_deg: 45, inside_radius_in: 0.2, k_factor: 0.4, leg_a_in: 3, leg_b_in: 3 }); assert.ok(r.bend_allowance_in > 0); });

// 155 Speeds and feeds
test("S/F: example RPM positive", () => { const r = computeSpeedsAndFeeds(speedsAndFeedsExample.inputs); assert.ok(r.rpm > 0); assert.ok(r.ipm > 0); });
test("S/F: aluminum > steel SFM for end mill", () => { const a = computeSpeedsAndFeeds({ tool: "end_mill", material: "steel", diameter_in: 0.5, flutes: 2 }); const b = computeSpeedsAndFeeds({ tool: "end_mill", material: "aluminum", diameter_in: 0.5, flutes: 2 }); assert.ok(b.rpm > a.rpm); });
test("S/F: smaller diameter -> higher RPM", () => { const a = computeSpeedsAndFeeds({ tool: "drill", material: "steel", diameter_in: 1, flutes: 1 }); const b = computeSpeedsAndFeeds({ tool: "drill", material: "steel", diameter_in: 0.25, flutes: 1 }); assert.ok(b.rpm > a.rpm); });
test("S/F: more flutes -> more IPM", () => { const a = computeSpeedsAndFeeds({ tool: "end_mill", material: "aluminum", diameter_in: 0.5, flutes: 2 }); const b = computeSpeedsAndFeeds({ tool: "end_mill", material: "aluminum", diameter_in: 0.5, flutes: 4 }); assert.ok(close(b.ipm / a.ipm, 2, 0.001)); });
test("S/F: unknown tool errors", () => { const r = computeSpeedsAndFeeds({ tool: "x", material: "steel", diameter_in: 0.5, flutes: 1 }); assert.ok(r.error); });
test("S/F: unknown material errors", () => { const r = computeSpeedsAndFeeds({ tool: "drill", material: "x", diameter_in: 0.5, flutes: 1 }); assert.ok(r.error); });
test("S/F: zero diameter errors", () => { const r = computeSpeedsAndFeeds({ tool: "drill", material: "steel", diameter_in: 0, flutes: 1 }); assert.ok(r.error); });
test("S/F: zero flutes errors", () => { const r = computeSpeedsAndFeeds({ tool: "drill", material: "steel", diameter_in: 0.5, flutes: 0 }); assert.ok(r.error); });
test("S/F: every tool has steel entry", () => { for (const t of Object.keys(SFM_TABLE)) assert.ok(SFM_TABLE[t].steel.sfm > 0, t); });
test("S/F: RPM = SFM*3.82/D", () => { const r = computeSpeedsAndFeeds({ tool: "drill", material: "steel", diameter_in: 0.5, flutes: 1 }); assert.ok(close(r.rpm, 80 * 3.82 / 0.5, 0.001)); });

// 156 Weld usage
test("Weld: example yields positive consumable", () => { const r = computeWeldUsage(weldUsageExample.inputs); assert.ok(r.consumable_lb > r.deposit_lb); });
test("Weld: SMAW efficiency 60%", () => { assert.equal(WELD_DEPOSITION_EFFICIENCY.SMAW, 0.60); });
test("Weld: GTAW efficiency 100%", () => { const r = computeWeldUsage({ process: "GTAW", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); assert.ok(close(r.consumable_lb, r.deposit_lb, 0.001)); });
test("Weld: SMAW more consumable than GMAW", () => { const a = computeWeldUsage({ process: "SMAW", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); const b = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); assert.ok(a.consumable_lb > b.consumable_lb); });
test("Weld: unknown process errors", () => { const r = computeWeldUsage({ process: "x", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); assert.ok(r.error); });
test("Weld: zero cross-section errors", () => { const r = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); assert.ok(r.error); });
test("Weld: zero length errors", () => { const r = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 0, deposition_rate_lb_per_min: 4 }); assert.ok(r.error); });
test("Weld: SMAW zero gas", () => { const r = computeWeldUsage({ process: "SMAW", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); assert.equal(r.gas_ft3, 0); });
test("Weld: GMAW positive gas", () => { const r = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 }); assert.ok(r.gas_ft3 > 0); });
test("Weld: deposit linear in length", () => { const a = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 60, deposition_rate_lb_per_min: 4 }); const b = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 120, deposition_rate_lb_per_min: 4 }); assert.ok(close(b.deposit_lb / a.deposit_lb, 2, 0.001)); });

// 157 Demo debris
test("Demo: example tons positive", () => { const r = computeDemoDebris(demoDebrisExample.inputs); assert.ok(r.tons > 0); assert.equal(r.dumpster_yd3, 30); });
test("Demo: concrete > masonry > mixed > wood", () => { const w = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 10 }); const m = computeDemoDebris({ structure_type: "mixed", volume_yd3: 10 }); const ma = computeDemoDebris({ structure_type: "masonry", volume_yd3: 10 }); const c = computeDemoDebris({ structure_type: "concrete", volume_yd3: 10 }); assert.ok(c.tons > ma.tons && ma.tons > m.tons && m.tons > w.tons); });
test("Demo: unknown structure errors", () => { const r = computeDemoDebris({ structure_type: "x", volume_yd3: 10 }); assert.ok(r.error); });
test("Demo: zero volume errors", () => { const r = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 0 }); assert.ok(r.error); });
test("Demo: very large volume caps at 40 yd^3", () => { const r = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 200 }); assert.equal(r.dumpster_yd3, 40); });
test("Demo: small volume picks 10 yd^3", () => { const r = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 5 }); assert.equal(r.dumpster_yd3, 10); });
test("Demo: dumpster sizes match registry", () => { for (const s of DUMPSTER_SIZES_YD3) assert.ok([10,20,30,40].includes(s)); });
test("Demo: tons scale linearly", () => { const a = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 10 }); const b = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 20 }); assert.ok(close(b.tons / a.tons, 2, 0.001)); });
test("Demo: every pcf benchmark positive", () => { for (const [k, v] of Object.entries(DEMO_DEBRIS_PCF)) assert.ok(v > 0, k); });
test("Demo: volume_ft3 returned", () => { const r = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 10 }); assert.equal(r.volume_ft3, 270); });

// 158 Formwork pressure
test("Formwork: example below wet head cap", () => { const r = computeFormworkPressure(formworkPressureExample.inputs); assert.ok(r.pressure_psf > 0); });
test("Formwork: tall pour gets capped at wet head", () => { const r = computeFormworkPressure({ pour_rate_ft_per_hr: 50, concrete_temp_F: 50, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 2 }); assert.equal(r.cap_applied, true); assert.ok(close(r.pressure_psf, 300, 0.5)); });
test("Formwork: short wall not capped at low pour", () => { const r = computeFormworkPressure({ pour_rate_ft_per_hr: 1, concrete_temp_F: 80, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 }); assert.equal(r.cap_applied, false); });
test("Formwork: zero pour rate errors", () => { const r = computeFormworkPressure({ pour_rate_ft_per_hr: 0, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 12 }); assert.ok(r.error); });
test("Formwork: zero temp errors", () => { const r = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 0, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 12 }); assert.ok(r.error); });
test("Formwork: unknown weight factor errors", () => { const r = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "x", unit_weight_pcf: 150, wall_height_ft: 12 }); assert.ok(r.error); });
test("Formwork: lighter concrete -> lower pressure", () => { const a = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 12 }); const b = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "lightweight_115", unit_weight_pcf: 150, wall_height_ft: 12 }); assert.ok(b.aci_pressure_psf < a.aci_pressure_psf); });
test("Formwork: cap exact at boundary", () => { const r = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 5 }); assert.ok(r.pressure_psf <= r.wet_head_psf); });
test("Formwork: every weight factor positive", () => { for (const k of Object.keys(ACI_C_W)) assert.ok(ACI_C_W[k] > 0); });
test("Formwork: faster pour -> higher ACI value (uncapped)", () => { const a = computeFormworkPressure({ pour_rate_ft_per_hr: 1, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 }); const b = computeFormworkPressure({ pour_rate_ft_per_hr: 10, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 }); assert.ok(b.aci_pressure_psf > a.aci_pressure_psf); });
