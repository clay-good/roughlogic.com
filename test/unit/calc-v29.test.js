// spec-v29 unit tests: pipe / raceway field-layout bench (3 tiles).
// Deepens existing groups per the spec-v28 §7 roadmap: pipe-cold-spring
// (Group B, ASME B31.1 §119), raceway-expansion-fitting (Group A, NEC
// 352.44), pipe-spacing-rack (Group G, ASTM C585 geometry). The three land
// in a new calc-pipefit.js module (calc-electrical and calc-plumbing are at
// their size caps). Pins the worked examples, the flags, and the guards.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeColdSpring, computeRacewayExpansion, computePipeSpacingRack,
} from "../../calc-pipefit.js";

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// --- 29.1 pipe-cold-spring ---
test("pipe-cold-spring: growth, gap, residual, and the stress-range honesty note", () => {
  const r = computeColdSpring({ material: "steel", run_length_ft: 100, install_temp_f: 50, operating_temp_f: 250, cold_spring_percent: 50 });
  assert.ok(near(r.thermal_growth_in, 1.56));      // 6.5e-6 * 1200 in * 200 F
  assert.ok(near(r.cold_spring_gap_in, 0.78));      // 50% of 1.56
  assert.ok(near(r.residual_movement_in, 0.78));    // growth - gap
  assert.ok(near(r.growth_per_100ft_in, 1.56));
  assert.strictEqual(r.delta_t_f, 200);
  // the cut-short does not reduce the cyclic stress range -- the note must say so (B31.1 §119.10)
  assert.ok(r.notes.join(" ").includes("stress range"));
  // a custom coefficient overrides the material table
  const cu = computeColdSpring({ material: "steel", run_length_ft: 100, install_temp_f: 50, operating_temp_f: 250, alpha_per_f: 0.0000094 });
  assert.ok(near(cu.thermal_growth_in, 0.0000094 * 1200 * 200));
  // equal temps -> zero growth, finite, no error
  assert.strictEqual(computeColdSpring({ material: "copper", run_length_ft: 50, install_temp_f: 70, operating_temp_f: 70 }).thermal_growth_in, 0);
  // guards
  assert.ok("error" in computeColdSpring({ material: "steel", run_length_ft: 0, install_temp_f: 50, operating_temp_f: 250 }));
  assert.ok("error" in computeColdSpring({ material: "steel", run_length_ft: 100, install_temp_f: 50, operating_temp_f: 250, cold_spring_percent: 150 }));
});

// --- 29.2 raceway-expansion-fitting ---
test("raceway-expansion-fitting: NEC 352.44 length change, threshold, fitting count", () => {
  const r = computeRacewayExpansion({ run_length_ft: 100, temp_range_f: 100, fitting_travel_in: 6 });
  assert.ok(near(r.length_change_in, 4.056));       // 3.38e-5 * 1200 in * 100 F (Table 352.44 ~ 4.1 in/100 ft)
  assert.ok(near(r.per_100ft_in, 4.056));
  assert.strictEqual(r.requires_fitting, true);
  assert.strictEqual(r.fittings_needed, 1);         // ceil(4.056 / 6)
  // a small run below the 0.25 in threshold needs no fitting
  const small = computeRacewayExpansion({ run_length_ft: 2, temp_range_f: 20, fitting_travel_in: 6 });
  assert.strictEqual(small.requires_fitting, false);
  assert.strictEqual(small.fittings_needed, 0);
  // a long run needs more than one fitting
  assert.ok(computeRacewayExpansion({ run_length_ft: 400, temp_range_f: 120, fitting_travel_in: 6 }).fittings_needed >= 2);
  // guards
  assert.ok("error" in computeRacewayExpansion({ run_length_ft: 0, temp_range_f: 100 }));
  assert.ok("error" in computeRacewayExpansion({ run_length_ft: 100, temp_range_f: -5 }));
});

// --- 29.3 pipe-spacing-rack ---
test("pipe-spacing-rack: insulated OD, center-to-center, bundle width, rack fit", () => {
  const r = computePipeSpacingRack({ pipe_od_in: 2.375, insulation_thickness_in: 1, clearance_in: 1, pipe_count: 2, rack_width_in: 24 });
  assert.strictEqual(r.insulated_od_in, 4.375);     // 2.375 + 2*1
  assert.strictEqual(r.center_to_center_in, 5.375); // insulated OD + clearance
  assert.strictEqual(r.total_bundle_width_in, 9.75);// 2*4.375 + 1*1
  assert.strictEqual(r.pipes_that_fit, 4);          // floor((24+1)/5.375)
  assert.ok(near(r.remaining_in, 14.25));           // 24 - 9.75
  // bare pipe (no insulation): center-to-center is OD + clearance
  const bare = computePipeSpacingRack({ pipe_od_in: 1.05, insulation_thickness_in: 0, clearance_in: 0.5, pipe_count: 3 });
  assert.strictEqual(bare.center_to_center_in, 1.55);
  assert.strictEqual(bare.total_bundle_width_in, 4.15); // 3*1.05 + 2*0.5
  assert.strictEqual(bare.pipes_that_fit, null);         // no rack width entered
  // a bundle wider than the rack flags how many fit
  const tight = computePipeSpacingRack({ pipe_od_in: 6.625, insulation_thickness_in: 2, clearance_in: 2, pipe_count: 4, rack_width_in: 24 });
  assert.ok(tight.remaining_in < 0);
  assert.ok(tight.pipes_that_fit < 4);
  // guard
  assert.ok("error" in computePipeSpacingRack({ pipe_od_in: 0, insulation_thickness_in: 1, clearance_in: 1 }));
});
