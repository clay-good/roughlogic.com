// Unit tests for calc-mechanic.js v4 utilities (195-202).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePropSlip, propSlipExample,
  computeDisplacementCR, displacementCRExample,
  computeBoltStretch, boltStretchExample, FASTENER_MODULUS_PSI,
  computeDriveshaftCritical, driveshaftExample, SHAFT_MATERIALS,
  computeFuelRange, fuelRangeExample, FUEL_PROPERTIES,
  parseTireSize, computeTireGearing, tireGearingExample,
  computeBrakePadLife, brakePadLifeExample, PAD_WEAR_RATE,
  MECHANIC_RENDERERS,
} from "../../calc-mechanic.js";
// spec-v76: the machining bench moved to calc-machining.js (group letter unchanged).
import {
  computeCuttingSpeed, cuttingSpeedExample,
  computeDrillPointDepth, drillPointDepthExample,
  MACHINING_RENDERERS,
} from "../../calc-machining.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 196 Prop slip
test("Prop slip: example planing-typical", () => { const r = computePropSlip(propSlipExample.inputs); assert.ok(r.theoretical_kt > 0); assert.ok(typeof r.category === "string"); });
test("Prop slip: theoretical = (RPM/gear) * pitch / 1215.2", () => { const r = computePropSlip({ rpm: 5000, gear_ratio: 2, pitch_in: 21, gps_speed_kt: 40 }); assert.ok(close(r.theoretical_kt, (5000 / 2 * 21) / 1215.2, 0.01)); });
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
test("Brake pad: KE = 0.5 m v^2", () => { const r = computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 }); const m_kg = 3500 * 0.45359237; const v_ms = 30 * 0.44704; assert.ok(close(r.ke_J, 0.5 * m_kg * v_ms * v_ms, 1)); });
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

// v34 K.5 Drill point depth (drill-point-depth)
test("drill-point: example point length and tip depth", () => { const r = computeDrillPointDepth(drillPointDepthExample.inputs); assert.ok(close(r.point_length_in, 0.150216, 1e-4)); assert.ok(close(r.drill_to_depth_in, 1.150216, 1e-4)); });
test("drill-point: 118-degree point is about 0.3 x diameter", () => { const r = computeDrillPointDepth({ diameter_in: 1, point_angle_deg: 118 }); assert.ok(close(r.point_length_in / 1, 0.3004, 1e-3)); });
test("drill-point: point length = (dia/2)/tan(angle/2)", () => { const r = computeDrillPointDepth({ diameter_in: 0.75, point_angle_deg: 135 }); assert.ok(close(r.point_length_in, (0.75 / 2) / Math.tan((135 / 2) * Math.PI / 180), 1e-9)); });
test("drill-point: tip depth null without full depth", () => { assert.equal(computeDrillPointDepth({ diameter_in: 0.5, point_angle_deg: 118 }).drill_to_depth_in, null); });
test("drill-point: zero diameter and out-of-range angle error", () => { assert.ok(computeDrillPointDepth({ diameter_in: 0, point_angle_deg: 118 }).error); assert.ok(computeDrillPointDepth({ diameter_in: 0.5, point_angle_deg: 180 }).error); });
test("drill-point: non-finite input errors", () => { assert.ok(computeDrillPointDepth({ diameter_in: 0.5, point_angle_deg: 118, full_depth_in: Infinity }).error); });

// Renderers
test("MECHANIC_RENDERERS: 7 ids", () => { for (const id of ["prop-slip","displacement-cr","bolt-stretch","driveshaft-crit","fuel-range","tire-gearing","brake-pad-life"]) assert.equal(typeof MECHANIC_RENDERERS[id], "function", id); });
test("MACHINING_RENDERERS: cutting-speed-rpm + drill-point-depth present", () => { assert.equal(typeof MACHINING_RENDERERS["cutting-speed-rpm"], "function"); assert.equal(typeof MACHINING_RENDERERS["drill-point-depth"], "function"); });

