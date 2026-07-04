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
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeTextarea, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { attachCsvExport, attachGlossaryTooltip } from "./v5-platform.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};


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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const yoi = Math.floor(Number(year_of_interest));
  if (!Number.isFinite(yoi)) return { error: "Year of interest must be a finite year." };
  const idx = Math.max(1, Math.min(schedule.length, yoi)) - 1;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  if (!(principal > 0) || !Number.isFinite(principal)) return { error: "Principal must be a finite positive amount." };
  if (!(annual_rate_pct >= 0) || !Number.isFinite(annual_rate_pct)) return { error: "Rate must be a finite non-negative percent." };
  if (!(term_months > 0)) return { error: "Term must be positive." };
  // Bound the schedule length: term = Infinity (or an absurd magnitude)
  // would build an unbounded `rows` array and exhaust memory (v18 C-6/D-6).
  // 12,000 months = 1,000 years, far beyond any real amortization.
  if (!Number.isFinite(term_months) || term_months > 12000) return { error: "Term must be a realistic number of months." };
  const r = annual_rate_pct / 100 / 12;
  const n = Math.floor(term_months);
  const pmt = r === 0 ? principal / n : (r * principal) / (1 - Math.pow(1 + r, -n));
  let balance = principal;
  const rows = [];
  let total_interest = 0;
  let payoff_month = null;
  let date = first_payment_date ? new Date(first_payment_date + "T00:00:00Z") : null;
  // DR-10 (RC-3): a first payment on the 31st must keep the last-day-of-month
  // convention, not overflow through Date.UTC (Jan-31 -> Mar-03), which skips
  // February and permanently shifts every later payment day. Anchor on the
  // original day and clamp it to each target month's length.
  const anchorDay = date ? date.getUTCDate() : null;
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
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth();
      const nextYear = m === 11 ? y + 1 : y;
      const nextMonth = (m + 1) % 12;
      // Last day of the target month (day 0 of the month after it).
      const daysInNext = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
      date = new Date(Date.UTC(nextYear, nextMonth, Math.min(anchorDay, daysInNext)));
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cogs >= 0)) return { error: "COGS cannot be negative." };
  if (!(beginning_inventory >= 0) || !(ending_inventory >= 0)) return { error: "Inventory cannot be negative." };
  const avg = (beginning_inventory + ending_inventory) / 2;
  if (!(avg > 0)) return { error: "Average inventory must be positive." };
  if (!(period_days > 0)) return { error: "Period days must be positive." };
  const turnover = cogs / avg;
  // DR-11 (RC-2-adjacent): zero COGS gives turnover 0 and DSI = period/0 =
  // Infinity. Represent the degenerate "no goods sold" case as null, not
  // Infinity, and flag it, matching the null pattern used elsewhere here.
  const dsi = turnover > 0 ? period_days / turnover : null;
  const dsi_note = turnover > 0 ? null : "No COGS in the period; days-sales-of-inventory is not defined.";
  let comparison = null;
  if (industry_key) {
    const bench = INVENTORY_BENCHMARKS[industry_key];
    if (bench) {
      const delta = turnover - bench.turnover_median;
      comparison = { industry: industry_key, median: bench.turnover_median, delta, source: bench.source, year: bench.year };
    }
  }
  return { turnover, days_sales_of_inventory: dsi, dsi_note, average_inventory: avg, comparison };
}

export const inventoryTurnoverExample = { inputs: { cogs: 2000000, beginning_inventory: 250000, ending_inventory: 270000, period_days: 365, industry_key: "retail_general" } };

// --- 244: Cash Conversion Cycle ---

// dims: in { dso: dimensionless, dio: dimensionless, dpo: dimensionless }
//        out: { ccc_days: dimensionless, dso: dimensionless, dio: dimensionless, dpo: dimensionless, dio_contribution: dimensionless, dso_contribution: dimensionless, dpo_contribution: dimensionless }
// (CCC = DIO + DSO - DPO. All three inputs and the sum are
//  expressed as days (dimensionless count per the §7.1 count
//  convention); contributions are signed copies of the inputs.)
export function computeCashConversionCycle({ dso = 0, dio = 0, dpo = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// --- spec-v17 R.3 Home office: simplified vs actual ---
//
// IRS Pub 587 / Form 8829. The simplified method is $5/ft^2 of the office
// up to a 300 ft^2 / $1,500 cap (Rev. Proc. 2013-13, unchanged since
// 2013). The actual method prorates total home expenses by the
// office-use percent (office ft^2 / home ft^2). The tile reports the
// higher of the two so the filer can pick the larger deduction.
const HOME_OFFICE_SIMPLIFIED_RATE = 5;   // $/ft^2
const HOME_OFFICE_SIMPLIFIED_MAX_FT2 = 300;
const HOME_OFFICE_SIMPLIFIED_CAP = 1500; // $5 x 300

// dims: in { args: dimensionless } out: { simplified_deduction: dimensionless, actual_deduction: dimensionless, recommended_deduction: dimensionless, office_use_pct: dimensionless }
export function computeHomeOffice({
  office_ft2 = 0,
  home_ft2 = 0,
  total_home_expenses = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const office = Number(office_ft2);
  const home = Number(home_ft2);
  const expenses = Number(total_home_expenses) || 0;
  if (!(office > 0)) return { error: "Enter a positive home-office area (ft^2)." };
  if (!(home > 0)) return { error: "Enter a positive total home area (ft^2)." };
  if (office > home) return { error: "Home-office area cannot exceed total home area." };
  if (!(expenses >= 0)) return { error: "Total home expenses cannot be negative." };

  // Simplified method: $5/ft^2 up to 300 ft^2 ($1,500 cap).
  const simplified_ft2 = Math.min(office, HOME_OFFICE_SIMPLIFIED_MAX_FT2);
  const simplified_deduction = Math.min(simplified_ft2 * HOME_OFFICE_SIMPLIFIED_RATE, HOME_OFFICE_SIMPLIFIED_CAP);

  // Actual method: office-use percent applied to total home expenses.
  const office_use_pct = (office / home) * 100;
  const actual_deduction = (office / home) * expenses;

  const recommended_deduction = Math.max(simplified_deduction, actual_deduction);
  const recommended_method = actual_deduction > simplified_deduction ? "actual" : "simplified";

  const warnings = [];
  if (office > HOME_OFFICE_SIMPLIFIED_MAX_FT2) warnings.push("Office exceeds the 300 ft^2 simplified-method cap; the simplified deduction is fixed at $1,500. The actual method has no area cap.");
  if (office_use_pct > 50) warnings.push("Office-use percent above 50% is unusual for a home office; verify the office is used regularly and exclusively for business.");
  if (recommended_method === "actual") warnings.push("The actual method requires Form 8829 and triggers depreciation recapture on the home's eventual sale; the simplified method does not.");

  return {
    office_ft2: office,
    home_ft2: home,
    total_home_expenses: expenses,
    office_use_pct,
    simplified_deduction,
    actual_deduction,
    recommended_deduction,
    recommended_method,
    warnings,
  };
}

export const homeOfficeExample = {
  // 200 ft^2 office in a 2,000 ft^2 home, $24,000 total home expenses.
  // Simplified = 200 x $5 = $1,000. Actual = (200/2000) x 24,000 = $2,400.
  // Higher = actual $2,400.
  inputs: { office_ft2: 200, home_ft2: 2000, total_home_expenses: 24000 },
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
  // The 5-column MACRS schedule is wider than a 320px phone; the wrapper
  // owns the horizontal scroll so only the table scrolls and the page
  // never does (same contract as the loan-amortization schedule above).
  tableWrap.className = "tabular-tool";
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
    dsi.textContent = r.days_sales_of_inventory === null ? "n/a (no COGS in period)" : fmt(r.days_sales_of_inventory, 1) + " days";
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

function renderHomeOffice(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per IRS Publication 587 (Business Use of Your Home) and Form 8829. Simplified method: $5/ft^2 up to 300 ft^2 ($1,500 cap, Rev. Proc. 2013-13). Actual method: (office ft^2 / home ft^2) x total home expenses. The tile reports the higher of the two. Free at irs.gov.";
  inputRegion.appendChild(makeNotice(TAX_LAW_NOTICE));
  const office = makeNumber("Home-office area (ft^2)", "ho-office", { step: "any", min: "0", value: "200" });
  const home = makeNumber("Total home area (ft^2)", "ho-home", { step: "any", min: "0", value: "2000" });
  const expenses = makeNumber("Total home expenses ($/yr)", "ho-exp", { step: "any", min: "0", value: "24000" });
  for (const f of [office, home, expenses]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    office.input.value = "200"; home.input.value = "2000"; expenses.input.value = "24000"; update();
  });

  const oSimplified = makeOutputLine(outputRegion, "Simplified method", "ho-out-s");
  const oActual = makeOutputLine(outputRegion, "Actual method", "ho-out-a");
  const oRec = makeOutputLine(outputRegion, "Recommended (higher)", "ho-out-r");
  const oNote = makeOutputLine(outputRegion, "Notes", "ho-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeHomeOffice({
      office_ft2: readNum(office.input),
      home_ft2: readNum(home.input),
      total_home_expenses: readNum(expenses.input),
    });
    if (r.error) { oSimplified.textContent = r.error; oActual.textContent = "-"; oRec.textContent = "-"; oNote.textContent = ""; return; }
    oSimplified.textContent = "$" + fmt(r.simplified_deduction, 0) + " (" + fmt(Math.min(r.office_ft2, 300), 0) + " ft^2 x $5)";
    oActual.textContent = "$" + fmt(r.actual_deduction, 0) + " (" + fmt(r.office_use_pct, 1) + "% of $" + fmt(r.total_home_expenses, 0) + ")";
    oRec.textContent = "$" + fmt(r.recommended_deduction, 0) + " via the " + r.recommended_method + " method";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Office must be used regularly and exclusively for business. Estimate only; a CPA governs the filed return.";
  }, DEBOUNCE_MS);
  for (const f of [office, home, expenses]) f.input.addEventListener("input", update);
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
  "home-office": renderHomeOffice,
};

