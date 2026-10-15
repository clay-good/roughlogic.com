// Independent checks for machining-module tiles whose only other check is the
// project's own derivation (worked-example rows written from the same formula).
// Each test re-derives the answer by a route the compute does not take: a
// definition, a unit conversion, a second numeric method, or an invariant.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeKnurlBlankDiameter,
  computeSpindleMaxMrr,
  computeBandSawBladePitch,
  computeCounterboreDepth,
  computeFatigueMinerDamage,
  computeFatigueCombinedLoading,
  computeClutchEngagementEnergy,
} from "../../calc-machining.js";

const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

// knurl-blank-diameter. ANSI B94.6 (Machinery's Handbook, "Knurls and Knurling") defines a
// diametral pitch knurl as P = N / D (teeth per inch of diameter). A circular-pitch TPI knurl is
// the same tooth spacing with P = pi x TPI, so on a blank D an exact multiple of 1/P the teeth are
// whole and no adjustment is needed; and on any target the turned blank must hold a whole number
// of 1/TPI pitches around pi x D, within half a pitch of the target circumference.
test("knurl-blank-diameter: 96 DP knurl (TPI = 96/pi) on 0.5 in and 1/32 in steps gives N = P x D, zero adjustment", () => {
  const tpi = 96 / Math.PI;
  for (const k of [16, 17, 24, 31]) {
    const D = k / 32;
    const r = computeKnurlBlankDiameter({ target_diameter_in: D, knurl_tpi: tpi });
    assert.equal(r.teeth, 3 * k, `D = ${k}/32: N = 96 x D`);
    assert.ok(Math.abs(r.adjustment_in) < 1e-12, `D = ${k}/32 needs no adjustment`);
  }
});
test("knurl-blank-diameter: blank circumference is a whole number of pitches and within half a pitch of the target", () => {
  for (const [D, tpi] of [[0.75, 21], [1.0, 25], [0.3125, 33], [2.0, 14], [0.6, 47]]) {
    const r = computeKnurlBlankDiameter({ target_diameter_in: D, knurl_tpi: tpi });
    const pitches = Math.PI * r.blank_diameter_in * tpi; // circumference / (1/TPI)
    assert.ok(Math.abs(pitches - Math.round(pitches)) < 1e-9, `${D} in @ ${tpi} TPI: whole teeth`);
    // |pi (Db - D)| <= half a pitch = 1/(2 TPI)
    assert.ok(Math.abs(Math.PI * r.adjustment_in) <= 0.5 / tpi + 1e-12, `${D} in @ ${tpi} TPI: within half a pitch`);
    // and no other whole tooth count is closer to the target
    const alt = [r.teeth - 1, r.teeth + 1].map((n) => Math.abs(n / (Math.PI * tpi) - D));
    assert.ok(alt.every((e) => e >= Math.abs(r.adjustment_in) - 1e-12), "nearest whole-tooth blank");
  }
});

// spindle-max-mrr. Unit power is specific cutting energy: 1 hp per in3/min = 745.6999 W x 60 s /
// 16,387.064 mm3 = 2.7303 J/mm3 (Machinery's Handbook gives the metric unit-power table in kW per
// cm3/s, the same quantity). Route: SI power x efficiency / energy per mm3, back to in3/min.
test("spindle-max-mrr: SI specific-energy route agrees (5 hp, 80%, 1.0 hp/in3/min and 0.33 aluminum)", () => {
  const J_PER_MM3_PER_UNIT = (745.699872 * 60) / 16387.064;
  assert.ok(rel(J_PER_MM3_PER_UNIT, 2.7303, 1e-4));
  for (const [hp, up, eff] of [[5, 1.0, 80], [10, 0.33, 90], [3, 1.5, 70]]) {
    const watts = hp * 745.699872 * (eff / 100);
    const mm3_per_s = watts / (up * J_PER_MM3_PER_UNIT);
    const in3_per_min = (mm3_per_s * 60) / 16387.064;
    const r = computeSpindleMaxMrr({ available_motor_hp: hp, unit_power_hp: up, efficiency_pct: eff });
    assert.ok(rel(r.max_mrr_in3_min, in3_per_min, 1e-9), `${hp} hp / ${up}: ${r.max_mrr_in3_min} vs ${in3_per_min}`);
  }
  // 5 hp x 0.8 / 1.0 = 4 in3/min exactly.
  assert.ok(rel(computeSpindleMaxMrr({ available_motor_hp: 5, unit_power_hp: 1, efficiency_pct: 80 }).max_mrr_in3_min, 4, 1e-12));
});

