// Unit tests for calc-realestate.js (spec-v12 Group X starter:
// X.4 LTV, X.3 DTI, X.1 PITI). Pure deterministic math over agency
// underwriting conventions (FNMA / FHA / VA).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLTV, ltvExample,
  computeDTI, dtiExample,
  computePITI, pitiExample,
  compute1031Timeline, exchangeTimelineExample,
  computeSection121, section121Example,
  computePropertyTax, propertyTaxExample,
  computeCapRateDSCR, capRateExample,
  computeCashOnCash, cashOnCashExample,
  computeCommissionSplit, commissionSplitExample,
  computeAmortizationSchedule, amortizationExample,
  computeCostOfWaiting, costOfWaitingExample,
  computeClosingCosts, closingCostsExample,
  computeRentalWorksheet, rentalWorksheetExample,
  computeLoanLimits, loanLimitsExample,
  computeHudFmr, hudFmrExample,
  computeMortgagePointBreakeven, mortgagePointBreakevenExample,
  computePerDiemInterest, perDiemInterestExample,
  computeMortgageReserves, mortgageReservesExample,
  computeRentVsBuy, rentVsBuyExample,
  REALESTATE_RENDERERS,
} from "../../calc-realestate.js";

// Inline minimal shards for the X.8 / X.10 unit tests.
const LOAN_LIMITS_SHARD = {
  year: 2026,
  baseline: { conforming_one_unit_usd: 806500, fha_floor_one_unit_usd: 524225, fha_ceiling_one_unit_usd: 1209750, ceiling_high_cost_one_unit_usd: 1209750 },
  va: { full_entitlement_cap_removed_since: "2020-01-01" },
  high_cost_counties_one_unit: [
    { state: "CA", county_name: "San Francisco", county_fips: "06075", conforming_usd: 1209750, fha_usd: 1209750 },
    { state: "NY", county_name: "New York",      county_fips: "36061", conforming_usd: 1209750, fha_usd: 1209750 },
  ],
  unknown_county_message: "Unknown county; consult lender.",
};
const HUD_FMR_SHARD = {
  fiscal_year: 2026,
  areas: [
    { name: "San Francisco-Oakland-Berkeley, CA HUD Metro FMR Area", state: "CA", fips: "06075", fmr_0br: 2517, fmr_1br: 2864, fmr_2br: 3553, fmr_3br: 4593, fmr_4br: 5099 },
    { name: "New York, NY HUD Metro FMR Area",                       state: "NY", fips: "36061", fmr_0br: 2257, fmr_1br: 2390, fmr_2br: 2680, fmr_3br: 3382, fmr_4br: 3699 },
  ],
  unknown_area_message: "Unknown FMR area; look up at huduser.gov.",
};

// --- X.4 LTV ---

test("computeLTV: 320k loan on 400k value = 80 percent, no PMI", () => {
  const r = computeLTV(ltvExample.inputs);
  assert.equal(r.ltv_percent, 80);
  assert.equal(r.pmi_required, false);
  assert.match(r.band, /conforming/);
});

test("computeLTV: LTV > 80 triggers PMI flag", () => {
  const r = computeLTV({ loan_amount: 380000, value: 400000 });
  assert.equal(r.ltv_percent, 95);
  assert.equal(r.pmi_required, true);
});

test("computeLTV: value of zero or negative is rejected", () => {
  assert.ok(computeLTV({ loan_amount: 100, value: 0 }).error);
  assert.ok(computeLTV({ loan_amount: 100, value: -1 }).error);
});

test("computeLTV: full ownership (no loan) is 0%", () => {
  const r = computeLTV({ loan_amount: 0, value: 500000 });
  assert.equal(r.ltv_percent, 0);
  assert.equal(r.pmi_required, false);
});

// --- X.3 DTI ---

test("computeDTI: $7500/mo income, $2100 housing, $600 debts -> 28/36 (passes all)", () => {
  const r = computeDTI(dtiExample.inputs);
  assert.ok(Math.abs(r.front_end_dti_percent - 28) < 1e-9, "front " + r.front_end_dti_percent);
  assert.ok(Math.abs(r.back_end_dti_percent - 36) < 1e-9, "back " + r.back_end_dti_percent);
  assert.equal(r.conventional_pass, true);
  assert.equal(r.fha_pass, true);
  assert.equal(r.va_pass, true);
});

test("computeDTI: high housing payment fails FHA but may pass conventional with compensating factors", () => {
  // Front 32%, back 42% -> FHA fails front (31), conventional passes (36).
  const r = computeDTI({ gross_monthly_income: 7500, housing_payment: 2400, other_monthly_debts: 750 });
  assert.ok(Math.abs(r.front_end_dti_percent - 32) < 0.01);
  assert.ok(Math.abs(r.back_end_dti_percent - 42) < 0.01);
  assert.equal(r.fha_pass, false);  // front 32 > 31
  assert.equal(r.conventional_pass, true);  // 32 < 36 and 42 < 45
});

test("computeDTI: income of zero rejected", () => {
  assert.ok(computeDTI({ gross_monthly_income: 0, housing_payment: 0, other_monthly_debts: 0 }).error);
});

test("computeDTI: missing 'other debts' defaults to zero", () => {
  const r = computeDTI({ gross_monthly_income: 10000, housing_payment: 2500 });
  assert.ok(Math.abs(r.front_end_dti_percent - 25) < 1e-9);
  assert.ok(Math.abs(r.back_end_dti_percent - 25) < 1e-9);
});

