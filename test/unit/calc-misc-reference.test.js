// Seventeen tiles across eleven modules, checked against references their own
// specs did not write. The worked-example fixture recomputes each spec's own
// example, so a spec and its tile that share an error agree with each other;
// these tests hold the tiles to published almanac and standards values, to
// physical laws (Archimedes, Boyle, the second moment of area), to independent
// numerical derivations, and to round trips through the relation each tile
// inverts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computePvRailClampTakeoff, computePvBallastWeight, computeSolarTimeCorrection } from "../../calc-solarfield.js";
import { computeSkipLineLayout, computeSpeedHumpGeometry } from "../../calc-civil.js";
import { computeChamberGasVolume, computeLiftBagSizing } from "../../calc-diving.js";
import { computeSlopeStaking } from "../../calc-survey.js";
import { computeBranchCircuitWireFootage } from "../../calc-electricalfield.js";
import { computeYawErrorLoss } from "../../calc-wind.js";
import { computeWindowFilmShgc } from "../../calc-specialtytrades.js";
import { computeFreeSurfaceMoment } from "../../calc-marineaviation.js";
import { computeChipperDebris } from "../../calc-arborist.js";
import { computeSubstrateForVelocity } from "../../calc-labmolecular.js";
import { computeFermentationTimeQ10 } from "../../calc-kitchen.js";
import { computeBrrrrRefi } from "../../calc-realestate.js";
import { computeLaborBurdenRate } from "../../calc-contractorfinance.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const near = (got, want, abs, label) => {
  assert.ok(Math.abs(got - want) <= abs, `${label}: got ${got}, want ${want} +/- ${abs}`);
};

// ============================================================================
// pv-rail-clamp-takeoff -- fencepost counting, checked by laying the modules out
// ============================================================================

test("pv rail clamp takeoff: laying the modules out one by one reproduces the run length and the clamp counts", () => {
  // Independent of the tile's closed form: walk the rail, placing modules and
  // counting the joints. N modules butted with a gap between neighbors occupy
  // N widths and N-1 gaps; each interior joint takes one shared mid clamp per
  // rail and each of the two rail ends takes an end clamp.
  for (const c of [
    { rows: 2, modules_per_row: 12, module_width_ft: 3.42, gap_ft: 0, rails_per_row: 2, rail_stock_ft: 14 },
    { rows: 3, modules_per_row: 7, module_width_ft: 3.25, gap_ft: 0.0833, rails_per_row: 2, rail_stock_ft: 16 },
    { rows: 1, modules_per_row: 1, module_width_ft: 4, gap_ft: 0.5, rails_per_row: 3, rail_stock_ft: 10 },
  ]) {
    let edge = 0, joints = 0;
    for (let i = 0; i < c.modules_per_row; i++) {
      if (i > 0) { edge += c.gap_ft; joints += 1; }
      edge += c.module_width_ft;
    }
    const r = computePvRailClampTakeoff(c);
    within(r.run_len_ft, edge, 1e-9, "run length from laying out the modules");
    const railsTotal = c.rails_per_row * c.rows;
    assert.equal(r.mid_clamps, joints * railsTotal, "one mid clamp per interior joint per rail");
    assert.equal(r.end_clamps, 2 * railsTotal, "two end clamps per rail");
    // Every module is held at two points on each rail; interior points are shared.
    assert.equal(2 * r.mid_clamps + r.end_clamps, 2 * c.modules_per_row * railsTotal, "clamp points balance");
    within(r.rail_lf, edge * railsTotal, 1e-9, "rail footage is the run on every rail");
  }
});

test("pv rail clamp takeoff: splices are the cuts a greedy stock-length cutting of the run would need", () => {
  // A run cut from stock of length S takes ceil(run/S) pieces and one splice
  // fewer. Counted here by consuming stock rather than by the ceil expression.
  for (const [run_modules, width, stock] of [[12, 3.42, 14], [20, 3.3, 20], [4, 5, 20], [3, 5, 15]]) {
    const c = { rows: 1, modules_per_row: run_modules, module_width_ft: width, gap_ft: 0, rails_per_row: 1, rail_stock_ft: stock };
    const r = computePvRailClampTakeoff(c);
    let left = r.run_len_ft, pieces = 0;
    while (left > 1e-9) { left -= stock; pieces += 1; }
    assert.equal(r.splices, pieces - 1, `splices for ${run_modules} modules on ${stock} ft stock`);
  }
  // A run that is an exact multiple of the stock does not buy a sliver of rail.
  assert.equal(computePvRailClampTakeoff({ rows: 1, modules_per_row: 4, module_width_ft: 5, gap_ft: 0, rails_per_row: 1, rail_stock_ft: 20 }).splices, 0, "20 ft run on 20 ft stock is one piece");
});

test("pv rail clamp takeoff: whole-number hardware is required, and the counts grow with the array", () => {
  assert.ok(computePvRailClampTakeoff({ rows: 2.5, modules_per_row: 12 }).error, "fractional rows refused");
  assert.ok(computePvRailClampTakeoff({ rows: 0, modules_per_row: 12 }).error, "zero rows refused");
  const a = computePvRailClampTakeoff({ rows: 2, modules_per_row: 12, module_width_ft: 3.42, gap_ft: 0, rails_per_row: 2, rail_stock_ft: 14 });
  const b = computePvRailClampTakeoff({ rows: 4, modules_per_row: 12, module_width_ft: 3.42, gap_ft: 0, rails_per_row: 2, rail_stock_ft: 14 });
  within(b.rail_lf / a.rail_lf, 2, 1e-9, "rail doubles with the rows");
  assert.equal(b.mid_clamps, 2 * a.mid_clamps, "mid clamps double with the rows");
  within(b.run_len_ft, a.run_len_ft, 1e-9, "the run itself does not change with row count");
});

// ============================================================================
// pv-ballast-weight -- the roof pressure reached by a per-module route
// ============================================================================

test("pv ballast weight: the added roof pressure equals the per-module weight over the per-module footprint", () => {
  // Independent route: a flat-roof array lays out as so many square feet per
  // module, and the pressure a module and its ballast put on that patch is the
  // same number the whole-array division gives. 30 modules on 630 sq ft is
  // 21 sq ft each; a 50 lb module with 40 lb of ballast is 90 lb on 21 sq ft.
  const c = { modules: 30, module_wt_lb: 50, ballast_per_module_lb: 40, racking_wt_lb: 0, array_area_sf: 630, allowable_psf: 5 };
  const r = computePvBallastWeight(c);
  const sfPerModule = c.array_area_sf / c.modules;
  within(r.added_psf, (c.module_wt_lb + c.ballast_per_module_lb) / sfPerModule, 1e-9, "per-module pressure");
  within(r.added_psf, 90 / 21, 1e-9, "90 lb on 21 sq ft is 4.29 psf");
  within(r.total_wt_lb, r.added_psf * c.array_area_sf, 1e-9, "pressure x area returns the weight");
  assert.equal(r.pass, true, "4.29 psf passes a 5 psf allowance");
});

test("pv ballast weight: pressure is intensive -- a bigger array at the same spacing reads the same psf", () => {
  const base = { modules: 30, module_wt_lb: 50, ballast_per_module_lb: 40, racking_wt_lb: 0, array_area_sf: 630, allowable_psf: 5 };
  const big = computePvBallastWeight({ ...base, modules: 120, array_area_sf: 2520 });
  within(big.added_psf, computePvBallastWeight(base).added_psf, 1e-9, "psf unchanged by array size");
  // Racking is a lump, so it is NOT intensive: spreading the same racking over
  // four times the roof dilutes it.
  const r1 = computePvBallastWeight({ ...base, racking_wt_lb: 630 });
  const r4 = computePvBallastWeight({ ...base, modules: 120, array_area_sf: 2520, racking_wt_lb: 630 });
  within(r1.added_psf - computePvBallastWeight(base).added_psf, 1, 1e-9, "630 lb over 630 sq ft adds exactly 1 psf");
  within(r4.added_psf - big.added_psf, 0.25, 1e-9, "the same racking over 2,520 sq ft adds a quarter psf");
});

test("pv ballast weight: the verdict turns exactly at the allowable, not before it", () => {
  // 100 modules of 20 lb each with no ballast on 1,000 sq ft is exactly 2.0 psf.
  const at = computePvBallastWeight({ modules: 100, module_wt_lb: 20, ballast_per_module_lb: 0, racking_wt_lb: 0, array_area_sf: 1000, allowable_psf: 2 });
  within(at.added_psf, 2, 1e-9, "exactly at the allowance");
  assert.equal(at.pass, true, "equal to the allowable passes");
  const over = computePvBallastWeight({ modules: 100, module_wt_lb: 20, ballast_per_module_lb: 0, racking_wt_lb: 1, array_area_sf: 1000, allowable_psf: 2 });
  assert.equal(over.pass, false, "one pound over fails");
});

