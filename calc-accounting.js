// Group R: Accounting, Tax, and Small-Business (utilities 234-245).
// See spec-v5.md section 2.1 / Step 58.
//
// Audience: small-business owner, freelancer, bookkeeper. The math is
// public; the data is bundled from IRS publications, SSA wage-base
// announcements, and Census/SBA medians. No live lookup, no account, no
// telemetry. Per-tool inline notice carries the v5 tax-law variant:
// "Estimate only. Tax law changes. Confirm with the current IRS
// publication or a licensed CPA before filing."

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeTextarea,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { attachCsvExport, attachGlossaryTooltip } from "./v5-platform.js";

// --- Bundled IRS / SSA parameters ---

// Section 179 cap and phase-out threshold by tax year.
// Source: IRS annual revenue procedures (Rev. Proc. for inflation-adjusted
// items). Cite by year. To be refreshed annually each January.
// data/accounting/section-179-limits.json
export const SECTION_179_LIMITS = {
  2023: { cap: 1160000, phaseout_start: 2890000, bonus_pct: 80, verified_on: "2024-02-01" },
  2024: { cap: 1220000, phaseout_start: 3050000, bonus_pct: 60, verified_on: "2024-02-01" },
  2025: { cap: 1250000, phaseout_start: 3130000, bonus_pct: 40, verified_on: "2025-02-01" },
  2026: { cap: 1290000, phaseout_start: 3220000, bonus_pct: 20, verified_on: "2026-02-01" },
};

// Self-employment tax parameters by year.
// Social Security wage base (SSA annual announcement) and Additional
// Medicare 0.9% threshold (IRC 3101(b)(2)) by filing status.
// data/accounting/se-tax-parameters.json
export const SE_TAX_PARAMETERS = {
  2023: { ss_wage_base: 160200, addl_medicare_threshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 }, verified_on: "2024-02-01" },
  2024: { ss_wage_base: 168600, addl_medicare_threshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 }, verified_on: "2024-02-01" },
  2025: { ss_wage_base: 176100, addl_medicare_threshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 }, verified_on: "2025-02-01" },
  2026: { ss_wage_base: 183600, addl_medicare_threshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 }, verified_on: "2026-02-01" },
};

// IRS standard mileage rate (business use) per year, cents/mile.
// Source: IRS annual standard-mileage-rate notice (e.g., Notice 2024-08).
// data/accounting/standard-mileage-rates.json
export const STANDARD_MILEAGE_RATES = {
  2023: { business: 0.655, medical: 0.22, charitable: 0.14, verified_on: "2024-02-01" },
  2024: { business: 0.67,  medical: 0.21, charitable: 0.14, verified_on: "2024-02-01" },
  2025: { business: 0.70,  medical: 0.21, charitable: 0.14, verified_on: "2025-02-01" },
  2026: { business: 0.72,  medical: 0.22, charitable: 0.14, verified_on: "2026-02-01" },
};

// IRS Form 1040-ES quarterly due dates per year (calendar shown is the
// statutory date; the user is responsible for weekend/holiday rollover
// per the IRS published schedule).
// data/accounting/estimated-tax-due-dates.json
export const ESTIMATED_TAX_DUE_DATES = {
  2024: ["2024-04-15", "2024-06-17", "2024-09-16", "2025-01-15"],
  2025: ["2025-04-15", "2025-06-16", "2025-09-15", "2026-01-15"],
  2026: ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"],
};

// Inventory / industry-median benchmarks. Rough Census/SBA-aligned
// reference points so the user can see whether a turnover ratio is
// in or out of band. Cite source and year.
// data/accounting/inventory-benchmarks.json
export const INVENTORY_BENCHMARKS = {
  retail_general:        { turnover_median: 8,  source: "U.S. Census Annual Retail Trade Survey", year: 2023 },
  grocery:               { turnover_median: 14, source: "U.S. Census ARTS", year: 2023 },
  apparel:               { turnover_median: 4,  source: "U.S. Census ARTS", year: 2023 },
  auto_parts:            { turnover_median: 5,  source: "U.S. Census ARTS", year: 2023 },
  manufacturing_general: { turnover_median: 6,  source: "U.S. Census ASM", year: 2023 },
  restaurant_food:       { turnover_median: 26, source: "SBA / NRA industry median", year: 2023 },
};

// MACRS percentage tables (IRS Pub 946 Tables A-1 / A-2).
// Half-year convention, 200% declining balance switching to straight
// line, percentages as published (already include the half-year
// convention in years 1 and last).
// data/accounting/macrs-tables.json
export const MACRS_TABLES = {
  // Pub 946 Table A-1: 200% DB, half-year convention.
  half_year: {
    3:  [33.33, 44.45, 14.81, 7.41],
    5:  [20.00, 32.00, 19.20, 11.52, 11.52, 5.76],
    7:  [14.29, 24.49, 17.49, 12.49,  8.93,  8.92, 8.93, 4.46],
    10: [10.00, 18.00, 14.40, 11.52,  9.22,  7.37, 6.55, 6.55, 6.56, 6.55, 3.28],
    // 15- and 20-year classes use 150% DB, half-year.
    15: [5.00,  9.50,  8.55,  7.70,  6.93,  6.23, 5.90, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 2.95],
    20: [3.750, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461,
         4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 2.231],
  },
};

// --- 234: Straight-Line Depreciation ---
//
// Annual depreciation = (cost - salvage) / life. Even split, no convention.
// Cite IRS Publication 946 Chapter 1 (Straight-Line method) by name.

// dims: in { cost: dimensionless, salvage: dimensionless, life_years: dimensionless, year_of_interest: dimensionless }
//        out: { annual_depreciation: dimensionless, accumulated_depreciation: dimensionless, book_value: dimensionless, life_years: dimensionless, year_of_interest: dimensionless }
// (Monetary cost / salvage / book value are dimensionless dollar
//  aggregates per the §7.1 monetary convention. Useful life in
//  years is a calendar count (dimensionless integer per the §7.1
//  count convention); annual depreciation reduces to dollars per
//  count and remains dimensionless.)
export function computeStraightLine({ cost = 0, salvage = 0, life_years = 0, year_of_interest = 1 }) {
  if (!(cost > 0)) return { error: "Asset cost must be positive." };
  if (!(salvage >= 0)) return { error: "Salvage value cannot be negative." };
  if (salvage > cost) return { error: "Salvage cannot exceed cost." };
  if (!(life_years > 0)) return { error: "Useful life must be positive." };
  const annual = (cost - salvage) / life_years;
  const y = Math.max(0, Math.min(life_years, Math.floor(year_of_interest)));
  const accumulated = annual * y;
  const book_value = cost - accumulated;
  return { annual_depreciation: annual, accumulated_depreciation: accumulated, book_value, life_years, year_of_interest: y };
}

export const straightLineExample = { inputs: { cost: 50000, salvage: 5000, life_years: 10, year_of_interest: 3 } };

// --- 235: MACRS Depreciation ---
//
// Pub 946 percentage tables. Inputs: cost, class life, convention,
// year-of-interest. Returns full schedule plus the year-of-interest
// snapshot.

