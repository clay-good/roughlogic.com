// Unit tests for calc-shop.js: independent checks (hardening 2026-10-15).
// Each test holds a tile to something its own derivation did not write -- a published
// constant or printed value, a re-derived unit constant, an independent numeric method,
// or an invariant the relation places on itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTurningSurfaceFinish, computeRolledBlank, computeTankVolumeDishedHeads,
  computeCylindricalWedgeVolume, computePlasmaCutSpeed, computeBucketElevatorCapacity,
  computeGasStrutForce, computeHeatTreatSoakTime, computeQuenchSeverity,
} from "../../calc-shop.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const relClose = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

// Simpson's rule on [a, b] with n (even) panels.
const simpson = (f, a, b, n = 2000) => {
  const h = (b - a) / n; let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return s * h / 3;
};

// turning-surface-finish: build the exact circular-arc scallop profile, measure its Rt and Ra
// numerically (Ra about the mean line), and compare with the Machinery's Handbook relations
// Rt ~ f^2/(8r), Ra ~ f^2/(32r). The exact Ra of the scallop is f^2/(18 sqrt3 r) = 0.0321 f^2/r,
// so the f^2/(32r) estimate sits about 2.6% low; held to 4%.
test("turning-surface-finish: Rt and Ra vs a numerically measured circular-arc scallop", () => {
  for (const [f, r] of [[0.005, 1 / 32], [0.01, 1 / 32], [0.004, 1 / 64], [0.012, 1 / 16]]) {
    const y = (x) => r - Math.sqrt(r * r - x * x); // height above the scallop bottom, x in [-f/2, f/2]
    const rtExact = y(f / 2);
    const mean = simpson(y, -f / 2, f / 2) / f;
    const ra = simpson((x) => Math.abs(y(x) - mean), -f / 2, f / 2, 20000) / f;
    const res = computeTurningSurfaceFinish({ feed_ipr_in: f, nose_radius_in: r });
    assert.ok(relClose(res.rt_in, rtExact, 0.03), `${f}/${r}: Rt ${res.rt_in} vs ${rtExact}`);
    assert.ok(relClose(res.ra_in, ra, 0.04), `${f}/${r}: Ra ${res.ra_in} vs ${ra}`);
    assert.ok(res.ra_in < ra); // f^2/(32r) is the low side of 0.0321 f^2/r
    assert.ok(relClose(res.ra_um, res.ra_in * 25.4 * 1000, 1e-12));
    assert.ok(relClose(res.rt_uin, res.rt_in * 1e6, 1e-12));
  }
});

// rolled-blank: the OD and ID references must give the same blank for the same plate (OD = ID + 2T),
// the blank is the arc length of the fiber k T from the inside face, and T -> 0 gives pi D.
test("rolled-blank: OD/ID references agree; neutral fiber arc length; thin-plate limit pi D", () => {
  for (const [ID, T, k] of [[12, 0.5, 0.5], [48, 0.25, 0.44], [30, 1, 0.33]]) {
    const a = computeRolledBlank({ reference: "id", diameter_in: ID, thickness_in: T, k_factor: k });
    const b = computeRolledBlank({ reference: "od", diameter_in: ID + 2 * T, thickness_in: T, k_factor: k });
    assert.ok(close(a.blank_length_in, b.blank_length_in, 1e-9));
    assert.ok(close(a.blank_length_in, 2 * Math.PI * (ID / 2 + k * T), 1e-9));
    assert.ok(close(a.blank_length_mm, a.blank_length_in * 25.4, 1e-9));
  }
  const thin = computeRolledBlank({ reference: "od", diameter_in: 24, thickness_in: 1e-9 });
  assert.ok(close(thin.blank_length_in, Math.PI * 24, 1e-6));
});