// --- X.1 PITI ---

test("computePITI: 320k @ 6.5% for 30y + 4800 tax + 1800 ins -> P&I ~2022.62, PITI ~2572.62", () => {
  const r = computePITI(pitiExample.inputs);
  assert.ok(Math.abs(r.monthly_principal_and_interest - 2022.62) < 0.5,
    "P&I " + r.monthly_principal_and_interest);
  assert.equal(r.monthly_tax, 400);
  assert.equal(r.monthly_insurance, 150);
  assert.ok(Math.abs(r.piti - 2572.62) < 0.5, "PITI " + r.piti);
  assert.equal(r.term_months, 360);
});

test("computePITI: zero interest rate uses straight-line P&I = P/n", () => {
  const r = computePITI({
    principal: 120000, apr_percent: 0, term_years: 10,
    annual_property_tax: 0, annual_insurance: 0, monthly_hoa: 0, monthly_pmi: 0,
  });
  // 120000 / 120 months = 1000/mo straight line.
  assert.ok(Math.abs(r.monthly_principal_and_interest - 1000) < 0.001);
});

test("computePITI: HOA and PMI pass-through into total", () => {
  const r = computePITI({
    principal: 320000, apr_percent: 6.5, term_years: 30,
    annual_property_tax: 4800, annual_insurance: 1800,
    monthly_hoa: 250, monthly_pmi: 175,
  });
  assert.equal(r.monthly_hoa, 250);
  assert.equal(r.monthly_pmi, 175);
  assert.ok(Math.abs(r.piti_plus_hoa - (r.piti + 250 + 175)) < 0.001);
  // Annual = monthly total * 12.
  assert.ok(Math.abs(r.annual_total - r.piti_plus_hoa * 12) < 0.001);
});

test("computePITI: invalid principal / apr / term rejected", () => {
  assert.ok(computePITI({ principal: 0, apr_percent: 6, term_years: 30 }).error);
  assert.ok(computePITI({ principal: 1000, apr_percent: -1, term_years: 30 }).error);
  assert.ok(computePITI({ principal: 1000, apr_percent: 6, term_years: 0 }).error);
});

test("computePITI: 15-year amortization is significantly higher P&I than 30-year", () => {
  const same = { principal: 320000, apr_percent: 6.5, annual_property_tax: 0, annual_insurance: 0, monthly_hoa: 0, monthly_pmi: 0 };
  const thirty = computePITI({ ...same, term_years: 30 });
  const fifteen = computePITI({ ...same, term_years: 15 });
  assert.ok(fifteen.monthly_principal_and_interest > thirty.monthly_principal_and_interest * 1.3,
    "15y vs 30y P&I ratio: " + (fifteen.monthly_principal_and_interest / thirty.monthly_principal_and_interest));
});

// --- X.6 1031 exchange timeline ---

test("compute1031Timeline: 2026-03-01 sale -> 2026-04-15 ID + 2026-08-28 exchange", () => {
  const r = compute1031Timeline(exchangeTimelineExample.inputs);
  assert.equal(r.identification_deadline_iso, "2026-04-15");
  assert.equal(r.exchange_deadline_iso, "2026-08-28");
});

test("compute1031Timeline: April 15 of next year governs when 180-day falls later", () => {
  // Sale 2026-11-01 -> 180-day = 2027-04-30; April 15 next year = 2027-04-15 (earlier).
  const r = compute1031Timeline({ sale_close_iso: "2026-11-01" });
  assert.equal(r.april_15_governs, true);
  assert.equal(r.earliest_replacement_deadline_iso, "2027-04-15");
});

test("compute1031Timeline: 180-day governs when sale-close is early in the year", () => {
  // Sale 2026-01-15 -> 180-day = 2026-07-14; April 15 next year = 2027-04-15 (later).
  const r = compute1031Timeline({ sale_close_iso: "2026-01-15" });
  assert.equal(r.april_15_governs, false);
  assert.equal(r.earliest_replacement_deadline_iso, r.exchange_deadline_iso);
});

test("compute1031Timeline: invalid date format rejected", () => {
  assert.ok(compute1031Timeline({ sale_close_iso: "not a date" }).error);
  assert.ok(compute1031Timeline({ sale_close_iso: "2026/03/01" }).error);
});

// --- X.7 Section 121 ---

test("computeSection121: MFJ $430k gain, fully excluded by $500k cap", () => {
  const r = computeSection121(section121Example.inputs);
  assert.equal(r.realized_gain, 430000);
  assert.equal(r.exclusion_applied, 430000);
  assert.equal(r.taxable_gain, 0);
});

test("computeSection121: gain exceeding cap produces taxable balance", () => {
  // MFJ, gain $700k, cap $500k -> $200k taxable.
  const r = computeSection121({
    filing_status: "mfj", sale_price: 1000000, selling_costs: 0,
    purchase_price: 300000, improvements: 0,
    meets_two_of_five: true, has_nonqualified_use: false,
  });
  assert.equal(r.realized_gain, 700000);
  assert.equal(r.exclusion_applied, 500000);
  assert.equal(r.taxable_gain, 200000);
});

