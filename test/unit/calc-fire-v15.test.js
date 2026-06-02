// spec-v15 unit tests for the Group F (Fire-Ground Engineering) tiles landed
// in the v15 close:
//   F.2 Standpipe pump discharge pressure (NFPA 14)
//   F.5 Smoke ejector / negative-pressure ventilation CFM (NFPA 1500 / IFSTA)
//
// Both are public fireground formulas. The assertions pin the NFPA 14 PDP
// breakdown (nozzle + supply friction + appliance + 0.434 psi/ft elevation)
// and the air-change CFM math so a future edit fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStandpipePDP, standpipePDPExample,
  computeSmokeEjector, smokeEjectorExample,
} from "../../calc-fire.js";

// ---------------------------------------------------------------------------
// F.2 Standpipe pump discharge pressure
// ---------------------------------------------------------------------------

test("standpipe-pdp: worked example (250 GPM, 110 ft, 25 psi appliance, 200 ft of 3 in) ~ 181 psi", () => {
  const r = computeStandpipePDP(standpipePDPExample.inputs);
  assert.ok(Math.abs(r.pdp_psi - 181.2) < 1);
  assert.ok(Math.abs(r.elevation_loss_psi - 47.74) < 0.01);
});

test("standpipe-pdp: PDP is the sum of nozzle, supply friction, appliance, and elevation", () => {
  const r = computeStandpipePDP(standpipePDPExample.inputs);
  const sum = r.nozzle_pressure_psi + r.supply_friction_psi + r.appliance_loss_psi + r.elevation_loss_psi;
  assert.ok(Math.abs(r.pdp_psi - sum) < 1e-9);
});

test("standpipe-pdp: elevation loss is 0.434 psi per foot of height", () => {
  const r = computeStandpipePDP({ highest_outlet_elevation_ft: 100, nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: 0, supply_hose_length_ft: 0, supply_hose_diameter: "3_in" });
  assert.ok(Math.abs(r.elevation_loss_psi - 43.4) < 1e-9);
});

test("standpipe-pdp: a below-pumper (negative) elevation subtracts from PDP", () => {
  const r = computeStandpipePDP({ highest_outlet_elevation_ft: -20, nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: 25, supply_hose_length_ft: 0, supply_hose_diameter: "3_in" });
  assert.ok(r.elevation_loss_psi < 0);
  assert.ok(r.pdp_psi < 125); // 100 + 0 + 25 - 8.68
});

test("standpipe-pdp: supply friction follows the NFA CQ^2L formula for 3 in hose", () => {
  // C(3 in) = 0.677; FL = 0.677 * (250/100)^2 * (200/100) = 8.4625 psi.
  const r = computeStandpipePDP({ highest_outlet_elevation_ft: 0, nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: 0, supply_hose_length_ft: 200, supply_hose_diameter: "3_in" });
  assert.ok(Math.abs(r.supply_friction_psi - 0.677 * Math.pow(250 / 100, 2) * (200 / 100)) < 1e-9);
});

test("standpipe-pdp: a larger supply diameter cuts the supply friction", () => {
  const three = computeStandpipePDP({ highest_outlet_elevation_ft: 0, nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: 0, supply_hose_length_ft: 200, supply_hose_diameter: "3_in" });
  const five = computeStandpipePDP({ highest_outlet_elevation_ft: 0, nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: 0, supply_hose_length_ft: 200, supply_hose_diameter: "5_in" });
  assert.ok(five.supply_friction_psi < three.supply_friction_psi);
});

test("standpipe-pdp: a building over 75 ft is flagged as a high-rise", () => {
  const hr = computeStandpipePDP({ ...standpipePDPExample.inputs, building_height_ft: 120 });
  assert.ok(hr.warnings.some((w) => /high-rise/i.test(w)));
  const low = computeStandpipePDP({ ...standpipePDPExample.inputs, building_height_ft: 40, highest_outlet_elevation_ft: 30 });
  assert.ok(!low.warnings.some((w) => /high-rise/i.test(w)));
});

test("standpipe-pdp: lift above 600 ft is flagged as outside single-pumper capability", () => {
  const r = computeStandpipePDP({ highest_outlet_elevation_ft: 700, nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: 25, supply_hose_length_ft: 100, supply_hose_diameter: "5_in", building_height_ft: 750 });
  assert.ok(r.warnings.some((w) => /600 ft/.test(w)));
});

test("standpipe-pdp: a very high PDP is flagged against apparatus pump / hose ratings", () => {
  const r = computeStandpipePDP({ highest_outlet_elevation_ft: 500, nozzle_pressure_psi: 100, design_gpm: 500, appliance_loss_psi: 25, supply_hose_length_ft: 400, supply_hose_diameter: "3_in", building_height_ft: 520 });
  assert.ok(r.pdp_psi > 350);
  assert.ok(r.warnings.some((w) => /350 psi/.test(w)));
});

