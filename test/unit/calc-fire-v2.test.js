// Unit tests for calc-fire.js v2 utilities (100-104). 10+ cases per utility.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeReverseLayFriction,
  computeSprinklerDensity,
  computeStandpipeFriction,
  computeLadderPipeReach,
  computeBrakingDistance,
  SPRINKLER_HAZARD_MIN_DENSITY,
  reverseLayExample,
  sprinklerDensityExample,
  standpipeExample,
  ladderPipeExample,
  brakingExample,
} from "../../calc-fire.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 100: Reverse-Lay Friction ---

test("Reverse-lay: example 5 in 1000 GPM 1000 ft single -> 80 psi", () => {
  const r = computeReverseLayFriction({ ...reverseLayExample.inputs, n_pumps: 1 });
  assert.ok(close(r.single_pump_psi, 80, 0.5));
});

test("Reverse-lay: 2 pumps -> per-pump = single * 1/4", () => {
  const r = computeReverseLayFriction(reverseLayExample.inputs);
  assert.ok(close(r.per_pump_psi, r.single_pump_psi / 4, 0.01));
});

test("Reverse-lay: 1 pump -> per-pump equals single", () => {
  const r = computeReverseLayFriction({ ...reverseLayExample.inputs, n_pumps: 1 });
  assert.ok(close(r.per_pump_psi, r.single_pump_psi));
});

test("Reverse-lay: 4 pumps -> per-pump = single / 16", () => {
  const r = computeReverseLayFriction({ ...reverseLayExample.inputs, n_pumps: 4 });
  assert.ok(close(r.per_pump_psi, r.single_pump_psi / 16, 0.01));
});

test("Reverse-lay: unknown diameter returns error", () => {
  const r = computeReverseLayFriction({ hose_diameter: "9_in", gpm: 100, length_ft: 100 });
  assert.ok(r.error);
});

test("Reverse-lay: surfaces coefficient", () => {
  const r = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000 });
  assert.equal(r.coefficient, 0.08);
});

test("Reverse-lay: doubled GPM -> 4x friction (Q^2)", () => {
  const a = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 500, length_ft: 1000 });
  const b = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000 });
  assert.ok(close(b.single_pump_psi, 4 * a.single_pump_psi, 0.05));
});

test("Reverse-lay: doubled length -> 2x friction", () => {
  const a = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 500 });
  const b = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000 });
  assert.ok(close(b.single_pump_psi, 2 * a.single_pump_psi, 0.05));
});

test("Reverse-lay: n_pumps clamps to 1 minimum", () => {
  const r = computeReverseLayFriction({ ...reverseLayExample.inputs, n_pumps: 0 });
  assert.equal(r.n_pumps, 1);
});

test("Reverse-lay: 5 in lower friction than 2.5 in same GPM/length", () => {
  const small = computeReverseLayFriction({ hose_diameter: "2.5_in", gpm: 250, length_ft: 200 });
  const big = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 250, length_ft: 200 });
  assert.ok(big.single_pump_psi < small.single_pump_psi);
});

// --- Utility 101: Sprinkler Density ---

test("Sprinkler: example yields 300 gpm at ordinary_2", () => {
  const r = computeSprinklerDensity(sprinklerDensityExample.inputs);
  assert.ok(close(r.total_gpm, 300));
});

test("Sprinkler: explicit density overrides hazard", () => {
  const r = computeSprinklerDensity({ area_of_operation_ft2: 1000, density_gpm_per_ft2: 0.25, hazard_category: "light" });
  assert.equal(r.total_gpm, 250);
  assert.equal(r.density_gpm_per_ft2, 0.25);
});

test("Sprinkler: zero area returns error", () => {
  const r = computeSprinklerDensity({ area_of_operation_ft2: 0, hazard_category: "light" });
  assert.ok(r.error);
});

test("Sprinkler: missing density and category returns error", () => {
  const r = computeSprinklerDensity({ area_of_operation_ft2: 1000 });
  assert.ok(r.error);
});

