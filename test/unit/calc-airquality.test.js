// calc-airquality.js, the air permitting bench of spec-v1717..v1730, against
// references the specs did not write: the Briggs final-rise equations as EPA's
// ISC3 guide prints them, EPA Method 24's "less water and exempt" basis, the
// derivations of the 3,960 and 6,356 power constants, Charles's law, the two
// odour units, and the identities the tiles' notes claim. These tiles' only
// worked-example rows recompute their own specs, so an error a spec and its
// tile share passes that fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStackEmissionPte, computeOpacitySixMinute, computeBaghouseCleaningInterval,
  computeScrubberLgRatio, computeThermalOxidizerResidence, computeCoatingVocCompliance,
  computeSpccContainmentVolume, computeEspDeutschEfficiency, computeCarbonBedLife,
  computePlumeRiseBriggs, computeNoiseBarrierInsertionLoss, computeOdorDilutionThreshold,
} from "../../calc-airquality.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- independent references ----

test("Briggs: buoyancy flux and final rise as EPA's ISC3 guide writes them, in SI", () => {
  // F = g v d^2 (Ts - Ta) / (4 Ts); final rise 21.425 F^0.75 / u below F = 55
  // and 38.71 F^0.6 / u above it.
  const r = computePlumeRiseBriggs({ stack_height_ft: 120, stack_diameter_ft: 5, exit_velocity_fps: 55, exit_temp_f: 350, ambient_temp_f: 60, wind_mph: 12 });
  const Ts = (350 - 32) / 1.8 + 273.15, Ta = (60 - 32) / 1.8 + 273.15;
  const F = 9.80665 * 55 * 0.3048 * (5 * 0.3048) ** 2 * (Ts - Ta) / (4 * Ts);
  const u = 12 * 0.44704;
  const rise = F < 55 ? 21.425 * F ** 0.75 / u : 38.71 * F ** 0.6 / u;
  within(r.plume_rise_ft, rise / 0.3048, 1e-9, "final rise");
  // Rise goes as 1 / u.
  const windy = computePlumeRiseBriggs({ stack_height_ft: 120, stack_diameter_ft: 5, exit_velocity_fps: 55, exit_temp_f: 350, ambient_temp_f: 60, wind_mph: 24 });
  close(windy.plume_rise_ft, r.plume_rise_ft / 2, "twice the wind, half the rise");
});

test("coating VOC: EPA Method 24's less-water-and-exempt basis", () => {
  // (Ws - Ww - Wes) / (Vm - Vw - Ves): the VOC mass over the volume that is not
  // water or exempt compound.
  const r = computeCoatingVocCompliance({ coating_gal: 1, voc_lb: 0.5, water_gal: 0.55, exempt_gal: 0, thinner_gal: 0.2, thinner_voc_lb_per_gal: 7, limit_lb_per_gal: 2.8 });
  close(r.voc_less_water, 0.5 / 0.45, "as supplied");
  close(r.applied_voc_less_water, (0.5 + 1.4) / (1.2 - 0.55), "as applied, with the thinner");
});

test("scrubber: 3,960 and 6,356 are the water and air horsepower constants", () => {
  // 33,000 ft-lb/min per hp over 8.33 lb/gal; over 5.192 lb/sq ft per in. w.c.
  within(33000 / 8.33, 3960, 0.1, "pump");
  within(33000 / 5.192, 6356, 0.1, "fan");
  const r = computeScrubberLgRatio({ gas_acfm: 15000, lg_ratio_gpm_per_1000: 10, pump_head_ft: 40, pump_efficiency: 0.65, specific_gravity: 1, annual_hours: 6000, energy_rate_per_kwh: 0.1, alternate_lg_ratio: 20, pressure_drop_inwc: 6, fan_efficiency: 0.65, scrubber_type: "packed_tower" });
  close(r.liquid_gpm, 150, "L/G x gas");
  close(r.pump_bhp, 150 * 40 / (3960 * 0.65), "pump");
  close(r.fan_bhp, 15000 * 6 / (6356 * 0.65), "fan");
});

test("thermal oxidizer: residence time on ACTUAL flow, by Charles's law", () => {
  const r = computeThermalOxidizerResidence({ inlet_scfm: 8000, chamber_temp_f: 1600, standard_temp_f: 70, required_residence_s: 0.75, chamber_volume_ft3: 389 });
  close(r.expansion_factor, (1600 + 459.67) / (70 + 459.67), "absolute temperatures");
  close(r.actual_residence_s, 389 * 60 / r.actual_acfm, "residence");
});

