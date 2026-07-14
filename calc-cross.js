// Group G: Cross-Trade Utilities (59 through 64).

// --- Utility 59: Unit Converter ---
//
// Comprehensive bidirectional unit conversions across length, area, volume,
// mass, force, pressure, temperature, energy, power, flow, and electrical
// units. All factors are SI-anchored: every unit declares its multiplier
// to the SI base unit; a conversion is value * factor_from / factor_to.
//
// Temperature is special-cased because Fahrenheit and Celsius are affine.

export const UNITS = {
  length: {
    base: "m",
    units: {
      m: { factor: 1 },
      cm: { factor: 0.01 },
      mm: { factor: 0.001 },
      km: { factor: 1000 },
      in: { factor: 0.0254 },
      ft: { factor: 0.3048 },
      yd: { factor: 0.9144 },
      mi: { factor: 1609.344 },
    },
  },
  area: {
    base: "m^2",
    units: {
      "m^2": { factor: 1 },
      "cm^2": { factor: 0.0001 },
      "ft^2": { factor: 0.09290304 },
      "in^2": { factor: 0.00064516 },
      "yd^2": { factor: 0.83612736 },
      acre: { factor: 4046.8564224 },
      hectare: { factor: 10000 },
    },
  },
  volume: {
    base: "L",
    units: {
      L: { factor: 1 },
      mL: { factor: 0.001 },
      "m^3": { factor: 1000 },
      "ft^3": { factor: 28.316846592 },
      "in^3": { factor: 0.016387064 },
      gal_us: { factor: 3.785411784 },
      gal_uk: { factor: 4.54609 },
      qt_us: { factor: 0.946352946 },
      pt_us: { factor: 0.473176473 },
      fl_oz_us: { factor: 0.0295735295625 },
    },
  },
  mass: {
    base: "kg",
    units: {
      kg: { factor: 1 },
      g: { factor: 0.001 },
      lb: { factor: 0.45359237 },
      oz: { factor: 0.028349523125 },
      ton_short: { factor: 907.18474 },
      tonne_metric: { factor: 1000 },
    },
  },
  force: {
    base: "N",
    units: {
      N: { factor: 1 },
      kN: { factor: 1000 },
      lbf: { factor: 4.4482216152605 },
      kip: { factor: 4448.2216152605 },
    },
  },
  pressure: {
    base: "Pa",
    units: {
      Pa: { factor: 1 },
      kPa: { factor: 1000 },
      MPa: { factor: 1e6 },
      bar: { factor: 100000 },
      psi: { factor: 6894.757293168 },
      atm: { factor: 101325 },
      in_h2o: { factor: 248.84 },
      ft_h2o: { factor: 2989.067 },
      mm_hg: { factor: 133.322 },
      in_hg: { factor: 3386.388 },
    },
  },
  energy: {
    base: "J",
    units: {
      J: { factor: 1 },
      kJ: { factor: 1000 },
      kWh: { factor: 3600000 },
      Wh: { factor: 3600 },
      btu: { factor: 1055.05585262 },
      cal: { factor: 4.184 },
      kcal: { factor: 4184 },
      ft_lb: { factor: 1.3558179483314 },
    },
  },
  power: {
    base: "W",
    units: {
      W: { factor: 1 },
      kW: { factor: 1000 },
      hp: { factor: 745.6998715822702 },
      btu_h: { factor: 0.29307107 },
      ton_refrigeration: { factor: 3516.85 },
    },
  },
  flow: {
    base: "L/s",
    units: {
      "L/s": { factor: 1 },
      "L/min": { factor: 1 / 60 },
      "m^3/h": { factor: 1000 / 3600 },
      gpm_us: { factor: 0.0630901964 },
      cfm: { factor: 0.471947443 },
      "ft^3/s": { factor: 28.3168466 },
    },
  },
  electrical_voltage: {
    base: "V",
    units: { V: { factor: 1 }, mV: { factor: 0.001 }, kV: { factor: 1000 } },
  },
  electrical_current: {
    base: "A",
    units: { A: { factor: 1 }, mA: { factor: 0.001 }, kA: { factor: 1000 } },
  },
  electrical_resistance: {
    base: "ohm",
    units: { ohm: { factor: 1 }, kohm: { factor: 1000 }, Mohm: { factor: 1e6 } },
  },
  electrical_capacitance: {
    base: "F",
    units: { F: { factor: 1 }, uF: { factor: 1e-6 }, nF: { factor: 1e-9 }, pF: { factor: 1e-12 } },
  },
};

export const TEMPERATURE_UNITS = ["C", "F", "K", "R"];

// dims: in { value: T, from: dimensionless, to: dimensionless } out: { value: T }
export function convertTemperature({ value, from, to }) {
  // To Kelvin
  let K;
  switch (from) {
    case "C": K = value + 273.15; break;
    case "F": K = (value - 32) * 5 / 9 + 273.15; break;
    case "K": K = value; break;
    case "R": K = value * 5 / 9; break;
    default: return { error: "Unknown temperature unit." };
  }
  // From Kelvin
  switch (to) {
    case "C": return { value: K - 273.15 };
    case "F": return { value: (K - 273.15) * 9 / 5 + 32 };
    case "K": return { value: K };
    case "R": return { value: K * 9 / 5 };
    default: return { error: "Unknown temperature unit." };
  }
}

// dims: in { category: dimensionless, value: dimensionless, from: dimensionless, to: dimensionless } out: { value: dimensionless }
export function convertUnit({ category, value, from, to }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (category === "temperature") return convertTemperature({ value, from, to });
  const cat = UNITS[category];
  if (!cat) return { error: "Unknown category." };
  const a = cat.units[from];
  const b = cat.units[to];
  if (!a || !b) return { error: "Unknown unit in category " + category };
  return { value: (value * a.factor) / b.factor };
}

export const unitConverterExample = {
  inputs: { category: "length", value: 100, from: "ft", to: "m" },
  expectedRange: { value: { min: 30.4, max: 30.5 } },
};

// --- Utility 60: Material Cost Estimator ---

