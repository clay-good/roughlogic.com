// calc-telecom.js (spec-v1837..v1844) against references the specs did not
// write: splice losses from numeric Gaussian overlap integrals rather than
// their closed forms, the Fresnel reflection of a cleaved end, the published
// dispersion rule of thumb, and the balances the tiles' notes claim. The
// worked-example fixture recomputes each spec's own example, so an error a
// spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeOtdrEventDistance, computeChromaticDispersionReach, computeFiberSlackStorage,
  computePonSplitLossBudget, computeFiberStrandCountPlanning, computeOpticalReturnLoss,
  computeCableJettingDistance, computeSpliceLossMismatch,
} from "../../calc-telecom.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// Power coupled between two Gaussian mode fields of radius w1 and w2 whose
// centres are offset by d, by direct 2-D integration on a grid:
// eta = |integral E1 E2|^2 / (integral E1^2 x integral E2^2).
const overlapLossDb = (w1, w2, d) => {
  const E1 = (x, y) => Math.exp(-(x * x + y * y) / (w1 * w1));
  const E2 = (x, y) => Math.exp(-((x - d) * (x - d) + y * y) / (w2 * w2));
  const span = 4 * Math.max(w1, w2) + d, n = 400, h = 2 * span / n;
  let cross = 0, a = 0, b = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = -span + i * h, y = -span + j * h;
      const e1 = E1(x, y), e2 = E2(x, y);
      cross += e1 * e2; a += e1 * e1; b += e2 * e2;
    }
  }
  return -10 * Math.log10(cross * cross / (a * b));
};

const spliceBase = { mfd_1_um: 9.2, mfd_2_um: 8.6, lateral_offset_um: 1, cleave_angle_deg: 1, wavelength_nm: 1550, fiber_index: 1.468 };

// ---- independent references ----

test("splice: mode-field mismatch and lateral offset match a numeric overlap integral", () => {
  const r = computeSpliceLossMismatch({ ...spliceBase, lateral_offset_um: 0 });
  within(r.mfd_mismatch_loss_db, overlapLossDb(4.6, 4.3, 0), 0.5, "MFD mismatch");
  const off = computeSpliceLossMismatch({ ...spliceBase, mfd_2_um: 9.2, lateral_offset_um: 1 });
  within(off.lateral_offset_loss_db, overlapLossDb(4.6, 4.6, 1), 0.5, "1 um offset");
  within(off.lateral_2um_loss_db, overlapLossDb(4.6, 4.6, 2), 0.5, "2 um offset");
});

test("Fresnel: a cleaved glass end in air reflects ((n - 1) / (n + 1))^2, about 3.6% or -14.4 dB", () => {
  const r = computeOpticalReturnLoss({ connector_count: 4, connector_reflectance_db: -50, unmated_end_count: 1, fiber_index: 1.468, required_orl_db: 32, apc_reflectance_db: -60 });
  within(r.fresnel_reflectance_pct, 3.596, 0.1, "reflectance");
  within(r.fresnel_reflectance_db, -14.45, 0.1, "in dB");
  // N equal reflections add in linear power: ORL = -R - 10 log10 N.
  close(r.connector_only_orl_db, 50 - 10 * Math.log10(4), "four -50 dB connectors");
});

test("dispersion: the D L B^2 = 10^5 rule gives the familiar 59 km at 10 Gb/s on standard fiber", () => {
  const r = computeChromaticDispersionReach({ dispersion_ps_nm_km: 17, span_km: 80, bit_rate_gbps: 10, spectral_width_nm: 0.1, lower_bit_rate_gbps: 2.5, higher_bit_rate_gbps: 40 });
  within(r.reach_km, 58.8, 0.1, "10 Gb/s");
  close(r.lower_rate_reach_km / r.reach_km, 16, "a quarter of the rate, sixteen times the reach");
  close(r.pulse_spread_ps, 17 * 80 * 0.1, "D L delta-lambda");
});

test("OTDR: distance is c t / 2n, and the index error scales the reading", () => {
  const r = computeOtdrEventDistance({ round_trip_time_us: 50, entered_group_index: 1.4682, true_group_index: 1.47, excess_fiber_pct: 1, slack_per_splice_ft: 49.87, splice_points: 5, comparison_span_km: 40 });
  close(r.corrected_distance_m, 299792458 * 50e-6 / (2 * 1.47), "c t / 2n");
  close(r.entered_distance_m / r.corrected_distance_m, 1.47 / 1.4682, "index ratio");
  // A displayed 40 km at the entered index is 40 x 1.4682 / 1.47 km of fiber.
  close(r.comparison_error_m, 40000 - 40000 * 1.4682 / 1.47, "40 km comparison");
});

// ---- balances the notes claim ----

test("PON: an ideal 1:N splitter loses 10 log10 N, and doubling the split costs 3 dB", () => {
  const r = computePonSplitLossBudget({ class_budget_db: 28, split_ratio: 32, splitter_excess_db: 2.5, connector_count: 4, connector_loss_db: 0.5, splice_count: 6, splice_loss_db: 0.1, attenuation_db_km: 0.35, design_margin_db: 0, alternative_split_ratio: 64 });
  within(r.ideal_splitter_loss_db, 15.05, 0.1, "1:32");
  close(r.split_loss_delta_db, 10 * Math.log10(2), "1:64");
  close(r.reach_km * 0.35, 28 - r.splitter_loss_db - 2 - 0.6, "fiber gets what is left");
});

test("slack: one splice between every pair of reels, and the order covers the route", () => {
  const r = computeFiberSlackStorage({ route_length_ft: 52800, usable_reel_length_ft: 12000, slack_per_splice_ft: 100, terminal_slack_ft: 100, waste_pct: 5, restoration_slack_each_side_ft: 60 });
  assert.equal(r.splice_points, 4);
  close(r.cable_to_order_ft, (52800 + 400 + 200) * 1.05, "order");
});

test("strand count: the selected cable is the smallest standard count that holds the spares", () => {
  const r = computeFiberStrandCountPlanning({ living_units: 2000, split_ratio: 32, terminal_ports: 8, spare_pct: 25, standard_counts: "12,24,48,72,96,144,216,288,432", route_length_ft: 52800, lower_material_cost_per_ft: 1.5, selected_material_cost_per_ft: 1.8, placement_cost_per_ft: 8 });
  assert.equal(r.feeder_fibers_required, 63);
  assert.equal(r.feeder_with_spare, 79);
  assert.equal(r.selected_standard_count, 96);
  close(r.installed_cost_delta, 52800 * 0.3, "only the material differs");
});

test("jetting: fill is the area ratio, and free air is duct air times absolute pressure", () => {
  const r = computeCableJettingDistance({ duct_id_mm: 10, cable_od_mm: 8.5, fill_min_pct: 40, fill_max_pct: 60, optimal_fill_pct: 50, air_velocity_m_s: 25, pressure_bar_absolute: 10 });
  close(r.fill_ratio_pct, 72.25, "(8.5 / 10)^2");
  assert.equal(r.fill_status, "ABOVE WINDOW");
  close(r.duct_air_l_min, Math.PI / 4 * (100 - 72.25) * 1e-6 * 25 * 60000, "m^3/s to L/min");
  close(r.free_air_l_min, 10 * r.duct_air_l_min, "Boyle");
  close(r.optimal_cable_od_mm, 10 * Math.sqrt(0.5), "50% fill");
});
