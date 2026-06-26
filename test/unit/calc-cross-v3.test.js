// Unit tests for calc-cross.js v3 utilities (162-169, 171, 173).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTrenchSlope, trenchSlopeExample, TRENCH_SLOPES,
  computeNIOSHLifting, nioshLiftingExample, NIOSH_COUPLING,
  computeHeatStress, heatStressExample,
  computeWindChill, windChillExample,
  computeLadderAngle, ladderAngleExample,
  computePulleyMA, pulleyMAExample, PULLEY_RIGS,
  computeRampSlope, rampSlopeExample,
  computeRainwaterYield, rainwaterYieldExample,
  computeTimesheet, timesheetExample,
  computeVehicleLoad, vehicleLoadExample,
} from "../../calc-cross.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 162 Trench
test("Trench: example yields slope and setback", () => { const r = computeTrenchSlope(trenchSlopeExample.inputs); assert.equal(r.ratio, "1:1"); assert.ok(r.max_horizontal_ft > 0); });
test("Trench: A is steepest, C flattest", () => { const a = computeTrenchSlope({ depth_ft: 8, soil_class: "A" }); const c = computeTrenchSlope({ depth_ft: 8, soil_class: "C" }); assert.ok(c.max_horizontal_ft > a.max_horizontal_ft); });
test("Trench: zero depth errors", () => { const r = computeTrenchSlope({ depth_ft: 0, soil_class: "B" }); assert.ok(r.error); });
test("Trench: depth > 20 ft errors (engineer needed)", () => { const r = computeTrenchSlope({ depth_ft: 25, soil_class: "B" }); assert.ok(r.error); });
test("Trench: surcharge near trench errors (simple slope tables void, PE needed)", () => { const r = computeTrenchSlope({ depth_ft: 8, soil_class: "B", surcharge: true }); assert.ok(r.error); });
test("Trench: unknown class errors", () => { const r = computeTrenchSlope({ depth_ft: 8, soil_class: "X" }); assert.ok(r.error); });
test("Trench: top width = 2 + 2*horizontal", () => { const r = computeTrenchSlope({ depth_ft: 6, soil_class: "B" }); assert.ok(close(r.top_width_ft, 2 + 2 * r.max_horizontal_ft, 0.001)); });
test("Trench: bench height capped at 4 ft for A/B", () => { const r = computeTrenchSlope({ depth_ft: 10, soil_class: "A" }); assert.equal(r.bench_height_ft, 4); });
test("Trench: bench height 0 for C", () => { const r = computeTrenchSlope({ depth_ft: 10, soil_class: "C" }); assert.equal(r.bench_height_ft, 0); });
test("Trench: every soil class has positive H_to_V", () => { for (const k of Object.keys(TRENCH_SLOPES)) assert.ok(TRENCH_SLOPES[k].H_to_V > 0); });
test("Trench: setback scales with depth", () => { const a = computeTrenchSlope({ depth_ft: 5, soil_class: "B" }); const b = computeTrenchSlope({ depth_ft: 10, soil_class: "B" }); assert.ok(close(b.max_horizontal_ft / a.max_horizontal_ft, 2, 0.001)); });

