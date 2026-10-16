// Independent references for twenty tiles across the fire-sprinkler, rail,
// trenchless, sawmill, stage-production, stage, layout and pipefit modules.
// The worked-example fixture recomputes each spec's own example, so a spec and
// its tile that share an error agree with each other. These tests come at the
// same tiles from outside: published code values re-derived by hand, geometry
// computed a second way, conservation of the quantity the tile is accounting
// for, physics integrated step by step, round trips through the tile's own
// inverse, and the fencepost counts that spacing arithmetic gets wrong.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeSprinklerSystemDemand,
  computeSprinklerProtectionAreaForSupply,
  computeSprinklerHeadLayout,
} from "../../calc-firesprinkler.js";
import { computeRailWearLimit, computeTrackWarp, computeBallastSection } from "../../calc-rail.js";
import {
  computeLocateDepthOffset,
  computeVacuumExcavationSpoil,
  computePipeBurstingPullLoad,
} from "../../calc-trenchless.js";
import { computeKilnDryingTime, computeBandmillSpeedBite, computeLogTruckPayload } from "../../calc-sawmill.js";
import {
  computeLineArraySplay,
  computeChainHoistLiftTime,
  computeHazeMachineSizing,
} from "../../calc-stageproduction.js";
import { computeLedTapeMaxRun } from "../../calc-stage.js";
import { computeEqualSpacing, computeTriangleSsa } from "../../calc-layout.js";
import { computeReducerOffset, computeBranchReinforcement } from "../../calc-pipefit.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

const DEG = Math.PI / 180;

// ===================== sprinkler-system-demand =====================

test("sprinkler system demand: the NFPA 13 hazard-class screens come out at their published figures", () => {
  // NFPA 13 (2022) density/area screening demand, with the hose allowances and
  // durations the tile's own citation names for each class. Worked by hand:
  //   Light hazard      0.10 gpm/ft2 x 1,500 ft2 =   150 gpm + 100 hose =  250 gpm; 30 min =  7,500 gal
  //   Ordinary Group 1  0.15         x 1,500     =   225     + 250      =  475 gpm; 60 min = 28,500 gal
  //   Ordinary Group 2  0.20         x 1,500     =   300     + 250      =  550 gpm; 90 min = 49,500 gal
  const cases = [
    { in: { density: 0.10, design_area: 1500, hose_gpm: 100, duration_min: 30 }, spr: 150, tot: 250, vol: 7500 },
    { in: { density: 0.15, design_area: 1500, hose_gpm: 250, duration_min: 60 }, spr: 225, tot: 475, vol: 28500 },
    { in: { density: 0.20, design_area: 1500, hose_gpm: 250, duration_min: 90 }, spr: 300, tot: 550, vol: 49500 },
  ];
  for (const c of cases) {
    const r = computeSprinklerSystemDemand(c.in);
    within(r.sprinkler_gpm, c.spr, 1e-9, "sprinkler demand");
    within(r.total_gpm, c.tot, 1e-9, "total with hose");
    within(r.volume_gal, c.vol, 1e-9, "stored volume");
  }
});

test("sprinkler system demand: the hose allowance is additive, not a factor, and the tank is a flow integrated over time", () => {
  const base = { density: 0.17, design_area: 2600, hose_gpm: 500, duration_min: 120 };
  const noHose = computeSprinklerSystemDemand({ ...base, hose_gpm: 0 });
  const withHose = computeSprinklerSystemDemand(base);
  // Taking the hose off the top must leave exactly the sprinkler demand.
  within(withHose.total_gpm - noHose.total_gpm, base.hose_gpm, 1e-9, "hose is a straight addition");
  within(withHose.sprinkler_gpm, noHose.sprinkler_gpm, 1e-9, "hose does not change sprinkler flow");
  // Volume is an integral of a constant flow: halving the duration halves it,
  // and the hose water is in the tank too.
  const half = computeSprinklerSystemDemand({ ...base, duration_min: base.duration_min / 2 });
  within(half.volume_gal * 2, withHose.volume_gal, 1e-9, "volume linear in duration");
  within(withHose.volume_gal - noHose.volume_gal, base.hose_gpm * base.duration_min, 1e-9, "hose water is stored too");
});

// ===================== sprinkler-protection-area-for-supply =====================

test("sprinkler protection area: the inverse round-trips through the forward demand tile", () => {
  for (const c of [
    { available_supply_gpm: 550, density: 0.20, hose_gpm: 250 },
    { available_supply_gpm: 1800, density: 0.30, hose_gpm: 500 },
    { available_supply_gpm: 400, density: 0.10, hose_gpm: 100 },
  ]) {
    const inv = computeSprinklerProtectionAreaForSupply(c);
    const fwd = computeSprinklerSystemDemand({
      density: c.density, design_area: inv.max_design_area_ft2, hose_gpm: c.hose_gpm, duration_min: 60,
    });
    within(fwd.total_gpm, c.available_supply_gpm, 1e-9, "the area it reports uses exactly the supply");
    within(fwd.sprinkler_gpm, inv.sprinkler_gpm, 1e-9, "sprinkler share agrees");
  }
});

test("sprinkler protection area: the 1,500 ft2 curve floor is flagged exactly at the boundary", () => {
  // NFPA 13 light/ordinary density-area curves start at 1,500 ft2. At 0.20
  // gpm/ft2 that floor costs 300 gpm of sprinkler flow, so with a 250 gpm hose
  // a 550 gpm supply sits exactly on it.
  const at = computeSprinklerProtectionAreaForSupply({ available_supply_gpm: 550, density: 0.20, hose_gpm: 250 });
  within(at.max_design_area_ft2, 1500, 1e-9, "exactly the floor");
  assert.equal(at.below_curve_minimum, false, "a reading at the floor is not below it");
  const under = computeSprinklerProtectionAreaForSupply({ available_supply_gpm: 549, density: 0.20, hose_gpm: 250 });
  assert.equal(under.below_curve_minimum, true, "one gpm short is below the smallest curve area");
  // All the supply swallowed by the hose leaves nothing for sprinklers.
  assert.ok(computeSprinklerProtectionAreaForSupply({ available_supply_gpm: 250, density: 0.20, hose_gpm: 250 }).error);
});

// ===================== sprinkler-head-layout =====================

test("sprinkler head layout: the NFPA 13 area-and-spacing pairs give the spacing the lesser rule allows", () => {
  // NFPA 13 (2022) smooth-ceiling maxima: light hazard 225 ft2 / 15 ft,
  // ordinary hazard 130 ft2 / 15 ft, extra hazard 100 ft2 / 12 ft. The square
  // spacing that yields the area is sqrt(area); the governing spacing is the
  // smaller of that and the linear maximum, and the wall distance is half it.
  const cases = [
    { area_per_head: 225, max_spacing: 15, spacing: 15 },            // sqrt(225) = 15, the two rules coincide
    { area_per_head: 130, max_spacing: 15, spacing: Math.sqrt(130) }, // 11.40 ft, the area rule governs
    { area_per_head: 100, max_spacing: 12, spacing: 10 },            // sqrt(100) = 10, the area rule governs
    { area_per_head: 400, max_spacing: 12, spacing: 12 },            // sqrt(400) = 20, the linear rule governs
  ];
  for (const c of cases) {
    const r = computeSprinklerHeadLayout({ room_length: 50, room_width: 40, area_per_head: c.area_per_head, max_spacing: c.max_spacing });
    within(r.spacing, c.spacing, 1e-9, `spacing for ${c.area_per_head} ft2 / ${c.max_spacing} ft`);
    within(r.max_wall_distance, c.spacing / 2, 1e-9, "wall distance is half the spacing");
  }
});

test("sprinkler head layout: the grid covers the room and never leaves a head over its allowable area", () => {
  // Two independent properties of any conforming grid, checked over a sweep:
  // (1) the lines of heads must reach the far wall -- heads_per_line x spacing
  //     is at least the room dimension, and one head fewer would not be;
  // (2) room area divided among the heads cannot exceed the allowable area per
  //     head, because the spacing is never larger than sqrt(area_per_head).
  for (const L of [11, 20, 31.5, 44, 97]) {
    for (const W of [9, 18, 30, 61]) {
      for (const a of [130, 225]) {
        const r = computeSprinklerHeadLayout({ room_length: L, room_width: W, area_per_head: a, max_spacing: 15 });
        assert.ok(r.heads_per_line * r.spacing >= L - 1e-9, `${L}x${W}@${a}: the line reaches the far wall`);
        assert.ok((r.heads_per_line - 1) * r.spacing < L + 1e-9, `${L}x${W}@${a}: no spare head on the line`);
        assert.ok(r.num_lines * r.spacing >= W - 1e-9, `${L}x${W}@${a}: the lines reach the far wall`);
        assert.ok((r.num_lines - 1) * r.spacing < W + 1e-9, `${L}x${W}@${a}: no spare line`);
        within(r.total_heads, r.heads_per_line * r.num_lines, 1e-9, "the grid is the product");
        within(r.achieved_area_per_head * r.total_heads, L * W, 1e-9, "the heads divide the whole room");
        assert.ok(r.achieved_area_per_head <= a + 1e-9, `${L}x${W}@${a}: no head over its allowable area`);
        assert.equal(r.coverage_ok, true);
      }
    }
  }
});

// ===================== rail-wear-condemning-limit =====================

test("rail wear: the metal removed is the L-shaped notch, computed as the head less what is left", () => {
  // The tile adds a vertical slab (full width) to a gauge-face slab (the
  // remaining height). The same figure read the other way is the whole head
  // rectangle less the unworn rectangle that survives: W x H - (W - g)(H - v).
  for (const c of [
    { new_head_height_in: 1.5, new_head_width_in: 3.0, new_head_area_in2: 3.9, vertical_wear_in: 0.375, gauge_face_wear_in: 0.5, combined_limit_in: 0.75, tonnage_mgt: 180 },
    { new_head_height_in: 1.0, new_head_width_in: 2.75, new_head_area_in2: 2.4, vertical_wear_in: 0.05, gauge_face_wear_in: 0.9, combined_limit_in: 0.6, tonnage_mgt: 40 },
    { new_head_height_in: 1.75, new_head_width_in: 3.25, new_head_area_in2: 4.8, vertical_wear_in: 0.6, gauge_face_wear_in: 0, combined_limit_in: 1.0, tonnage_mgt: 500 },
  ]) {
    const r = computeRailWearLimit(c);
    const survives = (c.new_head_width_in - c.gauge_face_wear_in) * (c.new_head_height_in - c.vertical_wear_in);
    within(r.lost_area_in2, c.new_head_width_in * c.new_head_height_in - survives, 1e-9, "notch area a second way");
    within(r.head_area_loss_pct, r.lost_area_in2 / c.new_head_area_in2 * 100, 1e-9, "loss as a share of the section");
  }
});

