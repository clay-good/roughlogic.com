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
  computeFoam,
  computeMasterStreamReach,
  computeReverseLayFriction,
  computeSprinklerDensity,
  computeBrakingDistance,
  computeConfinedSpacePurge,
  computeRopeMA,
  computeSlingAngle,
} from "../../calc-fire.js";
import {
  computeDensityAltitude,
  computeCrosswind,
  computeETE,
  computeHypoxiaAltitude,
  computePressureAltitude,
  computeTopOfDescent,
  computeTrueAirspeed,
} from "../../calc-aviation.js";
import {
  manualJCooling,
  manualJHeating,
  computeDuctSize,
  computeSHR,
  computeSeerEer,
  computeBalancePoint,
  computeCfmPerTon,
  computeCombustionAir,
  computeApproachDeltaT,
  computeEvaporativeCooling,
  computeAffinityLaws,
  computeOutdoorAirMix,
} from "../../calc-hvac.js";

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

test("bounds: calc-fire computeFoam is finite-positive across typical fire areas and foam percentages", () => {
  for (const fire_area_ft2 of [100, 1500, 10000]) {
    for (const foam_percentage of [1, 3, 6]) {
      for (const duration_min of [5, 15, 60]) {
        const r = computeFoam({ fire_area_ft2, foam_percentage, duration_min });
        assertFinitePositive(r.total_solution_gpm, `A=${fire_area_ft2} pct=${foam_percentage} t=${duration_min} total_gpm`);
        assertFinitePositive(r.concentrate_gpm, `A=${fire_area_ft2} pct=${foam_percentage} t=${duration_min} conc`);
        assertFinitePositive(r.total_concentrate_gallons, `A=${fire_area_ft2} pct=${foam_percentage} t=${duration_min} conc_total`);
      }
    }
  }
});

test("bounds: calc-fire computeMasterStreamReach rejects unknown nozzle type (documented)", () => {
  const bad = computeMasterStreamReach({ nozzle_type: "not-a-nozzle", nozzle_pressure_psi: 80 });
  assert.ok("error" in bad);
});

test("bounds: calc-fire computeMasterStreamReach scales as sqrt(P/P_typical) across the typical operating sweep", () => {
  // The reach formula is r = base_reach * sqrt(P / P_typical). Doubling
  // pressure scales reach by sqrt(2); the invariant pins this against a
  // future refactor that swaps the exponent.
  const a = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  const b = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 160 });
  assertFinitePositive(a.typical_reach_ft, "P=80");
  assertFinitePositive(b.typical_reach_ft, "P=160");
  const ratio = b.typical_reach_ft / a.typical_reach_ft;
  assert.ok(Math.abs(ratio - Math.sqrt(2)) < 1e-9, `sqrt(P) scaling: ratio=${ratio}`);
});

test("bounds: calc-fire computeReverseLayFriction obeys 1/n^2 parallel scaling exactly", () => {
  // Per-pump load on a tandem operation scales as (1/n_pumps)^2. The
  // invariant pins the exponent: a refactor that swaps the power fails
  // here before it surfaces at a captain's pump panel.
  const a = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 1 });
  const b = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 2 });
  assertFinitePositive(a.per_pump_psi, "n=1");
  assertFinitePositive(b.per_pump_psi, "n=2");
  const ratio = b.per_pump_psi / a.per_pump_psi;
  assert.ok(Math.abs(ratio - 0.25) < 1e-9, `1/n^2 scaling: ratio=${ratio} (expected 0.25)`);
});

test("bounds: calc-fire computeReverseLayFriction rejects unknown hose diameter (documented)", () => {
  const bad = computeReverseLayFriction({ hose_diameter: "not-a-size", gpm: 1000, length_ft: 1000, n_pumps: 2 });
  assert.ok("error" in bad);
});

test("bounds: calc-fire computeSprinklerDensity is finite-positive across NFPA 13 hazard categories", () => {
  for (const hazard_category of ["light", "ordinary_1", "ordinary_2", "extra_1", "extra_2"]) {
    for (const area_of_operation_ft2 of [500, 1500, 5000]) {
      const r = computeSprinklerDensity({ area_of_operation_ft2, density_gpm_per_ft2: 0, hazard_category });
      assertFinitePositive(r.total_gpm, `hazard=${hazard_category} A=${area_of_operation_ft2}`);
      assert.equal(r.meets_minimum, true, "hazard density should meet its own minimum");
    }
  }
});

test("bounds: calc-fire computeSprinklerDensity rejects non-positive area + missing density (documented)", () => {
  const bad = computeSprinklerDensity({ area_of_operation_ft2: 0, density_gpm_per_ft2: 0.2 });
  assert.ok("error" in bad);
  const noDensity = computeSprinklerDensity({ area_of_operation_ft2: 1500, density_gpm_per_ft2: 0 });
  assert.ok("error" in noDensity);
});

test("bounds: calc-fire computeBrakingDistance is finite-positive across typical operational ranges", () => {
  for (const speed_mph of [20, 35, 55, 80]) {
    for (const friction_coefficient of [0.3, 0.5, 0.8]) {
      const r = computeBrakingDistance({ speed_mph, friction_coefficient });
      assertFinitePositive(r.braking_distance_ft, `v=${speed_mph} mu=${friction_coefficient}`);
      assertFinitePositive(r.reaction_distance_ft, `v=${speed_mph} reaction`);
      assertFinitePositive(r.total_distance_ft, `v=${speed_mph} total`);
    }
  }
});

test("bounds: calc-fire computeBrakingDistance rejects non-positive speed or friction + impossible downhill ice (documented)", () => {
  assert.ok("error" in computeBrakingDistance({ speed_mph: 0, friction_coefficient: 0.5 }));
  assert.ok("error" in computeBrakingDistance({ speed_mph: 50, friction_coefficient: 0 }));
  // mu=0.05 with grade_percent=-10 -> eff = 0.05 - 0.10 = -0.05 (negative)
  assert.ok("error" in computeBrakingDistance({ speed_mph: 50, friction_coefficient: 0.05, grade_percent: -10 }));
});

test("bounds: calc-fire computeConfinedSpacePurge across typical volumes and blower rates", () => {
  for (const volume_ft3 of [200, 1000, 5000]) {
    for (const blower_cfm of [50, 200, 1000]) {
      const r = computeConfinedSpacePurge({ volume_ft3, blower_cfm });
      assertFinitePositive(r.minutes, `V=${volume_ft3} CFM=${blower_cfm}`);
    }
  }
});

test("bounds: calc-fire computeRopeMA rejects unknown rig type + asserts efficiency band (documented)", () => {
  assert.ok("error" in computeRopeMA({ rig: "not-a-rig", efficiency: 0.9, load_lb: 600 }));
  assert.ok("error" in computeRopeMA({ rig: "3:1", efficiency: 0, load_lb: 600 }));
  assert.ok("error" in computeRopeMA({ rig: "3:1", efficiency: 1.5, load_lb: 600 }));
});

test("bounds: calc-fire computeRopeMA across the documented rig types returns finite-positive MA", () => {
  for (const rig of ["1:1", "2:1", "3:1", "4:1", "5:1", "T_method"]) {
    const r = computeRopeMA({ rig, efficiency: 0.9, load_lb: 600 });
    assertFinitePositive(r.theoretical_ma, `rig=${rig} theor`);
    assertFinitePositive(r.actual_ma, `rig=${rig} actual`);
    // Actual MA is always less than or equal to theoretical (friction).
    assert.ok(r.actual_ma <= r.theoretical_ma + 1e-9, `rig=${rig}: actual=${r.actual_ma} > theor=${r.theoretical_ma}`);
  }
});

test("bounds: calc-fire computeSlingAngle is finite-positive across documented configurations", () => {
  for (const sling_config of ["vertical", "basket", "bridle", "choker"]) {
    for (const included_angle_deg of [30, 60, 90, 120]) {
      const r = computeSlingAngle({ load_lb: 2000, sling_config, included_angle_deg, n_legs: 2 });
      assertFinitePositive(r.tension_per_leg_lb, `cfg=${sling_config} angle=${included_angle_deg}`);
    }
  }
});

test("bounds: calc-fire computeSlingAngle rejects out-of-domain angle / config (documented)", () => {
  assert.ok("error" in computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 0, n_legs: 2 }));
  assert.ok("error" in computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 180, n_legs: 2 }));
  assert.ok("error" in computeSlingAngle({ load_lb: 1000, sling_config: "not-a-config", included_angle_deg: 60, n_legs: 2 }));
  assert.ok("error" in computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 60, n_legs: 0 }));
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

// --------------------------------------------------------------------
// calc-aviation expansion (spec-v14 §8.4 Phase D follow-up).
// Six additional computeX functions move calc-aviation.js coverage from
// 1 / 36 (3%) -> 7 / 36 (19%). Same warn-on-missing lint, same per-
// function pin pattern: a documented operational sweep, the documented
// boundary rejections, and where the function carries a closed-form
// identity (3-to-1 descent, Pythagorean HW/CW decomposition, ISA
// pressure-altitude offset) the identity is pinned exactly so a refactor
// that swaps a constant surfaces here.
// --------------------------------------------------------------------

test("bounds: calc-aviation computePressureAltitude across the documented elevation x altimeter sweep", () => {
  for (const field_elevation_ft of [-500, 0, 2500, 5430, 10000, 14000]) {
    for (const altimeter_setting_inHg of [28.50, 29.92, 30.50, 31.00]) {
      const r = computePressureAltitude({ field_elevation_ft, altimeter_setting_inHg });
      assert.ok(!r.error, `E=${field_elevation_ft} A=${altimeter_setting_inHg}: ${JSON.stringify(r)}`);
      assertFinite(r.pressure_altitude_ft, `E=${field_elevation_ft} A=${altimeter_setting_inHg} PA`);
      // Identity pin: PA = elev + 1000 * (29.92 - altimeter); catches a
      // refactor that swaps the 29.92 ISA constant or the 1000-ft scale.
      const expected = field_elevation_ft + 1000 * (29.92 - altimeter_setting_inHg);
      assert.ok(
        Math.abs(r.pressure_altitude_ft - expected) < 1e-9,
        `PA identity E=${field_elevation_ft} A=${altimeter_setting_inHg}: got ${r.pressure_altitude_ft}, expected ${expected}`,
      );
    }
  }
});

test("bounds: calc-aviation computePressureAltitude rejects out-of-domain inputs at each boundary", () => {
  assert.ok("error" in computePressureAltitude({ field_elevation_ft: -3000, altimeter_setting_inHg: 29.92 }));
  assert.ok("error" in computePressureAltitude({ field_elevation_ft: 70000, altimeter_setting_inHg: 29.92 }));
  assert.ok("error" in computePressureAltitude({ field_elevation_ft: 1000, altimeter_setting_inHg: 24 }));
  assert.ok("error" in computePressureAltitude({ field_elevation_ft: 1000, altimeter_setting_inHg: 36 }));
  assert.ok("error" in computePressureAltitude({ field_elevation_ft: "x", altimeter_setting_inHg: 29.92 }));
});

test("bounds: calc-aviation computeCrosswind obeys the Pythagorean HW/CW decomposition across the wind-angle sweep", () => {
  for (const runway_heading_deg of [0, 90, 180, 270, 360]) {
    for (const wind_direction_deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      for (const wind_speed_kt of [0, 5, 15, 35, 80]) {
        const r = computeCrosswind({ runway_heading_deg, wind_direction_deg, wind_speed_kt });
        assert.ok(!r.error, `rwy=${runway_heading_deg} wd=${wind_direction_deg} ws=${wind_speed_kt}: ${JSON.stringify(r)}`);
        assertFinite(r.headwind_kt, `HW`);
        assertFinite(r.crosswind_kt, `CW`);
        // HW^2 + CW^2 = WS^2 by construction; catches a refactor that
        // swaps sin / cos or drops the wind-angle normalization.
        const sumSq = r.headwind_kt * r.headwind_kt + r.crosswind_kt * r.crosswind_kt;
        assert.ok(
          Math.abs(sumSq - wind_speed_kt * wind_speed_kt) < 1e-9,
          `Pythag rwy=${runway_heading_deg} wd=${wind_direction_deg} ws=${wind_speed_kt}: ${sumSq} vs ${wind_speed_kt ** 2}`,
        );
      }
    }
  }
});

test("bounds: calc-aviation computeCrosswind rejects out-of-domain heading, direction, or speed (documented)", () => {
  assert.ok("error" in computeCrosswind({ runway_heading_deg: -1, wind_direction_deg: 90, wind_speed_kt: 10 }));
  assert.ok("error" in computeCrosswind({ runway_heading_deg: 361, wind_direction_deg: 90, wind_speed_kt: 10 }));
  assert.ok("error" in computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: -1, wind_speed_kt: 10 }));
  assert.ok("error" in computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 400, wind_speed_kt: 10 }));
  assert.ok("error" in computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 90, wind_speed_kt: -1 }));
  assert.ok("error" in computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 90, wind_speed_kt: 250 }));
  assert.ok("error" in computeCrosswind({ runway_heading_deg: "x", wind_direction_deg: 90, wind_speed_kt: 10 }));
});

test("bounds: calc-aviation computeCrosswind pins the demonstrated-crosswind status across the threshold", () => {
  // 90 deg off (pure crosswind) at exactly the demonstrated limit -> within.
  const within = computeCrosswind({ runway_heading_deg: 0, wind_direction_deg: 90, wind_speed_kt: 15, demonstrated_crosswind_kt: 15 });
  assert.ok(within.demo_status && /within/.test(within.demo_status), `at-limit should be within: ${within.demo_status}`);
  // Same geometry, 1 kt over the limit -> exceeds.
  const over = computeCrosswind({ runway_heading_deg: 0, wind_direction_deg: 90, wind_speed_kt: 16, demonstrated_crosswind_kt: 15 });
  assert.ok(over.demo_status && /exceeds/.test(over.demo_status), `over-limit should exceed: ${over.demo_status}`);
});

test("bounds: calc-aviation computeETE pins the time = distance / groundspeed identity across the sweep", () => {
  for (const distance_nm of [10, 100, 250, 1000]) {
    for (const groundspeed_kt of [60, 120, 250, 480]) {
      const r = computeETE({ distance_nm, groundspeed_kt });
      assert.ok(!r.error, `D=${distance_nm} GS=${groundspeed_kt}: ${JSON.stringify(r)}`);
      assertFinitePositive(r.ete_hours, `ete_hours`);
      assertFinitePositive(r.ete_minutes, `ete_minutes`);
      assert.ok(
        Math.abs(r.ete_hours - distance_nm / groundspeed_kt) < 1e-12,
        `ETE identity D=${distance_nm} GS=${groundspeed_kt}: ${r.ete_hours} vs ${distance_nm / groundspeed_kt}`,
      );
      assert.ok(typeof r.ete_hhmm === "string" && /^\d{2}:\d{2}$/.test(r.ete_hhmm), `hhmm shape`);
    }
  }
});

test("bounds: calc-aviation computeETE rejects non-positive distance or groundspeed (documented)", () => {
  assert.ok("error" in computeETE({ distance_nm: 0, groundspeed_kt: 120 }));
  assert.ok("error" in computeETE({ distance_nm: -10, groundspeed_kt: 120 }));
  assert.ok("error" in computeETE({ distance_nm: 100, groundspeed_kt: 0 }));
  assert.ok("error" in computeETE({ distance_nm: 100, groundspeed_kt: -1 }));
});

test("bounds: calc-aviation computeETE rolls ETA across midnight correctly", () => {
  // 23:00 local + 02:30 ETE -> 01:30 (next day, hh:mm format only).
  const r = computeETE({ distance_nm: 250, groundspeed_kt: 100, departure_time_local: "23:00" });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.eta_local_hhmm, "01:30");
});

test("bounds: calc-aviation computeHypoxiaAltitude covers each 14 CFR §91.211 band", () => {
  const cases = [
    { alt: 8000, band_match: /below 12,500/, crew: false, all: false },
    { alt: 13000, band_match: /12,500 to 14,000/, crew: true, all: false },
    { alt: 14500, band_match: /14,000 to 15,000/, crew: true, all: false },
    { alt: 18000, band_match: /above 15,000/, crew: true, all: true },
  ];
  for (const c of cases) {
    const r = computeHypoxiaAltitude({ cabin_altitude_ft: c.alt });
    assert.ok(!r.error, `alt=${c.alt}: ${JSON.stringify(r)}`);
    assert.ok(c.band_match.test(r.band), `alt=${c.alt} band: ${r.band}`);
    assert.strictEqual(r.crew_o2_required, c.crew, `alt=${c.alt} crew`);
    assert.strictEqual(r.all_occupants_o2_required, c.all, `alt=${c.alt} all`);
  }
});

test("bounds: calc-aviation computeHypoxiaAltitude rejects out-of-domain altitudes (documented)", () => {
  assert.ok("error" in computeHypoxiaAltitude({ cabin_altitude_ft: -3000 }));
  assert.ok("error" in computeHypoxiaAltitude({ cabin_altitude_ft: 60000 }));
  assert.ok("error" in computeHypoxiaAltitude({ cabin_altitude_ft: "x" }));
});

test("bounds: calc-aviation computeTopOfDescent obeys the 3-to-1 rule and the GS*5.556 fpm identity", () => {
  for (const cruise_altitude_ft of [5000, 15000, 25000, 40000]) {
    for (const target_altitude_ft of [0, 2000, 4500]) {
      for (const ground_speed_kt of [90, 150, 250, 480]) {
        if (cruise_altitude_ft <= target_altitude_ft) continue;
        const r = computeTopOfDescent({ cruise_altitude_ft, target_altitude_ft, ground_speed_kt });
        assert.ok(!r.error, `cr=${cruise_altitude_ft} tg=${target_altitude_ft} gs=${ground_speed_kt}: ${JSON.stringify(r)}`);
        const alt_lose = cruise_altitude_ft - target_altitude_ft;
        // 3-to-1 rule: distance_nm = (alt_lose / 1000) * 3 exactly.
        assert.ok(
          Math.abs(r.distance_to_start_nm - (alt_lose / 1000) * 3) < 1e-9,
          `3:1 cr=${cruise_altitude_ft} tg=${target_altitude_ft} gs=${ground_speed_kt}`,
        );
        // Descent-rate identity: fpm = GS * 1000 / (60 * 3) = GS * 5.5555...
        assert.ok(
          Math.abs(r.descent_rate_fpm - (ground_speed_kt * 1000) / 180) < 1e-9,
          `fpm identity cr=${cruise_altitude_ft} tg=${target_altitude_ft} gs=${ground_speed_kt}`,
        );
        assertFinitePositive(r.time_to_descend_min, `time`);
      }
    }
  }
});

