// Independent reference checks for the generator, line, PV, low-voltage and
// lighting tiles, against references their specs did not write. The
// worked-example fixture recomputes each spec's own example, so a spec and its
// tile that share an error agree with each other; these tests hold the tiles to
// conservation laws, to published code values re-derived here, and to the
// conventions their notes claim.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGeneratorAltitudeTempDerate,
  computeGeneratorFleetFuelResupply,
  computeCriticalLoadShedTiers,
  computeMpptControllerOutputCurrent,
  computeRadioSiteDutyCycleBattery,
  computeGeneratorBatteryHybridFuel,
} from "../../calc-reliefpower.js";
import {
  computeConductorSagAtTemperature,
  computeConductorUpliftCheck,
  computeLineGroundClearanceNesc,
  computeRecloserFuseCoordination,
  computeCounterpoiseResistance,
} from "../../calc-lineworker.js";
import {
  computeEvDcfcTime,
  computePvRowShadeAngle,
  computePvRowSpacing,
  computeBatteryTouArbitrage,
  computePvMaxAmbientForPower,
  computePvCellTemperaturePower,
} from "../../calc-solar.js";
import {
  computeCctvRetentionDays,
  computeAccessControlPowerSupply,
  computeLvCablePullFootage,
  computeCableSupportJhook,
} from "../../calc-lowvoltage.js";
import {
  computeConduitExpansionMaxRun,
  computeConduitThermalExpansion,
  computeBatteryVentMaxCurrent,
  computeBatteryHydrogenVent,
  computeEconomicConductorSizing,
} from "../../calc-electrical.js";
import {
  computeLuminaireSpacingMh,
  computeLumenMethod,
  computeLightingUniformityRatio,
} from "../../calc-elecdesign.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- generator-altitude-temp-derate ----

test("generator altitude/temp derate: the two combination methods differ by exactly their product, and addition is always the conservative one", () => {
  // Two independent losses of a and t percent leave (1-a)(1-t) when applied in
  // series; adding them subtracts a+t, which is a*t/100 more. So the added
  // method can never report MORE kW than the multiplied one, at any conditions.
  const base = { rated_kw: 300, altitude_threshold_ft: 1800, altitude_step_ft: 1312, altitude_rate_pct: 7, temp_threshold_f: 104, temp_step_f: 18, temp_rate_pct: 7 };
  for (const [elev, amb] of [[5000, 110], [1800, 104], [12000, 95], [3000, 130], [9000, 122]]) {
    const r = computeGeneratorAltitudeTempDerate({ ...base, site_elevation_ft: elev, site_ambient_f: amb });
    const a = r.altitude_derate_pct, t = r.temperature_derate_pct;
    within(r.multiplied_derate_pct, a + t - a * t / 100, 1e-9, "series combination");
    assert.ok(r.available_multiplied_kw >= r.available_kw - 1e-9, "addition is the conservative method");
    within(r.method_difference_kw, base.rated_kw * a * t / 1e4, 1e-7, "the gap between methods is the product term");
    within(r.available_kw + r.lost_kw, base.rated_kw, 1e-9, "kW conserved: available plus lost is the rating");
  }
});

test("generator altitude/temp derate: inside both thresholds there is no derate, and beyond them the loss is linear in the overshoot", () => {
  const base = { rated_kw: 300, altitude_threshold_ft: 1800, altitude_step_ft: 1312, altitude_rate_pct: 7, temp_threshold_f: 104, temp_step_f: 18, temp_rate_pct: 7 };
  const inside = computeGeneratorAltitudeTempDerate({ ...base, site_elevation_ft: 1000, site_ambient_f: 90 });
  within(inside.available_kw, 300, 1e-9, "no derate inside both thresholds");
  // Doubling the overshoot doubles each derate: the data sheets state a flat
  // percentage per step, not a curve.
  const one = computeGeneratorAltitudeTempDerate({ ...base, site_elevation_ft: 1800 + 1312, site_ambient_f: 104 + 18 });
  const two = computeGeneratorAltitudeTempDerate({ ...base, site_elevation_ft: 1800 + 2624, site_ambient_f: 104 + 36 });
  within(one.altitude_derate_pct, 7, 1e-9, "one altitude step is one rate");
  within(one.temperature_derate_pct, 7, 1e-9, "one temperature step is one rate");
  within(two.altitude_derate_pct, 14, 1e-9, "two steps, twice the derate");
  within(two.temperature_derate_pct, 14, 1e-9, "two steps, twice the derate");
  assert.equal(computeGeneratorAltitudeTempDerate({ ...base, site_elevation_ft: 9000, site_ambient_f: 104 }).governing_derate, "altitude");
  assert.equal(computeGeneratorAltitudeTempDerate({ ...base, site_elevation_ft: 1800, site_ambient_f: 140 }).governing_derate, "temperature");
});

// ---- generator-fleet-fuel-resupply ----

test("generator fleet fuel: a tank empties in tank x usable / burn hours, and the fleet burns what its units burn", () => {
  const c = { size1_count: 4, size1_kw: 60, size1_tank_gal: 100, size1_burn_gph: 0, size2_count: 6, size2_kw: 150, size2_tank_gal: 300, size2_burn_gph: 0, size3_count: 2, size3_kw: 300, size3_tank_gal: 500, size3_burn_gph: 0, usable_fraction: 0.9, truck_gal: 2400 };
  const r = computeGeneratorFleetFuelResupply(c);
  // USACE rule of thumb, 0.07 gph per kW (EPA Power Resilience Guide, Sec. 4).
  within(r.size1_unit_gph, 0.07 * 60, 1e-9, "60 kW at the USACE rule");
  within(r.size2_unit_gph, 0.07 * 150, 1e-9, "150 kW at the USACE rule");
  // Volume balance: a 100 gal tank 90% usable at 4.2 gph runs 21.43 h.
  within(r.size1_interval_hours, 100 * 0.9 / 4.2, 1e-9, "size 1 interval");
  within(r.size2_interval_hours, 300 * 0.9 / 10.5, 1e-9, "size 2 interval");
  within(r.size3_interval_hours, 500 * 0.9 / 21, 1e-9, "size 3 interval");
  within(r.shortest_interval_hours, Math.min(r.size1_interval_hours, r.size2_interval_hours, r.size3_interval_hours), 1e-9, "the route is set by the first unit to run dry");
  within(r.fleet_kw, 4 * 60 + 6 * 150 + 2 * 300, 1e-9, "fleet kW");
  // Gallons a day = every unit's burn for 24 hours.
  within(r.fleet_fuel_gal_per_day, (4 * 4.2 + 6 * 10.5 + 2 * 21) * 24, 1e-9, "fleet gallons a day");
  within(r.fleet_fuel_70_gal_per_day, 0.7 * r.fleet_fuel_gal_per_day, 1e-9, "the 70% line is 70% of the rule's full-load figure");
  assert.equal(r.trips_per_day, Math.ceil(r.fleet_fuel_gal_per_day / 2400), "trips is the daily volume over the truck, rounded up");
});

test("generator fleet fuel: an entered burn rate displaces the rule, and a bigger truck never needs more trips", () => {
  const c = { size1_count: 2, size1_kw: 100, size1_tank_gal: 200, size1_burn_gph: 8, size2_count: 0, size3_count: 0, usable_fraction: 0.9, truck_gal: 500 };
  const r = computeGeneratorFleetFuelResupply(c);
  within(r.size1_unit_gph, 8, 1e-9, "the entered burn is used, not 0.07 x 100 = 7");
  within(r.fleet_fuel_gal_per_day, 2 * 8 * 24, 1e-9, "384 gal/day");
  assert.equal(r.trips_per_day, 1, "384 gal fits one 500 gal truck");
  // SUSPECTED DEFECT: the 70% comparison line always uses the USACE rule even
  // where actual burn rates were entered, so here it reports 0.7 x 0.07 x 200 x
  // 24 = 235 gal/day against an entered-rate figure of 384 -- the two lines are
  // not the same fleet. The output label says "rule scaled linearly", so the
  // current behavior is asserted rather than changed.
  within(r.fleet_fuel_70_gal_per_day, 0.7 * 0.07 * 200 * 24, 1e-9, "the 70% line ignores entered burn rates");
  // Monotone in truck size: trips cannot rise when the truck grows.
  let prev = Infinity;
  for (const truck of [100, 200, 400, 800, 1600]) {
    const t = computeGeneratorFleetFuelResupply({ ...c, truck_gal: truck }).trips_per_day;
    assert.ok(t <= prev, `trips fall with truck size: ${t} after ${prev}`);
    prev = t;
  }
});

// ---- critical-load-shed-tiers ----

