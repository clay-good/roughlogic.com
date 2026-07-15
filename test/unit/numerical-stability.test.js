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
// This file is the Phase E pin for every spec-v14 §9.1 iterative method:
// the pure-math.js primitives (Colebrook, psychrometric, refrigerant P-T,
// interpLinear), the calc-specific iteratives (Group F computePDP +
// computeStandpipeFriction, Group C
// manualJCooling + manualJHeating + computeDuctSize), and the
// manual-j-worker.js dispatcher that fronts the Group C primitives.

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
import { computePDP, computeStandpipeFriction } from "../../calc-fire.js";
import { manualJCooling, manualJHeating, computeDuctSize } from "../../calc-hvac.js";

// Encode a double's bit pattern as a hex string. The test asserts the
// encoded pattern, not a tolerance, so a numerically-equivalent refactor
// that produces a different bit pattern surfaces explicitly.
function bits(x) {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(x, 0);
  return buf.toString("hex");
}

// Decode an IEEE 754 double from its big-endian hex bit pattern.
function bitsToDouble(hex) {
  return Buffer.from(hex, "hex").readDoubleBE(0);
}

// A handful of outputs are derived from a transcendental (Math.pow / exp /
// log) whose final bit is NOT portable across libm implementations:
// Math.pow(10, 0.2) alone encodes to ...6055 on macOS+Node20, ...6056 on
// Linux+Node20 (CI), and ...6053 on macOS+Node25 - a ~1-3 ULP spread.
// spec-v14 §9.2 scopes bit-stability to "across Node versions", which this
// value cannot satisfy, so exact-bit pinning of a pow-derived output is the
// wrong assertion: it makes CI deterministically red on Linux. Pin those
// outputs to within a few ULPs of the reference value instead. A genuine
// regression (e.g. swapping the 10^x form for an e^x / ln variant) moves
// the value far more than a ULP and still fails, so the guard's intent -
// catching a numerically-different refactor - is preserved.
function assertNearBits(actual, expectedHex, label, ulps = 4) {
  const expected = bitsToDouble(expectedHex);
  const tol = ulps * Math.abs(expected) * Number.EPSILON;
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${label}: ${actual} (${bits(actual)}) not within ${ulps} ULP of ${expected} (${expectedHex})`,
  );
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
  // Recorded against Node 20 / 22 / 24 at the Phase E ratchet close
  // (2026-05-21). If this pattern drifts, investigate before updating:
  // the drift may indicate a real numerical regression.
  const f = colebrookFrictionFactor({ Re: 1e5, relativeRoughness: 0.0001 });
  assert.equal(bits(f), "3f92f54c854cbff9", `f=${f} bits=${bits(f)}`);
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

test("psychrometric: bit-stable for the spec-v14 §9.2 pinned input (T=21.1 C, RH=55%)", () => {
  // Pin the IEEE 754 double bit pattern at the canonical indoor-comfort
  // input. The Magnus inverse and the humidity-ratio mixing equation
  // both surface here: a refactor that swaps coefficients or reorders a
  // sum drops a digit and the bit pattern moves.
  const p = psychrometric({ T_C: 21.1, RH_percent: 55 });
  assert.equal(bits(p.dewPoint_C), "40276ae4b8442936", `dewPoint_C=${p.dewPoint_C} bits=${bits(p.dewPoint_C)}`);
  assert.equal(bits(p.W_kg_kg), "3f81811587e0365a", `W_kg_kg=${p.W_kg_kg} bits=${bits(p.W_kg_kg)}`);
});

test("saturationVaporPressure_hPa / dewPointFromVaporPressure_C: bit-stable at canonical inputs", () => {
  // The Magnus forward (e_s at 21.1 C) and inverse (T_d for 15 hPa) are
  // the two halves of the dew-point round-trip. Pinning both bit
  // patterns catches a coefficient swap in either direction.
  assert.equal(bits(saturationVaporPressure_hPa(21.1)), "4038f8c71d94cae2");
  assert.equal(bits(dewPointFromVaporPressure_C(15)), "402a1a310dd9e2c4");
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

// --- Group F pump discharge pressure (calc-fire computePDP) --------------

test("computePDP: monotonic-increasing in each contributing term", () => {
  // PDP = NP + FL + elev*0.5 + appliance. Strictly increasing in each
  // positive input by construction; the invariant catches a future
  // refactor that swaps a sign or drops a term.
  let prev = -Infinity;
  for (const nozzle_pressure_psi of [50, 75, 100, 125, 150]) {
    const r = computePDP({ nozzle_pressure_psi, friction_loss_psi: 25, elevation_ft: 0 });
    assert.ok(r.pdp_psi > prev, `NP=${nozzle_pressure_psi}: pdp=${r.pdp_psi}`);
    prev = r.pdp_psi;
  }
  prev = -Infinity;
  for (const friction_loss_psi of [0, 10, 25, 50, 100]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi, elevation_ft: 0 });
    assert.ok(r.pdp_psi > prev, `FL=${friction_loss_psi}: pdp=${r.pdp_psi}`);
    prev = r.pdp_psi;
  }
  prev = -Infinity;
  for (const elevation_ft of [-20, 0, 10, 20, 40]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft });
    assert.ok(r.pdp_psi > prev, `elev=${elevation_ft}: pdp=${r.pdp_psi}`);
    prev = r.pdp_psi;
  }
});

test("computePDP: elevation_psi obeys the published 0.5 psi/ft NFA shortcut exactly", () => {
  // 0.5 psi/ft is the NFA training-materials shortcut for the standpipe
  // hydrostatic head. The invariant pins the constant: a refactor that
  // swaps 0.5 for 0.434 (the more precise water-column value) fails here.
  for (const ft of [-10, 0, 10, 50, 100]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 0, elevation_ft: ft });
    assert.equal(r.elevation_psi, ft * 0.5, `ft=${ft}: got ${r.elevation_psi}`);
  }
});

test("computePDP: deterministic across repeated calls", () => {
  const a = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20 });
  const b = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20 });
  assert.equal(bits(a.pdp_psi), bits(b.pdp_psi));
  assert.equal(bits(a.elevation_psi), bits(b.elevation_psi));
});

test("computePDP: bit-stable for the spec-v14 §9.2 pinned input (NP=100, FL=25, elev=20)", () => {
  // The sum NP + FL + elev*0.5 is an integer for these inputs, so the
  // bit pattern is the exact IEEE 754 encoding of 135.0. A refactor
  // that swapped the 0.5 psi/ft NFA shortcut for the 0.434 water-column
  // value would land at 133.68 and the bit pattern would move.
  const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20 });
  assert.equal(bits(r.pdp_psi), "4060e00000000000", `pdp_psi=${r.pdp_psi} bits=${bits(r.pdp_psi)}`);
});

test("computeStandpipeFriction: 0.434 psi/ft water-column constant pinned exactly", () => {
  // The more precise water-column value (1 psi = 2.31 ft <=> 1 ft = 0.4329 psi)
  // rounded to three figures. A refactor that swaps 0.434 for 0.5 (the
  // NFA-shortcut value used in computePDP) would break the cross-tile
  // invariant that the two paths differ deliberately.
  const r = computeStandpipeFriction({
    riser_height_ft: 100,
    outlet_count: 1,
    gpm_per_outlet: 250,
    outlet_length_ft: 50,
    hose_diameter: "2.5_in",
  });
  assert.equal(r.elevation_psi, 100 * 0.434);
});

test("computeStandpipeFriction: monotonic-increasing in riser_height_ft (elevation head accumulates)", () => {
  // The riser head is a strictly increasing linear contribution. Inverting
  // the relationship surfaces a sign bug in the elevation accumulator.
  let prev = -Infinity;
  for (const h of [10, 50, 100, 200, 300]) {
    const r = computeStandpipeFriction({
      riser_height_ft: h,
      outlet_count: 1,
      gpm_per_outlet: 250,
      outlet_length_ft: 50,
      hose_diameter: "2.5_in",
    });
    assert.ok(r.total_psi > prev, `h=${h}: total=${r.total_psi}`);
    prev = r.total_psi;
  }
});

test("computeStandpipeFriction: per-outlet friction sum scales linearly in outlet_count", () => {
  // The per-outlet term is CQ^2L/100 (constant across outlets) and the
  // total is per_outlet_psi * n. The invariant pins the loop: a refactor
  // that swapped the sum for a max or a single-outlet shortcut surfaces here.
  const base = computeStandpipeFriction({
    riser_height_ft: 100,
    outlet_count: 1,
    gpm_per_outlet: 250,
    outlet_length_ft: 50,
    hose_diameter: "2.5_in",
  });
  for (const n of [1, 2, 3, 4]) {
    const r = computeStandpipeFriction({
      riser_height_ft: 100,
      outlet_count: n,
      gpm_per_outlet: 250,
      outlet_length_ft: 50,
      hose_diameter: "2.5_in",
    });
    assert.equal(r.friction_total_psi, base.per_outlet_psi * n, `n=${n}: ft=${r.friction_total_psi}`);
    assert.equal(r.per_outlet_psi, base.per_outlet_psi, `n=${n}: per-outlet drifted`);
  }
});

test("computeStandpipeFriction: per-outlet friction scales as Q^2 in gpm_per_outlet (NFA CQ^2L)", () => {
  // Doubling flow quadruples friction; the test pins the CQ^2L exponent.
  // A refactor that turned the square into a cube or a linear scaling
  // surfaces here.
  const r100 = computeStandpipeFriction({
    riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 100, outlet_length_ft: 100, hose_diameter: "2.5_in",
  });
  const r200 = computeStandpipeFriction({
    riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 200, outlet_length_ft: 100, hose_diameter: "2.5_in",
  });
  // (200/100)^2 = 4
  assert.ok(Math.abs(r200.per_outlet_psi - 4 * r100.per_outlet_psi) < 1e-12,
    `Q=100 -> ${r100.per_outlet_psi}; Q=200 -> ${r200.per_outlet_psi}`);
});

test("computeStandpipeFriction: rejects out-of-domain inputs with the documented sentinel", () => {
  // Per spec-v14 §8.3 the function returns an error object, not a numeric
  // total, for an out-of-domain input.
  assert.ok("error" in computeStandpipeFriction({ riser_height_ft: 0, outlet_count: 2, gpm_per_outlet: 250 }));
  assert.ok("error" in computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 0, gpm_per_outlet: 250 }));
  assert.ok("error" in computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 0 }));
  assert.ok("error" in computeStandpipeFriction({ riser_height_ft: -10, outlet_count: 2, gpm_per_outlet: 250 }));
  assert.ok("error" in computeStandpipeFriction({
    riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250, hose_diameter: "9_in",
  }));
});

test("computeStandpipeFriction: deterministic across repeated calls", () => {
  const a = computeStandpipeFriction({
    riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250, outlet_length_ft: 50, hose_diameter: "2.5_in",
  });
  const b = computeStandpipeFriction({
    riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250, outlet_length_ft: 50, hose_diameter: "2.5_in",
  });
  assert.equal(bits(a.total_psi), bits(b.total_psi));
  assert.equal(bits(a.elevation_psi), bits(b.elevation_psi));
  assert.equal(bits(a.per_outlet_psi), bits(b.per_outlet_psi));
  assert.equal(bits(a.friction_total_psi), bits(b.friction_total_psi));
});

test("computeStandpipeFriction: bit-stable for the spec-v14 §9.2 pinned input (h=100, n=2, gpm=250, L=50, 2.5 in)", () => {
  // Pin the four output bit patterns at one canonical input. The four
  // values exercise the elevation accumulator (0.434 * 100), the per-outlet
  // NFA friction (C=2, (250/100)^2, (50/100)), the per-outlet sum (* 2), and
  // the grand total. A coefficient swap on any of the three constants
  // (0.434, 2, the 100 normalizer inside fireHoseFrictionLoss) moves at
  // least one pattern.
  const r = computeStandpipeFriction({
    riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250, outlet_length_ft: 50, hose_diameter: "2.5_in",
  });
  assert.equal(bits(r.elevation_psi), "4045b33333333333", `elevation_psi=${r.elevation_psi}`);
  assert.equal(bits(r.per_outlet_psi), "4019000000000000", `per_outlet_psi=${r.per_outlet_psi}`);
  assert.equal(bits(r.friction_total_psi), "4029000000000000", `friction_total_psi=${r.friction_total_psi}`);
  assert.equal(bits(r.total_psi), "404bf33333333333", `total_psi=${r.total_psi}`);
});

// --- Group C Manual J cooling / heating (calc-hvac) ----------------------

const MANUAL_J_REF = {
  floor_area_ft2: 1500,
  wall_area_ft2: 1200,
  window_area_ft2: 200,
  ceiling_area_ft2: 1500,
  insulation_level: "average",
  window_type: "double",
  occupants: 4,
  outdoor_design_F: 95,
  indoor_design_F: 75,
};

test("manualJCooling: monotonic-increasing in outdoor design temperature", () => {
  let prev = -Infinity;
  for (const outdoor_design_F of [80, 90, 95, 100, 105, 110]) {
    const r = manualJCooling({ ...MANUAL_J_REF, outdoor_design_F });
    assert.ok(r.total_BTU_hr > prev, `OAT=${outdoor_design_F}: total=${r.total_BTU_hr}`);
    prev = r.total_BTU_hr;
  }
});

test("manualJCooling: dT clamps at zero (outdoor <= indoor returns no sensible-conductive load)", () => {
  // When the outdoor design is at or below the indoor design, the
  // sensible-conductive band is zero by construction. Internal gain and
  // solar still contribute; the test asserts the dT clamp lands, not
  // that the total goes to zero.
  const r = manualJCooling({ ...MANUAL_J_REF, outdoor_design_F: 75 });
  assert.equal(r.conductive_BTU_hr, 0, `conductive=${r.conductive_BTU_hr}`);
  assert.ok(r.solar_BTU_hr > 0 && r.internal_gain_BTU_hr > 0, `solar=${r.solar_BTU_hr} internal=${r.internal_gain_BTU_hr}`);
});

test("manualJCooling: deterministic across repeated calls", () => {
  const a = manualJCooling(MANUAL_J_REF);
  const b = manualJCooling(MANUAL_J_REF);
  assert.equal(bits(a.total_BTU_hr), bits(b.total_BTU_hr));
  assert.equal(bits(a.tons), bits(b.tons));
});

test("manualJCooling: pinned worked example lands inside the fixture-declared tons band", () => {
  // The calc-hvac.js manualJCoolingExample names the expected range
  // 1.5 to 6 tons for the reference envelope. The invariant pins the
  // bracket: a refactor that pushes the simplified estimator outside
  // the band surfaces here before the user-facing tile changes.
  const r = manualJCooling(MANUAL_J_REF);
  assert.ok(r.tons >= 1.5 && r.tons <= 6, `tons=${r.tons} outside fixture band [1.5, 6]`);
});

// --- Group C duct sizing (calc-hvac computeDuctSize) ---------------------
//
// computeDuctSize wraps an outer bisection on duct diameter around an
// inner Colebrook iteration on the Darcy friction factor; spec-v14 §9.1
// names duct sizing as a regime-bracketed iterative method requiring
// convergence, pathology, and bit-stability coverage.

test("computeDuctSize: converges with monotone-increasing diameter across the residential CFM sweep", () => {
  let prev = -Infinity;
  for (const cfm of [200, 400, 1000, 2500, 5000]) {
    const r = computeDuctSize({ cfm, friction_in_wc_per_100ft: 0.08 });
    assert.ok(Number.isFinite(r.round_diameter_in), `cfm=${cfm}: d=${r.round_diameter_in}`);
    assert.ok(r.round_diameter_in > prev, `cfm=${cfm}: d=${r.round_diameter_in} not greater than prev=${prev}`);
    prev = r.round_diameter_in;
  }
});

test("computeDuctSize: tighter friction target yields larger required diameter (monotone-decreasing in friction)", () => {
  // At fixed CFM, allowing more pressure drop per 100 ft permits a
  // smaller duct. Inverting the relationship surfaces a sign or
  // bracket-direction bug in the bisection loop.
  let prev = Infinity;
  for (const fr of [0.04, 0.08, 0.12, 0.2]) {
    const r = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: fr });
    assert.ok(r.round_diameter_in < prev, `fr=${fr}: d=${r.round_diameter_in} not less than prev=${prev}`);
    prev = r.round_diameter_in;
  }
});

test("computeDuctSize: rejects non-positive inputs with the documented sentinel", () => {
  // Per spec-v14 §8.3 the function returns an error object, not a
  // numeric diameter, for an out-of-domain input.
  assert.ok("error" in computeDuctSize({ cfm: 0, friction_in_wc_per_100ft: 0.08 }));
  assert.ok("error" in computeDuctSize({ cfm: -10, friction_in_wc_per_100ft: 0.08 }));
  assert.ok("error" in computeDuctSize({ cfm: 400, friction_in_wc_per_100ft: 0 }));
  assert.ok("error" in computeDuctSize({ cfm: 400, friction_in_wc_per_100ft: -0.05 }));
});

test("computeDuctSize: deterministic across repeated calls (no Math.random in the iteration)", () => {
  const a = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0.08 });
  const b = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0.08 });
  assert.equal(bits(a.round_diameter_in), bits(b.round_diameter_in));
  assert.equal(bits(a.velocity_fpm), bits(b.velocity_fpm));
  assert.equal(bits(a.equivalent_square_in), bits(b.equivalent_square_in));
});

test("computeDuctSize: bit-stable for the spec-v14 §9.2 pinned input (1000 CFM, 0.08 in WC / 100 ft)", () => {
  // Pins the converged bisection + Colebrook output at one canonical
  // residential input. A coefficient drift in the Darcy-Weisbach
  // conversion, the air density, or the viscosity constant moves the
  // bit pattern.
  const r = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0.08 });
  assert.equal(bits(r.round_diameter_in), "402c98a4ca5a3063", `d=${r.round_diameter_in}`);
});

test("manualJHeating: monotonic-decreasing in outdoor design temperature (colder OAT -> larger heating load)", () => {
  let prev = Infinity;
  for (const outdoor_design_F of [-10, 0, 10, 20, 30, 40]) {
    const r = manualJHeating({ ...MANUAL_J_REF, outdoor_design_F });
    assert.ok(r.total_BTU_hr < prev, `OAT=${outdoor_design_F}: total=${r.total_BTU_hr}`);
    prev = r.total_BTU_hr;
  }
});

// --- manual-j-worker dispatch (spec-v14 §9.1) ----------------------------
//
// The Web Worker host in manual-j-worker.js is a thin dispatcher around the
// same calc-hvac.js compute functions (manualJCooling, manualJHeating,
// computeDuctSize) tested above. The dispatch logic itself is the new
// surface: a refactor that swapped a case branch, dropped the unknown-kind
// sentinel, or stopped echoing the message id would break the front-end
// Manual J multi-zone request flow. The test stubs the Web Worker
// `self` global, imports the module once, and exercises the four kinds.

test("manual-j-worker: dispatch dispatches cooling / heating / duct / unknown to the right compute", async () => {
  const posted = [];
  let listener = null;
  const stubSelf = {
    addEventListener: (event, fn) => {
      assert.equal(event, "message", `worker registered a non-message listener: ${event}`);
      listener = fn;
    },
    postMessage: (msg) => posted.push(msg),
  };
  globalThis.self = stubSelf;
  try {
    await import("../../manual-j-worker.js");
    assert.ok(typeof listener === "function", "worker did not register a message listener");

    // Cooling dispatch -> manualJCooling output shape (total_BTU_hr, tons).
    posted.length = 0;
    listener({ data: { id: 1, kind: "cooling", inputs: MANUAL_J_REF } });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].id, 1, "worker dropped the message id");
    const cooling = manualJCooling(MANUAL_J_REF);
    assert.equal(bits(posted[0].result.total_BTU_hr), bits(cooling.total_BTU_hr));
    assert.equal(bits(posted[0].result.tons), bits(cooling.tons));

    // Heating dispatch -> manualJHeating output shape.
    posted.length = 0;
    listener({ data: { id: 2, kind: "heating", inputs: { ...MANUAL_J_REF, outdoor_design_F: 10 } } });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].id, 2);
    const heating = manualJHeating({ ...MANUAL_J_REF, outdoor_design_F: 10 });
    assert.equal(bits(posted[0].result.total_BTU_hr), bits(heating.total_BTU_hr));

    // Duct dispatch -> computeDuctSize output shape (round_diameter_in).
    posted.length = 0;
    listener({ data: { id: 3, kind: "duct", inputs: { cfm: 1000, friction_in_wc_per_100ft: 0.08 } } });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].id, 3);
    const duct = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0.08 });
    assert.equal(bits(posted[0].result.round_diameter_in), bits(duct.round_diameter_in));

    // Unknown kind -> the documented error sentinel per spec-v14 §8.3.
    posted.length = 0;
    listener({ data: { id: 4, kind: "bogus", inputs: {} } });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].id, 4);
    assert.equal(posted[0].result.error, "Unknown kind.");

    // Missing message body -> still posts a response with the error sentinel
    // (the worker reads `e.data || {}` so a null payload does not crash).
    posted.length = 0;
    listener({ data: null });
    assert.equal(posted.length, 1);
    assert.equal(posted[0].result.error, "Unknown kind.");
  } finally {
    delete globalThis.self;
  }
});

// --- Bit-stable pins for additional non-iterative closed-form compute -----
//
// Phase E ratchet 2026-05-22: extend the bit-stable pin discipline beyond
// the iterative methods to a representative closed-form compute function
// in five more catalog groups (A Electrical, B Plumbing, E Construction,
// R Accounting / X Real Estate, V EMS). Each pin records the IEEE-754
// hex bit pattern at a canonical input that an electrician / plumber /
// carpenter / mortgage officer / paramedic would actually reach. A
// future Node version change, a Math implementation drift, a refactor
// that reorders a sum, or a coefficient swap surfaces as a hex mismatch
// rather than as a downstream tolerance regression.

import { voltageDrop, conductorResistance } from "../../pure-math.js";
import { computeBeamLoading } from "../../calc-construction.js";
import { computeAmortizationSchedule } from "../../calc-realestate.js";

test("voltageDrop: bit-stable at the spec-v2 example (single-phase, copper, AWG 12, 100 ft, 20 A)", () => {
  // The reference example in voltageDropExample (calc-electrical.js).
  // A future refactor that swapped the resistivity table, the
  // single-phase factor, or the AWG circular-mil constant would shift
  // the bit pattern. Pin records 7.902055... V.
  const v = voltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 20 });
  assert.equal(bits(v), "401f9bb45bf15f0d", `voltageDrop=${v} bits=${bits(v)}`);
});

test("conductorResistance: bit-stable at the spec example (copper, AWG 12, 100 m, 20 C)", () => {
  // The pure-math primitive, returned in ohms for a 100-m run. The
  // resistivity * length / area chain surfaces here; a coefficient
  // swap in any of the three factors shifts the bits.
  const r = conductorResistance({ material: "copper", awg: "12", length_m: 100, temperature_C: 20 });
  assert.equal(bits(r), "3fe0ac5a2a13469a", `conductorResistance=${r} bits=${bits(r)}`);
});

test("computeBeamLoading: bit-stable at the spec example (uniform, 50 plf, 10 ft, 1.4e6 psi E, 1.5 x 7.25 in)", () => {
  // Group E. Moment 5wL^2/8 should land at exactly 625 lb-ft (50*100/8).
  // Deflection 5wL^4/(384EI) carries the section property I = b*d^3/12;
  // the pin captures both outputs.
  const r = computeBeamLoading({ load_type: "uniform", load_value: 50, length_ft: 10, E_psi: 1400000, b_in: 1.5, d_in: 7.25 });
  assert.equal(bits(r.M_lbft), "4083880000000000", `M_lbft=${r.M_lbft} bits=${bits(r.M_lbft)}`);
  assert.equal(bits(r.delta_in), "3fc597c680c33318", `delta_in=${r.delta_in} bits=${bits(r.delta_in)}`);
});

test("computeAmortizationSchedule: bit-stable monthly payment at $300k / 6.5%% / 30-yr (Group X / R canonical input)", () => {
  // Standard mortgage-amortization annuity formula. Result 1896.204...
  // A future edit that broke the (1+r)^-n denominator (sign flip in the
  // exponent, missed compounding) shifts the bit pattern.
  const r = computeAmortizationSchedule({ principal: 300000, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 0 });
  assert.equal(bits(r.monthly_principal_and_interest), "409da0d0f7da03bf",
    `monthly_principal_and_interest=${r.monthly_principal_and_interest} bits=${bits(r.monthly_principal_and_interest)}`);
});

// --- Phase E ratchet 2026-05-25: five more closed-form bit-stable pins ----
//
// Extends the 2026-05-22 ratchet from five catalog groups (A, B, E, R/X, V)
// to five more (C HVAC, F Fire, M Water, T Lab, Y Educators). Each pin
// records the IEEE-754 hex bit pattern at the calculator's published
// reference input. A future Node version change, a Math implementation
// drift, or a coefficient swap shifts the bits.

import { computeFireFriction } from "../../calc-fire.js";
import { computePumpEfficiency } from "../../calc-water.js";
import { computeBeerLambert } from "../../calc-lab.js";
import { computeBellCurve } from "../../calc-edu.js";
import { computeBaseboardOutput } from "../../calc-hvac.js";

test("computeFireFriction: bit-stable at the spec example (2.5 in / 250 gpm / 200 ft)", () => {
  // Group F. NFA C*Q^2*L/100 with C=2 at 2.5 in, Q=2.5 (250 gpm), L=200 ft
  // -> 2 * 6.25 * 2 = 25 psi (integer, exact IEEE-754). Pins both the C=2
  // coefficient for the 2.5 in entry and the Q^2 * L / 100 form.
  const r = computeFireFriction({ hose_diameter: "2.5_in", gpm: 250, length_ft: 200 });
  assert.equal(bits(r.friction_loss_psi), "4039000000000000", `friction_loss_psi=${r.friction_loss_psi}`);
});

test("computePumpEfficiency: bit-stable water-horsepower at the spec example (1500 gpm / 100 ft TDH)", () => {
  // Group M. whp = flow * tdh / 3960 = 1500 * 100 / 3960 = 37.8787878...
  // Pins the Hydraulic-Institute 3960 constant on the calc-water side
  // (the calc-plumbing side is pinned via the §10.1 shared-constant
  // closeout). A future edit that swapped 3960 for 3956 (the metric-
  // adjacent variant) shifts the bits.
  const r = computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 60, motor_eff: 0.93, drive_eff: 1.0 });
  assert.equal(bits(r.whp), "4042f07c1f07c1f0", `whp=${r.whp}`);
});

test("computeBeerLambert: bit-stable concentration at the spec example (A=0.5, l=1 cm, eps=50000)", () => {
  // Group T. c = A / (eps * l) = 0.5 / 50000 = 1e-5 M. Pins the
  // linear-in-A / inverse-in-eps form against a future log10 swap or a
  // path-length default drift.
  const r = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 50000 });
  assert.equal(bits(r.concentration), "3ee4f8b588e368f1", `concentration=${r.concentration}`);
});

test("computeBellCurve: bit-stable z-score + percentile at the spec example (x=85, mu=75, sd=10)", () => {
  // Group Y. z = (85-75)/10 = 1.0 (exact). percentile = stdNormalCDF(1)*100
  // = 84.13447404368685. Pins both the z-score arithmetic and the
  // Abramowitz & Stegun 26.2.17 CDF approximation against a future swap
  // (e.g., to a 26.2.19 variant or a different polynomial expansion).
  const r = computeBellCurve({ raw_score: 85, mean: 75, sd: 10 });
  assert.equal(bits(r.z_score), "3ff0000000000000", `z_score=${r.z_score}`);
  assert.equal(bits(r.percentile), "4055089b3904f2f0", `percentile=${r.percentile}`);
});

test("computeBaseboardOutput: bit-stable btu_per_ft + btu_total at the slant_fin_baseline 180 F / 1 gpm / 10 ft example", () => {
  // Group C. At 180 F average water temp / 1 gpm / slant_fin_baseline, the
  // table lookup returns 600 btu/ft; total = 6000 btu (integer, exact
  // IEEE-754). Pins the Slant/Fin Fine Line 30 lookup and the flow factor
  // multiplication chain.
  const r = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 10, model: "slant_fin_baseline" });
  assert.equal(bits(r.btu_per_ft), "4082c00000000000", `btu_per_ft=${r.btu_per_ft}`);
  assert.equal(bits(r.btu_total), "40b7700000000000", `btu_total=${r.btu_total}`);
});

// --- Phase E ratchet 2026-05-25 (third batch): five more closed-form pins ---
//
// Extends the bit-stable pin discipline from ten catalog groups (A B C E F
// M R T V X Y after the first two 2026-05-22 / 2026-05-25 batches) to five
// more (B Plumbing, G Cross-trade, J Trucking, L Agriculture, S Legal).
// Each pin records the IEEE-754 hex bit pattern at the calculator's
// published reference input.

import { computeFrictionLoss } from "../../calc-plumbing.js";
import { computeMileageCost } from "../../calc-cross.js";
import { computeBridgeFormula } from "../../calc-trucking.js";
import { computeGPA } from "../../calc-agriculture.js";

test("computeFrictionLoss: bit-stable Hazen-Williams pressureLoss_psi at the spec example (1 in PVC, 100 ft, 10 gpm)", () => {
  // Group B. Hazen-Williams head-loss formula h = 10.67 * L * (Q/C)^1.852 / D^4.87
  // converted to psi via the 62.4 lb/ft^3 / 144 in^2/ft^2 water-density
  // chain. Pins both the head-loss arithmetic and the psi conversion
  // primitive; an inadvertent edit to either surfaces here.
  const r = computeFrictionLoss({ method: "hazen-williams", material: "PVC", nominal_size: "1", length_ft: 100, flow_gpm: 10 });
  assert.equal(bits(r.headLoss_ft), "400301fc1bc038f9", `headLoss_ft=${r.headLoss_ft}`);
  assert.equal(bits(r.pressureLoss_psi), "3ff0792fd3c8b9e9", `pressureLoss_psi=${r.pressureLoss_psi}`);
});

test("computeMileageCost: bit-stable at the spec example (100 mi, 25 mpg, $4.00/gal)", () => {
  // Group G. gallons = miles/mpg = 4; fuel_cost = 16; reimbursement at the
  // IRS standard mileage rate = 100 * 0.67 = 67 (integer, exact). Pins
  // (i) the linear-in-miles fuel arithmetic and (ii) the IRS rate
  // surfaced as a scalar; a future shard-update that drifted the rate
  // shifts the bits of reimbursement and irs_rate_per_mile in lockstep.
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 });
  assert.equal(bits(r.gallons), "4010000000000000", `gallons=${r.gallons}`);
  assert.equal(bits(r.fuel_cost), "4030000000000000", `fuel_cost=${r.fuel_cost}`);
  assert.equal(bits(r.reimbursement), "4050c00000000000", `reimbursement=${r.reimbursement}`);
  assert.equal(bits(r.irs_rate_per_mile), "3fe570a3d70a3d71", `irs_rate_per_mile=${r.irs_rate_per_mile}`);
});

test("computeBridgeFormula: bit-stable total_weight_lb at the spec-v3 Class-8 example (5 axles, 80000 lb)", () => {
  // Group J. Sum of axle weights at the federal interstate cap (80,000 lb,
  // exact integer). Pins the axle-weights array summation against a
  // future refactor that dropped an axle or swapped a reducer.
  const r = computeBridgeFormula({ axle_weights_lb: [12000, 17000, 17000, 17000, 17000], axle_spacings_ft: [12, 4, 30, 4] });
  assert.equal(bits(r.total_weight_lb), "40f3880000000000", `total_weight_lb=${r.total_weight_lb}`);
});

test("computeGPA: bit-stable boom-sprayer GPA at the spec example (0.4 gpm, 20 in spacing, 5 mph)", () => {
  // Group L. USDA NRCS Agronomy Technical Note 5: gpa = 5940 * gpm /
  // (speed_mph * spacing_in) = 5940 * 0.4 / (5 * 20) = 23.76. Pins the
  // 5940 constant against a future swap to the 8910 (broadcast) variant
  // or to the metric-adjacent 5940 / sqrt(3) form.
  const r = computeGPA({ gpm: 0.4, spacing_in: 20, speed_mph: 5, target_gpa: 25 });
  assert.equal(bits(r.gpa), "4037c28f5c28f5c3", `gpa=${r.gpa}`);
  assert.equal(bits(r.required_gpm), "3fdaef9f76166929", `required_gpm=${r.required_gpm}`);
});

// --- Phase E ratchet 2026-05-25 (fourth batch): five more closed-form pins ---
//
// Extends bit-stable pin coverage to five more catalog groups (D
// Restoration, K Mechanic, N Stage, O Kitchen, U Veterinary). After
// this batch only H References and Q Historical (both spec-v14 §12.1
// exempt pure-lookup groups) remain without a direct §9 bit-stable pin.

import { computeStandingWater } from "../../calc-restoration.js";
import { computeFuelRange } from "../../calc-mechanic.js";
import { computeSPL } from "../../calc-stage.js";
import { computeRecipeScale, recipeScaleExample } from "../../calc-kitchen.js";

test("computeStandingWater: bit-stable at the spec example (500 ft^2 / 1 in depth)", () => {
  // Group D. 500 ft^2 * (1/12) ft = 41.666... ft^3; 41.666 * 7.4805 =
  // 311.688 gal; 41.666 * 62.4 = 2600 lb (integer, exact). Pins the
  // 7.4805 gal/ft^3 conversion and the 62.4 lb/ft^3 water-density
  // constant that the §10.1 shared-constant row already governs at the
  // cross-tile level.
  const r = computeStandingWater({ area_ft2: 500, depth_in: 1 });
  assert.equal(bits(r.gallons), "40737b0369d0369d", `gallons=${r.gallons}`);
  assert.equal(bits(r.cubic_feet), "4044d55555555555", `cubic_feet=${r.cubic_feet}`);
  assert.equal(bits(r.pounds), "40a4500000000000", `pounds=${r.pounds}`);
});

test("computeFuelRange: bit-stable range_mi + total_btu at the spec example (18 gal, 28 mpg, gasoline_E10)", () => {
  // Group K. range_mi = tank * mpg * load = 18 * 28 = 504 (integer,
  // exact bit pattern `407f800000000000`). total_btu = 18 * 112000 =
  // 2016000 (the E10 BTU-per-gallon literal pin: `413ec30000000000`).
  const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0 });
  assert.equal(bits(r.range_mi), "407f800000000000", `range_mi=${r.range_mi}`);
  assert.equal(bits(r.total_btu), "413ec30000000000", `total_btu=${r.total_btu}`);
});

test("computeSPL: bit-stable L2_dB at the spec example (110 dB SPL at 1 m -> 30 m free field)", () => {
  // Group N. Inverse-square law: L2 = L1 - 20*log10(d2/d1) = 110 -
  // 20*log10(30) = 80.45757490560675 dB. Pins the 20*log10 form
  // against a future swap to a 10*log10 power-ratio (would shift by 3
  // dB) and the per-doubling 6.0206 dB drop.
  const r = computeSPL({ L1_dB: 110, d1: 1, d2: 30, mode: "free_field" });
  assert.equal(bits(r.L2_dB), "40541d48e841c348", `L2_dB=${r.L2_dB}`);
});

test("computeRecipeScale: bit-stable factor + first-row scaled quantity at the spec example", () => {
  // Group O. factor = target / original = 10 / 4 = 2.5 (exact in IEEE-
  // 754, bit pattern `4004000000000000`). First row (flour_ap, 2 cup)
  // scales to 5 cups (exact) and the alt_quantity at the flour density
  // is the same integer rescaled. Pins the row-quantity scaling chain.
  const r = computeRecipeScale(recipeScaleExample.inputs);
  assert.equal(bits(r.factor), "4004000000000000", `factor=${r.factor}`);
  assert.equal(r.rows[0].quantity, 5, `scaled_quantity=${r.rows[0].quantity}`);
  assert.equal(r.rows[0].alt_quantity, 625, `alt_quantity=${r.rows[0].alt_quantity}`);
});

// --- Phase E ratchet 2026-05-25 (fifth batch): within-group depth pins --
//
// The first four batches achieved breadth (twenty of twenty-two non-exempt
// catalog groups carry at least one §9 bit-stable pin). This batch deepens
// coverage by pinning a second canonical compute function in groups
// that previously carried only a single pin: A Electrical (computeThreePhase
// on top of voltageDrop / conductorResistance), E Construction
// (computeWindPressure on top of computeBeamLoading), F Fire (computeHydrantFlow
// on top of computeFireFriction + the iterative computePDP / standpipe pins),
// and X Real Estate (computePITI on top of computeAmortizationSchedule).

import { computeThreePhase, threePhaseExample } from "../../calc-electrical.js";
import { computeWindPressure, windPressureExample } from "../../calc-construction.js";
import { computePITI, pitiExample } from "../../calc-realestate.js";
import { computeHydrantFlow, hydrantFlowExample } from "../../calc-fire.js";

test("computeThreePhase: bit-stable kW + kVA + kVAR at the spec example (480 V_LL, 100 A, 0.9 pf)", () => {
  // Group A. P_W = sqrt(3) * V_LL * I * pf; pins the three-phase active /
  // apparent / reactive power identity. A future swap of sqrt(3) for an
  // approximation (1.732) or a refactor that broke the pf cosine
  // assumption shifts the bits.
  const r = computeThreePhase(threePhaseExample.inputs);
  assert.equal(bits(r.P_W), "40f2448984a83489", `P_W=${r.P_W}`);
  assert.equal(bits(r.kW), "4052b4c629a2008c", `kW=${r.kW}`);
  assert.equal(bits(r.S_VA), "40f44c27052cac26", `S_VA=${r.S_VA}`);
  assert.equal(bits(r.Q_var), "40e1b1e691badd7e", `Q_var=${r.Q_var}`);
});

test("computeWindPressure: bit-stable q_psf + windward pressure at the ASCE 7 spec example (100 mph, exposure C)", () => {
  // Group E. q = 0.00256 * V^2 = 25.6 psf at 100 mph (exact in IEEE-754).
  // qz_at_30ft applies the exposure-C 0.85 Kz factor; pressure_windward
  // applies Cp_windward = 0.8 against the qz value. Pins the 0.00256
  // dynamic-pressure coefficient.
  const r = computeWindPressure(windPressureExample.inputs);
  assert.equal(bits(r.q_psf), "403999999999999a", `q_psf=${r.q_psf}`);
  assert.equal(bits(r.qz_at_30ft_psf), "4035c28f5c28f5c3", `qz_at_30ft_psf=${r.qz_at_30ft_psf}`);
  assert.equal(bits(r.pressure_windward_psf), "40316872b020c49c", `pressure_windward=${r.pressure_windward_psf}`);
});

test("computePITI: bit-stable PI + escrow + total at the spec example ($320k / 6.5% / 30 yr, $4800 tax, $1800 ins)", () => {
  // Group X. PI from the standard annuity formula; tax and insurance
  // monthly-ize via /12. Pins both the amortization arithmetic at a
  // residential canonical input and the escrow division.
  const r = computePITI(pitiExample.inputs);
  assert.equal(bits(r.monthly_principal_and_interest), "409f9a787fd77b78", `PI=${r.monthly_principal_and_interest}`);
  assert.equal(bits(r.monthly_tax), "4079000000000000", `monthly_tax=${r.monthly_tax}`);
  assert.equal(bits(r.piti), "40a4193c3febbdbc", `piti=${r.piti}`);
});

test("computeHydrantFlow: bit-stable flow_gpm at the spec example (10 psi pitot, 2.5 in outlet, C=0.9)", () => {
  // Group F. NFPA hydrant flow Q = 29.83 * C * d^2 * sqrt(P) = 29.83 *
  // 0.9 * 6.25 * sqrt(10) = 530.61... gpm. Pins the 29.83 NFPA
  // coefficient against a future swap to the metric-adjacent 0.0666
  // form or to the 30 round-number short form.
  const r = computeHydrantFlow(hydrantFlowExample.inputs);
  assert.equal(bits(r.flow_gpm), "408094e2279ff54b", `flow_gpm=${r.flow_gpm}`);
});

// --- Phase E ratchet 2026-05-25 (sixth batch): five more depth pins -------
//
// Continues the breadth-to-depth pivot from the fifth batch. Pins a second
// canonical compute function in five more groups that previously carried
// only one (B Plumbing, M Water, S Legal, T Lab, V EMS).

import { computePumpSize } from "../../calc-plumbing.js";
import { computeDetentionTime, detentionTimeExample } from "../../calc-water.js";
import { computeHendersonHasselbalch, hhExample } from "../../calc-lab.js";

test("computePumpSize: bit-stable hydraulic_hp + shaft_hp at the Hydraulic Institute canonical input (100 gpm, 80 ft, 65% eff)", () => {
  // Group B. hydraulic_hp = Q * H * SG / 3960 = 100 * 80 / 3960 =
  // 2.0202020... shaft_hp = hydraulic_hp / 0.65 = 3.1080031... Pins the
  // Hydraulic Institute 3960 constant on the calc-plumbing side
  // (calc-water side already pinned via computePumpEfficiency); the
  // §10.1 cross-tile invariant ties the two consumers bit-for-bit at
  // SG=1.
  const r = computePumpSize({ flow_gpm: 100, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 1 });
  assert.equal(bits(r.hydraulic_hp), "4000295fad40a57f", `hydraulic_hp=${r.hydraulic_hp}`);
  assert.equal(bits(r.shaft_hp), "4008dd30bbc5eaeb", `shaft_hp=${r.shaft_hp}`);
});

test("computeDetentionTime: bit-stable minutes + hours at the spec example (50000 gal, 350 gpm)", () => {
  // Group M. detention_time = volume / flow = 50000/350 = 142.857... min;
  // hours = minutes/60. Pins the inverse-in-flow form (already
  // monotonicity-pinned) at bit precision; a future inversion of the
  // numerator/denominator surfaces immediately.
  const r = computeDetentionTime(detentionTimeExample.inputs);
  assert.equal(bits(r.minutes), "4061db6db6db6db7", `minutes=${r.minutes}`);
  assert.equal(bits(r.hours), "40030c30c30c30c3", `hours=${r.hours}`);
});

test("computeHendersonHasselbalch: bit-stable ratio + fraction_base + moles_base at the spec example (pKa=7.20, pH=7.40, 0.1 M, 1 L)", () => {
  // Group T. ratio = 10^(pH-pKa) = 10^0.2 = 1.5849... fraction_base =
  // ratio/(ratio+1) = 0.6131... moles_base = fraction * total_conc *
  // volume. Pins the 10^(pH-pKa) form against a future swap to a ln /
  // log-natural variant.
  const r = computeHendersonHasselbalch(hhExample.inputs);
  // ratio = 10^(pH-pKa) is a Math.pow output; it and the two values
  // derived from it are pinned to within a few ULP (see assertNearBits)
  // because pow's last bit is not portable across libm / Node versions.
  assertNearBits(r.ratio_base_acid, "3ff95bb8f6d46055", "ratio");
  assertNearBits(r.fraction_base, "3fe39ed11bd0ff75", "fraction_base");
  assertNearBits(r.moles_base, "3faf6481c61b3255", "moles_base");
});

// --- Phase E ratchet 2026-05-25 (seventh batch): five more depth pins ----
//
// Continues the depth campaign. Pins a second canonical compute function
// in five more groups that previously carried only one closed-form pin
// (C HVAC, G Cross-trade, J Trucking, R Accounting, Y Educators).

import { computeBalancePoint, balancePointExample } from "../../calc-hvac.js";
import { computeWindChill, windChillExample } from "../../calc-cross.js";
import { computeStoppingSightDistance, stoppingSightDistanceExample } from "../../calc-trucking.js";
import { computeStraightLine, straightLineExample } from "../../calc-accounting.js";
import { computeStatistics, statisticsExample } from "../../calc-edu.js";

test("computeBalancePoint: bit-stable balance_point_F at the spec example", () => {
  // Group C. Linear-interpolation of capacity-curve crossover between
  // design heating load and heat-pump output. Pins the interpolation
  // arithmetic at the canonical input.
  const r = computeBalancePoint(balancePointExample.inputs);
  assert.equal(bits(r.balance_point_F), "403fe82629577415", `balance_point_F=${r.balance_point_F}`);
});

test("computeWindChill: bit-stable wind_chill_F at the spec example (T=5 F, wind=25 mph)", () => {
  // Group G. NWS 2001 piecewise-power-law: WC = 35.74 + 0.6215*T -
  // 35.75*v^0.16 + 0.4275*T*v^0.16 = -17.408... F. Pins the 0.16
  // wind-speed exponent against a future swap to the 0.15 or 0.20 form
  // that surfaced in earlier NWS revisions; complements the §10.3
  // monotonicity-in-wind-speed sweep already in place.
  const r = computeWindChill(windChillExample.inputs);
  assert.equal(bits(r.wind_chill_F), "c03168a78dfd7df7", `wind_chill_F=${r.wind_chill_F}`);
});

test("computeStoppingSightDistance: bit-stable perception + braking + total at the spec example (55 mph, mu=0.35, t=2.5 s)", () => {
  // Group J. AASHTO Green Book SSD = 1.47*v*t (perception) + v^2 /
  // (30*(f +- G)) (braking). Pins both terms; complements the §10.3
  // v^2 ratio pin already in place.
  const r = computeStoppingSightDistance(stoppingSightDistanceExample.inputs);
  assert.equal(bits(r.perception_reaction_ft), "4069440000000000", `perception=${r.perception_reaction_ft}`);
  assert.equal(bits(r.braking_distance_ft), "4072018618618618", `braking=${r.braking_distance_ft}`);
  assert.equal(bits(r.total_ssd_ft), "407ea38618618618", `total_ssd=${r.total_ssd_ft}`);
});

test("computeStraightLine: bit-stable depreciation + accumulated + book at the spec example ($50k, $5k salvage, 10 yr, year 3)", () => {
  // Group R. annual = (cost - salvage) / life = 45000/10 = 4500 (exact);
  // accumulated = annual * year = 13500 (exact); book = cost - accum =
  // 36500 (exact). Pins the salvage-subtraction order against a future
  // refactor that dropped the salvage term.
  const r = computeStraightLine(straightLineExample.inputs);
  assert.equal(bits(r.annual_depreciation), "40b1940000000000", `annual=${r.annual_depreciation}`);
  assert.equal(bits(r.accumulated_depreciation), "40ca5e0000000000", `accum=${r.accumulated_depreciation}`);
  assert.equal(bits(r.book_value), "40e1d28000000000", `book_value=${r.book_value}`);
});

test("computeStatistics: bit-stable mean + median + sd_sample at the spec example", () => {
  // Group Y. Bessel-corrected sample SD (n-1 denominator) vs population
  // SD (n denominator). Pins the n-1 Bessel correction against a future
  // refactor that swapped the denominator; complements the
  // computeBellCurve pin (Group Y) which only pinned the CDF approx.
  const r = computeStatistics(statisticsExample.inputs);
  assert.equal(bits(r.mean), "4014000000000000", `mean=${r.mean}`);
  assert.equal(bits(r.median), "4012000000000000", `median=${r.median}`);
  assert.equal(bits(r.variance_sample), "4012492492492492", `variance_sample=${r.variance_sample}`);
  assert.equal(bits(r.sd_sample), "40011acee560242a", `sd_sample=${r.sd_sample}`);
});

// --- Phase E ratchet 2026-05-25 (eighth batch): five more depth pins -----
//
// Closes out the within-group depth campaign for the five remaining single-
// pin groups (K Mechanic, L Agriculture, N Stage, O Kitchen, U Veterinary).
// After this batch all twenty breadth-covered non-exempt groups carry two
// or more closed-form §9 bit-stable pins.

import { computePropSlip, propSlipExample } from "../../calc-mechanic.js";
import { computeDrawbarPower, drawbarPowerExample } from "../../calc-agriculture.js";
import { computeRiggingCheck, riggingExample } from "../../calc-stage.js";
import { computeYieldEP, yieldEPExample } from "../../calc-kitchen.js";

test("computePropSlip: bit-stable theoretical_kt + slip_percent at the spec example (4500 rpm, 1.85:1, 19 in pitch, 35 kt GPS)", () => {
  // Group K. Theoretical boat speed = (rpm / gear_ratio) * pitch / 1215.2,
  // where 1215.2 = (12 * 6076.12 in/nm) / 60 -> 38.032 kt. slip = 1 -
  // actual/theoretical. Pins the marine prop-slip arithmetic chain including
  // the 6076.12 ft/nm (knots) conversion.
  const r = computePropSlip(propSlipExample.inputs);
  assert.equal(bits(r.theoretical_kt), "404304114a5be8bc", `theoretical_kt=${r.theoretical_kt}`);
  assert.equal(bits(r.slip_percent), "401fe304406f249a", `slip_percent=${r.slip_percent}`);
});

test("computeDrawbarPower: bit-stable drawbar_hp + pto_hp_estimate at the spec example (4500 lb pull, 4.5 mph, firm_soil)", () => {
  // Group L. ASABE D497 DBHP = pull_lb * speed_mph / 375 = 4500 * 4.5 /
  // 375 = 54 hp (exact integer). pto_hp = drawbar_hp / 0.72 (firm_soil
  // tractive efficiency) = 75 hp (exact). Pins the 375 ASABE constant
  // against a future swap to the metric-adjacent 273 form.
  const r = computeDrawbarPower(drawbarPowerExample.inputs);
  assert.equal(bits(r.drawbar_hp), "404b000000000000", `drawbar_hp=${r.drawbar_hp}`);
  assert.equal(bits(r.pto_hp_estimate), "4052c00000000000", `pto_hp_estimate=${r.pto_hp_estimate}`);
});

test("computeRiggingCheck: bit-stable tension_per_leg + safety_factor at the spec example (5000 lb load, 60 deg, 2-leg basket)", () => {
  // Group N. Two-leg sling: tension_per_leg = load / (n_legs * cos(angle/2))
  // for the included (apex) angle; at 60 deg included on a 2-leg basket the
  // geometry gives 5000 / (2 * cos 30) = 2886.75 lb/leg. safety_factor =
  // effective_wll / tension = 6700 / 2886.75 = 2.32. Pins the sling-geometry
  // arithmetic.
  const r = computeRiggingCheck(riggingExample.inputs);
  assert.equal(bits(r.tension_per_leg_lb), "40a68d80b06a8664", `tension_per_leg=${r.tension_per_leg_lb}`);
  assert.equal(bits(r.safety_factor), "4002914d3a641ee3", `safety_factor=${r.safety_factor}`);
});

test("computeYieldEP: bit-stable yield_pct + ep_weight + ep_cost_per_lb at the spec example (10 lb AP, 1.5 trim, 15% cooking loss, $8.50)", () => {
  // Group O. yield_pct = (1 - trim/ap) * (1 - cooking_loss) * 100 =
  // 0.85 * 0.85 = 72.25%. ep_cost_per_lb = ap_cost / yield_pct =
  // $8.50 / 0.7225 = $11.764... Pins the two-stage yield chain (trim
  // first, then cooking loss).
  const r = computeYieldEP(yieldEPExample.inputs);
  assert.equal(bits(r.yield_pct), "40520fffffffffff", `yield_pct=${r.yield_pct}`);
  assert.equal(bits(r.ep_weight), "401ce66666666666", `ep_weight=${r.ep_weight}`);
  assert.equal(bits(r.ep_cost_per_lb), "4027878787878789", `ep_cost_per_lb=${r.ep_cost_per_lb}`);
});

// --- Phase E ratchet 2026-05-25 (ninth batch): five third-pin depth tests --
//
// The depth campaign (batches 5-8) closed out with every breadth-covered
// non-exempt group carrying two or more closed-form §9 pins. This ninth
// batch adds a third closed-form pin to five of the highest-activity
// catalog groups (A Electrical, B Plumbing, C HVAC, E Construction, F
// Fire) so the bit-stable surface in those groups now covers three
// independent compute functions each.

import { computeOhmsLaw, ohmsLawExample } from "../../calc-electrical.js";
import { computeRecircPumpHead, recircPumpHeadExample } from "../../calc-plumbing.js";
import { computeSeerEer, seerEerExample } from "../../calc-hvac.js";
import { computeSnowLoad, snowLoadExample } from "../../calc-construction.js";
import { computeRequiredFireFlow, requiredFireFlowExample } from "../../calc-fire.js";

test("computeOhmsLaw: bit-stable R + P at the spec example (V=12, I=2)", () => {
  // Group A. R = V/I = 6 (exact); P = V*I = 24 (exact). The pure
  // arithmetic chain; pins the V/I/R/P solver against a future refactor
  // that broke the inverse direction.
  const r = computeOhmsLaw(ohmsLawExample.inputs);
  assert.equal(bits(r.R), "4018000000000000", `R=${r.R}`);
  assert.equal(bits(r.P), "4038000000000000", `P=${r.P}`);
});

test("computeRecircPumpHead: bit-stable head_ft + pressure_psi at the spec example", () => {
  // Group B. Recirculation pump head with Hazen-Williams friction; the
  // pressure_psi output round-trips through the §10.1 feetOfHeadToPsi
  // primitive (bit-equal pin already in place). This third Group B pin
  // covers the second consumer of the primitive at bit precision.
  const r = computeRecircPumpHead(recircPumpHeadExample.inputs);
  assert.equal(bits(r.head_ft), "400786528c8771bb", `head_ft=${r.head_ft}`);
  assert.equal(bits(r.pressure_psi), "3ff463589becda08", `pressure_psi=${r.pressure_psi}`);
});

test("computeSeerEer: bit-stable SEER + SEER2_estimate at the spec example (EER 12)", () => {
  // Group C. AHRI 210/240 conversion: SEER = EER * 1.12 = 13.44 at EER
  // 12; SEER2 = SEER * 0.95 ratchet for the 2023 test procedure update.
  // Pins both the 1.12 EER->SEER conversion and the 0.95 SEER->SEER2
  // ratchet against a future regulatory drift.
  const r = computeSeerEer(seerEerExample.inputs);
  assert.equal(bits(r.SEER), "402ae147ae147ae2", `SEER=${r.SEER}`);
  assert.equal(bits(r.SEER2_estimate), "402989374bc6a7f0", `SEER2=${r.SEER2_estimate}`);
});

test("computeSnowLoad: bit-stable Pf_psf at the ASCE 7 spec example", () => {
  // Group E. Pf = 0.7 * Ce * Ct * Is * Pg. At the spec input the result
  // is an integer (21 psf). Pins the 0.7 base factor against any drift.
  const r = computeSnowLoad(snowLoadExample.inputs);
  assert.equal(bits(r.Pf_psf), "4035000000000000", `Pf_psf=${r.Pf_psf}`);
});

test("computeRequiredFireFlow: bit-stable needed_fire_flow + base_C at the ISO spec example", () => {
  // Group F. ISO Needed Fire Flow: base = 18*C*sqrt(area); the rounded
  // needed_fire_flow_gpm result is 1250 (exact integer, ISO rounding to
  // nearest 250). Pins both the un-rounded base value and the rounding
  // step.
  const r = computeRequiredFireFlow(requiredFireFlowExample.inputs);
  assert.equal(bits(r.needed_fire_flow_gpm), "4093880000000000", `needed=${r.needed_fire_flow_gpm}`);
  assert.equal(bits(r.base_C_gpm), "4093e40000000000", `base_C=${r.base_C_gpm}`);
});

// --- Phase E ratchet 2026-05-25 (tenth batch): five more third-pin tests --
//
// Continues the third-pin depth campaign for five more catalog groups (D
// Restoration, G Cross-trade, J Trucking, M Water, X Real Estate). After
// this batch ten of twenty breadth-covered groups carry three or more
// closed-form §9 pins.

import { computeAirMovers, airMoversExample } from "../../calc-restoration.js";
import { computeOvertime, overtimeExample } from "../../calc-cross.js";
import { computeDIM, dimExample } from "../../calc-trucking.js";
import { computePoundsFormula, poundsFormulaExample } from "../../calc-water.js";
import { computeLTV, ltvExample } from "../../calc-realestate.js";

test("computeAirMovers: bit-stable air_mover_count + total_cfm at the spec example (800 ft^2, water_class=2)", () => {
  // Group D. IICRC S500 step function: 800/100 = 8 units (exact);
  // total_cfm = 8 * 2500 = 20000 (exact integer). Pins both the
  // ft^2-per-unit step at water_class=2 and the typical-unit CFM
  // attribution.
  const r = computeAirMovers(airMoversExample.inputs);
  assert.equal(bits(r.air_mover_count), "4020000000000000", `air_mover_count=${r.air_mover_count}`);
  assert.equal(bits(r.total_cfm), "40d3880000000000", `total_cfm=${r.total_cfm}`);
});

test("computeOvertime: bit-stable regular + OT + gross at the spec example (50 hrs at $30/hr, 1.5x OT, 60-hr DT threshold)", () => {
  // Group G. FLSA-style piecewise: 40 reg hrs at $30 = $1200 (exact);
  // 10 OT hrs at 1.5 * $30 = $45 -> $450 (exact); no double-time since
  // 50 < 60. Gross = $1650 (exact). Pins the piecewise threshold logic
  // at both the 40-hr OT boundary and the 60-hr DT boundary.
  const r = computeOvertime(overtimeExample.inputs);
  assert.equal(bits(r.regular_pay), "4092c00000000000", `regular_pay=${r.regular_pay}`);
  assert.equal(bits(r.overtime_pay), "407c200000000000", `overtime_pay=${r.overtime_pay}`);
  assert.equal(bits(r.gross_pay), "4099c80000000000", `gross_pay=${r.gross_pay}`);
});

test("computeDIM: bit-stable dim_lb + breakeven_in3 + current_in3 at the spec example (24 x 18 x 12 in, UPS_Daily)", () => {
  // Group J. dim_lb = L*W*H / divisor = 5184 / 139 = 37.294... lb.
  // current_in3 = 5184 (exact integer); breakeven_in3 = actual_weight *
  // divisor = 20 * 139 = 2780 (exact integer). Pins the UPS daily-rate
  // 139 divisor and the L*W*H cubic-volume identity.
  const r = computeDIM(dimExample.inputs);
  assert.equal(bits(r.dim_lb), "4042a5c1619c8bf9", `dim_lb=${r.dim_lb}`);
  assert.equal(bits(r.breakeven_in3), "40a5b80000000000", `breakeven_in3=${r.breakeven_in3}`);
  assert.equal(bits(r.current_in3), "40b4400000000000", `current_in3=${r.current_in3}`);
});

test("computePoundsFormula: bit-stable pure_lb_day + product_lb_day at the spec example (5 MGD, 2.5 mg/L, 12.5% NaOCl)", () => {
  // Group M. AWWA pounds formula: lb/day = 8.34 * MGD * mg/L = 8.34 * 5
  // * 2.5 = 104.25 (exact). product = pure / purity = 104.25 / 0.125 =
  // 834 (exact). Pins the 8.34 lb/gal water-density and the purity
  // division.
  const r = computePoundsFormula(poundsFormulaExample.inputs);
  assert.equal(bits(r.pure_lb_day), "405a100000000000", `pure_lb_day=${r.pure_lb_day}`);
  assert.equal(bits(r.product_lb_day), "408a100000000000", `product_lb_day=${r.product_lb_day}`);
});

test("computeLTV: bit-stable ltv_percent at the spec example ($320k loan, $400k value)", () => {
  // Group X. LTV = loan / value * 100 = 80% (exact integer). Pins the
  // 100-multiplier conversion; the threshold-at-80% PMI flag is text
  // and already covered by the §10.3 LTV PMI-flag pin (LTV 80% does
  // NOT require PMI, LTV 81% DOES).
  const r = computeLTV(ltvExample.inputs);
  assert.equal(bits(r.ltv_percent), "4054000000000000", `ltv_percent=${r.ltv_percent}`);
});

// --- Phase E ratchet 2026-05-25 (eleventh batch): five more third-pin tests
//
// Continues the third-pin depth campaign for five more catalog groups (R
// Accounting, T Lab, V EMS, W Aviation, Y Educators). After this batch
// fifteen of twenty breadth-covered groups carry three or more closed-form
// §9 pins.

import { computeMacrs, macrsExample } from "../../calc-accounting.js";
import { computeMolecularWeight, mwExample } from "../../calc-lab.js";
import { computeQuadratic, quadraticExample } from "../../calc-edu.js";

test("computeMacrs: bit-stable year_depreciation + book_value at the spec example ($10k, 5-year, half-year, year 1)", () => {
  // Group R. IRS Publication 946 Table A-1 5-year half-year: year 1 =
  // 20% * $10k = $2000 (exact); book = $8000 (exact). Pins both the
  // first-year half-year-convention percentage and the linear-in-cost
  // arithmetic.
  const r = computeMacrs(macrsExample.inputs);
  assert.equal(bits(r.year_depreciation), "409f400000000000", `year_depreciation=${r.year_depreciation}`);
  assert.equal(bits(r.book_value), "40bf400000000000", `book_value=${r.book_value}`);
});

test("computeMolecularWeight: bit-stable mw at the spec example ((NH4)2SO4)", () => {
  // Group T. IUPAC atomic weights: 2*N + 8*H + S + 4*O = 2*14.007 +
  // 8*1.008 + 32.06 + 4*15.999 = 132.134 g/mol (`40608449ba5e3540`).
  // Pins the per-element atomic-weight constants plus the formula
  // parser's stoichiometric multiplication chain.
  const r = computeMolecularWeight(mwExample.inputs);
  assert.equal(bits(r.molecular_weight), "40608449ba5e3540", `mw=${r.molecular_weight}`);
});

test("computeQuadratic: bit-stable discriminant + roots + vertex at the spec example", () => {
  // Group Y. Discriminant b^2 - 4ac and roots (-b +- sqrt(D))/(2a).
  // Pins the standard quadratic-formula arithmetic and the vertex
  // (-b/2a, c - b^2/(4a)) closed-form against a refactor that swapped
  // the sign convention or the 2a denominator.
  const r = computeQuadratic(quadraticExample.inputs);
  assert.equal(bits(r.discriminant), "3ff0000000000000", `discriminant=${r.discriminant}`);
  assert.equal(bits(r.roots[0]), "3ff0000000000000", `root0=${r.roots[0]}`);
  assert.equal(bits(r.roots[1]), "4000000000000000", `root1=${r.roots[1]}`);
  assert.equal(bits(r.vertex_x), "3ff8000000000000", `vertex_x=${r.vertex_x}`);
  assert.equal(bits(r.vertex_y), "bfd0000000000000", `vertex_y=${r.vertex_y}`);
});

// --- Phase E ratchet 2026-05-25 (twelfth batch): more third-pin tests
//
// Continues the third-pin depth campaign for four more catalog groups (K
// Mechanic, L Agriculture, N Stage, O Kitchen), deepening each from two
// closed-form §9 pins to three or more.

import { computeBoltStretch, boltStretchExample } from "../../calc-mechanic.js";
import { computeSeedRate, seedRateExample } from "../../calc-agriculture.js";
import { computeTrussCapacity, trussExample } from "../../calc-stage.js";
import { computePanConversion, panConversionExample } from "../../calc-kitchen.js";

test("computeBoltStretch: bit-stable clamp_load + cross_check_torque at the spec example (0.5 in, 4 in grip, 5 thou stretch, steel, k=0.18)", () => {
  // Group K. clamp_load = stretch_in * E * area / grip_length; torque
  // cross-check = k * d * clamp_load / 12. Pins both the Hooke's-Law
  // form and the rule-of-thumb torque relationship with the k-factor
  // (the 0.18 lubricated assumption).
  const r = computeBoltStretch(boltStretchExample.inputs);
  assert.equal(bits(r.clamp_load_lb), "40b4c94000000000", `clamp_load=${r.clamp_load_lb}`);
  assert.equal(bits(r.cross_check_torque_ft_lb), "4043f46666666666", `torque=${r.cross_check_torque_ft_lb}`);
});

test("computeSeedRate: bit-stable seeds_per_acre + lbs_per_acre + cost_per_acre at the spec example (30 in rows, 32k target, 1500 seeds/lb, 95% germ, $4.50)", () => {
  // Group L. seeds_per_acre = target / germination_pct = 32000/0.95;
  // lbs_per_acre = seeds_per_acre / seeds_per_lb. Pins both the
  // germination-correction division and the seeds-per-pound divisor.
  const r = computeSeedRate(seedRateExample.inputs);
  assert.equal(bits(r.seeds_per_acre), "40e07286bca1af29", `seeds_per_acre=${r.seeds_per_acre}`);
  assert.equal(bits(r.lbs_per_acre), "403674c59d31674d", `lbs_per_acre=${r.lbs_per_acre}`);
  assert.equal(bits(r.cost_per_acre), "4059435e50d79437", `cost_per_acre=${r.cost_per_acre}`);
});

test("computeTrussCapacity: bit-stable equivalent_udl + total_point_load + safety_factor at the spec example (16in box, 30 ft, 2x250 lb)", () => {
  // Group N. Equivalent UDL converts two 250 lb point loads on a 30 ft
  // span into a per-foot equivalent (1000/30 = 33.33...). Pins the
  // point-load summation and the UDL conversion identity.
  const r = computeTrussCapacity(trussExample.inputs);
  assert.equal(bits(r.equivalent_udl_lb_per_ft), "4040aaaaaaaaaaab", `equivalent_udl=${r.equivalent_udl_lb_per_ft}`);
  assert.equal(bits(r.total_point_load_lb), "407f400000000000", `total_point_load=${r.total_point_load_lb}`);
  assert.equal(bits(r.safety_factor), "401ccccccccccccc", `safety_factor=${r.safety_factor}`);
});

test("computePanConversion: bit-stable total_qt + capacity_qt + servings_per_pan at the spec example (50 servings, 4 oz, full 4 in pan)", () => {
  // Group O. total_qt = servings * portion_oz / 32 = 50*4/32 = 6.25
  // (exact). servings_per_pan = pan_capacity_oz / portion_oz = 432/4 =
  // 108 (exact integer). Pins both the oz-to-qt conversion (32 oz/qt)
  // and the pan-capacity lookup-multiplication chain.
  const r = computePanConversion(panConversionExample.inputs);
  assert.equal(bits(r.total_qt), "4019000000000000", `total_qt=${r.total_qt}`);
  assert.equal(bits(r.capacity_qt), "402b000000000000", `capacity_qt=${r.capacity_qt}`);
  assert.equal(bits(r.servings_per_pan), "405b000000000000", `servings_per_pan=${r.servings_per_pan}`);
});

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
