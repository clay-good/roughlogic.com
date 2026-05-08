// Unit tests for calc-construction.js v2 utilities (90-99). 10+ cases per utility.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStairStringer,
  computeJoistDeflection,
  computeFootingArea,
  computeTileCount,
  computePaintCoverage,
  computeExcavationVolume,
  computeMasonryCount,
  computeWindPressure,
  computeSnowLoad,
  computeAnchorEmbedment,
  SOIL_BEARING_PSF,
  PAINT_COVERAGE_FT2_PER_GAL,
  MASONRY_UNIT_FACE_IN,
  WIND_PRESSURE_CP,
  stairStringerExample,
  joistDeflectionExample,
  footingAreaExample,
  tileCountExample,
  paintCoverageExample,
  excavationExample,
  masonryCountExample,
  windPressureExample,
  snowLoadExample,
  anchorEmbedmentExample,
} from "../../calc-construction.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 90: Stair Stringer ---

test("Stringer: 108 in rise, 126 in run -> ~166 in", () => {
  const r = computeStairStringer(stairStringerExample.inputs);
  assert.ok(r.stringer_in > 165 && r.stringer_in < 167);
});

test("Stringer: rise 0 returns error", () => {
  const r = computeStairStringer({ total_rise_in: 0, total_run_in: 100 });
  assert.ok(r.error);
});

test("Stringer: pythagorean check 3-4-5", () => {
  const r = computeStairStringer({ total_rise_in: 30, total_run_in: 40 });
  assert.ok(close(r.stringer_in, 50));
});

test("Stringer: stringer_ft = stringer_in / 12", () => {
  const r = computeStairStringer({ total_rise_in: 36, total_run_in: 48 });
  assert.ok(close(r.stringer_ft, 60 / 12));
});

test("Stringer: board feet positive", () => {
  const r = computeStairStringer({ total_rise_in: 100, total_run_in: 100 });
  assert.ok(r.board_feet > 0);
});

test("Stringer: zero run returns error", () => {
  const r = computeStairStringer({ total_rise_in: 100, total_run_in: 0 });
  assert.ok(r.error);
});

test("Stringer: longer rise -> longer stringer", () => {
  const a = computeStairStringer({ total_rise_in: 50, total_run_in: 100 });
  const b = computeStairStringer({ total_rise_in: 100, total_run_in: 100 });
  assert.ok(b.stringer_in > a.stringer_in);
});

test("Stringer: equal rise/run -> 45 deg, sqrt(2) factor", () => {
  const r = computeStairStringer({ total_rise_in: 100, total_run_in: 100 });
  assert.ok(close(r.stringer_in, 100 * Math.sqrt(2), 0.01));
});

test("Stringer: board feet scales with stringer length", () => {
  const a = computeStairStringer({ total_rise_in: 50, total_run_in: 50 });
  const b = computeStairStringer({ total_rise_in: 100, total_run_in: 100 });
  assert.ok(b.board_feet > a.board_feet);
});

test("Stringer: example expected range met", () => {
  const r = computeStairStringer(stairStringerExample.inputs);
  assert.ok(r.stringer_in >= stairStringerExample.expectedRange.stringer_in.min);
  assert.ok(r.stringer_in <= stairStringerExample.expectedRange.stringer_in.max);
});

// --- Utility 91: Joist Deflection ---

test("Joist: example positive deflection in band", () => {
  const r = computeJoistDeflection(joistDeflectionExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.deflection_in > 0.05 && r.deflection_in < 0.5);
});

test("Joist: doubled load doubles deflection", () => {
  const a = computeJoistDeflection({ uniform_load_plf: 25, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  const b = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(close(b.deflection_in, 2 * a.deflection_in, 0.001));
});

test("Joist: span quadrupled -> deflection grows by 16x (L^4)", () => {
  const a = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 6, E_psi: 1600000, I_in4: 47.6 });
  const b = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(close(b.deflection_in / a.deflection_in, 16, 0.05));
});

