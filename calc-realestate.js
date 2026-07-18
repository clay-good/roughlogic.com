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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
// non-qualified-use period) are flags only -- the user attests.

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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
export function computeCapRateDSCR({ noi_annual, property_value, annual_debt_service, loan_amount = 0, loan_rate_pct = 0, amort_years = 0, operating_expenses_annual = 0, potential_gross_income = 0 }) {
  const noi = Number(noi_annual);
  const val = Number(property_value);
  let ads = Number(annual_debt_service);
  if (!Number.isFinite(noi) || noi < 0) return { error: "Enter a non-negative annual NOI." };
  if (!Number.isFinite(val) || val <= 0) return { error: "Enter a positive property value (or purchase price)." };
  // v23 EN.20: compute debt service from loan terms when supplied (most
  // buyers have a loan, not a payment) and the break-even occupancy ratio.
  const loan = Number(loan_amount) || 0;
  const ratePct = Number(loan_rate_pct) || 0;
  const years = Number(amort_years) || 0;
  let annual_debt_service_computed = null;
  if (loan > 0 && years > 0 && Number.isFinite(loan) && Number.isFinite(years)) {
    const n = years * 12;
    const c = ratePct / 100 / 12;
    let monthly;
    if (c > 0) monthly = (loan * c) / (1 - Math.pow(1 + c, -n));
    else monthly = loan / n; // rate = 0 handled
    const annual = monthly * 12;
    if (Number.isFinite(annual)) annual_debt_service_computed = annual;
  }
  // Prefer the entered debt service; otherwise use the computed one.
  if (!(Number.isFinite(ads) && ads > 0) && annual_debt_service_computed != null) ads = annual_debt_service_computed;
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
  // Break-even occupancy = (operating expenses + debt service) / potential
  // gross income (the one ratio a lender and a buyer both check).
  const opex = Number(operating_expenses_annual) || 0;
  const pgi = Number(potential_gross_income) || 0;
  let break_even_occupancy = null;
  if (pgi > 0 && Number.isFinite(pgi) && Number.isFinite(opex) && Number.isFinite(ads) && ads > 0) {
    const v = (opex + ads) / pgi;
    if (Number.isFinite(v)) break_even_occupancy = v;
  }
  return {
    noi_annual: noi,
    property_value: val,
    cap_rate_percent: cap,
    cap_band,
    annual_debt_service: (Number.isFinite(ads) && ads > 0) ? ads : null,
    annual_debt_service_computed,
    break_even_occupancy,
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
  // v23 EN.20: loan terms (so debt service is computed) + break-even occupancy.
  const LA = makeNumber("Loan amount ($, optional)", "cr-la", { step: "any", min: "0" });
  const LR = makeNumber("Loan rate (% APR, optional)", "cr-lr", { step: "any", min: "0" });
  const LY = makeNumber("Amortization (years, optional)", "cr-ly", { step: "any", min: "0" });
  const OE = makeNumber("Operating expenses ($/yr, for break-even)", "cr-oe", { step: "any", min: "0" });
  const PG = makeNumber("Potential gross income ($/yr, for break-even)", "cr-pg", { step: "any", min: "0" });
  for (const f of [N, V, D, LA, LR, LY, OE, PG]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    N.input.value = String(capRateExample.inputs.noi_annual);
    V.input.value = String(capRateExample.inputs.property_value);
    D.input.value = "0";
    LA.input.value = "750000"; LR.input.value = "6.5"; LY.input.value = "30"; OE.input.value = "40000"; PG.input.value = "120000";
    update();
  });
  const oCap = makeOutputLine(outputRegion, "Cap rate (%)", "cr-out-cap");
  const oCapBand = makeOutputLine(outputRegion, "Cap-rate band", "cr-out-capband");
  const oDS = makeOutputLine(outputRegion, "Debt service (computed from loan)", "cr-out-ds");
  const oDSCR = makeOutputLine(outputRegion, "DSCR", "cr-out-dscr");
  const oDSCRBand = makeOutputLine(outputRegion, "DSCR band", "cr-out-dscrband");
  const oBE = makeOutputLine(outputRegion, "Break-even occupancy", "cr-out-be");
  const update = debounce(() => {
    const r = computeCapRateDSCR({
      noi_annual: N.input.value, property_value: V.input.value, annual_debt_service: D.input.value,
      loan_amount: Number(LA.input.value) || 0, loan_rate_pct: Number(LR.input.value) || 0, amort_years: Number(LY.input.value) || 0,
      operating_expenses_annual: Number(OE.input.value) || 0, potential_gross_income: Number(PG.input.value) || 0,
    });
    if (r.error) {
      oCap.textContent = r.error;
      for (const o of [oCapBand, oDS, oDSCR, oDSCRBand, oBE]) o.textContent = "-";
      return;
    }
    oCap.textContent = fmt(r.cap_rate_percent, 2) + "%";
    oCapBand.textContent = r.cap_band;
    oDS.textContent = r.annual_debt_service_computed == null ? "(enter loan amount + amortization)" : "$" + fmt(r.annual_debt_service_computed, 0) + "/yr";
    oDSCR.textContent = r.dscr == null ? "(enter or compute debt service)" : fmt(r.dscr, 2);
    oDSCRBand.textContent = r.dscr_band || "-";
    oBE.textContent = r.break_even_occupancy == null ? "(enter OpEx + potential gross income)" : fmt(r.break_even_occupancy * 100, 1) + "% occupancy to break even";
  }, DEBOUNCE_MS);
  for (const el of [N.input, V.input, D.input, LA.input, LR.input, LY.input, OE.input, PG.input]) el.addEventListener("input", update);
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
      oArea.textContent = "FY" + r.fiscal_year + " - unknown FMR area";
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// =====================================================================
// v23 shared simple-renderer (select + number fields). Non-exported.
// =====================================================================
function _v23SimpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select" ? makeSelect(f.label, f.id || f.key, f.options) : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) { if (f.kind === "select") field.select.value = f.default; else field.input.value = String(f.default); }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key]; else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = f.kind === "select" ? fields[f.key].select.value : (Number(fields[f.key].input.value) || 0);
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) (f.kind === "select" ? fields[f.key].select : fields[f.key].input).addEventListener("input", update);
  };
}

// =====================================================================
// v23 X.1: Depreciation recapture on sale (IRC §1245 / §1250)
// =====================================================================
// dims: in { asset_class: dimensionless, accumulated_depreciation: dimensionless, total_gain: dimensionless, ordinary_rate_pct: dimensionless, straight_line_depreciation: dimensionless, max_1250_rate_pct: dimensionless } out: { recaptured: dimensionless, rate_applied_pct: dimensionless, recapture_tax: dimensionless, remaining_capital_gain: dimensionless }
export function computeDepreciationRecapture({ asset_class = "1250", accumulated_depreciation = 0, total_gain = 0, ordinary_rate_pct = 0, straight_line_depreciation = 0, max_1250_rate_pct = 25 } = {}) {
  const accum = Number(accumulated_depreciation) || 0;
  const gain = Number(total_gain) || 0;
  const ord = Number(ordinary_rate_pct) || 0;
  const sl = Number(straight_line_depreciation) || 0;
  let max25 = Number(max_1250_rate_pct); if (!Number.isFinite(max25) || max25 < 0) max25 = 25;
  if (!(accum >= 0 && Number.isFinite(accum))) return { error: "Accumulated depreciation must be zero or positive ($)." };
  if (!(gain >= 0 && Number.isFinite(gain))) return { error: "Total gain must be zero or positive ($)." };
  if (!(ord >= 0 && ord <= 100 && Number.isFinite(ord))) return { error: "Ordinary rate must be in [0, 100]%." };
  if (asset_class === "1245") {
    const recaptured = Math.min(gain, accum);
    const recapture_tax = recaptured * (ord / 100);
    return { asset_class: "1245", recaptured, rate_applied_pct: ord, recapture_tax, remaining_capital_gain: gain - recaptured };
  }
  // §1250 real property: unrecaptured §1250 gain = min(gain, straight-line depreciation) at the 25% max.
  const slClamped = Math.max(0, Math.min(sl, accum));
  const recaptured = Math.min(gain, slClamped);
  const recapture_tax = recaptured * (max25 / 100);
  return { asset_class: "1250", recaptured, rate_applied_pct: max25, recapture_tax, remaining_capital_gain: gain - recaptured };
}
export const depreciationRecaptureExample = { inputs: { asset_class: "1250", accumulated_depreciation: 100000, total_gain: 150000, ordinary_rate_pct: 32, straight_line_depreciation: 100000, max_1250_rate_pct: 25 } };
const renderDepreciationRecapture = _v23SimpleRenderer({
  citation: "Citation: Per IRS Pub 544 and IRC §1245 / §1250 - the §1250 unrecaptured-gain 25% maximum rate and §1245 ordinary recapture. Recapture cannot exceed the gain; the 25% figure is a maximum, not a flat rate; state recapture differs. Complements the macrs-depreciation and section-179 tiles. Tax information, not advice; current IRS rules and a CPA govern. Free at irs.gov and uscode.house.gov.",
  example: depreciationRecaptureExample.inputs,
  fields: [
    { key: "asset_class", label: "Asset class", kind: "select", options: [
      { value: "1250", label: "§1250 real property" },
      { value: "1245", label: "§1245 personal property" },
    ] },
    { key: "accumulated_depreciation", label: "Accumulated depreciation ($)", kind: "number" },
    { key: "total_gain", label: "Total gain on sale ($)", kind: "number" },
    { key: "ordinary_rate_pct", label: "Ordinary income rate (%)", kind: "number" },
    { key: "straight_line_depreciation", label: "Straight-line depreciation ($, §1250)", kind: "number" },
    { key: "max_1250_rate_pct", label: "§1250 max rate (%)", kind: "number", default: 25 },
  ],
  outputs: [
    { key: "rec", id: "dr-out-rec", label: "Recaptured amount", value: (r) => "$" + fmt(r.recaptured, 0) + " at " + fmt(r.rate_applied_pct, 0) + "%" },
    { key: "tax", id: "dr-out-tax", label: "Recapture tax", value: (r) => "$" + fmt(r.recapture_tax, 0) },
    { key: "cg", id: "dr-out-cg", label: "Remaining capital-gain portion", value: (r) => "$" + fmt(r.remaining_capital_gain, 0) },
  ],
  compute: computeDepreciationRecapture,
});
REALESTATE_RENDERERS["depreciation-recapture"] = renderDepreciationRecapture;

