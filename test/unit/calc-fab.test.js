// Independent checks for calc-fab.js tiles whose only other coverage is the
// project's own derivation (hardening, 2026-10-15). Each test holds the compute
// to something its derivation did not write: a constant re-derived from its
// definition, the standard's own component form, a brute-force count, a
// numerical integration, or an invariant.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeWireFeedSpeedForDeposition, computeBarstockCutlist, computeWeldDilution,
  computeWeldCoolingRateT85, computeInterpassTemperatureControl, computeWeldPreheatCet,
} from "../../calc-fab.js";

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// ---- wire-feed-speed-for-deposition ----
// Carbon steel 7.85 g/cm^3 converted by exact factors (1 in^3 = 16.387064 cm^3,
// 1 lb = 453.59237 g) gives 0.28360 lb/in^3; the deposit the returned WFS lays
// down, recomputed from that density, must be the target.
test("wire-feed-speed-for-deposition: the WFS lays down the target at 7.85 g/cm^3 steel", () => {
  const rho = 7.85 * 16.387064 / 453.59237; // lb/in^3
  for (const [dep, dia, eff] of [[6, 0.035, 0.92], [12, 0.045, 0.85], [20, 0.0625, 0.95], [3, 0.030, 1]]) {
    const r = computeWireFeedSpeedForDeposition({ target_deposit_lb_hr: dep, wire_dia_in: dia, deposition_eff: eff });
    const laid = r.wfs_in_min * 60 * Math.PI * dia * dia / 4 * rho * eff;
    assert.ok(rel(laid, dep) < 2e-4, `${dia}: ${laid} vs ${dep}`);
    assert.ok(rel(r.melt_lb_hr * eff, dep) < 1e-12);
  }
});
test("wire-feed-speed-for-deposition: feed speed scales as 1/diameter^2 and 1/efficiency", () => {
  const a = computeWireFeedSpeedForDeposition({ target_deposit_lb_hr: 6, wire_dia_in: 0.035, deposition_eff: 0.9 }).wfs_in_min;
  const b = computeWireFeedSpeedForDeposition({ target_deposit_lb_hr: 6, wire_dia_in: 0.07, deposition_eff: 0.9 }).wfs_in_min;
  const c = computeWireFeedSpeedForDeposition({ target_deposit_lb_hr: 6, wire_dia_in: 0.035, deposition_eff: 0.45 }).wfs_in_min;
  assert.ok(rel(a / b, 4) < 1e-12);
  assert.ok(rel(c / a, 2) < 1e-12);
});

// ---- barstock-cutlist ----
// Brute force in thousandths: saw pieces off the stick one at a time, taking a
// kerf only when another piece follows, then use sticks until the order is met.
test("barstock-cutlist: pieces, drop and sticks match a cut-by-cut simulation", () => {
  // 59.90625 x 4 + 3 kerfs is exactly 240: four pieces, zero drop.
  const cases = [[240, 14.5, 0.125, 100], [240, 59.90625, 0.125, 9], [144, 12, 0.0625, 37], [240, 23.875, 0.125, 50], [240, 239.9, 0.125, 3], [96, 8, 0.125, 25], [120, 10, 0, 24]];
  for (const [S, P, K, need] of cases) {
    const s = Math.round(S * 1e5), p = Math.round(P * 1e5), k = Math.round(K * 1e5);
    let left = s, n = 0;
    while (left >= p) { n++; left -= p; if (left >= k + p) left -= k; else break; }
    const r = computeBarstockCutlist({ stock_length_in: S, piece_length_in: P, kerf_in: K, pieces_needed: need });
    assert.equal(r.pieces_per_stick, n, `${S}/${P}/${K}`);
    assert.ok(Math.abs(r.drop_per_stick_in - left / 1e5) < 1e-6, `drop ${r.drop_per_stick_in} vs ${left / 1e5}`);
    let sticks = 0, made = 0;
    while (made < need) { sticks++; made += n; }
    assert.equal(r.sticks_needed, sticks);
    assert.ok(Math.abs(r.yield_pct - need * P / (sticks * S) * 100) < 1e-9);
  }
});