// ===========================================================================
// spec-v20 Phase R - three new accounting tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 R.1: Declining-balance depreciation (`declining-balance-depreciation`) ---
// DB_rate = factor*(1/life); dep = book_begin*DB_rate, floored so book never
// drops below salvage; optional straight-line crossover.
// dims: in { cost: dimensionless, salvage: dimensionless, life_yr: dimensionless, factor: dimensionless, year: dimensionless, sl_switch: dimensionless } out: { year_dep: dimensionless, book_value: dimensionless }
export function computeDecliningBalanceDepreciation({ cost = 0, salvage = 0, life_yr = 0, factor = 2, year = 1, sl_switch = true } = {}) {
  const C = Number(cost) || 0;
  const S = Number(salvage) || 0;
  const life = Math.round(Number(life_yr) || 0);
  const fac = Number(factor) || 0;
  const yr = Math.round(Number(year) || 0);
  if (!(C > 0 && Number.isFinite(C))) return { error: "Cost must be positive ($)." };
  if (S < 0 || !Number.isFinite(S)) return { error: "Salvage must be non-negative ($)." };
  if (S >= C) return { error: "Salvage must be below cost." };
  if (!(life >= 1)) return { error: "Useful life must be at least 1 year." };
  if (life > 100) return { error: "Useful life must be 100 years or fewer." };
  if (!(fac > 0 && Number.isFinite(fac))) return { error: "DB factor must be positive (1.5 or 2.0)." };
  const rate = fac / life;
  const schedule = [];
  let book = C, accumulated = 0;
  for (let y = 1; y <= life; y++) {
    const remaining = life - y + 1;
    let ddb = book * rate;
    const sl = (book - S) / remaining;
    let dep = sl_switch ? Math.max(ddb, sl) : ddb;
    if (dep > book - S) dep = book - S; // never below salvage
    if (dep < 0) dep = 0;
    accumulated += dep;
    book = book - dep;
    schedule.push({ year: y, depreciation: dep, accumulated, book_value: book });
  }
  const row = schedule[Math.min(Math.max(yr, 1), life) - 1];
  return {
    db_rate: rate,
    schedule,
    year_depreciation: row ? row.depreciation : null,
    accumulated_depreciation: row ? row.accumulated : null,
    book_value: row ? row.book_value : null,
    note: "Salvage is NOT subtracted before applying the DB rate (unlike straight-line). Pure DDB never reaches salvage without the SL switch or a final-year plug; the SL crossover is applied when enabled.",
  };
}
export const decliningBalanceDepreciationExample = { inputs: { cost: 50000, salvage: 5000, life_yr: 5, factor: 2, year: 1, sl_switch: true } };

function renderDecliningBalanceDepreciation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GAAP book depreciation - ASC 360 (Property, Plant, and Equipment), by name; distinct from the macrs-depreciation tile (IRS Pub 946 tax method). Accounting information, not advice; a CPA and current GAAP govern. Salvage is NOT subtracted before applying the DB rate.";
  const cost = makeNumber("Cost ($)", "dbd-cost", { step: "any", min: "0", value: "50000" }); cost.input.value = "50000";
  const salvage = makeNumber("Salvage ($)", "dbd-salv", { step: "any", min: "0", value: "5000" }); salvage.input.value = "5000";
  const life = makeNumber("Useful life (yr)", "dbd-life", { step: "1", min: "1", value: "5" }); life.input.value = "5";
  const factor = makeSelect("DB factor", "dbd-fac", [{ value: "2", label: "200% (double-declining)", selected: true }, { value: "1.5", label: "150%" }]);
  const year = makeNumber("Year of interest", "dbd-year", { step: "1", min: "1", value: "1" }); year.input.value = "1";
  const sw = makeCheckbox("Switch to straight-line when advantageous", "dbd-sw", true);
  for (const f of [cost, salvage, life, factor, year, sw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cost.input.value = "50000"; salvage.input.value = "5000"; life.input.value = "5"; factor.select.value = "2"; year.input.value = "1"; sw.input.checked = true; update(); });
  const oDep = makeOutputLine(outputRegion, "Year depreciation", "dbd-out-dep");
  const oBook = makeOutputLine(outputRegion, "Accumulated / book value", "dbd-out-book");
  const oNote = makeOutputLine(outputRegion, "Note", "dbd-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeDecliningBalanceDepreciation({ cost: readNum(cost.input), salvage: readNum(salvage.input), life_yr: readNum(life.input), factor: Number(factor.select.value), year: readNum(year.input), sl_switch: sw.input.checked });
    if (r.error) { oDep.textContent = r.error; oBook.textContent = ""; oNote.textContent = ""; return; }
    oDep.textContent = "$" + fmt(r.year_depreciation, 2);
    oBook.textContent = "$" + fmt(r.accumulated_depreciation, 2) + " accumulated, $" + fmt(r.book_value, 2) + " book";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cost.input, salvage.input, life.input, factor.select, year.input, sw.input]) f.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["declining-balance-depreciation"] = renderDecliningBalanceDepreciation;

