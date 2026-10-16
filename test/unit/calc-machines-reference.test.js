// The machine-trade tiles (trucking field ops, elevator, millwright, trucking,
// motor, service, rigging field) against references the specs did not write.
// The worked-example fixture recomputes each spec's own example, so a spec and
// its tile that share an error agree with each other; these tests hold the
// tiles to physics, to conservation, to published code numbers re-derived here,
// and to round trips between their own inverse outputs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeKingpinToAxle, computeSafeDescentSpeed, computeOversizePermitScreen,
  computeDeckPointLoadDunnage,
} from "../../calc-truckingfield.js";
import {
  computeElevatorRopeSafetyFactor, computeMachineRoomHeat,
  computeDoorClosingEnergy, computeGuideRailBracketSpan,
} from "../../calc-elevator.js";
import {
  computeCouplingAlignmentTolerance, computeVibrationSeverityZone,
  computeShaftCriticalSpeedRayleigh, computeCompressedAirCondensate,
} from "../../calc-millwright.js";
import {
  computeLoadProfitability, computeMaintenanceReserve, computeGcwrCheck,
} from "../../calc-trucking.js";
import { computeMotorRunHoursForBudget, computeMotorRmsHp } from "../../calc-motor.js";
import { computeVfdEnergySavings } from "../../calc-service.js";
import { computeCraneLoadRadiusBoom } from "../../calc-riggingfield.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- kingpin-to-axle: the slide is the MINIMUM whole-hole move that complies ----

test("kingpin-to-axle: the slide complies, and one hole less would not -- it is the minimum whole-hole move", () => {
  // Independent of the ceil(): search the integers directly. The smallest whole
  // number of holes h with kpra - h*spacing/12 <= limit is the answer, and the
  // resulting measurement can never overshoot the limit by a whole hole.
  for (const kpra of [38, 40, 40.0001, 41.5, 42, 43.25, 48, 52.75]) {
    for (const spacing of [4, 6, 6.5, 12]) {
      const r = computeKingpinToAxle({ kpra_ft: kpra, state_limit_ft: 40, hole_spacing_in: spacing });
      let h = 0;
      while (kpra - h * spacing / 12 > 40 + 1e-9) h += 1;
      assert.equal(r.holes_needed, h, `holes at kpra=${kpra} spacing=${spacing}`);
      assert.ok(r.resulting_kpra_ft <= 40 + 1e-9, "the result complies");
      if (h > 0) {
        assert.ok(kpra - (h - 1) * spacing / 12 > 40 + 1e-9, "one hole less would still be over");
        assert.ok(40 - r.resulting_kpra_ft < spacing / 12, "never overshoots by a whole hole");
      }
    }
  }
});

test("kingpin-to-axle: the slide distance and the measurement change are the same move in two units", () => {
  const r = computeKingpinToAxle({ kpra_ft: 43, state_limit_ft: 40, hole_spacing_in: 6 });
  within(r.slide_in / 12, 43 - r.resulting_kpra_ft, 1e-9, "inches of slide = feet of KPRA removed");
  within(r.excess_ft, 3, 1e-9, "excess over the limit");
  assert.equal(r.holes_needed, 6, "36 in over on 6 in centers is 6 holes");
  within(r.resulting_kpra_ft, 40, 1e-9, "lands exactly on the limit");
});

test("kingpin-to-axle: a trailer at or under the limit is compliant and asks for no slide", () => {
  for (const kpra of [40, 39.5, 20]) {
    const r = computeKingpinToAxle({ kpra_ft: kpra, state_limit_ft: 40, hole_spacing_in: 6 });
    assert.equal(r.holes_needed, 0, "no slide needed");
    assert.equal(r.slide_in, 0, "no slide");
    within(r.resulting_kpra_ft, kpra, 1e-9, "measurement unchanged");
    assert.match(r.verdict, /^COMPLIANT/, "compliant at or under the limit");
  }
});

// ---- safe-descent-speed: Newtonian power balance on a grade ----

test("safe descent: the retarder demand is the rate gravity does work, 1 hp = 550 ft-lbf/s", () => {
  // Grade power = W x v x sin(theta); the tile uses the grade itself (a tangent),
  // which is conservative. Hand figure: 80,000 lb at 6% and 25 mph is
  // 25 x 5280/3600 = 36.667 fps, 80,000 x 36.667 x 0.06 = 176,000 ft-lbf/s = 320 hp.
  const r = computeSafeDescentSpeed({ gcw_lb: 80000, grade_pct: 6, descent_speed_mph: 25, engine_brake_hp: 400 });
  within(r.descent_power_hp, 320, 1e-6, "320 hp down a 6% grade at 25 mph");
  within(r.reserve_hp, 80, 1e-6, "400 hp retarder leaves 80 hp");
  assert.equal(r.service_brake_hp, 0, "service brakes carry nothing below balance");
});

test("safe descent: at the balance speed the demand exactly equals the retarder -- the two outputs invert each other", () => {
  for (const c of [
    { gcw_lb: 80000, grade_pct: 6, engine_brake_hp: 400 },
    { gcw_lb: 105000, grade_pct: 7, engine_brake_hp: 320 },
    { gcw_lb: 26000, grade_pct: 3.5, engine_brake_hp: 150 },
  ]) {
    const r = computeSafeDescentSpeed({ ...c, descent_speed_mph: 30 });
    const atBalance = computeSafeDescentSpeed({ ...c, descent_speed_mph: r.balance_speed_mph });
    within(atBalance.descent_power_hp, c.engine_brake_hp, 1e-6, "demand = retarder at the balance speed");
    within(atBalance.service_brake_hp, 0, 1e-9, "nothing left for the service brakes");
  }
});

test("safe descent: the published figures -- 31.3 mph at 80,000 lb and 23.8 mph at 105,000 lb on 6%", () => {
  // Balance speed = HP x 550 / (W x grade), in fps. 400 x 550 / (80,000 x 0.06)
  // = 45.833 fps = 31.25 mph; the same truck at 105,000 lb gives 23.81 mph.
  const a = computeSafeDescentSpeed({ gcw_lb: 80000, grade_pct: 6, descent_speed_mph: 25, engine_brake_hp: 400 });
  within(a.balance_speed_mph, 31.25, 0.05, "80,000 lb balance speed");
  const b = computeSafeDescentSpeed({ gcw_lb: 105000, grade_pct: 6, descent_speed_mph: 25, engine_brake_hp: 400 });
  within(b.balance_speed_mph, 23.81, 0.05, "105,000 lb balance speed");
  // Balance speed is inverse in weight and in grade: double either and it halves.
  within(computeSafeDescentSpeed({ gcw_lb: 160000, grade_pct: 6, descent_speed_mph: 25, engine_brake_hp: 400 }).balance_speed_mph,
    a.balance_speed_mph / 2, 1e-6, "inverse in weight");
  within(computeSafeDescentSpeed({ gcw_lb: 80000, grade_pct: 12, descent_speed_mph: 25, engine_brake_hp: 400 }).balance_speed_mph,
    a.balance_speed_mph / 2, 1e-6, "inverse in grade");
});

test("safe descent: above balance every horsepower of demand over the retarder lands in the service brakes", () => {
  const c = { gcw_lb: 80000, grade_pct: 6, engine_brake_hp: 400 };
  const r = computeSafeDescentSpeed({ ...c, descent_speed_mph: 45 });
  within(r.descent_power_hp, 576, 1e-6, "576 hp at 45 mph");
  within(r.service_brake_hp, 176, 1e-6, "176 hp into the service brakes");
  within(r.descent_power_hp - r.service_brake_hp, 400, 1e-9, "power balance closes");
  assert.equal(r.reserve_hp, 0, "no reserve above balance");
});

// ---- oversize-permit-screen: the federal numbers, and the limit is inclusive ----

test("oversize permit: the shipped defaults are the federal National Network figures", () => {
  // 23 CFR 658.15: 102 in = 8.5 ft width on the National Network.
  // 23 CFR 658.17: 80,000 lb gross on the Interstate system.
  // Feeding exactly those dimensions must read legal, not over.
  const r = computeOversizePermitScreen({ width_ft: 8.5, height_ft: 13.5, length_ft: 75, weight_lb: 80000 });
  assert.equal(r.permit_required, false, "a load exactly at the shipped limits needs no permit");
  assert.equal(r.over_count, 0, "nothing over");
  for (const k of ["width_excess_ft", "height_excess_ft", "length_excess_ft", "weight_excess_lb"]) {
    within(r[k], 0, 1e-9, `${k} is zero at the limit`);
  }
});

test("oversize permit: each excess is the measured dimension minus its own threshold, hand-figured", () => {
  // 12 ft 0 in x 14 ft 6 in x 75 ft, 90,000 lb against 8.5 / 14 / 75 / 80,000:
  // 3.5 ft over width, 0.5 ft over height, exactly at length, 10,000 lb over.
  const r = computeOversizePermitScreen({
    width_ft: 12, height_ft: 14.5, length_ft: 75, weight_lb: 90000,
    width_limit_ft: 8.5, height_limit_ft: 14, length_limit_ft: 75, weight_limit_lb: 80000,
  });
  within(r.width_excess_ft, 3.5, 1e-9, "width");
  within(r.height_excess_ft, 0.5, 1e-9, "height");
  within(r.length_excess_ft, 0, 1e-9, "length exactly at the limit");
  within(r.weight_excess_lb, 10000, 1e-9, "weight");
  assert.equal(r.over_count, 3, "three permit questions -- length at the limit is not one of them");
});