// ---- weld-dilution ----
// Dilution measured by chemistry (the deposit-composition method): for an
// element present only in the filler, D = (C_filler - C_deposit) / C_filler. A
// cross section with 0.03 in^2 melted base and 0.05 in^2 of 18% Cr filler mixes
// to 0.05 x 18 / 0.08 = 11.25% Cr, so D = (18 - 11.25) / 18 = 37.5%.
test("weld-dilution: area dilution equals dilution measured from deposit chemistry", () => {
  for (const [ab, af] of [[0.03, 0.05], [0.01, 0.09], [0.2, 0.1]]) {
    const cDep = (ab * 0 + af * 18) / (ab + af);
    const dChem = (18 - cDep) / (18 - 0) * 100;
    const r = computeWeldDilution({ A_base: ab, A_filler: af });
    assert.ok(Math.abs(r.dilution_pct - dChem) < 1e-9);
    assert.ok(Math.abs(r.dilution_pct + r.filler_share_pct - 100) < 1e-12);
  }
  assert.ok(Math.abs(computeWeldDilution({ A_base: 0.03, A_filler: 0.05 }).dilution_pct - 37.5) < 1e-9);
  // Scale-free: the same cross section drawn 10x larger has the same dilution.
  assert.ok(Math.abs(computeWeldDilution({ A_base: 0.3, A_filler: 0.5 }).dilution_pct - 37.5) < 1e-9);
});

// ---- weld-cooling-rate-t85 ----
// EN 1011-2 prints the transition thickness in its own closed form,
// d_t = sqrt( (4300 - 4.3 T0) x 1e5 / (6700 - 5 T0) x Q x [1/(500 - T0) + 1/(800 - T0)] ),
// which the code does not use; at d_t the 2D and 3D times must coincide.
test("weld-cooling-rate-t85: transition thickness matches the EN 1011-2 closed form and the two regimes meet there", () => {
  for (const [Q, T0] of [[1.0, 20], [2.5, 150], [0.6, 100], [1.8, 0]]) {
    const dt = Math.sqrt((4300 - 4.3 * T0) * 1e5 / (6700 - 5 * T0) * Q * (1 / (500 - T0) + 1 / (800 - T0)));
    const r = computeWeldCoolingRateT85({ heat_input_kj_mm: Q, preheat_c: T0, thickness_mm: 12 });
    assert.ok(rel(r.transition_mm, dt) < 1e-9, `Q ${Q} T0 ${T0}: ${r.transition_mm} vs ${dt}`);
    const at = computeWeldCoolingRateT85({ heat_input_kj_mm: Q, preheat_c: T0, thickness_mm: dt });
    assert.ok(rel(at.t85_2d_s, at.t85_3d_s) < 1e-9);
  }
  // Q = 1 kJ/mm, T0 = 20 C: d_t = 14.66 mm.
  assert.ok(Math.abs(computeWeldCoolingRateT85({ heat_input_kj_mm: 1, preheat_c: 20, thickness_mm: 10 }).transition_mm - 14.66) < 0.01);
});
test("weld-cooling-rate-t85: 3D is independent of thickness and linear in Q; 2D goes as Q^2/d^2; the larger governs", () => {
  const a = computeWeldCoolingRateT85({ heat_input_kj_mm: 1, preheat_c: 20, thickness_mm: 30 });
  const b = computeWeldCoolingRateT85({ heat_input_kj_mm: 1, preheat_c: 20, thickness_mm: 60 });
  const c = computeWeldCoolingRateT85({ heat_input_kj_mm: 2, preheat_c: 20, thickness_mm: 60 });
  assert.equal(a.t85_3d_s, b.t85_3d_s);
  assert.ok(rel(c.t85_3d_s, 2 * b.t85_3d_s) < 1e-12);
  assert.ok(rel(a.t85_2d_s, 4 * b.t85_2d_s) < 1e-12);
  assert.ok(rel(c.t85_2d_s, 4 * b.t85_2d_s) < 1e-12);
  for (const r of [a, b, c]) assert.equal(r.governing_s, Math.max(r.t85_2d_s, r.t85_3d_s));
  // A thin plate (below d_t) is two-dimensional and cools SLOWER than the thick-plate figure.
  const thin = computeWeldCoolingRateT85({ heat_input_kj_mm: 1, preheat_c: 20, thickness_mm: 8 });
  assert.equal(thin.two_dimensional, true);
  assert.ok(thin.t85_2d_s > thin.t85_3d_s);
});

