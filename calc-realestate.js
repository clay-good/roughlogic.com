// spec-v12 Group X: Real Estate starter (utilities X.1 PITI, X.3 DTI,
// X.4 LTV). Pure deterministic mortgage and ratio math over the
// agency-published underwriting conventions (FNMA Single-Family
// Selling Guide; FHA Handbook 4000.1; VA Lenders Handbook M26-7).
//
// No data shards. The loan-payment math reuses the same closed-form
// amortization formula as calc-cross.js computeLoanPayment, kept
// inlined here so a calc-realestate tile does not depend on
// calc-cross loading first. The two implementations agree to within
// floating-point precision; the v10 §C runner exercises both.
//
// Every tile carries GOVERNANCE.real_estate ("lender governs final
// underwriting; appraiser governs final value") in citations.js.

import { DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";

// ====================================================================
// X.4 Loan-to-value (LTV)
// ====================================================================

// dims: in { loan_amount: dimensionless, value: dimensionless }
//        out: { ltv_percent: dimensionless, pmi_required: dimensionless, band: dimensionless }
// (Loan amount and property value are dimensionless dollar
//  aggregates per the §7.1 monetary convention; LTV percent is a
//  dimensionless ratio of like-dim dollars. PMI-required flag and
//  band token are categorical (dimensionless).)
export function computeLTV({ loan_amount, value }) {
  const L = Number(loan_amount);
  const V = Number(value);
  if (!Number.isFinite(L) || !Number.isFinite(V) || V <= 0) {
    return { error: "Enter a positive value (appraised value or purchase price) and a loan amount." };
  }
  if (L < 0) return { error: "Loan amount cannot be negative." };
  const ltv = (L / V) * 100;
  // PMI-required flag for conventional conforming loans (FNMA / FHLMC
  // convention): LTV > 80 percent requires private mortgage insurance.
  const pmi_required = ltv > 80;
  // Bands per common underwriting practice.
  let band;
  if (ltv <= 60) band = "low (<= 60%, best pricing tier)";
  else if (ltv <= 75) band = "moderate (60-75%)";
  else if (ltv <= 80) band = "conforming (75-80%, no PMI)";
  else if (ltv <= 90) band = "high (80-90%, PMI required for conventional)";
  else if (ltv <= 97) band = "very high (90-97%, conforming limit for first-time buyers)";
  else band = "exceeds conforming (>97%; FHA / VA / specialty programs only)";
  return { ltv_percent: ltv, pmi_required, band };
}

export const ltvExample = {
  inputs: { loan_amount: 320000, value: 400000 },
  expected: { ltv_percent: 80, pmi_required: false },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderLTV(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: LTV = loan amount / value (appraised or purchase, whichever is less, per FNMA Single-Family Selling Guide §B2-1.1-01). PMI generally required at LTV > 80 percent for conventional conforming loans; FHA programs cap LTV at 96.5 percent for purchase. Lender governs final underwriting; appraiser governs final value.";
  const L = makeNumber("Loan amount ($)", "ltv-l", { step: "any", min: "0" });
  const V = makeNumber("Property value ($)", "ltv-v", { step: "any", min: "0" });
  for (const f of [L, V]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    L.input.value = String(ltvExample.inputs.loan_amount);
    V.input.value = String(ltvExample.inputs.value);
    update();
  });
  const oLTV = makeOutputLine(outputRegion, "LTV (percent)", "ltv-out-pct");
  const oPMI = makeOutputLine(outputRegion, "PMI required?", "ltv-out-pmi");
  const oBand = makeOutputLine(outputRegion, "Band", "ltv-out-band");
  const update = debounce(() => {
    const r = computeLTV({ loan_amount: L.input.value, value: V.input.value });
    if (r.error) {
      oLTV.textContent = r.error; oPMI.textContent = "-"; oBand.textContent = "-";
      return;
    }
    oLTV.textContent = fmt(r.ltv_percent, 2) + "%";
    oPMI.textContent = r.pmi_required ? "Yes (LTV > 80%)" : "No";
    oBand.textContent = r.band;
  }, DEBOUNCE_MS);
  for (const el of [L.input, V.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.3 Debt-to-income ratio (DTI)
// ====================================================================
//
// Front-end (housing) DTI = housing_pmt / gross_monthly_income.
// Back-end (total) DTI = (housing_pmt + other_debts) / gross_monthly_income.
// Bands per FNMA Single-Family Selling Guide §B3-6-02 and FHA
// Handbook 4000.1 §II.A.5.

// dims: in { gross_monthly_income: dimensionless, housing_payment: dimensionless, other_monthly_debts: dimensionless }
//        out: { front_end_dti_percent: dimensionless, back_end_dti_percent: dimensionless, conventional_pass: dimensionless, fha_pass: dimensionless, va_pass: dimensionless }
// (Income, payment, and debt monetary aggregates are dimensionless
//  dollars; DTI percent is a dimensionless ratio. FNMA / FHA / VA
//  pass-flag booleans are categorical (dimensionless).)
export function computeDTI({ gross_monthly_income, housing_payment, other_monthly_debts }) {
  const I = Number(gross_monthly_income);
  const H = Number(housing_payment) || 0;
  const D = Number(other_monthly_debts) || 0;
  if (!Number.isFinite(I) || I <= 0) {
    return { error: "Enter a positive gross monthly income." };
  }
  if (H < 0 || D < 0) return { error: "Payments and debts cannot be negative." };
  const front = (H / I) * 100;
  const back = ((H + D) / I) * 100;
  // Conventional conforming (FNMA): front 28-36 typical, back 36-45 typical (50 max with compensating factors).
  // FHA: front 31 / back 43 default thresholds.
  // VA: back 41 default threshold (no front-end limit).
  const conventional_pass = front <= 36 && back <= 45;
  const fha_pass = front <= 31 && back <= 43;
  const va_pass = back <= 41;
  return {
    front_end_dti_percent: front,
    back_end_dti_percent: back,
    conventional_pass,
    fha_pass,
    va_pass,
  };
}

export const dtiExample = {
  inputs: { gross_monthly_income: 7500, housing_payment: 2100, other_monthly_debts: 600 },
  expected: { front_end_dti_percent: 28, back_end_dti_percent: 36 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderDTI(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Front-end DTI = housing payment / gross monthly income. Back-end DTI = (housing + other debts) / gross monthly income. Conventional thresholds per FNMA Single-Family Selling Guide §B3-6-02 (typical 36/45, up to 50 with compensating factors). FHA per Handbook 4000.1 §II.A.5 (default 31/43). VA per Lenders Handbook M26-7 (back-end 41, no front-end limit). Lender governs final underwriting.";
  const I = makeNumber("Gross monthly income ($)", "dti-i", { step: "any", min: "0" });
  const H = makeNumber("Housing payment (PITI + HOA, $)", "dti-h", { step: "any", min: "0" });
  const D = makeNumber("Other monthly debts ($, car / cards / student / etc.)", "dti-d", { step: "any", min: "0", value: "0" });
  for (const f of [I, H, D]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    I.input.value = String(dtiExample.inputs.gross_monthly_income);
    H.input.value = String(dtiExample.inputs.housing_payment);
    D.input.value = String(dtiExample.inputs.other_monthly_debts);
    update();
  });
  const oFront = makeOutputLine(outputRegion, "Front-end DTI (housing only)", "dti-out-front");
  const oBack = makeOutputLine(outputRegion, "Back-end DTI (total debt)", "dti-out-back");
  const oConv = makeOutputLine(outputRegion, "Conventional thresholds (36/45)", "dti-out-conv");
  const oFHA = makeOutputLine(outputRegion, "FHA thresholds (31/43)", "dti-out-fha");
  const oVA = makeOutputLine(outputRegion, "VA threshold (41 back)", "dti-out-va");
  const update = debounce(() => {
    const r = computeDTI({
      gross_monthly_income: I.input.value,
      housing_payment: H.input.value,
      other_monthly_debts: D.input.value,
    });
    if (r.error) {
      oFront.textContent = r.error;
      for (const o of [oBack, oConv, oFHA, oVA]) o.textContent = "-";
      return;
    }
    oFront.textContent = fmt(r.front_end_dti_percent, 1) + "%";
    oBack.textContent = fmt(r.back_end_dti_percent, 1) + "%";
    oConv.textContent = r.conventional_pass ? "PASS" : "Exceeds typical conventional limits";
    oFHA.textContent = r.fha_pass ? "PASS" : "Exceeds FHA default thresholds";
    oVA.textContent = r.va_pass ? "PASS" : "Exceeds VA default back-end";
  }, DEBOUNCE_MS);
  for (const el of [I.input, H.input, D.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.1 PITI (Principal + Interest + Taxes + Insurance)
// ====================================================================
//
// Standard mortgage payment composition. P+I from the closed-form
// amortization formula; T and I from annualized line items divided
// by 12; HOA passes through; PMI passes through (the caller supplies
// the monthly PMI amount; the LTV-derived PMI rate lookup is out of
// scope for the starter).

// dims: in { principal: dimensionless, apr_percent: dimensionless, term_years: dimensionless, annual_property_tax: dimensionless, annual_insurance: dimensionless, monthly_hoa: dimensionless, monthly_pmi: dimensionless }
//        out: { monthly_principal_and_interest: dimensionless, monthly_tax: dimensionless, monthly_insurance: dimensionless, monthly_hoa: dimensionless, monthly_pmi: dimensionless, piti: dimensionless, piti_plus_hoa: dimensionless, annual_total: dimensionless, term_months: dimensionless }
// (Standard mortgage P&I formula. All monetary aggregates are
//  dimensionless dollars per the §7.1 monetary convention; APR
//  percent, term in years, and term in months are dimensionless.)
export function computePITI({
  principal,
  apr_percent,
  term_years,
  annual_property_tax,
  annual_insurance,
  monthly_hoa,
  monthly_pmi,
}) {
  const P = Number(principal);
  const apr = Number(apr_percent);
  const yrs = Number(term_years);
  const tax = Number(annual_property_tax) || 0;
  const ins = Number(annual_insurance) || 0;
  const hoa = Number(monthly_hoa) || 0;
  const pmi = Number(monthly_pmi) || 0;
  if (!Number.isFinite(P) || P <= 0) return { error: "Enter a positive principal." };
  if (!Number.isFinite(apr) || apr < 0) return { error: "Enter a non-negative APR." };
  if (!Number.isFinite(yrs) || yrs <= 0) return { error: "Enter a positive term in years." };
  const n = Math.round(yrs * 12);
  const r = apr / 100 / 12;
  const pi = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  const monthly_tax = tax / 12;
  const monthly_insurance = ins / 12;
  const piti = pi + monthly_tax + monthly_insurance;
  const piti_plus_hoa = piti + hoa + pmi;
  return {
    monthly_principal_and_interest: pi,
    monthly_tax,
    monthly_insurance,
    monthly_hoa: hoa,
    monthly_pmi: pmi,
    piti,
    piti_plus_hoa,
    annual_total: piti_plus_hoa * 12,
    term_months: n,
  };
}

export const pitiExample = {
  inputs: {
    principal: 320000,
    apr_percent: 6.5,
    term_years: 30,
    annual_property_tax: 4800,
    annual_insurance: 1800,
    monthly_hoa: 0,
    monthly_pmi: 0,
  },
  // Hand-computed: P&I = 320000 * (0.005417) / (1 - (1.005417)^-360) = 2022.62
  // T = 4800/12 = 400; I = 1800/12 = 150; PITI = 2572.62.
  expected: {
    monthly_principal_and_interest_approx: 2022.62,
    piti_approx: 2572.62,
  },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPITI(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard mortgage amortization. Monthly P&I = (P * r) / (1 - (1 + r)^-n) where r = APR/12 and n = term months. Tax and insurance are annual line items spread monthly. HOA and PMI pass through from the user's line items. Lender governs final underwriting and the actual PMI rate.";
  const P = makeNumber("Principal (loan amount, $)", "piti-p", { step: "any", min: "0" });
  const apr = makeNumber("APR (percent)", "piti-apr", { step: "any", min: "0", max: "30" });
  const yrs = makeNumber("Term (years)", "piti-yrs", { step: "1", min: "1", max: "50", value: "30" });
  const tax = makeNumber("Annual property tax ($)", "piti-tax", { step: "any", min: "0", value: "0" });
  const ins = makeNumber("Annual insurance premium ($)", "piti-ins", { step: "any", min: "0", value: "0" });
  const hoa = makeNumber("Monthly HOA ($)", "piti-hoa", { step: "any", min: "0", value: "0" });
  const pmi = makeNumber("Monthly PMI ($)", "piti-pmi", { step: "any", min: "0", value: "0" });
  for (const f of [P, apr, yrs, tax, ins, hoa, pmi]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    P.input.value = String(pitiExample.inputs.principal);
    apr.input.value = String(pitiExample.inputs.apr_percent);
    yrs.input.value = String(pitiExample.inputs.term_years);
    tax.input.value = String(pitiExample.inputs.annual_property_tax);
    ins.input.value = String(pitiExample.inputs.annual_insurance);
    hoa.input.value = String(pitiExample.inputs.monthly_hoa);
    pmi.input.value = String(pitiExample.inputs.monthly_pmi);
    update();
  });
  const oPI = makeOutputLine(outputRegion, "Monthly P&I", "piti-out-pi");
  const oTax = makeOutputLine(outputRegion, "Monthly tax", "piti-out-tax");
  const oIns = makeOutputLine(outputRegion, "Monthly insurance", "piti-out-ins");
  const oHOA = makeOutputLine(outputRegion, "Monthly HOA", "piti-out-hoa");
  const oPMI = makeOutputLine(outputRegion, "Monthly PMI", "piti-out-pmi");
  const oPITI = makeOutputLine(outputRegion, "PITI (P+I+T+I)", "piti-out-piti");
  const oTotal = makeOutputLine(outputRegion, "Total monthly (PITI + HOA + PMI)", "piti-out-total");
  const oAnn = makeOutputLine(outputRegion, "Annual total", "piti-out-ann");
  const update = debounce(() => {
    const r = computePITI({
      principal: P.input.value,
      apr_percent: apr.input.value,
      term_years: yrs.input.value,
      annual_property_tax: tax.input.value,
      annual_insurance: ins.input.value,
      monthly_hoa: hoa.input.value,
      monthly_pmi: pmi.input.value,
    });
    if (r.error) {
      oPI.textContent = r.error;
      for (const o of [oTax, oIns, oHOA, oPMI, oPITI, oTotal, oAnn]) o.textContent = "-";
      return;
    }
    oPI.textContent = "$" + fmt(r.monthly_principal_and_interest, 2);
    oTax.textContent = "$" + fmt(r.monthly_tax, 2);
    oIns.textContent = "$" + fmt(r.monthly_insurance, 2);
    oHOA.textContent = "$" + fmt(r.monthly_hoa, 2);
    oPMI.textContent = "$" + fmt(r.monthly_pmi, 2);
    oPITI.textContent = "$" + fmt(r.piti, 2);
    oTotal.textContent = "$" + fmt(r.piti_plus_hoa, 2);
    oAnn.textContent = "$" + fmt(r.annual_total, 2);
  }, DEBOUNCE_MS);
  for (const el of [P.input, apr.input, yrs.input, tax.input, ins.input, hoa.input, pmi.input]) {
    el.addEventListener("input", update);
  }
}

// ====================================================================
// X.6 IRC §1031 like-kind exchange timeline
// ====================================================================
//
// The 1031 exchange clock starts on the day the relinquished property
// closes. Per Treas. Reg. §1.1031(k)-1(b):
//
//   45-day identification deadline: the taxpayer must identify
//     replacement property in writing to the qualified intermediary
//     within 45 calendar days of the sale-close date.
//   180-day exchange deadline: the replacement property must be
//     acquired within 180 calendar days of the sale-close date (or
//     by the due date of the taxpayer's return for the year, whichever
//     is earlier; the tile reports the 180-day form and flags the
//     April-15 deadline interaction).
//
// Calendar arithmetic only. Federal-holiday rollover is NOT applied
// (the 1031 statute is calendar-day, not business-day, in contrast
// to Fed.R.Civ.P. 6(a) used by court-deadline). The tile carries
// that caveat in the citation.

function addDaysIso(isoDate, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeekIso(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
}

// dims: in { sale_close_iso: dimensionless }
//        out: { sale_close_iso: dimensionless, day_of_week_close: dimensionless, identification_deadline_iso: dimensionless, day_of_week_id45: dimensionless, exchange_deadline_iso: dimensionless, day_of_week_ex180: dimensionless, april_15_caveat: dimensionless }
// (Pure calendar-day arithmetic. All dates are ISO strings; day-
//  of-week tokens and the April-15 caveat are categorical
//  (dimensionless).)
export function compute1031Timeline({ sale_close_iso }) {
  if (typeof sale_close_iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(sale_close_iso)) {
    return { error: "Enter a sale-close date in YYYY-MM-DD format." };
  }
  const id45 = addDaysIso(sale_close_iso, 45);
  const ex180 = addDaysIso(sale_close_iso, 180);
  if (!id45 || !ex180) return { error: "Invalid date." };
  // April-15 interaction: the replacement-property acquisition
  // deadline is the EARLIER of 180 days OR the taxpayer's federal
  // return due date for the year of the sale (typically April 15 of
  // the following year for individuals). The tile flags this when
  // the 180-day landing crosses April 15.
  const saleYear = Number(sale_close_iso.slice(0, 4));
  const aprilDue = (saleYear + 1) + "-04-15";
  const aprilFirst = aprilDue < ex180;
  return {
    sale_close_iso,
    identification_deadline_iso: id45,
    identification_deadline_day: dayOfWeekIso(id45),
    exchange_deadline_iso: ex180,
    exchange_deadline_day: dayOfWeekIso(ex180),
    april_15_governs: aprilFirst,
    earliest_replacement_deadline_iso: aprilFirst ? aprilDue : ex180,
    note: aprilFirst
      ? "Tax-return due date " + aprilDue + " falls before the 180-day deadline; this earlier date governs unless the taxpayer files for an extension (Treas. Reg. 1.1031(k)-1(b)(2))."
      : "180-day deadline " + ex180 + " falls before the next April 15 federal return due date.",
  };
}

export const exchangeTimelineExample = {
  inputs: { sale_close_iso: "2026-03-01" },
  // +45 = 2026-04-15; +180 = 2026-08-28.
  expected: { identification_deadline_iso: "2026-04-15", exchange_deadline_iso: "2026-08-28" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function render1031Timeline(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Treas. Reg. §1.1031(k)-1(b). The 45-day identification and 180-day exchange-close deadlines are calendar days (no business-day or federal-holiday rollover, in contrast to Fed.R.Civ.P. 6(a)). The replacement-property acquisition deadline is the earlier of 180 days or the taxpayer's federal return due date for the year of the sale. A qualified intermediary is required; attorney and tax professional govern.";
  const D = makeText("Sale-close date of relinquished property (YYYY-MM-DD)", "ex1031-d", { placeholder: "2026-03-01" });
  inputRegion.appendChild(D.wrap);
  attachExampleButton(inputRegion, () => {
    D.input.value = exchangeTimelineExample.inputs.sale_close_iso; update();
  });
  const oId = makeOutputLine(outputRegion, "45-day identification deadline", "ex1031-out-id");
  const oEx = makeOutputLine(outputRegion, "180-day exchange-close deadline", "ex1031-out-ex");
  const oEarliest = makeOutputLine(outputRegion, "Earliest replacement deadline (governs)", "ex1031-out-earliest");
  const oNote = makeOutputLine(outputRegion, "April-15 / 180-day interaction", "ex1031-out-note");
  const update = debounce(() => {
    const r = compute1031Timeline({ sale_close_iso: D.input.value || "" });
    if (r.error) {
      oId.textContent = r.error;
      for (const o of [oEx, oEarliest, oNote]) o.textContent = "-";
      return;
    }
    oId.textContent = r.identification_deadline_iso + " (" + r.identification_deadline_day + ")";
    oEx.textContent = r.exchange_deadline_iso + " (" + r.exchange_deadline_day + ")";
    oEarliest.textContent = r.earliest_replacement_deadline_iso + (r.april_15_governs ? " (April 15 governs)" : " (180-day governs)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  D.input.addEventListener("input", update);
}

// ====================================================================
// X.7 IRC §121 home-sale exclusion
// ====================================================================
//
// IRC §121 excludes up to $250,000 ($500,000 MFJ) of gain on the sale
// of a principal residence, subject to the "two of five" ownership-
// and-use test. The tile computes the realized gain, the exclusion
// cap, and the taxable gain. Eligibility flags (two-of-five test,
// non-qualified-use period) are flags only — the user attests.

const SECTION_121_CAP = {
  single: 250000,
  hoh: 250000,           // head of household uses the same cap
  mfj: 500000,
  mfs: 250000,
};

// dims: in { filing_status: dimensionless, sale_price: dimensionless, selling_costs: dimensionless, purchase_price: dimensionless, improvements: dimensionless, meets_two_of_five: dimensionless, has_nonqualified_use: dimensionless }
//        out: { filing_status: dimensionless, amount_realized: dimensionless, adjusted_basis: dimensionless, realized_gain: dimensionless, exclusion_cap: dimensionless, exclusion_applied: dimensionless, taxable_gain: dimensionless, flags: dimensionless }
// (IRC §121 home-sale exclusion: all monetary aggregates are
//  dimensionless dollars per the §7.1 monetary convention; filing
//  status and two-of-five-year / non-qualified-use flags are
//  categorical (dimensionless).)
export function computeSection121({
  filing_status, sale_price, selling_costs, purchase_price, improvements,
  meets_two_of_five, has_nonqualified_use,
}) {
  const fs = String(filing_status).toLowerCase();
  if (!SECTION_121_CAP[fs]) return { error: "Filing status must be one of: single, mfj, mfs, hoh." };
  const sale = Number(sale_price);
  const costs = Number(selling_costs) || 0;
  const basis_purchase = Number(purchase_price);
  const improvements_total = Number(improvements) || 0;
  if (!Number.isFinite(sale) || sale < 0) return { error: "Enter a non-negative sale price." };
  if (!Number.isFinite(basis_purchase) || basis_purchase < 0) return { error: "Enter a non-negative original purchase price." };
  if (costs < 0 || improvements_total < 0) return { error: "Selling costs and improvements cannot be negative." };
  const amount_realized = sale - costs;
  const adjusted_basis = basis_purchase + improvements_total;
  const realized_gain = amount_realized - adjusted_basis;
  const cap = SECTION_121_CAP[fs];
  const eligible = meets_two_of_five === true || meets_two_of_five === "true" || meets_two_of_five === 1 || meets_two_of_five === "1";
  const exclusion = eligible ? Math.max(0, Math.min(realized_gain, cap)) : 0;
  const taxable_gain = Math.max(0, realized_gain - exclusion);
  const flags = [];
  if (!eligible) flags.push("Two-of-five-year test not met; the §121 exclusion is unavailable for this sale. Partial exclusion may apply via §121(c) for unforeseen circumstances (job change > 50 miles, health, death, divorce); consult a CPA.");
  if (has_nonqualified_use === true || has_nonqualified_use === "true") flags.push("Non-qualified-use period reported (rental use after 2008). The exclusion is reduced pro-rata per §121(b)(5); consult a CPA.");
  return {
    filing_status: fs,
    amount_realized,
    adjusted_basis,
    realized_gain,
    exclusion_cap: cap,
    exclusion_applied: exclusion,
    taxable_gain,
    flags,
  };
}

export const section121Example = {
  inputs: {
    filing_status: "mfj", sale_price: 850000, selling_costs: 45000,
    purchase_price: 300000, improvements: 75000,
    meets_two_of_five: true, has_nonqualified_use: false,
  },
  // amount_realized = 850000 - 45000 = 805000
  // adjusted_basis  = 300000 + 75000 = 375000
  // gain            = 805000 - 375000 = 430000
  // exclusion (MFJ) = min(430000, 500000) = 430000
  // taxable         = 0
  expected: { realized_gain: 430000, exclusion_applied: 430000, taxable_gain: 0 },
};

const FILING_OPTS = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married filing jointly (MFJ)" },
  { value: "mfs", label: "Married filing separately (MFS)" },
  { value: "hoh", label: "Head of household (HoH)" },
];
const YES_NO = [{ value: "true", label: "Yes" }, { value: "false", label: "No" }];

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderSection121(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: IRC §121 (Exclusion of Gain from Sale of Principal Residence), single cap $250,000 / joint cap $500,000. Two-of-five-year ownership and use test per §121(a). Partial exclusion per §121(c) for unforeseen circumstances. Non-qualified-use reduction per §121(b)(5) for periods after 2008. CPA and the IRS Form 8949 / Schedule D instructions govern the actual return; this tile is an estimate.";
  const F = makeSelect("Filing status", "s121-f", FILING_OPTS);
  const S = makeNumber("Sale price ($)", "s121-s", { step: "any", min: "0" });
  const SC = makeNumber("Selling costs (commission, title, prep; $)", "s121-sc", { step: "any", min: "0", value: "0" });
  const P = makeNumber("Original purchase price ($)", "s121-p", { step: "any", min: "0" });
  const I = makeNumber("Capital improvements (basis additions; $)", "s121-i", { step: "any", min: "0", value: "0" });
  const T = makeSelect("Two-of-five-year test met?", "s121-t", YES_NO);
  const N = makeSelect("Any non-qualified-use period (rental after 2008)?", "s121-n", YES_NO);
  for (const f of [F, S, SC, P, I, T, N]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    F.select.value = section121Example.inputs.filing_status;
    S.input.value = String(section121Example.inputs.sale_price);
    SC.input.value = String(section121Example.inputs.selling_costs);
    P.input.value = String(section121Example.inputs.purchase_price);
    I.input.value = String(section121Example.inputs.improvements);
    T.select.value = String(section121Example.inputs.meets_two_of_five);
    N.select.value = String(section121Example.inputs.has_nonqualified_use);
    update();
  });
  const oRealized = makeOutputLine(outputRegion, "Amount realized (sale - costs)", "s121-out-ar");
  const oBasis = makeOutputLine(outputRegion, "Adjusted basis (purchase + improvements)", "s121-out-basis");
  const oGain = makeOutputLine(outputRegion, "Realized gain", "s121-out-gain");
  const oCap = makeOutputLine(outputRegion, "Exclusion cap", "s121-out-cap");
  const oExc = makeOutputLine(outputRegion, "Exclusion applied", "s121-out-exc");
  const oTax = makeOutputLine(outputRegion, "Taxable gain", "s121-out-tax");
  const oFlags = makeOutputLine(outputRegion, "Flags", "s121-out-flags");
  const update = debounce(() => {
    const r = computeSection121({
      filing_status: F.select.value,
      sale_price: S.input.value, selling_costs: SC.input.value,
      purchase_price: P.input.value, improvements: I.input.value,
      meets_two_of_five: T.select.value, has_nonqualified_use: N.select.value,
    });
    if (r.error) {
      oRealized.textContent = r.error;
      for (const o of [oBasis, oGain, oCap, oExc, oTax, oFlags]) o.textContent = "-";
      return;
    }
    oRealized.textContent = "$" + fmt(r.amount_realized, 2);
    oBasis.textContent = "$" + fmt(r.adjusted_basis, 2);
    oGain.textContent = "$" + fmt(r.realized_gain, 2);
    oCap.textContent = "$" + fmt(r.exclusion_cap, 0);
    oExc.textContent = "$" + fmt(r.exclusion_applied, 2);
    oTax.textContent = "$" + fmt(r.taxable_gain, 2);
    oFlags.textContent = r.flags.length === 0 ? "(none; standard §121 exclusion)" : r.flags.join("  |  ");
  }, DEBOUNCE_MS);
  for (const el of [S.input, SC.input, P.input, I.input]) el.addEventListener("input", update);
  for (const sel of [F.select, T.select, N.select]) sel.addEventListener("change", update);
}

// ====================================================================
// X.9 Property tax estimator
// ====================================================================
//
// One mill = $1 of tax per $1,000 of assessed value. Annual tax =
// (assessed value - exemption) * mill_rate / 1000. The mill rate and
// assessed value are jurisdiction-set; the tile is a calculator over
// numbers the user looks up on their tax bill or assessor's website.

// dims: in { assessed_value: dimensionless, mill_rate: dimensionless, homestead_exemption: dimensionless }
//        out: { assessed_value: dimensionless, homestead_exemption: dimensionless, taxable_value: dimensionless, mill_rate: dimensionless, annual_tax: dimensionless, monthly_tax: dimensionless, effective_rate_percent: dimensionless }
// (1 mill = $1 tax per $1000 of assessed value. Monetary
//  aggregates dimensionless dollars; mill-rate and effective-rate
//  percent are dimensionless ratios.)
export function computePropertyTax({ assessed_value, mill_rate, homestead_exemption }) {
  const av = Number(assessed_value);
  const mr = Number(mill_rate);
  const ex = Number(homestead_exemption) || 0;
  if (!Number.isFinite(av) || av <= 0) return { error: "Enter a positive assessed value." };
  if (!Number.isFinite(mr) || mr < 0) return { error: "Enter a non-negative mill rate." };
  if (ex < 0) return { error: "Exemption cannot be negative." };
  const taxable = Math.max(0, av - ex);
  const annual_tax = (taxable * mr) / 1000;
  const monthly_tax = annual_tax / 12;
  const effective_rate_percent = (annual_tax / av) * 100;
  return {
    assessed_value: av,
    homestead_exemption: ex,
    taxable_value: taxable,
    mill_rate: mr,
    annual_tax,
    monthly_tax,
    effective_rate_percent,
  };
}

export const propertyTaxExample = {
  inputs: { assessed_value: 400000, mill_rate: 15, homestead_exemption: 25000 },
  // taxable = 375000; annual = 375000 * 15 / 1000 = 5625; monthly 468.75.
  expected: { annual_tax: 5625, monthly_tax: 468.75 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPropertyTax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: 1 mill = $1 tax per $1,000 of assessed value. Annual tax = (assessed_value - exemption) * mill_rate / 1000. Mill rate is set by the local taxing authority; assessed value is set by the county / municipal assessor. Many jurisdictions also publish an 'effective rate' percent; this tile derives that from the inputs for cross-check.";
  const AV = makeNumber("Assessed value ($)", "pt-av", { step: "any", min: "0" });
  const MR = makeNumber("Mill rate (mills; 1 mill = $1 per $1000)", "pt-mr", { step: "any", min: "0" });
  const HE = makeNumber("Homestead / senior exemption ($, optional)", "pt-he", { step: "any", min: "0", value: "0" });
  for (const f of [AV, MR, HE]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    AV.input.value = String(propertyTaxExample.inputs.assessed_value);
    MR.input.value = String(propertyTaxExample.inputs.mill_rate);
    HE.input.value = String(propertyTaxExample.inputs.homestead_exemption);
    update();
  });
  const oTaxable = makeOutputLine(outputRegion, "Taxable value (assessed - exemption)", "pt-out-taxable");
  const oAnnual = makeOutputLine(outputRegion, "Annual property tax", "pt-out-annual");
  const oMonthly = makeOutputLine(outputRegion, "Monthly accrual (for escrow)", "pt-out-monthly");
  const oEff = makeOutputLine(outputRegion, "Effective rate (annual tax / assessed value)", "pt-out-eff");
  const update = debounce(() => {
    const r = computePropertyTax({
      assessed_value: AV.input.value, mill_rate: MR.input.value, homestead_exemption: HE.input.value,
    });
    if (r.error) {
      oTaxable.textContent = r.error;
      for (const o of [oAnnual, oMonthly, oEff]) o.textContent = "-";
      return;
    }
    oTaxable.textContent = "$" + fmt(r.taxable_value, 2);
    oAnnual.textContent = "$" + fmt(r.annual_tax, 2);
    oMonthly.textContent = "$" + fmt(r.monthly_tax, 2);
    oEff.textContent = fmt(r.effective_rate_percent, 3) + "%";
  }, DEBOUNCE_MS);
  for (const el of [AV.input, MR.input, HE.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.5 Cap rate + DSCR
// ====================================================================
//
// Two foundational CRE / investment-property ratios:
//   Cap rate = NOI / property value (or purchase price)
//   DSCR     = NOI / annual debt service
//
// Cap rate bands per common CRE practice: <4 prime / 4-6 strong /
// 6-8 typical / >8 secondary or higher-risk markets. DSCR bands per
// agency convention: <1.0 negative-cashflow / 1.0-1.25 thin / 1.25-1.5
// agency-acceptable / >1.5 strong.

// dims: in { noi_annual: dimensionless, property_value: dimensionless, annual_debt_service: dimensionless }
//        out: { noi_annual: dimensionless, property_value: dimensionless, cap_rate_percent: dimensionless, cap_band: dimensionless, annual_debt_service: dimensionless, dscr: dimensionless, dscr_band: dimensionless }
// (Cap rate and DSCR are dimensionless ratios of like-dim
//  dollar aggregates; bands are categorical tokens.)
export function computeCapRateDSCR({ noi_annual, property_value, annual_debt_service }) {
  const noi = Number(noi_annual);
  const val = Number(property_value);
  const ads = Number(annual_debt_service);
  if (!Number.isFinite(noi) || noi < 0) return { error: "Enter a non-negative annual NOI." };
  if (!Number.isFinite(val) || val <= 0) return { error: "Enter a positive property value (or purchase price)." };
  const cap = (noi / val) * 100;
  let cap_band;
  if (cap < 4) cap_band = "prime (<4%, low-risk / urban-core)";
  else if (cap < 6) cap_band = "strong (4-6%)";
  else if (cap < 8) cap_band = "typical (6-8%)";
  else cap_band = "secondary / higher-risk (>8%)";
  let dscr = null;
  let dscr_band = null;
  if (Number.isFinite(ads) && ads > 0) {
    dscr = noi / ads;
    if (dscr < 1.0) dscr_band = "negative cash-flow (<1.0; NOI does not cover debt service)";
    else if (dscr < 1.25) dscr_band = "thin (1.0-1.25; below typical conventional agency floor)";
    else if (dscr < 1.5) dscr_band = "agency-acceptable (1.25-1.5; common DSCR floor)";
    else dscr_band = "strong (>1.5)";
  }
  return {
    noi_annual: noi,
    property_value: val,
    cap_rate_percent: cap,
    cap_band,
    annual_debt_service: ads || null,
    dscr,
    dscr_band,
  };
}

export const capRateExample = {
  inputs: { noi_annual: 84000, property_value: 1200000, annual_debt_service: 60000 },
  // Cap rate = 84000 / 1200000 = 7.0%. DSCR = 84000 / 60000 = 1.40.
  expected: { cap_rate_percent: 7, dscr: 1.4 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderCapRateDSCR(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Cap rate = NOI / property_value; DSCR = NOI / annual_debt_service. Standard CRE underwriting ratios; bands are common-practice and may differ by lender / market / asset class. NOI is gross income minus operating expenses (excluding debt service, depreciation, income tax). Appraiser governs final value; lender governs underwriting.";
  const N = makeNumber("Annual NOI ($)", "cr-noi", { step: "any", min: "0" });
  const V = makeNumber("Property value or purchase price ($)", "cr-v", { step: "any", min: "0" });
  const D = makeNumber("Annual debt service ($, optional for DSCR)", "cr-d", { step: "any", min: "0", value: "0" });
  for (const f of [N, V, D]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    N.input.value = String(capRateExample.inputs.noi_annual);
    V.input.value = String(capRateExample.inputs.property_value);
    D.input.value = String(capRateExample.inputs.annual_debt_service);
    update();
  });
  const oCap = makeOutputLine(outputRegion, "Cap rate (%)", "cr-out-cap");
  const oCapBand = makeOutputLine(outputRegion, "Cap-rate band", "cr-out-capband");
  const oDSCR = makeOutputLine(outputRegion, "DSCR", "cr-out-dscr");
  const oDSCRBand = makeOutputLine(outputRegion, "DSCR band", "cr-out-dscrband");
  const update = debounce(() => {
    const r = computeCapRateDSCR({
      noi_annual: N.input.value, property_value: V.input.value, annual_debt_service: D.input.value,
    });
    if (r.error) {
      oCap.textContent = r.error;
      for (const o of [oCapBand, oDSCR, oDSCRBand]) o.textContent = "-";
      return;
    }
    oCap.textContent = fmt(r.cap_rate_percent, 2) + "%";
    oCapBand.textContent = r.cap_band;
    oDSCR.textContent = r.dscr == null ? "(enter annual debt service)" : fmt(r.dscr, 2);
    oDSCRBand.textContent = r.dscr_band || "-";
  }, DEBOUNCE_MS);
  for (const el of [N.input, V.input, D.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.11 Cash-on-cash return
// ====================================================================
//
// Cash-on-cash return = annual pre-tax cash flow / cash invested.
// "Cash invested" is the down payment + closing costs + immediate
// rehab; "annual cash flow" is NOI - annual debt service - capex
// reserve. Return % typical bands: <6 weak / 6-10 typical /
// 10-15 strong / >15 secondary or value-add.

// dims: in { cash_invested: dimensionless, annual_pretax_cashflow: dimensionless }
//        out: { cash_invested: dimensionless, annual_pretax_cashflow: dimensionless, cash_on_cash_percent: dimensionless, band: dimensionless }
// (Cash-on-cash return = cashflow / invested = dimensionless
//  ratio of like-dim dollars; band is a categorical token.)
export function computeCashOnCash({ cash_invested, annual_pretax_cashflow }) {
  const inv = Number(cash_invested);
  const cf = Number(annual_pretax_cashflow);
  if (!Number.isFinite(inv) || inv <= 0) return { error: "Enter positive cash invested." };
  if (!Number.isFinite(cf)) return { error: "Enter annual pre-tax cash flow." };
  const coc = (cf / inv) * 100;
  let band;
  if (coc < 0) band = "negative (the investment loses cash each year)";
  else if (coc < 6) band = "weak (<6%)";
  else if (coc < 10) band = "typical (6-10%)";
  else if (coc < 15) band = "strong (10-15%)";
  else band = "secondary / value-add (>15%; verify the assumptions)";
  // Payback period: how many years until cash invested is returned at this rate.
  const payback_years = cf > 0 ? inv / cf : null;
  return {
    cash_invested: inv,
    annual_pretax_cashflow: cf,
    cash_on_cash_percent: coc,
    band,
    payback_years,
  };
}

export const cashOnCashExample = {
  inputs: { cash_invested: 75000, annual_pretax_cashflow: 6750 },
  // 6750 / 75000 = 9.0%; payback ~ 11.1 years.
  expected: { cash_on_cash_percent: 9, payback_years_approx: 11.11 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderCashOnCash(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: cash-on-cash = annual_pretax_cashflow / cash_invested. Cash invested includes down payment + closing costs + immediate rehab; annual cash flow is NOI minus annual debt service minus capex reserve. Common-practice bands; not an agency-defined ratio. Lender / partner / asset class governs target range.";
  const I = makeNumber("Cash invested ($, down + closing + rehab)", "coc-i", { step: "any", min: "0" });
  const C = makeNumber("Annual pre-tax cash flow ($, can be negative)", "coc-c", { step: "any" });
  for (const f of [I, C]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    I.input.value = String(cashOnCashExample.inputs.cash_invested);
    C.input.value = String(cashOnCashExample.inputs.annual_pretax_cashflow);
    update();
  });
  const oCoC = makeOutputLine(outputRegion, "Cash-on-cash return (%)", "coc-out-coc");
  const oBand = makeOutputLine(outputRegion, "Band", "coc-out-band");
  const oPayback = makeOutputLine(outputRegion, "Payback period (years to recover cash invested)", "coc-out-payback");
  const update = debounce(() => {
    const r = computeCashOnCash({
      cash_invested: I.input.value, annual_pretax_cashflow: C.input.value,
    });
    if (r.error) {
      oCoC.textContent = r.error; oBand.textContent = "-"; oPayback.textContent = "-";
      return;
    }
    oCoC.textContent = fmt(r.cash_on_cash_percent, 2) + "%";
    oBand.textContent = r.band;
    oPayback.textContent = r.payback_years == null ? "n/a (non-positive cash flow)" : fmt(r.payback_years, 2);
  }, DEBOUNCE_MS);
  for (const el of [I.input, C.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.14 Commission split
// ====================================================================
//
// The gross commission from a sale flows through three splits in
// sequence:
//   1. Listing-side share vs. selling-side share of the gross
//      (typically 50/50 but can be unequal).
//   2. Brokerage's split of each agent's share (varies; common is
//      70/30 or 80/20 in favor of the agent).
//   3. Any flat brokerage fee or franchise / E&O / desk fee subtracted
//      from the agent's net.
//
// The tile reports gross, listing-side share, selling-side share,
// agent's pre-fee share, brokerage fee subtracted, agent net.

// dims: in { sale_price: dimensionless, total_commission_percent: dimensionless, side_share_percent: dimensionless, brokerage_split_to_agent_percent: dimensionless, brokerage_flat_fee: dimensionless }
//        out: { sale_price: dimensionless, gross_commission: dimensionless, this_side_share: dimensionless, other_side_share: dimensionless, agent_pre_fee_share: dimensionless, brokerage_split_share: dimensionless, brokerage_flat_fee: dimensionless, agent_net: dimensionless }
// (Three-stage commission flow. All monetary aggregates are
//  dimensionless dollars; all percentages are dimensionless ratios.)
export function computeCommissionSplit({
  sale_price, total_commission_percent,
  side_share_percent,
  brokerage_split_to_agent_percent,
  brokerage_flat_fee,
}) {
  const sale = Number(sale_price);
  const total_pct = Number(total_commission_percent);
  const side_pct = Number(side_share_percent);
  const brokerage_pct = Number(brokerage_split_to_agent_percent);
  const flat = Number(brokerage_flat_fee) || 0;
  if (!Number.isFinite(sale) || sale <= 0) return { error: "Enter a positive sale price." };
  if (!Number.isFinite(total_pct) || total_pct < 0 || total_pct > 20) return { error: "Total commission must be 0-20 percent." };
  if (!Number.isFinite(side_pct) || side_pct < 0 || side_pct > 100) return { error: "Side share must be 0-100 percent." };
  if (!Number.isFinite(brokerage_pct) || brokerage_pct < 0 || brokerage_pct > 100) return { error: "Brokerage split (agent share) must be 0-100 percent." };
  if (flat < 0) return { error: "Brokerage flat fee cannot be negative." };
  const gross_commission = sale * (total_pct / 100);
  const this_side_share = gross_commission * (side_pct / 100);
  const other_side_share = gross_commission - this_side_share;
  const agent_pre_fee = this_side_share * (brokerage_pct / 100);
  const brokerage_share = this_side_share - agent_pre_fee;
  const agent_net = Math.max(0, agent_pre_fee - flat);
  return {
    sale_price: sale,
    gross_commission,
    this_side_share,
    other_side_share,
    agent_pre_fee_share: agent_pre_fee,
    brokerage_split_share: brokerage_share,
    brokerage_flat_fee: flat,
    agent_net,
  };
}

export const commissionSplitExample = {
  inputs: {
    sale_price: 500000, total_commission_percent: 5,
    side_share_percent: 50,
    brokerage_split_to_agent_percent: 80,
    brokerage_flat_fee: 250,
  },
  // gross = 25000; this side = 12500; agent pre-fee = 10000; agent net = 9750.
  expected: { gross_commission: 25000, agent_net: 9750 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderCommissionSplit(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Three-stage commission flow per standard residential-brokerage practice. (1) sale_price * total_commission_percent = gross. (2) gross * side_share = listing or selling side. (3) side * brokerage_split = agent pre-fee; minus flat / desk / franchise fee = agent net. The actual percentages are set by the brokerage and the buyer-broker agreement; this tile is a what-if cross-check.";
  const S = makeNumber("Sale price ($)", "cs-s", { step: "any", min: "0" });
  const T = makeNumber("Total commission (% of sale)", "cs-t", { step: "any", min: "0", max: "20", value: "5" });
  const SS = makeNumber("This side's share of gross (% of total commission)", "cs-ss", { step: "any", min: "0", max: "100", value: "50" });
  const BS = makeNumber("Brokerage split (agent share of this side, %)", "cs-bs", { step: "any", min: "0", max: "100", value: "80" });
  const F = makeNumber("Brokerage flat fee per transaction ($, optional)", "cs-f", { step: "any", min: "0", value: "0" });
  for (const f of [S, T, SS, BS, F]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    S.input.value = String(commissionSplitExample.inputs.sale_price);
    T.input.value = String(commissionSplitExample.inputs.total_commission_percent);
    SS.input.value = String(commissionSplitExample.inputs.side_share_percent);
    BS.input.value = String(commissionSplitExample.inputs.brokerage_split_to_agent_percent);
    F.input.value = String(commissionSplitExample.inputs.brokerage_flat_fee);
    update();
  });
  const oGross = makeOutputLine(outputRegion, "Gross commission", "cs-out-gross");
  const oSide = makeOutputLine(outputRegion, "This side's share", "cs-out-side");
  const oOther = makeOutputLine(outputRegion, "Other side's share", "cs-out-other");
  const oPre = makeOutputLine(outputRegion, "Agent pre-fee share", "cs-out-pre");
  const oBrk = makeOutputLine(outputRegion, "Brokerage split share", "cs-out-brk");
  const oFlat = makeOutputLine(outputRegion, "Brokerage flat fee", "cs-out-flat");
  const oNet = makeOutputLine(outputRegion, "Agent NET take-home", "cs-out-net");
  const update = debounce(() => {
    const r = computeCommissionSplit({
      sale_price: S.input.value,
      total_commission_percent: T.input.value,
      side_share_percent: SS.input.value,
      brokerage_split_to_agent_percent: BS.input.value,
      brokerage_flat_fee: F.input.value,
    });
    if (r.error) {
      oGross.textContent = r.error;
      for (const o of [oSide, oOther, oPre, oBrk, oFlat, oNet]) o.textContent = "-";
      return;
    }
    oGross.textContent = "$" + fmt(r.gross_commission, 2);
    oSide.textContent = "$" + fmt(r.this_side_share, 2);
    oOther.textContent = "$" + fmt(r.other_side_share, 2);
    oPre.textContent = "$" + fmt(r.agent_pre_fee_share, 2);
    oBrk.textContent = "$" + fmt(r.brokerage_split_share, 2);
    oFlat.textContent = "$" + fmt(r.brokerage_flat_fee, 2);
    oNet.textContent = "$" + fmt(r.agent_net, 2);
  }, DEBOUNCE_MS);
  for (const el of [S.input, T.input, SS.input, BS.input, F.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.2 Full amortization schedule
// ====================================================================
//
// Per-month period / payment / principal / interest / balance. Uses the
// same closed-form monthly P&I as X.1 PITI. Returns a summary plus a
// sampled-row table; the render shows total interest, last balance,
// and first / mid / last sampled rows so the home view stays compact.

// dims: in { principal: dimensionless, apr_percent: dimensionless, term_years: dimensionless, extra_monthly_principal: dimensionless }
//        out: { monthly_principal_and_interest: dimensionless, extra_monthly_principal: dimensionless, scheduled_term_months: dimensionless, actual_term_months: dimensionless, total_paid: dimensionless, total_interest: dimensionless, final_balance: dimensionless, months_saved: dimensionless, sample_rows: dimensionless, rows: dimensionless }
// (Closed-form mortgage amortization. Monetary aggregates and
//  per-period rows are dimensionless dollars; APR percent, term in
//  months, and saved-months count are dimensionless.)
export function computeAmortizationSchedule({ principal, apr_percent, term_years, extra_monthly_principal }) {
  const P = Number(principal);
  const apr = Number(apr_percent);
  const yrs = Number(term_years);
  const extra = Number(extra_monthly_principal) || 0;
  if (!Number.isFinite(P) || P <= 0) return { error: "Enter a positive principal." };
  if (!Number.isFinite(apr) || apr < 0 || apr > 30) return { error: "Enter an APR 0 to 30 percent." };
  if (!Number.isFinite(yrs) || yrs <= 0 || yrs > 50) return { error: "Enter a term 0 to 50 years." };
  if (!Number.isFinite(extra) || extra < 0) return { error: "Extra principal must be non-negative." };
  const n = Math.round(yrs * 12);
  const r = apr / 100 / 12;
  const pi = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  const rows = [];
  let bal = P;
  let total_interest = 0;
  let actual_months = 0;
  for (let k = 1; k <= n; k++) {
    const interest = bal * r;
    let principal_paid = pi - interest + extra;
    if (principal_paid > bal) principal_paid = bal;
    const payment = principal_paid + interest;
    bal = bal - principal_paid;
    total_interest += interest;
    rows.push({ period: k, payment, principal: principal_paid, interest, balance: bal });
    actual_months = k;
    if (bal <= 1e-6) { bal = 0; break; }
  }
  const sample = [rows[0], rows[Math.floor(actual_months / 2) - 1], rows[actual_months - 1]].filter(Boolean);
  return {
    monthly_principal_and_interest: pi,
    extra_monthly_principal: extra,
    scheduled_term_months: n,
    actual_term_months: actual_months,
    total_paid: rows.reduce((s, x) => s + x.payment, 0),
    total_interest,
    final_balance: bal,
    months_saved: extra > 0 ? n - actual_months : 0,
    sample_rows: sample,
    rows,
  };
}

export const amortizationExample = {
  inputs: { principal: 320000, apr_percent: 6.5, term_years: 30, extra_monthly_principal: 0 },
  // PITI worked example: P&I 2022.6177. Total paid = 2022.6177 * 360 = 728142.36. Total interest = 408142.36.
  expected: { monthly_principal_and_interest_approx: 2022.62, total_interest_approx: 408142.36 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderAmortizationSchedule(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard mortgage amortization. Monthly P&I = (P * r) / (1 - (1 + r)^-n). Each row applies the interest first (i = balance * r), then the remaining payment to principal. Extra principal accelerates payoff and is subtracted before the next interest accrual. Lender governs the actual schedule (early-payment posting rules, escrow analysis cycles).";
  const P = makeNumber("Principal (loan amount, $)", "amort-p", { step: "any", min: "0" });
  const apr = makeNumber("APR (percent)", "amort-apr", { step: "any", min: "0", max: "30" });
  const yrs = makeNumber("Term (years)", "amort-yrs", { step: "1", min: "1", max: "50", value: "30" });
  const ex = makeNumber("Extra monthly principal ($, optional)", "amort-ex", { step: "any", min: "0", value: "0" });
  for (const f of [P, apr, yrs, ex]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    P.input.value = String(amortizationExample.inputs.principal);
    apr.input.value = String(amortizationExample.inputs.apr_percent);
    yrs.input.value = String(amortizationExample.inputs.term_years);
    ex.input.value = String(amortizationExample.inputs.extra_monthly_principal);
    update();
  });
  const oPI = makeOutputLine(outputRegion, "Monthly P&I", "amort-out-pi");
  const oActual = makeOutputLine(outputRegion, "Actual term (months / years)", "amort-out-actual");
  const oTI = makeOutputLine(outputRegion, "Total interest", "amort-out-ti");
  const oTotal = makeOutputLine(outputRegion, "Total paid", "amort-out-total");
  const oSaved = makeOutputLine(outputRegion, "Months saved by extra principal", "amort-out-saved");
  const oSample = makeOutputLine(outputRegion, "Sample rows (first / mid / last)", "amort-out-sample");
  const update = debounce(() => {
    const r = computeAmortizationSchedule({
      principal: P.input.value, apr_percent: apr.input.value,
      term_years: yrs.input.value, extra_monthly_principal: ex.input.value,
    });
    if (r.error) {
      oPI.textContent = r.error;
      for (const o of [oActual, oTI, oTotal, oSaved, oSample]) o.textContent = "-";
      return;
    }
    oPI.textContent = "$" + fmt(r.monthly_principal_and_interest, 2);
    oActual.textContent = r.actual_term_months + " mo (" + fmt(r.actual_term_months / 12, 1) + " yr)";
    oTI.textContent = "$" + fmt(r.total_interest, 2);
    oTotal.textContent = "$" + fmt(r.total_paid, 2);
    oSaved.textContent = r.months_saved > 0 ? String(r.months_saved) + " mo" : "0";
    oSample.textContent = r.sample_rows.map((row) =>
      "#" + row.period + " pay $" + fmt(row.payment, 2) + " (P $" + fmt(row.principal, 2) + " / I $" + fmt(row.interest, 2) + ") -> bal $" + fmt(row.balance, 2)
    ).join("  |  ");
  }, DEBOUNCE_MS);
  for (const el of [P.input, apr.input, yrs.input, ex.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.13 Cost of waiting (rate-rise scenario)
// ====================================================================
//
// Compares the monthly P&I and total interest on the same loan at
// today's rate vs today's + delta. Useful for "rates went up 1%;
// what does that cost me?" conversations. Pure arithmetic; no
// forecast.

// dims: in { principal: dimensionless, current_rate_percent: dimensionless, future_rate_percent: dimensionless, term_years: dimensionless }
//        out: { monthly_pi_now: dimensionless, monthly_pi_future: dimensionless, monthly_delta: dimensionless, total_paid_now: dimensionless, total_paid_future: dimensionless, total_interest_now: dimensionless, total_interest_future: dimensionless, total_interest_delta: dimensionless, rate_delta_pct: dimensionless }
// (Pair of amortizations at two rates. All monetary aggregates are
//  dimensionless dollars; rates and percentage-point delta are
//  dimensionless ratios.)
export function computeCostOfWaiting({ principal, current_rate_percent, future_rate_percent, term_years }) {
  const P = Number(principal);
  const r1 = Number(current_rate_percent);
  const r2 = Number(future_rate_percent);
  const yrs = Number(term_years);
  if (!Number.isFinite(P) || P <= 0) return { error: "Enter a positive principal." };
  if (!Number.isFinite(r1) || r1 < 0 || r1 > 30) return { error: "Enter a current rate 0 to 30 percent." };
  if (!Number.isFinite(r2) || r2 < 0 || r2 > 30) return { error: "Enter a future rate 0 to 30 percent." };
  if (!Number.isFinite(yrs) || yrs <= 0 || yrs > 50) return { error: "Enter a term 0 to 50 years." };
  const n = Math.round(yrs * 12);
  function piFn(rPct) {
    const r = rPct / 100 / 12;
    if (r === 0) return P / n;
    return (P * r) / (1 - Math.pow(1 + r, -n));
  }
  const pi_now = piFn(r1);
  const pi_future = piFn(r2);
  const total_now = pi_now * n;
  const total_future = pi_future * n;
  return {
    monthly_pi_now: pi_now,
    monthly_pi_future: pi_future,
    monthly_delta: pi_future - pi_now,
    total_paid_now: total_now,
    total_paid_future: total_future,
    total_interest_now: total_now - P,
    total_interest_future: total_future - P,
    total_interest_delta: total_future - total_now,
    rate_delta_pct: r2 - r1,
  };
}

export const costOfWaitingExample = {
  inputs: { principal: 320000, current_rate_percent: 6.5, future_rate_percent: 7.5, term_years: 30 },
  // P&I at 6.5% = 2022.62; at 7.5% = 2237.48. Delta = +214.86/mo.
  // Total interest at 6.5% = 408143.40; at 7.5% = 485493.40. Delta = +77,350.
  expected: { monthly_pi_now_approx: 2022.62, monthly_pi_future_approx: 2237.48, monthly_delta_approx: 214.86 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderCostOfWaiting(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Standard mortgage amortization at two rates. No forecasting model; the user supplies both rates. The 'cost of waiting' framing is a sales tool; actual outcomes depend on future home prices, inflation, opportunity cost of down payment, and personal cash flow. This tile is a sanity check, not a recommendation.";
  const P = makeNumber("Principal (loan amount, $)", "cow-p", { step: "any", min: "0" });
  const r1 = makeNumber("Current rate (percent)", "cow-r1", { step: "any", min: "0", max: "30" });
  const r2 = makeNumber("Future rate (percent)", "cow-r2", { step: "any", min: "0", max: "30" });
  const yrs = makeNumber("Term (years)", "cow-yrs", { step: "1", min: "1", max: "50", value: "30" });
  for (const f of [P, r1, r2, yrs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    P.input.value = String(costOfWaitingExample.inputs.principal);
    r1.input.value = String(costOfWaitingExample.inputs.current_rate_percent);
    r2.input.value = String(costOfWaitingExample.inputs.future_rate_percent);
    yrs.input.value = String(costOfWaitingExample.inputs.term_years);
    update();
  });
  const oNow = makeOutputLine(outputRegion, "Monthly P&I at current rate", "cow-out-now");
  const oFut = makeOutputLine(outputRegion, "Monthly P&I at future rate", "cow-out-fut");
  const oDelta = makeOutputLine(outputRegion, "Monthly delta", "cow-out-delta");
  const oTIDelta = makeOutputLine(outputRegion, "Lifetime interest delta", "cow-out-tid");
  const oRD = makeOutputLine(outputRegion, "Rate delta (pp)", "cow-out-rd");
  const update = debounce(() => {
    const r = computeCostOfWaiting({
      principal: P.input.value, current_rate_percent: r1.input.value,
      future_rate_percent: r2.input.value, term_years: yrs.input.value,
    });
    if (r.error) {
      oNow.textContent = r.error;
      for (const o of [oFut, oDelta, oTIDelta, oRD]) o.textContent = "-";
      return;
    }
    oNow.textContent = "$" + fmt(r.monthly_pi_now, 2);
    oFut.textContent = "$" + fmt(r.monthly_pi_future, 2);
    oDelta.textContent = (r.monthly_delta >= 0 ? "+" : "") + "$" + fmt(r.monthly_delta, 2) + " / mo";
    oTIDelta.textContent = (r.total_interest_delta >= 0 ? "+" : "") + "$" + fmt(r.total_interest_delta, 2);
    oRD.textContent = (r.rate_delta_pct >= 0 ? "+" : "") + fmt(r.rate_delta_pct, 3) + " pp";
  }, DEBOUNCE_MS);
  for (const el of [P.input, r1.input, r2.input, yrs.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.15 Closing-cost estimator
// ====================================================================
//
// Estimator over the standard CFPB Closing Disclosure line items. The
// CFPB form is public; the line items below are the common-case
// categories. Each is either a flat range or a percent of loan /
// purchase price. The tile sums the midpoint and surfaces a low / high
// range so the buyer can plan a buffer. Transfer-tax rates vary
// dramatically by state and locality; the tile uses a user-supplied
// rate (defaulted to 0).

const CLOSING_COST_ITEMS = [
  { key: "origination_fee",        label: "Lender origination fee (Section A)",      pct_of_loan: { low: 0.5, mid: 0.75, high: 1.0 } },
  { key: "discount_points",        label: "Discount points (Section A; optional)",    pct_of_loan: { low: 0, mid: 0, high: 1.0 } },
  { key: "appraisal_fee",          label: "Appraisal (Section B)",                    flat:        { low: 400, mid: 550, high: 750 } },
  { key: "credit_report_fee",      label: "Credit report (Section B)",                flat:        { low: 25, mid: 50, high: 75 } },
  { key: "title_search",           label: "Title search / settlement (Section C)",    flat:        { low: 300, mid: 500, high: 800 } },
  { key: "lenders_title_policy",   label: "Lender's title insurance policy (C)",      pct_of_loan: { low: 0.3, mid: 0.5, high: 0.8 } },
  { key: "owners_title_policy",    label: "Owner's title insurance policy (H; opt.)", pct_of_price: { low: 0, mid: 0.5, high: 0.9 } },
  { key: "recording_fees",         label: "Recording fees (Section E)",               flat:        { low: 75, mid: 150, high: 250 } },
  { key: "transfer_tax_state",     label: "State transfer tax (Section E; user-set)", pct_of_price_user_rate: true },
  { key: "prepaid_interest",       label: "Prepaid interest (F; ~15 days at note rate)", computed_prepaid_interest: true },
  { key: "escrow_tax_2mo",         label: "Initial escrow: 2 mo property tax (G)",    pct_of_price: { low: 0.15, mid: 0.18, high: 0.25 } },
  { key: "escrow_ins_2mo",         label: "Initial escrow: 2 mo homeowners ins. (G)", flat:        { low: 200, mid: 300, high: 500 } },
  { key: "survey_optional",        label: "Survey (H; some states)",                  flat:        { low: 0, mid: 400, high: 800 } },
];

function midpointCost(item, { loan_amount, purchase_price, transfer_tax_rate_pct, note_rate_pct }) {
  if (item.pct_of_loan) {
    return {
      low: (loan_amount * item.pct_of_loan.low) / 100,
      mid: (loan_amount * item.pct_of_loan.mid) / 100,
      high: (loan_amount * item.pct_of_loan.high) / 100,
    };
  }
  if (item.pct_of_price) {
    return {
      low: (purchase_price * item.pct_of_price.low) / 100,
      mid: (purchase_price * item.pct_of_price.mid) / 100,
      high: (purchase_price * item.pct_of_price.high) / 100,
    };
  }
  if (item.flat) {
    return { low: item.flat.low, mid: item.flat.mid, high: item.flat.high };
  }
  if (item.pct_of_price_user_rate) {
    const v = (purchase_price * transfer_tax_rate_pct) / 100;
    return { low: v, mid: v, high: v };
  }
  if (item.computed_prepaid_interest) {
    // 15 days at note rate on loan amount (typical closing mid-month assumption).
    const daily = (loan_amount * (note_rate_pct / 100)) / 365;
    const v = daily * 15;
    return { low: daily * 7, mid: v, high: daily * 25 };
  }
  return { low: 0, mid: 0, high: 0 };
}

// dims: in { purchase_price: dimensionless, loan_amount: dimensionless, transfer_tax_rate_pct: dimensionless, note_rate_pct: dimensionless }
//        out: { line_items: dimensionless, low_total: dimensionless, mid_total: dimensionless, high_total: dimensionless, transfer_tax: dimensionless, prepaid_interest_estimate: dimensionless }
// (Sum over CFPB Closing-Disclosure line items. All monetary
//  inputs / outputs are dimensionless dollars; transfer-tax and
//  note rates are dimensionless ratios.)
export function computeClosingCosts({ purchase_price, loan_amount, transfer_tax_rate_pct, note_rate_pct }) {
  const price = Number(purchase_price);
  const loan = Number(loan_amount);
  const ttr = Number(transfer_tax_rate_pct) || 0;
  const note = Number(note_rate_pct) || 0;
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a positive purchase price." };
  if (!Number.isFinite(loan) || loan < 0) return { error: "Enter a non-negative loan amount (use 0 for all-cash)." };
  if (loan > price) return { error: "Loan amount exceeds purchase price; verify (no PMI tile handles 100%+ LTV)." };
  if (ttr < 0 || ttr > 5) return { error: "Transfer tax rate must be 0 to 5 percent (states above ~2% are rare; verify locally)." };
  if (note < 0 || note > 30) return { error: "Note rate must be 0 to 30 percent." };
  const ctx = { loan_amount: loan, purchase_price: price, transfer_tax_rate_pct: ttr, note_rate_pct: note };
  const items = CLOSING_COST_ITEMS.map((item) => {
    const r = midpointCost(item, ctx);
    return { key: item.key, label: item.label, low: r.low, mid: r.mid, high: r.high };
  });
  const total = items.reduce((s, x) => ({
    low: s.low + x.low, mid: s.mid + x.mid, high: s.high + x.high,
  }), { low: 0, mid: 0, high: 0 });
  return {
    items,
    total_low: total.low,
    total_mid: total.mid,
    total_high: total.high,
    total_pct_of_price_mid: (total.mid / price) * 100,
  };
}

export const closingCostsExample = {
  inputs: { purchase_price: 400000, loan_amount: 320000, transfer_tax_rate_pct: 0.4, note_rate_pct: 6.5 },
  // Origination ~2400, appraisal 550, credit 50, title search 500, lender's title 1600,
  // owner's title 2000, recording 150, transfer tax 1600, prepaid int ~854, escrow tax 720,
  // escrow ins 300, survey 400. Midpoint ~ 11124. Will pass against a >0 invariant.
  expected: { items_count: 13, total_mid_approx: 11124 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderClosingCosts(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: CFPB Loan Estimate (Form H-24) and Closing Disclosure (Form H-25), 12 CFR Part 1026 Subpart C (TILA-RESPA Integrated Disclosure rule). Line-item categories and section labels (A, B, C, E, F, G, H) per the CFPB published forms. Rates and dollar ranges are common-case midpoints; the actual Loan Estimate from the lender is the value of record. Free at consumerfinance.gov.";
  const PP = makeNumber("Purchase price ($)", "cc-pp", { step: "any", min: "0" });
  const LA = makeNumber("Loan amount ($)", "cc-la", { step: "any", min: "0" });
  const TTR = makeNumber("State/local transfer tax rate (percent of price)", "cc-ttr", { step: "any", min: "0", max: "5", value: "0" });
  const NR = makeNumber("Note rate (percent; for prepaid interest)", "cc-nr", { step: "any", min: "0", max: "30", value: "0" });
  for (const f of [PP, LA, TTR, NR]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    PP.input.value = String(closingCostsExample.inputs.purchase_price);
    LA.input.value = String(closingCostsExample.inputs.loan_amount);
    TTR.input.value = String(closingCostsExample.inputs.transfer_tax_rate_pct);
    NR.input.value = String(closingCostsExample.inputs.note_rate_pct);
    update();
  });
  const oTotalMid = makeOutputLine(outputRegion, "Estimated closing costs (mid)", "cc-out-mid");
  const oTotalRange = makeOutputLine(outputRegion, "Low / high range", "cc-out-range");
  const oPct = makeOutputLine(outputRegion, "Mid as % of purchase price", "cc-out-pct");
  const oItems = makeOutputLine(outputRegion, "Line items (mid)", "cc-out-items");
  const update = debounce(() => {
    const r = computeClosingCosts({
      purchase_price: PP.input.value, loan_amount: LA.input.value,
      transfer_tax_rate_pct: TTR.input.value, note_rate_pct: NR.input.value,
    });
    if (r.error) {
      oTotalMid.textContent = r.error;
      for (const o of [oTotalRange, oPct, oItems]) o.textContent = "-";
      return;
    }
    oTotalMid.textContent = "$" + fmt(r.total_mid, 2);
    oTotalRange.textContent = "$" + fmt(r.total_low, 2) + " to $" + fmt(r.total_high, 2);
    oPct.textContent = fmt(r.total_pct_of_price_mid, 2) + " %";
    oItems.textContent = r.items.map((i) => i.label + " ~$" + fmt(i.mid, 0)).join("  |  ");
  }, DEBOUNCE_MS);
  for (const el of [PP.input, LA.input, TTR.input, NR.input]) el.addEventListener("input", update);
}

// ====================================================================
// X.12 Rental income / expense worksheet (Schedule E shape)
// ====================================================================
//
// Per the IRS Schedule E (Form 1040) Supplemental Income and Loss
// worksheet for residential rental property. Sums monthly rent ->
// annual gross, subtracts the standard expense line items, and
// returns NOI, taxable income (NOI - depreciation), and standard
// performance ratios.

const RENTAL_EXPENSE_FIELDS = [
  { key: "advertising",             label: "Advertising (Schedule E line 5)" },
  { key: "auto_travel",             label: "Auto and travel (line 6)" },
  { key: "cleaning_maintenance",    label: "Cleaning and maintenance (line 7)" },
  { key: "commissions",             label: "Commissions (line 8)" },
  { key: "insurance",               label: "Insurance (line 9)" },
  { key: "legal_professional",      label: "Legal and other professional fees (line 10)" },
  { key: "management_fees",         label: "Management fees (line 11)" },
  { key: "mortgage_interest",       label: "Mortgage interest paid to banks (line 12)" },
  { key: "other_interest",          label: "Other interest (line 13)" },
  { key: "repairs",                 label: "Repairs (line 14)" },
  { key: "supplies",                label: "Supplies (line 15)" },
  { key: "property_taxes",          label: "Taxes (line 16)" },
  { key: "utilities",               label: "Utilities (line 17)" },
  { key: "hoa_fees",                label: "HOA fees (line 19 'Other')" },
  { key: "other_expenses",          label: "Other expenses (line 19)" },
];

// dims: in { inputs: dimensionless }
//        out: { gross_rent: dimensionless, vacancy_loss: dimensionless, effective_gross_income: dimensionless, operating_expenses: dimensionless, noi_annual: dimensionless, annual_debt_service: dimensionless, cash_flow: dimensionless, cap_rate_percent: dimensionless, cash_on_cash_percent: dimensionless, dscr: dimensionless, grm: dimensionless, value_at_market_grm: dimensionless }
// (Rental-property cash-flow worksheet. All monetary aggregates
//  are dimensionless dollars per the §7.1 monetary convention;
//  cap rate, cash-on-cash, DSCR, and the gross-rent multiplier are
//  dimensionless ratios (price and rent share the dollar dimension).)
export function computeRentalWorksheet(inputs) {
  const monthly_rent = Number(inputs.monthly_rent);
  const vacancy_pct = Number(inputs.vacancy_pct) || 0;
  const other_income = Number(inputs.other_income_annual) || 0;
  const depreciation = Number(inputs.depreciation_annual) || 0;
  const property_value = Number(inputs.property_value) || 0;
  const cash_invested = Number(inputs.cash_invested) || 0;
  const market_grm = Number(inputs.market_grm) || 0;
  if (!Number.isFinite(monthly_rent) || monthly_rent < 0) return { error: "Monthly rent must be non-negative." };
  if (vacancy_pct < 0 || vacancy_pct > 100) return { error: "Vacancy rate must be 0 to 100 percent." };
  const gross_rent = monthly_rent * 12;
  const vacancy_loss = gross_rent * (vacancy_pct / 100);
  const effective_gross_income = gross_rent - vacancy_loss + other_income;
  const expense_rows = [];
  let total_expenses = 0;
  for (const f of RENTAL_EXPENSE_FIELDS) {
    const v = Number(inputs[f.key]) || 0;
    if (v < 0) return { error: f.label + " must be non-negative." };
    expense_rows.push({ key: f.key, label: f.label, amount: v });
    total_expenses += v;
  }
  // NOI excludes depreciation (depreciation is non-cash; Schedule E line 18
  // sits separately on the form).
  const NOI = effective_gross_income - total_expenses;
  const taxable_rental_income = NOI - depreciation;
  const cap_rate_pct = property_value > 0 ? (NOI / property_value) * 100 : null;
  const cash_on_cash_pct = cash_invested > 0 ? (NOI / cash_invested) * 100 : null;
  const expense_ratio_pct = effective_gross_income > 0 ? (total_expenses / effective_gross_income) * 100 : null;
  // X.5 income-method valuation: the gross-rent multiplier on annual
  // scheduled gross rent (GRM = price / gross annual rent; the standard
  // quick-screen the appraisal income approach uses). When the user
  // supplies a comparable / market GRM, the value it implies for the
  // subject's gross rent is GRM_market * gross_rent.
  const grm = property_value > 0 && gross_rent > 0 ? property_value / gross_rent : null;
  const value_at_market_grm = market_grm > 0 && gross_rent > 0 ? market_grm * gross_rent : null;
  return {
    gross_rent_annual: gross_rent,
    vacancy_loss,
    effective_gross_income,
    total_expenses,
    expense_rows,
    NOI,
    depreciation_annual: depreciation,
    taxable_rental_income,
    cap_rate_pct,
    cash_on_cash_pct,
    expense_ratio_pct,
    grm,
    value_at_market_grm,
  };
}

export const rentalWorksheetExample = {
  inputs: {
    monthly_rent: 2200,
    vacancy_pct: 5,
    other_income_annual: 0,
    insurance: 1200,
    mortgage_interest: 9800,
    property_taxes: 4800,
    management_fees: 2112,
    repairs: 1500,
    utilities: 0,
    hoa_fees: 0,
    depreciation_annual: 9200,
    property_value: 320000,
    cash_invested: 80000,
  },
  // gross = 26400; vacancy = 1320; EGI = 25080. Expenses 1200+9800+4800+2112+1500 = 19412.
  // NOI = 25080 - 19412 = 5668. Taxable = 5668 - 9200 = -3532 (passive loss; suspended unless qualifies).
  // Cap rate = 5668/320000 = 1.77%. CoC = 5668/80000 = 7.085%. GRM = 320000/26400 = 12.121.
  expected: { NOI_approx: 5668, cap_rate_pct_approx: 1.77, cash_on_cash_pct_approx: 7.085, grm_approx: 12.121 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderRentalWorksheet(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: IRS Schedule E (Form 1040), Supplemental Income and Loss, Part I (Income or Loss From Rental Real Estate). Expense categories mirror Schedule E lines 5-19. NOI excludes depreciation (a non-cash, separately-tracked line). Passive-loss rules (26 USC §469) govern whether a taxable rental loss reduces other income. The gross-rent multiplier (GRM = property value / annual gross rent) and the value it implies at a market GRM are the income-approach quick-screen per the Appraisal Institute, The Appraisal of Real Estate. CPA / appraiser governs.";
  const M = makeNumber("Monthly rent ($)", "rw-m", { step: "any", min: "0" });
  const V = makeNumber("Vacancy rate (%, default 0)", "rw-v", { step: "any", min: "0", max: "100", value: "0" });
  const O = makeNumber("Other annual income ($, e.g. parking, laundry)", "rw-o", { step: "any", min: "0", value: "0" });
  for (const f of [M, V, O]) inputRegion.appendChild(f.wrap);
  const expenseFields = RENTAL_EXPENSE_FIELDS.map((f) => ({
    key: f.key,
    field: makeNumber(f.label + " ($)", "rw-" + f.key, { step: "any", min: "0", value: "0" }),
  }));
  for (const ef of expenseFields) inputRegion.appendChild(ef.field.wrap);
  const DEP = makeNumber("Annual depreciation ($, Schedule E line 18)", "rw-dep", { step: "any", min: "0", value: "0" });
  const PV = makeNumber("Property value ($, optional, for cap rate / GRM)", "rw-pv", { step: "any", min: "0", value: "0" });
  const CI = makeNumber("Cash invested ($, optional, for cash-on-cash)", "rw-ci", { step: "any", min: "0", value: "0" });
  const MG = makeNumber("Market / comparable GRM (optional, for implied value)", "rw-mg", { step: "any", min: "0", value: "0" });
  for (const f of [DEP, PV, CI, MG]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    M.input.value = String(rentalWorksheetExample.inputs.monthly_rent);
    V.input.value = String(rentalWorksheetExample.inputs.vacancy_pct);
    O.input.value = String(rentalWorksheetExample.inputs.other_income_annual);
    for (const ef of expenseFields) ef.field.input.value = String(rentalWorksheetExample.inputs[ef.key] || 0);
    DEP.input.value = String(rentalWorksheetExample.inputs.depreciation_annual);
    PV.input.value = String(rentalWorksheetExample.inputs.property_value);
    CI.input.value = String(rentalWorksheetExample.inputs.cash_invested);
    MG.input.value = "0";
    update();
  });
  const oGross = makeOutputLine(outputRegion, "Gross rent (annual)", "rw-out-gross");
  const oEGI = makeOutputLine(outputRegion, "Effective gross income (gross - vacancy + other)", "rw-out-egi");
  const oExp = makeOutputLine(outputRegion, "Total expenses", "rw-out-exp");
  const oNOI = makeOutputLine(outputRegion, "NOI (EGI - expenses; excludes depreciation)", "rw-out-noi");
  const oTax = makeOutputLine(outputRegion, "Taxable rental income (NOI - depreciation)", "rw-out-tax");
  const oCap = makeOutputLine(outputRegion, "Cap rate (NOI / property value)", "rw-out-cap");
  const oCoC = makeOutputLine(outputRegion, "Cash-on-cash (NOI / cash invested)", "rw-out-coc");
  const oER = makeOutputLine(outputRegion, "Expense ratio (expenses / EGI)", "rw-out-er");
  const oGRM = makeOutputLine(outputRegion, "Gross rent multiplier (value / annual gross rent)", "rw-out-grm");
  const oVMG = makeOutputLine(outputRegion, "Value at market GRM (market GRM x gross rent)", "rw-out-vmg");
  const update = debounce(() => {
    const inputObj = {
      monthly_rent: M.input.value, vacancy_pct: V.input.value, other_income_annual: O.input.value,
      depreciation_annual: DEP.input.value, property_value: PV.input.value, cash_invested: CI.input.value,
      market_grm: MG.input.value,
    };
    for (const ef of expenseFields) inputObj[ef.key] = ef.field.input.value;
    const r = computeRentalWorksheet(inputObj);
    if (r.error) {
      oGross.textContent = r.error;
      for (const o of [oEGI, oExp, oNOI, oTax, oCap, oCoC, oER, oGRM, oVMG]) o.textContent = "-";
      return;
    }
    oGross.textContent = "$" + fmt(r.gross_rent_annual, 2);
    oEGI.textContent = "$" + fmt(r.effective_gross_income, 2);
    oExp.textContent = "$" + fmt(r.total_expenses, 2);
    oNOI.textContent = "$" + fmt(r.NOI, 2);
    oTax.textContent = "$" + fmt(r.taxable_rental_income, 2);
    oCap.textContent = r.cap_rate_pct == null ? "(enter property value)" : fmt(r.cap_rate_pct, 2) + " %";
    oCoC.textContent = r.cash_on_cash_pct == null ? "(enter cash invested)" : fmt(r.cash_on_cash_pct, 2) + " %";
    oER.textContent = r.expense_ratio_pct == null ? "-" : fmt(r.expense_ratio_pct, 1) + " %";
    oGRM.textContent = r.grm == null ? "(enter property value)" : fmt(r.grm, 2) + " (x annual gross rent)";
    oVMG.textContent = r.value_at_market_grm == null ? "(enter a market GRM)" : "$" + fmt(r.value_at_market_grm, 2);
  }, DEBOUNCE_MS);
  for (const el of [M.input, V.input, O.input, DEP.input, PV.input, CI.input, MG.input]) el.addEventListener("input", update);
  for (const ef of expenseFields) ef.field.input.addEventListener("input", update);
}

// --- Renderer registry ---

// ====================================================================
// X.8 FHA / VA / conforming loan limits by county
// ====================================================================
//
// FHFA publishes the annual conforming loan limit (one-unit baseline)
// in November for the next calendar year. HUD publishes FHA single-
// family mortgage limits annually in December. VA removed the
// statutory cap for full-entitlement borrowers in 2020 (Blue Water
// Navy Vietnam Veterans Act); partial-entitlement borrowers still
// use the county conforming limit as the upper bound on the VA-
// guaranteed portion. The tile is a per-county lookup; unknown
// counties fall back to the baseline + the "consult lender" note.

const SHARD_CACHE = new Map();
async function loadShard(file) {
  if (SHARD_CACHE.has(file)) return SHARD_CACHE.get(file);
  const promise = (async () => {
    try {
      const r = await fetch("data/realestate/" + file, { cache: "default" });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  })();
  SHARD_CACHE.set(file, promise);
  return promise;
}

// dims: in { input: dimensionless }
//        out: { conforming_limit: dimensionless, conforming_high_cost_limit: dimensionless, fha_limit: dimensionless, va_no_down_limit: dimensionless, county: dimensionless, source: dimensionless, asOf: dimensionless }
// (FHFA / FHA / VA county-level loan-limit shard lookup. Monetary
//  caps are dimensionless dollars per the §7.1 monetary
//  convention; county / source / asOf tokens are categorical.)
export function computeLoanLimits(input) {
  const shard = input && input.shard ? input.shard : null;
  if (!shard) return { error: "Loan-limits shard not loaded." };
  const wantState = String(input.state || "").toUpperCase();
  const wantFips = String(input.county_fips || "").trim();
  const wantName = String(input.county_name || "").trim().toLowerCase();
  let match = null;
  if (wantFips) match = shard.high_cost_counties_one_unit.find((c) => c.county_fips === wantFips) || null;
  if (!match && wantState && wantName) {
    match = shard.high_cost_counties_one_unit.find((c) =>
      c.state === wantState && c.county_name.toLowerCase() === wantName
    ) || null;
  }
  if (match) {
    return {
      kind: "high_cost",
      year: shard.year,
      state: match.state,
      county: match.county_name,
      county_fips: match.county_fips,
      conforming_one_unit_usd: match.conforming_usd,
      fha_one_unit_usd: match.fha_usd,
      va_note: shard.va.full_entitlement_cap_removed_since
        ? "VA full-entitlement: no cap (removed " + shard.va.full_entitlement_cap_removed_since + ")"
        : "VA: consult lender",
      source: "FHFA + HUD (per-county lookup matched)",
    };
  }
  // Fallback: baseline.
  return {
    kind: "baseline",
    year: shard.year,
    state: wantState || "(unknown)",
    county: wantName || "(unknown)",
    county_fips: wantFips || "",
    conforming_one_unit_usd: shard.baseline.conforming_one_unit_usd,
    fha_one_unit_usd: shard.baseline.fha_floor_one_unit_usd,
    va_note: "VA full-entitlement: no cap (removed " + shard.va.full_entitlement_cap_removed_since + ")",
    source: "Baseline applies (county not in bundled high-cost list).",
    advisory: shard.unknown_county_message,
  };
}

export const loanLimitsExample = {
  inputs: { state: "CA", county_name: "San Francisco" },
  expected: { county: "San Francisco" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderLoanLimits(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: 2026 conforming loan limit per FHFA Conforming Loan Limit Values (annual, fhfa.gov). FHA single-family mortgage limit per HUD (entp.hud.gov / idapp / html / hicostlook.cfm). VA full-entitlement cap removed effective 2020-01-01 per the Blue Water Navy Vietnam Veterans Act. Unknown counties fall back to the baseline; verify against the FHFA / HUD lookup or with the lender.";
  const S = makeText("State (2-letter, e.g., CA)", "ll-state", { placeholder: "CA", maxlength: "2" });
  const F = makeText("County FIPS (5-digit, optional)", "ll-fips", { placeholder: "06075", maxlength: "5" });
  const N = makeText("County name (optional)", "ll-name", { placeholder: "San Francisco" });
  for (const f of [S, F, N]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { S.input.value = "CA"; F.input.value = ""; N.input.value = "San Francisco"; update(); });
  const oCounty = makeOutputLine(outputRegion, "Matched county", "ll-out-county");
  const oConforming = makeOutputLine(outputRegion, "Conforming (one-unit, FHFA)", "ll-out-conf");
  const oFha = makeOutputLine(outputRegion, "FHA (one-unit)", "ll-out-fha");
  const oVa = makeOutputLine(outputRegion, "VA", "ll-out-va");
  const oNote = makeOutputLine(outputRegion, "Note", "ll-out-note");
  const update = debounce(async () => {
    const shard = await loadShard("loan-limits.json");
    if (!shard) { oCounty.textContent = "Shard load failed (check connectivity)."; return; }
    const r = computeLoanLimits({ shard, state: S.input.value, county_fips: F.input.value, county_name: N.input.value });
    if (r.error) { oCounty.textContent = r.error; for (const o of [oConforming, oFha, oVa, oNote]) o.textContent = "-"; return; }
    oCounty.textContent = (r.county || "?") + " (" + r.state + ", FIPS " + (r.county_fips || "n/a") + ") - " + r.kind;
    oConforming.textContent = "$" + r.conforming_one_unit_usd.toLocaleString("en-US");
    oFha.textContent = "$" + r.fha_one_unit_usd.toLocaleString("en-US");
    oVa.textContent = r.va_note;
    oNote.textContent = r.advisory || r.source;
  }, DEBOUNCE_MS);
  for (const f of [S, F, N]) f.input.addEventListener("input", update);
}

// ====================================================================
// X.10 HUD Fair Market Rents
// ====================================================================
//
// HUD publishes Fair Market Rents for the federal fiscal year (Oct 1 -
// Sep 30) at the 40th-percentile rent of recent-mover units in each
// HUD Fair Market Rent Area (FMR Area). The bundled snapshot is the
// representative high-cost / mid-cost MSAs; the canonical per-county
// lookup is at huduser.gov.

// dims: in { input: dimensionless }
//        out: { fmr_studio: dimensionless, fmr_1br: dimensionless, fmr_2br: dimensionless, fmr_3br: dimensionless, fmr_4br: dimensionless, area: dimensionless, source: dimensionless, asOf: dimensionless }
// (HUD Fair Market Rent shard lookup. FMRs are dimensionless
//  monthly-rent dollar aggregates per the §7.1 monetary
//  convention; area / source / asOf tokens are categorical.)
export function computeHudFmr(input) {
  const shard = input && input.shard ? input.shard : null;
  if (!shard) return { error: "HUD FMR shard not loaded." };
  const wantState = String(input.state || "").toUpperCase();
  const wantFips = String(input.fips || "").trim();
  const wantName = String(input.area_name || "").trim().toLowerCase();
  let match = null;
  if (wantFips) match = shard.areas.find((a) => a.fips === wantFips) || null;
  if (!match && wantState && wantName) {
    match = shard.areas.find((a) => a.state === wantState && a.name.toLowerCase().includes(wantName)) || null;
  }
  if (!match && wantState) {
    match = shard.areas.find((a) => a.state === wantState) || null;
  }
  if (!match) {
    return {
      kind: "unknown",
      fiscal_year: shard.fiscal_year,
      advisory: shard.unknown_area_message,
    };
  }
  return {
    kind: "matched",
    fiscal_year: shard.fiscal_year,
    name: match.name,
    state: match.state,
    fips: match.fips,
    fmr_0br: match.fmr_0br,
    fmr_1br: match.fmr_1br,
    fmr_2br: match.fmr_2br,
    fmr_3br: match.fmr_3br,
    fmr_4br: match.fmr_4br,
    source: "HUD PD&R Fair Market Rents, FY" + shard.fiscal_year,
  };
}

export const hudFmrExample = {
  inputs: { state: "CA", area_name: "San Francisco" },
  expected: { state: "CA" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderHudFmr(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: HUD Office of Policy Development and Research, Fair Market Rents (FY2026, effective 2025-10-01). Free at huduser.gov / portal / datasets / fmr. The 40th-percentile rent of recent-mover units in the HUD-defined FMR Area; used for HCV (Section 8) program payment standards, ESG, HOME, and others.";
  const S = makeText("State (2-letter)", "fmr-state", { placeholder: "CA", maxlength: "2" });
  const F = makeText("FIPS (5-digit, optional)", "fmr-fips", { placeholder: "06075", maxlength: "5" });
  const N = makeText("FMR area name (optional substring)", "fmr-name", { placeholder: "San Francisco" });
  for (const f of [S, F, N]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { S.input.value = "CA"; F.input.value = ""; N.input.value = "San Francisco"; update(); });
  const oArea = makeOutputLine(outputRegion, "Matched FMR area", "fmr-out-area");
  const o0 = makeOutputLine(outputRegion, "0BR (efficiency)", "fmr-out-0");
  const o1 = makeOutputLine(outputRegion, "1BR", "fmr-out-1");
  const o2 = makeOutputLine(outputRegion, "2BR", "fmr-out-2");
  const o3 = makeOutputLine(outputRegion, "3BR", "fmr-out-3");
  const o4 = makeOutputLine(outputRegion, "4BR", "fmr-out-4");
  const oNote = makeOutputLine(outputRegion, "Note", "fmr-out-note");
  const update = debounce(async () => {
    const shard = await loadShard("hud-fmr.json");
    if (!shard) { oArea.textContent = "Shard load failed (check connectivity)."; return; }
    const r = computeHudFmr({ shard, state: S.input.value, fips: F.input.value, area_name: N.input.value });
    if (r.error) { oArea.textContent = r.error; for (const o of [o0, o1, o2, o3, o4, oNote]) o.textContent = "-"; return; }
    if (r.kind === "unknown") {
      oArea.textContent = "FY" + r.fiscal_year + " — unknown FMR area";
      for (const o of [o0, o1, o2, o3, o4]) o.textContent = "-";
      oNote.textContent = r.advisory;
      return;
    }
    oArea.textContent = r.name + " (" + r.state + ", FIPS " + r.fips + ") - FY" + r.fiscal_year;
    o0.textContent = "$" + r.fmr_0br.toLocaleString("en-US");
    o1.textContent = "$" + r.fmr_1br.toLocaleString("en-US");
    o2.textContent = "$" + r.fmr_2br.toLocaleString("en-US");
    o3.textContent = "$" + r.fmr_3br.toLocaleString("en-US");
    o4.textContent = "$" + r.fmr_4br.toLocaleString("en-US");
    oNote.textContent = r.source;
  }, DEBOUNCE_MS);
  for (const f of [S, F, N]) f.input.addEventListener("input", update);
}

// ====================================================================
// X.1 Mortgage discount-point break-even
// ====================================================================
//
// Discount points buy the note rate down. The break-even is the month
// at which the accumulated monthly payment savings equal the up-front
// point cost; past it the buy-down is net-positive, before it the
// borrower paid more than they saved. Payments use the same closed-form
// amortization as computePITI. Break-even months = point_cost /
// monthly_savings; the verdict compares the holding period to it.

// dims: in { loan_amount: dimensionless, base_rate_pct: dimensionless, points_rate_pct: dimensionless, point_cost_pct: dimensionless, term_years: T, holding_years: T }
//        out: { break_even_months: T }
// (Monetary aggregates and percentage rates are dimensionless per the
//  §7.1 monetary convention; loan term and holding period carry time
//  dimension T.)
export function computeMortgagePointBreakeven({ loan_amount, base_rate_pct, points_rate_pct, point_cost_pct, term_years, holding_years }) {
  const P = Number(loan_amount);
  const rb = Number(base_rate_pct);
  const rp = Number(points_rate_pct);
  const cpct = Number(point_cost_pct);
  const yrs = Number(term_years);
  const hold = Number(holding_years);
  if (!Number.isFinite(P) || P <= 0) return { error: "Enter a positive loan amount." };
  if (!Number.isFinite(rb) || rb <= 0) return { error: "Enter a positive base rate." };
  if (!Number.isFinite(rp) || rp < 0) return { error: "Enter a non-negative rate with points." };
  if (rp >= rb) return { error: "Rate with points must be below the base rate (points buy the rate down)." };
  if (!Number.isFinite(cpct) || cpct <= 0) return { error: "Enter a positive point cost (percent of loan)." };
  if (!Number.isFinite(yrs) || yrs <= 0) return { error: "Enter a positive term in years." };
  const n = Math.round(yrs * 12);
  const pay = (ratePct) => { const r = ratePct / 100 / 12; return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n)); };
  const payment_base = pay(rb);
  const payment_points = pay(rp);
  const monthly_savings = payment_base - payment_points;
  const point_cost = P * cpct / 100;
  const break_even_months = point_cost / monthly_savings;
  const flags = [];
  if (yrs > 30) flags.push("Term above 30 years is outside the typical conforming range.");
  let verdict;
  if (Number.isFinite(hold) && hold > 0) {
    const holdMonths = Math.round(hold * 12);
    verdict = holdMonths >= break_even_months
      ? "Worth it: you hold " + holdMonths + " mo, past the " + Math.round(break_even_months) + "-mo break-even."
      : "Not worth it for this hold: you exit at " + holdMonths + " mo, before the " + Math.round(break_even_months) + "-mo break-even.";
  } else {
    verdict = "Enter a holding period for a worth-it verdict.";
  }
  return { payment_base, payment_points, monthly_savings, point_cost, break_even_months, break_even_years: break_even_months / 12, flags, verdict };
}

export const mortgagePointBreakevenExample = {
  // $300k, 7.0% base vs 6.5% with 2 points ($6,000), 30-yr, hold 7 yr.
  // Savings $99.70/mo; break-even 6000 / 99.70 = 60.18 mo (~5.0 yr).
  inputs: { loan_amount: 300000, base_rate_pct: 7.0, points_rate_pct: 6.5, point_cost_pct: 2, term_years: 30, holding_years: 7 },
  expected: { break_even_months: 60.18 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderMortgagePointBreakeven(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: First-principles amortization (monthly P&I = (P * r) / (1 - (1 + r)^-n)). Break-even months = up-front point cost / monthly payment savings. Points are reported on the CFPB Loan Estimate / Closing Disclosure (12 CFR 1026.37-38). One point typically costs 1 percent of the loan; the actual buy-down per point varies by lender and market. Lender governs the rate sheet.";
  const P = makeNumber("Loan amount ($)", "pbe-p", { step: "any", min: "0" });
  const rb = makeNumber("Base rate, no points (percent)", "pbe-rb", { step: "any", min: "0", max: "30" });
  const rp = makeNumber("Rate with points (percent)", "pbe-rp", { step: "any", min: "0", max: "30" });
  const c = makeNumber("Total point cost (percent of loan)", "pbe-c", { step: "any", min: "0", value: "1" });
  const yrs = makeNumber("Term (years)", "pbe-yrs", { step: "1", min: "1", max: "50", value: "30" });
  const hold = makeNumber("Expected holding period (years)", "pbe-hold", { step: "any", min: "0" });
  for (const f of [P, rb, rp, c, yrs, hold]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = mortgagePointBreakevenExample.inputs;
    P.input.value = String(ex.loan_amount); rb.input.value = String(ex.base_rate_pct);
    rp.input.value = String(ex.points_rate_pct); c.input.value = String(ex.point_cost_pct);
    yrs.input.value = String(ex.term_years); hold.input.value = String(ex.holding_years);
    update();
  });
  const oBase = makeOutputLine(outputRegion, "Monthly payment, no points", "pbe-out-base");
  const oPts = makeOutputLine(outputRegion, "Monthly payment, with points", "pbe-out-pts");
  const oSave = makeOutputLine(outputRegion, "Monthly savings", "pbe-out-save");
  const oCost = makeOutputLine(outputRegion, "Total point cost", "pbe-out-cost");
  const oBE = makeOutputLine(outputRegion, "Break-even", "pbe-out-be");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "pbe-out-verdict");
  const update = debounce(() => {
    const r = computeMortgagePointBreakeven({
      loan_amount: P.input.value, base_rate_pct: rb.input.value, points_rate_pct: rp.input.value,
      point_cost_pct: c.input.value, term_years: yrs.input.value, holding_years: hold.input.value,
    });
    if (r.error) { oBase.textContent = r.error; for (const o of [oPts, oSave, oCost, oBE, oVerdict]) o.textContent = "-"; return; }
    oBase.textContent = "$" + fmt(r.payment_base, 2);
    oPts.textContent = "$" + fmt(r.payment_points, 2);
    oSave.textContent = "$" + fmt(r.monthly_savings, 2) + " / mo";
    oCost.textContent = "$" + fmt(r.point_cost, 2);
    oBE.textContent = fmt(r.break_even_months, 1) + " mo (" + fmt(r.break_even_years, 2) + " yr)";
    oVerdict.textContent = r.verdict + (r.flags.length ? " | " + r.flags.join(" | ") : "");
  }, DEBOUNCE_MS);
  for (const f of [P, rb, rp, c, yrs, hold]) f.input.addEventListener("input", update);
}

// ====================================================================
// X.3 Per-diem prorated interest at closing
// ====================================================================
//
// Prepaid (odd-days) interest covers the stub period from the closing /
// funding date through the last day of that month, because the first
// regular payment is due the first of the following month and pays the
// month in arrears. Daily interest = loan * rate / day-count basis; the
// prepaid amount is the daily figure times the days from closing to the
// end of the month (counting the closing day). It is the prepaid-
// interest line on the CFPB Closing Disclosure.

// dims: in { loan_amount: dimensionless, annual_rate_pct: dimensionless, closing_date_iso: dimensionless, day_count: dimensionless }
//        out: { days_to_eom: T }
// (Monetary aggregates and the annual rate are dimensionless; the
//  closing date and day-count convention are categorical; the day
//  count to end-of-month carries time dimension T.)
export function computePerDiemInterest({ loan_amount, annual_rate_pct, closing_date_iso, day_count }) {
  const P = Number(loan_amount);
  const rate = Number(annual_rate_pct);
  if (!Number.isFinite(P) || P <= 0) return { error: "Enter a positive loan amount." };
  if (!Number.isFinite(rate) || rate < 0) return { error: "Enter a non-negative annual rate." };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(closing_date_iso || ""));
  if (!m) return { error: "Enter a closing date in YYYY-MM-DD format." };
  const year = +m[1], month = +m[2], day = +m[3];
  if (month < 1 || month > 12 || day < 1 || day > 31) return { error: "Closing date is not a valid calendar date." };
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return { error: "Closing day is past the last day of that month." };
  const conv = String(day_count || "actual365");
  const basis = (conv === "actual360" || conv === "thirty360") ? 360 : 365;
  // DR-12: under 30/360 the 31st is treated as day 30, so a close on the
  // 31st should still accrue one inclusive day, not zero. Cap the day at 30
  // before the subtraction instead of letting 30 - 31 + 1 underflow to 0.
  const days_to_eom = conv === "thirty360" ? (30 - Math.min(day, 30) + 1) : (lastDay - day + 1);
  const daily_interest = P * (rate / 100) / basis;
  const prepaid_interest = daily_interest * days_to_eom;
  const conv_label = conv === "actual360" ? "Actual/360" : conv === "thirty360" ? "30/360" : "Actual/365";
  return { daily_interest, days_to_eom, prepaid_interest, basis, last_day_of_month: lastDay, conv_label };
}

export const perDiemInterestExample = {
  // $300k at 6.0%, close 2026-06-15, Actual/365: daily 49.3151, 16 days
  // (Jun 15..30 inclusive) -> prepaid 789.04.
  inputs: { loan_amount: 300000, annual_rate_pct: 6.0, closing_date_iso: "2026-06-15", day_count: "actual365" },
  expected: { prepaid_interest: 789.0411 },
};

const DAYCOUNT_OPTS = [
  { value: "actual365", label: "Actual/365 (typical)" },
  { value: "actual360", label: "Actual/360" },
  { value: "thirty360", label: "30/360" },
];

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPerDiemInterest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: CFPB Closing Disclosure prepaid-interest line (12 CFR 1026.38, Appendix H). Daily interest = loan * annual rate / day-count basis; prepaid interest covers the closing day through the last day of the month (the first regular payment, due the 1st of the following month, pays in arrears). Day-count convention varies by lender; Actual/365 is typical for owner-occupied conventional loans. Lender governs the actual figure.";
  const P = makeNumber("Loan amount ($)", "pdi-p", { step: "any", min: "0" });
  const rate = makeNumber("Annual interest rate (percent)", "pdi-r", { step: "any", min: "0", max: "30" });
  const D = makeText("Closing date (YYYY-MM-DD)", "pdi-d", { placeholder: "2026-06-15" });
  const C = makeSelect("Day-count convention", "pdi-c", DAYCOUNT_OPTS);
  for (const f of [P, rate, D, C]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = perDiemInterestExample.inputs;
    P.input.value = String(ex.loan_amount); rate.input.value = String(ex.annual_rate_pct);
    D.input.value = ex.closing_date_iso; C.select.value = ex.day_count; update();
  });
  const oDaily = makeOutputLine(outputRegion, "Daily interest", "pdi-out-daily");
  const oDays = makeOutputLine(outputRegion, "Days to end of month", "pdi-out-days");
  const oPrepaid = makeOutputLine(outputRegion, "Prepaid interest at closing", "pdi-out-prepaid");
  const update = debounce(() => {
    const r = computePerDiemInterest({
      loan_amount: P.input.value, annual_rate_pct: rate.input.value,
      closing_date_iso: D.input.value || "", day_count: C.select.value,
    });
    if (r.error) { oDaily.textContent = r.error; for (const o of [oDays, oPrepaid]) o.textContent = "-"; return; }
    oDaily.textContent = "$" + fmt(r.daily_interest, 4) + " / day (" + r.conv_label + ")";
    oDays.textContent = r.days_to_eom + " day" + (r.days_to_eom === 1 ? "" : "s");
    oPrepaid.textContent = "$" + fmt(r.prepaid_interest, 2);
  }, DEBOUNCE_MS);
  for (const el of [P.input, rate.input, D.input]) el.addEventListener("input", update);
  C.select.addEventListener("change", update);
}

// ====================================================================
// X.4 Reserves requirement (months of PITI)
// ====================================================================
//
// Reserves are liquid assets left after closing, measured in months of
// PITI. Required = PITI * months; eligible assets are liquid funds plus
// an allowable fraction of vested retirement (commonly ~60 percent of
// the vested, withdrawable balance). The agency requirement varies by
// loan type (conventional 0-6, jumbo 6-12, investment 6+), so the
// months figure is user-supplied.

// dims: in { piti_monthly: dimensionless, reserves_months: T, liquid_assets: dimensionless, retirement_balance: dimensionless, retirement_allowable_pct: dimensionless }
//        out: { required: dimensionless }
// (Monetary aggregates and the allowable percent are dimensionless;
//  the reserves requirement carries time dimension T (months of PITI).)
export function computeMortgageReserves({ piti_monthly, reserves_months, liquid_assets, retirement_balance, retirement_allowable_pct }) {
  const piti = Number(piti_monthly);
  const months = Number(reserves_months);
  const liquid = Number(liquid_assets) || 0;
  const ret = Number(retirement_balance) || 0;
  const retPct = (retirement_allowable_pct === undefined || retirement_allowable_pct === "" || retirement_allowable_pct === null) ? 60 : Number(retirement_allowable_pct);
  if (!Number.isFinite(piti) || piti <= 0) return { error: "Enter a positive monthly PITI." };
  if (!Number.isFinite(months) || months < 0) return { error: "Enter a non-negative reserves-months requirement." };
  if (liquid < 0 || ret < 0) return { error: "Asset balances cannot be negative." };
  if (!Number.isFinite(retPct) || retPct < 0 || retPct > 100) return { error: "Retirement allowable percent must be 0 to 100." };
  const required = piti * months;
  const eligible_retirement = ret * retPct / 100;
  const eligible = liquid + eligible_retirement;
  const delta = eligible - required;
  const flags = [];
  if (months > 24) flags.push("Reserves above 24 months is outside the typical agency range; verify the program.");
  return { required, eligible, eligible_retirement, delta, months_covered: piti > 0 ? eligible / piti : 0, meets: delta >= 0, flags };
}

export const mortgageReservesExample = {
  // PITI $2,500, 6 months required, $20k liquid + 60% of $30k retirement
  // -> required 15,000; eligible 38,000; surplus 23,000.
  inputs: { piti_monthly: 2500, reserves_months: 6, liquid_assets: 20000, retirement_balance: 30000, retirement_allowable_pct: 60 },
  expected: { required: 15000, eligible: 38000, delta: 23000 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderMortgageReserves(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Reserves = PITI * required months, measured against eligible post-closing liquid assets plus an allowable fraction of vested retirement (Fannie Mae Selling Guide B3-4.1-01 / B3-4.3-03; Freddie Mac Single-Family Seller/Servicer Guide 5501.2). Required months vary by loan type and program (conventional 0-6, jumbo 6-12, investment 6+). Lender governs the final requirement and which assets count.";
  const piti = makeNumber("Monthly PITI ($)", "res-piti", { step: "any", min: "0" });
  const months = makeNumber("Reserves required (months)", "res-months", { step: "any", min: "0", value: "6" });
  const liquid = makeNumber("Liquid assets after closing ($)", "res-liquid", { step: "any", min: "0", value: "0" });
  const ret = makeNumber("Vested retirement balance ($, optional)", "res-ret", { step: "any", min: "0", value: "0" });
  const retPct = makeNumber("Retirement allowable (percent)", "res-retpct", { step: "any", min: "0", max: "100", value: "60" });
  for (const f of [piti, months, liquid, ret, retPct]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = mortgageReservesExample.inputs;
    piti.input.value = String(ex.piti_monthly); months.input.value = String(ex.reserves_months);
    liquid.input.value = String(ex.liquid_assets); ret.input.value = String(ex.retirement_balance);
    retPct.input.value = String(ex.retirement_allowable_pct); update();
  });
  const oReq = makeOutputLine(outputRegion, "Required reserves", "res-out-req");
  const oElig = makeOutputLine(outputRegion, "Eligible assets", "res-out-elig");
  const oDelta = makeOutputLine(outputRegion, "Surplus / shortfall", "res-out-delta");
  const oCovered = makeOutputLine(outputRegion, "Months of PITI covered", "res-out-cov");
  const update = debounce(() => {
    const r = computeMortgageReserves({
      piti_monthly: piti.input.value, reserves_months: months.input.value, liquid_assets: liquid.input.value,
      retirement_balance: ret.input.value, retirement_allowable_pct: retPct.input.value,
    });
    if (r.error) { oReq.textContent = r.error; for (const o of [oElig, oDelta, oCovered]) o.textContent = "-"; return; }
    oReq.textContent = "$" + fmt(r.required, 2);
    oElig.textContent = "$" + fmt(r.eligible, 2) + " (incl. $" + fmt(r.eligible_retirement, 2) + " retirement)";
    oDelta.textContent = (r.meets ? "Surplus $" : "Shortfall $") + fmt(Math.abs(r.delta), 2) + (r.flags.length ? " | " + r.flags.join(" | ") : "");
    oCovered.textContent = fmt(r.months_covered, 1) + " months";
  }, DEBOUNCE_MS);
  for (const f of [piti, months, liquid, ret, retPct]) f.input.addEventListener("input", update);
}

// ====================================================================
// X.2 Rent vs buy NPV comparison
// ====================================================================
//
// A present-value comparison of the two paths over a fixed holding
// period, discounted at the opportunity cost of capital (the rate the
// down payment would earn if invested instead). Both paths are
// expressed as a present value of out-of-pocket cost in today's
// dollars; the lower-PV path wins. This is the New York Times rent-vs-
// buy methodology in its first-principles form.
//
//   discount factor   d_t = 1 / (1 + i)^t,  i = investment return rate
//
//   BUY path PV cost  = down_payment                       (spent at t0)
//                     + Σ_{t=1..N} ownership_outflow_t * d_t
//                     − net_sale_proceeds * d_N
//     ownership_outflow = mortgage P&I + property tax + insurance
//                         + HOA + maintenance (annual)
//     net_sale_proceeds = home_value_N − selling_costs − loan_balance_N
//     home_value_N      = price * (1 + appreciation)^N
//
//   RENT path PV cost  = Σ_{t=1..N} rent_year_t * d_t
//     rent_year_t       = rent_monthly * 12 * (1 + rent_inflation)^(t-1)
//
//   difference = PV_buy − PV_rent   (negative ⇒ buying is cheaper)
//
// The renter keeps the down payment invested at the discount rate, so
// it carries zero net present value and correctly drops out of the
// rent path. Property tax, insurance, HOA, and maintenance are held on
// the entered values (not inflated) for transparency; the user can
// re-run with adjusted figures. Tax treatment (mortgage-interest
// deduction, the Section 121 exclusion) is out of scope here and noted.

// dims: in { purchase_price: dimensionless, down_payment: dimensionless, mortgage_rate_pct: dimensionless, term_years: T, property_tax_pct: dimensionless, insurance_annual: dimensionless, hoa_monthly: dimensionless, maintenance_pct: dimensionless, appreciation_pct: dimensionless, rent_monthly: dimensionless, rent_inflation_pct: dimensionless, investment_return_pct: dimensionless, holding_years: T, selling_cost_pct: dimensionless }
//        out: { npv_buy: dimensionless, npv_rent: dimensionless, difference: dimensionless, break_even_years: T, verdict: dimensionless }
// (All monetary inputs/outputs are dimensionless dollar aggregates per
//  the §7.1 convention; term and holding period carry T.)
export function computeRentVsBuy(inp) {
  const price = Number(inp.purchase_price);
  const down = Number(inp.down_payment);
  const rate = Number(inp.mortgage_rate_pct);
  const term = Number(inp.term_years);
  const taxPct = Number(inp.property_tax_pct);
  const ins = Number(inp.insurance_annual) || 0;
  const hoa = Number(inp.hoa_monthly) || 0;
  const maintPct = Number(inp.maintenance_pct) || 0;
  const appr = inp.appreciation_pct === undefined || inp.appreciation_pct === "" ? 3 : Number(inp.appreciation_pct);
  const rent = Number(inp.rent_monthly);
  const rentInfl = inp.rent_inflation_pct === undefined || inp.rent_inflation_pct === "" ? 3 : Number(inp.rent_inflation_pct);
  const ret = inp.investment_return_pct === undefined || inp.investment_return_pct === "" ? 5 : Number(inp.investment_return_pct);
  const hold = Number(inp.holding_years);
  const sellPct = inp.selling_cost_pct === undefined || inp.selling_cost_pct === "" ? 6 : Number(inp.selling_cost_pct);

  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a positive purchase price." };
  if (!Number.isFinite(down) || down < 0) return { error: "Enter a non-negative down payment." };
  if (down > price) return { error: "Down payment cannot exceed the purchase price." };
  if (!Number.isFinite(rate) || rate < 0 || rate > 30) return { error: "Enter a mortgage rate 0 to 30 percent." };
  if (!Number.isFinite(term) || term <= 0 || term > 50) return { error: "Enter a loan term 1 to 50 years." };
  if (!Number.isFinite(taxPct) || taxPct < 0) return { error: "Enter a non-negative property tax percent." };
  if (!Number.isFinite(rent) || rent <= 0) return { error: "Enter a positive monthly rent." };
  if (!Number.isFinite(ret) || ret < 0 || ret > 30) return { error: "Enter an investment return 0 to 30 percent." };
  if (!Number.isFinite(hold) || hold <= 0) return { error: "Enter a positive holding period in years." };
  if (hold > 30) return { error: "Holding period over 30 years is outside this tile's scope." };

  const N = Math.round(hold);
  const loan = price - down;
  const n = Math.round(term * 12);
  const mr = rate / 100 / 12;
  const pi = mr === 0 ? loan / n : (loan * mr) / (1 - Math.pow(1 + mr, -n));
  // Remaining balance after N years (N*12 payments) on the loan.
  const k = Math.min(N * 12, n);
  const balance = mr === 0 ? loan - pi * k : loan * Math.pow(1 + mr, k) - pi * (Math.pow(1 + mr, k) - 1) / mr;
  const loan_balance_N = Math.max(0, balance);

  const i = ret / 100;
  const annual_ownership = pi * 12 + (taxPct / 100) * price + ins + hoa * 12 + (maintPct / 100) * price;

  // PV of the level annual ownership outflow over N years.
  let pv_ownership = 0;
  for (let t = 1; t <= N; t++) pv_ownership += annual_ownership / Math.pow(1 + i, t);

  const home_value_N = price * Math.pow(1 + appr / 100, N);
  const selling_costs = (sellPct / 100) * home_value_N;
  const net_sale = home_value_N - selling_costs - loan_balance_N;
  const pv_net_sale = net_sale / Math.pow(1 + i, N);

  const npv_buy = down + pv_ownership - pv_net_sale;

  // PV of inflating rent over N years.
  let npv_rent = 0;
  for (let t = 1; t <= N; t++) {
    const rent_year = rent * 12 * Math.pow(1 + rentInfl / 100, t - 1);
    npv_rent += rent_year / Math.pow(1 + i, t);
  }

  const difference = npv_buy - npv_rent;

  // Break-even horizon: smallest whole year (1..min(hold,30)) at which
  // buying's PV cost first drops to or below renting's. Recomputes the
  // closed-form PV at each horizon with the same model.
  let break_even_years = null;
  const horizon = Math.min(N, 30);
  for (let y = 1; y <= horizon; y++) {
    let own = 0;
    for (let t = 1; t <= y; t++) own += annual_ownership / Math.pow(1 + i, t);
    const ky = Math.min(y * 12, n);
    const baly = mr === 0 ? loan - pi * ky : Math.max(0, loan * Math.pow(1 + mr, ky) - pi * (Math.pow(1 + mr, ky) - 1) / mr);
    const hv = price * Math.pow(1 + appr / 100, y);
    const ns = hv - (sellPct / 100) * hv - baly;
    const buyY = down + own - ns / Math.pow(1 + i, y);
    let rentY = 0;
    for (let t = 1; t <= y; t++) rentY += rent * 12 * Math.pow(1 + rentInfl / 100, t - 1) / Math.pow(1 + i, t);
    if (buyY <= rentY) { break_even_years = y; break; }
  }

  let verdict;
  if (difference < 0) {
    verdict = "Buying is cheaper by $" + fmt(-difference, 0) + " in today's dollars over " + N + " yr.";
  } else {
    verdict = "Renting is cheaper by $" + fmt(difference, 0) + " in today's dollars over " + N + " yr.";
  }

  return {
    monthly_pi: pi,
    annual_ownership,
    home_value_N,
    net_sale,
    loan_balance_N,
    npv_buy,
    npv_rent,
    difference,
    break_even_years,
    verdict,
  };
}

export const rentVsBuyExample = {
  // $400k home, $80k down, 6.5% / 30 yr, tax 1.2%, ins $1,800, HOA $0,
  // maint 1%, appreciation 3%, rent $2,200/mo, rent inflation 3%,
  // investment return 5%, hold 7 yr, selling cost 6%.
  inputs: {
    purchase_price: 400000, down_payment: 80000, mortgage_rate_pct: 6.5, term_years: 30,
    property_tax_pct: 1.2, insurance_annual: 1800, hoa_monthly: 0, maintenance_pct: 1,
    appreciation_pct: 3, rent_monthly: 2200, rent_inflation_pct: 3, investment_return_pct: 5,
    holding_years: 7, selling_cost_pct: 6,
  },
  // P&I 2022.62/mo; annual ownership 34871.41; home value 491949.55 at
  // exit; loan balance 289331.98; net sale 173100.59; buying cheaper by
  // ~$7,496 in today's dollars; break-even at year 6.
  expected: { npv_buy: 158759.65, npv_rent: 166256.12, difference: -7496.47 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderRentVsBuy(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: New York Times rent-vs-buy methodology (first-principles DCF). Each path is a present value of out-of-pocket cost discounted at the investment-return rate. PV_buy = down payment + PV(P&I + tax + insurance + HOA + maintenance) − PV(net sale proceeds); PV_rent = PV(inflating rent). Lower PV wins. Tax treatment (mortgage-interest deduction, Section 121 capital-gains exclusion) is out of scope and varies; consult a CPA. Estimate only; lender and market govern actual figures.";
  const price = makeNumber("Purchase price ($)", "rvb-price", { step: "any", min: "0" });
  const down = makeNumber("Down payment ($)", "rvb-down", { step: "any", min: "0" });
  const rate = makeNumber("Mortgage rate (percent)", "rvb-rate", { step: "any", min: "0", max: "30" });
  const term = makeNumber("Loan term (years)", "rvb-term", { step: "1", min: "1", max: "50", value: "30" });
  const tax = makeNumber("Property tax (annual percent of price)", "rvb-tax", { step: "any", min: "0", value: "1.2" });
  const ins = makeNumber("Insurance (annual $)", "rvb-ins", { step: "any", min: "0", value: "0" });
  const hoa = makeNumber("HOA (monthly $)", "rvb-hoa", { step: "any", min: "0", value: "0" });
  const maint = makeNumber("Maintenance (annual percent of price)", "rvb-maint", { step: "any", min: "0", value: "1" });
  const appr = makeNumber("Appreciation (annual percent)", "rvb-appr", { step: "any", value: "3" });
  const rent = makeNumber("Rent (monthly $)", "rvb-rent", { step: "any", min: "0" });
  const rentInfl = makeNumber("Rent inflation (annual percent)", "rvb-rinfl", { step: "any", value: "3" });
  const ret = makeNumber("Investment return / discount (annual percent)", "rvb-ret", { step: "any", min: "0", max: "30", value: "5" });
  const hold = makeNumber("Holding period (years)", "rvb-hold", { step: "1", min: "1", max: "30" });
  const sell = makeNumber("Selling cost (percent of sale)", "rvb-sell", { step: "any", min: "0", value: "6" });
  const fields = [price, down, rate, term, tax, ins, hoa, maint, appr, rent, rentInfl, ret, hold, sell];
  for (const f of fields) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = rentVsBuyExample.inputs;
    price.input.value = String(ex.purchase_price); down.input.value = String(ex.down_payment);
    rate.input.value = String(ex.mortgage_rate_pct); term.input.value = String(ex.term_years);
    tax.input.value = String(ex.property_tax_pct); ins.input.value = String(ex.insurance_annual);
    hoa.input.value = String(ex.hoa_monthly); maint.input.value = String(ex.maintenance_pct);
    appr.input.value = String(ex.appreciation_pct); rent.input.value = String(ex.rent_monthly);
    rentInfl.input.value = String(ex.rent_inflation_pct); ret.input.value = String(ex.investment_return_pct);
    hold.input.value = String(ex.holding_years); sell.input.value = String(ex.selling_cost_pct);
    update();
  });
  const oBuy = makeOutputLine(outputRegion, "NPV cost of buying (today's $)", "rvb-out-buy");
  const oRent = makeOutputLine(outputRegion, "NPV cost of renting (today's $)", "rvb-out-rent");
  const oDiff = makeOutputLine(outputRegion, "Difference (buy − rent)", "rvb-out-diff");
  const oBE = makeOutputLine(outputRegion, "Break-even holding period", "rvb-out-be");
  const oSale = makeOutputLine(outputRegion, "Net sale proceeds at exit", "rvb-out-sale");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "rvb-out-verdict");
  const update = debounce(() => {
    const r = computeRentVsBuy({
      purchase_price: price.input.value, down_payment: down.input.value, mortgage_rate_pct: rate.input.value,
      term_years: term.input.value, property_tax_pct: tax.input.value, insurance_annual: ins.input.value,
      hoa_monthly: hoa.input.value, maintenance_pct: maint.input.value, appreciation_pct: appr.input.value,
      rent_monthly: rent.input.value, rent_inflation_pct: rentInfl.input.value, investment_return_pct: ret.input.value,
      holding_years: hold.input.value, selling_cost_pct: sell.input.value,
    });
    if (r.error) { oBuy.textContent = r.error; for (const o of [oRent, oDiff, oBE, oSale, oVerdict]) o.textContent = "-"; return; }
    oBuy.textContent = "$" + fmt(r.npv_buy, 0);
    oRent.textContent = "$" + fmt(r.npv_rent, 0);
    oDiff.textContent = (r.difference < 0 ? "−$" : "$") + fmt(Math.abs(r.difference), 0) + (r.difference < 0 ? " (buy favored)" : " (rent favored)");
    oBE.textContent = r.break_even_years == null ? "Renting stays cheaper through the horizon" : r.break_even_years + " yr";
    oSale.textContent = "$" + fmt(r.net_sale, 0) + " (home $" + fmt(r.home_value_N, 0) + " − costs − $" + fmt(r.loan_balance_N, 0) + " loan)";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of fields) f.input.addEventListener("input", update);
}

export const REALESTATE_RENDERERS = {
  "ltv": renderLTV,
  "dti": renderDTI,
  "piti": renderPITI,
  "exchange-1031-timeline": render1031Timeline,
  "section-121-exclusion": renderSection121,
  "property-tax": renderPropertyTax,
  "cap-rate-dscr": renderCapRateDSCR,
  "cash-on-cash": renderCashOnCash,
  "commission-split": renderCommissionSplit,
  "amortization-schedule": renderAmortizationSchedule,
  "cost-of-waiting": renderCostOfWaiting,
  "closing-costs": renderClosingCosts,
  "rental-worksheet": renderRentalWorksheet,
  "loan-limits": renderLoanLimits,
  "hud-fmr": renderHudFmr,
  "mortgage-point-breakeven": renderMortgagePointBreakeven,
  "per-diem-interest": renderPerDiemInterest,
  "mortgage-reserves": renderMortgageReserves,
  "rent-vs-buy": renderRentVsBuy,
};