// ============================================================================
// solar-time-correction -- the equation of time against published almanac values
// ============================================================================

test("solar time: the equation of time hits the published almanac extremes and zero crossings", () => {
  // Published values (U.S. Naval Observatory / Astronomical Almanac, and the
  // standard analemma tables): the sundial runs about 14.2 minutes SLOW at the
  // February minimum (around Feb 11, day 42) and about 16.4 minutes FAST at the
  // early-November maximum (around Nov 3, day 307), and the equation of time
  // crosses zero four times a year -- mid-April, mid-June, the start of
  // September and around Christmas. Spencer's series is quoted as good to about
  // half a minute, which is the tolerance used here.
  const eot = (day) => computeSolarTimeCorrection({ clock_hour: 12, day_of_year: day, longitude_deg: 0, utc_offset_hours: 0 }).equation_of_time_min;
  near(eot(42), -14.2, 0.5, "Feb 11 minimum");
  near(eot(307), 16.4, 0.5, "Nov 3 maximum");
  for (const [day, label] of [[105, "mid-April"], [164, "mid-June"], [244, "start of September"], [359, "around Christmas"]]) {
    near(eot(day), 0, 0.5, `zero crossing ${label}`);
  }
  // And the sign convention: a sundial in February reads BEHIND the mean clock.
  assert.ok(eot(42) < 0, "February sundial is slow");
  assert.ok(eot(307) > 0, "November sundial is fast");
});

test("solar time: four minutes of clock per degree from the meridian the clock keeps, taken the short way round", () => {
  // The earth turns 360 degrees in 24 h, so 15 degrees per hour and 4 minutes
  // per degree. Central Standard keeps the 90 W meridian; a site at 89.4 W is
  // 0.6 degrees east of it and the sun gets there 2.4 minutes early.
  const r = computeSolarTimeCorrection({ clock_hour: 12, day_of_year: 1, longitude_deg: -89.4, utc_offset_hours: -6 });
  within(r.longitude_correction_min, 2.4, 1e-9, "0.6 deg east of 90 W");
  // A full hour of offset is exactly 15 degrees, which cancels.
  within(computeSolarTimeCorrection({ clock_hour: 12, day_of_year: 1, longitude_deg: -75, utc_offset_hours: -5 }).longitude_correction_min, 0, 1e-9, "on its own meridian");
  // Kiritimati: UTC+14 keeps the 150 W meridian, and 157.4 W is 7.4 degrees
  // west of it -- 29.6 minutes, not 24 hours' worth the long way round.
  within(computeSolarTimeCorrection({ clock_hour: 12, day_of_year: 1, longitude_deg: -157.4, utc_offset_hours: 14 }).longitude_correction_min, -29.6, 1e-6, "the short way round");
});

test("solar time: solar noon and the clock are the same statement read two ways", () => {
  for (const c of [
    { clock_hour: 10, clock_minute: 30, day_of_year: 34, longitude_deg: -89.4, utc_offset_hours: -6 },
    { clock_hour: 7, clock_minute: 5, day_of_year: 200, longitude_deg: 139.7, utc_offset_hours: 9 },
    { clock_hour: 18, clock_minute: 45, day_of_year: 300, longitude_deg: -0.1, utc_offset_hours: 0 },
  ]) {
    const r = computeSolarTimeCorrection(c);
    // Solar noon is the clock reading at which solar time is 12:00.
    const atNoon = computeSolarTimeCorrection({ ...c, clock_hour: Math.floor(r.solar_noon_clock_hours), clock_minute: (r.solar_noon_clock_hours % 1) * 60 });
    within(atNoon.solar_time_hours, 12, 1e-9, "solar noon is when solar time reads 12");
    // Hours from solar noon is the same offset the clock carries.
    within(r.hours_from_solar_noon, (c.clock_hour + c.clock_minute / 60) - r.solar_noon_clock_hours, 1e-9, "hours from solar noon");
    // Daylight saving is one hour of clock and nothing else.
    const dst = computeSolarTimeCorrection({ ...c, utc_offset_hours: c.utc_offset_hours + 1 });
    within(dst.solar_noon_clock_hours - r.solar_noon_clock_hours, 1, 1e-9, "daylight time moves solar noon an hour later on the clock");
    within(dst.equation_of_time_min, r.equation_of_time_min, 1e-9, "the equation of time does not know about clocks");
  }
});

// ============================================================================
// skip-line-layout -- the MUTCD broken-line patterns
// ============================================================================

test("skip line: the MUTCD 10 ft line and 30 ft gap gives 132 stripes and 1,320 ft of paint in a mile", () => {
  // MUTCD: a broken line is normally a 10 ft line segment with a 30 ft gap, a
  // 40 ft cycle. 5,280 / 40 = 132 cycles in a mile and a quarter of the mile is
  // painted. The 15 ft / 25 ft pattern some agencies use keeps the same 40 ft
  // cycle and the same 132 stripes but takes half again the paint.
  const mile = computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 5280 });
  within(mile.cycle_length_ft, 40, 1e-9, "cycle");
  within(mile.stripes_per_mile, 132, 1e-9, "stripes per mile");
  within(mile.painted_per_mile_ft, 1320, 1e-9, "painted feet per mile");
  within(mile.painted_fraction_pct, 25, 1e-9, "a quarter of the run is stripe");
  const alt = computeSkipLineLayout({ stripe_length_ft: 15, gap_length_ft: 25, run_length_ft: 5280 });
  within(alt.cycle_length_ft, 40, 1e-9, "same cycle on the 15/25 pattern");
  within(alt.stripes_per_mile, 132, 1e-9, "same stripes per mile");
  within(alt.painted_per_mile_ft, 1980, 1e-9, "half again the paint");
  within(alt.painted_per_mile_ft / mile.painted_per_mile_ft, 1.5, 1e-9, "1.5x material for a line a driver cannot tell apart");
});

test("skip line: stepping the truck down the run reproduces the stripe count and the tail", () => {
  // Independent of the floor-division: walk the pattern, laying a stripe while
  // one still fits inside the run.
  for (const c of [
    { stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 5280, start_offset_ft: 0 },
    { stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 1000, start_offset_ft: 17 },
    { stripe_length_ft: 15, gap_length_ft: 25, run_length_ft: 333.3, start_offset_ft: 0 },
    { stripe_length_ft: 4, gap_length_ft: 8, run_length_ft: 48, start_offset_ft: 0 },
  ]) {
    let x = c.start_offset_ft, n = 0, lastEnd = c.start_offset_ft;
    while (x + c.stripe_length_ft <= c.run_length_ft + 1e-9) {
      n += 1; lastEnd = x + c.stripe_length_ft; x += c.stripe_length_ft + c.gap_length_ft;
    }
    const r = computeSkipLineLayout(c);
    assert.equal(r.stripes_in_run, n, `stripes walked for a ${c.run_length_ft} ft run`);
    within(r.last_stripe_end_ft, lastEnd, 1e-9, "last stripe ends where the walk ends");
    within(r.tail_ft, c.run_length_ft - lastEnd, 1e-9, "tail is what is left");
    within(r.painted_length_ft, n * c.stripe_length_ft, 1e-9, "paint is stripes x stripe length");
    assert.ok(r.tail_ft >= -1e-9 && r.tail_ft < r.cycle_length_ft, "the tail is less than one cycle");
  }
});

test("skip line: a counted existing run that IS the 40 ft pattern reads back as 40 ft", () => {
  // The maintenance inversion is cycle = measured length / counted stripes, so
  // it must be fed a length measured over whole cycles. Count the 132 stripes
  // of a mile over that mile and the cycle in place is 40 ft, and the tile
  // agrees it is the pattern entered.
  const r = computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 5280, counted_stripes: 132, counted_length_ft: 5280 });
  within(r.implied_cycle_ft, 40, 1e-9, "cycle in place");
  assert.equal(r.matches_counted, true, "recognised as the entered pattern");
  const off = computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 5280, counted_stripes: 99, counted_length_ft: 3300 });
  within(off.implied_cycle_ft, 100 / 3, 1e-9, "a 33.3 ft pattern in place");
  assert.equal(off.matches_counted, false, "a different pattern is called out");
  // The forward count and the inverse use different fencepost conventions --
  // 132 stripes laid in a 5,280 ft run end at 5,250 ft, so a crew that tapes
  // first-stripe-start to last-stripe-end feeds 5,250 / 132 = 39.77 ft -- but
  // the half-foot match window absorbs it and the pattern is still recognised.
  const taped = computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 5280, counted_stripes: 132, counted_length_ft: 5250 });
  within(taped.implied_cycle_ft, 5250 / 132, 1e-9, "tape-line measurement reads 0.23 ft short");
  assert.equal(taped.matches_counted, true, "still recognised as the 40 ft pattern");
  // The window is half a foot either way and is not a percentage, so a long
  // cycle taped the same way falls outside it: 132 stripes of a 15 ft stripe /
  // 85 ft gap pattern tape 13,100 ft, an implied 99.24 ft against 100 ft.
  const longCycle = computeSkipLineLayout({ stripe_length_ft: 15, gap_length_ft: 85, run_length_ft: 13200, counted_stripes: 132, counted_length_ft: 13115 });
  assert.equal(longCycle.matches_counted, false, "a 0.64 ft shortfall on a 100 ft cycle is called a different pattern");
});