test("rail wear: the projected tonnage lands the rail exactly on the limit when the wear keeps its rate", () => {
  const c = { new_head_height_in: 1.5, new_head_width_in: 3.0, new_head_area_in2: 3.9, vertical_wear_in: 0.25, gauge_face_wear_in: 0.3, combined_limit_in: 0.75, tonnage_mgt: 180 };
  const r = computeRailWearLimit(c);
  assert.equal(r.condemned, false);
  // Run the wear forward at the reported rate for the reported remaining
  // tonnage and re-measure: the rail must now be exactly at the limit.
  const grow = (c.tonnage_mgt + r.remaining_mgt) / c.tonnage_mgt;
  const later = computeRailWearLimit({
    ...c,
    vertical_wear_in: c.vertical_wear_in * grow,
    gauge_face_wear_in: c.gauge_face_wear_in * grow,
    tonnage_mgt: c.tonnage_mgt + r.remaining_mgt,
  });
  within(later.combined_wear_in, c.combined_limit_in, 1e-6, "projection lands on the limit");
  assert.equal(later.condemned, true, "and at the limit it condemns");
  within(later.wear_rate_in_per_mgt, r.wear_rate_in_per_mgt, 1e-6, "the rate is unchanged");
});

test("rail wear: gauge-face wear is weighted half, so an inch of gauge counts as half an inch of vertical", () => {
  const base = { new_head_height_in: 1.5, new_head_width_in: 3.0, new_head_area_in2: 3.9, combined_limit_in: 0.75, tonnage_mgt: 100 };
  const vert = computeRailWearLimit({ ...base, vertical_wear_in: 0.25, gauge_face_wear_in: 0 });
  const gauge = computeRailWearLimit({ ...base, vertical_wear_in: 0, gauge_face_wear_in: 0.5 });
  within(gauge.combined_wear_in, vert.combined_wear_in, 1e-9, "0.50 in of gauge face equals 0.25 in of vertical");
  // Float trap the source notes: 0.3 + 0.3/2 sums to 0.44999999999999996.
  const edge = computeRailWearLimit({ ...base, vertical_wear_in: 0.3, gauge_face_wear_in: 0.3, combined_limit_in: 0.45 });
  assert.equal(edge.condemned, true, "a reading at the limit condemns");
});

// ===================== track-warp-fra-class =====================

test("track warp: the 49 CFR 213.63 warp limits for runs under 62 ft, each judged at and just past the limit", () => {
  // 49 CFR 213.63, difference in crosslevel between any two points less than
  // 62 ft apart, and the 213.9 freight speeds for those classes:
  //   Class 1  3      in   10 mph
  //   Class 2  2 1/4  in   25 mph
  //   Class 3  2      in   40 mph
  //   Class 4  1 3/4  in   60 mph
  //   Class 5  1 1/2  in   80 mph
  const FRA = [
    { cls: 1, limit: 3.0 }, { cls: 2, limit: 2.25 }, { cls: 3, limit: 2.0 },
    { cls: 4, limit: 1.75 }, { cls: 5, limit: 1.5 },
  ];
  for (const f of FRA) {
    const at = computeTrackWarp({ measured_a_in: f.limit, designed_a_in: 0, measured_b_in: 0, designed_b_in: 0, distance_ft: 62, warp_limit_in: f.limit });
    assert.equal(at.pass, true, `Class ${f.cls}: "may not be more than" -- a reading at ${f.limit} in passes`);
    within(at.pct_of_limit, 100, 1e-9, `Class ${f.cls} at the limit`);
    const over = computeTrackWarp({ measured_a_in: f.limit + 0.01, designed_a_in: 0, measured_b_in: 0, designed_b_in: 0, distance_ft: 62, warp_limit_in: f.limit });
    assert.equal(over.pass, false, `Class ${f.cls}: 0.01 in past the limit fails`);
    within(over.margin_in, -0.01, 1e-6, "margin goes negative by the overage");
  }
  // The classes are nested: a reading that passes Class 5 passes every lower
  // class, and the Class 5 limit is half the Class 1 limit.
  const r5 = computeTrackWarp({ measured_a_in: 1.5, designed_a_in: 0, measured_b_in: 0, designed_b_in: 0, distance_ft: 62, warp_limit_in: 1.5 });
  for (const f of FRA) {
    assert.equal(computeTrackWarp({ measured_a_in: 1.5, designed_a_in: 0, measured_b_in: 0, designed_b_in: 0, distance_ft: 62, warp_limit_in: f.limit }).pass, true,
      `a Class 5 reading also passes Class ${f.cls}`);
  }
  within(r5.warp_magnitude_in, 1.5, 1e-9, "magnitude is the raw difference");
});

test("track warp: the verdict is on the RAW crosslevel difference, as 213.63(a) says, not on the deviation from design", () => {
  // A spiral with 1.24 in of designed runoff and 0.80 in of surface deviation
  // reads 2.04 in of actual twist. 213.59(b) holds runoff to the 213.63
  // surface limits, so against a 1.5 in Class 5 limit this is a FAIL even
  // though the maintenance share alone is well inside it.
  const r = computeTrackWarp({ measured_a_in: 2.04, designed_a_in: 1.24, measured_b_in: 0, designed_b_in: 0, distance_ft: 62, warp_limit_in: 1.5 });
  within(r.crosslevel_difference_in, 2.04, 1e-9, "raw twist");
  within(r.designed_change_in, 1.24, 1e-9, "the design's share");
  within(r.warp_in, 0.80, 1e-9, "the deviation's share");
  within(r.designed_change_in + r.warp_in, r.crosslevel_difference_in, 1e-9, "design plus deviation is the whole twist");
  assert.equal(r.pass, false, "judged on the raw reading, this fails Class 5");
});

test("track warp: the twist does not care which point you call A, and the 31 ft rate scales with the chord", () => {
  const ab = { measured_a_in: 1.2, designed_a_in: 0.3, measured_b_in: -0.4, designed_b_in: 0, distance_ft: 62, warp_limit_in: 1.75 };
  const ba = { measured_a_in: -0.4, designed_a_in: 0, measured_b_in: 1.2, designed_b_in: 0.3, distance_ft: 62, warp_limit_in: 1.75 };
  const r1 = computeTrackWarp(ab), r2 = computeTrackWarp(ba);
  within(r2.warp_magnitude_in, r1.warp_magnitude_in, 1e-9, "magnitude is symmetric in the two points");
  assert.equal(r2.pass, r1.pass, "so is the verdict");
  // Rate per 31 ft: the same twist over twice the chord is half as steep.
  within(r1.warp_per_31ft_in, r1.warp_magnitude_in / 2, 1e-9, "1.6 in over 62 ft is 0.8 in per 31 ft");
  const short = computeTrackWarp({ ...ab, distance_ft: 31 });
  within(short.warp_per_31ft_in, short.warp_magnitude_in, 1e-9, "over 31 ft the rate is the reading");
});

// ===================== ballast-section-volume =====================

test("ballast section: the trapezoid is a rectangle plus two slope triangles, and that matches the mean-width form", () => {
  for (const c of [
    { top_width_ft: 20, depth_in: 12, side_slope_ratio: 1.5, length_ft: 1000, density_ton_per_cy: 1.4, raise_in: 2 },
    { top_width_ft: 16.5, depth_in: 8, side_slope_ratio: 2, length_ft: 5280, density_ton_per_cy: 1.35, raise_in: 0 },
    { top_width_ft: 22, depth_in: 18, side_slope_ratio: 0, length_ft: 300, density_ton_per_cy: 1.45, raise_in: 6 },
  ]) {
    const r = computeBallastSection(c);
    const d = c.depth_in / 12;
    // Second way: the top rectangle plus a triangle on each shoulder, each of
    // base (slope x depth) and height depth.
    const secondWay = c.top_width_ft * d + 2 * (0.5 * (c.side_slope_ratio * d) * d);
    within(r.area_sqft, secondWay, 1e-9, "trapezoid area computed a second way");
    within(r.bottom_width_ft, c.top_width_ft + 2 * c.side_slope_ratio * d, 1e-9, "bottom width");
    within(r.rectangle_area_sqft, c.top_width_ft * d, 1e-9, "the rectangle screen");
    // The shortfall of the rectangle screen is exactly the two triangles.
    within(r.area_sqft - r.rectangle_area_sqft, c.side_slope_ratio * d * d, 1e-9, "the slopes are the whole difference");
  }
});

test("ballast section: volume closes in both unit systems -- cubic yards, tons, and the per-mile figures", () => {
  const c = { top_width_ft: 20, depth_in: 12, side_slope_ratio: 1.5, length_ft: 1000, density_ton_per_cy: 1.4, raise_in: 2 };
  const r = computeBallastSection(c);
  // 27 cubic feet to the yard, 5,280 ft to the mile.
  within(r.volume_cy * 27, r.area_sqft * c.length_ft, 1e-9, "cubic yards from cubic feet");
  within(r.tons, r.volume_cy * c.density_ton_per_cy, 1e-9, "tons from yards at the placed density");
  within(r.cy_per_mile, r.volume_cy * 5280 / c.length_ft, 1e-9, "per mile scales from the run");
  within(r.tons_per_mile, r.cy_per_mile * c.density_ton_per_cy, 1e-9, "tons per mile");
  // A 1 ft deep, 20 ft top, 1.5:1 section is 20 + 1.5 = 21.5 sq ft, so a mile
  // of it is 21.5 x 5280 / 27 = 4,204.4 cy -- worked by hand.
  within(r.area_sqft, 21.5, 1e-9, "hand-figured section area");
  within(r.cy_per_mile, 21.5 * 5280 / 27, 1e-9, "hand-figured yards per mile");
  // A 2 in raise on the 20 ft top is 20 x (2/12) x 1000 / 27 = 123.46 cy, a
  // small fraction of the full section -- the distinction the note turns on.
  within(r.raise_volume_cy, 20 * (2 / 12) * 1000 / 27, 1e-9, "raise volume");
  assert.ok(r.raise_volume_cy < r.volume_cy / 5, "the raise is a fraction of the full section");
  // With no slopes the rectangle screen is exact and understates nothing.
  const flat = computeBallastSection({ ...c, side_slope_ratio: 0 });
  within(flat.understated_pct, 0, 1e-9, "no slopes, no understatement");
});

// ===================== locate-depth-offset =====================

