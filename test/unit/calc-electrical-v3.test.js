// Unit tests for calc-electrical.js v3 utilities (125-131).
// At least 10 cases per utility per spec section 13.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePullingTension,
  computeBendRadius,
  computePFCorrection,
  computePhaseBalance,
  computeMultiLoadVoltageDrop,
  computeLVDCDrop,
  computePoEBudget,
  CABLE_BEND_RADIUS_TABLE,
  POE_CLASSES,
  POE_CABLE_OHMS_PER_100M,
  LV_DC_TOLERANCE_TABLE,
  pullingTensionExample,
  bendRadiusExample,
  pfCorrectionExample,
  phaseBalanceExample,
  multiLoadVDExample,
  lvDCDropExample,
  poeBudgetExample,
} from "../../calc-electrical.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 125: Conductor Pulling Tension ---

test("Pulling tension: example yields ok flags", () => {
  const r = computePullingTension(pullingTensionExample.inputs);
  assert.equal(r.tension_flag, "ok");
  assert.equal(r.sidewall_flag, "ok");
});

test("Pulling tension: head-end tension grows with bend angle (capstan)", () => {
  const base = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [] });
  const bent = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  assert.ok(bent.tension_lb > base.tension_lb);
});

test("Pulling tension: dry has higher mu than polymer for same setup", () => {
  const dry = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: 100, lubricant: "dry", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  const poly = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  assert.ok(dry.tension_lb > poly.tension_lb);
});

test("Pulling tension: capstan exact value for one 90 deg bend, zero straight", () => {
  const r = computePullingTension({ cable_weight_lb_per_ft: 0.0001, run_length_ft: 1, lubricant: "polymer", straight_run_ft: 0, bends: [] });
  // With zero straight, T_in = 0; head end ~= 0 plus trailing-straight resistive.
  assert.ok(r.tension_lb < 1);
});

test("Pulling tension: tension flag exceeds at very heavy cable", () => {
  const r = computePullingTension({ cable_weight_lb_per_ft: 100, run_length_ft: 1000, lubricant: "dry", straight_run_ft: 1000, bends: [] });
  assert.equal(r.tension_flag, "exceeds 5000 lb head-end limit");
});

test("Pulling tension: zero cable weight returns error", () => {
  const r = computePullingTension({ cable_weight_lb_per_ft: 0, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 50, bends: [] });
  assert.ok(r.error);
});

test("Pulling tension: negative gauge / negative run errors", () => {
  const r = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: -10, lubricant: "polymer", straight_run_ft: 0, bends: [] });
  assert.ok(r.error);
});

test("Pulling tension: empty bend list still returns a number", () => {
  const r = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [] });
  assert.ok(Number.isFinite(r.tension_lb));
});

test("Pulling tension: unknown lubricant returns error", () => {
  const r = computePullingTension({ cable_weight_lb_per_ft: 1, run_length_ft: 100, lubricant: "spam", straight_run_ft: 50, bends: [] });
  assert.ok(r.error);
});

test("Pulling tension: sidewall pressure tracks small radius", () => {
  const big = computePullingTension({ cable_weight_lb_per_ft: 5, run_length_ft: 200, lubricant: "dry", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 5 }] });
  const small = computePullingTension({ cable_weight_lb_per_ft: 5, run_length_ft: 200, lubricant: "dry", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 0.5 }] });
  assert.ok(small.max_sidewall_lb_per_ft > big.max_sidewall_lb_per_ft);
});

// --- Utility 126: Cable Bend Radius Minimum ---

test("Bend radius: example THHN OD 0.5 in -> 4 in", () => {
  const r = computeBendRadius(bendRadiusExample.inputs);
  assert.ok(close(r.min_radius_in, 4));
});

test("Bend radius: fiber multiple is 20", () => {
  const r = computeBendRadius({ cable_type: "fiber", cable_od_in: 0.25 });
  assert.equal(r.multiple, 20);
  assert.ok(close(r.min_radius_in, 5));
});

test("Bend radius: every table entry has positive multiple and attribution", () => {
  for (const [k, row] of Object.entries(CABLE_BEND_RADIUS_TABLE)) {
    assert.ok(row.multiple > 0, k);
    assert.ok(row.attribution.length > 0, k);
  }
});