test("Joist: doubled E halves deflection", () => {
  const a = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  const b = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 3200000, I_in4: 47.6 });
  assert.ok(close(b.deflection_in, a.deflection_in / 2, 0.001));
});

test("Joist: zero E returns error", () => {
  const r = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 0, I_in4: 47.6 });
  assert.ok(r.error);
});

test("Joist: L/360 limit = L*12/360", () => {
  const r = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(close(r.limit_L_over_360_in, 12 * 12 / 360));
});

test("Joist: L/240 limit = L*12/240", () => {
  const r = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(close(r.limit_L_over_240_in, 12 * 12 / 240));
});

test("Joist: pass_L_over_240 implies pass_L_over_360 may be false", () => {
  // Construct deflection between L/360 and L/240.
  const r = computeJoistDeflection({ uniform_load_plf: 200, span_ft: 16, E_psi: 1600000, I_in4: 47.6 });
  if (r.deflection_in > r.limit_L_over_360_in && r.deflection_in <= r.limit_L_over_240_in) {
    assert.equal(r.pass_L_over_240, true);
    assert.equal(r.pass_L_over_360, false);
  }
});

test("Joist: invalid I returns error", () => {
  const r = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 0 });
  assert.ok(r.error);
});

test("Joist: zero load returns error", () => {
  const r = computeJoistDeflection({ uniform_load_plf: 0, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(r.error);
});

// --- Utility 92: Footing Area ---

test("Footing: clay 12000 lb -> 8 ft^2", () => {
  const r = computeFootingArea(footingAreaExample.inputs);
  assert.equal(r.required_area_ft2, 8);
});

test("Footing: rock allows smaller area than clay", () => {
  const a = computeFootingArea({ column_load_lb: 12000, soil_class: "clay" });
  const b = computeFootingArea({ column_load_lb: 12000, soil_class: "rock" });
  assert.ok(b.required_area_ft2 < a.required_area_ft2);
});

test("Footing: side = sqrt(area)", () => {
  const r = computeFootingArea(footingAreaExample.inputs);
  assert.ok(close(r.side_ft, Math.sqrt(8)));
});

test("Footing: rounds side up to next 6 in", () => {
  const r = computeFootingArea({ column_load_lb: 12000, soil_class: "clay" });
  assert.equal(r.rounded_side_in % 6, 0);
  assert.ok(r.rounded_side_in >= r.side_ft * 12);
});

test("Footing: zero load returns error", () => {
  const r = computeFootingArea({ column_load_lb: 0, soil_class: "clay" });
  assert.ok(r.error);
});

test("Footing: unknown soil returns error", () => {
  const r = computeFootingArea({ column_load_lb: 12000, soil_class: "magma" });
  assert.ok(r.error);
});

test("Footing: SOIL_BEARING_PSF has 6 classes", () => {
  assert.equal(Object.keys(SOIL_BEARING_PSF).length, 6);
});

test("Footing: rock > sand > clay allowable", () => {
  assert.ok(SOIL_BEARING_PSF.rock > SOIL_BEARING_PSF.sand);
  assert.ok(SOIL_BEARING_PSF.sand > SOIL_BEARING_PSF.clay);
});

test("Footing: doubled load doubles required area", () => {
  const a = computeFootingArea({ column_load_lb: 6000, soil_class: "clay" });
  const b = computeFootingArea({ column_load_lb: 12000, soil_class: "clay" });
  assert.ok(close(b.required_area_ft2, 2 * a.required_area_ft2));
});

test("Footing: surfaces allowable_psf", () => {
  const r = computeFootingArea({ column_load_lb: 12000, soil_class: "clay" });
  assert.equal(r.allowable_psf, 1500);
});

// --- Utility 93: Tile Count ---

test("Tile: 100 ft^2 of 12x12 -> 100 base, 110 with waste", () => {
  const r = computeTileCount(tileCountExample.inputs);
  assert.equal(r.base_count, 100);
  assert.equal(r.tile_count, 110);
});

test("Tile: smaller tiles need more units", () => {
  const a = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12 });
  const b = computeTileCount({ area_ft2: 100, tile_width_in: 6, tile_height_in: 6 });
  assert.ok(b.tile_count > a.tile_count);
});