test("locate depth offset: the half-signal offset equals the depth, from the field of a long straight conductor", () => {
  // For a long straight conductor at depth D the field magnitude goes as 1/r
  // and is perpendicular to the radius, so the HORIZONTAL component a locator's
  // peak antenna responds to is proportional to D / (D^2 + x^2). Setting that
  // to half its value at x = 0 gives 2 D^2 = D^2 + x^2, i.e. x = D. That is the
  // whole content of the 45-degree / half-signal check, and it is independent
  // of whatever the instrument computes from field strength.
  const bh = (D, x) => D / (D * D + x * x);
  for (const D of [18, 36, 54.5, 120]) {
    // Bisect for the offset at which the response halves.
    let lo = 0, hi = 10 * D;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (bh(D, mid) > bh(D, 0) / 2) lo = mid; else hi = mid;
    }
    const halfOffset = (lo + hi) / 2;
    within(halfOffset, D, 1e-6, `half-signal offset for a ${D} in deep line`);
    const r = computeLocateDepthOffset({
      instrument_depth_in: D, half_signal_offset_in: halfOffset,
      left_null_in: 24, right_null_in: 24, current_near_ma: 40, current_far_ma: 38, sharp_drop_pct: 25,
    });
    within(r.geometric_depth_in, D, 1e-6, "the geometry recovers the depth");
    within(r.depth_disagreement_pct, 0, 1e-6, "an instrument that agrees shows no disagreement");
    assert.equal(r.confident, true);
    within(r.null_asymmetry_pct, 0, 1e-9, "symmetric nulls");
    within(r.current_drop_pct, 5, 1e-9, "40 to 38 mA is a 5% drop");
  }
});

test("locate depth offset: the dangerous direction is the instrument reading DEEPER than the geometry", () => {
  const sym = { left_null_in: 30, right_null_in: 30, current_near_ma: 40, current_far_ma: 36, sharp_drop_pct: 25 };
  // Geometry says 36 in, the box says 42 in: the excavator is told there is
  // half a foot more cover than there is.
  const deep = computeLocateDepthOffset({ instrument_depth_in: 42, half_signal_offset_in: 36, ...sym });
  within(deep.depth_difference_in, -6, 1e-9, "geometry minus instrument");
  within(deep.depth_disagreement_pct, 6 / 42 * 100, 1e-9, "disagreement is against the instrument reading");
  assert.equal(deep.reads_shallow, false);
  assert.ok(/DEEPER/.test(deep.cause), "the cause names the dangerous direction");
  assert.equal(deep.confident, false);
  // The other way round the locate is still not trusted, but the error is
  // toward less cover than there is.
  const shallow = computeLocateDepthOffset({ instrument_depth_in: 36, half_signal_offset_in: 42, ...sym });
  assert.equal(shallow.reads_shallow, true);
  assert.ok(!/DEEPER/.test(shallow.cause));
  // Each screen independently destroys confidence. Nulls 24 and 36 in are 40%
  // apart about a 30 in mean; 40 -> 25 mA is a 37.5% drop past a 25% threshold.
  const nulls = computeLocateDepthOffset({ instrument_depth_in: 36, half_signal_offset_in: 36, left_null_in: 24, right_null_in: 36, current_near_ma: 40, current_far_ma: 36, sharp_drop_pct: 25 });
  within(nulls.null_asymmetry_pct, 12 / 30 * 100, 1e-9, "asymmetry about the mean of the two nulls");
  assert.equal(nulls.nulls_symmetric, false);
  assert.equal(nulls.confident, false);
  const drop = computeLocateDepthOffset({ instrument_depth_in: 36, half_signal_offset_in: 36, left_null_in: 30, right_null_in: 30, current_near_ma: 40, current_far_ma: 25, sharp_drop_pct: 25 });
  within(drop.current_drop_pct, 37.5, 1e-9, "40 to 25 mA");
  assert.equal(drop.current_gradual, false);
  assert.equal(drop.confident, false);
  // Signal current cannot rise away from the transmitter.
  assert.ok(computeLocateDepthOffset({ instrument_depth_in: 36, half_signal_offset_in: 36, left_null_in: 30, right_null_in: 30, current_near_ma: 30, current_far_ma: 31 }).error);
});

// ===================== vacuum-excavation-spoil =====================

test("vacuum excavation spoil: the tank sees bank volume plus swell plus the cut water, in exact unit conversions", () => {
  // 231 cubic inches to the gallon and 1,728 to the cubic foot, so a cubic yard
  // is 27 x 1728 / 231 = 201.974 gal. A 2 ft x 2 ft x 5 ft keyhole is 20 cu ft
  // = 0.7407 bank cy.
  const GAL_PER_CY = 27 * 1728 / 231;
  within(GAL_PER_CY, 201.9740, 1e-3, "gallons in a cubic yard");
  const c = { pit_length_ft: 2, pit_width_ft: 2, pit_depth_ft: 5, pit_count: 30, swell_pct: 30, water_added_gal: 600, tank_capacity_cy: 12, haul_round_trip_min: 45 };
  const r = computeVacuumExcavationSpoil(c);
  within(r.bank_cy_each, 20 / 27, 1e-9, "one keyhole, bank");
  within(r.bank_cy_total, 30 * 20 / 27, 1e-9, "thirty of them");
  within(r.swelled_cy, r.bank_cy_total * 1.3, 1e-9, "30% swell");
  within(r.water_cy, 600 / GAL_PER_CY, 1e-9, "600 gal of cut water as yards");
  within(r.loose_cy_total, r.swelled_cy + r.water_cy, 1e-9, "what actually goes in the tank");
  assert.ok(r.loose_cy_total > r.bank_cy_total * 1.3 - 1e-9, "the water only adds");
});

test("vacuum excavation spoil: the fill count is a fencepost -- the last partial tank still has to be hauled", () => {
  for (const cap of [3, 7, 12, 22.222]) {
    for (const n of [1, 5, 17, 40]) {
      const c = { pit_length_ft: 3, pit_width_ft: 2.5, pit_depth_ft: 4, pit_count: n, swell_pct: 25, water_added_gal: 40 * n, tank_capacity_cy: cap, haul_round_trip_min: 30 };
      const r = computeVacuumExcavationSpoil(c);
      assert.ok(r.tank_fills * cap >= r.loose_cy_total - 1e-9, `${n} pits @ ${cap} cy: the fills hold the spoil`);
      assert.ok((r.tank_fills - 1) * cap < r.loose_cy_total + 1e-9, `${n} pits @ ${cap} cy: no spare fill`);
      assert.ok(r.tank_fills >= r.bank_only_fills, "planning on bank volume never over-counts the trips");
      within(r.haul_time_min, r.tank_fills * c.haul_round_trip_min, 1e-9, "a haul cycle per fill");
      within(r.haul_time_hr * 60, r.haul_time_min, 1e-9, "hours agree with minutes");
    }
  }
  // Swell is what makes the tank fill sooner: 30 pits of 0.7407 bank cy is
  // 22.22 cy bank (2 fills of 12) but 28.89 cy at 30% swell (3 fills).
  const dry = computeVacuumExcavationSpoil({ pit_length_ft: 2, pit_width_ft: 2, pit_depth_ft: 5, pit_count: 30, swell_pct: 30, water_added_gal: 0, tank_capacity_cy: 12, haul_round_trip_min: 45 });
  assert.equal(dry.bank_only_fills, 2);
  assert.equal(dry.tank_fills, 3, "swell costs a whole extra haul");
});

// ===================== pipe-bursting-pull-load =====================

test("pipe bursting: the soil displaced is the annulus between the two pipes, computed as a difference of circles", () => {
  for (const c of [
    { old_diameter_in: 8, new_diameter_in: 12, run_length_ft: 300 },
    { old_diameter_in: 6, new_diameter_in: 6.625, run_length_ft: 80 },
    { old_diameter_in: 24, new_diameter_in: 36, run_length_ft: 1000 },
  ]) {
    const r = computePipeBurstingPullLoad({
      ...c, cover_depth_ft: 8, expansion_force_lb_per_sqin: 400, drag_lb_per_ft: 15,
      pipe_safe_pull_lb: 1e9, adjacent_utility_ft: 50,
    });
    const R = c.new_diameter_in / 2, rr = c.old_diameter_in / 2;
    within(r.displaced_area_sqin, Math.PI * (R * R - rr * rr), 1e-9, "annulus as pi(R^2 - r^2)");
    // And a third way, as the difference of squares factored.
    within(r.displaced_area_sqin, Math.PI / 4 * (c.new_diameter_in - c.old_diameter_in) * (c.new_diameter_in + c.old_diameter_in), 1e-9, "annulus factored");
    within(r.displaced_area_sqft * 144, r.displaced_area_sqin, 1e-9, "144 sq in to the sq ft");
    within(r.displaced_cuft, r.displaced_area_sqft * c.run_length_ft, 1e-9, "a prism of soil the length of the run");
    within(r.displaced_cy * 27, r.displaced_cuft, 1e-9, "27 cu ft to the yard");
    within(r.upsize_ratio, c.new_diameter_in / c.old_diameter_in, 1e-9, "upsize ratio");
  }
  // 8 in to 12 in is pi/4 x (144 - 64) = 62.83 sq in; over 300 ft that is
  // 130.9 cu ft = 4.85 cy of soil that has to go somewhere -- worked by hand.
  const r = computePipeBurstingPullLoad({ old_diameter_in: 8, new_diameter_in: 12, run_length_ft: 300, cover_depth_ft: 8, expansion_force_lb_per_sqin: 400, drag_lb_per_ft: 15, pipe_safe_pull_lb: 40000, adjacent_utility_ft: 6 });
  within(r.displaced_area_sqin, 62.8319, 1e-3, "hand-figured annulus");
  within(r.displaced_cy, 4.8481, 1e-3, "hand-figured yards of soil");
});

