// Group O: Kitchen and Food Service (utilities 222-226).
// See spec-v4.md section 2.6.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// --- 222: Recipe Scaling ---
//
// Scales each ingredient row by target / original yield.

export const INGREDIENT_DENSITIES_G_PER_CUP = {
  flour_ap: 125,
  sugar_granulated: 200,
  sugar_brown_packed: 213,
  butter: 227,
  milk: 244,
  water: 237,
  oil: 218,
  egg_whole: 50, // single egg in g (USDA reference)
  honey: 340,
  rice_dry: 185,
  oats: 90,
};

export function computeRecipeScale({ rows = [], original_yield = 0, target_yield = 0 }) {
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Provide at least one ingredient row." };
  if (!(original_yield > 0)) return { error: "Original yield must be positive." };
  if (!(target_yield > 0)) return { error: "Target yield must be positive." };
  const factor = target_yield / original_yield;
  const out = [];
  for (const r of rows) {
    const qty = Number(r.quantity) || 0;
    if (qty < 0) return { error: "Quantity must be non-negative." };
    const scaled_qty = qty * factor;
    let alt_qty = null;
    let alt_unit = null;
    if (r.unit === "egg" && Math.abs(scaled_qty - Math.round(scaled_qty)) > 0.1) {
      alt_qty = scaled_qty * INGREDIENT_DENSITIES_G_PER_CUP.egg_whole;
      alt_unit = "g";
    } else if (r.unit === "cup" && r.ingredient && INGREDIENT_DENSITIES_G_PER_CUP[r.ingredient]) {
      const density = INGREDIENT_DENSITIES_G_PER_CUP[r.ingredient];
      alt_qty = scaled_qty * density;
      alt_unit = "g";
    }
    out.push({ ingredient: r.ingredient, quantity: scaled_qty, unit: r.unit, alt_quantity: alt_qty, alt_unit });
  }
  return { factor, rows: out };
}

export const recipeScaleExample = {
  inputs: {
    rows: [
      { ingredient: "flour_ap", quantity: 2, unit: "cup" },
      { ingredient: "sugar_granulated", quantity: 1, unit: "cup" },
      { ingredient: "egg_whole", quantity: 2, unit: "egg" },
      { ingredient: "butter", quantity: 0.5, unit: "cup" },
    ],
    original_yield: 12,
    target_yield: 30,
  },
};

// --- 223: Yield Percentage and Edible Portion ---

export function computeYieldEP({ ap_weight = 0, trim_weight = 0, cooking_loss_pct = 0, ap_cost_per_lb = 0 }) {
  if (!(ap_weight > 0)) return { error: "AP weight must be positive." };
  if (!(trim_weight >= 0)) return { error: "Trim weight must be non-negative." };
  if (trim_weight > ap_weight) return { error: "Trim weight cannot exceed AP weight." };
  if (!(cooking_loss_pct >= 0 && cooking_loss_pct < 100)) return { error: "Cooking loss must be 0-100%." };
  const after_trim = ap_weight - trim_weight;
  const ep_weight = after_trim * (1 - cooking_loss_pct / 100);
  const yield_pct = (ep_weight / ap_weight) * 100;
  const ep_cost_per_lb = ap_cost_per_lb > 0 && yield_pct > 0
    ? ap_cost_per_lb / (yield_pct / 100)
    : null;
  return { yield_pct, ep_weight, after_trim_weight: after_trim, ep_cost_per_lb };
}

export const yieldEPExample = { inputs: { ap_weight: 10, trim_weight: 1.5, cooking_loss_pct: 15, ap_cost_per_lb: 8.50 } };

// --- 224: Food Safety Cooling Curve ---

const COOLING_BASE_MIN = {
  // base minutes from 135 F to 70 F per container/medium combo
  "full_pan_4in": { thin_liquid: 90, thick_liquid: 110, dense_solid: 130 },
  "half_pan_2in": { thin_liquid: 50, thick_liquid: 60, dense_solid: 70 },
  "ice_bath":     { thin_liquid: 15, thick_liquid: 25, dense_solid: 40 },
  "blast_chiller":{ thin_liquid: 12, thick_liquid: 18, dense_solid: 30 },
};