// 163 NIOSH
test("NIOSH: example yields RWL > 0", () => { const r = computeNIOSHLifting(nioshLiftingExample.inputs); assert.ok(r.RWL_lb > 0); assert.ok(r.LI > 0); });
test("NIOSH: HM scales 10/H", () => { const r = computeNIOSHLifting({ ...nioshLiftingExample.inputs, H_in: 20 }); assert.ok(close(r.multipliers.HM, 0.5, 0.001)); });
test("NIOSH: poor coupling reduces RWL", () => { const a = computeNIOSHLifting({ ...nioshLiftingExample.inputs, coupling: "good" }); const b = computeNIOSHLifting({ ...nioshLiftingExample.inputs, coupling: "poor" }); assert.ok(b.RWL_lb < a.RWL_lb); });
test("NIOSH: high asymmetry reduces RWL", () => { const a = computeNIOSHLifting({ ...nioshLiftingExample.inputs, asymmetry_deg: 0 }); const b = computeNIOSHLifting({ ...nioshLiftingExample.inputs, asymmetry_deg: 90 }); assert.ok(b.RWL_lb < a.RWL_lb); });
test("NIOSH: H out of range errors", () => { const r = computeNIOSHLifting({ ...nioshLiftingExample.inputs, H_in: 5 }); assert.ok(r.error); });
test("NIOSH: V out of range errors", () => { const r = computeNIOSHLifting({ ...nioshLiftingExample.inputs, V_in: 100 }); assert.ok(r.error); });
test("NIOSH: unknown coupling errors", () => { const r = computeNIOSHLifting({ ...nioshLiftingExample.inputs, coupling: "x" }); assert.ok(r.error); });
test("NIOSH: LC = 51 lb", () => { const r = computeNIOSHLifting({ weight_lb: 0, H_in: 10, V_in: 30, D_in: 0, asymmetry_deg: 0, frequency_per_min: 0.1, duration_hr: 1, coupling: "good" }); assert.ok(close(r.RWL_lb, 51, 0.5)); });
test("NIOSH: LI = weight / RWL", () => { const r = computeNIOSHLifting({ ...nioshLiftingExample.inputs, weight_lb: 30 }); assert.ok(close(r.LI, 30 / r.RWL_lb, 0.001)); });
test("NIOSH: every coupling factor 0.9-1.0", () => { for (const k of Object.keys(NIOSH_COUPLING)) assert.ok(NIOSH_COUPLING[k] >= 0.9 && NIOSH_COUPLING[k] <= 1.0); });

// 164 Heat
test("Heat: 92F 70%RH heat index > 92", () => { const r = computeHeatStress({ T_F: 92, RH_percent: 70, wind_mph: 0, solar: false }); assert.ok(r.heat_index_F > 92); });
test("Heat: low temp returns ambient HI", () => { const r = computeHeatStress({ T_F: 70, RH_percent: 50, wind_mph: 0, solar: false }); assert.equal(r.heat_index_F, 70); });
test("Heat: WBGT positive", () => { const r = computeHeatStress({ T_F: 90, RH_percent: 60, wind_mph: 5, solar: true }); assert.ok(r.WBGT_F > 0); });
test("Heat: hotter WBGT triggers shorter work cycle", () => { const a = computeHeatStress({ T_F: 80, RH_percent: 30, wind_mph: 5, solar: false }); const b = computeHeatStress({ T_F: 100, RH_percent: 80, wind_mph: 5, solar: true }); assert.ok(b.work_min_per_hr < a.work_min_per_hr); });
test("Heat: T out of range errors", () => { const r = computeHeatStress({ T_F: 500, RH_percent: 50, wind_mph: 0, solar: false }); assert.ok(r.error); });
test("Heat: RH out of range errors", () => { const r = computeHeatStress({ T_F: 90, RH_percent: 200, wind_mph: 0, solar: false }); assert.ok(r.error); });
test("Heat: solar exposure increases WBGT", () => { const a = computeHeatStress({ T_F: 90, RH_percent: 60, wind_mph: 5, solar: false }); const b = computeHeatStress({ T_F: 90, RH_percent: 60, wind_mph: 5, solar: true }); assert.ok(b.WBGT_F > a.WBGT_F); });
test("Heat: humid > dry HI at same temp", () => { const a = computeHeatStress({ T_F: 95, RH_percent: 30, wind_mph: 0, solar: false }); const b = computeHeatStress({ T_F: 95, RH_percent: 80, wind_mph: 0, solar: false }); assert.ok(b.heat_index_F > a.heat_index_F); });
test("Heat: rest 0 below threshold", () => { const r = computeHeatStress({ T_F: 75, RH_percent: 40, wind_mph: 0, solar: false }); assert.equal(r.rest_min_per_hr, 0); });
test("Heat: 86F WBGT triggers 30/30", () => { const r = computeHeatStress({ T_F: 100, RH_percent: 60, wind_mph: 0, solar: false }); assert.ok(r.work_min_per_hr <= 45); });