test("bounds: calc-aviation computeTopOfDescent rejects out-of-domain altitudes, ground speeds, and cruise-below-target (documented)", () => {
  assert.ok("error" in computeTopOfDescent({ cruise_altitude_ft: 5000, target_altitude_ft: 10000, ground_speed_kt: 240 }));
  assert.ok("error" in computeTopOfDescent({ cruise_altitude_ft: 25000, target_altitude_ft: 5000, ground_speed_kt: 0 }));
  assert.ok("error" in computeTopOfDescent({ cruise_altitude_ft: 25000, target_altitude_ft: 5000, ground_speed_kt: 700 }));
  assert.ok("error" in computeTopOfDescent({ cruise_altitude_ft: 70000, target_altitude_ft: 5000, ground_speed_kt: 240 }));
  assert.ok("error" in computeTopOfDescent({ cruise_altitude_ft: "x", target_altitude_ft: 5000, ground_speed_kt: 240 }));
});

test("bounds: calc-aviation computeTrueAirspeed is finite-positive across the documented sweep and pins the ISA sea-level identity", () => {
  for (const cas_kt of [80, 120, 200, 350]) {
    for (const pressure_altitude_ft of [0, 5000, 15000, 30000]) {
      for (const oat_c of [-40, -10, 15, 40]) {
        const r = computeTrueAirspeed({ cas_kt, pressure_altitude_ft, oat_c });
        if (r.error) continue;
        assertFinitePositive(r.tas_kt, `cas=${cas_kt} PA=${pressure_altitude_ft} OAT=${oat_c}`);
        assertFinitePositive(r.density_ratio, `rho_ratio`);
        // TAS / CAS == 1 / sqrt(density_ratio) by construction; catches
        // a refactor that swaps the density-ratio exponent (4.2561) or
        // the 145442 ft scale.
        assert.ok(
          Math.abs(r.tas_kt - cas_kt / Math.sqrt(r.density_ratio)) < 1e-9,
          `TAS = CAS / sqrt(rho_ratio) cas=${cas_kt} PA=${pressure_altitude_ft} OAT=${oat_c}: TAS=${r.tas_kt}`,
        );
        assertFinite(r.mach, `mach`);
      }
    }
  }
  // Sea-level ISA pin: PA=0, OAT=15 -> density ratio == 1 -> TAS == CAS.
  const isa = computeTrueAirspeed({ cas_kt: 150, pressure_altitude_ft: 0, oat_c: 15 });
  assert.ok(!isa.error, JSON.stringify(isa));
  assert.ok(Math.abs(isa.tas_kt - 150) < 1e-6, `ISA sea-level TAS==CAS: ${isa.tas_kt}`);
  assert.ok(Math.abs(isa.density_ratio - 1) < 1e-9, `ISA sea-level rho==1: ${isa.density_ratio}`);
});

test("bounds: calc-aviation computeTrueAirspeed rejects out-of-domain CAS / PA / OAT (documented)", () => {
  assert.ok("error" in computeTrueAirspeed({ cas_kt: 0, pressure_altitude_ft: 5000, oat_c: 15 }));
  assert.ok("error" in computeTrueAirspeed({ cas_kt: -10, pressure_altitude_ft: 5000, oat_c: 15 }));
  assert.ok("error" in computeTrueAirspeed({ cas_kt: 120, pressure_altitude_ft: -3000, oat_c: 15 }));
  assert.ok("error" in computeTrueAirspeed({ cas_kt: 120, pressure_altitude_ft: 70000, oat_c: 15 }));
  assert.ok("error" in computeTrueAirspeed({ cas_kt: 120, pressure_altitude_ft: 5000, oat_c: -100 }));
  assert.ok("error" in computeTrueAirspeed({ cas_kt: 120, pressure_altitude_ft: 5000, oat_c: 80 }));
});

// --------------------------------------------------------------------
// calc-hvac expansion (spec-v14 §8.4 Phase D follow-up). Nine new
// compute functions move calc-hvac.js coverage from 3 / 54 (6%) ->
// 12 / 54 (22%). Same warn-on-missing scaffolding; per-function pin
// pattern matches the calc-fire / calc-aviation expansions: sweep +
// boundary rejections + closed-form identity pins (SHR ratio, SEER ~
// 1.12 * EER round-trip, CFM per ton exact factors per climate, fan-
// affinity Q ~ N + SP ~ N^2 + kW ~ N^3, evaporative-cooling
// hfg identity, outdoor-air mass-balance temperature mix).
// --------------------------------------------------------------------

test("bounds: calc-hvac computeSHR pins the sensible/total ratio across the residential cooling sweep", () => {
  for (const total_btu_hr of [12000, 24000, 36000, 60000]) {
    for (const ratio of [0.65, 0.75, 0.85, 1.0]) {
      const sensible_btu_hr = total_btu_hr * ratio;
      const r = computeSHR({ sensible_btu_hr, total_btu_hr });
      assert.ok(!r.error, `S=${sensible_btu_hr} T=${total_btu_hr}: ${JSON.stringify(r)}`);
      assert.ok(
        Math.abs(r.SHR - ratio) < 1e-12,
        `SHR identity S=${sensible_btu_hr} T=${total_btu_hr}: got ${r.SHR}, expected ${ratio}`,
      );
    }
  }
});

test("bounds: calc-hvac computeSHR rejects non-positive total load (documented)", () => {
  assert.ok("error" in computeSHR({ sensible_btu_hr: 24000, total_btu_hr: 0 }));
  assert.ok("error" in computeSHR({ sensible_btu_hr: 24000, total_btu_hr: -1 }));
});

test("bounds: calc-hvac computeSeerEer round-trips EER -> SEER -> EER exactly across the rating sweep", () => {
  for (const eer of [9, 11, 12, 14, 16]) {
    const fwd = computeSeerEer({ value: eer, from: "EER" });
    assertFinitePositive(fwd.SEER, `EER=${eer} SEER`);
    assertFinitePositive(fwd.SEER2_estimate, `EER=${eer} SEER2_estimate`);
    // SEER = EER * 1.12 exactly; SEER2_estimate = SEER * 0.95.
    assert.ok(Math.abs(fwd.SEER - eer * 1.12) < 1e-12, `SEER identity EER=${eer}`);
    assert.ok(Math.abs(fwd.SEER2_estimate - eer * 1.12 * 0.95) < 1e-12, `SEER2 identity EER=${eer}`);
    // Reverse: SEER -> EER should land back at the original within fp tolerance.
    const back = computeSeerEer({ value: fwd.SEER, from: "SEER" });
    assert.ok(Math.abs(back.EER - eer) < 1e-12, `round-trip EER=${eer}: ${back.EER}`);
  }
});

test("bounds: calc-hvac computeSeerEer rejects unknown rating system (documented)", () => {
  const r = computeSeerEer({ value: 12, from: "not-a-rating" });
  assert.ok("error" in r);
});

test("bounds: calc-hvac computeBalancePoint returns finite temperature across typical heat-pump capacity / load combinations", () => {
  for (const heating_capacity_btu_hr_at_design of [24000, 36000, 48000]) {
    for (const design_outdoor_F of [-10, 5, 17, 30]) {
      for (const building_heat_loss_btu_hr of [30000, 50000, 80000]) {
        const r = computeBalancePoint({
          heating_capacity_btu_hr_at_design,
          design_outdoor_F,
          building_heat_loss_btu_hr,
          indoor_F: 70,
        });
        assertFinite(r.balance_point_F, `cap=${heating_capacity_btu_hr_at_design} d=${design_outdoor_F} L=${building_heat_loss_btu_hr}`);
      }
    }
  }
});

test("bounds: calc-hvac computeCfmPerTon pins the per-climate exact factor and rejects non-positive tons (documented)", () => {
  const factors = { dry: 450, standard: 400, humid: 350 };
  for (const [climate, factor] of Object.entries(factors)) {
    for (const tons of [1, 2.5, 5, 10]) {
      const r = computeCfmPerTon({ tons, climate });
      assert.ok(!r.error, `tons=${tons} climate=${climate}: ${JSON.stringify(r)}`);
      assert.strictEqual(r.cfm_per_ton, factor, `factor ${climate}`);
      assert.ok(
        Math.abs(r.total_cfm - tons * factor) < 1e-9,
        `total_cfm identity tons=${tons} climate=${climate}: ${r.total_cfm} vs ${tons * factor}`,
      );
    }
  }
  // Unknown climate falls back to standard per the documented default.
  const fallback = computeCfmPerTon({ tons: 3, climate: "not-a-climate" });
  assert.strictEqual(fallback.cfm_per_ton, 400);
  // Non-positive tons rejected.
  assert.ok("error" in computeCfmPerTon({ tons: 0, climate: "standard" }));
  assert.ok("error" in computeCfmPerTon({ tons: -1, climate: "standard" }));
});

test("bounds: calc-hvac computeCombustionAir pins the 50/1000 volume threshold and the 1/1000 + 1/4000 opening rules", () => {
  for (const btu_input of [50000, 100000, 200000, 400000]) {
    for (const room_volume_ft3 of [500, 4000, 20000]) {
      const r = computeCombustionAir({ btu_input, room_volume_ft3 });
      // Volume rule: required_volume = btu/1000 * 50; adequate iff room >= required.
      const expected_required = (btu_input / 1000) * 50;
      assert.ok(
        Math.abs(r.required_volume_ft3 - expected_required) < 1e-9,
        `required_volume btu=${btu_input}: ${r.required_volume_ft3} vs ${expected_required}`,
      );
      assert.strictEqual(r.adequate_by_volume, room_volume_ft3 >= expected_required);
      // Opening rules: outdoor = btu/1000, indoor = btu/4000.
      assert.ok(Math.abs(r.opening_outdoor_in2 - btu_input / 1000) < 1e-9, `outdoor opening`);
      assert.ok(Math.abs(r.opening_indoor_in2 - btu_input / 4000) < 1e-9, `indoor opening`);
    }
  }
});

test("bounds: calc-hvac computeApproachDeltaT pins the approach = sat - outdoor and delta_T = return - supply identities", () => {
  for (const outdoor_F of [70, 85, 95, 105]) {
    for (const condenser_saturation_F of [90, 105, 120]) {
      for (const supply_F of [50, 55, 60]) {
        for (const return_F of [70, 75, 80]) {
          const r = computeApproachDeltaT({ outdoor_F, condenser_saturation_F, supply_F, return_F });
          assert.ok(
            Math.abs(r.approach_F - (condenser_saturation_F - outdoor_F)) < 1e-12,
            `approach OAT=${outdoor_F} sat=${condenser_saturation_F}`,
          );
          assert.ok(
            Math.abs(r.delta_T_F - (return_F - supply_F)) < 1e-12,
            `delta_T s=${supply_F} r=${return_F}`,
          );
          assert.ok(typeof r.approach_band === "string" && r.approach_band.length > 0, `approach_band empty`);
          assert.ok(typeof r.delta_T_band === "string" && r.delta_T_band.length > 0, `dT_band empty`);
        }
      }
    }
  }
});

test("bounds: calc-hvac computeEvaporativeCooling pins the Q = m * hfg identity and the 12000 BTU/hr per ton conversion", () => {
  for (const evaporation_rate_lb_hr of [1, 10, 50, 200]) {
    const r = computeEvaporativeCooling({ evaporation_rate_lb_hr });
    assert.ok(!r.error, `m=${evaporation_rate_lb_hr}: ${JSON.stringify(r)}`);
    assertFinitePositive(r.cooling_btu_hr, `Q`);
    assertFinitePositive(r.cooling_tons, `tons`);
    // Per-test identity using the renderer-default hfg (the example pins 10 lb/hr -> 10540 btu/hr, so hfg = 1054).
    assert.ok(Math.abs(r.cooling_btu_hr - evaporation_rate_lb_hr * 1054) < 1e-9, `Q identity m=${evaporation_rate_lb_hr}`);
    assert.ok(Math.abs(r.cooling_tons - r.cooling_btu_hr / 12000) < 1e-12, `tons identity m=${evaporation_rate_lb_hr}`);
  }
  assert.ok("error" in computeEvaporativeCooling({ evaporation_rate_lb_hr: 0 }));
  assert.ok("error" in computeEvaporativeCooling({ evaporation_rate_lb_hr: -5 }));
});

test("bounds: calc-hvac computeAffinityLaws obeys Q ~ N, SP ~ N^2, kW ~ N^3 exactly across the RPM-target sweep", () => {
  const base = { baseline_RPM: 1750, baseline_CFM: 5000, baseline_SP_in_wc: 1.0, baseline_kW: 5.0 };
  for (const target_value of [875, 1400, 1750, 2100, 3500]) {
    const r = computeAffinityLaws({ ...base, target_kind: "RPM", target_value });
    assert.ok(!r.error, `RPM=${target_value}: ${JSON.stringify(r)}`);
    const ratio = target_value / base.baseline_RPM;
    assert.ok(Math.abs(r.ratio - ratio) < 1e-12, `ratio`);
    assert.ok(Math.abs(r.RPM - base.baseline_RPM * ratio) < 1e-9, `RPM ~ ratio`);
    assert.ok(Math.abs(r.CFM - base.baseline_CFM * ratio) < 1e-9, `CFM ~ ratio`);
    assert.ok(Math.abs(r.SP_in_wc - base.baseline_SP_in_wc * ratio * ratio) < 1e-9, `SP ~ ratio^2`);
    assert.ok(Math.abs(r.kW - base.baseline_kW * ratio * ratio * ratio) < 1e-9, `kW ~ ratio^3`);
  }
  // SP-target inverts to ratio = sqrt(SP_target / SP_base); kW-target to ratio = cbrt.
  const spr = computeAffinityLaws({ ...base, target_kind: "SP", target_value: 4.0 });
  assert.ok(Math.abs(spr.ratio - Math.sqrt(4.0 / 1.0)) < 1e-12, `SP inverse ratio`);
  const kwr = computeAffinityLaws({ ...base, target_kind: "kW", target_value: 40.0 });
  assert.ok(Math.abs(kwr.ratio - Math.cbrt(40.0 / 5.0)) < 1e-12, `kW inverse ratio`);
});

test("bounds: calc-hvac computeAffinityLaws rejects non-positive baselines / targets and unknown target kind (documented)", () => {
  assert.ok("error" in computeAffinityLaws({ baseline_RPM: 0, target_kind: "RPM", target_value: 1500 }));
  assert.ok("error" in computeAffinityLaws({ baseline_RPM: 1750, target_kind: "RPM", target_value: 0 }));
  assert.ok("error" in computeAffinityLaws({ baseline_RPM: 1750, target_kind: "CFM", target_value: 4000, baseline_CFM: 0 }));
  assert.ok("error" in computeAffinityLaws({ baseline_RPM: 1750, target_kind: "SP", target_value: 4, baseline_SP_in_wc: 0 }));
  assert.ok("error" in computeAffinityLaws({ baseline_RPM: 1750, target_kind: "kW", target_value: 40, baseline_kW: 0 }));
  assert.ok("error" in computeAffinityLaws({ baseline_RPM: 1750, target_kind: "not-a-kind", target_value: 1 }));
});

test("bounds: calc-hvac computeOutdoorAirMix pins the mass-balance temperature mix at every OA fraction", () => {
  for (const return_T_F of [70, 75, 80]) {
    for (const outdoor_T_F of [40, 75, 95, 110]) {
      for (const oa_fraction of [0, 0.1, 0.25, 0.5, 1.0]) {
        const r = computeOutdoorAirMix({
          return_T_F, return_RH_percent: 50, outdoor_T_F, outdoor_RH_percent: 50, oa_fraction,
        });
        const expected = oa_fraction * outdoor_T_F + (1 - oa_fraction) * return_T_F;
        assert.ok(
          Math.abs(r.mixed_T_F - expected) < 1e-9,
          `mix RA=${return_T_F} OA=${outdoor_T_F} f=${oa_fraction}: got ${r.mixed_T_F}, expected ${expected}`,
        );
        assertFinite(r.mixed_W_kg_kg, `mixed_W`);
        assert.ok(r.mixed_GPP >= 0, `GPP non-negative`);
      }
    }
  }
});

test("bounds: calc-hvac computeOutdoorAirMix clamps OA fraction to [0, 1] (documented)", () => {
  const below = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 50, oa_fraction: -0.5 });
  assert.strictEqual(below.oa_fraction, 0);
  // Below clamp -> 100% return air -> mixed_T_F == return_T_F.
  assert.ok(Math.abs(below.mixed_T_F - 75) < 1e-12);
  const above = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 50, oa_fraction: 2 });
  assert.strictEqual(above.oa_fraction, 1);
  // Above clamp -> 100% outdoor air -> mixed_T_F == outdoor_T_F.
  assert.ok(Math.abs(above.mixed_T_F - 95) < 1e-12);
});

// --------------------------------------------------------------------
// calc-water expansion (spec-v14 §8.4 Phase D follow-up). Eight new
// compute functions move calc-water.js coverage from 0 / 9 (0%) ->
// 8 / 9 (89%). Same warn-on-missing scaffolding; per-function pin
// pattern: documented sweep + boundary rejections + closed-form
// identity pins where applicable (pounds-formula MGD * mg/L * 8.34,
// filter loading = flow / area, detention time = volume / flow,
// C1V1 = C2V2, water horsepower = (gpm * tdh) / 3960, coagulant
// pounds-formula adjusted for product strength, SVI = SV30 * 1000 /
// MLSS, disinfection CT = chlorine * t10).
// --------------------------------------------------------------------

