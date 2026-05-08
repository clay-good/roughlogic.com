// Unit tests for calc-plumbing.js v3 utilities (132-138).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStormwaterRational,
  computeManningSlope,
  computeHydrostaticTest,
  computeGreaseTrap,
  computeGlycolMix,
  computeExpansionTank,
  computeBackflowLoss,
  RUNOFF_COEFFICIENTS,
  MANNING_ROUGHNESS,
  GLYCOL_FREEZE_CURVES,
  BACKFLOW_CURVES,
  stormwaterRationalExample,
  manningSlopeExample,
  hydrostaticTestExample,
  greaseTrapExample,
  glycolMixExample,
  expansionTankExample,
  backflowLossExample,
} from "../../calc-plumbing.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- 132 Stormwater Rational ---

test("Stormwater: example yields positive cfs/gpm", () => {
  const r = computeStormwaterRational(stormwaterRationalExample.inputs);
  assert.ok(r.peak_flow_cfs > 0); assert.ok(r.peak_flow_gpm > 0);
});

test("Stormwater: asphalt > lawn at same area/intensity", () => {
  const a = computeStormwaterRational({ area_ft2: 1000, surface: "asphalt", rainfall_in_per_hr: 1 });
  const b = computeStormwaterRational({ area_ft2: 1000, surface: "lawn", rainfall_in_per_hr: 1 });
  assert.ok(a.peak_flow_cfs > b.peak_flow_cfs);
});

test("Stormwater: 1 acre asphalt at 1 in/hr ~ 0.95 cfs", () => {
  const r = computeStormwaterRational({ area_ft2: 43560, surface: "asphalt", rainfall_in_per_hr: 1 });
  assert.ok(close(r.peak_flow_cfs, 0.95, 0.01));
});

test("Stormwater: zero rainfall yields zero flow", () => {
  const r = computeStormwaterRational({ area_ft2: 1000, surface: "asphalt", rainfall_in_per_hr: 0 });
  assert.equal(r.peak_flow_cfs, 0);
});

test("Stormwater: zero area returns error", () => {
  const r = computeStormwaterRational({ area_ft2: 0, surface: "asphalt", rainfall_in_per_hr: 2 });
  assert.ok(r.error);
});

test("Stormwater: negative rainfall returns error", () => {
  const r = computeStormwaterRational({ area_ft2: 1000, surface: "asphalt", rainfall_in_per_hr: -1 });
  assert.ok(r.error);
});

test("Stormwater: unknown surface returns error", () => {
  const r = computeStormwaterRational({ area_ft2: 1000, surface: "spam", rainfall_in_per_hr: 1 });
  assert.ok(r.error);
});

test("Stormwater: gpm = cfs * 448.831", () => {
  const r = computeStormwaterRational({ area_ft2: 5000, surface: "gravel", rainfall_in_per_hr: 1.5 });
  assert.ok(close(r.peak_flow_gpm / r.peak_flow_cfs, 448.831, 0.5));
});

test("Stormwater: every coefficient is between 0 and 1", () => {
  for (const [k, v] of Object.entries(RUNOFF_COEFFICIENTS)) {
    assert.ok(v > 0 && v <= 1, k);
  }
});

test("Stormwater: result includes acres", () => {
  const r = computeStormwaterRational({ area_ft2: 43560, surface: "asphalt", rainfall_in_per_hr: 1 });
  assert.ok(close(r.area_acres, 1, 0.001));
});

// --- 133 Manning slope ---

test("Manning: example produces positive slope", () => {
  const r = computeManningSlope(manningSlopeExample.inputs);
  assert.ok(r.slope_self_cleansing > 0);
  assert.ok(r.slope_for_flow > 0);
});

test("Manning: rougher pipe needs steeper slope at same V", () => {
  const a = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 0, material: "pvc" });
  const b = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 0, material: "concrete" });
  assert.ok(b.slope_self_cleansing > a.slope_self_cleansing);
});

test("Manning: bigger diameter needs less slope at same V", () => {
  const a = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 0, material: "pvc" });
  const b = computeManningSlope({ pipe_diameter_in: 12, target_flow_gpm: 0, material: "pvc" });
  assert.ok(b.slope_self_cleansing < a.slope_self_cleansing);
});

