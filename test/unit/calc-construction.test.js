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

test("snow drift: a drift taller than the step is cut to hc, so the surcharge is hc x gamma over the wider base", async () => {
  // ASCE 7-22 7.7.1. Until 2026-10-03 pd used the uncut hd (4.99 ft) over the 16 ft base.
  const { computeSnowDriftLoad } = await import("../../calc-construction.js");
  const r = computeSnowDriftLoad({ lu_ft: 200, pg_psf: 50, hc_ft: 2, w2: 0.5 });
  assert.ok(r.hd_ft > 2);
  assert.ok(Math.abs(r.pd_psf - 2 * r.gamma_pcf) < 1e-9);
  assert.equal(r.w_ft, 16); // min(4 hd^2 / hc, 8 hc)
});

// =====================================================================
// Hardening 2026-10-15: independent checks for twenty spec-only tiles.
// Each test holds a tile to a source its own derivation did not write: a
// published value, a constant re-derived from its definition, a brute-force
// or numerical method, or an invariant the cited relation places on itself.
// =====================================================================

const _cc = () => import("../../calc-construction.js");

test("shotcrete-rebound: rebound is a fraction of what is SHOT (ACI 506R definition), and shooting the order lands the design thickness", async () => {
  const { computeShotcreteReboundQuantity } = await _cc();
  for (const pct of [5, 15, 25, 35]) {
    const r = computeShotcreteReboundQuantity({ area_sf: 800, thickness_in: 3, rebound_pct: pct });
    // in place re-derived: 800 ft^2 x 0.25 ft = 200 ft^3; 27 ft^3 per yd^3.
    assert.ok(Math.abs(r.in_place_cy - 200 / 27) < 1e-9);
    // ACI 506R: rebound percentage = rebound mass / mass shot (not / in place).
    assert.ok(Math.abs(r.rebound_cy / r.shot_cy - pct / 100) < 1e-9);
    // Round trip: shoot exactly the order and the wall carries the design section.
    const back = computeShotcreteReboundQuantity({ area_sf: 800, thickness_in: 3, rebound_pct: pct, shot_actual_cy: r.shot_cy });
    assert.ok(Math.abs(back.achieved_thickness_in - 3) < 1e-9);
    assert.equal(back.thickness_ok, true);
  }
});

test("stockpile-volume: cone volume matches a disk-slice numerical integral; a 3-4-5 repose angle gives h = 0.75 r exactly", async () => {
  const { computeStockpileVolume } = await _cc();
  const ang = Math.atan(3 / 4) * 180 / Math.PI; // 36.87 deg, tan = 0.75
  const r = computeStockpileVolume({ base_diameter_ft: 48, repose_angle_deg: ang, density_pcf: 110 });
  assert.ok(Math.abs(r.height_ft - 18) < 1e-9);
  // Midpoint-rule integral of pi r(z)^2 dz, r(z) = 24 (1 - z/18).
  const n = 20000, h = 18; let v = 0;
  for (let i = 0; i < n; i++) { const z = (i + 0.5) * h / n; const rz = 24 * (1 - z / h); v += Math.PI * rz * rz * h / n; }
  assert.ok(Math.abs(r.volume_ft3 - v) / v < 1e-6);
  assert.ok(Math.abs(r.volume_cy * 27 - r.volume_ft3) < 1e-6);
  assert.ok(Math.abs(r.tons - v * 110 / 2000) / r.tons < 1e-6);
  // Scaling: volume goes with diameter cubed at a fixed angle.
  const r2 = computeStockpileVolume({ base_diameter_ft: 96, repose_angle_deg: ang, density_pcf: 110 });
  assert.ok(Math.abs(r2.volume_ft3 / r.volume_ft3 - 8) < 1e-9);
});