test("oversize permit: over_count counts exactly the dimensions whose excess is positive", () => {
  const cases = [
    { width_ft: 8, height_ft: 13, length_ft: 60, weight_lb: 70000 },
    { width_ft: 9, height_ft: 13, length_ft: 60, weight_lb: 70000 },
    { width_ft: 9, height_ft: 15, length_ft: 90, weight_lb: 110000 },
    { width_ft: 8.5, height_ft: 13.5, length_ft: 75, weight_lb: 80001 },
  ];
  for (const c of cases) {
    const r = computeOversizePermitScreen(c);
    const expected = [r.width_excess_ft, r.height_excess_ft, r.length_excess_ft, r.weight_excess_lb].filter((x) => x > 0).length;
    assert.equal(r.over_count, expected, `over_count for ${JSON.stringify(c)}`);
    assert.equal(r.permit_required, expected > 0, "permit_required tracks the count");
  }
});

// ---- deck-point-load-dunnage: pressure and linear load are the same load, two ways ----

test("deck dunnage: four 6 by 6 in feet under 12,000 lb is one square foot and 12,000 psf", () => {
  // 4 x 36 sq in = 144 sq in = 1.0 sq ft exactly; the load over it is 12,000 psf.
  const r = computeDeckPointLoadDunnage({
    load_lb: 12000, feet_count: 4, foot_area_sqin: 36,
    dunnage_bearing_ft: 8, deck_rating_plf: 1200,
  });
  within(r.total_bearing_sqft, 1, 1e-9, "one square foot of bearing");
  within(r.bearing_pressure_psf, 12000, 1e-9, "12,000 psf into the deck plate");
  // 144 sq in per sq ft is a unit round trip: the same feet stated in sq ft.
  within(r.bearing_pressure_psf * r.total_bearing_sqft, 12000, 1e-9, "pressure x area = the load");
});

test("deck dunnage: the required bearing length is the one that lands at exactly 100% -- a round trip", () => {
  const base = { load_lb: 12000, feet_count: 4, foot_area_sqin: 36, deck_rating_plf: 1200 };
  const r = computeDeckPointLoadDunnage({ ...base, dunnage_bearing_ft: 8 });
  within(r.linear_load_plf, 1500, 1e-9, "12,000 lb over 8 ft is 1,500 plf");
  within(r.utilization_pct, 125, 1e-9, "125% of a 1,200 plf deck");
  within(r.required_length_ft, 10, 1e-9, "ten feet lands at the rating");
  within(r.shortfall_ft, 2, 1e-9, "two more feet of bearing");
  const atRequired = computeDeckPointLoadDunnage({ ...base, dunnage_bearing_ft: r.required_length_ft });
  within(atRequired.utilization_pct, 100, 1e-9, "exactly 100% at the required length");
  assert.equal(atRequired.shortfall_ft, 0, "no shortfall once there");
  const twelve = computeDeckPointLoadDunnage({ ...base, dunnage_bearing_ft: 12 });
  within(twelve.utilization_pct, 100 / 1.2, 0.01, "twelve feet is a comfortable 83%");
});

test("deck dunnage: linear load is inverse in bearing length and linear in load; pressure ignores the dunnage", () => {
  const base = { load_lb: 9000, feet_count: 6, foot_area_sqin: 20, dunnage_bearing_ft: 6, deck_rating_plf: 1100 };
  const r = computeDeckPointLoadDunnage(base);
  const longer = computeDeckPointLoadDunnage({ ...base, dunnage_bearing_ft: 12 });
  within(longer.linear_load_plf, r.linear_load_plf / 2, 1e-9, "double the bearing, half the plf");
  within(longer.bearing_pressure_psf, r.bearing_pressure_psf, 1e-9, "foot pressure is unaffected by dunnage");
  const heavier = computeDeckPointLoadDunnage({ ...base, load_lb: 18000 });
  within(heavier.linear_load_plf, 2 * r.linear_load_plf, 1e-9, "double the load, double the plf");
  within(heavier.bearing_pressure_psf, 2 * r.bearing_pressure_psf, 1e-9, "and double the foot pressure");
  within(heavier.required_length_ft, 2 * r.required_length_ft, 1e-9, "and double the bearing needed");
});

// ---- rope-safety-factor: ASME A17.1 2.20.3, f = S x N / W ----

test("elevator ropes: f = S x N / W with N the number of RUNS -- hand-figured against the definition", () => {
  // A17.1 2.20.3 defines the factor of safety as the aggregate breaking strength
  // of all runs of rope divided by the maximum static load they carry. Six 1/2 in
  // 8x19 ropes of 22,000 lb each in 1:1 roping is 132,000 lb of strength.
  // Suspended load: 5,000 car + 3,000 rated + 400 cable + 6 x 1 x 150 ft x 0.46
  // lb/ft = 414 lb of rope = 8,814 lb; f = 132,000 / 8,814 = 14.976.
  const r = computeElevatorRopeSafetyFactor({
    car_weight_lb: 5000, rated_load_lb: 3000, travelling_cable_lb: 400,
    rope_count: 6, rope_weight_per_ft: 0.46, rope_breaking_strength_lb: 22000,
    rise_ft: 150, code_minimum_fs: 11.9, roping_ratio: 1,
  });
  within(r.breaking_total_lb, 132000, 1e-9, "aggregate breaking strength");
  within(r.rope_weight_lb, 414, 1e-9, "hanging rope weight");
  within(r.suspended_load_lb, 8814, 1e-9, "static load on the ropes");
  within(r.factor_of_safety, 132000 / 8814, 1e-9, "f = S N / W");
  assert.equal(r.pass, true, "comfortably above an 11.9 minimum");
});

test("elevator ropes: 2:1 roping doubles the runs AND the hanging rope -- not half the factor", () => {
  const base = {
    car_weight_lb: 5000, rated_load_lb: 3000, travelling_cable_lb: 400,
    rope_count: 6, rope_weight_per_ft: 0.46, rope_breaking_strength_lb: 22000,
    rise_ft: 150, code_minimum_fs: 11.9,
  };
  const one = computeElevatorRopeSafetyFactor({ ...base, roping_ratio: 1 });
  const two = computeElevatorRopeSafetyFactor({ ...base, roping_ratio: 2 });
  within(two.breaking_total_lb, 2 * one.breaking_total_lb, 1e-9, "twice the runs under load");
  within(two.rope_weight_lb, 2 * one.rope_weight_lb, 1e-9, "twice the rope below the sheave");
  // Doubling only the strength while the dead weight grows a little must RAISE the factor.
  assert.ok(two.factor_of_safety > one.factor_of_safety, "2:1 reads a higher factor, not a halved one");
  assert.ok(two.factor_of_safety < 2 * one.factor_of_safety, "but less than double, because the rope weight grew too");
});

test("elevator ropes: the maximum rated load is the inverse of the factor -- feed it back and land on the minimum", () => {
  for (const c of [
    { car_weight_lb: 5000, rated_load_lb: 3000, travelling_cable_lb: 400, rope_count: 6, rope_weight_per_ft: 0.46, rope_breaking_strength_lb: 22000, rise_ft: 150, code_minimum_fs: 11.9, roping_ratio: 1 },
    { car_weight_lb: 9000, rated_load_lb: 4000, travelling_cable_lb: 900, rope_count: 8, rope_weight_per_ft: 0.72, rope_breaking_strength_lb: 36000, rise_ft: 600, code_minimum_fs: 10.5, roping_ratio: 2 },
  ]) {
    const r = computeElevatorRopeSafetyFactor(c);
    assert.ok(r.max_rated_load_lb > 0, "a reachable maximum");
    const back = computeElevatorRopeSafetyFactor({ ...c, rated_load_lb: r.max_rated_load_lb });
    within(back.factor_of_safety, c.code_minimum_fs, 1e-7, "at the maximum rated load f is exactly the minimum");
    within(r.margin, r.factor_of_safety - c.code_minimum_fs, 1e-12, "margin is the distance to the minimum");
  }
});

test("elevator ropes: dropping the hanging rope overstates the factor, and the overstatement grows with the rise", () => {
  const base = {
    car_weight_lb: 5000, rated_load_lb: 3000, travelling_cable_lb: 400,
    rope_count: 6, rope_weight_per_ft: 0.46, rope_breaking_strength_lb: 22000,
    code_minimum_fs: 11.9, roping_ratio: 1,
  };
  let last = 0;
  for (const rise_ft of [50, 150, 400, 900]) {
    const r = computeElevatorRopeSafetyFactor({ ...base, rise_ft });
    assert.ok(r.fs_without_rope_weight > r.factor_of_safety, "ignoring rope weight always reads high");
    within(r.overstatement, r.fs_without_rope_weight - r.factor_of_safety, 1e-12, "overstatement is the difference");
    assert.ok(r.overstatement > last, "and it grows with the building");
    last = r.overstatement;
  }
});