import {
  computePoundsFormula,
  computeFilterLoading,
  computeDetentionTime,
  computeDilution as computeWaterDilution,
  computePumpEfficiency,
  computeCoagulantDose,
  computeSVI,
  computeDisinfectionCT,
} from "../../calc-water.js";

test("bounds: calc-water computePoundsFormula pins the lb/day = MGD * mg/L * 8.34 identity across the chemical sweep", () => {
  const chemicals = [
    { key: "chlorine_gas", pct: 100 },
    { key: "sodium_hypochlorite", pct: 12.5 },
    { key: "calcium_hypochlorite", pct: 65 },
    { key: "alum_liquid", pct: 48.5 },
  ];
  for (const { key, pct } of chemicals) {
    for (const flow_mgd of [0.5, 5, 20, 100]) {
      for (const dose_mg_l of [0.5, 2.5, 10, 50]) {
        const r = computePoundsFormula({ flow_mgd, dose_mg_l, chemical: key });
        assert.ok(!r.error, `${key} flow=${flow_mgd} dose=${dose_mg_l}: ${JSON.stringify(r)}`);
        const expected_pure = flow_mgd * dose_mg_l * 8.34;
        assert.ok(
          Math.abs(r.pure_lb_day - expected_pure) < 1e-9,
          `pure lb/day identity ${key}: ${r.pure_lb_day} vs ${expected_pure}`,
        );
        const expected_product = expected_pure / (pct / 100);
        assert.ok(
          Math.abs(r.product_lb_day - expected_product) < 1e-9,
          `product lb/day identity ${key}`,
        );
        assert.strictEqual(r.purity_pct, pct, `purity_pct`);
      }
    }
  }
});

test("bounds: calc-water computePoundsFormula rejects unknown chemical / negative flow / negative dose (documented)", () => {
  assert.ok("error" in computePoundsFormula({ flow_mgd: 5, dose_mg_l: 2.5, chemical: "not-a-chem" }));
  assert.ok("error" in computePoundsFormula({ flow_mgd: -1, dose_mg_l: 2.5, chemical: "chlorine_gas" }));
  assert.ok("error" in computePoundsFormula({ flow_mgd: 5, dose_mg_l: -1, chemical: "chlorine_gas" }));
});

test("bounds: calc-water computeFilterLoading pins loading = flow / area and the rapid-sand / high-rate band thresholds", () => {
  for (const filter_area_ft2 of [50, 100, 200, 500]) {
    for (const flow_gpm of [50, 250, 800, 3000]) {
      for (const backwash_rate_gpm_ft2 of [12, 15, 20]) {
        const r = computeFilterLoading({ filter_area_ft2, flow_gpm, backwash_rate_gpm_ft2 });
        assert.ok(!r.error, `A=${filter_area_ft2} Q=${flow_gpm}: ${JSON.stringify(r)}`);
        const expected_loading = flow_gpm / filter_area_ft2;
        assert.ok(
          Math.abs(r.loading_gpm_per_ft2 - expected_loading) < 1e-12,
          `loading identity A=${filter_area_ft2} Q=${flow_gpm}`,
        );
        assert.ok(
          Math.abs(r.backwash_gpm - backwash_rate_gpm_ft2 * filter_area_ft2) < 1e-9,
          `backwash identity`,
        );
        assert.ok(typeof r.category === "string" && r.category.length > 0, `category empty`);
      }
    }
  }
  // Specific band pins.
  assert.ok(/rapid sand/.test(computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 800 }).category));
  assert.ok(/high-rate/.test(computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 1400 }).category));
  assert.ok(/below typical/.test(computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 100 }).category));
});

test("bounds: calc-water computeFilterLoading rejects non-positive area / flow / backwash rate (documented)", () => {
  assert.ok("error" in computeFilterLoading({ filter_area_ft2: 0, flow_gpm: 800 }));
  assert.ok("error" in computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 0 }));
  assert.ok("error" in computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 800, backwash_rate_gpm_ft2: 0 }));
});

test("bounds: calc-water computeDetentionTime pins minutes = volume / flow and the hours / days unit chain", () => {
  for (const tank_volume_gal of [1000, 10000, 50000, 500000]) {
    for (const flow_gpm of [10, 100, 500, 2000]) {
      const r = computeDetentionTime({ tank_volume_gal, flow_gpm });
      assert.ok(!r.error, `V=${tank_volume_gal} Q=${flow_gpm}: ${JSON.stringify(r)}`);
      assert.ok(
        Math.abs(r.minutes - tank_volume_gal / flow_gpm) < 1e-9,
        `minutes identity V=${tank_volume_gal} Q=${flow_gpm}`,
      );
      assert.ok(Math.abs(r.hours - r.minutes / 60) < 1e-12, `hours == minutes/60`);
      assert.ok(Math.abs(r.days - r.hours / 24) < 1e-12, `days == hours/24`);
    }
  }
  // pass_target flag: true when minutes >= target, null when no target.
  const pass = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 350, target_minutes: 120 });
  assert.strictEqual(pass.pass_target, true);
  const fail = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 350, target_minutes: 1000 });
  assert.strictEqual(fail.pass_target, false);
  const none = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 350 });
  assert.strictEqual(none.pass_target, null);
});

test("bounds: calc-water computeDetentionTime rejects negative volume or non-positive flow (documented)", () => {
  assert.ok("error" in computeDetentionTime({ tank_volume_gal: -1, flow_gpm: 100 }));
  assert.ok("error" in computeDetentionTime({ tank_volume_gal: 1000, flow_gpm: 0 }));
});

test("bounds: calc-water computeDilution single mode solves C1V1 = C2V2 for every missing variable", () => {
  // Known: C1=1000, V1=10, V2=100 -> solve C2 = (1000*10)/100 = 100.
  const c2 = computeWaterDilution({ c1: 1000, v1: 10, c2: 0, v2: 100, mode: "single" });
  assert.ok(Math.abs(c2.c2 - 100) < 1e-9, `solved C2`);
  // Known: C1=1000, V1=10, C2=100 -> solve V2 = (1000*10)/100 = 100.
  const v2 = computeWaterDilution({ c1: 1000, v1: 10, c2: 100, v2: 0, mode: "single" });
  assert.ok(Math.abs(v2.v2 - 100) < 1e-9, `solved V2`);
  // diluent identity: V2 - V1.
  assert.ok(Math.abs(c2.diluent - 90) < 1e-9, `diluent`);
});

test("bounds: calc-water computeDilution serial mode pins per-step divisor across the dilution chain", () => {
  const r = computeWaterDilution({ c1: 1000, mode: "serial", steps: 4, dilution_factor: 10 });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.series.length, 4);
  // Each step divides by the factor: 100, 10, 1, 0.1.
  const expected = [100, 10, 1, 0.1];
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(r.series[i].concentration - expected[i]) < 1e-12, `step ${i + 1}`);
  }
  assert.ok(Math.abs(r.final_concentration - 0.1) < 1e-12, `final`);
});

test("bounds: calc-water computeDilution rejects under-specified single, non-positive stock / steps / factor, and unknown mode (documented)", () => {
  assert.ok("error" in computeWaterDilution({ c1: 1000, v1: 10, c2: 0, v2: 0, mode: "single" }));
  assert.ok("error" in computeWaterDilution({ c1: 0, mode: "serial", steps: 3, dilution_factor: 10 }));
  assert.ok("error" in computeWaterDilution({ c1: 1000, mode: "serial", steps: 0, dilution_factor: 10 }));
  assert.ok("error" in computeWaterDilution({ c1: 1000, mode: "serial", steps: 3, dilution_factor: 1 }));
  assert.ok("error" in computeWaterDilution({ c1: 1000, mode: "not-a-mode" }));
});

test("bounds: calc-water computePumpEfficiency pins whp = (gpm * tdh) / 3960 and the wire-to-water band thresholds", () => {
  for (const flow_gpm of [100, 500, 1500, 5000]) {
    for (const tdh_ft of [25, 50, 100, 200]) {
      for (const motor_kW of [5, 25, 60, 200]) {
        const r = computePumpEfficiency({ flow_gpm, tdh_ft, motor_kW });
        assert.ok(!r.error, `Q=${flow_gpm} H=${tdh_ft} kW=${motor_kW}: ${JSON.stringify(r)}`);
        assert.ok(
          Math.abs(r.whp - (flow_gpm * tdh_ft) / 3960) < 1e-9,
          `whp identity Q=${flow_gpm} H=${tdh_ft}`,
        );
        assert.ok(["good", "ok", "degraded"].includes(r.category), `category=${r.category}`);
      }
    }
  }
});

test("bounds: calc-water computePumpEfficiency rejects negative flow / TDH and out-of-band efficiencies (documented)", () => {
  assert.ok("error" in computePumpEfficiency({ flow_gpm: -1, tdh_ft: 100, motor_kW: 60 }));
  assert.ok("error" in computePumpEfficiency({ flow_gpm: 1500, tdh_ft: -1, motor_kW: 60 }));
  assert.ok("error" in computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 0 }));
  assert.ok("error" in computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 60, motor_eff: 0 }));
  assert.ok("error" in computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 60, motor_eff: 1.1 }));
  assert.ok("error" in computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 60, drive_eff: 1.5 }));
});

test("bounds: calc-water computeCoagulantDose pins the pounds-formula and product-strength adjustment across the alum sweep", () => {
  for (const flow_mgd of [1, 5, 20]) {
    for (const jar_test_dose_mg_l of [5, 20, 50]) {
      const r = computeCoagulantDose({ flow_mgd, jar_test_dose_mg_l, product: "alum_liquid" });
      assert.ok(!r.error, `MGD=${flow_mgd} dose=${jar_test_dose_mg_l}: ${JSON.stringify(r)}`);
      const expected_pure = flow_mgd * jar_test_dose_mg_l * 8.34;
      assert.ok(Math.abs(r.pure_lb_day - expected_pure) < 1e-9, `pure lb/day`);
      // product_lb_day = pure / (strength_pct / 100); for alum_liquid strength is 48.5%.
      const expected_product = expected_pure / (48.5 / 100);
      assert.ok(Math.abs(r.product_lb_day - expected_product) < 1e-9, `product lb/day`);
      assertFinitePositive(r.product_gal_day, `product_gal_day`);
    }
  }
});

test("bounds: calc-water computeCoagulantDose rejects non-positive flow / dose and unknown product (documented)", () => {
  assert.ok("error" in computeCoagulantDose({ flow_mgd: 0, jar_test_dose_mg_l: 20, product: "alum_liquid" }));
  assert.ok("error" in computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 0, product: "alum_liquid" }));
  assert.ok("error" in computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "not-a-product" }));
});

test("bounds: calc-water computeSVI pins SVI = SV30 * 1000 / MLSS across the operational sweep", () => {
  for (const sv30_ml_per_l of [100, 200, 400, 800]) {
    for (const mlss_mg_per_l of [1000, 2500, 4000]) {
      const r = computeSVI({ sv30_ml_per_l, mlss_mg_per_l });
      assert.ok(!r.error, `SV30=${sv30_ml_per_l} MLSS=${mlss_mg_per_l}: ${JSON.stringify(r)}`);
      const expected = (sv30_ml_per_l * 1000) / mlss_mg_per_l;
      assert.ok(
        Math.abs(r.svi_ml_per_g - expected) < 1e-9,
        `SVI identity SV30=${sv30_ml_per_l} MLSS=${mlss_mg_per_l}: ${r.svi_ml_per_g} vs ${expected}`,
      );
    }
  }
});

test("bounds: calc-water computeSVI rejects out-of-domain SV30 and non-positive MLSS (documented)", () => {
  assert.ok("error" in computeSVI({ sv30_ml_per_l: -1, mlss_mg_per_l: 2000 }));
  assert.ok("error" in computeSVI({ sv30_ml_per_l: 200, mlss_mg_per_l: 0 }));
  assert.ok("error" in computeSVI({ sv30_ml_per_l: 1500, mlss_mg_per_l: 2000 }));
});

test("bounds: calc-water computeDisinfectionCT pins CT_achieved = chlorine * t10 and the SWTR 3-log Giardia pass / fail flip", () => {
  // Spec-v9 §E.2 worked example pins: C=0.4, t10=300, T=5, pH=7 -> CT_achieved=120 vs CT_required~116 -> pass.
  const passing = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 7.0 });
  assert.ok(!passing.error, JSON.stringify(passing));
  assert.ok(Math.abs(passing.CT_achieved - 120) < 1e-9, `CT_achieved identity`);
  assert.strictEqual(passing.pass_3log_giardia, true);
  assert.strictEqual(passing.pass_4log_virus, true);
  // Lower the chlorine to below the 0.2 mg/L floor -> SWTR gives zero credit per the documented edge case.
  const zero_credit = computeDisinfectionCT({ chlorine_mg_l: 0.1, t10_minutes: 300, temperature_C: 5, pH: 7.0 });
  assert.strictEqual(zero_credit.CT_achieved, 0);
  assert.strictEqual(zero_credit.pass_3log_giardia, false);
  // Halve the contact time -> CT drops to 60; fails the ~116 requirement.
  const failing = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 150, temperature_C: 5, pH: 7.0 });
  assert.ok(Math.abs(failing.CT_achieved - 60) < 1e-9, `failing CT identity`);
  assert.strictEqual(failing.pass_3log_giardia, false);
});

test("bounds: calc-water computeDisinfectionCT rejects out-of-table temperature / pH and non-positive contact time (documented)", () => {
  assert.ok("error" in computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 30, pH: 7.0 }));
  assert.ok("error" in computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 0, pH: 7.0 }));
  assert.ok("error" in computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 5.5 }));
  assert.ok("error" in computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 9.5 }));
  assert.ok("error" in computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 0, temperature_C: 5, pH: 7.0 }));
  assert.ok("error" in computeDisinfectionCT({ chlorine_mg_l: -0.1, t10_minutes: 300, temperature_C: 5, pH: 7.0 }));
});

// --------------------------------------------------------------------
// calc-kitchen expansion (spec-v14 §8.4 Phase D follow-up). Six new
// compute functions move calc-kitchen.js coverage from 0 / 6 (0%) ->
// 6 / 6 (100%) - the first full-module closeout in the Phase D
// campaign. Same warn-on-missing scaffolding; per-function pin
// pattern: documented sweep + boundary rejections + closed-form
// identity pins (recipe scale-factor = target / original, yield_pct =
// (after_trim * (1 - loss)) / AP, suggested_price = plate_cost /
// food_cost_pct, FDA Food Code 2-hour / 6-hour cooling pass / fail,
// sous-vide come-up time = 0.4 * (thickness/2 * 0.0254)^2 / alpha).
// --------------------------------------------------------------------

import {
  computeRecipeScale,
  computeYieldEP,
  computeCoolingCurve,
  computePlateCost,
  computePanConversion,
  computeSousVidePasteurization,
} from "../../calc-kitchen.js";

test("bounds: calc-kitchen computeRecipeScale pins factor = target / original and scales every row exactly", () => {
  const rows = [
    { ingredient: "flour_ap", quantity: 2, unit: "cup" },
    { ingredient: "sugar_granulated", quantity: 1, unit: "cup" },
    { ingredient: "butter", quantity: 0.5, unit: "cup" },
  ];
  for (const original_yield of [4, 12, 24]) {
    for (const target_yield of [6, 12, 36, 100]) {
      const r = computeRecipeScale({ rows, original_yield, target_yield });
      assert.ok(!r.error, `o=${original_yield} t=${target_yield}: ${JSON.stringify(r)}`);
      const expected_factor = target_yield / original_yield;
      assert.ok(Math.abs(r.factor - expected_factor) < 1e-12, `factor o=${original_yield} t=${target_yield}`);
      for (let i = 0; i < rows.length; i++) {
        assert.ok(
          Math.abs(r.rows[i].quantity - rows[i].quantity * expected_factor) < 1e-12,
          `row ${i} o=${original_yield} t=${target_yield}`,
        );
      }
    }
  }
});

test("bounds: calc-kitchen computeRecipeScale rejects empty rows / non-positive yields / negative quantity (documented)", () => {
  assert.ok("error" in computeRecipeScale({ rows: [], original_yield: 12, target_yield: 24 }));
  assert.ok("error" in computeRecipeScale({ rows: [{ ingredient: "x", quantity: 1, unit: "cup" }], original_yield: 0, target_yield: 24 }));
  assert.ok("error" in computeRecipeScale({ rows: [{ ingredient: "x", quantity: 1, unit: "cup" }], original_yield: 12, target_yield: 0 }));
  assert.ok("error" in computeRecipeScale({ rows: [{ ingredient: "x", quantity: -1, unit: "cup" }], original_yield: 12, target_yield: 24 }));
});

test("bounds: calc-kitchen computeYieldEP pins yield_pct = ((AP - trim) * (1 - loss)) / AP * 100 and ep_cost = AP_cost / yield_fraction", () => {
  for (const ap_weight of [5, 10, 25]) {
    for (const trim_weight of [0, 1.5, 3]) {
      for (const cooking_loss_pct of [0, 10, 25, 40]) {
        if (trim_weight > ap_weight) continue;
        const r = computeYieldEP({ ap_weight, trim_weight, cooking_loss_pct, ap_cost_per_lb: 10 });
        assert.ok(!r.error, `AP=${ap_weight} trim=${trim_weight} loss=${cooking_loss_pct}: ${JSON.stringify(r)}`);
        const after_trim = ap_weight - trim_weight;
        const expected_ep = after_trim * (1 - cooking_loss_pct / 100);
        assert.ok(Math.abs(r.ep_weight - expected_ep) < 1e-12, `ep_weight`);
        assert.ok(Math.abs(r.after_trim_weight - after_trim) < 1e-12, `after_trim`);
        assert.ok(Math.abs(r.yield_pct - (expected_ep / ap_weight) * 100) < 1e-12, `yield_pct`);
        if (r.yield_pct > 0) {
          assert.ok(Math.abs(r.ep_cost_per_lb - 10 / (r.yield_pct / 100)) < 1e-9, `ep_cost`);
        }
      }
    }
  }
});

