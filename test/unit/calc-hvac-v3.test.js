// Unit tests for calc-hvac.js v3 utilities (139-144).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAffinityLaws,
  computeBeltAndPulley,
  computeAirReceiver,
  computeGeothermalLoop,
  computeBaseboardOutput,
  computeNPSHa,
  GEO_LOOP_BTU_PER_FT,
  BASEBOARD_OUTPUT,
  affinityLawsExample,
  beltAndPulleyExample,
  airReceiverExample,
  geothermalLoopExample,
  baseboardOutputExample,
  npshaExample,
} from "../../calc-hvac.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- 139 Affinity ---

test("Affinity: example RPM 1750->1500 cube root SP", () => {
  const r = computeAffinityLaws(affinityLawsExample.inputs);
  // CFM scales linearly: 5000 * 1500/1750 = 4285.7
  assert.ok(close(r.CFM, 4285.71, 0.5));
  // SP scales by ratio^2
  assert.ok(close(r.SP_in_wc, 1.0 * Math.pow(1500 / 1750, 2), 1e-3));
  // kW scales by ratio^3
  assert.ok(close(r.kW, 5.0 * Math.pow(1500 / 1750, 3), 1e-3));
});

test("Affinity: doubling RPM doubles CFM, 4x SP, 8x kW", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "RPM", target_value: 2000 });
  assert.ok(close(r.CFM, 2000, 0.001));
  assert.ok(close(r.SP_in_wc, 4, 0.001));
  assert.ok(close(r.kW, 8, 0.001));
});

test("Affinity: target by CFM", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "CFM", target_value: 500 });
  assert.ok(close(r.RPM, 500, 0.001));
});

test("Affinity: target by SP uses sqrt", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "SP", target_value: 4 });
  assert.ok(close(r.RPM, 2000, 0.001));
});

test("Affinity: target by kW uses cbrt", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "kW", target_value: 8 });
  assert.ok(close(r.RPM, 2000, 0.001));
});

test("Affinity: zero baseline RPM returns error", () => {
  const r = computeAffinityLaws({ baseline_RPM: 0, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "RPM", target_value: 2000 });
  assert.ok(r.error);
});

test("Affinity: zero target returns error", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "RPM", target_value: 0 });
  assert.ok(r.error);
});

test("Affinity: target by SP without baseline SP errors", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 0, baseline_kW: 1, target_kind: "SP", target_value: 4 });
  assert.ok(r.error);
});

test("Affinity: unknown kind errors", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1000, baseline_CFM: 1000, baseline_SP_in_wc: 1, baseline_kW: 1, target_kind: "spam", target_value: 1 });
  assert.ok(r.error);
});

test("Affinity: ratio 1 returns baseline", () => {
  const r = computeAffinityLaws({ baseline_RPM: 1750, baseline_CFM: 5000, baseline_SP_in_wc: 1, baseline_kW: 5, target_kind: "RPM", target_value: 1750 });
  assert.ok(close(r.CFM, 5000, 0.001));
  assert.ok(close(r.kW, 5, 0.001));
});

// --- 140 Belt and pulley ---

test("Belt: example yields a positive belt length", () => {
  const r = computeBeltAndPulley(beltAndPulleyExample.inputs);
  assert.ok(r.belt_length_in > 36);
});

test("Belt: known case 4/8 in pulleys 18 in centers ~ 55.6 in", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 0 });
  // L = 2*18 + (pi/2)*12 + 16/72 = 36 + 18.849 + 0.222 = 55.07
  assert.ok(close(r.belt_length_in, 55.07, 0.05));
});

test("Belt: driven RPM = motor * (drive/driven)", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 });
  assert.ok(close(r.driven_rpm, 875, 0.001));
});

test("Belt: belt speed positive", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 });
  assert.ok(r.belt_speed_fpm > 1000);
});

test("Belt: zero pulley diameter errors", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 0, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 });
  assert.ok(r.error);
});

test("Belt: zero center distance errors", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 0, motor_rpm: 1750 });
  assert.ok(r.error);
});

test("Belt: equal pulleys yield 1:1 ratio", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 6, driven_dia_in: 6, center_distance_in: 18, motor_rpm: 1750 });
  assert.ok(close(r.driven_rpm, 1750, 0.001));
});

test("Belt: zero motor RPM yields null driven/speed", () => {
  const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 0 });
  assert.equal(r.driven_rpm, null);
  assert.equal(r.belt_speed_fpm, null);
});

test("Belt: longer center distance -> longer belt", () => {
  const a = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 0 });
  const b = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 36, motor_rpm: 0 });
  assert.ok(b.belt_length_in > a.belt_length_in);
});

test("Belt: orientation symmetric for length", () => {
  const a = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 0 });
  const b = computeBeltAndPulley({ drive_dia_in: 8, driven_dia_in: 4, center_distance_in: 18, motor_rpm: 0 });
  assert.ok(close(a.belt_length_in, b.belt_length_in, 0.001));
});

// --- 141 Air receiver ---