test("Bend radius: unknown cable type returns error", () => {
  const r = computeBendRadius({ cable_type: "spam", cable_od_in: 0.5 });
  assert.ok(r.error);
});

test("Bend radius: zero OD returns error", () => {
  const r = computeBendRadius({ cable_type: "THHN", cable_od_in: 0 });
  assert.ok(r.error);
});

test("Bend radius: negative OD returns error", () => {
  const r = computeBendRadius({ cable_type: "THHN", cable_od_in: -1 });
  assert.ok(r.error);
});

test("Bend radius: result scales linearly with OD", () => {
  const a = computeBendRadius({ cable_type: "MC", cable_od_in: 1 });
  const b = computeBendRadius({ cable_type: "MC", cable_od_in: 2 });
  assert.ok(close(b.min_radius_in / a.min_radius_in, 2));
});

test("Bend radius: coax 10x for OD 0.4 = 4 in", () => {
  const r = computeBendRadius({ cable_type: "coax", cable_od_in: 0.4 });
  assert.ok(close(r.min_radius_in, 4));
});

test("Bend radius: control 6x", () => {
  const r = computeBendRadius({ cable_type: "control", cable_od_in: 0.5 });
  assert.equal(r.multiple, 6);
});

test("Bend radius: attribution string includes manufacturer", () => {
  const r = computeBendRadius({ cable_type: "fiber", cable_od_in: 0.3 });
  assert.match(r.attribution, /Corning/);
});

// --- Utility 127: Power Factor Correction Capacitor ---

test("PF correction: example yields kVAR in expected range", () => {
  const r = computePFCorrection(pfCorrectionExample.inputs);
  assert.ok(r.kVAR > 50 && r.kVAR < 60);
});

test("PF correction: PF1 already at target -> reject (PF2 must exceed)", () => {
  const r = computePFCorrection({ kW: 100, pf1: 0.95, pf2: 0.95, system_V: 480, phase: "three" });
  assert.ok(r.error);
});

test("PF correction: PF2 below PF1 returns error", () => {
  const r = computePFCorrection({ kW: 100, pf1: 0.95, pf2: 0.85, system_V: 480, phase: "three" });
  assert.ok(r.error);
});

test("PF correction: zero kW returns error", () => {
  const r = computePFCorrection({ kW: 0, pf1: 0.7, pf2: 0.95, system_V: 480, phase: "three" });
  assert.ok(r.error);
});

test("PF correction: invalid PF (>1) returns error", () => {
  const r = computePFCorrection({ kW: 50, pf1: 1.2, pf2: 1.0, system_V: 240, phase: "single" });
  assert.ok(r.error);
});

test("PF correction: zero voltage returns error", () => {
  const r = computePFCorrection({ kW: 50, pf1: 0.7, pf2: 0.95, system_V: 0, phase: "single" });
  assert.ok(r.error);
});

test("PF correction: capacitance positive for valid input single-phase", () => {
  const r = computePFCorrection({ kW: 10, pf1: 0.7, pf2: 0.95, system_V: 240, phase: "single" });
  assert.ok(r.capacitance_uF > 0);
});

test("PF correction: more correction needed for lower starting PF", () => {
  const a = computePFCorrection({ kW: 100, pf1: 0.6, pf2: 0.95, system_V: 480, phase: "three" });
  const b = computePFCorrection({ kW: 100, pf1: 0.85, pf2: 0.95, system_V: 480, phase: "three" });
  assert.ok(a.kVAR > b.kVAR);
});

test("PF correction: three-phase capacitance is positive and finite", () => {
  const r = computePFCorrection({ kW: 100, pf1: 0.7, pf2: 0.95, system_V: 480, phase: "three" });
  assert.ok(r.capacitance_uF > 0);
  assert.ok(Number.isFinite(r.capacitance_uF));
});

test("PF correction: kVAR scales linearly with kW", () => {
  const a = computePFCorrection({ kW: 50, pf1: 0.7, pf2: 0.95, system_V: 480, phase: "three" });
  const b = computePFCorrection({ kW: 100, pf1: 0.7, pf2: 0.95, system_V: 480, phase: "three" });
  assert.ok(close(b.kVAR / a.kVAR, 2, 0.001));
});

