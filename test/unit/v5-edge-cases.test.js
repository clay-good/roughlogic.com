// v5 edge-case test thickening pass.
// Targets the lightly-covered branches of calc-accounting, calc-legal,
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
  computeJudgmentInterest, JUDGMENT_INTEREST_RATES,
  computeDeadline, computeStatuteOfLimitations, STATUTE_OF_LIMITATIONS,
  computeSmallClaimsReference, SMALL_CLAIMS_THRESHOLDS,
  computeTenantNotice, LANDLORD_TENANT_NOTICE,
  computeWageHour, STATE_MINIMUM_WAGE,
  computeContractorVsEmployee,
} from "../../calc-legal.js";
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

// --- Legal ---

test("JI: all 50 states + DC bundled", () => { assert.ok(Object.keys(JUDGMENT_INTEREST_RATES).length >= 51); });
test("JI: AZ at 10% simple", () => { const r = JUDGMENT_INTEREST_RATES.AZ; assert.equal(r.rate_pct, 10); assert.equal(r.accrual, "simple"); });
test("JI: MI is compound", () => { assert.equal(JUDGMENT_INTEREST_RATES.MI.accrual, "compound"); });
test("JI: payment exceeding interest reduces principal", () => { const r = computeJudgmentInterest({ principal: 1000, state: "CA", judgment_date: "2024-01-01", accrual_date: "2024-04-01", partial_payments: [{ date: "2024-02-15", amount: 100 }] }); assert.ok(r.principal_remaining < 1000); });
test("JI: per_day_accrual_at_end is zero when fully paid", () => { const r = computeJudgmentInterest({ principal: 100, state: "CA", judgment_date: "2024-01-01", accrual_date: "2024-12-31", partial_payments: [{ date: "2024-01-02", amount: 100000 }] }); assert.equal(r.per_day_accrual_at_end, 0); });

test("DL: trigger date with weekend rollover", () => { const r = computeDeadline({ trigger_date: "2025-12-26", days: 1, day_type: "calendar" }); assert.equal(r.deadline, "2025-12-29"); }); // Sat 12/27, Sun 12/28, Mon 12/29
test("DL: New Year holiday rollover", () => { const r = computeDeadline({ trigger_date: "2024-12-31", days: 1, day_type: "calendar" }); assert.equal(r.deadline, "2025-01-02"); });
test("DL: court-day count of 1 lands on next business day", () => { const r = computeDeadline({ trigger_date: "2025-01-02", days: 1, day_type: "court" }); assert.equal(r.deadline, "2025-01-03"); });

test("SOTL: 15+ states bundled (post-expansion)", () => { assert.ok(Object.keys(STATUTE_OF_LIMITATIONS).length >= 15); });
test("SOTL: IL contract-written = 10 years", () => { const r = computeStatuteOfLimitations({ state: "IL", claim_type: "contract_written" }); assert.equal(r.years, 10); });
test("SOTL: PA personal_injury = 2 years", () => { const r = computeStatuteOfLimitations({ state: "PA", claim_type: "personal_injury" }); assert.equal(r.years, 2); });
test("SOTL: every (state, claim) has citation", () => {
  for (const st of Object.keys(STATUTE_OF_LIMITATIONS)) {
    for (const ct of Object.keys(STATUTE_OF_LIMITATIONS[st])) {
      assert.ok(STATUTE_OF_LIMITATIONS[st][ct].citation, st + "/" + ct + " missing citation");
    }
  }
});

test("SC: all 50 states + DC bundled", () => { assert.ok(Object.keys(SMALL_CLAIMS_THRESHOLDS).length >= 51); });
test("SC: WA disallows attorneys", () => { assert.equal(SMALL_CLAIMS_THRESHOLDS.WA.attorney_allowed, false); });
test("SC: TX max is at least $20k", () => { assert.ok(SMALL_CLAIMS_THRESHOLDS.TX.max_dollars >= 20000); });

test("TN: 12+ states bundled (post-expansion)", () => { assert.ok(Object.keys(LANDLORD_TENANT_NOTICE).length >= 12); });
test("TN: WA nonpayment 14-day cure (post-2019)", () => { const r = computeTenantNotice({ state: "WA", notice_type: "nonpayment" }); assert.equal(r.notice_days, 14); assert.equal(r.cure_allowed, true); });
test("TN: GA nonpayment is immediate (0 days)", () => { const r = computeTenantNotice({ state: "GA", notice_type: "nonpayment" }); assert.equal(r.notice_days, 0); });

test("WH: all 50 states + FED + DC bundled", () => { assert.ok(Object.keys(STATE_MINIMUM_WAGE).length >= 52); });
test("WH: NV / OR / MN have no tip credit (cash = minimum)", () => {
  for (const j of ["NV", "OR", "MN"]) {
    const v = STATE_MINIMUM_WAGE[j];
    assert.equal(v.tipped_minimum_cash, v.minimum_wage, j + " should have no tip credit");
  }
});
test("WH: 60-hour week = 40 reg + 20 OT", () => { const r = computeWageHour({ hourly_rate: 20, hours_worked: 60, state: "FED" }); assert.equal(r.regular_hours, 40); assert.equal(r.overtime_hours, 20); });