// ---- interpass-temperature-control ----
// Independent method: integrate Newton's law dT/dt = -(T - Ta)/tau with a
// small-step RK4 march and time the crossings, rather than using the log form.
function marchTo(T0, Ta, tau, target) {
  const h = 1e-3; let T = T0, t = 0;
  const f = (x) => -(x - Ta) / tau;
  while (T > target) {
    const k1 = f(T), k2 = f(T + h / 2 * k1), k3 = f(T + h / 2 * k2), k4 = f(T + h * k3);
    const Tn = T + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
    if (Tn <= target) return t + h * (T - target) / (T - Tn);
    T = Tn; t += h;
  }
  return t;
}
test("interpass-temperature-control: idle allowance and wait match a numerically integrated cooling curve", () => {
  const base = { tau_min: 12, ambient_f: 70, preheat_min_f: 200, interpass_max_f: 500, restart_temp_f: 200, elapsed_min: 0 };
  const idle = computeInterpassTemperatureControl({ ...base, current_temp_f: 300 });
  assert.ok(Math.abs(idle.idle_allowance_min - marchTo(300, 70, 12, 200)) < 1e-3);
  const hot = computeInterpassTemperatureControl({ ...base, current_temp_f: 600, restart_temp_f: 500 });
  assert.ok(Math.abs(hot.required_wait_min - marchTo(600, 70, 12, 500)) < 1e-3);
  const proj = computeInterpassTemperatureControl({ ...base, current_temp_f: 600, elapsed_min: 7.5 });
  // Temperature after 7.5 min by the same march: solve for the time to reach the reported temp.
  assert.ok(Math.abs(marchTo(600, 70, 12, proj.temp_at_elapsed_f) - 7.5) < 1e-3);
  // A joint already inside the window waits nothing.
  assert.equal(computeInterpassTemperatureControl({ ...base, current_temp_f: 450 }).required_wait_min, 0);
});

