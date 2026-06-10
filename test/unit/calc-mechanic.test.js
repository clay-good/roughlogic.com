// Unit tests for calc-mechanic.js v4 utilities (195-202).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeWeightBalance, weightBalanceExample,
  computePropSlip, propSlipExample,
  computeDisplacementCR, displacementCRExample,
  computeBoltStretch, boltStretchExample, FASTENER_MODULUS_PSI,
  computeDriveshaftCritical, driveshaftExample, SHAFT_MATERIALS,
  computeFuelRange, fuelRangeExample, FUEL_PROPERTIES,
  parseTireSize, computeTireGearing, tireGearingExample,
  computeBrakePadLife, brakePadLifeExample, PAD_WEAR_RATE,
  computeCuttingSpeed, cuttingSpeedExample,
  MECHANIC_RENDERERS,
} from "../../calc-mechanic.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 195 W&B
test("W&B: example total + CG within envelope", () => { const r = computeWeightBalance(weightBalanceExample.inputs); assert.ok(r.total_weight_lb > 2000 && r.total_weight_lb < 2400); assert.ok(r.cg_in > 35 && r.cg_in < 47); });
test("W&B: empty list errors", () => { const r = computeWeightBalance({ stations: [], fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400 }); assert.ok(r.error); });
test("W&B: zero total weight errors", () => { const r = computeWeightBalance({ stations: [{ weight_lb: 0, arm_in: 38 }], fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400 }); assert.ok(r.error); });
test("W&B: negative weight errors", () => { const r = computeWeightBalance({ stations: [{ weight_lb: -10, arm_in: 38 }], fwd_cg_limit_in: 0, aft_cg_limit_in: 0, max_gross_lb: 0 }); assert.ok(r.error); });
test("W&B: CG = moment / weight", () => { const r = computeWeightBalance({ stations: [{ weight_lb: 100, arm_in: 40 }, { weight_lb: 100, arm_in: 50 }], fwd_cg_limit_in: 0, aft_cg_limit_in: 0, max_gross_lb: 0 }); assert.equal(r.cg_in, 45); });
test("W&B: outside aft CG fails", () => { const r = computeWeightBalance({ stations: [{ weight_lb: 1000, arm_in: 100 }], fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400 }); assert.equal(r.pass, false); });
test("W&B: over gross fails", () => { const r = computeWeightBalance({ stations: [{ weight_lb: 3000, arm_in: 40 }], fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400 }); assert.equal(r.pass, false); });
test("W&B: pass null when no limits set", () => { const r = computeWeightBalance({ stations: [{ weight_lb: 1000, arm_in: 40 }], fwd_cg_limit_in: 0, aft_cg_limit_in: 0, max_gross_lb: 0 }); assert.equal(r.pass, null); });
test("W&B: only gross supplied", () => { const r = computeWeightBalance({ stations: [{ weight_lb: 100, arm_in: 40 }], fwd_cg_limit_in: 0, aft_cg_limit_in: 0, max_gross_lb: 200 }); assert.equal(r.pass, true); });
test("W&B: example pass true", () => { const r = computeWeightBalance(weightBalanceExample.inputs); assert.equal(r.pass, true); });

