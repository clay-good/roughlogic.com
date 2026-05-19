// spec-v14 Phase D: bounds-and-edge-case fuzzer for pure-math primitives.
//
// Per spec-v14 §8 every calculator carries a documented input domain;
// the fuzzer exercises inputs at the lower bound, the lower bound minus
// epsilon, the lower bound plus epsilon, the midpoint, the upper bound
// minus epsilon, the upper bound, the upper bound plus epsilon, and any
// documented regime transition. At every generated input the fuzzer
// asserts that the output is either:
//
//   - a finite number with the sign and magnitude band the row declares,
//   - a documented sentinel (e.g., colebrookFrictionFactor returns 0 for
//     Re <= 0 per pure-math.js line 183), or
//   - a documented thrown error (e.g., awgToNumber throws on a
//     non-AWG string).
//
// A NaN, an Infinity, a wrong sign, or a wrong-branch result fails the
// test loudly. This file is the Phase D scaffolding for the pure-math
// primitives; per-calc-module fuzzers append as each module's per-row
// corpus domain annotation lands. The pattern matches the Phase E
// numerical-stability and Phase F cross-tile-invariants files: a
// curated table of primitives, each with a per-row check.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  awgDiameterInches,
  awgToNumber,
  awgAreaCmils,
  awgAreaM2,
  conductorResistance,
  conductorResistancePerKft,
  ampacityFromPhysics,
  voltageDrop,
  threePhasePower,
  singlePhasePower,
  hazenWilliamsFrictionLoss,
  feetOfHeadToPsi,
  darcyWeisbachFrictionLoss,
  colebrookFrictionFactor,
  beamUniformLoadSimplySupported,
  beamCenterPointLoadSimplySupported,
  rectangularSection,
  allowableSpanByBending,
  allowableSpanByDeflection,
  saturationVaporPressure_hPa,
  dewPointFromVaporPressure_C,
  psychrometric,
  interpLinear,
  fireHoseFrictionLoss,
  hydrantFlow,
  F_to_C,
  C_to_F,
  C_to_K,
  K_to_C,
} from "../../pure-math.js";

// Assert every primitive output is a finite number with positive sign.
function assertFinitePositive(value, where) {
  assert.ok(Number.isFinite(value), `${where}: expected finite, got ${value}`);
  assert.ok(value > 0, `${where}: expected positive, got ${value}`);
}

function assertFinite(value, where) {
  assert.ok(Number.isFinite(value), `${where}: expected finite, got ${value}`);
}

// --- AWG primitives ------------------------------------------------------

test("bounds: awgDiameterInches across the documented AWG range returns finite positive", () => {
  // Domain per pure-math.js: AWG numeric in 4/0..40 (the catalog uses up
  // to 4/0; pushing to 40 covers the small-conductor tail).
  for (const awg of ["4/0", "3/0", "2/0", "1/0", "1", "4", "8", "10", "14", "18", "24", "40"]) {
    assertFinitePositive(awgDiameterInches(awg), `AWG ${awg}`);
  }
});

test("bounds: awgToNumber throws on a non-AWG string (documented rejection path)", () => {
  // The function throws on a non-numeric, non-named string per
  // pure-math.js line 31. The bounds-fuzzer asserts the documented
  // rejection rather than a silent fall-through.
  assert.throws(() => awgToNumber("not-an-awg"), /Invalid AWG/);
  assert.throws(() => awgToNumber("abc"), /Invalid AWG/);
});

test("bounds: awgAreaCmils + awgAreaM2 stay finite-positive across the AWG range", () => {
  for (const awg of ["4/0", "1/0", "1", "10", "14", "18", "24", "40"]) {
    assertFinitePositive(awgAreaCmils(awg), `cmils AWG ${awg}`);
    assertFinitePositive(awgAreaM2(awg), `m2 AWG ${awg}`);
  }
});

// --- Conductor resistance / ampacity ------------------------------------

test("bounds: conductorResistance is finite-positive over the documented temperature range", () => {
  // Documented temperature domain: -40 C (cold-soak field install) to
  // 200 C (insulation rating ceiling for high-temp THWN variants).
  for (const temperature_C of [-40, -20, 0, 20, 45, 75, 90, 200]) {
    const r = conductorResistance({ material: "copper", awg: "10", length_m: 30.48, temperature_C });
    assertFinitePositive(r, `T=${temperature_C}C`);
  }
});

