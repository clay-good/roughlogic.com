// Unit tests for calc-plumbing.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePipeSizing,
  computeFrictionLoss,
  computePipeVolume,
  computePumpSize,
  computeStaticPressureLossPiping,
  computeSlope,
  pressureConvert,
  computeBackflow,
  pipeSizingExample,
  frictionLossExample,
  pipeVolumeExample,
  pumpSizingExample,
  staticPressurePipingExample,
  slopeExample,
  pressureConversionExample,
} from "../../calc-plumbing.js";
import { computeGasPipeSizing } from "../../calc-gas.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 12: Pipe Sizing ---

test("Pipe sizing example: WSFU sums correctly", () => {
  const r = computePipeSizing(pipeSizingExample.inputs);
  assert.equal(r.total_wsfu, pipeSizingExample.expected.total_wsfu);
});

test("Pipe sizing: returns recommended supply size", () => {
  const r = computePipeSizing({ fixtures: [{ fixture: "lavatory", count: 1 }] });
  assert.ok(r.recommended_supply_size);
});

test("Pipe sizing: unknown fixture returns error", () => {
  const r = computePipeSizing({ fixtures: [{ fixture: "nope", count: 1 }] });
  assert.ok(r.error);
});

test("Pipe sizing: 0 fixtures -> 0 demand", () => {
  const r = computePipeSizing({ fixtures: [] });
  assert.equal(r.total_wsfu, 0);
  assert.equal(r.estimated_demand_gpm, 0);
});

// --- Utility 13: Friction Loss ---

test("Friction loss example: 1-inch PVC, 100 ft, 10 gpm yields ~ 1 psi", () => {
  const r = computeFrictionLoss(frictionLossExample.inputs);
  assert.ok(r.pressureLoss_psi > frictionLossExample.expectedRange.pressureLoss_psi.min);
  assert.ok(r.pressureLoss_psi < frictionLossExample.expectedRange.pressureLoss_psi.max);
});

test("Friction loss: Darcy-Weisbach returns positive value", () => {
  const r = computeFrictionLoss({ method: "darcy-weisbach", material: "PVC", nominal_size: "1", length_ft: 100, flow_gpm: 10 });
  assert.ok(r.pressureLoss_psi > 0);
});

test("Friction loss: zero flow -> zero loss", () => {
  const r = computeFrictionLoss({ method: "hazen-williams", material: "PVC", nominal_size: "1", length_ft: 100, flow_gpm: 0 });
  assert.equal(r.headLoss_ft, 0);
});

// --- Utility 14: Pipe Volume ---

test("Pipe volume: 1-inch x 100 ft approx 4.5 gal", () => {
  const r = computePipeVolume(pipeVolumeExample.inputs);
  assert.ok(r.gallons > pipeVolumeExample.expectedRange.gallons.min);
  assert.ok(r.gallons < pipeVolumeExample.expectedRange.gallons.max);
});

test("Pipe volume: scales linearly with length", () => {
  const a = computePipeVolume({ nominal_size: "1", length_ft: 50 });
  const b = computePipeVolume({ nominal_size: "1", length_ft: 100 });
  assert.ok(close(b.gallons, 2 * a.gallons, 1e-6));
});

// --- Utility 15: Pump Sizing ---

test("Pump sizing example: 100 gpm, 80 ft TDH, 0.65 eff -> shaft hp in range", () => {
  const r = computePumpSize(pumpSizingExample.inputs);
  assert.ok(r.shaft_hp > pumpSizingExample.expectedRange.shaft_hp.min);
  assert.ok(r.shaft_hp < pumpSizingExample.expectedRange.shaft_hp.max);
});

test("Pump sizing: hydraulic hp = (Q*H)/3960 for SG=1", () => {
  const r = computePumpSize({ flow_gpm: 50, total_dynamic_head_ft: 100, efficiency: 0.7 });
  assert.ok(close(r.hydraulic_hp, (50 * 100) / 3960, 1e-6));
});

// --- Utility 16: Static Pressure Loss in Piping ---

test("Static pressure: 30 ft elevation + 5 psi friction = ~ 18 psi", () => {
  const r = computeStaticPressureLossPiping(staticPressurePipingExample.inputs);
  assert.ok(close(r.total_psi, staticPressurePipingExample.expected.total_psi_approx, 0.5));
});

test("Static pressure: 0 elevation -> total equals friction", () => {
  const r = computeStaticPressureLossPiping({ elevation_change_ft: 0, friction_loss_psi: 7 });
  assert.equal(r.total_psi, 7);
});

// --- Utility 17: Gas Pipe Sizing ---

test("Gas pipe sizing: 100k BTU natural gas at 50 ft selects a size", () => {
  const r = computeGasPipeSizing({ btu_load: 100000, length_ft: 50, gas: "natural_gas" });
  assert.ok(!r.error);
  assert.ok(r.required_cfh > 0);
});

