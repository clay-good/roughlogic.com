// Independent checks for mining-module tiles whose only other check is the
// project's own derivation (worked-example rows written from the same formula).
// Each test re-derives the answer by a route the compute does not take: a
// definition, a published rule, a second numeric method, or an invariant.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeScreenDeckCapacity,
  computeBeltFeederCapacity,
  computeBlastFumeClearanceTime,
  computeHoistRopeSafetyFactor,
  computeBondWorkIndexPower,
  computeCirculatingLoadRatio,
  computeScreenEfficiency,
  computePulpDensitySolids,
  computeFrictionHoistTraction,
} from "../../calc-mining.js";

const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

// screen-deck-capacity. Invariants of the factor method: capacity is linear in deck area and in
// each factor; the required area is the deck area scaled by percent of capacity; a feed equal to
// capacity is not over capacity, and a feed 0.1% above it is.
test("screen-deck-capacity: required area = area x feed/capacity; linear in width; boundary at feed = capacity", () => {
  const ex = { deck_width_ft: 8, deck_length_ft: 20, base_capacity_tph_per_sqft: 3.5, oversize_factor: 1.1, halfsize_factor: 1.15, deck_factor: 0.9, wet_factor: 1.25, efficiency_factor: 0.95, actual_feed_tph: 400 };
  const r = computeScreenDeckCapacity(ex);
  // By hand: 160 sq ft x 3.5 x (1.1 x 1.15 x 0.9 x 1.25 x 0.95 = 1.35196875) = 757.1025 tph.
  assert.ok(rel(r.capacity_tph, 757.1025, 1e-12));
  assert.ok(rel(r.area_required_sqft, r.screen_area_sqft * r.percent_of_capacity / 100, 1e-12));
  assert.ok(rel(computeScreenDeckCapacity({ ...ex, deck_width_ft: 16 }).capacity_tph, 2 * r.capacity_tph, 1e-12));
  assert.ok(rel(computeScreenDeckCapacity({ ...ex, halfsize_factor: 2.3 }).capacity_tph, 2 * r.capacity_tph, 1e-12));
  assert.equal(computeScreenDeckCapacity({ ...ex, actual_feed_tph: r.capacity_tph }).over_capacity, false);
  assert.equal(computeScreenDeckCapacity({ ...ex, actual_feed_tph: r.capacity_tph * 1.001 }).over_capacity, true);
});

// belt-feeder-capacity. SI route: mass flow = gate area (m2) x belt speed (m/s) x bulk density
// (kg/m3), converted to short tons per hour (907.18474 kg per short ton). 1 pcf = 16.018463 kg/m3.
test("belt-feeder-capacity: SI mass-flow route agrees; required speed and opening reproduce the target", () => {
  const ex = { opening_width_in: 36, opening_height_in: 8, belt_speed_fpm: 60, bulk_density_pcf: 100, target_tph: 400, alternative_density_pcf: 160 };
  const r = computeBeltFeederCapacity(ex);
  const kg_s = (36 * 0.0254) * (8 * 0.0254) * (60 * 0.3048 / 60) * (100 * 16.018463);
  const stph = kg_s * 3600 / 907.18474;
  assert.ok(rel(r.tph, stph, 1e-6), `${r.tph} vs SI ${stph}`);
  assert.ok(rel(r.tph, 360, 1e-12), "2 sq ft x 60 fpm x 60 x 100 pcf / 2000 = 360");
  assert.ok(rel(computeBeltFeederCapacity({ ...ex, belt_speed_fpm: r.required_speed_fpm }).tph, 400, 1e-12));
  assert.ok(rel(computeBeltFeederCapacity({ ...ex, opening_height_in: r.required_opening_in }).tph, 400, 1e-12));
  assert.ok(rel(r.alternative_tph / r.tph, 1.6, 1e-12));
});