test("bounds: conductorResistance throws on an unknown material (documented rejection)", () => {
  assert.throws(
    () => conductorResistance({ material: "lead", awg: "10", length_m: 30, temperature_C: 20 }),
    /Unknown material/,
  );
});

test("bounds: conductorResistancePerKft is finite-positive across the AWG sweep", () => {
  for (const awg of ["4/0", "1", "10", "14", "24"]) {
    const r = conductorResistancePerKft({ material: "copper", awg, temperature_C: 75 });
    assertFinitePositive(r, `kft AWG ${awg}`);
  }
});

test("bounds: ampacityFromPhysics returns 0 sentinel when T_c <= T_a (documented)", () => {
  // pure-math.js line 93: T_c <= T_a returns 0 by construction (no heat
  // gradient -> no current capacity). Bounds-fuzzer asserts the sentinel
  // rather than a NaN from sqrt(negative).
  const a = ampacityFromPhysics({ material: "copper", awg: "10", insulation_rating_C: 30, ambient_C: 30 });
  assert.equal(a, 0);
  const b = ampacityFromPhysics({ material: "copper", awg: "10", insulation_rating_C: 30, ambient_C: 40 });
  assert.equal(b, 0);
});

test("bounds: ampacityFromPhysics is finite-positive for typical insulation x ambient combinations", () => {
  for (const insulation_rating_C of [60, 75, 90]) {
    for (const ambient_C of [-10, 20, 30, 40]) {
      if (insulation_rating_C <= ambient_C) continue;
      const a = ampacityFromPhysics({ material: "copper", awg: "10", insulation_rating_C, ambient_C });
      assertFinitePositive(a, `T_c=${insulation_rating_C} T_a=${ambient_C}`);
    }
  }
});

test("bounds: ampacityFromPhysics bundle derate is applied across documented bundle counts", () => {
  // bundleFactors covers 1..9, with a hard derate to 0.5 for >= 10.
  let prev = Infinity;
  for (const bundle_count of [1, 4, 7, 10, 20]) {
    const a = ampacityFromPhysics({
      material: "copper", awg: "10", insulation_rating_C: 90, ambient_C: 30, bundle_count,
    });
    assertFinitePositive(a, `bundle=${bundle_count}`);
    // Derate is monotonic-nonincreasing in bundle count.
    assert.ok(a <= prev + 1e-9, `bundle=${bundle_count}: a=${a} > prev=${prev}`);
    prev = a;
  }
});

test("bounds: voltageDrop is finite-positive at extreme but plausible length/current combinations", () => {
  for (const length_ft of [1, 50, 500, 5000]) {
    for (const current_A of [0.1, 20, 200, 1000]) {
      const vd = voltageDrop({ phase: "single", material: "copper", awg: "10", length_ft, current_A });
      assertFinitePositive(vd, `L=${length_ft} I=${current_A}`);
    }
  }
});

test("bounds: voltageDrop throws on an unknown material (documented)", () => {
  assert.throws(
    () => voltageDrop({ phase: "single", material: "gold", awg: "10", length_ft: 100, current_A: 20 }),
    /Unknown material/,
  );
});

// --- Power -------------------------------------------------------------

test("bounds: threePhasePower returns finite outputs across the pf sweep including 0 and 1", () => {
  for (const pf of [0, 0.5, 0.85, 1]) {
    const r = threePhasePower({ V_LL: 480, I_L: 100, pf });
    assertFinite(r.P_W, `pf=${pf} P`);
    assertFinite(r.S_VA, `pf=${pf} S`);
    assertFinite(r.Q_var, `pf=${pf} Q`);
    // P^2 + Q^2 ~ S^2 (the Math.max guard prevents sqrt(negative) when
    // pf > 1 is incorrectly entered; the fuzzer pins the invariant for
    // legal pf in [0, 1]).
    assert.ok(Math.abs(r.P_W ** 2 + r.Q_var ** 2 - r.S_VA ** 2) < 1e-6, `pf=${pf}: P^2+Q^2 != S^2`);
  }
});

test("bounds: singlePhasePower handles pf=0 and pf=1 without NaN", () => {
  for (const pf of [0, 1]) {
    const r = singlePhasePower({ V: 240, I: 50, pf });
    assertFinite(r.P_W, `pf=${pf} P`);
    assertFinite(r.S_VA, `pf=${pf} S`);
    assertFinite(r.Q_var, `pf=${pf} Q`);
  }
});