test("pipe bursting: pull load splits into expansion and drag, and the screens key off cover and influence radius", () => {
  const c = { old_diameter_in: 8, new_diameter_in: 12, run_length_ft: 300, cover_depth_ft: 8, expansion_force_lb_per_sqin: 400, drag_lb_per_ft: 15, pipe_safe_pull_lb: 40000, adjacent_utility_ft: 6 };
  const r = computePipeBurstingPullLoad(c);
  within(r.expansion_force_lb + r.drag_lb, r.pull_load_lb, 1e-9, "the two parts are the whole load");
  within(r.drag_lb, 15 * 300, 1e-9, "drag is per foot of run");
  // Drag is linear in length; expansion is not -- it is set by the annulus.
  const longer = computePipeBurstingPullLoad({ ...c, run_length_ft: 600, pipe_safe_pull_lb: 1e9 });
  within(longer.drag_lb, 2 * r.drag_lb, 1e-9, "twice the run, twice the drag");
  within(longer.expansion_force_lb, r.expansion_force_lb, 1e-9, "but the same expansion force");
  // Cover screen: 4 diameters of cover is the stated comfort, so a 12 in pipe
  // needs 4 ft. At exactly 4 ft the ratio is 4 and the screen is satisfied.
  within(computePipeBurstingPullLoad({ ...c, cover_depth_ft: 4 }).cover_to_diameter, 4, 1e-9, "4 ft over a 12 in pipe");
  assert.equal(computePipeBurstingPullLoad({ ...c, cover_depth_ft: 4 }).heave_risk, false, "at four diameters, not flagged");
  assert.equal(computePipeBurstingPullLoad({ ...c, cover_depth_ft: 3.9 }).heave_risk, true, "just under, flagged");
  // Influence zone: three diameters, so 3 ft for a 12 in pipe.
  within(r.influence_radius_ft, 3, 1e-9, "three diameters in feet");
  assert.equal(r.utility_at_risk, false, "a utility 6 ft off is outside 3 ft");
  assert.equal(computePipeBurstingPullLoad({ ...c, adjacent_utility_ft: 3 }).utility_at_risk, true, "one sitting on the boundary is inside");
  // The pull verdict is the product pipe's limit, not the rig's.
  const tight = computePipeBurstingPullLoad({ ...c, pipe_safe_pull_lb: r.pull_load_lb });
  assert.equal(tight.pull_ok, true, "exactly at the safe pull is within it");
  within(tight.pull_margin_lb, 0, 1e-6, "no margin left");
  assert.equal(computePipeBurstingPullLoad({ ...c, pipe_safe_pull_lb: r.pull_load_lb * 0.99 }).pull_ok, false);
  // Downsizing is not bursting.
  assert.ok(computePipeBurstingPullLoad({ ...c, new_diameter_in: 6 }).error);
});

// ===================== kiln-drying-time =====================

test("kiln drying: the two regimes account for every moisture point removed", () => {
  for (const c of [
    { mc_initial_pct: 80, mc_final_pct: 7, fsp_mc_pct: 30, rate_above_fsp_ppd: 6, rate_below_fsp_ppd: 1.5 },
    { mc_initial_pct: 45, mc_final_pct: 35, fsp_mc_pct: 30, rate_above_fsp_ppd: 5, rate_below_fsp_ppd: 1 },  // stops above FSP
    { mc_initial_pct: 25, mc_final_pct: 8, fsp_mc_pct: 30, rate_above_fsp_ppd: 5, rate_below_fsp_ppd: 1 },   // starts below FSP
  ]) {
    const inp = { ...c, equalize_condition_days: 4, thickness_in: 1, alt_thickness_in: 2, thickness_exponent: 1.8 };
    const r = computeKilnDryingTime(inp);
    // Mass balance on moisture: points = rate x days in each regime.
    within(r.days_above_fsp * c.rate_above_fsp_ppd + r.days_below_fsp * c.rate_below_fsp_ppd,
      c.mc_initial_pct - c.mc_final_pct, 1e-9, "every point is removed in one regime or the other");
    within(r.points_removed, c.mc_initial_pct - c.mc_final_pct, 1e-9, "points removed");
    within(r.drying_days, r.days_above_fsp + r.days_below_fsp, 1e-9, "the regimes are the whole dry");
    within(r.cycle_days, r.drying_days + 4, 1e-9, "equalizing and conditioning are added, not absorbed");
    // The split is set by where the run crosses fibre saturation.
    const above = Math.max(0, c.mc_initial_pct - Math.max(c.mc_final_pct, c.fsp_mc_pct));
    within(r.days_above_fsp * c.rate_above_fsp_ppd, above, 1e-9, "points above FSP");
  }
  // A run that never crosses FSP spends no time in the other regime.
  const high = computeKilnDryingTime({ mc_initial_pct: 45, mc_final_pct: 35, fsp_mc_pct: 30, rate_above_fsp_ppd: 5, rate_below_fsp_ppd: 1, equalize_condition_days: 0, thickness_in: 1, alt_thickness_in: 1, thickness_exponent: 1.8 });
  within(high.days_below_fsp, 0, 1e-9, "stops above FSP");
  within(high.days_above_fsp, 2, 1e-9, "10 points at 5 per day");
});

test("kiln drying: the linear average understates the tail, and the thickness law is not proportional", () => {
  // 80% to 7% at 6 points/day above a 30% FSP and 1.5 below: 50/6 = 8.333 days
  // then 23/1.5 = 15.333 days. The tail is 65% of the schedule though it is
  // only 32% of the points -- which is the fact the note is about.
  const r = computeKilnDryingTime({ mc_initial_pct: 80, mc_final_pct: 7, fsp_mc_pct: 30, rate_above_fsp_ppd: 6, rate_below_fsp_ppd: 1.5, equalize_condition_days: 4, thickness_in: 1, alt_thickness_in: 2, thickness_exponent: 1.8 });
  within(r.days_above_fsp, 50 / 6, 1e-9, "free water");
  within(r.days_below_fsp, 23 / 1.5, 1e-9, "bound water");
  within(r.below_share_pct, (23 / 1.5) / (50 / 6 + 23 / 1.5) * 100, 1e-9, "the tail's share of the days");
  assert.ok(r.below_share_pct > 60, "the last 23 points take most of the kiln time");
  within(r.linear_rate_ppd, 73 / r.drying_days, 1e-9, "the misleading average");
  assert.ok(r.linear_rate_ppd < 6 && r.linear_rate_ppd > 1.5, "the average lies between the two real rates");
  // 4/4 to 8/4 at an exponent of 1.8 is 2^1.8 = 3.4822, against the 2.0 a
  // proportional quote assumes: the mill underquotes by 2^0.8 = 1.7411.
  within(r.thickness_scale, Math.pow(2, 1.8), 1e-9, "doubling thickness, exponent 1.8");
  within(r.proportional_days, r.drying_days * 2, 1e-9, "what a proportional quote says");
  within(r.underquote_factor, Math.pow(2, 0.8), 1e-9, "underquoted by most of a factor of two");
  within(r.alt_drying_days, r.drying_days * Math.pow(2, 1.8), 1e-9, "the thick stock's dry time");
  within(r.alt_cycle_days, r.alt_drying_days + 4, 1e-9, "equalizing is not scaled by thickness");
  // Exponent 1 collapses the law to proportional, which is the control case.
  const lin = computeKilnDryingTime({ mc_initial_pct: 80, mc_final_pct: 7, fsp_mc_pct: 30, rate_above_fsp_ppd: 6, rate_below_fsp_ppd: 1.5, equalize_condition_days: 0, thickness_in: 1, alt_thickness_in: 2, thickness_exponent: 1 });
  within(lin.underquote_factor, 1, 1e-9, "no underquote when the law is proportional");
  // You cannot dry up.
  assert.ok(computeKilnDryingTime({ mc_initial_pct: 10, mc_final_pct: 12, fsp_mc_pct: 30, rate_above_fsp_ppd: 5, rate_below_fsp_ppd: 1, equalize_condition_days: 0, thickness_in: 1, alt_thickness_in: 1, thickness_exponent: 1.8 }).error);
});

// ===================== bandmill-speed-bite =====================

test("bandmill: blade speed is the wheel's rim speed, and a 6 ft wheel at 600 rpm lands in the usual 9,000-12,000 sfpm band", () => {
  // Rim speed = pi x diameter x rpm; in feet per minute with the diameter in
  // inches that is pi x D / 12 x rpm. A 72 in wheel at 600 rpm:
  // 3.14159 x 6 ft x 600 = 11,310 ft/min.
  const r = computeBandmillSpeedBite({ wheel_diameter_in: 72, wheel_rpm: 600, tooth_spacing_in: 1.75, feed_rate_fpm: 120, target_bite_in: 0.030, kerf_in: 0.095, depth_of_face_in: 12, gullet_capacity_cuin: 0.08 });
  within(r.blade_speed_sfpm, Math.PI * 6 * 600, 1e-9, "rim speed from the circumference in feet");
  within(r.blade_speed_sfpm, 11309.73, 1e-4, "hand-figured");
  assert.ok(r.blade_speed_sfpm > 9000 && r.blade_speed_sfpm < 12000, "inside the band a mill actually runs");
  // Teeth pass a fixed point at the rim speed divided by the tooth pitch.
  within(r.teeth_per_min, r.blade_speed_sfpm * 12 / 1.75, 1e-9, "teeth per minute");
});

test("bandmill: bite per tooth from the time between teeth -- the wood advance in one tooth period", () => {
  for (const c of [
    { wheel_diameter_in: 72, wheel_rpm: 600, tooth_spacing_in: 1.75, feed_rate_fpm: 120 },
    { wheel_diameter_in: 54, wheel_rpm: 700, tooth_spacing_in: 1.25, feed_rate_fpm: 60 },
    { wheel_diameter_in: 96, wheel_rpm: 450, tooth_spacing_in: 2.0, feed_rate_fpm: 240 },
  ]) {
    const r = computeBandmillSpeedBite({ ...c, target_bite_in: 0.030, kerf_in: 0.095, depth_of_face_in: 12, gullet_capacity_cuin: 0.08 });
    // Route by period rather than by count: the blade moves at
    // pi x D x rpm in/min, so one tooth pitch passes in spacing / that minutes,
    // and in that time the carriage advances feed x 12 in/min x the period.
    const bladeInPerMin = Math.PI * c.wheel_diameter_in * c.wheel_rpm;
    const toothPeriodMin = c.tooth_spacing_in / bladeInPerMin;
    within(r.bite_in, c.feed_rate_fpm * 12 * toothPeriodMin, 1e-9, "bite as the advance in one tooth period");
    // The inversion must round-trip: feeding at feed_for_target hits the target.
    const back = computeBandmillSpeedBite({ ...c, feed_rate_fpm: r.feed_for_target_fpm, target_bite_in: 0.030, kerf_in: 0.095, depth_of_face_in: 12, gullet_capacity_cuin: 0.08 });
    within(back.bite_in, 0.030, 1e-9, "the filer's inversion round-trips");
  }
});