export function computeCoolingCurve({ start_F = 135, ambient_F = 70, container = "full_pan_4in", product_type = "thick_liquid" }) {
  const tbl = COOLING_BASE_MIN[container];
  if (!tbl) return { error: "Unknown container." };
  const base = tbl[product_type];
  if (!Number.isFinite(base)) return { error: "Unknown product type." };
  if (!(start_F > 70)) return { error: "Starting temperature must exceed 70 F." };
  // Adjust for ambient: warmer ambient lengthens, cooler shortens, capped.
  const ambient_factor = 1 + Math.max(-0.3, Math.min(0.6, (ambient_F - 70) / 50));
  const phase1_min = base * ambient_factor;
  const phase2_min = phase1_min * 1.6; // 70 F -> 41 F is roughly 1.6x phase 1
  const phase1_pass = phase1_min <= 120;
  const phase2_pass = phase2_min <= 240;
  return { phase1_minutes: phase1_min, phase2_minutes: phase2_min, phase1_pass, phase2_pass };
}

export const coolingCurveExample = { inputs: { start_F: 165, ambient_F: 70, container: "full_pan_4in", product_type: "thick_liquid" } };

// --- 225: Plate Cost and Menu Pricing ---

export function computePlateCost({ ingredients = [], target_food_cost_pct = 30 }) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return { error: "Provide at least one ingredient." };
  if (!(target_food_cost_pct > 0 && target_food_cost_pct <= 100)) return { error: "Target food cost must be 1-100%." };
  let plate_cost = 0;
  for (const i of ingredients) {
    const lbs = Number(i.lbs) || 0;
    const cost_per_lb = Number(i.cost_per_lb) || 0;
    if (lbs < 0 || cost_per_lb < 0) return { error: "Lbs and cost must be non-negative." };
    plate_cost += lbs * cost_per_lb;
  }
  const suggested_price = plate_cost / (target_food_cost_pct / 100);
  const contribution_margin = suggested_price - plate_cost;
  let sanity_flag = "ok";
  if (suggested_price < 5) sanity_flag = "below typical menu range";
  else if (suggested_price > 100) sanity_flag = "above typical menu range";
  return { plate_cost, suggested_price, contribution_margin, sanity_flag };
}

export const plateCostExample = {
  inputs: {
    ingredients: [
      { name: "ribeye 8oz", lbs: 0.5, cost_per_lb: 16 },
      { name: "potato",     lbs: 0.4, cost_per_lb: 1.20 },
      { name: "veg side",   lbs: 0.25, cost_per_lb: 3 },
    ],
    target_food_cost_pct: 30,
  },
};

// --- 226: Steam Table and Pan Conversion ---

export const PAN_CAPACITIES_QT = {
  // pan_size: { depth_in: capacity_qt }
  full:        { 2.5: 8.5,  4: 13.5, 6: 21 },
  two_thirds:  { 2.5: 5.5,  4: 9,    6: 14 },
  half:        { 2.5: 4,    4: 6.5,  6: 10 },
  third:       { 2.5: 2.5,  4: 4,    6: 6.5 },
  quarter:     { 2.5: 1.75, 4: 2.75, 6: 4.5 },
  sixth:       { 2.5: 1.25, 4: 2,    6: 3.25 },
  ninth:       { 2.5: 0.75, 4: 1.25, 6: 2 },
};

export function computePanConversion({ target_qt = 0, target_servings = 0, portion_oz = 0, pan_size = "full", pan_depth_in = 4 }) {
  const sizeRow = PAN_CAPACITIES_QT[pan_size];
  if (!sizeRow) return { error: "Unknown pan size." };
  const cap = sizeRow[pan_depth_in];
  if (!Number.isFinite(cap)) return { error: "Unknown pan depth for this size." };
  let total_qt = target_qt;
  if (target_qt <= 0 && target_servings > 0 && portion_oz > 0) {
    total_qt = (target_servings * portion_oz) / 32; // 32 oz per quart
  }
  if (!(total_qt > 0)) return { error: "Provide target volume or servings + portion." };
  const pans_needed = Math.ceil(total_qt / cap);
  const servings_per_pan = portion_oz > 0 ? Math.floor((cap * 32) / portion_oz) : null;
  const cooling_warning = pan_depth_in >= 4 ? "Warning: pan depth >= 4 in slows cooling. Verify with utility 224." : null;
  return { total_qt, capacity_qt: cap, pans_needed, servings_per_pan, cooling_warning };
}

export const panConversionExample = { inputs: { target_qt: 0, target_servings: 50, portion_oz: 4, pan_size: "full", pan_depth_in: 4 } };

// --- Renderers ---

function _r(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener("input", update);
    }
  };
}