// 165 Wind chill
test("Wind chill: 5F 25mph yields wind chill in [-20, -10]", () => { const r = computeWindChill(windChillExample.inputs); assert.ok(r.wind_chill_F >= -20 && r.wind_chill_F <= -10); });
test("Wind chill: T > 50 errors", () => { const r = computeWindChill({ T_F: 60, wind_mph: 10 }); assert.ok(r.error); });
test("Wind chill: wind < 3 mph returns ambient", () => { const r = computeWindChill({ T_F: 5, wind_mph: 1 }); assert.equal(r.wind_chill_F, 5); });
test("Wind chill: stronger wind colder WC", () => { const a = computeWindChill({ T_F: 5, wind_mph: 10 }); const b = computeWindChill({ T_F: 5, wind_mph: 30 }); assert.ok(b.wind_chill_F < a.wind_chill_F); });
test("Wind chill: very cold yields short frostbite time", () => { const r = computeWindChill({ T_F: -30, wind_mph: 30 }); assert.ok(r.frostbite_minutes <= 10); });
test("Wind chill: mild yields 30 min", () => { const r = computeWindChill({ T_F: 30, wind_mph: 10 }); assert.equal(r.frostbite_minutes, 30); });
test("Wind chill: 0 mph wind below 3 returns ambient with no frostbite", () => { const r = computeWindChill({ T_F: 30, wind_mph: 0 }); assert.equal(r.wind_chill_F, 30); });
test("Wind chill: WC < T when valid", () => { const r = computeWindChill({ T_F: 0, wind_mph: 20 }); assert.ok(r.wind_chill_F < 0); });
test("Wind chill: -45 to -55 ~ 5 min frostbite", () => { const r = computeWindChill({ T_F: -50, wind_mph: 30 }); assert.ok(r.frostbite_minutes >= 2 && r.frostbite_minutes <= 10); });
test("Wind chill: extreme yields 2 min frostbite", () => { const r = computeWindChill({ T_F: -60, wind_mph: 50 }); assert.equal(r.frostbite_minutes, 2); });

// 166 Ladder angle
test("Ladder: example placed at ~75.5 deg passes", () => { const r = computeLadderAngle(ladderAngleExample.inputs); assert.ok(Math.abs(r.set_angle_deg - 75.5) <= 3); assert.equal(r.pass, true); });
test("Ladder: zero working returns no pass", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 0 }); assert.equal(r.pass, false); });
test("Ladder: working > length errors", () => { const r = computeLadderAngle({ ladder_length_ft: 10, working_height_ft: 20 }); assert.ok(r.error); });
test("Ladder: zero length errors", () => { const r = computeLadderAngle({ ladder_length_ft: 0, working_height_ft: 5 }); assert.ok(r.error); });
test("Ladder: recommended base = working/4", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 16 }); assert.equal(r.base_distance_ft, 4); });
test("Ladder: too steep fails (working = ladder, 90 deg)", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 24 }); assert.equal(r.pass, false); assert.ok(close(r.set_angle_deg, 90, 0.001)); });
test("Ladder: 24 ft / 23 ft within 75.5 +/- 3", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 23 }); assert.ok(Math.abs(r.set_angle_deg - 75.5) <= 3); });
test("Ladder: angle between 0 and 90", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 12 }); assert.ok(r.set_angle_deg > 0 && r.set_angle_deg < 90); });
test("Ladder: shallow placement fails (working far below ladder length)", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 5 }); assert.equal(r.pass, false); });
test("Ladder: 16/24 leaned at ~41.8 deg fails", () => { const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 16 }); assert.equal(r.pass, false); });