test("bounds: calc-kitchen computeYieldEP rejects non-positive AP / negative trim / trim > AP / cooking loss out of [0, 100) (documented)", () => {
  assert.ok("error" in computeYieldEP({ ap_weight: 0, trim_weight: 0, cooking_loss_pct: 10 }));
  assert.ok("error" in computeYieldEP({ ap_weight: 10, trim_weight: -1, cooking_loss_pct: 10 }));
  assert.ok("error" in computeYieldEP({ ap_weight: 10, trim_weight: 11, cooking_loss_pct: 10 }));
  assert.ok("error" in computeYieldEP({ ap_weight: 10, trim_weight: 1, cooking_loss_pct: -1 }));
  assert.ok("error" in computeYieldEP({ ap_weight: 10, trim_weight: 1, cooking_loss_pct: 100 }));
});

test("bounds: calc-kitchen computeCoolingCurve pins FDA Food Code 2h phase-1 / 6h total pass-flag thresholds across container / product sweep", () => {
  const containers = ["full_pan_4in", "half_pan_2in", "ice_bath", "blast_chiller"];
  const products = ["thin_liquid", "thick_liquid", "dense_solid"];
  for (const container of containers) {
    for (const product_type of products) {
      const r = computeCoolingCurve({ start_F: 135, ambient_F: 70, container, product_type });
      assert.ok(!r.error, `${container}/${product_type}: ${JSON.stringify(r)}`);
      assertFinitePositive(r.phase1_minutes, `phase1`);
      assertFinitePositive(r.phase2_minutes, `phase2`);
      // Phase 2 = 1.6 * phase 1 exactly by construction; catches a refactor that swaps the 1.6 ratio.
      assert.ok(Math.abs(r.phase2_minutes - r.phase1_minutes * 1.6) < 1e-9, `phase2 = 1.6 * phase1`);
      // pass flags pinned to the FDA Food Code 2h / 6h thresholds.
      assert.strictEqual(r.phase1_pass, r.phase1_minutes <= 120, `phase1_pass`);
      assert.strictEqual(r.phase2_pass, r.phase2_minutes <= 240, `phase2_pass`);
    }
  }
  // Specific pin: blast chiller / thin liquid is the fastest combo and should pass both gates;
  // full pan / dense solid is the slowest and should fail both.
  const fastest = computeCoolingCurve({ start_F: 135, ambient_F: 70, container: "blast_chiller", product_type: "thin_liquid" });
  assert.ok(fastest.phase1_pass && fastest.phase2_pass, `blast chiller should pass`);
  const slowest = computeCoolingCurve({ start_F: 135, ambient_F: 70, container: "full_pan_4in", product_type: "dense_solid" });
  assert.ok(!slowest.phase1_pass, `full pan dense solid should fail phase 1`);
});

test("bounds: calc-kitchen computeCoolingCurve rejects unknown container / product type and start <= 70 F (documented)", () => {
  assert.ok("error" in computeCoolingCurve({ start_F: 135, container: "not-a-container", product_type: "thin_liquid" }));
  assert.ok("error" in computeCoolingCurve({ start_F: 135, container: "ice_bath", product_type: "not-a-product" }));
  assert.ok("error" in computeCoolingCurve({ start_F: 65, container: "ice_bath", product_type: "thin_liquid" }));
  assert.ok("error" in computeCoolingCurve({ start_F: 70, container: "ice_bath", product_type: "thin_liquid" }));
});

test("bounds: calc-kitchen computePlateCost pins suggested_price = plate_cost / food_cost_pct and contribution_margin = price - cost", () => {
  const ingredients = [
    { name: "ribeye", lbs: 0.5, cost_per_lb: 16 },
    { name: "potato", lbs: 0.4, cost_per_lb: 1.20 },
    { name: "veg",    lbs: 0.25, cost_per_lb: 3 },
  ];
  const expected_plate_cost = 0.5 * 16 + 0.4 * 1.20 + 0.25 * 3;
  for (const target_food_cost_pct of [20, 25, 30, 35, 40]) {
    const r = computePlateCost({ ingredients, target_food_cost_pct });
    assert.ok(!r.error, `pct=${target_food_cost_pct}: ${JSON.stringify(r)}`);
    assert.ok(Math.abs(r.plate_cost - expected_plate_cost) < 1e-9, `plate_cost identity`);
    assert.ok(
      Math.abs(r.suggested_price - expected_plate_cost / (target_food_cost_pct / 100)) < 1e-9,
      `price identity pct=${target_food_cost_pct}`,
    );
    assert.ok(
      Math.abs(r.contribution_margin - (r.suggested_price - r.plate_cost)) < 1e-9,
      `margin identity`,
    );
    assert.ok(["ok", "below typical menu range", "above typical menu range"].includes(r.sanity_flag), `flag=${r.sanity_flag}`);
  }
});

test("bounds: calc-kitchen computePlateCost rejects empty ingredients / out-of-band food cost / negative lbs or cost (documented)", () => {
  assert.ok("error" in computePlateCost({ ingredients: [], target_food_cost_pct: 30 }));
  assert.ok("error" in computePlateCost({ ingredients: [{ lbs: 0.5, cost_per_lb: 10 }], target_food_cost_pct: 0 }));
  assert.ok("error" in computePlateCost({ ingredients: [{ lbs: 0.5, cost_per_lb: 10 }], target_food_cost_pct: 101 }));
  assert.ok("error" in computePlateCost({ ingredients: [{ lbs: -0.1, cost_per_lb: 10 }], target_food_cost_pct: 30 }));
  assert.ok("error" in computePlateCost({ ingredients: [{ lbs: 0.5, cost_per_lb: -1 }], target_food_cost_pct: 30 }));
});

test("bounds: calc-kitchen computePanConversion pins servings * portion / 32 = total_qt and pans = ceil(total / capacity)", () => {
  // Full 4-in pan capacity is 13.5 qt per the bundled table.
  for (const target_servings of [10, 50, 100, 200]) {
    for (const portion_oz of [2, 4, 6, 8]) {
      const r = computePanConversion({ target_servings, portion_oz, pan_size: "full", pan_depth_in: 4 });
      assert.ok(!r.error, `S=${target_servings} oz=${portion_oz}: ${JSON.stringify(r)}`);
      const expected_qt = (target_servings * portion_oz) / 32;
      assert.ok(Math.abs(r.total_qt - expected_qt) < 1e-12, `total_qt identity`);
      assert.strictEqual(r.capacity_qt, 13.5, `capacity`);
      assert.strictEqual(r.pans_needed, Math.ceil(expected_qt / 13.5), `pans`);
      // 4-in cooling warning is set per the documented threshold.
      assert.ok(r.cooling_warning && /pan depth/.test(r.cooling_warning), `cooling warning at 4 in`);
    }
  }
  // Shallow pan: no cooling warning.
  const shallow = computePanConversion({ target_qt: 10, pan_size: "half", pan_depth_in: 2.5 });
  assert.strictEqual(shallow.cooling_warning, null);
});

test("bounds: calc-kitchen computePanConversion rejects unknown pan size / depth and under-specified target (documented)", () => {
  assert.ok("error" in computePanConversion({ target_qt: 10, pan_size: "not-a-pan", pan_depth_in: 4 }));
  assert.ok("error" in computePanConversion({ target_qt: 10, pan_size: "full", pan_depth_in: 99 }));
  assert.ok("error" in computePanConversion({ pan_size: "full", pan_depth_in: 4 }));
});

test("bounds: calc-kitchen computeSousVidePasteurization pins come-up time = 0.4 * (thickness/2 * 0.0254)^2 / alpha across the food-category sweep", () => {
  // Poultry alpha = 1.4e-7 per the spec; for 1.0 in thickness in a 140 F bath the example pins ~7.68 min come-up.
  const alpha_by_category = { poultry: 1.4e-7, beef: 1.4e-7, pork: 1.4e-7, fish: 1.4e-7, egg: 1.4e-7 };
  for (const category of Object.keys(alpha_by_category)) {
    for (const thickness_in of [0.5, 1.0, 2.0, 3.0]) {
      const r = computeSousVidePasteurization({ category, thickness_in, bath_temperature_F: 140, initial_temperature_F: 38 });
      assert.ok(!r.error, `${category} th=${thickness_in}: ${JSON.stringify(r)}`);
      assertFinitePositive(r.come_up_minutes, `come_up`);
      assertFinitePositive(r.hold_minutes, `hold`);
      assert.ok(
        Math.abs(r.total_minutes - (r.come_up_minutes + r.hold_minutes)) < 1e-9,
        `total = come_up + hold`,
      );
      // come-up identity: 0.4 * (thickness/2 * 0.0254)^2 / alpha in seconds, / 60 -> minutes.
      const L_m = (thickness_in * 0.0254) / 2;
      const expected_come_up_min = (0.4 * L_m * L_m) / r.diffusivity_m2_per_s / 60;
      assert.ok(
        Math.abs(r.come_up_minutes - expected_come_up_min) < 1e-9,
        `come_up identity ${category} th=${thickness_in}: ${r.come_up_minutes} vs ${expected_come_up_min}`,
      );
    }
  }
});

test("bounds: calc-kitchen computeSousVidePasteurization rejects unknown category / non-positive thickness / sub-130 F bath / non-cooling initial >= bath (documented)", () => {
  assert.ok("error" in computeSousVidePasteurization({ category: "not-a-food", thickness_in: 1, bath_temperature_F: 140, initial_temperature_F: 38 }));
  assert.ok("error" in computeSousVidePasteurization({ category: "poultry", thickness_in: 0, bath_temperature_F: 140, initial_temperature_F: 38 }));
  assert.ok("error" in computeSousVidePasteurization({ category: "poultry", thickness_in: 1, bath_temperature_F: 90, initial_temperature_F: 38 }));
  assert.ok("error" in computeSousVidePasteurization({ category: "poultry", thickness_in: 1, bath_temperature_F: 140, initial_temperature_F: 145 }));
  // Sub-FDA-min bath (>=100 to pass the type guard but <130 falls through to the hold-time lookup).
  assert.ok("error" in computeSousVidePasteurization({ category: "poultry", thickness_in: 1, bath_temperature_F: 120, initial_temperature_F: 38 }));
});

// --------------------------------------------------------------------
// calc-stage expansion (spec-v14 §8.4 Phase D follow-up). Twelve new
// rows close seven of eight calc-stage compute functions, moving
// calc-stage.js coverage from 0 / 8 (0%) -> 7 / 8 (88%). Same warn-on-
// missing scaffolding; per-function pin pattern: documented sweep +
// boundary rejections + closed-form identity pins (speed-of-sound
// c = 331.3 + 0.606 * T, inverse-square law -6 dB per doubling,
// per-leg sling tension at the included-angle sin(theta/2), neutral-
// imbalance balanced-zero identity, DMX overflow at end > 512).
// --------------------------------------------------------------------

import {
  computeTrussCapacity,
  computeTimeAlignment,
  computeDMX,
  computeNeutralImbalance,
  computeSPL,
  computeRiggingCheck,
  computeSPLAtmospheric,
} from "../../calc-stage.js";

test("bounds: calc-stage computeTimeAlignment pins ms = (d_main - d_delay) / (331.3 + 0.606 * T_C) * 1000 across the venue sweep", () => {
  for (const d_main_ft of [20, 80, 150, 300]) {
    for (const d_delay_ft of [0, 10, 50, 100]) {
      for (const ambient_C of [-10, 0, 20, 35]) {
        const r = computeTimeAlignment({ d_main_ft, d_delay_ft, ambient_C, haas_offset_ms: 15 });
        assert.ok(!r.error, `dm=${d_main_ft} dd=${d_delay_ft} T=${ambient_C}: ${JSON.stringify(r)}`);
        const expected_c = 331.3 + 0.606 * ambient_C;
        assert.ok(Math.abs(r.c_m_s - expected_c) < 1e-12, `c identity T=${ambient_C}`);
        const expected_ms = ((d_main_ft - d_delay_ft) * 0.3048 / expected_c) * 1000;
        assert.ok(Math.abs(r.ms_difference - expected_ms) < 1e-9, `ms identity`);
        // Haas offset added verbatim.
        assert.ok(Math.abs(r.recommended_delay_ms - (expected_ms + 15)) < 1e-9, `Haas`);
      }
    }
  }
});

test("bounds: calc-stage computeTimeAlignment rejects negative distances (documented)", () => {
  assert.ok("error" in computeTimeAlignment({ d_main_ft: -1, d_delay_ft: 0 }));
  assert.ok("error" in computeTimeAlignment({ d_main_ft: 80, d_delay_ft: -1 }));
});

test("bounds: calc-stage computeSPL obeys the inverse-square law (-6 dB per doubling of distance) in free field", () => {
  for (const L1_dB of [80, 95, 110, 125]) {
    for (const d1 of [1, 2, 5]) {
      const r1 = computeSPL({ L1_dB, d1, d2: d1, mode: "free_field" });
      assert.ok(Math.abs(r1.L2_dB - L1_dB) < 1e-12, `L2 == L1 at d2=d1`);
      const r2 = computeSPL({ L1_dB, d1, d2: 2 * d1, mode: "free_field" });
      // Doubling distance subtracts 20*log10(2) ~= 6.0206 dB in free field.
      assert.ok(
        Math.abs(r2.L2_dB - (L1_dB - 20 * Math.log10(2))) < 1e-12,
        `doubling at d1=${d1} L1=${L1_dB}: ${r2.L2_dB}`,
      );
      const r4 = computeSPL({ L1_dB, d1, d2: 4 * d1, mode: "free_field" });
      // Quadrupling subtracts 12.0412 dB (two doublings).
      assert.ok(
        Math.abs(r4.L2_dB - (L1_dB - 20 * Math.log10(4))) < 1e-12,
        `quadrupling at d1=${d1} L1=${L1_dB}`,
      );
    }
  }
  // Mode factor adds verbatim: hemispherical +3, indoors +6.
  const hemi = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "hemispherical" });
  const free = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "free_field" });
  assert.ok(Math.abs(hemi.L2_dB - (free.L2_dB + 3)) < 1e-12, `hemi = free + 3`);
  const indoors = computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "indoors" });
  assert.ok(Math.abs(indoors.L2_dB - (free.L2_dB + 6)) < 1e-12, `indoors = free + 6`);
});

test("bounds: calc-stage computeSPL rejects unknown mode / non-positive distances (documented)", () => {
  assert.ok("error" in computeSPL({ L1_dB: 100, d1: 1, d2: 10, mode: "not-a-mode" }));
  assert.ok("error" in computeSPL({ L1_dB: 100, d1: 0, d2: 10, mode: "free_field" }));
  assert.ok("error" in computeSPL({ L1_dB: 100, d1: 1, d2: 0, mode: "free_field" }));
});

test("bounds: calc-stage computeNeutralImbalance pins the balanced-zero and single-leg identities", () => {
  // Balanced: I_A == I_B == I_C -> I_N == 0 exactly (the sqrt-of-zero case).
  for (const I of [10, 50, 100, 500]) {
    const r = computeNeutralImbalance({ I_A: I, I_B: I, I_C: I });
    assert.ok(Math.abs(r.neutral_A) < 1e-9, `balanced -> I_N == 0 at I=${I}: ${r.neutral_A}`);
    assert.strictEqual(r.imbalance_percent, 0, `balanced -> imbalance == 0`);
    assert.strictEqual(r.harmonic_warning, null);
  }
  // Single-leg case: only I_A loaded -> I_N == I_A by the sqrt identity (other terms zero).
  for (const I of [10, 50, 200]) {
    const r = computeNeutralImbalance({ I_A: I, I_B: 0, I_C: 0 });
    assert.ok(Math.abs(r.neutral_A - I) < 1e-9, `single-leg -> I_N == I_A at I=${I}: ${r.neutral_A}`);
  }
  // Harmonic warning fires when the flag is set.
  const harm = computeNeutralImbalance({ I_A: 50, I_B: 45, I_C: 40, harmonic_loads: true });
  assert.ok(harm.harmonic_warning && /harmonic/i.test(harm.harmonic_warning), `harmonic warning text`);
});

test("bounds: calc-stage computeNeutralImbalance rejects negative currents (documented)", () => {
  assert.ok("error" in computeNeutralImbalance({ I_A: -1, I_B: 10, I_C: 10 }));
  assert.ok("error" in computeNeutralImbalance({ I_A: 10, I_B: -1, I_C: 10 }));
  assert.ok("error" in computeNeutralImbalance({ I_A: 10, I_B: 10, I_C: -1 }));
});

test("bounds: calc-stage computeRiggingCheck pins per-leg tension = load / n in vertical and load / (n * sin(theta/2)) in basket configurations", () => {
  for (const load_lb of [500, 2000, 5000, 10000]) {
    for (const n_legs of [1, 2, 4]) {
      const v = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "vertical", load_lb, n_legs });
      assert.ok(!v.error, `vertical L=${load_lb} n=${n_legs}: ${JSON.stringify(v)}`);
      assert.ok(Math.abs(v.tension_per_leg_lb - load_lb / n_legs) < 1e-9, `vertical identity`);
      assert.strictEqual(v.derate_factor, 1);
    }
    for (const included_angle_deg of [30, 60, 90, 120]) {
      const b = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "basket", load_lb, included_angle_deg, n_legs: 2 });
      const expected = load_lb / (2 * Math.sin((included_angle_deg / 2) * Math.PI / 180));
      assert.ok(Math.abs(b.tension_per_leg_lb - expected) < 1e-9, `basket identity L=${load_lb} a=${included_angle_deg}`);
    }
    // Choker derate: 0.75 reduction on the per-leg-tension denominator AND on effective_wll.
    const ch = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "choker", load_lb, included_angle_deg: 60, n_legs: 2 });
    assert.strictEqual(ch.derate_factor, 0.75);
    assert.ok(Math.abs(ch.effective_wll_lb - 6700 * 0.75) < 1e-9, `effective_wll derate`);
  }
});

