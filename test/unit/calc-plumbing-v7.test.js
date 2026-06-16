// Unit tests for calc-plumbing.js v7 utilities (238-241).
// Per spec-v7.md Step 59.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeWaterHammerSurge, waterHammerSurgeExample,
  PIPE_ELASTIC_PROPERTIES, SCH40_DIMS_IN, FLUID_PROPERTIES,
  computePumpOperatingPoint, pumpOperatingPointExample, PUMP_CURVES,
  computePipeExpansionLoop, pipeExpansionLoopExample, THERMAL_EXPANSION_COEFFICIENTS,
  PLUMBING_RENDERERS,
} from "../../calc-plumbing.js";
// spec-v86 cap-relief split: septic-drainfield moved to calc-septic.js
import { computeSepticDrainfield, septicDrainfieldExample, SEPTIC_RENDERERS } from "../../calc-septic.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- 238 Joukowsky water-hammer surge ---

test("238 example yields finite outputs", () => {
  const r = computeWaterHammerSurge(waterHammerSurgeExample.inputs);
  assert.ok(r.celerity_fps > 0);
  assert.ok(r.surge_psi > 0);
  assert.ok(r.reflection_time_s > 0);
  assert.ok(typeof r.rapid_closure === "boolean");
});

test("238 unrestricted water celerity is ~ 4720 fps; pipe coupling lowers it", () => {
  // Steel is stiff; copper less so. PEX much less so.
  const a_steel = computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 1, closure_time_s: 0, run_length_ft: 100, fluid: "water" }).celerity_fps;
  const a_copper = computeWaterHammerSurge({ material: "copper", pipe_size: "1", velocity_fps: 1, closure_time_s: 0, run_length_ft: 100, fluid: "water" }).celerity_fps;
  const a_pex = computeWaterHammerSurge({ material: "pex", pipe_size: "1", velocity_fps: 1, closure_time_s: 0, run_length_ft: 100, fluid: "water" }).celerity_fps;
  // Pure-water unrestricted celerity ~ 4720 fps
  assert.ok(a_steel > 4000 && a_steel < 4720, "steel celerity " + a_steel + " should be 4000-4720 fps");
  assert.ok(a_copper > 3500 && a_copper < a_steel, "copper celerity " + a_copper + " should be < steel");
  assert.ok(a_pex < 1000, "PEX celerity " + a_pex + " should drop sharply due to wall compliance");
});

test("238 Joukowsky surge scales linearly with velocity", () => {
  const a = computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 5, closure_time_s: 0, run_length_ft: 100 });
  const b = computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 10, closure_time_s: 0, run_length_ft: 100 });
  assert.ok(close(b.surge_psi / a.surge_psi, 2.0, 0.001));
});

test("238 rapid_closure flips at t_close = 2L/a", () => {
  const r = computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 8, closure_time_s: 0.01, run_length_ft: 100 });
  // 2L/a for steel ~ 200/4500 ~ 0.044 s; so 0.01 < 0.044 → rapid
  assert.ok(r.rapid_closure);
  const slow = computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 8, closure_time_s: 0.5, run_length_ft: 100 });
  assert.equal(slow.rapid_closure, false);
});

test("238 errors on unknown material / size / fluid", () => {
  assert.ok(computeWaterHammerSurge({ material: "unobtainium", pipe_size: "1", velocity_fps: 5, closure_time_s: 0.05, run_length_ft: 100, fluid: "water" }).error);
  assert.ok(computeWaterHammerSurge({ material: "steel", pipe_size: "5", velocity_fps: 5, closure_time_s: 0.05, run_length_ft: 100, fluid: "water" }).error);
  assert.ok(computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 5, closure_time_s: 0.05, run_length_ft: 100, fluid: "kerosene" }).error);
});

test("238 zero run length errors", () => {
  assert.ok(computeWaterHammerSurge({ material: "steel", pipe_size: "1", velocity_fps: 5, closure_time_s: 0.05, run_length_ft: 0 }).error);
});