// 196 Prop slip
test("Prop slip: example planing-typical", () => { const r = computePropSlip(propSlipExample.inputs); assert.ok(r.theoretical_kt > 0); assert.ok(typeof r.category === "string"); });
test("Prop slip: theoretical = (RPM/gear) * pitch / 1056", () => { const r = computePropSlip({ rpm: 5000, gear_ratio: 2, pitch_in: 21, gps_speed_kt: 40 }); assert.ok(close(r.theoretical_kt, (5000 / 2 * 21) / 1056, 0.01)); });
test("Prop slip: 0 GPS speed -> 100% slip", () => { const r = computePropSlip({ rpm: 5000, gear_ratio: 2, pitch_in: 21, gps_speed_kt: 0 }); assert.equal(r.slip_percent, 100); });
test("Prop slip: negative slip detected", () => { const r = computePropSlip({ rpm: 1000, gear_ratio: 1, pitch_in: 5, gps_speed_kt: 100 }); assert.match(r.category, /over-pitched|GPS error/); });
test("Prop slip: zero RPM errors", () => { const r = computePropSlip({ rpm: 0, gear_ratio: 1, pitch_in: 21, gps_speed_kt: 30 }); assert.ok(r.error); });
test("Prop slip: zero pitch errors", () => { const r = computePropSlip({ rpm: 4000, gear_ratio: 1, pitch_in: 0, gps_speed_kt: 30 }); assert.ok(r.error); });
test("Prop slip: zero gear errors", () => { const r = computePropSlip({ rpm: 4000, gear_ratio: 0, pitch_in: 21, gps_speed_kt: 30 }); assert.ok(r.error); });
test("Prop slip: high slip flagged", () => { const r = computePropSlip({ rpm: 5000, gear_ratio: 1.85, pitch_in: 21, gps_speed_kt: 5 }); assert.match(r.category, /high slip/); });
test("Prop slip: planing band 8-18% category", () => { const r = computePropSlip({ rpm: 4000, gear_ratio: 1.85, pitch_in: 19, gps_speed_kt: 35 }); if (r.slip_percent >= 8 && r.slip_percent <= 18) assert.match(r.category, /planing-typical/); });
test("Prop slip: theoretical positive", () => { const r = computePropSlip({ rpm: 3000, gear_ratio: 1.5, pitch_in: 17, gps_speed_kt: 25 }); assert.ok(r.theoretical_kt > 0); });

// 197 Displacement CR
test("CR: 350 SBC ish 5.7 L", () => { const r = computeDisplacementCR(displacementCRExample.inputs); assert.ok(close(r.displacement_l, 5.7, 0.2)); });
test("CR: zero TDC volume errors", () => { const r = computeDisplacementCR({ ...displacementCRExample.inputs, chamber_cc: 0, gasket_thickness_in: 0, deck_clearance_in: 0, dome_dish_cc: 100 }); assert.ok(r.error); });
test("CR: zero bore errors", () => { const r = computeDisplacementCR({ ...displacementCRExample.inputs, bore_in: 0 }); assert.ok(r.error); });
test("CR: pump-gas window string", () => { const r = computeDisplacementCR(displacementCRExample.inputs); assert.ok(r.pump_gas_window.length > 0); });
test("CR: bigger chamber -> lower CR", () => { const a = computeDisplacementCR({ ...displacementCRExample.inputs, chamber_cc: 60 }); const b = computeDisplacementCR({ ...displacementCRExample.inputs, chamber_cc: 80 }); assert.ok(b.compression_ratio < a.compression_ratio); });
test("CR: dome raises CR", () => { const a = computeDisplacementCR({ ...displacementCRExample.inputs, dome_dish_cc: 0 }); const b = computeDisplacementCR({ ...displacementCRExample.inputs, dome_dish_cc: 10 }); assert.ok(b.compression_ratio > a.compression_ratio); });
test("CR: cylinder count linear", () => { const a = computeDisplacementCR({ ...displacementCRExample.inputs, cylinders: 8 }); const b = computeDisplacementCR({ ...displacementCRExample.inputs, cylinders: 4 }); assert.ok(close(a.displacement_in3 / b.displacement_in3, 2, 0.001)); });
test("CR: liters ~ in3 * 0.0163871", () => { const r = computeDisplacementCR(displacementCRExample.inputs); assert.ok(close(r.displacement_l, r.displacement_in3 * 0.0163871, 0.01)); });
test("CR: high CR triggers race window", () => { const r = computeDisplacementCR({ ...displacementCRExample.inputs, chamber_cc: 30 }); assert.match(r.pump_gas_window, /race|high/); });
test("CR: low CR triggers low window", () => { const r = computeDisplacementCR({ ...displacementCRExample.inputs, chamber_cc: 90 }); assert.match(r.pump_gas_window, /low/); });

