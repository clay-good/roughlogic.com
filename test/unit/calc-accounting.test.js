// Unit tests for calc-accounting.js v5 utilities (234-245).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStraightLine, straightLineExample,
  computeMacrs, macrsExample, MACRS_TABLES,
  computeSection179, section179Example, SECTION_179_LIMITS,
  computeSETax, seTaxExample, SE_TAX_PARAMETERS,
  computeEstimatedTax, estimatedTaxExample, ESTIMATED_TAX_DUE_DATES,
  computePayrollWithholding, payrollExample,
  computeAmortization, amortizationExample,
  computeBreakeven, breakevenExample,
  computeSalesTaxCompound, salesTaxExample,
  computeInventoryTurnover, inventoryTurnoverExample, INVENTORY_BENCHMARKS,
  computeCashConversionCycle, cccExample,
  computeMileageRollup, mileageRollupExample, STANDARD_MILEAGE_RATES,
  computeHomeOffice, homeOfficeExample,
  ACCOUNTING_RENDERERS,
} from "../../calc-accounting.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 234 Straight-Line
test("SL: example produces positive annual depreciation", () => { const r = computeStraightLine(straightLineExample.inputs); assert.ok(r.annual_depreciation > 0); });
test("SL: $50000-$5000 over 10y = $4500/yr", () => { const r = computeStraightLine({ cost: 50000, salvage: 5000, life_years: 10, year_of_interest: 1 }); assert.ok(close(r.annual_depreciation, 4500)); });
test("SL: year 3 accumulated = 3 * annual", () => { const r = computeStraightLine({ cost: 50000, salvage: 5000, life_years: 10, year_of_interest: 3 }); assert.ok(close(r.accumulated_depreciation, 13500)); });
test("SL: book value = cost - accumulated", () => { const r = computeStraightLine({ cost: 50000, salvage: 5000, life_years: 10, year_of_interest: 3 }); assert.ok(close(r.book_value, 36500)); });
test("SL: zero cost errors", () => { assert.ok(computeStraightLine({ cost: 0, salvage: 0, life_years: 5 }).error); });
test("SL: salvage > cost errors", () => { assert.ok(computeStraightLine({ cost: 100, salvage: 200, life_years: 5 }).error); });
test("SL: year clamped to life", () => { const r = computeStraightLine({ cost: 1000, salvage: 0, life_years: 5, year_of_interest: 99 }); assert.equal(r.year_of_interest, 5); });

// 235 MACRS
test("MACRS: example matches Pub 946 5-yr year-1", () => { const r = computeMacrs(macrsExample.inputs); assert.ok(close(r.year_depreciation, 2000, 0.5)); });
test("MACRS: 5-yr table totals to 100%", () => { const sum = MACRS_TABLES.half_year[5].reduce((a, b) => a + b, 0); assert.ok(close(sum, 100, 0.01)); });
test("MACRS: 7-yr table totals to 100%", () => { const sum = MACRS_TABLES.half_year[7].reduce((a, b) => a + b, 0); assert.ok(close(sum, 100, 0.02)); });
test("MACRS: 5-yr full schedule totals to cost", () => { const r = computeMacrs({ cost: 10000, class_life: 5, year_of_interest: 6 }); const tot = r.schedule.reduce((a, b) => a + b.depreciation, 0); assert.ok(close(tot, 10000, 0.5)); });
test("MACRS: book value at end is ~zero", () => { const r = computeMacrs({ cost: 10000, class_life: 5, year_of_interest: 6 }); assert.ok(Math.abs(r.book_value) < 1); });
test("MACRS: unknown class errors", () => { assert.ok(computeMacrs({ cost: 1000, class_life: 4 }).error); });

// 236 Section 179
test("S179: example deducts at least the bonus portion", () => { const r = computeSection179(section179Example.inputs); assert.ok(r.section_179_deduction > 0); });
test("S179: small asset fully expensed under cap", () => { const r = computeSection179({ cost: 60000, business_use_pct: 100, taxable_income: 100000, tax_year: 2025 }); assert.equal(r.section_179_deduction, 60000); });
test("S179: limited by taxable income", () => { const r = computeSection179({ cost: 60000, business_use_pct: 100, taxable_income: 10000, tax_year: 2025 }); assert.equal(r.section_179_deduction, 10000); });
test("S179: phaseout reduces cap dollar-for-dollar", () => { const params = SECTION_179_LIMITS[2025]; const r = computeSection179({ cost: params.phaseout_start + 100000, business_use_pct: 100, taxable_income: 5000000, tax_year: 2025 }); assert.ok(r.dollar_cap === Math.max(0, params.cap - 100000)); });
test("S179: business_use scales basis", () => { const r = computeSection179({ cost: 60000, business_use_pct: 50, taxable_income: 100000, tax_year: 2025 }); assert.equal(r.business_basis, 30000); });
test("S179: bonus applies to residual after 179", () => { const r = computeSection179({ cost: 5000000, business_use_pct: 100, taxable_income: 5000000, tax_year: 2025 }); const after = r.business_basis - r.section_179_deduction; assert.ok(close(r.bonus_depreciation, after * 0.40, 1)); });