test("bounds: calc-stage computeRiggingCheck rejects unknown hardware / configuration / out-of-domain angle (documented)", () => {
  assert.ok("error" in computeRiggingCheck({ hardware: "not-a-rig", load_lb: 1000 }));
  assert.ok("error" in computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "not-a-config", load_lb: 1000 }));
  assert.ok("error" in computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "basket", load_lb: 1000, included_angle_deg: 0 }));
  assert.ok("error" in computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "basket", load_lb: 1000, included_angle_deg: 180 }));
  assert.ok("error" in computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "vertical", load_lb: -1 }));
});

test("bounds: calc-stage computeDMX pins end = start + channels - 1, overflow flag at end > 512, and conflict detection", () => {
  const r = computeDMX({ fixtures: [
    { name: "wash", start: 1, channels: 12, universe: 1 },
    { name: "movers", start: 100, channels: 16, universe: 1 },
  ]});
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.ranges[0].end, 12, `1 + 12 - 1`);
  assert.strictEqual(r.ranges[1].end, 115, `100 + 16 - 1`);
  assert.strictEqual(r.ranges[0].overflow, false);
  assert.strictEqual(r.conflicts.length, 0);
  assert.strictEqual(r.split_recommended, false);
  // Overflow at end > 512.
  const over = computeDMX({ fixtures: [{ name: "big", start: 500, channels: 20, universe: 1 }] });
  assert.strictEqual(over.ranges[0].raw_end, 519);
  assert.strictEqual(over.ranges[0].end, 512, `clamped at 512`);
  assert.strictEqual(over.ranges[0].overflow, true);
  assert.strictEqual(over.split_recommended, true);
  // Conflict detection: two ranges that overlap in the same universe.
  const conflict = computeDMX({ fixtures: [
    { name: "a", start: 1, channels: 20, universe: 1 },
    { name: "b", start: 10, channels: 5, universe: 1 },
  ]});
  assert.ok(conflict.conflicts.length >= 1, `conflict detected`);
});

test("bounds: calc-stage computeDMX rejects empty fixtures / out-of-range start / non-positive channels (documented)", () => {
  assert.ok("error" in computeDMX({ fixtures: [] }));
  assert.ok("error" in computeDMX({ fixtures: [{ start: 0, channels: 1, universe: 1 }] }));
  assert.ok("error" in computeDMX({ fixtures: [{ start: 513, channels: 1, universe: 1 }] }));
  assert.ok("error" in computeDMX({ fixtures: [{ start: 1, channels: 0, universe: 1 }] }));
});

test("bounds: calc-stage computeTrussCapacity pins reaction-split identity (Ra + Rb == w) and pass-flag thresholds", () => {
  // Center-point load: reactions split evenly.
  const center = computeTrussCapacity({
    truss_model: "16in_box", span_ft: 30,
    point_loads: [{ weight_lb: 500, position_ft: 15 }],
  });
  assert.ok(!center.error, JSON.stringify(center));
  assert.ok(Math.abs(center.reaction_a_lb - 250) < 1e-9, `center Ra`);
  assert.ok(Math.abs(center.reaction_b_lb - 250) < 1e-9, `center Rb`);
  // Quarter-point load: Rb = w*x/L = 500 * 7.5 / 30 = 125; Ra = 500 - 125 = 375.
  const quarter = computeTrussCapacity({
    truss_model: "16in_box", span_ft: 30,
    point_loads: [{ weight_lb: 500, position_ft: 7.5 }],
  });
  assert.ok(Math.abs(quarter.reaction_b_lb - 125) < 1e-9, `Rb identity`);
  assert.ok(Math.abs(quarter.reaction_a_lb - 375) < 1e-9, `Ra identity`);
  // Reaction sum always equals total point-load (by the simple-beam equilibrium).
  const multi = computeTrussCapacity({
    truss_model: "16in_box", span_ft: 30,
    point_loads: [{ weight_lb: 250, position_ft: 10 }, { weight_lb: 250, position_ft: 20 }],
  });
  assert.ok(
    Math.abs((multi.reaction_a_lb + multi.reaction_b_lb) - multi.total_point_load_lb) < 1e-9,
    `Ra + Rb == total`,
  );
});

test("bounds: calc-stage computeTrussCapacity rejects unknown model / non-positive span / negative weight / out-of-span position (documented)", () => {
  assert.ok("error" in computeTrussCapacity({ truss_model: "not-a-truss", span_ft: 30 }));
  assert.ok("error" in computeTrussCapacity({ truss_model: "16in_box", span_ft: 0 }));
  assert.ok("error" in computeTrussCapacity({ truss_model: "16in_box", span_ft: 30, point_loads: [{ weight_lb: -1, position_ft: 15 }] }));
  assert.ok("error" in computeTrussCapacity({ truss_model: "16in_box", span_ft: 30, point_loads: [{ weight_lb: 250, position_ft: -1 }] }));
  assert.ok("error" in computeTrussCapacity({ truss_model: "16in_box", span_ft: 30, point_loads: [{ weight_lb: 250, position_ft: 31 }] }));
});

// --------------------------------------------------------------------
// calc-legal full-module closeout (spec-v14 §8.4 Phase D follow-up).
// Sixteen new rows close all nine calc-legal compute functions, moving
// calc-legal.js coverage from 0 / 9 (0%) -> 9 / 9 (100%) - the fourth
// full-module closeout in the Phase D campaign (calc-kitchen,
// calc-mechanic, and calc-lab were the first three). Same warn-on-
// missing scaffolding; per-function pin pattern: documented sweep +
// boundary rejections + closed-form identity pins (simple interest
// I = P * r * t / 365, FRCP 6(a)(1) calendar-day deadline with roll-
// forward off weekends and federal holidays, FLSA 29 USC 207 OT at
// 1.5x for hours over 40, tip-credit makeup against the higher of
// state and federal minimum, ABC test all-three-true conjunction,
// IRS 20-factor majority rule).
// --------------------------------------------------------------------

import {
  computeJudgmentInterest,
  computeDeadline,
  computeStatuteOfLimitations,
  computeSmallClaimsReference,
  computeTenantNotice,
  computeWageHour,
  computeContractorVsEmployee,
  computeContractClauseReference,
  computeLeaseTermReference,
} from "../../calc-legal.js";

test("bounds: calc-legal computeJudgmentInterest pins simple-interest I = P * r * (days / 365) at the one-year California judgment example", () => {
  // CA 10% simple over exactly 365 days on a $10,000 principal -> $1,000 interest.
  const r = computeJudgmentInterest({
    principal: 10000, state: "CA",
    judgment_date: "2024-01-01", accrual_date: "2025-01-01",
  });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.rate_pct, 10.0);
  assert.strictEqual(r.accrual, "simple");
  // 366-day window in 2024 (leap year) at 10% / 365 -> 10000 * 0.10 * 366/365 = 1002.74.
  assert.ok(Math.abs(r.accrued_interest - 10000 * 0.10 * 366 / 365) < 1e-6, `simple interest identity`);
  assert.strictEqual(r.principal_remaining, 10000);
  assert.ok(Math.abs(r.total_owed - (10000 + r.accrued_interest)) < 1e-9, `total = principal + interest`);
  // Per-day accrual at end on the still-$10k balance: 10000 * 0.10 / 365.
  assert.ok(Math.abs(r.per_day_accrual_at_end - 10000 * 0.10 / 365) < 1e-9, `per-day identity`);
});

test("bounds: calc-legal computeJudgmentInterest applies the U.S. Rule for partial payments (interest first, then principal)", () => {
  // Mid-period payment that exceeds the accrued interest: remainder reduces principal.
  const r = computeJudgmentInterest({
    principal: 10000, state: "CA",
    judgment_date: "2024-01-01", accrual_date: "2025-01-01",
    partial_payments: [{ date: "2024-07-01", amount: 5000 }],
  });
  assert.ok(!r.error, JSON.stringify(r));
  // After payment, principal should be reduced (< $10k).
  assert.ok(r.principal_remaining < 10000, `payment reduced principal`);
  assert.ok(r.principal_remaining > 5000, `but not by full payment amount (interest absorbed first)`);
});

test("bounds: calc-legal computeJudgmentInterest rejects non-positive principal / unknown state / invalid dates / accrual before judgment (documented)", () => {
  assert.ok("error" in computeJudgmentInterest({ principal: 0, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }));
  assert.ok("error" in computeJudgmentInterest({ principal: 10000, state: "ZZ", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }));
  assert.ok("error" in computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "not-a-date", accrual_date: "2025-01-01" }));
  assert.ok("error" in computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2025-01-01", accrual_date: "2024-01-01" }));
});

test("bounds: calc-legal computeDeadline pins FRCP 6(a)(1) calendar-day count with roll-forward off weekends + federal holidays", () => {
  // 2025-07-01 (Tue) + 30 calendar days -> 2025-07-31 (Thu). No weekend / holiday roll.
  const r = computeDeadline({ trigger_date: "2025-07-01", days: 30, day_type: "calendar", jurisdiction: "FED" });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.deadline, "2025-07-31");
  assert.ok(/6\(a\)\(1\)/.test(r.citation), `FRCP 6(a)(1) citation`);
  // Roll-forward case: pick a trigger so end lands on a Saturday.
  // 2025-07-04 (Fri, July 4 fed holiday) + 1 calendar day = 2025-07-05 (Sat) -> rolls to 2025-07-07 (Mon).
  const roll = computeDeadline({ trigger_date: "2025-07-04", days: 1, day_type: "calendar", jurisdiction: "FED" });
  assert.strictEqual(roll.deadline, "2025-07-07");
  assert.ok(roll.skipped.length >= 1, `at least one skip recorded`);
});

test("bounds: calc-legal computeDeadline counts court days while skipping intermediate weekends + federal holidays (documented)", () => {
  // 5 court days from 2025-07-03 (Thu): skip 7-04 (holiday), 7-05/06 (weekend); count 7-07,08,09,10,11 -> deadline 2025-07-11 (Fri).
  const r = computeDeadline({ trigger_date: "2025-07-03", days: 5, day_type: "court", jurisdiction: "FED" });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.deadline, "2025-07-11");
  assert.ok(/6\(a\)\(2\)/.test(r.citation), `FRCP 6(a)(2)/(3) citation`);
  // Skipped list includes the holiday and weekend.
  assert.ok(r.skipped.some((s) => s.reason === "federal holiday"));
  assert.ok(r.skipped.some((s) => s.reason === "weekend"));
});

test("bounds: calc-legal computeDeadline rejects invalid trigger date and non-positive days (documented)", () => {
  assert.ok("error" in computeDeadline({ trigger_date: "not-a-date", days: 30 }));
  assert.ok("error" in computeDeadline({ trigger_date: "2025-07-01", days: 0 }));
  assert.ok("error" in computeDeadline({ trigger_date: "2025-07-01", days: -5 }));
});

test("bounds: calc-legal computeStatuteOfLimitations and computeSmallClaimsReference resolve the bundled state x claim table", () => {
  const sol = computeStatuteOfLimitations({ state: "CA", claim_type: "contract_written" });
  assert.ok(!sol.error, JSON.stringify(sol));
  assert.strictEqual(sol.state, "CA");
  assert.strictEqual(sol.claim_type, "contract_written");
  assertFinitePositive(sol.years, `years`);
  assert.ok(typeof sol.citation === "string" && sol.citation.length > 0, `citation`);
  // Unknown state / claim type rejected.
  assert.ok("error" in computeStatuteOfLimitations({ state: "ZZ", claim_type: "contract_written" }));
  assert.ok("error" in computeStatuteOfLimitations({ state: "CA", claim_type: "not-a-claim" }));
  // Small claims for a bundled state returns a known schema.
  const sc = computeSmallClaimsReference({ state: "CA" });
  assert.ok(!sc.error, JSON.stringify(sc));
  assert.strictEqual(sc.state, "CA");
  assert.ok("error" in computeSmallClaimsReference({ state: "ZZ" }));
});

test("bounds: calc-legal computeTenantNotice returns the bundled state x notice-type row and the self-help warning", () => {
  const r = computeTenantNotice({ state: "CA", notice_type: "nonpayment" });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.state, "CA");
  assert.strictEqual(r.notice_type, "nonpayment");
  assert.ok(/Do not change the locks/.test(r.self_help_warning), `self-help warning text`);
  assert.ok("error" in computeTenantNotice({ state: "ZZ", notice_type: "nonpayment" }));
  assert.ok("error" in computeTenantNotice({ state: "CA", notice_type: "not-a-notice" }));
});

test("bounds: calc-legal computeWageHour pins FLSA OT (1.5x over 40) and the tip-credit makeup against the higher of state and federal minimum", () => {
  // 45 hours at $15/hr (no tips): reg = 40*15 = 600; OT = 5*15*1.5 = 112.50; gross = 712.50.
  const flat = computeWageHour({ hourly_rate: 15, hours_worked: 45, state: "CA" });
  assert.ok(!flat.error, JSON.stringify(flat));
  assert.strictEqual(flat.regular_hours, 40);
  assert.strictEqual(flat.overtime_hours, 5);
  assert.ok(Math.abs(flat.regular_pay - 600) < 1e-9, `reg pay`);
  assert.ok(Math.abs(flat.overtime_pay - 112.50) < 1e-9, `OT pay`);
  assert.strictEqual(flat.tip_makeup, 0);
  assert.ok(Math.abs(flat.gross_pay - 712.50) < 1e-9, `gross`);
  // Applicable minimum = max(state, federal). CA = 16.50; FED = 7.25 -> 16.50.
  assert.strictEqual(flat.applicable_minimum, 16.50);
  // Tip makeup case: federal $7.25 minimum. 40 hrs at $2.13 cash + $200 tips = 85.20 + 200 = 285.20.
  // Required = 40 * 7.25 = 290. Makeup = 290 - 285.20 = 4.80.
  const tipped = computeWageHour({ hourly_rate: 2.13, hours_worked: 40, state: "TX", is_tipped: true, cash_tips: 200 });
  assert.ok(Math.abs(tipped.tip_makeup - (40 * 7.25 - (40 * 2.13 + 200))) < 1e-9, `tip makeup identity`);
  // No-OT case: under 40 hours -> ot_hours = 0.
  const short = computeWageHour({ hourly_rate: 15, hours_worked: 30, state: "FED" });
  assert.strictEqual(short.regular_hours, 30);
  assert.strictEqual(short.overtime_hours, 0);
});

test("bounds: calc-legal computeWageHour rejects negative rate or hours (documented)", () => {
  assert.ok("error" in computeWageHour({ hourly_rate: -1, hours_worked: 40 }));
  assert.ok("error" in computeWageHour({ hourly_rate: 15, hours_worked: -1 }));
});

test("bounds: calc-legal computeContractorVsEmployee ABC test classifies independent contractor only when all three prongs are true", () => {
  // All three true -> independent contractor.
  const yes = computeContractorVsEmployee({ test: "abc", checklist: { A: true, B: true, C: true } });
  assert.strictEqual(yes.result, "independent_contractor");
  // Any single false -> employee.
  for (const fail_key of ["A", "B", "C"]) {
    const checklist = { A: true, B: true, C: true, [fail_key]: false };
    const fail = computeContractorVsEmployee({ test: "abc", checklist });
    assert.strictEqual(fail.result, "employee", `${fail_key}=false should be employee`);
  }
  // CA citation refers to Dynamex / AB 5.
  const ca = computeContractorVsEmployee({ test: "abc", checklist: { A: true, B: true, C: true }, state: "CA" });
  assert.ok(/Dynamex|AB 5/.test(ca.citation), `CA citation`);
});

test("bounds: calc-legal computeContractorVsEmployee IRS 20-factor classifies by employer-control vs worker-independence majority", () => {
  // More employer than worker -> employee.
  const emp = computeContractorVsEmployee({
    test: "irs",
    checklist: { instructions: "employer", training: "employer", set_hours: "employer", full_time: "employer", payment_method: "worker" },
  });
  assert.strictEqual(emp.employer_control_count, 4);
  assert.strictEqual(emp.independent_count, 1);
  assert.strictEqual(emp.total_answered, 5);
  assert.strictEqual(emp.result, "employee");
  // More worker than employer -> independent contractor.
  const ic = computeContractorVsEmployee({
    test: "irs",
    checklist: { instructions: "worker", training: "worker", investment: "worker", profit_or_loss: "worker", set_hours: "employer" },
  });
  assert.strictEqual(ic.result, "independent_contractor");
  // No factors answered -> default to independent contractor per the documented "more or equal" branch and the "No factors" reasoning text.
  const none = computeContractorVsEmployee({ test: "irs", checklist: {} });
  assert.strictEqual(none.total_answered, 0);
  assert.ok(/No factors/.test(none.reasoning), `no-factors reasoning`);
});

test("bounds: calc-legal computeContractClauseReference and computeLeaseTermReference resolve every bundled clause / term", () => {
  const clauses = ["indemnification", "limitation_of_liability", "assignment", "choice_of_law", "arbitration", "force_majeure", "severability", "integration", "notice"];
  for (const clause of clauses) {
    const r = computeContractClauseReference({ clause });
    assert.ok(!r.error, `${clause}: ${JSON.stringify(r)}`);
    assert.strictEqual(r.clause, clause);
    assert.ok(typeof r.what === "string" && r.what.length > 0, `${clause} what`);
    assert.ok(typeof r.look_for === "string" && r.look_for.length > 0, `${clause} look_for`);
  }
  assert.ok("error" in computeContractClauseReference({ clause: "not-a-clause" }));
  const terms = ["rent", "security_deposit", "cam", "holdover", "subletting", "repair_and_deduct", "prevailing_party_fees", "jury_trial_waiver"];
  for (const term of terms) {
    const r = computeLeaseTermReference({ term });
    assert.ok(!r.error, `${term}: ${JSON.stringify(r)}`);
    assert.strictEqual(r.term, term);
    assert.ok(typeof r.what === "string" && r.what.length > 0);
  }
  assert.ok("error" in computeLeaseTermReference({ term: "not-a-term" }));
});

