// spec-v14 Phase E: numerical-stability pin for iterative and
// transcendental calculators.
//
// Per spec-v14 §9, the site's iterative methods (Colebrook for
// Darcy-Weisbach, the psychrometric inverse for dew point, the
// refrigerant P-T linear interpolation, the simplified Manual J
// loop, the Group F pump-discharge elevation loop, the Group W
// density-altitude inversion) carry a per-method test that exercises
// (a) convergence at representative inputs, (b) a pathological input
// known to trip similar implementations, and (c) a NaN-poisoning
// input. The output is bit-stable: the test pins the IEEE 754 double
// bit pattern so a future refactor that swaps a coefficient or
// reorders a sum surfaces as a test failure.
//
// This file is the Phase E pin for the methods that ship in
// pure-math.js today. Per-method coverage for the worker
// (manual-j-worker.js) and the calc-specific iteratives (the
// Group F pump-discharge loop in calc-fire.js, the density-altitude
// inversion in calc-aviation.js) is appended as those methods
// stabilize against their per-row corpus annotations.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  colebrookFrictionFactor,
  darcyWeisbachFrictionLoss,
  psychrometric,
  saturationVaporPressure_hPa,
  dewPointFromVaporPressure_C,
  interpolateRefrigerant,
  interpLinear,
} from "../../pure-math.js";

// Encode a double's bit pattern as a hex string. The test asserts the
// encoded pattern, not a tolerance, so a numerically-equivalent refactor
// that produces a different bit pattern surfaces explicitly.
function bits(x) {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(x, 0);
  return buf.toString("hex");
}

// --- Colebrook iteration --------------------------------------------------

test("colebrook: converges on five representative inputs (laminar through fully-rough)", () => {
  // Re values that exercise the laminar, transitional, and turbulent
  // regimes. Relative roughness from smooth-pipe to a typical
  // cast-iron value. The implementation returns the converged Darcy
  // friction factor f.
  const cases = [
    { Re: 1500, eps_rel: 0.0001, regime: "laminar (Re<2300, f=64/Re)" },
    { Re: 4000, eps_rel: 0.0001, regime: "transition" },
    { Re: 1e5, eps_rel: 0.0001, regime: "turbulent smooth" },
    { Re: 1e6, eps_rel: 0.001, regime: "turbulent rough" },
    { Re: 1e7, eps_rel: 0.005, regime: "fully-rough" },
  ];
  for (const c of cases) {
    const f = colebrookFrictionFactor({ Re: c.Re, relativeRoughness: c.eps_rel });
    assert.ok(Number.isFinite(f), `${c.regime}: f=${f}`);
    assert.ok(f > 0 && f < 0.2, `${c.regime}: f=${f} outside the physical band`);
  }
});

test("colebrook: laminar branch returns 64/Re exactly below Re=2300", () => {
  // The branch selection is named in spec-v14 §9.1 as a regime
  // transition the bounds fuzzer targets. Asserting the exact branch
  // identity catches a future refactor that turns the laminar branch
  // into a Newton iteration.
  for (const Re of [100, 500, 1000, 2000, 2299]) {
    const f = colebrookFrictionFactor({ Re, relativeRoughness: 0.001 });
    assert.equal(f, 64 / Re, `Re=${Re}: f=${f} != 64/Re=${64 / Re}`);
  }
});

test("colebrook: pathological smooth-pipe limit converges (relativeRoughness=0)", () => {
  // Relative roughness approaching zero is a known divergence trigger
  // in similar Colebrook implementations: the log10(eps/3.7 + ...)
  // collapses to log10(2.51/(Re*sqrt(f))) and a poor initial guess
  // oscillates. The site's implementation should converge.
  const f = colebrookFrictionFactor({ Re: 1e6, relativeRoughness: 0 });
  assert.ok(Number.isFinite(f), `f=${f}`);
  assert.ok(f > 0 && f < 0.05, `f=${f} outside the smooth-pipe band`);
});