test("Sprinkler: hazard minimum surfaced", () => {
  const r = computeSprinklerDensity({ area_of_operation_ft2: 1500, hazard_category: "ordinary_2" });
  assert.equal(r.hazard_minimum_density, 0.20);
});

test("Sprinkler: meets_minimum true for matching density", () => {
  const r = computeSprinklerDensity({ area_of_operation_ft2: 1500, hazard_category: "ordinary_2" });
  assert.equal(r.meets_minimum, true);
});

test("Sprinkler: meets_minimum false when below", () => {
  const r = computeSprinklerDensity({ area_of_operation_ft2: 1500, density_gpm_per_ft2: 0.10, hazard_category: "ordinary_2" });
  assert.equal(r.meets_minimum, false);
});

test("Sprinkler: 5 hazard categories", () => {
  assert.equal(Object.keys(SPRINKLER_HAZARD_MIN_DENSITY).length, 5);
});

test("Sprinkler: extra_2 stricter than light", () => {
  assert.ok(SPRINKLER_HAZARD_MIN_DENSITY.extra_2 > SPRINKLER_HAZARD_MIN_DENSITY.light);
});

test("Sprinkler: doubled area doubles total_gpm", () => {
  const a = computeSprinklerDensity({ area_of_operation_ft2: 750, hazard_category: "ordinary_1" });
  const b = computeSprinklerDensity({ area_of_operation_ft2: 1500, hazard_category: "ordinary_1" });
  assert.ok(close(b.total_gpm, 2 * a.total_gpm));
});

// --- Utility 102: Standpipe Friction ---

test("Standpipe: example positive total", () => {
  const r = computeStandpipeFriction(standpipeExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.total_psi > 0);
});

test("Standpipe: 100 ft riser -> 43.4 psi elevation", () => {
  const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 250 });
  assert.ok(close(r.elevation_psi, 43.4, 0.01));
});

test("Standpipe: zero height returns error", () => {
  const r = computeStandpipeFriction({ riser_height_ft: 0, outlet_count: 1, gpm_per_outlet: 250 });
  assert.ok(r.error);
});

test("Standpipe: zero outlets returns error", () => {
  const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 0, gpm_per_outlet: 250 });
  assert.ok(r.error);
});

test("Standpipe: zero gpm returns error", () => {
  const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 0 });
  assert.ok(r.error);
});

test("Standpipe: more outlets -> more friction", () => {
  const a = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 250 });
  const b = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 3, gpm_per_outlet: 250 });
  assert.ok(b.friction_total_psi > a.friction_total_psi);
});

test("Standpipe: friction_total = per_outlet * outlet_count", () => {
  const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 4, gpm_per_outlet: 250 });
  assert.ok(close(r.friction_total_psi, r.per_outlet_psi * 4, 0.001));
});

test("Standpipe: total = elevation + friction", () => {
  const r = computeStandpipeFriction(standpipeExample.inputs);
  assert.ok(close(r.total_psi, r.elevation_psi + r.friction_total_psi, 0.001));
});

test("Standpipe: doubled height doubles elevation", () => {
  const a = computeStandpipeFriction({ riser_height_ft: 50, outlet_count: 1, gpm_per_outlet: 250 });
  const b = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 250 });
  assert.ok(close(b.elevation_psi, 2 * a.elevation_psi));
});

test("Standpipe: unknown hose diameter returns error", () => {
  const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 250, hose_diameter: "9_in" });
  assert.ok(r.error);
});

// --- Utility 103: Ladder Pipe Reach ---

test("Ladder pipe: example yields positive total horizontal", () => {
  const r = computeLadderPipeReach(ladderPipeExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.horizontal_total_ft > 0);
});

test("Ladder pipe: horizontal_total = ladder + stream forward", () => {
  const r = computeLadderPipeReach(ladderPipeExample.inputs);
  assert.ok(close(r.horizontal_total_ft, r.horizontal_ladder_ft + r.horizontal_stream_ft, 0.001));
});