test("skip line: a run with no room for a full cycle or a full stripe is refused rather than guessed", () => {
  assert.ok(computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 39 }).error, "shorter than one cycle");
  assert.ok(computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 45, start_offset_ft: 40 }).error, "offset leaves less than a stripe");
  const exact = computeSkipLineLayout({ stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 40 });
  assert.equal(exact.stripes_in_run, 1, "exactly one cycle carries exactly one stripe");
});

// ============================================================================
// speed-hump-geometry -- the parabola, differentiated numerically
// ============================================================================

test("speed hump: the vertical acceleration is the parabola's own second derivative times the square of the speed", () => {
  // Independent of the 8hV^2/L^2 expression: build the parabolic profile, take
  // its second derivative by central difference, and multiply by V^2. A wheel
  // tracking z(x) at constant forward speed V feels d2z/dt2 = V^2 z''(x).
  const G = 32.174, FPS_PER_MPH = 5280 / 3600;
  for (const c of [
    { height_in: 3, total_length_ft: 12, flat_top_length_ft: 0, crossing_speed_mph: 25 },
    { height_in: 4, total_length_ft: 14, flat_top_length_ft: 0, crossing_speed_mph: 20 },
    { height_in: 3.5, total_length_ft: 22, flat_top_length_ft: 10, crossing_speed_mph: 25 },
  ]) {
    const R = (c.total_length_ft - c.flat_top_length_ft) / 2;  // one ramp
    const h = c.height_in / 12;
    const T = 2 * R;                                           // the two ramps read as one transition
    const z = (x) => h * (1 - (x / (T / 2)) * (x / (T / 2)));  // parabola of rise h over the transition
    const d = 1e-4;
    const zpp = (z(d) - 2 * z(0) + z(-d)) / (d * d);
    const V = c.crossing_speed_mph * FPS_PER_MPH;
    const r = computeSpeedHumpGeometry({ ...c, comfort_limit_g: 0.25, wheelbase_in: 120, ground_clearance_in: 5, target_ramp_slope_pct: 5 });
    within(r.vertical_accel_fps2, Math.abs(zpp) * V * V, 1e-4, "acceleration from the numerical second derivative");
    within(r.vertical_accel_g, Math.abs(zpp) * V * V / G, 1e-4, "in g");
    within(r.ramp_length_ft, R, 1e-9, "ramp length is half the non-flat part");
  }
});

test("speed hump: the classic 12 ft hump 3 in high reaches a quarter g at about 16 mph, and the ramp is 4.17%, not 3.5%", () => {
  // 3 in over a 6 ft ramp is 0.25 ft over 6 ft. That is 4.167%, and a spec that
  // calls it 3.5% is wrong; the tile is right.
  const r = computeSpeedHumpGeometry({ height_in: 3, total_length_ft: 12, flat_top_length_ft: 0, crossing_speed_mph: 25, comfort_limit_g: 0.25, wheelbase_in: 120, ground_clearance_in: 5, target_ramp_slope_pct: 5 });
  within(r.ramp_slope_pct, 0.25 / 6 * 100, 1e-9, "ramp slope");
  near(r.ramp_slope_pct, 4.17, 0.01, "4.17%, not 3.5%");
  near(r.comfort_speed_mph, 16, 0.5, "about sixteen miles an hour at a quarter g");
  // The comfort speed is the acceleration relation inverted: re-run the tile at
  // that speed and the acceleration must come out at the limit.
  const at = computeSpeedHumpGeometry({ height_in: 3, total_length_ft: 12, flat_top_length_ft: 0, crossing_speed_mph: r.comfort_speed_mph, comfort_limit_g: 0.25, wheelbase_in: 120, ground_clearance_in: 5, target_ramp_slope_pct: 5 });
  within(at.vertical_accel_g, 0.25, 1e-9, "comfort speed round trip");
  // A target ramp slope is a straight rise-over-run: 3 in at 5% is 5.0 ft.
  within(r.ramp_length_for_target_ft, 0.25 / 0.05, 1e-9, "ramp length for a 5% target");
});

test("speed hump: length beats height -- doubling the length quarters the acceleration, halving the height only halves it", () => {
  const base = { height_in: 3, total_length_ft: 12, flat_top_length_ft: 0, crossing_speed_mph: 25, comfort_limit_g: 0.25, wheelbase_in: 120, ground_clearance_in: 5, target_ramp_slope_pct: 5 };
  const a0 = computeSpeedHumpGeometry(base).vertical_accel_g;
  within(computeSpeedHumpGeometry({ ...base, total_length_ft: 24 }).vertical_accel_g / a0, 0.25, 1e-9, "length enters squared");
  within(computeSpeedHumpGeometry({ ...base, height_in: 1.5 }).vertical_accel_g / a0, 0.5, 1e-9, "height enters once");
  within(computeSpeedHumpGeometry({ ...base, crossing_speed_mph: 50 }).vertical_accel_g / a0, 4, 1e-9, "speed enters squared");
  within(computeSpeedHumpGeometry({ ...base, total_length_ft: 24 }).comfort_speed_mph / computeSpeedHumpGeometry(base).comfort_speed_mph, 2, 1e-9, "twice the length, twice the comfortable speed");
});

test("speed hump: the belly clearance is the device height when the wheelbase outruns the device, and 1.7 in on the note's 22 ft table", () => {
  const base = { height_in: 3, total_length_ft: 12, flat_top_length_ft: 0, crossing_speed_mph: 25, comfort_limit_g: 0.25, ground_clearance_in: 5, target_ramp_slope_pct: 5 };
  // A vehicle longer than the device straddles it entirely: both wheels are on
  // flat ground and the crest rises the full height into the wheelbase.
  within(computeSpeedHumpGeometry({ ...base, wheelbase_in: 240 }).clearance_required_in, 3, 1e-9, "20 ft wheelbase over a 12 ft hump");
  // The note's own worked case, checked here as a reference value rather than
  // recomputed: a 22 ft table 3.5 in high wants 1.7 in under a 10 ft wheelbase,
  // and the worst straddle is NOT the centred position.
  const table = computeSpeedHumpGeometry({ height_in: 3.5, total_length_ft: 22, flat_top_length_ft: 10, crossing_speed_mph: 25, comfort_limit_g: 0.25, wheelbase_in: 120, ground_clearance_in: 5, target_ramp_slope_pct: 5 });
  near(table.clearance_required_in, 1.7, 0.05, "22 ft table under a 10 ft wheelbase");
  within(table.wheel_height_in, 3.5, 1e-9, "centred, both wheels sit on the flat top and read zero rise");
  assert.ok(table.clearance_required_in > table.height_in - table.wheel_height_in, "the worst position is off-centre");
  assert.equal(table.sits_on_flat, true, "a 10 ft wheelbase sits on a 10 ft flat top");
  // The verdict turns on the margin, both ways.
  assert.equal(computeSpeedHumpGeometry({ ...base, wheelbase_in: 240, ground_clearance_in: 3 }).clears, true, "exactly enough clears");
  assert.equal(computeSpeedHumpGeometry({ ...base, wheelbase_in: 240, ground_clearance_in: 2.9 }).clears, false, "a tenth short grounds out");
});

// ============================================================================
// chamber-gas-volume -- Boyle's law on the chamber and on the ventilation
// ============================================================================

test("chamber gas: pressurizing takes the free air Boyle's law demands for the pressure ADDED, not the absolute pressure", () => {
  // A sealed chamber of volume V already holds V of air at 1 atm. Taking it to
  // an absolute pressure P needs P x V / 1 atm of free air inside, of which V
  // is already there, so V (P - 1) atm more must be pumped in. At 60 psig that
  // is 250 x 60 / 14.7 = 1,020 cu ft, NOT 250 x 74.7 / 14.7 = 1,270.
  const ATM = 14.7;
  for (const [V, psig] of [[250, 60], [400, 30], [120, 45.1]]) {
    const r = computeChamberGasVolume({ chamber_volume_cuft: V, treatment_pressure_psig: psig, ventilation_acfm_per_occupant: 2, occupant_count: 2, treatment_minutes: 240, air_inventory_cuft: 80000, oxygen_acfm_per_occupant: 1, oxygen_minutes: 120 });
    within(r.treatment_ata, (psig + ATM) / ATM, 1e-9, "absolute pressure in atmospheres");
    within(r.pressurize_cuft, V * psig / ATM, 1e-9, "Boyle on the gauge pressure");
    assert.ok(r.pressurize_cuft < V * (psig + ATM) / ATM, "one chamber volume less than the absolute-pressure error");
    within(V * (psig + ATM) / ATM - r.pressurize_cuft, V, 1e-9, "the difference is exactly one chamber volume");
  }
});