// --- v20 R.2: Markup vs. margin converter (`markup-vs-margin`) ---
// markup% = (price-cost)/cost*100; margin% = (price-cost)/price*100.
// dims: in { cost: dimensionless, price: dimensionless, markup_pct: dimensionless, margin_pct: dimensionless, units: dimensionless } out: { markup_pct: dimensionless, margin_pct: dimensionless }
export function computeMarkupVsMargin({ cost = 0, price = 0, markup_pct = 0, margin_pct = 0, units = 0 } = {}) {
  let C = Number(cost) || 0;
  let P = Number(price) || 0;
  let markup = Number(markup_pct) || 0;
  let margin = Number(margin_pct) || 0;
  const n = Number(units) || 0;
  if (![C, P, markup, margin, n].every(Number.isFinite)) return { error: "Inputs must be finite numbers." };
  if (margin >= 100) return { error: "Gross margin cannot be 100% or more (price would be infinite)." };
  if (C > 0 && markup > 0) { P = C * (1 + markup / 100); }
  else if (C > 0 && margin > 0) { P = C / (1 - margin / 100); }
  else if (C > 0 && P > 0) { /* derive both below */ }
  else if (P > 0 && markup > 0) { C = P / (1 + markup / 100); }
  else if (P > 0 && margin > 0) { C = P * (1 - margin / 100); }
  else if (markup > 0) { margin = markup / (1 + markup / 100); return { markup_pct: markup, margin_pct: margin, note: "Markup and margin diverge (50% markup = 33.3% margin)." }; }
  else if (margin > 0) { markup = margin / (1 - margin / 100); return { markup_pct: markup, margin_pct: margin, note: "Markup and margin diverge (50% markup = 33.3% margin)." }; }
  else { return { error: "Enter any two of {cost, price, markup %, margin %}." }; }
  if (!(C > 0) || !(P > 0)) return { error: "Could not resolve cost and price from the inputs." };
  const profit = P - C;
  markup = profit / C * 100;
  margin = profit / P * 100;
  return {
    cost: C, price: P,
    markup_pct: Number.isFinite(markup) ? markup : null,
    margin_pct: Number.isFinite(margin) ? margin : null,
    profit_per_unit: Number.isFinite(profit) ? profit : null,
    total_profit: n > 0 && Number.isFinite(n) && Number.isFinite(profit) ? profit * n : null,
    loss: profit < 0,
    note: "Markup and margin diverge sharply (50% markup = 33.3% margin). Selling below cost is allowed but flagged. Universal cost-volume-profit identity.",
  };
}
export const markupVsMarginExample = { inputs: { cost: 60, price: 0, markup_pct: 50, margin_pct: 0, units: 0 } };

function renderMarkupVsMargin(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard managerial-accounting pricing identity (cost-volume-profit), universal public formula; AICPA / introductory managerial-accounting texts, by name. Markup and margin diverge sharply (50% markup = 33.3% margin).";
  const cost = makeNumber("Cost ($)", "mvm-cost", { step: "any", min: "0", value: "60" }); cost.input.value = "60";
  const price = makeNumber("Selling price ($)", "mvm-price", { step: "any", min: "0" });
  const markup = makeNumber("Markup %", "mvm-markup", { step: "any", value: "50" }); markup.input.value = "50";
  const margin = makeNumber("Gross margin %", "mvm-margin", { step: "any" });
  const units = makeNumber("Unit count (optional)", "mvm-units", { step: "any", min: "0" });
  for (const f of [cost, price, markup, margin, units]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cost.input.value = "60"; price.input.value = ""; markup.input.value = "50"; margin.input.value = ""; units.input.value = ""; update(); });
  const oPrice = makeOutputLine(outputRegion, "Price / cost", "mvm-out-price");
  const oPct = makeOutputLine(outputRegion, "Markup / margin", "mvm-out-pct");
  const oProfit = makeOutputLine(outputRegion, "Gross profit", "mvm-out-profit");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMarkupVsMargin({ cost: readNum(cost.input), price: readNum(price.input), markup_pct: readNum(markup.input), margin_pct: readNum(margin.input), units: readNum(units.input) });
    if (r.error) { oPrice.textContent = r.error; oPct.textContent = ""; oProfit.textContent = ""; return; }
    oPrice.textContent = r.price != null ? "$" + fmt(r.price, 2) + " price, $" + fmt(r.cost, 2) + " cost" : "";
    oPct.textContent = fmt(r.markup_pct, 1) + "% markup, " + fmt(r.margin_pct, 1) + "% margin";
    oProfit.textContent = r.profit_per_unit != null ? "$" + fmt(r.profit_per_unit, 2) + "/unit" + (r.total_profit != null ? ", $" + fmt(r.total_profit, 2) + " total" : "") + (r.loss ? " (selling at a loss)" : "") : "";
  }, DEBOUNCE_MS);
  for (const f of [cost.input, price.input, markup.input, margin.input, units.input]) f.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["markup-vs-margin"] = renderMarkupVsMargin;

// --- v20 R.3: Employer payroll tax (`employer-payroll-tax`) ---
// SS = min(wages, SS_base)*6.2%; Medicare = wages*1.45%; FUTA = min(wages,7000)*rate; SUTA = min(wages,state_base)*rate.
// dims: in { wages: dimensionless, ss_base: dimensionless, futa_base: dimensionless, futa_rate_pct: dimensionless, suta_rate_pct: dimensionless, suta_base: dimensionless } out: { total_employer_tax: dimensionless, loaded_cost: dimensionless }
export function computeEmployerPayrollTax({ wages = 0, ss_base = 0, futa_base = 7000, futa_rate_pct = 0.6, suta_rate_pct = 0, suta_base = 0 } = {}) {
  const W = Number(wages) || 0;
  const ssBase = Number(ss_base) || 0;
  const futaBase = Number(futa_base) || 0;
  const futaRate = Number(futa_rate_pct) || 0;
  const sutaRate = Number(suta_rate_pct) || 0;
  const sutaBase = Number(suta_base) || 0;
  if (!(W > 0 && Number.isFinite(W))) return { error: "Gross annual wages must be positive ($)." };
  if (!(ssBase > 0 && Number.isFinite(ssBase))) return { error: "Social Security wage base must be positive (current-year, user-supplied)." };
  if (futaRate < 0 || sutaRate < 0 || !Number.isFinite(futaRate) || !Number.isFinite(sutaRate)) return { error: "Tax rates must be non-negative." };
  const ss = Math.min(W, ssBase) * 0.062;
  const medicare = W * 0.0145;
  const futa = Math.min(W, futaBase > 0 ? futaBase : 7000) * futaRate / 100;
  const suta = sutaBase > 0 ? Math.min(W, sutaBase) * sutaRate / 100 : 0;
  const total = ss + medicare + futa + suta;
  return {
    employer_ss: Number.isFinite(ss) ? ss : null,
    employer_medicare: Number.isFinite(medicare) ? medicare : null,
    futa: Number.isFinite(futa) ? futa : null,
    suta: Number.isFinite(suta) ? suta : null,
    total_employer_tax: Number.isFinite(total) ? total : null,
    loaded_cost: Number.isFinite(total) ? W + total : null,
    futa_credit_reduction: futaRate > 0.6,
    note: (futaRate > 0.6 ? "FUTA rate above 0.6% - a credit-reduction state. " : "")
      + "SS wage base is indexed annually (user-supplied). Employer pays no Additional Medicare match. FICA 6.2% SS / 1.45% Medicare per IRS Pub 15.",
  };
}
export const employerPayrollTaxExample = { inputs: { wages: 200000, ss_base: 168600, futa_base: 7000, futa_rate_pct: 0.6, suta_rate_pct: 2.7, suta_base: 7000 } };