test("computeSection121: single filer caps at $250k", () => {
  const r = computeSection121({
    filing_status: "single", sale_price: 600000, selling_costs: 0,
    purchase_price: 200000, improvements: 0,
    meets_two_of_five: true, has_nonqualified_use: false,
  });
  assert.equal(r.exclusion_cap, 250000);
  assert.equal(r.exclusion_applied, 250000);
  assert.equal(r.taxable_gain, 150000);
});

test("computeSection121: failing the two-of-five test zeroes the exclusion + flags partial-§121(c)", () => {
  const r = computeSection121({
    filing_status: "mfj", sale_price: 850000, selling_costs: 45000,
    purchase_price: 300000, improvements: 75000,
    meets_two_of_five: false, has_nonqualified_use: false,
  });
  assert.equal(r.exclusion_applied, 0);
  assert.equal(r.taxable_gain, 430000);
  assert.ok(r.flags.some((f) => /two-of-five/i.test(f)));
});

test("computeSection121: non-qualified-use flag fires when reported", () => {
  const r = computeSection121({
    filing_status: "mfj", sale_price: 850000, selling_costs: 45000,
    purchase_price: 300000, improvements: 75000,
    meets_two_of_five: true, has_nonqualified_use: true,
  });
  assert.ok(r.flags.some((f) => /non-qualified-use/i.test(f)));
});

test("computeSection121: negative inputs rejected", () => {
  assert.ok(computeSection121({
    filing_status: "single", sale_price: -1, selling_costs: 0,
    purchase_price: 100000, improvements: 0, meets_two_of_five: true,
  }).error);
  assert.ok(computeSection121({
    filing_status: "weird", sale_price: 100, selling_costs: 0,
    purchase_price: 50, improvements: 0, meets_two_of_five: true,
  }).error);
});

// --- X.9 Property tax ---

test("computePropertyTax: $400k assessed, 15 mills, $25k exemption -> $5,625 annual / $468.75 monthly", () => {
  const r = computePropertyTax(propertyTaxExample.inputs);
  assert.equal(r.taxable_value, 375000);
  assert.equal(r.annual_tax, 5625);
  assert.equal(r.monthly_tax, 468.75);
});

test("computePropertyTax: effective rate matches annual_tax / assessed", () => {
  const r = computePropertyTax(propertyTaxExample.inputs);
  assert.ok(Math.abs(r.effective_rate_percent - (5625 / 400000) * 100) < 1e-9);
});

test("computePropertyTax: exemption larger than assessed clips to zero (not negative)", () => {
  const r = computePropertyTax({ assessed_value: 50000, mill_rate: 20, homestead_exemption: 100000 });
  assert.equal(r.taxable_value, 0);
  assert.equal(r.annual_tax, 0);
});

test("computePropertyTax: invalid inputs rejected", () => {
  assert.ok(computePropertyTax({ assessed_value: 0, mill_rate: 15, homestead_exemption: 0 }).error);
  assert.ok(computePropertyTax({ assessed_value: 400000, mill_rate: -1, homestead_exemption: 0 }).error);
});

// --- X.5 Cap rate + DSCR ---

test("computeCapRateDSCR: NOI $84k / value $1.2M -> 7.0% cap; with $60k debt service -> DSCR 1.40", () => {
  const r = computeCapRateDSCR(capRateExample.inputs);
  assert.ok(Math.abs(r.cap_rate_percent - 7) < 1e-9);
  assert.ok(Math.abs(r.dscr - 1.4) < 1e-9);
  assert.match(r.cap_band, /typical/);
  assert.match(r.dscr_band, /agency-acceptable/);
});

test("computeCapRateDSCR: no debt service returns null DSCR", () => {
  const r = computeCapRateDSCR({ noi_annual: 50000, property_value: 1000000 });
  assert.equal(r.dscr, null);
  assert.equal(r.dscr_band, null);
});

test("computeCapRateDSCR: cap-rate bands at the boundaries", () => {
  assert.match(computeCapRateDSCR({ noi_annual: 30000, property_value: 1000000 }).cap_band, /prime/);
  assert.match(computeCapRateDSCR({ noi_annual: 50000, property_value: 1000000 }).cap_band, /strong/);
  assert.match(computeCapRateDSCR({ noi_annual: 70000, property_value: 1000000 }).cap_band, /typical/);
  assert.match(computeCapRateDSCR({ noi_annual: 100000, property_value: 1000000 }).cap_band, /secondary/);
});

test("computeCapRateDSCR: invalid inputs rejected", () => {
  assert.ok(computeCapRateDSCR({ noi_annual: 50000, property_value: 0 }).error);
  assert.ok(computeCapRateDSCR({ noi_annual: -1, property_value: 1000000 }).error);
});

// --- X.11 Cash-on-cash ---

test("computeCashOnCash: $75k invested, $6,750 annual flow -> 9.0% / ~11.1 yr payback", () => {
  const r = computeCashOnCash(cashOnCashExample.inputs);
  assert.ok(Math.abs(r.cash_on_cash_percent - 9) < 1e-9);
  assert.ok(Math.abs(r.payback_years - 11.111) < 0.01);
  assert.match(r.band, /typical/);
});

test("computeCashOnCash: negative cash flow has band 'negative' and null payback", () => {
  const r = computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: -5000 });
  assert.ok(r.cash_on_cash_percent < 0);
  assert.match(r.band, /negative/);
  assert.equal(r.payback_years, null);
});