test("standpipe-pdp: invalid inputs are rejected", () => {
  assert.ok("error" in computeStandpipePDP({ nozzle_pressure_psi: 0, design_gpm: 250 }));
  assert.ok("error" in computeStandpipePDP({ nozzle_pressure_psi: 100, design_gpm: 0 }));
  assert.ok("error" in computeStandpipePDP({ nozzle_pressure_psi: 100, design_gpm: 250, appliance_loss_psi: -5 }));
  assert.ok("error" in computeStandpipePDP({ nozzle_pressure_psi: 100, design_gpm: 250, supply_hose_diameter: "7_in" }));
});

// ---------------------------------------------------------------------------
// F.5 Smoke ejector / negative-pressure ventilation CFM
// ---------------------------------------------------------------------------

test("smoke-ejector: worked example (12,000 ft^3, 5 ACH, 4000 CFM fan) -> 1000 CFM, 1 fan, 3 min", () => {
  const r = computeSmokeEjector(smokeEjectorExample.inputs);
  assert.strictEqual(r.volume_ft3, 12000);
  assert.strictEqual(r.cfm_required, 1000);
  assert.strictEqual(r.fans, 1);
  assert.ok(Math.abs(r.time_to_one_change_min - 3) < 1e-9);
});

test("smoke-ejector: required CFM = volume * ACH / 60", () => {
  const r = computeSmokeEjector({ room_volume_ft3: 6000, target_ach: 6, fan_cfm: 2000, exhaust_opening_ft2: 8, entry_opening_ft2: 8 });
  assert.strictEqual(r.cfm_required, 600); // 6000 * 6 / 60
});

test("smoke-ejector: a direct room volume overrides length x width x height", () => {
  const r = computeSmokeEjector({ length_ft: 10, width_ft: 10, height_ft: 10, room_volume_ft3: 5000, target_ach: 5, fan_cfm: 2000, exhaust_opening_ft2: 8, entry_opening_ft2: 8 });
  assert.strictEqual(r.volume_ft3, 5000);
});

test("smoke-ejector: fan count rounds up to cover the required CFM", () => {
  const r = computeSmokeEjector({ room_volume_ft3: 60000, target_ach: 6, fan_cfm: 4000, exhaust_opening_ft2: 12, entry_opening_ft2: 10 });
  // required = 6000 CFM; 6000 / 4000 = 1.5 -> 2 fans.
  assert.strictEqual(r.fans, 2);
  assert.strictEqual(r.cfm_actual, 8000);
});

test("smoke-ejector: time to one air change = volume / actual CFM", () => {
  const r = computeSmokeEjector({ room_volume_ft3: 12000, target_ach: 5, fan_cfm: 4000, exhaust_opening_ft2: 12, entry_opening_ft2: 10 });
  assert.ok(Math.abs(r.time_to_one_change_min - 12000 / r.cfm_actual) < 1e-9);
});

test("smoke-ejector: the exhaust-to-entry opening ratio is exhaust / entry", () => {
  const r = computeSmokeEjector({ room_volume_ft3: 12000, target_ach: 5, fan_cfm: 4000, exhaust_opening_ft2: 15, entry_opening_ft2: 10 });
  assert.ok(Math.abs(r.opening_ratio - 1.5) < 1e-9);
});

test("smoke-ejector: an opening ratio outside 0.5-2.0 is flagged as inefficient PPV", () => {
  const bad = computeSmokeEjector({ room_volume_ft3: 12000, target_ach: 5, fan_cfm: 4000, exhaust_opening_ft2: 30, entry_opening_ft2: 10 });
  assert.ok(bad.warnings.some((w) => /inefficient/i.test(w)));
  const big = computeSmokeEjector({ room_volume_ft3: 200000, target_ach: 5, fan_cfm: 4000, exhaust_opening_ft2: 12, entry_opening_ft2: 10 });
  assert.ok(big.warnings.some((w) => /commercial/i.test(w)));
});

test("smoke-ejector: invalid inputs are rejected", () => {
  assert.ok("error" in computeSmokeEjector({ length_ft: 0, width_ft: 0, height_ft: 0, target_ach: 5, fan_cfm: 4000 }));
  assert.ok("error" in computeSmokeEjector({ room_volume_ft3: 12000, target_ach: 0, fan_cfm: 4000 }));
  assert.ok("error" in computeSmokeEjector({ room_volume_ft3: 12000, target_ach: 5, fan_cfm: 0 }));
});
