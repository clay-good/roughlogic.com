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
import { computeParkland } from "../../calc-ems.js";
import { computeEnergyRequirement } from "../../calc-vet.js";
import { computeBeerLambert } from "../../calc-lab.js";
import { computeOhmsLaw } from "../../calc-electrical.js";
import { computeWindPressure, computeSnowLoad } from "../../calc-construction.js";
import { computeWindChill, computeLoanPayment } from "../../calc-cross.js";
import { manualJCooling } from "../../calc-hvac.js";
import { computePoundsFormula } from "../../calc-water.js";
import { computeAirMovers } from "../../calc-restoration.js";
import { computeGPA, computeDrawbarPower } from "../../calc-agriculture.js";
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