function renderRecipeScale(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Bakers' percentages and yeast / leavening do not scale linearly. Verify critical ratios. Citation: USDA FoodData Central reference weights, public domain.";
  attachExampleButton(inputRegion, () => fillExample(recipeScaleExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const ing = document.createElement("select");
    const noneOpt = document.createElement("option"); noneOpt.value = ""; noneOpt.textContent = "(none)";
    ing.appendChild(noneOpt);
    for (const k of Object.keys(INGREDIENT_DENSITIES_G_PER_CUP)) {
      const o = document.createElement("option"); o.value = k; o.textContent = k.replace(/_/g, " "); ing.appendChild(o);
    }
    const qty = document.createElement("input"); qty.type = "number"; qty.step = "any"; qty.min = "0"; qty.placeholder = "Qty";
    const unit = document.createElement("select");
    for (const u of ["cup", "tbsp", "tsp", "egg", "g", "oz", "ml"]) {
      const o = document.createElement("option"); o.value = u; o.textContent = u; unit.appendChild(o);
    }
    wrap.appendChild(ing); wrap.appendChild(qty); wrap.appendChild(unit);
    list.appendChild(wrap);
    [ing, qty, unit].forEach((el) => el.addEventListener("input", update));
    rows.push({ ing, qty, unit });
  }
  const orig = makeNumber("Original yield", "rs-orig", { step: "any", min: "0" });
  const targ = makeNumber("Target yield", "rs-targ", { step: "any", min: "0" });
  for (const f of [orig, targ]) inputRegion.appendChild(f.wrap);
  const oF = makeOutputLine(outputRegion, "Scale factor", "rs-out-f");
  const oR = makeOutputLine(outputRegion, "Scaled rows", "rs-out-r");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      const r = v.rows[i];
      if (r) { rows[i].ing.value = r.ingredient; rows[i].qty.value = r.quantity; rows[i].unit.value = r.unit; }
    }
    orig.input.value = v.original_yield; targ.input.value = v.target_yield;
    update();
  }
  function update() {
    const inputRows = rows.map((r) => ({ ingredient: r.ing.value, quantity: Number(r.qty.value) || 0, unit: r.unit.value })).filter((r) => r.quantity > 0);
    if (inputRows.length === 0) { oF.textContent = "-"; oR.textContent = "-"; return; }
    const r = computeRecipeScale({ rows: inputRows, original_yield: Number(orig.input.value) || 0, target_yield: Number(targ.input.value) || 0 });
    if (r.error) { oF.textContent = r.error; oR.textContent = "-"; return; }
    oF.textContent = fmt(r.factor, 3);
    oR.textContent = r.rows.map((row) => {
      let s = (row.ingredient || "?") + ": " + fmt(row.quantity, 3) + " " + row.unit;
      if (row.alt_quantity !== null) s += " (~" + fmt(row.alt_quantity, 1) + " " + row.alt_unit + ")";
      return s;
    }).join("; ");
  }
}

const renderYieldEP = _r({
  citation: "Citation: Public food-service operations practice. Yield % = (EP / AP) * 100. EP cost per lb = AP cost / yield %.",
  example: yieldEPExample.inputs,
  fields: [
    { key: "ap_weight",          label: "AP weight (lb)", kind: "number" },
    { key: "trim_weight",        label: "Trim loss (lb)", kind: "number" },
    { key: "cooking_loss_pct",   label: "Cooking loss %", kind: "number" },
    { key: "ap_cost_per_lb",     label: "AP cost ($/lb)", kind: "number" },
  ],
  outputs: [
    { key: "y", id: "ye-out-y", label: "Yield %",            value: (r) => fmt(r.yield_pct, 1) + " %" },
    { key: "e", id: "ye-out-e", label: "EP weight",          value: (r) => fmt(r.ep_weight, 2) + " lb" },
    { key: "c", id: "ye-out-c", label: "EP cost / lb",       value: (r) => r.ep_cost_per_lb === null ? "-" : "$" + fmt(r.ep_cost_per_lb, 2) },
  ],
  compute: computeYieldEP,
});

const renderCoolingCurve = _r({
  citation: "Notice: This is a planning aid. The thermometer on the food governs. Re-verify with a probe. Citation: FDA Food Code 2022 by section number only (135 F to 70 F in <= 2 hr; 70 F to 41 F in <= 4 hr).",
  example: coolingCurveExample.inputs,
  fields: [
    { key: "start_F",      label: "Starting temp (F)", kind: "number", default: 165 },
    { key: "ambient_F",    label: "Ambient temp (F)", kind: "number", default: 70 },
    { key: "container",    label: "Container", kind: "select", options: Object.keys(COOLING_BASE_MIN).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "product_type", label: "Product type", kind: "select", options: [{ value: "thin_liquid", label: "Thin liquid" }, { value: "thick_liquid", label: "Thick liquid" }, { value: "dense_solid", label: "Dense solid" }] },
  ],
  outputs: [
    { key: "p1", id: "cc-out-p1", label: "Phase 1 (135->70 F)", value: (r) => fmt(r.phase1_minutes, 0) + " min - " + (r.phase1_pass ? "PASS (<=120)" : "FAIL (>120)") },
    { key: "p2", id: "cc-out-p2", label: "Phase 2 (70->41 F)",  value: (r) => fmt(r.phase2_minutes, 0) + " min - " + (r.phase2_pass ? "PASS (<=240)" : "FAIL (>240)") },
  ],
  compute: computeCoolingCurve,
});