// band-saw-blade-pitch. The rule is a count of teeth engaged: TPI x thickness in [3, 24]. Check it
// as a count, and check wheel rpm as blade travel: rpm x (pi D / 12 ft per rev) must equal SFM.
test("band-saw-blade-pitch: band edges engage exactly 3 and 24 teeth; rpm x circumference = blade speed", () => {
  for (const [t, sfm, D] of [[2.0, 250, 12], [0.12, 300, 14], [6, 80, 20]]) {
    const r = computeBandSawBladePitch({ thickness_in_cut_in: t, blade_speed_sfm: sfm, wheel_diameter_in: D, cut_area_sqin: 3, feed_sqin_per_min: 4 });
    assert.ok(rel(r.min_tpi * t, 3, 1e-12) && rel(r.max_tpi * t, 24, 1e-12), `t = ${t}`);
    assert.ok(rel(r.wheel_rpm * Math.PI * D / 12, sfm, 1e-12), `rpm at ${D} in`);
    assert.ok(rel(r.cut_time_sec, 3 / 4 * 60, 1e-12));
  }
  // The tile's own printed lesson: 2.0 in square tube with a 0.120 in wall -> 25 to 200 TPI, no stocked blade.
  const tube = computeBandSawBladePitch({ thickness_in_cut_in: 0.12, blade_speed_sfm: 250, wheel_diameter_in: 12, cut_area_sqin: 0.9, feed_sqin_per_min: 5 });
  assert.ok(rel(tube.min_tpi, 25, 1e-12) && rel(tube.max_tpi, 200, 1e-12));
  assert.match(tube.practical, /NO stocked blade/);
});

// counterbore-depth. Invariants of the engagement check: the returned minimum thickness, fed back
// as the plate, must pass with exactly zero spare; a hair less must fail by that hair; and with the
// bore in a clearance plate the available engagement is the whole plate. ASME B18.3 1/2-13 socket
// head cap screw: head height = 0.500 in = D.
test("counterbore-depth: minimum thickness is the exact pass/fail boundary; shortfall = required - available", () => {
  const base = { screw_diameter_in: 0.5, head_height_in: 0.5, below_flush_in: 0.015, engagement_multiplier: 1.5, tapped_part: "yes" };
  const first = computeCounterboreDepth({ ...base, plate_thickness_in: 0.75 });
  assert.ok(rel(first.counterbore_depth_in, 0.515, 1e-12));
  assert.ok(rel(first.shortfall_in, 0.75 - 0.235, 1e-9), "1.5 x 0.5 = 0.75 required against 0.235 left");
  const atMin = computeCounterboreDepth({ ...base, plate_thickness_in: first.minimum_thickness_in });
  assert.equal(atMin.passes, true);
  assert.ok(Math.abs(atMin.available_engagement_in - atMin.required_engagement_in) < 1e-12);
  const under = computeCounterboreDepth({ ...base, plate_thickness_in: first.minimum_thickness_in - 0.001 });
  assert.equal(under.passes, false);
  assert.ok(rel(under.shortfall_in, 0.001, 1e-6));
  const clear = computeCounterboreDepth({ ...base, plate_thickness_in: 0.75, tapped_part: "no" });
  assert.equal(clear.available_engagement_in, 0.75);
  assert.equal(clear.passes, true);
});