// dims: in { cost: dimensionless, class_life: dimensionless, convention: dimensionless, year_of_interest: dimensionless }
//        out: { schedule: dimensionless, year_of_interest: dimensionless, year_depreciation: dimensionless, accumulated_depreciation: dimensionless, book_value: dimensionless }
// (Pure IRS Pub 946 percentage-table lookup. Cost and per-year
//  depreciation / accumulated / book-value entries are
//  dimensionless dollar aggregates; class-life year count and
//  half-year convention token are categorical (dimensionless).)
export function computeMacrs({ cost = 0, class_life = 5, convention = "half_year", year_of_interest = 1 }) {
  if (!(cost > 0)) return { error: "Asset cost must be positive." };
  const conv = MACRS_TABLES[convention];
  if (!conv) return { error: "Convention not bundled (use half_year)." };
  const pct = conv[class_life];
  if (!pct) return { error: "Class life " + class_life + " not in MACRS table." };
  const schedule = pct.map((p, i) => {
    const dep = cost * (p / 100);
    return { year: i + 1, percent: p, depreciation: dep };
  });
  let accumulated = 0;
  for (const r of schedule) { accumulated += r.depreciation; r.accumulated = accumulated; r.book_value = cost - accumulated; }
  const idx = Math.max(1, Math.min(schedule.length, Math.floor(year_of_interest))) - 1;
  const snapshot = schedule[idx];
  return { schedule, year_of_interest: snapshot.year, year_depreciation: snapshot.depreciation, accumulated_depreciation: snapshot.accumulated, book_value: snapshot.book_value };
}

export const macrsExample = { inputs: { cost: 10000, class_life: 5, convention: "half_year", year_of_interest: 1 }, expected: { year_depreciation: 2000 } };

// --- 236: Section 179 and Bonus Depreciation Estimator ---

// dims: in { cost: dimensionless, business_use_pct: dimensionless, taxable_income: dimensionless, tax_year: dimensionless, bonus_pct: dimensionless }
//        out: { business_basis: dimensionless, dollar_cap: dimensionless, section_179_deduction: dimensionless, bonus_pct: dimensionless, bonus_depreciation: dimensionless, remaining_basis_for_macrs: dimensionless, phaseout_overage: dimensionless, parameters: dimensionless }
// (Section 179 cap and phase-out are dollar aggregates
//  (dimensionless); business-use and bonus percents are
//  dimensionless ratios. The tax-year shard lookup returns a
//  categorical parameters object (dimensionless).)
export function computeSection179({ cost = 0, business_use_pct = 100, taxable_income = 0, tax_year = 2025, bonus_pct = null }) {
  if (!(cost > 0)) return { error: "Asset cost must be positive." };
  if (!(business_use_pct >= 0 && business_use_pct <= 100)) return { error: "Business-use percent must be 0-100." };
  const params = SECTION_179_LIMITS[tax_year];
  if (!params) return { error: "Tax year " + tax_year + " not bundled." };
  const business_basis = cost * (business_use_pct / 100);
  // Phase-out: cap reduces dollar-for-dollar on cost above threshold.
  const overage = Math.max(0, business_basis - params.phaseout_start);
  const dollar_cap = Math.max(0, params.cap - overage);
  // Section 179 deduction limited to cap, business basis, and taxable income.
  const sec179 = Math.max(0, Math.min(business_basis, dollar_cap, taxable_income));
  const after_179 = business_basis - sec179;
  const bonus_rate = bonus_pct == null ? params.bonus_pct : Number(bonus_pct);
  const bonus = after_179 * (bonus_rate / 100);
  const remaining_basis = after_179 - bonus;
  return {
    business_basis, dollar_cap, section_179_deduction: sec179,
    bonus_pct: bonus_rate, bonus_depreciation: bonus,
    remaining_basis_for_macrs: remaining_basis,
    phaseout_overage: overage, parameters: params,
  };
}

export const section179Example = { inputs: { cost: 60000, business_use_pct: 100, taxable_income: 200000, tax_year: 2025 } };

// --- 237: Self-Employment Tax (Schedule SE) ---
//
// 92.35% net earnings adjustment, SS portion 12.4% capped at the SS
// wage base (less W-2 wages already subject to SS), Medicare 2.9% with
// no cap, Additional Medicare 0.9% above the filing-status threshold,
// deductible half (employer share equivalent).

// dims: in { net_se_earnings: dimensionless, w2_ss_wages: dimensionless, tax_year: dimensionless, filing_status: dimensionless }
//        out: { net_earnings_adjusted: dimensionless, ss_taxable: dimensionless, ss_tax: dimensionless, medicare_tax: dimensionless, addl_medicare_tax: dimensionless, se_tax: dimensionless, deductible_half: dimensionless, parameters: dimensionless }
// (Schedule SE: 92.35% adjustment, 12.4% SS up to wage base,
//  2.9% Medicare, 0.9% Additional Medicare above threshold. All
//  monetary inputs and outputs are dimensionless dollar aggregates
//  per the §7.1 monetary convention; filing status and tax year
//  are categorical tokens.)
export function computeSETax({ net_se_earnings = 0, w2_ss_wages = 0, tax_year = 2025, filing_status = "single" }) {
  if (!(net_se_earnings >= 0)) return { error: "Net SE earnings cannot be negative." };
  const params = SE_TAX_PARAMETERS[tax_year];
  if (!params) return { error: "Tax year " + tax_year + " not bundled." };
  const adj = net_se_earnings * 0.9235;
  if (adj < 400) return { se_tax: 0, message: "Below the $400 SE filing threshold.", net_earnings_adjusted: adj };
  const ss_remaining = Math.max(0, params.ss_wage_base - w2_ss_wages);
  const ss_taxable = Math.min(adj, ss_remaining);
  const ss_tax = ss_taxable * 0.124;
  const medicare_tax = adj * 0.029;
  const addl_threshold = params.addl_medicare_threshold[filing_status];
  if (addl_threshold === undefined) return { error: "Unknown filing status." };
  const addl_medicare = Math.max(0, adj - addl_threshold) * 0.009;
  const se_tax = ss_tax + medicare_tax + addl_medicare;
  const deductible_half = (ss_tax + medicare_tax) / 2;
  return {
    net_earnings_adjusted: adj, ss_taxable, ss_tax, medicare_tax,
    addl_medicare_tax: addl_medicare, se_tax, deductible_half, parameters: params,
  };
}

export const seTaxExample = { inputs: { net_se_earnings: 60000, w2_ss_wages: 0, tax_year: 2025, filing_status: "single" } };

// --- 238: Quarterly Estimated Tax Worksheet ---
//
// Safe harbor: required annual payment is the smaller of 90% of
// current-year tax or 100/110% of prior-year tax (110% if prior-year
// AGI > $150k; we expose the multiplier as an input).

