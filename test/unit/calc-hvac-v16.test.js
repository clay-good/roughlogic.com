// spec-v16 Group C unit tests for the first-principles HVAC tiles
// landed in v16: C.3 chiller-tons, C.5 hx-lmtd-ntu, C.9
// air-changes-hour, C.6 boiler-pipe-sizing, C.8 compressor-short-cycle,
// and C.10 humidifier-capacity. Worked examples cross-check against the
// published references named in each tile's citation (ASHRAE
// Fundamentals Ch. 31 / Ch. 1, the TEMA standards / Incropera, ASHRAE
// 62.1 / 170, ASHRAE Systems and Equipment Ch. 13 + Hazen-Williams, and
// the Copeland AE Bulletin 17-1226 cycling model).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeChillerTons, chillerTonsExample, CHILLER_FLUID_FACTORS,
  computeHxLmtdNtu, hxLmtdNtuExample,
  computeAirChangesPerHour, airChangesPerHourExample, ACH_TARGET_BANDS,
  computeBoilerPipeSizing, boilerPipeSizingExample, BOILER_PIPE_TABLE, BOILER_PIPE_VMAX,
  computeCompressorShortCycle, compressorShortCycleExample, COMPRESSOR_CYCLE_LIMITS,
  computeHumidifierCapacity, humidifierCapacityExample,
  computeFilterPressureDrop, filterPressureDropExample, FILTER_DP_TABLE,
  HVACSYSTEMS_RENDERERS,
} from "../../calc-hvacsystems.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

// --- C.3 Chiller tonnage (10 tests) ----------------------------------

test("chiller-tons: 240 GPM water at 54->44 F -> exactly 100 tons", () => {
  const r = computeChillerTons(chillerTonsExample.inputs);
  assert.ok(!r.error);
  assert.strictEqual(r.delta_T_F, 10);
  assert.strictEqual(r.q_btu_hr, 1200000);
  assert.ok(close(r.tons, 100, 1e-9));
});

test("chiller-tons: Q follows gpm * factor * delta-T for water (factor 500)", () => {
  const r = computeChillerTons({ gpm: 100, ewt_F: 55, lwt_F: 43, fluid: "water" });
  assert.strictEqual(r.factor, 500);
  assert.ok(close(r.q_btu_hr, 100 * 500 * 12, 1e-9));
});

test("chiller-tons: kW = Q / 3412", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44 });
  assert.ok(close(r.kw, 1200000 / 3412, 1e-9));
});

test("chiller-tons: glycol factors are below water and ordered 50% < 30% < water", () => {
  assert.ok(CHILLER_FLUID_FACTORS.glycol_50 < CHILLER_FLUID_FACTORS.glycol_30);
  assert.ok(CHILLER_FLUID_FACTORS.glycol_30 < CHILLER_FLUID_FACTORS.water);
  const w = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "water" });
  const g30 = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "glycol_30" });
  const g50 = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "glycol_50" });
  assert.ok(g50.tons < g30.tons && g30.tons < w.tons);
});

test("chiller-tons: required flow at nameplate inverts the identity", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "water", nameplate_tons: 100 });
  assert.ok(close(r.required_gpm, 240, 1e-6));
});

test("chiller-tons: required flow is null without a nameplate", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44 });
  assert.strictEqual(r.required_gpm, null);
});

test("chiller-tons: delta-T outside 5-20 F is flagged", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 50 });
  assert.ok(r.warnings.some((w) => /delta-T/i.test(w)));
});

test("chiller-tons: glycol selection carries the manufacturer-table caveat", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "glycol_50" });
  assert.ok(r.warnings.some((w) => /manufacturer/i.test(w)));
});

test("chiller-tons: more flow at the same delta-T is more tons (monotonic)", () => {
  const a = computeChillerTons({ gpm: 200, ewt_F: 54, lwt_F: 44 });
  const b = computeChillerTons({ gpm: 300, ewt_F: 54, lwt_F: 44 });
  assert.ok(b.tons > a.tons);
});