// tank-volume-dished-heads: (1) Brighton Tru-Edge printed 2:1 elliptical head capacity, 501 gal at
// 96 in diameter (= pi D^3 / 24); (2) partial fill integrated numerically slice-by-slice along the
// axis (circular-segment area of each head cross-section, radius R sqrt(1 - x^2/b^2)).
test("tank-volume-dished-heads: 2:1 head volume matches the printed 501 gal at 96 in", () => {
  const D = 8, L = 10;
  const r = computeTankVolumeDishedHeads({ diameter_ft: D, shell_length_ft: L, fill_depth_ft: D, head_type: "elliptical" });
  const shellGal = Math.PI * 16 * L * 1728 / 231;
  const perHead = (r.full_gal - shellGal) / 2;
  assert.ok(close(perHead, 501, 1.5), `per head ${perHead}`);
});
test("tank-volume-dished-heads: partial fill matches numeric slice integration", () => {
  const segArea = (rho, z0) => { // area of a circle of radius rho below the level z0 (center at 0)
    if (z0 >= rho) return Math.PI * rho * rho;
    if (z0 <= -rho) return 0;
    return rho * rho * Math.acos(-z0 / rho) + z0 * Math.sqrt(rho * rho - z0 * z0);
  };
  for (const head_type of ["elliptical", "hemispherical"]) {
    const D = 6, R = 3, L = 14, b = head_type === "hemispherical" ? R : R / 2;
    for (const h of [0.4, 1.7, 3, 4.6, 5.9]) {
      const z0 = h - R;
      const heads = 2 * simpson((x) => segArea(R * Math.sqrt(Math.max(0, 1 - (x * x) / (b * b))), z0), 0, b, 20000);
      const shell = segArea(R, z0) * L;
      const r = computeTankVolumeDishedHeads({ diameter_ft: D, shell_length_ft: L, fill_depth_ft: h, head_type });
      assert.ok(relClose(r.volume_ft3, shell + heads, 1e-4), `${head_type} h=${h}: ${r.volume_ft3} vs ${shell + heads}`);
    }
  }
});

// cylindrical-wedge-volume: integrate the wedge height H y / R over the semicircular base numerically.
test("cylindrical-wedge-volume: numeric double integral over the half-disk", () => {
  for (const [D, H] of [[2, 1], [6, 4.5], [1, 10]]) {
    const R = D / 2;
    const vol = simpson((y) => 2 * Math.sqrt(Math.max(0, R * R - y * y)) * (H * y / R), 0, R, 20000);
    const r = computeCylindricalWedgeVolume({ base_diameter_ft: D, height_ft: H });
    assert.ok(relClose(r.volume_ft3, vol, 1e-5), `${D}/${H}: ${r.volume_ft3} vs ${vol}`);
    assert.ok(close(r.percent_of_cylinder, 200 / (3 * Math.PI), 1e-9));
    assert.ok(relClose(r.volume_gal, r.volume_ft3 * 7.48051948, 1e-8)); // 1 ft^3 = 1728/231 gal
  }
});

// plasma-cut-speed: brute-force the consumable set by cutting parts one at a time until a rating runs out.
test("plasma-cut-speed: parts per set by simulation of pierce and arc-hour wear", () => {
  const cases = [
    { cut_length_in: 120, cut_speed_ipm: 100, pierces_per_part: 2, set_cost: 60, rated_pierces: 800, rated_arc_hours: 2 },
    { cut_length_in: 30, cut_speed_ipm: 150, pierces_per_part: 12, set_cost: 45, rated_pierces: 1500, rated_arc_hours: 3 },
    { cut_length_in: 600, cut_speed_ipm: 60, pierces_per_part: 1, set_cost: 80, rated_pierces: 1000, rated_arc_hours: 1.5 },
  ];
  for (const c of cases) {
    let pierces = 0, hours = 0, parts = 0;
    const hrsPerPart = c.cut_length_in / c.cut_speed_ipm / 60;
    while (pierces + c.pierces_per_part <= c.rated_pierces + 1e-9 && hours + hrsPerPart <= c.rated_arc_hours + 1e-9) {
      pierces += c.pierces_per_part; hours += hrsPerPart; parts++;
    }
    const r = computePlasmaCutSpeed(c);
    assert.equal(r.parts_per_set, parts);
    assert.ok(close(r.cost_per_foot * (c.cut_length_in / 12) * parts, c.set_cost, 1e-9));
  }
});

// bucket-elevator-capacity: units re-derived -- 1 US bushel = 2,150.42 in^3; 1 hp = 550 ft-lbf/s.
test("bucket-elevator-capacity: volumetric rate, bushel and hp constants re-derived", () => {
  const r = computeBucketElevatorCapacity({ bucket_volume_ft3: 0.1, spacing_in: 12, speed_fpm: 300, fill_factor: 0.8, bulk_density_pcf: 48, lift_ft: 60, drive_efficiency: 0.8, friction_allowance: 1.25 });
  // 300 ft/min past the head, one bucket per ft -> 300 buckets/min x 0.1 x 0.8 = 24 ft^3/min
  assert.ok(close(r.capacity_ft3_hr, 24 * 60, 1e-9));
  assert.ok(relClose(r.bushels_per_hr, r.capacity_ft3_hr * 1728 / 2150.42, 1e-4));
  const lbPerS = 24 * 48 / 60;
  assert.ok(relClose(r.lifting_hp, lbPerS * 60 / 550, 1e-12));
  assert.ok(relClose(r.motor_hp, r.lifting_hp / 0.8 * 1.25, 1e-12));
  assert.ok(close(r.tons_per_hr, 24 * 60 * 48 / 2000, 1e-9));
});