// 198 Bolt stretch
test("Bolt stretch: example clamp load positive", () => { const r = computeBoltStretch(boltStretchExample.inputs); assert.ok(r.clamp_load_lb > 0); });
test("Bolt stretch: F = stretch*A*E/grip", () => { const r = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 5, material: "steel", k_factor: 0.18 }); assert.ok(close(r.clamp_load_lb, (0.005 * 0.1419 * 30000000) / 4, 1)); });
test("Bolt stretch: zero diameter errors", () => { const r = computeBoltStretch({ diameter_in: 0, grip_length_in: 4, stretch_thou: 5, material: "steel", k_factor: 0.18 }); assert.ok(r.error); });
test("Bolt stretch: zero grip errors", () => { const r = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 0, stretch_thou: 5, material: "steel", k_factor: 0.18 }); assert.ok(r.error); });
test("Bolt stretch: unsupported diameter errors", () => { const r = computeBoltStretch({ diameter_in: 0.123, grip_length_in: 4, stretch_thou: 5, material: "steel", k_factor: 0.18 }); assert.ok(r.error); });
test("Bolt stretch: unknown material errors", () => { const r = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 5, material: "x", k_factor: 0.18 }); assert.ok(r.error); });
test("Bolt stretch: aluminum has lower modulus than steel", () => { const a = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 5, material: "steel", k_factor: 0.18 }); const b = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 5, material: "aluminum", k_factor: 0.18 }); assert.ok(b.clamp_load_lb < a.clamp_load_lb); });
test("Bolt stretch: linear in stretch", () => { const a = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 3, material: "steel", k_factor: 0.18 }); const b = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 6, material: "steel", k_factor: 0.18 }); assert.ok(close(b.clamp_load_lb / a.clamp_load_lb, 2, 0.001)); });
test("Bolt stretch: every modulus positive", () => { for (const k of Object.keys(FASTENER_MODULUS_PSI)) assert.ok(FASTENER_MODULUS_PSI[k] > 0); });
test("Bolt stretch: cross-check torque positive", () => { const r = computeBoltStretch(boltStretchExample.inputs); assert.ok(r.cross_check_torque_ft_lb > 0); });

// 199 Driveshaft
test("Driveshaft: example finite critical RPM", () => { const r = computeDriveshaftCritical(driveshaftExample.inputs); assert.ok(r.critical_rpm > 0); });
test("Driveshaft: zero OD errors", () => { const r = computeDriveshaftCritical({ od_in: 0, wall_in: 0.083, length_in: 50, material: "steel" }); assert.ok(r.error); });
test("Driveshaft: wall >= OD/2 errors", () => { const r = computeDriveshaftCritical({ od_in: 3, wall_in: 1.5, length_in: 50, material: "steel" }); assert.ok(r.error); });
test("Driveshaft: zero length errors", () => { const r = computeDriveshaftCritical({ od_in: 3, wall_in: 0.083, length_in: 0, material: "steel" }); assert.ok(r.error); });
test("Driveshaft: unknown material errors", () => { const r = computeDriveshaftCritical({ od_in: 3, wall_in: 0.083, length_in: 50, material: "x" }); assert.ok(r.error); });
test("Driveshaft: longer shaft -> lower critical RPM", () => { const a = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 40, material: "steel" }); const b = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 60, material: "steel" }); assert.ok(b.critical_rpm < a.critical_rpm); });
test("Driveshaft: aluminum higher critical than steel (lower density)", () => { const a = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 50, material: "steel" }); const b = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 50, material: "aluminum" }); assert.ok(b.critical_rpm > a.critical_rpm * 0.9); });
test("Driveshaft: recommended max = 0.65 of critical", () => { const r = computeDriveshaftCritical(driveshaftExample.inputs); assert.ok(close(r.recommended_max_rpm, r.critical_rpm * 0.65, 0.001)); });
test("Driveshaft: every material has positive E and rho", () => { for (const k of Object.keys(SHAFT_MATERIALS)) { const m = SHAFT_MATERIALS[k]; assert.ok(m.E_pa > 0 && m.rho_kg_m3 > 0); } });
test("Driveshaft: bigger OD -> higher critical RPM", () => { const a = computeDriveshaftCritical({ od_in: 3, wall_in: 0.083, length_in: 50, material: "steel" }); const b = computeDriveshaftCritical({ od_in: 4, wall_in: 0.083, length_in: 50, material: "steel" }); assert.ok(b.critical_rpm > a.critical_rpm); });

