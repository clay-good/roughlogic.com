// v9 §G.2 unit tests for excavation slope and bench-step optimizer.
// Spec-v9 §G.2 calls for 10 unit tests covering 5 / 8 / 12 / 16 / 20 ft
// depths in each soil class.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeExcavationBenchPlan, excavationBenchExample,
  OSHA_SOIL_SLOPES, CONSTRUCTION_RENDERERS,
} from "../../calc-construction.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("excavation: 8 ft Type B 50 ft long no-surcharge -> 18 ft top width / 148 yd^3", () => {
  const r = computeExcavationBenchPlan(excavationBenchExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.top_width_ft, 18, 0.001));
  assert.ok(closePct(r.spoil_volume_yd3, 148.15, 0.5));
  assert.ok(close(r.footprint_ft2, 900, 0.001));
});

test("excavation: Type B 8 ft -> 2 benches of 4 ft each, step 4 ft per bench", () => {
  const r = computeExcavationBenchPlan(excavationBenchExample.inputs);
  assert.ok(r.bench_layout);
  assert.equal(r.bench_layout.bench_count, 2);
  assert.ok(close(r.bench_layout.bench_height_ft, 4, 0.001));
  assert.ok(close(r.bench_layout.horizontal_step_ft, 4, 0.001));
});

test("excavation: Type A (0.75:1) gives a narrower trench than Type B (1:1) at the same depth", () => {
  const a = computeExcavationBenchPlan({ depth_ft: 8, soil_class: "A", length_ft: 50, bottom_width_ft: 2 });
  const b = computeExcavationBenchPlan({ depth_ft: 8, soil_class: "B", length_ft: 50, bottom_width_ft: 2 });
  assert.ok(a.top_width_ft < b.top_width_ft);
  assert.ok(a.spoil_volume_yd3 < b.spoil_volume_yd3);
});

test("excavation: Type C (1.5:1) gives a wider trench and no bench layout", () => {
  const r = computeExcavationBenchPlan({ depth_ft: 8, soil_class: "C", length_ft: 50, bottom_width_ft: 2 });
  // ratio = 1.5; offset = 12; top width = 26.
  assert.ok(close(r.top_width_ft, 26, 0.001));
  assert.equal(r.bench_layout, null);
  assert.ok(r.warnings.some((w) => /Type C soil/.test(w)));
});

test("excavation: surcharge adds 0.25 to the H:V ratio", () => {
  const base = computeExcavationBenchPlan({ depth_ft: 8, soil_class: "B", length_ft: 50 });
  const sur = computeExcavationBenchPlan({ depth_ft: 8, soil_class: "B", surcharge: true, length_ft: 50 });
  // base ratio 1.0; surcharge ratio 1.25.
  assert.ok(close(base.ratio_H_to_V, 1.0, 0.001));
  assert.ok(close(sur.ratio_H_to_V, 1.25, 0.001));
  assert.ok(sur.spoil_volume_yd3 > base.spoil_volume_yd3);
});

test("excavation: depth below 5 ft surfaces an 'AHJ may waive sloping' warning", () => {
  const r = computeExcavationBenchPlan({ depth_ft: 4, soil_class: "B", length_ft: 30 });
  assert.ok(r.warnings.some((w) => /does not require sloping/.test(w)));
});

test("excavation: depth above 20 ft rejects (PE design required per 1926.652(b)(4))", () => {
  const r = computeExcavationBenchPlan({ depth_ft: 25, soil_class: "B", length_ft: 50 });
  assert.ok(r.error);
  assert.match(r.error, /professional engineer/);
});

test("excavation: rejects zero / negative depth, length, bottom width, and unknown soil class", () => {
  assert.ok(computeExcavationBenchPlan({ depth_ft: 0, soil_class: "B", length_ft: 50 }).error);
  assert.ok(computeExcavationBenchPlan({ depth_ft: 8, soil_class: "B", length_ft: 0 }).error);
  assert.ok(computeExcavationBenchPlan({ depth_ft: 8, soil_class: "B", length_ft: 50, bottom_width_ft: 0 }).error);
  assert.ok(computeExcavationBenchPlan({ depth_ft: 8, soil_class: "Z", length_ft: 50 }).error);
});

test("excavation: 12 ft / 16 ft / 20 ft Type B span increases volume proportionally", () => {
  const v12 = computeExcavationBenchPlan({ depth_ft: 12, soil_class: "B", length_ft: 50 }).spoil_volume_yd3;
  const v16 = computeExcavationBenchPlan({ depth_ft: 16, soil_class: "B", length_ft: 50 }).spoil_volume_yd3;
  const v20 = computeExcavationBenchPlan({ depth_ft: 20, soil_class: "B", length_ft: 50 }).spoil_volume_yd3;
  assert.ok(v12 < v16 && v16 < v20);
});

test("excavation: OSHA_SOIL_SLOPES exposes all three soil classes with sensible values", () => {
  for (const k of ["A", "B", "C"]) {
    const s = OSHA_SOIL_SLOPES[k];
    assert.ok(s && s.ratio_H_to_V > 0 && s.soil_label.length > 0);
  }
});

test("excavation: CONSTRUCTION_RENDERERS exposes excavation-bench-plan", () => {
  assert.equal(typeof CONSTRUCTION_RENDERERS["excavation-bench-plan"], "function");
});
