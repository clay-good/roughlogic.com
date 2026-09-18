// calc-greenhouse.js (spec-v1750..v1762) against references the specs did not
// write: published saturation vapour pressures, CO2's density from the ideal
// gas law, the derivation of the 1.08 sensible factor, and the identities the
// tiles' notes claim. The worked-example fixture recomputes each spec's own
// example, so an error a spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGreenhouseVentArea, computeFanPadEvaporativeCooling, computePpfdDailyLightIntegral,
  computeGrowLightFixtureCount, computeVaporPressureDeficit, computeCo2EnrichmentRate,
  computeShadeClothTransmission, computeGreenhouseTranspirationWater,
  computeThermalScreenEnergySaving, computePlugTrayCellCount, computeSubstrateContainerVolume,
  computePhotoperiodBlackoutSchedule, computeLeachingFractionRunoffEc,
} from "../../calc-greenhouse.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);
const cToF = (c) => c * 9 / 5 + 32;

// ---- published values ----

test("saturation vapour pressure matches the published table over water within 0.2%", () => {
  // CRC Handbook / WMO saturation vapour pressure over liquid water:
  // 15 C 1.705 kPa, 20 C 2.339, 25 C 3.169, 30 C 4.246.
  for (const [c, kpa] of [[15, 1.705], [20, 2.339], [25, 3.169], [30, 4.246]]) {
    const r = computeVaporPressureDeficit({ air_temp_f: cToF(c), relative_humidity_pct: 50, leaf_offset_f: 0, alternative_leaf_offset_f: 0, alternative_humidity_pct: 50 });
    within(r.air_saturation_kpa, kpa, 0.2, `${c} C`);
  }
});

test("CO2's weight per cubic foot is the ideal-gas density at 70 degF", () => {
  // rho = P M / (R T): 101,325 Pa x 0.0440095 kg/mol / (8.314462 x 294.261 K)
  // = 1.8227 kg/m^3 = 0.11379 lb/ft^3.
  const rho = 101325 * 0.0440095 / (8.314462618 * (21.1111 + 273.15)) * 0.0624279606;
  const r = computeCo2EnrichmentRate({ house_volume_ft3: 1e6, ambient_ppm: 400, target_ppm: 1400, air_changes_per_hour: 1, gas_price_per_lb: 1, vented_air_changes_per_hour: 2, floor_area_sqft: 1000, enrichment_hours_per_day: 1 });
  // 1,000 ppm of 1,000,000 cu ft is 1,000 cu ft of CO2.
  close(r.initial_charge_ft3, 1000, "initial charge volume");
  within(r.initial_charge_lb / 1000, rho, 0.3, "lb per cu ft");
});

test("the 1.08 sensible factor is 60 min/h x 0.075 lb/cu ft x 0.24 Btu/lb-degF", () => {
  const r = computeFanPadEvaporativeCooling({ floor_area_sqft: 2880, airflow_per_sqft_cfm: 8, pad_face_velocity_fpm: 250, pad_height_ft: 5, outdoor_dry_bulb_f: 95, outdoor_wet_bulb_f: 75, pad_efficiency_pct: 85, solar_gain_btuh_per_sqft: 188, latent_fraction: 0.5 });
  close(r.temp_rise_f, r.cropped_sensible_btuh / (60 * 0.075 * 0.24 * r.total_airflow_cfm), "air-side rise");
  close(r.pad_outlet_temp_f, 95 - 0.85 * 20, "pad saturation efficiency");
  close(r.pad_area_sqft * 250, r.total_airflow_cfm, "face velocity");
});

// ---- identities the notes claim ----