// fatigue-miner-damage. Independent S-N line: Shigley's idealized line runs straight on log-log
// axes through (10^3, f Sut) and (10^6, Se), so by log interpolation
// log N = 3 + 3 (log(f Sut) - log s) / (log(f Sut) - log Se). Then a CYCLE-BY-CYCLE Miner sum
// (add 1/N for every cycle of a repeating block until D reaches 1) must land on the tile's count.
test("fatigue-miner-damage: lives by log interpolation between (1e3, f Sut) and (1e6, Se); cycle-by-cycle sum to failure", () => {
  const Sut = 100000, Se = 50000, f = 0.9, fS = f * Sut;
  const lifeOf = (s) => Math.pow(10, 3 + 3 * (Math.log10(fS) - Math.log10(s)) / (Math.log10(fS) - Math.log10(Se)));
  assert.ok(rel(lifeOf(fS), 1e3, 1e-12) && rel(lifeOf(Se), 1e6, 1e-12));
  const blocks = [[80000, 200], [65000, 900], [52000, 4000]];
  const r = computeFatigueMinerDamage({
    ultimate_strength_psi: Sut, endurance_limit_psi: Se, fatigue_fraction: f,
    stress_1_psi: blocks[0][0], cycles_1: blocks[0][1], stress_2_psi: blocks[1][0], cycles_2: blocks[1][1], stress_3_psi: blocks[2][0], cycles_3: blocks[2][1],
  });
  [r.life_1_cycles, r.life_2_cycles, r.life_3_cycles].forEach((N, i) => assert.ok(rel(N, lifeOf(blocks[i][0]), 1e-9), `block ${i + 1} life`));
  // Cycle-by-cycle: walk the history one cycle at a time.
  let D = 0, n = 0;
  outer: for (;;) {
    for (const [s, cyc] of blocks) {
      const inc = 1 / lifeOf(s);
      for (let k = 0; k < cyc; k++) { D += inc; n += 1; if (D >= 1) break outer; }
    }
  }
  // The tile's continuous count and the discrete walk differ by less than one block.
  const blockCycles = blocks.reduce((t, [, c]) => t + c, 0);
  assert.ok(Math.abs(r.cycles_to_failure - n) < blockCycles, `${r.cycles_to_failure} vs walked ${n}`);
  assert.ok(Math.abs(r.blocks_to_failure * r.damage - 1) < 1e-12);
});
test("fatigue-miner-damage: one block at a stress uses exactly N cycles; a block at Se adds no damage", () => {
  const common = { ultimate_strength_psi: 100000, endurance_limit_psi: 50000, fatigue_fraction: 0.9 };
  const one = computeFatigueMinerDamage({ ...common, stress_1_psi: 70000, cycles_1: 1 });
  assert.ok(rel(one.cycles_to_failure, one.life_1_cycles, 1e-12));
  const withSe = computeFatigueMinerDamage({ ...common, stress_1_psi: 70000, cycles_1: 1, stress_2_psi: 50000, cycles_2: 1e9 });
  assert.ok(rel(withSe.damage, one.damage, 1e-12));
});

// fatigue-combined-loading. Second route to von Mises: the shaft surface element carries
// sigma_x = bending + axial and tau_xy = torsion. Principal stresses
// s1,2 = sx/2 +/- sqrt((sx/2)^2 + t^2), and sigma' = sqrt(s1^2 - s1 s2 + s2^2) (distortion energy,
// Shigley Eq. 5-13). For the alternating part the axial term is divided by kc = 0.85 (Shigley
// Sec. 6-9: Marin load factor for axial loading), per Shigley's combination-of-modes method.
test("fatigue-combined-loading: principal-stress von Mises agrees for alternating, mean, and peak", () => {
  const vmPrincipal = (sx, t) => {
    const c = sx / 2, R = Math.sqrt(c * c + t * t), s1 = c + R, s2 = c - R;
    return Math.sqrt(s1 * s1 - s1 * s2 + s2 * s2);
  };
  const cases = [
    { bending_alt_psi: 10000, bending_mean_psi: 0, axial_alt_psi: 0, axial_mean_psi: 0, torsion_alt_psi: 0, torsion_mean_psi: 5000, kf_bending: 2, kf_axial: 1, kfs_torsion: 1.5 },
    { bending_alt_psi: 8000, bending_mean_psi: 3000, axial_alt_psi: 2000, axial_mean_psi: 1500, torsion_alt_psi: 1200, torsion_mean_psi: 4000, kf_bending: 1.8, kf_axial: 1.6, kfs_torsion: 1.3 },
    { bending_alt_psi: 5000, bending_mean_psi: -30000, axial_alt_psi: 0, axial_mean_psi: 0, torsion_alt_psi: 0, torsion_mean_psi: 0, kf_bending: 1, kf_axial: 1, kfs_torsion: 1 },
  ];
  for (const c of cases) {
    const r = computeFatigueCombinedLoading(c);
    const sxa = c.kf_bending * c.bending_alt_psi + c.kf_axial * c.axial_alt_psi / 0.85;
    const sxm = c.kf_bending * c.bending_mean_psi + c.kf_axial * c.axial_mean_psi;
    assert.ok(rel(r.vm_alt_psi, vmPrincipal(sxa, c.kfs_torsion * c.torsion_alt_psi), 1e-9), "alternating");
    assert.ok(rel(r.vm_mean_psi, vmPrincipal(sxm, c.kfs_torsion * c.torsion_mean_psi), 1e-9), "mean");
    // Peak: sample the in-phase cycle at many phases and take the largest principal-stress von Mises.
    let peak = 0;
    for (let k = 0; k <= 720; k++) {
      const ph = Math.cos((k * Math.PI) / 360);
      const sx = c.kf_bending * (c.bending_mean_psi + ph * c.bending_alt_psi) + c.kf_axial * (c.axial_mean_psi + ph * c.axial_alt_psi);
      const t = c.kfs_torsion * (c.torsion_mean_psi + ph * c.torsion_alt_psi);
      peak = Math.max(peak, vmPrincipal(sx, t));
    }
    assert.ok(rel(r.vm_max_psi, peak, 1e-9), `peak ${r.vm_max_psi} vs sampled ${peak}`);
  }
  // Compressive mean: -30,000 +/- 5,000 peaks at 35,000.
  assert.ok(rel(computeFatigueCombinedLoading(cases[2]).vm_max_psi, 35000, 1e-12));
});