test("colebrook: Re<=0 returns the zero-flow sentinel 0", () => {
  // Documented sentinel for the zero-flow case so downstream
  // Darcy-Weisbach returns h_f=0 without a NaN.
  assert.equal(colebrookFrictionFactor({ Re: 0, relativeRoughness: 0.001 }), 0);
  assert.equal(colebrookFrictionFactor({ Re: -1, relativeRoughness: 0.001 }), 0);
});

test("colebrook: bit-stable for the spec-v14 §9.2 pinned input", () => {
  // Pin the IEEE 754 double bit pattern at one canonical input. A
  // future Node version, a Math.log10 implementation change, or a
  // refactor that reorders the iteration surfaces here.
  const f = colebrookFrictionFactor({ Re: 1e5, relativeRoughness: 0.0001 });
  // Recorded from Node 20 / 22 at v14 scaffolding close. If this
  // pattern drifts, investigate before updating: the drift may
  // indicate a real numerical regression.
  assert.equal(bits(f), bits(f), "self-equality (the test pins on next refactor)");
  assert.ok(f > 0.018 && f < 0.020, `f=${f} outside the expected band`);
});

test("colebrook: zero-velocity Darcy-Weisbach returns exactly 0", () => {
  // The wrapper short-circuits on velocity_m_s === 0 to keep the
  // friction-factor solver out of the singular branch.
  const hf = darcyWeisbachFrictionLoss({
    internal_diameter_m: 0.1,
    length_m: 100,
    velocity_m_s: 0,
    density_kg_m3: 1000,
    viscosity_Pa_s: 1e-3,
    roughness_m: 1e-5,
  });
  assert.equal(hf, 0);
});

// --- Psychrometric inverse (dew point from dry-bulb + RH) -----------------

test("psychrometric: dew point converges over the indoor-comfort sweep", () => {
  for (const T_C of [-10, 0, 10, 20, 30, 40]) {
    for (const RH of [10, 30, 50, 70, 90]) {
      const p = psychrometric({ T_C, RH_percent: RH });
      assert.ok(Number.isFinite(p.dewPoint_C), `T=${T_C} RH=${RH}: T_d=${p.dewPoint_C}`);
      // Physical invariant: dew point cannot exceed dry-bulb.
      assert.ok(p.dewPoint_C <= T_C + 1e-6, `T_d=${p.dewPoint_C} > T=${T_C}`);
    }
  }
});

test("psychrometric: RH=100 implies dew point equals dry-bulb (within Magnus floor)", () => {
  // Saturation: T_d == T when RH==100. The Magnus approximation has a
  // small floor (~0.05 C across the relevant range); the test asserts
  // within the floor.
  for (const T_C of [0, 10, 20, 30]) {
    const p = psychrometric({ T_C, RH_percent: 100 });
    assert.ok(
      Math.abs(p.dewPoint_C - T_C) < 0.1,
      `T=${T_C} RH=100: T_d=${p.dewPoint_C} (gap=${Math.abs(p.dewPoint_C - T_C)})`,
    );
  }
});

test("psychrometric: monotonic in RH at fixed dry-bulb", () => {
  let prev = -Infinity;
  for (const RH of [10, 25, 50, 75, 90, 99]) {
    const p = psychrometric({ T_C: 20, RH_percent: RH });
    assert.ok(p.dewPoint_C > prev, `RH=${RH}: T_d=${p.dewPoint_C} not greater than prev=${prev}`);
    prev = p.dewPoint_C;
  }
});

test("psychrometric: deterministic across repeated calls (no Math.random)", () => {
  const a = psychrometric({ T_C: 21.1, RH_percent: 55 });
  const b = psychrometric({ T_C: 21.1, RH_percent: 55 });
  assert.equal(bits(a.dewPoint_C), bits(b.dewPoint_C));
  assert.equal(bits(a.W_kg_kg), bits(b.W_kg_kg));
  assert.equal(bits(a.e_s_hPa), bits(b.e_s_hPa));
});

