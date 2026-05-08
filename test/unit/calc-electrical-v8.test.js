// v8 Phase E.1 - utility 254 panel-rebalance.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePanelRebalance, panelRebalanceExample, ELECTRICAL_RENDERERS,
} from "../../calc-electrical.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("254 example yields per-phase totals", () => {
  const r = computePanelRebalance(panelRebalanceExample.inputs);
  assert.equal(r.totals_A_amps, 65); // 20 + 15 + 30
  assert.equal(r.totals_B_amps, 22); // 10 + 12
  assert.equal(r.totals_C_amps, 12);
});

test("254 imbalance % = (max - min) / mean × 100", () => {
  const r = computePanelRebalance({ circuits: [
    { description: "x", amps: 30, phase: "A" },
    { description: "y", amps: 30, phase: "A" }, // A=60
    { description: "z", amps: 30, phase: "B" }, // B=30
    { description: "w", amps: 30, phase: "C" }, // C=30
  ] });
  // mean = 40; max-min = 30; imbalance = 75%
  assert.ok(close(r.imbalance_pct, 75, 0.01));
});

test("254 balanced panel yields 0 imbalance", () => {
  const r = computePanelRebalance({ circuits: [
    { description: "a", amps: 20, phase: "A" },
    { description: "b", amps: 20, phase: "B" },
    { description: "c", amps: 20, phase: "C" },
  ] });
  assert.equal(r.imbalance_pct, 0);
  assert.equal(r.suggestion, null);
});

test("254 swap suggestion fires when imbalance > 5%", () => {
  const r = computePanelRebalance(panelRebalanceExample.inputs);
  assert.ok(r.suggestion);
  assert.equal(r.suggestion.from_phase, "A");
  assert.equal(r.suggestion.to_phase, "C");
});

test("254 suggestion improves the imbalance", () => {
  const r = computePanelRebalance(panelRebalanceExample.inputs);
  assert.ok(r.suggestion.projected_imbalance_pct < r.imbalance_pct);
});

test("254 negative amps errors", () => {
  const r = computePanelRebalance({ circuits: [{ description: "x", amps: -10, phase: "A" }] });
  assert.ok(r.error);
});

test("254 unknown phase errors", () => {
  const r = computePanelRebalance({ circuits: [{ description: "x", amps: 20, phase: "D" }] });
  assert.ok(r.error);
});

test("254 empty circuit list errors", () => {
  const r = computePanelRebalance({ circuits: [] });
  assert.ok(r.error);
});

test("254 swappable_pairs constraint excludes circuits not listed", () => {
  // Heaviest circuit on A is index 0 (30 A); restrict swaps to index 1 + 2 only.
  const r = computePanelRebalance({
    circuits: [
      { description: "main-load", amps: 30, phase: "A" },
      { description: "small-1", amps: 5, phase: "A" },
      { description: "tiny-1", amps: 2, phase: "B" },
      { description: "tiny-2", amps: 1, phase: "C" },
    ],
    swappable_pairs: [[1, 2], [1, 3]],
  });
  // The 30 A circuit is at index 0; not in any swappable pair, so it cannot move.
  // The small-1 (5 A) is the only A-side circuit eligible to move.
  assert.ok(r.suggestion);
  assert.equal(r.suggestion.move_circuit_index, 1);
});

test("254 ELECTRICAL_RENDERERS exposes panel-rebalance", () => {
  assert.equal(typeof ELECTRICAL_RENDERERS["panel-rebalance"], "function");
});