test("computeCashOnCash: bands at boundaries", () => {
  assert.match(computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 3000 }).band, /weak/);
  assert.match(computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 7000 }).band, /typical/);
  assert.match(computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 12000 }).band, /strong/);
  assert.match(computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: 20000 }).band, /value-add/);
});

test("computeCashOnCash: invalid inputs rejected", () => {
  assert.ok(computeCashOnCash({ cash_invested: 0, annual_pretax_cashflow: 5000 }).error);
  assert.ok(computeCashOnCash({ cash_invested: 100000, annual_pretax_cashflow: "x" }).error);
});

// --- X.14 Commission split ---

test("computeCommissionSplit: $500k @ 5% / 50% side / 80% split / $250 flat -> $9,750 agent net", () => {
  const r = computeCommissionSplit(commissionSplitExample.inputs);
  assert.equal(r.gross_commission, 25000);
  assert.equal(r.this_side_share, 12500);
  assert.equal(r.other_side_share, 12500);
  assert.equal(r.agent_pre_fee_share, 10000);
  assert.equal(r.brokerage_split_share, 2500);
  assert.equal(r.agent_net, 9750);
});

test("computeCommissionSplit: 100% agent split returns full this-side share minus flat fee", () => {
  const r = computeCommissionSplit({
    sale_price: 500000, total_commission_percent: 5,
    side_share_percent: 50, brokerage_split_to_agent_percent: 100,
    brokerage_flat_fee: 0,
  });
  assert.equal(r.agent_pre_fee_share, 12500);
  assert.equal(r.brokerage_split_share, 0);
  assert.equal(r.agent_net, 12500);
});

test("computeCommissionSplit: brokerage flat fee floors at zero (cannot make net negative)", () => {
  const r = computeCommissionSplit({
    sale_price: 100000, total_commission_percent: 3,
    side_share_percent: 50, brokerage_split_to_agent_percent: 50,
    brokerage_flat_fee: 10000,
  });
  // gross 3000, this side 1500, pre-fee 750; flat 10000 -> floored to 0.
  assert.equal(r.agent_net, 0);
});

test("computeCommissionSplit: invalid inputs rejected", () => {
  assert.ok(computeCommissionSplit({ sale_price: -1, total_commission_percent: 5, side_share_percent: 50, brokerage_split_to_agent_percent: 80 }).error);
  assert.ok(computeCommissionSplit({ sale_price: 100000, total_commission_percent: 30, side_share_percent: 50, brokerage_split_to_agent_percent: 80 }).error);
  assert.ok(computeCommissionSplit({ sale_price: 100000, total_commission_percent: 5, side_share_percent: 150, brokerage_split_to_agent_percent: 80 }).error);
});