test("welded-wire-mesh: area count matches a brute-force lapped grid layout on a large slab, and with no laps it is the plain sheet count", async () => {
  const { computeWeldedWireMesh } = await _cc();
  // No laps, no waste: a 50 x 100 ft slab is exactly 100 sheets of 5 x 10.
  assert.equal(computeWeldedWireMesh({ slab_area_sf: 5000, side_lap_in: 0, end_lap_in: 0, waste_pct: 0 }).sheets, 100);
  // Brute-force layout: sheets laid in rows and columns, each lapping its neighbor by 6 in.
  const W = 300, L = 600, sw = 5, sl = 10, lap = 0.5;
  let cols = 1; while (sw + (cols - 1) * (sw - lap) < W) cols++;
  let rows = 1; while (sl + (rows - 1) * (sl - lap) < L) rows++;
  const grid = cols * rows;
  const r = computeWeldedWireMesh({ slab_area_sf: W * L, sheet_width_ft: sw, sheet_length_ft: sl, side_lap_in: 6, end_lap_in: 6, waste_pct: 0 });
  assert.ok(r.sheets <= grid, "area method never exceeds the full-sheet grid here");
  assert.ok(grid / r.sheets < 1.03, "laps at both edges of a big slab are a small correction: " + grid + " vs " + r.sheets);
  // A lap read in feet (or ignored) would miss this by far more than 3%.
  assert.ok(Math.abs(r.effective_sheet_sf - 4.5 * 9.5) < 1e-9);
});

test("fence-estimate: posts and pickets match a brute-force walk of the run", async () => {
  const { computeFenceEstimate } = await _cc();
  for (const [L, s, w, g] of [[120, 8, 5.5, 0.25], [96, 8, 3.5, 2], [97, 8, 5.5, 0], [10, 6, 1.5, 1.5]]) {
    const r = computeFenceEstimate({ length_ft: L, post_spacing_ft: s, rails_per_section: 2, picket_width_in: w, picket_gap_in: g });
    // Walk: a post at 0, then step the spacing until the end is reached (the last post sits at the end).
    let posts = 1, x = 0; while (x < L - 1e-9) { x = Math.min(L, x + s); posts++; }
    assert.equal(r.posts, posts, "posts for " + L + " ft at " + s);
    assert.equal(r.rails, (posts - 1) * 2);
    // Walk: lay picket + gap modules until the run (in inches) is covered.
    let pk = 0, y = 0; while (y < L * 12 - 1e-9) { y += w + g; pk++; }
    assert.equal(r.pickets, pk);
  }
});

test("post-hole-concrete: per-hole concrete matches a grid integration of the circle less the square post", async () => {
  const { computePostHoleConcrete } = await _cc();
  const D = 10, depth = 30, side = 3.5;
  const r = computePostHoleConcrete({ num_posts: 1, hole_diameter_in: D, hole_depth_in: depth, post_side_in: side, bag_yield_cuft: 0.6 });
  // Count 0.01 in cells inside the circle and outside the centered square.
  const h = 0.01; let cells = 0;
  for (let x = -D / 2 + h / 2; x < D / 2; x += h) for (let y = -D / 2 + h / 2; y < D / 2; y += h) {
    if (x * x + y * y <= (D / 2) ** 2 && !(Math.abs(x) < side / 2 && Math.abs(y) < side / 2)) cells++;
  }
  const ft3 = cells * h * h * depth / (12 * 12 * 12);
  assert.ok(Math.abs(r.concrete_each_cuft - ft3) / ft3 < 1e-3, r.concrete_each_cuft + " vs " + ft3);
  assert.ok(Math.abs(r.total_cuyd * 27 - r.total_cuft) < 1e-9);
  assert.equal(r.bags, Math.ceil(ft3 / 0.6)); // 80-lb bag, 0.60 cu ft (Quikrete yield)
});