// =====================================================================
// v23 X.2: Rent roll to effective gross income (Appraisal Institute EGI)
// =====================================================================
// dims: in { potential_gross_rent: dimensionless, vacancy_rate_pct: dimensionless, credit_loss_pct: dimensionless, other_income: dimensionless } out: { vacancy_credit_loss: dimensionless, effective_gross_income: dimensionless, loss_percent_of_potential: dimensionless }
export function computeRentRollVacancy({ potential_gross_rent = 0, vacancy_rate_pct = 0, credit_loss_pct = 0, other_income = 0 } = {}) {
  const pgr = Number(potential_gross_rent) || 0;
  const vac = Number(vacancy_rate_pct) || 0;
  const cred = Number(credit_loss_pct) || 0;
  let other = Number(other_income); if (!Number.isFinite(other)) other = 0;
  if (!(pgr > 0 && Number.isFinite(pgr))) return { error: "Potential gross rent must be positive ($/yr)." };
  if (!(vac >= 0 && Number.isFinite(vac))) return { error: "Vacancy rate must be zero or positive (%)." };
  if (!(cred >= 0 && Number.isFinite(cred))) return { error: "Credit-loss rate must be zero or positive (%)." };
  if (vac + cred > 100) return { error: "Vacancy + credit loss cannot exceed 100%." };
  const vacancy_credit_loss = pgr * ((vac + cred) / 100);
  const effective_gross_income = pgr - vacancy_credit_loss + other;
  const loss_percent_of_potential = (vacancy_credit_loss / pgr) * 100;
  return { vacancy_credit_loss, effective_gross_income, loss_percent_of_potential };
}
export const rentRollVacancyExample = { inputs: { potential_gross_rent: 120000, vacancy_rate_pct: 5, credit_loss_pct: 2, other_income: 6000 } };
const renderRentRollVacancy = _v23SimpleRenderer({
  citation: "Citation: Per the Appraisal Institute income-approach EGI definition (EGI = potential rent x (1 - vacancy% - credit%) + other income). Other income is not vacancy-adjusted. Feeds the cap-rate-dscr tile. Appraiser and lender govern the underwritten figures.",
  example: rentRollVacancyExample.inputs,
  fields: [
    { key: "potential_gross_rent", label: "Potential gross rent ($/yr)", kind: "number" },
    { key: "vacancy_rate_pct", label: "Vacancy rate (%)", kind: "number" },
    { key: "credit_loss_pct", label: "Credit-loss rate (%)", kind: "number" },
    { key: "other_income", label: "Other income ($/yr)", kind: "number" },
  ],
  outputs: [
    { key: "loss", id: "rrv-out-loss", label: "Vacancy / credit loss", value: (r) => "$" + fmt(r.vacancy_credit_loss, 0) + " (" + fmt(r.loss_percent_of_potential, 1) + "% of potential)" },
    { key: "egi", id: "rrv-out-egi", label: "Effective gross income", value: (r) => "$" + fmt(r.effective_gross_income, 0) },
  ],
  compute: computeRentRollVacancy,
});
REALESTATE_RENDERERS["rent-roll-vacancy"] = renderRentRollVacancy;

// ===========================================================================
// spec-v20 Phase X - three new real-estate tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 X.1: Gross rent multiplier (`gross-rent-multiplier`) ---
// GRM_annual = price / gross_annual_rent; implied_value = market_GRM * gross_rent.
// dims: in { price: dimensionless, gross_rent: dimensionless, rent_basis: dimensionless, market_grm: dimensionless } out: { grm_annual: dimensionless, gross_yield_pct: dimensionless }
export function computeGrossRentMultiplier({ price = 0, gross_rent = 0, rent_basis = "annual", market_grm = 0 } = {}) {
  const P = Number(price) || 0;
  const rent = Number(gross_rent) || 0;
  const mgrm = Number(market_grm) || 0;
  if (!(P > 0 && Number.isFinite(P))) return { error: "Purchase price / value must be positive ($)." };
  if (!(rent > 0 && Number.isFinite(rent))) return { error: "Gross rental income must be positive ($)." };
  const annualRent = rent_basis === "monthly" ? rent * 12 : rent;
  const monthlyRent = rent_basis === "monthly" ? rent : rent / 12;
  const grmAnnual = P / annualRent;
  const grmMonthly = P / monthlyRent;
  const grossYield = 1 / grmAnnual * 100;
  const impliedValue = mgrm > 0 ? mgrm * annualRent : null;
  return {
    grm_annual: Number.isFinite(grmAnnual) ? grmAnnual : null,
    grm_monthly: Number.isFinite(grmMonthly) ? grmMonthly : null,
    gross_yield_pct: Number.isFinite(grossYield) ? grossYield : null,
    implied_value: impliedValue != null && Number.isFinite(impliedValue) ? impliedValue : null,
    note: "GRM ignores vacancy and operating expenses - screening only; use cap rate / DSCR for underwriting. Annual vs. monthly GRM differ by 12x. Gross rent must be market rent for comparability.",
  };
}
export const grossRentMultiplierExample = { inputs: { price: 300000, gross_rent: 36000, rent_basis: "annual", market_grm: 0 } };