// --------------------------------------------------------------------
// calc-lab full-module closeout (spec-v14 §8.4 Phase D follow-up).
// Eighteen new rows close all ten calc-lab compute functions, moving
// calc-lab.js coverage from 1 / 10 (10%) -> 10 / 10 (100%) - the
// third full-module closeout in the Phase D campaign (calc-kitchen
// and calc-mechanic were the first two). Same warn-on-missing
// scaffolding; per-function pin pattern: documented sweep + boundary
// rejections + closed-form identity pins (C1V1 = C2V2, RCF =
// 1.118e-5 * r_cm * RPM^2 with the inverse RPM solve, Beer-Lambert
// c = A / (epsilon * L), Henderson-Hasselbalch pH = pKa + log10(B/A),
// hemocytometer cells/mL = (cells / square) * 1e4 * dilution).
// --------------------------------------------------------------------

import {
  computeDilution as computeLabDilution,
  computeSerialDilution as computeLabSerialDilution,
  computeMolecularWeight,
  computeMassMoles,
  computeRcf,
  computeResuspension,
  computePcrMix,
  computeBeerLambert,
  computeHendersonHasselbalch,
  computeHemocytometer,
} from "../../calc-lab.js";

test("bounds: calc-lab computeDilution solves C1V1 = C2V2 for each missing variable across the lab-bench sweep", () => {
  // Solve V1: known C1=1.0 M, C2=0.1 M, V2=0.010 L -> V1 = (C2*V2)/C1 = 0.001 L.
  const v1 = computeLabDilution({ c1: 1.0, v1: 0, c2: 0.1, v2: 0.010 });
  assert.ok(Math.abs(v1.v1 - 0.001) < 1e-12, `solve v1: ${v1.v1}`);
  assert.ok(Math.abs(v1.diluent_volume - (0.010 - 0.001)) < 1e-12, `diluent`);
  // Solve C2: known C1=2 M, V1=0.005, V2=0.050 -> C2 = (2*0.005)/0.050 = 0.2 M.
  const c2 = computeLabDilution({ c1: 2.0, v1: 0.005, c2: 0, v2: 0.050 });
  assert.ok(Math.abs(c2.c2 - 0.2) < 1e-12, `solve c2`);
  // Solve V2: known C1=5, V1=0.001, C2=0.5 -> V2 = (5*0.001)/0.5 = 0.010.
  const v2 = computeLabDilution({ c1: 5.0, v1: 0.001, c2: 0.5, v2: 0 });
  assert.ok(Math.abs(v2.v2 - 0.010) < 1e-12, `solve v2`);
  // Solve C1: known V1=0.002, C2=0.4, V2=0.010 -> C1 = (0.4*0.010)/0.002 = 2.0.
  const c1 = computeLabDilution({ c1: 0, v1: 0.002, c2: 0.4, v2: 0.010 });
  assert.ok(Math.abs(c1.c1 - 2.0) < 1e-12, `solve c1`);
});

test("bounds: calc-lab computeDilution rejects under-specified inputs (documented)", () => {
  assert.ok("error" in computeLabDilution({ c1: 1.0, v1: 0, c2: 0, v2: 0.010 }));
  assert.ok("error" in computeLabDilution({ c1: 0, v1: 0, c2: 0, v2: 0 }));
});

test("bounds: calc-lab computeSerialDilution pins concentration_n = start / factor^n and transfer_volume = volume / factor across the dilution chain", () => {
  for (const dilution_factor of [2, 5, 10, 100]) {
    for (const number_of_steps of [1, 3, 6]) {
      const r = computeLabSerialDilution({
        starting_concentration: 1.0, dilution_factor,
        volume_per_tube: 0.001, number_of_steps,
      });
      assert.ok(!r.error, `f=${dilution_factor} n=${number_of_steps}: ${JSON.stringify(r)}`);
      assert.strictEqual(r.tubes.length, number_of_steps);
      // Per-step identity: concentration_i = start / factor^(i+1).
      for (let i = 0; i < number_of_steps; i++) {
        const expected = 1.0 / Math.pow(dilution_factor, i + 1);
        assert.ok(
          Math.abs(r.tubes[i].concentration - expected) < 1e-12,
          `step ${i + 1} f=${dilution_factor}`,
        );
      }
      // Transfer / diluent identity.
      assert.ok(Math.abs(r.transfer_volume - 0.001 / dilution_factor) < 1e-12, `transfer`);
      assert.ok(Math.abs(r.diluent_volume - (0.001 - 0.001 / dilution_factor)) < 1e-12, `diluent`);
    }
  }
});

test("bounds: calc-lab computeSerialDilution rejects non-positive start / factor <= 1 / non-positive volume / steps < 1 (documented)", () => {
  assert.ok("error" in computeLabSerialDilution({ starting_concentration: 0, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 3 }));
  assert.ok("error" in computeLabSerialDilution({ starting_concentration: 1, dilution_factor: 1, volume_per_tube: 0.001, number_of_steps: 3 }));
  assert.ok("error" in computeLabSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0, number_of_steps: 3 }));
  assert.ok("error" in computeLabSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 0 }));
});

test("bounds: calc-lab computeMolecularWeight pins the (NH4)2SO4 worked-example MW and parses common biochemistry formulas", () => {
  // Spec example: (NH4)2SO4 -> 132.14 g/mol per IUPAC atomic weights.
  const r = computeMolecularWeight({ formula: "(NH4)2SO4" });
  assert.ok(!r.error, JSON.stringify(r));
  assert.ok(Math.abs(r.molecular_weight - 132.14) < 0.05, `(NH4)2SO4 MW: ${r.molecular_weight}`);
  // NaCl ~ 58.44.
  const nacl = computeMolecularWeight({ formula: "NaCl" });
  assert.ok(Math.abs(nacl.molecular_weight - 58.44) < 0.05, `NaCl MW`);
  // Glucose C6H12O6 ~ 180.16.
  const glu = computeMolecularWeight({ formula: "C6H12O6" });
  assert.ok(Math.abs(glu.molecular_weight - 180.16) < 0.05, `C6H12O6 MW`);
  // Ferric sulfate Fe2(SO4)3 ~ 399.88.
  const fe = computeMolecularWeight({ formula: "Fe2(SO4)3" });
  assert.ok(Math.abs(fe.molecular_weight - 399.88) < 0.2, `Fe2(SO4)3 MW`);
});

test("bounds: calc-lab computeMolecularWeight rejects empty / non-string / unknown-element / unmatched-paren formulas (documented)", () => {
  assert.ok("error" in computeMolecularWeight({ formula: "" }));
  assert.ok("error" in computeMolecularWeight({ formula: 123 }));
  assert.ok("error" in computeMolecularWeight({ formula: "Zz2" }));
  assert.ok("error" in computeMolecularWeight({ formula: "(NH4" }));
  assert.ok("error" in computeMolecularWeight({ formula: "NH4)" }));
});

test("bounds: calc-lab computeMassMoles pins mass = moles * MW and moles = mass / MW (mutual inverses) across the lab sweep", () => {
  for (const molecular_weight of [18.015, 58.44, 180.16, 342.30]) {
    for (const mass_g of [0.5, 5, 50, 500]) {
      const m = computeMassMoles({ mass_g, molecular_weight });
      assert.ok(!m.error, `m=${mass_g} MW=${molecular_weight}: ${JSON.stringify(m)}`);
      assert.ok(Math.abs(m.moles - mass_g / molecular_weight) < 1e-12, `moles identity`);
      // Inverse direction with the computed moles -> mass.
      const back = computeMassMoles({ moles: m.moles, molecular_weight });
      assert.ok(Math.abs(back.mass_g - mass_g) < 1e-9, `mass round-trip`);
    }
  }
});

test("bounds: calc-lab computeMassMoles rejects non-positive MW or under-/over-specified inputs (documented)", () => {
  assert.ok("error" in computeMassMoles({ mass_g: 5, molecular_weight: 0 }));
  assert.ok("error" in computeMassMoles({ molecular_weight: 58.44 }));
});

test("bounds: calc-lab computeRcf pins RCF = 1.118e-5 * r_cm * RPM^2 and the inverse RPM = sqrt(RCF / (1.118e-5 * r_cm))", () => {
  for (const rotor_radius_mm of [50, 84, 120, 200]) {
    for (const rpm of [3000, 6000, 14000, 25000]) {
      const r = computeRcf({ rotor_radius_mm, rpm });
      assert.ok(!r.error, `r=${rotor_radius_mm} rpm=${rpm}: ${JSON.stringify(r)}`);
      const r_cm = rotor_radius_mm / 10;
      const expected_rcf = 1.118e-5 * r_cm * rpm * rpm;
      assert.ok(Math.abs(r.rcf - expected_rcf) < 1e-6, `RCF identity`);
      // Inverse direction: feed the computed RCF and solve for RPM.
      const back = computeRcf({ rotor_radius_mm, rcf: r.rcf });
      assert.ok(Math.abs(back.rpm - rpm) < 1e-6, `RPM round-trip`);
    }
  }
});

test("bounds: calc-lab computeRcf rejects non-positive radius / under-specified inputs (documented)", () => {
  assert.ok("error" in computeRcf({ rotor_radius_mm: 0, rpm: 14000 }));
  assert.ok("error" in computeRcf({ rotor_radius_mm: 84 }));
});

test("bounds: calc-lab computeResuspension pins volume = mass / target_concentration across the lyophilized sweep", () => {
  for (const mass_g of [0.001, 0.010, 0.100, 1.0]) {
    for (const target_concentration of [0.1, 1.0, 10, 100]) {
      const r = computeResuspension({ mass_g, target_concentration });
      assert.ok(!r.error, `m=${mass_g} c=${target_concentration}: ${JSON.stringify(r)}`);
      assert.ok(Math.abs(r.volume - mass_g / target_concentration) < 1e-12, `identity`);
    }
  }
  assert.ok("error" in computeResuspension({ mass_g: 0, target_concentration: 1 }));
  assert.ok("error" in computeResuspension({ mass_g: 0.001, target_concentration: 0 }));
});

test("bounds: calc-lab computePcrMix pins per-row total = per_reaction * n * (1 + fudge/100) and the master-mix sum identity", () => {
  for (const number_of_reactions of [1, 8, 24, 96]) {
    for (const fudge_factor_pct of [0, 5, 10, 20]) {
      const components = [
        { name: "Master Mix", per_reaction: 12.5 },
        { name: "F primer", per_reaction: 1.0 },
        { name: "R primer", per_reaction: 1.0 },
        { name: "Template", per_reaction: 2.0 },
        { name: "Water", per_reaction: 8.5 },
      ];
      const r = computePcrMix({ number_of_reactions, components, fudge_factor_pct });
      assert.ok(!r.error, `n=${number_of_reactions} fudge=${fudge_factor_pct}: ${JSON.stringify(r)}`);
      const expected_factor = number_of_reactions * (1 + fudge_factor_pct / 100);
      assert.ok(Math.abs(r.scaling_factor - expected_factor) < 1e-12, `scaling factor`);
      for (let i = 0; i < components.length; i++) {
        assert.ok(
          Math.abs(r.rows[i].total - components[i].per_reaction * expected_factor) < 1e-9,
          `row ${i} total identity`,
        );
      }
      const expected_per_reaction = 12.5 + 1.0 + 1.0 + 2.0 + 8.5;
      assert.ok(Math.abs(r.total_per_reaction - expected_per_reaction) < 1e-9, `per-reaction sum`);
      assert.ok(Math.abs(r.total_master_mix - expected_per_reaction * expected_factor) < 1e-9, `master-mix sum`);
    }
  }
});

test("bounds: calc-lab computePcrMix rejects non-positive reactions / empty components / negative fudge (documented)", () => {
  assert.ok("error" in computePcrMix({ number_of_reactions: 0, components: [{ name: "x", per_reaction: 1 }] }));
  assert.ok("error" in computePcrMix({ number_of_reactions: 8, components: [] }));
  assert.ok("error" in computePcrMix({ number_of_reactions: 8, components: [{ name: "x", per_reaction: 1 }], fudge_factor_pct: -1 }));
});

test("bounds: calc-lab computeBeerLambert pins c = A / (epsilon * L) across the absorbance / path / extinction-coefficient sweep", () => {
  for (const absorbance of [0, 0.1, 0.5, 1.5]) {
    for (const path_length_cm of [0.1, 0.5, 1.0, 10.0]) {
      for (const epsilon of [1000, 5000, 50000, 200000]) {
        const r = computeBeerLambert({ absorbance, path_length_cm, epsilon });
        assert.ok(!r.error, `A=${absorbance} L=${path_length_cm} e=${epsilon}: ${JSON.stringify(r)}`);
        assert.ok(
          Math.abs(r.concentration - absorbance / (epsilon * path_length_cm)) < 1e-15,
          `c identity`,
        );
      }
    }
  }
});

test("bounds: calc-lab computeBeerLambert rejects negative A / non-positive path / non-positive epsilon (documented)", () => {
  assert.ok("error" in computeBeerLambert({ absorbance: -0.1, path_length_cm: 1, epsilon: 50000 }));
  assert.ok("error" in computeBeerLambert({ absorbance: 0.5, path_length_cm: 0, epsilon: 50000 }));
  assert.ok("error" in computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 0 }));
});

test("bounds: calc-lab computeHendersonHasselbalch pins ratio = 10^(pH - pKa) and the fraction_base + fraction_acid == 1 invariant", () => {
  for (const pKa of [4.76, 6.35, 7.20, 9.25]) {
    for (const target_pH of [4.0, 6.0, 7.4, 9.0]) {
      const r = computeHendersonHasselbalch({
        pKa, target_pH,
        total_buffer_concentration: 0.1, total_volume: 1.0,
      });
      assert.ok(!r.error, `pKa=${pKa} pH=${target_pH}: ${JSON.stringify(r)}`);
      const expected_ratio = Math.pow(10, target_pH - pKa);
      assert.ok(Math.abs(r.ratio_base_acid - expected_ratio) < 1e-12, `ratio identity`);
      // fraction_base = ratio / (ratio + 1); fraction_acid = 1 - fraction_base.
      assert.ok(Math.abs(r.fraction_base - expected_ratio / (expected_ratio + 1)) < 1e-12, `fraction_base`);
      assert.ok(Math.abs(r.fraction_base + r.fraction_acid - 1) < 1e-12, `fractions sum to 1`);
      // moles_base + moles_acid == total_moles.
      assert.ok(Math.abs(r.moles_base + r.moles_acid - r.total_moles) < 1e-12, `moles conservation`);
      assert.ok(Math.abs(r.total_moles - 0.1) < 1e-12, `total_moles = C * V`);
    }
  }
});

test("bounds: calc-lab computeHendersonHasselbalch rejects non-positive pKa / pH / concentration / volume (documented)", () => {
  assert.ok("error" in computeHendersonHasselbalch({ pKa: 0, target_pH: 7.4, total_buffer_concentration: 0.1, total_volume: 1 }));
  assert.ok("error" in computeHendersonHasselbalch({ pKa: 7.2, target_pH: 0, total_buffer_concentration: 0.1, total_volume: 1 }));
  assert.ok("error" in computeHendersonHasselbalch({ pKa: 7.2, target_pH: 7.4, total_buffer_concentration: 0, total_volume: 1 }));
  assert.ok("error" in computeHendersonHasselbalch({ pKa: 7.2, target_pH: 7.4, total_buffer_concentration: 0.1, total_volume: 0 }));
});

test("bounds: calc-lab computeHemocytometer pins cells/mL = (avg cells per square) * 1e4 * dilution and the viability invariant", () => {
  for (const total_cells_counted of [50, 200, 500, 1000]) {
    for (const squares_counted of [1, 4, 9]) {
      for (const dilution_factor of [1, 2, 10]) {
        const r = computeHemocytometer({ total_cells_counted, squares_counted, dilution_factor });
        assert.ok(!r.error, `cells=${total_cells_counted} sq=${squares_counted} d=${dilution_factor}: ${JSON.stringify(r)}`);
        const avg = total_cells_counted / squares_counted;
        assert.ok(Math.abs(r.avg_per_square - avg) < 1e-12, `avg identity`);
        assert.ok(Math.abs(r.cells_per_mL - avg * 1e4 * dilution_factor) < 1e-9, `cells/mL identity`);
        assert.strictEqual(r.viability_pct, null, `viability null without dead_cells`);
      }
    }
  }
  // Viability: 200 counted with 10 dead -> 190 live -> 95%.
  const via = computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 2, dead_cells: 10 });
  assert.ok(Math.abs(via.viability_pct - 95) < 1e-12, `viability identity`);
});

test("bounds: calc-lab computeHemocytometer rejects negative cell count / non-positive squares / non-positive dilution (documented)", () => {
  assert.ok("error" in computeHemocytometer({ total_cells_counted: -1, squares_counted: 4, dilution_factor: 1 }));
  assert.ok("error" in computeHemocytometer({ total_cells_counted: 200, squares_counted: 0, dilution_factor: 1 }));
  assert.ok("error" in computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 0 }));
});

// --------------------------------------------------------------------
// calc-mechanic expansion (spec-v14 §8.4 Phase D follow-up). Sixteen
// new rows close all nine calc-mechanic compute functions plus the
// parseTireSize parser, moving calc-mechanic.js coverage from 0 / 9
// (0%) -> 10 / 9 (>100% reflects parseTireSize counted alongside the
// nine computes). Same warn-on-missing scaffolding; per-function
// pin pattern: documented sweep + boundary rejections + closed-form
// identity pins (W&B cg = total_moment / total_weight, prop
// theoretical = rpm/gear * pitch/1056, compression ratio
// (V_cyl + V_TDC) / V_TDC, F = stretch*A*E/L Hooke's law, fuel range
// = tank * mpg * load_factor, tire diameter from metric / imperial
// sidewall, brake KE = 0.5*m*v^2 with rotor-temp-rise pin).
// --------------------------------------------------------------------

import {
  computeWeightBalance,
  computePropSlip,
  computeDisplacementCR,
  computeBoltStretch,
  computeDriveshaftCritical,
  computeFuelRange,
  parseTireSize,
  computeTireGearing,
  computeBrakePadLife,
} from "../../calc-mechanic.js";