// dims: in { projected_current_tax: dimensionless, prior_year_tax: dimensionless, current_withholding: dimensionless, prior_year_multiplier: dimensionless, tax_year: dimensionless }
//        out: { safe_harbor_90pct_current: dimensionless, safe_harbor_prior_year: dimensionless, required_annual_payment: dimensionless, after_withholding: dimensionless, per_quarter: dimensionless, due_dates: dimensionless, notice: dimensionless }
// (1040-ES safe-harbor math: smaller of 90% current-year tax or
//  100/110% of prior-year tax. All monetary inputs and outputs
//  are dimensionless dollar aggregates; ratios and due-date
//  arrays are categorical (dimensionless).)
export function computeEstimatedTax({
  projected_current_tax = 0, prior_year_tax = 0, current_withholding = 0,
  prior_year_multiplier = 1.0, tax_year = 2025,
}) {
  if (!(projected_current_tax >= 0)) return { error: "Projected tax cannot be negative." };
  if (!(prior_year_tax >= 0)) return { error: "Prior-year tax cannot be negative." };
  const ninety_pct = projected_current_tax * 0.90;
  const prior_safe = prior_year_tax * prior_year_multiplier;
  const required = Math.min(ninety_pct, prior_safe);
  const owed_after_wh = Math.max(0, required - current_withholding);
  const per_quarter = owed_after_wh / 4;
  const dates = ESTIMATED_TAX_DUE_DATES[tax_year] || null;
  return {
    safe_harbor_90pct_current: ninety_pct,
    safe_harbor_prior_year: prior_safe,
    required_annual_payment: required,
    after_withholding: owed_after_wh,
    per_quarter,
    due_dates: dates,
    notice: "Smaller of 90% current or " + Math.round(prior_year_multiplier * 100) + "% prior. See IRS Form 1040-ES.",
  };
}

export const estimatedTaxExample = { inputs: { projected_current_tax: 20000, prior_year_tax: 18000, current_withholding: 4000, prior_year_multiplier: 1.0, tax_year: 2025 } };

// --- 239: Payroll Tax Withholding (Simplified, federal only) ---
//
// Pub 15-T percentage method (rough; bracket points are illustrative).
// Real implementation would index per-year per-frequency per-status
// brackets bundled in a shard. For now: annualize gross, apply 2025
// single brackets, divide by pay periods.
// data/accounting/pub-15-t-tables.json

const PUB_15T_BRACKETS_2025 = {
  // Annualized brackets, single filer, standard deduction baked in
  // (illustrative; refresh from Pub 15-T worksheet 1A).
  single: [
    { up_to: 14600, rate: 0.00, base: 0 },
    { up_to: 26200, rate: 0.10, base: 0 },
    { up_to: 61750, rate: 0.12, base: 1160 },
    { up_to: 115125, rate: 0.22, base: 5426 },
    { up_to: 206550, rate: 0.24, base: 17168.50 },
    { up_to: 258325, rate: 0.32, base: 39110.50 },
    { up_to: 623950, rate: 0.35, base: 55678.50 },
    { up_to: Infinity, rate: 0.37, base: 183647.25 },
  ],
};

const PAY_FREQ_PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

// dims: in { gross_per_period: dimensionless, pay_frequency: dimensionless, filing_status: dimensionless, tax_year: dimensionless, ytd_ss_wages: dimensionless }
//        out: { annual_gross: dimensionless, fed_income_tax_period: dimensionless, fed_income_tax_annual: dimensionless, ss_tax_period: dimensionless, medicare_period: dimensionless, addl_medicare_period: dimensionless, total_employee_period: dimensionless, parameters: dimensionless }
// (Pub 15-T percentage-method bracket walk plus FICA per period.
//  Gross / withholding / per-period amounts are dimensionless
//  dollar aggregates; the pay-frequency lookup (52/26/24/12) is a
//  dimensionless period count; bracket rates and Medicare /
//  additional-Medicare percentages are dimensionless ratios.)
export function computePayrollWithholding({
  gross_per_period = 0, pay_frequency = "biweekly", filing_status = "single",
  tax_year = 2025, ytd_ss_wages = 0,
}) {
  if (!(gross_per_period >= 0)) return { error: "Gross cannot be negative." };
  const periods = PAY_FREQ_PERIODS[pay_frequency];
  if (!periods) return { error: "Unknown pay frequency." };
  const annual_gross = gross_per_period * periods;
  const brackets = PUB_15T_BRACKETS_2025[filing_status];
  if (!brackets) return { error: "Unsupported filing status (illustrative single only)." };
  let prev = 0, fed_annual = 0;
  for (const b of brackets) {
    if (annual_gross <= b.up_to) { fed_annual = b.base + (annual_gross - prev) * b.rate; break; }
    prev = b.up_to;
  }
  const fed_per_period = fed_annual / periods;
  // FICA per period.
  const params = SE_TAX_PARAMETERS[tax_year] || SE_TAX_PARAMETERS[2025];
  const ss_remaining = Math.max(0, params.ss_wage_base - ytd_ss_wages);
  const ss_this_period = Math.min(gross_per_period, ss_remaining) * 0.062;
  const medicare = gross_per_period * 0.0145;
  const addl_threshold = params.addl_medicare_threshold[filing_status] || 200000;
  const addl_medicare = ytd_ss_wages + gross_per_period > addl_threshold
    ? Math.max(0, gross_per_period - Math.max(0, addl_threshold - ytd_ss_wages)) * 0.009
    : 0;
  return {
    annual_gross, fed_income_tax_period: fed_per_period, fed_income_tax_annual: fed_annual,
    ss_tax_period: ss_this_period, medicare_period: medicare, addl_medicare_period: addl_medicare,
    total_employee_period: fed_per_period + ss_this_period + medicare + addl_medicare,
    parameters: params,
  };
}

export const payrollExample = { inputs: { gross_per_period: 2500, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 } };

// --- 240: Loan Amortization Schedule ---
//
// Standard formula: P = (r * PV) / (1 - (1+r)^-n).

// dims: in { principal: dimensionless, annual_rate_pct: dimensionless, term_months: dimensionless, extra_principal: dimensionless, first_payment_date: dimensionless }
//        out: { payment: dimensionless, schedule: dimensionless, total_interest: dimensionless, payoff_month: dimensionless }
// (Standard loan amortization P = (r*PV)/(1-(1+r)^-n). Principal,
//  payment, interest, and per-month rows are dimensionless dollar
//  aggregates per the §7.1 monetary convention; rate-percent is a
//  dimensionless ratio; term in months and payoff month are
//  dimensionless integer counts.)
export function computeAmortization({
  principal = 0, annual_rate_pct = 0, term_months = 0, extra_principal = 0,
  first_payment_date = null,
}) {
  if (!(principal > 0)) return { error: "Principal must be positive." };
  if (!(annual_rate_pct >= 0)) return { error: "Rate cannot be negative." };
  if (!(term_months > 0)) return { error: "Term must be positive." };
  const r = annual_rate_pct / 100 / 12;
  const n = Math.floor(term_months);
  const pmt = r === 0 ? principal / n : (r * principal) / (1 - Math.pow(1 + r, -n));
  let balance = principal;
  const rows = [];
  let total_interest = 0;
  let payoff_month = null;
  let date = first_payment_date ? new Date(first_payment_date + "T00:00:00Z") : null;
  for (let i = 1; i <= n + 600 && balance > 0.005; i++) {
    const interest = balance * r;
    let principal_pmt = pmt - interest + Number(extra_principal || 0);
    if (principal_pmt > balance) principal_pmt = balance;
    balance -= principal_pmt;
    total_interest += interest;
    const row = {
      month: i, payment: interest + principal_pmt, principal: principal_pmt,
      interest, balance: Math.max(0, balance),
    };
    if (date) {
      row.date = date.toISOString().slice(0, 10);
      const m = date.getUTCMonth();
      date = new Date(Date.UTC(date.getUTCFullYear(), m + 1, date.getUTCDate()));
    }
    rows.push(row);
    if (balance <= 0.005) { payoff_month = i; break; }
  }
  return { payment: pmt, schedule: rows, total_interest, payoff_month: payoff_month || rows.length };
}

