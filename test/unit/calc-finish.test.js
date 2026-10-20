// Independent checks for calc-finish.js tiles whose only other coverage is the
// project's own derivation (hardening, 2026-10-15). Each test holds the compute
// to something its derivation did not write: a published constant converted
// from its definition, a brute-force count, or an invariant.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGlassWeight, computeFlooringTakeoff, computePaverPatio,
  computeStepFlashingCount, computeGutterDownspoutTakeoff, computeTextureMaterialTakeoff,
} from "../../calc-finish.js";

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// ---- glass-weight ----
// NGA FM01-08 gives the density as 2531 kg/m^3. Convert with the exact SI
// definitions (1 ft = 0.3048 m, 1 lb = 0.45359237 kg) rather than trusting the
// 158 the code carries.
test("glass-weight: 1 ft^2 x 1 in equals 2531 kg/m^3 converted by exact SI factors", () => {
  const lbPerFt3 = 2531 * 0.3048 ** 3 / 0.45359237; // 158.006
  const r = computeGlassWeight({ width_in: 12, height_in: 12, thickness_in: 1, panes: 1 });
  assert.ok(rel(r.weight_lb, lbPerFt3 / 12) < 5e-4, `got ${r.weight_lb}, want ${lbPerFt3 / 12}`);
});
test("glass-weight: a 2-pane IGU is twice one lite, and weight scales with area and thickness", () => {
  const one = computeGlassWeight({ width_in: 60, height_in: 40, thickness_in: 0.25, panes: 1 }).weight_lb;
  assert.ok(rel(computeGlassWeight({ width_in: 60, height_in: 40, thickness_in: 0.25, panes: 2 }).weight_lb, 2 * one) < 1e-12);
  assert.ok(rel(computeGlassWeight({ width_in: 120, height_in: 40, thickness_in: 0.5, panes: 1 }).weight_lb, 4 * one) < 1e-12);
});

// ---- flooring-takeoff ----
// Brute force: lay planks across the usable width one at a time, and find the
// box count by adding boxes until their coverage reaches the order area.
test("flooring-takeoff: rows and boxes match a plank-by-plank and box-by-box count", () => {
  for (const [L, W, plank, gap, cov, pat] of [[15, 12, 7.5, 0, 20, "straight"], [14, 11, 5, 0.375, 22.5, "diagonal"], [20, 9.5, 6.25, 0.25, 18, "herringbone"]]) {
    const r = computeFlooringTakeoff({ room_length_ft: L, room_width_ft: W, box_coverage_sqft: cov, pattern: pat, plank_width_in: plank, expansion_gap_in: gap });
    const usable = W * 12 - 2 * gap;
    let rows = 0, left = usable;
    while (left >= plank - 1e-9) { rows++; left -= plank; }
    assert.equal(r.full_rows, rows);
    assert.ok(Math.abs(r.remainder - left) < 1e-6);
    const waste = { straight: 10, diagonal: 15, herringbone: 17 }[pat];
    let boxes = 0;
    while (boxes * cov < L * W * (1 + waste / 100) - 1e-9) boxes++;
    assert.equal(r.boxes, boxes);
  }
});
test("flooring-takeoff: a ripped first and last row plus the full rows between fill the usable width exactly", () => {
  // 12 ft room less two 1/4 in gaps = 143.5 in; 7.5 in planks: 19 full rows leave a 1.0 in sliver (< 2.5 in).
  const r = computeFlooringTakeoff({ room_length_ft: 15, room_width_ft: 12, box_coverage_sqft: 20, pattern: "straight", plank_width_in: 7.5, expansion_gap_in: 0.25 });
  assert.equal(r.rip_needed, true);
  assert.ok(Math.abs(2 * r.start_width + (r.full_rows - 1) * 7.5 - 143.5) < 1e-9);
  assert.ok(r.start_width >= 7.5 / 3 && r.start_width < 7.5);
  // No gap entered: 144 = 19 x 7.5 + 1.5, still a rip, and the balance holds on the full width.
  const r0 = computeFlooringTakeoff({ room_length_ft: 15, room_width_ft: 12, box_coverage_sqft: 20, pattern: "straight", plank_width_in: 7.5 });
  assert.ok(Math.abs(2 * r0.start_width + (r0.full_rows - 1) * 7.5 - 144) < 1e-9);
});

// ---- paver-patio ----
// Brute force: tile a rectangular patio with whole pavers on a grid and count
// them (dimensions that divide the patio, so no cut pieces); ICPI's printed "4 x 8 in paver = 4.5 per sq ft" is the anchor.
test("paver-patio: pavers per sq ft match a grid count of a 10 x 20 ft patio (4.5/sq ft for 4 x 8 in)", () => {
  for (const [pl, pw] of [[8, 4], [6, 6], [12, 6], [10, 5], [7.5, 3.75]]) {
    let n = 0;
    for (let x = 0; x + pl <= 240 + 1e-9; x += pl) for (let y = 0; y + pw <= 120 + 1e-9; y += pw) n++;
    const r = computePaverPatio({ area_sqft: 200, paver_length_in: pl, paver_width_in: pw, waste_pct: 0 });
    assert.equal(r.pavers, n, `${pl}x${pw}`);
  }
  assert.equal(computePaverPatio({ area_sqft: 1, paver_length_in: 8, paver_width_in: 4, waste_pct: 0 }).pavers_per_sqft, 4.5);
});
test("paver-patio: base and sand volumes equal area x depth in cubic feet over 27", () => {
  const r = computePaverPatio({ area_sqft: 200, paver_length_in: 8, paver_width_in: 4, base_depth_in: 6, sand_depth_in: 1, waste_pct: 5 });
  assert.ok(Math.abs(r.base_cuyd - (200 * 0.5) / 27) < 1e-12);
  assert.ok(Math.abs(r.sand_cuyd - (200 * (1 / 12)) / 27) < 1e-12);
});