test("bounds: calc-mechanic computeWeightBalance pins cg = sum(w * arm) / sum(w) and the within_cg / within_gross / pass tri-state", () => {
  // Spec example: empty 1500@36 + pilot 170@38 + pax 170@38 + fuel 240@48 + bag 50@95.
  const stations = [
    { name: "empty",  weight_lb: 1500, arm_in: 36 },
    { name: "pilot",  weight_lb: 170,  arm_in: 38 },
    { name: "pax",    weight_lb: 170,  arm_in: 38 },
    { name: "fuel",   weight_lb: 240,  arm_in: 48 },
    { name: "bag",    weight_lb: 50,   arm_in: 95 },
  ];
  const r = computeWeightBalance({ stations, fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400 });
  assert.ok(!r.error, JSON.stringify(r));
  const expected_w = 1500 + 170 + 170 + 240 + 50;
  const expected_m = 1500 * 36 + 170 * 38 + 170 * 38 + 240 * 48 + 50 * 95;
  assert.strictEqual(r.total_weight_lb, expected_w);
  assert.strictEqual(r.total_moment_lbin, expected_m);
  assert.ok(Math.abs(r.cg_in - expected_m / expected_w) < 1e-12, `cg identity`);
  // Within limits: cg ~ 37.95 between 35 and 47 -> within; total 2130 < 2400 -> within.
  assert.strictEqual(r.within_cg, true);
  assert.strictEqual(r.within_gross, true);
  assert.strictEqual(r.pass, true);
  // %MAC: when mac_le_in and mac_chord_in supplied, pin cg_pct_mac = (cg - LE) / chord * 100.
  const macd = computeWeightBalance({ stations, fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400, mac_le_in: 30, mac_chord_in: 50 });
  assert.ok(Math.abs(macd.cg_pct_mac - ((macd.cg_in - 30) / 50) * 100) < 1e-9, `cg_pct_mac identity`);
});

test("bounds: calc-mechanic computeWeightBalance rejects empty stations / negative station weight / zero total weight (documented)", () => {
  assert.ok("error" in computeWeightBalance({ stations: [] }));
  assert.ok("error" in computeWeightBalance({ stations: [{ weight_lb: -1, arm_in: 30 }] }));
  assert.ok("error" in computeWeightBalance({ stations: [{ weight_lb: 0, arm_in: 30 }] }));
});

test("bounds: calc-mechanic computePropSlip pins theoretical = (rpm/gear) * pitch / 1056 and slip = (theoretical - gps) / theoretical * 100", () => {
  for (const rpm of [3000, 4500, 6000]) {
    for (const gear_ratio of [1.0, 1.5, 1.85, 2.0]) {
      for (const pitch_in of [15, 19, 23]) {
        for (const gps_speed_kt of [10, 25, 40]) {
          const r = computePropSlip({ rpm, gear_ratio, pitch_in, gps_speed_kt });
          assert.ok(!r.error, `rpm=${rpm} gr=${gear_ratio} p=${pitch_in} gps=${gps_speed_kt}: ${JSON.stringify(r)}`);
          const expected_theoretical = (rpm / gear_ratio) * pitch_in / 1056;
          assert.ok(Math.abs(r.theoretical_kt - expected_theoretical) < 1e-9, `theoretical identity`);
          const expected_slip = ((expected_theoretical - gps_speed_kt) / expected_theoretical) * 100;
          assert.ok(Math.abs(r.slip_percent - expected_slip) < 1e-9, `slip identity`);
          assert.ok(typeof r.category === "string" && r.category.length > 0, `category empty`);
        }
      }
    }
  }
});

test("bounds: calc-mechanic computePropSlip rejects non-positive RPM / gear / pitch and negative speed (documented)", () => {
  assert.ok("error" in computePropSlip({ rpm: 0, gear_ratio: 1.85, pitch_in: 19, gps_speed_kt: 35 }));
  assert.ok("error" in computePropSlip({ rpm: 4500, gear_ratio: 0, pitch_in: 19, gps_speed_kt: 35 }));
  assert.ok("error" in computePropSlip({ rpm: 4500, gear_ratio: 1.85, pitch_in: 0, gps_speed_kt: 35 }));
  assert.ok("error" in computePropSlip({ rpm: 4500, gear_ratio: 1.85, pitch_in: 19, gps_speed_kt: -1 }));
});

test("bounds: calc-mechanic computeDisplacementCR pins per-cyl swept volume = pi/4 * bore^2 * stroke and CR = (V_cyl + V_TDC) / V_TDC", () => {
  // Spec example: 4.00 bore x 3.48 stroke x 8 cyl LS-style small block; CR vs 64 cc chamber.
  for (const bore_in of [3.5, 4.0, 4.125]) {
    for (const stroke_in of [3.0, 3.48, 4.0]) {
      for (const cylinders of [4, 6, 8]) {
        for (const chamber_cc of [50, 64, 78]) {
          const r = computeDisplacementCR({
            bore_in, stroke_in, cylinders, chamber_cc,
            gasket_bore_in: 0, gasket_thickness_in: 0,
            deck_clearance_in: 0, dome_dish_cc: 0,
          });
          assert.ok(!r.error, `b=${bore_in} s=${stroke_in} n=${cylinders}: ${JSON.stringify(r)}`);
          const expected_cyl_in3 = Math.PI * 0.25 * bore_in * bore_in * stroke_in;
          assert.ok(
            Math.abs(r.displacement_in3 - expected_cyl_in3 * cylinders) < 1e-9,
            `displacement identity b=${bore_in} s=${stroke_in} n=${cylinders}`,
          );
          // CR identity with no gasket / deck / dome: CR = (cyl_cc + chamber_cc) / chamber_cc.
          const cyl_cc = expected_cyl_in3 * 16.387;
          assert.ok(
            Math.abs(r.compression_ratio - (cyl_cc + chamber_cc) / chamber_cc) < 1e-9,
            `CR identity`,
          );
          // Premium-octane flag flips at CR > 10.5.
          assert.strictEqual(r.requires_premium_octane, r.compression_ratio > 10.5);
        }
      }
    }
  }
});

test("bounds: calc-mechanic computeDisplacementCR rejects non-positive bore/stroke/cylinders and impossible TDC volume (documented)", () => {
  assert.ok("error" in computeDisplacementCR({ bore_in: 0, stroke_in: 3.5, cylinders: 8, chamber_cc: 64 }));
  assert.ok("error" in computeDisplacementCR({ bore_in: 4, stroke_in: 0, cylinders: 8, chamber_cc: 64 }));
  assert.ok("error" in computeDisplacementCR({ bore_in: 4, stroke_in: 3.5, cylinders: 0, chamber_cc: 64 }));
  // Dome > chamber + gasket + deck -> TDC volume <= 0.
  assert.ok("error" in computeDisplacementCR({ bore_in: 4, stroke_in: 3.5, cylinders: 8, chamber_cc: 64, dome_dish_cc: 200 }));
});

test("bounds: calc-mechanic computeBoltStretch pins F = stretch * A * E / L (Hooke's law) and the torque cross-check K*d*F/12", () => {
  // Steel E = 30e6 psi; 0.5 in dia tensile area 0.1419 in^2.
  for (const diameter_in of [0.25, 0.5, 0.75, 1.0]) {
    for (const grip_length_in of [1, 4, 8]) {
      for (const stretch_thou of [2, 5, 10]) {
        const r = computeBoltStretch({ diameter_in, grip_length_in, stretch_thou, material: "steel", k_factor: 0.18 });
        assert.ok(!r.error, `d=${diameter_in} L=${grip_length_in} s=${stretch_thou}: ${JSON.stringify(r)}`);
        const A_lookup = { 0.25: 0.0318, 0.5: 0.1419, 0.75: 0.3340, 1: 0.6060 };
        const A = A_lookup[diameter_in];
        const stretch_in = stretch_thou / 1000;
        const expected_F = (stretch_in * A * 30000000) / grip_length_in;
        assert.ok(Math.abs(r.clamp_load_lb - expected_F) < 1e-6, `clamp load identity`);
        assert.ok(
          Math.abs(r.cross_check_torque_ft_lb - (0.18 * diameter_in * expected_F) / 12) < 1e-6,
          `torque cross-check identity`,
        );
      }
    }
  }
});

test("bounds: calc-mechanic computeBoltStretch rejects unknown material / non-positive inputs / unsupported diameter (documented)", () => {
  assert.ok("error" in computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 5, material: "not-a-material" }));
  assert.ok("error" in computeBoltStretch({ diameter_in: 0, grip_length_in: 4, stretch_thou: 5, material: "steel" }));
  assert.ok("error" in computeBoltStretch({ diameter_in: 0.5, grip_length_in: 0, stretch_thou: 5, material: "steel" }));
  assert.ok("error" in computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 0, material: "steel" }));
  assert.ok("error" in computeBoltStretch({ diameter_in: 0.4, grip_length_in: 4, stretch_thou: 5, material: "steel" }));
});

test("bounds: calc-mechanic computeDriveshaftCritical pins recommended_max_rpm = 0.65 * critical_rpm across the tube sweep", () => {
  for (const od_in of [2.5, 3.5, 4.5]) {
    for (const wall_in of [0.065, 0.083, 0.12]) {
      for (const length_in of [36, 50, 72]) {
        for (const material of ["steel", "aluminum", "carbon"]) {
          if (wall_in >= od_in / 2) continue;
          const r = computeDriveshaftCritical({ od_in, wall_in, length_in, material });
          assert.ok(!r.error, `${od_in}x${wall_in}x${length_in} ${material}: ${JSON.stringify(r)}`);
          assertFinitePositive(r.critical_rpm, `critical`);
          assert.ok(Math.abs(r.recommended_max_rpm - r.critical_rpm * 0.65) < 1e-6, `0.65 derate`);
        }
      }
    }
  }
});

test("bounds: calc-mechanic computeDriveshaftCritical rejects unknown material / non-positive OD / wall >= OD/2 / non-positive length (documented)", () => {
  assert.ok("error" in computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 50, material: "not-a-material" }));
  assert.ok("error" in computeDriveshaftCritical({ od_in: 0, wall_in: 0.083, length_in: 50, material: "steel" }));
  assert.ok("error" in computeDriveshaftCritical({ od_in: 3.5, wall_in: 2.0, length_in: 50, material: "steel" }));
  assert.ok("error" in computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 0, material: "steel" }));
});

test("bounds: calc-mechanic computeFuelRange pins range = tank * mpg * load_factor and the per-fuel BTU table", () => {
  const fuels = [
    { key: "gasoline_E10", lhv: 112000 },
    { key: "diesel_2", lhv: 128450 },
    { key: "LPG", lhv: 84000 },
    { key: "jet_a", lhv: 124000 },
  ];
  for (const { key, lhv } of fuels) {
    for (const tank_gal of [5, 18, 50]) {
      for (const mpg of [10, 25, 50]) {
        for (const load_factor of [0.7, 1.0, 1.3]) {
          const r = computeFuelRange({ fuel: key, tank_gal, mpg, mpg_basis: key, load_factor });
          assert.ok(!r.error, `${key} tank=${tank_gal} mpg=${mpg} lf=${load_factor}: ${JSON.stringify(r)}`);
          assert.ok(Math.abs(r.total_btu - tank_gal * lhv) < 1e-6, `BTU identity`);
          assert.ok(Math.abs(r.range_mi - tank_gal * mpg * load_factor) < 1e-9, `range identity`);
          assert.strictEqual(r.derate_flag, "ok");
        }
      }
    }
  }
  // MPG basis mismatch: derate_flag fires.
  const mismatch = computeFuelRange({ fuel: "gasoline_E85", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10" });
  assert.ok(/differs/.test(mismatch.derate_flag), `derate flag`);
});

test("bounds: calc-mechanic computeFuelRange rejects unknown fuel / negative tank / non-positive MPG / out-of-band load factor (documented)", () => {
  assert.ok("error" in computeFuelRange({ fuel: "not-a-fuel", tank_gal: 18, mpg: 28 }));
  assert.ok("error" in computeFuelRange({ fuel: "gasoline_E10", tank_gal: -1, mpg: 28 }));
  assert.ok("error" in computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 0 }));
  assert.ok("error" in computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, load_factor: 0 }));
  assert.ok("error" in computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, load_factor: 1.6 }));
});

test("bounds: calc-mechanic parseTireSize pins metric WIDTH/RATIO R RIM and imperial OD x WIDTH R RIM forms exactly", () => {
  // Metric: 285/75R17 -> diameter = 17 + 2 * (285 * 0.75 / 25.4).
  const m = parseTireSize("285/75R17");
  const expected_m = 17 + 2 * (285 * 0.75 / 25.4);
  assert.ok(Math.abs(m - expected_m) < 1e-9, `metric 285/75R17: ${m}`);
  // P-prefix accepted.
  assert.ok(Math.abs(parseTireSize("P285/75R17") - expected_m) < 1e-9, `P-prefix`);
  // Imperial: 33x12.50R17 -> diameter = 33 (the OD literal).
  assert.strictEqual(parseTireSize("33x12.50R17"), 33);
  // Unparseable returns NaN.
  assert.ok(Number.isNaN(parseTireSize("not-a-tire")));
  assert.ok(Number.isNaN(parseTireSize(123)));
});

test("bounds: calc-mechanic computeTireGearing pins rev/mi = 63360 / (pi * diameter) and effective ratio scaling", () => {
  // 265/70R17 -> diameter ~ 31.6 in; 285/75R17 -> diameter ~ 33.83 in.
  const r = computeTireGearing({
    original_size: "265/70R17", new_size: "285/75R17",
    axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800,
  });
  assert.ok(!r.error, JSON.stringify(r));
  // rev/mi identity at both sizes.
  assert.ok(Math.abs(r.rev_per_mi_orig - 63360 / (Math.PI * r.diameter_orig_in)) < 1e-9, `rev/mi orig`);
  assert.ok(Math.abs(r.rev_per_mi_new - 63360 / (Math.PI * r.diameter_new_in)) < 1e-9, `rev/mi new`);
  // effective ratio scaling: effective_new = effective_orig * (orig/new).
  assert.ok(Math.abs(r.effective_orig - 3.55 * 0.69) < 1e-12, `effective_orig`);
  assert.ok(
    Math.abs(r.effective_new - r.effective_orig * (r.diameter_orig_in / r.diameter_new_in)) < 1e-9,
    `effective_new`,
  );
  // Recommended ratio is one of the documented candidates.
  assert.ok([3.73, 4.10, 4.56, 4.88, 5.13, 5.38].includes(r.recommended_axle_ratio));
});

test("bounds: calc-mechanic computeTireGearing rejects unparseable tire sizes / non-positive ratios / non-positive RPM (documented)", () => {
  assert.ok("error" in computeTireGearing({ original_size: "not-a-tire", new_size: "285/75R17", axle_ratio: 3.55 }));
  assert.ok("error" in computeTireGearing({ original_size: "265/70R17", new_size: "not-a-tire", axle_ratio: 3.55 }));
  assert.ok("error" in computeTireGearing({ original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 0 }));
  assert.ok("error" in computeTireGearing({ original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 3.55, top_gear_ratio: 0 }));
  assert.ok("error" in computeTireGearing({ original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 3.55, target_rpm: 0 }));
});

test("bounds: calc-mechanic computeBrakePadLife pins KE = 0.5 * m * v^2 and the per-material wear rate sweep", () => {
  for (const vehicle_weight_lb of [2500, 3500, 6000]) {
    for (const speed_delta_mph of [10, 30, 70]) {
      for (const pad_material of ["organic", "semi_metallic", "ceramic"]) {
        const r = computeBrakePadLife({
          vehicle_weight_lb, speed_delta_mph, stops_per_mile: 0.4,
          pad_thickness_mm: 12, pad_material, rotor_mass_lb: 18,
        });
        assert.ok(!r.error, `w=${vehicle_weight_lb} v=${speed_delta_mph} ${pad_material}: ${JSON.stringify(r)}`);
        const m_kg = vehicle_weight_lb * 0.4536;
        const v_ms = speed_delta_mph * 0.4470;
        const expected_ke = 0.5 * m_kg * v_ms * v_ms;
        assert.ok(Math.abs(r.ke_J - expected_ke) < 1e-6, `KE identity`);
        assert.ok(Math.abs(r.ke_kJ - expected_ke / 1000) < 1e-9, `kJ identity`);
        assertFinitePositive(r.wear_per_stop_mm, `wear`);
        assertFinitePositive(r.stops_until_worn, `stops`);
        assertFinitePositive(r.miles_until_worn, `miles`);
      }
    }
  }
});

test("bounds: calc-mechanic computeBrakePadLife rejects unknown material / non-positive inputs (documented)", () => {
  assert.ok("error" in computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, pad_material: "not-a-pad" }));
  assert.ok("error" in computeBrakePadLife({ vehicle_weight_lb: 0, speed_delta_mph: 30, pad_material: "ceramic" }));
  assert.ok("error" in computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 0, pad_material: "ceramic" }));
  assert.ok("error" in computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: -1, pad_material: "ceramic" }));
  assert.ok("error" in computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 30, pad_thickness_mm: 0, pad_material: "ceramic" }));
});

// --------------------------------------------------------------------
// calc-trucking expansion (spec-v14 §8.4 Phase D follow-up). Fourteen
// new rows close all eight calc-trucking compute functions, moving
// calc-trucking.js coverage from 0 / 9 (0%) -> 8 / 9 (89%). Same
// warn-on-missing scaffolding; per-function pin pattern: documented
// sweep + boundary rejections + closed-form identity pins (DIM weight
// = L*W*H / divisor with per-carrier divisor pinning, NMFC density
// bracket lookup, FMCSA 49 CFR 395 HOS remaining-time identities,
// federal bridge formula W = 500 * (L*N/(N-1) + 12N + 36) with the
// 20k single / 34k tandem / 80k interstate caps, reefer fuel burn =
// gph * haul_hr with per-ambient factor sweep, AASHTO Green Book SSD
// d = 1.47*v*t + v^2/(30*(f+g))).
// --------------------------------------------------------------------