// gas-strut-force: virtual work -- the hinge moment is dU/dphi of the lid's potential energy
// U = W d sin(phi); total force is independent of the strut count.
test("gas-strut-force: moment = dU/dphi by finite difference; strut count splits, not changes, the force", () => {
  const W = 40, d = 18, arm = 3.2;
  for (const phi of [0, 20, 45, 80]) {
    const U = (p) => W * d * Math.sin(p * Math.PI / 180);
    const h = 1e-4, dU = (U(phi + h) - U(phi - h)) / (2 * h * Math.PI / 180);
    const one = computeGasStrutForce({ lid_weight_lb: W, cg_distance_in: d, opening_angle_deg: phi, moment_arm_in: arm, struts: 1, second_angle_deg: 60, second_moment_arm_in: 4 });
    const two = computeGasStrutForce({ lid_weight_lb: W, cg_distance_in: d, opening_angle_deg: phi, moment_arm_in: arm, struts: 2, second_angle_deg: 60, second_moment_arm_in: 4 });
    assert.ok(relClose(one.lid_moment_in_lb, dU, 1e-6), `${phi}: ${one.lid_moment_in_lb} vs ${dU}`);
    assert.ok(relClose(one.total_force_lb * arm, dU, 1e-6));
    assert.ok(relClose(two.total_force_lb, one.total_force_lb, 1e-12));
    assert.ok(relClose(two.force_per_strut_lb * 2, one.force_per_strut_lb, 1e-12));
  }
});

// heat-treat-soak-time: kW constant from its definition (1 Btu_IT = 1055.05585262 J) and the charge
// heat recomputed in SI (0.12 Btu/lb-F = 0.12 x 4186.8 J/kg-K).
test("heat-treat-soak-time: SI charge heat, Btu/h-to-kW from definition, energy balance", () => {
  const r = computeHeatTreatSoakTime({ charge_weight_lb: 2000, section_thickness_in: 3, soak_temp_f: 1600, start_temp_f: 70, through_heat_rate_hr_per_in: 1, soak_rate_hr_per_in: 0.5, specific_heat: 0.12, furnace_efficiency: 0.6 });
  assert.ok(close(r.through_heat_hr, 3, 1e-12)); assert.ok(close(r.soak_hr, 1.5, 1e-12));
  const J = 2000 * 0.45359237 * 0.12 * 4186.8 * (1530 * 5 / 9);
  assert.ok(relClose(r.charge_heat_btu, J / 1055.05585262, 1e-6));
  assert.ok(relClose(r.furnace_input_kw * 1000 * 3600 * r.through_heat_hr * 0.6, J, 1e-5));
  // doubling the section doubles both time terms and halves nothing else
  const r2 = computeHeatTreatSoakTime({ charge_weight_lb: 2000, section_thickness_in: 6, soak_temp_f: 1600, start_temp_f: 70, through_heat_rate_hr_per_in: 1, soak_rate_hr_per_in: 0.5, specific_heat: 0.12, furnace_efficiency: 0.6 });
  assert.ok(close(r2.total_at_temp_hr, 2 * r.total_at_temp_hr, 1e-12));
  assert.ok(close(r2.charge_heat_btu, r.charge_heat_btu, 1e-9));
});

// quench-severity: Grossmann defines H = h / (2k), so Bi = h r / k = H D (the abscissa of Grossmann's
// charts); unit-free -- H in 1/mm with D in mm gives the same Bi. Grossmann still water H ~1.0 on a 1 in
// bar is Bi 1 (transitional); still oil H 0.25 on 1 in is Bi 0.25 (surface-limited).
test("quench-severity: Bi = H x D from Grossmann's definition; unit-free; regimes at published H", () => {
  const h_si = 5000, k = 25; // W/m^2-K, W/m-K
  const H_per_in = h_si / (2 * k) * 0.0254;
  const D = 2;
  const r = computeQuenchSeverity({ grossmann_h: H_per_in, section_diameter_in: D, second_grossmann_h: 1 });
  assert.ok(relClose(r.biot, h_si * (D / 2 * 0.0254) / k, 1e-12));
  const mm = computeQuenchSeverity({ grossmann_h: H_per_in / 25.4, section_diameter_in: D * 25.4, second_grossmann_h: 1 / 25.4 });
  assert.ok(relClose(mm.biot, r.biot, 1e-12));
  assert.match(computeQuenchSeverity({ grossmann_h: 1.0, section_diameter_in: 1, second_grossmann_h: 1.5 }).regime, /transitional/);
  assert.match(computeQuenchSeverity({ grossmann_h: 0.25, section_diameter_in: 1, second_grossmann_h: 0.4 }).regime, /surface-limited/);
  assert.match(computeQuenchSeverity({ grossmann_h: 1.0, section_diameter_in: 4, second_grossmann_h: 2 }).regime, /conduction-limited/);
});