// 167 Pulley MA
test("Pulley: example block_3 ~ 2.71", () => { const r = computePulleyMA(pulleyMAExample.inputs); assert.ok(close(r.actual_ma, 3 * Math.pow(0.95, 3), 0.001)); });
test("Pulley: fixed_1 has no losses", () => { const r = computePulleyMA({ rig: "fixed_1", efficiency: 0.5 }); assert.ok(close(r.actual_ma, 0.5, 0.001)); });
test("Pulley: unknown rig errors", () => { const r = computePulleyMA({ rig: "x", efficiency: 0.95 }); assert.ok(r.error); });
test("Pulley: bad efficiency errors", () => { const r = computePulleyMA({ rig: "block_2", efficiency: 1.2 }); assert.ok(r.error); });
test("Pulley: block_6 theoretical 6", () => { const r = computePulleyMA({ rig: "block_6", efficiency: 1 }); assert.equal(r.theoretical_ma, 6); });
test("Pulley: every rig positive", () => { for (const k of Object.keys(PULLEY_RIGS)) assert.ok(PULLEY_RIGS[k].ma > 0); });
test("Pulley: efficiency 1 = theoretical", () => { const r = computePulleyMA({ rig: "block_4", efficiency: 1 }); assert.ok(close(r.actual_ma, 4, 0.001)); });
test("Pulley: lower efficiency lower actual", () => { const a = computePulleyMA({ rig: "block_4", efficiency: 0.95 }); const b = computePulleyMA({ rig: "block_4", efficiency: 0.7 }); assert.ok(b.actual_ma < a.actual_ma); });
test("Pulley: movable_2 differs from block_2 in pulleys count", () => { assert.ok(PULLEY_RIGS.movable_2.pulleys < PULLEY_RIGS.block_2.pulleys); });
test("Pulley: zero efficiency errors", () => { const r = computePulleyMA({ rig: "block_2", efficiency: 0 }); assert.ok(r.error); });

// 168 Ramp
test("Ramp: 1:12 passes", () => { const r = computeRampSlope({ rise_in: 6, run_in: 72 }); assert.equal(r.pass_1_to_12, true); });
test("Ramp: too steep fails", () => { const r = computeRampSlope({ rise_in: 12, run_in: 60 }); assert.equal(r.pass_1_to_12, false); });
test("Ramp: percent = rise/run*100", () => { const r = computeRampSlope({ rise_in: 8, run_in: 100 }); assert.equal(r.percent, 8); });
test("Ramp: zero run errors", () => { const r = computeRampSlope({ rise_in: 6, run_in: 0 }); assert.ok(r.error); });
test("Ramp: very gentle passes", () => { const r = computeRampSlope({ rise_in: 1, run_in: 100 }); assert.equal(r.pass_1_to_12, true); });
test("Ramp: ratio includes :1", () => { const r = computeRampSlope({ rise_in: 6, run_in: 72 }); assert.match(r.ratio, /:1$/); });
test("Ramp: zero rise errors (was an Infinity:1 ratio render leak)", () => { const r = computeRampSlope({ rise_in: 0, run_in: 100 }); assert.ok(r.error); });
test("Ramp: 1:12 boundary passes", () => { const r = computeRampSlope({ rise_in: 1, run_in: 12 }); assert.equal(r.pass_1_to_12, true); });
test("Ramp: 1:11 fails", () => { const r = computeRampSlope({ rise_in: 1, run_in: 11 }); assert.equal(r.pass_1_to_12, false); });
test("Ramp: percent positive for valid rise", () => { const r = computeRampSlope({ rise_in: 4, run_in: 50 }); assert.ok(r.percent > 0); });