test("cmu-grout-volume: grouted-cell count matches a brute-force walk of the cells of a 16-in CMU wall", async () => {
  const { computeCmuGroutVolume } = await _cc();
  // A 20 ft wall of 16 in two-cell units holds 15 units = 30 cells, centered at 4 + 8k in.
  // Grout the first cell, step by the spacing, and grout the end cell (both ends grouted).
  const cellsGrouted = (lenIn, sp) => {
    const centers = []; for (let c = 4; c < lenIn; c += 8) centers.push(c);
    const last = centers[centers.length - 1]; const set = new Set([centers[0], last]);
    for (let c = centers[0]; c <= last; c += sp) set.add(c);
    return set.size;
  };
  for (const sp of [16, 24, 40, 48]) {
    assert.equal(computeCmuGroutVolume({ wall_len_ft: 20, wall_ht_ft: 8, core_spacing_in: sp }).cores, cellsGrouted(240, sp), "spacing " + sp);
  }
  // FIXED 2026-10-15: floor(240/8)+1 was a fencepost on the wall length, not on the 232 in
  // cell-centre span: every cell grouted read 31 of 30 cells, and 32 in read 8 where the walk needs 9.
  assert.equal(computeCmuGroutVolume({ wall_len_ft: 20, wall_ht_ft: 8, core_spacing_in: 8 }).cores, 30);
  assert.equal(computeCmuGroutVolume({ wall_len_ft: 20, wall_ht_ft: 8, core_spacing_in: 32 }).cores, 9);
  for (const len of [8, 12, 20, 33.333333333333336, 40]) for (const sp of [8, 16, 24, 32, 40, 48, 56, 64]) {
    assert.equal(computeCmuGroutVolume({ wall_len_ft: len, wall_ht_ft: 8, core_spacing_in: sp }).cores, cellsGrouted(len * 12, sp), `len ${len} sp ${sp}`);
  }
  assert.equal(cellsGrouted(240, 8), 30);
  // Default 24 in^2 core vs the commonly published NCMA figure of about 0.26 ft^3 of grout
  // per ft^2 of solid-grouted 8 in wall: 24/144 ft^2 per cell x 1.5 cells per ft of wall.
  assert.ok(Math.abs((24 / 144) * 1.5 - 0.258) / 0.258 < 0.05);
});

test("annular-grout-volume: annulus volume matches a polar numerical integral; gallons use 231 cu in per gal", async () => {
  const { computeAnnularGroutVolume } = await _cc();
  const r = computeAnnularGroutVolume({ bore_dia_in: 30, carrier_od_in: 18, length_ft: 250, waste_pct: 0 });
  // Integral of 2 pi rho d rho from 9 to 15 in, midpoint rule.
  const n = 10000; let a = 0;
  for (let i = 0; i < n; i++) { const rho = 9 + (i + 0.5) * 6 / n; a += 2 * Math.PI * rho * 6 / n; }
  assert.ok(Math.abs(r.annular_area_in2 - a) / a < 1e-9);
  const in3 = a * 250 * 12;
  assert.ok(Math.abs(r.grout_gal - in3 / 231) / r.grout_gal < 1e-9);
  assert.ok(Math.abs(r.grout_cy - in3 / 46656) / r.grout_cy < 1e-9); // 36^3 cu in per cu yd
  const w = computeAnnularGroutVolume({ bore_dia_in: 30, carrier_od_in: 18, length_ft: 250, waste_pct: 10 });
  assert.ok(Math.abs(w.grout_cy / r.grout_cy - 1.1) < 1e-9);
});