// 237 SE tax
test("SE: example yields positive SE tax", () => { const r = computeSETax(seTaxExample.inputs); assert.ok(r.se_tax > 0); });
test("SE: 92.35% adjustment", () => { const r = computeSETax({ net_se_earnings: 100000, tax_year: 2025, filing_status: "single" }); assert.ok(close(r.net_earnings_adjusted, 92350, 0.01)); });
test("SE: SS portion respects wage base", () => { const params = SE_TAX_PARAMETERS[2025]; const r = computeSETax({ net_se_earnings: 1000000, tax_year: 2025, filing_status: "single" }); assert.ok(close(r.ss_tax, params.ss_wage_base * 0.124, 1)); });
test("SE: W-2 wages reduce SS-eligible amount", () => { const params = SE_TAX_PARAMETERS[2025]; const r = computeSETax({ net_se_earnings: 1000000, w2_ss_wages: params.ss_wage_base, tax_year: 2025, filing_status: "single" }); assert.equal(r.ss_tax, 0); });
test("SE: Additional Medicare 0.9% above $200k single", () => { const r = computeSETax({ net_se_earnings: 300000, tax_year: 2025, filing_status: "single" }); assert.ok(r.addl_medicare_tax > 0); });
test("SE: below $400 threshold returns zero", () => { const r = computeSETax({ net_se_earnings: 200, tax_year: 2025, filing_status: "single" }); assert.equal(r.se_tax, 0); });
test("SE: deductible half is half of SS+Medicare (excludes Addl)", () => { const r = computeSETax({ net_se_earnings: 60000, tax_year: 2025, filing_status: "single" }); assert.ok(close(r.deductible_half, (r.ss_tax + r.medicare_tax) / 2, 0.01)); });

// 238 Estimated tax
test("ET: example yields per-quarter > 0", () => { const r = computeEstimatedTax(estimatedTaxExample.inputs); assert.ok(r.per_quarter > 0); });
test("ET: required = min(90% current, 100% prior)", () => { const r = computeEstimatedTax({ projected_current_tax: 20000, prior_year_tax: 18000, current_withholding: 0, prior_year_multiplier: 1.0 }); assert.ok(close(r.required_annual_payment, Math.min(20000 * 0.9, 18000))); });
test("ET: 110% multiplier raises prior-year safe harbor", () => { const r = computeEstimatedTax({ projected_current_tax: 100000, prior_year_tax: 50000, prior_year_multiplier: 1.1 }); assert.ok(close(r.safe_harbor_prior_year, 55000)); });
test("ET: withholding subtracts from required", () => { const r = computeEstimatedTax({ projected_current_tax: 20000, prior_year_tax: 18000, current_withholding: 5000 }); assert.ok(close(r.after_withholding, 13000)); });
test("ET: due dates for 2025 has 4 entries", () => { const r = computeEstimatedTax({ projected_current_tax: 1000, prior_year_tax: 1000, tax_year: 2025 }); assert.equal(r.due_dates.length, 4); });

// 239 Payroll
test("Payroll: example yields total period > 0", () => { const r = computePayrollWithholding(payrollExample.inputs); assert.ok(r.total_employee_period > 0); });
test("Payroll: SS = 6.2% of gross under wage base", () => { const r = computePayrollWithholding({ gross_per_period: 1000, pay_frequency: "weekly", filing_status: "single" }); assert.ok(close(r.ss_tax_period, 62, 0.01)); });
test("Payroll: Medicare = 1.45% of gross", () => { const r = computePayrollWithholding({ gross_per_period: 1000, pay_frequency: "weekly", filing_status: "single" }); assert.ok(close(r.medicare_period, 14.5, 0.01)); });
test("Payroll: SS capped at YTD wage base", () => { const params = SE_TAX_PARAMETERS[2025]; const r = computePayrollWithholding({ gross_per_period: 5000, pay_frequency: "biweekly", filing_status: "single", ytd_ss_wages: params.ss_wage_base }); assert.equal(r.ss_tax_period, 0); });
test("Payroll: unknown frequency errors", () => { assert.ok(computePayrollWithholding({ gross_per_period: 100, pay_frequency: "annual", filing_status: "single" }).error); });

