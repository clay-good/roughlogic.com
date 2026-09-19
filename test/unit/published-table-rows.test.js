// Rows of published tables (and definitions) that no pinned example touched,
// each found 2026-09-19 by re-deriving worked examples: NEC 220.55 / 220.54
// past their bundled counts, three-phase line current, NOI without interest,
// a paid-off mortgage, the 2025 Pub 15-T schedule, and OSHA's 4:1 rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRangeDemand22055, computeDryerDemand22054, computeCommercialLightingLoad } from "../../calc-service.js";
import { computeRentalWorksheet, computeRentVsBuy, rentVsBuyExample } from "../../calc-realestate.js";
import { computePayrollWithholding } from "../../calc-accounting.js";
import { computeLadderAngle } from "../../calc-cross.js";

test("NEC Table 220.55 Column C continues past 16 ranges", () => {
  const col = (n) => computeRangeDemand22055({ num_ranges: n, nameplate_kw: 12 }).col_c_kw;
  assert.deepEqual([1, 5, 6, 16, 17, 25, 26, 40].map(col), [8, 20, 21, 31, 32, 40, 41, 55]);
  assert.equal(col(41), 25 + 0.75 * 41);
  assert.equal(col(50), 62.5);
});

test("NEC Table 220.54 dryer factors: 47% - 1%/dryer over 11, 35% - 0.5%/dryer over 23, 25% at 43+", () => {
  const f = (n) => computeDryerDemand22054({ num_dryers: n, nameplate_w: 5000 }).demand_factor;
  assert.equal(f(11), 0.47);
  assert.equal(f(12), 0.46);
  assert.equal(f(15), 0.43);
  assert.equal(f(23), 0.35);
  assert.ok(Math.abs(f(24) - 0.345) < 1e-12);
  assert.ok(Math.abs(f(42) - 0.255) < 1e-12);
  assert.equal(f(43), 0.25);
  assert.equal(f(100), 0.25);
});

test("commercial lighting: 208 V three-phase line current carries sqrt(3); single-phase does not", () => {
  const base = { floor_area_ft2: 5000, unit_load_va_ft2: 3, receptacle_count: 60, supply_v: 208 };
  const three = computeCommercialLightingLoad(base);
  assert.ok(Math.abs(three.total_a - 25400 / (Math.sqrt(3) * 208)) < 1e-9);
  const one = computeCommercialLightingLoad({ ...base, supply_v: 240, phases: 1 });
  assert.ok(Math.abs(one.total_a - 25400 / 240) < 1e-9);
});

test("rental worksheet: NOI excludes interest; taxable income deducts it; other_expenses is read", () => {
  const r = computeRentalWorksheet({ monthly_rent: 2000, vacancy_pct: 0, insurance: 1000, mortgage_interest: 6000, other_expenses: 500, property_value: 300000, cash_invested: 60000 });
  assert.equal(r.total_expenses, 7500);
  assert.equal(r.NOI, 24000 - 1500);
  assert.equal(r.taxable_rental_income, 24000 - 7500);
  assert.ok(Math.abs(r.cap_rate_pct - 22500 / 300000 * 100) < 1e-12);
  assert.ok(Math.abs(r.cash_on_cash_pct - 16500 / 60000 * 100) < 1e-12);
  assert.ok(Math.abs(r.expense_ratio_pct - 1500 / 24000 * 100) < 1e-12);
});

test("rent-vs-buy: no P&I after the loan is paid off", () => {
  const base = { ...rentVsBuyExample.inputs, term_years: 15 };
  const at15 = computeRentVsBuy({ ...base, holding_years: 15 });
  const at20 = computeRentVsBuy({ ...base, holding_years: 20 });
  // Years 16-20 add only tax / insurance / HOA / maintenance, never P&I.
  const i = Number(base.investment_return_pct ?? 5) / 100;
  const nonPI = at15.annual_ownership - at15.monthly_pi * 12;
  let extra = 0;
  for (let t = 16; t <= 20; t++) extra += nonPI / Math.pow(1 + i, t);
  const saleDelta = at20.net_sale / Math.pow(1 + i, 20) - at15.net_sale / Math.pow(1 + i, 15);
  assert.ok(Math.abs(at20.npv_buy - (at15.npv_buy + extra - saleDelta)) < 1e-6);
});

test("Pub 15-T: 2025 Worksheet 1A single schedule, 2024 kept by tax_year", () => {
  const y25 = computePayrollWithholding({ gross_per_period: 1500, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 });
  assert.ok(Math.abs(y25.fed_income_tax_annual - 2641.5) < 1e-9);
  const y24 = computePayrollWithholding({ gross_per_period: 1500, pay_frequency: "biweekly", filing_status: "single", tax_year: 2024 });
  assert.ok(Math.abs(y24.fed_income_tax_annual - (1160 + (39000 - 26200) * 0.12)) < 1e-9);
  // Below the $15,000 (2025) floor nothing is withheld.
  assert.equal(computePayrollWithholding({ gross_per_period: 1250, pay_frequency: "monthly", filing_status: "single", tax_year: 2025 }).fed_income_tax_annual, 0);
});

test("OSHA 1926.1053(b)(5)(i): the foot sits a quarter of the working length out", () => {
  assert.equal(computeLadderAngle({ ladder_length_ft: 16, working_height_ft: 12 }).base_distance_ft, 4);
  assert.equal(computeLadderAngle({ ladder_length_ft: 28, working_height_ft: 27 }).base_distance_ft, 7);
});
