// spec-v20 unit tests for the 55 new tiles landed in the catalog-expansion
// pass. Each tile is one formula, one cross-check, one tolerance, one named
// US authority. The assertions pin the published constants and worked
// examples so a future edit that changed a constant or swapped an operator
// fails loudly. Mirrors the calc-v23.test.js structure.

import { test } from "node:test";
import assert from "node:assert/strict";

// spec-v79 cap-relief split: the spec-v20 §A advanced-analysis trio moved from
// calc-electrical.js (tightest calc module at 95.1%) to calc-powerquality.js.
import {
  computeParallelConductorDerate, parallelConductorDerateExample,
  computeNeutralCurrent3ph, neutralCurrent3phExample,
  computeMotorVdStarting, motorVdStartingExample,
} from "../../calc-powerquality.js";

// ---------------------------------------------------------------------------
// A.1 parallel-conductor-derate (NEC Article 310 + 310.15(C)(1))
// ---------------------------------------------------------------------------
test("parallel-conductor-derate: 3/0 Cu at 200 A, N=3, no derate -> 600 A", () => {
  const r = computeParallelConductorDerate({ i_single_A: 200, n_sets: 3, conductor_size: "3/0" });
  assert.ok(Math.abs(r.i_total_A - 600) < 0.5);
  assert.strictEqual(r.adjustment_factor, 1);
  assert.ok(Math.abs(r.per_set_ampacity_A - 200) < 0.5);
});

test("parallel-conductor-derate: example fixture round-trips", () => {
  const r = computeParallelConductorDerate(parallelConductorDerateExample.inputs);
  assert.ok(Math.abs(r.i_total_A - 600) < 0.5);
});

test("parallel-conductor-derate: >3 CCC applies the 80% factor (6 conductors)", () => {
  const r = computeParallelConductorDerate({ i_single_A: 200, n_sets: 1, total_ccc: 6, conductor_size: "3/0" });
  assert.ok(Math.abs(r.ccc_factor - 0.8) < 1e-9);
  assert.ok(Math.abs(r.i_total_A - 160) < 0.5);
});

test("parallel-conductor-derate: ambient factor multiplies", () => {
  const r = computeParallelConductorDerate({ i_single_A: 200, n_sets: 2, ambient_factor: 0.91, conductor_size: "4/0" });
  assert.ok(Math.abs(r.i_total_A - 200 * 2 * 0.91) < 0.5);
});

test("parallel-conductor-derate: per-set adequacy flag", () => {
  const r = computeParallelConductorDerate({ i_single_A: 200, n_sets: 3, i_load_A: 540, conductor_size: "3/0" });
  assert.ok(Math.abs(r.i_set_A - 180) < 0.01);
  assert.match(r.adequacy, /adequate/);
});

test("parallel-conductor-derate: sub-1/0 conductor rejected; bad inputs error", () => {
  assert.ok("error" in computeParallelConductorDerate({ i_single_A: 30, n_sets: 2, conductor_size: "12" }));
  assert.ok("error" in computeParallelConductorDerate({ i_single_A: 0, n_sets: 2 }));
  assert.ok("error" in computeParallelConductorDerate({ i_single_A: 200, n_sets: 2, ambient_factor: 1.5 }));
});

// ---------------------------------------------------------------------------
// A.2 neutral-current-3ph (phasor sum)
// ---------------------------------------------------------------------------
test("neutral-current-3ph: Ia=100 Ib=80 Ic=60 -> 34.64 A", () => {
  const r = computeNeutralCurrent3ph({ ia_A: 100, ib_A: 80, ic_A: 60 });
  assert.ok(Math.abs(r.neutral_A - 34.641) < 0.01);
});

test("neutral-current-3ph: example fixture", () => {
  const r = computeNeutralCurrent3ph(neutralCurrent3phExample.inputs);
  assert.ok(Math.abs(r.neutral_A - 34.641) < 0.05);
});

test("neutral-current-3ph: balanced linear load -> 0 A", () => {
  const r = computeNeutralCurrent3ph({ ia_A: 50, ib_A: 50, ic_A: 50 });
  assert.ok(Math.abs(r.neutral_A) < 1e-9);
  assert.match(r.note, /Balanced/);
});

test("neutral-current-3ph: triplen-dominated flags neutral as CCC", () => {
  const r = computeNeutralCurrent3ph({ ia_A: 100, ib_A: 100, ic_A: 100, triplen_pct: 100 });
  assert.ok(r.harmonic_neutral_A > r.max_phase_A);
  assert.strictEqual(r.neutral_is_ccc, true);
});

test("neutral-current-3ph: single phase entry valid; all zero rejected", () => {
  assert.ok(computeNeutralCurrent3ph({ ia_A: 100, ib_A: 0, ic_A: 0 }).neutral_A > 0);
  assert.ok("error" in computeNeutralCurrent3ph({ ia_A: 0, ib_A: 0, ic_A: 0 }));
});

test("neutral-current-3ph: negative current rejected", () => {
  assert.ok("error" in computeNeutralCurrent3ph({ ia_A: -5, ib_A: 80, ic_A: 60 }));
});

// ---------------------------------------------------------------------------
// A.3 motor-vd-starting (Ohm's-law dip)
// ---------------------------------------------------------------------------
test("motor-vd-starting: 480 V 3ph, LRC 180 A, 250 ft, 250 kcmil Cu -> ~0.838% dip", () => {
  const r = computeMotorVdStarting({ source_voltage_V: 480, length_ft: 250, cmils: 250000, lrc_A: 180, phase: "three", k_const: 12.9 });
  assert.ok(Math.abs(r.dip_pct - 0.838) < 0.005);
  assert.ok(r.pass);
});

test("motor-vd-starting: example fixture", () => {
  const r = computeMotorVdStarting(motorVdStartingExample.inputs);
  assert.ok(Math.abs(r.v_drop_V - 4.0217) < 0.01);
});

test("motor-vd-starting: single-phase uses the factor of 2", () => {
  const r3 = computeMotorVdStarting({ source_voltage_V: 240, length_ft: 100, cmils: 50000, lrc_A: 100, phase: "three", k_const: 12.9 });
  const r1 = computeMotorVdStarting({ source_voltage_V: 240, length_ft: 100, cmils: 50000, lrc_A: 100, phase: "single", k_const: 12.9 });
  assert.ok(Math.abs(r1.v_drop_V / r3.v_drop_V - 2 / Math.sqrt(3)) < 1e-6);
});

test("motor-vd-starting: terminal voltage = source - drop", () => {
  const r = computeMotorVdStarting({ source_voltage_V: 480, length_ft: 250, cmils: 250000, lrc_A: 180, phase: "three", k_const: 12.9 });
  assert.ok(Math.abs(r.v_terminal_V - (480 - r.v_drop_V)) < 1e-6);
});

test("motor-vd-starting: large dip fails the limit", () => {
  const r = computeMotorVdStarting({ source_voltage_V: 240, length_ft: 500, cmils: 10000, lrc_A: 200, phase: "single", k_const: 12.9 });
  assert.ok(r.dip_pct > 15);
  assert.strictEqual(r.pass, false);
});

test("motor-vd-starting: zero/invalid inputs error", () => {
  assert.ok("error" in computeMotorVdStarting({ source_voltage_V: 0, length_ft: 100, cmils: 50000, lrc_A: 100 }));
  assert.ok("error" in computeMotorVdStarting({ source_voltage_V: 480, length_ft: 100, cmils: 0, lrc_A: 100 }));
});

// ---------------------------------------------------------------------------
// Group B - Plumbing and Gas
// ---------------------------------------------------------------------------
import {
  computeThermalExpansionVolume, thermalExpansionVolumeExample,
  computeVentSizingStack, ventSizingStackExample,
} from "../../calc-plumbing.js";
import {
  computeGasPipePressureDrop, gasPipePressureDropExample,
} from "../../calc-gas.js";

test("thermal-expansion-volume: 50 gal 50->140 F -> ~0.84 gal", () => {
  const r = computeThermalExpansionVolume({ volume_gal: 50, cold_f: 50, hot_f: 140 });
  assert.ok(Math.abs(r.expansion_gal - 0.839) < 0.02);
  assert.ok(r.expansion_pct > 1.6 && r.expansion_pct < 1.7);
});
test("thermal-expansion-volume: example + closed-system note", () => {
  const r = computeThermalExpansionVolume(thermalExpansionVolumeExample.inputs);
  assert.match(r.note, /Closed system/);
});
test("thermal-expansion-volume: scales with volume", () => {
  const a = computeThermalExpansionVolume({ volume_gal: 50, cold_f: 50, hot_f: 140 });
  const b = computeThermalExpansionVolume({ volume_gal: 100, cold_f: 50, hot_f: 140 });
  assert.ok(Math.abs(b.expansion_gal - 2 * a.expansion_gal) < 1e-9);
});
test("thermal-expansion-volume: open system note", () => {
  assert.match(computeThermalExpansionVolume({ volume_gal: 50, cold_f: 50, hot_f: 140, closed_system: false }).note, /Open system/);
});
test("thermal-expansion-volume: out-of-range and hot<=cold rejected", () => {
  assert.ok("error" in computeThermalExpansionVolume({ volume_gal: 50, cold_f: 50, hot_f: 250 }));
  assert.ok("error" in computeThermalExpansionVolume({ volume_gal: 50, cold_f: 140, hot_f: 140 }));
  assert.ok("error" in computeThermalExpansionVolume({ volume_gal: 0, cold_f: 50, hot_f: 140 }));
});
test("thermal-expansion-volume: hotter water expands more", () => {
  const a = computeThermalExpansionVolume({ volume_gal: 50, cold_f: 50, hot_f: 120 });
  const b = computeThermalExpansionVolume({ volume_gal: 50, cold_f: 50, hot_f: 180 });
  assert.ok(b.expansion_gal > a.expansion_gal);
});

