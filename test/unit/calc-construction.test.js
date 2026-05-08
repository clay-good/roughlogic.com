// Unit tests for calc-construction.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStairs,
  computeRoofPitch,
  computeRafter,
  computeArea,
  computeBoardFootage,
  computeConcreteVolume,
  computeRebar,
  computeLumberSpan,
  computePullout,
  computeBeamLoading,
  computeMaterialQuantity,
  stairsExample,
  roofPitchExample,
  areaExample,
  boardFootageExample,
  concreteExample,
  lumberSpansExample,
} from "../../calc-construction.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 40: Stairs ---

test("Stairs example: 108 in / 7.5 preferred -> 14 risers, 13 treads, 130 in run", () => {
  const r = computeStairs(stairsExample.inputs);
  assert.equal(r.risers, 14);
  assert.equal(r.treads, 13);
  assert.equal(r.total_run_in, 130);
});

test("Stairs: zero rise returns error", () => {
  const r = computeStairs({ total_rise_in: 0 });
  assert.ok(r.error);
});

// --- Utility 41: Roof Pitch ---

test("Roof pitch example: 6/12 -> 26.57 degrees, 50 percent", () => {
  const r = computeRoofPitch(roofPitchExample.inputs);
  assert.ok(close(r.degrees, 26.565, 0.01));
  assert.ok(close(r.percent, 50, 0.001));
  assert.equal(r.pitch_in_per_ft, 6);
});

test("Roof pitch: 0 run returns error", () => {
  const r = computeRoofPitch({ rise: 5, run: 0, mode: "rise_run" });
  assert.ok(r.error);
});

// --- Utility 42: Rafter ---

test("Rafter: 12 ft span at 6/12 pitch with no overhang", () => {
  const r = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12: 6, overhang_ft: 0 });
  // multiplier = sqrt(36+144)/12 = sqrt(180)/12 ~ 1.118
  assert.ok(close(r.multiplier, Math.sqrt(180) / 12, 1e-9));
  assert.ok(close(r.rafter_length_ft, 12 * Math.sqrt(180) / 12, 1e-9));
});

test("Rafter: scales with overhang", () => {
  const a = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12: 6, overhang_ft: 0 });
  const b = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12: 6, overhang_ft: 2 });
  assert.ok(b.rafter_length_ft > a.rafter_length_ft);
});

// --- Utility 43: Area ---

test("Area example: 10 x 12 rectangle = 120 ft^2", () => {
  const r = computeArea(areaExample.inputs);
  assert.equal(r.area_ft2, 120);
});

test("Area: triangle base 10 x height 8 = 40 ft^2", () => {
  const r = computeArea({ shape: "triangle", base_ft: 10, height_ft: 8 });
  assert.equal(r.area_ft2, 40);
});

test("Area: circle radius 5 = pi * 25", () => {
  const r = computeArea({ shape: "circle", radius_ft: 5 });
  assert.ok(close(r.area_ft2, Math.PI * 25, 1e-9));
});

test("Area: trapezoid (b1=8 + b2=12)/2 * h=4 = 40", () => {
  const r = computeArea({ shape: "trapezoid", base1_ft: 8, base2_ft: 12, height_ft: 4 });
  assert.equal(r.area_ft2, 40);
});

// --- Utility 44: Board Footage ---

test("Board footage example: 2x4x8 ft, 10 pieces -> 53.33 bf", () => {
  const r = computeBoardFootage(boardFootageExample.inputs);
  assert.ok(close(r.total_board_feet, boardFootageExample.expected.total_board_feet, 1e-9));
});

test("Board footage: 1x12x12 ft = 12 bf", () => {
  const r = computeBoardFootage({ thickness_in: 1, width_in: 12, length_ft: 12, count: 1 });
  assert.equal(r.board_feet_each, 12);
});

// --- Utility 45: Concrete Volume ---

test("Concrete example: 10x10 slab, 4 in thick -> ~ 1.23 cy", () => {
  const r = computeConcreteVolume(concreteExample.inputs);
  assert.ok(r.cubic_yards > concreteExample.expectedRange.cubic_yards.min);
  assert.ok(r.cubic_yards < concreteExample.expectedRange.cubic_yards.max);
});

test("Concrete: column 12 in dia x 10 ft = pi * 0.5^2 * 10 = 7.85 cf", () => {
  const r = computeConcreteVolume({ shape: "column", diameter_in: 12, height_ft: 10, waste_factor: 0 });
  assert.ok(close(r.cubic_feet, Math.PI * 0.5 * 0.5 * 10, 1e-9));
});

