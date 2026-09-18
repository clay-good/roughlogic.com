// calc-waste.js (spec-v1789..v1799) against references the specs did not
// write: EPA's LandGEM equation computed independently, methane's ideal-gas
// density, and the mass and volume balances the tiles' notes claim. The
// worked-example fixture recomputes each spec's own example, so an error a
// spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLandfillAirspaceDensity, computeLandfillGasGeneration, computeLeachateWaterBalance,
  computeDailyCoverVolume, computeCollectionRouteProductivity, computeTransferStationThroughput,
  computeLfgFlareCapacity, computeDiversionRateContamination, computeLandfillSettlementAirspace,
  computeCollectionVehiclePayload, computeWorkingFaceCellLift,
} from "../../calc-waste.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const lfgBase = { annual_tons: 250000, placement_years: 20, methane_yield_m3_per_mg: 100, decay_constant_per_year: 0.04, methane_fraction_pct: 50, collection_efficiency_pct: 75, methane_heating_value_btu_per_cf: 911, generator_efficiency_pct: 30 };

// EPA LandGEM v3.02: Q = sum_i sum_j k L0 (M_i / 10) e^(-k t_ij), each year's
// waste in tenths, t_ij the age of each tenth. In the year after closure the
// newest waste is 0.1 to 1.0 years old.
const landgemAfterClosure = ({ annual_tons, placement_years, methane_yield_m3_per_mg: L0, decay_constant_per_year: k }) => {
  const Mg = annual_tons * 2000 * 0.45359237 / 1000;
  let q = 0;
  for (let i = 0; i < placement_years; i++) {
    for (let j = 1; j <= 10; j++) q += k * L0 * (Mg / 10) * Math.exp(-k * (i + j / 10));
  }
  return q;
};

// ---- independent references ----

test("landfill gas: the whole-year sum reads above LandGEM by exactly the tenth-year step it skips", () => {
  // The tile sums whole years with the newest counted at age zero (spec-v1790);
  // LandGEM steps in tenths. At closure LandGEM is the tile times the mean of
  // e^(-k j) over j = 0.1..1.0 -- 2.2% lower at k = 0.04, and 31% lower at
  // LandGEM's own wet-inventory k of 0.7. The tile discloses this.
  for (const k of [0.02, 0.04, 0.07, 0.7]) {
    const r = computeLandfillGasGeneration({ ...lfgBase, decay_constant_per_year: k });
    let step = 0;
    for (let j = 1; j <= 10; j++) step += Math.exp(-k * j / 10) / 10;
    within(landgemAfterClosure({ ...lfgBase, decay_constant_per_year: k }), r.methane_m3_per_year * step, 1e-9, `k = ${k}`);
  }
  const conventional = computeLandfillGasGeneration(lfgBase);
  within(landgemAfterClosure(lfgBase) / conventional.methane_m3_per_year, 0.978, 0.1, "k = 0.04");
});

test("landfill gas: the megagram and the cubic metre convert exactly", () => {
  const r = computeLandfillGasGeneration(lfgBase);
  close(r.annual_megagrams, 250000 * 2000 * 0.45359237 / 1000, "megagrams");
  close(r.methane_cf_per_year, r.methane_m3_per_year / (0.3048 ** 3), "cubic feet");
  close(r.methane_cfm, r.methane_cf_per_year / (365 * 24 * 60), "cfm");
  close(r.decay_sum, (1 - Math.exp(-0.04 * 20)) / (1 - Math.exp(-0.04)), "geometric sum");
  close(r.capacity_20yr_kw, r.collected_capacity_kw * Math.exp(-0.8), "decline after closure");
});

test("flare: the methane density entered is methane's ideal-gas density at 60 degF", () => {
  // rho = P M / (R T): 101,325 Pa x 0.016043 kg/mol / (8.314462 x 288.706 K)
  // = 0.6772 kg/m^3 = 0.04228 lb/cu ft; the worked example enters 0.04226.
  const rho = 101325 * 0.016043 / (8.314462618 * 288.7056) * 0.0624279606;
  within(0.04226, rho, 0.1, "methane at 60 degF");
  const r = computeLfgFlareCapacity({ peak_lfg_cfm: 1712, methane_fraction_pct: 50, design_margin_pct: 25, turndown_ratio: 10, methane_heating_value_btu_per_cf: 911, destruction_efficiency_pct: 98, global_warming_potential: 28, reduced_methane_fraction_pct: 20, methane_density_lb_per_cf: rho });
  close(r.methane_lb_per_year, 856 * 60 * 8760 * rho, "a year of methane");
  close(r.minimum_stable_scfm * 10, r.rated_capacity_scfm, "turndown");
  close(r.design_btu_per_cf, 911 / 2, "the gas, not the methane, is what the flame sees");
});

// ---- balances the notes claim ----

test("airspace: waste plus cover is the whole airspace, and density buys it back in proportion", () => {
  const r = computeLandfillAirspaceDensity({ annual_tons: 250000, in_place_density_lb_per_cy: 1200, cover_ratio_pct: 20, airspace_value_per_cy: 8, improved_density_lb_per_cy: 1500 });
  close(r.waste_airspace_cy, 250000 * 2000 / 1200, "waste");
  close(r.total_airspace_cy, r.waste_airspace_cy * 1.2, "with cover");
  close(r.improved_total_airspace_cy, r.total_airspace_cy * 1200 / 1500, "airspace goes as 1 / density");
});