test("critical load shed: whole tiers are served strictly in priority order -- the served set is a prefix and the first tier that does not fit stops it", () => {
  const cases = [
    { source_kw: 100, tier1_kw: 30, tier2_kw: 40, tier3_kw: 50, tier4_kw: 10, usable_kwh: 0 },
    { source_kw: 20, tier1_kw: 30, tier2_kw: 5, tier3_kw: 5, tier4_kw: 5, usable_kwh: 0 },
    { source_kw: 500, tier1_kw: 30, tier2_kw: 40, tier3_kw: 50, tier4_kw: 10, usable_kwh: 0 },
  ];
  for (const c of cases) {
    const r = computeCriticalLoadShedTiers(c);
    const t = [c.tier1_kw, c.tier2_kw, c.tier3_kw, c.tier4_kw];
    const prefix = t.slice(0, r.tiers_served).reduce((s, v) => s + v, 0);
    within(r.served_kw, prefix, 1e-9, "served is the prefix sum");
    assert.ok(r.served_kw <= c.source_kw + 1e-9, "the source carries what is served");
    if (r.tiers_served < 4) {
      assert.ok(prefix + t[r.tiers_served] > c.source_kw + 1e-9, "the next tier genuinely does not fit");
    }
    within(r.served_kw + r.shed_kw, r.total_kw, 1e-9, "kW conserved: served plus shed is the connected load");
    within(r.headroom_kw, c.source_kw - r.served_kw, 1e-9, "headroom");
    within(r.served_pct + 100 * r.shed_kw / r.total_kw, 100, 1e-9, "the shares add to 100%");
  }
  // 100 kW against 30/40/50 serves tiers 1 and 2 (70 kW) and sheds tier 3,
  // even though 30 + 10 of tier 4 would have fit: priority, not packing.
  const r = computeCriticalLoadShedTiers(cases[0]);
  assert.equal(r.tiers_served, 2);
  within(r.served_kw, 70, 1e-9, "no out-of-order packing");
});

test("critical load shed: runtime is energy over power -- halving the load doubles the hours, and the served runtime is the cumulative one", () => {
  const c = { source_kw: 100, tier1_kw: 25, tier2_kw: 25, tier3_kw: 100, tier4_kw: 0, usable_kwh: 200 };
  const r = computeCriticalLoadShedTiers(c);
  within(r.runtime_tier1_hours, 200 / 25, 1e-9, "200 kWh at 25 kW is 8 h");
  within(r.runtime_tiers12_hours, 200 / 50, 1e-9, "at 50 kW, 4 h");
  within(r.runtime_tiers123_hours, 200 / 150, 1e-9, "at 150 kW, 1.333 h");
  within(r.runtime_served_hours * r.served_kw, 200, 1e-9, "energy balance: kW x hours is the usable kWh");
  // Energy is the only thing that sets runtime: double the store, double the hours.
  const r2 = computeCriticalLoadShedTiers({ ...c, usable_kwh: 400 });
  within(r2.runtime_tier1_hours / r.runtime_tier1_hours, 2, 1e-9, "runtime is linear in stored energy");
  assert.equal(computeCriticalLoadShedTiers({ ...c, usable_kwh: 0 }).runtime_tier1_hours, null, "a fuel-fed source has no energy-limited runtime");
});

// ---- mppt-controller-output-current ----

test("MPPT controller output: the converter conserves power, so output current rises as the battery voltage falls", () => {
  // An MPPT controller is a DC-DC converter: P_out = P_in (ideal). At a fixed
  // array wattage the output current is inversely proportional to battery
  // voltage -- a 2,000 W array makes twice the amps into 24 V as into 48 V.
  const W = 2000;
  const a12 = computeMpptControllerOutputCurrent({ array_w: W, battery_v: 12, chosen_controller_a: 200 });
  const a24 = computeMpptControllerOutputCurrent({ array_w: W, battery_v: 24, chosen_controller_a: 200 });
  const a48 = computeMpptControllerOutputCurrent({ array_w: W, battery_v: 48, chosen_controller_a: 200 });
  for (const r of [a12, a24, a48]) assert.ok(!r.error, r.error);
  within(a12.output_current_a * 12, W, 1e-9, "power conserved at 12 V");
  within(a24.output_current_a * 24, W, 1e-9, "power conserved at 24 V");
  within(a48.output_current_a * 48, W, 1e-9, "power conserved at 48 V");
  assert.ok(a12.output_current_a > a24.output_current_a && a24.output_current_a > a48.output_current_a, "current rises as the battery voltage falls");
  within(a24.output_current_a / a48.output_current_a, 2, 1e-9, "halving the voltage doubles the current");
});

test("MPPT controller output: the chosen rating carries 125% conductors (NEC 690.8(B)) and the picked rating is the smallest common one that fits", () => {
  const standards = [20, 30, 40, 45, 60, 80, 100];
  for (const [w, v] of [[1000, 48], [2000, 48], [1200, 24], [600, 12], [3000, 48]]) {
    const r = computeMpptControllerOutputCurrent({ array_w: w, battery_v: v });
    within(r.min_conductor_a, 1.25 * r.controller_a, 1e-9, "125% of the controller rating");
    assert.ok(r.controller_count * r.controller_a >= r.output_current_a - 1e-9, "the controller bank covers the current");
    if (r.controller_count === 1 && r.controller_a < 100) {
      const smaller = standards.filter((a) => a < r.controller_a);
      for (const s of smaller) assert.ok(s < r.output_current_a - 1e-9, `${s} A would have been too small`);
      assert.ok(standards.includes(r.controller_a), "a standard rating was picked");
    }
    within(r.controller_capacity_w, r.controller_count * r.controller_a * v, 1e-9, "bank capacity");
    within(r.array_ratio, w / r.controller_capacity_w, 1e-9, "array-to-controller ratio");
  }
  // A 5,000 W array on 24 V is 208 A, past the largest common 100 A rating:
  // three paralleled, and the array still fits inside them.
  const big = computeMpptControllerOutputCurrent({ array_w: 5000, battery_v: 24 });
  within(big.output_current_a, 5000 / 24, 1e-9, "208.3 A");
  assert.equal(big.controller_a, 100);
  assert.equal(big.controller_count, 3);
  assert.ok(big.array_ratio < 1 && big.clipping === "no clipping at STC");
});

// ---- radio-site-duty-cycle-battery ----

test("radio site battery: the duty-weighted average is a true average -- charge over a day equals each state's current times its hours", () => {
  const c = { transmit_a: 8, receive_a: 1.5, standby_a: 0.3, transmit_duty_pct: 5, receive_duty_pct: 5, standby_duty_pct: 90, runtime_hours: 24, depth_of_discharge_fraction: 0.5 };
  const r = computeRadioSiteDutyCycleBattery(c);
  // 5-5-90 over 24 h is 1.2 h transmitting, 1.2 h receiving, 21.6 h standby.
  const ah_by_hours = 8 * 1.2 + 1.5 * 1.2 + 0.3 * 21.6;
  within(r.daily_ah, ah_by_hours, 1e-9, "amp-hours a day by the clock");
  within(r.average_a, ah_by_hours / 24, 1e-9, "the average current is the daily charge over 24 h");
  within(r.runtime_ah, r.average_a * 24, 1e-9, "24 h of runtime is one day of charge");
  // The battery must be bigger than the charge drawn by exactly 1/DoD.
  within(r.battery_nameplate_ah * 0.5, r.runtime_ah, 1e-9, "half of nameplate is the usable charge at 50% DoD");
  within(computeRadioSiteDutyCycleBattery({ ...c, depth_of_discharge_fraction: 0.8 }).battery_nameplate_ah * 0.8, r.runtime_ah, 1e-9, "at 80% DoD too");
  // The average is bounded by the extremes it averages, and a 100% single-state
  // duty must return that state's own current.
  assert.ok(r.average_a >= 0.3 && r.average_a <= 8, "the average lies between the lightest and heaviest state");
  within(computeRadioSiteDutyCycleBattery({ ...c, transmit_duty_pct: 100, receive_duty_pct: 0, standby_duty_pct: 0 }).average_a, 8, 1e-9, "all transmit is the transmit current");
  within(r.transmit_energy_share_pct, 100 * 0.05 * 8 / r.average_a, 1e-9, "transmit's share of the charge");
});

// ---- generator-battery-hybrid-fuel ----

test("generator/battery hybrid: the run hours close the daily energy balance -- what the engine makes feeds the load and the battery, net of the round-trip loss", () => {
  const curve = { rating_kw: 100, fuel_quarter_gph: 2.4, fuel_half_gph: 4.1, fuel_three_quarter_gph: 5.8, fuel_full_gph: 7.6 };
  for (const [load, set, rte] of [[20, 60, 0.85], [35, 100, 0.90], [10, 50, 0.70], [45, 75, 0.95]]) {
    const r = computeGeneratorBatteryHybridFuel({ ...curve, load_kw: load, setpoint_kw: set, round_trip_efficiency: rte, cycles_per_day: 1 });
    assert.ok(!r.error, r.error);
    const h = r.generator_hours_per_day;
    assert.ok(h > 0 && h < 24, "the engine runs part of the day");
    // While running: load takes load_kw, the surplus charges. While off: the
    // battery carries the load. Energy served must be 24 h of load.
    within(load * h + (set - load) * h * rte, load * 24, 1e-7, "kWh in = kWh out, with the round-trip loss paid on the stored part");
    within(r.battery_kwh_per_cycle, load * (24 - h), 1e-9, "the battery delivers the off-hours load");
    within(r.hybrid_gal_per_day, h * r.setpoint_gph, 1e-9, "fuel is run hours times the burn at the set point");
    within(r.continuous_gal_per_day, 24 * r.load_gph, 1e-9, "the baseline runs all day at the load");
    within(r.hybrid_gal_per_day + r.saving_gal_per_day, r.continuous_gal_per_day, 1e-9, "gallons conserved");
    within(r.run_hour_reduction_pct, 100 * (24 - h) / 24, 1e-9, "run-hour reduction");
  }
});

