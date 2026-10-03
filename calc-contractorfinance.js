// Contractor cost, billing, and insurance calculators split from
// calc-accounting.js by spec-v1877. Calculator behavior and citations are unchanged.

import {
  DEBOUNCE_MS,
  debounce,
  makeNumber,
  makeSelect,
  makeOutputLine,
  attachExampleButton,
  fmt,
} from "./ui-fields.js";

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

export const CONTRACTOR_FINANCE_RENDERERS = {};

// ===================== spec-v362..v364: contractor cost-recovery batch (Group R) =====================
// The bid-rate numbers a contractor builds from wages, iron, and overhead:
// the fully-burdened labor rate (v362), the equipment owning-and-operating
// hourly rate (v363), and the overhead recovery rate (v364).

// dims: in { wage: dimensionless, payroll_pct: dimensionless, wc_pct: dimensionless, liab_pct: dimensionless, benefits: dimensionless, productivity: dimensionless } out: { burden_hr: dimensionless, burdened_hr: dimensionless, burden_pct: dimensionless }
export function computeLaborBurdenRate({ wage = 0, payroll_pct = 9.15, wc_pct = 0, liab_pct = 0, benefits = 0, productivity = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(wage) || 0;
  const pr = Number(payroll_pct) || 0;
  const wc = Number(wc_pct) || 0;
  const li = Number(liab_pct) || 0;
  const ben = Number(benefits) || 0;
  const prod = Number(productivity) || 0;
  if (!(w > 0)) return { error: "Base wage must be positive ($/hr)." };
  if (!(prod > 0 && prod <= 100)) return { error: "Productivity must be over 0 and up to 100 percent." };
  // A fraction typed into the percent field (0.85) used to divide by 0.0085: a $25 wage read $3,975/hr.
  // <= 1: a 1 typed for "100%" read as 1% and multiplied the cost 100x ($25 -> $2,728.75/hr).
  if (prod <= 1) return { error: "Enter productivity as a percent (85 for 85%, 100 for 100%), not a fraction." };
  if (pr < 0 || wc < 0 || li < 0 || ben < 0) return { error: "Payroll tax, workers' comp, liability and benefits cannot be negative." };
  const burden_hr = w * (pr + wc + li) / 100 + ben;
  const burdened_hr = (w + burden_hr) / (prod / 100);
  const burden_pct = (burdened_hr - w) / w * 100;
  return {
    burden_hr, burdened_hr, burden_pct,
    note: "Fully-burdened labor rate: the base wage plus payroll taxes (FICA + FUTA/SUTA, about 9.15% of wage), workers' comp and general liability (both % of wage, and the WC class matters), and per-hour benefits, then divided by the billable (productive) fraction of paid hours. The productivity divisor spreads the non-billable time (travel, setup, rework) over the billed hours, which is why a crew's cost rate runs well above the hourly wage. A bid-rate aid; the payroll service, the insurer's rates, and the fringe package govern the actual burden.",
  };
}
export const laborBurdenRateExample = { inputs: { wage: 25, payroll_pct: 9.15, wc_pct: 8, liab_pct: 2, benefits: 4, productivity: 85 } };
function renderLaborBurdenRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fully-burdened labor rate = (wage x (1 + (payroll% + WC% + liability%)/100) + benefits $/hr) / productive fraction, standard contractor bid-rate estimating. Payroll ~9.15% (FICA 7.65 + FUTA/SUTA). The payroll service, insurer rates, and fringe package govern.";
  const wage = makeNumber("Base wage ($/hr)", "lbr-wage", { step: "any", min: "0" }); wage.input.value = "25";
  const pr = makeNumber("Payroll tax (%, FICA+FUTA/SUTA)", "lbr-pr", { step: "any", min: "0" }); pr.input.value = "9.15";
  const wc = makeNumber("Workers' comp (% of wage)", "lbr-wc", { step: "any", min: "0" });
  const li = makeNumber("General liability (% of wage)", "lbr-li", { step: "any", min: "0" });
  const ben = makeNumber("Benefits ($/hr)", "lbr-ben", { step: "any", min: "0" });
  const prod = makeNumber("Productive/billable fraction (%)", "lbr-prod", { step: "any", min: "0", max: "100" }); prod.input.value = "100";
  for (const f of [wage, pr, wc, li, ben, prod]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wage.input.value = "25"; pr.input.value = "9.15"; wc.input.value = "8"; li.input.value = "2"; ben.input.value = "4"; prod.input.value = "85"; update(); });
  const oBurden = makeOutputLine(outputRegion, "Burden (over wage)", "lbr-out-b");
  const oRate = makeOutputLine(outputRegion, "Fully-burdened rate", "lbr-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "lbr-out-note");
  const update = debounce(() => {
    const r = computeLaborBurdenRate({ wage: Number(wage.input.value) || 0, payroll_pct: Number(pr.input.value) || 0, wc_pct: Number(wc.input.value) || 0, liab_pct: Number(li.input.value) || 0, benefits: Number(ben.input.value) || 0, productivity: Number(prod.input.value) || 0 });
    if (r.error) { oBurden.textContent = r.error; oRate.textContent = "-"; oNote.textContent = ""; return; }
    oBurden.textContent = "$" + fmt(r.burden_hr, 2) + "/hr";
    oRate.textContent = "$" + fmt(r.burdened_hr, 2) + "/hr (" + fmt(r.burden_pct, 1) + "% over wage)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wage, pr, wc, li, ben, prod]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["labor-burden-rate"] = renderLaborBurdenRate;

// dims: in { purchase: dimensionless, salvage: dimensionless, life_hr: dimensionless, annual_hr: dimensionless, iit_pct: dimensionless, fuel_gph: L^3 T^-1, fuel_price: dimensionless, maint_hr: dimensionless, wear_hr: dimensionless } out: { owning_hr: dimensionless, operating_hr: dimensionless, total_hr: dimensionless }
export function computeEquipmentHourlyRate({ purchase = 0, salvage = 0, life_hr = 0, annual_hr = 0, iit_pct = 0, fuel_gph = 0, fuel_price = 0, maint_hr = 0, wear_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pur = Number(purchase) || 0;
  const sal = Number(salvage) || 0;
  const life = Number(life_hr) || 0;
  const ann = Number(annual_hr) || 0;
  const iit = Number(iit_pct) || 0;
  if (!(pur > 0)) return { error: "Purchase price must be positive ($)." };
  if (!(sal >= 0 && sal < pur)) return { error: "Salvage must be zero or positive and less than the purchase price." };
  if (!(life > 0)) return { error: "Useful life must be positive (hours)." };
  if (!(ann > 0)) return { error: "Annual hours must be positive." };
  if (ann > life) return { error: "Annual hours cannot exceed the useful life in hours." };
  if (iit > 0 && iit < 1) return { error: "Enter interest + insurance + tax as a percent (18 for 18%), not a fraction." };
  if ([fuel_gph, fuel_price, maint_hr, wear_hr].some((v) => Number(v) < 0)) return { error: "Fuel, maintenance and wear costs cannot be negative." };
  const deprec = (pur - sal) / life;
  // Caterpillar Performance Handbook (Sec. 20): the average annual investment over N years is
  // [P(N + 1) + S(N - 1)] / (2N). Until 2026-09-26 the tile used (P + S) / 2, understating the interest / insurance /
  // tax carry (CAT Example I: 14.61 vs 13.67 $/hr).
  const n_years = life / ann;
  const avg_investment = (pur * (n_years + 1) + sal * (n_years - 1)) / (2 * n_years);
  const iit_hr = (iit / 100) * avg_investment / ann;
  const owning_hr = deprec + iit_hr;
  const operating_hr = (Number(fuel_gph) || 0) * (Number(fuel_price) || 0) + (Number(maint_hr) || 0) + (Number(wear_hr) || 0);
  const total_hr = owning_hr + operating_hr;
  return {
    deprec_hr: deprec, iit_hr, avg_investment, owning_hr, operating_hr, total_hr,
    note: "Equipment owning + operating hourly rate (the CAT/AED method): owning = straight-line depreciation (purchase - salvage)/life + the interest/insurance/tax carry (% of the average annual investment [P(N+1) + S(N-1)] / 2N, N = life in years, / annual hours); operating = fuel (gph x price) + maintenance + tires/wear per hour. Running a machine more hours per year spreads the fixed interest-carry thinner, so an idle machine is expensive per hour. A bid-rate aid; the owner's actual costs, financing, and utilization govern.",
  };
}
export const equipmentHourlyRateExample = { inputs: { purchase: 50000, salvage: 10000, life_hr: 5000, annual_hr: 1000, iit_pct: 8, fuel_gph: 2, fuel_price: 4, maint_hr: 4, wear_hr: 1 } };
function renderEquipmentHourlyRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: equipment owning + operating hourly rate (CAT / AED cost-recovery method): owning = (purchase - salvage)/life + IIT% x average annual investment [P(N+1) + S(N-1)]/2N / annual hours; operating = fuel + maintenance + wear per hour. The owner's actual costs, financing, and utilization govern.";
  const pur = makeNumber("Purchase price ($)", "ehr-pur", { step: "any", min: "0" });
  const sal = makeNumber("Salvage value ($)", "ehr-sal", { step: "any", min: "0" });
  const life = makeNumber("Useful life (hours)", "ehr-life", { step: "any", min: "0" });
  const ann = makeNumber("Hours operated per year", "ehr-ann", { step: "any", min: "0" });
  const iit = makeNumber("Interest+insurance+tax (%/yr of avg value)", "ehr-iit", { step: "any", min: "0" });
  const fg = makeNumber("Fuel burn (gal/hr)", "ehr-fg", { step: "any", min: "0" });
  const fp = makeNumber("Fuel price ($/gal)", "ehr-fp", { step: "any", min: "0" });
  const mh = makeNumber("Maintenance ($/hr)", "ehr-mh", { step: "any", min: "0" });
  const wh = makeNumber("Tires/wear ($/hr)", "ehr-wh", { step: "any", min: "0" });
  for (const f of [pur, sal, life, ann, iit, fg, fp, mh, wh]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pur.input.value = "50000"; sal.input.value = "10000"; life.input.value = "5000"; ann.input.value = "1000"; iit.input.value = "8"; fg.input.value = "2"; fp.input.value = "4"; mh.input.value = "4"; wh.input.value = "1"; update(); });
  const oOwn = makeOutputLine(outputRegion, "Owning cost", "ehr-out-own");
  const oOp = makeOutputLine(outputRegion, "Operating cost", "ehr-out-op");
  const oTot = makeOutputLine(outputRegion, "Total hourly rate", "ehr-out-tot");
  const oNote = makeOutputLine(outputRegion, "Note", "ehr-out-note");
  const update = debounce(() => {
    const r = computeEquipmentHourlyRate({ purchase: Number(pur.input.value) || 0, salvage: Number(sal.input.value) || 0, life_hr: Number(life.input.value) || 0, annual_hr: Number(ann.input.value) || 0, iit_pct: Number(iit.input.value) || 0, fuel_gph: Number(fg.input.value) || 0, fuel_price: Number(fp.input.value) || 0, maint_hr: Number(mh.input.value) || 0, wear_hr: Number(wh.input.value) || 0 });
    if (r.error) { oOwn.textContent = r.error; oOp.textContent = "-"; oTot.textContent = "-"; oNote.textContent = ""; return; }
    oOwn.textContent = "$" + fmt(r.owning_hr, 2) + "/hr (deprec $" + fmt(r.deprec_hr, 2) + " + IIT $" + fmt(r.iit_hr, 2) + ")";
    oOp.textContent = "$" + fmt(r.operating_hr, 2) + "/hr";
    oTot.textContent = "$" + fmt(r.total_hr, 2) + "/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pur, sal, life, ann, iit, fg, fp, mh, wh]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["equipment-hourly-rate"] = renderEquipmentHourlyRate;

// dims: in { annual_overhead: dimensionless, basis: dimensionless, billable_hours: dimensionless, annual_direct: dimensionless, job_direct: dimensionless } out: { rate_hr: dimensionless, overhead_pct: dimensionless, job_overhead: dimensionless }
export function computeOverheadRecoveryRate({ annual_overhead = 0, basis = "per-hour", billable_hours = 0, annual_direct = 0, job_direct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const oh = Number(annual_overhead) || 0;
  if (!(oh > 0)) return { error: "Annual overhead must be positive ($)." };
  if (basis === "markup") {
    const ad = Number(annual_direct) || 0;
    if (!(ad > 0)) return { error: "Annual direct cost must be positive ($)." };
    const overhead_pct = oh / ad * 100;
    const jd = Number(job_direct) || 0;
    const job_overhead = jd > 0 ? jd * overhead_pct / 100 : null;
    return { basis: "markup", overhead_pct, job_overhead, rate_hr: null };
  }
  const bh = Number(billable_hours) || 0;
  if (!(bh > 0)) return { error: "Billable hours must be positive." };
  const rate_hr = oh / bh;
  return {
    basis: "per-hour", rate_hr, overhead_pct: null, job_overhead: null,
    note: "Overhead recovery rate: the annual indirect overhead (office, trucks, insurance, non-billable staff) spread over the billable field hours ($/hr) or over the annual direct cost (a % markup). Every billed hour, or every direct dollar, must carry its share or the overhead is not recovered. Cutting overhead lowers the recovery rate directly, widening the competitive margin - the reason overhead control wins bids. A bid-rate aid; the contractor's actual books and billable volume govern.",
  };
}
export const overheadRecoveryRateExample = { inputs: { annual_overhead: 200000, basis: "per-hour", billable_hours: 8000, annual_direct: 500000, job_direct: 10000 } };
function renderOverheadRecoveryRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: overhead recovery = annual overhead / billable hours ($/hr) or / annual direct cost (% markup), standard contractor cost-recovery. Every billed hour or direct dollar carries its share. The contractor's books and billable volume govern.";
  const oh = makeNumber("Annual overhead ($)", "orr-oh", { step: "any", min: "0" });
  const basis = makeSelect("Recovery basis", "orr-basis", [
    { value: "per-hour", label: "Per billable hour ($/hr)" },
    { value: "markup", label: "Markup on direct cost (%)" },
  ]);
  const bh = makeNumber("Annual billable hours", "orr-bh", { step: "any", min: "0" });
  const ad = makeNumber("Annual direct cost ($)", "orr-ad", { step: "any", min: "0" }); ad.input.value = "500000";
  const jd = makeNumber("Job direct cost ($, optional)", "orr-jd", { step: "any", min: "0" });
  inputRegion.appendChild(oh.wrap); inputRegion.appendChild(basis.wrap);
  for (const f of [bh, ad, jd]) inputRegion.appendChild(f.wrap);
  const oRate = makeOutputLine(outputRegion, "Recovery rate", "orr-out-rate");
  const oJob = makeOutputLine(outputRegion, "Job overhead (markup)", "orr-out-job");
  const oNote = makeOutputLine(outputRegion, "Note", "orr-out-note");
  function syncFields() {
    const isMarkup = basis.select.value === "markup";
    bh.wrap.style.display = isMarkup ? "none" : "";
    ad.wrap.style.display = isMarkup ? "" : "none";
    jd.wrap.style.display = isMarkup ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeOverheadRecoveryRate({ annual_overhead: Number(oh.input.value) || 0, basis: basis.select.value, billable_hours: Number(bh.input.value) || 0, annual_direct: Number(ad.input.value) || 0, job_direct: Number(jd.input.value) || 0 });
    if (r.error) { oRate.textContent = r.error; oJob.textContent = "-"; oNote.textContent = ""; return; }
    if (r.basis === "markup") {
      oRate.textContent = fmt(r.overhead_pct, 1) + "% markup on direct cost";
      oJob.textContent = r.job_overhead == null ? "(enter a job direct cost)" : "$" + fmt(r.job_overhead, 0) + " overhead on this job";
      oNote.textContent = "Overhead recovery = annual overhead / annual direct cost, applied as a markup to a job's direct cost. Cutting overhead lowers the markup directly.";
      return;
    }
    oRate.textContent = "$" + fmt(r.rate_hr, 2) + "/billable hour";
    oJob.textContent = "(markup basis only)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { oh.input.value = "200000"; basis.select.value = "per-hour"; bh.input.value = "8000"; ad.input.value = "500000"; jd.input.value = ""; syncFields(); update(); });
  basis.select.addEventListener("change", () => { syncFields(); update(); });
  for (const f of [oh, bh, ad, jd]) f.input.addEventListener("input", update);
  syncFields();
}
CONTRACTOR_FINANCE_RENDERERS["overhead-recovery-rate"] = renderOverheadRecoveryRate;

// ===================== spec-v390..v392: contractor-billing trio (Group R) =====================

// dims: in { contract_usd: dimensionless, cost_to_date_usd: dimensionless, est_total_cost_usd: dimensionless, billed_to_date_usd: dimensionless } out: { pct_complete: dimensionless, earned_revenue: dimensionless, over_under: dimensionless }
export function computeWipPercentComplete({ contract_usd = 0, cost_to_date_usd = 0, est_total_cost_usd = 0, billed_to_date_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const contract = Number(contract_usd) || 0;
  const cost = Number(cost_to_date_usd) || 0;
  const est = Number(est_total_cost_usd) || 0;
  const billed = Number(billed_to_date_usd) || 0;
  if (!(contract > 0)) return { error: "Contract value must be positive (USD)." };
  if (!(est > 0)) return { error: "Estimated total cost must be positive (USD)." };
  if (cost < 0 || billed < 0) return { error: "Cost and billed amounts must be non-negative (USD)." };
  const raw_pct = cost / est;
  // Reported as a PERCENT (the key and the tile name both say so); the
  // fraction stays local because earned revenue multiplies by it. The page
  // used to print "Percent complete 0.75" for a job 75% done.
  const complete_fraction = Math.min(raw_pct, 1.0);
  const pct_complete = complete_fraction * 100;
  const overrun = raw_pct > 1.0 + 1e-9 * Math.abs(1.0);
  const earned_revenue = complete_fraction * contract;
  const over_under = earned_revenue - billed;
  // A contract whose estimated cost exceeds its value is a loss contract: GAAP (ASC 605-35 provision, carried under
  // ASC 606) books the WHOLE expected loss now, not just the percent-complete share. Until 2026-09-26 the tile showed
  // an underbilling on a loss job and never mentioned the loss.
  const projected_loss_usd = Math.max(0, est - contract);
  const loss_contract = projected_loss_usd > 0;
  return {
    pct_complete, earned_revenue, over_under, overrun, projected_loss_usd, loss_contract,
    underbilled: over_under >= 0,
    note: "Cost-to-cost percent-complete (POC) revenue recognition: percent complete = cost to date / estimated total cost (capped at 100%), earned revenue = percent complete x contract value, and over/under billing = earned revenue - billed to date. A positive figure is underbilled (a costs-in-excess asset - work done but not yet billed); a negative figure is overbilled (a billings-in-excess liability - cash collected against future work). Persistent overbilling can mask a job going bad. A management aid; the CPA-prepared WIP schedule governs.",
  };
}
export const wipPercentCompleteExample = { inputs: { contract_usd: 500000, cost_to_date_usd: 300000, est_total_cost_usd: 400000, billed_to_date_usd: 350000 } };
function renderWipPercentComplete(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cost-to-cost percent-of-completion revenue recognition (construction accounting, ASC 606 / AICPA construction guide): percent complete = cost to date / estimated total cost, earned revenue = percent complete x contract, over/under billing = earned revenue - billed. A management aid; the CPA-prepared WIP schedule governs.";
  const contract = makeNumber("Contract value (USD)", "wip-c", { step: "any", min: "0" });
  const cost = makeNumber("Cost to date (USD)", "wip-cost", { step: "any", min: "0" });
  const est = makeNumber("Estimated total cost (USD)", "wip-est", { step: "any", min: "0" });
  const billed = makeNumber("Billed to date (USD)", "wip-b", { step: "any", min: "0" });
  for (const f of [contract, cost, est, billed]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { contract.input.value = "500000"; cost.input.value = "300000"; est.input.value = "400000"; billed.input.value = "350000"; update(); });
  const oPct = makeOutputLine(outputRegion, "Percent complete", "wip-out-pct");
  const oEarn = makeOutputLine(outputRegion, "Earned revenue", "wip-out-earn");
  const oOU = makeOutputLine(outputRegion, "Over / under billing", "wip-out-ou");
  const oNote = makeOutputLine(outputRegion, "Note", "wip-out-n");
  const update = debounce(() => {
    const r = computeWipPercentComplete({ contract_usd: Number(contract.input.value) || 0, cost_to_date_usd: Number(cost.input.value) || 0, est_total_cost_usd: Number(est.input.value) || 0, billed_to_date_usd: Number(billed.input.value) || 0 });
    if (r.error) { oPct.textContent = r.error; oEarn.textContent = "-"; oOU.textContent = "-"; oNote.textContent = ""; return; }
    oPct.textContent = fmt(r.pct_complete, 1) + "%" + (r.overrun ? " (cost past estimate -- overrun)" : "");
    oEarn.textContent = "$" + fmt(r.earned_revenue, 0);
    oOU.textContent = (r.underbilled ? "+$" + fmt(r.over_under, 0) + " underbilled (asset)" : "-$" + fmt(Math.abs(r.over_under), 0) + " overbilled (liability)") + (r.loss_contract ? " -- LOSS CONTRACT: book the full $" + fmt(r.projected_loss_usd, 0) + " projected loss now" : "") + (r.overrun ? " -- cost is past the estimate: update the estimate before trusting this" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [contract, cost, est, billed]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["wip-percent-complete"] = renderWipPercentComplete;

// dims: in { direct_cost_usd: dimensionless, overhead_pct: dimensionless, profit_pct: dimensionless, current_contract_usd: dimensionless } out: { price: dimensionless, markup: dimensionless, margin_pct: dimensionless, new_contract: dimensionless }
export function computeChangeOrderMarkup({ direct_cost_usd = 0, overhead_pct = 10, profit_pct = 10, current_contract_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const direct = Number(direct_cost_usd) || 0;
  const oh = Number(overhead_pct) || 0;
  const profit = Number(profit_pct) || 0;
  const current = Number(current_contract_usd) || 0;
  if (!(direct > 0)) return { error: "Direct cost must be positive (USD)." };
  if (oh < 0 || profit < 0) return { error: "Overhead and profit rates must be non-negative (%)." };
  if (current < 0) return { error: "Current contract value must be non-negative (USD)." };
  const price = direct * (1 + oh / 100) * (1 + profit / 100);
  const markup = price - direct;
  const margin_pct = price > 0 ? markup / price * 100 : 0;
  const new_contract = current > 0 ? current + price : null;
  const additive_price = direct * (1 + (oh + profit) / 100);
  return {
    price, markup, margin_pct, new_contract, additive_price,
    note: "Change-order price with overhead and profit compounded: price = direct cost x (1 + OH%) x (1 + profit%). The compounded method (OH then profit) is standard and yields slightly more than the additive direct x (1 + OH% + profit%); which one applies is set by the contract's general conditions. Direct cost is labor + material + equipment for the added scope. Margin here is markup / price (the gross margin), not the markup rate. A pricing aid; the contract terms and the owner's approval govern.",
  };
}
export const changeOrderMarkupExample = { inputs: { direct_cost_usd: 10000, overhead_pct: 10, profit_pct: 10, current_contract_usd: 500000 } };
function renderChangeOrderMarkup(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Change-order pricing with overhead and profit (construction estimating practice / AIA G701): price = direct cost x (1 + overhead%) x (1 + profit%), the standard compounded markup (the additive direct x (1 + OH% + profit%) is slightly less). The contract's general conditions set the allowed markup and method. A pricing aid; the contract terms and owner approval govern.";
  const direct = makeNumber("Added direct cost (USD)", "com-d", { step: "any", min: "0" });
  const oh = makeNumber("Overhead markup (%)", "com-oh", { step: "any", min: "0" });
  const profit = makeNumber("Profit markup (%)", "com-p", { step: "any", min: "0" });
  const current = makeNumber("Current contract total (USD, optional)", "com-c", { step: "any", min: "0" });
  for (const f of [direct, oh, profit, current]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { direct.input.value = "10000"; oh.input.value = "10"; profit.input.value = "10"; current.input.value = "500000"; update(); });
  const oPrice = makeOutputLine(outputRegion, "Change-order price", "com-out-price");
  const oMarkup = makeOutputLine(outputRegion, "Markup dollars (and margin % of price)", "com-out-markup");
  const oNew = makeOutputLine(outputRegion, "New contract total", "com-out-new");
  const oNote = makeOutputLine(outputRegion, "Note", "com-out-n");
  const update = debounce(() => {
    const r = computeChangeOrderMarkup({ direct_cost_usd: Number(direct.input.value) || 0, overhead_pct: Number(oh.input.value) || 0, profit_pct: Number(profit.input.value) || 0, current_contract_usd: Number(current.input.value) || 0 });
    if (r.error) { oPrice.textContent = r.error; oMarkup.textContent = "-"; oNew.textContent = "-"; oNote.textContent = ""; return; }
    oPrice.textContent = "$" + fmt(r.price, 0) + " (additive method $" + fmt(r.additive_price, 0) + ")";
    oMarkup.textContent = "$" + fmt(r.markup, 0) + " (" + fmt(r.margin_pct, 1) + "% gross margin)";
    oNew.textContent = r.new_contract == null ? "(enter a current contract total)" : "$" + fmt(r.new_contract, 0);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [direct, oh, profit, current]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["change-order-markup"] = renderChangeOrderMarkup;

// dims: in { work_this_period_usd: dimensionless, retainage_pct: dimensionless, prior_retained_usd: dimensionless } out: { retention_this: dimensionless, net_payment: dimensionless, cumulative_ret: dimensionless }
export function computeRetainageTracker({ work_this_period_usd = 0, retainage_pct = 10, prior_retained_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const work = Number(work_this_period_usd) || 0;
  const rate = Number(retainage_pct) || 0;
  const prior = Number(prior_retained_usd) || 0;
  if (!(work > 0)) return { error: "Work completed this period must be positive (USD)." };
  if (!(rate >= 0 && rate <= 100)) return { error: "Retainage rate must be between 0 and 100%." };
  if (prior < 0) return { error: "Prior retained amount must be non-negative (USD)." };
  const retention_this = work * (rate / 100);
  const net_payment = work - retention_this;
  const cumulative_ret = prior + retention_this;
  return {
    retention_this, net_payment, cumulative_ret,
    note: "Retainage on a progress draw (AIA G702/G703): retention this period = work completed x retainage rate, net payment = work - retention, cumulative retention = prior retained + this period's retention. Retainage is money earned but withheld until the work is accepted (often released at substantial completion, sometimes reduced at 50% complete); a lower rate frees cash flow, which is why it is negotiated. A billing aid; the contract and the owner's certified payment govern.",
  };
}
export const retainageTrackerExample = { inputs: { work_this_period_usd: 100000, retainage_pct: 10, prior_retained_usd: 40000 } };
function renderRetainageTracker(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Retainage on a progress payment (AIA G702 Application and Certificate for Payment / G703 Continuation Sheet): retention this period = work completed x retainage rate, net payment = work - retention, cumulative retention = prior + this period. A billing aid; the contract terms and the owner's certified payment govern.";
  const work = makeNumber("Work this period (USD)", "ret-w", { step: "any", min: "0" });
  const rate = makeNumber("Retainage rate (%)", "ret-r", { step: "any", min: "0", max: "100" });
  const prior = makeNumber("Prior retained (USD)", "ret-p", { step: "any", min: "0" });
  for (const f of [work, rate, prior]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { work.input.value = "100000"; rate.input.value = "10"; prior.input.value = "40000"; update(); });
  const oRet = makeOutputLine(outputRegion, "Retention this draw", "ret-out-ret");
  const oNet = makeOutputLine(outputRegion, "Net payment", "ret-out-net");
  const oCum = makeOutputLine(outputRegion, "Cumulative retention", "ret-out-cum");
  const oNote = makeOutputLine(outputRegion, "Note", "ret-out-n");
  const update = debounce(() => {
    const r = computeRetainageTracker({ work_this_period_usd: Number(work.input.value) || 0, retainage_pct: Number(rate.input.value) || 0, prior_retained_usd: Number(prior.input.value) || 0 });
    if (r.error) { oRet.textContent = r.error; oNet.textContent = "-"; oCum.textContent = "-"; oNote.textContent = ""; return; }
    oRet.textContent = "$" + fmt(r.retention_this, 0);
    oNet.textContent = "$" + fmt(r.net_payment, 0);
    oCum.textContent = "$" + fmt(r.cumulative_ret, 0);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [work, rate, prior]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["retainage-tracker"] = renderRetainageTracker;

// ===================== spec-v444..v446: contractor-cost trio (Group R) =====================

// dims: in { contract_usd: dimensionless, rate1_per_k: dimensionless, rate2_per_k: dimensionless, rate3_per_k: dimensionless } out: { premium_usd: dimensionless, effective_rate: dimensionless }
export function computeSuretyBondPremium({ contract_usd = 0, rate1_per_k = 25, rate2_per_k = 15, rate3_per_k = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const contract = Number(contract_usd) || 0;
  const r1 = Number(rate1_per_k) || 0;
  const r2 = Number(rate2_per_k) || 0;
  const r3 = Number(rate3_per_k) || 0;
  if (!(contract > 0)) return { error: "Contract value must be positive (USD)." };
  if (r1 < 0 || r2 < 0 || r3 < 0) return { error: "Rates must be non-negative (USD per $1,000)." };
  const band1 = Math.min(contract, 100000) / 1000 * r1;
  const band2 = Math.min(Math.max(contract - 100000, 0), 400000) / 1000 * r2;
  const band3 = Math.max(contract - 500000, 0) / 1000 * r3;
  const premium_usd = band1 + band2 + band3;
  const effective_rate = premium_usd / contract;
  return {
    band1, band2, band3, premium_usd, effective_rate,
    note: "Surety bond premium on a tiered (sliding-scale) rate: the premium is charged per $1,000 of contract value in bands - a common schedule is $25/thousand on the first $100,000, $15 on the next $400,000, and $10 above $500,000 - so the effective rate falls as the contract grows and the cheaper top band dominates. Rates depend on the contractor's financial strength, experience, and the surety's underwriting, and a small or new contractor pays more. The premium is a project cost that belongs in the bid. A budgeting aid; the surety's actual rate schedule and underwriting govern.",
  };
}
export const suretyBondPremiumExample = { inputs: { contract_usd: 500000, rate1_per_k: 25, rate2_per_k: 15, rate3_per_k: 10 } };
function renderSuretyBondPremium(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Surety bond premium (tiered rate, surety-industry practice): charged per $1,000 of contract in bands (e.g. $25/$15/$10 per thousand on the first $100k / next $400k / above $500k). The effective rate falls as the contract grows. A budgeting aid; the surety's rate schedule and underwriting govern.";
  const c = makeNumber("Contract value to bond ($)", "sbp-c", { step: "any", min: "0" });
  const r1 = makeNumber("Rate on first $100k ($/thousand)", "sbp-r1", { step: "any", min: "0" });
  const r2 = makeNumber("Rate on next $400k ($/thousand)", "sbp-r2", { step: "any", min: "0" });
  const r3 = makeNumber("Rate above $500k ($/thousand)", "sbp-r3", { step: "any", min: "0" });
  for (const f of [c, r1, r2, r3]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "500000"; r1.input.value = "25"; r2.input.value = "15"; r3.input.value = "10"; update(); });
  const oP = makeOutputLine(outputRegion, "Bond premium", "sbp-out-p");
  const oR = makeOutputLine(outputRegion, "Effective rate", "sbp-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "sbp-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSuretyBondPremium({ contract_usd: readNum(c.input), rate1_per_k: readNum(r1.input), rate2_per_k: readNum(r2.input), rate3_per_k: readNum(r3.input) });
    if (r.error) { oP.textContent = r.error; oR.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = "$" + fmt(r.premium_usd, 0);
    oR.textContent = fmt(r.effective_rate * 100, 2) + "% of the contract";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [c, r1, r2, r3]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["surety-bond-premium"] = renderSuretyBondPremium;

// dims: in { payroll_usd: dimensionless, class_rate: dimensionless, emr: dimensionless } out: { manual_premium: dimensionless, modified_premium: dimensionless, emr_swing: dimensionless }
export function computeWorkersCompEmrPremium({ payroll_usd = 0, class_rate = 0, emr = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const payroll = Number(payroll_usd) || 0;
  const rate = Number(class_rate) || 0;
  const mod = Number(emr) || 0;
  if (!(payroll > 0)) return { error: "Payroll must be positive (USD)." };
  if (!(rate > 0)) return { error: "Class rate must be positive (USD per $100)." };
  if (!(mod > 0)) return { error: "Experience mod (EMR) must be positive." };
  // An EMR is a multiplier near 1 (0.85, 1.25); a whole number such as 85 used to price the premium 85x.
  if (mod > 5) return { error: "Enter the EMR as a multiplier (0.85), not a whole number (85)." };
  const manual_premium = payroll / 100 * rate;
  const modified_premium = manual_premium * mod;
  const emr_swing = manual_premium * (1 - mod);
  const cost_per_100 = modified_premium / (payroll / 100);
  return {
    manual_premium, modified_premium, emr_swing, cost_per_100, credit: mod < 1,
    note: "Workers-compensation premium and the experience modification rate (EMR): the manual premium = payroll / 100 x the class rate (the rate per $100 of payroll for the job classification), and the actual premium = manual premium x the EMR, the multiplier the rating bureau assigns from the contractor's claims history versus its class peers. An EMR below 1.0 is a credit (a safety record better than average), above 1.0 a debit (worse), and the swing is manual premium x (1 - EMR). A low EMR also opens doors on bid lists that require one below a threshold, so safety pays twice. A budgeting aid; the rating bureau's EMR and the insurer's rates govern.",
  };
}
export const workersCompEmrPremiumExample = { inputs: { payroll_usd: 500000, class_rate: 8.00, emr: 0.85 } };
function renderWorkersCompEmrPremium(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Workers-comp premium and experience mod (NCCI / state rating-bureau practice): manual premium = payroll/100 x class rate, actual premium = manual x EMR (an EMR below 1.0 is a credit, above 1.0 a debit). A budgeting aid; the rating bureau's EMR and the insurer's rates govern.";
  const p = makeNumber("Annual payroll for the class ($)", "wce-p", { step: "any", min: "0" });
  const rate = makeNumber("Manual class rate ($/$100 payroll)", "wce-r", { step: "any", min: "0" });
  const emr = makeNumber("Experience mod (EMR)", "wce-e", { step: "any", min: "0" });
  for (const f of [p, rate, emr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "500000"; rate.input.value = "8.00"; emr.input.value = "0.85"; update(); });
  const oM = makeOutputLine(outputRegion, "Manual / modified premium", "wce-out-m");
  const oS = makeOutputLine(outputRegion, "EMR swing", "wce-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "wce-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWorkersCompEmrPremium({ payroll_usd: readNum(p.input), class_rate: readNum(rate.input), emr: readNum(emr.input) });
    if (r.error) { oM.textContent = r.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oM.textContent = "$" + fmt(r.manual_premium, 0) + " -> $" + fmt(r.modified_premium, 0) + " ($" + fmt(r.cost_per_100, 2) + "/$100)";
    oS.textContent = r.emr_swing === 0 ? "none (EMR 1.0)" : (r.credit ? "$" + fmt(r.emr_swing, 0) + " credit (EMR < 1.0)" : "$" + fmt(-r.emr_swing, 0) + " debit (EMR > 1.0)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [p, rate, emr]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["workers-comp-emr-premium"] = renderWorkersCompEmrPremium;

// dims: in { base_wage_hr: dimensionless, fringe_hr: dimensionless, payroll_tax: dimensionless } out: { package_hr: dimensionless, cash_cost_hr: dimensionless, plan_cost_hr: dimensionless, savings_hr: dimensionless }
export function computePrevailingWageFringe({ base_wage_hr = 0, fringe_hr = 0, payroll_tax = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const base = Number(base_wage_hr) || 0;
  const fringe = Number(fringe_hr) || 0;
  const tax = Number(payroll_tax) || 0;
  if (!(base > 0)) return { error: "Base wage must be positive (USD/hr)." };
  if (fringe < 0) return { error: "Fringe rate must be non-negative (USD/hr)." };
  if (tax < 0) return { error: "Payroll-tax rate must be non-negative (%)." };
  if (tax > 0 && tax < 1) return { error: "Enter the payroll-tax rate as a percent (7.65), not a fraction." };
  if (tax > 50) return { error: "Payroll-tax rate above 50% is not plausible; enter it as a percent (7.65)." };
  const package_hr = base + fringe;
  const cash_cost_hr = package_hr + package_hr * tax / 100;
  const plan_cost_hr = package_hr + base * tax / 100;
  const savings_hr = fringe * tax / 100;
  return {
    package_hr, cash_cost_hr, plan_cost_hr, savings_hr,
    note: "Prevailing-wage package, cash vs bona-fide fringe: the required package = the base hourly wage + the fringe rate from the wage determination (Davis-Bacon / state). If the fringe is paid as cash on the paycheck it becomes taxable wages, so the employer also pays payroll taxes (and any wage-based workers-comp) on it; if it is funded through a bona-fide benefit plan (health, retirement, apprenticeship) it is not wages, so the payroll-tax burden on the fringe portion disappears. The saving = the fringe x the wage-based burden rate per hour, a real reduction in the labor cost of a public job with no cut to the worker's total package. A budgeting aid; the wage determination, the plan's bona-fide status, and the compliance rules govern.",
  };
}
export const prevailingWageFringeExample = { inputs: { base_wage_hr: 35, fringe_hr: 15, payroll_tax: 7.65 } };
function renderPrevailingWageFringe(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Prevailing-wage fringe (Davis-Bacon / state determination): package = base wage + fringe; paying the fringe as cash makes it taxable wages, funding it through a bona-fide plan does not, saving fringe x the wage-based burden per hour. A budgeting aid; the wage determination and the plan's bona-fide status govern.";
  const base = makeNumber("Base hourly wage ($/hr)", "pwf-b", { step: "any", min: "0" });
  const fringe = makeNumber("Fringe rate from the determination ($/hr)", "pwf-f", { step: "any", min: "0" });
  const tax = makeNumber("Wage-based burden (payroll tax + comp, %)", "pwf-t", { step: "any", min: "0" });
  for (const f of [base, fringe, tax]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { base.input.value = "35"; fringe.input.value = "15"; tax.input.value = "7.65"; update(); });
  const oP = makeOutputLine(outputRegion, "Required package", "pwf-out-p");
  const oC = makeOutputLine(outputRegion, "Cash vs plan cost", "pwf-out-c");
  const oS = makeOutputLine(outputRegion, "Saving via a bona-fide plan", "pwf-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "pwf-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePrevailingWageFringe({ base_wage_hr: readNum(base.input), fringe_hr: readNum(fringe.input), payroll_tax: readNum(tax.input) });
    if (r.error) { oP.textContent = r.error; oC.textContent = "-"; oS.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = "$" + fmt(r.package_hr, 2) + "/hr (base + fringe)";
    oC.textContent = "$" + fmt(r.cash_cost_hr, 3) + " cash vs $" + fmt(r.plan_cost_hr, 3) + " plan, per hour";
    oS.textContent = "$" + fmt(r.savings_hr, 2) + "/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [base, fringe, tax]) f.input.addEventListener("input", update);
}
CONTRACTOR_FINANCE_RENDERERS["prevailing-wage-fringe"] = renderPrevailingWageFringe;
