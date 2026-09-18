// A bisection returns the edge of its bracket when the root lies outside it,
// and the edge then reads as an answer. On 2026-09-18 three solvers did this:
// pole embedment stopped at 60 ft, dock piling at 1,000 ft, and the insulation
// surface-limit solve at 12 in. Each answer here is back-substituted into the
// relation it solves, including cases past the old bracket.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computePoleEmbedmentDepth } from "../../calc-geotech.js";
import { computeDockPilingLateral } from "../../calc-mechanic.js";
import { computeInsulationThickness } from "../../calc-hvac.js";

test("pole embedment solves the IBC 1807.3.2.1 relation past the old 60 ft bracket", () => {
  for (const [P, h, b] of [[2000, 15, 1], [50000, 30, 1.5], [100000, 40, 2]]) {
    const r = computePoleEmbedmentDepth({ lateral_force_lb: P, force_height_ft: h, post_width_ft: b, lateral_bearing_psf_per_ft: 100 });
    const d = r.embedment_ft;
    const A = 2.34 * P / (100 * d / 3 * b);
    assert.ok(Math.abs(0.5 * A * (1 + Math.sqrt(1 + 4.36 * h / A)) - d) < 1e-9, `${P} lb: d = ${d}`);
  }
  // The largest case needs 74.6 ft; the fixed bracket had reported 60.
  const big = computePoleEmbedmentDepth({ lateral_force_lb: 100000, force_height_ft: 40, post_width_ft: 2, lateral_bearing_psf_per_ft: 100 });
  assert.ok(big.embedment_ft > 74 && big.embedment_ft < 75);
});

test("dock piling solves its embedment relation past the old 1,000 ft bracket", () => {
  const r = computeDockPilingLateral({ lateral_load_lb: 5e7, height_above_mudline_ft: 50, pile_diameter_in: 12, soil_lateral_bearing_psf_per_ft: 100 });
  const d = r.embedment_ft, b = 1;
  const A = 2.34 * 5e7 / (100 * d / 3 * b);
  assert.ok(d > 1000, `expected a root past 1,000 ft, got ${d}`);
  assert.ok(Math.abs(0.5 * A * (1 + Math.sqrt(1 + 4.36 * 50 / A)) - d) < 1e-6 * d);
});

test("insulation surface-limit solve errors rather than return its 12 in bracket edge", () => {
  const r = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 75.5, k_btu_in_per_hr_ft2_F: 0.27 });
  assert.ok("error" in r);
});

test("insulation alternative-film solve says 'more than 12 in' rather than report 12.00", () => {
  const r = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 77, k_btu_in_per_hr_ft2_F: 0.27, alt_film_coeff_btu_hr_ft2_F: 0.5 });
  assert.equal(r.alt_thickness_in, null);
  assert.ok(r.alt_film_verdict.includes("more than 12 in"));
  // Inside the bracket the alternative solve is unchanged.
  const ok = computeInsulationThickness({ pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 120, k_btu_in_per_hr_ft2_F: 0.27, alt_film_coeff_btu_hr_ft2_F: 4 });
  assert.ok(Math.abs(ok.alt_thickness_in - 0.169157) < 1e-5);
});