// 169 Rainwater
test("Rainwater: example monthly returns annual_gal positive", () => { const r = computeRainwaterYield(rainwaterYieldExample.inputs); assert.ok(r.annual_gal > 0); assert.ok(r.monthly_gal.length === 12); });
test("Rainwater: annual entry uses single value", () => { const r = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 36, efficiency: 0.62 }); assert.ok(close(r.annual_gal, 1000 * 36 * 0.6233 * 0.62, 0.5)); });
test("Rainwater: zero area errors", () => { const r = computeRainwaterYield({ catchment_ft2: 0, annual_in: 30, efficiency: 0.62 }); assert.ok(r.error); });
test("Rainwater: linear in area", () => { const a = computeRainwaterYield({ catchment_ft2: 500, annual_in: 30, efficiency: 0.62 }); const b = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 30, efficiency: 0.62 }); assert.ok(close(b.annual_gal / a.annual_gal, 2, 0.001)); });
test("Rainwater: linear in rainfall", () => { const a = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 20, efficiency: 0.62 }); const b = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 40, efficiency: 0.62 }); assert.ok(close(b.annual_gal / a.annual_gal, 2, 0.001)); });
test("Rainwater: monthly array sums to annual", () => { const r = computeRainwaterYield({ catchment_ft2: 1500, monthly_in: [1, 2, 3], efficiency: 0.62 }); assert.ok(close(r.monthly_gal[0] + r.monthly_gal[1] + r.monthly_gal[2], r.annual_gal, 0.5)); });
test("Rainwater: efficiency 1 vs 0.62 ratio", () => { const a = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 30, efficiency: 1.0 }); const b = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 30, efficiency: 0.62 }); assert.ok(close(a.annual_gal / b.annual_gal, 1 / 0.62, 0.01)); });
test("Rainwater: zero annual returns 0", () => { const r = computeRainwaterYield({ catchment_ft2: 1000, annual_in: 0, efficiency: 0.62 }); assert.equal(r.annual_gal, 0); });
test("Rainwater: negative annual errors", () => { const r = computeRainwaterYield({ catchment_ft2: 1000, annual_in: -1, efficiency: 0.62 }); assert.ok(r.error); });
test("Rainwater: empty monthly returns 0", () => { const r = computeRainwaterYield({ catchment_ft2: 1000, monthly_in: [], efficiency: 0.62 }); assert.equal(r.annual_gal, 0); });

// 171 Timesheet
test("Timesheet: example yields 8 hours", () => { const r = computeTimesheet(timesheetExample.inputs); assert.equal(r.total_hours, 8); });
test("Timesheet: no jobs errors", () => { const r = computeTimesheet({ jobs: [], regular_rate: 30 }); assert.ok(r.error); });
test("Timesheet: end < start errors", () => { const r = computeTimesheet({ jobs: [{ start_hr: 13, end_hr: 8, lunch_min: 0, miles: 0 }], regular_rate: 30 }); assert.ok(r.error); });
test("Timesheet: lunch deducted", () => { const r = computeTimesheet({ jobs: [{ start_hr: 8, end_hr: 17, lunch_min: 60, miles: 0 }], regular_rate: 0 }); assert.equal(r.total_hours, 8); });
test("Timesheet: gross pay regular only when under 40 hr", () => { const r = computeTimesheet({ jobs: [{ start_hr: 8, end_hr: 16, lunch_min: 0, miles: 0 }], regular_rate: 25 }); assert.equal(r.gross_pay, 8 * 25); });
test("Timesheet: overtime kicks in past 40", () => { const r = computeTimesheet({ jobs: [{ start_hr: 0, end_hr: 50, lunch_min: 0, miles: 0 }], regular_rate: 20 }); assert.ok(r.overtime_hours > 0); });
test("Timesheet: miles reimbursed at IRS rate", () => { const r = computeTimesheet({ jobs: [{ start_hr: 8, end_hr: 16, lunch_min: 0, miles: 100 }], regular_rate: 25 }); assert.ok(r.reimbursable > 0); });
test("Timesheet: jobs accumulated", () => { const r = computeTimesheet({ jobs: [{ start_hr: 8, end_hr: 12, lunch_min: 0, miles: 0 }, { start_hr: 13, end_hr: 17, lunch_min: 0, miles: 0 }], regular_rate: 25 }); assert.equal(r.total_hours, 8); });
test("Timesheet: zero rate yields zero pay", () => { const r = computeTimesheet({ jobs: [{ start_hr: 8, end_hr: 12, lunch_min: 0, miles: 0 }], regular_rate: 0 }); assert.equal(r.gross_pay, 0); });
test("Timesheet: total miles aggregated", () => { const r = computeTimesheet({ jobs: [{ start_hr: 8, end_hr: 12, lunch_min: 0, miles: 10 }, { start_hr: 13, end_hr: 17, lunch_min: 0, miles: 5 }], regular_rate: 25 }); assert.equal(r.total_miles, 15); });