test("vent-sizing-stack: 18/24 DFU, 90/120 ft -> pass, 75%", () => {
  const r = computeVentSizingStack({ vent_dia_in: 2, connected_dfu: 18, developed_length_ft: 90, table_dfu: 24, table_max_length_ft: 120, drain_dia_in: 3 });
  assert.strictEqual(r.pass, true);
  assert.ok(Math.abs(r.length_used_pct - 75) < 0.01);
  assert.ok(Math.abs(r.length_margin_ft - 30) < 0.01);
});
test("vent-sizing-stack: example fixture", () => {
  const r = computeVentSizingStack(ventSizingStackExample.inputs);
  assert.ok(r.pass);
});
test("vent-sizing-stack: DFU over table fails", () => {
  const r = computeVentSizingStack({ vent_dia_in: 2, connected_dfu: 30, developed_length_ft: 90, table_dfu: 24, table_max_length_ft: 120 });
  assert.strictEqual(r.dfu_ok, false);
  assert.strictEqual(r.pass, false);
});
test("vent-sizing-stack: length over table fails", () => {
  const r = computeVentSizingStack({ vent_dia_in: 2, connected_dfu: 18, developed_length_ft: 130, table_dfu: 24, table_max_length_ft: 120 });
  assert.strictEqual(r.length_ok, false);
});
test("vent-sizing-stack: vent below half drain flags undersized", () => {
  const r = computeVentSizingStack({ vent_dia_in: 1, connected_dfu: 5, developed_length_ft: 10, table_dfu: 24, table_max_length_ft: 120, drain_dia_in: 4 });
  assert.strictEqual(r.half_drain_ok, false);
  assert.strictEqual(r.pass, false);
});
test("vent-sizing-stack: bad table inputs error", () => {
  assert.ok("error" in computeVentSizingStack({ vent_dia_in: 0, table_dfu: 24, table_max_length_ft: 120 }));
  assert.ok("error" in computeVentSizingStack({ vent_dia_in: 2, table_dfu: 0, table_max_length_ft: 120 }));
});

test("gas-pipe-pressure-drop: 1000 CFH 1.049 in 100 ft SG 0.60", () => {
  const r = computeGasPipePressureDrop({ flow_cfh: 1000, id_in: 1.049, length_ft: 100, sg: 0.6 });
  assert.ok(Math.abs(r.drop_inwc - 16.73) < 0.1);
  assert.ok(r.velocity_fpm > 2700 && r.velocity_fpm < 2850);
});
test("gas-pipe-pressure-drop: example fixture", () => {
  const r = computeGasPipePressureDrop(gasPipePressureDropExample.inputs);
  assert.ok(r.drop_inwc > 0);
});
test("gas-pipe-pressure-drop: drop rises with flow squared", () => {
  const a = computeGasPipePressureDrop({ flow_cfh: 1000, id_in: 1.049, length_ft: 100, sg: 0.6 });
  const b = computeGasPipePressureDrop({ flow_cfh: 2000, id_in: 1.049, length_ft: 100, sg: 0.6 });
  assert.ok(Math.abs(b.drop_inwc / a.drop_inwc - 4) < 0.01);
});
test("gas-pipe-pressure-drop: larger pipe drops less", () => {
  const small = computeGasPipePressureDrop({ flow_cfh: 1000, id_in: 1.049, length_ft: 100, sg: 0.6 });
  const big = computeGasPipePressureDrop({ flow_cfh: 1000, id_in: 2.067, length_ft: 100, sg: 0.6 });
  assert.ok(big.drop_inwc < small.drop_inwc);
});
test("gas-pipe-pressure-drop: very high drop flags low-pressure invalid", () => {
  const r = computeGasPipePressureDrop({ flow_cfh: 5000, id_in: 1.049, length_ft: 200, sg: 0.6 });
  assert.strictEqual(r.exceeds_low_pressure, true);
});
test("gas-pipe-pressure-drop: zero/invalid inputs error", () => {
  assert.ok("error" in computeGasPipePressureDrop({ flow_cfh: 0, id_in: 1, length_ft: 100, sg: 0.6 }));
  assert.ok("error" in computeGasPipePressureDrop({ flow_cfh: 1000, id_in: 0, length_ft: 100, sg: 0.6 }));
});

// ---------------------------------------------------------------------------
// Group C - HVAC
// ---------------------------------------------------------------------------
import {
  computeEconomizerSavingsHours, economizerSavingsHoursExample,
  computePipeHeatLossRadial, pipeHeatLossRadialExample,
  computeFanMotorBhp, fanMotorBhpExample,
} from "../../calc-hvac.js";

test("economizer-savings-hours: 4000 CFM dT 20 -> 86,400 BTU/hr", () => {
  const r = computeEconomizerSavingsHours({ cfm: 4000, delta_t_f: 20, hours: 1500 });
  assert.ok(Math.abs(r.q_sens_btuh - 86400) < 1);
  assert.ok(Math.abs(r.ton_hours - 10800) < 1);
});
test("economizer-savings-hours: example", () => { assert.ok(computeEconomizerSavingsHours(economizerSavingsHoursExample.inputs).q_sens_btuh > 0); });
test("economizer-savings-hours: non-positive dT -> no cooling", () => {
  const r = computeEconomizerSavingsHours({ cfm: 4000, delta_t_f: 0, hours: 1500 });
  assert.strictEqual(r.no_cooling, true);
  assert.strictEqual(r.ton_hours, 0);
});
test("economizer-savings-hours: ton-hours scales with hours", () => {
  const a = computeEconomizerSavingsHours({ cfm: 4000, delta_t_f: 20, hours: 1000 });
  const b = computeEconomizerSavingsHours({ cfm: 4000, delta_t_f: 20, hours: 2000 });
  assert.ok(Math.abs(b.ton_hours - 2 * a.ton_hours) < 1e-6);
});
test("economizer-savings-hours: hours over 8760 + zero CFM rejected", () => {
  assert.ok("error" in computeEconomizerSavingsHours({ cfm: 4000, delta_t_f: 20, hours: 9000 }));
  assert.ok("error" in computeEconomizerSavingsHours({ cfm: 0, delta_t_f: 20, hours: 100 }));
});
test("economizer-savings-hours: tons = BTU/12000", () => {
  const r = computeEconomizerSavingsHours({ cfm: 4000, delta_t_f: 20, hours: 1500 });
  assert.ok(Math.abs(r.tons - 7.2) < 0.01);
});

test("pipe-heat-loss-radial: r1=1 r2=2 k=0.25 200/70 -> ~24.55 BTU/hr-ft", () => {
  const r = computePipeHeatLossRadial({ od_in: 2, thickness_in: 1, k_value: 0.25, hot_f: 200, amb_f: 70, length_ft: 1 });
  assert.ok(Math.abs(r.q_per_ft_btuh - 24.55) < 0.1);
});
test("pipe-heat-loss-radial: example", () => { assert.ok(computePipeHeatLossRadial(pipeHeatLossRadialExample.inputs).q_per_ft_btuh > 0); });
test("pipe-heat-loss-radial: total = per-ft * length", () => {
  const r = computePipeHeatLossRadial({ od_in: 2, thickness_in: 1, k_value: 0.25, hot_f: 200, amb_f: 70, length_ft: 10 });
  assert.ok(Math.abs(r.q_total_btuh - 10 * r.q_per_ft_btuh) < 1e-6);
});
test("pipe-heat-loss-radial: ambient >= hot -> zero loss", () => {
  const r = computePipeHeatLossRadial({ od_in: 2, thickness_in: 1, k_value: 0.25, hot_f: 70, amb_f: 70, length_ft: 1 });
  assert.strictEqual(r.q_per_ft_btuh, 0);
});
test("pipe-heat-loss-radial: thicker insulation lowers loss", () => {
  const thin = computePipeHeatLossRadial({ od_in: 2, thickness_in: 0.5, k_value: 0.25, hot_f: 200, amb_f: 70, length_ft: 1 });
  const thick = computePipeHeatLossRadial({ od_in: 2, thickness_in: 2, k_value: 0.25, hot_f: 200, amb_f: 70, length_ft: 1 });
  assert.ok(thick.q_per_ft_btuh < thin.q_per_ft_btuh);
});
test("pipe-heat-loss-radial: zero thickness / k rejected", () => {
  assert.ok("error" in computePipeHeatLossRadial({ od_in: 2, thickness_in: 0, k_value: 0.25, hot_f: 200, amb_f: 70 }));
  assert.ok("error" in computePipeHeatLossRadial({ od_in: 2, thickness_in: 1, k_value: 0, hot_f: 200, amb_f: 70 }));
});

test("fan-motor-bhp: 4000 CFM 2.0 in eta 0.65 -> BHP 1.94, next 2 HP", () => {
  const r = computeFanMotorBhp({ cfm: 4000, tsp_inwc: 2.0, eta_fan: 0.65 });
  assert.ok(Math.abs(r.bhp - 1.936) < 0.01);
  assert.strictEqual(r.next_nema_hp, 2);
});
test("fan-motor-bhp: example", () => { assert.ok(computeFanMotorBhp(fanMotorBhpExample.inputs).bhp > 0); });
test("fan-motor-bhp: AHP = CFM*TSP/6356", () => {
  const r = computeFanMotorBhp({ cfm: 4000, tsp_inwc: 2.0, eta_fan: 0.65 });
  assert.ok(Math.abs(r.ahp - 4000 * 2.0 / 6356) < 1e-6);
});
test("fan-motor-bhp: drive efficiency raises motor HP", () => {
  const r = computeFanMotorBhp({ cfm: 4000, tsp_inwc: 2.0, eta_fan: 0.65, eta_drive: 0.9 });
  assert.ok(r.motor_hp_required > r.bhp);
});
test("fan-motor-bhp: next NEMA rounds up", () => {
  const r = computeFanMotorBhp({ cfm: 8000, tsp_inwc: 3.0, eta_fan: 0.6 });
  assert.ok(r.next_nema_hp >= r.bhp);
});
test("fan-motor-bhp: invalid efficiency / zero CFM rejected", () => {
  assert.ok("error" in computeFanMotorBhp({ cfm: 4000, tsp_inwc: 2.0, eta_fan: 1.5 }));
  assert.ok("error" in computeFanMotorBhp({ cfm: 0, tsp_inwc: 2.0, eta_fan: 0.65 }));
});

// ---------------------------------------------------------------------------
// Group D - Restoration
// ---------------------------------------------------------------------------
import {
  computeGrainsRemoved, grainsRemovedExample,
  computeEvaporationLoad, evaporationLoadExample,
} from "../../calc-restoration.js";

