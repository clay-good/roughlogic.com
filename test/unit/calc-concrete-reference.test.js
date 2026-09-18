// The placement and tilt-up tiles of calc-concrete.js (spec-v1609..v1613)
// against references the specs did not write: the tendon's elongation by
// integrating the force along it numerically, statics on the brace and the
// panel, and the identities the tiles' notes claim. These tiles' only
// worked-example rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeConcretePumpLinePressure, computeBoomPumpReach, computePostTensionElongation,
  computeTiltUpLiftStress, computeTiltUpBraceLoad,
} from "../../calc-concrete.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

test("post-tensioning: elongation is the integral of P(x) / (A E) along the tendon", () => {
  const r = computePostTensionElongation({ strand_area_in2: 0.153, modulus_psi: 28e6, tendon_length_ft: 120, jacking_stress_ksi: 202.5, curvature_friction: 0.2, angular_change_rad: 0.3, wobble_per_ft: 0.0002, anchor_set_in: 0.25, measured_elongation_in: 8.35, tolerance_pct: 7 });
  // Curvature spread uniformly along the length: P(x) = P0 e^-(mu a x/L + k x).
  const P0 = 202500 * 0.153, L = 120, n = 20000;
  let integral = 0;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * L / n;
    integral += P0 * Math.exp(-(0.2 * 0.3 * x / L + 0.0002 * x)) * L / n;
  }
  within(r.theoretical_elongation_in, integral * 12 / (0.153 * 28e6), 1e-6, "integrated elongation");
  close(r.far_end_force_lb, P0 * Math.exp(-(0.06 + 0.024)), "far-end force");
});

test("tilt-up brace: moments about the base, then resolved along the brace", () => {
  const r = computeTiltUpBraceLoad({ panel_width_ft: 24, panel_height_ft: 24, wind_pressure_psf: 12, resultant_height_ft: 12, brace_attachment_height_ft: 16, brace_angle_deg: 55, brace_count: 3, brace_capacity_lb: 4000, alternate_angle_deg: 45 });
  close(r.total_lateral_lb * 16, 576 * 12 * 12, "moment about the base");
  const a = 55 * Math.PI / 180;
  close(r.axial_per_brace_lb * Math.cos(a), r.lateral_per_brace_lb, "horizontal component");
  close(r.anchor_vertical_lb, r.axial_per_brace_lb * Math.sin(a), "vertical component");
});

test("tilt-up lift: panel weight from the concrete, and the strip's stress M / S", () => {
  const r = computeTiltUpLiftStress({ panel_width_ft: 8, panel_height_ft: 24, thickness_in: 7.25, unit_weight_pcf: 150, lift_day_strength_psi: 2200, insert_rows: 2, insert_columns: 2, suction_fraction: 0, safety_factor: 1.5 });
  close(r.panel_weight_lb, 192 * 7.25 / 12 * 150, "weight");
  close(r.bending_stress_psi, r.moment_lb_in_per_ft / (12 * 7.25 ** 2 / 6), "M / S per foot");
});

test("pump line: static head is gamma / 144 per foot of lift, friction per equivalent foot", () => {
  const r = computeConcretePumpLinePressure({ horizontal_length_ft: 320, vertical_lift_ft: 60, unit_weight_pcf: 150, friction_psi_per_100ft: 4.5, bend_count: 6, bend_equivalent_ft: 10, hose_length_ft: 25, hose_friction_multiple: 3, pump_rated_psi: 1100 });
  close(r.static_psi, 60 * 150 / 144, "static");
  close(r.friction_psi, (320 + 60 + 75) * 0.045, "friction");
});

test("boom reach: a straight boom of length R reaches sqrt(R^2 - h^2) at height h", () => {
  const r = computeBoomPumpReach({ boom_reach_ft: 110, required_distance_ft: 95, required_height_ft: 45, boom_centre_offset_ft: 8, outrigger_load_lb: 40000, outrigger_pad_area_ft2: 4, power_line_distance_ft: 25, required_line_clearance_ft: 20 });
  close(r.reach_at_height_ft ** 2 + 45 ** 2, 110 ** 2, "Pythagoras");
  close(r.outrigger_pressure_psf, 10000, "pad pressure");
});
