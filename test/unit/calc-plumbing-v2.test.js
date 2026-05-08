// Unit tests for calc-plumbing.js v2 utilities (72-78). At least 10 cases per spec section 13.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeWaterHammerArrestor,
  computeRecircPumpHead,
  computeSepticTank,
  computeTrapArm,
  computePipeExpansion,
  computeTanklessGPM,
  computeGasLeakRate,
  PDI_WH_ARRESTOR_SIZES,
  TRAP_ARM_MAX_FT,
  PIPE_EXPANSION_ALPHA_PER_F,
  TANKLESS_INLET_F_BY_ZONE,
  waterHammerArrestorExample,
  recircPumpHeadExample,
  septicTankExample,
  trapArmExample,
  pipeExpansionExample,
  tanklessGPMExample,
  gasLeakRateExample,
} from "../../calc-plumbing.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 72: Water Hammer Arrestor ---

test("WH arrestor: example -> AA-B", () => {
  const r = computeWaterHammerArrestor(waterHammerArrestorExample.inputs);
  assert.equal(r.designation, "AA-B");
});

test("WH arrestor: 5 WSFU -> AA-A", () => {
  const r = computeWaterHammerArrestor({ wsfu: 5 });
  assert.equal(r.designation, "AA-A");
});

test("WH arrestor: 50 WSFU -> AA-C", () => {
  const r = computeWaterHammerArrestor({ wsfu: 50 });
  assert.equal(r.designation, "AA-C");
});

test("WH arrestor: 200 WSFU -> AA-F", () => {
  const r = computeWaterHammerArrestor({ wsfu: 200 });
  assert.equal(r.designation, "AA-F");
});

test("WH arrestor: zero WSFU returns error", () => {
  const r = computeWaterHammerArrestor({ wsfu: 0 });
  assert.ok(r.error);
});

test("WH arrestor: long branch flagged when length > 20 ft", () => {
  const r = computeWaterHammerArrestor({ wsfu: 5, length_ft: 30 });
  assert.equal(r.long_branch_flag, true);
});

test("WH arrestor: short branch not flagged", () => {
  const r = computeWaterHammerArrestor({ wsfu: 5, length_ft: 10 });
  assert.equal(r.long_branch_flag, false);
});

test("WH arrestor: above table returns error", () => {
  const r = computeWaterHammerArrestor({ wsfu: 99999 });
  assert.ok(r.error);
});

test("WH arrestor: PDI table has six designations", () => {
  assert.equal(PDI_WH_ARRESTOR_SIZES.length, 6);
});

test("WH arrestor: max_wsfu values are monotonically increasing", () => {
  for (let i = 1; i < PDI_WH_ARRESTOR_SIZES.length; i++) {
    assert.ok(PDI_WH_ARRESTOR_SIZES[i].max_wsfu > PDI_WH_ARRESTOR_SIZES[i - 1].max_wsfu);
  }
});

// --- Utility 73: Recirc Pump Head ---

test("Recirc pump: example yields positive head", () => {
  const r = computeRecircPumpHead(recircPumpHeadExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.head_ft > 0);
});

test("Recirc pump: equivalent length = fittings * factor", () => {
  const r = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, fittings_count: 10, equivalent_length_per_fitting_ft: 3 });
  assert.equal(r.equivalent_length_ft, 30);
});

test("Recirc pump: total length = pipe + equivalent", () => {
  const r = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, pipe_length_ft: 50, fittings_count: 4, equivalent_length_per_fitting_ft: 2 });
  assert.equal(r.total_length_ft, 58);
});

test("Recirc pump: longer pipe -> more head", () => {
  const a = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, pipe_length_ft: 50 });
  const b = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, pipe_length_ft: 200 });
  assert.ok(b.head_ft > a.head_ft);
});

test("Recirc pump: higher flow -> more head", () => {
  const a = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, target_flow_gpm: 2 });
  const b = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, target_flow_gpm: 8 });
  assert.ok(b.head_ft > a.head_ft);
});

test("Recirc pump: zero diameter returns error", () => {
  const r = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, internal_diameter_in: 0 });
  assert.ok(r.error);
});

test("Recirc pump: zero flow returns error", () => {
  const r = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, target_flow_gpm: 0 });
  assert.ok(r.error);
});