test("wallpaper-rolls: matches a brute-force cut of strips from successive rolls; never less paper than the wall", async () => {
  const { computeWallpaperRolls } = await _cc();
  const sim = (P, H, w, len, rep) => {
    let need = Math.ceil(P / w - 1e-9), rolls = 0;
    while (need > 0) { rolls++; let left = len; while (left >= H + rep - 1e-9 && need > 0) { left -= H + rep; need--; } }
    return rolls;
  };
  for (const [P, H, w, len, rep] of [[624, 108, 20.5, 396, 19], [624, 108, 20.5, 396, 25], [480, 96, 27, 324, 0], [700, 120, 27, 324, 24]]) {
    const r = computeWallpaperRolls({ perimeter_in: P, height_in: H, roll_width_in: w, roll_len_in: len, repeat_in: rep });
    assert.equal(r.rolls, sim(P, H, w, len, rep));
    assert.ok(r.rolls * w * len >= P * H, "rolls carry at least the wall area");
  }
  // Monotone in the repeat: a larger repeat never orders fewer rolls.
  let prev = 0;
  for (const rep of [0, 6, 12, 19, 25, 32]) { const k = computeWallpaperRolls({ perimeter_in: 624, height_in: 108, roll_width_in: 20.5, roll_len_in: 396, repeat_in: rep }).rolls; assert.ok(k >= prev); prev = k; }
});

test("ice-barrier-coverage: slope factor matches the published rafter-table multipliers; courses match a brute-force lay-up", async () => {
  const { computeIceBarrierCoverage } = await _cc();
  // Framing-square / rafter-table pitch multipliers: 4/12 1.054, 6/12 1.118, 8/12 1.202, 12/12 1.414.
  for (const [rise, m] of [[4, 1.054], [6, 1.118], [8, 1.202], [12, 1.414]]) {
    assert.ok(Math.abs(computeIceBarrierCoverage({ eave_length_ft: 40, overhang_in: 12, pitch_rise: rise }).slope_factor - m) < 0.0006);
  }
  // IRC R905.1.2: eave to 24 in inside the wall line, measured along the slope.
  for (const [ov, rise] of [[12, 4], [24, 12], [0, 0], [30, 8], [6, 6]]) {
    const r = computeIceBarrierCoverage({ eave_length_ft: 100, overhang_in: ov, pitch_rise: rise, roll_width_in: 36, roll_len_ft: 66.7, side_lap_in: 6 });
    const need = (ov + 24) * Math.hypot(12, rise) / 12;
    let top = 36, courses = 1; while (top < need - 1e-9) { top += 36 - 6; courses++; }
    assert.equal(r.courses, courses, "overhang " + ov + " rise " + rise);
    assert.equal(r.rolls, Math.ceil(courses * 100 / 66.7));
  }
});

test("concrete-evaporation-rate: Uno's fit tracks Menzel's vapor-pressure equation (ACI 305R) within 15%, and the lb/kg conversion is exact", async () => {
  const { computeConcreteEvaporationRate } = await _cc();
  // Menzel (1954), as given in ACI 305R: E = 0.313 (e0 - r ea)(0.253 + 0.060 V) kg/m^2/h,
  // e in kPa (saturation pressure from the Magnus/Alduchov form), V in km/h.
  const es = (c) => 0.61094 * Math.exp(17.625 * c / (c + 243.04));
  for (const ta of [50, 70, 90]) for (const dc of [0, 5]) for (const rh of [10, 40, 70]) for (const w of [5, 10, 15, 25]) {
    const tc = ta + dc;
    const r = computeConcreteEvaporationRate({ air_temp_f: ta, concrete_temp_f: tc, rh_pct: rh, wind_mph: w });
    const Tc = (tc - 32) * 5 / 9, Ta = (ta - 32) * 5 / 9, V = w * 1.609344;
    const m = 0.313 * (es(Tc) - rh / 100 * es(Ta)) * (0.253 + 0.060 * V);
    assert.ok(Math.abs(r.E_metric - m) / m < 0.15, [ta, tc, rh, w, r.E_metric, m].join(" "));
    // 1 kg/m^2 = 2.20462262 lb / 10.7639104 ft^2.
    assert.ok(Math.abs(r.E_us / r.E_metric - 2.20462262 / 10.7639104) < 1e-7);
  }
  // Saturated air over concrete at air temperature: nothing evaporates.
  assert.equal(computeConcreteEvaporationRate({ air_temp_f: 80, concrete_temp_f: 80, rh_pct: 100, wind_mph: 20 }).E_metric, 0);
});