// ---- machine-room-heat: the heat is the loss, and the air is 0.018 Btu/cuft-F ----

test("machine room: the rejected heat is the LOSS, and loss plus useful work is the connected power", () => {
  // 1 kW = 3,412.14 Btu/h. A 30 kW machine at 85% rejects 30 x 0.15 x 3412.14
  // = 15,354.6 Btu/h while running; the connected figure is 102,364 Btu/h.
  const r = computeMachineRoomHeat({
    input_power_kw: 30, efficiency_pct: 85, duty_cycle_pct: 40,
    controller_standby_w: 0, other_gains_btuh: 0, room_volume_cuft: 2000,
    ambient_limit_f: 104, starting_temp_f: 80,
  });
  within(r.heat_running_btuh, 30 * 0.15 * 3412.142, 1e-9, "losses only");
  within(r.connected_btuh, 30 * 3412.142, 1e-9, "connected power in Btu/h");
  within(r.connected_overstatement, 1 / 0.15, 1e-9, "sizing on connected power is 6.67x too big at 85%");
  within(r.heat_average_btuh, r.heat_running_btuh * 0.4, 1e-12, "a 40% duty cycle averages 40% of it");
  within(r.cooling_tons * 12000, r.total_btuh, 1e-9, "12,000 Btu/h to the ton");
});

test("machine room: the temperature rise is a sensible-heat balance on the room's air", () => {
  // Air at 0.075 lb/cuft and cp 0.24 Btu/lb-F stores 0.018 Btu per cuft per F.
  // Heat in over an hour must equal the air's heat capacity times the rise.
  const r = computeMachineRoomHeat({
    input_power_kw: 30, efficiency_pct: 85, duty_cycle_pct: 40,
    controller_standby_w: 600, other_gains_btuh: 4000, room_volume_cuft: 2400,
    ambient_limit_f: 104, starting_temp_f: 80,
  });
  const heatCapacity = 0.075 * 0.24 * 2400; // Btu per F of room air
  within(r.temp_rise_f_per_hr * heatCapacity, r.total_btuh, 1e-9, "Q = m cp dT per hour");
  within(r.total_btuh, r.heat_average_btuh + r.controller_btuh + 4000, 1e-12, "the three gains add");
  within(r.controller_btuh, 0.6 * 3412.142, 1e-9, "600 W of standby");
  // The time to the limit is the whole 24 F of headroom at that rise.
  within(r.hours_to_limit * r.temp_rise_f_per_hr, 24, 1e-9, "rise x hours = the headroom");
  within(r.minutes_to_limit, r.hours_to_limit * 60, 1e-12, "minutes agree with hours");
  // Twice the room, twice the time; twice the heat, half the time.
  const big = computeMachineRoomHeat({
    input_power_kw: 30, efficiency_pct: 85, duty_cycle_pct: 40,
    controller_standby_w: 600, other_gains_btuh: 4000, room_volume_cuft: 4800,
    ambient_limit_f: 104, starting_temp_f: 80,
  });
  within(big.hours_to_limit, 2 * r.hours_to_limit, 1e-9, "twice the air, twice the time");
});

// ---- door-closing-energy: ASME A17.1 2.13.4, KE = 1/2 m v^2 ----

test("elevator doors: kinetic energy is 1/2 (W/g) v^2 with g = 32.174 ft/s^2, hand-figured", () => {
  // A17.1 2.13.4.2.1 caps normal operation at 7 ft-lbf and 2.13.4.2.3 caps the
  // reduced (reopening device inoperative) case at 2.5 ft-lbf. A 150 lb door at
  // 1.0 fps carries 0.5 x 150/32.174 x 1 = 2.331 ft-lbf: inside both.
  const r = computeDoorClosingEnergy({
    door_mass_lb: 150, closing_speed_fps: 1.0, ke_limit_normal_ftlb: 7,
    ke_limit_reduced_ftlb: 2.5, measured_force_lbf: 25, force_limit_lbf: 30,
    opening_width_in: 42, added_mass_lb: 0,
  });
  within(r.kinetic_energy_ftlb, 0.5 * 150 / 32.174, 1e-9, "2.33 ft-lbf");
  assert.equal(r.pass_normal, true, "inside the 7 ft-lbf normal limit");
  assert.equal(r.pass_reduced, true, "inside the 2.5 ft-lbf reduced limit");
  // Doubling the speed quadruples the energy; doubling the mass only doubles it.
  const fast = computeDoorClosingEnergy({
    door_mass_lb: 150, closing_speed_fps: 2.0, ke_limit_normal_ftlb: 7,
    ke_limit_reduced_ftlb: 2.5, measured_force_lbf: 25, force_limit_lbf: 30,
    opening_width_in: 42, added_mass_lb: 0,
  });
  within(fast.kinetic_energy_ftlb, 4 * r.kinetic_energy_ftlb, 1e-9, "energy goes as the square of speed");
  const heavy = computeDoorClosingEnergy({
    door_mass_lb: 300, closing_speed_fps: 1.0, ke_limit_normal_ftlb: 7,
    ke_limit_reduced_ftlb: 2.5, measured_force_lbf: 25, force_limit_lbf: 30,
    opening_width_in: 42, added_mass_lb: 0,
  });
  within(heavy.kinetic_energy_ftlb, 2 * r.kinetic_energy_ftlb, 1e-9, "energy is linear in mass");
  within(r.ke_with_added_mass_ftlb, r.kinetic_energy_ftlb, 1e-12, "no added mass, no change");
});

test("elevator doors: the compliant speed is the inverse of the energy limit -- feed it back and land on 2.5 ft-lbf", () => {
  const base = {
    door_mass_lb: 420, ke_limit_normal_ftlb: 7, ke_limit_reduced_ftlb: 2.5,
    measured_force_lbf: 22, force_limit_lbf: 30, opening_width_in: 48, added_mass_lb: 60,
  };
  for (const closing_speed_fps of [0.8, 1.4, 2.2]) {
    const r = computeDoorClosingEnergy({ ...base, closing_speed_fps });
    const back = computeDoorClosingEnergy({ ...base, closing_speed_fps: r.speed_for_reduced_limit_fps });
    within(back.kinetic_energy_ftlb, 2.5, 1e-7, "at the compliant speed the energy is exactly the limit");
    assert.equal(back.pass_reduced, true, "and it passes");
    within(r.speed_change_pct, (r.speed_for_reduced_limit_fps - closing_speed_fps) / closing_speed_fps * 100, 1e-12, "the stated change");
    // Door time is width over speed: slower doors take proportionally longer.
    within(r.closing_time_s * closing_speed_fps, 48 / 12, 1e-12, "time x speed = the clear opening, in feet");
    within(r.closing_time_at_limit_s * r.speed_for_reduced_limit_fps, 48 / 12, 1e-9, "same width at the compliant speed");
    within(r.closing_time_change_s, r.closing_time_at_limit_s - r.closing_time_s, 1e-12, "the time cost of compliance");
  }
});

test("elevator doors: a fifth off the speed takes more than a third off the energy, and added mass adds in proportion", () => {
  const base = {
    door_mass_lb: 500, ke_limit_normal_ftlb: 7, ke_limit_reduced_ftlb: 2.5,
    measured_force_lbf: 22, force_limit_lbf: 30, opening_width_in: 48, added_mass_lb: 125,
  };
  const r = computeDoorClosingEnergy({ ...base, closing_speed_fps: 1.5 });
  const slower = computeDoorClosingEnergy({ ...base, closing_speed_fps: 1.2 });
  within(slower.kinetic_energy_ftlb / r.kinetic_energy_ftlb, 0.64, 1e-9, "0.8 squared");
  assert.ok(1 - slower.kinetic_energy_ftlb / r.kinetic_energy_ftlb > 1 / 3, "more than a third off");
  within(r.ke_with_added_mass_ftlb / r.kinetic_energy_ftlb, 625 / 500, 1e-12, "added mass scales the energy by the mass ratio");
  // Force is a separate, static test: it does not move with speed or mass.
  assert.equal(r.force_ok, slower.force_ok, "the force check is independent of the energy check");
});

// ---- guide-rail-bracket-span: simply supported beam, central point load ----

// Midspan deflection by virtual work, integrated numerically: d = int M m / EI dx
// with M(x) = P x / 2 and m(x) = x / 2 on each half. This never writes PL^3/48EI.
const beamDeflectionNumeric = (P, L_in, E, I) => {
  const n = 20000, half = L_in / 2, h = half / n;
  let s = 0;
  for (let i = 0; i <= n; i += 1) {
    const x = i * h;
    const w = (i === 0 || i === n) ? 0.5 : 1;
    s += w * (P * x / 2) * (x / 2) * h;
  }
  return 2 * s / (E * I);
};

test("guide rail: the midspan deflection matches a numerically integrated virtual-work solution", () => {
  const cases = [
    { span_ft: 10, horizontal_load_lb: 1200, moment_of_inertia_in4: 2.2, modulus_psi: 29000000 },
    { span_ft: 14, horizontal_load_lb: 800, moment_of_inertia_in4: 5.1, modulus_psi: 29000000 },
    { span_ft: 7.5, horizontal_load_lb: 3000, moment_of_inertia_in4: 1.1, modulus_psi: 30000000 },
  ];
  for (const c of cases) {
    const r = computeGuideRailBracketSpan({
      ...c, section_modulus_in3: 1.9, allowable_stress_psi: 15000,
      deflection_limit_in: 0.25, safety_application_load_lb: 9000,
    });
    const want = beamDeflectionNumeric(c.horizontal_load_lb, c.span_ft * 12, c.modulus_psi, c.moment_of_inertia_in4);
    within(r.deflection_in, want, 0.01, `deflection at ${c.span_ft} ft`);
  }
});