test("generator/battery hybrid: a perfect battery and a set point at the load is just continuous running, and cycles only split the same stored energy", () => {
  const curve = { rating_kw: 100, fuel_quarter_gph: 2.4, fuel_half_gph: 4.1, fuel_three_quarter_gph: 5.8, fuel_full_gph: 7.6 };
  // Set point barely above the load: almost no surplus, so the engine runs
  // almost all day and saves almost nothing.
  const near = computeGeneratorBatteryHybridFuel({ ...curve, load_kw: 40, setpoint_kw: 40.0001, round_trip_efficiency: 1, cycles_per_day: 1 });
  assert.ok(near.generator_hours_per_day > 23.99, "a vanishing surplus means a full day of running");
  // A lossless store and a set point at twice the load halves the run hours.
  const half = computeGeneratorBatteryHybridFuel({ ...curve, load_kw: 40, setpoint_kw: 80, round_trip_efficiency: 1, cycles_per_day: 1 });
  within(half.generator_hours_per_day, 12, 1e-9, "lossless, 2x load set point: 12 h");
  // Losses can only add run hours, never remove them.
  const lossy = computeGeneratorBatteryHybridFuel({ ...curve, load_kw: 40, setpoint_kw: 80, round_trip_efficiency: 0.8, cycles_per_day: 1 });
  assert.ok(lossy.generator_hours_per_day > half.generator_hours_per_day, "a lossier battery runs the engine longer");
  // Cycling more times a day splits the same stored energy into smaller cycles.
  const c2 = computeGeneratorBatteryHybridFuel({ ...curve, load_kw: 40, setpoint_kw: 80, round_trip_efficiency: 0.8, cycles_per_day: 2 });
  within(c2.battery_kwh_per_cycle * 2, lossy.battery_kwh_per_cycle, 1e-9, "twice the cycles, half the size each");
  within(c2.hybrid_gal_per_day, lossy.hybrid_gal_per_day, 1e-9, "cycle count does not change the fuel");
});

// ---- conductor-sag-at-temperature ----

test("conductor sag at temperature: the change-of-state tension closes the conductor's length balance (arc-length growth = thermal plus elastic strain)", () => {
  // A parabolic conductor of span L and horizontal tension H has arc length
  // L + w^2 L^3 / (24 H^2). Going from state 1 to state 2 the arc length must
  // grow by exactly L x [alpha x dT + (H2 - H1)/EA]. This identity is the
  // physics behind the cubic, and it never looks at how the cubic was solved.
  const cases = [
    { span_ft: 600, area_in2: 0.5281, weight1_lb_per_ft: 1.094, modulus_psi: 8.6e6, alpha_per_f: 1.28e-5, tension1_lb: 4500, temp1_f: 60, temp2_f: 167, rated_strength_lb: 22000 },
    { span_ft: 400, area_in2: 0.3122, weight1_lb_per_ft: 0.6, modulus_psi: 1.0e7, alpha_per_f: 1.06e-5, tension1_lb: 2200, temp1_f: 32, temp2_f: 212, rated_strength_lb: 12000 },
    { span_ft: 800, area_in2: 0.7264, weight1_lb_per_ft: 1.5, weight2_lb_per_ft: 3.1, modulus_psi: 9.0e6, alpha_per_f: 1.1e-5, tension1_lb: 6000, temp1_f: 60, temp2_f: 0, rated_strength_lb: 31500 },
  ];
  for (const c of cases) {
    const r = computeConductorSagAtTemperature(c);
    assert.ok(!r.error, r.error);
    const L = c.span_ft, EA = c.modulus_psi * c.area_in2;
    const w1 = c.weight1_lb_per_ft, w2 = c.weight2_lb_per_ft ?? c.weight1_lb_per_ft;
    const arc1 = L + w1 * w1 * L ** 3 / (24 * c.tension1_lb ** 2);
    const arc2 = L + w2 * w2 * L ** 3 / (24 * r.tension2_lb ** 2);
    const want = L * (c.alpha_per_f * (c.temp2_f - c.temp1_f) + (r.tension2_lb - c.tension1_lb) / EA);
    within(arc2 - arc1, want, 1e-6, "length balance closes");
    // Parabolic sag identity, S = w L^2 / (8 H), at both states.
    within(r.sag1_ft, w1 * L * L / (8 * c.tension1_lb), 1e-9, "initial sag");
    within(r.sag2_ft, w2 * L * L / (8 * r.tension2_lb), 1e-9, "final sag");
    within(r.sag_increase_ft, r.sag2_ft - r.sag1_ft, 1e-9, "sag change");
  }
});

test("conductor sag at temperature: heating a conductor lengthens it, so sag grows and tension falls, monotonically", () => {
  const base = { span_ft: 600, area_in2: 0.5281, weight1_lb_per_ft: 1.094, modulus_psi: 8.6e6, alpha_per_f: 1.28e-5, tension1_lb: 4500, temp1_f: 60, rated_strength_lb: 22000 };
  let lastSag = -Infinity, lastTension = Infinity;
  for (const t2 of [0, 32, 60, 90, 120, 167, 212]) {
    const r = computeConductorSagAtTemperature({ ...base, temp2_f: t2 });
    assert.ok(!r.error, r.error);
    assert.ok(r.sag2_ft > lastSag, `sag grows with temperature at ${t2} F`);
    assert.ok(r.tension2_lb < lastTension, `tension falls with temperature at ${t2} F`);
    lastSag = r.sag2_ft; lastTension = r.tension2_lb;
  }
  const same = computeConductorSagAtTemperature({ ...base, temp2_f: 60 });
  within(same.tension2_lb, base.tension1_lb, 1e-6, "same temperature, same loading: nothing changed");
  within(same.sag2_ft, same.sag1_ft, 1e-6, "and the same sag");
  assert.ok(same.direction.startsWith("unchanged"), same.direction);
  assert.ok(computeConductorSagAtTemperature({ ...base, temp2_f: 212 }).direction.startsWith("hotter"));
  assert.ok(computeConductorSagAtTemperature({ ...base, temp2_f: 0 }).direction.startsWith("colder"));
  // Ice at the same temperature is a heavier load, not a hotter one.
  const iced = computeConductorSagAtTemperature({ ...base, temp2_f: 60, weight2_lb_per_ft: 2.5 });
  assert.ok(iced.tension2_lb > base.tension1_lb, "ice raises tension");
  assert.ok(iced.direction.startsWith("heavier"), iced.direction);
});

// ---- conductor-uplift-check ----

test("conductor uplift: the two support reactions carry the whole conductor, and the low-point position is the low reaction divided by the weight", () => {
  // For a parabola the vertical reaction at the low support is w x x0, where x0
  // is the distance from that support to the low point of the curve. Both
  // reactions must also add to the conductor's own weight, w x L.
  const cases = [
    { span_ft: 700, elevation_rise_ft: 120, weight_lb_per_ft: 1.094, tension_lb: 5200 },
    { span_ft: 400, elevation_rise_ft: 15, weight_lb_per_ft: 0.6, tension_lb: 2000 },
    { span_ft: 500, elevation_rise_ft: 200, weight_lb_per_ft: 1.5, tension_lb: 8000 },
  ];
  for (const c of cases) {
    const r = computeConductorUpliftCheck(c);
    assert.ok(!r.error, r.error);
    within(r.vertical_load_low_lb + r.vertical_load_high_lb, c.weight_lb_per_ft * c.span_ft, 1e-9, "statics: the reactions carry the span");
    within(r.vertical_load_low_lb, c.weight_lb_per_ft * r.low_point_offset_ft, 1e-9, "V_low = w x x0");
    assert.equal(r.uplift, r.vertical_load_low_lb < -1e-9, "uplift is a negative reaction at the low support");
    assert.equal(r.uplift, r.low_point_offset_ft < -1e-9, "and equivalently a low point outside the span");
  }
});