test("Recirc pump: zero length returns error", () => {
  const r = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, pipe_length_ft: 0 });
  assert.ok(r.error);
});

test("Recirc pump: pressure_psi consistent with head_ft (~0.433 psi/ft)", () => {
  const r = computeRecircPumpHead(recircPumpHeadExample.inputs);
  assert.ok(close(r.pressure_psi, r.head_ft * 0.433, r.head_ft * 0.05));
});

test("Recirc pump: PEX vs steel head differs (different C)", () => {
  const a = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, material: "pex" });
  const b = computeRecircPumpHead({ ...recircPumpHeadExample.inputs, material: "steel_old" });
  assert.notEqual(a.head_ft, b.head_ft);
});

// --- Utility 74: Septic Tank ---

test("Septic tank: 3 bedrooms -> 450 gpd, 1000 gal floor", () => {
  const r = computeSepticTank(septicTankExample.inputs);
  assert.equal(r.daily_flow_gpd, 450);
  assert.equal(r.minimum_tank_gallons, 1000);
});

test("Septic tank: 5 bedrooms -> 750 gpd, 1500 gal", () => {
  const r = computeSepticTank({ bedrooms: 5 });
  assert.equal(r.daily_flow_gpd, 750);
  assert.equal(r.minimum_tank_gallons, 1500);
});

test("Septic tank: explicit gpd overrides bedrooms", () => {
  const r = computeSepticTank({ bedrooms: 3, gallons_per_day: 800 });
  assert.equal(r.daily_flow_gpd, 800);
  assert.equal(r.minimum_tank_gallons, 1600);
});

test("Septic tank: tank_gallons floor at 1000", () => {
  const r = computeSepticTank({ bedrooms: 1 });
  assert.equal(r.minimum_tank_gallons, 1000);
});

test("Septic tank: zero bedrooms and zero gpd returns error", () => {
  const r = computeSepticTank({});
  assert.ok(r.error);
});

test("Septic tank: tank gallons always >= 2 * gpd above floor", () => {
  const r = computeSepticTank({ gallons_per_day: 600 });
  assert.ok(r.minimum_tank_gallons >= 2 * 600);
});

test("Septic tank: floor_gallons surfaced as 1000", () => {
  const r = computeSepticTank({ bedrooms: 4 });
  assert.equal(r.floor_gallons, 1000);
});

test("Septic tank: 6 bedrooms -> 900 gpd, 1800 gal", () => {
  const r = computeSepticTank({ bedrooms: 6 });
  assert.equal(r.daily_flow_gpd, 900);
  assert.equal(r.minimum_tank_gallons, 1800);
});

test("Septic tank: explicit small gpd still hits 1000 gal floor", () => {
  const r = computeSepticTank({ gallons_per_day: 200 });
  assert.equal(r.minimum_tank_gallons, 1000);
});

test("Septic tank: explicit large gpd scales", () => {
  const r = computeSepticTank({ gallons_per_day: 2000 });
  assert.equal(r.minimum_tank_gallons, 4000);
});

// --- Utility 75: Trap Arm Length ---

test("Trap arm: 1.5 in -> table max 5 ft", () => {
  const r = computeTrapArm(trapArmExample.inputs);
  assert.equal(r.table_max_ft, 5);
});

test("Trap arm: 2 in -> table max 8 ft", () => {
  const r = computeTrapArm({ pipe_diameter_in: "2" });
  assert.equal(r.table_max_ft, 8);
});

test("Trap arm: 3 in -> table max 12 ft", () => {
  const r = computeTrapArm({ pipe_diameter_in: "3" });
  assert.equal(r.table_max_ft, 12);
});

test("Trap arm: unknown diameter returns error", () => {
  const r = computeTrapArm({ pipe_diameter_in: "5" });
  assert.ok(r.error);
});

test("Trap arm: steeper slope reduces fall-limited length", () => {
  const a = computeTrapArm({ pipe_diameter_in: "2", slope_in_per_ft: 0.25 });
  const b = computeTrapArm({ pipe_diameter_in: "2", slope_in_per_ft: 0.5 });
  assert.ok(b.fall_limited_ft < a.fall_limited_ft);
});