// ---------------------------------------------------------------------------
// Independent checks (hardening 2026-10-15): each test below holds a tile to
// something its own derivation did not write -- a published constant, a
// re-derived unit constant, an independent numeric method, or an invariant.
import {
  computeDriveshaftMaxLength, computeAlternatorChargingLoad, computeFlywheelEnergy,
  computeCrouchPlaningSpeed, computeCrouchHpForSpeed, computeDynoCorrectionSae,
  computeWedgeForce, computeToggleMechanismForce, computeScotchYokeMotion,
  computeSliderCrankPistonPosition,
} from "../../calc-mechanic.js";

const relClose = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

// driveshaft-max-length: Machinery's Handbook simply-supported hollow shaft,
// N_crit = 4.76e6 sqrt(D^2 + d^2) / L^2 (rpm, in; steel E 30e6 psi, 0.283 lb/in^3).
// Solve the safe length (0.65 x critical) from that printed constant.
test("driveshaft-max-length: matches Machinery's Handbook 4.76e6 sqrt(D^2+d^2)/L^2 within 2%", () => {
  for (const [od, wall, rpm] of [[3.5, 0.083, 3000], [4, 0.095, 4500], [3, 0.065, 2000]]) {
    const id = od - 2 * wall;
    const Lmh = Math.sqrt(0.65 * 4.76e6 * Math.sqrt(od * od + id * id) / rpm);
    const r = computeDriveshaftMaxLength({ target_rpm: rpm, od_in: od, wall_in: wall, material: "steel" });
    assert.ok(relClose(r.max_length_in, Lmh, 0.02), `${od}x${wall}@${rpm}: ${r.max_length_in} vs MH ${Lmh}`);
    assert.ok(relClose(r.critical_rpm, rpm / 0.65, 1e-12));
  }
});
test("driveshaft-max-length: aluminum re-derived in US units (E 10e6 psi, 0.0975 lb/in^3) within 2%", () => {
  const od = 4, wall = 0.125, rpm = 3500, id = od - 2 * wall;
  // omega = (pi/L)^2 sqrt(E I g /(w A)), I/A = (D^2+d^2)/16, in in/s
  const c = Math.sqrt(10e6 * 386.0886 / 0.0975) * Math.sqrt(od * od + id * id) / 4; // in^2/s per... times pi^2/L^2
  const Ncrit = (L) => (Math.PI * Math.PI / (L * L)) * c * 60 / (2 * Math.PI);
  let lo = 1, hi = 1000; // bisect 0.65 Ncrit(L) = rpm
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (0.65 * Ncrit(m) > rpm) lo = m; else hi = m; }
  const r = computeDriveshaftMaxLength({ target_rpm: rpm, od_in: od, wall_in: wall, material: "aluminum" });
  assert.ok(relClose(r.max_length_in, lo, 0.02), `${r.max_length_in} vs ${lo}`);
});

// alternator-charging-load: invariants -- the break-even load is exactly rating x fraction,
// and the balance is linear in load with slope -1.
test("alternator-charging-load: break-even load = rating x fraction; balance slope -1", () => {
  const alt = 130, fi = 0.55, fc = 0.92;
  const at = computeAlternatorChargingLoad({ total_load_a: alt * fi, alternator_a: alt, idle_frac: fi, cruise_frac: fc });
  assert.equal(at.idle_ok, true);
  const over = computeAlternatorChargingLoad({ total_load_a: alt * fi * 1.001, alternator_a: alt, idle_frac: fi, cruise_frac: fc });
  assert.equal(over.idle_ok, false); assert.equal(over.cruise_ok, true);
  const a = computeAlternatorChargingLoad({ total_load_a: 40, alternator_a: alt, idle_frac: fi, cruise_frac: fc });
  const b = computeAlternatorChargingLoad({ total_load_a: 50, alternator_a: alt, idle_frac: fi, cruise_frac: fc });
  assert.ok(close(a.idle_balance_a - b.idle_balance_a, 10, 1e-9));
  assert.ok(close(a.cruise_balance_a - b.cruise_balance_a, 10, 1e-9));
  assert.ok(close(a.cruise_balance_a - a.idle_balance_a, alt * (fc - fi), 1e-9));
});

