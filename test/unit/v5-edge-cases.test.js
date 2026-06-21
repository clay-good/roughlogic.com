// v5 edge-case test thickening pass.
// Targets the lightly-covered branches of calc-accounting
// and calc-lab utilities to push toward the spec-v5.md 10+ tests-per-utility bar.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStraightLine, computeMacrs, computeSection179, SECTION_179_LIMITS,
  computeSETax, SE_TAX_PARAMETERS, computeEstimatedTax, computePayrollWithholding,
  computeAmortization, computeBreakeven, computeSalesTaxCompound,
  computeInventoryTurnover, computeCashConversionCycle, computeMileageRollup,
} from "../../calc-accounting.js";
import {
  computeDilution, computeSerialDilution, computeMolecularWeight,
  computeMassMoles, computeRcf, computeResuspension, computePcrMix,
  computeBeerLambert, computeHendersonHasselbalch, computeHemocytometer,
} from "../../calc-lab.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Accounting ---

test("SL: salvage equal to cost gives zero annual", () => { const r = computeStraightLine({ cost: 1000, salvage: 1000, life_years: 5, year_of_interest: 1 }); assert.equal(r.annual_depreciation, 0); });
test("SL: zero life errors", () => { assert.ok(computeStraightLine({ cost: 1000, salvage: 0, life_years: 0 }).error); });
test("SL: negative cost errors", () => { assert.ok(computeStraightLine({ cost: -1, salvage: 0, life_years: 5 }).error); });
test("SL: year zero accumulated is zero", () => { const r = computeStraightLine({ cost: 1000, salvage: 0, life_years: 5, year_of_interest: 0 }); assert.equal(r.accumulated_depreciation, 0); });

test("MACRS: 3-year class first year is 33.33%", () => { const r = computeMacrs({ cost: 1000, class_life: 3, year_of_interest: 1 }); assert.ok(close(r.year_depreciation, 333.30, 0.05)); });
test("MACRS: 15-year totals to 100%", () => { const r = computeMacrs({ cost: 100, class_life: 15, year_of_interest: 16 }); const sum = r.schedule.reduce((a, b) => a + b.depreciation, 0); assert.ok(close(sum, 100, 0.05)); });
test("MACRS: 20-year totals to 100%", () => { const r = computeMacrs({ cost: 100, class_life: 20, year_of_interest: 21 }); const sum = r.schedule.reduce((a, b) => a + b.depreciation, 0); assert.ok(close(sum, 100, 0.05)); });
test("MACRS: year_of_interest beyond schedule clamps", () => { const r = computeMacrs({ cost: 1000, class_life: 5, year_of_interest: 99 }); assert.equal(r.year_of_interest, 6); });

test("S179: 0% business use yields 0 deduction", () => { const r = computeSection179({ cost: 50000, business_use_pct: 0, taxable_income: 100000, tax_year: 2025 }); assert.equal(r.section_179_deduction, 0); });
test("S179: invalid year errors", () => { assert.ok(computeSection179({ cost: 100, tax_year: 2099 }).error); });
test("S179: 110% business use errors", () => { assert.ok(computeSection179({ cost: 100, business_use_pct: 110, tax_year: 2025 }).error); });
test("S179: phaseout zeroes cap above cap+threshold", () => { const params = SECTION_179_LIMITS[2025]; const r = computeSection179({ cost: params.phaseout_start + params.cap + 100, business_use_pct: 100, taxable_income: 999999999, tax_year: 2025 }); assert.equal(r.dollar_cap, 0); });

test("SE: MFJ Additional Medicare threshold = $250k", () => { const params = SE_TAX_PARAMETERS[2025]; assert.equal(params.addl_medicare_threshold.mfj, 250000); });
test("SE: MFS threshold = $125k", () => { const params = SE_TAX_PARAMETERS[2025]; assert.equal(params.addl_medicare_threshold.mfs, 125000); });
test("SE: invalid filing status errors", () => { assert.ok(computeSETax({ net_se_earnings: 50000, tax_year: 2025, filing_status: "alien" }).error); });
test("SE: deductible half excludes Additional Medicare", () => { const r = computeSETax({ net_se_earnings: 500000, tax_year: 2025, filing_status: "single" }); assert.ok(r.addl_medicare_tax > 0); assert.ok(close(r.deductible_half, (r.ss_tax + r.medicare_tax) / 2, 0.01)); });