test("chiller-tons: zero flow and inverted temperatures are rejected", () => {
  assert.ok("error" in computeChillerTons({ gpm: 0 }));
  assert.ok("error" in computeChillerTons({ gpm: 240, ewt_F: 44, lwt_F: 54 }));
});

// --- C.5 Heat exchanger LMTD and effectiveness-NTU (12 tests) --------

test("hx-lmtd-ntu: counter-flow Incropera example pins LMTD 49.33, eff 0.714, NTU 2.03", () => {
  const r = computeHxLmtdNtu(hxLmtdNtuExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.lmtd_F, 49.326, 0.5));
  assert.ok(closePct(r.q_btu_hr, 2500000, 0.5));
  assert.ok(closePct(r.effectiveness, 0.7143, 0.5));
  assert.ok(closePct(r.ntu, 2.027, 0.5));
});

test("hx-lmtd-ntu: LMTD = (dT1 - dT2)/ln(dT1/dT2) for counter-flow", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  const dT1 = 200 - 140, dT2 = 100 - 60;
  assert.ok(close(r.lmtd_F, (dT1 - dT2) / Math.log(dT1 / dT2), 1e-9));
});

test("hx-lmtd-ntu: heat duty Q = C_hot * (Th_in - Th_out)", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  assert.ok(close(r.q_btu_hr, 50 * 500 * 100, 1e-9));
});

test("hx-lmtd-ntu: UA = Q / LMTD", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  assert.ok(close(r.ua_btu_hr_F, r.q_btu_hr / r.lmtd_F, 1e-6));
});

test("hx-lmtd-ntu: capacity-rate ratio Cr = C_min / C_max", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  // C_h = 25000, C_c = 31250 -> Cr = 0.8.
  assert.ok(close(r.c_ratio, 0.8, 1e-9));
});

test("hx-lmtd-ntu: NTU = UA / C_min", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  assert.ok(close(r.ntu, r.ua_btu_hr_F / 25000, 1e-9));
});

test("hx-lmtd-ntu: parallel-flow LMTD is smaller than counter-flow for the same temperatures", () => {
  // Outlets must not cross for parallel flow (Th_out > Tc_out): 200->120 hot,
  // 60->100 cold. Counter-flow LMTD = 78.3 F, parallel LMTD = 61.7 F.
  const cf = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 120, tc_in_F: 60, tc_out_F: 100, hot_gpm: 50, cold_gpm: 50 });
  const pf = computeHxLmtdNtu({ config: "parallel", th_in_F: 200, th_out_F: 120, tc_in_F: 60, tc_out_F: 100, hot_gpm: 50, cold_gpm: 50 });
  assert.ok(!cf.error && !pf.error);
  assert.ok(pf.lmtd_F < cf.lmtd_F);
});

test("hx-lmtd-ntu: effectiveness and NTU are null when only one flow is given", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50 });
  assert.ok(r.q_btu_hr != null);
  assert.strictEqual(r.effectiveness, null);
  assert.strictEqual(r.ntu, null);
});

test("hx-lmtd-ntu: equal end differences give LMTD = the common difference", () => {
  // Counter-flow with dT1 = dT2 = 40: both ends 40 F apart.
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 160, hot_gpm: 50, cold_gpm: 50 });
  // dT1 = 200-160 = 40, dT2 = 100-60 = 40.
  assert.ok(close(r.lmtd_F, 40, 1e-9));
});

test("hx-lmtd-ntu: hot fluid that does not cool down is rejected", () => {
  assert.ok("error" in computeHxLmtdNtu({ th_in_F: 100, th_out_F: 120, tc_in_F: 60, tc_out_F: 80 }));
});

test("hx-lmtd-ntu: cold outlet above hot inlet is rejected (thermodynamic limit)", () => {
  assert.ok("error" in computeHxLmtdNtu({ th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 220 }));
});

test("hx-lmtd-ntu: parallel-flow with crossing outlets is rejected", () => {
  // Parallel dT2 = Th_out - Tc_out must stay positive.
  assert.ok("error" in computeHxLmtdNtu({ config: "parallel", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 50 }));
});