test("Concrete: with waste exceeds without waste", () => {
  const a = computeConcreteVolume({ shape: "slab", length_ft: 10, width_ft: 10, thickness_in: 4, waste_factor: 0 });
  const b = computeConcreteVolume({ shape: "slab", length_ft: 10, width_ft: 10, thickness_in: 4, waste_factor: 0.10 });
  assert.ok(b.cubic_yards_with_waste > a.cubic_yards_with_waste);
});

// --- Utility 46: Rebar ---

test("Rebar: positive total length for typical slab", () => {
  const r = computeRebar({ length_ft: 20, width_ft: 10, spacing_in: 12, edge_clearance_in: 3, bar_size: "#4" });
  assert.ok(r.total_length_ft > 0);
  assert.ok(r.bars_along_length > 0);
  assert.ok(r.bars_along_width > 0);
});

test("Rebar: tighter spacing -> more total length", () => {
  const a = computeRebar({ length_ft: 20, width_ft: 10, spacing_in: 24, edge_clearance_in: 3 });
  const b = computeRebar({ length_ft: 20, width_ft: 10, spacing_in: 6, edge_clearance_in: 3 });
  assert.ok(b.total_length_ft > a.total_length_ft);
});

// --- Utility 47: Lumber Spans ---

test("Lumber spans example: DF-L No.2 2x10 at 50 psf, 16 in tributary", () => {
  const r = computeLumberSpan(lumberSpansExample.inputs);
  assert.ok(r.allowable_span_ft > lumberSpansExample.expectedRange.allowable_span_ft.min);
  assert.ok(r.allowable_span_ft < lumberSpansExample.expectedRange.allowable_span_ft.max);
});

test("Lumber spans: deeper section -> longer allowable span", () => {
  const a = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x6", total_load_psf: 50, tributary_width_in: 16 });
  const b = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 50, tributary_width_in: 16 });
  assert.ok(b.allowable_span_ft > a.allowable_span_ft);
});

test("Lumber spans: higher load -> shorter allowable span", () => {
  const a = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 30, tributary_width_in: 16 });
  const b = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 100, tributary_width_in: 16 });
  assert.ok(b.allowable_span_ft < a.allowable_span_ft);
});

test("Lumber spans: unknown species returns error", () => {
  const r = computeLumberSpan({ species_grade: "Unobtanium", nominal_size: "2x10", total_load_psf: 50, tributary_width_in: 16 });
  assert.ok(r.error);
});

// --- Utility 48: Pullout ---

test("Pullout: 16d nail in DF-L returns positive withdrawal", () => {
  const r = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 1.5 });
  assert.ok(r.total_withdrawal_lb > 0);
});

test("Pullout: screw beats nail of similar size", () => {
  const a = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 1.5 });
  const b = computePullout({ fastener_type: "screw", fastener_size: "1/4", species: "DF-L", penetration_in: 1.5 });
  assert.ok(b.withdrawal_per_inch_lb > a.withdrawal_per_inch_lb);
});

test("Pullout: denser species -> higher withdrawal", () => {
  const a = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "SPF", penetration_in: 1.5 });
  const b = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "SYP", penetration_in: 1.5 });
  assert.ok(b.total_withdrawal_lb > a.total_withdrawal_lb);
});

// --- Utility 49: Beam Loading ---

test("Beam loading: uniform 100 lb/ft over 10 ft -> M = 1250 lb*ft", () => {
  const r = computeBeamLoading({ load_type: "uniform", load_value: 100, length_ft: 10, E_psi: 1.6e6, b_in: 1.5, d_in: 9.25 });
  assert.ok(close(r.M_lbft, 1250, 1e-6));
});

test("Beam loading: point 1000 lb at center, 10 ft span -> M = 2500 lb*ft", () => {
  const r = computeBeamLoading({ load_type: "point_center", load_value: 1000, length_ft: 10, E_psi: 1.6e6, b_in: 1.5, d_in: 9.25 });
  assert.ok(close(r.M_lbft, 2500, 1e-6));
});

// --- Utility 50: Material Quantity ---

test("Material quantity: 1000 ft^2 drywall 4x8 -> at least 32 sheets with waste", () => {
  const r = computeMaterialQuantity({ assembly: "drywall_4x8", area_ft2: 1000 });
  assert.ok(r.units_with_waste >= Math.ceil(1000 / 32));
});

test("Material quantity: unknown assembly returns error", () => {
  const r = computeMaterialQuantity({ assembly: "unobtanium", area_ft2: 100 });
  assert.ok(r.error);
});