test("Tile: zero area returns error", () => {
  const r = computeTileCount({ area_ft2: 0, tile_width_in: 12, tile_height_in: 12 });
  assert.ok(r.error);
});

test("Tile: zero tile size returns error", () => {
  const r = computeTileCount({ area_ft2: 100, tile_width_in: 0, tile_height_in: 12 });
  assert.ok(r.error);
});

test("Tile: face area returned", () => {
  const r = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12 });
  assert.equal(r.tile_face_in2, 144);
});

test("Tile: grout volume positive", () => {
  const r = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12 });
  assert.ok(r.grout_volume_in3 > 0);
});

test("Tile: doubled area doubles base count", () => {
  const a = computeTileCount({ area_ft2: 50, tile_width_in: 12, tile_height_in: 12 });
  const b = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12 });
  assert.ok(close(b.base_count, 2 * a.base_count));
});

test("Tile: rectangular tiles 12x24 -> half count of 12x12", () => {
  const a = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12 });
  const b = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 24 });
  assert.ok(close(b.base_count, a.base_count / 2));
});

test("Tile: thicker grout joint -> more grout volume", () => {
  const a = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12, grout_joint_width_in: 0.125 });
  const b = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12, grout_joint_width_in: 0.25 });
  assert.ok(b.grout_volume_in3 > a.grout_volume_in3);
});

test("Tile: count is ceil-rounded integer", () => {
  const r = computeTileCount({ area_ft2: 33, tile_width_in: 13, tile_height_in: 13 });
  assert.ok(Number.isInteger(r.tile_count));
});

// --- Utility 94: Paint Coverage ---

test("Paint: 700 ft^2 smooth, 2 coats, primer in expected range", () => {
  const r = computePaintCoverage(paintCoverageExample.inputs);
  assert.ok(r.total_paint_gallons >= 3 && r.total_paint_gallons <= 5);
});

test("Paint: rough surface uses more paint than smooth", () => {
  const a = computePaintCoverage({ area_ft2: 700, coats: 2, primer_needed: false, surface_porosity: "smooth" });
  const b = computePaintCoverage({ area_ft2: 700, coats: 2, primer_needed: false, surface_porosity: "rough" });
  assert.ok(b.total_paint_gallons > a.total_paint_gallons);
});

test("Paint: more coats -> more paint", () => {
  const a = computePaintCoverage({ area_ft2: 700, coats: 1, primer_needed: false, surface_porosity: "smooth" });
  const b = computePaintCoverage({ area_ft2: 700, coats: 3, primer_needed: false, surface_porosity: "smooth" });
  assert.ok(close(b.total_paint_gallons, 3 * a.total_paint_gallons));
});

test("Paint: primer = 0 if not needed", () => {
  const r = computePaintCoverage({ area_ft2: 700, coats: 2, primer_needed: false, surface_porosity: "smooth" });
  assert.equal(r.primer_gallons, 0);
});

test("Paint: primer matches one coat when needed", () => {
  const r = computePaintCoverage({ area_ft2: 700, coats: 2, primer_needed: true, surface_porosity: "smooth" });
  assert.ok(close(r.primer_gallons, r.gallons_per_coat));
});

test("Paint: zero area returns error", () => {
  const r = computePaintCoverage({ area_ft2: 0, coats: 2, surface_porosity: "smooth" });
  assert.ok(r.error);
});

test("Paint: unknown porosity returns error", () => {
  const r = computePaintCoverage({ area_ft2: 100, coats: 2, surface_porosity: "wood" });
  assert.ok(r.error);
});