// clutch-engagement-energy. Explicit time-stepped integration: at a constant slip torque T the
// driver decelerates at T/I1 and the driven side accelerates at T/I2; the friction faces turn
// T x (w1 - w2) into heat until the speeds meet. Summing that power over time must reproduce the
// closed-form energy, slip time and common speed. I = WR^2/g, 778.169 ft lb per BTU.
test("clutch-engagement-energy: explicit time-stepped slip integration matches energy, slip time and final speed", () => {
  for (const [wr1, wr2, n1, n2, T] of [[20, 10, 1800, 0, 100], [5, 40, 1200, 300, 60], [8, 8, 0, 900, 25]]) {
    const g = 32.174, I1 = wr1 / g, I2 = wr2 / g;
    let w1 = n1 * 2 * Math.PI / 60, w2 = n2 * 2 * Math.PI / 60, t = 0, E = 0;
    const sgn = Math.sign(w1 - w2), dt = 1e-5;
    while (Math.sign(w1 - w2) === sgn) {
      const slip = w1 - w2;
      const a1 = -sgn * T / I1, a2 = sgn * T / I2;
      // fraction of the step before lock-up (the slip shrinks linearly)
      const h = Math.min(dt, Math.abs(slip) / (T / I1 + T / I2));
      E += T * Math.abs(slip + 0.5 * (a1 - a2) * h) * h; // midpoint of the linear slip
      w1 += a1 * h; w2 += a2 * h; t += h;
      if (h < dt) break;
    }
    const r = computeClutchEngagementEnergy({ driver_wr2_lbft2: wr1, driven_wr2_lbft2: wr2, driver_rpm: n1, driven_rpm: n2, slip_torque_lbft: T, absorbing_weight_lb: 15, specific_heat_btu_lbf: 0.12 });
    assert.ok(rel(r.energy_ftlb, E, 1e-6), `energy ${r.energy_ftlb} vs integrated ${E}`);
    assert.ok(rel(r.slip_time_s, t, 1e-6), `slip time ${r.slip_time_s} vs ${t}`);
    assert.ok(Math.abs(r.final_rpm - w1 * 60 / (2 * Math.PI)) < 1e-6, "common speed");
    assert.ok(rel(r.temp_rise_f, E / 778.169 / (0.12 * 15), 1e-6), "temperature rise");
  }
});
test("clutch-engagement-energy: a brake on an immovable frame (driven WR^2 -> huge) dissipates all of 1/2 I w^2", () => {
  const r = computeClutchEngagementEnergy({ driver_wr2_lbft2: 20, driven_wr2_lbft2: 1e12, driver_rpm: 1800, driven_rpm: 0 });
  const w = 1800 * 2 * Math.PI / 60;
  assert.ok(rel(r.energy_ftlb, 0.5 * (20 / 32.174) * w * w, 1e-9));
});
