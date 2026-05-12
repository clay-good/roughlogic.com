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

// --- Renderer registry ---

export const REALESTATE_RENDERERS = {
  "ltv": renderLTV,
  "dti": renderDTI,
  "piti": renderPITI,
  "exchange-1031-timeline": render1031Timeline,
  "section-121-exclusion": renderSection121,
  "property-tax": renderPropertyTax,
};