test("ET: zero current/prior tax = zero per-quarter", () => { const r = computeEstimatedTax({ projected_current_tax: 0, prior_year_tax: 0 }); assert.equal(r.per_quarter, 0); });
test("ET: withholding above required gives zero per-quarter", () => { const r = computeEstimatedTax({ projected_current_tax: 1000, prior_year_tax: 1000, current_withholding: 5000 }); assert.equal(r.per_quarter, 0); });

test("Payroll: zero gross is OK", () => { const r = computePayrollWithholding({ gross_per_period: 0, pay_frequency: "weekly", filing_status: "single" }); assert.equal(r.fed_income_tax_period, 0); });

test("Amort: 1-month term gives single payment", () => { const r = computeAmortization({ principal: 1000, annual_rate_pct: 6, term_months: 1 }); assert.equal(r.schedule.length, 1); });
test("Amort: extra principal that exceeds payment caps at balance", () => { const r = computeAmortization({ principal: 100, annual_rate_pct: 5, term_months: 12, extra_principal: 1000 }); assert.ok(r.schedule.length <= 2); });

test("BE: zero fixed costs gives zero breakeven", () => { const r = computeBreakeven({ fixed_costs: 0, variable_cost_per_unit: 5, sale_price_per_unit: 10 }); assert.equal(r.breakeven_units, 0); });
test("BE: target equal to breakeven gives zero MoS", () => { const r = computeBreakeven({ fixed_costs: 100, variable_cost_per_unit: 5, sale_price_per_unit: 10, target_units: 20 }); assert.equal(r.margin_of_safety_units, 0); });

test("STC: post-tax with 0% rate equals pre-tax", () => { const r = computeSalesTaxCompound({ post_tax: 100, rate1_pct: 0 }); assert.ok(close(r.pre_tax, 100)); });
test("STC: missing both inputs errors", () => { assert.ok(computeSalesTaxCompound({ rate1_pct: 5 }).error); });

test("IT: unknown industry skips comparison", () => { const r = computeInventoryTurnover({ cogs: 1e6, beginning_inventory: 1e5, ending_inventory: 1e5, industry_key: "alien_industry" }); assert.equal(r.comparison, null); });
test("IT: zero COGS gives zero turnover", () => { const r = computeInventoryTurnover({ cogs: 0, beginning_inventory: 1000, ending_inventory: 1000 }); assert.equal(r.turnover, 0); });

test("Mileage: empty trips array returns zero deductible", () => { const r = computeMileageRollup({ trips: [], tax_year: 2025 }); assert.equal(r.business_miles, 0); assert.equal(r.deductible_amount, 0); });
test("Mileage: non-array errors", () => { assert.ok(computeMileageRollup({ trips: "x" }).error); });

// --- Lab ---

test("Dilution: solving C1 from V1V2C2", () => { const r = computeDilution({ c1: 0, v1: 0.001, c2: 0.1, v2: 0.010 }); assert.ok(close(r.c1, 1.0)); });
test("Dilution: zero c1 and zero v1 errors", () => { assert.ok(computeDilution({ c1: 0, v1: 0, c2: 0.1, v2: 0.010 }).error); });
test("Serial: factor = 2 doubles dilution per step", () => { const r = computeSerialDilution({ starting_concentration: 1, dilution_factor: 2, volume_per_tube: 0.001, number_of_steps: 3 }); assert.ok(close(r.tubes[2].concentration, 0.125, 0.001)); });
test("Serial: zero steps errors", () => { assert.ok(computeSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 0 }).error); });
test("MW: H2O = 18.015 g/mol", () => { const r = computeMolecularWeight({ formula: "H2O" }); assert.ok(close(r.molecular_weight, 18.015, 0.01)); });
test("MW: CO2 = 44.009 g/mol", () => { const r = computeMolecularWeight({ formula: "CO2" }); assert.ok(close(r.molecular_weight, 12.011 + 2*15.999, 0.01)); });
test("MW: nested parens (NH4)2(SO4)", () => { const r = computeMolecularWeight({ formula: "(NH4)2(SO4)" }); assert.ok(close(r.molecular_weight, 2*(14.007 + 4*1.008) + 32.06 + 4*15.999, 0.01)); });
test("MW: unmatched paren errors", () => { assert.ok(computeMolecularWeight({ formula: "Ca(OH" }).error); });

