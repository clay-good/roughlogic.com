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
  REALESTATE_RENDERERS,
} from "../../calc-realestate.js";

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