// 240 Amortization
test("Amort: example payment > 0", () => { const r = computeAmortization(amortizationExample.inputs); assert.ok(r.payment > 0); });
test("Amort: 30-yr $250k @6.5% ≈ $1580", () => { const r = computeAmortization({ principal: 250000, annual_rate_pct: 6.5, term_months: 360 }); assert.ok(close(r.payment, 1580.17, 1)); });
test("Amort: zero rate equals straight principal/n", () => { const r = computeAmortization({ principal: 12000, annual_rate_pct: 0, term_months: 12 }); assert.ok(close(r.payment, 1000, 0.01)); });
test("Amort: schedule sums to principal", () => { const r = computeAmortization({ principal: 10000, annual_rate_pct: 5, term_months: 24 }); const sum = r.schedule.reduce((a, b) => a + b.principal, 0); assert.ok(close(sum, 10000, 0.5)); });
test("Amort: extra principal accelerates payoff", () => { const a = computeAmortization({ principal: 100000, annual_rate_pct: 6, term_months: 360 }); const b = computeAmortization({ principal: 100000, annual_rate_pct: 6, term_months: 360, extra_principal: 200 }); assert.ok(b.payoff_month < a.payoff_month); assert.ok(b.total_interest < a.total_interest); });
test("Amort: final balance is ~zero", () => { const r = computeAmortization({ principal: 10000, annual_rate_pct: 5, term_months: 24 }); assert.ok(r.schedule[r.schedule.length - 1].balance < 0.01); });

// 241 Breakeven
test("BE: example yields positive breakeven units", () => { const r = computeBreakeven(breakevenExample.inputs); assert.ok(r.breakeven_units > 0); });
test("BE: $50k FC, $12 CM = 4167 units", () => { const r = computeBreakeven({ fixed_costs: 50000, variable_cost_per_unit: 8, sale_price_per_unit: 20 }); assert.ok(close(r.breakeven_units, 4166.67, 0.5)); });
test("BE: contribution margin ratio = 60% in example", () => { const r = computeBreakeven({ fixed_costs: 50000, variable_cost_per_unit: 8, sale_price_per_unit: 20 }); assert.ok(close(r.contribution_margin_ratio, 0.6, 0.001)); });
test("BE: target above breakeven yields positive MoS", () => { const r = computeBreakeven({ fixed_costs: 50000, variable_cost_per_unit: 8, sale_price_per_unit: 20, target_units: 6000 }); assert.ok(r.margin_of_safety_units > 0); });
test("BE: SP <= VC errors", () => { assert.ok(computeBreakeven({ fixed_costs: 100, variable_cost_per_unit: 10, sale_price_per_unit: 5 }).error); });

// 242 Sales tax compound
test("STC: pre-tax forward", () => { const r = computeSalesTaxCompound({ pre_tax: 100, rate1_pct: 7.5 }); assert.ok(close(r.tax, 7.5)); assert.ok(close(r.post_tax, 107.5)); });
test("STC: combined two-tier", () => { const r = computeSalesTaxCompound({ pre_tax: 100, rate1_pct: 6, rate2_pct: 1.5 }); assert.ok(close(r.tax, 7.5)); });
test("STC: reverse from receipt", () => { const r = computeSalesTaxCompound({ post_tax: 107.5, rate1_pct: 7.5 }); assert.ok(close(r.pre_tax, 100, 0.01)); });
test("STC: zero rate passes through", () => { const r = computeSalesTaxCompound({ pre_tax: 100, rate1_pct: 0 }); assert.equal(r.tax, 0); });
test("STC: providing both errors", () => { assert.ok(computeSalesTaxCompound({ pre_tax: 100, post_tax: 110, rate1_pct: 5 }).error); });

// 243 Inventory turnover
test("IT: example positive turnover", () => { const r = computeInventoryTurnover(inventoryTurnoverExample.inputs); assert.ok(r.turnover > 0); });
test("IT: COGS 1M, avg 100k = 10x", () => { const r = computeInventoryTurnover({ cogs: 1000000, beginning_inventory: 100000, ending_inventory: 100000 }); assert.ok(close(r.turnover, 10)); });
test("IT: DSI = 365/turnover", () => { const r = computeInventoryTurnover({ cogs: 1000000, beginning_inventory: 100000, ending_inventory: 100000 }); assert.ok(close(r.days_sales_of_inventory, 36.5, 0.1)); });
test("IT: industry comparison populated", () => { const r = computeInventoryTurnover({ cogs: 1000000, beginning_inventory: 100000, ending_inventory: 100000, industry_key: "retail_general" }); assert.ok(r.comparison && r.comparison.median === INVENTORY_BENCHMARKS.retail_general.turnover_median); });
test("IT: zero average inventory errors", () => { assert.ok(computeInventoryTurnover({ cogs: 1000, beginning_inventory: 0, ending_inventory: 0 }).error); });

