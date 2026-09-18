// calc-marine.js (spec-v1828..v1836) against references the specs did not
// write: the limits HEC-18 and the Shore Protection Manual place on their own
// relations, Rankine's coefficients, and the balances the tiles' notes claim.
// The worked-example fixture recomputes each spec's own example, so an error a
// spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDredgeProductionRate, computeSlurryCriticalVelocity, computeBargeDraftDisplacement,
  computeSheetPilePenetration, computePileHammerBearing, computeBerthingFenderEnergy,
  computeMooringLoadWindCurrent, computePierScourDepth, computeWaveHeightFetch,
} from "../../calc-marine.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const scourBase = { pier_width_ft: 6, pier_length_ft: 36, flow_depth_ft: 15, velocity_fps: 8, nose_shape_factor: 1.0, bed_condition_factor: 1.1, angle_of_attack_deg: 30, wider_pier_width_ft: 12, foundation_margin_ft: 2 };

// ---- the limits the references place on their own relations ----

test("HEC-18: a round-nosed pier aligned with the flow scours no deeper than 2.4 widths at Fr <= 0.8, 3.0 above", () => {
  // A 1 ft pile in 30 ft of water: the unbounded relation gives 4.4 ft.
  const deep = computePierScourDepth({ ...scourBase, pier_width_ft: 1, pier_length_ft: 1, flow_depth_ft: 30, velocity_fps: 10, angle_of_attack_deg: 0, wider_pier_width_ft: 2 });
  assert.ok(deep.froude_number <= 0.8);
  close(deep.scour_depth_ft, 2.4, "Fr <= 0.8");
  assert.equal(deep.aligned_limited, true);
  const fast = computePierScourDepth({ ...scourBase, pier_width_ft: 1, pier_length_ft: 1, flow_depth_ft: 4, velocity_fps: 14, angle_of_attack_deg: 0, wider_pier_width_ft: 2 });
  assert.ok(fast.froude_number > 0.8);
  assert.ok(fast.scour_depth_ft <= 3.0 + 1e-12);
  // The worked example sits well inside the limit and is unchanged.
  const worked = computePierScourDepth(scourBase);
  assert.equal(worked.aligned_limited, false);
  within(worked.scour_depth_ft, 2 * 1.1 * 15 * Math.pow(6 / 15, 0.65) * Math.pow(8 / Math.sqrt(32.2 * 15), 0.43), 1e-9, "HEC-18 eq 7.1");
});

test("HEC-18: past 5 degrees of skew K1 is 1.0, and L/a enters K2 at no more than 12", () => {
  const square = computePierScourDepth({ ...scourBase, nose_shape_factor: 1.1 });
  const round = computePierScourDepth(scourBase);
  close(square.skewed_scour_ft, round.skewed_scour_ft, "K1 drops out of the skewed case");
  const long = computePierScourDepth({ ...scourBase, pier_length_ft: 6 * 20 });
  const twelve = computePierScourDepth({ ...scourBase, pier_length_ft: 6 * 12 });
  close(long.skewed_scour_ft, twelve.skewed_scour_ft, "L/a held at 12");
  close(twelve.angle_factor, Math.pow(Math.cos(Math.PI / 6) + 12 * 0.5, 0.65), "K2");
  // Under 5 degrees the nose shape still counts.
  const slight = computePierScourDepth({ ...scourBase, nose_shape_factor: 1.1, angle_of_attack_deg: 4 });
  const slightRound = computePierScourDepth({ ...scourBase, angle_of_attack_deg: 4 });
  close(slight.skewed_scour_ft / slightRound.skewed_scour_ft, 1.1, "K1 below 5 degrees");
});

test("SPM: fetch-limited growth stops at a fully developed sea", () => {
  // A 20 mph wind over 500 miles: the square-root law alone gives 4.8 m.
  const r = computeWaveHeightFetch({ wind_speed_mph: 20, fetch_mi: 500, alternative_fetch_mi: 1000, alternative_wind_speed_mph: 30 });
  assert.equal(r.fully_developed, true);
  close(r.wave_height_m, 0.2433 * r.adjusted_wind_ms ** 2 / 9.81, "gH / U_A^2 = 0.2433");
  close(r.peak_period_s, 8.134 * r.adjusted_wind_ms / 9.81, "gT / U_A = 8.134");
  close(r.alternative_fetch_height_ft, r.wave_height_ft, "more fetch adds nothing");
  // The worked enclosed-water case is fetch-limited and follows the growth law.
  const w = computeWaveHeightFetch({ wind_speed_mph: 40, fetch_mi: 5, alternative_fetch_mi: 10, alternative_wind_speed_mph: 60 });
  assert.equal(w.fully_developed, false);
  close(w.alternative_fetch_height_ft / w.wave_height_ft, Math.SQRT2, "height as the square root of fetch");
  // SPM 1984 eq 3-33: U_A = 0.71 U^1.23 with U in m/s.
  close(w.adjusted_wind_ms, 0.71 * Math.pow(40 * 0.44704, 1.23), "adjusted wind");
});