test("chamber gas: an acfm of ventilation at depth is that many atmospheres of free air a minute", () => {
  // Actual cubic feet measured at chamber pressure convert to free (surface)
  // air by the same Boyle ratio. Two occupants at 2 acfm each, at 5.082 ata,
  // is 20.3 cu ft of free air a minute, and ventilation dominates over four
  // hours.
  const c = { chamber_volume_cuft: 250, treatment_pressure_psig: 60, ventilation_acfm_per_occupant: 2, occupant_count: 2, treatment_minutes: 240, air_inventory_cuft: 8000, oxygen_acfm_per_occupant: 1, oxygen_minutes: 120 };
  const r = computeChamberGasVolume(c);
  within(r.ventilation_cfm_free, 2 * 2 * (60 + 14.7) / 14.7, 1e-9, "free air per minute");
  within(r.ventilation_cuft, r.ventilation_cfm_free * 240, 1e-9, "over the treatment");
  assert.ok(r.ventilation_share_pct > 80, "ventilation is the dominant term over a four-hour table");
  within(r.ventilation_share_pct + r.pressurize_share_pct, 100, 1e-9, "the two shares are the whole requirement");
  within(r.total_air_cuft, r.pressurize_cuft + r.ventilation_cuft, 1e-9, "total is the sum");
  // Oxygen is its own inventory and does not appear in the air total.
  within(r.oxygen_required_cuft, 1 * (60 + 14.7) / 14.7 * 120, 1e-9, "oxygen at the same Boyle ratio");
  const moreO2 = computeChamberGasVolume({ ...c, oxygen_minutes: 240 });
  within(moreO2.total_air_cuft, r.total_air_cuft, 1e-9, "oxygen does not change the air requirement");
});

test("chamber gas: the longest treatment the inventory supports is the duration that spends exactly the inventory", () => {
  for (const inv of [8000, 20000, 1500]) {
    const c = { chamber_volume_cuft: 250, treatment_pressure_psig: 60, ventilation_acfm_per_occupant: 2, occupant_count: 2, treatment_minutes: 240, air_inventory_cuft: inv, oxygen_acfm_per_occupant: 1, oxygen_minutes: 120 };
    const r = computeChamberGasVolume(c);
    if (r.longest_treatment_min > 0) {
      const at = computeChamberGasVolume({ ...c, treatment_minutes: r.longest_treatment_min });
      within(at.total_air_cuft, inv, 1e-9, `a ${r.longest_treatment_min} min table spends exactly ${inv} cu ft`);
      within(at.air_margin_cuft, 0, 1e-6, "no margin left at the longest table");
    }
    within(r.air_margin_cuft, inv - r.total_air_cuft, 1e-9, "margin is inventory less requirement");
  }
  // An inventory too small even to pressurize supports no treatment, and is not
  // reported as a negative duration.
  const none = computeChamberGasVolume({ chamber_volume_cuft: 250, treatment_pressure_psig: 60, ventilation_acfm_per_occupant: 2, occupant_count: 2, treatment_minutes: 60, air_inventory_cuft: 500, oxygen_acfm_per_occupant: 1, oxygen_minutes: 30 });
  assert.equal(none.longest_treatment_min, 0, "no treatment at all");
});

// ============================================================================
// lift-bag-sizing -- Archimedes and Boyle
// ============================================================================

test("lift bag: in-water weight is the weight in air less the seawater the object displaces", () => {
  // Archimedes directly: 1,000 lb of steel at 490 lb/cu ft occupies 2.041 cu ft
  // and displaces 2.041 x 64 = 130.6 lb of seawater, so it weighs 869.4 lb on
  // the bottom -- about 87% of its dry weight, as the note says. Concrete at
  // 150 lb/cu ft keeps only 57%.
  for (const [W, rhoObj, rhoW] of [[1000, 490, 64], [1000, 150, 64], [2500, 169, 62.4], [800, 490, 62.4]]) {
    const r = computeLiftBagSizing({ object_weight_lb: W, object_density_lb_ft3: rhoObj, water_density_lb_ft3: rhoW, depth_ft: 33, bag_rating_lb: 0, breakout_lb: 0 });
    const displaced = (W / rhoObj) * rhoW;
    within(r.in_water_weight_lb, W - displaced, 1e-9, `Archimedes on ${rhoObj} lb/cu ft`);
    // And the bag must displace that weight of the same water.
    within(r.bag_volume_cuft * rhoW, r.required_lift_lb, 1e-9, "the bag displaces the lift");
  }
  within(computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 0 }).in_water_weight_lb / 1000, 1 - 64 / 490, 1e-9, "steel keeps about 87%");
  within(computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 150, water_density_lb_ft3: 64, depth_ft: 0 }).in_water_weight_lb / 1000, 1 - 64 / 150, 1e-9, "concrete keeps about 57%");
  // Breakout is dead weight added to the lift, not to the object.
  const free = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 33, breakout_lb: 0 });
  const stuck = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 33, breakout_lb: 500 });
  within(stuck.required_lift_lb - free.required_lift_lb, 500, 1e-9, "breakout adds pound for pound");
  within(stuck.in_water_weight_lb, free.in_water_weight_lb, 1e-9, "and does not change what the object weighs");
});

test("lift bag: the free air to fill at depth is Boyle's law on the absolute pressure, 33.07 ft per atmosphere of seawater", () => {
  // One atmosphere is 14.696 psi = 2,116.2 lb/sq ft, which is 2,116.2/64 =
  // 33.07 ft of seawater and 2,116.2/62.4 = 33.91 ft of fresh. A bag filled at
  // 66 ft of seawater sits at just under 3 atmospheres absolute.
  const DW_SEA = 2116.2 / 64, DW_FRESH = 2116.2 / 62.4;
  near(DW_SEA, 33.07, 0.01, "feet of seawater per atmosphere");
  const r = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 66, bag_rating_lb: 500, breakout_lb: 0 });
  within(r.surface_air_cuft / r.bag_volume_cuft, (66 + DW_SEA) / DW_SEA, 1e-9, "Boyle at 66 ft");
  near(r.surface_air_cuft / r.bag_volume_cuft, 2.996, 0.005, "just under three atmospheres absolute");
  // At the surface the free air is the bag volume itself, and one atmosphere
  // down it is exactly double.
  const top = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 0 });
  within(top.surface_air_cuft, top.bag_volume_cuft, 1e-9, "no compression at the surface");
  const oneAtm = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: DW_SEA });
  within(oneAtm.surface_air_cuft, 2 * oneAtm.bag_volume_cuft, 1e-9, "double at one atmosphere down");
  const fresh = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 62.4, depth_ft: DW_FRESH });
  within(fresh.surface_air_cuft, 2 * fresh.bag_volume_cuft, 1e-9, "and at 33.9 ft of fresh water");
});

test("lift bag: bag count is a whole number of rated bags, and an object lighter than the water it displaces is refused", () => {
  const r = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 66, bag_rating_lb: 500, breakout_lb: 0 });
  assert.equal(r.bags_needed, 2, "869 lb of lift on 500 lb bags takes two");
  assert.ok(r.bags_needed * 500 >= r.required_lift_lb, "the bags cover the lift");
  // Exactly two bags' worth does not buy a third.
  const exact = computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 10, bag_rating_lb: computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 64, depth_ft: 10 }).required_lift_lb / 2 });
  assert.equal(exact.bags_needed, 2, "an exact fit takes two, not three");
  assert.ok(computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 50, water_density_lb_ft3: 64, depth_ft: 10 }).error, "a floating object does not need a lift bag");
  assert.ok(computeLiftBagSizing({ object_weight_lb: 1000, object_density_lb_ft3: 490, water_density_lb_ft3: 1000, depth_ft: 10 }).error, "water density out of range refused");
});

// ============================================================================
// slope-staking -- the catch point found by intersecting the two lines
// ============================================================================