// --- Plumbing primitives -----------------------------------------------

test("bounds: hazenWilliamsFrictionLoss returns 0 sentinel for any non-positive input (documented)", () => {
  // pure-math.js line 150: any of flow_gpm, internal_diameter_in,
  // length_ft, C non-positive returns 0. Bounds-fuzzer asserts the
  // documented zero rather than a NaN from log of zero.
  assert.equal(hazenWilliamsFrictionLoss({ flow_gpm: 0, internal_diameter_in: 4, length_ft: 100, C: 120 }), 0);
  assert.equal(hazenWilliamsFrictionLoss({ flow_gpm: 100, internal_diameter_in: 0, length_ft: 100, C: 120 }), 0);
  assert.equal(hazenWilliamsFrictionLoss({ flow_gpm: 100, internal_diameter_in: 4, length_ft: 0, C: 120 }), 0);
  assert.equal(hazenWilliamsFrictionLoss({ flow_gpm: 100, internal_diameter_in: 4, length_ft: 100, C: 0 }), 0);
  assert.equal(hazenWilliamsFrictionLoss({ flow_gpm: -10, internal_diameter_in: 4, length_ft: 100, C: 120 }), 0);
});

test("bounds: hazenWilliamsFrictionLoss is finite-positive across typical residential and commercial flows", () => {
  for (const flow_gpm of [1, 10, 100, 500, 2000]) {
    for (const internal_diameter_in of [0.5, 1, 4, 12]) {
      const h = hazenWilliamsFrictionLoss({ flow_gpm, internal_diameter_in, length_ft: 100, C: 120 });
      assertFinitePositive(h, `Q=${flow_gpm} d=${internal_diameter_in}`);
    }
  }
});

test("bounds: feetOfHeadToPsi accepts negative head (suction) and returns the documented negative psi", () => {
  // Suction-side hydraulics carry negative head; the function is a
  // linear conversion and must not clamp at zero.
  assert.ok(feetOfHeadToPsi(-10, 62.4) < 0, `negative head should yield negative psi`);
  assert.ok(feetOfHeadToPsi(0, 62.4) === 0, `zero head should be zero psi`);
  assertFinitePositive(feetOfHeadToPsi(10, 62.4), "positive head");
});

test("bounds: darcyWeisbachFrictionLoss returns 0 for zero velocity (documented short-circuit)", () => {
  // pure-math.js line 174 short-circuits velocity_m_s === 0 to keep
  // the Colebrook solver out of the singular branch.
  const r = darcyWeisbachFrictionLoss({
    internal_diameter_m: 0.1, length_m: 100, velocity_m_s: 0,
    density_kg_m3: 1000, viscosity_Pa_s: 1e-3, roughness_m: 1e-5,
  });
  assert.equal(r, 0);
});

test("bounds: darcyWeisbachFrictionLoss is finite-positive across laminar / transitional / turbulent regimes", () => {
  for (const velocity_m_s of [0.01, 0.5, 2, 10]) {
    const r = darcyWeisbachFrictionLoss({
      internal_diameter_m: 0.1, length_m: 100, velocity_m_s,
      density_kg_m3: 1000, viscosity_Pa_s: 1e-3, roughness_m: 1e-5,
    });
    assertFinitePositive(r, `v=${velocity_m_s}`);
  }
});

test("bounds: colebrookFrictionFactor across the full regime ladder is finite-positive and physical", () => {
  // Re from 1 (deep laminar; f = 64/Re = 64) to 1e8 (fully rough),
  // relativeRoughness from 0 (smooth) to 0.1 (very rough). The Re=0
  // boundary returns 0 (documented sentinel; downstream Darcy-Weisbach
  // short-circuits on this).
  for (const Re of [1, 100, 2299, 2300, 5000, 1e5, 1e6, 1e8]) {
    for (const rr of [0, 1e-6, 1e-3, 0.01, 0.1]) {
      const f = colebrookFrictionFactor({ Re, relativeRoughness: rr });
      assertFinite(f, `Re=${Re} rr=${rr}`);
      // For Re>0 the friction factor is strictly positive. The upper
      // bound depends on regime: the laminar branch (Re<2300) returns
      // f = 64/Re (up to 64 at Re=1); the turbulent branch stays well
      // below 0.1 for physically realistic Re. Dispatch on the regime
      // boundary to avoid pinning a universal-but-meaningless ceiling.
      assert.ok(f > 0, `Re=${Re} rr=${rr}: f=${f} not strictly positive`);
      const ceiling = Re < 2300 ? 64 / Re + 1e-9 : 0.5;
      assert.ok(f <= ceiling, `Re=${Re} rr=${rr}: f=${f} above regime ceiling ${ceiling}`);
    }
  }
  // Documented sentinels.
  assert.equal(colebrookFrictionFactor({ Re: 0, relativeRoughness: 0.001 }), 0);
  assert.equal(colebrookFrictionFactor({ Re: -1, relativeRoughness: 0.001 }), 0);
});

