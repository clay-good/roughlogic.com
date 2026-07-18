// Unit tests for calc-electrical.js. At least 10 cases per spec section 13.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeOhmsLaw,
  computeWireAmpacity,
  computeVoltageDrop,
  computeConduitFill,
  CONDUCTOR_AREAS_IN2,
  CONDUIT_AREAS_IN2,
  EGC_TABLE_AWG,
  STANDARD_SERVICE_AMPACITIES,
  TRANSFORMER_KVA_STEPS,
  computeBoxFill,
  BOX_FILL_PER_CONDUCTOR_IN3,
  computeBreakerSize,
  computeMotorFLA,
  MOTOR_FLA_TABLE,
  computeTransformerSize,
  computeThreePhase,
  computeConductorResistance,
  computeEGCSize,
  ohmsLawExample,
  wireAmpacityExample,
  voltageDropExample,
  conduitFillExample,
  boxFillExample,
  breakerSizeExample,
  motorFLAExample,
  transformerSizeExample,
  threePhaseExample,
  conductorResistanceExample,
  egcSizeExample,
} from "../../calc-electrical.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 1: Ohm's Law ---

test("Ohm's Law example: V=12, I=2 -> R=6, P=24", () => {
  const r = computeOhmsLaw(ohmsLawExample.inputs);
  assert.equal(r.V, 12);
  assert.equal(r.I, 2);
  assert.equal(r.R, 6);
  assert.equal(r.P, 24);
});

test("Ohm's Law: V and R given -> I and P derived", () => {
  const r = computeOhmsLaw({ V: 120, I: null, R: 60, P: null });
  assert.equal(r.I, 2);
  assert.equal(r.P, 240);
});

test("Ohm's Law: I and R given -> V and P derived", () => {
  const r = computeOhmsLaw({ V: null, I: 5, R: 10, P: null });
  assert.equal(r.V, 50);
  assert.equal(r.P, 250);
});

test("Ohm's Law: P and V given -> I derived", () => {
  const r = computeOhmsLaw({ V: 240, I: null, R: null, P: 1200 });
  assert.equal(r.I, 5);
  assert.equal(r.R, 48);
});

test("Ohm's Law: P and R given -> I and V derived", () => {
  const r = computeOhmsLaw({ V: null, I: null, R: 4, P: 100 });
  assert.ok(close(r.I, 5));
  assert.ok(close(r.V, 20));
});

test("Ohm's Law: insufficient inputs returns error", () => {
  const r = computeOhmsLaw({ V: 10, I: null, R: null, P: null });
  assert.ok(r.error);
});

// --- Utility 2: Wire Ampacity ---

test("Wire ampacity returns positive for AWG 12 copper at 75 C, 30 C ambient", () => {
  const r = computeWireAmpacity(wireAmpacityExample.inputs);
  assert.ok(r.ampacity_A > 0);
  assert.ok(r.ampacity_A >= wireAmpacityExample.expectedRange.min);
  assert.ok(r.ampacity_A <= wireAmpacityExample.expectedRange.max);
});

test("Wire ampacity: lower insulation rating -> lower ampacity", () => {
  const a60 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 60, ambient_C: 30, bundle_count: 1 });
  const a75 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  assert.ok(a60.ampacity_A < a75.ampacity_A);
});

test("Wire ampacity: bundle count > 3 derates", () => {
  const a1 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  const a6 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 6 });
  assert.ok(a6.ampacity_A < a1.ampacity_A);
});

