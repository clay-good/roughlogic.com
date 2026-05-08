// Unit tests for calc-stage.js v4 utilities (216-221).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTrussCapacity, trussExample, TRUSS_CAPACITY_CURVES,
  computeTimeAlignment, timeAlignmentExample,
  computeDMX, dmxExample,
  computeNeutralImbalance, neutralImbalanceExample,
  computeSPL, splExample, SPL_MODES,
  computeRiggingCheck, riggingExample, RIGGING_HARDWARE,
  STAGE_RENDERERS,
} from "../../calc-stage.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 216 Truss
test("Truss: example pass", () => { const r = computeTrussCapacity(trussExample.inputs); assert.equal(r.pass, true); assert.ok(r.udl_max_lb_per_ft > 0); });
test("Truss: unknown model errors", () => { const r = computeTrussCapacity({ truss_model: "x", span_ft: 30, point_loads: [] }); assert.ok(r.error); });
test("Truss: zero span errors", () => { const r = computeTrussCapacity({ truss_model: "16in_box", span_ft: 0, point_loads: [] }); assert.ok(r.error); });
test("Truss: point load past span errors", () => { const r = computeTrussCapacity({ truss_model: "16in_box", span_ft: 20, point_loads: [{ weight_lb: 100, position_ft: 30 }] }); assert.ok(r.error); });
test("Truss: heavy load fails", () => { const r = computeTrussCapacity({ truss_model: "12in_box", span_ft: 50, point_loads: [{ weight_lb: 5000, position_ft: 25 }] }); assert.equal(r.pass, false); });
test("Truss: shorter span -> higher UDL", () => { const a = computeTrussCapacity({ truss_model: "16in_box", span_ft: 10, point_loads: [] }); const b = computeTrussCapacity({ truss_model: "16in_box", span_ft: 50, point_loads: [] }); assert.ok(a.udl_max_lb_per_ft > b.udl_max_lb_per_ft); });
test("Truss: reactions sum to total point load", () => { const r = computeTrussCapacity({ truss_model: "16in_box", span_ft: 30, point_loads: [{ weight_lb: 200, position_ft: 10 }, { weight_lb: 200, position_ft: 20 }] }); assert.ok(close(r.reaction_a_lb + r.reaction_b_lb, 400, 0.01)); });
test("Truss: no point loads -> reactions zero", () => { const r = computeTrussCapacity({ truss_model: "16in_box", span_ft: 20, point_loads: [] }); assert.equal(r.reaction_a_lb, 0); assert.equal(r.reaction_b_lb, 0); });
test("Truss: every model has positive points", () => { for (const k of Object.keys(TRUSS_CAPACITY_CURVES)) assert.ok(TRUSS_CAPACITY_CURVES[k].points.length > 0); });
test("Truss: attribution string set", () => { const r = computeTrussCapacity(trussExample.inputs); assert.ok(r.attribution.length > 0); });

// 217 Time alignment
test("Align: example yields finite ms", () => { const r = computeTimeAlignment(timeAlignmentExample.inputs); assert.ok(r.recommended_delay_ms > 0); });
test("Align: speed of sound at 20 C ~ 343 m/s", () => { const r = computeTimeAlignment({ d_main_ft: 100, d_delay_ft: 0, ambient_C: 20 }); assert.ok(close(r.c_m_s, 343.42, 0.5)); });
test("Align: zero delay distance -> diff = main / c", () => { const r = computeTimeAlignment({ d_main_ft: 100, d_delay_ft: 0, ambient_C: 20, haas_offset_ms: 0 }); assert.ok(close(r.ms_difference, (100 * 0.3048 / r.c_m_s) * 1000, 0.01)); });
test("Align: hot day faster sound", () => { const a = computeTimeAlignment({ d_main_ft: 100, d_delay_ft: 0, ambient_C: 0 }); const b = computeTimeAlignment({ d_main_ft: 100, d_delay_ft: 0, ambient_C: 30 }); assert.ok(b.c_m_s > a.c_m_s); });
test("Align: negative main distance errors", () => { const r = computeTimeAlignment({ d_main_ft: -10, d_delay_ft: 0, ambient_C: 20 }); assert.ok(r.error); });
test("Align: delay > main -> negative ms_diff", () => { const r = computeTimeAlignment({ d_main_ft: 30, d_delay_ft: 80, ambient_C: 20 }); assert.ok(r.ms_difference < 0); });
test("Align: haas adds to recommended", () => { const r = computeTimeAlignment({ d_main_ft: 80, d_delay_ft: 30, ambient_C: 20, haas_offset_ms: 15 }); assert.ok(close(r.recommended_delay_ms, r.ms_difference + 15, 0.01)); });
test("Align: zero distances finite", () => { const r = computeTimeAlignment({ d_main_ft: 0, d_delay_ft: 0, ambient_C: 20, haas_offset_ms: 0 }); assert.equal(r.ms_difference, 0); });
test("Align: 20 C base value", () => { const r = computeTimeAlignment({ d_main_ft: 0, d_delay_ft: 0, ambient_C: 20 }); assert.ok(close(r.c_m_s, 331.3 + 0.606 * 20, 0.001)); });
test("Align: hot vs cold linear in T_C", () => { const r = computeTimeAlignment({ d_main_ft: 0, d_delay_ft: 0, ambient_C: 25 }); assert.ok(close(r.c_m_s, 331.3 + 0.606 * 25, 0.001)); });