test("238 PIPE_ELASTIC_PROPERTIES covers expected materials", () => {
  for (const k of ["copper", "pex", "cpvc", "steel", "ductile_iron", "pvc"]) {
    assert.ok(PIPE_ELASTIC_PROPERTIES[k], "missing material " + k);
    assert.ok(PIPE_ELASTIC_PROPERTIES[k].E_psi > 0);
  }
});

test("238 SCH40_DIMS_IN covers 1/2 through 4 inch", () => {
  for (const k of ["1/2", "3/4", "1", "1.25", "1.5", "2", "3", "4"]) {
    assert.ok(SCH40_DIMS_IN[k], "missing size " + k);
    assert.ok(SCH40_DIMS_IN[k].D > SCH40_DIMS_IN[k].t);
  }
});

test("238 FLUID_PROPERTIES has water + two glycol mixes", () => {
  assert.ok(FLUID_PROPERTIES.water.K_psi > 0);
  assert.ok(FLUID_PROPERTIES.glycol_30.rho_slug_ft3 > FLUID_PROPERTIES.water.rho_slug_ft3);
});

// --- 239 Pump operating point ---

test("239 example yields a finite operating point inside the curve", () => {
  const r = computePumpOperatingPoint(pumpOperatingPointExample.inputs);
  assert.ok(r.operating_gpm > 0);
  assert.ok(r.head_ft > 0);
  assert.ok(r.efficiency >= 0);
});

test("239 raising static head moves operating point left (lower gpm)", () => {
  const a = computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: 30, k_friction: 0.003 });
  const b = computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: 70, k_friction: 0.003 });
  assert.ok(b.operating_gpm < a.operating_gpm, "got " + b.operating_gpm + " vs " + a.operating_gpm);
});

test("239 increasing friction k moves operating point left", () => {
  const a = computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: 30, k_friction: 0.003 });
  const b = computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: 30, k_friction: 0.020 });
  assert.ok(b.operating_gpm < a.operating_gpm);
});

test("239 static head above shutoff errors", () => {
  // small_centrifugal shutoff = 110 ft
  assert.ok(computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: 200, k_friction: 0 }).error);
});

test("239 unknown pump errors", () => {
  assert.ok(computePumpOperatingPoint({ pump: "no-such-pump", static_head_ft: 10, k_friction: 0.001 }).error);
});

test("239 head and system head match at operating point", () => {
  const stat = 30, k = 0.003;
  const r = computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: stat, k_friction: k });
  const sysHead = stat + k * r.operating_gpm * r.operating_gpm;
  assert.ok(close(r.head_ft, sysHead, 0.5), "head=" + r.head_ft + " vs system=" + sysHead);
});

test("239 sample_table contains every published curve point", () => {
  const r = computePumpOperatingPoint(pumpOperatingPointExample.inputs);
  assert.equal(r.sample_table.length, PUMP_CURVES.small_centrifugal_60Hz.points.length);
});

test("239 negative inputs error", () => {
  assert.ok(computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: -10, k_friction: 0 }).error);
  assert.ok(computePumpOperatingPoint({ pump: "small_centrifugal_60Hz", static_head_ft: 10, k_friction: -1 }).error);
});

test("239 PUMP_CURVES exposes both bundled curves with attribution", () => {
  for (const k of ["small_centrifugal_60Hz", "inline_circulator_3spd"]) {
    assert.ok(PUMP_CURVES[k].name);
    assert.ok(PUMP_CURVES[k].attribution);
    assert.ok(PUMP_CURVES[k].points.length > 0);
  }
});

// --- 240 Septic drainfield ---

test("240 example yields finite outputs", () => {
  const r = computeSepticDrainfield(septicDrainfieldExample.inputs);
  assert.ok(r.required_area_ft2 > 0);
  assert.ok(r.trench_feet > 0);
});

test("240 area = flow / rate", () => {
  const r = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  assert.equal(r.required_area_ft2, 1000);
});

test("240 trench_feet = area / width", () => {
  const r = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  assert.ok(close(r.trench_feet, 1000 / 3, 0.001));
});

test("240 zero / negative inputs error", () => {
  assert.ok(computeSepticDrainfield({ design_flow_gpd: 0, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 }).error);
  assert.ok(computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0, trench_width_ft: 3 }).error);
  assert.ok(computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 0 }).error);
});