test("conductor uplift: at the reported threshold tension the low reaction is exactly zero, and raising tension past it lifts the structure", () => {
  const c = { span_ft: 700, elevation_rise_ft: 120, weight_lb_per_ft: 1.094 };
  const probe = computeConductorUpliftCheck({ ...c, tension_lb: 1000 });
  const Hc = probe.uplift_tension_lb;
  const at = computeConductorUpliftCheck({ ...c, tension_lb: Hc });
  assert.ok(Math.abs(at.vertical_load_low_lb) < 1e-6, `V_low at the threshold: ${at.vertical_load_low_lb}`);
  assert.equal(computeConductorUpliftCheck({ ...c, tension_lb: Hc * 0.99 }).uplift, false);
  assert.equal(computeConductorUpliftCheck({ ...c, tension_lb: Hc * 1.01 }).uplift, true);
  // A rise over the back span pulls UP on this structure too (RUS 1724E-200
  // 10.4.7: the summed vertical span governs), so a pole in a sag between two
  // higher ones can be lifted even where each span alone bears down.
  const both = computeConductorUpliftCheck({ span_ft: 400, elevation_rise_ft: 60, weight_lb_per_ft: 1.0, tension_lb: 3000, back_span_ft: 400, back_span_rise_ft: 60 });
  assert.equal(both.uplift, true, "each span alone already lifts at this tension");
  assert.ok(both.structure_vertical_load_lb < both.vertical_load_low_lb, "the second rising span adds uplift, it does not cancel it");
  within(both.structure_vertical_load_lb, 2 * both.vertical_load_low_lb, 1e-9, "two identical rising spans: twice the uplift");
});

// ---- line-ground-clearance-nesc ----

test("line ground clearance: height, sag and clearance form one identity, and each reported limit is the point where the margin is exactly zero", () => {
  // NESC Table 232-1 (2017/2023) values the user would enter here: 18.5 ft over
  // roads/driveways/parking for 0-750 V to ground, 15.5 ft over spaces
  // accessible to pedestrians only. The tile ships no table; it is checked
  // against the identity clearance = attachment height - maximum sag.
  for (const [h, sag, req] of [[34.3, 15.8, 18.5], [30, 10, 15.5], [28, 14, 18.5], [40, 5, 18.5]]) {
    const r = computeLineGroundClearanceNesc({ attachment_height_ft: h, max_condition_sag_ft: sag, required_clearance_ft: req });
    within(r.clearance_ft, h - sag, 1e-9, "clearance identity");
    within(r.margin_ft, r.clearance_ft - req, 1e-9, "margin");
    assert.equal(r.passes, r.margin_ft >= -1e-9 * req, "the verdict follows the margin");
    // Round-trip: at the reported minimum attachment height the margin is zero.
    const atMin = computeLineGroundClearanceNesc({ attachment_height_ft: r.min_attachment_height_ft, max_condition_sag_ft: sag, required_clearance_ft: req });
    assert.ok(Math.abs(atMin.margin_ft) < 1e-9, `margin at the minimum height: ${atMin.margin_ft}`);
    assert.equal(atMin.passes, true, "and it passes there");
    // Round-trip the other way: at the maximum allowable sag the margin is zero.
    const atSag = computeLineGroundClearanceNesc({ attachment_height_ft: h, max_condition_sag_ft: r.max_allowable_sag_ft, required_clearance_ft: req });
    assert.ok(Math.abs(atSag.margin_ft) < 1e-9, `margin at the maximum sag: ${atSag.margin_ft}`);
    within(r.sag_headroom_ft, r.max_allowable_sag_ft - sag, 1e-9, "sag headroom");
    assert.ok(Math.abs(r.height_shortfall_ft + r.margin_ft) < 1e-9, `a foot of missing margin is a foot of missing pole: ${r.height_shortfall_ft} vs ${-r.margin_ft}`);
  }
  // The 34.3 - 15.8 = 18.499999999999996 case must not fail an 18.5 ft rule.
  assert.equal(computeLineGroundClearanceNesc({ attachment_height_ft: 34.3, max_condition_sag_ft: 15.8, required_clearance_ft: 18.5 }).passes, true);
});

// ---- recloser-fuse-coordination ----

test("recloser/fuse coordination: the two ends of the band are independent, and the reported limits are exactly where each verdict flips", () => {
  // Eaton TD132010EN: the fuse's minimum melt must be at least the recloser's
  // fast curve multiplied by the heating factor (1.35 for one fast operation
  // ahead of two slow), and total clearing must not outlast the slow curve.
  const c = { fault_current_a: 1200, fast_curve_s: 0.04, slow_curve_s: 0.35, fuse_min_melt_s: 0.054, fuse_total_clear_s: 0.09, heating_factor: 1.35, system_frequency_hz: 60 };
  const r = computeRecloserFuseCoordination(c);
  within(r.heated_fast_s, 0.04 * 1.35, 1e-9, "heated fast curve");
  assert.equal(r.fuse_saving_holds, true, "0.054 s min melt exactly meets 0.054 s heated fast -- equality holds");
  assert.equal(r.fuse_blowing_holds, true, "0.09 s total clear beats the 0.35 s slow curve");
  // A cycle is 1/60 s: the margin in cycles is the margin in seconds x the frequency.
  within(r.margin_cycles, r.margin_s * 60, 1e-9, "margin in cycles at 60 Hz");
  within(computeRecloserFuseCoordination({ ...c, system_frequency_hz: 50 }).margin_cycles, r.margin_s * 50, 1e-9, "and at 50 Hz");
  within(computeRecloserFuseCoordination({ ...c, system_frequency_hz: 50 }).margin_s, r.margin_s, 1e-9, "frequency does not move the seconds");
  // The reported longest workable fast curve is the flip point, from both sides.
  assert.equal(computeRecloserFuseCoordination({ ...c, fast_curve_s: r.longest_fast_curve_s }).fuse_saving_holds, true);
  assert.equal(computeRecloserFuseCoordination({ ...c, fast_curve_s: r.longest_fast_curve_s * 1.001 }).fuse_saving_holds, false);
  within(computeRecloserFuseCoordination({ ...c, fast_curve_s: r.longest_fast_curve_s }).coordination_ratio, 1, 1e-6, "ratio is 1 at the limit");
  // Fuse blowing flips exactly at total clear = slow curve.
  assert.equal(computeRecloserFuseCoordination({ ...c, fuse_total_clear_s: 0.35 }).fuse_blowing_holds, true);
  assert.equal(computeRecloserFuseCoordination({ ...c, fuse_total_clear_s: 0.3501 }).fuse_blowing_holds, false);
  // A larger heating factor can only make fuse saving harder.
  assert.equal(computeRecloserFuseCoordination({ ...c, heating_factor: 2.0 }).fuse_saving_holds, false);
  assert.equal(computeRecloserFuseCoordination({ ...c, heating_factor: 1.0 }).fuse_saving_holds, true);
});

// ---- counterpoise-resistance ----

test("counterpoise: a buried electrode scaled up in every dimension drops its resistance in exact proportion, and resistance is linear in soil resistivity", () => {
  // Resistance of an electrode of characteristic size s in soil of resistivity
  // rho goes as rho/s. Scaling length, depth and wire diameter together by k
  // must divide the resistance by k -- a property of the geometry, not of any
  // particular log formula.
  const base = { soil_resistivity_ohm_cm: 10000, length_ft: 100, burial_depth_in: 30, wire_diameter_in: 0.162, radials: 1, coupling_penalty: 1.5 };
  for (const k of [2, 4, 10]) {
    const r1 = computeCounterpoiseResistance(base);
    const rk = computeCounterpoiseResistance({ ...base, length_ft: base.length_ft * k, burial_depth_in: base.burial_depth_in * k, wire_diameter_in: base.wire_diameter_in * k });
    assert.ok(!rk.error, rk.error);
    within(rk.single_wire_ohm * k, r1.single_wire_ohm, 1e-6, `geometric scaling by ${k}`);
  }
  // Ohm's law in the soil: double the resistivity, double the resistance.
  const r1 = computeCounterpoiseResistance(base);
  within(computeCounterpoiseResistance({ ...base, soil_resistivity_ohm_cm: 20000 }).array_ohm, 2 * r1.array_ohm, 1e-9, "linear in resistivity");
  // Monotone: every extra foot of wire sheds more current.
  let prev = Infinity;
  for (const L of [50, 100, 200, 400, 800]) {
    const v = computeCounterpoiseResistance({ ...base, length_ft: L }).single_wire_ohm;
    assert.ok(v < prev, `resistance falls with length at ${L} ft`);
    prev = v;
  }
});

test("counterpoise: radials in parallel divide the single-wire resistance and then pay the coupling penalty, and the sizing round-trips", () => {
  const base = { soil_resistivity_ohm_cm: 10000, length_ft: 100, burial_depth_in: 30, wire_diameter_in: 0.162, coupling_penalty: 1.5 };
  const one = computeCounterpoiseResistance({ ...base, radials: 1 });
  within(one.coupling_penalty, 1, 1e-9, "a single radial couples with nothing");
  within(one.array_ohm, one.single_wire_ohm, 1e-9, "and pays no penalty");
  for (const n of [2, 3, 4, 6]) {
    const r = computeCounterpoiseResistance({ ...base, radials: n });
    within(r.ideal_parallel_ohm * n, one.single_wire_ohm, 1e-9, `${n} ideal parallel wires`);
    within(r.array_ohm, r.ideal_parallel_ohm * 1.5, 1e-9, "the penalty is paid once on the parallel value");
    assert.ok(r.array_ohm > one.single_wire_ohm / n, "coupling makes radials worth less than ideal parallel");
    assert.ok(r.array_ohm < one.array_ohm, "but more radials still help");
    within(r.coupling_cost_ohm, r.array_ohm - r.ideal_parallel_ohm, 1e-9, "coupling cost");
  }
  // The length the tile prescribes for a target must actually hit the target.
  const sized = computeCounterpoiseResistance({ ...base, radials: 4, target_resistance_ohm: 5 });
  assert.ok(sized.length_for_target_ft > 0, "a length was found");
  const built = computeCounterpoiseResistance({ ...base, radials: 4, length_ft: sized.length_for_target_ft, target_resistance_ohm: 5 });
  within(built.array_ohm, 5, 1e-6, "the prescribed length lands on the target");
  assert.equal(built.meets_target, true, "and it is reported as meeting it");
  within(sized.doubling_improvement_x, sized.single_wire_ohm / computeCounterpoiseResistance({ ...base, radials: 4, length_ft: 200 }).single_wire_ohm, 1e-9, "doubling improvement");
});