// ---- step-flashing-count ----
// Brute force in 1/8 in units: walk up the sloped run one shingle course at a
// time, one piece per course that starts below the top, plus the starter.
test("step-flashing-count: matches a course-by-course walk up the run", () => {
  for (const [run_ft, exp_in] of [[20, 5], [20.25, 5], [13.5, 5.625], [7, 8], [1, 5], [33.3, 5.875]]) {
    const run8 = Math.round(run_ft * 96), exp8 = Math.round(exp_in * 8);
    let pieces = 1, y = 0; // starter piece
    while (y < run8) { pieces++; y += exp8; }
    assert.equal(computeStepFlashingCount({ wall_run_ft: run_ft, shingle_exposure_in: exp_in, waste_pct: 0 }).step_flashing_pieces, pieces, `${run_ft} ft @ ${exp_in} in`);
  }
});
test("step-flashing-count: a longer exposure never needs more pieces", () => {
  let prev = Infinity;
  for (let e = 4; e <= 8; e += 0.125) {
    const p = computeStepFlashingCount({ wall_run_ft: 20, shingle_exposure_in: e, waste_pct: 0 }).step_flashing_pieces;
    assert.ok(p <= prev); prev = p;
  }
});

// ---- gutter-downspout-takeoff ----
// Brute force: add downspouts until their combined drainage covers the roof,
// and hangers until no hanger serves more than the spacing.
test("gutter-downspout-takeoff: downspouts, pipe and hangers match an add-one-until-covered count", () => {
  for (const [eave, area, per, h, s] of [[140, 2400, 800, 10, 2], [97, 2401, 800, 18, 2], [55.5, 1200, 600, 9, 3], [210, 5000, 700, 22, 1.5]]) {
    const r = computeGutterDownspoutTakeoff({ eave_length_ft: eave, roof_area_sf: area, max_area_per_downspout_sf: per, wall_height_ft: h, hanger_spacing_ft: s });
    let d = 0; while (d * per < area) d++;
    let k = 0; while (k * s < eave) k++;
    assert.equal(r.downspouts, d);
    assert.equal(r.downspout_pipe_lf, d * h);
    assert.equal(r.hangers, k);
    assert.equal(r.gutter_lf, eave);
  }
});

// ---- texture-material-takeoff ----
test("texture-material-takeoff: bags match an add-a-bag count and deducting an opening equals shrinking the gross", () => {
  for (const [g, o, cov, w] of [[2400, 0, 225, 10], [2400, 0, 120, 10], [2400, 0, 350, 10], [1800, 140, 200, 15]]) {
    const r = computeTextureMaterialTakeoff({ gross_area_sqft: g, openings_sqft: o, coverage_per_bag_sqft: cov, waste_pct: w, bag_weight_lb: 40, water_gal_per_bag: 1.4 });
    let n = 0; while (n * cov < (g - o) * (1 + w / 100) - 1e-9) n++;
    assert.equal(r.bags_required, n);
    assert.equal(r.dry_weight_lb, n * 40);
    assert.ok(Math.abs(r.mix_water_gal - n * 1.4) < 1e-9);
    const r2 = computeTextureMaterialTakeoff({ gross_area_sqft: g - o, openings_sqft: 0, coverage_per_bag_sqft: cov, waste_pct: w, bag_weight_lb: 40, water_gal_per_bag: 1.4 });
    assert.equal(r2.bags_required, r.bags_required);
  }
});

// spec-v1987: lay the tiles out one by one and measure the cuts, instead of the closed form.
import { computeTileLayoutCutBalance as _layout } from "../../calc-finish.js";
test("tile-layout-cut-balance: placing tiles one at a time from the center or the wall gives the same cuts", () => {
  for (const [run, tile, j] of [[132, 12, 0.125], [150, 12, 0.1875], [97, 6, 0.125], [100, 24, 0.0625], [61, 4.25, 0.25]]) {
    const r = _layout({ run_in: run, tile_in: tile, joint_in: j });
    // Start full: keep adding tile + joint while the next tile still fits before the wall.
    let x = 0, n = 0;
    while (x + tile <= run + 1e-9) { x += tile; n++; if (x + j + tile <= run + 1e-9) x += j; else break; }
    const leftover = run - x;
    assert.ok(Math.abs(r.start_full_cut_in - (leftover > 1e-9 ? leftover - j : 0)) < 1e-9, "start full " + run);
    // Centered on a tile: grow symmetric pairs around a center tile while room remains for a joint.
    let span = tile, k = 1;
    while (span + 2 * (j + tile) + 2 * j <= run + 1e-9) { span += 2 * (j + tile); k += 2; }
    assert.equal(r.tile_centered_count, k, "tile-centered count " + run);
    assert.ok(Math.abs(r.tile_centered_cut_in - Math.max(0, (run - span) / 2 - j)) < 1e-9, "tile-centered cut " + run);
  }
});
