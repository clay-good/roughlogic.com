// calc-winterops.js (spec-v1845..v1850) against references the specs did not
// write: the CRC Handbook's freezing points of sodium chloride solutions, the
// geometry of a windrow and a cone, and the balances the tiles' notes claim.
// The worked-example fixture recomputes each spec's own example, so an error a
// spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSaltApplicationRate, computeBrineBatchSalinity, computePlowRouteCycleTime,
  computeSnowStackingArea, computeIceMeltWorkingTemperature, computeWalkwayClearingProductivity,
} from "../../calc-winterops.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const brineBase = { batch_gal: 3000, target_pct: 23.3, brine_density_lb_gal: 9.8, saturation_pct: 26.4, alt_pct: 20 };

// ---- independent references ----

test("brine freezing points match the CRC Handbook within 0.6 degF", () => {
  // CRC Handbook, concentrative properties of aqueous NaCl: freezing-point
  // depression 3.05, 6.56, 10.89 and 16.46 degC at 5, 10, 15 and 20% by mass;
  // the eutectic, 23.3%, freezes at -21.1 degC.
  for (const [pct, depressionC] of [[5, 3.05], [10, 6.56], [15, 10.89], [20, 16.46], [23.3, 21.1]]) {
    const r = computeBrineBatchSalinity({ ...brineBase, target_pct: pct });
    const wantF = 32 - depressionC * 1.8;
    assert.ok(Math.abs(r.freeze_point_f - wantF) <= 0.6, `${pct}%: got ${r.freeze_point_f}, want ${wantF}`);
  }
});

test("brine: the salt is the target fraction of the batch's weight, and salometer is the share of saturation", () => {
  const r = computeBrineBatchSalinity(brineBase);
  close(r.salt_lb, 3000 * 9.8 * 0.233, "salt");
  close(r.salt_lb + r.water_lb, 3000 * 9.8, "mass balance");
  within(r.salometer, 100 * 23.3 / 26.4, 1e-9, "salometer");
  assert.equal(r.at_eutectic, true);
});

test("snow stacking: a windrow's section is h^2 x slope, and a free cone holds the pile on less ground", () => {
  const r = computeSnowStackingArea({ lot_area_ft2: 100000, accumulation_in: 12, events: 3, fresh_density_lb_ft3: 7, pile_density_lb_ft3: 25, pile_height_ft: 12, side_slope_run_per_rise: 1, area_per_space_ft2: 300, allocated_pct: 5 });
  close(r.pile_volume_ft3, 100000 * 7 / 25, "mass conserved as the snow densifies");
  close(r.cross_section_ft2, 144, "12 ft high at 1:1");
  close(r.windrow_length_ft * r.cross_section_ft2, r.pile_volume_ft3, "windrow volume");
  close(Math.PI * r.cone_height_ft ** 3 / 3, r.pile_volume_ft3, "cone volume");
  assert.ok(r.cone_footprint_ft2 < r.footprint_ft2);
});

// ---- balances the notes claim ----

test("salt: a lane-mile is 12 ft x 5,280 ft, and a hopper covers what it holds", () => {
  const r = computeSaltApplicationRate({ rate_lb_per_lane_mile: 250, route_lane_miles: 30, lot_area_ft2: 100000, hopper_capacity_tons: 8, alt_rate_lb_per_lane_mile: 500 });
  close(r.lot_lane_miles, 100000 / (12 * 5280), "lane-miles");
  close(r.passes_per_load * 7500, 16000, "a hopper of passes");
  close(r.alt_reloads_per_pass, 2 * r.reloads_per_pass, "double the rate");
});

test("plow route: the cycle is the route at the effective speed, and the trucks cover the system in the target", () => {
  const r = computePlowRouteCycleTime({ route_lane_miles: 30, plow_speed_mph: 25, overhead_factor: 1.2, system_lane_miles: 300, cycle_target_hr: 2, snowfall_in_hr: 1.5, alt_cycle_target_hr: 4 / 3 });
  close(r.cycle_time_hr, 30 * 1.2 / 25, "cycle");
  assert.ok(r.trucks_required * r.lane_miles_per_truck >= 300);
  assert.ok((r.trucks_required - 1) * r.lane_miles_per_truck < 300);
  close(r.accumulation_in, 1.5 * r.cycle_time_hr, "snow between passes");
});

test("ice melt: product is the ice's mass over the melting capacity", () => {
  const r = computeIceMeltWorkingTemperature({ area_ft2: 1000, ice_thickness_in: 1, ice_density_lb_ft3: 57.2, pavement_temp_f: 30, capacity_lb_ice_per_lb: 46.3, alt_capacity_lb_ice_per_lb: 4.9, alt_temp_f: 10, practical_limit_f: 15, eutectic_f: -6 });
  close(r.ice_mass_lb, 1000 / 12 * 57.2, "ice");
  close(r.product_lb * 46.3, r.ice_mass_lb, "capacity");
  close(r.product_ratio, 46.3 / 4.9, "ratio");
  assert.equal(r.alt_within_practical_limit, false);
});

test("walkways: the crew finishes when the slower of the two parallel operations does", () => {
  const r = computeWalkwayClearingProductivity({ total_area_ft2: 12000, hand_area_ft2: 2000, blower_rate_ft2_hr: 12000, hand_rate_ft2_hr_person: 1200, crew_size: 2, service_window_hr: 2, blower_depth_factor: 0.25, hand_depth_factor: 1 / 3, icemelt_lb_per_1000ft2: 4, applications: 3 });
  close(r.blower_hr, 10000 / 3000, "machine");
  close(r.hand_hr, 2000 / 800, "hand");
  close(r.crew_hr, Math.max(r.blower_hr, r.hand_hr), "the slower governs");
  assert.equal(r.crews_required, Math.ceil(r.crew_hr / 2));
  close(r.icemelt_event_lb, 12 * 4 * 3, "ice melt");
});