// ---- ev-dcfc-time ----

test("EV DC fast charge: energy is capacity times the state-of-charge span, and each band's time is its own energy over its own tapered power", () => {
  const c = { usable_capacity_kwh: 77, start_soc_pct: 10, target_soc_pct: 100, charger_power_kw: 150, acceptance_kw: 125 };
  const r = computeEvDcfcTime(c);
  within(r.cc_power_kw, 125, 1e-9, "the vehicle, not the charger, is the limit here");
  within(r.energy_total_kwh, 77 * 0.9, 1e-9, "10% to 100% of 77 kWh is 69.3 kWh");
  // Bands: full power to 80%, half above 80%, a quarter above 90%.
  within(r.time_to_80_hr, 77 * 0.70 / 125, 1e-9, "10-80% at full power");
  within(r.time_8090_hr, 77 * 0.10 / (125 * 0.5), 1e-9, "80-90% at half power");
  within(r.time_90100_hr, 77 * 0.10 / (125 * 0.25), 1e-9, "90-100% at a quarter power");
  within(r.time_to_80_hr + r.time_8090_hr + r.time_90100_hr, r.time_total_hr, 1e-9, "the bands add to the total");
  // The last 10% of charge takes as long as the first 40%: that is the taper.
  within(r.time_90100_hr, computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 50 }).time_total_hr, 1e-9, "90-100% costs what 10-50% costs");
});

test("EV DC fast charge: a session below 80% is pure energy over power, and splitting a session in two costs the same time", () => {
  // Below 80% there is no taper, so the time is exactly kWh / kW.
  const flat = computeEvDcfcTime({ usable_capacity_kwh: 60, start_soc_pct: 20, target_soc_pct: 70, charger_power_kw: 50, acceptance_kw: 200 });
  within(flat.cc_power_kw, 50, 1e-9, "the charger is the limit here");
  within(flat.time_total_hr, 60 * 0.5 / 50, 1e-9, "30 kWh at 50 kW is 0.6 h");
  within(flat.energy_total_kwh, 30, 1e-9, "30 kWh");
  // Time is additive across a split session: 10->60 plus 60->95 equals 10->95.
  const c = { usable_capacity_kwh: 77, charger_power_kw: 150, acceptance_kw: 125 };
  const whole = computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 95 });
  const a = computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 60 });
  const b = computeEvDcfcTime({ ...c, start_soc_pct: 60, target_soc_pct: 95 });
  within(a.time_total_hr + b.time_total_hr, whole.time_total_hr, 1e-9, "a paused session costs the same");
  within(a.energy_total_kwh + b.energy_total_kwh, whole.energy_total_kwh, 1e-9, "and the same energy");
  // A faster charger never takes longer, and past the vehicle's acceptance it stops helping.
  assert.ok(computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 80, charger_power_kw: 350 }).time_total_hr
    <= computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 80, charger_power_kw: 50 }).time_total_hr);
  within(computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 80, charger_power_kw: 350 }).time_total_hr,
    computeEvDcfcTime({ ...c, start_soc_pct: 10, target_soc_pct: 80, charger_power_kw: 125 }).time_total_hr, 1e-9, "the vehicle caps it");
});

// ---- pv-row-shade-angle ----

test("PV row shade angle: it inverts row spacing -- the pitch it is given returns the profile angle that produced that pitch", () => {
  for (const [L, tilt, profile] of [[6.5, 25, 22.5], [4.0, 10, 30], [7.5, 35, 18], [5.0, 45, 40]]) {
    const fwd = computePvRowSpacing({ module_length_ft: L, tilt_deg: tilt, profile_angle_deg: profile });
    const back = computePvRowShadeAngle({ module_length_ft: L, tilt_deg: tilt, row_pitch_ft: fwd.pitch_ft });
    within(back.profile_angle_deg, profile, 1e-7, "round-trip through the spacing tile");
    within(back.gcr, fwd.gcr, 1e-9, "same ground-coverage ratio");
    within(back.shadow_ft, fwd.shadow_ft, 1e-9, "same shadow");
    // Right-triangle identity: the tilted module's rise and base are the legs.
    within(back.rise_ft ** 2 + back.base_ft ** 2, L * L, 1e-9, "rise and base are the legs of the module");
    within(Math.tan(back.profile_angle_deg * Math.PI / 180), back.rise_ft / back.shadow_ft, 1e-9, "the profile angle sees the row top over the gap");
  }
  // Pushing the rows apart lowers the sun angle that first clears them.
  let prev = Infinity;
  for (const pitch of [7, 9, 12, 20, 40]) {
    const v = computePvRowShadeAngle({ module_length_ft: 6.5, tilt_deg: 25, row_pitch_ft: pitch }).profile_angle_deg;
    assert.ok(v < prev, `profile angle falls as the pitch grows at ${pitch} ft`);
    prev = v;
  }
  within(computePvRowShadeAngle({ module_length_ft: 6.5, tilt_deg: 25, row_pitch_ft: 13 }).gcr, 0.5, 1e-9, "GCR of 0.5 at twice the module length");
});

// ---- battery-tou-arbitrage ----

test("battery TOU arbitrage: energy in equals energy out over the round-trip efficiency, and the trade breaks even exactly at a price ratio of 1/RTE", () => {
  const c = { nameplate_kwh: 100, dod: 0.9, rte: 0.86, peak_price: 0.42, offpeak_price: 0.11, cycles_per_year: 300 };
  const r = computeBatteryTouArbitrage(c);
  within(r.usable_kwh, 90, 1e-9, "90 kWh usable at 90% DoD");
  within(r.charge_kwh * c.rte, r.usable_kwh, 1e-9, "kWh in x RTE = kWh out");
  assert.ok(r.charge_kwh > r.usable_kwh, "you buy more than you sell");
  within(r.annual_value, r.daily_value * 300, 1e-9, "annual is daily times cycles");
  // Break-even: buying charge_kwh at offpeak must cost what usable_kwh earns at
  // peak, i.e. peak/offpeak = 1/RTE. Nothing above uses that identity.
  within(r.breakeven_ratio, 1 / 0.86, 1e-9, "break-even ratio");
  const even = computeBatteryTouArbitrage({ ...c, offpeak_price: c.peak_price / r.breakeven_ratio });
  assert.ok(Math.abs(even.daily_value) < 1e-9, `break-even day: ${even.daily_value}`);
  assert.ok(computeBatteryTouArbitrage({ ...c, offpeak_price: c.peak_price / r.breakeven_ratio * 1.01 }).daily_value < 0, "a narrower spread loses money");
  assert.ok(computeBatteryTouArbitrage({ ...c, offpeak_price: c.peak_price / r.breakeven_ratio * 0.99 }).daily_value > 0, "a wider spread makes money");
  // A free charge is pure revenue, and value is linear in the battery.
  within(computeBatteryTouArbitrage({ ...c, offpeak_price: 0 }).daily_value, 90 * 0.42, 1e-9, "free charge: the full peak sale");
  within(computeBatteryTouArbitrage({ ...c, nameplate_kwh: 200 }).annual_value, 2 * r.annual_value, 1e-9, "twice the battery, twice the value");
});

// ---- pv-max-ambient-for-power ----

test("PV maximum ambient for a target power: it inverts the cell-temperature power tile exactly, in both directions", () => {
  for (const [Pstc, G, noct, gamma, target] of [[400, 1000, 45, -0.35, 360], [550, 800, 44, -0.29, 500], [320, 600, 47, -0.45, 300]]) {
    const back = computePvMaxAmbientForPower({ target_power_W: target, P_stc_W: Pstc, G_wm2: G, NOCT_C: noct, gamma });
    assert.ok(!back.error, back.error);
    const fwd = computePvCellTemperaturePower({ T_amb_C: back.max_ambient_C, G_wm2: G, NOCT_C: noct, P_stc_W: Pstc, gamma });
    within(fwd.P_W, target, 1e-7, "at the reported ambient the module makes exactly the target");
    within(fwd.T_cell_C, back.max_cell_C, 1e-9, "and sits at the reported cell temperature");
    // NOCT model: the cell runs (NOCT - 20) x G / 800 above ambient.
    within(back.max_cell_C - back.max_ambient_C, (noct - 20) * G / 800, 1e-9, "the NOCT rise");
    // A hotter ambient than the limit must miss the target, a cooler one must beat it.
    assert.ok(computePvCellTemperaturePower({ T_amb_C: back.max_ambient_C + 5, G_wm2: G, NOCT_C: noct, P_stc_W: Pstc, gamma }).P_W < target);
    assert.ok(computePvCellTemperaturePower({ T_amb_C: back.max_ambient_C - 5, G_wm2: G, NOCT_C: noct, P_stc_W: Pstc, gamma }).P_W > target);
  }
  // Asking for STC power puts the cell at exactly 25 C, by definition of STC.
  const atStc = computePvMaxAmbientForPower({ target_power_W: 400, P_stc_W: 400, G_wm2: 1000, NOCT_C: 45, gamma: -0.35 });
  within(atStc.max_cell_C, 25, 1e-9, "STC power means a 25 C cell");
  within(atStc.max_ambient_C, 25 - 25 * 1000 / 800, 1e-9, "which needs a 6.25 C ambient at 1 sun with NOCT 45");
});