test("Wire ampacity: aluminum lower than copper at same conditions", () => {
  const cu = computeWireAmpacity({ awg: "10", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  const al = computeWireAmpacity({ awg: "10", material: "aluminum", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  assert.ok(al.ampacity_A < cu.ampacity_A);
});

// --- Utility 3: Voltage Drop ---

test("Voltage drop example: AWG 12 copper, 100 ft, 20 A, 120 V single phase", () => {
  const r = computeVoltageDrop(voltageDropExample.inputs);
  const e = voltageDropExample.expectedRange;
  assert.ok(r.drop_V > e.drop_V.min && r.drop_V < e.drop_V.max, "drop " + r.drop_V);
  assert.ok(r.percent > e.percent.min && r.percent < e.percent.max, "% " + r.percent);
});

test("Voltage drop: zero current -> zero drop", () => {
  const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 0, source_voltage_V: 120 });
  assert.equal(r.drop_V, 0);
  assert.equal(r.percent, 0);
});

test("Voltage drop: linear in length", () => {
  const a = computeVoltageDrop({ phase: "single", material: "copper", awg: "10", length_ft: 100, current_A: 10, source_voltage_V: 120 });
  const b = computeVoltageDrop({ phase: "single", material: "copper", awg: "10", length_ft: 200, current_A: 10, source_voltage_V: 120 });
  assert.ok(close(b.drop_V, 2 * a.drop_V, 1e-6));
});

// --- Utility 4: Conduit Fill ---

test("Conduit fill example: 4 x AWG 12 THHN in 3/4 EMT passes", () => {
  const r = computeConduitFill(conduitFillExample.inputs);
  assert.ok(r.fill_percent >= conduitFillExample.expectedRange.fill_percent.min);
  assert.ok(r.fill_percent <= conduitFillExample.expectedRange.fill_percent.max);
  assert.equal(r.pass, true);
});

test("Conduit fill: too many conductors fails", () => {
  const r = computeConduitFill({ conduit: "EMT", trade_size: "1/2", conductors: [{ insulation: "THHN", awg: "8", count: 6 }] });
  assert.equal(r.pass, false);
});

test("Conduit fill: single conductor uses 53 percent threshold", () => {
  const r = computeConduitFill({ conduit: "EMT", trade_size: "1/2", conductors: [{ insulation: "THHN", awg: "12", count: 1 }] });
  assert.equal(r.threshold_percent, 53);
});

test("Conduit fill: two conductors uses 31 percent threshold", () => {
  const r = computeConduitFill({ conduit: "EMT", trade_size: "1/2", conductors: [{ insulation: "THHN", awg: "12", count: 2 }] });
  assert.equal(r.threshold_percent, 31);
});

// --- Utility 5: Box Fill ---

test("Box fill example: 6 x 12 AWG + 1 device + clamps in 22.5 in^3 box", () => {
  const r = computeBoxFill(boxFillExample.inputs);
  // 6 conductors at 2.25 + clamp 2.25 + device 2 * 2.25 = 13.5 + 2.25 + 4.5 = 20.25 in^3
  assert.ok(close(r.fill_in3, 20.25, 0.001));
  assert.equal(r.pass, true);
});

test("Box fill fails when conductor count exceeds box capacity", () => {
  const r = computeBoxFill({ box_volume_in3: 18, conductors_by_size: { "12": 10 }, devices: 0, internal_clamps: false, largest_awg_for_clamp_and_device: "12" });
  assert.equal(r.pass, false);
});

// --- Utility 6: Breaker Sizing ---

test("Breaker sizing: 16 A continuous -> 20 A breaker", () => {
  const r = computeBreakerSize(breakerSizeExample.inputs);
  assert.equal(r.required_A, 20);
  assert.equal(r.next_standard_A, 20);
});

test("Breaker sizing: 16 A non-continuous -> 20 A breaker (next standard)", () => {
  const r = computeBreakerSize({ load_A: 16, continuous: false });
  assert.equal(r.required_A, 16);
  assert.equal(r.next_standard_A, 20);
});

test("Breaker sizing: 12 A continuous -> 15 A breaker", () => {
  const r = computeBreakerSize({ load_A: 12, continuous: true });
  assert.equal(r.required_A, 15);
  assert.equal(r.next_standard_A, 15);
});

// --- Utility 7: Motor FLA ---

test("Motor FLA example: 5 hp three-phase 230 V -> 15.2 A", () => {
  const r = computeMotorFLA(motorFLAExample.inputs);
  assert.equal(r.fla_A, 15.2);
});

test("Motor FLA: missing combination returns error", () => {
  const r = computeMotorFLA({ hp: 100, voltage: 480, phase: "three" });
  assert.ok(r.error);
});

// Physical/NEC invariants over the NEC 430.248/250 FLA lookup (drives motor
// branch-circuit and OCPD sizing -- an undersized value is a fire risk). Full-load
// amps must rise with horsepower down each voltage column, and fall with voltage
// across each hp row (higher voltage draws less current for the same power). A
// transcription error would break one of these; the per-value fixtures do not cover it.
test("Motor FLA table: monotone increasing in hp per voltage, decreasing in voltage per hp (NEC 430.248/250)", () => {
  const hps = Object.keys(MOTOR_FLA_TABLE).map(Number).sort((a, b) => a - b);
  const cols = ["single_115V", "single_230V", "three_208V", "three_230V", "three_460V"];
  for (const c of cols) {
    let prev = -Infinity;
    for (const hp of hps) {
      const v = MOTOR_FLA_TABLE[hp][c];
      if (v == null) continue;
      assert.ok(v > prev, `${c} FLA not increasing with hp at ${hp} hp: ${v} <= ${prev}`);
      prev = v;
    }
  }
  for (const hp of hps) {
    const r = MOTOR_FLA_TABLE[hp];
    if (r.single_115V != null && r.single_230V != null) {
      assert.ok(r.single_115V > r.single_230V, `${hp} hp: 115 V FLA must exceed 230 V`);
    }
    if (r.three_208V != null && r.three_230V != null) {
      assert.ok(r.three_208V > r.three_230V, `${hp} hp: 208 V FLA must exceed 230 V (3ph)`);
    }
    if (r.three_230V != null && r.three_460V != null) {
      assert.ok(r.three_230V > r.three_460V, `${hp} hp: 230 V FLA must exceed 460 V (3ph)`);
    }
  }
});

// --- Utility 8: Transformer Sizing ---

test("Transformer sizing: 90 kW @ 0.9 pf -> 100 kVA required, next ANSI/IEEE C57 step 112.5", () => {
  const r = computeTransformerSize(transformerSizeExample.inputs);
  assert.ok(close(r.required_kVA, 100, 0.001));
  // v8 §C.1: ANSI/IEEE C57 step series (15, 30, 45, 75, 112.5, 150, ...). 100 → 112.5.
  assert.equal(r.next_standard_kVA, 112.5);
});

test("Transformer sizing: primary FLA = (kVA * 1000) / (sqrt(3) * V_LL) for three-phase", () => {
  const r = computeTransformerSize({ load_kW: 90, power_factor: 0.9, primary_V: 480, secondary_V: 208, phase: "three" });
  const expected = (100 * 1000) / (Math.sqrt(3) * 480);
  assert.ok(close(r.primary_FLA_A, expected, 0.5));
});

// --- Utility 9: Three-Phase Power ---

test("Three-phase: 480 V, 100 A, pf 0.9 -> approx 74.8 kW, 83.1 kVA", () => {
  const r = computeThreePhase(threePhaseExample.inputs);
  assert.ok(r.kW > threePhaseExample.expectedRange.kW.min);
  assert.ok(r.kW < threePhaseExample.expectedRange.kW.max);
  assert.ok(r.kVA > threePhaseExample.expectedRange.kVA.min);
  assert.ok(r.kVA < threePhaseExample.expectedRange.kVA.max);
});

test("Three-phase: pf=1 -> kW equals kVA, kVAR is 0", () => {
  const r = computeThreePhase({ V_LL: 240, I_L: 50, pf: 1 });
  assert.ok(close(r.kW, r.kVA, 1e-9));
  assert.ok(close(r.kVAR, 0, 1e-9));
});

// --- Utility 10: Conductor Resistance ---

test("Conductor resistance example: copper 12 AWG, 1000 ft at 20 C in range", () => {
  const r = computeConductorResistance(conductorResistanceExample.inputs);
  assert.ok(r.resistance_ohm > conductorResistanceExample.expectedRange.resistance_ohm.min);
  assert.ok(r.resistance_ohm < conductorResistanceExample.expectedRange.resistance_ohm.max);
});

test("Conductor resistance: scales linearly with length", () => {
  const a = computeConductorResistance({ material: "copper", awg: "10", length_ft: 100, temperature_C: 20 });
  const b = computeConductorResistance({ material: "copper", awg: "10", length_ft: 1000, temperature_C: 20 });
  assert.ok(close(b.resistance_ohm, 10 * a.resistance_ohm, 1e-6));
});

// --- Utility 11: EGC Sizing ---

test("EGC example: 60 A copper -> 10 AWG", () => {
  const r = computeEGCSize(egcSizeExample.inputs);
  assert.equal(r.egc_awg, "10");
});

test("EGC: 200 A copper -> 6 AWG", () => {
  const r = computeEGCSize({ ocpd_A: 200, material: "copper" });
  assert.equal(r.egc_awg, "6");
});

test("EGC: 200 A aluminum -> 4 AWG", () => {
  const r = computeEGCSize({ ocpd_A: 200, material: "aluminum" });
  assert.equal(r.egc_awg, "4");
});

test("EGC: rating beyond table returns error", () => {
  const r = computeEGCSize({ ocpd_A: 5000, material: "copper" });
  assert.ok(r.error);
});

// Structural invariants over the two NEC Chapter 9 / 314.16 lookup tables that
// drive conduit fill and box fill (over-fill is a heat / code-violation hazard):
// both the conductor cross-sectional area and the per-conductor box allowance
// must strictly increase with conductor size. A transcription error in either
// table would silently skew every fill verdict; the per-value fixtures miss it.
test("NEC conduit-area and box-fill tables are strictly increasing with conductor size", () => {
  // Cross-section rank, smallest to largest (AWG then kcmil).
  const order = ["18", "16", "14", "12", "10", "8", "6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0"];
  const rank = Object.fromEntries(order.map((s, i) => [s, i]));
  for (const [ins, tbl] of Object.entries(CONDUCTOR_AREAS_IN2)) {
    const sizes = Object.keys(tbl).sort((a, b) => rank[a] - rank[b]);
    let prev = -Infinity;
    for (const s of sizes) {
      assert.ok(rank[s] !== undefined, `unranked conductor size ${s} in CONDUCTOR_AREAS_IN2.${ins}`);
      assert.ok(tbl[s] > 0 && tbl[s] > prev, `CONDUCTOR_AREAS_IN2.${ins} not increasing at ${s}: ${tbl[s]} <= ${prev}`);
      prev = tbl[s];
    }
  }
  const bfSizes = Object.keys(BOX_FILL_PER_CONDUCTOR_IN3).sort((a, b) => rank[a] - rank[b]);
  let prevBf = -Infinity;
  for (const s of bfSizes) {
    assert.ok(BOX_FILL_PER_CONDUCTOR_IN3[s] > prevBf,
      `BOX_FILL_PER_CONDUCTOR_IN3 not increasing at ${s}: ${BOX_FILL_PER_CONDUCTOR_IN3[s]} <= ${prevBf}`);
    prevBf = BOX_FILL_PER_CONDUCTOR_IN3[s];
  }
});

// Ordering invariants over four more NEC electrical lookup tables. The two
// standard-size ladders are consumed by "smallest step >= required" sizing logic
// that ASSUMES a sorted ladder; the EGC and conduit tables must grow with OCPD
// and trade size respectively. A mis-ordering or transcription error would pick
// the wrong grounding conductor, conduit, service, or transformer -- a safety /
// code defect the per-value fixtures do not catch.
test("NEC electrical ordered tables: EGC by OCPD, conduit area by trade size, and the service / kVA ladders are monotone", () => {
  const cond = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600"];
  const cRank = Object.fromEntries(cond.map((s, i) => [s, i]));
  const trade = ["1/2", "3/4", "1", "1-1/4", "1-1/2", "2", "2-1/2", "3", "3-1/2", "4", "5", "6"];
  const tRank = Object.fromEntries(trade.map((s, i) => [s, i]));

  // EGC (NEC 250.122): OCPD strictly increasing; copper/aluminum EGC never shrinks.
  let prevO = -Infinity, prevCu = -Infinity, prevAl = -Infinity;
  for (const row of EGC_TABLE_AWG) {
    assert.ok(row.ocpd_max_A > prevO, `EGC OCPD not increasing: ${row.ocpd_max_A}`);
    prevO = row.ocpd_max_A;
    assert.ok(cRank[row.copper] >= prevCu, `EGC copper shrinks at OCPD ${row.ocpd_max_A}: ${row.copper}`);
    prevCu = cRank[row.copper];
    assert.ok(cRank[row.aluminum] >= prevAl, `EGC aluminum shrinks at OCPD ${row.ocpd_max_A}: ${row.aluminum}`);
    prevAl = cRank[row.aluminum];
  }

  // Conduit internal area strictly increases with trade size, per conduit type.
  for (const [ct, tbl] of Object.entries(CONDUIT_AREAS_IN2)) {
    const sizes = Object.keys(tbl).sort((a, b) => tRank[a] - tRank[b]);
    let prev = -Infinity;
    for (const s of sizes) {
      assert.ok(tRank[s] !== undefined, `unranked trade size ${s} in CONDUIT_AREAS_IN2.${ct}`);
      assert.ok(tbl[s] > prev, `CONDUIT_AREAS_IN2.${ct} not increasing at ${s}: ${tbl[s]} <= ${prev}`);
      prev = tbl[s];
    }
  }

  // Standard-size ladders must be strictly increasing (the sizing logic assumes it).
  for (const [name, ladder] of [["STANDARD_SERVICE_AMPACITIES", STANDARD_SERVICE_AMPACITIES], ["TRANSFORMER_KVA_STEPS", TRANSFORMER_KVA_STEPS]]) {
    assert.ok(ladder.length >= 5, `${name} unexpectedly short`);
    for (let i = 1; i < ladder.length; i++) {
      assert.ok(ladder[i] > ladder[i - 1], `${name} not strictly increasing at index ${i}: ${ladder[i]} <= ${ladder[i - 1]}`);
    }
  }
});