test("egress-travel-distance: default limits are IBC 2021 sprinklered Group B values (Table 1017.2 300 ft, Table 1006.2.1 100 ft, 1020.5 Exc. 50 ft)", async () => {
  const { computeEgressTravelDistance } = await _cc();
  const at = computeEgressTravelDistance({ travel_ft: 300, common_path_ft: 100, dead_end_ft: 50 });
  assert.equal(at.pass, true);
  assert.equal(computeEgressTravelDistance({ travel_ft: 301, common_path_ft: 100, dead_end_ft: 50 }).pass_travel, false);
  assert.equal(computeEgressTravelDistance({ travel_ft: 300, common_path_ft: 101, dead_end_ft: 50 }).pass_common, false);
  assert.equal(computeEgressTravelDistance({ travel_ft: 300, common_path_ft: 100, dead_end_ft: 51 }).pass_deadend, false);
  // Nonsprinklered Group B (Table 1017.2 200 ft, Table 1006.2.1 OL > 30 75 ft, 1020.5 20 ft).
  const ns = computeEgressTravelDistance({ travel_ft: 210, travel_limit_ft: 200, common_path_ft: 70, common_path_limit_ft: 75, dead_end_ft: 25, dead_end_limit_ft: 20 });
  assert.equal(ns.pass_travel, false); assert.equal(ns.pass_common, true); assert.equal(ns.pass_deadend, false); assert.equal(ns.pass, false);
});

test("wood-combined-bending-axial: FcE = (pi^2/12) Emin' / (le/d)^2 from Euler; NDS 3.9.2 reduces to its pure-axial and pure-bending limits", async () => {
  const { computeWoodCombinedBendingAxial } = await _cc();
  const base = { p_lb: 3000, m_inlb: 3000, a_in2: 12.25, s_in3: 7.146, fc_adj_psi: 538.8, fb_adj_psi: 1350, emin_adj_psi: 580000, le_in: 96, d_in: 3.5 };
  const r = computeWoodCombinedBendingAxial(base);
  // Euler: P = pi^2 E I / le^2 with I/A = d^2/12 for a rectangle; Emin already carries the 1.66 factor.
  const euler = Math.PI ** 2 * 580000 * (3.5 ** 2 / 12) / 96 ** 2;
  assert.ok(Math.abs(r.fce_psi - euler) / euler < 1e-3, r.fce_psi + " vs " + euler);
  // Pure axial (M = 0): (fc/Fc')^2.
  const ax = computeWoodCombinedBendingAxial({ ...base, m_inlb: 0 });
  assert.ok(Math.abs(ax.interaction - (3000 / 12.25 / 538.8) ** 2) < 1e-12);
  // Vanishing axial load: fb/Fb' (the amplifier tends to 1).
  const bend = computeWoodCombinedBendingAxial({ ...base, p_lb: 1e-6, m_inlb: 5000 });
  assert.ok(Math.abs(bend.interaction - 5000 / 7.146 / 1350) < 1e-6);
  // The amplifier grows with load: more axial force never lowers the interaction.
  const more = computeWoodCombinedBendingAxial({ ...base, p_lb: 4000 });
  assert.ok(more.interaction > r.interaction && more.amplifier > r.amplifier);
});