test("guide rail: midspan moment is PL/4 and the stress is that moment over S -- hand-figured", () => {
  // A 1,200 lb guide-shoe load on a 10 ft span: M = 1200 x 120 / 4 = 36,000 in-lb.
  // On a 1.9 in^3 rail that is 18,947 psi, past the 15,000 psi of A17.1 2.23.5.1.1.
  const r = computeGuideRailBracketSpan({
    span_ft: 10, horizontal_load_lb: 1200, section_modulus_in3: 1.9,
    moment_of_inertia_in4: 2.2, modulus_psi: 29000000, allowable_stress_psi: 15000,
    deflection_limit_in: 0.25, safety_application_load_lb: 9000,
  });
  within(r.moment_inlb, 36000, 1e-9, "PL/4 in inch-pounds");
  within(r.stress_psi, 36000 / 1.9, 1e-9, "M/S");
  assert.equal(r.stress_ok, false, "18,947 psi is over the 15,000 psi allowable");
  // The safety-application case is the same beam at the larger load, so the
  // stresses are in the ratio of the loads.
  within(r.safety_stress_psi / r.stress_psi, 9000 / 1200, 1e-12, "stress is linear in load");
});

test("guide rail: halving the span halves the moment and cuts the deflection to an eighth", () => {
  const c = {
    span_ft: 12, horizontal_load_lb: 900, section_modulus_in3: 2.4,
    moment_of_inertia_in4: 4.0, modulus_psi: 29000000, allowable_stress_psi: 15000,
    deflection_limit_in: 0.25, safety_application_load_lb: 7500,
  };
  const r = computeGuideRailBracketSpan(c);
  const half = computeGuideRailBracketSpan({ ...c, span_ft: 6 });
  within(r.halved_span_moment_inlb, half.moment_inlb, 1e-9, "the halved-span moment is the real half-span moment");
  within(r.halved_span_deflection_in, half.deflection_in, 1e-9, "and so is the halved-span deflection");
  within(half.moment_inlb, r.moment_inlb / 2, 1e-12, "moment goes as the span");
  within(half.deflection_in, r.deflection_in / 8, 1e-9, "deflection goes as its cube");
  // Matching an eighth of the deflection by section alone takes 8x the inertia.
  const stiffer = computeGuideRailBracketSpan({ ...c, moment_of_inertia_in4: 32.0 });
  within(stiffer.deflection_in, r.deflection_in / 8, 1e-9, "or eight times the moment of inertia");
});

test("guide rail: the maximum span for the deflection limit is a round trip -- at that span the deflection is the limit", () => {
  for (const c of [
    { span_ft: 12, horizontal_load_lb: 900, moment_of_inertia_in4: 4.0, deflection_limit_in: 0.25 },
    { span_ft: 8, horizontal_load_lb: 2200, moment_of_inertia_in4: 1.6, deflection_limit_in: 0.125 },
  ]) {
    const full = {
      ...c, section_modulus_in3: 2.4, modulus_psi: 29000000,
      allowable_stress_psi: 15000, safety_application_load_lb: 7500,
    };
    const r = computeGuideRailBracketSpan(full);
    const atMax = computeGuideRailBracketSpan({ ...full, span_ft: r.max_span_for_deflection_ft });
    within(atMax.deflection_in, c.deflection_limit_in, 1e-7, "exactly at the deflection limit");
    assert.equal(atMax.deflection_ok, true, "and it passes there");
  }
});

// ---- coupling-alignment-tolerance: mils, and the spacer's SLOPE ----

test("coupling alignment: a mil is a thousandth of an inch, and the spacer reading is a slope", () => {
  // 10 mils of end-to-end offset across a 10 in spacer is 1.0 mil per inch --
  // the same quantity the angularity tolerance is stated in. A 20 in spacer with
  // the same 10 mils is only 0.5 mil/in: the long spacer earns the extra offset.
  const base = {
    rpm: 1800, measured_offset_in: 0.002, measured_angularity_mils_per_in: 0.5,
    offset_excellent_in: 0.002, offset_acceptable_in: 0.004,
    angularity_excellent_mils_per_in: 0.5, angularity_acceptable_mils_per_in: 1.0,
  };
  const short = computeCouplingAlignmentTolerance({ ...base, spacer_length_in: 10, spacer_end_offset_in: 0.010 });
  within(short.spacer_slope_mils_per_in, 1.0, 1e-9, "10 mils over 10 in");
  const long = computeCouplingAlignmentTolerance({ ...base, spacer_length_in: 20, spacer_end_offset_in: 0.010 });
  within(long.spacer_slope_mils_per_in, 0.5, 1e-9, "the same offset across twice the spacer is half the slope");
  assert.equal(long.spacer_passes, true, "and it passes a 1.0 mil/in tolerance");
  // The slope is a tangent: 1 mil/in is an angle of atan(0.001) radians.
  within(Math.atan(short.spacer_slope_mils_per_in / 1000) * 1000, 1.0, 0.01, "1 mil/in is a milliradian to within a part in 10^6");
});

test("coupling alignment: the percentages are the readings against the entered tolerances, and the pass is the 100% line", () => {
  const base = {
    rpm: 3600, offset_excellent_in: 0.0015, offset_acceptable_in: 0.003,
    angularity_excellent_mils_per_in: 0.3, angularity_acceptable_mils_per_in: 0.6,
  };
  // At exactly the tolerance the reading is 100% and still passes; a hair over fails.
  const at = computeCouplingAlignmentTolerance({ ...base, measured_offset_in: 0.003, measured_angularity_mils_per_in: 0.6 });
  within(at.offset_pct_of_acceptable, 100, 1e-9, "at tolerance is 100%");
  within(at.angularity_pct_of_acceptable, 100, 1e-9, "at tolerance is 100%");
  assert.equal(at.offset_passes, true, "the tolerance is inclusive");
  assert.equal(at.angularity_passes, true, "the tolerance is inclusive");
  assert.equal(at.passes, true, "and the coupling passes");
  const over = computeCouplingAlignmentTolerance({ ...base, measured_offset_in: 0.0045, measured_angularity_mils_per_in: 0.6 });
  assert.equal(over.offset_passes, false, "50% past tolerance fails");
  within(over.offset_pct_of_acceptable, 150, 1e-9, "and reads 150%");
  within(over.offset_over_by_in, 0.0015, 1e-12, "over by a mil and a half");
  within(over.offset_pct_of_excellent, 0.0045 / 0.0015 * 100, 1e-9, "300% of the excellent column");
  // Halving the measured offset halves both percentages: they are pure ratios.
  const half = computeCouplingAlignmentTolerance({ ...base, measured_offset_in: 0.0015, measured_angularity_mils_per_in: 0.3 });
  within(half.offset_pct_of_acceptable, at.offset_pct_of_acceptable / 2, 1e-9, "linear in the reading");
  within(half.angularity_pct_of_acceptable, at.angularity_pct_of_acceptable / 2, 1e-9, "linear in the reading");
});

test("coupling alignment: a spacer over slope fails the coupling even with both face readings inside", () => {
  const r = computeCouplingAlignmentTolerance({
    rpm: 1800, measured_offset_in: 0.001, measured_angularity_mils_per_in: 0.2,
    offset_excellent_in: 0.002, offset_acceptable_in: 0.004,
    angularity_excellent_mils_per_in: 0.5, angularity_acceptable_mils_per_in: 1.0,
    spacer_length_in: 6, spacer_end_offset_in: 0.020,
  });
  within(r.spacer_slope_mils_per_in, 20 / 6, 1e-9, "20 mils over 6 in is 3.33 mil/in");
  assert.equal(r.offset_passes, true, "the face offset is fine");
  assert.equal(r.angularity_passes, true, "the angularity is fine");
  assert.equal(r.spacer_passes, false, "but the spacer slope is over");
  assert.equal(r.passes, false, "so the coupling fails");
});

// ---- vibration-severity-zone: ISO 10816 boundaries ----

test("vibration: the shipped boundaries are the ISO 10816-1 Class II figures 1.12 / 2.8 / 7.1 mm/s", () => {
  // 25.4 mm to the inch: 0.0441 / 0.1102 / 0.2795 in/s are those three rounded.
  const r = computeVibrationSeverityZone({ reading: 0.05 });
  within(r.boundary_ab * 25.4, 1.12, 0.1, "A/B at 1.12 mm/s");
  within(r.boundary_bc * 25.4, 2.80, 0.1, "B/C at 2.80 mm/s");
  within(r.boundary_cd * 25.4, 7.10, 0.1, "C/D at 7.10 mm/s");
});