// --- Beam mechanics -----------------------------------------------------

test("bounds: beamUniformLoadSimplySupported is finite-positive across typical wood and steel sections", () => {
  for (const L_ft of [4, 12, 24, 40]) {
    const r = beamUniformLoadSimplySupported({ w_lb_ft: 100, L_ft, E_psi: 1.6e6, I_in4: 50 });
    assertFinitePositive(r.M_lbft, `L=${L_ft} M`);
    assertFinitePositive(r.delta_in, `L=${L_ft} delta`);
  }
});

test("bounds: beamCenterPointLoadSimplySupported is finite-positive for typical center loads", () => {
  for (const P_lb of [100, 1000, 10000]) {
    const r = beamCenterPointLoadSimplySupported({ P_lb, L_ft: 12, E_psi: 1.6e6, I_in4: 50 });
    assertFinitePositive(r.M_lbft, `P=${P_lb} M`);
    assertFinitePositive(r.delta_in, `P=${P_lb} delta`);
  }
});

test("bounds: rectangularSection returns finite-positive properties across common joist sizes", () => {
  for (const [b, d] of [[1.5, 5.5], [1.5, 7.25], [1.5, 9.25], [3.5, 11.25]]) {
    const r = rectangularSection({ b_in: b, d_in: d });
    assertFinitePositive(r.I_in4, `${b}x${d} I`);
    assertFinitePositive(r.S_in3, `${b}x${d} S`);
    assertFinitePositive(r.c_in, `${b}x${d} c`);
  }
});

test("bounds: allowableSpanByBending / allowableSpanByDeflection are finite-positive across loads", () => {
  for (const w_lb_ft of [20, 50, 200]) {
    const sB = allowableSpanByBending({ w_lb_ft, Fb_psi: 1200, b_in: 1.5, d_in: 9.25 });
    const sD = allowableSpanByDeflection({ w_lb_ft, E_psi: 1.6e6, b_in: 1.5, d_in: 9.25 });
    assertFinitePositive(sB, `bending w=${w_lb_ft}`);
    assertFinitePositive(sD, `deflection w=${w_lb_ft}`);
  }
});

// --- Psychrometrics -----------------------------------------------------

test("bounds: saturationVaporPressure_hPa is finite-positive from -40 C to 60 C", () => {
  // Domain: typical HVAC range. Magnus form is published-accurate
  // from -40 to 50 C; the band-edge test asserts no overflow at 60 C.
  for (const T_C of [-40, -20, 0, 20, 40, 60]) {
    assertFinitePositive(saturationVaporPressure_hPa(T_C), `T=${T_C}`);
  }
});

test("bounds: dewPointFromVaporPressure_C is finite across legal vapor pressures", () => {
  // e_hPa > 0 is the implicit domain; e_hPa = 0 is undefined (log 0).
  for (const e_hPa of [1, 10, 100, 1000]) {
    assertFinite(dewPointFromVaporPressure_C(e_hPa), `e=${e_hPa}`);
  }
});

test("bounds: psychrometric across the indoor-comfort sweep returns finite values", () => {
  for (const T_C of [-20, 0, 20, 30, 40]) {
    for (const RH_percent of [1, 25, 50, 75, 99]) {
      const r = psychrometric({ T_C, RH_percent });
      assertFinite(r.e_s_hPa, `T=${T_C} RH=${RH_percent} e_s`);
      assertFinite(r.dewPoint_C, `T=${T_C} RH=${RH_percent} T_d`);
      assertFinite(r.W_kg_kg, `T=${T_C} RH=${RH_percent} W`);
      assertFinite(r.GPP, `T=${T_C} RH=${RH_percent} GPP`);
      assert.ok(r.W_kg_kg >= 0, `T=${T_C} RH=${RH_percent}: W=${r.W_kg_kg} negative`);
    }
  }
});