// 218 DMX
test("DMX: example yields ranges", () => { const r = computeDMX(dmxExample.inputs); assert.equal(r.ranges.length, 4); });
test("DMX: detects conflict", () => { const r = computeDMX({ fixtures: [{ name: "a", start: 1, channels: 20, universe: 1 }, { name: "b", start: 10, channels: 5, universe: 1 }] }); assert.ok(r.conflicts.length > 0); });
test("DMX: detects overflow past 512", () => { const r = computeDMX({ fixtures: [{ name: "x", start: 500, channels: 50, universe: 1 }] }); assert.equal(r.split_recommended, true); });
test("DMX: utilization percent under 100", () => { const r = computeDMX(dmxExample.inputs); assert.ok(r.utilization[1] < 100); });
test("DMX: empty list errors", () => { const r = computeDMX({ fixtures: [] }); assert.ok(r.error); });
test("DMX: bad start address errors", () => { const r = computeDMX({ fixtures: [{ name: "x", start: 0, channels: 5, universe: 1 }] }); assert.ok(r.error); });
test("DMX: zero channels errors", () => { const r = computeDMX({ fixtures: [{ name: "x", start: 1, channels: 0, universe: 1 }] }); assert.ok(r.error); });
test("DMX: max universe tracked", () => { const r = computeDMX({ fixtures: [{ name: "x", start: 1, channels: 5, universe: 3 }] }); assert.equal(r.max_universe, 3); });
test("DMX: contiguous fixtures no conflict", () => { const r = computeDMX({ fixtures: [{ name: "a", start: 1, channels: 12, universe: 1 }, { name: "b", start: 13, channels: 12, universe: 1 }] }); assert.equal(r.conflicts.length, 0); });
test("DMX: separate universes don't conflict", () => { const r = computeDMX({ fixtures: [{ name: "a", start: 1, channels: 100, universe: 1 }, { name: "b", start: 1, channels: 100, universe: 2 }] }); assert.equal(r.conflicts.length, 0); });

// 219 Neutral imbalance
test("Neutral: balanced -> 0 A", () => { const r = computeNeutralImbalance({ I_A: 50, I_B: 50, I_C: 50, harmonic_loads: false }); assert.ok(close(r.neutral_A, 0, 1e-6)); });
test("Neutral: example yields finite", () => { const r = computeNeutralImbalance(neutralImbalanceExample.inputs); assert.ok(r.neutral_A >= 0); });
test("Neutral: harmonic warning when flagged", () => { const r = computeNeutralImbalance({ I_A: 50, I_B: 45, I_C: 40, harmonic_loads: true }); assert.ok(r.harmonic_warning !== null); });
test("Neutral: no warning when not flagged", () => { const r = computeNeutralImbalance({ I_A: 50, I_B: 45, I_C: 40, harmonic_loads: false }); assert.equal(r.harmonic_warning, null); });
test("Neutral: negative current errors", () => { const r = computeNeutralImbalance({ I_A: -1, I_B: 0, I_C: 0, harmonic_loads: false }); assert.ok(r.error); });
test("Neutral: imbalance % from max-min/avg", () => { const r = computeNeutralImbalance({ I_A: 60, I_B: 40, I_C: 50, harmonic_loads: false }); assert.ok(close(r.imbalance_percent, ((60 - 40) / 50) * 100, 0.01)); });
test("Neutral: A only -> N = A", () => { const r = computeNeutralImbalance({ I_A: 50, I_B: 0, I_C: 0, harmonic_loads: false }); assert.ok(close(r.neutral_A, 50, 0.001)); });
test("Neutral: zero everything -> 0", () => { const r = computeNeutralImbalance({ I_A: 0, I_B: 0, I_C: 0, harmonic_loads: false }); assert.equal(r.neutral_A, 0); });
test("Neutral: harmonic warning string non-empty", () => { const r = computeNeutralImbalance({ I_A: 30, I_B: 30, I_C: 30, harmonic_loads: true }); assert.ok(r.harmonic_warning.length > 10); });
test("Neutral: 100/0/0 worst-case", () => { const r = computeNeutralImbalance({ I_A: 100, I_B: 0, I_C: 0, harmonic_loads: false }); assert.ok(close(r.neutral_A, 100, 0.01)); });