// 244 CCC
test("CCC: example", () => { const r = computeCashConversionCycle(cccExample.inputs); assert.equal(r.ccc_days, 75); });
test("CCC: zero everything = 0", () => { assert.equal(computeCashConversionCycle({ dso: 0, dio: 0, dpo: 0 }).ccc_days, 0); });
test("CCC: DPO subtracts", () => { const r = computeCashConversionCycle({ dso: 30, dio: 40, dpo: 100 }); assert.equal(r.ccc_days, -30); });
test("CCC: negative input errors", () => { assert.ok(computeCashConversionCycle({ dso: -1, dio: 30, dpo: 30 }).error); });

// 245 Mileage rollup
test("Mileage: example yields positive deduction", () => { const r = computeMileageRollup(mileageRollupExample.inputs); assert.ok(r.deductible_amount > 0); });
test("Mileage: 100 mi @ 2025 rate", () => { const rate = STANDARD_MILEAGE_RATES[2025].business; const r = computeMileageRollup({ trips: [{ business_miles: 100 }], tax_year: 2025 }); assert.ok(close(r.deductible_amount, 100 * rate, 0.01)); });
test("Mileage: trip count is array length", () => { const r = computeMileageRollup({ trips: [{ business_miles: 5 }, { business_miles: 10 }], tax_year: 2025 }); assert.equal(r.trip_count, 2); });
test("Mileage: odometer span computes implied total", () => { const r = computeMileageRollup({ trips: [{ business_miles: 50, start_odometer: 1000, end_odometer: 1100 }], tax_year: 2025 }); assert.equal(r.total_miles_implied, 100); assert.equal(r.personal_miles_implied, 50); });
test("Mileage: unbundled year errors", () => { assert.ok(computeMileageRollup({ trips: [{ business_miles: 1 }], tax_year: 1999 }).error); });

// spec-v17 R.3 Home office (simplified vs actual)
test("HomeOffice: example -> simplified $1,000, actual $2,400, recommended actual $2,400", () => {
  const r = computeHomeOffice(homeOfficeExample.inputs);
  assert.ok(close(r.simplified_deduction, 1000));
  assert.ok(close(r.actual_deduction, 2400));
  assert.ok(close(r.recommended_deduction, 2400));
  assert.equal(r.recommended_method, "actual");
});
test("HomeOffice: simplified = office ft^2 x $5", () => { const r = computeHomeOffice({ office_ft2: 150, home_ft2: 1500, total_home_expenses: 0 }); assert.ok(close(r.simplified_deduction, 750)); });
test("HomeOffice: simplified caps at 300 ft^2 / $1,500", () => { const r = computeHomeOffice({ office_ft2: 500, home_ft2: 2000, total_home_expenses: 0 }); assert.ok(close(r.simplified_deduction, 1500)); assert.ok(r.warnings.some((w) => /300 ft\^2/.test(w))); });
test("HomeOffice: actual = (office/home) x expenses", () => { const r = computeHomeOffice({ office_ft2: 300, home_ft2: 1500, total_home_expenses: 20000 }); assert.ok(close(r.actual_deduction, 4000)); assert.ok(close(r.office_use_pct, 20)); });
test("HomeOffice: recommends the higher of the two methods", () => { const r = computeHomeOffice({ office_ft2: 100, home_ft2: 2000, total_home_expenses: 3000 }); assert.equal(r.recommended_method, "simplified"); assert.ok(close(r.recommended_deduction, 500)); });
test("HomeOffice: office-use percent above 50% is flagged", () => { const r = computeHomeOffice({ office_ft2: 1200, home_ft2: 2000, total_home_expenses: 10000 }); assert.ok(r.warnings.some((w) => /50%/.test(w))); });
test("HomeOffice: office exceeding home area is rejected", () => { assert.ok("error" in computeHomeOffice({ office_ft2: 2500, home_ft2: 2000, total_home_expenses: 1000 })); });
test("HomeOffice: non-positive areas are rejected", () => { assert.ok("error" in computeHomeOffice({ office_ft2: 0, home_ft2: 2000 })); assert.ok("error" in computeHomeOffice({ office_ft2: 100, home_ft2: 0 })); });

// Renderer registry
test("ACCOUNTING_RENDERERS exposes all 28 utilities", () => {
  const ids = Object.keys(ACCOUNTING_RENDERERS);
  assert.equal(ids.length, 28);
  for (const id of [
    "straight-line-depreciation", "macrs-depreciation", "section-179",
    "se-tax", "estimated-tax", "payroll-withholding",
    "loan-amortization", "breakeven", "sales-tax-compound",
    "inventory-turnover", "cash-conversion-cycle", "mileage-rollup",
    "home-office",
    "wip-percent-complete", "change-order-markup", "retainage-tracker",
    "surety-bond-premium", "workers-comp-emr-premium", "prevailing-wage-fringe",
  ]) assert.ok(typeof ACCOUNTING_RENDERERS[id] === "function", id);
});
