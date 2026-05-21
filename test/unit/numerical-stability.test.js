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
import { computePDP, computeStandpipeFriction } from "../../calc-fire.js";
import { computeDensityAltitude } from "../../calc-aviation.js";
import { manualJCooling, manualJHeating, computeDuctSize } from "../../calc-hvac.js";

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

// --- Group W density altitude (calc-aviation computeDensityAltitude) ----

test("computeDensityAltitude: ISA standard day at sea level returns DA = PA", () => {
  // PA=0, OAT=15C is ISA; DA must equal PA exactly.
  const r = computeDensityAltitude({ pressure_altitude_ft: 0, oat_c: 15 });
  assert.equal(r.density_altitude_ft, 0);
  assert.equal(r.isa_deviation_c, 0);
});

test("computeDensityAltitude: monotonic-increasing in OAT at fixed pressure altitude", () => {
  let prev = -Infinity;
  for (const oat_c of [-20, 0, 15, 25, 35]) {
    const r = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c });
    assert.ok(r.density_altitude_ft > prev, `OAT=${oat_c}: DA=${r.density_altitude_ft}`);
    prev = r.density_altitude_ft;
  }
});

test("computeDensityAltitude: pinned worked example matches the densityAltitudeExample fixture", () => {
  // FAA worked example: PA=5000 ft, OAT=25C -> DA = 5000 + 120*(25 - 5.1) = 7388 ft.
  // Pins the formula transcription per spec-v14 §10.
  const r = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 25 });
  assert.equal(r.density_altitude_ft, 7388);
});

test("computeDensityAltitude: rejects out-of-domain inputs (no silent fall-through)", () => {
  // Per spec-v14 §8.3 the function returns a documented error object;
  // it must not return a numeric DA for an out-of-domain input.
  const tooHigh = computeDensityAltitude({ pressure_altitude_ft: 100000, oat_c: 15 });
  assert.ok("error" in tooHigh, `expected error, got ${JSON.stringify(tooHigh)}`);
  const tooCold = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: -100 });
  assert.ok("error" in tooCold);
});

test("computeDensityAltitude: NaN-poisoning returns the documented error, not NaN", () => {
  const r = computeDensityAltitude({ pressure_altitude_ft: NaN, oat_c: 15 });
  assert.ok("error" in r, `expected error on NaN PA, got ${JSON.stringify(r)}`);
  const r2 = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: NaN });
  assert.ok("error" in r2, `expected error on NaN OAT, got ${JSON.stringify(r2)}`);
});

test("computeDensityAltitude: deterministic across repeated calls", () => {
  const a = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 25 });
  const b = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 25 });
  assert.equal(bits(a.density_altitude_ft), bits(b.density_altitude_ft));
});

test("computeDensityAltitude: bit-stable for the spec-v14 §9.2 pinned FAA worked example", () => {
  // DA = 5000 + 120 * (25 - 5.1) = 7388 exactly for integer ft inputs.
  // The bit pattern is the IEEE 754 encoding of 7388.0; a coefficient
  // drift (120 -> 118, or the ISA-deviation reference 5.1 -> 5.0) moves
  // the result and the pattern.
  const r = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 25 });
  assert.equal(bits(r.density_altitude_ft), "40bcdc0000000000", `DA=${r.density_altitude_ft}`);
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