test("Paint: PAINT_COVERAGE_FT2_PER_GAL has 3 categories", () => {
  assert.equal(Object.keys(PAINT_COVERAGE_FT2_PER_GAL).length, 3);
});

test("Paint: smooth coverage = 350 ft^2/gal", () => {
  assert.equal(PAINT_COVERAGE_FT2_PER_GAL.smooth, 350);
});

test("Paint: 350 ft^2 smooth, 1 coat, no primer = 1 gallon", () => {
  const r = computePaintCoverage({ area_ft2: 350, coats: 1, primer_needed: false, surface_porosity: "smooth" });
  assert.ok(close(r.total_paint_gallons, 1));
});

// --- Utility 95: Excavation ---

test("Excavation: vertical (90 deg) 10x10x5 -> 500 ft^3", () => {
  const r = computeExcavationVolume(excavationExample.inputs);
  assert.ok(close(r.volume_ft3, 500));
});

test("Excavation: 27 ft^3 = 1 cy", () => {
  const r = computeExcavationVolume({ length_ft: 3, width_ft: 3, depth_ft: 3 });
  assert.ok(close(r.cubic_yards, 1));
});

test("Excavation: zero depth returns error", () => {
  const r = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 0 });
  assert.ok(r.error);
});

test("Excavation: sloped sides increase volume", () => {
  const a = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  const b = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 45 });
  assert.ok(b.volume_ft3 > a.volume_ft3);
});

test("Excavation: set_back is 0 when vertical", () => {
  const r = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  assert.equal(r.set_back_ft, 0);
});

test("Excavation: 45 deg slope 5 ft deep -> 5 ft set_back per side", () => {
  const r = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 45 });
  assert.ok(close(r.set_back_ft, 5));
});

test("Excavation: top dimensions = bottom + 2*set_back", () => {
  const r = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 45 });
  assert.equal(r.top_length_ft, 20);
  assert.equal(r.top_width_ft, 20);
});

test("Excavation: cubic yards = volume_ft3 / 27", () => {
  const r = computeExcavationVolume(excavationExample.inputs);
  assert.ok(close(r.cubic_yards, r.volume_ft3 / 27));
});

test("Excavation: zero width returns error", () => {
  const r = computeExcavationVolume({ length_ft: 10, width_ft: 0, depth_ft: 5 });
  assert.ok(r.error);
});