// ---- cctv-retention-days ----

test("CCTV retention: the storage rate is a unit conversion -- 1 Mbps for an hour is exactly 0.45 GB, and days x daily = the disk", () => {
  // 1 Mbit/s x 3600 s = 3,600 Mbit = 450 MB = 0.45 GB (decimal GB, as disks are
  // sold). Nothing below reuses the tile's constant.
  const bitsPerHour = 1e6 * 3600;
  const gbPerMbpsHour = bitsPerHour / 8 / 1e9;
  within(gbPerMbpsHour, 0.45, 1e-9, "the conversion itself");
  const c = { disk_capacity_gb: 24000, camera_count: 32, bitrate_mbps: 4, recording_mode: "continuous" };
  const r = computeCctvRetentionDays(c);
  within(r.per_camera_day_gb, 4 * gbPerMbpsHour * 24, 1e-9, "4 Mbps continuous is 43.2 GB a day");
  within(r.daily_total_gb, 32 * 43.2, 1e-9, "32 cameras");
  within(r.retention_days * r.daily_total_gb, 24000, 1e-9, "bits in = bytes on disk: days x daily fills the drive");
  within(r.retention_weeks * 7, r.retention_days, 1e-9, "weeks");
  within(r.aggregate_bandwidth_mbps, 128, 1e-9, "aggregate stream bandwidth");
  within(r.recording_hours_per_day, 24, 1e-9, "continuous means 24 h");
  // Motion recording at duty d records 24d hours, so it keeps 1/d times as long.
  const m = computeCctvRetentionDays({ ...c, recording_mode: "motion", motion_duty_percent: 25 });
  within(m.recording_hours_per_day, 6, 1e-9, "25% duty is 6 h a day");
  within(m.retention_days, 4 * r.retention_days, 1e-9, "a quarter of the hours keeps four times the days");
  within(m.aggregate_bandwidth_mbps, r.aggregate_bandwidth_mbps, 1e-9, "duty does not change the live stream bandwidth");
  // Retention scales with the disk and inversely with the camera count.
  within(computeCctvRetentionDays({ ...c, disk_capacity_gb: 48000 }).retention_days, 2 * r.retention_days, 1e-9, "twice the disk");
  within(computeCctvRetentionDays({ ...c, camera_count: 64 }).retention_days, r.retention_days / 2, 1e-9, "twice the cameras");
});

// ---- access-control-power-supply ----

test("access control power supply: the load is the device inventory added up, with 25% headroom on the supply and a 25% aging derate on the battery", () => {
  const c = { lock_count: 8, lock_current_a: 0.5, reader_count: 8, reader_current_a: 0.15, other_load_a: 0.4, standby_hours: 4 };
  const r = computeAccessControlPowerSupply(c);
  // Hand count: 8 x 0.5 = 4.0 A of locks, 8 x 0.15 = 1.2 A of readers, 0.4 A else.
  within(r.total_load_a, 5.6, 1e-9, "device inventory");
  within(r.psu_min_a, 5.6 * 1.25, 1e-9, "7.0 A supply");
  // Charge balance: amps for hours is amp-hours, then the 25% aging derate.
  within(r.battery_ah, 5.6 * 4 * 1.25, 1e-9, "28 Ah");
  within(r.battery_ah / 1.25 / r.total_load_a, 4, 1e-9, "the derated battery runs the stated standby time");
  // Each term is linear and separable: adding one lock adds exactly its current.
  within(computeAccessControlPowerSupply({ ...c, lock_count: 9 }).total_load_a - r.total_load_a, 0.5, 1e-9, "one more lock");
  within(computeAccessControlPowerSupply({ ...c, reader_count: 9 }).total_load_a - r.total_load_a, 0.15, 1e-9, "one more reader");
  within(computeAccessControlPowerSupply({ ...c, other_load_a: 1.4 }).total_load_a - r.total_load_a, 1, 1e-9, "one more amp of other load");
  within(computeAccessControlPowerSupply({ ...c, standby_hours: 8 }).battery_ah, 2 * r.battery_ah, 1e-9, "twice the standby, twice the battery");
  within(computeAccessControlPowerSupply({ ...c, standby_hours: 8 }).psu_min_a, r.psu_min_a, 1e-9, "standby time does not size the supply");
  assert.equal(computeAccessControlPowerSupply({ ...c, lock_count: 2.5 }).error !== undefined, true, "half a lock is not a device count");
});

// ---- lv-cable-pull-footage ----

test("LV cable pull: a horizontal run cannot be spliced, so boxes are counted by whole runs per box and the tail of each box is scrap", () => {
  // TIA-568: no splices in a horizontal copper run. 1,000 ft of box at 105 ft a
  // run holds nine whole runs (945 ft used, 55 ft scrap), so 100 drops take 12
  // boxes, not ceil(10,500 / 1,000) = 11.
  const r = computeLvCablePullFootage({ drops: 100, avg_run_ft: 100, slack_ft: 5, box_ft: 1000 });
  within(r.total_ft, 100 * 105, 1e-9, "10,500 ft of cable");
  assert.equal(r.boxes, 12, "nine runs a box, so twelve boxes");
  for (const c of [
    { drops: 48, avg_run_ft: 120, slack_ft: 15, box_ft: 1000 },
    { drops: 100, avg_run_ft: 100, slack_ft: 5, box_ft: 1000 },
    { drops: 7, avg_run_ft: 200, slack_ft: 0, box_ft: 1000 },
    { drops: 30, avg_run_ft: 250, slack_ft: 50, box_ft: 1000 },
  ]) {
    const x = computeLvCablePullFootage(c);
    const run = c.avg_run_ft + c.slack_ft;
    const perBox = Math.floor(c.box_ft / run + 1e-9);
    assert.ok(perBox * run <= c.box_ft + 1e-9, "the runs claimed per box actually fit");
    assert.ok((perBox + 1) * run > c.box_ft + 1e-9, "one more would not");
    assert.ok(x.boxes * perBox >= c.drops, "every drop gets a whole run");
    assert.ok((x.boxes - 1) * perBox < c.drops, "and no box is ordered unused");
    assert.ok(x.boxes * c.box_ft >= x.total_ft - 1e-9, "the order covers the footage");
    within(x.total_ft, c.drops * run, 1e-9, "footage is drops times the run with its slack");
  }
  // Exactly filling the last box orders no extra.
  assert.equal(computeLvCablePullFootage({ drops: 20, avg_run_ft: 100, slack_ft: 0, box_ft: 1000 }).boxes, 2, "ten runs a box, twenty drops, two boxes");
  assert.ok(computeLvCablePullFootage({ drops: 5, avg_run_ft: 1100, slack_ft: 0, box_ft: 1000 }).error, "a run longer than a box cannot be spliced together");
});

// ---- cable-support-jhook ----

test("cable support J-hooks: each hook carries one span of the bundle's weight, and the whole bundle weight is shared out across the run", () => {
  const c = { run_ft: 400, spacing_ft: 4, num_cables: 50, cable_lb_per_ft: 0.035, hook_wll_lb: 20 };
  const r = computeCableSupportJhook(c);
  // One span of 50 Cat6 cables at 0.035 lb/ft: 50 x 0.035 x 4 = 7.0 lb.
  within(r.load_per_hook_lb, 7, 1e-9, "one span of bundle weight");
  within(r.utilization, 7 / 20, 1e-9, "35% of a 20 lb working load");
  // Weight balance: the hooks between them carry the whole bundle.
  within(r.hooks * r.load_per_hook_lb, c.num_cables * c.cable_lb_per_ft * c.run_ft, 1e-9, "the run's bundle weight is fully supported");
  // Tightening the spacing adds hooks and lightens each one, leaving the total
  // supported weight unchanged (where the spacing divides the run evenly).
  for (const s of [2, 5, 8, 10]) {
    const x = computeCableSupportJhook({ ...c, spacing_ft: s });
    within(x.hooks * x.load_per_hook_lb, c.num_cables * c.cable_lb_per_ft * c.run_ft, 1e-9, `total weight at ${s} ft spacing`);
    within(x.load_per_hook_lb / r.load_per_hook_lb, s / 4, 1e-9, "load per hook is linear in the span");
  }
  // Where it does not divide evenly the last span is short, so the hooks are
  // credited with a little more than the bundle actually weighs: 400 ft at 3 ft
  // is 134 hooks x 5.25 lb = 703.5 lb against 700 lb of cable.
  const odd = computeCableSupportJhook({ ...c, spacing_ft: 3 });
  assert.equal(odd.hooks, 134);
  within(odd.hooks * odd.load_per_hook_lb, 703.5, 1e-9, "the short last span is charged a full span of load -- conservative");
  // Fencepost convention, now stated in the tile's own note: the count is one
  // hook per span, ceil(run / spacing), which assumes the head of the run is
  // already carried by a rack, tray, or sleeve. A pathway needing its own hook
  // at both free ends takes floor(400/4) + 1 = 101 instead of 100.
  assert.equal(r.hooks, 100, "one hook per span, no end hook");
  assert.equal(computeCableSupportJhook({ ...c, run_ft: 401 }).hooks, 101, "a partial last span still gets a hook");
  assert.equal(computeCableSupportJhook({ ...c, run_ft: 4 }).hooks, 1);
  assert.equal(computeCableSupportJhook({ ...c, hook_wll_lb: 0 }).utilization, null, "no working load entered, no utilization");
});

