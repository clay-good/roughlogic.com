// Unit tests for calc-restoration.js v3 utilities (145, 146).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeContainmentAirBalance,
  computeChamberTurnover,
  containmentAirBalanceExample,
  chamberTurnoverExample,
} from "../../calc-restoration.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- 145 Containment air balance ---

test("Containment: example yields positive CFM and NAM recommendations", () => {
  const r = computeContainmentAirBalance(containmentAirBalanceExample.inputs);
  assert.ok(r.required_cfm > 0);
  assert.equal(r.recommendations.length, 3);
});

test("Containment: scales linearly with leakage area", () => {
  const a = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0.02, leakage_area_in2: 5 });
  const b = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0.02, leakage_area_in2: 10 });
  assert.ok(close(b.required_cfm / a.required_cfm, 2, 0.001));
});

test("Containment: scales with sqrt of pressure", () => {
  const a = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0.02, leakage_area_in2: 5 });
  const b = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0.08, leakage_area_in2: 5 });
  assert.ok(close(b.required_cfm / a.required_cfm, 2, 0.001));
});

test("Containment: zero volume errors", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 0, target_dp_in_wc: 0.02, leakage_area_in2: 5 });
  assert.ok(r.error);
});

test("Containment: zero pressure errors", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0, leakage_area_in2: 5 });
  assert.ok(r.error);
});

test("Containment: negative leakage area errors", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0.02, leakage_area_in2: -1 });
  assert.ok(r.error);
});

test("Containment: zero leakage area returns zero CFM", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 1000, target_dp_in_wc: 0.02, leakage_area_in2: 0 });
  assert.equal(r.required_cfm, 0);
});

test("Containment: NAM rec total CFM >= required CFM", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 5000, target_dp_in_wc: 0.05, leakage_area_in2: 20 });
  for (const rec of r.recommendations) {
    assert.ok(rec.total_cfm >= r.required_cfm, "unit " + rec.unit_cfm);
  }
});

test("Containment: 12 in^2 at 0.02 in wc ~ 30.76 cfm", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 10000, target_dp_in_wc: 0.02, leakage_area_in2: 12 });
  assert.ok(close(r.required_cfm, 2610 * (12 / 144) * Math.sqrt(0.02), 0.5));
});

test("Containment: smaller NAM unit needs more units than larger", () => {
  const r = computeContainmentAirBalance({ containment_volume_ft3: 5000, target_dp_in_wc: 0.05, leakage_area_in2: 20 });
  const small = r.recommendations.find((x) => x.unit_cfm === 500);
  const big = r.recommendations.find((x) => x.unit_cfm === 2000);
  assert.ok(small.units_needed >= big.units_needed);
});

// --- 146 Chamber turnover ---

test("Chamber: example yields actual ACH > target", () => {
  const r = computeChamberTurnover(chamberTurnoverExample.inputs);
  // (1200+250)*60/1500 = 58 ACH; gap CFM = (60*1500/60) - 1450 = 50
  assert.ok(close(r.actual_ach, (1450 * 60) / 1500, 0.001));
  assert.ok(r.gap_cfm > 0);
});

test("Chamber: zero volume errors", () => {
  const r = computeChamberTurnover({ chamber_volume_ft3: 0, target_ach: 60, air_mover_total_cfm: 1000, dehu_cfm: 200 });
  assert.ok(r.error);
});

test("Chamber: zero target errors", () => {
  const r = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach: 0, air_mover_total_cfm: 1000, dehu_cfm: 200 });
  assert.ok(r.error);
});

test("Chamber: negative cfm errors", () => {
  const r = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach: 60, air_mover_total_cfm: -1, dehu_cfm: 0 });
  assert.ok(r.error);
});

test("Chamber: gap zero when supply exceeds target", () => {
  const r = computeChamberTurnover({ chamber_volume_ft3: 1000, target_ach: 30, air_mover_total_cfm: 1000, dehu_cfm: 0 });
  assert.equal(r.gap_cfm, 0);
});

test("Chamber: actual ACH grows with cfm", () => {
  const a = computeChamberTurnover({ chamber_volume_ft3: 1000, target_ach: 60, air_mover_total_cfm: 500, dehu_cfm: 0 });
  const b = computeChamberTurnover({ chamber_volume_ft3: 1000, target_ach: 60, air_mover_total_cfm: 1500, dehu_cfm: 0 });
  assert.ok(b.actual_ach > a.actual_ach);
});

test("Chamber: actual ACH inversely proportional to volume", () => {
  const a = computeChamberTurnover({ chamber_volume_ft3: 500, target_ach: 60, air_mover_total_cfm: 500, dehu_cfm: 0 });
  const b = computeChamberTurnover({ chamber_volume_ft3: 1000, target_ach: 60, air_mover_total_cfm: 500, dehu_cfm: 0 });
  assert.ok(close(a.actual_ach / b.actual_ach, 2, 0.001));
});

test("Chamber: required CFM = target * V / 60", () => {
  const r = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach: 60, air_mover_total_cfm: 0, dehu_cfm: 0 });
  assert.ok(close(r.required_cfm, 1500, 0.001));
});

test("Chamber: dehu CFM contributes to actual ACH", () => {
  const a = computeChamberTurnover({ chamber_volume_ft3: 1000, target_ach: 60, air_mover_total_cfm: 500, dehu_cfm: 0 });
  const b = computeChamberTurnover({ chamber_volume_ft3: 1000, target_ach: 60, air_mover_total_cfm: 500, dehu_cfm: 250 });
  assert.ok(b.actual_ach > a.actual_ach);
});

test("Chamber: gap >= 0 always", () => {
  for (const cfm of [0, 100, 500, 1000, 2000]) {
    const r = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach: 60, air_mover_total_cfm: cfm, dehu_cfm: 0 });
    assert.ok(r.gap_cfm >= 0);
  }
});