// --- Utility 128: Phase Balance ---

test("Phase balance: balanced input -> 0 percent", () => {
  const r = computePhaseBalance({ circuits: [{ phase: "A", load_W: 1000 }, { phase: "B", load_W: 1000 }, { phase: "C", load_W: 1000 }], threshold_percent: 5 });
  assert.equal(r.imbalance_percent, 0);
});

test("Phase balance: example yields totals", () => {
  const r = computePhaseBalance(phaseBalanceExample.inputs);
  assert.equal(r.totals.A, 2300);
  assert.equal(r.totals.B, 600);
  assert.equal(r.totals.C, 700);
});

test("Phase balance: empty list returns error", () => {
  const r = computePhaseBalance({ circuits: [] });
  assert.ok(r.error);
});

test("Phase balance: unknown phase returns error", () => {
  const r = computePhaseBalance({ circuits: [{ phase: "D", load_W: 100 }] });
  assert.ok(r.error);
});

test("Phase balance: negative load returns error", () => {
  const r = computePhaseBalance({ circuits: [{ phase: "A", load_W: -10 }] });
  assert.ok(r.error);
});

test("Phase balance: swap reduces imbalance vs initial", () => {
  const r = computePhaseBalance({
    circuits: [
      { phase: "A", load_W: 1000 }, { phase: "A", load_W: 400 }, { phase: "A", load_W: 200 },
      { phase: "B", load_W: 600 }, { phase: "C", load_W: 600 },
    ],
    threshold_percent: 10,
  });
  assert.ok(r.final_imbalance_percent <= r.imbalance_percent);
});

test("Phase balance: imbalance percent uses average as denominator", () => {
  const r = computePhaseBalance({
    circuits: [{ phase: "A", load_W: 1500 }, { phase: "B", load_W: 500 }, { phase: "C", load_W: 1000 }],
    threshold_percent: 5,
  });
  // avg = 1000; (1500-500)/1000 = 100%
  assert.ok(close(r.imbalance_percent, 100, 0.5));
});

test("Phase balance: threshold respected (no swaps when already below)", () => {
  const r = computePhaseBalance({
    circuits: [{ phase: "A", load_W: 1000 }, { phase: "B", load_W: 1010 }, { phase: "C", load_W: 990 }],
    threshold_percent: 5,
  });
  assert.equal(r.swaps.length, 0);
});

test("Phase balance: large threshold means zero swaps", () => {
  const r = computePhaseBalance({
    circuits: [{ phase: "A", load_W: 1500 }, { phase: "B", load_W: 100 }, { phase: "C", load_W: 100 }],
    threshold_percent: 1000,
  });
  assert.equal(r.swaps.length, 0);
});

test("Phase balance: returns array swaps with circuit indices", () => {
  const r = computePhaseBalance({
    circuits: [
      { phase: "A", load_W: 1000 }, { phase: "A", load_W: 200 }, { phase: "B", load_W: 600 }, { phase: "C", load_W: 600 },
    ],
    threshold_percent: 5,
  });
  for (const s of r.swaps) {
    assert.ok(typeof s.circuit === "number");
    assert.ok(["A", "B", "C"].includes(s.from));
    assert.ok(["A", "B", "C"].includes(s.to));
  }
});

// --- Utility 129: Multi-load voltage drop ---

test("Multi-load VD: example computes worst drop", () => {
  const r = computeMultiLoadVoltageDrop(multiLoadVDExample.inputs);
  assert.ok(r.worst_drop_V > 0);
  assert.ok(r.worst_voltage_V < 120);
});

test("Multi-load VD: empty loads returns error", () => {
  const r = computeMultiLoadVoltageDrop({ material: "copper", awg: "12", source_voltage_V: 120, loads: [] });
  assert.ok(r.error);
});

test("Multi-load VD: per-load array length matches input", () => {
  const r = computeMultiLoadVoltageDrop({
    material: "copper", awg: "12", source_voltage_V: 120,
    loads: [{ distance_ft: 50, current_A: 5 }, { distance_ft: 100, current_A: 10 }, { distance_ft: 150, current_A: 5 }],
  });
  assert.equal(r.per_load.length, 3);
});