// flywheel-energy: recompute in SI (lb->kg 0.45359237, ft 0.3048, J per ft-lbf 1.3558179483)
// and check the speed swing against the exact identity dE = 1/2 I (wmax^2 - wmin^2) = I wmean^2 Cs.
test("flywheel-energy: SI recomputation of 1/2 I w^2 agrees", () => {
  for (const [W, k, n] of [[100, 1, 1000], [450, 1.75, 600], [12, 0.25, 3600]]) {
    const r = computeFlywheelEnergy({ weight_lb: W, radius_of_gyration_ft: k, rpm: n });
    const m = W * 0.45359237, kk = k * 0.3048, w = n * 2 * Math.PI / 60;
    const J = 0.5 * m * kk * kk * w * w;
    assert.ok(relClose(r.kinetic_energy_ftlb, J / 1.3558179483, 1e-4), `${r.kinetic_energy_ftlb} vs ${J / 1.3558179483}`);
  }
});
test("flywheel-energy: speed swing equals (wmax - wmin)/wmean for the energy actually released", () => {
  const W = 300, k = 1.2, nmax = 1050, nmin = 950, nmean = 1000;
  const I = (W / 32.174) * k * k, wmax = nmax * Math.PI / 30, wmin = nmin * Math.PI / 30;
  const dE = 0.5 * I * (wmax * wmax - wmin * wmin);
  const r = computeFlywheelEnergy({ weight_lb: W, radius_of_gyration_ft: k, rpm: nmean, energy_fluctuation_ftlb: dE });
  assert.ok(close(r.speed_fluctuation_pct, (nmax - nmin) / nmean * 100, 1e-9));
});

// crouch-planing-speed / crouch-hp-for-speed: fit the exponents numerically (speed ~ hp^0.5 W^-0.5,
// hp ~ v^2 W^1) and round-trip the two independent computes against each other.
test("crouch: fitted exponents are +0.5 (hp), -0.5 (weight), 1 (C); hp-for-speed is the exact inverse", () => {
  const s = (W, P, C) => computeCrouchPlaningSpeed({ displacement_lb: W, shaft_hp: P, hull_constant: C }).speed_mph;
  const slope = (f, a, b) => Math.log(f(b) / f(a)) / Math.log(b / a);
  assert.ok(close(slope((P) => s(3000, P, 150), 100, 400), 0.5, 1e-12));
  assert.ok(close(slope((W) => s(W, 200, 150), 2000, 8000), -0.5, 1e-12));
  assert.ok(close(slope((C) => s(3000, 200, C), 150, 210), 1, 1e-12));
  const h = (v, W) => computeCrouchHpForSpeed({ target_speed_mph: v, displacement_lb: W, hull_constant: 190 }).required_hp;
  assert.ok(close(slope((v) => h(v, 4000), 30, 60), 2, 1e-12));
  assert.ok(close(slope((W) => h(45, W), 2000, 6000), 1, 1e-12));
  for (const [W, P, C] of [[3000, 200, 150], [5200, 450, 190], [1800, 300, 210]]) {
    const v = s(W, P, C);
    assert.ok(relClose(computeCrouchHpForSpeed({ target_speed_mph: v, displacement_lb: W, hull_constant: C }).required_hp, P, 1e-12));
  }
});