test("slope staking: the catch point is where the design slope and the ground profile actually cross, found by bisection", () => {
  // Independent of the closed form: write the two elevation profiles measured
  // from the hinge and find where they meet. On a cut the design slope leaves
  // the hinge H below the ground reference and rises one vertical per s
  // horizontal; the ground rises at g away from centreline.
  for (const c of [
    { half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.10, section: "cut" },
    { half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.20, section: "cut" },
    { half_width_ft: 20, depth_ft: 9, side_slope_ratio: 3, ground_cross_slope: -0.05, section: "cut" },
    { half_width_ft: 15, depth_ft: 4, side_slope_ratio: 2.5, ground_cross_slope: 0.08, section: "fill" },
    { half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0, section: "cut" },
  ]) {
    const g = c.section === "cut" ? c.ground_cross_slope : -c.ground_cross_slope;
    const gap = (run) => (-c.depth_ft + run / c.side_slope_ratio) - g * run;  // slope elevation less ground elevation
    let lo = 0, hi = 1e6;
    for (let i = 0; i < 300; i++) { const mid = (lo + hi) / 2; if (gap(mid) < 0) lo = mid; else hi = mid; }
    const r = computeSlopeStaking(c);
    within(r.run_ft, (lo + hi) / 2, 1e-7, "run to the catch by bisection");
    within(r.catch_distance_ft, c.half_width_ft + r.run_ft, 1e-9, "catch is the half-width plus the run");
    within(r.vertical_at_catch_ft, c.depth_ft + g * r.run_ft, 1e-9, "vertical at the catch");
    within(r.flat_ground_distance_ft, c.half_width_ft + c.depth_ft * c.side_slope_ratio, 1e-9, "the g = 0 comparison");
  }
});

test("slope staking: the note's own field numbers, and the cross slope at which a 2:1 never daylights", () => {
  // A 24 ft roadway (12 ft half-width) in a 6 ft cut at 2:1: level ground gives
  // 24.0 ft, 10% cross slope gives 27.0 ft out and 7.5 ft down, 20% gives
  // 32.0 ft, and at 50% -- a ground slope as steep as the 2:1 design slope --
  // the two lines are parallel and never meet.
  const a = computeSlopeStaking({ half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.10, section: "cut" });
  within(a.catch_distance_ft, 27, 1e-9, "27.0 ft at 10%");
  within(a.vertical_at_catch_ft, 7.5, 1e-9, "7.5 ft down");
  within(a.flat_ground_distance_ft, 24, 1e-9, "24.0 ft on level ground");
  within(a.difference_ft, 3, 1e-9, "three feet past");
  within(computeSlopeStaking({ half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.20, section: "cut" }).catch_distance_ft, 32, 1e-9, "32.0 ft at 20%");
  within(a.limiting_cross_slope, 0.5, 1e-9, "a 2:1 runs out at 50%");
  assert.ok(computeSlopeStaking({ half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.5, section: "cut" }).error, "parallel slopes never daylight");
  assert.ok(computeSlopeStaking({ half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.6, section: "cut" }).error, "steeper still is refused, not reported as a negative catch");
});

test("slope staking: cut and fill read the same ground the opposite way, and level ground is the common answer", () => {
  const base = { half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2 };
  const cut = computeSlopeStaking({ ...base, ground_cross_slope: 0.1, section: "cut" });
  const fill = computeSlopeStaking({ ...base, ground_cross_slope: -0.1, section: "fill" });
  within(fill.catch_distance_ft, cut.catch_distance_ft, 1e-9, "ground falling away on a fill pushes the catch out as far as ground rising does on a cut");
  const flatCut = computeSlopeStaking({ ...base, ground_cross_slope: 0, section: "cut" });
  const flatFill = computeSlopeStaking({ ...base, ground_cross_slope: 0, section: "fill" });
  within(flatCut.catch_distance_ft, flatFill.catch_distance_ft, 1e-9, "on level ground the section does not matter");
  within(flatCut.catch_distance_ft, 24, 1e-9, "and it is the level-ground form");
  // Steeper ground pushes the catch monotonically farther out on a cut.
  let prev = 0;
  for (const g of [0, 0.05, 0.1, 0.2, 0.3, 0.4]) {
    const d = computeSlopeStaking({ ...base, ground_cross_slope: g, section: "cut" }).catch_distance_ft;
    assert.ok(d > prev, `catch grows with cross slope at ${g}`);
    prev = d;
  }
});

// ============================================================================
// branch-circuit-wire-footage -- the takeoff reached per colour
// ============================================================================

test("branch circuit wire: the footage is what a per-colour takeoff adds up to, and 1,000 ft rolls round up whole", () => {
  // Independent route: a 3-wire circuit is a hot, a neutral and a ground, each
  // pulled the same panel-to-device length plus the same makeup. Twenty
  // circuits at 45 ft with 15 ft of makeup is 1,200 ft per colour, 3,600 ft in
  // all, and four 1,000 ft rolls -- which is the point of the note's warning
  // that wire is bought per colour.
  const c = { circuits: 20, avg_homerun_ft: 45, makeup_ft: 15, conductors_per_circuit: 3, roll_ft: 1000 };
  const r = computeBranchCircuitWireFootage(c);
  const perColour = c.circuits * (c.avg_homerun_ft + c.makeup_ft);
  within(perColour, 1200, 1e-9, "1,200 ft of each colour");
  within(r.total_ft, 3 * perColour, 1e-9, "three colours");
  assert.equal(r.rolls, 4, "four rolls across all conductors");
  // The note's own advice: per colour it is two rolls each, six in all, which
  // is NOT the four the tile reports -- the tile's roll count is explicitly the
  // all-conductors figure, and the note says to split before ordering.
  assert.equal(Math.ceil(perColour / c.roll_ft), 2, "two rolls of each colour");
  assert.ok(3 * Math.ceil(perColour / c.roll_ft) > r.rolls, "ordering per colour buys more rolls than the total implies");
});

test("branch circuit wire: a roll count never ships a fraction of a roll and does not buy one for a rounding crumb", () => {
  // Exactly ten rolls is ten rolls.
  assert.equal(computeBranchCircuitWireFootage({ circuits: 10, avg_homerun_ft: 900, makeup_ft: 100, conductors_per_circuit: 1, roll_ft: 1000 }).rolls, 10, "10,000 ft is ten rolls");
  assert.equal(computeBranchCircuitWireFootage({ circuits: 10, avg_homerun_ft: 900, makeup_ft: 100.1, conductors_per_circuit: 1, roll_ft: 1000 }).rolls, 11, "a foot over buys the eleventh");
  for (const c of [
    { circuits: 7, avg_homerun_ft: 33, makeup_ft: 11, conductors_per_circuit: 4, roll_ft: 500 },
    { circuits: 1, avg_homerun_ft: 10, makeup_ft: 0, conductors_per_circuit: 1, roll_ft: 250 },
  ]) {
    const r = computeBranchCircuitWireFootage(c);
    assert.ok(Number.isInteger(r.rolls), "whole rolls");
    assert.ok(r.rolls * c.roll_ft >= r.total_ft - 1e-9, "the rolls cover the footage");
    assert.ok((r.rolls - 1) * c.roll_ft < r.total_ft, "and not one roll more than needed");
  }
  // Cable (NM) is counted as the cable, not its conductors.
  const cable = computeBranchCircuitWireFootage({ circuits: 20, avg_homerun_ft: 45, makeup_ft: 15, conductors_per_circuit: 1, roll_ft: 1000 });
  within(cable.total_ft, 1200, 1e-9, "one run of cable per circuit");
  assert.equal(cable.rolls, 2, "two 1,000 ft rolls of cable");
});

// ============================================================================
// yaw-error-loss -- the cosine-cubed and cosine-squared models, by hand
// ============================================================================

test("yaw error: cubed and squared models are distinguished by hand values at 10 and 20 degrees", () => {
  // cos 20 deg = 0.9396926. Cubed that is 0.8297695, a 17.02% loss; squared it
  // is 0.8830222, an 11.70% loss. At 10 degrees the cubed form loses 4.49% and
  // the squared 3.02%. The two differ by nearly half again at 20 degrees,
  // which is why both are reported.
  const base = { rated_power_kw: 2500, capacity_factor_pct: 40, energy_price_per_mwh: 40, turbine_count: 1, acceptable_loss_pct: 2 };
  const r20 = computeYawErrorLoss({ ...base, yaw_error_deg: 20 });
  near(r20.retained_cubed, 0.8297695, 1e-6, "cos^3 20 deg");
  near(r20.retained_squared, 0.8830222, 1e-6, "cos^2 20 deg");
  near(r20.loss_cubed_pct, 17.023, 0.01, "17.0% on the cubed form");
  near(r20.loss_squared_pct, 11.698, 0.01, "11.7% on the squared form");
  const r10 = computeYawErrorLoss({ ...base, yaw_error_deg: 10 });
  near(r10.loss_cubed_pct, 4.489, 0.01, "4.5% at ten degrees");
  near(r10.loss_squared_pct, 3.015, 0.01, "3.0% at ten degrees");
  // The cubed form is the pessimistic bound at every angle, and a machine that
  // is straight loses nothing.
  for (const deg of [0, 1, 5, 12, 30, 60, 89]) {
    const r = computeYawErrorLoss({ ...base, yaw_error_deg: deg });
    assert.ok(r.loss_cubed_pct >= r.loss_squared_pct - 1e-12, `cubed is the bound at ${deg} deg`);
  }
  within(computeYawErrorLoss({ ...base, yaw_error_deg: 0 }).loss_cubed_pct, 0, 1e-9, "a straight machine loses nothing");
});