test("scaffold-leg-load: OSHA 1926.451(a)(1) applies 4x to the intended load only, not to the scaffold's own weight", async () => {
  const { computeScaffoldLegLoad } = await _cc();
  const a = computeScaffoldLegLoad({ platform_dead_lb: 100, num_workers: 2, worker_lb: 250, material_lb: 500, n_legs: 4, component_rating_lb: 2500 });
  const b = computeScaffoldLegLoad({ platform_dead_lb: 500, num_workers: 2, worker_lb: 250, material_lb: 500, n_legs: 4, component_rating_lb: 2500 });
  // +400 lb dead over 4 legs adds 100 lb per leg at 1x.
  assert.ok(Math.abs((b.utilization - a.utilization) * 2500 - 100) < 1e-9);
  const c = computeScaffoldLegLoad({ platform_dead_lb: 100, num_workers: 2, worker_lb: 250, material_lb: 900, n_legs: 4, component_rating_lb: 2500 });
  // +400 lb material over 4 legs adds 4 x 100 lb per leg.
  assert.ok(Math.abs((c.utilization - a.utilization) * 2500 - 400) < 1e-9);
  // Loading each leg with exactly the allowable intended load sits on 1.0 and passes.
  const allow = a.allowable_intended_per_leg_lb * 4;
  const edge = computeScaffoldLegLoad({ platform_dead_lb: 100, num_workers: 0, worker_lb: 250, material_lb: allow, n_legs: 4, component_rating_lb: 2500 });
  assert.ok(Math.abs(edge.utilization - 1) < 1e-9); assert.equal(edge.pass, true);
  assert.equal(computeScaffoldLegLoad({ platform_dead_lb: 100, num_workers: 0, worker_lb: 250, material_lb: allow + 4, n_legs: 4, component_rating_lb: 2500 }).pass, false);
});

test("scaffold-takeoff: counts match a brute-force frame layout (two legs per frame, an X-brace pair per bay per lift)", async () => {
  const { computeScaffoldTakeoff } = await _cc();
  for (const [run, bay, lifts] of [[40, 7, 3], [42, 7, 2], [10, 10, 1], [100, 8, 5]]) {
    const r = computeScaffoldTakeoff({ run_length_ft: run, bay_length_ft: bay, lifts, planks_per_bay: 4 });
    const lines = [0]; while (lines[lines.length - 1] < run - 1e-9) lines.push(lines[lines.length - 1] + bay);
    const bays = lines.length - 1;
    assert.equal(r.bays, bays);
    assert.equal(r.frames, lines.length * lifts);
    assert.equal(r.base_plates, 2 * lines.length); // each ground frame stands on two legs
    assert.equal(r.braces, 2 * bays * lifts);     // inner and outer face of every bay, every lift
    assert.ok(bays * bay >= run && (bays - 1) * bay < run);
  }
});

test("asphalt-spread-rate: matches the Asphalt Institute rule of about 110 lb/sy per inch and the dimensional derivation", async () => {
  const { computeAsphaltSpreadRate } = await _cc();
  // 1 sy = 9 ft^2; 1 in = 1/12 ft. 110 lb/sy-in corresponds to 110 x 12 / 9 = 146.67 pcf.
  const r = computeAsphaltSpreadRate({ thickness_in: 1, density_pcf: 110 * 12 / 9 });
  assert.ok(Math.abs(r.spread_lb_per_sy - 110) < 1e-9);
  const t = computeAsphaltSpreadRate({ thickness_in: 2.5, density_pcf: 145 });
  assert.ok(Math.abs(t.spread_lb_per_sy - 145 * (2.5 / 12) * 9) < 1e-9);
  assert.ok(Math.abs(t.yield_sy_per_ton * t.spread_lb_per_sy - 2000) < 1e-9); // short ton
});

test("pavement-milling-production: RAP tonnage equals the cut volume rate times density (independent volumetric path)", async () => {
  const { computePavementMillingProduction } = await _cc();
  const r = computePavementMillingProduction({ drum_width_ft: 12.5, speed_fpm: 45, depth_in: 2.5, density_pcf: 145, efficiency: 0.6 });
  const ft3_per_hr = 12.5 * 45 * 60 * 0.6 * (2.5 / 12);
  assert.ok(Math.abs(r.rap_tph - ft3_per_hr * 145 / 2000) / r.rap_tph < 1e-12);
  assert.ok(Math.abs(r.sy_per_hr * 9 - 12.5 * 45 * 60 * 0.6) < 1e-9);
});

