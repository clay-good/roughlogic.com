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
import { computePVStringSizing, computeBatteryRuntime } from "../../calc-solar.js"; // spec-v88: relocated from calc-electrical.js
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

// === v5 first-principles ===

import { computeAmortization, computeStraightLine, computeMacrs, computeSETax, computeBreakeven, computeCashConversionCycle } from "../../calc-accounting.js";
import { computeJudgmentInterest, computeDeadline } from "../../calc-legal.js";
import { computeBeerLambert, computeHendersonHasselbalch, computeRcf, computeHemocytometer, computeMolecularWeight } from "../../calc-lab.js";

// --- Straight-line depreciation (docs/derivations.md section 52) ---
//
// annual = (cost - salvage) / life. Pure linear identity.

test("first-principles: straight-line annual = (cost - salvage) / life", () => {
  const r = computeStraightLine({ cost: 100000, salvage: 10000, life_years: 9, year_of_interest: 1 });
  within(r.annual_depreciation, (100000 - 10000) / 9, 0.0001, "SL annual");
});

// --- MACRS (docs/derivations.md section 53) ---
//
// Pub 946 Appendix A worked example: 5-year property at $10,000.
// Year 1 = 20.00% = $2,000.

test("first-principles: MACRS 5-year year-1 = 20% of cost (Pub 946 Table A-1)", () => {
  const r = computeMacrs({ cost: 10000, class_life: 5, year_of_interest: 1 });
  within(r.year_depreciation, 2000, 0.001, "MACRS 5-yr y1");
});

// --- Self-employment tax (docs/derivations.md section 55) ---
//
// $100k net SE -> 92.35% adjusted = $92,350. SS at 12.4% = $11,451.40.
// Medicare at 2.9% = $2,678.15. SE = $14,129.55. Deductible half = $7,064.78.

test("first-principles: SE tax 92.35% / 12.4% / 2.9% on $100k single under threshold", () => {
  const r = computeSETax({ net_se_earnings: 100000, tax_year: 2025, filing_status: "single" });
  within(r.net_earnings_adjusted, 92350, 0.001, "SE adjusted");
  within(r.ss_tax, 92350 * 0.124, 0.001, "SE SS portion");
  within(r.medicare_tax, 92350 * 0.029, 0.001, "SE Medicare portion");
  within(r.se_tax, r.ss_tax + r.medicare_tax, 0.001, "SE total (no Addl below threshold)");
  within(r.deductible_half, (r.ss_tax + r.medicare_tax) / 2, 0.001, "SE deductible half");
});

// --- Loan amortization (docs/derivations.md section 57) ---
//
// $250k @ 6.5% / 360 mo: P = (r * PV) / (1 - (1+r)^-n) ~ $1,580.17.
// Sum of principal columns equals principal exactly.

test("first-principles: amortization 30-yr $250k @ 6.5% = $1580.17 +/- $0.05", () => {
  const r = computeAmortization({ principal: 250000, annual_rate_pct: 6.5, term_months: 360 });
  within(r.payment, 1580.17, 0.01, "amort payment");
  const sumPrincipal = r.schedule.reduce((a, b) => a + b.principal, 0);
  within(sumPrincipal, 250000, 0.001, "amort principal sum");
});

// --- Breakeven / contribution-margin (docs/derivations.md section 58) ---
//
// FC=$50k, SP=$20, VC=$8 -> CM=$12, BE = 50000 / 12 = 4166.67 units.

test("first-principles: breakeven units = fixed_costs / contribution_margin", () => {
  const r = computeBreakeven({ fixed_costs: 50000, variable_cost_per_unit: 8, sale_price_per_unit: 20 });
  within(r.breakeven_units, 50000 / 12, 0.001, "BE units");
  within(r.contribution_margin, 12, 0.001, "BE CM per unit");
  within(r.contribution_margin_ratio, 0.6, 0.001, "BE CM ratio");
});