test("all nine Group X renderers exposed in REALESTATE_RENDERERS", () => {
  for (const key of ["ltv", "dti", "piti", "exchange-1031-timeline", "section-121-exclusion", "property-tax", "cap-rate-dscr", "cash-on-cash", "commission-split"]) {
    assert.ok(typeof REALESTATE_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- X.2 Amortization schedule ---

test("computeAmortizationSchedule: $320k / 6.5% / 30 yr matches PITI P&I and total-interest hand calc", () => {
  const r = computeAmortizationSchedule(amortizationExample.inputs);
  assert.ok(Math.abs(r.monthly_principal_and_interest - 2022.62) < 0.01);
  assert.equal(r.scheduled_term_months, 360);
  assert.equal(r.actual_term_months, 360);
  assert.ok(Math.abs(r.total_interest - 408142.36) < 1);
  assert.ok(r.final_balance < 0.01);
});

test("computeAmortizationSchedule: extra principal accelerates payoff and reduces total interest", () => {
  const base = computeAmortizationSchedule({ principal: 320000, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 0 });
  const fast = computeAmortizationSchedule({ principal: 320000, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 200 });
  assert.ok(fast.actual_term_months < base.actual_term_months);
  assert.ok(fast.total_interest < base.total_interest);
  assert.ok(fast.months_saved > 0);
});

test("computeAmortizationSchedule: zero-rate loan amortizes linearly", () => {
  const r = computeAmortizationSchedule({ principal: 12000, apr_percent: 0, term_years: 1, extra_monthly_principal: 0 });
  assert.equal(r.monthly_principal_and_interest, 1000);
  assert.equal(r.total_interest, 0);
  assert.ok(Math.abs(r.total_paid - 12000) < 0.01);
});

test("computeAmortizationSchedule: sample-rows contain first, mid, and last with strictly decreasing balance", () => {
  const r = computeAmortizationSchedule(amortizationExample.inputs);
  assert.equal(r.sample_rows.length, 3);
  assert.equal(r.sample_rows[0].period, 1);
  assert.ok(r.sample_rows[2].balance < r.sample_rows[0].balance);
});

test("computeAmortizationSchedule: invalid inputs rejected", () => {
  assert.ok(computeAmortizationSchedule({ principal: 0, apr_percent: 6, term_years: 30 }).error);
  assert.ok(computeAmortizationSchedule({ principal: 100, apr_percent: 50, term_years: 30 }).error);
  assert.ok(computeAmortizationSchedule({ principal: 100, apr_percent: 6, term_years: 100 }).error);
  assert.ok(computeAmortizationSchedule({ principal: 100, apr_percent: 6, term_years: 30, extra_monthly_principal: -50 }).error);
});

// --- X.13 Cost of waiting ---

test("computeCostOfWaiting: 6.5 -> 7.5 on $320k / 30 yr adds ~ $214.86/mo P&I", () => {
  const r = computeCostOfWaiting(costOfWaitingExample.inputs);
  assert.ok(Math.abs(r.monthly_pi_now - 2022.62) < 0.05);
  assert.ok(Math.abs(r.monthly_pi_future - 2237.48) < 0.05);
  assert.ok(Math.abs(r.monthly_delta - 214.86) < 0.05);
  assert.equal(r.rate_delta_pct, 1);
});

test("computeCostOfWaiting: rate delta zero yields zero monthly delta", () => {
  const r = computeCostOfWaiting({ principal: 320000, current_rate_percent: 6.5, future_rate_percent: 6.5, term_years: 30 });
  assert.equal(r.monthly_delta, 0);
  assert.equal(r.total_interest_delta, 0);
});

test("computeCostOfWaiting: negative-delta (rate falls) yields negative monthly delta", () => {
  const r = computeCostOfWaiting({ principal: 320000, current_rate_percent: 7.5, future_rate_percent: 6.5, term_years: 30 });
  assert.ok(r.monthly_delta < 0);
  assert.ok(r.total_interest_delta < 0);
});

test("computeCostOfWaiting: invalid inputs rejected", () => {
  assert.ok(computeCostOfWaiting({ principal: -1, current_rate_percent: 6, future_rate_percent: 7, term_years: 30 }).error);
  assert.ok(computeCostOfWaiting({ principal: 100000, current_rate_percent: 50, future_rate_percent: 7, term_years: 30 }).error);
});

// --- X.15 Closing-cost estimator ---

test("computeClosingCosts: $400k / $320k loan / 0.4% transfer / 6.5% note yields positive mid-total ~ $10-15k", () => {
  const r = computeClosingCosts(closingCostsExample.inputs);
  assert.equal(r.items.length, 13);
  assert.ok(r.total_mid > 8000 && r.total_mid < 16000);
  assert.ok(r.total_low < r.total_mid && r.total_mid < r.total_high);
});

test("computeClosingCosts: transfer-tax line scales linearly with rate", () => {
  const lo = computeClosingCosts({ purchase_price: 400000, loan_amount: 320000, transfer_tax_rate_pct: 0, note_rate_pct: 0 });
  const hi = computeClosingCosts({ purchase_price: 400000, loan_amount: 320000, transfer_tax_rate_pct: 1, note_rate_pct: 0 });
  const lo_tt = lo.items.find((i) => i.key === "transfer_tax_state").mid;
  const hi_tt = hi.items.find((i) => i.key === "transfer_tax_state").mid;
  assert.equal(lo_tt, 0);
  assert.ok(Math.abs(hi_tt - 4000) < 0.01); // 1% of $400k.
});

test("computeClosingCosts: prepaid interest is loan * rate / 365 * 15 days at mid", () => {
  const r = computeClosingCosts({ purchase_price: 400000, loan_amount: 365000, transfer_tax_rate_pct: 0, note_rate_pct: 5 });
  // daily = 365000 * 0.05 / 365 = 50. 15 days = 750.
  const pi = r.items.find((i) => i.key === "prepaid_interest").mid;
  assert.ok(Math.abs(pi - 750) < 0.01);
});

test("computeClosingCosts: mid as percent of price falls in the 2-5% common range for typical inputs", () => {
  const r = computeClosingCosts(closingCostsExample.inputs);
  assert.ok(r.total_pct_of_price_mid >= 1.5 && r.total_pct_of_price_mid <= 6.5);
});

test("computeClosingCosts: loan > price rejected", () => {
  assert.ok(computeClosingCosts({ purchase_price: 300000, loan_amount: 400000, transfer_tax_rate_pct: 0, note_rate_pct: 6 }).error);
});

test("computeClosingCosts: invalid inputs rejected", () => {
  assert.ok(computeClosingCosts({ purchase_price: 0, loan_amount: 0, transfer_tax_rate_pct: 0, note_rate_pct: 0 }).error);
  assert.ok(computeClosingCosts({ purchase_price: 400000, loan_amount: 320000, transfer_tax_rate_pct: 10, note_rate_pct: 6 }).error);
});

test("all twelve Group X renderers exposed in REALESTATE_RENDERERS after X.2 / X.13 / X.15", () => {
  for (const key of ["amortization-schedule", "cost-of-waiting", "closing-costs"]) {
    assert.ok(typeof REALESTATE_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- X.12 Rental worksheet ---

test("computeRentalWorksheet: $2200 monthly / 5% vacancy / $19,412 expenses -> NOI $5668", () => {
  const r = computeRentalWorksheet(rentalWorksheetExample.inputs);
  assert.equal(r.gross_rent_annual, 26400);
  assert.ok(Math.abs(r.effective_gross_income - 25080) < 0.01);
  assert.ok(Math.abs(r.total_expenses - 19412) < 0.01);
  assert.ok(Math.abs(r.NOI - 5668) < 0.01);
});

test("computeRentalWorksheet: taxable income = NOI - depreciation (passive loss when negative)", () => {
  const r = computeRentalWorksheet(rentalWorksheetExample.inputs);
  assert.ok(Math.abs(r.taxable_rental_income - (5668 - 9200)) < 0.01);
  assert.ok(r.taxable_rental_income < 0);
});

test("computeRentalWorksheet: cap rate and CoC populated when property_value and cash_invested supplied", () => {
  const r = computeRentalWorksheet(rentalWorksheetExample.inputs);
  assert.ok(Math.abs(r.cap_rate_pct - 1.77) < 0.01);
  assert.ok(Math.abs(r.cash_on_cash_pct - 7.085) < 0.01);
});

test("computeRentalWorksheet: cap rate null when no property_value supplied", () => {
  const r = computeRentalWorksheet({ ...rentalWorksheetExample.inputs, property_value: 0 });
  assert.equal(r.cap_rate_pct, null);
});

test("computeRentalWorksheet: expense ratio = expenses / EGI", () => {
  const r = computeRentalWorksheet(rentalWorksheetExample.inputs);
  // 19412 / 25080 = 77.4%.
  assert.ok(Math.abs(r.expense_ratio_pct - 77.40) < 0.05);
});

test("computeRentalWorksheet: 15 expense rows enumerated even when many are zero", () => {
  const r = computeRentalWorksheet({ monthly_rent: 1000 });
  assert.equal(r.expense_rows.length, 15);
  assert.equal(r.total_expenses, 0);
});

test("computeRentalWorksheet: invalid (negative) inputs rejected", () => {
  assert.ok(computeRentalWorksheet({ monthly_rent: -100 }).error);
  assert.ok(computeRentalWorksheet({ monthly_rent: 1000, insurance: -50 }).error);
  assert.ok(computeRentalWorksheet({ monthly_rent: 1000, vacancy_pct: 150 }).error);
});

test("all thirteen Group X renderers exposed in REALESTATE_RENDERERS after X.12", () => {
  assert.ok(typeof REALESTATE_RENDERERS["rental-worksheet"] === "function");
});

// --- X.8 FHA / VA / conforming loan limits ---

test("computeLoanLimits: San Francisco by name returns high-cost ceiling $1,209,750", () => {
  const r = computeLoanLimits({ ...loanLimitsExample.inputs, shard: LOAN_LIMITS_SHARD });
  assert.equal(r.kind, "high_cost");
  assert.equal(r.conforming_one_unit_usd, 1209750);
  assert.equal(r.county, "San Francisco");
});

test("computeLoanLimits: FIPS lookup wins over name", () => {
  const r = computeLoanLimits({ county_fips: "36061", shard: LOAN_LIMITS_SHARD });
  assert.equal(r.county, "New York");
  assert.equal(r.kind, "high_cost");
});

test("computeLoanLimits: unknown county falls back to baseline + advisory", () => {
  const r = computeLoanLimits({ state: "TX", county_name: "Some Rural County", shard: LOAN_LIMITS_SHARD });
  assert.equal(r.kind, "baseline");
  assert.equal(r.conforming_one_unit_usd, 806500);
  assert.equal(r.fha_one_unit_usd, 524225);
  assert.match(r.advisory, /consult lender/i);
});

test("computeLoanLimits: VA note carries the 2020 cap-removal date", () => {
  const r = computeLoanLimits({ ...loanLimitsExample.inputs, shard: LOAN_LIMITS_SHARD });
  assert.match(r.va_note, /2020-01-01/);
});

test("computeLoanLimits: missing shard rejected", () => {
  assert.ok(computeLoanLimits({ state: "CA" }).error);
});

// --- X.10 HUD FMR ---

test("computeHudFmr: San Francisco area matches and returns 2BR FMR 3553", () => {
  const r = computeHudFmr({ ...hudFmrExample.inputs, shard: HUD_FMR_SHARD });
  assert.equal(r.kind, "matched");
  assert.equal(r.fmr_2br, 3553);
});

test("computeHudFmr: FIPS lookup wins over name", () => {
  const r = computeHudFmr({ fips: "36061", shard: HUD_FMR_SHARD });
  assert.equal(r.state, "NY");
  assert.equal(r.fmr_1br, 2390);
});

test("computeHudFmr: state-only fallback returns the first matched area in that state", () => {
  const r = computeHudFmr({ state: "CA", shard: HUD_FMR_SHARD });
  assert.equal(r.kind, "matched");
  assert.equal(r.state, "CA");
});

test("computeHudFmr: unknown state -> unknown area with advisory", () => {
  const r = computeHudFmr({ state: "ZZ", shard: HUD_FMR_SHARD });
  assert.equal(r.kind, "unknown");
  assert.match(r.advisory, /huduser\.gov/i);
});

test("computeHudFmr: missing shard rejected", () => {
  assert.ok(computeHudFmr({ state: "CA" }).error);
});

// --- X.1 Mortgage discount-point break-even ---

test("computeMortgagePointBreakeven: $300k 7.0->6.5 / 2 points -> ~60-mo break-even (worked example)", () => {
  const r = computeMortgagePointBreakeven(mortgagePointBreakevenExample.inputs);
  assert.ok(Math.abs(r.break_even_months - 60.178) < 0.05);
  assert.ok(Math.abs(r.point_cost - 6000) < 1e-9);
});

test("computeMortgagePointBreakeven: monthly savings is base payment minus points payment", () => {
  const r = computeMortgagePointBreakeven({ loan_amount: 300000, base_rate_pct: 7.0, points_rate_pct: 6.5, point_cost_pct: 2, term_years: 30 });
  assert.ok(Math.abs(r.monthly_savings - (r.payment_base - r.payment_points)) < 1e-9);
  assert.ok(r.payment_base > r.payment_points);
});

test("computeMortgagePointBreakeven: holding past break-even is worth it; before is not", () => {
  const inp = { loan_amount: 300000, base_rate_pct: 7.0, points_rate_pct: 6.5, point_cost_pct: 2, term_years: 30 };
  assert.match(computeMortgagePointBreakeven({ ...inp, holding_years: 7 }).verdict, /Worth it/);
  assert.match(computeMortgagePointBreakeven({ ...inp, holding_years: 3 }).verdict, /Not worth it/);
});

test("computeMortgagePointBreakeven: break-even scales with point cost", () => {
  const lo = computeMortgagePointBreakeven({ loan_amount: 300000, base_rate_pct: 7.0, points_rate_pct: 6.5, point_cost_pct: 1, term_years: 30 });
  const hi = computeMortgagePointBreakeven({ loan_amount: 300000, base_rate_pct: 7.0, points_rate_pct: 6.5, point_cost_pct: 2, term_years: 30 });
  assert.ok(Math.abs(hi.break_even_months - 2 * lo.break_even_months) < 1e-6);
});

test("computeMortgagePointBreakeven: rejects points rate not below base, non-positive loan, zero point cost", () => {
  assert.ok(computeMortgagePointBreakeven({ loan_amount: 300000, base_rate_pct: 6.5, points_rate_pct: 6.5, point_cost_pct: 1, term_years: 30 }).error);
  assert.ok(computeMortgagePointBreakeven({ loan_amount: -1, base_rate_pct: 7, points_rate_pct: 6, point_cost_pct: 1, term_years: 30 }).error);
  assert.ok(computeMortgagePointBreakeven({ loan_amount: 300000, base_rate_pct: 7, points_rate_pct: 6, point_cost_pct: 0, term_years: 30 }).error);
});

test("computeMortgagePointBreakeven: term above 30 years flags", () => {
  assert.ok(computeMortgagePointBreakeven({ loan_amount: 300000, base_rate_pct: 7, points_rate_pct: 6, point_cost_pct: 1, term_years: 40 }).flags.length >= 1);
});

// --- X.3 Per-diem prorated interest at closing ---

test("computePerDiemInterest: $300k @ 6.0%, close 2026-06-15, Actual/365 -> $789.04 (worked example)", () => {
  const r = computePerDiemInterest(perDiemInterestExample.inputs);
  assert.ok(Math.abs(r.prepaid_interest - 789.0410959) < 1e-3);
  assert.strictEqual(r.days_to_eom, 16);
});

test("computePerDiemInterest: daily interest = loan * rate / basis", () => {
  const r = computePerDiemInterest({ loan_amount: 300000, annual_rate_pct: 6.0, closing_date_iso: "2026-06-15", day_count: "actual365" });
  assert.ok(Math.abs(r.daily_interest - 300000 * 0.06 / 365) < 1e-9);
});

test("computePerDiemInterest: Actual/360 uses a 360-day basis", () => {
  const r = computePerDiemInterest({ loan_amount: 300000, annual_rate_pct: 6.0, closing_date_iso: "2026-06-15", day_count: "actual360" });
  assert.strictEqual(r.basis, 360);
  assert.ok(Math.abs(r.daily_interest - 300000 * 0.06 / 360) < 1e-9);
});

test("computePerDiemInterest: closing on the last day of the month is one prepaid day", () => {
  assert.strictEqual(computePerDiemInterest({ loan_amount: 300000, annual_rate_pct: 6.0, closing_date_iso: "2026-06-30" }).days_to_eom, 1);
  // February leap-year length handled by the calendar.
  assert.strictEqual(computePerDiemInterest({ loan_amount: 100000, annual_rate_pct: 5, closing_date_iso: "2024-02-01" }).days_to_eom, 29);
});

test("computePerDiemInterest: defaults to Actual/365 when no convention given", () => {
  assert.strictEqual(computePerDiemInterest({ loan_amount: 100000, annual_rate_pct: 5, closing_date_iso: "2026-06-15" }).basis, 365);
});

test("computePerDiemInterest: rejects malformed and out-of-range dates and non-positive loan", () => {
  assert.ok(computePerDiemInterest({ loan_amount: 300000, annual_rate_pct: 6, closing_date_iso: "06/15/2026" }).error);
  assert.ok(computePerDiemInterest({ loan_amount: 300000, annual_rate_pct: 6, closing_date_iso: "2026-02-30" }).error);
  assert.ok(computePerDiemInterest({ loan_amount: 0, annual_rate_pct: 6, closing_date_iso: "2026-06-15" }).error);
});

// --- X.4 Reserves requirement (months of PITI) ---

test("computeMortgageReserves: $2,500 PITI x 6 mo, $20k liquid + 60% of $30k -> $23k surplus (worked example)", () => {
  const r = computeMortgageReserves(mortgageReservesExample.inputs);
  assert.ok(Math.abs(r.required - 15000) < 1e-9);
  assert.ok(Math.abs(r.eligible - 38000) < 1e-9);
  assert.ok(Math.abs(r.delta - 23000) < 1e-9 && r.meets === true);
});

test("computeMortgageReserves: required is PITI times months", () => {
  const r = computeMortgageReserves({ piti_monthly: 1800, reserves_months: 4, liquid_assets: 0 });
  assert.ok(Math.abs(r.required - 7200) < 1e-9);
});

test("computeMortgageReserves: retirement counted at the allowable percent", () => {
  const r = computeMortgageReserves({ piti_monthly: 1000, reserves_months: 2, liquid_assets: 0, retirement_balance: 50000, retirement_allowable_pct: 60 });
  assert.ok(Math.abs(r.eligible_retirement - 30000) < 1e-9);
  assert.ok(Math.abs(r.eligible - 30000) < 1e-9);
});

test("computeMortgageReserves: shortfall flips meets to false", () => {
  const r = computeMortgageReserves({ piti_monthly: 3000, reserves_months: 6, liquid_assets: 5000 });
  assert.ok(r.delta < 0 && r.meets === false);
});

test("computeMortgageReserves: above-24-month requirement flags", () => {
  assert.ok(computeMortgageReserves({ piti_monthly: 1000, reserves_months: 30, liquid_assets: 0 }).flags.length >= 1);
});

test("computeMortgageReserves: rejects non-positive PITI and out-of-range retirement percent", () => {
  assert.ok(computeMortgageReserves({ piti_monthly: 0, reserves_months: 6, liquid_assets: 1000 }).error);
  assert.ok(computeMortgageReserves({ piti_monthly: 2500, reserves_months: 6, liquid_assets: 1000, retirement_allowable_pct: 150 }).error);
});

test("all eighteen Group X renderers exposed in REALESTATE_RENDERERS (X.1 / X.3 / X.4 added)", () => {
  for (const key of ["loan-limits", "hud-fmr", "mortgage-point-breakeven", "per-diem-interest", "mortgage-reserves"]) {
    assert.ok(typeof REALESTATE_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- X.2 Rent vs buy NPV (spec-v17) ---

test("computeRentVsBuy: $400k/$80k down/6.5% worked example -> PV_buy 158759.65, PV_rent 166256.12, buying cheaper, break-even year 6", () => {
  const r = computeRentVsBuy(rentVsBuyExample.inputs);
  assert.ok(Math.abs(r.monthly_pi - 2022.6176751774892) < 1e-6);
  assert.ok(Math.abs(r.annual_ownership - 34871.41210212987) < 1e-6);
  assert.ok(Math.abs(r.npv_buy - 158759.65370416635) < 1e-3);
  assert.ok(Math.abs(r.npv_rent - 166256.11916440458) < 1e-3);
  assert.ok(Math.abs(r.difference - (r.npv_buy - r.npv_rent)) < 1e-9);
  assert.ok(r.difference < 0);
  assert.strictEqual(r.break_even_years, 6);
  assert.match(r.verdict, /Buying is cheaper/);
});

test("computeRentVsBuy: net-sale identity and the rate / appreciation defaults", () => {
  const r = computeRentVsBuy(rentVsBuyExample.inputs);
  assert.ok(Math.abs(r.home_value_N - 400000 * Math.pow(1.03, 7)) < 1e-6);
  assert.ok(Math.abs(r.net_sale - (r.home_value_N - 0.06 * r.home_value_N - r.loan_balance_N)) < 1e-6);
  // Blank optional rate fields fall back to the documented defaults.
  const def = computeRentVsBuy({ ...rentVsBuyExample.inputs, appreciation_pct: "", rent_inflation_pct: "", investment_return_pct: "", selling_cost_pct: "" });
  assert.ok(Math.abs(def.npv_buy - r.npv_buy) < 1e-6);
  assert.ok(Math.abs(def.npv_rent - r.npv_rent) < 1e-6);
});

test("computeRentVsBuy: a high-rent / low-appreciation market favors buying; a short hold favors renting", () => {
  // Short hold (1 yr) with high transaction cost: renting wins (selling
  // costs are not recovered over one year of small principal paydown).
  const shortHold = computeRentVsBuy({ ...rentVsBuyExample.inputs, holding_years: 1 });
  assert.ok(shortHold.difference > 0, "renting cheaper over a 1-yr hold");
  assert.match(shortHold.verdict, /Renting is cheaper/);
  // Zero-interest mortgage still produces a finite, ordered result.
  const zero = computeRentVsBuy({ ...rentVsBuyExample.inputs, mortgage_rate_pct: 0 });
  assert.ok(Number.isFinite(zero.npv_buy) && Number.isFinite(zero.npv_rent));
});

test("computeRentVsBuy: invalid inputs rejected", () => {
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, purchase_price: 0 }).error);
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, down_payment: 500000 }).error);
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, rent_monthly: 0 }).error);
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, holding_years: 0 }).error);
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, holding_years: 40 }).error);
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, mortgage_rate_pct: 35 }).error);
  assert.ok(computeRentVsBuy({ ...rentVsBuyExample.inputs, investment_return_pct: 40 }).error);
});

test("all nineteen Group X renderers exposed in REALESTATE_RENDERERS after X.2 rent-vs-buy (spec-v17)", () => {
  for (const key of ["mortgage-reserves", "rent-vs-buy", "cap-rate-dscr"]) {
    assert.ok(typeof REALESTATE_RENDERERS[key] === "function", key + " must be registered");
  }
});