test("grains-removed: 250 CFM dG 40 24 hr -> 6.43 lb/hr, 18.5 gal", () => {
  const r = computeGrainsRemoved({ cfm: 250, inlet_gpp: 90, outlet_gpp: 50, hours: 24 });
  assert.ok(Math.abs(r.water_lb_hr - 6.43) < 0.05);
  assert.ok(Math.abs(r.water_gal - 18.5) < 0.1);
  assert.strictEqual(r.grain_depression_gpp, 40);
});
test("grains-removed: example", () => { assert.ok(computeGrainsRemoved(grainsRemovedExample.inputs).water_lb_hr > 0); });
test("grains-removed: rate scales with airflow", () => {
  const a = computeGrainsRemoved({ cfm: 250, inlet_gpp: 90, outlet_gpp: 50, hours: 24 });
  const b = computeGrainsRemoved({ cfm: 500, inlet_gpp: 90, outlet_gpp: 50, hours: 24 });
  assert.ok(Math.abs(b.water_lb_hr - 2 * a.water_lb_hr) < 1e-6);
});
test("grains-removed: pints/hr consistent with lb/hr", () => {
  const r = computeGrainsRemoved({ cfm: 250, inlet_gpp: 90, outlet_gpp: 50, hours: 24 });
  assert.ok(Math.abs(r.water_pints_hr - r.water_lb_hr * 8 / 8.345) < 1e-6);
});
test("grains-removed: outlet >= inlet rejected", () => {
  assert.ok("error" in computeGrainsRemoved({ cfm: 250, inlet_gpp: 50, outlet_gpp: 50, hours: 24 }));
  assert.ok("error" in computeGrainsRemoved({ cfm: 250, inlet_gpp: 40, outlet_gpp: 60, hours: 24 }));
});
test("grains-removed: zero CFM rejected", () => {
  assert.ok("error" in computeGrainsRemoved({ cfm: 0, inlet_gpp: 90, outlet_gpp: 50, hours: 24 }));
});

test("evaporation-load: 800 ft2 Class 3 (0.08) -> 64 gal", () => {
  const r = computeEvaporationLoad({ area_ft2: 800, water_class: 3, load_factor: 0.08 });
  assert.strictEqual(r.load_gal, 64);
  assert.ok(Math.abs(r.load_lb - 534.08) < 0.5);
});
test("evaporation-load: example", () => { assert.ok(computeEvaporationLoad(evaporationLoadExample.inputs).load_gal > 0); });
test("evaporation-load: class default used when load factor blank", () => {
  const r = computeEvaporationLoad({ area_ft2: 800, water_class: 3, load_factor: 0 });
  assert.strictEqual(r.load_factor_used, 0.08);
});
test("evaporation-load: AHAM pints = first24 / derating", () => {
  const r = computeEvaporationLoad({ area_ft2: 800, water_class: 3, load_factor: 0.08, first24_fraction: 0.4, derating: 0.5 });
  assert.ok(Math.abs(r.aham_pints - r.first24_pints / 0.5) < 1e-6);
});
test("evaporation-load: higher class -> more water", () => {
  const c2 = computeEvaporationLoad({ area_ft2: 800, water_class: 2 });
  const c4 = computeEvaporationLoad({ area_ft2: 800, water_class: 4 });
  assert.ok(c4.load_gal > c2.load_gal);
});
test("evaporation-load: invalid class / area rejected", () => {
  assert.ok("error" in computeEvaporationLoad({ area_ft2: 0, water_class: 3 }));
  assert.ok("error" in computeEvaporationLoad({ area_ft2: 800, water_class: 9 }));
});

// ---------------------------------------------------------------------------
// Group E - Construction
// ---------------------------------------------------------------------------
import {
  computePointLoadBearing, pointLoadBearingExample,
  computeColumnBucklingWood, columnBucklingWoodExample,
  computeBeamReactions, beamReactionsExample,
} from "../../calc-construction.js";

test("point-load-bearing: 4000 lb / 3 in / Fc-perp 625 -> 2.13 in", () => {
  const r = computePointLoadBearing({ load_lb: 4000, width_in: 3.0, fc_perp_psi: 625 });
  assert.ok(Math.abs(r.req_length_in - 2.133) < 0.01);
  assert.ok(Math.abs(r.req_area_in2 - 6.4) < 0.01);
});
test("point-load-bearing: example", () => { assert.ok(computePointLoadBearing(pointLoadBearingExample.inputs).req_length_in > 0); });
test("point-load-bearing: provided length pass/fail", () => {
  const pass = computePointLoadBearing({ load_lb: 4000, width_in: 3.0, fc_perp_psi: 625, provided_length_in: 3.0 });
  assert.strictEqual(pass.pass, true);
  const fail = computePointLoadBearing({ load_lb: 4000, width_in: 3.0, fc_perp_psi: 625, provided_length_in: 1.0 });
  assert.strictEqual(fail.pass, false);
});
test("point-load-bearing: Cb raises capacity (shorter length)", () => {
  const a = computePointLoadBearing({ load_lb: 4000, width_in: 3.0, fc_perp_psi: 625, cb: 1 });
  const b = computePointLoadBearing({ load_lb: 4000, width_in: 3.0, fc_perp_psi: 625, cb: 1.25 });
  assert.ok(b.req_length_in < a.req_length_in);
});
test("point-load-bearing: stress = P/(w*len)", () => {
  const r = computePointLoadBearing({ load_lb: 3000, width_in: 3.0, fc_perp_psi: 625, provided_length_in: 2.0 });
  assert.ok(Math.abs(r.actual_stress_psi - 3000 / 6) < 1e-6);
});
test("point-load-bearing: bad inputs error", () => {
  assert.ok("error" in computePointLoadBearing({ load_lb: 0, width_in: 3, fc_perp_psi: 625 }));
  assert.ok("error" in computePointLoadBearing({ load_lb: 4000, width_in: 3, fc_perp_psi: 0 }));
});

test("column-buckling-wood: 3.5x3.5 le96 Fc*1150 Emin580k -> cap ~6600", () => {
  const r = computeColumnBucklingWood({ b_in: 3.5, d_in: 3.5, le_in: 96, fc_star_psi: 1150, emin_psi: 580000 });
  assert.ok(Math.abs(r.capacity_lb - 6600) < 30);
  assert.ok(Math.abs(r.cp - 0.4685) < 0.002);
});
test("column-buckling-wood: example", () => { assert.ok(computeColumnBucklingWood(columnBucklingWoodExample.inputs).capacity_lb > 0); });
test("column-buckling-wood: Cp in (0,1]", () => {
  const r = computeColumnBucklingWood({ b_in: 3.5, d_in: 3.5, le_in: 96, fc_star_psi: 1150, emin_psi: 580000 });
  assert.ok(r.cp > 0 && r.cp <= 1);
});
test("column-buckling-wood: longer column buckles more (lower capacity)", () => {
  const short = computeColumnBucklingWood({ b_in: 3.5, d_in: 3.5, le_in: 48, fc_star_psi: 1150, emin_psi: 580000 });
  const long = computeColumnBucklingWood({ b_in: 3.5, d_in: 3.5, le_in: 144, fc_star_psi: 1150, emin_psi: 580000 });
  assert.ok(long.capacity_lb < short.capacity_lb);
});
test("column-buckling-wood: le/d over 50 rejected", () => {
  assert.ok("error" in computeColumnBucklingWood({ b_in: 1.5, d_in: 1.5, le_in: 96, fc_star_psi: 1150, emin_psi: 580000 }));
});
test("column-buckling-wood: zero inputs rejected", () => {
  assert.ok("error" in computeColumnBucklingWood({ b_in: 0, d_in: 3.5, le_in: 96, fc_star_psi: 1150, emin_psi: 580000 }));
});

test("beam-reactions: L16 w200 -> R 1600, M 6400", () => {
  const r = computeBeamReactions({ span_ft: 16, w_plf: 200 });
  assert.ok(Math.abs(r.r_left_lb - 1600) < 0.5);
  assert.ok(Math.abs(r.m_max_ftlb - 6400) < 1);
});
test("beam-reactions: example", () => { assert.ok(computeBeamReactions(beamReactionsExample.inputs).r_left_lb > 0); });
test("beam-reactions: symmetric reactions for pure UDL", () => {
  const r = computeBeamReactions({ span_ft: 16, w_plf: 200 });
  assert.ok(Math.abs(r.r_left_lb - r.r_right_lb) < 1e-6);
});
test("beam-reactions: centered point load splits evenly", () => {
  const r = computeBeamReactions({ span_ft: 20, w_plf: 0, point_lb: 1000, a_ft: 10 });
  assert.ok(Math.abs(r.r_left_lb - 500) < 1e-6);
  assert.ok(Math.abs(r.r_right_lb - 500) < 1e-6);
  assert.ok(Math.abs(r.m_max_ftlb - 5000) < 1); // PL/4 = 1000*20/4
});
test("beam-reactions: off-center point load reactions", () => {
  const r = computeBeamReactions({ span_ft: 20, w_plf: 0, point_lb: 1000, a_ft: 5 });
  assert.ok(Math.abs(r.r_left_lb - 750) < 1e-6);
  assert.ok(Math.abs(r.r_right_lb - 250) < 1e-6);
});
test("beam-reactions: out-of-range point load location rejected", () => {
  assert.ok("error" in computeBeamReactions({ span_ft: 16, w_plf: 100, point_lb: 500, a_ft: 20 }));
  assert.ok("error" in computeBeamReactions({ span_ft: 0, w_plf: 100 }));
});

// ---------------------------------------------------------------------------
// Group F - Fire-Ground
// ---------------------------------------------------------------------------
import {
  computeElevationPressureLoss, elevationPressureLossExample,
  computeWaterSupplyDuration, waterSupplyDurationExample,
} from "../../calc-fire.js";