test("concrete-vibrator-spacing: insertions match a brute-force placement under ACI 309R (spacing <= 1.5R, ends <= 0.75R)", async () => {
  const { computeConcreteVibratorSpacing } = await _cc();
  for (const [R, L] of [[12, 20], [8, 3], [10, 12.5], [18, 4.5], [6, 0.5]]) {
    const r = computeConcreteVibratorSpacing({ radius_of_action_in: R, lift_length_ft: L });
    // Fewest insertions: first at 0.75R, then every 1.5R, until the last reaches within 0.75R of the end.
    let n = 1, x = 0.75 * R; while (x + 0.75 * R < L * 12 - 1e-9) { x += 1.5 * R; n++; }
    assert.equal(r.insertions, n, "R " + R + " L " + L);
    assert.ok(Math.abs(r.max_spacing_in - 2 * r.edge_max_in) < 1e-12); // edge is half the spacing
  }
});

test("formwork-tie-load: the ties of a full grid carry the whole lateral thrust; the max tributary area loads a tie to exactly its SWL", async () => {
  const { computeFormworkTieLoad } = await _cc();
  const r = computeFormworkTieLoad({ lateral_pressure_psf: 750, h_spacing_ft: 2.5, v_spacing_ft: 2, tie_swl_lb: 5000 });
  // A 40 x 10 ft panel tied on that grid: 16 x 5 ties, thrust 750 psf x 400 ft^2 (1 psf x 1 ft^2 = 1 lb).
  assert.ok(Math.abs(r.tie_load_lb * 16 * 5 - 750 * 400) < 1e-9);
  const side = Math.sqrt(r.max_trib_area_ft2);
  const edge = computeFormworkTieLoad({ lateral_pressure_psf: 750, h_spacing_ft: side, v_spacing_ft: side, tie_swl_lb: 5000 });
  assert.ok(Math.abs(edge.utilization - 1) < 1e-9); assert.equal(edge.pass, true);
});

test("concrete-washout-volume: 1728/231 = 7.48052 gal per cu ft; the square pit at the stated depth holds the required volume", async () => {
  const { computeConcreteWashoutVolume } = await _cc();
  const r = computeConcreteWashoutVolume({ trucks: 12, washout_gal_per_truck: 40, freeboard_pct: 0, pit_depth_ft: 3 });
  assert.ok(Math.abs(r.required_cf - 480 / 7.480519) < 1e-4);
  assert.ok(Math.abs(r.required_cy - 480 * 231 / 46656) < 1e-9);
  assert.ok(Math.abs(r.pit_side_ft ** 2 * 3 - r.required_cf) < 1e-9);
  const f = computeConcreteWashoutVolume({ trucks: 12, washout_gal_per_truck: 40, freeboard_pct: 20, pit_depth_ft: 3 });
  assert.ok(Math.abs(f.required_cf / r.required_cf - 1.2) < 1e-12);
});

test("shingle-nails: 80 three-tab shingles per square re-derived from the 12 x 36 in shingle at 5 in exposure", async () => {
  const { computeShingleNails } = await _cc();
  // 100 ft^2 / (36 in x 5 in / 144) = 80; a 13-1/4 x 39-3/8 in metric shingle at 5-5/8 in gives ~65.
  const perSq = 100 / (36 * 5 / 144);
  assert.ok(Math.abs(perSq - 80) < 1e-9);
  const d = computeShingleNails({ squares: 25 }); // defaults: 80 per square, 4 nails (IRC R905.2.6 minimum)
  assert.equal(d.nails_total, 25 * perSq * 4);
  assert.ok(Math.abs(100 / (39.375 * 5.625 / 144) - 64) < 1.5);
  // Linear in every factor.
  assert.equal(computeShingleNails({ squares: 25, nails_per_shingle: 6 }).nails_total * 2, computeShingleNails({ squares: 50, nails_per_shingle: 6 }).nails_total);
});