test("vibration: a reading AT an ISO boundary in mm/s lands in the lower zone, not the one above", () => {
  // The rounded in/s defaults sit a hair below the mm/s boundaries, so an
  // operator entering 1.12, 2.8 or 7.1 mm/s must still read A, B and C.
  assert.equal(computeVibrationSeverityZone({ reading: 1.12, reading_is_mm_s: 1 }).zone, "A", "1.12 mm/s is still zone A");
  assert.equal(computeVibrationSeverityZone({ reading: 2.80, reading_is_mm_s: 1 }).zone, "B", "2.80 mm/s is still zone B");
  assert.equal(computeVibrationSeverityZone({ reading: 7.10, reading_is_mm_s: 1 }).zone, "C", "7.10 mm/s is still zone C");
  assert.equal(computeVibrationSeverityZone({ reading: 9.0, reading_is_mm_s: 1 }).zone, "D", "9 mm/s is zone D");
});

test("vibration: the units round-trip -- the same velocity stated either way gives the same zone and the same numbers", () => {
  for (const in_s of [0.02, 0.0441, 0.08, 0.15, 0.30]) {
    const a = computeVibrationSeverityZone({ reading: in_s });
    const b = computeVibrationSeverityZone({ reading: in_s * 25.4, reading_is_mm_s: 1 });
    within(b.reading_in_s, a.reading_in_s, 1e-9, "same reading in in/s");
    within(a.reading_mm_s, in_s * 25.4, 1e-9, "25.4 mm to the inch");
    assert.equal(b.zone, a.zone, "same zone either way");
    within(b.margin_to_next_zone_in_s, a.margin_to_next_zone_in_s, 1e-9, "same margin");
  }
});

test("vibration: the trend is the change between two readings, and crossing is a change of zone", () => {
  const r = computeVibrationSeverityZone({ reading: 0.12, previous_reading: 0.06, interval_months: 3 });
  within(r.change_pct, 100, 1e-9, "a doubling is +100%");
  within(r.change_per_month_in_s, 0.02, 1e-9, "0.06 in/s over 3 months");
  assert.equal(r.crossed_a_boundary, true, "0.06 is zone B and 0.12 is zone C");
  assert.equal(r.zone, "C", "the new reading is zone C");
  const inside = computeVibrationSeverityZone({ reading: 0.10, previous_reading: 0.05, interval_months: 6 });
  assert.equal(inside.crossed_a_boundary, false, "0.05 and 0.10 are both zone B");
  const falling = computeVibrationSeverityZone({ reading: 0.05, previous_reading: 0.10, interval_months: 6 });
  within(falling.change_pct, -50, 1e-9, "a halving is -50%");
  assert.ok(falling.change_per_month_in_s < 0, "a falling trend is negative");
});

// ---- shaft-critical-speed-rayleigh: against the beam formula and 187.7/sqrt(d) ----

test("shaft critical speed: one mass reproduces the field rule N_c = 187.7 / sqrt(deflection in inches)", () => {
  // Rayleigh with a single mass collapses to omega = sqrt(g/y), so
  // N = 60/(2 pi) sqrt(386.0886/y) = 187.65/sqrt(y). The shop rule is 187.7.
  for (const y of [0.001, 0.005, 0.01118, 0.05, 0.25]) {
    const r = computeShaftCriticalSpeedRayleigh({ weight_1_lb: 250, deflection_1_in: y });
    within(r.critical_rpm, 187.7 / Math.sqrt(y), 0.05, `187.7 rule at y=${y}`);
  }
});

test("shaft critical speed: a real shaft -- beam deflection PL^3/48EI fed in gives the textbook critical speed", () => {
  // 2 in solid steel shaft, 40 in between bearings, 200 lb wheel at midspan.
  // I = pi d^4 / 64 = 0.785398 in^4, E = 30e6 psi.
  // Deflection by numerical virtual work (no closed form written here).
  const I = Math.PI * Math.pow(2, 4) / 64;
  const y = beamDeflectionNumeric(200, 40, 30e6, I);
  within(y, 0.011318, 0.5, "static deflection at the wheel");
  const r = computeShaftCriticalSpeedRayleigh({ weight_1_lb: 200, deflection_1_in: y, operating_rpm: 1750 });
  within(r.critical_rpm, 187.7 / Math.sqrt(y), 0.05, "the 187.7 rule agrees");
  within(r.speed_ratio, 1750 / r.critical_rpm, 1e-12, "the speed ratio is N over N_c");
  assert.ok(r.critical_rpm > 1700 && r.critical_rpm < 1800, "about 1,765 rpm");
});

test("shaft critical speed: the estimate is independent of how heavy the masses are when the deflections are given", () => {
  // omega^2 = g Sum(W y) / Sum(W y^2): scaling every weight by k cancels, which
  // is the Rayleigh quotient's defining homogeneity. Equal deflections collapse
  // to the single-mass answer no matter how the weight is split.
  const a = computeShaftCriticalSpeedRayleigh({
    weight_1_lb: 100, deflection_1_in: 0.01, weight_2_lb: 250, deflection_2_in: 0.018, weight_3_lb: 60, deflection_3_in: 0.006,
  });
  const b = computeShaftCriticalSpeedRayleigh({
    weight_1_lb: 700, deflection_1_in: 0.01, weight_2_lb: 1750, deflection_2_in: 0.018, weight_3_lb: 420, deflection_3_in: 0.006,
  });
  within(b.critical_rpm, a.critical_rpm, 1e-9, "homogeneous of degree zero in the weights");
  const split = computeShaftCriticalSpeedRayleigh({ weight_1_lb: 80, deflection_1_in: 0.02, weight_2_lb: 220, deflection_2_in: 0.02 });
  const one = computeShaftCriticalSpeedRayleigh({ weight_1_lb: 300, deflection_1_in: 0.02 });
  within(split.critical_rpm, one.critical_rpm, 1e-9, "equal deflections collapse to one mass");
});

test("shaft critical speed: the estimate is bracketed by the stiffest and the softest station", () => {
  // The Rayleigh quotient is a weighted mean of g/y_i with weights W_i y_i^2, so
  // it must sit between sqrt(g/y_max) and sqrt(g/y_min) -- a Dunkerley-style
  // bracket that does not re-use the tile's arithmetic.
  const ys = [0.004, 0.019, 0.011];
  const r = computeShaftCriticalSpeedRayleigh({
    weight_1_lb: 120, deflection_1_in: ys[0], weight_2_lb: 340, deflection_2_in: ys[1], weight_3_lb: 90, deflection_3_in: ys[2],
  });
  const lo = 187.7 / Math.sqrt(Math.max(...ys));
  const hi = 187.7 / Math.sqrt(Math.min(...ys));
  assert.ok(r.critical_rpm > lo && r.critical_rpm < hi, `bracketed: ${lo} < ${r.critical_rpm} < ${hi}`);
  // Softening every station by 4x drops the critical speed by exactly half.
  const soft = computeShaftCriticalSpeedRayleigh({
    weight_1_lb: 120, deflection_1_in: 4 * ys[0], weight_2_lb: 340, deflection_2_in: 4 * ys[1], weight_3_lb: 90, deflection_3_in: 4 * ys[2],
  });
  within(soft.critical_rpm, r.critical_rpm / 2, 1e-9, "N_c goes as 1/sqrt(deflection)");
});

// ---- compressed-air-condensate: a psychrometric mass balance ----

test("compressed air: the water balance closes -- what comes in is condensed, dried out, or still vapor", () => {
  const cases = [
    { flow_scfm: 1000, inlet_temp_f: 70, inlet_rh_pct: 50, line_pressure_psig: 100, line_temp_f: 100, dryer_dew_point_f: 38 },
    { flow_scfm: 250, inlet_temp_f: 95, inlet_rh_pct: 90, line_pressure_psig: 125, line_temp_f: 110, dryer_dew_point_f: 35 },
    { flow_scfm: 50, inlet_temp_f: 50, inlet_rh_pct: 20, line_pressure_psig: 60, line_temp_f: 90, dryer_dew_point_f: 40 },
  ];
  for (const c of cases) {
    const r = computeCompressedAirCondensate(c);
    within(r.condensed_lb_hr + r.dryer_removed_lb_hr + r.remaining_vapor_lb_hr, r.intake_water_lb_hr, 1e-7, "water in = water out");
    assert.ok(r.condensed_lb_hr >= 0 && r.dryer_removed_lb_hr >= 0, "no stream runs backwards");
    within(r.total_liquid_gal_day, (r.condensed_lb_hr + r.dryer_removed_lb_hr) * 24 / 8.34, 1e-9, "8.34 lb to the gallon of water, 24 h to the day");
  }
});