test("elevation-pressure-loss: 9 floors -> exact 39.06, rule 45", () => {
  const r = computeElevationPressureLoss({ mode: "floors", value: 9 });
  assert.ok(Math.abs(r.exact_psi - 39.06) < 0.1);
  assert.ok(Math.abs(r.rule_psi - 45) < 0.01);
});
test("elevation-pressure-loss: example", () => { assert.ok(computeElevationPressureLoss(elevationPressureLossExample.inputs).exact_psi > 0); });
test("elevation-pressure-loss: feet mode", () => {
  const r = computeElevationPressureLoss({ mode: "feet", value: 100 });
  assert.ok(Math.abs(r.exact_psi - 43.4) < 0.01);
});
test("elevation-pressure-loss: down is a gain (negative)", () => {
  const r = computeElevationPressureLoss({ mode: "floors", value: 5, direction: "down" });
  assert.ok(r.exact_psi < 0);
  assert.strictEqual(r.is_gain, true);
});
test("elevation-pressure-loss: floor height affects exact only", () => {
  const r = computeElevationPressureLoss({ mode: "floors", value: 9, floor_height_ft: 12 });
  assert.ok(Math.abs(r.exact_psi - 0.434 * 108) < 0.01);
  assert.ok(Math.abs(r.rule_psi - 45) < 0.01);
});
test("elevation-pressure-loss: negative value rejected", () => {
  assert.ok("error" in computeElevationPressureLoss({ mode: "floors", value: -1 }));
});

test("water-supply-duration: 3000 gal 250 GPM -> 12 min", () => {
  const r = computeWaterSupplyDuration({ volume_gal: 3000, flow_gpm: 250 });
  assert.ok(Math.abs(r.duration_min - 12) < 0.01);
});
test("water-supply-duration: example", () => { assert.ok(computeWaterSupplyDuration(waterSupplyDurationExample.inputs).duration_min > 0); });
test("water-supply-duration: shuttle resupply extends to 30 min", () => {
  const r = computeWaterSupplyDuration({ volume_gal: 3000, flow_gpm: 250, resupply_gpm: 150 });
  assert.ok(Math.abs(r.duration_min - 30) < 0.01);
});
test("water-supply-duration: resupply >= demand -> sustained", () => {
  const r = computeWaterSupplyDuration({ volume_gal: 3000, flow_gpm: 250, resupply_gpm: 250 });
  assert.strictEqual(r.sustained, true);
  assert.strictEqual(r.sustainable_flow_gpm, 250);
});
test("water-supply-duration: net drain = flow - resupply", () => {
  const r = computeWaterSupplyDuration({ volume_gal: 3000, flow_gpm: 250, resupply_gpm: 100 });
  assert.strictEqual(r.net_drain_gpm, 150);
});
test("water-supply-duration: zero volume/flow rejected", () => {
  assert.ok("error" in computeWaterSupplyDuration({ volume_gal: 0, flow_gpm: 250 }));
  assert.ok("error" in computeWaterSupplyDuration({ volume_gal: 3000, flow_gpm: 0 }));
});

// ---------------------------------------------------------------------------
// Group J - Trucking
// ---------------------------------------------------------------------------
import {
  computeCostPerMile, costPerMileExample,
  computeDeadheadPercent, deadheadPercentExample,
  computeAxleLoadDistribution, axleLoadDistributionExample,
} from "../../calc-trucking.js";

test("cost-per-mile: $6000/10k, $4/6.5mpg, .18, .65 -> $2.045", () => {
  const r = computeCostPerMile({ fixed_monthly: 6000, miles_month: 10000, fuel_price: 4.0, mpg: 6.5, maint_cpm: 0.18, driver_cpm: 0.65 });
  assert.ok(Math.abs(r.total_cpm - 2.0454) < 0.001);
  assert.ok(Math.abs(r.fuel_cpm - 0.6154) < 0.001);
});
test("cost-per-mile: example + break-even = total", () => {
  const r = computeCostPerMile(costPerMileExample.inputs);
  assert.strictEqual(r.breakeven_rate, r.total_cpm);
});
test("cost-per-mile: fixed_cpm = fixed/miles", () => {
  const r = computeCostPerMile({ fixed_monthly: 6000, miles_month: 10000, fuel_price: 4, mpg: 6.5 });
  assert.ok(Math.abs(r.fixed_cpm - 0.6) < 1e-9);
});
test("cost-per-mile: more miles lowers fixed cpm", () => {
  const a = computeCostPerMile({ fixed_monthly: 6000, miles_month: 8000, fuel_price: 4, mpg: 6.5 });
  const b = computeCostPerMile({ fixed_monthly: 6000, miles_month: 12000, fuel_price: 4, mpg: 6.5 });
  assert.ok(b.fixed_cpm < a.fixed_cpm);
});
test("cost-per-mile: zero miles/mpg rejected", () => {
  assert.ok("error" in computeCostPerMile({ fixed_monthly: 6000, miles_month: 0, fuel_price: 4, mpg: 6.5 }));
  assert.ok("error" in computeCostPerMile({ fixed_monthly: 6000, miles_month: 10000, fuel_price: 4, mpg: 0 }));
});
test("cost-per-mile: negative cost rejected", () => {
  assert.ok("error" in computeCostPerMile({ fixed_monthly: -1, miles_month: 10000, fuel_price: 4, mpg: 6.5 }));
});

test("deadhead-percent: 800/120/$1840 -> 13.04%, $2.30, $2.00", () => {
  const r = computeDeadheadPercent({ loaded_mi: 800, deadhead_mi: 120, revenue: 1840 });
  assert.ok(Math.abs(r.deadhead_pct - 13.04) < 0.05);
  assert.ok(Math.abs(r.rate_loaded - 2.30) < 0.01);
  assert.ok(Math.abs(r.rate_total - 2.00) < 0.01);
});
test("deadhead-percent: example", () => { assert.ok(computeDeadheadPercent(deadheadPercentExample.inputs).deadhead_pct > 0); });
test("deadhead-percent: high deadhead flag", () => {
  const r = computeDeadheadPercent({ loaded_mi: 600, deadhead_mi: 300, revenue: 1800 });
  assert.strictEqual(r.high_deadhead, true);
});
test("deadhead-percent: surcharge raises both rates", () => {
  const a = computeDeadheadPercent({ loaded_mi: 800, deadhead_mi: 120, revenue: 1840 });
  const b = computeDeadheadPercent({ loaded_mi: 800, deadhead_mi: 120, revenue: 1840, surcharge: 160 });
  assert.ok(b.rate_loaded > a.rate_loaded);
});
test("deadhead-percent: zero deadhead -> 0%", () => {
  const r = computeDeadheadPercent({ loaded_mi: 800, deadhead_mi: 0, revenue: 1840 });
  assert.strictEqual(r.deadhead_pct, 0);
});
test("deadhead-percent: zero loaded rejected", () => {
  assert.ok("error" in computeDeadheadPercent({ loaded_mi: 0, deadhead_mi: 120, revenue: 1840 }));
});

test("axle-load-distribution: drive 1200 over -> 480 lb/hole, 3 holes forward, under cap", () => {
  const r = computeAxleLoadDistribution({ drive_lb: 35200, trailer_lb: 32000, kingpin_to_tandem_in: 400, hole_spacing_in: 6 });
  assert.ok(Math.abs(r.shift_per_hole_lb - 480) < 0.5);
  assert.strictEqual(r.holes, 3);
  assert.strictEqual(r.direction, "forward");
  assert.ok(r.projected_drive_lb <= 34000);
});
test("axle-load-distribution: example", () => { assert.ok(computeAxleLoadDistribution(axleLoadDistributionExample.inputs).shift_per_hole_lb > 0); });
test("axle-load-distribution: within limits -> 0 holes", () => {
  const r = computeAxleLoadDistribution({ drive_lb: 33000, trailer_lb: 32000, kingpin_to_tandem_in: 400 });
  assert.strictEqual(r.holes, 0);
  assert.strictEqual(r.direction, "none");
});
test("axle-load-distribution: trailer over slides back", () => {
  const r = computeAxleLoadDistribution({ drive_lb: 32000, trailer_lb: 35200, kingpin_to_tandem_in: 400, hole_spacing_in: 6 });
  assert.strictEqual(r.direction, "back");
  assert.ok(r.projected_trailer_lb <= 34000);
});
test("axle-load-distribution: shift conserves total weight", () => {
  const r = computeAxleLoadDistribution({ drive_lb: 35200, trailer_lb: 32000, kingpin_to_tandem_in: 400, hole_spacing_in: 6 });
  assert.ok(Math.abs((r.projected_drive_lb + r.projected_trailer_lb) - (35200 + 32000)) < 1e-6);
});
test("axle-load-distribution: zero inputs rejected", () => {
  assert.ok("error" in computeAxleLoadDistribution({ drive_lb: 0, trailer_lb: 32000, kingpin_to_tandem_in: 400 }));
  assert.ok("error" in computeAxleLoadDistribution({ drive_lb: 35200, trailer_lb: 32000, kingpin_to_tandem_in: 0 }));
});

// ---------------------------------------------------------------------------
// Group K - Mechanic
// ---------------------------------------------------------------------------
import {
  computeHpFromTorque, hpFromTorqueExample,
  computeVolumetricEfficiency, volumetricEfficiencyExample,
  computeGearMphRpm, gearMphRpmExample,
} from "../../calc-mechanic.js";

test("hp-from-torque: 400 lb-ft at 5000 RPM -> 380.8 HP", () => {
  const r = computeHpFromTorque({ solve_for: "hp", torque_lbft: 400, rpm: 5000 });
  assert.ok(Math.abs(r.hp - 380.81) < 0.05);
});
test("hp-from-torque: example + kW", () => {
  const r = computeHpFromTorque(hpFromTorqueExample.inputs);
  assert.ok(Math.abs(r.kw - r.hp * 0.7457) < 1e-6);
});
test("hp-from-torque: torque = HP at 5252 RPM", () => {
  const r = computeHpFromTorque({ solve_for: "torque", hp: 100, rpm: 5252 });
  assert.ok(Math.abs(r.torque_lbft - 100) < 0.01);
});
test("hp-from-torque: solve for RPM", () => {
  const r = computeHpFromTorque({ solve_for: "rpm", hp: 380.81, torque_lbft: 400 });
  assert.ok(Math.abs(r.rpm - 5000) < 0.5);
});
test("hp-from-torque: round-trip", () => {
  const hp = computeHpFromTorque({ solve_for: "hp", torque_lbft: 300, rpm: 4000 }).hp;
  const back = computeHpFromTorque({ solve_for: "torque", hp, rpm: 4000 });
  assert.ok(Math.abs(back.torque_lbft - 300) < 0.01);
});
test("hp-from-torque: solve torque needs positive HP/RPM", () => {
  assert.ok("error" in computeHpFromTorque({ solve_for: "torque", hp: 0, rpm: 5000 }));
  assert.ok("error" in computeHpFromTorque({ solve_for: "rpm", hp: 100, torque_lbft: 0 }));
});