test("Trap arm: gentler slope -> longer fall-limited length", () => {
  const a = computeTrapArm({ pipe_diameter_in: "2", slope_in_per_ft: 0.25 });
  const b = computeTrapArm({ pipe_diameter_in: "2", slope_in_per_ft: 0.125 });
  assert.ok(b.fall_limited_ft > a.fall_limited_ft);
});

test("Trap arm: max_length is min of table and fall-limited", () => {
  const r = computeTrapArm({ pipe_diameter_in: "1.5", slope_in_per_ft: 1.0 });
  // fall_limited = 1.5 / 1.0 = 1.5 ft, table_max = 5; expect 1.5.
  assert.ok(close(r.max_length_ft, 1.5));
});

test("Trap arm: bundled table has five sizes", () => {
  assert.equal(Object.keys(TRAP_ARM_MAX_FT).length, 5);
});

test("Trap arm: pipe_diameter_in surfaced as number", () => {
  const r = computeTrapArm({ pipe_diameter_in: "1.25" });
  assert.equal(r.pipe_diameter_in, 1.25);
});

test("Trap arm: 4 in -> table max 16 ft", () => {
  const r = computeTrapArm({ pipe_diameter_in: "4" });
  assert.equal(r.table_max_ft, 16);
});

// --- Utility 76: Pipe Thermal Expansion ---

test("Pipe expansion: copper 100 ft, 80 F -> ~0.9 in", () => {
  // 9.4e-6 * 100 * 12 * 80 = 0.9024 in.
  const r = computePipeExpansion(pipeExpansionExample.inputs);
  assert.ok(close(r.delta_L_in, 0.9024, 0.005));
});

test("Pipe expansion: PEX expands more than copper for same dT", () => {
  const a = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 50 });
  const b = computePipeExpansion({ material: "PEX", length_ft: 100, delta_T_F: 50 });
  assert.ok(b.delta_L_in > a.delta_L_in);
});

test("Pipe expansion: doubled length doubles dL", () => {
  const a = computePipeExpansion({ material: "copper", length_ft: 50, delta_T_F: 80 });
  const b = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 80 });
  assert.ok(close(b.delta_L_in, 2 * a.delta_L_in));
});

test("Pipe expansion: doubled dT doubles dL", () => {
  const a = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 40 });
  const b = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 80 });
  assert.ok(close(b.delta_L_in, 2 * a.delta_L_in));
});

test("Pipe expansion: negative dT yields negative dL", () => {
  const r = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: -40 });
  assert.ok(r.delta_L_in < 0);
});

test("Pipe expansion: unknown material returns error", () => {
  const r = computePipeExpansion({ material: "lead", length_ft: 100, delta_T_F: 80 });
  assert.ok(r.error);
});

test("Pipe expansion: alpha values in expected ranges", () => {
  for (const v of Object.values(PIPE_EXPANSION_ALPHA_PER_F)) {
    assert.ok(v > 0 && v < 1e-3);
  }
});

test("Pipe expansion: CPVC > PVC > steel for same dT and L", () => {
  const c = computePipeExpansion({ material: "CPVC", length_ft: 100, delta_T_F: 50 });
  const p = computePipeExpansion({ material: "PVC", length_ft: 100, delta_T_F: 50 });
  const s = computePipeExpansion({ material: "steel", length_ft: 100, delta_T_F: 50 });
  assert.ok(c.delta_L_in > p.delta_L_in);
  assert.ok(p.delta_L_in > s.delta_L_in);
});

test("Pipe expansion: result preserves alpha", () => {
  const r = computePipeExpansion({ material: "PEX", length_ft: 50, delta_T_F: 30 });
  assert.equal(r.alpha_per_F, PIPE_EXPANSION_ALPHA_PER_F.PEX);
});

test("Pipe expansion: missing dT returns error", () => {
  const r = computePipeExpansion({ material: "copper", length_ft: 100 });
  assert.ok(r.error);
});

// --- Utility 77: Tankless GPM ---

test("Tankless: example yields 6-7 gpm range", () => {
  const r = computeTanklessGPM(tanklessGPMExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.gpm > 5 && r.gpm < 8);
});

