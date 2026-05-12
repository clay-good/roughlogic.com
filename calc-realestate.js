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

import { DEBOUNCE_MS, debounce, makeNumber, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";

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

// --- Renderer registry ---

export const REALESTATE_RENDERERS = {
  "ltv": renderLTV,
  "dti": renderDTI,
  "piti": renderPITI,
};