test("Manning: zero diameter returns error", () => {
  const r = computeManningSlope({ pipe_diameter_in: 0, target_flow_gpm: 10, material: "pvc" });
  assert.ok(r.error);
});

test("Manning: negative target flow returns error", () => {
  const r = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: -1, material: "pvc" });
  assert.ok(r.error);
});

test("Manning: unknown material returns error", () => {
  const r = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 10, material: "spam" });
  assert.ok(r.error);
});

test("Manning: slope_for_flow null when target zero", () => {
  const r = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 0, material: "pvc" });
  assert.equal(r.slope_for_flow, null);
});

test("Manning: in/ft conversion is slope*12", () => {
  const r = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 0, material: "pvc" });
  assert.ok(close(r.slope_self_cleansing_in_per_ft, r.slope_self_cleansing * 12, 1e-6));
});

test("Manning: every n positive", () => {
  for (const [k, v] of Object.entries(MANNING_ROUGHNESS)) assert.ok(v > 0, k);
});

test("Manning: hydraulic radius = D/4 (half-full)", () => {
  const r = computeManningSlope({ pipe_diameter_in: 12, target_flow_gpm: 0, material: "pvc" });
  assert.ok(close(r.R_ft, 0.25, 1e-6));
});

// --- 134 Hydrostatic test ---

test("Hydrostatic: water default 1.5x", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 100, material: "water" });
  assert.equal(r.multiplier, 1.5);
  assert.equal(r.test_pressure_psi, 120);
});

test("Hydrostatic: gas default 1.25x", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 100, material: "fuel_gas" });
  assert.equal(r.multiplier, 1.25);
});

test("Hydrostatic: explicit multiplier overrides default", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 100, system_volume_gal: 100, material: "water", multiplier: 2 });
  assert.equal(r.multiplier, 2);
  assert.equal(r.test_pressure_psi, 200);
});

test("Hydrostatic: zero working pressure returns error", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 0, system_volume_gal: 100, material: "water" });
  assert.ok(r.error);
});

test("Hydrostatic: negative volume returns error", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: -1, material: "water" });
  assert.ok(r.error);
});

test("Hydrostatic: hold time scales with volume", () => {
  const a = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 10, material: "water" });
  const b = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 1000, material: "water" });
  assert.ok(b.hold_minutes > a.hold_minutes);
});

test("Hydrostatic: small system 15-min hold", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 20, material: "water" });
  assert.equal(r.hold_minutes, 15);
});

test("Hydrostatic: very large system 240 min", () => {
  const r = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 10000, material: "water" });
  assert.equal(r.hold_minutes, 240);
});

test("Hydrostatic: gas note differs from water note", () => {
  const w = computeHydrostaticTest({ working_pressure_psi: 5, system_volume_gal: 50, material: "fuel_gas" });
  const x = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 50, material: "water" });
  assert.notEqual(w.acceptable_leak_note, x.acceptable_leak_note);
});

test("Hydrostatic: scales linearly with working pressure", () => {
  const a = computeHydrostaticTest({ working_pressure_psi: 50, system_volume_gal: 100, material: "water" });
  const b = computeHydrostaticTest({ working_pressure_psi: 100, system_volume_gal: 100, material: "water" });
  assert.ok(close(b.test_pressure_psi / a.test_pressure_psi, 2));
});

// --- 135 Grease trap ---

test("Grease trap: example yields volume ~ 938 gal recommended 1000", () => {
  const r = computeGreaseTrap(greaseTrapExample.inputs);
  assert.ok(close(r.volume_gal, 25 * 30 * 1.25));
  assert.ok(r.recommended_nominal_gal >= r.volume_gal);
});

test("Grease trap: zero flow returns error", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 0, retention_minutes: 30, loading_factor: 1.25 });
  assert.ok(r.error);
});

test("Grease trap: zero retention returns error", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes: 0, loading_factor: 1.25 });
  assert.ok(r.error);
});

test("Grease trap: zero loading factor returns error", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes: 30, loading_factor: 0 });
  assert.ok(r.error);
});

test("Grease trap: small flow picks small standard size", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 1, retention_minutes: 30, loading_factor: 1 });
  assert.ok(r.recommended_nominal_gal <= 50);
});

test("Grease trap: very large flow caps at 3000 gal", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: 1000, retention_minutes: 30, loading_factor: 1.25 });
  assert.equal(r.recommended_nominal_gal, 3000);
});