test("volumetric-efficiency: 350 ci 5500 4-stroke -> 557 CFM", () => {
  const r = computeVolumetricEfficiency({ displacement_ci: 350, rpm: 5500, cycle: "four" });
  assert.ok(Math.abs(r.theoretical_cfm - 557.0) < 0.5);
});
test("volumetric-efficiency: example", () => { assert.ok(computeVolumetricEfficiency(volumetricEfficiencyExample.inputs).theoretical_cfm > 0); });
test("volumetric-efficiency: VE from measured CFM", () => {
  const r = computeVolumetricEfficiency({ displacement_ci: 350, rpm: 5500, cycle: "four", actual_cfm: 500 });
  assert.ok(Math.abs(r.ve_pct - 500 / 557.0 * 100) < 0.1);
});
test("volumetric-efficiency: 2-stroke doubles theoretical", () => {
  const four = computeVolumetricEfficiency({ displacement_ci: 350, rpm: 5500, cycle: "four" });
  const two = computeVolumetricEfficiency({ displacement_ci: 350, rpm: 5500, cycle: "two" });
  assert.ok(Math.abs(two.theoretical_cfm - 2 * four.theoretical_cfm) < 1e-6);
});
test("volumetric-efficiency: VE over 100 flagged not clamped", () => {
  const r = computeVolumetricEfficiency({ displacement_ci: 350, rpm: 5500, cycle: "four", actual_cfm: 700 });
  assert.strictEqual(r.over_100, true);
  assert.ok(r.ve_pct > 100);
});
test("volumetric-efficiency: zero displacement/rpm rejected", () => {
  assert.ok("error" in computeVolumetricEfficiency({ displacement_ci: 0, rpm: 5500 }));
  assert.ok("error" in computeVolumetricEfficiency({ displacement_ci: 350, rpm: 0 }));
});

test("gear-mph-rpm: 2500 1:1 3.55 28.5 -> 59.71 MPH", () => {
  const r = computeGearMphRpm({ solve_for: "mph", rpm: 2500, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 28.5 });
  assert.ok(Math.abs(r.mph - 59.71) < 0.1);
});
test("gear-mph-rpm: example", () => { assert.ok(computeGearMphRpm(gearMphRpmExample.inputs).mph > 0); });
test("gear-mph-rpm: revs/mile = 63360/(pi*dia)", () => {
  const r = computeGearMphRpm({ solve_for: "mph", rpm: 2500, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 28.5 });
  assert.ok(Math.abs(r.revs_per_mile - 63360 / (Math.PI * 28.5)) < 1e-6);
});
test("gear-mph-rpm: solve for RPM inverse", () => {
  const r = computeGearMphRpm({ solve_for: "rpm", mph: 59.71, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 28.5 });
  assert.ok(Math.abs(r.rpm - 2500) < 1);
});
test("gear-mph-rpm: taller tire -> more MPH", () => {
  const a = computeGearMphRpm({ solve_for: "mph", rpm: 2500, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 28.5 });
  const b = computeGearMphRpm({ solve_for: "mph", rpm: 2500, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 33 });
  assert.ok(b.mph > a.mph);
});
test("gear-mph-rpm: zero ratio/dia rejected", () => {
  assert.ok("error" in computeGearMphRpm({ solve_for: "mph", rpm: 2500, trans_ratio: 0, axle_ratio: 3.55, tire_dia_in: 28.5 }));
  assert.ok("error" in computeGearMphRpm({ solve_for: "mph", rpm: 2500, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 0 }));
});

// ---------------------------------------------------------------------------
// Group L - Agriculture
// ---------------------------------------------------------------------------
import {
  computeGrowingDegreeDays, growingDegreeDaysExample,
  computePearsonSquareRation, pearsonSquareRationExample,
  computeLivestockWaterRequirement, livestockWaterRequirementExample,
} from "../../calc-agriculture.js";

test("growing-degree-days: corn 92/64 modified -> 25 GDD", () => {
  const r = computeGrowingDegreeDays({ days_series: [{ tmax: 92, tmin: 64 }], base_f: 50, cutoff_f: 86, method: "modified" });
  assert.strictEqual(r.accumulated_gdd, 25);
  assert.strictEqual(r.days, 1);
});
test("growing-degree-days: example", () => { assert.ok(computeGrowingDegreeDays(growingDegreeDaysExample.inputs).accumulated_gdd === 25); });
test("growing-degree-days: accumulates over days", () => {
  const r = computeGrowingDegreeDays({ days_series: [{ tmax: 92, tmin: 64 }, { tmax: 80, tmin: 60 }], base_f: 50, cutoff_f: 86, method: "modified" });
  assert.ok(r.accumulated_gdd > 25);
  assert.strictEqual(r.days, 2);
});
test("growing-degree-days: never negative (cold day floors at 0)", () => {
  const r = computeGrowingDegreeDays({ days_series: [{ tmax: 45, tmin: 30 }], base_f: 50 });
  assert.strictEqual(r.accumulated_gdd, 0);
});
test("growing-degree-days: standard vs modified differ on hot days", () => {
  const std = computeGrowingDegreeDays({ days_series: [{ tmax: 100, tmin: 40 }], base_f: 50, cutoff_f: 86, method: "standard" });
  const mod = computeGrowingDegreeDays({ days_series: [{ tmax: 100, tmin: 40 }], base_f: 50, cutoff_f: 86, method: "modified" });
  assert.ok(std.accumulated_gdd !== mod.accumulated_gdd);
});
test("growing-degree-days: bad day skipped, empty rejected", () => {
  const r = computeGrowingDegreeDays({ days_series: [{ tmax: 60, tmin: 80 }], base_f: 50 });
  assert.strictEqual(r.flagged_days, 1);
  assert.ok("error" in computeGrowingDegreeDays({ days_series: [], base_f: 50 }));
});

test("pearson-square-ration: 9/44 to 16 -> 80% / 20%", () => {
  const r = computePearsonSquareRation({ feed_a_pct: 9, feed_b_pct: 44, target_pct: 16 });
  assert.ok(Math.abs(r.pct_a - 80) < 0.01);
  assert.ok(Math.abs(r.pct_b - 20) < 0.01);
});
test("pearson-square-ration: example + verifies to target", () => {
  const r = computePearsonSquareRation(pearsonSquareRationExample.inputs);
  assert.ok(Math.abs(r.verified_pct - 16) < 0.01);
});
test("pearson-square-ration: pounds for a batch", () => {
  const r = computePearsonSquareRation({ feed_a_pct: 9, feed_b_pct: 44, target_pct: 16, batch_lb: 2000 });
  assert.ok(Math.abs(r.lb_a - 1600) < 0.01);
  assert.ok(Math.abs(r.lb_b - 400) < 0.01);
});
test("pearson-square-ration: target outside range rejected", () => {
  assert.ok("error" in computePearsonSquareRation({ feed_a_pct: 9, feed_b_pct: 44, target_pct: 50 }));
  assert.ok("error" in computePearsonSquareRation({ feed_a_pct: 9, feed_b_pct: 44, target_pct: 5 }));
});
test("pearson-square-ration: equal feeds degenerate", () => {
  assert.ok("error" in computePearsonSquareRation({ feed_a_pct: 20, feed_b_pct: 20, target_pct: 20 }));
});
test("pearson-square-ration: order-independent (B<A)", () => {
  const r = computePearsonSquareRation({ feed_a_pct: 44, feed_b_pct: 9, target_pct: 16 });
  assert.ok(Math.abs(r.pct_a - 20) < 0.01);
});

test("livestock-water-requirement: 50 head 80F interp -> 17.6, 880", () => {
  const r = computeLivestockWaterRequirement({ method: "table", head: 50, temp_f: 80, t_low_f: 40, gal_low: 8, t_high_f: 90, gal_high: 20 });
  assert.ok(Math.abs(r.per_head_gpd - 17.6) < 0.05);
  assert.ok(Math.abs(r.herd_gpd - 880) < 1);
});
test("livestock-water-requirement: example", () => { assert.ok(computeLivestockWaterRequirement(livestockWaterRequirementExample.inputs).herd_gpd > 0); });
test("livestock-water-requirement: lactation doubles", () => {
  const base = computeLivestockWaterRequirement({ method: "table", head: 50, temp_f: 80, t_low_f: 40, gal_low: 8, t_high_f: 90, gal_high: 20 });
  const lact = computeLivestockWaterRequirement({ method: "table", head: 50, temp_f: 80, t_low_f: 40, gal_low: 8, t_high_f: 90, gal_high: 20, lactating: true });
  assert.ok(Math.abs(lact.per_head_gpd - 2 * base.per_head_gpd) < 1e-6);
});
test("livestock-water-requirement: intake-ratio method", () => {
  const r = computeLivestockWaterRequirement({ method: "intake", head: 10, dmi_lb: 25, water_per_dmi: 3.5 });
  assert.ok(Math.abs(r.per_head_gpd - 25 * 3.5 / 8.345) < 1e-6);
});
test("livestock-water-requirement: out-of-range temp flagged", () => {
  const r = computeLivestockWaterRequirement({ method: "table", head: 50, temp_f: 100, t_low_f: 40, gal_low: 8, t_high_f: 90, gal_high: 20 });
  assert.strictEqual(r.out_of_range, true);
});
test("livestock-water-requirement: bad inputs rejected", () => {
  assert.ok("error" in computeLivestockWaterRequirement({ method: "table", head: 0, temp_f: 80, t_low_f: 40, gal_low: 8, t_high_f: 90, gal_high: 20 }));
  assert.ok("error" in computeLivestockWaterRequirement({ method: "table", head: 50, temp_f: 80, t_low_f: 90, gal_low: 8, t_high_f: 90, gal_high: 20 }));
});

// ---------------------------------------------------------------------------
// Group M - Water
// ---------------------------------------------------------------------------
import {
  computeWeirFlow, weirFlowExample,
  computeLangelierIndex, langelierIndexExample,
  computeChemicalFeedPump, chemicalFeedPumpExample,
} from "../../calc-treatment.js"; // spec-v75: v20 Phase M bench relocated out of calc-water.js

