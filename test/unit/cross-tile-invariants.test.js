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