test("Grease trap: volume scales with retention", () => {
  const a = computeGreaseTrap({ peak_flow_gpm: 10, retention_minutes: 15, loading_factor: 1 });
  const b = computeGreaseTrap({ peak_flow_gpm: 10, retention_minutes: 30, loading_factor: 1 });
  assert.ok(close(b.volume_gal / a.volume_gal, 2));
});

test("Grease trap: volume scales with loading factor", () => {
  const a = computeGreaseTrap({ peak_flow_gpm: 10, retention_minutes: 30, loading_factor: 1 });
  const b = computeGreaseTrap({ peak_flow_gpm: 10, retention_minutes: 30, loading_factor: 1.5 });
  assert.ok(close(b.volume_gal / a.volume_gal, 1.5));
});

test("Grease trap: recommended >= volume", () => {
  for (const flow of [1, 2, 5, 8, 12, 25, 40]) {
    const r = computeGreaseTrap({ peak_flow_gpm: flow, retention_minutes: 30, loading_factor: 1.25 });
    assert.ok(r.recommended_nominal_gal >= r.volume_gal, "flow=" + flow);
  }
});

test("Grease trap: negative flow returns error", () => {
  const r = computeGreaseTrap({ peak_flow_gpm: -1, retention_minutes: 30, loading_factor: 1.25 });
  assert.ok(r.error);
});

// --- 136 Glycol mix ---

test("Glycol: example yields valid percent (propylene 0F)", () => {
  const r = computeGlycolMix(glycolMixExample.inputs);
  assert.ok(r.glycol_percent > 30 && r.glycol_percent < 50);
  assert.ok(r.concentrate_gal > 0);
});

test("Glycol: ethylene needs less than propylene at same target", () => {
  const a = computeGlycolMix({ system_volume_gal: 100, target_burst_F: -10, glycol_type: "propylene" });
  const b = computeGlycolMix({ system_volume_gal: 100, target_burst_F: -10, glycol_type: "ethylene" });
  assert.ok(b.glycol_percent <= a.glycol_percent);
});

test("Glycol: zero volume returns error", () => {
  const r = computeGlycolMix({ system_volume_gal: 0, target_burst_F: 0, glycol_type: "propylene" });
  assert.ok(r.error);
});

test("Glycol: unknown type returns error", () => {
  const r = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "spam" });
  assert.ok(r.error);
});

test("Glycol: target below curve range returns error", () => {
  const r = computeGlycolMix({ system_volume_gal: 100, target_burst_F: -100, glycol_type: "propylene" });
  assert.ok(r.error);
});

test("Glycol: target 32 F needs zero (or near) percent", () => {
  const r = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 32, glycol_type: "propylene" });
  assert.ok(r.glycol_percent < 5);
});

test("Glycol: concentrate scales linearly with system volume", () => {
  const a = computeGlycolMix({ system_volume_gal: 50, target_burst_F: 0, glycol_type: "propylene" });
  const b = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" });
  assert.ok(close(b.concentrate_gal / a.concentrate_gal, 2, 0.01));
});

test("Glycol: attribution mentions Dow", () => {
  const r = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" });
  assert.match(r.attribution, /Dow/);
});

test("Glycol: every curve is monotonic decreasing freeze_F", () => {
  for (const [k, curve] of Object.entries(GLYCOL_FREEZE_CURVES)) {
    for (let i = 1; i < curve.length; i++) assert.ok(curve[i].freeze_F <= curve[i - 1].freeze_F, k + " at " + i);
  }
});

test("Glycol: percent grows with colder target", () => {
  const a = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 20, glycol_type: "propylene" });
  const b = computeGlycolMix({ system_volume_gal: 100, target_burst_F: -20, glycol_type: "propylene" });
  assert.ok(b.glycol_percent > a.glycol_percent);
});

// --- 137 Expansion tank (worked example: ASHRAE textbook problem) ---

test("Expansion tank: example yields positive volume", () => {
  const r = computeExpansionTank(expansionTankExample.inputs);
  assert.ok(r.tank_volume_gal > 0);
});

test("Expansion tank: 100 gal sys 60-200F 12-30 psi ~ 8-10 gal", () => {
  // Worked example: published ASHRAE / hydronic-engineering reference yields ~8-9 gal.
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(r.tank_volume_gal > 5 && r.tank_volume_gal < 15);
});