test("CvE: ABC partially-true = employee", () => { const r = computeContractorVsEmployee({ test: "abc", checklist: { A: true, B: true, C: false } }); assert.equal(r.result, "employee"); });
test("CvE: IRS empty checklist = independent_contractor (default)", () => { const r = computeContractorVsEmployee({ test: "irs", checklist: {} }); assert.equal(r.result, "independent_contractor"); });

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

// --- Coverage of newly added states / jurisdictions ---

test("JI: KY, LA, SC, IA, OK, KS, AR, MS, UT, NM, NE, HI, CT all bundled", () => {
  for (const st of ["KY", "LA", "SC", "IA", "OK", "KS", "AR", "MS", "UT", "NM", "NE", "HI", "CT"]) {
    assert.ok(JUDGMENT_INTEREST_RATES[st], "missing JI " + st);
  }
});
test("JI: every state has citation + verified_on", () => {
  for (const [st, v] of Object.entries(JUDGMENT_INTEREST_RATES)) {
    assert.ok(v.citation && v.citation.length > 0, st + " missing citation");
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.verified_on), st + " bad verified_on");
  }
});
test("JI: rate_pct in plausible range (1-15%) for every state", () => {
  for (const [st, v] of Object.entries(JUDGMENT_INTEREST_RATES)) {
    assert.ok(v.rate_pct >= 1 && v.rate_pct <= 15, st + " rate " + v.rate_pct + " out of range");
  }
});

test("SOTL: NJ contract-written = 6 years", () => { assert.equal(computeStatuteOfLimitations({ state: "NJ", claim_type: "contract_written" }).years, 6); });
test("SOTL: NC personal_injury = 3 years (non-standard)", () => { assert.equal(computeStatuteOfLimitations({ state: "NC", claim_type: "personal_injury" }).years, 3); });
test("SOTL: VA fraud has discovery rule", () => { assert.match(computeStatuteOfLimitations({ state: "VA", claim_type: "fraud" }).accrual, /discovery/); });

test("TN-notice: NJ nonpayment 0 days (no statutory cure)", () => { const r = computeTenantNotice({ state: "NJ", notice_type: "nonpayment" }); assert.equal(r.notice_days, 0); });
test("TN-notice: AZ nonpayment has cure", () => { assert.equal(computeTenantNotice({ state: "AZ", notice_type: "nonpayment" }).cure_allowed, true); });

test("WH: Alabama is federal floor ($7.25)", () => { assert.equal(computeWageHour({ hourly_rate: 7.25, hours_worked: 40, state: "AL" }).applicable_minimum, 7.25); });
test("WH: AK / VT / RI added with valid minimums", () => {
  for (const j of ["AK", "VT", "RI"]) assert.ok(STATE_MINIMUM_WAGE[j].minimum_wage > 7.25, j + " unexpectedly at federal floor");
});

test("SC: TN max $25k is highest in bundled set", () => { let max = 0; for (const v of Object.values(SMALL_CLAIMS_THRESHOLDS)) if (v.max_dollars > max) max = v.max_dollars; assert.equal(max, 25000); });
test("SC: KY max is lowest at $2500", () => { let min = Infinity; for (const v of Object.values(SMALL_CLAIMS_THRESHOLDS)) if (v.max_dollars < min) min = v.max_dollars; assert.equal(min, 2500); });

// --- 50-state coverage assertions ---

const ALL_50 = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

test("JI: every one of the 50 states present", () => {
  for (const st of ALL_50) assert.ok(JUDGMENT_INTEREST_RATES[st], "JI missing " + st);
});
test("WH: every one of the 50 states + FED present", () => {
  for (const st of ["FED", ...ALL_50]) assert.ok(STATE_MINIMUM_WAGE[st], "WH missing " + st);
});
test("SC: every one of the 50 states present", () => {
  for (const st of ALL_50) assert.ok(SMALL_CLAIMS_THRESHOLDS[st], "SC missing " + st);
});

test("WH: every state has citation + verified_on", () => {
  for (const [j, v] of Object.entries(STATE_MINIMUM_WAGE)) {
    assert.ok(v.citation && v.citation.length > 0, j + " missing citation");
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.verified_on), j + " bad verified_on");
  }
});
test("WH: every state minimum is at least the federal floor", () => {
  for (const [j, v] of Object.entries(STATE_MINIMUM_WAGE)) {
    assert.ok(v.minimum_wage >= 7.25, j + " (" + v.minimum_wage + ") below federal floor");
  }
});
test("SC: every state has citation + fee_range", () => {
  for (const [st, v] of Object.entries(SMALL_CLAIMS_THRESHOLDS)) {
    if (st === "verifiedOn") continue;
    assert.ok(v.citation && v.fee_range, st + " missing fields");
    assert.ok(v.max_dollars > 0);
  }
});
test("JI: rate plausibility holds across all 50 + DC", () => {
  for (const [st, v] of Object.entries(JUDGMENT_INTEREST_RATES)) {
    assert.ok(v.rate_pct >= 4 && v.rate_pct <= 13, st + " rate " + v.rate_pct + " outside 4-13% band");
  }
});