test("yaw error: the angle worth chasing is the loss relation inverted, and the money follows the capacity factor", () => {
  const base = { yaw_error_deg: 12, rated_power_kw: 2500, capacity_factor_pct: 40, energy_price_per_mwh: 40, turbine_count: 30 };
  for (const pct of [1, 2, 5, 10]) {
    const r = computeYawErrorLoss({ ...base, acceptable_loss_pct: pct });
    // Re-run the tile at the reported threshold angle: the loss there must be
    // exactly the acceptable loss.
    const at = computeYawErrorLoss({ ...base, yaw_error_deg: r.acceptable_angle_deg, acceptable_loss_pct: pct });
    within(at.loss_cubed_pct, pct, 1e-8, `threshold angle round trip at ${pct}%`);
  }
  near(computeYawErrorLoss({ ...base, acceptable_loss_pct: 2 }).acceptable_angle_deg, 6.642, 0.01, "2% is about 6.6 degrees");
  // Annual energy: a 2.5 MW machine at a 40% capacity factor makes 8,760 MWh.
  const r = computeYawErrorLoss({ ...base, acceptable_loss_pct: 2 });
  within(r.annual_mwh, 2500 * 8760 * 0.40 / 1000, 1e-9, "annual energy");
  within(r.annual_mwh, 8760, 1e-9, "2.5 MW at 40% is 8,760 MWh");
  within(r.lost_mwh, r.annual_mwh * r.loss_cubed_pct / 100, 1e-9, "energy lost");
  within(r.lost_usd, r.lost_mwh * 40, 1e-9, "revenue lost");
  within(r.fleet_lost_usd, 30 * r.lost_usd, 1e-9, "thirty machines");
  assert.equal(r.chase_verdict.includes("past"), true, "12 degrees is past a 2% threshold");
  assert.equal(computeYawErrorLoss({ ...base, yaw_error_deg: 3, acceptable_loss_pct: 2 }).chase_verdict.includes("inside"), true, "3 degrees is scatter");
});

// ============================================================================
// window-film-shgc -- the ASHRAE SHGC definition and what EER means
// ============================================================================

test("window film: the kilowatt-hours come out the same through the tons-and-kW-per-ton route", () => {
  // SHGC (ASHRAE) is the fraction of incident solar energy admitted as heat, so
  // the avoided gain is area x delta-SHGC x irradiance. A ton of cooling is
  // 12,000 BTU/hr by definition, and EER is cooling BTU per watt-hour of input,
  // so a machine draws 12/EER kW per ton. Running the saving through tons and
  // kW per ton must land on the same kilowatt-hours as dividing BTU by EER.
  const c = { area_sqft: 200, shgc_before: 0.7, shgc_after: 0.35, peak_irradiance_btuh_sqft: 230, full_sun_hours: 1200, eer: 12, price_per_kwh: 0.14, cost_per_sqft: 9 };
  const r = computeWindowFilmShgc(c);
  within(r.peak_reduction_btuh, 200 * 0.35 * 230, 1e-9, "16,100 BTU/hr avoided");
  within(r.peak_reduction_btuh, 16100, 1e-9, "the note's own figure");
  within(r.peak_reduction_tons, 16100 / 12000, 1e-9, "1.34 tons, at 12,000 BTU/hr per ton");
  const kwPerTon = 12 / c.eer;
  within(r.kwh_saved, r.peak_reduction_tons * kwPerTon * c.full_sun_hours, 1e-9, "tons x kW/ton x hours");
  near(r.kwh_saved, 1610, 1, "about 1,610 kWh");
  near(r.dollars_saved, 225, 1, "about $225 a year");
  within(r.installed_cost, 1800, 1e-9, "$1,800 of film");
  near(r.payback_years, 8, 0.1, "eight years, a poor investment on energy alone");
});

test("window film: a higher-efficiency machine saves fewer kilowatt-hours for the same avoided heat", () => {
  // The heat avoided is a property of the glass, not the chiller; the
  // electricity it saves is inversely proportional to EER.
  const c = { area_sqft: 200, shgc_before: 0.7, shgc_after: 0.35, peak_irradiance_btuh_sqft: 230, full_sun_hours: 1200, eer: 12, price_per_kwh: 0.14, cost_per_sqft: 9 };
  const a = computeWindowFilmShgc(c), b = computeWindowFilmShgc({ ...c, eer: 24 });
  within(b.annual_btu, a.annual_btu, 1e-9, "the same heat is kept out");
  within(b.kwh_saved / a.kwh_saved, 0.5, 1e-9, "twice the EER, half the kilowatt-hours");
  within(b.payback_years / a.payback_years, 2, 1e-9, "and twice the payback");
  // Only the SHGC difference matters, not the pair of values.
  const same = computeWindowFilmShgc({ ...c, shgc_before: 0.6, shgc_after: 0.25 });
  within(same.peak_reduction_btuh, a.peak_reduction_btuh, 1e-9, "the same 0.35 drop saves the same heat");
  assert.ok(computeWindowFilmShgc({ ...c, shgc_after: 0.7 }).error, "film that does not lower SHGC is refused");
  assert.ok(computeWindowFilmShgc({ ...c, shgc_before: 1.4 }).error, "an SHGC over 1 is refused");
});

// ============================================================================
// free-surface-moment -- the second moment of area, integrated numerically
// ============================================================================

test("free surface: the surface inertia is the second moment of area of the rectangle, integrated strip by strip", () => {
  // i = integral of y^2 dA about the surface's own fore-and-aft centreline.
  // For a rectangle l by b that is l b^3 / 12; computed here by summing strips
  // rather than by quoting the formula.
  const inertiaByStrips = (l, b, n = 200000) => {
    const dy = b / n;
    let s = 0;
    for (let i = 0; i < n; i++) { const y = -b / 2 + (i + 0.5) * dy; s += y * y * l * dy; }
    return s;
  };
  for (const [l, b] of [[10, 8], [40, 25], [6, 6]]) {
    const r = computeFreeSurfaceMoment({ tank_length_ft: l, tank_breadth_ft: b, liquid_density_lb_ft3: 64, compartments_across: 1, tanks: 1, displacement_lb: 0 });
    within(r.surface_inertia_ft4, inertiaByStrips(l, b), 1e-6, `i for a ${l} x ${b} tank`);
    within(r.surface_inertia_ft4, l * Math.pow(b, 3) / 12, 1e-9, "l b^3 / 12");
  }
});

test("free surface: breadth is cubed -- a centreline bulkhead leaves a quarter of the moment, and depth never appears", () => {
  const base = { tank_length_ft: 10, tank_breadth_ft: 8, liquid_density_lb_ft3: 64, tanks: 1, displacement_lb: 60000 };
  const whole = computeFreeSurfaceMoment({ ...base, compartments_across: 1 });
  const split = computeFreeSurfaceMoment({ ...base, compartments_across: 2 });
  within(split.free_surface_moment_ftlb / whole.free_surface_moment_ftlb, 0.25, 1e-9, "one bulkhead leaves a quarter");
  within(computeFreeSurfaceMoment({ ...base, compartments_across: 3 }).free_surface_moment_ftlb / whole.free_surface_moment_ftlb, 1 / 9, 1e-9, "two bulkheads leave a ninth");
  // Two half-breadth tanks side by side are the same thing as one divided tank.
  const twoHalves = computeFreeSurfaceMoment({ ...base, tank_breadth_ft: 4, compartments_across: 1, tanks: 2 });
  within(twoHalves.free_surface_moment_ftlb, split.free_surface_moment_ftlb, 1e-9, "two 4 ft tanks equal one 8 ft tank split on the centreline");
  // Doubling the breadth is eight times the moment; doubling the length only two.
  within(computeFreeSurfaceMoment({ ...base, tank_breadth_ft: 16, compartments_across: 1 }).free_surface_moment_ftlb / whole.free_surface_moment_ftlb, 8, 1e-9, "breadth cubed");
  within(computeFreeSurfaceMoment({ ...base, tank_length_ft: 20, compartments_across: 1 }).free_surface_moment_ftlb / whole.free_surface_moment_ftlb, 2, 1e-9, "length once");
  // The reported "undivided for comparison" is the n = 1 case of the same tank.
  within(split.undivided_moment_ftlb, whole.free_surface_moment_ftlb, 1e-9, "undivided comparison");
  within(whole.moment_if_split_ftlb, split.free_surface_moment_ftlb, 1e-9, "one more division is the next case");
});