import {
  computeDIM,
  computeFreightDensity,
  computePalletLoadout,
  computeHOS,
  computeBridgeFormula,
  computeReeferBurn,
  computeIncoterm,
  computeStoppingSightDistance,
} from "../../calc-trucking.js";

test("bounds: calc-trucking computeDIM pins dim_lb = L*W*H / divisor per carrier and the breakeven_in3 = actual_weight * divisor identity", () => {
  // Divisor table per the bundled DIM_DIVISORS: UPS / FedEx / DHL all 139, USPS 166, freight 250.
  const cases = [
    { carrier: "UPS_Daily", divisor: 139 },
    { carrier: "FedEx_Ground", divisor: 139 },
    { carrier: "USPS", divisor: 166 },
    { carrier: "freight", divisor: 250 },
  ];
  for (const { carrier, divisor } of cases) {
    for (const L of [6, 12, 24, 48]) {
      for (const W of [6, 12, 18]) {
        for (const H of [4, 10, 24]) {
          for (const actual_weight_lb of [0, 5, 50]) {
            const r = computeDIM({ length_in: L, width_in: W, height_in: H, actual_weight_lb, carrier });
            assert.ok(!r.error, `${carrier} ${L}x${W}x${H} w=${actual_weight_lb}: ${JSON.stringify(r)}`);
            assert.strictEqual(r.divisor, divisor, `divisor ${carrier}`);
            assert.ok(Math.abs(r.dim_lb - (L * W * H) / divisor) < 1e-9, `dim_lb identity ${carrier}`);
            assert.ok(Math.abs(r.billable_lb - Math.max(r.dim_lb, actual_weight_lb)) < 1e-9, `billable = max(dim, actual)`);
            if (actual_weight_lb > 0) {
              assert.ok(Math.abs(r.breakeven_in3 - actual_weight_lb * divisor) < 1e-9, `breakeven identity`);
            } else {
              assert.strictEqual(r.breakeven_in3, null, `breakeven null when actual==0`);
            }
            assert.ok(["DIM (cube-out)", "actual (weigh-out)"].includes(r.billing_basis), `basis ${r.billing_basis}`);
          }
        }
      }
    }
  }
});

test("bounds: calc-trucking computeDIM rejects unknown carrier / non-positive dimensions / negative weight (documented)", () => {
  assert.ok("error" in computeDIM({ length_in: 24, width_in: 18, height_in: 12, carrier: "not-a-carrier" }));
  assert.ok("error" in computeDIM({ length_in: 0, width_in: 18, height_in: 12, carrier: "UPS_Daily" }));
  assert.ok("error" in computeDIM({ length_in: 24, width_in: 0, height_in: 12, carrier: "UPS_Daily" }));
  assert.ok("error" in computeDIM({ length_in: 24, width_in: 18, height_in: 0, carrier: "UPS_Daily" }));
  assert.ok("error" in computeDIM({ length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: -1, carrier: "UPS_Daily" }));
});

test("bounds: calc-trucking computeFreightDensity pins density = weight / (L*W*H / 1728) and the NMFC class bracket lookup", () => {
  for (const L of [12, 48, 96]) {
    for (const W of [12, 40, 96]) {
      for (const H of [12, 48, 96]) {
        for (const weight_lb of [10, 100, 500, 2000]) {
          const r = computeFreightDensity({ length_in: L, width_in: W, height_in: H, weight_lb });
          assert.ok(!r.error, `${L}x${W}x${H} w=${weight_lb}: ${JSON.stringify(r)}`);
          const expected_ft3 = (L * W * H) / 1728;
          assert.ok(Math.abs(r.cubic_ft - expected_ft3) < 1e-12, `cubic_ft identity`);
          assert.ok(Math.abs(r.density_pcf - weight_lb / expected_ft3) < 1e-9, `density identity`);
          assert.ok(Number.isInteger(r.density_class) || r.density_class === 77.5 || r.density_class === 92.5, `class is a known bracket`);
        }
      }
    }
  }
  // Specific bracket pin: density 50+ pcf -> class 50; density just above 0 -> class 500.
  const dense = computeFreightDensity({ length_in: 12, width_in: 12, height_in: 12, weight_lb: 200 });
  assert.ok(dense.density_pcf >= 50);
  assert.strictEqual(dense.density_class, 50);
  const fluffy = computeFreightDensity({ length_in: 48, width_in: 48, height_in: 48, weight_lb: 1 });
  assert.strictEqual(fluffy.density_class, 500);
});

test("bounds: calc-trucking computeFreightDensity rejects non-positive dimensions or weight (documented)", () => {
  assert.ok("error" in computeFreightDensity({ length_in: 0, width_in: 40, height_in: 48, weight_lb: 100 }));
  assert.ok("error" in computeFreightDensity({ length_in: 48, width_in: 40, height_in: 48, weight_lb: 0 }));
});

test("bounds: calc-trucking computePalletLoadout pins floor-area pallets = floor(L/pl) * floor(W/pw) and the cube_fill_percent identity", () => {
  // 53-ft dry van: L=636 in, W=100 in; with 48x40 pallets aligned -> floor(636/48)=13 * floor(100/40)=2 = 26 pallets by floor.
  const r = computePalletLoadout({
    case_length_in: 16, case_width_in: 12, case_height_in: 10, case_weight_lb: 8, cases_per_pallet: 36,
    pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48,
    trailer: "dry_van_53", pinwheel: false,
  });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.pallets_by_floor, 13 * 2, `floor pallets identity`);
  // total_weight = pallets_total * cases_per_pallet * case_weight; verify by reconstruction.
  const per_pallet_weight = 36 * 8;
  assert.strictEqual(r.total_weight_lb, r.pallets_total * per_pallet_weight);
  // cube_fill_percent identity.
  const pallet_cube = (48 * 40 * 48) / 1728;
  const trailer_cube = (636 * 100 * 110) / 1728;
  assert.ok(
    Math.abs(r.cube_fill_percent - (r.pallets_total * pallet_cube / trailer_cube) * 100) < 1e-9,
    `cube_fill identity`,
  );
  // flag is one of the documented three.
  assert.ok(["weigh-out", "cube-out", "empty"].includes(r.flag), `flag=${r.flag}`);
});

test("bounds: calc-trucking computePalletLoadout rejects unknown trailer / non-positive cases / non-positive cases-per-pallet (documented)", () => {
  assert.ok("error" in computePalletLoadout({ case_length_in: 16, case_width_in: 12, case_height_in: 10, trailer: "not-a-trailer" }));
  assert.ok("error" in computePalletLoadout({ case_length_in: 0, case_width_in: 12, case_height_in: 10, trailer: "dry_van_53" }));
  assert.ok("error" in computePalletLoadout({ case_length_in: 16, case_width_in: 12, case_height_in: 10, cases_per_pallet: 0, trailer: "dry_van_53" }));
});

test("bounds: calc-trucking computeHOS pins drive_remaining = max(0, drive_max - drive_used) and triggers 30-min / 10-hour reset at the right thresholds", () => {
  // Property 70/8 profile: drive_max=11, on_duty_window=14, weekly_max=70.
  // 5 hr on-duty + 4 hr drive -> drive_used=4, on_duty=9, drive_remaining=7, on_duty_remaining=5.
  const r = computeHOS({
    profile: "property_70_8",
    events: [
      { kind: "on_duty", hours: 5 },
      { kind: "drive", hours: 4 },
    ],
    weekly_on_duty_used_hr: 30,
  });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.drive_used, 4);
  assert.strictEqual(r.drive_remaining, 7);
  assert.strictEqual(r.on_duty_used, 9);
  assert.strictEqual(r.on_duty_remaining, 5);
  assert.strictEqual(r.weekly_remaining, 70 - (30 + 9));
  assert.strictEqual(r.needs_break, false);
  // 8 consecutive drive hours without break -> needs_break.
  const need_break = computeHOS({
    profile: "property_70_8",
    events: [{ kind: "drive", hours: 8 }],
  });
  assert.strictEqual(need_break.needs_break, true);
  // 30-minute break (sleeper >= 0.5 hr) resets cumulative drive.
  const after_break = computeHOS({
    profile: "property_70_8",
    events: [
      { kind: "drive", hours: 8 },
      { kind: "sleeper", hours: 0.5 },
      { kind: "drive", hours: 2 },
    ],
  });
  assert.strictEqual(after_break.needs_break, false);
  assert.strictEqual(after_break.break_taken, true);
  // current_time_iso -> next-drive-start derivation.
  const at_limit = computeHOS({
    profile: "property_70_8",
    events: [{ kind: "drive", hours: 11 }],
    current_time_iso: "2026-05-19T12:00:00.000Z",
  });
  assert.ok(/10-hour reset/.test(at_limit.next_drive_reason), `10-hour reset triggered`);
  assert.strictEqual(at_limit.next_drive_start_iso, "2026-05-19T22:00:00.000Z");
});

test("bounds: calc-trucking computeHOS rejects unknown profile / non-array events / unknown event kind / negative hours / invalid ISO date (documented)", () => {
  assert.ok("error" in computeHOS({ profile: "not-a-profile" }));
  assert.ok("error" in computeHOS({ profile: "property_70_8", events: "not-a-list" }));
  assert.ok("error" in computeHOS({ profile: "property_70_8", events: [{ kind: "wrong", hours: 1 }] }));
  assert.ok("error" in computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: -1 }] }));
  assert.ok("error" in computeHOS({ profile: "property_70_8", events: [], current_time_iso: "not-a-date" }));
});

test("bounds: calc-trucking computeBridgeFormula pins single-axle 20k / tandem 34k / federal 80k caps and flags bridge-formula violations", () => {
  // Clean 5-axle Class 8 at the 80k cap: 12k steer + 4 * 17k = 80k total, well-spread.
  const ok = computeBridgeFormula({
    axle_weights_lb: [12000, 17000, 17000, 17000, 17000],
    axle_spacings_ft: [12, 4, 30, 4],
  });
  assert.ok(!ok.error, JSON.stringify(ok));
  assert.strictEqual(ok.total_weight_lb, 80000);
  assert.strictEqual(ok.over_interstate, false);
  // Single-axle violation: 21k on a single trips the 20k cap.
  const single_over = computeBridgeFormula({ axle_weights_lb: [21000, 15000], axle_spacings_ft: [10] });
  assert.ok(single_over.axle_violations.some((m) => /single limit/.test(m)));
  // Tandem violation: 36k across two axles 4 ft apart trips the 34k cap.
  const tandem_over = computeBridgeFormula({ axle_weights_lb: [18000, 18000], axle_spacings_ft: [4] });
  assert.ok(tandem_over.axle_violations.some((m) => /tandem/.test(m)));
  // Interstate cap: total > 80k flags over_interstate.
  const over_80 = computeBridgeFormula({
    axle_weights_lb: [12000, 18000, 18000, 18000, 18000],
    axle_spacings_ft: [12, 4, 30, 4],
  });
  assert.strictEqual(over_80.total_weight_lb, 84000);
  assert.strictEqual(over_80.over_interstate, true);
});

test("bounds: calc-trucking computeBridgeFormula rejects empty / mismatched-length spacings (documented)", () => {
  assert.ok("error" in computeBridgeFormula({ axle_weights_lb: [], axle_spacings_ft: [] }));
  assert.ok("error" in computeBridgeFormula({ axle_weights_lb: [12000, 17000], axle_spacings_ft: [] }));
  assert.ok("error" in computeBridgeFormula({ axle_weights_lb: [12000], axle_spacings_ft: [4] }));
});

test("bounds: calc-trucking computeReeferBurn pins fuel_burned = gph * haul_hr and the per-ambient-band factor sweep", () => {
  for (const unit of ["thermo_king_continuous", "thermo_king_cycle", "carrier_continuous", "carrier_cycle"]) {
    for (const haul_hr of [4, 12, 24, 48]) {
      for (const ambient_band of ["cold", "moderate", "hot"]) {
        const r = computeReeferBurn({ unit, tank_gal: 50, haul_hr, ambient_band });
        assert.ok(!r.error, `${unit} ${haul_hr} hr ${ambient_band}: ${JSON.stringify(r)}`);
        assertFinitePositive(r.gph, `gph`);
        assert.ok(Math.abs(r.fuel_burned - r.gph * haul_hr) < 1e-9, `fuel = gph * haul_hr`);
        assert.ok(Math.abs(r.run_time_hr - 50 / r.gph) < 1e-9, `run_time = tank / gph`);
        // refuel_required flag flips at fuel_burned > tank.
        assert.strictEqual(r.refuel_required, r.fuel_burned_effective > 50);
      }
    }
  }
  // Specific ambient-factor pin: hot raises gph by 20%; cold drops by 15%.
  const base = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 1, ambient_band: "moderate" });
  const hot = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 1, ambient_band: "hot" });
  const cold = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 1, ambient_band: "cold" });
  assert.ok(Math.abs(hot.gph - base.gph * 1.20) < 1e-9, `hot factor 1.20`);
  assert.ok(Math.abs(cold.gph - base.gph * 0.85) < 1e-9, `cold factor 0.85`);
});

test("bounds: calc-trucking computeReeferBurn rejects unknown unit / non-positive tank or haul (documented)", () => {
  assert.ok("error" in computeReeferBurn({ unit: "not-a-unit", tank_gal: 50, haul_hr: 12 }));
  assert.ok("error" in computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 0, haul_hr: 12 }));
  assert.ok("error" in computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 0 }));
});

test("bounds: calc-trucking computeIncoterm covers every published 2020 term and rejects unknown terms (documented)", () => {
  const terms = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];
  for (const term of terms) {
    const r = computeIncoterm({ term });
    assert.ok(!r.error, `${term}: ${JSON.stringify(r)}`);
    assert.strictEqual(r.term, term);
    assert.ok(typeof r.name === "string" && r.name.length > 0, `${term} name`);
    assert.ok(["seller", "buyer"].includes(r.freight), `${term} freight party`);
    assert.ok(typeof r.risk_transfer === "string" && r.risk_transfer.length > 0, `${term} risk_transfer`);
  }
  assert.ok("error" in computeIncoterm({ term: "not-a-term" }));
});

test("bounds: calc-trucking computeStoppingSightDistance pins d = 1.47*v*t + v^2 / (30*(f+g)) across the AASHTO design sweep", () => {
  for (const speed_mph of [25, 45, 55, 75]) {
    for (const reaction_time_s of [1.5, 2.5, 3.5]) {
      for (const friction of [0.10, 0.35, 0.60]) {
        for (const grade of [-0.06, 0, 0.06]) {
          if (friction + grade <= 0) continue;
          const r = computeStoppingSightDistance({ speed_mph, reaction_time_s, friction, grade });
          assert.ok(!r.error, `v=${speed_mph} t=${reaction_time_s} f=${friction} g=${grade}: ${JSON.stringify(r)}`);
          assert.ok(
            Math.abs(r.perception_reaction_ft - 1.47 * speed_mph * reaction_time_s) < 1e-9,
            `pr identity`,
          );
          assert.ok(
            Math.abs(r.braking_distance_ft - (speed_mph * speed_mph) / (30 * (friction + grade))) < 1e-9,
            `braking identity`,
          );
          assert.ok(
            Math.abs(r.total_ssd_ft - (r.perception_reaction_ft + r.braking_distance_ft)) < 1e-9,
            `total = pr + braking`,
          );
        }
      }
    }
  }
  // Spec example pin: 55 mph / 2.5 s / 0.35 / 0 -> pr = 1.47*55*2.5 = 202.125 ft;
  // brake = 55^2 / (30*0.35) = 3025 / 10.5 = 288.095 ft; total ~490 ft.
  const aashto = computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.35, grade: 0 });
  assert.ok(Math.abs(aashto.perception_reaction_ft - 202.125) < 1e-9);
  assert.ok(Math.abs(aashto.braking_distance_ft - 3025 / 10.5) < 1e-9);
});

test("bounds: calc-trucking computeStoppingSightDistance rejects non-positive speed / reaction time and impossible f + g <= 0 (documented)", () => {
  assert.ok("error" in computeStoppingSightDistance({ speed_mph: 0, reaction_time_s: 2.5, friction: 0.35 }));
  assert.ok("error" in computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 0, friction: 0.35 }));
  assert.ok("error" in computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: -1.5 }));
  // Downhill ice: f = 0.05, grade = -0.10 -> f + g = -0.05 -> rejection.
  assert.ok("error" in computeStoppingSightDistance({ speed_mph: 55, reaction_time_s: 2.5, friction: 0.05, grade: -0.10 }));
});

test("bounds: calc-stage computeSPLAtmospheric pins inverse_square = 20 * log10(d2/d1) and rejects the documented out-of-domain inputs", () => {
  // Spec-v9 §H.2 worked example: 95 dB at 1 m, 20 C, 50% RH; report at 30 m.
  const r = computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m: 30, temperature_C: 20, RH_percent: 50 });
  assert.ok(!r.error, JSON.stringify(r));
  assert.ok(Math.abs(r.inverse_square_dB - 20 * Math.log10(30)) < 1e-12, `inverse-square identity`);
  // At least the 1 kHz summary fields are finite.
  assertFinite(r.SPL_far_1kHz_dB, `SPL_far_1kHz`);
  assertFinite(r.alpha_1kHz_dB_per_m, `alpha_1kHz`);
  assertFinite(r.absorption_1kHz_dB, `absorption_1kHz`);
  // Documented rejections.
  assert.ok("error" in computeSPLAtmospheric({ d_ref_m: 0, d_far_m: 10 }));
  assert.ok("error" in computeSPLAtmospheric({ d_ref_m: 1, d_far_m: 0 }));
  assert.ok("error" in computeSPLAtmospheric({ d_ref_m: 5, d_far_m: 1 }));
  assert.ok("error" in computeSPLAtmospheric({ d_ref_m: 1, d_far_m: 10, RH_percent: -1 }));
  assert.ok("error" in computeSPLAtmospheric({ d_ref_m: 1, d_far_m: 10, RH_percent: 101 }));
});