test("weir-flow: 90deg V-notch H 0.5 -> 0.446 cfs, 200 GPM", () => {
  const r = computeWeirFlow({ weir_type: "vnotch90", head_ft: 0.5 });
  assert.ok(Math.abs(r.flow_cfs - 0.446) < 0.002);
  assert.ok(Math.abs(r.flow_gpm - 200.3) < 0.5);
});
test("weir-flow: example", () => { assert.ok(computeWeirFlow(weirFlowExample.inputs).flow_cfs > 0); });
test("weir-flow: rectangular suppressed", () => {
  const r = computeWeirFlow({ weir_type: "rect_suppressed", head_ft: 0.5, crest_length_ft: 3 });
  assert.ok(Math.abs(r.flow_cfs - 3.33 * 3 * Math.pow(0.5, 1.5)) < 1e-6);
});
test("weir-flow: contracted subtracts end contractions", () => {
  const sup = computeWeirFlow({ weir_type: "rect_suppressed", head_ft: 0.5, crest_length_ft: 3 });
  const con = computeWeirFlow({ weir_type: "rect_contracted", head_ft: 0.5, crest_length_ft: 3 });
  assert.ok(con.flow_cfs < sup.flow_cfs);
});
test("weir-flow: low head flagged", () => {
  assert.strictEqual(computeWeirFlow({ weir_type: "vnotch90", head_ft: 0.1 }).low_accuracy, true);
});
test("weir-flow: zero head / missing length rejected", () => {
  assert.ok("error" in computeWeirFlow({ weir_type: "vnotch90", head_ft: 0 }));
  assert.ok("error" in computeWeirFlow({ weir_type: "rect_suppressed", head_ft: 0.5, crest_length_ft: 0 }));
});

test("langelier-index: pH 7.5 25C Ca200 alk150 TDS320 -> ~+0.04", () => {
  const r = computeLangelierIndex({ ph: 7.5, temp: 25, ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 });
  assert.ok(Math.abs(r.lsi - 0.04) < 0.02);
});
test("langelier-index: example", () => { assert.ok(typeof computeLangelierIndex(langelierIndexExample.inputs).lsi === "number"); });
test("langelier-index: higher pH -> more scaling", () => {
  const lo = computeLangelierIndex({ ph: 7.0, temp: 25, ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 });
  const hi = computeLangelierIndex({ ph: 8.0, temp: 25, ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 });
  assert.ok(hi.lsi > lo.lsi);
});
test("langelier-index: F unit converts", () => {
  const c = computeLangelierIndex({ ph: 7.5, temp: 25, temp_unit: "C", ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 });
  const f = computeLangelierIndex({ ph: 7.5, temp: 77, temp_unit: "F", ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 });
  assert.ok(Math.abs(c.lsi - f.lsi) < 0.01);
});
test("langelier-index: out-of-range Ca flagged", () => {
  assert.strictEqual(computeLangelierIndex({ ph: 7.5, temp: 25, ca_mgl: 10, alk_mgl: 150, tds_mgl: 320 }).out_of_range, true);
});
test("langelier-index: invalid inputs rejected", () => {
  assert.ok("error" in computeLangelierIndex({ ph: 0, temp: 25, ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 }));
  assert.ok("error" in computeLangelierIndex({ ph: 7.5, temp: 25, ca_mgl: 0, alk_mgl: 150, tds_mgl: 320 }));
});

test("chemical-feed-pump: 0.5 MGD 8 mg/L 12.5% SG1.16 -> ~55% of 50 GPD", () => {
  const r = computeChemicalFeedPump({ flow_mgd: 0.5, dose_mgl: 8, strength_pct: 12.5, sg: 1.16, pump_max_gpd: 50 });
  assert.ok(Math.abs(r.setting_pct - 55.2) < 0.5);
  assert.ok(Math.abs(r.solution_gpd - 27.59) < 0.1);
});
test("chemical-feed-pump: example", () => { assert.ok(computeChemicalFeedPump(chemicalFeedPumpExample.inputs).setting_pct > 0); });
test("chemical-feed-pump: pure lb/day = MGD*dose*8.34", () => {
  const r = computeChemicalFeedPump({ flow_mgd: 0.5, dose_mgl: 8, strength_pct: 100, sg: 1, pump_max_gpd: 50 });
  assert.ok(Math.abs(r.pure_lb_day - 0.5 * 8 * 8.34) < 1e-6);
});
test("chemical-feed-pump: over 100% flagged undersized", () => {
  const r = computeChemicalFeedPump({ flow_mgd: 2, dose_mgl: 10, strength_pct: 12.5, sg: 1.16, pump_max_gpd: 50 });
  assert.strictEqual(r.undersized, true);
});
test("chemical-feed-pump: weaker solution needs more volume", () => {
  const strong = computeChemicalFeedPump({ flow_mgd: 0.5, dose_mgl: 8, strength_pct: 25, sg: 1.2, pump_max_gpd: 50 });
  const weak = computeChemicalFeedPump({ flow_mgd: 0.5, dose_mgl: 8, strength_pct: 10, sg: 1.1, pump_max_gpd: 50 });
  assert.ok(weak.solution_gpd > strong.solution_gpd);
});
test("chemical-feed-pump: invalid strength/flow rejected", () => {
  assert.ok("error" in computeChemicalFeedPump({ flow_mgd: 0, dose_mgl: 8, strength_pct: 12.5, sg: 1.16, pump_max_gpd: 50 }));
  assert.ok("error" in computeChemicalFeedPump({ flow_mgd: 0.5, dose_mgl: 8, strength_pct: 0, sg: 1.16, pump_max_gpd: 50 }));
});

// ---------------------------------------------------------------------------
// Group N/O/P - Stage, Kitchen, Field
// ---------------------------------------------------------------------------
import { computePowerDistro, powerDistroExample } from "../../calc-stage.js";
import { computeBrineCure, brineCureExample } from "../../calc-kitchen.js";
import { computeSearchProbability, searchProbabilityExample } from "../../calc-field.js";

test("power-distro: 12kW 208V 3ph 60A -> 33.3 A/leg, pass", () => {
  const r = computePowerDistro({ watts: 12000, voltage_v: 208, phase: "three", rating_a: 60 });
  assert.ok(Math.abs(r.amps_per_leg - 33.31) < 0.05);
  assert.strictEqual(r.pass, true);
});
test("power-distro: example", () => { assert.ok(computePowerDistro(powerDistroExample.inputs).amps_per_leg > 0); });
test("power-distro: single-phase uses V*PF", () => {
  const r = computePowerDistro({ watts: 1200, voltage_v: 120, phase: "single", rating_a: 20 });
  assert.ok(Math.abs(r.amps_per_leg - 10) < 1e-6);
});
test("power-distro: continuous limit = rating*derate", () => {
  const r = computePowerDistro({ watts: 12000, voltage_v: 208, phase: "three", rating_a: 60 });
  assert.ok(Math.abs(r.continuous_limit_a - 48) < 1e-6);
});
test("power-distro: overload fails", () => {
  const r = computePowerDistro({ watts: 20000, voltage_v: 208, phase: "three", rating_a: 60 });
  assert.strictEqual(r.pass, false);
});
test("power-distro: invalid inputs rejected", () => {
  assert.ok("error" in computePowerDistro({ watts: 0, voltage_v: 208, phase: "three", rating_a: 60 }));
  assert.ok("error" in computePowerDistro({ watts: 12000, voltage_v: 208, phase: "three", rating_a: 60, pf: 1.5 }));
});

test("brine-cure: equilibrium meat1000 salt25 cure2.5 -> 2.5%, 156 ppm (green-meat basis)", () => {
  const r = computeBrineCure({ mode: "equilibrium", salt_g: 25, meat_g: 1000, cure_g: 2.5 });
  assert.ok(Math.abs(r.concentration_pct - 2.5) < 0.01);
  assert.ok(Math.abs(r.nitrite_ppm - 156.25) < 0.5);
});
test("brine-cure: example", () => { assert.ok(computeBrineCure(brineCureExample.inputs).nitrite_ppm > 0); });
test("brine-cure: brine mode = salt/(salt+water)", () => {
  const r = computeBrineCure({ mode: "brine", salt_g: 50, water_g: 950 });
  assert.ok(Math.abs(r.concentration_pct - 5) < 1e-6);
});
test("brine-cure: equilibrium nitrite ppm is on the green meat weight (6.25% cure)", () => {
  const r = computeBrineCure({ mode: "equilibrium", salt_g: 25, meat_g: 1000, cure_g: 2.5 });
  assert.ok(Math.abs(r.nitrite_ppm - 2.5 * 0.0625 * 1e6 / 1000) < 1e-6);
});
test("brine-cure: over-max nitrite flagged", () => {
  const r = computeBrineCure({ mode: "equilibrium", salt_g: 25, meat_g: 1000, cure_g: 4 });
  assert.strictEqual(r.nitrite_over_max, true);
});
test("brine-cure: negative weight rejected", () => {
  assert.ok("error" in computeBrineCure({ mode: "brine", salt_g: -1, water_g: 100 }));
});

test("search-probability: 30/40/50 POA60 -> 79% POD, 47.4% POS", () => {
  const r = computeSearchProbability({ pod_list: [30, 40, 50], poa_pct: 60 });
  assert.ok(Math.abs(r.cumulative_pod_pct - 79) < 0.1);
  assert.ok(Math.abs(r.pos_pct - 47.4) < 0.1);
});
test("search-probability: example", () => { assert.ok(computeSearchProbability(searchProbabilityExample.inputs).pos_pct > 0); });
test("search-probability: POS <= POA always", () => {
  const r = computeSearchProbability({ pod_list: [30, 40, 50], poa_pct: 60 });
  assert.ok(r.pos_pct <= 60);
});
test("search-probability: more passes raise cumulative POD", () => {
  const a = computeSearchProbability({ pod_list: [30], poa_pct: 100 });
  const b = computeSearchProbability({ pod_list: [30, 30], poa_pct: 100 });
  assert.ok(b.cumulative_pod_pct > a.cumulative_pod_pct);
});
test("search-probability: residual = POA*(1-cumPOD)", () => {
  const r = computeSearchProbability({ pod_list: [30, 40, 50], poa_pct: 60 });
  assert.ok(Math.abs(r.residual_pct - 60 * (1 - 0.79)) < 0.1);
});
test("search-probability: empty/out-of-range rejected", () => {
  assert.ok("error" in computeSearchProbability({ pod_list: [], poa_pct: 60 }));
  assert.ok("error" in computeSearchProbability({ pod_list: [120], poa_pct: 60 }));
});