// 173 Vehicle load
test("Vehicle: example yields balanced load", () => { const r = computeVehicleLoad(vehicleLoadExample.inputs); assert.ok(r.front_axle_lb > 0); assert.ok(r.rear_axle_lb > 0); });
test("Vehicle: payload all forward shifts to front-only payload", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 1000, payload_position_from_cab_in: 0, gvwr_lb: null, front_gawr_lb: null, rear_gawr_lb: null, curb_front_lb: 0, curb_rear_lb: 0 }); assert.equal(r.front_axle_lb, 1000); assert.equal(r.rear_axle_lb, 0); });
test("Vehicle: payload at axle shifts all rear", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 1000, payload_position_from_cab_in: 140, gvwr_lb: null, front_gawr_lb: null, rear_gawr_lb: null, curb_front_lb: 0, curb_rear_lb: 0 }); assert.ok(close(r.rear_axle_lb, 1000, 0.001)); });
test("Vehicle: zero wheelbase errors", () => { const r = computeVehicleLoad({ wheelbase_in: 0, payload_lb: 1000, payload_position_from_cab_in: 70 }); assert.ok(r.error); });
test("Vehicle: negative payload errors", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: -1, payload_position_from_cab_in: 70 }); assert.ok(r.error); });
test("Vehicle: GVWR exceeded flagged", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 8000, payload_position_from_cab_in: 70, gvwr_lb: 9000, front_gawr_lb: null, rear_gawr_lb: null, curb_front_lb: 3000, curb_rear_lb: 2000 }); assert.equal(r.flags.over_gvwr, true); });
test("Vehicle: rear GAWR exceeded flagged", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 5000, payload_position_from_cab_in: 130, gvwr_lb: null, front_gawr_lb: null, rear_gawr_lb: 4000, curb_front_lb: 0, curb_rear_lb: 1000 }); assert.equal(r.flags.over_rear_gawr, true); });
test("Vehicle: gross = front + rear", () => { const r = computeVehicleLoad(vehicleLoadExample.inputs); assert.ok(close(r.gross_lb, r.front_axle_lb + r.rear_axle_lb, 0.001)); });
test("Vehicle: payload + curb totals match gross", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 1000, payload_position_from_cab_in: 70, gvwr_lb: null, front_gawr_lb: null, rear_gawr_lb: null, curb_front_lb: 3000, curb_rear_lb: 2000 }); assert.equal(r.gross_lb, 6000); });
test("Vehicle: no flags when under all limits", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 100, payload_position_from_cab_in: 70, gvwr_lb: 9500, front_gawr_lb: 4500, rear_gawr_lb: 6200, curb_front_lb: 3200, curb_rear_lb: 2400 }); assert.equal(r.flags.over_gvwr, false); assert.equal(r.flags.over_front_gawr, false); assert.equal(r.flags.over_rear_gawr, false); });
test("Vehicle: front + rear payload = total payload", () => { const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 1500, payload_position_from_cab_in: 84, gvwr_lb: null, front_gawr_lb: null, rear_gawr_lb: null, curb_front_lb: 0, curb_rear_lb: 0 }); assert.ok(close(r.front_axle_lb + r.rear_axle_lb, 1500, 0.001)); });