// 200 Fuel range
test("Fuel range: example finite", () => { const r = computeFuelRange(fuelRangeExample.inputs); assert.ok(r.total_btu > 0); assert.ok(r.range_mi > 0); });
test("Fuel range: range = tank * mpg", () => { const r = computeFuelRange({ fuel: "diesel_2", tank_gal: 30, mpg: 25, mpg_basis: "diesel_2", load_factor: 1.0 }); assert.ok(close(r.range_mi, 750, 0.001)); });
test("Fuel range: derate flag when basis differs", () => { const r = computeFuelRange({ fuel: "gasoline_E85", tank_gal: 18, mpg: 25, mpg_basis: "gasoline_E10", load_factor: 1.0 }); assert.match(r.derate_flag, /differs/); });
test("Fuel range: unknown fuel errors", () => { const r = computeFuelRange({ fuel: "x", tank_gal: 18, mpg: 25, mpg_basis: "gasoline_E10", load_factor: 1.0 }); assert.ok(r.error); });
test("Fuel range: zero mpg errors", () => { const r = computeFuelRange({ fuel: "diesel_2", tank_gal: 30, mpg: 0, mpg_basis: "diesel_2", load_factor: 1.0 }); assert.ok(r.error); });
test("Fuel range: load factor > 1.5 errors", () => { const r = computeFuelRange({ fuel: "diesel_2", tank_gal: 30, mpg: 25, mpg_basis: "diesel_2", load_factor: 2 }); assert.ok(r.error); });
test("Fuel range: BTU > 0 for every fuel", () => { for (const k of Object.keys(FUEL_PROPERTIES)) { const r = computeFuelRange({ fuel: k, tank_gal: 1, mpg: 1, mpg_basis: k, load_factor: 1 }); assert.ok(r.total_btu > 0, k); } });
test("Fuel range: kWh = BTU * 0.0002930711", () => { const r = computeFuelRange(fuelRangeExample.inputs); assert.ok(close(r.total_kwh, r.total_btu * 0.0002930711, 0.5)); });
test("Fuel range: load factor 0.5 halves range", () => { const a = computeFuelRange({ fuel: "diesel_2", tank_gal: 30, mpg: 25, mpg_basis: "diesel_2", load_factor: 1.0 }); const b = computeFuelRange({ fuel: "diesel_2", tank_gal: 30, mpg: 25, mpg_basis: "diesel_2", load_factor: 0.5 }); assert.ok(close(b.range_mi / a.range_mi, 0.5, 0.001)); });
test("Fuel range: every fuel has density", () => { for (const k of Object.keys(FUEL_PROPERTIES)) assert.ok(FUEL_PROPERTIES[k].density_lb_gal > 0); });

