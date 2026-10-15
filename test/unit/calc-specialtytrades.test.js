// calc-specialtytrades.js against references the specs did not write. The
// worked-example fixture recomputes each spec's own example, so a spec and its
// tile that share an error agree with each other; these tests hold the tiles
// to independent statics instead.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMastClimberPlatformLoad } from "../../calc-specialtytrades.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- mast-climber-platform-load: statics of the mast between two tie levels ----

const MCPL = { platform_length_ft: 40, cantilever_length_ft: 8, rated_capacity_lb: 6000, zone_rated_capacity_lb: 1500, load_lb: 5200, load_centroid_ft: 16, tie_spacing_ft: 25, tie_capacity_lb: 4000 };

test("mast climber: the tie force is the reaction pair of a mast span carrying the platform couple", () => {
  // Independent model: the mast between two tie levels s apart is a beam on two
  // horizontal supports, and the eccentric platform load puts a couple M = P e on
  // it. Equilibrium -- sum of forces R1 + R2 = 0, moments about the lower tie
  // R2 s + M = 0 -- gives tie reactions of M / s, equal and opposite, wherever
  // between the ties the platform sits (a couple's moment is the same about any point).
  for (const [P, e, s] of [[5200, 16, 25], [1000, 12, 20], [3000, 19.5, 13]]) {
    const r = computeMastClimberPlatformLoad({ ...MCPL, load_lb: P, load_centroid_ft: e, tie_spacing_ft: s });
    const M = P * e;
    const R2 = -M / s, R1 = -R2;
    within(r.tie_force_lb, R1, 1e-9, `tie force, P=${P} e=${e} s=${s}`);
    within(r.moment_ft_lb, M, 1e-9, "moment about the mast");
  }
});

test("mast climber: an evenly spread load has no moment about a centre mast (numerical integration)", () => {
  // The tile's 'same load spread evenly' line: integrate w x dx over -L/2..L/2.
  const L = MCPL.platform_length_ft, w = MCPL.load_lb / L, steps = 4000;
  let m = 0;
  for (let i = 0; i < steps; i++) { const x = -L / 2 + (i + 0.5) * L / steps; m += w * x * L / steps; }
  assert.ok(Math.abs(m) < 1e-6, `integral ${m}`);
  assert.equal(computeMastClimberPlatformLoad(MCPL).distributed_moment_ft_lb, 0);
  // And the half-platform resultant sits at L/4, as the code comment says: each half's moment is w(L/2)(L/4).
  let half = 0;
  for (let i = 0; i < steps; i++) { const x = (i + 0.5) * (L / 2) / steps; half += w * x * (L / 2) / steps; }
  within(half, w * (L / 2) * (L / 4), 1e-6, "half-platform moment");
});

test("mast climber: moment and tie force scale with load and arm; the tie force is inverse in the spacing", () => {
  const base = computeMastClimberPlatformLoad(MCPL);
  within(computeMastClimberPlatformLoad({ ...MCPL, load_lb: 2600 }).moment_ft_lb / base.moment_ft_lb, 0.5, 1e-9, "linear in load");
  within(computeMastClimberPlatformLoad({ ...MCPL, load_centroid_ft: 8 }).moment_ft_lb / base.moment_ft_lb, 0.5, 1e-9, "linear in arm");
  within(computeMastClimberPlatformLoad({ ...MCPL, tie_spacing_ft: 50 }).tie_force_lb / base.tie_force_lb, 0.5, 1e-9, "inverse in spacing");
  const centred = computeMastClimberPlatformLoad({ ...MCPL, load_centroid_ft: 0 });
  assert.equal(centred.moment_ft_lb, 0);
  assert.equal(centred.tie_force_lb, 0);
});

test("mast climber: the cantilever starts where the mast bay ends, at L/2 - cantilever", () => {
  // 40 ft platform, 8 ft ends: the mast bay is +/-12 ft, the cantilever 12..20 ft.
  const at = (e) => computeMastClimberPlatformLoad({ ...MCPL, load_centroid_ft: e });
  assert.equal(at(11.99).on_cantilever, false);
  assert.equal(at(12).on_cantilever, false);
  assert.equal(at(12.01).on_cantilever, true);
  assert.equal(at(20).on_cantilever, true);
  assert.equal(at(11.99).max_load_at_position_lb, 6000, "the mast bay carries the platform rating");
  assert.equal(at(12.01).max_load_at_position_lb, 1500, "a cantilever end carries its zone rating");
  assert.equal(computeMastClimberPlatformLoad({ ...MCPL, cantilever_length_ft: 0, load_centroid_ft: 20 }).on_cantilever, false, "no cantilever, no cantilever zone");
});