test("Rankine: Ka x Kp = 1, and Ka is one-third at 30 degrees", () => {
  const r = computeSheetPilePenetration({ retained_height_ft: 12, friction_angle_deg: 30, unit_weight_pcf: 120, increase_factor_pct: 30, allowable_stress_psi: 30000 });
  within(r.ka, 1 / 3, 1e-9, "Ka");
  within(r.kp, 3, 1e-9, "Kp");
  close(r.ka * r.kp, 1, "reciprocal");
  // The toe moment balances at the theoretical depth (spec-v1831's
  // net-pressure simplification), and shear is zero at the maximum moment.
  const D = r.theoretical_depth_ft;
  within(r.net_passive_rate / 6 * D ** 3, r.active_force_plf * (D + 4), 1e-9, "toe moments");
  close(r.net_passive_rate * r.depth_to_max_moment_ft ** 2 / 2, r.active_force_plf, "zero shear");
});

// ---- balances the notes claim ----

test("dredge: in-situ production is the solids over one minus the porosity", () => {
  const r = computeDredgeProductionRate({ pipe_diameter_in: 24, velocity_fps: 16, concentration_pct: 15, porosity: 0.4, solids_specific_gravity: 2.65, effective_hours: 18, alternative_concentration_pct: 20 });
  close(r.flow_cfs, Math.PI * 16, "a 2 ft pipe at 16 ft/s");
  close(r.production_cy_per_hr * 0.6, r.solids_cy_per_hr, "porosity");
  close(r.slurry_specific_gravity, 1 + 0.15 * 1.65, "mixture");
});

test("Durand: the critical velocity is F_L sqrt(2 g D (S - 1)) and goes as the root of the diameter", () => {
  const r = computeSlurryCriticalVelocity({ pipe_diameter_in: 24, solids_specific_gravity: 2.65, durand_coefficient: 1.34, operating_velocity_fps: 16, coarser_coefficient: 1.5, coarsest_coefficient: 1.34, upsized_diameter_in: 30 });
  close(r.critical_velocity_fps, 1.34 * Math.sqrt(2 * 32.2 * 2 * 1.65), "Durand");
  close(r.upsized_critical_velocity_fps / r.critical_velocity_fps, Math.sqrt(30 / 24), "diameter");
});

test("barge: the cargo is the draft change times the tons per inch", () => {
  const r = computeBargeDraftDisplacement({ barge_length_ft: 195, beam_ft: 35, depth_ft: 12, block_coefficient: 0.9, light_draft_ft: 1.5, loaded_draft_ft: 9, water_density_pcf: 62.4, fresh_water_density_pcf: 62.4 });
  close(r.cargo_tons, r.tons_per_inch * 7.5 * 12, "tons per inch");
  close(r.loaded_displacement_tons * 2000, 195 * 35 * 0.9 * 9 * 62.4, "Archimedes");
  const salt = computeBargeDraftDisplacement({ barge_length_ft: 195, beam_ft: 35, depth_ft: 12, block_coefficient: 0.9, light_draft_ft: 1.5, loaded_draft_ft: 9, water_density_pcf: 64, fresh_water_density_pcf: 62.4 });
  close(salt.fresh_water_draft_ft, 9 * 64 / 62.4, "the same weight of a lighter fluid");
});

test("ENR: the set that delivers the capacity gives that capacity back", () => {
  const r = computePileHammerBearing({ hammer_energy_ftlb: 42000, loss_constant_in: 0.1, required_capacity_tons: 100, refusal_blows_per_inch: 10, loose_set_in: 1, embedded_safety_factor: 6 });
  close(2 * 42000 / (r.set_in + 0.1), 200000, "R = 2E / (s + c)");
});

test("berthing and mooring: energy goes as the velocity squared, and line load as 1 / cos of the angle", () => {
  const b = computeBerthingFenderEnergy({ displacement_tons: 3000, approach_velocity_fps: 0.5, virtual_mass_factor: 1.5, eccentricity_factor: 0.5, softness_factor: 1, configuration_factor: 1, fender_rating_ftlb: 20000, alternative_velocity_fps: 1 });
  close(b.kinetic_energy_ftlb, 0.5 * (3000 * 2000 / 32.2) * 0.25, "1/2 M V^2");
  close(b.alternative_energy_ratio, 4, "twice the speed");
  const m = computeMooringLoadWindCurrent({ wind_area_ft2: 2000, wind_drag_coefficient: 1.3, wind_speed_mph: 50, submerged_area_ft2: 1500, current_drag_coefficient: 1, current_speed_knots: 2, line_count: 4, line_angle_deg: 60, worst_line_share_pct: 40, safety_factor: 3 });
  close(m.current_speed_fps, 2 * 1852 / (0.3048 * 3600), "knots");
  close(m.load_per_line_lb * 4 * 0.5, m.total_force_lb, "cos 60 = 1/2");
  close(m.wind_force_lb, 0.00256 * 1.3 * 2000 * 2500, "0.00256 V^2");
});