// ---------------------------------------------------------------------------
// Group R - Accounting
// ---------------------------------------------------------------------------
import {
  computeDecliningBalanceDepreciation, decliningBalanceDepreciationExample,
  computeMarkupVsMargin, markupVsMarginExample,
  computeEmployerPayrollTax, employerPayrollTaxExample,
} from "../../calc-accounting.js";

test("declining-balance: $50k/$5k/5yr/200% -> Yr1 $20k", () => {
  const r = computeDecliningBalanceDepreciation({ cost: 50000, salvage: 5000, life_yr: 5, factor: 2, year: 1 });
  assert.strictEqual(r.year_depreciation, 20000);
  assert.strictEqual(r.book_value, 30000);
});
test("declining-balance: example", () => { assert.ok(computeDecliningBalanceDepreciation(decliningBalanceDepreciationExample.inputs).year_depreciation === 20000); });
test("declining-balance: book ends at salvage", () => {
  const r = computeDecliningBalanceDepreciation({ cost: 50000, salvage: 5000, life_yr: 5, factor: 2, year: 5 });
  assert.ok(Math.abs(r.book_value - 5000) < 1e-6);
});
test("declining-balance: rate = factor/life", () => {
  const r = computeDecliningBalanceDepreciation({ cost: 50000, salvage: 5000, life_yr: 5, factor: 2, year: 1 });
  assert.ok(Math.abs(r.db_rate - 0.4) < 1e-9);
});
test("declining-balance: never depreciates below salvage", () => {
  const r = computeDecliningBalanceDepreciation({ cost: 50000, salvage: 5000, life_yr: 5, factor: 2, year: 1 });
  for (const row of r.schedule) assert.ok(row.book_value >= 5000 - 1e-6);
});
test("declining-balance: 150% factor smaller Yr1", () => {
  const r = computeDecliningBalanceDepreciation({ cost: 50000, salvage: 5000, life_yr: 5, factor: 1.5, year: 1 });
  assert.ok(r.year_depreciation < 20000);
});
test("declining-balance: accumulated grows monotonically", () => {
  const r = computeDecliningBalanceDepreciation({ cost: 50000, salvage: 5000, life_yr: 5, factor: 2, year: 3 });
  assert.ok(r.schedule[2].accumulated > r.schedule[1].accumulated);
});
test("declining-balance: salvage >= cost rejected", () => {
  assert.ok("error" in computeDecliningBalanceDepreciation({ cost: 5000, salvage: 5000, life_yr: 5, factor: 2 }));
});

test("markup-vs-margin: cost $60 markup 50% -> price $90 margin 33.3%", () => {
  const r = computeMarkupVsMargin({ cost: 60, markup_pct: 50 });
  assert.ok(Math.abs(r.price - 90) < 0.01);
  assert.ok(Math.abs(r.margin_pct - 33.33) < 0.05);
});
test("markup-vs-margin: example", () => { assert.ok(Math.abs(computeMarkupVsMargin(markupVsMarginExample.inputs).price - 90) < 0.01); });
test("markup-vs-margin: cost+price derives both", () => {
  const r = computeMarkupVsMargin({ cost: 60, price: 90 });
  assert.ok(Math.abs(r.markup_pct - 50) < 0.01);
});
test("markup-vs-margin: price+margin derives cost", () => {
  const r = computeMarkupVsMargin({ price: 90, margin_pct: 33.333333 });
  assert.ok(Math.abs(r.cost - 60) < 0.01);
});
test("markup-vs-margin: total profit with units", () => {
  const r = computeMarkupVsMargin({ cost: 60, markup_pct: 50, units: 10 });
  assert.ok(Math.abs(r.total_profit - 300) < 0.01);
});
test("markup-vs-margin: margin >= 100 rejected", () => {
  assert.ok("error" in computeMarkupVsMargin({ cost: 60, margin_pct: 100 }));
});

test("employer-payroll-tax: high earner caps SS at base", () => {
  const r = computeEmployerPayrollTax({ wages: 200000, ss_base: 168600, futa_rate_pct: 0.6, suta_rate_pct: 2.7, suta_base: 7000 });
  assert.ok(Math.abs(r.employer_ss - 168600 * 0.062) < 0.5);
  assert.ok(Math.abs(r.employer_medicare - 200000 * 0.0145) < 1);
});
test("employer-payroll-tax: example", () => { assert.ok(computeEmployerPayrollTax(employerPayrollTaxExample.inputs).total_employer_tax > 0); });
test("employer-payroll-tax: medicare uncapped", () => {
  const r = computeEmployerPayrollTax({ wages: 50000, ss_base: 168600 });
  assert.ok(Math.abs(r.employer_medicare - 50000 * 0.0145) < 1e-6);
});
test("employer-payroll-tax: FUTA capped at base", () => {
  const r = computeEmployerPayrollTax({ wages: 50000, ss_base: 168600, futa_rate_pct: 0.6 });
  assert.ok(Math.abs(r.futa - 7000 * 0.006) < 1e-6);
});
test("employer-payroll-tax: credit-reduction state flagged", () => {
  const r = computeEmployerPayrollTax({ wages: 50000, ss_base: 168600, futa_rate_pct: 1.2 });
  assert.strictEqual(r.futa_credit_reduction, true);
});
test("employer-payroll-tax: loaded cost = wages + tax", () => {
  const r = computeEmployerPayrollTax({ wages: 50000, ss_base: 168600 });
  assert.ok(Math.abs(r.loaded_cost - (50000 + r.total_employer_tax)) < 1e-6);
});
test("employer-payroll-tax: zero wages / base rejected", () => {
  assert.ok("error" in computeEmployerPayrollTax({ wages: 0, ss_base: 168600 }));
  assert.ok("error" in computeEmployerPayrollTax({ wages: 50000, ss_base: 0 }));
});

// ---------------------------------------------------------------------------
// Group T - Lab
// ---------------------------------------------------------------------------
import {
  computePrimerTm, primerTmExample,
  computeCfuPlateCount, cfuPlateCountExample,
} from "../../calc-lab.js";

test("primer-tm: GCGGATCCATG Wallace -> 36 C", () => {
  const r = computePrimerTm({ sequence: "GCGGATCCATG" });
  assert.strictEqual(r.tm_c, 36);
  assert.strictEqual(r.method_used, "wallace");
  assert.strictEqual(r.length_nt, 11);
});
test("primer-tm: example", () => { assert.strictEqual(computePrimerTm(primerTmExample.inputs).tm_c, 36); });
test("primer-tm: long primer uses GC% formula", () => {
  const r = computePrimerTm({ sequence: "ATGCATGCATGCATGCATGC" });
  assert.strictEqual(r.method_used, "gc");
});
test("primer-tm: GC content computed", () => {
  const r = computePrimerTm({ sequence: "GGGGCCCC" });
  assert.ok(Math.abs(r.gc_content_pct - 100) < 1e-6);
});
test("primer-tm: non-ACGT dropped and flagged", () => {
  const r = computePrimerTm({ sequence: "GCGGATCCATGNN" });
  assert.strictEqual(r.dropped_chars, 2);
  assert.strictEqual(r.length_nt, 11);
});
test("primer-tm: empty rejected", () => {
  assert.ok("error" in computePrimerTm({ sequence: "" }));
  assert.ok("error" in computePrimerTm({ sequence: "XXXX" }));
});

test("cfu-plate-count: 150 colonies 1e-5 0.1mL -> 1.5e8", () => {
  const r = computeCfuPlateCount({ colonies: 150, dilution_factor: 1e-5, volume_ml: 0.1 });
  assert.ok(Math.abs(r.cfu_per_ml - 1.5e8) / 1.5e8 < 1e-6);
});
test("cfu-plate-count: example", () => { assert.ok(computeCfuPlateCount(cfuPlateCountExample.inputs).cfu_per_ml > 0); });
test("cfu-plate-count: times-form dilution same result", () => {
  const frac = computeCfuPlateCount({ colonies: 150, dilution_factor: 1e-5, volume_ml: 0.1 });
  const times = computeCfuPlateCount({ colonies: 150, dilution_factor: 100000, volume_ml: 0.1 });
  assert.ok(Math.abs(frac.cfu_per_ml - times.cfu_per_ml) / frac.cfu_per_ml < 1e-9);
});
test("cfu-plate-count: countable range flag", () => {
  assert.strictEqual(computeCfuPlateCount({ colonies: 150, dilution_factor: 1e-5, volume_ml: 0.1 }).in_countable_range, true);
  assert.strictEqual(computeCfuPlateCount({ colonies: 500, dilution_factor: 1e-5, volume_ml: 0.1 }).in_countable_range, false);
});
test("cfu-plate-count: TNTC note above range", () => {
  assert.match(computeCfuPlateCount({ colonies: 400, dilution_factor: 1e-5, volume_ml: 0.1 }).note, /TNTC/);
});
test("cfu-plate-count: zero dilution/volume rejected", () => {
  assert.ok("error" in computeCfuPlateCount({ colonies: 150, dilution_factor: 0, volume_ml: 0.1 }));
  assert.ok("error" in computeCfuPlateCount({ colonies: 150, dilution_factor: 1e-5, volume_ml: 0 }));
});

// ---------------------------------------------------------------------------
// Group X - Real Estate
// ---------------------------------------------------------------------------
import {
  computeGrossRentMultiplier, grossRentMultiplierExample,
  computePmiCancellationDate, pmiCancellationDateExample,
  computeSellerNetSheet, sellerNetSheetExample,
} from "../../calc-realestate.js";

