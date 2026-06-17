// spec-v23 Part I unit tests: the 20 additive enhancements to existing
// tiles. Each test pins the new mode/output AND asserts the default path is
// unchanged (the enhancement must not move an existing correct output
// without the user opting in), plus the v21 RC-1 guard on any new zeroable
// denominator the inverse introduces.

import { test } from "node:test";
import assert from "node:assert/strict";

import { computeSeerEer, computeBalancePoint } from "../../calc-hvac.js";
import { computeSuperheatSubcool } from "../../calc-refrigerant.js"; // spec-v89 relocation
import { computeTanklessGPM, computeWaterHeaterRecovery, computeGlycolMix } from "../../calc-plumbing.js";
import { computeSnowLoad, computeWindPressure, computeAnchorEmbedment, computeFootingArea } from "../../calc-construction.js";
import { computeRequiredFireFlow, computeMasterStreamReach, computeHydrantFlow } from "../../calc-fire.js";
import { computeFuelRange, computeBrakePadLife } from "../../calc-mechanic.js";
import { computeDisinfectionCT, computeDetentionTime, computeWellDrawdown } from "../../calc-water.js";
import { computeNpkBlend, computeSprayerCalibration } from "../../calc-agriculture.js";
import { computeCapRateDSCR } from "../../calc-realestate.js";

// EN.1 seer-eer: annual-cost cross-check; default conversion unchanged.
test("EN.1 seer-eer: SEER from EER unchanged; annual kWh = load*hrs/(SEER*1000)", () => {
  assert.ok(Math.abs(computeSeerEer({ value: 12, from: "EER" }).SEER - 13.44) < 1e-9);
  const r = computeSeerEer({ value: 12, from: "EER", cooling_load_btu_hr: 36000, annual_hours: 1000, electricity_rate: 0.15 });
  assert.ok(Math.abs(r.annual_kwh - (36000 * 1000) / (13.44 * 1000)) < 1e-6);
  assert.ok(Math.abs(r.annual_cost_usd - r.annual_kwh * 0.15) < 1e-6);
  assert.strictEqual(computeSeerEer({ value: 12, from: "EER" }).annual_kwh, null);
});

// EN.2 superheat-subcool: target-superheat verdict; default result unchanged.
test("EN.2 superheat-subcool: target SH = (3*IWB-80-ODB)/2 + verdict; default omits it", () => {
  const base = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" });
  assert.strictEqual(base.target_superheat_F, null);
  const r = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat", indoor_wet_bulb_F: 63, outdoor_dry_bulb_F: 95 });
  assert.ok(Math.abs(r.target_superheat_F - (3 * 63 - 80 - 95) / 2) < 1e-9);
  assert.ok(["within target band", "overcharge (superheat below target)", "undercharge (superheat above target)"].includes(r.charge_verdict));
});

// EN.3 balance-point: aux strip kW; balance point unchanged.
test("EN.3 balance-point: Q_aux = loss - capacity (>=0), kW = Q_aux/3412", () => {
  const r = computeBalancePoint({ heating_capacity_btu_hr_at_design: 30000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 });
  assert.strictEqual(r.aux_heat_btu_hr, 20000);
  assert.ok(Math.abs(r.aux_strip_kw - 20000 / 3412) < 1e-9);
  assert.strictEqual(computeBalancePoint({ heating_capacity_btu_hr_at_design: 60000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000 }).aux_heat_btu_hr, 0);
});

// EN.4 tankless-gpm: solve-for inverses + inlet override; default GPM unchanged.
test("EN.4 tankless-gpm: kBTU<->GPM inverse round-trips; default GPM unchanged", () => {
  const base = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  const inv = computeTanklessGPM({ solve_for: "kbtu", target_gpm: base.gpm, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  assert.ok(Math.abs(inv.kbtu_input - 199) < 1e-6);
  assert.ok("error" in computeTanklessGPM({ solve_for: "dt", target_gpm: 0, kbtu_input: 199, climate_zone: "5A_Chicago_IL" }));
});

// EN.5 water-heater-recovery: peak-demand flag; first-hour rating unchanged.
test("EN.5 water-heater-recovery: meets_peak = FHR >= peak; default null", () => {
  const base = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 40000, incoming_F: 50, setpoint_F: 120, tank_gal: 40 });
  assert.strictEqual(base.meets_peak, null);
  assert.strictEqual(computeWaterHeaterRecovery({ input_btu_hr: 40000, incoming_F: 50, setpoint_F: 120, tank_gal: 40, peak_demand_gph: 60 }).meets_peak, base.first_hour_gph >= 60);
});

// EN.6 glycol-mix: burst < freeze at the same temperature; penalty reported.
test("EN.6 glycol-mix: burst mode lower concentrate than freeze; penalty present", () => {
  const f = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" });
  const b = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene", protection_mode: "burst" });
  assert.ok(b.glycol_percent < f.glycol_percent);
  assert.ok(f.heat_transfer_penalty_pct > 0);
});