function renderEmployerPayrollTax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: FICA - 26 USC 3101/3111 and IRS Pub 15 (Circular E), rates 6.2% SS / 1.45% Medicare; FUTA - 26 USC 3301-3306, $7,000 wage base, 6.0% gross / 0.6% net with the state credit, IRS Form 940 - all by name. The SS wage base is indexed annually and user-supplied. Tax information, not advice. Free at irs.gov/forms-pubs and uscode.house.gov.";
  const wages = makeNumber("Gross annual wages ($)", "ept-wages", { step: "any", min: "0", value: "200000" }); wages.input.value = "200000";
  const ssBase = makeNumber("Social Security wage base ($, current year)", "ept-ssbase", { step: "any", min: "0", value: "168600" }); ssBase.input.value = "168600";
  const futaRate = makeNumber("FUTA effective rate (%)", "ept-futa", { step: "any", min: "0", value: "0.6" }); futaRate.input.value = "0.6";
  const sutaRate = makeNumber("State SUTA rate (%, optional)", "ept-suta", { step: "any", min: "0", value: "2.7" }); sutaRate.input.value = "2.7";
  const sutaBase = makeNumber("SUTA wage base ($, optional)", "ept-sutabase", { step: "any", min: "0", value: "7000" }); sutaBase.input.value = "7000";
  for (const f of [wages, ssBase, futaRate, sutaRate, sutaBase]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wages.input.value = "200000"; ssBase.input.value = "168600"; futaRate.input.value = "0.6"; sutaRate.input.value = "2.7"; sutaBase.input.value = "7000"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total employer payroll tax", "ept-out-total");
  const oBreak = makeOutputLine(outputRegion, "SS / Medicare / FUTA / SUTA", "ept-out-break");
  const oNote = makeOutputLine(outputRegion, "Note", "ept-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEmployerPayrollTax({ wages: readNum(wages.input), ss_base: readNum(ssBase.input), futa_rate_pct: readNum(futaRate.input), suta_rate_pct: readNum(sutaRate.input), suta_base: readNum(sutaBase.input) });
    if (r.error) { oTotal.textContent = r.error; oBreak.textContent = ""; oNote.textContent = ""; return; }
    oTotal.textContent = "$" + fmt(r.total_employer_tax, 2) + " (loaded cost $" + fmt(r.loaded_cost, 0) + ")";
    oBreak.textContent = "$" + fmt(r.employer_ss, 0) + " / $" + fmt(r.employer_medicare, 0) + " / $" + fmt(r.futa, 0) + " / $" + fmt(r.suta, 0);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wages.input, ssBase.input, futaRate.input, sutaRate.input, sutaBase.input]) f.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["employer-payroll-tax"] = renderEmployerPayrollTax;

// ===================== spec-v362..v364: contractor cost-recovery batch (Group R) =====================
// The bid-rate numbers a contractor builds from wages, iron, and overhead:
// the fully-burdened labor rate (v362), the equipment owning-and-operating
// hourly rate (v363), and the overhead recovery rate (v364).