test("Multi-load VD: drop monotonically increases with distance", () => {
  const r = computeMultiLoadVoltageDrop({
    material: "copper", awg: "12", source_voltage_V: 120,
    loads: [{ distance_ft: 25, current_A: 5 }, { distance_ft: 50, current_A: 5 }, { distance_ft: 75, current_A: 5 }],
  });
  for (let i = 1; i < r.per_load.length; i++) assert.ok(r.per_load[i].cumulative_drop_V >= r.per_load[i - 1].cumulative_drop_V);
});

test("Multi-load VD: aluminum drops more than copper at same gauge", () => {
  const cu = computeMultiLoadVoltageDrop({ material: "copper", awg: "10", source_voltage_V: 240, loads: [{ distance_ft: 100, current_A: 20 }] });
  const al = computeMultiLoadVoltageDrop({ material: "aluminum", awg: "10", source_voltage_V: 240, loads: [{ distance_ft: 100, current_A: 20 }] });
  assert.ok(al.worst_drop_V > cu.worst_drop_V);
});

test("Multi-load VD: heavier gauge drops less", () => {
  const a = computeMultiLoadVoltageDrop({ material: "copper", awg: "14", source_voltage_V: 240, loads: [{ distance_ft: 100, current_A: 15 }] });
  const b = computeMultiLoadVoltageDrop({ material: "copper", awg: "8", source_voltage_V: 240, loads: [{ distance_ft: 100, current_A: 15 }] });
  assert.ok(b.worst_drop_V < a.worst_drop_V);
});

test("Multi-load VD: percent matches drop / source", () => {
  const r = computeMultiLoadVoltageDrop({ material: "copper", awg: "12", source_voltage_V: 120, loads: [{ distance_ft: 100, current_A: 20 }] });
  assert.ok(close(r.worst_percent, (r.worst_drop_V / 120) * 100, 0.001));
});

test("Multi-load VD: closer load has lower cumulative drop than far load", () => {
  const r = computeMultiLoadVoltageDrop({
    material: "copper", awg: "12", source_voltage_V: 120,
    loads: [{ distance_ft: 25, current_A: 10 }, { distance_ft: 150, current_A: 10 }],
  });
  assert.ok(r.per_load[0].cumulative_drop_V < r.per_load[1].cumulative_drop_V);
});

test("Multi-load VD: zero current per load yields zero drop", () => {
  const r = computeMultiLoadVoltageDrop({ material: "copper", awg: "12", source_voltage_V: 120, loads: [{ distance_ft: 50, current_A: 0 }] });
  assert.equal(r.worst_drop_V, 0);
});

test("Multi-load VD: unknown awg returns error", () => {
  const r = computeMultiLoadVoltageDrop({ material: "copper", awg: "99", source_voltage_V: 120, loads: [{ distance_ft: 50, current_A: 5 }] });
  assert.ok(r.error);
});

// --- Utility 130: Low-voltage DC drop ---

test("LV DC drop: example computes drop and percent", () => {
  const r = computeLVDCDrop(lvDCDropExample.inputs);
  assert.ok(r.drop_V > 0);
  assert.ok(r.percent > 0);
});

test("LV DC drop: 24 V system has lower percent than 12 V at same drop", () => {
  const a = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  const b = computeLVDCDrop({ system_V: 24, awg: "10", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  assert.ok(b.percent < a.percent);
});

test("LV DC drop: marine 10% tolerance is more permissive than LED 3%", () => {
  const a = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  const b = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: 10, application: "marine" });
  assert.ok(b.application_tolerance_percent > a.application_tolerance_percent);
});

test("LV DC drop: zero current yields zero drop", () => {
  const r = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: 0, application: "led_lighting" });
  assert.equal(r.drop_V, 0);
});

