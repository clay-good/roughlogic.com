// Group O: Kitchen and Food Service (utilities 222-226).
// See spec-v4.md section 2.6.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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

// dims: in { rows: dimensionless, original_yield: dimensionless, target_yield: dimensionless }
//        out: { factor: dimensionless, rows: dimensionless }
// (Yields are dimensionless serving counts; rows is an array of caller-typed
// ingredient records. Per spec-v14 §7.1 the array input is conservatively
// dimensionless.)
export function computeRecipeScale({ rows = [], original_yield = 0, target_yield = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { ap_weight: M, trim_weight: M, cooking_loss_pct: dimensionless, ap_cost_per_lb: dimensionless }
//        out: { yield_pct: dimensionless, ep_weight: M, after_trim_weight: M, ep_cost_per_lb: dimensionless }
// (AP / trim weights carry mass dimension; cost-per-lb is treated as
// dimensionless per the spec-v14 §7.1 convention for monetary quantities.)
export function computeYieldEP({ ap_weight = 0, trim_weight = 0, cooking_loss_pct = 0, ap_cost_per_lb = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { start_F: T, ambient_F: T, container: dimensionless, product_type: dimensionless }
//        out: { phase1_minutes: T, phase2_minutes: T, phase1_pass: dimensionless, phase2_pass: dimensionless }
// (Temperatures and elapsed minutes both surface as `T` per the spec-v14
// §7.1 base-token set; the lint does not distinguish thermodynamic
// temperature from time.)
export function computeCoolingCurve({ start_F = 135, ambient_F = 70, container = "full_pan_4in", product_type = "thick_liquid" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { ingredients: dimensionless, target_food_cost_pct: dimensionless }
//        out: { plate_cost: dimensionless, suggested_price: dimensionless, contribution_margin: dimensionless, sanity_flag: dimensionless }
// (Monetary quantities are dimensionless per spec-v14 §7.1; ingredients
// is a caller-typed array, conservatively dimensionless.)
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

// dims: in { target_qt: L^3, target_servings: dimensionless, portion_oz: L^3, pan_size: dimensionless, pan_depth_in: L }
//        out: { total_qt: L^3, capacity_qt: L^3, pans_needed: dimensionless, servings_per_pan: dimensionless, cooling_warning: dimensionless }
// (`portion_oz` here is fluid ounces -- a volume -- so the dimension is
// L^3 to match the quart inputs/outputs that consume it.)
export function computePanConversion({ target_qt = 0, target_servings = 0, portion_oz = 0, pan_size = "full", pan_depth_in = 4 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
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
    ing.setAttribute("aria-label", "Ingredient " + (i + 1));
    const noneOpt = document.createElement("option"); noneOpt.value = ""; noneOpt.textContent = "(none)";
    ing.appendChild(noneOpt);
    for (const k of Object.keys(INGREDIENT_DENSITIES_G_PER_CUP)) {
      const o = document.createElement("option"); o.value = k; o.textContent = k.replace(/_/g, " "); ing.appendChild(o);
    }
    const qty = document.createElement("input"); qty.type = "number"; qty.step = "any"; qty.min = "0"; qty.inputMode = "decimal"; qty.placeholder = "Qty"; qty.setAttribute("aria-label", "Quantity for ingredient " + (i + 1));
    const unit = document.createElement("select");
    unit.setAttribute("aria-label", "Unit for ingredient " + (i + 1));
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
  citation: "Notice: This is a planning aid. The thermometer on the food governs. Citation: per FDA Food Code 2022 §3-401.11 and §3-501.14 (135 F to 70 F in ≤ 2 hr; 70 F to 41 F in ≤ 4 hr). Local health code adopts and may modify. Free at fda.gov/food/retail-food-protection/fda-food-code.",
  example: coolingCurveExample.inputs,
  fields: [
    { key: "start_F",      label: "Starting temp (F; confirms food is hot; cooling time shown is the FDA 135-to-70-to-41 window, not measured from this temp)", kind: "number", default: 165 },
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
    const n = document.createElement("input"); n.type = "text"; n.placeholder = "Ingredient"; n.setAttribute("aria-label", "Ingredient " + (i + 1) + " name");
    const lbs = document.createElement("input"); lbs.type = "number"; lbs.step = "any"; lbs.min = "0"; lbs.inputMode = "decimal"; lbs.placeholder = "Lbs"; lbs.setAttribute("aria-label", "Ingredient " + (i + 1) + " weight (lb)");
    const c = document.createElement("input"); c.type = "number"; c.step = "any"; c.min = "0"; c.inputMode = "decimal"; c.placeholder = "$/lb"; c.setAttribute("aria-label", "Ingredient " + (i + 1) + " cost per lb");
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

// =====================================================================
// v9 §H.6: Sous-vide pasteurization time (FDA Food Code Annex 6)
// =====================================================================
//
// Simplified-screening tile. The bundled food-safety values are taken
// from public FDA Food Code Annex 6 D-values for 6.5-log Salmonella
// reduction and from public sous-vide engineering references
// (Baldwin "Practical Guide to Sous Vide Cooking", an open work).
// The v10 §B.3 limitation banner above the inputs makes clear that
// this is a SCREEN and the local food-safety authority + a qualified
// processing authority govern any commercial-kitchen use.
//
// Math:
//
//   Come-up time uses the slab-form thermal-diffusion approximation
//   (Heisler chart at the slab centerline). The center temperature
//   ratio (T_bath - T_center) / (T_bath - T_initial) reaches ~0.005
//   at Fourier number Fo ~ 0.4 for a slab of half-thickness L:
//
//     come_up_seconds = 0.4 * L_m^2 / alpha
//
//   Hold time at bath = food center temperature, by linear interpolation
//   between the bundled FDA Annex 6 break points. Bath temperature
//   below the lowest break point flags the tile as unsafe; above the
//   highest, hold time falls below 1 min (the calculator does not
//   recommend operating that hot; texture suffers).
//
//   Total = come_up + hold (with the limitation banner above and the
//   "field thermometer is the verdict" warning on every result).

// Thermal diffusivity (m^2/s) for typical food categories. Public
// engineering reference values; the user can override via the
// "category" select (custom alpha not exposed in this batch).
export const SOUS_VIDE_DIFFUSIVITY = {
  poultry: { alpha: 1.40e-7, label: "Poultry (chicken / turkey)" },
  pork:    { alpha: 1.40e-7, label: "Pork" },
  beef:    { alpha: 1.30e-7, label: "Beef / lamb" },
  fish:    { alpha: 1.45e-7, label: "Fish / seafood" },
  egg:     { alpha: 1.40e-7, label: "Egg (in-shell or yolk)" },
};

// FDA Food Code Annex 6 6.5-log Salmonella reduction time at bath
// temperature (water-bath = food center). Values in (T_F, hold_min).
// Source: FDA Food Code Annex 6 Table A. Linear interpolation between
// rows; below the lowest row the tile reports "unsafe at this
// temperature" and above the highest the hold time is < 1 min.
const SOUS_VIDE_HOLD_TABLE_F = [
  [130, 121.4],
  [131, 89.0],
  [132, 65.5],
  [133, 48.3],
  [134, 35.7],
  [135, 26.4],
  [136, 19.5],
  [137, 14.5],
  [138, 10.8],
  [139, 8.0],
  [140, 6.0],
  [141, 4.5],
  [142, 3.4],
  [143, 2.6],
  [144, 2.0],
  [145, 1.5],
  [146, 1.2],
  [147, 1.0],
];

function _interpolateHoldMinutes(T_F) {
  if (T_F < SOUS_VIDE_HOLD_TABLE_F[0][0]) return null;
  const top = SOUS_VIDE_HOLD_TABLE_F[SOUS_VIDE_HOLD_TABLE_F.length - 1];
  if (T_F >= top[0]) return Math.max(0.5, top[1]);
  for (let i = 0; i < SOUS_VIDE_HOLD_TABLE_F.length - 1; i++) {
    const [t1, h1] = SOUS_VIDE_HOLD_TABLE_F[i];
    const [t2, h2] = SOUS_VIDE_HOLD_TABLE_F[i + 1];
    if (T_F >= t1 && T_F <= t2) {
      const frac = (T_F - t1) / (t2 - t1);
      return h1 + frac * (h2 - h1);
    }
  }
  return null;
}

// dims: in { category: dimensionless, thickness_in: L, bath_temperature_F: T, initial_temperature_F: T }
//        out: { come_up_minutes: T, hold_minutes: T, total_minutes: T, diffusivity_m2_per_s: L^2 T^-1, warnings: dimensionless }
// (Heisler-slab come-up uses alpha [L^2 T^-1] * time [T] = L^2 (slab
// half-thickness squared), so the come-up and hold both surface as `T`.)
export function computeSousVidePasteurization({
  category = "beef",
  thickness_in = 0,
  bath_temperature_F = 0,
  initial_temperature_F = 38,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cat = SOUS_VIDE_DIFFUSIVITY[category];
  if (!cat) return { error: "Unknown food category. Use poultry / pork / beef / fish / egg." };
  const thickness = Number(thickness_in) || 0;
  const T_bath = Number(bath_temperature_F);
  const T_init = Number(initial_temperature_F);
  if (!(thickness > 0)) return { error: "Thickness must be positive (in)." };
  if (!Number.isFinite(T_bath) || T_bath < 100) return { error: "Bath temperature must be a number >= 100 F." };
  if (!Number.isFinite(T_init)) return { error: "Initial temperature must be a number." };
  if (T_init >= T_bath) return { error: "Initial temperature must be below bath temperature." };

  // Slab half-thickness in meters. 1 in = 0.0254 m. The slab model
  // treats heating from both sides (typical sous-vide bag in water),
  // so the relevant half-thickness is thickness / 2.
  const L_m = (thickness * 0.0254) / 2;
  // Heisler-chart approximation at Fo ~ 0.4 for ~99.5% temperature
  // approach at the slab centerline.
  const come_up_seconds = (0.4 * L_m * L_m) / cat.alpha;
  const come_up_minutes = come_up_seconds / 60;

  const hold_minutes = _interpolateHoldMinutes(T_bath);
  if (hold_minutes === null) {
    return {
      error: "Bath temperature " + T_bath + " F is below the FDA Annex 6 minimum (130 F). Pasteurization is not achievable at this temperature within reasonable time.",
    };
  }
  const total_minutes = come_up_minutes + hold_minutes;

  const warnings = [
    "Field thermometer at the geometric center of the thickest piece is the verdict; this is a planning estimate only.",
    "FDA Food Code Annex 6 Table A 6.5-log Salmonella reduction values. Other pathogens may require different times.",
  ];
  if (thickness > 4) warnings.push("Thickness above 4 in is outside the Heisler-slab approximation; come-up time may be longer than estimated.");
  if (T_bath >= 147) warnings.push("Bath temperature " + T_bath + " F is above the typical Annex 6 break-point range; hold reduces to ~1 min but texture suffers above 145 F for most cuts.");

  return {
    come_up_minutes,
    hold_minutes,
    total_minutes,
    bath_temperature_F: T_bath,
    category,
    category_label: cat.label,
    diffusivity_m2_per_s: cat.alpha,
    warnings,
  };
}

export const sousVidePasteurizationExample = {
  // 1-inch chicken breast in a 140 F bath, refrigerated initial 38 F.
  // L = 0.5 in = 0.0127 m -> Fo=0.4 t = 0.4 * 0.0127^2 / 1.4e-7
  //   = 0.4 * 1.6129e-4 / 1.4e-7 = 460.83 s = 7.68 min come-up
  // Hold at 140 F = 6.0 min. Total ~13.7 min.
  inputs: { category: "poultry", thickness_in: 1.0, bath_temperature_F: 140, initial_temperature_F: 38 },
};

import { renderLimitationBanner as _v9sv_banner, getLimitationCopy as _v9sv_copy } from "./limitation-banner.js";

function renderSousVidePasteurization(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per FDA Food Code Annex 6 Table A 6.5-log Salmonella reduction values. Come-up time from the slab-form thermal-diffusion approximation (Heisler chart at centerline, Fo ~ 0.4). Bundled food-thermal-diffusivity values per public engineering references (Baldwin Practical Guide to Sous Vide Cooking). Local food-safety authority and a qualified processing authority govern commercial-kitchen use. Free at fda.gov/food/retail-food-protection/fda-food-code.";
  _v9sv_banner(inputRegion, _v9sv_copy("sous-vide-pasteurization"));

  const c = makeSelect("Food category", "sv-c",
    Object.keys(SOUS_VIDE_DIFFUSIVITY).map((k) => ({ value: k, label: SOUS_VIDE_DIFFUSIVITY[k].label, selected: k === "poultry" })),
  );
  const th = makeNumber("Thickness (in; full slab, not half)", "sv-th", { step: "any", min: "0" });
  const tb = makeNumber("Bath temperature (F)", "sv-tb", { step: "any", min: "100" });
  const ti = makeNumber("Initial food temperature (F; must be below bath; come-up time assumes a refrigerated start)", "sv-ti", { step: "any", value: "38" });
  ti.input.value = "38";
  for (const f of [c, th, tb, ti]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    c.select.value = "poultry"; th.input.value = "1.0"; tb.input.value = "140"; ti.input.value = "38"; update();
  });

  const oCU = makeOutputLine(outputRegion, "Come-up time (min)", "sv-out-cu");
  const oH = makeOutputLine(outputRegion, "Hold time at bath temp (min)", "sv-out-h");
  const oT = makeOutputLine(outputRegion, "Total time (min)", "sv-out-t");
  const oW = makeOutputLine(outputRegion, "Notes", "sv-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeSousVidePasteurization({
      category: c.select.value,
      thickness_in: readNum(th.input),
      bath_temperature_F: readNum(tb.input),
      initial_temperature_F: readNum(ti.input),
    });
    if (r.error) {
      oCU.textContent = r.error; oH.textContent = ""; oT.textContent = ""; oW.textContent = "";
      return;
    }
    oCU.textContent = fmt(r.come_up_minutes, 1) + " min";
    oH.textContent = fmt(r.hold_minutes, 1) + " min";
    oT.textContent = fmt(r.total_minutes, 1) + " min";
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [c.select, th.input, tb.input, ti.input]) f.addEventListener("input", update);
}

export const KITCHEN_RENDERERS = {
  "recipe-scale":   renderRecipeScale,
  "yield-ep":       renderYieldEP,
  "cooling-curve":  renderCoolingCurve,
  "plate-cost":     renderPlateCost,
  "pan-conversion": renderPanConversion,
  // v9
  "sous-vide-pasteurization": renderSousVidePasteurization,
};

// ===========================================================================
// spec-v20 Phase O - brine / cure concentration (v18/v21 tile contract).
// ===========================================================================

// --- v20 O.1: Brine / cure concentration (`brine-cure`) ---
// brine% = salt/(salt+water)*100; equilibrium salt% = salt/(meat+water)*100;
// equilibrium ingoing nitrite ppm = cure*0.0625*1e6/meat (green meat weight, 9 CFR 424.22);
// brine nitrite ppm = cure*0.0625*1e6/(salt+water+cure); salt-to-add = target%*total/100 - salt.
// dims: in { mode: dimensionless, water_g: M, salt_g: M, meat_g: M, cure_g: M, target_pct: dimensionless } out: { concentration_pct: dimensionless, nitrite_ppm: dimensionless }
export function computeBrineCure({ mode = "brine", water_g = 0, salt_g = 0, meat_g = 0, cure_g = 0, target_pct = 0 } = {}) {
  const water = Number(water_g) || 0;
  const salt = Number(salt_g) || 0;
  const meat = Number(meat_g) || 0;
  const cure = Number(cure_g) || 0;
  const target = Number(target_pct) || 0;
  if (water < 0 || salt < 0 || meat < 0 || cure < 0 || !Number.isFinite(water) || !Number.isFinite(salt) || !Number.isFinite(meat) || !Number.isFinite(cure)) return { error: "Weights must be non-negative finite numbers (g)." };
  const NITRITE_FRACTION = 0.0625; // Prague Powder #1 is 6.25% sodium nitrite
  const FSIS_INGOING_MAX_PPM = 156; // typical regulated ingoing maximum (user confirms current limit)
  let concentration, total;
  if (mode === "equilibrium") {
    total = meat + water + salt + cure;
    if (!(meat + water > 0)) return { error: "Enter meat (and any water) weight for an equilibrium cure." };
    concentration = salt / (meat + water) * 100;
  } else {
    total = salt + water + cure;
    if (!(salt + water > 0)) return { error: "Enter salt and water weight for a brine." };
    concentration = salt / (salt + water) * 100;
  }
  // Ingoing nitrite ppm. For an equilibrium cure the regulated basis is the GREEN WEIGHT OF THE
  // MEAT (9 CFR 424.22): all the nitrite ends up in the meat, so 2.5 g Cure #1 / 1 kg meat = 156 ppm.
  // (Dividing by the whole batch weight -- meat + water + salt + cure -- understated it and could clear
  // the 156 ppm limit when the meat basis is at/over it.) For a brine, ppm is the nitrite concentration
  // in the pickle (its own total), which the meat then takes up at an uptake the operator controls.
  const nitriteBasis = mode === "equilibrium" ? meat : total;
  const nitritePpm = nitriteBasis > 0 && cure > 0 ? cure * NITRITE_FRACTION * 1e6 / nitriteBasis : 0;
  const saltToAdd = target > 0 ? target * total / 100 - salt : null;
  return {
    concentration_pct: Number.isFinite(concentration) ? concentration : null,
    nitrite_ppm: Number.isFinite(nitritePpm) ? nitritePpm : null,
    nitrite_over_max: nitritePpm >= FSIS_INGOING_MAX_PPM,
    salt_to_add_g: saltToAdd != null && Number.isFinite(saltToAdd) ? saltToAdd : null,
    note: (nitritePpm >= FSIS_INGOING_MAX_PPM ? "Ingoing nitrite is at or above the regulated maximum - reduce cure (confirm the current FSIS limit). " : "")
      + "Salt % by weight (not by volume). Equilibrium cure assumes full absorption (real uptake varies). Prague Powder #1 is 6.25% sodium nitrite.",
  };
}
export const brineCureExample = { inputs: { mode: "equilibrium", water_g: 0, salt_g: 25, meat_g: 1000, cure_g: 2.5, target_pct: 0 } };

function renderBrineCure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles mass-fraction chemistry. Prague Powder #1 is 6.25% sodium nitrite; finished-product ingoing nitrite is limited per USDA FSIS regulation (9 CFR 424.21/424.22, by name) - the user confirms the current FSIS limit. Free at fsis.usda.gov and ecfr.gov.";
  const mode = makeSelect("Mode", "bc-mode", [{ value: "brine", label: "Brine by volume", selected: true }, { value: "equilibrium", label: "Equilibrium cure by weight" }]);
  const meat = makeNumber("Meat weight (g, equilibrium)", "bc-meat", { step: "any", min: "0" });
  const water = makeNumber("Water weight (g)", "bc-water", { step: "any", min: "0" });
  const salt = makeNumber("Salt added (g)", "bc-salt", { step: "any", min: "0", value: "25" }); salt.input.value = "25";
  const cure = makeNumber("Cure #1 (g, 6.25% nitrite, optional)", "bc-cure", { step: "any", min: "0" });
  const target = makeNumber("Target salt % (optional)", "bc-target", { step: "any", min: "0" });
  for (const f of [mode, meat, water, salt, cure, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "equilibrium"; meat.input.value = "1000"; water.input.value = ""; salt.input.value = "25"; cure.input.value = "2.5"; target.input.value = ""; update(); });
  const oConc = makeOutputLine(outputRegion, "Concentration", "bc-out-conc");
  const oNitrite = makeOutputLine(outputRegion, "Finished nitrite", "bc-out-nit");
  const oNote = makeOutputLine(outputRegion, "Note", "bc-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBrineCure({ mode: mode.select.value, water_g: readNum(water.input), salt_g: readNum(salt.input), meat_g: readNum(meat.input), cure_g: readNum(cure.input), target_pct: readNum(target.input) });
    if (r.error) { oConc.textContent = r.error; oNitrite.textContent = ""; oNote.textContent = ""; return; }
    oConc.textContent = fmt(r.concentration_pct, 2) + "% salt" + (r.salt_to_add_g != null ? " (add " + fmt(r.salt_to_add_g, 1) + " g for target)" : "");
    oNitrite.textContent = r.nitrite_ppm > 0 ? fmt(r.nitrite_ppm, 0) + " ppm nitrite" + (r.nitrite_over_max ? " (AT/OVER MAX)" : "") : "No cure entered";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mode.select, meat.input, water.input, salt.input, cure.input, target.input]) f.addEventListener("input", update);
}
KITCHEN_RENDERERS["brine-cure"] = renderBrineCure;

// =====================================================================
// spec-v50 O - bakers-percentage (Baker's Percentage / Dough Hydration)
// The bakery / pizzeria formulation method: flour is 100%, every other
// ingredient is its weight as a percent of total flour, and hydration is
// water as a percent of flour. From flour weight + percentages, compute
// each ingredient weight, total dough weight, and per-piece weight. This
// is the method recipe-scale explicitly does NOT do (its renderer warns
// "bakers' percentages do not scale linearly"). First-principles arithmetic.
// =====================================================================

// dims: in { flour_g: M, hydration_pct: dimensionless, salt_pct: dimensionless, yeast_pct: dimensionless, other_pct: dimensionless, pieces: dimensionless } out: { water_g: M, salt_g: M, yeast_g: M, total_dough_g: M, total_pct: dimensionless }
export function computeBakersPercentage({ flour_g = 0, hydration_pct = 0, salt_pct = 0, yeast_pct = 0, other_pct = 0, pieces = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flour = Number(flour_g) || 0;
  if (!(flour > 0)) return { error: "Flour weight must be positive (g)." };
  const hyd = Number(hydration_pct) || 0, salt = Number(salt_pct) || 0, yeast = Number(yeast_pct) || 0, other = Number(other_pct) || 0;
  for (const [k, v] of [["Hydration", hyd], ["Salt", salt], ["Yeast / leaven", yeast], ["Other", other]]) {
    if (v < 0) return { error: k + " percent cannot be negative." };
  }
  const G_PER_OZ = 28.349523125;
  const water_g = flour * hyd / 100;
  const salt_g = flour * salt / 100;
  const yeast_g = flour * yeast / 100;
  const other_g = flour * other / 100;
  const total_dough_g = flour + water_g + salt_g + yeast_g + other_g;
  const total_pct = 100 + hyd + salt + yeast + other;
  const n = Math.round(Number(pieces) || 0);
  const per_piece_g = n >= 1 ? total_dough_g / n : null;
  const notes = [];
  notes.push("Baker's percentage: flour is 100%, every ingredient is its weight as a percent of total flour, and hydration is water as a percent of flour. Ingredient weight = flour x percent / 100; total dough = the sum.");
  notes.push("Yeast / leaven amount and ferment time depend on the leaven type, temperature, and schedule (instant yeast around 0.5-1%, more for a quick rise, less for a long cold ferment); salt is typically about 2% of flour. Verify against your formula.");
  return {
    flour_g: flour, hydration_pct: hyd,
    water_g, salt_g, yeast_g, other_g,
    water_oz: water_g / G_PER_OZ,
    total_dough_g, total_dough_oz: total_dough_g / G_PER_OZ,
    total_pct, pieces: n >= 1 ? n : null, per_piece_g,
    notes,
  };
}
export const bakersPercentageExample = { inputs: { flour_g: 1000, hydration_pct: 65, salt_pct: 2, yeast_pct: 1, other_pct: 0, pieces: 4 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderBakersPercentage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Baker's percentage (baker's math) - flour = 100%, each ingredient is its weight as a percent of flour, hydration = water / flour - the standard bakery / pizzeria formulation method; first-principles arithmetic, public domain. Yeast amount and ferment time are leaven / temperature / schedule specific.";
  const flour = makeNumber("Total flour (g, = 100%)", "bp-flour", { step: "any", min: "0" });
  const hyd = makeNumber("Hydration (water, % of flour)", "bp-hyd", { step: "any", min: "0" });
  const salt = makeNumber("Salt (% of flour)", "bp-salt", { step: "any", min: "0" });
  const yeast = makeNumber("Yeast / leaven (% of flour)", "bp-yeast", { step: "any", min: "0" });
  const other = makeNumber("Other (oil, sugar, etc., % of flour)", "bp-other", { step: "any", min: "0" });
  const pieces = makeNumber("Number of pieces (optional)", "bp-pieces", { step: "1", min: "0" });
  for (const f of [flour, hyd, salt, yeast, other, pieces]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flour.input.value = "1000"; hyd.input.value = "65"; salt.input.value = "2"; yeast.input.value = "1"; other.input.value = ""; pieces.input.value = "4"; update(); });
  const oIng = makeOutputLine(outputRegion, "Ingredient weights", "bp-out-ing");
  const oTotal = makeOutputLine(outputRegion, "Total dough", "bp-out-total");
  const oPiece = makeOutputLine(outputRegion, "Per piece", "bp-out-piece");
  const oNote = makeOutputLine(outputRegion, "Notes", "bp-out-note");
  const update = debounce(() => {
    const r = computeBakersPercentage({ flour_g: Number(flour.input.value) || 0, hydration_pct: Number(hyd.input.value) || 0, salt_pct: Number(salt.input.value) || 0, yeast_pct: Number(yeast.input.value) || 0, other_pct: Number(other.input.value) || 0, pieces: Number(pieces.input.value) || 0 });
    if (r.error) { oIng.textContent = r.error; oTotal.textContent = "-"; oPiece.textContent = "-"; oNote.textContent = ""; return; }
    let ing = "flour " + fmt(r.flour_g, 1) + " g, water " + fmt(r.water_g, 1) + " g, salt " + fmt(r.salt_g, 1) + " g, yeast " + fmt(r.yeast_g, 1) + " g";
    if (r.other_g > 0) ing += ", other " + fmt(r.other_g, 1) + " g";
    oIng.textContent = ing;
    oTotal.textContent = fmt(r.total_dough_g, 1) + " g (" + fmt(r.total_dough_oz, 2) + " oz), total formula " + fmt(r.total_pct, 1) + "%";
    oPiece.textContent = r.per_piece_g === null ? "(enter a piece count)" : fmt(r.per_piece_g, 1) + " g per piece x " + r.pieces;
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [flour.input, hyd.input, salt.input, yeast.input, other.input, pieces.input]) f.addEventListener("input", update);
}
KITCHEN_RENDERERS["bakers-percentage"] = renderBakersPercentage;

// =====================================================================
// spec-v90 O - food-service cost control: food-cost-percentage,
// prime-cost, pour-cost. The numbers an operator runs after service off
// the inventory sheet and the bar to find out whether the plates make
// money. Standard restaurant-accounting identities (COGS = beginning +
// purchases - ending; prime = COGS + labor) and the US fluid-ounce
// (29.5735 mL). GOVERNANCE.general (business arithmetic, not food safety).
// =====================================================================

// dims: in { beginning_inventory: dimensionless, purchases: dimensionless, ending_inventory: dimensionless, food_sales: dimensionless, theoretical_cost_pct: dimensionless } out: { cogs: dimensionless, food_cost_pct: dimensionless }
// (Dollar amounts are dimensionless money per spec-v14; percent is dimensionless.)
export function computeFoodCostPercentage({ beginning_inventory = 0, purchases = 0, ending_inventory = 0, food_sales = 0, theoretical_cost_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (beginning_inventory < 0 || purchases < 0 || ending_inventory < 0 || theoretical_cost_pct < 0) return { error: "Dollar and percent inputs must be non-negative." };
  if (!(food_sales > 0)) return { error: "Food sales must be positive." };
  const cogs = beginning_inventory + purchases - ending_inventory;
  const food_cost_pct = cogs / food_sales * 100;
  const variance_pts = theoretical_cost_pct > 0 ? food_cost_pct - theoretical_cost_pct : null;
  const variance_dollars = theoretical_cost_pct > 0 ? (food_cost_pct - theoretical_cost_pct) / 100 * food_sales : null;
  return {
    cogs, food_cost_pct,
    variance_pts: variance_pts != null && Number.isFinite(variance_pts) ? variance_pts : null,
    variance_dollars: variance_dollars != null && Number.isFinite(variance_dollars) ? variance_dollars : null,
    note: "Actual food cost from the inventory count - the gap a per-plate recipe cost (plate-cost) cannot see: waste, theft, over-portioning, spoilage, vendor price creep. Full-service food cost often runs 28-35% of food sales; your target is your own. Count and value inventory the same way every period. A variance over about 1-2 points is worth a walk through the walk-in.",
  };
}
const foodCostPercentageExample = { inputs: { beginning_inventory: 12000, purchases: 30000, ending_inventory: 10000, food_sales: 120000, theoretical_cost_pct: 30 } };
const renderFoodCostPercentage = _r({
  citation: "Citation: Standard restaurant-accounting identity COGS = beginning inventory + purchases - ending inventory (NRA / restaurant P&L practice, by name). Food cost % = COGS / food sales.",
  example: foodCostPercentageExample.inputs,
  fields: [
    { key: "beginning_inventory", label: "Beginning inventory ($)", kind: "number" },
    { key: "purchases", label: "Purchases ($)", kind: "number" },
    { key: "ending_inventory", label: "Ending inventory ($)", kind: "number" },
    { key: "food_sales", label: "Food sales ($)", kind: "number" },
    { key: "theoretical_cost_pct", label: "Theoretical food cost (%, optional)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "fcp-out-c", label: "COGS", value: (r) => "$" + fmt(r.cogs, 2) },
    { key: "p", id: "fcp-out-p", label: "Food cost", value: (r) => fmt(r.food_cost_pct, 2) + "%" },
    { key: "v", id: "fcp-out-v", label: "Variance", value: (r) => r.variance_pts === null ? "-" : fmt(r.variance_pts, 2) + " pts" },
    { key: "d", id: "fcp-out-d", label: "Variance ($)", value: (r) => r.variance_dollars === null ? "-" : "$" + fmt(r.variance_dollars, 2) },
    { key: "n", id: "fcp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFoodCostPercentage,
});
KITCHEN_RENDERERS["food-cost-percentage"] = renderFoodCostPercentage;

// dims: in { food_cost: dimensionless, beverage_cost: dimensionless, labor_cost: dimensionless, total_sales: dimensionless } out: { prime_cost: dimensionless, prime_cost_pct: dimensionless }
export function computePrimeCost({ food_cost = 0, beverage_cost = 0, labor_cost = 0, total_sales = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (food_cost < 0 || beverage_cost < 0 || labor_cost < 0) return { error: "Cost inputs must be non-negative." };
  if (!(total_sales > 0)) return { error: "Total sales must be positive." };
  const cogs_total = food_cost + beverage_cost;
  const prime_cost = cogs_total + labor_cost;
  return {
    cogs_total, prime_cost,
    prime_cost_pct: prime_cost / total_sales * 100,
    labor_pct: labor_cost / total_sales * 100,
    cogs_pct: cogs_total / total_sales * 100,
    note: "Prime cost (COGS plus labor) is the cost you control - rent, utilities, and the other fixed costs come out of what is left. The rule of thumb keeps prime at or below about 60% of sales full-service (nearer 55% limited-service); much above 65% leaves little for profit. Labor here is all-in (wages, payroll taxes, benefits). Track it weekly - by month-end the labor is already spent.",
  };
}
const primeCostExample = { inputs: { food_cost: 32000, beverage_cost: 8000, labor_cost: 42000, total_sales: 140000 } };
const renderPrimeCost = _r({
  citation: "Citation: Standard restaurant P&L prime-cost definition prime cost = COGS + total labor (NRA / restaurant-accounting practice, by name). Percents are of total sales.",
  example: primeCostExample.inputs,
  fields: [
    { key: "food_cost", label: "Food COGS ($)", kind: "number" },
    { key: "beverage_cost", label: "Beverage COGS ($)", kind: "number" },
    { key: "labor_cost", label: "Total labor ($, all-in)", kind: "number" },
    { key: "total_sales", label: "Total sales ($)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "pcst-out-c", label: "Total COGS", value: (r) => "$" + fmt(r.cogs_total, 2) },
    { key: "p", id: "pcst-out-p", label: "Prime cost", value: (r) => "$" + fmt(r.prime_cost, 2) + " (" + fmt(r.prime_cost_pct, 2) + "%)" },
    { key: "l", id: "pcst-out-l", label: "Labor", value: (r) => fmt(r.labor_pct, 2) + "%" },
    { key: "g", id: "pcst-out-g", label: "COGS", value: (r) => fmt(r.cogs_pct, 2) + "%" },
    { key: "n", id: "pcst-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePrimeCost,
});
KITCHEN_RENDERERS["prime-cost"] = renderPrimeCost;

// dims: in { bottle_cost: dimensionless, bottle_size_ml: L, pour_size_oz: L, target_pour_cost_pct: dimensionless, other_cost_per_drink: dimensionless } out: { pours_per_bottle: dimensionless, suggested_price: dimensionless }
export function computePourCost({ bottle_cost = 0, bottle_size_ml = 0, pour_size_oz = 0, target_pour_cost_pct = 0, other_cost_per_drink = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (other_cost_per_drink < 0) return { error: "Per-drink add must be non-negative." };
  if (!(bottle_cost > 0)) return { error: "Bottle cost must be positive." };
  if (!(bottle_size_ml > 0)) return { error: "Bottle size must be positive." };
  if (!(pour_size_oz > 0)) return { error: "Pour size must be positive." };
  if (!(target_pour_cost_pct > 0)) return { error: "Target pour cost must be positive." };
  const ML_PER_OZ = 29.5735; // US fluid ounce
  const pours_per_bottle = bottle_size_ml / (pour_size_oz * ML_PER_OZ);
  const cost_per_pour = bottle_cost / pours_per_bottle;
  const drink_cost = cost_per_pour + other_cost_per_drink;
  const suggested_price = drink_cost / (target_pour_cost_pct / 100);
  return {
    pours_per_bottle, cost_per_pour, drink_cost, suggested_price,
    note: "Pour cost is the drink's cost over its price; spirits typically run 18-24% (beer and wine higher). A free-pour bartender easily gives away a half-ounce on a 1.5-oz spec, which quietly wrecks the pour cost - a jigger or measured pourer pays for itself. The bottle size is the usable volume; fold mixers, garnish, ice, and spillage into the optional per-drink add; round the suggested price to a sensible menu number.",
  };
}
const pourCostExample = { inputs: { bottle_cost: 24, bottle_size_ml: 750, pour_size_oz: 1.5, target_pour_cost_pct: 20, other_cost_per_drink: 0.25 } };
const renderPourCost = _r({
  citation: "Citation: First-principles bar cost control. Pours per bottle = bottle size / (pour x 29.5735 mL/oz); suggested price = drink cost / target pour cost.",
  example: pourCostExample.inputs,
  fields: [
    { key: "bottle_cost", label: "Bottle cost ($)", kind: "number" },
    { key: "bottle_size_ml", label: "Bottle size (mL)", kind: "number" },
    { key: "pour_size_oz", label: "House pour (oz)", kind: "number" },
    { key: "target_pour_cost_pct", label: "Target pour cost (%)", kind: "number" },
    { key: "other_cost_per_drink", label: "Garnish / mixer ($/drink, optional)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "pour-out-b", label: "Pours per bottle", value: (r) => fmt(r.pours_per_bottle, 2) },
    { key: "c", id: "pour-out-c", label: "Cost per pour", value: (r) => "$" + fmt(r.cost_per_pour, 2) },
    { key: "d", id: "pour-out-d", label: "Drink cost", value: (r) => "$" + fmt(r.drink_cost, 2) },
    { key: "s", id: "pour-out-s", label: "Suggested price", value: (r) => "$" + fmt(r.suggested_price, 2) },
    { key: "n", id: "pour-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePourCost,
});
KITCHEN_RENDERERS["pour-cost"] = renderPourCost;

// --- spec-v537 O: Menu engineering matrix (`menu-engineering`) ---
// Kasavana-Smith: quadrant from contribution-margin dollars vs average, popularity share vs (1/item_count)x0.70.
// dims: in { units_sold: dimensionless, menu_price: dimensionless, food_cost: dimensionless, total_units: dimensionless, item_count: dimensionless, average_margin: dimensionless } out: { contribution_margin: dimensionless, popularity_share: dimensionless, popularity_threshold: dimensionless }
export function computeMenuEngineering({ units_sold = 0, menu_price = 0, food_cost = 0, total_units = 0, item_count = 0, average_margin = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const units = Number(units_sold) || 0;
  const price = Number(menu_price) || 0;
  const fcost = Number(food_cost) || 0;
  const total = Number(total_units) || 0;
  const items = Number(item_count) || 0;
  const avg = Number(average_margin) || 0;
  if (!(total > 0)) return { error: "Total units sold must be positive." };
  if (!(items > 0)) return { error: "Item count must be positive." };
  if (units < 0) return { error: "Units sold must be non-negative." };
  if (price < fcost) return { error: "Menu price cannot be below the food cost (negative margin)." };
  const contribution_margin = price - fcost;
  const popularity_share = units / total;
  const popularity_threshold = (1 / items) * 0.70;
  const high_margin = contribution_margin >= avg;
  const high_pop = popularity_share >= popularity_threshold;
  const quadrant = high_margin && high_pop ? "Star"
    : !high_margin && high_pop ? "Plowhorse"
    : high_margin && !high_pop ? "Puzzle" : "Dog";
  const action = { Star: "Promote and protect the recipe.", Plowhorse: "Popular but thin - gently reprice or re-portion.", Puzzle: "Profitable but slow - reposition, rename, or feature it.", Dog: "Low margin and low sales - consider cutting or reworking." }[quadrant];
  return {
    contribution_margin, popularity_share, popularity_threshold, high_margin, high_pop, quadrant, action,
    note: "The margin axis is contribution-margin dollars, not food-cost percent - a low-food-cost item can still be a Dog if it earns few dollars. Popularity is judged against the menu-average share times the 0.70 rule. The classification needs the full sales mix, not a single dish. The operator's cost and pricing data govern.",
  };
}
const menuEngineeringExample = { inputs: { units_sold: 200, menu_price: 12, food_cost: 4, total_units: 1000, item_count: 10, average_margin: 6 } };
const renderMenuEngineering = _r({
  citation: "Citation: Kasavana & Smith menu-engineering model, by name. contribution_margin = price - food_cost; popularity_share = units_sold / total_units; popularity_threshold = (1 / item_count) x 0.70; quadrant from margin vs average and popularity vs threshold. The margin axis is contribution-margin dollars, not food-cost percent. Needs the full sales mix; the operator's data govern.",
  example: menuEngineeringExample.inputs,
  fields: [
    { key: "units_sold", label: "This item's units sold", kind: "number" },
    { key: "menu_price", label: "Menu price ($)", kind: "number" },
    { key: "food_cost", label: "Plate food cost ($)", kind: "number" },
    { key: "total_units", label: "Total units sold (all items)", kind: "number" },
    { key: "item_count", label: "Number of menu items", kind: "number" },
    { key: "average_margin", label: "Menu average contribution margin ($)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "menu-out-q", label: "Quadrant", value: (r) => r.quadrant + " - " + r.action },
    { key: "m", id: "menu-out-m", label: "Contribution margin", value: (r) => "$" + fmt(r.contribution_margin, 2) + (r.high_margin ? " (high)" : " (low)") },
    { key: "p", id: "menu-out-p", label: "Popularity share", value: (r) => fmt(r.popularity_share * 100, 1) + "% vs " + fmt(r.popularity_threshold * 100, 1) + "% threshold" + (r.high_pop ? " (high)" : " (low)") },
    { key: "n", id: "menu-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMenuEngineering,
});
KITCHEN_RENDERERS["menu-engineering"] = renderMenuEngineering;

// --- spec-v538 O: 3-compartment sink sanitizer dilution (`kitchen-sanitizer-ppm`) ---
// oz_per_gal = 128 x target_ppm / (active_pct x 10000). FDA Food Code 4-501.114 bands.
const SANITIZER_BANDS = {
  chlorine: { lo: 50, hi: 100, label: "chlorine", contact: "at least 7 seconds at 100 ppm (longer at lower ppm / colder water)" },
  quat: { lo: 150, hi: 400, label: "quaternary ammonium", contact: "per label, typically at least 30 seconds" },
  iodine: { lo: 12.5, hi: 25, label: "iodine", contact: "at least 30 seconds" },
};
// dims: in { sanitizer_type: dimensionless, active_pct: dimensionless, target_ppm: dimensionless, batch_gallons: dimensionless } out: { oz_per_gal: dimensionless, total_oz: dimensionless }
export function computeKitchenSanitizerPpm({ sanitizer_type = "chlorine", active_pct = 0, target_ppm = 0, batch_gallons = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const active = Number(active_pct) || 0;
  const ppm = Number(target_ppm) || 0;
  const gal = Number(batch_gallons) || 0;
  const band = SANITIZER_BANDS[sanitizer_type];
  if (!band) return { error: "Sanitizer type must be chlorine, quat, or iodine." };
  if (!(active > 0)) return { error: "Active-ingredient percent must be positive." };
  if (!(ppm > 0)) return { error: "Target ppm must be positive." };
  if (!(gal > 0)) return { error: "Batch volume must be positive (gallons)." };
  const oz_per_gal = 128 * ppm / (active * 10000);
  const total_oz = oz_per_gal * gal;
  const in_range = ppm >= band.lo && ppm <= band.hi;
  return {
    oz_per_gal, total_oz, in_range, band_lo: band.lo, band_hi: band.hi, contact_time: band.contact,
    note: (in_range ? "" : "Target ppm is outside the FDA Food Code " + band.label + " band (" + band.lo + "-" + band.hi + " ppm). ")
      + "Chlorine's required concentration rises as water gets colder or more alkaline (the Food Code table steps ppm up by temperature and pH, so a fixed dose can under-sanitize); quats are inactivated by hot or hard water. Confirm the concentration with test strips and observe the minimum contact time (" + band.contact + "). The EPA-registered product label is the legal authority.",
  };
}
const kitchenSanitizerPpmExample = { inputs: { sanitizer_type: "chlorine", active_pct: 5.25, target_ppm: 100, batch_gallons: 3 } };
const renderKitchenSanitizerPpm = _r({
  citation: "Citation: FDA Food Code Sec. 4-501.114 sanitizing-solution concentrations, by name. oz_per_gal = 128 x target_ppm / (active_pct x 10000); total_oz = oz_per_gal x gallons. Food Code bands: chlorine 50-100 ppm, quat ~200 ppm per label, iodine 12.5-25 ppm. Chlorine's required ppm rises with colder or more alkaline water; quats weaken in hot or hard water. Confirm with test strips; the EPA-registered product label is the legal authority.",
  example: kitchenSanitizerPpmExample.inputs,
  fields: [
    { key: "sanitizer_type", label: "Sanitizer type", kind: "select", options: [{ value: "chlorine", label: "Chlorine (50-100 ppm)" }, { value: "quat", label: "Quaternary ammonium (~200 ppm)" }, { value: "iodine", label: "Iodine (12.5-25 ppm)" }] },
    { key: "active_pct", label: "Concentrate active (%)", kind: "number" },
    { key: "target_ppm", label: "Target concentration (ppm)", kind: "number" },
    { key: "batch_gallons", label: "Sink compartment volume (gal)", kind: "number" },
  ],
  outputs: [
    { key: "o", id: "ksan-out-o", label: "Concentrate per gallon", value: (r) => fmt(r.oz_per_gal, 2) + " fl oz/gal" },
    { key: "t", id: "ksan-out-t", label: "Total concentrate", value: (r) => fmt(r.total_oz, 2) + " fl oz" },
    { key: "r", id: "ksan-out-r", label: "Food Code range", value: (r) => r.in_range ? "In range (" + r.band_lo + "-" + r.band_hi + " ppm)" : "OUT of range (" + r.band_lo + "-" + r.band_hi + " ppm)" },
    { key: "c", id: "ksan-out-c", label: "Minimum contact time", value: (r) => r.contact_time },
    { key: "n", id: "ksan-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKitchenSanitizerPpm,
});
KITCHEN_RENDERERS["kitchen-sanitizer-ppm"] = renderKitchenSanitizerPpm;

// --- spec-v539 O: Cocktail final ABV with dilution (`drink-abv-dilution`) ---
// final_abv = pure_alcohol / (total + melt) x 100. standard_drinks = pure_alcohol / 0.6.
const DRINK_METHOD_DILUTION = { shaken: 28, stirred: 23, rocks: 15, neat: 0 };
// dims: in { total_volume_oz: L, weighted_abv_pct: dimensionless, method: dimensionless, dilution_pct: dimensionless } out: { pure_alcohol_oz: L, final_volume_oz: L, final_abv_pct: dimensionless, standard_drinks: dimensionless }
export function computeDrinkAbvDilution({ total_volume_oz = 0, weighted_abv_pct = 0, method = "stirred", dilution_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(total_volume_oz) || 0;
  const abv = Number(weighted_abv_pct) || 0;
  const override = Number(dilution_pct) || 0;
  if (!(vol > 0)) return { error: "Total ingredient volume must be positive (fl oz)." };
  if (!(abv >= 0 && abv <= 100)) return { error: "Weighted ABV must be between 0 and 100 percent." };
  if (override < 0) return { error: "Dilution percent must be non-negative." };
  let method_pct;
  if (override > 0) method_pct = override;
  else {
    method_pct = DRINK_METHOD_DILUTION[method];
    if (method_pct === undefined) return { error: "Method must be shaken, stirred, rocks, or neat (or supply an explicit dilution percent)." };
  }
  const pure_alcohol_oz = vol * abv / 100;
  const dilution_water_oz = vol * method_pct / 100;
  const final_volume_oz = vol + dilution_water_oz;
  const final_abv_pct = pure_alcohol_oz / final_volume_oz * 100;
  const standard_drinks = pure_alcohol_oz / 0.6;
  return {
    pure_alcohol_oz, dilution_water_oz, final_volume_oz, final_abv_pct, standard_drinks, method_pct,
    note: "Ice-melt dilution is not optional - shaking adds about 25-30% water, stirring 20-25%, lowering the ABV 15-25% and balancing the drink; a strength figure that ignores the melt overstates the pour. The serving temperature and ice type shift the actual dilution. Responsible-service practice governs (0.6 fl oz pure alcohol = one US standard drink).",
  };
}
const drinkAbvDilutionExample = { inputs: { total_volume_oz: 3, weighted_abv_pct: 32.67, method: "stirred", dilution_pct: 25 } };
const renderDrinkAbvDilution = _r({
  citation: "Citation: Cocktail dilution model (per Dave Arnold, Liquid Intelligence, by name). pure_alcohol = total_volume x weighted_abv / 100; dilution_water = total_volume x method_pct / 100; final_abv = pure_alcohol / (total + dilution) x 100; standard_drinks = pure_alcohol / 0.6. Ice-melt dilution is not optional (shaken ~28%, stirred ~23%, rocks ~15%, neat 0%); a strength figure that ignores the melt overstates the pour. Responsible-service practice governs.",
  example: drinkAbvDilutionExample.inputs,
  fields: [
    { key: "total_volume_oz", label: "Total ingredient volume (fl oz)", kind: "number" },
    { key: "weighted_abv_pct", label: "Volume-weighted ABV (%)", kind: "number" },
    { key: "method", label: "Prep method", kind: "select", options: [{ value: "shaken", label: "Shaken (~28%)" }, { value: "stirred", label: "Stirred (~23%)" }, { value: "rocks", label: "Built on rocks (~15%)" }, { value: "neat", label: "Neat / up, no ice (0%)" }] },
    { key: "dilution_pct", label: "Explicit dilution % (0 = use method)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "abv-out-p", label: "Pure alcohol", value: (r) => fmt(r.pure_alcohol_oz, 2) + " fl oz" },
    { key: "v", id: "abv-out-v", label: "Final volume", value: (r) => fmt(r.final_volume_oz, 2) + " fl oz (+" + fmt(r.dilution_water_oz, 2) + " melt)" },
    { key: "a", id: "abv-out-a", label: "Final ABV", value: (r) => fmt(r.final_abv_pct, 1) + "%" },
    { key: "d", id: "abv-out-d", label: "Standard drinks", value: (r) => fmt(r.standard_drinks, 2) },
    { key: "n", id: "abv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDrinkAbvDilution,
});
KITCHEN_RENDERERS["drink-abv-dilution"] = renderDrinkAbvDilution;

// --- spec-v782 O: Ice cream overrun by weight (`overrun-percent`) ---
// overrun% = (mix_weight - finished_weight) / finished_weight x 100 for equal volumes.
// air% = (mix_weight - finished_weight) / mix_weight x 100 (air fraction of the finished volume).
// dims: in { mix_weight_lb: M, finished_weight_lb: M } out: { overrun_pct: dimensionless, air_pct: dimensionless, meets_fda: dimensionless }
export function computeOverrunPercent({ mix_weight_lb = 0, finished_weight_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mix = Number(mix_weight_lb) || 0;
  const finished = Number(finished_weight_lb) || 0;
  if (!(mix > 0)) return { error: "Mix weight must be positive (weight of a gallon of unfrozen mix)." };
  if (!(finished > 0)) return { error: "Finished weight must be positive (weight of a gallon of frozen product)." };
  if (mix <= finished) return { error: "The mix must weigh more than the finished product for equal volumes: freezing whips in air, which lowers density." };
  const overrun_pct = (mix - finished) / finished * 100;
  const air_pct = (mix - finished) / mix * 100;
  const meets_fda = finished >= 4.5;
  let band = "economy / soft-serve";
  if (overrun_pct < 35) band = "gelato / premium (dense)";
  else if (overrun_pct < 80) band = "standard ice cream";
  return {
    overrun_pct, air_pct, meets_fda, finished_lb_per_gal: finished, band,
    note: (meets_fda ? "" : "The finished product weighs less than the FDA minimum of 4.5 lb/gal, so it cannot be labeled \"ice cream\" (21 CFR 135.110). ")
      + "Overrun is the volume of air whipped into the mix, measured here by weighing equal volumes of mix and finished product. This " + fmt(overrun_pct, 0) + "% overrun sits in the " + band + " range (gelato and premium run low, economy and soft-serve run high near 100%). Air fraction is the share of the finished volume that is air. Overrun also depends on freezer type, fat and solids, and draw temperature; the weighed cup is the shop measurement of record.",
  };
}
const overrunPercentExample = { inputs: { mix_weight_lb: 9.0, finished_weight_lb: 4.5 } };
const renderOverrunPercent = _r({
  citation: "Citation: Ice cream overrun by weight (Goff & Hartel, Ice Cream, 7th ed., by name; FDA 21 CFR 135.110 standard of identity). overrun% = (weight of mix - weight of finished) / weight of finished x 100 for equal volumes; air% = (mix - finished) / mix x 100. Federal standard: finished ice cream must weigh at least 4.5 lb/gal and contain at least 1.6 lb of total solids per gallon. Overrun bands: gelato/premium ~20-35%, standard ~50-90%, economy/soft-serve ~90-100%. The weighed cup governs; freezer type, fat, solids, and draw temperature all move the number.",
  example: overrunPercentExample.inputs,
  fields: [
    { key: "mix_weight_lb", label: "Mix weight (lb per gallon)", kind: "number" },
    { key: "finished_weight_lb", label: "Finished weight (lb per gallon)", kind: "number" },
  ],
  outputs: [
    { key: "o", id: "ovr-out-o", label: "Overrun", value: (r) => fmt(r.overrun_pct, 1) + "%" },
    { key: "a", id: "ovr-out-a", label: "Air fraction of volume", value: (r) => fmt(r.air_pct, 1) + "%" },
    { key: "f", id: "ovr-out-f", label: "Meets FDA ice-cream density", value: (r) => r.meets_fda ? "Yes (>= 4.5 lb/gal)" : "No (< 4.5 lb/gal)" },
    { key: "b", id: "ovr-out-b", label: "Overrun range", value: (r) => r.band },
    { key: "n", id: "ovr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOverrunPercent,
});
KITCHEN_RENDERERS["overrun-percent"] = renderOverrunPercent;

// --- spec-v787 O: draft beer line balancing (`draft-beer-line-balance`) ---
// System balance: applied CO2 pressure = line restriction (R x length) + rise (0.5 psi/ft)
// + faucet allowance (1 psi). Solve for the balanced line length.
// R = tubing restriction (psi/ft): 3/16" vinyl 3.0, 1/4" vinyl 0.85, 3/16" barrier 2.2, 5/16" vinyl 0.4.
const BEER_LINE_RESISTANCE = {
  vinyl_316: { r: 3.0, label: '3/16" ID vinyl' },
  vinyl_14: { r: 0.85, label: '1/4" ID vinyl' },
  barrier_316: { r: 2.2, label: '3/16" ID barrier (polyethylene)' },
  vinyl_516: { r: 0.4, label: '5/16" ID vinyl' },
};
// dims: in { applied_pressure_psi: M L^-1 T^-2, rise_ft: L, tubing_type: dimensionless } out: { line_length_ft: L, resistance_psi_per_ft: dimensionless }
export function computeDraftBeerLineBalance({ applied_pressure_psi = 0, rise_ft = 0, tubing_type = "vinyl_316" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(applied_pressure_psi) || 0;
  const rise = Number(rise_ft) || 0;
  const tube = BEER_LINE_RESISTANCE[tubing_type];
  if (!tube) return { error: "Tubing type must be one of the listed beer-line sizes." };
  if (!(P > 0)) return { error: "Applied CO2 pressure must be positive (psi)." };
  const R = tube.r;
  const line_length_ft = (P - 0.5 * rise - 1) / R;
  if (!Number.isFinite(line_length_ft)) return { error: "Line-balance math is not a finite value." };
  const balanced = line_length_ft > 0;
  return {
    line_length_ft, resistance_psi_per_ft: R, tubing_label: tube.label, balanced,
    note: (balanced ? "" : "The applied pressure barely exceeds the rise plus the ~1 psi faucet allowance, so no positive line length balances it -- raise the applied pressure, use a less restrictive (larger) line, or shorten the rise. ")
      + "Draft-beer line balancing (Brewers Association Draught Beer Quality Manual): at balance the applied CO2 pressure equals the total restriction -- the line (restriction R per foot times length), plus 0.5 psi per foot of vertical rise, plus about 1 psi at the faucet. Solve for length: line = (pressure - 0.5 x rise - 1) / R. Set the applied pressure to the beer's carbonation level first (that is fixed by style and temperature); then choose the line to balance it so the pour is not foamy (too short/fast) or flat and slow (too long). Restriction values are nominal for the listed tubing at cellar temperature; measure the actual pour rate (a 12-16 second fill of a 12 oz glass, about 1 gal in 60-90 s) and trim the line to tune it. A design aid; the dispense system and the beer govern.",
  };
}
const draftBeerLineBalanceExample = { inputs: { applied_pressure_psi: 12, rise_ft: 4, tubing_type: "vinyl_316" } };
const renderDraftBeerLineBalance = _r({
  citation: "Citation: draft-beer line balancing (Brewers Association Draught Beer Quality Manual): at balance the applied CO2 pressure = line restriction (R x length) + rise (0.5 psi/ft) + faucet (~1 psi); line = (pressure - 0.5 x rise - 1) / R. Restriction R (psi/ft): 3/16\" vinyl 3.0, 1/4\" vinyl 0.85, 3/16\" barrier 2.2, 5/16\" vinyl 0.4 (nominal, cellar temp). Set the applied pressure to the carbonation level, then balance the line; measure the pour rate and trim. A design aid; the dispense system governs.",
  example: draftBeerLineBalanceExample.inputs,
  fields: [
    { key: "applied_pressure_psi", label: "Applied CO2 pressure (psi, = carbonation level)", kind: "number" },
    { key: "rise_ft", label: "Vertical rise, keg to faucet (ft)", kind: "number" },
    { key: "tubing_type", label: "Beer line", kind: "select", options: [
      { value: "vinyl_316", label: "3/16\" ID vinyl (3.0 psi/ft)" },
      { value: "vinyl_14", label: "1/4\" ID vinyl (0.85 psi/ft)" },
      { value: "barrier_316", label: "3/16\" ID barrier (2.2 psi/ft)" },
      { value: "vinyl_516", label: "5/16\" ID vinyl (0.4 psi/ft)" },
    ] },
  ],
  outputs: [
    { key: "l", id: "beerbal-out-l", label: "Balanced line length", value: (r) => r.balanced ? fmt(r.line_length_ft, 1) + " ft of " + r.tubing_label : "no positive length balances (see note)" },
    { key: "r", id: "beerbal-out-r", label: "Line restriction", value: (r) => fmt(r.resistance_psi_per_ft, 2) + " psi/ft" },
    { key: "n", id: "beerbal-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDraftBeerLineBalance,
});
KITCHEN_RENDERERS["draft-beer-line-balance"] = renderDraftBeerLineBalance;

// ===================== spec-v1000: desired dough temperature (mixing water temp) =====================
// dims: in { args: dimensionless } out: { water_temp_f: dimensionless, factor_count: dimensionless }
export function computeDoughWaterTemperature({ desired_dough_temp_f = 75, flour_temp_f = 68, room_temp_f = 72, friction_factor_f = 24, preferment_temp_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(desired_dough_temp_f > 0)) return { error: "Desired dough temperature must be positive (F)." };
  if (!(friction_factor_f >= 0)) return { error: "Friction factor cannot be negative (F)." };
  const usePreferment = preferment_temp_f > 0;
  const factor_count = usePreferment ? 4 : 3;
  // Water temp = DDT x N minus the sum of the other N-1 temperature factors and the friction factor.
  const known = flour_temp_f + room_temp_f + friction_factor_f + (usePreferment ? preferment_temp_f : 0);
  const water_temp_f = desired_dough_temp_f * factor_count - known;
  if (!Number.isFinite(water_temp_f)) return { error: "Water-temperature math is not a finite value." };
  const practicality = water_temp_f < 33 ? "Below freezing -- use ice water (weigh ice as part of the water) or cool the flour/room." : water_temp_f > 100 ? "Very warm -- verify the friction factor; hot tap water may not reach it." : "";
  return {
    water_temp_f,
    factor_count,
    practicality,
    note: "The temperature of the mixing water to hit a target finished dough temperature (DDT), the calculation a baker runs before every mix because fermentation speed depends on dough temperature. The DDT is the sum of the temperature 'factors' that go into the dough, so the water -- the one factor the baker controls -- is the DDT multiplied by the number of factors, minus all the other known temperatures. In a straight dough there are three factors (flour, room, and the friction of mixing), so water = DDT x 3 - (flour + room + friction). Add a preferment (a poolish, biga, or levain) and there are four factors: water = DDT x 4 - (flour + room + preferment + friction). The FRICTION FACTOR is the temperature rise the mixer imparts, measured once for a given mixer and batch: roughly 0-5 F for hand mixing, and about 24-30 F for a spiral mixer at speed. To reach a 75 F DDT with 68 F flour, a 72 F room, and a 24 F friction factor, the water must be 75 x 3 - (68 + 72 + 24) = 61 F. With a 74 F preferment and a 78 F DDT at a 26 F friction factor, water = 78 x 4 - (65 + 70 + 74 + 26) = 77 F. If the answer comes out below freezing, part of the water is added as weighed ICE; if it comes out very hot, the friction factor is probably wrong. A working setpoint; the actual measured friction factor for the specific mixer and batch, and the baker's finished-dough temperature reading, govern.",
  };
}

export const doughWaterTemperatureExample = { inputs: { desired_dough_temp_f: 75, flour_temp_f: 68, room_temp_f: 72, friction_factor_f: 24, preferment_temp_f: 0 } };

KITCHEN_RENDERERS["dough-water-temperature"] = _r({
  citation: "Citation: desired dough temperature (DDT) mixing-water calculation (Hamelman / Bread Bakers Guild), by name. water = DDT x N - (sum of the other factors + friction); N = 3 (flour, room, friction) or 4 (adds a preferment). Friction factor ~0-5 F hand, ~24-30 F spiral mixer, measured per mixer. If below freezing, add weighed ice. The measured friction factor and the finished-dough reading govern.",
  example: doughWaterTemperatureExample.inputs,
  fields: [
    { key: "desired_dough_temp_f", label: "Desired dough temp DDT (F)", kind: "number", default: 75 },
    { key: "flour_temp_f", label: "Flour temp (F)", kind: "number", default: 68 },
    { key: "room_temp_f", label: "Room temp (F)", kind: "number", default: 72 },
    { key: "friction_factor_f", label: "Friction factor (F, ~24-30 spiral, 0-5 hand)", kind: "number", default: 24 },
    { key: "preferment_temp_f", label: "Preferment temp (F, 0 if none)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "w", id: "dwt-out-w", label: "Mixing water temperature", value: (r) => fmt(r.water_temp_f, 0) + " F (" + r.factor_count + "-factor)" },
    { key: "n", id: "dwt-out-n", label: "Note", value: (r) => (r.practicality ? r.practicality + " " : "") + r.note },
  ],
  compute: computeDoughWaterTemperature,
});

// ===================== spec-v1001: as-purchased quantity from edible-portion needed =====================
// dims: in { args: dimensionless } out: { ap_quantity: dimensionless, ap_units: dimensionless }
export function computeAsPurchasedQuantity({ ep_quantity_needed = 20, yield_pct = 75, unit_weight = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ep_quantity_needed > 0)) return { error: "Edible-portion quantity needed must be positive." };
  if (!(yield_pct > 0 && yield_pct <= 100)) return { error: "Yield percent must be between 0 and 100." };
  if (!(unit_weight >= 0)) return { error: "Unit weight cannot be negative." };
  // Buy MORE than you serve: AP = EP needed / yield. Optional AP units = AP quantity / weight per unit.
  const ap_quantity = ep_quantity_needed / (yield_pct / 100);
  const ap_units = unit_weight > 0 ? ap_quantity / unit_weight : null;
  if (!Number.isFinite(ap_quantity)) return { error: "As-purchased-quantity math is not a finite value." };
  return {
    ap_quantity,
    ap_units,
    note: "How much to BUY (as-purchased) to end up with a needed amount of usable, edible-portion product -- the purchasing inverse of the yield tile, which runs the other way from as-purchased to edible-portion. Trimming, peeling, boning, and cooking loss all shrink a raw ingredient, and the yield percentage is the fraction that survives to the plate, so the as-purchased quantity is the edible-portion amount DIVIDED by the yield (never multiplied): AP = EP needed / yield. To serve 20 lb of trimmed beef tenderloin at a 75% yield you must buy 20 / 0.75 = 26.67 lb; 10 lb of diced onion at an 88% yield needs 10 / 0.88 = 11.36 lb as purchased. Because you always divide by a number less than one, the purchase is always larger than what you serve, and the lower the yield the bigger the gap -- a 50% yield doubles the buy. If a unit weight is given (the weight of one case, bag, or each), dividing the AP quantity by it gives the number of units to order, rounded up in practice. A purchasing estimate; the actual yield varies with the grade, the season, and the cook's trimming, so a yield TEST on the real product governs the order.",
  };
}

export const asPurchasedQuantityExample = { inputs: { ep_quantity_needed: 20, yield_pct: 75, unit_weight: 0 } };

KITCHEN_RENDERERS["as-purchased-quantity"] = _r({
  citation: "Citation: as-purchased quantity from edible-portion needed (standard culinary math; CIA The Professional Chef, On Cooking), by name. AP = EP needed / yield (always divide, so the buy exceeds what you serve); AP units = AP / unit weight. The purchasing inverse of the yield-ep tile. The actual yield varies with grade, season, and trimming, so a yield test on the real product governs.",
  example: asPurchasedQuantityExample.inputs,
  fields: [
    { key: "ep_quantity_needed", label: "Edible-portion quantity needed (lb or each)", kind: "number", default: 20 },
    { key: "yield_pct", label: "Yield (%)", kind: "number", default: 75 },
    { key: "unit_weight", label: "Weight per purchase unit (0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "q", id: "apq-out-q", label: "As-purchased quantity", value: (r) => fmt(r.ap_quantity, 2) },
    { key: "u", id: "apq-out-u", label: "Units to order", value: (r) => r.ap_units === null ? "-" : fmt(r.ap_units, 2) + " units (round up)" },
    { key: "n", id: "apq-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAsPurchasedQuantity,
});

// ===================== spec-v1002: alcohol by volume from gravity =====================
// dims: in { args: dimensionless } out: { abv_pct: dimensionless, apparent_attenuation_pct: dimensionless }
export function computeAbvFromGravity({ original_gravity = 1.055, final_gravity = 1.012 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(original_gravity > 1)) return { error: "Original gravity must be greater than 1.000." };
  if (!(final_gravity > 0)) return { error: "Final gravity must be positive." };
  if (!(original_gravity > final_gravity)) return { error: "Original gravity must exceed the final gravity (fermentation lowers gravity)." };
  // Standard homebrew screen: ABV% = (OG - FG) x 131.25; apparent attenuation = (OG - FG)/(OG - 1).
  const abv_pct = (original_gravity - final_gravity) * 131.25;
  const apparent_attenuation_pct = (original_gravity - final_gravity) / (original_gravity - 1) * 100;
  if (![abv_pct, apparent_attenuation_pct].every(Number.isFinite)) return { error: "ABV math is not a finite value." };
  return {
    abv_pct,
    apparent_attenuation_pct,
    note: "The alcohol by volume of a fermented beer, wine, cider, or mead from its gravity readings, the number a brewer or vintner computes at the end of fermentation. Specific gravity is the density relative to water (1.000); the sugars in the unfermented wort or must push it above 1.000 (the ORIGINAL gravity), and as yeast converts sugar to alcohol and CO2 the gravity falls to the FINAL gravity. The common screen multiplies the gravity drop by 131.25: ABV% = (OG - FG) x 131.25. A beer that starts at 1.055 and finishes at 1.012 drops 0.043, so it is about 0.043 x 131.25 = 5.6% ABV. The apparent attenuation -- how much of the original extract the yeast consumed -- is the gravity drop divided by the original excess over water: (OG - FG)/(OG - 1), here 0.043/0.055 = 78%, a normal ale. A stronger wort at 1.065 finishing at 1.010 is about 7.2% ABV and 85% attenuated. The 131.25 factor is a widely used approximation; it drifts high on strong brews, where a more elaborate formula (76.08 x (OG - FG)/(1.775 - OG) x FG/0.794) tracks better, and 'apparent' attenuation reads high because dissolved alcohol is lighter than water. A working estimate; a calibrated hydrometer or refractometer (temperature-corrected) and, for anything sold, the TTB/lab method govern the label value.",
  };
}

export const abvFromGravityExample = { inputs: { original_gravity: 1.055, final_gravity: 1.012 } };

KITCHEN_RENDERERS["abv-from-gravity"] = _r({
  citation: "Citation: alcohol by volume from gravity (standard homebrew/brewing formula; Papazian, The Complete Joy of Homebrewing), by name. ABV% = (OG - FG) x 131.25; apparent attenuation = (OG - FG)/(OG - 1). The 131.25 factor is an approximation (drifts high on strong brews). A temperature-corrected hydrometer/refractometer and, for a sold product, the TTB/lab method govern the label.",
  example: abvFromGravityExample.inputs,
  fields: [
    { key: "original_gravity", label: "Original gravity (OG)", kind: "number", default: 1.055 },
    { key: "final_gravity", label: "Final gravity (FG)", kind: "number", default: 1.012 },
  ],
  outputs: [
    { key: "a", id: "abv-out-a", label: "Alcohol by volume", value: (r) => fmt(r.abv_pct, 2) + " % ABV" },
    { key: "t", id: "abv-out-t", label: "Apparent attenuation", value: (r) => fmt(r.apparent_attenuation_pct, 1) + " %" },
    { key: "n", id: "abv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAbvFromGravity,
});