// ---- weld-preheat-cet ----
// EN 1011-2 Annex C (Method B) writes the preheat as a SUM of four separately
// printed terms; adding them is a different route to the combined equation:
//   Tp,CET = 750 CET - 150;  Tp,d = 160 tanh(d/35) - 110;
//   Tp,HD = 62 HD^0.35 - 100; Tp,Q = (53 CET - 32) Q - 53 CET + 32.
test("weld-preheat-cet: preheat equals the sum of the four EN 1011-2 component terms", () => {
  for (const inp of [
    { c: 0.18, mn: 1.4, mo: 0, cr: 0, cu: 0.2, ni: 0.1, thickness_in: 1.25, hydrogen_ml_100g: 5, arc_energy_kj_in: 40, arc_efficiency: 0.8 },
    { c: 0.12, mn: 1.2, mo: 0.2, cr: 0.3, cu: 0.1, ni: 0.8, thickness_in: 3, hydrogen_ml_100g: 10, arc_energy_kj_in: 60, arc_efficiency: 1.0 },
    { c: 0.22, mn: 0.9, mo: 0, cr: 0, cu: 0, ni: 0, thickness_in: 0.5, hydrogen_ml_100g: 2, arc_energy_kj_in: 25, arc_efficiency: 0.8 },
  ]) {
    const cet = inp.c + (inp.mn + inp.mo) / 10 + (inp.cr + inp.cu) / 20 + inp.ni / 40;
    const d = inp.thickness_in * 25.4, Q = inp.arc_energy_kj_in * inp.arc_efficiency / 25.4;
    const tp = (750 * cet - 150) + (160 * Math.tanh(d / 35) - 110) + (62 * inp.hydrogen_ml_100g ** 0.35 - 100) + ((53 * cet - 32) * Q - 53 * cet + 32);
    const r = computeWeldPreheatCet(inp);
    assert.ok(Math.abs(r.cet - cet) < 1e-12);
    assert.ok(Math.abs(r.preheat_c - tp) < 1e-9, `${r.preheat_c} vs ${tp}`);
    assert.ok(Math.abs(r.preheat_f - (tp * 1.8 + 32)) < 1e-9);
  }
});
test("weld-preheat-cet: at Q = 1 kJ/mm a CET 0.01 higher raises the preheat 7.5 C (EN 1011-2), and more heat input lowers it", () => {
  // Q = 31.75 kJ/in x 0.8 / 25.4 = 1.000 kJ/mm.
  const base = { c: 0.15, mn: 1.0, mo: 0, cr: 0, cu: 0, ni: 0, thickness_in: 1, hydrogen_ml_100g: 5, arc_energy_kj_in: 31.75, arc_efficiency: 0.8 };
  const a = computeWeldPreheatCet(base), b = computeWeldPreheatCet({ ...base, c: 0.16 });
  assert.ok(Math.abs(a.heat_input_kj_mm - 1) < 1e-12);
  assert.ok(Math.abs(b.preheat_c - a.preheat_c - 7.5) < 1e-9);
  const hotter = computeWeldPreheatCet({ ...base, arc_energy_kj_in: 63.5 });
  assert.ok(hotter.preheat_c < a.preheat_c);
  const thicker = computeWeldPreheatCet({ ...base, thickness_in: 2 });
  assert.ok(thicker.preheat_c > a.preheat_c);
});

// spec-v1979 / spec-v1980: walk the tube shot by shot instead of trusting the formulas.
import { computeConduitSegmentBend, computeConduitConcentricBend } from "../../calc-fab.js";
function walkShots(markSpacing, n, phiRad) {
  // Half an interval, then n turns of phi separated by full intervals, then half an interval.
  let x = 0, y = 0, a = 0;
  const step = (len) => { x += len * Math.cos(a); y += len * Math.sin(a); };
  step(markSpacing / 2);
  for (let k = 0; k < n; k++) { a += phiRad; step(k < n - 1 ? markSpacing : markSpacing / 2); }
  return { x, y, a };
}
test("conduit-segment-bend: a shot-by-shot walk of the tube ends on the bend angle, and its tangent intersection gives the reported gain", () => {
  const r = computeConduitSegmentBend({ radius_in: 36, bend_angle_deg: 90, shots: 9 });
  const w = walkShots(r.mark_spacing_in, 9, Math.PI / 18);
  assert.ok(Math.abs(w.a - Math.PI / 2) < 1e-12);
  // Incoming tangent is the x axis; outgoing is vertical through the end point, so the
  // intersection is at (w.x, 0) and both tangent legs are w.x and w.y long.
  assert.ok(Math.abs(w.x - w.y) < 1e-9, "a symmetric layout");
  assert.ok(Math.abs(w.x + w.y - r.developed_in - r.gain_in) < 1e-9);
  assert.ok(Math.abs(w.x - r.effective_radius_in) < 1e-9, "for a 90 each tangent leg equals the effective radius");
});
test("conduit-concentric-bend: each arc is its radius times the angle, and the extras grow by one pitch-arc per position", () => {
  const r = computeConduitConcentricBend({ inside_radius_in: 10, od_in: 2, gap_in: 1, bend_angle_deg: 60, conduits: 3, shots: 6 });
  const step = 3 * Math.PI / 3;
  r.per_conduit.forEach((c, i) => {
    assert.ok(Math.abs(c.developed_in - (10 + 3 * i) * Math.PI / 3) < 1e-12);
    assert.ok(Math.abs(c.extra_in - i * step) < 1e-12);
  });
  assert.equal(r.rack_width_in, 8);
});