export const amortizationExample = { inputs: { principal: 250000, annual_rate_pct: 6.5, term_months: 360 } };

// --- 241: Breakeven Analysis ---

// dims: in { fixed_costs: dimensionless, variable_cost_per_unit: dimensionless, sale_price_per_unit: dimensionless, target_units: dimensionless }
//        out: { contribution_margin: dimensionless, contribution_margin_ratio: dimensionless, breakeven_units: dimensionless, breakeven_revenue: dimensionless, margin_of_safety_units: dimensionless, margin_of_safety_pct: dimensionless }
// (Contribution-margin breakeven: BE_units = fixed / (price -
//  variable). All monetary aggregates and per-unit prices are
//  dimensionless dollars; unit counts and margin-of-safety ratios
//  are dimensionless integers / ratios.)
export function computeBreakeven({
  fixed_costs = 0, variable_cost_per_unit = 0, sale_price_per_unit = 0,
  target_units = 0,
}) {
  if (!(fixed_costs >= 0)) return { error: "Fixed costs cannot be negative." };
  if (!(variable_cost_per_unit >= 0)) return { error: "Variable cost cannot be negative." };
  if (!(sale_price_per_unit > 0)) return { error: "Sale price must be positive." };
  if (sale_price_per_unit <= variable_cost_per_unit) {
    return { error: "Sale price must exceed variable cost (no positive contribution margin)." };
  }
  const cm = sale_price_per_unit - variable_cost_per_unit;
  const cm_ratio = cm / sale_price_per_unit;
  const be_units = fixed_costs / cm;
  const be_revenue = be_units * sale_price_per_unit;
  const margin_of_safety_units = target_units > 0 ? Math.max(0, target_units - be_units) : null;
  const margin_of_safety_pct = target_units > 0 ? margin_of_safety_units / target_units : null;
  return { contribution_margin: cm, contribution_margin_ratio: cm_ratio, breakeven_units: be_units, breakeven_revenue: be_revenue, margin_of_safety_units, margin_of_safety_pct };
}

export const breakevenExample = { inputs: { fixed_costs: 50000, variable_cost_per_unit: 8, sale_price_per_unit: 20, target_units: 6000 } };

// --- 242: Sales Tax Compounding and Reverse ---

// dims: in { pre_tax: dimensionless, post_tax: dimensionless, rate1_pct: dimensionless, rate2_pct: dimensionless }
//        out: { pre_tax: dimensionless, tax: dimensionless, post_tax: dimensionless, combined_rate_pct: dimensionless }
// (Sales-tax compounding / reverse: pre / post / tax monetary
//  aggregates are dimensionless dollars; the combined rate-percent
//  is a dimensionless ratio.)
export function computeSalesTaxCompound({
  pre_tax = 0, post_tax = 0, rate1_pct = 0, rate2_pct = 0,
}) {
  const r = (Number(rate1_pct) + Number(rate2_pct)) / 100;
  if (!(r >= 0)) return { error: "Combined rate cannot be negative." };
  if (pre_tax > 0 && post_tax > 0) return { error: "Provide either pre-tax or post-tax, not both." };
  if (pre_tax > 0) {
    const tax = pre_tax * r;
    return { pre_tax, tax, post_tax: pre_tax + tax, combined_rate_pct: r * 100 };
  }
  if (post_tax > 0) {
    const pre = post_tax / (1 + r);
    return { pre_tax: pre, tax: post_tax - pre, post_tax, combined_rate_pct: r * 100 };
  }
  return { error: "Provide a pre-tax or post-tax amount." };
}

export const salesTaxExample = { inputs: { pre_tax: 100, rate1_pct: 6, rate2_pct: 1.5 } };

// --- 243: Inventory Turnover and Days Sales of Inventory ---

// dims: in { cogs: dimensionless, beginning_inventory: dimensionless, ending_inventory: dimensionless, period_days: dimensionless, industry_key: dimensionless }
//        out: { turnover: dimensionless, days_sales_of_inventory: dimensionless, average_inventory: dimensionless, comparison: dimensionless }
// (Inventory turnover = COGS / avg inventory; DSI = period days /
//  turnover. COGS and inventory balances are dimensionless dollar
//  aggregates; turnover is a dimensionless ratio of like-dim
//  dollar quantities; period in days and DSI are dimensionless
//  counts. Industry-benchmark comparison is a categorical lookup.)
export function computeInventoryTurnover({
  cogs = 0, beginning_inventory = 0, ending_inventory = 0, period_days = 365,
  industry_key = null,
}) {
  if (!(cogs >= 0)) return { error: "COGS cannot be negative." };
  if (!(beginning_inventory >= 0) || !(ending_inventory >= 0)) return { error: "Inventory cannot be negative." };
  const avg = (beginning_inventory + ending_inventory) / 2;
  if (!(avg > 0)) return { error: "Average inventory must be positive." };
  if (!(period_days > 0)) return { error: "Period days must be positive." };
  const turnover = cogs / avg;
  const dsi = period_days / turnover;
  let comparison = null;
  if (industry_key) {
    const bench = INVENTORY_BENCHMARKS[industry_key];
    if (bench) {
      const delta = turnover - bench.turnover_median;
      comparison = { industry: industry_key, median: bench.turnover_median, delta, source: bench.source, year: bench.year };
    }
  }
  return { turnover, days_sales_of_inventory: dsi, average_inventory: avg, comparison };
}

export const inventoryTurnoverExample = { inputs: { cogs: 2000000, beginning_inventory: 250000, ending_inventory: 270000, period_days: 365, industry_key: "retail_general" } };

// --- 244: Cash Conversion Cycle ---

// dims: in { dso: dimensionless, dio: dimensionless, dpo: dimensionless }
//        out: { ccc_days: dimensionless, dso: dimensionless, dio: dimensionless, dpo: dimensionless, dio_contribution: dimensionless, dso_contribution: dimensionless, dpo_contribution: dimensionless }
// (CCC = DIO + DSO - DPO. All three inputs and the sum are
//  expressed as days (dimensionless count per the §7.1 count
//  convention); contributions are signed copies of the inputs.)
export function computeCashConversionCycle({ dso = 0, dio = 0, dpo = 0 }) {
  if (!(dso >= 0) || !(dio >= 0) || !(dpo >= 0)) return { error: "Days values cannot be negative." };
  const ccc = dio + dso - dpo;
  return { ccc_days: ccc, dso, dio, dpo, dio_contribution: dio, dso_contribution: dso, dpo_contribution: -dpo };
}

export const cccExample = { inputs: { dso: 45, dio: 60, dpo: 30 } };

// --- 245: Mileage Log Roll-Up ---
//
// Sums business miles, applies the published IRS standard rate for the
// year. Companion to v3 utility 107.