test("bandmill: the gullet is the constraint -- the chip volume at the deepest supported face is exactly the capacity", () => {
  const c = { wheel_diameter_in: 72, wheel_rpm: 600, tooth_spacing_in: 1.75, feed_rate_fpm: 120, target_bite_in: 0.030, kerf_in: 0.095, depth_of_face_in: 12, gullet_capacity_cuin: 0.08 };
  const r = computeBandmillSpeedBite(c);
  // Each gullet carries one chip: bite x kerf x face.
  within(r.gullet_load_cuin, r.bite_in * c.kerf_in * c.depth_of_face_in, 1e-9, "chip volume");
  within(r.gullet_use_pct, r.gullet_load_cuin / c.gullet_capacity_cuin * 100, 1e-9, "share of the gullet used");
  // At the reported deepest face, the chip exactly fills the gullet.
  const atMaxFace = computeBandmillSpeedBite({ ...c, depth_of_face_in: r.max_face_in });
  within(atMaxFace.gullet_load_cuin, c.gullet_capacity_cuin, 1e-6, "the deepest face fills the gullet exactly");
  within(atMaxFace.gullet_use_pct, 100, 1e-6, "100% of capacity");
  // And at the reported maximum feed for the entered face, likewise.
  const atMaxFeed = computeBandmillSpeedBite({ ...c, feed_rate_fpm: r.max_feed_at_face_fpm });
  within(atMaxFeed.gullet_use_pct, 100, 1e-6, "the feed cap fills the gullet exactly");
  // The 0.020-0.045 in band, at and just past each end.
  const atLow = computeBandmillSpeedBite({ ...c, feed_rate_fpm: computeBandmillSpeedBite({ ...c, target_bite_in: 0.020 }).feed_for_target_fpm });
  assert.equal(atLow.in_typical_band, true, "0.020 in is inside the band");
  const atHigh = computeBandmillSpeedBite({ ...c, feed_rate_fpm: computeBandmillSpeedBite({ ...c, target_bite_in: 0.045 }).feed_for_target_fpm });
  assert.equal(atHigh.in_typical_band, true, "0.045 in is inside the band");
  const rubbing = computeBandmillSpeedBite({ ...c, feed_rate_fpm: computeBandmillSpeedBite({ ...c, target_bite_in: 0.010 }).feed_for_target_fpm });
  assert.equal(rubbing.in_typical_band, false);
  assert.ok(/BELOW/.test(rubbing.bite_verdict));
  // A bite fine in a 12 in cant is too much in a 30 in one: same bite, deeper
  // face, so the gullet load scales with the face.
  const deep = computeBandmillSpeedBite({ ...c, depth_of_face_in: 30 });
  within(deep.gullet_load_cuin / r.gullet_load_cuin, 30 / 12, 1e-9, "gullet load scales with the face");
  within(deep.bite_in, r.bite_in, 1e-9, "the bite itself does not change");
});

// ===================== log-truck-payload =====================

test("log truck payload: the legal load grosses out exactly at the limit, checked by weighing it back", () => {
  // 80,000 lb federal interstate gross (23 U.S.C. 127), a 32,000 lb tare for a
  // truck-and-trailer log rig, leaves 48,000 lb of payload.
  const c = { legal_gross_lb: 80000, tare_lb: 32000, weight_per_mbf_lb: 9000, alt_weight_per_mbf_lb: 12000, seasoned_weight_per_mbf_lb: 7000, load_volume_mbf: 5 };
  const r = computeLogTruckPayload(c);
  within(r.payload_lb, 48000, 1e-9, "gross less tare");
  within(r.legal_load_mbf, 48000 / 9000, 1e-9, "5.333 MBF of this wood");
  // Weigh the reported legal load back over the scale: it must gross exactly.
  const back = computeLogTruckPayload({ ...c, load_volume_mbf: r.legal_load_mbf });
  within(back.gross_with_load_lb, c.legal_gross_lb, 1e-6, "the legal load grosses at the limit");
  within(back.margin_lb, 0, 1e-6, "no payload left");
  assert.ok(/AT the gross limit/.test(back.load_verdict));
  // Heavier wood, same payload: fewer board feet, in exact inverse proportion.
  within(r.alt_legal_load_mbf * 12000, r.legal_load_mbf * 9000, 1e-9, "both loads weigh the payload");
  within(r.seasoned_legal_load_mbf * 7000, 48000, 1e-9, "seasoned wood carries more volume");
  assert.ok(r.seasoned_legal_load_mbf > r.legal_load_mbf, "drier wood, more board feet");
  within(r.mbf_difference, r.legal_load_mbf - r.alt_legal_load_mbf, 1e-9, "the volume the species costs");
});

test("log truck payload: the habit overload is the heavier wood weighed at the lighter wood's stake height", () => {
  const c = { legal_gross_lb: 80000, tare_lb: 32000, weight_per_mbf_lb: 9000, alt_weight_per_mbf_lb: 12000, seasoned_weight_per_mbf_lb: 7000, load_volume_mbf: 5 };
  const r = computeLogTruckPayload(c);
  // Load 5.333 MBF (legal for the 9,000 lb wood) of 12,000 lb wood: that is
  // 64,000 lb on a 48,000 lb payload, 16,000 lb over, and the truck grosses
  // 96,000 lb. Check by running the tile with the heavy wood at that volume.
  const habit = computeLogTruckPayload({ ...c, weight_per_mbf_lb: 12000, load_volume_mbf: r.legal_load_mbf });
  within(r.overload_if_habit_lb, 16000, 1e-6, "16,000 lb over on habit");
  within(-habit.margin_lb, r.overload_if_habit_lb, 1e-6, "the same overload weighed directly");
  within(habit.gross_with_load_lb, 96000, 1e-6, "96,000 lb across the scale");
  assert.ok(/OVER the gross limit/.test(habit.load_verdict));
  // The entered load's margin and percent are consistent with the payload.
  within(r.entered_load_lb, 5 * 9000, 1e-9, "5 MBF at 9,000 lb");
  within(r.margin_lb, 48000 - 45000, 1e-9, "3,000 lb left");
  within(r.margin_pct, 3000 / 48000 * 100, 1e-9, "6.25% of payload left");
  within(r.gross_with_load_lb, 32000 + 45000, 1e-9, "tare plus load");
  assert.ok(computeLogTruckPayload({ ...c, tare_lb: 85000 }).error, "a tare over the gross is refused");
});

// ===================== line-array-splay =====================

test("line array: the coverage angle is the difference of two down-tilts, cross-checked by the sine route", () => {
  for (const c of [
    { trim_height_ft: 26, ear_height_ft: 4, near_throw_ft: 25, far_throw_ft: 150, cabinets: 12 },
    { trim_height_ft: 40, ear_height_ft: 3.5, near_throw_ft: 15, far_throw_ft: 220, cabinets: 16 },
    { trim_height_ft: 18, ear_height_ft: 4, near_throw_ft: 30, far_throw_ft: 60, cabinets: 6 },
  ]) {
    const r = computeLineArraySplay(c);
    const dh = c.trim_height_ft - c.ear_height_ft;
    // Second trig route: the angle whose sine is drop over the slant range.
    within(r.angle_near_deg, Math.asin(dh / Math.hypot(dh, c.near_throw_ft)) / DEG, 1e-9, "near down-tilt via asin");
    within(r.angle_far_deg, Math.asin(dh / Math.hypot(dh, c.far_throw_ft)) / DEG, 1e-9, "far down-tilt via asin");
    // And the tangents must reconstruct the geometry they came from.
    within(Math.tan(r.angle_near_deg * DEG) * c.near_throw_ft, dh, 1e-9, "near angle reconstructs the drop");
    within(Math.tan(r.angle_far_deg * DEG) * c.far_throw_ft, dh, 1e-9, "far angle reconstructs the drop");
    within(r.coverage_deg, r.angle_near_deg - r.angle_far_deg, 1e-9, "coverage is the difference");
    within(r.avg_splay_deg * c.cabinets, r.coverage_deg, 1e-9, "the splays have to add up to the coverage");
    assert.ok(r.angle_near_deg > r.angle_far_deg, "the first row is always steeper down than the last");
  }
});

test("line array: the level taper is inverse-square, checked as a power ratio rather than a pressure ratio", () => {
  const c = { trim_height_ft: 26, ear_height_ft: 4, near_throw_ft: 25, far_throw_ft: 150, cabinets: 12 };
  const r = computeLineArraySplay(c);
  // Inverse square: intensity falls as 1/r^2, so the level difference is
  // 10 log10((far/near)^2) -- the same number as 20 log10(far/near), arrived
  // at from power rather than from pressure.
  within(r.level_taper_db, 10 * Math.log10(Math.pow(150 / 25, 2)), 1e-9, "taper as a power ratio");
  // Hand figures for the note's rig: drop 22 ft, atan(22/25) = 41.3478 deg,
  // atan(22/150) = 8.3439 deg, 33.0039 deg over 12 cabinets = 2.7503 deg,
  // 20 log10 6 = 15.5630 dB -- the note rounds these to 41.3, 8.3, 33.0,
  // 2.75 and 15.6.
  within(r.angle_near_deg, 41.3478, 1e-2, "near");
  within(r.angle_far_deg, 8.3439, 1e-2, "far");
  within(r.coverage_deg, 33.0039, 1e-2, "coverage");
  within(r.avg_splay_deg, 2.7503, 1e-2, "average splay");
  within(r.level_taper_db, 15.5630, 1e-2, "taper");
  // Doubling every distance leaves the taper alone (it is a ratio) but flattens
  // the angles.
  const far = computeLineArraySplay({ ...c, near_throw_ft: 50, far_throw_ft: 300 });
  within(far.level_taper_db, r.level_taper_db, 1e-9, "taper depends only on the throw ratio");
  assert.ok(far.coverage_deg < r.coverage_deg, "a deeper room from the same trim covers a narrower angle");
  // Doubling the throw ratio from 6 to 12 adds 20 log10 2 = 6.02 dB.
  const twice = computeLineArraySplay({ ...c, far_throw_ft: 300 });
  within(twice.level_taper_db - r.level_taper_db, 20 * Math.log10(2), 1e-9, "doubling the far throw costs 6.02 dB");
});

// ===================== chain-hoist-lift-time =====================

test("chain hoist: the hoisting horsepower comes out of work over time, not just the 33,000 formula", () => {
  // One horsepower is 33,000 ft-lb per minute. Lifting a load L feet does
  // L x W ft-lb of work; at V ft/min it takes L / V minutes; dividing gives
  // W x V / 33,000 hp -- independent of the lift height, which is the check.
  for (const c of [
    { lift_height_ft: 60, hoist_speed_fpm: 16, load_lb: 2000 },
    { lift_height_ft: 35, hoist_speed_fpm: 32, load_lb: 1100 },
    { lift_height_ft: 90, hoist_speed_fpm: 64, load_lb: 500 },
  ]) {
    const r = computeChainHoistLiftTime({ ...c, duty_cycle: 0.4, rating_period_min: 10, hoists: 1 });
    const workFtLb = c.load_lb * c.lift_height_ft;
    const minutes = c.lift_height_ft / c.hoist_speed_fpm;
    within(r.hoisting_hp, workFtLb / minutes / 33000, 1e-9, "power as work over time");
    within(r.lift_time_min, minutes, 1e-9, "lift time");
    // Same load and speed, twice the trim: same horsepower, twice the time.
    const tall = computeChainHoistLiftTime({ ...c, lift_height_ft: c.lift_height_ft * 2, duty_cycle: 0.4, rating_period_min: 10, hoists: 1 });
    within(tall.hoisting_hp, r.hoisting_hp, 1e-9, "horsepower does not depend on the trim");
    within(tall.lift_time_min, 2 * r.lift_time_min, 1e-9, "but the time does");
  }
});