// dims: in { unit_price: dimensionless, quantity: dimensionless, tax_rate_percent: dimensionless, delivery_fee: dimensionless } out: { total: dimensionless, tax: dimensionless, subtotal: dimensionless }
export function computeMaterialCost({ unit_price, quantity, tax_rate_percent = 0, delivery_fee = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (quantity < 0 || unit_price < 0) return { error: "Inputs must be non-negative." };
  // DR-24: a negative tax rate or delivery fee drops the total below subtotal.
  if (tax_rate_percent < 0 || delivery_fee < 0) return { error: "Tax rate and delivery fee cannot be negative." };
  const subtotal = unit_price * quantity;
  const tax = subtotal * (tax_rate_percent / 100);
  const total = subtotal + tax + delivery_fee;
  return { subtotal, tax, delivery_fee, total };
}

export const materialCostExample = {
  inputs: { unit_price: 12.50, quantity: 80, tax_rate_percent: 8.25, delivery_fee: 50 },
  expected: { subtotal: 1000 },
};

// --- Utility 61: Markup and Margin ---

// dims: in { cost: dimensionless, mode: dimensionless, value: dimensionless } out: { price: dimensionless, margin: dimensionless }
export function computeMarkup({ cost, mode, value }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (cost <= 0) return { error: "Cost must be positive." };
  if (mode === "markup_percent") {
    const m = value / 100;
    const price = cost * (1 + m);
    const margin = (price - cost) / price * 100;
    return { selling_price: price, markup_percent: value, margin_percent: margin, profit: price - cost };
  }
  if (mode === "margin_percent") {
    const m = value / 100;
    if (m >= 1) return { error: "Margin must be less than 100 percent." };
    const price = cost / (1 - m);
    const markup = (price - cost) / cost * 100;
    return { selling_price: price, margin_percent: value, markup_percent: markup, profit: price - cost };
  }
  if (mode === "selling_price") {
    const price = value;
    if (price <= 0) return { error: "Selling price must be positive." };
    const profit = price - cost;
    return {
      selling_price: price,
      profit,
      markup_percent: (profit / cost) * 100,
      margin_percent: (profit / price) * 100,
    };
  }
  return { error: "Unknown mode." };
}

export const markupExample = {
  inputs: { cost: 100, mode: "markup_percent", value: 50 },
  expected: { selling_price: 150, margin_percent: 33.333 },
};

// --- Utility 62: Time and Materials Estimator ---

// dims: in { hours: T, labor_rate_per_hour: dimensionless, material_cost: dimensionless, overhead_percent: dimensionless, profit_percent: dimensionless } out: { total: dimensionless, labor: dimensionless }
export function computeTimeAndMaterials({ hours, labor_rate_per_hour, material_cost, overhead_percent = 0, profit_percent = 0 }) {
  // DR-23 (D-2/C-1): the solver did its own arithmetic on raw arguments with
  // no coercion and no error branch, so a non-numeric argument made every
  // field NaN and the function never returned {error}. Coerce and validate.
  const h = Number(hours);
  const rate = Number(labor_rate_per_hour);
  const mat = Number(material_cost);
  const oh = Number(overhead_percent);
  const pf = Number(profit_percent);
  if (![h, rate, mat, oh, pf].every(Number.isFinite)) return { error: "All inputs must be numbers." };
  if (h < 0 || rate < 0 || mat < 0 || oh < 0 || pf < 0) return { error: "Inputs cannot be negative." };
  const labor = h * rate;
  const direct = labor + mat;
  const overhead = direct * (oh / 100);
  const subtotal = direct + overhead;
  const profit = subtotal * (pf / 100);
  const total = subtotal + profit;
  return { labor, material_cost: mat, overhead, profit, subtotal, total };
}

export const tmExample = {
  inputs: { hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 },
};

// --- Utility 63: Sales Tax ---
//
// Average combined state and local rates from state revenue department
// publications (data/crosswalks/state-tax-rates.json). Verify locally.

export const STATE_TAX_RATES = {
  AL: 4.0, AK: 0.0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35, DE: 0.0,
  FL: 6.0, GA: 4.0, HI: 4.0, ID: 6.0, IL: 6.25, IN: 7.0, IA: 6.0, KS: 6.5,
  KY: 6.0, LA: 4.45, ME: 5.5, MD: 6.0, MA: 6.25, MI: 6.0, MN: 6.875, MS: 7.0,
  MO: 4.225, MT: 0.0, NE: 5.5, NV: 6.85, NH: 0.0, NJ: 6.625, NM: 4.875, NY: 4.0,
  NC: 4.75, ND: 5.0, OH: 5.75, OK: 4.5, OR: 0.0, PA: 6.0, RI: 7.0, SC: 6.0,
  SD: 4.2, TN: 7.0, TX: 6.25, UT: 6.1, VT: 6.0, VA: 5.3, WA: 6.5, WV: 6.0,
  WI: 5.0, WY: 4.0, DC: 6.0,
};

// dims: in { state: dimensionless, subtotal: dimensionless, custom_rate_percent: dimensionless } out: { tax: dimensionless, total: dimensionless }
export function computeSalesTax({ state, subtotal, custom_rate_percent = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let rate;
  if (custom_rate_percent !== null && custom_rate_percent !== undefined) {
    rate = custom_rate_percent;
  } else {
    rate = STATE_TAX_RATES[state];
    if (rate === undefined) return { error: "Unknown state." };
  }
  const tax = subtotal * (rate / 100);
  return { rate_percent: rate, tax, total: subtotal + tax };
}

export const salesTaxExample = {
  inputs: { state: "TX", subtotal: 1000 },
  expected: { rate_percent: 6.25, tax: 62.5, total: 1062.5 },
};

// --- Utility 64: Tip Out ---

// dims: in { total_amount: dimensionless, members: dimensionless } out: { per_member: dimensionless }
export function computeTipOut({ total_amount, members }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(members) || members.length === 0) return { error: "Provide at least one crew member." };
  const total_hours = members.reduce((s, m) => s + (Number(m.hours) || 0), 0);
  if (total_hours <= 0) return { error: "Total hours must be positive." };
  const splits = members.map((m) => ({
    name: m.name || "(unnamed)",
    hours: Number(m.hours) || 0,
    share: ((Number(m.hours) || 0) / total_hours) * total_amount,
  }));
  return { total_amount, total_hours, splits };
}

export const tipOutExample = {
  inputs: { total_amount: 600, members: [{ name: "A", hours: 8 }, { name: "B", hours: 4 }, { name: "C", hours: 4 }] },
  expected: { A: 300, B: 150, C: 150 },
};

// --- Renderers ---

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { hazenWilliamsFrictionLoss } from "./pure-math.js";

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


// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderUnitConverter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NIST SP 811 unit factors. Temperature handled affinely (C/F/K/R).";
  const categories = Object.keys(UNITS).concat(["temperature"]);
  const cat = makeSelect("Category", "uc-cat", categories.map((c) => ({ value: c, label: c.replace(/_/g, " ") })));
  const v = makeNumber("Value", "uc-v", { step: "any" });
  const fromWrap = document.createElement("div"); inputRegion.appendChild(cat.wrap);
  inputRegion.appendChild(v.wrap);
  inputRegion.appendChild(fromWrap);
  const toWrap = document.createElement("div"); inputRegion.appendChild(toWrap);

  let fromSel = null, toSel = null;
  function refreshSelects() {
    while (fromWrap.firstChild) fromWrap.removeChild(fromWrap.firstChild);
    while (toWrap.firstChild) toWrap.removeChild(toWrap.firstChild);
    const c = cat.select.value;
    const list = c === "temperature" ? TEMPERATURE_UNITS : Object.keys(UNITS[c].units);
    const f = makeSelect("From", "uc-from", list.map((u) => ({ value: u, label: u })));
    const t = makeSelect("To", "uc-to", list.map((u) => ({ value: u, label: u })));
    fromWrap.appendChild(f.wrap); toWrap.appendChild(t.wrap);
    fromSel = f.select; toSel = t.select;
    fromSel.addEventListener("input", update);
    toSel.addEventListener("input", update);
  }
  refreshSelects();
  attachExampleButton(inputRegion, () => { cat.select.value = "length"; refreshSelects(); fromSel.value = "ft"; toSel.value = "m"; v.input.value = "100"; update(); });

  const oOut = makeOutputLine(outputRegion, "Result", "uc-out");
  function update() {
    const r = convertUnit({ category: cat.select.value, value: Number(v.input.value) || 0, from: fromSel.value, to: toSel.value });
    if (r.error) { oOut.textContent = r.error; return; }
    oOut.textContent = fmt(r.value, 6) + " " + toSel.value;
  }
  cat.select.addEventListener("input", () => { refreshSelects(); update(); });
  v.input.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderMaterialCost(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: subtotal = price * quantity; total = subtotal * (1 + tax) + delivery.";
  const p = makeNumber("Unit price ($)", "mc-p", { step: "any", min: "0" });
  const q = makeNumber("Quantity", "mc-q", { step: "any", min: "0" });
  const t = makeNumber("Tax rate (percent)", "mc-t", { step: "any", min: "0", max: "20", value: "0" });
  t.input.value = "0";
  const d = makeNumber("Delivery fee ($)", "mc-d", { step: "any", min: "0", value: "0" });
  d.input.value = "0";
  for (const f of [p, q, t, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "12.50"; q.input.value = "80"; t.input.value = "8.25"; d.input.value = "50"; update(); });
  const oS = makeOutputLine(outputRegion, "Subtotal", "mc-out-s");
  const oT = makeOutputLine(outputRegion, "Tax", "mc-out-t");
  const oTotal = makeOutputLine(outputRegion, "Total", "mc-out-total");
  const update = debounce(() => {
    const r = computeMaterialCost({
      unit_price: Number(p.input.value) || 0,
      quantity: Number(q.input.value) || 0,
      tax_rate_percent: Number(t.input.value) || 0,
      delivery_fee: Number(d.input.value) || 0,
    });
    if (r.error) { oS.textContent = r.error; oT.textContent = "-"; oTotal.textContent = "-"; return; }
    oS.textContent = "$" + fmt(r.subtotal, 2);
    oT.textContent = "$" + fmt(r.tax, 2);
    oTotal.textContent = "$" + fmt(r.total, 2);
  }, DEBOUNCE_MS);
  for (const el of [p.input, q.input, t.input, d.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderMarkup(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: markup = profit / cost; margin = profit / selling price. Bidirectional.";
  const c = makeNumber("Cost ($)", "mu-c", { step: "any", min: "0" });
  const mode = makeSelect("Mode", "mu-m", [
    { value: "markup_percent", label: "Markup percent" },
    { value: "margin_percent", label: "Margin percent" },
    { value: "selling_price", label: "Selling price" },
  ]);
  const v = makeNumber("Value", "mu-v", { step: "any" });
  for (const f of [c, mode, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "100"; mode.select.value = "markup_percent"; v.input.value = "50"; update(); });
  const oP = makeOutputLine(outputRegion, "Selling price", "mu-out-p");
  const oM = makeOutputLine(outputRegion, "Markup", "mu-out-m");
  const oMar = makeOutputLine(outputRegion, "Margin", "mu-out-mar");
  const oProf = makeOutputLine(outputRegion, "Profit", "mu-out-prof");
  const update = debounce(() => {
    const r = computeMarkup({ cost: Number(c.input.value) || 0, mode: mode.select.value, value: Number(v.input.value) || 0 });
    if (r.error) { oP.textContent = r.error; oM.textContent = "-"; oMar.textContent = "-"; oProf.textContent = "-"; return; }
    oP.textContent = "$" + fmt(r.selling_price, 2);
    oM.textContent = fmt(r.markup_percent, 2) + " %";
    oMar.textContent = fmt(r.margin_percent, 2) + " %";
    oProf.textContent = "$" + fmt(r.profit, 2);
  }, DEBOUNCE_MS);
  for (const el of [c.input, mode.select, v.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderTimeAndMaterials(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: total = (hours * rate + material) * (1 + overhead) * (1 + profit).";
  const h = makeNumber("Hours", "tm-h", { step: "any", min: "0" });
  const r = makeNumber("Labor rate ($/hr)", "tm-r", { step: "any", min: "0" });
  const m = makeNumber("Material cost ($)", "tm-m", { step: "any", min: "0", value: "0" });
  m.input.value = "0";
  const o = makeNumber("Overhead (percent)", "tm-o", { step: "any", min: "0", value: "0" });
  o.input.value = "0";
  const pr = makeNumber("Profit (percent)", "tm-pr", { step: "any", min: "0", value: "0" });
  pr.input.value = "0";
  for (const f of [h, r, m, o, pr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "8"; r.input.value = "95"; m.input.value = "250"; o.input.value = "15"; pr.input.value = "10"; update(); });
  const oL = makeOutputLine(outputRegion, "Labor", "tm-out-l");
  const oM = makeOutputLine(outputRegion, "Material", "tm-out-m");
  const oOv = makeOutputLine(outputRegion, "Overhead", "tm-out-o");
  const oP = makeOutputLine(outputRegion, "Profit", "tm-out-p");
  const oT = makeOutputLine(outputRegion, "Total", "tm-out-t");
  const update = debounce(() => {
    const x = computeTimeAndMaterials({
      hours: Number(h.input.value) || 0,
      labor_rate_per_hour: Number(r.input.value) || 0,
      material_cost: Number(m.input.value) || 0,
      overhead_percent: Number(o.input.value) || 0,
      profit_percent: Number(pr.input.value) || 0,
    });
    oL.textContent = "$" + fmt(x.labor, 2);
    oM.textContent = "$" + fmt(x.material_cost, 2);
    oOv.textContent = "$" + fmt(x.overhead, 2);
    oP.textContent = "$" + fmt(x.profit, 2);
    oT.textContent = "$" + fmt(x.total, 2);
  }, DEBOUNCE_MS);
  for (const el of [h.input, r.input, m.input, o.input, pr.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSalesTax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: bundled state revenue department published average combined rates. Verify locally for accuracy.";
  const states = Object.keys(STATE_TAX_RATES).sort();
  const st = makeSelect("State", "sx-st", states.map((s) => ({ value: s, label: s })));
  const sub = makeNumber("Subtotal ($)", "sx-sub", { step: "any", min: "0" });
  const cust = makeNumber("Override rate (percent, optional)", "sx-cust", { step: "any", min: "0", max: "20" });
  for (const f of [st, sub, cust]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { st.select.value = "TX"; sub.input.value = "1000"; cust.input.value = ""; update(); });
  const oR = makeOutputLine(outputRegion, "Tax rate", "sx-out-r");
  const oT = makeOutputLine(outputRegion, "Tax", "sx-out-t");
  const oTotal = makeOutputLine(outputRegion, "Total", "sx-out-total");
  const update = debounce(() => {
    const r = computeSalesTax({
      state: st.select.value,
      subtotal: Number(sub.input.value) || 0,
      custom_rate_percent: cust.input.value === "" ? null : Number(cust.input.value),
    });
    if (r.error) { oR.textContent = r.error; oT.textContent = "-"; oTotal.textContent = "-"; return; }
    oR.textContent = fmt(r.rate_percent, 3) + " %";
    oT.textContent = "$" + fmt(r.tax, 2);
    oTotal.textContent = "$" + fmt(r.total, 2);
  }, DEBOUNCE_MS);
  for (const el of [st.select, sub.input, cust.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderTipOut(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: each member's share = (their hours / total hours) * total amount.";
  const total = makeNumber("Total amount ($)", "to-total", { step: "any", min: "0" });
  inputRegion.appendChild(total.wrap);
  const list = document.createElement("div");
  inputRegion.appendChild(list);
  const addBtn = document.createElement("button");
  addBtn.type = "button"; addBtn.textContent = "Add crew member"; addBtn.style.marginRight = "8px";
  inputRegion.appendChild(addBtn);

  const rows = [];
  function addRow(name = "", hours = "") {
    const row = document.createElement("div"); row.className = "field";
    const n = makeText("Name", "to-n-" + rows.length); n.input.value = name;
    const h = makeNumber("Hours", "to-h-" + rows.length, { step: "any", min: "0" }); h.input.value = hours;
    const rm = document.createElement("button"); rm.type = "button"; rm.textContent = "Remove";
    rm.style.marginLeft = "8px";
    rm.addEventListener("click", () => { row.remove(); const i = rows.indexOf(item); if (i >= 0) rows.splice(i, 1); update(); });
    row.appendChild(n.wrap); row.appendChild(h.wrap); row.appendChild(rm);
    list.appendChild(row);
    const item = { name: n.input, hours: h.input };
    rows.push(item);
    n.input.addEventListener("input", update);
    h.input.addEventListener("input", update);
  }
  addBtn.addEventListener("click", () => { addRow(); update(); });
  attachExampleButton(inputRegion, () => {
    while (rows.length) { rows.pop(); }
    while (list.firstChild) list.removeChild(list.firstChild);
    total.input.value = "600";
    addRow("A", "8"); addRow("B", "4"); addRow("C", "4");
    update();
  });
  addRow("", ""); addRow("", "");

  const summary = document.createElement("div"); outputRegion.appendChild(summary);
  function update() {
    while (summary.firstChild) summary.removeChild(summary.firstChild);
    const members = rows.map((r) => ({ name: r.name.value, hours: Number(r.hours.value) || 0 }));
    const r = computeTipOut({ total_amount: Number(total.input.value) || 0, members });
    if (r.error) {
      const p = document.createElement("p"); p.textContent = r.error; summary.appendChild(p); return;
    }
    const head = document.createElement("p"); head.textContent = "Total: $" + fmt(r.total_amount, 2) + " across " + fmt(r.total_hours, 2) + " hours."; summary.appendChild(head);
    const ul = document.createElement("ul");
    for (const s of r.splits) {
      const li = document.createElement("li"); li.textContent = s.name + ": " + fmt(s.hours, 2) + " hrs -> $" + fmt(s.share, 2);
      ul.appendChild(li);
    }
    summary.appendChild(ul);
  }
  total.input.addEventListener("input", update);
}

// =====================================================================
// v2 utilities (105-113): spec-v2.md section 2 Group G extensions.
// =====================================================================

// --- Utility 105: Loan Payment ---
//
// payment = P * r / (1 - (1+r)^-n), monthly r = APR/12.
// Output amortization first 12 rows for sanity.

// dims: in { principal: dimensionless, apr_percent: dimensionless, term_months: T } out: { payment: dimensionless, total_interest: dimensionless }
export function computeLoanPayment({ principal, apr_percent, term_months }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(principal) || 0;
  const apr = Number(apr_percent) || 0;
  const n = Math.floor(Number(term_months) || 0);
  if (P <= 0 || n <= 0) return { error: "Provide positive principal and term in months." };
  const r = apr / 100 / 12;
  let payment;
  if (r === 0) payment = P / n;
  else payment = (P * r) / (1 - Math.pow(1 + r, -n));
  // First 12 amortization rows.
  const rows = [];
  let balance = P;
  for (let i = 1; i <= Math.min(12, n); i++) {
    const interest = balance * r;
    const principal_paid = payment - interest;
    balance -= principal_paid;
    rows.push({ month: i, payment, interest, principal_paid, balance: Math.max(0, balance) });
  }
  // Total interest over full term (closed form).
  const total_interest = payment * n - P;
  return { monthly_payment: payment, total_interest, first_12_months: rows };
}

export const loanPaymentExample = {
  inputs: { principal: 50000, apr_percent: 6, term_months: 60 },
  expectedRange: { monthly_payment: { min: 950, max: 980 } },
};

// --- Utility 106: Upgrade ROI / Payback ---

// dims: in { incremental_cost: dimensionless, annual_savings: dimensionless, discount_rate_percent: dimensionless, years: T } out: { npv: dimensionless, payback_years: T, irr: dimensionless }
export function computeUpgradeROI({ incremental_cost, annual_savings, discount_rate_percent = 0, years = 10 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const C = Number(incremental_cost) || 0;
  const S = Number(annual_savings) || 0;
  const d = (Number(discount_rate_percent) || 0) / 100;
  const y = Math.floor(Number(years) || 0);
  // Guard the loop bound and discount factor against non-finite inputs:
  // years = Infinity would make `i <= y` loop forever (v18 C-6/D-6).
  if (!Number.isFinite(y) || !Number.isFinite(d)) return { error: "Provide a finite discount rate and term." };
  if (C <= 0 || S <= 0 || y <= 0) return { error: "Provide positive cost, savings, and years." };
  const simple_payback_yr = C / S;
  let npv = -C;
  for (let i = 1; i <= y; i++) {
    npv += S / Math.pow(1 + d, i);
  }
  return { simple_payback_yr, npv_dollars: npv, years: y, discount_rate_percent: d * 100 };
}

export const upgradeROIExample = {
  inputs: { incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 4, years: 10 },
  expectedRange: { simple_payback_yr: { min: 6, max: 7 } },
};

// --- Utility 107: Mileage and Fuel Cost ---

export const IRS_STANDARD_MILEAGE_RATE = 0.67;

// dims: in { round_trip_miles: L, mpg: dimensionless, fuel_price_per_gallon: dimensionless, irs_rate_per_mile: dimensionless } out: { fuel_cost: dimensionless, irs_deduction: dimensionless }
export function computeMileageCost({ round_trip_miles, mpg, fuel_price_per_gallon, irs_rate_per_mile = IRS_STANDARD_MILEAGE_RATE }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const miles = Number(round_trip_miles) || 0;
  const mpg_val = Number(mpg) || 0;
  const price = Number(fuel_price_per_gallon) || 0;
  if (miles <= 0 || mpg_val <= 0 || price <= 0) return { error: "Provide positive miles, mpg, and fuel price." };
  const gallons = miles / mpg_val;
  const fuel_cost = gallons * price;
  const reimbursement = miles * irs_rate_per_mile;
  return { gallons, fuel_cost, reimbursement, irs_rate_per_mile };
}

export const mileageCostExample = {
  inputs: { round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 },
  expected: { gallons: 4, fuel_cost: 16 },
};

// --- Utility 108: Overtime Hours ---

// dims: in { total_hours: T, regular_rate: dimensionless, overtime_multiplier: dimensionless, double_time_multiplier: dimensionless, double_time_threshold_hr: T } out: { gross_pay: dimensionless, overtime_pay: dimensionless }
export function computeOvertime({ total_hours, regular_rate, overtime_multiplier = 1.5, double_time_multiplier = 2.0, double_time_threshold_hr = 60 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(total_hours) || 0;
  const rate = Number(regular_rate) || 0;
  if (h < 0 || rate < 0) return { error: "Hours and rate must be non-negative." };
  const reg_h = Math.min(40, h);
  const ot_h = Math.max(0, Math.min(double_time_threshold_hr, h) - 40);
  const dt_h = Math.max(0, h - double_time_threshold_hr);
  const reg_pay = reg_h * rate;
  const ot_pay = ot_h * rate * overtime_multiplier;
  const dt_pay = dt_h * rate * double_time_multiplier;
  const gross = reg_pay + ot_pay + dt_pay;
  return { regular_hours: reg_h, overtime_hours: ot_h, double_time_hours: dt_h, regular_pay: reg_pay, overtime_pay: ot_pay, double_time_pay: dt_pay, gross_pay: gross };
}

export const overtimeExample = {
  inputs: { total_hours: 50, regular_rate: 30, overtime_multiplier: 1.5, double_time_multiplier: 2.0, double_time_threshold_hr: 60 },
  expected: { gross_pay: 40 * 30 + 10 * 30 * 1.5 },
};

// --- Utility 109: Per-Diem (federal GSA) ---
//
// Bundled rates approximate the GSA standard CONUS rate where state values
// are not specifically published.

export const GSA_PERDIEM_RATES = {
  AL: { lodging: 110, m_and_ie: 64 },
  AK: { lodging: 188, m_and_ie: 79 },
  AZ: { lodging: 124, m_and_ie: 69 },
  AR: { lodging: 110, m_and_ie: 64 },
  CA: { lodging: 168, m_and_ie: 74 },
  CO: { lodging: 142, m_and_ie: 69 },
  CT: { lodging: 142, m_and_ie: 69 },
  DC: { lodging: 257, m_and_ie: 79 },
  DE: { lodging: 124, m_and_ie: 64 },
  FL: { lodging: 134, m_and_ie: 69 },
  GA: { lodging: 124, m_and_ie: 64 },
  HI: { lodging: 215, m_and_ie: 84 },
  ID: { lodging: 110, m_and_ie: 64 },
  IL: { lodging: 158, m_and_ie: 74 },
  IN: { lodging: 110, m_and_ie: 64 },
  IA: { lodging: 110, m_and_ie: 64 },
  KS: { lodging: 110, m_and_ie: 64 },
  KY: { lodging: 110, m_and_ie: 64 },
  LA: { lodging: 124, m_and_ie: 69 },
  ME: { lodging: 134, m_and_ie: 69 },
  MD: { lodging: 158, m_and_ie: 74 },
  MA: { lodging: 188, m_and_ie: 79 },
  MI: { lodging: 124, m_and_ie: 64 },
  MN: { lodging: 134, m_and_ie: 69 },
  MS: { lodging: 110, m_and_ie: 64 },
  MO: { lodging: 110, m_and_ie: 64 },
  MT: { lodging: 110, m_and_ie: 64 },
  NE: { lodging: 110, m_and_ie: 64 },
  NV: { lodging: 142, m_and_ie: 69 },
  NH: { lodging: 134, m_and_ie: 69 },
  NJ: { lodging: 158, m_and_ie: 74 },
  NM: { lodging: 110, m_and_ie: 64 },
  NY: { lodging: 215, m_and_ie: 79 },
  NC: { lodging: 124, m_and_ie: 64 },
  ND: { lodging: 110, m_and_ie: 64 },
  OH: { lodging: 124, m_and_ie: 64 },
  OK: { lodging: 110, m_and_ie: 64 },
  OR: { lodging: 142, m_and_ie: 74 },
  PA: { lodging: 142, m_and_ie: 69 },
  RI: { lodging: 158, m_and_ie: 74 },
  SC: { lodging: 124, m_and_ie: 64 },
  SD: { lodging: 110, m_and_ie: 64 },
  TN: { lodging: 124, m_and_ie: 64 },
  TX: { lodging: 134, m_and_ie: 69 },
  UT: { lodging: 110, m_and_ie: 64 },
  VT: { lodging: 134, m_and_ie: 69 },
  VA: { lodging: 142, m_and_ie: 69 },
  WA: { lodging: 158, m_and_ie: 74 },
  WV: { lodging: 110, m_and_ie: 64 },
  WI: { lodging: 110, m_and_ie: 64 },
  WY: { lodging: 110, m_and_ie: 64 },
};

// dims: in { state: dimensionless, type: dimensionless } out: { rate: dimensionless }
export function computePerDiem({ state, type = "lodging" }) {
  const r = GSA_PERDIEM_RATES[state];
  if (!r) return { error: "Unknown state." };
  if (type === "lodging") return { rate_dollars: r.lodging, type: "lodging", state };
  if (type === "m_and_ie") return { rate_dollars: r.m_and_ie, type: "m_and_ie", state };
  return { error: "Unknown type." };
}

export const perDiemExample = {
  inputs: { state: "DC", type: "lodging" },
  expected: { rate_dollars: 257 },
};

// --- Utility 110: Geometry Pack ---

// dims: in { shape: dimensionless, args: dimensionless } out: { area: L^2, volume: L^3, perimeter: L }
export function computeGeometry({ shape, ...args }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (shape === "circle") {
    const r = Number(args.radius) || 0;
    if (r <= 0) return { error: "Radius must be positive." };
    const sector_deg = Number(args.sector_deg) || 0;
    return {
      circumference: 2 * Math.PI * r,
      area: Math.PI * r * r,
      sector_area: (sector_deg / 360) * Math.PI * r * r,
    };
  }
  if (shape === "ellipse") {
    const a = Number(args.semi_major) || 0;
    const b = Number(args.semi_minor) || 0;
    if (a <= 0 || b <= 0) return { error: "Provide positive semi-axes." };
    const h = Math.pow((a - b) / (a + b), 2);
    const perimeter = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    return { perimeter, area: Math.PI * a * b };
  }
  if (shape === "hexagon") {
    const s = Number(args.side) || 0;
    if (s <= 0) return { error: "Side must be positive." };
    return { area: (3 * Math.sqrt(3) / 2) * s * s, perimeter: 6 * s };
  }
  if (shape === "polygon") {
    const sides = Array.isArray(args.sides) ? args.sides.map(Number) : [];
    if (sides.length === 0 || sides.some((x) => !(x > 0))) return { error: "Provide an array of positive side lengths." };
    return { perimeter: sides.reduce((a, b) => a + b, 0) };
  }
  if (shape === "sphere") {
    const r = Number(args.radius) || 0;
    if (r <= 0) return { error: "Radius must be positive." };
    return { volume: (4 / 3) * Math.PI * Math.pow(r, 3), surface_area: 4 * Math.PI * r * r };
  }
  return { error: "Unknown shape." };
}

export const geometryExample = {
  inputs: { shape: "circle", radius: 10, sector_deg: 90 },
  expectedRange: { area: { min: 313, max: 315 } },
};

// --- Utility 111: Dilution / Mixing Ratio ---

// dims: in { concentrate_percent: dimensionless, target_percent: dimensionless, final_volume: L^3 } out: { concentrate_volume: L^3, water_volume: L^3 }
export function computeDilution({ concentrate_percent, target_percent, final_volume }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const C = Number(concentrate_percent) || 0;
  const T = Number(target_percent) || 0;
  const V = Number(final_volume) || 0;
  if (C <= 0 || T <= 0 || V <= 0) return { error: "Provide positive concentrate, target, and final volume." };
  if (T > C) return { error: "Target strength cannot exceed concentrate strength." };
  const v_concentrate = V * T / C;
  const v_diluent = V - v_concentrate;
  return { concentrate_volume: v_concentrate, diluent_volume: v_diluent };
}

export const dilutionExample = {
  inputs: { concentrate_percent: 100, target_percent: 10, final_volume: 5 },
  expected: { concentrate_volume: 0.5, diluent_volume: 4.5 },
};

// --- Utility 112: Slope from Digital Level ---

// dims: in { value: dimensionless, from: dimensionless } out: { percent: dimensionless, degrees: dimensionless, ratio: dimensionless }
export function computeSlopeFromLevel({ value, from }) {
  const v = Number(value);
  if (!Number.isFinite(v)) return { error: "Provide a numeric value." };
  let degrees;
  if (from === "degrees") degrees = v;
  else if (from === "percent") degrees = Math.atan(v / 100) * 180 / Math.PI;
  else if (from === "in_per_ft") degrees = Math.atan(v / 12) * 180 / Math.PI;
  else return { error: "Unknown 'from' unit." };
  const tan = Math.tan((degrees * Math.PI) / 180);
  return {
    degrees,
    percent: tan * 100,
    in_per_ft: tan * 12,
  };
}

export const slopeFromLevelExample = {
  inputs: { value: 2.0, from: "percent" },
  expectedRange: { degrees: { min: 1.1, max: 1.2 } },
};

// --- Utility 113: GPS Distance (haversine) ---

const EARTH_RADIUS_MI = 3958.8;
const EARTH_RADIUS_KM = 6371.0088;

// dims: in { lat1: dimensionless, lon1: dimensionless, lat2: dimensionless, lon2: dimensionless } out: { distance_mi: L, distance_km: L }
export function computeHaversineDistance({ lat1, lon1, lat2, lon2 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const phi1 = (Number(lat1) || 0) * Math.PI / 180;
  const phi2 = (Number(lat2) || 0) * Math.PI / 180;
  const dphi = phi2 - phi1;
  const dlam = ((Number(lon2) || 0) - (Number(lon1) || 0)) * Math.PI / 180;
  const a = Math.pow(Math.sin(dphi / 2), 2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin(dlam / 2), 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Initial bearing.
  const y = Math.sin(dlam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dlam);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  if (bearing < 0) bearing += 360;
  return {
    miles: EARTH_RADIUS_MI * c,
    kilometers: EARTH_RADIUS_KM * c,
    initial_bearing_deg: bearing,
  };
}

export const haversineExample = {
  inputs: { lat1: 40.7128, lon1: -74.0060, lat2: 34.0522, lon2: -118.2437 },
  expectedRange: { miles: { min: 2440, max: 2460 } },
};

// --- v2 view renderers ---

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLoanPayment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: payment = P*r / (1 - (1+r)^-n) with r = APR/12.";
  const P = makeNumber("Principal", "lp-p", { step: "any", min: "0" });
  const apr = makeNumber("APR (%)", "lp-a", { step: "any", min: "0" });
  const n = makeNumber("Term (months)", "lp-n", { step: "1", min: "1" });
  for (const f of [P, apr, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "50000"; apr.input.value = "6"; n.input.value = "60"; update(); });
  const oM = makeOutputLine(outputRegion, "Monthly payment", "lp-out-m");
  const oI = makeOutputLine(outputRegion, "Total interest", "lp-out-i");
  const update = debounce(() => {
    const r = computeLoanPayment({ principal: Number(P.input.value) || 0, apr_percent: Number(apr.input.value) || 0, term_months: Number(n.input.value) || 0 });
    if (r.error) { oM.textContent = r.error; oI.textContent = "-"; return; }
    oM.textContent = "$" + fmt(r.monthly_payment, 2);
    oI.textContent = "$" + fmt(r.total_interest, 2);
  }, DEBOUNCE_MS);
  for (const el of [P.input, apr.input, n.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderUpgradeROI(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: simple payback = cost / annual savings; NPV sums discounted savings minus cost.";
  const c = makeNumber("Incremental cost", "ur-c", { step: "any", min: "0" });
  const s = makeNumber("Annual savings", "ur-s", { step: "any", min: "0" });
  const d = makeNumber("Discount rate (%)", "ur-d", { step: "any", min: "0", value: "4" });
  d.input.value = "4";
  const y = makeNumber("Years", "ur-y", { step: "1", min: "1", value: "10" });
  y.input.value = "10";
  for (const f of [c, s, d, y]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "5000"; s.input.value = "800"; d.input.value = "4"; y.input.value = "10"; update(); });
  const oP = makeOutputLine(outputRegion, "Simple payback", "ur-out-p");
  const oN = makeOutputLine(outputRegion, "10-year NPV", "ur-out-n");
  const update = debounce(() => {
    const r = computeUpgradeROI({
      incremental_cost: Number(c.input.value) || 0,
      annual_savings: Number(s.input.value) || 0,
      discount_rate_percent: Number(d.input.value) || 0,
      years: Number(y.input.value) || 0,
    });
    if (r.error) { oP.textContent = r.error; oN.textContent = "-"; return; }
    oP.textContent = fmt(r.simple_payback_yr, 2) + " yr";
    oN.textContent = "$" + fmt(r.npv_dollars, 2);
  }, DEBOUNCE_MS);
  for (const el of [c.input, s.input, d.input, y.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderMileageCost(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gallons = miles / mpg; cost = gallons * price; reimbursement = miles * IRS standard rate.";
  const m = makeNumber("Round-trip miles", "mc-m", { step: "any", min: "0" });
  const mpg = makeNumber("MPG", "mc-mpg", { step: "any", min: "0" });
  const p = makeNumber("Fuel price ($/gal)", "mc-p", { step: "any", min: "0" });
  const irs = makeNumber("IRS rate ($/mi)", "mc-irs", { step: "any", min: "0", value: String(IRS_STANDARD_MILEAGE_RATE) });
  irs.input.value = String(IRS_STANDARD_MILEAGE_RATE);
  for (const f of [m, mpg, p, irs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { m.input.value = "100"; mpg.input.value = "25"; p.input.value = "4.0"; irs.input.value = String(IRS_STANDARD_MILEAGE_RATE); update(); });
  const oG = makeOutputLine(outputRegion, "Gallons used", "mc-out-g");
  const oC = makeOutputLine(outputRegion, "Fuel cost", "mc-out-c");
  const oR = makeOutputLine(outputRegion, "IRS reimbursement", "mc-out-r");
  const update = debounce(() => {
    const r = computeMileageCost({
      round_trip_miles: Number(m.input.value) || 0,
      mpg: Number(mpg.input.value) || 0,
      fuel_price_per_gallon: Number(p.input.value) || 0,
      irs_rate_per_mile: Number(irs.input.value) || IRS_STANDARD_MILEAGE_RATE,
    });
    if (r.error) { oG.textContent = r.error; oC.textContent = "-"; oR.textContent = "-"; return; }
    oG.textContent = fmt(r.gallons, 3) + " gal";
    oC.textContent = "$" + fmt(r.fuel_cost, 2);
    oR.textContent = "$" + fmt(r.reimbursement, 2);
  }, DEBOUNCE_MS);
  for (const el of [m.input, mpg.input, p.input, irs.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOvertime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 40 hr regular; OT 1.5x to double-time threshold; double-time 2.0x beyond.";
  const h = makeNumber("Total hours", "ot-h", { step: "any", min: "0" });
  const r = makeNumber("Regular rate ($/hr)", "ot-r", { step: "any", min: "0" });
  const om = makeNumber("OT multiplier", "ot-om", { step: "any", min: "0", value: "1.5" });
  om.input.value = "1.5";
  const dm = makeNumber("Double-time multiplier", "ot-dm", { step: "any", min: "0", value: "2.0" });
  dm.input.value = "2.0";
  const dt = makeNumber("Double-time threshold (hr)", "ot-dt", { step: "any", min: "0", value: "60" });
  dt.input.value = "60";
  for (const f of [h, r, om, dm, dt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "50"; r.input.value = "30"; om.input.value = "1.5"; dm.input.value = "2.0"; dt.input.value = "60"; update(); });
  const oR = makeOutputLine(outputRegion, "Regular pay", "ot-out-r");
  const oO = makeOutputLine(outputRegion, "Overtime pay", "ot-out-o");
  const oD = makeOutputLine(outputRegion, "Double-time pay", "ot-out-d");
  const oG = makeOutputLine(outputRegion, "Gross pay", "ot-out-g");
  const update = debounce(() => {
    const x = computeOvertime({
      total_hours: Number(h.input.value) || 0,
      regular_rate: Number(r.input.value) || 0,
      overtime_multiplier: Number(om.input.value) || 1.5,
      double_time_multiplier: Number(dm.input.value) || 2.0,
      double_time_threshold_hr: Number(dt.input.value) || 60,
    });
    if (x.error) { oR.textContent = x.error; oO.textContent = "-"; oD.textContent = "-"; oG.textContent = "-"; return; }
    oR.textContent = "$" + fmt(x.regular_pay, 2) + " (" + fmt(x.regular_hours, 1) + " hr)";
    oO.textContent = "$" + fmt(x.overtime_pay, 2) + " (" + fmt(x.overtime_hours, 1) + " hr)";
    oD.textContent = "$" + fmt(x.double_time_pay, 2) + " (" + fmt(x.double_time_hours, 1) + " hr)";
    oG.textContent = "$" + fmt(x.gross_pay, 2);
  }, DEBOUNCE_MS);
  for (const el of [h.input, r.input, om.input, dm.input, dt.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPerDiem(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GSA-published per-diem rates (U.S. government publication).";
  const s = makeSelect("State", "pd-s", Object.keys(GSA_PERDIEM_RATES).map((k) => ({ value: k, label: k })));
  const t = makeSelect("Type", "pd-t", [
    { value: "lodging", label: "Lodging" }, { value: "m_and_ie", label: "M&IE" },
  ]);
  for (const f of [s, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { s.select.value = "DC"; t.select.value = "lodging"; update(); });
  const oR = makeOutputLine(outputRegion, "Per-diem rate", "pd-out-r");
  const update = debounce(() => {
    const r = computePerDiem({ state: s.select.value, type: t.select.value });
    if (r.error) { oR.textContent = r.error; return; }
    oR.textContent = "$" + fmt(r.rate_dollars, 0) + " per day (" + r.type + ", " + r.state + ")";
  }, DEBOUNCE_MS);
  for (const el of [s.select, t.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGeometry(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard plane and solid geometry. Ramanujan ellipse perimeter h = ((a-b)/(a+b))^2.";
  const shape = makeSelect("Shape", "g-s", [
    { value: "circle", label: "Circle" },
    { value: "ellipse", label: "Ellipse" },
    { value: "hexagon", label: "Regular hexagon" },
    { value: "sphere", label: "Sphere" },
  ]);
  const a = makeNumber("a (radius / semi-major / side)", "g-a", { step: "any", min: "0" });
  const b = makeNumber("b (semi-minor, ellipse only)", "g-b", { step: "any", min: "0", value: "0" });
  b.input.value = "0";
  const sec = makeNumber("Sector degrees (circle only)", "g-sec", { step: "any", min: "0", max: "360", value: "0" });
  sec.input.value = "0";
  for (const f of [shape, a, b, sec]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { shape.select.value = "circle"; a.input.value = "10"; sec.input.value = "90"; update(); });
  const o1 = makeOutputLine(outputRegion, "Result 1", "g-out-1");
  const o2 = makeOutputLine(outputRegion, "Result 2", "g-out-2");
  const o3 = makeOutputLine(outputRegion, "Result 3", "g-out-3");
  const update = debounce(() => {
    const sh = shape.select.value;
    const aV = Number(a.input.value) || 0, bV = Number(b.input.value) || 0, sV = Number(sec.input.value) || 0;
    let args;
    if (sh === "circle") args = { radius: aV, sector_deg: sV };
    else if (sh === "ellipse") args = { semi_major: aV, semi_minor: bV };
    else if (sh === "hexagon") args = { side: aV };
    else if (sh === "sphere") args = { radius: aV };
    else args = {};
    const r = computeGeometry({ shape: sh, ...args });
    if (r.error) { o1.textContent = r.error; o2.textContent = "-"; o3.textContent = "-"; return; }
    if (sh === "circle") {
      o1.textContent = "Circumference " + fmt(r.circumference, 3);
      o2.textContent = "Area " + fmt(r.area, 3);
      o3.textContent = "Sector area " + fmt(r.sector_area, 3);
    } else if (sh === "ellipse") {
      o1.textContent = "Perimeter " + fmt(r.perimeter, 3);
      o2.textContent = "Area " + fmt(r.area, 3);
      o3.textContent = "-";
    } else if (sh === "hexagon") {
      o1.textContent = "Area " + fmt(r.area, 3);
      o2.textContent = "Perimeter " + fmt(r.perimeter, 3);
      o3.textContent = "-";
    } else if (sh === "sphere") {
      o1.textContent = "Volume " + fmt(r.volume, 3);
      o2.textContent = "Surface area " + fmt(r.surface_area, 3);
      o3.textContent = "-";
    }
  }, DEBOUNCE_MS);
  for (const el of [shape.select, a.input, b.input, sec.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderDilution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: V_concentrate = V_final * C_target / C_concentrate; V_diluent = V_final - V_concentrate.";
  const c = makeNumber("Concentrate strength (%)", "di-c", { step: "any", min: "0", max: "100" });
  const t = makeNumber("Target strength (%)", "di-t", { step: "any", min: "0", max: "100" });
  const v = makeNumber("Final volume", "di-v", { step: "any", min: "0" });
  for (const f of [c, t, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "100"; t.input.value = "10"; v.input.value = "5"; update(); });
  const oC = makeOutputLine(outputRegion, "Concentrate volume", "di-out-c");
  const oD = makeOutputLine(outputRegion, "Diluent volume", "di-out-d");
  const update = debounce(() => {
    const r = computeDilution({
      concentrate_percent: Number(c.input.value) || 0,
      target_percent: Number(t.input.value) || 0,
      final_volume: Number(v.input.value) || 0,
    });
    if (r.error) { oC.textContent = r.error; oD.textContent = "-"; return; }
    oC.textContent = fmt(r.concentrate_volume, 4);
    oD.textContent = fmt(r.diluent_volume, 4);
  }, DEBOUNCE_MS);
  for (const el of [c.input, t.input, v.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSlopeFromLevel(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bidirectional between degrees, percent, and inches per foot. Companion to utility 18.";
  const v = makeNumber("Value", "sl-v", { step: "any" });
  const f = makeSelect("From", "sl-f", [
    { value: "degrees", label: "degrees" },
    { value: "percent", label: "percent" },
    { value: "in_per_ft", label: "in / ft" },
  ]);
  for (const x of [v, f]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { v.input.value = "2.0"; f.select.value = "percent"; update(); });
  const oD = makeOutputLine(outputRegion, "Degrees", "sl-out-d");
  const oP = makeOutputLine(outputRegion, "Percent", "sl-out-p");
  const oI = makeOutputLine(outputRegion, "Inches per foot", "sl-out-i");
  const update = debounce(() => {
    const r = computeSlopeFromLevel({ value: Number(v.input.value), from: f.select.value });
    if (r.error) { oD.textContent = r.error; oP.textContent = "-"; oI.textContent = "-"; return; }
    oD.textContent = fmt(r.degrees, 4);
    oP.textContent = fmt(r.percent, 4);
    oI.textContent = fmt(r.in_per_ft, 4);
  }, DEBOUNCE_MS);
  for (const el of [v.input, f.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderHaversineDistance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Haversine formula. Earth radius 3958.8 mi / 6371.0088 km. Initial bearing from atan2.";
  const a1 = makeNumber("Lat 1", "ha-a1", { step: "any" });
  const o1 = makeNumber("Lon 1", "ha-o1", { step: "any" });
  const a2 = makeNumber("Lat 2", "ha-a2", { step: "any" });
  const o2 = makeNumber("Lon 2", "ha-o2", { step: "any" });
  for (const f of [a1, o1, a2, o2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a1.input.value = "40.7128"; o1.input.value = "-74.0060"; a2.input.value = "34.0522"; o2.input.value = "-118.2437"; update(); });
  const oM = makeOutputLine(outputRegion, "Distance (miles)", "ha-out-m");
  const oK = makeOutputLine(outputRegion, "Distance (km)", "ha-out-k");
  const oB = makeOutputLine(outputRegion, "Initial bearing", "ha-out-b");
  const update = debounce(() => {
    const r = computeHaversineDistance({
      lat1: Number(a1.input.value) || 0, lon1: Number(o1.input.value) || 0,
      lat2: Number(a2.input.value) || 0, lon2: Number(o2.input.value) || 0,
    });
    oM.textContent = fmt(r.miles, 2);
    oK.textContent = fmt(r.kilometers, 2);
    oB.textContent = fmt(r.initial_bearing_deg, 2);
  }, DEBOUNCE_MS);
  for (const el of [a1.input, o1.input, a2.input, o2.input]) el.addEventListener("input", update);
}

// =====================================================================
// v3 utilities (162 through 173, except meta-utilities 170 and 172
// which live in app.js because they roll up existing state).
// See spec-v3.md section 2.7.
// =====================================================================

// --- Utility 162: OSHA Trench Sloping ---

export const TRENCH_SLOPES = {
  A: { ratio: "0.75:1", H_to_V: 0.75, label: "Type A (cohesive, stable)" },
  B: { ratio: "1:1", H_to_V: 1.0, label: "Type B (cohesive, less stable)" },
  C: { ratio: "1.5:1", H_to_V: 1.5, label: "Type C (granular or wet)" },
};

// dims: in { depth_ft: L, soil_class: dimensionless, surcharge: dimensionless } out: { setback_ft: L, slope_ratio: dimensionless }
export function computeTrenchSlope({ depth_ft = 0, soil_class = "B", surcharge = false }) {
  const sc = TRENCH_SLOPES[soil_class];
  if (!sc) return { error: "Unknown soil class." };
  if (!(depth_ft > 0)) return { error: "Depth must be positive." };
  if (depth_ft > 20) return { error: "Trenches deeper than 20 ft require a registered professional engineer's design." };
  if (surcharge) return { error: "Surcharge loads near the trench void the simple slope tables (29 CFR 1926 Subpart P, Appendix B); a registered professional engineer must design the protective system." };
  const max_horizontal_ft = depth_ft * sc.H_to_V;
  const top_width_ft = 2 * max_horizontal_ft + 2; // 2 ft baseline trench bottom width
  // Benching geometry: vertical bench of 4 ft max in Type A/B with sloped portion above.
  const bench_height_ft = soil_class === "C" ? 0 : Math.min(4, depth_ft);
  return { ratio: sc.ratio, max_horizontal_ft, top_width_ft, bench_height_ft, label: sc.label };
}

export const trenchSlopeExample = { inputs: { depth_ft: 8, soil_class: "B", surcharge: false } };

// --- Utility 163: NIOSH Lifting Equation (1991) ---

export const NIOSH_COUPLING = { good: 1.0, fair: 0.95, poor: 0.90 };
export const NIOSH_LC_LB = 51;

// dims: in { load_lb: M, h_in: L, v_in: L, d_in: L, a_deg: dimensionless, f: T^-1, c: dimensionless } out: { rwl_lb: M, li: dimensionless }
export function computeNIOSHLifting({
  weight_lb = 0, H_in = 10, V_in = 30, D_in = 0,
  asymmetry_deg = 0, frequency_per_min = 1, duration_hr = 1, coupling = "good",
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(weight_lb >= 0)) return { error: "Weight must be non-negative." };
  if (!(H_in >= 10 && H_in <= 25)) return { error: "Horizontal distance must be 10-25 in." };
  if (!(V_in >= 0 && V_in <= 70)) return { error: "Vertical lift origin must be 0-70 in." };
  if (!(D_in >= 0)) return { error: "Vertical travel distance must be non-negative." };
  if (!(asymmetry_deg >= 0 && asymmetry_deg <= 135)) return { error: "Asymmetry must be 0-135 deg." };
  if (!(frequency_per_min >= 0)) return { error: "Frequency must be non-negative." };
  const cm = NIOSH_COUPLING[coupling];
  if (!Number.isFinite(cm)) return { error: "Unknown coupling category." };
  // Multipliers per NIOSH 1991 publication.
  const HM = 10 / H_in;
  const VM = 1 - 0.0075 * Math.abs(V_in - 30);
  const DM = D_in <= 0 ? 1 : 0.82 + 1.8 / D_in;
  const AM = 1 - 0.0032 * asymmetry_deg;
  // Frequency multiplier (very rough piecewise). Public NIOSH FM-table approximation:
  let FM;
  if (frequency_per_min <= 0.2) FM = 1.0;
  else if (frequency_per_min <= 1) FM = duration_hr <= 1 ? 0.94 : (duration_hr <= 2 ? 0.88 : 0.75);
  else if (frequency_per_min <= 4) FM = duration_hr <= 1 ? 0.84 : (duration_hr <= 2 ? 0.72 : 0.55);
  else if (frequency_per_min <= 9) FM = duration_hr <= 1 ? 0.52 : (duration_hr <= 2 ? 0.45 : 0.27);
  else FM = 0.0;
  const RWL = NIOSH_LC_LB * HM * VM * DM * AM * FM * cm;
  const LI = weight_lb > 0 && RWL > 0 ? weight_lb / RWL : null;
  return { RWL_lb: RWL, LI, multipliers: { HM, VM, DM, AM, FM, CM: cm } };
}

export const nioshLiftingExample = {
  inputs: { weight_lb: 30, H_in: 12, V_in: 30, D_in: 20, asymmetry_deg: 0, frequency_per_min: 1, duration_hr: 1, coupling: "good" },
};

// --- Utility 164: Heat Stress (NWS Rothfusz heat index + WBGT approx + work/rest) ---

// dims: in { T_F: T, RH_percent: dimensionless, solar: dimensionless } out: { heat_index_F: T, band: dimensionless }
export function computeHeatStress({ T_F = 0, RH_percent = 0, solar = false }) {
  if (!(T_F >= -50 && T_F <= 200)) return { error: "Temperature out of range." };
  if (!(RH_percent >= 0 && RH_percent <= 100)) return { error: "RH must be 0-100." };
  // Rothfusz simple form (US units), valid for T >= 80 F.
  let HI;
  if (T_F < 80) HI = T_F;
  else {
    const T = T_F, R = RH_percent;
    HI = -42.379 + 2.04901523 * T + 10.14333127 * R
      - 0.22475541 * T * R - 0.00683783 * T * T - 0.05481717 * R * R
      + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
  }
  // Approx WBGT outdoors (public approximation): WBGT = 0.7 * Twb + 0.2 * Tg + 0.1 * Tdb;
  // simplify with Twb ~= T - (1 - RH/100) * 30 (rough), Tg ~= T + (solar ? 15 : 5).
  const Twb = T_F - (1 - RH_percent / 100) * 30;
  const Tg = T_F + (solar ? 15 : 5);
  const WBGT_F = 0.7 * Twb + 0.2 * Tg + 0.1 * T_F;
  // Work/rest cycle minutes per OSHA-published guidance (rough piecewise).
  let work_min = 60, rest_min = 0;
  if (WBGT_F >= 90) { work_min = 15; rest_min = 45; }
  else if (WBGT_F >= 86) { work_min = 30; rest_min = 30; }
  else if (WBGT_F >= 82) { work_min = 45; rest_min = 15; }
  return { heat_index_F: HI, WBGT_F, work_min_per_hr: work_min, rest_min_per_hr: rest_min };
}

export const heatStressExample = { inputs: { T_F: 92, RH_percent: 70, solar: true } };

// --- Utility 165: Wind Chill Exposure ---

// dims: in { T_F: T, wind_mph: L T^-1 } out: { wind_chill_F: T, band: dimensionless }
export function computeWindChill({ T_F = 0, wind_mph = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (T_F > 50) return { error: "Wind chill formula valid for T <= 50 F." };
  if (wind_mph < 3) return { wind_chill_F: T_F, frostbite_minutes: null, note: "Wind below 3 mph; ambient temperature applies." };
  // NWS 2001 formula:
  const WC = 35.74 + 0.6215 * T_F - 35.75 * Math.pow(wind_mph, 0.16) + 0.4275 * T_F * Math.pow(wind_mph, 0.16);
  // Frostbite times (NWS published curves, rough piecewise):
  let frostbite_minutes;
  if (WC > -20) frostbite_minutes = 30;
  else if (WC > -45) frostbite_minutes = 10;
  else if (WC > -55) frostbite_minutes = 5;
  else frostbite_minutes = 2;
  return { wind_chill_F: WC, frostbite_minutes };
}

export const windChillExample = { inputs: { T_F: 5, wind_mph: 25 } };

// --- Utility 166: Ladder Placement Angle ---

// dims: in { ladder_length_ft: L, working_height_ft: L } out: { angle_deg: dimensionless, base_distance_ft: L }
export function computeLadderAngle({ ladder_length_ft = 0, working_height_ft = 0 }) {
  if (!(ladder_length_ft > 0)) return { error: "Ladder length must be positive." };
  if (!(working_height_ft >= 0 && working_height_ft <= ladder_length_ft)) return { error: "Working height must be 0..ladder length." };
  // Published 4:1 rule: recommended base distance = working_height / 4.
  const recommended_base_ft = working_height_ft / 4;
  // Actual lean angle the ladder makes for the given length and working height:
  // sin(angle) = working_height / ladder_length.
  const actual_angle_deg = working_height_ft === 0 ? 0 : (Math.asin(Math.min(1, working_height_ft / ladder_length_ft)) * 180) / Math.PI;
  // Pass/fail at 75.5 deg +/- 3 deg (working height 0 = laying flat = fail).
  const pass = working_height_ft === 0 ? false : Math.abs(actual_angle_deg - 75.5) <= 3;
  return { base_distance_ft: recommended_base_ft, set_angle_deg: actual_angle_deg, pass };
}

// Example chosen so the ladder is leaned correctly at ~75.5 deg:
// sin(75.5 deg) = 0.968, so a 24 ft ladder reaches ~23.2 ft when set right.
export const ladderAngleExample = { inputs: { ladder_length_ft: 24, working_height_ft: 23 } };

// --- Utility 167: Pulley System Mechanical Advantage (general) ---

export const PULLEY_RIGS = {
  fixed_1: { ma: 1, pulleys: 1 },
  movable_2: { ma: 2, pulleys: 1 },
  block_2: { ma: 2, pulleys: 2 },
  block_3: { ma: 3, pulleys: 3 },
  block_4: { ma: 4, pulleys: 4 },
  block_5: { ma: 5, pulleys: 5 },
  block_6: { ma: 6, pulleys: 6 },
};

// dims: in { rig: dimensionless, efficiency: dimensionless } out: { theoretical_ma: dimensionless, actual_ma: dimensionless }
export function computePulleyMA({ rig = "block_2", efficiency = 0.95 }) {
  const r = PULLEY_RIGS[rig];
  if (!r) return { error: "Unknown rig." };
  if (!(efficiency > 0 && efficiency <= 1)) return { error: "Efficiency must be 0..1." };
  const actual = r.ma * Math.pow(efficiency, r.pulleys);
  return { theoretical_ma: r.ma, actual_ma: actual, pulleys: r.pulleys };
}

export const pulleyMAExample = { inputs: { rig: "block_3", efficiency: 0.95 } };

// --- Utility 168: Ramp Slope (ADA) ---

// dims: in { rise_in: L, run_in: L } out: { slope_percent: dimensionless, slope_degrees: dimensionless, ratio: dimensionless }
export function computeRampSlope({ rise_in = 0, run_in = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Both rise and run must be strictly positive: a zero rise made the ratio
  // run/rise = Infinity, which the renderer painted as "Slope ratio: Infinity:1"
  // (a degenerate-input render leak the §5.4 clear-each-input sweep caught).
  if (!(rise_in > 0 && run_in > 0)) return { error: "Provide positive rise and run." };
  const ratio = run_in / rise_in;
  const percent = (rise_in / run_in) * 100;
  const pass = ratio >= 12;
  return { ratio: ratio.toFixed(2) + ":1", percent, pass_1_to_12: pass };
}

export const rampSlopeExample = { inputs: { rise_in: 6, run_in: 72 } };

// --- Utility 169: Rainwater Harvesting Yield ---

// dims: in { catchment_ft2: L^2, monthly_in: L, annual_in: L, efficiency: dimensionless } out: { gallons: L^3 }
export function computeRainwaterYield({ catchment_ft2 = 0, monthly_in = [], annual_in = null, efficiency = 0.62 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(catchment_ft2 > 0)) return { error: "Catchment area must be positive." };
  // gallons = area_ft2 * rainfall_in * 0.6233 (rainfall * area conversion at 100% efficiency).
  // Adjusting: 1 inch over 1 ft^2 ~ 0.6233 gal; multiply by efficiency.
  const conv = 0.6233 * efficiency;
  if (annual_in !== null && annual_in !== undefined) {
    if (!(annual_in >= 0)) return { error: "Annual rainfall must be non-negative." };
    return { annual_gal: catchment_ft2 * annual_in * conv, monthly_gal: null };
  }
  if (!Array.isArray(monthly_in)) return { error: "Monthly rainfall must be a list." };
  const monthly_gal = monthly_in.map((r) => catchment_ft2 * (Number(r) || 0) * conv);
  const annual_gal = monthly_gal.reduce((a, b) => a + b, 0);
  return { monthly_gal, annual_gal };
}

export const rainwaterYieldExample = {
  inputs: { catchment_ft2: 1500, monthly_in: [3, 3, 4, 4, 4, 3, 2, 2, 2, 3, 4, 4], efficiency: 0.62 },
};

// --- spec-v675: catchment area for a target rainwater harvest (inverse of rainwater-yield) ---
// dims: in { target_annual_gal: L^3, annual_in: L, efficiency: dimensionless } out: { catchment_ft2: L^2 }
export function computeRainwaterCatchmentArea({ target_annual_gal = 0, annual_in = 0, efficiency = 0.62 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const target = Number(target_annual_gal) || 0;
  const rain = Number(annual_in) || 0;
  const eff = (efficiency === undefined || efficiency === null || efficiency === "") ? 0.62 : Number(efficiency);
  if (!(target > 0)) return { error: "Target annual harvest must be positive (gal)." };
  if (!(rain > 0)) return { error: "Annual rainfall must be positive (in)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Collection efficiency must be over 0 and up to 1." };
  // Inverse of annual_gal = area x annual_in x 0.6233 x efficiency: area = target / (annual_in x 0.6233 x efficiency).
  const catchment_ft2 = target / (rain * 0.6233 * eff);
  if (!Number.isFinite(catchment_ft2) || !(catchment_ft2 > 0)) return { error: "Catchment-area math is not a finite positive value." };
  return {
    catchment_ft2,
    note: "The catchment (roof) area needed to harvest a target volume of rainwater a year, the inverse of the rainwater-yield tile: area = target_gal / (annual_in x 0.6233 x efficiency). The 0.6233 converts one inch of rain over one square foot to gallons; efficiency (about 0.62 for a sloped roof, higher for metal) accounts for first-flush, splash, and evaporation losses. The area is the horizontal footprint the rain falls on, not the sloped surface. A planning estimate; local rainfall records, the storage tank size, and the demand pattern govern the real system."
  };
}
export const rainwaterCatchmentAreaExample = { inputs: { target_annual_gal: 11593, annual_in: 30, efficiency: 0.62 } };

// --- Utility 171: Daily Multi-Job Timesheet ---

// dims: in { jobs: dimensionless, regular_rate: dimensionless, weekly_overtime_threshold_hr: T, irs_rate_per_mile: dimensionless } out: { gross_pay: dimensionless, overtime_pay: dimensionless, mileage_deduction: dimensionless }
export function computeTimesheet({ jobs = [], regular_rate = 0, weekly_overtime_threshold_hr = 40, irs_rate_per_mile = IRS_STANDARD_MILEAGE_RATE }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(jobs) || jobs.length === 0) return { error: "Provide at least one job." };
  if (!(regular_rate >= 0)) return { error: "Regular rate must be non-negative." };
  let total_hours = 0;
  let total_miles = 0;
  const job_results = [];
  for (const j of jobs) {
    const start = Number(j.start_hr) || 0;
    const end = Number(j.end_hr) || 0;
    const lunch = Number(j.lunch_min) || 0;
    const miles = Number(j.miles) || 0;
    if (end < start) return { error: "Job end must be >= start." };
    const hours = Math.max(0, (end - start) - lunch / 60);
    job_results.push({ hours, miles });
    total_hours += hours;
    total_miles += miles;
  }
  const ot = Math.max(0, total_hours - weekly_overtime_threshold_hr);
  const reg = total_hours - ot;
  const gross_pay = reg * regular_rate + ot * regular_rate * 1.5;
  const reimbursable = total_miles * irs_rate_per_mile;
  return {
    total_hours, regular_hours: reg, overtime_hours: ot, gross_pay,
    total_miles, reimbursable,
    job_results,
  };
}

export const timesheetExample = {
  inputs: {
    jobs: [
      { start_hr: 8, end_hr: 12, lunch_min: 0, miles: 10 },
      { start_hr: 13, end_hr: 17, lunch_min: 0, miles: 5 },
    ],
    regular_rate: 35,
  },
};

// --- Utility 173: Vehicle Load Distribution ---

// dims: in { wheelbase_in: L, payload_lb: M, payload_position_from_cab_in: L, gvwr_lb: M, front_gawr_lb: M, rear_gawr_lb: M, curb_front_lb: M, curb_rear_lb: M } out: { front_axle_lb: M, rear_axle_lb: M, gvw_lb: M, pass: dimensionless }
export function computeVehicleLoad({ wheelbase_in = 0, payload_lb = 0, payload_position_from_cab_in = 0, gvwr_lb = null, front_gawr_lb = null, rear_gawr_lb = null, curb_front_lb = 0, curb_rear_lb = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wheelbase_in > 0)) return { error: "Wheelbase must be positive." };
  if (!(payload_lb >= 0)) return { error: "Payload must be non-negative." };
  if (!(payload_position_from_cab_in >= 0)) return { error: "Payload position must be non-negative." };
  // Static balance: rear axle load = payload * (position / wheelbase); front = payload - rear.
  const payload_to_rear = payload_lb * (payload_position_from_cab_in / wheelbase_in);
  const payload_to_front = payload_lb - payload_to_rear;
  const front_total = curb_front_lb + payload_to_front;
  const rear_total = curb_rear_lb + payload_to_rear;
  const gross = front_total + rear_total;
  const flags = {
    over_gvwr: gvwr_lb !== null && gross > gvwr_lb,
    over_front_gawr: front_gawr_lb !== null && front_total > front_gawr_lb,
    over_rear_gawr: rear_gawr_lb !== null && rear_total > rear_gawr_lb,
  };
  return { front_axle_lb: front_total, rear_axle_lb: rear_total, gross_lb: gross, flags };
}

export const vehicleLoadExample = {
  inputs: { wheelbase_in: 140, payload_lb: 1500, payload_position_from_cab_in: 84, gvwr_lb: 9500, front_gawr_lb: 4500, rear_gawr_lb: 6200, curb_front_lb: 3200, curb_rear_lb: 2400 },
};

// --- v3 renderers (compact) ---

import {
  DEBOUNCE_MS as _DG, debounce as _debG, makeNumber as _mnG, makeSelect as _msG, makeCheckbox as _mcG,
  makeOutputLine as _moG, attachExampleButton as _aeG, fmt as _fmtG,
} from "./ui-fields.js";

function _simpleRendererG(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    _aeG(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = _msG(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = _mcG(f.label, f.id || f.key);
      else field = _mnG(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = _moG(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = _debG(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, _DG);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
    }
  };
}

const renderTrenchSlope = _simpleRendererG({
  citation: "Notice: AHJ and competent person govern. This is a math aid. Citation: 29 CFR 1926 Subpart P by section number only.",
  example: trenchSlopeExample.inputs,
  fields: [
    { key: "depth_ft", label: "Trench depth (ft)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "soil_class", label: "Soil class", kind: "select", options: [{ value: "A", label: "Type A (cohesive)" }, { value: "B", label: "Type B" }, { value: "C", label: "Type C (granular/wet)" }] },
    { key: "surcharge", label: "Surcharge near trench", kind: "checkbox" },
  ],
  outputs: [
    { key: "r", id: "tr-out-r", label: "Maximum slope (H:V)", value: (r) => r.ratio },
    { key: "h", id: "tr-out-h", label: "Setback per side", value: (r) => _fmtG(r.max_horizontal_ft, 2) + " ft" },
    { key: "w", id: "tr-out-w", label: "Top width (2 ft floor)", value: (r) => _fmtG(r.top_width_ft, 2) + " ft" },
    { key: "b", id: "tr-out-b", label: "Bench height", value: (r) => _fmtG(r.bench_height_ft, 1) + " ft" },
  ],
  compute: computeTrenchSlope,
});

const renderNIOSHLifting = _simpleRendererG({
  citation: "Citation: NIOSH 1991 Lifting Equation by publication name. RWL = LC * HM * VM * DM * AM * FM * CM.",
  example: nioshLiftingExample.inputs,
  fields: [
    { key: "weight_lb", label: "Load weight (lb)", kind: "number" },
    { key: "H_in", label: "Horizontal distance H (in)", kind: "number" },
    { key: "V_in", label: "Origin height V (in)", kind: "number" },
    { key: "D_in", label: "Vertical travel D (in)", kind: "number" },
    { key: "asymmetry_deg", label: "Asymmetry angle (deg)", kind: "number" },
    { key: "frequency_per_min", label: "Lifts per minute", kind: "number", default: 1 },
    { key: "duration_hr", label: "Duration (hr)", kind: "number", default: 1 },
    { key: "coupling", label: "Coupling", kind: "select", options: [{ value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" }] },
  ],
  outputs: [
    { key: "r", id: "ni-out-r", label: "RWL", value: (r) => _fmtG(r.RWL_lb, 1) + " lb" },
    { key: "l", id: "ni-out-l", label: "Lifting Index", value: (r) => r.LI === null ? "-" : _fmtG(r.LI, 2) },
  ],
  compute: computeNIOSHLifting,
});

const renderHeatStress = _simpleRendererG({
  citation: "Citation: NWS Rothfusz heat index; WBGT public approximation; OSHA work/rest cycle guidance generally.",
  example: heatStressExample.inputs,
  fields: [
    { key: "T_F", label: "Dry-bulb temp (F)", kind: "number" },
    { key: "RH_percent", label: "Relative humidity (%)", kind: "number" },
    { key: "solar", label: "Direct sun exposure", kind: "checkbox" },
  ],
  outputs: [
    { key: "hi", id: "hs-out-hi", label: "Heat index", value: (r) => _fmtG(r.heat_index_F, 1) + " F" },
    { key: "wb", id: "hs-out-wb", label: "WBGT (approx)", value: (r) => _fmtG(r.WBGT_F, 1) + " F" },
    { key: "wr", id: "hs-out-wr", label: "Work / rest", value: (r) => r.work_min_per_hr + " / " + r.rest_min_per_hr + " min" },
  ],
  compute: computeHeatStress,
});

const renderWindChill = _simpleRendererG({
  citation: "Citation: NWS 2001 wind chill formula; frostbite-time piecewise from public NWS exposure curves.",
  example: windChillExample.inputs,
  fields: [
    { key: "T_F", label: "Ambient temp (F)", kind: "number" },
    { key: "wind_mph", label: "Wind (mph)", kind: "number" },
  ],
  outputs: [
    { key: "wc", id: "wc-out-wc", label: "Wind chill", value: (r) => _fmtG(r.wind_chill_F, 1) + " F" },
    { key: "fb", id: "wc-out-fb", label: "Time to frostbite", value: (r) => r.frostbite_minutes === null ? "n/a" : r.frostbite_minutes + " min" },
  ],
  compute: computeWindChill,
});

const renderLadderAngle = _simpleRendererG({
  citation: "Citation: OSHA 1926.1053 by section number only. 4:1 rule; pass/fail at 75.5 deg +/- 3 deg.",
  example: ladderAngleExample.inputs,
  fields: [
    { key: "ladder_length_ft", label: "Ladder length (ft)", kind: "number" },
    { key: "working_height_ft", label: "Working height (ft)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "la-out-b", label: "Base distance", value: (r) => _fmtG(r.base_distance_ft, 2) + " ft" },
    { key: "a", id: "la-out-a", label: "Set angle", value: (r) => _fmtG(r.set_angle_deg, 1) + " deg" },
    { key: "p", id: "la-out-p", label: "Pass / fail", value: (r) => r.pass ? "pass" : "fail (target 75.5 deg)" },
  ],
  compute: computeLadderAngle,
});

const renderPulleyMAGen = _simpleRendererG({
  citation: "Citation: Public mechanics. actual_MA = theoretical_MA * efficiency^pulleys.",
  example: pulleyMAExample.inputs,
  fields: [
    { key: "rig", label: "Rig", kind: "select", options: Object.keys(PULLEY_RIGS).map((k) => ({ value: k, label: k })) },
    { key: "efficiency", label: "Pulley efficiency (0-1)", kind: "number", default: 0.95 },
  ],
  outputs: [
    { key: "t", id: "pm-out-t", label: "Theoretical MA", value: (r) => String(r.theoretical_ma) },
    { key: "a", id: "pm-out-a", label: "Actual MA", value: (r) => _fmtG(r.actual_ma, 2) },
  ],
  compute: computePulleyMA,
});

const renderRampSlope = _simpleRendererG({
  citation: "Citation: Public 1:12 maximum (ADA reference). Companion to slope utility.",
  example: rampSlopeExample.inputs,
  fields: [
    { key: "rise_in", label: "Rise (in)", kind: "number" },
    { key: "run_in", label: "Run (in)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "rs-out-r", label: "Slope ratio", value: (r) => r.ratio },
    { key: "p", id: "rs-out-p", label: "Slope %", value: (r) => _fmtG(r.percent, 2) + " %" },
    { key: "f", id: "rs-out-f", label: "Pass 1:12", value: (r) => r.pass_1_to_12 ? "pass" : "fail" },
  ],
  compute: computeRampSlope,
});

function renderRainwaterYield(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public engineering form gallons = area * rainfall * 0.6233 * efficiency. Default efficiency 0.62 for sloped roofs.";
  _aeG(inputRegion, () => fillExample(rainwaterYieldExample.inputs));
  const a = _mnG("Catchment area (ft^2)", "rw-a", { step: "any", min: "0" });
  const e = _mnG("Collection efficiency (0-1)", "rw-e", { step: "any", min: "0", max: "1", value: "0.62" });
  e.input.value = "0.62";
  const an = _mnG("Annual rainfall (in)", "rw-an", { step: "any", min: "0" });
  for (const f of [a, e, an]) inputRegion.appendChild(f.wrap);
  const oA = _moG(outputRegion, "Annual yield", "rw-out-a");
  function fillExample(v) {
    a.input.value = v.catchment_ft2; e.input.value = v.efficiency;
    if (v.annual_in !== undefined && v.annual_in !== null) an.input.value = v.annual_in;
    else an.input.value = (v.monthly_in || []).reduce((s, x) => s + x, 0);
    update();
  }
  const update = _debG(() => {
    const r = computeRainwaterYield({ catchment_ft2: Number(a.input.value) || 0, efficiency: Number(e.input.value) || 0.62, annual_in: Number(an.input.value) || 0 });
    if (r.error) { oA.textContent = r.error; return; }
    oA.textContent = _fmtG(r.annual_gal, 0) + " gal";
  }, _DG);
  for (const el of [a.input, e.input, an.input]) el.addEventListener("input", update);
}

function renderRainwaterCatchmentArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: public engineering form solved for area: area = target_gal / (annual_in * 0.6233 * efficiency), from gallons = area * rainfall * 0.6233 * efficiency. Default efficiency 0.62 for sloped roofs. A planning estimate; local rainfall, storage, and demand govern.";
  _aeG(inputRegion, () => { g.input.value = "11593"; an.input.value = "30"; e.input.value = "0.62"; update(); });
  const g = _mnG("Target annual harvest (gal)", "rwca-g", { step: "any", min: "0" });
  const an = _mnG("Annual rainfall (in)", "rwca-an", { step: "any", min: "0" });
  const e = _mnG("Collection efficiency (0-1)", "rwca-e", { step: "any", min: "0", max: "1", value: "0.62" });
  e.input.value = "0.62";
  for (const f of [g, an, e]) inputRegion.appendChild(f.wrap);
  const oA = _moG(outputRegion, "Catchment area needed", "rwca-out-a");
  const oN = _moG(outputRegion, "Note", "rwca-out-n");
  const update = _debG(() => {
    const r = computeRainwaterCatchmentArea({ target_annual_gal: Number(g.input.value) || 0, annual_in: Number(an.input.value) || 0, efficiency: e.input.value === "" ? 0.62 : Number(e.input.value) });
    if (r.error) { oA.textContent = r.error; oN.textContent = ""; return; }
    oA.textContent = _fmtG(r.catchment_ft2, 0) + " ft^2";
    oN.textContent = r.note;
  }, _DG);
  for (const el of [g.input, an.input, e.input]) el.addEventListener("input", update);
}

function renderTimesheet(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard payroll math; reuses overtime utility logic and IRS standard mileage rate.";
  _aeG(inputRegion, () => fillExample(timesheetExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const s = document.createElement("input"); s.type = "number"; s.step = "any"; s.inputMode = "decimal"; s.placeholder = "Start (hr 0-24)"; s.setAttribute("aria-label", "Day " + (i + 1) + " start hour");
    const e = document.createElement("input"); e.type = "number"; e.step = "any"; e.inputMode = "decimal"; e.placeholder = "End (hr 0-24)"; e.setAttribute("aria-label", "Day " + (i + 1) + " end hour");
    const l = document.createElement("input"); l.type = "number"; l.step = "any"; l.min = "0"; l.inputMode = "decimal"; l.placeholder = "Lunch (min)"; l.setAttribute("aria-label", "Day " + (i + 1) + " lunch minutes");
    const m = document.createElement("input"); m.type = "number"; m.step = "any"; m.min = "0"; m.inputMode = "decimal"; m.placeholder = "Miles"; m.setAttribute("aria-label", "Day " + (i + 1) + " miles driven");
    wrap.appendChild(s); wrap.appendChild(e); wrap.appendChild(l); wrap.appendChild(m);
    list.appendChild(wrap);
    [s, e, l, m].forEach((el) => el.addEventListener("input", update));
    rows.push({ s, e, l, m });
  }
  const rate = _mnG("Hourly rate ($)", "ts-rate", { step: "any", min: "0" });
  inputRegion.appendChild(rate.wrap);
  const oH = _moG(outputRegion, "Total hours", "ts-out-h");
  const oR = _moG(outputRegion, "Reg / OT", "ts-out-r");
  const oP = _moG(outputRegion, "Gross pay", "ts-out-p");
  const oM = _moG(outputRegion, "Reimbursable miles", "ts-out-m");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      const j = v.jobs[i];
      if (j) { rows[i].s.value = j.start_hr; rows[i].e.value = j.end_hr; rows[i].l.value = j.lunch_min; rows[i].m.value = j.miles; }
    }
    rate.input.value = v.regular_rate;
    update();
  }
  function update() {
    const jobs = rows.map((r) => ({ start_hr: Number(r.s.value) || 0, end_hr: Number(r.e.value) || 0, lunch_min: Number(r.l.value) || 0, miles: Number(r.m.value) || 0 })).filter((j) => j.end_hr > j.start_hr);
    if (jobs.length === 0) { oH.textContent = "-"; oR.textContent = "-"; oP.textContent = "-"; oM.textContent = "-"; return; }
    const r = computeTimesheet({ jobs, regular_rate: Number(rate.input.value) || 0 });
    if (r.error) { oH.textContent = r.error; return; }
    oH.textContent = _fmtG(r.total_hours, 2) + " hr";
    oR.textContent = _fmtG(r.regular_hours, 2) + " / " + _fmtG(r.overtime_hours, 2) + " hr";
    oP.textContent = "$" + _fmtG(r.gross_pay, 2);
    oM.textContent = _fmtG(r.total_miles, 1) + " mi ($" + _fmtG(r.reimbursable, 2) + ")";
  }
}

const renderVehicleLoad = _simpleRendererG({
  citation: "Citation: Public static-balance equations. Rear axle = payload * (position / wheelbase); front = payload - rear; flagged against user-supplied GVWR / GAWR.",
  example: vehicleLoadExample.inputs,
  fields: [
    { key: "wheelbase_in", label: "Wheelbase (in)", kind: "number" },
    { key: "payload_lb", label: "Payload (lb)", kind: "number" },
    { key: "payload_position_from_cab_in", label: "Payload position from cab (in)", kind: "number" },
    { key: "curb_front_lb", label: "Curb front axle (lb)", kind: "number" },
    { key: "curb_rear_lb", label: "Curb rear axle (lb)", kind: "number" },
    { key: "gvwr_lb", label: "GVWR (lb, optional)", kind: "number" },
    { key: "front_gawr_lb", label: "Front GAWR (lb, optional)", kind: "number" },
    { key: "rear_gawr_lb", label: "Rear GAWR (lb, optional)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "vl-out-f", label: "Front axle total", value: (r) => _fmtG(r.front_axle_lb, 0) + " lb" },
    { key: "r", id: "vl-out-r", label: "Rear axle total", value: (r) => _fmtG(r.rear_axle_lb, 0) + " lb" },
    { key: "g", id: "vl-out-g", label: "Gross weight", value: (r) => _fmtG(r.gross_lb, 0) + " lb" },
    { key: "fl", id: "vl-out-fl", label: "Flags", value: (r) => Object.entries(r.flags).filter(([_, v]) => v).map(([k]) => k).join(", ") || "ok" },
  ],
  compute: computeVehicleLoad,
});

export const CROSS_RENDERERS = {
  "unit-converter": renderUnitConverter,
  "material-cost": renderMaterialCost,
  "markup": renderMarkup,
  "time-and-materials": renderTimeAndMaterials,
  "sales-tax": renderSalesTax,
  "tip-out": renderTipOut,
  // v2
  "loan-payment": renderLoanPayment,
  "upgrade-roi": renderUpgradeROI,
  "mileage-cost": renderMileageCost,
  "overtime": renderOvertime,
  "per-diem": renderPerDiem,
  "geometry": renderGeometry,
  "dilution": renderDilution,
  "slope-from-level": renderSlopeFromLevel,
  "haversine": renderHaversineDistance,
  // v3
  "trench-slope": renderTrenchSlope,
  "niosh-lifting": renderNIOSHLifting,
  "heat-stress": renderHeatStress,
  "wind-chill": renderWindChill,
  "ladder-angle": renderLadderAngle,
  "pulley-ma-gen": renderPulleyMAGen,
  "ramp-slope": renderRampSlope,
  "rainwater-yield": renderRainwaterYield,
  "rainwater-catchment-area": renderRainwaterCatchmentArea,
  "timesheet": renderTimesheet,
  "vehicle-load": renderVehicleLoad,
};

// =====================================================================
// v7 utility 253: Fall Protection Clearance
// =====================================================================

import {
  DEBOUNCE_MS as _V7X_DEB, debounce as _v7x_debounce, fmt as _v7x_fmt,
  makeNumber as _v7x_makeNumber, makeSelect as _v7x_makeSelect,
  attachExampleButton as _v7x_attachEx, makeOutputLine as _v7x_makeOut,
} from "./ui-fields.js";

export const FALL_PROTECTION_DECEL = {
  "shock-absorbing-lanyard-6ft":  { decel_ft: 3.5, free_fall_ft: 6, description: "6 ft shock-absorbing lanyard" },
  "shock-absorbing-lanyard-12ft": { decel_ft: 4.0, free_fall_ft: 12, description: "12 ft shock-absorbing lanyard" },
  "self-retracting-leading-edge": { decel_ft: 1.0, free_fall_ft: 2, description: "Leading-edge SRL" },
  "self-retracting-overhead":     { decel_ft: 1.0, free_fall_ft: 2, description: "Overhead SRL" },
};

// dims: in { args: dimensionless } out: { clearance_ft: L, pass: dimensionless }
export function computeFallProtectionClearance({
  connector = "shock-absorbing-lanyard-6ft",
  free_fall_ft_override = null,
  decel_ft_override = null,
  worker_height_ft = 5,
  harness_stretch_ft = 1,
  safety_factor_ft = 1,
  actual_clearance_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = FALL_PROTECTION_DECEL[connector];
  if (!c) return { error: "Unknown connector type." };
  const free_fall = free_fall_ft_override !== null && Number(free_fall_ft_override) >= 0 ? Number(free_fall_ft_override) : c.free_fall_ft;
  const decel = decel_ft_override !== null && Number(decel_ft_override) >= 0 ? Number(decel_ft_override) : c.decel_ft;
  if (!(worker_height_ft >= 0)) return { error: "Worker height must be non-negative." };
  if (!(harness_stretch_ft >= 0)) return { error: "Harness stretch must be non-negative." };
  if (!(safety_factor_ft >= 0)) return { error: "Safety factor must be non-negative." };
  const required_clearance_ft = free_fall + decel + worker_height_ft + harness_stretch_ft + safety_factor_ft;
  const remaining_clearance_ft = (Number(actual_clearance_ft) || 0) - required_clearance_ft;
  let flag;
  if (actual_clearance_ft <= 0) flag = "(actual clearance not entered)";
  else if (remaining_clearance_ft >= 0) flag = "PASS (clearance margin)";
  else flag = "FAIL (negative remaining clearance: contact next lower level)";
  return {
    connector_label: c.description,
    free_fall_ft: free_fall, decel_ft: decel,
    required_clearance_ft, remaining_clearance_ft, flag,
  };
}

export const fallProtectionClearanceExample = {
  inputs: {
    connector: "shock-absorbing-lanyard-6ft",
    free_fall_ft_override: null, decel_ft_override: null,
    worker_height_ft: 5, harness_stretch_ft: 1, safety_factor_ft: 1,
    actual_clearance_ft: 18,
  },
};

function _v7x_renderFallProtection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 29 CFR 1926.502 (fall protection systems criteria) by section. ANSI Z359 (Fall Protection) by name. Manufacturer connector-decel benchmarks in data/cross/fall-protection-benchmarks.json.";
  _v7x_attachEx(inputRegion, () => fillExample(fallProtectionClearanceExample.inputs));
  const conn = _v7x_makeSelect("Connector type", "fp-c", Object.keys(FALL_PROTECTION_DECEL).map((k) => ({ value: k, label: FALL_PROTECTION_DECEL[k].description + " (free-fall " + FALL_PROTECTION_DECEL[k].free_fall_ft + " ft, decel " + FALL_PROTECTION_DECEL[k].decel_ft + " ft)" })));
  const ff = _v7x_makeNumber("Free-fall override (ft, blank = manufacturer default)", "fp-ff", { step: "any", min: "0" });
  const dc = _v7x_makeNumber("Decel override (ft, blank = manufacturer default)", "fp-dc", { step: "any", min: "0" });
  const wh = _v7x_makeNumber("Worker height (D-ring to feet, ft)", "fp-wh", { step: "any", min: "0" });
  wh.input.value = "5";
  const hs = _v7x_makeNumber("Harness stretch (ft)", "fp-hs", { step: "any", min: "0" });
  hs.input.value = "1";
  const sf = _v7x_makeNumber("Safety factor (ft)", "fp-sf", { step: "any", min: "0" });
  sf.input.value = "1";
  const ac = _v7x_makeNumber("Actual clearance below anchor (ft)", "fp-ac", { step: "any", min: "0" });
  for (const f of [conn, ff, dc, wh, hs, sf, ac]) inputRegion.appendChild(f.wrap);
  const oR = _v7x_makeOut(outputRegion, "Required clearance", "fp-out-r");
  const oRem = _v7x_makeOut(outputRegion, "Remaining clearance", "fp-out-rem");
  const oF = _v7x_makeOut(outputRegion, "Status", "fp-out-f");
  function fillExample(x) { conn.select.value = x.connector; ff.input.value = ""; dc.input.value = ""; wh.input.value = x.worker_height_ft; hs.input.value = x.harness_stretch_ft; sf.input.value = x.safety_factor_ft; ac.input.value = x.actual_clearance_ft; update(); }
  const update = _v7x_debounce(() => {
    const r = computeFallProtectionClearance({
      connector: conn.select.value,
      free_fall_ft_override: ff.input.value === "" ? null : Number(ff.input.value),
      decel_ft_override: dc.input.value === "" ? null : Number(dc.input.value),
      worker_height_ft: Number(wh.input.value) || 0,
      harness_stretch_ft: Number(hs.input.value) || 0,
      safety_factor_ft: Number(sf.input.value) || 0,
      actual_clearance_ft: Number(ac.input.value) || 0,
    });
    if (r.error) { oR.textContent = r.error; oRem.textContent = "-"; oF.textContent = "-"; return; }
    oR.textContent = _v7x_fmt(r.required_clearance_ft, 1) + " ft (free-fall " + _v7x_fmt(r.free_fall_ft, 1) + " + decel " + _v7x_fmt(r.decel_ft, 1) + ")";
    oRem.textContent = _v7x_fmt(r.remaining_clearance_ft, 1) + " ft";
    oF.textContent = r.flag;
  }, _V7X_DEB);
  for (const f of [conn.select, ff.input, dc.input, wh.input, hs.input, sf.input, ac.input]) f.addEventListener("input", update);
}

CROSS_RENDERERS["fall-protection-clearance"] = _v7x_renderFallProtection;

// =====================================================================
// v9 §C.5: OSHA 1910.95 noise dose and time-weighted average
// =====================================================================
//
// Public OSHA 1910.95 Appendix A formulas. The 5 dB exchange rate is
// the OSHA-canonical form; NIOSH 98-126 recommends a 3 dB exchange
// rate but the calculator implements the OSHA rule because OSHA is the
// regulatory record. The footer warns the user.
//
//   T_hr     = 8 / 2^((L - 90) / 5)         permissible exposure time
//   D_pct    = sum(C_i / T_i) * 100         total dose
//   TWA_dBA  = 16.61 * log10(D / 100) + 90  8-hr time-weighted average
//
// Sound levels below 80 dBA contribute zero to the dose per OSHA
// 1910.95 Appendix A (the threshold the regulation defines). The
// "action level" 50% dose corresponds to TWA = 85 dBA; the "permissible
// exposure limit" 100% dose corresponds to TWA = 90 dBA. Pass / fail
// is reported against both for the user's choice of comparison.
//
// Multi-row input: the renderer offers six fixed-width rows (level dBA,
// duration hours) so a typical multi-task workshift can be modeled
// without unbounded growth in the home-view payload. Total exposure
// across all rows above 24 hours is rejected.

// dims: in { rows: dimensionless } out: { dose_percent: dimensionless, twa_dba: dimensionless }
export function computeNoiseDose({ rows = [] } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Provide at least one exposure row (level dBA, hours)." };
  }
  let total_hours = 0;
  let dose_pct = 0;
  const per_row = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    // Treat null / undefined / empty-string as non-numeric (Number(null) = 0 would be misleading).
    if (r.level_dBA === null || r.level_dBA === undefined || r.level_dBA === "") {
      per_row.push({ index: i, level_dBA: null, hours: r.hours, permitted_hr: null, contribution_pct: 0, skipped: true, reason: "level missing" });
      continue;
    }
    if (r.hours === null || r.hours === undefined || r.hours === "") {
      per_row.push({ index: i, level_dBA: r.level_dBA, hours: null, permitted_hr: null, contribution_pct: 0, skipped: true, reason: "hours missing" });
      continue;
    }
    const L = Number(r.level_dBA);
    const H = Number(r.hours);
    if (!Number.isFinite(L) || !Number.isFinite(H)) {
      per_row.push({ index: i, level_dBA: L, hours: H, permitted_hr: null, contribution_pct: 0, skipped: true, reason: "non-numeric input" });
      continue;
    }
    if (H <= 0) {
      per_row.push({ index: i, level_dBA: L, hours: H, permitted_hr: null, contribution_pct: 0, skipped: true, reason: "zero or negative hours" });
      continue;
    }
    if (H > 16) {
      return { error: "Row " + (i + 1) + " duration " + H + " hr exceeds the 16 hr single-row safety bound. Split the exposure into separate rows." };
    }
    total_hours += H;
    if (L < 80) {
      // OSHA 1910.95 Appendix A: levels below 80 dBA contribute zero.
      per_row.push({ index: i, level_dBA: L, hours: H, permitted_hr: Infinity, contribution_pct: 0, skipped: false, reason: "L < 80 dBA (no OSHA dose)" });
      continue;
    }
    const T = 8 / Math.pow(2, (L - 90) / 5);
    const contribution = (H / T) * 100;
    dose_pct += contribution;
    per_row.push({ index: i, level_dBA: L, hours: H, permitted_hr: T, contribution_pct: contribution, skipped: false });
  }
  if (total_hours > 24) {
    return { error: "Total exposure " + total_hours.toFixed(2) + " hr across all rows exceeds 24 hr; check the entries." };
  }
  // TWA: 16.61 * log10(D / 100) + 90. For D = 0 the formula is
  // undefined (log10 of 0), so TWA is reported as null (no exposure).
  const twa = dose_pct > 0 ? 16.61 * Math.log10(dose_pct / 100) + 90 : null;
  const pass_action_level_85 = dose_pct <= 50;
  const pass_pel_90 = dose_pct <= 100;

  return {
    total_dose_pct: dose_pct,
    twa_dBA: twa,
    pass_action_level_85,
    pass_pel_90,
    per_row,
    total_hours,
    warnings: [
      "OSHA 1910.95(b) implements a 5 dB exchange rate; NIOSH 98-126 recommends 3 dB and a 4 dB-per-doubling rule. This calculator uses the OSHA convention because OSHA is the regulatory record.",
    ],
  };
}

export const noiseDoseExample = {
  // OSHA 1910.95 Appendix A example: 8 hr at 88 dBA + 2 hr at 95 dBA.
  // T_88 = 8 / 2^((88-90)/5) = 8 / 2^(-0.4) = 8 * 1.32 = 10.56 hr
  // T_95 = 8 / 2^((95-90)/5) = 8 / 2^1 = 4 hr
  // D = (8/10.56 + 2/4) * 100 = (0.757 + 0.5) * 100 = 125.7 %
  // TWA = 16.61 * log10(1.257) + 90 ~ 91.6 dBA
  inputs: { rows: [{ level_dBA: 88, hours: 8 }, { level_dBA: 95, hours: 2 }] },
};

function renderNoiseDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per OSHA 29 CFR 1910.95(b) Appendix A and Table G-16a. NIOSH 98-126 recommends a 3 dB exchange rate; this calculator implements the OSHA 5 dB rule because OSHA is the regulatory record. AHJ governs. Free at ecfr.gov and at cdc.gov/niosh.";

  const rowDivs = [];
  const ROW_COUNT = 6;
  for (let i = 0; i < ROW_COUNT; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const lbl = document.createElement("label");
    lbl.textContent = "Row " + (i + 1) + " (dBA, hr)";
    wrap.appendChild(lbl);
    const lvl = document.createElement("input");
    lvl.type = "number"; lvl.step = "any"; lvl.min = "0"; lvl.id = "nd-l" + i; lvl.inputMode = "decimal";
    lvl.placeholder = "level dBA"; lvl.setAttribute("aria-label", "Row " + (i + 1) + " noise level (dBA)");
    wrap.appendChild(lvl);
    const hr = document.createElement("input");
    hr.type = "number"; hr.step = "any"; hr.min = "0"; hr.id = "nd-h" + i; hr.inputMode = "decimal";
    hr.placeholder = "hours"; hr.setAttribute("aria-label", "Row " + (i + 1) + " hours at this level");
    wrap.appendChild(hr);
    inputRegion.appendChild(wrap);
    rowDivs.push({ lvl, hr });
  }

  attachExampleButton(inputRegion, () => {
    rowDivs[0].lvl.value = "88"; rowDivs[0].hr.value = "8";
    rowDivs[1].lvl.value = "95"; rowDivs[1].hr.value = "2";
    for (let i = 2; i < ROW_COUNT; i++) { rowDivs[i].lvl.value = ""; rowDivs[i].hr.value = ""; }
    update();
  });

  const oD = makeOutputLine(outputRegion, "Total dose (%)", "nd-out-d");
  const oTWA = makeOutputLine(outputRegion, "8-hr TWA (dBA)", "nd-out-twa");
  const oAL = makeOutputLine(outputRegion, "Action level (85 dBA / 50% dose)", "nd-out-al");
  const oPEL = makeOutputLine(outputRegion, "PEL (90 dBA / 100% dose)", "nd-out-pel");
  const oW = makeOutputLine(outputRegion, "Notes", "nd-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const rows = [];
    for (const rd of rowDivs) {
      const L = readNum(rd.lvl);
      const H = readNum(rd.hr);
      if (L === null && H === null) continue;
      rows.push({ level_dBA: L, hours: H });
    }
    if (rows.length === 0) {
      oD.textContent = "(enter at least one row)"; oTWA.textContent = ""; oAL.textContent = ""; oPEL.textContent = ""; oW.textContent = "";
      return;
    }
    const r = computeNoiseDose({ rows });
    if (r.error) {
      oD.textContent = r.error; oTWA.textContent = ""; oAL.textContent = ""; oPEL.textContent = ""; oW.textContent = "";
      return;
    }
    oD.textContent = fmt(r.total_dose_pct, 1) + " %";
    oTWA.textContent = r.twa_dBA === null ? "(below 80 dBA: no OSHA TWA)" : fmt(r.twa_dBA, 1) + " dBA";
    oAL.textContent = r.pass_action_level_85 ? "PASS (<= 50% dose)" : "EXCEEDED (engineering controls + monitoring required)";
    oPEL.textContent = r.pass_pel_90 ? "PASS (<= 100% dose)" : "EXCEEDED (hearing-protection mandatory)";
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const rd of rowDivs) {
    rd.lvl.addEventListener("input", update);
    rd.hr.addEventListener("input", update);
  }
}

CROSS_RENDERERS["noise-dose"] = renderNoiseDose;

// --- v15 G.1: Pump total dynamic head (TDH) ---
// TDH is the total head a pump must develop: the net static head between
// suction and discharge plus every friction loss (suction pipe, discharge
// pipe, and fittings expressed as an equivalent pipe length). Friction uses
// the Hazen-Williams engine (Crane TP-410); the user enters internal diameter,
// the C factor, and a fittings equivalent length so no pipe-dimension table is
// bundled. A positive suction lift raises TDH; a flooded (negative) suction
// lowers it.

// dims: in { args: dimensionless } out: { tdh_ft: L, static_head_ft: L, velocity_fps: L T^-1 }
export function computePumpTdh({
  flow_gpm = 0,
  internal_diameter_in = 0,
  hw_c = 150,
  static_suction_lift_ft = 0,
  static_discharge_head_ft = 0,
  suction_length_ft = 0,
  discharge_length_ft = 0,
  fittings_equiv_length_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q = Number(flow_gpm) || 0;
  const d = Number(internal_diameter_in) || 0;
  const C = Number(hw_c) || 0;
  const lift = Number(static_suction_lift_ft) || 0;
  const disch = Number(static_discharge_head_ft) || 0;
  const sLen = Number(suction_length_ft) || 0;
  const dLen = Number(discharge_length_ft) || 0;
  const fLen = Number(fittings_equiv_length_ft) || 0;
  if (!(Q > 0)) return { error: "Flow rate must be positive (GPM)." };
  if (!(d > 0)) return { error: "Pipe internal diameter must be positive (in)." };
  if (!(C > 0)) return { error: "Hazen-Williams C factor must be positive." };
  if (sLen < 0 || dLen < 0 || fLen < 0) return { error: "Pipe and fittings lengths cannot be negative (ft)." };

  const suction_friction_ft = hazenWilliamsFrictionLoss({ flow_gpm: Q, internal_diameter_in: d, length_ft: sLen, C });
  const discharge_friction_ft = hazenWilliamsFrictionLoss({ flow_gpm: Q, internal_diameter_in: d, length_ft: dLen, C });
  const fittings_friction_ft = hazenWilliamsFrictionLoss({ flow_gpm: Q, internal_diameter_in: d, length_ft: fLen, C });
  const static_head_ft = disch + lift; // lift positive adds; flooded (negative) subtracts
  const tdh_ft = static_head_ft + suction_friction_ft + discharge_friction_ft + fittings_friction_ft;
  // Pipe velocity: v (ft/s) = 0.4085 * GPM / d^2 (d in inches).
  const velocity_fps = 0.4085 * Q / (d * d);

  const warnings = [];
  if (lift > 25) warnings.push("Suction lift above 25 ft risks cavitation; check NPSHa with the available-NPSH tile (G.2) and the fluid vapor pressure.");
  if (velocity_fps > 10) warnings.push("Pipe velocity above 10 ft/s is high for a discharge line; consider a larger pipe to cut friction and water hammer.");
  else if (velocity_fps > 5 && lift > 0) warnings.push("Suction velocity above 5 ft/s is high; a larger suction pipe lowers NPSH demand.");

  return {
    tdh_ft,
    static_head_ft,
    static_suction_lift_ft: lift,
    static_discharge_head_ft: disch,
    suction_friction_ft,
    discharge_friction_ft,
    fittings_friction_ft,
    velocity_fps,
    operating_point: { gpm: Q, tdh_ft },
    warnings,
  };
}

export const pumpTdhExample = {
  // 100 GPM through 4.026 in (4" sch-40 steel) PVC-equivalent C=150, 10 ft
  // suction lift, 50 ft discharge head, 20 ft suction run, 200 ft discharge
  // run, 30 ft of fittings equivalent length.
  inputs: {
    flow_gpm: 100,
    internal_diameter_in: 4.026,
    hw_c: 150,
    static_suction_lift_ft: 10,
    static_discharge_head_ft: 50,
    suction_length_ft: 20,
    discharge_length_ft: 200,
    fittings_equiv_length_ft: 30,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderPumpTdh(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: TDH = static head + suction friction + discharge friction + fittings friction. Friction is Hazen-Williams (Crane Technical Paper No. 410). Enter the pipe internal diameter, C factor (150 PVC, 130 new steel, 100 old steel), and fittings equivalent length from TP-410. The manufacturer pump curve governs the operating point. Free at flowoffluids.com for Crane TP-410 excerpts.";

  const flow = makeNumber("Flow rate (GPM)", "tdh-q", { step: "any", min: "0", value: "100" });
  flow.input.value = "100";
  const dia = makeNumber("Pipe internal diameter (in)", "tdh-d", { step: "any", min: "0", value: "4.026" });
  dia.input.value = "4.026";
  const cfac = makeNumber("Hazen-Williams C (150 PVC / 130 steel)", "tdh-c", { step: "any", min: "0", value: "150" });
  cfac.input.value = "150";
  const lift = makeNumber("Static suction lift (ft; negative if flooded)", "tdh-lift", { step: "any", value: "10" });
  lift.input.value = "10";
  const disch = makeNumber("Static discharge head (ft)", "tdh-disch", { step: "any", min: "0", value: "50" });
  disch.input.value = "50";
  const sLen = makeNumber("Suction pipe length (ft)", "tdh-slen", { step: "any", min: "0", value: "20" });
  sLen.input.value = "20";
  const dLen = makeNumber("Discharge pipe length (ft)", "tdh-dlen", { step: "any", min: "0", value: "200" });
  dLen.input.value = "200";
  const fLen = makeNumber("Fittings equivalent length (ft)", "tdh-flen", { step: "any", min: "0", value: "30" });
  fLen.input.value = "30";
  for (const f of [flow, dia, cfac, lift, disch, sLen, dLen, fLen]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    flow.input.value = "100"; dia.input.value = "4.026"; cfac.input.value = "150"; lift.input.value = "10";
    disch.input.value = "50"; sLen.input.value = "20"; dLen.input.value = "200"; fLen.input.value = "30";
    update();
  });

  const oTdh = makeOutputLine(outputRegion, "Total dynamic head (ft)", "tdh-out-tdh");
  const oStatic = makeOutputLine(outputRegion, "Static head (ft)", "tdh-out-static");
  const oFric = makeOutputLine(outputRegion, "Friction: suction / discharge / fittings (ft)", "tdh-out-fric");
  const oVel = makeOutputLine(outputRegion, "Pipe velocity (ft/s)", "tdh-out-vel");
  const oW = makeOutputLine(outputRegion, "Notes", "tdh-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computePumpTdh({
      flow_gpm: readNum(flow.input),
      internal_diameter_in: readNum(dia.input),
      hw_c: readNum(cfac.input),
      static_suction_lift_ft: readNum(lift.input),
      static_discharge_head_ft: readNum(disch.input),
      suction_length_ft: readNum(sLen.input),
      discharge_length_ft: readNum(dLen.input),
      fittings_equiv_length_ft: readNum(fLen.input),
    });
    if (r.error) {
      oTdh.textContent = r.error; oStatic.textContent = ""; oFric.textContent = ""; oVel.textContent = ""; oW.textContent = "";
      return;
    }
    oTdh.textContent = fmt(r.tdh_ft, 1) + " ft";
    oStatic.textContent = fmt(r.static_head_ft, 1) + " ft";
    oFric.textContent = fmt(r.suction_friction_ft, 1) + " / " + fmt(r.discharge_friction_ft, 1) + " / " + fmt(r.fittings_friction_ft, 1) + " ft";
    oVel.textContent = fmt(r.velocity_fps, 2) + " ft/s";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Overlay the operating point (" + fmt(r.operating_point.gpm, 0) + " GPM, " + fmt(r.tdh_ft, 1) + " ft) on the manufacturer pump curve.";
  }, DEBOUNCE_MS);
  for (const f of [flow.input, dia.input, cfac.input, lift.input, disch.input, sLen.input, dLen.input, fLen.input]) f.addEventListener("input", update);
}

CROSS_RENDERERS["pump-tdh"] = renderPumpTdh;

// --- v15 G.3: Hydraulic cylinder force and speed ---
// Force = pressure * effective piston area; speed = pump flow / area. The
// effective area is the full bore on extension and the bore minus the rod on
// retraction (the annulus), so a cylinder extends slower with more force than
// it retracts. 231 in^3 = 1 US gallon.

// dims: in { args: dimensionless } out: { force_lb: M L T^-2, speed_in_per_s: L T^-1, oil_per_stroke_gal: L^3 }
export function computeHydraulicCylinder({
  bore_in = 0,
  rod_in = 0,
  pressure_psi = 0,
  flow_gpm = 0,
  direction = "extend",
  stroke_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bore = Number(bore_in) || 0;
  const rod = Number(rod_in) || 0;
  const P = Number(pressure_psi) || 0;
  const Q = Number(flow_gpm) || 0;
  const stroke = Number(stroke_in) || 0;
  if (!(bore > 0)) return { error: "Bore diameter must be positive (in)." };
  if (rod < 0) return { error: "Rod diameter cannot be negative (in)." };
  if (rod >= bore) return { error: "Rod diameter must be smaller than the bore." };
  if (!(P > 0)) return { error: "System pressure must be positive (psi)." };
  if (direction !== "extend" && direction !== "retract") return { error: "Direction must be extend or retract." };

  const area_extend = Math.PI * (bore / 2) ** 2;
  const area_retract = area_extend - Math.PI * (rod / 2) ** 2;
  const area = direction === "extend" ? area_extend : area_retract;
  const force_lb = P * area;
  const speed_in_per_s = Q > 0 ? (Q * 231) / (60 * area) : null;
  const oil_per_stroke_gal = stroke > 0 ? (area * stroke) / 231 : null;
  const cycle_time_s = stroke > 0 && speed_in_per_s ? stroke / speed_in_per_s : null;

  const warnings = [];
  if (P > 5000) warnings.push("System pressure above 5000 psi is outside the typical industrial range; verify component ratings.");
  if (bore < 0.5) warnings.push("Bore below 0.5 in is a miniature cylinder; verify the manufacturer data.");

  return {
    area_extend_in2: area_extend,
    area_retract_in2: area_retract,
    effective_area_in2: area,
    force_lb,
    speed_in_per_s,
    oil_per_stroke_gal,
    cycle_time_s,
    direction,
    warnings,
  };
}

export const hydraulicCylinderExample = {
  // 4 in bore, 2 in rod, 2000 psi, 10 GPM, extend, 12 in stroke:
  // A = pi*4 = 12.566 in^2; F = 25,133 lb; v = 10*231/(60*12.566) = 3.06 in/s;
  // oil = 12.566*12/231 = 0.653 gal.
  inputs: {
    bore_in: 4,
    rod_in: 2,
    pressure_psi: 2000,
    flow_gpm: 10,
    direction: "extend",
    stroke_in: 12,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderHydraulicCylinder(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles fluid power per NFPA T2.13.7 cylinder definitions: F = P * A, with A the full bore on extension and the bore-minus-rod annulus on retraction; v = (GPM * 231) / (60 * A). AHJ and machine design govern. Free at nfpa.com for the NFPA fluid-power table of contents.";

  const bore = makeNumber("Bore diameter (in)", "hc-bore", { step: "any", min: "0", value: "4" });
  bore.input.value = "4";
  const rod = makeNumber("Rod diameter (in)", "hc-rod", { step: "any", min: "0", value: "2" });
  rod.input.value = "2";
  const pres = makeNumber("System pressure (psi)", "hc-p", { step: "any", min: "0", value: "2000" });
  pres.input.value = "2000";
  const flow = makeNumber("Pump flow (GPM; 0 to skip speed)", "hc-q", { step: "any", min: "0", value: "10" });
  flow.input.value = "10";
  const dir = makeSelect("Direction", "hc-dir", [
    { value: "extend", label: "Extend (full bore)", selected: true },
    { value: "retract", label: "Retract (annulus)" },
  ]);
  const stroke = makeNumber("Stroke length (in; 0 to skip)", "hc-stroke", { step: "any", min: "0", value: "12" });
  stroke.input.value = "12";
  for (const f of [bore, rod, pres, flow, dir, stroke]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    bore.input.value = "4"; rod.input.value = "2"; pres.input.value = "2000"; flow.input.value = "10";
    dir.select.value = "extend"; stroke.input.value = "12";
    update();
  });

  const oForce = makeOutputLine(outputRegion, "Force (lb)", "hc-out-f");
  const oArea = makeOutputLine(outputRegion, "Effective area (in^2)", "hc-out-a");
  const oSpeed = makeOutputLine(outputRegion, "Speed (in/s)", "hc-out-v");
  const oOil = makeOutputLine(outputRegion, "Oil per stroke (gal)", "hc-out-o");
  const oCycle = makeOutputLine(outputRegion, "Cycle time (s)", "hc-out-t");
  const oW = makeOutputLine(outputRegion, "Notes", "hc-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeHydraulicCylinder({
      bore_in: readNum(bore.input),
      rod_in: readNum(rod.input),
      pressure_psi: readNum(pres.input),
      flow_gpm: readNum(flow.input),
      direction: dir.select.value,
      stroke_in: readNum(stroke.input),
    });
    if (r.error) {
      oForce.textContent = r.error; oArea.textContent = ""; oSpeed.textContent = ""; oOil.textContent = ""; oCycle.textContent = ""; oW.textContent = "";
      return;
    }
    oForce.textContent = fmt(r.force_lb, 0) + " lb";
    oArea.textContent = fmt(r.effective_area_in2, 3) + " in^2";
    oSpeed.textContent = r.speed_in_per_s === null ? "enter pump flow" : fmt(r.speed_in_per_s, 2) + " in/s";
    oOil.textContent = r.oil_per_stroke_gal === null ? "enter stroke" : fmt(r.oil_per_stroke_gal, 3) + " gal";
    oCycle.textContent = r.cycle_time_s === null ? "enter flow + stroke" : fmt(r.cycle_time_s, 2) + " s";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Retraction force and speed differ from extension because the rod reduces the effective area.";
  }, DEBOUNCE_MS);
  for (const f of [bore.input, rod.input, pres.input, flow.input, dir.select, stroke.input]) f.addEventListener("input", update);
}

CROSS_RENDERERS["hydraulic-cylinder"] = renderHydraulicCylinder;

// --- v15 G.4: V-belt sheave and drive sizing ---
// The speed ratio sets the driven pitch diameter from the driver; the belt
// length follows from the two pitch diameters and the center distance. The
// service factor inflates the nameplate HP to a design HP, and the design HP
// divided by a per-belt rating gives the belt count. The per-belt rating is a
// coarse planning default by cross-section; the manufacturer's speed-specific
// table governs the final selection.

// Coarse nominal HP-per-belt planning defaults by V-belt cross-section. These
// are mid-range catalog values; the manufacturer's speed-specific power table
// (Gates / Goodyear) governs the final belt count.
const _VBELT_HP_PER_BELT = { A: 3, B: 7, C: 15, D: 30, "3V": 5, "5V": 12, "8V": 30 };

// dims: in { args: dimensionless } out: { ratio: dimensionless, driven_pitch_diameter_in: L, belt_length_in: L, design_hp: M L^2 T^-3 }
export function computeVbeltDrive({
  driver_rpm = 0,
  driven_rpm = 0,
  driver_hp = 0,
  driver_pitch_diameter_in = 0,
  center_distance_in = 0,
  belt_section = "B",
  service_factor = 1.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rIn = Number(driver_rpm) || 0;
  const rOut = Number(driven_rpm) || 0;
  const hp = Number(driver_hp) || 0;
  const d1 = Number(driver_pitch_diameter_in) || 0;
  const C = Number(center_distance_in) || 0;
  const sf = Number(service_factor) || 0;
  if (!(rIn > 0)) return { error: "Driver RPM must be positive." };
  if (!(rOut > 0)) return { error: "Driven RPM must be positive." };
  if (!(hp > 0)) return { error: "Driver shaft power must be positive (HP)." };
  if (!(d1 > 0)) return { error: "Driver pitch diameter must be positive (in)." };
  if (!(C > 0)) return { error: "Center distance must be positive (in)." };
  if (!(sf > 0)) return { error: "Service factor must be positive." };
  if (!_VBELT_HP_PER_BELT[belt_section]) return { error: "Belt section must be one of A, B, C, D, 3V, 5V, 8V." };

  const ratio = rIn / rOut;
  const d2 = d1 * ratio; // driven pitch diameter
  const belt_length_in = 2 * C + (Math.PI / 2) * (d1 + d2) + ((d2 - d1) ** 2) / (4 * C);
  const design_hp = hp * sf;
  const hp_per_belt = _VBELT_HP_PER_BELT[belt_section];
  const belts = Math.max(1, Math.ceil(design_hp / hp_per_belt));

  const warnings = [];
  if (ratio > 7) warnings.push("Speed ratio above 7:1 is outside the typical single-belt range; consider a two-stage or geared drive.");
  if (d2 > C) warnings.push("The driven sheave diameter exceeds the center distance; verify the layout and belt wrap angle.");

  return {
    ratio,
    driver_pitch_diameter_in: d1,
    driven_pitch_diameter_in: d2,
    belt_length_in,
    design_hp,
    hp_per_belt,
    belts,
    belt_section,
    warnings,
  };
}

export const vbeltDriveExample = {
  // 1750 rpm driver, 875 rpm driven (2:1), 10 HP, 4 in driver pitch dia,
  // 20 in center distance, B-section, 1.2 service factor:
  // d2 = 8 in; L = 40 + (pi/2)(12) + 16/80 = 59.05 in; design = 12 HP;
  // belts = ceil(12 / 7) = 2.
  inputs: {
    driver_rpm: 1750,
    driven_rpm: 875,
    driver_hp: 10,
    driver_pitch_diameter_in: 4,
    center_distance_in: 20,
    belt_section: "B",
    service_factor: 1.2,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderVbeltDrive(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ratio = driver_rpm / driven_rpm = D_driven / D_driver; belt length L = 2C + (pi/2)(D1+D2) + (D2-D1)^2/(4C) per ANSI/RMA IP-20 / IP-22. HP-per-belt is a coarse planning default by cross-section; the manufacturer's speed-specific power table (Gates Industrial Drive Design Manual) and service-factor table govern the final selection. Free at gates.com/literature.";

  const rIn = makeNumber("Driver RPM", "vb-rin", { step: "any", min: "0", value: "1750" });
  rIn.input.value = "1750";
  const rOut = makeNumber("Driven RPM", "vb-rout", { step: "any", min: "0", value: "875" });
  rOut.input.value = "875";
  const hp = makeNumber("Driver shaft power (HP)", "vb-hp", { step: "any", min: "0", value: "10" });
  hp.input.value = "10";
  const d1 = makeNumber("Driver pitch diameter (in)", "vb-d1", { step: "any", min: "0", value: "4" });
  d1.input.value = "4";
  const C = makeNumber("Center distance (in)", "vb-c", { step: "any", min: "0", value: "20" });
  C.input.value = "20";
  const sect = makeSelect("Belt cross-section", "vb-sect", [
    { value: "A", label: "A" }, { value: "B", label: "B", selected: true }, { value: "C", label: "C" },
    { value: "D", label: "D" }, { value: "3V", label: "3V" }, { value: "5V", label: "5V" }, { value: "8V", label: "8V" },
  ]);
  const sf = makeNumber("Service factor (1.0-1.8)", "vb-sf", { step: "any", min: "0", value: "1.2" });
  sf.input.value = "1.2";
  for (const f of [rIn, rOut, hp, d1, C, sect, sf]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    rIn.input.value = "1750"; rOut.input.value = "875"; hp.input.value = "10"; d1.input.value = "4";
    C.input.value = "20"; sect.select.value = "B"; sf.input.value = "1.2";
    update();
  });

  const oRatio = makeOutputLine(outputRegion, "Speed ratio", "vb-out-ratio");
  const oD2 = makeOutputLine(outputRegion, "Driven pitch diameter (in)", "vb-out-d2");
  const oLen = makeOutputLine(outputRegion, "Belt length (in)", "vb-out-len");
  const oHp = makeOutputLine(outputRegion, "Design HP (service-adjusted)", "vb-out-hp");
  const oBelts = makeOutputLine(outputRegion, "Belts (planning estimate)", "vb-out-belts");
  const oW = makeOutputLine(outputRegion, "Notes", "vb-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeVbeltDrive({
      driver_rpm: readNum(rIn.input),
      driven_rpm: readNum(rOut.input),
      driver_hp: readNum(hp.input),
      driver_pitch_diameter_in: readNum(d1.input),
      center_distance_in: readNum(C.input),
      belt_section: sect.select.value,
      service_factor: readNum(sf.input),
    });
    if (r.error) {
      oRatio.textContent = r.error; oD2.textContent = ""; oLen.textContent = ""; oHp.textContent = ""; oBelts.textContent = ""; oW.textContent = "";
      return;
    }
    oRatio.textContent = fmt(r.ratio, 3) + ":1";
    oD2.textContent = fmt(r.driven_pitch_diameter_in, 2) + " in";
    oLen.textContent = fmt(r.belt_length_in, 2) + " in";
    oHp.textContent = fmt(r.design_hp, 2) + " HP";
    oBelts.textContent = r.belts + " (at ~" + r.hp_per_belt + " HP/belt nominal)";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Belt count is a planning estimate; the manufacturer's speed-specific power table governs the final selection.";
  }, DEBOUNCE_MS);
  for (const f of [rIn.input, rOut.input, hp.input, d1.input, C.input, sect.select, sf.input]) f.addEventListener("input", update);
}

CROSS_RENDERERS["vbelt-drive"] = renderVbeltDrive;

// --- v15 G.8: Gear ratio and RPM cascade ---
// A gear train multiplies the per-stage tooth-count ratios. Output RPM is the
// input divided by the overall ratio; output torque is the input multiplied by
// the overall ratio and a per-stage efficiency (0.97 default for spur gears).
// Up to four stages; blank or incomplete stages are ignored.

// dims: in { args: dimensionless } out: { overall_ratio: dimensionless, output_rpm: T^-1, output_torque: M L^2 T^-2 }
export function computeGearCascade({
  stages = [],
  input_rpm = 0,
  input_torque = 0,
  efficiency = 0.97,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const eta = Number(efficiency) || 0;
  if (!(eta > 0 && eta <= 1)) return { error: "Per-stage efficiency must be in (0, 1]." };
  const valid = [];
  for (const s of (stages || [])) {
    const nIn = Number(s && s.n_in) || 0;
    const nOut = Number(s && s.n_out) || 0;
    if (nIn === 0 && nOut === 0) continue; // blank stage ignored
    if (!(nIn > 0) || !(nOut > 0)) return { error: "Each used stage needs a positive input and output tooth count." };
    valid.push({ n_in: nIn, n_out: nOut });
  }
  if (valid.length === 0) return { error: "Enter at least one gear stage (input and output tooth counts)." };

  const stage_ratios = valid.map((s) => s.n_out / s.n_in);
  const overall_ratio = stage_ratios.reduce((a, b) => a * b, 1);
  const rpmIn = Number(input_rpm) || 0;
  const tqIn = Number(input_torque) || 0;
  const output_rpm = rpmIn > 0 ? rpmIn / overall_ratio : null;
  const output_torque = tqIn > 0 ? tqIn * overall_ratio * Math.pow(eta, valid.length) : null;

  const warnings = [];
  if (valid.some((s) => s.n_in < 8 || s.n_out < 8)) warnings.push("A tooth count below 8 risks undercut on a standard spur gear; verify the profile or use a corrected tooth.");
  if (stage_ratios.some((r) => r > 100)) warnings.push("A single-stage ratio above 100:1 is outside the spur-gear range; use a worm or multi-stage train.");

  return {
    stage_ratios,
    overall_ratio,
    output_rpm,
    output_torque,
    stages_used: valid.length,
    warnings,
  };
}

export const gearCascadeExample = {
  // Two stages 12->36 and 15->45 (each 3:1), overall 9:1; 1800 rpm in ->
  // 200 rpm out; 100 lb-in in -> 100 * 9 * 0.97^2 = 846.81 lb-in out.
  inputs: {
    stages: [{ n_in: 12, n_out: 36 }, { n_in: 15, n_out: 45 }],
    input_rpm: 1800,
    input_torque: 100,
    efficiency: 0.97,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderGearCascade(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles gear math: stage ratio = N_out / N_in; overall ratio = product of stage ratios; RPM_out = RPM_in / overall; T_out = T_in * overall * efficiency^stages. AGMA 2000 classifies gear tolerance; the ratio math is standard-independent. Free at agma.org for the AGMA standards table of contents.";

  const stageFields = [];
  for (let i = 1; i <= 4; i++) {
    const nIn = makeNumber("Stage " + i + " input teeth", "gc-in-" + i, { step: "1", min: "0" });
    const nOut = makeNumber("Stage " + i + " output teeth", "gc-out-" + i, { step: "1", min: "0" });
    stageFields.push({ nIn, nOut });
    inputRegion.appendChild(nIn.wrap);
    inputRegion.appendChild(nOut.wrap);
  }
  const rpm = makeNumber("Input RPM (optional)", "gc-rpm", { step: "any", min: "0" });
  const tq = makeNumber("Input torque (lb-in; optional)", "gc-tq", { step: "any", min: "0" });
  const eta = makeNumber("Per-stage efficiency (0-1)", "gc-eta", { step: "any", min: "0", max: "1", value: "0.97" });
  eta.input.value = "0.97";
  for (const f of [rpm, tq, eta]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    stageFields[0].nIn.input.value = "12"; stageFields[0].nOut.input.value = "36";
    stageFields[1].nIn.input.value = "15"; stageFields[1].nOut.input.value = "45";
    stageFields[2].nIn.input.value = ""; stageFields[2].nOut.input.value = "";
    stageFields[3].nIn.input.value = ""; stageFields[3].nOut.input.value = "";
    rpm.input.value = "1800"; tq.input.value = "100"; eta.input.value = "0.97";
    update();
  });

  const oOverall = makeOutputLine(outputRegion, "Overall ratio", "gc-out-overall");
  const oStages = makeOutputLine(outputRegion, "Per-stage ratios", "gc-out-stages");
  const oRpm = makeOutputLine(outputRegion, "Output RPM", "gc-out-rpm");
  const oTq = makeOutputLine(outputRegion, "Output torque (lb-in)", "gc-out-tq");
  const oW = makeOutputLine(outputRegion, "Notes", "gc-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const stages = stageFields.map((s) => ({ n_in: readNum(s.nIn.input) || 0, n_out: readNum(s.nOut.input) || 0 }));
    const r = computeGearCascade({
      stages,
      input_rpm: readNum(rpm.input),
      input_torque: readNum(tq.input),
      efficiency: readNum(eta.input),
    });
    if (r.error) {
      oOverall.textContent = r.error; oStages.textContent = ""; oRpm.textContent = ""; oTq.textContent = ""; oW.textContent = "";
      return;
    }
    oOverall.textContent = fmt(r.overall_ratio, 4) + ":1";
    oStages.textContent = r.stage_ratios.map((x) => fmt(x, 3) + ":1").join("  ·  ");
    oRpm.textContent = r.output_rpm === null ? "enter input RPM" : fmt(r.output_rpm, 1) + " RPM";
    oTq.textContent = r.output_torque === null ? "enter input torque" : fmt(r.output_torque, 2) + " lb-in";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Torque uses a per-stage efficiency of " + fmt(r.output_torque === null ? 0.97 : readNum(eta.input), 2) + "; the AGMA quality class governs real losses.";
  }, DEBOUNCE_MS);
  for (const s of stageFields) { s.nIn.input.addEventListener("input", update); s.nOut.input.addEventListener("input", update); }
  for (const f of [rpm.input, tq.input, eta.input]) f.addEventListener("input", update);
}

CROSS_RENDERERS["gear-cascade"] = renderGearCascade;

// dims: in { rise_in: L, roll_in: L, angle_deg: dimensionless } out: { true_offset_in: L, travel_in: L, run_advance_in: L, multiplier: dimensionless }
export function computeRollingOffset({ rise_in, roll_in, angle_deg }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(angle_deg > 0) || !(angle_deg < 90)) return { error: "Angle must be between 0 and 90 degrees." };
  if (rise_in < 0 || roll_in < 0) return { error: "Rise and roll must be non-negative." };
  const true_offset_in = Math.sqrt(rise_in * rise_in + roll_in * roll_in);
  const rad = angle_deg * Math.PI / 180;
  const multiplier = 1 / Math.sin(rad);
  const travel_in = true_offset_in * multiplier;
  const run_advance_in = true_offset_in / Math.tan(rad);
  let note = "";
  if (true_offset_in === 0) note = "Rise and roll are both zero (degenerate, no offset).";
  return { true_offset_in, travel_in, run_advance_in, multiplier, note };
}

export const rollingOffsetExample = { inputs: { rise_in: 12, roll_in: 9, angle_deg: 45 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderRollingOffset(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles rolling-offset trigonometry used in pipe fitting and conduit work: true offset = sqrt(rise^2 + roll^2) by Pythagoras, travel = true offset times the cosecant of the fitting angle, run advance = true offset / tangent. Public method as taught in NCCER pipefitting and the standard fitter's references; fitting make-up/take-out is product-specific and user-supplied; pairs with conduit-offset.";

  const rise = makeNumber("Vertical rise (in)", "ro-rise", { step: "any", min: "0" });
  const roll = makeNumber("Horizontal roll / run-over (in)", "ro-roll", { step: "any", min: "0" });
  const angle = makeSelect("Fitting angle (deg)", "ro-angle", [
    { value: "45", label: "45" },
    { value: "22.5", label: "22.5" },
    { value: "11.25", label: "11.25" },
    { value: "60", label: "60" },
  ]);
  angle.select.value = "45";
  for (const f of [rise, roll, angle]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    rise.input.value = "12"; roll.input.value = "9"; angle.select.value = "45";
    update();
  });

  const oTrue = makeOutputLine(outputRegion, "True offset (in)", "ro-out-true");
  const oTravel = makeOutputLine(outputRegion, "Travel / diagonal (in)", "ro-out-travel");
  const oRun = makeOutputLine(outputRegion, "Run advance (in)", "ro-out-run");
  const oMult = makeOutputLine(outputRegion, "Travel multiplier", "ro-out-mult");
  const oNote = makeOutputLine(outputRegion, "Notes", "ro-out-note");

  const update = debounce(() => {
    const r = computeRollingOffset({
      rise_in: Number(rise.input.value) || 0,
      roll_in: Number(roll.input.value) || 0,
      angle_deg: Number(angle.select.value) || 0,
    });
    if (r.error) {
      oTrue.textContent = r.error; oTravel.textContent = "-"; oRun.textContent = "-"; oMult.textContent = "-"; oNote.textContent = "";
      return;
    }
    oTrue.textContent = fmt(r.true_offset_in, 3) + " in";
    oTravel.textContent = fmt(r.travel_in, 3) + " in";
    oRun.textContent = fmt(r.run_advance_in, 3) + " in";
    oMult.textContent = fmt(r.multiplier, 5);
    oNote.textContent = r.note ? r.note : "Travel multiplier is 1 / sin(angle); cut the diagonal to travel, set fittings at the chosen angle, then subtract product-specific make-up.";
  }, DEBOUNCE_MS);
  for (const f of [rise.input, roll.input]) f.addEventListener("input", update);
  angle.select.addEventListener("change", update);
}

CROSS_RENDERERS["rolling-offset"] = renderRollingOffset;

// =====================================================================
// spec-v43 G - tank-volume (Tank Volume from Dipstick) - Group G
// Partial liquid volume of a cylindrical tank from a depth (dipstick)
// reading. Horizontal cylinder is the non-trivial closed form: the
// liquid is a circular segment of area A = R^2*acos((R-h)/R) -
// (R-h)*sqrt(2Rh - h^2), volume = A x length. Vertical cylinder is the
// trivial V = pi*R^2*h. First-principles geometry (flat ends).
// =====================================================================

// dims: in { orientation: dimensionless, linear_unit: dimensionless, diameter: L, length: L, depth: L } out: { volume_gal: L^3, full_gal: L^3, percent_full: dimensionless }
export function computeTankVolume({ orientation = "horizontal", linear_unit = "in", diameter = 0, length = 0, depth = 0 } = {}) {
  const _g = _finiteGuard({ diameter, length, depth }); if (_g) return _g;
  const factor = String(linear_unit) === "ft" ? 12 : 1; // to inches
  const D = (Number(diameter) || 0) * factor;
  const L = (Number(length) || 0) * factor;
  let h = (Number(depth) || 0) * factor;
  if (!(D > 0)) return { error: "Tank diameter must be positive." };
  if (!(L > 0)) return { error: "Tank length / height must be positive." };
  if (h < 0) return { error: "Liquid depth cannot be negative." };
  const R = D / 2;
  const horizontal = String(orientation) !== "vertical";
  const depthMax = horizontal ? D : L; // fill ceiling: diameter (horizontal) or height (vertical)
  let clamped = false;
  if (h > depthMax) { h = depthMax; clamped = true; }
  let volume_in3;
  if (horizontal) {
    const seg = R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(Math.max(0, 2 * R * h - h * h));
    volume_in3 = seg * L;
  } else {
    volume_in3 = Math.PI * R * R * h;
  }
  const full_in3 = Math.PI * R * R * L;
  const IN3_PER_GAL = 231, IN3_PER_L = 61.0237440947323, IN3_PER_FT3 = 1728;
  const percent_full = full_in3 > 0 ? (volume_in3 / full_in3) * 100 : 0;
  const notes = [];
  notes.push(horizontal
    ? "Horizontal cylinder: the liquid cross-section is a circular segment, area = R^2*acos((R-h)/R) - (R-h)*sqrt(2Rh-h^2), volume = area x length. First-principles geometry (flat ends)."
    : "Vertical cylinder: volume = pi*R^2*depth. First-principles geometry (flat ends).");
  notes.push("Flat ends assumed; dished or hemispherical heads hold more and need a head-type correction. Use the actual inside dimensions; gallons are US (231 in^3).");
  if (clamped) notes.push("Depth exceeded the tank " + (horizontal ? "diameter" : "height") + "; reporting the full tank.");
  return {
    orientation: horizontal ? "horizontal" : "vertical",
    volume_in3, volume_gal: volume_in3 / IN3_PER_GAL, volume_l: volume_in3 / IN3_PER_L, volume_ft3: volume_in3 / IN3_PER_FT3,
    full_in3, full_gal: full_in3 / IN3_PER_GAL,
    percent_full, notes,
  };
}
export const tankVolumeExample = { inputs: { orientation: "horizontal", linear_unit: "in", diameter: 24, length: 48, depth: 12 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderTankVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles tank gauging. Horizontal cylinder partial volume from the circular-segment area A = R^2*acos((R-h)/R) - (R-h)*sqrt(2Rh-h^2) times length; vertical cylinder V = pi*R^2*depth. Public-domain geometry; flat ends assumed (dished heads need a head-type correction). US gallons = in^3 / 231.";
  const orient = makeSelect("Tank orientation", "tv-orient", [
    { value: "horizontal", label: "Horizontal cylinder" },
    { value: "vertical", label: "Vertical cylinder" },
  ]);
  const unit = makeSelect("Dimension unit", "tv-unit", [
    { value: "in", label: "Inches" },
    { value: "ft", label: "Feet" },
  ]);
  const dia = makeNumber("Tank diameter", "tv-dia", { step: "any", min: "0" });
  const len = makeNumber("Tank length (horizontal) or height (vertical)", "tv-len", { step: "any", min: "0" });
  const depth = makeNumber("Liquid depth (dipstick)", "tv-depth", { step: "any", min: "0" });
  for (const f of [orient, unit, dia, len, depth]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { orient.select.value = "horizontal"; unit.select.value = "in"; dia.input.value = "24"; len.input.value = "48"; depth.input.value = "12"; update(); });
  const oVol = makeOutputLine(outputRegion, "Liquid volume", "tv-out-vol");
  const oPct = makeOutputLine(outputRegion, "Percent full", "tv-out-pct");
  const oFull = makeOutputLine(outputRegion, "Full tank", "tv-out-full");
  const oNote = makeOutputLine(outputRegion, "Notes", "tv-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTankVolume({ orientation: orient.select.value, linear_unit: unit.select.value, diameter: readNum(dia.input), length: readNum(len.input), depth: readNum(depth.input) });
    if (r.error) { oVol.textContent = r.error; oPct.textContent = "-"; oFull.textContent = "-"; oNote.textContent = ""; return; }
    oVol.textContent = fmt(r.volume_gal, 2) + " gal (" + fmt(r.volume_l, 1) + " L, " + fmt(r.volume_ft3, 3) + " ft^3)";
    oPct.textContent = fmt(r.percent_full, 1) + "%";
    oFull.textContent = fmt(r.full_gal, 2) + " gal";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, len.input, depth.input]) f.addEventListener("input", update);
  for (const f of [orient.select, unit.select]) f.addEventListener("change", update);
}

CROSS_RENDERERS["tank-volume"] = renderTankVolume;

// =====================================================================
// spec-v53 G - linear-interpolation (Linear Interpolation) - Group G
// Read a value between two known points off a chart or table, the
// everyday move when a published table (derating, pump curve, steam,
// psychrometric, calibration) gives the rows above and below your point:
// y = y1 + (x - x1) * (y2 - y1) / (x2 - x1). Flags extrapolation when the
// query falls outside the two points. First-principles linear geometry.
// =====================================================================

// dims: in { x1: dimensionless, y1: dimensionless, x2: dimensionless, y2: dimensionless, x: dimensionless } out: { y: dimensionless, slope: dimensionless }
export function computeLinearInterpolation({ x1 = 0, y1 = 0, x2 = 0, y2 = 0, x = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const X1 = Number(x1), Y1 = Number(y1), X2 = Number(x2), Y2 = Number(y2), X = Number(x);
  if (X2 === X1) return { error: "The two reference x-values must differ (a vertical line has no single y)." };
  const slope = (Y2 - Y1) / (X2 - X1);
  const y = Y1 + (X - X1) * slope;
  const lo = Math.min(X1, X2), hi = Math.max(X1, X2);
  const extrapolated = X < lo || X > hi;
  const notes = [];
  notes.push("Linear interpolation: y = y1 + (x - x1) x (y2 - y1) / (x2 - x1); the slope between the two points is " + fmt(slope, 6) + ". Use it to read a chart or table value that falls between two published rows.");
  if (extrapolated) notes.push("The query x = " + fmt(X, 4) + " is OUTSIDE the two reference points (" + fmt(lo, 4) + " to " + fmt(hi, 4) + "), so this is an EXTRAPOLATION - the straight-line assumption is least reliable here; confirm against the source.");
  else notes.push("The query lies between the two reference points (true interpolation).");
  return { y, slope, extrapolated, x_lo: lo, x_hi: hi, notes };
}
export const linearInterpolationExample = { inputs: { x1: 0, y1: 10, x2: 10, y2: 30, x: 4 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderLinearInterpolation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles linear interpolation - y = y1 + (x - x1)(y2 - y1)/(x2 - x1) - the straight-line read between two known table or chart points; public-domain. A linear estimate; a curved relationship between the points is approximated, so keep the two points close and confirm against the source table.";
  const x1 = makeNumber("Point 1 x", "li-x1", { step: "any" });
  const y1 = makeNumber("Point 1 y", "li-y1", { step: "any" });
  const x2 = makeNumber("Point 2 x", "li-x2", { step: "any" });
  const y2 = makeNumber("Point 2 y", "li-y2", { step: "any" });
  const x = makeNumber("Query x", "li-x", { step: "any" });
  for (const f of [x1, y1, x2, y2, x]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { x1.input.value = "0"; y1.input.value = "10"; x2.input.value = "10"; y2.input.value = "30"; x.input.value = "4"; update(); });
  const oY = makeOutputLine(outputRegion, "Interpolated y", "li-out-y");
  const oSlope = makeOutputLine(outputRegion, "Slope", "li-out-slope");
  const oNote = makeOutputLine(outputRegion, "Notes", "li-out-note");
  function readNum(input) { if (input.value === "") return NaN; const n = Number(input.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const vals = { x1: readNum(x1.input), y1: readNum(y1.input), x2: readNum(x2.input), y2: readNum(y2.input), x: readNum(x.input) };
    if (Object.values(vals).some((v) => Number.isNaN(v))) { oY.textContent = "Enter all five values."; oSlope.textContent = "-"; oNote.textContent = ""; return; }
    const r = computeLinearInterpolation(vals);
    if (r.error) { oY.textContent = r.error; oSlope.textContent = "-"; oNote.textContent = ""; return; }
    oY.textContent = fmt(r.y, 5) + (r.extrapolated ? " (extrapolated)" : "");
    oSlope.textContent = fmt(r.slope, 6);
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [x1.input, y1.input, x2.input, y2.input, x.input]) f.addEventListener("input", update);
}
CROSS_RENDERERS["linear-interpolation"] = renderLinearInterpolation;

// dims: in { opening_in: L, near_wall: dimensionless, measured_in: L } out: { air_gap_in: L, air_gap_wall_in: L, required_in: L }
export function computeCrossConnectionAirGap({ opening_in = 0, near_wall = false, measured_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const opening = Number(opening_in) || 0;
  const measured = Number(measured_in) || 0;
  if (!(opening > 0)) return { error: "Effective opening diameter must be positive (in)." };
  const air_gap_in = Math.max(2 * opening, 1);
  const air_gap_wall_in = Math.max(3 * opening, 1);
  const required_in = near_wall ? air_gap_wall_in : air_gap_in;
  const passes = measured > 0 ? measured >= required_in : null;
  return {
    air_gap_in, air_gap_wall_in, required_in, near_wall: !!near_wall, passes,
    note: "IPC 608.15.1 cross-connection air gap: the minimum vertical distance between a supply outlet and the flood-level rim of the fixture it discharges into is twice the effective opening diameter, but never less than 1 in; within three effective-opening diameters of a wall the minimum is three times the opening. The effective opening is the least cross-sectional area of the supply outlet (a round pipe's diameter, or the equivalent diameter of a non-round outlet). An air gap is the most positive cross-connection protection -- nothing mechanical can defeat it. A design aid, not a substitute for the plumbing code adopted by your AHJ.",
  };
}
export const crossConnectionAirGapExample = { inputs: { opening_in: 1, near_wall: false, measured_in: 2 } };
function renderCrossConnectionAirGap(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 608.15.1 / ASME A112.1.2 cross-connection air gap: minimum = 2x the effective opening diameter (never less than 1 in), or 3x within three diameters of a wall. The most positive backflow protection. A design aid, not a substitute for the plumbing code adopted by your AHJ.";
  const op = makeNumber("Effective opening diameter (in)", "ccag-op", { step: "any", min: "0" }); op.input.value = "1";
  const nw = makeCheckbox("Outlet within 3 diameters of a wall", "ccag-nw", false);
  const me = makeNumber("Measured installed air gap to check (in, optional)", "ccag-me", { step: "any", min: "0" });
  inputRegion.appendChild(op.wrap); inputRegion.appendChild(nw.wrap); inputRegion.appendChild(me.wrap);
  attachExampleButton(inputRegion, () => { op.input.value = "1"; nw.input.checked = false; me.input.value = "2"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required air gap", "ccag-out-req");
  const oBoth = makeOutputLine(outputRegion, "Standard / near-wall", "ccag-out-both");
  const oPass = makeOutputLine(outputRegion, "Measured gap check", "ccag-out-pass");
  const oNote = makeOutputLine(outputRegion, "Note", "ccag-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCrossConnectionAirGap({ opening_in: readNum(op.input), near_wall: nw.input.checked, measured_in: readNum(me.input) });
    if (r.error) { oReq.textContent = r.error; oBoth.textContent = "-"; oPass.textContent = "-"; oNote.textContent = ""; return; }
    oReq.textContent = fmt(r.required_in, 2) + " in" + (r.near_wall ? " (near a wall, 3x)" : " (standard, 2x)");
    oBoth.textContent = fmt(r.air_gap_in, 2) + " in / " + fmt(r.air_gap_wall_in, 2) + " in";
    oPass.textContent = r.passes === null ? "enter a measured gap to check" : (r.passes ? "PASS -- meets the minimum" : "FAIL -- below the minimum");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [op.input, me.input]) el.addEventListener("input", update);
  nw.input.addEventListener("change", update);
}
CROSS_RENDERERS["cross-connection-air-gap"] = renderCrossConnectionAirGap;

// ===================== spec-v503: bolt proof, yield, and tensile load (SAE J429) =====================
// SAE J429 inch-series grade strengths (psi): proof / yield / tensile.
const _J429_GRADES = {
  "2": { proof: 55000, yld: 57000, tensile: 74000, label: "SAE Grade 2" },
  "5": { proof: 85000, yld: 92000, tensile: 120000, label: "SAE Grade 5 / A325" },
  "8": { proof: 120000, yld: 130000, tensile: 150000, label: "SAE Grade 8 / A490" },
};
// dims: in { nominal_diameter_in: L, threads_per_inch: dimensionless, grade: dimensionless } out: { at_in2: L^2, proof_load_lb: M L T^-2, yield_load_lb: M L T^-2, tensile_load_lb: M L T^-2, rec_clamp_lb: M L T^-2 }
export function computeBoltProofLoad({ nominal_diameter_in = 0, threads_per_inch = 0, grade = "5" } = {}) {
  const _g = _finiteGuard({ nominal_diameter_in, threads_per_inch }); if (_g) return _g;
  const d = Number(nominal_diameter_in) || 0;
  const n = Number(threads_per_inch) || 0;
  const g = _J429_GRADES[String(grade)];
  if (!(d > 0)) return { error: "Nominal diameter must be positive (in)." };
  if (!(n > 0)) return { error: "Threads per inch must be positive." };
  if (!g) return { error: "Grade must be SAE 2, 5, or 8 (A325 = 5, A490 = 8)." };
  const at_in2 = 0.7854 * Math.pow(d - 0.9743 / n, 2);
  const proof_load_lb = at_in2 * g.proof;
  const yield_load_lb = at_in2 * g.yld;
  const tensile_load_lb = at_in2 * g.tensile;
  const rec_clamp_lb = 0.75 * proof_load_lb;
  if (![at_in2, proof_load_lb, yield_load_lb, tensile_load_lb, rec_clamp_lb].every(Number.isFinite)) return { error: "Bolt-load math is not a finite value." };
  return {
    at_in2, proof_load_lb, yield_load_lb, tensile_load_lb, rec_clamp_lb, grade_label: g.label,
    note: "SAE J429 bolt strength model: the strength acts on the tensile stress area at the thread root, At = 0.7854 x (D - 0.9743/n)^2, which is about 15% smaller than the nominal shank area (so a nominal-area estimate over-predicts capacity). Proof, yield, and tensile loads are At times the grade's proof, yield, and tensile strengths -- and the grade, read from the head markings, sets every number, so a Grade 2, Grade 5, and Grade 8 of identical diameter carry wildly different loads. The recommended clamp of about 75% of proof leaves margin for torque scatter and service loads -- the working target a torque value should aim for. A design aid; the joint design, torque method, and any preload requirement govern.",
  };
}
export const boltProofLoadExample = { inputs: { nominal_diameter_in: 0.5, threads_per_inch: 13, grade: "5" } };
function renderBoltProofLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: SAE J429 inch-series bolt strength (ASME B1.1 tensile stress area): At = 0.7854 x (D - 0.9743/n)^2; proof / yield / tensile load = At x the grade strength (Grade 2: 55/57/74 ksi; Grade 5 / A325: 85/92/120; Grade 8 / A490: 120/130/150); recommended clamp = 75% of proof. The grade is read from the head markings. A design aid; the joint design and torque method govern.";
  const d = makeNumber("Nominal (major) diameter D (in)", "bpl-d", { step: "any", min: "0" }); d.input.value = "0.5";
  const n = makeNumber("Threads per inch (TPI)", "bpl-n", { step: "any", min: "0" }); n.input.value = "13";
  const grade = makeSelect("SAE grade", "bpl-grade", [
    { value: "2", label: "Grade 2 (55 ksi proof)" },
    { value: "5", label: "Grade 5 / A325 (85 ksi proof)", selected: true },
    { value: "8", label: "Grade 8 / A490 (120 ksi proof)" },
  ]);
  for (const f of [d, n, grade]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "0.5"; n.input.value = "13"; grade.select.value = "5"; update(); });
  const oAt = makeOutputLine(outputRegion, "Tensile stress area At", "bpl-out-at");
  const oProof = makeOutputLine(outputRegion, "Proof load (do not exceed)", "bpl-out-proof");
  const oYield = makeOutputLine(outputRegion, "Yield load", "bpl-out-yield");
  const oTens = makeOutputLine(outputRegion, "Tensile (breaking) load", "bpl-out-tens");
  const oClamp = makeOutputLine(outputRegion, "Recommended clamp (75% of proof)", "bpl-out-clamp");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBoltProofLoad({ nominal_diameter_in: readNum(d.input), threads_per_inch: readNum(n.input), grade: grade.select.value });
    if (r.error) { oAt.textContent = r.error; oProof.textContent = "-"; oYield.textContent = "-"; oTens.textContent = "-"; oClamp.textContent = "-"; return; }
    oAt.textContent = fmt(r.at_in2, 4) + " in^2 (" + r.grade_label + ")";
    oProof.textContent = fmt(r.proof_load_lb, 0) + " lb";
    oYield.textContent = fmt(r.yield_load_lb, 0) + " lb";
    oTens.textContent = fmt(r.tensile_load_lb, 0) + " lb";
    oClamp.textContent = fmt(r.rec_clamp_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [d, n]) f.input.addEventListener("input", update);
  grade.select.addEventListener("change", update);
}
CROSS_RENDERERS["bolt-proof-load"] = renderBoltProofLoad;