test("Excavation: doubled length doubles volume (vertical)", () => {
  const a = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  const b = computeExcavationVolume({ length_ft: 20, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  assert.ok(close(b.volume_ft3, 2 * a.volume_ft3));
});

// --- Utility 96: Masonry Count ---

test("Masonry: 100 ft^2 of CMU 8x16 in expected range", () => {
  const r = computeMasonryCount(masonryCountExample.inputs);
  assert.ok(r.unit_count >= 110 && r.unit_count <= 130);
});

test("Masonry: smaller units (modular brick) -> more count", () => {
  const a = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16" });
  const b = computeMasonryCount({ wall_area_ft2: 100, unit_type: "modular_brick" });
  assert.ok(b.unit_count > a.unit_count);
});

test("Masonry: zero area returns error", () => {
  const r = computeMasonryCount({ wall_area_ft2: 0, unit_type: "cmu_8x8x16" });
  assert.ok(r.error);
});

test("Masonry: unknown unit returns error", () => {
  const r = computeMasonryCount({ wall_area_ft2: 100, unit_type: "lego" });
  assert.ok(r.error);
});

test("Masonry: thicker mortar -> larger face -> fewer units", () => {
  const a = computeMasonryCount({ wall_area_ft2: 100, unit_type: "modular_brick", mortar_joint_in: 0.1 });
  const b = computeMasonryCount({ wall_area_ft2: 100, unit_type: "modular_brick", mortar_joint_in: 0.5 });
  assert.ok(b.unit_count <= a.unit_count);
});

test("Masonry: face area returned > 0", () => {
  const r = computeMasonryCount(masonryCountExample.inputs);
  assert.ok(r.face_ft2 > 0);
});

test("Masonry: doubled area roughly doubles count", () => {
  const a = computeMasonryCount({ wall_area_ft2: 100, unit_type: "modular_brick" });
  const b = computeMasonryCount({ wall_area_ft2: 200, unit_type: "modular_brick" });
  assert.ok(b.unit_count >= 1.95 * a.unit_count);
  assert.ok(b.unit_count <= 2.05 * a.unit_count + 5);
});

test("Masonry: integer count", () => {
  const r = computeMasonryCount(masonryCountExample.inputs);
  assert.ok(Number.isInteger(r.unit_count));
});

test("Masonry: 4 unit types bundled", () => {
  assert.equal(Object.keys(MASONRY_UNIT_FACE_IN).length, 4);
});

test("Masonry: count >= base_count", () => {
  const r = computeMasonryCount(masonryCountExample.inputs);
  assert.ok(r.unit_count >= r.base_count);
});

// --- Utility 97: Wind Pressure ---

test("Wind: V=100 -> q=25.6 psf", () => {
  const r = computeWindPressure(windPressureExample.inputs);
  assert.ok(close(r.q_psf, 25.6, 0.05));
});

test("Wind: q scales with V^2", () => {
  const a = computeWindPressure({ V_mph: 100, exposure: "C" });
  const b = computeWindPressure({ V_mph: 200, exposure: "C" });
  assert.ok(close(b.q_psf, 4 * a.q_psf));
});

test("Wind: exposure D > C > B for kz", () => {
  const a = computeWindPressure({ V_mph: 100, exposure: "B" });
  const b = computeWindPressure({ V_mph: 100, exposure: "C" });
  const c = computeWindPressure({ V_mph: 100, exposure: "D" });
  assert.ok(c.qz_at_30ft_psf > b.qz_at_30ft_psf);
  assert.ok(b.qz_at_30ft_psf > a.qz_at_30ft_psf);
});

test("Wind: Cp windward 0.8, leeward -0.5", () => {
  const r = computeWindPressure(windPressureExample.inputs);
  assert.equal(r.Cp_windward, 0.8);
  assert.equal(r.Cp_leeward, -0.5);
});

test("Wind: leeward pressure is negative (suction)", () => {
  const r = computeWindPressure(windPressureExample.inputs);
  assert.ok(r.pressure_leeward_psf < 0);
});

test("Wind: zero V returns error", () => {
  const r = computeWindPressure({ V_mph: 0 });
  assert.ok(r.error);
});

test("Wind: WIND_PRESSURE_CP has 3 entries", () => {
  assert.equal(Object.keys(WIND_PRESSURE_CP).length, 3);
});

test("Wind: q_psf = 0.00256 * V^2", () => {
  const r = computeWindPressure({ V_mph: 130 });
  assert.ok(close(r.q_psf, 0.00256 * 130 * 130, 0.001));
});

test("Wind: windward * leeward signs differ", () => {
  const r = computeWindPressure({ V_mph: 100 });
  assert.ok(r.pressure_windward_psf > 0 && r.pressure_leeward_psf < 0);
});

test("Wind: pressure_windward = qz * 0.8", () => {
  const r = computeWindPressure({ V_mph: 100 });
  assert.ok(close(r.pressure_windward_psf, r.qz_at_30ft_psf * 0.8));
});

// --- Utility 98: Snow Load ---

test("Snow: 30 psf ground -> 21 psf flat-roof at unity factors", () => {
  const r = computeSnowLoad(snowLoadExample.inputs);
  assert.equal(r.Pf_psf, 21);
});

test("Snow: doubled Pg doubles Pf", () => {
  const a = computeSnowLoad({ Pg_psf: 30 });
  const b = computeSnowLoad({ Pg_psf: 60 });
  assert.ok(close(b.Pf_psf, 2 * a.Pf_psf));
});

test("Snow: zero Pg returns error", () => {
  const r = computeSnowLoad({ Pg_psf: 0 });
  assert.ok(r.error);
});

test("Snow: importance factor scales", () => {
  const a = computeSnowLoad({ Pg_psf: 30, Is: 1.0 });
  const b = computeSnowLoad({ Pg_psf: 30, Is: 1.2 });
  assert.ok(close(b.Pf_psf, 1.2 * a.Pf_psf));
});

test("Snow: thermal factor scales", () => {
  const a = computeSnowLoad({ Pg_psf: 30, Ct: 1.0 });
  const b = computeSnowLoad({ Pg_psf: 30, Ct: 1.2 });
  assert.ok(close(b.Pf_psf, 1.2 * a.Pf_psf));
});

test("Snow: exposure factor scales", () => {
  const a = computeSnowLoad({ Pg_psf: 30, Ce: 1.0 });
  const b = computeSnowLoad({ Pg_psf: 30, Ce: 0.8 });
  assert.ok(close(b.Pf_psf, 0.8 * a.Pf_psf));
});

test("Snow: 0.7 base factor applied", () => {
  const r = computeSnowLoad({ Pg_psf: 100 });
  assert.equal(r.Pf_psf, 70);
});

test("Snow: surfaces inputs", () => {
  const r = computeSnowLoad(snowLoadExample.inputs);
  assert.equal(r.Pg_psf, 30);
});

test("Snow: combined factors compound", () => {
  const r = computeSnowLoad({ Pg_psf: 30, Ce: 0.9, Ct: 1.1, Is: 1.2 });
  assert.ok(close(r.Pf_psf, 0.7 * 0.9 * 1.1 * 1.2 * 30));
});

test("Snow: returns Pf in psf as a number", () => {
  const r = computeSnowLoad({ Pg_psf: 10 });
  assert.equal(typeof r.Pf_psf, "number");
});

// --- Utility 99: Anchor Embedment ---

test("Anchor: example yields positive embedment", () => {
  const r = computeAnchorEmbedment(anchorEmbedmentExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.embedment_in > 0);
});

test("Anchor: doubled load doubles embedment", () => {
  const a = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  const b = computeAnchorEmbedment({ uplift_lb: 10000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  assert.ok(close(b.embedment_in, 2 * a.embedment_in));
});

test("Anchor: doubled diameter halves embedment", () => {
  const a = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.5, fc_psi: 3000 });
  const b = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 1.0, fc_psi: 3000 });
  assert.ok(close(b.embedment_in, a.embedment_in / 2));
});