// ---- conduit-expansion-max-run ----

test("conduit expansion maximum run: it inverts the expansion tile, and reproduces NEC Chapter 9 Table 352.44 for PVC", () => {
  // Table 352.44 (rigid PVC, coefficient 3.38e-5 in/in/degF): a 100 degF change
  // expands 4.06 in per 100 ft. 3.38e-5 x 1200 in x 100 = 4.056 in.
  const fwd = computeConduitThermalExpansion({ run_length_ft: 100, temp_change_f: 100, coeff_in_per_in_f: 0.0000338, trigger_in: 0.25 });
  within(fwd.delta_l_in, 4.06, 0.2, "Table 352.44, 100 degF row");
  // 352.44 requires a fitting where the change is 1/4 in or more. The longest
  // run that stays at the trigger: 0.25 / (3.38e-5 x 12 x 100) = 6.164 ft.
  const r = computeConduitExpansionMaxRun({ temp_change_f: 100, coeff_in_per_in_f: 0.0000338, trigger_in: 0.25 });
  within(r.max_run_ft, 0.25 / (0.0000338 * 12 * 100), 1e-9, "max run at a 100 degF swing");
  within(r.delta_l_at_max_in, 0.25, 1e-9, "and it moves exactly the trigger there");
  for (const [dT, trig] of [[100, 0.25], [50, 0.25], [120, 0.5], [75, 0.125]]) {
    const m = computeConduitExpansionMaxRun({ temp_change_f: dT, coeff_in_per_in_f: 0.0000338, trigger_in: trig });
    const at = computeConduitThermalExpansion({ run_length_ft: m.max_run_ft, temp_change_f: dT, coeff_in_per_in_f: 0.0000338, trigger_in: trig });
    within(at.delta_l_in, trig, 1e-9, "round-trip: the maximum run moves exactly the trigger");
    const longer = computeConduitThermalExpansion({ run_length_ft: m.max_run_ft * 1.01, temp_change_f: dT, coeff_in_per_in_f: 0.0000338, trigger_in: trig });
    assert.equal(longer.fitting_required, true, "a longer run needs a fitting");
    // The run is inversely proportional to the swing and to the coefficient.
    within(computeConduitExpansionMaxRun({ temp_change_f: 2 * dT, coeff_in_per_in_f: 0.0000338, trigger_in: trig }).max_run_ft, m.max_run_ft / 2, 1e-9, "twice the swing, half the run");
    within(computeConduitExpansionMaxRun({ temp_change_f: dT, coeff_in_per_in_f: 0.0000676, trigger_in: trig }).max_run_ft, m.max_run_ft / 2, 1e-9, "twice the coefficient, half the run");
  }
  // A swing is a magnitude: contracting 60 degF moves as far as expanding 60.
  within(computeConduitExpansionMaxRun({ temp_change_f: -60 }).max_run_ft, computeConduitExpansionMaxRun({ temp_change_f: 60 }).max_run_ft, 1e-9, "sign of the swing does not matter");
  // Steel moves about a fifth as far as PVC, so it runs about five times as far.
  within(computeConduitExpansionMaxRun({ temp_change_f: 100, coeff_in_per_in_f: 0.0000065 }).max_run_ft / r.max_run_ft, 0.0000338 / 0.0000065, 1e-9, "steel vs PVC");
});

// ---- battery-vent-max-current ----

test("battery vent maximum current: it inverts the hydrogen-vent tile, and the airflow the IFC 1% limit needs scales with cells and current", () => {
  // IEEE 1635 / ASHRAE: Q (cfm) = 0.000269 x I x N / (limit as a fraction).
  // Inverted, the current an available airflow can support.
  for (const [cfm, cells, lim] of [[250, 120, 1], [400, 240, 1], [150, 60, 2], [1000, 480, 0.8]]) {
    const r = computeBatteryVentMaxCurrent({ available_cfm: cfm, cell_count: cells, h2_limit_pct: lim });
    assert.ok(!r.error, r.error);
    const fwd = computeBatteryHydrogenVent({ cell_count: cells, charge_current_a: r.max_charge_current_a, room_volume_ft3: 5000, h2_limit_pct: lim });
    within(fwd.q_cfm, cfm, 1e-7, "at the reported current the room needs exactly the airflow available");
    // Hand check of the published form at the IFC/NFPA 1 limit of 1%.
    within(r.max_charge_current_a, cfm * (lim / 100) / (0.000269 * cells), 1e-9, "IEEE 1635 form, solved for I");
  }
  const base = computeBatteryVentMaxCurrent({ available_cfm: 250, cell_count: 120, h2_limit_pct: 1 });
  // Hydrogen evolution is per cell per amp, so the safe current halves when the
  // string doubles and doubles when the fan doubles.
  within(computeBatteryVentMaxCurrent({ available_cfm: 250, cell_count: 240, h2_limit_pct: 1 }).max_charge_current_a, base.max_charge_current_a / 2, 1e-9, "twice the cells");
  within(computeBatteryVentMaxCurrent({ available_cfm: 500, cell_count: 120, h2_limit_pct: 1 }).max_charge_current_a, 2 * base.max_charge_current_a, 1e-9, "twice the airflow");
  within(computeBatteryVentMaxCurrent({ available_cfm: 250, cell_count: 120, h2_limit_pct: 2 }).max_charge_current_a, 2 * base.max_charge_current_a, 1e-9, "a looser limit allows more current");
  assert.ok(computeBatteryVentMaxCurrent({ available_cfm: 250, cell_count: 120, h2_limit_pct: 4 }).error, "4% is the LEL, not a design limit");
});

// ---- economic-conductor-sizing ----

test("economic conductor sizing: three-phase I^2R loss, quadratic in current, and the payback is the upsize cost over the energy it stops wasting", () => {
  // Three conductors each dissipate I^2 R: 100 A through 0.05 ohm is 3 x 500 W
  // = 1.5 kW. Dropping to 0.03 ohm saves 0.6 kW.
  const c = { current_a: 100, r_small_ohm: 0.05, r_big_ohm: 0.03, hours: 4000, rate_kwh: 0.12, upsize_cost: 1500 };
  const r = computeEconomicConductorSizing(c);
  within(r.loss_small_kw, 1.5, 1e-9, "1.5 kW on the smaller conductor");
  within(r.loss_big_kw, 0.9, 1e-9, "0.9 kW on the larger one");
  // Energy balance: 0.6 kW for 4,000 h is 2,400 kWh, at $0.12 that is $288/yr.
  within(r.annual_saving, 288, 1e-9, "$288 a year");
  within(r.payback_yr, 1500 / 288, 1e-9, "the cost divided by the yearly saving");
  within(r.payback_yr * r.annual_saving, 1500, 1e-9, "the payback year is when the saving has repaid the upsize");
  // Loss is quadratic in current; the saving and the payback follow.
  const dbl = computeEconomicConductorSizing({ ...c, current_a: 200 });
  within(dbl.loss_small_kw / r.loss_small_kw, 4, 1e-9, "twice the current, four times the loss");
  within(dbl.annual_saving / r.annual_saving, 4, 1e-9, "four times the saving");
  within(dbl.payback_yr * 4, r.payback_yr, 1e-9, "a quarter of the payback");
  // Saving is linear in hours and in the rate, and a free upsize pays back now.
  within(computeEconomicConductorSizing({ ...c, hours: 8000 }).annual_saving, 576, 1e-9, "twice the hours");
  within(computeEconomicConductorSizing({ ...c, rate_kwh: 0.24 }).annual_saving, 576, 1e-9, "twice the rate");
  within(computeEconomicConductorSizing({ ...c, upsize_cost: 0 }).payback_yr, 0, 1e-9, "a free upsize");
  assert.equal(computeEconomicConductorSizing({ ...c, rate_kwh: 0 }).payback_yr, null, "free energy never repays an upsize");
});