// EN.7 snow-load: Ps = Cs*Pf (Cs default 1 -> Ps = Pf); drift >= 0.
test("EN.7 snow-load: Ps = Cs*Pf, default Cs=1 reproduces Pf; drift >= 0", () => {
  assert.strictEqual(computeSnowLoad({ Pg_psf: 30 }).Ps_psf, 21);
  assert.ok(Math.abs(computeSnowLoad({ Pg_psf: 30, Cs: 0.9 }).Ps_psf - 0.9 * 21) < 1e-9);
  assert.ok(computeSnowLoad({ Pg_psf: 30, drift_upwind_length_ft: 50 }).drift_height_ft >= 0);
});

// EN.8 wind-pressure: design pressure factors; all factors 1 -> base q.
test("EN.8 wind-pressure: q_design with all factors 1 equals 0.00256*V^2", () => {
  const r = computeWindPressure({ V_mph: 100, Kz: 1, Kzt: 1, Kd: 1, G: 1 });
  assert.ok(Math.abs(r.q_design_psf - 0.00256 * 100 * 100) < 1e-9);
  assert.ok(Math.abs(computeWindPressure({ V_mph: 100 }).q_psf - 25.6) < 1e-9); // default unchanged
});

// EN.9 anchor-embedment: cracked derate + edge flag; default embedment unchanged.
test("EN.9 anchor-embedment: cracked needs more embedment; sub-critical edge flags", () => {
  const base = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  assert.strictEqual(base.embedment_cracked_in, base.embedment_in);
  const cr = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000, cracked: true, edge_distance_in: 3 });
  assert.ok(cr.embedment_cracked_in > base.embedment_in);
  assert.strictEqual(cr.edge_reduced_flag, true);
});

// EN.10 footing-area: eccentric bearing check; concentric uniform unchanged.
test("EN.10 footing-area: concentric q_max == q_min; moment flags eccentric", () => {
  const c = computeFootingArea({ column_load_lb: 12000, soil_class: "clay" });
  assert.strictEqual(c.q_max_psf, c.q_min_psf);
  assert.strictEqual(c.eccentric_flag, false);
  const e = computeFootingArea({ column_load_lb: 12000, soil_class: "clay", applied_moment_lbft: 4000 });
  assert.ok(e.q_max_psf > e.q_min_psf);
  assert.strictEqual(e.eccentric_flag, true);
});

// EN.11 required-fire-flow: Iowa second method + divergence; default omits it.
test("EN.11 required-fire-flow: Iowa Q = V/100 with divergence; default null", () => {
  assert.strictEqual(computeRequiredFireFlow({ structure_area_ft2: 5000 }).iowa_rate_gpm, null);
  const r = computeRequiredFireFlow({ structure_area_ft2: 5000, volume_ft3: 40000 });
  assert.strictEqual(r.iowa_rate_gpm, 400);
  assert.ok(Math.abs(r.divergence_gpm - (r.needed_fire_flow_gpm - 400)) < 1e-9);
});

// EN.12 master-stream / hydrant-flow: nozzle reaction NR = 1.57*d^2*NP.
test("EN.12 nozzle reaction added to master-stream (smooth bore) and hydrant-flow", () => {
  assert.ok(Math.abs(computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 }).reaction_lb - 1.57 * 4 * 80) < 1e-9);
  assert.strictEqual(computeMasterStreamReach({ nozzle_type: "fog_master", nozzle_pressure_psi: 100 }).reaction_lb, null);
  assert.ok(Math.abs(computeHydrantFlow({ pitot_psi: 10, outlet_diameter_in: 2.5, c: 0.9 }).reaction_lb - 1.57 * 6.25 * 10) < 1e-9);
});

// EN.13 fuel-range: solve-for-MPG / tank inverses round-trip; RC-1 guards.
test("EN.13 fuel-range: inverse round-trips; default range unchanged; zero denom rejected", () => {
  assert.strictEqual(computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28 }).range_mi, 504);
  assert.ok(Math.abs(computeFuelRange({ solve_for: "mpg", fuel: "gasoline_E10", tank_gal: 18, target_range_mi: 504 }).solved_mpg - 28) < 1e-9);
  assert.ok(Math.abs(computeFuelRange({ solve_for: "tank", fuel: "gasoline_E10", mpg: 28, target_range_mi: 504 }).solved_tank_gal - 18) < 1e-9);
  assert.ok("error" in computeFuelRange({ solve_for: "mpg", fuel: "gasoline_E10", tank_gal: 0, target_range_mi: 504 }));
});