test("Expansion tank: zero volume returns error", () => {
  const r = computeExpansionTank({ system_volume_gal: 0, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(r.error);
});

test("Expansion tank: max temp <= fill temp returns error", () => {
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 200, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(r.error);
});

test("Expansion tank: relief <= fill returns error", () => {
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 30, relief_pressure_psi: 30 });
  assert.ok(r.error);
});

test("Expansion tank: bigger system -> bigger tank", () => {
  const a = computeExpansionTank({ system_volume_gal: 50, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  const b = computeExpansionTank({ system_volume_gal: 200, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(b.tank_volume_gal > a.tank_volume_gal);
});

test("Expansion tank: hotter max temp -> bigger tank", () => {
  const a = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 140, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  const b = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 220, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(b.tank_volume_gal > a.tank_volume_gal);
});

test("Expansion tank: returns absolute pressures", () => {
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(close(r.P_initial_abs, 26.7, 0.1));
  assert.ok(close(r.P_final_abs, 44.7, 0.1));
});

test("Expansion tank: returns water densities", () => {
  const r = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(r.rho_cold > r.rho_hot);
});

test("Expansion tank: scales linearly with system volume", () => {
  const a = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  const b = computeExpansionTank({ system_volume_gal: 300, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(close(b.tank_volume_gal / a.tank_volume_gal, 3, 0.001));
});

// --- 138 Backflow loss ---

test("Backflow: example RP 1\" 30 gpm yields psi loss", () => {
  const r = computeBackflowLoss(backflowLossExample.inputs);
  assert.ok(r.pressure_loss_psi > 0);
});

test("Backflow: RP loss > DCV loss at same flow / size", () => {
  const a = computeBackflowLoss({ device_class: "RP", flow_gpm: 40, pipe_size_in: "1" });
  const b = computeBackflowLoss({ device_class: "DCV", flow_gpm: 40, pipe_size_in: "1" });
  assert.ok(a.pressure_loss_psi > b.pressure_loss_psi);
});

test("Backflow: unknown device returns error", () => {
  const r = computeBackflowLoss({ device_class: "spam", flow_gpm: 30, pipe_size_in: "1" });
  assert.ok(r.error);
});

test("Backflow: unknown size returns error", () => {
  const r = computeBackflowLoss({ device_class: "RP", flow_gpm: 30, pipe_size_in: "5" });
  assert.ok(r.error);
});

test("Backflow: AVB has only some sizes", () => {
  const r = computeBackflowLoss({ device_class: "AVB", flow_gpm: 30, pipe_size_in: "2" });
  assert.ok(r.error);
});

test("Backflow: loss grows with flow", () => {
  const a = computeBackflowLoss({ device_class: "RP", flow_gpm: 10, pipe_size_in: "1" });
  const b = computeBackflowLoss({ device_class: "RP", flow_gpm: 50, pipe_size_in: "1" });
  assert.ok(b.pressure_loss_psi > a.pressure_loss_psi);
});

test("Backflow: bigger pipe -> less loss at same flow", () => {
  const a = computeBackflowLoss({ device_class: "RP", flow_gpm: 30, pipe_size_in: "0.75" });
  const b = computeBackflowLoss({ device_class: "RP", flow_gpm: 30, pipe_size_in: "1.5" });
  assert.ok(b.pressure_loss_psi < a.pressure_loss_psi);
});

test("Backflow: clamps below first point", () => {
  const r = computeBackflowLoss({ device_class: "RP", flow_gpm: 0, pipe_size_in: "1" });
  assert.equal(r.pressure_loss_psi, 0);
});

test("Backflow: clamps above last point", () => {
  const r = computeBackflowLoss({ device_class: "RP", flow_gpm: 1000, pipe_size_in: "1" });
  assert.equal(r.pressure_loss_psi, 13);
});

test("Backflow: negative flow returns error", () => {
  const r = computeBackflowLoss({ device_class: "RP", flow_gpm: -1, pipe_size_in: "1" });
  assert.ok(r.error);
});

test("Backflow: every device has attribution", () => {
  for (const k of Object.keys(BACKFLOW_CURVES)) assert.ok(BACKFLOW_CURVES[k].attribution.length > 0, k);
});