// blast-fume-clearance-time. Perfect-mixing dilution dC/dt = -(Q/V) C integrated explicitly by
// RK4 (not the closed-form exponential) until C/C0 reaches the target; the time must match.
test("blast-fume-clearance-time: RK4 integration of dC/dt = -QC/V reaches the target at the tile's clearance time", () => {
  for (const [V, Q, target] of [[48000, 17500, 1], [120000, 9000, 5], [30000, 25000, 0.1]]) {
    const r = computeBlastFumeClearanceTime({ heading_volume_cuft: V, delivered_cfm: Q, target_fraction_pct: target, wait_time_min: 10, target_time_min: 10 });
    const f = (c) => -(Q / V) * c;
    let c = 100, t = 0;
    const h = 1e-3;
    let prevC = c, prevT = t;
    while (c > target) {
      prevC = c; prevT = t;
      const k1 = f(c), k2 = f(c + h * k1 / 2), k3 = f(c + h * k2 / 2), k4 = f(c + h * k3);
      c += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); t += h;
    }
    const tHit = prevT + (prevC - target) / (prevC - c) * (t - prevT);
    assert.ok(rel(r.clearance_min, tHit, 1e-4), `V ${V}, Q ${Q}: ${r.clearance_min} vs RK4 ${tHit}`);
    // Remaining at the 10-minute wait, by the same integration.
    let c10 = 100;
    for (let s = 0; s < 10000; s++) { const k1 = f(c10), k2 = f(c10 + h * k1 / 2), k3 = f(c10 + h * k2 / 2), k4 = f(c10 + h * k3); c10 += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); }
    assert.ok(rel(r.remaining_pct_at_wait, c10, 1e-6));
  }
});

// hoist-rope-safety-factor. Per-rope statics (each rope carries 1/n of conveyance and payload plus
// its own full hanging length) must give the same factor as the system total. Then the statutory
// minimum from 30 CFR 57.19021(a), winding-drum ropes: 7.0 - 0.001 L below 3,000 ft, 4.0 at or
// beyond (5.6 at 1,400 ft); and the returned depth and payload limits must sit exactly on it.
test("hoist-rope-safety-factor: per-rope statics agree; limits land exactly on the 30 CFR 57.19021 winding-drum minimum", () => {
  const ex = { conveyance_lb: 4200, people_count: 8, person_weight_lb: 180, rope_length_ft: 1400, rope_weight_per_ft: 1.8, rope_count: 4, rope_breaking_lb: 128000 };
  const cfrWinding = (L) => (L < 3000 ? 7.0 - 0.001 * L : 4.0);
  assert.ok(rel(cfrWinding(1400), 5.6, 1e-12));
  const perRopeLoad = (4200 + 8 * 180) / 4 + 1400 * 1.8;
  const r = computeHoistRopeSafetyFactor({ ...ex, minimum_fs: cfrWinding(1400) });
  assert.ok(rel(r.factor_of_safety, 128000 / perRopeLoad, 1e-12), `${r.factor_of_safety} vs per-rope ${128000 / perRopeLoad}`);
  assert.equal(r.pass, true);
  // At the returned depth limit the factor equals the minimum; at the returned max payload too.
  const atDepth = computeHoistRopeSafetyFactor({ ...ex, rope_length_ft: r.depth_at_limit_ft, minimum_fs: 5.6 });
  assert.ok(rel(atDepth.factor_of_safety, 5.6, 1e-9));
  const atPayload = computeHoistRopeSafetyFactor({ ...ex, people_count: 1, person_weight_lb: r.max_payload_lb, minimum_fs: 5.6 });
  assert.ok(rel(atPayload.factor_of_safety, 5.6, 1e-9));
  // Dropping the rope count from the rope weight (the bug the code comment names) would give this; it must not.
  const wrong = 4 * 128000 / (4200 + 1440 + 1400 * 1.8);
  assert.ok(Math.abs(r.factor_of_safety - wrong) > 1);
});