// dims: in { trips: dimensionless, tax_year: dimensionless }
//        out: { trip_count: dimensionless, business_miles: L, deductible_amount: dimensionless, standard_rate: dimensionless, tax_year: dimensionless, total_miles_implied: L, personal_miles_implied: L, parameters: dimensionless }
// (Trip records are caller-typed dimensionless arrays;
//  business / personal / total-implied miles surface as length `L`
//  (each odometer reading is a length, the difference is the same
//  length). The IRS published per-mile rate has units of dollars-
//  per-length (`L^-1` against monetary aggregates); deductible
//  amount = miles * rate stays a dimensionless dollar aggregate
//  per the §7.1 monetary convention.)
export function computeMileageRollup({ trips = [], tax_year = 2025 }) {
  if (!Array.isArray(trips)) return { error: "Trips must be an array." };
  const rate_row = STANDARD_MILEAGE_RATES[tax_year];
  if (!rate_row) return { error: "Tax year " + tax_year + " not bundled." };
  const rate = rate_row.business;
  let business_miles = 0;
  let total_miles_implied = 0;
  let total_personal_implied = 0;
  for (const t of trips) {
    const m = Number(t.business_miles) || 0;
    business_miles += m;
    const start = Number(t.start_odometer);
    const end = Number(t.end_odometer);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const span = end - start;
      total_miles_implied += span;
      total_personal_implied += Math.max(0, span - m);
    }
  }
  const deductible = business_miles * rate;
  return {
    trip_count: trips.length, business_miles, deductible_amount: deductible,
    standard_rate: rate, tax_year,
    total_miles_implied: total_miles_implied || null,
    personal_miles_implied: total_personal_implied || null,
    parameters: rate_row,
  };
}

export const mileageRollupExample = {
  inputs: {
    tax_year: 2025,
    trips: [
      { date: "2025-03-01", business_miles: 42, purpose: "Client visit", start_odometer: 12300, end_odometer: 12342 },
      { date: "2025-03-04", business_miles: 18, purpose: "Supply run", start_odometer: 12342, end_odometer: 12361 },
    ],
  },
};

// --- Inline notice (v5 tax-law variant) ---

const TAX_LAW_NOTICE = "Estimate only. Tax law changes. Confirm with the current IRS publication or a licensed CPA before filing.";

function makeNotice(text) {
  const p = document.createElement("p");
  p.className = "tool-notice";
  p.textContent = text;
  return p;
}

// --- Renderers ---
//
// Renderers are deliberately compact: live render with debounce, citation
// line, output rows. Tabular outputs (240, 245) emit a small table.

function renderStraightLine(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRS Publication 946 Chapter 1, Straight-Line Method. Cited by name.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const cost = makeNumber("Asset cost (USD)", "sl-cost", { step: "any", min: "0" });
  const salvage = makeNumber("Salvage value (USD)", "sl-salvage", { step: "any", min: "0" });
  const life = makeNumber("Useful life (years)", "sl-life", { step: "1", min: "1" });
  const yoi = makeNumber("Year of interest", "sl-yoi", { step: "1", min: "1" });
  for (const f of [cost, salvage, life, yoi]) inputRegion.appendChild(f.wrap);
  const annual = makeOutputLine(outputRegion, "Annual depreciation", "sl-out-annual");
  const accum = makeOutputLine(outputRegion, "Accumulated through year", "sl-out-accum");
  const book = makeOutputLine(outputRegion, "Remaining book value", "sl-out-book");
  const update = debounce(() => {
    const r = computeStraightLine({
      cost: Number(cost.input.value), salvage: Number(salvage.input.value),
      life_years: Number(life.input.value), year_of_interest: Number(yoi.input.value),
    });
    if (r.error) { annual.textContent = r.error; accum.textContent = ""; book.textContent = ""; return; }
    annual.textContent = "$" + fmt(r.annual_depreciation, 2);
    accum.textContent = "$" + fmt(r.accumulated_depreciation, 2);
    book.textContent = "$" + fmt(r.book_value, 2);
  }, DEBOUNCE_MS);
  for (const f of [cost, salvage, life, yoi]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    cost.input.value = 50000; salvage.input.value = 5000; life.input.value = 10; yoi.input.value = 3;
    update();
  });
}

function renderMacrs(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRS Publication 946 Tables A-1 (200%/150% DB, half-year). Table by class life.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const macrsLabel = document.createElement("span"); macrsLabel.textContent = "MACRS";
  inputRegion.appendChild(macrsLabel);
  attachGlossaryTooltip(macrsLabel, "MACRS");
  const cost = makeNumber("Asset cost (USD)", "mc-cost", { step: "any", min: "0" });
  const cls = makeSelect("Class life (years)", "mc-class",
    [3, 5, 7, 10, 15, 20].map((v) => ({ value: String(v), label: v + "-year" })));
  cls.select.value = "5";
  const yoi = makeNumber("Year of interest", "mc-yoi", { step: "1", min: "1" });
  yoi.input.value = "1";
  for (const f of [cost, cls, yoi]) inputRegion.appendChild(f.wrap);
  const yearOut = makeOutputLine(outputRegion, "Year depreciation", "mc-out-y");
  const accumOut = makeOutputLine(outputRegion, "Accumulated", "mc-out-acc");
  const bookOut = makeOutputLine(outputRegion, "Book value", "mc-out-bv");
  const tableWrap = document.createElement("div");
  tableWrap.id = "mc-out-schedule";
  outputRegion.appendChild(tableWrap);
  const update = debounce(() => {
    const r = computeMacrs({
      cost: Number(cost.input.value), class_life: Number(cls.select.value),
      convention: "half_year", year_of_interest: Number(yoi.input.value),
    });
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    if (r.error) { yearOut.textContent = r.error; accumOut.textContent = ""; bookOut.textContent = ""; return; }
    yearOut.textContent = "$" + fmt(r.year_depreciation, 2);
    accumOut.textContent = "$" + fmt(r.accumulated_depreciation, 2);
    bookOut.textContent = "$" + fmt(r.book_value, 2);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    for (const h of ["Year", "Percent", "Depreciation", "Accumulated", "Book value"]) {
      const th = document.createElement("th"); th.textContent = h; trh.appendChild(th);
    }
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const row of r.schedule) {
      const tr = document.createElement("tr");
      for (const v of [row.year, fmt(row.percent, 4), "$" + fmt(row.depreciation, 2), "$" + fmt(row.accumulated, 2), "$" + fmt(row.book_value, 2)]) {
        const td = document.createElement("td"); td.textContent = String(v); tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); tableWrap.appendChild(table);
  }, DEBOUNCE_MS);
  for (const el of [cost.input, cls.select, yoi.input]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    cost.input.value = 10000; cls.select.value = "5"; yoi.input.value = "1"; update();
  });
}

