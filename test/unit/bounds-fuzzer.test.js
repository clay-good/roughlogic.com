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