test("compressed air: the intake load is the ASHRAE humidity ratio on 0.075 lb/scf of dry air", () => {
  // Saturation pressure of water at 70 F is 0.3632 psia (steam tables). At 50% RH
  // the vapor pressure is 0.1816 psia, so W = 0.62194 x 0.1816 / (14.696 - 0.1816)
  // = 0.00778 lb/lb -- the standard 70 F / 50% RH figure. 1,000 scfm carries
  // 1,000 x 0.075 x 60 = 4,500 lb/h of dry air and so 35.0 lb/h of water.
  const r = computeCompressedAirCondensate({
    flow_scfm: 1000, inlet_temp_f: 70, inlet_rh_pct: 50,
    line_pressure_psig: 100, line_temp_f: 100, dryer_dew_point_f: 38,
  });
  within(r.dry_air_lb_hr, 4500, 1e-9, "0.075 lb per standard cubic foot");
  within(r.intake_humidity_ratio, 0.00778, 1.0, "ASHRAE humidity ratio at 70 F, 50% RH");
  within(r.intake_water_lb_hr, 4500 * 0.00778, 1.0, "35 lb of water an hour");
  // Compressed to 100 psig and cooled to 100 F the air holds the saturated ratio
  // at 114.696 psia: 0.62194 x 0.95044 / (114.696 - 0.95044) = 0.005196 lb/lb.
  within(r.line_humidity_ratio, 0.005196, 1.0, "saturated at line pressure and temperature");
  assert.equal(r.saturated_in_line, true, "the line is wet");
});

test("compressed air: pressure, inlet moisture and the dryer each move the water the way physics says", () => {
  const base = { flow_scfm: 500, inlet_temp_f: 80, inlet_rh_pct: 70, line_pressure_psig: 100, line_temp_f: 100, dryer_dew_point_f: 38 };
  const r = computeCompressedAirCondensate(base);
  // Squeezing the same vapor into a smaller volume condenses more of it.
  const higher = computeCompressedAirCondensate({ ...base, line_pressure_psig: 175 });
  assert.ok(higher.condensed_lb_hr > r.condensed_lb_hr, "more pressure, more condensate");
  // Drier intake air carries less water in, so less comes out as liquid.
  const drier = computeCompressedAirCondensate({ ...base, inlet_rh_pct: 30 });
  assert.ok(drier.intake_water_lb_hr < r.intake_water_lb_hr, "less water in");
  assert.ok(drier.total_liquid_gal_day < r.total_liquid_gal_day, "and less liquid out");
  // A colder dryer leaves less vapor downstream.
  const colder = computeCompressedAirCondensate({ ...base, dryer_dew_point_f: 33 });
  assert.ok(colder.remaining_vapor_lb_hr < r.remaining_vapor_lb_hr, "a colder dew point leaves less vapor");
  assert.ok(colder.dryer_removed_lb_hr > r.dryer_removed_lb_hr, "and the dryer takes more out");
  // The water load is linear in flow: everything is per pound of dry air.
  const twice = computeCompressedAirCondensate({ ...base, flow_scfm: 1000 });
  for (const k of ["intake_water_lb_hr", "condensed_lb_hr", "dryer_removed_lb_hr", "remaining_vapor_lb_hr", "total_liquid_gal_day"]) {
    within(twice[k], 2 * r[k], 1e-9, `${k} is linear in flow`);
  }
  within(twice.intake_humidity_ratio, r.intake_humidity_ratio, 1e-12, "the ratio itself does not move with flow");
});

test("compressed air: the dried air's atmospheric dew point is far below the pressure dew point it left at", () => {
  // Letting compressed air down to atmosphere drops its dew point by roughly the
  // pressure ratio in vapor partial pressure, which is why a 38 F pressure dew
  // point is good enough for an outdoor tool line.
  const base = { flow_scfm: 400, inlet_temp_f: 85, inlet_rh_pct: 60, line_pressure_psig: 100, line_temp_f: 100 };
  const warm = computeCompressedAirCondensate({ ...base, dryer_dew_point_f: 100 });
  assert.ok(warm.atmospheric_dew_point_f !== null, "an atmospheric dew point is reported");
  assert.ok(warm.atmospheric_dew_point_f < 100, `expansion lowers the dew point: got ${warm.atmospheric_dew_point_f} F`);
  // At 100 psig the let-down drops the vapor partial pressure about 7.8x, which
  // from 100 F lands near 41 F.
  within(warm.atmospheric_dew_point_f, 41, 15, "about 41 F at atmosphere");
  // From a 38 F pressure dew point the atmospheric dew point is below freezing,
  // and the tile reports null there rather than extrapolating past the triple point.
  const cold = computeCompressedAirCondensate({ ...base, dryer_dew_point_f: 38 });
  assert.equal(cold.atmospheric_dew_point_f, null, "below freezing at atmosphere, so not reported");
  assert.ok(cold.remaining_vapor_lb_hr < warm.remaining_vapor_lb_hr, "the dried air carries much less vapor");
});

// ---- load-profitability: the accounting identity ----

test("load profitability: revenue minus every cost is the profit, and the costs add to the total", () => {
  const cases = [
    { linehaul_revenue: 2400, loaded_miles: 1100, deadhead_miles: 150, fuel_price: 4.05, mpg: 6.5, variable_cpm: 0.21, fixed_per_day: 185, days: 2.5, tolls: 48, other_costs: 30 },
    { linehaul_revenue: 650, loaded_miles: 300, deadhead_miles: 0, fuel_price: 3.60, mpg: 7.2, variable_cpm: 0.18, fixed_per_day: 200, days: 1, tolls: 0, other_costs: 0 },
  ];
  for (const c of cases) {
    const r = computeLoadProfitability(c);
    const miles = c.loaded_miles + c.deadhead_miles;
    within(r.total_miles, miles, 1e-12, "loaded plus deadhead");
    within(r.fuel_cost, miles / c.mpg * c.fuel_price, 1e-12, "gallons burned at the pump price");
    const hand = r.fuel_cost + miles * c.variable_cpm + c.fixed_per_day * c.days + c.tolls + c.other_costs;
    within(r.total_cost, hand, 1e-9, "every cost line adds up");
    within(r.net_profit, c.linehaul_revenue - r.total_cost, 1e-9, "revenue less cost");
    within(r.all_in_cpm * miles, r.total_cost, 1e-9, "the all-in cpm reconstructs the cost");
    within(r.rate_per_total_mile * miles, c.linehaul_revenue, 1e-9, "the rate per total mile reconstructs the revenue");
    within(r.profit_per_loaded_mile * c.loaded_miles, r.net_profit, 1e-9, "profit per loaded mile reconstructs the profit");
    // Break-even: the all-in cost per TOTAL mile is the rate that zeroes the load.
    const even = computeLoadProfitability({ ...c, linehaul_revenue: r.all_in_cpm * miles });
    assert.ok(Math.abs(even.net_profit) < 1e-6, `quoting the all-in cpm breaks even: got ${even.net_profit}`);
  }
});

test("load profitability: deadhead costs money and earns none, so it can sink a load that pays well loaded", () => {
  const base = { linehaul_revenue: 1500, loaded_miles: 500, fuel_price: 4.00, mpg: 6.0, variable_cpm: 0.25, fixed_per_day: 200, days: 1.5, tolls: 0, other_costs: 0 };
  const clean = computeLoadProfitability({ ...base, deadhead_miles: 0 });
  const dirty = computeLoadProfitability({ ...base, deadhead_miles: 300 });
  within(clean.rate_per_total_mile, 3.0, 1e-12, "$3.00 a mile loaded");
  within(dirty.rate_per_total_mile, 1500 / 800, 1e-12, "$1.88 a mile all in");
  // 300 extra miles at 4.00/6.0 + 0.25 = $0.9167/mi = $275 of cost, no revenue.
  within(clean.net_profit - dirty.net_profit, 300 * (4 / 6 + 0.25), 1e-9, "deadhead costs fuel plus variable, earns nothing");
  assert.ok(dirty.all_in_cpm < clean.all_in_cpm, "the fixed cost spreads over more miles");
  assert.ok(dirty.net_profit < clean.net_profit, "but the load is worse off");
});

// ---- maintenance-reserve: cents per mile that buy the part when it is due ----

test("maintenance reserve: a set's worth of cents accumulates to exactly one set over its life", () => {
  const c = { tire_set_cost: 4800, tire_life_mi: 160000, pm_cost: 420, pm_interval_mi: 25000, major_reserve_cpm: 0.045, monthly_miles: 9500 };
  const r = computeMaintenanceReserve(c);
  within(r.tire_cpm * c.tire_life_mi, c.tire_set_cost, 1e-9, "the tire reserve buys the tires");
  within(r.pm_cpm * c.pm_interval_mi, c.pm_cost, 1e-9, "the PM reserve pays for the PM");
  within(r.total_cpm, r.tire_cpm + r.pm_cpm + c.major_reserve_cpm, 1e-12, "the three lines add");
  within(r.monthly_reserve, r.total_cpm * c.monthly_miles, 1e-9, "cents per mile times miles a month");
  // Over a year the reserve is what twelve months of those miles consume.
  within(r.monthly_reserve * 12, r.total_cpm * c.monthly_miles * 12, 1e-9, "and it annualizes cleanly");
});

test("maintenance reserve: longer-lived tires and a longer PM interval cost proportionally less per mile", () => {
  const base = { tire_set_cost: 4800, tire_life_mi: 160000, pm_cost: 420, pm_interval_mi: 25000, major_reserve_cpm: 0, monthly_miles: 0 };
  const r = computeMaintenanceReserve(base);
  const long = computeMaintenanceReserve({ ...base, tire_life_mi: 320000, pm_interval_mi: 50000 });
  within(long.tire_cpm, r.tire_cpm / 2, 1e-12, "twice the life, half the cpm");
  within(long.pm_cpm, r.pm_cpm / 2, 1e-12, "twice the interval, half the cpm");
  const dear = computeMaintenanceReserve({ ...base, tire_set_cost: 9600 });
  within(dear.tire_cpm, 2 * r.tire_cpm, 1e-12, "twice the price, twice the cpm");
  assert.equal(r.monthly_reserve, null, "no monthly miles, no monthly figure");
});