test("chain hoist: the duty rating is an on-time budget, and one 60 ft trim at 16 ft/min nearly spends it", () => {
  // A 2,000 lb load at 16 ft/min up 60 ft: 3.75 min of running, 0.970 hp, and
  // a 40% duty over a 10 min period allows 4.0 min on -- 1.0667 lifts, one
  // lift and no margin. Hand-figured.
  const r = computeChainHoistLiftTime({ lift_height_ft: 60, hoist_speed_fpm: 16, load_lb: 2000, duty_cycle: 0.4, rating_period_min: 10, hoists: 1 });
  within(r.lift_time_min, 3.75, 1e-9, "60 / 16");
  within(r.hoisting_hp, 2000 * 16 / 33000, 1e-9, "0.970 hp");
  within(r.hoisting_hp, 0.9697, 1e-2, "under one horsepower");
  within(r.allowed_on_time_min, 4.0, 1e-9, "40% of ten minutes");
  within(r.lifts_per_period, 4.0 / 3.75, 1e-9, "1.0667 lifts");
  // The budget closes: lifts x lift time is the allowed on-time.
  within(r.lifts_per_period * r.lift_time_min, r.allowed_on_time_min, 1e-9, "on-time budget closes");
  assert.ok(/no margin/.test(r.verdict), "one lift and no margin");
  // A faster hoist buys the second lift: 32 ft/min halves the time to 1.875
  // min, giving 2.13 lifts.
  const fast = computeChainHoistLiftTime({ lift_height_ft: 60, hoist_speed_fpm: 32, load_lb: 2000, duty_cycle: 0.4, rating_period_min: 10, hoists: 1 });
  within(fast.lifts_per_period, 4.0 / 1.875, 1e-9, "a high-speed motor buys a second lift");
  assert.ok(/room to spare/.test(fast.verdict));
  within(fast.hoisting_hp, 2 * r.hoisting_hp, 1e-9, "twice the speed, twice the power");
  // A trim the motor cannot make in one press.
  const tall = computeChainHoistLiftTime({ lift_height_ft: 100, hoist_speed_fpm: 16, load_lb: 2000, duty_cycle: 0.4, rating_period_min: 10, hoists: 1 });
  assert.ok(tall.lifts_per_period < 1, "6.25 min of running against a 4 min budget");
  assert.ok(/over the rating/.test(tall.verdict));
  // A set of hoists draws the sum; the per-hoist figures do not change.
  const set = computeChainHoistLiftTime({ lift_height_ft: 60, hoist_speed_fpm: 16, load_lb: 2000, duty_cycle: 0.4, rating_period_min: 10, hoists: 8 });
  within(set.set_hp, 8 * r.hoisting_hp, 1e-9, "eight motors, eight times the power");
  within(set.lift_time_min, r.lift_time_min, 1e-9, "they fly together, so the time is the same");
  assert.ok(computeChainHoistLiftTime({ lift_height_ft: 60, hoist_speed_fpm: 16, load_lb: 2000, duty_cycle: 0.4, rating_period_min: 10, hoists: 2.5 }).error);
});

// ===================== haze-machine-sizing =====================

test("haze machine: the steady state is a balance -- output over ventilation, so equal density needs output proportional to V x ACH", () => {
  // Well-mixed room: dC/dt = G/V - (ACH) C, so the density settles at
  // C = G / (V x ACH). Holding C at the reference machine's density means
  // G scales with the PRODUCT of volume and air-change rate.
  const ref = { ref_volume_cf: 100000, ref_ach: 2, ref_output: 1 };
  const refDensity = ref.ref_output / (ref.ref_volume_cf * ref.ref_ach);
  for (const c of [
    { volume_cf: 200000, ach: 4 },
    { volume_cf: 100000, ach: 2 },
    { volume_cf: 45000, ach: 1 },
    { volume_cf: 1.2e6, ach: 6 },
  ]) {
    const r = computeHazeMachineSizing({ ...c, ...ref });
    within(r.required_output / (c.volume_cf * c.ach), refDensity, 1e-9, "the same steady-state density as the reference");
    within(r.ventilation_cfm, c.volume_cf * c.ach / 60, 1e-9, "cfm from air changes per hour");
  }
  // The note's hall: 200,000 cf at 4 ACH moves 13,333 cfm and needs 4 quarts
  // an hour -- four times the machine for twice the room, because the air
  // handlers did half the damage.
  const hall = computeHazeMachineSizing({ volume_cf: 200000, ach: 4, ...ref });
  within(hall.ventilation_cfm, 13333.33, 1e-3, "13,333 cfm");
  within(hall.required_output, 4, 1e-9, "four quarts an hour");
  within(hall.scaling_factor, 4, 1e-9, "scaling factor");
  // Doubling the air handlers alone doubles the machine.
  const quiet = computeHazeMachineSizing({ volume_cf: 200000, ach: 2, ...ref });
  within(hall.required_output / quiet.required_output, 2, 1e-9, "twice the ACH, twice the machine");
});

test("haze machine: the fill curve integrated step by step reaches 63% at one time constant and 90% at ln10 / ACH", () => {
  // Integrate dC/dt = G/V - ACH x C forward with small steps and read the
  // times off the curve, rather than trusting the closed form.
  for (const ach of [1, 2, 4, 6]) {
    const r = computeHazeMachineSizing({ volume_cf: 200000, ach, ref_volume_cf: 100000, ref_ach: 2, ref_output: 1 });
    const V = 200000, G = r.required_output;
    const Cinf = G / (V * ach);
    const dt = 1e-5; // hours
    let C = 0, t = 0, t63 = null, t90 = null;
    for (let i = 0; i < 4e6 && t90 === null; i++) {
      C += (G / V - ach * C) * dt;
      t += dt;
      if (t63 === null && C >= Cinf * (1 - 1 / Math.E)) t63 = t;
      if (C >= Cinf * 0.9) t90 = t;
    }
    within(r.time_constant_hr, t63, 0.1, `ACH ${ach}: one time constant is 63% of final`);
    within(r.time_to_90_hr, t90, 0.1, `ACH ${ach}: ln10 / ACH is 90% of final`);
    within(r.time_constant_hr, 1 / ach, 1e-9, "time constant");
    within(r.time_to_90_hr, Math.LN10 / ach, 1e-9, "time to 90%");
  }
  // The note's numbers: at 4 ACH, 63% in 15 minutes and 90% in about 35.
  const four = computeHazeMachineSizing({ volume_cf: 200000, ach: 4, ref_volume_cf: 100000, ref_ach: 2, ref_output: 1 });
  within(four.time_constant_hr * 60, 15, 1e-9, "15 minutes");
  within(four.time_to_90_hr * 60, 34.54, 0.1, "about 35 minutes");
  // At 1 ACH the same room takes over two hours to settle.
  assert.ok(computeHazeMachineSizing({ volume_cf: 200000, ach: 1, ref_volume_cf: 100000, ref_ach: 2, ref_output: 1 }).time_to_90_hr > 2);
});

// ===================== led-tape-max-run =====================

test("LED tape: the far-end drop integrated foot by foot hits the tolerance exactly at the reported run length", () => {
  // Walk the strip from the feed: at distance x the conductors still carry the
  // load of the (L - x) ft beyond, so I(x) = ppf (L - x) / V, and the drop is
  // the integral of I(x) x rpf dx. Summing that numerically must land on the
  // tolerance at the run the tile reports.
  const dropPct = (ppf, rpf, V, L, steps = 200000) => {
    const dx = L / steps;
    let drop = 0;
    for (let i = 0; i < steps; i++) {
      const x = (i + 0.5) * dx;          // midpoint of the segment
      drop += (ppf * (L - x) / V) * rpf * dx;
    }
    return drop / V * 100;
  };
  for (const c of [
    { power_per_ft_w: 4.8, supply_voltage_v: 12, resistance_per_ft: 0.02, drop_tolerance_pct: 10 },
    { power_per_ft_w: 4.8, supply_voltage_v: 24, resistance_per_ft: 0.02, drop_tolerance_pct: 10 },
    { power_per_ft_w: 9.6, supply_voltage_v: 24, resistance_per_ft: 0.035, drop_tolerance_pct: 3 },
    { power_per_ft_w: 2.0, supply_voltage_v: 12, resistance_per_ft: 0.05, drop_tolerance_pct: 15 },
  ]) {
    const r = computeLedTapeMaxRun(c);
    within(dropPct(c.power_per_ft_w, c.resistance_per_ft, c.supply_voltage_v, r.max_run_ft),
      c.drop_tolerance_pct, 0.01, "integrated drop at the reported run");
    // A foot longer is over tolerance, so the run really is the wall.
    assert.ok(dropPct(c.power_per_ft_w, c.resistance_per_ft, c.supply_voltage_v, r.max_run_ft + 1) > c.drop_tolerance_pct);
  }
});

test("LED tape: the run scales with the voltage and as the square root of everything else, and a 12 V strip walls out where the note says", () => {
  const base = { power_per_ft_w: 4.8, supply_voltage_v: 12, resistance_per_ft: 0.02, drop_tolerance_pct: 10 };
  const r12 = computeLedTapeMaxRun(base);
  const r24 = computeLedTapeMaxRun({ ...base, supply_voltage_v: 24 });
  within(r24.max_run_ft / r12.max_run_ft, 2, 1e-9, "24 V goes twice as far as 12 V");
  // A typical 12 V tape (4.8 W/ft, 0.02 ohm/ft round trip) at 10% walls out at
  // 17.3 ft, inside the 16-20 ft the note claims.
  within(r12.max_run_ft, 12 * Math.sqrt(0.2 / (4.8 * 0.02)), 1e-9, "closed form");
  assert.ok(r12.max_run_ft > 16 && r12.max_run_ft < 20, `12 V strip walls out at ${r12.max_run_ft.toFixed(1)} ft`);
  // Square-root scaling in load, resistance and tolerance.
  within(computeLedTapeMaxRun({ ...base, power_per_ft_w: 19.2 }).max_run_ft, r12.max_run_ft / 2, 1e-9, "4x the load, half the run");
  within(computeLedTapeMaxRun({ ...base, resistance_per_ft: 0.08 }).max_run_ft, r12.max_run_ft / 2, 1e-9, "4x the resistance, half the run");
  within(computeLedTapeMaxRun({ ...base, drop_tolerance_pct: 2.5 }).max_run_ft, r12.max_run_ft / 2, 1e-9, "a quarter the tolerance, half the run");
  // Oversizing the supply does not extend it: the run depends on the strip's
  // own voltage, not on the PSU's spare wattage, and a zero-resistance strip
  // has no wall at all, which the tile refuses rather than reporting infinity.
  assert.ok(computeLedTapeMaxRun({ ...base, resistance_per_ft: 0 }).error);
  assert.ok(computeLedTapeMaxRun({ ...base, drop_tolerance_pct: 100 }).error);
});