test("leachate: infiltration is what runoff and evapotranspiration leave, and an inch on an acre is 27,154 gallons", () => {
  const r = computeLeachateWaterBalance({ open_acres: 1, annual_precip_in: 1 / 0.55, runoff_coefficient: 0.15, evapotranspiration_coefficient: 0.30, capped_infiltration_in_per_year: 0.5, design_storm_in: 2 });
  close(r.infiltration_in_per_year, 1, "one inch");
  close(r.leachate_gal_per_year, 43560 / 12 * 1728 / 231, "an acre-inch");
  within(r.leachate_gal_per_year, 27154, 0.01, "rounded");
});

test("daily cover: the face times the depth, every operating day", () => {
  const r = computeDailyCoverVolume({ face_length_ft: 100, face_width_ft: 150, cover_depth_in: 6, operating_days: 312, airspace_value_per_cy: 8, annual_tons: 250000, in_place_density_lb_per_cy: 1200, alternative_cover_annual_cost: 5000 });
  close(r.cover_cy_per_day, 100 * 150 * 0.5 / 27, "a day");
  close(r.cover_cy_per_year, 312 * r.cover_cy_per_day, "a year");
  close(r.extra_site_life_years * 250000, r.cover_cy_per_year * 0.6, "tons the airspace would have held");
});

test("route: the day is collection plus haul plus tipping plus overhead, and the stops that fit fill the shift", () => {
  const base = { stop_count: 900, seconds_per_stop: 22, setout_weight_lb: 40, truck_payload_tons: 12, round_trip_min: 45, tipping_min: 15, fixed_time_hr: 0.5, break_time_hr: 0.5, shift_hours: 8 };
  const r = computeCollectionRouteProductivity(base);
  close(r.route_day_hours, 900 * 22 / 3600 + r.disposal_loads * (45 + 15) / 60 + 1, "route day");
  assert.equal(r.disposal_loads, Math.ceil(900 * 40 / 2000 / 12));
  assert.ok(r.max_stops * 22 / 3600 <= r.available_hours);
  assert.ok((r.max_stops + 1) * 22 / 3600 > r.available_hours);
});

test("transfer station: the peak hour, not the average, sets the positions", () => {
  const r = computeTransferStationThroughput({ daily_tons: 800, operating_hours: 10, peak_hour_share_pct: 15, collection_payload_tons: 8, floor_time_min: 6, trailer_payload_tons: 22, trailer_round_trip_hr: 3, loose_density_lb_per_cy: 400, pile_depth_ft: 8, manoeuvring_factor: 3, loadout_delay_hr: 2 });
  close(r.peak_hour_tons, 120, "peak hour");
  assert.equal(r.unloading_positions, Math.ceil(120 / 8 * 6 / 60));
  assert.ok(r.unloading_positions >= r.average_positions);
  close(r.surge_footprint_sqft * 8, r.surge_cy * 27, "pile volume");
  assert.ok(r.trailer_fleet * r.loads_per_trailer >= r.trailer_loads_per_day);
});

test("diversion: contamination comes off the claim, and the two percentages use different bases", () => {
  const r = computeDiversionRateContamination({ total_generated_tons: 100000, recycling_tons: 22000, organics_tons: 8000, contamination_pct: 18, processing_fee_per_ton: 75, tipping_fee_per_ton: 45, improved_contamination_pct: 8 });
  close(r.reported_diversion_pct, 30, "claim");
  close(r.true_diversion_pct, 30 - 22000 * 0.18 / 1000, "true rate");
  close(r.overstatement_share_of_claim_pct * r.reported_diversion_pct, r.overstatement_above_true_pct * r.true_diversion_pct, "same gap, two bases");
});

test("settlement: volume is depth times area, and a slope reverses once differential settlement exceeds its fall", () => {
  const base = { waste_thickness_ft: 100, filled_acres: 50, primary_settlement_pct: 8, secondary_settlement_pct: 12, in_place_density_lb_per_cy: 1200, tipping_fee_per_ton: 45, cap_slope_pct: 4, slope_run_ft: 300, adjacent_thickness_ft: 50 };
  const r = computeLandfillSettlementAirspace(base);
  close(r.recoverable_airspace_cy, 8 * 50 * 43560 / 27, "primary settlement airspace");
  close(r.differential_settlement_ft, 20 - 10, "differential");
  assert.equal(r.slope_reverses, false);
  assert.equal(computeLandfillSettlementAirspace({ ...base, slope_run_ft: 200 }).slope_reverses, true);
});

test("payload: the governing payload is the lesser of what the body holds and what the chassis may carry", () => {
  const r = computeCollectionVehiclePayload({ body_volume_cy: 25, loose_density_lb_per_cy: 200, compaction_ratio: 3, gvwr_lb: 33000, tare_weight_lb: 21000, alternative_body_volume_cy: 31, alternative_gvwr_lb: 54000, alternative_tare_weight_lb: 28000, wet_loose_density_lb_per_cy: 250 });
  close(r.body_payload_lb, 25 * 600, "body");
  close(r.chassis_payload_lb, 12000, "chassis");
  close(r.governing_payload_tons * 2000, Math.min(15000, 12000), "governing");
  close(r.legal_fill_cy * 600, 12000, "legal fill");
});

test("working face: a day's waste fills the advance, and a narrower face exposes less", () => {
  const r = computeWorkingFaceCellLift({ daily_tons: 800, in_place_density_lb_per_cy: 1200, face_width_ft: 100, lift_height_ft: 10, face_slope_run: 3, cover_depth_in: 6, layer_thickness_ft: 2, passes_per_layer: 4, narrow_face_width_ft: 50 });
  close(r.advance_ft_per_day * 100 * 10, r.daily_volume_cuft, "volume placed");
  close(r.slope_length_ft, 10 * Math.sqrt(10), "3:1 face");
  assert.ok(r.narrow_exposed_sqft < r.exposed_sqft);
  close(r.total_passes, 5 * 4, "passes");
});
