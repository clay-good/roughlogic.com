// calc-warehouse.js (spec-v1809..v1817) against references the specs did not
// write: the beam's deflection by virtual work rather than the handbook
// formula, the AISC column curve the Euler trend is disclosed against, and the
// balances the tiles' notes claim. The worked-example fixture recomputes each
// spec's own example, so an error a spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePalletRackBeamCapacity, computeRackUprightCapacityDerate, computeRackBasePlateAnchorage,
  computeStackingAisleWidth, computeWarehouseCubeUtilization, computeDockLevelerSlope,
  computeRackFlueSpace, computeDockDoorCountThroughput, computeOrderPickLaborStandard,
} from "../../calc-warehouse.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const beamBase = { span_in: 108, pallet_weight_lb: 2500, pallets_per_level: 2, moment_of_inertia_in4: 2.5, section_modulus_in3: 1.111, yield_strength_psi: 55000, deflection_limit_ratio: 180 };

// ---- independent references ----

test("rack beam: midspan deflection by virtual work matches the tile", () => {
  // Two loads P at the quarter points of a simple span; a unit load at
  // midspan gives m(x) = x / 2. delta = integral of M m / (E I), by Simpson's
  // rule on 2,000 panels -- no handbook formula involved.
  const r = computePalletRackBeamCapacity(beamBase);
  const L = 108, P = 1250, a = L / 4, EI = 29e6 * 2.5;
  const M = (x) => (x <= a ? P * x : x <= L - a ? P * a : P * (L - x));
  const m = (x) => (x <= L / 2 ? x / 2 : (L - x) / 2);
  const n = 2000, h = L / n;
  let s = 0;
  for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * M(i * h) * m(i * h);
  within(r.deflection_in, s * h / 3 / EI, 1e-6, "virtual work");
  close(r.deflection_in, 11 * P * L ** 3 / (384 * EI), "11 P L^3 / 384 EI at the quarter points");
  close(r.moment_in_lb, P * a, "M = P a");
  close(r.allowable_stress_psi, 55000 / 1.67, "ASD bending");
});

test("rack upright: the Euler ratio is the square of the length ratio, and the disclosed AISC figure holds", () => {
  const r = computeRackUprightCapacityDerate({ beam_spacing_in: 48, column_moment_of_inertia_in4: 0.6, effective_length_factor: 1, loaded_levels: 3, load_per_level_lb: 5000, rated_frame_capacity_lb: 24000 });
  close(r.euler_capacity_lb, Math.PI ** 2 * 29e6 * 0.6 / 48 ** 2, "Euler");
  close(r.removed_capacity_ratio, 0.25, "doubling the length");
  // The citation's disclosure: on the AISC 360 E3 curve (Fy 50 ksi), KL/r 50
  // doubled to 100 loses about 42%, not the Euler 75%.
  const fcr = (slenderness) => {
    const fe = Math.PI ** 2 * 29000 / slenderness ** 2;
    return 50 / fe <= 2.25 ? Math.pow(0.658, 50 / fe) * 50 : 0.877 * fe;
  };
  within(1 - fcr(100) / fcr(50), 0.42, 1, "inelastic loss");
});

// ---- balances the notes claim ----

test("base plate: the uplift is what the frame's weight cannot resist about the far leg", () => {
  const r = computeRackBasePlateAnchorage({ frame_weight_lb: 15000, frame_depth_in: 42, top_beam_height_ft: 20, lateral_force_coefficient: 0.2, effective_height_fraction: 0.666667, allowable_anchor_tension_lb: 1800, base_plate_holes: 2, improved_anchor_tension_lb: 2800 });
  close(r.overturning_moment_ftlb, 3000 * 20 * 0.666667, "overturning");
  close(r.resisting_moment_ftlb, 15000 * 1.75, "W d / 2");
  close(r.net_uplift_lb * 3.5, r.overturning_moment_ftlb - r.resisting_moment_ftlb, "uplift");
  assert.ok(r.anchors_required * 1800 >= r.net_uplift_lb);
});