// ===================== equal-spacing =====================

test("equal spacing: the fencepost closes -- N items leave N+1 gaps that fill the run exactly", () => {
  for (const run of [60, 96.5, 144, 37.125]) {
    for (const w of [0, 1.5, 3.5]) {
      for (const n of [1, 2, 7, 13]) {
        const r = computeEqualSpacing({ run_in: run, item_width_in: w, mode: "count", count: n });
        if (!r.fits) continue;
        // Conservation: the items and the gaps are the whole run.
        within(n * w + (n + 1) * r.gap_in, run, 1e-9, `${n} items of ${w} in in ${run} in`);
        within(r.span_used_in, run, 1e-9, "the span used is the run");
        within(r.center_to_center_in, r.gap_in + w, 1e-9, "pitch is a gap plus an item");
        assert.equal(r.positions.length, n, "one position per item");
        // Positions are evenly pitched and centered: first and last are the
        // same distance from their ends.
        for (let i = 1; i < n; i++) {
          within(r.positions[i] - r.positions[i - 1], r.center_to_center_in, 1e-9, "even pitch");
        }
        within(r.positions[0], run - r.positions[n - 1], 1e-6, "the layout is symmetric about the run");
        within(r.positions[0], r.gap_in + w / 2, 1e-9, "the first item sits one gap in");
      }
    }
  }
});

test("equal spacing: max-gap mode returns the SMALLEST count that holds the gap, checked against one item fewer", () => {
  for (const run of [60, 96.5, 144, 37.125]) {
    for (const w of [0, 1.5, 3.5]) {
      for (const gmax of [3.9, 6, 12, 16]) {
        const r = computeEqualSpacing({ run_in: run, item_width_in: w, mode: "max-gap", max_gap_in: gmax });
        assert.ok(r.gap_in <= gmax + 1e-9, `${run}/${w}/${gmax}: the gap meets the limit`);
        if (r.count > 0) {
          const fewer = computeEqualSpacing({ run_in: run, item_width_in: w, mode: "count", count: r.count - 1 });
          if (r.count - 1 >= 1) {
            assert.ok(fewer.gap_in > gmax + 1e-9, `${run}/${w}/${gmax}: one item fewer would exceed the limit`);
          }
        }
      }
    }
  }
  // The IRC R312.1.3 guard rule the note names: a 4 in sphere must not pass, so
  // a 60 in run of 1.5 in balusters at a 3.9 in limit takes 11 balusters, and
  // (60 - 16.5) / 12 = 3.625 in of gap -- hand-figured, and under 4 in.
  const guard = computeEqualSpacing({ run_in: 60, item_width_in: 1.5, mode: "max-gap", max_gap_in: 3.9 });
  assert.equal(guard.count, 11);
  within(guard.gap_in, 3.625, 1e-9, "a 4 in sphere will not pass");
  within(guard.center_to_center_in, 5.125, 1e-9, "pitch");
  // Marks rather than items: 3 marks quarter a 100 in run.
  const marks = computeEqualSpacing({ run_in: 100, item_width_in: 0, mode: "count", count: 3 });
  within(marks.gap_in, 25, 1e-9, "3 division points, 4 equal parts");
  assert.deepEqual(marks.positions.map((p) => Math.round(p)), [25, 50, 75]);
  // Items that cannot fit are reported as not fitting rather than as a layout.
  const tight = computeEqualSpacing({ run_in: 10, item_width_in: 3, mode: "count", count: 5 });
  assert.equal(tight.fits, false);
  assert.equal(tight.positions.length, 0);
});

// ===================== triangle-ssa =====================

const ssaCheck = (A, a, b, sol) => {
  const { B, C, c } = sol;
  within(A + B + C, 180, 1e-9, "angles sum to 180");
  // Law of sines across all three pairs.
  const k = a / Math.sin(A * DEG);
  within(b / Math.sin(B * DEG), k, 1e-6, "b / sin B matches a / sin A");
  within(c / Math.sin(C * DEG), k, 1e-6, "c / sin C matches a / sin A");
  // Law of cosines reconstructs the GIVEN side a from the other two and the
  // given angle -- the part SSA is easiest to get wrong.
  within(Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A * DEG)), a, 1e-6, "law of cosines reconstructs a");
};

test("triangle SSA: the ambiguous case gives two triangles when h < a < b, and both of them close", () => {
  // A = 30 deg, b = 10, a = 6: h = b sin A = 5, so 5 < 6 < 10 and two
  // triangles fit. sin B = b sin A / a = 0.8333, B = 56.44 or 123.56 deg.
  const A = 30, a = 6, b = 10;
  const r = computeTriangleSsa({ angle_a_deg: A, side_a: a, side_b: b });
  assert.equal(r.solutions, 2);
  within(r.height, 5, 1e-9, "h = b sin A");
  within(Math.asin(b * Math.sin(A * DEG) / a) / DEG, 56.4427, 1e-3, "the acute B");
  within(r.angle_b_deg, 56.4427, 1e-3, "first solution's B");
  within(r.angle_b2_deg, 180 - 56.4427, 1e-3, "second solution's B is its supplement");
  ssaCheck(A, a, b, { B: r.angle_b_deg, C: r.angle_c_deg, c: r.side_c });
  ssaCheck(A, a, b, { B: r.angle_b2_deg, C: r.angle_c2_deg, c: r.side_c2 });
  assert.ok(r.side_c > r.side_c2, "the acute branch is the long third side");
  // Both areas are 1/2 a b sin C, and they differ because C differs.
  within(r.area, 0.5 * a * b * Math.sin(r.angle_c_deg * DEG), 1e-9, "area of the long solution");
  within(r.area2, 0.5 * a * b * Math.sin(r.angle_c2_deg * DEG), 1e-9, "area of the short solution");
  // Check the areas a second way, by Heron's formula on the three sides.
  const heron = (p, q, s) => { const t = (p + q + s) / 2; return Math.sqrt(t * (t - p) * (t - q) * (t - s)); };
  within(r.area, heron(a, b, r.side_c), 1e-6, "Heron agrees, long solution");
  within(r.area2, heron(a, b, r.side_c2), 1e-6, "Heron agrees, short solution");
});

test("triangle SSA: one solution at a = h (a right triangle), one when a >= b, and none when a < h", () => {
  const A = 30, b = 10;
  // a exactly at the height: B is 90, and the triangle is right at B, so
  // a^2 + c^2 = b^2.
  const right = computeTriangleSsa({ angle_a_deg: A, side_a: 5, side_b: b });
  assert.equal(right.solutions, 1);
  within(right.angle_b_deg, 90, 1e-9, "B is exactly a right angle");
  within(25 + right.side_c * right.side_c, 100, 1e-6, "Pythagoras on the right triangle");
  ssaCheck(A, 5, b, { B: right.angle_b_deg, C: right.angle_c_deg, c: right.side_c });
  // a longer than b: one triangle only, because the supplement of B would push
  // the angle sum past 180.
  for (const a of [10, 12, 25]) {
    const one = computeTriangleSsa({ angle_a_deg: A, side_a: a, side_b: b });
    assert.equal(one.solutions, 1, `a = ${a} >= b: one triangle`);
    ssaCheck(A, a, b, { B: one.angle_b_deg, C: one.angle_c_deg, c: one.side_c });
    assert.ok(A + (180 - one.angle_b_deg) >= 180 - 1e-9, "the supplement really is impossible");
  }
  // a shorter than the height: side a cannot reach the third side.
  for (const a of [1, 3, 4.999]) {
    assert.ok(computeTriangleSsa({ angle_a_deg: A, side_a: a, side_b: b }).error, `a = ${a} < h: no triangle`);
  }
});

test("triangle SSA: with A at 90 degrees or more there is a triangle only when a is longer than b", () => {
  for (const A of [90, 120, 150]) {
    assert.ok(computeTriangleSsa({ angle_a_deg: A, side_a: 10, side_b: 10 }).error, `A = ${A}, a = b: no triangle`);
    assert.ok(computeTriangleSsa({ angle_a_deg: A, side_a: 8, side_b: 10 }).error, `A = ${A}, a < b: no triangle`);
    const r = computeTriangleSsa({ angle_a_deg: A, side_a: 14, side_b: 10 });
    assert.equal(r.solutions, 1, `A = ${A}, a > b: exactly one`);
    ssaCheck(A, 14, 10, { B: r.angle_b_deg, C: r.angle_c_deg, c: r.side_c });
    assert.ok(r.angle_b_deg < 90, "the other angles must be acute when A is not");
  }
  // Scaling both sides scales the third and leaves every angle alone.
  const one = computeTriangleSsa({ angle_a_deg: 120, side_a: 14, side_b: 10 });
  const big = computeTriangleSsa({ angle_a_deg: 120, side_a: 140, side_b: 100 });
  within(big.angle_b_deg, one.angle_b_deg, 1e-9, "angles are scale-free");
  within(big.side_c, 10 * one.side_c, 1e-9, "the third side scales");
  within(big.area, 100 * one.area, 1e-9, "area scales as the square");
});

// ===================== reducer-offset =====================

test("reducer offset: the shifts fall out of the elevations of the two pipe ends, drawn rather than formulated", () => {
  // Lay the large end down with its invert at elevation 0: invert 0, centerline
  // D/2, crown D. Then place the small end by whichever surface the reducer
  // holds continuous and read the invert and crown shifts off the drawing.
  for (const [D, d] of [[12.75, 8.625], [6.625, 4.5], [24, 6], [2.375, 1.9]]) {
    const concentric = computeReducerOffset({ large_od_in: D, small_od_in: d, lay_length_in: 8, type: "concentric" });
    // Concentric: the small end's centerline stays at D/2, so its invert sits
    // at (D - d)/2 and its crown at (D + d)/2.
    within(concentric.bop_shift_in, (D - d) / 2 - 0, 1e-9, "invert rises to (D - d)/2");
    within(concentric.top_shift_in, (D + d) / 2 - D, 1e-9, "crown drops to (D + d)/2");
    within(concentric.centerline_offset_in, (D - d) / 2, 1e-9, "centerline offset");
    const flatBottom = computeReducerOffset({ large_od_in: D, small_od_in: d, lay_length_in: 8, type: "eccentric-flat-bottom" });
    // Flat bottom: invert stays at 0, crown comes down to d.
    within(flatBottom.bop_shift_in, 0, 1e-9, "invert unchanged");
    within(flatBottom.top_shift_in, d - D, 1e-9, "crown drops the whole diameter difference");
    const flatTop = computeReducerOffset({ large_od_in: D, small_od_in: d, lay_length_in: 8, type: "eccentric-flat-top" });
    // Flat top: crown stays at D, invert rises to D - d.
    within(flatTop.top_shift_in, 0, 1e-9, "crown unchanged");
    within(flatTop.bop_shift_in, D - d, 1e-9, "invert rises the whole diameter difference");
    // Conservation across all three: whichever surface is held, the invert and
    // crown must move apart by exactly the diameter difference.
    for (const r of [concentric, flatBottom, flatTop]) {
      within(r.bop_shift_in - r.top_shift_in, D - d, 1e-9, "the diameter difference is conserved");
    }
    // And the eccentric shifts are twice the concentric one, because an
    // eccentric reducer puts all of the offset on one side.
    within(flatBottom.top_shift_in, 2 * concentric.top_shift_in, 1e-9, "flat bottom doubles the crown drop");
    within(flatTop.bop_shift_in, 2 * concentric.bop_shift_in, 1e-9, "flat top doubles the invert rise");
  }
});