test("Ladder pipe: 90 deg ladder vertical only", () => {
  const r = computeLadderPipeReach({ angle_deg: 90, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(close(r.horizontal_ladder_ft, 0, 0.001));
});

test("Ladder pipe: 0 deg ladder horizontal only", () => {
  const r = computeLadderPipeReach({ angle_deg: 0, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(close(r.vertical_ladder_ft, 0, 0.001));
  assert.ok(close(r.horizontal_ladder_ft, 100, 0.001));
});

test("Ladder pipe: unknown nozzle returns error", () => {
  const r = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "blowtorch", nozzle_pressure_psi: 80 });
  assert.ok(r.error);
});

test("Ladder pipe: stream_reach equals master-stream typical at base pressure", () => {
  const r = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(close(r.stream_reach_ft, 100));
});

test("Ladder pipe: higher pressure -> more stream reach", () => {
  const a = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  const b = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 120 });
  assert.ok(b.stream_reach_ft > a.stream_reach_ft);
});

test("Ladder pipe: forward stream is < total stream reach (cos 30 < 1)", () => {
  const r = computeLadderPipeReach(ladderPipeExample.inputs);
  assert.ok(r.horizontal_stream_ft < r.stream_reach_ft);
});

test("Ladder pipe: longer extension -> more horizontal ladder", () => {
  const a = computeLadderPipeReach({ angle_deg: 60, extension_ft: 50, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  const b = computeLadderPipeReach({ angle_deg: 60, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(b.horizontal_ladder_ft > a.horizontal_ladder_ft);
});

test("Ladder pipe: vertical_ladder = L * sin", () => {
  const r = computeLadderPipeReach({ angle_deg: 30, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(close(r.vertical_ladder_ft, 50, 0.5));
});

// --- Utility 104: Braking Distance ---

test("Braking: 55 mph mu=0.7 -> ~144 ft braking", () => {
  const r = computeBrakingDistance(brakingExample.inputs);
  assert.ok(r.braking_distance_ft > 130 && r.braking_distance_ft < 160);
});

test("Braking: doubled speed quadruples distance (v^2)", () => {
  const a = computeBrakingDistance({ speed_mph: 30, friction_coefficient: 0.7 });
  const b = computeBrakingDistance({ speed_mph: 60, friction_coefficient: 0.7 });
  assert.ok(close(b.braking_distance_ft, 4 * a.braking_distance_ft, 0.01));
});

test("Braking: lower friction -> longer braking", () => {
  const a = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.7 });
  const b = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.3 });
  assert.ok(b.braking_distance_ft > a.braking_distance_ft);
});

test("Braking: downhill grade increases distance", () => {
  const flat = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.7, grade_percent: 0 });
  const down = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.7, grade_percent: -10 });
  assert.ok(down.braking_distance_ft > flat.braking_distance_ft);
});

test("Braking: uphill grade reduces distance", () => {
  const flat = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.7, grade_percent: 0 });
  const up = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.7, grade_percent: 10 });
  assert.ok(up.braking_distance_ft < flat.braking_distance_ft);
});

test("Braking: zero speed returns error", () => {
  const r = computeBrakingDistance({ speed_mph: 0, friction_coefficient: 0.7 });
  assert.ok(r.error);
});

test("Braking: zero friction returns error", () => {
  const r = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0 });
  assert.ok(r.error);
});

test("Braking: reaction distance = v * 1.467 * t", () => {
  const r = computeBrakingDistance({ speed_mph: 60, friction_coefficient: 0.7, reaction_time_s: 1.5 });
  assert.ok(close(r.reaction_distance_ft, 60 * 1.467 * 1.5, 0.01));
});

test("Braking: total = braking + reaction", () => {
  const r = computeBrakingDistance(brakingExample.inputs);
  assert.ok(close(r.total_distance_ft, r.braking_distance_ft + r.reaction_distance_ft));
});

test("Braking: extreme downhill on ice returns error", () => {
  const r = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.05, grade_percent: -20 });
  assert.ok(r.error);
});