// ---- luminaire-spacing-mh-ratio ----

test("luminaire spacing: the IES spacing criterion is a ratio to the height above the work plane, and the verdict flips exactly at the limit", () => {
  // S/MH is a multiplier on mounting height above the WORK PLANE, so the same
  // fixture over a 2.5 ft bench in a 10 ft room allows 1.3 x 7.5 = 9.75 ft.
  const r = computeLuminaireSpacingMh({ smh_ratio: 1.3, mounting_height_ft: 7.5, actual_spacing_ft: 9 });
  within(r.max_spacing_ft, 9.75, 1e-9, "1.3 x 7.5 ft");
  assert.ok(r.verdict.startsWith("OK"));
  // The maximum is linear in both factors and the criterion is scale-free.
  within(computeLuminaireSpacingMh({ smh_ratio: 1.3, mounting_height_ft: 15, actual_spacing_ft: 1 }).max_spacing_ft, 19.5, 1e-9, "twice the height");
  within(computeLuminaireSpacingMh({ smh_ratio: 2.6, mounting_height_ft: 7.5, actual_spacing_ft: 1 }).max_spacing_ft, 19.5, 1e-9, "twice the ratio");
  for (const [smh, mh] of [[1.3, 8], [1.2, 6], [0.9, 12], [1.5, 10]]) {
    const lim = smh * mh;
    assert.equal(computeLuminaireSpacingMh({ smh_ratio: smh, mounting_height_ft: mh, actual_spacing_ft: lim }).verdict.startsWith("OK"), true, "equality passes");
    assert.equal(computeLuminaireSpacingMh({ smh_ratio: smh, mounting_height_ft: mh, actual_spacing_ft: lim * 1.001 }).verdict.startsWith("TOO WIDE"), true);
    assert.equal(computeLuminaireSpacingMh({ smh_ratio: smh, mounting_height_ft: mh, actual_spacing_ft: lim * 0.999 }).verdict.startsWith("OK"), true);
  }
  // 1.2 x 6 is 7.199999999999999 in binary; a 7.2 ft layout meets it.
  assert.ok(computeLuminaireSpacingMh({ smh_ratio: 1.2, mounting_height_ft: 6, actual_spacing_ft: 7.2 }).verdict.startsWith("OK"));
});

// ---- lumen-method ----

test("lumen method: a footcandle is a lumen per square foot, so the delivered level is fixture lumens x CU x LLF over the area", () => {
  // Hand case: two 10,000 lm fixtures, no losses, in 1,000 sq ft is 20,000
  // lumens over 1,000 sq ft = 20 fc.
  const exact = computeLumenMethod({ target_fc: 20, area_sqft: 1000, lumens_per_lum: 10000, cu: 1, llf: 1 });
  within(exact.count_raw, 2, 1e-9, "two fixtures exactly");
  assert.equal(exact.count, 2, "no rounding needed");
  within(exact.achieved_fc, 20, 1e-9, "20 fc delivered");
  within(exact.total_lumens, 20000, 1e-9, "20,000 lumens");
  // CU and LLF are the fraction of lamp lumens that reach the work plane: at
  // CU 0.5 and LLF 0.8, only 40% arrives, so it takes 2.5 times the fixtures.
  const lossy = computeLumenMethod({ target_fc: 20, area_sqft: 1000, lumens_per_lum: 10000, cu: 0.5, llf: 0.8 });
  within(lossy.count_raw, 2 / 0.4, 1e-9, "five fixtures");
  within(lossy.achieved_fc * 1000, lossy.total_lumens * 0.5 * 0.8, 1e-9, "illuminance is delivered lumens over area");
  for (const c of [
    { target_fc: 50, area_sqft: 2400, lumens_per_lum: 4800, cu: 0.62, llf: 0.85 },
    { target_fc: 30, area_sqft: 900, lumens_per_lum: 3500, cu: 0.75, llf: 0.8 },
    { target_fc: 5, area_sqft: 12000, lumens_per_lum: 22000, cu: 0.9, llf: 0.7 },
  ]) {
    const r = computeLumenMethod(c);
    // The count is the smallest whole number of fixtures that reaches the target.
    assert.ok(r.achieved_fc >= c.target_fc - 1e-9, "the layout meets the target");
    assert.ok(Number.isInteger(r.count), "fixtures come whole");
    const oneFewer = (r.count - 1) * c.lumens_per_lum * c.cu * c.llf / c.area_sqft;
    assert.ok(oneFewer < c.target_fc - 1e-12, "and one fewer would not");
    within(r.total_lumens, r.count * c.lumens_per_lum, 1e-9, "total lumens");
    within(r.achieved_fc * c.area_sqft / (c.cu * c.llf), r.total_lumens, 1e-9, "lumens in, footcandles out");
    // Doubling the target doubles the raw count; halving the area halves it.
    within(computeLumenMethod({ ...c, target_fc: 2 * c.target_fc }).count_raw, 2 * r.count_raw, 1e-9, "linear in target");
    within(computeLumenMethod({ ...c, area_sqft: c.area_sqft / 2 }).count_raw, r.count_raw / 2, 1e-9, "linear in area");
  }
});

// ---- lighting-uniformity-ratio ----

test("lighting uniformity: the ratios are pure shape -- scaling every reading leaves them unchanged, and max/min is never below avg/min", () => {
  const grid = [52, 48, 61, 44, 57, 39, 50, 55, 46, 63];
  const r = computeLightingUniformityRatio({ readings: grid });
  assert.equal(r.n, 10);
  within(r.min, 39, 1e-9, "minimum");
  within(r.max, 63, 1e-9, "maximum");
  within(r.avg, grid.reduce((a, b) => a + b, 0) / 10, 1e-9, "average");
  // U0 is the reciprocal of avg/min, by definition.
  within(r.U0 * r.avg_min, 1, 1e-9, "U0 = min/avg = 1 / (avg/min)");
  assert.ok(r.max_min >= r.avg_min - 1e-12, "max/min bounds avg/min");
  assert.ok(r.avg_min >= 1 - 1e-12, "the average is never below the minimum");
  // A footcandle grid and the same grid in lux are the same uniformity.
  const lux = computeLightingUniformityRatio({ readings: grid.map((v) => v * 10.7639) });
  within(lux.avg_min, r.avg_min, 1e-9, "unit-free");
  within(lux.max_min, r.max_min, 1e-9, "unit-free");
  // Order does not matter, and a flat field is perfectly uniform.
  const shuffled = computeLightingUniformityRatio({ readings: [...grid].reverse() });
  within(shuffled.avg_min, r.avg_min, 1e-9, "order-free");
  const flat = computeLightingUniformityRatio({ readings: [40, 40, 40, 40] });
  within(flat.avg_min, 1, 1e-9, "a flat field is 1:1");
  within(flat.U0, 1, 1e-9, "and U0 is 1");
  // A whitespace/comma string of readings is the same grid.
  within(computeLightingUniformityRatio({ readings: grid.join(", ") }).avg_min, r.avg_min, 1e-9, "parsed from text");
});

test("lighting uniformity: a target is met exactly at equality, and tightening either target alone can fail the grid", () => {
  // IES RP-8 style checks: a 3:1 avg/min and a 6:1 max/min on the same grid.
  const grid = [21, 18, 24, 7, 15, 19];
  const r = computeLightingUniformityRatio({ readings: grid, target_avgmin: 3, target_maxmin: 6 });
  within(r.avg_min, (104 / 6) / 7, 1e-9, "avg 17.333 over min 7");
  within(r.max_min, 24 / 7, 1e-9, "24 over 7");
  assert.equal(r.pass, true, "2.48:1 and 3.43:1 both inside");
  // Exactly at the computed ratio the grid passes; a hair tighter it fails.
  assert.equal(computeLightingUniformityRatio({ readings: grid, target_avgmin: r.avg_min }).pass, true, "equality passes");
  assert.equal(computeLightingUniformityRatio({ readings: grid, target_avgmin: r.avg_min * 0.999 }).pass, false);
  assert.equal(computeLightingUniformityRatio({ readings: grid, target_maxmin: r.max_min }).pass, true, "equality passes");
  assert.equal(computeLightingUniformityRatio({ readings: grid, target_maxmin: r.max_min * 0.999 }).pass, false);
  // Either target alone can govern.
  assert.equal(computeLightingUniformityRatio({ readings: grid, target_avgmin: 2, target_maxmin: 6 }).pass, false, "avg/min governs");
  assert.equal(computeLightingUniformityRatio({ readings: grid, target_avgmin: 3, target_maxmin: 3 }).pass, false, "max/min governs");
  assert.equal(computeLightingUniformityRatio({ readings: grid }).pass, null, "no target, no verdict");
  // 2.1 / 0.7 is 3.0000000000000004 in binary; a 3:1 target is still met.
  assert.equal(computeLightingUniformityRatio({ readings: [2.1, 2.1, 0.7, 0.7], target_avgmin: 2 }).pass, true);
  assert.equal(computeLightingUniformityRatio({ readings: [2.1, 0.7], target_maxmin: 3 }).pass, true);
});
