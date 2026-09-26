// The rail tiles of calc-rail.js (spec-v1648..v1651) and the geomatics tiles of
// calc-survey.js (spec-v1652..v1655) against references the specs did not
// write: the degree-of-curve radius and chord offsets computed exactly, grade
// resistance from first principles, the pinhole-camera GSD, a lidar swath from
// its scan geometry, and the identities the tiles' notes claim. These tiles'
// only worked-example rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRailcarLoadLimit, computeTonnageRatingGrade, computeTrainBrakeReduction,
  computeClearancePlateEnvelope,
} from "../../calc-rail.js";
import {
  computeDroneGsdOverlap, computeLidarPointDensity, computeRtkErrorBudget, computeMassHaulOverhaul,
} from "../../calc-survey.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

test("curve clearance: R = 5,729.58 / D, and the chord offsets match the exact circle within 0.5%", () => {
  const r = computeClearancePlateEnvelope({ truck_centres_ft: 73, car_length_ft: 89, car_width_in: 126, degree_of_curve: 5, clearance_to_obstruction_in: 132, required_clearance_in: 6 });
  const R = 5729.578 / 5;
  // Exact sagitta of a 73 ft chord: R - sqrt(R^2 - (c/2)^2).
  within(r.mid_ordinate_ft, R - Math.sqrt(R * R - 36.5 ** 2), 0.5, "mid-ordinate");
  // Exact end throw: the body is the chord between trucks, at d = sqrt(R^2 -
  // (c/2)^2) from the centre; its end is sqrt(d^2 + (L/2)^2) from the centre.
  const d = Math.sqrt(R * R - 36.5 ** 2);
  within(r.end_overhang_ft, Math.sqrt(d * d + 44.5 ** 2) - R, 0.5, "end throw");
});

test("tonnage: 20 lb per ton per percent is a ton's weight times the grade", () => {
  within(2000 * 0.01, 20, 1e-9, "grade resistance");
  const r = computeTonnageRatingGrade({ tractive_effort_lb: 140000, ruling_grade_pct: 1.2, rolling_resistance_lb_per_ton: 3, curve_degrees: 3, weight_on_drivers_lb: 1680000, adhesion_factor: 0.3, alternate_grade_pct: 0.5 });
  close(r.tonnage_rating_tons, 140000 / (24 + 3 + 2.4), "rating");
});

test("brakes and load limits: cylinder pressure is the reduction times 2.5, and load limit is GRL less light weight", () => {
  const b = computeTrainBrakeReduction({ charged_pressure_psi: 90, reduction_psi: 30, cylinder_ratio: 2.5, full_service_reduction_psi: 26, car_count: 100, propagation_rate_cars_per_second: 10 });
  // Full service is the equalization point 90 / (1 + 2.5) = 25.71 psi, so the cylinder tops out at 64.29 psi.
  close(b.cylinder_psi, 90 * 2.5 / 3.5, "capped at equalization");
  close(b.wasted_reduction_psi, 30 - 90 / 3.5, "past equalization");
  const l = computeRailcarLoadLimit({ gross_rail_load_lb: 286000, light_weight_lb: 63000, lading_net_lb: 200000, cubic_capacity_ft3: 5200, lading_density_pcf: 30, route_gross_rail_load_lb: 263000 });
  close(l.governing_load_limit_lb, 200000, "the route governs");
});

test("drone GSD: the pinhole camera, ground sample = height x pixel pitch / focal length", () => {
  const r = computeDroneGsdOverlap({ flight_height_ft: 400, focal_length_mm: 24, pixel_pitch_um: 1.38, sensor_width_px: 8192, sensor_height_px: 5460, forward_overlap_pct: 75, side_overlap_pct: 65, area_acres: 40 });
  close(r.gsd_cm_px, 400 * 0.3048 * 1.38e-6 / 0.024 * 100, "GSD");
  close(r.line_spacing_ft, r.footprint_width_ft * 0.35, "side overlap");
});

test("lidar: the swath is 2 H tan(FOV / 2), and density is pulses over swath times speed", () => {
  const r = computeLidarPointDensity({ pulse_rate_khz: 400, scan_angle_deg: 60, flight_height_m: 120, ground_speed_ms: 45, side_overlap_pct: 20, area_acres: 500 });
  close(r.swath_width_m, 240 * Math.tan(Math.PI / 6), "swath");
  close(r.point_density_per_m2, 400000 / (r.swath_width_m * 45), "density");
  close(r.half_speed_density, 2 * r.point_density_per_m2, "half the speed");
});

test("RTK and mass haul: fixed plus ppm, and overhaul in station-yards past free haul", () => {
  const k = computeRtkErrorBudget({ baseline_km: 10, horizontal_fixed_mm: 8, horizontal_ppm: 1, vertical_fixed_mm: 15, vertical_ppm: 1, base_position_error_mm: 1500, target_vertical_mm: 30 });
  close(k.horizontal_error_mm, 18, "8 mm + 1 ppm over 10 km");
  const m = computeMassHaulOverhaul({ cut_volume_cy: 12000, shrinkage_factor: 0.9, fill_required_cy: 10800, free_haul_ft: 1000, overhaul_volume_cy: 4200, average_overhaul_distance_ft: 2600, overhaul_rate_per_station_yard: 0.85, borrow_haul_ft: 1800 });
  assert.equal(m.balanced, true);
  close(m.overhaul_station_yards, 4200 * 16, "16 stations of overhaul");
});