test("240 lower application rate ⇒ larger area", () => {
  const a = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 1.0, trench_width_ft: 3 });
  const b = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.4, trench_width_ft: 3 });
  assert.ok(b.required_area_ft2 > a.required_area_ft2);
});

// --- 241 Pipe thermal expansion + guided-cantilever loop ---

test("241 example yields finite outputs", () => {
  const r = computePipeExpansionLoop(pipeExpansionLoopExample.inputs);
  assert.ok(Number.isFinite(r.delta_L_in));
  assert.ok(r.loop_leg_in > 0);
});

test("241 dL = alpha × L × 12 × dT (steel 200 ft × 100 °F)", () => {
  const r = computePipeExpansionLoop({ material: "steel", length_ft: 200, delta_T_F: 100, pipe_OD_in: 4.5 });
  const expected = 6.5e-6 * 200 * 12 * 100; // = 1.56 in
  assert.ok(close(r.delta_L_in, expected, 0.001));
});

test("241 PEX expands ~17× more than steel for the same dT", () => {
  const steel = computePipeExpansionLoop({ material: "steel", length_ft: 100, delta_T_F: 50, pipe_OD_in: 1 });
  const pex   = computePipeExpansionLoop({ material: "pex",   length_ft: 100, delta_T_F: 50, pipe_OD_in: 1 });
  const ratio = pex.delta_L_in / steel.delta_L_in;
  assert.ok(ratio > 16 && ratio < 18, "PEX/steel expansion ratio = " + ratio);
});

test("241 negative dT yields negative dL", () => {
  const r = computePipeExpansionLoop({ material: "steel", length_ft: 100, delta_T_F: -50, pipe_OD_in: 4.5 });
  assert.ok(r.delta_L_in < 0);
  // Loop leg uses |dL| so it's still positive
  assert.ok(r.loop_leg_in > 0);
});

test("241 loop_leg_in matches sqrt(3 × E × D × |dL| / S_a)", () => {
  const r = computePipeExpansionLoop({ material: "steel", length_ft: 200, delta_T_F: 100, pipe_OD_in: 4.5 });
  const dL = Math.abs(r.delta_L_in);
  const expected = Math.sqrt(3 * 30e6 * 4.5 * dL / 12500);
  assert.ok(close(r.loop_leg_in, expected, 0.01));
});

test("241 unknown material errors", () => {
  assert.ok(computePipeExpansionLoop({ material: "graphene", length_ft: 100, delta_T_F: 50, pipe_OD_in: 1 }).error);
});

test("241 negative length errors; non-finite dT errors", () => {
  assert.ok(computePipeExpansionLoop({ material: "steel", length_ft: -10, delta_T_F: 50, pipe_OD_in: 1 }).error);
  assert.ok(computePipeExpansionLoop({ material: "steel", length_ft: 10, delta_T_F: NaN, pipe_OD_in: 1 }).error);
});

test("241 zero / negative OD errors", () => {
  assert.ok(computePipeExpansionLoop({ material: "steel", length_ft: 100, delta_T_F: 50, pipe_OD_in: 0 }).error);
});

test("241 THERMAL_EXPANSION_COEFFICIENTS includes all expected materials", () => {
  for (const k of ["copper", "pex", "cpvc", "steel", "ductile_iron", "aluminum", "pvc"]) {
    const m = THERMAL_EXPANSION_COEFFICIENTS[k];
    assert.ok(m, "missing material " + k);
    assert.ok(m.alpha_per_F > 0 && m.E_psi > 0 && m.S_a_psi > 0);
  }
});

// --- Renderer registry ---

test("PLUMBING_RENDERERS exposes the 3 v7 ids that stayed", () => {
  for (const id of ["water-hammer-surge", "pump-operating-point", "pipe-expansion-loop"]) {
    assert.equal(typeof PLUMBING_RENDERERS[id], "function", id + " should have a renderer");
  }
});

// spec-v86 cap-relief split: septic-drainfield's renderer now lives in calc-septic.js
test("SEPTIC_RENDERERS exposes septic-drainfield after the spec-v86 split", () => {
  assert.equal(typeof SEPTIC_RENDERERS["septic-drainfield"], "function", "septic-drainfield should have a renderer");
});