function renderGrossRentMultiplier(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard income-approach screening metric (gross rent / gross income multiplier) per the Appraisal Institute's The Appraisal of Real Estate income approach, by name; USPAP governs the appraiser's value opinion. Distinct from cap-rate-dscr, which uses NOI, not gross rent. Screening only.";
  const price = makeNumber("Purchase price / value ($)", "grm-price", { step: "any", min: "0", value: "300000" }); price.input.value = "300000";
  const rent = makeNumber("Gross rental income ($)", "grm-rent", { step: "any", min: "0", value: "36000" }); rent.input.value = "36000";
  const basis = makeSelect("Rent basis", "grm-basis", [{ value: "annual", label: "Annual", selected: true }, { value: "monthly", label: "Monthly" }]);
  const mgrm = makeNumber("Market/comparable GRM (optional)", "grm-mgrm", { step: "any", min: "0" });
  for (const f of [price, rent, basis, mgrm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { price.input.value = "300000"; rent.input.value = "36000"; basis.select.value = "annual"; mgrm.input.value = ""; update(); });
  const oGrm = makeOutputLine(outputRegion, "GRM (annual / monthly)", "grm-out-grm");
  const oYield = makeOutputLine(outputRegion, "Gross rent yield / implied value", "grm-out-yield");
  const oNote = makeOutputLine(outputRegion, "Note", "grm-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrossRentMultiplier({ price: readNum(price.input), gross_rent: readNum(rent.input), rent_basis: basis.select.value, market_grm: readNum(mgrm.input) });
    if (r.error) { oGrm.textContent = r.error; oYield.textContent = ""; oNote.textContent = ""; return; }
    oGrm.textContent = fmt(r.grm_annual, 2) + " annual, " + fmt(r.grm_monthly, 1) + " monthly";
    oYield.textContent = fmt(r.gross_yield_pct, 1) + "% gross yield" + (r.implied_value != null ? ", implied value $" + fmt(r.implied_value, 0) : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [price.input, rent.input, basis.select, mgrm.input]) f.addEventListener("input", update);
}
REALESTATE_RENDERERS["gross-rent-multiplier"] = renderGrossRentMultiplier;

// --- v20 X.2: PMI cancellation / termination (`pmi-cancellation-date`) ---
// Amortized balance B(m) = P*((1+r)^n - (1+r)^m)/((1+r)^n - 1); solve for 80% / 78% LTV.
// dims: in { value: dimensionless, loan: dimensionless, rate_pct: dimensionless, term_months: dimensionless } out: { month_80: dimensionless, month_78: dimensionless }
export function computePmiCancellationDate({ value = 0, loan = 0, rate_pct = 0, term_months = 0 } = {}) {
  const V = Number(value) || 0;
  const P = Number(loan) || 0;
  const apr = Number(rate_pct) || 0;
  const n = Math.round(Number(term_months) || 0);
  if (!(V > 0 && Number.isFinite(V))) return { error: "Original property value must be positive ($)." };
  if (!(P > 0 && Number.isFinite(P))) return { error: "Original loan amount must be positive ($)." };
  if (apr < 0 || !Number.isFinite(apr)) return { error: "Interest rate must be non-negative (%)." };
  if (!(n >= 1 && n <= 600)) return { error: "Term must be 1-600 months." };
  const r = apr / 100 / 12;
  function balance(m) {
    if (r === 0) return P * (1 - m / n);
    return P * (Math.pow(1 + r, n) - Math.pow(1 + r, m)) / (Math.pow(1 + r, n) - 1);
  }
  const target80 = 0.80 * V, target78 = 0.78 * V;
  let month80 = null, month78 = null;
  for (let m = 0; m <= n; m++) {
    const b = balance(m);
    if (month80 === null && b <= target80) month80 = m;
    if (month78 === null && b <= target78) { month78 = m; break; }
  }
  const midpoint = Math.ceil(n / 2);
  return {
    month_80: month80,
    month_78: month78,
    balance_80: month80 != null ? balance(month80) : null,
    balance_78: month78 != null ? balance(month78) : null,
    midpoint_month: midpoint,
    months_pmi_saved: month78 != null ? midpoint - month78 : null,
    note: "The HPA uses original value and scheduled amortization (not market value or extra payments). Automatic termination at 78%, borrower-requested cancellation at 80%, with the amortization-midpoint backstop. Does not apply to FHA MIP; the borrower must be current.",
  };
}
export const pmiCancellationDateExample = { inputs: { value: 250000, loan: 250000, rate_pct: 6.5, term_months: 360 } };

function renderPmiCancellationDate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the Homeowners Protection Act of 1998 (12 USC 4901-4910) - automatic termination at 78% and borrower-requested cancellation at 80% of original value, with the amortization-midpoint requirement, by name; applies to borrower-paid PMI on conventional loans, not FHA MIP. CFPB consumer guidance free at consumerfinance.gov; uscode.house.gov for the statute. Estimate; the servicer governs.";
  const value = makeNumber("Original property value ($)", "pmi-value", { step: "any", min: "0", value: "250000" }); value.input.value = "250000";
  const loan = makeNumber("Original loan amount ($)", "pmi-loan", { step: "any", min: "0", value: "250000" }); loan.input.value = "250000";
  const rate = makeNumber("Interest rate (% APR)", "pmi-rate", { step: "any", min: "0", value: "6.5" }); rate.input.value = "6.5";
  const term = makeNumber("Term (months)", "pmi-term", { step: "1", min: "1", value: "360" }); term.input.value = "360";
  for (const f of [value, loan, rate, term]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { value.input.value = "250000"; loan.input.value = "250000"; rate.input.value = "6.5"; term.input.value = "360"; update(); });
  const o80 = makeOutputLine(outputRegion, "80% LTV (request cancellation)", "pmi-out-80");
  const o78 = makeOutputLine(outputRegion, "78% LTV (automatic termination)", "pmi-out-78");
  const oNote = makeOutputLine(outputRegion, "Note", "pmi-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePmiCancellationDate({ value: readNum(value.input), loan: readNum(loan.input), rate_pct: readNum(rate.input), term_months: readNum(term.input) });
    if (r.error) { o80.textContent = r.error; o78.textContent = ""; oNote.textContent = ""; return; }
    o80.textContent = r.month_80 != null ? "Month " + r.month_80 + " (balance $" + fmt(r.balance_80, 0) + ")" : "Not reached in term";
    o78.textContent = r.month_78 != null ? "Month " + r.month_78 + " (balance $" + fmt(r.balance_78, 0) + "); midpoint backstop month " + r.midpoint_month : "Not reached in term";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [value.input, loan.input, rate.input, term.input]) f.addEventListener("input", update);
}
REALESTATE_RENDERERS["pmi-cancellation-date"] = renderPmiCancellationDate;

// --- v20 X.3: Seller net proceeds sheet (`seller-net-sheet`) ---
// net = price - payoff - commission - transfer_tax - fees - concessions +/- proration.
// dims: in { price: dimensionless, payoff: dimensionless, commission_pct: dimensionless, transfer_tax_pct: dimensionless, fees: dimensionless, concessions: dimensionless, annual_tax: dimensionless, days_seller_owes: dimensionless, other: dimensionless } out: { net_proceeds: dimensionless, cost_of_sale_pct: dimensionless }
export function computeSellerNetSheet({ price = 0, payoff = 0, commission_pct = 0, transfer_tax_pct = 0, fees = 0, concessions = 0, annual_tax = 0, days_seller_owes = 0, other = 0 } = {}) {
  const P = Number(price) || 0;
  const payoffN = Number(payoff) || 0;
  const commPct = Number(commission_pct) || 0;
  const ttPct = Number(transfer_tax_pct) || 0;
  const feesN = Number(fees) || 0;
  const conc = Number(concessions) || 0;
  const annualTax = Number(annual_tax) || 0;
  const days = Number(days_seller_owes) || 0;
  const otherN = Number(other) || 0;
  if (!(P > 0 && Number.isFinite(P))) return { error: "Sale price must be positive ($)." };
  if (![payoffN, commPct, ttPct, feesN, conc, annualTax, days, otherN].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  const commission = P * commPct / 100;
  const transferTax = P * ttPct / 100;
  const taxProration = annualTax * days / 365; // seller owes this share (debit)
  const net = P - payoffN - commission - transferTax - feesN - conc - taxProration - otherN;
  // Cost of sale excludes the mortgage payoff (that is repayment of the seller's
  // own debt, not a transaction cost): commission + transfer tax + fees +
  // concessions + proration + other, over the price.
  const costOfSale = (P - net - payoffN) / P * 100;
  return {
    gross_price: P,
    commission: Number.isFinite(commission) ? commission : null,
    transfer_tax: Number.isFinite(transferTax) ? transferTax : null,
    tax_proration: Number.isFinite(taxProration) ? taxProration : null,
    net_proceeds: Number.isFinite(net) ? net : null,
    cost_of_sale_pct: Number.isFinite(costOfSale) ? costOfSale : null,
    note: "Transfer-tax base and payer vary by jurisdiction (some states levy per $500 of value) - user supplies the rate. The proration convention (365 vs 360, arrears vs advance) varies. Payoff includes per-diem interest and any prepayment penalty.",
  };
}
export const sellerNetSheetExample = { inputs: { price: 400000, payoff: 250000, commission_pct: 5.5, transfer_tax_pct: 0.5, fees: 2500, concessions: 0, annual_tax: 0, days_seller_owes: 0, other: 0 } };

function renderSellerNetSheet(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the TILA-RESPA Integrated Disclosure / Closing Disclosure (12 CFR 1026.38) and RESPA (12 CFR 1024), by name; the transfer-tax rate is state/local and user-supplied. Distinct from the buyer-side closing-costs tile. Estimate; the settlement statement and closing agent govern. Free at consumerfinance.gov and ecfr.gov.";
  const price = makeNumber("Sale price ($)", "sns-price", { step: "any", min: "0", value: "400000" }); price.input.value = "400000";
  const payoff = makeNumber("Mortgage payoff ($)", "sns-payoff", { step: "any", min: "0", value: "250000" }); payoff.input.value = "250000";
  const comm = makeNumber("Commission (%)", "sns-comm", { step: "any", min: "0", value: "5.5" }); comm.input.value = "5.5";
  const tt = makeNumber("Transfer/excise tax (%)", "sns-tt", { step: "any", min: "0", value: "0.5" }); tt.input.value = "0.5";
  const fees = makeNumber("Title/escrow/attorney fees ($)", "sns-fees", { step: "any", min: "0", value: "2500" }); fees.input.value = "2500";
  const conc = makeNumber("Seller-paid concessions ($)", "sns-conc", { step: "any", min: "0" });
  const annualTax = makeNumber("Annual property tax ($, for proration)", "sns-tax", { step: "any", min: "0" });
  const days = makeNumber("Days seller owes (proration)", "sns-days", { step: "any", min: "0" });
  const other = makeNumber("Other ($)", "sns-other", { step: "any", min: "0" });
  for (const f of [price, payoff, comm, tt, fees, conc, annualTax, days, other]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { price.input.value = "400000"; payoff.input.value = "250000"; comm.input.value = "5.5"; tt.input.value = "0.5"; fees.input.value = "2500"; conc.input.value = ""; annualTax.input.value = ""; days.input.value = ""; other.input.value = ""; update(); });
  const oNet = makeOutputLine(outputRegion, "Estimated net proceeds", "sns-out-net");
  const oCosts = makeOutputLine(outputRegion, "Commission / transfer tax / cost of sale", "sns-out-costs");
  const oNote = makeOutputLine(outputRegion, "Note", "sns-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSellerNetSheet({ price: readNum(price.input), payoff: readNum(payoff.input), commission_pct: readNum(comm.input), transfer_tax_pct: readNum(tt.input), fees: readNum(fees.input), concessions: readNum(conc.input), annual_tax: readNum(annualTax.input), days_seller_owes: readNum(days.input), other: readNum(other.input) });
    if (r.error) { oNet.textContent = r.error; oCosts.textContent = ""; oNote.textContent = ""; return; }
    oNet.textContent = "$" + fmt(r.net_proceeds, 0);
    oCosts.textContent = "$" + fmt(r.commission, 0) + " / $" + fmt(r.transfer_tax, 0) + " / " + fmt(r.cost_of_sale_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [price.input, payoff.input, comm.input, tt.input, fees.input, conc.input, annualTax.input, days.input, other.input]) f.addEventListener("input", update);
}
REALESTATE_RENDERERS["seller-net-sheet"] = renderSellerNetSheet;

// ====================================================================
// X.x spec-v344..v346: investor underwriting batch
// ====================================================================
// The lender- and flipper-side ratios the cap-rate/DSCR and cash-on-cash
// tiles never give: debt yield (the loan-sizing constraint that ignores
// rate and amortization), break-even occupancy, and the 70% fix-and-flip
// maximum offer.

// dims: in { noi: dimensionless, loan: dimensionless, dy_target: dimensionless }
//        out: { debt_yield_pct: dimensionless, max_loan: dimensionless }
// (Debt yield = NOI / loan = ratio of like-dim dollars = dimensionless.)
export function computeDebtYield({ mode = "yield", noi = 0, loan = 0, dy_target = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(noi) || 0;
  if (!(n > 0)) return { error: "Enter a positive net operating income." };
  if (mode === "maxloan") {
    const t = Number(dy_target) || 0;
    if (!(t > 0)) return { error: "Enter a positive target debt yield (%)." };
    const max_loan = n / (t / 100);
    if (!Number.isFinite(max_loan)) return { error: "Maximum loan is not valid." };
    return { mode: "maxloan", max_loan, debt_yield_pct: null };
  }
  const l = Number(loan) || 0;
  if (!(l > 0)) return { error: "Enter a positive loan amount." };
  const dy = n / l * 100;
  if (!Number.isFinite(dy)) return { error: "Debt yield is not valid." };
  let band;
  if (dy < 8) band = "below a typical 8-10% lender floor (loan likely capped)";
  else if (dy < 10) band = "near a typical lender floor (8-10%)";
  else band = "above a typical lender floor (>=10%)";
  return { mode: "yield", debt_yield_pct: dy, band, max_loan: null };
}
export const debtYieldExample = { inputs: { mode: "yield", noi: 120000, loan: 1500000 } };

function renderDebtYield(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Debt yield = NOI / loan amount, a lender's return if it took the property back on day one. It ignores the interest rate, amortization, and cap rate, which is why it became the binding loan-sizing constraint in tight credit; typical minimums run 8-10%. The lender governs the required floor.";
  const mode = makeSelect("Solve for", "dy-mode", [
    { value: "yield", label: "Debt yield (from a loan amount)" },
    { value: "maxloan", label: "Max loan (from a target debt yield)" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const noi = makeNumber("Net operating income ($/yr)", "dy-noi", { step: "any", min: "0" });
  const loan = makeNumber("Loan amount ($)", "dy-loan", { step: "any", min: "0" });
  const tgt = makeNumber("Target debt yield (%)", "dy-tgt", { step: "any", min: "0" });
  for (const f of [noi, loan, tgt]) inputRegion.appendChild(f.wrap);
  const oOut = makeOutputLine(outputRegion, "Result", "dy-out");
  const oBand = makeOutputLine(outputRegion, "Band", "dy-out-band");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isMax = mode.select.value === "maxloan";
    loan.wrap.style.display = isMax ? "none" : "";
    tgt.wrap.style.display = isMax ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeDebtYield({ mode: mode.select.value, noi: readNum(noi.input), loan: readNum(loan.input), dy_target: readNum(tgt.input) });
    if (r.error) { oOut.textContent = r.error; oBand.textContent = "-"; return; }
    if (r.mode === "maxloan") { oOut.textContent = "Max loan " + fmt(r.max_loan, 0) + " $ at the target debt yield"; oBand.textContent = "-"; return; }
    oOut.textContent = fmt(r.debt_yield_pct, 2) + "% debt yield";
    oBand.textContent = r.band;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "yield"; syncFields(); noi.input.value = "120000"; loan.input.value = "1500000"; tgt.input.value = ""; update(); });
  mode.select.addEventListener("input", () => { syncFields(); update(); });
  for (const el of [noi.input, loan.input, tgt.input]) el.addEventListener("input", update);
  syncFields();
}
REALESTATE_RENDERERS["debt-yield"] = renderDebtYield;

// dims: in { opex: dimensionless, debt_svc: dimensionless, pgi: dimensionless, target_occ: dimensionless }
//        out: { beo_pct: dimensionless, cushion_pts: dimensionless }
// (Break-even occupancy = (opex + debt service) / PGI = dimensionless ratio.)
export function computeBreakEvenOccupancy({ opex = 0, debt_svc = 0, pgi = 0, target_occ = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const o = Number(opex) || 0;
  const d = Number(debt_svc) || 0;
  const p = Number(pgi) || 0;
  if (!(o >= 0)) return { error: "Operating expenses must be zero or positive." };
  if (!(d >= 0)) return { error: "Debt service must be zero or positive." };
  if (!(p > 0)) return { error: "Enter a positive potential gross income." };
  const beo = (o + d) / p * 100;
  if (!Number.isFinite(beo)) return { error: "Break-even occupancy is not valid." };
  const t = Number(target_occ) || 0;
  const cushion = t > 0 ? t - beo : null;
  return { beo_pct: beo, cushion_pts: cushion, target_occ: t };
}
export const breakEvenOccupancyExample = { inputs: { opex: 60000, debt_svc: 90000, pgi: 200000, target_occ: 92 } };

function renderBreakEvenOccupancy(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Break-even occupancy = (operating expenses + annual debt service) / potential gross income, the occupancy at which the property exactly covers its costs. The cushion to the market/stabilized occupancy measures how much vacancy a deal can absorb before it goes cash-flow negative. The lender and the market govern the acceptable break-even.";
  const opex = makeNumber("Operating expenses ($/yr)", "beo-opex", { step: "any", min: "0" });
  const debt = makeNumber("Annual debt service ($/yr, P+I)", "beo-debt", { step: "any", min: "0" });
  const pgi = makeNumber("Potential gross income ($/yr, fully leased)", "beo-pgi", { step: "any", min: "0" });
  const occ = makeNumber("Market/stabilized occupancy (%, optional)", "beo-occ", { step: "any", min: "0", max: "100" });
  for (const f of [opex, debt, pgi, occ]) inputRegion.appendChild(f.wrap);
  const oBEO = makeOutputLine(outputRegion, "Break-even occupancy", "beo-out");
  const oCush = makeOutputLine(outputRegion, "Cushion to market occupancy", "beo-out-cush");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBreakEvenOccupancy({ opex: readNum(opex.input), debt_svc: readNum(debt.input), pgi: readNum(pgi.input), target_occ: readNum(occ.input) });
    if (r.error) { oBEO.textContent = r.error; oCush.textContent = "-"; return; }
    oBEO.textContent = fmt(r.beo_pct, 1) + "%";
    oCush.textContent = r.cushion_pts == null ? "(enter a market occupancy for the cushion)"
      : fmt(r.cushion_pts, 1) + " points" + (r.cushion_pts < 0 ? " (break-even is ABOVE market -- the deal loses money at market occupancy)" : "");
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { opex.input.value = "60000"; debt.input.value = "90000"; pgi.input.value = "200000"; occ.input.value = "92"; update(); });
  for (const el of [opex.input, debt.input, pgi.input, occ.input]) el.addEventListener("input", update);
}
REALESTATE_RENDERERS["break-even-occupancy"] = renderBreakEvenOccupancy;

// dims: in { arv: dimensionless, repairs: dimensionless, rule_pct: dimensionless, fee: dimensionless }
//        out: { mao: dimensionless, spread: dimensionless }
// (Maximum allowable offer = ARV x rule% - repairs - fee, all dollars.)
export function computeMaxOffer70Rule({ arv = 0, repairs = 0, rule_pct = 70, fee = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(arv) || 0;
  const r = Number(repairs) || 0;
  const pct = Number(rule_pct) || 0;
  const f = Number(fee) || 0;
  if (!(a > 0)) return { error: "Enter a positive after-repair value (ARV)." };
  if (!(r >= 0)) return { error: "Repairs must be zero or positive." };
  if (!(pct > 0 && pct <= 100)) return { error: "Rule percentage must be between 0 and 100." };
  if (!(f >= 0)) return { error: "Wholesale fee must be zero or positive." };
  const mao = a * (pct / 100) - r - f;
  if (!Number.isFinite(mao)) return { error: "Maximum offer is not valid." };
  const spread = a - mao - r;
  return {
    mao, spread, no_deal: mao <= 0,
    note: "The 70% rule: max allowable offer = ARV x rule% - repairs (- any wholesale fee). The 30% held back (at 70%) covers holding, financing, selling costs, and profit. A negative MAO means the numbers do not support a deal at this rule percentage.",
  };
}
export const maxOffer70RuleExample = { inputs: { arv: 300000, repairs: 40000, rule_pct: 70, fee: 0 } };

function renderMaxOffer70Rule(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fix-and-flip 70% rule: maximum allowable offer = ARV x 70% - repair costs (minus any wholesale assignment fee). The 30% margin covers holding, financing, closing, and profit. A rule of thumb, not an appraisal; the ARV must come from real comparable sales and the repair estimate from a real scope. The investor's actual cost and profit targets govern.";
  const arv = makeNumber("After-repair value ARV ($, from comps)", "mao-arv", { step: "any", min: "0" });
  const rep = makeNumber("Estimated repairs ($)", "mao-rep", { step: "any", min: "0" });
  const pct = makeNumber("Rule percentage (%, default 70)", "mao-pct", { step: "any", min: "0", max: "100" });
  const fee = makeNumber("Wholesale assignment fee ($, optional)", "mao-fee", { step: "any", min: "0" });
  for (const f of [arv, rep, pct, fee]) inputRegion.appendChild(f.wrap);
  pct.input.value = "70";
  const oMAO = makeOutputLine(outputRegion, "Maximum allowable offer", "mao-out");
  const oSpread = makeOutputLine(outputRegion, "Gross spread (costs + profit)", "mao-out-spread");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMaxOffer70Rule({ arv: readNum(arv.input), repairs: readNum(rep.input), rule_pct: pct.input.value === "" ? 70 : readNum(pct.input), fee: readNum(fee.input) });
    if (r.error) { oMAO.textContent = r.error; oSpread.textContent = "-"; return; }
    oMAO.textContent = r.no_deal ? "no deal (offer would be " + fmt(r.mao, 0) + " $ -- at or below zero)" : fmt(r.mao, 0) + " $";
    oSpread.textContent = fmt(r.spread, 0) + " $";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { arv.input.value = "300000"; rep.input.value = "40000"; pct.input.value = "70"; fee.input.value = ""; update(); });
  for (const el of [arv.input, rep.input, pct.input, fee.input]) el.addEventListener("input", update);
}
REALESTATE_RENDERERS["max-offer-70-rule"] = renderMaxOffer70Rule;

// ===================== spec-v402..v404: real-estate-investing trio (Group X) =====================

// dims: in { arv_usd: dimensionless, purchase_usd: dimensionless, rehab_usd: dimensionless, holding_usd: dimensionless, financing_usd: dimensionless, selling_pct: dimensionless, cash_invested_usd: dimensionless, hold_months: dimensionless } out: { selling_usd: dimensionless, all_in_usd: dimensionless, profit_usd: dimensionless, margin: dimensionless, roi: dimensionless, annual_roi: dimensionless }
export function computeFixFlipProfit({ arv_usd = 0, purchase_usd = 0, rehab_usd = 0, holding_usd = 0, financing_usd = 0, selling_pct = 6, cash_invested_usd = 0, hold_months = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const arv = Number(arv_usd) || 0;
  const cash = Number(cash_invested_usd) || 0;
  const months = Number(hold_months) || 0;
  if (!(arv > 0)) return { error: "After-repair value must be positive (USD)." };
  if (!(cash > 0)) return { error: "Cash invested must be positive (USD)." };
  if (!(months > 0)) return { error: "Hold period must be positive (months)." };
  const selling_usd = arv * (Number(selling_pct) || 0) / 100;
  const all_in_usd = (Number(purchase_usd) || 0) + (Number(rehab_usd) || 0) + (Number(holding_usd) || 0) + (Number(financing_usd) || 0) + selling_usd;
  const profit_usd = arv - all_in_usd;
  const margin = profit_usd / arv;
  const roi = profit_usd / cash;
  const annual_roi = roi * 12 / months;
  return {
    selling_usd, all_in_usd, profit_usd, margin, roi, annual_roi,
    note: "Fix-and-flip profit: all-in cost = purchase + rehab + holding + financing + selling costs (selling = ARV x selling%), profit = ARV - all-in, and the returns are profit / ARV (margin), profit / cash invested (cash ROI), and that annualized over the hold. Flippers commonly target a 10-15%+ margin and a cash return that beats the risk; thin deals leave no room for an ARV miss or a rehab overrun. The ARV must come from real comps and the rehab from a real scope. A screening aid; the actual deal governs.",
  };
}
export const fixFlipProfitExample = { inputs: { arv_usd: 300000, purchase_usd: 180000, rehab_usd: 40000, holding_usd: 8000, financing_usd: 12000, selling_pct: 6, cash_invested_usd: 114000, hold_months: 6 } };
function renderFixFlipProfit(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fix-and-flip profit and return (real-estate investing practice): all-in = purchase + rehab + holding + financing + selling (selling = ARV x selling%), profit = ARV - all-in, margin = profit/ARV, cash ROI = profit/cash, annualized = ROI x 12/months. The ARV must come from real comparable sales and the rehab from a real scope. A screening aid; the actual deal governs.";
  const arv = makeNumber("After-repair value ARV ($)", "ffp-arv", { step: "any", min: "0" }); arv.input.value = "300000";
  const buy = makeNumber("Purchase price ($)", "ffp-buy", { step: "any", min: "0" }); buy.input.value = "180000";
  const rehab = makeNumber("Rehab budget ($)", "ffp-rehab", { step: "any", min: "0" }); rehab.input.value = "40000";
  const hold = makeNumber("Holding costs ($)", "ffp-hold", { step: "any", min: "0" }); hold.input.value = "8000";
  const fin = makeNumber("Financing (points + interest, $)", "ffp-fin", { step: "any", min: "0" }); fin.input.value = "12000";
  const sell = makeNumber("Selling cost (% of ARV)", "ffp-sell", { step: "any", min: "0" }); sell.input.value = "6";
  const cash = makeNumber("Cash invested ($)", "ffp-cash", { step: "any", min: "0" }); cash.input.value = "114000";
  const months = makeNumber("Hold period (months)", "ffp-mo", { step: "any", min: "0" }); months.input.value = "6";
  for (const f of [arv, buy, rehab, hold, fin, sell, cash, months]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { arv.input.value = "300000"; buy.input.value = "180000"; rehab.input.value = "40000"; hold.input.value = "8000"; fin.input.value = "12000"; sell.input.value = "6"; cash.input.value = "114000"; months.input.value = "6"; update(); });
  const oProfit = makeOutputLine(outputRegion, "Net profit (margin)", "ffp-out-profit");
  const oAllIn = makeOutputLine(outputRegion, "All-in cost", "ffp-out-allin");
  const oRoi = makeOutputLine(outputRegion, "Cash ROI (annualized)", "ffp-out-roi");
  const oNote = makeOutputLine(outputRegion, "Note", "ffp-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeFixFlipProfit({ arv_usd: readNum(arv.input), purchase_usd: readNum(buy.input), rehab_usd: readNum(rehab.input), holding_usd: readNum(hold.input), financing_usd: readNum(fin.input), selling_pct: readNum(sell.input), cash_invested_usd: readNum(cash.input), hold_months: readNum(months.input) });
    if (r.error) { oProfit.textContent = r.error; oAllIn.textContent = "-"; oRoi.textContent = "-"; oNote.textContent = ""; return; }
    oProfit.textContent = "$" + fmt(r.profit_usd, 0) + " (" + fmt(r.margin * 100, 1) + "% of ARV)";
    oAllIn.textContent = "$" + fmt(r.all_in_usd, 0) + " (selling $" + fmt(r.selling_usd, 0) + ")";
    oRoi.textContent = fmt(r.roi * 100, 1) + "% cash ROI, " + fmt(r.annual_roi * 100, 1) + "% annualized";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [arv, buy, rehab, hold, fin, sell, cash, months]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["fix-flip-profit"] = renderFixFlipProfit;

// dims: in { arv_usd: dimensionless, total_invested_usd: dimensionless, refi_ltv_pct: dimensionless, existing_payoff_usd: dimensionless, annual_cash_flow_usd: dimensionless } out: { new_loan_usd: dimensionless, cash_returned_usd: dimensionless, capital_left_usd: dimensionless, coc: dimensionless }
export function computeBrrrrRefi({ arv_usd = 0, total_invested_usd = 0, refi_ltv_pct = 75, existing_payoff_usd = 0, annual_cash_flow_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const arv = Number(arv_usd) || 0;
  const invested = Number(total_invested_usd) || 0;
  const ltv = Number(refi_ltv_pct) || 0;
  const payoff = Number(existing_payoff_usd) || 0;
  const cashflow = Number(annual_cash_flow_usd) || 0;
  if (!(arv > 0)) return { error: "After-repair value must be positive (USD)." };
  if (!(invested > 0)) return { error: "Total invested must be positive (USD)." };
  if (!(ltv > 0 && ltv <= 100)) return { error: "Refinance LTV must be between 0 and 100%." };
  if (payoff < 0) return { error: "Existing payoff must be non-negative (USD)." };
  const new_loan_usd = arv * ltv / 100;
  const cash_returned_usd = new_loan_usd - payoff;
  const capital_left_usd = invested - cash_returned_usd;
  const all_recovered = capital_left_usd <= 0;
  const coc = all_recovered ? null : cashflow / capital_left_usd;
  return {
    new_loan_usd, cash_returned_usd, capital_left_usd, coc, all_recovered,
    note: "BRRRR cash-out refinance: the new loan = ARV x refi LTV (commonly 70-75%), cash returned = new loan - any existing payoff, and the capital left in the deal = total invested - cash returned. When the cash-out covers everything the investor has recovered all capital (an infinite cash-on-cash return) and repeats with the same money; otherwise the post-refi cash-on-cash = annual cash flow / capital left. The appraised ARV and the lender's seasoning and LTV rules govern whether the numbers hold. A screening aid; the actual refinance terms govern.",
  };
}
export const brrrrRefiExample = { inputs: { arv_usd: 200000, total_invested_usd: 140000, refi_ltv_pct: 75, existing_payoff_usd: 0, annual_cash_flow_usd: 0 } };
function renderBrrrrRefi(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: BRRRR cash-out refinance (real-estate investing practice): new loan = ARV x refi LTV, cash returned = new loan - existing payoff, capital left = total invested - cash returned, post-refi cash-on-cash = annual cash flow / capital left (infinite when all capital is recovered). The appraised ARV and the lender's LTV/seasoning rules govern. A screening aid; the actual refinance terms govern.";
  const arv = makeNumber("Appraised ARV ($)", "brr-arv", { step: "any", min: "0" }); arv.input.value = "200000";
  const inv = makeNumber("Total invested ($)", "brr-inv", { step: "any", min: "0" }); inv.input.value = "140000";
  const ltv = makeNumber("Refi LTV (%)", "brr-ltv", { step: "any", min: "0", max: "100" }); ltv.input.value = "75";
  const payoff = makeNumber("Existing loan payoff ($, optional)", "brr-pay", { step: "any", min: "0" }); payoff.input.value = "0";
  const cf = makeNumber("Annual cash flow after new payment ($, optional)", "brr-cf", { step: "any" }); cf.input.value = "0";
  for (const f of [arv, inv, ltv, payoff, cf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { arv.input.value = "200000"; inv.input.value = "140000"; ltv.input.value = "75"; payoff.input.value = "0"; cf.input.value = "0"; update(); });
  const oLoan = makeOutputLine(outputRegion, "New loan / cash returned", "brr-out-loan");
  const oLeft = makeOutputLine(outputRegion, "Capital left in the deal", "brr-out-left");
  const oCoc = makeOutputLine(outputRegion, "Post-refi cash-on-cash", "brr-out-coc");
  const oNote = makeOutputLine(outputRegion, "Note", "brr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBrrrrRefi({ arv_usd: readNum(arv.input), total_invested_usd: readNum(inv.input), refi_ltv_pct: readNum(ltv.input), existing_payoff_usd: readNum(payoff.input), annual_cash_flow_usd: readNum(cf.input) });
    if (r.error) { oLoan.textContent = r.error; oLeft.textContent = "-"; oCoc.textContent = "-"; oNote.textContent = ""; return; }
    oLoan.textContent = "$" + fmt(r.new_loan_usd, 0) + " / $" + fmt(r.cash_returned_usd, 0) + " returned";
    oLeft.textContent = r.all_recovered ? "all capital recovered ($" + fmt(-r.capital_left_usd, 0) + " cash-out surplus)" : "$" + fmt(r.capital_left_usd, 0);
    oCoc.textContent = r.all_recovered ? "infinite (no capital left in)" : (r.coc === 0 ? "(enter annual cash flow)" : fmt(r.coc * 100, 1) + "%");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [arv, inv, ltv, payoff, cf]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["brrrr-refi"] = renderBrrrrRefi;

// dims: in { cash_invested_usd: dimensionless, annual_cash_flow_usd: dimensionless, principal_paydown_usd: dimensionless, appreciation_usd: dimensionless, tax_savings_usd: dimensionless } out: { total_usd: dimensionless, total_pct: dimensionless }
export function computeRentalTotalReturn({ cash_invested_usd = 0, annual_cash_flow_usd = 0, principal_paydown_usd = 0, appreciation_usd = 0, tax_savings_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cash = Number(cash_invested_usd) || 0;
  const cf = Number(annual_cash_flow_usd) || 0;
  const paydown = Number(principal_paydown_usd) || 0;
  const appr = Number(appreciation_usd) || 0;
  const tax = Number(tax_savings_usd) || 0;
  if (!(cash > 0)) return { error: "Cash invested must be positive (USD)." };
  const total_usd = cf + paydown + appr + tax;
  return {
    total_usd, total_pct: total_usd / cash,
    cf_pct: cf / cash, paydown_pct: paydown / cash, appr_pct: appr / cash, tax_pct: tax / cash,
    note: "Rental total return, all four components as a percent of cash invested: cash flow (the money in hand), principal paydown (the tenant retiring your loan), appreciation (the value gain), and the depreciation tax shield. The cash-on-cash number alone (cash flow / cash) understates the real return, often by half or more, because it ignores equity buildup and the tax benefit. Appreciation is a projection, not a guarantee; the other three are realized. A screening aid; the actual results govern.",
  };
}
export const rentalTotalReturnExample = { inputs: { cash_invested_usd: 50000, annual_cash_flow_usd: 3000, principal_paydown_usd: 2500, appreciation_usd: 7500, tax_savings_usd: 1500 } };
function renderRentalTotalReturn(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Rental total return (real-estate investing practice): total = cash flow + principal paydown + appreciation + depreciation tax savings, each as a percent of cash invested. Cash-on-cash alone ignores equity buildup and the tax shield, understating the return. Appreciation is a projection. A screening aid; the actual results govern.";
  const cash = makeNumber("Cash invested ($)", "rtr-cash", { step: "any", min: "0" }); cash.input.value = "50000";
  const cf = makeNumber("Annual cash flow ($)", "rtr-cf", { step: "any" }); cf.input.value = "3000";
  const pay = makeNumber("First-year principal paydown ($)", "rtr-pay", { step: "any", min: "0" }); pay.input.value = "2500";
  const appr = makeNumber("First-year appreciation ($)", "rtr-appr", { step: "any" }); appr.input.value = "7500";
  const tax = makeNumber("Depreciation tax savings ($)", "rtr-tax", { step: "any" }); tax.input.value = "1500";
  for (const f of [cash, cf, pay, appr, tax]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cash.input.value = "50000"; cf.input.value = "3000"; pay.input.value = "2500"; appr.input.value = "7500"; tax.input.value = "1500"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total first-year return", "rtr-out-total");
  const oBreak = makeOutputLine(outputRegion, "Components (of cash invested)", "rtr-out-break");
  const oNote = makeOutputLine(outputRegion, "Note", "rtr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeRentalTotalReturn({ cash_invested_usd: readNum(cash.input), annual_cash_flow_usd: readNum(cf.input), principal_paydown_usd: readNum(pay.input), appreciation_usd: readNum(appr.input), tax_savings_usd: readNum(tax.input) });
    if (r.error) { oTotal.textContent = r.error; oBreak.textContent = "-"; oNote.textContent = ""; return; }
    oTotal.textContent = "$" + fmt(r.total_usd, 0) + " (" + fmt(r.total_pct * 100, 1) + "% of cash)";
    oBreak.textContent = "cash " + fmt(r.cf_pct * 100, 1) + "% + paydown " + fmt(r.paydown_pct * 100, 1) + "% + appreciation " + fmt(r.appr_pct * 100, 1) + "% + tax " + fmt(r.tax_pct * 100, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cash, cf, pay, appr, tax]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["rental-total-return"] = renderRentalTotalReturn;

// ===================== spec-v526: net effective rent (lease concessions) =====================
// dims: in { face_rent: dimensionless, term_periods: dimensionless, free_periods: dimensionless, one_time_credit: dimensionless } out: { paid: dimensionless, ner: dimensionless, total_saving: dimensionless, discount_pct: dimensionless }
export function computeNetEffectiveRent({ face_rent = 0, term_periods = 0, free_periods = 0, one_time_credit = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const face = Number(face_rent) || 0;
  const term = Number(term_periods) || 0;
  const free = Number(free_periods) || 0;
  const credit = Number(one_time_credit) || 0;
  if (!(face > 0)) return { error: "Face rent must be positive." };
  if (!(term > 0)) return { error: "Lease term must be positive." };
  if (!(free >= 0 && free < term)) return { error: "Free-rent periods must be 0 or more and below the term." };
  if (credit < 0) return { error: "One-time credit cannot be negative." };
  const paid = face * (term - free);
  const ner = (paid - credit) / term;
  const total_saving = face * term - (paid - credit);
  const discount_pct = (1 - ner / face) * 100;
  if (![paid, ner, total_saving, discount_pct].every(Number.isFinite)) return { error: "Net-effective-rent math is not a finite value." };
  return {
    paid, ner, total_saving, discount_pct,
    note: "Net effective rent spreads lease concessions across the full term to the rate a tenant ACTUALLY pays. Landlords quote the high FACE rent and bury free rent and TI credits, so the term-sheet number is not the number to compare between competing offers. paid = face x (term - free_periods), NER = (paid - one_time_credit) / term, and discount = (1 - NER/face) x 100. A five-year lease at a high face with several months free can carry an effective rate 10 to 20% below face. This is a straight-line (undiscounted) average, the common broker convention -- not a present-value effective rent; escalations and operating-expense pass-throughs change the picture. A comparison aid, not lease terms; the executed lease governs.",
  };
}
export const netEffectiveRentExample = { inputs: { face_rent: 40, term_periods: 120, free_periods: 10, one_time_credit: 0 } };
function renderNetEffectiveRent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: net effective rent (straight-line concession spread; Appraisal Institute income approach / commercial-lease concession practice): paid = face x (term - free); NER = (paid - one-time credit) / term; discount = (1 - NER/face) x 100. A straight-line average, not a present-value effective rent. A comparison aid; the executed lease governs.";
  const face = makeNumber("Face (base) rent ($/period, e.g. $/SF/yr)", "ner-face", { step: "any", min: "0" }); face.input.value = "40";
  const term = makeNumber("Lease term (periods)", "ner-term", { step: "any", min: "0" }); term.input.value = "120";
  const free = makeNumber("Free-rent periods", "ner-free", { step: "any", min: "0" }); free.input.value = "10";
  const credit = makeNumber("One-time TI / concession credit ($, 0 = none)", "ner-credit", { step: "any", min: "0" }); credit.input.value = "0";
  for (const f of [face, term, free, credit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { face.input.value = "40"; term.input.value = "120"; free.input.value = "10"; credit.input.value = "0"; update(); });
  const oNer = makeOutputLine(outputRegion, "Net effective rent", "ner-out-ner");
  const oSave = makeOutputLine(outputRegion, "Total concession value", "ner-out-save");
  const oDisc = makeOutputLine(outputRegion, "Discount off face", "ner-out-disc");
  const oNote = makeOutputLine(outputRegion, "Note", "ner-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeNetEffectiveRent({ face_rent: readNum(face.input), term_periods: readNum(term.input), free_periods: readNum(free.input), one_time_credit: readNum(credit.input) });
    if (r.error) { oNer.textContent = r.error; oSave.textContent = "-"; oDisc.textContent = "-"; oNote.textContent = ""; return; }
    oNer.textContent = "$" + fmt(r.ner, 2) + " per period";
    oSave.textContent = "$" + fmt(r.total_saving, 2);
    oDisc.textContent = fmt(r.discount_pct, 1) + "% below face";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [face, term, free, credit]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["net-effective-rent"] = renderNetEffectiveRent;

// ===================== spec-v646: required face rent (inverse of net effective rent) =====================
// dims: in { target_ner: dimensionless, term_periods: dimensionless, free_periods: dimensionless, one_time_credit: dimensionless } out: { face_rent: dimensionless, paid: dimensionless, discount_pct: dimensionless }
export function computeRequiredFaceRent({ target_ner = 0, term_periods = 0, free_periods = 0, one_time_credit = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ner = Number(target_ner) || 0;
  const term = Number(term_periods) || 0;
  const free = Number(free_periods) || 0;
  const credit = Number(one_time_credit) || 0;
  if (!(ner > 0)) return { error: "Target net effective rent must be positive." };
  if (!(term > 0)) return { error: "Lease term must be positive." };
  if (!(free >= 0 && free < term)) return { error: "Free-rent periods must be 0 or more and below the term." };
  if (credit < 0) return { error: "One-time credit cannot be negative." };
  const face_rent = (ner * term + credit) / (term - free);
  const paid = face_rent * (term - free);
  const discount_pct = (1 - ner / face_rent) * 100;
  if (![face_rent, paid, discount_pct].every(Number.isFinite)) return { error: "Required-face-rent math is not a finite value." };
  return {
    face_rent, paid, discount_pct,
    note: "The inverse of net effective rent: the FACE (quoted) rent a landlord must ask to still net a target effective rate after giving free rent and a one-time TI/concession credit. face = (target_NER x term + one_time_credit) / (term - free_periods); the quoted rate then sits discount = (1 - NER/face) x 100 above the effective rate. Giving more free months or a larger credit forces a higher face to hold the same net - the mechanic behind why concession-heavy markets quote inflated face rents. A straight-line (undiscounted) spread, the common broker convention, not a present-value rent; escalations and expense pass-throughs change the picture. A pricing aid, not lease terms; the executed lease governs.",
  };
}
export const requiredFaceRentExample = { inputs: { target_ner: 30, term_periods: 120, free_periods: 20, one_time_credit: 0 } };
function renderRequiredFaceRent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: required face rent (inverse of the straight-line net-effective-rent spread; Appraisal Institute income approach / commercial-lease concession practice): face = (target_NER x term + one-time credit) / (term - free); discount = (1 - NER/face) x 100. A straight-line average, not a present-value effective rent. A pricing aid; the executed lease governs.";
  const ner = makeNumber("Target net effective rent ($/period, e.g. $/SF/yr)", "rfr-ner", { step: "any", min: "0" }); ner.input.value = "30";
  const term = makeNumber("Lease term (periods)", "rfr-term", { step: "any", min: "0" }); term.input.value = "120";
  const free = makeNumber("Free-rent periods", "rfr-free", { step: "any", min: "0" }); free.input.value = "20";
  const credit = makeNumber("One-time TI / concession credit ($, 0 = none)", "rfr-credit", { step: "any", min: "0" }); credit.input.value = "0";
  for (const f of [ner, term, free, credit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ner.input.value = "30"; term.input.value = "120"; free.input.value = "20"; credit.input.value = "0"; update(); });
  const oFace = makeOutputLine(outputRegion, "Required face rent", "rfr-out-face");
  const oPaid = makeOutputLine(outputRegion, "Total paid over term", "rfr-out-paid");
  const oDisc = makeOutputLine(outputRegion, "Face sits above effective by", "rfr-out-disc");
  const oNote = makeOutputLine(outputRegion, "Note", "rfr-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeRequiredFaceRent({ target_ner: readNum(ner.input), term_periods: readNum(term.input), free_periods: readNum(free.input), one_time_credit: readNum(credit.input) });
    if (r.error) { oFace.textContent = r.error; oPaid.textContent = "-"; oDisc.textContent = "-"; oNote.textContent = ""; return; }
    oFace.textContent = "$" + fmt(r.face_rent, 2) + " per period";
    oPaid.textContent = "$" + fmt(r.paid, 2);
    oDisc.textContent = fmt(r.discount_pct, 1) + "% above effective";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ner, term, free, credit]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["required-face-rent"] = renderRequiredFaceRent;

// ===================== spec-v527: rentable/usable load factor (BOMA) =====================
// dims: in { usable_sf: L^2, common_area_factor: dimensionless, base_rent: dimensionless } out: { rentable_sf: L^2, load_factor: dimensionless, annual_rent: dimensionless, cost_per_usable: dimensionless }
export function computeCommercialLoadFactor({ usable_sf = 0, common_area_factor = 0, base_rent = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const usable = Number(usable_sf) || 0;
  const caf = Number(common_area_factor) || 0;
  const rent = Number(base_rent) || 0;
  if (!(usable > 0)) return { error: "Usable area must be positive (SF)." };
  if (caf < 0) return { error: "Common-area factor cannot be negative." };
  if (rent < 0) return { error: "Base rent cannot be negative." };
  const rentable_sf = usable * (1 + caf);
  const load_factor = rentable_sf / usable;
  const annual_rent = rent * rentable_sf;
  const cost_per_usable = rent * load_factor;
  if (![rentable_sf, load_factor, annual_rent, cost_per_usable].every(Number.isFinite)) return { error: "Load-factor math is not a finite value." };
  return {
    rentable_sf, load_factor, annual_rent, cost_per_usable,
    note: "BOMA rentable/usable load factor (ANSI/BOMA Z65.1). Office rent is quoted per RENTABLE square foot, but a tenant only occupies the USABLE square feet -- the rentable figure adds the tenant's pro-rata share of lobbies, corridors, and restrooms that cannot hold a desk. rentable = usable x (1 + common_area_factor), the load factor = rentable / usable, and the real cost of the space you use is base_rent x load_factor. A 15% factor means the space actually used costs 15% more than the quoted rate, the hidden common-area cost the quoted rate conceals. Add-on and loss-factor conventions vary, so the measured BOMA areas and the lease govern. A cost-comparison aid, not a BOMA measurement report.",
  };
}
export const commercialLoadFactorExample = { inputs: { usable_sf: 10000, common_area_factor: 0.15, base_rent: 30 } };
function renderCommercialLoadFactor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: BOMA rentable/usable load factor (ANSI/BOMA Z65.1 Office Standard): rentable = usable x (1 + common_area_factor); load_factor = rentable / usable; annual_rent = base_rent x rentable; cost_per_usable = base_rent x load_factor. Rent is per rentable SF, which includes common areas the tenant cannot occupy. A cost-comparison aid; the measured BOMA areas and the lease govern.";
  const usable = makeNumber("Usable (occupiable) area (SF)", "clf-usable", { step: "any", min: "0" }); usable.input.value = "10000";
  const caf = makeNumber("Common-area (add-on) factor (decimal, 0.15 = 15%)", "clf-caf", { step: "any", min: "0" }); caf.input.value = "0.15";
  const rent = makeNumber("Quoted base rent ($/rentable SF/yr)", "clf-rent", { step: "any", min: "0" }); rent.input.value = "30";
  for (const f of [usable, caf, rent]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { usable.input.value = "10000"; caf.input.value = "0.15"; rent.input.value = "30"; update(); });
  const oRent = makeOutputLine(outputRegion, "Rentable area (load factor)", "clf-out-rent");
  const oAnnual = makeOutputLine(outputRegion, "Annual rent", "clf-out-annual");
  const oCost = makeOutputLine(outputRegion, "Effective cost per USABLE SF", "clf-out-cost");
  const oNote = makeOutputLine(outputRegion, "Note", "clf-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCommercialLoadFactor({ usable_sf: readNum(usable.input), common_area_factor: readNum(caf.input), base_rent: readNum(rent.input) });
    if (r.error) { oRent.textContent = r.error; oAnnual.textContent = "-"; oCost.textContent = "-"; oNote.textContent = ""; return; }
    oRent.textContent = fmt(r.rentable_sf, 0) + " SF (load factor " + fmt(r.load_factor, 3) + ")";
    oAnnual.textContent = "$" + fmt(r.annual_rent, 0) + "/yr";
    oCost.textContent = "$" + fmt(r.cost_per_usable, 2) + "/usable SF";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [usable, caf, rent]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["commercial-load-factor"] = renderCommercialLoadFactor;

// ===================== spec-v528: blended mortgage rate (two loans) =====================
// dims: in { balance_1: dimensionless, rate_1: dimensionless, balance_2: dimensionless, rate_2: dimensionless } out: { combined: dimensionless, blended_rate: dimensionless, monthly_interest: dimensionless }
export function computeBlendedMortgageRate({ balance_1 = 0, rate_1 = 0, balance_2 = 0, rate_2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const b1 = Number(balance_1) || 0;
  const r1 = Number(rate_1) || 0;
  const b2 = Number(balance_2) || 0;
  const r2 = Number(rate_2) || 0;
  if (b1 < 0 || b2 < 0) return { error: "Loan balances cannot be negative." };
  if (r1 < 0 || r2 < 0) return { error: "Interest rates cannot be negative." };
  const combined = b1 + b2;
  if (!(combined > 0)) return { error: "The combined balance must be positive." };
  const weighted = b1 * r1 + b2 * r2;
  const blended_rate = weighted / combined;
  const monthly_interest = weighted / 1200;
  if (![combined, blended_rate, monthly_interest].every(Number.isFinite)) return { error: "Blended-rate math is not a finite value." };
  return {
    combined, blended_rate, monthly_interest,
    note: "Blended mortgage rate = the balance-weighted average of two loans: blended = (bal1 x rate1 + bal2 x rate2) / (bal1 + bal2). It answers one question well -- is the weighted cost of debt of keeping a low-rate first and ADDING a second (a HELOC or seller carry) lower than the rate on a cash-out REFINANCE of everything? Keep-and-add wins only if the single refinance rate is above the blended rate. The catch: this is a snapshot that ignores the loans' differing terms and amortization, and a variable-rate second (a HELOC that resets) makes the blend DRIFT over time. The weighting follows the balances, so a small second hardly dilutes a big low-rate first. A comparison aid, not a payment plan; the actual loan documents govern.",
  };
}
export const blendedMortgageRateExample = { inputs: { balance_1: 300000, rate_1: 4, balance_2: 100000, rate_2: 8 } };
function renderBlendedMortgageRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: blended mortgage rate (weighted-average cost of debt): blended = (bal1 x rate1 + bal2 x rate2) / (bal1 + bal2); monthly interest = (bal1 x rate1 + bal2 x rate2) / 1200. A balance-weighted snapshot that ignores differing terms and amortization; a variable second drifts. A comparison aid; the loan documents govern.";
  const b1 = makeNumber("First loan balance ($)", "bmr-b1", { step: "any", min: "0" }); b1.input.value = "300000";
  const r1 = makeNumber("First loan rate (%)", "bmr-r1", { step: "any", min: "0" }); r1.input.value = "4";
  const b2 = makeNumber("Second loan balance ($, HELOC / seller 2nd)", "bmr-b2", { step: "any", min: "0" }); b2.input.value = "100000";
  const r2 = makeNumber("Second loan rate (%)", "bmr-r2", { step: "any", min: "0" }); r2.input.value = "8";
  for (const f of [b1, r1, b2, r2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { b1.input.value = "300000"; r1.input.value = "4"; b2.input.value = "100000"; r2.input.value = "8"; update(); });
  const oBlend = makeOutputLine(outputRegion, "Blended rate", "bmr-out-blend");
  const oComb = makeOutputLine(outputRegion, "Combined balance", "bmr-out-comb");
  const oInt = makeOutputLine(outputRegion, "Total monthly interest", "bmr-out-int");
  const oNote = makeOutputLine(outputRegion, "Note", "bmr-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBlendedMortgageRate({ balance_1: readNum(b1.input), rate_1: readNum(r1.input), balance_2: readNum(b2.input), rate_2: readNum(r2.input) });
    if (r.error) { oBlend.textContent = r.error; oComb.textContent = "-"; oInt.textContent = "-"; oNote.textContent = ""; return; }
    oBlend.textContent = fmt(r.blended_rate, 2) + "% (refinance below this to win)";
    oComb.textContent = "$" + fmt(r.combined, 0);
    oInt.textContent = "$" + fmt(r.monthly_interest, 0) + "/mo";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [b1, r1, b2, r2]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["blended-mortgage-rate"] = renderBlendedMortgageRate;

// ===================== spec-v784: floor area ratio (zoning) =====================
// dims: in { building_floor_area_sf: L^2, lot_area_sf: L^2, far_limit: dimensionless } out: { far: dimensionless, max_buildable_sf: L^2, remaining_sf: L^2 }
export function computeFloorAreaRatio({ building_floor_area_sf = 0, lot_area_sf = 0, far_limit = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bldg = Number(building_floor_area_sf) || 0;
  const lot = Number(lot_area_sf) || 0;
  const limit = Number(far_limit) || 0;
  if (bldg < 0) return { error: "Building floor area cannot be negative (SF)." };
  if (!(lot > 0)) return { error: "Lot area must be positive (SF)." };
  if (limit < 0) return { error: "FAR limit cannot be negative." };
  const far = bldg / lot;
  const has_limit = limit > 0;
  const max_buildable_sf = has_limit ? limit * lot : null;
  const remaining_sf = has_limit ? max_buildable_sf - bldg : null;
  const within = has_limit ? far <= limit : null;
  if (![far].every(Number.isFinite)) return { error: "Floor-area-ratio math is not a finite value." };
  return {
    far, has_limit, far_limit: limit, max_buildable_sf, remaining_sf, within,
    note: "Floor area ratio (FAR) is the standard zoning measure of building intensity: FAR = gross building floor area / lot area. A FAR of 1.0 is a building whose floor area equals the lot area -- one story covering the whole lot, two stories on half of it, and so on -- so FAR caps bulk without dictating the footprint or height directly. Where a limit is set, the maximum buildable floor area = FAR_limit x lot area, and the remaining capacity is that minus what is already built. The catch is the definition of \"floor area\": municipalities differ on whether parking, basements, mechanical space, and balconies count, so enter the gross figure your local zoning code defines as counting. A screening aid; the zoning ordinance, its exclusions, and the planning authority govern.",
  };
}
export const floorAreaRatioExample = { inputs: { building_floor_area_sf: 30000, lot_area_sf: 20000, far_limit: 2.0 } };
function renderFloorAreaRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: floor area ratio (municipal zoning intensity measure): FAR = gross building floor area / lot area; max buildable floor area = FAR_limit x lot area; remaining = max buildable - existing. What counts as floor area (parking, basements, mechanical) varies by municipality; enter the gross figure the local code defines. A screening aid; the zoning ordinance and planning authority govern.";
  const bldg = makeNumber("Building gross floor area (SF)", "far-bldg", { step: "any", min: "0" }); bldg.input.value = "30000";
  const lot = makeNumber("Lot area (SF)", "far-lot", { step: "any", min: "0" }); lot.input.value = "20000";
  const limit = makeNumber("Zoning FAR limit (0 = skip the cap check)", "far-limit", { step: "any", min: "0" }); limit.input.value = "2.0";
  for (const f of [bldg, lot, limit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bldg.input.value = "30000"; lot.input.value = "20000"; limit.input.value = "2.0"; update(); });
  const oFar = makeOutputLine(outputRegion, "Floor area ratio (FAR)", "far-out-far");
  const oMax = makeOutputLine(outputRegion, "Maximum buildable floor area", "far-out-max");
  const oRem = makeOutputLine(outputRegion, "Remaining capacity", "far-out-rem");
  const oNote = makeOutputLine(outputRegion, "Note", "far-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeFloorAreaRatio({ building_floor_area_sf: readNum(bldg.input), lot_area_sf: readNum(lot.input), far_limit: readNum(limit.input) });
    if (r.error) { oFar.textContent = r.error; oMax.textContent = "-"; oRem.textContent = "-"; oNote.textContent = ""; return; }
    oFar.textContent = fmt(r.far, 3) + (r.has_limit ? (r.within ? " (within the " + fmt(r.far_limit, 2) + " limit)" : " -- EXCEEDS the " + fmt(r.far_limit, 2) + " limit") : "");
    oMax.textContent = r.has_limit ? fmt(r.max_buildable_sf, 0) + " SF (at FAR " + fmt(r.far_limit, 2) + ")" : "enter a FAR limit to size the cap";
    oRem.textContent = r.has_limit ? (r.remaining_sf >= 0 ? fmt(r.remaining_sf, 0) + " SF left to build" : fmt(-r.remaining_sf, 0) + " SF over the cap") : "-";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bldg, lot, limit]) f.input.addEventListener("input", update);
}
REALESTATE_RENDERERS["floor-area-ratio"] = renderFloorAreaRatio;