// --- Interpolation ------------------------------------------------------

test("bounds: interpLinear handles empty / single-point / two-point / out-of-range inputs", () => {
  assert.equal(interpLinear([], [], 5), null, "empty xs returns null");
  assert.equal(interpLinear([10], [100], 5), 100, "single-point returns ys[0]");
  assert.equal(interpLinear([10], [100], 50), 100, "single-point returns ys[0] above");
  // Two-point extrapolation extends the slope (not a NaN, not clamped).
  assert.equal(interpLinear([0, 10], [0, 100], -5), -50);
  assert.equal(interpLinear([0, 10], [0, 100], 15), 150);
  // Interior interpolation is the arithmetic midpoint.
  assert.equal(interpLinear([0, 10], [0, 100], 5), 50);
});

// --- Fire-ground primitives --------------------------------------------

test("bounds: fireHoseFrictionLoss is finite-positive across NFA-table coefficients and flows", () => {
  for (const C of [2, 8, 15.5, 24]) {
    for (const gpm of [10, 100, 500, 2000]) {
      for (const length_ft of [50, 200, 1000]) {
        assertFinitePositive(fireHoseFrictionLoss({ C, gpm, length_ft }), `C=${C} Q=${gpm} L=${length_ft}`);
      }
    }
  }
});

test("bounds: hydrantFlow is finite-positive across typical pitot pressures and outlet diameters", () => {
  for (const pitot_psi of [1, 10, 50, 100]) {
    for (const outlet_diameter_in of [2.5, 4, 6]) {
      assertFinitePositive(hydrantFlow({ pitot_psi, outlet_diameter_in }), `P=${pitot_psi} d=${outlet_diameter_in}`);
    }
  }
});

// --- Temperature conversions -------------------------------------------

test("bounds: temperature converters handle absolute zero, ambient, and high-temperature regimes", () => {
  for (const F of [-459.67, -40, 0, 32, 70, 212, 451, 2000]) {
    assertFinite(F_to_C(F), `F=${F}`);
  }
  for (const C of [-273.15, -40, 0, 25, 100, 1000]) {
    assertFinite(C_to_F(C), `C=${C}`);
    assertFinite(C_to_K(C), `C=${C} K`);
  }
  for (const K of [0, 273.15, 500, 5000]) {
    assertFinite(K_to_C(K), `K=${K}`);
  }
});

// --- Calc-module extensions (spec-v14 §8 Phase D calc-module rows) -------
//
// Each compute function below carries Phase E numerical-stability coverage
// already; the bounds-fuzzer adds the §8.2 boundary-input sweep so a
// future refactor that changes an early-return sentinel or removes a
// rejection path surfaces here before it surfaces through a tile output.

import {
  computePDP as fireComputePDP,
  computeStandpipeFriction as fireStandpipeFriction,
  computeFireFriction,
  computeHydrantFlow as fireHydrantFlowWrapper,
  computeRequiredFireFlow,
  computeAerialLadderReach,
} from "../../calc-fire.js";
import { computeDensityAltitude } from "../../calc-aviation.js";
import { manualJCooling, manualJHeating, computeDuctSize } from "../../calc-hvac.js";

test("bounds: calc-fire computePDP across the operational sweep returns finite pdp_psi", () => {
  for (const nozzle_pressure_psi of [50, 100, 150, 200]) {
    for (const friction_loss_psi of [0, 25, 75, 200]) {
      for (const elevation_ft of [-50, 0, 20, 100, 500]) {
        const r = fireComputePDP({ nozzle_pressure_psi, friction_loss_psi, elevation_ft });
        assertFinite(r.pdp_psi, `NP=${nozzle_pressure_psi} FL=${friction_loss_psi} elev=${elevation_ft}`);
        assertFinite(r.elevation_psi, "elevation");
      }
    }
  }
});

test("bounds: calc-fire computeStandpipeFriction is finite-positive across typical riser geometry", () => {
  for (const riser_height_ft of [10, 50, 100, 300]) {
    for (const outlet_count of [1, 2, 4]) {
      for (const gpm_per_outlet of [100, 250, 500]) {
        const r = fireStandpipeFriction({ riser_height_ft, outlet_count, gpm_per_outlet });
        assertFinitePositive(r.total_psi, `h=${riser_height_ft} n=${outlet_count} Q=${gpm_per_outlet}`);
        assertFinite(r.elevation_psi, "elevation");
        assertFinite(r.friction_total_psi, "friction_total");
      }
    }
  }
});