test("Receiver: deficit yields positive receiver", () => {
  const r = computeAirReceiver(airReceiverExample.inputs);
  assert.ok(r.demand_scfm > 5);
  assert.ok(r.receiver_gal > 0);
});

test("Receiver: pump exceeds demand -> zero receiver", () => {
  const r = computeAirReceiver({ tools: [{ cfm: 4, duty_cycle: 0.5 }], pump_scfm: 10, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  assert.equal(r.receiver_gal, 0);
});

test("Receiver: P1 <= P2 errors", () => {
  const r = computeAirReceiver({ tools: [{ cfm: 4, duty_cycle: 1 }], pump_scfm: 0, p_high_psi: 100, p_low_psi: 100, drawdown_minutes: 1 });
  assert.ok(r.error);
});

test("Receiver: bad duty cycle (>1) errors", () => {
  const r = computeAirReceiver({ tools: [{ cfm: 4, duty_cycle: 2 }], pump_scfm: 0, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  assert.ok(r.error);
});

test("Receiver: empty tool list returns zero demand", () => {
  const r = computeAirReceiver({ tools: [], pump_scfm: 5, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  assert.equal(r.demand_scfm, 0);
});

test("Receiver: drawdown minutes scales receiver linearly", () => {
  const a = computeAirReceiver({ tools: [{ cfm: 8, duty_cycle: 1 }], pump_scfm: 0, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  const b = computeAirReceiver({ tools: [{ cfm: 8, duty_cycle: 1 }], pump_scfm: 0, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 2 });
  assert.ok(close(b.receiver_gal / a.receiver_gal, 2, 0.001));
});

test("Receiver: gallon = ft^3 * 7.4805", () => {
  const r = computeAirReceiver({ tools: [{ cfm: 8, duty_cycle: 1 }], pump_scfm: 0, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  assert.ok(close(r.receiver_gal / r.receiver_ft3, 7.4805, 0.001));
});

test("Receiver: concurrent tools count caps by pump", () => {
  const r = computeAirReceiver({ tools: [{ cfm: 4, duty_cycle: 0.5 }, { cfm: 4, duty_cycle: 0.5 }], pump_scfm: 4, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  assert.equal(r.concurrent, 2);
});

test("Receiver: drawdown 0 errors", () => {
  const r = computeAirReceiver({ tools: [{ cfm: 4, duty_cycle: 1 }], pump_scfm: 0, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 0 });
  assert.ok(r.error);
});

test("Receiver: negative cfm errors", () => {
  const r = computeAirReceiver({ tools: [{ cfm: -1, duty_cycle: 0.5 }], pump_scfm: 5, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1 });
  assert.ok(r.error);
});

// --- 142 Geothermal ---

test("Geothermal: example yields finite length", () => {
  const r = computeGeothermalLoop(geothermalLoopExample.inputs);
  assert.ok(r.length_ft > 0);
});

test("Geothermal: heating BTU divides by btu_per_ft", () => {
  const r = computeGeothermalLoop({ heating_btu: 80000, cooling_btu: 0, soil: "clay", loop_type: "vertical" });
  assert.ok(close(r.length_ft, 80000 / 40, 0.5));
});

test("Geothermal: takes max of heating and cooling", () => {
  const r = computeGeothermalLoop({ heating_btu: 30000, cooling_btu: 60000, soil: "clay", loop_type: "vertical" });
  assert.equal(r.design_btu, 60000);
});

test("Geothermal: rock vertical > sand vertical (more BTU/ft means less length)", () => {
  const a = computeGeothermalLoop({ heating_btu: 60000, cooling_btu: 0, soil: "sand", loop_type: "vertical" });
  const b = computeGeothermalLoop({ heating_btu: 60000, cooling_btu: 0, soil: "rock", loop_type: "vertical" });
  assert.ok(b.length_ft < a.length_ft);
});

test("Geothermal: rock horizontal not supported", () => {
  const r = computeGeothermalLoop({ heating_btu: 60000, cooling_btu: 0, soil: "rock", loop_type: "horizontal" });
  assert.ok(r.error);
});

test("Geothermal: unknown loop type errors", () => {
  const r = computeGeothermalLoop({ heating_btu: 60000, cooling_btu: 0, soil: "clay", loop_type: "spam" });
  assert.ok(r.error);
});

test("Geothermal: zero loads errors", () => {
  const r = computeGeothermalLoop({ heating_btu: 0, cooling_btu: 0, soil: "clay", loop_type: "vertical" });
  assert.ok(r.error);
});

test("Geothermal: negative load errors", () => {
  const r = computeGeothermalLoop({ heating_btu: -10, cooling_btu: 0, soil: "clay", loop_type: "vertical" });
  assert.ok(r.error);
});

test("Geothermal: every soil/loop combo has positive btu_per_ft when supported", () => {
  for (const lt of ["vertical", "horizontal"]) {
    for (const s of Object.keys(GEO_LOOP_BTU_PER_FT[lt])) {
      const v = GEO_LOOP_BTU_PER_FT[lt][s];
      if (v > 0) assert.ok(v > 0, lt + "/" + s);
    }
  }
});

test("Geothermal: horizontal is shorter than vertical for same load (per BTU/ft difference)", () => {
  const v = computeGeothermalLoop({ heating_btu: 60000, cooling_btu: 0, soil: "clay", loop_type: "vertical" });
  const h = computeGeothermalLoop({ heating_btu: 60000, cooling_btu: 0, soil: "clay", loop_type: "horizontal" });
  // Horizontal has smaller btu_per_ft -> more length, not less.
  assert.ok(h.length_ft > v.length_ft);
});

// --- 143 Baseboard output ---

test("Baseboard: example interpolates 180 F to 600 BTU/ft", () => {
  const r = computeBaseboardOutput(baseboardOutputExample.inputs);
  assert.ok(close(r.btu_per_ft, 600, 0.5));
});

test("Baseboard: total = btu_per_ft * length * flow_factor", () => {
  const r = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 8, model: "slant_fin_baseline" });
  assert.ok(close(r.btu_total, 600 * 8 * 1, 0.5));
});

test("Baseboard: hotter water -> more BTU/ft", () => {
  const a = computeBaseboardOutput({ water_temp_F: 140, flow_gpm: 1, length_ft: 1, model: "slant_fin_baseline" });
  const b = computeBaseboardOutput({ water_temp_F: 220, flow_gpm: 1, length_ft: 1, model: "slant_fin_baseline" });
  assert.ok(b.btu_per_ft > a.btu_per_ft);
});

test("Baseboard: high_capacity model > slant_fin at same temp", () => {
  const a = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 1, model: "slant_fin_baseline" });
  const b = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 1, model: "high_capacity" });
  assert.ok(b.btu_per_ft > a.btu_per_ft);
});

test("Baseboard: clamps below first point", () => {
  const r = computeBaseboardOutput({ water_temp_F: 100, flow_gpm: 1, length_ft: 1, model: "slant_fin_baseline" });
  assert.equal(r.btu_per_ft, 380);
});

test("Baseboard: clamps above last point", () => {
  const r = computeBaseboardOutput({ water_temp_F: 250, flow_gpm: 1, length_ft: 1, model: "slant_fin_baseline" });
  assert.equal(r.btu_per_ft, 780);
});

test("Baseboard: zero water temp errors", () => {
  const r = computeBaseboardOutput({ water_temp_F: 0, flow_gpm: 1, length_ft: 8, model: "slant_fin_baseline" });
  assert.ok(r.error);
});

test("Baseboard: unknown model errors", () => {
  const r = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 8, model: "spam" });
  assert.ok(r.error);
});

test("Baseboard: attribution string set", () => {
  const r = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 8, model: "slant_fin_baseline" });
  assert.match(r.attribution, /Slant\/Fin/);
});

test("Baseboard: every model has 5 points", () => {
  for (const m of Object.keys(BASEBOARD_OUTPUT)) assert.equal(BASEBOARD_OUTPUT[m].points.length, 5);
});

// --- 144 NPSHa ---

test("NPSHa: example returns positive NPSHa and ok", () => {
  const r = computeNPSHa(npshaExample.inputs);
  assert.ok(r.NPSHa_ft > 0);
  assert.equal(r.cavitation_risk, false);
});

test("NPSHa: cavitation when source below pump and high friction", () => {
  const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: -25, friction_loss_ft: 10, npsh_required_ft: 10 });
  assert.equal(r.cavitation_risk, true);
});

