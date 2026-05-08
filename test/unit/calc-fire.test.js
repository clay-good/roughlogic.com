// Unit tests for calc-fire.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFireFriction,
  computePDP,
  computeHydrantFlow,
  computeRequiredFireFlow,
  computeMasterStreamReach,
  computeAerialLadderReach,
  computeFoam,
  computeSmokeReading,
  fireFrictionExample,
  pdpExample,
  hydrantFlowExample,
  requiredFireFlowExample,
  masterStreamExample,
  aerialLadderExample,
  foamExample,
} from "../../calc-fire.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 51: Fire Friction ---

test("Fire friction example: 2.5-in, 250 gpm, 200 ft -> 25 psi", () => {
  const r = computeFireFriction(fireFrictionExample.inputs);
  assert.ok(close(r.friction_loss_psi, fireFrictionExample.expected.friction_loss_psi, 1e-9));
});

test("Fire friction: scales with length", () => {
  const a = computeFireFriction({ hose_diameter: "1.75_in", gpm: 150, length_ft: 100 });
  const b = computeFireFriction({ hose_diameter: "1.75_in", gpm: 150, length_ft: 200 });
  assert.ok(close(b.friction_loss_psi, 2 * a.friction_loss_psi, 1e-6));
});

test("Fire friction: unknown hose returns error", () => {
  const r = computeFireFriction({ hose_diameter: "9_in", gpm: 100, length_ft: 100 });
  assert.ok(r.error);
});

// --- Utility 52: PDP ---

test("PDP example: 100 + 25 + 10 + 0 = 135", () => {
  const r = computePDP(pdpExample.inputs);
  assert.equal(r.pdp_psi, pdpExample.expected.pdp_psi);
});

test("PDP: elevation contributes 0.5 psi/ft", () => {
  const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 0, elevation_ft: 30, appliance_loss_psi: 0 });
  assert.equal(r.elevation_psi, 15);
  assert.equal(r.pdp_psi, 115);
});

// --- Utility 53: Hydrant flow ---

test("Hydrant flow example: 2.5 in outlet, 10 psi, c=0.9", () => {
  const r = computeHydrantFlow(hydrantFlowExample.inputs);
  assert.ok(r.flow_gpm > hydrantFlowExample.expectedRange.flow_gpm.min);
  assert.ok(r.flow_gpm < hydrantFlowExample.expectedRange.flow_gpm.max);
});

test("Hydrant flow: zero pressure -> zero flow", () => {
  const r = computeHydrantFlow({ pitot_psi: 0, outlet_diameter_in: 2.5, c: 0.9 });
  assert.equal(r.flow_gpm, 0);
});

// --- Utility 54: Required Fire Flow ---

test("Required fire flow: 5000 ft^2 ordinary returns positive nff rounded to 250", () => {
  const r = computeRequiredFireFlow(requiredFireFlowExample.inputs);
  assert.ok(r.needed_fire_flow_gpm > 0);
  assert.equal(r.needed_fire_flow_gpm % 250, 0);
});

test("Required fire flow: wood frame > masonry for same area", () => {
  const a = computeRequiredFireFlow({ structure_area_ft2: 5000, construction_class: "masonry" });
  const b = computeRequiredFireFlow({ structure_area_ft2: 5000, construction_class: "wood_frame" });
  assert.ok(b.needed_fire_flow_gpm > a.needed_fire_flow_gpm);
});

test("Required fire flow: capped at 12000 gpm", () => {
  const r = computeRequiredFireFlow({ structure_area_ft2: 1e8, construction_class: "wood_frame" });
  assert.ok(r.needed_fire_flow_gpm <= 12000);
});

// --- Utility 55: Master Stream ---

test("Master stream example: smooth_bore_2 at 80 psi -> 100 ft", () => {
  const r = computeMasterStreamReach(masterStreamExample.inputs);
  assert.ok(close(r.typical_reach_ft, masterStreamExample.expected.typical_reach_ft, 0.001));
});

test("Master stream: higher pressure -> longer reach", () => {
  const a = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 60 });
  const b = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 100 });
  assert.ok(b.typical_reach_ft > a.typical_reach_ft);
});

// --- Utility 56: Aerial Ladder ---

test("Aerial ladder: 70 deg, 100 ft -> H ~ 34, V ~ 94", () => {
  const r = computeAerialLadderReach(aerialLadderExample.inputs);
  assert.ok(close(r.horizontal_reach_ft, 100 * Math.cos(70 * Math.PI / 180), 1e-9));
  assert.ok(close(r.vertical_reach_ft, 100 * Math.sin(70 * Math.PI / 180), 1e-9));
});

test("Aerial ladder: 0 degrees -> all horizontal", () => {
  const r = computeAerialLadderReach({ angle_deg: 0, extension_ft: 100 });
  assert.ok(close(r.horizontal_reach_ft, 100, 1e-9));
  assert.ok(close(r.vertical_reach_ft, 0, 1e-9));
});

// --- Utility 57: Foam ---

test("Foam example: 1500 ft^2 at 0.10 gpm/ft^2, 3 percent, 15 min", () => {
  const r = computeFoam(foamExample.inputs);
  // Solution gpm = 1500 * 0.1 = 150. Concentrate gpm = 150 * 0.03 = 4.5. Total = 67.5 gal.
  assert.ok(close(r.total_solution_gpm, 150, 1e-9));
  assert.ok(close(r.concentrate_gpm, 4.5, 1e-9));
  assert.ok(close(r.total_concentrate_gallons, 67.5, 1e-9));
});

test("Foam: longer duration -> more concentrate", () => {
  const a = computeFoam({ fire_area_ft2: 1000, duration_min: 10 });
  const b = computeFoam({ fire_area_ft2: 1000, duration_min: 20 });
  assert.ok(b.total_concentrate_gallons > a.total_concentrate_gallons);
});

// --- Utility 58: Smoke Reading ---

test("Smoke reading reference: returns 4 attributes", () => {
  const r = computeSmokeReading();
  assert.equal(r.reference.length, 4);
});