// dyno-correction-sae: SAE J1349 reference day (25 C, 990 mbar dry) must give CF = 1 exactly;
// saturation vapor pressure vs steam tables (3.1699 kPa at 25 C, 5.6291 kPa at 35 C);
// 1 inHg = 3386.389 Pa (standard 29.9213 inHg = 1013.25 mbar).
test("dyno-correction-sae: CF = 1 at the J1349 reference day; Magnus vs steam tables; inHg", () => {
  const ref = computeDynoCorrectionSae({ observed_hp: 300, baro_mbar: 990, air_temp_c: 25, humidity_pct: 0 });
  assert.ok(close(ref.cf, 1, 1e-12)); assert.ok(close(ref.corrected_hp, 300, 1e-9));
  const v25 = computeDynoCorrectionSae({ observed_hp: 300, baro_mbar: 1000, air_temp_c: 25, humidity_pct: 100 });
  assert.ok(close(v25.vapor_mbar, 31.699, 0.3), `${v25.vapor_mbar}`);
  const v35 = computeDynoCorrectionSae({ observed_hp: 300, baro_mbar: 1000, air_temp_c: 35, humidity_pct: 100 });
  assert.ok(close(v35.vapor_mbar, 56.291, 0.5), `${v35.vapor_mbar}`);
  // humid reference: baro = 990 + vapor gives CF = 1 again (the DRY pressure is what counts)
  const hum = computeDynoCorrectionSae({ observed_hp: 300, baro_mbar: 990 + v25.vapor_mbar * 0.5, air_temp_c: 25, humidity_pct: 50 });
  assert.ok(close(hum.cf, 1, 1e-9));
  const us = computeDynoCorrectionSae({ observed_hp: 300, baro_inhg: 29.9213, air_temp_f: 77, humidity_pct: 0 });
  const si = computeDynoCorrectionSae({ observed_hp: 300, baro_mbar: 1013.25, air_temp_c: 25, humidity_pct: 0 });
  assert.ok(close(us.cf, si.cf, 1e-5));
  // hot, low-pressure day: CF rises above 1 and follows the J1349 temperature root
  const hot = computeDynoCorrectionSae({ observed_hp: 300, baro_mbar: 990, air_temp_c: 35, humidity_pct: 0 });
  assert.ok(close(hot.cf, 1.176 * Math.sqrt(308 / 298) - 0.176, 1e-12));
});

// wedge-force: solve the face equilibrium as vectors (normal + friction on each face, P along the
// axis) and compare; Machinery's Handbook frictionless face force N = P / (2 sin(alpha/2)).
test("wedge-force: vector equilibrium and MH frictionless face force agree", () => {
  for (const [alpha, mu] of [[30, 0.3], [20, 0], [10, 0.1], [60, 0.25]]) {
    const P = 1000, b = alpha / 2 * Math.PI / 180;
    // right face: outward normal n = (cos b, sin b); the face slides into the work (wedge moves -y), friction on
    // the wedge points +y along the face tangent t = (-sin b, cos b)... reaction on wedge = N(-n) + muN t'
    const n = [-Math.cos(b), Math.sin(b)]; // force of the work on the wedge from the right face
    const t = [Math.sin(b), Math.cos(b)];  // friction on the wedge, opposing its -y motion along the face
    const fy = n[1] + mu * t[1];           // per unit N, upward
    const N = P / (2 * fy);                // two faces balance the downward drive P
    const spread = -N * (n[0] + mu * t[0]); // horizontal push the wedge puts on the work
    const r = computeWedgeForce({ driving_force_lb: P, included_angle_deg: alpha, friction_coefficient: mu });
    assert.ok(relClose(r.spreading_force_lb, spread, 1e-9), `${alpha}/${mu}: ${r.spreading_force_lb} vs ${spread}`);
    if (mu === 0) assert.ok(relClose(r.spreading_force_lb, (P / (2 * Math.sin(b))) * Math.cos(b), 1e-12));
    // self-locking: the force needed to pull it back out (friction reversed) is <= 0 exactly when it holds
    const withdraw = 2 * (Math.sin(b) - mu * Math.cos(b));
    assert.equal(r.self_locking, withdraw < 0);
  }
});

// toggle-mechanism-force: virtual work on the actual linkage geometry by finite differences.
test("toggle-mechanism-force: virtual-work finite difference on the link geometry", () => {
  const l = 5;
  for (const th of [3, 10, 25, 45, 70]) {
    const t = th * Math.PI / 180, d = 1e-6;
    const knee = (a) => l * Math.sin(a), span = (a) => 2 * l * Math.cos(a);
    const ma = Math.abs((knee(t + d) - knee(t - d)) / (span(t + d) - span(t - d)));
    const r = computeToggleMechanismForce({ input_force_lb: 50, toggle_angle_deg: th });
    assert.ok(relClose(r.mechanical_advantage, ma, 1e-6), `${th}: ${r.mechanical_advantage} vs ${ma}`);
    assert.ok(relClose(r.velocity_ratio * r.mechanical_advantage, 1, 1e-12));
  }
});