// --- C.9 Air changes per hour (8 tests) ------------------------------

test("air-changes-hour: 10,000 ft^3 classroom at 1,000 CFM -> 6.0 ACH, within band", () => {
  const r = computeAirChangesPerHour(airChangesPerHourExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.ach, 6, 1e-9));
  assert.ok(/within/.test(r.comparison));
});

test("air-changes-hour: ACH = supply CFM * 60 / volume", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 8000, supply_cfm: 400 });
  assert.ok(close(r.ach, (400 * 60) / 8000, 1e-9));
});

test("air-changes-hour: return defaults to supply (balanced) when blank", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000 });
  assert.strictEqual(r.return_cfm, 1000);
  assert.strictEqual(r.pressurization_cfm, 0);
});

test("air-changes-hour: lower return positively pressurizes and lowers net ACH", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000, return_cfm: 800 });
  assert.ok(r.pressurization_cfm > 0);
  assert.ok(r.net_ach < r.ach);
  assert.ok(/pressurized/.test(r.pressure_state));
});

test("air-changes-hour: higher return negatively pressurizes", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000, return_cfm: 1200 });
  assert.ok(r.pressurization_cfm < 0);
  assert.ok(/negatively/.test(r.pressure_state));
});

test("air-changes-hour: an operating-room target band flags a 6 ACH room as below", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000, occupancy: "operating_room" });
  assert.ok(/below/.test(r.comparison));
  assert.strictEqual(ACH_TARGET_BANDS.operating_room.lo, 20);
});

test("air-changes-hour: ACH above 50 is flagged outside the typical range", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 1000, supply_cfm: 1000 });
  assert.ok(r.ach > 50);
  assert.ok(r.warnings.some((w) => /50/.test(w)));
});

test("air-changes-hour: zero volume and zero supply are rejected", () => {
  assert.ok("error" in computeAirChangesPerHour({ volume_ft3: 0, supply_cfm: 100 }));
  assert.ok("error" in computeAirChangesPerHour({ volume_ft3: 1000, supply_cfm: 0 }));
});

// --- C.6 Boiler distribution pipe sizing (10 tests) ------------------

test("boiler-pipe-sizing: 200 kBTU/hr at 20 F delta-T -> 20 GPM", () => {
  const r = computeBoilerPipeSizing(boilerPipeSizingExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.gpm, 20, 1e-9));
});

test("boiler-pipe-sizing: GPM follows Q / (500 * delta-T)", () => {
  const r = computeBoilerPipeSizing({ boiler_btu_hr: 120000, delta_T_F: 30, material: "copper" });
  assert.ok(close(r.gpm, 120000 / (500 * 30), 1e-9));
});

test("boiler-pipe-sizing: copper at 4 ft/s steps the 20 GPM main up to 1-1/2 in", () => {
  const r = computeBoilerPipeSizing(boilerPipeSizingExample.inputs);
  assert.strictEqual(r.recommended_size, "1-1/2");
  assert.ok(r.velocity_fps <= 4);
});

test("boiler-pipe-sizing: recommended velocity never exceeds the ceiling unless oversized", () => {
  const r = computeBoilerPipeSizing({ boiler_btu_hr: 200000, delta_T_F: 20, material: "copper", max_velocity_fps: 4 });
  assert.ok(r.velocity_fps <= r.max_velocity_fps + 1e-9);
  assert.strictEqual(r.oversize, false);
});

test("boiler-pipe-sizing: velocity matches GPM / (2.448 * ID^2)", () => {
  const r = computeBoilerPipeSizing({ boiler_btu_hr: 200000, delta_T_F: 20, material: "copper", max_velocity_fps: 4 });
  assert.ok(close(r.velocity_fps, r.gpm / (2.44778 * r.recommended_id_in * r.recommended_id_in), 1e-6));
});