function renderSection179(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRC 179 cap and phase-out from IRS annual revenue procedures; bonus depreciation per IRC 168(k). Per-year parameters bundled.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const s179Term = document.createElement("span"); s179Term.textContent = "Section 179"; inputRegion.appendChild(s179Term); attachGlossaryTooltip(s179Term, "Section_179");
  const bonusTerm = document.createElement("span"); bonusTerm.textContent = "Bonus depreciation"; bonusTerm.style.marginLeft = "12px"; inputRegion.appendChild(bonusTerm); attachGlossaryTooltip(bonusTerm, "bonus_depreciation");
  const cost = makeNumber("Asset cost (USD)", "s179-cost", { step: "any", min: "0" });
  const buPct = makeNumber("Business-use percent", "s179-bu", { step: "any", min: "0", max: "100" });
  buPct.input.value = "100";
  const ti = makeNumber("Taxable income before the deduction (USD)", "s179-ti", { step: "any", min: "0" });
  const yr = makeSelect("Tax year", "s179-yr",
    Object.keys(SECTION_179_LIMITS).map((y) => ({ value: y, label: y })));
  yr.select.value = "2025";
  for (const f of [cost, buPct, ti, yr]) inputRegion.appendChild(f.wrap);
  const s179Out = makeOutputLine(outputRegion, "Section 179 deduction", "s179-out-d");
  const bonusOut = makeOutputLine(outputRegion, "Bonus depreciation", "s179-out-b");
  const remOut = makeOutputLine(outputRegion, "Remaining basis (to MACRS)", "s179-out-r");
  const update = debounce(() => {
    const r = computeSection179({
      cost: Number(cost.input.value), business_use_pct: Number(buPct.input.value),
      taxable_income: Number(ti.input.value), tax_year: Number(yr.select.value),
    });
    if (r.error) { s179Out.textContent = r.error; bonusOut.textContent = ""; remOut.textContent = ""; return; }
    s179Out.textContent = "$" + fmt(r.section_179_deduction, 2);
    bonusOut.textContent = "$" + fmt(r.bonus_depreciation, 2) + " (" + r.bonus_pct + "%)";
    remOut.textContent = "$" + fmt(r.remaining_basis_for_macrs, 2);
  }, DEBOUNCE_MS);
  for (const el of [cost.input, buPct.input, ti.input, yr.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    cost.input.value = 60000; buPct.input.value = 100; ti.input.value = 200000; yr.select.value = "2025"; update();
  });
}

function renderSeTax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Schedule SE (Form 1040). Social Security wage base from SSA annual announcement; Additional Medicare 0.9% threshold from IRC 3101(b)(2).";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const ne = makeNumber("Net SE earnings (USD)", "se-ne", { step: "any", min: "0" });
  const w2 = makeNumber("W-2 wages already subject to SS (USD)", "se-w2", { step: "any", min: "0" });
  const yr = makeSelect("Tax year", "se-yr",
    Object.keys(SE_TAX_PARAMETERS).map((y) => ({ value: y, label: y })));
  yr.select.value = "2025";
  const fs = makeSelect("Filing status", "se-fs", [
    { value: "single", label: "Single" }, { value: "mfj", label: "Married filing jointly" },
    { value: "mfs", label: "Married filing separately" }, { value: "hoh", label: "Head of household" },
  ]);
  for (const f of [ne, w2, yr, fs]) inputRegion.appendChild(f.wrap);
  const seTot = makeOutputLine(outputRegion, "Total SE tax", "se-out-t");
  const ssOut = makeOutputLine(outputRegion, "Social Security portion", "se-out-ss");
  const medOut = makeOutputLine(outputRegion, "Medicare portion", "se-out-m");
  const addlOut = makeOutputLine(outputRegion, "Additional Medicare", "se-out-am");
  const dedOut = makeOutputLine(outputRegion, "Deductible half", "se-out-d");
  const update = debounce(() => {
    const r = computeSETax({
      net_se_earnings: Number(ne.input.value), w2_ss_wages: Number(w2.input.value),
      tax_year: Number(yr.select.value), filing_status: fs.select.value,
    });
    if (r.error) { seTot.textContent = r.error; ssOut.textContent = medOut.textContent = addlOut.textContent = dedOut.textContent = ""; return; }
    if (r.message) { seTot.textContent = r.message; return; }
    seTot.textContent = "$" + fmt(r.se_tax, 2);
    ssOut.textContent = "$" + fmt(r.ss_tax, 2);
    medOut.textContent = "$" + fmt(r.medicare_tax, 2);
    addlOut.textContent = "$" + fmt(r.addl_medicare_tax, 2);
    dedOut.textContent = "$" + fmt(r.deductible_half, 2);
  }, DEBOUNCE_MS);
  for (const el of [ne.input, w2.input, yr.select, fs.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    ne.input.value = 60000; w2.input.value = 0; yr.select.value = "2025"; fs.select.value = "single"; update();
  });
}

function renderEstimatedTax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRC 6654 safe harbor; IRS Form 1040-ES quarterly schedule.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const proj = makeNumber("Projected current-year tax (USD)", "et-proj", { step: "any", min: "0" });
  const prior = makeNumber("Prior-year total tax (USD)", "et-prior", { step: "any", min: "0" });
  const wh = makeNumber("Current-year withholding to date (USD)", "et-wh", { step: "any", min: "0" });
  const mult = makeSelect("Prior-year safe harbor", "et-mult", [
    { value: "1.0", label: "100% of prior year (AGI <= $150k)" },
    { value: "1.1", label: "110% of prior year (AGI > $150k)" },
  ]);
  const yr = makeSelect("Tax year", "et-yr",
    Object.keys(ESTIMATED_TAX_DUE_DATES).map((y) => ({ value: y, label: y })));
  yr.select.value = "2025";
  for (const f of [proj, prior, wh, mult, yr]) inputRegion.appendChild(f.wrap);
  const reqOut = makeOutputLine(outputRegion, "Required annual payment", "et-out-r");
  const pqOut = makeOutputLine(outputRegion, "Per-quarter installment", "et-out-q");
  const ddOut = makeOutputLine(outputRegion, "Quarterly due dates", "et-out-d");
  const update = debounce(() => {
    const r = computeEstimatedTax({
      projected_current_tax: Number(proj.input.value), prior_year_tax: Number(prior.input.value),
      current_withholding: Number(wh.input.value), prior_year_multiplier: Number(mult.select.value),
      tax_year: Number(yr.select.value),
    });
    if (r.error) { reqOut.textContent = r.error; pqOut.textContent = ddOut.textContent = ""; return; }
    reqOut.textContent = "$" + fmt(r.required_annual_payment, 2);
    pqOut.textContent = "$" + fmt(r.per_quarter, 2);
    ddOut.textContent = (r.due_dates || []).join(", ");
  }, DEBOUNCE_MS);
  for (const el of [proj.input, prior.input, wh.input, mult.select, yr.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    proj.input.value = 20000; prior.input.value = 18000; wh.input.value = 4000; mult.select.value = "1.0"; yr.select.value = "2025"; update();
  });
}

function renderPayroll(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRS Publication 15-T percentage method (illustrative single-filer brackets bundled). FICA per FICA at 6.2% / 1.45% / 0.9% Additional.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const ficaTerm = document.createElement("span"); ficaTerm.textContent = "FICA"; inputRegion.appendChild(ficaTerm); attachGlossaryTooltip(ficaTerm, "FICA");
  const gross = makeNumber("Gross wages this period (USD)", "pw-g", { step: "any", min: "0" });
  const freq = makeSelect("Pay frequency", "pw-f", [
    { value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Biweekly" },
    { value: "semimonthly", label: "Semimonthly" }, { value: "monthly", label: "Monthly" },
  ]);
  freq.select.value = "biweekly";
  const fs = makeSelect("Filing status", "pw-fs", [{ value: "single", label: "Single (illustrative)" }]);
  const ytdSs = makeNumber("YTD wages subject to SS (USD)", "pw-ytd", { step: "any", min: "0" });
  for (const f of [gross, freq, fs, ytdSs]) inputRegion.appendChild(f.wrap);
  const fedOut = makeOutputLine(outputRegion, "Federal income tax this period", "pw-out-f");
  const ssOut = makeOutputLine(outputRegion, "Social Security this period", "pw-out-ss");
  const medOut = makeOutputLine(outputRegion, "Medicare this period", "pw-out-m");
  const totOut = makeOutputLine(outputRegion, "Total employee deduction", "pw-out-t");
  const update = debounce(() => {
    const r = computePayrollWithholding({
      gross_per_period: Number(gross.input.value), pay_frequency: freq.select.value,
      filing_status: fs.select.value, ytd_ss_wages: Number(ytdSs.input.value),
    });
    if (r.error) { fedOut.textContent = r.error; ssOut.textContent = medOut.textContent = totOut.textContent = ""; return; }
    fedOut.textContent = "$" + fmt(r.fed_income_tax_period, 2);
    ssOut.textContent = "$" + fmt(r.ss_tax_period, 2);
    medOut.textContent = "$" + fmt(r.medicare_period, 2);
    totOut.textContent = "$" + fmt(r.total_employee_period, 2);
  }, DEBOUNCE_MS);
  for (const el of [gross.input, freq.select, fs.select, ytdSs.input]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    gross.input.value = 2500; freq.select.value = "biweekly"; ytdSs.input.value = 0; update();
  });
}