test("aisles: a module is two rack rows and an aisle, and the modules fit the building", () => {
  const r = computeStackingAisleWidth({ load_length_in: 48, operating_clearance_in: 6, counterbalanced_turning_radius_in: 78, counterbalanced_load_center_in: 14, reach_turning_radius_in: 55, reach_load_center_in: 8, turret_clearance_in: 12, rack_row_depth_in: 42, building_width_ft: 300 });
  close(r.counterbalanced_module_in, 84 + r.counterbalanced_aisle_in, "module");
  for (const [n, mod] of [[r.counterbalanced_modules, r.counterbalanced_module_in], [r.reach_modules, r.reach_module_in], [r.turret_modules, r.turret_module_in]]) {
    assert.ok(n * mod <= 3600 && (n + 1) * mod > 3600);
  }
  close(r.reach_share_of_turret_gain_pct * (r.turret_modules - r.counterbalanced_modules), 100 * (r.reach_modules - r.counterbalanced_modules), "share of the gain");
});

test("cube: positions times the pallet's cube is the occupied cube", () => {
  const r = computeWarehouseCubeUtilization({ building_width_ft: 300, building_depth_ft: 400, clear_height_ft: 32, module_pitch_in: 201, rack_row_depth_in: 42, rack_run_length_ft: 360, bays_per_row: 40, levels_per_bay: 6, pallets_per_bay_level: 2, pallet_width_in: 48, pallet_depth_in: 40, pallet_loaded_height_in: 50, beam_pitch_in: 58 });
  close(r.pallet_cube_ft3, 48 * 40 * 50 / 1728, "pallet");
  close(r.occupied_cube_ft3, r.pallet_positions * r.pallet_cube_ft3, "occupied");
  close(r.aisle_floor_share_pct + r.rack_floor_share_pct + r.other_floor_share_pct, 100, "floor adds up");
});

test("dock leveler: the grade is the height difference over the length, either way", () => {
  const r = computeDockLevelerSlope({ dock_height_in: 48, low_bed_height_in: 40, high_bed_height_in: 56, leveler_length_ft: 6, service_range_in: 12, grade_guideline_pct: 10, longer_leveler_length_ft: 10, outlier_bed_height_in: 36 });
  close(r.low_grade_pct, 100 * 8 / 72, "below the dock");
  close(r.high_grade_pct, r.low_grade_pct, "above the dock, same magnitude");
  close(r.outlier_longer_grade_pct, 100 * 12 / 120, "a longer leveler");
});

test("flue space: the beam holds the pallets and every transverse gap", () => {
  const r = computeRackFlueSpace({ pallet_width_in: 48, pallet_depth_in: 48, pallets_per_bay: 2, transverse_gaps: 3, nominal_flue_in: 6, beam_length_in: 108, frame_depth_in: 42, back_to_back_spacing_in: 12, deeper_load_depth_in: 52 });
  close(r.pallet_run_in + r.transverse_gap_total_in, 108, "beam length");
  close(r.required_beam_length_in, 96 + 18, "pallets plus nominal flues");
  close(r.longitudinal_flue_in, 12 - 2 * 3, "overhang eats the flue from both sides");
});

test("dock doors: the doors required carry the peak at the stated utilisation", () => {
  const r = computeDockDoorCountThroughput({ trucks_per_day: 60, operating_hours: 10, turn_time_min: 55, utilization_pct: 65, peak_arrival_share_pct: 40, peak_window_hours: 3, improved_turn_time_min: 40 });
  assert.ok(r.peak_doors_required * 3 * 0.65 >= r.peak_door_hours);
  assert.ok((r.peak_doors_required - 1) * 3 * 0.65 < r.peak_door_hours);
  close(r.door_hours, 60 * 55 / 60, "door-hours");
});

test("pick standard: the allowed time is (picking + setup) x the PF&D factor", () => {
  const r = computeOrderPickLaborStandard({ lines_per_order: 120, units_per_line: 2.5, travel_time_s: 18, pick_time_s: 12, additional_unit_time_s: 3, setup_time_min: 8, pfd_allowance_pct: 15, batch_size: 4, batch_travel_time_s: 7 });
  close(r.handling_time_s, 12 + 1.5 * 3, "handling");
  close(r.allowed_order_time_min, (120 * (18 + 16.5) / 60 + 8) * 1.15, "allowed time");
  close(r.lines_per_hour * r.allowed_order_time_min, 120 * 60, "rate");
});