test("boiler-pipe-sizing: Hazen-Williams head per 100 ft is ~3.42 ft for the example main", () => {
  const r = computeBoilerPipeSizing(boilerPipeSizingExample.inputs);
  assert.ok(closePct(r.friction_ft_per_100ft, 3.416, 1));
});

test("boiler-pipe-sizing: pump head scales linearly with run length", () => {
  const r = computeBoilerPipeSizing({ boiler_btu_hr: 200000, delta_T_F: 20, material: "copper", max_velocity_fps: 4, length_ft: 200 });
  assert.ok(close(r.head_ft, r.friction_ft_per_100ft * 2, 1e-9));
});

test("boiler-pipe-sizing: material defaults set the velocity ceiling", () => {
  assert.strictEqual(BOILER_PIPE_VMAX.copper, 4);
  assert.strictEqual(BOILER_PIPE_VMAX.steel, 6);
  assert.strictEqual(BOILER_PIPE_VMAX.pex, 3);
  const steel = computeBoilerPipeSizing({ boiler_btu_hr: 200000, delta_T_F: 20, material: "steel" });
  assert.strictEqual(steel.max_velocity_fps, 6);
});

test("boiler-pipe-sizing: a huge load past the 3 in table flags oversize", () => {
  const r = computeBoilerPipeSizing({ boiler_btu_hr: 5000000, delta_T_F: 20, material: "copper", max_velocity_fps: 4 });
  assert.strictEqual(r.oversize, true);
  assert.ok(r.warnings.some((w) => /parallel|larger main/.test(w)));
});

test("boiler-pipe-sizing: zero output or zero delta-T is rejected", () => {
  assert.ok("error" in computeBoilerPipeSizing({ boiler_btu_hr: 0, delta_T_F: 20 }));
  assert.ok("error" in computeBoilerPipeSizing({ boiler_btu_hr: 200000, delta_T_F: 0 }));
  assert.ok(BOILER_PIPE_TABLE.copper.sizes.length > 4);
});

// --- C.8 Compressor short-cycle protection (6 tests) -----------------

test("compressor-short-cycle: single-stage at 50% load peaks at the 6 cph ceiling, 5 min on", () => {
  const r = computeCompressorShortCycle(compressorShortCycleExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.cph_estimated, 6, 1e-9));
  assert.ok(close(r.on_time_min, 5, 1e-9));
  assert.ok(close(r.off_time_min, 5, 1e-9));
});

test("compressor-short-cycle: 5 min on is below the 10-min oil-return runtime -> short-cycling", () => {
  const r = computeCompressorShortCycle({ system_type: "single", load_fraction_pct: 50 });
  assert.strictEqual(r.short_cycling, true);
  assert.strictEqual(r.min_runtime_min, 10);
});

test("compressor-short-cycle: the cycling parabola N = N_max*4*X*(1-X) is symmetric about 50%", () => {
  const a = computeCompressorShortCycle({ system_type: "single", load_fraction_pct: 30 });
  const b = computeCompressorShortCycle({ system_type: "single", load_fraction_pct: 70 });
  assert.ok(close(a.cph_estimated, b.cph_estimated, 1e-9));
  assert.ok(a.cph_estimated < COMPRESSOR_CYCLE_LIMITS.single.max_cph);
});

test("compressor-short-cycle: inverter modulates -> no fixed ceiling, no parabola", () => {
  const r = computeCompressorShortCycle({ system_type: "inverter", load_fraction_pct: 50 });
  assert.strictEqual(r.max_cph, null);
  assert.strictEqual(r.cph_estimated, null);
  assert.ok(r.flags.some((f) => /modulate/.test(f)));
});

test("compressor-short-cycle: observed cycles above the ceiling flags short-cycling even at high load", () => {
  const r = computeCompressorShortCycle({ system_type: "single", load_fraction_pct: 85, observed_cph: 9 });
  assert.strictEqual(r.short_cycling, true);
});

test("compressor-short-cycle: load fraction at or beyond the 0-100 bounds is rejected", () => {
  assert.ok("error" in computeCompressorShortCycle({ system_type: "single", load_fraction_pct: 0 }));
  assert.ok("error" in computeCompressorShortCycle({ system_type: "single", load_fraction_pct: 100 }));
});