test("reducer offset: similar triangles give the same offset per inch of lay length, and the trade rules hold", () => {
  // The cone's wall rises (D - d)/2 over the lay length. By similar triangles
  // the rise at any fraction of the way along is that fraction of the offset.
  const D = 12.75, d = 8.625, lay = 7;
  const r = computeReducerOffset({ large_od_in: D, small_od_in: d, lay_length_in: lay, type: "concentric" });
  const slope = r.centerline_offset_in / lay;
  within(slope * lay, (D - d) / 2, 1e-9, "the wall rises the offset over the lay");
  within(slope * (lay / 2), (D - d) / 4, 1e-9, "halfway along, half the offset");
  within(r.lay_length_in, lay, 1e-9, "lay length is carried through");
  // Which surface is continuous is the whole point of the type choice.
  assert.equal(r.continuous_surface, "centerline");
  assert.equal(computeReducerOffset({ large_od_in: D, small_od_in: d, type: "eccentric-flat-bottom" }).continuous_surface, "invert (bottom)");
  assert.equal(computeReducerOffset({ large_od_in: D, small_od_in: d, type: "eccentric-flat-top" }).continuous_surface, "crown (top)");
  // Flat bottom keeps a gravity drain self-cleaning: no invert step at all.
  within(computeReducerOffset({ large_od_in: D, small_od_in: d, type: "eccentric-flat-bottom" }).bop_shift_in, 0, 1e-9, "no dam on the drain");
  // Flat top clears air on a pump suction: no crown step at all.
  within(computeReducerOffset({ large_od_in: D, small_od_in: d, type: "eccentric-flat-top" }).top_shift_in, 0, 1e-9, "no air pocket on the suction");
  // A reducer that does not reduce is refused.
  assert.ok(computeReducerOffset({ large_od_in: 8, small_od_in: 8 }).error);
  assert.ok(computeReducerOffset({ large_od_in: 8, small_od_in: 10 }).error);
  assert.ok(computeReducerOffset({ large_od_in: 8, small_od_in: 6, type: "swaged" }).error);
});

// ===================== branch-reinforcement =====================

test("branch reinforcement: at a right-angle branch the required area IS the pressure metal the hole removed", () => {
  // ASME B31.3 304.3.3: A1 = th x d1 x (2 - sin beta). At beta = 90 the factor
  // is 1, so the requirement is exactly th x d1 -- the longitudinal strip of
  // pressure-carrying run wall that the opening took out. That identity is the
  // conservation statement the rule is built on, and it is checked here
  // against the opening measured independently as the branch bore.
  const c = {
    run_od_in: 12.75, run_wall_in: 0.375, run_treq_in: 0.180,
    branch_od_in: 4.5, branch_wall_in: 0.337, branch_treq_in: 0.065,
    beta_deg: 90, mill_tol_frac: 0.125, corrosion_in: 0,
  };
  const r = computeBranchReinforcement(c);
  const Tbm = 0.337 * 0.875, Thm = 0.375 * 0.875;
  // The opening in the run is the branch BORE, not its OD: ID = OD - 2 x the
  // minimum wall less corrosion.
  within(r.d1_in, 4.5 - 2 * Tbm, 1e-9, "the opening is the branch bore");
  within(r.a_required_in2, c.run_treq_in * r.d1_in, 1e-9, "area removed = area to replace, at 90 degrees");
  // The run's contribution is the excess wall over the reinforcement zone less
  // the hole: the zone is d2 either side of the axis, 2 x d2 wide, of which d1
  // is opening.
  const d2 = Math.max(r.d1_in, Tbm + Thm + r.d1_in / 2);
  within(r.a_run_in2, (2 * d2 - r.d1_in) * (Thm - c.run_treq_in), 1e-9, "excess run metal over the zone, hole deducted");
  // The branch's contribution is its excess wall up both sides of the zone
  // height L4 = 2.5 x the thinner of the two minimum walls.
  const L4 = 2.5 * Math.min(Thm, Tbm);
  within(r.a_branch_in2, 2 * L4 * (Tbm - c.branch_treq_in), 1e-9, "excess branch metal, both legs");
  within(r.a_available_in2, r.a_run_in2 + r.a_branch_in2, 1e-9, "available is the sum of the two");
  assert.equal(r.adequate, true);
  within(r.pad_area_in2, 0, 1e-9, "an adequate opening needs no pad");
  within(r.branch_run_od_ratio, 4.5 / 12.75, 1e-9, "branch-to-run ratio");
  assert.equal(r.large_branch, false, "0.353 is inside the 0.5 screen");
});

test("branch reinforcement: the code's conservatisms bite -- mill tolerance, corrosion, and the (2 - sin beta) angle penalty", () => {
  const base = {
    run_od_in: 12.75, run_wall_in: 0.375, run_treq_in: 0.180,
    branch_od_in: 4.5, branch_wall_in: 0.337, branch_treq_in: 0.065,
    beta_deg: 90, mill_tol_frac: 0.125, corrosion_in: 0,
  };
  const r = computeBranchReinforcement(base);
  // Working in nominal wall instead of the 12.5% minimum wall credits metal
  // the mill is allowed not to supply: it must report MORE area available.
  const nominal = computeBranchReinforcement({ ...base, mill_tol_frac: 0 });
  assert.ok(nominal.a_available_in2 > r.a_available_in2, "nominal wall over-credits the available area");
  // A corrosion allowance comes off both the credit and the opening.
  const corroded = computeBranchReinforcement({ ...base, corrosion_in: 0.0625 });
  assert.ok(corroded.a_available_in2 < r.a_available_in2, "corrosion eats the excess metal");
  assert.ok(corroded.d1_in > r.d1_in, "and widens the opening it has to replace");
  // The angle penalty: 2 - sin beta rises as the branch lays over, and d1 grows
  // as 1 / sin beta, so the requirement climbs steeply. At 45 degrees the
  // factor is 2 - 0.7071 = 1.2929 and the opening is 1.4142 times as wide.
  const skew = computeBranchReinforcement({ ...base, beta_deg: 45 });
  const s = Math.sin(45 * DEG);
  within(skew.d1_in, r.d1_in / s, 1e-9, "a 45 degree branch cuts an opening 1.414 times as wide");
  within(skew.a_required_in2, r.a_required_in2 / s * (2 - s), 1e-9, "and (2 - sin beta) on top of that");
  assert.ok(skew.a_required_in2 > 1.8 * r.a_required_in2, "a laid-over branch needs far more replacement");
  // Monotone across the admissible range.
  let prev = -Infinity;
  for (const beta of [90, 80, 70, 60, 50, 45]) {
    const x = computeBranchReinforcement({ ...base, beta_deg: beta }).a_required_in2;
    assert.ok(x > prev, `required area rises as beta falls (${beta} deg)`);
    prev = x;
  }
  // Below 45 degrees B31.3 304.3.1(b) does not allow the area rules at all.
  assert.ok(computeBranchReinforcement({ ...base, beta_deg: 44.9 }).error);
  assert.ok(computeBranchReinforcement({ ...base, beta_deg: 95 }).error);
});

test("branch reinforcement: a pad is called for exactly when the available area falls short, and the shortfall is the pad area", () => {
  // Take the same tee and thin the run so there is no excess run metal left.
  const thin = {
    run_od_in: 12.75, run_wall_in: 0.250, run_treq_in: 0.240,
    branch_od_in: 4.5, branch_wall_in: 0.237, branch_treq_in: 0.200,
    beta_deg: 90, mill_tol_frac: 0, corrosion_in: 0,
  };
  const r = computeBranchReinforcement(thin);
  assert.equal(r.adequate, false, "nearly no excess metal anywhere");
  within(r.pad_area_in2, r.a_required_in2 - r.a_available_in2, 1e-9, "the pad makes up exactly the shortfall");
  assert.ok(r.pad_area_in2 > 0);
  // A pipe whose own required wall exceeds what it has is a pressure-design
  // failure, not a reinforcement question.
  assert.ok(computeBranchReinforcement({ ...thin, run_treq_in: 0.260 }).error, "run fails its own pressure design");
  assert.ok(computeBranchReinforcement({ ...thin, branch_treq_in: 0.260 }).error, "branch fails its own pressure design");
  // The near-full-size screen: the area rules are not the normal route for a
  // branch over about half the run OD.
  const big = computeBranchReinforcement({
    run_od_in: 12.75, run_wall_in: 0.500, run_treq_in: 0.180,
    branch_od_in: 8.625, branch_wall_in: 0.500, branch_treq_in: 0.120,
    beta_deg: 90, mill_tol_frac: 0.125, corrosion_in: 0,
  });
  within(big.branch_run_od_ratio, 8.625 / 12.75, 1e-9, "0.676");
  assert.equal(big.large_branch, true, "flagged for a listed tee or a real analysis");
  // The d2 cap: the zone half-width is "in any case not more than Dh", so run
  // metal lying outside the run pipe is never credited. A full-size branch
  // laid over to 45 degrees cuts an opening 8.68 in wide in a 6.625 in run,
  // and the uncapped half-width would reach past the pipe itself.
  const wide = computeBranchReinforcement({
    run_od_in: 6.625, run_wall_in: 0.432, run_treq_in: 0.100,
    branch_od_in: 6.625, branch_wall_in: 0.280, branch_treq_in: 0.100,
    beta_deg: 45, mill_tol_frac: 0.125, corrosion_in: 0,
  });
  const sin45 = Math.sin(45 * DEG);
  const Tbm = 0.280 * 0.875, Thm = 0.432 * 0.875;
  const d1 = (6.625 - 2 * Tbm) / sin45;
  const uncapped = Math.max(d1, Tbm + Thm + d1 / 2);
  const capped = Math.min(6.625, uncapped);
  assert.ok(capped < uncapped, "the uncapped zone would reach outside the run pipe");
  within(wide.d1_in, d1, 1e-9, "the laid-over opening");
  within(wide.a_run_in2, (2 * capped - d1) * (Thm - 0.100), 1e-9, "the zone stops at the run OD");
});