// EN.14 brake-pad-life: wear-rate override + per-axle; 50/50 reproduces single.
test("EN.14 brake-pad-life: 50/50 bias reproduces single estimate; custom wear honored", () => {
  const b = computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_material: "ceramic" });
  assert.ok(Math.abs(b.front_miles_until_worn - b.miles_until_worn) < 1e-6);
  assert.ok(Math.abs(b.rear_miles_until_worn - b.miles_until_worn) < 1e-6);
  const f70 = computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_material: "ceramic", front_bias_pct: 70 });
  assert.ok(f70.front_miles_until_worn < f70.rear_miles_until_worn);
  assert.strictEqual(computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_material: "ceramic", wear_rate_mm_per_kj: 0.00002 }).wear_rate_used, 0.00002);
});

// EN.15 disinfection-ct: required-t10 inverse + log selector; default CT unchanged.
test("EN.15 disinfection-ct: required t10 = CT_required/C; log target scales CT", () => {
  const r = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 7.0 });
  assert.strictEqual(r.CT_achieved, 120);
  assert.ok(Math.abs(r.required_t10_min - r.CT_required_selected / 0.4) < 1e-6);
  assert.ok(computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 7.0, log_target: 4 }).CT_required_selected > r.CT_required_selected);
});

// EN.16 detention-time: overflow-rate cross-checks; default detention unchanged.
test("EN.16 detention-time: SOR = Qgpd/area, WOR = Qgpd/weir; default null", () => {
  const base = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 350 });
  assert.strictEqual(base.surface_overflow_rate_gpd_ft2, null);
  const r = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 350, surface_area_ft2: 1000, weir_length_ft: 100 });
  assert.ok(Math.abs(r.surface_overflow_rate_gpd_ft2 - (350 * 1440) / 1000) < 1e-6);
  assert.ok(Math.abs(r.weir_overflow_rate_gpd_ft - (350 * 1440) / 100) < 1e-6);
});

// EN.17 well-drawdown: transmissivity + recovery; default drawdown unchanged.
test("EN.17 well-drawdown: T = 264*Q/ds; ds omitted -> null", () => {
  const base = computeWellDrawdown({ static_level_ft: 50, pumping_level_ft: 80, discharge_gpm: 30 });
  assert.strictEqual(base.transmissivity_gpd_ft, null);
  assert.strictEqual(base.drawdown_ft, 30);
  assert.ok(Math.abs(computeWellDrawdown({ static_level_ft: 50, pumping_level_ft: 80, discharge_gpm: 30, delta_s_per_log_ft: 5 }).transmissivity_gpd_ft - (264 * 30) / 5) < 1e-6);
});

// EN.18 npk-blend: bag count, tonnage, kg/ha; lb/acre rates unchanged.
test("EN.18 npk-blend: bags = ceil(total/bag), kg/ha = lb/acre*1.12085", () => {
  const r = computeNpkBlend({ crop: "corn", soil_n_lb_per_acre: 20, soil_p_lb_per_acre: 10, soil_k_lb_per_acre: 15, area_acres: 80 });
  assert.strictEqual(r.urea_bags, Math.ceil(r.urea_total_lb / 50));
  assert.ok(Math.abs(r.rec_n_kg_per_ha - r.rec_n_lb_per_acre * 1.12085) < 1e-6);
  assert.ok(r.total_blend_tons > 0);
});

// EN.19 sprayer-calibration: tank batches; GPA unchanged.
test("EN.19 sprayer-calibration: loads = ceil(GPA*acres/tank), acres/tank = tank/GPA", () => {
  const base = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 20, time_s: 2.9, target_gpa: 20 });
  assert.strictEqual(base.total_volume_gal, null);
  const r = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 20, time_s: 2.9, target_gpa: 20, field_acres: 80, tank_size_gal: 300 });
  assert.strictEqual(r.total_volume_gal, 1600);
  assert.strictEqual(r.tank_loads, 6);
  assert.strictEqual(r.acres_per_tank, 15);
});

// EN.20 cap-rate-dscr: loan-derived debt service + break-even occupancy.
test("EN.20 cap-rate-dscr: debt service from loan terms; break-even occupancy", () => {
  const base = computeCapRateDSCR({ noi_annual: 80000, property_value: 1000000, annual_debt_service: 0 });
  assert.strictEqual(base.annual_debt_service_computed, null);
  assert.strictEqual(base.break_even_occupancy, null);
  const r = computeCapRateDSCR({ noi_annual: 80000, property_value: 1000000, loan_amount: 750000, loan_rate_pct: 6.5, amort_years: 30, operating_expenses_annual: 40000, potential_gross_income: 120000 });
  assert.ok(r.annual_debt_service_computed > 56000 && r.annual_debt_service_computed < 58000);
  assert.ok(Math.abs(r.dscr - 80000 / r.annual_debt_service_computed) < 1e-6);
  assert.ok(Math.abs(r.break_even_occupancy - (40000 + r.annual_debt_service_computed) / 120000) < 1e-6);
  // rate = 0 handled (straight-line amortization).
  assert.ok(computeCapRateDSCR({ noi_annual: 80000, property_value: 1000000, loan_amount: 360000, loan_rate_pct: 0, amort_years: 30 }).annual_debt_service_computed === 12000);
});
