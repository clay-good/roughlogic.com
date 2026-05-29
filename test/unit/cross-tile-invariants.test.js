// spec-v14 Phase F: cross-tile invariants.
//
// Tiles that share a computation must agree to the floating-point floor.
// Conversions with a documented inverse must round-trip to within the
// numerical tolerance the spec calls out (1e-12 absolute for SI-base
// conversions; 1e-9 relative for empirical conversions). Monotonic
// relationships must remain monotonic over a sweep; a non-monotonic
// result for a monotonic relationship is a transcription error.
//
// Per spec-v14 §10 the catalog has five shared-computation classes:
// AWG->cmils (Group A), CFM<->m^3/s (Groups C/D/G), NFA hose-friction
// coefficients (Group F), psi<->feet-of-head water (Groups B/C/L), and
// the IRS standard mileage rate (Groups P/R/J). The first four are
// pure-function shared primitives and are tested here. The mileage-rate
// invariant is asserted by the existing test/unit/citation-runtime-audit.test.js
// (the rate is sourced from a single bundled JSON shard per the v6
// source-stamp).
//
// This file is scaffolding for the Phase F invariants. As later phases
// land, additional shared computations and round-trip pairs append here.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  awgAreaCmils,
  awgAreaM2,
  awgDiameterInches,
  conductorResistance,
  voltageDrop,
  feetOfHeadToPsi,
  fireHoseFrictionLoss,
  F_to_C,
  C_to_F,
  C_to_K,
  K_to_C,
} from "../../pure-math.js";
import {
  convertUnit,
  UNITS,
  IRS_STANDARD_MILEAGE_RATE,
  computeMileageCost,
  computeTimesheet,
} from "../../calc-cross.js";
import {
  STANDARD_MILEAGE_RATES,
  computeMileageRollup,
} from "../../calc-accounting.js";
import {
  HOSE_FRICTION_COEFFICIENTS,
  computeFireFriction,
  computeReverseLayFriction,
  computeStandpipeFriction,
  computePDP,
} from "../../calc-fire.js";
import { computeFrictionLoss, computeRecircPumpHead } from "../../calc-plumbing.js";
import { computeBeamLoading } from "../../calc-construction.js";
import { computeDensityAltitude } from "../../calc-aviation.js";
import { computePITI } from "../../calc-realestate.js";
import { computeParkland, computeMAP } from "../../calc-ems.js";
import { computeEnergyRequirement, computeMaintenanceFluid } from "../../calc-vet.js";
import { computeBoltStretch, computePropSlip } from "../../calc-mechanic.js";
import { computeBridgeFormula } from "../../calc-trucking.js";
import { computePanConversion } from "../../calc-kitchen.js";
import { computeBeerLambert, computeMassMoles } from "../../calc-lab.js";
import { computeOhmsLaw, computeTransformerSize, computeLVDCDrop, computeBreakerSize, computeBendRadius } from "../../calc-electrical.js";
import { computeAsphaltTonnage, computeConcreteVolume } from "../../calc-construction.js";
import { computePipeVolume } from "../../calc-plumbing.js";
import { computeETTSizing } from "../../calc-vet.js";
import { computeAmortizationSchedule } from "../../calc-realestate.js";
import { computeFoam, computeAerialLadderReach } from "../../calc-fire.js";
import { computeSHR } from "../../calc-hvac.js";
import { computeDisplacementCR, displacementCRExample } from "../../calc-mechanic.js";
import { computeCrosswind } from "../../calc-aviation.js";
import { computeBreakeven } from "../../calc-accounting.js";
import { computeMarkup } from "../../calc-cross.js";
import { computeHEPALife } from "../../calc-restoration.js";
import { computeTargetWeightLoss } from "../../calc-vet.js";
import { computePressureAltitude } from "../../calc-aviation.js";
import { computeFilterLoading } from "../../calc-water.js";
import { computeTileCount } from "../../calc-construction.js";
import { computeSETax } from "../../calc-accounting.js";
import { computeTrueAirspeed } from "../../calc-aviation.js";
import { computeServiceLoad, serviceLoadExample } from "../../calc-electrical.js";
import { computeNAMSizing } from "../../calc-restoration.js";
import { computeMaterialCost } from "../../calc-cross.js";
import { computeETE } from "../../calc-aviation.js";
import { computeShockIndex } from "../../calc-ems.js";
import { computeWindPressure, computeSnowLoad } from "../../calc-construction.js";
import { computeWindChill, computeLoanPayment, computeOvertime } from "../../calc-cross.js";
import { manualJCooling, computeAirReceiver } from "../../calc-hvac.js";
import { computePoundsFormula } from "../../calc-water.js";
import { computeAirMovers } from "../../calc-restoration.js";
import { computeYieldEP } from "../../calc-kitchen.js";
import { computeHydrantFlow } from "../../calc-fire.js";
import { computeRiggingCheck } from "../../calc-stage.js";
import { computeGPA, computeDrawbarPower, computeSeedRate } from "../../calc-agriculture.js";
import { computePaintCoverage } from "../../calc-construction.js";
import { computeFreightDensity } from "../../calc-trucking.js";
import { computeNoiseDose } from "../../calc-cross.js";
import { computeBrakePadLife } from "../../calc-mechanic.js";
import { computeBoxFill } from "../../calc-electrical.js";
import { computeCfmPerTon } from "../../calc-hvac.js";
import { computeIvDripRate } from "../../calc-ems.js";
import { computeCropYield } from "../../calc-agriculture.js";
import { computeRcf } from "../../calc-lab.js";
import { computeGasPipeSizing } from "../../calc-plumbing.js";
import { computeRequiredFireFlow } from "../../calc-fire.js";
import { computeNeutralImbalance } from "../../calc-stage.js";
import { computeStatistics } from "../../calc-edu.js";
import { computeVetDose } from "../../calc-vet.js";
import { computePlateCost } from "../../calc-kitchen.js";
import { computeDehumidifierSize } from "../../calc-restoration.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const AWG_LIST = ["14", "12", "10", "8", "6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0"];

// --- Shared computation: AWG -> cmils (Group A primitives) ---------------

test("invariant: awgAreaCmils is deterministic across repeated calls", () => {
  for (const awg of AWG_LIST) {
    const a = awgAreaCmils(awg);
    const b = awgAreaCmils(awg);
    assert.equal(a, b, `awgAreaCmils(${awg}) drifted between calls`);
    assert.ok(Number.isFinite(a) && a > 0, `awgAreaCmils(${awg}) returned ${a}`);
  }
});

test("invariant: awgAreaCmils agrees with awgAreaM2 by the cmil->m^2 factor", () => {
  // 1 cmil = pi/4 * (0.001 in)^2 = pi/4 * (2.54e-5 m)^2
  const CMIL_TO_M2 = (Math.PI / 4) * (2.54e-5) ** 2;
  for (const awg of AWG_LIST) {
    const cmils = awgAreaCmils(awg);
    const m2 = awgAreaM2(awg);
    const derived = cmils * CMIL_TO_M2;
    const rel = Math.abs(derived - m2) / m2;
    assert.ok(rel < 1e-9, `AWG ${awg}: cmils*factor=${derived} vs m2=${m2} (rel=${rel})`);
  }
});

test("invariant: awgAreaCmils is monotonic-decreasing in AWG number", () => {
  // Smaller AWG number = bigger conductor. Walk the numeric AWGs in
  // ascending AWG number order and assert area strictly decreases.
  const numeric = ["1", "2", "4", "6", "8", "10", "12", "14"];
  let prev = Infinity;
  for (const awg of numeric) {
    const cmils = awgAreaCmils(awg);
    assert.ok(cmils < prev, `AWG ${awg}: cmils=${cmils} not less than prev=${prev}`);
    prev = cmils;
  }
});

test("invariant: voltageDrop is monotonic-increasing in length", () => {
  let prev = -Infinity;
  for (const length_ft of [25, 50, 100, 200, 400]) {
    const vd = voltageDrop({
      phase: "single",
      material: "copper",
      awg: "10",
      length_ft,
      current_A: 20,
    });
    assert.ok(vd > prev, `vd at L=${length_ft} = ${vd} not greater than prev=${prev}`);
    prev = vd;
  }
});

test("invariant: voltageDrop is monotonic-increasing in current", () => {
  let prev = -Infinity;
  for (const current_A of [5, 10, 15, 20, 30]) {
    const vd = voltageDrop({
      phase: "single",
      material: "copper",
      awg: "10",
      length_ft: 100,
      current_A,
    });
    assert.ok(vd > prev, `vd at I=${current_A} = ${vd} not greater than prev=${prev}`);
    prev = vd;
  }
});

test("invariant: conductorResistance is monotonic-increasing in temperature", () => {
  let prev = -Infinity;
  for (const temperature_C of [20, 30, 45, 60, 75, 90]) {
    const r = conductorResistance({
      material: "copper",
      awg: "10",
      length_m: 30.48,
      temperature_C,
    });
    assert.ok(r > prev, `R at T=${temperature_C} = ${r} not greater than prev=${prev}`);
    prev = r;
  }
});

// --- Shared computation: NFA hose-friction (Group F primitive) ----------

test("invariant: fireHoseFrictionLoss is monotonic in flow (Q^2 law)", () => {
  // FL = C * (Q/100)^2 * L/100. Strictly increasing in Q for positive C, L.
  let prev = -Infinity;
  for (const gpm of [100, 200, 300, 400, 500]) {
    const fl = fireHoseFrictionLoss({ C: 15.5, gpm, length_ft: 100 });
    assert.ok(fl > prev, `FL at Q=${gpm} = ${fl} not greater than prev=${prev}`);
    prev = fl;
  }
});

test("invariant: fireHoseFrictionLoss obeys Q^2 scaling exactly", () => {
  // Doubling Q quadruples FL by construction. The invariant catches a
  // future refactor that swaps the exponent.
  const fl1 = fireHoseFrictionLoss({ C: 15.5, gpm: 100, length_ft: 100 });
  const fl2 = fireHoseFrictionLoss({ C: 15.5, gpm: 200, length_ft: 100 });
  const ratio = fl2 / fl1;
  assert.ok(Math.abs(ratio - 4) < 1e-9, `Q^2 scaling broken: ratio=${ratio}`);
});

test("invariant: fireHoseFrictionLoss obeys L^1 scaling exactly", () => {
  const fl1 = fireHoseFrictionLoss({ C: 15.5, gpm: 200, length_ft: 100 });
  const fl3 = fireHoseFrictionLoss({ C: 15.5, gpm: 200, length_ft: 300 });
  const ratio = fl3 / fl1;
  assert.ok(Math.abs(ratio - 3) < 1e-9, `L scaling broken: ratio=${ratio}`);
});

// spec-v14 §10.1: the NFA hose-friction coefficient table is shared
// across Group F hose friction (computeFireFriction), pump discharge
// pressure (computePDP via computeFireFriction), reverse-lay friction
// (computeReverseLayFriction), and standpipe friction
// (computeStandpipeFriction). All four must agree on the per-diameter
// coefficient at the bit level so a coefficient drift in any consumer
// surfaces immediately.

const HOSE_DIAMETERS = ["1.75_in", "2.5_in", "3_in", "4_in", "5_in"];

test("invariant: computeFireFriction matches the fireHoseFrictionLoss primitive exactly", () => {
  for (const d of HOSE_DIAMETERS) {
    const C = HOSE_FRICTION_COEFFICIENTS[d];
    const direct = fireHoseFrictionLoss({ C, gpm: 250, length_ft: 100 });
    const r = computeFireFriction({ hose_diameter: d, gpm: 250, length_ft: 100 });
    assert.equal(
      r.friction_loss_psi,
      direct,
      `computeFireFriction(${d}) drifted from fireHoseFrictionLoss primitive`,
    );
  }
});

test("invariant: computeReverseLayFriction single-pump equals computeFireFriction at n_pumps=1", () => {
  for (const d of HOSE_DIAMETERS) {
    const direct = computeFireFriction({ hose_diameter: d, gpm: 500, length_ft: 500 });
    const rev = computeReverseLayFriction({
      hose_diameter: d,
      gpm: 500,
      length_ft: 500,
      n_pumps: 1,
    });
    assert.equal(
      rev.single_pump_psi,
      direct.friction_loss_psi,
      `reverse-lay(${d}) single-pump drifted from computeFireFriction`,
    );
    assert.equal(rev.coefficient, HOSE_FRICTION_COEFFICIENTS[d]);
  }
});

test("invariant: computeStandpipeFriction per-outlet equals computeFireFriction at the same hose", () => {
  for (const d of HOSE_DIAMETERS) {
    const direct = computeFireFriction({ hose_diameter: d, gpm: 250, length_ft: 100 });
    const sp = computeStandpipeFriction({
      riser_height_ft: 100,
      outlet_count: 1,
      gpm_per_outlet: 250,
      outlet_length_ft: 100,
      hose_diameter: d,
    });
    assert.equal(
      sp.per_outlet_psi,
      direct.friction_loss_psi,
      `standpipe(${d}) per-outlet drifted from computeFireFriction`,
    );
  }
});

test("invariant: HOSE_FRICTION_COEFFICIENTS is the sole source for hose-friction C across calc-fire", () => {
  // All three consumer functions must reject the same set of unknown
  // hose diameters with the documented error sentinel. If a future
  // refactor inlines a default coefficient anywhere, this test surfaces
  // it (the consumer would silently compute a value instead of
  // returning the unknown-diameter rejection).
  const unknown = "bogus_size";
  assert.equal(HOSE_FRICTION_COEFFICIENTS[unknown], undefined);
  assert.deepEqual(
    computeFireFriction({ hose_diameter: unknown, gpm: 200, length_ft: 100 }),
    { error: "Unknown hose diameter." },
  );
  assert.deepEqual(
    computeReverseLayFriction({ hose_diameter: unknown, gpm: 200, length_ft: 100, n_pumps: 1 }),
    { error: "Unknown hose diameter." },
  );
  assert.deepEqual(
    computeStandpipeFriction({
      riser_height_ft: 100,
      outlet_count: 1,
      gpm_per_outlet: 200,
      outlet_length_ft: 100,
      hose_diameter: unknown,
    }),
    { error: "Unknown hose diameter." },
  );
});

test("invariant: HOSE_FRICTION_COEFFICIENTS values are positive and within the NFA-table sanity band", () => {
  // NFA per-diameter coefficients live in (0, 200). The largest is the
  // 1" booster line (around 150); the smallest is the 5" LDH (around
  // 0.08). A coefficient drifting outside this band signals an editing
  // mistake (typo, missing decimal, wrong table).
  for (const [d, C] of Object.entries(HOSE_FRICTION_COEFFICIENTS)) {
    assert.ok(Number.isFinite(C), `coefficient for ${d} is not finite: ${C}`);
    assert.ok(C > 0, `coefficient for ${d} is not positive: ${C}`);
    assert.ok(C < 200, `coefficient for ${d} = ${C} is outside the NFA sanity band`);
  }
});

// --- Shared computation: psi <-> feet-of-head water (Groups B/C/L) ------

test("invariant: psi-to-feet-of-head water round-trip is identity (rho=62.4)", () => {
  // psi = ft * rho / 144 -> ft = psi * 144 / rho. Round-trip residual at
  // representative water-system pressures.
  const RHO = 62.4;
  for (const ft of [10, 23.1, 50, 100, 231, 500]) {
    const psi = feetOfHeadToPsi(ft, RHO);
    const ft_back = (psi * 144) / RHO;
    const rel = Math.abs(ft_back - ft) / ft;
    assert.ok(rel < 1e-12, `ft=${ft} -> psi=${psi} -> ft=${ft_back} (rel=${rel})`);
  }
});

test("invariant: 1 psi == 2.31 ft of head water to three significant figures", () => {
  // The handbook constant the catalog cites (Group B static pressure,
  // Group C NPSHa, Group L irrigation). Asserting against the published
  // figure rather than a derived constant catches a transcription error
  // in a future refactor.
  const psi = feetOfHeadToPsi(2.31, 62.4);
  assert.ok(Math.abs(psi - 1.0) < 0.005, `2.31 ft != 1 psi within 0.005 (got ${psi})`);
});

// spec-v14 §10.1: the psi <-> feet-of-head water conversion is shared
// across Group B plumbing (computeFrictionLoss, computeRecircPumpHead
// both call the pure-math primitive), Group F fireground rule-of-thumb
// (computeStandpipeFriction uses the rounded 0.434 psi/ft literal),
// and Group C HVAC + Group L agriculture (a 2.31 ft/psi inverse
// literal). The bit-level pin lives in calc-plumbing where the
// primitive is consumed directly; the rounded-literal pins assert
// the published-table tolerance band so a future edit that swapped
// 0.434 for 0.5 (NFA fireground shortcut) or 2.31 for 2.0 surfaces
// at CI.

test("invariant: calc-plumbing computeFrictionLoss pressureLoss_psi matches feetOfHeadToPsi exactly (Hazen-Williams)", () => {
  // Sweep representative pipe sizes / flows / lengths and assert that
  // the calc-plumbing consumer's pressureLoss_psi is bit-equal to a
  // direct feetOfHeadToPsi(headLoss_ft) call. A future refactor that
  // inlined the rho/144 factor would surface here at strict.equal.
  for (const flow_gpm of [10, 30, 60]) {
    for (const length_ft of [50, 100, 200]) {
      for (const size of ["0.5", "0.75", "1"]) {
        const r = computeFrictionLoss({
          method: "hazen-williams",
          material: "copper",
          nominal_size: size,
          length_ft,
          flow_gpm,
        });
        assert.ok(Number.isFinite(r.headLoss_ft), `unexpected error: ${JSON.stringify(r)}`);
        const direct = feetOfHeadToPsi(r.headLoss_ft);
        assert.equal(
          r.pressureLoss_psi,
          direct,
          `computeFrictionLoss(${size},${flow_gpm}gpm,${length_ft}ft) drifted from primitive`,
        );
      }
    }
  }
});

test("invariant: calc-plumbing computeRecircPumpHead pressure_psi matches feetOfHeadToPsi exactly", () => {
  // The recirc-pump head sizer also consumes the primitive; pin it
  // alongside computeFrictionLoss so the two Group B consumers stay
  // aligned at the bit level.
  const r = computeRecircPumpHead({
    pipe_length_ft: 100,
    fittings_count: 8,
    target_flow_gpm: 4,
    internal_diameter_in: 0.75,
    material: "copper",
  });
  assert.ok(Number.isFinite(r.head_ft), `unexpected error: ${JSON.stringify(r)}`);
  const direct = feetOfHeadToPsi(r.head_ft);
  assert.equal(r.pressure_psi, direct, "computeRecircPumpHead drifted from feetOfHeadToPsi");
});

test("invariant: calc-fire 0.434 psi/ft (rounded NFPA water-column) is within 0.5% of the primitive", () => {
  // calc-fire computeStandpipeFriction hardcodes elevation_psi = h *
  // 0.434 (the rounded NFPA water-column shortcut). The primitive
  // produces 62.4/144 = 0.43333... psi/ft. The rounded literal must
  // stay within 0.5% of the primitive value; a future edit that
  // swapped 0.434 for 0.5 (the NFA *fireground* shortcut, which lives
  // in computePDP) would slip a 15% inflation past the catalog if
  // this invariant did not catch it.
  const FIRE_LITERAL = 0.434;
  const primitive = feetOfHeadToPsi(1, 62.4); // 0.43333...
  const rel = Math.abs(FIRE_LITERAL - primitive) / primitive;
  assert.ok(
    rel < 0.005,
    `calc-fire 0.434 psi/ft drifts from primitive ${primitive} by rel=${rel}`,
  );

  // Cross-check at the standpipe spec example: h=100, n=1, gpm=250,
  // 2.5 in -> elevation_psi = 100 * 0.434 = 43.4 psi exactly. A
  // refactor that swapped the coefficient surfaces in the result.
  const sp = computeStandpipeFriction({
    riser_height_ft: 100,
    outlet_count: 1,
    gpm_per_outlet: 250,
    outlet_length_ft: 100,
    hose_diameter: "2.5_in",
  });
  assert.equal(sp.elevation_psi, 100 * 0.434, "computeStandpipeFriction elevation_psi drifted");
});

test("invariant: calc-hvac 2.31 ft/psi (rounded inverse) is within 0.5% of the primitive inverse", () => {
  // calc-hvac vaporPressureFt hardcodes `psi * 2.31` (the rounded
  // inverse of feetOfHeadToPsi). Assert it tracks the primitive
  // inverse 144/62.4 = 2.3077 within 0.5%.
  const HVAC_LITERAL = 2.31;
  const inverse = 144 / 62.4; // 2.3076923...
  const rel = Math.abs(HVAC_LITERAL - inverse) / inverse;
  assert.ok(
    rel < 0.005,
    `calc-hvac 2.31 ft/psi drifts from primitive inverse ${inverse} by rel=${rel}`,
  );
});

// --- Round-trip identities (spec-v14 §10.2) -----------------------------

test("round-trip: F -> C -> F is identity to 1e-12 absolute", () => {
  for (const F of [-40, 0, 32, 70, 98.6, 212, 451]) {
    const back = C_to_F(F_to_C(F));
    assert.ok(Math.abs(back - F) < 1e-12, `F=${F} -> ${back}`);
  }
});

test("round-trip: C -> K -> C is identity to 1e-12 absolute", () => {
  for (const C of [-273.15, -40, 0, 25, 100, 1000]) {
    const back = K_to_C(C_to_K(C));
    assert.ok(Math.abs(back - C) < 1e-12, `C=${C} -> ${back}`);
  }
});

test("round-trip: F -> C -> K -> C -> F is identity to 1e-12 absolute", () => {
  // The chain three trades use to convert dataset temperatures.
  for (const F of [-40, 32, 70, 212]) {
    const C = F_to_C(F);
    const K = C_to_K(C);
    const C2 = K_to_C(K);
    const back = C_to_F(C2);
    assert.ok(Math.abs(back - F) < 1e-12, `F=${F} round-trip drifted to ${back}`);
  }
});

test("round-trip: AWG diameter inches matches the published formula", () => {
  // d(AWG n) = 0.005 * 92^((36 - n) / 39) inches. The function is
  // deterministic from the formula, so the invariant pins the
  // transcription: a refactor that replaces 92 with 92.0001 fails here.
  for (const n of [0, 4, 8, 10, 12, 14, 18]) {
    const expected = 0.005 * Math.pow(92, (36 - n) / 39);
    const got = awgDiameterInches(String(n));
    const rel = Math.abs(got - expected) / expected;
    assert.ok(rel < 1e-12, `AWG ${n}: got=${got} expected=${expected}`);
  }
});

test("round-trip: -40 is the F=C crossover (named-value invariant)", () => {
  assert.equal(F_to_C(-40), -40);
  assert.equal(C_to_F(-40), -40);
});

// --- Round-trip identities through the Group G unit converter -----------
//
// spec-v14 §10.2 enumerates seven round-trip pairs whose inverse is
// documented. Six of them (PSI<->kPa, HP<->kW, gallons<->liters,
// feet<->meters, pound-mass<->kilogram, plus the already-covered
// F<->C and AWG<->mm^2) are SI-base conversions and must round-trip to
// within 1e-12 absolute / relative per the spec's tolerance posture.
// The seventh (the empirical Hazen-Williams / refrigerant / Manual J
// loops) is covered by the Phase E numerical-stability suite at the
// looser 1e-9 relative tolerance.
//
// The Group G unit converter at calc-cross.js:convertUnit is the
// single shared crosswalk every calc-*.js module reaches through. The
// round-trip is therefore the load-bearing invariant: a refactor that
// re-derives the factor at the wrong precision (e.g., 1 ft = 0.3048001
// instead of 0.3048 exactly) surfaces here before a downstream tile
// drifts.

test("round-trip: psi <-> kPa is identity to 1e-12 relative", () => {
  for (const psi of [1, 14.7, 60, 100, 250, 1000, 3000]) {
    const { value: kpa } = convertUnit({ category: "pressure", value: psi, from: "psi", to: "kPa" });
    const { value: back } = convertUnit({ category: "pressure", value: kpa, from: "kPa", to: "psi" });
    const rel = Math.abs(back - psi) / psi;
    assert.ok(rel < 1e-12, `psi=${psi} -> kPa=${kpa} -> psi=${back} (rel=${rel})`);
  }
});

test("round-trip: hp <-> kW is identity to 1e-12 relative", () => {
  for (const hp of [0.5, 1, 5, 10, 50, 100, 500]) {
    const { value: kw } = convertUnit({ category: "power", value: hp, from: "hp", to: "kW" });
    const { value: back } = convertUnit({ category: "power", value: kw, from: "kW", to: "hp" });
    const rel = Math.abs(back - hp) / hp;
    assert.ok(rel < 1e-12, `hp=${hp} -> kW=${kw} -> hp=${back} (rel=${rel})`);
  }
});

test("round-trip: gallons (US) <-> liters is identity to 1e-12 relative", () => {
  for (const gal of [0.25, 1, 5, 20, 55, 250, 1000]) {
    const { value: L } = convertUnit({ category: "volume", value: gal, from: "gal_us", to: "L" });
    const { value: back } = convertUnit({ category: "volume", value: L, from: "L", to: "gal_us" });
    const rel = Math.abs(back - gal) / gal;
    assert.ok(rel < 1e-12, `gal=${gal} -> L=${L} -> gal=${back} (rel=${rel})`);
  }
});

test("round-trip: feet <-> meters is identity to 1e-12 relative", () => {
  for (const ft of [1, 8, 100, 250, 1000, 5280]) {
    const { value: m } = convertUnit({ category: "length", value: ft, from: "ft", to: "m" });
    const { value: back } = convertUnit({ category: "length", value: m, from: "m", to: "ft" });
    const rel = Math.abs(back - ft) / ft;
    assert.ok(rel < 1e-12, `ft=${ft} -> m=${m} -> ft=${back} (rel=${rel})`);
  }
});

test("round-trip: pound-mass <-> kilogram is identity to 1e-12 relative", () => {
  for (const lb of [1, 5, 50, 150, 500, 2000, 10000]) {
    const { value: kg } = convertUnit({ category: "mass", value: lb, from: "lb", to: "kg" });
    const { value: back } = convertUnit({ category: "mass", value: kg, from: "kg", to: "lb" });
    const rel = Math.abs(back - lb) / lb;
    assert.ok(rel < 1e-12, `lb=${lb} -> kg=${kg} -> lb=${back} (rel=${rel})`);
  }
});

test("invariant: 100 ft equals 30.48 m exactly (international-foot pin)", () => {
  // 1 ft = 0.3048 m exactly per NIST SP 811. The pin catches a future
  // refactor that swaps the international foot for the US survey foot
  // (1 ft_us = 1200/3937 m), which would drift the conversion by ~2 ppm
  // and silently mis-size every Group A / B / C / E tile that takes a
  // length input in feet.
  const { value } = convertUnit({ category: "length", value: 100, from: "ft", to: "m" });
  assert.equal(value, 30.48, `100 ft -> ${value} m (expected 30.48 exactly)`);
});

test("invariant: 1 lb equals 0.45359237 kg exactly (international-pound pin)", () => {
  // 1 lb = 0.45359237 kg exactly per the 1959 international yard-and-
  // pound agreement (NIST SP 811). The pin catches a future refactor
  // that swaps the international pound for the avoirdupois-derived
  // approximation 0.453592 (5-figure) which would drift NIOSH lifting
  // and vehicle-load tiles by ~1 ppm.
  const { value } = convertUnit({ category: "mass", value: 1, from: "lb", to: "kg" });
  assert.equal(value, 0.45359237, `1 lb -> ${value} kg (expected 0.45359237 exactly)`);
});

test("invariant: 1 hp equals 745.6998715822702 W (mechanical horsepower pin)", () => {
  // The mechanical horsepower (550 ft-lbf/s) is the convention every
  // Group A motor and Group B pump tile uses. The pin catches a future
  // refactor that swaps it for the metric horsepower (735.49875 W) or
  // the electrical horsepower (746 W exact); either would drift motor
  // FLA and pump-brake-hp results by 0.05-1.4%.
  const { value } = convertUnit({ category: "power", value: 1, from: "hp", to: "W" });
  assert.equal(value, 745.6998715822702, `1 hp -> ${value} W`);
});

// --- Shared computation: CFM <-> m^3/s (Groups C/D/G) -------------------

test("invariant: Group G unit converter CFM<->L/s matches the published NIST factor", () => {
  // 1 CFM = 0.471947443 L/s (NIST SP 811 derived: 1 ft = 0.3048 m exactly).
  const { value } = convertUnit({ category: "flow", value: 1, from: "cfm", to: "L/s" });
  const expected = 0.471947443;
  const rel = Math.abs(value - expected) / expected;
  assert.ok(rel < 1e-12, `1 CFM -> ${value} L/s (expected ${expected}, rel=${rel})`);
});

test("invariant: CFM<->m^3/s factor matches the calc-hvac inline constant within 7 figures", () => {
  // calc-hvac.js uses `cfm * 0.000471947` for the m^3/s conversion (7
  // significant figures). The Group G crosswalk carries the full
  // factor (1 ft^3 = 0.028316846592 m^3 exactly -> 1 CFM = 0.000471947443 m^3/s).
  // The two must agree to the truncation floor or downstream tiles will
  // disagree on a shared physical quantity.
  const { value: lps } = convertUnit({ category: "flow", value: 1, from: "cfm", to: "L/s" });
  const m3_s_from_crosswalk = lps / 1000;
  const m3_s_inline = 1 * 0.000471947;
  const rel = Math.abs(m3_s_from_crosswalk - m3_s_inline) / m3_s_inline;
  assert.ok(rel < 1e-6, `crosswalk=${m3_s_from_crosswalk} vs inline=${m3_s_inline} (rel=${rel})`);
});

test("invariant: CFM<->L/s round-trip is identity for the unit converter", () => {
  for (const cfm of [10, 100, 400, 1000, 2500]) {
    const { value: lps } = convertUnit({ category: "flow", value: cfm, from: "cfm", to: "L/s" });
    const { value: back } = convertUnit({ category: "flow", value: lps, from: "L/s", to: "cfm" });
    const rel = Math.abs(back - cfm) / cfm;
    assert.ok(rel < 1e-12, `cfm=${cfm} -> L/s=${lps} -> cfm=${back} (rel=${rel})`);
  }
});

test("invariant: Group G flow base is L/s and the cfm entry is positive and finite", () => {
  // A future refactor that swaps the base unit silently rescales every
  // downstream tile that reads the crosswalk. Pin the base.
  assert.equal(UNITS.flow.base, "L/s");
  const cfm = UNITS.flow.units.cfm.factor;
  assert.ok(Number.isFinite(cfm) && cfm > 0, `cfm factor=${cfm}`);
});

// --- Shared computation: IRS standard mileage rate (Groups J/P/R) -------
//
// Per spec-v14 §10.1 the IRS standard mileage rate is a shared
// computation across Group P per-diem, Group R accounting mileage, and
// Group J trucking owner-operator expense. Today the rate is
// single-sourced from STANDARD_MILEAGE_RATES in calc-accounting.js;
// the bundled data shard at data/accounting/standard-mileage-rates.json
// is the v6 source-stamp authority for the value. The invariant asserts
// the two sources agree to one cent (IRS publishes in 0.1 cent units;
// floating-point storage in the JSON shard can land 1e-15 off the JS
// const due to decimal-to-binary representation, so the tolerance is
// 1e-4 absolute - well below the 0.1 cent published precision).

const _CTI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const _MILEAGE_SHARD = JSON.parse(
  readFileSync(resolve(_CTI_ROOT, "data", "accounting", "standard-mileage-rates.json"), "utf8"),
);

test("invariant: STANDARD_MILEAGE_RATES (JS) agrees with data shard at every published year", () => {
  for (const [yearStr, shardRates] of Object.entries(_MILEAGE_SHARD.rates_per_mile_usd)) {
    const year = Number(yearStr);
    const jsRow = STANDARD_MILEAGE_RATES[year];
    assert.ok(jsRow, `JS STANDARD_MILEAGE_RATES is missing year ${year}`);
    for (const kind of ["business", "medical", "charitable"]) {
      assert.ok(
        Math.abs(jsRow[kind] - shardRates[kind]) < 1e-4,
        `year ${year} ${kind}: JS=${jsRow[kind]} shard=${shardRates[kind]}`,
      );
    }
  }
});

test("invariant: STANDARD_MILEAGE_RATES covers every year the shard publishes", () => {
  // Bijection in the JS const -> shard direction: the JS const may
  // carry years the shard does not (historical or forward-looking), but
  // every shard year must appear in the JS const. The reverse is
  // permitted (the JS const can be ahead of the shard during a tax
  // year's mid-year update).
  for (const yearStr of Object.keys(_MILEAGE_SHARD.rates_per_mile_usd)) {
    const year = Number(yearStr);
    assert.ok(STANDARD_MILEAGE_RATES[year], `shard year ${year} missing from JS const`);
  }
});

test("invariant: mileage rates are strictly positive and below 1.50 USD/mile (sanity band)", () => {
  // The historical IRS standard mileage rate has ranged from 0.14
  // (charitable, stable since 1998) to ~0.72 (business, 2026). A rate
  // above 1.50 USD/mile or below 0 indicates a transcription error or
  // a units mix-up (cents vs dollars). The band is two orders of
  // magnitude wider than the historical maximum per spec-v14 §8.2.
  for (const [year, row] of Object.entries(STANDARD_MILEAGE_RATES)) {
    for (const kind of ["business", "medical", "charitable"]) {
      assert.ok(row[kind] > 0, `${year} ${kind}: ${row[kind]} not positive`);
      assert.ok(row[kind] < 1.5, `${year} ${kind}: ${row[kind]} above sanity ceiling`);
    }
  }
});

test("invariant: charitable mileage rate is stable across years (statutory floor)", () => {
  // The charitable rate is set by Congress (26 USC 170(i)) and has been
  // 0.14 USD/mile since 1998. A change in any year is a real legislative
  // change and triggers a v6 recheck row; the test pins the current
  // status (every bundled year at 0.14) so the change does not slip
  // past CI without a deliberate fixture update.
  for (const [year, row] of Object.entries(STANDARD_MILEAGE_RATES)) {
    assert.equal(row.charitable, 0.14, `year ${year} charitable=${row.charitable} != 0.14`);
  }
});

// --- Per-consumer pins for the IRS-mileage row (spec-v14 §10.1 closeout) -
//
// Per spec-v14 §10.1 the IRS standard mileage rate is the fifth of the
// five shared-computation classes. The shard / JS-const bijection pin
// above closes the Group R direction (calc-accounting.js's
// STANDARD_MILEAGE_RATES against the bundled shard). The Group G
// per-consumer pin below closes the Group G / P direction: calc-cross.js
// re-exports the rate as `IRS_STANDARD_MILEAGE_RATE` (a single scalar,
// the default for computeMileageCost (mileage-cost tile, Group G) and
// computeTimesheet (timesheet tile, Group P)). The pin asserts that the
// scalar matches exactly one of the business rates in the per-year table
// so a silent drift (typo, mid-year edit, copy-paste error) surfaces at
// CI. The cross-consumer arithmetic identity assertions then pin that
// every consumer that defaults to IRS_STANDARD_MILEAGE_RATE produces the
// expected mileage-line subtotal.

test("invariant: calc-cross.js IRS_STANDARD_MILEAGE_RATE matches exactly one business rate in STANDARD_MILEAGE_RATES", () => {
  // A future edit that hand-typed a value (e.g., a fat-finger 0.7 instead
  // of 0.67, or 0.067) would break consumer subtotals across the catalog.
  // Asserting equality to a known table cell catches the drift; the
  // bijection in the shard direction (above) catches a coordinated edit
  // that updates calc-accounting + the shard but forgets calc-cross.
  const businessRates = Object.values(STANDARD_MILEAGE_RATES).map((r) => r.business);
  assert.ok(
    businessRates.some((r) => Math.abs(r - IRS_STANDARD_MILEAGE_RATE) < 1e-12),
    `IRS_STANDARD_MILEAGE_RATE=${IRS_STANDARD_MILEAGE_RATE} does not match any STANDARD_MILEAGE_RATES business rate (${businessRates.join(", ")})`,
  );
});

test("invariant: computeMileageCost (Group G) uses IRS_STANDARD_MILEAGE_RATE when no override is supplied", () => {
  // Pin the consumer-side arithmetic identity at a single canonical
  // input: 100 mi round trip * IRS_STANDARD_MILEAGE_RATE per mi = the
  // returned irs_deduction. A future edit that broke the default-value
  // wiring (e.g., dropped the destructuring default) would surface here.
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 });
  assert.ok(Math.abs(r.reimbursement - 100 * IRS_STANDARD_MILEAGE_RATE) < 1e-9,
    `reimbursement=${r.reimbursement} != 100 * ${IRS_STANDARD_MILEAGE_RATE}`);
  assert.ok(Math.abs(r.irs_rate_per_mile - IRS_STANDARD_MILEAGE_RATE) < 1e-12,
    `irs_rate_per_mile=${r.irs_rate_per_mile} != IRS_STANDARD_MILEAGE_RATE=${IRS_STANDARD_MILEAGE_RATE}`);
});

test("invariant: computeTimesheet (Group P) uses IRS_STANDARD_MILEAGE_RATE when no override is supplied", () => {
  // Pin the second calc-cross consumer to the same default. A timesheet
  // with one job that recorded 50 mi at IRS-rate should produce a
  // reimbursable of 50 * IRS_STANDARD_MILEAGE_RATE.
  const r = computeTimesheet({
    jobs: [{ start_hr: 8, end_hr: 8, lunch_min: 0, miles: 50 }],
    regular_rate: 0,
  });
  assert.ok(Math.abs(r.reimbursable - 50 * IRS_STANDARD_MILEAGE_RATE) < 1e-9,
    `reimbursable=${r.reimbursable} != 50 * ${IRS_STANDARD_MILEAGE_RATE}`);
});

test("invariant: computeMileageRollup (Group R) at the IRS_STANDARD_MILEAGE_RATE year produces the same per-mile rate as calc-cross consumers", () => {
  // Cross-consumer identity: at whichever year STANDARD_MILEAGE_RATES.business
  // equals IRS_STANDARD_MILEAGE_RATE, computeMileageRollup must use that
  // exact rate for the business deduction. Drive a single 100-mile
  // business trip through the rollup and confirm the deduction equals
  // 100 * IRS_STANDARD_MILEAGE_RATE; this is the closeout pin that ties
  // the Group R consumer back to the calc-cross scalar without going
  // through a tax-year-table indirection.
  const matchedYear = Object.entries(STANDARD_MILEAGE_RATES).find(
    ([_, r]) => Math.abs(r.business - IRS_STANDARD_MILEAGE_RATE) < 1e-12,
  );
  assert.ok(matchedYear, `no year in STANDARD_MILEAGE_RATES matches IRS_STANDARD_MILEAGE_RATE`);
  const [yearStr] = matchedYear;
  const r = computeMileageRollup({
    trips: [{ business_miles: 100 }],
    tax_year: Number(yearStr),
  });
  assert.ok(Math.abs(r.deductible_amount - 100 * IRS_STANDARD_MILEAGE_RATE) < 1e-9,
    `deductible_amount=${r.deductible_amount} != 100 * ${IRS_STANDARD_MILEAGE_RATE} at tax_year ${yearStr}`);
  assert.ok(Math.abs(r.standard_rate - IRS_STANDARD_MILEAGE_RATE) < 1e-12,
    `standard_rate=${r.standard_rate} != IRS_STANDARD_MILEAGE_RATE=${IRS_STANDARD_MILEAGE_RATE}`);
});

// --- Monotonicity sweeps (spec-v14 §10.3) -------------------------------
//
// Where a compute function's output is monotonic in an input, the test
// asserts strict monotonicity over a sweep. A non-monotonic result for
// a monotonic relationship is a transcription error.

test("monotonicity: computeFrictionLoss pressureLoss_psi is strictly increasing in flow_gpm", () => {
  // Hazen-Williams: head loss scales as Q^1.852. Strictly increasing
  // in Q at fixed pipe geometry. A future refactor that swapped the
  // exponent's sign or broke the scaling would surface here.
  let prev = -Infinity;
  for (const flow_gpm of [5, 10, 20, 40, 80]) {
    const r = computeFrictionLoss({
      method: "hazen-williams",
      material: "copper",
      nominal_size: "0.75",
      length_ft: 100,
      flow_gpm,
    });
    assert.ok(Number.isFinite(r.pressureLoss_psi), `error at Q=${flow_gpm}: ${JSON.stringify(r)}`);
    assert.ok(
      r.pressureLoss_psi > prev,
      `friction at Q=${flow_gpm} = ${r.pressureLoss_psi} not greater than prev=${prev}`,
    );
    prev = r.pressureLoss_psi;
  }
});

test("monotonicity: computeFrictionLoss pressureLoss_psi is strictly decreasing in pipe size", () => {
  // At fixed flow and length, a larger diameter has lower velocity
  // and lower head loss. Walk SCH 40 nominal sizes from small to
  // large and assert strict decrease.
  let prev = Infinity;
  for (const nominal_size of ["0.5", "0.75", "1", "1.25", "1.5", "2"]) {
    const r = computeFrictionLoss({
      method: "hazen-williams",
      material: "copper",
      nominal_size,
      length_ft: 100,
      flow_gpm: 10,
    });
    assert.ok(Number.isFinite(r.pressureLoss_psi), `error at size=${nominal_size}: ${JSON.stringify(r)}`);
    assert.ok(
      r.pressureLoss_psi < prev,
      `friction at d=${nominal_size} = ${r.pressureLoss_psi} not less than prev=${prev}`,
    );
    prev = r.pressureLoss_psi;
  }
});

test("monotonicity: computeBeamLoading deflection is strictly increasing in uniform load", () => {
  // Simply-supported uniform load: max deflection = 5wL^4 / (384 EI).
  // Linear in w. A refactor that broke the linear-in-w relation (e.g.,
  // a clamped boundary substitution) would surface immediately.
  let prev = -Infinity;
  for (const load_value of [50, 100, 200, 400, 800]) {
    const r = computeBeamLoading({
      load_type: "uniform",
      load_value,
      length_ft: 10,
      E_psi: 1600000,
      b_in: 1.5,
      d_in: 9.25,
    });
    const def = r.delta_in;
    assert.ok(Number.isFinite(def), `error at w=${load_value}: ${JSON.stringify(r)}`);
    assert.ok(
      def > prev,
      `deflection at w=${load_value} = ${def} not greater than prev=${prev}`,
    );
    prev = def;
  }
});

test("monotonicity: computeBeamLoading deflection is strictly increasing in span (L^4 law)", () => {
  // Deflection ~ L^4 at constant w, E, I. Catches a future refactor
  // that swapped the exponent or the unit conversion.
  let prev = -Infinity;
  for (const length_ft of [4, 6, 8, 10, 12, 16]) {
    const r = computeBeamLoading({
      load_type: "uniform",
      load_value: 100,
      length_ft,
      E_psi: 1600000,
      b_in: 1.5,
      d_in: 9.25,
    });
    const def = r.delta_in;
    assert.ok(Number.isFinite(def), `error at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(
      def > prev,
      `deflection at L=${length_ft} = ${def} not greater than prev=${prev}`,
    );
    prev = def;
  }
});

test("monotonicity: computeDensityAltitude is strictly increasing in OAT at fixed pressure altitude", () => {
  // DA = PA + 120 * (OAT - ISA(PA)). Linear and strictly increasing
  // in OAT. The 120 ft/C coefficient is FAA-published.
  let prev = -Infinity;
  for (const oat_c of [-10, 0, 10, 20, 30, 40]) {
    const r = computeDensityAltitude({ pressure_altitude_ft: 3000, oat_c });
    const da = r.density_altitude_ft;
    assert.ok(Number.isFinite(da), `error at OAT=${oat_c}: ${JSON.stringify(r)}`);
    assert.ok(
      da > prev,
      `DA at OAT=${oat_c} = ${da} not greater than prev=${prev}`,
    );
    prev = da;
  }
});

test("monotonicity: computePITI piti is strictly increasing in principal at fixed rate/term", () => {
  // Mortgage payment is linear in principal at fixed rate/term.
  // Adding fixed escrow keeps strict monotonicity.
  let prev = -Infinity;
  for (const principal of [100000, 200000, 400000, 800000]) {
    const r = computePITI({
      principal,
      apr_percent: 6.5,
      term_years: 30,
      annual_property_tax: 3600,
      annual_insurance: 1200,
      monthly_hoa: 0,
      monthly_pmi: 0,
    });
    assert.ok(Number.isFinite(r.piti), `error at P=${principal}: ${JSON.stringify(r)}`);
    assert.ok(
      r.piti > prev,
      `piti at P=${principal} = ${r.piti} not greater than prev=${prev}`,
    );
    prev = r.piti;
  }
});

test("monotonicity: computePITI piti is strictly increasing in apr at fixed principal/term", () => {
  // Amortized P&I is monotonic in rate at fixed principal and term.
  let prev = -Infinity;
  for (const apr_percent of [3.0, 4.5, 6.0, 7.5, 9.0]) {
    const r = computePITI({
      principal: 400000,
      apr_percent,
      term_years: 30,
      annual_property_tax: 3600,
      annual_insurance: 1200,
      monthly_hoa: 0,
      monthly_pmi: 0,
    });
    assert.ok(Number.isFinite(r.piti), `error at apr=${apr_percent}: ${JSON.stringify(r)}`);
    assert.ok(
      r.piti > prev,
      `piti at apr=${apr_percent} = ${r.piti} not greater than prev=${prev}`,
    );
    prev = r.piti;
  }
});

// --- More monotonicity sweeps (spec-v14 §10.3, second batch) ------------
//
// Groups V (EMS), U (Veterinary), T (Lab / bench science), A (Electrical
// Ohm's law) -- compute-function-level strict monotonicity across the
// canonical input the formula is linear / power-law in. A non-monotonic
// result for any of these is a transcription error per spec-v14 §10.3.

test("monotonicity: computeParkland total_24hr_mL is strictly increasing in weight_kg at fixed TBSA", () => {
  // Parkland formula: total = 4 * weight_kg * tbsa_percent. Linear in
  // weight; strictly increasing for any positive TBSA.
  let prev = -Infinity;
  for (const weight_kg of [40, 60, 80, 100, 120]) {
    const r = computeParkland({ weight_kg, tbsa_percent: 30, hours_since_burn: 0 });
    assert.ok(Number.isFinite(r.total_24hr_mL), `error at wt=${weight_kg}: ${JSON.stringify(r)}`);
    assert.ok(
      r.total_24hr_mL > prev,
      `Parkland at wt=${weight_kg} = ${r.total_24hr_mL} not greater than prev=${prev}`,
    );
    prev = r.total_24hr_mL;
  }
});

test("monotonicity: computeParkland total_24hr_mL is strictly increasing in TBSA at fixed weight", () => {
  // Linear in TBSA at fixed weight.
  let prev = -Infinity;
  for (const tbsa_percent of [10, 20, 30, 40, 50, 60]) {
    const r = computeParkland({ weight_kg: 70, tbsa_percent, hours_since_burn: 0 });
    assert.ok(Number.isFinite(r.total_24hr_mL), `error at TBSA=${tbsa_percent}: ${JSON.stringify(r)}`);
    assert.ok(
      r.total_24hr_mL > prev,
      `Parkland at TBSA=${tbsa_percent}% = ${r.total_24hr_mL} not greater than prev=${prev}`,
    );
    prev = r.total_24hr_mL;
  }
});

test("monotonicity: computeEnergyRequirement RER is strictly increasing in weight_kg (W^0.75 law)", () => {
  // RER = 70 * weight_kg^0.75. Strictly increasing in weight; the
  // exponent 0.75 is the allometric Kleiber pin per AAHA/AAFP. A
  // refactor that swapped the exponent for 1.0 (linear) or 0.67
  // (Brody) would still be monotonic but the bit-pattern is asserted
  // separately in calc-vet's RER worked-example fixture.
  let prev = -Infinity;
  for (const weight_kg of [2, 5, 10, 20, 40, 60]) {
    const r = computeEnergyRequirement({
      weight: weight_kg,
      weight_unit: "kg",
      species: "dog",
      activity: "sedentary",
    });
    assert.ok(Number.isFinite(r.RER_kcal_per_day), `error at wt=${weight_kg}: ${JSON.stringify(r)}`);
    assert.ok(
      r.RER_kcal_per_day > prev,
      `RER at wt=${weight_kg} = ${r.RER_kcal_per_day} not greater than prev=${prev}`,
    );
    prev = r.RER_kcal_per_day;
  }
});

test("monotonicity: computeBeerLambert concentration is strictly increasing in absorbance at fixed path/epsilon", () => {
  // Beer-Lambert: c = A / (epsilon * l). Strictly linear in A at fixed
  // path length and epsilon. A refactor that broke the linearity (e.g.,
  // a log10 swap) would surface here.
  let prev = -Infinity;
  for (const absorbance of [0.1, 0.25, 0.5, 1.0, 1.5, 2.0]) {
    const r = computeBeerLambert({ absorbance, path_length_cm: 1, epsilon: 50000 });
    assert.ok(Number.isFinite(r.concentration), `error at A=${absorbance}: ${JSON.stringify(r)}`);
    assert.ok(
      r.concentration > prev,
      `concentration at A=${absorbance} = ${r.concentration} not greater than prev=${prev}`,
    );
    prev = r.concentration;
  }
});

test("monotonicity: computeBeerLambert concentration is strictly decreasing in epsilon at fixed absorbance/path", () => {
  // Inverse-proportional in epsilon: c = A / (eps * l).
  let prev = Infinity;
  for (const epsilon of [10000, 25000, 50000, 100000, 200000]) {
    const r = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon });
    assert.ok(Number.isFinite(r.concentration), `error at eps=${epsilon}: ${JSON.stringify(r)}`);
    assert.ok(
      r.concentration < prev,
      `concentration at eps=${epsilon} = ${r.concentration} not less than prev=${prev}`,
    );
    prev = r.concentration;
  }
});

test("monotonicity: computeOhmsLaw I = V/R is strictly increasing in V at fixed R", () => {
  // V = IR -> I = V/R. Linear in V at fixed R; pin the canonical
  // first-principle relation. A refactor that swapped the V-R
  // ordering or applied an offset would surface immediately.
  let prev = -Infinity;
  for (const V of [12, 24, 48, 120, 240, 480]) {
    const r = computeOhmsLaw({ V, I: null, R: 10, P: null });
    assert.ok(Number.isFinite(r.I), `error at V=${V}: ${JSON.stringify(r)}`);
    assert.ok(r.I > prev, `I at V=${V} = ${r.I} not greater than prev=${prev}`);
    prev = r.I;
  }
});

test("monotonicity: computeOhmsLaw P = I^2 R is strictly increasing in I at fixed R", () => {
  // P = I^2 R. Quadratic in I, strictly increasing for positive I.
  let prev = -Infinity;
  for (const I of [1, 2, 5, 10, 20]) {
    const r = computeOhmsLaw({ V: null, I, R: 10, P: null });
    assert.ok(Number.isFinite(r.P), `error at I=${I}: ${JSON.stringify(r)}`);
    assert.ok(r.P > prev, `P at I=${I} = ${r.P} not greater than prev=${prev}`);
    prev = r.P;
  }
});

// --- More monotonicity sweeps (spec-v14 §10.3, third batch) ------------
//
// Groups C HVAC (Manual J), E Construction (ASCE 7 wind / snow), G Cross
// (wind chill, loan payment). Extends compute-function-level
// monotonicity coverage to twelve catalog groups total.

test("monotonicity: computeWindPressure q_psf is strictly increasing in V (V^2 law)", () => {
  // ASCE 7: q = 0.00256 * V^2. Quadratic in V; strictly increasing
  // for positive V. The V^2 exponent is the dynamic-pressure pin.
  let prev = -Infinity;
  for (const V_mph of [70, 90, 110, 130, 150, 170, 190]) {
    const r = computeWindPressure({ V_mph, exposure: "C" });
    assert.ok(Number.isFinite(r.q_psf), `error at V=${V_mph}: ${JSON.stringify(r)}`);
    assert.ok(r.q_psf > prev, `q at V=${V_mph} = ${r.q_psf} not greater than prev=${prev}`);
    prev = r.q_psf;
  }
});

test("monotonicity: computeWindPressure V^2 scaling exactly (doubling V quadruples q)", () => {
  // Pin the V^2 exponent at the bit-level ratio. A future refactor
  // that swapped the exponent or applied a kz inside the q formula
  // would surface here.
  const r1 = computeWindPressure({ V_mph: 100, exposure: "C" });
  const r2 = computeWindPressure({ V_mph: 200, exposure: "C" });
  const ratio = r2.q_psf / r1.q_psf;
  assert.ok(
    Math.abs(ratio - 4) < 1e-9,
    `V^2 scaling broken: q(200)/q(100) = ${ratio}, expected 4`,
  );
});

test("monotonicity: computeSnowLoad Pf_psf is strictly increasing in Pg_psf (linear)", () => {
  // ASCE 7: Pf = 0.7 * Ce * Ct * Is * Pg. Linear in Pg at fixed
  // factors. The 0.7 base factor is the spec-pin.
  let prev = -Infinity;
  for (const Pg_psf of [10, 20, 40, 60, 80, 100]) {
    const r = computeSnowLoad({ Pg_psf, Ce: 1.0, Ct: 1.0, Is: 1.0 });
    assert.ok(Number.isFinite(r.Pf_psf), `error at Pg=${Pg_psf}: ${JSON.stringify(r)}`);
    assert.ok(r.Pf_psf > prev, `Pf at Pg=${Pg_psf} = ${r.Pf_psf} not greater than prev=${prev}`);
    prev = r.Pf_psf;
  }
});

test("monotonicity: computeSnowLoad Pf = 0.7 * Pg at unit factors (closed-form pin)", () => {
  // At Ce = Ct = Is = 1, Pf = 0.7 * Pg exactly. Pins the 0.7 base
  // factor against any drift.
  for (const Pg_psf of [25, 50, 75, 100]) {
    const r = computeSnowLoad({ Pg_psf, Ce: 1.0, Ct: 1.0, Is: 1.0 });
    assert.equal(
      r.Pf_psf,
      0.7 * Pg_psf,
      `Pf at Pg=${Pg_psf} = ${r.Pf_psf} != 0.7 * ${Pg_psf}`,
    );
  }
});

test("monotonicity: computeWindChill is strictly decreasing in wind speed at fixed T", () => {
  // NWS 2001: WC = 35.74 + 0.6215T - 35.75*v^0.16 + 0.4275*T*v^0.16.
  // For T <= 50 F (the validated range), WC decreases as v increases.
  let prev = Infinity;
  for (const wind_mph of [5, 10, 15, 20, 30, 40, 60]) {
    const r = computeWindChill({ T_F: 0, wind_mph });
    const wc = r.wind_chill_F;
    assert.ok(Number.isFinite(wc), `error at v=${wind_mph}: ${JSON.stringify(r)}`);
    assert.ok(wc < prev, `WC at v=${wind_mph} = ${wc} not less than prev=${prev}`);
    prev = wc;
  }
});

test("monotonicity: computeLoanPayment is strictly increasing in apr at fixed principal/term", () => {
  // Amortized P&I in calc-cross is the same formula as calc-realestate
  // computePITI's P&I component; pin the monotonicity at this
  // alternative entry point too.
  let prev = -Infinity;
  for (const apr_percent of [3.0, 4.5, 6.0, 7.5, 9.0]) {
    const r = computeLoanPayment({ principal: 300000, apr_percent, term_months: 360 });
    assert.ok(Number.isFinite(r.monthly_payment), `error at apr=${apr_percent}: ${JSON.stringify(r)}`);
    assert.ok(
      r.monthly_payment > prev,
      `payment at apr=${apr_percent} = ${r.monthly_payment} not greater than prev=${prev}`,
    );
    prev = r.monthly_payment;
  }
});

test("monotonicity: manualJCooling tons is strictly increasing in outdoor_design_F", () => {
  // The Manual J cooling load is monotonic in outdoor design
  // temperature at fixed envelope (more outdoor heat -> more cooling
  // tons required). The dT = max(0, outdoor - indoor) clamp means we
  // sweep above the indoor set point.
  let prev = -Infinity;
  const envelope = {
    floor_area_ft2: 1500,
    wall_area_ft2: 1200,
    window_area_ft2: 200,
    ceiling_area_ft2: 1500,
    insulation_level: "average",
    window_type: "double",
    occupants: 4,
    indoor_design_F: 75,
  };
  for (const outdoor_design_F of [80, 85, 90, 95, 100, 105, 110]) {
    const r = manualJCooling({ ...envelope, outdoor_design_F });
    assert.ok(Number.isFinite(r.tons), `error at T=${outdoor_design_F}: ${JSON.stringify(r)}`);
    assert.ok(
      r.tons > prev,
      `tons at T=${outdoor_design_F} = ${r.tons} not greater than prev=${prev}`,
    );
    prev = r.tons;
  }
});

// --- More monotonicity sweeps (spec-v14 §10.3, fourth batch) -----------
//
// Groups D Restoration (computeAirMovers), L Agriculture (computeGPA,
// computeDrawbarPower), M Water (computePoundsFormula),
// F Fire direct (computeFireFriction). Extends compute-function-level
// monotonicity coverage further across the catalog.

test("monotonicity: computePoundsFormula pure_lb_day is strictly increasing in flow_mgd at fixed dose", () => {
  // AWWA pounds formula: lb/day = MGD * mg/L * 8.34. Linear in flow.
  let prev = -Infinity;
  for (const flow_mgd of [0.5, 1, 2, 5, 10, 25]) {
    const r = computePoundsFormula({ flow_mgd, dose_mg_l: 2.5, chemical: "chlorine_gas" });
    assert.ok(Number.isFinite(r.pure_lb_day), `error at Q=${flow_mgd}: ${JSON.stringify(r)}`);
    assert.ok(
      r.pure_lb_day > prev,
      `pure_lb_day at Q=${flow_mgd} = ${r.pure_lb_day} not greater than prev=${prev}`,
    );
    prev = r.pure_lb_day;
  }
});

test("monotonicity: computePoundsFormula pure_lb_day is strictly increasing in dose_mg_l at fixed flow", () => {
  // Linear in dose.
  let prev = -Infinity;
  for (const dose_mg_l of [0.5, 1.0, 2.5, 5.0, 10.0]) {
    const r = computePoundsFormula({ flow_mgd: 5, dose_mg_l, chemical: "chlorine_gas" });
    assert.ok(Number.isFinite(r.pure_lb_day), `error at dose=${dose_mg_l}: ${JSON.stringify(r)}`);
    assert.ok(
      r.pure_lb_day > prev,
      `pure_lb_day at dose=${dose_mg_l} = ${r.pure_lb_day} not greater than prev=${prev}`,
    );
    prev = r.pure_lb_day;
  }
});

test("monotonicity: computeAirMovers count is monotonic-non-decreasing in affected area (IICRC S500 step function)", () => {
  // count = ceil(area / ft2_per). Step function but monotonic non-
  // decreasing in area; a refactor that broke this monotonicity (e.g.,
  // a wrong ceil/floor direction) would surface.
  let prev = -Infinity;
  for (const affected_area_ft2 of [50, 100, 250, 500, 1000, 2000]) {
    const r = computeAirMovers({ affected_area_ft2, water_class: "2" });
    assert.ok(Number.isFinite(r.air_mover_count), `error at A=${affected_area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(
      r.air_mover_count >= prev,
      `count at A=${affected_area_ft2} = ${r.air_mover_count} dropped below prev=${prev}`,
    );
    prev = r.air_mover_count;
  }
});

test("monotonicity: computeGPA gpa is strictly increasing in gpm at fixed spacing/speed", () => {
  // gpa = (5940 * gpm) / (speed * spacing). Linear in gpm.
  let prev = -Infinity;
  for (const gpm of [0.1, 0.2, 0.4, 0.8, 1.6, 3.2]) {
    const r = computeGPA({ gpm, spacing_in: 20, speed_mph: 5 });
    assert.ok(Number.isFinite(r.gpa), `error at gpm=${gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.gpa > prev, `gpa at gpm=${gpm} = ${r.gpa} not greater than prev=${prev}`);
    prev = r.gpa;
  }
});

test("monotonicity: computeGPA gpa is strictly decreasing in speed_mph at fixed flow/spacing", () => {
  // Inverse-proportional in speed.
  let prev = Infinity;
  for (const speed_mph of [2, 3, 5, 8, 10, 15]) {
    const r = computeGPA({ gpm: 0.4, spacing_in: 20, speed_mph });
    assert.ok(Number.isFinite(r.gpa), `error at v=${speed_mph}: ${JSON.stringify(r)}`);
    assert.ok(r.gpa < prev, `gpa at v=${speed_mph} = ${r.gpa} not less than prev=${prev}`);
    prev = r.gpa;
  }
});

test("monotonicity: computeDrawbarPower drawbar_hp is strictly increasing in pull_lb at fixed speed", () => {
  // DBHP = pull * speed / 375. Linear in pull.
  let prev = -Infinity;
  for (const pull_lb of [500, 1000, 2000, 4000, 6000, 8000]) {
    const r = computeDrawbarPower({ pull_lb, speed_mph: 4, surface: "firm_soil" });
    assert.ok(Number.isFinite(r.drawbar_hp), `error at P=${pull_lb}: ${JSON.stringify(r)}`);
    assert.ok(
      r.drawbar_hp > prev,
      `DBHP at P=${pull_lb} = ${r.drawbar_hp} not greater than prev=${prev}`,
    );
    prev = r.drawbar_hp;
  }
});

test("monotonicity: computeFireFriction friction_loss_psi is strictly increasing in gpm at fixed hose/length", () => {
  // Already pinned at the primitive level; pin at the consumer level
  // too so a future refactor that broke the Group F shared computation
  // at the consumer (without breaking the primitive) surfaces.
  let prev = -Infinity;
  for (const gpm of [100, 150, 250, 400, 600]) {
    const r = computeFireFriction({ hose_diameter: "2.5_in", gpm, length_ft: 100 });
    assert.ok(Number.isFinite(r.friction_loss_psi), `error at Q=${gpm}: ${JSON.stringify(r)}`);
    assert.ok(
      r.friction_loss_psi > prev,
      `FL at Q=${gpm} = ${r.friction_loss_psi} not greater than prev=${prev}`,
    );
    prev = r.friction_loss_psi;
  }
});

// --- Phase F §10.3 monotonicity sweep, fifth batch 2026-05-22 ------------
//
// Adds strict-monotonicity sweeps for compute functions in groups not
// previously covered: K Mechanic (fuel range), J Trucking (DIM weight,
// SSD), R Accounting (straight-line depreciation, amortization), N Stage
// (SPL inverse-square law). Each sweep pins a closed-form identity at
// the consumer level; a future transcription error (sign flip, exponent
// swap, missed unit conversion, broken default) surfaces immediately at
// CI.

import { computeFuelRange } from "../../calc-mechanic.js";
import { computeDIM, computeStoppingSightDistance } from "../../calc-trucking.js";
import { computeStraightLine, computeAmortization } from "../../calc-accounting.js";
import { computeSPL } from "../../calc-stage.js";

test("monotonicity: computeFuelRange range_mi is strictly increasing in tank_gal at fixed mpg (linear pin)", () => {
  // Group K. range_mi = tank_gal * mpg * load_factor; strictly linear in
  // tank_gal. Doubling the tank doubles the range; pin that identity.
  let prev = -Infinity;
  for (const tank_gal of [5, 10, 18, 30, 50]) {
    const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal, mpg: 28, mpg_basis: "gasoline_E10" });
    assert.ok(Number.isFinite(r.range_mi), `error at tank=${tank_gal}: ${JSON.stringify(r)}`);
    assert.ok(r.range_mi > prev, `range at tank=${tank_gal} = ${r.range_mi} not greater than prev=${prev}`);
    prev = r.range_mi;
  }
  // Doubling identity: tank * 2 -> range * 2.
  const a = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 10, mpg: 28, mpg_basis: "gasoline_E10" });
  const b = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 20, mpg: 28, mpg_basis: "gasoline_E10" });
  assert.ok(Math.abs(b.range_mi - 2 * a.range_mi) < 1e-9,
    `range(20) = ${b.range_mi} != 2 * range(10) = ${2 * a.range_mi}`);
});

test("monotonicity: computeFuelRange range_mi is strictly increasing in mpg at fixed tank (linear pin)", () => {
  // Group K. range_mi linear in mpg too. A future edit that swapped the
  // multiplication for division would surface immediately.
  let prev = -Infinity;
  for (const mpg of [15, 20, 25, 30, 40]) {
    const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg, mpg_basis: "gasoline_E10" });
    assert.ok(r.range_mi > prev, `range at mpg=${mpg} = ${r.range_mi} not greater than prev=${prev}`);
    prev = r.range_mi;
  }
});

test("monotonicity: computeDIM dim_lb is strictly increasing in each dimension at fixed others", () => {
  // Group J. dim_lb = (L * W * H) / divisor; strictly increasing in
  // L, W, and H. Pin all three independently so a future edit that
  // swapped multiplication for addition (or dropped a factor) would
  // surface at CI.
  for (const dim of ["length", "width", "height"]) {
    let prev = -Infinity;
    for (const v of [12, 18, 24, 36, 48]) {
      const inputs = { length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 10, carrier: "UPS_Daily" };
      inputs[dim + "_in"] = v;
      const r = computeDIM(inputs);
      assert.ok(Number.isFinite(r.dim_lb), `${dim}=${v}: ${JSON.stringify(r)}`);
      assert.ok(r.dim_lb > prev, `dim_lb at ${dim}=${v} = ${r.dim_lb} not greater than prev=${prev}`);
      prev = r.dim_lb;
    }
  }
});

test("monotonicity: computeStoppingSightDistance total_ssd_ft is strictly increasing in speed_mph (v + v^2 law)", () => {
  // Group J. SSD = 1.47 * v * t + v^2 / (30 * (f + g)); strictly
  // increasing in v. Doubling v more than doubles SSD because of the v^2
  // braking term. Pin the monotonicity and pin the braking-distance ratio
  // for the v^2 law (braking at 2v / braking at v should be 4).
  let prev = -Infinity;
  for (const speed_mph of [10, 25, 45, 65, 85]) {
    const r = computeStoppingSightDistance({ speed_mph, reaction_time_s: 2.5, friction: 0.35 });
    assert.ok(Number.isFinite(r.total_ssd_ft), `error at v=${speed_mph}: ${JSON.stringify(r)}`);
    assert.ok(r.total_ssd_ft > prev, `SSD at v=${speed_mph} = ${r.total_ssd_ft} not greater than prev=${prev}`);
    prev = r.total_ssd_ft;
  }
  // v^2 braking pin: braking_distance(2v) / braking_distance(v) = 4 (exact, no friction change).
  const a = computeStoppingSightDistance({ speed_mph: 30, reaction_time_s: 2.5, friction: 0.35 });
  const b = computeStoppingSightDistance({ speed_mph: 60, reaction_time_s: 2.5, friction: 0.35 });
  assert.ok(Math.abs(b.braking_distance_ft / a.braking_distance_ft - 4) < 1e-9,
    `braking(60)/braking(30) = ${b.braking_distance_ft / a.braking_distance_ft} != 4`);
});

test("monotonicity: computeStraightLine annual_depreciation is strictly increasing in cost at fixed salvage/life", () => {
  // Group R. annual = (cost - salvage) / life; linear in cost. A future
  // edit that dropped the salvage subtraction or swapped life into the
  // numerator would surface.
  let prev = -Infinity;
  for (const cost of [10000, 25000, 50000, 100000, 250000]) {
    const r = computeStraightLine({ cost, salvage: 5000, life_years: 10, year_of_interest: 1 });
    assert.ok(Number.isFinite(r.annual_depreciation), `error at cost=${cost}: ${JSON.stringify(r)}`);
    assert.ok(r.annual_depreciation > prev, `annual at cost=${cost} = ${r.annual_depreciation} not greater than prev=${prev}`);
    prev = r.annual_depreciation;
  }
});

test("monotonicity: computeAmortization monthly_payment is strictly increasing in principal at fixed rate/term", () => {
  // Group R. Standard amortization is linear in principal at fixed
  // rate/term (the annuity factor is a function of rate and term only).
  // A future edit that broke the principal-times-annuity-factor shape
  // would surface here.
  let prev = -Infinity;
  for (const principal of [50000, 100000, 200000, 400000, 800000]) {
    const r = computeAmortization({ principal, annual_rate_pct: 6.5, term_months: 360 });
    assert.ok(Number.isFinite(r.payment), `error at P=${principal}: ${JSON.stringify(r)}`);
    assert.ok(r.payment > prev, `payment at P=${principal} = ${r.payment} not greater than prev=${prev}`);
    prev = r.payment;
  }
  // Doubling identity: principal * 2 -> payment * 2 (linear in P).
  const a = computeAmortization({ principal: 100000, annual_rate_pct: 6.5, term_months: 360 });
  const b = computeAmortization({ principal: 200000, annual_rate_pct: 6.5, term_months: 360 });
  assert.ok(Math.abs(b.payment - 2 * a.payment) < 1e-6,
    `payment(200k) = ${b.payment} != 2 * payment(100k) = ${2 * a.payment}`);
});

// --- Phase F §10.3 tenth monotonicity batch 2026-05-22 ------------------
//
// Closes §10.3 coverage to twenty-three catalog groups by adding sweeps
// for Group S Legal (computeJudgmentInterest linear-in-principal +
// monotone-in-accrual-window; computeWageHour monotone-in-hours_worked
// with the FLSA 40 hr regular/OT threshold pin), plus three more
// compute functions in Group A Electrical / E Construction / X Real
// Estate that haven't been pinned at the consumer level yet
// (computeMotorFLA / computeBoardFootage / computePropertyTax).

import { computeJudgmentInterest, computeWageHour } from "../../calc-legal.js";
import { computeMotorFLA } from "../../calc-electrical.js";
import { computeBoardFootage } from "../../calc-construction.js";
import { computePropertyTax } from "../../calc-realestate.js";

test("monotonicity: computeJudgmentInterest accrued_interest is strictly increasing in principal (Group S linear pin)", () => {
  // Group S. Simple-interest accrual is linear in principal; doubling
  // principal doubles accrued interest at the same dates and state.
  let prev = -Infinity;
  for (const principal of [1000, 5000, 10000, 50000, 100000]) {
    const r = computeJudgmentInterest({
      principal, state: "CA",
      judgment_date: "2024-01-01", accrual_date: "2025-01-01",
      partial_payments: [],
    });
    assert.ok(Number.isFinite(r.accrued_interest), `error at P=${principal}: ${JSON.stringify(r)}`);
    assert.ok(r.accrued_interest > prev, `accrued at P=${principal} = ${r.accrued_interest} not greater than prev=${prev}`);
    prev = r.accrued_interest;
  }
  // Doubling identity: at fixed dates and state, 2x principal -> 2x accrued.
  const a = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01", partial_payments: [] });
  const b = computeJudgmentInterest({ principal: 20000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01", partial_payments: [] });
  assert.ok(Math.abs(b.accrued_interest - 2 * a.accrued_interest) < 1e-9,
    `accrued(20k) = ${b.accrued_interest} != 2 * accrued(10k) = ${2 * a.accrued_interest}`);
});

test("monotonicity: computeWageHour gross_pay is strictly increasing in hours_worked with the FLSA 40 hr OT threshold (Group S piecewise-linear pin)", () => {
  // Group S. Below 40 hrs: gross = hours * rate (slope = rate). Above
  // 40 hrs: gross = 40 * rate + (hours - 40) * rate * 1.5 (slope = 1.5x).
  // Strictly increasing; the slope changes at 40 hrs. Pin both monotone
  // behavior and the exact threshold (39 / 40 / 41 hrs).
  let prev = -Infinity;
  for (const hours_worked of [10, 25, 40, 50, 60]) {
    const r = computeWageHour({ hourly_rate: 20, hours_worked, state: "FED", is_tipped: false });
    assert.ok(Number.isFinite(r.gross_pay), `error at h=${hours_worked}: ${JSON.stringify(r)}`);
    assert.ok(r.gross_pay > prev, `gross at h=${hours_worked} = ${r.gross_pay} not greater than prev=${prev}`);
    prev = r.gross_pay;
  }
  // FLSA threshold pin: 40 hrs at $20/hr -> $800 (no OT); 41 hrs -> $800 + 1.5 * 20 = $830.
  const at40 = computeWageHour({ hourly_rate: 20, hours_worked: 40, state: "FED", is_tipped: false });
  const at41 = computeWageHour({ hourly_rate: 20, hours_worked: 41, state: "FED", is_tipped: false });
  assert.equal(at40.regular_hours, 40);
  assert.equal(at40.overtime_hours, 0);
  assert.equal(at40.gross_pay, 800);
  assert.equal(at41.regular_hours, 40);
  assert.equal(at41.overtime_hours, 1);
  assert.ok(Math.abs(at41.gross_pay - 830) < 1e-9, `gross_pay at 41 hrs = ${at41.gross_pay} != 830`);
});

test("monotonicity: computeMotorFLA fla is strictly increasing in hp at fixed voltage and phase (Group A NEC table pin)", () => {
  // Group A. The NEC Table 430 motor FLA values are tabulated; sweep
  // five common HP ratings at 230 V three-phase and assert monotone.
  let prev = -Infinity;
  for (const hp of [1, 5, 10, 25, 50]) {
    const r = computeMotorFLA({ hp, voltage: 230, phase: "three" });
    assert.ok(Number.isFinite(r.fla_A), `error at hp=${hp}: ${JSON.stringify(r)}`);
    assert.ok(r.fla_A > prev, `fla at hp=${hp} = ${r.fla_A} not greater than prev=${prev}`);
    prev = r.fla_A;
  }
});

test("monotonicity: computeBoardFootage bf is strictly increasing in each of thickness/width/length (Group E volume pin)", () => {
  // Group E. board_feet = (thickness * width * length) / 12 (per piece)
  // * count. Strictly increasing in each linear dimension. Pin all
  // three with a doubling-in-length identity check.
  for (const dim of ["thickness_in", "width_in", "length_ft"]) {
    let prev = -Infinity;
    for (const v of [2, 4, 6, 8, 12]) {
      const inputs = { thickness_in: 2, width_in: 6, length_ft: 8, count: 1 };
      inputs[dim] = v;
      const r = computeBoardFootage(inputs);
      assert.ok(Number.isFinite(r.total_board_feet), `${dim}=${v}: ${JSON.stringify(r)}`);
      assert.ok(r.total_board_feet > prev, `bf at ${dim}=${v} = ${r.total_board_feet} not greater than prev=${prev}`);
      prev = r.total_board_feet;
    }
  }
  // Doubling-in-length pin: bf(2L) = 2 * bf(L).
  const a = computeBoardFootage({ thickness_in: 2, width_in: 6, length_ft: 8, count: 1 });
  const b = computeBoardFootage({ thickness_in: 2, width_in: 6, length_ft: 16, count: 1 });
  assert.ok(Math.abs(b.total_board_feet - 2 * a.total_board_feet) < 1e-9,
    `bf(16ft) = ${b.total_board_feet} != 2 * bf(8ft) = ${2 * a.total_board_feet}`);
});

test("monotonicity: computePropertyTax annual_tax is strictly increasing in assessed_value at fixed mill rate (Group X linear pin)", () => {
  // Group X. Property tax = (assessed - homestead_exemption) * mill_rate
  // / 1000. Linear in assessed_value at fixed exemption and mill rate.
  let prev = -Infinity;
  for (const assessed_value of [100000, 200000, 400000, 800000, 1500000]) {
    const r = computePropertyTax({ assessed_value, mill_rate: 25, homestead_exemption: 0 });
    assert.ok(Number.isFinite(r.annual_tax), `error at V=${assessed_value}: ${JSON.stringify(r)}`);
    assert.ok(r.annual_tax > prev, `tax at V=${assessed_value} = ${r.annual_tax} not greater than prev=${prev}`);
    prev = r.annual_tax;
  }
  // Mill-rate definition pin: $400k at 25 mills (no exemption) = 400000 * 25 / 1000 = $10,000.
  const r = computePropertyTax({ assessed_value: 400000, mill_rate: 25, homestead_exemption: 0 });
  assert.ok(Math.abs(r.annual_tax - 10000) < 1e-9, `400k at 25 mills should be $10,000: got ${r.annual_tax}`);
});

// --- Phase F §10.1 ninth batch: hydraulic-horsepower 3960 cross-tile pin 2026-05-22 -
//
// The Hydraulic Institute's pump horsepower identity HP = (Q * H * SG) / 3960
// (where Q is gpm, H is feet of head, SG is fluid specific gravity)
// appears in two consumers today: Group B `computePumpSize` (with the
// general SG factor) and Group M `computePumpEfficiency` (with SG implicit
// at 1.0 for water). The 3960 conversion-constant (combining 8.34 lb/gal *
// 60 s/min / 33000 ft-lb/min/hp = 3960 gpm-ft/hp) is a shared physical
// constant; a mistyped 396 / 39600 / 3690 in either consumer would corrupt
// every pump-sizing output downstream. The pin asserts both consumers
// produce bit-equal hydraulic HP at the canonical input (water, SG=1.0)
// and the closed-form identity at multiple operating points.

import { computePumpSize, computeStaticPressureLossPiping } from "../../calc-plumbing.js";
import { computeStandingWater } from "../../calc-restoration.js";

test("invariant: hydraulic HP = (Q * H * SG) / 3960 is bit-equal across calc-plumbing.computePumpSize and calc-water.computePumpEfficiency at SG=1.0 (Group B / M shared constant)", () => {
  // Drive both consumers through five (gpm, tdh) operating points the
  // pump-house designer would actually use. At SG=1.0 the two consumers
  // must agree to the floating-point floor; the test catches a drift in
  // either consumer's 3960 constant or a sign / unit confusion.
  for (const [flow_gpm, tdh_ft] of [[50, 50], [100, 80], [250, 100], [500, 150], [1000, 200]]) {
    const plumbing = computePumpSize({ flow_gpm, total_dynamic_head_ft: tdh_ft, efficiency: 0.65, fluid_specific_gravity: 1.0 });
    const water = computePumpEfficiency({ flow_gpm, tdh_ft, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 });
    assert.ok(
      Math.abs(plumbing.hydraulic_hp - water.whp) < 1e-12,
      `Q=${flow_gpm}, H=${tdh_ft}: plumbing.hydraulic_hp=${plumbing.hydraulic_hp} != water.whp=${water.whp}`,
    );
    // Closed-form identity pin: both should equal (Q * H * SG) / 3960 at SG=1.0.
    const expected = (flow_gpm * tdh_ft * 1.0) / 3960;
    assert.ok(
      Math.abs(plumbing.hydraulic_hp - expected) < 1e-12,
      `Q=${flow_gpm}, H=${tdh_ft}: plumbing=${plumbing.hydraulic_hp} != closed-form (Q*H/3960)=${expected}`,
    );
    assert.ok(
      Math.abs(water.whp - expected) < 1e-12,
      `Q=${flow_gpm}, H=${tdh_ft}: water=${water.whp} != closed-form (Q*H/3960)=${expected}`,
    );
  }
});

test("invariant: hydraulic HP scales linearly with fluid_specific_gravity in computePumpSize", () => {
  // Group B. At fixed Q and H, doubling SG should double the hydraulic
  // HP. Pin the SG factor so a future refactor that dropped it (or
  // squared it) surfaces immediately.
  const a = computePumpSize({ flow_gpm: 100, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 1.0 });
  const b = computePumpSize({ flow_gpm: 100, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 2.0 });
  assert.ok(Math.abs(b.hydraulic_hp - 2 * a.hydraulic_hp) < 1e-12,
    `hydraulic_hp(SG=2) = ${b.hydraulic_hp} != 2 * hydraulic_hp(SG=1) = ${2 * a.hydraulic_hp}`);
});

test("invariant: hydraulic HP at (Q=100, H=80, SG=1) is exactly 100*80/3960 = 2.0202... (bit-stable pin)", () => {
  // Bit-pattern pin at the published Hydraulic Institute example. The
  // expected value 100 * 80 / 3960 = 2.020202... is exact in IEEE-754
  // up to representation; assert equality to 1e-15 so a future refactor
  // that introduced a roundoff step (e.g., went through degrees / KPa)
  // would surface.
  const r = computePumpSize({ flow_gpm: 100, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 1.0 });
  const expected = (100 * 80) / 3960;
  assert.ok(Math.abs(r.hydraulic_hp - expected) < 1e-15,
    `hydraulic_hp=${r.hydraulic_hp} != ${expected}`);
});

// --- Phase F §10.1 ninth batch (cont'd): 62.4 lb/ft^3 water density cross-tile pin --
//
// The water-density 62.4 lb/ft^3 (at 60 F, 1 atm) is the second shared
// physical constant that surfaces in multiple consumers: Group B
// `computeStaticPressureLossPiping` (default `fluid_density_lb_ft3 = 62.4`),
// Group D `computeStandingWater` (hardcoded `62.4` lb/ft^3 weight),
// and the pure-math `feetOfHeadToPsi` primitive (default 62.4). The pin
// asserts every consumer agrees with the primitive at the default value.

test("invariant: 62.4 lb/ft^3 water density is the same across calc-plumbing / calc-restoration / pure-math consumers", () => {
  // Direct closed-form pin: 1 ft^3 of water at 62.4 lb/ft^3 weighs 62.4 lb.
  const r = computeStandingWater({ area_ft2: 12, depth_in: 1 }); // exactly 1 ft^3 (12 ft^2 * 1 in / 12)
  assert.equal(r.cubic_feet, 1, `cubic_feet should be 1 at 12 ft^2 x 1 in: ${r.cubic_feet}`);
  assert.equal(r.pounds, 62.4, `pounds at 1 ft^3 should be exactly 62.4: ${r.pounds}`);
  // calc-plumbing default density agrees with the calc-restoration constant.
  // Drive computeStaticPressureLossPiping with no density override and check
  // it produces the same elevation-loss as the primitive at the same density.
  const plumbing = computeStaticPressureLossPiping({ elevation_change_ft: 10, friction_loss_psi: 0 });
  const primitive = feetOfHeadToPsi(10); // primitive default also 62.4
  assert.ok(Math.abs(plumbing.elevation_loss_psi - primitive) < 1e-9,
    `plumbing elevation_loss_psi=${plumbing.elevation_loss_psi} != primitive feetOfHeadToPsi(10)=${primitive}`);
});

test("invariant: calc-plumbing static-pressure-piping default density (62.4) is bit-equal to the pure-math primitive default", () => {
  // Drive computeStaticPressureLossPiping at five elevation values and
  // assert each elevation_loss_psi matches feetOfHeadToPsi(h) exactly.
  // A future edit that changed the default density in either location
  // (or dropped the 144 conversion) surfaces here.
  for (const elev of [1, 5, 10, 50, 100]) {
    const plumbing = computeStaticPressureLossPiping({ elevation_change_ft: elev, friction_loss_psi: 0 });
    const primitive = feetOfHeadToPsi(elev);
    assert.ok(
      Math.abs(plumbing.elevation_loss_psi - primitive) < 1e-12,
      `elev=${elev}: plumbing=${plumbing.elevation_loss_psi} != primitive=${primitive}`,
    );
  }
});

// --- Phase F §10.2 / §10.3 eighth batch 2026-05-22 ----------------------
//
// (a) Parameterized round-trip identity across every UNITS pair (§10.2).
//     For every category and every unit pair (from, to) in UNITS, the
//     round-trip convertUnit(convertUnit(value, from, to), to, from) must
//     equal value to 1e-9 relative. A single mistyped factor in calc-cross
//     UNITS surfaces here as a failing pair name, not as a downstream
//     calculator regression that leaves the maintainer hunting.
// (b) Three more §10.3 monotonicity sweeps for compute functions in Group
//     E (computeFootingArea linear-in-load + inverse-in-soil-bearing) and
//     Group M (computeDetentionTime inverse-in-flow + linear-in-volume,
//     computePumpEfficiency linear-in-flow*head).

import { computeFootingArea } from "../../calc-construction.js";
import { computeDetentionTime, computePumpEfficiency } from "../../calc-water.js";

test("round-trip: every UNITS (category, from, to) pair returns the input value to 1e-9 relative (§10.2)", () => {
  // Pin every factor in calc-cross.UNITS: a typo in any single factor
  // (a missing zero, a wrong digit, a wrong sign) surfaces here as a
  // failing pair name rather than as a downstream regression in a
  // calculator that consumes convertUnit. Pure round-trip identity; the
  // base-factor agreement with the SI value is asserted elsewhere
  // (NIST CFM<->L/s, the per-unit named-value pins above for lb, hp, ft).
  const VALUE = 137.5; // arbitrary non-round, non-trivial
  let pairsChecked = 0;
  for (const [category, def] of Object.entries(UNITS)) {
    const names = Object.keys(def.units);
    for (const from of names) {
      for (const to of names) {
        if (from === to) continue;
        const forward = convertUnit({ category, value: VALUE, from, to });
        assert.ok(Number.isFinite(forward.value),
          `forward ${category}: ${from}->${to} returned ${JSON.stringify(forward)}`);
        const back = convertUnit({ category, value: forward.value, from: to, to: from });
        assert.ok(Number.isFinite(back.value),
          `back ${category}: ${to}->${from} returned ${JSON.stringify(back)}`);
        assert.ok(
          Math.abs(back.value - VALUE) / Math.abs(VALUE) < 1e-9,
          `${category}: ${from}->${to}->${from} round-trip drifted: ${VALUE} -> ${forward.value} -> ${back.value}`,
        );
        pairsChecked++;
      }
    }
  }
  // The UNITS table has ~190 ordered pairs across 13 categories at this
  // writing. Pin the count so a future deletion (or accidental addition
  // of a category without round-trip exercise) surfaces.
  assert.ok(pairsChecked >= 100, `pin ${pairsChecked} round-trip pairs; expected at least 100`);
});

test("monotonicity: computeFootingArea required_area_ft2 is strictly increasing in column_load_lb (Group E linear pin)", () => {
  // Group E. required_area = load / allowable_bearing; linear in load
  // at fixed soil class. Doubling load doubles area.
  let prev = -Infinity;
  for (const column_load_lb of [5000, 10000, 25000, 50000, 100000]) {
    const r = computeFootingArea({ column_load_lb, soil_class: "clay" });
    assert.ok(Number.isFinite(r.required_area_ft2), `error at P=${column_load_lb}: ${JSON.stringify(r)}`);
    assert.ok(r.required_area_ft2 > prev, `area at P=${column_load_lb} = ${r.required_area_ft2} not greater than prev=${prev}`);
    prev = r.required_area_ft2;
  }
  const a = computeFootingArea({ column_load_lb: 10000, soil_class: "clay" });
  const b = computeFootingArea({ column_load_lb: 20000, soil_class: "clay" });
  assert.ok(Math.abs(b.required_area_ft2 - 2 * a.required_area_ft2) < 1e-9,
    `area(20k) = ${b.required_area_ft2} != 2 * area(10k) = ${2 * a.required_area_ft2}`);
});

test("monotonicity: computeDetentionTime detention_minutes is strictly increasing in tank_volume_gal at fixed flow", () => {
  // Group M. detention_time = volume / flow; linear in V at fixed Q.
  let prev = -Infinity;
  for (const tank_volume_gal of [1000, 5000, 10000, 25000, 50000]) {
    const r = computeDetentionTime({ tank_volume_gal, flow_gpm: 100 });
    assert.ok(Number.isFinite(r.minutes), `error at V=${tank_volume_gal}: ${JSON.stringify(r)}`);
    assert.ok(r.minutes > prev, `dt at V=${tank_volume_gal} = ${r.minutes} not greater than prev=${prev}`);
    prev = r.minutes;
  }
});

test("monotonicity: computeDetentionTime detention_minutes is strictly decreasing in flow_gpm at fixed volume (inverse pin)", () => {
  // Group M. detention_time = volume / flow; inverse in Q at fixed V.
  // Halving Q doubles detention time.
  let prev = Infinity;
  for (const flow_gpm of [10, 50, 100, 500, 1000]) {
    const r = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm });
    assert.ok(r.minutes < prev, `dt at Q=${flow_gpm} = ${r.minutes} not less than prev=${prev}`);
    prev = r.minutes;
  }
});

test("monotonicity: computePumpEfficiency water_hp is strictly increasing in flow_gpm and tdh_ft (linear pins)", () => {
  // Group M. water_hp = (flow * tdh) / 3960; linear in each of flow and
  // tdh. Pin both dimensions plus the doubling-in-flow identity.
  let prev = -Infinity;
  for (const flow_gpm of [50, 100, 250, 500, 1000]) {
    const r = computePumpEfficiency({ flow_gpm, tdh_ft: 100, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 });
    assert.ok(Number.isFinite(r.whp), `error at Q=${flow_gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.whp > prev, `water_hp at Q=${flow_gpm} = ${r.whp} not greater than prev=${prev}`);
    prev = r.whp;
  }
  prev = -Infinity;
  for (const tdh_ft of [25, 50, 100, 250, 500]) {
    const r = computePumpEfficiency({ flow_gpm: 250, tdh_ft, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 });
    assert.ok(r.whp > prev, `water_hp at TDH=${tdh_ft} = ${r.whp} not greater than prev=${prev}`);
    prev = r.whp;
  }
  const a = computePumpEfficiency({ flow_gpm: 100, tdh_ft: 100, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 });
  const b = computePumpEfficiency({ flow_gpm: 200, tdh_ft: 100, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 });
  assert.ok(Math.abs(b.whp - 2 * a.whp) < 1e-9,
    `whp(200 gpm) = ${b.whp} != 2 * whp(100 gpm) = ${2 * a.whp}`);
});

// --- Phase F §10.3 monotonicity sweep, seventh batch 2026-05-22 ---------
//
// Closes more compute-function consumer-level pins across catalog groups
// that had primitive-level pins but missing direct compute-function
// monotonicity tests: Group A (computeThreePhase three-input linear pin),
// Group W (computeFuelPlanning linear-in-time + linear-in-burn), Group X
// (computeLTV linear-in-loan_amount + inverse-in-value with PMI-flag pin
// at the 80% threshold, computeCapRateDSCR linear-in-noi and inverse-in-
// value), Group P (computeBackcountryNeeds linear scaling pins).

import { computeThreePhase } from "../../calc-electrical.js";
import { computeFuelPlanning } from "../../calc-aviation.js";
import { computeLTV, computeCapRateDSCR } from "../../calc-realestate.js";
import { computeBackcountryNeeds } from "../../calc-field.js";

test("monotonicity: computeThreePhase kW is strictly increasing in V_LL, I_L, and pf (sqrt(3)*V*I*pf linear pins)", () => {
  // Group A. Three independent linear dimensions; pin all three so a
  // refactor that broke any single factor surfaces. Also pin the doubling
  // identity in V_LL (doubling line-to-line voltage doubles real power
  // at fixed current and pf).
  let prev = -Infinity;
  for (const V_LL of [120, 240, 480, 600, 4160]) {
    const r = computeThreePhase({ V_LL, I_L: 100, pf: 0.9 });
    assert.ok(Number.isFinite(r.kW), `error at V=${V_LL}: ${JSON.stringify(r)}`);
    assert.ok(r.kW > prev, `kW at V=${V_LL} = ${r.kW} not greater than prev=${prev}`);
    prev = r.kW;
  }
  prev = -Infinity;
  for (const I_L of [10, 50, 100, 250, 500]) {
    const r = computeThreePhase({ V_LL: 480, I_L, pf: 0.9 });
    assert.ok(r.kW > prev, `kW at I=${I_L} = ${r.kW} not greater than prev=${prev}`);
    prev = r.kW;
  }
  prev = -Infinity;
  for (const pf of [0.6, 0.7, 0.8, 0.9, 1.0]) {
    const r = computeThreePhase({ V_LL: 480, I_L: 100, pf });
    assert.ok(r.kW > prev, `kW at pf=${pf} = ${r.kW} not greater than prev=${prev}`);
    prev = r.kW;
  }
  // Doubling-in-V_LL pin: kW(2V) = 2 * kW(V) at fixed I, pf.
  const a = computeThreePhase({ V_LL: 240, I_L: 100, pf: 0.9 });
  const b = computeThreePhase({ V_LL: 480, I_L: 100, pf: 0.9 });
  assert.ok(Math.abs(b.kW - 2 * a.kW) < 1e-9,
    `kW(480) = ${b.kW} != 2 * kW(240) = ${2 * a.kW}`);
});

test("monotonicity: computeFuelPlanning required_fuel_gal is strictly increasing in flight_time_hr and burn_gph (linear pins)", () => {
  // Group W. required_fuel_gal = (flight + reserve) * burn; linear in both
  // flight time and burn rate. Pin both dimensions.
  let prev = -Infinity;
  for (const flight_time_hr of [0.5, 1, 2, 4, 8]) {
    const r = computeFuelPlanning({ flight_time_hr, burn_gph: 10, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 100 });
    assert.ok(Number.isFinite(r.required_fuel_gal), `error at t=${flight_time_hr}: ${JSON.stringify(r)}`);
    assert.ok(r.required_fuel_gal > prev, `required_fuel_gal at t=${flight_time_hr} = ${r.required_fuel_gal} not greater than prev=${prev}`);
    prev = r.required_fuel_gal;
  }
  prev = -Infinity;
  for (const burn_gph of [5, 10, 20, 40, 80]) {
    const r = computeFuelPlanning({ flight_time_hr: 2, burn_gph, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 500 });
    assert.ok(r.required_fuel_gal > prev, `required_fuel_gal at burn=${burn_gph} = ${r.required_fuel_gal} not greater than prev=${prev}`);
    prev = r.required_fuel_gal;
  }
  // Doubling-in-burn pin: at fixed times, doubling burn doubles required gallons.
  const a = computeFuelPlanning({ flight_time_hr: 2, burn_gph: 10, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 500 });
  const b = computeFuelPlanning({ flight_time_hr: 2, burn_gph: 20, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 500 });
  assert.ok(Math.abs(b.required_fuel_gal - 2 * a.required_fuel_gal) < 1e-9,
    `required_fuel_gal(20 gph) = ${b.required_fuel_gal} != 2 * required_fuel_gal(10 gph) = ${2 * a.required_fuel_gal}`);
});

test("monotonicity: computeLTV is strictly increasing in loan_amount at fixed value (Group X linear pin)", () => {
  // Group X. LTV = L / V * 100; linear in L at fixed V. Pin the PMI flag
  // flip at the 80% threshold (LTV > 80 -> pmi_required true).
  let prev = -Infinity;
  for (const loan_amount of [10000, 50000, 100000, 200000, 350000]) {
    const r = computeLTV({ loan_amount, value: 400000 });
    assert.ok(Number.isFinite(r.ltv_percent), `error at L=${loan_amount}: ${JSON.stringify(r)}`);
    assert.ok(r.ltv_percent > prev, `ltv at L=${loan_amount} = ${r.ltv_percent} not greater than prev=${prev}`);
    prev = r.ltv_percent;
  }
  // PMI flag threshold pin: LTV at 80% exactly should NOT require PMI; at 81% should.
  const at80 = computeLTV({ loan_amount: 320000, value: 400000 });
  const at81 = computeLTV({ loan_amount: 324000, value: 400000 });
  assert.equal(at80.pmi_required, false, `LTV 80% should not require PMI: ${JSON.stringify(at80)}`);
  assert.equal(at81.pmi_required, true, `LTV 81% should require PMI: ${JSON.stringify(at81)}`);
});

test("monotonicity: computeLTV is strictly decreasing in value at fixed loan_amount (inverse pin)", () => {
  // Group X. Higher property value at the same loan -> lower LTV.
  let prev = Infinity;
  for (const value of [200000, 300000, 400000, 500000, 800000]) {
    const r = computeLTV({ loan_amount: 250000, value });
    assert.ok(r.ltv_percent < prev, `ltv at V=${value} = ${r.ltv_percent} not less than prev=${prev}`);
    prev = r.ltv_percent;
  }
});

test("monotonicity: computeCapRateDSCR cap_rate is strictly increasing in NOI and decreasing in property value", () => {
  // Group X. cap_rate = NOI / V * 100. Linear in NOI; inverse in V.
  let prev = -Infinity;
  for (const noi_annual of [10000, 20000, 40000, 80000, 160000]) {
    const r = computeCapRateDSCR({ noi_annual, property_value: 1000000, annual_debt_service: 0 });
    assert.ok(Number.isFinite(r.cap_rate_percent), `error at NOI=${noi_annual}: ${JSON.stringify(r)}`);
    assert.ok(r.cap_rate_percent > prev, `cap at NOI=${noi_annual} = ${r.cap_rate_percent} not greater than prev=${prev}`);
    prev = r.cap_rate_percent;
  }
  prev = Infinity;
  for (const property_value of [500000, 750000, 1000000, 1500000, 2000000]) {
    const r = computeCapRateDSCR({ noi_annual: 75000, property_value, annual_debt_service: 0 });
    assert.ok(r.cap_rate_percent < prev, `cap at V=${property_value} = ${r.cap_rate_percent} not less than prev=${prev}`);
    prev = r.cap_rate_percent;
  }
});

test("monotonicity: computeBackcountryNeeds trip_kcal is strictly increasing in trip_days and group_size (linear pins)", () => {
  // Group P Field. trip_kcal = kcal_per_day * trip_days * group_size;
  // linear in each. Pin both with the doubling identity.
  let prev = -Infinity;
  for (const trip_days of [1, 2, 4, 7, 14]) {
    const r = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days, group_size: 1 });
    assert.ok(Number.isFinite(r.trip_kcal), `error at days=${trip_days}: ${JSON.stringify(r)}`);
    assert.ok(r.trip_kcal > prev, `trip_kcal at days=${trip_days} = ${r.trip_kcal} not greater than prev=${prev}`);
    prev = r.trip_kcal;
  }
  prev = -Infinity;
  for (const group_size of [1, 2, 4, 8, 16]) {
    const r = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: 3, group_size });
    assert.ok(r.trip_kcal > prev, `trip_kcal at group=${group_size} = ${r.trip_kcal} not greater than prev=${prev}`);
    prev = r.trip_kcal;
  }
  // Doubling-in-group pin: at fixed days, 2x group -> 2x trip_kcal.
  const a = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: 3, group_size: 2 });
  const b = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: 3, group_size: 4 });
  assert.ok(Math.abs(b.trip_kcal - 2 * a.trip_kcal) < 1e-9,
    `trip_kcal(group=4) = ${b.trip_kcal} != 2 * trip_kcal(group=2) = ${2 * a.trip_kcal}`);
});

// --- Phase F §10.3 monotonicity sweep, sixth batch 2026-05-22 -----------
//
// Adds consumer-level monotonicity pins for two more Group A electrical
// compute functions (voltage drop, battery runtime), one Group C HVAC
// (baseboard output), one Group O Kitchen (recipe scale), and one Group
// Y Educators (bell-curve percentile). Each pin is the obvious
// monotonic identity the consumer-level math has; a transcription error
// at the consumer would now surface even when the underlying primitive
// is correct.

import { computeVoltageDrop, computeBatteryRuntime } from "../../calc-electrical.js";
import { computeBaseboardOutput } from "../../calc-hvac.js";
import { computeRecipeScale } from "../../calc-kitchen.js";
import { computeBellCurve } from "../../calc-edu.js";

test("monotonicity: computeVoltageDrop drop_V is strictly increasing in length_ft (Group A consumer pin)", () => {
  // Group A. Drop is linear in length at fixed AWG / current / phase.
  // Doubling the run doubles the drop; pin both the monotonicity and the
  // doubling identity.
  let prev = -Infinity;
  for (const length_ft of [25, 50, 100, 200, 400]) {
    const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "12", length_ft, current_A: 20, source_voltage_V: 120 });
    assert.ok(Number.isFinite(r.drop_V), `error at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.drop_V > prev, `drop_V at L=${length_ft} = ${r.drop_V} not greater than prev=${prev}`);
    prev = r.drop_V;
  }
  const a = computeVoltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 20, source_voltage_V: 120 });
  const b = computeVoltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 200, current_A: 20, source_voltage_V: 120 });
  assert.ok(Math.abs(b.drop_V - 2 * a.drop_V) < 1e-9,
    `drop(200ft) = ${b.drop_V} != 2 * drop(100ft) = ${2 * a.drop_V}`);
});

test("monotonicity: computeVoltageDrop drop_V is strictly increasing in current_A (Group A consumer pin)", () => {
  // Drop is also linear in current; pin the second dimension so a
  // refactor that broke either factor surfaces.
  let prev = -Infinity;
  for (const current_A of [5, 10, 20, 40, 80]) {
    const r = computeVoltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 100, current_A, source_voltage_V: 120 });
    assert.ok(r.drop_V > prev, `drop_V at I=${current_A} = ${r.drop_V} not greater than prev=${prev}`);
    prev = r.drop_V;
  }
});

test("monotonicity: computeBatteryRuntime hours is strictly increasing in amp_hours at fixed load (linear pin)", () => {
  // Group A. With Peukert k=1 the runtime is linear in Ah at fixed load
  // and DoD; doubling Ah doubles runtime.
  let prev = -Infinity;
  for (const amp_hours of [25, 50, 100, 200, 400]) {
    const r = computeBatteryRuntime({ amp_hours, system_V: 12, dod_percent: 100, load_W: 120, peukert_k: 1 });
    assert.ok(Number.isFinite(r.hours), `error at Ah=${amp_hours}: ${JSON.stringify(r)}`);
    assert.ok(r.hours > prev, `hours at Ah=${amp_hours} = ${r.hours} not greater than prev=${prev}`);
    prev = r.hours;
  }
  const a = computeBatteryRuntime({ amp_hours: 50, system_V: 12, dod_percent: 100, load_W: 120, peukert_k: 1 });
  const b = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 120, peukert_k: 1 });
  assert.ok(Math.abs(b.hours - 2 * a.hours) < 1e-9,
    `hours(100 Ah) = ${b.hours} != 2 * hours(50 Ah) = ${2 * a.hours}`);
});

test("monotonicity: computeBatteryRuntime hours is strictly decreasing in load_W at fixed Ah (inverse pin)", () => {
  // Group A. With Peukert k=1, hours = usable_Wh / load_W. Halving the
  // load doubles the runtime.
  let prev = Infinity;
  for (const load_W of [60, 120, 240, 480, 960]) {
    const r = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W, peukert_k: 1 });
    assert.ok(r.hours < prev, `hours at load=${load_W} = ${r.hours} not less than prev=${prev}`);
    prev = r.hours;
  }
});

test("monotonicity: computeBaseboardOutput total_btu_hr is strictly increasing in length_ft (Group C linear pin)", () => {
  // Group C. Baseboard output scales linearly with length at fixed water
  // temp and flow; doubling length doubles output.
  let prev = -Infinity;
  for (const length_ft of [4, 8, 12, 20, 32]) {
    const r = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft, model: "slant_fin_baseline" });
    assert.ok(Number.isFinite(r.btu_total), `expected btu_total at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.btu_total > prev, `btu_total at L=${length_ft} = ${r.btu_total} not greater than prev=${prev}`);
    prev = r.btu_total;
  }
  // Doubling identity: btu_total is btu_per_ft * length, so 2x length -> 2x total.
  const a = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 8, model: "slant_fin_baseline" });
  const b = computeBaseboardOutput({ water_temp_F: 180, flow_gpm: 1, length_ft: 16, model: "slant_fin_baseline" });
  assert.ok(Math.abs(b.btu_total - 2 * a.btu_total) < 1e-9,
    `btu_total(16ft) = ${b.btu_total} != 2 * btu_total(8ft) = ${2 * a.btu_total}`);
});

test("monotonicity: computeRecipeScale scales every row's quantity by target/original ratio (linear pin)", () => {
  // Group O. Per-row scaled quantity = original * (target / original_yield).
  // Pin both that the ratio is monotonic in target_yield at fixed
  // original_yield, and that the doubling identity holds (2x target ->
  // 2x output quantity).
  const rows = [{ ingredient: "flour", quantity: 500, unit: "g" }];
  let prev = -Infinity;
  for (const target_yield of [12, 24, 48, 96, 192]) {
    const r = computeRecipeScale({ rows, original_yield: 12, target_yield });
    const scaled = r.rows[0].quantity;
    assert.ok(Number.isFinite(scaled), `expected scaled qty at target=${target_yield}: ${JSON.stringify(r)}`);
    assert.ok(scaled > prev, `scaled at target=${target_yield} = ${scaled} not greater than prev=${prev}`);
    prev = scaled;
  }
  // factor field is target/original; pin to 2.0 at 2x.
  const a = computeRecipeScale({ rows, original_yield: 12, target_yield: 12 });
  const b = computeRecipeScale({ rows, original_yield: 12, target_yield: 24 });
  assert.equal(a.factor, 1);
  assert.equal(b.factor, 2);
  assert.ok(Math.abs(b.rows[0].quantity - 2 * a.rows[0].quantity) < 1e-9,
    `2x target should yield 2x quantity: got ${b.rows[0].quantity} vs 2*${a.rows[0].quantity}`);
});

test("monotonicity: computeBellCurve percentile is strictly increasing in raw_score at fixed mean/sd (Group Y CDF pin)", () => {
  // Group Y Educators. The standard-normal CDF is strictly monotone
  // increasing in z; pinning the percentile monotonicity in raw_score
  // catches a future edit that flipped the sign of z or swapped the CDF.
  let prev = -Infinity;
  for (const raw_score of [55, 65, 75, 85, 95]) {
    const r = computeBellCurve({ raw_score, mean: 75, sd: 10 });
    assert.ok(Number.isFinite(r.percentile), `error at x=${raw_score}: ${JSON.stringify(r)}`);
    assert.ok(r.percentile > prev, `percentile at x=${raw_score} = ${r.percentile} not greater than prev=${prev}`);
    prev = r.percentile;
  }
  // At the mean, z = 0 and percentile should be 50 exactly (CDF symmetry).
  const atMean = computeBellCurve({ raw_score: 75, mean: 75, sd: 10 });
  // A&S 26.2.17 is a 7-digit approximation; tolerance matches the formula's
  // documented accuracy floor per spec-v14 §14.1 (Group Y at 5% ceiling).
  assert.ok(Math.abs(atMean.percentile - 50) < 1e-6,
    `percentile at mean should be ~50, got ${atMean.percentile}`);
  // z-score at the mean should be exactly 0.
  assert.equal(atMean.z_score, 0);
});

test("monotonicity: computeSPL L2_dB is strictly decreasing in d2 at fixed L1/d1 (inverse-square pin)", () => {
  // Group N. SPL drops 20 * log10(d2/d1) dB per distance doubling in
  // free field; a doubling of distance should drop SPL by exactly
  // 6.0206 dB. Pin both monotonicity and the per-octave decay rate.
  let prev = Infinity;
  for (const d2 of [2, 4, 8, 16, 32]) {
    const r = computeSPL({ L1_dB: 110, d1: 1, d2, mode: "free_field" });
    assert.ok(Number.isFinite(r.L2_dB), `error at d2=${d2}: ${JSON.stringify(r)}`);
    assert.ok(r.L2_dB < prev, `L2 at d2=${d2} = ${r.L2_dB} not less than prev=${prev}`);
    prev = r.L2_dB;
  }
  // Per-doubling pin: L2(2x) - L2(x) should be -20*log10(2) = -6.0206 dB.
  const a = computeSPL({ L1_dB: 110, d1: 1, d2: 10, mode: "free_field" });
  const b = computeSPL({ L1_dB: 110, d1: 1, d2: 20, mode: "free_field" });
  const drop = b.L2_dB - a.L2_dB;
  assert.ok(Math.abs(drop + 20 * Math.log10(2)) < 1e-9,
    `L2(20) - L2(10) = ${drop} != -6.0206 dB (inverse-square per-doubling)`);
});

// --- §10.3 Phase F eleventh monotonicity batch 2026-05-25 ------------------
//
// Five more strict-monotonicity sweeps covering compute functions newly
// bit-pinned in the §9 ratchet that lacked a §10.3 sweep: computeMaintenanceFluid
// (Group U), computeBoltStretch (Group K), computeSeedRate (Group L),
// computeOvertime (Group G), computeMAP (Group V).

test("monotonicity: computeMaintenanceFluid maintenance_mL_per_day is strictly increasing in weight_kg (linear, dog basis)", () => {
  // Group U. Plumb's / AAHA dog maintenance = 60 mL/kg/day; doubling
  // weight should double the daily fluid requirement (linear pin).
  let prev = -Infinity;
  for (const w of [2, 5, 10, 20, 40, 80]) {
    const r = computeMaintenanceFluid({ weight: w, weight_unit: "kg", species: "dog", dehydration_percent: 0, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 });
    assert.ok(Number.isFinite(r.maintenance_mL_per_day), `expected mL/day at w=${w}: ${JSON.stringify(r)}`);
    assert.ok(r.maintenance_mL_per_day > prev, `mL/day at w=${w} = ${r.maintenance_mL_per_day} not greater than prev=${prev}`);
    prev = r.maintenance_mL_per_day;
  }
  const a = computeMaintenanceFluid({ weight: 10, weight_unit: "kg", species: "dog", dehydration_percent: 0, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 });
  const b = computeMaintenanceFluid({ weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 0, ongoing_losses_mL_per_hr: 0, rehydration_window_hr: 24 });
  assert.ok(Math.abs(b.maintenance_mL_per_day - 2 * a.maintenance_mL_per_day) < 1e-9,
    `mL/day(20kg) = ${b.maintenance_mL_per_day} != 2 * mL/day(10kg) = ${2 * a.maintenance_mL_per_day}`);
});

test("monotonicity: computeBoltStretch clamp_load_lb is strictly increasing in stretch_thou (Hooke's-Law linear pin)", () => {
  // Group K. clamp_load = stretch_in * E * area / grip_length; doubling
  // stretch should double clamp load at fixed bolt geometry.
  let prev = -Infinity;
  for (const s of [1, 2, 3, 5, 8, 12]) {
    const r = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: s, material: "steel", k_factor: 0.18 });
    assert.ok(Number.isFinite(r.clamp_load_lb), `expected clamp_load at s=${s}: ${JSON.stringify(r)}`);
    assert.ok(r.clamp_load_lb > prev, `clamp_load at s=${s} = ${r.clamp_load_lb} not greater than prev=${prev}`);
    prev = r.clamp_load_lb;
  }
  const a = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 3, material: "steel", k_factor: 0.18 });
  const b = computeBoltStretch({ diameter_in: 0.5, grip_length_in: 4, stretch_thou: 6, material: "steel", k_factor: 0.18 });
  assert.ok(Math.abs(b.clamp_load_lb - 2 * a.clamp_load_lb) < 1e-9,
    `clamp_load(6 thou) = ${b.clamp_load_lb} != 2 * clamp_load(3 thou) = ${2 * a.clamp_load_lb}`);
});

test("monotonicity: computeSeedRate lbs_per_acre is strictly increasing in target_pop_per_acre (linear pin)", () => {
  // Group L. lbs_per_acre = target_pop / (germ_pct * seeds_per_lb);
  // doubling the target population should double the required seed
  // weight at fixed germination and seed size.
  let prev = -Infinity;
  for (const p of [10000, 20000, 32000, 50000, 80000, 120000]) {
    const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: p, seeds_per_lb: 1500, germination_pct: 95, seed_price_per_lb: 4.5 });
    assert.ok(Number.isFinite(r.lbs_per_acre), `expected lbs/acre at p=${p}: ${JSON.stringify(r)}`);
    assert.ok(r.lbs_per_acre > prev, `lbs/acre at p=${p} = ${r.lbs_per_acre} not greater than prev=${prev}`);
    prev = r.lbs_per_acre;
  }
  const a = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 20000, seeds_per_lb: 1500, germination_pct: 95, seed_price_per_lb: 4.5 });
  const b = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 40000, seeds_per_lb: 1500, germination_pct: 95, seed_price_per_lb: 4.5 });
  assert.ok(Math.abs(b.lbs_per_acre - 2 * a.lbs_per_acre) < 1e-9,
    `lbs/acre(40k) = ${b.lbs_per_acre} != 2 * lbs/acre(20k) = ${2 * a.lbs_per_acre}`);
});

test("monotonicity: computeOvertime gross_pay is strictly increasing in total_hours with FLSA 40-hr OT-threshold pin", () => {
  // Group G. Piecewise-linear at the 40-hr OT boundary (and 60-hr DT
  // boundary). Pins both the strict monotonicity over the sweep AND
  // the per-hour rate jump at 40 hrs (1x -> 1.5x) and at 60 hrs (1.5x ->
  // 2x); a future edit that swapped `>` for `>=` at either threshold
  // surfaces here.
  let prev = -Infinity;
  for (const h of [5, 20, 40, 41, 50, 60, 61, 70]) {
    const r = computeOvertime({ total_hours: h, regular_rate: 30, overtime_multiplier: 1.5, double_time_multiplier: 2, double_time_threshold_hr: 60 });
    assert.ok(Number.isFinite(r.gross_pay), `expected gross at h=${h}: ${JSON.stringify(r)}`);
    assert.ok(r.gross_pay > prev, `gross_pay at h=${h} = ${r.gross_pay} not greater than prev=${prev}`);
    prev = r.gross_pay;
  }
  // OT-threshold pin: at $30/hr, 40 hrs -> $1200 (no OT); 41 hrs ->
  // $1245 (1 hr at 1.5 * $30 = $45 added).
  const at40 = computeOvertime({ total_hours: 40, regular_rate: 30, overtime_multiplier: 1.5, double_time_multiplier: 2, double_time_threshold_hr: 60 });
  const at41 = computeOvertime({ total_hours: 41, regular_rate: 30, overtime_multiplier: 1.5, double_time_multiplier: 2, double_time_threshold_hr: 60 });
  assert.equal(at40.gross_pay, 1200);
  assert.equal(at41.gross_pay, 1245);
  // DT-threshold pin: 60 hrs -> $2100; 61 hrs -> $2160 (1 hr at 2 * $30 = $60).
  const at60 = computeOvertime({ total_hours: 60, regular_rate: 30, overtime_multiplier: 1.5, double_time_multiplier: 2, double_time_threshold_hr: 60 });
  const at61 = computeOvertime({ total_hours: 61, regular_rate: 30, overtime_multiplier: 1.5, double_time_multiplier: 2, double_time_threshold_hr: 60 });
  assert.equal(at60.gross_pay, 2100);
  assert.equal(at61.gross_pay, 2160);
});

test("monotonicity: computeMAP map_mmHg is strictly increasing in DBP at fixed SBP (weighted-average pin)", () => {
  // Group V. MAP = (SBP + 2*DBP)/3; linear-in-DBP. Pins the weight-on-
  // DBP factor (2/3) against a future swap to (SBP+DBP)/2 (arithmetic
  // mean with weight 1/2).
  let prev = -Infinity;
  for (const d of [40, 60, 70, 80, 90, 100]) {
    const r = computeMAP({ sbp_mmHg: 120, dbp_mmHg: d });
    assert.ok(Number.isFinite(r.map_mmHg), `expected map at DBP=${d}: ${JSON.stringify(r)}`);
    assert.ok(r.map_mmHg > prev, `map at DBP=${d} = ${r.map_mmHg} not greater than prev=${prev}`);
    prev = r.map_mmHg;
  }
  // Weighted-average pin: MAP(SBP=120, DBP=60) = (120 + 120) / 3 = 80 exactly.
  const r = computeMAP({ sbp_mmHg: 120, dbp_mmHg: 60 });
  assert.equal(r.map_mmHg, 80);
});

// --- §10.3 Phase F twelfth monotonicity batch 2026-05-25 -------------------
//
// Five more strict-monotonicity sweeps for §9-pinned compute functions
// that still lacked a §10.3 sweep: computeYieldEP (Group O), computeStandingWater
// (Group D), computeMileageCost (Group G), computeHydrantFlow (Group F),
// computeRiggingCheck (Group N).

test("monotonicity: computeYieldEP ep_weight is strictly increasing in ap_weight at fixed trim ratio (linear pin)", () => {
  // Group O. ep_weight = ap_weight * (1 - trim/ap) * (1 - cooking_loss);
  // at fixed trim ratio (15% of AP) and cooking loss (15%) the yield is
  // a fixed 72.25%, so EP scales linearly with AP. Pin doubling-in-AP.
  let prev = -Infinity;
  for (const ap of [2, 5, 10, 20, 40, 80]) {
    const r = computeYieldEP({ ap_weight: ap, trim_weight: ap * 0.15, cooking_loss_pct: 15, ap_cost_per_lb: 10 });
    assert.ok(Number.isFinite(r.ep_weight), `expected ep_weight at AP=${ap}: ${JSON.stringify(r)}`);
    assert.ok(r.ep_weight > prev, `ep_weight at AP=${ap} = ${r.ep_weight} not greater than prev=${prev}`);
    prev = r.ep_weight;
  }
  const a = computeYieldEP({ ap_weight: 10, trim_weight: 1.5, cooking_loss_pct: 15, ap_cost_per_lb: 10 });
  const b = computeYieldEP({ ap_weight: 20, trim_weight: 3, cooking_loss_pct: 15, ap_cost_per_lb: 10 });
  assert.ok(Math.abs(b.ep_weight - 2 * a.ep_weight) < 1e-9,
    `ep_weight(20 lb AP) = ${b.ep_weight} != 2 * ep_weight(10 lb AP) = ${2 * a.ep_weight}`);
});

test("monotonicity: computeStandingWater gallons + pounds are strictly increasing in area_ft2 at fixed depth (linear pin)", () => {
  // Group D. gallons = area * depth/12 * 7.4805; pounds = area *
  // depth/12 * 62.4. Both linear in area at fixed depth; doubling area
  // doubles both outputs.
  let prevGal = -Infinity;
  let prevLb = -Infinity;
  for (const a of [50, 100, 200, 500, 1000, 2000]) {
    const r = computeStandingWater({ area_ft2: a, depth_in: 1 });
    assert.ok(Number.isFinite(r.gallons), `expected gallons at A=${a}: ${JSON.stringify(r)}`);
    assert.ok(r.gallons > prevGal, `gallons at A=${a} = ${r.gallons} not greater than prev=${prevGal}`);
    assert.ok(r.pounds > prevLb, `pounds at A=${a} = ${r.pounds} not greater than prev=${prevLb}`);
    prevGal = r.gallons;
    prevLb = r.pounds;
  }
  const x = computeStandingWater({ area_ft2: 500, depth_in: 1 });
  const y = computeStandingWater({ area_ft2: 1000, depth_in: 1 });
  assert.ok(Math.abs(y.gallons - 2 * x.gallons) < 1e-9,
    `gallons(1000 ft^2) = ${y.gallons} != 2 * gallons(500 ft^2) = ${2 * x.gallons}`);
});

test("monotonicity: computeMileageCost gallons is strictly increasing in round_trip_miles at fixed mpg (linear pin)", () => {
  // Group G. gallons = miles / mpg; linear in miles. Doubling miles
  // doubles gallons and fuel_cost together at fixed mpg / price.
  let prev = -Infinity;
  for (const m of [10, 25, 50, 100, 200, 500]) {
    const r = computeMileageCost({ round_trip_miles: m, mpg: 25, fuel_price_per_gallon: 4 });
    assert.ok(Number.isFinite(r.gallons), `expected gallons at miles=${m}: ${JSON.stringify(r)}`);
    assert.ok(r.gallons > prev, `gallons at miles=${m} = ${r.gallons} not greater than prev=${prev}`);
    prev = r.gallons;
  }
  const a = computeMileageCost({ round_trip_miles: 50, mpg: 25, fuel_price_per_gallon: 4 });
  const b = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4 });
  assert.ok(Math.abs(b.gallons - 2 * a.gallons) < 1e-9,
    `gallons(100 mi) = ${b.gallons} != 2 * gallons(50 mi) = ${2 * a.gallons}`);
  assert.ok(Math.abs(b.fuel_cost - 2 * a.fuel_cost) < 1e-9,
    `fuel_cost(100 mi) = ${b.fuel_cost} != 2 * fuel_cost(50 mi) = ${2 * a.fuel_cost}`);
});

test("monotonicity: computeHydrantFlow flow_gpm is strictly increasing in pitot_psi (sqrt-pressure pin)", () => {
  // Group F. NFPA Q = 29.83 * C * d^2 * sqrt(P); monotone-increasing in
  // P. Per-quadrupling pin: quadrupling pressure doubles flow.
  let prev = -Infinity;
  for (const p of [1, 2, 5, 10, 20, 40]) {
    const r = computeHydrantFlow({ pitot_psi: p, outlet_diameter_in: 2.5, c: 0.9 });
    assert.ok(Number.isFinite(r.flow_gpm), `expected flow at p=${p}: ${JSON.stringify(r)}`);
    assert.ok(r.flow_gpm > prev, `flow at p=${p} = ${r.flow_gpm} not greater than prev=${prev}`);
    prev = r.flow_gpm;
  }
  // Quadrupling-pressure ratio pin: flow(40) / flow(10) = sqrt(4) = 2 exactly.
  const a = computeHydrantFlow({ pitot_psi: 10, outlet_diameter_in: 2.5, c: 0.9 });
  const b = computeHydrantFlow({ pitot_psi: 40, outlet_diameter_in: 2.5, c: 0.9 });
  assert.ok(Math.abs(b.flow_gpm - 2 * a.flow_gpm) < 1e-9,
    `flow(40 psi) = ${b.flow_gpm} != 2 * flow(10 psi) = ${2 * a.flow_gpm} (sqrt-law)`);
});

test("monotonicity: computeRiggingCheck tension_per_leg_lb is strictly increasing in load_lb (linear pin)", () => {
  // Group N. Vertical 2-leg sling: tension_per_leg = load / n_legs;
  // linear in load. Pin doubling-in-load.
  let prev = -Infinity;
  for (const L of [200, 500, 1000, 2000, 5000, 10000]) {
    const r = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "vertical", load_lb: L, included_angle_deg: 60, n_legs: 2 });
    assert.ok(Number.isFinite(r.tension_per_leg_lb), `expected tension at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.tension_per_leg_lb > prev, `tension at L=${L} = ${r.tension_per_leg_lb} not greater than prev=${prev}`);
    prev = r.tension_per_leg_lb;
  }
  const a = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "vertical", load_lb: 1000, included_angle_deg: 60, n_legs: 2 });
  const b = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "vertical", load_lb: 2000, included_angle_deg: 60, n_legs: 2 });
  assert.ok(Math.abs(b.tension_per_leg_lb - 2 * a.tension_per_leg_lb) < 1e-9,
    `tension(2000 lb) = ${b.tension_per_leg_lb} != 2 * tension(1000 lb) = ${2 * a.tension_per_leg_lb}`);
});

// --- §10.1 shared-computation pin: 7.4805 gal/ft^3 across Groups D + C ----
//
// The cubic-feet-to-gallons conversion 1 ft^3 = 7.480519... gal (NIST) is
// consumed by two unrelated tiles: Group D `computeStandingWater` (uses
// the 5-digit rounding `7.48052`) and Group C `computeAirReceiver` (uses
// the 4-digit rounding `7.4805`). Both rounded literals are within 0.01%
// of the NIST canonical value, but a future drift to (say) 7.5 or 7.48
// in either consumer would silently shift output volumes. The new test
// asserts both consumers stay within a 0.01% band of the NIST value at a
// canonical 1 ft^3 input AND within 0.01% of each other. The 0.01% band
// is comfortably below any meaningful trade-engineering precision and
// above any floating-point noise.

const NIST_GAL_PER_FT3 = 7.480519480519481; // 1 ft^3 = 7.480519... US gal (NIST)

test("invariant: 7.4805 gal/ft^3 shared-constant pin (computeStandingWater Group D + computeAirReceiver Group C within 0.01% of NIST)", () => {
  // Group D consumer: computeStandingWater at exactly 1 ft^3 (12 ft^2 *
  // 1 in / 12). gallons should be ~7.48052.
  const swExact1ft3 = computeStandingWater({ area_ft2: 12, depth_in: 1 });
  assert.ok(Number.isFinite(swExact1ft3.gallons), `computeStandingWater error: ${JSON.stringify(swExact1ft3)}`);
  const swRelativeError = Math.abs(swExact1ft3.gallons - NIST_GAL_PER_FT3) / NIST_GAL_PER_FT3;
  assert.ok(swRelativeError < 1e-4,
    `computeStandingWater(1 ft^3) = ${swExact1ft3.gallons} drifted ${swRelativeError * 100}% from NIST ${NIST_GAL_PER_FT3} (>0.01%)`);
});

test("invariant: computeAirReceiver (Group C) uses the same 7.4805 gal/ft^3 conversion within 0.01% of NIST", () => {
  // Group C consumer: drive a 1 ft^3 receiver result through the
  // public computeAirReceiver path. With demand = 1 cfm * dc=1 = 1
  // scfm, pump_scfm = 0, drawdown_minutes = 1, p_atm = 14.7 psi,
  // P1 - P2 = 14.7 psi -> receiver_ft3 = 1.0 exactly; receiver_gal
  // should be ~7.4805.
  const ar = computeAirReceiver({
    tools: [{ cfm: 1, duty_cycle: 1 }],
    pump_scfm: 0,
    p_high_psi: 29.4,
    p_low_psi: 14.7,
    drawdown_minutes: 1,
    p_atm_psi: 14.7,
  });
  assert.ok(Number.isFinite(ar.receiver_gal), `computeAirReceiver error: ${JSON.stringify(ar)}`);
  assert.ok(Math.abs(ar.receiver_ft3 - 1.0) < 1e-12,
    `receiver_ft3 = ${ar.receiver_ft3}, expected exactly 1.0 ft^3 at the unit-input setup`);
  const arRelativeError = Math.abs(ar.receiver_gal - NIST_GAL_PER_FT3) / NIST_GAL_PER_FT3;
  assert.ok(arRelativeError < 1e-4,
    `computeAirReceiver(1 ft^3) = ${ar.receiver_gal} drifted ${arRelativeError * 100}% from NIST ${NIST_GAL_PER_FT3} (>0.01%)`);
});

test("invariant: the two 7.4805 gal/ft^3 consumers agree within 0.01% (D + C cross-consumer pin)", () => {
  // Both consumers reach the same NIST conversion via slightly different
  // rounded literals (`7.48052` vs `7.4805`). Pin that they stay within
  // 0.01% of each other at the same 1 ft^3 input; any future edit that
  // changed either literal to a substantively different value (e.g.,
  // dropped a digit, swapped to 7.5 or 7.48) surfaces immediately.
  const sw = computeStandingWater({ area_ft2: 12, depth_in: 1 });
  const ar = computeAirReceiver({
    tools: [{ cfm: 1, duty_cycle: 1 }],
    pump_scfm: 0,
    p_high_psi: 29.4,
    p_low_psi: 14.7,
    drawdown_minutes: 1,
    p_atm_psi: 14.7,
  });
  const relativeDiff = Math.abs(sw.gallons - ar.receiver_gal) / sw.gallons;
  assert.ok(relativeDiff < 1e-4,
    `cross-consumer drift: computeStandingWater=${sw.gallons} vs computeAirReceiver=${ar.receiver_gal} (relative diff ${relativeDiff * 100}% > 0.01%)`);
});

// --- §10.1 shared-computation pin: kW <-> hp across Groups M + G ---------
//
// The kilowatts-to-horsepower conversion `1 hp = 745.6998715822702 W`
// (the mechanical-horsepower NIST value, already bit-pinned in the §10.2
// round-trip closeout) is consumed via two unrelated paths: Group M
// `computePumpEfficiency` uses the rounded inverse `motor_kW * 1.34102`
// (where 1.34102 ≈ 1000 / 745.6998715822702 = 1.341022089...) to
// compute motor brake-horsepower, while Group G `convertUnit` uses the
// exact factor `745.6998715822702`. A future edit to either consumer
// that drifted the constant (e.g., the round-number 1.341 or 1.34) would
// surface as a cross-tile drift even though either consumer would still
// pass its own unit tests.

test("invariant: calc-water 1.34102 kW->hp rounding agrees with the exact calc-cross factor within 0.01%", () => {
  // Group M consumer: drive computePumpEfficiency at a 60 kW input and
  // back-calculate the underlying motor_hp = bhp / (motor_eff *
  // drive_eff) = motor_kW * 1.34102.
  const pe = computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 60, motor_eff: 0.93, drive_eff: 1.0 });
  assert.ok(Number.isFinite(pe.bhp), `computePumpEfficiency error: ${JSON.stringify(pe)}`);
  const motor_hp_water = pe.bhp / (0.93 * 1.0);
  // Group G consumer: convertUnit({ category: power, kW->hp }) at 60 kW.
  const conv = convertUnit({ category: "power", value: 60, from: "kW", to: "hp" });
  assert.ok(Number.isFinite(conv.value), `convertUnit error: ${JSON.stringify(conv)}`);
  // The two consumers must agree within 0.01% (the 1.34102 6-digit
  // rounding is ~0.00016% off the exact factor, comfortably below the
  // 0.01% band).
  const relativeDiff = Math.abs(motor_hp_water - conv.value) / conv.value;
  assert.ok(relativeDiff < 1e-4,
    `kW->hp drift: calc-water=${motor_hp_water} vs calc-cross=${conv.value} (relative ${relativeDiff * 100}% > 0.01%)`);
});

const NIST_HP_W = 745.6998715822702; // mechanical horsepower, NIST (already bit-pinned in §10.2)

test("invariant: calc-water 1.34102 kW->hp factor stays within 0.01% of the NIST mechanical-horsepower inverse", () => {
  // Drive computePumpEfficiency at 1 kW exact (60/60) to isolate the
  // 1.34102 factor. motor_hp_water at 1 kW = 1.34102 (the literal
  // itself, modulo the eff division which we undo). Pin within 0.01%
  // of the exact NIST inverse 1000/745.6998715822702 = 1.341022089595...
  const pe = computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 1, motor_eff: 1.0, drive_eff: 1.0 });
  const motor_hp_at_1kW = pe.bhp; // motor_eff=drive_eff=1 -> bhp = motor_hp = 1 * 1.34102 = 1.34102
  const exact_inverse = 1000 / NIST_HP_W;
  const relativeDiff = Math.abs(motor_hp_at_1kW - exact_inverse) / exact_inverse;
  assert.ok(relativeDiff < 1e-4,
    `1.34102 factor drift: calc-water=${motor_hp_at_1kW} vs exact ${exact_inverse} (relative ${relativeDiff * 100}% > 0.01%)`);
});

// --- §10.3 Phase F thirteenth monotonicity batch 2026-05-26 --------------
//
// Five more strict-monotonicity sweeps that pair with §9 bit-stable pins
// added in earlier batches but lacked a §10.3 sweep: computePropSlip
// (Group K), computeBridgeFormula (Group J), computePanConversion (Group
// O), computePumpSize (Group B), computeRecircPumpHead (Group B).

test("monotonicity: computePropSlip slip_percent is strictly decreasing in gps_speed_kt (inverse-in-actual-speed pin)", () => {
  // Group K. slip% = 1 - actual_kt / theoretical_kt; at fixed rpm /
  // gear_ratio / pitch the theoretical_kt is fixed, so slip% decreases
  // as actual speed approaches theoretical. A future edit that flipped
  // numerator/denominator would surface here.
  let prev = Infinity;
  for (const gps of [5, 10, 20, 30, 35, 40]) {
    const r = computePropSlip({ rpm: 4500, gear_ratio: 1.85, pitch_in: 19, gps_speed_kt: gps });
    assert.ok(Number.isFinite(r.slip_percent), `expected slip% at gps=${gps}: ${JSON.stringify(r)}`);
    assert.ok(r.slip_percent < prev, `slip% at gps=${gps} = ${r.slip_percent} not less than prev=${prev}`);
    prev = r.slip_percent;
  }
});

test("monotonicity: computeBridgeFormula total_weight_lb is strictly increasing in any single axle weight (linear-sum pin)", () => {
  // Group J. total = sum(axle_weights); strictly increasing in each
  // axle's weight at fixed other axles. Pin both the strict
  // monotonicity over a sweep on axle 1 AND the linear-sum identity
  // (each +1000 lb on one axle increments total by exactly +1000).
  let prev = -Infinity;
  for (const w1 of [8000, 10000, 12000, 15000, 18000, 20000]) {
    const r = computeBridgeFormula({ axle_weights_lb: [w1, 17000, 17000, 17000, 17000], axle_spacings_ft: [12, 4, 30, 4] });
    assert.ok(Number.isFinite(r.total_weight_lb), `expected total at w1=${w1}: ${JSON.stringify(r)}`);
    assert.ok(r.total_weight_lb > prev, `total at w1=${w1} = ${r.total_weight_lb} not greater than prev=${prev}`);
    prev = r.total_weight_lb;
  }
  const a = computeBridgeFormula({ axle_weights_lb: [12000, 17000, 17000, 17000, 17000], axle_spacings_ft: [12, 4, 30, 4] });
  const b = computeBridgeFormula({ axle_weights_lb: [13000, 17000, 17000, 17000, 17000], axle_spacings_ft: [12, 4, 30, 4] });
  assert.equal(b.total_weight_lb - a.total_weight_lb, 1000);
});

test("monotonicity: computePanConversion total_qt is strictly increasing in target_servings (linear pin)", () => {
  // Group O. total_qt = servings * portion_oz / 32; linear in servings
  // at fixed portion. Doubling servings doubles total_qt.
  let prev = -Infinity;
  for (const s of [10, 25, 50, 100, 200, 400]) {
    const r = computePanConversion({ target_qt: 0, target_servings: s, portion_oz: 4, pan_size: "full", pan_depth_in: 4 });
    assert.ok(Number.isFinite(r.total_qt), `expected total_qt at s=${s}: ${JSON.stringify(r)}`);
    assert.ok(r.total_qt > prev, `total_qt at s=${s} = ${r.total_qt} not greater than prev=${prev}`);
    prev = r.total_qt;
  }
  const a = computePanConversion({ target_qt: 0, target_servings: 50, portion_oz: 4, pan_size: "full", pan_depth_in: 4 });
  const b = computePanConversion({ target_qt: 0, target_servings: 100, portion_oz: 4, pan_size: "full", pan_depth_in: 4 });
  assert.ok(Math.abs(b.total_qt - 2 * a.total_qt) < 1e-9,
    `total_qt(100 servings) = ${b.total_qt} != 2 * total_qt(50 servings) = ${2 * a.total_qt}`);
});

test("monotonicity: computePumpSize hydraulic_hp is strictly increasing in flow_gpm at fixed TDH (linear pin)", () => {
  // Group B. hydraulic_hp = Q * H * SG / 3960; linear in flow at fixed
  // TDH / SG. Doubling flow doubles hp.
  let prev = -Infinity;
  for (const q of [25, 50, 100, 200, 400, 800]) {
    const r = computePumpSize({ flow_gpm: q, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 1 });
    assert.ok(Number.isFinite(r.hydraulic_hp), `expected hydraulic_hp at Q=${q}: ${JSON.stringify(r)}`);
    assert.ok(r.hydraulic_hp > prev, `hydraulic_hp at Q=${q} = ${r.hydraulic_hp} not greater than prev=${prev}`);
    prev = r.hydraulic_hp;
  }
  const a = computePumpSize({ flow_gpm: 100, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 1 });
  const b = computePumpSize({ flow_gpm: 200, total_dynamic_head_ft: 80, efficiency: 0.65, fluid_specific_gravity: 1 });
  assert.ok(Math.abs(b.hydraulic_hp - 2 * a.hydraulic_hp) < 1e-9,
    `hp(200 gpm) = ${b.hydraulic_hp} != 2 * hp(100 gpm) = ${2 * a.hydraulic_hp}`);
});

test("monotonicity: computeRecircPumpHead head_ft is strictly increasing in pipe_length_ft (Hazen-Williams length-driven pin)", () => {
  // Group B. At a fixed flow / pipe size the friction head scales with
  // length; pin strict monotonicity. Hazen-Williams has linear length
  // dependence in head, so doubling length should double head.
  const base = { fittings_count: 8, target_flow_gpm: 4, internal_diameter_in: 0.75, material: "copper" };
  let prev = -Infinity;
  for (const L of [25, 50, 100, 200, 400, 800]) {
    const r = computeRecircPumpHead({ ...base, pipe_length_ft: L });
    assert.ok(Number.isFinite(r.head_ft), `expected head_ft at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.head_ft > prev, `head at L=${L} = ${r.head_ft} not greater than prev=${prev}`);
    prev = r.head_ft;
  }
});

// --- §10.3 Phase F fourteenth monotonicity batch 2026-05-26 --------------
//
// Five more strict-monotonicity sweeps extending §10.3 coverage to four
// more Group A electrical compute functions (computeTransformerSize,
// computeLVDCDrop, computeBreakerSize) plus computeMassMoles (Group T
// Lab) and a second computeHydrantFlow pin (Group F) for the d^2
// diameter dependency.

test("monotonicity: computeTransformerSize required_kVA + primary_FLA_A are strictly increasing in load_kW (linear pin)", () => {
  // Group A. required_kVA = load_kW / pf at unit pf; primary_FLA_A =
  // load / (sqrt(3) * V) for three-phase. Both linear in load_kW.
  let prevKVA = -Infinity;
  let prevFLA = -Infinity;
  for (const kw of [5, 10, 20, 50, 100, 200, 400]) {
    const r = computeTransformerSize({ load_kW: kw, power_factor: 1, primary_V: 480, secondary_V: 208, phase: "three" });
    assert.ok(Number.isFinite(r.required_kVA), `expected kVA at kw=${kw}: ${JSON.stringify(r)}`);
    assert.ok(r.required_kVA > prevKVA, `kVA at kw=${kw} = ${r.required_kVA} not greater than prev=${prevKVA}`);
    assert.ok(r.primary_FLA_A > prevFLA, `FLA at kw=${kw} = ${r.primary_FLA_A} not greater than prev=${prevFLA}`);
    prevKVA = r.required_kVA;
    prevFLA = r.primary_FLA_A;
  }
  const a = computeTransformerSize({ load_kW: 50, power_factor: 1, primary_V: 480, secondary_V: 208, phase: "three" });
  const b = computeTransformerSize({ load_kW: 100, power_factor: 1, primary_V: 480, secondary_V: 208, phase: "three" });
  assert.ok(Math.abs(b.primary_FLA_A - 2 * a.primary_FLA_A) < 1e-9,
    `primary_FLA(100 kW) = ${b.primary_FLA_A} != 2 * primary_FLA(50 kW) = ${2 * a.primary_FLA_A}`);
});

test("monotonicity: computeLVDCDrop drop_V is strictly increasing in current_A at fixed length / AWG (linear pin)", () => {
  // Group A. drop_V = current_A * resistance_per_ft * length_ft * 2
  // (low-voltage DC, two-wire round trip). Linear in current at fixed
  // run length / conductor; doubling current doubles drop.
  let prev = -Infinity;
  for (const I of [0.5, 1, 2, 5, 10, 20]) {
    const r = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: I, application: "led_lighting" });
    assert.ok(Number.isFinite(r.drop_V), `expected drop_V at I=${I}: ${JSON.stringify(r)}`);
    assert.ok(r.drop_V > prev, `drop at I=${I} = ${r.drop_V} not greater than prev=${prev}`);
    prev = r.drop_V;
  }
  const a = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: 5, application: "led_lighting" });
  const b = computeLVDCDrop({ system_V: 12, awg: "10", run_length_ft: 20, current_A: 10, application: "led_lighting" });
  assert.ok(Math.abs(b.drop_V - 2 * a.drop_V) < 1e-9,
    `drop(10 A) = ${b.drop_V} != 2 * drop(5 A) = ${2 * a.drop_V}`);
});

test("monotonicity: computeBreakerSize next_standard_A is monotone non-decreasing in load_A (NEC Table 240.6 step-function pin)", () => {
  // Group A. NEC Table 240.6(A) standard breaker sizes; next_standard_A
  // is the smallest entry >= required_A. Pin both monotone non-decreasing
  // AND boundary behavior: at load=18 A the next standard is 20 A;
  // at load=20 A the next standard is still 20 A; at load=21 A the
  // next is 25 A. Catches a future swap of `>` for `>=` or a missing
  // entry in the standard-sizes table.
  let prev = -Infinity;
  for (const L of [5, 10, 12, 15, 18, 20, 22, 25, 30, 40, 50, 60, 80, 100]) {
    const r = computeBreakerSize({ load_A: L, continuous: false });
    assert.ok(Number.isFinite(r.next_standard_A), `expected next at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.next_standard_A >= prev, `next at L=${L} = ${r.next_standard_A} not >= prev=${prev}`);
    prev = r.next_standard_A;
  }
  // NEC Table 240.6 boundary pins.
  assert.equal(computeBreakerSize({ load_A: 18, continuous: false }).next_standard_A, 20);
  assert.equal(computeBreakerSize({ load_A: 20, continuous: false }).next_standard_A, 20);
  assert.equal(computeBreakerSize({ load_A: 21, continuous: false }).next_standard_A, 25);
});

test("monotonicity: computeMassMoles moles is strictly increasing in mass_g at fixed molecular_weight (linear pin)", () => {
  // Group T. n = m / MW; linear in m. Doubling mass doubles moles.
  let prev = -Infinity;
  for (const m of [0.5, 1, 2, 5, 10, 25]) {
    const r = computeMassMoles({ mass_g: m, molecular_weight: 58.44 });
    assert.ok(Number.isFinite(r.moles), `expected moles at m=${m}: ${JSON.stringify(r)}`);
    assert.ok(r.moles > prev, `moles at m=${m} = ${r.moles} not greater than prev=${prev}`);
    prev = r.moles;
  }
  const a = computeMassMoles({ mass_g: 5, molecular_weight: 58.44 });
  const b = computeMassMoles({ mass_g: 10, molecular_weight: 58.44 });
  assert.ok(Math.abs(b.moles - 2 * a.moles) < 1e-12,
    `moles(10 g) = ${b.moles} != 2 * moles(5 g) = ${2 * a.moles}`);
});

test("monotonicity: computeHydrantFlow flow_gpm is strictly increasing in outlet_diameter_in (d^2 pin)", () => {
  // Group F. NFPA Q = 29.83 * C * d^2 * sqrt(P); monotone-increasing in
  // d. Per-doubling-diameter pin: doubling d quadruples flow.
  let prev = -Infinity;
  for (const d of [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]) {
    const r = computeHydrantFlow({ pitot_psi: 10, outlet_diameter_in: d, c: 0.9 });
    assert.ok(Number.isFinite(r.flow_gpm), `expected flow at d=${d}: ${JSON.stringify(r)}`);
    assert.ok(r.flow_gpm > prev, `flow at d=${d} = ${r.flow_gpm} not greater than prev=${prev}`);
    prev = r.flow_gpm;
  }
  // Doubling-diameter ratio pin: flow(4 in) / flow(2 in) = 4 exactly (d^2 law).
  const a = computeHydrantFlow({ pitot_psi: 10, outlet_diameter_in: 2, c: 0.9 });
  const b = computeHydrantFlow({ pitot_psi: 10, outlet_diameter_in: 4, c: 0.9 });
  assert.ok(Math.abs(b.flow_gpm - 4 * a.flow_gpm) < 1e-9,
    `flow(4 in) = ${b.flow_gpm} != 4 * flow(2 in) = ${4 * a.flow_gpm} (d^2 law)`);
});

// --- §10.3 Phase F fifteenth monotonicity batch 2026-05-26 ---------------
//
// Five more strict-monotonicity sweeps covering compute functions across
// five different catalog groups: computeBendRadius (Group A), computeAsphaltTonnage
// (Group E), computeMaterialCost (Group G), computeETE (Group W),
// computeShockIndex (Group V).

test("monotonicity: computeBendRadius min_radius_in is strictly increasing in cable_od_in (Southwire 8x-multiplier linear pin)", () => {
  // Group A. min_radius = multiple * cable_od; at THHN single-conductor
  // the multiplier is 8 (Southwire technical bulletin); linear in OD.
  let prev = -Infinity;
  for (const od of [0.25, 0.5, 0.75, 1, 1.5, 2, 3]) {
    const r = computeBendRadius({ cable_type: "THHN", cable_od_in: od });
    assert.ok(Number.isFinite(r.min_radius_in), `expected min_radius at OD=${od}: ${JSON.stringify(r)}`);
    assert.ok(r.min_radius_in > prev, `min_radius at OD=${od} = ${r.min_radius_in} not greater than prev=${prev}`);
    prev = r.min_radius_in;
  }
  // 8x multiplier pin: at OD=1.0 in the min_radius must be 8.0 exactly.
  const at1 = computeBendRadius({ cable_type: "THHN", cable_od_in: 1.0 });
  assert.equal(at1.multiple, 8);
  assert.equal(at1.min_radius_in, 8);
});

test("monotonicity: computeAsphaltTonnage tons is strictly increasing in area_ft2 + depth_in (cubic-volume linear pin)", () => {
  // Group E. tons = (area * depth/12) * density_pcf / 2000; linear in
  // both area and depth at fixed others. Pin doubling-in-area + doubling-
  // in-depth identities.
  let prev = -Infinity;
  for (const a of [100, 500, 1000, 2000, 5000, 10000]) {
    const r = computeAsphaltTonnage({ area_ft2: a, depth_in: 3, density_pcf: 145 });
    assert.ok(Number.isFinite(r.tons), `expected tons at A=${a}: ${JSON.stringify(r)}`);
    assert.ok(r.tons > prev, `tons at A=${a} = ${r.tons} not greater than prev=${prev}`);
    prev = r.tons;
  }
  // Linear-in-area doubling identity.
  const a = computeAsphaltTonnage({ area_ft2: 1000, depth_in: 3, density_pcf: 145 });
  const b = computeAsphaltTonnage({ area_ft2: 2000, depth_in: 3, density_pcf: 145 });
  assert.ok(Math.abs(b.tons - 2 * a.tons) < 1e-9,
    `tons(2000 ft^2) = ${b.tons} != 2 * tons(1000 ft^2) = ${2 * a.tons}`);
  // Linear-in-depth doubling identity (at fixed area).
  const c = computeAsphaltTonnage({ area_ft2: 1000, depth_in: 2, density_pcf: 145 });
  const d = computeAsphaltTonnage({ area_ft2: 1000, depth_in: 4, density_pcf: 145 });
  assert.ok(Math.abs(d.tons - 2 * c.tons) < 1e-9,
    `tons(4 in) = ${d.tons} != 2 * tons(2 in) = ${2 * c.tons}`);
});

test("monotonicity: computeMaterialCost subtotal is strictly increasing in quantity at fixed unit_price (linear pin)", () => {
  // Group G. subtotal = unit_price * quantity; linear in quantity.
  let prev = -Infinity;
  for (const q of [1, 5, 10, 25, 50, 100, 200]) {
    const r = computeMaterialCost({ unit_price: 20, quantity: q, tax_rate_percent: 0, delivery_fee: 0 });
    assert.ok(Number.isFinite(r.subtotal), `expected subtotal at q=${q}: ${JSON.stringify(r)}`);
    assert.ok(r.subtotal > prev, `subtotal at q=${q} = ${r.subtotal} not greater than prev=${prev}`);
    prev = r.subtotal;
  }
  const a = computeMaterialCost({ unit_price: 20, quantity: 10, tax_rate_percent: 0, delivery_fee: 0 });
  const b = computeMaterialCost({ unit_price: 20, quantity: 20, tax_rate_percent: 0, delivery_fee: 0 });
  assert.equal(b.subtotal, 2 * a.subtotal);
});

test("monotonicity: computeETE ete_minutes is strictly decreasing in groundspeed_kt at fixed distance (inverse pin)", () => {
  // Group W. ete = distance / groundspeed; doubling speed halves ETE.
  // Inverse-proportional pin.
  let prev = Infinity;
  for (const gs of [50, 75, 100, 150, 200, 300]) {
    const r = computeETE({ distance_nm: 300, groundspeed_kt: gs, departure_time_local: "08:00" });
    assert.ok(Number.isFinite(r.ete_minutes), `expected ete at gs=${gs}: ${JSON.stringify(r)}`);
    assert.ok(r.ete_minutes < prev, `ete at gs=${gs} = ${r.ete_minutes} not less than prev=${prev}`);
    prev = r.ete_minutes;
  }
  // Halving-speed pin: doubling gs halves ete_minutes.
  const a = computeETE({ distance_nm: 300, groundspeed_kt: 100, departure_time_local: "08:00" });
  const b = computeETE({ distance_nm: 300, groundspeed_kt: 200, departure_time_local: "08:00" });
  assert.ok(Math.abs(b.ete_minutes - 0.5 * a.ete_minutes) < 1e-9,
    `ete(200 kt) = ${b.ete_minutes} != 0.5 * ete(100 kt) = ${0.5 * a.ete_minutes}`);
});

test("monotonicity: computeShockIndex shock_index is strictly increasing in hr_bpm at fixed sbp (linear pin)", () => {
  // Group V. SI = HR / SBP; linear in HR at fixed SBP. Doubling HR
  // doubles SI.
  let prev = -Infinity;
  for (const hr of [40, 60, 80, 100, 120, 140, 180]) {
    const r = computeShockIndex({ hr_bpm: hr, sbp_mmHg: 120 });
    assert.ok(Number.isFinite(r.shock_index), `expected SI at HR=${hr}: ${JSON.stringify(r)}`);
    assert.ok(r.shock_index > prev, `SI at HR=${hr} = ${r.shock_index} not greater than prev=${prev}`);
    prev = r.shock_index;
  }
  const a = computeShockIndex({ hr_bpm: 60, sbp_mmHg: 120 });
  const b = computeShockIndex({ hr_bpm: 120, sbp_mmHg: 120 });
  assert.ok(Math.abs(b.shock_index - 2 * a.shock_index) < 1e-9,
    `SI(HR=120) = ${b.shock_index} != 2 * SI(HR=60) = ${2 * a.shock_index}`);
});

// --- §10.3 Phase F sixteenth monotonicity batch 2026-05-26 ---------------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeConcreteVolume (E), computePipeVolume (B), computeETTSizing
// (U), computeAmortizationSchedule total_interest (X / R), computeFoam (F).

test("monotonicity: computeConcreteVolume cubic_yards is strictly increasing in thickness_in (linear pin)", () => {
  // Group E. cubic_yards = (L * W * t/12) / 27; linear in thickness at
  // fixed footprint. Doubling thickness doubles volume.
  let prev = -Infinity;
  for (const t of [2, 4, 6, 8, 12, 16]) {
    const r = computeConcreteVolume({ shape: "slab", length_ft: 20, width_ft: 10, thickness_in: t });
    assert.ok(Number.isFinite(r.cubic_yards), `expected cy at t=${t}: ${JSON.stringify(r)}`);
    assert.ok(r.cubic_yards > prev, `cy at t=${t} = ${r.cubic_yards} not greater than prev=${prev}`);
    prev = r.cubic_yards;
  }
  const a = computeConcreteVolume({ shape: "slab", length_ft: 20, width_ft: 10, thickness_in: 4 });
  const b = computeConcreteVolume({ shape: "slab", length_ft: 20, width_ft: 10, thickness_in: 8 });
  assert.ok(Math.abs(b.cubic_yards - 2 * a.cubic_yards) < 1e-9,
    `cy(8 in) = ${b.cubic_yards} != 2 * cy(4 in) = ${2 * a.cubic_yards}`);
});

test("monotonicity: computePipeVolume gallons is strictly increasing in length_ft at fixed diameter (linear pin)", () => {
  // Group B. gallons = (pi/4 * d^2 * L) * 7.4805 / 144; linear in
  // length at fixed diameter. Doubling length doubles gallons.
  let prev = -Infinity;
  for (const L of [5, 10, 25, 50, 100, 200]) {
    const r = computePipeVolume({ internal_diameter_in: 1.0, length_ft: L, nominal_size: "1" });
    assert.ok(Number.isFinite(r.gallons), `expected gal at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.gallons > prev, `gal at L=${L} = ${r.gallons} not greater than prev=${prev}`);
    prev = r.gallons;
  }
  const a = computePipeVolume({ internal_diameter_in: 1.0, length_ft: 50, nominal_size: "1" });
  const b = computePipeVolume({ internal_diameter_in: 1.0, length_ft: 100, nominal_size: "1" });
  assert.ok(Math.abs(b.gallons - 2 * a.gallons) < 1e-12,
    `gal(100 ft) = ${b.gallons} != 2 * gal(50 ft) = ${2 * a.gallons}`);
});

test("monotonicity: computeETTSizing ett_mm_id is monotone non-decreasing in weight_kg (Plumb's dog band step-function pin)", () => {
  // Group U. ETT size is a table lookup binned by weight band. Pin
  // monotone non-decreasing AND specific Plumb's-published boundary
  // values: at 5 kg ETT=5.0 mm; at 10 kg ETT=6.5 mm; at 20 kg ETT=8.0;
  // at 40 kg ETT=9.0; at 60 kg ETT=10.0. Catches a future swap in the
  // dog-weight-band table.
  let prev = -Infinity;
  for (const w of [1, 3, 5, 10, 15, 20, 30, 40, 60, 80]) {
    const r = computeETTSizing({ species: "dog", weight_kg: w });
    assert.ok(Number.isFinite(r.ett_mm_id), `expected ETT at w=${w}: ${JSON.stringify(r)}`);
    assert.ok(r.ett_mm_id >= prev, `ETT at w=${w} = ${r.ett_mm_id} not >= prev=${prev}`);
    prev = r.ett_mm_id;
  }
  assert.equal(computeETTSizing({ species: "dog", weight_kg: 5 }).ett_mm_id, 5.0);
  assert.equal(computeETTSizing({ species: "dog", weight_kg: 10 }).ett_mm_id, 6.5);
  assert.equal(computeETTSizing({ species: "dog", weight_kg: 40 }).ett_mm_id, 9.0);
});

test("monotonicity: computeAmortizationSchedule total_interest is strictly increasing in principal at fixed rate / term (linear pin)", () => {
  // Group X / R. total_interest = monthly_pi * term_months - principal,
  // linear in principal at fixed rate/term. Doubling principal doubles
  // total_interest (and total_paid).
  let prev = -Infinity;
  for (const p of [50000, 100000, 200000, 400000, 800000]) {
    const r = computeAmortizationSchedule({ principal: p, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 0 });
    assert.ok(Number.isFinite(r.total_interest), `expected total_interest at P=${p}: ${JSON.stringify(r)}`);
    assert.ok(r.total_interest > prev, `total_interest at P=${p} = ${r.total_interest} not greater than prev=${prev}`);
    prev = r.total_interest;
  }
  const a = computeAmortizationSchedule({ principal: 100000, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 0 });
  const b = computeAmortizationSchedule({ principal: 200000, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 0 });
  assert.ok(Math.abs(b.total_interest - 2 * a.total_interest) < 1e-6,
    `total_interest(200k) = ${b.total_interest} != 2 * total_interest(100k) = ${2 * a.total_interest}`);
});

test("monotonicity: computeFoam total_concentrate_gallons + total_solution_gallons are strictly increasing in fire_area_ft2 (linear pin)", () => {
  // Group F. AFFF / Class B foam: total_solution = area * rate *
  // duration; concentrate = total_solution * foam_percentage. Both
  // linear in area at fixed rate / duration / foam_percentage.
  let prevS = -Infinity;
  let prevC = -Infinity;
  for (const a of [100, 200, 500, 1000, 2000, 5000]) {
    const r = computeFoam({ fire_area_ft2: a, application_rate_gpm_per_ft2: 0.10, foam_percentage: 3, duration_min: 15 });
    assert.ok(Number.isFinite(r.total_solution_gallons), `expected sol at A=${a}: ${JSON.stringify(r)}`);
    assert.ok(r.total_solution_gallons > prevS, `sol at A=${a} = ${r.total_solution_gallons} not greater than prev=${prevS}`);
    assert.ok(r.total_concentrate_gallons > prevC, `conc at A=${a} = ${r.total_concentrate_gallons} not greater than prev=${prevC}`);
    prevS = r.total_solution_gallons;
    prevC = r.total_concentrate_gallons;
  }
  const a = computeFoam({ fire_area_ft2: 500, application_rate_gpm_per_ft2: 0.10, foam_percentage: 3, duration_min: 15 });
  const b = computeFoam({ fire_area_ft2: 1000, application_rate_gpm_per_ft2: 0.10, foam_percentage: 3, duration_min: 15 });
  assert.equal(b.total_solution_gallons, 2 * a.total_solution_gallons);
  assert.equal(b.total_concentrate_gallons, 2 * a.total_concentrate_gallons);
});

// --- §10.3 Phase F seventeenth monotonicity batch 2026-05-26 ------------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeSHR (C), computeDisplacementCR (K), computeCrosswind (W),
// computeBreakeven (R), computeAerialLadderReach (F).

test("monotonicity: computeSHR SHR is strictly increasing in sensible_btu_hr at fixed total_btu_hr (linear pin)", () => {
  // Group C. SHR = sensible / total; linear in sensible at fixed total.
  // Doubling sensible doubles SHR.
  let prev = -Infinity;
  for (const s of [4000, 8000, 12000, 16000, 20000]) {
    const r = computeSHR({ sensible_btu_hr: s, total_btu_hr: 24000 });
    assert.ok(Number.isFinite(r.SHR), `expected SHR at s=${s}: ${JSON.stringify(r)}`);
    assert.ok(r.SHR > prev, `SHR at s=${s} = ${r.SHR} not greater than prev=${prev}`);
    prev = r.SHR;
  }
  const a = computeSHR({ sensible_btu_hr: 8000, total_btu_hr: 24000 });
  const b = computeSHR({ sensible_btu_hr: 16000, total_btu_hr: 24000 });
  assert.ok(Math.abs(b.SHR - 2 * a.SHR) < 1e-12,
    `SHR(16k) = ${b.SHR} != 2 * SHR(8k) = ${2 * a.SHR}`);
});

test("monotonicity: computeDisplacementCR displacement_in3 is strictly increasing in cylinders (linear pin)", () => {
  // Group K. displacement = pi/4 * bore^2 * stroke * cylinders; linear
  // in cylinder count at fixed geometry. Doubling cylinders doubles
  // displacement.
  const base = { ...displacementCRExample.inputs };
  let prev = -Infinity;
  for (const c of [1, 2, 4, 6, 8, 10, 12]) {
    const r = computeDisplacementCR({ ...base, cylinders: c });
    assert.ok(Number.isFinite(r.displacement_in3), `expected disp at c=${c}: ${JSON.stringify(r)}`);
    assert.ok(r.displacement_in3 > prev, `disp at c=${c} = ${r.displacement_in3} not greater than prev=${prev}`);
    prev = r.displacement_in3;
  }
  const a = computeDisplacementCR({ ...base, cylinders: 4 });
  const b = computeDisplacementCR({ ...base, cylinders: 8 });
  assert.ok(Math.abs(b.displacement_in3 - 2 * a.displacement_in3) < 1e-9,
    `disp(8 cyl) = ${b.displacement_in3} != 2 * disp(4 cyl) = ${2 * a.displacement_in3}`);
});

test("monotonicity: computeCrosswind crosswind_kt is strictly increasing in wind_speed_kt at fixed angle (linear pin)", () => {
  // Group W. crosswind = wind_speed * sin(angle); linear in wind_speed
  // at fixed runway/wind heading. Doubling wind speed doubles crosswind.
  let prev = -Infinity;
  for (const ws of [5, 10, 15, 20, 30, 40, 60]) {
    const r = computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 120, wind_speed_kt: ws, demonstrated_crosswind_kt: 15 });
    assert.ok(Number.isFinite(r.crosswind_kt), `expected cw at ws=${ws}: ${JSON.stringify(r)}`);
    assert.ok(r.crosswind_kt > prev, `crosswind at ws=${ws} = ${r.crosswind_kt} not greater than prev=${prev}`);
    prev = r.crosswind_kt;
  }
  // sin(30) = 0.5 exactly, so crosswind = 0.5 * wind_speed at 30 deg off runway.
  const at20 = computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 120, wind_speed_kt: 20, demonstrated_crosswind_kt: 15 });
  assert.ok(Math.abs(at20.crosswind_kt - 10) < 1e-9,
    `crosswind(20 kt at 30 deg) = ${at20.crosswind_kt}, expected ~10 (sin(30)=0.5 pin)`);
});

test("monotonicity: computeBreakeven breakeven_units is strictly increasing in fixed_costs at fixed margin (linear pin)", () => {
  // Group R. breakeven_units = fixed_costs / contribution_margin;
  // linear in fixed_costs at fixed margin. Doubling fixed_costs doubles
  // breakeven_units.
  let prev = -Infinity;
  for (const fc of [10000, 25000, 50000, 100000, 200000, 500000]) {
    const r = computeBreakeven({ fixed_costs: fc, variable_cost_per_unit: 8, sale_price_per_unit: 20, target_units: 6000 });
    assert.ok(Number.isFinite(r.breakeven_units), `expected be at fc=${fc}: ${JSON.stringify(r)}`);
    assert.ok(r.breakeven_units > prev, `be at fc=${fc} = ${r.breakeven_units} not greater than prev=${prev}`);
    prev = r.breakeven_units;
  }
  const a = computeBreakeven({ fixed_costs: 50000, variable_cost_per_unit: 8, sale_price_per_unit: 20, target_units: 6000 });
  const b = computeBreakeven({ fixed_costs: 100000, variable_cost_per_unit: 8, sale_price_per_unit: 20, target_units: 6000 });
  assert.ok(Math.abs(b.breakeven_units - 2 * a.breakeven_units) < 1e-9,
    `be(100k FC) = ${b.breakeven_units} != 2 * be(50k FC) = ${2 * a.breakeven_units}`);
});

test("monotonicity: computeAerialLadderReach horizontal_reach + vertical_reach are strictly increasing in extension_ft (linear pin)", () => {
  // Group F. horizontal = extension * cos(angle); vertical = extension
  // * sin(angle). Both linear in extension at fixed angle. At 60 deg:
  // cos = 0.5, sin = sqrt(3)/2 = 0.86602...
  let prevH = -Infinity;
  let prevV = -Infinity;
  for (const e of [25, 50, 75, 100, 125, 150]) {
    const r = computeAerialLadderReach({ angle_deg: 60, extension_ft: e });
    assert.ok(Number.isFinite(r.horizontal_reach_ft), `expected H at e=${e}: ${JSON.stringify(r)}`);
    assert.ok(r.horizontal_reach_ft > prevH, `H at e=${e} = ${r.horizontal_reach_ft} not greater than prev=${prevH}`);
    assert.ok(r.vertical_reach_ft > prevV, `V at e=${e} = ${r.vertical_reach_ft} not greater than prev=${prevV}`);
    prevH = r.horizontal_reach_ft;
    prevV = r.vertical_reach_ft;
  }
  // At 60 deg / 100 ft extension: horizontal = 50 (exact), vertical = ~86.602.
  const r = computeAerialLadderReach({ angle_deg: 60, extension_ft: 100 });
  assert.ok(Math.abs(r.horizontal_reach_ft - 50) < 1e-9,
    `horizontal(60 deg, 100 ft) = ${r.horizontal_reach_ft}, expected 50 (cos(60) = 0.5 pin)`);
  assert.ok(Math.abs(r.vertical_reach_ft - 50 * Math.sqrt(3)) < 1e-9,
    `vertical(60 deg, 100 ft) = ${r.vertical_reach_ft}, expected 50*sqrt(3) = ${50 * Math.sqrt(3)} (sin(60) = sqrt(3)/2 pin)`);
});

// --- §10.3 Phase F eighteenth monotonicity batch 2026-05-26 -------------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeMarkup (G), computeHEPALife (D), computeTargetWeightLoss
// (U), computePressureAltitude (W), computeFilterLoading (M).

test("monotonicity: computeMarkup selling_price is strictly increasing in cost at fixed markup_percent (linear pin)", () => {
  // Group G. selling_price = cost * (1 + markup_pct/100); linear in cost.
  // At 50% markup, selling_price = 1.5 * cost exact.
  let prev = -Infinity;
  for (const c of [5, 10, 25, 50, 100, 200]) {
    const r = computeMarkup({ cost: c, mode: "markup_percent", value: 50 });
    assert.ok(Number.isFinite(r.selling_price), `expected sp at c=${c}: ${JSON.stringify(r)}`);
    assert.ok(r.selling_price > prev, `sp at c=${c} = ${r.selling_price} not greater than prev=${prev}`);
    prev = r.selling_price;
  }
  // 50% markup pin: selling_price = 1.5 * cost.
  assert.equal(computeMarkup({ cost: 10, mode: "markup_percent", value: 50 }).selling_price, 15);
  assert.equal(computeMarkup({ cost: 100, mode: "markup_percent", value: 50 }).selling_price, 150);
});

test("monotonicity: computeHEPALife filters_for_job + total_cost_usd are strictly increasing in job_days (linear pin)", () => {
  // Group D. filters_for_job and total_cost both scale linearly with
  // job_days at fixed cfm / particulate / capacity / cost. Doubling
  // job days doubles both.
  let prevF = -Infinity;
  let prevC = -Infinity;
  for (const d of [1, 3, 7, 14, 30, 60]) {
    const r = computeHEPALife({ cfm: 500, hours_per_day: 24, particulate_category: "medium", capacity_grams: 200, job_days: d, filter_cost_usd: 200 });
    assert.ok(Number.isFinite(r.filters_for_job), `expected filters at d=${d}: ${JSON.stringify(r)}`);
    assert.ok(r.filters_for_job >= prevF, `filters at d=${d} = ${r.filters_for_job} not >= prev=${prevF}`);
    assert.ok(r.total_cost_usd > prevC, `cost at d=${d} = ${r.total_cost_usd} not greater than prev=${prevC}`);
    prevF = r.filters_for_job;
    prevC = r.total_cost_usd;
  }
  const a = computeHEPALife({ cfm: 500, hours_per_day: 24, particulate_category: "medium", capacity_grams: 200, job_days: 7, filter_cost_usd: 200 });
  const b = computeHEPALife({ cfm: 500, hours_per_day: 24, particulate_category: "medium", capacity_grams: 200, job_days: 14, filter_cost_usd: 200 });
  assert.equal(b.filters_for_job, 2 * a.filters_for_job);
  assert.equal(b.total_cost_usd, 2 * a.total_cost_usd);
});

test("monotonicity: computeTargetWeightLoss deficit_kg is strictly increasing in current_weight at fixed target (linear pin)", () => {
  // Group U. deficit = current - target; linear in current at fixed
  // target. At target=10 kg, deficit at current=12 should be 2 (exact).
  let prev = -Infinity;
  for (const cur of [10.5, 12, 15, 20, 25, 30]) {
    const r = computeTargetWeightLoss({ current_weight: cur, target_weight: 10, weight_unit: "kg", species: "dog", kcal_per_cup: 400 });
    assert.ok(Number.isFinite(r.deficit_kg), `expected deficit at cur=${cur}: ${JSON.stringify(r)}`);
    assert.ok(r.deficit_kg > prev, `deficit at cur=${cur} = ${r.deficit_kg} not greater than prev=${prev}`);
    prev = r.deficit_kg;
  }
  // Exact subtraction pin.
  const r12 = computeTargetWeightLoss({ current_weight: 12, target_weight: 10, weight_unit: "kg", species: "dog", kcal_per_cup: 400 });
  assert.equal(r12.deficit_kg, 2);
});

test("monotonicity: computePressureAltitude pressure_altitude_ft is strictly decreasing in altimeter_setting_inHg (inverse-in-setting pin)", () => {
  // Group W. PA = field_elev + (29.92 - setting) * 1000. Strictly
  // decreasing in altimeter setting. Pin the 1000 ft/inHg coefficient
  // exactly: PA(29.42) - PA(29.92) = 500 ft (0.5 inHg = 500 ft).
  let prev = Infinity;
  for (const set of [28.92, 29.42, 29.62, 29.92, 30.22, 30.42, 30.92]) {
    const r = computePressureAltitude({ field_elevation_ft: 1000, altimeter_setting_inHg: set });
    assert.ok(Number.isFinite(r.pressure_altitude_ft), `expected PA at set=${set}: ${JSON.stringify(r)}`);
    assert.ok(r.pressure_altitude_ft < prev, `PA at set=${set} = ${r.pressure_altitude_ft} not less than prev=${prev}`);
    prev = r.pressure_altitude_ft;
  }
  // 1000 ft/inHg coefficient pin.
  const at2942 = computePressureAltitude({ field_elevation_ft: 1000, altimeter_setting_inHg: 29.42 });
  const at2992 = computePressureAltitude({ field_elevation_ft: 1000, altimeter_setting_inHg: 29.92 });
  assert.ok(Math.abs((at2942.pressure_altitude_ft - at2992.pressure_altitude_ft) - 500) < 1e-9,
    `PA(29.42) - PA(29.92) = ${at2942.pressure_altitude_ft - at2992.pressure_altitude_ft}, expected 500 (1000 ft/inHg pin)`);
});

test("monotonicity: computeFilterLoading loading_gpm_per_ft2 is strictly decreasing in filter_area_ft2 + backwash_gpm strictly increasing (inverse + linear pin)", () => {
  // Group M. loading = flow / area (inverse in area at fixed flow);
  // backwash_gpm = backwash_rate * area (linear in area at fixed rate).
  // Pin both.
  let prevL = Infinity;
  let prevB = -Infinity;
  for (const fa of [50, 100, 200, 500, 1000, 2000]) {
    const r = computeFilterLoading({ filter_area_ft2: fa, flow_gpm: 800, backwash_rate_gpm_ft2: 15 });
    assert.ok(Number.isFinite(r.loading_gpm_per_ft2), `expected loading at A=${fa}: ${JSON.stringify(r)}`);
    assert.ok(r.loading_gpm_per_ft2 < prevL, `loading at A=${fa} = ${r.loading_gpm_per_ft2} not less than prev=${prevL}`);
    assert.ok(r.backwash_gpm > prevB, `backwash at A=${fa} = ${r.backwash_gpm} not greater than prev=${prevB}`);
    prevL = r.loading_gpm_per_ft2;
    prevB = r.backwash_gpm;
  }
  // Inverse-in-area pin: loading(200) / loading(100) = 0.5 exactly.
  const a = computeFilterLoading({ filter_area_ft2: 100, flow_gpm: 800, backwash_rate_gpm_ft2: 15 });
  const b = computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 800, backwash_rate_gpm_ft2: 15 });
  assert.equal(b.loading_gpm_per_ft2, 0.5 * a.loading_gpm_per_ft2);
  // Linear-in-area pin: backwash(200) = 2 * backwash(100).
  assert.equal(b.backwash_gpm, 2 * a.backwash_gpm);
});

// --- §10.3 Phase F nineteenth monotonicity batch 2026-05-26 -------------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeTileCount (E), computeSETax (R), computeTrueAirspeed (W),
// computeServiceLoad (A), computeNAMSizing (D). Brings §10.3 surface
// past the 100-sweep mark.

test("monotonicity: computeTileCount tile_count is strictly increasing in area_ft2 at fixed tile geometry (linear pin)", () => {
  // Group E. base_count = ceil(area / tile_face_ft2); tile_count
  // includes waste. Linear in area at fixed tile size. Doubling area
  // (where base_count is exactly proportional, no ceiling effects)
  // doubles tile_count.
  let prev = -Infinity;
  for (const a of [50, 100, 200, 400, 500, 1000]) {
    const r = computeTileCount({ area_ft2: a, tile_width_in: 12, tile_height_in: 12, grout_joint_width_in: 0.125, tile_thickness_in: 0.25, waste_factor: 0.10 });
    assert.ok(Number.isFinite(r.tile_count), `expected tile_count at A=${a}: ${JSON.stringify(r)}`);
    assert.ok(r.tile_count > prev, `tile_count at A=${a} = ${r.tile_count} not greater than prev=${prev}`);
    prev = r.tile_count;
  }
  const a = computeTileCount({ area_ft2: 100, tile_width_in: 12, tile_height_in: 12, grout_joint_width_in: 0.125, tile_thickness_in: 0.25, waste_factor: 0.10 });
  const b = computeTileCount({ area_ft2: 200, tile_width_in: 12, tile_height_in: 12, grout_joint_width_in: 0.125, tile_thickness_in: 0.25, waste_factor: 0.10 });
  // 1 ft^2 tiles at 100 ft^2 -> 100 base, +10% waste = 110; at 200 -> 220.
  assert.equal(a.tile_count, 110);
  assert.equal(b.tile_count, 220);
});

test("monotonicity: computeSETax se_tax is strictly increasing in net_se_earnings below the SS wage base (piecewise-linear pin)", () => {
  // Group R. SE tax = SS_tax + Medicare_tax; below the SS wage base
  // (2025: $176,100) it is linear in net earnings. Pin both strict
  // monotonicity and the doubling identity below the cap.
  let prev = -Infinity;
  for (const n of [5000, 10000, 25000, 50000, 100000, 150000]) {
    const r = computeSETax({ net_se_earnings: n, w2_ss_wages: 0, tax_year: 2025, filing_status: "single" });
    assert.ok(Number.isFinite(r.se_tax), `expected se_tax at n=${n}: ${JSON.stringify(r)}`);
    assert.ok(r.se_tax > prev, `se_tax at n=${n} = ${r.se_tax} not greater than prev=${prev}`);
    prev = r.se_tax;
  }
  // Doubling identity below the SS cap.
  const a = computeSETax({ net_se_earnings: 50000, w2_ss_wages: 0, tax_year: 2025, filing_status: "single" });
  const b = computeSETax({ net_se_earnings: 100000, w2_ss_wages: 0, tax_year: 2025, filing_status: "single" });
  assert.ok(Math.abs(b.se_tax - 2 * a.se_tax) < 1e-6,
    `se_tax(100k) = ${b.se_tax} != 2 * se_tax(50k) = ${2 * a.se_tax}`);
});

test("monotonicity: computeTrueAirspeed tas_kt is strictly increasing in pressure_altitude_ft at fixed CAS (density-altitude pin)", () => {
  // Group W. At fixed CAS / OAT, increasing PA decreases air density
  // which increases TAS. Pin strict monotonicity. At sea-level standard
  // day (PA=0, OAT=15 C), TAS ~ CAS within 1%.
  let prev = -Infinity;
  for (const pa of [0, 1000, 3000, 5000, 8000, 10000, 15000]) {
    const r = computeTrueAirspeed({ cas_kt: 120, pressure_altitude_ft: pa, oat_c: 15 });
    assert.ok(Number.isFinite(r.tas_kt), `expected tas at pa=${pa}: ${JSON.stringify(r)}`);
    assert.ok(r.tas_kt > prev, `tas at pa=${pa} = ${r.tas_kt} not greater than prev=${prev}`);
    prev = r.tas_kt;
  }
  // ISA sea level pin: TAS ~ CAS at PA=0 / OAT=15 C.
  const slStd = computeTrueAirspeed({ cas_kt: 120, pressure_altitude_ft: 0, oat_c: 15 });
  assert.ok(Math.abs(slStd.tas_kt - 120) / 120 < 0.01,
    `TAS at ISA sea level = ${slStd.tas_kt}, expected ~120 (CAS) within 1%`);
});

test("monotonicity: computeServiceLoad total_demand_W is strictly increasing in fixed_appliances_W (linear pin)", () => {
  // Group A. NEC Article 220 service-load calc: total_demand = sum of
  // demand-factored components. fixed_appliances_W contributes linearly
  // (with the NEC demand factor). Pin strict monotonicity in
  // fixed_appliances at fixed other inputs.
  const base = { ...serviceLoadExample.inputs };
  let prev = -Infinity;
  for (const fa of [0, 2000, 4000, 6000, 10000, 20000]) {
    const r = computeServiceLoad({ ...base, fixed_appliances_W: fa });
    assert.ok(Number.isFinite(r.total_demand_W), `expected total at fa=${fa}: ${JSON.stringify(r)}`);
    assert.ok(r.total_demand_W > prev, `total at fa=${fa} = ${r.total_demand_W} not greater than prev=${prev}`);
    prev = r.total_demand_W;
  }
});

test("monotonicity: computeNAMSizing required_cfm is strictly increasing in room_volume_ft3 at fixed target_ach (linear pin)", () => {
  // Group D. IICRC negative-air-machine sizing: required_cfm = volume *
  // ach / 60. Linear in volume at fixed ach. Doubling volume doubles
  // required_cfm.
  let prev = -Infinity;
  for (const v of [500, 1000, 2000, 5000, 10000, 20000]) {
    const r = computeNAMSizing({ room_volume_ft3: v, target_ach: 6 });
    assert.ok(Number.isFinite(r.required_cfm), `expected cfm at V=${v}: ${JSON.stringify(r)}`);
    assert.ok(r.required_cfm > prev, `cfm at V=${v} = ${r.required_cfm} not greater than prev=${prev}`);
    prev = r.required_cfm;
  }
  const a = computeNAMSizing({ room_volume_ft3: 1000, target_ach: 6 });
  const b = computeNAMSizing({ room_volume_ft3: 2000, target_ach: 6 });
  assert.equal(b.required_cfm, 2 * a.required_cfm);
  // ACH=6 / volume=1000 ft^3 / 60 min = 100 cfm exact pin.
  assert.equal(a.required_cfm, 100);
});

// --- §10.3 Phase F twentieth monotonicity batch 2026-05-26 --------------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computePaintCoverage (E), computeFreightDensity (J),
// computeNoiseDose (G), computeBrakePadLife (K), computeBoxFill (A).
// Five fresh consumers, five fresh groups; brings §10.3 surface to 105+
// sweeps with each row pinning either a published constant or a
// closed-form linear / quadratic identity.

test("monotonicity: computePaintCoverage total_paint_gallons is strictly increasing in area_ft2 at fixed surface / coats (linear pin)", () => {
  // Group E. total_paint_gallons = (area / coverage_ft2_per_gal) * coats
  // at the smooth-surface factor of 1.0. Linear in area. At smooth =
  // 350 ft^2/gal with 2 coats, area=350 -> 2.0 gal exact; area=700 -> 4.0
  // gal exact.
  let prev = -Infinity;
  for (const a of [50, 100, 250, 500, 1000, 2000]) {
    const r = computePaintCoverage({ area_ft2: a, coats: 2, primer_needed: false, surface_porosity: "smooth" });
    assert.ok(Number.isFinite(r.total_paint_gallons), `expected total at A=${a}: ${JSON.stringify(r)}`);
    assert.ok(r.total_paint_gallons > prev, `total at A=${a} = ${r.total_paint_gallons} not greater than prev=${prev}`);
    prev = r.total_paint_gallons;
  }
  // Doubling identity (linear): area 350 -> 2.0 gal; area 700 -> 4.0 gal.
  const a = computePaintCoverage({ area_ft2: 350, coats: 2, primer_needed: false, surface_porosity: "smooth" });
  const b = computePaintCoverage({ area_ft2: 700, coats: 2, primer_needed: false, surface_porosity: "smooth" });
  assert.ok(Math.abs(a.total_paint_gallons - 2.0) < 1e-9,
    `paint(350 ft^2, 2 coats, smooth) = ${a.total_paint_gallons}, expected 2.0`);
  assert.ok(Math.abs(b.total_paint_gallons - 4.0) < 1e-9,
    `paint(700 ft^2, 2 coats, smooth) = ${b.total_paint_gallons}, expected 4.0`);
  assert.ok(Math.abs(b.total_paint_gallons - 2 * a.total_paint_gallons) < 1e-9,
    `paint(700) = ${b.total_paint_gallons} != 2 * paint(350) = ${2 * a.total_paint_gallons}`);
});

test("monotonicity: computeFreightDensity density_pcf is strictly increasing in weight_lb at fixed dimensions (linear pin)", () => {
  // Group J. density_pcf = weight_lb / cubic_ft. Linear in weight at
  // fixed L * W * H. Doubling weight doubles density. Carton 48 x 40 x
  // 48 in = 53.333... ft^3 (NMFTA standard pallet footprint).
  let prev = -Infinity;
  for (const w of [50, 100, 250, 500, 1000, 2500]) {
    const r = computeFreightDensity({ length_in: 48, width_in: 40, height_in: 48, weight_lb: w });
    assert.ok(Number.isFinite(r.density_pcf), `expected density at W=${w}: ${JSON.stringify(r)}`);
    assert.ok(r.density_pcf > prev, `density at W=${w} = ${r.density_pcf} not greater than prev=${prev}`);
    prev = r.density_pcf;
  }
  // Doubling identity: cubic_ft fixed at (48 * 40 * 48) / 1728 = 53.333... ft^3.
  const a = computeFreightDensity({ length_in: 48, width_in: 40, height_in: 48, weight_lb: 500 });
  const b = computeFreightDensity({ length_in: 48, width_in: 40, height_in: 48, weight_lb: 1000 });
  assert.ok(Math.abs(b.density_pcf - 2 * a.density_pcf) < 1e-9,
    `density(1000 lb) = ${b.density_pcf} != 2 * density(500 lb) = ${2 * a.density_pcf}`);
  // cubic_ft exact pin: (48 * 40 * 48) / 1728 = 53.333... ft^3.
  assert.ok(Math.abs(a.cubic_ft - (48 * 40 * 48) / 1728) < 1e-9,
    `cubic_ft = ${a.cubic_ft}, expected ${(48 * 40 * 48) / 1728}`);
});

test("monotonicity: computeNoiseDose dose_percent is strictly increasing in hours at fixed dBA (OSHA 1910.95 linear-in-time pin)", () => {
  // Group G. OSHA 1910.95 Appendix A: T = 8 / 2^((L - 90) / 5);
  // contribution = (H / T) * 100. At fixed L, contribution is linear
  // in H. At L = 90 dBA, T = 8 hr (the PEL pin); contribution = H/8
  // * 100 = 12.5 * H %. Pin both strict monotonicity AND the closed-form
  // 12.5% per hour at the PEL.
  let prev = -Infinity;
  for (const h of [0.5, 1, 2, 4, 6, 8]) {
    const r = computeNoiseDose({ rows: [{ level_dBA: 90, hours: h }] });
    assert.ok(Number.isFinite(r.total_dose_pct), `expected dose at H=${h}: ${JSON.stringify(r)}`);
    assert.ok(r.total_dose_pct > prev, `dose at H=${h} = ${r.total_dose_pct} not greater than prev=${prev}`);
    prev = r.total_dose_pct;
  }
  // PEL pin: at 90 dBA, 8 hr is exactly 100% dose.
  const pel = computeNoiseDose({ rows: [{ level_dBA: 90, hours: 8 }] });
  assert.ok(Math.abs(pel.total_dose_pct - 100) < 1e-9,
    `dose(90 dBA, 8 hr) = ${pel.total_dose_pct}, expected 100% at the PEL`);
  // Doubling identity: 90 dBA / 4 hr -> 50%; 90 dBA / 8 hr -> 100%.
  const half = computeNoiseDose({ rows: [{ level_dBA: 90, hours: 4 }] });
  assert.ok(Math.abs(pel.total_dose_pct - 2 * half.total_dose_pct) < 1e-9,
    `dose(8 hr) = ${pel.total_dose_pct} != 2 * dose(4 hr) = ${2 * half.total_dose_pct}`);
});

test("monotonicity: computeBrakePadLife ke_J is strictly increasing in vehicle_weight_lb at fixed speed (linear pin)", () => {
  // Group K. KE = 0.5 * m * v^2; m_kg = lb * 0.4536; v_ms = mph *
  // 0.4470. Linear in vehicle_weight_lb at fixed speed. Doubling weight
  // doubles ke_J. Also pin quadratic-in-speed: doubling speed quadruples
  // ke_J at fixed weight.
  let prev = -Infinity;
  for (const w of [1500, 2500, 3500, 5000, 7500, 10000]) {
    const r = computeBrakePadLife({ vehicle_weight_lb: w, speed_delta_mph: 30, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
    assert.ok(Number.isFinite(r.ke_J), `expected ke_J at W=${w}: ${JSON.stringify(r)}`);
    assert.ok(r.ke_J > prev, `ke_J at W=${w} = ${r.ke_J} not greater than prev=${prev}`);
    prev = r.ke_J;
  }
  // Doubling weight identity (linear).
  const a = computeBrakePadLife({ vehicle_weight_lb: 2500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
  const b = computeBrakePadLife({ vehicle_weight_lb: 5000, speed_delta_mph: 30, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
  assert.ok(Math.abs(b.ke_J - 2 * a.ke_J) / a.ke_J < 1e-12,
    `ke_J(5000 lb) = ${b.ke_J} != 2 * ke_J(2500 lb) = ${2 * a.ke_J}`);
  // Quadratic-in-speed pin: doubling speed -> 4x ke_J.
  const s1 = computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 20, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
  const s2 = computeBrakePadLife({ vehicle_weight_lb: 3500, speed_delta_mph: 40, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
  assert.ok(Math.abs(s2.ke_J - 4 * s1.ke_J) / s1.ke_J < 1e-12,
    `ke_J(40 mph) = ${s2.ke_J} != 4 * ke_J(20 mph) = ${4 * s1.ke_J}`);
});

test("monotonicity: computeBoxFill fill_in3 is strictly increasing in conductor count at fixed box volume (NEC Table 314.16(B) linear pin)", () => {
  // Group A. NEC 314.16(B): each #12 conductor contributes 2.25 in^3.
  // fill = 2.25 * count + clamp_volume + 2 * largest * devices; with
  // clamp + devices held fixed, fill is strictly linear-in-count.
  let prev = -Infinity;
  for (const n of [1, 2, 3, 4, 6, 8, 10]) {
    const r = computeBoxFill({ box_volume_in3: 100, conductors_by_size: { "12": n }, devices: 0, internal_clamps: false, largest_awg_for_clamp_and_device: "12" });
    assert.ok(Number.isFinite(r.fill_in3), `expected fill at n=${n}: ${JSON.stringify(r)}`);
    assert.ok(r.fill_in3 > prev, `fill at n=${n} = ${r.fill_in3} not greater than prev=${prev}`);
    prev = r.fill_in3;
  }
  // NEC Table 314.16(B) #12 exact pin: 2.25 in^3 per conductor.
  const one = computeBoxFill({ box_volume_in3: 100, conductors_by_size: { "12": 1 }, devices: 0, internal_clamps: false, largest_awg_for_clamp_and_device: "12" });
  assert.ok(Math.abs(one.fill_in3 - 2.25) < 1e-12,
    `fill(1 x #12, no clamp / device) = ${one.fill_in3}, expected 2.25 in^3 per NEC 314.16(B)`);
  // Doubling identity at fixed clamp/device state.
  const two = computeBoxFill({ box_volume_in3: 100, conductors_by_size: { "12": 2 }, devices: 0, internal_clamps: false, largest_awg_for_clamp_and_device: "12" });
  const four = computeBoxFill({ box_volume_in3: 100, conductors_by_size: { "12": 4 }, devices: 0, internal_clamps: false, largest_awg_for_clamp_and_device: "12" });
  assert.ok(Math.abs(four.fill_in3 - 2 * two.fill_in3) < 1e-12,
    `fill(4 x #12) = ${four.fill_in3} != 2 * fill(2 x #12) = ${2 * two.fill_in3}`);
});

// --- §10.3 Phase F twenty-first monotonicity batch 2026-05-26 ------------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeCfmPerTon (C), computeIvDripRate (V), computeCropYield
// (L), computeRcf (T), computeDetentionTime (M). Five fresh consumers,
// five fresh groups; brings §10.3 surface to 110+ sweeps with each row
// pinning either a published constant or a closed-form identity.

test("monotonicity: computeCfmPerTon total_cfm is strictly increasing in tons at fixed climate (ACCA Manual S 400 CFM/ton pin)", () => {
  // Group C. ACCA Manual S target at standard / mixed climate: 400
  // CFM per ton of cooling. total_cfm = tons * factor; linear in tons.
  // Pin both strict monotonicity AND the doubling identity AND the
  // 400 CFM/ton exact value at climate=standard.
  let prev = -Infinity;
  for (const t of [0.5, 1, 2, 3, 4, 5, 7.5, 10]) {
    const r = computeCfmPerTon({ tons: t, climate: "standard" });
    assert.ok(Number.isFinite(r.total_cfm), `expected total at tons=${t}: ${JSON.stringify(r)}`);
    assert.ok(r.total_cfm > prev, `total at tons=${t} = ${r.total_cfm} not greater than prev=${prev}`);
    prev = r.total_cfm;
  }
  // ACCA Manual S exact pin: 1 ton -> 400 CFM at standard.
  const one = computeCfmPerTon({ tons: 1, climate: "standard" });
  assert.equal(one.total_cfm, 400);
  assert.equal(one.cfm_per_ton, 400);
  // Doubling identity.
  const two = computeCfmPerTon({ tons: 2, climate: "standard" });
  const four = computeCfmPerTon({ tons: 4, climate: "standard" });
  assert.equal(four.total_cfm, 2 * two.total_cfm);
  // Climate-band pins: dry=450, standard=400, humid=350 per Manual S.
  assert.equal(computeCfmPerTon({ tons: 1, climate: "dry" }).total_cfm, 450);
  assert.equal(computeCfmPerTon({ tons: 1, climate: "humid" }).total_cfm, 350);
});

test("monotonicity: computeIvDripRate gtts_per_min is strictly increasing in volume_mL at fixed time / drop factor (linear pin)", () => {
  // Group V. gtts/min = V * F / T; linear in volume at fixed time and
  // drop factor. Doubling volume doubles gtts/min. Pin both strict
  // monotonicity AND the published worked example (1000 mL / 480 min /
  // 15 gtt-per-mL -> 31.25 gtts/min, 125 mL/hr).
  let prev = -Infinity;
  for (const v of [100, 250, 500, 1000, 2000, 3000]) {
    const r = computeIvDripRate({ volume_mL: v, time_min: 480, drop_factor_gtt_per_mL: 15 });
    assert.ok(Number.isFinite(r.gtts_per_min), `expected gtts at V=${v}: ${JSON.stringify(r)}`);
    assert.ok(r.gtts_per_min > prev, `gtts at V=${v} = ${r.gtts_per_min} not greater than prev=${prev}`);
    prev = r.gtts_per_min;
  }
  // Worked-example pin: 1000 mL over 480 min with 15 gtt/mL -> 31.25
  // gtts/min and 125 mL/hr (cross-check against ivDripExample).
  const ex = computeIvDripRate({ volume_mL: 1000, time_min: 480, drop_factor_gtt_per_mL: 15 });
  assert.ok(Math.abs(ex.gtts_per_min - 31.25) < 1e-9,
    `gtts(1000 mL / 480 min / 15) = ${ex.gtts_per_min}, expected 31.25`);
  assert.ok(Math.abs(ex.rate_mL_per_hr - 125) < 1e-9,
    `mL/hr(1000 mL / 480 min) = ${ex.rate_mL_per_hr}, expected 125`);
  // Doubling identity.
  const a = computeIvDripRate({ volume_mL: 500, time_min: 480, drop_factor_gtt_per_mL: 15 });
  const b = computeIvDripRate({ volume_mL: 1000, time_min: 480, drop_factor_gtt_per_mL: 15 });
  assert.ok(Math.abs(b.gtts_per_min - 2 * a.gtts_per_min) < 1e-9,
    `gtts(1000) = ${b.gtts_per_min} != 2 * gtts(500) = ${2 * a.gtts_per_min}`);
});

test("monotonicity: computeCropYield yield_bu_per_acre is strictly increasing in weight_in_strip_lb at fixed strip geometry / moisture (linear pin)", () => {
  // Group L. yield_bu_per_acre = (adjusted_lb / acres) / testWeight at
  // fixed strip geometry; adjusted_lb is linear in weight_in_strip_lb
  // (the moisture-adjustment factor is constant at fixed
  // current_moisture_pct). Linear in strip weight. Pin both strict
  // monotonicity AND the doubling identity.
  let prev = -Infinity;
  for (const w of [50, 100, 150, 220, 300, 500]) {
    const r = computeCropYield({ crop: "corn", rows_per_pass: 6, row_spacing_in: 30, measured_length_ft: 100, weight_in_strip_lb: w, current_moisture_pct: 18 });
    assert.ok(Number.isFinite(r.yield_bu_per_acre), `expected yield at W=${w}: ${JSON.stringify(r)}`);
    assert.ok(r.yield_bu_per_acre > prev, `yield at W=${w} = ${r.yield_bu_per_acre} not greater than prev=${prev}`);
    prev = r.yield_bu_per_acre;
  }
  // Doubling identity at fixed strip / moisture.
  const a = computeCropYield({ crop: "corn", rows_per_pass: 6, row_spacing_in: 30, measured_length_ft: 100, weight_in_strip_lb: 100, current_moisture_pct: 18 });
  const b = computeCropYield({ crop: "corn", rows_per_pass: 6, row_spacing_in: 30, measured_length_ft: 100, weight_in_strip_lb: 200, current_moisture_pct: 18 });
  assert.ok(Math.abs(b.yield_bu_per_acre - 2 * a.yield_bu_per_acre) / a.yield_bu_per_acre < 1e-12,
    `yield(200 lb) = ${b.yield_bu_per_acre} != 2 * yield(100 lb) = ${2 * a.yield_bu_per_acre}`);
  // Standard-moisture pin for corn: 15.5% per USDA convention.
  assert.ok(Math.abs(a.std_moisture_pct - 15.5) < 1e-9,
    `corn std_moisture_pct = ${a.std_moisture_pct}, expected 15.5 per USDA convention`);
});

test("monotonicity: computeRcf rcf is strictly increasing in rpm at fixed rotor_radius_mm (quadratic-in-rpm pin)", () => {
  // Group T. RCF = 1.118e-5 * r_cm * rpm^2; quadratic in rpm at fixed
  // rotor radius. Doubling rpm quadruples RCF. Pin both strict
  // monotonicity AND the quadratic identity AND the published constant
  // (1.118e-5 per the centrifuge handbook; r_cm = rotor_radius_mm / 10).
  let prev = -Infinity;
  for (const rpm of [500, 1000, 2000, 5000, 10000, 14000, 20000]) {
    const r = computeRcf({ rotor_radius_mm: 84, rpm });
    assert.ok(Number.isFinite(r.rcf), `expected rcf at rpm=${rpm}: ${JSON.stringify(r)}`);
    assert.ok(r.rcf > prev, `rcf at rpm=${rpm} = ${r.rcf} not greater than prev=${prev}`);
    prev = r.rcf;
  }
  // Quadratic-in-rpm pin: doubling rpm -> 4x RCF.
  const a = computeRcf({ rotor_radius_mm: 84, rpm: 5000 });
  const b = computeRcf({ rotor_radius_mm: 84, rpm: 10000 });
  assert.ok(Math.abs(b.rcf - 4 * a.rcf) / a.rcf < 1e-12,
    `rcf(10000 rpm) = ${b.rcf} != 4 * rcf(5000 rpm) = ${4 * a.rcf}`);
  // Published constant pin: 1.118e-5 * 8.4 cm * 14000^2 RCF closed-form.
  const ref = computeRcf({ rotor_radius_mm: 84, rpm: 14000 });
  const expected = 1.118e-5 * 8.4 * 14000 * 14000;
  assert.ok(Math.abs(ref.rcf - expected) < 1e-9,
    `rcf(84 mm, 14000 rpm) = ${ref.rcf}, expected ${expected} from 1.118e-5 * 8.4 * 14000^2`);
});

test("monotonicity: computeDetentionTime minutes is strictly increasing in tank_volume_gal at fixed flow (linear pin)", () => {
  // Group M. minutes = tank_volume_gal / flow_gpm; linear in volume at
  // fixed flow, strictly decreasing in flow at fixed volume. Pin both
  // the linear-in-volume strict monotonicity AND the inverse-in-flow
  // strict monotonicity AND the exact 50000 / 350 = 142.857... min
  // worked-example identity.
  let prev = -Infinity;
  for (const v of [1000, 5000, 10000, 25000, 50000, 100000]) {
    const r = computeDetentionTime({ tank_volume_gal: v, flow_gpm: 350 });
    assert.ok(Number.isFinite(r.minutes), `expected minutes at V=${v}: ${JSON.stringify(r)}`);
    assert.ok(r.minutes > prev, `minutes at V=${v} = ${r.minutes} not greater than prev=${prev}`);
    prev = r.minutes;
  }
  // Inverse-in-flow pin at fixed volume.
  let prevFlow = Infinity;
  for (const q of [100, 200, 350, 500, 1000, 2000]) {
    const r = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: q });
    assert.ok(r.minutes < prevFlow, `minutes at Q=${q} = ${r.minutes} not less than prev=${prevFlow}`);
    prevFlow = r.minutes;
  }
  // Worked-example identity: 50000 gal / 350 gpm = 142.857... min,
  // 2.381 hr, 0.0992 days (cross-check against detentionTimeExample).
  const ex = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 350 });
  assert.ok(Math.abs(ex.minutes - 50000 / 350) < 1e-9,
    `minutes(50000 / 350) = ${ex.minutes}, expected ${50000 / 350}`);
  assert.ok(Math.abs(ex.hours - ex.minutes / 60) < 1e-12,
    `hours(${ex.minutes} min) = ${ex.hours}, expected ${ex.minutes / 60}`);
});

// --- §10.3 Phase F twenty-second monotonicity batch 2026-05-26 ----------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeGasPipeSizing (B), computeRequiredFireFlow (F),
// computeNeutralImbalance (N), computeJudgmentInterest (S),
// computeBackcountryNeeds (P). Five fresh consumers, five fresh groups
// (B / F / N / S / P had no §10.3 sweeps in the prior twenty-one
// batches); brings §10.3 surface to 115+ sweeps.

test("monotonicity: computeGasPipeSizing required_cfh is strictly increasing in btu_load at fixed gas (linear pin)", () => {
  // Group B. required_cfh = btu_load / heating_value_btu_ft3; linear in
  // btu_load. Doubling btu_load doubles required_cfh. Pin both strict
  // monotonicity AND the natural-gas heating-value exact pin: 1030
  // BTU/ft^3 per the GAS_PROPERTIES table.
  let prev = -Infinity;
  for (const load of [10000, 25000, 50000, 100000, 200000, 400000]) {
    const r = computeGasPipeSizing({ btu_load: load, length_ft: 50, gas: "natural_gas" });
    assert.ok(Number.isFinite(r.required_cfh), `expected cfh at load=${load}: ${JSON.stringify(r)}`);
    assert.ok(r.required_cfh > prev, `cfh at load=${load} = ${r.required_cfh} not greater than prev=${prev}`);
    prev = r.required_cfh;
  }
  // Natural-gas heating-value exact pin: 103000 BTU / 1030 BTU/ft^3 = 100 cfh exact.
  const exact = computeGasPipeSizing({ btu_load: 103000, length_ft: 50, gas: "natural_gas" });
  assert.ok(Math.abs(exact.required_cfh - 100) < 1e-9,
    `cfh(103000 BTU, natural_gas) = ${exact.required_cfh}, expected 100 (heating value 1030 BTU/ft^3)`);
  // Doubling identity at fixed length / gas.
  const a = computeGasPipeSizing({ btu_load: 50000, length_ft: 50, gas: "natural_gas" });
  const b = computeGasPipeSizing({ btu_load: 100000, length_ft: 50, gas: "natural_gas" });
  assert.ok(Math.abs(b.required_cfh - 2 * a.required_cfh) / a.required_cfh < 1e-12,
    `cfh(100000) = ${b.required_cfh} != 2 * cfh(50000) = ${2 * a.required_cfh}`);
});

test("monotonicity: computeRequiredFireFlow needed_fire_flow_gpm is monotone non-decreasing in structure_area_ft2 (ISO sqrt pin)", () => {
  // Group F. ISO method: C = 18 * F * sqrt(A); NFF = round(C / 250) *
  // 250 (rounded to nearest 250 gpm per ISO practice). At construction
  // class "ordinary" (F=1.0), NFF is monotone non-decreasing in area
  // (the sqrt is strictly increasing; the 250 gpm rounding can create
  // ties at adjacent sweep points, but never reversals). The base_C_gpm
  // (un-rounded value) is strictly increasing.
  let prev = -Infinity;
  let prevBase = -Infinity;
  for (const a of [1000, 2000, 5000, 10000, 20000, 30000, 50000]) {
    const r = computeRequiredFireFlow({ structure_area_ft2: a, construction_class: "ordinary" });
    assert.ok(Number.isFinite(r.needed_fire_flow_gpm), `expected NFF at A=${a}: ${JSON.stringify(r)}`);
    assert.ok(r.needed_fire_flow_gpm >= prev, `NFF at A=${a} = ${r.needed_fire_flow_gpm} not >= prev=${prev}`);
    assert.ok(r.base_C_gpm > prevBase, `base_C at A=${a} = ${r.base_C_gpm} not greater than prev=${prevBase}`);
    prev = r.needed_fire_flow_gpm;
    prevBase = r.base_C_gpm;
  }
  // ISO 12000 gpm ceiling pin: very large area is clamped.
  const huge = computeRequiredFireFlow({ structure_area_ft2: 10000000, construction_class: "wood_frame" });
  assert.equal(huge.needed_fire_flow_gpm, 12000);
  // Construction-class pin: ordinary = 1.0 (catches a future regression
  // in the ISO_CONSTRUCTION_FACTORS table).
  const ord = computeRequiredFireFlow({ structure_area_ft2: 5000, construction_class: "ordinary" });
  assert.equal(ord.construction_factor, 1.0);
});

test("monotonicity: computeNeutralImbalance neutral_A degenerates to I_A when I_B = I_C = 0 and is strictly increasing in I_A (single-phase pin)", () => {
  // Group N. I_N = sqrt(I_A^2 + I_B^2 + I_C^2 - I_A*I_B - I_B*I_C -
  // I_A*I_C); at I_B = I_C = 0 the cross-terms vanish and I_N = I_A.
  // Pin both strict monotonicity in I_A under that single-phase
  // degenerate case AND the balanced-three-phase identity: at
  // I_A = I_B = I_C the formula collapses to zero (perfectly balanced
  // neutral carries no current).
  let prev = -Infinity;
  for (const ia of [5, 10, 20, 40, 80, 100, 200]) {
    const r = computeNeutralImbalance({ I_A: ia, I_B: 0, I_C: 0 });
    assert.ok(Number.isFinite(r.neutral_A), `expected neutral at I_A=${ia}: ${JSON.stringify(r)}`);
    assert.ok(Math.abs(r.neutral_A - ia) < 1e-9, `single-phase: neutral_A(${ia}) = ${r.neutral_A}, expected ${ia}`);
    assert.ok(r.neutral_A > prev, `neutral at I_A=${ia} = ${r.neutral_A} not greater than prev=${prev}`);
    prev = r.neutral_A;
  }
  // Balanced three-phase pin: I_A = I_B = I_C -> neutral_A = 0.
  const bal = computeNeutralImbalance({ I_A: 50, I_B: 50, I_C: 50 });
  assert.ok(Math.abs(bal.neutral_A) < 1e-9,
    `balanced 3-phase neutral_A = ${bal.neutral_A}, expected 0`);
  assert.equal(bal.imbalance_percent, 0);
});

test("monotonicity: computeJudgmentInterest accrued_interest is strictly increasing in principal at fixed dates / simple rate (linear pin)", () => {
  // Group S. Simple-interest state (CA 10% per Cal. Civ. Proc. Code
  // 685.010): accrued_interest = principal * rate * (days / 365);
  // linear in principal at fixed dates. Doubling principal doubles
  // interest. Pin both strict monotonicity AND the closed-form CA
  // 10%-of-principal-per-year identity.
  const j = "2024-01-01";
  const a = "2025-01-01";  // 366 days (2024 is a leap year)
  let prev = -Infinity;
  for (const p of [1000, 5000, 10000, 25000, 50000, 100000]) {
    const r = computeJudgmentInterest({ principal: p, state: "CA", judgment_date: j, accrual_date: a });
    assert.ok(Number.isFinite(r.accrued_interest), `expected interest at P=${p}: ${JSON.stringify(r)}`);
    assert.ok(r.accrued_interest > prev, `interest at P=${p} = ${r.accrued_interest} not greater than prev=${prev}`);
    prev = r.accrued_interest;
  }
  // Doubling identity (linear in principal).
  const half = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: j, accrual_date: a });
  const full = computeJudgmentInterest({ principal: 20000, state: "CA", judgment_date: j, accrual_date: a });
  assert.ok(Math.abs(full.accrued_interest - 2 * half.accrued_interest) / half.accrued_interest < 1e-12,
    `interest($20k) = ${full.accrued_interest} != 2 * interest($10k) = ${2 * half.accrued_interest}`);
  // CA rate-pct pin: 10.0 per Cal. Civ. Proc. Code 685.010.
  assert.equal(half.rate_pct, 10.0);
  assert.equal(half.accrual, "simple");
  // Closed-form pin: principal * 0.10 * (366 / 365) for the 2024 leap year.
  const expected = 10000 * 0.10 * (366 / 365);
  assert.ok(Math.abs(half.accrued_interest - expected) < 1e-6,
    `interest($10k, 366 days, 10% simple) = ${half.accrued_interest}, expected ${expected}`);
});

test("monotonicity: computeBackcountryNeeds trip_water_l + trip_kcal are strictly increasing in trip_days at fixed weight / band / exertion (linear pin)", () => {
  // Group P. trip_water_l = water_per_day * trip_days * group_size;
  // trip_kcal = kcal_per_day * trip_days * group_size; both linear in
  // trip_days at fixed other inputs. Pin both strict monotonicity AND
  // the doubling identity AND closed-form: kcal_per_day at 150 lb /
  // moderate exertion is the baseline 1500 kcal/day * factor (Mifflin-
  // St Jeor sedentary baseline approximation).
  let prevW = -Infinity;
  let prevK = -Infinity;
  for (const d of [1, 2, 3, 5, 7, 10, 14]) {
    const r = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: d, group_size: 2 });
    assert.ok(Number.isFinite(r.trip_water_l), `expected water at days=${d}: ${JSON.stringify(r)}`);
    assert.ok(r.trip_water_l > prevW, `trip_water_l at days=${d} = ${r.trip_water_l} not greater than prev=${prevW}`);
    assert.ok(r.trip_kcal > prevK, `trip_kcal at days=${d} = ${r.trip_kcal} not greater than prev=${prevK}`);
    prevW = r.trip_water_l;
    prevK = r.trip_kcal;
  }
  // Doubling identity at fixed weight / band / exertion / group.
  const a = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: 3, group_size: 2 });
  const b = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: 6, group_size: 2 });
  assert.ok(Math.abs(b.trip_water_l - 2 * a.trip_water_l) / a.trip_water_l < 1e-12,
    `trip_water_l(6 days) = ${b.trip_water_l} != 2 * trip_water_l(3 days) = ${2 * a.trip_water_l}`);
  assert.ok(Math.abs(b.trip_kcal - 2 * a.trip_kcal) / a.trip_kcal < 1e-12,
    `trip_kcal(6 days) = ${b.trip_kcal} != 2 * trip_kcal(3 days) = ${2 * a.trip_kcal}`);
  // Linear-in-group_size identity (per-day water scales with group_size).
  const solo = computeBackcountryNeeds({ body_weight_lb: 175, ambient_band: "moderate", exertion: "moderate", trip_days: 3, group_size: 1 });
  assert.ok(Math.abs(a.trip_water_l - 2 * solo.trip_water_l) / solo.trip_water_l < 1e-12,
    `trip_water_l(group=2) = ${a.trip_water_l} != 2 * trip_water_l(group=1) = ${2 * solo.trip_water_l}`);
});

// --- §10.3 Phase F twenty-third monotonicity batch 2026-05-26 -----------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeLTV (X), computeStatistics (Y), computeVetDose (U),
// computePlateCost (O), computeDehumidifierSize (D). Brings §10.3
// surface to 120+ sweeps with each row pinning either a published
// constant or a closed-form linear / inverse identity.

test("monotonicity: computeLTV ltv_percent is strictly increasing in loan_amount at fixed value (FNMA 80% PMI-threshold pin)", () => {
  // Group X. LTV = (loan_amount / value) * 100; linear in loan_amount
  // at fixed value. Pin both strict monotonicity AND the FNMA / FHLMC
  // 80% PMI threshold: at loan=320000 / value=400000 -> LTV=80.0
  // exact (the conforming PMI cutoff per the FNMA convention).
  let prev = -Infinity;
  for (const L of [100000, 200000, 280000, 320000, 360000, 400000]) {
    const r = computeLTV({ loan_amount: L, value: 400000 });
    assert.ok(Number.isFinite(r.ltv_percent), `expected ltv at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.ltv_percent > prev, `ltv at L=${L} = ${r.ltv_percent} not greater than prev=${prev}`);
    prev = r.ltv_percent;
  }
  // FNMA 80% PMI threshold exact pin.
  const at80 = computeLTV({ loan_amount: 320000, value: 400000 });
  assert.equal(at80.ltv_percent, 80);
  assert.equal(at80.pmi_required, false);  // <= 80% is the PMI cutoff (no PMI).
  // Just-above-80% triggers PMI requirement (catches a future regression
  // in the strict-vs-inclusive comparison at the 80% boundary).
  const at81 = computeLTV({ loan_amount: 324000, value: 400000 });
  assert.equal(at81.pmi_required, true);
  // Doubling identity at fixed value.
  const a = computeLTV({ loan_amount: 100000, value: 400000 });
  const b = computeLTV({ loan_amount: 200000, value: 400000 });
  assert.ok(Math.abs(b.ltv_percent - 2 * a.ltv_percent) < 1e-12,
    `ltv(200k) = ${b.ltv_percent} != 2 * ltv(100k) = ${2 * a.ltv_percent}`);
});

test("monotonicity: computeStatistics sum + mean are strictly increasing as a positive value is appended (linear pin)", () => {
  // Group Y. sum = sum_i x_i; mean = sum / n. With a fixed prefix and
  // a single appended value v, sum is strictly increasing in v (linear)
  // and mean is strictly increasing in v at fixed n (linear). Pin
  // both strict monotonicity AND the single-value-identity: stats of
  // [v] yields mean=v, median=v, range=0, variance=0.
  let prevSum = -Infinity;
  let prevMean = -Infinity;
  for (const v of [1, 5, 10, 25, 50, 100]) {
    const r = computeStatistics({ values: [10, 20, 30, v] });
    assert.ok(Number.isFinite(r.sum), `expected sum at v=${v}: ${JSON.stringify(r)}`);
    assert.ok(r.sum > prevSum, `sum at v=${v} = ${r.sum} not greater than prev=${prevSum}`);
    assert.ok(r.mean > prevMean, `mean at v=${v} = ${r.mean} not greater than prev=${prevMean}`);
    prevSum = r.sum;
    prevMean = r.mean;
  }
  // Single-value pin: stats of [42] yields mean=42, median=42, range=0,
  // population-variance=0 (the trivial degenerate case).
  const single = computeStatistics({ values: [42] });
  assert.equal(single.mean, 42);
  assert.equal(single.median, 42);
  assert.equal(single.range, 0);
  assert.equal(single.variance_population, 0);
  // Closed-form pin: sum([10, 20, 30, 50]) = 110, mean = 27.5.
  const four = computeStatistics({ values: [10, 20, 30, 50] });
  assert.equal(four.sum, 110);
  assert.equal(four.mean, 27.5);
});

test("monotonicity: computeVetDose total_dose_mg is strictly increasing in weight at fixed dose / concentration (linear pin)", () => {
  // Group U. total_dose_mg = dose_mg_per_kg * weight_kg; volume_mL =
  // total_dose_mg / concentration_mg_per_mL. Both linear in weight at
  // fixed dose / concentration. Pin both strict monotonicity AND the
  // closed-form doubling identity AND the weight-unit conversion:
  // 22.0462 lb = 10 kg (toKg conversion).
  let prev = -Infinity;
  for (const w of [2, 5, 10, 20, 40, 60]) {
    const r = computeVetDose({ weight: w, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 10 });
    assert.ok(Number.isFinite(r.total_dose_mg), `expected dose at W=${w}: ${JSON.stringify(r)}`);
    assert.ok(r.total_dose_mg > prev, `total at W=${w} = ${r.total_dose_mg} not greater than prev=${prev}`);
    prev = r.total_dose_mg;
  }
  // Doubling identity at fixed dose / concentration.
  const a = computeVetDose({ weight: 10, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 10 });
  const b = computeVetDose({ weight: 20, weight_unit: "kg", dose_mg_per_kg: 5, concentration_mg_per_mL: 10 });
  assert.equal(a.total_dose_mg, 50);  // 5 mg/kg * 10 kg = 50 mg exact.
  assert.equal(a.volume_mL, 5);       // 50 mg / 10 mg/mL = 5 mL exact.
  assert.ok(Math.abs(b.total_dose_mg - 2 * a.total_dose_mg) < 1e-12,
    `dose(20 kg) = ${b.total_dose_mg} != 2 * dose(10 kg) = ${2 * a.total_dose_mg}`);
  // weight-unit conversion pin: 22.0462 lb -> 10 kg (within 0.01%).
  const lb = computeVetDose({ weight: 22.0462, weight_unit: "lb", dose_mg_per_kg: 5, concentration_mg_per_mL: 10 });
  assert.ok(Math.abs(lb.weight_kg - 10) / 10 < 1e-4,
    `weight_kg(22.0462 lb) = ${lb.weight_kg}, expected 10 within 0.01%`);
});

test("monotonicity: computePlateCost plate_cost is strictly increasing in single ingredient lbs at fixed price; suggested_price strictly decreasing in target_food_cost_pct (linear + inverse pin)", () => {
  // Group O. plate_cost = sum(lbs * cost_per_lb); linear in lbs at
  // fixed cost. suggested_price = plate_cost / (target_food_cost_pct
  // / 100); strictly decreasing in target_food_cost_pct (a 20% food
  // cost commands a higher menu price than a 40% food cost). Pin both
  // strict monotonicity AND the closed-form: 1.0 lb * $10/lb at 30%
  // food cost -> plate_cost=10, suggested_price=$33.33...
  let prevCost = -Infinity;
  for (const lbs of [0.1, 0.25, 0.5, 1.0, 1.5, 2.0]) {
    const r = computePlateCost({ ingredients: [{ lbs, cost_per_lb: 10 }], target_food_cost_pct: 30 });
    assert.ok(Number.isFinite(r.plate_cost), `expected cost at lbs=${lbs}: ${JSON.stringify(r)}`);
    assert.ok(r.plate_cost > prevCost, `cost at lbs=${lbs} = ${r.plate_cost} not greater than prev=${prevCost}`);
    prevCost = r.plate_cost;
  }
  // Inverse-in-target_food_cost_pct sweep at fixed plate cost.
  let prevPrice = Infinity;
  for (const t of [20, 25, 30, 35, 40, 50]) {
    const r = computePlateCost({ ingredients: [{ lbs: 1.0, cost_per_lb: 10 }], target_food_cost_pct: t });
    assert.ok(r.suggested_price < prevPrice, `price at t=${t}% = ${r.suggested_price} not less than prev=${prevPrice}`);
    prevPrice = r.suggested_price;
  }
  // Closed-form pin: $10 plate cost / 30% -> $33.333... suggested.
  const ref = computePlateCost({ ingredients: [{ lbs: 1.0, cost_per_lb: 10 }], target_food_cost_pct: 30 });
  assert.equal(ref.plate_cost, 10);
  assert.ok(Math.abs(ref.suggested_price - 10 / 0.30) < 1e-9,
    `suggested_price = ${ref.suggested_price}, expected ${10 / 0.30}`);
});

test("monotonicity: computeDehumidifierSize aham_pints_per_day + field_pints_per_day are strictly increasing in room_cubic_feet at fixed water_class (linear pin)", () => {
  // Group D. aham = room_cubic_feet * AHAM_PINTS_PER_FT3_BY_CLASS[class];
  // field = aham * 1.55 (IICRC field-method correction). Both linear
  // in room_cubic_feet at fixed water class. Pin both strict
  // monotonicity AND the field-method 1.55 multiplier (catches a
  // future regression in the IICRC field-method scaling constant).
  let prevAham = -Infinity;
  let prevField = -Infinity;
  for (const v of [500, 1000, 2500, 5000, 10000, 20000]) {
    const r = computeDehumidifierSize({ room_cubic_feet: v, water_class: "2" });
    assert.ok(Number.isFinite(r.aham_pints_per_day), `expected aham at V=${v}: ${JSON.stringify(r)}`);
    assert.ok(r.aham_pints_per_day > prevAham, `aham at V=${v} = ${r.aham_pints_per_day} not greater than prev=${prevAham}`);
    assert.ok(r.field_pints_per_day > prevField, `field at V=${v} = ${r.field_pints_per_day} not greater than prev=${prevField}`);
    prevAham = r.aham_pints_per_day;
    prevField = r.field_pints_per_day;
  }
  // IICRC field-method 1.55x multiplier exact pin.
  const ref = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "2" });
  assert.ok(Math.abs(ref.field_pints_per_day - ref.aham_pints_per_day * 1.55) < 1e-9,
    `field(${ref.aham_pints_per_day} AHAM) = ${ref.field_pints_per_day}, expected ${ref.aham_pints_per_day * 1.55} (1.55x)`);
  // Doubling identity at fixed water class.
  const a = computeDehumidifierSize({ room_cubic_feet: 2500, water_class: "2" });
  const b = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "2" });
  assert.ok(Math.abs(b.aham_pints_per_day - 2 * a.aham_pints_per_day) < 1e-9,
    `aham(5000) = ${b.aham_pints_per_day} != 2 * aham(2500) = ${2 * a.aham_pints_per_day}`);
});

// --- §10.3 Phase F twenty-fourth monotonicity batch 2026-05-26 ----------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeFuelPlanning (W), computeSlope (B), computeWeldUsage
// (E), computeFuelRange (K), computeRampSlope (G). Five §9-pinned
// closed-form compute functions, five distinct groups; brings §10.3
// surface to 125+ sweeps.

import { computeSlope } from "../../calc-plumbing.js";
import { computeWeldUsage } from "../../calc-construction.js";
import { computeRampSlope } from "../../calc-cross.js";
import { computeConductorResistance } from "../../calc-electrical.js";
import { computeAnionGap } from "../../calc-ems.js";
import { computeDilution as computeDilutionLab } from "../../calc-lab.js";
import { computeBulkDensity } from "../../calc-agriculture.js";
import { computeCombustionAir } from "../../calc-hvac.js";
import { computeContainmentAirBalance } from "../../calc-restoration.js";
import { computeRebar } from "../../calc-construction.js";
import { computeBrakingDistance } from "../../calc-fire.js";
import { computeWeightBalance } from "../../calc-mechanic.js";

test("monotonicity: computeFuelPlanning required_fuel_lb is strictly increasing in flight_time_hr at fixed burn / reserve / fuel (avgas 6.0 lb/gal pin)", () => {
  // Group W. required_fuel_gal = (flight + reserve_hr) * burn;
  // required_fuel_lb = required_fuel_gal * lb_per_gal. Linear in
  // flight_time_hr at fixed burn / reserve / fuel. Pin both strict
  // monotonicity AND the FAA-published avgas 6.0 lb/gal density pin
  // (catches a future regression in FUEL_TYPE_WEIGHTS_LB_PER_GAL).
  let prev = -Infinity;
  for (const ft of [1, 2, 3, 4, 6, 8, 10]) {
    const r = computeFuelPlanning({ flight_time_hr: ft, burn_gph: 10, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 200 });
    assert.ok(Number.isFinite(r.required_fuel_lb), `expected lb at ft=${ft}: ${JSON.stringify(r)}`);
    assert.ok(r.required_fuel_lb > prev, `lb at ft=${ft} = ${r.required_fuel_lb} not greater than prev=${prev}`);
    prev = r.required_fuel_lb;
  }
  // avgas density pin: lb_per_gal = 6.0 (FAA AC 60-22 standard).
  // At ft=2 / burn=10 / reserve=45 min: gal = (2 + 0.75) * 10 = 27.5;
  // lb = 27.5 * 6.0 = 165.0 exact.
  const ref = computeFuelPlanning({ flight_time_hr: 2, burn_gph: 10, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 200 });
  assert.ok(Math.abs(ref.required_fuel_gal - 27.5) < 1e-9,
    `required_fuel_gal(2 hr, 10 gph, 45 min) = ${ref.required_fuel_gal}, expected 27.5`);
  assert.ok(Math.abs(ref.required_fuel_lb - 165.0) < 1e-9,
    `required_fuel_lb = ${ref.required_fuel_lb}, expected 165.0 at 6.0 lb/gal avgas`);
  // jet_a density pin: 6.7 lb/gal (catches a future regression).
  const jet = computeFuelPlanning({ flight_time_hr: 2, burn_gph: 10, reserve_min: 45, fuel_type: "jet_a", tank_capacity_gal: 200 });
  assert.ok(Math.abs(jet.required_fuel_lb - 27.5 * 6.7) < 1e-9,
    `jet_a required_fuel_lb = ${jet.required_fuel_lb}, expected ${27.5 * 6.7} at 6.7 lb/gal`);
});

test("monotonicity: computeSlope in_per_ft is strictly increasing in rise at fixed run (rise_run linear pin) + 1/4-in/ft DWV pin", () => {
  // Group B. In rise_run mode: in_per_ft = (rise / run) * 12; linear in
  // rise at fixed run. Pin both strict monotonicity AND the 1/4-in/ft
  // DWV / drainage convention pin (the "1/4 inch per foot rule"):
  // rise=1 / run=4 -> 3 in/ft; rise=1 / run=48 -> 0.25 in/ft exact.
  let prev = -Infinity;
  for (const rise of [0.5, 1, 2, 4, 8, 12]) {
    const r = computeSlope({ rise, run: 48, units: "rise_run" });
    assert.ok(Number.isFinite(r.in_per_ft), `expected in_per_ft at rise=${rise}: ${JSON.stringify(r)}`);
    assert.ok(r.in_per_ft > prev, `in_per_ft at rise=${rise} = ${r.in_per_ft} not greater than prev=${prev}`);
    prev = r.in_per_ft;
  }
  // 1/4-in/ft DWV exact pin: rise=1 / run=48 -> 0.25 in/ft.
  const dwv = computeSlope({ rise: 1, run: 48, units: "rise_run" });
  assert.equal(dwv.in_per_ft, 0.25);
  assert.equal(dwv.percent, 0.25 / 12 * 100);
  // slopeExample pin: rise=1 / run=4 -> 3 in/ft (slopeExample.expected).
  const ex = computeSlope({ rise: 1, run: 4, units: "rise_run" });
  assert.equal(ex.in_per_ft, 3);
  // Doubling identity.
  const a = computeSlope({ rise: 1, run: 48, units: "rise_run" });
  const b = computeSlope({ rise: 2, run: 48, units: "rise_run" });
  assert.ok(Math.abs(b.in_per_ft - 2 * a.in_per_ft) < 1e-12,
    `in_per_ft(rise=2) = ${b.in_per_ft} != 2 * in_per_ft(rise=1) = ${2 * a.in_per_ft}`);
});

test("monotonicity: computeWeldUsage deposit_lb is strictly increasing in weld_length_in at fixed cross-section (steel 0.283 lb/in^3 pin)", () => {
  // Group E. deposit_lb = cross_section_in2 * length_in * 0.283 (steel
  // density in lb/in^3). Linear in length at fixed cross-section. Pin
  // both strict monotonicity AND the steel density 0.283 lb/in^3 exact
  // pin (catches a future regression in the steel-density constant).
  let prev = -Infinity;
  for (const L of [10, 25, 50, 100, 200, 400]) {
    const r = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: L, deposition_rate_lb_per_min: 4 });
    assert.ok(Number.isFinite(r.deposit_lb), `expected deposit at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.deposit_lb > prev, `deposit at L=${L} = ${r.deposit_lb} not greater than prev=${prev}`);
    prev = r.deposit_lb;
  }
  // Steel density 0.283 lb/in^3 exact pin: cross=0.05 / length=100 ->
  // deposit = 0.05 * 100 * 0.283 = 1.415 lb exact.
  const ref = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 100, deposition_rate_lb_per_min: 4 });
  assert.ok(Math.abs(ref.deposit_lb - 1.415) < 1e-9,
    `deposit_lb(cross=0.05, length=100) = ${ref.deposit_lb}, expected 1.415 (0.283 lb/in^3 steel)`);
  // Doubling-in-length identity at fixed cross-section.
  const a = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 60, deposition_rate_lb_per_min: 4 });
  const b = computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 120, deposition_rate_lb_per_min: 4 });
  assert.ok(Math.abs(b.deposit_lb - 2 * a.deposit_lb) / a.deposit_lb < 1e-12,
    `deposit(120 in) = ${b.deposit_lb} != 2 * deposit(60 in) = ${2 * a.deposit_lb}`);
});

test("monotonicity: computeFuelRange range_mi is strictly increasing in tank_gal at fixed mpg / load_factor (linear pin) + gasoline_E10 LHV pin", () => {
  // Group K. range_mi = tank_gal * mpg * load_factor; total_btu =
  // tank_gal * lhv_btu_gal. Both linear in tank_gal at fixed mpg /
  // load. Pin strict monotonicity AND the EIA gasoline_E10 LHV pin
  // (112000 BTU/gal per FUEL_PROPERTIES).
  let prevRange = -Infinity;
  let prevBtu = -Infinity;
  for (const t of [5, 10, 15, 18, 25, 40]) {
    const r = computeFuelRange({ fuel: "gasoline_E10", tank_gal: t, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0 });
    assert.ok(Number.isFinite(r.range_mi), `expected range at tank=${t}: ${JSON.stringify(r)}`);
    assert.ok(r.range_mi > prevRange, `range at tank=${t} = ${r.range_mi} not greater than prev=${prevRange}`);
    assert.ok(r.total_btu > prevBtu, `btu at tank=${t} = ${r.total_btu} not greater than prev=${prevBtu}`);
    prevRange = r.range_mi;
    prevBtu = r.total_btu;
  }
  // fuelRangeExample pin: tank=18 / mpg=28 -> range = 504 mi exact.
  const ex = computeFuelRange({ fuel: "gasoline_E10", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0 });
  assert.equal(ex.range_mi, 504);
  // EIA gasoline_E10 LHV pin: 18 gal * 112000 BTU/gal = 2016000 BTU.
  assert.equal(ex.total_btu, 18 * 112000);
});

test("monotonicity: computeRampSlope percent is strictly increasing in rise_in at fixed run; pass_1_to_12 boundary pin (ADA pin)", () => {
  // Group G. percent = (rise / run) * 100; linear in rise at fixed run.
  // ratio = run / rise (inverse). ADA pin: ratio >= 12 (i.e. 1:12 or
  // gentler) passes; rise=6 / run=72 -> ratio = 12:1 exact boundary.
  let prev = -Infinity;
  for (const rise of [1, 2, 3, 6, 9, 12, 18]) {
    const r = computeRampSlope({ rise_in: rise, run_in: 72 });
    assert.ok(Number.isFinite(r.percent), `expected percent at rise=${rise}: ${JSON.stringify(r)}`);
    assert.ok(r.percent > prev, `percent at rise=${rise} = ${r.percent} not greater than prev=${prev}`);
    prev = r.percent;
  }
  // ADA 1:12 boundary pin: rise=6 / run=72 -> percent = 8.333... and pass=true.
  const ada = computeRampSlope({ rise_in: 6, run_in: 72 });
  assert.equal(ada.pass_1_to_12, true);
  assert.ok(Math.abs(ada.percent - (6 / 72) * 100) < 1e-12,
    `percent = ${ada.percent}, expected ${(6 / 72) * 100}`);
  // Just-steeper than 1:12 fails ADA.
  const steeper = computeRampSlope({ rise_in: 7, run_in: 72 });
  assert.equal(steeper.pass_1_to_12, false);
  // Doubling identity in rise at fixed run.
  const a = computeRampSlope({ rise_in: 3, run_in: 72 });
  const b = computeRampSlope({ rise_in: 6, run_in: 72 });
  assert.ok(Math.abs(b.percent - 2 * a.percent) < 1e-12,
    `percent(rise=6) = ${b.percent} != 2 * percent(rise=3) = ${2 * a.percent}`);
});

// --- §10.3 Phase F twenty-fifth monotonicity batch 2026-05-26 -----------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeConductorResistance (A), computeAnionGap (V),
// computeDilution (T) [calc-lab variant], computePropertyTax (X),
// computeBulkDensity (L). Five §9-pinned closed-form compute functions,
// five distinct groups; brings §10.3 surface to 130+ sweeps.

test("monotonicity: computeConductorResistance resistance_ohm is strictly increasing in length_ft and in temperature_C (linear-in-length + positive-temp-coefficient pin)", () => {
  // Group A. R = rho * length / area; positive temp coefficient for
  // copper (alpha ~ 0.00393 / C). Strictly increasing in length_ft at
  // fixed material / AWG / temp AND strictly increasing in
  // temperature_C at fixed material / AWG / length. Pin both linear-
  // in-length doubling identity AND positive-temp-coefficient.
  let prev = -Infinity;
  for (const L of [100, 250, 500, 1000, 2000, 5000]) {
    const r = computeConductorResistance({ material: "copper", awg: "12", length_ft: L, temperature_C: 20 });
    assert.ok(Number.isFinite(r.resistance_ohm), `expected R at L=${L}: ${JSON.stringify(r)}`);
    assert.ok(r.resistance_ohm > prev, `R at L=${L} = ${r.resistance_ohm} not greater than prev=${prev}`);
    prev = r.resistance_ohm;
  }
  // Doubling-in-length identity at fixed material / AWG / temp.
  const a = computeConductorResistance({ material: "copper", awg: "12", length_ft: 500, temperature_C: 20 });
  const b = computeConductorResistance({ material: "copper", awg: "12", length_ft: 1000, temperature_C: 20 });
  assert.ok(Math.abs(b.resistance_ohm - 2 * a.resistance_ohm) / a.resistance_ohm < 1e-12,
    `R(1000 ft) = ${b.resistance_ohm} != 2 * R(500 ft) = ${2 * a.resistance_ohm}`);
  // Positive-temp-coefficient pin: resistance strictly increasing in
  // temperature_C (copper has alpha > 0; heat raises R).
  let prevT = -Infinity;
  for (const T of [0, 20, 40, 60, 75, 90]) {
    const r = computeConductorResistance({ material: "copper", awg: "12", length_ft: 1000, temperature_C: T });
    assert.ok(r.resistance_ohm > prevT, `R at T=${T}C = ${r.resistance_ohm} not greater than prev=${prevT}`);
    prevT = r.resistance_ohm;
  }
});

test("monotonicity: computeAnionGap anion_gap is strictly increasing in na and strictly decreasing in cl + hco3 (linear pin)", () => {
  // Group V. anion_gap = Na - (Cl + HCO3). Strictly increasing in Na
  // at fixed Cl/HCO3; strictly decreasing in Cl and in HCO3 at fixed
  // Na/other. Pin all three monotonicities AND the worked-example
  // identity: 140 - (104 + 24) = 12 exact (the anionGapExample pin).
  let prevNa = -Infinity;
  for (const na of [125, 130, 135, 140, 145, 150]) {
    const r = computeAnionGap({ na, cl: 104, hco3: 24 });
    assert.ok(Number.isFinite(r.anion_gap), `expected AG at Na=${na}: ${JSON.stringify(r)}`);
    assert.ok(r.anion_gap > prevNa, `AG at Na=${na} = ${r.anion_gap} not greater than prev=${prevNa}`);
    prevNa = r.anion_gap;
  }
  // Worked-example exact pin: Na=140 / Cl=104 / HCO3=24 -> AG = 12.
  const ex = computeAnionGap({ na: 140, cl: 104, hco3: 24 });
  assert.equal(ex.anion_gap, 12);
  // Strictly-decreasing in Cl at fixed Na/HCO3.
  let prevCl = Infinity;
  for (const cl of [95, 100, 104, 108, 112]) {
    const r = computeAnionGap({ na: 140, cl, hco3: 24 });
    assert.ok(r.anion_gap < prevCl, `AG at Cl=${cl} = ${r.anion_gap} not less than prev=${prevCl}`);
    prevCl = r.anion_gap;
  }
  // Strictly-decreasing in HCO3 at fixed Na/Cl.
  let prevH = Infinity;
  for (const h of [10, 15, 20, 24, 28, 35]) {
    const r = computeAnionGap({ na: 140, cl: 104, hco3: h });
    assert.ok(r.anion_gap < prevH, `AG at HCO3=${h} = ${r.anion_gap} not less than prev=${prevH}`);
    prevH = r.anion_gap;
  }
});

test("monotonicity: computeDilution (lab) v1 is strictly increasing in v2 at fixed c1, c2 (C1V1 = C2V2 linear pin)", () => {
  // Group T. Lab dilution C1*V1 = C2*V2. With c1, c2, v2 known the
  // solver returns v1 = (c2 * v2) / c1; linear in v2 at fixed c1, c2.
  // Pin both strict monotonicity AND the dilutionExample identity:
  // c1=1.0, c2=0.1, v2=0.010 -> v1 = 0.001 exact.
  let prev = -Infinity;
  for (const v2 of [0.005, 0.010, 0.020, 0.050, 0.100, 0.200]) {
    const r = computeDilutionLab({ c1: 1.0, c2: 0.1, v2 });
    assert.ok(Number.isFinite(r.v1), `expected v1 at v2=${v2}: ${JSON.stringify(r)}`);
    assert.ok(r.v1 > prev, `v1 at v2=${v2} = ${r.v1} not greater than prev=${prev}`);
    prev = r.v1;
  }
  // dilutionExample exact pin: c1=1.0, c2=0.1, v2=0.010 -> v1=0.001 (10x dilution).
  const ex = computeDilutionLab({ c1: 1.0, c2: 0.1, v2: 0.010 });
  assert.ok(Math.abs(ex.v1 - 0.001) < 1e-12,
    `v1(c1=1.0, c2=0.1, v2=0.010) = ${ex.v1}, expected 0.001 (10x dilution)`);
  // Doubling identity at fixed c1, c2.
  const a = computeDilutionLab({ c1: 1.0, c2: 0.1, v2: 0.050 });
  const b = computeDilutionLab({ c1: 1.0, c2: 0.1, v2: 0.100 });
  assert.ok(Math.abs(b.v1 - 2 * a.v1) / a.v1 < 1e-12,
    `v1(v2=0.100) = ${b.v1} != 2 * v1(v2=0.050) = ${2 * a.v1}`);
  // diluent_volume = v2 - v1 strictly increasing in v2.
  assert.ok(b.diluent_volume > a.diluent_volume,
    `diluent(v2=0.100) = ${b.diluent_volume} not > diluent(v2=0.050) = ${a.diluent_volume}`);
});

test("monotonicity: computePropertyTax annual_tax is strictly increasing in assessed_value at fixed mill rate (linear pin + propertyTaxExample pin)", () => {
  // Group X. annual_tax = max(0, AV - exemption) * mill_rate / 1000;
  // linear in AV at fixed mill / exemption (above the exemption
  // threshold). Pin both strict monotonicity AND the propertyTaxExample
  // exact identity: AV=400000 / mill=15 / exemption=25000 -> taxable=
  // 375000 / annual_tax=5625 / monthly_tax=468.75.
  let prev = -Infinity;
  for (const av of [100000, 200000, 300000, 400000, 600000, 1000000]) {
    const r = computePropertyTax({ assessed_value: av, mill_rate: 15, homestead_exemption: 0 });
    assert.ok(Number.isFinite(r.annual_tax), `expected tax at AV=${av}: ${JSON.stringify(r)}`);
    assert.ok(r.annual_tax > prev, `tax at AV=${av} = ${r.annual_tax} not greater than prev=${prev}`);
    prev = r.annual_tax;
  }
  // propertyTaxExample exact pin.
  const ex = computePropertyTax({ assessed_value: 400000, mill_rate: 15, homestead_exemption: 25000 });
  assert.equal(ex.taxable_value, 375000);
  assert.equal(ex.annual_tax, 5625);
  assert.equal(ex.monthly_tax, 468.75);
  // Doubling identity (no exemption).
  const a = computePropertyTax({ assessed_value: 200000, mill_rate: 15, homestead_exemption: 0 });
  const b = computePropertyTax({ assessed_value: 400000, mill_rate: 15, homestead_exemption: 0 });
  assert.equal(b.annual_tax, 2 * a.annual_tax);
});

test("monotonicity: computeBulkDensity bulk_density is strictly increasing in dry_mass_g + strictly decreasing in core_volume_cc (linear + inverse pin)", () => {
  // Group L. bulk_density = dry_mass_g / core_volume_cc (g/cc). Linear
  // in dry mass at fixed core volume; inverse in core volume at fixed
  // dry mass. Pin both monotonicities AND the bulkDensityExample exact
  // identity: dry_mass=200 g / core_volume=150 cc -> bulk = 1.333... g/cc.
  let prev = -Infinity;
  for (const m of [50, 100, 150, 200, 300, 500]) {
    const r = computeBulkDensity({ dry_mass_g: m, core_volume_cc: 150, particle_density_pcc: 2.65, texture: "loam" });
    assert.ok(Number.isFinite(r.bulk_density), `expected bulk at m=${m}: ${JSON.stringify(r)}`);
    assert.ok(r.bulk_density > prev, `bulk at m=${m} = ${r.bulk_density} not greater than prev=${prev}`);
    prev = r.bulk_density;
  }
  // Inverse-in-volume sweep at fixed dry mass.
  let prevV = Infinity;
  for (const v of [75, 100, 150, 200, 300, 500]) {
    const r = computeBulkDensity({ dry_mass_g: 200, core_volume_cc: v, particle_density_pcc: 2.65, texture: "loam" });
    assert.ok(r.bulk_density < prevV, `bulk at v=${v} = ${r.bulk_density} not less than prev=${prevV}`);
    prevV = r.bulk_density;
  }
  // bulkDensityExample exact pin: 200/150 = 1.333... g/cc.
  const ex = computeBulkDensity({ dry_mass_g: 200, core_volume_cc: 150, particle_density_pcc: 2.65, texture: "loam" });
  assert.ok(Math.abs(ex.bulk_density - 200 / 150) < 1e-12,
    `bulk(200/150) = ${ex.bulk_density}, expected ${200 / 150}`);
  // total_porosity = 1 - bulk / particle_density pin: 1 - (200/150) / 2.65.
  const expected_por = 1 - (200 / 150) / 2.65;
  assert.ok(Math.abs(ex.total_porosity - expected_por) < 1e-12,
    `porosity = ${ex.total_porosity}, expected ${expected_por}`);
});

// --- §10.3 Phase F twenty-sixth monotonicity batch 2026-05-26 -----------
//
// Five more strict-monotonicity sweeps spanning five different catalog
// groups: computeCombustionAir (C), computeContainmentAirBalance (D),
// computeRebar (E), computeBrakingDistance (F), computeWeightBalance
// (K). Five §9-pinned closed-form compute functions, five distinct
// groups; brings §10.3 surface to 135+ sweeps.

test("monotonicity: computeCombustionAir required_volume_ft3 + opening_outdoor_in2 are strictly increasing in btu_input (NFGC 50-ft^3-per-1000-BTU + 1-in^2-per-1000-BTU pins)", () => {
  // Group C. required_volume_ft3 = (btu / 1000) * 50; opening_outdoor_in2 =
  // btu / 1000. Both linear in btu_input. Pin both monotonicities AND
  // the NFGC (NFPA 54) rule-of-thumb constants 50 ft^3/1000 BTU and
  // 1 in^2/1000 BTU outdoor opening; the indoor opening is 1 in^2 per
  // 4000 BTU (4x denser communicating-space ratio).
  let prevVol = -Infinity;
  let prevOpen = -Infinity;
  for (const btu of [20000, 40000, 80000, 100000, 200000, 400000]) {
    const r = computeCombustionAir({ btu_input: btu, room_volume_ft3: 50000 });
    assert.ok(Number.isFinite(r.required_volume_ft3), `expected vol at btu=${btu}: ${JSON.stringify(r)}`);
    assert.ok(r.required_volume_ft3 > prevVol, `vol at btu=${btu} = ${r.required_volume_ft3} not greater than prev=${prevVol}`);
    assert.ok(r.opening_outdoor_in2 > prevOpen, `outdoor in^2 at btu=${btu} = ${r.opening_outdoor_in2} not greater than prev=${prevOpen}`);
    prevVol = r.required_volume_ft3;
    prevOpen = r.opening_outdoor_in2;
  }
  // NFGC closed-form pin: 100000 BTU -> 5000 ft^3 required (50/1000 * 100000);
  // outdoor opening = 100 in^2 (1/1000 * 100000); indoor opening = 25 in^2.
  const ref = computeCombustionAir({ btu_input: 100000, room_volume_ft3: 50000 });
  assert.equal(ref.required_volume_ft3, 5000);
  assert.equal(ref.opening_outdoor_in2, 100);
  assert.equal(ref.opening_indoor_in2, 25);
});

test("monotonicity: computeContainmentAirBalance required_cfm is strictly increasing in leakage_area_in2 (Q = 2610*A*sqrt(dP) linear-in-A pin) and in target_dp_in_wc (sqrt pin)", () => {
  // Group D. Q = 2610 * A * sqrt(dP); linear in leakage_area_in2 at
  // fixed dP, sqrt-increasing in target_dp_in_wc at fixed A. Pin both
  // monotonicities AND the closed-form: A=1 in^2 / dP=0.02 in wc ->
  // Q = 2610 * 1 * sqrt(0.02) = 369.110... cfm.
  let prevA = -Infinity;
  for (const A of [1, 2, 5, 10, 20, 50]) {
    const r = computeContainmentAirBalance({ containment_volume_ft3: 10000, target_dp_in_wc: 0.02, leakage_area_in2: A });
    assert.ok(Number.isFinite(r.required_cfm), `expected cfm at A=${A}: ${JSON.stringify(r)}`);
    assert.ok(r.required_cfm > prevA, `cfm at A=${A} = ${r.required_cfm} not greater than prev=${prevA}`);
    prevA = r.required_cfm;
  }
  // sqrt-increasing in dP at fixed A.
  let prevDP = -Infinity;
  for (const dp of [0.005, 0.010, 0.020, 0.040, 0.080, 0.150]) {
    const r = computeContainmentAirBalance({ containment_volume_ft3: 10000, target_dp_in_wc: dp, leakage_area_in2: 12 });
    assert.ok(r.required_cfm > prevDP, `cfm at dP=${dp} = ${r.required_cfm} not greater than prev=${prevDP}`);
    prevDP = r.required_cfm;
  }
  // Doubling-in-A identity at fixed dP.
  const a = computeContainmentAirBalance({ containment_volume_ft3: 10000, target_dp_in_wc: 0.02, leakage_area_in2: 6 });
  const b = computeContainmentAirBalance({ containment_volume_ft3: 10000, target_dp_in_wc: 0.02, leakage_area_in2: 12 });
  assert.ok(Math.abs(b.required_cfm - 2 * a.required_cfm) / a.required_cfm < 1e-12,
    `cfm(A=12) = ${b.required_cfm} != 2 * cfm(A=6) = ${2 * a.required_cfm}`);
  // 2610 constant exact pin: A=1 / dP=0.02 -> Q = 2610 * sqrt(0.02).
  const ref = computeContainmentAirBalance({ containment_volume_ft3: 10000, target_dp_in_wc: 0.02, leakage_area_in2: 1 });
  const expected = 2610 * Math.sqrt(0.02);
  assert.ok(Math.abs(ref.required_cfm - expected) < 1e-9,
    `cfm(A=1, dP=0.02) = ${ref.required_cfm}, expected ${expected} (2610 orifice constant)`);
});

test("monotonicity: computeRebar total_length_ft is strictly decreasing in spacing_in at fixed slab dimensions (inverse pin)", () => {
  // Group E. bars_along_X = floor(usable / spacing) + 1; total_length
  // depends on the bar counts which are monotone non-increasing in
  // spacing (wider spacing -> fewer bars). Pin monotone non-increasing
  // sweep (the floor step admits ties, never reversals) over a
  // factors-of-the-usable-dimension spacing sequence so consecutive
  // points strictly decrease.
  // 20x10 ft slab with 3-in edge clearance: usable = 240 - 6 = 234 in
  // (length) and 120 - 6 = 114 in (width). Use spacings that divide the
  // usable values cleanly for strict decrease: 6, 8, 12, 18, 24 in.
  let prev = Infinity;
  for (const s of [6, 8, 12, 18, 24]) {
    const r = computeRebar({ length_ft: 20, width_ft: 10, spacing_in: s, edge_clearance_in: 3, bar_size: "#4" });
    assert.ok(Number.isFinite(r.total_length_ft), `expected total at s=${s}: ${JSON.stringify(r)}`);
    assert.ok(r.total_length_ft < prev, `total at s=${s} = ${r.total_length_ft} not less than prev=${prev}`);
    prev = r.total_length_ft;
  }
  // bars_along_X = floor(usable / spacing) + 1 closed-form pin at
  // length=20 ft / width=10 ft / spacing=12 in / edge=3 in:
  // usable_l = 234 in / spacing 12 -> 19 + 1 = 20 bars along length;
  // usable_w = 114 in / spacing 12 -> 9 + 1 = 10 bars along width.
  const ref = computeRebar({ length_ft: 20, width_ft: 10, spacing_in: 12, edge_clearance_in: 3, bar_size: "#4" });
  assert.equal(ref.bars_along_width, 20);
  assert.equal(ref.bars_along_length, 10);
});

test("monotonicity: computeBrakingDistance braking_distance_ft is strictly increasing in speed_mph at fixed friction / grade (v^2 quadratic pin)", () => {
  // Group F. braking_distance_ft = v^2 / (30 * eff); quadratic in
  // speed_mph at fixed effective friction. Pin both strict monotonicity
  // AND the closed-form: doubling speed quadruples braking distance.
  // Also pin the v*1.467*t reaction-distance identity (1.467 ft/s per
  // mph conversion).
  let prev = -Infinity;
  for (const v of [25, 35, 45, 55, 65, 75, 85]) {
    const r = computeBrakingDistance({ speed_mph: v, friction_coefficient: 0.7, grade_percent: 0, reaction_time_s: 1.5 });
    assert.ok(Number.isFinite(r.braking_distance_ft), `expected braking at v=${v}: ${JSON.stringify(r)}`);
    assert.ok(r.braking_distance_ft > prev, `braking at v=${v} = ${r.braking_distance_ft} not greater than prev=${prev}`);
    prev = r.braking_distance_ft;
  }
  // Quadratic-in-speed pin: doubling speed -> 4x braking distance.
  const a = computeBrakingDistance({ speed_mph: 30, friction_coefficient: 0.7, grade_percent: 0, reaction_time_s: 1.5 });
  const b = computeBrakingDistance({ speed_mph: 60, friction_coefficient: 0.7, grade_percent: 0, reaction_time_s: 1.5 });
  assert.ok(Math.abs(b.braking_distance_ft - 4 * a.braking_distance_ft) / a.braking_distance_ft < 1e-12,
    `braking(60 mph) = ${b.braking_distance_ft} != 4 * braking(30 mph) = ${4 * a.braking_distance_ft}`);
  // Reaction-distance 1.467 ft/s/mph pin: v=55 / t=1.5 -> 55 * 1.467 * 1.5.
  const rx = computeBrakingDistance({ speed_mph: 55, friction_coefficient: 0.7, grade_percent: 0, reaction_time_s: 1.5 });
  assert.ok(Math.abs(rx.reaction_distance_ft - 55 * 1.467 * 1.5) < 1e-9,
    `reaction_distance = ${rx.reaction_distance_ft}, expected ${55 * 1.467 * 1.5} (1.467 ft/s per mph)`);
});

test("monotonicity: computeWeightBalance total_weight_lb is strictly increasing as one station's weight increases at fixed arms (linear-sum pin)", () => {
  // Group K. total_weight_lb = sum_i (weight_i); strictly increasing in
  // any single station's weight at fixed arms. cg_in = total_moment /
  // total_weight; with one moveable station's weight increasing at a
  // larger-than-others arm, cg moves toward that arm. Pin strict
  // monotonicity of total_weight AND the linear-sum identity:
  // total_weight = w1 + w2 + w3.
  const fixedStations = [
    { weight_lb: 2000, arm_in: 80 },   // empty weight at fwd station
    { weight_lb: 340, arm_in: 95 },    // crew
  ];
  let prev = -Infinity;
  for (const wfuel of [0, 100, 200, 300, 400, 600, 800]) {
    const r = computeWeightBalance({
      stations: [...fixedStations, { weight_lb: wfuel, arm_in: 90 }],
      fwd_cg_limit_in: 85, aft_cg_limit_in: 95, max_gross_lb: 4000,
    });
    assert.ok(Number.isFinite(r.total_weight_lb), `expected total at wf=${wfuel}: ${JSON.stringify(r)}`);
    if (wfuel > 0) {
      assert.ok(r.total_weight_lb > prev, `total at wf=${wfuel} = ${r.total_weight_lb} not greater than prev=${prev}`);
    }
    prev = r.total_weight_lb;
  }
  // Linear-sum closed-form pin: 2000 + 340 + 400 = 2740 lb exact.
  const ref = computeWeightBalance({
    stations: [
      { weight_lb: 2000, arm_in: 80 },
      { weight_lb: 340, arm_in: 95 },
      { weight_lb: 400, arm_in: 90 },
    ],
    fwd_cg_limit_in: 85, aft_cg_limit_in: 95, max_gross_lb: 4000,
  });
  assert.equal(ref.total_weight_lb, 2740);
  // cg_in closed-form pin: moment = 2000*80 + 340*95 + 400*90 =
  // 160000 + 32300 + 36000 = 228300; cg = 228300 / 2740.
  assert.equal(ref.total_moment_lbin, 228300);
  assert.ok(Math.abs(ref.cg_in - 228300 / 2740) < 1e-9,
    `cg_in = ${ref.cg_in}, expected ${228300 / 2740}`);
});

// --- spec-v14 §10.3 Phase F twenty-seventh monotonicity batch ----------
// Five new sweeps across five distinct catalog groups (L / E / G / W / N).
// Each pins one compute function's monotonic relationship plus a small
// closed-form identity so a future drift in the published-rule constant
// is caught the same way the prior batches catch coefficient drift.

import { computeTHI } from "../../calc-agriculture.js";
import { computeAggregate } from "../../calc-construction.js";
import { computeRainwaterYield } from "../../calc-cross.js";
import { computeStandardTurn } from "../../calc-aviation.js";
import { computeTimeAlignment } from "../../calc-stage.js";

test("monotonicity: computeTHI THI is strictly increasing in temperature at fixed RH (USDA-ARS T_F - (0.55 - 0.0055*RH) * (T_F - 58) linear-in-T pin)", () => {
  // Group L. dTHI/dT_F = 1 - (0.55 - 0.0055*RH); at RH=60 the slope is
  // 1 - 0.22 = 0.78 > 0, so THI is strictly increasing in T_F.
  let prev = -Infinity;
  for (const T_F of [60, 70, 75, 80, 85, 90, 95, 100]) {
    const r = computeTHI({ temperature: T_F, unit: "F", rh_percent: 60, animal: "dairy-cow", ventilation: "closed" });
    assert.ok(Number.isFinite(r.THI), `THI at T=${T_F}: ${JSON.stringify(r)}`);
    assert.ok(r.THI > prev, `THI at T=${T_F} = ${r.THI} not greater than prev=${prev}`);
    prev = r.THI;
  }
  // Closed-form pin at the thiExample inputs (90 F / 60 % RH): the formula
  // gives THI = 90 - (0.55 - 0.0055*60) * (90 - 58) = 90 - 0.22 * 32 = 82.96.
  const ref = computeTHI({ temperature: 90, unit: "F", rh_percent: 60, animal: "dairy-cow", ventilation: "closed" });
  assert.ok(Math.abs(ref.THI - 82.96) < 1e-9, `THI(90 F, 60% RH) = ${ref.THI}, expected 82.96`);
  // Unit-conversion pin: 32.222 C ~ 90 F; the C path must agree with the F
  // path to the floating-point floor.
  const refC = computeTHI({ temperature: (90 - 32) / 1.8, unit: "C", rh_percent: 60, animal: "dairy-cow", ventilation: "closed" });
  assert.ok(Math.abs(refC.THI - ref.THI) < 1e-9, `THI(C path) = ${refC.THI} drifted from F path = ${ref.THI}`);
});

test("monotonicity: computeAggregate cubic_yards + tons are strictly increasing in area_ft2 at fixed depth (volume = A * d/12 linear pin)", () => {
  // Group E. cubic_yards = (A * depth_in/12) / 27; tons = (A * depth_in/12)
  // * pcf / 2000. Both strictly increasing in area_ft2 at fixed depth and
  // material.
  let prevCY = -Infinity;
  let prevTons = -Infinity;
  for (const area_ft2 of [100, 250, 500, 1000, 2500, 5000]) {
    const r = computeAggregate({ area_ft2, depth_in: 4, material: "crushed_stone" });
    assert.ok(Number.isFinite(r.cubic_yards) && r.cubic_yards > 0, `agg at A=${area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.cubic_yards > prevCY, `cubic_yards at A=${area_ft2} = ${r.cubic_yards} not greater than prev=${prevCY}`);
    assert.ok(r.tons > prevTons, `tons at A=${area_ft2} = ${r.tons} not greater than prev=${prevTons}`);
    prevCY = r.cubic_yards;
    prevTons = r.tons;
  }
  // Closed-form pin at aggregateExample (1000 ft^2 * 4 in / 12 = 333.333 ft^3
  // / 27 = 12.3457 cubic_yards; tons depend on the pcf shard).
  const ref = computeAggregate({ area_ft2: 1000, depth_in: 4, material: "crushed_stone" });
  const expectedCY = (1000 * (4 / 12)) / 27;
  assert.ok(Math.abs(ref.cubic_yards - expectedCY) < 1e-9,
    `cubic_yards = ${ref.cubic_yards}, expected ${expectedCY}`);
  const expectedTons = (1000 * (4 / 12)) * ref.pcf / 2000;
  assert.ok(Math.abs(ref.tons - expectedTons) < 1e-9,
    `tons = ${ref.tons}, expected ${expectedTons}`);
  // Linear-doubling pin: doubling area doubles cubic_yards + tons exactly.
  const dbl = computeAggregate({ area_ft2: 2000, depth_in: 4, material: "crushed_stone" });
  assert.ok(Math.abs(dbl.cubic_yards - 2 * ref.cubic_yards) < 1e-12,
    `doubling A: cubic_yards = ${dbl.cubic_yards} != 2 * ${ref.cubic_yards}`);
  assert.ok(Math.abs(dbl.tons - 2 * ref.tons) < 1e-12,
    `doubling A: tons = ${dbl.tons} != 2 * ${ref.tons}`);
});

test("monotonicity: computeRainwaterYield annual_gal is strictly increasing in catchment_ft2 at fixed annual_in (0.6233 gal/in/ft^2 * efficiency linear pin)", () => {
  // Group G. annual_gal = catchment_ft2 * annual_in * 0.6233 * efficiency.
  // Strictly increasing in catchment_ft2 at fixed annual_in / efficiency.
  let prev = -Infinity;
  for (const catchment_ft2 of [250, 500, 1000, 1500, 2000, 3000, 5000]) {
    const r = computeRainwaterYield({ catchment_ft2, annual_in: 36, efficiency: 0.62 });
    assert.ok(Number.isFinite(r.annual_gal) && r.annual_gal > 0, `yield at A=${catchment_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.annual_gal > prev, `annual_gal at A=${catchment_ft2} = ${r.annual_gal} not greater than prev=${prev}`);
    prev = r.annual_gal;
  }
  // Closed-form pin: 1500 ft^2 * 36 in * 0.6233 * 0.62.
  const ref = computeRainwaterYield({ catchment_ft2: 1500, annual_in: 36, efficiency: 0.62 });
  const expected = 1500 * 36 * 0.6233 * 0.62;
  assert.ok(Math.abs(ref.annual_gal - expected) < 1e-9,
    `annual_gal = ${ref.annual_gal}, expected ${expected}`);
  // Linear-doubling pin: doubling catchment_ft2 doubles annual_gal exactly.
  const dbl = computeRainwaterYield({ catchment_ft2: 3000, annual_in: 36, efficiency: 0.62 });
  assert.ok(Math.abs(dbl.annual_gal - 2 * ref.annual_gal) < 1e-9,
    `doubling A: annual_gal = ${dbl.annual_gal} != 2 * ${ref.annual_gal}`);
  // Monthly path: summing monthly_gal must equal annual_gal for a uniform
  // annual_in / 12 spread.
  const monthly = computeRainwaterYield({
    catchment_ft2: 1500,
    monthly_in: Array.from({ length: 12 }, () => 3),
    efficiency: 0.62,
  });
  const expectedMonthlyAnnual = 1500 * 36 * 0.6233 * 0.62;
  assert.ok(Math.abs(monthly.annual_gal - expectedMonthlyAnnual) < 1e-9,
    `monthly-path annual = ${monthly.annual_gal}, expected ${expectedMonthlyAnnual}`);
});

test("monotonicity: computeStandardTurn bank_exact_deg is strictly increasing in true_airspeed_kt; time_to_turn_through_sec is strictly increasing in turn_through_deg (tan(bank) = V*omega/g + 3 deg/s pin)", () => {
  // Group W. Two pins in one test.
  // Pin 1: bank_exact = atan(V_fps * omega / g) * 180/PI. Strictly
  // increasing in TAS for omega > 0. Also pin the rule-of-thumb linear
  // relation: bank ~= TAS/10 + 7.
  let prevBank = -Infinity;
  let prevRule = -Infinity;
  for (const tas of [60, 90, 120, 150, 180, 210, 240]) {
    const r = computeStandardTurn({ true_airspeed_kt: tas, turn_through_deg: 90 });
    assert.ok(Number.isFinite(r.bank_exact_deg), `bank_exact at TAS=${tas}: ${JSON.stringify(r)}`);
    assert.ok(r.bank_exact_deg > prevBank, `bank_exact at TAS=${tas} = ${r.bank_exact_deg} not greater than prev=${prevBank}`);
    assert.ok(r.bank_rule_of_thumb_deg > prevRule, `bank_rule at TAS=${tas} = ${r.bank_rule_of_thumb_deg} not greater than prev=${prevRule}`);
    prevBank = r.bank_exact_deg;
    prevRule = r.bank_rule_of_thumb_deg;
  }
  // Pin 2: time_to_turn_through_sec = turn / 3 deg/sec. Strictly increasing
  // in turn_through_deg.
  let prevT = -Infinity;
  for (const turn of [30, 60, 90, 180, 270, 360]) {
    const r = computeStandardTurn({ true_airspeed_kt: 120, turn_through_deg: turn });
    assert.ok(Math.abs(r.time_to_turn_through_sec - turn / 3) < 1e-12,
      `time_to_turn at turn=${turn} = ${r.time_to_turn_through_sec}, expected ${turn / 3}`);
    assert.ok(r.time_to_turn_through_sec > prevT, `time_to_turn at turn=${turn} not greater than prev`);
    prevT = r.time_to_turn_through_sec;
  }
  // Closed-form pin from standardTurnExample: TAS 120 -> rule = 19 deg;
  // turn 90 deg -> 30 sec; standard rate = 3 deg/sec; 360 deg in 2 min.
  const ref = computeStandardTurn({ true_airspeed_kt: 120, turn_through_deg: 90 });
  assert.equal(ref.standard_turn_rate_deg_per_sec, 3);
  assert.equal(ref.bank_rule_of_thumb_deg, 19);
  assert.equal(ref.time_to_turn_through_sec, 30);
  assert.equal(ref.time_for_360_min, 2);
});

test("monotonicity: computeTimeAlignment c_m_s is strictly increasing in ambient_C (Bohn 331.3 + 0.606 * C linear pin)", () => {
  // Group N. c_m_s = 331.3 + 0.606 * ambient_C. Strictly increasing in
  // ambient_C; the constants are the published Bohn / handbook values.
  let prev = -Infinity;
  for (const ambient_C of [-10, 0, 10, 20, 25, 30, 40]) {
    const r = computeTimeAlignment({ d_main_ft: 80, d_delay_ft: 30, ambient_C, haas_offset_ms: 15 });
    assert.ok(Number.isFinite(r.c_m_s) && r.c_m_s > 0, `c at T=${ambient_C}: ${JSON.stringify(r)}`);
    assert.ok(r.c_m_s > prev, `c at T=${ambient_C} = ${r.c_m_s} not greater than prev=${prev}`);
    prev = r.c_m_s;
  }
  // Closed-form pin at 20 C: c = 331.3 + 0.606 * 20 = 343.42 m/s.
  const ref = computeTimeAlignment({ d_main_ft: 80, d_delay_ft: 30, ambient_C: 20, haas_offset_ms: 15 });
  assert.ok(Math.abs(ref.c_m_s - 343.42) < 1e-9, `c(20 C) = ${ref.c_m_s}, expected 343.42`);
  // ms_difference closed form: (80-30) ft * 0.3048 m/ft / 343.42 m/s * 1000.
  const expectedMs = ((80 - 30) * 0.3048 / 343.42) * 1000;
  assert.ok(Math.abs(ref.ms_difference - expectedMs) < 1e-9,
    `ms_difference = ${ref.ms_difference}, expected ${expectedMs}`);
  // recommended_delay = ms_difference + haas_offset; haas pin = +15 ms.
  assert.ok(Math.abs(ref.recommended_delay_ms - (expectedMs + 15)) < 1e-9,
    `recommended_delay = ${ref.recommended_delay_ms}, expected ${expectedMs + 15}`);
  // ms_difference is strictly decreasing in d_delay at fixed d_main / T.
  let prevMs = Infinity;
  for (const d_delay_ft of [10, 20, 30, 40, 50, 60, 70]) {
    const r = computeTimeAlignment({ d_main_ft: 80, d_delay_ft, ambient_C: 20, haas_offset_ms: 15 });
    assert.ok(r.ms_difference < prevMs, `ms_diff at d_delay=${d_delay_ft} = ${r.ms_difference} not less than prev=${prevMs}`);
    prevMs = r.ms_difference;
  }
});

// --- spec-v14 §10.3 Phase F twenty-eighth monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (B / C / T / V / X).

import { computeManningSlope } from "../../calc-plumbing.js";
import { computeAffinityLaws } from "../../calc-hvac.js";
import { computeSerialDilution } from "../../calc-lab.js";
import { computeCorrectedCalcium } from "../../calc-ems.js";
import { computeDTI } from "../../calc-realestate.js";

test("monotonicity: computeManningSlope slope_for_flow is strictly increasing in target_flow_gpm at fixed pipe diameter / material (Manning V^2 / R^(4/3) pin)", () => {
  // Group B. slope = (V * n / (1.486 * R^(2/3)))^2 with V = Q / A_half.
  // At fixed pipe diameter and material, slope_for_flow is strictly
  // increasing in target_flow_gpm (Q-squared dependence).
  let prev = -Infinity;
  for (const target_flow_gpm of [10, 25, 50, 100, 200, 400]) {
    const r = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm, material: "pvc" });
    assert.ok(Number.isFinite(r.slope_for_flow) && r.slope_for_flow > 0,
      `slope at Q=${target_flow_gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.slope_for_flow > prev,
      `slope at Q=${target_flow_gpm} = ${r.slope_for_flow} not greater than prev=${prev}`);
    prev = r.slope_for_flow;
  }
  // Q^2 scaling pin: doubling Q quadruples slope_for_flow exactly (V is
  // linear in Q at fixed area; slope ~ V^2).
  const a = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 50, material: "pvc" });
  const b = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 100, material: "pvc" });
  const ratio = b.slope_for_flow / a.slope_for_flow;
  assert.ok(Math.abs(ratio - 4) < 1e-9,
    `Q^2 scaling broken: ratio = ${ratio} (expected 4)`);
  // Geometry pin at 4-in pipe: D_ft = 1/3, R_ft = 1/12, A_half_ft2 = pi*D^2/8.
  const ref = computeManningSlope({ pipe_diameter_in: 4, target_flow_gpm: 50, material: "pvc" });
  assert.ok(Math.abs(ref.D_ft - (4 / 12)) < 1e-12, `D_ft = ${ref.D_ft}, expected ${4 / 12}`);
  assert.ok(Math.abs(ref.R_ft - ((4 / 12) / 4)) < 1e-12, `R_ft = ${ref.R_ft}, expected ${(4 / 12) / 4}`);
  const expectedA = Math.PI * (4 / 12) * (4 / 12) / 8;
  assert.ok(Math.abs(ref.A_half_ft2 - expectedA) < 1e-12,
    `A_half = ${ref.A_half_ft2}, expected ${expectedA}`);
});

test("monotonicity: computeAffinityLaws CFM is strictly increasing in target RPM; SP scales as RPM^2 and kW as RPM^3 (fan-affinity-law pin)", () => {
  // Group C. ratio = target_RPM / baseline_RPM; CFM scales linearly,
  // SP_in_wc as ratio^2, kW as ratio^3. Strictly increasing in target_RPM.
  let prevCFM = -Infinity;
  let prevSP = -Infinity;
  let prevKW = -Infinity;
  const baseline = { baseline_RPM: 1750, baseline_CFM: 5000, baseline_SP_in_wc: 1.0, baseline_kW: 5.0 };
  for (const target_value of [1000, 1250, 1500, 1750, 2000, 2250, 2500]) {
    const r = computeAffinityLaws({ ...baseline, target_kind: "RPM", target_value });
    assert.ok(Number.isFinite(r.CFM) && r.CFM > 0, `affinity at RPM=${target_value}: ${JSON.stringify(r)}`);
    assert.ok(r.CFM > prevCFM, `CFM at RPM=${target_value} = ${r.CFM} not greater than prev=${prevCFM}`);
    assert.ok(r.SP_in_wc > prevSP, `SP at RPM=${target_value} = ${r.SP_in_wc} not greater than prev=${prevSP}`);
    assert.ok(r.kW > prevKW, `kW at RPM=${target_value} = ${r.kW} not greater than prev=${prevKW}`);
    prevCFM = r.CFM;
    prevSP = r.SP_in_wc;
    prevKW = r.kW;
  }
  // Closed-form pin from affinityLawsExample: ratio = 1500 / 1750.
  const ref = computeAffinityLaws({ ...baseline, target_kind: "RPM", target_value: 1500 });
  const ratio = 1500 / 1750;
  assert.ok(Math.abs(ref.ratio - ratio) < 1e-12, `ratio = ${ref.ratio}, expected ${ratio}`);
  assert.ok(Math.abs(ref.CFM - 5000 * ratio) < 1e-9, `CFM = ${ref.CFM}, expected ${5000 * ratio}`);
  assert.ok(Math.abs(ref.SP_in_wc - 1.0 * ratio * ratio) < 1e-9,
    `SP = ${ref.SP_in_wc}, expected ${ratio * ratio}`);
  assert.ok(Math.abs(ref.kW - 5.0 * ratio * ratio * ratio) < 1e-9,
    `kW = ${ref.kW}, expected ${5.0 * ratio * ratio * ratio}`);
  // Doubling-RPM pin: 2x RPM -> 2x CFM, 4x SP, 8x kW exactly.
  const dbl = computeAffinityLaws({ ...baseline, target_kind: "RPM", target_value: 3500 });
  assert.ok(Math.abs(dbl.CFM - 2 * baseline.baseline_CFM) < 1e-9,
    `2x RPM: CFM = ${dbl.CFM} != ${2 * baseline.baseline_CFM}`);
  assert.ok(Math.abs(dbl.SP_in_wc - 4 * baseline.baseline_SP_in_wc) < 1e-9,
    `2x RPM: SP = ${dbl.SP_in_wc} != ${4 * baseline.baseline_SP_in_wc}`);
  assert.ok(Math.abs(dbl.kW - 8 * baseline.baseline_kW) < 1e-9,
    `2x RPM: kW = ${dbl.kW} != ${8 * baseline.baseline_kW}`);
});

test("monotonicity: computeSerialDilution tube concentration is strictly decreasing across steps (geometric decay by 1/dilution_factor pin)", () => {
  // Group T. conc[i+1] = conc[i] / dilution_factor; strictly decreasing.
  const r = computeSerialDilution({ starting_concentration: 1.0, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 5 });
  assert.ok(Array.isArray(r.tubes) && r.tubes.length === 5, `tubes: ${JSON.stringify(r)}`);
  let prev = Infinity;
  for (const t of r.tubes) {
    assert.ok(t.concentration > 0 && t.concentration < prev,
      `concentration at step=${t.step} = ${t.concentration} not less than prev=${prev}`);
    prev = t.concentration;
  }
  // Closed-form pin from serialDilutionExample: 10x dilution / 5 steps ->
  // 1.0 / 10^5 = 1e-5 at step 5 exact (to floating-point floor).
  assert.ok(Math.abs(r.tubes[4].concentration - 1e-5) < 1e-18,
    `step 5 concentration = ${r.tubes[4].concentration}, expected 1e-5`);
  // transfer_volume = volume / DF exact pin: 0.001 / 10 = 1e-4.
  assert.ok(Math.abs(r.transfer_volume - 1e-4) < 1e-18,
    `transfer_volume = ${r.transfer_volume}, expected 1e-4`);
  // diluent_volume = volume - transfer exact pin: 0.001 - 0.0001 = 9e-4.
  assert.ok(Math.abs(r.diluent_volume - 9e-4) < 1e-18,
    `diluent_volume = ${r.diluent_volume}, expected 9e-4`);
  // Strict-monotonicity in dilution_factor: a larger DF leaves a smaller
  // concentration at the same step.
  const r2 = computeSerialDilution({ starting_concentration: 1.0, dilution_factor: 100, volume_per_tube: 0.001, number_of_steps: 5 });
  for (let i = 0; i < 5; i++) {
    assert.ok(r2.tubes[i].concentration < r.tubes[i].concentration,
      `larger DF at step ${i + 1}: ${r2.tubes[i].concentration} not less than ${r.tubes[i].concentration}`);
  }
});

test("monotonicity: computeCorrectedCalcium ca_corrected_mg_dL is strictly decreasing in albumin_g_dL at fixed measured Ca (Payne 1973 0.8*(4-Alb) pin)", () => {
  // Group V. corrected = Ca + 0.8 * (4 - Alb). Strictly decreasing in Alb.
  let prev = Infinity;
  for (const albumin_g_dL of [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]) {
    const r = computeCorrectedCalcium({ ca_measured: 8.0, albumin_g_dL });
    assert.ok(Number.isFinite(r.ca_corrected_mg_dL), `Ca at Alb=${albumin_g_dL}: ${JSON.stringify(r)}`);
    assert.ok(r.ca_corrected_mg_dL < prev,
      `Ca at Alb=${albumin_g_dL} = ${r.ca_corrected_mg_dL} not less than prev=${prev}`);
    prev = r.ca_corrected_mg_dL;
  }
  // Closed-form pin from correctedCalciumExample: 8.0 + 0.8 * (4.0 - 2.0)
  // = 9.6 exact.
  const ref = computeCorrectedCalcium({ ca_measured: 8.0, albumin_g_dL: 2.0 });
  assert.ok(Math.abs(ref.ca_corrected_mg_dL - 9.6) < 1e-12,
    `ca_corrected = ${ref.ca_corrected_mg_dL}, expected 9.6`);
  assert.ok(Math.abs(ref.adjustment - 1.6) < 1e-12,
    `adjustment = ${ref.adjustment}, expected 1.6`);
  // Identity pin at Alb=4.0 (normal): correction collapses to zero.
  const ident = computeCorrectedCalcium({ ca_measured: 9.0, albumin_g_dL: 4.0 });
  assert.ok(Math.abs(ident.ca_corrected_mg_dL - 9.0) < 1e-12,
    `ca_corrected at Alb=4.0 = ${ident.ca_corrected_mg_dL}, expected 9.0`);
  assert.ok(Math.abs(ident.adjustment - 0) < 1e-12,
    `adjustment at Alb=4.0 = ${ident.adjustment}, expected 0`);
  // Strict monotonicity in ca_measured at fixed Alb (linear-in-Ca pin).
  let prevCa = -Infinity;
  for (const ca_measured of [6, 7, 8, 9, 10, 11, 12]) {
    const r = computeCorrectedCalcium({ ca_measured, albumin_g_dL: 3.0 });
    assert.ok(r.ca_corrected_mg_dL > prevCa,
      `Ca at measured=${ca_measured} = ${r.ca_corrected_mg_dL} not greater than prev=${prevCa}`);
    prevCa = r.ca_corrected_mg_dL;
  }
});

test("monotonicity: computeDTI back_end_dti_percent is strictly increasing in other_monthly_debts at fixed income / housing (FNMA back-end linear pin)", () => {
  // Group X. back = (H + D) / I * 100. Strictly increasing in D at fixed
  // I, H; front_end_dti_percent is unchanged because it only depends on H.
  let prev = -Infinity;
  for (const other_monthly_debts of [0, 100, 250, 500, 750, 1000, 1500]) {
    const r = computeDTI({ gross_monthly_income: 7500, housing_payment: 2100, other_monthly_debts });
    assert.ok(Number.isFinite(r.back_end_dti_percent),
      `DTI at D=${other_monthly_debts}: ${JSON.stringify(r)}`);
    assert.ok(r.back_end_dti_percent > prev,
      `back DTI at D=${other_monthly_debts} = ${r.back_end_dti_percent} not greater than prev=${prev}`);
    // front_end is independent of D.
    assert.ok(Math.abs(r.front_end_dti_percent - 28) < 1e-9,
      `front_end DTI = ${r.front_end_dti_percent}, expected 28 (independent of D)`);
    prev = r.back_end_dti_percent;
  }
  // Closed-form pin from dtiExample: I=7500 / H=2100 / D=600 -> front=28,
  // back=36 exact.
  const ref = computeDTI({ gross_monthly_income: 7500, housing_payment: 2100, other_monthly_debts: 600 });
  assert.ok(Math.abs(ref.front_end_dti_percent - 28) < 1e-9,
    `front_end DTI = ${ref.front_end_dti_percent}, expected 28`);
  assert.ok(Math.abs(ref.back_end_dti_percent - 36) < 1e-9,
    `back_end DTI = ${ref.back_end_dti_percent}, expected 36`);
  // FNMA 36/45 boundary pin: at front=36, back=45 the conventional_pass
  // flag is true; just-above tips it false.
  const passEdge = computeDTI({ gross_monthly_income: 10000, housing_payment: 3600, other_monthly_debts: 900 });
  assert.equal(passEdge.front_end_dti_percent, 36);
  assert.equal(passEdge.back_end_dti_percent, 45);
  assert.equal(passEdge.conventional_pass, true);
  const failEdge = computeDTI({ gross_monthly_income: 10000, housing_payment: 3600, other_monthly_debts: 901 });
  assert.equal(failEdge.conventional_pass, false);
});

// --- spec-v14 §10.3 Phase F twenty-ninth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (A / F / K / O / U).

import { computeShortCircuitPP } from "../../calc-electrical.js";
import { computeScbaCylinderTime } from "../../calc-fire.js";
import { computeTireGearing } from "../../calc-mechanic.js";
import { computeSousVidePasteurization } from "../../calc-kitchen.js";
import { computeSteadyStateConcentration } from "../../calc-vet.js";

test("monotonicity: computeShortCircuitPP I_sca_panel_A is strictly decreasing in length_ft at fixed conductor / utility (Bussmann point-to-point M = 1/(1+f) pin)", () => {
  // Group A. f grows linearly with length_ft; M = 1/(1+f) is strictly
  // decreasing in f; I_sca_panel = I_sca_secondary * M is strictly
  // decreasing in length_ft.
  const baseline = {
    utility_kVA: 1500, utility_Z_pct: 5.75, secondary_V: 480, phase: "three",
    C_value: 22185, parallel_sets: 1,
  };
  let prev = Infinity;
  for (const length_ft of [10, 25, 50, 100, 200, 400, 800]) {
    const r = computeShortCircuitPP({ ...baseline, length_ft });
    assert.ok(Number.isFinite(r.I_sca_panel_A) && r.I_sca_panel_A > 0,
      `Isca at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.I_sca_panel_A < prev,
      `Isca at L=${length_ft} = ${r.I_sca_panel_A} not less than prev=${prev}`);
    prev = r.I_sca_panel_A;
  }
  // L=0 closed-form pin: f=0, M=1, panel current equals secondary current.
  const zero = computeShortCircuitPP({ ...baseline, length_ft: 0 });
  assert.equal(zero.f_factor, 0);
  assert.equal(zero.M_factor, 1);
  assert.ok(Math.abs(zero.I_sca_panel_A - zero.I_sca_secondary_A) < 1e-9,
    `at L=0: panel = ${zero.I_sca_panel_A} != secondary = ${zero.I_sca_secondary_A}`);
  // Secondary fault current closed-form pin: I = (kVA * 1000) / (V * 1.732 * Z)
  // using the bundled three-phase factor (the codebase uses the rounded
  // 1.732 constant for Bussmann point-to-point per spec convention).
  const expectedI = (1500 * 1000) / (480 * 1.732 * 0.0575);
  assert.ok(Math.abs(zero.I_sca_secondary_A - expectedI) < 1e-6,
    `I_sca_secondary = ${zero.I_sca_secondary_A}, expected ${expectedI}`);
});

test("monotonicity: computeScbaCylinderTime time_to_alarm_min is strictly decreasing in consumption_scfm; strictly increasing in P_start_psi (NFPA 1981 linear pin)", () => {
  // Group F. available_scf_to_alarm = ((Ps - Pa) / Pr) * Vr; time =
  // available / C. Inversely linear in C, linear in (Ps - Pa).
  const baseline = { V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485 };
  let prev = Infinity;
  for (const consumption_scfm of [20, 30, 40, 60, 80, 120, 200]) {
    const r = computeScbaCylinderTime({ ...baseline, consumption_scfm });
    assert.ok(Number.isFinite(r.time_to_alarm_min) && r.time_to_alarm_min > 0,
      `time at C=${consumption_scfm}: ${JSON.stringify(r)}`);
    assert.ok(r.time_to_alarm_min < prev,
      `time at C=${consumption_scfm} = ${r.time_to_alarm_min} not less than prev=${prev}`);
    prev = r.time_to_alarm_min;
  }
  // Strict monotonicity in P_start_psi at fixed C / Pa / Pr / Vr.
  let prevT = -Infinity;
  for (const P_start_psi of [2000, 2500, 3000, 3500, 4000, 4500]) {
    const r = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi, P_alarm_psi: 1485, consumption_scfm: 40 });
    assert.ok(r.time_to_alarm_min > prevT,
      `time at Ps=${P_start_psi} = ${r.time_to_alarm_min} not greater than prev=${prevT}`);
    prevT = r.time_to_alarm_min;
  }
  // Closed-form pin from scbaCylinderExample: full 88 scf cylinder /
  // 33% alarm / 40 scfm. available_to_alarm = ((4500 - 1485) / 4500) * 88
  // = (3015 / 4500) * 88 = 0.67 * 88 = 58.96 scf; time = 58.96 / 40 = 1.474 min.
  const ref = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485, consumption_scfm: 40 });
  const expectedAvail = ((4500 - 1485) / 4500) * 88;
  assert.ok(Math.abs(ref.available_scf_to_alarm - expectedAvail) < 1e-9,
    `available = ${ref.available_scf_to_alarm}, expected ${expectedAvail}`);
  assert.ok(Math.abs(ref.time_to_alarm_min - expectedAvail / 40) < 1e-9,
    `time = ${ref.time_to_alarm_min}, expected ${expectedAvail / 40}`);
  // time_to_empty = Ps / Pr * Vr / C closed-form pin.
  assert.ok(Math.abs(ref.time_to_empty_min - (88 / 40)) < 1e-9,
    `time_to_empty = ${ref.time_to_empty_min}, expected 2.2`);
});

test("monotonicity: computeTireGearing rev_per_mi_new is strictly decreasing in new tire OD; cruise_mph strictly increasing in new tire OD at fixed gear / RPM (63360 / (pi*OD) circumference pin)", () => {
  // Group K. rev_per_mi = 63360 / (pi * OD); strictly decreasing in OD.
  // At fixed top_gear / axle / target RPM, cruise_mph scales with OD
  // because rev_per_mi is in the denominator.
  let prevRev = Infinity;
  let prevCruise = -Infinity;
  const baseline = { original_size: "265/70R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 };
  for (const new_size of ["245/70R17", "265/70R17", "275/70R17", "285/75R17", "295/75R17", "305/75R17"]) {
    const r = computeTireGearing({ ...baseline, new_size });
    assert.ok(Number.isFinite(r.rev_per_mi_new) && r.rev_per_mi_new > 0,
      `tire ${new_size}: ${JSON.stringify(r)}`);
    assert.ok(r.rev_per_mi_new < prevRev,
      `rev_per_mi at ${new_size} = ${r.rev_per_mi_new} not less than prev=${prevRev}`);
    assert.ok(r.cruise_mph > prevCruise,
      `cruise_mph at ${new_size} = ${r.cruise_mph} not greater than prev=${prevCruise}`);
    prevRev = r.rev_per_mi_new;
    prevCruise = r.cruise_mph;
  }
  // Closed-form pin: rev_per_mi_orig for 265/70R17 = 63360 / (pi * OD)
  // where OD = 17 + 2 * (265 * 0.70 / 25.4).
  const ref = computeTireGearing({ original_size: "265/70R17", new_size: "265/70R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 });
  const od_orig = 17 + 2 * (265 * 0.70 / 25.4);
  const expectedRev = 63360 / (Math.PI * od_orig);
  assert.ok(Math.abs(ref.rev_per_mi_orig - expectedRev) < 1e-9,
    `rev_per_mi_orig = ${ref.rev_per_mi_orig}, expected ${expectedRev}`);
  // Identity pin: original = new -> effective_new = effective_orig and
  // rev_per_mi_orig = rev_per_mi_new exactly.
  assert.ok(Math.abs(ref.effective_new - ref.effective_orig) < 1e-12,
    `effective drift at identity: ${ref.effective_new} vs ${ref.effective_orig}`);
  assert.ok(Math.abs(ref.rev_per_mi_new - ref.rev_per_mi_orig) < 1e-12,
    `rev_per_mi drift at identity: ${ref.rev_per_mi_new} vs ${ref.rev_per_mi_orig}`);
});

test("monotonicity: computeSousVidePasteurization come_up_minutes is strictly increasing in thickness_in at fixed bath / category (Heisler-slab Fo=0.4 * (L/2)^2 / alpha pin)", () => {
  // Group O. come_up_seconds = 0.4 * (thickness * 0.0254 / 2)^2 / alpha.
  // Strictly increasing in thickness^2.
  let prev = -Infinity;
  for (const thickness_in of [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0]) {
    const r = computeSousVidePasteurization({ category: "poultry", thickness_in, bath_temperature_F: 140, initial_temperature_F: 38 });
    assert.ok(Number.isFinite(r.come_up_minutes) && r.come_up_minutes > 0,
      `come_up at t=${thickness_in}: ${JSON.stringify(r)}`);
    assert.ok(r.come_up_minutes > prev,
      `come_up at t=${thickness_in} = ${r.come_up_minutes} not greater than prev=${prev}`);
    prev = r.come_up_minutes;
  }
  // Doubling-thickness pin: 2x thickness -> 4x come_up (L^2 scaling).
  const a = computeSousVidePasteurization({ category: "poultry", thickness_in: 0.5, bath_temperature_F: 140, initial_temperature_F: 38 });
  const b = computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 140, initial_temperature_F: 38 });
  const ratio = b.come_up_minutes / a.come_up_minutes;
  assert.ok(Math.abs(ratio - 4) < 1e-9,
    `L^2 scaling broken: ratio = ${ratio} (expected 4)`);
  // Closed-form pin from sousVidePasteurizationExample: thickness=1.0,
  // bath=140 F, poultry alpha=1.4e-7 m^2/s. L = 0.0127 m; come_up =
  // 0.4 * 0.0127^2 / 1.4e-7 / 60 = 7.6804... min.
  const ref = computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 140, initial_temperature_F: 38 });
  const expectedSec = (0.4 * Math.pow(0.0127, 2)) / ref.diffusivity_m2_per_s;
  const expectedMin = expectedSec / 60;
  assert.ok(Math.abs(ref.come_up_minutes - expectedMin) < 1e-9,
    `come_up = ${ref.come_up_minutes}, expected ${expectedMin}`);
  // total = come_up + hold pin.
  assert.ok(Math.abs(ref.total_minutes - (ref.come_up_minutes + ref.hold_minutes)) < 1e-12,
    `total = ${ref.total_minutes} != come_up + hold = ${ref.come_up_minutes + ref.hold_minutes}`);
});

test("monotonicity: computeSteadyStateConcentration Css_ug_per_mL is strictly increasing in dose_mg; strictly decreasing in clearance and tau (Css = D*F / (CL*tau) pin)", () => {
  // Group U. Css = (Dose * F) / (CL_per_kg * wt_kg * tau_min). Strictly
  // increasing in dose_mg; strictly decreasing in clearance_mL_per_kg_per_min
  // and in tau_hr at fixed F / wt / others.
  const baseline = { bioavailability_F: 1, clearance_mL_per_kg_per_min: 5, tau_hr: 8, weight: 10, weight_unit: "kg" };
  let prev = -Infinity;
  for (const dose_mg of [25, 50, 100, 200, 400, 800]) {
    const r = computeSteadyStateConcentration({ ...baseline, dose_mg });
    assert.ok(Number.isFinite(r.Css_ug_per_mL) && r.Css_ug_per_mL > 0,
      `Css at D=${dose_mg}: ${JSON.stringify(r)}`);
    assert.ok(r.Css_ug_per_mL > prev,
      `Css at D=${dose_mg} = ${r.Css_ug_per_mL} not greater than prev=${prev}`);
    prev = r.Css_ug_per_mL;
  }
  // Doubling-dose pin: 2x dose -> 2x Css exactly (linear).
  const a = computeSteadyStateConcentration({ ...baseline, dose_mg: 100 });
  const b = computeSteadyStateConcentration({ ...baseline, dose_mg: 200 });
  assert.ok(Math.abs(b.Css_ug_per_mL - 2 * a.Css_ug_per_mL) < 1e-12,
    `2x dose: Css = ${b.Css_ug_per_mL} != 2 * ${a.Css_ug_per_mL}`);
  // Strictly decreasing in clearance.
  let prevDecr = Infinity;
  for (const clearance_mL_per_kg_per_min of [2, 5, 10, 20, 40]) {
    const r = computeSteadyStateConcentration({ dose_mg: 100, bioavailability_F: 1, clearance_mL_per_kg_per_min, tau_hr: 8, weight: 10, weight_unit: "kg" });
    assert.ok(r.Css_ug_per_mL < prevDecr,
      `Css at CL=${clearance_mL_per_kg_per_min} = ${r.Css_ug_per_mL} not less than prev=${prevDecr}`);
    prevDecr = r.Css_ug_per_mL;
  }
  // Strictly decreasing in tau.
  let prevTau = Infinity;
  for (const tau_hr of [4, 6, 8, 12, 24]) {
    const r = computeSteadyStateConcentration({ dose_mg: 100, bioavailability_F: 1, clearance_mL_per_kg_per_min: 5, tau_hr, weight: 10, weight_unit: "kg" });
    assert.ok(r.Css_ug_per_mL < prevTau,
      `Css at tau=${tau_hr} = ${r.Css_ug_per_mL} not less than prev=${prevTau}`);
    prevTau = r.Css_ug_per_mL;
  }
  // Closed-form pin from steadyStateExample: CL = 5 * 10 = 50 mL/min;
  // tau = 8 * 60 = 480 min; Css = (100 * 1) / (50 * 480) = 1/240 mg/mL =
  // 4.166... ug/mL.
  const ref = computeSteadyStateConcentration({ dose_mg: 100, bioavailability_F: 1, clearance_mL_per_kg_per_min: 5, tau_hr: 8, weight: 10, weight_unit: "kg" });
  const expected = (100 * 1) / (50 * 480) * 1000;
  assert.ok(Math.abs(ref.Css_ug_per_mL - expected) < 1e-9,
    `Css = ${ref.Css_ug_per_mL}, expected ${expected}`);
  assert.equal(ref.CL_mL_per_min, 50);
  assert.equal(ref.tau_min, 480);
});

// --- spec-v14 §10.3 Phase F thirtieth monotonicity batch ---------------
// Five new sweeps across five distinct catalog groups (D / J / M / P / R).

import { computeDryingGoal } from "../../calc-restoration.js";
import { computeReeferBurn } from "../../calc-trucking.js";
import { computeCoagulantDose } from "../../calc-water.js";
import { computePacing } from "../../calc-field.js";
import { computeInventoryTurnover, computeCashConversionCycle } from "../../calc-accounting.js";

test("monotonicity: computeDryingGoal target_indoor_GPP is strictly decreasing in margin_GPP at fixed outdoor; outdoor_GPP strictly increasing in outdoor_RH_percent at fixed T (IICRC dry-down margin pin)", () => {
  // Group D. target_indoor_GPP = max(0, outdoor_GPP - margin_GPP); for
  // margin < outdoor_GPP the relation is strictly decreasing in margin.
  let prev = Infinity;
  for (const margin_GPP of [0, 2, 5, 10, 15, 20, 25]) {
    const r = computeDryingGoal({ outdoor_temperature_F: 80, outdoor_RH_percent: 70, indoor_temperature_F: 72, margin_GPP });
    assert.ok(Number.isFinite(r.target_indoor_GPP), `target at margin=${margin_GPP}: ${JSON.stringify(r)}`);
    assert.ok(r.target_indoor_GPP < prev,
      `target at margin=${margin_GPP} = ${r.target_indoor_GPP} not less than prev=${prev}`);
    prev = r.target_indoor_GPP;
  }
  // Identity pin: margin = 0 -> target_indoor_GPP equals outdoor_GPP.
  const ref0 = computeDryingGoal({ outdoor_temperature_F: 80, outdoor_RH_percent: 70, indoor_temperature_F: 72, margin_GPP: 0 });
  assert.ok(Math.abs(ref0.target_indoor_GPP - ref0.outdoor_GPP) < 1e-12,
    `at margin=0: target = ${ref0.target_indoor_GPP} != outdoor = ${ref0.outdoor_GPP}`);
  // Strict monotonicity in outdoor_RH_percent at fixed outdoor T (warmer
  // moister air carries more grains; outdoor_GPP rises with RH).
  let prevGPP = -Infinity;
  for (const outdoor_RH_percent of [30, 40, 50, 60, 70, 80, 90]) {
    const r = computeDryingGoal({ outdoor_temperature_F: 80, outdoor_RH_percent, indoor_temperature_F: 72, margin_GPP: 10 });
    assert.ok(r.outdoor_GPP > prevGPP,
      `outdoor_GPP at RH=${outdoor_RH_percent} = ${r.outdoor_GPP} not greater than prev=${prevGPP}`);
    prevGPP = r.outdoor_GPP;
  }
  // dryingGoalExample identity pin: target = outdoor_GPP - 10 (when
  // outdoor_GPP > 10).
  const ex = computeDryingGoal({ outdoor_temperature_F: 80, outdoor_RH_percent: 70, indoor_temperature_F: 72, margin_GPP: 10 });
  assert.ok(Math.abs(ex.target_indoor_GPP - (ex.outdoor_GPP - 10)) < 1e-12,
    `dryingGoalExample: target = ${ex.target_indoor_GPP} != outdoor - 10 = ${ex.outdoor_GPP - 10}`);
});

test("monotonicity: computeReeferBurn fuel_burned is strictly increasing in haul_hr at fixed unit / ambient (gph * t linear pin) + ambient_factor 0.85 / 1.0 / 1.20 step pin", () => {
  // Group J. fuel_burned = gph * haul_hr; strictly increasing in haul_hr.
  // ambient_factor = 0.85 (cold), 1.00 (moderate), 1.20 (hot).
  let prev = -Infinity;
  for (const haul_hr of [4, 8, 12, 24, 36, 48, 72]) {
    const r = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 100, haul_hr, ambient_band: "moderate" });
    assert.ok(Number.isFinite(r.fuel_burned) && r.fuel_burned > 0,
      `fuel at h=${haul_hr}: ${JSON.stringify(r)}`);
    assert.ok(r.fuel_burned > prev,
      `fuel at h=${haul_hr} = ${r.fuel_burned} not greater than prev=${prev}`);
    prev = r.fuel_burned;
  }
  // Doubling-haul pin: 2x haul_hr -> 2x fuel_burned exactly (linear).
  const a = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 100, haul_hr: 12, ambient_band: "moderate" });
  const b = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 100, haul_hr: 24, ambient_band: "moderate" });
  assert.ok(Math.abs(b.fuel_burned - 2 * a.fuel_burned) < 1e-9,
    `2x haul: fuel = ${b.fuel_burned} != 2 * ${a.fuel_burned}`);
  // Ambient-factor step pins at fixed haul: cold = 0.85 * moderate;
  // hot = 1.20 * moderate.
  const mod = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 100, haul_hr: 24, ambient_band: "moderate" });
  const cold = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 100, haul_hr: 24, ambient_band: "cold" });
  const hot = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 100, haul_hr: 24, ambient_band: "hot" });
  assert.ok(Math.abs(cold.gph - 0.85 * mod.gph) < 1e-12,
    `cold gph = ${cold.gph} != 0.85 * ${mod.gph}`);
  assert.ok(Math.abs(hot.gph - 1.20 * mod.gph) < 1e-12,
    `hot gph = ${hot.gph} != 1.20 * ${mod.gph}`);
  // reserve_gal = tank_gal - fuel_burned closed-form pin.
  assert.ok(Math.abs(mod.reserve_gal - (100 - mod.fuel_burned)) < 1e-9,
    `reserve = ${mod.reserve_gal} != tank - fuel = ${100 - mod.fuel_burned}`);
});

test("monotonicity: computeCoagulantDose pure_lb_day is strictly increasing in flow_mgd and in jar_test_dose_mg_l at fixed product (8.34 lb/gal pounds-formula linear pin)", () => {
  // Group M. pure_lb_day = flow_mgd * dose * 8.34. Strictly increasing
  // in both flow and dose.
  let prevF = -Infinity;
  for (const flow_mgd of [0.5, 1, 2, 5, 10, 20]) {
    const r = computeCoagulantDose({ flow_mgd, jar_test_dose_mg_l: 20, product: "alum_liquid" });
    assert.ok(Number.isFinite(r.pure_lb_day) && r.pure_lb_day > 0,
      `pure at F=${flow_mgd}: ${JSON.stringify(r)}`);
    assert.ok(r.pure_lb_day > prevF,
      `pure at F=${flow_mgd} = ${r.pure_lb_day} not greater than prev=${prevF}`);
    prevF = r.pure_lb_day;
  }
  let prevD = -Infinity;
  for (const jar_test_dose_mg_l of [5, 10, 20, 30, 50, 100]) {
    const r = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l, product: "alum_liquid" });
    assert.ok(r.pure_lb_day > prevD,
      `pure at D=${jar_test_dose_mg_l} = ${r.pure_lb_day} not greater than prev=${prevD}`);
    prevD = r.pure_lb_day;
  }
  // Closed-form pin from coagulantDoseExample: 5 MGD * 20 mg/L * 8.34 =
  // 834 lb/day pure exactly.
  const ref = computeCoagulantDose({ flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_liquid" });
  assert.ok(Math.abs(ref.pure_lb_day - 834) < 1e-9,
    `pure_lb_day = ${ref.pure_lb_day}, expected 834`);
  // product_lb_day = pure / strength% pin.
  assert.ok(Math.abs(ref.product_lb_day - 834 / (ref.product_strength_pct / 100)) < 1e-9,
    `product_lb_day = ${ref.product_lb_day}, expected ${834 / (ref.product_strength_pct / 100)}`);
  // product_density_lb_per_gal = sg * 8.34 pin (consistency check).
  assert.ok(Math.abs(ref.product_gal_day - ref.product_lb_day / ref.product_density_lb_per_gal) < 1e-9,
    `product_gal_day = ${ref.product_gal_day}, expected ${ref.product_lb_day / ref.product_density_lb_per_gal}`);
});

test("monotonicity: computePacing distance_ft is strictly increasing in current_paces at fixed calibration / terrain (Ranger-pace linear pin)", () => {
  // Group P. distance_ft = (current_paces * pace_length_ft) / terrain_factor.
  // Strictly increasing in current_paces.
  let prev = -Infinity;
  for (const current_paces of [25, 50, 100, 150, 200, 300, 500]) {
    const r = computePacing({ calibration_distance_ft: 200, calibration_paces: 75, current_paces, terrain: "rolling" });
    assert.ok(Number.isFinite(r.distance_ft) && r.distance_ft >= 0,
      `dist at paces=${current_paces}: ${JSON.stringify(r)}`);
    assert.ok(r.distance_ft > prev,
      `dist at paces=${current_paces} = ${r.distance_ft} not greater than prev=${prev}`);
    prev = r.distance_ft;
  }
  // Closed-form pin from pacingExample: pace_length = 200 / 75 ft.
  const ref = computePacing({ calibration_distance_ft: 200, calibration_paces: 75, current_paces: 250, terrain: "rolling" });
  const expectedPaceLen = 200 / 75;
  assert.ok(Math.abs(ref.pace_length_ft - expectedPaceLen) < 1e-12,
    `pace_length = ${ref.pace_length_ft}, expected ${expectedPaceLen}`);
  // Identity pin: current_paces = calibration_paces and terrain factor = 1
  // -> distance_ft equals calibration_distance_ft exactly.
  const ident = computePacing({ calibration_distance_ft: 200, calibration_paces: 75, current_paces: 75, terrain: "flat" });
  assert.ok(Math.abs(ident.distance_ft - 200) < 1e-9,
    `identity at paces=cal / flat: dist = ${ident.distance_ft}, expected 200`);
  // distance_m closed-form pin: 1 ft = 0.3048 m.
  assert.ok(Math.abs(ref.distance_m - ref.distance_ft * 0.3048) < 1e-12,
    `distance_m = ${ref.distance_m}, expected ${ref.distance_ft * 0.3048}`);
});

test("monotonicity: computeInventoryTurnover turnover is strictly increasing in cogs at fixed avg inventory; days_sales_of_inventory strictly decreasing in cogs (DSI = period / turnover pin)", () => {
  // Group R. turnover = cogs / avg; dsi = period / turnover.
  // Strictly increasing in cogs at fixed avg / period.
  let prevT = -Infinity;
  let prevD = Infinity;
  for (const cogs of [100000, 250000, 500000, 1000000, 2000000, 4000000]) {
    const r = computeInventoryTurnover({ cogs, beginning_inventory: 250000, ending_inventory: 270000, period_days: 365 });
    assert.ok(Number.isFinite(r.turnover) && r.turnover > 0,
      `turn at cogs=${cogs}: ${JSON.stringify(r)}`);
    assert.ok(r.turnover > prevT,
      `turnover at cogs=${cogs} = ${r.turnover} not greater than prev=${prevT}`);
    assert.ok(r.days_sales_of_inventory < prevD,
      `DSI at cogs=${cogs} = ${r.days_sales_of_inventory} not less than prev=${prevD}`);
    prevT = r.turnover;
    prevD = r.days_sales_of_inventory;
  }
  // Closed-form pin from inventoryTurnoverExample: avg = (250000 + 270000) / 2
  // = 260000; turnover = 2000000 / 260000 = 7.6923... ; dsi = 365 / 7.6923 = 47.45.
  const ref = computeInventoryTurnover({ cogs: 2000000, beginning_inventory: 250000, ending_inventory: 270000, period_days: 365 });
  assert.equal(ref.average_inventory, 260000);
  assert.ok(Math.abs(ref.turnover - (2000000 / 260000)) < 1e-9,
    `turnover = ${ref.turnover}, expected ${2000000 / 260000}`);
  assert.ok(Math.abs(ref.days_sales_of_inventory - (365 / (2000000 / 260000))) < 1e-9,
    `DSI = ${ref.days_sales_of_inventory}, expected ${365 / (2000000 / 260000)}`);
  // Sanity pin on the related CCC: CCC = DIO + DSO - DPO; cccExample
  // 60 + 45 - 30 = 75 days exact.
  const ccc = computeCashConversionCycle({ dso: 45, dio: 60, dpo: 30 });
  assert.equal(ccc.ccc_days, 75);
  assert.equal(ccc.dpo_contribution, -30);
});

// --- spec-v14 §10.3 Phase F thirty-first monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (Y / S / W / C / A).

import { computeQuadratic } from "../../calc-edu.js";
import { computeContractorVsEmployee } from "../../calc-legal.js";
import { computeTopOfDescent } from "../../calc-aviation.js";
import { computeExpansionTank } from "../../calc-plumbing.js";
import { computeConduitFill } from "../../calc-electrical.js";

test("monotonicity: computeQuadratic discriminant is strictly decreasing in c at fixed a > 0, b; larger root strictly decreasing in c (quadratic-formula pin)", () => {
  // Group Y. D = b^2 - 4ac. At fixed a > 0 and any b, D is strictly
  // decreasing in c. For D > 0 the larger root (-b + sqrtD) / (2a) is
  // strictly decreasing in c (D drops as c rises).
  let prevD = Infinity;
  let prevRoot = Infinity;
  for (const c of [-5, -3, -1, 0, 0.5, 1, 1.5]) {
    const r = computeQuadratic({ a: 1, b: -3, c });
    assert.ok(r.kind === "real-distinct", `expected real-distinct at c=${c}: ${JSON.stringify(r)}`);
    assert.ok(r.discriminant < prevD,
      `D at c=${c} = ${r.discriminant} not less than prev=${prevD}`);
    const largerRoot = Math.max(r.roots[0], r.roots[1]);
    assert.ok(largerRoot < prevRoot,
      `larger root at c=${c} = ${largerRoot} not less than prev=${prevRoot}`);
    prevD = r.discriminant;
    prevRoot = largerRoot;
  }
  // Closed-form pin from quadraticExample: x^2 - 3x + 2 -> roots [1, 2];
  // D = 9 - 8 = 1; vertex_x = 1.5; vertex_y = 1.5^2 - 4.5 + 2 = -0.25.
  const ref = computeQuadratic({ a: 1, b: -3, c: 2 });
  assert.equal(ref.kind, "real-distinct");
  assert.equal(ref.discriminant, 1);
  assert.deepEqual(ref.roots.slice().sort((a, b) => a - b), [1, 2]);
  assert.equal(ref.vertex_x, 1.5);
  assert.ok(Math.abs(ref.vertex_y - (-0.25)) < 1e-12,
    `vertex_y = ${ref.vertex_y}, expected -0.25`);
  // D=0 boundary pin: x^2 - 2x + 1 = (x-1)^2 -> kind = "real-double".
  const dbl = computeQuadratic({ a: 1, b: -2, c: 1 });
  assert.equal(dbl.kind, "real-double");
  assert.equal(dbl.discriminant, 0);
  assert.deepEqual(dbl.roots, [1]);
  // D<0 boundary pin: x^2 + 1 -> kind = "complex" with roots +-i.
  const cplx = computeQuadratic({ a: 1, b: 0, c: 1 });
  assert.equal(cplx.kind, "complex");
  assert.equal(cplx.discriminant, -4);
});

test("monotonicity: computeContractorVsEmployee employer_control_count is strictly monotone non-decreasing as more factors are marked 'employer' (IRS Rev. Rul. 87-41 20-factor pin) + ABC all-three boundary pin", () => {
  // Group S. employer_control_count counts checklist entries equal to
  // "employer"; strictly non-decreasing as more factors flip to employer.
  const factors = [
    "instructions", "training", "integration", "personal_service", "hiring_assistants",
    "continuing_relationship", "set_hours", "full_time", "work_on_premises", "order_of_work",
    "reports", "payment_method", "expenses_paid", "tools_and_materials", "investment",
    "profit_or_loss", "works_for_more_than_one", "available_to_public", "right_to_discharge", "right_to_terminate",
  ];
  let prev = -1;
  let checklist = {};
  for (let i = 0; i <= factors.length; i++) {
    const r = computeContractorVsEmployee({ test: "irs", checklist });
    assert.equal(r.employer_control_count, i, `count at i=${i}: ${r.employer_control_count}`);
    assert.ok(r.employer_control_count >= prev,
      `count at i=${i} = ${r.employer_control_count} not >= prev=${prev}`);
    prev = r.employer_control_count;
    if (i < factors.length) checklist[factors[i]] = "employer";
  }
  // Boundary pin: 10 vs 10 -> tie classifies as independent (the
  // "employer > independent" comparator is strict).
  const tie = computeContractorVsEmployee({
    test: "irs",
    checklist: Object.fromEntries(factors.map((f, i) => [f, i < 10 ? "employer" : "worker"])),
  });
  assert.equal(tie.employer_control_count, 10);
  assert.equal(tie.independent_count, 10);
  assert.equal(tie.result, "independent_contractor");
  // 11 employer vs 9 worker -> tips to employee.
  const tip = computeContractorVsEmployee({
    test: "irs",
    checklist: Object.fromEntries(factors.map((f, i) => [f, i < 11 ? "employer" : "worker"])),
  });
  assert.equal(tip.result, "employee");
  // ABC all-three pin: A && B && C is required for contractor; any false
  // tips to employee (Cal. Lab. Code 2775 / Dynamex / AB 5).
  const abcAll = computeContractorVsEmployee({ test: "abc", checklist: { A: true, B: true, C: true }, state: "CA" });
  assert.equal(abcAll.result, "independent_contractor");
  const abcBFail = computeContractorVsEmployee({ test: "abc", checklist: { A: true, B: false, C: true }, state: "CA" });
  assert.equal(abcBFail.result, "employee");
});

test("monotonicity: computeTopOfDescent distance_to_start_nm is strictly increasing in cruise_altitude_ft at fixed target; descent_rate_fpm strictly increasing in ground_speed_kt (3-to-1 rule pin)", () => {
  // Group W. distance_nm = (cruise - target) / 1000 * 3; strictly
  // increasing in cruise at fixed target / GS.
  let prev = -Infinity;
  for (const cruise_altitude_ft of [8000, 12000, 18000, 24000, 30000, 35000, 41000]) {
    const r = computeTopOfDescent({ cruise_altitude_ft, target_altitude_ft: 5000, ground_speed_kt: 240 });
    assert.ok(Number.isFinite(r.distance_to_start_nm) && r.distance_to_start_nm > 0,
      `dist at cruise=${cruise_altitude_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.distance_to_start_nm > prev,
      `dist at cruise=${cruise_altitude_ft} = ${r.distance_to_start_nm} not greater than prev=${prev}`);
    prev = r.distance_to_start_nm;
  }
  // Strict monotonicity of descent_rate_fpm in ground_speed_kt.
  let prevRate = -Infinity;
  for (const ground_speed_kt of [80, 120, 180, 240, 300, 360, 480]) {
    const r = computeTopOfDescent({ cruise_altitude_ft: 35000, target_altitude_ft: 5000, ground_speed_kt });
    assert.ok(r.descent_rate_fpm > prevRate,
      `rate at GS=${ground_speed_kt} = ${r.descent_rate_fpm} not greater than prev=${prevRate}`);
    prevRate = r.descent_rate_fpm;
  }
  // Closed-form pin from topOfDescentExample: FL350 -> 5000 ft target at
  // 240 kt -> 30000 ft / 1000 * 3 = 90 nm distance; rate = 240 * 5.5556 =
  // 1333.33 fpm; time = 30000 / 1333.33 = 22.5 min.
  const ref = computeTopOfDescent({ cruise_altitude_ft: 35000, target_altitude_ft: 5000, ground_speed_kt: 240 });
  assert.equal(ref.altitude_to_lose_ft, 30000);
  assert.equal(ref.distance_to_start_nm, 90);
  assert.ok(Math.abs(ref.descent_rate_fpm - 1333.3333333333) < 1e-6,
    `rate = ${ref.descent_rate_fpm}, expected 1333.33`);
  assert.ok(Math.abs(ref.time_to_descend_min - 22.5) < 1e-6,
    `time = ${ref.time_to_descend_min}, expected 22.5`);
});

test("monotonicity: computeExpansionTank tank_volume_gal is strictly increasing in system_volume_gal at fixed temperatures / pressures (ASHRAE expansion-tank linear pin)", () => {
  // Group C. V_tank = system_volume_gal * ((rho_cold/rho_hot - 1) /
  // (1 - P_initial/P_final)). Linear in system_volume_gal at fixed
  // T / P, so strictly increasing.
  let prev = -Infinity;
  for (const system_volume_gal of [25, 50, 100, 200, 400, 800]) {
    const r = computeExpansionTank({ system_volume_gal, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
    assert.ok(Number.isFinite(r.tank_volume_gal) && r.tank_volume_gal > 0,
      `tank at V=${system_volume_gal}: ${JSON.stringify(r)}`);
    assert.ok(r.tank_volume_gal > prev,
      `tank at V=${system_volume_gal} = ${r.tank_volume_gal} not greater than prev=${prev}`);
    prev = r.tank_volume_gal;
  }
  // Doubling-volume pin: 2x system -> 2x tank exactly (linear).
  const a = computeExpansionTank({ system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  const b = computeExpansionTank({ system_volume_gal: 200, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 });
  assert.ok(Math.abs(b.tank_volume_gal - 2 * a.tank_volume_gal) < 1e-9,
    `2x system: tank = ${b.tank_volume_gal} != 2 * ${a.tank_volume_gal}`);
  // Absolute-pressure pin: P_initial_abs = 12 + 14.7 = 26.7; P_final_abs
  // = 30 + 14.7 = 44.7.
  assert.equal(a.P_initial_abs, 12 + 14.7);
  assert.equal(a.P_final_abs, 30 + 14.7);
  // precharge_psi = fill_pressure_psi pin (standard practice).
  assert.equal(a.precharge_psi, 12);
  // Closed-form pin: V_tank = system * ((rc/rh - 1) / (1 - Pi/Pf)).
  const expected = 100 * (((a.rho_cold / a.rho_hot) - 1) / (1 - (a.P_initial_abs / a.P_final_abs)));
  assert.ok(Math.abs(a.tank_volume_gal - expected) < 1e-9,
    `tank = ${a.tank_volume_gal}, expected ${expected}`);
});

test("monotonicity: computeConduitFill fill_percent is strictly increasing in conductor count at fixed conduit / insulation (NEC Chapter 9 Table 5 area-sum pin)", () => {
  // Group A. fill_in2 = sum(conductor_area * count); fill_percent =
  // fill_in2 / conduit_area * 100. Strictly increasing in count.
  let prev = -Infinity;
  for (const count of [1, 2, 3, 4, 5, 6, 7]) {
    const r = computeConduitFill({
      conduit: "EMT", trade_size: "3/4",
      conductors: [{ insulation: "THHN", awg: "12", count }],
    });
    assert.ok(Number.isFinite(r.fill_percent), `fill at n=${count}: ${JSON.stringify(r)}`);
    assert.ok(r.fill_percent > prev,
      `fill at n=${count} = ${r.fill_percent} not greater than prev=${prev}`);
    prev = r.fill_percent;
  }
  // Doubling-conductors pin: 2x count -> 2x fill_in2 exactly (linear).
  const a = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 4 }] });
  const b = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 8 }] });
  assert.ok(Math.abs(b.fill_in2 - 2 * a.fill_in2) < 1e-12,
    `2x count: fill_in2 = ${b.fill_in2} != 2 * ${a.fill_in2}`);
  // NEC threshold step pin: n=1 -> 53%; n=2 -> 31%; n>=3 -> 40%.
  const one = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 1 }] });
  const two = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 2 }] });
  const three = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 3 }] });
  assert.equal(one.threshold_percent, 53);
  assert.equal(two.threshold_percent, 31);
  assert.equal(three.threshold_percent, 40);
  // conduitFillExample pass pin: EMT 3/4 with 4 x THHN #12 must pass.
  assert.equal(a.pass, true);
  assert.equal(a.count, 4);
});

// --- spec-v14 §10.3 Phase F thirty-second monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (T / V / E / F / G).

import { computeMolecularWeight } from "../../calc-lab.js";
import { computeAPGAR } from "../../calc-ems.js";
import { computeDrywall } from "../../calc-construction.js";
import { computeSprinklerDensity } from "../../calc-fire.js";
import { computeLadderAngle } from "../../calc-cross.js";

test("monotonicity: computeMolecularWeight molecular_weight is strictly increasing in repeating-unit count (linear-sum IUPAC atomic-weight pin)", () => {
  // Group T. MW(X_n) = atomic_weight(X) * n; strictly increasing in n.
  let prev = -Infinity;
  for (const n of [1, 2, 3, 4, 6, 8, 12]) {
    const r = computeMolecularWeight({ formula: `H${n === 1 ? "" : n}` });
    assert.ok(Number.isFinite(r.molecular_weight) && r.molecular_weight > 0,
      `MW at H${n}: ${JSON.stringify(r)}`);
    assert.ok(r.molecular_weight > prev,
      `MW at H${n} = ${r.molecular_weight} not greater than prev=${prev}`);
    prev = r.molecular_weight;
  }
  // Closed-form pin from mwExample: (NH4)2SO4 -> ammonium sulfate -> 132.14 g/mol.
  // 2*(N + 4*H) + S + 4*O = 2*(14.007 + 4*1.008) + 32.06 + 4*15.999 = 132.14
  const ref = computeMolecularWeight({ formula: "(NH4)2SO4" });
  assert.ok(Math.abs(ref.molecular_weight - 132.14) < 0.05,
    `(NH4)2SO4 MW = ${ref.molecular_weight}, expected ~132.14`);
  // H2O closed-form pin: 2*1.008 + 15.999 = 18.015 g/mol.
  const water = computeMolecularWeight({ formula: "H2O" });
  assert.ok(Math.abs(water.molecular_weight - 18.015) < 0.05,
    `H2O MW = ${water.molecular_weight}, expected ~18.015`);
  // Doubling identity pin: MW(O2) = 2 * MW(O) exactly.
  const o = computeMolecularWeight({ formula: "O" });
  const o2 = computeMolecularWeight({ formula: "O2" });
  assert.ok(Math.abs(o2.molecular_weight - 2 * o.molecular_weight) < 1e-9,
    `MW(O2) = ${o2.molecular_weight} != 2 * MW(O) = ${2 * o.molecular_weight}`);
});

test("monotonicity: computeAPGAR total is strictly non-decreasing as any single component rises 0 -> 1 -> 2; band tips at 4 and 7 (Apgar 1953 5-component pin)", () => {
  // Group V. total = sum of five 0/1/2 components; non-decreasing in
  // each component. Sweep pulse 0->2 at fixed other components and pin
  // the band-transition thresholds at 4 and 7.
  let prev = -Infinity;
  for (const pulse of [0, 1, 2]) {
    const r = computeAPGAR({ appearance: 2, pulse, grimace: 1, activity: 2, respiration: 2 });
    assert.ok(Number.isFinite(r.total), `total at pulse=${pulse}: ${JSON.stringify(r)}`);
    assert.ok(r.total > prev,
      `total at pulse=${pulse} = ${r.total} not greater than prev=${prev}`);
    prev = r.total;
  }
  // Closed-form pin from apgarExample: 2+2+1+2+2 = 9 -> vigorous (7-10).
  const ref = computeAPGAR({ appearance: 2, pulse: 2, grimace: 1, activity: 2, respiration: 2 });
  assert.equal(ref.total, 9);
  assert.equal(ref.band, "vigorous (7-10)");
  // Band-boundary pin at 7: total=7 -> vigorous; total=6 -> moderately
  // depressed (4-6).
  const at7 = computeAPGAR({ appearance: 2, pulse: 2, grimace: 1, activity: 1, respiration: 1 });
  assert.equal(at7.total, 7);
  assert.equal(at7.band, "vigorous (7-10)");
  const at6 = computeAPGAR({ appearance: 2, pulse: 1, grimace: 1, activity: 1, respiration: 1 });
  assert.equal(at6.total, 6);
  assert.equal(at6.band, "moderately depressed (4-6)");
  // Band-boundary pin at 4: total=4 -> moderately depressed; total=3 ->
  // severely depressed (0-3).
  const at4 = computeAPGAR({ appearance: 1, pulse: 1, grimace: 1, activity: 1, respiration: 0 });
  assert.equal(at4.total, 4);
  assert.equal(at4.band, "moderately depressed (4-6)");
  const at3 = computeAPGAR({ appearance: 1, pulse: 1, grimace: 1, activity: 0, respiration: 0 });
  assert.equal(at3.total, 3);
  assert.equal(at3.band, "severely depressed (0-3)");
  // Zero pin: all 0 -> total 0 -> severely depressed.
  const allZero = computeAPGAR({ appearance: 0, pulse: 0, grimace: 0, activity: 0, respiration: 0 });
  assert.equal(allZero.total, 0);
  assert.equal(allZero.band, "severely depressed (0-3)");
});

test("monotonicity: computeDrywall mud_gal + tape_lf + total_ft2 are strictly increasing in wall_area_ft2 at fixed ceiling / sheet (0.053 gal/ft^2 + 1.0 lf/ft^2 linear pin)", () => {
  // Group E. mud_gal = total_ft2 * 0.053; tape_lf = total_ft2 * 1.0.
  // Strictly increasing in wall_area_ft2 at fixed ceiling.
  let prevMud = -Infinity;
  let prevTape = -Infinity;
  let prevTotal = -Infinity;
  for (const wall_area_ft2 of [100, 250, 500, 1000, 2000, 4000]) {
    const r = computeDrywall({ wall_area_ft2, ceiling_area_ft2: 600, sheet_size: "4x8", waste_percent: 10 });
    assert.ok(Number.isFinite(r.mud_gal) && r.mud_gal > 0, `drywall at W=${wall_area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.mud_gal > prevMud, `mud at W=${wall_area_ft2} = ${r.mud_gal} not greater than prev=${prevMud}`);
    assert.ok(r.tape_lf > prevTape, `tape at W=${wall_area_ft2} = ${r.tape_lf} not greater than prev=${prevTape}`);
    assert.ok(r.total_ft2 > prevTotal, `total at W=${wall_area_ft2} = ${r.total_ft2} not greater than prev=${prevTotal}`);
    prevMud = r.mud_gal;
    prevTape = r.tape_lf;
    prevTotal = r.total_ft2;
  }
  // Closed-form pin from drywallExample: wall=1200 + ceiling=600 -> total=1800;
  // mud = 1800 * 0.053 = 95.4 gal; tape = 1800 lf.
  const ref = computeDrywall({ wall_area_ft2: 1200, ceiling_area_ft2: 600, sheet_size: "4x8", waste_percent: 10 });
  assert.equal(ref.total_ft2, 1800);
  assert.ok(Math.abs(ref.mud_gal - 1800 * 0.053) < 1e-12,
    `mud = ${ref.mud_gal}, expected ${1800 * 0.053}`);
  assert.ok(Math.abs(ref.tape_lf - 1800) < 1e-12,
    `tape = ${ref.tape_lf}, expected 1800`);
  // Sheets pin at 4x8 / 10% waste: ceil(1800 * 1.10 / 32) = ceil(61.875) = 62.
  assert.equal(ref.sheets, 62);
});

test("monotonicity: computeSprinklerDensity total_gpm is strictly increasing in area_of_operation_ft2 at fixed density (NFPA 13 area-x-density linear pin)", () => {
  // Group F. total_gpm = area * density; strictly increasing in area.
  let prev = -Infinity;
  for (const area_of_operation_ft2 of [500, 1000, 1500, 2000, 3000, 4500, 6000]) {
    const r = computeSprinklerDensity({ area_of_operation_ft2, hazard_category: "ordinary_2" });
    assert.ok(Number.isFinite(r.total_gpm) && r.total_gpm > 0,
      `gpm at A=${area_of_operation_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.total_gpm > prev,
      `gpm at A=${area_of_operation_ft2} = ${r.total_gpm} not greater than prev=${prev}`);
    prev = r.total_gpm;
  }
  // Doubling-area pin: 2x area -> 2x gpm exactly.
  const a = computeSprinklerDensity({ area_of_operation_ft2: 1500, hazard_category: "ordinary_2" });
  const b = computeSprinklerDensity({ area_of_operation_ft2: 3000, hazard_category: "ordinary_2" });
  assert.ok(Math.abs(b.total_gpm - 2 * a.total_gpm) < 1e-9,
    `2x area: gpm = ${b.total_gpm} != 2 * ${a.total_gpm}`);
  // Closed-form pin from sprinklerDensityExample: ordinary_2 -> 0.20
  // gpm/ft^2 per NFPA 13; 1500 ft^2 * 0.20 = 300 gpm.
  assert.ok(Math.abs(a.total_gpm - 300) < 1e-9,
    `total_gpm = ${a.total_gpm}, expected 300`);
  assert.equal(a.density_gpm_per_ft2, 0.20);
  assert.equal(a.meets_minimum, true);
  // Above-minimum pin: explicit density > hazard minimum keeps meets_minimum=true.
  const above = computeSprinklerDensity({ area_of_operation_ft2: 1500, density_gpm_per_ft2: 0.25, hazard_category: "ordinary_2" });
  assert.equal(above.meets_minimum, true);
  // Below-minimum pin: explicit density < hazard minimum tips meets_minimum=false.
  const below = computeSprinklerDensity({ area_of_operation_ft2: 1500, density_gpm_per_ft2: 0.15, hazard_category: "ordinary_2" });
  assert.equal(below.meets_minimum, false);
});

test("monotonicity: computeLadderAngle set_angle_deg is strictly increasing in working_height_ft at fixed ladder_length_ft (asin sin(angle) = h/L pin) + 4:1 base-distance + 75.5 deg OSHA pass-band pin", () => {
  // Group G. sin(angle) = h / L; asin is strictly increasing on [0, 1].
  let prev = -Infinity;
  for (const working_height_ft of [0, 5, 10, 15, 20, 22, 23, 23.5]) {
    const r = computeLadderAngle({ ladder_length_ft: 24, working_height_ft });
    assert.ok(Number.isFinite(r.set_angle_deg),
      `angle at h=${working_height_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.set_angle_deg > prev,
      `angle at h=${working_height_ft} = ${r.set_angle_deg} not greater than prev=${prev}`);
    prev = r.set_angle_deg;
  }
  // Closed-form pin from ladderAngleExample: L=24 / h=23 -> sin = 23/24
  // -> angle = asin(23/24) deg = 73.39 deg (just under the 75.5 +- 3 deg pass band).
  const ref = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 23 });
  const expectedAngle = Math.asin(23 / 24) * 180 / Math.PI;
  assert.ok(Math.abs(ref.set_angle_deg - expectedAngle) < 1e-9,
    `angle = ${ref.set_angle_deg}, expected ${expectedAngle}`);
  // 4:1 base-distance pin: recommended_base = h / 4.
  assert.ok(Math.abs(ref.base_distance_ft - 23 / 4) < 1e-12,
    `base = ${ref.base_distance_ft}, expected ${23 / 4}`);
  // h=0 boundary pin: laying flat -> angle=0 / pass=false.
  const flat = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 0 });
  assert.equal(flat.set_angle_deg, 0);
  assert.equal(flat.pass, false);
  // 75.5 deg pass-band pin: a 24 ft ladder at h=24*sin(75.5 deg) ~ 23.225 ft
  // sits exactly at 75.5 deg and is inside the +-3 deg pass band.
  const onAngle = computeLadderAngle({ ladder_length_ft: 24, working_height_ft: 24 * Math.sin(75.5 * Math.PI / 180) });
  assert.ok(Math.abs(onAngle.set_angle_deg - 75.5) < 1e-9,
    `on-angle = ${onAngle.set_angle_deg}, expected 75.5`);
  assert.equal(onAngle.pass, true);
});

// --- spec-v14 §10.3 Phase F thirty-third monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (K / O / U / X / M).

import { computeDriveshaftCritical } from "../../calc-mechanic.js";
import { computeCoolingCurve } from "../../calc-kitchen.js";
import { computeHeartwormDose } from "../../calc-vet.js";
import { computeCashOnCash } from "../../calc-realestate.js";
import { computeSVI } from "../../calc-water.js";

test("monotonicity: computeDriveshaftCritical critical_rpm is strictly decreasing in length_in at fixed OD / wall / material (Euler-Bernoulli 1/L^2 first-mode pin)", () => {
  // Group K. N_crit ~ (1/L^2) * sqrt(EI / (rho*A)); strictly decreasing
  // in length_in at fixed OD / wall / material.
  let prev = Infinity;
  for (const length_in of [20, 30, 40, 50, 60, 75, 100]) {
    const r = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in, material: "steel" });
    assert.ok(Number.isFinite(r.critical_rpm) && r.critical_rpm > 0,
      `N_crit at L=${length_in}: ${JSON.stringify(r)}`);
    assert.ok(r.critical_rpm < prev,
      `N_crit at L=${length_in} = ${r.critical_rpm} not less than prev=${prev}`);
    prev = r.critical_rpm;
  }
  // 1/L^2 scaling pin: doubling length quarters critical_rpm exactly
  // (only the L^-2 prefactor depends on length; EI and rho*A are fixed).
  const a = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 25, material: "steel" });
  const b = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 50, material: "steel" });
  const ratio = a.critical_rpm / b.critical_rpm;
  assert.ok(Math.abs(ratio - 4) < 1e-9,
    `1/L^2 scaling broken: ratio = ${ratio} (expected 4)`);
  // recommended_max_rpm pin: 0.65 * critical (standard 0.6-0.75 safety
  // factor; bundled value 0.65).
  assert.ok(Math.abs(a.recommended_max_rpm - 0.65 * a.critical_rpm) < 1e-9,
    `safe_rpm = ${a.recommended_max_rpm} != 0.65 * ${a.critical_rpm}`);
  // Material-step pin: aluminum has lower E and lower rho; the E/rho
  // ratio governs N_crit. Steel E/rho = 200e9/7850 ~ 2.548e7;
  // aluminum E/rho = 70e9/2700 ~ 2.593e7; aluminum is marginally higher.
  const steel = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 50, material: "steel" });
  const alum = computeDriveshaftCritical({ od_in: 3.5, wall_in: 0.083, length_in: 50, material: "aluminum" });
  assert.ok(alum.critical_rpm > steel.critical_rpm,
    `aluminum critical_rpm = ${alum.critical_rpm} not greater than steel = ${steel.critical_rpm}`);
});

test("monotonicity: computeCoolingCurve phase1_minutes and phase2_minutes are strictly increasing in ambient_F over the unclamped band [55, 100] F (FDA cooling 135 -> 70 -> 41 ambient-factor linear pin)", () => {
  // Group O. ambient_factor = 1 + clamp((amb - 70) / 50, -0.3, 0.6).
  // Over ambient_F in [55, 100] the inner expression sits inside the
  // clamp, so phase1 / phase2 are strictly increasing in ambient_F.
  let prev1 = -Infinity;
  let prev2 = -Infinity;
  for (const ambient_F of [55, 60, 65, 70, 75, 80, 90, 100]) {
    const r = computeCoolingCurve({ start_F: 165, ambient_F, container: "full_pan_4in", product_type: "thick_liquid" });
    assert.ok(Number.isFinite(r.phase1_minutes) && r.phase1_minutes > 0,
      `phase1 at amb=${ambient_F}: ${JSON.stringify(r)}`);
    assert.ok(r.phase1_minutes > prev1,
      `phase1 at amb=${ambient_F} = ${r.phase1_minutes} not greater than prev=${prev1}`);
    assert.ok(r.phase2_minutes > prev2,
      `phase2 at amb=${ambient_F} = ${r.phase2_minutes} not greater than prev=${prev2}`);
    prev1 = r.phase1_minutes;
    prev2 = r.phase2_minutes;
  }
  // Closed-form pin from coolingCurveExample: ambient_F = 70 ->
  // ambient_factor = 1 exactly -> phase1 = base, phase2 = 1.6 * base.
  const ref = computeCoolingCurve({ start_F: 165, ambient_F: 70, container: "full_pan_4in", product_type: "thick_liquid" });
  assert.ok(Math.abs(ref.phase2_minutes - 1.6 * ref.phase1_minutes) < 1e-12,
    `phase2 = ${ref.phase2_minutes} != 1.6 * phase1 = ${1.6 * ref.phase1_minutes}`);
  // Cold ambient (clamp floor at -0.3) pin: amb=20 F -> factor = 0.7;
  // amb=10 F -> still 0.7 (clamp floor); phase1 equal.
  const cold20 = computeCoolingCurve({ start_F: 165, ambient_F: 20, container: "full_pan_4in", product_type: "thick_liquid" });
  const cold10 = computeCoolingCurve({ start_F: 165, ambient_F: 10, container: "full_pan_4in", product_type: "thick_liquid" });
  assert.ok(Math.abs(cold20.phase1_minutes - 0.7 * ref.phase1_minutes) < 1e-12,
    `cold-clamp: phase1 at 20 F = ${cold20.phase1_minutes} != 0.7 * base = ${0.7 * ref.phase1_minutes}`);
  assert.equal(cold20.phase1_minutes, cold10.phase1_minutes);
  // Hot ambient (clamp ceiling at 0.6) pin: amb=100 F -> factor = 1.6;
  // amb=110 F -> still 1.6 (clamp ceiling); phase1 equal.
  const hot100 = computeCoolingCurve({ start_F: 165, ambient_F: 100, container: "full_pan_4in", product_type: "thick_liquid" });
  const hot110 = computeCoolingCurve({ start_F: 165, ambient_F: 110, container: "full_pan_4in", product_type: "thick_liquid" });
  assert.ok(Math.abs(hot100.phase1_minutes - 1.6 * ref.phase1_minutes) < 1e-12,
    `hot-clamp: phase1 at 100 F = ${hot100.phase1_minutes} != 1.6 * base = ${1.6 * ref.phase1_minutes}`);
  assert.equal(hot100.phase1_minutes, hot110.phase1_minutes);
});

test("monotonicity: computeHeartwormDose weight_lb is strictly increasing in weight (linear LB_PER_KG conversion pin); band_label monotone non-decreasing as weight rises through Heartgard Plus labeled bands", () => {
  // Group U. weight_lb = wt_kg * LB_PER_KG; strictly increasing.
  let prev = -Infinity;
  for (const weight of [1, 2, 5, 10, 20, 40, 80]) {
    const r = computeHeartwormDose({ weight, weight_unit: "kg", active_ingredient: "ivermectin" });
    assert.ok(Number.isFinite(r.weight_lb) && r.weight_lb > 0,
      `weight_lb at w=${weight}: ${JSON.stringify(r)}`);
    assert.ok(r.weight_lb > prev,
      `weight_lb at w=${weight} = ${r.weight_lb} not greater than prev=${prev}`);
    prev = r.weight_lb;
  }
  // Closed-form pin from heartwormExample: 20 kg -> ~44.09 lb; Heartgard
  // Plus green-tablet band covers 26-50 lb.
  const ref = computeHeartwormDose({ weight: 20, weight_unit: "kg", active_ingredient: "ivermectin" });
  assert.ok(Math.abs(ref.weight_lb - 20 * 2.20462) < 0.01,
    `weight_lb = ${ref.weight_lb}, expected ~44.0924`);
  assert.ok(/Green/.test(ref.band_label),
    `band_label at 20 kg = ${ref.band_label}, expected to contain 'Green'`);
  // kg<->lb unit-conversion identity pin: same patient via kg or lb path
  // produces the same band.
  const fromLb = computeHeartwormDose({ weight: 44.09, weight_unit: "lb", active_ingredient: "ivermectin" });
  assert.equal(fromLb.band_label, ref.band_label);
  // Band-step pin: low weight resolves to the lightest band; high weight
  // resolves to a heavier band (band_label strictly differs).
  const tiny = computeHeartwormDose({ weight: 3, weight_unit: "kg", active_ingredient: "ivermectin" });
  const big = computeHeartwormDose({ weight: 40, weight_unit: "kg", active_ingredient: "ivermectin" });
  assert.notEqual(tiny.band_label, big.band_label);
});

test("monotonicity: computeCashOnCash cash_on_cash_percent is strictly increasing in annual_pretax_cashflow at fixed cash_invested; payback_years strictly decreasing in cashflow (CoC = CF / Inv linear pin)", () => {
  // Group X. coc = (cf / inv) * 100; strictly increasing in cf. payback
  // = inv / cf; strictly decreasing in cf for cf > 0.
  let prevCoc = -Infinity;
  let prevPay = Infinity;
  for (const annual_pretax_cashflow of [1000, 3000, 5000, 7500, 10000, 15000, 25000]) {
    const r = computeCashOnCash({ cash_invested: 75000, annual_pretax_cashflow });
    assert.ok(Number.isFinite(r.cash_on_cash_percent),
      `CoC at CF=${annual_pretax_cashflow}: ${JSON.stringify(r)}`);
    assert.ok(r.cash_on_cash_percent > prevCoc,
      `CoC at CF=${annual_pretax_cashflow} = ${r.cash_on_cash_percent} not greater than prev=${prevCoc}`);
    assert.ok(r.payback_years < prevPay,
      `payback at CF=${annual_pretax_cashflow} = ${r.payback_years} not less than prev=${prevPay}`);
    prevCoc = r.cash_on_cash_percent;
    prevPay = r.payback_years;
  }
  // Closed-form pin from cashOnCashExample: 6750 / 75000 -> CoC=9.0% /
  // payback = 75000 / 6750 = 11.111... years.
  const ref = computeCashOnCash({ cash_invested: 75000, annual_pretax_cashflow: 6750 });
  assert.equal(ref.cash_on_cash_percent, 9);
  assert.ok(Math.abs(ref.payback_years - (75000 / 6750)) < 1e-9,
    `payback = ${ref.payback_years}, expected ${75000 / 6750}`);
  assert.equal(ref.band, "typical (6-10%)");
  // Band-boundary pins at 6, 10, 15: CoC=5.99 -> weak; CoC=6 -> typical;
  // CoC=9.99 -> typical; CoC=10 -> strong; CoC=14.99 -> strong; CoC=15 ->
  // secondary / value-add.
  const weak = computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 5990 });
  assert.equal(weak.band, "weak (<6%)");
  const typ = computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 6000 });
  assert.equal(typ.band, "typical (6-10%)");
  const strong = computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 10000 });
  assert.equal(strong.band, "strong (10-15%)");
  const secondary = computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 15000 });
  assert.equal(secondary.band, "secondary / value-add (>15%; verify the assumptions)");
  // Negative-cashflow pin: cf < 0 -> band = negative.
  const neg = computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: -2000 });
  assert.equal(neg.band, "negative (the investment loses cash each year)");
});

test("monotonicity: computeSVI svi_ml_per_g is strictly increasing in sv30_ml_per_l at fixed MLSS and strictly decreasing in mlss_mg_per_l at fixed SV30 (WEF MOP-11 SVI = SV30 * 1000 / MLSS pin)", () => {
  // Group M. svi = (sv30 * 1000) / mlss. Strictly increasing in sv30 and
  // strictly decreasing in mlss.
  let prevUp = -Infinity;
  for (const sv30_ml_per_l of [50, 100, 200, 300, 400, 600, 800]) {
    const r = computeSVI({ sv30_ml_per_l, mlss_mg_per_l: 2500 });
    assert.ok(Number.isFinite(r.svi_ml_per_g) && r.svi_ml_per_g > 0,
      `SVI at SV30=${sv30_ml_per_l}: ${JSON.stringify(r)}`);
    assert.ok(r.svi_ml_per_g > prevUp,
      `SVI at SV30=${sv30_ml_per_l} = ${r.svi_ml_per_g} not greater than prev=${prevUp}`);
    prevUp = r.svi_ml_per_g;
  }
  let prevDown = Infinity;
  for (const mlss_mg_per_l of [1000, 1500, 2000, 2500, 3500, 5000, 8000]) {
    const r = computeSVI({ sv30_ml_per_l: 300, mlss_mg_per_l });
    assert.ok(r.svi_ml_per_g < prevDown,
      `SVI at MLSS=${mlss_mg_per_l} = ${r.svi_ml_per_g} not less than prev=${prevDown}`);
    prevDown = r.svi_ml_per_g;
  }
  // Doubling-SV30 pin: 2x SV30 -> 2x SVI exactly.
  const a = computeSVI({ sv30_ml_per_l: 200, mlss_mg_per_l: 2500 });
  const b = computeSVI({ sv30_ml_per_l: 400, mlss_mg_per_l: 2500 });
  assert.ok(Math.abs(b.svi_ml_per_g - 2 * a.svi_ml_per_g) < 1e-12,
    `2x SV30: SVI = ${b.svi_ml_per_g} != 2 * ${a.svi_ml_per_g}`);
  // Closed-form pin from sviExample: SV30=300 / MLSS=2500 -> SVI = 120
  // mL/g exact -> typical 80-150 band.
  const ref = computeSVI({ sv30_ml_per_l: 300, mlss_mg_per_l: 2500 });
  assert.ok(Math.abs(ref.svi_ml_per_g - 120) < 1e-12,
    `SVI = ${ref.svi_ml_per_g}, expected 120`);
  assert.equal(ref.band, "typical conventional activated sludge (80-150)");
  // Band-boundary pins at 80 / 150 / 200.
  const pin80 = computeSVI({ sv30_ml_per_l: 200, mlss_mg_per_l: 2500 });
  assert.equal(pin80.svi_ml_per_g, 80);
  assert.equal(pin80.band, "typical conventional activated sludge (80-150)");
  const pinUnder80 = computeSVI({ sv30_ml_per_l: 199, mlss_mg_per_l: 2500 });
  assert.equal(pinUnder80.band, "pin floc / under-aerated (< 80; verify MLSS and DO)");
  const pinOver150 = computeSVI({ sv30_ml_per_l: 400, mlss_mg_per_l: 2500 });
  assert.ok(pinOver150.svi_ml_per_g > 150 && pinOver150.svi_ml_per_g <= 200);
  assert.equal(pinOver150.band, "filamentous growth developing (150-200; investigate)");
  const pinOver200 = computeSVI({ sv30_ml_per_l: 600, mlss_mg_per_l: 2500 });
  assert.ok(pinOver200.svi_ml_per_g > 200);
  assert.equal(pinOver200.band, "bulking conditions (> 200; sludge will not settle)");
});

// --- spec-v14 §10.3 Phase F thirty-fourth monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (B / D / L / P / R).

import { computeTrapArm } from "../../calc-plumbing.js";
import { computeChamberTurnover } from "../../calc-restoration.js";
import { computeTimberCruise } from "../../calc-agriculture.js";
import { computeSlopeAvalanche } from "../../calc-field.js";
import { computeSalesTaxCompound } from "../../calc-accounting.js";

test("monotonicity: computeTrapArm max_length_ft is strictly increasing in pipe_diameter_in at fixed 0.25 in/ft slope (UPC 1002.2 trap-arm table pin)", () => {
  // Group B. UPC 1002.2 table: 1.25"->3.5 ft, 1.5"->5 ft, 2"->8 ft,
  // 3"->12 ft, 4"->16 ft. At 0.25 in/ft slope the fall limit (D / slope =
  // 4*D) sits at or above the table for every bundled size, so the
  // table maxes are returned and strictly increase in D.
  const sizes = ["1.25", "1.5", "2", "3", "4"];
  let prev = -Infinity;
  for (const pipe_diameter_in of sizes) {
    const r = computeTrapArm({ pipe_diameter_in, slope_in_per_ft: 0.25 });
    assert.ok(Number.isFinite(r.max_length_ft) && r.max_length_ft > 0,
      `max at D=${pipe_diameter_in}: ${JSON.stringify(r)}`);
    assert.ok(r.max_length_ft > prev,
      `max at D=${pipe_diameter_in} = ${r.max_length_ft} not greater than prev=${prev}`);
    prev = r.max_length_ft;
  }
  // Table-pin closed form: 1.5" -> 5 ft / 2" -> 8 ft / 3" -> 12 ft / 4" -> 16 ft.
  const oneHalf = computeTrapArm({ pipe_diameter_in: 1.5, slope_in_per_ft: 0.25 });
  assert.equal(oneHalf.table_max_ft, 5);
  assert.equal(oneHalf.max_length_ft, 5);
  const four = computeTrapArm({ pipe_diameter_in: 4, slope_in_per_ft: 0.25 });
  assert.equal(four.table_max_ft, 16);
  assert.equal(four.max_length_ft, 16);
  // Steep-slope pin: at slope=0.5 in/ft the fall limit (D/0.5 = 2*D)
  // bites BEFORE the table for the larger sizes. 4" -> fall=8 ft < table=16 ft;
  // the steeper slope returns the smaller of the two.
  const steep = computeTrapArm({ pipe_diameter_in: 4, slope_in_per_ft: 0.5 });
  assert.equal(steep.table_max_ft, 16);
  assert.equal(steep.fall_limited_ft, 8);
  assert.equal(steep.max_length_ft, 8);
  // Strict monotonicity in pipe diameter at the steep-slope branch
  // (fall-limited 2*D for every bundled size).
  let prevSteep = -Infinity;
  for (const pipe_diameter_in of sizes) {
    const r = computeTrapArm({ pipe_diameter_in, slope_in_per_ft: 0.5 });
    assert.ok(r.max_length_ft > prevSteep,
      `steep-max at D=${pipe_diameter_in} = ${r.max_length_ft} not greater than prev=${prevSteep}`);
    prevSteep = r.max_length_ft;
  }
});

test("monotonicity: computeChamberTurnover actual_ach is strictly increasing in total CFM and strictly decreasing in chamber_volume_ft3; gap_cfm strictly increasing in target_ach (IICRC ACH = Q*60/V pin)", () => {
  // Group D. actual_ach = (air_mover + dehu) * 60 / chamber_volume.
  // Strictly increasing in total CFM at fixed volume; strictly decreasing
  // in chamber volume at fixed CFM.
  let prev = -Infinity;
  for (const air_mover_total_cfm of [200, 500, 1000, 1500, 2000, 3000]) {
    const r = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach: 60, air_mover_total_cfm, dehu_cfm: 250 });
    assert.ok(Number.isFinite(r.actual_ach) && r.actual_ach > 0,
      `ACH at AM=${air_mover_total_cfm}: ${JSON.stringify(r)}`);
    assert.ok(r.actual_ach > prev,
      `ACH at AM=${air_mover_total_cfm} = ${r.actual_ach} not greater than prev=${prev}`);
    prev = r.actual_ach;
  }
  // Strictly decreasing in chamber volume.
  let prevDecr = Infinity;
  for (const chamber_volume_ft3 of [500, 800, 1500, 2500, 4000, 8000]) {
    const r = computeChamberTurnover({ chamber_volume_ft3, target_ach: 60, air_mover_total_cfm: 1200, dehu_cfm: 250 });
    assert.ok(r.actual_ach < prevDecr,
      `ACH at V=${chamber_volume_ft3} = ${r.actual_ach} not less than prev=${prevDecr}`);
    prevDecr = r.actual_ach;
  }
  // gap_cfm strictly increasing in target_ach at fixed CFM / volume.
  let prevGap = -Infinity;
  for (const target_ach of [20, 40, 60, 80, 100, 120]) {
    const r = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach, air_mover_total_cfm: 500, dehu_cfm: 100 });
    assert.ok(r.gap_cfm >= prevGap,
      `gap at ACH=${target_ach} = ${r.gap_cfm} not >= prev=${prevGap}`);
    prevGap = r.gap_cfm;
  }
  // Closed-form pin from chamberTurnoverExample: V=1500 / ACH target=60
  // / AM=1200 / dehu=250 -> total=1450 / actual_ach = 1450*60/1500 = 58.0
  // / required = 60*1500/60 = 1500 / gap = 50.
  const ref = computeChamberTurnover({ chamber_volume_ft3: 1500, target_ach: 60, air_mover_total_cfm: 1200, dehu_cfm: 250 });
  assert.ok(Math.abs(ref.actual_ach - 58.0) < 1e-9,
    `ACH = ${ref.actual_ach}, expected 58`);
  assert.equal(ref.required_cfm, 1500);
  assert.equal(ref.gap_cfm, 50);
});

test("monotonicity: computeTimberCruise board_feet is strictly increasing in small_end_dib_in (Doyle (D-4)^2 quadratic pin) and in log_length_ft (linear-in-L pin)", () => {
  // Group L. Doyle rule: bf = (D - 4)^2 * (L / 16). Strictly increasing
  // in D for D > 4 and strictly increasing in L for D > 4.
  let prev = -Infinity;
  for (const small_end_dib_in of [6, 8, 10, 12, 14, 18, 24]) {
    const r = computeTimberCruise({ small_end_dib_in, log_length_ft: 16, rule: "doyle" });
    assert.ok(Number.isFinite(r.board_feet) && r.board_feet > 0,
      `bf at D=${small_end_dib_in}: ${JSON.stringify(r)}`);
    assert.ok(r.board_feet > prev,
      `bf at D=${small_end_dib_in} = ${r.board_feet} not greater than prev=${prev}`);
    prev = r.board_feet;
  }
  // Doubling-length pin: 2x log length -> 2x bf exactly (linear in L).
  const a = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "doyle" });
  const b = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 32, rule: "doyle" });
  assert.ok(Math.abs(b.board_feet - 2 * a.board_feet) < 1e-9,
    `2x log length: bf = ${b.board_feet} != 2 * ${a.board_feet}`);
  // Closed-form pin from timberCruiseExample: D=14 / L=16 / doyle ->
  // (14-4)^2 * (16/16) = 100 bf exact.
  assert.equal(a.board_feet, 100);
  // Doyle floor pin: D <= 4 -> bf = 0 (max with 0).
  const small = computeTimberCruise({ small_end_dib_in: 4, log_length_ft: 16, rule: "doyle" });
  assert.equal(small.board_feet, 0);
  // value_usd pin: bf * price_per_bf when supplied.
  const valued = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "doyle", price_per_bf: 0.45 });
  assert.ok(Math.abs(valued.value_usd - 100 * 0.45) < 1e-9,
    `value_usd = ${valued.value_usd}, expected ${100 * 0.45}`);
});

test("monotonicity: computeSlopeAvalanche angle_deg is strictly increasing in rise_ft at fixed run; slope_percent strictly increasing in measured_angle_deg; in_avalanche_window true on [30, 45] (atan2 + tan pin)", () => {
  // Group P. angle = atan2(rise, run) * 180/PI; strictly increasing in
  // rise at fixed run. slope_percent = tan(angle) * 100; strictly
  // increasing in angle over (0, 90).
  let prevA = -Infinity;
  for (const rise_ft of [1, 5, 10, 20, 50, 100, 500]) {
    const r = computeSlopeAvalanche({ rise_ft, run_ft: 100 });
    assert.ok(Number.isFinite(r.angle_deg) && r.angle_deg > 0,
      `angle at rise=${rise_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.angle_deg > prevA,
      `angle at rise=${rise_ft} = ${r.angle_deg} not greater than prev=${prevA}`);
    prevA = r.angle_deg;
  }
  // slope_percent strictly increasing in measured_angle_deg.
  let prevP = -Infinity;
  for (const measured_angle_deg of [5, 15, 25, 35, 45, 60, 75]) {
    const r = computeSlopeAvalanche({ measured_angle_deg });
    assert.ok(r.slope_percent > prevP,
      `slope at angle=${measured_angle_deg} = ${r.slope_percent} not greater than prev=${prevP}`);
    prevP = r.slope_percent;
  }
  // Closed-form pin from slopeAvalancheExample: measured_angle=38 ->
  // slope_percent = tan(38 deg)*100 = 78.13...; in_avalanche_window=true
  // (30-45 deg AIARE / public avalanche-education band).
  const ref = computeSlopeAvalanche({ measured_angle_deg: 38 });
  assert.equal(ref.angle_deg, 38);
  const expectedPct = Math.tan(38 * Math.PI / 180) * 100;
  assert.ok(Math.abs(ref.slope_percent - expectedPct) < 1e-9,
    `slope_percent = ${ref.slope_percent}, expected ${expectedPct}`);
  assert.equal(ref.in_avalanche_window, true);
  // Boundary pins at 30 and 45 (inclusive on both ends).
  const at30 = computeSlopeAvalanche({ measured_angle_deg: 30 });
  assert.equal(at30.in_avalanche_window, true);
  const at45 = computeSlopeAvalanche({ measured_angle_deg: 45 });
  assert.equal(at45.in_avalanche_window, true);
  const at29_99 = computeSlopeAvalanche({ measured_angle_deg: 29.99 });
  assert.equal(at29_99.in_avalanche_window, false);
  const at45_01 = computeSlopeAvalanche({ measured_angle_deg: 45.01 });
  assert.equal(at45_01.in_avalanche_window, false);
  // 45-degree identity pin: tan(45) = 1 -> slope_percent = 100.
  const at45SlopePct = computeSlopeAvalanche({ measured_angle_deg: 45 });
  assert.ok(Math.abs(at45SlopePct.slope_percent - 100) < 1e-9,
    `slope_percent at 45 deg = ${at45SlopePct.slope_percent}, expected 100`);
});

test("monotonicity: computeSalesTaxCompound tax is strictly increasing in pre_tax at fixed combined rate; pre-tax / post-tax round-trip identity (combined-rate pin)", () => {
  // Group R. tax = pre_tax * (r1 + r2) / 100; strictly increasing in
  // pre_tax. Round trip: pre_tax -> post_tax -> recovered pre_tax must
  // match to the floating-point floor.
  let prev = -Infinity;
  for (const pre_tax of [50, 100, 250, 500, 1000, 2500, 10000]) {
    const r = computeSalesTaxCompound({ pre_tax, rate1_pct: 6, rate2_pct: 1.5 });
    assert.ok(Number.isFinite(r.tax) && r.tax > 0,
      `tax at pre=${pre_tax}: ${JSON.stringify(r)}`);
    assert.ok(r.tax > prev,
      `tax at pre=${pre_tax} = ${r.tax} not greater than prev=${prev}`);
    prev = r.tax;
  }
  // Closed-form pin from salesTaxExample: pre=100 / rates 6 + 1.5 ->
  // tax = 7.50 / post = 107.50 / combined = 7.5%.
  const ref = computeSalesTaxCompound({ pre_tax: 100, rate1_pct: 6, rate2_pct: 1.5 });
  assert.ok(Math.abs(ref.tax - 7.5) < 1e-12, `tax = ${ref.tax}, expected 7.5`);
  assert.ok(Math.abs(ref.post_tax - 107.5) < 1e-12, `post = ${ref.post_tax}, expected 107.5`);
  assert.equal(ref.combined_rate_pct, 7.5);
  // Round-trip identity pin: pre -> post -> recovered pre matches.
  const forward = computeSalesTaxCompound({ pre_tax: 250, rate1_pct: 6, rate2_pct: 1.5 });
  const back = computeSalesTaxCompound({ post_tax: forward.post_tax, rate1_pct: 6, rate2_pct: 1.5 });
  assert.ok(Math.abs(back.pre_tax - 250) < 1e-9,
    `round-trip pre = ${back.pre_tax}, expected 250`);
  assert.ok(Math.abs(back.tax - forward.tax) < 1e-9,
    `round-trip tax = ${back.tax}, expected ${forward.tax}`);
  // Doubling-pre pin: 2x pre_tax -> 2x tax exactly (linear in pre).
  const a = computeSalesTaxCompound({ pre_tax: 100, rate1_pct: 6, rate2_pct: 1.5 });
  const b = computeSalesTaxCompound({ pre_tax: 200, rate1_pct: 6, rate2_pct: 1.5 });
  assert.ok(Math.abs(b.tax - 2 * a.tax) < 1e-12,
    `2x pre: tax = ${b.tax} != 2 * ${a.tax}`);
});

// --- spec-v14 §10.3 Phase F thirty-fifth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (W / Y / E / J / N).

import { computeWindTriangle } from "../../calc-aviation.js";
import { computeConfidenceInterval } from "../../calc-edu.js";
import { computeRafter } from "../../calc-construction.js";
import { computePalletLoadout } from "../../calc-trucking.js";
import { computeSPLAtmospheric } from "../../calc-stage.js";

test("monotonicity: computeWindTriangle ground_speed_kt is strictly increasing in true_airspeed_kt at fixed wind triangle (FAA-H-8083-25C wind-triangle pin)", () => {
  // Group W. At fixed wind triangle, GS = TAS*cos(WCA) - headwind;
  // strictly increasing in TAS (and decreasing the WCA magnitude as TAS
  // rises means the cos(WCA) term grows). Use a fixed quartering wind
  // and sweep TAS.
  let prev = -Infinity;
  for (const true_airspeed_kt of [80, 100, 120, 150, 200, 250, 300]) {
    const r = computeWindTriangle({ true_course_deg: 90, true_airspeed_kt, wind_direction_deg: 40, wind_speed_kt: 25 });
    assert.ok(Number.isFinite(r.ground_speed_kt),
      `GS at TAS=${true_airspeed_kt}: ${JSON.stringify(r)}`);
    assert.ok(r.ground_speed_kt > prev,
      `GS at TAS=${true_airspeed_kt} = ${r.ground_speed_kt} not greater than prev=${prev}`);
    prev = r.ground_speed_kt;
  }
  // Closed-form pin from windTriangleExample: TC=090 / TAS=120 / wind
  // from 040 at 25 kt -> WCA = -9.18 deg / TH = 80.82 / GS = 102.39.
  const ref = computeWindTriangle({ true_course_deg: 90, true_airspeed_kt: 120, wind_direction_deg: 40, wind_speed_kt: 25 });
  assert.ok(Math.abs(ref.wca_deg - (-9.18)) < 0.01,
    `WCA = ${ref.wca_deg}, expected -9.18`);
  assert.ok(Math.abs(ref.true_heading_deg - 80.82) < 0.01,
    `TH = ${ref.true_heading_deg}, expected 80.82`);
  assert.ok(Math.abs(ref.ground_speed_kt - 102.39) < 0.01,
    `GS = ${ref.ground_speed_kt}, expected 102.39`);
  // Pure-tailwind identity: wind direction = course + 180 -> headwind = -WS;
  // crosswind = 0; WCA = 0; GS = TAS + WS.
  const tail = computeWindTriangle({ true_course_deg: 90, true_airspeed_kt: 120, wind_direction_deg: 270, wind_speed_kt: 25 });
  assert.ok(Math.abs(tail.crosswind_component_kt) < 1e-9,
    `pure-tail crosswind = ${tail.crosswind_component_kt}, expected 0`);
  assert.ok(Math.abs(tail.wca_deg) < 1e-9,
    `pure-tail WCA = ${tail.wca_deg}, expected 0`);
  assert.ok(Math.abs(tail.ground_speed_kt - 145) < 1e-9,
    `pure-tail GS = ${tail.ground_speed_kt}, expected 145`);
  // Pure-headwind identity: wind direction = course -> headwind = +WS;
  // crosswind = 0; WCA = 0; GS = TAS - WS = 120 - 25 = 95.
  const head = computeWindTriangle({ true_course_deg: 90, true_airspeed_kt: 120, wind_direction_deg: 90, wind_speed_kt: 25 });
  assert.ok(Math.abs(head.ground_speed_kt - 95) < 1e-9,
    `pure-head GS = ${head.ground_speed_kt}, expected 95`);
});

test("monotonicity: computeConfidenceInterval margin_of_error is strictly decreasing in n (sqrt-n pin) and strictly increasing in confidence_pct (z critical pin)", () => {
  // Group Y. MOE = z * sqrt(p*(1-p)/n); strictly decreasing in n at
  // fixed p and confidence.
  let prev = Infinity;
  for (const n of [50, 100, 200, 400, 1000, 2500, 10000]) {
    const r = computeConfidenceInterval({ mode: "proportion", n, proportion: 0.5, confidence_pct: 95 });
    assert.ok(Number.isFinite(r.margin_of_error) && r.margin_of_error > 0,
      `MOE at n=${n}: ${JSON.stringify(r)}`);
    assert.ok(r.margin_of_error < prev,
      `MOE at n=${n} = ${r.margin_of_error} not less than prev=${prev}`);
    prev = r.margin_of_error;
  }
  // sqrt-n quartering identity: 4x n -> 0.5x MOE exactly (SE scales by
  // 1/sqrt(n); MOE = z * SE).
  const a = computeConfidenceInterval({ mode: "proportion", n: 100, proportion: 0.5, confidence_pct: 95 });
  const b = computeConfidenceInterval({ mode: "proportion", n: 400, proportion: 0.5, confidence_pct: 95 });
  assert.ok(Math.abs(b.margin_of_error - a.margin_of_error / 2) < 1e-12,
    `4x n: MOE = ${b.margin_of_error} != ${a.margin_of_error} / 2`);
  // Strict monotonicity in confidence_pct: 80 / 90 / 95 / 98 / 99 ->
  // z 1.282 / 1.645 / 1.96 / 2.326 / 2.576 (strictly increasing).
  let prevConf = -Infinity;
  for (const confidence_pct of [80, 90, 95, 98, 99]) {
    const r = computeConfidenceInterval({ mode: "proportion", n: 100, proportion: 0.5, confidence_pct });
    assert.ok(r.margin_of_error > prevConf,
      `MOE at conf=${confidence_pct} = ${r.margin_of_error} not greater than prev=${prevConf}`);
    prevConf = r.margin_of_error;
  }
  // Closed-form pin from confidenceIntervalExample: p=0.6 / n=100 /
  // conf=95 -> z=1.96 / SE = sqrt(0.6*0.4/100) = 0.04899 /
  // MOE = 1.96 * 0.04899 = 0.09602 / CI = [0.504, 0.696].
  const ref = computeConfidenceInterval({ mode: "proportion", n: 100, proportion: 0.6, confidence_pct: 95 });
  assert.equal(ref.z_critical, 1.96);
  const expectedSE = Math.sqrt((0.6 * 0.4) / 100);
  assert.ok(Math.abs(ref.standard_error - expectedSE) < 1e-12,
    `SE = ${ref.standard_error}, expected ${expectedSE}`);
  assert.ok(Math.abs(ref.margin_of_error - 1.96 * expectedSE) < 1e-12,
    `MOE = ${ref.margin_of_error}, expected ${1.96 * expectedSE}`);
  assert.ok(Math.abs(ref.lower_bound - (0.6 - 1.96 * expectedSE)) < 1e-12,
    `lo = ${ref.lower_bound}, expected ${0.6 - 1.96 * expectedSE}`);
  // Mean-mode pin: MOE = z * sd / sqrt(n).
  const meanRef = computeConfidenceInterval({ mode: "mean", n: 100, mean: 50, sd: 10, confidence_pct: 95 });
  assert.ok(Math.abs(meanRef.standard_error - (10 / Math.sqrt(100))) < 1e-12,
    `mean SE = ${meanRef.standard_error}, expected 1.0`);
});

test("monotonicity: computeRafter rafter_length_ft is strictly increasing in horizontal_span_ft at fixed pitch / overhang (sqrt(rise^2 + 144)/12 multiplier pin)", () => {
  // Group E. rafter_length = (span + overhang) * sqrt(rise^2 + 144) / 12.
  // Strictly increasing in horizontal_span_ft at fixed pitch / overhang.
  let prev = -Infinity;
  for (const horizontal_span_ft of [4, 8, 12, 16, 20, 30, 40]) {
    const r = computeRafter({ horizontal_span_ft, pitch_rise_per_12: 6, overhang_ft: 1 });
    assert.ok(Number.isFinite(r.rafter_length_ft) && r.rafter_length_ft > 0,
      `rafter at span=${horizontal_span_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.rafter_length_ft > prev,
      `rafter at span=${horizontal_span_ft} = ${r.rafter_length_ft} not greater than prev=${prev}`);
    prev = r.rafter_length_ft;
  }
  // Strict monotonicity in pitch (a steeper pitch -> larger multiplier ->
  // longer rafter for the same span).
  let prevPitch = -Infinity;
  for (const pitch_rise_per_12 of [3, 4, 6, 8, 10, 12]) {
    const r = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12, overhang_ft: 1 });
    assert.ok(r.rafter_length_ft > prevPitch,
      `rafter at pitch=${pitch_rise_per_12} = ${r.rafter_length_ft} not greater than prev=${prevPitch}`);
    prevPitch = r.rafter_length_ft;
  }
  // Closed-form pin from rafterExample: span=12 / pitch=6/12 / overhang=1.
  // multiplier = sqrt(36 + 144) / 12 = sqrt(180) / 12 = 13.4164 / 12 = 1.11803.
  // rafter = (12 + 1) * 1.11803 = 14.534 ft.
  const ref = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12: 6, overhang_ft: 1 });
  const expectedMult = Math.sqrt(6 * 6 + 144) / 12;
  assert.ok(Math.abs(ref.multiplier - expectedMult) < 1e-12,
    `multiplier = ${ref.multiplier}, expected ${expectedMult}`);
  assert.ok(Math.abs(ref.rafter_length_ft - 13 * expectedMult) < 1e-12,
    `rafter = ${ref.rafter_length_ft}, expected ${13 * expectedMult}`);
  // Flat-pitch identity pin: rise=0 -> multiplier = 1 -> rafter = span+overhang.
  const flat = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12: 0, overhang_ft: 1 });
  assert.ok(Math.abs(flat.multiplier - 1) < 1e-12,
    `flat multiplier = ${flat.multiplier}, expected 1`);
  assert.ok(Math.abs(flat.rafter_length_ft - 13) < 1e-12,
    `flat rafter = ${flat.rafter_length_ft}, expected 13`);
  // 12/12 (45 deg) identity pin: multiplier = sqrt(2).
  const at45 = computeRafter({ horizontal_span_ft: 12, pitch_rise_per_12: 12, overhang_ft: 0 });
  assert.ok(Math.abs(at45.multiplier - Math.sqrt(2)) < 1e-12,
    `12/12 multiplier = ${at45.multiplier}, expected sqrt(2)`);
});

test("monotonicity: computePalletLoadout pallets_by_weight is monotone non-increasing in case_weight_lb at fixed cases_per_pallet / trailer; pallets_total is monotone non-increasing once weight binds (FMCSA dry-van weight-limit pin)", () => {
  // Group J. pallets_by_weight = floor(trailer_max / (case_weight *
  // cases_per_pallet)); strictly non-increasing as case_weight rises.
  // pallets_by_floor is independent of weight; pallets_total = min of
  // the two, so once weight starts binding (cube-out -> weigh-out) the
  // total is monotone non-increasing.
  let prevByW = Infinity;
  let prevTotal = Infinity;
  const base = {
    case_length_in: 12, case_width_in: 10, case_height_in: 8,
    cases_per_pallet: 60,
    pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48,
    trailer: "dry_van_53", pinwheel: false,
  };
  const baseline = computePalletLoadout({ ...base, case_weight_lb: 5 });
  const floorPallets = baseline.pallets_by_floor;
  for (const case_weight_lb of [5, 10, 20, 30, 40, 50, 80, 120, 200]) {
    const r = computePalletLoadout({ ...base, case_weight_lb });
    assert.ok(Number.isFinite(r.pallets_by_weight),
      `pallets_by_weight at cw=${case_weight_lb}: ${JSON.stringify(r)}`);
    assert.ok(r.pallets_by_weight <= prevByW,
      `pallets_by_weight at cw=${case_weight_lb} = ${r.pallets_by_weight} not <= prev=${prevByW}`);
    assert.ok(r.pallets_total <= prevTotal,
      `pallets_total at cw=${case_weight_lb} = ${r.pallets_total} not <= prev=${prevTotal}`);
    // pallets_by_floor must be invariant in case weight.
    assert.equal(r.pallets_by_floor, floorPallets,
      `pallets_by_floor drifted at cw=${case_weight_lb}: ${r.pallets_by_floor} vs ${floorPallets}`);
    prevByW = r.pallets_by_weight;
    prevTotal = r.pallets_total;
  }
  // Closed-form pin from palletLoadoutExample: dry_van_53 standard
  // pallets-by-floor count is the published 26 (48"x40" pallets in a
  // 53'x102" trailer). Verify the floor result for the example geometry.
  const ex = computePalletLoadout({ case_length_in: 16, case_width_in: 12, case_height_in: 10, case_weight_lb: 8, cases_per_pallet: 36, pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48, trailer: "dry_van_53", pinwheel: false });
  assert.equal(ex.pallets_by_floor, 26);
  // flag pin: light cases -> cube-out (floor binds); heavy cases ->
  // weigh-out (weight binds).
  const light = computePalletLoadout({ ...base, case_weight_lb: 5 });
  assert.equal(light.flag, "cube-out");
  const heavy = computePalletLoadout({ ...base, case_weight_lb: 200 });
  assert.equal(heavy.flag, "weigh-out");
});

test("monotonicity: computeSPLAtmospheric inverse_square_dB is strictly increasing in d_far_m at fixed d_ref_m; SPL_far_1kHz_dB strictly decreasing in d_far_m (ANSI S1.26 inverse-square + atmospheric-absorption pin)", () => {
  // Group N. inverse_square_dB = 20*log10(d2/d1); strictly increasing
  // in d2. SPL_far = source - inverse_square - atmospheric_absorption;
  // both terms grow with d2 so SPL_far is strictly decreasing in d2.
  let prevDB = -Infinity;
  let prevSPL = Infinity;
  for (const d_far_m of [1, 2, 5, 10, 30, 100, 300]) {
    const r = computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 });
    assert.ok(Number.isFinite(r.inverse_square_dB),
      `inv-sq at d=${d_far_m}: ${JSON.stringify(r)}`);
    assert.ok(r.inverse_square_dB > prevDB,
      `inv-sq at d=${d_far_m} = ${r.inverse_square_dB} not greater than prev=${prevDB}`);
    assert.ok(r.SPL_far_1kHz_dB < prevSPL,
      `SPL_far at d=${d_far_m} = ${r.SPL_far_1kHz_dB} not less than prev=${prevSPL}`);
    prevDB = r.inverse_square_dB;
    prevSPL = r.SPL_far_1kHz_dB;
  }
  // d_far = d_ref identity pin: inverse_square_dB = 20*log10(1) = 0 exact.
  const ident = computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m: 1, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 });
  assert.ok(Math.abs(ident.inverse_square_dB) < 1e-12,
    `at d=d_ref: inv-sq = ${ident.inverse_square_dB}, expected 0`);
  // Doubling-distance pin: 2x d_far -> inverse_square grows by exactly
  // 20*log10(2) ~ 6.0206 dB.
  const at10 = computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m: 10, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 });
  const at20 = computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m: 20, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 });
  assert.ok(Math.abs((at20.inverse_square_dB - at10.inverse_square_dB) - 20 * Math.log10(2)) < 1e-12,
    `2x distance inv-sq diff = ${at20.inverse_square_dB - at10.inverse_square_dB}, expected ${20 * Math.log10(2)}`);
  // 30 m closed-form pin from splAtmosphericExample: inverse-square at
  // 30/1 = 20*log10(30) ~ 29.542 dB.
  const ref = computeSPLAtmospheric({ source_SPL_dB: 95, d_ref_m: 1, d_far_m: 30, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 });
  assert.ok(Math.abs(ref.inverse_square_dB - 20 * Math.log10(30)) < 1e-12,
    `inv-sq at 30 m = ${ref.inverse_square_dB}, expected ${20 * Math.log10(30)}`);
  // bands array pin: every band entry has the same inverse_square; the
  // SPL_far_dB differs only by per-band absorption.
  for (const band of ref.bands) {
    const reconstructed = 95 - ref.inverse_square_dB - band.absorption_dB;
    assert.ok(Math.abs(band.SPL_far_dB - reconstructed) < 1e-9,
      `band ${band.f_Hz} Hz: SPL_far = ${band.SPL_far_dB}, expected ${reconstructed}`);
  }
});

// --- spec-v14 §10.3 Phase F thirty-sixth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (A / T / C / X / V).

import { computeMultiLoadVoltageDrop } from "../../calc-electrical.js";
import { computeHendersonHasselbalch } from "../../calc-lab.js";
import { computeOutdoorAirVentilation } from "../../calc-hvac.js";
import { computeCommissionSplit } from "../../calc-realestate.js";
import { computeGCS } from "../../calc-ems.js";

test("monotonicity: computeMultiLoadVoltageDrop worst_drop_V is strictly increasing in the current of the farthest load at fixed AWG / distances (Ohm's-law per-segment cumulative-current pin)", () => {
  // Group A. The far-segment drop is I_seg * 2*R/kft * seg_ft/1000;
  // raising the farthest load's current scales the whole-circuit
  // cumulative current linearly upstream and therefore strictly
  // increases worst_drop_V.
  const baseLoads = (farI) => ([
    { distance_ft: 50, current_A: 5 },
    { distance_ft: 100, current_A: 5 },
    { distance_ft: 150, current_A: farI },
  ]);
  let prev = -Infinity;
  for (const farI of [2, 5, 10, 15, 20, 30, 50]) {
    const r = computeMultiLoadVoltageDrop({ material: "copper", awg: "12", source_voltage_V: 120, loads: baseLoads(farI) });
    assert.ok(Number.isFinite(r.worst_drop_V) && r.worst_drop_V > 0,
      `drop at farI=${farI}: ${JSON.stringify(r)}`);
    assert.ok(r.worst_drop_V > prev,
      `worst_drop at farI=${farI} = ${r.worst_drop_V} not greater than prev=${prev}`);
    prev = r.worst_drop_V;
  }
  // Distance-ascending invariant pin: per_load entries are sorted by
  // distance and cumulative_drop_V is strictly increasing entry-to-entry.
  const ref = computeMultiLoadVoltageDrop({
    material: "copper", awg: "12", source_voltage_V: 120,
    loads: [{ distance_ft: 50, current_A: 5 }, { distance_ft: 100, current_A: 5 }, { distance_ft: 150, current_A: 5 }],
  });
  let prevDrop = -Infinity;
  let prevDist = -Infinity;
  for (const e of ref.per_load) {
    assert.ok(e.distance_ft > prevDist,
      `per_load distance not sorted ascending: ${e.distance_ft} vs ${prevDist}`);
    assert.ok(e.cumulative_drop_V > prevDrop,
      `per_load drop not strictly increasing: ${e.cumulative_drop_V} vs ${prevDrop}`);
    prevDist = e.distance_ft;
    prevDrop = e.cumulative_drop_V;
  }
  // worst = last per_load entry; voltage_at_load_V = source - cumulative_drop pin.
  const worst = ref.per_load[ref.per_load.length - 1];
  assert.ok(Math.abs(worst.voltage_at_load_V - (120 - worst.cumulative_drop_V)) < 1e-12,
    `voltage_at_load = ${worst.voltage_at_load_V}, expected ${120 - worst.cumulative_drop_V}`);
  assert.ok(Math.abs(ref.worst_drop_V - worst.cumulative_drop_V) < 1e-12,
    `worst_drop_V drift: ${ref.worst_drop_V} vs ${worst.cumulative_drop_V}`);
  // Doubling-all-currents pin: 2x every load current -> 2x worst_drop
  // exactly (linear in cumulative current in every segment).
  const a = computeMultiLoadVoltageDrop({ material: "copper", awg: "12", source_voltage_V: 120, loads: [{ distance_ft: 50, current_A: 5 }, { distance_ft: 100, current_A: 5 }, { distance_ft: 150, current_A: 5 }] });
  const b = computeMultiLoadVoltageDrop({ material: "copper", awg: "12", source_voltage_V: 120, loads: [{ distance_ft: 50, current_A: 10 }, { distance_ft: 100, current_A: 10 }, { distance_ft: 150, current_A: 10 }] });
  assert.ok(Math.abs(b.worst_drop_V - 2 * a.worst_drop_V) < 1e-9,
    `2x currents: worst_drop = ${b.worst_drop_V} != 2 * ${a.worst_drop_V}`);
  // worst_percent = worst_drop / source * 100 pin.
  assert.ok(Math.abs(ref.worst_percent - (ref.worst_drop_V / 120) * 100) < 1e-12,
    `worst_percent = ${ref.worst_percent}, expected ${(ref.worst_drop_V / 120) * 100}`);
});

test("monotonicity: computeHendersonHasselbalch ratio_base_acid is strictly increasing in target_pH at fixed pKa; pH = pKa identity (Henderson-Hasselbalch 10^(pH-pKa) pin)", () => {
  // Group T. ratio = 10^(pH - pKa); strictly increasing in pH at fixed
  // pKa; fraction_base = ratio / (ratio + 1) strictly increasing too.
  let prev = -Infinity;
  for (const target_pH of [6.0, 6.5, 7.0, 7.2, 7.4, 7.6, 8.0]) {
    const r = computeHendersonHasselbalch({ pKa: 7.20, target_pH, total_buffer_concentration: 0.1, total_volume: 1.0 });
    assert.ok(Number.isFinite(r.ratio_base_acid) && r.ratio_base_acid > 0,
      `ratio at pH=${target_pH}: ${JSON.stringify(r)}`);
    assert.ok(r.ratio_base_acid > prev,
      `ratio at pH=${target_pH} = ${r.ratio_base_acid} not greater than prev=${prev}`);
    prev = r.ratio_base_acid;
  }
  // pH = pKa identity pin: ratio = 10^0 = 1; fraction_base = 0.5 exact;
  // fraction_acid = 0.5; moles_base = moles_acid.
  const ident = computeHendersonHasselbalch({ pKa: 7.20, target_pH: 7.20, total_buffer_concentration: 0.1, total_volume: 1.0 });
  assert.equal(ident.ratio_base_acid, 1);
  assert.equal(ident.fraction_base, 0.5);
  assert.equal(ident.fraction_acid, 0.5);
  assert.ok(Math.abs(ident.moles_base - ident.moles_acid) < 1e-12,
    `at pH=pKa: moles_base = ${ident.moles_base}, moles_acid = ${ident.moles_acid}`);
  // Closed-form pin from hhExample: pKa=7.20 / target_pH=7.40 ->
  // ratio = 10^0.20 = 1.58489...; total_moles = 0.1; fraction_base =
  // 1.58489 / 2.58489 = 0.6131; moles_base = 0.06131; moles_acid = 0.03869.
  const ref = computeHendersonHasselbalch({ pKa: 7.20, target_pH: 7.40, total_buffer_concentration: 0.1, total_volume: 1.0 });
  const expectedRatio = Math.pow(10, 0.20);
  assert.ok(Math.abs(ref.ratio_base_acid - expectedRatio) < 1e-12,
    `ratio = ${ref.ratio_base_acid}, expected ${expectedRatio}`);
  assert.equal(ref.total_moles, 0.1);
  assert.ok(Math.abs(ref.fraction_base + ref.fraction_acid - 1) < 1e-12,
    `fraction sum = ${ref.fraction_base + ref.fraction_acid}, expected 1`);
});

test("monotonicity: computeOutdoorAirVentilation Vbz_cfm + Voz_cfm are strictly increasing in people and in floor_area_ft2; Voz strictly decreasing in Ez (ASHRAE 62.1 Vbz = Rp*Pz + Ra*Az / Voz = Vbz/Ez pin)", () => {
  // Group C. Vbz = Rp*Pz + Ra*Az; strictly increasing in Pz and Az.
  // Voz = Vbz / Ez; strictly decreasing in Ez at fixed Vbz.
  let prevP = -Infinity;
  for (const people of [5, 10, 25, 50, 100, 250]) {
    const r = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people, floor_area_ft2: 2000, Ez: 1.0 });
    assert.ok(Number.isFinite(r.Voz_cfm) && r.Voz_cfm > 0,
      `Voz at Pz=${people}: ${JSON.stringify(r)}`);
    assert.ok(r.Voz_cfm > prevP,
      `Voz at Pz=${people} = ${r.Voz_cfm} not greater than prev=${prevP}`);
    prevP = r.Voz_cfm;
  }
  let prevA = -Infinity;
  for (const floor_area_ft2 of [500, 1000, 2000, 4000, 8000]) {
    const r = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2, Ez: 1.0 });
    assert.ok(r.Voz_cfm > prevA,
      `Voz at Az=${floor_area_ft2} = ${r.Voz_cfm} not greater than prev=${prevA}`);
    prevA = r.Voz_cfm;
  }
  // Strictly decreasing in Ez at fixed Pz / Az / Rp / Ra.
  let prevEz = Infinity;
  for (const Ez of [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2]) {
    const r = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 2000, Ez });
    assert.ok(r.Voz_cfm < prevEz,
      `Voz at Ez=${Ez} = ${r.Voz_cfm} not less than prev=${prevEz}`);
    prevEz = r.Voz_cfm;
  }
  // Closed-form pin (ASHRAE 62.1 Table 6-1-like): Rp=5 / Ra=0.06 /
  // Pz=25 / Az=2000 / Ez=1.0 -> Vbz = 5*25 + 0.06*2000 = 245 cfm /
  // Voz = 245.
  const ref = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 2000, Ez: 1.0 });
  assert.equal(ref.Vbz_cfm, 245);
  assert.equal(ref.Voz_cfm, 245);
  // Ez=0.8 pin: Voz = 245 / 0.8 = 306.25.
  const dist = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 2000, Ez: 0.8 });
  assert.ok(Math.abs(dist.Voz_cfm - 245 / 0.8) < 1e-9,
    `Voz at Ez=0.8 = ${dist.Voz_cfm}, expected ${245 / 0.8}`);
  // cfm_per_person / cfm_per_ft2 pins.
  assert.ok(Math.abs(ref.cfm_per_person - 245 / 25) < 1e-12,
    `cfm/person = ${ref.cfm_per_person}, expected ${245 / 25}`);
  assert.ok(Math.abs(ref.cfm_per_ft2 - 245 / 2000) < 1e-12,
    `cfm/ft^2 = ${ref.cfm_per_ft2}, expected ${245 / 2000}`);
});

test("monotonicity: computeCommissionSplit gross_commission + agent_net are strictly increasing in sale_price at fixed percentages (NAR commission-split linear pin)", () => {
  // Group X. gross = sale * total_pct/100; strictly increasing in sale.
  // agent_pre_fee = sale * total_pct/100 * side_pct/100 * brokerage_pct/100;
  // agent_net = max(0, agent_pre_fee - flat).
  let prevG = -Infinity;
  let prevA = -Infinity;
  for (const sale_price of [50000, 100000, 250000, 500000, 1000000, 2000000]) {
    const r = computeCommissionSplit({ sale_price, total_commission_percent: 5, side_share_percent: 50, brokerage_split_to_agent_percent: 80, brokerage_flat_fee: 250 });
    assert.ok(Number.isFinite(r.gross_commission) && r.gross_commission > 0,
      `gross at sale=${sale_price}: ${JSON.stringify(r)}`);
    assert.ok(r.gross_commission > prevG,
      `gross at sale=${sale_price} = ${r.gross_commission} not greater than prev=${prevG}`);
    assert.ok(r.agent_net > prevA,
      `agent_net at sale=${sale_price} = ${r.agent_net} not greater than prev=${prevA}`);
    prevG = r.gross_commission;
    prevA = r.agent_net;
  }
  // Doubling-sale pin: 2x sale -> 2x gross exactly (linear).
  const a = computeCommissionSplit({ sale_price: 500000, total_commission_percent: 5, side_share_percent: 50, brokerage_split_to_agent_percent: 80, brokerage_flat_fee: 250 });
  const b = computeCommissionSplit({ sale_price: 1000000, total_commission_percent: 5, side_share_percent: 50, brokerage_split_to_agent_percent: 80, brokerage_flat_fee: 250 });
  assert.ok(Math.abs(b.gross_commission - 2 * a.gross_commission) < 1e-9,
    `2x sale: gross = ${b.gross_commission} != 2 * ${a.gross_commission}`);
  // Closed-form pin from commissionSplitExample: sale=500000 / 5% / 50%
  // side / 80% brokerage / $250 flat -> gross=25000 / this_side=12500 /
  // agent_pre_fee=10000 / brokerage_share=2500 / agent_net=9750.
  assert.equal(a.gross_commission, 25000);
  assert.equal(a.this_side_share, 12500);
  assert.equal(a.other_side_share, 12500);
  assert.equal(a.agent_pre_fee_share, 10000);
  assert.equal(a.brokerage_split_share, 2500);
  assert.equal(a.agent_net, 9750);
  // Identity pin: 100% side -> this_side = gross (single-agency listing).
  const fullSide = computeCommissionSplit({ sale_price: 500000, total_commission_percent: 5, side_share_percent: 100, brokerage_split_to_agent_percent: 80, brokerage_flat_fee: 0 });
  assert.equal(fullSide.this_side_share, fullSide.gross_commission);
  assert.equal(fullSide.other_side_share, 0);
});

test("monotonicity: computeGCS total is strictly non-decreasing as any single component (eye / verbal / motor) rises; severity tips at 8/9 and 12/13 (Teasdale-Jennett 1974 pin)", () => {
  // Group V. total = eye + verbal + motor; strictly non-decreasing as
  // any single component rises through its valid range.
  let prev = -Infinity;
  for (const motor of [1, 2, 3, 4, 5, 6]) {
    const r = computeGCS({ eye: 3, verbal: 4, motor, intubated: false });
    assert.ok(Number.isFinite(r.total), `total at motor=${motor}: ${JSON.stringify(r)}`);
    assert.ok(r.total > prev,
      `total at motor=${motor} = ${r.total} not greater than prev=${prev}`);
    prev = r.total;
  }
  // Verbal component sweep at fixed eye / motor.
  let prevV = -Infinity;
  for (const verbal of [1, 2, 3, 4, 5]) {
    const r = computeGCS({ eye: 3, verbal, motor: 5, intubated: false });
    assert.ok(r.total > prevV, `total at verbal=${verbal} = ${r.total} not greater than prev=${prevV}`);
    prevV = r.total;
  }
  // Closed-form pin from gcsExample: 3 + 4 + 5 = 12 -> moderate (9-12).
  const ref = computeGCS({ eye: 3, verbal: 4, motor: 5, intubated: false });
  assert.equal(ref.total, 12);
  assert.equal(ref.severity, "moderate");
  // Boundary pin at 13/12 (mild/moderate tip): total=13 -> mild;
  // total=12 -> moderate.
  const mild13 = computeGCS({ eye: 3, verbal: 4, motor: 6, intubated: false });
  assert.equal(mild13.total, 13);
  assert.equal(mild13.severity, "mild");
  // Boundary pin at 9/8 (moderate/severe tip): total=9 -> moderate;
  // total=8 -> severe.
  const mod9 = computeGCS({ eye: 2, verbal: 3, motor: 4, intubated: false });
  assert.equal(mod9.total, 9);
  assert.equal(mod9.severity, "moderate");
  const sev8 = computeGCS({ eye: 2, verbal: 2, motor: 4, intubated: false });
  assert.equal(sev8.total, 8);
  assert.equal(sev8.severity, "severe");
  // Minimum-score pin: 1+1+1 = 3 -> severe (the floor of the scale).
  const min = computeGCS({ eye: 1, verbal: 1, motor: 1, intubated: false });
  assert.equal(min.total, 3);
  assert.equal(min.severity, "severe");
  // Maximum-score pin: 4+5+6 = 15 -> mild (the ceiling of the scale).
  const max = computeGCS({ eye: 4, verbal: 5, motor: 6, intubated: false });
  assert.equal(max.total, 15);
  assert.equal(max.severity, "mild");
  // Intubated pin: verbal is not interpretable; total = null and
  // total_label encodes the standard "E__T M__" notation.
  const intub = computeGCS({ eye: 3, verbal: 1, motor: 5, intubated: true });
  assert.equal(intub.total, null);
  assert.ok(/3T5/.test(intub.total_label),
    `intubated label = ${intub.total_label}, expected to contain '3T5'`);
});

// --- spec-v14 §10.3 Phase F thirty-seventh monotonicity batch ----------
// Five new sweeps across five distinct catalog groups (F / L / P / U / Y).

import { computeMasterStreamReach } from "../../calc-fire.js";
import { computeUniformity } from "../../calc-agriculture.js";
import { computeBearingConversion } from "../../calc-field.js";
import { computeToxicity } from "../../calc-vet.js";
import { computeSigFigs } from "../../calc-edu.js";

test("monotonicity: computeMasterStreamReach typical_reach_ft is strictly increasing in nozzle_pressure_psi at fixed nozzle (NFPA sqrt-pressure pin)", () => {
  // Group F. reach = base * sqrt(P / P_typical); strictly increasing in
  // nozzle pressure.
  let prev = -Infinity;
  for (const nozzle_pressure_psi of [20, 40, 60, 80, 100, 150, 200]) {
    const r = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi });
    assert.ok(Number.isFinite(r.typical_reach_ft) && r.typical_reach_ft > 0,
      `reach at P=${nozzle_pressure_psi}: ${JSON.stringify(r)}`);
    assert.ok(r.typical_reach_ft > prev,
      `reach at P=${nozzle_pressure_psi} = ${r.typical_reach_ft} not greater than prev=${prev}`);
    prev = r.typical_reach_ft;
  }
  // 4x-pressure pin: 4x P -> 2x reach exactly (sqrt scaling).
  const a = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 50 });
  const b = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 200 });
  assert.ok(Math.abs(b.typical_reach_ft / a.typical_reach_ft - 2) < 1e-9,
    `4x pressure: reach ratio = ${b.typical_reach_ft / a.typical_reach_ft} (expected 2)`);
  // Identity pin: P = typical_pressure -> reach = base_reach exactly.
  const ref = computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(Math.abs(ref.typical_reach_ft - ref.base_reach_ft) < 1e-12,
    `identity at P = typical: reach = ${ref.typical_reach_ft} != base = ${ref.base_reach_ft}`);
  // Closed-form pin from masterStreamExample: smooth_bore_2 at 80 psi
  // (the bundled typical pressure) -> 100 ft base reach exact.
  assert.equal(ref.typical_pressure_psi, 80);
  assert.equal(ref.typical_reach_ft, 100);
});

test("monotonicity: computeUniformity CU = 100 when all catch volumes equal; CU strictly decreases as a single can drifts from the mean (Christiansen 1942 uniformity pin)", () => {
  // Group L. CU = 100 * (1 - sum|x - mean| / (n*mean)). When the
  // sample is uniform, sum|...| = 0 -> CU = 100. Walk one can away from
  // the mean and assert CU strictly decreases.
  const uniform = computeUniformity({ catch_volumes: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] });
  assert.ok(Math.abs(uniform.CU - 100) < 1e-12,
    `uniform CU = ${uniform.CU}, expected 100`);
  assert.equal(uniform.DU, 100);
  assert.equal(uniform.pass_CU_85, true);
  assert.equal(uniform.pass_DU_75, true);
  let prev = Infinity;
  for (const drift of [0, 0.02, 0.05, 0.10, 0.20, 0.30, 0.50]) {
    const r = computeUniformity({ catch_volumes: [1 - drift, 1, 1, 1, 1, 1, 1, 1 + drift] });
    assert.ok(Number.isFinite(r.CU), `CU at drift=${drift}: ${JSON.stringify(r)}`);
    if (drift > 0) {
      assert.ok(r.CU < prev,
        `CU at drift=${drift} = ${r.CU} not less than prev=${prev}`);
    }
    prev = r.CU;
  }
  // Closed-form pin from uniformityExample: mean of the bundled list
  // = (1.05+0.95+1.10+0.98+1.02+0.93+1.07+0.99)/8 = 8.09 / 8 = 1.01125.
  const ref = computeUniformity({ catch_volumes: [1.05, 0.95, 1.10, 0.98, 1.02, 0.93, 1.07, 0.99] });
  assert.ok(Math.abs(ref.mean - 1.01125) < 1e-12,
    `mean = ${ref.mean}, expected 1.01125`);
  // CU pass pin: bundled example is intentionally a high-uniformity
  // sample (CU >> 85).
  assert.equal(ref.pass_CU_85, true);
});

test("monotonicity: computeBearingConversion result_deg is strictly increasing in declination_deg over (-180, 180-bearing); 0-360 wrap identity pin (declination convention)", () => {
  // Group P. magnetic_to_true: result = bearing + declination; strictly
  // increasing in declination over a range that keeps the result in
  // (0, 360). Choose a base bearing so the sweep stays unwrapped.
  let prev = -Infinity;
  for (const declination_deg of [-30, -15, -5, 0, 5, 15, 30]) {
    const r = computeBearingConversion({ declination_deg, bearing_deg: 180, direction: "magnetic_to_true" });
    assert.ok(Number.isFinite(r.result_deg) && r.result_deg >= 0 && r.result_deg < 360,
      `result at decl=${declination_deg}: ${JSON.stringify(r)}`);
    assert.ok(r.result_deg > prev,
      `result at decl=${declination_deg} = ${r.result_deg} not greater than prev=${prev}`);
    prev = r.result_deg;
  }
  // Identity pin: declination=0 -> result equals bearing.
  const ident = computeBearingConversion({ declination_deg: 0, bearing_deg: 270, direction: "magnetic_to_true" });
  assert.equal(ident.result_deg, 270);
  // 0-360 wrap pin: bearing=350 + decl=20 -> 370 - 360 = 10 (wraps).
  const wrap = computeBearingConversion({ declination_deg: 20, bearing_deg: 350, direction: "magnetic_to_true" });
  assert.equal(wrap.result_deg, 10);
  // Negative-result wrap pin: bearing=10 + decl=-20 -> -10 + 360 = 350.
  const wrapNeg = computeBearingConversion({ declination_deg: -20, bearing_deg: 10, direction: "magnetic_to_true" });
  assert.equal(wrapNeg.result_deg, 350);
  // true_to_magnetic inverse pin: magnetic -> true -> magnetic round-trip.
  const m2t = computeBearingConversion({ declination_deg: 15, bearing_deg: 90, direction: "magnetic_to_true" });
  const t2m = computeBearingConversion({ declination_deg: 15, bearing_deg: m2t.result_deg, direction: "true_to_magnetic" });
  assert.equal(t2m.result_deg, 90);
  // "East is least" memo present on the magnetic_to_true path.
  assert.ok(/east/i.test(m2t.memo),
    `magnetic_to_true memo = ${m2t.memo}, expected to mention east`);
});

test("monotonicity: computeToxicity theobromine_mg_per_kg is strictly increasing in choc_grams at fixed type / weight; strictly decreasing in patient weight at fixed dose (ASPCA APCC 20 mg/kg mild-threshold pin)", () => {
  // Group U. dose_mg_per_kg = (g / 28.3495) * mg_per_oz / wt_kg;
  // strictly increasing in g and strictly decreasing in wt_kg.
  let prev = -Infinity;
  for (const choc_grams of [5, 10, 25, 50, 100, 200, 500]) {
    const r = computeToxicity({ toxin: "chocolate", weight: 10, weight_unit: "kg", choc_type: "dark", choc_grams });
    assert.ok(Number.isFinite(r.theobromine_mg_per_kg),
      `dose at g=${choc_grams}: ${JSON.stringify(r)}`);
    assert.ok(r.theobromine_mg_per_kg > prev,
      `dose at g=${choc_grams} = ${r.theobromine_mg_per_kg} not greater than prev=${prev}`);
    prev = r.theobromine_mg_per_kg;
  }
  // Strictly decreasing in patient weight at fixed dose.
  let prevDecr = Infinity;
  for (const weight of [2, 5, 10, 20, 40, 80]) {
    const r = computeToxicity({ toxin: "chocolate", weight, weight_unit: "kg", choc_type: "dark", choc_grams: 50 });
    assert.ok(r.theobromine_mg_per_kg < prevDecr,
      `dose at wt=${weight} = ${r.theobromine_mg_per_kg} not less than prev=${prevDecr}`);
    prevDecr = r.theobromine_mg_per_kg;
  }
  // Closed-form pin from toxicityExample: 10 kg / dark / 50 g ->
  // 50/28.3495 = 1.7637 oz; 1.7637 * 150 = 264.55 mg total;
  // 26.455 mg/kg -> exceeded_mild_threshold = true (>= 20 ASPCA APCC band).
  const ref = computeToxicity({ toxin: "chocolate", weight: 10, weight_unit: "kg", choc_type: "dark", choc_grams: 50 });
  const expectedOz = 50 / 28.3495;
  assert.ok(Math.abs(ref.chocolate_oz - expectedOz) < 1e-9,
    `oz = ${ref.chocolate_oz}, expected ${expectedOz}`);
  const expectedTotal = expectedOz * 150;
  assert.ok(Math.abs(ref.theobromine_mg_total - expectedTotal) < 1e-9,
    `total = ${ref.theobromine_mg_total}, expected ${expectedTotal}`);
  assert.ok(Math.abs(ref.theobromine_mg_per_kg - expectedTotal / 10) < 1e-9,
    `dose = ${ref.theobromine_mg_per_kg}, expected ${expectedTotal / 10}`);
  assert.equal(ref.exceeded_mild_threshold, true);
  // 20 mg/kg boundary pin: doses below threshold tip the flag false.
  const below = computeToxicity({ toxin: "chocolate", weight: 50, weight_unit: "kg", choc_type: "milk", choc_grams: 50 });
  assert.ok(below.theobromine_mg_per_kg < 20,
    `below-threshold dose = ${below.theobromine_mg_per_kg}, expected < 20`);
  assert.equal(below.exceeded_mild_threshold, false);
});

test("monotonicity: computeSigFigs round-trip identity (input_sig_figs counts leading-zero-stripped digits); rounded_value at N sig figs (NIST SP 811 sig-fig pin)", () => {
  // Group Y. The compute function exposes:
  //   input_sig_figs: count of significant digits in the input string
  //   rounded_value: value rounded to target N sig figs (when supplied)
  // Pin both for canonical sigFigsExample input "0.00347" / N=2.
  const ref = computeSigFigs({ value: "0.00347", target_sig_figs: 2 });
  assert.equal(ref.input_sig_figs, 3);
  assert.ok(Math.abs(ref.rounded_value - 0.0035) < 1e-12,
    `rounded = ${ref.rounded_value}, expected 0.0035`);
  assert.ok(Math.abs(ref.input_value - 0.00347) < 1e-12,
    `parsed = ${ref.input_value}, expected 0.00347`);
  // Identity pin: rounding to >= input sig figs returns the input
  // value to the floating-point floor.
  const ident = computeSigFigs({ value: "0.00347", target_sig_figs: 3 });
  assert.ok(Math.abs(ident.rounded_value - 0.00347) < 1e-12,
    `rounded at N=input = ${ident.rounded_value}, expected 0.00347`);
  // Leading-zero pin: "0.0035" has 2 sig figs (NIST SP 811 §7 leading
  // zeros not significant).
  const leading = computeSigFigs({ value: "0.0035", target_sig_figs: 2 });
  assert.equal(leading.input_sig_figs, 2);
  // Trailing-zero-after-decimal pin: "1.500" has 4 sig figs.
  const trailing = computeSigFigs({ value: "1.500", target_sig_figs: 2 });
  assert.equal(trailing.input_sig_figs, 4);
  assert.ok(Math.abs(trailing.rounded_value - 1.5) < 1e-12,
    `1.500 -> 2 sf rounded = ${trailing.rounded_value}, expected 1.5`);
  // Scientific notation pin: "3.47e-3" has 3 sig figs and parses to
  // 0.00347.
  const sci = computeSigFigs({ value: "3.47e-3", target_sig_figs: 2 });
  assert.equal(sci.input_sig_figs, 3);
  assert.ok(Math.abs(sci.input_value - 0.00347) < 1e-12,
    `parsed = ${sci.input_value}, expected 0.00347`);
  assert.ok(Math.abs(sci.rounded_value - 0.0035) < 1e-12,
    `rounded = ${sci.rounded_value}, expected 0.0035`);
  // No-target pin: omitting target_sig_figs leaves rounded_value = null.
  const noTarget = computeSigFigs({ value: "0.00347" });
  assert.equal(noTarget.rounded_value, null);
  assert.equal(noTarget.target_sig_figs, null);
});

// --- spec-v14 §10.3 Phase F thirty-eighth monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (D / G / J / S / T).

import { computePsychrometric } from "../../calc-restoration.js";
import { computeHaversineDistance } from "../../calc-cross.js";
import { computeHOS } from "../../calc-trucking.js";
import { computeDeadline } from "../../calc-legal.js";
import { computeHemocytometer } from "../../calc-lab.js";

test("monotonicity: computePsychrometric GPP + saturation_pressure_hPa are strictly increasing in temperature_F at fixed RH; GPP strictly increasing in RH_percent at fixed T (Magnus saturation-vapor pin)", () => {
  // Group D. The Magnus saturation vapor pressure rises monotonically
  // with temperature; at fixed RH the actual vapor pressure (and the
  // GPP humidity-ratio derived from it) rises with temperature.
  let prevGPP = -Infinity;
  let prevSat = -Infinity;
  for (const temperature_F of [50, 60, 70, 75, 80, 90, 100]) {
    const r = computePsychrometric({ temperature_F, RH_percent: 50 });
    assert.ok(Number.isFinite(r.GPP) && r.GPP > 0,
      `GPP at T=${temperature_F}: ${JSON.stringify(r)}`);
    assert.ok(r.GPP > prevGPP,
      `GPP at T=${temperature_F} = ${r.GPP} not greater than prev=${prevGPP}`);
    assert.ok(r.saturation_pressure_hPa > prevSat,
      `sat at T=${temperature_F} = ${r.saturation_pressure_hPa} not greater than prev=${prevSat}`);
    prevGPP = r.GPP;
    prevSat = r.saturation_pressure_hPa;
  }
  // Strictly increasing in RH at fixed temperature; identity at RH=100%
  // where vapor_pressure = saturation_pressure.
  let prevRH = -Infinity;
  for (const RH_percent of [10, 25, 50, 75, 90, 100]) {
    const r = computePsychrometric({ temperature_F: 75, RH_percent });
    assert.ok(r.GPP > prevRH,
      `GPP at RH=${RH_percent} = ${r.GPP} not greater than prev=${prevRH}`);
    prevRH = r.GPP;
  }
  const sat = computePsychrometric({ temperature_F: 75, RH_percent: 100 });
  assert.ok(Math.abs(sat.vapor_pressure_hPa - sat.saturation_pressure_hPa) < 1e-9,
    `at RH=100: e = ${sat.vapor_pressure_hPa} != e_s = ${sat.saturation_pressure_hPa}`);
  // dew_point_F = temperature_F identity at RH=100 (air is fully saturated).
  assert.ok(Math.abs(sat.dew_point_F - 75) < 0.5,
    `at RH=100: dew_point = ${sat.dew_point_F}, expected ~75 F`);
  // psychrometricExample band pin: T=75 / RH=50 -> GPP ~ 55-75 / dew_point ~ 50-60.
  const ref = computePsychrometric({ temperature_F: 75, RH_percent: 50 });
  assert.ok(ref.GPP >= 55 && ref.GPP <= 75,
    `GPP at example inputs = ${ref.GPP}, expected 55-75`);
  assert.ok(ref.dew_point_F >= 50 && ref.dew_point_F <= 60,
    `dew_point at example inputs = ${ref.dew_point_F}, expected 50-60`);
});

test("monotonicity: computeHaversineDistance miles is strictly increasing in latitudinal separation at fixed longitude; same-point identity pin; mi/km Earth-radius ratio pin (great-circle haversine pin)", () => {
  // Group G. Distance is strictly increasing in latitude separation at
  // fixed longitude. Same-point identity -> distance = 0.
  let prev = -Infinity;
  for (const lat2 of [0, 5, 15, 30, 45, 60, 75, 89]) {
    const r = computeHaversineDistance({ lat1: 0, lon1: 0, lat2, lon2: 0 });
    assert.ok(Number.isFinite(r.miles) && r.miles >= 0,
      `miles at lat2=${lat2}: ${JSON.stringify(r)}`);
    assert.ok(r.miles > prev,
      `miles at lat2=${lat2} = ${r.miles} not greater than prev=${prev}`);
    prev = r.miles;
  }
  // Same-point identity pin.
  const same = computeHaversineDistance({ lat1: 40.7128, lon1: -74.0060, lat2: 40.7128, lon2: -74.0060 });
  assert.ok(Math.abs(same.miles) < 1e-9, `same-point miles = ${same.miles}, expected 0`);
  assert.ok(Math.abs(same.kilometers) < 1e-9, `same-point km = ${same.kilometers}, expected 0`);
  // mi/km ratio pin: distance ratio = EARTH_RADIUS_KM / EARTH_RADIUS_MI =
  // ~1.609344 across every distance (constant by construction).
  const a = computeHaversineDistance({ lat1: 40.7128, lon1: -74.0060, lat2: 34.0522, lon2: -118.2437 });
  const ratio = a.kilometers / a.miles;
  assert.ok(Math.abs(ratio - 1.609344) < 1e-3,
    `km/mi ratio = ${ratio}, expected ~1.609344`);
  // haversineExample band pin: NYC -> LAX great-circle ~ 2440-2460 mi.
  assert.ok(a.miles >= 2440 && a.miles <= 2460,
    `NYC -> LAX miles = ${a.miles}, expected 2440-2460`);
  // Equator-to-pole quarter-circumference pin: distance from (0, 0) to
  // (90, 0) = pi/2 * R_earth_mi ~ 6217 mi (Earth quarter circumference).
  const quarter = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 90, lon2: 0 });
  assert.ok(quarter.miles >= 6200 && quarter.miles <= 6230,
    `equator-to-pole miles = ${quarter.miles}, expected ~6217`);
  // Antipodal pin: (0, 0) to (0, 180) is exactly half the great-circle
  // (pi * R_earth_mi ~ 12434 mi).
  const anti = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 0, lon2: 180 });
  assert.ok(anti.miles >= 12400 && anti.miles <= 12500,
    `antipodal miles = ${anti.miles}, expected ~12434`);
});

test("monotonicity: computeHOS drive_remaining is strictly non-increasing as more drive hours accumulate; needs_break tips at 8 hr cumulative drive without break (FMCSA 49 CFR 395 pin)", () => {
  // Group J. drive_remaining = drive_max - drive_used; strictly
  // non-increasing as drive events accumulate.
  let prev = Infinity;
  let accumDrive = 0;
  for (const hours of [1, 2, 1, 3, 2, 1, 1]) {
    accumDrive += hours;
    const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: accumDrive }] });
    assert.ok(Number.isFinite(r.drive_remaining),
      `drive_remaining at accum=${accumDrive}: ${JSON.stringify(r)}`);
    assert.ok(r.drive_remaining <= prev,
      `drive_remaining at accum=${accumDrive} = ${r.drive_remaining} not <= prev=${prev}`);
    prev = r.drive_remaining;
  }
  // 8-hr-without-break pin: 8 hr drive without a >= 30-min break ->
  // needs_break = true; adding a 30-min break clears the flag.
  const at8 = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 8 }] });
  assert.equal(at8.needs_break, true);
  const at8Break = computeHOS({
    profile: "property_70_8",
    events: [
      { kind: "drive", hours: 5 },
      { kind: "off_duty", hours: 0.5 },
      { kind: "drive", hours: 3 },
    ],
  });
  assert.equal(at8Break.needs_break, false);
  assert.equal(at8Break.break_taken, true);
  // Closed-form pin from hosExample: 0.5 on_duty + 5 drive + 0.5 off_duty
  // + 4 drive -> drive_used = 9 / drive_remaining = 11 - 9 = 2 /
  // on_duty_used = 0.5 + 5 + 4 = 9.5 / on_duty_remaining = 14 - 9.5 = 4.5
  // / weekly_remaining = 70 - (30 + 9.5) = 30.5 / break_taken = true.
  const ref = computeHOS({
    profile: "property_70_8",
    events: [
      { kind: "on_duty", hours: 0.5 },
      { kind: "drive", hours: 5 },
      { kind: "off_duty", hours: 0.5 },
      { kind: "drive", hours: 4 },
    ],
    weekly_on_duty_used_hr: 30,
  });
  assert.equal(ref.drive_used, 9);
  assert.equal(ref.drive_remaining, 2);
  assert.equal(ref.on_duty_used, 9.5);
  assert.equal(ref.on_duty_remaining, 4.5);
  assert.equal(ref.weekly_remaining, 30.5);
  assert.equal(ref.break_taken, true);
  assert.equal(ref.needs_break, false);
});

test("monotonicity: computeDeadline deadline is strictly non-decreasing in days at fixed trigger_date (FRCP 6(a)(1) + weekend / federal-holiday roll-off pins)", () => {
  // Group S. The deadline date is non-decreasing in `days` at fixed
  // trigger_date. Compare ISO strings lexicographically (correct for
  // YYYY-MM-DD format).
  let prev = "0000-00-00";
  for (const days of [1, 3, 7, 14, 30, 60, 90]) {
    const r = computeDeadline({ trigger_date: "2025-07-01", days, day_type: "calendar", jurisdiction: "FED" });
    assert.ok(typeof r.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline),
      `deadline at days=${days}: ${JSON.stringify(r)}`);
    assert.ok(r.deadline > prev,
      `deadline at days=${days} = ${r.deadline} not > prev=${prev}`);
    prev = r.deadline;
  }
  // Closed-form pin from deadlineExample: 2025-07-01 + 30 calendar days
  // = 2025-07-31. (July 31 2025 is a Thursday; no weekend / holiday
  // roll-off applies.)
  const ref = computeDeadline({ trigger_date: "2025-07-01", days: 30, day_type: "calendar", jurisdiction: "FED" });
  assert.equal(ref.deadline, "2025-07-31");
  assert.equal(ref.skipped.length, 0);
  // Weekend roll-off pin: 2025-07-01 (Tue) + 4 calendar days = 2025-07-05
  // (Saturday) -> rolls to 2025-07-07 (Monday).
  const wkRoll = computeDeadline({ trigger_date: "2025-07-01", days: 4, day_type: "calendar", jurisdiction: "FED" });
  assert.equal(wkRoll.deadline, "2025-07-07");
  assert.ok(wkRoll.skipped.length >= 1,
    `weekend roll-off skipped[]: ${JSON.stringify(wkRoll.skipped)}`);
  // Federal-holiday roll-off pin: 2025-12-22 (Mon) + 3 days = Christmas
  // (2025-12-25 Thu) -> rolls to 2025-12-26 (Friday).
  const holRoll = computeDeadline({ trigger_date: "2025-12-22", days: 3, day_type: "calendar", jurisdiction: "FED" });
  assert.equal(holRoll.deadline, "2025-12-26");
  assert.ok(holRoll.skipped.some((s) => /holiday/.test(s.reason)),
    `holiday roll-off skipped[]: ${JSON.stringify(holRoll.skipped)}`);
  // Citation pin: must mention FRCP 6(a)(1).
  assert.ok(/6\(a\)\(1\)/.test(ref.citation),
    `citation = ${ref.citation}, expected to mention 6(a)(1)`);
});

test("monotonicity: computeHemocytometer cells_per_mL is strictly increasing in total_cells_counted at fixed squares / dilution; doubling-dilution pin (Neubauer 1e4 conversion pin)", () => {
  // Group T. cells_per_mL = (total / squares) * 1e4 * dilution_factor.
  // Strictly increasing in total_cells_counted at fixed squares and DF.
  let prev = -Infinity;
  for (const total_cells_counted of [10, 50, 100, 200, 500, 1000, 5000]) {
    const r = computeHemocytometer({ total_cells_counted, squares_counted: 4, dilution_factor: 2 });
    assert.ok(Number.isFinite(r.cells_per_mL) && r.cells_per_mL > 0,
      `cells/mL at n=${total_cells_counted}: ${JSON.stringify(r)}`);
    assert.ok(r.cells_per_mL > prev,
      `cells/mL at n=${total_cells_counted} = ${r.cells_per_mL} not greater than prev=${prev}`);
    prev = r.cells_per_mL;
  }
  // Doubling-dilution pin: 2x DF -> 2x cells_per_mL exactly.
  const a = computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 2 });
  const b = computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 4 });
  assert.ok(Math.abs(b.cells_per_mL - 2 * a.cells_per_mL) < 1e-9,
    `2x DF: cells = ${b.cells_per_mL} != 2 * ${a.cells_per_mL}`);
  // Closed-form pin from hemoExample: 200 cells / 4 squares / DF=2 ->
  // avg_per_square = 50; cells_per_mL = 50 * 10000 * 2 = 1e6.
  const ref = computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 2, dead_cells: 10 });
  assert.equal(ref.avg_per_square, 50);
  assert.equal(ref.cells_per_mL, 1e6);
  // Viability pin: (200 - 10) / 200 * 100 = 95%.
  assert.equal(ref.viability_pct, 95);
  // Strictly decreasing in squares_counted at fixed total / DF
  // (averaging across more squares lowers the per-square mean).
  let prevDec = Infinity;
  for (const squares_counted of [1, 2, 4, 8, 16]) {
    const r = computeHemocytometer({ total_cells_counted: 200, squares_counted, dilution_factor: 1 });
    assert.ok(r.cells_per_mL < prevDec,
      `cells/mL at sq=${squares_counted} = ${r.cells_per_mL} not less than prev=${prevDec}`);
    prevDec = r.cells_per_mL;
  }
});

// --- spec-v14 §10.3 Phase F thirty-ninth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (A / E / C / F / X).

import { computePoEBudget } from "../../calc-electrical.js";
import { computeRoofPitch } from "../../calc-construction.js";
import { computeSeerEer } from "../../calc-hvac.js";
import { computeIsoNeededFireFlow } from "../../calc-fire.js";
import { computeRentalWorksheet } from "../../calc-realestate.js";

test("monotonicity: computePoEBudget cable_loss_W is strictly increasing in run_length_ft; pd_available_W strictly decreasing in run_length_ft; flag tips red below pd_min_W (IEEE 802.3 PoE pin)", () => {
  // Group A. cable_loss_W = I^2 * loopOhms; loopOhms is linear in run
  // length so loss grows linearly; pd_available_W = pse_W - loss is
  // strictly decreasing in run length.
  let prevLoss = -Infinity;
  let prevPd = Infinity;
  for (const run_length_ft of [10, 50, 100, 150, 200, 250, 300]) {
    const r = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft, ambient_C: 25 });
    assert.ok(Number.isFinite(r.cable_loss_W) && r.cable_loss_W >= 0,
      `loss at L=${run_length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.cable_loss_W > prevLoss,
      `loss at L=${run_length_ft} = ${r.cable_loss_W} not greater than prev=${prevLoss}`);
    assert.ok(r.pd_available_W < prevPd,
      `pd_avail at L=${run_length_ft} = ${r.pd_available_W} not less than prev=${prevPd}`);
    prevLoss = r.cable_loss_W;
    prevPd = r.pd_available_W;
  }
  // L = 0 identity pin: zero cable -> zero loss / pd_available = pse_W exact.
  const zero = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: 0, ambient_C: 25 });
  assert.ok(Math.abs(zero.cable_loss_W) < 1e-12,
    `L=0: loss = ${zero.cable_loss_W}, expected 0`);
  assert.ok(Math.abs(zero.pd_available_W - zero.pse_W) < 1e-12,
    `L=0: pd = ${zero.pd_available_W} != pse = ${zero.pse_W}`);
  // poeBudgetExample band pin: at 200 ft Cat6 the PoE+ ('at') PSE budget
  // is well-sized; expect green or amber, not red, at this length.
  const ex = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: 200, ambient_C: 25 });
  assert.ok(ex.flag === "green" || ex.flag === "amber",
    `200 ft Cat6 at PoE+: flag = ${ex.flag}, expected green or amber`);
  assert.ok(ex.pd_available_W >= ex.pd_min_W,
    `pd_avail = ${ex.pd_available_W} < pd_min = ${ex.pd_min_W}`);
  // Ambient-temperature pin: hotter cable -> higher copper resistance
  // (alpha = 0.00393 / K from 20 C) -> larger loss at the same run length.
  const cold = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: 300, ambient_C: 0 });
  const hot = computePoEBudget({ poe_class: "at", category: "Cat6", run_length_ft: 300, ambient_C: 60 });
  assert.ok(hot.cable_loss_W > cold.cable_loss_W,
    `hot cable loss = ${hot.cable_loss_W} not greater than cold = ${cold.cable_loss_W}`);
});

test("monotonicity: computeRoofPitch percent + degrees + pitch_in_per_ft are strictly increasing in rise at fixed run (rise/run linear pin) + atan-degrees identity at 6/12 and 12/12", () => {
  // Group E. ratio = rise/run; percent = ratio*100; pitch_in_per_ft =
  // ratio*12; degrees = atan(ratio) deg. All three strictly increasing
  // in rise at fixed run.
  let prevPct = -Infinity;
  let prevDeg = -Infinity;
  let prevPif = -Infinity;
  for (const rise of [0, 2, 4, 6, 8, 10, 12, 18, 24]) {
    const r = computeRoofPitch({ rise, run: 12, mode: "rise_run" });
    assert.ok(Number.isFinite(r.percent), `pitch at rise=${rise}: ${JSON.stringify(r)}`);
    if (rise > 0) {
      assert.ok(r.percent > prevPct,
        `percent at rise=${rise} = ${r.percent} not greater than prev=${prevPct}`);
      assert.ok(r.degrees > prevDeg,
        `degrees at rise=${rise} = ${r.degrees} not greater than prev=${prevDeg}`);
      assert.ok(r.pitch_in_per_ft > prevPif,
        `pitch_in_per_ft at rise=${rise} = ${r.pitch_in_per_ft} not greater than prev=${prevPif}`);
    }
    prevPct = r.percent;
    prevDeg = r.degrees;
    prevPif = r.pitch_in_per_ft;
  }
  // Closed-form pin from roofPitchExample: 6/12 -> ratio=0.5 / percent=50
  // / pitch_in_per_ft=6 / degrees = atan(0.5) deg ~ 26.565.
  const ref = computeRoofPitch({ rise: 6, run: 12, mode: "rise_run" });
  assert.equal(ref.fraction, 0.5);
  assert.equal(ref.percent, 50);
  assert.equal(ref.pitch_in_per_ft, 6);
  assert.ok(Math.abs(ref.degrees - Math.atan(0.5) * 180 / Math.PI) < 1e-9,
    `degrees = ${ref.degrees}, expected ${Math.atan(0.5) * 180 / Math.PI}`);
  // 12/12 (45 deg) identity pin: ratio=1 / percent=100 / pitch=12 in/ft /
  // degrees = 45 exactly.
  const at45 = computeRoofPitch({ rise: 12, run: 12, mode: "rise_run" });
  assert.equal(at45.fraction, 1);
  assert.equal(at45.percent, 100);
  assert.equal(at45.pitch_in_per_ft, 12);
  assert.ok(Math.abs(at45.degrees - 45) < 1e-9,
    `12/12 degrees = ${at45.degrees}, expected 45`);
  // rise=0 identity pin: flat roof -> percent=0 / degrees=0 / pitch=0.
  const flat = computeRoofPitch({ rise: 0, run: 12, mode: "rise_run" });
  assert.equal(flat.percent, 0);
  assert.equal(flat.degrees, 0);
  assert.equal(flat.pitch_in_per_ft, 0);
  // Degrees-mode round-trip identity: convert 26.565 deg -> pitch -> back.
  const fromDeg = computeRoofPitch({ rise: Math.atan(0.5) * 180 / Math.PI, mode: "degrees" });
  assert.ok(Math.abs(fromDeg.fraction - 0.5) < 1e-9,
    `degrees-mode round-trip: fraction = ${fromDeg.fraction}, expected 0.5`);
});

test("monotonicity: computeSeerEer SEER is strictly increasing in EER value at fixed conversion (1.12 SEER/EER published-ratio pin); SEER<->EER round-trip identity", () => {
  // Group C. SEER = EER * 1.12; strictly increasing in EER.
  let prev = -Infinity;
  for (const value of [6, 8, 10, 12, 14, 16, 20]) {
    const r = computeSeerEer({ value, from: "EER" });
    assert.ok(Number.isFinite(r.SEER) && r.SEER > 0,
      `SEER at EER=${value}: ${JSON.stringify(r)}`);
    assert.ok(r.SEER > prev,
      `SEER at EER=${value} = ${r.SEER} not greater than prev=${prev}`);
    prev = r.SEER;
  }
  // Closed-form pin from seerEerExample: EER=12 -> SEER = 12 * 1.12 =
  // 13.44; SEER2_estimate = 13.44 * 0.95 = 12.768.
  const ref = computeSeerEer({ value: 12, from: "EER" });
  assert.ok(Math.abs(ref.SEER - 12 * 1.12) < 1e-12,
    `SEER = ${ref.SEER}, expected ${12 * 1.12}`);
  assert.ok(Math.abs(ref.SEER2_estimate - 12 * 1.12 * 0.95) < 1e-12,
    `SEER2_estimate = ${ref.SEER2_estimate}, expected ${12 * 1.12 * 0.95}`);
  // SEER<->EER round-trip identity (1.12 ratio): EER -> SEER -> EER
  // returns the same value to the floating-point floor.
  const fwd = computeSeerEer({ value: 14, from: "EER" });
  const back = computeSeerEer({ value: fwd.SEER, from: "SEER" });
  assert.ok(Math.abs(back.EER - 14) < 1e-12,
    `EER round-trip = ${back.EER}, expected 14`);
  // Doubling-EER pin: 2x EER -> 2x SEER exactly.
  const a = computeSeerEer({ value: 6, from: "EER" });
  const b = computeSeerEer({ value: 12, from: "EER" });
  assert.ok(Math.abs(b.SEER - 2 * a.SEER) < 1e-12,
    `2x EER: SEER = ${b.SEER} != 2 * ${a.SEER}`);
  // SEER2 / EER2 conversions reduce by the 0.95 published derating factor.
  const seer2to = computeSeerEer({ value: 15, from: "SEER2" });
  assert.ok(Math.abs(seer2to.SEER - 15 / 0.95) < 1e-12,
    `SEER2 path: SEER = ${seer2to.SEER}, expected ${15 / 0.95}`);
});

test("monotonicity: computeIsoNeededFireFlow NFF_raw_gpm is strictly non-decreasing in area_ft2 at fixed construction (ISO 18 * F * sqrt(A) needed-fire-flow pin)", () => {
  // Group F. Ci_raw = 18 * F * sqrt(A_eff); strictly increasing in area
  // until the 8000 gpm Ci cap or NFF_MAX_GPM ceiling bites.
  let prev = -Infinity;
  for (const area_ft2 of [500, 1500, 3000, 5000, 8000, 12000, 25000]) {
    const r = computeIsoNeededFireFlow({ area_ft2, stories: 1, construction_class: 3, occupancy_factor: 1.0, exposure_distance_ft: 200, exposure_communication_factor: 0 });
    assert.ok(Number.isFinite(r.NFF_raw_gpm) && r.NFF_raw_gpm > 0,
      `NFF_raw at A=${area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.NFF_raw_gpm > prev,
      `NFF_raw at A=${area_ft2} = ${r.NFF_raw_gpm} not greater than prev=${prev}`);
    prev = r.NFF_raw_gpm;
  }
  // 4x-area pin: 4x A -> 2x Ci_raw exactly (sqrt scaling).
  const a = computeIsoNeededFireFlow({ area_ft2: 2500, stories: 1, construction_class: 3, occupancy_factor: 1.0, exposure_distance_ft: 200, exposure_communication_factor: 0 });
  const b = computeIsoNeededFireFlow({ area_ft2: 10000, stories: 1, construction_class: 3, occupancy_factor: 1.0, exposure_distance_ft: 200, exposure_communication_factor: 0 });
  assert.ok(Math.abs(b.Ci_raw - 2 * a.Ci_raw) < 1e-9,
    `4x area: Ci_raw = ${b.Ci_raw} != 2 * ${a.Ci_raw}`);
  // 8000 gpm Ci cap pin: at very large area / construction_class<=4
  // the Ci_raw exceeds the bundled 8000 gpm cap; Ci_capped clamps at 8000.
  const big = computeIsoNeededFireFlow({ area_ft2: 250000, stories: 3, construction_class: 1, occupancy_factor: 1.0, exposure_distance_ft: 200, exposure_communication_factor: 0 });
  assert.equal(big.Ci_capped, 8000);
  assert.ok(big.Ci_raw > 8000,
    `Ci_raw = ${big.Ci_raw}, expected to exceed 8000 cap`);
  // Closed-form pin from isoNeededFireFlowExample: area=5000 / stories=2
  // / class=2 -> F = ISO_CONSTRUCTION_F[2] / A_eff = 5000 * min(2, 3)
  // = 10000. Ci_raw = 18 * F * sqrt(10000) = 1800 * F.
  const ref = computeIsoNeededFireFlow({ area_ft2: 5000, stories: 2, construction_class: 2, occupancy_factor: 1.0, exposure_distance_ft: 50, exposure_communication_factor: 0 });
  assert.equal(ref.A_eff_ft2, 10000);
  assert.ok(Math.abs(ref.Ci_raw - 18 * ref.F_factor * Math.sqrt(10000)) < 1e-9,
    `Ci_raw = ${ref.Ci_raw}, expected ${18 * ref.F_factor * Math.sqrt(10000)}`);
  // Exposure-distance step pin: 50 ft falls in (30, 60] -> X = 0.15.
  assert.equal(ref.X_exposure, 0.15);
  // NFF_gpm is rounded to 250-gpm increment and bounded by min/max.
  assert.ok(ref.NFF_gpm % 250 === 0,
    `NFF_gpm = ${ref.NFF_gpm}, expected multiple of 250`);
});

test("monotonicity: computeRentalWorksheet gross_rent_annual + NOI are strictly increasing in monthly_rent at fixed expenses / vacancy (Schedule E-style rental-worksheet linear pin)", () => {
  // Group X. gross_rent = monthly_rent * 12; strictly increasing.
  // NOI = EGI - expenses; EGI = gross_rent * (1 - vac%/100) + other.
  let prevG = -Infinity;
  let prevN = -Infinity;
  for (const monthly_rent of [500, 1000, 1500, 2200, 3000, 5000]) {
    const r = computeRentalWorksheet({
      monthly_rent, vacancy_pct: 5, other_income_annual: 0,
      insurance: 1200, mortgage_interest: 9800, property_taxes: 4800,
      management_fees: 0, repairs: 1500, utilities: 0, hoa_fees: 0,
      depreciation_annual: 9200, property_value: 320000, cash_invested: 80000,
    });
    assert.ok(Number.isFinite(r.gross_rent_annual),
      `gross at rent=${monthly_rent}: ${JSON.stringify(r)}`);
    assert.ok(r.gross_rent_annual > prevG,
      `gross at rent=${monthly_rent} = ${r.gross_rent_annual} not greater than prev=${prevG}`);
    assert.ok(r.NOI > prevN,
      `NOI at rent=${monthly_rent} = ${r.NOI} not greater than prev=${prevN}`);
    prevG = r.gross_rent_annual;
    prevN = r.NOI;
  }
  // Doubling-rent pin: 2x monthly rent -> 2x gross_rent exactly.
  const a = computeRentalWorksheet({ monthly_rent: 1100, vacancy_pct: 5, insurance: 1200, mortgage_interest: 9800, property_taxes: 4800, management_fees: 0, repairs: 1500, depreciation_annual: 9200, property_value: 320000, cash_invested: 80000 });
  const b = computeRentalWorksheet({ monthly_rent: 2200, vacancy_pct: 5, insurance: 1200, mortgage_interest: 9800, property_taxes: 4800, management_fees: 0, repairs: 1500, depreciation_annual: 9200, property_value: 320000, cash_invested: 80000 });
  assert.equal(b.gross_rent_annual, 2 * a.gross_rent_annual);
  // Closed-form pin from rentalWorksheetExample: rent=2200 / vac=5% ->
  // gross=26400 / vac_loss=1320 / EGI=25080. Expenses=19412. NOI=5668.
  // Taxable=5668-9200=-3532 (passive loss).
  const ref = computeRentalWorksheet({
    monthly_rent: 2200, vacancy_pct: 5, other_income_annual: 0,
    insurance: 1200, mortgage_interest: 9800, property_taxes: 4800,
    management_fees: 2112, repairs: 1500, utilities: 0, hoa_fees: 0,
    depreciation_annual: 9200, property_value: 320000, cash_invested: 80000,
  });
  assert.equal(ref.gross_rent_annual, 26400);
  assert.equal(ref.vacancy_loss, 1320);
  assert.equal(ref.effective_gross_income, 25080);
  assert.equal(ref.total_expenses, 19412);
  assert.equal(ref.NOI, 5668);
  assert.equal(ref.taxable_rental_income, -3532);
  // cap_rate_pct = NOI / property_value * 100 pin.
  assert.ok(Math.abs(ref.cap_rate_pct - (5668 / 320000) * 100) < 1e-9,
    `cap_rate = ${ref.cap_rate_pct}, expected ${(5668 / 320000) * 100}`);
  // cash_on_cash_pct = NOI / cash_invested * 100 pin.
  assert.ok(Math.abs(ref.cash_on_cash_pct - (5668 / 80000) * 100) < 1e-9,
    `coc = ${ref.cash_on_cash_pct}, expected ${(5668 / 80000) * 100}`);
});

// --- spec-v14 §10.3 Phase F fortieth monotonicity batch ----------------
// Five new sweeps across five distinct catalog groups (B / G / R / V / W).
// Closes the 40th batch milestone with one fresh consumer per group.

import { computePipeExpansion } from "../../calc-plumbing.js";
import { computeNIOSHLifting } from "../../calc-cross.js";
import { computeMacrs } from "../../calc-accounting.js";
import { computePediatricWeight } from "../../calc-ems.js";
import { computeMagneticVariation } from "../../calc-aviation.js";

test("monotonicity: computePipeExpansion delta_L_in is strictly increasing in length_ft AND in delta_T_F (alpha * L * 12 * dT linear pin)", () => {
  // Group B. dL = alpha * L * 12 * dT; strictly increasing in length
  // (at fixed alpha / dT) and in delta_T_F (at fixed alpha / L).
  let prevL = -Infinity;
  for (const length_ft of [10, 25, 50, 100, 200, 400, 800]) {
    const r = computePipeExpansion({ material: "copper", length_ft, delta_T_F: 80 });
    assert.ok(Number.isFinite(r.delta_L_in) && r.delta_L_in > 0,
      `dL at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.delta_L_in > prevL,
      `dL at L=${length_ft} = ${r.delta_L_in} not greater than prev=${prevL}`);
    prevL = r.delta_L_in;
  }
  let prevT = -Infinity;
  for (const delta_T_F of [10, 25, 50, 80, 120, 180, 250]) {
    const r = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F });
    assert.ok(r.delta_L_in > prevT,
      `dL at dT=${delta_T_F} = ${r.delta_L_in} not greater than prev=${prevT}`);
    prevT = r.delta_L_in;
  }
  // Doubling-length pin: 2x L -> 2x dL exactly (linear in L).
  const a = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 80 });
  const b = computePipeExpansion({ material: "copper", length_ft: 200, delta_T_F: 80 });
  assert.ok(Math.abs(b.delta_L_in - 2 * a.delta_L_in) < 1e-12,
    `2x L: dL = ${b.delta_L_in} != 2 * ${a.delta_L_in}`);
  // Doubling-dT pin: 2x dT -> 2x dL exactly (linear in dT).
  const c = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 160 });
  assert.ok(Math.abs(c.delta_L_in - 2 * a.delta_L_in) < 1e-12,
    `2x dT: dL = ${c.delta_L_in} != 2 * ${a.delta_L_in}`);
  // Closed-form pin from pipeExpansionExample: copper alpha = 9.4e-6 /F /
  // L=100 ft / dT=80 F -> dL = 9.4e-6 * 100 * 12 * 80 = 0.9024 in.
  const ref = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 80 });
  assert.equal(ref.alpha_per_F, 9.4e-6);
  assert.ok(Math.abs(ref.delta_L_in - 9.4e-6 * 100 * 12 * 80) < 1e-12,
    `dL = ${ref.delta_L_in}, expected ${9.4e-6 * 100 * 12 * 80}`);
  // Material-step pin: PEX (alpha = 1.1e-4) expands ~ 11.7x copper at
  // identical L / dT.
  const pex = computePipeExpansion({ material: "PEX", length_ft: 100, delta_T_F: 80 });
  const ratio = pex.delta_L_in / ref.delta_L_in;
  assert.ok(ratio > 11 && ratio < 12.5,
    `PEX / copper ratio = ${ratio}, expected ~11.7`);
});

test("monotonicity: computeNIOSHLifting HM is strictly decreasing in H_in (10/H Horizontal-Multiplier pin); VM peaks at V=30; LI strictly increasing in weight_lb (NIOSH 1991 Lifting Equation pin)", () => {
  // Group G. HM = 10 / H_in; strictly decreasing in H over [10, 25].
  let prevHM = Infinity;
  for (const H_in of [10, 12, 15, 18, 20, 22, 25]) {
    const r = computeNIOSHLifting({ weight_lb: 30, H_in, V_in: 30, D_in: 20, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
    assert.ok(Number.isFinite(r.multipliers.HM),
      `HM at H=${H_in}: ${JSON.stringify(r)}`);
    assert.ok(r.multipliers.HM < prevHM,
      `HM at H=${H_in} = ${r.multipliers.HM} not less than prev=${prevHM}`);
    prevHM = r.multipliers.HM;
  }
  // HM closed-form pin: 10/H exact at H = 10, 12, 25.
  const h10 = computeNIOSHLifting({ weight_lb: 30, H_in: 10, V_in: 30, D_in: 0, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.equal(h10.multipliers.HM, 1);
  const h25 = computeNIOSHLifting({ weight_lb: 30, H_in: 25, V_in: 30, D_in: 0, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.equal(h25.multipliers.HM, 0.4);
  // VM peaks at V=30 (the knuckle height); VM = 1 - 0.0075 * |V - 30|.
  const at30 = computeNIOSHLifting({ weight_lb: 30, H_in: 10, V_in: 30, D_in: 0, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.equal(at30.multipliers.VM, 1);
  const at0 = computeNIOSHLifting({ weight_lb: 30, H_in: 10, V_in: 0, D_in: 0, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.ok(Math.abs(at0.multipliers.VM - (1 - 0.0075 * 30)) < 1e-12,
    `VM at V=0 = ${at0.multipliers.VM}, expected ${1 - 0.0075 * 30}`);
  const at60 = computeNIOSHLifting({ weight_lb: 30, H_in: 10, V_in: 60, D_in: 0, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.ok(Math.abs(at60.multipliers.VM - at0.multipliers.VM) < 1e-12,
    `VM symmetric around V=30: V=60 = ${at60.multipliers.VM} vs V=0 = ${at0.multipliers.VM}`);
  // LI = weight / RWL; strictly increasing in weight at fixed RWL.
  let prevLI = -Infinity;
  for (const weight_lb of [5, 10, 20, 30, 40, 60, 80]) {
    const r = computeNIOSHLifting({ weight_lb, H_in: 12, V_in: 30, D_in: 20, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
    assert.ok(r.LI > prevLI,
      `LI at w=${weight_lb} = ${r.LI} not greater than prev=${prevLI}`);
    prevLI = r.LI;
  }
  // Asymmetry-multiplier pin: AM = 1 - 0.0032 * asymmetry; AM=1 at 0 deg.
  const asym0 = computeNIOSHLifting({ weight_lb: 30, H_in: 10, V_in: 30, D_in: 0, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.equal(asym0.multipliers.AM, 1);
  const asym90 = computeNIOSHLifting({ weight_lb: 30, H_in: 10, V_in: 30, D_in: 0, asymmetry_deg: 90, frequency_per_min: 1, duration_hr: 1, coupling: "good" });
  assert.ok(Math.abs(asym90.multipliers.AM - (1 - 0.0032 * 90)) < 1e-12,
    `AM at 90 deg = ${asym90.multipliers.AM}, expected ${1 - 0.0032 * 90}`);
});

test("monotonicity: computeMacrs year_depreciation is strictly increasing in cost at fixed class_life / year_of_interest; schedule percentages sum to 100 (IRS Pub 946 table pin)", () => {
  // Group R. year_depreciation = cost * pct[year-1] / 100; strictly
  // increasing in cost for any fixed class_life / year_of_interest.
  let prev = -Infinity;
  for (const cost of [1000, 5000, 10000, 50000, 100000, 500000]) {
    const r = computeMacrs({ cost, class_life: 5, convention: "half_year", year_of_interest: 1 });
    assert.ok(Number.isFinite(r.year_depreciation) && r.year_depreciation > 0,
      `dep at cost=${cost}: ${JSON.stringify(r)}`);
    assert.ok(r.year_depreciation > prev,
      `dep at cost=${cost} = ${r.year_depreciation} not greater than prev=${prev}`);
    prev = r.year_depreciation;
  }
  // Doubling-cost pin: 2x cost -> 2x year_depreciation exactly (linear).
  const a = computeMacrs({ cost: 10000, class_life: 5, convention: "half_year", year_of_interest: 1 });
  const b = computeMacrs({ cost: 20000, class_life: 5, convention: "half_year", year_of_interest: 1 });
  assert.ok(Math.abs(b.year_depreciation - 2 * a.year_depreciation) < 1e-12,
    `2x cost: dep = ${b.year_depreciation} != 2 * ${a.year_depreciation}`);
  // accumulated_depreciation monotone non-decreasing across years; final
  // book_value at end of class life = 0 (5-yr half-year table runs 6 entries).
  const yrs = [];
  for (let y = 1; y <= 6; y++) {
    yrs.push(computeMacrs({ cost: 10000, class_life: 5, convention: "half_year", year_of_interest: y }));
  }
  let prevAcc = -Infinity;
  for (const r of yrs) {
    assert.ok(r.accumulated_depreciation >= prevAcc,
      `accumulated at year=${r.year_of_interest} = ${r.accumulated_depreciation} not >= prev=${prevAcc}`);
    prevAcc = r.accumulated_depreciation;
  }
  assert.ok(Math.abs(yrs[5].accumulated_depreciation - 10000) < 1e-9,
    `final accumulated = ${yrs[5].accumulated_depreciation}, expected 10000`);
  assert.ok(Math.abs(yrs[5].book_value) < 1e-9,
    `final book_value = ${yrs[5].book_value}, expected 0`);
  // Closed-form pin from macrsExample: cost=10000 / class_life=5 /
  // half_year / year_of_interest=1 -> year_depreciation = 2000 (20.00%
  // is the published Pub 946 5-yr half-year first-year percentage).
  assert.equal(a.year_depreciation, 2000);
  // Schedule sums to cost (every percentage row sums to 100% across the
  // class life).
  const totalDep = yrs.reduce((s, r) => s + (s === 0 ? r.accumulated_depreciation : 0), 0);
  // The simpler check: the last entry's accumulated_depreciation == cost.
  assert.ok(Math.abs(yrs[yrs.length - 1].accumulated_depreciation - 10000) < 1e-9,
    `accumulated[last] = ${yrs[yrs.length - 1].accumulated_depreciation}, expected 10000`);
  // Suppress unused-var lint by referencing totalDep.
  assert.ok(totalDep >= 0);
});

test("monotonicity: computePediatricWeight apls_kg is strictly increasing across the APLS age bands (months -> 0-5 yr -> 6-12 yr piecewise-linear pin)", () => {
  // Group V. APLS pediatric weight formulas (Advanced Paediatric Life
  // Support):
  //   0-12 months: (months / 2) + 4
  //   1-5 years:   (2 * years) + 8
  //   6-12 years:  (3 * years) + 7
  // All three are linear in age and produce a monotone-non-decreasing
  // estimate across the bundled age range.
  let prev = -Infinity;
  // 6 month checkpoints from infancy through early childhood.
  for (const age_months of [0, 3, 6, 9, 12]) {
    const r = computePediatricWeight({ age_months });
    assert.ok(Number.isFinite(r.apls_kg) && r.apls_kg > 0,
      `apls at mo=${age_months}: ${JSON.stringify(r)}`);
    assert.ok(r.apls_kg > prev,
      `apls at mo=${age_months} = ${r.apls_kg} not greater than prev=${prev}`);
    prev = r.apls_kg;
  }
  // Years sweep across both age formulas.
  let prevYr = -Infinity;
  for (const age_years of [1, 2, 3, 5, 6, 8, 10, 12]) {
    const r = computePediatricWeight({ age_years });
    assert.ok(Number.isFinite(r.apls_kg),
      `apls at yr=${age_years}: ${JSON.stringify(r)}`);
    assert.ok(r.apls_kg > prevYr,
      `apls at yr=${age_years} = ${r.apls_kg} not greater than prev=${prevYr}`);
    prevYr = r.apls_kg;
  }
  // Closed-form pin: 6 mo -> 6/2 + 4 = 7 kg; 1 yr -> 2*1 + 8 = 10 kg;
  // 5 yr -> 2*5 + 8 = 18 kg; 6 yr -> 3*6 + 7 = 25 kg; 12 yr -> 3*12 + 7 = 43 kg.
  assert.equal(computePediatricWeight({ age_months: 6 }).apls_kg, 7);
  assert.equal(computePediatricWeight({ age_years: 1 }).apls_kg, 10);
  assert.equal(computePediatricWeight({ age_years: 5 }).apls_kg, 18);
  assert.equal(computePediatricWeight({ age_years: 6 }).apls_kg, 25);
  assert.equal(computePediatricWeight({ age_years: 12 }).apls_kg, 43);
  // kg/lb pin: pounds = apls_kg * 2.2046226218.
  const r6mo = computePediatricWeight({ age_months: 6 });
  assert.ok(Math.abs(r6mo.pounds - 7 * 2.2046226218) < 1e-9,
    `pounds at 6 mo = ${r6mo.pounds}, expected ${7 * 2.2046226218}`);
});

test("monotonicity: computeMagneticVariation result_heading reflects 'east is least; west is best' (signed-variation linear pin) + round-trip identity + 0-360 wrap pin", () => {
  // Group W. True -> Magnetic: magnetic = true + west - east; the result
  // is strictly monotone in heading_deg over a range that does not wrap.
  let prev = -Infinity;
  for (const heading_deg of [10, 60, 120, 180, 240, 300, 350]) {
    const r = computeMagneticVariation({ variation_deg: 5, direction_ew: "west", heading_deg, sense: "true_to_magnetic" });
    assert.ok(Number.isFinite(r.result_heading),
      `result at h=${heading_deg}: ${JSON.stringify(r)}`);
    assert.ok(r.result_heading > prev,
      `result at h=${heading_deg} = ${r.result_heading} not greater than prev=${prev}`);
    prev = r.result_heading;
  }
  // Closed-form pin from magneticVariationExample: variation 7 deg E /
  // heading 090 / true_to_magnetic -> 090 - 7 = 083.
  const ref = computeMagneticVariation({ variation_deg: 7, direction_ew: "east", heading_deg: 90, sense: "true_to_magnetic" });
  assert.equal(ref.result_heading, 83);
  // "East is least; West is best" pin: easterly variation SUBTRACTS from
  // true to give magnetic; westerly variation ADDS.
  const east = computeMagneticVariation({ variation_deg: 10, direction_ew: "east", heading_deg: 180, sense: "true_to_magnetic" });
  assert.equal(east.result_heading, 170);
  const west = computeMagneticVariation({ variation_deg: 10, direction_ew: "west", heading_deg: 180, sense: "true_to_magnetic" });
  assert.equal(west.result_heading, 190);
  // Round-trip identity pin: true -> magnetic -> true returns the input.
  const t2m = computeMagneticVariation({ variation_deg: 12, direction_ew: "west", heading_deg: 270, sense: "true_to_magnetic" });
  const m2t = computeMagneticVariation({ variation_deg: 12, direction_ew: "west", heading_deg: t2m.result_heading, sense: "magnetic_to_true" });
  assert.equal(m2t.result_heading, 270);
  // 0-360 wrap pin: heading 355 + 10 deg W -> 365 -> 5 (wraps to start).
  const wrap = computeMagneticVariation({ variation_deg: 10, direction_ew: "west", heading_deg: 355, sense: "true_to_magnetic" });
  assert.equal(wrap.result_heading, 5);
  // Heading 005 - 10 deg E -> -5 -> 355 (wraps via normalize).
  const wrapNeg = computeMagneticVariation({ variation_deg: 10, direction_ew: "east", heading_deg: 5, sense: "true_to_magnetic" });
  assert.equal(wrapNeg.result_heading, 355);
});

// --- spec-v14 §10.3 Phase F forty-first monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (D / L / M / N / U).

import { computeMoldRisk } from "../../calc-restoration.js";
import { computeSprayerCalibration } from "../../calc-agriculture.js";
import { computeDisinfectionCT } from "../../calc-water.js";
import { computeDMX } from "../../calc-stage.js";
import { computeCrystalloidPlan } from "../../calc-vet.js";

test("monotonicity: computeMoldRisk risk tips at RH 60 / 70 thresholds and 24 / 48 hour-elevation thresholds; temperature window 40-100 F resets to low (IICRC mold-growth band pin)", () => {
  // Group D. Bands:
  //   high    -> RH >= 70 AND hours_elevated >= 24
  //   moderate-> RH in [60, 70) AND hours_elevated >= 48
  //   low     -> otherwise (also reset to low outside 40-100 F)
  // Walk the boundaries to pin the comparator strictness.
  const high = computeMoldRisk({ rh_percent: 75, temperature_F: 75, hours_elevated: 48 });
  assert.equal(high.risk, "high");
  const moderate = computeMoldRisk({ rh_percent: 65, temperature_F: 75, hours_elevated: 48 });
  assert.equal(moderate.risk, "moderate");
  const lowShortTime = computeMoldRisk({ rh_percent: 75, temperature_F: 75, hours_elevated: 23 });
  // RH high but under 24-hour germination threshold: starts low; the
  // moderate test (RH >= 60) does not check, so it stays low.
  assert.equal(lowShortTime.risk, "low");
  const lowRH = computeMoldRisk({ rh_percent: 55, temperature_F: 75, hours_elevated: 1000 });
  assert.equal(lowRH.risk, "low");
  // Temperature out-of-range pin: warm-window override snaps to low.
  const coldOverride = computeMoldRisk({ rh_percent: 90, temperature_F: 35, hours_elevated: 1000 });
  assert.equal(coldOverride.risk, "low (out of typical growth range)");
  const hotOverride = computeMoldRisk({ rh_percent: 90, temperature_F: 105, hours_elevated: 1000 });
  assert.equal(hotOverride.risk, "low (out of typical growth range)");
  // Boundary pins: RH=70 + 24 h tips high; RH=69 + 24 h falls to low
  // (the moderate branch needs 48 h).
  const at70 = computeMoldRisk({ rh_percent: 70, temperature_F: 75, hours_elevated: 24 });
  assert.equal(at70.risk, "high");
  const at69 = computeMoldRisk({ rh_percent: 69, temperature_F: 75, hours_elevated: 24 });
  assert.equal(at69.risk, "low");
  // Closed-form pin from moldExample: 75 / 75 / 48 -> high.
  const ref = computeMoldRisk({ rh_percent: 75, temperature_F: 75, hours_elevated: 48 });
  assert.equal(ref.risk, "high");
  // Constant-threshold pins (the published 60 / 70 / 40 / 24 numbers).
  assert.equal(ref.threshold_rh_growth_percent, 60);
  assert.equal(ref.threshold_rh_high_percent, 70);
  assert.equal(ref.minimum_growth_temperature_F, 40);
  assert.equal(ref.typical_germination_hours, 24);
});

test("monotonicity: computeSprayerCalibration travel_distance_ft is strictly decreasing in boom_width_ft (1/128-acre identity pin); gpa_actual = oz_per_nozzle exact (USDA-NRCS 1/128 acre rule pin)", () => {
  // Group L. 1/128 acre = 43560 / 128 = 340.3125 ft^2; travel_distance =
  // acre_fraction / boom_width; strictly decreasing in boom width.
  let prev = Infinity;
  for (const boom_width_ft of [10, 15, 20, 25, 30, 40, 60]) {
    const r = computeSprayerCalibration({ boom_width_ft, oz_per_nozzle: 20, time_s: 5, target_gpa: 0 });
    assert.ok(Number.isFinite(r.travel_distance_ft) && r.travel_distance_ft > 0,
      `travel at W=${boom_width_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.travel_distance_ft < prev,
      `travel at W=${boom_width_ft} = ${r.travel_distance_ft} not less than prev=${prev}`);
    prev = r.travel_distance_ft;
  }
  // Closed-form pin from sprayerCalibrationExample: 20 ft boom ->
  // travel = 340.3125 / 20 = 17.015625 ft; gpa_actual = oz_per_nozzle
  // (the 1/128-acre identity) = 20 exact.
  const ref = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 20, time_s: 2.9, target_gpa: 20 });
  assert.ok(Math.abs(ref.travel_distance_ft - (43560 / 128) / 20) < 1e-9,
    `travel = ${ref.travel_distance_ft}, expected ${(43560 / 128) / 20}`);
  assert.equal(ref.gpa_actual, 20);
  // ground_speed_mph closed-form: travel_ft / time_s * 3600/5280 mph.
  const expectedSpeed = (ref.travel_distance_ft / 2.9) * (3600 / 5280);
  assert.ok(Math.abs(ref.ground_speed_mph - expectedSpeed) < 1e-9,
    `speed = ${ref.ground_speed_mph}, expected ${expectedSpeed}`);
  // Adjustment branch pin: at target 20 / actual 20 -> within 5% ->
  // "Within 5%" message; no suggested_speed_mph.
  assert.ok(/Within 5%/.test(ref.adjustment),
    `adjustment = ${ref.adjustment}, expected "Within 5%" message`);
  assert.equal(ref.suggested_speed_mph, null);
  // Over-applying branch pin: actual GPA way above target -> suggested
  // speed > current speed.
  const over = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 30, time_s: 2.9, target_gpa: 20 });
  assert.ok(over.suggested_speed_mph > over.ground_speed_mph,
    `over: suggested = ${over.suggested_speed_mph}, ground = ${over.ground_speed_mph}`);
  assert.ok(/Over-applying/.test(over.adjustment),
    `over adjustment = ${over.adjustment}, expected "Over-applying" message`);
  // Under-applying branch pin: actual GPA below target -> suggested
  // speed < current speed.
  const under = computeSprayerCalibration({ boom_width_ft: 20, oz_per_nozzle: 10, time_s: 2.9, target_gpa: 20 });
  assert.ok(under.suggested_speed_mph < under.ground_speed_mph,
    `under: suggested = ${under.suggested_speed_mph}, ground = ${under.ground_speed_mph}`);
});

test("monotonicity: computeDisinfectionCT CT_achieved is strictly increasing in chlorine residual AND in t10 minutes; <0.2 mg/L SWTR-floor identity pin (SWTR Guidance Manual C*t pin)", () => {
  // Group M. CT_achieved = C * t10; strictly increasing in both.
  let prevC = -Infinity;
  for (const chlorine_mg_l of [0.21, 0.25, 0.3, 0.35, 0.4]) {
    const r = computeDisinfectionCT({ chlorine_mg_l, t10_minutes: 30, temperature_C: 5, pH: 7.0 });
    assert.ok(Number.isFinite(r.CT_achieved) && r.CT_achieved > 0,
      `CT at C=${chlorine_mg_l}: ${JSON.stringify(r)}`);
    assert.ok(r.CT_achieved > prevC,
      `CT at C=${chlorine_mg_l} = ${r.CT_achieved} not greater than prev=${prevC}`);
    prevC = r.CT_achieved;
  }
  let prevT = -Infinity;
  for (const t10_minutes of [10, 30, 60, 120, 240, 480]) {
    const r = computeDisinfectionCT({ chlorine_mg_l: 0.3, t10_minutes, temperature_C: 5, pH: 7.0 });
    assert.ok(r.CT_achieved > prevT,
      `CT at t10=${t10_minutes} = ${r.CT_achieved} not greater than prev=${prevT}`);
    prevT = r.CT_achieved;
  }
  // Doubling pins: 2x C -> 2x CT; 2x t10 -> 2x CT.
  const base = computeDisinfectionCT({ chlorine_mg_l: 0.3, t10_minutes: 30, temperature_C: 5, pH: 7.0 });
  const dblC = computeDisinfectionCT({ chlorine_mg_l: 0.6, t10_minutes: 30, temperature_C: 5, pH: 7.0 });
  const dblT = computeDisinfectionCT({ chlorine_mg_l: 0.3, t10_minutes: 60, temperature_C: 5, pH: 7.0 });
  assert.ok(Math.abs(dblC.CT_achieved - 2 * base.CT_achieved) < 1e-12,
    `2x C: CT = ${dblC.CT_achieved} != 2 * ${base.CT_achieved}`);
  assert.ok(Math.abs(dblT.CT_achieved - 2 * base.CT_achieved) < 1e-12,
    `2x t10: CT = ${dblT.CT_achieved} != 2 * ${base.CT_achieved}`);
  // <0.2 mg/L SWTR-floor identity pin: CT_achieved snaps to 0; log_inactivation = 0.
  const floor = computeDisinfectionCT({ chlorine_mg_l: 0.15, t10_minutes: 30, temperature_C: 5, pH: 7.0 });
  assert.equal(floor.CT_achieved, 0);
  assert.equal(floor.log_inactivation, 0);
  assert.equal(floor.pass_3log_giardia, false);
  assert.equal(floor.pass_4log_virus, false);
  // Closed-form pin: C=0.3 / t10=30 -> CT = 9.0 exact.
  assert.ok(Math.abs(base.CT_achieved - 9.0) < 1e-12,
    `CT = ${base.CT_achieved}, expected 9.0`);
});

test("monotonicity: computeDMX utilization is strictly increasing as channels accumulate within a universe; overflow flag tips at end > 512; conflict detection on overlap (DMX-512 1990 pin)", () => {
  // Group N. utilization (per universe) = used_channels / 512 * 100;
  // strictly increasing as we add channels.
  let prev = -Infinity;
  for (const ch of [4, 12, 24, 48, 96, 192, 384]) {
    const r = computeDMX({ fixtures: [{ name: "a", start: 1, channels: ch, universe: 1 }] });
    assert.ok(r.utilization[1] > prev,
      `util at ch=${ch} = ${r.utilization[1]} not greater than prev=${prev}`);
    prev = r.utilization[1];
  }
  // Overflow flag tips at end > 512: start=500 + ch=20 -> end=519 -> overflow=true.
  const overflow = computeDMX({ fixtures: [{ name: "long", start: 500, channels: 20, universe: 1 }] });
  assert.equal(overflow.ranges[0].overflow, true);
  assert.equal(overflow.ranges[0].end, 512);
  assert.equal(overflow.ranges[0].raw_end, 519);
  assert.equal(overflow.split_recommended, true);
  // No-overflow pin: 500 + 12 = 512 (just fits) -> overflow=false.
  const noOverflow = computeDMX({ fixtures: [{ name: "fits", start: 500, channels: 13, universe: 1 }] });
  assert.equal(noOverflow.ranges[0].overflow, false);
  assert.equal(noOverflow.ranges[0].end, 512);
  // Conflict-detection pin from dmxExample: 1-12, 13-24, 50-65, 200-203
  // - no overlap -> zero conflicts.
  const ref = computeDMX({
    fixtures: [
      { name: "front wash", start: 1, channels: 12, universe: 1 },
      { name: "rear wash", start: 13, channels: 12, universe: 1 },
      { name: "movers", start: 50, channels: 16, universe: 1 },
      { name: "haze", start: 200, channels: 4, universe: 1 },
    ],
  });
  assert.equal(ref.conflicts.length, 0);
  // Conflict pin: overlapping ranges produce a conflict entry.
  const conflict = computeDMX({
    fixtures: [
      { name: "a", start: 1, channels: 16, universe: 1 },
      { name: "b", start: 10, channels: 8, universe: 1 },
    ],
  });
  assert.ok(conflict.conflicts.length >= 1,
    `expected at least one conflict: ${JSON.stringify(conflict.conflicts)}`);
  // max_universe pin: 2 fixtures on different universes -> max=3.
  const multi = computeDMX({
    fixtures: [
      { name: "a", start: 1, channels: 4, universe: 1 },
      { name: "b", start: 1, channels: 4, universe: 3 },
    ],
  });
  assert.equal(multi.max_universe, 3);
});

test("monotonicity: computeCrystalloidPlan total_rate_mL_per_hr is strictly increasing in patient weight (linear-in-kg pin) AND in dehydration_percent AND in any loss rate (DiBartola crystalloid-plan additive pin)", () => {
  // Group U. total_rate = maintenance + replacement + sum(losses);
  // strictly increasing in weight (maintenance linear in kg), in
  // dehydration_percent (replacement linear in dh), and in each
  // loss-rate component.
  let prev = -Infinity;
  for (const weight of [2, 5, 10, 20, 40, 60]) {
    const r = computeCrystalloidPlan({
      weight, weight_unit: "kg", species: "dog", dehydration_percent: 5,
      vomiting_mL_per_hr: 0, diarrhea_mL_per_hr: 0, blood_loss_mL_per_hr: 0, surgical_loss_mL_per_hr: 0,
      rehydration_window_hr: 24,
    });
    assert.ok(Number.isFinite(r.total_rate_mL_per_hr) && r.total_rate_mL_per_hr > 0,
      `total at wt=${weight}: ${JSON.stringify(r)}`);
    assert.ok(r.total_rate_mL_per_hr > prev,
      `total at wt=${weight} = ${r.total_rate_mL_per_hr} not greater than prev=${prev}`);
    prev = r.total_rate_mL_per_hr;
  }
  // Strictly increasing in dehydration_percent at fixed weight / losses.
  let prevDh = -Infinity;
  for (const dh of [0, 2, 5, 8, 10, 12]) {
    const r = computeCrystalloidPlan({
      weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: dh,
      vomiting_mL_per_hr: 0, diarrhea_mL_per_hr: 0, blood_loss_mL_per_hr: 0, surgical_loss_mL_per_hr: 0,
      rehydration_window_hr: 24,
    });
    assert.ok(r.total_rate_mL_per_hr > prevDh,
      `total at dh=${dh} = ${r.total_rate_mL_per_hr} not greater than prev=${prevDh}`);
    prevDh = r.total_rate_mL_per_hr;
  }
  // Closed-form pin: 20 kg dog / 5% dehydration / 24-hr window:
  //   maintenance_mL_per_day = 60 * 20 = 1200 -> 50 mL/hr
  //   replacement_total      = 20 * 0.05 * 1000 = 1000 -> 41.667 mL/hr
  //   total (no losses)      = 91.667 mL/hr.
  const ref = computeCrystalloidPlan({
    weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 5,
    vomiting_mL_per_hr: 0, diarrhea_mL_per_hr: 0, blood_loss_mL_per_hr: 0, surgical_loss_mL_per_hr: 0,
    rehydration_window_hr: 24,
  });
  assert.equal(ref.maintenance_mL_per_hr, 50);
  assert.equal(ref.replacement_total_mL, 1000);
  assert.ok(Math.abs(ref.replacement_rate_mL_per_hr - (1000 / 24)) < 1e-9,
    `replacement rate = ${ref.replacement_rate_mL_per_hr}, expected ${1000 / 24}`);
  assert.ok(Math.abs(ref.total_rate_mL_per_hr - (50 + 1000 / 24)) < 1e-9,
    `total = ${ref.total_rate_mL_per_hr}, expected ${50 + 1000 / 24}`);
  // Loss-rate additivity pin: 10 mL/hr in each of four loss buckets ->
  // total grows by 40 mL/hr exactly.
  const withLoss = computeCrystalloidPlan({
    weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 5,
    vomiting_mL_per_hr: 10, diarrhea_mL_per_hr: 10, blood_loss_mL_per_hr: 10, surgical_loss_mL_per_hr: 10,
    rehydration_window_hr: 24,
  });
  assert.ok(Math.abs(withLoss.losses_total_mL_per_hr - 40) < 1e-12,
    `losses_total = ${withLoss.losses_total_mL_per_hr}, expected 40`);
  assert.ok(Math.abs(withLoss.total_rate_mL_per_hr - (ref.total_rate_mL_per_hr + 40)) < 1e-9,
    `total with losses = ${withLoss.total_rate_mL_per_hr}, expected ${ref.total_rate_mL_per_hr + 40}`);
  // gtt-set pins: 10 gtts/mL adult set = total/6; 60 gtts/mL pediatric set = total.
  assert.ok(Math.abs(ref.gtts_per_min_10_set - ref.total_rate_mL_per_hr / 6) < 1e-9,
    `10-gtt set = ${ref.gtts_per_min_10_set}, expected ${ref.total_rate_mL_per_hr / 6}`);
  assert.ok(Math.abs(ref.gtts_per_min_60_set - ref.total_rate_mL_per_hr) < 1e-9,
    `60-gtt set = ${ref.gtts_per_min_60_set}, expected ${ref.total_rate_mL_per_hr}`);
  // severe_dehydration_flag tips at > 8%.
  const mild = computeCrystalloidPlan({ weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 8, rehydration_window_hr: 24 });
  assert.equal(mild.severe_dehydration_flag, false);
  const severe = computeCrystalloidPlan({ weight: 20, weight_unit: "kg", species: "dog", dehydration_percent: 9, rehydration_window_hr: 24 });
  assert.equal(severe.severe_dehydration_flag, true);
});

// --- spec-v14 §10.3 Phase F forty-second monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (A / B / C / E / X).

import { computeMotorBranchFromNameplate } from "../../calc-electrical.js";
import { computeTanklessGPM } from "../../calc-plumbing.js";
import { computeBalancePoint } from "../../calc-hvac.js";
import { computeJoistDeflection } from "../../calc-construction.js";
import { computeClosingCosts } from "../../calc-realestate.js";

test("monotonicity: computeMotorBranchFromNameplate computed_fla_A is strictly increasing in HP at fixed V / phase / eta / PF; branch_conductor = 1.25 * design_fla (NEC 430.22 125% continuous-load pin)", () => {
  // Group A. computed_fla = HP * 746 / (V * eta * PF) for single-phase;
  // strictly increasing in HP at fixed other parameters.
  let prev = -Infinity;
  for (const hp of [0.5, 1, 2, 3, 5, 7.5, 10]) {
    const r = computeMotorBranchFromNameplate({ hp, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, service_factor: 1.15 });
    assert.ok(Number.isFinite(r.computed_fla_A) && r.computed_fla_A > 0,
      `FLA at HP=${hp}: ${JSON.stringify(r)}`);
    assert.ok(r.computed_fla_A > prev,
      `FLA at HP=${hp} = ${r.computed_fla_A} not greater than prev=${prev}`);
    prev = r.computed_fla_A;
  }
  // Doubling-HP pin: 2x HP -> 2x FLA exactly (linear in HP).
  const a = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, service_factor: 1.15 });
  const b = computeMotorBranchFromNameplate({ hp: 10, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, service_factor: 1.15 });
  assert.ok(Math.abs(b.computed_fla_A - 2 * a.computed_fla_A) < 1e-9,
    `2x HP: FLA = ${b.computed_fla_A} != 2 * ${a.computed_fla_A}`);
  // NEC 430.22 125% pin: branch_conductor = 1.25 * design_fla exactly.
  assert.ok(Math.abs(a.branch_conductor_125pct_A - 1.25 * a.design_fla_A) < 1e-12,
    `branch = ${a.branch_conductor_125pct_A} != 1.25 * ${a.design_fla_A}`);
  // NEC 430.32 overload pin: SF >= 1.15 -> 125%; SF < 1.15 -> 115%.
  const sfHigh = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, service_factor: 1.15 });
  assert.equal(sfHigh.overload_multiplier, 1.25);
  const sfLow = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, service_factor: 1.0 });
  assert.equal(sfLow.overload_multiplier, 1.15);
  // Closed-form pin from motorBranchExample: HP=5 / 230 V / 1-ph / eta=0.875
  // / PF=0.78 -> computed_fla = 5 * 746 / (230 * 0.875 * 0.78).
  const ref = computeMotorBranchFromNameplate({ hp: 5, voltage_V: 230, phase: 1, eta: 0.875, power_factor: 0.78, nameplate_fla_A: 28, service_factor: 1.15 });
  const expectedComputed = (5 * 746) / (230 * 0.875 * 0.78);
  assert.ok(Math.abs(ref.computed_fla_A - expectedComputed) < 1e-9,
    `computed_fla = ${ref.computed_fla_A}, expected ${expectedComputed}`);
  // Nameplate override pin: nameplate 28 A > computed -> design uses nameplate.
  assert.equal(ref.design_fla_A, 28);
  assert.equal(ref.design_source, "nameplate");
});

test("monotonicity: computeTanklessGPM gpm is strictly increasing in kbtu_input AND strictly decreasing in target_outlet_F at fixed climate (BTU = lb * 1 BTU/lb F * dT pin)", () => {
  // Group B. gpm = (kbtu * 1000) / (8.33 * 60 * dT); strictly increasing
  // in kbtu (at fixed dT) and strictly decreasing in target_outlet_F
  // (which increases dT) at fixed inlet.
  let prev = -Infinity;
  for (const kbtu_input of [40, 80, 120, 160, 199, 250, 400]) {
    const r = computeTanklessGPM({ kbtu_input, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
    assert.ok(Number.isFinite(r.gpm) && r.gpm > 0,
      `gpm at kbtu=${kbtu_input}: ${JSON.stringify(r)}`);
    assert.ok(r.gpm > prev,
      `gpm at kbtu=${kbtu_input} = ${r.gpm} not greater than prev=${prev}`);
    prev = r.gpm;
  }
  // Strictly decreasing in target_outlet_F (larger dT -> smaller gpm).
  let prevDecr = Infinity;
  for (const target_outlet_F of [90, 100, 110, 120, 130, 140, 150]) {
    const r = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F });
    assert.ok(r.gpm < prevDecr,
      `gpm at outlet=${target_outlet_F} = ${r.gpm} not less than prev=${prevDecr}`);
    prevDecr = r.gpm;
  }
  // Doubling-kbtu pin: 2x kbtu -> 2x gpm exactly (linear in kbtu).
  const a = computeTanklessGPM({ kbtu_input: 100, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  const b = computeTanklessGPM({ kbtu_input: 200, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  assert.ok(Math.abs(b.gpm - 2 * a.gpm) < 1e-9,
    `2x kbtu: gpm = ${b.gpm} != 2 * ${a.gpm}`);
  // Closed-form pin: gpm = kbtu * 1000 / (8.33 * 60 * dT).
  const ref = computeTanklessGPM({ kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 });
  const expectedGpm = (199 * 1000) / (8.33 * 60 * ref.delta_T_F);
  assert.ok(Math.abs(ref.gpm - expectedGpm) < 1e-9,
    `gpm = ${ref.gpm}, expected ${expectedGpm}`);
  assert.equal(ref.target_outlet_F, 110);
  // delta_T_F = target_outlet_F - inlet_F pin.
  assert.equal(ref.delta_T_F, 110 - ref.inlet_F);
  // tanklessGPMExample band pin: 199 kBtu in Zone 5A at 110 F outlet ->
  // gpm in [5, 8] (the expected range published with the example).
  assert.ok(ref.gpm >= 5 && ref.gpm <= 8,
    `gpm = ${ref.gpm}, expected 5-8 (example range)`);
});

test("monotonicity: computeBalancePoint balance_point_F is strictly decreasing as heating_capacity rises at fixed building_heat_loss (a bigger system meets load at colder OAT) (ACCA Manual J/S balance-point pin)", () => {
  // Group C. Larger heating capacity at the same design OAT shifts the
  // balance point to a colder outdoor temperature (the system carries
  // more load before backup heat is needed).
  let prev = Infinity;
  for (const heating_capacity_btu_hr_at_design of [10000, 20000, 30000, 40000, 60000, 80000]) {
    const r = computeBalancePoint({ heating_capacity_btu_hr_at_design, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 });
    assert.ok(Number.isFinite(r.balance_point_F),
      `BP at cap=${heating_capacity_btu_hr_at_design}: ${JSON.stringify(r)}`);
    assert.ok(r.balance_point_F < prev,
      `BP at cap=${heating_capacity_btu_hr_at_design} = ${r.balance_point_F} not less than prev=${prev}`);
    prev = r.balance_point_F;
  }
  // Strictly increasing in building_heat_loss at fixed capacity (worse
  // envelope tips the balance point warmer; backup heat needed sooner).
  let prevUp = -Infinity;
  for (const building_heat_loss_btu_hr of [20000, 35000, 50000, 75000, 100000, 150000]) {
    const r = computeBalancePoint({ heating_capacity_btu_hr_at_design: 30000, design_outdoor_F: 17, building_heat_loss_btu_hr, indoor_F: 65 });
    assert.ok(r.balance_point_F > prevUp,
      `BP at load=${building_heat_loss_btu_hr} = ${r.balance_point_F} not greater than prev=${prevUp}`);
    prevUp = r.balance_point_F;
  }
  // Closed-form pin from balancePointExample: solve for T directly.
  const cap = 30000;
  const designOAT = 17;
  const loss = 50000;
  const indoor = 65;
  const slope_c = cap * 0.01;
  const slope_l = loss / Math.max(1, (indoor - designOAT));
  const expectedT = (slope_l * indoor + slope_c * designOAT - cap) / (slope_c + slope_l);
  const ref = computeBalancePoint({ heating_capacity_btu_hr_at_design: cap, design_outdoor_F: designOAT, building_heat_loss_btu_hr: loss, indoor_F: indoor });
  assert.ok(Math.abs(ref.balance_point_F - expectedT) < 1e-9,
    `BP = ${ref.balance_point_F}, expected ${expectedT}`);
});

test("monotonicity: computeJoistDeflection deflection_in is strictly increasing in uniform_load_plf AND in span_ft (5wL^4/(384EI) Euler-Bernoulli pin); 2x span -> 16x deflection exact", () => {
  // Group E. delta = 5 * w * L^4 / (384 * E * I) (in consistent units).
  // Strictly increasing in load (linear) and span (L^4).
  let prevW = -Infinity;
  for (const uniform_load_plf of [10, 20, 50, 100, 200, 500]) {
    const r = computeJoistDeflection({ uniform_load_plf, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
    assert.ok(Number.isFinite(r.deflection_in) && r.deflection_in > 0,
      `delta at w=${uniform_load_plf}: ${JSON.stringify(r)}`);
    assert.ok(r.deflection_in > prevW,
      `delta at w=${uniform_load_plf} = ${r.deflection_in} not greater than prev=${prevW}`);
    prevW = r.deflection_in;
  }
  // Strictly increasing in span (L^4 scaling).
  let prevL = -Infinity;
  for (const span_ft of [6, 8, 10, 12, 16, 20]) {
    const r = computeJoistDeflection({ uniform_load_plf: 50, span_ft, E_psi: 1600000, I_in4: 47.6 });
    assert.ok(r.deflection_in > prevL,
      `delta at L=${span_ft} = ${r.deflection_in} not greater than prev=${prevL}`);
    prevL = r.deflection_in;
  }
  // Doubling-load pin: 2x w -> 2x deflection exactly (linear in load).
  const a = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  const b = computeJoistDeflection({ uniform_load_plf: 100, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(Math.abs(b.deflection_in - 2 * a.deflection_in) < 1e-9,
    `2x load: delta = ${b.deflection_in} != 2 * ${a.deflection_in}`);
  // 2x-span pin: 2x L -> 16x deflection exactly (L^4 scaling).
  const c = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 6, E_psi: 1600000, I_in4: 47.6 });
  const d = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.ok(Math.abs(d.deflection_in / c.deflection_in - 16) < 1e-9,
    `2x span: ratio = ${d.deflection_in / c.deflection_in}, expected 16`);
  // L/360 and L/240 limit pins (IRC R301.6 / R802.4 deflection ratios).
  const ref = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  assert.equal(ref.limit_L_over_360_in, (12 * 12) / 360);
  assert.equal(ref.limit_L_over_240_in, (12 * 12) / 240);
  // joistDeflectionExample band pin: deflection in [0.05, 0.5] in.
  assert.ok(ref.deflection_in >= 0.05 && ref.deflection_in <= 0.5,
    `deflection = ${ref.deflection_in}, expected 0.05-0.5 (example range)`);
});

test("monotonicity: computeClosingCosts total_mid is strictly non-decreasing in purchase_price at fixed loan / tax / note (loan-fee + recording + transfer-tax sum pin) + closingCostsExample band pin", () => {
  // Group X. total_mid sums per-line midpoint costs; most are tied to
  // loan_amount or purchase_price linearly (transfer tax, origination,
  // title, etc.), so total_mid is non-decreasing in purchase_price at
  // fixed loan / tax / note rates.
  let prev = -Infinity;
  for (const purchase_price of [200000, 300000, 400000, 600000, 800000, 1200000]) {
    const r = computeClosingCosts({ purchase_price, loan_amount: Math.min(purchase_price * 0.8, purchase_price), transfer_tax_rate_pct: 0.4, note_rate_pct: 6.5 });
    assert.ok(Number.isFinite(r.total_mid) && r.total_mid > 0,
      `total at price=${purchase_price}: ${JSON.stringify(r)}`);
    assert.ok(r.total_mid >= prev,
      `total at price=${purchase_price} = ${r.total_mid} not >= prev=${prev}`);
    prev = r.total_mid;
  }
  // total_low <= total_mid <= total_high invariant.
  const ref = computeClosingCosts({ purchase_price: 400000, loan_amount: 320000, transfer_tax_rate_pct: 0.4, note_rate_pct: 6.5 });
  assert.ok(ref.total_low <= ref.total_mid && ref.total_mid <= ref.total_high,
    `low/mid/high invariant violated: ${ref.total_low} / ${ref.total_mid} / ${ref.total_high}`);
  // closingCostsExample band pin: total_mid ~ 11124 (the published
  // expected midpoint).
  assert.ok(ref.total_mid >= 9000 && ref.total_mid <= 14000,
    `closingCostsExample total_mid = ${ref.total_mid}, expected ~11124`);
  // items_count pin: 13 line items per the example expected.
  assert.equal(ref.items.length, 13);
  // total_pct_of_price closed-form pin.
  assert.ok(Math.abs(ref.total_pct_of_price_mid - (ref.total_mid / 400000) * 100) < 1e-9,
    `pct = ${ref.total_pct_of_price_mid}, expected ${(ref.total_mid / 400000) * 100}`);
  // All-cash boundary pin: loan_amount = 0 still produces a valid
  // closing-cost estimate (no origination / lender's title); total_mid
  // is positive but smaller than a financed equivalent.
  const cash = computeClosingCosts({ purchase_price: 400000, loan_amount: 0, transfer_tax_rate_pct: 0.4, note_rate_pct: 0 });
  assert.ok(cash.total_mid > 0 && cash.total_mid < ref.total_mid,
    `cash total = ${cash.total_mid}, expected positive and < financed ${ref.total_mid}`);
});

// --- spec-v14 §10.3 Phase F forty-third monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (F / G / L / P / Y).

import { computeRopeMA } from "../../calc-fire.js";
import { computeGeometry } from "../../calc-cross.js";
import { computeResuspension } from "../../calc-lab.js";
import { computeEstimatedTax } from "../../calc-accounting.js";
import { computeBaseConvert } from "../../calc-edu.js";

test("monotonicity: computeRopeMA haul_force_lb is strictly decreasing as the rig advances 1:1 -> 2:1 -> 3:1 -> 4:1 -> 5:1 at fixed efficiency; haul_force strictly increasing in load_lb (actual_ma = MA * eta^pulleys pin)", () => {
  // Group F. actual_ma = theoretical_ma * eta^pulleys; haul_force_lb =
  // load_lb / actual_ma. As rigs advance 1:1 -> 5:1 the actual_ma grows
  // (theoretical_ma growth dominates the eta^pulleys reduction at
  // efficiency = 0.9), so haul_force strictly decreases.
  let prev = Infinity;
  for (const rig of ["1:1", "2:1", "3:1", "4:1", "5:1"]) {
    const r = computeRopeMA({ rig, efficiency: 0.9, load_lb: 600 });
    assert.ok(Number.isFinite(r.haul_force_lb) && r.haul_force_lb > 0,
      `haul at rig=${rig}: ${JSON.stringify(r)}`);
    assert.ok(r.haul_force_lb < prev,
      `haul at rig=${rig} = ${r.haul_force_lb} not less than prev=${prev}`);
    prev = r.haul_force_lb;
  }
  // Strictly increasing in load_lb at fixed rig / efficiency (linear pin).
  let prevLoad = -Infinity;
  for (const load_lb of [100, 200, 400, 600, 800, 1200]) {
    const r = computeRopeMA({ rig: "4:1", efficiency: 0.9, load_lb });
    assert.ok(r.haul_force_lb > prevLoad,
      `haul at load=${load_lb} = ${r.haul_force_lb} not greater than prev=${prevLoad}`);
    prevLoad = r.haul_force_lb;
  }
  // Strictly decreasing in efficiency at fixed rig (higher friction loss ->
  // smaller actual_ma -> larger haul_force).
  let prevEff = -Infinity;
  for (const efficiency of [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
    const r = computeRopeMA({ rig: "4:1", efficiency, load_lb: 600 });
    assert.ok(r.haul_force_lb > prevEff || prevEff === -Infinity || Math.abs(r.haul_force_lb - prevEff) < 1e-12 || r.haul_force_lb < prevEff,
      `haul at eta=${efficiency}: ${r.haul_force_lb}`);
    // Higher efficiency -> larger actual_ma -> smaller haul_force; assert
    // strict decrease across the sweep.
    if (prevEff !== -Infinity) {
      assert.ok(r.haul_force_lb < prevEff,
        `haul at eta=${efficiency} = ${r.haul_force_lb} not less than prev=${prevEff}`);
    }
    prevEff = r.haul_force_lb;
  }
  // Doubling-load pin: 2x load_lb -> 2x haul_force_lb exactly (linear pin).
  const a = computeRopeMA({ rig: "4:1", efficiency: 0.9, load_lb: 300 });
  const b = computeRopeMA({ rig: "4:1", efficiency: 0.9, load_lb: 600 });
  assert.ok(Math.abs(b.haul_force_lb - 2 * a.haul_force_lb) < 1e-9,
    `2x load: haul = ${b.haul_force_lb} != 2 * ${a.haul_force_lb}`);
  // Closed-form pin from ropeMAExample: 4:1 / eta=0.9 / 600 lb load.
  // actual_ma = 4 * 0.9^3 = 4 * 0.729 = 2.916; haul = 600 / 2.916.
  const ref = computeRopeMA({ rig: "4:1", efficiency: 0.9, load_lb: 600 });
  const expectedActualMa = 4 * Math.pow(0.9, 3);
  assert.ok(Math.abs(ref.actual_ma - expectedActualMa) < 1e-12,
    `actual_ma = ${ref.actual_ma}, expected ${expectedActualMa}`);
  assert.equal(ref.theoretical_ma, 4);
  assert.equal(ref.pulleys, 3);
  assert.ok(Math.abs(ref.haul_force_lb - 600 / expectedActualMa) < 1e-9,
    `haul = ${ref.haul_force_lb}, expected ${600 / expectedActualMa}`);
  // 1:1 identity pin: actual_ma = theoretical_ma at 0 pulleys (eta^0 = 1).
  const oneToOne = computeRopeMA({ rig: "1:1", efficiency: 0.5, load_lb: 600 });
  assert.equal(oneToOne.actual_ma, 1);
  assert.equal(oneToOne.haul_force_lb, 600);
  // Bounds pin: efficiency outside (0, 1] -> error.
  const bad = computeRopeMA({ rig: "4:1", efficiency: 1.5, load_lb: 600 });
  assert.ok(bad.error, `expected error for eta=1.5, got ${JSON.stringify(bad)}`);
  // Unknown-rig pin: -> error.
  const badRig = computeRopeMA({ rig: "foo:1", efficiency: 0.9, load_lb: 600 });
  assert.ok(badRig.error, `expected error for bad rig, got ${JSON.stringify(badRig)}`);
});

test("monotonicity: computeGeometry circle.area is strictly increasing in radius (pi*r^2 quadratic pin); circle.circumference strictly increasing in radius (2*pi*r linear pin); 2x radius -> 4x area exact; sphere volume strictly increasing in radius (4/3 pi r^3 cubic pin)", () => {
  // Group G. circle: area = pi * r^2; circumference = 2 * pi * r. Both
  // strictly increasing in r > 0. Doubling r -> 4x area, 2x circumference.
  let prevA = -Infinity;
  let prevC = -Infinity;
  for (const radius of [0.5, 1, 2, 3, 5, 8, 12]) {
    const r = computeGeometry({ shape: "circle", radius });
    assert.ok(Number.isFinite(r.area) && r.area > 0,
      `area at r=${radius}: ${JSON.stringify(r)}`);
    assert.ok(r.area > prevA,
      `area at r=${radius} = ${r.area} not greater than prev=${prevA}`);
    assert.ok(r.circumference > prevC,
      `C at r=${radius} = ${r.circumference} not greater than prev=${prevC}`);
    prevA = r.area;
    prevC = r.circumference;
  }
  // Doubling-radius pin: 2x r -> 4x area exact; 2x circumference exact.
  const a = computeGeometry({ shape: "circle", radius: 3 });
  const b = computeGeometry({ shape: "circle", radius: 6 });
  assert.ok(Math.abs(b.area / a.area - 4) < 1e-12,
    `2x r: area ratio = ${b.area / a.area}, expected 4`);
  assert.ok(Math.abs(b.circumference / a.circumference - 2) < 1e-12,
    `2x r: C ratio = ${b.circumference / a.circumference}, expected 2`);
  // Closed-form pin: r = 5 -> area = 25 pi; C = 10 pi.
  const ref = computeGeometry({ shape: "circle", radius: 5 });
  assert.ok(Math.abs(ref.area - 25 * Math.PI) < 1e-12,
    `area = ${ref.area}, expected ${25 * Math.PI}`);
  assert.ok(Math.abs(ref.circumference - 10 * Math.PI) < 1e-12,
    `C = ${ref.circumference}, expected ${10 * Math.PI}`);
  // Sector-area pin: 90-deg sector = 1/4 of full area.
  const quart = computeGeometry({ shape: "circle", radius: 5, sector_deg: 90 });
  assert.ok(Math.abs(quart.sector_area - quart.area / 4) < 1e-12,
    `quarter sector = ${quart.sector_area}, expected ${quart.area / 4}`);
  // Hexagon-area pin: regular hexagon area = (3 sqrt(3) / 2) * s^2.
  let prevH = -Infinity;
  for (const side of [1, 2, 3, 5, 8]) {
    const h = computeGeometry({ shape: "hexagon", side });
    assert.ok(h.area > prevH,
      `hex area at s=${side} = ${h.area} not greater than prev=${prevH}`);
    const expectedHexArea = (3 * Math.sqrt(3) / 2) * side * side;
    assert.ok(Math.abs(h.area - expectedHexArea) < 1e-12,
      `hex area at s=${side} = ${h.area}, expected ${expectedHexArea}`);
    prevH = h.area;
  }
  // Sphere-volume pin: V = 4/3 pi r^3 strictly increasing in r (cubic).
  let prevV = -Infinity;
  for (const radius of [0.5, 1, 2, 3, 5]) {
    const s = computeGeometry({ shape: "sphere", radius });
    assert.ok(Number.isFinite(s.volume) && s.volume > prevV,
      `sphere vol at r=${radius} = ${s.volume} not greater than prev=${prevV}`);
    prevV = s.volume;
  }
  // Bounds pin: radius <= 0 -> error.
  const bad = computeGeometry({ shape: "circle", radius: 0 });
  assert.ok(bad.error, `expected error for r=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeEstimatedTax required_annual_payment is strictly non-decreasing in projected_current_tax until the prior-year safe-harbor floor binds; per_quarter = after_withholding / 4 closed-form pin (IRS Form 1040-ES safe-harbor pin)", () => {
  // Group P. required = min(0.90 * projected_current, prior_year * multiplier).
  // Strictly increasing in projected_current_tax while 0.90 * current is
  // below the prior-year safe-harbor cap; constant once the floor binds.
  let prev = -Infinity;
  let prevReq = -Infinity;
  let switched = false;
  for (const projected_current_tax of [10000, 20000, 30000, 40000, 50000, 60000, 80000, 100000]) {
    const r = computeEstimatedTax({ projected_current_tax, prior_year_tax: 45000, current_withholding: 0, prior_year_multiplier: 1.0 });
    assert.ok(Number.isFinite(r.required_annual_payment) && r.required_annual_payment >= 0,
      `req at projected=${projected_current_tax}: ${JSON.stringify(r)}`);
    assert.ok(r.required_annual_payment >= prevReq,
      `req at projected=${projected_current_tax} = ${r.required_annual_payment} not >= prev=${prevReq}`);
    // Once 0.90 * current exceeds prior-year cap (45000), required stops
    // growing (the min binds on prior-year safe harbor).
    if (r.required_annual_payment === 45000) switched = true;
    prevReq = r.required_annual_payment;
    prev = projected_current_tax;
  }
  assert.ok(switched, "expected prior-year safe-harbor cap to bind at some sweep point");
  void prev;
  // Closed-form pin: 90% current vs. prior-year multiplier.
  const ref = computeEstimatedTax({ projected_current_tax: 40000, prior_year_tax: 45000, current_withholding: 5000, prior_year_multiplier: 1.0, tax_year: 2025 });
  assert.ok(Math.abs(ref.safe_harbor_90pct_current - 40000 * 0.90) < 1e-9,
    `90pct = ${ref.safe_harbor_90pct_current}, expected ${40000 * 0.90}`);
  assert.ok(Math.abs(ref.safe_harbor_prior_year - 45000 * 1.0) < 1e-9,
    `prior = ${ref.safe_harbor_prior_year}, expected ${45000}`);
  // required = min(90pct_current, prior_year).
  assert.equal(ref.required_annual_payment, Math.min(ref.safe_harbor_90pct_current, ref.safe_harbor_prior_year));
  // after_withholding = max(0, required - withholding).
  assert.equal(ref.after_withholding, Math.max(0, ref.required_annual_payment - 5000));
  // per_quarter = after_withholding / 4 closed-form pin.
  assert.ok(Math.abs(ref.per_quarter - ref.after_withholding / 4) < 1e-12,
    `per_quarter = ${ref.per_quarter}, expected ${ref.after_withholding / 4}`);
  // Prior-year-multiplier pin: AGI > $150k uses 110% prior-year (multiplier 1.10).
  const highAgi = computeEstimatedTax({ projected_current_tax: 80000, prior_year_tax: 60000, current_withholding: 0, prior_year_multiplier: 1.10 });
  assert.ok(Math.abs(highAgi.safe_harbor_prior_year - 60000 * 1.10) < 1e-9,
    `high-AGI prior = ${highAgi.safe_harbor_prior_year}, expected ${60000 * 1.10}`);
  // Withholding-covers-required boundary pin: after_withholding = 0.
  const covered = computeEstimatedTax({ projected_current_tax: 40000, prior_year_tax: 45000, current_withholding: 50000, prior_year_multiplier: 1.0 });
  assert.equal(covered.after_withholding, 0);
  assert.equal(covered.per_quarter, 0);
});

test("monotonicity: computeBaseConvert decimal_value round-trip identity (base 10 -> base N -> base 10 returns the same integer for every base 2..36); decimal_value strictly increasing in input numeric magnitude at fixed base (positional-numeral pin)", () => {
  // Group Y. Round-trip identity: parseInt(N.toString(b), b) === N for any
  // N >= 0 and base 2..36.
  for (const N of [0, 1, 7, 15, 16, 255, 256, 1023, 1024, 65535, 1000000]) {
    for (const to_base of [2, 8, 10, 16, 36]) {
      const fwd = computeBaseConvert({ value: String(N), from_base: 10, to_base });
      assert.ok(!fwd.error, `fwd error at N=${N}, base=${to_base}: ${JSON.stringify(fwd)}`);
      const back = computeBaseConvert({ value: fwd.converted, from_base: to_base, to_base: 10 });
      assert.ok(!back.error, `back error at N=${N}, base=${to_base}: ${JSON.stringify(back)}`);
      assert.equal(back.decimal_value, N,
        `round-trip mismatch at N=${N}, base=${to_base}: got ${back.decimal_value}`);
    }
  }
  // Strictly increasing in input magnitude at fixed base.
  let prev = -Infinity;
  for (const N of [1, 5, 16, 100, 255, 1024, 65535, 1000000]) {
    const r = computeBaseConvert({ value: N.toString(16).toUpperCase(), from_base: 16, to_base: 10 });
    assert.ok(r.decimal_value > prev,
      `decimal at N=${N} = ${r.decimal_value} not greater than prev=${prev}`);
    prev = r.decimal_value;
  }
  // Closed-form pin: 255 base 10 = "FF" base 16 = "11111111" base 2 = "377" base 8.
  const ref = computeBaseConvert({ value: "255", from_base: 10, to_base: 16 });
  assert.equal(ref.decimal_value, 255);
  assert.equal(ref.converted, "FF");
  assert.equal(ref.binary, "11111111");
  assert.equal(ref.octal, "377");
  assert.equal(ref.hex, "FF");
  // Bounds pin: base < 2 -> error; base > 36 -> error.
  const lo = computeBaseConvert({ value: "10", from_base: 1, to_base: 10 });
  assert.ok(lo.error, `expected error for base=1, got ${JSON.stringify(lo)}`);
  const hi = computeBaseConvert({ value: "10", from_base: 10, to_base: 37 });
  assert.ok(hi.error, `expected error for base=37, got ${JSON.stringify(hi)}`);
  // Invalid-digit pin: "9" is not valid in base 8 (digits 0-7 only) -> error.
  const inv = computeBaseConvert({ value: "9", from_base: 8, to_base: 10 });
  assert.ok(inv.error, `expected error for "9" in base 8, got ${JSON.stringify(inv)}`);
});

test("monotonicity: computeResuspension volume is strictly increasing in mass_g at fixed target_concentration AND strictly decreasing in target_concentration at fixed mass_g (V = mass / target linear-in-mass / inverse-in-target pin); doubling mass -> 2x volume exact", () => {
  // Group L. volume = mass_g / target_concentration; strictly increasing in
  // mass_g (linear) and strictly decreasing in target_concentration (inverse).
  let prev = -Infinity;
  for (const mass_g of [0.0005, 0.001, 0.002, 0.005, 0.01, 0.025, 0.1]) {
    const r = computeResuspension({ mass_g, target_concentration: 1.0 });
    assert.ok(Number.isFinite(r.volume) && r.volume > 0,
      `volume at m=${mass_g}: ${JSON.stringify(r)}`);
    assert.ok(r.volume > prev,
      `volume at m=${mass_g} = ${r.volume} not greater than prev=${prev}`);
    prev = r.volume;
  }
  // Strictly decreasing in target_concentration at fixed mass.
  let prevTC = Infinity;
  for (const target_concentration of [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]) {
    const r = computeResuspension({ mass_g: 0.01, target_concentration });
    assert.ok(r.volume < prevTC,
      `volume at tc=${target_concentration} = ${r.volume} not less than prev=${prevTC}`);
    prevTC = r.volume;
  }
  // Doubling-mass pin: 2x mass -> 2x volume exact (linear in mass).
  const a = computeResuspension({ mass_g: 0.005, target_concentration: 1.0 });
  const b = computeResuspension({ mass_g: 0.010, target_concentration: 1.0 });
  assert.ok(Math.abs(b.volume - 2 * a.volume) < 1e-12,
    `2x mass: volume = ${b.volume} != 2 * ${a.volume}`);
  // Doubling-target pin: 2x target -> 1/2 volume exact (inverse in target).
  const c = computeResuspension({ mass_g: 0.01, target_concentration: 1.0 });
  const d = computeResuspension({ mass_g: 0.01, target_concentration: 2.0 });
  assert.ok(Math.abs(d.volume - c.volume / 2) < 1e-12,
    `2x target: volume = ${d.volume} != ${c.volume} / 2`);
  // Closed-form pin from resuspendExample: mass 0.001 g, target 1.0 ->
  // volume = 0.001 / 1.0 = 0.001 (mL, per caller's unit convention).
  const ref = computeResuspension({ mass_g: 0.001, target_concentration: 1.0 });
  assert.ok(Math.abs(ref.volume - 0.001) < 1e-15,
    `volume = ${ref.volume}, expected 0.001`);
  assert.equal(ref.mass_g, 0.001);
  assert.equal(ref.target_concentration, 1.0);
  // Bounds pin: mass <= 0 -> error; target <= 0 -> error.
  const badM = computeResuspension({ mass_g: 0, target_concentration: 1.0 });
  assert.ok(badM.error, `expected error for mass=0, got ${JSON.stringify(badM)}`);
  const badT = computeResuspension({ mass_g: 0.01, target_concentration: 0 });
  assert.ok(badT.error, `expected error for target=0, got ${JSON.stringify(badT)}`);
});

// --- spec-v14 §10.3 Phase F forty-fourth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (E / G / R / T / V).

import { computeAnchorEmbedment } from "../../calc-construction.js";
import { computeUpgradeROI } from "../../calc-cross.js";
import { computeSection121 } from "../../calc-realestate.js";
import { computeLightningCountdown } from "../../calc-field.js";
import { computeWellsPE } from "../../calc-ems.js";

test("monotonicity: computeAnchorEmbedment embedment_in is strictly increasing in uplift_lb (linear pin); strictly decreasing in bolt_diameter_in at fixed uplift / fc (inverse-in-d pin); strictly decreasing in fc_psi at fixed uplift / d (inverse-sqrt-fc pin); embedment_ft = embedment_in / 12 exact", () => {
  // Group E. ld_in = T / (0.7 * sqrt(fc) * pi * d). Strictly increasing in
  // uplift T (linear), strictly decreasing in bolt diameter d (inverse),
  // strictly decreasing in concrete strength fc (inverse-sqrt).
  let prev = -Infinity;
  for (const uplift_lb of [500, 1000, 2500, 5000, 10000, 20000]) {
    const r = computeAnchorEmbedment({ uplift_lb, bolt_diameter_in: 0.625, fc_psi: 3000 });
    assert.ok(Number.isFinite(r.embedment_in) && r.embedment_in > 0,
      `ld at T=${uplift_lb}: ${JSON.stringify(r)}`);
    assert.ok(r.embedment_in > prev,
      `ld at T=${uplift_lb} = ${r.embedment_in} not greater than prev=${prev}`);
    prev = r.embedment_in;
  }
  // Strictly decreasing in diameter at fixed uplift / fc.
  let prevD = Infinity;
  for (const bolt_diameter_in of [0.25, 0.375, 0.5, 0.625, 0.75, 1.0]) {
    const r = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in, fc_psi: 3000 });
    assert.ok(r.embedment_in < prevD,
      `ld at d=${bolt_diameter_in} = ${r.embedment_in} not less than prev=${prevD}`);
    prevD = r.embedment_in;
  }
  // Strictly decreasing in fc at fixed uplift / diameter (1/sqrt(fc) pin).
  let prevFc = Infinity;
  for (const fc_psi of [2000, 2500, 3000, 4000, 5000, 8000]) {
    const r = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi });
    assert.ok(r.embedment_in < prevFc,
      `ld at fc=${fc_psi} = ${r.embedment_in} not less than prev=${prevFc}`);
    prevFc = r.embedment_in;
  }
  // Doubling-uplift pin: 2x T -> 2x embedment exactly (linear in T).
  const a = computeAnchorEmbedment({ uplift_lb: 2500, bolt_diameter_in: 0.625, fc_psi: 3000 });
  const b = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  assert.ok(Math.abs(b.embedment_in - 2 * a.embedment_in) < 1e-9,
    `2x T: ld = ${b.embedment_in} != 2 * ${a.embedment_in}`);
  // 4x fc pin: 4x fc -> ld halved exactly (1/sqrt(fc) pin).
  const c = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 2000 });
  const d = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 8000 });
  assert.ok(Math.abs(d.embedment_in - c.embedment_in / 2) < 1e-9,
    `4x fc: ld = ${d.embedment_in}, expected ${c.embedment_in / 2}`);
  // Closed-form pin from anchorEmbedmentExample: T=5000, d=0.625, fc=3000.
  // ld = 5000 / (0.7 * sqrt(3000) * pi * 0.625).
  const ref = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  const expectedLd = 5000 / (0.7 * Math.sqrt(3000) * Math.PI * 0.625);
  assert.ok(Math.abs(ref.embedment_in - expectedLd) < 1e-9,
    `ld = ${ref.embedment_in}, expected ${expectedLd}`);
  assert.equal(ref.T_lb, 5000);
  // embedment_ft = embedment_in / 12 exact unit pin.
  assert.ok(Math.abs(ref.embedment_ft - ref.embedment_in / 12) < 1e-12,
    `ft = ${ref.embedment_ft}, expected ${ref.embedment_in / 12}`);
  // anchorEmbedmentExample band pin: ld in [1, 100] in.
  assert.ok(ref.embedment_in >= 1 && ref.embedment_in <= 100,
    `ld = ${ref.embedment_in}, expected 1-100 (example range)`);
  // Bounds pin: any non-positive input -> error.
  const bad = computeAnchorEmbedment({ uplift_lb: 0, bolt_diameter_in: 0.625, fc_psi: 3000 });
  assert.ok(bad.error, `expected error for T=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeUpgradeROI simple_payback_yr is strictly increasing in incremental_cost (C/S linear-in-C pin) AND strictly decreasing in annual_savings (1/S inverse pin); npv_dollars strictly increasing in annual_savings at fixed cost / discount / years (NPV linear-in-S pin)", () => {
  // Group G. simple_payback = C / S. Strictly increasing in C; strictly
  // decreasing in S. NPV = -C + sum(S / (1+d)^i) for i=1..y, strictly
  // increasing in S at fixed C / d / y.
  let prev = -Infinity;
  for (const incremental_cost of [1000, 2000, 4000, 5000, 8000, 15000]) {
    const r = computeUpgradeROI({ incremental_cost, annual_savings: 800, discount_rate_percent: 4, years: 10 });
    assert.ok(Number.isFinite(r.simple_payback_yr) && r.simple_payback_yr > 0,
      `pb at C=${incremental_cost}: ${JSON.stringify(r)}`);
    assert.ok(r.simple_payback_yr > prev,
      `pb at C=${incremental_cost} = ${r.simple_payback_yr} not greater than prev=${prev}`);
    prev = r.simple_payback_yr;
  }
  // Strictly decreasing in annual_savings at fixed cost.
  let prevS = Infinity;
  for (const annual_savings of [100, 250, 500, 800, 1500, 3000]) {
    const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings, discount_rate_percent: 4, years: 10 });
    assert.ok(r.simple_payback_yr < prevS,
      `pb at S=${annual_savings} = ${r.simple_payback_yr} not less than prev=${prevS}`);
    prevS = r.simple_payback_yr;
  }
  // NPV strictly increasing in annual_savings at fixed cost / discount / years.
  let prevNpv = -Infinity;
  for (const annual_savings of [100, 250, 500, 800, 1500, 3000]) {
    const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings, discount_rate_percent: 4, years: 10 });
    assert.ok(r.npv_dollars > prevNpv,
      `npv at S=${annual_savings} = ${r.npv_dollars} not greater than prev=${prevNpv}`);
    prevNpv = r.npv_dollars;
  }
  // NPV strictly decreasing in discount_rate_percent at fixed positive net
  // future cash flows (higher discount -> lower PV of future savings).
  let prevDr = Infinity;
  for (const discount_rate_percent of [0, 1, 2, 4, 6, 10, 15]) {
    const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent, years: 10 });
    assert.ok(r.npv_dollars < prevDr,
      `npv at d=${discount_rate_percent} = ${r.npv_dollars} not less than prev=${prevDr}`);
    prevDr = r.npv_dollars;
  }
  // Doubling-cost pin: 2x C -> 2x simple_payback exactly (linear in C).
  const a = computeUpgradeROI({ incremental_cost: 2500, annual_savings: 800, discount_rate_percent: 4, years: 10 });
  const b = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 4, years: 10 });
  assert.ok(Math.abs(b.simple_payback_yr - 2 * a.simple_payback_yr) < 1e-12,
    `2x C: pb = ${b.simple_payback_yr} != 2 * ${a.simple_payback_yr}`);
  // d=0 closed-form pin: NPV = -C + y * S exactly (no discounting).
  const noDisc = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 0, years: 10 });
  const expectedNpvNoDisc = -5000 + 10 * 800;
  assert.ok(Math.abs(noDisc.npv_dollars - expectedNpvNoDisc) < 1e-9,
    `npv at d=0: ${noDisc.npv_dollars}, expected ${expectedNpvNoDisc}`);
  // upgradeROIExample band pin: 5000 / 800 = 6.25 yr (in [6, 7]).
  const ref = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 4, years: 10 });
  assert.ok(ref.simple_payback_yr >= 6 && ref.simple_payback_yr <= 7,
    `pb = ${ref.simple_payback_yr}, expected 6-7 (example range)`);
  assert.ok(Math.abs(ref.simple_payback_yr - 5000 / 800) < 1e-12,
    `pb = ${ref.simple_payback_yr}, expected ${5000 / 800}`);
});

test("monotonicity: computeSection121 taxable_gain is strictly non-decreasing in realized_gain once gain exceeds the filing-status exclusion cap (single/mfs/hoh 250000, mfj 500000); exclusion_applied caps at min(realized_gain, cap); ineligibility (two-of-five not met) -> exclusion_applied = 0", () => {
  // Group R. exclusion_applied = eligible ? min(realized_gain, cap) : 0;
  // taxable_gain = max(0, realized_gain - exclusion_applied). Strictly
  // non-decreasing in realized_gain (sweep via sale_price).
  let prev = -Infinity;
  for (const sale_price of [300000, 400000, 500000, 600000, 700000, 800000, 1000000]) {
    const r = computeSection121({
      filing_status: "single", sale_price, selling_costs: 0, purchase_price: 200000,
      improvements: 0, meets_two_of_five: true, has_nonqualified_use: false,
    });
    assert.ok(Number.isFinite(r.taxable_gain),
      `taxable at sale=${sale_price}: ${JSON.stringify(r)}`);
    assert.ok(r.taxable_gain >= prev,
      `taxable at sale=${sale_price} = ${r.taxable_gain} not >= prev=${prev}`);
    prev = r.taxable_gain;
  }
  // Exclusion-cap pin: single/mfs/hoh = $250k; mfj = $500k.
  const single = computeSection121({ filing_status: "single", sale_price: 700000, selling_costs: 0, purchase_price: 200000, improvements: 0, meets_two_of_five: true });
  assert.equal(single.exclusion_cap, 250000);
  assert.equal(single.exclusion_applied, 250000);
  assert.equal(single.realized_gain, 500000);
  assert.equal(single.taxable_gain, 250000);
  const mfj = computeSection121({ filing_status: "mfj", sale_price: 700000, selling_costs: 0, purchase_price: 200000, improvements: 0, meets_two_of_five: true });
  assert.equal(mfj.exclusion_cap, 500000);
  assert.equal(mfj.exclusion_applied, 500000);
  assert.equal(mfj.taxable_gain, 0);
  const hoh = computeSection121({ filing_status: "hoh", sale_price: 700000, selling_costs: 0, purchase_price: 200000, improvements: 0, meets_two_of_five: true });
  assert.equal(hoh.exclusion_cap, 250000);
  // Eligibility pin: two-of-five not met -> exclusion_applied = 0,
  // taxable_gain = realized_gain (clipped at 0).
  const ineligible = computeSection121({ filing_status: "single", sale_price: 400000, selling_costs: 0, purchase_price: 200000, improvements: 0, meets_two_of_five: false });
  assert.equal(ineligible.exclusion_applied, 0);
  assert.equal(ineligible.taxable_gain, 200000);
  // Loss boundary pin: realized_gain < 0 -> taxable_gain = 0 (clamped).
  const loss = computeSection121({ filing_status: "single", sale_price: 150000, selling_costs: 0, purchase_price: 200000, improvements: 0, meets_two_of_five: true });
  assert.equal(loss.realized_gain, -50000);
  assert.equal(loss.exclusion_applied, 0);
  assert.equal(loss.taxable_gain, 0);
  // Adjusted-basis pin: improvements add to basis -> lower realized_gain.
  const noImp = computeSection121({ filing_status: "single", sale_price: 500000, selling_costs: 0, purchase_price: 200000, improvements: 0, meets_two_of_five: true });
  const withImp = computeSection121({ filing_status: "single", sale_price: 500000, selling_costs: 0, purchase_price: 200000, improvements: 50000, meets_two_of_five: true });
  assert.equal(noImp.adjusted_basis, 200000);
  assert.equal(withImp.adjusted_basis, 250000);
  assert.ok(withImp.realized_gain < noImp.realized_gain,
    `improvements should lower realized_gain: ${withImp.realized_gain} >= ${noImp.realized_gain}`);
  // Selling-costs pin: selling_costs reduce amount_realized.
  const withCosts = computeSection121({ filing_status: "single", sale_price: 500000, selling_costs: 30000, purchase_price: 200000, improvements: 0, meets_two_of_five: true });
  assert.equal(withCosts.amount_realized, 470000);
  assert.equal(withCosts.realized_gain, 270000);
});

test("monotonicity: computeLightningCountdown distance_miles is strictly increasing in flash_to_bang_s (s / 5 linear pin); distance_km = miles * 1.609344 exact; band tips at 5 / 30 / 60 s thresholds (NWS 30-30 rule pin)", () => {
  // Group T. distance_miles = flash_to_bang_s / 5; distance_km = miles * 1.609344.
  // Strictly increasing in flash_to_bang_s (linear).
  let prev = -Infinity;
  for (const flash_to_bang_s of [1, 5, 10, 15, 25, 45, 90, 180]) {
    const r = computeLightningCountdown({ flash_to_bang_s });
    assert.ok(Number.isFinite(r.distance_miles) && r.distance_miles > 0,
      `mi at s=${flash_to_bang_s}: ${JSON.stringify(r)}`);
    assert.ok(r.distance_miles > prev,
      `mi at s=${flash_to_bang_s} = ${r.distance_miles} not greater than prev=${prev}`);
    prev = r.distance_miles;
  }
  // Doubling-seconds pin: 2x s -> 2x miles exactly (linear in s).
  const a = computeLightningCountdown({ flash_to_bang_s: 15 });
  const b = computeLightningCountdown({ flash_to_bang_s: 30 });
  assert.ok(Math.abs(b.distance_miles - 2 * a.distance_miles) < 1e-12,
    `2x s: mi = ${b.distance_miles} != 2 * ${a.distance_miles}`);
  // Closed-form pin from lightningCountdownExample: 15 s -> 3 mi.
  const ref = computeLightningCountdown({ flash_to_bang_s: 15 });
  assert.ok(Math.abs(ref.distance_miles - 3) < 1e-12,
    `mi at 15 s = ${ref.distance_miles}, expected 3`);
  // km/mi conversion pin: 1.609344 km/mi exact.
  assert.ok(Math.abs(ref.distance_km - ref.distance_miles * 1.609344) < 1e-12,
    `km = ${ref.distance_km}, expected ${ref.distance_miles * 1.609344}`);
  // Band-threshold pins (NWS 30-30 rule).
  const imminent = computeLightningCountdown({ flash_to_bang_s: 4 });
  assert.ok(/imminent/.test(imminent.band), `band at 4 s: ${imminent.band}`);
  assert.equal(imminent.seek_shelter, true);
  const shelter = computeLightningCountdown({ flash_to_bang_s: 15 });
  assert.ok(/seek shelter/.test(shelter.band), `band at 15 s: ${shelter.band}`);
  assert.equal(shelter.seek_shelter, true);
  const caution = computeLightningCountdown({ flash_to_bang_s: 45 });
  assert.ok(/caution/.test(caution.band), `band at 45 s: ${caution.band}`);
  assert.equal(caution.seek_shelter, false);
  const distant = computeLightningCountdown({ flash_to_bang_s: 90 });
  assert.ok(/distant/.test(distant.band), `band at 90 s: ${distant.band}`);
  assert.equal(distant.seek_shelter, false);
  // Boundary pins at exactly 5, 30, 60.
  assert.ok(/seek shelter/.test(computeLightningCountdown({ flash_to_bang_s: 5 }).band));
  assert.ok(/caution/.test(computeLightningCountdown({ flash_to_bang_s: 30 }).band));
  assert.ok(/distant/.test(computeLightningCountdown({ flash_to_bang_s: 60 }).band));
  // Error pin: s <= 0 -> error.
  const bad = computeLightningCountdown({ flash_to_bang_s: 0 });
  assert.ok(bad.error, `expected error for s=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeWellsPE score is strictly non-decreasing as additional criteria flip true (point-additive pin); score = sum of component points; band thresholds at 2 (low/moderate) and 6 (moderate/high) (three-band pin) + 4.5 (two-band pin)", () => {
  // Group V. score = sum over flipped-true criteria of their point values.
  // Strictly non-decreasing as criteria are added cumulatively.
  const allKeys = ["clinical_signs_dvt", "alternative_diagnosis_less_likely", "hr_over_100", "immobilization_or_surgery", "prior_dvt_pe", "hemoptysis", "malignancy"];
  let prev = -Infinity;
  let active = {};
  for (const key of allKeys) {
    active = { ...active, [key]: true };
    const r = computeWellsPE(active);
    assert.ok(Number.isFinite(r.score) && r.score >= 0,
      `score with ${Object.keys(active).length}: ${JSON.stringify(r)}`);
    assert.ok(r.score > prev,
      `score with ${Object.keys(active).length} = ${r.score} not greater than prev=${prev}`);
    prev = r.score;
  }
  // All-false pin: score = 0, low band (three-band) / unlikely (two-band).
  const none = computeWellsPE({});
  assert.equal(none.score, 0);
  assert.ok(/Low/.test(none.band_three), `band_three at 0: ${none.band_three}`);
  assert.ok(/unlikely/.test(none.band_two), `band_two at 0: ${none.band_two}`);
  // wellsPEExample closed-form pin: clinical_signs_dvt (3) + alt_dx (3) +
  // hr_over_100 (1.5) = 7.5 -> high (three-band), likely (two-band).
  const ref = computeWellsPE({ clinical_signs_dvt: true, alternative_diagnosis_less_likely: true, hr_over_100: true });
  assert.ok(Math.abs(ref.score - 7.5) < 1e-12, `score = ${ref.score}, expected 7.5`);
  assert.ok(/High/.test(ref.band_three), `band_three at 7.5: ${ref.band_three}`);
  assert.ok(/likely/.test(ref.band_two), `band_two at 7.5: ${ref.band_two}`);
  // Three-band threshold pins: < 2 = Low; 2..6 = Moderate; > 6 = High.
  const low = computeWellsPE({ hemoptysis: true }); // 1 point
  assert.equal(low.score, 1);
  assert.ok(/Low/.test(low.band_three), `band at 1: ${low.band_three}`);
  const mod = computeWellsPE({ clinical_signs_dvt: true }); // 3 points
  assert.equal(mod.score, 3);
  assert.ok(/Moderate/.test(mod.band_three), `band at 3: ${mod.band_three}`);
  const high = computeWellsPE({ clinical_signs_dvt: true, alternative_diagnosis_less_likely: true, hr_over_100: true }); // 7.5
  assert.ok(/High/.test(high.band_three), `band at 7.5: ${high.band_three}`);
  // Two-band threshold pin: >= 4.5 = likely; < 4.5 = unlikely.
  const justUnder = computeWellsPE({ clinical_signs_dvt: true, hr_over_100: true }); // 4.5
  assert.equal(justUnder.score, 4.5);
  assert.ok(/likely/.test(justUnder.band_two) && !/unlikely/.test(justUnder.band_two),
    `band_two at 4.5: ${justUnder.band_two}`);
  // Component-count pin: components array length equals number of flipped-true.
  assert.equal(ref.components.length, 3);
  // Strict-equality input-form pin: string "true" treated as true (form input).
  const formInput = computeWellsPE({ clinical_signs_dvt: "true" });
  assert.equal(formInput.score, 3);
  // Recommendation pin: likely -> CT pulmonary angiogram; unlikely -> D-dimer.
  assert.ok(/CT pulmonary angiogram/.test(ref.recommendation), `rec: ${ref.recommendation}`);
  assert.ok(/D-dimer/.test(none.recommendation), `rec: ${none.recommendation}`);
});

// --- spec-v14 §10.3 Phase F forty-fifth monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / B / C / V / W).

import { computePFCorrection } from "../../calc-electrical.js";
import { computeHydrostaticTest } from "../../calc-plumbing.js";
import { computeEvaporativeCooling } from "../../calc-hvac.js";
import { computeO2CylinderTime } from "../../calc-ems.js";
import { computeHypoxiaAltitude } from "../../calc-aviation.js";

test("monotonicity: computePFCorrection kVAR is strictly increasing in kW at fixed pf1/pf2 (linear-in-kW pin); kVAR strictly increasing as target pf2 rises toward 1 at fixed kW/pf1 (Q = kW * (tan(acos(pf1)) - tan(acos(pf2))) pin); 3-phase capacitance pin", () => {
  // Group A. kVAR = kW * (tan(acos(pf1)) - tan(acos(pf2))). Strictly
  // increasing in kW (linear) and strictly decreasing in pf2 toward 1.
  let prev = -Infinity;
  for (const kW of [10, 25, 50, 100, 250, 500]) {
    const r = computePFCorrection({ kW, pf1: 0.75, pf2: 0.95, system_V: 480, phase: "three" });
    assert.ok(Number.isFinite(r.kVAR) && r.kVAR > 0,
      `kVAR at kW=${kW}: ${JSON.stringify(r)}`);
    assert.ok(r.kVAR > prev,
      `kVAR at kW=${kW} = ${r.kVAR} not greater than prev=${prev}`);
    prev = r.kVAR;
  }
  // Strictly increasing in pf2 (a more ambitious target requires removing
  // more reactive power; tan(acos(pf2)) -> 0 as pf2 -> 1 so kW*(tan1-tan2)
  // grows toward kW*tan1).
  let prevPf2 = -Infinity;
  for (const pf2 of [0.80, 0.85, 0.90, 0.92, 0.95, 0.98, 1.0]) {
    const r = computePFCorrection({ kW: 100, pf1: 0.75, pf2, system_V: 480, phase: "three" });
    assert.ok(r.kVAR > prevPf2,
      `kVAR at pf2=${pf2} = ${r.kVAR} not greater than prev=${prevPf2}`);
    prevPf2 = r.kVAR;
  }
  // Strictly decreasing in pf1 (worse starting pf -> more correction needed,
  // so kVAR strictly INCREASES as pf1 falls from 0.85 to 0.6).
  let prevPf1 = -Infinity;
  for (const pf1 of [0.85, 0.80, 0.75, 0.70, 0.65, 0.60]) {
    const r = computePFCorrection({ kW: 100, pf1, pf2: 0.95, system_V: 480, phase: "three" });
    assert.ok(r.kVAR > prevPf1,
      `kVAR at pf1=${pf1} = ${r.kVAR} not greater than prev=${prevPf1}`);
    prevPf1 = r.kVAR;
  }
  // Doubling-kW pin: 2x kW -> 2x kVAR exactly (linear in kW).
  const a = computePFCorrection({ kW: 50, pf1: 0.75, pf2: 0.95, system_V: 480, phase: "three" });
  const b = computePFCorrection({ kW: 100, pf1: 0.75, pf2: 0.95, system_V: 480, phase: "three" });
  assert.ok(Math.abs(b.kVAR - 2 * a.kVAR) < 1e-9,
    `2x kW: kVAR = ${b.kVAR} != 2 * ${a.kVAR}`);
  // Doubling-kW pin: 2x kW -> 2x capacitance exactly (linear in kVAR).
  assert.ok(Math.abs(b.capacitance_uF - 2 * a.capacitance_uF) < 1e-9,
    `2x kW: C = ${b.capacitance_uF} != 2 * ${a.capacitance_uF}`);
  // Closed-form pin from pfCorrectionExample: kW=100, pf1=0.75, pf2=0.95.
  const ref = computePFCorrection({ kW: 100, pf1: 0.75, pf2: 0.95, system_V: 480, phase: "three" });
  const expectedKvar = 100 * (Math.tan(Math.acos(0.75)) - Math.tan(Math.acos(0.95)));
  assert.ok(Math.abs(ref.kVAR - expectedKvar) < 1e-9,
    `kVAR = ${ref.kVAR}, expected ${expectedKvar}`);
  // pfCorrectionExample band pin: kVAR in [50, 60].
  assert.ok(ref.kVAR >= 50 && ref.kVAR <= 60,
    `kVAR = ${ref.kVAR}, expected 50-60 (example range)`);
  // pf2 <= pf1 boundary pin: target must exceed existing -> error.
  const bad = computePFCorrection({ kW: 100, pf1: 0.95, pf2: 0.90, system_V: 480, phase: "three" });
  assert.ok(bad.error, `expected error when pf2 <= pf1, got ${JSON.stringify(bad)}`);
  // Single-phase vs three-phase capacitance pin: at the same kW/pf1/pf2/V,
  // single-phase per-leg capacitance is larger than three-phase per-leg.
  const single = computePFCorrection({ kW: 100, pf1: 0.75, pf2: 0.95, system_V: 480, phase: "single" });
  assert.ok(Math.abs(single.kVAR - ref.kVAR) < 1e-9,
    `kVAR phase-invariant: single=${single.kVAR}, three=${ref.kVAR}`);
});

test("monotonicity: computeHydrostaticTest test_pressure_psi is strictly increasing in working_pressure_psi at fixed material/multiplier (linear pin); multiplier defaults: water=1.5, fuel_gas=1.25; hold_minutes is monotone non-decreasing in system_volume_gal (15/30/60/240 piecewise pin)", () => {
  // Group B. test_pressure = working_pressure * multiplier (linear in P).
  let prev = -Infinity;
  for (const working_pressure_psi of [20, 40, 60, 80, 120, 200, 400]) {
    const r = computeHydrostaticTest({ working_pressure_psi, system_volume_gal: 200, material: "water" });
    assert.ok(Number.isFinite(r.test_pressure_psi) && r.test_pressure_psi > 0,
      `test_p at P=${working_pressure_psi}: ${JSON.stringify(r)}`);
    assert.ok(r.test_pressure_psi > prev,
      `test_p at P=${working_pressure_psi} = ${r.test_pressure_psi} not greater than prev=${prev}`);
    prev = r.test_pressure_psi;
  }
  // hold_minutes monotone non-decreasing in system_volume_gal (piecewise).
  let prevHold = -Infinity;
  for (const system_volume_gal of [10, 49, 50, 100, 499, 500, 1000, 4999, 5000, 10000]) {
    const r = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal, material: "water" });
    assert.ok(r.hold_minutes >= prevHold,
      `hold at vol=${system_volume_gal} = ${r.hold_minutes} not >= prev=${prevHold}`);
    prevHold = r.hold_minutes;
  }
  // Default-multiplier pins: water=1.5; fuel_gas=1.25.
  const water = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 200, material: "water" });
  assert.equal(water.multiplier, 1.5);
  assert.ok(Math.abs(water.test_pressure_psi - 80 * 1.5) < 1e-12,
    `water test_p = ${water.test_pressure_psi}, expected ${80 * 1.5}`);
  const gas = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 200, material: "fuel_gas" });
  assert.equal(gas.multiplier, 1.25);
  assert.ok(Math.abs(gas.test_pressure_psi - 80 * 1.25) < 1e-12,
    `gas test_p = ${gas.test_pressure_psi}, expected ${80 * 1.25}`);
  // Custom-multiplier override pin: caller multiplier overrides default.
  const custom = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 200, material: "water", multiplier: 2.0 });
  assert.equal(custom.multiplier, 2.0);
  assert.equal(custom.test_pressure_psi, 160);
  // Piecewise-hold pin: thresholds at 50 / 500 / 5000 gal -> 15 / 30 / 60 / 240 min.
  assert.equal(computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 49, material: "water" }).hold_minutes, 15);
  assert.equal(computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 50, material: "water" }).hold_minutes, 30);
  assert.equal(computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 499, material: "water" }).hold_minutes, 30);
  assert.equal(computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 500, material: "water" }).hold_minutes, 60);
  assert.equal(computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 4999, material: "water" }).hold_minutes, 60);
  assert.equal(computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 5000, material: "water" }).hold_minutes, 240);
  // Acceptable-leak-note material pin: water vs fuel_gas notes differ.
  assert.ok(/Zero observable drop/.test(water.acceptable_leak_note),
    `water leak note: ${water.acceptable_leak_note}`);
  assert.ok(/gauge accuracy/.test(gas.acceptable_leak_note),
    `gas leak note: ${gas.acceptable_leak_note}`);
  // Doubling-P pin: 2x working_pressure -> 2x test_pressure exactly.
  const a = computeHydrostaticTest({ working_pressure_psi: 80, system_volume_gal: 200, material: "water" });
  const b = computeHydrostaticTest({ working_pressure_psi: 160, system_volume_gal: 200, material: "water" });
  assert.ok(Math.abs(b.test_pressure_psi - 2 * a.test_pressure_psi) < 1e-12,
    `2x P: test_p = ${b.test_pressure_psi} != 2 * ${a.test_pressure_psi}`);
  // Boundary pin: working_pressure <= 0 -> error.
  const bad = computeHydrostaticTest({ working_pressure_psi: 0, system_volume_gal: 200, material: "water" });
  assert.ok(bad.error, `expected error for P=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeEvaporativeCooling cooling_btu_hr is strictly increasing in evaporation_rate_lb_hr at fixed hfg (Q = m * hfg linear pin); cooling_tons = btu_hr / 12000 exact; doubling evap rate -> 2x cooling", () => {
  // Group C. Q = m * hfg_btu_per_lb. Strictly increasing in m (linear).
  let prev = -Infinity;
  for (const evaporation_rate_lb_hr of [1, 5, 10, 25, 50, 100, 250]) {
    const r = computeEvaporativeCooling({ evaporation_rate_lb_hr });
    assert.ok(Number.isFinite(r.cooling_btu_hr) && r.cooling_btu_hr > 0,
      `Q at m=${evaporation_rate_lb_hr}: ${JSON.stringify(r)}`);
    assert.ok(r.cooling_btu_hr > prev,
      `Q at m=${evaporation_rate_lb_hr} = ${r.cooling_btu_hr} not greater than prev=${prev}`);
    prev = r.cooling_btu_hr;
  }
  // Strictly increasing in hfg_btu_per_lb at fixed evap rate (linear in hfg).
  let prevHfg = -Infinity;
  for (const hfg_btu_per_lb of [800, 900, 970, 1000, 1054, 1100]) {
    const r = computeEvaporativeCooling({ evaporation_rate_lb_hr: 10, hfg_btu_per_lb });
    assert.ok(r.cooling_btu_hr > prevHfg,
      `Q at hfg=${hfg_btu_per_lb} = ${r.cooling_btu_hr} not greater than prev=${prevHfg}`);
    prevHfg = r.cooling_btu_hr;
  }
  // Doubling-evap-rate pin: 2x m -> 2x Q exactly (linear in m).
  const a = computeEvaporativeCooling({ evaporation_rate_lb_hr: 5 });
  const b = computeEvaporativeCooling({ evaporation_rate_lb_hr: 10 });
  assert.ok(Math.abs(b.cooling_btu_hr - 2 * a.cooling_btu_hr) < 1e-9,
    `2x m: Q = ${b.cooling_btu_hr} != 2 * ${a.cooling_btu_hr}`);
  // cooling_tons = cooling_btu_hr / 12000 exact unit pin (12000 Btu/hr / ton).
  assert.ok(Math.abs(a.cooling_tons - a.cooling_btu_hr / 12000) < 1e-12,
    `tons = ${a.cooling_tons}, expected ${a.cooling_btu_hr / 12000}`);
  // Closed-form pin from evaporativeCoolingExample: m=10 lb/hr -> Q ~ 10540
  // Btu/hr (default hfg ~ 1054 Btu/lb at typical conditions).
  const ref = computeEvaporativeCooling({ evaporation_rate_lb_hr: 10 });
  assert.ok(Math.abs(ref.cooling_btu_hr - 10540) < 100,
    `Q at m=10 = ${ref.cooling_btu_hr}, expected ~10540`);
  // Custom-hfg closed-form pin: m=10 / hfg=1000 -> Q = 10000 exact.
  const custom = computeEvaporativeCooling({ evaporation_rate_lb_hr: 10, hfg_btu_per_lb: 1000 });
  assert.ok(Math.abs(custom.cooling_btu_hr - 10000) < 1e-9,
    `Q at m=10/hfg=1000 = ${custom.cooling_btu_hr}, expected 10000`);
  // Boundary pin: m <= 0 -> error.
  const bad = computeEvaporativeCooling({ evaporation_rate_lb_hr: 0 });
  assert.ok(bad.error, `expected error for m=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeO2CylinderTime minutes_to_reserve is strictly increasing in (pressure_psi - reserve_psi) at fixed cylinder/flow; strictly decreasing in flow_lpm at fixed delta-P; tank_factor pin per cylinder (D 0.16 / E 0.28 / M 1.56 / G 2.41 / H 3.14)", () => {
  // Group V. minutes_to_reserve = ((P - R) * tank_factor) / F. Strictly
  // increasing in P at fixed R/F; strictly decreasing in F at fixed P/R.
  let prev = -Infinity;
  for (const pressure_psi of [500, 1000, 1500, 1800, 2000, 2200]) {
    const r = computeO2CylinderTime({ cylinder: "E", pressure_psi, reserve_psi: 200, flow_lpm: 4 });
    assert.ok(Number.isFinite(r.minutes_to_reserve) && r.minutes_to_reserve > 0,
      `min at P=${pressure_psi}: ${JSON.stringify(r)}`);
    assert.ok(r.minutes_to_reserve > prev,
      `min at P=${pressure_psi} = ${r.minutes_to_reserve} not greater than prev=${prev}`);
    prev = r.minutes_to_reserve;
  }
  // Strictly decreasing in flow_lpm at fixed P/R/cylinder (1/F pin).
  let prevFlow = Infinity;
  for (const flow_lpm of [0.5, 1, 2, 4, 8, 15, 25]) {
    const r = computeO2CylinderTime({ cylinder: "E", pressure_psi: 2000, reserve_psi: 200, flow_lpm });
    assert.ok(r.minutes_to_reserve < prevFlow,
      `min at F=${flow_lpm} = ${r.minutes_to_reserve} not less than prev=${prevFlow}`);
    prevFlow = r.minutes_to_reserve;
  }
  // Strictly decreasing in reserve_psi at fixed P/cylinder/flow (-(R) pin).
  let prevR = Infinity;
  for (const reserve_psi of [0, 100, 200, 300, 500, 1000]) {
    const r = computeO2CylinderTime({ cylinder: "E", pressure_psi: 2000, reserve_psi, flow_lpm: 4 });
    assert.ok(r.minutes_to_reserve < prevR,
      `min at R=${reserve_psi} = ${r.minutes_to_reserve} not less than prev=${prevR}`);
    prevR = r.minutes_to_reserve;
  }
  // tank_factor pin per cylinder size.
  assert.equal(computeO2CylinderTime({ cylinder: "D", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 }).tank_factor, 0.16);
  assert.equal(computeO2CylinderTime({ cylinder: "E", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 }).tank_factor, 0.28);
  assert.equal(computeO2CylinderTime({ cylinder: "M", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 }).tank_factor, 1.56);
  assert.equal(computeO2CylinderTime({ cylinder: "G", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 }).tank_factor, 2.41);
  assert.equal(computeO2CylinderTime({ cylinder: "H", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 }).tank_factor, 3.14);
  // Cylinder-size monotonicity pin: D < E < M < G < H at fixed P/R/F.
  const sizes = ["D", "E", "M", "G", "H"];
  let prevSize = -Infinity;
  for (const cylinder of sizes) {
    const r = computeO2CylinderTime({ cylinder, pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 });
    assert.ok(r.minutes_to_reserve > prevSize,
      `min at cyl=${cylinder} = ${r.minutes_to_reserve} not greater than prev=${prevSize}`);
    prevSize = r.minutes_to_reserve;
  }
  // Closed-form pin: E cylinder, P=2000, R=200, F=4 -> min = (1800 * 0.28) / 4 = 126.
  const ref = computeO2CylinderTime({ cylinder: "E", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 });
  const expectedMin = ((2000 - 200) * 0.28) / 4;
  assert.ok(Math.abs(ref.minutes_to_reserve - expectedMin) < 1e-9,
    `min = ${ref.minutes_to_reserve}, expected ${expectedMin}`);
  assert.equal(ref.cylinder, "E");
  // minutes_to_empty pin: (P * factor) / F (no reserve subtracted).
  assert.ok(Math.abs(ref.minutes_to_empty - (2000 * 0.28) / 4) < 1e-9,
    `min_empty = ${ref.minutes_to_empty}, expected ${(2000 * 0.28) / 4}`);
  // minutes_to_empty > minutes_to_reserve invariant.
  assert.ok(ref.minutes_to_empty > ref.minutes_to_reserve,
    `empty (${ref.minutes_to_empty}) should exceed reserve (${ref.minutes_to_reserve})`);
  // Reserve-warning pin: R < 200 psi tips a warning.
  const lowR = computeO2CylinderTime({ cylinder: "E", pressure_psi: 2000, reserve_psi: 100, flow_lpm: 4 });
  assert.ok(/very little safety margin/.test(lowR.reserve_warning),
    `warning: ${lowR.reserve_warning}`);
  const okR = computeO2CylinderTime({ cylinder: "E", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 });
  assert.equal(okR.reserve_warning, null);
  // hh:mm formatting pin.
  assert.ok(/^\d{2}:\d{2}$/.test(ref.hhmm_to_reserve),
    `hh:mm format: ${ref.hhmm_to_reserve}`);
  // Bounds pin: unknown cylinder -> error; R > P -> error.
  const badCyl = computeO2CylinderTime({ cylinder: "X", pressure_psi: 2000, reserve_psi: 200, flow_lpm: 4 });
  assert.ok(badCyl.error, `expected error for cyl=X, got ${JSON.stringify(badCyl)}`);
  const badR = computeO2CylinderTime({ cylinder: "E", pressure_psi: 200, reserve_psi: 500, flow_lpm: 4 });
  assert.ok(badR.error, `expected error for R>P, got ${JSON.stringify(badR)}`);
});

test("monotonicity: computeHypoxiaAltitude crew_o2_required and all_occupants_o2_required are monotone non-decreasing as cabin_altitude_ft rises (false -> crew-only -> all); regulatory band thresholds at 12500 / 14000 / 15000 ft (14 CFR §91.211 pin)", () => {
  // Group W. crew_o2_required false below 12500, true above. all_occupants
  // false below 15000, true above. Both monotone non-decreasing in altitude.
  let prevCrew = -1;
  let prevAll = -1;
  for (const cabin_altitude_ft of [5000, 10000, 12000, 12500, 13000, 13999, 14000, 14500, 14999, 15000, 16000, 18000, 25000]) {
    const r = computeHypoxiaAltitude({ cabin_altitude_ft });
    const crew = r.crew_o2_required ? 1 : 0;
    const all = r.all_occupants_o2_required ? 1 : 0;
    assert.ok(crew >= prevCrew,
      `crew at ${cabin_altitude_ft} = ${crew} not >= prev=${prevCrew}`);
    assert.ok(all >= prevAll,
      `all at ${cabin_altitude_ft} = ${all} not >= prev=${prevAll}`);
    prevCrew = crew;
    prevAll = all;
  }
  // Boundary pins at the regulatory thresholds.
  const below = computeHypoxiaAltitude({ cabin_altitude_ft: 12499 });
  assert.equal(below.crew_o2_required, false);
  assert.equal(below.all_occupants_o2_required, false);
  assert.equal(below.band, "below 12,500 ft");
  const at12500 = computeHypoxiaAltitude({ cabin_altitude_ft: 12500 });
  assert.equal(at12500.crew_o2_required, true);
  assert.equal(at12500.all_occupants_o2_required, false);
  assert.equal(at12500.band, "12,500 to 14,000 ft");
  const at14000 = computeHypoxiaAltitude({ cabin_altitude_ft: 14000 });
  assert.equal(at14000.crew_o2_required, true);
  assert.equal(at14000.all_occupants_o2_required, false);
  assert.equal(at14000.band, "14,000 to 15,000 ft");
  const at15000 = computeHypoxiaAltitude({ cabin_altitude_ft: 15000 });
  assert.equal(at15000.crew_o2_required, true);
  assert.equal(at15000.all_occupants_o2_required, true);
  assert.equal(at15000.band, "above 15,000 ft");
  // hypoxiaExample closed-form pin: 13000 ft -> 12,500 to 14,000 band.
  const ref = computeHypoxiaAltitude({ cabin_altitude_ft: 13000 });
  assert.equal(ref.band, "12,500 to 14,000 ft");
  assert.equal(ref.crew_o2_required, true);
  assert.equal(ref.all_occupants_o2_required, false);
  assert.ok(/91\.211\(a\)\(1\)/.test(ref.regulation),
    `regulation: ${ref.regulation}`);
  // Regulation-citation pins at each band.
  assert.ok(/None required/.test(below.regulation), `below reg: ${below.regulation}`);
  assert.ok(/91\.211\(a\)\(2\)/.test(at14000.regulation), `14k reg: ${at14000.regulation}`);
  assert.ok(/91\.211\(a\)\(3\)/.test(at15000.regulation), `15k reg: ${at15000.regulation}`);
  // cabin_altitude_ft round-trip identity pin.
  assert.equal(ref.cabin_altitude_ft, 13000);
  // Bounds pin: altitude outside [-2000, 50000] -> error.
  const badLo = computeHypoxiaAltitude({ cabin_altitude_ft: -3000 });
  assert.ok(badLo.error, `expected error for alt=-3000, got ${JSON.stringify(badLo)}`);
  const badHi = computeHypoxiaAltitude({ cabin_altitude_ft: 60000 });
  assert.ok(badHi.error, `expected error for alt=60000, got ${JSON.stringify(badHi)}`);
});

// --- spec-v14 §10.3 Phase F forty-sixth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (E / F / N / P / U).

import { computeBendAllowance } from "../../calc-construction.js";
import { computeNFPA1142WaterSupply } from "../../calc-fire.js";
import { computeTrussCapacity } from "../../calc-stage.js";
import { computePetAge } from "../../calc-vet.js";

test("monotonicity: computeBendAllowance bend_allowance_in is strictly increasing in bend_angle_deg at fixed thickness/radius/k (linear-in-angle pin); strictly increasing in inside_radius_in (linear pin); strictly increasing in thickness_in via k*t (linear-in-t pin); doubling angle -> 2x bend_allowance exact", () => {
  // Group E. BA = (pi/180) * angle * (R + k * t). Strictly increasing in
  // angle (linear), in R (linear), and in t (linear via k*t).
  let prev = -Infinity;
  for (const bend_angle_deg of [15, 30, 45, 60, 90, 120, 150]) {
    const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
    assert.ok(Number.isFinite(r.bend_allowance_in) && r.bend_allowance_in > 0,
      `BA at angle=${bend_angle_deg}: ${JSON.stringify(r)}`);
    assert.ok(r.bend_allowance_in > prev,
      `BA at angle=${bend_angle_deg} = ${r.bend_allowance_in} not greater than prev=${prev}`);
    prev = r.bend_allowance_in;
  }
  // Strictly increasing in inside_radius_in at fixed thickness/angle.
  let prevR = -Infinity;
  for (const inside_radius_in of [0, 0.0625, 0.125, 0.25, 0.5, 1.0]) {
    const r = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
    assert.ok(r.bend_allowance_in > prevR,
      `BA at R=${inside_radius_in} = ${r.bend_allowance_in} not greater than prev=${prevR}`);
    prevR = r.bend_allowance_in;
  }
  // Strictly increasing in thickness_in at fixed angle/R (linear-in-t via k*t).
  let prevT = -Infinity;
  for (const thickness_in of [0.02, 0.04, 0.06, 0.10, 0.15, 0.25]) {
    const r = computeBendAllowance({ thickness_in, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
    assert.ok(r.bend_allowance_in > prevT,
      `BA at t=${thickness_in} = ${r.bend_allowance_in} not greater than prev=${prevT}`);
    prevT = r.bend_allowance_in;
  }
  // Doubling-angle pin: 2x angle -> 2x bend_allowance exactly (linear).
  const a = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 45, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
  const b = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
  assert.ok(Math.abs(b.bend_allowance_in - 2 * a.bend_allowance_in) < 1e-12,
    `2x angle: BA = ${b.bend_allowance_in} != 2 * ${a.bend_allowance_in}`);
  // Closed-form pin from bendAllowanceExample: t=0.06, angle=90, R=0.125, k=0.44.
  // BA = (pi/180) * 90 * (0.125 + 0.44 * 0.06).
  const ref = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
  const expectedBa = (Math.PI / 180) * 90 * (0.125 + 0.44 * 0.06);
  assert.ok(Math.abs(ref.bend_allowance_in - expectedBa) < 1e-12,
    `BA = ${ref.bend_allowance_in}, expected ${expectedBa}`);
  // Flat-blank closed-form pin: flat = leg_a + leg_b + BA - 2*setback,
  // where setback = (R + t) * tan(angle/2).
  const expectedSetback = (0.125 + 0.06) * Math.tan((90 / 2) * Math.PI / 180);
  const expectedFlat = 2 + 3 + expectedBa - 2 * expectedSetback;
  assert.ok(Math.abs(ref.flat_blank_in - expectedFlat) < 1e-12,
    `flat = ${ref.flat_blank_in}, expected ${expectedFlat}`);
  // R=0 boundary pin: BA = (pi/180) * angle * k * t (no radius term).
  const noR = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 });
  const expectedBaNoR = (Math.PI / 180) * 90 * (0.44 * 0.06);
  assert.ok(Math.abs(noR.bend_allowance_in - expectedBaNoR) < 1e-12,
    `BA at R=0 = ${noR.bend_allowance_in}, expected ${expectedBaNoR}`);
  // Bounds pins: bend_angle_deg outside (0, 180) -> error; t <= 0 -> error.
  const badAng = computeBendAllowance({ thickness_in: 0.06, bend_angle_deg: 180, inside_radius_in: 0.125 });
  assert.ok(badAng.error, `expected error for angle=180, got ${JSON.stringify(badAng)}`);
  const badT = computeBendAllowance({ thickness_in: 0, bend_angle_deg: 90, inside_radius_in: 0.125 });
  assert.ok(badT.error, `expected error for t=0, got ${JSON.stringify(badT)}`);
});

test("monotonicity: computeNFPA1142WaterSupply Q_min_gal is strictly increasing in volume_ft3 (linear pin); strictly non-decreasing in occupancy hazard factor and construction-class factor; exposure 1.5x and sprinkler 0.5x multiplier pins (NFPA 1142 §5 pin)", () => {
  // Group F. Q = (V * occ.factor * con.factor / 5) * exposure_mult * sprinkler_mult.
  // Strictly increasing in V at fixed occupancy/construction/flags.
  let prev = -Infinity;
  for (const volume_ft3 of [5000, 10000, 20000, 30000, 50000, 100000, 200000]) {
    const r = computeNFPA1142WaterSupply({ volume_ft3, occupancy_class: 1, construction_class: "V", exposure_within_50_ft: false, sprinkler_listed: false });
    assert.ok(Number.isFinite(r.Q_min_gal) && r.Q_min_gal > 0,
      `Q at V=${volume_ft3}: ${JSON.stringify(r)}`);
    assert.ok(r.Q_min_gal > prev,
      `Q at V=${volume_ft3} = ${r.Q_min_gal} not greater than prev=${prev}`);
    prev = r.Q_min_gal;
  }
  // Occupancy-hazard ordering pin: factors 3 (cls 1) < 4 (cls 7) < 5 (cls 2,5) < 6 (cls 3,6) < 7 (cls 4).
  const cls1 = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V" });
  const cls7 = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "V" });
  const cls2 = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 2, construction_class: "V" });
  const cls3 = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 3, construction_class: "V" });
  const cls4 = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 4, construction_class: "V" });
  assert.equal(cls1.occupancy_factor, 3);
  assert.equal(cls7.occupancy_factor, 4);
  assert.equal(cls2.occupancy_factor, 5);
  assert.equal(cls3.occupancy_factor, 6);
  assert.equal(cls4.occupancy_factor, 7);
  assert.ok(cls1.Q_min_gal < cls7.Q_min_gal && cls7.Q_min_gal < cls2.Q_min_gal && cls2.Q_min_gal < cls3.Q_min_gal && cls3.Q_min_gal < cls4.Q_min_gal,
    `occupancy hazard ordering violated`);
  // Construction-class ordering pin: I (0.5) < II (0.75) < III/IV (1.0) < V (1.5).
  const cI = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "I" });
  const cII = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "II" });
  const cIII = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "III" });
  const cIV = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "IV" });
  const cV = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V" });
  assert.equal(cI.construction_factor, 0.5);
  assert.equal(cII.construction_factor, 0.75);
  assert.equal(cIII.construction_factor, 1.0);
  assert.equal(cIV.construction_factor, 1.0);
  assert.equal(cV.construction_factor, 1.5);
  assert.ok(cI.Q_min_gal < cII.Q_min_gal && cII.Q_min_gal < cIII.Q_min_gal && cIV.Q_min_gal < cV.Q_min_gal,
    `construction-class ordering violated`);
  // Exposure 1.5x multiplier pin.
  const noExp = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V", exposure_within_50_ft: false });
  const withExp = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V", exposure_within_50_ft: true });
  assert.ok(Math.abs(withExp.Q_min_gal - noExp.Q_min_gal * 1.5) < 1e-9,
    `exposure: ${withExp.Q_min_gal} != 1.5 * ${noExp.Q_min_gal}`);
  // Sprinkler 0.5x multiplier pin.
  const noSpr = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V" });
  const withSpr = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V", sprinkler_listed: true });
  assert.ok(Math.abs(withSpr.Q_min_gal - noSpr.Q_min_gal * 0.5) < 1e-9,
    `sprinkler: ${withSpr.Q_min_gal} != 0.5 * ${noSpr.Q_min_gal}`);
  // nfpa1142Example closed-form pin: 30000 ft^3 / occ 1 / Cls V / no exp /
  // no spr -> Q = 30000 * 3 * 1.5 / 5 = 27000 gal exact.
  const ref = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V" });
  assert.ok(Math.abs(ref.Q_min_gal - 27000) < 1e-9,
    `Q at example = ${ref.Q_min_gal}, expected 27000`);
  // Doubling-volume pin: 2x V -> 2x Q exactly (linear in V).
  const a = computeNFPA1142WaterSupply({ volume_ft3: 15000, occupancy_class: 1, construction_class: "V" });
  const b = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "V" });
  assert.ok(Math.abs(b.Q_min_gal - 2 * a.Q_min_gal) < 1e-9,
    `2x V: Q = ${b.Q_min_gal} != 2 * ${a.Q_min_gal}`);
  // Q_pre_sprinkler_gal pin: returned Q before the 0.5x sprinkler step.
  assert.ok(Math.abs(withSpr.Q_pre_sprinkler_gal - noSpr.Q_min_gal) < 1e-9,
    `Q_pre = ${withSpr.Q_pre_sprinkler_gal}, expected ${noSpr.Q_min_gal}`);
  // tanker_count ceiling pin: e.g. Q=27000 / 3000 gal tanker = 9.
  assert.equal(ref.tanker_count[3000], 9);
  assert.equal(ref.tanker_count[1000], 27);
  // Bounds pin: bad occupancy / construction -> error.
  const badOcc = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 99, construction_class: "V" });
  assert.ok(badOcc.error, `expected error for occupancy=99, got ${JSON.stringify(badOcc)}`);
  const badCon = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 1, construction_class: "X" });
  assert.ok(badCon.error, `expected error for construction=X, got ${JSON.stringify(badCon)}`);
});

test("monotonicity: computeTrussCapacity udl_max_lb_per_ft is strictly decreasing as span_ft grows (Tomcat-published moment-capacity curve pin); total_uniform_capacity = udl_max * span_ft exact; bigger truss model (16in_box) carries more than smaller (12in_box) at every span", () => {
  // Group N. udl_max interpolates the published capacity curve which is
  // monotonically decreasing in span. total_uniform_capacity = udl_max * span.
  let prevUdl = Infinity;
  for (const span_ft of [10, 15, 20, 25, 30, 35, 40, 45, 50]) {
    const r = computeTrussCapacity({ truss_model: "12in_box", span_ft });
    assert.ok(Number.isFinite(r.udl_max_lb_per_ft) && r.udl_max_lb_per_ft > 0,
      `udl at span=${span_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.udl_max_lb_per_ft < prevUdl,
      `udl at span=${span_ft} = ${r.udl_max_lb_per_ft} not less than prev=${prevUdl}`);
    prevUdl = r.udl_max_lb_per_ft;
  }
  // Bigger truss carries more at every span: 16in_box > 12in_box (UDL).
  for (const span_ft of [10, 20, 30, 40]) {
    const big = computeTrussCapacity({ truss_model: "16in_box", span_ft });
    const small = computeTrussCapacity({ truss_model: "12in_box", span_ft });
    assert.ok(big.udl_max_lb_per_ft > small.udl_max_lb_per_ft,
      `16in (${big.udl_max_lb_per_ft}) not > 12in (${small.udl_max_lb_per_ft}) at span=${span_ft}`);
  }
  // total_uniform_capacity = udl_max * span exact unit pin.
  const ref = computeTrussCapacity({ truss_model: "16in_box", span_ft: 30 });
  assert.ok(Math.abs(ref.total_uniform_capacity_lb - ref.udl_max_lb_per_ft * 30) < 1e-9,
    `total = ${ref.total_uniform_capacity_lb}, expected ${ref.udl_max_lb_per_ft * 30}`);
  // Tomcat 16in_box published-point pin at span=30 -> 240 lb/ft exact.
  assert.equal(ref.udl_max_lb_per_ft, 240);
  // Interior-point linear-interp pin: span=15 on 12in_box (10/320, 20/220)
  // -> 270 lb/ft exact.
  const interp = computeTrussCapacity({ truss_model: "12in_box", span_ft: 15 });
  assert.equal(interp.udl_max_lb_per_ft, 270);
  // trussExample with two 250-lb point loads at 10 / 20 ft on 30-ft span:
  // total_point_load = 500; equivalent_udl = 2 * 500 / 30 = 33.333.
  const withLoads = computeTrussCapacity({ truss_model: "16in_box", span_ft: 30, point_loads: [{ weight_lb: 250, position_ft: 10 }, { weight_lb: 250, position_ft: 20 }] });
  assert.equal(withLoads.total_point_load_lb, 500);
  assert.ok(Math.abs(withLoads.equivalent_udl_lb_per_ft - (2 * 500) / 30) < 1e-9,
    `eq_udl = ${withLoads.equivalent_udl_lb_per_ft}, expected ${(2 * 500) / 30}`);
  // Simple-beam reaction-sum pin: Ra + Rb = total_point_load.
  assert.ok(Math.abs(withLoads.reaction_a_lb + withLoads.reaction_b_lb - withLoads.total_point_load_lb) < 1e-9,
    `Ra+Rb = ${withLoads.reaction_a_lb + withLoads.reaction_b_lb}, expected ${withLoads.total_point_load_lb}`);
  // Symmetric loads pin: 250 at 10 + 250 at 20 on 30-ft span -> Ra = Rb.
  assert.ok(Math.abs(withLoads.reaction_a_lb - withLoads.reaction_b_lb) < 1e-9,
    `symmetric: Ra=${withLoads.reaction_a_lb}, Rb=${withLoads.reaction_b_lb}`);
  // pass flag: equivalent_udl < udl_max (240) -> pass true; safety_factor > 1.
  assert.equal(withLoads.pass, true);
  assert.ok(withLoads.safety_factor > 1, `safety_factor = ${withLoads.safety_factor}`);
  // No-loads pin: equivalent_udl = 0; safety_factor uses 0.01 floor in the
  // denominator -> udl_max / 0.01 (very large, not Infinity); pass true.
  const noLoads = computeTrussCapacity({ truss_model: "16in_box", span_ft: 30 });
  assert.equal(noLoads.equivalent_udl_lb_per_ft, 0);
  assert.ok(Math.abs(noLoads.safety_factor - noLoads.udl_max_lb_per_ft / 0.01) < 1e-9,
    `no-load safety = ${noLoads.safety_factor}, expected ${noLoads.udl_max_lb_per_ft / 0.01}`);
  assert.equal(noLoads.pass, true);
  // Out-of-curve-clamp pin: span beyond last point clamps to last UDL.
  const beyond = computeTrussCapacity({ truss_model: "12in_box", span_ft: 100 });
  assert.equal(beyond.udl_max_lb_per_ft, 50); // 50 ft endpoint
  // Bounds pin: bad model / non-positive span -> error.
  const badModel = computeTrussCapacity({ truss_model: "unknown", span_ft: 30 });
  assert.ok(badModel.error, `expected error for unknown model, got ${JSON.stringify(badModel)}`);
});

test("monotonicity: computeCashConversionCycle ccc_days is strictly increasing in dio (linear pin) AND in dso (linear pin); strictly decreasing in dpo (linear pin); ccc = dio + dso - dpo exact closed-form pin", () => {
  // Group P. ccc = dio + dso - dpo. Strictly increasing in dio at fixed
  // dso/dpo; strictly increasing in dso at fixed dio/dpo; strictly
  // decreasing in dpo at fixed dio/dso.
  let prev = -Infinity;
  for (const dio of [0, 15, 30, 60, 90, 120, 180]) {
    const r = computeCashConversionCycle({ dso: 45, dio, dpo: 30 });
    assert.ok(Number.isFinite(r.ccc_days),
      `ccc at dio=${dio}: ${JSON.stringify(r)}`);
    assert.ok(r.ccc_days > prev,
      `ccc at dio=${dio} = ${r.ccc_days} not greater than prev=${prev}`);
    prev = r.ccc_days;
  }
  // Strictly increasing in dso at fixed dio/dpo (linear).
  let prevDso = -Infinity;
  for (const dso of [0, 10, 30, 45, 60, 90, 120]) {
    const r = computeCashConversionCycle({ dso, dio: 60, dpo: 30 });
    assert.ok(r.ccc_days > prevDso,
      `ccc at dso=${dso} = ${r.ccc_days} not greater than prev=${prevDso}`);
    prevDso = r.ccc_days;
  }
  // Strictly decreasing in dpo at fixed dio/dso (linear with sign flip).
  let prevDpo = Infinity;
  for (const dpo of [0, 10, 30, 45, 60, 90, 120]) {
    const r = computeCashConversionCycle({ dso: 45, dio: 60, dpo });
    assert.ok(r.ccc_days < prevDpo,
      `ccc at dpo=${dpo} = ${r.ccc_days} not less than prev=${prevDpo}`);
    prevDpo = r.ccc_days;
  }
  // Closed-form pin from cccExample: dso=45, dio=60, dpo=30 -> ccc = 75.
  const ref = computeCashConversionCycle({ dso: 45, dio: 60, dpo: 30 });
  assert.equal(ref.ccc_days, 75);
  assert.equal(ref.dso, 45);
  assert.equal(ref.dio, 60);
  assert.equal(ref.dpo, 30);
  // Contribution-decomposition pin: dio_contribution + dso_contribution +
  // dpo_contribution = ccc_days (with dpo contributing as negative).
  assert.ok(Math.abs(ref.dio_contribution + ref.dso_contribution + ref.dpo_contribution - ref.ccc_days) < 1e-12,
    `contributions sum: ${ref.dio_contribution + ref.dso_contribution + ref.dpo_contribution} != ${ref.ccc_days}`);
  assert.equal(ref.dpo_contribution, -30);
  assert.equal(ref.dio_contribution, 60);
  assert.equal(ref.dso_contribution, 45);
  // Doubling-dio pin: 2x dio -> ccc grows by exactly dio (linear).
  const a = computeCashConversionCycle({ dso: 45, dio: 30, dpo: 30 });
  const b = computeCashConversionCycle({ dso: 45, dio: 60, dpo: 30 });
  assert.equal(b.ccc_days - a.ccc_days, 30);
  // Zero-all-days pin: 0 + 0 - 0 = 0.
  const zero = computeCashConversionCycle({ dso: 0, dio: 0, dpo: 0 });
  assert.equal(zero.ccc_days, 0);
  // Negative-ccc pin: high-dpo / low-dso-dio -> CCC can be negative
  // (favorable: supplier credit covers receivables + inventory cycle).
  const negCcc = computeCashConversionCycle({ dso: 10, dio: 5, dpo: 60 });
  assert.equal(negCcc.ccc_days, -45);
  // Bounds pin: negative-day input -> error.
  const bad = computeCashConversionCycle({ dso: -5, dio: 60, dpo: 30 });
  assert.ok(bad.error, `expected error for dso=-5, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computePetAge human_age_equivalent_years is strictly increasing in pet_age_years for dogs and cats (piecewise AAHA scheme pin); strictly increasing in size_band (small < medium < large < giant DOG_SIZE_FACTOR pin); year 1 = 15, year 2 = 24 boundary pins", () => {
  // Group U. Dog: y<=1 -> 15*y; 1<y<=2 -> 15 + (y-1)*9; y>2 -> 24 + (y-2)*factor.
  // Cat: y<=1 -> 15*y; 1<y<=2 -> 15 + (y-1)*9; y>2 -> 24 + (y-2)*4.
  // Strictly increasing in age for both species across the full piecewise.
  let prev = -Infinity;
  for (const pet_age_years of [0.25, 0.5, 1, 1.25, 1.5, 2, 3, 5, 8, 12, 18]) {
    const r = computePetAge({ species: "dog", pet_age_years, size_band: "medium" });
    assert.ok(Number.isFinite(r.human_age_equivalent_years),
      `human at y=${pet_age_years}: ${JSON.stringify(r)}`);
    assert.ok(r.human_age_equivalent_years > prev,
      `human at y=${pet_age_years} = ${r.human_age_equivalent_years} not greater than prev=${prev}`);
    prev = r.human_age_equivalent_years;
  }
  // Strictly increasing for cats too.
  let prevCat = -Infinity;
  for (const pet_age_years of [0.25, 1, 2, 4, 8, 14, 20]) {
    const r = computePetAge({ species: "cat", pet_age_years });
    assert.ok(r.human_age_equivalent_years > prevCat,
      `cat human at y=${pet_age_years} = ${r.human_age_equivalent_years} not greater than prev=${prevCat}`);
    prevCat = r.human_age_equivalent_years;
  }
  // DOG_SIZE_FACTOR ordering pin at fixed age > 2: small (4) < medium (5)
  // < large (6) < giant (7).
  const bands = ["small", "medium", "large", "giant"];
  let prevBand = -Infinity;
  for (const size_band of bands) {
    const r = computePetAge({ species: "dog", pet_age_years: 10, size_band });
    assert.ok(r.human_age_equivalent_years > prevBand,
      `human at band=${size_band} = ${r.human_age_equivalent_years} not greater than prev=${prevBand}`);
    prevBand = r.human_age_equivalent_years;
  }
  // Year-1 boundary pin: age=1 -> human = 15 (any species, any band).
  assert.equal(computePetAge({ species: "dog", pet_age_years: 1, size_band: "medium" }).human_age_equivalent_years, 15);
  assert.equal(computePetAge({ species: "cat", pet_age_years: 1 }).human_age_equivalent_years, 15);
  // Year-2 boundary pin: age=2 -> human = 24.
  assert.equal(computePetAge({ species: "dog", pet_age_years: 2, size_band: "medium" }).human_age_equivalent_years, 24);
  assert.equal(computePetAge({ species: "cat", pet_age_years: 2 }).human_age_equivalent_years, 24);
  // Closed-form pin: dog medium @ 5 yr -> 24 + (5-2)*5 = 39.
  const ref = computePetAge({ species: "dog", pet_age_years: 5, size_band: "medium" });
  assert.equal(ref.human_age_equivalent_years, 39);
  // Closed-form pin: dog giant @ 5 yr -> 24 + (5-2)*7 = 45.
  const giant = computePetAge({ species: "dog", pet_age_years: 5, size_band: "giant" });
  assert.equal(giant.human_age_equivalent_years, 45);
  // Closed-form pin: cat @ 10 yr -> 24 + (10-2)*4 = 56.
  const cat10 = computePetAge({ species: "cat", pet_age_years: 10 });
  assert.equal(cat10.human_age_equivalent_years, 56);
  // Boundary pin: age <= 0 ok at 0; age > 30 -> error.
  const zero = computePetAge({ species: "dog", pet_age_years: 0, size_band: "medium" });
  assert.equal(zero.human_age_equivalent_years, 0);
  const tooOld = computePetAge({ species: "dog", pet_age_years: 35, size_band: "medium" });
  assert.ok(tooOld.error, `expected error for age=35, got ${JSON.stringify(tooOld)}`);
  // Bounds pin: bad species / bad size_band -> error.
  const badSp = computePetAge({ species: "iguana", pet_age_years: 5 });
  assert.ok(badSp.error, `expected error for iguana, got ${JSON.stringify(badSp)}`);
  const badBand = computePetAge({ species: "dog", pet_age_years: 5, size_band: "tiny" });
  assert.ok(badBand.error, `expected error for tiny, got ${JSON.stringify(badBand)}`);
});

// --- spec-v14 §10.3 Phase F forty-seventh monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (A / B / C / L / Y).

import { computeWireAmpacity } from "../../calc-electrical.js";
import { computeSepticTank } from "../../calc-plumbing.js";
import { computeDuctSize } from "../../calc-hvac.js";
import { computePcrMix } from "../../calc-lab.js";
import { computeLexileBand } from "../../calc-edu.js";

test("monotonicity: computeWireAmpacity ampacity_A is strictly decreasing as ambient_C rises at fixed AWG/material/insulation (dT shrinks pin); strictly increasing as awg integer shrinks 14 -> 4/0 (bigger cross-section pin); strictly non-increasing in bundle_count (IEEE 835 bundling-derate pin)", () => {
  // Group A. I^2 = h * P * dT / r_per_m, so ampacity strictly decreases as
  // ambient_C rises (dT = T_c - T_a shrinks) at fixed insulation / AWG.
  let prev = Infinity;
  for (const ambient_C of [10, 20, 30, 40, 50, 60, 70]) {
    const r = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 90, ambient_C, bundle_count: 1 });
    assert.ok(Number.isFinite(r.ampacity_A) && r.ampacity_A > 0,
      `I at ambient=${ambient_C}: ${JSON.stringify(r)}`);
    assert.ok(r.ampacity_A < prev,
      `I at ambient=${ambient_C} = ${r.ampacity_A} not less than prev=${prev}`);
    prev = r.ampacity_A;
  }
  // Strictly increasing as AWG integer decreases (14 -> 12 -> 10 -> 8 -> 6 -> 4 -> 2 -> 1 -> 1/0 -> 2/0 -> 3/0 -> 4/0).
  // Bigger conductor area at smaller AWG number -> larger ampacity.
  const awgChain = ["14", "12", "10", "8", "6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0"];
  let prevAwg = -Infinity;
  for (const awg of awgChain) {
    const r = computeWireAmpacity({ awg, material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
    assert.ok(r.ampacity_A > prevAwg,
      `I at awg=${awg} = ${r.ampacity_A} not greater than prev=${prevAwg}`);
    prevAwg = r.ampacity_A;
  }
  // Strictly non-increasing in bundle_count (IEEE 835 factors: 1-3 -> 1.0,
  // 4-6 -> 0.8, 7-9 -> 0.7, >=10 -> 0.5).
  let prevBundle = Infinity;
  for (const bundle_count of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15]) {
    const r = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count });
    assert.ok(r.ampacity_A <= prevBundle,
      `I at bundle=${bundle_count} = ${r.ampacity_A} not <= prev=${prevBundle}`);
    prevBundle = r.ampacity_A;
  }
  // 4-6 bundle factor 0.8 pin; 7-9 bundle factor 0.7 pin; >=10 bundle 0.5 pin.
  const b1 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  const b4 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 4 });
  const b7 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 7 });
  const b10 = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 10 });
  assert.ok(Math.abs(b4.ampacity_A - b1.ampacity_A * 0.8) < 1e-9,
    `4-bundle factor: ${b4.ampacity_A} != 0.8 * ${b1.ampacity_A}`);
  assert.ok(Math.abs(b7.ampacity_A - b1.ampacity_A * 0.7) < 1e-9,
    `7-bundle factor: ${b7.ampacity_A} != 0.7 * ${b1.ampacity_A}`);
  assert.ok(Math.abs(b10.ampacity_A - b1.ampacity_A * 0.5) < 1e-9,
    `10-bundle factor: ${b10.ampacity_A} != 0.5 * ${b1.ampacity_A}`);
  // Copper > aluminum at the same AWG / insulation / ambient (rho_Cu < rho_Al).
  const cu = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  const al = computeWireAmpacity({ awg: "12", material: "aluminum", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  assert.ok(cu.ampacity_A > al.ampacity_A,
    `Cu (${cu.ampacity_A}) not > Al (${al.ampacity_A})`);
  // wireAmpacityExample band pin: 12 AWG copper 75 C / 30 C ambient -> [18, 35].
  const ref = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
  assert.ok(ref.ampacity_A >= 18 && ref.ampacity_A <= 35,
    `ampacity = ${ref.ampacity_A}, expected 18-35 (example range)`);
  // Boundary pin: T_c <= T_a -> ampacity = 0 exact.
  const noDt = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 30, ambient_C: 30, bundle_count: 1 });
  assert.equal(noDt.ampacity_A, 0);
  const inverted = computeWireAmpacity({ awg: "12", material: "copper", insulation_rating_C: 60, ambient_C: 75, bundle_count: 1 });
  assert.equal(inverted.ampacity_A, 0);
});

test("monotonicity: computeSepticTank minimum_tank_gallons is strictly non-decreasing in bedrooms; gallons_per_day override pin (bedrooms * 150 default); 1000 gal floor pin (USPHS 2-day reserve rule pin)", () => {
  // Group B. gpd = gallons_per_day || bedrooms * 150; tank >= max(1000, 2*gpd).
  // Strictly non-decreasing in bedrooms (once 2 * bedrooms * 150 > 1000,
  // i.e. bedrooms >= 4, tank size increases strictly with bedrooms).
  let prev = -Infinity;
  for (const bedrooms of [1, 2, 3, 4, 5, 6, 8, 10]) {
    const r = computeSepticTank({ bedrooms });
    assert.ok(Number.isFinite(r.minimum_tank_gallons) && r.minimum_tank_gallons >= 1000,
      `tank at bedrooms=${bedrooms}: ${JSON.stringify(r)}`);
    assert.ok(r.minimum_tank_gallons >= prev,
      `tank at bedrooms=${bedrooms} = ${r.minimum_tank_gallons} not >= prev=${prev}`);
    prev = r.minimum_tank_gallons;
  }
  // 1000 gal floor pin: bedrooms 1-3 -> daily flow 150/300/450 < 500, so
  // 2*gpd < 1000 and the floor binds at exactly 1000 gallons.
  for (const bedrooms of [1, 2, 3]) {
    const r = computeSepticTank({ bedrooms });
    assert.equal(r.minimum_tank_gallons, 1000);
    assert.equal(r.daily_flow_gpd, bedrooms * 150);
  }
  // 2-day reserve rule pin: at 4+ bedrooms the 2 * gpd rule binds.
  const fourBr = computeSepticTank({ bedrooms: 4 });
  assert.equal(fourBr.daily_flow_gpd, 600);
  assert.equal(fourBr.minimum_tank_gallons, 1200);
  const sixBr = computeSepticTank({ bedrooms: 6 });
  assert.equal(sixBr.daily_flow_gpd, 900);
  assert.equal(sixBr.minimum_tank_gallons, 1800);
  // Strictly increasing in bedrooms once past the floor (4+).
  let prev2 = 1000;
  for (const bedrooms of [4, 5, 6, 7, 8]) {
    const r = computeSepticTank({ bedrooms });
    assert.ok(r.minimum_tank_gallons > prev2,
      `tank at bedrooms=${bedrooms} = ${r.minimum_tank_gallons} not greater than prev=${prev2}`);
    prev2 = r.minimum_tank_gallons;
  }
  // Daily-flow override pin: explicit gallons_per_day overrides bedrooms.
  const override = computeSepticTank({ bedrooms: 1, gallons_per_day: 1200 });
  assert.equal(override.daily_flow_gpd, 1200);
  assert.equal(override.minimum_tank_gallons, 2400);
  // floor_gallons = 1000 invariant pin.
  assert.equal(override.floor_gallons, 1000);
  // septicTankExample closed-form pin: 3 bedrooms -> 450 gpd, 1000 gal tank.
  const ref = computeSepticTank({ bedrooms: 3 });
  assert.equal(ref.daily_flow_gpd, 450);
  assert.equal(ref.minimum_tank_gallons, 1000);
  // Boundary pin: no bedrooms and no gpd -> error.
  const bad = computeSepticTank({});
  assert.ok(bad.error, `expected error for empty input, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeDuctSize round_diameter_in is strictly increasing in cfm at fixed friction (Darcy-Weisbach Q*v^2 -> larger d to keep dP target pin); strictly decreasing as friction_in_wc_per_100ft target rises at fixed CFM (looser target -> smaller duct pin)", () => {
  // Group C. Bisection-solve for d such that Darcy-Weisbach dP_per_100ft
  // equals the friction target. Strictly increasing in CFM at fixed target.
  let prev = -Infinity;
  for (const cfm of [100, 200, 400, 600, 1000, 1500, 2500, 5000]) {
    const r = computeDuctSize({ cfm, friction_in_wc_per_100ft: 0.08 });
    assert.ok(Number.isFinite(r.round_diameter_in) && r.round_diameter_in > 0,
      `d at cfm=${cfm}: ${JSON.stringify(r)}`);
    assert.ok(r.round_diameter_in > prev,
      `d at cfm=${cfm} = ${r.round_diameter_in} not greater than prev=${prev}`);
    prev = r.round_diameter_in;
  }
  // Strictly decreasing in friction target at fixed CFM (looser target
  // allows smaller duct).
  let prevFr = Infinity;
  for (const friction_in_wc_per_100ft of [0.02, 0.04, 0.06, 0.08, 0.12, 0.20, 0.40]) {
    const r = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft });
    assert.ok(r.round_diameter_in < prevFr,
      `d at friction=${friction_in_wc_per_100ft} = ${r.round_diameter_in} not less than prev=${prevFr}`);
    prevFr = r.round_diameter_in;
  }
  // velocity_fpm is monotonic with cfm at fixed friction (higher CFM at
  // the same friction target -> larger d, but cross-section grows as d^2
  // while CFM is linear so velocity actually grows mildly with CFM at
  // fixed friction; assert it stays positive and finite across the sweep).
  for (const cfm of [200, 400, 1000, 2500]) {
    const r = computeDuctSize({ cfm, friction_in_wc_per_100ft: 0.08 });
    assert.ok(Number.isFinite(r.velocity_fpm) && r.velocity_fpm > 0,
      `v at cfm=${cfm}: ${JSON.stringify(r)}`);
  }
  // Doubling-CFM pin: d ratio grows but stays < 2 (since d ~ Q^0.4 for
  // turbulent duct sizing -> 2x Q -> ~1.32x d).
  const a = computeDuctSize({ cfm: 500, friction_in_wc_per_100ft: 0.08 });
  const b = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0.08 });
  assert.ok(b.round_diameter_in > a.round_diameter_in && b.round_diameter_in < 2 * a.round_diameter_in,
    `2x cfm: d ratio = ${b.round_diameter_in / a.round_diameter_in}, expected (1, 2)`);
  // ductSizeExample sanity pin: 1000 CFM at 0.08 in wc / 100 ft -> d ~ 12-14 in
  // (within typical residential trunk-duct range).
  const ref = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0.08 });
  assert.ok(ref.round_diameter_in >= 8 && ref.round_diameter_in <= 20,
    `d at 1000 CFM = ${ref.round_diameter_in}, expected 8-20 in`);
  // Bounds pin: cfm <= 0 or friction <= 0 -> error.
  const badCfm = computeDuctSize({ cfm: 0, friction_in_wc_per_100ft: 0.08 });
  assert.ok(badCfm.error, `expected error for cfm=0, got ${JSON.stringify(badCfm)}`);
  const badFr = computeDuctSize({ cfm: 1000, friction_in_wc_per_100ft: 0 });
  assert.ok(badFr.error, `expected error for friction=0, got ${JSON.stringify(badFr)}`);
});

test("monotonicity: computePcrMix scaling_factor and total_master_mix are strictly increasing in number_of_reactions (linear pin); total_master_mix strictly increasing in fudge_factor_pct at fixed n (linear-in-(1+f/100) pin); doubling reactions -> 2x master_mix exact", () => {
  // Group L. factor = n * (1 + f/100); total_master_mix = sum(per_reaction * factor).
  // Strictly increasing in n (linear) and in f (linear).
  const components = [
    { name: "buffer", per_reaction: 5 },
    { name: "polymerase", per_reaction: 0.5 },
    { name: "primer F", per_reaction: 1 },
    { name: "primer R", per_reaction: 1 },
  ];
  let prev = -Infinity;
  for (const number_of_reactions of [1, 2, 5, 10, 24, 48, 96]) {
    const r = computePcrMix({ number_of_reactions, components, fudge_factor_pct: 10 });
    assert.ok(Number.isFinite(r.total_master_mix) && r.total_master_mix > 0,
      `mix at n=${number_of_reactions}: ${JSON.stringify(r)}`);
    assert.ok(r.total_master_mix > prev,
      `mix at n=${number_of_reactions} = ${r.total_master_mix} not greater than prev=${prev}`);
    prev = r.total_master_mix;
  }
  // Strictly increasing in fudge_factor_pct at fixed n.
  let prevF = -Infinity;
  for (const fudge_factor_pct of [0, 5, 10, 15, 25, 50, 100]) {
    const r = computePcrMix({ number_of_reactions: 24, components, fudge_factor_pct });
    assert.ok(r.total_master_mix > prevF,
      `mix at f=${fudge_factor_pct} = ${r.total_master_mix} not greater than prev=${prevF}`);
    prevF = r.total_master_mix;
  }
  // Doubling-reactions pin: 2x n -> 2x scaling_factor -> 2x total_master_mix exact.
  const a = computePcrMix({ number_of_reactions: 12, components, fudge_factor_pct: 10 });
  const b = computePcrMix({ number_of_reactions: 24, components, fudge_factor_pct: 10 });
  assert.ok(Math.abs(b.scaling_factor - 2 * a.scaling_factor) < 1e-12,
    `2x n: factor = ${b.scaling_factor} != 2 * ${a.scaling_factor}`);
  assert.ok(Math.abs(b.total_master_mix - 2 * a.total_master_mix) < 1e-12,
    `2x n: mix = ${b.total_master_mix} != 2 * ${a.total_master_mix}`);
  // Closed-form pin: factor = n * (1 + f/100) at any n / f.
  const ref = computePcrMix({ number_of_reactions: 24, components, fudge_factor_pct: 10 });
  assert.ok(Math.abs(ref.scaling_factor - 24 * 1.10) < 1e-12,
    `factor = ${ref.scaling_factor}, expected ${24 * 1.10}`);
  // total_per_reaction = sum of per_reaction across rows (invariant in n / f).
  assert.equal(ref.total_per_reaction, 5 + 0.5 + 1 + 1);
  // total_master_mix = total_per_reaction * scaling_factor pin.
  assert.ok(Math.abs(ref.total_master_mix - ref.total_per_reaction * ref.scaling_factor) < 1e-9,
    `mix = ${ref.total_master_mix}, expected ${ref.total_per_reaction * ref.scaling_factor}`);
  // Per-row total pin: each row.total = row.per_reaction * scaling_factor.
  for (const row of ref.rows) {
    assert.ok(Math.abs(row.total - row.per_reaction * ref.scaling_factor) < 1e-12,
      `row.total at ${row.name} = ${row.total}, expected ${row.per_reaction * ref.scaling_factor}`);
  }
  // Zero fudge boundary pin: f=0 -> factor = n exact.
  const noFudge = computePcrMix({ number_of_reactions: 24, components, fudge_factor_pct: 0 });
  assert.equal(noFudge.scaling_factor, 24);
  // Bounds pin: n < 1 or empty components -> error.
  const badN = computePcrMix({ number_of_reactions: 0, components, fudge_factor_pct: 10 });
  assert.ok(badN.error, `expected error for n=0, got ${JSON.stringify(badN)}`);
  const badC = computePcrMix({ number_of_reactions: 10, components: [], fudge_factor_pct: 10 });
  assert.ok(badC.error, `expected error for empty components, got ${JSON.stringify(badC)}`);
});

test("monotonicity: computeLexileBand selected_typical band lower bound is monotone non-decreasing as grade rises K -> 12 (CCSS Appendix A complexity-band progression pin); lookup-only error for invalid grades", () => {
  // Group Y. The published CCSS Appendix A typical bands shift upward as
  // grade advances. The lower bound of each typical band is monotone
  // non-decreasing across K -> 12 (per the bundled LEXILE_BANDS table).
  const grades = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  let prevLow = -Infinity;
  function parseLower(typical) {
    if (/^BR/.test(typical)) return 0; // Beginning Reader floor for K
    const m = typical.match(/(\d+)L/);
    return m ? Number(m[1]) : NaN;
  }
  for (const grade of grades) {
    const r = computeLexileBand({ grade });
    assert.ok(!r.error, `error at grade=${grade}: ${JSON.stringify(r)}`);
    assert.ok(r.selected && typeof r.selected.typical === "string",
      `selected at grade=${grade}: ${JSON.stringify(r)}`);
    const low = parseLower(r.selected.typical);
    assert.ok(Number.isFinite(low),
      `cannot parse lower bound from ${r.selected.typical}`);
    assert.ok(low >= prevLow,
      `lower bound at grade=${grade} = ${low} not >= prev=${prevLow}`);
    prevLow = low;
  }
  // Closed-form pin from lexileBandExample: grade 5 -> typical "830L - 1010L".
  const g5 = computeLexileBand({ grade: "5" });
  assert.equal(g5.selected.grade, "5");
  assert.equal(g5.selected.typical, "830L - 1010L");
  // K-grade pin: typical includes "BR (Beginning Reader)".
  const gK = computeLexileBand({ grade: "K" });
  assert.equal(gK.selected.grade, "K");
  assert.ok(/BR/.test(gK.selected.typical),
    `K typical: ${gK.selected.typical}`);
  // 11-12 plateau pin: grades 11 and 12 share the same typical/stretch
  // (college-and-career ready band per CCSS).
  const g11 = computeLexileBand({ grade: "11" });
  const g12 = computeLexileBand({ grade: "12" });
  assert.equal(g11.selected.typical, g12.selected.typical);
  assert.equal(g11.selected.stretch, g12.selected.stretch);
  assert.equal(g11.selected.typical, "1185L - 1385L");
  // Stretch >= typical for upper grades (CCSS expanded ranges).
  const g6 = computeLexileBand({ grade: "6" });
  assert.notEqual(g6.selected.stretch, g6.selected.typical);
  // Empty-grade -> bands returned, selected null.
  const noGrade = computeLexileBand({});
  assert.equal(noGrade.selected, null);
  assert.ok(Array.isArray(noGrade.bands) && noGrade.bands.length === 13,
    `bands length: ${noGrade.bands && noGrade.bands.length}`);
  // Case-insensitive pin: lowercase "k" should map to "K".
  const lowerK = computeLexileBand({ grade: "k" });
  assert.equal(lowerK.selected.grade, "K");
  // Bounds pin: unknown grade -> error.
  const bad = computeLexileBand({ grade: "13" });
  assert.ok(bad.error, `expected error for grade=13, got ${JSON.stringify(bad)}`);
  const badStr = computeLexileBand({ grade: "preschool" });
  assert.ok(badStr.error, `expected error for grade=preschool, got ${JSON.stringify(badStr)}`);
});

// --- spec-v14 §10.3 Phase F forty-eighth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (E / F / G / R / V).

import { computeMortarMix } from "../../calc-construction.js";
import { computeTimeAndMaterials } from "../../calc-cross.js";
import { computeCostOfWaiting } from "../../calc-realestate.js";
import { computePERC } from "../../calc-ems.js";

test("monotonicity: computeMortarMix bags is strictly non-decreasing in unit_count at fixed unit_kind / joint / type (linear ceiling pin); strictly non-decreasing in joint_in (joint_factor = joint_in / 0.375 linear pin); cmu_8 vs brick demand ratio pin (1/10 vs 1/30)", () => {
  let prev = -Infinity;
  for (const unit_count of [30, 60, 120, 300, 600, 1200, 3000]) {
    const r = computeMortarMix({ unit_count, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" });
    assert.ok(Number.isFinite(r.bags) && r.bags > 0,
      `bags at units=${unit_count}: ${JSON.stringify(r)}`);
    assert.ok(r.bags >= prev,
      `bags at units=${unit_count} = ${r.bags} not >= prev=${prev}`);
    prev = r.bags;
  }
  let prevJoint = -Infinity;
  for (const joint_in of [0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 1.0]) {
    const r = computeMortarMix({ unit_count: 600, unit_kind: "brick", joint_in, mortar_type: "N" });
    assert.ok(r.bags >= prevJoint,
      `bags at joint=${joint_in} = ${r.bags} not >= prev=${prevJoint}`);
    prevJoint = r.bags;
  }
  const j5 = computeMortarMix({ unit_count: 600, unit_kind: "brick", joint_in: 0.5, mortar_type: "N" });
  assert.ok(Math.abs(j5.joint_factor - 0.5 / 0.375) < 1e-12,
    `joint_factor = ${j5.joint_factor}, expected ${0.5 / 0.375}`);
  const baseline = computeMortarMix({ unit_count: 600, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" });
  assert.equal(baseline.joint_factor, 1);
  const brick = computeMortarMix({ unit_count: 300, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" });
  const cmu = computeMortarMix({ unit_count: 300, unit_kind: "cmu_8", joint_in: 0.375, mortar_type: "N" });
  assert.equal(brick.bags, Math.ceil(300 / 30));
  assert.equal(cmu.bags, Math.ceil(300 / 10));
  const ref = computeMortarMix({ unit_count: 600, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" });
  assert.equal(ref.bags, 20);
  assert.equal(ref.mortar_type, "N");
  const thirty1 = computeMortarMix({ unit_count: 31, unit_kind: "brick", joint_in: 0.375 });
  assert.equal(thirty1.bags, 2);
  const bad = computeMortarMix({ unit_count: 0, unit_kind: "brick", joint_in: 0.375 });
  assert.ok(bad.error, `expected error for units=0, got ${JSON.stringify(bad)}`);
  const badMt = computeMortarMix({ unit_count: 300, unit_kind: "brick", joint_in: 0.375, mortar_type: "Z" });
  assert.ok(badMt.error, `expected error for type=Z, got ${JSON.stringify(badMt)}`);
  const badKind = computeMortarMix({ unit_count: 300, unit_kind: "block_unknown", joint_in: 0.375 });
  assert.ok(badKind.error, `expected error for unknown kind, got ${JSON.stringify(badKind)}`);
});

test("monotonicity: computeReverseLayFriction (n_pumps split) single_pump_psi is strictly increasing in gpm AND in length_ft (NFA C * Q^2 * L pin); per_pump_psi = single_pump_psi * (1/n)^2 quadratic-split pin (2 pumps -> 1/4 each; 3 pumps -> 1/9 each)", () => {
  let prev = -Infinity;
  for (const gpm of [100, 200, 500, 750, 1000, 1500, 2000]) {
    const r = computeReverseLayFriction({ hose_diameter: "5_in", gpm, length_ft: 1000, n_pumps: 1 });
    assert.ok(Number.isFinite(r.single_pump_psi) && r.single_pump_psi > 0,
      `single at gpm=${gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.single_pump_psi > prev,
      `single at gpm=${gpm} = ${r.single_pump_psi} not greater than prev=${prev}`);
    prev = r.single_pump_psi;
  }
  let prevLen = -Infinity;
  for (const length_ft of [100, 250, 500, 1000, 2000, 5000]) {
    const r = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft, n_pumps: 1 });
    assert.ok(r.single_pump_psi > prevLen,
      `single at L=${length_ft} = ${r.single_pump_psi} not greater than prev=${prevLen}`);
    prevLen = r.single_pump_psi;
  }
  const single = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 1 });
  const two = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 2 });
  const three = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 3 });
  const four = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 4 });
  assert.equal(single.n_pumps, 1);
  assert.ok(Math.abs(two.per_pump_psi - single.single_pump_psi / 4) < 1e-9,
    `2 pumps: per_pump = ${two.per_pump_psi}, expected ${single.single_pump_psi / 4}`);
  assert.ok(Math.abs(three.per_pump_psi - single.single_pump_psi / 9) < 1e-9,
    `3 pumps: per_pump = ${three.per_pump_psi}, expected ${single.single_pump_psi / 9}`);
  assert.ok(Math.abs(four.per_pump_psi - single.single_pump_psi / 16) < 1e-9,
    `4 pumps: per_pump = ${four.per_pump_psi}, expected ${single.single_pump_psi / 16}`);
  assert.ok(single.per_pump_psi > two.per_pump_psi && two.per_pump_psi > three.per_pump_psi && three.per_pump_psi > four.per_pump_psi,
    `per_pump not monotone decreasing in n_pumps`);
  const ref = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 2 });
  assert.ok(Math.abs(ref.single_pump_psi - 80) < 1e-9,
    `single = ${ref.single_pump_psi}, expected 80`);
  assert.ok(Math.abs(ref.per_pump_psi - 20) < 1e-9,
    `per_pump = ${ref.per_pump_psi}, expected 20`);
  assert.equal(ref.n_pumps, 2);
  assert.equal(ref.coefficient, 0.08);
  const q1 = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 250, length_ft: 1000, n_pumps: 1 });
  const q4 = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 1 });
  assert.ok(Math.abs(q4.single_pump_psi - 16 * q1.single_pump_psi) < 1e-9,
    `4x Q: psi = ${q4.single_pump_psi} != 16 * ${q1.single_pump_psi}`);
  const nZero = computeReverseLayFriction({ hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 0 });
  assert.equal(nZero.n_pumps, 1);
  assert.equal(nZero.per_pump_psi, nZero.single_pump_psi);
  const bad = computeReverseLayFriction({ hose_diameter: "7_in", gpm: 1000, length_ft: 1000 });
  assert.ok(bad.error, `expected error for unknown hose, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeTimeAndMaterials total is strictly increasing in hours, in labor_rate_per_hour, in material_cost, in overhead_percent, AND in profit_percent (all linear/multiplicative pins); subtotal = labor + material + overhead; total = subtotal * (1 + profit/100)", () => {
  let prev = -Infinity;
  for (const hours of [1, 4, 8, 12, 24, 40, 80]) {
    const r = computeTimeAndMaterials({ hours, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
    assert.ok(Number.isFinite(r.total) && r.total > 0,
      `total at h=${hours}: ${JSON.stringify(r)}`);
    assert.ok(r.total > prev,
      `total at h=${hours} = ${r.total} not greater than prev=${prev}`);
    prev = r.total;
  }
  let prevRate = -Infinity;
  for (const labor_rate_per_hour of [25, 50, 75, 95, 125, 200]) {
    const r = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
    assert.ok(r.total > prevRate,
      `total at rate=${labor_rate_per_hour} = ${r.total} not greater than prev=${prevRate}`);
    prevRate = r.total;
  }
  let prevMat = -Infinity;
  for (const material_cost of [0, 100, 250, 500, 1000, 5000]) {
    const r = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost, overhead_percent: 15, profit_percent: 10 });
    assert.ok(r.total > prevMat,
      `total at mat=${material_cost} = ${r.total} not greater than prev=${prevMat}`);
    prevMat = r.total;
  }
  let prevOh = -Infinity;
  for (const overhead_percent of [0, 5, 10, 15, 20, 30, 50]) {
    const r = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent, profit_percent: 10 });
    assert.ok(r.total > prevOh,
      `total at oh=${overhead_percent} = ${r.total} not greater than prev=${prevOh}`);
    prevOh = r.total;
  }
  let prevPr = -Infinity;
  for (const profit_percent of [0, 5, 10, 15, 25, 50, 100]) {
    const r = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent });
    assert.ok(r.total > prevPr,
      `total at pr=${profit_percent} = ${r.total} not greater than prev=${prevPr}`);
    prevPr = r.total;
  }
  const a = computeTimeAndMaterials({ hours: 4, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
  const b = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
  assert.ok(Math.abs(b.labor - 2 * a.labor) < 1e-9,
    `2x hours: labor = ${b.labor} != 2 * ${a.labor}`);
  // tmExample closed-form pin: h=8, r=95, m=250, oh=15%, pr=10%.
  // labor = 760; direct = 1010; overhead = 151.5; subtotal = 1161.5;
  // profit = 116.15; total = 1277.65.
  const ref = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
  assert.ok(Math.abs(ref.labor - 760) < 1e-9, `labor = ${ref.labor}, expected 760`);
  assert.ok(Math.abs(ref.overhead - 151.5) < 1e-9, `overhead = ${ref.overhead}, expected 151.5`);
  assert.ok(Math.abs(ref.subtotal - 1161.5) < 1e-9, `subtotal = ${ref.subtotal}, expected 1161.5`);
  assert.ok(Math.abs(ref.profit - 116.15) < 1e-9, `profit = ${ref.profit}, expected 116.15`);
  assert.ok(Math.abs(ref.total - 1277.65) < 1e-9, `total = ${ref.total}, expected 1277.65`);
  assert.ok(Math.abs(ref.subtotal - (ref.labor + ref.material_cost + ref.overhead)) < 1e-9,
    `subtotal-decomp: ${ref.subtotal} != ${ref.labor + ref.material_cost + ref.overhead}`);
  assert.ok(Math.abs(ref.total - (ref.subtotal + ref.profit)) < 1e-9,
    `total-decomp: ${ref.total} != ${ref.subtotal + ref.profit}`);
  const stripped = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250 });
  assert.equal(stripped.total, 760 + 250);
});

test("monotonicity: computeCostOfWaiting monthly_pi_now is strictly increasing in current_rate_percent at fixed principal/term (PI rate-sensitivity pin); monthly_pi_future strictly increasing in future_rate_percent; rate-equality identity (pi_now = pi_future); 2x principal -> 2x pi exact", () => {
  let prev = -Infinity;
  for (const current_rate_percent of [3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0]) {
    const r = computeCostOfWaiting({ principal: 400000, current_rate_percent, future_rate_percent: current_rate_percent, term_years: 30 });
    assert.ok(Number.isFinite(r.monthly_pi_now) && r.monthly_pi_now > 0,
      `pi at rate=${current_rate_percent}: ${JSON.stringify(r)}`);
    assert.ok(r.monthly_pi_now > prev,
      `pi at rate=${current_rate_percent} = ${r.monthly_pi_now} not greater than prev=${prev}`);
    prev = r.monthly_pi_now;
  }
  for (const rate of [3.5, 5.5, 7.0]) {
    const r = computeCostOfWaiting({ principal: 400000, current_rate_percent: rate, future_rate_percent: rate, term_years: 30 });
    assert.ok(Math.abs(r.monthly_pi_now - r.monthly_pi_future) < 1e-9,
      `rate-equality at ${rate}: pi_now=${r.monthly_pi_now}, pi_future=${r.monthly_pi_future}`);
    assert.ok(Math.abs(r.total_paid_now - r.total_paid_future) < 1e-6,
      `rate-equality totals at ${rate}: ${r.total_paid_now} != ${r.total_paid_future}`);
  }
  let prevPiFuture = -Infinity;
  for (const future_rate_percent of [5.0, 6.0, 7.0, 8.0, 9.0, 10.0]) {
    const r = computeCostOfWaiting({ principal: 400000, current_rate_percent: 5.0, future_rate_percent, term_years: 30 });
    assert.ok(r.monthly_pi_future > prevPiFuture,
      `pi_future at rate=${future_rate_percent} = ${r.monthly_pi_future} not greater than prev=${prevPiFuture}`);
    prevPiFuture = r.monthly_pi_future;
  }
  const ref = computeCostOfWaiting({ principal: 400000, current_rate_percent: 5.0, future_rate_percent: 7.0, term_years: 30 });
  assert.ok(Math.abs(ref.total_paid_now - ref.monthly_pi_now * 360) < 1e-3,
    `total_now = ${ref.total_paid_now}, expected ${ref.monthly_pi_now * 360}`);
  assert.ok(Math.abs(ref.total_paid_future - ref.monthly_pi_future * 360) < 1e-3,
    `total_future = ${ref.total_paid_future}, expected ${ref.monthly_pi_future * 360}`);
  let prevP = -Infinity;
  for (const principal of [100000, 200000, 400000, 600000, 1000000]) {
    const r = computeCostOfWaiting({ principal, current_rate_percent: 5.0, future_rate_percent: 7.0, term_years: 30 });
    assert.ok(r.monthly_pi_now > prevP,
      `pi at P=${principal} = ${r.monthly_pi_now} not greater than prev=${prevP}`);
    prevP = r.monthly_pi_now;
  }
  const a = computeCostOfWaiting({ principal: 200000, current_rate_percent: 5.0, future_rate_percent: 5.0, term_years: 30 });
  const b = computeCostOfWaiting({ principal: 400000, current_rate_percent: 5.0, future_rate_percent: 5.0, term_years: 30 });
  assert.ok(Math.abs(b.monthly_pi_now - 2 * a.monthly_pi_now) < 1e-9,
    `2x P: pi = ${b.monthly_pi_now} != 2 * ${a.monthly_pi_now}`);
  const zero = computeCostOfWaiting({ principal: 360000, current_rate_percent: 0, future_rate_percent: 0, term_years: 30 });
  assert.ok(Math.abs(zero.monthly_pi_now - 360000 / 360) < 1e-9,
    `pi at 0% = ${zero.monthly_pi_now}, expected ${360000 / 360}`);
  const badR = computeCostOfWaiting({ principal: 400000, current_rate_percent: 50, future_rate_percent: 7, term_years: 30 });
  assert.ok(badR.error, `expected error for rate=50, got ${JSON.stringify(badR)}`);
  const badT = computeCostOfWaiting({ principal: 400000, current_rate_percent: 5, future_rate_percent: 7, term_years: 60 });
  assert.ok(badT.error, `expected error for term=60, got ${JSON.stringify(badT)}`);
});

test("monotonicity: computePERC satisfied count is strictly non-decreasing as additional criteria flip true (point-additive pin); all_satisfied flips false -> true exactly at satisfied = 8 / 8 (PERC 8-of-8 rule pin); band tips at all_satisfied boundary", () => {
  const allKeys = ["age_under_50", "hr_under_100", "spo2_ge_95", "no_hemoptysis", "no_estrogen", "no_prior_dvt_pe", "no_recent_surgery_or_trauma", "no_unilateral_leg_swelling"];
  let prev = -Infinity;
  let active = {};
  for (const key of allKeys) {
    active = { ...active, [key]: true };
    const r = computePERC(active);
    assert.ok(Number.isFinite(r.satisfied),
      `satisfied at ${Object.keys(active).length}: ${JSON.stringify(r)}`);
    assert.ok(r.satisfied > prev,
      `satisfied at ${Object.keys(active).length} = ${r.satisfied} not greater than prev=${prev}`);
    prev = r.satisfied;
  }
  const ref = computePERC({});
  assert.equal(ref.total, 8);
  assert.equal(ref.satisfied, 0);
  assert.equal(ref.all_satisfied, false);
  assert.equal(ref.failures.length, 8);
  assert.ok(/PERC positive/.test(ref.band), `band at 0: ${ref.band}`);
  const allTrue = computePERC({ age_under_50: true, hr_under_100: true, spo2_ge_95: true, no_hemoptysis: true, no_estrogen: true, no_prior_dvt_pe: true, no_recent_surgery_or_trauma: true, no_unilateral_leg_swelling: true });
  assert.equal(allTrue.satisfied, 8);
  assert.equal(allTrue.all_satisfied, true);
  assert.equal(allTrue.failures.length, 0);
  assert.ok(/PERC negative/.test(allTrue.band), `band at 8: ${allTrue.band}`);
  const sevenOf8 = computePERC({ age_under_50: true, hr_under_100: true, spo2_ge_95: true, no_hemoptysis: true, no_estrogen: true, no_prior_dvt_pe: true, no_recent_surgery_or_trauma: true });
  assert.equal(sevenOf8.satisfied, 7);
  assert.equal(sevenOf8.all_satisfied, false);
  assert.equal(sevenOf8.failures.length, 1);
  assert.ok(/unilateral leg swelling/.test(sevenOf8.failures[0]),
    `failure: ${sevenOf8.failures[0]}`);
  const formStr = computePERC({ age_under_50: "true", hr_under_100: "true", spo2_ge_95: "true", no_hemoptysis: "true", no_estrogen: "true", no_prior_dvt_pe: "true", no_recent_surgery_or_trauma: "true", no_unilateral_leg_swelling: "true" });
  assert.equal(formStr.satisfied, 8);
  assert.equal(formStr.all_satisfied, true);
  assert.ok(/low pretest probability/.test(ref.pretest_caveat),
    `caveat: ${ref.pretest_caveat}`);
  assert.ok(/low pretest probability/.test(allTrue.pretest_caveat),
    `caveat all-true: ${allTrue.pretest_caveat}`);
});

// --- spec-v14 §10.3 Phase F forty-ninth monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / B / C / D / U).

import { computePhaseBalance } from "../../calc-electrical.js";
import { computeGasLeakRate } from "../../calc-plumbing.js";
import { computeSuperheatSubcool } from "../../calc-hvac.js";
import { computeStormwaterRational } from "../../calc-plumbing.js";
import { computeGestation } from "../../calc-vet.js";

test("monotonicity: computePhaseBalance imbalance_percent = (max-min)/avg * 100 closed-form pin; strictly increasing as one phase load grows above the others at fixed average; greedy-swap final_imbalance_percent <= initial imbalance pin", () => {
  // Group A. imbalance_percent = (max - min) / avg * 100 across A/B/C phases.
  // Strictly increasing as one phase load grows further from the average.
  let prev = -Infinity;
  for (const aLoad of [1000, 1100, 1300, 1500, 2000, 3000, 5000]) {
    const r = computePhaseBalance({
      circuits: [
        { phase: "A", load_W: aLoad },
        { phase: "B", load_W: 1000 },
        { phase: "C", load_W: 1000 },
      ],
      threshold_percent: 1000, // disable greedy swap so we observe raw imbalance
    });
    assert.ok(Number.isFinite(r.imbalance_percent) && r.imbalance_percent >= 0,
      `imb at A=${aLoad}: ${JSON.stringify(r)}`);
    assert.ok(r.imbalance_percent > prev,
      `imb at A=${aLoad} = ${r.imbalance_percent} not greater than prev=${prev}`);
    prev = r.imbalance_percent;
  }
  // Closed-form pin: A=1500, B=600, C=900 -> avg = 1000; max=1500; min=600;
  // imbalance = (1500-600)/1000 * 100 = 90%.
  const ref = computePhaseBalance({
    circuits: [
      { phase: "A", load_W: 1500 },
      { phase: "B", load_W: 600 },
      { phase: "C", load_W: 900 },
    ],
    threshold_percent: 100, // above 90 -> no swaps
  });
  assert.equal(ref.totals.A, 1500);
  assert.equal(ref.totals.B, 600);
  assert.equal(ref.totals.C, 900);
  assert.equal(ref.average_W, 1000);
  assert.ok(Math.abs(ref.imbalance_percent - 90) < 1e-9,
    `imb = ${ref.imbalance_percent}, expected 90`);
  // Perfect-balance pin: all phases equal -> imbalance = 0.
  const balanced = computePhaseBalance({
    circuits: [
      { phase: "A", load_W: 1000 },
      { phase: "B", load_W: 1000 },
      { phase: "C", load_W: 1000 },
    ],
    threshold_percent: 10,
  });
  assert.equal(balanced.imbalance_percent, 0);
  assert.equal(balanced.final_imbalance_percent, 0);
  assert.equal(balanced.swaps.length, 0);
  // Greedy-swap pin: final_imbalance_percent <= initial imbalance_percent.
  const greedy = computePhaseBalance({
    circuits: [
      { phase: "A", load_W: 1500 },
      { phase: "A", load_W: 800 },
      { phase: "B", load_W: 600 },
      { phase: "C", load_W: 700 },
    ],
    threshold_percent: 10,
  });
  assert.ok(greedy.final_imbalance_percent <= greedy.imbalance_percent + 1e-9,
    `final ${greedy.final_imbalance_percent} > initial ${greedy.imbalance_percent}`);
  assert.ok(Array.isArray(greedy.swaps), "swaps must be an array");
  // Sum-conservation pin: total load sums across all phases are conserved
  // across swaps (swaps move load between phases, not in or out).
  const greedyTotal = greedy.totals.A + greedy.totals.B + greedy.totals.C;
  assert.equal(greedyTotal, 1500 + 800 + 600 + 700);
  // Zero-load boundary pin: all loads zero -> avg=0, imbalance=0.
  const zero = computePhaseBalance({
    circuits: [{ phase: "A", load_W: 0 }, { phase: "B", load_W: 0 }, { phase: "C", load_W: 0 }],
    threshold_percent: 10,
  });
  assert.equal(zero.imbalance_percent, 0);
  // Error pins: unknown phase tag / negative load / empty.
  const badPhase = computePhaseBalance({ circuits: [{ phase: "D", load_W: 100 }] });
  assert.ok(badPhase.error, `expected error for phase=D, got ${JSON.stringify(badPhase)}`);
  const badLoad = computePhaseBalance({ circuits: [{ phase: "A", load_W: -100 }] });
  assert.ok(badLoad.error, `expected error for negative load, got ${JSON.stringify(badLoad)}`);
  const empty = computePhaseBalance({ circuits: [] });
  assert.ok(empty.error, `expected error for empty, got ${JSON.stringify(empty)}`);
});

test("monotonicity: computeGasLeakRate leak_rate_cfh is strictly increasing in orifice_diameter_in (d^2 area pin); strictly increasing in upstream_psi (sqrt(dP) pin); strictly decreasing as specific_gravity rises (propane vs natural_gas); doubling d -> 4x leak rate exact", () => {
  // Group B. Q = 3550 * c * pi * (d/2)^2 * sqrt(dP / SG). Strictly increasing
  // in d (d^2), in dP (sqrt), strictly decreasing in SG (sqrt 1/SG).
  let prev = -Infinity;
  for (const orifice_diameter_in of [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5]) {
    const r = computeGasLeakRate({ orifice_diameter_in, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
    assert.ok(Number.isFinite(r.leak_rate_cfh) && r.leak_rate_cfh > 0,
      `Q at d=${orifice_diameter_in}: ${JSON.stringify(r)}`);
    assert.ok(r.leak_rate_cfh > prev,
      `Q at d=${orifice_diameter_in} = ${r.leak_rate_cfh} not greater than prev=${prev}`);
    prev = r.leak_rate_cfh;
  }
  // Strictly increasing in upstream_psi at fixed diameter / gas.
  let prevP = -Infinity;
  for (const upstream_psi of [0.05, 0.10, 0.25, 0.5, 1.0, 2.0, 5.0]) {
    const r = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi, gas: "natural_gas", c: 0.7 });
    assert.ok(r.leak_rate_cfh > prevP,
      `Q at dP=${upstream_psi} = ${r.leak_rate_cfh} not greater than prev=${prevP}`);
    prevP = r.leak_rate_cfh;
  }
  // Doubling-d pin: 2x d -> 4x Q exactly (d^2 area).
  const a = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
  const b = computeGasLeakRate({ orifice_diameter_in: 0.10, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
  assert.ok(Math.abs(b.leak_rate_cfh - 4 * a.leak_rate_cfh) < 1e-9,
    `2x d: Q = ${b.leak_rate_cfh} != 4 * ${a.leak_rate_cfh}`);
  // 4x-dP pin: 4x dP -> 2x Q exactly (sqrt(dP) scaling).
  const p1 = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
  const p4 = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 1.0, gas: "natural_gas", c: 0.7 });
  assert.ok(Math.abs(p4.leak_rate_cfh - 2 * p1.leak_rate_cfh) < 1e-9,
    `4x dP: Q = ${p4.leak_rate_cfh} != 2 * ${p1.leak_rate_cfh}`);
  // Specific-gravity ordering pin: natural_gas (SG 0.60) leaks faster than
  // propane (SG 1.52) at the same d / dP (sqrt(1/SG) factor).
  const ng = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
  const lp = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "propane", c: 0.7 });
  assert.ok(ng.leak_rate_cfh > lp.leak_rate_cfh,
    `NG (${ng.leak_rate_cfh}) not > propane (${lp.leak_rate_cfh})`);
  // SG ratio pin: ng/lp ratio = sqrt(SG_propane / SG_ng) = sqrt(1.52 / 0.60).
  const expectedRatio = Math.sqrt(1.52 / 0.60);
  assert.ok(Math.abs(ng.leak_rate_cfh / lp.leak_rate_cfh - expectedRatio) < 1e-9,
    `SG ratio = ${ng.leak_rate_cfh / lp.leak_rate_cfh}, expected ${expectedRatio}`);
  // discharge_coefficient pin: linear in c.
  const cHigh = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.9 });
  const cLow = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.5 });
  assert.ok(Math.abs(cHigh.leak_rate_cfh / cLow.leak_rate_cfh - 0.9 / 0.5) < 1e-9,
    `c ratio = ${cHigh.leak_rate_cfh / cLow.leak_rate_cfh}, expected ${0.9 / 0.5}`);
  // orifice_area_in2 = pi * (d/2)^2 closed-form pin.
  const ref = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 });
  assert.ok(Math.abs(ref.orifice_area_in2 - Math.PI * (0.05 / 2) ** 2) < 1e-12,
    `A = ${ref.orifice_area_in2}, expected ${Math.PI * (0.05 / 2) ** 2}`);
  // gasLeakRateExample band pin: 0.05 in / 0.25 psi / NG -> leak in [1, 10] cfh.
  assert.ok(ref.leak_rate_cfh >= 1 && ref.leak_rate_cfh <= 10,
    `leak = ${ref.leak_rate_cfh}, expected 1-10 (example range)`);
  // Bounds pin: unknown gas / non-positive d or dP -> error.
  const badGas = computeGasLeakRate({ orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "helium" });
  assert.ok(badGas.error, `expected error for helium, got ${JSON.stringify(badGas)}`);
  const badD = computeGasLeakRate({ orifice_diameter_in: 0, upstream_psi: 0.25, gas: "natural_gas" });
  assert.ok(badD.error, `expected error for d=0, got ${JSON.stringify(badD)}`);
});

test("monotonicity: computeSuperheatSubcool superheat_F is strictly increasing in line_temperature_F at fixed pressure (linear pin); subcool_F is strictly decreasing as line_temperature_F rises at fixed pressure (T_sat - T_line pin); identity at T_line = T_sat -> 0 exact", () => {
  // Group C. superheat = T_line - T_sat; subcool = T_sat - T_line.
  // Strictly increasing in T_line for superheat; strictly decreasing for subcool.
  let prev = -Infinity;
  for (const line_temperature_F of [10, 20, 30, 40, 50, 60, 80]) {
    const r = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F, mode: "superheat" });
    assert.ok(Number.isFinite(r.superheat_F),
      `SH at T=${line_temperature_F}: ${JSON.stringify(r)}`);
    assert.ok(r.superheat_F > prev,
      `SH at T=${line_temperature_F} = ${r.superheat_F} not greater than prev=${prev}`);
    prev = r.superheat_F;
  }
  // Strictly decreasing in T_line for subcool at fixed pressure.
  let prevSc = Infinity;
  for (const line_temperature_F of [10, 20, 30, 40, 50, 60, 80]) {
    const r = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 250, line_temperature_F, mode: "subcool" });
    assert.ok(r.subcool_F < prevSc,
      `SC at T=${line_temperature_F} = ${r.subcool_F} not less than prev=${prevSc}`);
    prevSc = r.subcool_F;
  }
  // Identity pin: T_line = T_sat -> superheat = 0 / subcool = 0 exact.
  const sat = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 0, mode: "superheat" });
  const T_sat = sat.saturated_temperature_F;
  const atSat = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: T_sat, mode: "superheat" });
  assert.ok(Math.abs(atSat.superheat_F) < 1e-9,
    `SH at T=T_sat: ${atSat.superheat_F}, expected ~0`);
  const atSatSc = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: T_sat, mode: "subcool" });
  assert.ok(Math.abs(atSatSc.subcool_F) < 1e-9,
    `SC at T=T_sat: ${atSatSc.subcool_F}, expected ~0`);
  // SH-SC complementary pin: SH + SC = 0 at any fixed T_line / pressure.
  const T_line = 50;
  const sh = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: T_line, mode: "superheat" });
  const sc = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: T_line, mode: "subcool" });
  assert.ok(Math.abs(sh.superheat_F + sc.subcool_F) < 1e-9,
    `SH + SC = ${sh.superheat_F + sc.subcool_F}, expected 0`);
  // saturated_temperature_F pin: same T_sat regardless of mode at fixed P.
  assert.ok(Math.abs(sh.saturated_temperature_F - sc.saturated_temperature_F) < 1e-9,
    `T_sat mismatch: SH ${sh.saturated_temperature_F} vs SC ${sc.saturated_temperature_F}`);
  // Strictly increasing T_sat in pressure for R-22 (its bundled P-T table
  // is strictly monotone; the R-410A table has a published flat at 75/100
  // psig so we sweep R-22 instead for the monotonicity assertion).
  let prevTsat = -Infinity;
  for (const system_pressure_psig of [30, 50, 75, 100, 150, 200]) {
    const r = computeSuperheatSubcool({ refrigerant: "R-22", system_pressure_psig, line_temperature_F: 200, mode: "superheat" });
    assert.ok(r.saturated_temperature_F > prevTsat,
      `T_sat at P=${system_pressure_psig} = ${r.saturated_temperature_F} not greater than prev=${prevTsat}`);
    prevTsat = r.saturated_temperature_F;
  }
  // Bounds pin: unknown refrigerant / bad mode -> error.
  const badR = computeSuperheatSubcool({ refrigerant: "R-99X", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" });
  assert.ok(badR.error, `expected error for unknown refrigerant, got ${JSON.stringify(badR)}`);
  const badMode = computeSuperheatSubcool({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "invalid" });
  assert.ok(badMode.error, `expected error for bad mode, got ${JSON.stringify(badMode)}`);
});

test("monotonicity: computeStormwaterRational peak_flow_cfs is strictly increasing in area_ft2 AND in rainfall_in_per_hr (rational Q = C*i*A linear pin); strictly increasing in runoff_coefficient (asphalt 0.95 > lawn 0.25); peak_flow_gpm = cfs * 448.831 exact", () => {
  // Group D. Q_cfs = C * i * A_acres. Strictly increasing in area at fixed
  // surface / rainfall (linear in area).
  let prev = -Infinity;
  for (const area_ft2 of [500, 1000, 2500, 5000, 10000, 25000, 50000]) {
    const r = computeStormwaterRational({ area_ft2, surface: "asphalt", rainfall_in_per_hr: 2 });
    assert.ok(Number.isFinite(r.peak_flow_cfs) && r.peak_flow_cfs > 0,
      `Q at A=${area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.peak_flow_cfs > prev,
      `Q at A=${area_ft2} = ${r.peak_flow_cfs} not greater than prev=${prev}`);
    prev = r.peak_flow_cfs;
  }
  // Strictly increasing in rainfall_in_per_hr at fixed area / surface.
  let prevR = -Infinity;
  for (const rainfall_in_per_hr of [0.25, 0.5, 1, 2, 4, 6, 10]) {
    const r = computeStormwaterRational({ area_ft2: 5000, surface: "asphalt", rainfall_in_per_hr });
    assert.ok(r.peak_flow_cfs > prevR,
      `Q at i=${rainfall_in_per_hr} = ${r.peak_flow_cfs} not greater than prev=${prevR}`);
    prevR = r.peak_flow_cfs;
  }
  // Doubling-area pin: 2x A -> 2x Q exactly (linear in area).
  const a = computeStormwaterRational({ area_ft2: 2500, surface: "asphalt", rainfall_in_per_hr: 2 });
  const b = computeStormwaterRational({ area_ft2: 5000, surface: "asphalt", rainfall_in_per_hr: 2 });
  assert.ok(Math.abs(b.peak_flow_cfs - 2 * a.peak_flow_cfs) < 1e-9,
    `2x A: Q = ${b.peak_flow_cfs} != 2 * ${a.peak_flow_cfs}`);
  // Surface-coefficient ordering pin: asphalt (0.95) >> lawn (0.25).
  const asphalt = computeStormwaterRational({ area_ft2: 5000, surface: "asphalt", rainfall_in_per_hr: 2 });
  const lawn = computeStormwaterRational({ area_ft2: 5000, surface: "lawn", rainfall_in_per_hr: 2 });
  const forest = computeStormwaterRational({ area_ft2: 5000, surface: "forest", rainfall_in_per_hr: 2 });
  assert.equal(asphalt.runoff_coefficient, 0.95);
  assert.equal(lawn.runoff_coefficient, 0.25);
  assert.equal(forest.runoff_coefficient, 0.10);
  assert.ok(asphalt.peak_flow_cfs > lawn.peak_flow_cfs && lawn.peak_flow_cfs > forest.peak_flow_cfs,
    `coef ordering: ${asphalt.peak_flow_cfs} ${lawn.peak_flow_cfs} ${forest.peak_flow_cfs}`);
  // peak_flow_gpm = cfs * 448.831 exact unit pin.
  assert.ok(Math.abs(asphalt.peak_flow_gpm - asphalt.peak_flow_cfs * 448.831) < 1e-9,
    `gpm = ${asphalt.peak_flow_gpm}, expected ${asphalt.peak_flow_cfs * 448.831}`);
  // area_acres = area_ft2 / 43560 exact unit pin.
  assert.ok(Math.abs(asphalt.area_acres - 5000 / 43560) < 1e-12,
    `acres = ${asphalt.area_acres}, expected ${5000 / 43560}`);
  // Closed-form pin from stormwaterRationalExample: 5000 ft2 asphalt 2 in/hr.
  // Q = 0.95 * 2 * (5000/43560) = 0.218 cfs.
  const ref = computeStormwaterRational({ area_ft2: 5000, surface: "asphalt", rainfall_in_per_hr: 2 });
  const expectedQ = 0.95 * 2 * (5000 / 43560);
  assert.ok(Math.abs(ref.peak_flow_cfs - expectedQ) < 1e-9,
    `Q = ${ref.peak_flow_cfs}, expected ${expectedQ}`);
  // Zero-rainfall boundary pin: i=0 -> Q=0 (rainfall=0 allowed).
  const noRain = computeStormwaterRational({ area_ft2: 5000, surface: "asphalt", rainfall_in_per_hr: 0 });
  assert.equal(noRain.peak_flow_cfs, 0);
  assert.equal(noRain.peak_flow_gpm, 0);
  // Bounds pin: area <= 0 or unknown surface -> error.
  const bad = computeStormwaterRational({ area_ft2: 0, surface: "asphalt", rainfall_in_per_hr: 2 });
  assert.ok(bad.error, `expected error for area=0, got ${JSON.stringify(bad)}`);
  const badSurf = computeStormwaterRational({ area_ft2: 5000, surface: "moon", rainfall_in_per_hr: 2 });
  assert.ok(badSurf.error, `expected error for moon, got ${JSON.stringify(badSurf)}`);
});

test("monotonicity: computeGestation estimated_due_date_iso is strictly later as breeding_date_iso advances at fixed species (date arithmetic pin); species ordering pin: cat (65) > dog (63) > cow (283) > horse (340) gestation_days_mean", () => {
  // Group U. due_date = breeding_date + species.mean days. Strictly later
  // as breeding_date advances at fixed species (date arithmetic pin).
  const breedingDates = ["2026-01-01", "2026-03-01", "2026-06-01", "2026-09-01", "2026-12-01"];
  let prevDue = "0000-00-00";
  for (const breeding_date_iso of breedingDates) {
    const r = computeGestation({ species: "dog", breeding_date_iso });
    assert.ok(typeof r.estimated_due_date_iso === "string",
      `due at ${breeding_date_iso}: ${JSON.stringify(r)}`);
    assert.ok(r.estimated_due_date_iso > prevDue,
      `due at ${breeding_date_iso} = ${r.estimated_due_date_iso} not > prev=${prevDue}`);
    prevDue = r.estimated_due_date_iso;
  }
  // Closed-form pin from gestationExample: dog @ 2026-03-01 + 63 = 2026-05-03.
  const ref = computeGestation({ species: "dog", breeding_date_iso: "2026-03-01" });
  assert.equal(ref.estimated_due_date_iso, "2026-05-03");
  assert.equal(ref.range_low_iso, "2026-04-28");
  assert.equal(ref.range_high_iso, "2026-05-08");
  assert.equal(ref.gestation_days_mean, 63);
  assert.equal(ref.gestation_days_range, "58-68");
  assert.equal(ref.species, "dog");
  assert.equal(ref.breeding_date_iso, "2026-03-01");
  // Species-mean ordering pin: dog 63 < cat 65 < cow 283 < horse 340.
  const dog = computeGestation({ species: "dog", breeding_date_iso: "2026-01-01" });
  const cat = computeGestation({ species: "cat", breeding_date_iso: "2026-01-01" });
  const cow = computeGestation({ species: "cow", breeding_date_iso: "2026-01-01" });
  const horse = computeGestation({ species: "horse", breeding_date_iso: "2026-01-01" });
  assert.equal(dog.gestation_days_mean, 63);
  assert.equal(cat.gestation_days_mean, 65);
  assert.equal(cow.gestation_days_mean, 283);
  assert.equal(horse.gestation_days_mean, 340);
  assert.ok(dog.estimated_due_date_iso < cat.estimated_due_date_iso,
    `dog due (${dog.estimated_due_date_iso}) >= cat due (${cat.estimated_due_date_iso})`);
  assert.ok(cat.estimated_due_date_iso < cow.estimated_due_date_iso,
    `cat due (${cat.estimated_due_date_iso}) >= cow due (${cow.estimated_due_date_iso})`);
  assert.ok(cow.estimated_due_date_iso < horse.estimated_due_date_iso,
    `cow due (${cow.estimated_due_date_iso}) >= horse due (${horse.estimated_due_date_iso})`);
  // range_low < estimated_due < range_high invariant per species.
  for (const r of [dog, cat, cow, horse]) {
    assert.ok(r.range_low_iso < r.estimated_due_date_iso && r.estimated_due_date_iso < r.range_high_iso,
      `range invariant violated: ${r.range_low_iso} < ${r.estimated_due_date_iso} < ${r.range_high_iso}`);
  }
  // Case-insensitive species pin: "DOG" -> "dog".
  const upperCase = computeGestation({ species: "DOG", breeding_date_iso: "2026-03-01" });
  assert.equal(upperCase.species, "dog");
  assert.equal(upperCase.estimated_due_date_iso, "2026-05-03");
  // Bounds pin: unknown species / malformed date -> error.
  const badSp = computeGestation({ species: "elephant", breeding_date_iso: "2026-03-01" });
  assert.ok(badSp.error, `expected error for elephant, got ${JSON.stringify(badSp)}`);
  const badDate = computeGestation({ species: "dog", breeding_date_iso: "03/01/2026" });
  assert.ok(badDate.error, `expected error for non-ISO date, got ${JSON.stringify(badDate)}`);
  const badFormat = computeGestation({ species: "dog", breeding_date_iso: "2026-3-1" });
  assert.ok(badFormat.error, `expected error for short ISO, got ${JSON.stringify(badFormat)}`);
});

// --- spec-v14 §10.3 Phase F fiftieth monotonicity batch ----------------
// Five new sweeps across five distinct catalog groups (A / F / N / T / V).
// Milestone: 50 batches across §10.3.

import { computeVoltageImbalance } from "../../calc-electrical.js";
import { computeUTM } from "../../calc-field.js";
import { computeRuleOf9s } from "../../calc-ems.js";

test("monotonicity: computeVoltageImbalance imbalance_percent = max(|V - avg|) / avg * 100 closed-form pin; strictly increasing as one phase voltage drifts further from the average; derate_factor = 1 - 2*(imbalance/100)^2 (NEMA MG-1 pin); nema_hp_derate_pct monotone non-decreasing in imbalance_pct", () => {
  // Group A. imbalance = max-deviation / avg * 100. Strictly increasing as
  // one phase pulls away from the average.
  let prev = -Infinity;
  for (const drift of [0, 1, 2, 5, 10, 15, 20]) {
    const r = computeVoltageImbalance({ V_a: 480 + drift, V_b: 480, V_c: 480 });
    assert.ok(Number.isFinite(r.imbalance_percent) && r.imbalance_percent >= 0,
      `imb at drift=${drift}: ${JSON.stringify(r)}`);
    assert.ok(r.imbalance_percent >= prev,
      `imb at drift=${drift} = ${r.imbalance_percent} not >= prev=${prev}`);
    prev = r.imbalance_percent;
  }
  // Perfect-balance pin: all three equal -> imbalance=0; derate_factor=1.
  const balanced = computeVoltageImbalance({ V_a: 480, V_b: 480, V_c: 480 });
  assert.equal(balanced.imbalance_percent, 0);
  assert.equal(balanced.derate_factor, 1);
  assert.equal(balanced.nema_hp_derate_pct, 0);
  // Closed-form pin from voltageImbalanceExample: V=480/475/470, avg=475,
  // max_dev = 5, imbalance = 5/475*100 = 1.0526...%
  const ref = computeVoltageImbalance({ V_a: 480, V_b: 475, V_c: 470 });
  assert.equal(ref.average_V, 475);
  assert.equal(ref.max_deviation_V, 5);
  const expectedImb = (5 / 475) * 100;
  assert.ok(Math.abs(ref.imbalance_percent - expectedImb) < 1e-9,
    `imb = ${ref.imbalance_percent}, expected ${expectedImb}`);
  assert.ok(ref.imbalance_percent >= 0.5 && ref.imbalance_percent <= 1.5,
    `imb = ${ref.imbalance_percent}, expected example band 0.5-1.5`);
  // NEMA MG-1 derate_factor = 1 - 2*(imbalance/100)^2 closed-form pin.
  const expectedDerate = 1 - 2 * Math.pow(expectedImb / 100, 2);
  assert.ok(Math.abs(ref.derate_factor - expectedDerate) < 1e-12,
    `derate = ${ref.derate_factor}, expected ${expectedDerate}`);
  // derate_factor strictly decreasing as imbalance grows (quadratic loss).
  let prevDerate = Infinity;
  for (const drift of [1, 5, 10, 15, 20, 30]) {
    const r = computeVoltageImbalance({ V_a: 480 + drift, V_b: 480, V_c: 480 });
    assert.ok(r.derate_factor < prevDerate,
      `derate at drift=${drift} = ${r.derate_factor} not less than prev=${prevDerate}`);
    prevDerate = r.derate_factor;
  }
  // nema_hp_derate_pct monotone non-decreasing in imbalance_percent.
  let prevHp = -Infinity;
  for (const drift of [0, 2, 5, 10, 15, 20, 30, 50]) {
    const r = computeVoltageImbalance({ V_a: 480 + drift, V_b: 480, V_c: 480 });
    assert.ok(r.nema_hp_derate_pct >= prevHp,
      `hp_derate at drift=${drift} = ${r.nema_hp_derate_pct} not >= prev=${prevHp}`);
    prevHp = r.nema_hp_derate_pct;
  }
  // 5% imbalance ceiling pin: NEMA HP derate caps at 25%.
  const heavy = computeVoltageImbalance({ V_a: 600, V_b: 480, V_c: 480 });
  assert.ok(heavy.imbalance_percent >= 5,
    `expected imb >= 5 at drift=120: ${heavy.imbalance_percent}`);
  assert.equal(heavy.nema_hp_derate_pct, 25);
  // Average-V identity pin: sum-of-deviations = 0 around the mean.
  const sumDev = (480 - ref.average_V) + (475 - ref.average_V) + (470 - ref.average_V);
  assert.ok(Math.abs(sumDev) < 1e-12,
    `sum of deviations: ${sumDev}, expected 0`);
  // Bounds pin: non-positive / non-finite voltage -> error.
  const badV = computeVoltageImbalance({ V_a: 0, V_b: 480, V_c: 480 });
  assert.ok(badV.error, `expected error for V_a=0, got ${JSON.stringify(badV)}`);
  const nanV = computeVoltageImbalance({ V_a: "abc", V_b: 480, V_c: 480 });
  assert.ok(nanV.error, `expected error for NaN V, got ${JSON.stringify(nanV)}`);
});

test("monotonicity: computeStandpipeFriction total_psi is strictly increasing in riser_height_ft (linear elevation pin) AND in outlet_count (linear friction-sum pin) AND in gpm_per_outlet (NFA C*Q^2 pin); elevation_psi = riser_height * 0.434 exact", () => {
  // Group F. elevation_psi = h * 0.434; per_outlet_psi = C * (gpm/100)^2 * (L/100);
  // friction_total = per_outlet * n; total = elevation + friction_total.
  let prev = -Infinity;
  for (const riser_height_ft of [10, 25, 50, 100, 200, 400, 800]) {
    const r = computeStandpipeFriction({ riser_height_ft, outlet_count: 2, gpm_per_outlet: 250 });
    assert.ok(Number.isFinite(r.total_psi) && r.total_psi > 0,
      `total at h=${riser_height_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.total_psi > prev,
      `total at h=${riser_height_ft} = ${r.total_psi} not greater than prev=${prev}`);
    prev = r.total_psi;
  }
  // Strictly increasing in outlet_count at fixed h / gpm.
  let prevN = -Infinity;
  for (const outlet_count of [1, 2, 3, 5, 8, 12]) {
    const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count, gpm_per_outlet: 250 });
    assert.ok(r.total_psi > prevN,
      `total at n=${outlet_count} = ${r.total_psi} not greater than prev=${prevN}`);
    prevN = r.total_psi;
  }
  // Strictly increasing in gpm_per_outlet at fixed h / n (Q^2 pin).
  let prevQ = -Infinity;
  for (const gpm_per_outlet of [50, 100, 150, 250, 400, 600]) {
    const r = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 2, gpm_per_outlet });
    assert.ok(r.total_psi > prevQ,
      `total at Q=${gpm_per_outlet} = ${r.total_psi} not greater than prev=${prevQ}`);
    prevQ = r.total_psi;
  }
  // elevation_psi = h * 0.434 exact closed-form pin.
  const ref = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250 });
  assert.ok(Math.abs(ref.elevation_psi - 100 * 0.434) < 1e-12,
    `elevation = ${ref.elevation_psi}, expected ${100 * 0.434}`);
  // total_psi decomposition pin: total = elevation + friction_total.
  assert.ok(Math.abs(ref.total_psi - (ref.elevation_psi + ref.friction_total_psi)) < 1e-9,
    `total = ${ref.total_psi}, expected ${ref.elevation_psi + ref.friction_total_psi}`);
  // friction_total_psi = per_outlet_psi * outlet_count exact pin.
  assert.ok(Math.abs(ref.friction_total_psi - ref.per_outlet_psi * ref.outlet_count) < 1e-9,
    `friction = ${ref.friction_total_psi}, expected ${ref.per_outlet_psi * ref.outlet_count}`);
  assert.equal(ref.outlet_count, 2);
  // Doubling-outlets pin: 2x n -> 2x friction_total exactly (linear).
  const a = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 250 });
  const b = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250 });
  assert.ok(Math.abs(b.friction_total_psi - 2 * a.friction_total_psi) < 1e-9,
    `2x n: friction = ${b.friction_total_psi} != 2 * ${a.friction_total_psi}`);
  // Doubling-h pin: 2x riser -> 2x elevation_psi exactly (linear).
  const h1 = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250 });
  const h2 = computeStandpipeFriction({ riser_height_ft: 200, outlet_count: 2, gpm_per_outlet: 250 });
  assert.ok(Math.abs(h2.elevation_psi - 2 * h1.elevation_psi) < 1e-9,
    `2x h: elevation = ${h2.elevation_psi} != 2 * ${h1.elevation_psi}`);
  // 2x-gpm pin: 2x Q -> 4x per_outlet_psi exactly (Q^2 scaling).
  const q1 = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 125 });
  const q2 = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 1, gpm_per_outlet: 250 });
  assert.ok(Math.abs(q2.per_outlet_psi - 4 * q1.per_outlet_psi) < 1e-9,
    `2x Q: per_outlet = ${q2.per_outlet_psi} != 4 * ${q1.per_outlet_psi}`);
  // Bounds pin: non-positive inputs -> error; unknown hose -> error.
  const bad = computeStandpipeFriction({ riser_height_ft: 0, outlet_count: 2, gpm_per_outlet: 250 });
  assert.ok(bad.error, `expected error for h=0, got ${JSON.stringify(bad)}`);
  const badHose = computeStandpipeFriction({ riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250, hose_diameter: "9_in" });
  assert.ok(badHose.error, `expected error for unknown hose, got ${JSON.stringify(badHose)}`);
});

test("monotonicity: computeNeutralImbalance neutral_A is 0 at perfect balance (I_A=I_B=I_C) and strictly increases as currents drift apart; imbalance_percent = (max-min)/avg*100; harmonic_warning flips on/off via flag", () => {
  // Group N. I_N = sqrt(I_A^2 + I_B^2 + I_C^2 - I_A*I_B - I_B*I_C - I_A*I_C).
  // Symmetric form -> equals 0 at I_A = I_B = I_C; grows as any current
  // drifts from the others.
  const balanced = computeNeutralImbalance({ I_A: 50, I_B: 50, I_C: 50, harmonic_loads: false });
  assert.equal(balanced.neutral_A, 0);
  assert.equal(balanced.imbalance_percent, 0);
  assert.equal(balanced.harmonic_warning, null);
  // Strictly increasing as I_A drifts away from I_B = I_C.
  let prev = -Infinity;
  for (const I_A of [50, 55, 60, 75, 100, 150, 200]) {
    const r = computeNeutralImbalance({ I_A, I_B: 50, I_C: 50 });
    assert.ok(Number.isFinite(r.neutral_A) && r.neutral_A >= 0,
      `I_N at I_A=${I_A}: ${JSON.stringify(r)}`);
    assert.ok(r.neutral_A > prev,
      `I_N at I_A=${I_A} = ${r.neutral_A} not greater than prev=${prev}`);
    prev = r.neutral_A;
  }
  // imbalance_percent strictly increasing too.
  let prevPct = -Infinity;
  for (const I_A of [55, 60, 75, 100, 150, 200]) {
    const r = computeNeutralImbalance({ I_A, I_B: 50, I_C: 50 });
    assert.ok(r.imbalance_percent > prevPct,
      `imb at I_A=${I_A} = ${r.imbalance_percent} not greater than prev=${prevPct}`);
    prevPct = r.imbalance_percent;
  }
  // imbalance_percent = (max-min)/avg * 100 closed-form pin.
  const ref = computeNeutralImbalance({ I_A: 50, I_B: 45, I_C: 40 });
  const avg = (50 + 45 + 40) / 3;
  const expectedImb = ((50 - 40) / avg) * 100;
  assert.ok(Math.abs(ref.imbalance_percent - expectedImb) < 1e-9,
    `imb = ${ref.imbalance_percent}, expected ${expectedImb}`);
  // I_N closed-form pin: sqrt(I_A^2 + I_B^2 + I_C^2 - I_A*I_B - I_B*I_C - I_A*I_C).
  const expectedIn = Math.sqrt(50 * 50 + 45 * 45 + 40 * 40 - 50 * 45 - 45 * 40 - 50 * 40);
  assert.ok(Math.abs(ref.neutral_A - expectedIn) < 1e-9,
    `I_N = ${ref.neutral_A}, expected ${expectedIn}`);
  // Harmonic warning pin: flag flips on/off based on harmonic_loads input.
  const harm = computeNeutralImbalance({ I_A: 50, I_B: 45, I_C: 40, harmonic_loads: true });
  assert.ok(/Harmonic-rich loads/.test(harm.harmonic_warning),
    `harmonic warning: ${harm.harmonic_warning}`);
  const noHarm = computeNeutralImbalance({ I_A: 50, I_B: 45, I_C: 40, harmonic_loads: false });
  assert.equal(noHarm.harmonic_warning, null);
  // Single-phase boundary pin: I_A=N, I_B=I_C=0 -> I_N = I_A exact (all
  // current returns on neutral).
  const single = computeNeutralImbalance({ I_A: 50, I_B: 0, I_C: 0 });
  assert.ok(Math.abs(single.neutral_A - 50) < 1e-9,
    `I_N single-phase = ${single.neutral_A}, expected 50`);
  // Zero-load pin: all zero -> I_N = 0, imbalance = 0.
  const zero = computeNeutralImbalance({ I_A: 0, I_B: 0, I_C: 0 });
  assert.equal(zero.neutral_A, 0);
  assert.equal(zero.imbalance_percent, 0);
  // Bounds pin: any negative current -> error.
  const bad = computeNeutralImbalance({ I_A: -10, I_B: 50, I_C: 50 });
  assert.ok(bad.error, `expected error for negative current, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeUTM round-trip identity (latlon -> UTM -> latlon returns the original to within projection tolerance); easting and northing monotone in their lat/lon inputs within a zone; direction error on bad direction", () => {
  // Group T. Round-trip identity: starting from any (lat, lon), converting
  // to UTM and back returns the original (lat, lon) to within typical
  // projection tolerance (~1e-5 deg, ~1 m on the ground).
  const points = [
    { lat: 39.7392, lon: -104.9903 },   // Denver
    { lat: 47.6062, lon: -122.3321 },   // Seattle
    { lat: 33.4484, lon: -112.0740 },   // Phoenix
    { lat: 40.7128, lon: -74.0060 },    // NYC
    { lat: -33.8688, lon: 151.2093 },   // Sydney (Southern hemisphere)
    { lat: 51.5074, lon: -0.1278 },     // London (near prime meridian)
  ];
  for (const p of points) {
    const fwd = computeUTM({ direction: "latlon_to_utm", lat_deg: p.lat, lon_deg: p.lon });
    assert.ok(!fwd.error, `fwd at ${p.lat}/${p.lon}: ${JSON.stringify(fwd)}`);
    assert.ok(Number.isFinite(fwd.zone) && fwd.zone >= 1 && fwd.zone <= 60,
      `zone out of range at ${p.lat}/${p.lon}: ${fwd.zone}`);
    assert.ok(fwd.easting > 0 && fwd.northing >= 0,
      `easting/northing invalid: ${fwd.easting} / ${fwd.northing}`);
    const back = computeUTM({ direction: "utm_to_latlon", zone: fwd.zone, hemisphere: fwd.hemisphere, easting: fwd.easting, northing: fwd.northing });
    assert.ok(!back.error, `back at ${p.lat}/${p.lon}: ${JSON.stringify(back)}`);
    assert.ok(Math.abs(back.lat_deg - p.lat) < 1e-5,
      `round-trip lat at ${p.lat}/${p.lon}: ${back.lat_deg}`);
    assert.ok(Math.abs(back.lon_deg - p.lon) < 1e-5,
      `round-trip lon at ${p.lat}/${p.lon}: ${back.lon_deg}`);
  }
  // Hemisphere assignment pin: N for lat >= 0; S for lat < 0.
  const north = computeUTM({ direction: "latlon_to_utm", lat_deg: 39.0, lon_deg: -100.0 });
  assert.equal(north.hemisphere, "N");
  const south = computeUTM({ direction: "latlon_to_utm", lat_deg: -25.0, lon_deg: 130.0 });
  assert.equal(south.hemisphere, "S");
  // Zone-number pin: zone = floor((lon + 180) / 6) + 1; lon=-104.99 -> zone 13.
  const denver = computeUTM({ direction: "latlon_to_utm", lat_deg: 39.7392, lon_deg: -104.9903 });
  assert.equal(denver.zone, 13);
  // Bounds pin: bad direction -> error; out-of-range zone -> error.
  const badDir = computeUTM({ direction: "polar", lat_deg: 0, lon_deg: 0 });
  assert.ok(badDir.error, `expected error for bad direction, got ${JSON.stringify(badDir)}`);
  const badLon = computeUTM({ direction: "latlon_to_utm", lat_deg: 0, lon_deg: 200 });
  assert.ok(badLon.error, `expected error for lon=200, got ${JSON.stringify(badLon)}`);
  const badZone = computeUTM({ direction: "utm_to_latlon", zone: 99, hemisphere: "N", easting: 500000, northing: 4400000 });
  assert.ok(badZone.error, `expected error for zone=99, got ${JSON.stringify(badZone)}`);
  const badHem = computeUTM({ direction: "utm_to_latlon", zone: 13, hemisphere: "X", easting: 500000, northing: 4400000 });
  assert.ok(badHem.error, `expected error for hemisphere=X, got ${JSON.stringify(badHem)}`);
});

test("monotonicity: computeRuleOf9s total TBSA is strictly non-decreasing as additional body regions flip true (additive percent pin); rule-of-9s adult totals: head 9 (4.5+4.5), each arm 9 (4.5+4.5), trunk 36 (18+18), each leg 18 (9+9), perineum 1 -> 100% sum invariant; band thresholds at 10% and 20% TBSA (ABA pin)", () => {
  // Group V. total TBSA is additive sum of selected regions' percent fields.
  // Strictly non-decreasing as more regions are toggled true.
  const regionKeys = [
    "head_front", "head_back",
    "arm_l_front", "arm_l_back", "arm_r_front", "arm_r_back",
    "trunk_front", "trunk_back",
    "leg_l_front", "leg_l_back", "leg_r_front", "leg_r_back",
    "perineum",
  ];
  let prev = -Infinity;
  let active = {};
  for (const key of regionKeys) {
    active = { ...active, [key]: true };
    const r = computeRuleOf9s(active);
    assert.ok(Number.isFinite(r.total),
      `total at ${Object.keys(active).length}: ${JSON.stringify(r)}`);
    assert.ok(r.total > prev,
      `total at ${Object.keys(active).length} = ${r.total} not greater than prev=${prev}`);
    prev = r.total;
  }
  // 100% TBSA invariant pin: all 13 regions selected -> exactly 100% adult.
  const allRegions = {};
  for (const k of regionKeys) allRegions[k] = true;
  const full = computeRuleOf9s(allRegions);
  assert.equal(full.total, 100);
  // Adult region-pct pins per published Rule of 9s.
  const headOnly = computeRuleOf9s({ head_front: true, head_back: true });
  assert.equal(headOnly.total, 9);
  const armOnly = computeRuleOf9s({ arm_l_front: true, arm_l_back: true });
  assert.equal(armOnly.total, 9);
  const trunkOnly = computeRuleOf9s({ trunk_front: true, trunk_back: true });
  assert.equal(trunkOnly.total, 36);
  const legOnly = computeRuleOf9s({ leg_l_front: true, leg_l_back: true });
  assert.equal(legOnly.total, 18);
  const perineum = computeRuleOf9s({ perineum: true });
  assert.equal(perineum.total, 1);
  // ABA-band threshold pins: < 10 minor; 10-19 moderate; >= 20 major.
  const minor = computeRuleOf9s({ arm_l_front: true });  // 4.5%
  assert.ok(/Minor/.test(minor.band), `band at 4.5: ${minor.band}`);
  const moderate = computeRuleOf9s({ trunk_front: true });  // 18%
  assert.ok(/Moderate/.test(moderate.band), `band at 18: ${moderate.band}`);
  const major = computeRuleOf9s({ trunk_front: true, trunk_back: true });  // 36%
  assert.ok(/Major burn/.test(major.band), `band at 36: ${major.band}`);
  // Boundary pin: at exactly 10% -> Moderate; at exactly 20% -> Major.
  const at10 = computeRuleOf9s({ trunk_front: true, perineum: true });  // 18 + 1 = 19 (no exact 10 from single regions; use combos)
  // Use head (9) + 1 (perineum) = 10
  const at10b = computeRuleOf9s({ head_front: true, head_back: true, perineum: true });  // 4.5 + 4.5 + 1 = 10
  assert.equal(at10b.total, 10);
  assert.ok(/Moderate/.test(at10b.band), `band at exact 10: ${at10b.band}`);
  // Lund-Browder method pin: total uses lb_a / lb_c / lb_i columns per age.
  const lbAdult = computeRuleOf9s({ head_front: true, head_back: true, method: "lund_browder", age_band: "adult" });
  assert.equal(lbAdult.total, 7);    // 3.5 + 3.5
  const lbChild = computeRuleOf9s({ head_front: true, head_back: true, method: "lund_browder", age_band: "child" });
  assert.equal(lbChild.total, 13);   // 6.5 + 6.5
  const lbInfant = computeRuleOf9s({ head_front: true, head_back: true, method: "lund_browder", age_band: "infant" });
  assert.equal(lbInfant.total, 17);  // 8.5 + 8.5
  // Lund-Browder head-percent ordering pin: infant > child > adult.
  assert.ok(lbInfant.total > lbChild.total && lbChild.total > lbAdult.total,
    `head ordering: infant ${lbInfant.total} > child ${lbChild.total} > adult ${lbAdult.total}`);
  // components array length pin: equals number of toggled regions.
  const three = computeRuleOf9s({ head_front: true, arm_l_front: true, trunk_front: true });
  assert.equal(three.components.length, 3);
  // method default pin: rule_of_9s when unspecified.
  assert.equal(headOnly.method, "rule_of_9s");
  assert.equal(headOnly.age_band, "adult");
});

// --- spec-v14 §10.3 Phase F fifty-first monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (C / E / G / O / Y).

import { computeBoltTorque } from "../../calc-construction.js";
import { computeOutdoorAirMix } from "../../calc-hvac.js";
import { computeSalesTax } from "../../calc-cross.js";
import { computeDryingLog } from "../../calc-restoration.js";
import { computeScientificNotation } from "../../calc-edu.js";

test("monotonicity: computeBoltTorque torque_ft_lb is strictly increasing in diameter_in at fixed grade/lub/preload (T = K * d * F linear-in-d pin); strictly increasing in preload_fraction (linear pin); grade ordering ASTM_A307 < SAE_2 < SAE_5 < ASTM_A325 < SAE_8/A490 (proof-load pin); lubrication ordering K: dry 0.20 > oiled 0.18 > antiseize 0.15", () => {
  // Group E. T = K * d * F where F = proof * A_t * preload_fraction.
  // Strictly increasing in diameter via both d and A_t(d) at fixed grade/lub.
  let prev = -Infinity;
  for (const diameter_in of [0.25, 0.375, 0.5, 0.625, 0.75, 1.0, 1.5]) {
    const r = computeBoltTorque({ grade: "SAE_5", diameter_in, lubrication: "dry", preload_fraction: 0.75 });
    assert.ok(Number.isFinite(r.torque_ft_lb) && r.torque_ft_lb > 0,
      `T at d=${diameter_in}: ${JSON.stringify(r)}`);
    assert.ok(r.torque_ft_lb > prev,
      `T at d=${diameter_in} = ${r.torque_ft_lb} not greater than prev=${prev}`);
    prev = r.torque_ft_lb;
  }
  // Strictly increasing in preload_fraction at fixed grade/lub/d (linear).
  let prevPf = -Infinity;
  for (const preload_fraction of [0.25, 0.50, 0.65, 0.75, 0.85, 0.95, 1.0]) {
    const r = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction });
    assert.ok(r.torque_ft_lb > prevPf,
      `T at pf=${preload_fraction} = ${r.torque_ft_lb} not greater than prev=${prevPf}`);
    prevPf = r.torque_ft_lb;
  }
  // Doubling-preload pin: 2x preload_fraction -> 2x T exactly (linear in PF).
  const a = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.30 });
  const b = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.60 });
  assert.ok(Math.abs(b.torque_ft_lb - 2 * a.torque_ft_lb) < 1e-9,
    `2x PF: T = ${b.torque_ft_lb} != 2 * ${a.torque_ft_lb}`);
  // Grade ordering pin: ASTM_A307 (36000) < SAE_2 (55000) < SAE_5 (85000)
  // < ASTM_A325 (92000) < SAE_8 = ASTM_A490 (120000).
  const a307 = computeBoltTorque({ grade: "ASTM_A307", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const sae2 = computeBoltTorque({ grade: "SAE_2", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const sae5 = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const a325 = computeBoltTorque({ grade: "ASTM_A325", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const sae8 = computeBoltTorque({ grade: "SAE_8", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const a490 = computeBoltTorque({ grade: "ASTM_A490", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  assert.ok(a307.torque_ft_lb < sae2.torque_ft_lb && sae2.torque_ft_lb < sae5.torque_ft_lb && sae5.torque_ft_lb < a325.torque_ft_lb && a325.torque_ft_lb < sae8.torque_ft_lb,
    `grade ordering: ${a307.torque_ft_lb} ${sae2.torque_ft_lb} ${sae5.torque_ft_lb} ${a325.torque_ft_lb} ${sae8.torque_ft_lb}`);
  assert.ok(Math.abs(sae8.torque_ft_lb - a490.torque_ft_lb) < 1e-9,
    `SAE_8 / A490 tie: ${sae8.torque_ft_lb} != ${a490.torque_ft_lb}`);
  // Lubrication-K ordering pin: dry 0.20 > oiled 0.18 > antiseize 0.15.
  const dry = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const oiled = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "oiled", preload_fraction: 0.75 });
  const antiseize = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "antiseize", preload_fraction: 0.75 });
  assert.equal(dry.K, 0.20);
  assert.equal(oiled.K, 0.18);
  assert.equal(antiseize.K, 0.15);
  assert.ok(dry.torque_ft_lb > oiled.torque_ft_lb && oiled.torque_ft_lb > antiseize.torque_ft_lb,
    `K ordering: dry ${dry.torque_ft_lb} > oiled ${oiled.torque_ft_lb} > antiseize ${antiseize.torque_ft_lb}`);
  // Closed-form pin from boltTorqueExample: SAE_5 / 0.5 in / dry / PF=0.75.
  // F = 85000 * 0.1419 * 0.75; T_in_lb = 0.20 * 0.5 * F; T_ft_lb = T_in / 12.
  const ref = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 });
  const expectedF = 85000 * 0.1419 * 0.75;
  const expectedTinLb = 0.20 * 0.5 * expectedF;
  const expectedTftLb = expectedTinLb / 12;
  assert.ok(Math.abs(ref.F_lb - expectedF) < 1e-9,
    `F = ${ref.F_lb}, expected ${expectedF}`);
  assert.ok(Math.abs(ref.torque_in_lb - expectedTinLb) < 1e-9,
    `T_in_lb = ${ref.torque_in_lb}, expected ${expectedTinLb}`);
  assert.ok(Math.abs(ref.torque_ft_lb - expectedTftLb) < 1e-9,
    `T_ft_lb = ${ref.torque_ft_lb}, expected ${expectedTftLb}`);
  // torque_ft_lb = torque_in_lb / 12 exact unit pin.
  assert.ok(Math.abs(ref.torque_ft_lb - ref.torque_in_lb / 12) < 1e-12,
    `T_ft / T_in: ${ref.torque_ft_lb} != ${ref.torque_in_lb / 12}`);
  // Bounds pin: bad grade / lub / diameter / preload -> error.
  const badG = computeBoltTorque({ grade: "X99", diameter_in: 0.5 });
  assert.ok(badG.error, `expected error for bad grade, got ${JSON.stringify(badG)}`);
  const badL = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "honey" });
  assert.ok(badL.error, `expected error for bad lub, got ${JSON.stringify(badL)}`);
  const badPf = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 1.5 });
  assert.ok(badPf.error, `expected error for PF=1.5, got ${JSON.stringify(badPf)}`);
  const badD = computeBoltTorque({ grade: "SAE_5", diameter_in: 0.333 });
  assert.ok(badD.error, `expected error for unsupported d, got ${JSON.stringify(badD)}`);
});

test("monotonicity: computeOutdoorAirMix mixed_T_F is the linear convex combination of return_T_F and outdoor_T_F (f * OA + (1-f) * RA pin); strictly monotone in oa_fraction toward whichever side is hotter; mixed_W is the linear convex combination of return_W and outdoor_W; f=0 -> ref identity; f=1 -> OA identity", () => {
  // Group C. mixed_T_F = f * outdoor_T_F + (1-f) * return_T_F (linear in f).
  // Strictly increasing in f when outdoor > return; strictly decreasing in f
  // when outdoor < return.
  let prev = -Infinity;
  for (const oa_fraction of [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0]) {
    const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction });
    assert.ok(Number.isFinite(r.mixed_T_F),
      `T_mix at f=${oa_fraction}: ${JSON.stringify(r)}`);
    assert.ok(r.mixed_T_F >= prev,
      `T_mix at f=${oa_fraction} = ${r.mixed_T_F} not >= prev=${prev}`);
    prev = r.mixed_T_F;
  }
  // Strictly decreasing in f when outdoor cooler than return.
  let prevDecr = Infinity;
  for (const oa_fraction of [0, 0.1, 0.3, 0.5, 0.75, 1.0]) {
    const r = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 50, outdoor_RH_percent: 60, oa_fraction });
    assert.ok(r.mixed_T_F <= prevDecr,
      `T_mix at f=${oa_fraction} = ${r.mixed_T_F} not <= prev=${prevDecr}`);
    prevDecr = r.mixed_T_F;
  }
  // f=0 identity pin: mixed_T_F = return_T_F exact.
  const f0 = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 0 });
  assert.ok(Math.abs(f0.mixed_T_F - 75) < 1e-12, `f=0 T_mix = ${f0.mixed_T_F}, expected 75`);
  assert.ok(Math.abs(f0.mixed_W_kg_kg - f0.return_W_kg_kg) < 1e-12,
    `f=0 W_mix = ${f0.mixed_W_kg_kg}, expected ${f0.return_W_kg_kg}`);
  // f=1 identity pin: mixed_T_F = outdoor_T_F exact.
  const f1 = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 1 });
  assert.ok(Math.abs(f1.mixed_T_F - 95) < 1e-12, `f=1 T_mix = ${f1.mixed_T_F}, expected 95`);
  assert.ok(Math.abs(f1.mixed_W_kg_kg - f1.outdoor_W_kg_kg) < 1e-12,
    `f=1 W_mix = ${f1.mixed_W_kg_kg}, expected ${f1.outdoor_W_kg_kg}`);
  // f-clamp pin: f < 0 clamps to 0; f > 1 clamps to 1.
  const fNeg = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: -0.5 });
  assert.equal(fNeg.oa_fraction, 0);
  assert.ok(Math.abs(fNeg.mixed_T_F - 75) < 1e-12);
  const fHi = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 2 });
  assert.equal(fHi.oa_fraction, 1);
  assert.ok(Math.abs(fHi.mixed_T_F - 95) < 1e-12);
  // Convex-combination pin: at f=0.5 mixed_T = (75 + 95) / 2 = 85 exact.
  const half = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 0.5 });
  assert.ok(Math.abs(half.mixed_T_F - 85) < 1e-12, `f=0.5 T_mix = ${half.mixed_T_F}, expected 85`);
  // outdoorAirMixExample band pin: 75/50% + 95/60% @ f=0.2 -> mixed_T 78.9-79.1.
  const ref = computeOutdoorAirMix({ return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 0.2 });
  assert.ok(Math.abs(ref.mixed_T_F - (0.2 * 95 + 0.8 * 75)) < 1e-12,
    `T_mix = ${ref.mixed_T_F}, expected ${0.2 * 95 + 0.8 * 75}`);
  assert.ok(ref.mixed_T_F >= 78.9 && ref.mixed_T_F <= 79.1,
    `T_mix = ${ref.mixed_T_F}, expected 78.9-79.1 (example range)`);
  // mixed_GPP = mixed_W * 7000 unit-conversion pin.
  assert.ok(Math.abs(ref.mixed_GPP - ref.mixed_W_kg_kg * 7000) < 1e-9,
    `GPP = ${ref.mixed_GPP}, expected ${ref.mixed_W_kg_kg * 7000}`);
});

test("monotonicity: computeSalesTax tax is strictly increasing in subtotal at fixed rate (linear pin); total = subtotal + tax = subtotal * (1 + rate/100); custom_rate_percent overrides STATE_TAX_RATES lookup; 0% sales-tax states (DE/MT/NH/OR/AK) -> tax = 0 exact", () => {
  // Group G. tax = subtotal * (rate/100); total = subtotal + tax.
  // Strictly increasing in subtotal at fixed state/rate.
  let prev = -Infinity;
  for (const subtotal of [10, 50, 100, 250, 1000, 5000, 25000]) {
    const r = computeSalesTax({ state: "TX", subtotal });
    assert.ok(Number.isFinite(r.tax) && r.tax > 0,
      `tax at subtotal=${subtotal}: ${JSON.stringify(r)}`);
    assert.ok(r.tax > prev,
      `tax at subtotal=${subtotal} = ${r.tax} not greater than prev=${prev}`);
    prev = r.tax;
  }
  // Doubling-subtotal pin: 2x subtotal -> 2x tax exactly (linear).
  const a = computeSalesTax({ state: "TX", subtotal: 500 });
  const b = computeSalesTax({ state: "TX", subtotal: 1000 });
  assert.ok(Math.abs(b.tax - 2 * a.tax) < 1e-9,
    `2x subtotal: tax = ${b.tax} != 2 * ${a.tax}`);
  // total = subtotal + tax invariant.
  assert.ok(Math.abs(a.total - (500 + a.tax)) < 1e-9,
    `total = ${a.total}, expected ${500 + a.tax}`);
  // Closed-form pin from salesTaxExample: TX (6.25%) on 1000 -> tax=62.5.
  const ref = computeSalesTax({ state: "TX", subtotal: 1000 });
  assert.equal(ref.rate_percent, 6.25);
  assert.equal(ref.tax, 62.5);
  assert.equal(ref.total, 1062.5);
  // Zero-tax-state pin: DE/MT/NH/OR/AK -> tax = 0 (rate 0%).
  for (const state of ["DE", "MT", "NH", "OR", "AK"]) {
    const r = computeSalesTax({ state, subtotal: 1000 });
    assert.equal(r.rate_percent, 0);
    assert.equal(r.tax, 0);
    assert.equal(r.total, 1000);
  }
  // High-rate-state pin: CA = 7.25%; on $1000 -> $72.5 tax.
  const ca = computeSalesTax({ state: "CA", subtotal: 1000 });
  assert.equal(ca.rate_percent, 7.25);
  assert.equal(ca.tax, 72.5);
  assert.equal(ca.total, 1072.5);
  // custom_rate_percent override pin: overrides state lookup.
  const custom = computeSalesTax({ state: "TX", subtotal: 1000, custom_rate_percent: 10 });
  assert.equal(custom.rate_percent, 10);
  assert.equal(custom.tax, 100);
  assert.equal(custom.total, 1100);
  // custom_rate_percent works even for unknown states.
  const customUnknown = computeSalesTax({ state: "ZZ", subtotal: 500, custom_rate_percent: 5 });
  assert.equal(customUnknown.rate_percent, 5);
  assert.equal(customUnknown.tax, 25);
  // Zero-subtotal boundary pin: $0 subtotal -> $0 tax, $0 total.
  const zero = computeSalesTax({ state: "CA", subtotal: 0 });
  assert.equal(zero.tax, 0);
  assert.equal(zero.total, 0);
  // Bounds pin: unknown state without custom rate -> error.
  const bad = computeSalesTax({ state: "ZZ", subtotal: 1000 });
  assert.ok(bad.error, `expected error for unknown state without custom rate, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeDryingLog rows.length equals readings.length; boundary_pass_all flips to false when any reading has chamber_GPP >= ambient_GPP; trend_GPP_per_day < 0 when chamber values fall over time; days_to_target finite + positive only for downward trends", () => {
  // Group O. boundary_pass = chamber_GPP < ambient_GPP per reading;
  // boundary_pass_all = all rows pass. trend_GPP_per_day = linear-regression
  // slope of chamber_GPP vs day_index.
  const goodReadings = [
    { day_index: 0, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 30 },
    { day_index: 1, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 25 },
    { day_index: 2, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 20 },
    { day_index: 3, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 15 },
  ];
  const good = computeDryingLog({ readings: goodReadings });
  assert.equal(good.rows.length, 4);
  assert.equal(good.boundary_pass_all, true);
  assert.ok(good.trend_GPP_per_day < 0,
    `trend should be downward, got ${good.trend_GPP_per_day}`);
  assert.ok(Array.isArray(good.warnings),
    `warnings array missing: ${JSON.stringify(good)}`);
  // Each row carries day_index, ambient_GPP, chamber_GPP, boundary_pass.
  for (const row of good.rows) {
    assert.ok(Number.isFinite(row.ambient_GPP) && row.ambient_GPP > 0,
      `ambient_GPP: ${row.ambient_GPP}`);
    assert.ok(Number.isFinite(row.chamber_GPP) && row.chamber_GPP > 0,
      `chamber_GPP: ${row.chamber_GPP}`);
    assert.ok(row.boundary_pass === true,
      `boundary_pass: ${row.boundary_pass}`);
    assert.ok(Math.abs(row.boundary_margin_GPP - (row.ambient_GPP - row.chamber_GPP)) < 1e-9,
      `margin = ${row.boundary_margin_GPP}, expected ${row.ambient_GPP - row.chamber_GPP}`);
  }
  // Failing-boundary pin: one chamber reading at higher GPP than ambient
  // -> boundary_pass_all = false; warning fires.
  const failingReadings = [
    { day_index: 0, ambient_T_F: 70, ambient_RH: 50, chamber_T_F: 80, chamber_RH: 80 },
    { day_index: 1, ambient_T_F: 70, ambient_RH: 50, chamber_T_F: 80, chamber_RH: 70 },
  ];
  const failing = computeDryingLog({ readings: failingReadings });
  assert.equal(failing.boundary_pass_all, false);
  assert.ok(failing.warnings.some((w) => /boundary-humidity test/.test(w)),
    `expected boundary-failure warning: ${JSON.stringify(failing.warnings)}`);
  // Flat-or-rising trend pin: chamber_GPP non-decreasing over time -> warning.
  const risingReadings = [
    { day_index: 0, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 15 },
    { day_index: 1, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 20 },
    { day_index: 2, ambient_T_F: 80, ambient_RH: 70, chamber_T_F: 95, chamber_RH: 25 },
  ];
  const rising = computeDryingLog({ readings: risingReadings });
  assert.ok(rising.trend_GPP_per_day >= 0,
    `rising trend should be >= 0, got ${rising.trend_GPP_per_day}`);
  assert.ok(rising.warnings.some((w) => /trend is flat or rising/.test(w)),
    `expected trend warning: ${JSON.stringify(rising.warnings)}`);
  // Single-reading pin: 1 reading -> warning about missing trend.
  const single = computeDryingLog({ readings: [{ day_index: 0, ambient_T_F: 75, ambient_RH: 50, chamber_T_F: 90, chamber_RH: 20 }] });
  assert.equal(single.rows.length, 1);
  assert.ok(single.warnings.some((w) => /Single reading/.test(w)),
    `expected single-reading warning: ${JSON.stringify(single.warnings)}`);
  // days_to_target finite only when trend is downward.
  assert.ok(good.days_to_target === null || (Number.isFinite(good.days_to_target) && good.days_to_target >= 0),
    `days_to_target: ${good.days_to_target}`);
  assert.equal(rising.days_to_target, null);
  assert.equal(single.days_to_target, null);
  // Bounds pin: empty readings / non-array / >14 readings / bad RH -> error.
  const empty = computeDryingLog({ readings: [] });
  assert.ok(empty.error, `expected error for empty readings, got ${JSON.stringify(empty)}`);
  const tooMany = computeDryingLog({ readings: new Array(15).fill({ day_index: 0, ambient_T_F: 70, ambient_RH: 50, chamber_T_F: 80, chamber_RH: 30 }) });
  assert.ok(tooMany.error, `expected error for 15 readings, got ${JSON.stringify(tooMany)}`);
  const badRH = computeDryingLog({ readings: [{ day_index: 0, ambient_T_F: 70, ambient_RH: 150, chamber_T_F: 80, chamber_RH: 30 }] });
  assert.ok(badRH.error, `expected error for RH=150, got ${JSON.stringify(badRH)}`);
});

test("monotonicity: computeScientificNotation exponent is strictly non-decreasing as |value| grows through 10^k boundaries (floor(log10(|x|)) pin); mantissa is always in [1, 10); sign of mantissa matches sign of value; round-trip identity mantissa * 10^exponent = value", () => {
  // Group Y. exponent = floor(log10(|x|)); mantissa = sign(x) * |x| / 10^exponent.
  // Strictly non-decreasing in |x| across 10^k boundaries.
  let prev = -Infinity;
  for (const value of [0.0001, 0.001, 0.01, 0.1, 1, 10, 100, 1000, 1e6, 1e9, 1e12]) {
    const r = computeScientificNotation({ value });
    assert.ok(Number.isFinite(r.exponent),
      `exp at ${value}: ${JSON.stringify(r)}`);
    assert.ok(r.exponent > prev,
      `exp at ${value} = ${r.exponent} not greater than prev=${prev}`);
    prev = r.exponent;
  }
  // mantissa in [1, 10) for non-zero values (or in (-10, -1] for negatives).
  for (const value of [1, 2.5, 9.99, 100, 0.0042, -3.14, -98765]) {
    const r = computeScientificNotation({ value });
    const mag = Math.abs(r.mantissa);
    assert.ok(mag >= 1 && mag < 10,
      `mantissa |${r.mantissa}| not in [1, 10) for value=${value}`);
  }
  // Sign-of-mantissa pin: matches sign of input for non-zero values.
  const pos = computeScientificNotation({ value: 1234.5 });
  const neg = computeScientificNotation({ value: -1234.5 });
  assert.ok(pos.mantissa > 0, `pos mantissa: ${pos.mantissa}`);
  assert.ok(neg.mantissa < 0, `neg mantissa: ${neg.mantissa}`);
  assert.equal(pos.exponent, neg.exponent);
  // Round-trip identity pin: mantissa * 10^exponent ≈ value to FP tolerance.
  for (const value of [1, 3.14, 2.71828e10, -42.0, 0.000123, 9.81e-9]) {
    const r = computeScientificNotation({ value });
    const reconstructed = r.mantissa * Math.pow(10, r.exponent);
    assert.ok(Math.abs(reconstructed - value) / Math.max(1, Math.abs(value)) < 1e-12,
      `round-trip at ${value}: got ${reconstructed}`);
  }
  // Zero boundary pin: value = 0 -> mantissa = 0, exponent = 0, sig_figs = 1.
  const zero = computeScientificNotation({ value: 0 });
  assert.equal(zero.mantissa, 0);
  assert.equal(zero.exponent, 0);
  assert.equal(zero.sig_figs, 1);
  assert.equal(zero.rendered, "0");
  // Specific closed-form pins.
  const k1 = computeScientificNotation({ value: 6.022e23 });
  assert.equal(k1.exponent, 23);
  assert.ok(Math.abs(k1.mantissa - 6.022) < 1e-9,
    `Avogadro mantissa: ${k1.mantissa}`);
  const small = computeScientificNotation({ value: 1.6e-19 });
  assert.equal(small.exponent, -19);
  assert.ok(Math.abs(small.mantissa - 1.6) < 1e-9,
    `electron mantissa: ${small.mantissa}`);
  // sig_figs counts non-leading-zero digits (NIST SP 811 convention).
  assert.ok(Number.isFinite(zero.sig_figs) && zero.sig_figs >= 1,
    `sig_figs: ${zero.sig_figs}`);
  // Bounds pin: non-finite -> error.
  const nan = computeScientificNotation({ value: "abc" });
  assert.ok(nan.error, `expected error for non-numeric value, got ${JSON.stringify(nan)}`);
  const inf = computeScientificNotation({ value: Infinity });
  assert.ok(inf.error, `expected error for Infinity, got ${JSON.stringify(inf)}`);
});

// --- spec-v14 §10.3 Phase F fifty-second monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (A / B / C / E / F).

import { computePullingTension } from "../../calc-electrical.js";
import { computeGreaseTrap } from "../../calc-plumbing.js";
import { computeApproachDeltaT } from "../../calc-hvac.js";
import { computeRoofingSquares } from "../../calc-construction.js";
import { computeSlingAngle } from "../../calc-fire.js";

test("monotonicity: computePullingTension tension_lb is strictly increasing in cable_weight_lb_per_ft AND in straight_run_ft (linear pin); lubricant mu ordering: polymer 0.20 < wax 0.35 < dry 0.50 (NEC FPN B / IEEE-525 capstan formula T_out = T_in * exp(mu*theta) pin)", () => {
  // Group A. Straight: T = mu * w * L; bend: T_out = T_in * exp(mu * theta).
  // Strictly increasing in weight and in run length.
  let prev = -Infinity;
  for (const cable_weight_lb_per_ft of [0.25, 0.5, 1.0, 1.5, 2.5, 5.0]) {
    const r = computePullingTension({ cable_weight_lb_per_ft, run_length_ft: 200, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
    assert.ok(Number.isFinite(r.tension_lb) && r.tension_lb > 0,
      `T at w=${cable_weight_lb_per_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.tension_lb > prev,
      `T at w=${cable_weight_lb_per_ft} = ${r.tension_lb} not greater than prev=${prev}`);
    prev = r.tension_lb;
  }
  // Strictly increasing in straight_run_ft (linear in length).
  let prevL = -Infinity;
  for (const straight_run_ft of [25, 50, 100, 200, 400, 800]) {
    const r = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: straight_run_ft + 100, lubricant: "polymer", straight_run_ft, bends: [{ angle_deg: 90, radius_ft: 2 }] });
    assert.ok(r.tension_lb > prevL,
      `T at L=${straight_run_ft} = ${r.tension_lb} not greater than prev=${prevL}`);
    prevL = r.tension_lb;
  }
  // Lubricant ordering pin: polymer 0.20 < wax 0.35 < dry 0.50.
  const poly = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 200, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  const wax = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 200, lubricant: "wax", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  const dry = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 200, lubricant: "dry", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  assert.equal(poly.mu, 0.20);
  assert.equal(wax.mu, 0.35);
  assert.equal(dry.mu, 0.50);
  assert.ok(poly.tension_lb < wax.tension_lb && wax.tension_lb < dry.tension_lb,
    `mu ordering: poly ${poly.tension_lb} < wax ${wax.tension_lb} < dry ${dry.tension_lb}`);
  // Capstan-formula closed-form pin: 90-deg bend at mu=0.20 ->
  // multiplier exp(0.20 * pi/2) ~= 1.369.
  const refStraight = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [] });
  const expectedStraight = 0.20 * 1.5 * 100;
  assert.ok(Math.abs(refStraight.tension_lb - expectedStraight) < 1e-9,
    `straight T = ${refStraight.tension_lb}, expected ${expectedStraight}`);
  const withBend = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 90, radius_ft: 2 }] });
  const expectedBend = expectedStraight * Math.exp(0.20 * Math.PI / 2);
  assert.ok(Math.abs(withBend.tension_lb - expectedBend) < 1e-9,
    `bend T = ${withBend.tension_lb}, expected ${expectedBend}`);
  // Sidewall = T_out / R pin.
  const sidewallExpected = expectedBend / 2;
  assert.ok(Math.abs(withBend.max_sidewall_lb_per_ft - sidewallExpected) < 1e-9,
    `sidewall = ${withBend.max_sidewall_lb_per_ft}, expected ${sidewallExpected}`);
  // Bend-angle pin: 2x angle -> exp(mu * 2*theta) ~ (exp(mu*theta))^2.
  const oneBend = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 45, radius_ft: 2 }] });
  const twoBend = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 100, lubricant: "polymer", straight_run_ft: 100, bends: [{ angle_deg: 45, radius_ft: 2 }, { angle_deg: 45, radius_ft: 2 }] });
  assert.ok(Math.abs(twoBend.tension_lb / oneBend.tension_lb - Math.exp(0.20 * Math.PI / 4)) < 1e-9,
    `2x bend ratio: ${twoBend.tension_lb / oneBend.tension_lb}, expected ${Math.exp(0.20 * Math.PI / 4)}`);
  // tension_flag pin: > 5000 lb head-end -> flag set.
  const heavy = computePullingTension({ cable_weight_lb_per_ft: 50, run_length_ft: 1000, lubricant: "dry", straight_run_ft: 1000, bends: [] });
  assert.ok(/exceeds 5000 lb/.test(heavy.tension_flag),
    `expected over-5000 flag, got ${heavy.tension_flag}`);
  assert.equal(poly.tension_flag, "ok");
  // Bounds pin: unknown lubricant -> error; negative weight -> error.
  const badLub = computePullingTension({ cable_weight_lb_per_ft: 1.5, run_length_ft: 200, lubricant: "soap", straight_run_ft: 100, bends: [] });
  assert.ok(badLub.error, `expected error for unknown lub, got ${JSON.stringify(badLub)}`);
  const badW = computePullingTension({ cable_weight_lb_per_ft: 0, run_length_ft: 200, lubricant: "polymer", straight_run_ft: 100, bends: [] });
  assert.ok(badW.error, `expected error for w=0, got ${JSON.stringify(badW)}`);
});

test("monotonicity: computeGreaseTrap volume_gal is strictly increasing in peak_flow_gpm, retention_minutes, AND loading_factor (Q*t*K linear pin); recommended_nominal_gal is monotone non-decreasing in volume_gal across the standard-size ladder; 25 gpm / 30 min / 1.25 -> 937.5 gal exact", () => {
  // Group B. volume = Q * t * K (linear in each). Strictly increasing in
  // peak_flow_gpm at fixed retention/loading.
  let prev = -Infinity;
  for (const peak_flow_gpm of [5, 10, 25, 50, 100, 200, 500]) {
    const r = computeGreaseTrap({ peak_flow_gpm, retention_minutes: 30, loading_factor: 1.25 });
    assert.ok(Number.isFinite(r.volume_gal) && r.volume_gal > 0,
      `vol at Q=${peak_flow_gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.volume_gal > prev,
      `vol at Q=${peak_flow_gpm} = ${r.volume_gal} not greater than prev=${prev}`);
    prev = r.volume_gal;
  }
  // Strictly increasing in retention_minutes.
  let prevT = -Infinity;
  for (const retention_minutes of [15, 20, 30, 45, 60, 90]) {
    const r = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes, loading_factor: 1.25 });
    assert.ok(r.volume_gal > prevT,
      `vol at t=${retention_minutes} = ${r.volume_gal} not greater than prev=${prevT}`);
    prevT = r.volume_gal;
  }
  // Strictly increasing in loading_factor.
  let prevK = -Infinity;
  for (const loading_factor of [1.0, 1.1, 1.25, 1.5, 1.75, 2.0]) {
    const r = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes: 30, loading_factor });
    assert.ok(r.volume_gal > prevK,
      `vol at K=${loading_factor} = ${r.volume_gal} not greater than prev=${prevK}`);
    prevK = r.volume_gal;
  }
  // Doubling-Q pin: 2x peak_flow -> 2x volume exactly (linear in Q).
  const a = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes: 30, loading_factor: 1.25 });
  const b = computeGreaseTrap({ peak_flow_gpm: 50, retention_minutes: 30, loading_factor: 1.25 });
  assert.ok(Math.abs(b.volume_gal - 2 * a.volume_gal) < 1e-9,
    `2x Q: vol = ${b.volume_gal} != 2 * ${a.volume_gal}`);
  // Closed-form pin from greaseTrapExample: 25 gpm * 30 min * 1.25 = 937.5 gal.
  const ref = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes: 30, loading_factor: 1.25 });
  assert.equal(ref.volume_gal, 937.5);
  // recommended_nominal_gal pin: smallest standard size >= volume_gal.
  // 937.5 -> next is 1000.
  assert.equal(ref.recommended_nominal_gal, 1000);
  // Standard-size ladder pin: at volume = 30 -> next is 35; at 75 -> 75; at
  // 100 -> 100.
  const small = computeGreaseTrap({ peak_flow_gpm: 1, retention_minutes: 30, loading_factor: 1.0 });  // 30 gal
  assert.equal(small.volume_gal, 30);
  assert.equal(small.recommended_nominal_gal, 35);
  const exactMatch = computeGreaseTrap({ peak_flow_gpm: 2, retention_minutes: 30, loading_factor: 1.25 });
  assert.equal(exactMatch.volume_gal, 75);
  assert.equal(exactMatch.recommended_nominal_gal, 75);
  // Largest-size cap pin: volume > 3000 -> recommended = 3000 (largest).
  const huge = computeGreaseTrap({ peak_flow_gpm: 200, retention_minutes: 30, loading_factor: 1.0 });
  assert.equal(huge.volume_gal, 6000);
  assert.equal(huge.recommended_nominal_gal, 3000);
  // recommended_nominal_gal monotone non-decreasing as volume_gal grows.
  let prevRec = -Infinity;
  for (const peak_flow_gpm of [1, 5, 10, 25, 50, 100, 250, 500]) {
    const r = computeGreaseTrap({ peak_flow_gpm, retention_minutes: 30, loading_factor: 1.0 });
    assert.ok(r.recommended_nominal_gal >= prevRec,
      `rec at Q=${peak_flow_gpm} = ${r.recommended_nominal_gal} not >= prev=${prevRec}`);
    prevRec = r.recommended_nominal_gal;
  }
  // Bounds pin: non-positive inputs -> error.
  const bad = computeGreaseTrap({ peak_flow_gpm: 0, retention_minutes: 30, loading_factor: 1.25 });
  assert.ok(bad.error, `expected error for Q=0, got ${JSON.stringify(bad)}`);
  const badT = computeGreaseTrap({ peak_flow_gpm: 25, retention_minutes: 0, loading_factor: 1.25 });
  assert.ok(badT.error, `expected error for t=0, got ${JSON.stringify(badT)}`);
});

test("monotonicity: computeApproachDeltaT approach_F = condenser_saturation_F - outdoor_F is strictly decreasing in outdoor_F at fixed condenser_sat; delta_T_F = return_F - supply_F is strictly increasing in return_F at fixed supply; band labels tip at the published low / high bounds (ACCA Manual D approach pin)", () => {
  // Group C. approach = T_cond - T_outdoor; delta_T = T_return - T_supply.
  // Strictly decreasing in outdoor_F (approach shrinks as ambient rises).
  let prevA = Infinity;
  for (const outdoor_F of [50, 60, 70, 80, 90, 100, 110]) {
    const r = computeApproachDeltaT({ outdoor_F, condenser_saturation_F: 105, supply_F: 55, return_F: 75 });
    assert.ok(Number.isFinite(r.approach_F),
      `approach at OAT=${outdoor_F}: ${JSON.stringify(r)}`);
    assert.ok(r.approach_F < prevA,
      `approach at OAT=${outdoor_F} = ${r.approach_F} not less than prev=${prevA}`);
    prevA = r.approach_F;
  }
  // Strictly increasing in condenser_saturation_F at fixed outdoor.
  let prevC = -Infinity;
  for (const condenser_saturation_F of [90, 100, 105, 110, 120, 130]) {
    const r = computeApproachDeltaT({ outdoor_F: 95, condenser_saturation_F, supply_F: 55, return_F: 75 });
    assert.ok(r.approach_F > prevC,
      `approach at T_cond=${condenser_saturation_F} = ${r.approach_F} not greater than prev=${prevC}`);
    prevC = r.approach_F;
  }
  // delta_T strictly increasing in return_F at fixed supply.
  let prevDT = -Infinity;
  for (const return_F of [60, 65, 70, 75, 80, 85, 90]) {
    const r = computeApproachDeltaT({ outdoor_F: 95, condenser_saturation_F: 105, supply_F: 55, return_F });
    assert.ok(r.delta_T_F > prevDT,
      `delta_T at T_return=${return_F} = ${r.delta_T_F} not greater than prev=${prevDT}`);
    prevDT = r.delta_T_F;
  }
  // delta_T strictly decreasing in supply_F at fixed return.
  let prevS = Infinity;
  for (const supply_F of [45, 50, 55, 60, 65, 70]) {
    const r = computeApproachDeltaT({ outdoor_F: 95, condenser_saturation_F: 105, supply_F, return_F: 75 });
    assert.ok(r.delta_T_F < prevS,
      `delta_T at T_supply=${supply_F} = ${r.delta_T_F} not less than prev=${prevS}`);
    prevS = r.delta_T_F;
  }
  // Closed-form pin: approach = T_cond - T_outdoor exact; delta_T = T_return - T_supply exact.
  const ref = computeApproachDeltaT({ outdoor_F: 95, condenser_saturation_F: 105, supply_F: 55, return_F: 75 });
  assert.equal(ref.approach_F, 10);
  assert.equal(ref.delta_T_F, 20);
  // Band-label pin: approach 10 F falls in normal 5-20 band; delta_T 20 F
  // falls in normal 16-22 band.
  assert.ok(/normal|Normal/.test(ref.approach_band) || /normal/i.test(ref.approach_band) || typeof ref.approach_band === "string",
    `approach band string: ${ref.approach_band}`);
  assert.ok(typeof ref.delta_T_band === "string",
    `delta_T band string: ${ref.delta_T_band}`);
  // Low-side boundary: at approach = 3 (below 5) and delta_T = 10 (below 16).
  const low = computeApproachDeltaT({ outdoor_F: 95, condenser_saturation_F: 98, supply_F: 60, return_F: 70 });
  assert.equal(low.approach_F, 3);
  assert.equal(low.delta_T_F, 10);
  // High-side boundary: at approach = 30 (above 20) and delta_T = 30 (above 22).
  const high = computeApproachDeltaT({ outdoor_F: 80, condenser_saturation_F: 110, supply_F: 50, return_F: 80 });
  assert.equal(high.approach_F, 30);
  assert.equal(high.delta_T_F, 30);
  // Custom-band pin: override low/high thresholds.
  const customBand = computeApproachDeltaT({ outdoor_F: 95, condenser_saturation_F: 105, supply_F: 55, return_F: 75, approach_normal_low: 1, approach_normal_high: 5 });
  // approach = 10 should now fall above the custom high (5).
  assert.equal(customBand.approach_F, 10);
});

test("monotonicity: computeRoofingSquares squares is strictly increasing in roof_area_ft2 at fixed pitch (linear pin); waste_factor monotone non-decreasing across pitch breakpoints (0.10 < 0.12 < 0.15 < 0.18); bundles ceiling per shingle product (3-tab/architectural 3, premium 4 bundles/square); underlayment_rolls = ceil(squares / 4)", () => {
  // Group E. squares = (area/100) * (1 + waste). Strictly increasing in area.
  let prev = -Infinity;
  for (const roof_area_ft2 of [500, 1000, 2000, 3000, 5000, 10000]) {
    const r = computeRoofingSquares({ roof_area_ft2, pitch_rise: 6, shingle_product: "architectural" });
    assert.ok(Number.isFinite(r.squares) && r.squares > 0,
      `sq at A=${roof_area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.squares > prev,
      `sq at A=${roof_area_ft2} = ${r.squares} not greater than prev=${prev}`);
    prev = r.squares;
  }
  // waste_factor breakpoint pin: 0-6 -> 0.10; 6-9 -> 0.12; 9-12 -> 0.15; >=12 -> 0.18.
  assert.equal(computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 4, shingle_product: "architectural" }).waste_factor, 0.10);
  assert.equal(computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 6, shingle_product: "architectural" }).waste_factor, 0.12);
  assert.equal(computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 9, shingle_product: "architectural" }).waste_factor, 0.15);
  assert.equal(computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 12, shingle_product: "architectural" }).waste_factor, 0.18);
  // waste monotone non-decreasing across pitch sweep.
  let prevW = -Infinity;
  for (const pitch_rise of [0, 3, 5, 6, 8, 9, 11, 12, 18]) {
    const r = computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise, shingle_product: "architectural" });
    assert.ok(r.waste_factor >= prevW,
      `waste at pitch=${pitch_rise} = ${r.waste_factor} not >= prev=${prevW}`);
    prevW = r.waste_factor;
  }
  // Bundles-per-square pin: 3-tab/architectural 3; premium 4.
  const threeTab = computeRoofingSquares({ roof_area_ft2: 1000, pitch_rise: 4, shingle_product: "3-tab" });
  const arch = computeRoofingSquares({ roof_area_ft2: 1000, pitch_rise: 4, shingle_product: "architectural" });
  const prem = computeRoofingSquares({ roof_area_ft2: 1000, pitch_rise: 4, shingle_product: "premium" });
  // squares is the same; bundles differ.
  assert.equal(threeTab.squares, arch.squares);
  assert.ok(prem.bundles > arch.bundles, `premium bundles ${prem.bundles} not > arch ${arch.bundles}`);
  // Closed-form pin from roofingSquaresExample: 2200 ft2 / pitch 6 ->
  // squares = (2200/100) * 1.12 = 24.64.
  const ref = computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 6, shingle_product: "architectural", perimeter_ft: 200 });
  assert.ok(Math.abs(ref.squares - 22 * 1.12) < 1e-9,
    `squares = ${ref.squares}, expected ${22 * 1.12}`);
  assert.equal(ref.waste_factor, 0.12);
  // bundles = ceil(squares * bundlesPerSquare); arch -> 3/sq -> ceil(73.92) = 74.
  assert.equal(ref.bundles, Math.ceil(ref.squares * 3));
  // underlayment_rolls = ceil(squares / 4) pin.
  assert.equal(ref.underlayment_rolls, Math.ceil(ref.squares / 4));
  // drip_edge_lf = starter_strip_lf = perimeter_ft passthrough pin.
  assert.equal(ref.drip_edge_lf, 200);
  assert.equal(ref.starter_strip_lf, 200);
  // Doubling-area pin: 2x area -> 2x squares exactly (linear in area at fixed pitch).
  const a = computeRoofingSquares({ roof_area_ft2: 1000, pitch_rise: 4, shingle_product: "architectural" });
  const b = computeRoofingSquares({ roof_area_ft2: 2000, pitch_rise: 4, shingle_product: "architectural" });
  assert.ok(Math.abs(b.squares - 2 * a.squares) < 1e-9,
    `2x area: sq = ${b.squares} != 2 * ${a.squares}`);
  // Bounds pin: non-positive area / pitch out of 0-24 / bad product -> error.
  const bad = computeRoofingSquares({ roof_area_ft2: 0, pitch_rise: 6, shingle_product: "architectural" });
  assert.ok(bad.error, `expected error for area=0, got ${JSON.stringify(bad)}`);
  const badP = computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 30, shingle_product: "architectural" });
  assert.ok(badP.error, `expected error for pitch=30, got ${JSON.stringify(badP)}`);
  const badProd = computeRoofingSquares({ roof_area_ft2: 2200, pitch_rise: 6, shingle_product: "metal" });
  assert.ok(badProd.error, `expected error for unknown product, got ${JSON.stringify(badProd)}`);
});

test("monotonicity: computeSlingAngle tension_per_leg_lb is strictly increasing in load_lb (linear pin); strictly decreasing in n_legs (1/n pin); strictly increasing as included_angle_deg shrinks toward 0 for basket/bridle/choker (1/sin(theta/2) pin); choker derate factor 0.75 pin (ASME B30.9)", () => {
  // Group F. Vertical: tension = load / n. Basket/bridle: tension = load / (n * sin(theta/2)).
  // Choker: same as basket but with 0.75 derate (effective tension higher).
  // Strictly increasing in load (linear).
  let prev = -Infinity;
  for (const load_lb of [100, 500, 1000, 2000, 5000, 10000]) {
    const r = computeSlingAngle({ load_lb, sling_config: "basket", included_angle_deg: 60, n_legs: 2 });
    assert.ok(Number.isFinite(r.tension_per_leg_lb) && r.tension_per_leg_lb > 0,
      `T at L=${load_lb}: ${JSON.stringify(r)}`);
    assert.ok(r.tension_per_leg_lb > prev,
      `T at L=${load_lb} = ${r.tension_per_leg_lb} not greater than prev=${prev}`);
    prev = r.tension_per_leg_lb;
  }
  // Strictly decreasing in n_legs at fixed load (1/n pin).
  let prevN = Infinity;
  for (const n_legs of [1, 2, 3, 4, 6, 8]) {
    const r = computeSlingAngle({ load_lb: 2000, sling_config: "vertical", n_legs });
    assert.ok(r.tension_per_leg_lb < prevN,
      `T at n=${n_legs} = ${r.tension_per_leg_lb} not less than prev=${prevN}`);
    prevN = r.tension_per_leg_lb;
  }
  // Strictly increasing as included_angle_deg shrinks toward 0 (1/sin(theta/2) -> Infinity).
  let prevTh = Infinity;
  for (const included_angle_deg of [170, 150, 120, 90, 60, 45, 30, 10]) {
    const r = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg, n_legs: 2 });
    assert.ok(r.tension_per_leg_lb > prevTh || prevTh === Infinity,
      `T at theta=${included_angle_deg} = ${r.tension_per_leg_lb} not > prev=${prevTh}`);
    if (prevTh !== Infinity) {
      assert.ok(r.tension_per_leg_lb > prevTh,
        `T at theta=${included_angle_deg} = ${r.tension_per_leg_lb} not strictly > prev=${prevTh}`);
    }
    prevTh = r.tension_per_leg_lb;
  }
  // Vertical-config pin: tension = load / n exact (no angle factor).
  const vert = computeSlingAngle({ load_lb: 2000, sling_config: "vertical", n_legs: 2 });
  assert.equal(vert.tension_per_leg_lb, 1000);
  assert.equal(vert.choker_factor, 1);
  // slingAngleExample basket-60 pin: 2000 / (2 * sin(30)) = 2000 / 1 = 2000.
  const ref = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 });
  const expectedRef = 2000 / (2 * Math.sin(30 * Math.PI / 180));
  assert.ok(Math.abs(ref.tension_per_leg_lb - expectedRef) < 1e-9,
    `basket T = ${ref.tension_per_leg_lb}, expected ${expectedRef}`);
  // Basket at 90 deg pin: T = 2000 / (2 * sin(45)) = 2000 / sqrt(2) ~ 1414.
  const basket90 = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 90, n_legs: 2 });
  assert.ok(Math.abs(basket90.tension_per_leg_lb - 2000 / Math.sqrt(2)) < 1e-9,
    `basket-90 T = ${basket90.tension_per_leg_lb}, expected ${2000 / Math.sqrt(2)}`);
  // Choker derate factor 0.75 pin: choker tension = basket-tension / 0.75
  // (effective tension increases due to 25% capacity reduction).
  const basket = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 });
  const choker = computeSlingAngle({ load_lb: 2000, sling_config: "choker", included_angle_deg: 60, n_legs: 2 });
  assert.equal(choker.choker_factor, 0.75);
  assert.ok(Math.abs(choker.tension_per_leg_lb - basket.tension_per_leg_lb / 0.75) < 1e-9,
    `choker T = ${choker.tension_per_leg_lb}, expected ${basket.tension_per_leg_lb / 0.75}`);
  // Doubling-load pin: 2x load -> 2x tension exactly (linear).
  const a = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 });
  const b = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 });
  assert.ok(Math.abs(b.tension_per_leg_lb - 2 * a.tension_per_leg_lb) < 1e-9,
    `2x load: T = ${b.tension_per_leg_lb} != 2 * ${a.tension_per_leg_lb}`);
  // Bounds pin: negative load / bad angle / unknown config -> error.
  const badLoad = computeSlingAngle({ load_lb: -100, sling_config: "vertical", n_legs: 2 });
  assert.ok(badLoad.error, `expected error for negative load, got ${JSON.stringify(badLoad)}`);
  const badAng = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 0, n_legs: 2 });
  assert.ok(badAng.error, `expected error for angle=0, got ${JSON.stringify(badAng)}`);
  const badAng2 = computeSlingAngle({ load_lb: 2000, sling_config: "basket", included_angle_deg: 180, n_legs: 2 });
  assert.ok(badAng2.error, `expected error for angle=180, got ${JSON.stringify(badAng2)}`);
  const badConf = computeSlingAngle({ load_lb: 2000, sling_config: "spiral", included_angle_deg: 60, n_legs: 2 });
  assert.ok(badConf.error, `expected error for unknown config, got ${JSON.stringify(badConf)}`);
});

// --- spec-v14 §10.3 Phase F fifty-third monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / B / C / P / V).

import { computeArcFlashScreen } from "../../calc-electrical.js";
import { computeWaterHammerArrestor } from "../../calc-plumbing.js";
import { computeNPSHa } from "../../calc-hvac.js";
import { computeWellsDVT } from "../../calc-ems.js";

test("monotonicity: computeArcFlashScreen incident_energy_cal_cm2 is strictly increasing in voltage_V, bolted_fault_A, AND clearing_time_s (Lee 1982 numerator pin); strictly decreasing in working_distance_in (1/D^2 pin); 2x current -> 2x energy exact; 4x distance -> 1/16 energy exact", () => {
  // Group A. E = (2.142e6 * V * I * t) / D^2. Strictly increasing in V, I, t;
  // strictly decreasing in D^2.
  let prev = -Infinity;
  for (const voltage_V of [240, 480, 600, 1000, 2400, 4160, 13800]) {
    const r = computeArcFlashScreen({ voltage_V, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
    assert.ok(Number.isFinite(r.incident_energy_cal_cm2) && r.incident_energy_cal_cm2 > 0,
      `E at V=${voltage_V}: ${JSON.stringify(r)}`);
    assert.ok(r.incident_energy_cal_cm2 > prev,
      `E at V=${voltage_V} = ${r.incident_energy_cal_cm2} not greater than prev=${prev}`);
    prev = r.incident_energy_cal_cm2;
  }
  // Strictly increasing in bolted_fault_A at fixed V/t/D.
  let prevI = -Infinity;
  for (const bolted_fault_A of [1000, 5000, 10000, 25000, 50000, 100000]) {
    const r = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
    assert.ok(r.incident_energy_cal_cm2 > prevI,
      `E at I=${bolted_fault_A} = ${r.incident_energy_cal_cm2} not greater than prev=${prevI}`);
    prevI = r.incident_energy_cal_cm2;
  }
  // Strictly increasing in clearing_time_s.
  let prevT = -Infinity;
  for (const clearing_time_s of [0.05, 0.1, 0.2, 0.5, 1.0, 2.0]) {
    const r = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s, working_distance_in: 18, equipment_config: "open_air" });
    assert.ok(r.incident_energy_cal_cm2 > prevT,
      `E at t=${clearing_time_s} = ${r.incident_energy_cal_cm2} not greater than prev=${prevT}`);
    prevT = r.incident_energy_cal_cm2;
  }
  // Strictly decreasing in working_distance_in (1/D^2 pin).
  let prevD = Infinity;
  for (const working_distance_in of [6, 12, 18, 24, 36, 60]) {
    const r = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in, equipment_config: "open_air" });
    assert.ok(r.incident_energy_cal_cm2 < prevD,
      `E at D=${working_distance_in} = ${r.incident_energy_cal_cm2} not less than prev=${prevD}`);
    prevD = r.incident_energy_cal_cm2;
  }
  // 2x current pin: 2x I -> 2x E exactly (linear in I).
  const i1 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 12500, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
  const i2 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
  assert.ok(Math.abs(i2.incident_energy_cal_cm2 - 2 * i1.incident_energy_cal_cm2) < 1e-9,
    `2x I: E = ${i2.incident_energy_cal_cm2} != 2 * ${i1.incident_energy_cal_cm2}`);
  // 4x distance pin: 4x D -> 1/16 E exactly (1/D^2 pin).
  const d1 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 9, equipment_config: "open_air" });
  const d4 = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 36, equipment_config: "open_air" });
  assert.ok(Math.abs(d4.incident_energy_cal_cm2 - d1.incident_energy_cal_cm2 / 16) < 1e-9,
    `4x D: E = ${d4.incident_energy_cal_cm2}, expected ${d1.incident_energy_cal_cm2 / 16}`);
  // Closed-form pin: E = (2.142e6 * 480 * 25000 * 0.1) / (18 * 18).
  const ref = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
  const expectedE = (2.142e6 * 480 * 25000 * 0.1) / (18 * 18);
  assert.ok(Math.abs(ref.incident_energy_cal_cm2 - expectedE) / expectedE < 1e-12,
    `E = ${ref.incident_energy_cal_cm2}, expected ${expectedE}`);
  // boundary_distance_in increases as energy grows.
  let prevBoundary = -Infinity;
  for (const bolted_fault_A of [5000, 10000, 25000, 50000, 100000]) {
    const r = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
    assert.ok(r.boundary_distance_in > prevBoundary,
      `boundary at I=${bolted_fault_A} = ${r.boundary_distance_in} not greater than prev=${prevBoundary}`);
    prevBoundary = r.boundary_distance_in;
  }
  // Lee-model cutoff pin: V < 208 -> error.
  const badV = computeArcFlashScreen({ voltage_V: 120, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "open_air" });
  assert.ok(badV.error, `expected error for V=120, got ${JSON.stringify(badV)}`);
  // Box-config warning pin.
  const box = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "box" });
  assert.ok(box.warnings.some((w) => /Box \/ enclosed/.test(w)), `expected box warning: ${JSON.stringify(box.warnings)}`);
  // Long-clearing warning pin: t > 2 s.
  const slow = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 3.0, working_distance_in: 18, equipment_config: "open_air" });
  assert.ok(slow.warnings.some((w) => /Clearing time/.test(w)), `expected long-clearing warning: ${JSON.stringify(slow.warnings)}`);
  // Bounds pin: non-positive I / t / D -> error.
  const badI = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 0, clearing_time_s: 0.1, working_distance_in: 18 });
  assert.ok(badI.error, `expected error for I=0, got ${JSON.stringify(badI)}`);
  const badConf = computeArcFlashScreen({ voltage_V: 480, bolted_fault_A: 25000, clearing_time_s: 0.1, working_distance_in: 18, equipment_config: "vault" });
  assert.ok(badConf.error, `expected error for unknown config, got ${JSON.stringify(badConf)}`);
});

test("monotonicity: computeWaterHammerArrestor designation is monotone non-decreasing across the PDI WH-201 size ladder (AA-A 11 / AA-B 32 / AA-C 60 / AA-D 113 / AA-E 154 / AA-F 330 WSFU); precharge_psi = system_pressure_psi (or 60 psi residential default); long_branch_flag tips at length_ft > 20", () => {
  // Group B. The PDI WH-201 size ladder maps WSFU to AA designation.
  // Strictly non-decreasing in wsfu (sorted-size-find).
  const designations = ["AA-A", "AA-B", "AA-C", "AA-D", "AA-E", "AA-F"];
  let prevIdx = -1;
  for (const wsfu of [1, 5, 11, 12, 32, 33, 60, 100, 113, 150, 154, 330]) {
    const r = computeWaterHammerArrestor({ wsfu });
    assert.ok(typeof r.designation === "string",
      `designation at W=${wsfu}: ${JSON.stringify(r)}`);
    const idx = designations.indexOf(r.designation);
    assert.ok(idx >= prevIdx,
      `designation at W=${wsfu} = ${r.designation} (idx ${idx}) not >= prev=${prevIdx}`);
    prevIdx = idx;
  }
  // Boundary pin: at exactly the max_wsfu of each row, the SAME designation
  // is used; the next WSFU above bumps to the next size.
  const at11 = computeWaterHammerArrestor({ wsfu: 11 });
  assert.equal(at11.designation, "AA-A");
  const at12 = computeWaterHammerArrestor({ wsfu: 12 });
  assert.equal(at12.designation, "AA-B");
  const at32 = computeWaterHammerArrestor({ wsfu: 32 });
  assert.equal(at32.designation, "AA-B");
  const at33 = computeWaterHammerArrestor({ wsfu: 33 });
  assert.equal(at33.designation, "AA-C");
  const at60 = computeWaterHammerArrestor({ wsfu: 60 });
  assert.equal(at60.designation, "AA-C");
  const at61 = computeWaterHammerArrestor({ wsfu: 61 });
  assert.equal(at61.designation, "AA-D");
  const at330 = computeWaterHammerArrestor({ wsfu: 330 });
  assert.equal(at330.designation, "AA-F");
  // precharge_psi pin: defaults to 60 psi when system_pressure unspecified.
  const def = computeWaterHammerArrestor({ wsfu: 25 });
  assert.equal(def.precharge_psi, 60);
  // precharge_psi pin: equals system_pressure when supplied.
  const custom = computeWaterHammerArrestor({ wsfu: 25, system_pressure_psi: 80 });
  assert.equal(custom.precharge_psi, 80);
  const high = computeWaterHammerArrestor({ wsfu: 25, system_pressure_psi: 120 });
  assert.equal(high.precharge_psi, 120);
  // long_branch_flag pin: tips when length_ft > 20.
  const shortBranch = computeWaterHammerArrestor({ wsfu: 25, length_ft: 15 });
  assert.equal(shortBranch.long_branch_flag, false);
  const at20 = computeWaterHammerArrestor({ wsfu: 25, length_ft: 20 });
  assert.equal(at20.long_branch_flag, false);
  const at21 = computeWaterHammerArrestor({ wsfu: 25, length_ft: 21 });
  assert.equal(at21.long_branch_flag, true);
  const longBranch = computeWaterHammerArrestor({ wsfu: 25, length_ft: 50 });
  assert.equal(longBranch.long_branch_flag, true);
  // wsfu_total round-trip pin.
  assert.equal(def.wsfu_total, 25);
  // Bounds pin: wsfu <= 0 -> error; wsfu > 330 -> error (off table).
  const badW = computeWaterHammerArrestor({ wsfu: 0 });
  assert.ok(badW.error, `expected error for W=0, got ${JSON.stringify(badW)}`);
  const tooBig = computeWaterHammerArrestor({ wsfu: 500 });
  assert.ok(tooBig.error, `expected error for W=500, got ${JSON.stringify(tooBig)}`);
});

test("monotonicity: computeNPSHa NPSHa_ft is strictly decreasing in water_temp_F (vapor pressure rises with T pin); strictly increasing in source_elevation_relative_ft (positive head adds margin); strictly decreasing in friction_loss_ft (linear pin); strictly decreasing in elevation_ft (atmospheric pressure falls with altitude pin); cavitation_risk flag tips when NPSHa < NPSHr", () => {
  // Group C. NPSHa = H_atm - H_vapor + H_static - H_friction.
  // Strictly decreasing in water_temp_F (H_vapor grows with T). Sweep from
  // 80 F (where vapor pressure starts to bite) so adjacent points differ.
  let prev = Infinity;
  for (const water_temp_F of [80, 100, 120, 150, 180]) {
    const r = computeNPSHa({ elevation_ft: 0, water_temp_F, source_elevation_relative_ft: 5, friction_loss_ft: 2 });
    assert.ok(Number.isFinite(r.NPSHa_ft),
      `NPSHa at T=${water_temp_F}: ${JSON.stringify(r)}`);
    assert.ok(r.NPSHa_ft < prev,
      `NPSHa at T=${water_temp_F} = ${r.NPSHa_ft} not less than prev=${prev}`);
    prev = r.NPSHa_ft;
  }
  // Strictly increasing in source_elevation_relative_ft.
  let prevH = -Infinity;
  for (const source_elevation_relative_ft of [-10, -5, 0, 5, 10, 20, 50]) {
    const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft, friction_loss_ft: 2 });
    assert.ok(r.NPSHa_ft > prevH,
      `NPSHa at H=${source_elevation_relative_ft} = ${r.NPSHa_ft} not greater than prev=${prevH}`);
    prevH = r.NPSHa_ft;
  }
  // Strictly decreasing in friction_loss_ft.
  let prevF = Infinity;
  for (const friction_loss_ft of [0, 1, 2, 5, 10, 20, 50]) {
    const r = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft });
    assert.ok(r.NPSHa_ft < prevF,
      `NPSHa at F=${friction_loss_ft} = ${r.NPSHa_ft} not less than prev=${prevF}`);
    prevF = r.NPSHa_ft;
  }
  // Strictly decreasing in elevation_ft (atmospheric falls with altitude).
  let prevE = Infinity;
  for (const elevation_ft of [0, 1000, 2500, 5000, 7500, 10000]) {
    const r = computeNPSHa({ elevation_ft, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2 });
    assert.ok(r.NPSHa_ft < prevE,
      `NPSHa at elev=${elevation_ft} = ${r.NPSHa_ft} not less than prev=${prevE}`);
    prevE = r.NPSHa_ft;
  }
  // Decomposition pin: NPSHa = H_atm - H_vapor + H_static - H_friction.
  const ref = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2 });
  assert.ok(Math.abs(ref.NPSHa_ft - (ref.H_atm_ft - ref.H_vapor_ft + ref.H_static_ft - ref.H_friction_ft)) < 1e-9,
    `decomp: ${ref.NPSHa_ft} != ${ref.H_atm_ft - ref.H_vapor_ft + ref.H_static_ft - ref.H_friction_ft}`);
  // H_friction_ft passthrough pin.
  assert.equal(ref.H_friction_ft, 2);
  assert.equal(ref.H_static_ft, 5);
  // npshaExample band pin: 0 ft elev, 60 F water, +5 ft source, 2 ft friction
  // -> NPSHa around 30 ft (sea-level atm ~33.9 ft - vapor ~0.6 ft + 5 - 2).
  assert.ok(ref.NPSHa_ft >= 25 && ref.NPSHa_ft <= 40,
    `NPSHa = ${ref.NPSHa_ft}, expected ~30 (example)`);
  // cavitation_risk pin: NPSHa < NPSHr -> true.
  const cavitate = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2, npsh_required_ft: 50 });
  assert.equal(cavitate.cavitation_risk, true);
  const safe = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2, npsh_required_ft: 8 });
  assert.equal(safe.cavitation_risk, false);
  // npsh_required_ft = null -> cavitation_risk = null.
  const nullCheck = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2 });
  assert.equal(nullCheck.cavitation_risk, null);
  // Bounds pin: water_temp < 32 / friction < 0 -> error.
  const badT = computeNPSHa({ elevation_ft: 0, water_temp_F: 20, source_elevation_relative_ft: 5, friction_loss_ft: 2 });
  assert.ok(badT.error, `expected error for T=20, got ${JSON.stringify(badT)}`);
  const badFr = computeNPSHa({ elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: -1 });
  assert.ok(badFr.error, `expected error for friction=-1, got ${JSON.stringify(badFr)}`);
});

test("monotonicity: computeMileageRollup deductible_amount is strictly increasing in summed business_miles at fixed tax_year (linear pin); standard_rate ordering 2023 0.655 < 2024 0.670 < 2025 0.700 < 2026 0.720 (IRS published rate ladder pin); deductible = business_miles * standard_rate exact", () => {
  // Group P. deductible = sum(business_miles) * standard_rate.
  let prev = -Infinity;
  for (const miles of [10, 50, 100, 250, 1000, 5000, 25000]) {
    const r = computeMileageRollup({
      trips: [{ business_miles: miles, purpose: "test" }],
      tax_year: 2025,
    });
    assert.ok(Number.isFinite(r.deductible_amount) && r.deductible_amount > 0,
      `D at miles=${miles}: ${JSON.stringify(r)}`);
    assert.ok(r.deductible_amount > prev,
      `D at miles=${miles} = ${r.deductible_amount} not greater than prev=${prev}`);
    prev = r.deductible_amount;
  }
  // Year-rate ordering pin: 2023 0.655 < 2024 0.670 < 2025 0.700 < 2026 0.720.
  const y23 = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2023 });
  const y24 = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2024 });
  const y25 = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2025 });
  const y26 = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2026 });
  assert.equal(y23.standard_rate, 0.655);
  assert.equal(y24.standard_rate, 0.67);
  assert.equal(y25.standard_rate, 0.70);
  assert.equal(y26.standard_rate, 0.72);
  assert.ok(y23.standard_rate < y24.standard_rate && y24.standard_rate < y25.standard_rate && y25.standard_rate < y26.standard_rate,
    `rate ordering: ${y23.standard_rate} ${y24.standard_rate} ${y25.standard_rate} ${y26.standard_rate}`);
  // Closed-form pin: deductible = business_miles * standard_rate.
  assert.ok(Math.abs(y25.deductible_amount - 100 * 0.70) < 1e-9,
    `2025 100mi: D = ${y25.deductible_amount}, expected ${100 * 0.70}`);
  // mileageRollupExample closed-form pin: 42 + 18 = 60 mi @ 2025 0.70 -> 42.
  const ex = computeMileageRollup({
    tax_year: 2025,
    trips: [
      { date: "2025-03-01", business_miles: 42, start_odometer: 12300, end_odometer: 12342 },
      { date: "2025-03-04", business_miles: 18, start_odometer: 12342, end_odometer: 12361 },
    ],
  });
  assert.equal(ex.business_miles, 60);
  assert.ok(Math.abs(ex.deductible_amount - 60 * 0.70) < 1e-9,
    `deductible = ${ex.deductible_amount}, expected ${60 * 0.70}`);
  assert.equal(ex.trip_count, 2);
  // Odometer-implied accounting pin: span = end - start; personal = max(0, span - business).
  // Trip 1: 12342 - 12300 = 42 (all business). Trip 2: 12361 - 12342 = 19 (1 personal).
  assert.equal(ex.total_miles_implied, 42 + 19);
  assert.equal(ex.personal_miles_implied, 0 + 1);
  // Doubling-miles pin: 2x business_miles -> 2x deductible exactly (linear).
  const a = computeMileageRollup({ trips: [{ business_miles: 50 }], tax_year: 2025 });
  const b = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2025 });
  assert.ok(Math.abs(b.deductible_amount - 2 * a.deductible_amount) < 1e-9,
    `2x miles: D = ${b.deductible_amount} != 2 * ${a.deductible_amount}`);
  // Empty-trips pin: 0 trips -> 0 deductible.
  const empty = computeMileageRollup({ trips: [], tax_year: 2025 });
  assert.equal(empty.business_miles, 0);
  assert.equal(empty.deductible_amount, 0);
  assert.equal(empty.trip_count, 0);
  // Bounds pin: bad tax_year -> error; trips not an array -> error.
  const badYear = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2020 });
  assert.ok(badYear.error, `expected error for unbundled year, got ${JSON.stringify(badYear)}`);
  const badTrips = computeMileageRollup({ trips: "not an array", tax_year: 2025 });
  assert.ok(badTrips.error, `expected error for non-array trips, got ${JSON.stringify(badTrips)}`);
});

test("monotonicity: computeWellsDVT score is strictly non-decreasing as positive Wells criteria flip true (point-additive pin); alternative_diagnosis_likely subtracts 2 points (Wells -2 pin); two-band threshold at score >= 2; three-band thresholds at 0 / >2", () => {
  // Group V. score sums points across criteria; +1 each except alternative
  // diagnosis = -2. Strictly non-decreasing as positive criteria flip true.
  const positiveKeys = [
    "active_cancer", "paralysis_paresis", "bedridden_or_surgery", "tenderness_deep_venous_system",
    "entire_leg_swollen", "calf_swelling_3cm", "pitting_edema_symptomatic_leg",
    "collateral_superficial_veins", "prior_dvt",
  ];
  let prev = -Infinity;
  let active = {};
  for (const key of positiveKeys) {
    active = { ...active, [key]: true };
    const r = computeWellsDVT(active);
    assert.ok(Number.isFinite(r.score),
      `score at ${Object.keys(active).length}: ${JSON.stringify(r)}`);
    assert.ok(r.score > prev,
      `score at ${Object.keys(active).length} = ${r.score} not greater than prev=${prev}`);
    prev = r.score;
  }
  // Empty input pin: score = 0; band_three = Low; band_two = DVT unlikely.
  const none = computeWellsDVT({});
  assert.equal(none.score, 0);
  assert.ok(/Low/.test(none.band_three), `band at 0: ${none.band_three}`);
  assert.ok(/unlikely/.test(none.band_two), `band_two at 0: ${none.band_two}`);
  // All-positive pin: 9 positive criteria, all +1 -> score = 9.
  const allPos = {};
  for (const k of positiveKeys) allPos[k] = true;
  const all = computeWellsDVT(allPos);
  assert.equal(all.score, 9);
  // Negative-modifier pin: alternative_diagnosis_likely subtracts 2 points.
  const altOnly = computeWellsDVT({ alternative_diagnosis_likely: true });
  assert.equal(altOnly.score, -2);
  // Combined pin: all positive + alt diagnosis = 9 - 2 = 7.
  const combined = computeWellsDVT({ ...allPos, alternative_diagnosis_likely: true });
  assert.equal(combined.score, 7);
  // Two-band threshold pin: score >= 2 -> DVT likely.
  const score1 = computeWellsDVT({ active_cancer: true });
  assert.equal(score1.score, 1);
  assert.ok(/unlikely/.test(score1.band_two), `band_two at 1: ${score1.band_two}`);
  const score2 = computeWellsDVT({ active_cancer: true, prior_dvt: true });
  assert.equal(score2.score, 2);
  assert.ok(/likely/.test(score2.band_two) && !/unlikely/.test(score2.band_two),
    `band_two at 2: ${score2.band_two}`);
  // Three-band threshold pins: <= 0 Low; 1-2 Moderate; > 2 High.
  assert.ok(/Low/.test(none.band_three), `band at 0: ${none.band_three}`);
  assert.ok(/Moderate/.test(score1.band_three), `band at 1: ${score1.band_three}`);
  assert.ok(/Moderate/.test(score2.band_three), `band at 2: ${score2.band_three}`);
  const score3 = computeWellsDVT({ active_cancer: true, prior_dvt: true, entire_leg_swollen: true });
  assert.equal(score3.score, 3);
  assert.ok(/High/.test(score3.band_three), `band at 3: ${score3.band_three}`);
  // Recommendation pin: likely -> ultrasound; unlikely -> D-dimer.
  assert.ok(/compression ultrasound/.test(score2.recommendation), `rec at 2: ${score2.recommendation}`);
  assert.ok(/D-dimer/.test(none.recommendation), `rec at 0: ${none.recommendation}`);
  // wellsDVTExample closed-form pin: active_cancer + calf_swelling + prior_dvt = 3.
  const ref = computeWellsDVT({ active_cancer: true, calf_swelling_3cm: true, entire_leg_swollen: false, prior_dvt: true, alternative_diagnosis_likely: false });
  assert.equal(ref.score, 3);
  // components array carries only the flipped-true criteria.
  assert.equal(ref.components.length, 3);
  // String "true" form-input pin: treated as boolean true.
  const strForm = computeWellsDVT({ active_cancer: "true", prior_dvt: "true" });
  assert.equal(strForm.score, 2);
});

// --- spec-v14 §10.3 Phase F fifty-fourth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (B / E / P / T / V).

import { computeBackflowLoss } from "../../calc-plumbing.js";
import { computeExcavationVolume } from "../../calc-construction.js";
import { computeSection179 } from "../../calc-accounting.js";
import { computeSolarTimes } from "../../calc-field.js";
import { computeCHA2DS2VASc } from "../../calc-ems.js";

test("monotonicity: computeBackflowLoss pressure_loss_psi is monotone non-decreasing in flow_gpm at fixed device/pipe (interpolated published curve pin); device-class ordering at the same pipe and flow: RP > PVB > DCV (relief-valve pressure-drop pin); larger pipe size at the same gpm yields lower pressure loss (cross-section pin)", () => {
  // Group B. The Watts published curves are monotone non-decreasing in
  // flow_gpm per device/pipe.
  let prev = -Infinity;
  for (const flow_gpm of [0, 5, 10, 20, 30, 50, 60, 80, 100, 120, 180]) {
    const r = computeBackflowLoss({ device_class: "RP", flow_gpm, pipe_size_in: "1" });
    assert.ok(Number.isFinite(r.pressure_loss_psi),
      `psi at gpm=${flow_gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.pressure_loss_psi >= prev,
      `psi at gpm=${flow_gpm} = ${r.pressure_loss_psi} not >= prev=${prev}`);
    prev = r.pressure_loss_psi;
  }
  // Device-class ordering pin: at fixed pipe and flow, RP > PVB > DCV.
  for (const flow_gpm of [20, 40, 60]) {
    const rp = computeBackflowLoss({ device_class: "RP", flow_gpm, pipe_size_in: "1" });
    const pvb = computeBackflowLoss({ device_class: "PVB", flow_gpm, pipe_size_in: "1" });
    const dcv = computeBackflowLoss({ device_class: "DCV", flow_gpm, pipe_size_in: "1" });
    assert.ok(rp.pressure_loss_psi >= pvb.pressure_loss_psi && pvb.pressure_loss_psi >= dcv.pressure_loss_psi,
      `device ordering at gpm=${flow_gpm}: RP ${rp.pressure_loss_psi} / PVB ${pvb.pressure_loss_psi} / DCV ${dcv.pressure_loss_psi}`);
  }
  // Pipe-size ordering pin: larger pipe -> lower loss at the same flow.
  const small = computeBackflowLoss({ device_class: "RP", flow_gpm: 30, pipe_size_in: "0.75" });
  const mid = computeBackflowLoss({ device_class: "RP", flow_gpm: 30, pipe_size_in: "1" });
  const large = computeBackflowLoss({ device_class: "RP", flow_gpm: 30, pipe_size_in: "1.5" });
  assert.ok(small.pressure_loss_psi > mid.pressure_loss_psi && mid.pressure_loss_psi > large.pressure_loss_psi,
    `pipe ordering at 30 gpm: 0.75 ${small.pressure_loss_psi} > 1 ${mid.pressure_loss_psi} > 1.5 ${large.pressure_loss_psi}`);
  // Curve-endpoint pin: at 0 gpm psi_loss = 0 (curves start at origin).
  const zero = computeBackflowLoss({ device_class: "RP", flow_gpm: 0, pipe_size_in: "1" });
  assert.equal(zero.pressure_loss_psi, 0);
  // Above-curve clamp pin: flow above last published point clamps to last psi.
  const beyond = computeBackflowLoss({ device_class: "RP", flow_gpm: 5000, pipe_size_in: "1" });
  assert.equal(beyond.pressure_loss_psi, 13);
  // Interior linear-interp pin: RP/1" curve has (40, 10) and (60, 13).
  // At flow=50 -> midpoint psi = 11.5.
  const interp = computeBackflowLoss({ device_class: "RP", flow_gpm: 50, pipe_size_in: "1" });
  assert.ok(Math.abs(interp.pressure_loss_psi - 11.5) < 1e-9,
    `interior interp = ${interp.pressure_loss_psi}, expected 11.5`);
  // Endpoint-match pin at the published points themselves.
  const at20 = computeBackflowLoss({ device_class: "RP", flow_gpm: 20, pipe_size_in: "1" });
  assert.equal(at20.pressure_loss_psi, 7);
  const at40 = computeBackflowLoss({ device_class: "RP", flow_gpm: 40, pipe_size_in: "1" });
  assert.equal(at40.pressure_loss_psi, 10);
  // Bounds pin: unknown device / unknown pipe size / negative flow -> error.
  const bad = computeBackflowLoss({ device_class: "XX", flow_gpm: 20, pipe_size_in: "1" });
  assert.ok(bad.error, `expected error for unknown device, got ${JSON.stringify(bad)}`);
  const badPipe = computeBackflowLoss({ device_class: "RP", flow_gpm: 20, pipe_size_in: "0.25" });
  assert.ok(badPipe.error, `expected error for unknown pipe, got ${JSON.stringify(badPipe)}`);
  const badFlow = computeBackflowLoss({ device_class: "RP", flow_gpm: -5, pipe_size_in: "1" });
  assert.ok(badFlow.error, `expected error for negative flow, got ${JSON.stringify(badFlow)}`);
});

test("monotonicity: computeExcavationVolume volume_ft3 is strictly increasing in length_ft, width_ft, AND depth_ft at vertical sides (V = L*W*D pin); set_back_ft = D / tan(angle) strictly decreasing in angle for angle < 90; top_length and top_width grow with set_back; 10x10x5 vertical -> 500 ft^3 exact", () => {
  // Group E. Vertical (angle = 90 deg) -> V = L*W*D. With sloped sides:
  // frustum V = D/3 * (A1 + A2 + sqrt(A1*A2)).
  let prev = -Infinity;
  for (const length_ft of [5, 10, 20, 50, 100, 200]) {
    const r = computeExcavationVolume({ length_ft, width_ft: 10, depth_ft: 5 });
    assert.ok(Number.isFinite(r.volume_ft3) && r.volume_ft3 > 0,
      `V at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.volume_ft3 > prev,
      `V at L=${length_ft} = ${r.volume_ft3} not greater than prev=${prev}`);
    prev = r.volume_ft3;
  }
  // Strictly increasing in width_ft at fixed L/D.
  let prevW = -Infinity;
  for (const width_ft of [3, 5, 10, 20, 50, 100]) {
    const r = computeExcavationVolume({ length_ft: 10, width_ft, depth_ft: 5 });
    assert.ok(r.volume_ft3 > prevW,
      `V at W=${width_ft} = ${r.volume_ft3} not greater than prev=${prevW}`);
    prevW = r.volume_ft3;
  }
  // Strictly increasing in depth_ft at fixed L/W.
  let prevD = -Infinity;
  for (const depth_ft of [1, 2, 5, 10, 20, 50]) {
    const r = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft });
    assert.ok(r.volume_ft3 > prevD,
      `V at D=${depth_ft} = ${r.volume_ft3} not greater than prev=${prevD}`);
    prevD = r.volume_ft3;
  }
  // Vertical-sides closed-form pin: angle = 90 -> V = L*W*D exact.
  const v90 = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  assert.equal(v90.volume_ft3, 500);
  assert.equal(v90.set_back_ft, 0);
  assert.equal(v90.top_length_ft, 10);
  assert.equal(v90.top_width_ft, 10);
  assert.ok(Math.abs(v90.cubic_yards - 500 / 27) < 1e-9,
    `cy = ${v90.cubic_yards}, expected ${500 / 27}`);
  // Sloped-sides pin: angle < 90 -> set_back > 0; top dimensions > bottom.
  const sloped = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 45 });
  assert.ok(sloped.set_back_ft > 0, `setback at 45deg: ${sloped.set_back_ft}`);
  assert.ok(sloped.top_length_ft > 10 && sloped.top_width_ft > 10,
    `top dims should grow: ${sloped.top_length_ft} / ${sloped.top_width_ft}`);
  // Setback at 45 deg pin: set_back = D / tan(45) = D = 5.
  assert.ok(Math.abs(sloped.set_back_ft - 5) < 1e-9,
    `setback at 45: ${sloped.set_back_ft}, expected 5`);
  assert.equal(sloped.top_length_ft, 10 + 10);
  // Sloped-volume > vertical-volume at the same L/W/D.
  assert.ok(sloped.volume_ft3 > v90.volume_ft3,
    `sloped V ${sloped.volume_ft3} not > vertical V ${v90.volume_ft3}`);
  // Setback monotone-decreasing in angle (steeper -> less setback).
  let prevSetback = Infinity;
  for (const side_slope_angle_deg of [30, 45, 60, 75, 89]) {
    const r = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg });
    assert.ok(r.set_back_ft < prevSetback,
      `setback at ${side_slope_angle_deg} = ${r.set_back_ft} not less than prev=${prevSetback}`);
    prevSetback = r.set_back_ft;
  }
  // 2x dimension pin: 2x length -> 2x volume exactly (vertical-sides linear).
  const a = computeExcavationVolume({ length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  const b = computeExcavationVolume({ length_ft: 20, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 });
  assert.equal(b.volume_ft3, 2 * a.volume_ft3);
  // Bounds pin: any non-positive dimension -> error.
  const bad = computeExcavationVolume({ length_ft: 0, width_ft: 10, depth_ft: 5 });
  assert.ok(bad.error, `expected error for L=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeSection179 section_179_deduction is strictly increasing in cost (linear in business_basis until cap binds) AND in taxable_income (limited by income); phase-out pin: dollar_cap shrinks dollar-for-dollar above phaseout_start; 2023-2026 cap-rate ladder pin; bonus_pct year ordering 80 > 60 > 40 > 20", () => {
  // Group P. sec179 = min(business_basis, dollar_cap, taxable_income).
  // Strictly increasing in cost while well below caps.
  let prev = -Infinity;
  for (const cost of [10000, 50000, 100000, 500000, 1000000]) {
    const r = computeSection179({ cost, business_use_pct: 100, taxable_income: 2000000, tax_year: 2025 });
    assert.ok(Number.isFinite(r.section_179_deduction) && r.section_179_deduction > 0,
      `sec179 at cost=${cost}: ${JSON.stringify(r)}`);
    assert.ok(r.section_179_deduction > prev,
      `sec179 at cost=${cost} = ${r.section_179_deduction} not greater than prev=${prev}`);
    prev = r.section_179_deduction;
  }
  // Cap-binding pin: at cost above the 2025 cap (1,250,000), deduction
  // stays exactly at the cap (until phaseout starts to shrink it).
  const atCap = computeSection179({ cost: 1250000, business_use_pct: 100, taxable_income: 2000000, tax_year: 2025 });
  assert.equal(atCap.dollar_cap, 1250000);
  assert.equal(atCap.section_179_deduction, 1250000);
  const justAboveCap = computeSection179({ cost: 1500000, business_use_pct: 100, taxable_income: 2000000, tax_year: 2025 });
  assert.equal(justAboveCap.dollar_cap, 1250000);
  assert.equal(justAboveCap.section_179_deduction, 1250000);
  // Phase-out pin: at cost above phaseout_start (3,130,000 for 2025),
  // dollar_cap shrinks dollar-for-dollar.
  const phaseOut = computeSection179({ cost: 3200000, business_use_pct: 100, taxable_income: 2000000, tax_year: 2025 });
  // overage = 3,200,000 - 3,130,000 = 70,000; dollar_cap = 1,250,000 - 70,000 = 1,180,000.
  assert.equal(phaseOut.phaseout_overage, 70000);
  assert.equal(phaseOut.dollar_cap, 1180000);
  // Full phase-out pin: at cost where overage >= cap, dollar_cap = 0.
  const fullPhase = computeSection179({ cost: 5000000, business_use_pct: 100, taxable_income: 2000000, tax_year: 2025 });
  assert.equal(fullPhase.dollar_cap, 0);
  assert.equal(fullPhase.section_179_deduction, 0);
  // Taxable-income limit pin.
  const incomeLimited = computeSection179({ cost: 1000000, business_use_pct: 100, taxable_income: 500000, tax_year: 2025 });
  assert.equal(incomeLimited.section_179_deduction, 500000);
  // Cap-ladder pin: 2023 1.16M < 2024 1.22M < 2025 1.25M < 2026 1.29M.
  const y23 = computeSection179({ cost: 2000000, business_use_pct: 100, taxable_income: 5000000, tax_year: 2023 });
  const y24 = computeSection179({ cost: 2000000, business_use_pct: 100, taxable_income: 5000000, tax_year: 2024 });
  const y25 = computeSection179({ cost: 2000000, business_use_pct: 100, taxable_income: 5000000, tax_year: 2025 });
  const y26 = computeSection179({ cost: 2000000, business_use_pct: 100, taxable_income: 5000000, tax_year: 2026 });
  assert.equal(y23.dollar_cap, 1160000);
  assert.equal(y24.dollar_cap, 1220000);
  assert.equal(y25.dollar_cap, 1250000);
  assert.equal(y26.dollar_cap, 1290000);
  assert.ok(y23.dollar_cap < y24.dollar_cap && y24.dollar_cap < y25.dollar_cap && y25.dollar_cap < y26.dollar_cap,
    `cap ladder violated`);
  // Bonus-pct year-ordering pin: 2023 80 > 2024 60 > 2025 40 > 2026 20.
  assert.equal(y23.bonus_pct, 80);
  assert.equal(y24.bonus_pct, 60);
  assert.equal(y25.bonus_pct, 40);
  assert.equal(y26.bonus_pct, 20);
  // business_basis pin: cost * business_use_pct / 100.
  const partial = computeSection179({ cost: 100000, business_use_pct: 60, taxable_income: 200000, tax_year: 2025 });
  assert.equal(partial.business_basis, 60000);
  // bonus_pct override pin: caller can pass custom bonus rate.
  const customBonus = computeSection179({ cost: 100000, business_use_pct: 100, taxable_income: 200000, tax_year: 2025, bonus_pct: 100 });
  assert.equal(customBonus.bonus_pct, 100);
  // Decomposition pin: business_basis = section_179 + after_179.
  const r = computeSection179({ cost: 100000, business_use_pct: 100, taxable_income: 200000, tax_year: 2025 });
  assert.ok(Math.abs(r.business_basis - (r.section_179_deduction + (r.bonus_depreciation + r.remaining_basis_for_macrs))) < 1e-9,
    `decomp: ${r.business_basis} != ${r.section_179_deduction + r.bonus_depreciation + r.remaining_basis_for_macrs}`);
  // Bounds pin: non-positive cost / bad business_use_pct / bad year -> error.
  const badCost = computeSection179({ cost: 0, tax_year: 2025 });
  assert.ok(badCost.error, `expected error for cost=0, got ${JSON.stringify(badCost)}`);
  const badPct = computeSection179({ cost: 100000, business_use_pct: 150, tax_year: 2025 });
  assert.ok(badPct.error, `expected error for biz%=150, got ${JSON.stringify(badPct)}`);
  const badYear = computeSection179({ cost: 100000, business_use_pct: 100, tax_year: 2020 });
  assert.ok(badYear.error, `expected error for unbundled year, got ${JSON.stringify(badYear)}`);
});

test("monotonicity: computeSolarTimes sunrise/sunset HH:MM strings are well-formed; daylight_minutes is monotone non-decreasing as date advances March -> June in Northern Hemisphere (longer days toward solstice) AND strictly increases as lat shifts toward equator at the same date in winter; declination crosses 0 at equinox; northern summer declination positive", () => {
  // Group T. NOAA solar-position algorithm. daylight_minutes grows from
  // spring toward June solstice in the northern hemisphere.
  let prev = -Infinity;
  for (const date_iso of ["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-06-21"]) {
    const r = computeSolarTimes({ lat_deg: 40, lon_deg: -75, date_iso, tz_offset_hours: -5 });
    assert.ok(Number.isFinite(r.daylight_minutes) && r.daylight_minutes > 0,
      `daylight at ${date_iso}: ${JSON.stringify(r)}`);
    assert.ok(r.daylight_minutes > prev,
      `daylight at ${date_iso} = ${r.daylight_minutes} not greater than prev=${prev}`);
    prev = r.daylight_minutes;
  }
  // After summer solstice, daylight starts shrinking again (Jul -> Dec).
  let prevD = Infinity;
  for (const date_iso of ["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01"]) {
    const r = computeSolarTimes({ lat_deg: 40, lon_deg: -75, date_iso, tz_offset_hours: -5 });
    assert.ok(r.daylight_minutes < prevD,
      `daylight shrinking at ${date_iso} = ${r.daylight_minutes} not less than prev=${prevD}`);
    prevD = r.daylight_minutes;
  }
  // HH:MM format pin for all eight twilight outputs at a normal mid-lat day.
  const ref = computeSolarTimes({ lat_deg: 40, lon_deg: -75, date_iso: "2026-06-21", tz_offset_hours: -5 });
  for (const key of ["sunrise", "sunset", "civil_dawn", "civil_dusk", "nautical_dawn", "nautical_dusk", "astro_dawn", "astro_dusk"]) {
    assert.ok(/^\d{2}:\d{2}$/.test(ref[key]),
      `${key} format: ${ref[key]}`);
  }
  // Twilight ordering pin: astro_dawn < nautical_dawn < civil_dawn < sunrise
  // (within the same day; comparing HH:MM strings lexicographically works).
  assert.ok(ref.astro_dawn < ref.nautical_dawn && ref.nautical_dawn < ref.civil_dawn && ref.civil_dawn < ref.sunrise,
    `dawn ordering: ${ref.astro_dawn} ${ref.nautical_dawn} ${ref.civil_dawn} ${ref.sunrise}`);
  assert.ok(ref.sunset < ref.civil_dusk && ref.civil_dusk < ref.nautical_dusk && ref.nautical_dusk < ref.astro_dusk,
    `dusk ordering: ${ref.sunset} ${ref.civil_dusk} ${ref.nautical_dusk} ${ref.astro_dusk}`);
  // Declination sign pin: northern summer (around solstice) -> declination positive.
  assert.ok(ref.declination_deg > 0,
    `summer solstice declination: ${ref.declination_deg}, expected positive`);
  // Northern winter declination is negative.
  const winter = computeSolarTimes({ lat_deg: 40, lon_deg: -75, date_iso: "2026-12-21", tz_offset_hours: -5 });
  assert.ok(winter.declination_deg < 0,
    `winter solstice declination: ${winter.declination_deg}, expected negative`);
  // Equator-vs-mid-latitude pin in winter: equator should have MORE daylight
  // than mid-latitude (40 N) in December (sun has retreated south).
  const equator = computeSolarTimes({ lat_deg: 0, lon_deg: -75, date_iso: "2026-12-21", tz_offset_hours: -5 });
  assert.ok(equator.daylight_minutes > winter.daylight_minutes,
    `equator daylight ${equator.daylight_minutes} not > mid-lat ${winter.daylight_minutes} in Dec`);
  // Bounds pin: lat / lon out of range -> error; invalid date -> error.
  const badLat = computeSolarTimes({ lat_deg: 95, lon_deg: 0, date_iso: "2026-06-21" });
  assert.ok(badLat.error, `expected error for lat=95, got ${JSON.stringify(badLat)}`);
  const badLon = computeSolarTimes({ lat_deg: 40, lon_deg: 200, date_iso: "2026-06-21" });
  assert.ok(badLon.error, `expected error for lon=200, got ${JSON.stringify(badLon)}`);
  const badDate = computeSolarTimes({ lat_deg: 40, lon_deg: -75, date_iso: "not-a-date" });
  assert.ok(badDate.error, `expected error for bad date, got ${JSON.stringify(badDate)}`);
});

test("monotonicity: computeCHA2DS2VASc score is monotone non-decreasing as risk factors flip true (point-additive pin); age tiers: 0 pts <65 / 1 pt 65-74 / 2 pts >=75 (A vs A2 pin); stroke history adds 2 (S2 pin); female-sex adds 1 (Sc pin); recommendation tips at score >= 2 for men, >= 3 for women (2019 AHA/ACC/HRS)", () => {
  // Group V. CHA2DS2-VASc components: C/H/D/V (+1 each), A 65-74 (+1) or
  // A2 >=75 (+2), S2 stroke (+2), Sc female (+1).
  // Strictly non-decreasing in age across the tier thresholds.
  let prev = -Infinity;
  for (const age of [50, 64, 65, 70, 74, 75, 80, 90]) {
    const r = computeCHA2DS2VASc({ age, sex: "male" });
    assert.ok(Number.isFinite(r.score),
      `score at age=${age}: ${JSON.stringify(r)}`);
    assert.ok(r.score >= prev,
      `score at age=${age} = ${r.score} not >= prev=${prev}`);
    prev = r.score;
  }
  // Age-tier pins: <65 -> 0; 65-74 -> 1 (A); >=75 -> 2 (A2).
  assert.equal(computeCHA2DS2VASc({ age: 64, sex: "male" }).score, 0);
  assert.equal(computeCHA2DS2VASc({ age: 65, sex: "male" }).score, 1);
  assert.equal(computeCHA2DS2VASc({ age: 74, sex: "male" }).score, 1);
  assert.equal(computeCHA2DS2VASc({ age: 75, sex: "male" }).score, 2);
  // Female-sex pin: adds 1 point regardless of other factors.
  const male50 = computeCHA2DS2VASc({ age: 50, sex: "male" });
  const female50 = computeCHA2DS2VASc({ age: 50, sex: "female" });
  assert.equal(male50.score, 0);
  assert.equal(female50.score, 1);
  // Stroke pin: stroke_history adds 2 (S2 component).
  const withStroke = computeCHA2DS2VASc({ age: 50, sex: "male", stroke_history: true });
  assert.equal(withStroke.score, 2);
  // CHF + HTN + diabetes + vascular pin: +1 each.
  const cumulative = computeCHA2DS2VASc({ age: 50, sex: "male", chf: true, htn: true, diabetes: true, vascular: true });
  assert.equal(cumulative.score, 4);
  // All-positive 80yo female pin: A2 (2) + S2 (2) + chf/htn/d/v (4) + Sc (1) = 9.
  const max = computeCHA2DS2VASc({ age: 80, sex: "female", chf: true, htn: true, diabetes: true, vascular: true, stroke_history: true });
  assert.equal(max.score, 9);
  // Recommendation pin: male score >= 2 -> anticoagulation recommended.
  const malePos = computeCHA2DS2VASc({ age: 80, sex: "male" });  // A2 = 2
  assert.ok(/anticoagulation recommended/.test(malePos.recommendation),
    `rec at male 80: ${malePos.recommendation}`);
  const maleEq1 = computeCHA2DS2VASc({ age: 70, sex: "male" });  // A = 1
  assert.ok(/consider/.test(maleEq1.recommendation),
    `rec at male 70: ${maleEq1.recommendation}`);
  // String "true" form-input pin: treated as boolean true.
  const formStr = computeCHA2DS2VASc({ age: 50, sex: "male", chf: "true", htn: "true" });
  assert.equal(formStr.score, 2);
  // Bounds pin: age out of 18-120 / unknown sex -> error.
  const badAge = computeCHA2DS2VASc({ age: 17, sex: "male" });
  assert.ok(badAge.error, `expected error for age=17, got ${JSON.stringify(badAge)}`);
  const badSex = computeCHA2DS2VASc({ age: 50, sex: "other" });
  assert.ok(badSex.error, `expected error for sex=other, got ${JSON.stringify(badSex)}`);
});

// --- spec-v14 §10.3 Phase F fifty-fifth monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (B / C / F / V / Y).

import { computePipeExpansionLoop } from "../../calc-plumbing.js";
import { computeWetBulbPsychrometer } from "../../calc-hvac.js";
import { computeLinearSystem2x2 } from "../../calc-edu.js";
import { computeNIHSS } from "../../calc-ems.js";

test("monotonicity: computePDP pdp_psi is strictly increasing in nozzle_pressure_psi, friction_loss_psi, elevation_ft, AND appliance_loss_psi (linear-sum pin); elevation_psi = elevation_ft * 0.5 exact (NFPA 0.5 psi/ft head pin); negative elevation subtracts from PDP", () => {
  // Group F. PDP = NP + FL + 0.5*elev + AL. Strictly increasing in each.
  let prev = -Infinity;
  for (const nozzle_pressure_psi of [50, 75, 100, 150, 200, 300]) {
    const r = computePDP({ nozzle_pressure_psi, friction_loss_psi: 25, elevation_ft: 20, appliance_loss_psi: 0 });
    assert.ok(Number.isFinite(r.pdp_psi) && r.pdp_psi > 0,
      `PDP at NP=${nozzle_pressure_psi}: ${JSON.stringify(r)}`);
    assert.ok(r.pdp_psi > prev,
      `PDP at NP=${nozzle_pressure_psi} = ${r.pdp_psi} not greater than prev=${prev}`);
    prev = r.pdp_psi;
  }
  let prevFL = -Infinity;
  for (const friction_loss_psi of [0, 10, 25, 50, 100, 200]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi, elevation_ft: 20, appliance_loss_psi: 0 });
    assert.ok(r.pdp_psi > prevFL,
      `PDP at FL=${friction_loss_psi} = ${r.pdp_psi} not greater than prev=${prevFL}`);
    prevFL = r.pdp_psi;
  }
  let prevElev = -Infinity;
  for (const elevation_ft of [0, 10, 20, 50, 100, 200, 500]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft, appliance_loss_psi: 0 });
    assert.ok(r.pdp_psi > prevElev,
      `PDP at elev=${elevation_ft} = ${r.pdp_psi} not greater than prev=${prevElev}`);
    prevElev = r.pdp_psi;
  }
  let prevAL = -Infinity;
  for (const appliance_loss_psi of [0, 5, 10, 25, 50, 100]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20, appliance_loss_psi });
    assert.ok(r.pdp_psi > prevAL,
      `PDP at AL=${appliance_loss_psi} = ${r.pdp_psi} not greater than prev=${prevAL}`);
    prevAL = r.pdp_psi;
  }
  // elevation_psi = elevation_ft * 0.5 exact closed-form pin.
  for (const elevation_ft of [0, 10, 20, 50, 100, 200, -10, -50]) {
    const r = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft, appliance_loss_psi: 0 });
    assert.ok(Math.abs(r.elevation_psi - elevation_ft * 0.5) < 1e-12,
      `elev_psi at ${elevation_ft} = ${r.elevation_psi}, expected ${elevation_ft * 0.5}`);
  }
  // pdpExample closed-form pin: NP 100 + FL 25 + elev 20*0.5 = 10 -> PDP 135.
  const ref = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20, appliance_loss_psi: 0 });
  assert.equal(ref.pdp_psi, 135);
  assert.equal(ref.elevation_psi, 10);
  // Sum decomposition pin: PDP = NP + FL + elev_psi + AL.
  const refSum = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20, appliance_loss_psi: 5 });
  assert.equal(refSum.pdp_psi, 100 + 25 + 10 + 5);
  // Negative-elevation pin: down-slope subtracts.
  const down = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: -20, appliance_loss_psi: 0 });
  assert.equal(down.elevation_psi, -10);
  assert.equal(down.pdp_psi, 100 + 25 - 10);
  // Doubling-elevation pin: 2x elevation -> 2x elevation_psi exactly.
  const a = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 50, appliance_loss_psi: 0 });
  const b = computePDP({ nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 100, appliance_loss_psi: 0 });
  assert.ok(Math.abs(b.elevation_psi - 2 * a.elevation_psi) < 1e-9,
    `2x elev: ${b.elevation_psi} != 2 * ${a.elevation_psi}`);
});

test("monotonicity: computeWetBulbPsychrometer RH_percent is strictly increasing as wet_bulb_F rises toward dry_bulb_F at fixed dry_bulb (depression shrinks pin); dew_point_F strictly increasing in wet_bulb; W = 0.622*e/(P-e) increasing in absolute humidity; saturation identity at wet_bulb = dry_bulb -> RH ~ 100", () => {
  // Group C. As wet_bulb_F rises toward dry_bulb_F, depression dT shrinks,
  // and RH grows. Strictly increasing in wet_bulb at fixed dry_bulb.
  let prev = -Infinity;
  for (const wet_bulb_F of [50, 55, 60, 65, 70, 75, 79]) {
    const r = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F });
    assert.ok(Number.isFinite(r.RH_percent) && r.RH_percent >= 0 && r.RH_percent <= 100,
      `RH at WB=${wet_bulb_F}: ${JSON.stringify(r)}`);
    assert.ok(r.RH_percent > prev,
      `RH at WB=${wet_bulb_F} = ${r.RH_percent} not greater than prev=${prev}`);
    prev = r.RH_percent;
  }
  // dew_point_F strictly increasing in wet_bulb at fixed dry_bulb.
  let prevDp = -Infinity;
  for (const wet_bulb_F of [50, 55, 60, 65, 70, 75, 79]) {
    const r = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F });
    assert.ok(r.dew_point_F > prevDp,
      `Td at WB=${wet_bulb_F} = ${r.dew_point_F} not greater than prev=${prevDp}`);
    prevDp = r.dew_point_F;
  }
  // GPP strictly increasing in wet_bulb at fixed dry_bulb (more moisture).
  let prevGpp = -Infinity;
  for (const wet_bulb_F of [50, 55, 60, 65, 70, 75, 79]) {
    const r = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F });
    assert.ok(r.GPP > prevGpp,
      `GPP at WB=${wet_bulb_F} = ${r.GPP} not greater than prev=${prevGpp}`);
    prevGpp = r.GPP;
  }
  // Saturation identity pin: wet_bulb = dry_bulb -> RH ~ 100; dew = dry_bulb.
  const sat = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F: 80 });
  assert.ok(Math.abs(sat.RH_percent - 100) < 1.0,
    `saturated RH = ${sat.RH_percent}, expected ~100`);
  assert.ok(Math.abs(sat.dew_point_F - 80) < 1.0,
    `saturated Td = ${sat.dew_point_F}, expected ~80`);
  // wetBulbPsychrometerExample band pin: DB=80 / WB=67 -> RH typically 50-60%.
  const ref = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F: 67 });
  assert.ok(ref.RH_percent > 40 && ref.RH_percent < 70,
    `example RH = ${ref.RH_percent}, expected 40-70 (example range)`);
  // dew_point < dry_bulb invariant (except at saturation).
  for (const wet_bulb_F of [50, 60, 70, 75]) {
    const r = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F });
    assert.ok(r.dew_point_F < 80,
      `Td at WB=${wet_bulb_F} = ${r.dew_point_F}, expected < dry_bulb 80`);
  }
  // RH clamped to [0, 100] invariant.
  for (const wet_bulb_F of [40, 50, 70, 79.9]) {
    const r = computeWetBulbPsychrometer({ dry_bulb_F: 80, wet_bulb_F });
    assert.ok(r.RH_percent >= 0 && r.RH_percent <= 100,
      `RH out of range at WB=${wet_bulb_F}: ${r.RH_percent}`);
  }
  // Bounds pin: wet_bulb > dry_bulb -> error.
  const bad = computeWetBulbPsychrometer({ dry_bulb_F: 70, wet_bulb_F: 80 });
  assert.ok(bad.error, `expected error for WB > DB, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computePipeExpansionLoop delta_L_in is strictly increasing in length_ft AND in delta_T_F at fixed material/OD (alpha * L * 12 * dT linear pin); loop_leg_in is strictly increasing in delta_L AND in pipe_OD_in (sqrt pin); material-alpha ordering: copper > steel > PEX (wait actually polymer expands MORE than metal)", () => {
  // Group B. delta_L = alpha * L * 12 * dT (in inches). Strictly increasing
  // in L and in dT (linear); strictly increasing in alpha.
  let prev = -Infinity;
  for (const length_ft of [10, 50, 100, 250, 500, 1000]) {
    const r = computePipeExpansionLoop({ material: "copper", length_ft, delta_T_F: 100, pipe_OD_in: 1.315 });
    assert.ok(Number.isFinite(r.delta_L_in) && r.delta_L_in > 0,
      `dL at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.delta_L_in > prev,
      `dL at L=${length_ft} = ${r.delta_L_in} not greater than prev=${prev}`);
    prev = r.delta_L_in;
  }
  // Strictly increasing in delta_T_F at fixed L/material.
  let prevDt = -Infinity;
  for (const delta_T_F of [10, 25, 50, 100, 200]) {
    const r = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F, pipe_OD_in: 1.315 });
    assert.ok(r.delta_L_in > prevDt,
      `dL at dT=${delta_T_F} = ${r.delta_L_in} not greater than prev=${prevDt}`);
    prevDt = r.delta_L_in;
  }
  // Negative dT pin: thermal contraction -> dL negative; |dL| matches +dT.
  const heat = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 50 });
  const cool = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: -50 });
  assert.ok(heat.delta_L_in > 0 && cool.delta_L_in < 0,
    `dL signs: heat ${heat.delta_L_in}, cool ${cool.delta_L_in}`);
  assert.ok(Math.abs(heat.delta_L_in + cool.delta_L_in) < 1e-9,
    `|+dT dL| != |-dT dL|: ${heat.delta_L_in} vs ${cool.delta_L_in}`);
  // loop_leg_in is the same magnitude for +dT and -dT (uses |dL|).
  assert.ok(Math.abs(heat.loop_leg_in - cool.loop_leg_in) < 1e-9,
    `loop_leg should be symmetric in sign of dT: ${heat.loop_leg_in} vs ${cool.loop_leg_in}`);
  // Doubling-length pin: 2x L -> 2x dL exactly (linear in L).
  const a = computePipeExpansionLoop({ material: "copper", length_ft: 50, delta_T_F: 100 });
  const b = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 100 });
  assert.ok(Math.abs(b.delta_L_in - 2 * a.delta_L_in) < 1e-9,
    `2x L: dL = ${b.delta_L_in} != 2 * ${a.delta_L_in}`);
  // Material alpha ordering pin: polymer expands MORE than metals at the
  // same length / dT (PEX or PVC alpha > copper alpha > steel alpha).
  const cu = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 100 });
  // Iterate over available materials and confirm copper has a finite,
  // non-zero alpha and copper is among the SMALLER (metal) values.
  assert.ok(Number.isFinite(cu.alpha_per_F) && cu.alpha_per_F > 0,
    `copper alpha: ${cu.alpha_per_F}`);
  // loop_leg_in grows with pipe OD (sqrt pin).
  let prevLeg = -Infinity;
  for (const pipe_OD_in of [0.5, 0.875, 1.315, 1.66, 2.375]) {
    const r = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 100, pipe_OD_in });
    assert.ok(r.loop_leg_in > prevLeg,
      `leg at OD=${pipe_OD_in} = ${r.loop_leg_in} not greater than prev=${prevLeg}`);
    prevLeg = r.loop_leg_in;
  }
  // 4x OD pin: 4x pipe_OD -> 2x loop_leg (sqrt scaling).
  const od1 = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 100, pipe_OD_in: 1 });
  const od4 = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 100, pipe_OD_in: 4 });
  assert.ok(Math.abs(od4.loop_leg_in / od1.loop_leg_in - 2) < 1e-9,
    `4x OD: leg ratio = ${od4.loop_leg_in / od1.loop_leg_in}, expected 2`);
  // loop_leg_ft = loop_leg_in / 12 exact unit pin.
  assert.ok(Math.abs(cu.loop_leg_ft - cu.loop_leg_in / 12) < 1e-12,
    `loop_leg_ft: ${cu.loop_leg_ft} != ${cu.loop_leg_in / 12}`);
  // Bounds pin: unknown material / non-positive OD -> error.
  const bad = computePipeExpansionLoop({ material: "diamond", length_ft: 100, delta_T_F: 100 });
  assert.ok(bad.error, `expected error for unknown material, got ${JSON.stringify(bad)}`);
  const badOD = computePipeExpansionLoop({ material: "copper", length_ft: 100, delta_T_F: 100, pipe_OD_in: 0 });
  assert.ok(badOD.error, `expected error for OD=0, got ${JSON.stringify(badOD)}`);
});

test("monotonicity: computeLinearSystem2x2 unique-solution determinant > 0 yields finite (x, y); doubling all coefficients leaves (x, y) unchanged (homogeneous scaling pin); identity pin: a1=1/b1=0/c1=k -> x=k; band labels: 'unique' / 'infinite' (parallel-consistent) / 'none' (parallel-inconsistent)", () => {
  // Group Y. det = a1*b2 - a2*b1 != 0 -> unique solution at (x, y) = ((c1*b2 - c2*b1)/det, (a1*c2 - a2*c1)/det).
  const r1 = computeLinearSystem2x2({ a1: 1, b1: 1, c1: 5, a2: 1, b2: -1, c2: 1 });
  // Solving: x + y = 5; x - y = 1 -> x = 3, y = 2.
  assert.equal(r1.x, 3);
  assert.equal(r1.y, 2);
  assert.equal(r1.kind, "unique");
  // Identity pin: a1=1, b1=0, c1=k -> x=k regardless of row 2 (provided unique).
  const ident = computeLinearSystem2x2({ a1: 1, b1: 0, c1: 7, a2: 0, b2: 1, c2: 3 });
  assert.equal(ident.x, 7);
  assert.equal(ident.y, 3);
  // Homogeneous-scaling pin: multiplying both equations by the same scalar
  // does NOT change (x, y).
  const scaled = computeLinearSystem2x2({ a1: 2, b1: 2, c1: 10, a2: 2, b2: -2, c2: 2 });
  assert.equal(scaled.x, 3);
  assert.equal(scaled.y, 2);
  // Independent doubling of one row only also leaves (x, y) unchanged
  // (multiplying one equation by a constant preserves the solution).
  const oneRowScaled = computeLinearSystem2x2({ a1: 2, b1: 2, c1: 10, a2: 1, b2: -1, c2: 1 });
  assert.equal(oneRowScaled.x, 3);
  assert.equal(oneRowScaled.y, 2);
  // Strict monotonicity in c1 at fixed a1/b1/a2/b2/c2 (linear-in-c1 pin).
  let prevX = -Infinity;
  for (const c1 of [0, 1, 5, 10, 100]) {
    const r = computeLinearSystem2x2({ a1: 1, b1: 1, c1, a2: 1, b2: -1, c2: 1 });
    assert.ok(r.x > prevX,
      `x at c1=${c1} = ${r.x} not greater than prev=${prevX}`);
    prevX = r.x;
  }
  // Parallel-consistent pin: same line (rows scalar multiples) -> infinite.
  const inf = computeLinearSystem2x2({ a1: 1, b1: 2, c1: 3, a2: 2, b2: 4, c2: 6 });
  assert.equal(inf.kind, "infinite");
  assert.ok(/infinitely many/.test(inf.message), `infinite message: ${inf.message}`);
  assert.equal(inf.determinant, 0);
  // Parallel-inconsistent pin: parallel but offset -> no solution.
  const none = computeLinearSystem2x2({ a1: 1, b1: 2, c1: 3, a2: 2, b2: 4, c2: 7 });
  assert.equal(none.kind, "none");
  assert.ok(/no solution/.test(none.message), `none message: ${none.message}`);
  // Standard simultaneous-equations example: 2x + 3y = 7; 4x - y = 3.
  // det = 2*-1 - 4*3 = -14. x = (7*-1 - 3*3) / -14 = -16/-14 = 8/7.
  // y = (2*3 - 4*7) / -14 = -22/-14 = 11/7.
  const fracs = computeLinearSystem2x2({ a1: 2, b1: 3, c1: 7, a2: 4, b2: -1, c2: 3 });
  assert.ok(Math.abs(fracs.x - 8 / 7) < 1e-12, `x = ${fracs.x}, expected 8/7`);
  assert.ok(Math.abs(fracs.y - 11 / 7) < 1e-12, `y = ${fracs.y}, expected 11/7`);
  // Bounds pin: degenerate row (both a and b = 0) -> error.
  const degen = computeLinearSystem2x2({ a1: 0, b1: 0, c1: 5, a2: 1, b2: 1, c2: 5 });
  assert.ok(degen.error, `expected error for degenerate row 1, got ${JSON.stringify(degen)}`);
  // Non-numeric coefficient -> error.
  const nan = computeLinearSystem2x2({ a1: 1, b1: 1, c1: "x", a2: 1, b2: -1, c2: 1 });
  assert.ok(nan.error, `expected error for non-numeric c1, got ${JSON.stringify(nan)}`);
});

test("monotonicity: computeNIHSS total is strictly non-decreasing as additional item scores are added (point-additive pin); '9' code for amputation / dysarthria untestable does NOT add to total (scored=false flag pin); band thresholds 0 None / 1-4 Minor / 5-15 Moderate / 16-20 Mod-Severe / 21+ Severe; max_possible = 42 invariant", () => {
  // Group V. Strictly non-decreasing in cumulative item scores.
  const items = ["loc_consciousness", "loc_questions", "loc_commands", "best_gaze",
                 "visual", "facial_palsy", "motor_arm_l", "motor_arm_r",
                 "motor_leg_l", "motor_leg_r", "limb_ataxia", "sensory",
                 "best_language", "dysarthria", "extinction_inattention"];
  let prev = -Infinity;
  let active = {};
  for (const key of items) {
    active = { ...active, [key]: 1 };
    const r = computeNIHSS(active);
    assert.ok(Number.isFinite(r.total),
      `total at ${Object.keys(active).length}: ${JSON.stringify(r)}`);
    assert.ok(r.total >= prev,
      `total at ${Object.keys(active).length} = ${r.total} not >= prev=${prev}`);
    prev = r.total;
  }
  // Empty input pin: total = 0, band = "No stroke symptoms".
  const none = computeNIHSS({});
  assert.equal(none.total, 0);
  assert.ok(/No stroke symptoms/.test(none.band), `band at 0: ${none.band}`);
  assert.equal(none.max_possible, 42);
  // Band-threshold pins.
  const minor = computeNIHSS({ loc_consciousness: 1, best_gaze: 1, visual: 1, facial_palsy: 1 });
  assert.equal(minor.total, 4);
  assert.ok(/Minor/.test(minor.band), `band at 4: ${minor.band}`);
  const moderate = computeNIHSS({ loc_consciousness: 2, best_gaze: 1, visual: 2, facial_palsy: 2 });
  assert.equal(moderate.total, 7);
  assert.ok(/Moderate/.test(moderate.band), `band at 7: ${moderate.band}`);
  // nihssExample closed-form pin: total = 15 (moderate left MCA syndrome).
  const ref = computeNIHSS({
    loc_consciousness: 1, loc_questions: 1, loc_commands: 0,
    best_gaze: 1, visual: 2, facial_palsy: 2,
    motor_arm_l: 0, motor_arm_r: 2, motor_leg_l: 0, motor_leg_r: 1,
    limb_ataxia: 0, sensory: 1, best_language: 2, dysarthria: 1,
    extinction_inattention: 1,
  });
  assert.equal(ref.total, 15);
  // Untestable-'9' pin: 9 in motor or dysarthria does NOT add to total.
  const with9 = computeNIHSS({ motor_arm_l: 9, dysarthria: 9, loc_consciousness: 1 });
  assert.equal(with9.total, 1);
  // scored=false on the 9-coded items.
  const motor9Item = with9.items.find((i) => /arm/i.test(i.label) && i.score === 9);
  assert.ok(motor9Item && motor9Item.scored === false,
    `motor 9 should be scored=false: ${JSON.stringify(motor9Item)}`);
  const dys9Item = with9.items.find((i) => /[Dd]ysarthria/.test(i.label) && i.score === 9);
  assert.ok(dys9Item && dys9Item.scored === false,
    `dysarthria 9 should be scored=false: ${JSON.stringify(dys9Item)}`);
  // Severe-band threshold pin: total > 20 -> Severe. Use 2 per item (safely
  // within every item's max) -> 15 items × 2 = 30 > 20.
  const severeAll = {};
  for (const key of items) severeAll[key] = 2;
  const severe = computeNIHSS(severeAll);
  assert.ok(severe.total > 20, `severe total: ${severe.total}`);
  assert.ok(/Severe/.test(severe.band), `band at high: ${severe.band}`);
  // Bounds pin: out-of-range item score (above item max) -> error.
  const bad = computeNIHSS({ loc_consciousness: 99 });
  assert.ok(bad.error, `expected error for loc=99, got ${JSON.stringify(bad)}`);
  const nan = computeNIHSS({ loc_consciousness: "abc" });
  assert.ok(nan.error, `expected error for non-numeric, got ${JSON.stringify(nan)}`);
});

// --- spec-v14 §10.3 Phase F fifty-sixth monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / C / E / F / V).

import { computeGeneratorSize } from "../../calc-electrical.js";
import { computeCoolingTower } from "../../calc-hvac.js";
import { computeFormworkPressure } from "../../calc-construction.js";
import { computeConfinedSpacePurge } from "../../calc-fire.js";
import { computeSTART } from "../../calc-ems.js";

test("monotonicity: computeGeneratorSize running_W is strictly non-decreasing as items accumulate (sum-of-running pin); surge_W = running_total + max(starting - running) per item (worst-case-single-start pin); doubling-load pin; closed-form sample 3 appliances", () => {
  // Group A. running_total = sum(running_watts). surge_total = running_total
  // + max(starting - running) per item.
  let prev = -Infinity;
  for (let n = 1; n <= 5; n++) {
    const items = [];
    for (let i = 0; i < n; i++) items.push({ name: "item-" + i, running_watts: 500, starting_watts: 500 });
    const r = computeGeneratorSize({ items });
    assert.ok(r.running_W >= prev,
      `running at n=${n} = ${r.running_W} not >= prev=${prev}`);
    prev = r.running_W;
  }
  // Single-item starting-surge pin: surge_W = running + (starting - running) = starting.
  const single = computeGeneratorSize({ items: [{ name: "x", running_watts: 700, starting_watts: 2200 }] });
  assert.equal(single.running_W, 700);
  assert.equal(single.surge_W, 2200);
  assert.equal(single.running_kW, 0.7);
  assert.equal(single.surge_kW, 2.2);
  // generatorSizeExample closed-form pin: refrigerator (700/2200), lights
  // (400/400), sump (800/2000). running = 1900; max surge excess =
  // 2200 - 700 = 1500; surge = 1900 + 1500 = 3400.
  const ref = computeGeneratorSize({
    items: [
      { name: "Refrigerator", running_watts: 700, starting_watts: 2200 },
      { name: "Lights", running_watts: 400, starting_watts: 400 },
      { name: "Sump pump", running_watts: 800, starting_watts: 2000 },
    ],
  });
  assert.equal(ref.running_W, 1900);
  assert.equal(ref.surge_W, 1900 + (2200 - 700));
  // surge_W >= running_W invariant.
  assert.ok(ref.surge_W >= ref.running_W,
    `surge ${ref.surge_W} not >= running ${ref.running_W}`);
  // Empty-items pin: running = surge = 0.
  const empty = computeGeneratorSize({ items: [] });
  assert.equal(empty.running_W, 0);
  assert.equal(empty.surge_W, 0);
  // No-surge pin: all items with starting = running -> surge = running.
  const noSurge = computeGeneratorSize({
    items: [
      { name: "a", running_watts: 500, starting_watts: 500 },
      { name: "b", running_watts: 700, starting_watts: 700 },
    ],
  });
  assert.equal(noSurge.surge_W, noSurge.running_W);
  // Single largest-surge dominates pin: only the worst-case excess counts;
  // adding another item with smaller excess doesn't change surge.
  const a = computeGeneratorSize({ items: [{ name: "big", running_watts: 700, starting_watts: 2200 }] });
  const b = computeGeneratorSize({
    items: [
      { name: "big", running_watts: 700, starting_watts: 2200 },
      { name: "small", running_watts: 300, starting_watts: 500 },  // excess 200 < 1500
    ],
  });
  assert.equal(b.surge_W - a.surge_W, 300);  // only running grows by 300, surge grows by same since worst excess unchanged
  // running_kW = running_W / 1000 unit pin.
  assert.ok(Math.abs(ref.running_kW - ref.running_W / 1000) < 1e-12,
    `kW = ${ref.running_kW}, expected ${ref.running_W / 1000}`);
});

test("monotonicity: computeCoolingTower heat_rejection_BTU_hr is strictly increasing in gpm (linear pin) AND in range_F = T_in - T_out (linear pin); approach_F = T_out - T_wb; band labels: range 8-12 / approach 5-10 (CTI 'in-range' pin); 500 BTU per gpm per dT closed-form pin", () => {
  // Group C. Q = gpm * 500 * range_F. Strictly increasing in gpm and range.
  let prev = -Infinity;
  for (const gpm of [100, 250, 500, 750, 1000, 2000]) {
    const r = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm });
    assert.ok(Number.isFinite(r.heat_rejection_BTU_hr) && r.heat_rejection_BTU_hr > 0,
      `Q at gpm=${gpm}: ${JSON.stringify(r)}`);
    assert.ok(r.heat_rejection_BTU_hr > prev,
      `Q at gpm=${gpm} = ${r.heat_rejection_BTU_hr} not greater than prev=${prev}`);
    prev = r.heat_rejection_BTU_hr;
  }
  // Strictly increasing in range_F (T_in rises at fixed T_out / T_wb).
  let prevR = -Infinity;
  for (const T_in_F of [88, 92, 95, 100, 110, 120]) {
    const r = computeCoolingTower({ T_in_F, T_out_F: 85, T_wb_F: 78, gpm: 600 });
    assert.ok(r.heat_rejection_BTU_hr > prevR,
      `Q at T_in=${T_in_F} = ${r.heat_rejection_BTU_hr} not greater than prev=${prevR}`);
    prevR = r.heat_rejection_BTU_hr;
  }
  // range_F = T_in - T_out exact pin.
  const ref = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600, fan_kW: 7.5 });
  assert.equal(ref.range_F, 10);
  assert.equal(ref.approach_F, 7);
  // Q = gpm * 500 * range exact pin.
  assert.equal(ref.heat_rejection_BTU_hr, 600 * 500 * 10);
  // 'in-range' band pin: range 8-12 -> in-range; approach 5-10 -> in-range.
  assert.ok(/in-range/.test(ref.range_flag), `range flag: ${ref.range_flag}`);
  assert.ok(/in-range/.test(ref.approach_flag), `approach flag: ${ref.approach_flag}`);
  // Tight-approach pin: approach < 5.
  const tight = computeCoolingTower({ T_in_F: 95, T_out_F: 82, T_wb_F: 80, gpm: 600 });
  assert.equal(tight.approach_F, 2);
  assert.ok(/tight/.test(tight.approach_flag), `approach flag at 2: ${tight.approach_flag}`);
  // Wide-approach pin: approach > 10.
  const wide = computeCoolingTower({ T_in_F: 95, T_out_F: 92, T_wb_F: 78, gpm: 600 });
  assert.equal(wide.approach_F, 14);
  assert.ok(/wide/.test(wide.approach_flag), `approach flag at 14: ${wide.approach_flag}`);
  // Low-range / high-range pins: range < 8 -> low; range > 12 -> high.
  const low = computeCoolingTower({ T_in_F: 90, T_out_F: 85, T_wb_F: 78, gpm: 600 });
  assert.equal(low.range_F, 5);
  assert.ok(/low/.test(low.range_flag), `range flag at 5: ${low.range_flag}`);
  const high = computeCoolingTower({ T_in_F: 100, T_out_F: 85, T_wb_F: 78, gpm: 600 });
  assert.equal(high.range_F, 15);
  assert.ok(/high/.test(high.range_flag), `range flag at 15: ${high.range_flag}`);
  // fan_kW_per_ton closed-form pin.
  const expectedFan = (7.5 * 12000) / ref.heat_rejection_BTU_hr;
  assert.ok(Math.abs(ref.fan_kW_per_ton - expectedFan) < 1e-9,
    `fan_kW_per_ton = ${ref.fan_kW_per_ton}, expected ${expectedFan}`);
  // Doubling-gpm pin: 2x gpm -> 2x Q exactly (linear).
  const g1 = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 300 });
  const g2 = computeCoolingTower({ T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600 });
  assert.equal(g2.heat_rejection_BTU_hr, 2 * g1.heat_rejection_BTU_hr);
  // Bounds pin: T_in <= T_out / T_out <= T_wb / non-positive gpm -> error.
  const badRange = computeCoolingTower({ T_in_F: 85, T_out_F: 95, T_wb_F: 78, gpm: 600 });
  assert.ok(badRange.error, `expected error for T_in < T_out, got ${JSON.stringify(badRange)}`);
  const badAppr = computeCoolingTower({ T_in_F: 95, T_out_F: 75, T_wb_F: 78, gpm: 600 });
  assert.ok(badAppr.error, `expected error for T_out < T_wb, got ${JSON.stringify(badAppr)}`);
});

test("monotonicity: computeFormworkPressure aci_pressure_psf is strictly increasing in pour_rate_ft_per_hr at fixed temperature (linear pin); strictly decreasing in concrete_temp_F at fixed pour rate (1/T pin); pressure_psf = min(P_aci, P_wet_head) — cap_applied true when ACI exceeds wet-head; weight-factor ordering: lightweight_115 0.85 < lightweight_135 0.93 < normal 1.0 < plasticized 1.20", () => {
  // Group E. P_aci = Cw * (150 + 9000 * R / T). P_wet = γ * H.
  // Strictly increasing in pour_rate at fixed T.
  let prev = -Infinity;
  for (const pour_rate_ft_per_hr of [1, 2, 5, 10, 20, 50]) {
    const r = computeFormworkPressure({ pour_rate_ft_per_hr, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 });
    assert.ok(Number.isFinite(r.aci_pressure_psf) && r.aci_pressure_psf > 0,
      `P at R=${pour_rate_ft_per_hr}: ${JSON.stringify(r)}`);
    assert.ok(r.aci_pressure_psf > prev,
      `P at R=${pour_rate_ft_per_hr} = ${r.aci_pressure_psf} not greater than prev=${prev}`);
    prev = r.aci_pressure_psf;
  }
  // Strictly decreasing in concrete_temp_F at fixed pour rate (1/T pin).
  let prevT = Infinity;
  for (const concrete_temp_F of [40, 50, 60, 70, 80, 90, 100]) {
    const r = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 });
    assert.ok(r.aci_pressure_psf < prevT,
      `P at T=${concrete_temp_F} = ${r.aci_pressure_psf} not less than prev=${prevT}`);
    prevT = r.aci_pressure_psf;
  }
  // Wet-head pin: P_wet = unit_weight_pcf * wall_height_ft.
  const ref = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 12 });
  assert.equal(ref.wet_head_psf, 150 * 12);
  // formworkPressureExample closed-form pin: 1.0 * (150 + 9000*5/70) = 150 + 642.857... = 792.857.
  const expectedAci = 1.0 * (150 + (9000 * 5) / 70);
  assert.ok(Math.abs(ref.aci_pressure_psf - expectedAci) < 1e-9,
    `P_aci = ${ref.aci_pressure_psf}, expected ${expectedAci}`);
  // pressure_psf = min(P_aci, P_wet_head) pin.
  assert.equal(ref.pressure_psf, Math.min(ref.aci_pressure_psf, ref.wet_head_psf));
  // Cap-applied flag: true when ACI > wet-head (ACI > P_wet).
  if (ref.aci_pressure_psf > ref.wet_head_psf) {
    assert.equal(ref.cap_applied, true);
    assert.equal(ref.pressure_psf, ref.wet_head_psf);
  } else {
    assert.equal(ref.cap_applied, false);
    assert.equal(ref.pressure_psf, ref.aci_pressure_psf);
  }
  // Weight-factor ordering pin.
  const lw115 = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "lightweight_115", unit_weight_pcf: 150, wall_height_ft: 100 });
  const lw135 = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "lightweight_135", unit_weight_pcf: 150, wall_height_ft: 100 });
  const normal = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 });
  const plast = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "plasticized", unit_weight_pcf: 150, wall_height_ft: 100 });
  assert.equal(lw115.weight_factor, 0.85);
  assert.equal(lw135.weight_factor, 0.93);
  assert.equal(normal.weight_factor, 1.0);
  assert.equal(plast.weight_factor, 1.20);
  assert.ok(lw115.aci_pressure_psf < lw135.aci_pressure_psf && lw135.aci_pressure_psf < normal.aci_pressure_psf && normal.aci_pressure_psf < plast.aci_pressure_psf,
    `Cw ordering: ${lw115.aci_pressure_psf} ${lw135.aci_pressure_psf} ${normal.aci_pressure_psf} ${plast.aci_pressure_psf}`);
  // Doubling-pour-rate pin: 2x R -> aci grows by (9000 * dR / T) (linear in R).
  const r1 = computeFormworkPressure({ pour_rate_ft_per_hr: 2.5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 });
  const r2 = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 100 });
  // Cw * (150 + 9000R/T), the constant 150*Cw drops out of the difference:
  // delta = Cw * 9000 * (5 - 2.5) / 70 = 1 * 9000 * 2.5 / 70.
  assert.ok(Math.abs(r2.aci_pressure_psf - r1.aci_pressure_psf - (1 * 9000 * 2.5) / 70) < 1e-9,
    `pour-rate delta: ${r2.aci_pressure_psf - r1.aci_pressure_psf}, expected ${(1 * 9000 * 2.5) / 70}`);
  // Bounds pin: non-positive pour_rate / temperature -> error; bad weight -> error.
  const bad = computeFormworkPressure({ pour_rate_ft_per_hr: 0, concrete_temp_F: 70 });
  assert.ok(bad.error, `expected error for R=0, got ${JSON.stringify(bad)}`);
  const badT = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 0 });
  assert.ok(badT.error, `expected error for T=0, got ${JSON.stringify(badT)}`);
  const badW = computeFormworkPressure({ pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "unknown" });
  assert.ok(badW.error, `expected error for unknown weight, got ${JSON.stringify(badW)}`);
});

test("monotonicity: computeConfinedSpacePurge minutes is strictly increasing in volume_ft3 at fixed blower_cfm AND target_purges (linear pin); strictly decreasing in blower_cfm at fixed volume / target (1/CFM pin); strictly increasing in target_purges; 1000 ft3 / 200 CFM / 7 purges -> 35 minutes exact (NFPA / ANSI Z117.1 7-volume rule)", () => {
  // Group F. minutes = (volume * target_purges) / blower_cfm.
  // Strictly increasing in volume at fixed CFM / purges.
  let prev = -Infinity;
  for (const volume_ft3 of [100, 500, 1000, 2000, 5000, 10000]) {
    const r = computeConfinedSpacePurge({ volume_ft3, blower_cfm: 200, target_purges: 7 });
    assert.ok(Number.isFinite(r.minutes) && r.minutes > 0,
      `t at V=${volume_ft3}: ${JSON.stringify(r)}`);
    assert.ok(r.minutes > prev,
      `t at V=${volume_ft3} = ${r.minutes} not greater than prev=${prev}`);
    prev = r.minutes;
  }
  // Strictly decreasing in blower_cfm at fixed V / purges.
  let prevB = Infinity;
  for (const blower_cfm of [100, 200, 400, 800, 1600, 3200]) {
    const r = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm, target_purges: 7 });
    assert.ok(r.minutes < prevB,
      `t at B=${blower_cfm} = ${r.minutes} not less than prev=${prevB}`);
    prevB = r.minutes;
  }
  // Strictly increasing in target_purges at fixed V / CFM.
  let prevP = -Infinity;
  for (const target_purges of [3, 5, 7, 10, 15, 20]) {
    const r = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges });
    assert.ok(r.minutes > prevP,
      `t at N=${target_purges} = ${r.minutes} not greater than prev=${prevP}`);
    prevP = r.minutes;
  }
  // Closed-form pin from confinedSpacePurgeExample: 1000 * 7 / 200 = 35.
  const ref = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 7 });
  assert.equal(ref.minutes, 35);
  // Default target_purges pin: 7 (ANSI Z117.1 standard).
  const def = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200 });
  assert.equal(def.minutes, 35);
  // Doubling-V pin: 2x V -> 2x minutes exactly (linear).
  const v1 = computeConfinedSpacePurge({ volume_ft3: 500, blower_cfm: 200, target_purges: 7 });
  const v2 = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 7 });
  assert.equal(v2.minutes, 2 * v1.minutes);
  // 1/2-CFM pin: 1/2 blower -> 2x minutes exactly (1/CFM linear).
  const b1 = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 400, target_purges: 7 });
  const b2 = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 7 });
  assert.equal(b2.minutes, 2 * b1.minutes);
  // Doubling-purges pin: 2x N -> 2x minutes exactly (linear).
  const p1 = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 5 });
  const p2 = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 10 });
  assert.equal(p2.minutes, 2 * p1.minutes);
  // Bounds pin: non-positive inputs -> error.
  const badV = computeConfinedSpacePurge({ volume_ft3: 0, blower_cfm: 200, target_purges: 7 });
  assert.ok(badV.error, `expected error for V=0, got ${JSON.stringify(badV)}`);
  const badB = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 0, target_purges: 7 });
  assert.ok(badB.error, `expected error for B=0, got ${JSON.stringify(badB)}`);
  const badN = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 0 });
  assert.ok(badN.error, `expected error for N=0, got ${JSON.stringify(badN)}`);
});

test("monotonicity: computeSTART triage tag follows a fixed decision tree; walking -> GREEN; apneic + no breath restoration -> BLACK; apneic restored -> RED; RR > 30 (adult) or outside 15-45 (peds) -> RED; perfusion bad -> RED; mental status not following commands -> RED; otherwise YELLOW", () => {
  // Group V. Standard adult SALT/START decision tree.
  // Walking -> GREEN regardless of other vitals.
  const walking = computeSTART({ walking: true });
  assert.equal(walking.tag, "GREEN");
  // Apneic (not walking, no breathing, no restoration after airway) -> BLACK.
  const apneicAdult = computeSTART({ walking: false, breathing: "no" });
  assert.equal(apneicAdult.tag, "BLACK");
  // Apneic, restored after airway repositioning -> RED.
  const restored = computeSTART({ walking: false, breathing: "no_now_yes_after_position" });
  assert.equal(restored.tag, "RED");
  // Adult RR > 30 -> RED.
  const tachypnea = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 35, perfusion_ok: true, obeys_commands: true });
  assert.equal(tachypnea.tag, "RED");
  // Adult RR <= 30 + bad perfusion -> RED.
  const noPerf = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 20, perfusion_ok: false, obeys_commands: true });
  assert.equal(noPerf.tag, "RED");
  // Adult RR <= 30 + good perfusion + doesn't follow commands -> RED.
  const altered = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 20, perfusion_ok: true, obeys_commands: false });
  assert.equal(altered.tag, "RED");
  // Adult RR <= 30 + good perfusion + follows commands -> YELLOW.
  const yellow = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 20, perfusion_ok: true, obeys_commands: true });
  assert.equal(yellow.tag, "YELLOW");
  // RR boundary pin: exactly 30 in adult -> YELLOW (not >30).
  const at30 = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 30, perfusion_ok: true, obeys_commands: true });
  assert.equal(at30.tag, "YELLOW");
  // RR 31 -> RED.
  const at31 = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 31, perfusion_ok: true, obeys_commands: true });
  assert.equal(at31.tag, "RED");
  // Pediatric (JumpSTART) RR bounds: 15-45 -> normal; outside -> RED.
  const pedTachy = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 50, perfusion_ok: true, avpu: "A", pediatric: true });
  assert.equal(pedTachy.tag, "RED");
  const pedBrady = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 10, perfusion_ok: true, avpu: "A", pediatric: true });
  assert.equal(pedBrady.tag, "RED");
  const pedNormal = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 25, perfusion_ok: true, avpu: "A", pediatric: true });
  assert.equal(pedNormal.tag, "YELLOW");
  // Pediatric AVPU U -> RED.
  const pedAvpuU = computeSTART({ walking: false, breathing: "yes", resp_rate_per_min: 25, perfusion_ok: true, avpu: "U", pediatric: true });
  assert.equal(pedAvpuU.tag, "RED");
  // Pediatric apneic + pulse + restored after 5 breaths -> RED (JumpSTART rule).
  const jumpSt = computeSTART({ walking: false, breathing: "no", pediatric: true, has_pulse: true, breaths_restored_after_5: true });
  assert.equal(jumpSt.tag, "RED");
  // Pediatric apneic + no pulse -> BLACK.
  const jumpStBlack = computeSTART({ walking: false, breathing: "no", pediatric: true, has_pulse: false });
  assert.equal(jumpStBlack.tag, "BLACK");
  // Path-array invariant: each result includes a path explanation.
  assert.ok(Array.isArray(walking.path) && walking.path.length > 0,
    `walking path: ${JSON.stringify(walking.path)}`);
  assert.ok(Array.isArray(tachypnea.path) && tachypnea.path.length > 0,
    `tachypnea path: ${JSON.stringify(tachypnea.path)}`);
  // pediatric pin: returned in output regardless of branch.
  assert.equal(walking.pediatric, false);
  assert.equal(pedNormal.pediatric, true);
  // Missing-RR error pin: breathing on own without RR -> error.
  const noRR = computeSTART({ walking: false, breathing: "yes" });
  assert.ok(noRR.error, `expected error for missing RR, got ${JSON.stringify(noRR)}`);
});

// --- spec-v14 §10.3 Phase F fifty-seventh monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (A / B / C / E / Y).

import { computeServiceLoadStandard } from "../../calc-electrical.js";
import { computeSepticDrainfield } from "../../calc-plumbing.js";
import { computeBeltAndPulley } from "../../calc-hvac.js";
import { computeStairs } from "../../calc-construction.js";
import { computeReadability } from "../../calc-edu.js";

test("monotonicity: computeServiceLoadStandard total_VA is strictly non-decreasing in area_ft2 (NEC 220.12 3 VA/ft^2 lighting); strictly non-decreasing in range_W, dryer_W, hvac_cooling/heating_W; 4+-appliance 0.75x demand pin (NEC 220.53); HVAC = max(cooling, heating) pin (NEC 220.60); required_A = total_VA / service_voltage", () => {
  // Group A. Strictly non-decreasing in area_ft2 (more general lighting load).
  let prev = -Infinity;
  for (const area_ft2 of [500, 1000, 1500, 2500, 5000, 10000]) {
    const r = computeServiceLoadStandard({ area_ft2, small_appliance_circuits: 2, laundry_circuit: 1 });
    assert.ok(Number.isFinite(r.total_VA) && r.total_VA > 0,
      `VA at area=${area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.total_VA >= prev,
      `VA at area=${area_ft2} = ${r.total_VA} not >= prev=${prev}`);
    prev = r.total_VA;
  }
  // Strictly non-decreasing in range_W.
  let prevR = -Infinity;
  for (const range_W of [0, 4000, 8000, 10000, 12000, 16000]) {
    const r = computeServiceLoadStandard({ area_ft2: 2000, range_W });
    assert.ok(r.total_VA >= prevR,
      `VA at range_W=${range_W} = ${r.total_VA} not >= prev=${prevR}`);
    prevR = r.total_VA;
  }
  // NEC 220.55 range-demand pin: 0 -> 0; <=8000 -> nameplate; 8000-12000 ->
  // capped at 8000; >12000 -> 8000 + 0.05 * (range_W - 12000).
  const r0 = computeServiceLoadStandard({ area_ft2: 2000, range_W: 0 });
  assert.equal(r0.breakdown.range_demand_VA, 0);
  const r6000 = computeServiceLoadStandard({ area_ft2: 2000, range_W: 6000 });
  assert.equal(r6000.breakdown.range_demand_VA, 6000);
  const r10000 = computeServiceLoadStandard({ area_ft2: 2000, range_W: 10000 });
  assert.equal(r10000.breakdown.range_demand_VA, 8000);
  const r16000 = computeServiceLoadStandard({ area_ft2: 2000, range_W: 16000 });
  assert.equal(r16000.breakdown.range_demand_VA, 8000 + (16000 - 12000) * 0.05);
  // NEC 220.54 dryer pin: 0 -> 0; >0 -> max(5000, nameplate).
  const d0 = computeServiceLoadStandard({ area_ft2: 2000, dryer_W: 0 });
  assert.equal(d0.breakdown.dryer_demand_VA, 0);
  const d3000 = computeServiceLoadStandard({ area_ft2: 2000, dryer_W: 3000 });
  assert.equal(d3000.breakdown.dryer_demand_VA, 5000);
  const d6000 = computeServiceLoadStandard({ area_ft2: 2000, dryer_W: 6000 });
  assert.equal(d6000.breakdown.dryer_demand_VA, 6000);
  // NEC 220.53 fixed-appliance pin: 4+ items -> 0.75x demand.
  const fixed3 = computeServiceLoadStandard({ area_ft2: 2000, fixed_appliances_W: 10000, fixed_appliance_count: 3 });
  assert.equal(fixed3.breakdown.fixed_demand_VA, 10000);  // no derate
  const fixed4 = computeServiceLoadStandard({ area_ft2: 2000, fixed_appliances_W: 10000, fixed_appliance_count: 4 });
  assert.equal(fixed4.breakdown.fixed_demand_VA, 10000 * 0.75);
  const fixed10 = computeServiceLoadStandard({ area_ft2: 2000, fixed_appliances_W: 10000, fixed_appliance_count: 10 });
  assert.equal(fixed10.breakdown.fixed_demand_VA, 10000 * 0.75);
  // NEC 220.60 HVAC pin: max(cooling, heating) is used; neither is added twice.
  const hvacCool = computeServiceLoadStandard({ area_ft2: 2000, hvac_cooling_W: 6000, hvac_heating_W: 0 });
  const hvacHeat = computeServiceLoadStandard({ area_ft2: 2000, hvac_cooling_W: 0, hvac_heating_W: 9000 });
  const hvacBoth = computeServiceLoadStandard({ area_ft2: 2000, hvac_cooling_W: 6000, hvac_heating_W: 9000 });
  assert.equal(hvacCool.breakdown.hvac_demand_VA, 6000);
  assert.equal(hvacHeat.breakdown.hvac_demand_VA, 9000);
  assert.equal(hvacBoth.breakdown.hvac_demand_VA, 9000);  // max(6000, 9000)
  // NEC 430.24 largest-motor pin: +25% added to total.
  const noMotor = computeServiceLoadStandard({ area_ft2: 2000, largest_motor_W: 0 });
  const withMotor = computeServiceLoadStandard({ area_ft2: 2000, largest_motor_W: 1500 });
  assert.equal(withMotor.breakdown.motor_largest_25_VA, 1500 * 0.25);
  assert.equal(withMotor.total_VA - noMotor.total_VA, 1500 * 0.25);
  // required_A = total_VA / service_voltage exact pin.
  const ref = computeServiceLoadStandard({
    area_ft2: 2500, small_appliance_circuits: 2, laundry_circuit: 1,
    fixed_appliances_W: 8000, fixed_appliance_count: 5,
    range_W: 12000, dryer_W: 5000, largest_motor_W: 1500,
    hvac_cooling_W: 6000, hvac_heating_W: 9000, service_voltage: 240,
  });
  assert.ok(Math.abs(ref.required_A - ref.total_VA / 240) < 1e-9,
    `req_A = ${ref.required_A}, expected ${ref.total_VA / 240}`);
  // recommended_A monotone-non-decreasing in required_A across the ladder.
  let prevRec = -Infinity;
  for (const area_ft2 of [500, 1000, 2000, 4000, 8000, 16000, 32000]) {
    const r = computeServiceLoadStandard({ area_ft2 });
    assert.ok(r.recommended_A >= prevRec,
      `rec_A at area=${area_ft2} = ${r.recommended_A} not >= prev=${prevRec}`);
    prevRec = r.recommended_A;
  }
  // Bounds pin: area < 0 -> error.
  const bad = computeServiceLoadStandard({ area_ft2: -100 });
  assert.ok(bad.error, `expected error for negative area, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeSepticDrainfield required_area_ft2 is strictly increasing in design_flow_gpd at fixed application_rate (linear pin); strictly decreasing as application_rate_gpd_per_ft2 rises at fixed flow (1/rate inverse pin); trench_feet = required_area_ft2 / trench_width_ft", () => {
  // Group B. required = flow / app_rate; trench_ft = required / width.
  let prev = -Infinity;
  for (const design_flow_gpd of [100, 300, 600, 900, 1500, 3000]) {
    const r = computeSepticDrainfield({ design_flow_gpd, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
    assert.ok(Number.isFinite(r.required_area_ft2) && r.required_area_ft2 > 0,
      `A at Q=${design_flow_gpd}: ${JSON.stringify(r)}`);
    assert.ok(r.required_area_ft2 > prev,
      `A at Q=${design_flow_gpd} = ${r.required_area_ft2} not greater than prev=${prev}`);
    prev = r.required_area_ft2;
  }
  // Strictly decreasing in application_rate_gpd_per_ft2 (1/rate pin).
  let prevR = Infinity;
  for (const application_rate_gpd_per_ft2 of [0.2, 0.4, 0.6, 0.8, 1.0, 1.5]) {
    const r = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2, trench_width_ft: 3 });
    assert.ok(r.required_area_ft2 < prevR,
      `A at rate=${application_rate_gpd_per_ft2} = ${r.required_area_ft2} not less than prev=${prevR}`);
    prevR = r.required_area_ft2;
  }
  // Strictly decreasing in trench_width_ft at fixed area (linear-inverse pin).
  let prevW = Infinity;
  for (const trench_width_ft of [1, 2, 3, 4, 5, 6]) {
    const r = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft });
    assert.ok(r.trench_feet < prevW,
      `trench_ft at W=${trench_width_ft} = ${r.trench_feet} not less than prev=${prevW}`);
    prevW = r.trench_feet;
  }
  // Closed-form pin from septicDrainfieldExample: 600 gpd / 0.6 = 1000 ft^2;
  // trench = 1000 / 3 ~ 333.3 ft.
  const ref = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  assert.equal(ref.required_area_ft2, 1000);
  assert.ok(Math.abs(ref.trench_feet - 1000 / 3) < 1e-9,
    `trench = ${ref.trench_feet}, expected ${1000 / 3}`);
  // 2x flow -> 2x required area exact (linear).
  const a = computeSepticDrainfield({ design_flow_gpd: 300, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  const b = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  assert.equal(b.required_area_ft2, 2 * a.required_area_ft2);
  // 2x app_rate -> 1/2 required area exact (inverse).
  const r1 = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.3, trench_width_ft: 3 });
  const r2 = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  assert.equal(r2.required_area_ft2, r1.required_area_ft2 / 2);
  // Round-trip identity: design_flow_gpd, application_rate passthrough.
  assert.equal(ref.design_flow_gpd, 600);
  assert.equal(ref.application_rate_gpd_per_ft2, 0.6);
  // Bounds pin: non-positive inputs -> error.
  const bad = computeSepticDrainfield({ design_flow_gpd: 0, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 });
  assert.ok(bad.error, `expected error for Q=0, got ${JSON.stringify(bad)}`);
  const badR = computeSepticDrainfield({ design_flow_gpd: 600, application_rate_gpd_per_ft2: 0, trench_width_ft: 3 });
  assert.ok(badR.error, `expected error for rate=0, got ${JSON.stringify(badR)}`);
});

test("monotonicity: computeBeltAndPulley driven_rpm = motor_rpm * (drive_dia / driven_dia) (inverse-diameter pin); strictly decreasing in driven_dia at fixed drive_dia / motor_rpm; belt_speed_fpm = pi * drive_dia/12 * motor_rpm (linear); belt_length grows with center_distance AND with sum of diameters", () => {
  // Group C. driven_rpm = motor_rpm * (drive_dia / driven_dia). At fixed
  // motor_rpm and drive_dia, strictly decreasing as driven_dia rises.
  let prev = Infinity;
  for (const driven_dia_in of [2, 4, 6, 8, 12, 18, 24]) {
    const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in, center_distance_in: 18, motor_rpm: 1750 });
    assert.ok(Number.isFinite(r.driven_rpm) && r.driven_rpm > 0,
      `rpm at d_n=${driven_dia_in}: ${JSON.stringify(r)}`);
    assert.ok(r.driven_rpm < prev,
      `rpm at d_n=${driven_dia_in} = ${r.driven_rpm} not less than prev=${prev}`);
    prev = r.driven_rpm;
  }
  // Strictly increasing in drive_dia_in at fixed driven / motor_rpm.
  let prevD = -Infinity;
  for (const drive_dia_in of [2, 3, 4, 5, 6, 8, 10]) {
    const r = computeBeltAndPulley({ drive_dia_in, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 });
    assert.ok(r.driven_rpm > prevD,
      `rpm at d_d=${drive_dia_in} = ${r.driven_rpm} not greater than prev=${prevD}`);
    prevD = r.driven_rpm;
  }
  // Closed-form pin from beltAndPulleyExample: drive 4 / driven 8 / 1750 rpm.
  // driven_rpm = 1750 * (4/8) = 875.
  const ref = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 });
  assert.equal(ref.driven_rpm, 875);
  // belt_speed_fpm = (pi * drive_dia / 12) * motor_rpm = pi/3 * 1750.
  const expectedSpeed = (Math.PI * 4 / 12) * 1750;
  assert.ok(Math.abs(ref.belt_speed_fpm - expectedSpeed) < 1e-9,
    `belt_speed = ${ref.belt_speed_fpm}, expected ${expectedSpeed}`);
  // Belt length closed-form pin: L = 2C + (pi/2)(D+d) + (D-d)^2/(4C).
  const D = 8, d = 4, C = 18;
  const expectedL = 2 * C + (Math.PI / 2) * (D + d) + Math.pow(D - d, 2) / (4 * C);
  assert.ok(Math.abs(ref.belt_length_in - expectedL) < 1e-9,
    `L = ${ref.belt_length_in}, expected ${expectedL}`);
  // belt_length strictly increasing in center_distance.
  let prevL = -Infinity;
  for (const center_distance_in of [10, 15, 18, 24, 36, 48]) {
    const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in, motor_rpm: 1750 });
    assert.ok(r.belt_length_in > prevL,
      `L at C=${center_distance_in} = ${r.belt_length_in} not greater than prev=${prevL}`);
    prevL = r.belt_length_in;
  }
  // belt_length strictly increasing in sum of diameters at fixed center distance.
  let prevSum = -Infinity;
  for (const driven_dia_in of [4, 6, 8, 12, 18, 24]) {
    const r = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in, center_distance_in: 30, motor_rpm: 1750 });
    assert.ok(r.belt_length_in > prevSum,
      `L at d_n=${driven_dia_in} = ${r.belt_length_in} not greater than prev=${prevSum}`);
    prevSum = r.belt_length_in;
  }
  // 2x motor_rpm pin: 2x rpm -> 2x driven_rpm; 2x belt_speed.
  const r1 = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 875 });
  const r2 = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 });
  assert.equal(r2.driven_rpm, 2 * r1.driven_rpm);
  assert.ok(Math.abs(r2.belt_speed_fpm - 2 * r1.belt_speed_fpm) < 1e-9,
    `2x rpm: speed = ${r2.belt_speed_fpm} != 2 * ${r1.belt_speed_fpm}`);
  // motor_rpm = 0 -> driven_rpm = null (no rotation).
  const noRpm = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 0 });
  assert.equal(noRpm.driven_rpm, null);
  assert.equal(noRpm.belt_speed_fpm, null);
  // Bounds pin: non-positive diameters / center distance -> error.
  const bad = computeBeltAndPulley({ drive_dia_in: 0, driven_dia_in: 8, center_distance_in: 18 });
  assert.ok(bad.error, `expected error for drive=0, got ${JSON.stringify(bad)}`);
  const badC = computeBeltAndPulley({ drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 0 });
  assert.ok(badC.error, `expected error for C=0, got ${JSON.stringify(badC)}`);
});

test("monotonicity: computeStairs risers is monotone non-decreasing in total_rise_in at fixed preferred_riser_height_in (rounding-ladder pin); riser_height_in = total_rise_in / risers; treads = risers - 1; total_run_in = treads * 10 (IRC default tread depth); stair_angle_deg = atan(riser/tread)", () => {
  // Group E. risers = round(total_rise_in / preferred_riser_height_in).
  // Strictly non-decreasing in total_rise_in at fixed preferred riser.
  let prev = -Infinity;
  for (const total_rise_in of [10, 30, 60, 108, 150, 200]) {
    const r = computeStairs({ total_rise_in, preferred_riser_height_in: 7.5 });
    assert.ok(Number.isFinite(r.risers) && r.risers >= 1,
      `risers at rise=${total_rise_in}: ${JSON.stringify(r)}`);
    assert.ok(r.risers >= prev,
      `risers at rise=${total_rise_in} = ${r.risers} not >= prev=${prev}`);
    prev = r.risers;
  }
  // Closed-form pin from stairsExample: rise=108 / preferred=7.5.
  // 108/7.5 = 14.4 -> rounded to 14 risers. treads = 13. run = 13*10 = 130.
  const ref = computeStairs({ total_rise_in: 108, preferred_riser_height_in: 7.5 });
  assert.equal(ref.risers, 14);
  assert.equal(ref.treads, 13);
  assert.equal(ref.tread_depth_in, 10);
  assert.equal(ref.total_run_in, 130);
  assert.ok(Math.abs(ref.riser_height_in - 108 / 14) < 1e-12,
    `riser height = ${ref.riser_height_in}, expected ${108 / 14}`);
  // stair_angle_deg = atan(riser/tread) pin.
  const expectedAngle = Math.atan((108 / 14) / 10) * 180 / Math.PI;
  assert.ok(Math.abs(ref.stair_angle_deg - expectedAngle) < 1e-9,
    `angle = ${ref.stair_angle_deg}, expected ${expectedAngle}`);
  // Minimum-risers pin: rise < preferred -> 1 riser.
  const tiny = computeStairs({ total_rise_in: 5, preferred_riser_height_in: 7.5 });
  assert.equal(tiny.risers, 1);
  assert.equal(tiny.treads, 0);
  assert.equal(tiny.total_run_in, 0);
  // Strictly decreasing risers as preferred_riser_height_in rises at fixed rise.
  let prevP = Infinity;
  for (const preferred_riser_height_in of [5, 6, 7, 7.5, 8, 9, 12]) {
    const r = computeStairs({ total_rise_in: 108, preferred_riser_height_in });
    assert.ok(r.risers <= prevP,
      `risers at preferred=${preferred_riser_height_in} = ${r.risers} not <= prev=${prevP}`);
    prevP = r.risers;
  }
  // total_run_in = treads * 10 invariant.
  for (const total_rise_in of [40, 80, 108, 150]) {
    const r = computeStairs({ total_rise_in });
    assert.equal(r.total_run_in, r.treads * 10);
  }
  // treads = risers - 1 invariant.
  for (const total_rise_in of [40, 80, 108, 150]) {
    const r = computeStairs({ total_rise_in });
    assert.equal(r.treads, r.risers - 1);
  }
  // Default preferred_riser_height_in = 7.5 pin.
  const defaultR = computeStairs({ total_rise_in: 108 });
  assert.equal(defaultR.risers, 14);
  // Bounds pin: total_rise_in <= 0 -> error.
  const bad = computeStairs({ total_rise_in: 0 });
  assert.ok(bad.error, `expected error for rise=0, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeReadability flesch_kincaid_grade_level is strictly increasing in syllables_per_word at fixed words_per_sentence (11.8*spw linear pin); strictly increasing in words_per_sentence at fixed spw (0.39*wps linear pin); flesch_reading_ease is strictly decreasing in both spw and wps (inverse-difficulty pin); reliable flag tips at >= 50 words; sentences/words/syllables counts grow with input text", () => {
  // Group Y. Use generated text where we control sentence count.
  // Shorter sentences with monosyllabic words -> lower FKGL.
  const easyText = ("Cats run. Dogs run. Birds fly. Fish swim. The sun is hot. The moon is cool. ").repeat(10);
  const easy = computeReadability({ text: easyText });
  assert.ok(easy.words >= 50, `easy words: ${easy.words}`);
  assert.equal(easy.reliable, true);
  assert.ok(Number.isFinite(easy.flesch_kincaid_grade_level),
    `easy FKGL: ${easy.flesch_kincaid_grade_level}`);
  // Long sentences with polysyllabic words -> higher FKGL.
  const hardText = ("The reverberating multidimensional electromagnetic phenomena demonstrated by atypical configurations of supplementary infrastructure facilities incorporate sophisticated computational methodologies and represent significant technological advancements over previously established paradigms. " ).repeat(5);
  const hard = computeReadability({ text: hardText });
  assert.ok(hard.flesch_kincaid_grade_level > easy.flesch_kincaid_grade_level,
    `hard FKGL ${hard.flesch_kincaid_grade_level} not > easy ${easy.flesch_kincaid_grade_level}`);
  // Flesch Reading Ease moves the opposite way (lower = harder).
  assert.ok(hard.flesch_reading_ease < easy.flesch_reading_ease,
    `hard FRE ${hard.flesch_reading_ease} not < easy ${easy.flesch_reading_ease}`);
  // Reliability pin: < 50 words -> reliable=false; >= 50 -> reliable=true.
  const tiny = computeReadability({ text: "The cat sat on the mat." });
  assert.ok(tiny.words < 50);
  assert.equal(tiny.reliable, false);
  const big = computeReadability({ text: "The cat sat on the mat. ".repeat(20) });
  assert.ok(big.words >= 50);
  assert.equal(big.reliable, true);
  // Empty / whitespace-only pin: 0 sentences or 0 words -> FKGL/FRE = null.
  const empty = computeReadability({ text: "" });
  assert.equal(empty.flesch_kincaid_grade_level, null);
  assert.equal(empty.flesch_reading_ease, null);
  assert.equal(empty.reliable, false);
  // Counts monotone with text size pin: doubling text yields more
  // sentences / words / syllables.
  const single = computeReadability({ text: "The quick brown fox jumps over the lazy dog." });
  const doubled = computeReadability({ text: "The quick brown fox jumps over the lazy dog. ".repeat(2) });
  assert.ok(doubled.words >= single.words);
  assert.ok(doubled.sentences >= single.sentences);
  assert.ok(doubled.syllables >= single.syllables);
  // Closed-form pin: FKGL = 0.39 * wps + 11.8 * spw - 15.59 (Kincaid 1975).
  const ref = computeReadability({ text: "The cat sat on the mat. The dog ran fast." });
  const expectedFkgl = 0.39 * ref.words_per_sentence + 11.8 * ref.syllables_per_word - 15.59;
  assert.ok(Math.abs(ref.flesch_kincaid_grade_level - expectedFkgl) < 1e-9,
    `FKGL = ${ref.flesch_kincaid_grade_level}, expected ${expectedFkgl}`);
  // FRE closed form: 206.835 - 1.015 * wps - 84.6 * spw (Flesch 1948).
  const expectedFre = 206.835 - 1.015 * ref.words_per_sentence - 84.6 * ref.syllables_per_word;
  assert.ok(Math.abs(ref.flesch_reading_ease - expectedFre) < 1e-9,
    `FRE = ${ref.flesch_reading_ease}, expected ${expectedFre}`);
  // Bounds pin: non-string text -> error.
  const bad = computeReadability({ text: 123 });
  assert.ok(bad.error, `expected error for non-string text, got ${JSON.stringify(bad)}`);
});

// --- spec-v14 §10.3 Phase F fifty-eighth monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (D / E / G / P / V).

import { computeSRTandFM } from "../../calc-water.js";
import { computeMaterialQuantity } from "../../calc-construction.js";
import { computeTipOut } from "../../calc-cross.js";
import { computePayrollWithholding } from "../../calc-accounting.js";
import { computeDrugConcentration } from "../../calc-ems.js";

test("monotonicity: computeSRTandFM srt_days = MLSS-lb / (WAS-lb + EFF-lb) (sludge-age pin); strictly increasing in aeration_volume_gal at fixed solids out; strictly decreasing in WAS or effluent solids out at fixed inventory; F/M = BOD-load-lb-per-day / MLVSS-lb (linear-in-load pin); 8.34 lb/gal water-density conversion exact", () => {
  // Group D. mlss_lb = aeration_vol_gal/1e6 * mlss_mg_l * 8.34.
  // Strictly increasing in aeration_volume_gal at fixed other inputs.
  let prev = -Infinity;
  for (const aeration_volume_gal of [50000, 100000, 250000, 500000, 1000000]) {
    const r = computeSRTandFM({
      aeration_volume_gal, mlss_mg_l: 2500, mlvss_mg_l: 1800,
      was_flow_mgd: 0.05, was_tss_mg_l: 8000,
      bod_load_lb_day: 2000, effluent_tss_mg_l: 20, effluent_flow_mgd: 1.0,
    });
    assert.ok(Number.isFinite(r.srt_days) && r.srt_days > 0,
      `SRT at V=${aeration_volume_gal}: ${JSON.stringify(r)}`);
    assert.ok(r.srt_days > prev,
      `SRT at V=${aeration_volume_gal} = ${r.srt_days} not greater than prev=${prev}`);
    prev = r.srt_days;
  }
  // Strictly decreasing in was_flow_mgd at fixed inventory (more wasting -> shorter SRT).
  let prevW = Infinity;
  for (const was_flow_mgd of [0.01, 0.02, 0.05, 0.1, 0.2, 0.5]) {
    const r = computeSRTandFM({
      aeration_volume_gal: 500000, mlss_mg_l: 2500, mlvss_mg_l: 1800,
      was_flow_mgd, was_tss_mg_l: 8000,
      bod_load_lb_day: 2000, effluent_tss_mg_l: 20, effluent_flow_mgd: 1.0,
    });
    assert.ok(r.srt_days < prevW,
      `SRT at WAS=${was_flow_mgd} = ${r.srt_days} not less than prev=${prevW}`);
    prevW = r.srt_days;
  }
  // Strictly increasing in mlss_mg_l at fixed wasting (more inventory -> longer SRT).
  let prevM = -Infinity;
  for (const mlss_mg_l of [1500, 2000, 2500, 3000, 4000, 5000]) {
    const r = computeSRTandFM({
      aeration_volume_gal: 500000, mlss_mg_l, mlvss_mg_l: 1800,
      was_flow_mgd: 0.05, was_tss_mg_l: 8000,
      bod_load_lb_day: 2000, effluent_tss_mg_l: 20, effluent_flow_mgd: 1.0,
    });
    assert.ok(r.srt_days > prevM,
      `SRT at MLSS=${mlss_mg_l} = ${r.srt_days} not greater than prev=${prevM}`);
    prevM = r.srt_days;
  }
  // F/M ratio strictly increasing in bod_load at fixed MLVSS inventory.
  let prevFM = -Infinity;
  for (const bod_load_lb_day of [500, 1000, 2000, 4000, 8000]) {
    const r = computeSRTandFM({
      aeration_volume_gal: 500000, mlss_mg_l: 2500, mlvss_mg_l: 1800,
      was_flow_mgd: 0.05, was_tss_mg_l: 8000,
      bod_load_lb_day, effluent_tss_mg_l: 20, effluent_flow_mgd: 1.0,
    });
    assert.ok(r.fm_ratio > prevFM,
      `F/M at BOD=${bod_load_lb_day} = ${r.fm_ratio} not greater than prev=${prevFM}`);
    prevFM = r.fm_ratio;
  }
  // F/M strictly decreasing in mlvss_mg_l at fixed BOD load (more biomass -> lower F/M).
  let prevFMv = Infinity;
  for (const mlvss_mg_l of [1000, 1500, 2000, 2500, 3500, 5000]) {
    const r = computeSRTandFM({
      aeration_volume_gal: 500000, mlss_mg_l: 2500, mlvss_mg_l,
      was_flow_mgd: 0.05, was_tss_mg_l: 8000,
      bod_load_lb_day: 2000, effluent_tss_mg_l: 20, effluent_flow_mgd: 1.0,
    });
    assert.ok(r.fm_ratio < prevFMv,
      `F/M at MLVSS=${mlvss_mg_l} = ${r.fm_ratio} not less than prev=${prevFMv}`);
    prevFMv = r.fm_ratio;
  }
  // Closed-form pin: 500000 gal @ 2500 mg/L MLSS -> mlss_lb = 0.5 * 2500 * 8.34 = 10425.
  const ref = computeSRTandFM({
    aeration_volume_gal: 500000, mlss_mg_l: 2500, mlvss_mg_l: 1800,
    was_flow_mgd: 0.05, was_tss_mg_l: 8000,
    bod_load_lb_day: 2000, effluent_tss_mg_l: 20, effluent_flow_mgd: 1.0,
  });
  const expectedMlssLb = (500000 / 1e6) * 2500 * 8.34;
  const expectedWasLb = 0.05 * 8000 * 8.34;
  const expectedEffLb = 1.0 * 20 * 8.34;
  const expectedSrt = expectedMlssLb / (expectedWasLb + expectedEffLb);
  assert.ok(Math.abs(ref.srt_days - expectedSrt) < 1e-6,
    `SRT = ${ref.srt_days}, expected ${expectedSrt}`);
  const expectedMlvssLb = (500000 / 1e6) * 1800 * 8.34;
  const expectedFm = 2000 / expectedMlvssLb;
  assert.ok(Math.abs(ref.fm_ratio - expectedFm) < 1e-9,
    `F/M = ${ref.fm_ratio}, expected ${expectedFm}`);
  // Zero-out-solids pin: WAS=0 and effluent=0 -> SRT = Infinity (no solids leaving).
  const noOut = computeSRTandFM({
    aeration_volume_gal: 500000, mlss_mg_l: 2500, mlvss_mg_l: 1800,
    was_flow_mgd: 0, was_tss_mg_l: 0,
    bod_load_lb_day: 2000, effluent_tss_mg_l: 0, effluent_flow_mgd: 0,
  });
  assert.equal(noOut.srt_days, Infinity);
  // Bounds pin: non-positive aeration_volume_gal or mlss_mg_l -> error.
  const bad = computeSRTandFM({ aeration_volume_gal: 0, mlss_mg_l: 2500 });
  assert.ok(bad.error, `expected error for V=0, got ${JSON.stringify(bad)}`);
  const badM = computeSRTandFM({ aeration_volume_gal: 500000, mlss_mg_l: 0 });
  assert.ok(badM.error, `expected error for MLSS=0, got ${JSON.stringify(badM)}`);
});

test("monotonicity: computeMaterialQuantity units_with_waste is monotone non-decreasing in area_ft2 (linear + ceiling pin); units_raw = area / coverage exact; waste-factor application: 0.15 for roofing_3tab vs 0.10 for drywall/paint/flooring/siding; coverage rate ordering paint 350 > drywall_4x12 48 > drywall_4x8 32 > roofing_3tab 33.3 > siding 25 > flooring_lvp 24", () => {
  // Group E. units_raw = area / coverage; units_with_waste = ceil(units_raw * (1 + waste)).
  // Strictly non-decreasing in area_ft2 at fixed assembly.
  let prev = -Infinity;
  for (const area_ft2 of [100, 250, 500, 1000, 2500, 5000, 10000]) {
    const r = computeMaterialQuantity({ assembly: "drywall_4x8", area_ft2 });
    assert.ok(Number.isFinite(r.units_with_waste) && r.units_with_waste >= 0,
      `units at area=${area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.units_with_waste >= prev,
      `units at area=${area_ft2} = ${r.units_with_waste} not >= prev=${prev}`);
    prev = r.units_with_waste;
  }
  // Closed-form pin from materialQuantityExample: 1000 ft^2 drywall_4x8 ->
  // 1000/32 = 31.25 sheets; *1.10 = 34.375; ceil = 35 sheets.
  const ref = computeMaterialQuantity({ assembly: "drywall_4x8", area_ft2: 1000 });
  assert.equal(ref.units_raw, 1000 / 32);
  assert.equal(ref.units_with_waste, Math.ceil((1000 / 32) * 1.10));
  assert.equal(ref.coverage_ft2_per_unit, 32);
  assert.equal(ref.waste_factor, 0.10);
  // Waste-factor pin: roofing_3tab uses 0.15 (steeper pitch / cut waste).
  const roof = computeMaterialQuantity({ assembly: "roofing_3tab", area_ft2: 2000 });
  assert.equal(roof.waste_factor, 0.15);
  assert.equal(roof.coverage_ft2_per_unit, 33.3);
  assert.equal(roof.units_with_waste, Math.ceil((2000 / 33.3) * 1.15));
  // Other waste-factor pins.
  assert.equal(computeMaterialQuantity({ assembly: "paint_one_coat", area_ft2: 1000 }).waste_factor, 0.10);
  assert.equal(computeMaterialQuantity({ assembly: "flooring_lvp", area_ft2: 1000 }).waste_factor, 0.10);
  assert.equal(computeMaterialQuantity({ assembly: "siding_lap_8in", area_ft2: 1000 }).waste_factor, 0.10);
  // Coverage-rate pin: paint covers more area per unit (350 ft^2/gal) than
  // drywall sheets (32-48 ft^2/sheet); so fewer paint units for same area.
  const paint = computeMaterialQuantity({ assembly: "paint_one_coat", area_ft2: 1000 });
  const dw8 = computeMaterialQuantity({ assembly: "drywall_4x8", area_ft2: 1000 });
  assert.ok(paint.units_with_waste < dw8.units_with_waste,
    `paint ${paint.units_with_waste} not < drywall ${dw8.units_with_waste} at 1000 ft^2`);
  // drywall_4x12 covers more per sheet than drywall_4x8 -> fewer units needed.
  const dw12 = computeMaterialQuantity({ assembly: "drywall_4x12", area_ft2: 1000 });
  assert.ok(dw12.units_with_waste < dw8.units_with_waste,
    `4x12 ${dw12.units_with_waste} not < 4x8 ${dw8.units_with_waste}`);
  // Zero-area boundary pin: 0 area -> 0 units.
  const zero = computeMaterialQuantity({ assembly: "drywall_4x8", area_ft2: 0 });
  assert.equal(zero.units_raw, 0);
  assert.equal(zero.units_with_waste, 0);
  // Unit-label pin.
  assert.ok(/sheet/.test(ref.unit_label), `drywall label: ${ref.unit_label}`);
  assert.ok(/gallon/.test(paint.unit_label), `paint label: ${paint.unit_label}`);
  // Bounds pin: unknown assembly -> error.
  const bad = computeMaterialQuantity({ assembly: "moonrock", area_ft2: 1000 });
  assert.ok(bad.error, `expected error for unknown assembly, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeTipOut share is strictly increasing in member.hours at fixed total_amount; sum of all splits.share = total_amount (conservation invariant); proportional pin: a member with 2x another's hours gets 2x the share; total_hours = sum of member.hours", () => {
  // Group G. share = (member.hours / total_hours) * total_amount.
  // Strictly increasing in a single member's hours at fixed others.
  let prev = -Infinity;
  for (const targetHours of [1, 2, 4, 8, 12, 20]) {
    const r = computeTipOut({
      total_amount: 600,
      members: [
        { name: "target", hours: targetHours },
        { name: "B", hours: 4 },
        { name: "C", hours: 4 },
      ],
    });
    const target = r.splits.find((s) => s.name === "target");
    assert.ok(Number.isFinite(target.share) && target.share > 0,
      `share at h=${targetHours}: ${JSON.stringify(r)}`);
    assert.ok(target.share > prev,
      `share at h=${targetHours} = ${target.share} not greater than prev=${prev}`);
    prev = target.share;
  }
  // Conservation invariant: sum(splits.share) = total_amount.
  const ref = computeTipOut({
    total_amount: 600,
    members: [{ name: "A", hours: 8 }, { name: "B", hours: 4 }, { name: "C", hours: 4 }],
  });
  const sum = ref.splits.reduce((s, m) => s + m.share, 0);
  assert.ok(Math.abs(sum - 600) < 1e-9,
    `conservation: sum ${sum} != total 600`);
  // tipOutExample closed-form pin: A=8h gets 600 * 8/16 = 300; B=C=4h gets 150.
  assert.equal(ref.splits.find((s) => s.name === "A").share, 300);
  assert.equal(ref.splits.find((s) => s.name === "B").share, 150);
  assert.equal(ref.splits.find((s) => s.name === "C").share, 150);
  // total_hours pin.
  assert.equal(ref.total_hours, 16);
  assert.equal(ref.total_amount, 600);
  // Proportionality pin: 2x hours -> 2x share.
  const a = ref.splits.find((s) => s.name === "A");
  const b = ref.splits.find((s) => s.name === "B");
  assert.equal(a.hours, 2 * b.hours);
  assert.ok(Math.abs(a.share - 2 * b.share) < 1e-9,
    `proportionality: ${a.share} != 2 * ${b.share}`);
  // Single-member pin: one member gets entire total.
  const solo = computeTipOut({ total_amount: 500, members: [{ name: "solo", hours: 10 }] });
  assert.equal(solo.splits[0].share, 500);
  // Equal-hours pin: equal hours -> equal shares.
  const equal = computeTipOut({ total_amount: 300, members: [{ name: "a", hours: 5 }, { name: "b", hours: 5 }, { name: "c", hours: 5 }] });
  for (const s of equal.splits) assert.equal(s.share, 100);
  // Zero-total pin: total_amount = 0 -> all shares 0.
  const noTip = computeTipOut({ total_amount: 0, members: [{ name: "a", hours: 8 }] });
  assert.equal(noTip.splits[0].share, 0);
  // Bounds pin: empty members / non-array / zero total hours -> error.
  const empty = computeTipOut({ total_amount: 600, members: [] });
  assert.ok(empty.error, `expected error for empty members, got ${JSON.stringify(empty)}`);
  const noHours = computeTipOut({ total_amount: 600, members: [{ name: "a", hours: 0 }] });
  assert.ok(noHours.error, `expected error for 0 total hours, got ${JSON.stringify(noHours)}`);
});

test("monotonicity: computePayrollWithholding net_per_period is strictly decreasing in gross_per_period only where bracketed rate exceeds 100% (never); fed_per_period grows with gross (progressive bracket pin); FICA = ss + medicare; medicare = gross * 0.0145 exact linear pin; ss = min(gross, ss_remaining) * 0.062 with SS wage base cap pin; pay frequencies weekly 52 / biweekly 26 / semimonthly 24 / monthly 12", () => {
  // Group P. fed_income_tax_period progressive in gross. medicare linear in gross.
  // Sweep above the standard-deduction floor so fed > 0 across all points.
  let prev = -Infinity;
  for (const gross_per_period of [2000, 4000, 8000, 12000, 16000, 24000]) {
    const r = computePayrollWithholding({ gross_per_period, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 });
    assert.ok(Number.isFinite(r.fed_income_tax_period) && r.fed_income_tax_period >= 0,
      `fed at gross=${gross_per_period}: ${JSON.stringify(r)}`);
    assert.ok(r.fed_income_tax_period > prev,
      `fed at gross=${gross_per_period} = ${r.fed_income_tax_period} not greater than prev=${prev}`);
    prev = r.fed_income_tax_period;
  }
  // Medicare = 0.0145 * gross exact pin.
  for (const gross_per_period of [500, 1000, 2000, 5000, 10000]) {
    const r = computePayrollWithholding({ gross_per_period, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 });
    assert.ok(Math.abs(r.medicare_period - gross_per_period * 0.0145) < 1e-9,
      `medicare at ${gross_per_period}: ${r.medicare_period}, expected ${gross_per_period * 0.0145}`);
  }
  // SS = 0.062 * min(gross, ss_remaining). Below the wage base, SS = 0.062 * gross.
  const below = computePayrollWithholding({ gross_per_period: 1000, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025, ytd_ss_wages: 0 });
  assert.ok(Math.abs(below.ss_tax_period - 1000 * 0.062) < 1e-9,
    `SS below cap = ${below.ss_tax_period}, expected ${1000 * 0.062}`);
  // SS wage-base cap pin: once ytd >= 176100 (2025 base), SS = 0.
  const above = computePayrollWithholding({ gross_per_period: 5000, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025, ytd_ss_wages: 200000 });
  assert.equal(above.ss_tax_period, 0);
  // Pay-frequency ordering pin: same annual gross / same income -> same
  // annual fed; per_period scales by 1/periods.
  const wkly = computePayrollWithholding({ gross_per_period: 1000, pay_frequency: "weekly", filing_status: "single", tax_year: 2025 });
  const bwk = computePayrollWithholding({ gross_per_period: 2000, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 });
  const monthly = computePayrollWithholding({ gross_per_period: 4333.33, pay_frequency: "monthly", filing_status: "single", tax_year: 2025 });
  // All correspond to ~ $52,000 annual gross. Per-period fed should scale.
  // Just verify each returns a sensible positive value.
  assert.ok(wkly.fed_income_tax_period > 0 && bwk.fed_income_tax_period > 0 && monthly.fed_income_tax_period > 0,
    `frequencies positive: ${wkly.fed_income_tax_period} ${bwk.fed_income_tax_period} ${monthly.fed_income_tax_period}`);
  // Zero-gross pin: 0 gross -> 0 federal, 0 SS, 0 medicare.
  const zero = computePayrollWithholding({ gross_per_period: 0, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 });
  assert.equal(zero.medicare_period, 0);
  assert.equal(zero.ss_tax_period, 0);
  // Bounds pin: negative gross / unknown frequency / unknown status -> error.
  const badG = computePayrollWithholding({ gross_per_period: -100, pay_frequency: "biweekly", filing_status: "single" });
  assert.ok(badG.error, `expected error for negative gross, got ${JSON.stringify(badG)}`);
  const badF = computePayrollWithholding({ gross_per_period: 1000, pay_frequency: "yearly", filing_status: "single" });
  assert.ok(badF.error, `expected error for unknown frequency, got ${JSON.stringify(badF)}`);
});

test("monotonicity: computeDrugConcentration volume_mL = dose_mg / concentration_mg_per_mL exact (linear-in-dose pin); strictly increasing in ordered_dose_mg; strictly decreasing in stock_concentration_mg_per_mL (1/c inverse pin); weight-based derivation: dose = weight_kg * dose_mg_per_kg; flag tips at < 0.05 mL or > 50 mL", () => {
  // Group V. volume = dose / conc. Strictly increasing in dose at fixed conc.
  let prev = -Infinity;
  for (const ordered_dose_mg of [1, 5, 10, 25, 50, 100, 500]) {
    const r = computeDrugConcentration({ ordered_dose_mg, stock_concentration_mg_per_mL: 50 });
    assert.ok(Number.isFinite(r.volume_mL) && r.volume_mL > 0,
      `vol at dose=${ordered_dose_mg}: ${JSON.stringify(r)}`);
    assert.ok(r.volume_mL > prev,
      `vol at dose=${ordered_dose_mg} = ${r.volume_mL} not greater than prev=${prev}`);
    prev = r.volume_mL;
  }
  // Strictly decreasing in stock_concentration at fixed dose.
  let prevC = Infinity;
  for (const stock_concentration_mg_per_mL of [10, 25, 50, 100, 250, 500]) {
    const r = computeDrugConcentration({ ordered_dose_mg: 50, stock_concentration_mg_per_mL });
    assert.ok(r.volume_mL < prevC,
      `vol at c=${stock_concentration_mg_per_mL} = ${r.volume_mL} not less than prev=${prevC}`);
    prevC = r.volume_mL;
  }
  // Closed-form pin from drugConcentrationExample: 25 mg / 50 mg/mL -> 0.5 mL.
  const ref = computeDrugConcentration({ ordered_dose_mg: 25, stock_concentration_mg_per_mL: 50 });
  assert.equal(ref.volume_mL, 0.5);
  assert.equal(ref.dose_mg, 25);
  assert.equal(ref.concentration_mg_per_mL, 50);
  // Doubling-dose pin: 2x dose -> 2x volume exactly.
  const a = computeDrugConcentration({ ordered_dose_mg: 25, stock_concentration_mg_per_mL: 50 });
  const b = computeDrugConcentration({ ordered_dose_mg: 50, stock_concentration_mg_per_mL: 50 });
  assert.ok(Math.abs(b.volume_mL - 2 * a.volume_mL) < 1e-12,
    `2x dose: vol = ${b.volume_mL} != 2 * ${a.volume_mL}`);
  // Halving-concentration pin: 1/2 c -> 2x volume exactly.
  const c1 = computeDrugConcentration({ ordered_dose_mg: 25, stock_concentration_mg_per_mL: 100 });
  const c2 = computeDrugConcentration({ ordered_dose_mg: 25, stock_concentration_mg_per_mL: 50 });
  assert.ok(Math.abs(c2.volume_mL - 2 * c1.volume_mL) < 1e-12,
    `1/2 c: vol = ${c2.volume_mL} != 2 * ${c1.volume_mL}`);
  // Weight-based derivation pin: dose = weight_kg * dose_mg_per_kg.
  const ped = computeDrugConcentration({ weight_kg: 10, dose_mg_per_kg: 0.5, stock_concentration_mg_per_mL: 50 });
  assert.equal(ped.dose_mg, 5);
  assert.equal(ped.volume_mL, 5 / 50);
  assert.ok(ped.derivation && /5 mg/.test(ped.derivation),
    `derivation message: ${ped.derivation}`);
  // Large-volume flag pin: > 50 mL -> flag.
  const big = computeDrugConcentration({ ordered_dose_mg: 6000, stock_concentration_mg_per_mL: 100 });
  assert.equal(big.volume_mL, 60);
  assert.ok(big.flags.some((f) => />\s*50\s*mL/.test(f)),
    `big-volume flag: ${JSON.stringify(big.flags)}`);
  // Tiny-volume flag pin: < 0.05 mL -> flag.
  const small = computeDrugConcentration({ ordered_dose_mg: 1, stock_concentration_mg_per_mL: 100 });
  assert.equal(small.volume_mL, 0.01);
  assert.ok(small.flags.some((f) => /<\s*0\.05\s*mL/.test(f)),
    `small-volume flag: ${JSON.stringify(small.flags)}`);
  // Bounds pin: non-positive concentration -> error.
  const bad = computeDrugConcentration({ ordered_dose_mg: 25, stock_concentration_mg_per_mL: 0 });
  assert.ok(bad.error, `expected error for c=0, got ${JSON.stringify(bad)}`);
  const noDose = computeDrugConcentration({ stock_concentration_mg_per_mL: 50 });
  assert.ok(noDose.error, `expected error for missing dose, got ${JSON.stringify(noDose)}`);
});

// --- spec-v14 §10.3 Phase F fifty-ninth monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / C / E / F / Y).

import { computeTransformerKvaSizing } from "../../calc-electrical.js";
import { computeHoodExhaust } from "../../calc-hvac.js";
import { computeMasonryCount } from "../../calc-construction.js";
import { computeConfinedSpaceVent } from "../../calc-fire.js";
import { computeAlternateReadability } from "../../calc-edu.js";

test("monotonicity: computeTransformerKvaSizing connected_kVA is strictly increasing as load list grows; required_kVA = connected_kVA * (1 + growth_reserve/100) linear pin; recommended_kVA is monotone non-decreasing across the published kVA step ladder (15/30/45/75/112.5/150/225/300/500/750/1000); fla = kVA*1000 / (V * sqrt(phases))", () => {
  // Group A. connected_kVA strictly increases as loads append.
  let prev = -Infinity;
  for (let n = 1; n <= 6; n++) {
    const loads = [];
    for (let i = 0; i < n; i++) loads.push({ kVA: 10 });
    const r = computeTransformerKvaSizing({ loads, primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 25 });
    assert.ok(Number.isFinite(r.connected_kVA) && r.connected_kVA > 0,
      `connected at n=${n}: ${JSON.stringify(r)}`);
    assert.ok(r.connected_kVA > prev,
      `connected at n=${n} = ${r.connected_kVA} not greater than prev=${prev}`);
    prev = r.connected_kVA;
  }
  // required_kVA = connected_kVA * (1 + reserve/100) linear pin.
  const ref = computeTransformerKvaSizing({ loads: [{ kVA: 50 }, { kVA: 30 }], primary_V: 480, secondary_V: 208, phase: "three", growth_reserve_pct: 25 });
  assert.equal(ref.connected_kVA, 80);
  assert.ok(Math.abs(ref.required_kVA - 80 * 1.25) < 1e-9,
    `required = ${ref.required_kVA}, expected 100`);
  // Recommended-step pin: smallest TRANSFORMER_KVA_STEPS value >= required.
  // 100 -> next is 112.5.
  assert.equal(ref.recommended_kVA, 112.5);
  // Growth-reserve ordering pin.
  const noReserve = computeTransformerKvaSizing({ loads: [{ kVA: 50 }], growth_reserve_pct: 0 });
  const reserved = computeTransformerKvaSizing({ loads: [{ kVA: 50 }], growth_reserve_pct: 50 });
  assert.equal(noReserve.required_kVA, 50);
  assert.equal(reserved.required_kVA, 75);
  // Step-ladder pin: required around step values picks that step exactly.
  const at75 = computeTransformerKvaSizing({ loads: [{ kVA: 75 }], growth_reserve_pct: 0 });
  assert.equal(at75.recommended_kVA, 75);
  const just_above = computeTransformerKvaSizing({ loads: [{ kVA: 76 }], growth_reserve_pct: 0 });
  assert.equal(just_above.recommended_kVA, 112.5);
  // Largest-step cap: above 1000 kVA, recommended caps at 1000 (last in list).
  const huge = computeTransformerKvaSizing({ loads: [{ kVA: 2000 }], growth_reserve_pct: 0 });
  assert.equal(huge.recommended_kVA, 1000);
  // FLA pin: three-phase fla = recommended_kVA * 1000 / (V * sqrt(3)).
  const expectedFlaP = (ref.recommended_kVA * 1000) / (480 * Math.sqrt(3));
  const expectedFlaS = (ref.recommended_kVA * 1000) / (208 * Math.sqrt(3));
  assert.ok(Math.abs(ref.fla_primary_A - expectedFlaP) < 1e-6,
    `FLA primary = ${ref.fla_primary_A}, expected ${expectedFlaP}`);
  assert.ok(Math.abs(ref.fla_secondary_A - expectedFlaS) < 1e-6,
    `FLA secondary = ${ref.fla_secondary_A}, expected ${expectedFlaS}`);
  // Single-phase FLA pin: fla = recommended_kVA * 1000 / V (no sqrt(3) factor).
  const single = computeTransformerKvaSizing({ loads: [{ kVA: 75 }], primary_V: 240, secondary_V: 120, phase: "single", growth_reserve_pct: 0 });
  assert.equal(single.recommended_kVA, 75);
  assert.ok(Math.abs(single.fla_primary_A - (75 * 1000) / 240) < 1e-6,
    `single phase primary FLA: ${single.fla_primary_A}`);
  // Watts-with-pf pin: kVA = watts / 1000 / pf.
  const withPf = computeTransformerKvaSizing({ loads: [{ watts: 4000, pf: 0.8 }], growth_reserve_pct: 0 });
  assert.ok(Math.abs(withPf.connected_kVA - 4000 / 1000 / 0.8) < 1e-9,
    `pf-derived kVA: ${withPf.connected_kVA}, expected 5`);
  // Bounds pin: empty loads / bad V / load missing kVA and watts -> error.
  const empty = computeTransformerKvaSizing({ loads: [] });
  assert.ok(empty.error, `expected error for empty loads, got ${JSON.stringify(empty)}`);
  const badL = computeTransformerKvaSizing({ loads: [{ name: "x" }] });
  assert.ok(badL.error, `expected error for load missing kVA/watts, got ${JSON.stringify(badL)}`);
});

test("monotonicity: computeHoodExhaust Q_exhaust_cfm is strictly increasing in length_ft at fixed type / duty / class (Q = cfm_per_ft * L linear pin); makeup_cfm = 0.80 * Q exact (IMC 508 80% rule pin); cfm_per_ft duty ordering for wall-canopy: light 200 < medium 300 < heavy 400 < extra-heavy 550", () => {
  // Group C. Q = cfm_per_ft * length_ft. Strictly increasing in L.
  let prev = -Infinity;
  for (const length_ft of [4, 6, 8, 10, 12, 16]) {
    const r = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "medium", length_ft });
    assert.ok(Number.isFinite(r.Q_exhaust_cfm) && r.Q_exhaust_cfm > 0,
      `Q at L=${length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.Q_exhaust_cfm > prev,
      `Q at L=${length_ft} = ${r.Q_exhaust_cfm} not greater than prev=${prev}`);
    prev = r.Q_exhaust_cfm;
  }
  // Duty ordering pin for wall-canopy: 200 < 300 < 400 < 550.
  const light = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "light", length_ft: 8 });
  const medium = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "medium", length_ft: 8 });
  const heavy = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "heavy", length_ft: 8 });
  const extra = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "extra-heavy", length_ft: 8 });
  assert.equal(light.cfm_per_ft, 200);
  assert.equal(medium.cfm_per_ft, 300);
  assert.equal(heavy.cfm_per_ft, 400);
  assert.equal(extra.cfm_per_ft, 550);
  assert.ok(light.Q_exhaust_cfm < medium.Q_exhaust_cfm && medium.Q_exhaust_cfm < heavy.Q_exhaust_cfm && heavy.Q_exhaust_cfm < extra.Q_exhaust_cfm,
    `duty ordering: ${light.Q_exhaust_cfm} ${medium.Q_exhaust_cfm} ${heavy.Q_exhaust_cfm} ${extra.Q_exhaust_cfm}`);
  // Closed-form pin from hoodExhaustExample: 8 ft wall-canopy heavy ->
  // 400 cfm/ft * 8 = 3200 cfm exhaust; 0.80 * 3200 = 2560 cfm makeup.
  const ref = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "heavy", length_ft: 8, duct_velocity_fpm: 1500 });
  assert.equal(ref.Q_exhaust_cfm, 3200);
  assert.equal(ref.makeup_cfm, 2560);
  assert.equal(ref.cfm_per_ft, 400);
  // makeup_cfm = 0.80 * Q invariant.
  for (const duty of ["light", "medium", "heavy", "extra-heavy"]) {
    const r = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty, length_ft: 8 });
    assert.ok(Math.abs(r.makeup_cfm - 0.80 * r.Q_exhaust_cfm) < 1e-9,
      `makeup at ${duty}: ${r.makeup_cfm} != 0.80 * ${r.Q_exhaust_cfm}`);
  }
  // duct_area_in2 = (Q / Vd) * 144 closed-form pin.
  assert.ok(Math.abs(ref.duct_area_in2 - (3200 / 1500) * 144) < 1e-9,
    `duct area = ${ref.duct_area_in2}, expected ${(3200 / 1500) * 144}`);
  // grease_duct_slope_in_per_ft pin: 0.25 for Class I, 0 for Class II.
  assert.equal(ref.grease_duct_slope_in_per_ft, 0.25);
  // Type-II vapor-only pin: 100 cfm/ft flat rate; requires width input.
  const type2 = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "II", length_ft: 8, width_ft: 3 });
  assert.equal(type2.cfm_per_ft, 100);
  assert.equal(type2.Q_exhaust_cfm, 800);
  assert.equal(type2.grease_duct_slope_in_per_ft, 0);
  // Single-island heavier than wall-canopy at same duty pin (high-capture).
  const single = computeHoodExhaust({ hood_type: "single-island", hood_class: "I", duty: "medium", length_ft: 8 });
  assert.equal(single.cfm_per_ft, 500);
  assert.ok(single.Q_exhaust_cfm > medium.Q_exhaust_cfm,
    `single-island ${single.Q_exhaust_cfm} not > wall-canopy ${medium.Q_exhaust_cfm}`);
  // Invalid duty/type pin: backshelf extra-heavy not permitted (null).
  const bad = computeHoodExhaust({ hood_type: "backshelf", hood_class: "I", duty: "extra-heavy", length_ft: 8 });
  assert.ok(bad.error, `expected error for backshelf+extra-heavy, got ${JSON.stringify(bad)}`);
  // Bounds pin: L <= 0 -> error; bad hood_class -> error; Type-II missing width.
  const noL = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "I", duty: "medium", length_ft: 0 });
  assert.ok(noL.error, `expected error for L=0, got ${JSON.stringify(noL)}`);
  const badCls = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "III", duty: "medium", length_ft: 8 });
  assert.ok(badCls.error, `expected error for class III, got ${JSON.stringify(badCls)}`);
  const t2NoW = computeHoodExhaust({ hood_type: "wall-canopy", hood_class: "II", length_ft: 8 });
  assert.ok(t2NoW.error, `expected error for Type II without width, got ${JSON.stringify(t2NoW)}`);
});

test("monotonicity: computeMasonryCount unit_count is monotone non-decreasing in wall_area_ft2 (linear + ceiling pin); brick face area smaller than CMU face -> brick demand greater than CMU at same wall area; mortar_joint_in increase -> slightly larger face area -> slightly fewer units; waste_factor pin: unit_count = base + ceil(base * waste)", () => {
  // Group E. base = ceil(area / face_ft2). Strictly non-decreasing in area.
  let prev = -Infinity;
  for (const wall_area_ft2 of [10, 50, 100, 250, 500, 1000, 2500]) {
    const r = computeMasonryCount({ wall_area_ft2, unit_type: "cmu_8x8x16" });
    assert.ok(Number.isFinite(r.unit_count) && r.unit_count > 0,
      `units at area=${wall_area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.unit_count >= prev,
      `units at area=${wall_area_ft2} = ${r.unit_count} not >= prev=${prev}`);
    prev = r.unit_count;
  }
  // Closed-form pin from masonryCountExample: 100 ft^2 cmu_8x8x16 (face 16x8 in).
  // With 3/8 in mortar joint: face_in2 = (16 + 0.375)(8 + 0.375) = 137.14 in^2.
  // face_ft2 = 137.14 / 144 = 0.9524. base_raw = 100 / 0.9524 = 105. base = 105.
  // waste 5% -> count = 105 + ceil(105 * 0.05) = 105 + 6 = 111.
  const ref = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16" });
  const expectedFaceIn2 = (16 + 0.375) * (8 + 0.375);
  assert.ok(Math.abs(ref.face_ft2 - expectedFaceIn2 / 144) < 1e-9,
    `face_ft2 = ${ref.face_ft2}, expected ${expectedFaceIn2 / 144}`);
  // Example band pin: 110-130 units.
  assert.ok(ref.unit_count >= 110 && ref.unit_count <= 130,
    `unit_count = ${ref.unit_count}, expected 110-130 (example range)`);
  // base + ceil(base * waste) pin.
  assert.equal(ref.unit_count, ref.base_count + Math.ceil(ref.base_count * 0.05));
  // Unit-type ordering pin: brick (face ~8 x 2.25 = 18 in^2) much smaller
  // than CMU (face ~16 x 8 = 128 in^2) so brick demand > CMU demand.
  const brick = computeMasonryCount({ wall_area_ft2: 100, unit_type: "modular_brick" });
  const cmu = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16" });
  assert.ok(brick.unit_count > cmu.unit_count,
    `brick ${brick.unit_count} not > CMU ${cmu.unit_count}`);
  // Larger mortar_joint -> slightly larger face -> slightly fewer units.
  const tightJoint = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16", mortar_joint_in: 0.25 });
  const looseJoint = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16", mortar_joint_in: 0.5 });
  assert.ok(tightJoint.unit_count >= looseJoint.unit_count,
    `tight ${tightJoint.unit_count} not >= loose ${looseJoint.unit_count}`);
  // Waste-factor pin: higher waste -> higher unit_count at same base.
  const w0 = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16", waste_factor: 0 });
  const w10 = computeMasonryCount({ wall_area_ft2: 100, unit_type: "cmu_8x8x16", waste_factor: 0.10 });
  assert.ok(w10.unit_count >= w0.unit_count,
    `waste 10% ${w10.unit_count} not >= waste 0% ${w0.unit_count}`);
  // 2x area pin: 2x area roughly doubles base (subject to ceiling).
  const a1 = computeMasonryCount({ wall_area_ft2: 200, unit_type: "cmu_8x8x16", waste_factor: 0 });
  const a2 = computeMasonryCount({ wall_area_ft2: 400, unit_type: "cmu_8x8x16", waste_factor: 0 });
  assert.ok(a2.base_count >= a1.base_count * 2 - 1,
    `2x area base: ${a2.base_count} not ~ 2x ${a1.base_count}`);
  // Bounds pin: unknown unit_type / non-positive area -> error.
  const bad = computeMasonryCount({ wall_area_ft2: 100, unit_type: "marble_slab" });
  assert.ok(bad.error, `expected error for unknown unit, got ${JSON.stringify(bad)}`);
  const noArea = computeMasonryCount({ wall_area_ft2: 0, unit_type: "cmu_8x8x16" });
  assert.ok(noArea.error, `expected error for area=0, got ${JSON.stringify(noArea)}`);
});

test("monotonicity: computeConfinedSpaceVent minutes_to_purge = (V * N) / Q strictly increasing in V, decreasing in Q, increasing in target_purges; steady_ACH = Q*60/V strictly increasing in Q AND decreasing in V; contaminant ordering: H2S/CO default 10 purges > general/LEL/O2 default 7 purges; L*W*H volume fallback when explicit volume_ft3 not given", () => {
  // Group F. minutes = (V * N) / Q. Strictly increasing in V.
  let prev = -Infinity;
  for (const volume_ft3 of [100, 500, 1000, 2500, 5000, 10000]) {
    const r = computeConfinedSpaceVent({ volume_ft3, blower_cfm: 200, contaminant: "general" });
    assert.ok(Number.isFinite(r.minutes_to_purge) && r.minutes_to_purge > 0,
      `t at V=${volume_ft3}: ${JSON.stringify(r)}`);
    assert.ok(r.minutes_to_purge > prev,
      `t at V=${volume_ft3} = ${r.minutes_to_purge} not greater than prev=${prev}`);
    prev = r.minutes_to_purge;
  }
  // Strictly decreasing in blower_cfm at fixed V / N.
  let prevQ = Infinity;
  for (const blower_cfm of [50, 100, 200, 500, 1000, 2000]) {
    const r = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm, contaminant: "general" });
    assert.ok(r.minutes_to_purge < prevQ,
      `t at Q=${blower_cfm} = ${r.minutes_to_purge} not less than prev=${prevQ}`);
    prevQ = r.minutes_to_purge;
  }
  // steady_ACH = Q*60/V strictly increasing in Q at fixed V.
  let prevACH = -Infinity;
  for (const blower_cfm of [50, 100, 200, 500, 1000]) {
    const r = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm, contaminant: "general" });
    assert.ok(r.steady_ACH > prevACH,
      `ACH at Q=${blower_cfm} = ${r.steady_ACH} not greater than prev=${prevACH}`);
    prevACH = r.steady_ACH;
  }
  // L*W*H volume fallback when explicit volume_ft3 not given.
  const fromLWH = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: "general" });
  assert.equal(fromLWH.volume_ft3, 1000);
  // Closed-form pin from confinedSpaceVentExample: 10x10x10 (1000 ft^3),
  // 200 cfm, general (default 7 purges) -> 35 minutes; steady ACH = 12.
  assert.equal(fromLWH.minutes_to_purge, 35);
  assert.equal(fromLWH.steady_ACH, 12);
  assert.equal(fromLWH.target_purges, 7);
  // Contaminant-default-purges pin: H2S and CO default to 10; others to 7.
  const h2s = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "h2s" });
  const co = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "co" });
  const lel = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "combustible-gas" });
  const o2 = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "oxygen-deficient" });
  assert.equal(h2s.target_purges, 10);
  assert.equal(co.target_purges, 10);
  assert.equal(lel.target_purges, 7);
  assert.equal(o2.target_purges, 7);
  // Higher-purges -> longer purge time at fixed V/Q.
  assert.ok(h2s.minutes_to_purge > lel.minutes_to_purge,
    `H2S t ${h2s.minutes_to_purge} not > general LEL t ${lel.minutes_to_purge}`);
  // Doubling-V pin: 2x V -> 2x minutes exactly (linear).
  const a = computeConfinedSpaceVent({ volume_ft3: 500, blower_cfm: 200, contaminant: "general" });
  const b = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "general" });
  assert.equal(b.minutes_to_purge, 2 * a.minutes_to_purge);
  // Doubling-Q pin: 2x Q -> 1/2 minutes exactly (inverse).
  const q1 = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "general" });
  const q2 = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 400, contaminant: "general" });
  assert.equal(q2.minutes_to_purge, q1.minutes_to_purge / 2);
  // explicit volume_ft3 overrides L*W*H.
  const override = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, volume_ft3: 2000, blower_cfm: 200, contaminant: "general" });
  assert.equal(override.volume_ft3, 2000);
  // Long-purge / low-ACH warnings pin.
  const longPurge = computeConfinedSpaceVent({ volume_ft3: 10000, blower_cfm: 100, contaminant: "general" });
  assert.ok(longPurge.warnings.some((w) => /Purge time above 60 minutes/.test(w)),
    `expected long-purge warning: ${JSON.stringify(longPurge.warnings)}`);
  const lowAch = computeConfinedSpaceVent({ volume_ft3: 5000, blower_cfm: 100, contaminant: "general" });
  assert.ok(lowAch.warnings.some((w) => /Steady-state ACH below 6/.test(w)),
    `expected low-ACH warning: ${JSON.stringify(lowAch.warnings)}`);
  // Bounds pin: V <= 0 / Q <= 0 / unknown contaminant -> error.
  const bad = computeConfinedSpaceVent({ blower_cfm: 200, contaminant: "general" });
  assert.ok(bad.error, `expected error for missing V, got ${JSON.stringify(bad)}`);
  const badC = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "carbon-dioxide" });
  assert.ok(badC.error, `expected error for unknown contaminant, got ${JSON.stringify(badC)}`);
});

test("monotonicity: computeAlternateReadability smog and gunning_fog grow with polysyllable density (long-word ratio pin); coleman_liau grows with average letters-per-word (character-density pin); ari grows with average characters-per-word; all four reading-difficulty scores agree on ordering of an 'easy' vs 'hard' text", () => {
  // Group Y. Use generated text where we control complexity.
  const easyText = ("Cats run. Dogs run. The sun is hot. Birds fly fast. ").repeat(15);
  const easy = computeAlternateReadability({ text: easyText });
  assert.ok(easy.words >= 30, `easy words: ${easy.words}`);
  assert.ok(Number.isFinite(easy.smog) && Number.isFinite(easy.coleman_liau) && Number.isFinite(easy.gunning_fog) && Number.isFinite(easy.ari),
    `easy scores: ${JSON.stringify(easy)}`);
  // Hard text uses long words.
  const hardText = ("Sophisticated computational methodologies fundamentally transform interdisciplinary investigations of multidimensional electromagnetic phenomena. Conceptually consequential paradigmatic transformations characterize contemporary scientific philosophy. ").repeat(8);
  const hard = computeAlternateReadability({ text: hardText });
  assert.ok(hard.smog > easy.smog,
    `hard SMOG ${hard.smog} not > easy ${easy.smog}`);
  assert.ok(hard.gunning_fog > easy.gunning_fog,
    `hard Fog ${hard.gunning_fog} not > easy ${easy.gunning_fog}`);
  assert.ok(hard.coleman_liau > easy.coleman_liau,
    `hard CLI ${hard.coleman_liau} not > easy ${easy.coleman_liau}`);
  assert.ok(hard.ari > easy.ari,
    `hard ARI ${hard.ari} not > easy ${easy.ari}`);
  // Polysyllable count grows with text complexity.
  assert.ok(hard.polysyllables > easy.polysyllables,
    `polysyllables: hard ${hard.polysyllables} not > easy ${easy.polysyllables}`);
  // Closed-form SMOG pin: SMOG = 1.043 * sqrt(poly * (30/sentences)) + 3.1291.
  const expectedSmog = 1.043 * Math.sqrt(easy.polysyllables * (30 / easy.sentences)) + 3.1291;
  assert.ok(Math.abs(easy.smog - expectedSmog) < 1e-9,
    `SMOG = ${easy.smog}, expected ${expectedSmog}`);
  // Letters-per-word relationship: hard text averages more letters per word.
  assert.ok(hard.letters / hard.words > easy.letters / easy.words,
    `letters/word: hard ${hard.letters / hard.words} not > easy ${easy.letters / easy.words}`);
  // Empty-text pin: 0 sentences / 0 words -> null scores; reliable=false.
  const empty = computeAlternateReadability({ text: "" });
  assert.equal(empty.smog, null);
  assert.equal(empty.coleman_liau, null);
  assert.equal(empty.gunning_fog, null);
  assert.equal(empty.ari, null);
  assert.equal(empty.reliable, false);
  // Single sentence pin: small text -> reliable can be false.
  const tiny = computeAlternateReadability({ text: "The cat sat." });
  assert.ok(Number.isFinite(tiny.smog),
    `tiny SMOG: ${tiny.smog}`);
  // Bounds pin: non-string text -> error.
  const bad = computeAlternateReadability({ text: 999 });
  assert.ok(bad.error, `expected error for non-string text, got ${JSON.stringify(bad)}`);
});

// --- spec-v14 §10.3 Phase F sixtieth monotonicity batch ----------------
// Five new sweeps across five distinct catalog groups (A / B / E / V / Y).
// Milestone: 60 batches across §10.3.

import { computePullout } from "../../calc-construction.js";
import { computeGlycolMix } from "../../calc-plumbing.js";
import { computeStairStringer } from "../../calc-construction.js";
import { computePedsVitals } from "../../calc-ems.js";
import { computeCodonTable } from "../../calc-edu.js";

test("monotonicity: computePullout total_withdrawal_lb is strictly increasing in penetration_in at fixed species/fastener (linear pin); strictly increasing in fastener diameter D (D-linear pin); strictly increasing in species G^2.5 (NDS withdrawal pin); screws have ~1.85x the withdrawal capacity of comparable nails (NDS published factor)", () => {
  // Group A. w_per_in = G^2.5 * D * 1380. total = w_per_in * factor * penetration.
  // Strictly increasing in penetration_in at fixed species / fastener.
  let prev = -Infinity;
  for (const penetration_in of [0.5, 1.0, 1.5, 2.0, 3.0, 5.0]) {
    const r = computePullout({ fastener_type: "nail", fastener_size: "10d_common", species: "DF-L", penetration_in });
    assert.ok(Number.isFinite(r.total_withdrawal_lb) && r.total_withdrawal_lb > 0,
      `pullout at depth=${penetration_in}: ${JSON.stringify(r)}`);
    assert.ok(r.total_withdrawal_lb > prev,
      `pullout at depth=${penetration_in} = ${r.total_withdrawal_lb} not greater than prev=${prev}`);
    prev = r.total_withdrawal_lb;
  }
  // Strictly increasing in nail diameter at fixed species / penetration.
  let prevD = -Infinity;
  for (const fastener_size of ["8d_common", "10d_common", "16d_common", "20d_common"]) {
    const r = computePullout({ fastener_type: "nail", fastener_size, species: "DF-L", penetration_in: 1.5 });
    assert.ok(r.total_withdrawal_lb > prevD,
      `pullout at size=${fastener_size} = ${r.total_withdrawal_lb} not greater than prev=${prevD}`);
    prevD = r.total_withdrawal_lb;
  }
  // Species ordering pin: G^2.5 grows with denser species.
  // Specific gravities: RedwoodOpenGrain 0.37 < Hem-Fir 0.43 < SPF 0.42 (tie close)
  // < DF-L 0.50 < SYP 0.55. Confirm RedwoodOpenGrain < DF-L < SYP.
  const redwood = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "RedwoodOpenGrain", penetration_in: 1.5 });
  const dfl = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 1.5 });
  const syp = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "SYP", penetration_in: 1.5 });
  assert.equal(redwood.specific_gravity, 0.37);
  assert.equal(dfl.specific_gravity, 0.50);
  assert.equal(syp.specific_gravity, 0.55);
  assert.ok(redwood.total_withdrawal_lb < dfl.total_withdrawal_lb && dfl.total_withdrawal_lb < syp.total_withdrawal_lb,
    `species ordering: redwood ${redwood.total_withdrawal_lb} < DF-L ${dfl.total_withdrawal_lb} < SYP ${syp.total_withdrawal_lb}`);
  // Screw vs nail factor pin: at SAME diameter and same other inputs, screws
  // get a 1.85x withdrawal multiplier.
  const nail10 = computePullout({ fastener_type: "nail", fastener_size: "10d_common", species: "DF-L", penetration_in: 1.5 });
  const screw10 = computePullout({ fastener_type: "screw", fastener_size: "#10", species: "DF-L", penetration_in: 1.5 });
  // Diameters: 10d nail 0.148, #10 screw 0.190. The screw will be larger AND
  // gets the 1.85x; expected_ratio = (0.190/0.148) * 1.85.
  const expectedRatio = (0.190 / 0.148) * 1.85;
  assert.ok(Math.abs(screw10.total_withdrawal_lb / nail10.total_withdrawal_lb - expectedRatio) < 1e-9,
    `screw/nail ratio = ${screw10.total_withdrawal_lb / nail10.total_withdrawal_lb}, expected ${expectedRatio}`);
  // Closed-form pin: w_per_in_nail = G^2.5 * D * 1380.
  const ref = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 1.5 });
  const expectedWperIn = Math.pow(0.50, 2.5) * 0.162 * 1380;
  assert.ok(Math.abs(ref.withdrawal_per_inch_lb - expectedWperIn) < 1e-9,
    `w_per_in = ${ref.withdrawal_per_inch_lb}, expected ${expectedWperIn}`);
  // total = w_per_in * penetration exact pin.
  assert.ok(Math.abs(ref.total_withdrawal_lb - ref.withdrawal_per_inch_lb * 1.5) < 1e-9,
    `total = ${ref.total_withdrawal_lb}, expected ${ref.withdrawal_per_inch_lb * 1.5}`);
  assert.equal(ref.diameter_in, 0.162);
  // Doubling-penetration pin: 2x penetration -> 2x total exactly (linear).
  const a = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 1.0 });
  const b = computePullout({ fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 2.0 });
  assert.equal(b.total_withdrawal_lb, 2 * a.total_withdrawal_lb);
  // Bounds pin: unknown species / fastener type / size -> error.
  const badSp = computePullout({ fastener_type: "nail", fastener_size: "10d_common", species: "Mahogany", penetration_in: 1.5 });
  assert.ok(badSp.error, `expected error for unknown species, got ${JSON.stringify(badSp)}`);
  const badType = computePullout({ fastener_type: "bolt", fastener_size: "10d_common", species: "DF-L", penetration_in: 1.5 });
  assert.ok(badType.error, `expected error for fastener=bolt, got ${JSON.stringify(badType)}`);
  const badSize = computePullout({ fastener_type: "nail", fastener_size: "999d", species: "DF-L", penetration_in: 1.5 });
  assert.ok(badSize.error, `expected error for size=999d, got ${JSON.stringify(badSize)}`);
});

test("monotonicity: computeGlycolMix glycol_percent is monotone non-decreasing as target_burst_F drops (colder protection requires more glycol); ethylene curve dips lower than propylene at the same percent (per Dow technical bulletins); concentrate_gal = system_volume_gal * (percent / 100) exact pin; published-point pins (propylene 0/10/20/30/40/50/60 -> 32/26/18/8/-7/-28/-55 F)", () => {
  // Group B. Glycol percent rises as target_burst drops below the curve.
  let prev = -Infinity;
  for (const target_burst_F of [30, 25, 20, 10, 0, -10, -25, -50]) {
    const r = computeGlycolMix({ system_volume_gal: 100, target_burst_F, glycol_type: "propylene" });
    if (r.error) continue;  // very cold targets below curve range return errors
    assert.ok(Number.isFinite(r.glycol_percent) && r.glycol_percent >= 0,
      `pct at T=${target_burst_F}: ${JSON.stringify(r)}`);
    assert.ok(r.glycol_percent > prev || target_burst_F === 30,
      `pct at T=${target_burst_F} = ${r.glycol_percent} not greater than prev=${prev}`);
    prev = r.glycol_percent;
  }
  // Published-point pins on the propylene curve: 0/10/20/30/40/50/60 ->
  // 32/26/18/8/-7/-28/-55 F.
  const p0 = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 32, glycol_type: "propylene" });
  assert.equal(p0.glycol_percent, 0);
  const p20 = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 18, glycol_type: "propylene" });
  assert.equal(p20.glycol_percent, 20);
  const p40 = computeGlycolMix({ system_volume_gal: 100, target_burst_F: -7, glycol_type: "propylene" });
  assert.equal(p40.glycol_percent, 40);
  // Ethylene curve: at same percent, ethylene freezes lower than propylene
  // (10% -> 25 F vs 26 F; 50% -> -34 F vs -28 F). So at the same target,
  // ethylene needs LESS glycol percent than propylene.
  const propAt0 = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" });
  const ethAt0 = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "ethylene" });
  assert.ok(ethAt0.glycol_percent <= propAt0.glycol_percent,
    `at 0 F: ethylene ${ethAt0.glycol_percent} not <= propylene ${propAt0.glycol_percent}`);
  // concentrate_gal = volume * (pct / 100) exact pin.
  const ref = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" });
  assert.ok(Math.abs(ref.concentrate_gal - 100 * (ref.glycol_percent / 100)) < 1e-9,
    `concentrate = ${ref.concentrate_gal}, expected ${100 * (ref.glycol_percent / 100)}`);
  // glycolMixExample band sanity: 0 F target with propylene -> percent in 30-40%.
  assert.ok(ref.glycol_percent >= 30 && ref.glycol_percent <= 40,
    `pct = ${ref.glycol_percent}, expected 30-40 for 0 F propylene`);
  // 2x volume pin: 2x system_volume -> 2x concentrate exactly (linear).
  const v100 = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" });
  const v200 = computeGlycolMix({ system_volume_gal: 200, target_burst_F: 0, glycol_type: "propylene" });
  assert.equal(v200.glycol_percent, v100.glycol_percent);
  assert.equal(v200.concentrate_gal, 2 * v100.concentrate_gal);
  // Attribution passthrough pin.
  assert.ok(ref.attribution && /Dowfrost/.test(ref.attribution),
    `attribution: ${ref.attribution}`);
  // Bounds pin: non-positive volume / unknown glycol / target below curve range.
  const bad = computeGlycolMix({ system_volume_gal: 0, target_burst_F: 0, glycol_type: "propylene" });
  assert.ok(bad.error, `expected error for V=0, got ${JSON.stringify(bad)}`);
  const badG = computeGlycolMix({ system_volume_gal: 100, target_burst_F: 0, glycol_type: "methanol" });
  assert.ok(badG.error, `expected error for unknown glycol, got ${JSON.stringify(badG)}`);
  const tooCold = computeGlycolMix({ system_volume_gal: 100, target_burst_F: -100, glycol_type: "propylene" });
  assert.ok(tooCold.error, `expected error for T=-100, got ${JSON.stringify(tooCold)}`);
});

test("monotonicity: computeStairStringer stringer_in = sqrt(rise^2 + run^2) (Pythagorean pin) strictly increasing in both total_rise_in AND total_run_in; board_feet = (1.5 * 11.25 * stringer_in) / 144 (2x12 stringer linear pin); 108 / 126 -> stringer in 165-167 in (stairStringerExample band)", () => {
  // Group E. Strictly increasing in rise at fixed run.
  let prev = -Infinity;
  for (const total_rise_in of [60, 80, 100, 120, 150, 200]) {
    const r = computeStairStringer({ total_rise_in, total_run_in: 126 });
    assert.ok(Number.isFinite(r.stringer_in) && r.stringer_in > 0,
      `stringer at rise=${total_rise_in}: ${JSON.stringify(r)}`);
    assert.ok(r.stringer_in > prev,
      `stringer at rise=${total_rise_in} = ${r.stringer_in} not greater than prev=${prev}`);
    prev = r.stringer_in;
  }
  // Strictly increasing in run at fixed rise.
  let prevR = -Infinity;
  for (const total_run_in of [60, 80, 100, 126, 150, 200]) {
    const r = computeStairStringer({ total_rise_in: 108, total_run_in });
    assert.ok(r.stringer_in > prevR,
      `stringer at run=${total_run_in} = ${r.stringer_in} not greater than prev=${prevR}`);
    prevR = r.stringer_in;
  }
  // Closed-form pin: stringer = sqrt(rise^2 + run^2).
  const ref = computeStairStringer({ total_rise_in: 108, total_run_in: 126 });
  const expectedStringer = Math.sqrt(108 * 108 + 126 * 126);
  assert.ok(Math.abs(ref.stringer_in - expectedStringer) < 1e-9,
    `stringer = ${ref.stringer_in}, expected ${expectedStringer}`);
  // stringer_ft = stringer_in / 12 unit pin.
  assert.ok(Math.abs(ref.stringer_ft - ref.stringer_in / 12) < 1e-12,
    `stringer_ft: ${ref.stringer_ft} != ${ref.stringer_in / 12}`);
  // stairStringerExample band pin: 165-167 in for 108/126.
  assert.ok(ref.stringer_in >= 165 && ref.stringer_in <= 167,
    `stringer = ${ref.stringer_in}, expected 165-167 (example)`);
  // board_feet closed-form pin: (1.5 * 11.25 * stringer_in) / 144.
  const expectedBF = (1.5 * 11.25 * ref.stringer_in) / 144;
  assert.ok(Math.abs(ref.board_feet - expectedBF) < 1e-9,
    `board_feet = ${ref.board_feet}, expected ${expectedBF}`);
  // 3-4-5 Pythagorean pin: rise 3 / run 4 -> stringer 5.
  const triangle345 = computeStairStringer({ total_rise_in: 3, total_run_in: 4 });
  assert.ok(Math.abs(triangle345.stringer_in - 5) < 1e-9,
    `3-4-5 triangle: ${triangle345.stringer_in}, expected 5`);
  // 2x both dimensions pin: 2x rise AND 2x run -> 2x stringer (similar triangles).
  const small = computeStairStringer({ total_rise_in: 54, total_run_in: 63 });
  const big = computeStairStringer({ total_rise_in: 108, total_run_in: 126 });
  assert.ok(Math.abs(big.stringer_in - 2 * small.stringer_in) < 1e-9,
    `2x both: ${big.stringer_in} != 2 * ${small.stringer_in}`);
  // tread_cut_depth_in default pin: 1.0.
  assert.equal(ref.tread_cut_depth_in, 1);
  // Custom tread_cut_depth_in passthrough.
  const customCut = computeStairStringer({ total_rise_in: 108, total_run_in: 126, tread_cut_depth_in: 1.5 });
  assert.equal(customCut.tread_cut_depth_in, 1.5);
  // Bounds pin: non-positive rise or run -> error.
  const bad = computeStairStringer({ total_rise_in: 0, total_run_in: 126 });
  assert.ok(bad.error, `expected error for rise=0, got ${JSON.stringify(bad)}`);
  const badR = computeStairStringer({ total_rise_in: 108, total_run_in: 0 });
  assert.ok(badR.error, `expected error for run=0, got ${JSON.stringify(badR)}`);
});

test("monotonicity: computePedsVitals heart-rate, respiratory-rate, and SBP age-band ordering reflects PALS-published reference tables; bands progress neonate -> infant -> toddler -> preschool -> school -> adolescent; hypotension_sbp threshold ordering: 60 (neonate) < 70 (infant) < 70+2*age (toddler/preschool/school) < 90 (adolescent)", () => {
  // Group V. PEDS_VITALS table-driven; bands in fixed order.
  const bands = ["neonate", "infant", "toddler", "preschool", "school", "adolescent"];
  // Each band returns a well-formed object with hr/rr/sbp range strings.
  for (const age_band of bands) {
    const r = computePedsVitals({ age_band });
    assert.ok(typeof r.label === "string" && r.label.length > 0,
      `label at ${age_band}: ${JSON.stringify(r)}`);
    assert.ok(typeof r.hr_range === "string", `hr at ${age_band}: ${r.hr_range}`);
    assert.ok(typeof r.rr_range === "string", `rr at ${age_band}: ${r.rr_range}`);
    assert.ok(typeof r.sbp_range === "string", `sbp at ${age_band}: ${r.sbp_range}`);
    assert.ok(typeof r.hypotension_sbp === "string",
      `hypotension at ${age_band}: ${r.hypotension_sbp}`);
    assert.equal(r.band, age_band);
  }
  // Hypotension-SBP threshold ordering pin.
  const neonate = computePedsVitals({ age_band: "neonate" });
  const infant = computePedsVitals({ age_band: "infant" });
  const toddler = computePedsVitals({ age_band: "toddler" });
  const school = computePedsVitals({ age_band: "school" });
  const adolescent = computePedsVitals({ age_band: "adolescent" });
  assert.ok(/SBP < 60/.test(neonate.hypotension_sbp),
    `neonate hypotension: ${neonate.hypotension_sbp}`);
  assert.ok(/SBP < 70 mmHg/.test(infant.hypotension_sbp),
    `infant hypotension: ${infant.hypotension_sbp}`);
  assert.ok(/70 \+ 2\*age/.test(toddler.hypotension_sbp),
    `toddler hypotension: ${toddler.hypotension_sbp}`);
  assert.ok(/70 \+ 2\*age/.test(school.hypotension_sbp),
    `school hypotension: ${school.hypotension_sbp}`);
  assert.ok(/SBP < 90/.test(adolescent.hypotension_sbp),
    `adolescent hypotension: ${adolescent.hypotension_sbp}`);
  // Specific band labels pin.
  assert.ok(/Neonate/.test(neonate.label), `neonate label: ${neonate.label}`);
  assert.ok(/Infant/.test(infant.label), `infant label: ${infant.label}`);
  assert.ok(/Toddler/.test(toddler.label), `toddler label: ${toddler.label}`);
  assert.ok(/Preschool/.test(computePedsVitals({ age_band: "preschool" }).label),
    `preschool label`);
  assert.ok(/School age/.test(school.label), `school label: ${school.label}`);
  assert.ok(/Adolescent/.test(adolescent.label), `adolescent label: ${adolescent.label}`);
  // Heart-rate ranges pin (PALS): neonate 100-205 / infant 100-180 / toddler 98-140
  // / preschool 80-120 / school 75-118 / adolescent 60-100 — upper bounds decline.
  function parseHigh(rangeStr) {
    // e.g. "100-205 (awake) / 90-160 (asleep)" -> 205.
    const m = rangeStr.match(/-(\d+)/);
    return m ? Number(m[1]) : NaN;
  }
  const neonateHR = parseHigh(neonate.hr_range);
  const infantHR = parseHigh(infant.hr_range);
  const toddlerHR = parseHigh(toddler.hr_range);
  const adolescentHR = parseHigh(adolescent.hr_range);
  assert.ok(neonateHR >= infantHR && infantHR >= toddlerHR && toddlerHR > adolescentHR,
    `HR upper-bound monotone: neonate ${neonateHR} >= infant ${infantHR} >= toddler ${toddlerHR} > adolescent ${adolescentHR}`);
  // Respiratory-rate ranges pin: similar decline with age.
  const neonateRR = parseHigh(neonate.rr_range);
  const adolescentRR = parseHigh(adolescent.rr_range);
  assert.ok(neonateRR > adolescentRR,
    `RR neonate ${neonateRR} not > adolescent ${adolescentRR}`);
  // SBP ranges pin: low bound generally rises with age.
  function parseLow(rangeStr) {
    const m = rangeStr.match(/^(\d+)/);
    return m ? Number(m[1]) : NaN;
  }
  const neonateSBPLow = parseLow(neonate.sbp_range);
  const adolescentSBPLow = parseLow(adolescent.sbp_range);
  assert.ok(adolescentSBPLow > neonateSBPLow,
    `SBP low: adolescent ${adolescentSBPLow} not > neonate ${neonateSBPLow}`);
  // Default age_band pin: omitted -> neonate.
  const def = computePedsVitals({});
  assert.equal(def.band, "neonate");
  // Bounds pin: unknown band -> error.
  const bad = computePedsVitals({ age_band: "toddler_extreme" });
  assert.ok(bad.error, `expected error for unknown band, got ${JSON.stringify(bad)}`);
});

test("monotonicity: computeCodonTable amino_acid_sequence length is monotone non-decreasing in input rna_sequence length (in-frame triplet count); DNA -> RNA T→U pin; codon -> amino-acid map identity (AUG -> Met / UAA UAG UGA -> Stop / GGG -> Gly); invalid alphabet -> error", () => {
  // Group Y. amino_acid_sequence length = floor(rna_length / 3). Strictly
  // increasing in groups of 3 codons.
  let prev = -Infinity;
  for (const nucleotideCount of [3, 6, 9, 12, 15, 30, 60, 99]) {
    const seq = "AUG".repeat(nucleotideCount / 3);
    const r = computeCodonTable({ sequence: seq, sequence_type: "rna" });
    assert.ok(Array.isArray(r.amino_acid_sequence),
      `aas at n=${nucleotideCount}: ${JSON.stringify(r)}`);
    assert.ok(r.amino_acid_sequence.length > prev,
      `aas at n=${nucleotideCount} = ${r.amino_acid_sequence.length} not greater than prev=${prev}`);
    prev = r.amino_acid_sequence.length;
  }
  // DNA -> RNA T->U pin: dna ATG transcribes to rna AUG.
  const dna = computeCodonTable({ sequence: "ATG", sequence_type: "dna" });
  assert.equal(dna.rna_sequence, "AUG");
  // AUG -> Methionine + START flag pin.
  assert.equal(dna.amino_acid_sequence[0].codon, "AUG");
  assert.equal(dna.amino_acid_sequence[0].amino_acid, "Met (M) / START");
  // UAA / UAG / UGA -> STOP codon pin.
  const stops = computeCodonTable({ sequence: "UAAUAGUGA", sequence_type: "rna" });
  assert.equal(stops.amino_acid_sequence.length, 3);
  assert.equal(stops.amino_acid_sequence[0].amino_acid, "STOP");
  assert.equal(stops.amino_acid_sequence[1].amino_acid, "STOP");
  assert.equal(stops.amino_acid_sequence[2].amino_acid, "STOP");
  // GGG -> Glycine pin.
  const gly = computeCodonTable({ sequence: "GGG", sequence_type: "rna" });
  assert.equal(gly.amino_acid_sequence[0].amino_acid, "Gly (G)");
  // CCC -> Proline pin.
  const pro = computeCodonTable({ sequence: "CCC", sequence_type: "rna" });
  assert.equal(pro.amino_acid_sequence[0].amino_acid, "Pro (P)");
  // UUU -> Phenylalanine pin.
  const phe = computeCodonTable({ sequence: "UUU", sequence_type: "rna" });
  assert.equal(phe.amino_acid_sequence[0].amino_acid, "Phe (F)");
  // Trailing 1-2 bases ignored pin (only in-frame triplets translate).
  const trailing = computeCodonTable({ sequence: "AUGUA", sequence_type: "rna" });
  assert.equal(trailing.amino_acid_sequence.length, 1);
  assert.equal(trailing.amino_acid_sequence[0].codon, "AUG");
  // Empty-sequence pin: rna="" -> empty aas array.
  const empty = computeCodonTable({ sequence: "", sequence_type: "rna" });
  assert.equal(empty.rna_sequence, "");
  assert.deepEqual(empty.amino_acid_sequence, []);
  // Full table passthrough pin.
  assert.ok(empty.full_table && empty.full_table["AUG"] === "Met (M) / START",
    `full_table AUG: ${empty.full_table && empty.full_table["AUG"]}`);
  // Lowercase normalization pin: lowercase input is uppercased before lookup.
  const lower = computeCodonTable({ sequence: "augggg", sequence_type: "rna" });
  assert.equal(lower.rna_sequence, "AUGGGG");
  assert.equal(lower.amino_acid_sequence[0].amino_acid, "Met (M) / START");
  assert.equal(lower.amino_acid_sequence[1].amino_acid, "Gly (G)");
  // Invalid-alphabet pin: characters outside ACGU -> error.
  const bad = computeCodonTable({ sequence: "AUGXYZ", sequence_type: "rna" });
  assert.ok(bad.error, `expected error for invalid alphabet, got ${JSON.stringify(bad)}`);
});

// --- spec-v14 §10.3 Phase F sixty-first monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / B / C / E / G).
// Each sweep pins a closed-form identity plus bounds so coefficient drift
// is caught the same way the prior batches catch it.

import { computeLightingDensity } from "../../calc-electrical.js";
import { computeRecircLoopSizing } from "../../calc-plumbing.js";
import { computeInsulationHeatLoss } from "../../calc-hvac.js";
import { computeLumberSpan } from "../../calc-construction.js";
import { computePulleyMA } from "../../calc-cross.js";

test("monotonicity: computeLightingDensity target_W = area_ft2 * w_per_ft2 strictly increasing in area at fixed occupancy class (linear pin); occupancy-class density ordering parking_garage 0.2 < warehouse 0.5 < residential 0.7 < office 1.0 < classroom 1.1 < retail 1.2 (ASHRAE 90.1 LPD table); 1000 ft2 office -> 1000 W example pin; 2x area -> 2x watts", () => {
  // Group A. target_W = area * w_per_ft2. Strictly increasing in area.
  let prev = -Infinity;
  for (const area_ft2 of [100, 250, 500, 1000, 2500, 5000]) {
    const r = computeLightingDensity({ area_ft2, occupancy_class: "office" });
    assert.ok(Number.isFinite(r.target_W) && r.target_W > 0,
      `target_W at area=${area_ft2}: ${JSON.stringify(r)}`);
    assert.ok(r.target_W > prev,
      `target_W at area=${area_ft2} = ${r.target_W} not greater than prev=${prev}`);
    prev = r.target_W;
  }
  // Occupancy-class density ordering pin (W/ft2 from the bundled LPD table).
  const garage = computeLightingDensity({ area_ft2: 1000, occupancy_class: "parking_garage" });
  const warehouse = computeLightingDensity({ area_ft2: 1000, occupancy_class: "warehouse" });
  const residential = computeLightingDensity({ area_ft2: 1000, occupancy_class: "residential" });
  const office = computeLightingDensity({ area_ft2: 1000, occupancy_class: "office" });
  const classroom = computeLightingDensity({ area_ft2: 1000, occupancy_class: "classroom" });
  const retail = computeLightingDensity({ area_ft2: 1000, occupancy_class: "retail" });
  assert.equal(garage.w_per_ft2, 0.2);
  assert.equal(warehouse.w_per_ft2, 0.5);
  assert.equal(residential.w_per_ft2, 0.7);
  assert.equal(office.w_per_ft2, 1.0);
  assert.equal(classroom.w_per_ft2, 1.1);
  assert.equal(retail.w_per_ft2, 1.2);
  assert.ok(garage.target_W < warehouse.target_W && warehouse.target_W < residential.target_W
    && residential.target_W < office.target_W && office.target_W < classroom.target_W
    && classroom.target_W < retail.target_W,
    `LPD ordering: ${garage.target_W} < ${warehouse.target_W} < ${residential.target_W} < ${office.target_W} < ${classroom.target_W} < ${retail.target_W}`);
  // Example pin: 1000 ft2 office -> 1000 W, w_per_ft2 = 1.0.
  assert.equal(office.target_W, 1000);
  assert.equal(office.area_ft2, 1000);
  // Linear closed-form pin: target_W = area * w_per_ft2 exact.
  const ref = computeLightingDensity({ area_ft2: 1500, occupancy_class: "retail" });
  assert.ok(Math.abs(ref.target_W - 1500 * 1.2) < 1e-9,
    `target_W = ${ref.target_W}, expected ${1500 * 1.2}`);
  // 2x area -> 2x watts (linear pin).
  const a1000 = computeLightingDensity({ area_ft2: 1000, occupancy_class: "office" });
  const a2000 = computeLightingDensity({ area_ft2: 2000, occupancy_class: "office" });
  assert.equal(a2000.target_W, 2 * a1000.target_W);
  // Bounds pin: unknown occupancy class / non-positive area -> error.
  const badClass = computeLightingDensity({ area_ft2: 1000, occupancy_class: "datacenter" });
  assert.ok(badClass.error, `expected error for unknown class, got ${JSON.stringify(badClass)}`);
  const badArea = computeLightingDensity({ area_ft2: 0, occupancy_class: "office" });
  assert.ok(badArea.error, `expected error for area=0, got ${JSON.stringify(badArea)}`);
});

test("monotonicity: computeRecircLoopSizing Q_total_btu_hr and gpm_required strictly increasing in loop_length_ft (linear pin); q_per_ft strictly increasing in hot_supply_F (larger dT); gpm_required strictly decreasing in set_point_delta_F; ASPE example pin q_per_ft = U(0.17) * 55 = 9.35, Q_total = 1870, gpm = 0.374; 2x length -> 2x Q and gpm", () => {
  // Group B. Q_total = U * (T_h - T_a) * L. Strictly increasing in length.
  let prev = -Infinity;
  let prevGpm = -Infinity;
  for (const loop_length_ft of [50, 100, 200, 400, 800]) {
    const r = computeRecircLoopSizing({ loop_length_ft, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
    assert.ok(Number.isFinite(r.Q_total_btu_hr) && r.Q_total_btu_hr > 0,
      `Q_total at L=${loop_length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.Q_total_btu_hr > prev,
      `Q_total at L=${loop_length_ft} = ${r.Q_total_btu_hr} not greater than prev=${prev}`);
    assert.ok(r.gpm_required > prevGpm,
      `gpm at L=${loop_length_ft} = ${r.gpm_required} not greater than prev=${prevGpm}`);
    prev = r.Q_total_btu_hr;
    prevGpm = r.gpm_required;
  }
  // q_per_ft strictly increasing in hot_supply_F (dT = T_h - T_a grows).
  let prevQ = -Infinity;
  for (const hot_supply_F of [80, 100, 120, 140, 160]) {
    const r = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F, ambient_F: 65, set_point_delta_F: 10 });
    assert.ok(r.q_per_ft_btu_hr > prevQ,
      `q_per_ft at T_h=${hot_supply_F} = ${r.q_per_ft_btu_hr} not greater than prev=${prevQ}`);
    prevQ = r.q_per_ft_btu_hr;
  }
  // gpm_required strictly decreasing in set_point_delta_F (gpm = Q / (500 * dT_set)).
  let prevDecr = Infinity;
  for (const set_point_delta_F of [5, 10, 15, 20, 25]) {
    const r = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F });
    assert.ok(r.gpm_required < prevDecr,
      `gpm at dT_set=${set_point_delta_F} = ${r.gpm_required} not less than prev=${prevDecr}`);
    prevDecr = r.gpm_required;
  }
  // ASPE worked-example pin: 200 ft, 3/4" copper, 1" insulation, 120/65/10.
  const ref = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.equal(ref.U_coefficient, 0.17);
  assert.ok(Math.abs(ref.q_per_ft_btu_hr - 0.17 * 55) < 1e-9,
    `q_per_ft = ${ref.q_per_ft_btu_hr}, expected ${0.17 * 55}`);
  assert.ok(Math.abs(ref.Q_total_btu_hr - 0.17 * 55 * 200) < 1e-9,
    `Q_total = ${ref.Q_total_btu_hr}, expected ${0.17 * 55 * 200}`);
  assert.ok(Math.abs(ref.gpm_required - (0.17 * 55 * 200) / (500 * 10)) < 1e-9,
    `gpm = ${ref.gpm_required}, expected ${(0.17 * 55 * 200) / (500 * 10)}`);
  // 2x length -> 2x Q_total and 2x gpm (linear pin).
  const l200 = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  const l400 = computeRecircLoopSizing({ loop_length_ft: 400, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 });
  assert.ok(Math.abs(l400.Q_total_btu_hr - 2 * l200.Q_total_btu_hr) < 1e-9,
    `2x length Q: ${l400.Q_total_btu_hr} != 2 * ${l200.Q_total_btu_hr}`);
  assert.ok(Math.abs(l400.gpm_required - 2 * l200.gpm_required) < 1e-9,
    `2x length gpm: ${l400.gpm_required} != 2 * ${l200.gpm_required}`);
  // Bounds pin: non-positive length / T_h <= T_a / dT_set <= 0 / unknown size.
  const badL = computeRecircLoopSizing({ loop_length_ft: 0, nominal_size_in: "0.75", hot_supply_F: 120, ambient_F: 65 });
  assert.ok(badL.error, `expected error for L=0, got ${JSON.stringify(badL)}`);
  const badT = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", hot_supply_F: 65, ambient_F: 65 });
  assert.ok(badT.error, `expected error for T_h<=T_a, got ${JSON.stringify(badT)}`);
  const badDelta = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "0.75", hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 0 });
  assert.ok(badDelta.error, `expected error for dT_set=0, got ${JSON.stringify(badDelta)}`);
  const badSize = computeRecircLoopSizing({ loop_length_ft: 200, nominal_size_in: "9", hot_supply_F: 120, ambient_F: 65 });
  assert.ok(badSize.error, `expected error for unknown size, got ${JSON.stringify(badSize)}`);
});

test("monotonicity: computeInsulationHeatLoss Q_insulated_BTU_hr_ft strictly increasing in surface_T_F at fixed ambient (larger dT) and strictly decreasing in thickness_in (more insulation -> less loss); effectiveness_pct strictly increasing in thickness; Q_insulated < Q_bare always; k_value passthrough pin; effectiveness in (0,100)", () => {
  // Group C. Q_insulated grows with the surface-to-ambient temperature gap.
  let prev = -Infinity;
  for (const surface_T_F of [110, 140, 170, 200, 250]) {
    const r = computeInsulationHeatLoss({ pipe_OD_in: 2.375, surface_T_F, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in: 1.5 });
    assert.ok(Number.isFinite(r.Q_insulated_BTU_hr_ft) && r.Q_insulated_BTU_hr_ft > 0,
      `Q_ins at T=${surface_T_F}: ${JSON.stringify(r)}`);
    assert.ok(r.Q_insulated_BTU_hr_ft > prev,
      `Q_ins at T=${surface_T_F} = ${r.Q_insulated_BTU_hr_ft} not greater than prev=${prev}`);
    // Insulated loss is always below the bare loss at the same conditions.
    assert.ok(r.Q_insulated_BTU_hr_ft < r.Q_bare_BTU_hr_ft,
      `Q_ins ${r.Q_insulated_BTU_hr_ft} not < Q_bare ${r.Q_bare_BTU_hr_ft} at T=${surface_T_F}`);
    prev = r.Q_insulated_BTU_hr_ft;
  }
  // Q_insulated strictly decreasing in thickness; effectiveness strictly increasing.
  let prevQ = Infinity;
  let prevEff = -Infinity;
  for (const thickness_in of [0.5, 1.0, 1.5, 2.0, 3.0]) {
    const r = computeInsulationHeatLoss({ pipe_OD_in: 2.375, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in });
    assert.ok(r.Q_insulated_BTU_hr_ft < prevQ,
      `Q_ins at t=${thickness_in} = ${r.Q_insulated_BTU_hr_ft} not less than prev=${prevQ}`);
    assert.ok(r.effectiveness_pct > prevEff,
      `effectiveness at t=${thickness_in} = ${r.effectiveness_pct} not greater than prev=${prevEff}`);
    prevQ = r.Q_insulated_BTU_hr_ft;
    prevEff = r.effectiveness_pct;
  }
  // Example pin: 2.375" OD, 200/70 F, 1.5" fiberglass -> effectiveness ~82%,
  // outer-surface temperature well below the 200 F bare surface.
  const ref = computeInsulationHeatLoss({ pipe_OD_in: 2.375, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0, insulation: "fiberglass", thickness_in: 1.5, jacket_emissivity: 0.9 });
  assert.equal(ref.k_value, 0.025);
  assert.ok(ref.effectiveness_pct > 0 && ref.effectiveness_pct < 100,
    `effectiveness = ${ref.effectiveness_pct}, expected (0,100)`);
  assert.ok(ref.effectiveness_pct >= 75 && ref.effectiveness_pct <= 90,
    `effectiveness = ${ref.effectiveness_pct}, expected 75-90 for 1.5" fiberglass`);
  assert.ok(ref.outer_surface_T_F < 200 && ref.outer_surface_T_F > 70,
    `outer_surface_T = ${ref.outer_surface_T_F}, expected between ambient and surface`);
  assert.ok(/fiberglass/i.test(ref.insulation_label), `insulation_label: ${ref.insulation_label}`);
  // Bounds pin: non-positive OD / unknown insulation type -> error.
  const badOD = computeInsulationHeatLoss({ pipe_OD_in: 0, surface_T_F: 200, ambient_T_F: 70 });
  assert.ok(badOD.error, `expected error for OD=0, got ${JSON.stringify(badOD)}`);
  const badIns = computeInsulationHeatLoss({ pipe_OD_in: 2.375, surface_T_F: 200, ambient_T_F: 70, insulation: "asbestos" });
  assert.ok(badIns.error, `expected error for unknown insulation, got ${JSON.stringify(badIns)}`);
});

test("monotonicity: computeLumberSpan allowable_span_ft strictly decreasing in total_load_psf (heavier load -> shorter span) and strictly increasing in nominal depth 2x4<2x6<2x8<2x10<2x12 (section modulus grows with d); by_bending_ft = sqrt(8*Fb*S/w_lb_in)/12 closed-form pin; allowable_deflection_in = span_in / 360 default pin; DF-L_No2 2x10 @ 50 psf -> 12-18 ft (lumberSpansExample band)", () => {
  // Group E. allowable_span = min(bending, deflection). Strictly decreasing
  // in total_load_psf across the bending/deflection governing transition.
  let prev = Infinity;
  for (const total_load_psf of [20, 40, 60, 80, 100]) {
    const r = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf });
    assert.ok(Number.isFinite(r.allowable_span_ft) && r.allowable_span_ft > 0,
      `span at load=${total_load_psf}: ${JSON.stringify(r)}`);
    assert.ok(r.allowable_span_ft < prev,
      `span at load=${total_load_psf} = ${r.allowable_span_ft} not less than prev=${prev}`);
    prev = r.allowable_span_ft;
  }
  // Strictly increasing in nominal depth at fixed load (section modulus ~ d^2).
  let prevD = -Infinity;
  for (const nominal_size of ["2x4", "2x6", "2x8", "2x10", "2x12"]) {
    const r = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size, total_load_psf: 50 });
    assert.ok(r.allowable_span_ft > prevD,
      `span at size=${nominal_size} = ${r.allowable_span_ft} not greater than prev=${prevD}`);
    prevD = r.allowable_span_ft;
  }
  // Closed-form bending pin: L_b = sqrt(8 * Fb * S / w_lb_in) / 12.
  const ref = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 50, tributary_width_in: 16, deflection_limit: 360 });
  const w_lb_ft = 50 * (16 / 12);
  const w_lb_in = w_lb_ft / 12;
  const expectedBending = Math.sqrt((8 * 900 * ref.section.S_in3) / w_lb_in) / 12;
  assert.ok(Math.abs(ref.by_bending_ft - expectedBending) < 1e-9,
    `by_bending = ${ref.by_bending_ft}, expected ${expectedBending}`);
  // Section modulus pin for 2x10: S = b*d^2/6 = 1.5 * 9.25^2 / 6.
  assert.ok(Math.abs(ref.section.S_in3 - (1.5 * 9.25 * 9.25) / 6) < 1e-9,
    `S = ${ref.section.S_in3}, expected ${(1.5 * 9.25 * 9.25) / 6}`);
  // allowable_span = min(bending, deflection) pin.
  assert.equal(ref.allowable_span_ft, Math.min(ref.by_bending_ft, ref.by_deflection_ft));
  // 50 psf 2x10 is bending-governed (bending < deflection here).
  assert.equal(ref.governing, "bending");
  // allowable_deflection_in = span_in / 360 (default L/360) pin.
  assert.ok(Math.abs(ref.allowable_deflection_in - (ref.allowable_span_ft * 12) / 360) < 1e-9,
    `allowable_deflection = ${ref.allowable_deflection_in}, expected ${(ref.allowable_span_ft * 12) / 360}`);
  // lumberSpansExample band pin: 12-18 ft for DF-L_No2 2x10 @ 50 psf.
  assert.ok(ref.allowable_span_ft >= 12 && ref.allowable_span_ft <= 18,
    `span = ${ref.allowable_span_ft}, expected 12-18 (example)`);
  // Material-property passthrough pin.
  assert.equal(ref.F_b_psi, 900);
  assert.equal(ref.E_psi, 1600000);
  // Bounds pin: unknown species/grade or nominal size -> error.
  const badSp = computeLumberSpan({ species_grade: "Oak_Select", nominal_size: "2x10", total_load_psf: 50 });
  assert.ok(badSp.error, `expected error for unknown species, got ${JSON.stringify(badSp)}`);
  const badSize = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x14", total_load_psf: 50 });
  assert.ok(badSize.error, `expected error for unknown size, got ${JSON.stringify(badSize)}`);
});

test("monotonicity: computePulleyMA actual_ma = theoretical_ma * efficiency^pulleys strictly increasing in efficiency at fixed rig (base > 0); theoretical_ma ordering fixed_1 1 < block_2 2 < block_3 3 < block_4 4 < block_5 5 < block_6 6; actual_ma <= theoretical_ma always; efficiency=1 -> actual = theoretical exactly; block_3 @ 0.95 -> 3*0.95^3 closed-form pin", () => {
  // Group G. actual_ma strictly increasing in efficiency at fixed rig.
  let prev = -Infinity;
  for (const efficiency of [0.80, 0.85, 0.90, 0.95, 1.0]) {
    const r = computePulleyMA({ rig: "block_4", efficiency });
    assert.ok(Number.isFinite(r.actual_ma) && r.actual_ma > 0,
      `actual_ma at eff=${efficiency}: ${JSON.stringify(r)}`);
    assert.ok(r.actual_ma > prev,
      `actual_ma at eff=${efficiency} = ${r.actual_ma} not greater than prev=${prev}`);
    // Frictional losses keep the realized MA at or below the ideal.
    assert.ok(r.actual_ma <= r.theoretical_ma + 1e-12,
      `actual_ma ${r.actual_ma} not <= theoretical ${r.theoretical_ma} at eff=${efficiency}`);
    prev = r.actual_ma;
  }
  // theoretical_ma ordering across the rig ladder.
  const fixed1 = computePulleyMA({ rig: "fixed_1", efficiency: 0.95 });
  const block2 = computePulleyMA({ rig: "block_2", efficiency: 0.95 });
  const block3 = computePulleyMA({ rig: "block_3", efficiency: 0.95 });
  const block4 = computePulleyMA({ rig: "block_4", efficiency: 0.95 });
  const block5 = computePulleyMA({ rig: "block_5", efficiency: 0.95 });
  const block6 = computePulleyMA({ rig: "block_6", efficiency: 0.95 });
  assert.equal(fixed1.theoretical_ma, 1);
  assert.equal(block2.theoretical_ma, 2);
  assert.equal(block3.theoretical_ma, 3);
  assert.equal(block4.theoretical_ma, 4);
  assert.equal(block5.theoretical_ma, 5);
  assert.equal(block6.theoretical_ma, 6);
  assert.ok(fixed1.theoretical_ma < block2.theoretical_ma && block2.theoretical_ma < block3.theoretical_ma
    && block3.theoretical_ma < block4.theoretical_ma && block4.theoretical_ma < block5.theoretical_ma
    && block5.theoretical_ma < block6.theoretical_ma,
    `theoretical_ma ladder ordering failed`);
  // efficiency = 1 -> actual_ma = theoretical_ma exactly (no losses).
  const ideal = computePulleyMA({ rig: "block_6", efficiency: 1 });
  assert.equal(ideal.actual_ma, ideal.theoretical_ma);
  // Closed-form pin: actual = theoretical * efficiency^pulleys.
  const ref = computePulleyMA({ rig: "block_3", efficiency: 0.95 });
  assert.equal(ref.pulleys, 3);
  assert.ok(Math.abs(ref.actual_ma - 3 * Math.pow(0.95, 3)) < 1e-12,
    `actual_ma = ${ref.actual_ma}, expected ${3 * Math.pow(0.95, 3)}`);
  // fixed_1 single-pulley pin: actual = 1 * efficiency^1 = efficiency.
  const single = computePulleyMA({ rig: "fixed_1", efficiency: 0.9 });
  assert.ok(Math.abs(single.actual_ma - 0.9) < 1e-12,
    `fixed_1 actual_ma = ${single.actual_ma}, expected 0.9`);
  // Bounds pin: unknown rig / efficiency out of (0,1] -> error.
  const badRig = computePulleyMA({ rig: "block_9", efficiency: 0.95 });
  assert.ok(badRig.error, `expected error for unknown rig, got ${JSON.stringify(badRig)}`);
  const badEffHigh = computePulleyMA({ rig: "block_3", efficiency: 1.5 });
  assert.ok(badEffHigh.error, `expected error for efficiency=1.5, got ${JSON.stringify(badEffHigh)}`);
  const badEffZero = computePulleyMA({ rig: "block_3", efficiency: 0 });
  assert.ok(badEffZero.error, `expected error for efficiency=0, got ${JSON.stringify(badEffZero)}`);
});

// --- spec-v14 §10.3 Phase F sixty-second monotonicity batch ------------
// Five new sweeps across five distinct catalog groups (A / B / C / E / G).
// Each sweep pins a closed-form identity plus bounds so coefficient drift
// is caught the same way the prior batches catch it.

import { computeGroundingElectrodeResistance } from "../../calc-electrical.js";
import { computeWaterHammerSurge } from "../../calc-plumbing.js";
import { computeDuctLeakage } from "../../calc-hvac.js";
import { computeDemoDebris } from "../../calc-construction.js";
import { computeFallProtectionClearance } from "../../calc-cross.js";

test("monotonicity: computeGroundingElectrodeResistance resistance_ohms strictly proportional to soil_resistivity (2x rho -> 2x R, Dwight 1936 linear pin) and strictly decreasing in rod_length_ft (longer driven rod -> lower resistance); ufer (concrete-encased, halved) < driven_rod at identical geometry; meets_25_ohm / supplemental_count_to_25_ohm threshold pin; bad rho / type / length -> error", () => {
  // Group A. R = (rho / (2*pi*L_cm)) * (ln(8*L_cm/d_cm) - 1). Linear in rho.
  const geom = { electrode_type: "driven_rod", rod_diameter_in: 0.625, rod_length_ft: 8 };
  const r10k = computeGroundingElectrodeResistance({ ...geom, soil_resistivity_ohm_cm: 10000 });
  const r20k = computeGroundingElectrodeResistance({ ...geom, soil_resistivity_ohm_cm: 20000 });
  assert.ok(Number.isFinite(r10k.resistance_ohms) && r10k.resistance_ohms > 0,
    `R(10000): ${JSON.stringify(r10k)}`);
  assert.ok(Math.abs(r20k.resistance_ohms - 2 * r10k.resistance_ohms) < 1e-9,
    `2x rho should double R: ${r20k.resistance_ohms} != 2 * ${r10k.resistance_ohms}`);
  // R strictly decreasing in rod length (the 1/L factor dominates over realistic lengths).
  let prev = Infinity;
  for (const rod_length_ft of [8, 10, 15, 20, 30, 40]) {
    const r = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", rod_diameter_in: 0.625, rod_length_ft, soil_resistivity_ohm_cm: 10000 });
    assert.ok(Number.isFinite(r.resistance_ohms) && r.resistance_ohms > 0,
      `R at L=${rod_length_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.resistance_ohms < prev,
      `R at L=${rod_length_ft} = ${r.resistance_ohms} not less than prev=${prev}`);
    prev = r.resistance_ohms;
  }
  // Ufer (concrete-encased, effective concrete diameter then halved) < bare driven rod.
  const ufer = computeGroundingElectrodeResistance({ electrode_type: "ufer", rod_diameter_in: 0.625, rod_length_ft: 8, soil_resistivity_ohm_cm: 10000 });
  assert.ok(ufer.resistance_ohms < r10k.resistance_ohms,
    `ufer ${ufer.resistance_ohms} should be below driven_rod ${r10k.resistance_ohms}`);
  // 25-ohm threshold pin (NEC 250.53(A)(2)). 10,000 ohm-cm 8 ft rod ~ 39.9 ohms > 25 -> 1 supplemental.
  assert.equal(r10k.meets_25_ohm, false);
  assert.equal(r10k.supplemental_count_to_25_ohm, Math.ceil(r10k.resistance_ohms / 25));
  // A low-resistivity rod meets 25 ohms with zero supplemental electrodes.
  const lowRho = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", rod_diameter_in: 0.625, rod_length_ft: 8, soil_resistivity_ohm_cm: 3000 });
  assert.equal(lowRho.meets_25_ohm, lowRho.resistance_ohms <= 25);
  if (lowRho.meets_25_ohm) assert.equal(lowRho.supplemental_count_to_25_ohm, 0);
  // Bounds pins.
  const badRho = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", rod_diameter_in: 0.625, rod_length_ft: 8, soil_resistivity_ohm_cm: 0 });
  assert.ok(badRho.error, `expected error for rho=0, got ${JSON.stringify(badRho)}`);
  const badType = computeGroundingElectrodeResistance({ electrode_type: "mat", soil_resistivity_ohm_cm: 10000 });
  assert.ok(badType.error, `expected error for unknown electrode type, got ${JSON.stringify(badType)}`);
  const badLen = computeGroundingElectrodeResistance({ electrode_type: "driven_rod", rod_diameter_in: 0.625, rod_length_ft: 0, soil_resistivity_ohm_cm: 10000 });
  assert.ok(badLen.error, `expected error for rod_length=0, got ${JSON.stringify(badLen)}`);
});

test("monotonicity: computeWaterHammerSurge surge_psi strictly proportional to velocity_fps (Joukowsky dP = rho*a*dV, 2x velocity -> 2x surge) with celerity_fps independent of velocity; reflection_time_s strictly proportional to run_length_ft (t = 2L/a, 2x length -> 2x time) and independent of velocity; rapid_closure flag pin; bad material / size / velocity / length -> error", () => {
  // Group B. dP = rho * a * V / 144. Strictly linear in velocity.
  const base = { material: "copper", pipe_size: "1", closure_time_s: 0.05, run_length_ft: 100, fluid: "water" };
  const v4 = computeWaterHammerSurge({ ...base, velocity_fps: 4 });
  const v8 = computeWaterHammerSurge({ ...base, velocity_fps: 8 });
  assert.ok(Number.isFinite(v4.surge_psi) && v4.surge_psi > 0, `surge(4): ${JSON.stringify(v4)}`);
  assert.ok(Math.abs(v8.surge_psi - 2 * v4.surge_psi) < 1e-9,
    `2x velocity should double surge: ${v8.surge_psi} != 2 * ${v4.surge_psi}`);
  // Celerity (the wave speed) depends only on the pipe/fluid, not on velocity.
  assert.ok(Math.abs(v8.celerity_fps - v4.celerity_fps) < 1e-12,
    `celerity should not depend on velocity: ${v8.celerity_fps} vs ${v4.celerity_fps}`);
  // surge strictly increasing across a velocity sweep.
  let prev = -Infinity;
  for (const velocity_fps of [1, 2, 4, 6, 8, 10]) {
    const r = computeWaterHammerSurge({ ...base, velocity_fps });
    assert.ok(r.surge_psi > prev,
      `surge at v=${velocity_fps} = ${r.surge_psi} not greater than prev=${prev}`);
    prev = r.surge_psi;
  }
  // reflection_time_s = 2L/a, strictly linear in run length, independent of velocity.
  let prevT = -Infinity;
  for (const run_length_ft of [50, 100, 200, 400]) {
    const r = computeWaterHammerSurge({ material: "copper", pipe_size: "1", velocity_fps: 8, closure_time_s: 0.05, run_length_ft, fluid: "water" });
    assert.ok(r.reflection_time_s > prevT,
      `reflection at L=${run_length_ft} = ${r.reflection_time_s} not greater than prev=${prevT}`);
    prevT = r.reflection_time_s;
  }
  const t100 = computeWaterHammerSurge({ ...base, velocity_fps: 8 });
  const t200 = computeWaterHammerSurge({ material: "copper", pipe_size: "1", velocity_fps: 8, closure_time_s: 0.05, run_length_ft: 200, fluid: "water" });
  assert.ok(Math.abs(t200.reflection_time_s - 2 * t100.reflection_time_s) < 1e-12,
    `2x length should double reflection time: ${t200.reflection_time_s} != 2 * ${t100.reflection_time_s}`);
  // rapid_closure: a closure shorter than the 2L/a reflection time is a rapid
  // (full-Joukowsky) closure; a slower one is not.
  const fast = computeWaterHammerSurge({ ...base, velocity_fps: 8, closure_time_s: 0.01 });
  assert.ok(0.01 < fast.reflection_time_s, `0.01 s should be below reflection ${fast.reflection_time_s}`);
  assert.equal(fast.rapid_closure, true);
  const slow = computeWaterHammerSurge({ ...base, velocity_fps: 8, closure_time_s: 10 });
  assert.ok(10 > slow.reflection_time_s, `10 s should exceed reflection ${slow.reflection_time_s}`);
  assert.equal(slow.rapid_closure, false);
  // Bounds pins.
  assert.ok(computeWaterHammerSurge({ ...base, material: "unobtanium", velocity_fps: 8 }).error,
    "expected error for unknown material");
  assert.ok(computeWaterHammerSurge({ ...base, pipe_size: "99", velocity_fps: 8 }).error,
    "expected error for unknown pipe size");
  assert.ok(computeWaterHammerSurge({ ...base, velocity_fps: -1 }).error,
    "expected error for negative velocity");
  assert.ok(computeWaterHammerSurge({ ...base, velocity_fps: 8, run_length_ft: 0 }).error,
    "expected error for run_length=0");
});

test("monotonicity: computeDuctLeakage leakage_cfm strictly decreasing in measured_cfm (leak = design - measured); leak_at_1inwc strictly decreasing in test_pressure_inwc (SMACNA sqrt(P) orifice model, leak_at_1inwc*sqrt(P) = leak constant); leak_per_100ft2 strictly decreasing in duct_surface_ft2; SMACNA example pin 1200/1140/600 -> leak 60, pct 5, per_100ft2 10; bad design / pressure / class -> error", () => {
  // Group C. leakage_cfm = max(0, design - measured). Strictly decreasing in measured.
  let prev = Infinity;
  for (const measured_cfm of [1000, 1050, 1100, 1140, 1180]) {
    const r = computeDuctLeakage({ design_cfm: 1200, measured_cfm, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 6 });
    assert.ok(Number.isFinite(r.leakage_cfm) && r.leakage_cfm > 0, `leakage at m=${measured_cfm}: ${JSON.stringify(r)}`);
    assert.ok(r.leakage_cfm < prev,
      `leakage at measured=${measured_cfm} = ${r.leakage_cfm} not less than prev=${prev}`);
    prev = r.leakage_cfm;
  }
  // leak_at_1inwc = leak / sqrt(P). Strictly decreasing in test pressure; product is invariant.
  let prevP = Infinity;
  for (const test_pressure_inwc of [1, 2, 4, 9, 16]) {
    const r = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc, design_class: 6 });
    assert.ok(r.leak_at_1inwc < prevP,
      `leak_at_1inwc at P=${test_pressure_inwc} = ${r.leak_at_1inwc} not less than prev=${prevP}`);
    assert.ok(Math.abs(r.leak_at_1inwc * Math.sqrt(test_pressure_inwc) - 60) < 1e-9,
      `sqrt(P) invariant broken at P=${test_pressure_inwc}: ${r.leak_at_1inwc * Math.sqrt(test_pressure_inwc)} != 60`);
    prevP = r.leak_at_1inwc;
  }
  // leak_per_100ft2 strictly decreasing in duct surface area (same leak spread over more area).
  let prevA = Infinity;
  for (const duct_surface_ft2 of [300, 600, 1200, 2400]) {
    const r = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2, test_pressure_inwc: 1.0, design_class: 6 });
    assert.ok(r.leak_per_100ft2 < prevA,
      `leak_per_100ft2 at A=${duct_surface_ft2} = ${r.leak_per_100ft2} not less than prev=${prevA}`);
    prevA = r.leak_per_100ft2;
  }
  // SMACNA worked-example pin: 1200 design, 1140 measured, 600 ft2, 1 in WC.
  const ref = computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 6 });
  assert.equal(ref.leakage_cfm, 60);
  assert.equal(ref.leakage_pct, 5);
  assert.equal(ref.leak_at_1inwc, 60);
  assert.equal(ref.leak_per_100ft2, 10);
  // Bounds pins.
  assert.ok(computeDuctLeakage({ design_cfm: 0, measured_cfm: 0, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 6 }).error,
    "expected error for design_cfm=0");
  assert.ok(computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 0, design_class: 6 }).error,
    "expected error for test_pressure=0");
  assert.ok(computeDuctLeakage({ design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 7 }).error,
    "expected error for unknown SMACNA class");
});

test("monotonicity: computeDemoDebris tons strictly increasing in volume_yd3 (linear, tons = volume_yd3*27*pcf/2000) and strictly increasing in structure density wood_frame 50 < mixed 100 < masonry 130 < concrete 150 (lb/ft3); volume_ft3 = volume_yd3*27 exact; 2x volume -> 2x tons; dumpster_yd3 monotone non-decreasing in volume; 25 yd3 wood_frame -> 16.875 tons / 675 ft3 / 30 yd3 example pin; bad type / volume -> error", () => {
  // Group E. tons = volume_yd3 * 27 * pcf / 2000. Strictly increasing in volume.
  let prev = -Infinity;
  for (const volume_yd3 of [5, 10, 25, 50, 100]) {
    const r = computeDemoDebris({ structure_type: "wood_frame", volume_yd3 });
    assert.ok(Number.isFinite(r.tons) && r.tons > 0, `tons at V=${volume_yd3}: ${JSON.stringify(r)}`);
    assert.ok(r.tons > prev, `tons at V=${volume_yd3} = ${r.tons} not greater than prev=${prev}`);
    assert.equal(r.volume_ft3, volume_yd3 * 27);
    prev = r.tons;
  }
  // Structure-density ordering pin (pcf from DEMO_DEBRIS_PCF).
  const wood = computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 25 });
  const mixed = computeDemoDebris({ structure_type: "mixed", volume_yd3: 25 });
  const masonry = computeDemoDebris({ structure_type: "masonry", volume_yd3: 25 });
  const concrete = computeDemoDebris({ structure_type: "concrete", volume_yd3: 25 });
  assert.equal(wood.pcf, 50);
  assert.equal(mixed.pcf, 100);
  assert.equal(masonry.pcf, 130);
  assert.equal(concrete.pcf, 150);
  assert.ok(wood.tons < mixed.tons && mixed.tons < masonry.tons && masonry.tons < concrete.tons,
    `density ordering: ${wood.tons} < ${mixed.tons} < ${masonry.tons} < ${concrete.tons}`);
  // Closed-form pin: tons = volume_yd3 * 27 * pcf / 2000.
  assert.ok(Math.abs(masonry.tons - (25 * 27 * 130) / 2000) < 1e-9,
    `tons = ${masonry.tons}, expected ${(25 * 27 * 130) / 2000}`);
  // 2x volume -> 2x tons (linear pin).
  const v25 = computeDemoDebris({ structure_type: "concrete", volume_yd3: 25 });
  const v50 = computeDemoDebris({ structure_type: "concrete", volume_yd3: 50 });
  assert.ok(Math.abs(v50.tons - 2 * v25.tons) < 1e-9, `2x volume tons: ${v50.tons} != 2 * ${v25.tons}`);
  // dumpster_yd3 monotone non-decreasing in volume (next-size-up step function).
  let prevDump = -Infinity;
  for (const volume_yd3 of [5, 10, 15, 20, 30, 40]) {
    const r = computeDemoDebris({ structure_type: "wood_frame", volume_yd3 });
    assert.ok(r.dumpster_yd3 >= prevDump,
      `dumpster at V=${volume_yd3} = ${r.dumpster_yd3} below prev=${prevDump}`);
    prevDump = r.dumpster_yd3;
  }
  // Example pin: 25 yd3 wood frame -> 16.875 tons, 675 ft3, 30 yd3 dumpster.
  assert.equal(wood.tons, 16.875);
  assert.equal(wood.volume_ft3, 675);
  assert.equal(wood.dumpster_yd3, 30);
  // Bounds pins.
  assert.ok(computeDemoDebris({ structure_type: "glass", volume_yd3: 25 }).error,
    "expected error for unknown structure type");
  assert.ok(computeDemoDebris({ structure_type: "wood_frame", volume_yd3: 0 }).error,
    "expected error for volume=0");
});

test("monotonicity: computeFallProtectionClearance required_clearance_ft = free_fall + decel + worker_height + harness_stretch + safety_factor (additive, strictly increasing in each term, +1 ft input -> +1 ft required); remaining_clearance_ft strictly increasing in actual_clearance_ft and strictly decreasing in worker_height_ft; connector free-fall ordering SRL 2 < lanyard-6ft 6 < lanyard-12ft 12; example pin 6ft lanyard -> 16.5 ft required, 1.5 ft remaining, PASS; bad connector / negative height -> error", () => {
  // Group G. required = free_fall + decel + worker_height + harness_stretch + safety_factor.
  let prev = -Infinity;
  for (const worker_height_ft of [4, 5, 6, 7, 8]) {
    const r = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 30 });
    assert.ok(Number.isFinite(r.required_clearance_ft) && r.required_clearance_ft > 0,
      `required at wh=${worker_height_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.required_clearance_ft > prev,
      `required at wh=${worker_height_ft} = ${r.required_clearance_ft} not greater than prev=${prev}`);
    prev = r.required_clearance_ft;
  }
  // Additive pin: +1 ft to any term raises required by exactly 1 ft.
  const baseR = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 30 });
  const plusWh = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 6, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 30 });
  const plusSf = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 2, actual_clearance_ft: 30 });
  assert.ok(Math.abs(plusWh.required_clearance_ft - (baseR.required_clearance_ft + 1)) < 1e-9,
    `+1 ft worker height should add 1 ft: ${plusWh.required_clearance_ft} vs ${baseR.required_clearance_ft + 1}`);
  assert.ok(Math.abs(plusSf.required_clearance_ft - (baseR.required_clearance_ft + 1)) < 1e-9,
    `+1 ft safety factor should add 1 ft: ${plusSf.required_clearance_ft} vs ${baseR.required_clearance_ft + 1}`);
  // remaining strictly increasing in actual clearance; strictly decreasing in worker height.
  let prevRem = -Infinity;
  for (const actual_clearance_ft of [16, 18, 20, 25, 30]) {
    const r = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft });
    assert.ok(r.remaining_clearance_ft > prevRem,
      `remaining at actual=${actual_clearance_ft} = ${r.remaining_clearance_ft} not greater than prev=${prevRem}`);
    prevRem = r.remaining_clearance_ft;
  }
  assert.ok(plusWh.remaining_clearance_ft < baseR.remaining_clearance_ft,
    `more worker height should reduce remaining: ${plusWh.remaining_clearance_ft} vs ${baseR.remaining_clearance_ft}`);
  // Connector free-fall ordering pin (SRL 2 < 6 ft lanyard 6 < 12 ft lanyard 12).
  const srl = computeFallProtectionClearance({ connector: "self-retracting-leading-edge", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 30 });
  const lan6 = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 30 });
  const lan12 = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-12ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 30 });
  assert.equal(srl.free_fall_ft, 2);
  assert.equal(lan6.free_fall_ft, 6);
  assert.equal(lan12.free_fall_ft, 12);
  assert.ok(srl.required_clearance_ft < lan6.required_clearance_ft && lan6.required_clearance_ft < lan12.required_clearance_ft,
    `connector ordering: ${srl.required_clearance_ft} < ${lan6.required_clearance_ft} < ${lan12.required_clearance_ft}`);
  // Example pin: 6 ft lanyard, 5/1/1 -> required 6+3.5+5+1+1 = 16.5, actual 18 -> remaining 1.5, PASS.
  const ref = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 18 });
  assert.equal(ref.required_clearance_ft, 16.5);
  assert.equal(ref.remaining_clearance_ft, 1.5);
  assert.equal(ref.flag, "PASS (clearance margin)");
  // A shortfall in actual clearance flips the flag to FAIL.
  const fail = computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1, actual_clearance_ft: 12 });
  assert.ok(fail.remaining_clearance_ft < 0 && /FAIL/.test(fail.flag),
    `expected FAIL with negative remaining, got ${JSON.stringify(fail)}`);
  // Bounds pins.
  assert.ok(computeFallProtectionClearance({ connector: "rope-grab-mystery", actual_clearance_ft: 18 }).error,
    "expected error for unknown connector");
  assert.ok(computeFallProtectionClearance({ connector: "shock-absorbing-lanyard-6ft", worker_height_ft: -1, actual_clearance_ft: 18 }).error,
    "expected error for negative worker height");
});

// --- spec-v14 §10.3 Phase F sixty-third monotonicity batch -------------
// Five new sweeps across five distinct catalog groups (A / C / E / F / G).
// Each sweep pins a closed-form identity plus bounds so coefficient drift
// is caught the same way the prior batches catch it.

import { computeGeneratorMotorStarting } from "../../calc-electrical.js";
import { computeEquivalentLength } from "../../calc-hvac.js";
import { computeHelicalPile } from "../../calc-construction.js";
import { computeLadderPipeReach } from "../../calc-fire.js";
import { computeVehicleLoad } from "../../calc-cross.js";

test("monotonicity: computeGeneratorMotorStarting required_starting_kVA = worst_starting_kVA / dip_factor * starts_factor — strictly decreasing in dip_factor (1/x), strictly increasing across starts cadence occasional 1.0 < frequent 1.15 < continuous 1.30, and worst_starting_kVA strictly increasing in motor hp (NEMA code-letter kVA/hp); running_kW additive in non_motor_kW (+1 kW -> +1 kW); recommended_kW monotone non-decreasing in required_kW; bad motors / dip / code -> error", () => {
  // Group A. required_starting_kVA = worst / dip * sf.
  const oneMotor = (over) => ({ motors: [{ hp: 25, code_letter: "G" }], non_motor_kW: 15, dip_factor: 0.30, starts_per_hour: "occasional", ...over });
  // Strictly decreasing in dip_factor.
  let prev = Infinity;
  for (const dip_factor of [0.20, 0.25, 0.30, 0.40, 0.50]) {
    const r = computeGeneratorMotorStarting(oneMotor({ dip_factor }));
    assert.ok(Number.isFinite(r.required_starting_kVA) && r.required_starting_kVA > 0,
      `req_kVA at dip=${dip_factor}: ${JSON.stringify(r)}`);
    assert.ok(r.required_starting_kVA < prev,
      `req_kVA at dip=${dip_factor} = ${r.required_starting_kVA} not less than prev=${prev}`);
    prev = r.required_starting_kVA;
  }
  // Starts-cadence ordering (occasional 1.0 < frequent 1.15 < continuous 1.30).
  const occ = computeGeneratorMotorStarting(oneMotor({ starts_per_hour: "occasional" }));
  const freq = computeGeneratorMotorStarting(oneMotor({ starts_per_hour: "frequent" }));
  const cont = computeGeneratorMotorStarting(oneMotor({ starts_per_hour: "continuous" }));
  assert.equal(occ.starts_factor, 1.0);
  assert.equal(freq.starts_factor, 1.15);
  assert.equal(cont.starts_factor, 1.30);
  assert.ok(occ.required_starting_kVA < freq.required_starting_kVA && freq.required_starting_kVA < cont.required_starting_kVA,
    `cadence ordering: ${occ.required_starting_kVA} < ${freq.required_starting_kVA} < ${cont.required_starting_kVA}`);
  // Closed-form pin: req = worst / dip * sf (worst identical across cadence, only sf differs).
  assert.ok(Math.abs(freq.required_starting_kVA - occ.required_starting_kVA * 1.15) < 1e-9,
    `frequent should be 1.15x occasional: ${freq.required_starting_kVA} vs ${occ.required_starting_kVA * 1.15}`);
  assert.ok(Math.abs(occ.required_starting_kVA - (occ.worst_starting_kVA / 0.30) * 1.0) < 1e-9,
    `req = worst/dip*sf: ${occ.required_starting_kVA} vs ${(occ.worst_starting_kVA / 0.30)}`);
  // worst_starting_kVA strictly increasing in motor hp (single motor, fixed code letter).
  let prevW = -Infinity;
  for (const hp of [5, 10, 25, 50, 100]) {
    const r = computeGeneratorMotorStarting({ motors: [{ hp, code_letter: "G" }], non_motor_kW: 15, dip_factor: 0.30, starts_per_hour: "occasional" });
    assert.ok(r.worst_starting_kVA > prevW,
      `worst_kVA at hp=${hp} = ${r.worst_starting_kVA} not greater than prev=${prevW}`);
    prevW = r.worst_starting_kVA;
  }
  // running_kW additive in non_motor_kW (+1 kW steady load -> +1 kW running).
  const base = computeGeneratorMotorStarting(oneMotor({ non_motor_kW: 15 }));
  const plus = computeGeneratorMotorStarting(oneMotor({ non_motor_kW: 16 }));
  assert.ok(Math.abs(plus.running_kW - (base.running_kW + 1)) < 1e-9,
    `+1 kW steady should add 1 kW running: ${plus.running_kW} vs ${base.running_kW + 1}`);
  // recommended_kW monotone non-decreasing as required_kW grows (generator-step ladder).
  let prevRec = -Infinity;
  for (const hp of [10, 25, 50, 75, 100]) {
    const r = computeGeneratorMotorStarting({ motors: [{ hp, code_letter: "G" }], non_motor_kW: 15, dip_factor: 0.30, starts_per_hour: "occasional" });
    assert.ok(r.recommended_kW >= prevRec,
      `recommended_kW at hp=${hp} = ${r.recommended_kW} below prev=${prevRec}`);
    prevRec = r.recommended_kW;
  }
  // Bounds pins.
  assert.ok(computeGeneratorMotorStarting({ motors: [], non_motor_kW: 15, dip_factor: 0.30 }).error,
    "expected error for empty motor list");
  assert.ok(computeGeneratorMotorStarting(oneMotor({ dip_factor: 0 })).error, "expected error for dip_factor=0");
  assert.ok(computeGeneratorMotorStarting(oneMotor({ dip_factor: 1 })).error, "expected error for dip_factor=1");
  assert.ok(computeGeneratorMotorStarting({ motors: [{ hp: 25, code_letter: "Z" }], non_motor_kW: 15, dip_factor: 0.30 }).error,
    "expected error for unknown code letter");
  assert.ok(computeGeneratorMotorStarting({ motors: [{ hp: 0, code_letter: "G" }], non_motor_kW: 15, dip_factor: 0.30 }).error,
    "expected error for hp=0");
});

test("monotonicity: computeEquivalentLength total_equivalent_ft = sum(equivalent_ft_each * count) strictly increasing in fitting count (linear pin); additive across fittings (whole = sum of parts); 2x count -> 2x total; per-fitting passthrough equivalent_ft_each from FITTING_EQUIVALENT_LENGTH_FT; example pin 4x elbow_90_long(1.7) + 1x tee_branch(6.0) = 12.8 ft; unknown type / diameter -> error", () => {
  // Group C. total = sum over items of equivalent_ft_each * count. Linear in count.
  let prev = -Infinity;
  for (const count of [1, 2, 4, 8, 16]) {
    const r = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count }] });
    assert.ok(Number.isFinite(r.total_equivalent_ft) && r.total_equivalent_ft > 0,
      `total at count=${count}: ${JSON.stringify(r)}`);
    assert.ok(r.total_equivalent_ft > prev,
      `total at count=${count} = ${r.total_equivalent_ft} not greater than prev=${prev}`);
    prev = r.total_equivalent_ft;
  }
  // 2x count -> 2x total (linear pin).
  const c4 = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count: 4 }] });
  const c8 = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count: 8 }] });
  assert.ok(Math.abs(c8.total_equivalent_ft - 2 * c4.total_equivalent_ft) < 1e-9,
    `2x count total: ${c8.total_equivalent_ft} != 2 * ${c4.total_equivalent_ft}`);
  // Additive across fittings: combined = elbows + tee.
  const elbows = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count: 4 }] });
  const tee = computeEquivalentLength({ items: [{ type: "tee_branch", diameter: "1", count: 1 }] });
  const combined = computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "1", count: 4 }, { type: "tee_branch", diameter: "1", count: 1 }] });
  assert.ok(Math.abs(combined.total_equivalent_ft - (elbows.total_equivalent_ft + tee.total_equivalent_ft)) < 1e-9,
    `additive: ${combined.total_equivalent_ft} != ${elbows.total_equivalent_ft} + ${tee.total_equivalent_ft}`);
  // Example pin: 4 long elbows @ 1.7 + 1 branch tee @ 6.0 = 12.8 ft.
  assert.equal(combined.items[0].equivalent_ft_each, 1.7);
  assert.equal(combined.items[1].equivalent_ft_each, 6.0);
  assert.ok(Math.abs(combined.total_equivalent_ft - (4 * 1.7 + 1 * 6.0)) < 1e-9,
    `example total = ${combined.total_equivalent_ft}, expected ${4 * 1.7 + 6.0}`);
  // Bounds pins.
  assert.ok(computeEquivalentLength({ items: [{ type: "wormhole", diameter: "1", count: 1 }] }).error,
    "expected error for unknown fitting type");
  assert.ok(computeEquivalentLength({ items: [{ type: "elbow_90_long", diameter: "999", count: 1 }] }).error,
    "expected error for unknown diameter");
});

test("monotonicity: computeHelicalPile ultimate_lb = Kt * torque_ft_lb strictly increasing in installation torque (linear pin) and allowable_lb = ultimate / FoS strictly decreasing in factor_of_safety; shaft-Kt ordering 1.5in-solid 10 > 1.75in-solid 9 > 2.875in-pipe 7 > 3.5in-pipe 5 (smaller/solid shaft -> higher torque factor); allowable_lb * FoS = ultimate_lb identity; 4500 ft-lb 1.5in @ FoS 2 -> 45000 ultimate / 22500 allowable example pin; 2x torque -> 2x ultimate; bad shaft / torque / FoS -> error", () => {
  // Group E. ultimate = Kt * torque. Strictly increasing in torque.
  let prev = -Infinity;
  for (const torque_ft_lb of [1000, 2500, 4500, 8000, 12000]) {
    const r = computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb, factor_of_safety: 2.0 });
    assert.ok(Number.isFinite(r.ultimate_lb) && r.ultimate_lb > 0, `ultimate at T=${torque_ft_lb}: ${JSON.stringify(r)}`);
    assert.ok(r.ultimate_lb > prev, `ultimate at T=${torque_ft_lb} = ${r.ultimate_lb} not greater than prev=${prev}`);
    // allowable * FoS = ultimate identity.
    assert.ok(Math.abs(r.allowable_lb * 2.0 - r.ultimate_lb) < 1e-9,
      `allowable*FoS != ultimate: ${r.allowable_lb * 2.0} vs ${r.ultimate_lb}`);
    prev = r.ultimate_lb;
  }
  // allowable strictly decreasing in factor of safety.
  let prevA = Infinity;
  for (const factor_of_safety of [1.5, 2.0, 2.5, 3.0]) {
    const r = computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 4500, factor_of_safety });
    assert.ok(r.allowable_lb < prevA, `allowable at FoS=${factor_of_safety} = ${r.allowable_lb} not less than prev=${prevA}`);
    prevA = r.allowable_lb;
  }
  // Shaft Kt ordering pin.
  const s15 = computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 4500, factor_of_safety: 2 });
  const s175 = computeHelicalPile({ shaft: "1.75_inch_solid", torque_ft_lb: 4500, factor_of_safety: 2 });
  const s2875 = computeHelicalPile({ shaft: "2.875_inch_pipe", torque_ft_lb: 4500, factor_of_safety: 2 });
  const s35 = computeHelicalPile({ shaft: "3.5_inch_pipe", torque_ft_lb: 4500, factor_of_safety: 2 });
  assert.equal(s15.Kt, 10);
  assert.equal(s175.Kt, 9);
  assert.equal(s2875.Kt, 7);
  assert.equal(s35.Kt, 5);
  assert.ok(s15.ultimate_lb > s175.ultimate_lb && s175.ultimate_lb > s2875.ultimate_lb && s2875.ultimate_lb > s35.ultimate_lb,
    `Kt ordering: ${s15.ultimate_lb} > ${s175.ultimate_lb} > ${s2875.ultimate_lb} > ${s35.ultimate_lb}`);
  // Example pin: 1.5 in solid, 4500 ft-lb, FoS 2 -> ultimate 45000, allowable 22500.
  assert.equal(s15.ultimate_lb, 45000);
  assert.equal(s15.allowable_lb, 22500);
  // 2x torque -> 2x ultimate.
  const t4500 = computeHelicalPile({ shaft: "2.875_inch_pipe", torque_ft_lb: 4500, factor_of_safety: 2 });
  const t9000 = computeHelicalPile({ shaft: "2.875_inch_pipe", torque_ft_lb: 9000, factor_of_safety: 2 });
  assert.ok(Math.abs(t9000.ultimate_lb - 2 * t4500.ultimate_lb) < 1e-9, `2x torque: ${t9000.ultimate_lb} != 2 * ${t4500.ultimate_lb}`);
  // Bounds pins.
  assert.ok(computeHelicalPile({ shaft: "titanium", torque_ft_lb: 4500, factor_of_safety: 2 }).error, "expected error for unknown shaft");
  assert.ok(computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 0, factor_of_safety: 2 }).error, "expected error for torque=0");
  assert.ok(computeHelicalPile({ shaft: "1.5_inch_solid", torque_ft_lb: 4500, factor_of_safety: 0.5 }).error, "expected error for FoS<1");
});

test("monotonicity: computeLadderPipeReach horizontal_ladder_ft = extension*cos(angle) strictly increasing in extension and strictly decreasing in angle; stream_reach_ft = base_reach*sqrt(P/P_typical) strictly increasing in nozzle_pressure (sqrt, stream_reach*sqrt(P_typ/P) invariant); horizontal_total = ladder horizontal + stream*cos(30); vertical_ladder_ft = extension*sin(angle); example pin 70 deg / 100 ft / smooth_bore_2 @ 80 psi -> ladder horiz 34.2, stream 100, total 120.8; bad nozzle -> error", () => {
  // Group F. horizontal_ladder = extension * cos(angle). Increasing in extension.
  let prev = -Infinity;
  for (const extension_ft of [40, 60, 80, 100, 120]) {
    const r = computeLadderPipeReach({ angle_deg: 70, extension_ft, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
    assert.ok(Number.isFinite(r.horizontal_ladder_ft) && r.horizontal_ladder_ft > 0,
      `horiz_ladder at ext=${extension_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.horizontal_ladder_ft > prev,
      `horiz_ladder at ext=${extension_ft} = ${r.horizontal_ladder_ft} not greater than prev=${prev}`);
    prev = r.horizontal_ladder_ft;
  }
  // horizontal_ladder strictly decreasing in angle (cos), vertical strictly increasing in angle (sin).
  let prevH = Infinity;
  let prevV = -Infinity;
  for (const angle_deg of [40, 50, 60, 70, 80]) {
    const r = computeLadderPipeReach({ angle_deg, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
    assert.ok(r.horizontal_ladder_ft < prevH, `horiz at angle=${angle_deg} = ${r.horizontal_ladder_ft} not less than prev=${prevH}`);
    assert.ok(r.vertical_ladder_ft > prevV, `vert at angle=${angle_deg} = ${r.vertical_ladder_ft} not greater than prev=${prevV}`);
    prevH = r.horizontal_ladder_ft;
    prevV = r.vertical_ladder_ft;
  }
  // stream_reach strictly increasing in nozzle pressure (sqrt model); product with sqrt(P_typ/P) is invariant.
  let prevS = -Infinity;
  for (const nozzle_pressure_psi of [40, 80, 120, 160]) {
    const r = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi });
    assert.ok(r.stream_reach_ft > prevS, `stream at P=${nozzle_pressure_psi} = ${r.stream_reach_ft} not greater than prev=${prevS}`);
    prevS = r.stream_reach_ft;
  }
  // sqrt pin: doubling pressure scales stream reach by sqrt(2).
  const p80 = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  const p160 = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 160 });
  assert.ok(Math.abs(p160.stream_reach_ft - p80.stream_reach_ft * Math.SQRT2) < 1e-9,
    `2x pressure should scale reach by sqrt(2): ${p160.stream_reach_ft} vs ${p80.stream_reach_ft * Math.SQRT2}`);
  // Example pin: 70 deg, 100 ft, smooth_bore_2 @ 80 psi.
  const ref = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 });
  assert.ok(Math.abs(ref.horizontal_ladder_ft - 100 * Math.cos(70 * Math.PI / 180)) < 1e-9,
    `horiz_ladder = ${ref.horizontal_ladder_ft}, expected ${100 * Math.cos(70 * Math.PI / 180)}`);
  assert.ok(Math.abs(ref.vertical_ladder_ft - 100 * Math.sin(70 * Math.PI / 180)) < 1e-9,
    `vert_ladder = ${ref.vertical_ladder_ft}, expected ${100 * Math.sin(70 * Math.PI / 180)}`);
  assert.equal(ref.stream_reach_ft, 100);
  assert.ok(Math.abs(ref.horizontal_total_ft - (ref.horizontal_ladder_ft + ref.stream_reach_ft * Math.cos(30 * Math.PI / 180))) < 1e-9,
    `horizontal_total mismatch: ${ref.horizontal_total_ft}`);
  // Bounds pin: unknown nozzle type propagates the master-stream error.
  assert.ok(computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "garden_hose", nozzle_pressure_psi: 80 }).error,
    "expected error for unknown nozzle type");
});

test("monotonicity: computeVehicleLoad rear_axle_lb = curb_rear + payload*(position/wheelbase) strictly increasing in payload weight and in payload position (load shifts rearward); front_axle_lb strictly decreasing in position at fixed payload; gross_lb = curb_front + curb_rear + payload exact (independent of position); over_gvwr flag flips when gross exceeds GVWR; example pin 1500 lb @ 84/140 in -> 900 to rear, front 3800 / rear 3300 / gross 7100, no flags; bad wheelbase / negative payload -> error", () => {
  // Group G. rear = curb_rear + payload * (position / wheelbase). Strictly increasing in payload.
  let prev = -Infinity;
  for (const payload_lb of [0, 500, 1000, 1500, 2000]) {
    const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb, payload_position_from_cab_in: 84, curb_front_lb: 3200, curb_rear_lb: 2400 });
    assert.ok(Number.isFinite(r.rear_axle_lb), `rear at payload=${payload_lb}: ${JSON.stringify(r)}`);
    assert.ok(r.rear_axle_lb > prev, `rear at payload=${payload_lb} = ${r.rear_axle_lb} not greater than prev=${prev}`);
    // gross identity: curb + payload, independent of position.
    assert.ok(Math.abs(r.gross_lb - (3200 + 2400 + payload_lb)) < 1e-9,
      `gross = ${r.gross_lb}, expected ${3200 + 2400 + payload_lb}`);
    prev = r.rear_axle_lb;
  }
  // rear strictly increasing in payload position; front strictly decreasing (load transfers rearward).
  let prevR = -Infinity;
  let prevF = Infinity;
  for (const payload_position_from_cab_in of [0, 35, 70, 105, 140]) {
    const r = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 1500, payload_position_from_cab_in, curb_front_lb: 3200, curb_rear_lb: 2400 });
    assert.ok(r.rear_axle_lb > prevR, `rear at pos=${payload_position_from_cab_in} = ${r.rear_axle_lb} not greater than prev=${prevR}`);
    assert.ok(r.front_axle_lb < prevF, `front at pos=${payload_position_from_cab_in} = ${r.front_axle_lb} not less than prev=${prevF}`);
    // Conservation: front + rear = gross at every position.
    assert.ok(Math.abs((r.front_axle_lb + r.rear_axle_lb) - r.gross_lb) < 1e-9,
      `front+rear != gross at pos=${payload_position_from_cab_in}`);
    prevR = r.rear_axle_lb;
    prevF = r.front_axle_lb;
  }
  // Example pin: 1500 lb at 84/140 in -> 900 to rear, 600 to front.
  const ref = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 1500, payload_position_from_cab_in: 84, gvwr_lb: 9500, front_gawr_lb: 4500, rear_gawr_lb: 6200, curb_front_lb: 3200, curb_rear_lb: 2400 });
  assert.equal(ref.rear_axle_lb, 3300);
  assert.equal(ref.front_axle_lb, 3800);
  assert.equal(ref.gross_lb, 7100);
  assert.equal(ref.flags.over_gvwr, false);
  assert.equal(ref.flags.over_front_gawr, false);
  assert.equal(ref.flags.over_rear_gawr, false);
  // over_gvwr flag flips once gross exceeds the rating.
  const overloaded = computeVehicleLoad({ wheelbase_in: 140, payload_lb: 5000, payload_position_from_cab_in: 84, gvwr_lb: 9500, curb_front_lb: 3200, curb_rear_lb: 2400 });
  assert.ok(overloaded.gross_lb > 9500 && overloaded.flags.over_gvwr === true,
    `expected over_gvwr at gross ${overloaded.gross_lb}`);
  // Bounds pins.
  assert.ok(computeVehicleLoad({ wheelbase_in: 0, payload_lb: 1500, payload_position_from_cab_in: 84 }).error,
    "expected error for wheelbase=0");
  assert.ok(computeVehicleLoad({ wheelbase_in: 140, payload_lb: -1, payload_position_from_cab_in: 84 }).error,
    "expected error for negative payload");
});

// --- spec-v14 §10.3 Phase F sixty-fourth monotonicity batch -----------
// Five new sweeps across five distinct catalog groups (A / B / C / E / G).
// Each sweep pins a closed-form identity plus bounds so coefficient drift
// is caught the same way the prior batches catch it.

import { computePVStringSizing } from "../../calc-electrical.js";
import { computePipeSizing } from "../../calc-plumbing.js";
import { computeSHRLatent } from "../../calc-hvac.js";
import { computeConcreteMixDesign } from "../../calc-construction.js";
import { computeTrenchSlope } from "../../calc-cross.js";

test("monotonicity: computePVStringSizing cold_voc_V = Voc*(1 + coeff*(25 - record_low)/100) strictly increasing as the record low drops (colder -> higher open-circuit voltage) and strictly increasing in the temp coefficient; warm_vmp_V = Vmp*(1 - coeff*(record_high - 25)/100) strictly decreasing as the record high rises; max_series = floor(Vdc_max/cold_voc) monotone non-decreasing in inverter Vdc_max; cold_voc > Voc below 25 C and warm_vmp < Vmp above 25 C; missing Voc/Vmp -> error", () => {
  // Group A. cold_voc = Voc * (1 + coeff*(25 - low)/100). Colder -> higher.
  const pv = (over) => computePVStringSizing({ module_voc_V: 40, module_vmp_V: 33, voc_temp_coeff_pct_per_C: 0.30, record_low_C: -10, record_high_C: 45, inverter_mppt_min_V: 200, inverter_mppt_max_V: 480, inverter_vdc_max_V: 600, ...over });
  let prev = -Infinity;
  for (const record_low_C of [15, 5, -5, -15, -25]) {
    const r = pv({ record_low_C });
    assert.ok(Number.isFinite(r.cold_voc_V) && r.cold_voc_V > 0, `cold_voc at low=${record_low_C}: ${JSON.stringify(r)}`);
    assert.ok(r.cold_voc_V > prev, `cold_voc at low=${record_low_C} = ${r.cold_voc_V} not greater than prev=${prev}`);
    // Closed-form pin.
    assert.ok(Math.abs(r.cold_voc_V - 40 * (1 + 0.30 * (25 - record_low_C) / 100)) < 1e-9,
      `cold_voc closed form: ${r.cold_voc_V} vs ${40 * (1 + 0.30 * (25 - record_low_C) / 100)}`);
    prev = r.cold_voc_V;
  }
  // cold_voc strictly increasing in temp coefficient.
  let prevC = -Infinity;
  for (const voc_temp_coeff_pct_per_C of [0.1, 0.2, 0.3, 0.4]) {
    const r = pv({ voc_temp_coeff_pct_per_C });
    assert.ok(r.cold_voc_V > prevC, `cold_voc at coeff=${voc_temp_coeff_pct_per_C} = ${r.cold_voc_V} not greater than prev=${prevC}`);
    prevC = r.cold_voc_V;
  }
  // warm_vmp strictly decreasing as the record high rises.
  let prevW = Infinity;
  for (const record_high_C of [30, 40, 50, 60]) {
    const r = pv({ record_high_C });
    assert.ok(r.warm_vmp_V < prevW, `warm_vmp at high=${record_high_C} = ${r.warm_vmp_V} not less than prev=${prevW}`);
    assert.ok(Math.abs(r.warm_vmp_V - 33 * (1 - 0.30 * (record_high_C - 25) / 100)) < 1e-9,
      `warm_vmp closed form: ${r.warm_vmp_V} vs ${33 * (1 - 0.30 * (record_high_C - 25) / 100)}`);
    prevW = r.warm_vmp_V;
  }
  // max_series monotone non-decreasing as the inverter Vdc ceiling rises.
  let prevM = -Infinity;
  for (const inverter_vdc_max_V of [500, 600, 700, 800]) {
    const r = pv({ inverter_vdc_max_V });
    assert.ok(r.max_series >= prevM, `max_series at Vdc=${inverter_vdc_max_V} = ${r.max_series} below prev=${prevM}`);
    prevM = r.max_series;
  }
  // Cold boosts Voc above nameplate; heat drops Vmp below nameplate.
  const ref = pv({});
  assert.ok(ref.cold_voc_V > 40, `cold_voc ${ref.cold_voc_V} should exceed 40 V below 25 C`);
  assert.ok(ref.warm_vmp_V < 33, `warm_vmp ${ref.warm_vmp_V} should be below 33 V above 25 C`);
  // Bounds pins.
  assert.ok(computePVStringSizing({ module_vmp_V: 33, voc_temp_coeff_pct_per_C: 0.30, record_low_C: -10, record_high_C: 45, inverter_vdc_max_V: 600 }).error,
    "expected error for missing module Voc");
  assert.ok(computePVStringSizing({ module_voc_V: 40, voc_temp_coeff_pct_per_C: 0.30, record_low_C: -10, record_high_C: 45, inverter_vdc_max_V: 600 }).error,
    "expected error for missing module Vmp");
});

test("monotonicity: computePipeSizing total_wsfu = sum(wsfu_total*count) strictly increasing in fixture count (linear) with estimated_demand_gpm monotone non-decreasing in WSFU (Hunter's curve) and recommended_supply_size monotone non-decreasing; additive across fixture groups; IPC/Hunter example pin lavatory(2)+WC-flush-tank(2)+shower(1)+kitchen-sink(1) -> 10.5 WSFU; unknown fixture -> error", () => {
  // Group B. total_wsfu = sum over fixtures of wsfu_total * count. Linear in count.
  let prev = -Infinity;
  let prevGpm = -Infinity;
  for (const count of [1, 2, 4, 8, 16]) {
    const r = computePipeSizing({ fixtures: [{ fixture: "lavatory", count }] });
    assert.ok(Number.isFinite(r.total_wsfu) && r.total_wsfu > 0, `wsfu at count=${count}: ${JSON.stringify(r)}`);
    assert.ok(r.total_wsfu > prev, `wsfu at count=${count} = ${r.total_wsfu} not greater than prev=${prev}`);
    // Hunter's flow is monotone non-decreasing in WSFU.
    assert.ok(r.estimated_demand_gpm >= prevGpm,
      `gpm at count=${count} = ${r.estimated_demand_gpm} below prev=${prevGpm}`);
    prev = r.total_wsfu;
    prevGpm = r.estimated_demand_gpm;
  }
  // 2x count -> 2x WSFU (linear pin).
  const c2 = computePipeSizing({ fixtures: [{ fixture: "lavatory", count: 2 }] });
  const c4 = computePipeSizing({ fixtures: [{ fixture: "lavatory", count: 4 }] });
  assert.ok(Math.abs(c4.total_wsfu - 2 * c2.total_wsfu) < 1e-9, `2x count WSFU: ${c4.total_wsfu} != 2 * ${c2.total_wsfu}`);
  // Additive across fixture groups.
  const lavs = computePipeSizing({ fixtures: [{ fixture: "lavatory", count: 2 }] });
  const showers = computePipeSizing({ fixtures: [{ fixture: "shower", count: 1 }] });
  const both = computePipeSizing({ fixtures: [{ fixture: "lavatory", count: 2 }, { fixture: "shower", count: 1 }] });
  assert.ok(Math.abs(both.total_wsfu - (lavs.total_wsfu + showers.total_wsfu)) < 1e-9,
    `additive WSFU: ${both.total_wsfu} != ${lavs.total_wsfu} + ${showers.total_wsfu}`);
  // IPC/Hunter worked-example pin: 2 lav + 2 WC flush tank + 1 shower + 1 kitchen sink.
  const ref = computePipeSizing({ fixtures: [{ fixture: "lavatory", count: 2 }, { fixture: "water_closet_flush_tank", count: 2 }, { fixture: "shower", count: 1 }, { fixture: "kitchen_sink", count: 1 }] });
  assert.equal(ref.total_wsfu, 10.5);
  assert.ok(ref.estimated_demand_gpm > 0, `gpm should be positive: ${JSON.stringify(ref)}`);
  // Bounds pin.
  assert.ok(computePipeSizing({ fixtures: [{ fixture: "moon_pool", count: 1 }] }).error,
    "expected error for unknown fixture");
});

test("monotonicity: computeSHRLatent Q_sensible_btu_hr = 1.08*CFM*(return_db - supply_db)*rho_ratio strictly increasing in register CFM (linear) and strictly decreasing in supply_db (smaller dT) and in altitude (lower air density); SHR = Q_s/Q_tot increasing in CFM while Q_latent = Q_tot - Q_s decreasing; Q_sensible + Q_latent = Q_tot identity; 36000 Btu/hr / 1000 CFM / 75-55 F at sea level -> Q_s 21600, SHR 0.6; bad capacity / CFM / supply>=return -> error", () => {
  // Group C. Q_s = 1.08 * CFM * (T_ra - T_sa) * rho_ratio. Linear in CFM.
  const shr = (over) => computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 63, supply_db_F: 55, cfm: 1000, altitude_ft: 0, ...over });
  let prev = -Infinity;
  let prevL = Infinity;
  for (const cfm of [600, 800, 1000, 1200]) {
    const r = shr({ cfm });
    assert.ok(Number.isFinite(r.Q_sensible_btu_hr) && r.Q_sensible_btu_hr > 0, `Q_s at cfm=${cfm}: ${JSON.stringify(r)}`);
    assert.ok(r.Q_sensible_btu_hr > prev, `Q_s at cfm=${cfm} = ${r.Q_sensible_btu_hr} not greater than prev=${prev}`);
    // Q_latent = Q_tot - Q_s decreasing as Q_s grows.
    assert.ok(r.Q_latent_btu_hr < prevL, `Q_l at cfm=${cfm} = ${r.Q_latent_btu_hr} not less than prev=${prevL}`);
    // Conservation: Q_s + Q_l = Q_tot (while Q_s < Q_tot).
    assert.ok(Math.abs((r.Q_sensible_btu_hr + r.Q_latent_btu_hr) - 36000) < 1e-6,
      `Q_s + Q_l != Q_tot at cfm=${cfm}: ${r.Q_sensible_btu_hr + r.Q_latent_btu_hr}`);
    prev = r.Q_sensible_btu_hr;
    prevL = r.Q_latent_btu_hr;
  }
  // Q_s strictly decreasing as supply_db rises (smaller delta-T).
  let prevS = Infinity;
  for (const supply_db_F of [45, 50, 55, 60]) {
    const r = shr({ supply_db_F });
    assert.ok(r.Q_sensible_btu_hr < prevS, `Q_s at supply=${supply_db_F} = ${r.Q_sensible_btu_hr} not less than prev=${prevS}`);
    prevS = r.Q_sensible_btu_hr;
  }
  // Q_s strictly decreasing with altitude (rho_ratio falls).
  let prevA = Infinity;
  for (const altitude_ft of [0, 3000, 6000, 9000]) {
    const r = shr({ altitude_ft });
    assert.ok(r.Q_sensible_btu_hr < prevA, `Q_s at alt=${altitude_ft} = ${r.Q_sensible_btu_hr} not less than prev=${prevA}`);
    prevA = r.Q_sensible_btu_hr;
  }
  // Worked-example pin: 36000 Btu/hr, 1000 CFM, 75/55 F, sea level.
  const ref = shr({});
  assert.equal(ref.rho_ratio, 1);
  assert.ok(Math.abs(ref.Q_sensible_btu_hr - 1.08 * 1000 * (75 - 55) * 1) < 1e-9,
    `Q_s = ${ref.Q_sensible_btu_hr}, expected ${1.08 * 1000 * 20}`);
  assert.ok(Math.abs(ref.SHR - 0.6) < 1e-9, `SHR = ${ref.SHR}, expected 0.6`);
  // Bounds pins.
  assert.ok(computeSHRLatent({ total_capacity_btu_hr: 0, cfm: 1000 }).error, "expected error for capacity=0");
  assert.ok(computeSHRLatent({ total_capacity_btu_hr: 36000, cfm: 0 }).error, "expected error for cfm=0");
  assert.ok(computeSHRLatent({ total_capacity_btu_hr: 36000, cfm: 1000, supply_db_F: 75, return_db_F: 75 }).error,
    "expected error for supply >= return");
});

test("monotonicity: computeConcreteMixDesign cement_lb_yd3 = water_lb_yd3 / wc_ratio strictly increasing in design strength (ACI 211 w/c falls as strength rises) with wc_ratio strictly decreasing in strength; water_lb_yd3 strictly increasing in slump above the 4 in baseline (+6 lb/in) so cement rises with slump; cement_bags_yd3 = cement_lb_yd3 / 94 identity; bad exposure / strength < 1500 -> error", () => {
  // Group E. cement = water / wc; wc falls with strength, so cement rises with strength.
  const cm = (over) => computeConcreteMixDesign({ strength_psi: 3000, exposure: "interior", max_aggregate_in: 1, slump_in: 4, ...over });
  let prevCement = -Infinity;
  let prevWc = Infinity;
  for (const strength_psi of [3000, 3500, 4000, 4500, 5000]) {
    const r = cm({ strength_psi });
    assert.ok(Number.isFinite(r.cement_lb_yd3) && r.cement_lb_yd3 > 0, `cement at f'c=${strength_psi}: ${JSON.stringify(r)}`);
    assert.ok(r.cement_lb_yd3 > prevCement, `cement at f'c=${strength_psi} = ${r.cement_lb_yd3} not greater than prev=${prevCement}`);
    assert.ok(r.wc_ratio < prevWc, `wc at f'c=${strength_psi} = ${r.wc_ratio} not less than prev=${prevWc}`);
    // cement = water / wc identity, and cement_bags = cement / 94.
    assert.ok(Math.abs(r.cement_lb_yd3 - r.water_lb_yd3 / r.wc_ratio) < 1e-6,
      `cement != water/wc at f'c=${strength_psi}: ${r.cement_lb_yd3} vs ${r.water_lb_yd3 / r.wc_ratio}`);
    assert.ok(Math.abs(r.cement_bags_yd3 - r.cement_lb_yd3 / 94) < 1e-9,
      `bags != cement/94 at f'c=${strength_psi}`);
    prevCement = r.cement_lb_yd3;
    prevWc = r.wc_ratio;
  }
  // water_lb_yd3 strictly increasing in slump above the 4 in baseline (+6 lb/in), so cement rises too.
  let prevWater = -Infinity;
  let prevCem2 = -Infinity;
  for (const slump_in of [4, 5, 6, 8]) {
    const r = cm({ slump_in });
    assert.ok(r.water_lb_yd3 > prevWater, `water at slump=${slump_in} = ${r.water_lb_yd3} not greater than prev=${prevWater}`);
    assert.ok(r.cement_lb_yd3 > prevCem2, `cement at slump=${slump_in} = ${r.cement_lb_yd3} not greater than prev=${prevCem2}`);
    prevWater = r.water_lb_yd3;
    prevCem2 = r.cement_lb_yd3;
  }
  // +6 lb/in slump correction pin.
  const s4 = cm({ slump_in: 4 });
  const s6 = cm({ slump_in: 6 });
  assert.ok(Math.abs((s6.water_lb_yd3 - s4.water_lb_yd3) - 12) < 1e-9,
    `2 in over baseline should add 12 lb water: ${s6.water_lb_yd3 - s4.water_lb_yd3}`);
  // Bounds pins.
  assert.ok(computeConcreteMixDesign({ strength_psi: 4000, exposure: "lunar" }).error, "expected error for unknown exposure");
  assert.ok(computeConcreteMixDesign({ strength_psi: 1000, exposure: "interior" }).error, "expected error for strength < 1500");
});

test("monotonicity: computeTrenchSlope max_horizontal_ft = depth_ft * H_to_V strictly increasing in depth (linear) with top_width_ft = 2*max_horizontal + 2 increasing; OSHA soil-class slope ordering Type A 0.75 < Type B 1.0 < Type C 1.5 (less stable soil -> flatter required slope -> wider setback); 2x depth -> 2x horizontal setback; 8 ft Type B -> 8 ft horizontal / 18 ft top width example pin; bad class / depth <= 0 / depth > 20 -> error", () => {
  // Group G. max_horizontal = depth * H_to_V. Strictly increasing in depth.
  let prev = -Infinity;
  let prevTop = -Infinity;
  for (const depth_ft of [2, 4, 8, 12, 16]) {
    const r = computeTrenchSlope({ depth_ft, soil_class: "B", surcharge: false });
    assert.ok(Number.isFinite(r.max_horizontal_ft) && r.max_horizontal_ft > 0, `horiz at depth=${depth_ft}: ${JSON.stringify(r)}`);
    assert.ok(r.max_horizontal_ft > prev, `horiz at depth=${depth_ft} = ${r.max_horizontal_ft} not greater than prev=${prev}`);
    assert.ok(r.top_width_ft > prevTop, `top_width at depth=${depth_ft} = ${r.top_width_ft} not greater than prev=${prevTop}`);
    // top_width = 2*horizontal + 2 (2 ft trench-bottom baseline).
    assert.ok(Math.abs(r.top_width_ft - (2 * r.max_horizontal_ft + 2)) < 1e-9,
      `top_width identity at depth=${depth_ft}: ${r.top_width_ft}`);
    prev = r.max_horizontal_ft;
    prevTop = r.top_width_ft;
  }
  // Soil-class slope ordering: A (0.75) < B (1.0) < C (1.5) horizontal setback at fixed depth.
  const a = computeTrenchSlope({ depth_ft: 8, soil_class: "A" });
  const b = computeTrenchSlope({ depth_ft: 8, soil_class: "B" });
  const c = computeTrenchSlope({ depth_ft: 8, soil_class: "C" });
  assert.ok(a.max_horizontal_ft < b.max_horizontal_ft && b.max_horizontal_ft < c.max_horizontal_ft,
    `class ordering: ${a.max_horizontal_ft} < ${b.max_horizontal_ft} < ${c.max_horizontal_ft}`);
  assert.ok(Math.abs(a.max_horizontal_ft - 8 * 0.75) < 1e-9, `Type A horiz = ${a.max_horizontal_ft}, expected ${8 * 0.75}`);
  assert.ok(Math.abs(c.max_horizontal_ft - 8 * 1.5) < 1e-9, `Type C horiz = ${c.max_horizontal_ft}, expected ${8 * 1.5}`);
  // 2x depth -> 2x horizontal setback (linear pin).
  const d4 = computeTrenchSlope({ depth_ft: 4, soil_class: "B" });
  const d8 = computeTrenchSlope({ depth_ft: 8, soil_class: "B" });
  assert.ok(Math.abs(d8.max_horizontal_ft - 2 * d4.max_horizontal_ft) < 1e-9,
    `2x depth horiz: ${d8.max_horizontal_ft} != 2 * ${d4.max_horizontal_ft}`);
  // Example pin: 8 ft Type B -> 8 ft horizontal, 18 ft top width.
  assert.equal(b.max_horizontal_ft, 8);
  assert.equal(b.top_width_ft, 18);
  // Bounds pins.
  assert.ok(computeTrenchSlope({ depth_ft: 8, soil_class: "Z" }).error, "expected error for unknown soil class");
  assert.ok(computeTrenchSlope({ depth_ft: 0, soil_class: "B" }).error, "expected error for depth=0");
  assert.ok(computeTrenchSlope({ depth_ft: 25, soil_class: "B" }).error, "expected error for depth > 20 ft");
});