function renderPlateCost(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public restaurant operations practice. Suggested menu price = plate cost / target food-cost %.";
  attachExampleButton(inputRegion, () => fillExample(plateCostExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const n = document.createElement("input"); n.type = "text"; n.placeholder = "Ingredient";
    const lbs = document.createElement("input"); lbs.type = "number"; lbs.step = "any"; lbs.min = "0"; lbs.placeholder = "Lbs";
    const c = document.createElement("input"); c.type = "number"; c.step = "any"; c.min = "0"; c.placeholder = "$/lb";
    wrap.appendChild(n); wrap.appendChild(lbs); wrap.appendChild(c);
    list.appendChild(wrap);
    [n, lbs, c].forEach((el) => el.addEventListener("input", update));
    rows.push({ n, lbs, c });
  }
  const fc = makeNumber("Target food cost (%)", "pc-fc", { step: "any", min: "1", max: "100", value: "30" });
  fc.input.value = "30";
  inputRegion.appendChild(fc.wrap);
  const oP = makeOutputLine(outputRegion, "Plate cost", "pc-out-p");
  const oS = makeOutputLine(outputRegion, "Suggested price", "pc-out-s");
  const oM = makeOutputLine(outputRegion, "Contribution margin", "pc-out-m");
  const oF = makeOutputLine(outputRegion, "Sanity", "pc-out-f");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      const ig = v.ingredients[i];
      if (ig) { rows[i].n.value = ig.name; rows[i].lbs.value = ig.lbs; rows[i].c.value = ig.cost_per_lb; }
    }
    fc.input.value = v.target_food_cost_pct;
    update();
  }
  function update() {
    const ingredients = rows.map((r) => ({ name: r.n.value, lbs: Number(r.lbs.value) || 0, cost_per_lb: Number(r.c.value) || 0 })).filter((i) => i.lbs > 0);
    if (ingredients.length === 0) { for (const o of [oP, oS, oM, oF]) o.textContent = "-"; return; }
    const r = computePlateCost({ ingredients, target_food_cost_pct: Number(fc.input.value) || 30 });
    if (r.error) { oP.textContent = r.error; for (const o of [oS, oM, oF]) o.textContent = "-"; return; }
    oP.textContent = "$" + fmt(r.plate_cost, 2);
    oS.textContent = "$" + fmt(r.suggested_price, 2);
    oM.textContent = "$" + fmt(r.contribution_margin, 2);
    oF.textContent = r.sanity_flag;
  }
}

const renderPanConversion = _r({
  citation: "Citation: NSF / public food-service standards generally. Pan capacities from manufacturer published specs.",
  example: panConversionExample.inputs,
  fields: [
    { key: "target_qt",       label: "Target volume (qt, optional)", kind: "number" },
    { key: "target_servings", label: "Target servings", kind: "number" },
    { key: "portion_oz",      label: "Portion (oz)", kind: "number" },
    { key: "pan_size",        label: "Pan size", kind: "select", options: Object.keys(PAN_CAPACITIES_QT).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "pan_depth_in",    label: "Depth (in)", kind: "select", options: [{ value: "2.5", label: "2.5\"" }, { value: "4", label: "4\"" }, { value: "6", label: "6\"" }] },
  ],
  outputs: [
    { key: "v", id: "pn-out-v", label: "Total volume",     value: (r) => fmt(r.total_qt, 2) + " qt" },
    { key: "c", id: "pn-out-c", label: "Pan capacity",     value: (r) => fmt(r.capacity_qt, 2) + " qt" },
    { key: "n", id: "pn-out-n", label: "Pans needed",      value: (r) => String(r.pans_needed) },
    { key: "s", id: "pn-out-s", label: "Servings per pan", value: (r) => r.servings_per_pan === null ? "-" : String(r.servings_per_pan) },
    { key: "w", id: "pn-out-w", label: "Cooling warning",  value: (r) => r.cooling_warning || "ok" },
  ],
  compute: (params) => computePanConversion({
    ...params,
    pan_depth_in: Number(params.pan_depth_in) || 4,
  }),
});

export const KITCHEN_RENDERERS = {
  "recipe-scale":   renderRecipeScale,
  "yield-ep":       renderYieldEP,
  "cooling-curve":  renderCoolingCurve,
  "plate-cost":     renderPlateCost,
  "pan-conversion": renderPanConversion,
};