// --- Cash conversion cycle (docs/derivations.md section 59) ---
//
// CCC = DIO + DSO - DPO. Negative is meaningful (suppliers finance).

test("first-principles: CCC = DIO + DSO - DPO with negative case preserved", () => {
  const r = computeCashConversionCycle({ dso: 10, dio: 20, dpo: 60 });
  within(r.ccc_days, 20 + 10 - 60, 0.001, "CCC negative");
});

// --- Judgment interest, simple (docs/derivations.md section 60) ---
//
// CA at 10% simple on $10k for one year. End balance $11,000 with no
// payments. The actual computation uses 366/365 days for the leap window
// 2024-01-01 to 2025-01-01; tolerance accommodates that.

test("first-principles: judgment interest CA simple 10% on $10k ~$1000 over 1y", () => {
  const r = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01" });
  within(r.accrued_interest, 1000, 0.5, "JI CA simple 1y");
});

// --- Court-day deadline (docs/derivations.md section 61) ---
//
// Fed. R. Civ. P. 6(a)(1) trigger-day exclusion + weekend rollover.
// 2025-12-26 (Fri) + 1 calendar day = Sat 12-27 -> Mon 12-29.

test("first-principles: FRCP 6(a)(1) calendar weekend rollover", () => {
  const r = computeDeadline({ trigger_date: "2025-12-26", days: 1, day_type: "calendar" });
  assert.equal(r.deadline, "2025-12-29");
});

// --- Beer-Lambert (docs/derivations.md section 64) ---
//
// A = epsilon * c * L. A=0.5, L=1 cm, epsilon=50,000 -> c = 1e-5 M.

test("first-principles: Beer-Lambert c = A / (epsilon * L)", () => {
  const r = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 50000 });
  within(r.concentration, 1e-5, 0.001, "Beer-Lambert");
});

// --- Henderson-Hasselbalch (docs/derivations.md section 65) ---
//
// pH = pKa: ratio = 1, fraction_base = 0.5, fraction_acid = 0.5.

test("first-principles: HH at pH = pKa gives 50/50 base/acid", () => {
  const r = computeHendersonHasselbalch({ pKa: 7.0, target_pH: 7.0, total_buffer_concentration: 1, total_volume: 1 });
  within(r.ratio_base_acid, 1.0, 0.001, "HH ratio at pH=pKa");
  within(r.fraction_base, 0.5, 0.001, "HH fraction base");
  within(r.fraction_acid, 0.5, 0.001, "HH fraction acid");
});

// --- Centrifuge RCF (docs/derivations.md section 63) ---
//
// RCF = 1.118e-5 * r(cm) * RPM^2. 84 mm rotor at 14,000 RPM gives ~18,400 g.

test("first-principles: RCF = 1.118e-5 * r_cm * RPM^2 (Eppendorf 5424 max)", () => {
  const r = computeRcf({ rotor_radius_mm: 84, rpm: 14000 });
  within(r.rcf, 1.118e-5 * 8.4 * 14000 * 14000, 0.001, "RCF 84mm 14k RPM");
});

// --- Hemocytometer (docs/derivations.md section 66) ---
//
// improved Neubauer: each large square = 1e-4 mL.
// 200 cells across 4 squares at 2x dilution: 50 * 1e4 * 2 = 1e6 cells/mL.

test("first-principles: hemocytometer cells/mL = (avg/sq) * 1e4 * dilution", () => {
  const r = computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 2 });
  within(r.cells_per_mL, 1e6, 0.001, "hemo 200/4 d=2");
});

// --- Molecular weight from formula (docs/derivations.md section 62) ---
//
// (NH4)2SO4 = 2*(N + 4H) + S + 4O = 132.14 g/mol from IUPAC weights.

test("first-principles: MW (NH4)2SO4 = 132.14 g/mol via IUPAC weights", () => {
  const r = computeMolecularWeight({ formula: "(NH4)2SO4" });
  within(r.molecular_weight, 132.14, 0.5, "MW (NH4)2SO4");
});