// bond-work-index-power. Bond (1961) defines Wi as the kWh per short ton to grind from infinite
// size to 80% passing 100 microns, so W(F80 -> infinity, P80 = 100) = Wi; that fixes the
// constant 10 = sqrt(100). The two-stage additivity of Bond's law (F -> M -> P equals F -> P) and
// the inverse (available power -> P80) are checked as identities.
test("bond-work-index-power: infinite feed to 100 microns costs exactly Wi; stages add; inverse round-trips", () => {
  const inf = computeBondWorkIndexPower({ work_index_kwh_st: 13, feed_f80_um: 1e20, product_p80_um: 100 });
  assert.ok(rel(inf.specific_energy_kwh_st, 13, 1e-9), "definition of Wi");
  const a = computeBondWorkIndexPower({ work_index_kwh_st: 13, feed_f80_um: 10000, product_p80_um: 1000 });
  const b = computeBondWorkIndexPower({ work_index_kwh_st: 13, feed_f80_um: 1000, product_p80_um: 75 });
  const whole = computeBondWorkIndexPower({ work_index_kwh_st: 13, feed_f80_um: 10000, product_p80_um: 75, feed_rate_stph: 100 });
  assert.ok(rel(a.specific_energy_kwh_st + b.specific_energy_kwh_st, whole.specific_energy_kwh_st, 1e-12));
  // 1 hp = 745.699872 W (exact mechanical horsepower).
  assert.ok(rel(whole.power_hp, whole.power_kw * 1000 / 745.699872, 1e-12));
  const inv = computeBondWorkIndexPower({ work_index_kwh_st: 13, feed_f80_um: 10000, product_p80_um: 75, feed_rate_stph: 100, available_kw: whole.power_kw });
  assert.ok(rel(inv.achievable_p80_um, 75, 1e-9));
});

// circulating-load-ratio. Synthetic circuit with known tonnages: overflow O = 100 tph at o = 70%
// passing, underflow U = 250 tph at u = 25%. The classifier feed assay is the mass-weighted mix,
// f = (O o + U u)/(O + U); the tile must recover U/O = 2.5 and the tonnages from the assays alone.
test("circulating-load-ratio: recovers a synthetic circuit's underflow tonnage from the mixed assay", () => {
  for (const [O, U, o, u] of [[100, 250, 70, 25], [80, 280, 55, 12], [150, 150, 90, 40]]) {
    const f = (O * o + U * u) / (O + U);
    const r = computeCirculatingLoadRatio({ feed_pct: f, overflow_pct: o, underflow_pct: u, new_feed_stph: O });
    assert.ok(rel(r.circulating_load_ratio, U / O, 1e-12), `U/O ${U / O}`);
    assert.ok(rel(r.underflow_stph, U, 1e-12) && rel(r.classifier_feed_stph, O + U, 1e-12));
  }
});

// screen-efficiency. Synthetic screen with known tonnages per size class: 200 tph feed at 40%
// fines = 80 t fines + 120 t coarse; the undersize product takes 73.5 t fines + 1.5 t coarse.
// Then o and u follow from the products; recovery and rejection come straight from tonnages.
test("screen-efficiency: matches a tonnage-by-size-class mass balance", () => {
  for (const [fines, coarse, uFines, uCoarse] of [[80, 120, 73.5, 1.5], [50, 150, 40, 0], [120, 30, 110, 6]]) {
    const F = fines + coarse, U = uFines + uCoarse, O = F - U;
    const f = fines / F, u = uFines / U, o = (fines - uFines) / O;
    const r = computeScreenEfficiency({ feed_undersize_pct: f * 100, oversize_undersize_pct: o * 100, undersize_undersize_pct: u * 100, feed_stph: F });
    const recovery = uFines / fines * 100;
    const rejection = (coarse - uCoarse) / coarse * 100;
    assert.ok(rel(r.undersize_stph, U, 1e-12), "undersize tonnage");
    assert.ok(rel(r.undersize_recovery_pct, recovery, 1e-12), `recovery ${recovery}`);
    assert.ok(rel(r.oversize_efficiency_pct, rejection, 1e-12), `rejection ${rejection}`);
    assert.ok(rel(r.overall_efficiency_pct, recovery * rejection / 100, 1e-12));
  }
});

