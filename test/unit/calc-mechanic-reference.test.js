// The marine and aviation tiles of calc-mechanic.js (spec-v1640..v1647, v1659)
// against references the specs did not write: IBC 1807.3.2.1's embedment with
// S1 at one third of the depth (and the catalog's own pole-embedment-depth,
// which already solved it that way), the 63,025 torque constant derived, the
// torsion formula, statics on the slings, and the identities the notes claim.
// These tiles' only worked-example rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMetacentricHeight, computeMarineShaftDiameter, computeHouseBatteryAlternator,
  computeTravelLiftSlingPlacement, computeDockPilingLateral, computeControlCableTension,
  computePropellerTrackBalance, computeAviationFuelWeight, computeSprayTransferEfficiency,
} from "../../calc-mechanic.js";
import { computePoleEmbedmentDepth } from "../../calc-geotech.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const pileBase = { lateral_load_lb: 1200, height_above_mudline_ft: 6, pile_diameter_in: 12, soil_lateral_bearing_psf_per_ft: 150, scour_ft: 2, existing_embedment_ft: 10 };

// ---- independent references ----

test("dock piling: IBC 1807.3.2.1 with S1 at d/3 -- and it agrees with the catalog's pole tile", () => {
  // The tile had used the per-foot rate itself as S1 and asked 23.9 ft.
  const r = computeDockPilingLateral(pileBase);
  const S1 = 150 * r.embedment_ft / 3;
  const A = 2.34 * 1200 / (S1 * 1);
  within(r.embedment_ft, 0.5 * A * (1 + Math.sqrt(1 + 4.36 * 6 / A)), 1e-9, "fixed point");
  within(r.embedment_ft, 9.70, 0.1, "the worked pile");
  const pole = computePoleEmbedmentDepth({ lateral_force_lb: 1200, force_height_ft: 6, post_width_ft: 1, lateral_bearing_psf_per_ft: 150, constraint: "nonconstrained", isolated: "no" });
  within(r.embedment_ft, pole.embedment_ft, 1e-9, "same relation, same answer");
  const scoured = computePoleEmbedmentDepth({ lateral_force_lb: 1200, force_height_ft: 8, post_width_ft: 1, lateral_bearing_psf_per_ft: 150, constraint: "nonconstrained", isolated: "no" });
  within(r.scoured_embedment_ft, scoured.embedment_ft, 1e-9, "with 2 ft of scour");
});

test("shaft: 63,025 is 33,000 x 12 / 2 pi, and torsional stress is 16 T / (pi d^3)", () => {
  within(33000 * 12 / (2 * Math.PI), 63025, 0.001, "torque constant");
  const r = computeMarineShaftDiameter({ engine_hp: 350, shaft_rpm: 1200, shaft_diameter_in: 2, allowable_stress_psi: 12000, rule_factor: 3.4, repower_hp: 500 });
  close(r.torsional_stress_psi, 16 * (63025 * 350 / 1200) / (Math.PI * 8), "torsion");
  close(16 * r.torque_inlb / (Math.PI * r.torsion_diameter_in ** 3), 12000, "the diameter that meets the allowable");
});

test("slings: the loads are the reactions of a simply supported beam, and they sum to the boat", () => {
  const r = computeTravelLiftSlingPlacement({ displacement_lb: 28000, sling_spacing_ft: 18, cg_from_fwd_ft: 10, sling_wll_lb: 14000, sling_angle_deg: 70 });
  close(r.fwd_sling_lb + r.aft_sling_lb, 28000, "vertical equilibrium");
  close(r.aft_sling_lb * 18, 28000 * 10, "moments about the forward sling");
});

test("metacentric height: GM = KM - KG, with the added weight's KG by moments", () => {
  const r = computeMetacentricHeight({ km_ft: 2.6, kg_ft: 2.1, displacement_lb: 42000, added_weight_lb: 900, added_kg_ft: 9.5, free_surface_moment_ftlb: 0, heel_angle_deg: 10 });
  close(r.gm_ft, 0.5, "GM");
  close(r.new_kg_ft, (42000 * 2.1 + 900 * 9.5) / 42900, "KG by moments");
});

// ---- identities the notes claim ----

test("control cable: tension changes by the differential strain times E A", () => {
  const r = computeControlCableTension({ nominal_tension_lb: 70, reference_temp_f: 70, ambient_temp_f: 30, cable_area_in2: 0.0069, cable_modulus_psi: 12e6, structure_alpha_per_f: 0.0000128, cable_alpha_per_f: 0.0000065, service_temp_f: 90 });
  close(r.tension_change_lb, (0.0000128 - 0.0000065) * -40 * 0.0069 * 12e6, "rigged cold, less tension");
});

test("propeller balance: the trial weight's effect is the vector difference of the readings", () => {
  const r = computePropellerTrackBalance({ track_in: 0.045, track_limit_in: 0.0625, initial_ips: 0.42, initial_phase_deg: 155, trial_weight_g: 12, trial_phase_deg: 0, result_ips: 0.19, result_phase_deg: 260, target_ips: 0.2 });
  const d = Math.PI / 180;
  const ex = 0.19 * Math.cos(260 * d) - 0.42 * Math.cos(155 * d), ey = 0.19 * Math.sin(260 * d) - 0.42 * Math.sin(155 * d);
  within(r.effect_ips, Math.hypot(ex, ey), 1e-9, "vector effect");
});

test("fuel, battery and spray: density with temperature, usable amp-hours, material over transfer efficiency", () => {
  const f = computeAviationFuelWeight({ gallons: 380, standard_density_lb_gal: 6.75, reference_temp_f: 59, fuel_temp_f: 95, density_change_pct_per_10f: 0.4, arm_in: 120, required_weight_lb: 2565 });
  close(f.actual_density_lb_gal, 6.75 * (1 - 0.004 * 3.6), "warm fuel is lighter");
  const b = computeHouseBatteryAlternator({ daily_consumption_ah: 180, bank_ah: 400, usable_dod: 0.5, alternator_a: 105, acceptance_fraction: 0.6, bulk_target_soc_pct: 85 });
  close(b.autonomy_days, 200 / 180, "usable over daily");
  const s = computeSprayTransferEfficiency({ applied_material_qt: 1.2, transfer_efficiency: 0.35, alt_transfer_efficiency: 0.65, price_per_qt: 90, jobs_per_year: 700 });
  close(s.material_sprayed_qt * 0.35, 1.2, "sprayed x TE = applied");
});
