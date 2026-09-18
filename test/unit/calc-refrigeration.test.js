// calc-refrigeration.js, the industrial refrigeration bench of spec-v1484..v1494,
// against references the specs did not write: the interstage pressure found by
// minimising the larger stage ratio directly, CO2's critical point, Kauf's
// optimum gas-cooler pressure, ASHRAE 15's relief and ventilation formulae, and
// the identities the tiles' notes claim. These tiles' only worked-example rows
// recompute their own specs, so an error a spec and its tile share passes that
// fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAmmoniaChargeInventory, computeTwoStageInterstagePressure, computeRefrigeratedCaseLoad,
  computeFreezerUnderfloorHeat, computeCondenserTdHeadPressure, computeReceiverPumpdownCapacity,
  computeSecondaryGlycolLoop, computeCo2TranscriticalPressure, computeRefrigerationReliefCapacity,
  computeMachineryRoomVentilation,
} from "../../calc-refrigeration.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- independent references ----

test("interstage: the pressure that minimises the larger stage ratio is the geometric mean", () => {
  const r = computeTwoStageInterstagePressure({ low_psig: 15, high_psig: 185, intermediate_load_psig: 0 });
  const lo = 15 + 14.7, hi = 185 + 14.7;
  let best = lo, worst = Infinity;
  for (let p = lo; p <= hi; p += 0.001) {
    const m = Math.max(p / lo, hi / p);
    if (m < worst) { worst = m; best = p; }
  }
  within(r.interstage_psia, best, 0.01, "brute-force optimum");
  close(r.stage_ratio ** 2, r.single_stage_ratio, "equal stage ratios");
});

test("CO2: the critical point is 87.8 degF, and Kauf's optimum is 2.6 t + 7.54 bar", () => {
  // CO2's critical temperature is 31.0 degC = 87.8 degF.
  within((31.0 * 9) / 5 + 32, 87.8, 0.01, "critical point");
  const r = computeCo2TranscriticalPressure({ ambient_f: 95, gas_cooler_approach_f: 5, evaporating_psig: 300 });
  assert.equal(r.is_transcritical, true);
  const t = (100 - 32) / 1.8;
  close(r.p_opt_bar, 2.6 * t + 7.54, "Kauf 1999");
  close(r.p_opt_psia, r.p_opt_bar * 14.503773773, "bar to psia");
  const sub = computeCo2TranscriticalPressure({ ambient_f: 70, gas_cooler_approach_f: 5, evaporating_psig: 300 });
  assert.equal(sub.is_transcritical, false);
});

test("ASHRAE 15: relief C = f D L, and machinery-room exhaust Q = 100 sqrt(G)", () => {
  const relief = computeRefrigerationReliefCapacity({ vessel_diameter_ft: 4, vessel_length_ft: 16, f_constant: 0.5, valve_rated_lb_min: 45, pipe_straight_length_ft: 60, fitting_equivalent_length_ft: 25, max_allowable_equivalent_length_ft: 120 });
  close(relief.required_lb_min, 0.5 * 4 * 16, "C = f D L");
  assert.equal(relief.valve_adequate, true);
  const vent = computeMachineryRoomVentilation({ largest_system_charge_lb: 2400, room_length_ft: 40, room_width_ft: 30, room_height_ft: 16, louver_face_velocity_fpm: 500, louver_free_area_fraction: 0.5, installed_fan_cfm: 5000 });
  close(vent.required_exhaust_cfm, 100 * Math.sqrt(2400), "Q = 100 sqrt(G)");
  close(vent.charge_covered_lb, 2500, "the charge 5,000 cfm covers");
});

// ---- identities the notes claim ----

test("ammonia inventory: volume x fill x density, summed, against the 10,000 lb PSM threshold", () => {
  const r = computeAmmoniaChargeInventory({ receiver_volume_gal: 1200, receiver_fill_fraction: 0.3, receiver_density_lb_ft3: 37.2, recirculator_volume_gal: 900, recirculator_fill_fraction: 0.6, recirculator_density_lb_ft3: 42.4, piping_volume_ft3: 780, piping_liquid_fraction: 0.25, piping_density_lb_ft3: 40, threshold_lb: 10000 });
  close(r.receiver_lb, 1200 * 231 / 1728 * 0.3 * 37.2, "receiver");
  close(r.total_lb, r.receiver_lb + r.recirculator_lb + 780 * 0.25 * 40, "total");
});

test("case load: every watt of lights, fans and heaters inside the case is load, at 3.412 Btu/h", () => {
  const r = computeRefrigeratedCaseLoad({ case_length_ft: 12, infiltration_btuh_per_ft: 780, transmission_btuh_per_ft: 95, product_btuh: 1200, lights_w: 240, fan_w: 310, antisweat_w: 180, antisweat_run_fraction: 0.6, defrost_w: 0, defrost_run_fraction: 0, retrofit_lights_w: 90, retrofit_antisweat_run_fraction: 0.2 });
  close(r.internal_btuh, (240 + 310 + 108) * 3.412141633, "internal");
  close(r.total_btuh, 12 * 875 + 1200 + r.internal_btuh, "total");
});

test("underfloor heat: U A dT, and tube length at its output", () => {
  const r = computeFreezerUnderfloorHeat({ floor_area_ft2: 6000, room_temp_f: -10, target_soil_temp_f: 45, u_factor: 0.045, tube_output_btuh_per_ft: 12, energy_rate_per_kwh: 0.09, hours_per_year: 8760 });
  close(r.heat_loss_btuh, 0.045 * 6000 * 55, "U A dT");
  close(r.tube_length_ft * 12, r.heat_loss_btuh, "tube");
});

test("condenser: condensing is ambient plus TD, and the power change follows the degrees", () => {
  const r = computeCondenserTdHeadPressure({ condenser_type: "evaporative", ambient_f: 78, design_td_f: 20, alternate_ambient_f: 78, alternate_td_f: 15, power_pct_per_deg_f: 1.75, compressor_hp: 300, annual_hours: 6000, energy_rate_per_kwh: 0.09 });
  close(r.condensing_f, 98, "condensing");
  close(r.power_change_pct, -5 * 1.75, "five degrees lower");
});

test("receiver: the pumpdown fits if the liquid stays under the fill limit", () => {
  const r = computeReceiverPumpdownCapacity({ receiver_volume_gal: 1000, existing_liquid_gal: 220, fill_limit_fraction: 0.8, liquid_density_lb_ft3: 36.9, charge_to_pump_lb: 2400 });
  close(r.required_gal, 2400 / (36.9 * 231 / 1728), "gallons of liquid");
  assert.equal(r.fits, r.resulting_gal <= 800);
});

test("glycol loop: flow goes as 1 / (SG x cp) against water", () => {
  const r = computeSecondaryGlycolLoop({ load_btuh: 1200000, delta_t_f: 10, glycol_cp: 0.85, glycol_sg: 1.04, head_ft: 70, pump_efficiency: 0.7, chiller_approach_f: 6, coil_approach_f: 4, compressor_pct_per_deg_f: 2.2, annual_hours: 6000, energy_rate_per_kwh: 0.09 });
  close(r.glycol_gpm / r.water_gpm, 1 / (1.04 * 0.85), "flow ratio");
  close(r.pump_bhp, r.glycol_gpm * 70 * 1.04 / (3960 * 0.7), "pump");
});