// pulp-density-solids. Build the slurry from volumes: 100 st/h of SG 2.7 solids in 150 st/h of
// water. Volumes add (solids 100/2.7, water 150/1), mass 250 -> pulp SG = 250/(100/2.7 + 150) and
// w = 40%. Slurry gpm from volumes directly: lb/h / (SG x 62.428 lb/ft3) x 7.48052 gal/ft3 / 60.
test("pulp-density-solids: a slurry built from component volumes; both directions and the gpm agree", () => {
  const Ss = 2.7, solids = 100, water = 150;
  const vol = solids / Ss + water;
  const Sp = (solids + water) / vol;
  const r = computePulpDensitySolids({ solids_sg: Ss, percent_solids_wt: 40, liquid_sg: 1.0, dry_solids_stph: solids });
  assert.ok(rel(r.pulp_sg_out, Sp, 1e-12), `SG ${r.pulp_sg_out} vs ${Sp}`);
  assert.ok(rel(r.percent_solids_vol, (solids / Ss) / vol * 100, 1e-12));
  assert.ok(rel(r.water_stph, water, 1e-12));
  const gpm = ((solids * 2000) / (Ss * 62.428) + (water * 2000) / 62.428) * 7.48052 / 60;
  assert.ok(rel(r.slurry_gpm, gpm, 1e-5), `gpm ${r.slurry_gpm} vs ${gpm}`);
  const back = computePulpDensitySolids({ solids_sg: Ss, pulp_sg: Sp, liquid_sg: 1.0 });
  assert.ok(rel(back.percent_solids_out, 40, 1e-12));
  // A brine (SG 1.2) carrier: built the same way.
  const brine = computePulpDensitySolids({ solids_sg: 3.0, percent_solids_wt: 30, liquid_sg: 1.2 });
  assert.ok(rel(brine.pulp_sg_out, 100 / (30 / 3.0 + 70 / 1.2), 1e-12));
});

// friction-hoist-traction. The capstan limit by integrating its ODE dT/dtheta = mu T over the wrap
// (RK4), not by the closed form; e^(0.25 pi) = 2.1933 at mu 0.25 and a half wrap. Tensions from
// Newton's second law on each side; the slip acceleration by bisection on the dynamic ratio.
test("friction-hoist-traction: capstan ODE, Newton's-law tensions, and bisected slip acceleration agree", () => {
  const ex = { loaded_conveyance_lb: 20000, payload_lb: 30000, opposite_side_lb: 20000, head_rope_lb_ft: 24, tail_rope_lb_ft: 24, depth_ft: 3000, friction_coefficient: 0.25, wrap_deg: 180, acceleration_ft_s2: 3 };
  const r = computeFrictionHoistTraction(ex);
  let T = 1;
  const n = 10000, h = Math.PI / n, mu = 0.25;
  for (let i = 0; i < n; i++) { const k1 = mu * T, k2 = mu * (T + h * k1 / 2), k3 = mu * (T + h * k2 / 2), k4 = mu * (T + h * k3); T += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); }
  assert.ok(rel(r.slip_limit_ratio, T, 1e-10) && rel(T, 2.1933, 1e-4));
  // Balanced head and tail ropes: each side carries 72,000 lb of rope at either end of the wind.
  const hi = 50000 + 72000, lo = 20000 + 72000, g = 32.174, m = (W) => W / g;
  assert.ok(rel(r.static_ratio, hi / lo, 1e-12));
  // Newton: heavy side accelerating up, T - W = m a; light side accelerating down, W - T = m a.
  const Thi = hi + m(hi) * 3, Tlo = lo - m(lo) * 3;
  assert.ok(rel(r.dynamic_ratio, Thi / Tlo, 1e-12));
  let a0 = 0, a1 = g * 0.999;
  for (let i = 0; i < 200; i++) { const a = (a0 + a1) / 2; ((hi + m(hi) * a) / (lo - m(lo) * a) < T ? (a0 = a) : (a1 = a)); }
  assert.ok(rel(r.max_acceleration_ft_s2, a0, 1e-9), `${r.max_acceleration_ft_s2} vs bisected ${a0}`);
  // Unbalanced (no tail ropes): the worse end of the wind is loaded-at-bottom with all the head rope on the heavy side.
  const nt = computeFrictionHoistTraction({ ...ex, tail_rope_lb_ft: 0 });
  assert.ok(rel(nt.static_ratio, (50000 + 72000) / 20000, 1e-12));
});
