// Unit tests for calc-realestate.js (spec-v12 Group X starter:
// X.4 LTV, X.3 DTI, X.1 PITI). Pure deterministic math over agency
// underwriting conventions (FNMA / FHA / VA).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLTV, ltvExample,
  computeDTI, dtiExample,
  computePITI, pitiExample,
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

test("all three Group X renderers exposed in REALESTATE_RENDERERS", () => {
  for (const key of ["ltv", "dti", "piti"]) {
    assert.ok(typeof REALESTATE_RENDERERS[key] === "function", key + " must be registered");
  }
});