test("Gas pipe sizing: unknown gas returns error", () => {
  const r = computeGasPipeSizing({ btu_load: 100000, length_ft: 50, gas: "unicorn" });
  assert.ok(r.error);
});

// --- Utility 18: Slope ---

test("Slope example: 1 in over 4 in -> 3 in/ft", () => {
  const r = computeSlope(slopeExample.inputs);
  assert.equal(r.in_per_ft, slopeExample.expected.in_per_ft);
});

test("Slope: 1/4 in per ft -> 2.08 percent", () => {
  const r = computeSlope({ rise: 0.25, run: 1, units: "in_per_ft" });
  assert.ok(close(r.percent, (0.25 / 12) * 100, 0.01));
});

test("Slope: 0 run returns error", () => {
  const r = computeSlope({ rise: 1, run: 0, units: "rise_run" });
  assert.ok(r.error);
});

// --- Utility 19: Pressure Conversion ---

test("Pressure: 1 atm -> 14.696 psi", () => {
  const r = pressureConvert(pressureConversionExample.inputs);
  assert.ok(close(r.value, 14.696, 0.01));
});

test("Pressure: 1 psi -> 27.7 in w.c. approx", () => {
  const r = pressureConvert({ value: 1, from: "psi", to: "in_h2o" });
  assert.ok(close(r.value, 27.7, 0.5));
});

test("Pressure: round trip", () => {
  const a = pressureConvert({ value: 100, from: "psi", to: "kPa" });
  const b = pressureConvert({ value: a.value, from: "kPa", to: "psi" });
  assert.ok(close(b.value, 100, 1e-6));
});

test("Pressure: unknown unit returns error", () => {
  const r = pressureConvert({ value: 1, from: "blarg", to: "psi" });
  assert.ok(r.error);
});

// --- Utility 20: Backflow Reference ---

test("Backflow: returns reference array of scenarios", () => {
  const r = computeBackflow();
  assert.ok(Array.isArray(r.reference));
  assert.ok(r.reference.length >= 5);
});

// Data-table invariants for the Schedule-40 pipe inside-diameter lookup, which
// feeds pipe sizing / volume / friction / gas capacity. The table is duplicated
// in calc-gas.js and calc-plumbing.js; both must (1) agree with each other and
// (2) have inside diameters that strictly increase with nominal size. A silent
// transcription error in either -- or a divergence between the two -- would
// missize a pipe or a gas line, a class the per-tile fixtures do not cover.
test("SCH40 pipe ID table: gas, plumbing, and pipefit copies agree and are strictly monotone in nominal size", async () => {
  const gas = await import("../../calc-gas.js");
  const plumb = await import("../../calc-plumbing.js");
  const pipefit = await import("../../calc-pipefit.js");
  const G = gas.SCH40_ID_IN, P = plumb.SCH40_ID_IN;
  const gKeys = Object.keys(G).sort((a, b) => Number(a) - Number(b));
  const pKeys = Object.keys(P).sort((a, b) => Number(a) - Number(b));
  assert.deepEqual(gKeys, pKeys, "gas and plumbing SCH40_ID_IN cover different nominal sizes");
  for (const k of gKeys) {
    assert.equal(G[k], P[k], `SCH40_ID_IN diverges at nominal ${k} in: gas ${G[k]} vs plumbing ${P[k]}`);
    assert.ok(G[k] > 0 && G[k] < Number(k) + 1, `SCH40 ID at nominal ${k} in is out of range: ${G[k]}`);
  }
  for (let i = 1; i < gKeys.length; i++) {
    assert.ok(G[gKeys[i]] > G[gKeys[i - 1]],
      `SCH40 inside diameter not strictly increasing: nominal ${gKeys[i]} in (${G[gKeys[i]]}) <= ${gKeys[i - 1]} in (${G[gKeys[i - 1]]})`);
  }
  // Third copy in calc-pipefit.js (array form, fractional size keys) must agree
  // on every overlapping size -- it is the same ASME B36.10M data and the most
  // likely of the three to drift (private, different format, extra sizes).
  const F = new Map(pipefit._SCH40_ID_IN); // "1/2" -> 0.622, ...
  const decimalToFraction = { "0.5": "1/2", "0.75": "3/4", "1": "1", "1.25": "1-1/4", "1.5": "1-1/2", "2": "2", "2.5": "2-1/2", "3": "3", "4": "4" };
  for (const k of gKeys) {
    const frac = decimalToFraction[k];
    assert.ok(frac && F.has(frac), `pipefit SCH40 table is missing nominal ${k} in (${frac})`);
    assert.equal(F.get(frac), G[k], `SCH40 diverges at nominal ${k} in: pipefit ${F.get(frac)} vs gas/plumbing ${G[k]}`);
  }
});