test("vents: two equal openings in series act as one of area A / sqrt(2), and airflow goes as sqrt(dT)", () => {
  const base = { house_width_ft: 30, house_length_ft: 96, gutter_height_ft: 12, ridge_height_ft: 18, roof_vent_pct: 18, side_vent_pct: 18, design_temp_difference_f: 5, discharge_coefficient: 0.6, mild_temp_difference_f: 1 };
  const r = computeGreenhouseVentArea(base);
  close(r.effective_area_sqft, r.roof_vent_area_sqft / Math.SQRT2, "equal openings");
  close(r.mild_airflow_cfm / r.airflow_cfm, Math.sqrt(1 / 5), "sqrt of the temperature ratio");
  // The stack equation, Q = Cd A sqrt(2 g h dT / T), evaluated independently.
  const q = 0.6 * r.effective_area_sqft * Math.sqrt(2 * 32.174 * 6 * 5 / (80 + 459.67)) * 60;
  within(r.airflow_cfm, q, 0.1, "stack airflow");
});

test("DLI is PPFD x seconds of light, and the supplement fills exactly the shortfall", () => {
  const r = computePpfdDailyLightIntegral({ ppfd_umol_m2_s: 400, photoperiod_hours: 16, outdoor_dli: 6, transmission_pct: 65, target_dli: 20 });
  close(r.dli, 400 * 16 * 3600 / 1e6, "DLI");
  close(r.inside_dli + r.supplemental_ppfd_umol_m2_s * 16 * 3600 / 1e6, 20, "supplement closes the gap");
});

test("fixtures: the count delivers the target, and one fewer does not", () => {
  const r = computeGrowLightFixtureCount({ growing_area_sqft: 1000, target_ppfd_umol_m2_s: 200, fixture_ppf_umol_s: 1700, fixture_watts: 645, on_target_fraction: 0.9, photoperiod_hours: 16, season_days: 180, energy_rate_per_kwh: 0.12 });
  close(r.growing_area_m2, 1000 * 0.3048 * 0.3048, "square metres");
  assert.ok(r.fixture_count * 1700 * 0.9 >= r.photons_required_umol_s);
  assert.ok((r.fixture_count - 1) * 1700 * 0.9 < r.photons_required_umol_s);
  close(r.heat_btuh, r.connected_load_w * 3.412, "every watt becomes heat");
});

test("VPD: leaf warmer than air raises it, wetter air lowers it", () => {
  const r = computeVaporPressureDeficit({ air_temp_f: 75, relative_humidity_pct: 65, leaf_offset_f: -2, alternative_leaf_offset_f: 3, alternative_humidity_pct: 80 });
  close(r.air_vpd_kpa, r.air_saturation_kpa * 0.35, "air VPD = saturation x (1 - RH)");
  assert.ok(r.alternative_leaf_vpd_kpa > r.leaf_vpd_kpa);
  assert.ok(r.humid_leaf_vpd_kpa < r.leaf_vpd_kpa);
});

test("CO2 makeup is linear in air changes", () => {
  const r = computeCo2EnrichmentRate({ house_volume_ft3: 43200, ambient_ppm: 400, target_ppm: 1000, air_changes_per_hour: 1, gas_price_per_lb: 0.1, vented_air_changes_per_hour: 30, floor_area_sqft: 2880, enrichment_hours_per_day: 10 });
  close(r.vented_lb_per_hour, 30 * r.makeup_lb_per_hour, "30 air changes");
  close(r.makeup_ft3_per_hour, r.initial_charge_ft3, "one air change replaces one charge");
});

test("shade: transmissions multiply, and the required shade lands exactly on the target", () => {
  const base = { outdoor_dli: 45, glazing_transmission_pct: 65, shade_pct: 50, target_dli: 20, outdoor_peak_btuh_per_sqft: 290, floor_area_sqft: 2880 };
  const r = computeShadeClothTransmission(base);
  close(r.two_layer_transmission, 0.65 * 0.25, "two layers");
  const exact = computeShadeClothTransmission({ ...base, shade_pct: r.required_shade_pct });
  close(exact.inside_dli, 20, "required shade");
});