test("free surface: the GM loss is the moment over the displacement, and the density is the liquid in the tank", () => {
  // The virtual rise of G is rho x i / displacement -- a length. A 10 x 8 ft
  // seawater tank on a 60,000 lb vessel: i = 426.67 ft^4, moment = 27,307 ft-lb,
  // and the correction is 0.455 ft, about 5.5 inches.
  const r = computeFreeSurfaceMoment({ tank_length_ft: 10, tank_breadth_ft: 8, liquid_density_lb_ft3: 64, compartments_across: 1, tanks: 1, displacement_lb: 60000 });
  within(r.surface_inertia_ft4, 10 * 512 / 12, 1e-9, "426.67 ft^4");
  within(r.free_surface_moment_ftlb, 64 * r.surface_inertia_ft4, 1e-9, "density x inertia");
  within(r.free_surface_correction_ft, r.free_surface_moment_ftlb / 60000, 1e-9, "moment over displacement");
  near(r.free_surface_correction_ft, 0.455, 0.002, "about 5.5 inches of GM");
  // Diesel at 53 lb/cu ft is lighter water and costs proportionally less.
  const diesel = computeFreeSurfaceMoment({ tank_length_ft: 10, tank_breadth_ft: 8, liquid_density_lb_ft3: 53, compartments_across: 1, tanks: 1, displacement_lb: 60000 });
  within(diesel.free_surface_moment_ftlb / r.free_surface_moment_ftlb, 53 / 64, 1e-9, "linear in the liquid's density");
  // A heavier vessel feels the same moment less.
  const heavy = computeFreeSurfaceMoment({ tank_length_ft: 10, tank_breadth_ft: 8, liquid_density_lb_ft3: 64, compartments_across: 1, tanks: 1, displacement_lb: 120000 });
  within(heavy.free_surface_correction_ft, r.free_surface_correction_ft / 2, 1e-9, "twice the displacement, half the GM loss");
  within(heavy.free_surface_moment_ftlb, r.free_surface_moment_ftlb, 1e-9, "the moment itself does not know the vessel");
  assert.equal(computeFreeSurfaceMoment({ tank_length_ft: 10, tank_breadth_ft: 8, displacement_lb: 0 }).has_displacement, false, "displacement is optional");
  assert.ok(computeFreeSurfaceMoment({ tank_length_ft: 10, tank_breadth_ft: 8, compartments_across: 1.5 }).error, "half a bulkhead is not a thing");
});

// ============================================================================
// chipper-debris -- a mass balance and a whole number of loads
// ============================================================================

test("chipper debris: the chip volume is a mass balance -- density times volume returns the green weight", () => {
  for (const [w, d] of [[4400, 550], [12000, 500], [7000, 600]]) {
    const r = computeChipperDebris({ green_weight_lb: w, chip_density_lcy: d, box_capacity_cy: 15 });
    within(r.chip_volume_lcy * d, w, 1e-9, `mass closes at ${d} lb/lcy`);
  }
  within(computeChipperDebris({ green_weight_lb: 4400, chip_density_lcy: 550, box_capacity_cy: 15 }).chip_volume_lcy, 8, 1e-9, "4,400 lb at 550 lb/lcy is 8 loose cy");
  // The 500-600 lb/lcy range the note calls typical spans a sixth either way on
  // volume, which is why the scale ticket governs.
  const light = computeChipperDebris({ green_weight_lb: 6000, chip_density_lcy: 500, box_capacity_cy: 15 }).chip_volume_lcy;
  const heavy = computeChipperDebris({ green_weight_lb: 6000, chip_density_lcy: 600, box_capacity_cy: 15 }).chip_volume_lcy;
  within(light / heavy, 600 / 500, 1e-9, "volume is inverse in density");
  assert.ok(light > heavy, "lighter chips take more box");
});

test("chipper debris: loads are whole trips and an exact boxful does not buy another", () => {
  // 8,250 lb at 550 lb/lcy is exactly 15 loose cy, one full 15 cy box.
  assert.equal(computeChipperDebris({ green_weight_lb: 8250, chip_density_lcy: 550, box_capacity_cy: 15 }).loads, 1, "an exact boxful is one load");
  assert.equal(computeChipperDebris({ green_weight_lb: 8251, chip_density_lcy: 550, box_capacity_cy: 15 }).loads, 2, "a pound over is a second trip");
  for (const w of [1000, 4400, 8250, 9000, 30000]) {
    const r = computeChipperDebris({ green_weight_lb: w, chip_density_lcy: 550, box_capacity_cy: 15 });
    assert.ok(Number.isInteger(r.loads) && r.loads >= 1, "whole loads");
    assert.ok(r.loads * 15 >= r.chip_volume_lcy - 1e-9, "the loads carry the chips");
    assert.ok((r.loads - 1) * 15 < r.chip_volume_lcy, "and no extra trip");
  }
  assert.ok(computeChipperDebris({ green_weight_lb: 0, chip_density_lcy: 550, box_capacity_cy: 15 }).error, "nothing to chip is refused");
  assert.ok(computeChipperDebris({ green_weight_lb: 4400, chip_density_lcy: 0, box_capacity_cy: 15 }).error, "zero density refused");
});

// ============================================================================
// substrate-for-velocity -- round-tripped through Michaelis-Menten
// ============================================================================

test("substrate for velocity: feeding the answer back into v = Vmax [S] / (Km + [S]) returns the target velocity", () => {
  // The forward Michaelis-Menten equation is the independent check: whatever
  // substrate the tile reports must, put back through the hyperbola, produce
  // the fraction of Vmax that was asked for.
  for (const km of [25, 0.4, 1200]) {
    for (const pct of [10, 25, 50, 75, 90, 95, 99, 99.9]) {
      const r = computeSubstrateForVelocity({ km, target_percent: pct });
      const vOverVmax = r.substrate / (km + r.substrate);
      within(vOverVmax * 100, pct, 1e-9, `round trip at Km ${km}, ${pct}% of Vmax`);
    }
  }
});

test("substrate for velocity: Km IS the half-Vmax concentration, and the hyperbola's known multiples", () => {
  // The definition of Km, and the textbook consequences: 90% of Vmax needs
  // 9 Km, 99% needs 99 Km, and 9% needs about a tenth of Km.
  const km = 25;
  const half = computeSubstrateForVelocity({ km, target_percent: 50 });
  within(half.substrate, km, 1e-9, "half Vmax is at [S] = Km");
  within(half.fold_km, 1, 1e-9, "one Km");
  assert.equal(half.at_half, true, "flagged as the definition");
  within(computeSubstrateForVelocity({ km, target_percent: 90 }).fold_km, 9, 1e-9, "90% needs 9 Km");
  within(computeSubstrateForVelocity({ km, target_percent: 99 }).fold_km, 99, 1e-9, "99% needs 99 Km");
  within(computeSubstrateForVelocity({ km, target_percent: 10 }).fold_km, 1 / 9, 1e-9, "10% needs a ninth of Km");
  // The fold is a property of the target alone; Km only sets the scale.
  within(computeSubstrateForVelocity({ km: 1000, target_percent: 90 }).fold_km, computeSubstrateForVelocity({ km: 0.001, target_percent: 90 }).fold_km, 1e-9, "fold is scale-free");
  within(computeSubstrateForVelocity({ km: 50, target_percent: 90 }).substrate / computeSubstrateForVelocity({ km: 25, target_percent: 90 }).substrate, 2, 1e-9, "substrate scales with Km");
  // Vmax is approached and never reached, so 100% is not a question with an answer.
  assert.ok(computeSubstrateForVelocity({ km, target_percent: 100 }).error, "100% of Vmax is refused");
  assert.ok(computeSubstrateForVelocity({ km, target_percent: 0 }).error, "0% is refused");
  assert.ok(computeSubstrateForVelocity({ km: 0, target_percent: 50 }).error, "a zero Km is refused");
});

// ============================================================================
// fermentation-time-q10 -- the Q10 definition, tested exactly 10 degrees apart
// ============================================================================

test("fermentation Q10: ten degrees Celsius apart -- 18 degrees F -- changes the time by exactly the Q10 factor", () => {
  // This IS the definition of Q10: the factor a rate changes by over a 10 C
  // change in temperature. 10 C is 18 F exactly, so an 18 F swing must return
  // the Q10 factor itself and nothing else.
  for (const q10 of [2.0, 1.5, 2.8, 3.0]) {
    const colder = computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 78, actual_temp_f: 60, q10 });
    within(colder.ratio, q10, 1e-12, `${q10} over 18 F colder`);
    within(colder.delta_c, 10, 1e-12, "18 F is exactly 10 C");
    within(colder.predicted_time_hr, 2 * q10, 1e-12, "the ferment takes Q10 times as long");
    const warmer = computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 78, actual_temp_f: 96, q10 });
    within(warmer.ratio, 1 / q10, 1e-12, "and 18 F warmer is the reciprocal");
    within(colder.ratio * warmer.ratio, 1, 1e-12, "the two cancel");
  }
  // At the reference temperature nothing changes.
  const same = computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 78, actual_temp_f: 78, q10: 2 });
  within(same.ratio, 1, 1e-12, "no change at the reference");
  within(same.predicted_time_hr, 2, 1e-12, "the reference time stands");
  assert.ok(same.direction.includes("reference"), "and says so");
});