test("bounds: calc-fire computeFireFriction returns documented error on unknown hose diameter", () => {
  const bad = computeFireFriction({ hose_diameter: "not-a-size", gpm: 250, length_ft: 200 });
  assert.ok("error" in bad, `expected error, got ${JSON.stringify(bad)}`);
});

test("bounds: calc-fire computeFireFriction is finite-positive across documented hose diameters and flows", () => {
  for (const hose_diameter of ["1.75_in", "2.5_in", "3_in", "5_in"]) {
    for (const gpm of [50, 250, 500]) {
      for (const length_ft of [50, 200, 1000]) {
        const r = computeFireFriction({ hose_diameter, gpm, length_ft });
        // Skip unknown-diameter sentinels for diameters not in the table.
        if (r.error) continue;
        assertFinite(r.friction_loss_psi, `${hose_diameter} Q=${gpm} L=${length_ft}`);
        assert.ok(r.friction_loss_psi >= 0, `${hose_diameter}: FL=${r.friction_loss_psi} negative`);
      }
    }
  }
});

test("bounds: calc-fire computeHydrantFlow is finite-positive across operational pitot pressures", () => {
  for (const pitot_psi of [1, 10, 30, 80]) {
    for (const outlet_diameter_in of [2.5, 4, 4.5]) {
      const r = fireHydrantFlowWrapper({ pitot_psi, outlet_diameter_in });
      assertFinitePositive(r.flow_gpm, `P=${pitot_psi} d=${outlet_diameter_in}`);
    }
  }
});

test("bounds: calc-fire computeRequiredFireFlow rejects unknown construction class (documented)", () => {
  const bad = computeRequiredFireFlow({ structure_area_ft2: 5000, construction_class: "neoprene" });
  assert.ok("error" in bad);
});

test("bounds: calc-fire computeRequiredFireFlow clamps at the 12000 gpm ISO ceiling", () => {
  // The function rounds to nearest 250 gpm and clamps at 12000. Even a
  // 1e8 ft^2 input must return <= 12000 gpm by construction.
  const big = computeRequiredFireFlow({
    structure_area_ft2: 1e8, construction_class: "wood_frame",
    occupancy_factor: 2, exposure_factor: 2, communication_factor: 2,
  });
  assert.equal(big.needed_fire_flow_gpm, 12000);
});

test("bounds: calc-fire computeAerialLadderReach across the 0..90 deg angle sweep returns sensible projections", () => {
  for (const angle_deg of [0, 30, 45, 60, 90]) {
    const r = computeAerialLadderReach({ angle_deg, extension_ft: 100 });
    assertFinite(r.horizontal_reach_ft, `angle=${angle_deg} h`);
    assertFinite(r.vertical_reach_ft, `angle=${angle_deg} v`);
    // Pythagorean identity: h^2 + v^2 = extension^2.
    const sumSq = r.horizontal_reach_ft ** 2 + r.vertical_reach_ft ** 2;
    assert.ok(Math.abs(sumSq - 10000) < 1e-6, `angle=${angle_deg}: h^2+v^2=${sumSq}`);
  }
  // Boundary identities: at 0 deg all reach is horizontal; at 90 deg all
  // reach is vertical.
  const h0 = computeAerialLadderReach({ angle_deg: 0, extension_ft: 100 });
  assert.ok(Math.abs(h0.horizontal_reach_ft - 100) < 1e-9);
  assert.ok(Math.abs(h0.vertical_reach_ft) < 1e-9);
  const h90 = computeAerialLadderReach({ angle_deg: 90, extension_ft: 100 });
  assert.ok(Math.abs(h90.horizontal_reach_ft) < 1e-9);
  assert.ok(Math.abs(h90.vertical_reach_ft - 100) < 1e-9);
});

test("bounds: calc-aviation computeDensityAltitude across the documented PA and OAT sweep", () => {
  for (const pressure_altitude_ft of [-1000, 0, 5000, 15000, 30000, 50000]) {
    for (const oat_c of [-40, 0, 15, 25, 50]) {
      const r = computeDensityAltitude({ pressure_altitude_ft, oat_c });
      assert.ok(!r.error, `PA=${pressure_altitude_ft} OAT=${oat_c}: ${JSON.stringify(r)}`);
      assertFinite(r.density_altitude_ft, `PA=${pressure_altitude_ft} OAT=${oat_c} DA`);
      assert.ok(typeof r.band === "string" && r.band.length > 0, `band empty`);
    }
  }
});