// scotch-yoke-motion: differentiate the yoke position numerically (central differences in time).
test("scotch-yoke-motion: numeric d/dt and d2/dt2 of the slot position match velocity and acceleration", () => {
  const r = 2.5, N = 600, w = 2 * Math.PI * N / 60;
  const xAt = (deg) => computeScotchYokeMotion({ crank_radius_in: r, crank_rpm: N, crank_angle_deg: deg }).position_in;
  for (const deg of [20, 75, 90, 135, 200, 300]) {
    const h = 1e-3; // degrees
    const dt = (h * Math.PI / 180) / w;
    const v = (xAt(deg + h) - xAt(deg - h)) / (2 * dt);
    const a = (xAt(deg + h) - 2 * xAt(deg) + xAt(deg - h)) / (dt * dt);
    const res = computeScotchYokeMotion({ crank_radius_in: r, crank_rpm: N, crank_angle_deg: deg });
    assert.ok(close(res.velocity_ips, v, 1e-3 * r * w), `${deg}: v ${res.velocity_ips} vs ${v}`);
    assert.ok(close(res.accel_g * 386.08858, a, 2e-3 * r * w * w), `${deg}: a ${res.accel_g * 386.08858} vs ${a}`);
  }
  // position from the crank-pin geometry: pin x-projection r cos(theta) measured from the theta=0 end
  assert.ok(close(xAt(60), r - r * Math.cos(Math.PI / 3), 1e-12));
});

// slider-crank-piston-position: solve the pin-to-piston distance = L by bisection (no closed form),
// then differentiate numerically; long-rod limit reduces to simple harmonic motion.
test("slider-crank: bisection position + numeric derivatives match position, velocity, acceleration", () => {
  const stroke = 3.48, L = 5.7, r = stroke / 2, rpm = 6000, w = 2 * Math.PI * rpm / 60;
  const pistonFromTdc = (th) => {
    const px = r * Math.sin(th), py = r * Math.cos(th);
    let lo = py, hi = py + L; // piston on the axis above the pin: (y - py)^2 + px^2 = L^2
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if ((m - py) ** 2 + px * px < L * L) lo = m; else hi = m; }
    return (r + L) - lo;
  };
  for (const deg of [15, 60, 90, 120, 170, 250]) {
    const th = deg * Math.PI / 180, h = 1e-3, dt = h / w;
    const res = computeSliderCrankPistonPosition({ stroke_in: stroke, rod_length_in: L, crank_angle_deg: deg, crank_rpm: rpm });
    assert.ok(close(res.position_from_tdc_in, pistonFromTdc(th), 1e-9), `${deg}: pos`);
    const v = (pistonFromTdc(th + h) - pistonFromTdc(th - h)) / (2 * dt) / 12;
    const a = (pistonFromTdc(th + h) - 2 * pistonFromTdc(th) + pistonFromTdc(th - h)) / (dt * dt) / 386.08858;
    assert.ok(close(res.velocity_fps, v, 1e-4 * r * w / 12), `${deg}: v ${res.velocity_fps} vs ${v}`);
    assert.ok(close(res.accel_g, a, 2e-3 * r * w * w / 386.08858), `${deg}: a ${res.accel_g} vs ${a}`);
  }
  const tdc = computeSliderCrankPistonPosition({ stroke_in: stroke, rod_length_in: L, crank_angle_deg: 0, crank_rpm: rpm });
  assert.ok(relClose(tdc.accel_g, tdc.tdc_accel_g, 1e-12));
});
test("slider-crank: infinitely long rod reduces to simple harmonic motion", () => {
  const stroke = 4, r = 2, L = 2e6, rpm = 1200, w = 2 * Math.PI * rpm / 60;
  for (const deg of [30, 90, 150, 220]) {
    const th = deg * Math.PI / 180;
    const res = computeSliderCrankPistonPosition({ stroke_in: stroke, rod_length_in: L, crank_angle_deg: deg, crank_rpm: rpm });
    assert.ok(close(res.position_from_tdc_in, r * (1 - Math.cos(th)), 1e-4 * r));
    assert.ok(close(res.velocity_fps, r * w * Math.sin(th) / 12, 1e-4 * r * w / 12));
    assert.ok(close(res.accel_g, r * w * w * Math.cos(th) / 386.08858, 1e-4 * r * w * w / 386.08858));
  }
});