test("Tankless: cold zone yields fewer gpm than warm zone", () => {
  const cold = computeTanklessGPM({ kbtu_input: 199, climate_zone: "7_Duluth_MN", target_outlet_F: 110 });
  const warm = computeTanklessGPM({ kbtu_input: 199, climate_zone: "1A_Miami_FL", target_outlet_F: 110 });
  assert.ok(cold.gpm < warm.gpm);
});

test("Tankless: doubled input doubles gpm", () => {
  const a = computeTanklessGPM({ kbtu_input: 100, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  const b = computeTanklessGPM({ kbtu_input: 200, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  assert.ok(close(b.gpm, 2 * a.gpm, 0.01));
});

test("Tankless: target equal to inlet returns error", () => {
  const inlet = TANKLESS_INLET_F_BY_ZONE["5A_Chicago_IL"];
  const r = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: inlet });
  assert.ok(r.error);
});

test("Tankless: target below inlet returns error", () => {
  const r = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 30 });
  assert.ok(r.error);
});

test("Tankless: zero kBTU returns error", () => {
  const r = computeTanklessGPM({ kbtu_input: 0, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  assert.ok(r.error);
});

test("Tankless: unknown zone returns error", () => {
  const r = computeTanklessGPM({ kbtu_input: 199, climate_zone: "8_North_Pole", target_outlet_F: 110 });
  assert.ok(r.error);
});

test("Tankless: delta T equals outlet - inlet", () => {
  const r = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 120 });
  assert.equal(r.delta_T_F, 120 - TANKLESS_INLET_F_BY_ZONE["5A_Chicago_IL"]);
});

test("Tankless: 7 zones bundled", () => {
  assert.equal(Object.keys(TANKLESS_INLET_F_BY_ZONE).length, 7);
});

test("Tankless: hand-calc check at 199 kBTU, dT=60", () => {
  // gpm = 199*1000 / (8.33*60*60) ~ 6.64
  const r = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  assert.ok(close(r.gpm, 199 * 1000 / (8.33 * 60 * 60), 0.05));
});

// --- Utility 78: Gas Leak Rate ---

test("Gas leak: example positive cfh", () => {
  const r = computeGasLeakRate(gasLeakRateExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.leak_rate_cfh > 0);
});

test("Gas leak: zero pressure returns error", () => {
  const r = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0, gas: "natural_gas" });
  assert.ok(r.error);
});

test("Gas leak: zero diameter returns error", () => {
  const r = computeGasLeakRate({ orifice_diameter_in: 0, upstream_psi: 0.5, gas: "natural_gas" });
  assert.ok(r.error);
});

test("Gas leak: unknown gas returns error", () => {
  const r = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.5, gas: "hydrogen" });
  assert.ok(r.error);
});

test("Gas leak: doubled diameter -> 4x leak (area scales d^2)", () => {
  const a = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas" });
  const b = computeGasLeakRate({ orifice_diameter_in: 0.10, upstream_psi: 0.25, gas: "natural_gas" });
  assert.ok(close(b.leak_rate_cfh, 4 * a.leak_rate_cfh, 0.05 * a.leak_rate_cfh));
});

test("Gas leak: 4x pressure -> 2x leak (sqrt scaling)", () => {
  const a = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas" });
  const b = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 1.0, gas: "natural_gas" });
  assert.ok(close(b.leak_rate_cfh, 2 * a.leak_rate_cfh, 0.05 * a.leak_rate_cfh));
});

test("Gas leak: propane heavier (higher SG) -> less cfh than natural gas same dP", () => {
  const ng = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas" });
  const pr = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "propane" });
  assert.ok(pr.leak_rate_cfh < ng.leak_rate_cfh);
});

test("Gas leak: lower discharge coefficient lowers leak", () => {
  const a = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
  const b = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.4 });
  assert.ok(b.leak_rate_cfh < a.leak_rate_cfh);
});

test("Gas leak: orifice_area_in2 = pi/4 d^2", () => {
  const r = computeGasLeakRate({ orifice_diameter_in: 0.1, upstream_psi: 0.25, gas: "natural_gas" });
  assert.ok(close(r.orifice_area_in2, Math.PI * 0.0025, 1e-6));
});

test("Gas leak: surfaces specific gravity from gas table", () => {
  const r = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "propane" });
  assert.equal(r.specific_gravity, 1.52);
});