// --- C.10 Humidifier capacity (8 tests) ------------------------------

test("humidifier-capacity: 1,000 CFM 20->40% RH -> ~14 lb/hr, ~40 gpd", () => {
  const r = computeHumidifierCapacity(humidifierCapacityExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.addition_lb_hr, 13.99, 1));
  assert.ok(closePct(r.gpd, 40.26, 1));
});

test("humidifier-capacity: addition = 60 * CFM * rho * delta-W", () => {
  const r = computeHumidifierCapacity(humidifierCapacityExample.inputs);
  assert.ok(close(r.addition_lb_hr, 60 * r.cfm * r.air_density_lb_ft3 * r.delta_W, 1e-6));
});

test("humidifier-capacity: latent load = addition * 1061 BTU/lb", () => {
  const r = computeHumidifierCapacity(humidifierCapacityExample.inputs);
  assert.ok(close(r.latent_btu_hr, r.addition_lb_hr * 1061, 1e-6));
});

test("humidifier-capacity: daily water = lb/hr * 24 / 8.34", () => {
  const r = computeHumidifierCapacity(humidifierCapacityExample.inputs);
  assert.ok(close(r.gpd, (r.addition_lb_hr * 24) / 8.34, 1e-6));
});

test("humidifier-capacity: target RH above entering produces a positive humidity-ratio rise", () => {
  const r = computeHumidifierCapacity({ cfm: 500, supply_db_F: 68, entering_rh_pct: 15, target_rh_pct: 35 });
  assert.ok(r.W_target > r.W_entering);
  assert.ok(r.delta_W > 0);
});

test("humidifier-capacity: altitude lowers pressure and raises the humidity ratio for the same RH", () => {
  const sea = computeHumidifierCapacity({ cfm: 1000, supply_db_F: 70, entering_rh_pct: 20, target_rh_pct: 40, altitude_ft: 0 });
  const high = computeHumidifierCapacity({ cfm: 1000, supply_db_F: 70, entering_rh_pct: 20, target_rh_pct: 40, altitude_ft: 5000 });
  assert.ok(high.delta_W > sea.delta_W);
  assert.ok(high.pressure_kPa < sea.pressure_kPa);
});

test("humidifier-capacity: target above 60% RH warns of condensation risk", () => {
  const r = computeHumidifierCapacity({ cfm: 1000, supply_db_F: 70, entering_rh_pct: 30, target_rh_pct: 65 });
  assert.ok(r.warnings.some((w) => /condensation/.test(w)));
});

test("humidifier-capacity: zero CFM and a target at or below entering RH are rejected", () => {
  assert.ok("error" in computeHumidifierCapacity({ cfm: 0, supply_db_F: 70, entering_rh_pct: 20, target_rh_pct: 40 }));
  assert.ok("error" in computeHumidifierCapacity({ cfm: 1000, supply_db_F: 70, entering_rh_pct: 40, target_rh_pct: 40 }));
});

// --- C.7 Filter pressure-drop schedule (10 tests) --------------------

test("filter-pressure-drop: MERV 13, 4 ft^2 at 300 fpm -> 1,200 CFM, 0.35 -> 0.70 in WC", () => {
  const r = computeFilterPressureDrop(filterPressureDropExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.airflow_cfm, 1200, 1e-9));
  assert.ok(close(r.clean_dp_in_wc, 0.35, 1e-9));
  assert.ok(close(r.final_dp_in_wc, 0.70, 1e-9));
});

test("filter-pressure-drop: airflow = face area * face velocity", () => {
  const r = computeFilterPressureDrop({ filter_type: "merv8", face_area_ft2: 6, face_velocity_fpm: 400 });
  assert.ok(close(r.airflow_cfm, 2400, 1e-9));
});