function renderAmortization(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: standard amortization formula P = (r * PV) / (1 - (1+r)^-n). First principles.";
  const principal = makeNumber("Principal (USD)", "am-p", { step: "any", min: "0" });
  const rate = makeNumber("Annual rate (percent)", "am-r", { step: "any", min: "0" });
  const term = makeNumber("Term (months)", "am-t", { step: "1", min: "1" });
  const extra = makeNumber("Extra principal per month (USD, optional)", "am-x", { step: "any", min: "0" });
  for (const f of [principal, rate, term, extra]) inputRegion.appendChild(f.wrap);
  const pmt = makeOutputLine(outputRegion, "Payment", "am-out-pmt");
  const ti = makeOutputLine(outputRegion, "Total interest", "am-out-ti");
  const po = makeOutputLine(outputRegion, "Payoff in (months)", "am-out-po");
  const tableWrap = document.createElement("div");
  tableWrap.id = "am-out-schedule";
  tableWrap.className = "tabular-tool";
  outputRegion.appendChild(tableWrap);
  const update = debounce(() => {
    const r = computeAmortization({
      principal: Number(principal.input.value), annual_rate_pct: Number(rate.input.value),
      term_months: Number(term.input.value), extra_principal: Number(extra.input.value || 0),
    });
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    if (r.error) { pmt.textContent = r.error; ti.textContent = po.textContent = ""; return; }
    pmt.textContent = "$" + fmt(r.payment, 2);
    ti.textContent = "$" + fmt(r.total_interest, 2);
    po.textContent = String(r.payoff_month);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    for (const h of ["Month", "Payment", "Principal", "Interest", "Balance"]) {
      const th = document.createElement("th"); th.textContent = h; trh.appendChild(th);
    }
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const row of r.schedule) {
      const tr = document.createElement("tr");
      for (const v of [row.month, "$" + fmt(row.payment, 2), "$" + fmt(row.principal, 2), "$" + fmt(row.interest, 2), "$" + fmt(row.balance, 2)]) {
        const td = document.createElement("td"); td.textContent = String(v); tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); tableWrap.appendChild(table);
    attachCsvExport({
      table, parent: tableWrap, toolId: "loan-amortization",
      inputProvider: () => principal.input.value + "|" + rate.input.value + "|" + term.input.value + "|" + extra.input.value,
    });
  }, DEBOUNCE_MS);
  for (const f of [principal, rate, term, extra]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    principal.input.value = 250000; rate.input.value = 6.5; term.input.value = 360; update();
  });
}

function renderBreakeven(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: contribution-margin algebra. First principles.";
  const cmTerm = document.createElement("span"); cmTerm.textContent = "Contribution margin"; inputRegion.appendChild(cmTerm); attachGlossaryTooltip(cmTerm, "contribution_margin");
  const fc = makeNumber("Fixed costs (USD)", "be-fc", { step: "any", min: "0" });
  const vc = makeNumber("Variable cost per unit (USD)", "be-vc", { step: "any", min: "0" });
  const sp = makeNumber("Sale price per unit (USD)", "be-sp", { step: "any", min: "0" });
  const tu = makeNumber("Target sales volume (units, optional)", "be-tu", { step: "any", min: "0" });
  for (const f of [fc, vc, sp, tu]) inputRegion.appendChild(f.wrap);
  const beU = makeOutputLine(outputRegion, "Breakeven units", "be-out-u");
  const beR = makeOutputLine(outputRegion, "Breakeven revenue", "be-out-r");
  const cm = makeOutputLine(outputRegion, "Contribution margin per unit", "be-out-cm");
  const cmr = makeOutputLine(outputRegion, "Contribution margin ratio", "be-out-cmr");
  const mos = makeOutputLine(outputRegion, "Margin of safety", "be-out-mos");
  const update = debounce(() => {
    const r = computeBreakeven({
      fixed_costs: Number(fc.input.value), variable_cost_per_unit: Number(vc.input.value),
      sale_price_per_unit: Number(sp.input.value), target_units: Number(tu.input.value || 0),
    });
    if (r.error) { beU.textContent = r.error; beR.textContent = cm.textContent = cmr.textContent = mos.textContent = ""; return; }
    beU.textContent = fmt(r.breakeven_units, 2);
    beR.textContent = "$" + fmt(r.breakeven_revenue, 2);
    cm.textContent = "$" + fmt(r.contribution_margin, 2);
    cmr.textContent = fmt(r.contribution_margin_ratio * 100, 2) + "%";
    mos.textContent = r.margin_of_safety_units == null ? "-" : fmt(r.margin_of_safety_units, 2) + " units (" + fmt(r.margin_of_safety_pct * 100, 2) + "%)";
  }, DEBOUNCE_MS);
  for (const f of [fc, vc, sp, tu]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    fc.input.value = 50000; vc.input.value = 8; sp.input.value = 20; tu.input.value = 6000; update();
  });
}

function renderSalesTaxCompound(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: arithmetic. State and local rates supplied by user.";
  const pre = makeNumber("Pre-tax amount (USD)", "stc-pre", { step: "any", min: "0" });
  const post = makeNumber("Post-tax amount (USD)", "stc-post", { step: "any", min: "0" });
  const r1 = makeNumber("Rate 1 (state, percent)", "stc-r1", { step: "any", min: "0" });
  const r2 = makeNumber("Rate 2 (local, percent)", "stc-r2", { step: "any", min: "0" });
  for (const f of [pre, post, r1, r2]) inputRegion.appendChild(f.wrap);
  const taxOut = makeOutputLine(outputRegion, "Tax", "stc-out-t");
  const totOut = makeOutputLine(outputRegion, "Pre / post-tax", "stc-out-p");
  const update = debounce(() => {
    const r = computeSalesTaxCompound({
      pre_tax: Number(pre.input.value || 0), post_tax: Number(post.input.value || 0),
      rate1_pct: Number(r1.input.value || 0), rate2_pct: Number(r2.input.value || 0),
    });
    if (r.error) { taxOut.textContent = r.error; totOut.textContent = ""; return; }
    taxOut.textContent = "$" + fmt(r.tax, 2);
    totOut.textContent = "$" + fmt(r.pre_tax, 2) + " / $" + fmt(r.post_tax, 2);
  }, DEBOUNCE_MS);
  for (const f of [pre, post, r1, r2]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    pre.input.value = 100; post.input.value = ""; r1.input.value = 6; r2.input.value = 1.5; update();
  });
}