// ---- gcwr-check: FMCSA 80,000 lb and the manufacturer's rating, whichever binds ----

test("GCWR: the binding limit is the SMALLER of the rating and the federal cap, and 80,000 lb is inclusive", () => {
  // 23 CFR 658.17(b): 80,000 lb gross on the Interstate system.
  const exact = computeGcwrCheck({ gcwr_lb: 80000, tractor_weight_lb: 18000, trailer_weight_lb: 62000 });
  within(exact.combined_lb, 80000, 1e-12, "tractor plus trailer");
  assert.equal(exact.ok, true, "exactly 80,000 lb is legal");
  within(exact.over_by, 0, 1e-9, "nothing over");
  // A truck rated below the federal cap is held to its own rating.
  const lowRated = computeGcwrCheck({ gcwr_lb: 66000, tractor_weight_lb: 17000, trailer_weight_lb: 55000 });
  assert.equal(lowRated.ok, false, "72,000 lb is inside the federal cap but over a 66,000 lb GCWR");
  within(lowRated.over_by, 6000, 1e-9, "over the rating by 6,000 lb");
  within(lowRated.margin_fed, 8000, 1e-9, "still 8,000 lb of federal headroom");
  assert.match(lowRated.verdict, /GCWR/, "the verdict names the rating, not the cap");
  // A heavy-rated truck is held to the federal cap.
  const highRated = computeGcwrCheck({ gcwr_lb: 140000, tractor_weight_lb: 20000, trailer_weight_lb: 70000 });
  assert.equal(highRated.ok, false, "90,000 lb is inside a 140,000 lb rating but over the cap");
  within(highRated.over_by, 10000, 1e-9, "over the cap by 10,000 lb");
  assert.match(highRated.verdict, /federal cap/, "the verdict names the cap");
});

test("GCWR: each margin is measured against its own limit, and ok is exactly 'neither margin is negative'", () => {
  for (const c of [
    { gcwr_lb: 80000, tractor_weight_lb: 17500, trailer_weight_lb: 50000 },
    { gcwr_lb: 52000, tractor_weight_lb: 15000, trailer_weight_lb: 40000 },
    { gcwr_lb: 105500, tractor_weight_lb: 19000, trailer_weight_lb: 59000, federal_max_lb: 105500 },
    { gcwr_lb: 80000, tractor_weight_lb: 30000, trailer_weight_lb: 55000 },
  ]) {
    const r = computeGcwrCheck(c);
    const fed = c.federal_max_lb ?? 80000;
    within(r.margin_gcwr, c.gcwr_lb - r.combined_lb, 1e-12, "margin to the rating");
    within(r.margin_fed, fed - r.combined_lb, 1e-12, "margin to the cap");
    assert.equal(r.ok, r.margin_gcwr >= -1e-6 && r.margin_fed >= -1e-6, "ok is both margins non-negative");
    within(r.over_by, r.combined_lb - Math.min(c.gcwr_lb, fed), 1e-9, "over_by is against the binding limit");
  }
});

// ---- motor-run-hours-for-budget: an energy-and-money round trip ----

test("motor run hours: the hours spend exactly the budget at the quoted rate -- a round trip in dollars", () => {
  for (const c of [
    { hp: 50, efficiency_pct: 93, load_factor_pct: 100, rate_usd_per_kwh: 0.12, cost_budget_usd: 5000 },
    { hp: 7.5, efficiency_pct: 88, load_factor_pct: 65, rate_usd_per_kwh: 0.095, cost_budget_usd: 400 },
    { hp: 200, efficiency_pct: 96, load_factor_pct: 80, rate_usd_per_kwh: 0.21, cost_budget_usd: 90000 },
  ]) {
    const r = computeMotorRunHoursForBudget(c);
    within(r.annual_kwh * c.rate_usd_per_kwh, c.cost_budget_usd, 1e-7, "the energy bought costs the budget");
    within(r.annual_kwh, r.input_kw * r.max_hours_per_year, 1e-9, "kWh is kW times hours");
  }
});

test("motor run hours: the draw is shaft power over efficiency at 0.746 kW per horsepower", () => {
  // 50 hp at full load is 37.3 kW of shaft power; at 93% efficient the motor
  // draws 40.11 kW. A 100% efficient motor would draw the shaft power exactly.
  const r = computeMotorRunHoursForBudget({ hp: 50, efficiency_pct: 93, load_factor_pct: 100, rate_usd_per_kwh: 0.12, cost_budget_usd: 5000 });
  within(r.input_kw, 50 * 0.746 / 0.93, 1e-9, "input kW");
  assert.ok(r.input_kw > 50 * 0.7457, "the input exceeds the shaft power -- losses are paid for");
  const ideal = computeMotorRunHoursForBudget({ hp: 50, efficiency_pct: 100, load_factor_pct: 100, rate_usd_per_kwh: 0.12, cost_budget_usd: 5000 });
  within(ideal.input_kw, 50 * 0.746, 1e-9, "a lossless motor draws its shaft power");
  // Half the load is half the draw and twice the hours; double the rate halves them.
  const half = computeMotorRunHoursForBudget({ hp: 50, efficiency_pct: 93, load_factor_pct: 50, rate_usd_per_kwh: 0.12, cost_budget_usd: 5000 });
  within(half.input_kw, r.input_kw / 2, 1e-9, "half the load, half the kW");
  within(half.max_hours_per_year, 2 * r.max_hours_per_year, 1e-9, "and twice the hours");
  const dear = computeMotorRunHoursForBudget({ hp: 50, efficiency_pct: 93, load_factor_pct: 100, rate_usd_per_kwh: 0.24, cost_budget_usd: 5000 });
  within(dear.max_hours_per_year, r.max_hours_per_year / 2, 1e-9, "twice the rate, half the hours");
});

test("motor run hours: a budget that buys more than 8,760 hours is returned as stated", () => {
  // SUSPECTED DEFECT (reported, not asserted as correct): the note talks about
  // the 8,760 hours in a year, but a budget larger than a year of running
  // returns the raw quotient with no flag that it exceeds a calendar year.
  const r = computeMotorRunHoursForBudget({ hp: 1, efficiency_pct: 90, load_factor_pct: 100, rate_usd_per_kwh: 0.05, cost_budget_usd: 10000 });
  assert.ok(r.max_hours_per_year > 8760, "the arithmetic itself is right: it just exceeds a year");
  within(r.annual_kwh * 0.05, 10000, 1e-7, "and the money still balances");
});

// ---- motor-rms-hp: root-mean-square duty-cycle heating ----

test("motor RMS hp: a two-step cycle with no cooling penalty is the textbook RMS, by hand", () => {
  // 20 hp for 10 s then 0 hp for 20 s, C = 1: sqrt((400 x 10) / 30) = 11.547 hp.
  const r = computeMotorRmsHp({ hp_run: 20, run_time_s: 10, hp_idle: 0, idle_time_s: 20, cooling_factor: 1 });
  within(r.rms_hp, Math.sqrt(4000 / 30), 1e-12, "sqrt of the mean square");
  within(r.effective_time_s, 30, 1e-12, "the whole cycle counts when C = 1");
  // RMS is never below the time-weighted mean (Cauchy-Schwarz), and never above the peak.
  const mean = (20 * 10 + 0 * 20) / 30;
  assert.ok(r.rms_hp >= mean - 1e-12, `RMS ${r.rms_hp} >= mean ${mean}`);
  assert.ok(r.rms_hp <= 20 + 1e-12, "and never above the peak");
});

test("motor RMS hp: only STOPPED time is discounted, so a motor still turning at light load keeps full cooling", () => {
  // C = 3 on 20 s of standstill: effective time 10 + 20/3 = 16.667 s, and
  // sqrt(4000/16.667) = 15.49 hp -- a bigger motor than the C = 1 answer.
  const stopped = computeMotorRmsHp({ hp_run: 20, run_time_s: 10, hp_idle: 0, idle_time_s: 20, cooling_factor: 3 });
  within(stopped.effective_time_s, 10 + 20 / 3, 1e-12, "standstill time divided by C");
  within(stopped.rms_hp, Math.sqrt(4000 / (10 + 20 / 3)), 1e-12, "hand RMS with the cooling penalty");
  assert.ok(stopped.rms_hp > Math.sqrt(4000 / 30), "losing the fan asks for more motor");
  // A second segment that still runs keeps its full time no matter what C says.
  const running = computeMotorRmsHp({ hp_run: 20, run_time_s: 10, hp_idle: 4, idle_time_s: 20, cooling_factor: 3 });
  within(running.effective_time_s, 30, 1e-12, "a running segment is not discounted");
  within(running.rms_hp, Math.sqrt((400 * 10 + 16 * 20) / 30), 1e-12, "hand RMS of the two running steps");
  assert.ok(running.rms_hp < stopped.rms_hp, "4 hp of light running is easier than standstill");
});