test("filter-pressure-drop: clean fan power = (CFM*dp/6356)/eff*0.7457", () => {
  const r = computeFilterPressureDrop(filterPressureDropExample.inputs);
  const expected = (1200 * 0.35 / 6356 / 0.6) * 0.7457;
  assert.ok(closePct(r.clean_fan_kw, expected, 0.5));
});

test("filter-pressure-drop: pressure drop scales linearly with face velocity from the 300 fpm reference", () => {
  const r = computeFilterPressureDrop({ filter_type: "merv13", face_area_ft2: 4, face_velocity_fpm: 600 });
  // 600 fpm is 2x the 300 fpm reference -> clean drop doubles to 0.70.
  assert.ok(close(r.clean_dp_in_wc, 0.70, 1e-9));
});

test("filter-pressure-drop: average drop and final fan power exceed the clean values", () => {
  const r = computeFilterPressureDrop(filterPressureDropExample.inputs);
  assert.ok(r.avg_dp_in_wc > r.clean_dp_in_wc && r.avg_dp_in_wc < r.final_dp_in_wc);
  assert.ok(r.final_fan_kw > r.clean_fan_kw);
});

test("filter-pressure-drop: annual energy uses the average drop and the loading penalty is over clean", () => {
  const r = computeFilterPressureDrop({ filter_type: "merv13", face_area_ft2: 4, face_velocity_fpm: 300, runtime_hr_per_year: 4000 });
  assert.ok(close(r.annual_fan_kwh, r.avg_fan_kw * 4000, 1e-6));
  assert.ok(close(r.annual_penalty_kwh, (r.avg_fan_kw - r.clean_fan_kw) * 4000, 1e-6));
});

test("filter-pressure-drop: an energy cost yields an annual dollar figure", () => {
  const r = computeFilterPressureDrop({ filter_type: "merv13", face_area_ft2: 4, face_velocity_fpm: 300, runtime_hr_per_year: 4000, energy_cost_per_kwh: 0.13 });
  assert.ok(close(r.annual_fan_cost, r.annual_fan_kwh * 0.13, 1e-6));
});

test("filter-pressure-drop: cut-sheet overrides take precedence over the bundled defaults", () => {
  const r = computeFilterPressureDrop({ filter_type: "merv8", face_area_ft2: 10, face_velocity_fpm: 300, clean_dp_override: 0.15, final_dp_override: 0.5 });
  assert.ok(close(r.clean_dp_in_wc, 0.15, 1e-9));
  assert.ok(close(r.final_dp_in_wc, 0.5, 1e-9));
});

test("filter-pressure-drop: face velocity above 500 fpm is flagged", () => {
  const r = computeFilterPressureDrop({ filter_type: "merv13", face_area_ft2: 4, face_velocity_fpm: 600 });
  assert.ok(r.warnings.some((w) => /500/.test(w)));
  assert.ok(FILTER_DP_TABLE.hepa.clean_dp > FILTER_DP_TABLE.merv8.clean_dp);
});

test("filter-pressure-drop: zero area, zero velocity, and out-of-range efficiency are rejected", () => {
  assert.ok("error" in computeFilterPressureDrop({ face_area_ft2: 0, face_velocity_fpm: 300 }));
  assert.ok("error" in computeFilterPressureDrop({ face_area_ft2: 4, face_velocity_fpm: 0 }));
  assert.ok("error" in computeFilterPressureDrop({ face_area_ft2: 4, face_velocity_fpm: 300, fan_total_efficiency: 0 }));
  assert.ok("error" in computeFilterPressureDrop({ face_area_ft2: 4, face_velocity_fpm: 300, fan_total_efficiency: 1.5 }));
});

// --- Wiring sentinel -------------------------------------------------

test("v16 HVAC renderers are registered in HVACSYSTEMS_RENDERERS", () => {
  for (const id of ["chiller-tons", "hx-lmtd-ntu", "air-changes-hour", "boiler-pipe-sizing", "compressor-short-cycle", "humidifier-capacity", "filter-pressure-drop"]) {
    assert.strictEqual(typeof HVACSYSTEMS_RENDERERS[id], "function", id + " renderer missing");
  }
});
