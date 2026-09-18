// The well, lift-station and distribution tiles of calc-water.js (spec-v1588..
// v1590, v1605..v1607) against references the specs did not write: Jacob's
// step-drawdown model recovered from synthetic data, the wet-well cycle
// minimised by brute force, the 0.0408 and 2.448 pipe constants derived, and
// the identities the tiles' notes claim. These tiles' only worked-example rows
// recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStepDrawdownEfficiency, computeWellCasingPurgeVolume, computeConstantPressureWellVfd,
  computeWetWellCycleTime, computeMainFlushingVolume, computePressureZoneHgl,
} from "../../calc-water.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- independent references ----

test("step drawdown: Jacob's s = B Q + C Q^2 is recovered exactly from drawdowns it generated", () => {
  const B = 0.03, C = 0.00004;
  const s = (q) => B * q + C * q * q;
  const r = computeStepDrawdownEfficiency({ q1_gpm: 300, s1_ft: s(300), q2_gpm: 600, s2_ft: s(600), q3_gpm: 900, s3_ft: s(900), operating_gpm: 900, efficiency_threshold_pct: 65, previous_efficiency_pct: 84 });
  close(r.b_ft_per_gpm, B, "aquifer loss coefficient");
  close(r.c_ft_per_gpm2, C, "well loss coefficient");
  close(r.aquifer_loss_ft, B * 900, "aquifer loss at 900 gpm");
});

test("wet well: the worst inflow is half the pump rate, and the cycle there is 4 V / Q", () => {
  // Cycle time t(I) = V / I + V / (Q - I); scan I for the shortest cycle.
  const r = computeWetWellCycleTime({ pump_gpm: 250, well_diameter_ft: 6, min_cycle_minutes: 10, max_starts_per_hour: 0, inflow_gpm: 125 });
  const V = r.active_volume_gal;
  let bestI = 0, bestT = Infinity;
  for (let I = 1; I < 250; I += 0.01) {
    const t = V / I + V / (250 - I);
    if (t < bestT) { bestT = t; bestI = I; }
  }
  within(bestI, r.worst_case_inflow_gpm, 0.01, "worst inflow");
  within(bestT, 10, 1e-6, "the shortest cycle is the minimum cycle");
  close(r.level_differential_ft, V / (Math.PI * 9 * 1728 / 231), "level band");
});

test("pipe constants: 0.0408 gal per ft per sq in, and 2.448 gpm per sq in per ft/s", () => {
  within(Math.PI / 4 / 144 * 1728 / 231, 0.0408, 0.01, "gal/ft");
  within(Math.PI / 4 / 144 * 1728 / 231 * 60, 2.448, 0.01, "gpm");
  const w = computeWellCasingPurgeVolume({ casing_diameter_in: 6, well_depth_ft: 280, static_water_level_ft: 90, purge_volumes: 3, purge_rate_gpm: 15, target_dose_mg_l: 100, solution_strength_pct: 12.5, solution_lb_per_gal: 10 });
  close(w.casing_volume_gal, 0.0408 * 36 * 190, "standing column");
  close(w.chlorine_lb, w.casing_volume_gal / 1e6 * 8.34 * 100, "the pounds formula");
});

// ---- identities the notes claim ----

test("VFD: friction goes as flow squared, and head as speed squared", () => {
  const r = computeConstantPressureWellVfd({ static_lift_ft: 180, friction_at_design_ft: 25, design_flow_gpm: 20, setpoint_psi: 50, reduced_flow_gpm: 5, full_speed_rpm: 3450, drawdown_at_design_ft: 40, pump_max_head_ft: 340 });
  close(r.friction_at_reduced_ft, 25 / 16, "a quarter of the flow");
  close((r.speed_at_reduced_rpm / 3450) ** 2, r.head_at_reduced_ft / r.head_at_design_ft, "affinity");
});

test("flushing: the duration discharges the pipe volumes at the required flow", () => {
  const r = computeMainFlushingVolume({ main_diameter_in: 8, run_length_ft: 1200, target_velocity_fps: 3, pipe_volumes: 3, available_flow_gpm: 0, hydrant_outlets: 1, outlet_capacity_gpm: 500 });
  close(r.duration_min * r.required_gpm, r.total_discharged_gal, "volume");
  close(r.achieved_velocity_fps * 2.448 * 64, 500, "one outlet's velocity");
});

test("HGL: pressure is 0.433 psi per foot below the grade line, and the band spans the pressure range", () => {
  const r = computePressureZoneHgl({ hgl_ft: 780, service_elevation_ft: 620, min_pressure_psi: 40, max_pressure_psi: 80, service_relief_ft: 250, fire_flow_friction_ft: 35 });
  close(r.static_psi, 160 * 0.433, "static");
  close(r.elevation_band_ft, 40 / 0.433, "40 psi of band");
  assert.equal(r.zones_required, Math.ceil(250 / r.elevation_band_ft));
});