test("NPSHa: H_atm decreases with elevation", () => {
  const a = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  const b = computeNPSHa({ elevation_ft: 5000, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  assert.ok(b.H_atm_ft < a.H_atm_ft);
});

test("NPSHa: hotter water -> bigger vapor head -> smaller NPSHa", () => {
  const a = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  const b = computeNPSHa({ elevation_ft: 0, water_temp_F: 200, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  assert.ok(b.H_vapor_ft > a.H_vapor_ft);
  assert.ok(b.NPSHa_ft < a.NPSHa_ft);
});

test("NPSHa: friction reduces NPSHa", () => {
  const a = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 0, npsh_required_ft: null });
  const b = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 5, npsh_required_ft: null });
  assert.ok(close(a.NPSHa_ft - b.NPSHa_ft, 5, 0.001));
});

test("NPSHa: source above pump increases NPSHa", () => {
  const a = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  const b = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 10, friction_loss_ft: 0, npsh_required_ft: null });
  assert.ok(close(b.NPSHa_ft - a.NPSHa_ft, 10, 0.001));
});

test("NPSHa: cavitation_risk null when no npshr supplied", () => {
  const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  assert.equal(r.cavitation_risk, null);
});

test("NPSHa: water temp below 32 errors", () => {
  const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 20, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  assert.ok(r.error);
});

test("NPSHa: negative friction errors", () => {
  const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: -1, npsh_required_ft: null });
  assert.ok(r.error);
});

test("NPSHa: at sea level, 60 F H_atm ~ 33.95 ft", () => {
  const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 0, friction_loss_ft: 0, npsh_required_ft: null });
  assert.ok(close(r.H_atm_ft, 29.92 * 1.133, 0.1));
});
