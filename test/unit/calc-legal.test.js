// Unit tests for calc-legal.js v5 utilities (246-254).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeJudgmentInterest, judgmentInterestExample, JUDGMENT_INTEREST_RATES,
  computeDeadline, deadlineExample, FEDERAL_COURT_HOLIDAYS,
  computeStatuteOfLimitations, sotlExample, STATUTE_OF_LIMITATIONS,
  computeSmallClaimsReference, smallClaimsExample, SMALL_CLAIMS_THRESHOLDS,
  computeTenantNotice, tenantNoticeExample, LANDLORD_TENANT_NOTICE,
  computeWageHour, wageHourExample, STATE_MINIMUM_WAGE,
  computeContractorVsEmployee, contractorExample,
  computeWageGarnishment, wageGarnishmentExample,
  CONTRACT_CLAUSES, LEASE_TERMS, LEGAL_RENDERERS,
} from "../../calc-legal.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 246 Judgment interest
test("JI: example yields positive accrued interest", () => { const r = computeJudgmentInterest(judgmentInterestExample.inputs); assert.ok(r.accrued_interest > 0); });
test("JI: CA 10% simple on $10k for 1 year ≈ $1000", () => { const r = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }); assert.ok(close(r.accrued_interest, 10000 * 0.10 * (366/365), 5)); });
test("JI: zero days = zero interest", () => { const r = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2024-01-01" }); assert.equal(r.accrued_interest, 0); });
test("JI: end before start errors", () => { assert.ok(computeJudgmentInterest({ principal: 100, state: "CA", judgment_date: "2024-06-01", accrual_date: "2024-01-01" }).error); });
test("JI: unknown state errors", () => { assert.ok(computeJudgmentInterest({ principal: 100, state: "ZZ", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }).error); });
test("JI: CO compound > simple at same rate over 1 year", () => { const co = computeJudgmentInterest({ principal: 10000, state: "CO", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }); const oh = computeJudgmentInterest({ principal: 10000, state: "OH", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }); assert.ok(co.accrued_interest > oh.accrued_interest); });
test("JI: U.S. Rule applies payment to interest first", () => { const r = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01", partial_payments: [{ date: "2024-07-01", amount: 200 }] }); const paymentRow = r.rows.find((x) => x.payment_date === "2024-07-01"); assert.ok(paymentRow); assert.ok(paymentRow.applied_to_interest > 0); });
test("JI: full repayment zeroes principal_remaining", () => { const r = computeJudgmentInterest({ principal: 1000, state: "TX", judgment_date: "2024-01-01", accrual_date: "2024-02-01", partial_payments: [{ date: "2024-01-15", amount: 100000 }] }); assert.equal(r.principal_remaining, 0); });
test("JI: per-day at end uses balance", () => { const r = computeJudgmentInterest({ principal: 10000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2025-01-01" }); assert.ok(close(r.per_day_accrual_at_end, 10000 * 0.10 / 365, 0.01)); });
test("JI: every bundled state has citation", () => { for (const k of Object.keys(JUDGMENT_INTEREST_RATES)) assert.ok(JUDGMENT_INTEREST_RATES[k].citation && JUDGMENT_INTEREST_RATES[k].verified_on); });

// 247 Court deadline
test("DL: example calendar Tue 2025-07-01 + 30 = Thu 2025-07-31", () => { const r = computeDeadline(deadlineExample.inputs); assert.equal(r.deadline, "2025-07-31"); });
test("DL: weekend rollover", () => { const r = computeDeadline({ trigger_date: "2025-07-01", days: 4, day_type: "calendar" }); assert.equal(r.deadline, "2025-07-07"); }); // 7/5 Sat -> 7/7 Mon
test("DL: federal holiday rollover (July 4)", () => { const r = computeDeadline({ trigger_date: "2025-07-01", days: 3, day_type: "calendar" }); assert.equal(r.deadline, "2025-07-07"); }); // 7/4 holiday + 7/5/6 weekend
test("DL: court days skip weekends + holiday", () => { const r = computeDeadline({ trigger_date: "2025-07-01", days: 5, day_type: "court" }); assert.equal(r.deadline, "2025-07-09"); }); // count 7/2 7/3, skip 7/4 holiday + 7/5,6 wknd, count 7/7 7/8 7/9
test("DL: invalid date errors", () => { assert.ok(computeDeadline({ trigger_date: "not-a-date", days: 5 }).error); });
test("DL: zero days errors", () => { assert.ok(computeDeadline({ trigger_date: "2025-07-01", days: 0 }).error); });
test("DL: federal holidays bundled for 2025-2027", () => { for (const y of [2025, 2026, 2027]) { assert.ok(FEDERAL_COURT_HOLIDAYS[y] && FEDERAL_COURT_HOLIDAYS[y].length >= 10); } });

// 248 Statute of limitations
test("SOTL: example California contract written = 4 years", () => { const r = computeStatuteOfLimitations(sotlExample.inputs); assert.equal(r.years, 4); });
test("SOTL: NY contract written = 6 years", () => { const r = computeStatuteOfLimitations({ state: "NY", claim_type: "contract_written" }); assert.equal(r.years, 6); });
test("SOTL: TX personal injury = 2 years", () => { const r = computeStatuteOfLimitations({ state: "TX", claim_type: "personal_injury" }); assert.equal(r.years, 2); });
test("SOTL: every state has 8 claim types", () => { for (const st of Object.keys(STATUTE_OF_LIMITATIONS)) assert.equal(Object.keys(STATUTE_OF_LIMITATIONS[st]).length, 8); });
test("SOTL: unknown state errors", () => { assert.ok(computeStatuteOfLimitations({ state: "ZZ", claim_type: "fraud" }).error); });
test("SOTL: unknown claim errors", () => { assert.ok(computeStatuteOfLimitations({ state: "CA", claim_type: "alien_abduction" }).error); });

// 249 Small claims
test("SC: CA max = $12500", () => { const r = computeSmallClaimsReference(smallClaimsExample.inputs); assert.equal(r.max_dollars, 12500); });
test("SC: TX allows attorneys", () => { assert.equal(computeSmallClaimsReference({ state: "TX" }).attorney_allowed, true); });
test("SC: CA does not allow attorneys", () => { assert.equal(computeSmallClaimsReference({ state: "CA" }).attorney_allowed, false); });
test("SC: every entry has fee_range and citation", () => { for (const k of Object.keys(SMALL_CLAIMS_THRESHOLDS)) { assert.ok(SMALL_CLAIMS_THRESHOLDS[k].fee_range); assert.ok(SMALL_CLAIMS_THRESHOLDS[k].citation); } });
test("SC: unknown state errors", () => { assert.ok(computeSmallClaimsReference({ state: "ZZ" }).error); });

// 250 Tenant notice
test("TN: CA nonpayment = 3 days, cure allowed", () => { const r = computeTenantNotice(tenantNoticeExample.inputs); assert.equal(r.notice_days, 3); assert.equal(r.cure_allowed, true); });
test("TN: NY nonpayment = 14 days (HSTPA)", () => { assert.equal(computeTenantNotice({ state: "NY", notice_type: "nonpayment" }).notice_days, 14); });
test("TN: every entry has citation", () => { for (const st of Object.keys(LANDLORD_TENANT_NOTICE)) for (const t of Object.keys(LANDLORD_TENANT_NOTICE[st])) assert.ok(LANDLORD_TENANT_NOTICE[st][t].citation); });
test("TN: includes self-help warning", () => { const r = computeTenantNotice({ state: "CA", notice_type: "nonpayment" }); assert.match(r.self_help_warning, /Do not change the locks/); });
test("TN: unknown notice type errors", () => { assert.ok(computeTenantNotice({ state: "CA", notice_type: "alien_landlord" }).error); });

// 251 Wage and hour
test("WH: example yields gross > 0", () => { const r = computeWageHour(wageHourExample.inputs); assert.ok(r.gross_pay > 0); });
test("WH: 40 reg + 5 OT @ $15", () => { const r = computeWageHour({ hourly_rate: 15, hours_worked: 45, state: "FED" }); assert.ok(close(r.regular_pay, 600)); assert.ok(close(r.overtime_pay, 5 * 15 * 1.5)); });
test("WH: applicable_minimum = max(state, fed)", () => { const r = computeWageHour({ hourly_rate: 7.25, hours_worked: 40, state: "TX" }); assert.equal(r.applicable_minimum, 7.25); const r2 = computeWageHour({ hourly_rate: 16.50, hours_worked: 40, state: "CA" }); assert.equal(r2.applicable_minimum, 16.50); });
test("WH: tip-credit makeup zero when tips exceed shortfall", () => { const r = computeWageHour({ hourly_rate: 5, hours_worked: 40, state: "FED", is_tipped: true, cash_tips: 1000 }); assert.equal(r.tip_makeup, 0); });
test("WH: tip-credit makeup positive when tips short", () => { const r = computeWageHour({ hourly_rate: 2.13, hours_worked: 40, state: "FED", is_tipped: true, cash_tips: 50 }); assert.ok(r.tip_makeup > 0); });
test("WH: under 40 hours = no overtime", () => { const r = computeWageHour({ hourly_rate: 20, hours_worked: 30, state: "FED" }); assert.equal(r.overtime_hours, 0); assert.equal(r.overtime_pay, 0); });
test("WH: every state has citation and verified_on", () => { for (const k of Object.keys(STATE_MINIMUM_WAGE)) { assert.ok(STATE_MINIMUM_WAGE[k].citation); assert.ok(STATE_MINIMUM_WAGE[k].verified_on); } });

// 252 Contractor vs Employee
test("CvE: example ABC test fails (B false) -> employee", () => { const r = computeContractorVsEmployee(contractorExample.inputs); assert.equal(r.result, "employee"); });
test("CvE: ABC all-true -> independent_contractor", () => { const r = computeContractorVsEmployee({ test: "abc", checklist: { A: true, B: true, C: true } }); assert.equal(r.result, "independent_contractor"); });
test("CvE: IRS factors more 'employer' -> employee", () => { const cl = { instructions: "employer", training: "employer", set_hours: "employer", payment_method: "employer", investment: "worker" }; const r = computeContractorVsEmployee({ test: "irs", checklist: cl }); assert.equal(r.result, "employee"); });
test("CvE: IRS factors more 'worker' -> contractor", () => { const cl = { investment: "worker", profit_or_loss: "worker", works_for_more_than_one: "worker", available_to_public: "worker", instructions: "employer" }; const r = computeContractorVsEmployee({ test: "irs", checklist: cl }); assert.equal(r.result, "independent_contractor"); });
test("CvE: ABC empty -> employee (default)", () => { const r = computeContractorVsEmployee({ test: "abc", checklist: {} }); assert.equal(r.result, "employee"); });
test("CvE: cites IRS Rev. Rul. for IRS test", () => { const r = computeContractorVsEmployee({ test: "irs", checklist: {} }); assert.match(r.citation, /87-41/); });

// 253 / 254 Reference maps
test("Clauses: contract reference has 9 entries", () => { assert.equal(Object.keys(CONTRACT_CLAUSES).length, 9); });
test("Clauses: lease reference has 8 entries", () => { assert.equal(Object.keys(LEASE_TERMS).length, 8); });
test("Clauses: every entry has what + look_for", () => { for (const m of [CONTRACT_CLAUSES, LEASE_TERMS]) for (const e of Object.values(m)) { assert.ok(e.what); assert.ok(e.look_for); } });

// spec-v17 S.1 Wage garnishment cap (federal Title III)
test("WG: example -> consumer $600/wk = $150 max, $450 protected", () => {
  const r = computeWageGarnishment(wageGarnishmentExample.inputs);
  assert.ok(close(r.max_garnishment, 150));
  assert.ok(close(r.protected_amount, 450));
  assert.ok(close(r.protected_floor, 217.5));
});
test("WG: consumer cap is the lesser of 25% disposable and amount above 30x min wage", () => { const r = computeWageGarnishment({ disposable_earnings: 250, pay_period: "weekly", garnishment_type: "consumer" }); assert.ok(close(r.max_garnishment, 32.5)); });
test("WG: student loan uses 15% of disposable", () => { const r = computeWageGarnishment({ disposable_earnings: 600, pay_period: "weekly", garnishment_type: "student_loan" }); assert.ok(close(r.max_garnishment, 90)); });
test("WG: child support takes 50% (supporting another) and is exempt from the floor", () => { const r = computeWageGarnishment({ disposable_earnings: 1000, pay_period: "weekly", garnishment_type: "child_support", supporting_other_dependent: true }); assert.ok(close(r.max_garnishment, 500)); assert.equal(r.floor_applies, false); });
test("WG: child support hits 65% (no other dependent + arrears)", () => { const r = computeWageGarnishment({ disposable_earnings: 1000, pay_period: "weekly", garnishment_type: "child_support", supporting_other_dependent: false, in_arrears_12wk: true }); assert.equal(r.applied_pct, 65); assert.ok(close(r.max_garnishment, 650)); });
test("WG: the 30x floor scales with pay period (monthly = 130x)", () => { const r = computeWageGarnishment({ disposable_earnings: 4000, pay_period: "monthly", garnishment_type: "consumer" }); assert.ok(close(r.protected_floor, 130 * 7.25)); });
test("WG: a stricter state cap binds over the federal max", () => { const r = computeWageGarnishment({ disposable_earnings: 600, pay_period: "weekly", garnishment_type: "consumer", state_cap_pct: 10 }); assert.ok(close(r.max_garnishment, 60)); assert.match(r.binding, /state cap/); });
test("WG: unknown pay period / type and out-of-range state cap are rejected", () => {
  assert.ok("error" in computeWageGarnishment({ disposable_earnings: 600, pay_period: "fortnight", garnishment_type: "consumer" }));
  assert.ok("error" in computeWageGarnishment({ disposable_earnings: 600, pay_period: "weekly", garnishment_type: "casino" }));
  assert.ok("error" in computeWageGarnishment({ disposable_earnings: 600, pay_period: "weekly", garnishment_type: "consumer", state_cap_pct: 150 }));
});

// Renderer registry
test("LEGAL_RENDERERS exposes all 10 utilities", () => {
  const ids = Object.keys(LEGAL_RENDERERS);
  assert.equal(ids.length, 10);
  for (const id of [
    "judgment-interest", "court-deadline", "statute-of-limitations",
    "small-claims-reference", "tenant-notice", "wage-hour",
    "contractor-vs-employee", "contract-clause-reference", "lease-term-reference",
    "wage-garnishment",
  ]) assert.ok(typeof LEGAL_RENDERERS[id] === "function", id);
});
