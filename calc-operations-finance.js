// Group R operations-finance calculators split from calc-accounting.js by spec-v1854.
// IDs, compute behavior, examples, citations, and Group R placement are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeOutputLine, attachExampleButton, fmt,
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

export const OPERATIONS_FINANCE_RENDERERS = {};

// ===================== spec-v529: economic order quantity (Wilson EOQ) =====================
// dims: in { annual_demand: dimensionless, order_cost: dimensionless, holding_cost: dimensionless } out: { eoq: dimensionless, orders_per_year: dimensionless, cycle_days: T, total_annual: dimensionless }
export function computeEoqOrderQuantity({ annual_demand = 0, order_cost = 0, holding_cost = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(annual_demand) || 0;
  const s = Number(order_cost) || 0;
  const h = Number(holding_cost) || 0;
  if (!(d > 0)) return { error: "Annual demand must be positive (units)." };
  if (!(s > 0)) return { error: "Order cost must be positive ($)." };
  if (!(h > 0)) return { error: "Holding cost must be positive ($/unit/yr)." };
  const eoq = Math.sqrt(2 * d * s / h);
  const orders_per_year = d / eoq;
  const cycle_days = 365 / orders_per_year;
  const total_annual = Math.sqrt(2 * d * s * h);
  if (![eoq, orders_per_year, cycle_days, total_annual].every(Number.isFinite)) return { error: "EOQ math is not a finite value." };
  return {
    eoq, orders_per_year, cycle_days, total_annual,
    note: "Economic order quantity (Wilson model): EOQ = sqrt(2 D S / H) is the order size that minimizes the SUM of two costs pulling opposite ways -- order too often and the fixed per-order cost (setup, freight, receiving) piles up; order too much at once and the holding cost (capital, storage, spoilage) piles up. At the EOQ the total annual ordering-plus-holding cost is sqrt(2 D S H), and ordering and holding cost are equal. The reassuring catch: the total-cost curve is FLAT near the minimum, so rounding the EOQ to a case or pallet quantity barely raises cost -- but hand-to-mouth ordering or a full truckload for a discount does. The model assumes steady demand and no quantity discounts (a discount tier needs a separate comparison). A planning aid, not a purchasing policy; the actual demand, lead time, and supplier terms govern.",
  };
}
export const eoqOrderQuantityExample = { inputs: { annual_demand: 12000, order_cost: 50, holding_cost: 3 } };
function renderEoqOrderQuantity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: economic order quantity (Wilson EOQ inventory model): EOQ = sqrt(2 D S / H); orders/yr = D / EOQ; cycle = 365 / orders; total annual cost = sqrt(2 D S H). Minimizes ordering plus holding cost; the total-cost curve is flat near the minimum, so rounding to a case quantity barely hurts. No quantity discounts assumed. A planning aid; the demand and supplier terms govern.";
  const d = makeNumber("Annual demand (units/yr)", "eoq-d", { step: "any", min: "0" });
  const s = makeNumber("Fixed cost per order ($)", "eoq-s", { step: "any", min: "0" });
  const h = makeNumber("Annual holding cost per unit ($/unit/yr)", "eoq-h", { step: "any", min: "0" });
  for (const f of [d, s, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "12000"; s.input.value = "50"; h.input.value = "3"; update(); });
  const oEoq = makeOutputLine(outputRegion, "Economic order quantity", "eoq-out-eoq");
  const oOrders = makeOutputLine(outputRegion, "Orders per year / cycle", "eoq-out-orders");
  const oTotal = makeOutputLine(outputRegion, "Total annual cost at EOQ", "eoq-out-total");
  const oNote = makeOutputLine(outputRegion, "Note", "eoq-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEoqOrderQuantity({ annual_demand: readNum(d.input), order_cost: readNum(s.input), holding_cost: readNum(h.input) });
    if (r.error) { oEoq.textContent = r.error; oOrders.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oEoq.textContent = fmt(r.eoq, 0) + " units per order";
    oOrders.textContent = fmt(r.orders_per_year, 1) + " orders/yr (every " + fmt(r.cycle_days, 0) + " days)";
    oTotal.textContent = "$" + fmt(r.total_annual, 0) + "/yr (ordering + holding)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, s, h]) f.input.addEventListener("input", update);
}
OPERATIONS_FINANCE_RENDERERS["eoq-order-quantity"] = renderEoqOrderQuantity;

// Acklam's rational approximation of the inverse normal CDF (accurate to ~1e-9).
function _invNorm(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  if (p < pLow) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= pHigh) { const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

// ===================== spec-v530: reorder point and safety stock (service-level model) =====================
// dims: in { avg_daily_demand: dimensionless, lead_time_days: T, demand_sd: dimensionless, service_level_pct: dimensionless } out: { z: dimensionless, safety_stock: dimensionless, reorder_point: dimensionless }
export function computeReorderPoint({ avg_daily_demand = 0, lead_time_days = 0, demand_sd = 0, service_level_pct = 95 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dd = Number(avg_daily_demand) || 0;
  const lt = Number(lead_time_days) || 0;
  const sd = Number(demand_sd) || 0;
  const sl = Number(service_level_pct) || 0;
  if (dd < 0) return { error: "Average daily demand cannot be negative." };
  if (sd < 0) return { error: "Demand standard deviation cannot be negative." };
  if (!(lt > 0)) return { error: "Lead time must be positive (days)." };
  if (!(sl > 0 && sl < 100)) return { error: "Service level must be over 0 and under 100 percent." };
  const z = _invNorm(sl / 100);
  const safety_stock = z * sd * Math.sqrt(lt);
  const reorder_point = dd * lt + safety_stock;
  if (![z, safety_stock, reorder_point].every(Number.isFinite)) return { error: "Reorder-point math is not a finite value." };
  return {
    z, safety_stock, reorder_point,
    note: "Reorder point and safety stock (service-level model). The reorder point is the on-hand level that triggers a new order so stock does not run out before it arrives: reorder_point = demand during the lead time (avg_daily_demand x lead_time) PLUS a safety-stock buffer, safety_stock = z x demand_sd x sqrt(lead_time), where z is the service-level's inverse-normal z-score (95% = 1.645, 99% = 2.326). The buffer scales with the SQUARE ROOT of lead time and with the z-score, so chasing the last few points of service costs a disproportionate buffer -- moving from 95% to 99% raises the safety stock by about 40% (z 1.645 to 2.326) for a 4-point gain. The model assumes normally distributed demand and a fixed lead time (variable lead time adds a second variance term). A planning aid, not an inventory policy; the actual demand pattern and supplier reliability govern.",
  };
}
export const reorderPointExample = { inputs: { avg_daily_demand: 100, lead_time_days: 7, demand_sd: 20, service_level_pct: 95 } };
function renderReorderPoint(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: reorder point and safety stock (service-level inventory control): z = inverse_normal(service_level/100); safety_stock = z x demand_sd x sqrt(lead_time); reorder_point = avg_daily_demand x lead_time + safety_stock. Safety stock scales with sqrt(lead time) and the z-score, so the last few points of service cost a disproportionate buffer. A planning aid; the demand pattern and supplier reliability govern.";
  const dd = makeNumber("Average daily demand (units/day)", "rop-dd", { step: "any", min: "0" });
  const lt = makeNumber("Supplier lead time (days)", "rop-lt", { step: "any", min: "0" });
  const sd = makeNumber("Daily demand std deviation (units/day)", "rop-sd", { step: "any", min: "0" });
  const sl = makeNumber("Target service level (%)", "rop-sl", { step: "any", min: "0", max: "100" });
  for (const f of [dd, lt, sd, sl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dd.input.value = "100"; lt.input.value = "7"; sd.input.value = "20"; sl.input.value = "95"; update(); });
  const oSafety = makeOutputLine(outputRegion, "Safety stock", "rop-out-safety");
  const oRop = makeOutputLine(outputRegion, "Reorder point", "rop-out-rop");
  const oNote = makeOutputLine(outputRegion, "Note", "rop-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeReorderPoint({ avg_daily_demand: readNum(dd.input), lead_time_days: readNum(lt.input), demand_sd: readNum(sd.input), service_level_pct: sl.input.value === "" ? 95 : readNum(sl.input) });
    if (r.error) { oSafety.textContent = r.error; oRop.textContent = "-"; oNote.textContent = ""; return; }
    oSafety.textContent = fmt(r.safety_stock, 0) + " units (z = " + fmt(r.z, 3) + ")";
    oRop.textContent = fmt(r.reorder_point, 0) + " units -- reorder when stock drops here";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [dd, lt, sd, sl]) f.input.addEventListener("input", update);
}
OPERATIONS_FINANCE_RENDERERS["reorder-point"] = renderReorderPoint;

// ===================== spec-v531: units-of-production depreciation =====================
// dims: in { cost_basis: dimensionless, salvage_value: dimensionless, total_units: dimensionless, period_units: dimensionless, accumulated_units: dimensionless } out: { rate: dimensionless, period_depreciation: dimensionless, book_value: dimensionless }
export function computeUnitsOfProductionDepr({ cost_basis = 0, salvage_value = 0, total_units = 0, period_units = 0, accumulated_units = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cost = Number(cost_basis) || 0;
  const salvage = Number(salvage_value) || 0;
  const total = Number(total_units) || 0;
  const period = Number(period_units) || 0;
  const accum = Number(accumulated_units) || 0;
  if (!(cost > 0)) return { error: "Cost basis must be positive ($)." };
  if (salvage < 0) return { error: "Salvage value cannot be negative ($)." };
  if (!(salvage < cost)) return { error: "Salvage value must be below the cost basis ($)." };
  if (!(total > 0)) return { error: "Total estimated units must be positive." };
  if (period < 0 || accum < 0) return { error: "Period and accumulated units cannot be negative." };
  const rate = (cost - salvage) / total;
  const period_depreciation = rate * period;
  const book_value = Math.max(cost - rate * accum, salvage);
  if (![rate, period_depreciation, book_value].every(Number.isFinite)) return { error: "Depreciation math is not a finite value." };
  return {
    rate, period_depreciation, book_value,
    note: "Units-of-production (activity) depreciation depreciates by USAGE instead of calendar time: rate = (cost - salvage) / total_estimated_units, period_depreciation = rate x period_units, and book_value = max(cost - rate x accumulated_units, salvage). For a machine, truck, or tool whose wear tracks hours or miles, this gives a truer book expense than a time-based method. Two catches: an IDLE asset takes ZERO depreciation that period (time-based methods keep expensing it), which matters for a seasonal business; and the book value can NEVER fall below salvage even if the asset is run past its estimated unit life. This is a GAAP/book and income-forecasting method, not the tax MACRS method for most assets. A bookkeeping aid, not tax advice; the accounting policy and tax rules govern.",
  };
}
export const unitsOfProductionDeprExample = { inputs: { cost_basis: 50000, salvage_value: 5000, total_units: 100000, period_units: 8000, accumulated_units: 8000 } };
function renderUnitsOfProductionDepr(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: units-of-production (activity) depreciation (GAAP; IRS Pub 946 activity method): rate = (cost - salvage) / total_units; period_depreciation = rate x period_units; book_value = max(cost - rate x accumulated_units, salvage). Depreciation tracks usage, so an idle asset takes zero; book value is floored at salvage. A GAAP/book method, not tax MACRS. A bookkeeping aid; the accounting policy and tax rules govern.";
  const cost = makeNumber("Cost basis ($)", "upd-cost", { step: "any", min: "0" });
  const salvage = makeNumber("Salvage value ($)", "upd-salvage", { step: "any", min: "0" });
  const total = makeNumber("Total estimated lifetime units (hrs/mi/pcs)", "upd-total", { step: "any", min: "0" });
  const period = makeNumber("Units used this period", "upd-period", { step: "any", min: "0" });
  const accum = makeNumber("Units used to date (incl. this period)", "upd-accum", { step: "any", min: "0" });
  for (const f of [cost, salvage, total, period, accum]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cost.input.value = "50000"; salvage.input.value = "5000"; total.input.value = "100000"; period.input.value = "8000"; accum.input.value = "8000"; update(); });
  const oRate = makeOutputLine(outputRegion, "Depreciation rate per unit", "upd-out-rate");
  const oDep = makeOutputLine(outputRegion, "This period's depreciation", "upd-out-dep");
  const oBook = makeOutputLine(outputRegion, "Ending book value (floored at salvage)", "upd-out-book");
  const oNote = makeOutputLine(outputRegion, "Note", "upd-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeUnitsOfProductionDepr({ cost_basis: readNum(cost.input), salvage_value: readNum(salvage.input), total_units: readNum(total.input), period_units: readNum(period.input), accumulated_units: readNum(accum.input) });
    if (r.error) { oRate.textContent = r.error; oDep.textContent = "-"; oBook.textContent = "-"; oNote.textContent = ""; return; }
    oRate.textContent = "$" + fmt(r.rate, 4) + " per unit";
    oDep.textContent = "$" + fmt(r.period_depreciation, 2);
    oBook.textContent = "$" + fmt(r.book_value, 2);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cost, salvage, total, period, accum]) f.input.addEventListener("input", update);
}
OPERATIONS_FINANCE_RENDERERS["units-of-production-depr"] = renderUnitsOfProductionDepr;