// 220 SPL
test("SPL: example finite", () => { const r = computeSPL(splExample.inputs); assert.ok(r.L2_dB > 0); });
test("SPL: 110 dB at 1 m -> 80.5 at 30 m free field", () => { const r = computeSPL({ L1_dB: 110, d1: 1, d2: 30, mode: "free_field" }); assert.ok(close(r.L2_dB, 110 - 20 * Math.log10(30), 0.01)); });
test("SPL: hemispherical adds 3 dB", () => { const r = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "hemispherical" }); assert.ok(close(r.L2_dB, 100 - 20 * Math.log10(10) + 3, 0.01)); });
test("SPL: indoors adds 6 dB", () => { const r = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "indoors" }); assert.ok(close(r.L2_dB, 100 - 20 * Math.log10(10) + 6, 0.01)); });
test("SPL: doubling distance drops 6 dB", () => { const a = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "free_field" }); const b = computeSPL({ L1_dB: 100, d1: 1, d2: 20, mode: "free_field" }); assert.ok(close(a.L2_freefield_dB - b.L2_freefield_dB, 6.02, 0.05)); });
test("SPL: zero d1 errors", () => { const r = computeSPL({ L1_dB: 100, d1: 0, d2: 10, mode: "free_field" }); assert.ok(r.error); });
test("SPL: unknown mode errors", () => { const r = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "x" }); assert.ok(r.error); });
test("SPL: every mode has factor", () => { for (const k of Object.keys(SPL_MODES)) assert.ok(Number.isFinite(SPL_MODES[k].factor)); });
test("SPL: same distance returns same SPL", () => { const r = computeSPL({ L1_dB: 95, d1: 5, d2: 5, mode: "free_field" }); assert.ok(close(r.L2_freefield_dB, 95, 0.01)); });
test("SPL: greater distance smaller SPL", () => { const a = computeSPL({ L1_dB: 100, d1: 1, d2: 5, mode: "free_field" }); const b = computeSPL({ L1_dB: 100, d1: 1, d2: 50, mode: "free_field" }); assert.ok(b.L2_freefield_dB < a.L2_freefield_dB); });

// 221 Rigging check
test("Rigging: example pass", () => { const r = computeRiggingCheck(riggingExample.inputs); assert.ok(typeof r.pass === "boolean"); });
test("Rigging: vertical = load / n", () => { const r = computeRiggingCheck({ hardware: "shackle_3_4_5T", configuration: "vertical", load_lb: 1000, included_angle_deg: 0, n_legs: 2 }); assert.equal(r.tension_per_leg_lb, 500); });
test("Rigging: choker derate 0.75", () => { const r = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "choker", load_lb: 1000, included_angle_deg: 60, n_legs: 2 }); assert.equal(r.derate_factor, 0.75); });
test("Rigging: small angle blows up tension", () => { const r = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "basket", load_lb: 1000, included_angle_deg: 1, n_legs: 2 }); assert.ok(r.tension_per_leg_lb > 30000); });
test("Rigging: unknown hardware errors", () => { const r = computeRiggingCheck({ hardware: "x", configuration: "vertical", load_lb: 1000, included_angle_deg: 0, n_legs: 2 }); assert.ok(r.error); });
test("Rigging: unknown config errors", () => { const r = computeRiggingCheck({ hardware: "shackle_3_4_5T", configuration: "swag", load_lb: 1000, included_angle_deg: 0, n_legs: 2 }); assert.ok(r.error); });
test("Rigging: 180 deg angle errors", () => { const r = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "basket", load_lb: 1000, included_angle_deg: 180, n_legs: 2 }); assert.ok(r.error); });
test("Rigging: heavy load fails", () => { const r = computeRiggingCheck({ hardware: "hoist_chain_1T", configuration: "vertical", load_lb: 5000, included_angle_deg: 0, n_legs: 1 }); assert.equal(r.pass, false); });
test("Rigging: every hardware has positive WLL", () => { for (const k of Object.keys(RIGGING_HARDWARE)) assert.ok(RIGGING_HARDWARE[k].wll_lb > 0); });
test("Rigging: bridle treated like basket", () => { const a = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "basket", load_lb: 1000, included_angle_deg: 60, n_legs: 2 }); const b = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "bridle", load_lb: 1000, included_angle_deg: 60, n_legs: 2 }); assert.ok(close(a.tension_per_leg_lb, b.tension_per_leg_lb, 0.001)); });

// Renderers
test("STAGE_RENDERERS: 6 ids", () => { for (const id of ["truss-capacity","time-alignment","dmx-planner","neutral-imbalance","spl-distance","rigging-check"]) assert.equal(typeof STAGE_RENDERERS[id], "function", id); });