function renderInventoryTurnover(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: turnover = COGS / avg inventory; DSI = period_days / turnover. Industry medians from U.S. Census ARTS / SBA, year stamped.";
  const cogs = makeNumber("COGS (USD)", "it-cogs", { step: "any", min: "0" });
  const bi = makeNumber("Beginning inventory (USD)", "it-bi", { step: "any", min: "0" });
  const ei = makeNumber("Ending inventory (USD)", "it-ei", { step: "any", min: "0" });
  const days = makeNumber("Period days", "it-d", { step: "1", min: "1" });
  days.input.value = "365";
  const ind = makeSelect("Industry (for comparison)", "it-ind",
    [{ value: "", label: "(none)" }].concat(Object.entries(INVENTORY_BENCHMARKS).map(([k, v]) => ({ value: k, label: k.replace(/_/g, " ") + " (median " + v.turnover_median + ")" }))));
  for (const f of [cogs, bi, ei, days, ind]) inputRegion.appendChild(f.wrap);
  const tn = makeOutputLine(outputRegion, "Turnover", "it-out-t");
  const dsi = makeOutputLine(outputRegion, "Days sales of inventory", "it-out-dsi");
  const cmp = makeOutputLine(outputRegion, "Industry comparison", "it-out-c");
  const update = debounce(() => {
    const r = computeInventoryTurnover({
      cogs: Number(cogs.input.value), beginning_inventory: Number(bi.input.value),
      ending_inventory: Number(ei.input.value), period_days: Number(days.input.value),
      industry_key: ind.select.value || null,
    });
    if (r.error) { tn.textContent = r.error; dsi.textContent = cmp.textContent = ""; return; }
    tn.textContent = fmt(r.turnover, 2) + "x";
    dsi.textContent = fmt(r.days_sales_of_inventory, 1) + " days";
    cmp.textContent = r.comparison
      ? r.comparison.industry + ": median " + r.comparison.median + "x; delta " + (r.comparison.delta >= 0 ? "+" : "") + fmt(r.comparison.delta, 2) + "x"
      : "-";
  }, DEBOUNCE_MS);
  for (const el of [cogs.input, bi.input, ei.input, days.input, ind.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    cogs.input.value = 2000000; bi.input.value = 250000; ei.input.value = 270000; days.input.value = 365; ind.select.value = "retail_general"; update();
  });
}

function renderCcc(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: CCC = DIO + DSO - DPO. Standard working-capital identity.";
  for (const k of ["DSO", "DIO", "DPO"]) {
    const t = document.createElement("span"); t.textContent = k; t.style.marginRight = "12px";
    inputRegion.appendChild(t); attachGlossaryTooltip(t, k);
  }
  const dso = makeNumber("DSO (days)", "ccc-dso", { step: "any", min: "0" });
  const dio = makeNumber("DIO (days)", "ccc-dio", { step: "any", min: "0" });
  const dpo = makeNumber("DPO (days)", "ccc-dpo", { step: "any", min: "0" });
  for (const f of [dso, dio, dpo]) inputRegion.appendChild(f.wrap);
  const out = makeOutputLine(outputRegion, "Cash conversion cycle", "ccc-out");
  const breakdown = makeOutputLine(outputRegion, "Breakdown", "ccc-out-b");
  const update = debounce(() => {
    const r = computeCashConversionCycle({
      dso: Number(dso.input.value), dio: Number(dio.input.value), dpo: Number(dpo.input.value),
    });
    if (r.error) { out.textContent = r.error; breakdown.textContent = ""; return; }
    out.textContent = fmt(r.ccc_days, 1) + " days";
    breakdown.textContent = "DIO " + fmt(r.dio, 1) + " + DSO " + fmt(r.dso, 1) + " - DPO " + fmt(r.dpo, 1);
  }, DEBOUNCE_MS);
  for (const f of [dso, dio, dpo]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    dso.input.value = 45; dio.input.value = 60; dpo.input.value = 30; update();
  });
}

function renderMileageRollup(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRS standard mileage rate (annual notice). Per-year rate bundled.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const yr = makeSelect("Tax year", "ml-yr",
    Object.keys(STANDARD_MILEAGE_RATES).map((y) => ({ value: y, label: y })));
  yr.select.value = "2025";
  inputRegion.appendChild(yr.wrap);
  const ta = makeTextarea("Trips (date,miles,purpose; one per line)", "ml-trips", { rows: "4" });
  ta.input.placeholder = "2025-03-01,42,Client visit";
  inputRegion.appendChild(ta.wrap);
  const milesOut = makeOutputLine(outputRegion, "Total business miles", "ml-out-m");
  const dedOut = makeOutputLine(outputRegion, "Deductible amount", "ml-out-d");
  const rateOut = makeOutputLine(outputRegion, "Rate applied", "ml-out-r");
  const tableWrap = document.createElement("div");
  tableWrap.id = "ml-out-schedule";
  tableWrap.className = "tabular-tool";
  outputRegion.appendChild(tableWrap);
  const update = debounce(() => {
    const trips = String(ta.input.value || "").split("\n").map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      return { date: parts[0] || "", business_miles: Number(parts[1]) || 0, purpose: parts[2] || "" };
    }).filter((t) => t.business_miles > 0);
    const r = computeMileageRollup({ trips, tax_year: Number(yr.select.value) });
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    if (r.error) { milesOut.textContent = r.error; dedOut.textContent = rateOut.textContent = ""; return; }
    milesOut.textContent = fmt(r.business_miles, 1);
    dedOut.textContent = "$" + fmt(r.deductible_amount, 2);
    rateOut.textContent = "$" + r.standard_rate.toFixed(3) + " / mile";
    if (trips.length === 0) return;
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    for (const h of ["Date", "Miles", "Purpose", "Deductible"]) {
      const th = document.createElement("th"); th.textContent = h; trh.appendChild(th);
    }
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const t of trips) {
      const tr = document.createElement("tr");
      for (const v of [t.date, fmt(t.business_miles, 1), t.purpose, "$" + fmt(t.business_miles * r.standard_rate, 2)]) {
        const td = document.createElement("td"); td.textContent = String(v); tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); tableWrap.appendChild(table);
    attachCsvExport({
      table, parent: tableWrap, toolId: "mileage-rollup",
      inputProvider: () => yr.select.value + "|" + ta.input.value,
    });
  }, DEBOUNCE_MS);
  yr.select.addEventListener("input", update);
  ta.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    yr.select.value = "2025";
    ta.input.value = "2025-03-01,42,Client visit\n2025-03-04,18,Supply run";
    update();
  });
}

export const ACCOUNTING_RENDERERS = {
  "straight-line-depreciation": renderStraightLine,
  "macrs-depreciation": renderMacrs,
  "section-179": renderSection179,
  "se-tax": renderSeTax,
  "estimated-tax": renderEstimatedTax,
  "payroll-withholding": renderPayroll,
  "loan-amortization": renderAmortization,
  "breakeven": renderBreakeven,
  "sales-tax-compound": renderSalesTaxCompound,
  "inventory-turnover": renderInventoryTurnover,
  "cash-conversion-cycle": renderCcc,
  "mileage-rollup": renderMileageRollup,
};