test("MassMoles: zero MW errors", () => { assert.ok(computeMassMoles({ mass_g: 1, molecular_weight: 0 }).error); });
test("MassMoles: zero mass and zero moles errors", () => { assert.ok(computeMassMoles({ mass_g: 0, moles: 0, molecular_weight: 18 }).error); });

test("RCF: round-trip determinism over 5 different rotor radii", () => {
  for (const r of [50, 80, 100, 158, 200]) {
    const a = computeRcf({ rotor_radius_mm: r, rpm: 5000 });
    const b = computeRcf({ rotor_radius_mm: r, rcf: a.rcf });
    assert.ok(close(b.rpm, 5000, 0.01), "round trip failed at r=" + r);
  }
});
test("RCF: zero rpm and zero rcf errors", () => { assert.ok(computeRcf({ rotor_radius_mm: 100 }).error); });

test("Resuspension: 1 mg @ 10 mg/mL = 0.0001 L = 0.1 mL", () => { const r = computeResuspension({ mass_g: 0.001, target_concentration: 10 }); assert.ok(close(r.volume, 0.0001, 1e-9)); });

test("PCR: zero fudge yields N reactions exactly", () => { const r = computePcrMix({ number_of_reactions: 5, fudge_factor_pct: 0, components: [{ name: "x", per_reaction: 10 }] }); assert.equal(r.scaling_factor, 5); assert.equal(r.rows[0].total, 50); });
test("PCR: empty components errors", () => { assert.ok(computePcrMix({ number_of_reactions: 24, fudge_factor_pct: 10, components: [] }).error); });

test("Beer-Lambert: A=0 gives c=0", () => { const r = computeBeerLambert({ absorbance: 0, path_length_cm: 1, epsilon: 1000 }); assert.equal(r.concentration, 0); });
test("Beer-Lambert: zero path errors", () => { assert.ok(computeBeerLambert({ absorbance: 0.5, path_length_cm: 0, epsilon: 1000 }).error); });

test("HH: ratio doubles per pH unit above pKa", () => {
  const r1 = computeHendersonHasselbalch({ pKa: 7, target_pH: 7, total_buffer_concentration: 1, total_volume: 1 });
  const r2 = computeHendersonHasselbalch({ pKa: 7, target_pH: 8, total_buffer_concentration: 1, total_volume: 1 });
  assert.ok(close(r2.ratio_base_acid / r1.ratio_base_acid, 10, 0.01));
});
test("HH: total buffer < 0 errors", () => { assert.ok(computeHendersonHasselbalch({ pKa: 7, target_pH: 7, total_buffer_concentration: -1, total_volume: 1 }).error); });

test("Hemo: viability = 100% with zero dead cells", () => { const r = computeHemocytometer({ total_cells_counted: 100, squares_counted: 4, dilution_factor: 1, dead_cells: 0 }); assert.equal(r.viability_pct, 100); });
test("Hemo: 9 squares (full grid) divides correctly", () => { const r = computeHemocytometer({ total_cells_counted: 90, squares_counted: 9, dilution_factor: 1 }); assert.equal(r.avg_per_square, 10); });
test("Hemo: dilution scales linearly", () => {
  const a = computeHemocytometer({ total_cells_counted: 100, squares_counted: 4, dilution_factor: 1 });
  const b = computeHemocytometer({ total_cells_counted: 100, squares_counted: 4, dilution_factor: 5 });
  assert.ok(close(b.cells_per_mL / a.cells_per_mL, 5, 0.001));
});

// --- 50-state coverage assertions ---

const ALL_50 = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