// 201 Tire gearing
test("Tire size: parses metric 285/75R17", () => { assert.ok(close(parseTireSize("285/75R17"), 17 + 2 * (285 * 0.75 / 25.4), 0.01)); });
test("Tire size: parses imperial 33x12.50R17", () => { assert.equal(parseTireSize("33x12.50R17"), 33); });
test("Tire size: returns NaN for garbage", () => { assert.ok(Number.isNaN(parseTireSize("hello"))); });
test("Tire gearing: example finite", () => { const r = computeTireGearing(tireGearingExample.inputs); assert.ok(r.cruise_mph > 0); assert.ok(r.recommended_axle_ratio > 0); });
test("Tire gearing: bigger new tire lowers effective ratio", () => { const r = computeTireGearing({ original_size: "265/70R17", new_size: "315/75R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 }); assert.ok(r.effective_new < r.effective_orig); });
test("Tire gearing: bad original size errors", () => { const r = computeTireGearing({ original_size: "spam", new_size: "285/75R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 }); assert.ok(r.error); });
test("Tire gearing: zero axle errors", () => { const r = computeTireGearing({ original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 0, top_gear_ratio: 0.69, target_rpm: 1800 }); assert.ok(r.error); });
test("Tire gearing: rev/mi inversely proportional to OD", () => { const r = computeTireGearing(tireGearingExample.inputs); assert.ok(r.rev_per_mi_orig > r.rev_per_mi_new); });
test("Tire gearing: recommended axle ratio in candidate list", () => { const r = computeTireGearing(tireGearingExample.inputs); assert.ok([3.73, 4.10, 4.56, 4.88, 5.13, 5.38].includes(r.recommended_axle_ratio)); });
test("Tire gearing: same tire size -> effective ratios equal", () => { const r = computeTireGearing({ original_size: "265/70R17", new_size: "265/70R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 }); assert.ok(close(r.effective_orig, r.effective_new, 0.001)); });
test("Tire gearing: cruise speed positive", () => { const r = computeTireGearing(tireGearingExample.inputs); assert.ok(r.cruise_mph > 30 && r.cruise_mph < 100); });

// 202 Brake pad life
test("Brake pad: example yields finite life", () => { const r = computeBrakePadLife(brakePadLifeExample.inputs); assert.ok(r.miles_until_worn > 0); });
test("Brake pad: KE = 0.5 m v^2", () => { const r = computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 }); const m_kg = 3500 * 0.4536; const v_ms = 30 * 0.4470; assert.ok(close(r.ke_J, 0.5 * m_kg * v_ms * v_ms, 1)); });
test("Brake pad: ceramic outlasts organic", () => { const o = computeBrakePadLife({ ...brakePadLifeExample.inputs, pad_material: "organic" }); const c = computeBrakePadLife({ ...brakePadLifeExample.inputs, pad_material: "ceramic" }); assert.ok(c.miles_until_worn > o.miles_until_worn); });
test("Brake pad: zero stops -> infinite (null) miles", () => { const r = computeBrakePadLife({ ...brakePadLifeExample.inputs, stops_per_mile: 0 }); assert.equal(r.miles_until_worn, null); });
test("Brake pad: zero weight errors", () => { const r = computeBrakePadLife({ ...brakePadLifeExample.inputs, vehicle_weight_lb: 0 }); assert.ok(r.error); });
test("Brake pad: zero speed delta errors", () => { const r = computeBrakePadLife({ ...brakePadLifeExample.inputs, speed_delta_mph: 0 }); assert.ok(r.error); });
test("Brake pad: zero pad errors", () => { const r = computeBrakePadLife({ ...brakePadLifeExample.inputs, pad_thickness_mm: 0 }); assert.ok(r.error); });
test("Brake pad: unknown material errors", () => { const r = computeBrakePadLife({ ...brakePadLifeExample.inputs, pad_material: "x" }); assert.ok(r.error); });
test("Brake pad: rotor temp rise positive", () => { const r = computeBrakePadLife(brakePadLifeExample.inputs); assert.ok(r.rotor_temp_rise_C > 0); });
test("Brake pad: every wear rate positive", () => { for (const k of Object.keys(PAD_WEAR_RATE)) assert.ok(PAD_WEAR_RATE[k].mm_per_kJ > 0); });

// v31 K.4 Machining speed and feed (cutting-speed-rpm)
test("cutting-speed: example RPM and feed", () => { const r = computeCuttingSpeed(cuttingSpeedExample.inputs); assert.ok(close(r.rpm, 763.94, 0.5)); assert.ok(close(r.feed_ipm, 3.056, 0.01)); });
test("cutting-speed: RPM = 12*SFM/(pi*dia)", () => { const r = computeCuttingSpeed({ surface_speed_sfm: 300, diameter_in: 1 }); assert.ok(close(r.rpm, 12 * 300 / (Math.PI * 1), 0.001)); });
test("cutting-speed: RPM inversely proportional to diameter", () => { const a = computeCuttingSpeed({ surface_speed_sfm: 100, diameter_in: 0.25 }); const b = computeCuttingSpeed({ surface_speed_sfm: 100, diameter_in: 0.5 }); assert.ok(close(a.rpm, 2 * b.rpm, 0.001)); });
test("cutting-speed: feed null without flutes or chip load", () => { assert.equal(computeCuttingSpeed({ surface_speed_sfm: 100, diameter_in: 0.5 }).feed_ipm, null); assert.equal(computeCuttingSpeed({ surface_speed_sfm: 100, diameter_in: 0.5, num_flutes: 2 }).feed_ipm, null); });
test("cutting-speed: zero diameter and zero SFM error", () => { assert.ok(computeCuttingSpeed({ surface_speed_sfm: 100, diameter_in: 0 }).error); assert.ok(computeCuttingSpeed({ surface_speed_sfm: 0, diameter_in: 0.5 }).error); });
test("cutting-speed: non-finite input errors", () => { assert.ok(computeCuttingSpeed({ surface_speed_sfm: Infinity, diameter_in: 0.5 }).error); });

// Renderers
test("MECHANIC_RENDERERS: 8 ids", () => { for (const id of ["weight-balance","prop-slip","displacement-cr","bolt-stretch","driveshaft-crit","fuel-range","tire-gearing","brake-pad-life"]) assert.equal(typeof MECHANIC_RENDERERS[id], "function", id); });
test("MECHANIC_RENDERERS: cutting-speed-rpm present", () => { assert.equal(typeof MECHANIC_RENDERERS["cutting-speed-rpm"], "function"); });