test("motor RMS hp: a constant load reads back as itself, and the figure is homogeneous in horsepower", () => {
  // If both segments carry the same load the cycle is constant, and the RMS of a
  // constant is that constant -- whatever the cooling factor says.
  for (const C of [1, 2, 3, 6]) {
    const r = computeMotorRmsHp({ hp_run: 12, run_time_s: 7, hp_idle: 12, idle_time_s: 13, cooling_factor: C });
    within(r.rms_hp, 12, 1e-12, `constant load at C=${C}`);
  }
  // Doubling every horsepower doubles the RMS; stretching every time leaves it alone.
  const a = computeMotorRmsHp({ hp_run: 15, run_time_s: 8, hp_idle: 3, idle_time_s: 12, cooling_factor: 2 });
  const doubled = computeMotorRmsHp({ hp_run: 30, run_time_s: 8, hp_idle: 6, idle_time_s: 12, cooling_factor: 2 });
  within(doubled.rms_hp, 2 * a.rms_hp, 1e-12, "linear in horsepower");
  const stretched = computeMotorRmsHp({ hp_run: 15, run_time_s: 24, hp_idle: 3, idle_time_s: 36, cooling_factor: 2 });
  within(stretched.rms_hp, a.rms_hp, 1e-12, "a slower clock on the same cycle changes nothing");
});

// ---- vfd-energy-savings: the affinity cube law over duty-cycle bins ----

test("VFD savings: a single bin at flow fraction f saves exactly 1 - f^3 of its energy", () => {
  // Centrifugal affinity law: P/P_full = (Q/Q_full)^3. Half flow is an eighth of
  // the power, which is the well-known 87.5% saving.
  for (const [f, want] of [[1.0, 0], [0.9, 1 - 0.729], [0.75, 1 - 0.421875], [0.5, 0.875], [0.25, 1 - 0.015625]]) {
    const r = computeVfdEnergySavings({ full_load_kw: 100, frac_a: f, hours_a: 1000, frac_b: 0, hours_b: 0, frac_c: 0, hours_c: 0, rate_kwh: 0.11 });
    within(r.saved_pct / 100, want, 1e-9, `saving at f=${f}`);
    within(r.vfd_kwh, 100 * 1000 * f ** 3, 1e-9, "cube law on the bin");
  }
});

test("VFD savings: the bins close -- VFD energy plus savings is the full-speed energy, and the dollars follow", () => {
  const cases = [
    { full_load_kw: 75, frac_a: 1.0, hours_a: 500, frac_b: 0.8, hours_b: 2500, frac_c: 0.6, hours_c: 3000, rate_kwh: 0.113 },
    { full_load_kw: 15, frac_a: 0.95, hours_a: 1200, frac_b: 0.7, hours_b: 2400, frac_c: 0.4, hours_c: 1800, rate_kwh: 0.21 },
  ];
  for (const c of cases) {
    const r = computeVfdEnergySavings(c);
    const hours = c.hours_a + c.hours_b + c.hours_c;
    within(r.full_kwh, c.full_load_kw * hours, 1e-9, "full speed is the rating for every hour");
    within(r.vfd_kwh + r.saved_kwh, r.full_kwh, 1e-9, "the energy balance closes");
    within(r.saved_usd, r.saved_kwh * c.rate_kwh, 1e-9, "dollars are kWh at the rate");
    within(r.saved_pct, r.saved_kwh / r.full_kwh * 100, 1e-9, "the percentage is the ratio");
    // The combined saving must be the hour-weighted mean of the per-bin savings.
    const weighted = (c.hours_a * (1 - c.frac_a ** 3) + c.hours_b * (1 - c.frac_b ** 3) + c.hours_c * (1 - c.frac_c ** 3)) / hours;
    within(r.saved_pct / 100, weighted, 1e-9, "hour-weighted mean of the bin savings");
    assert.ok(r.vfd_kwh <= r.full_kwh + 1e-9, "a VFD never uses more than full speed, on this model");
    // Savings are linear in motor size and in hours.
    const big = computeVfdEnergySavings({ ...c, full_load_kw: 2 * c.full_load_kw });
    within(big.saved_kwh, 2 * r.saved_kwh, 1e-9, "twice the motor, twice the saving");
    within(big.saved_pct, r.saved_pct, 1e-12, "but the same percentage");
  }
});

test("VFD savings: running everything at full speed saves nothing, and the cube law beats a linear guess", () => {
  const none = computeVfdEnergySavings({ full_load_kw: 40, frac_a: 1, hours_a: 4000, frac_b: 1, hours_b: 2000, frac_c: 1, hours_c: 0, rate_kwh: 0.1 });
  within(none.saved_kwh, 0, 1e-9, "no turndown, no saving");
  within(none.saved_usd, 0, 1e-9, "and no money");
  // At 70% flow the cube law says 65.7% saved where a throttle (roughly linear in
  // flow) would save about 30%: the cube is the whole point of the tile.
  const r = computeVfdEnergySavings({ full_load_kw: 40, frac_a: 0.7, hours_a: 6000, frac_b: 0, hours_b: 0, frac_c: 0, hours_c: 0, rate_kwh: 0.1 });
  within(r.saved_pct, (1 - 0.343) * 100, 1e-9, "65.7% at 70% flow");
  assert.ok(r.saved_pct > (1 - 0.7) * 100, "well past the linear guess");
});

// ---- crane-load-radius-boom: plane trigonometry ----

test("crane geometry: the boom closes a right triangle -- (R - offset)^2 + (H - foot)^2 = L^2", () => {
  // Pythagoras on the boom itself, which never touches the tile's cos/sin.
  for (const boom_angle_deg of [0, 15, 30, 45, 53.13010235, 60, 75, 90]) {
    for (const boom_length_ft of [30, 80, 180]) {
      const r = computeCraneLoadRadiusBoom({
        boom_length_ft, boom_angle_deg, boom_foot_offset_ft: 4, boom_foot_height_ft: 6, target_radius_ft: 25,
      });
      const horiz = r.load_radius_ft - 4;
      const vert = r.boom_tip_height_ft - 6;
      within(Math.hypot(horiz, vert), boom_length_ft, 1e-9, `boom length at ${boom_angle_deg} deg`);
      assert.ok(horiz >= -1e-9 && vert >= -1e-9, "both legs are forward and up");
    }
  }
});

test("crane geometry: a 3-4-5 boom -- 50 ft at 53.13 degrees reaches 30 ft out and 40 ft up", () => {
  const r = computeCraneLoadRadiusBoom({
    boom_length_ft: 50, boom_angle_deg: Math.acos(0.6) * 180 / Math.PI,
    boom_foot_offset_ft: 0, boom_foot_height_ft: 0, target_radius_ft: 30,
  });
  within(r.load_radius_ft, 30, 1e-9, "3-4-5 horizontal leg");
  within(r.boom_tip_height_ft, 40, 1e-9, "3-4-5 vertical leg");
  // A vertical boom is all height and no reach past the foot; a horizontal boom the reverse.
  const up = computeCraneLoadRadiusBoom({ boom_length_ft: 50, boom_angle_deg: 90, boom_foot_offset_ft: 4, boom_foot_height_ft: 6, target_radius_ft: 30 });
  within(up.load_radius_ft, 4, 1e-9, "straight up, radius is the foot offset");
  within(up.boom_tip_height_ft, 56, 1e-9, "straight up, full length above the foot");
  const flat = computeCraneLoadRadiusBoom({ boom_length_ft: 50, boom_angle_deg: 0, boom_foot_offset_ft: 4, boom_foot_height_ft: 6, target_radius_ft: 30 });
  within(flat.load_radius_ft, 54, 1e-9, "horizontal, full length ahead of the foot");
  within(flat.boom_tip_height_ft, 6, 1e-9, "horizontal, no gain in height");
});

test("crane geometry: the angle for a target radius is the exact inverse, and an unreachable target says so", () => {
  const base = { boom_length_ft: 90, boom_foot_offset_ft: 5, boom_foot_height_ft: 7 };
  for (const target_radius_ft of [10, 25, 50, 94.999]) {
    const r = computeCraneLoadRadiusBoom({ ...base, boom_angle_deg: 60, target_radius_ft });
    assert.equal(r.target_reachable, true, `${target_radius_ft} ft is inside the boom`);
    const back = computeCraneLoadRadiusBoom({ ...base, boom_angle_deg: r.angle_for_target_radius_deg, target_radius_ft });
    within(back.load_radius_ft, target_radius_ft, 1e-7, "swinging to that angle puts the hook on the target radius");
  }
  // Past offset + length there is no angle at all; and radius falls as the boom comes up.
  const far = computeCraneLoadRadiusBoom({ ...base, boom_angle_deg: 60, target_radius_ft: 120 });
  assert.equal(far.target_reachable, false, "120 ft is past 5 + 90");
  assert.equal(far.angle_for_target_radius_deg, null, "and no angle is offered");
  let previous = Infinity;
  for (const boom_angle_deg of [10, 30, 50, 70, 85]) {
    const r = computeCraneLoadRadiusBoom({ ...base, boom_angle_deg, target_radius_ft: 25 });
    assert.ok(r.load_radius_ft < previous, "booming up always shortens the radius");
    previous = r.load_radius_ft;
  }
});