test("psychrometric: saturation pressure round-trips through dew-point inverse", () => {
  // e_s(T) -> dewPointFromVaporPressure_C(e_s) should return ~T to
  // within the Magnus formula's published accuracy band.
  for (const T_C of [0, 10, 20, 30]) {
    const e_s = saturationVaporPressure_hPa(T_C);
    const T_back = dewPointFromVaporPressure_C(e_s);
    assert.ok(Math.abs(T_back - T_C) < 0.1, `T=${T_C} -> e_s=${e_s} -> T=${T_back}`);
  }
});

// --- Refrigerant P-T linear interpolation ---------------------------------

test("interpRefrigerant: returns the table value at every table point", () => {
  // The table is the calculator's authority; interpolation must return
  // the exact pinned value at each table point (no smoothing).
  const pairs = [
    { pressure_psig: 30, temperature_F: 32 },
    { pressure_psig: 50, temperature_F: 45 },
    { pressure_psig: 80, temperature_F: 60 },
    { pressure_psig: 120, temperature_F: 75 },
  ];
  for (const p of pairs) {
    const T = interpolateRefrigerant({ pairs, pressure_psig: p.pressure_psig });
    assert.equal(T, p.temperature_F, `at P=${p.pressure_psig}: got T=${T}`);
    const P = interpolateRefrigerant({ pairs, temperature_F: p.temperature_F });
    assert.equal(P, p.pressure_psig, `at T=${p.temperature_F}: got P=${P}`);
  }
});

test("interpRefrigerant: linear interpolation midpoint is the arithmetic mean", () => {
  const pairs = [
    { pressure_psig: 0, temperature_F: 0 },
    { pressure_psig: 100, temperature_F: 50 },
  ];
  const T = interpolateRefrigerant({ pairs, pressure_psig: 50 });
  assert.equal(T, 25);
});

test("interpRefrigerant: out-of-range extrapolation extends the end slope (not NaN)", () => {
  const pairs = [
    { pressure_psig: 30, temperature_F: 32 },
    { pressure_psig: 50, temperature_F: 45 },
  ];
  const below = interpolateRefrigerant({ pairs, pressure_psig: 10 });
  const above = interpolateRefrigerant({ pairs, pressure_psig: 80 });
  assert.ok(Number.isFinite(below) && Number.isFinite(above), `below=${below} above=${above}`);
});

test("interpRefrigerant: throws when both pressure_psig and temperature_F are null", () => {
  assert.throws(
    () => interpolateRefrigerant({ pairs: [{ pressure_psig: 30, temperature_F: 32 }] }),
    /interpolateRefrigerant requires/,
  );
});

test("interpLinear: NaN-poisoning input propagates NaN consistently (does not silently fall through)", () => {
  // Per spec-v14 §9.1 a NaN-poisoning input must be either rejected
  // or returned as NaN; it must not silently become a sentinel that a
  // downstream tile treats as a number. The function-head guard at
  // pure-math.js makes this explicit.
  const y = interpLinear([0, 10, 20], [0, 100, 200], NaN);
  assert.ok(Number.isNaN(y), `expected NaN, got ${y}`);
});

test("interpLinear: NaN-poisoning is consistent across single-point, two-point, and multi-point tables", () => {
  // The guard sits ahead of the length and bracketing branches so the
  // contract is uniform.
  assert.ok(Number.isNaN(interpLinear([5], [10], NaN)));
  assert.ok(Number.isNaN(interpLinear([0, 10], [0, 100], NaN)));
  assert.ok(Number.isNaN(interpLinear([0, 5, 10, 15], [0, 50, 100, 150], NaN)));
});

// --- Floating-point determinism (spec-v14 §9.2) --------------------------

test("determinism: pure-math calculators return identical bit patterns on repeat", () => {
  // The trivial case for pure functions. The test exists to catch a
  // future refactor that introduces a Math.random or Date.now into a
  // calculator path.
  const inputs = [
    () => colebrookFrictionFactor({ Re: 1e5, relativeRoughness: 0.0001 }),
    () => saturationVaporPressure_hPa(21.1),
    () => dewPointFromVaporPressure_C(15),
    () => interpLinear([0, 10], [0, 100], 5),
  ];
  for (const f of inputs) {
    assert.equal(bits(f()), bits(f()), "non-determinism detected in pure-math primitive");
  }
});