test("fermentation Q10: the bakery cases in the note, and the sign of the correction", () => {
  // 2.0 hr at 78 F, dough off the mixer at 68 F: 10 F is 5.56 C, 2^0.556 = 1.47,
  // so 2.94 hr. At 88 F the same dough finishes in 1.36 hr. Across 68 to 88 F
  // the same dough runs 82 to 176 minutes.
  const cold = computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 78, actual_temp_f: 68, q10: 2 });
  near(cold.delta_c, 5.556, 0.001, "10 F is 5.56 C");
  near(cold.ratio, 1.470, 0.001, "2 ^ 0.556");
  near(cold.predicted_time_hr, 2.94, 0.01, "nearly an hour late");
  assert.ok(cold.direction.includes("slower"), "colder is slower");
  const warm = computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 78, actual_temp_f: 88, q10: 2 });
  near(warm.predicted_time_hr, 1.36, 0.01, "warm dough finishes early");
  assert.ok(warm.direction.includes("faster"), "warmer is faster");
  near(warm.predicted_time_min, 82, 1, "82 minutes at 88 F");
  near(cold.predicted_time_min, 176, 1, "176 minutes at 68 F");
  within(cold.predicted_time_hr / warm.predicted_time_hr, Math.pow(2, 20 * 5 / 9 / 10), 1e-12, "the 20 F spread is one Q10 raised to 1.11");
  // A temperature typed in Celsius is caught rather than silently answered.
  assert.ok(computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 26, actual_temp_f: 20, q10: 2 }).error, "Celsius input refused");
  assert.ok(computeFermentationTimeQ10({ reference_time_hr: 2, reference_temp_f: 78, actual_temp_f: 68, q10: 1 }).error, "a Q10 of 1 is no relation at all");
});

// ============================================================================
// brrrr-refi -- the cash-flow identity of the refinance
// ============================================================================

test("BRRRR refi: the money in and the money back out close -- capital left = purchase and rehab less the loan proceeds", () => {
  // Independent accounting: the investor puts in the total invested, the new
  // loan pays off any existing debt, and what is left of the loan comes back to
  // the investor. Capital left in the deal is the difference, and every dollar
  // of it has to have come from somewhere.
  for (const c of [
    { arv_usd: 200000, total_invested_usd: 140000, refi_ltv_pct: 75, existing_payoff_usd: 0, annual_cash_flow_usd: 0 },
    { arv_usd: 325000, total_invested_usd: 210000, refi_ltv_pct: 70, existing_payoff_usd: 90000, annual_cash_flow_usd: 4800 },
    { arv_usd: 150000, total_invested_usd: 90000, refi_ltv_pct: 80, existing_payoff_usd: 0, annual_cash_flow_usd: 3000 },
  ]) {
    const r = computeBrrrrRefi(c);
    within(r.new_loan_usd, c.arv_usd * c.refi_ltv_pct / 100, 1e-9, "the loan is a fraction of the appraisal");
    within(r.cash_returned_usd + c.existing_payoff_usd, r.new_loan_usd, 1e-9, "the loan goes to the payoff and to the investor");
    within(r.capital_left_usd + r.cash_returned_usd, c.total_invested_usd, 1e-9, "money in equals money back plus money still in");
    if (!r.all_recovered) within(r.coc * r.capital_left_usd, c.annual_cash_flow_usd, 1e-9, "cash-on-cash times the capital left is the cash flow");
  }
});

test("BRRRR refi: full recovery is called at the exact break-even and the cash-on-cash stops being a number", () => {
  // A 75% refinance on a $200,000 ARV returns $150,000. Invest exactly that and
  // the deal is a round trip with no capital left; a dollar more invested and
  // there is.
  const even = computeBrrrrRefi({ arv_usd: 200000, total_invested_usd: 150000, refi_ltv_pct: 75, existing_payoff_usd: 0, annual_cash_flow_usd: 6000 });
  within(even.cash_returned_usd, 150000, 1e-9, "the cash-out");
  within(even.capital_left_usd, 0, 1e-9, "nothing left in");
  assert.equal(even.all_recovered, true, "all capital recovered");
  assert.equal(even.coc, null, "an infinite return is not reported as a number");
  const short = computeBrrrrRefi({ arv_usd: 200000, total_invested_usd: 150001, refi_ltv_pct: 75, existing_payoff_usd: 0, annual_cash_flow_usd: 6000 });
  assert.equal(short.all_recovered, false, "a dollar short is not recovered");
  within(short.capital_left_usd, 1, 1e-9, "and the dollar is the capital left");
  const over = computeBrrrrRefi({ arv_usd: 200000, total_invested_usd: 140000, refi_ltv_pct: 75, existing_payoff_usd: 0, annual_cash_flow_usd: 0 });
  assert.equal(over.all_recovered, true, "a $10,000 surplus is still full recovery");
  within(over.capital_left_usd, -10000, 1e-9, "reported as a negative capital left");
  // An LTV typed as a fraction would make a 1% loan; it is caught.
  assert.ok(computeBrrrrRefi({ arv_usd: 200000, total_invested_usd: 140000, refi_ltv_pct: 0.75 }).error, "a fractional LTV is refused");
  assert.ok(computeBrrrrRefi({ arv_usd: 200000, total_invested_usd: 140000, refi_ltv_pct: 101 }).error, "over 100% LTV refused");
});

// ============================================================================
// labor-burden-rate -- the burden identity
// ============================================================================

test("labor burden: the burdened rate over the base wage is exactly one plus the reported burden percent", () => {
  for (const c of [
    { wage: 25, payroll_pct: 9.15, wc_pct: 8, liab_pct: 2, benefits: 4, productivity: 85 },
    { wage: 42.5, payroll_pct: 9.15, wc_pct: 14, liab_pct: 3.2, benefits: 11.75, productivity: 70 },
    { wage: 18, payroll_pct: 7.65, wc_pct: 0, liab_pct: 0, benefits: 0, productivity: 100 },
  ]) {
    const r = computeLaborBurdenRate(c);
    within(r.burdened_hr / c.wage, 1 + r.burden_pct / 100, 1e-12, "burdened / wage = 1 + burden%");
    within(r.burdened_hr - c.wage, c.wage * r.burden_pct / 100, 1e-12, "the burden in dollars");
    // The burden ON THE WAGE is the percentages plus the per-hour fringe; the
    // productivity divisor is a separate step applied after it.
    within(r.burden_hr, c.wage * (c.payroll_pct + c.wc_pct + c.liab_pct) / 100 + c.benefits, 1e-12, "burden before the divisor");
    within(r.burdened_hr * (c.productivity / 100), c.wage + r.burden_hr, 1e-12, "the divisor spreads the paid hour over the billed hours");
  }
});

test("labor burden: a wage with no burden and full productivity costs the wage, and FICA alone is 7.65%", () => {
  // The published federal employer payroll tax is 7.65% of wages (6.2% Social
  // Security + 1.45% Medicare), with FUTA/SUTA on top -- the 9.15% default.
  const bare = computeLaborBurdenRate({ wage: 30, payroll_pct: 0, wc_pct: 0, liab_pct: 0, benefits: 0, productivity: 100 });
  within(bare.burdened_hr, 30, 1e-12, "no burden, no markup");
  within(bare.burden_pct, 0, 1e-12, "zero percent");
  const fica = computeLaborBurdenRate({ wage: 30, payroll_pct: 7.65, wc_pct: 0, liab_pct: 0, benefits: 0, productivity: 100 });
  within(fica.burden_hr, 30 * 0.0765, 1e-12, "FICA on a $30 wage is $2.295");
  within(fica.burdened_hr, 32.295, 1e-12, "$32.30 an hour");
  // Productivity is a divisor, so 50% billable doubles the rate.
  const half = computeLaborBurdenRate({ wage: 30, payroll_pct: 0, wc_pct: 0, liab_pct: 0, benefits: 0, productivity: 50 });
  within(half.burdened_hr, 60, 1e-12, "half the hours billable, twice the rate");
  // Benefits are dollars per hour, not a percentage: they do not scale with the wage.
  const a = computeLaborBurdenRate({ wage: 20, payroll_pct: 0, wc_pct: 0, liab_pct: 0, benefits: 5, productivity: 100 });
  const b = computeLaborBurdenRate({ wage: 40, payroll_pct: 0, wc_pct: 0, liab_pct: 0, benefits: 5, productivity: 100 });
  within(b.burden_hr, a.burden_hr, 1e-12, "a flat fringe is flat");
  within(b.burdened_hr - a.burdened_hr, 20, 1e-12, "only the wage moved");
  // The two unit traps the compute guards.
  assert.ok(computeLaborBurdenRate({ wage: 25, productivity: 0.85 }).error, "a fraction typed for 85% is refused");
  assert.ok(computeLaborBurdenRate({ wage: 25, productivity: 1 }).error, "a 1 typed for 100% is refused");
  assert.ok(computeLaborBurdenRate({ wage: 25, productivity: 120 }).error, "over 100% billable is refused");
});