test("gross-rent-multiplier: $300k / $36k -> 8.33, 12%", () => {
  const r = computeGrossRentMultiplier({ price: 300000, gross_rent: 36000 });
  assert.ok(Math.abs(r.grm_annual - 8.333) < 0.01);
  assert.ok(Math.abs(r.gross_yield_pct - 12) < 0.05);
});
test("gross-rent-multiplier: example", () => { assert.ok(computeGrossRentMultiplier(grossRentMultiplierExample.inputs).grm_annual > 0); });
test("gross-rent-multiplier: monthly basis 12x", () => {
  const r = computeGrossRentMultiplier({ price: 300000, gross_rent: 3000, rent_basis: "monthly" });
  assert.ok(Math.abs(r.grm_annual - 8.333) < 0.01);
});
test("gross-rent-multiplier: implied value from market GRM", () => {
  const r = computeGrossRentMultiplier({ price: 300000, gross_rent: 36000, market_grm: 10 });
  assert.ok(Math.abs(r.implied_value - 360000) < 1);
});
test("gross-rent-multiplier: yield = 1/GRM", () => {
  const r = computeGrossRentMultiplier({ price: 300000, gross_rent: 36000 });
  assert.ok(Math.abs(r.gross_yield_pct - 1 / r.grm_annual * 100) < 1e-9);
});
test("gross-rent-multiplier: zero rent rejected", () => {
  assert.ok("error" in computeGrossRentMultiplier({ price: 300000, gross_rent: 0 }));
});

test("pmi-cancellation-date: $250k 6.5% 360 -> 80% m146, 78% m156", () => {
  const r = computePmiCancellationDate({ value: 250000, loan: 250000, rate_pct: 6.5, term_months: 360 });
  assert.ok(Math.abs(r.month_80 - 146) <= 1);
  assert.ok(Math.abs(r.month_78 - 156) <= 1);
});
test("pmi-cancellation-date: example", () => { assert.ok(computePmiCancellationDate(pmiCancellationDateExample.inputs).month_78 > 0); });
test("pmi-cancellation-date: midpoint backstop = ceil(n/2)", () => {
  const r = computePmiCancellationDate({ value: 250000, loan: 250000, rate_pct: 6.5, term_months: 360 });
  assert.strictEqual(r.midpoint_month, 180);
});
test("pmi-cancellation-date: 78% later than 80%", () => {
  const r = computePmiCancellationDate({ value: 250000, loan: 250000, rate_pct: 6.5, term_months: 360 });
  assert.ok(r.month_78 > r.month_80);
});
test("pmi-cancellation-date: lower loan reaches 80% sooner", () => {
  const a = computePmiCancellationDate({ value: 250000, loan: 250000, rate_pct: 6.5, term_months: 360 });
  const b = computePmiCancellationDate({ value: 250000, loan: 225000, rate_pct: 6.5, term_months: 360 });
  assert.ok(b.month_80 < a.month_80);
});
test("pmi-cancellation-date: bad term rejected", () => {
  assert.ok("error" in computePmiCancellationDate({ value: 250000, loan: 250000, rate_pct: 6.5, term_months: 0 }));
});

test("seller-net-sheet: $400k sale -> $123,500 net", () => {
  const r = computeSellerNetSheet({ price: 400000, payoff: 250000, commission_pct: 5.5, transfer_tax_pct: 0.5, fees: 2500 });
  assert.ok(Math.abs(r.net_proceeds - 123500) < 1);
  assert.ok(Math.abs(r.commission - 22000) < 1);
});
test("seller-net-sheet: example", () => { assert.ok(computeSellerNetSheet(sellerNetSheetExample.inputs).net_proceeds > 0); });
test("seller-net-sheet: transfer tax = price*rate", () => {
  const r = computeSellerNetSheet({ price: 400000, payoff: 0, commission_pct: 0, transfer_tax_pct: 0.5, fees: 0 });
  assert.ok(Math.abs(r.transfer_tax - 2000) < 1e-6);
});
test("seller-net-sheet: tax proration reduces net", () => {
  const a = computeSellerNetSheet({ price: 400000, payoff: 250000, commission_pct: 5.5, transfer_tax_pct: 0.5, fees: 2500 });
  const b = computeSellerNetSheet({ price: 400000, payoff: 250000, commission_pct: 5.5, transfer_tax_pct: 0.5, fees: 2500, annual_tax: 3650, days_seller_owes: 100 });
  assert.ok(b.net_proceeds < a.net_proceeds);
});
test("seller-net-sheet: cost of sale percent", () => {
  const r = computeSellerNetSheet({ price: 400000, payoff: 0, commission_pct: 5.5, transfer_tax_pct: 0.5, fees: 2500 });
  assert.ok(r.cost_of_sale_pct > 0 && r.cost_of_sale_pct < 100);
  // Cost of sale must EXCLUDE the mortgage payoff: with a $250k payoff the cost of
  // sale is still just commission $22k + transfer $2k + fees $2.5k = $26.5k / $400k = 6.625%,
  // not 69.125% (which would fold the loan payoff into "cost of sale").
  const withPayoff = computeSellerNetSheet({ price: 400000, payoff: 250000, commission_pct: 5.5, transfer_tax_pct: 0.5, fees: 2500 });
  assert.ok(Math.abs(withPayoff.cost_of_sale_pct - 6.625) < 1e-9, `cost_of_sale_pct=${withPayoff.cost_of_sale_pct}`);
});
test("seller-net-sheet: zero price rejected", () => {
  assert.ok("error" in computeSellerNetSheet({ price: 0, payoff: 0, commission_pct: 5.5 }));
});

// ---------------------------------------------------------------------------
// Group Y - Educators
// ---------------------------------------------------------------------------
import {
  computeFinalGradeNeeded, finalGradeNeededExample,
  computeCategoryWeightedGrade, categoryWeightedGradeExample,
  computeTwoSampleTTest, twoSampleTTestExample,
} from "../../calc-edu.js";

test("final-grade-needed: current 88, final 25%, target 90 -> 96%", () => {
  const r = computeFinalGradeNeeded({ current_pct: 88, final_weight_pct: 25, target_pct: 90 });
  assert.strictEqual(r.needed_pct, 96);
  assert.strictEqual(r.max_pct, 91);
});
test("final-grade-needed: example", () => { assert.strictEqual(computeFinalGradeNeeded(finalGradeNeededExample.inputs).needed_pct, 96); });
test("final-grade-needed: not achievable above 100", () => {
  const r = computeFinalGradeNeeded({ current_pct: 70, final_weight_pct: 20, target_pct: 95 });
  assert.match(r.status, /not achievable/);
});
test("final-grade-needed: already secured clamps to 0", () => {
  const r = computeFinalGradeNeeded({ current_pct: 95, final_weight_pct: 25, target_pct: 60 });
  assert.strictEqual(r.needed_pct, 0);
  assert.match(r.status, /secured/);
});
test("final-grade-needed: max/min span the final weight", () => {
  const r = computeFinalGradeNeeded({ current_pct: 88, final_weight_pct: 25, target_pct: 90 });
  assert.ok(Math.abs(r.max_pct - r.min_pct - 25) < 1e-9);
});
test("final-grade-needed: zero final weight rejected", () => {
  assert.ok("error" in computeFinalGradeNeeded({ current_pct: 88, final_weight_pct: 0, target_pct: 90 }));
});

test("category-weighted-grade: HW/Quiz/Final -> 82.9% (B)", () => {
  const r = computeCategoryWeightedGrade({ categories: [{ earned: 92, possible: 100, weight: 20 }, { earned: 85, possible: 100, weight: 30 }, { earned: 78, possible: 100, weight: 50 }] });
  assert.ok(Math.abs(r.overall_pct - 82.9) < 0.05);
  assert.strictEqual(r.letter, "B");
});
test("category-weighted-grade: example", () => { assert.strictEqual(computeCategoryWeightedGrade(categoryWeightedGradeExample.inputs).letter, "B"); });
test("category-weighted-grade: normalizes by weight sum", () => {
  const r = computeCategoryWeightedGrade({ categories: [{ earned: 90, possible: 100, weight: 25 }] });
  assert.ok(Math.abs(r.overall_pct - 90) < 1e-9);
  assert.strictEqual(r.weight_normalized, true);
});
test("category-weighted-grade: possible=0 excluded", () => {
  const r = computeCategoryWeightedGrade({ categories: [{ earned: 90, possible: 100, weight: 50 }, { earned: 0, possible: 0, weight: 50 }] });
  assert.ok(Math.abs(r.overall_pct - 90) < 1e-9);
});
test("category-weighted-grade: letter bands", () => {
  assert.strictEqual(computeCategoryWeightedGrade({ categories: [{ earned: 95, possible: 100, weight: 100 }] }).letter, "A");
  assert.strictEqual(computeCategoryWeightedGrade({ categories: [{ earned: 55, possible: 100, weight: 100 }] }).letter, "F");
});
test("category-weighted-grade: empty rejected", () => {
  assert.ok("error" in computeCategoryWeightedGrade({ categories: [] }));
});

test("two-sample-t-test: 82/6/25 vs 78/7/22 -> t 2.09, p 0.043", () => {
  const r = computeTwoSampleTTest({ mean1: 82, sd1: 6, n1: 25, mean2: 78, sd2: 7, n2: 22 });
  assert.ok(Math.abs(r.t_stat - 2.089) < 0.02);
  assert.ok(Math.abs(r.df - 41.7) < 0.5);
  assert.ok(Math.abs(r.p_value - 0.043) < 0.005);
});
test("two-sample-t-test: example", () => { assert.ok(computeTwoSampleTTest(twoSampleTTestExample.inputs).t_stat > 0); });
test("two-sample-t-test: mean diff", () => {
  const r = computeTwoSampleTTest({ mean1: 82, sd1: 6, n1: 25, mean2: 78, sd2: 7, n2: 22 });
  assert.strictEqual(r.mean_diff, 4);
});
test("two-sample-t-test: one-sided p is half two-sided", () => {
  const two = computeTwoSampleTTest({ mean1: 82, sd1: 6, n1: 25, mean2: 78, sd2: 7, n2: 22, tail: "two" });
  const one = computeTwoSampleTTest({ mean1: 82, sd1: 6, n1: 25, mean2: 78, sd2: 7, n2: 22, tail: "one" });
  assert.ok(Math.abs(one.p_value - two.p_value / 2) < 1e-9);
});
test("two-sample-t-test: tcdf agrees with regression/correlation helper", () => {
  // cross-tile: the same tcdf is used; a large t gives a tiny p
  const r = computeTwoSampleTTest({ mean1: 100, sd1: 5, n1: 30, mean2: 80, sd2: 5, n2: 30 });
  assert.ok(r.p_value < 0.001);
  assert.strictEqual(r.significant, true);
});
test("two-sample-t-test: n < 2 rejected", () => {
  assert.ok("error" in computeTwoSampleTTest({ mean1: 82, sd1: 6, n1: 1, mean2: 78, sd2: 7, n2: 22 }));
});