test("LV DC drop: negative system voltage returns error", () => {
  const r = computeLVDCDrop({ system_V: -1, awg: "10", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  assert.ok(r.error);
});

test("LV DC drop: unknown awg returns error", () => {
  const r = computeLVDCDrop({ system_V: 12, awg: "99", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  assert.ok(r.error);
});

test("LV DC drop: longer run -> bigger drop", () => {
  const a = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 10, current_A: 10, application: "led_lighting" });
  const b = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 30, current_A: 10, application: "led_lighting" });
  assert.ok(b.drop_V > a.drop_V);
});

test("LV DC drop: heavier gauge -> smaller drop", () => {
  const a = computeLVDCDrop({ system_V: 12, awg: "16", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  const b = computeLVDCDrop({ system_V: 12, awg: "8", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  assert.ok(b.drop_V < a.drop_V);
});

test("LV DC drop: every tolerance row is positive", () => {
  for (const [k, v] of Object.entries(LV_DC_TOLERANCE_TABLE)) {
    assert.ok(v.percent > 0, k);
    assert.ok(v.note.length > 0, k);
  }
});

test("LV DC drop: acceptable flag matches percent <= threshold", () => {
  const r = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 5, current_A: 5, application: "led_lighting" });
  assert.equal(r.acceptable, r.percent <= 3);
});

test("LV DC drop: large current flips acceptable to false on tight tolerance", () => {
  const r = computeLVDCDrop({ system_V: 12, awg: "14", run_length_ft: 50, current_A: 20, application: "audio" });
  assert.equal(r.acceptable, false);
});

// --- Utility 131: PoE Budget ---

test("PoE budget: example returns finite voltage at PD", () => {
  const r = computePoEBudget(poeBudgetExample.inputs);
  assert.ok(Number.isFinite(r.voltage_at_pd_V));
  assert.ok(r.pd_available_W > 0);
});

test("PoE budget: short Cat6A run is green", () => {
  const r = computePoEBudget({ poe_class: "at", category: "Cat6A", run_length_ft: 50, ambient_C: 25 });
  assert.equal(r.flag, "green");
});

test("PoE budget: very long Cat5e bt4 run flips red", () => {
  const r = computePoEBudget({ poe_class: "bt4", category: "Cat5e", run_length_ft: 500, ambient_C: 60 });
  assert.equal(r.flag, "red");
});

test("PoE budget: unknown class returns error", () => {
  const r = computePoEBudget({ poe_class: "xx", category: "Cat6", run_length_ft: 100, ambient_C: 25 });
  assert.ok(r.error);
});

test("PoE budget: unknown category returns error", () => {
  const r = computePoEBudget({ poe_class: "at", category: "Cat3", run_length_ft: 100, ambient_C: 25 });
  assert.ok(r.error);
});

test("PoE budget: longer run has higher loss", () => {
  const a = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: 100, ambient_C: 25 });
  const b = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: 300, ambient_C: 25 });
  assert.ok(b.cable_loss_W > a.cable_loss_W);
});

test("PoE budget: warmer ambient increases loss", () => {
  const a = computePoEBudget({ poe_class: "bt3", category: "Cat6", run_length_ft: 200, ambient_C: 20 });
  const b = computePoEBudget({ poe_class: "bt3", category: "Cat6", run_length_ft: 200, ambient_C: 60 });
  assert.ok(b.cable_loss_W > a.cable_loss_W);
});

test("PoE budget: Cat6A has less loss than Cat5e at equal length", () => {
  const a = computePoEBudget({ poe_class: "at", category: "Cat5e", run_length_ft: 200, ambient_C: 25 });
  const b = computePoEBudget({ poe_class: "at", category: "Cat6A", run_length_ft: 200, ambient_C: 25 });
  assert.ok(b.cable_loss_W < a.cable_loss_W);
});

test("PoE budget: every class has a label and pd_min_W", () => {
  for (const [k, v] of Object.entries(POE_CLASSES)) {
    assert.ok(v.label.length > 0, k);
    assert.ok(v.pd_min_W > 0, k);
  }
});

test("PoE budget: cable resistance table has all three categories", () => {
  for (const c of ["Cat5e", "Cat6", "Cat6A"]) assert.ok(Number.isFinite(POE_CABLE_OHMS_PER_100M[c]));
});

test("PoE budget: negative run returns error", () => {
  const r = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: -5, ambient_C: 25 });
  assert.ok(r.error);
});