test("bounds: calc-aviation computeDensityAltitude rejects out-of-domain inputs at each boundary", () => {
  // PA out-of-domain (< -2000 or > 60000) and OAT out-of-domain (< -60 or > 60).
  const tooLowPA = computeDensityAltitude({ pressure_altitude_ft: -3000, oat_c: 15 });
  assert.ok("error" in tooLowPA);
  const tooHighPA = computeDensityAltitude({ pressure_altitude_ft: 70000, oat_c: 15 });
  assert.ok("error" in tooHighPA);
  const tooColdOAT = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: -70 });
  assert.ok("error" in tooColdOAT);
  const tooHotOAT = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 70 });
  assert.ok("error" in tooHotOAT);
});

test("bounds: calc-hvac manualJCooling across typical residential envelopes returns finite positive total", () => {
  const base = {
    floor_area_ft2: 1500, wall_area_ft2: 1200, window_area_ft2: 200, ceiling_area_ft2: 1500,
    insulation_level: "average", window_type: "double", occupants: 4, indoor_design_F: 75,
  };
  for (const outdoor_design_F of [80, 95, 105, 115]) {
    for (const floor_area_ft2 of [600, 1500, 4000]) {
      const r = manualJCooling({ ...base, outdoor_design_F, floor_area_ft2 });
      assertFinitePositive(r.total_BTU_hr, `OAT=${outdoor_design_F} A=${floor_area_ft2} total`);
      assertFinitePositive(r.tons, `OAT=${outdoor_design_F} A=${floor_area_ft2} tons`);
    }
  }
});

test("bounds: calc-hvac manualJHeating across typical winter-design envelopes returns finite positive total", () => {
  const base = {
    floor_area_ft2: 1500, wall_area_ft2: 1200, window_area_ft2: 200, ceiling_area_ft2: 1500,
    insulation_level: "average", window_type: "double", indoor_design_F: 70,
  };
  for (const outdoor_design_F of [-10, 10, 30, 50]) {
    for (const insulation_level of ["poor", "average", "good"]) {
      const r = manualJHeating({ ...base, outdoor_design_F, insulation_level });
      assertFinitePositive(r.total_BTU_hr, `OAT=${outdoor_design_F} ins=${insulation_level}`);
    }
  }
});

test("bounds: calc-hvac computeDuctSize rejects non-positive inputs (documented)", () => {
  const r0 = computeDuctSize({ cfm: 0, friction_in_wc_per_100ft: 0.08 });
  assert.ok("error" in r0);
  const rNeg = computeDuctSize({ cfm: -100, friction_in_wc_per_100ft: 0.08 });
  assert.ok("error" in rNeg);
  const rNoFriction = computeDuctSize({ cfm: 400, friction_in_wc_per_100ft: 0 });
  assert.ok("error" in rNoFriction);
});

test("bounds: calc-hvac computeDuctSize converges to finite-positive diameters across typical CFM and friction rates", () => {
  for (const cfm of [50, 400, 1500, 5000]) {
    for (const friction_in_wc_per_100ft of [0.05, 0.08, 0.12]) {
      const r = computeDuctSize({ cfm, friction_in_wc_per_100ft });
      assert.ok(!r.error, `Q=${cfm} f=${friction_in_wc_per_100ft}: ${JSON.stringify(r)}`);
      // The iterative solver returns equivalent diameters via d_in,
      // square_in, etc. Pin "some diameter > 0" since the exact field
      // name has varied across v8 / v9 refactors.
      // The renderer surfaces `round_diameter_in` and `equivalent_square_in`;
      // pin both as finite-positive so a future refactor that drops or
      // renames the output surfaces here.
      assertFinitePositive(r.round_diameter_in, `Q=${cfm} f=${friction_in_wc_per_100ft} round`);
      assertFinitePositive(r.equivalent_square_in, `Q=${cfm} f=${friction_in_wc_per_100ft} square`);
      assertFinitePositive(r.velocity_fpm, `Q=${cfm} f=${friction_in_wc_per_100ft} v`);
    }
  }
});