// dims: in { wage: dimensionless, payroll_pct: dimensionless, wc_pct: dimensionless, liab_pct: dimensionless, benefits: dimensionless, productivity: dimensionless } out: { burden_hr: dimensionless, burdened_hr: dimensionless, burden_pct: dimensionless }
export function computeLaborBurdenRate({ wage = 0, payroll_pct = 9.15, wc_pct = 0, liab_pct = 0, benefits = 0, productivity = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(wage) || 0;
  const pr = Number(payroll_pct) || 0;
  const wc = Number(wc_pct) || 0;
  const li = Number(liab_pct) || 0;
  const ben = Number(benefits) || 0;
  const prod = Number(productivity) || 0;
  if (!(w > 0)) return { error: "Base wage must be positive ($/hr)." };
  if (!(prod > 0 && prod <= 100)) return { error: "Productivity must be over 0 and up to 100 percent." };
  const burden_hr = w * (pr + wc + li) / 100 + ben;
  const burdened_hr = (w + burden_hr) / (prod / 100);
  const burden_pct = (burdened_hr - w) / w * 100;
  return {
    burden_hr, burdened_hr, burden_pct,
    note: "Fully-burdened labor rate: the base wage plus payroll taxes (FICA + FUTA/SUTA, about 9.15% of wage), workers' comp and general liability (both % of wage, and the WC class matters), and per-hour benefits, then divided by the billable (productive) fraction of paid hours. The productivity divisor spreads the non-billable time (travel, setup, rework) over the billed hours, which is why a crew's cost rate runs well above the hourly wage. A bid-rate aid; the payroll service, the insurer's rates, and the fringe package govern the actual burden.",
  };
}
export const laborBurdenRateExample = { inputs: { wage: 25, payroll_pct: 9.15, wc_pct: 8, liab_pct: 2, benefits: 4, productivity: 85 } };
function renderLaborBurdenRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fully-burdened labor rate = (wage + payroll% + WC% + liability% + benefits) / productive fraction, standard contractor bid-rate estimating. Payroll ~9.15% (FICA 7.65 + FUTA/SUTA). The payroll service, insurer rates, and fringe package govern.";
  const wage = makeNumber("Base wage ($/hr)", "lbr-wage", { step: "any", min: "0" }); wage.input.value = "25";
  const pr = makeNumber("Payroll tax (%, FICA+FUTA/SUTA)", "lbr-pr", { step: "any", min: "0" }); pr.input.value = "9.15";
  const wc = makeNumber("Workers' comp (% of wage)", "lbr-wc", { step: "any", min: "0" });
  const li = makeNumber("General liability (% of wage)", "lbr-li", { step: "any", min: "0" });
  const ben = makeNumber("Benefits ($/hr)", "lbr-ben", { step: "any", min: "0" });
  const prod = makeNumber("Productive/billable fraction (%)", "lbr-prod", { step: "any", min: "0", max: "100" }); prod.input.value = "100";
  for (const f of [wage, pr, wc, li, ben, prod]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wage.input.value = "25"; pr.input.value = "9.15"; wc.input.value = "8"; li.input.value = "2"; ben.input.value = "4"; prod.input.value = "85"; update(); });
  const oBurden = makeOutputLine(outputRegion, "Burden (over wage)", "lbr-out-b");
  const oRate = makeOutputLine(outputRegion, "Fully-burdened rate", "lbr-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "lbr-out-note");
  const update = debounce(() => {
    const r = computeLaborBurdenRate({ wage: Number(wage.input.value) || 0, payroll_pct: Number(pr.input.value) || 0, wc_pct: Number(wc.input.value) || 0, liab_pct: Number(li.input.value) || 0, benefits: Number(ben.input.value) || 0, productivity: Number(prod.input.value) || 0 });
    if (r.error) { oBurden.textContent = r.error; oRate.textContent = "-"; oNote.textContent = ""; return; }
    oBurden.textContent = "$" + fmt(r.burden_hr, 2) + "/hr";
    oRate.textContent = "$" + fmt(r.burdened_hr, 2) + "/hr (" + fmt(r.burden_pct, 1) + "% over wage)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wage, pr, wc, li, ben, prod]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["labor-burden-rate"] = renderLaborBurdenRate;

// dims: in { purchase: dimensionless, salvage: dimensionless, life_hr: dimensionless, annual_hr: dimensionless, iit_pct: dimensionless, fuel_gph: dimensionless, fuel_price: dimensionless, maint_hr: dimensionless, wear_hr: dimensionless } out: { owning_hr: dimensionless, operating_hr: dimensionless, total_hr: dimensionless }
export function computeEquipmentHourlyRate({ purchase = 0, salvage = 0, life_hr = 0, annual_hr = 0, iit_pct = 0, fuel_gph = 0, fuel_price = 0, maint_hr = 0, wear_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pur = Number(purchase) || 0;
  const sal = Number(salvage) || 0;
  const life = Number(life_hr) || 0;
  const ann = Number(annual_hr) || 0;
  const iit = Number(iit_pct) || 0;
  if (!(pur > 0)) return { error: "Purchase price must be positive ($)." };
  if (!(sal >= 0 && sal < pur)) return { error: "Salvage must be zero or positive and less than the purchase price." };
  if (!(life > 0)) return { error: "Useful life must be positive (hours)." };
  if (!(ann > 0)) return { error: "Annual hours must be positive." };
  const deprec = (pur - sal) / life;
  const iit_hr = (iit / 100) * ((pur + sal) / 2) / ann;
  const owning_hr = deprec + iit_hr;
  const operating_hr = (Number(fuel_gph) || 0) * (Number(fuel_price) || 0) + (Number(maint_hr) || 0) + (Number(wear_hr) || 0);
  const total_hr = owning_hr + operating_hr;
  return {
    deprec_hr: deprec, iit_hr, owning_hr, operating_hr, total_hr,
    note: "Equipment owning + operating hourly rate (the CAT/AED method): owning = straight-line depreciation (purchase - salvage)/life + the interest/insurance/tax carry (% of average value / annual hours); operating = fuel (gph x price) + maintenance + tires/wear per hour. Running a machine more hours per year spreads the fixed interest-carry thinner, so an idle machine is expensive per hour. A bid-rate aid; the owner's actual costs, financing, and utilization govern.",
  };
}
export const equipmentHourlyRateExample = { inputs: { purchase: 50000, salvage: 10000, life_hr: 5000, annual_hr: 1000, iit_pct: 8, fuel_gph: 2, fuel_price: 4, maint_hr: 4, wear_hr: 1 } };
function renderEquipmentHourlyRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: equipment owning + operating hourly rate (CAT / AED cost-recovery method): owning = (purchase - salvage)/life + IIT% x avg value / annual hours; operating = fuel + maintenance + wear per hour. The owner's actual costs, financing, and utilization govern.";
  const pur = makeNumber("Purchase price ($)", "ehr-pur", { step: "any", min: "0" }); pur.input.value = "50000";
  const sal = makeNumber("Salvage value ($)", "ehr-sal", { step: "any", min: "0" }); sal.input.value = "10000";
  const life = makeNumber("Useful life (hours)", "ehr-life", { step: "any", min: "0" }); life.input.value = "5000";
  const ann = makeNumber("Hours operated per year", "ehr-ann", { step: "any", min: "0" }); ann.input.value = "1000";
  const iit = makeNumber("Interest+insurance+tax (%/yr of avg value)", "ehr-iit", { step: "any", min: "0" }); iit.input.value = "8";
  const fg = makeNumber("Fuel burn (gal/hr)", "ehr-fg", { step: "any", min: "0" }); fg.input.value = "2";
  const fp = makeNumber("Fuel price ($/gal)", "ehr-fp", { step: "any", min: "0" }); fp.input.value = "4";
  const mh = makeNumber("Maintenance ($/hr)", "ehr-mh", { step: "any", min: "0" }); mh.input.value = "4";
  const wh = makeNumber("Tires/wear ($/hr)", "ehr-wh", { step: "any", min: "0" }); wh.input.value = "1";
  for (const f of [pur, sal, life, ann, iit, fg, fp, mh, wh]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pur.input.value = "50000"; sal.input.value = "10000"; life.input.value = "5000"; ann.input.value = "1000"; iit.input.value = "8"; fg.input.value = "2"; fp.input.value = "4"; mh.input.value = "4"; wh.input.value = "1"; update(); });
  const oOwn = makeOutputLine(outputRegion, "Owning cost", "ehr-out-own");
  const oOp = makeOutputLine(outputRegion, "Operating cost", "ehr-out-op");
  const oTot = makeOutputLine(outputRegion, "Total hourly rate", "ehr-out-tot");
  const oNote = makeOutputLine(outputRegion, "Note", "ehr-out-note");
  const update = debounce(() => {
    const r = computeEquipmentHourlyRate({ purchase: Number(pur.input.value) || 0, salvage: Number(sal.input.value) || 0, life_hr: Number(life.input.value) || 0, annual_hr: Number(ann.input.value) || 0, iit_pct: Number(iit.input.value) || 0, fuel_gph: Number(fg.input.value) || 0, fuel_price: Number(fp.input.value) || 0, maint_hr: Number(mh.input.value) || 0, wear_hr: Number(wh.input.value) || 0 });
    if (r.error) { oOwn.textContent = r.error; oOp.textContent = "-"; oTot.textContent = "-"; oNote.textContent = ""; return; }
    oOwn.textContent = "$" + fmt(r.owning_hr, 2) + "/hr (deprec $" + fmt(r.deprec_hr, 2) + " + IIT $" + fmt(r.iit_hr, 2) + ")";
    oOp.textContent = "$" + fmt(r.operating_hr, 2) + "/hr";
    oTot.textContent = "$" + fmt(r.total_hr, 2) + "/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pur, sal, life, ann, iit, fg, fp, mh, wh]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["equipment-hourly-rate"] = renderEquipmentHourlyRate;

// dims: in { annual_overhead: dimensionless, basis: dimensionless, billable_hours: dimensionless, annual_direct: dimensionless, job_direct: dimensionless } out: { rate_hr: dimensionless, overhead_pct: dimensionless, job_overhead: dimensionless }
export function computeOverheadRecoveryRate({ annual_overhead = 0, basis = "per-hour", billable_hours = 0, annual_direct = 0, job_direct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const oh = Number(annual_overhead) || 0;
  if (!(oh > 0)) return { error: "Annual overhead must be positive ($)." };
  if (basis === "markup") {
    const ad = Number(annual_direct) || 0;
    if (!(ad > 0)) return { error: "Annual direct cost must be positive ($)." };
    const overhead_pct = oh / ad * 100;
    const jd = Number(job_direct) || 0;
    const job_overhead = jd > 0 ? jd * overhead_pct / 100 : null;
    return { basis: "markup", overhead_pct, job_overhead, rate_hr: null };
  }
  const bh = Number(billable_hours) || 0;
  if (!(bh > 0)) return { error: "Billable hours must be positive." };
  const rate_hr = oh / bh;
  return {
    basis: "per-hour", rate_hr, overhead_pct: null, job_overhead: null,
    note: "Overhead recovery rate: the annual indirect overhead (office, trucks, insurance, non-billable staff) spread over the billable field hours ($/hr) or over the annual direct cost (a % markup). Every billed hour, or every direct dollar, must carry its share or the overhead is not recovered. Cutting overhead lowers the recovery rate directly, widening the competitive margin - the reason overhead control wins bids. A bid-rate aid; the contractor's actual books and billable volume govern.",
  };
}
export const overheadRecoveryRateExample = { inputs: { annual_overhead: 200000, basis: "per-hour", billable_hours: 8000, annual_direct: 500000, job_direct: 10000 } };
function renderOverheadRecoveryRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: overhead recovery = annual overhead / billable hours ($/hr) or / annual direct cost (% markup), standard contractor cost-recovery. Every billed hour or direct dollar carries its share. The contractor's books and billable volume govern.";
  const oh = makeNumber("Annual overhead ($)", "orr-oh", { step: "any", min: "0" }); oh.input.value = "200000";
  const basis = makeSelect("Recovery basis", "orr-basis", [
    { value: "per-hour", label: "Per billable hour ($/hr)" },
    { value: "markup", label: "Markup on direct cost (%)" },
  ]);
  const bh = makeNumber("Annual billable hours", "orr-bh", { step: "any", min: "0" }); bh.input.value = "8000";
  const ad = makeNumber("Annual direct cost ($)", "orr-ad", { step: "any", min: "0" }); ad.input.value = "500000";
  const jd = makeNumber("Job direct cost ($, optional)", "orr-jd", { step: "any", min: "0" });
  inputRegion.appendChild(oh.wrap); inputRegion.appendChild(basis.wrap);
  for (const f of [bh, ad, jd]) inputRegion.appendChild(f.wrap);
  const oRate = makeOutputLine(outputRegion, "Recovery rate", "orr-out-rate");
  const oJob = makeOutputLine(outputRegion, "Job overhead (markup)", "orr-out-job");
  const oNote = makeOutputLine(outputRegion, "Note", "orr-out-note");
  function syncFields() {
    const isMarkup = basis.select.value === "markup";
    bh.wrap.style.display = isMarkup ? "none" : "";
    ad.wrap.style.display = isMarkup ? "" : "none";
    jd.wrap.style.display = isMarkup ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeOverheadRecoveryRate({ annual_overhead: Number(oh.input.value) || 0, basis: basis.select.value, billable_hours: Number(bh.input.value) || 0, annual_direct: Number(ad.input.value) || 0, job_direct: Number(jd.input.value) || 0 });
    if (r.error) { oRate.textContent = r.error; oJob.textContent = "-"; oNote.textContent = ""; return; }
    if (r.basis === "markup") {
      oRate.textContent = fmt(r.overhead_pct, 1) + "% markup on direct cost";
      oJob.textContent = r.job_overhead == null ? "(enter a job direct cost)" : "$" + fmt(r.job_overhead, 0) + " overhead on this job";
      oNote.textContent = "Overhead recovery = annual overhead / annual direct cost, applied as a markup to a job's direct cost. Cutting overhead lowers the markup directly.";
      return;
    }
    oRate.textContent = "$" + fmt(r.rate_hr, 2) + "/billable hour";
    oJob.textContent = "(markup basis only)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { oh.input.value = "200000"; basis.select.value = "per-hour"; bh.input.value = "8000"; ad.input.value = "500000"; jd.input.value = ""; syncFields(); update(); });
  basis.select.addEventListener("change", () => { syncFields(); update(); });
  for (const f of [oh, bh, ad, jd]) f.input.addEventListener("input", update);
  syncFields();
}
ACCOUNTING_RENDERERS["overhead-recovery-rate"] = renderOverheadRecoveryRate;

// ===================== spec-v390..v392: contractor-billing trio (Group R) =====================

// dims: in { contract_usd: dimensionless, cost_to_date_usd: dimensionless, est_total_cost_usd: dimensionless, billed_to_date_usd: dimensionless } out: { pct_complete: dimensionless, earned_revenue: dimensionless, over_under: dimensionless }
export function computeWipPercentComplete({ contract_usd = 0, cost_to_date_usd = 0, est_total_cost_usd = 0, billed_to_date_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const contract = Number(contract_usd) || 0;
  const cost = Number(cost_to_date_usd) || 0;
  const est = Number(est_total_cost_usd) || 0;
  const billed = Number(billed_to_date_usd) || 0;
  if (!(contract > 0)) return { error: "Contract value must be positive (USD)." };
  if (!(est > 0)) return { error: "Estimated total cost must be positive (USD)." };
  if (cost < 0 || billed < 0) return { error: "Cost and billed amounts must be non-negative (USD)." };
  const raw_pct = cost / est;
  const pct_complete = Math.min(raw_pct, 1.0);
  const overrun = raw_pct > 1.0;
  const earned_revenue = pct_complete * contract;
  const over_under = earned_revenue - billed;
  return {
    pct_complete, earned_revenue, over_under, overrun,
    underbilled: over_under >= 0,
    note: "Cost-to-cost percent-complete (POC) revenue recognition: percent complete = cost to date / estimated total cost (capped at 100%), earned revenue = percent complete x contract value, and over/under billing = earned revenue - billed to date. A positive figure is underbilled (a costs-in-excess asset - work done but not yet billed); a negative figure is overbilled (a billings-in-excess liability - cash collected against future work). Persistent overbilling can mask a job going bad. A management aid; the CPA-prepared WIP schedule governs.",
  };
}
export const wipPercentCompleteExample = { inputs: { contract_usd: 500000, cost_to_date_usd: 300000, est_total_cost_usd: 400000, billed_to_date_usd: 350000 } };
function renderWipPercentComplete(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cost-to-cost percent-of-completion revenue recognition (construction accounting, ASC 606 / AICPA construction guide): percent complete = cost to date / estimated total cost, earned revenue = percent complete x contract, over/under billing = earned revenue - billed. A management aid; the CPA-prepared WIP schedule governs.";
  const contract = makeNumber("Contract value (USD)", "wip-c", { step: "any", min: "0" }); contract.input.value = "500000";
  const cost = makeNumber("Cost to date (USD)", "wip-cost", { step: "any", min: "0" }); cost.input.value = "300000";
  const est = makeNumber("Estimated total cost (USD)", "wip-est", { step: "any", min: "0" }); est.input.value = "400000";
  const billed = makeNumber("Billed to date (USD)", "wip-b", { step: "any", min: "0" }); billed.input.value = "350000";
  for (const f of [contract, cost, est, billed]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { contract.input.value = "500000"; cost.input.value = "300000"; est.input.value = "400000"; billed.input.value = "350000"; update(); });
  const oPct = makeOutputLine(outputRegion, "Percent complete", "wip-out-pct");
  const oEarn = makeOutputLine(outputRegion, "Earned revenue", "wip-out-earn");
  const oOU = makeOutputLine(outputRegion, "Over / under billing", "wip-out-ou");
  const oNote = makeOutputLine(outputRegion, "Note", "wip-out-n");
  const update = debounce(() => {
    const r = computeWipPercentComplete({ contract_usd: Number(contract.input.value) || 0, cost_to_date_usd: Number(cost.input.value) || 0, est_total_cost_usd: Number(est.input.value) || 0, billed_to_date_usd: Number(billed.input.value) || 0 });
    if (r.error) { oPct.textContent = r.error; oEarn.textContent = "-"; oOU.textContent = "-"; oNote.textContent = ""; return; }
    oPct.textContent = fmt(r.pct_complete * 100, 1) + "%" + (r.overrun ? " (cost past estimate -- overrun)" : "");
    oEarn.textContent = "$" + fmt(r.earned_revenue, 0);
    oOU.textContent = (r.underbilled ? "+$" + fmt(r.over_under, 0) + " underbilled (asset)" : "-$" + fmt(Math.abs(r.over_under), 0) + " overbilled (liability)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [contract, cost, est, billed]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["wip-percent-complete"] = renderWipPercentComplete;

// dims: in { direct_cost_usd: dimensionless, overhead_pct: dimensionless, profit_pct: dimensionless, current_contract_usd: dimensionless } out: { price: dimensionless, markup: dimensionless, margin_pct: dimensionless, new_contract: dimensionless }
export function computeChangeOrderMarkup({ direct_cost_usd = 0, overhead_pct = 10, profit_pct = 10, current_contract_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const direct = Number(direct_cost_usd) || 0;
  const oh = Number(overhead_pct) || 0;
  const profit = Number(profit_pct) || 0;
  const current = Number(current_contract_usd) || 0;
  if (!(direct > 0)) return { error: "Direct cost must be positive (USD)." };
  if (oh < 0 || profit < 0) return { error: "Overhead and profit rates must be non-negative (%)." };
  if (current < 0) return { error: "Current contract value must be non-negative (USD)." };
  const price = direct * (1 + oh / 100) * (1 + profit / 100);
  const markup = price - direct;
  const margin_pct = price > 0 ? markup / price * 100 : 0;
  const new_contract = current > 0 ? current + price : null;
  const additive_price = direct * (1 + (oh + profit) / 100);
  return {
    price, markup, margin_pct, new_contract, additive_price,
    note: "Change-order price with overhead and profit compounded: price = direct cost x (1 + OH%) x (1 + profit%). The compounded method (OH then profit) is standard and yields slightly more than the additive direct x (1 + OH% + profit%); which one applies is set by the contract's general conditions. Direct cost is labor + material + equipment for the added scope. Margin here is markup / price (the gross margin), not the markup rate. A pricing aid; the contract terms and the owner's approval govern.",
  };
}
export const changeOrderMarkupExample = { inputs: { direct_cost_usd: 10000, overhead_pct: 10, profit_pct: 10, current_contract_usd: 500000 } };
function renderChangeOrderMarkup(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Change-order pricing with overhead and profit (construction estimating practice / AIA G701): price = direct cost x (1 + overhead%) x (1 + profit%), the standard compounded markup (the additive direct x (1 + OH% + profit%) is slightly less). The contract's general conditions set the allowed markup and method. A pricing aid; the contract terms and owner approval govern.";
  const direct = makeNumber("Added direct cost (USD)", "com-d", { step: "any", min: "0" }); direct.input.value = "10000";
  const oh = makeNumber("Overhead markup (%)", "com-oh", { step: "any", min: "0" }); oh.input.value = "10";
  const profit = makeNumber("Profit markup (%)", "com-p", { step: "any", min: "0" }); profit.input.value = "10";
  const current = makeNumber("Current contract total (USD, optional)", "com-c", { step: "any", min: "0" }); current.input.value = "500000";
  for (const f of [direct, oh, profit, current]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { direct.input.value = "10000"; oh.input.value = "10"; profit.input.value = "10"; current.input.value = "500000"; update(); });
  const oPrice = makeOutputLine(outputRegion, "Change-order price", "com-out-price");
  const oMarkup = makeOutputLine(outputRegion, "Markup (margin)", "com-out-markup");
  const oNew = makeOutputLine(outputRegion, "New contract total", "com-out-new");
  const oNote = makeOutputLine(outputRegion, "Note", "com-out-n");
  const update = debounce(() => {
    const r = computeChangeOrderMarkup({ direct_cost_usd: Number(direct.input.value) || 0, overhead_pct: Number(oh.input.value) || 0, profit_pct: Number(profit.input.value) || 0, current_contract_usd: Number(current.input.value) || 0 });
    if (r.error) { oPrice.textContent = r.error; oMarkup.textContent = "-"; oNew.textContent = "-"; oNote.textContent = ""; return; }
    oPrice.textContent = "$" + fmt(r.price, 0) + " (additive method $" + fmt(r.additive_price, 0) + ")";
    oMarkup.textContent = "$" + fmt(r.markup, 0) + " (" + fmt(r.margin_pct, 1) + "% gross margin)";
    oNew.textContent = r.new_contract == null ? "(enter a current contract total)" : "$" + fmt(r.new_contract, 0);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [direct, oh, profit, current]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["change-order-markup"] = renderChangeOrderMarkup;

// dims: in { work_this_period_usd: dimensionless, retainage_pct: dimensionless, prior_retained_usd: dimensionless } out: { retention_this: dimensionless, net_payment: dimensionless, cumulative_ret: dimensionless }
export function computeRetainageTracker({ work_this_period_usd = 0, retainage_pct = 10, prior_retained_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const work = Number(work_this_period_usd) || 0;
  const rate = Number(retainage_pct) || 0;
  const prior = Number(prior_retained_usd) || 0;
  if (!(work > 0)) return { error: "Work completed this period must be positive (USD)." };
  if (!(rate >= 0 && rate <= 100)) return { error: "Retainage rate must be between 0 and 100%." };
  if (prior < 0) return { error: "Prior retained amount must be non-negative (USD)." };
  const retention_this = work * (rate / 100);
  const net_payment = work - retention_this;
  const cumulative_ret = prior + retention_this;
  return {
    retention_this, net_payment, cumulative_ret,
    note: "Retainage on a progress draw (AIA G702/G703): retention this period = work completed x retainage rate, net payment = work - retention, cumulative retention = prior retained + this period's retention. Retainage is money earned but withheld until the work is accepted (often released at substantial completion, sometimes reduced at 50% complete); a lower rate frees cash flow, which is why it is negotiated. A billing aid; the contract and the owner's certified payment govern.",
  };
}
export const retainageTrackerExample = { inputs: { work_this_period_usd: 100000, retainage_pct: 10, prior_retained_usd: 40000 } };
function renderRetainageTracker(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Retainage on a progress payment (AIA G702 Application and Certificate for Payment / G703 Continuation Sheet): retention this period = work completed x retainage rate, net payment = work - retention, cumulative retention = prior + this period. A billing aid; the contract terms and the owner's certified payment govern.";
  const work = makeNumber("Work this period (USD)", "ret-w", { step: "any", min: "0" }); work.input.value = "100000";
  const rate = makeNumber("Retainage rate (%)", "ret-r", { step: "any", min: "0", max: "100" }); rate.input.value = "10";
  const prior = makeNumber("Prior retained (USD)", "ret-p", { step: "any", min: "0" }); prior.input.value = "40000";
  for (const f of [work, rate, prior]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { work.input.value = "100000"; rate.input.value = "10"; prior.input.value = "40000"; update(); });
  const oRet = makeOutputLine(outputRegion, "Retention this draw", "ret-out-ret");
  const oNet = makeOutputLine(outputRegion, "Net payment", "ret-out-net");
  const oCum = makeOutputLine(outputRegion, "Cumulative retention", "ret-out-cum");
  const oNote = makeOutputLine(outputRegion, "Note", "ret-out-n");
  const update = debounce(() => {
    const r = computeRetainageTracker({ work_this_period_usd: Number(work.input.value) || 0, retainage_pct: Number(rate.input.value) || 0, prior_retained_usd: Number(prior.input.value) || 0 });
    if (r.error) { oRet.textContent = r.error; oNet.textContent = "-"; oCum.textContent = "-"; oNote.textContent = ""; return; }
    oRet.textContent = "$" + fmt(r.retention_this, 0);
    oNet.textContent = "$" + fmt(r.net_payment, 0);
    oCum.textContent = "$" + fmt(r.cumulative_ret, 0);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [work, rate, prior]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["retainage-tracker"] = renderRetainageTracker;

// ===================== spec-v444..v446: contractor-cost trio (Group R) =====================

// dims: in { contract_usd: dimensionless, rate1_per_k: dimensionless, rate2_per_k: dimensionless, rate3_per_k: dimensionless } out: { premium_usd: dimensionless, effective_rate: dimensionless }
export function computeSuretyBondPremium({ contract_usd = 0, rate1_per_k = 25, rate2_per_k = 15, rate3_per_k = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const contract = Number(contract_usd) || 0;
  const r1 = Number(rate1_per_k) || 0;
  const r2 = Number(rate2_per_k) || 0;
  const r3 = Number(rate3_per_k) || 0;
  if (!(contract > 0)) return { error: "Contract value must be positive (USD)." };
  if (r1 < 0 || r2 < 0 || r3 < 0) return { error: "Rates must be non-negative (USD per $1,000)." };
  const band1 = Math.min(contract, 100000) / 1000 * r1;
  const band2 = Math.min(Math.max(contract - 100000, 0), 400000) / 1000 * r2;
  const band3 = Math.max(contract - 500000, 0) / 1000 * r3;
  const premium_usd = band1 + band2 + band3;
  const effective_rate = premium_usd / contract;
  return {
    band1, band2, band3, premium_usd, effective_rate,
    note: "Surety bond premium on a tiered (sliding-scale) rate: the premium is charged per $1,000 of contract value in bands - a common schedule is $25/thousand on the first $100,000, $15 on the next $400,000, and $10 above $500,000 - so the effective rate falls as the contract grows and the cheaper top band dominates. Rates depend on the contractor's financial strength, experience, and the surety's underwriting, and a small or new contractor pays more. The premium is a project cost that belongs in the bid. A budgeting aid; the surety's actual rate schedule and underwriting govern.",
  };
}
export const suretyBondPremiumExample = { inputs: { contract_usd: 500000, rate1_per_k: 25, rate2_per_k: 15, rate3_per_k: 10 } };
function renderSuretyBondPremium(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Surety bond premium (tiered rate, surety-industry practice): charged per $1,000 of contract in bands (e.g. $25/$15/$10 per thousand on the first $100k / next $400k / above $500k). The effective rate falls as the contract grows. A budgeting aid; the surety's rate schedule and underwriting govern.";
  const c = makeNumber("Contract value to bond ($)", "sbp-c", { step: "any", min: "0" }); c.input.value = "500000";
  const r1 = makeNumber("Rate on first $100k ($/thousand)", "sbp-r1", { step: "any", min: "0" }); r1.input.value = "25";
  const r2 = makeNumber("Rate on next $400k ($/thousand)", "sbp-r2", { step: "any", min: "0" }); r2.input.value = "15";
  const r3 = makeNumber("Rate above $500k ($/thousand)", "sbp-r3", { step: "any", min: "0" }); r3.input.value = "10";
  for (const f of [c, r1, r2, r3]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "500000"; r1.input.value = "25"; r2.input.value = "15"; r3.input.value = "10"; update(); });
  const oP = makeOutputLine(outputRegion, "Bond premium", "sbp-out-p");
  const oR = makeOutputLine(outputRegion, "Effective rate", "sbp-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "sbp-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSuretyBondPremium({ contract_usd: readNum(c.input), rate1_per_k: readNum(r1.input), rate2_per_k: readNum(r2.input), rate3_per_k: readNum(r3.input) });
    if (r.error) { oP.textContent = r.error; oR.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = "$" + fmt(r.premium_usd, 0);
    oR.textContent = fmt(r.effective_rate * 100, 2) + "% of the contract";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [c, r1, r2, r3]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["surety-bond-premium"] = renderSuretyBondPremium;

// dims: in { payroll_usd: dimensionless, class_rate: dimensionless, emr: dimensionless } out: { manual_premium: dimensionless, modified_premium: dimensionless, emr_swing: dimensionless }
export function computeWorkersCompEmrPremium({ payroll_usd = 0, class_rate = 0, emr = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const payroll = Number(payroll_usd) || 0;
  const rate = Number(class_rate) || 0;
  const mod = Number(emr) || 0;
  if (!(payroll > 0)) return { error: "Payroll must be positive (USD)." };
  if (!(rate > 0)) return { error: "Class rate must be positive (USD per $100)." };
  if (!(mod > 0)) return { error: "Experience mod (EMR) must be positive." };
  const manual_premium = payroll / 100 * rate;
  const modified_premium = manual_premium * mod;
  const emr_swing = manual_premium * (1 - mod);
  const cost_per_100 = modified_premium / (payroll / 100);
  return {
    manual_premium, modified_premium, emr_swing, cost_per_100, credit: mod < 1,
    note: "Workers-compensation premium and the experience modification rate (EMR): the manual premium = payroll / 100 x the class rate (the rate per $100 of payroll for the job classification), and the actual premium = manual premium x the EMR, the multiplier the rating bureau assigns from the contractor's claims history versus its class peers. An EMR below 1.0 is a credit (a safety record better than average), above 1.0 a debit (worse), and the swing is manual premium x (1 - EMR). A low EMR also opens doors on bid lists that require one below a threshold, so safety pays twice. A budgeting aid; the rating bureau's EMR and the insurer's rates govern.",
  };
}
export const workersCompEmrPremiumExample = { inputs: { payroll_usd: 500000, class_rate: 8.00, emr: 0.85 } };
function renderWorkersCompEmrPremium(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Workers-comp premium and experience mod (NCCI / state rating-bureau practice): manual premium = payroll/100 x class rate, actual premium = manual x EMR (an EMR below 1.0 is a credit, above 1.0 a debit). A budgeting aid; the rating bureau's EMR and the insurer's rates govern.";
  const p = makeNumber("Annual payroll for the class ($)", "wce-p", { step: "any", min: "0" }); p.input.value = "500000";
  const rate = makeNumber("Manual class rate ($/$100 payroll)", "wce-r", { step: "any", min: "0" }); rate.input.value = "8.00";
  const emr = makeNumber("Experience mod (EMR)", "wce-e", { step: "any", min: "0" }); emr.input.value = "0.85";
  for (const f of [p, rate, emr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "500000"; rate.input.value = "8.00"; emr.input.value = "0.85"; update(); });
  const oM = makeOutputLine(outputRegion, "Manual / modified premium", "wce-out-m");
  const oS = makeOutputLine(outputRegion, "EMR swing", "wce-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "wce-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWorkersCompEmrPremium({ payroll_usd: readNum(p.input), class_rate: readNum(rate.input), emr: readNum(emr.input) });
    if (r.error) { oM.textContent = r.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oM.textContent = "$" + fmt(r.manual_premium, 0) + " -> $" + fmt(r.modified_premium, 0) + " ($" + fmt(r.cost_per_100, 2) + "/$100)";
    oS.textContent = (r.credit ? "$" + fmt(r.emr_swing, 0) + " credit (EMR < 1.0)" : "$" + fmt(-r.emr_swing, 0) + " debit (EMR > 1.0)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [p, rate, emr]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["workers-comp-emr-premium"] = renderWorkersCompEmrPremium;

// dims: in { base_wage_hr: dimensionless, fringe_hr: dimensionless, payroll_tax: dimensionless } out: { package_hr: dimensionless, cash_cost_hr: dimensionless, plan_cost_hr: dimensionless, savings_hr: dimensionless }
export function computePrevailingWageFringe({ base_wage_hr = 0, fringe_hr = 0, payroll_tax = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const base = Number(base_wage_hr) || 0;
  const fringe = Number(fringe_hr) || 0;
  const tax = Number(payroll_tax) || 0;
  if (!(base > 0)) return { error: "Base wage must be positive (USD/hr)." };
  if (fringe < 0) return { error: "Fringe rate must be non-negative (USD/hr)." };
  if (tax < 0) return { error: "Payroll-tax rate must be non-negative (%)." };
  const package_hr = base + fringe;
  const cash_cost_hr = package_hr + package_hr * tax / 100;
  const plan_cost_hr = package_hr + base * tax / 100;
  const savings_hr = fringe * tax / 100;
  return {
    package_hr, cash_cost_hr, plan_cost_hr, savings_hr,
    note: "Prevailing-wage package, cash vs bona-fide fringe: the required package = the base hourly wage + the fringe rate from the wage determination (Davis-Bacon / state). If the fringe is paid as cash on the paycheck it becomes taxable wages, so the employer also pays payroll taxes (and any wage-based workers-comp) on it; if it is funded through a bona-fide benefit plan (health, retirement, apprenticeship) it is not wages, so the payroll-tax burden on the fringe portion disappears. The saving = the fringe x the wage-based burden rate per hour, a real reduction in the labor cost of a public job with no cut to the worker's total package. A budgeting aid; the wage determination, the plan's bona-fide status, and the compliance rules govern.",
  };
}
export const prevailingWageFringeExample = { inputs: { base_wage_hr: 35, fringe_hr: 15, payroll_tax: 7.65 } };
function renderPrevailingWageFringe(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Prevailing-wage fringe (Davis-Bacon / state determination): package = base wage + fringe; paying the fringe as cash makes it taxable wages, funding it through a bona-fide plan does not, saving fringe x the wage-based burden per hour. A budgeting aid; the wage determination and the plan's bona-fide status govern.";
  const base = makeNumber("Base hourly wage ($/hr)", "pwf-b", { step: "any", min: "0" }); base.input.value = "35";
  const fringe = makeNumber("Fringe rate from the determination ($/hr)", "pwf-f", { step: "any", min: "0" }); fringe.input.value = "15";
  const tax = makeNumber("Wage-based burden (payroll tax + comp, %)", "pwf-t", { step: "any", min: "0" }); tax.input.value = "7.65";
  for (const f of [base, fringe, tax]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { base.input.value = "35"; fringe.input.value = "15"; tax.input.value = "7.65"; update(); });
  const oP = makeOutputLine(outputRegion, "Required package", "pwf-out-p");
  const oC = makeOutputLine(outputRegion, "Cash vs plan cost", "pwf-out-c");
  const oS = makeOutputLine(outputRegion, "Saving via a bona-fide plan", "pwf-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "pwf-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePrevailingWageFringe({ base_wage_hr: readNum(base.input), fringe_hr: readNum(fringe.input), payroll_tax: readNum(tax.input) });
    if (r.error) { oP.textContent = r.error; oC.textContent = "-"; oS.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = "$" + fmt(r.package_hr, 2) + "/hr (base + fringe)";
    oC.textContent = "$" + fmt(r.cash_cost_hr, 3) + " cash vs $" + fmt(r.plan_cost_hr, 3) + " plan, per hour";
    oS.textContent = "$" + fmt(r.savings_hr, 2) + "/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [base, fringe, tax]) f.input.addEventListener("input", update);
}
ACCOUNTING_RENDERERS["prevailing-wage-fringe"] = renderPrevailingWageFringe;