test("odour: both odour units, a cubic foot and EN 13725's cubic metre", () => {
  const r = computeOdorDilutionThreshold({ source_dt: 2400, airflow_acfm: 15000, dilution_factor: 400, limit_dt: 10, target_dt: 2 });
  close(r.odour_emission_rate_ou_s, 2400 * 15000 / 60, "cubic-foot odour units, as spec-v1730 writes it");
  close(r.odour_emission_rate_oue_s, 2400 * 15000 * 0.3048 ** 3 / 60, "OU_E per second");
  close(r.odour_emission_rate_ou_s / r.odour_emission_rate_oue_s, 1 / 0.3048 ** 3, "the ratio is a cubic metre in cubic feet, 35.31");
  close(r.dt_at_receptor, 6, "2,400 over 400");
});

test("noise barrier: Maekawa, IL = 10 log(3 + 20 N) with N = 2 delta / lambda", () => {
  const r = computeNoiseBarrierInsertionLoss({ source_to_top_ft: 0, top_to_receiver_ft: 0, source_to_receiver_ft: 0, path_difference_ft: 0.5, frequency_hz: 1000, second_frequency_hz: 125, practical_ceiling_db: 20 });
  close(r.fresnel_number, 2 * 0.5 / (1130 / 1000), "Fresnel number");
  close(r.raw_insertion_loss_db, 10 * Math.log10(3 + 20 * r.fresnel_number), "Maekawa");
  within(r.grazing_db, 4.77, 0.1, "grazing incidence, 10 log 3");
});

// ---- identities the notes claim ----

test("ESP: Deutsch-Anderson, and each decade of penetration costs the same plate area", () => {
  const r = computeEspDeutschEfficiency({ plate_area_ft2: 12000, gas_acfm: 60000, migration_velocity_fps: 0.2, target_efficiency_pct: 99 });
  close(r.efficiency_pct, 100 * (1 - Math.exp(-12000 * 0.2 / 1000)), "eta = 1 - e^(-wA/Q)");
  close(r.area_999 - r.area_99, r.area_99 - r.area_90, "equal decades");
});

test("PTE: every hour of the year, and the permit limit that makes a source minor", () => {
  const r = computeStackEmissionPte({ hourly_rate_lb_h: 11, actual_hours_per_year: 2000, permitted_hours_per_year: 0, major_threshold_tpy: 100, control_efficiency_pct: 0, control_enforceable: "no" });
  close(r.pte_tpy, 11 * 8760 / 2000, "8,760 hours");
  close(r.hours_for_minor * 11 / 2000, 100, "the hours that land on the threshold");
});

test("opacity: the six-minute average is 24 readings at 15 s", () => {
  const r = computeOpacitySixMinute({ readings_sum_pct: 305, reading_count: 24, peak_reading_pct: 60, limit_pct: 20, steady_reading_pct: 22 });
  close(r.block_average_pct, 305 / 24, "block average");
  assert.equal(r.full_block, true);
});

test("baghouse: the months left are the working range over the baseline's creep", () => {
  const r = computeBaghouseCleaningInterval({ baseline_inwc: 3.9, trigger_inwc: 6, cycle_minutes: 14, original_baseline_inwc: 2, original_cycle_minutes: 45, elapsed_months: 6, operating_hours_per_day: 24, cleaning_mode: "on_demand" });
  close(r.months_to_trigger, 2.1 / (1.9 / 6), "months to trigger");
});

test("SPCC: the net dike volume is gross less what the other tanks displace", () => {
  const r = computeSpccContainmentVolume({ largest_tank_gal: 12000, freeboard_pct: 10, dike_length_ft: 80, dike_width_ft: 60, dike_height_ft: 3, other_tank_count: 3, other_tank_diameter_ft: 12, other_equipment_ft3: 0 });
  close(r.net_ft3, 14400 - 3 * Math.PI * 36 * 3, "net");
  close(r.net_gal, r.net_ft3 * 1728 / 231, "gallons");
});

test("carbon bed: life is working capacity over the loading", () => {
  const r = computeCarbonBedLife({ carbon_lb: 2000, working_capacity_pct: 10, loading_lb_h: 1.4, operating_hours_per_day: 8, degraded_capacity_pct: 6 });
  close(r.bed_life_hours, 200 / 1.4, "hours");
  close(r.life_lost_pct, 40, "6% capacity against 10%");
});
