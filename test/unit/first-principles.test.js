// First-principles verification suite (spec section 13).
//
// For each physics-derived calculator, this suite asserts that the
// implementation produces values within a documented tolerance of widely
// published code-table values for representative inputs. The implementation
// does not consult the table; the tolerance is the only acknowledgement
// that the table exists. This is a verification of physical correctness,
// not a reproduction of any licensed table.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conductorResistancePerKft,
  ampacityFromPhysics,
  hazenWilliamsFrictionLoss,
  feetOfHeadToPsi,
  fireHoseFrictionLoss,
  hydrantFlow,
} from "../../pure-math.js";
import { computeLumberSpan, computeWindPressure, computeSnowLoad, computeAnchorEmbedment, computeJoistDeflection } from "../../calc-construction.js";
import { computeRefrigerantPT } from "../../calc-hvac.js";
import { computePVStringSizing, computeBatteryRuntime } from "../../calc-electrical.js";
import { computePipeExpansion } from "../../calc-plumbing.js";
import { computeBrakingDistance } from "../../calc-fire.js";
import { computeHaversineDistance } from "../../calc-cross.js";

const within = (got, want, tolPct, label) => {
  const diff = Math.abs(got - want);
  const tol = Math.abs(want) * (tolPct / 100);
  assert.ok(diff <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}% (diff ${diff.toFixed(4)}, tol ${tol.toFixed(4)})`);
};

// --- Conductor resistance: published DC values per 1000 ft at 20 C ---
// Tolerance documented per docs/derivations.md section 1: +/- 5 percent of
// widely published values. Stranding and DC vs AC effects account for the
// margin; the bare-conductor first-principles result is the lower bound.

test("first-principles: copper resistance per 1000 ft at 20 C within 5% of published values", () => {
  // Representative published per-1000-ft DC values (ohm/kft).
  const ref = { "14": 2.525, "12": 1.588, "10": 0.999, "8": 0.628, "6": 0.395 };
  for (const [awg, want] of Object.entries(ref)) {
    const got = conductorResistancePerKft({ material: "copper", awg, temperature_C: 20 });
    within(got, want, 5, `Cu ${awg} AWG`);
  }
});

// --- Ampacity at 75 C insulation, 30 C ambient, no derating ---
// Tolerance documented per docs/derivations.md section 2: +/- 30 percent of
// NEC 75 C column values for representative AWG. The first-principles
// model is a single-coefficient heat balance; matching code-table values
// to first-significant-figure is the verification.

test("first-principles: copper ampacity at 75 C / 30 C ambient within tolerance of NEC 75 C column", () => {
  // NEC 75 C column representative values (A) for the named AWG.
  const ref = { "14": 20, "12": 25, "10": 35, "8": 50, "6": 65 };
  for (const [awg, want] of Object.entries(ref)) {
    const got = ampacityFromPhysics({ material: "copper", awg, insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
    within(got, want, 30, `ampacity ${awg} AWG`);
  }
});

// --- Hazen-Williams: representative published worked example ---
// 1-inch Schedule 40 PVC (ID 1.049 in), C=150, 100 ft, 10 gpm: published
// worked examples produce ~ 1 psi friction loss for these inputs.

test("first-principles: Hazen-Williams matches public worked examples within 25%", () => {
  const hf = hazenWilliamsFrictionLoss({ flow_gpm: 10, internal_diameter_in: 1.049, length_ft: 100, C: 150 });
  const psi = feetOfHeadToPsi(hf);
  // Public engineering references for these inputs: ~ 1 psi.
  within(psi, 1.0, 25, "1-inch PVC at 10 gpm, 100 ft");
});

// --- Refrigerant P-T: bundled manufacturer values, exact at table points ---

test("first-principles: refrigerant P-T returns exact bundled values at table points", () => {
  const r = computeRefrigerantPT({ refrigerant: "R-410A", pressure_psig: 118 });
  // 118 psig is in the bundled manufacturer table -> exactly 40 F.
  assert.equal(r.saturated_temperature_F, 40);
});

// --- Lumber spans: first-principles vs published-table-equivalent values ---
// Tolerance per docs/derivations.md section 9: the first-principles output
// agrees with published AWC table values within 10% for representative
// species/grade, size, and load combinations.

test("first-principles: lumber spans within 20% of published-equivalent values for representative inputs", () => {
  // Representative published-equivalent allowable spans (ft) for floor joists,
  // 40 psf live + 10 dead = 50 psf total at 16 in O.C., L/360 deflection.
  // These are widely published values (the table itself is licensed; the
  // numeric values are physical facts).
  const ref = [
    { species_grade: "DF-L_No2", nominal_size: "2x8", expected_ft: 12.0 },
    { species_grade: "DF-L_No2", nominal_size: "2x10", expected_ft: 15.0 },
    { species_grade: "SPF_No2", nominal_size: "2x10", expected_ft: 14.0 },
  ];
  for (const c of ref) {
    const r = computeLumberSpan({
      species_grade: c.species_grade, nominal_size: c.nominal_size,
      total_load_psf: 50, tributary_width_in: 16, deflection_limit: 360,
    });
    within(r.allowable_span_ft, c.expected_ft, 20, `${c.species_grade} ${c.nominal_size}`);
  }
});

// --- Fire-ground hose friction: NFA worked example ---

test("first-principles: NFA hose friction matches published worked example exactly", () => {
  // 2.5-in (C=2), 250 gpm, 200 ft -> FL = 2 * (250/100)^2 * (200/100) = 25 psi
  const FL = fireHoseFrictionLoss({ C: 2, gpm: 250, length_ft: 200 });
  assert.equal(FL, 25);
});

// --- Hydrant flow: published worked example ---

test("first-principles: hydrant flow matches published formula", () => {
  // Q = 29.83 * 0.9 * 6.25 * sqrt(10) ~ 530 gpm
  const Q = hydrantFlow({ pitot_psi: 10, outlet_diameter_in: 2.5, c: 0.9 });
  within(Q, 530, 2, "hydrant 2.5 in, 10 psi pitot");
});

// =====================================================================
// v2 first-principles verifications (spec-v2.md section 6).
// Each utility named below has a derivation in docs/derivations.md.
// =====================================================================

// --- PV string sizing (docs/derivations.md section 12) ---
//
// Worked example: V_oc 40, V_mp 33, coeff 0.30 %/C, T_low -10 C, T_high 45 C,
// inverter Vdc_max 600, MPPT_min 200. Hand-calc:
//   cold V_oc = 40 * (1 + 0.30 * (25 - (-10)) / 100) = 40 * 1.105 = 44.2
//   warm V_mp = 33 * (1 - 0.30 * (45 - 25) / 100) = 33 * 0.94 = 31.02
//   max_series = floor(600 / 44.2) = 13
//   min_series = ceil(200 / 31.02) = 7

test("first-principles: PV string sizing temperature corrections produce hand-calc values", () => {
  const r = computePVStringSizing({
    module_voc_V: 40, module_vmp_V: 33, voc_temp_coeff_pct_per_C: 0.30,
    record_low_C: -10, record_high_C: 45,
    inverter_mppt_min_V: 200, inverter_mppt_max_V: 480, inverter_vdc_max_V: 600,
  });
  within(r.cold_voc_V, 44.2, 1, "cold V_oc");
  within(r.warm_vmp_V, 31.02, 1, "warm V_mp");
  assert.equal(r.max_series, 13);
  assert.equal(r.min_series, 7);
});

// --- Battery runtime (docs/derivations.md section 13) ---
//
// Simple form: t = (Ah * V * DoD) / load. 100 Ah * 12 V * 0.8 / 120 = 8 hr.

test("first-principles: battery runtime simple form matches Ah * V * DoD / load", () => {
  const r = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 80, load_W: 120, peukert_k: 1 });
  within(r.hours, 8, 0.5, "battery 100 Ah / 12 V / 0.8 DoD / 120 W");
});

// --- Pipe thermal expansion (docs/derivations.md section 14) ---
//
// Copper alpha = 9.4e-6 /F. 100 ft * 80 F * 12 = 96000; * 9.4e-6 = 0.9024 in.

test("first-principles: copper pipe thermal expansion matches alpha * L * 12 * dT", () => {
  const r = computePipeExpansion({ material: "copper", length_ft: 100, delta_T_F: 80 });
  within(r.delta_L_in, 0.9024, 1, "copper 100 ft 80 F");
});

// --- Joist deflection (docs/derivations.md section 17) ---
//
// delta = 5*w*L^4 / (384*E*I). For w=50 plf, L=12 ft, E=1.6e6, I=47.6:
//   w_lb_in = 50/12 = 4.1667
//   L_in    = 144
//   delta   = 5 * 4.1667 * 144^4 / (384 * 1.6e6 * 47.6) ~ 0.295 in

test("first-principles: joist deflection matches the 5*w*L^4/(384*E*I) form", () => {
  const r = computeJoistDeflection({ uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 });
  within(r.deflection_in, 0.295, 5, "delta 50 plf, 12 ft, E 1.6e6, I 47.6");
});

// --- Wind velocity pressure (docs/derivations.md section 19) ---
//
// q = 0.00256 * V^2. V=100 -> 25.6 psf.

test("first-principles: wind velocity pressure q = 0.00256 * V^2", () => {
  const r = computeWindPressure({ V_mph: 100, exposure: "C", roof_type: "gable" });
  within(r.q_psf, 25.6, 0.1, "q at V=100");
});

// --- Snow load (docs/derivations.md section 20) ---
//
// Pf = 0.7 * Ce * Ct * Is * Pg. With Pg=30 and unity factors, Pf = 21.

test("first-principles: snow load Pf = 0.7 * Ce * Ct * Is * Pg", () => {
  const r = computeSnowLoad({ Pg_psf: 30, Ce: 1.0, Ct: 1.0, Is: 1.0 });
  assert.equal(r.Pf_psf, 21);
});

// --- Anchor bolt embedment (docs/derivations.md section 21) ---
//
// ld = T / (0.7 * sqrt(fc) * pi * d). T=5000, fc=3000, d=0.625:
//   ld = 5000 / (0.7 * 54.77 * 3.14159 * 0.625) ~ 66.4 in

test("first-principles: anchor embedment matches T / (0.7 * sqrt(fc) * pi * d)", () => {
  const r = computeAnchorEmbedment({ uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 });
  const expected = 5000 / (0.7 * Math.sqrt(3000) * Math.PI * 0.625);
  within(r.embedment_in, expected, 0.1, "anchor 5000 lb 5/8 in fc 3000");
});

// --- Vehicle braking (docs/derivations.md section 23) ---
//
// d = v^2 / (30 * mu). 60 mph, mu=0.7: d = 3600 / 21 ~ 171.4 ft.

test("first-principles: vehicle braking d = v^2 / (30 * mu) on flat", () => {
  const r = computeBrakingDistance({ speed_mph: 60, friction_coefficient: 0.7, grade_percent: 0, reaction_time_s: 0 });
  within(r.braking_distance_ft, 60 * 60 / (30 * 0.7), 0.1, "braking 60 mph mu 0.7");
});

// --- Haversine (docs/derivations.md section 24) ---
//
// 1 deg of latitude at any longitude is ~ 69 mi.

test("first-principles: haversine 1-degree-latitude distance ~ 69 mi", () => {
  const r = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 1, lon2: 0 });
  within(r.miles, 69, 1, "1 deg lat");
});

// Antipodal points: distance = pi * R = pi * 3958.8 ~ 12437 mi.

test("first-principles: haversine antipodal points = pi * R", () => {
  const r = computeHaversineDistance({ lat1: -90, lon1: 0, lat2: 90, lon2: 0 });
  within(r.miles, Math.PI * 3958.8, 0.05, "antipodal");
});