test("transpiration: the latent energy is the water, and the drain is the leaching fraction of what was applied", () => {
  const r = computeGreenhouseTranspirationWater({ floor_area_sqft: 2880, daily_solar_btu_per_sqft: 1500, latent_fraction: 0.5, leaching_fraction: 0.2, peak_solar_btuh_per_sqft: 188, irrigation_hours_per_day: 12 });
  close(r.transpiration_lb_per_day * 1050, 2880 * 1500 * 0.5, "latent heat");
  close(r.leached_gal_per_day, 0.2 * r.applied_gal_per_day, "leaching fraction");
});

test("thermal screen: a flat-roofed house has the envelope of a box", () => {
  // A zero rise is refused, so approach it: at a 1e-9 ft rise the envelope is
  // the box's four walls and its roof.
  const r = computeThermalScreenEnergySaving({ house_width_ft: 30, house_length_ft: 96, gutter_height_ft: 12, ridge_height_ft: 12 + 1e-9, glazing_u_factor: 1.2, screen_ua_reduction_pct: 35, season_nights: 180, night_hours: 12, night_temp_difference_f: 40, plant_efficiency_pct: 80, fuel_price_per_therm: 1.2, screen_cost_per_sqft: 4 });
  within(r.envelope_sqft, 2 * 30 * 12 + 2 * 96 * 12 + 30 * 96, 1e-6, "box");
  close(r.heat_saved_btu, 0.35 * r.base_ua * 40 * 180 * 12, "UA x dT x hours");
  close(r.payback_years * r.annual_saving, r.screen_cost, "payback");
});

test("plug trays: the trays sown cover the order, and one tray fewer would not", () => {
  const r = computePlugTrayCellCount({ plants_required: 12000, cells_per_tray: 288, germination_pct: 92, cull_pct: 5, seeds_per_cell: 1, tray_footprint_sqft: 1.6 });
  close(r.survival, 0.92 * 0.95, "survival");
  assert.ok(r.finished_yield >= 12000);
  assert.ok((r.trays_to_sow - 1) * 288 * r.survival < 12000);
});

test("substrate: a true gallon is 231 cubic inches, and the order covers the loose volume", () => {
  const r = computeSubstrateContainerVolume({ container_count: 5000, filled_volume_in3: 231, allowance_pct: 0, bale_label_ft3: 3.8, bale_loose_yield_ft3: 2.8, true_gallon_in3: 231 });
  close(r.loose_volume_ft3, 5000 * 231 / 1728, "cubic feet");
  close(r.true_gallon_over_pct, 0, "a filled true gallon is a true gallon");
  assert.ok(r.bale_count * 2.8 >= r.ordered_volume_ft3);
});

test("photoperiod: the blackout wraps midnight, and light plus dark is a day", () => {
  const r = computePhotoperiodBlackoutSchedule({ blackout_pull_hour: 17, blackout_open_hour: 8, critical_dark_hours: 13, long_photoperiod_hours: 16, short_photoperiod_hours: 11, ppfd_umol_m2_s: 400, interruption_hours: 4, interruption_ppfd_umol_m2_s: 2 });
  assert.equal(r.dark_hours, 15);
  assert.equal(r.dark_hours + r.light_hours, 24);
  assert.equal(r.satisfies_critical, true);
  const sameDay = computePhotoperiodBlackoutSchedule({ blackout_pull_hour: 2, blackout_open_hour: 9, critical_dark_hours: 13, long_photoperiod_hours: 16, short_photoperiod_hours: 11, ppfd_umol_m2_s: 400, interruption_hours: 4, interruption_ppfd_umol_m2_s: 2 });
  assert.equal(sameDay.dark_hours, 7);
});

test("leaching: with no uptake, the salt that goes in comes out in the drain", () => {
  const r = computeLeachingFractionRunoffEc({ volume_applied: 1, volume_drained: 0.2, feed_ec: 2, measured_leachate_ec: 3, alternative_leaching_fraction: 0.4, target_leachate_ec: 3 });
  close(r.bound_ec * 0.2, 2 * 1, "salt balance at the bound");
  close(r.required_leaching_fraction * 3, 2, "the target at its required fraction");
  close(r.implied_uptake_pct, 100 * (1 - 3 * 0.2 / 2), "uptake from the measured drain");
});