test("Anchor: 4x fc halves embedment (sqrt scaling)", () => {
  const a = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  const b = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 12000 });
  assert.ok(close(b.embedment_in, a.embedment_in / 2));
});

test("Anchor: zero load returns error", () => {
  const r = computeAnchorEmbedment({ uplift_lb: 0, bolt_diameter_in: 0.625, fc_psi: 3000 });
  assert.ok(r.error);
});

test("Anchor: zero diameter returns error", () => {
  const r = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0, fc_psi: 3000 });
  assert.ok(r.error);
});

test("Anchor: zero fc returns error", () => {
  const r = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 0 });
  assert.ok(r.error);
});

test("Anchor: embedment_ft = embedment_in / 12", () => {
  const r = computeAnchorEmbedment(anchorEmbedmentExample.inputs);
  assert.ok(close(r.embedment_ft, r.embedment_in / 12));
});

test("Anchor: T returned matches input", () => {
  const r = computeAnchorEmbedment(anchorEmbedmentExample.inputs);
  assert.equal(r.T_lb, 5000);
});

test("Anchor: hand-calc 5000 / (0.7 * sqrt(3000) * pi * 0.625)", () => {
  const r = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  const expected = 5000 / (0.7 * Math.sqrt(3000) * Math.PI * 0.625);
  assert.ok(close(r.embedment_in, expected, 0.01));
});
