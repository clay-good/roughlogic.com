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

export function convertUnit({ category, value, from, to }) {
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

export function computeMaterialCost({ unit_price, quantity, tax_rate_percent = 0, delivery_fee = 0 }) {
  if (quantity < 0 || unit_price < 0) return { error: "Inputs must be non-negative." };
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

export function computeMarkup({ cost, mode, value }) {
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

export function computeTimeAndMaterials({ hours, labor_rate_per_hour, material_cost, overhead_percent = 0, profit_percent = 0 }) {
  const labor = hours * labor_rate_per_hour;
  const direct = labor + material_cost;
  const overhead = direct * (overhead_percent / 100);
  const subtotal = direct + overhead;
  const profit = subtotal * (profit_percent / 100);
  const total = subtotal + profit;
  return { labor, material_cost, overhead, profit, subtotal, total };
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

export function computeSalesTax({ state, subtotal, custom_rate_percent = null }) {
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

export function computeTipOut({ total_amount, members }) {
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

export function computeLoanPayment({ principal, apr_percent, term_months }) {
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

export function computeUpgradeROI({ incremental_cost, annual_savings, discount_rate_percent = 0, years = 10 }) {
  const C = Number(incremental_cost) || 0;
  const S = Number(annual_savings) || 0;
  const d = (Number(discount_rate_percent) || 0) / 100;
  const y = Math.floor(Number(years) || 0);
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

export function computeMileageCost({ round_trip_miles, mpg, fuel_price_per_gallon, irs_rate_per_mile = IRS_STANDARD_MILEAGE_RATE }) {
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

export function computeOvertime({ total_hours, regular_rate, overtime_multiplier = 1.5, double_time_multiplier = 2.0, double_time_threshold_hr = 60 }) {
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

export function computeGeometry({ shape, ...args }) {
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

export function computeDilution({ concentrate_percent, target_percent, final_volume }) {
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

export function computeHaversineDistance({ lat1, lon1, lat2, lon2 }) {
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
};
