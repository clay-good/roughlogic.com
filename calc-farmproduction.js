// Group L (cont.): agricultural production, irrigation, and farm inputs.
// spec-v1859 moves these existing calculators out of calc-agriculture.js so the
// agriculture module stays below its gzip cap. Calculator behavior, IDs,
// citations, examples, and Group L assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt,
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

export const FARMPRODUCTION_RENDERERS = {};

function _r(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
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
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener("input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

// ===================== spec-v417..v419: landscape/agriculture trio (Group L) =====================

// dims: in { area_ft2: L^2, depth_in: L, bulk_density: M L^-3, bag_ft3: L^3, load_yd3: L^3, waste_pct: dimensionless } out: { yd3: L^3, bags: dimensionless, tons: M, loads: dimensionless }
export function computeMulchTopsoilVolume({ area_ft2 = 0, depth_in = 0, bulk_density = 0, bag_ft3 = 2, load_yd3 = 10, waste_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(area_ft2) || 0;
  const depth = Number(depth_in) || 0;
  const dens = Number(bulk_density) || 0;
  const bag = Number(bag_ft3) > 0 ? Number(bag_ft3) : 2;
  const load = Number(load_yd3) > 0 ? Number(load_yd3) : 10;
  const waste = Number(waste_pct) || 0;
  if (!(area > 0)) return { error: "Area must be positive (ft^2)." };
  if (!(depth > 0)) return { error: "Depth must be positive (in)." };
  if (!(dens > 0)) return { error: "Bulk density must be positive (ton/yd^3)." };
  if (waste < 0) return { error: "Waste allowance must be non-negative (%)." };
  const yd3 = area * (depth / 12) / 27 * (1 + waste / 100);
  const bags = Math.ceil(yd3 * 27 / bag - 1e-9);
  const tons = yd3 * dens;
  const loads = Math.ceil(yd3 / load - 1e-9);
  return {
    yd3, bags, tons, loads,
    note: "Bulk landscape material: cubic yards = area x (depth/12) / 27, times a waste/compaction allowance, then bagged (ceil of yd^3 x 27 / bag ft^3), weighed (yd^3 x bulk density), and trucked (ceil of yd^3 / load). Bulk densities vary: mulch about 0.5, topsoil about 1.1, and gravel about 1.4 ton/yd^3, so the same volume weighs very differently. A quantity aid; the supplier's actual bag size, load size, and product density govern.",
  };
}
export const mulchTopsoilVolumeExample = { inputs: { area_ft2: 1000, depth_in: 3, bulk_density: 1.1, bag_ft3: 2, load_yd3: 10, waste_pct: 0 } };
function renderMulchTopsoilVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bulk landscape material take-off (first-principles volume): cubic yards = area x depth / 324 (depth in inches), bags = ceil(yd^3 x 27 / bag size), tons = yd^3 x bulk density, truckloads = ceil(yd^3 / load). Bulk densities: mulch ~0.5, topsoil ~1.1, gravel ~1.4 ton/yd^3. A quantity aid; the supplier's bag/load size and product density govern.";
  const area = makeNumber("Area (ft²)", "mtv-area", { step: "any", min: "0" });
  const depth = makeNumber("Depth (in)", "mtv-depth", { step: "any", min: "0" });
  const dens = makeNumber("Bulk density (ton/yd³: mulch 0.5, topsoil 1.1, gravel 1.4)", "mtv-dens", { step: "any", min: "0" });
  const bag = makeNumber("Bag size (ft³, default 2)", "mtv-bag", { step: "any", min: "0" });
  const load = makeNumber("Truck load (yd³, default 10)", "mtv-load", { step: "any", min: "0" });
  const waste = makeNumber("Waste/compaction allowance (%)", "mtv-waste", { step: "any", min: "0" });
  for (const f of [area, depth, dens, bag, load, waste]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "1000"; depth.input.value = "3"; dens.input.value = "1.1"; bag.input.value = "2"; load.input.value = "10"; waste.input.value = "0"; update(); });
  const oYd = makeOutputLine(outputRegion, "Volume", "mtv-out-yd");
  const oBags = makeOutputLine(outputRegion, "Bags / tons / loads", "mtv-out-b");
  const oNote = makeOutputLine(outputRegion, "Note", "mtv-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMulchTopsoilVolume({ area_ft2: readNum(area.input), depth_in: readNum(depth.input), bulk_density: readNum(dens.input), bag_ft3: readNum(bag.input), load_yd3: readNum(load.input), waste_pct: readNum(waste.input) });
    if (r.error) { oYd.textContent = r.error; oBags.textContent = ""; oNote.textContent = ""; return; }
    oYd.textContent = fmt(r.yd3, 2) + " yd^3";
    oBags.textContent = r.bags + " bags / " + fmt(r.tons, 1) + " tons / " + r.loads + " load(s)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [area.input, depth.input, dens.input, bag.input, load.input, waste.input]) f.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["mulch-topsoil-volume"] = renderMulchTopsoilVolume;

// dims: in { bushels: dimensionless, lb_per_bushel: dimensionless, mi_percent: dimensionless, mf_percent: dimensionless, btu_per_lb: dimensionless, price_per_gal: dimensionless } out: { weight_lb: M, water_lb: M, energy_btu: M L^2 T^-2, propane_gal: L^3 }
export function computeGrainDryingEnergy({ bushels = 0, lb_per_bushel = 56, mi_percent = 0, mf_percent = 0, btu_per_lb = 1500, price_per_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bu = Number(bushels) || 0;
  const lbbu = Number(lb_per_bushel) || 0;
  const mi = Number(mi_percent) || 0;
  const mf = Number(mf_percent) || 0;
  const btu = Number(btu_per_lb) > 0 ? Number(btu_per_lb) : 1500;
  const price = Number(price_per_gal) || 0;
  if (!(bu > 0)) return { error: "Bushels must be positive." };
  if (!(lbbu > 0)) return { error: "Test weight must be positive (lb/bushel)." };
  if (!(mf >= 0 && mf < 100)) return { error: "Final moisture must be between 0 and 100%." };
  if (!(mi > mf)) return { error: "Initial moisture must exceed the final (target) moisture." };
  const weight_lb = bu * lbbu;
  const water_lb = weight_lb * (mi - mf) / (100 - mf);
  const energy_btu = water_lb * btu;
  const propane_gal = energy_btu / 91500;
  const cost_usd = price > 0 ? propane_gal * price : null;
  return {
    weight_lb, water_lb, energy_btu, propane_gal, cost_usd,
    note: "Grain drying energy: the water removed = wet weight x (Mi - Mf) / (100 - Mf) on the wet basis (the shrink formula), the drying energy = water x the per-pound energy (about 1500 Btu/lb including dryer efficiency), and the propane = energy / 91,500 Btu per gallon. Each moisture point removed nearer the wet end carries slightly more water, because the wet-basis denominator shrinks. A planning aid; the dryer's actual efficiency, the fuel heat content, and the market discount schedule govern.",
  };
}
export const grainDryingEnergyExample = { inputs: { bushels: 1000, lb_per_bushel: 56, mi_percent: 20, mf_percent: 15, btu_per_lb: 1500, price_per_gal: 0 } };
function renderGrainDryingEnergy(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Grain drying energy (first-principles shrink + heat balance): water removed = weight x (Mi - Mf)/(100 - Mf), energy = water x ~1500 Btu/lb (dryer efficiency included), propane = energy / 91,500 Btu/gal. A planning aid; the dryer efficiency, fuel heat content, and market discount schedule govern.";
  const bu = makeNumber("Quantity (bushels)", "gde-bu", { step: "any", min: "0" });
  const lbbu = makeNumber("Test weight (lb/bu: corn 56, wheat/soy 60)", "gde-lb", { step: "any", min: "0" });
  const mi = makeNumber("Initial moisture (%)", "gde-mi", { step: "any", min: "0" });
  const mf = makeNumber("Final moisture (%)", "gde-mf", { step: "any", min: "0" });
  const btu = makeNumber("Drying energy (Btu/lb water, default 1500)", "gde-btu", { step: "any", min: "0" });
  const price = makeNumber("Propane price ($/gal, optional)", "gde-price", { step: "any", min: "0" });
  for (const f of [bu, lbbu, mi, mf, btu, price]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bu.input.value = "1000"; lbbu.input.value = "56"; mi.input.value = "20"; mf.input.value = "15"; btu.input.value = "1500"; price.input.value = ""; update(); });
  const oWater = makeOutputLine(outputRegion, "Water removed", "gde-out-water");
  const oEnergy = makeOutputLine(outputRegion, "Energy / propane", "gde-out-energy");
  const oCost = makeOutputLine(outputRegion, "Fuel cost", "gde-out-cost");
  const oNote = makeOutputLine(outputRegion, "Note", "gde-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrainDryingEnergy({ bushels: readNum(bu.input), lb_per_bushel: readNum(lbbu.input), mi_percent: readNum(mi.input), mf_percent: readNum(mf.input), btu_per_lb: readNum(btu.input), price_per_gal: readNum(price.input) });
    if (r.error) { oWater.textContent = r.error; oEnergy.textContent = ""; oCost.textContent = ""; oNote.textContent = ""; return; }
    oWater.textContent = fmt(r.water_lb, 0) + " lb (of " + fmt(r.weight_lb, 0) + " lb)";
    oEnergy.textContent = fmt(r.energy_btu / 1e6, 2) + " million Btu, " + fmt(r.propane_gal, 0) + " gal propane";
    oCost.textContent = r.cost_usd == null ? "(enter a propane price)" : "$" + fmt(r.cost_usd, 2);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bu.input, lbbu.input, mi.input, mf.input, btu.input, price.input]) f.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["grain-drying-energy"] = renderGrainDryingEnergy;

// dims: in { crop_n_need_lb_acre: dimensionless, total_n_lb_ton: dimensionless, availability_pct: dimensionless, p2o5_lb_ton: dimensionless, k2o_lb_ton: dimensionless } out: { avail_n_per_ton: dimensionless, rate_ton_acre: dimensionless, p2o5_applied: dimensionless, k2o_applied: dimensionless }
export function computeManureNutrientApplication({ crop_n_need_lb_acre = 0, total_n_lb_ton = 0, availability_pct = 0, p2o5_lb_ton = 0, k2o_lb_ton = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const need = Number(crop_n_need_lb_acre) || 0;
  const totalN = Number(total_n_lb_ton) || 0;
  const avail = Number(availability_pct) || 0;
  const p2o5 = Number(p2o5_lb_ton) || 0;
  const k2o = Number(k2o_lb_ton) || 0;
  if (!(need > 0)) return { error: "Crop nitrogen need must be positive (lb/acre)." };
  if (!(totalN > 0)) return { error: "Manure nitrogen content must be positive (lb/ton)." };
  if (!(avail > 0 && avail <= 100)) return { error: "Availability must be between 0 and 100%." };
  if (p2o5 < 0 || k2o < 0) return { error: "Phosphate and potash content must be non-negative (lb/ton)." };
  const avail_n_per_ton = totalN * avail / 100;
  const rate_ton_acre = need / avail_n_per_ton;
  const p2o5_applied = p2o5 > 0 ? rate_ton_acre * p2o5 : null;
  const k2o_applied = k2o > 0 ? rate_ton_acre * k2o : null;
  return {
    avail_n_per_ton, rate_ton_acre, p2o5_applied, k2o_applied,
    note: "Manure application rate set by the nitrogen need: the available N per ton = total N x the first-year availability (mineralization), and the rate = crop N need / available N per ton. Meeting the N need with manure also delivers whatever P2O5 and K2O ride along, and because manure is N-poor relative to P, an N-based rate usually over-applies phosphorus - the classic reason a nutrient-management plan switches to a P-based rate on high-P soils. This reports the P and K delivered so that over-application is visible. A planning aid; a manure test, the soil test, and the NRCS Code 590 nutrient-management plan govern.",
  };
}
export const manureNutrientApplicationExample = { inputs: { crop_n_need_lb_acre: 150, total_n_lb_ton: 10, availability_pct: 50, p2o5_lb_ton: 5, k2o_lb_ton: 8 } };
function renderManureNutrientApplication(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: N-based manure application rate (USDA NRCS Code 590 Nutrient Management): available N per ton = total N x first-year availability, rate = crop N need / available N per ton, with the P2O5 and K2O delivered at that rate reported so phosphorus over-application is visible. A planning aid; a manure test, the soil test, and the nutrient-management plan govern.";
  const need = makeNumber("Crop N need (lb/acre)", "mna-need", { step: "any", min: "0" });
  const totalN = makeNumber("Manure total N (lb/ton)", "mna-tn", { step: "any", min: "0" });
  const avail = makeNumber("First-year N availability (%)", "mna-av", { step: "any", min: "0", max: "100" });
  const p2o5 = makeNumber("Manure P2O5 (lb/ton, optional)", "mna-p", { step: "any", min: "0" });
  const k2o = makeNumber("Manure K2O (lb/ton, optional)", "mna-k", { step: "any", min: "0" });
  for (const f of [need, totalN, avail, p2o5, k2o]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { need.input.value = "150"; totalN.input.value = "10"; avail.input.value = "50"; p2o5.input.value = "5"; k2o.input.value = "8"; update(); });
  const oRate = makeOutputLine(outputRegion, "Application rate (N-based)", "mna-out-rate");
  const oPK = makeOutputLine(outputRegion, "P2O5 / K2O also applied", "mna-out-pk");
  const oNote = makeOutputLine(outputRegion, "Note", "mna-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureNutrientApplication({ crop_n_need_lb_acre: readNum(need.input), total_n_lb_ton: readNum(totalN.input), availability_pct: readNum(avail.input), p2o5_lb_ton: readNum(p2o5.input), k2o_lb_ton: readNum(k2o.input) });
    if (r.error) { oRate.textContent = r.error; oPK.textContent = ""; oNote.textContent = ""; return; }
    oRate.textContent = fmt(r.rate_ton_acre, 1) + " ton/acre (" + fmt(r.avail_n_per_ton, 2) + " lb available N/ton)";
    oPK.textContent = (r.p2o5_applied == null ? "P2O5 -" : fmt(r.p2o5_applied, 0) + " lb P2O5") + " / " + (r.k2o_applied == null ? "K2O -" : fmt(r.k2o_applied, 0) + " lb K2O") + " per acre";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [need.input, totalN.input, avail.input, p2o5.input, k2o.input]) f.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["manure-nutrient-application"] = renderManureNutrientApplication;

// --- spec-v568 L: Center-pivot application depth and runtime ---
// hours = area x depth x 452.6 / flow. gross_gpm_per_acre = flow / area. net_depth = depth x eff / 100.
// dims: in { system_flow_gpm: L^3 T^-1, area_acres: L^2, target_depth_in: L, efficiency_pct: dimensionless } out: { hours: T, gross_gpm_per_acre: dimensionless, net_depth_in: L }
export function computeCenterPivotRuntime({ system_flow_gpm = 0, area_acres = 0, target_depth_in = 0, efficiency_pct = 85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // An efficiency is a percent; 0 < value < 1 is a fraction typed into a percent field (added 2026-09-26).
  if (["efficiency_pct"].some((k) => { const v = Number(arguments[0]?.[k]); return v > 0 && v < 1; })) return { error: "Enter efficiencies as a percent (85 for 85%), not a fraction." };
  const flow = Number(system_flow_gpm) || 0;
  const area = Number(area_acres) || 0;
  const depth = Number(target_depth_in) || 0;
  const eff = Number(efficiency_pct) || 0;
  if (!(flow > 0)) return { error: "System flow must be positive (gpm)." };
  if (!(area > 0)) return { error: "Irrigated area must be positive (acres)." };
  if (!(depth > 0)) return { error: "Target depth must be positive (in)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Efficiency must be over 0 and at most 100 (%)." };
  const hours = area * depth * 452.6 / flow;
  const gross_gpm_per_acre = flow / area;
  const net_depth_in = depth * eff / 100;
  return {
    hours, gross_gpm_per_acre, net_depth_in,
    note: "The depth is set by the outer-tower speed (percent timer), and the outer spans cover far more area than the inner ones, so a uniform depth needs increasing flow per foot outward. The instantaneous application rate under an outer span can exceed the soil intake rate and run off even when the daily depth is right - the depth sets the hours, not the runoff risk. The 452.6 factor converts acre-inches to gallons over minutes. The actual pivot design and soil intake govern.",
  };
}
export const centerPivotRuntimeExample = { inputs: { system_flow_gpm: 800, area_acres: 125, target_depth_in: 1.0, efficiency_pct: 85 } };

function _v568renderCenterPivotRuntime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: center-pivot application depth and runtime (USDA-NRCS center-pivot design; university extension), by name. hours = area x depth x 452.6 / flow; gross_gpm_per_acre = flow / area; net_depth = depth x efficiency / 100. The depth is set by the outer-tower speed; the outer spans cover more area, so the instantaneous application rate under an outer span can run off even when the daily depth is right. The pivot design and soil intake govern.";
  const flow = makeNumber("System flow Q (gpm)", "cpr-flow", { step: "any", min: "0" });
  const area = makeNumber("Irrigated area (acres)", "cpr-area", { step: "any", min: "0" });
  const depth = makeNumber("Gross target depth (in)", "cpr-depth", { step: "any", min: "0" });
  const eff = makeNumber("Application efficiency (%)", "cpr-eff", { step: "any", min: "0", max: "100" });
  for (const f of [flow, area, depth, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "800"; area.input.value = "125"; depth.input.value = "1.0"; eff.input.value = "85"; update(); });
  const oHours = makeOutputLine(outputRegion, "Runtime per pass", "cpr-out-hours");
  const oGross = makeOutputLine(outputRegion, "Gross capacity per acre", "cpr-out-gross");
  const oNet = makeOutputLine(outputRegion, "Net depth applied", "cpr-out-net");
  const oNote = makeOutputLine(outputRegion, "Note", "cpr-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCenterPivotRuntime({ system_flow_gpm: readNum(flow.input), area_acres: readNum(area.input), target_depth_in: readNum(depth.input), efficiency_pct: eff.input.value === "" ? 85 : readNum(eff.input) });
    if (r.error) { oHours.textContent = r.error; oGross.textContent = "-"; oNet.textContent = "-"; oNote.textContent = ""; return; }
    oHours.textContent = fmt(r.hours, 1) + " hr (" + fmt(r.hours / 24, 1) + " days)";
    oGross.textContent = fmt(r.gross_gpm_per_acre, 1) + " gpm/ac";
    oNet.textContent = fmt(r.net_depth_in, 2) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [flow, area, depth, eff]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["center-pivot-runtime"] = _v568renderCenterPivotRuntime;

// --- spec-v602 L: Center-pivot outer-span application rate vs soil intake ---
// speed = 2*pi*L/(T*60). wetting = W/speed. app_rate = D*2*pi*L/(T*W). exceeds if app_rate > intake.
// dims: in { pass_depth_in: L, pivot_length_ft: L, revolution_hr: T, wetted_band_ft: L, soil_intake_in_hr: dimensionless } out: { speed_ft_min: dimensionless, wetting_min: T, app_rate_in_hr: dimensionless, ratio: dimensionless }
export function computePivotApplicationRate({ pass_depth_in = 0, pivot_length_ft = 0, revolution_hr = 0, wetted_band_ft = 0, soil_intake_in_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(pass_depth_in) || 0;
  const L = Number(pivot_length_ft) || 0;
  const T = Number(revolution_hr) || 0;
  const W = Number(wetted_band_ft) || 0;
  const intake = Number(soil_intake_in_hr) || 0;
  if (!(D > 0)) return { error: "Pass depth must be positive (in)." };
  if (!(L > 0)) return { error: "Pivot length must be positive (ft)." };
  if (!(T > 0)) return { error: "Revolution time must be positive (hr)." };
  if (!(W > 0)) return { error: "Wetted band must be positive (ft)." };
  if (!(intake > 0)) return { error: "Soil intake rate must be positive (in/hr)." };
  const speed_ft_min = 2 * Math.PI * L / (T * 60);
  const wetting_min = W / speed_ft_min;
  const app_rate_in_hr = D * 2 * Math.PI * L / (T * W);
  const exceeds_intake = app_rate_in_hr > intake + 1e-9 * Math.abs(intake);
  const ratio = app_rate_in_hr / intake;
  return {
    speed_ft_min, wetting_min, app_rate_in_hr, exceeds_intake, ratio,
    note: "This is the average rate over the wetted band at the outer span; the true peak of the pattern runs well above it (4/pi, about 27% higher, for an elliptical package). The outer end always governs because it moves fastest. Runoff is avoided in practice only by the short wetting time and a little surface storage, so a slope or a crusted or tight soil will run off when the rate exceeds the intake - slow the pivot, narrow the band, or pick a lower-rate package. The pivot design, the sprinkler package, and the measured soil intake govern - a design screen, not a runoff model.",
  };
}
export const pivotApplicationRateExample = { inputs: { pass_depth_in: 1.0, pivot_length_ft: 1320, revolution_hr: 24, wetted_band_ft: 100, soil_intake_in_hr: 0.5 } };
function _v602renderPivotApplicationRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: center-pivot outer-span application rate (USDA-NRCS center-pivot design; university extension), by name. speed = 2 x pi x pivot_length / (revolution_hr x 60); wetting = wetted_band / speed; app_rate = pass_depth x 2 x pi x pivot_length / (revolution_hr x wetted_band). This is the average rate over the wetted band at the outer span (the true elliptical-pattern peak runs 4/pi, about 27%, higher); the outer end governs because it moves fastest. Runoff is avoided only by the short wetting time and surface storage, so a slope or a tight soil runs off when the rate exceeds the intake.";
  const D = makeNumber("Gross pass depth (in)", "par-d", { step: "any", min: "0" });
  const L = makeNumber("Pivot length to outer tower (ft)", "par-l", { step: "any", min: "0" });
  const T = makeNumber("Revolution time (hr)", "par-t", { step: "any", min: "0" });
  const W = makeNumber("Wetted band at outer span (ft)", "par-w", { step: "any", min: "0" });
  const intake = makeNumber("Soil intake rate (in/hr: sand ~1.0, loam ~0.5, clay ~0.15)", "par-i", { step: "any", min: "0" });
  for (const f of [D, L, T, W, intake]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "1.0"; L.input.value = "1320"; T.input.value = "24"; W.input.value = "100"; intake.input.value = "0.5"; update(); });
  const oRate = makeOutputLine(outputRegion, "Outer-span application rate", "par-out-rate");
  const oWet = makeOutputLine(outputRegion, "Wetting time at a point", "par-out-wet");
  const oCheck = makeOutputLine(outputRegion, "Against soil intake", "par-out-check");
  const oNote = makeOutputLine(outputRegion, "Note", "par-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePivotApplicationRate({ pass_depth_in: readNum(D.input), pivot_length_ft: readNum(L.input), revolution_hr: readNum(T.input), wetted_band_ft: readNum(W.input), soil_intake_in_hr: readNum(intake.input) });
    if (r.error) { oRate.textContent = r.error; oWet.textContent = "-"; oCheck.textContent = "-"; oNote.textContent = ""; return; }
    oRate.textContent = fmt(r.app_rate_in_hr, 2) + " in/hr";
    oWet.textContent = fmt(r.wetting_min, 1) + " min (" + fmt(r.speed_ft_min, 1) + " ft/min at the end tower)";
    oCheck.textContent = r.exceeds_intake ? fmt(r.ratio, 1) + "x the intake - RUNOFF RISK on a slope or a tight soil" : fmt(r.ratio, 2) + "x the intake - within the soil's intake rate";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D, L, T, W, intake]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["pivot-application-rate"] = _v602renderPivotApplicationRate;

// --- spec-v604 L: Center-pivot percent-timer to depth ---
// revolution = T100*100/timer. depth = Q*revolution/(452.6*A). pass_days = revolution/24.
// dims: in { system_flow_gpm: L^3 T^-1, area_acres: L^2, revolution_100_hr: T, timer_pct: dimensionless } out: { revolution_hr: T, depth_in: L, pass_days: T }
export function computePivotTimerDepth({ system_flow_gpm = 0, area_acres = 0, revolution_100_hr = 0, timer_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q = Number(system_flow_gpm) || 0;
  const A = Number(area_acres) || 0;
  const T100 = Number(revolution_100_hr) || 0;
  const timer = Number(timer_pct) || 0;
  if (!(Q > 0)) return { error: "System flow must be positive (gpm)." };
  if (!(A > 0)) return { error: "Irrigated area must be positive (acres)." };
  if (!(T100 > 0)) return { error: "Full-speed revolution time must be positive (hr)." };
  if (!(timer > 0 && timer <= 100)) return { error: "Timer setting must be over 0 and at most 100 (%)." };
  const revolution_hr = T100 * 100 / timer;
  const depth_in = Q * revolution_hr / (452.6 * A);
  const pass_days = revolution_hr / 24;
  return {
    revolution_hr, depth_in, pass_days,
    note: "The timer sets the outer-tower speed, so the depth is inversely proportional to the setting - halving the timer doubles the depth, which irrigators get backwards constantly. The 452.6 factor converts acre-inches to gallons over minutes; the full-speed revolution time is the machine's rated maximum-speed pass. The pivot design, the actual field area under the machine, and the panel calibration govern - an operating aid, not a uniformity or scheduling design.",
  };
}
export const pivotTimerDepthExample = { inputs: { system_flow_gpm: 800, area_acres: 125, revolution_100_hr: 20, timer_pct: 50 } };
function _v604renderPivotTimerDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: center-pivot percent-timer to depth (USDA-NRCS center-pivot design; university extension), by name. revolution = revolution_100_hr x 100 / timer_pct; depth = system_flow x revolution / (452.6 x area); pass_days = revolution / 24. The timer sets the outer-tower speed, so the depth is inversely proportional to the setting - halving the timer doubles the depth. The full-speed revolution time is the machine's rated maximum-speed pass.";
  const Q = makeNumber("System flow Q (gpm)", "ptd-q", { step: "any", min: "0" });
  const A = makeNumber("Irrigated area (acres)", "ptd-a", { step: "any", min: "0" });
  const T100 = makeNumber("Revolution time at 100% timer (hr)", "ptd-t", { step: "any", min: "0" });
  const timer = makeNumber("End-tower timer setting (%)", "ptd-p", { step: "any", min: "0", max: "100" });
  for (const f of [Q, A, T100, timer]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Q.input.value = "800"; A.input.value = "125"; T100.input.value = "20"; timer.input.value = "50"; update(); });
  const oRev = makeOutputLine(outputRegion, "Revolution time", "ptd-out-rev");
  const oDepth = makeOutputLine(outputRegion, "Gross depth per pass", "ptd-out-depth");
  const oDays = makeOutputLine(outputRegion, "Days per pass", "ptd-out-days");
  const oNote = makeOutputLine(outputRegion, "Note", "ptd-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePivotTimerDepth({ system_flow_gpm: readNum(Q.input), area_acres: readNum(A.input), revolution_100_hr: readNum(T100.input), timer_pct: readNum(timer.input) });
    if (r.error) { oRev.textContent = r.error; oDepth.textContent = "-"; oDays.textContent = "-"; oNote.textContent = ""; return; }
    oRev.textContent = fmt(r.revolution_hr, 1) + " hr";
    oDepth.textContent = fmt(r.depth_in, 3) + " in";
    oDays.textContent = fmt(r.pass_days, 2) + " days";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [Q, A, T100, timer]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["pivot-timer-depth"] = _v604renderPivotTimerDepth;

// --- spec-v569 L: Stored-grain aeration fan airflow ---
// required_cfm = rate x bushels. cooling_hours = 15 / rate.
// dims: in { bin_capacity_bu: dimensionless, airflow_rate: dimensionless } out: { required_cfm: L^3 T^-1, cooling_hours: T }
export function computeGrainAerationAirflow({ bin_capacity_bu = 0, airflow_rate = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bu = Number(bin_capacity_bu) || 0;
  const rate = Number(airflow_rate) || 0;
  if (!(bu > 0)) return { error: "Bin capacity must be positive (bushels)." };
  if (!(rate > 0)) return { error: "Airflow rate must be positive (cfm/bu)." };
  const required_cfm = rate * bu;
  const cooling_hours = 15 / rate;
  const mode = rate >= 0.5 ? "natural-air drying" : rate >= 0.1 ? "aeration cooling" : "low-rate aeration";
  return {
    required_cfm, cooling_hours, mode,
    note: "Static pressure rises steeply with grain depth, and fan power grows about four- to fivefold when the airflow rate doubles and about eight- to tenfold when the depth doubles at the same cfm/bu - so a fan sized on cfm/bu alone stalls against back-pressure in a tall bin, and the fan curve must be read at the actual static pressure. Aeration cooling (0.1-0.25 cfm/bu) is NOT the same job as natural-air drying (0.5-1.0 cfm/bu) - mixing them up either wastes fan or fails to dry. A sizing aid; the fan selection at the design static pressure and the grain condition govern.",
  };
}
export const grainAerationAirflowExample = { inputs: { bin_capacity_bu: 20000, airflow_rate: 0.15 } };

function _v569renderGrainAerationAirflow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: stored-grain aeration fan airflow (MWPS / university extension; Shedd airflow-resistance curves), by name. required_cfm = rate_cfm_per_bu x bushels; cooling_hours = 15 / rate (per cooling front). Bands: aeration cooling 0.1-0.25 cfm/bu, natural-air drying 0.5-1.0 cfm/bu. Static pressure rises steeply with depth and fan power grows ~4-5x when the rate doubles and ~8-10x when the depth doubles - read the fan curve at the actual static pressure. The fan selection and grain condition govern.";
  const bu = makeNumber("Stored grain (bushels)", "gaa-bu", { step: "any", min: "0" });
  const rate = makeNumber("Target airflow (cfm/bu, 0.1-0.25 cool, 0.5-1.0 dry)", "gaa-rate", { step: "any", min: "0" });
  for (const f of [bu, rate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bu.input.value = "20000"; rate.input.value = "0.15"; update(); });
  const oCfm = makeOutputLine(outputRegion, "Required fan airflow", "gaa-out-cfm");
  const oHours = makeOutputLine(outputRegion, "Approx. cooling time / mode", "gaa-out-hours");
  const oNote = makeOutputLine(outputRegion, "Note", "gaa-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrainAerationAirflow({ bin_capacity_bu: readNum(bu.input), airflow_rate: readNum(rate.input) });
    if (r.error) { oCfm.textContent = r.error; oHours.textContent = "-"; oNote.textContent = ""; return; }
    oCfm.textContent = fmt(r.required_cfm, 0) + " cfm";
    oHours.textContent = fmt(r.cooling_hours, 0) + " hr per cooling front (" + r.mode + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bu, rate]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["grain-aeration-airflow"] = _v569renderGrainAerationAirflow;

// --- spec-v582 L: NRCS 313 waste storage facility volume ---
// manure = (daily_manure+wastewater+bedding)*storage_days. precip_storm = area*(net_precip+storm)/12. freeboard = area*freeboard/12. total = sum.
// dims: in { daily_manure_ft3: L^3 T^-1, wastewater_ft3: L^3 T^-1, bedding_ft3: L^3 T^-1, storage_days: T, surface_area_ft2: L^2, net_precip_in: L, storm_in: L, freeboard_in: L } out: { manure_volume_ft3: L^3, precip_storm_ft3: L^3, freeboard_ft3: L^3, total_ft3: L^3, total_gal: L^3 }
export function computeManureStorageVolume({ daily_manure_ft3 = 0, wastewater_ft3 = 0, bedding_ft3 = 0, storage_days = 0, surface_area_ft2 = 0, net_precip_in = 0, storm_in = 0, freeboard_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const manure = Number(daily_manure_ft3) || 0;
  const ww = Number(wastewater_ft3) || 0;
  const bed = Number(bedding_ft3) || 0;
  const days = Number(storage_days) || 0;
  const area = Number(surface_area_ft2) || 0;
  const precip = Number(net_precip_in) || 0;
  const storm = Number(storm_in) || 0;
  const fb = Number(freeboard_in) || 0;
  if (!(manure > 0)) return { error: "Daily manure production must be positive (ft3/day)." };
  if (!(days > 0)) return { error: "Storage period must be positive (days)." };
  if (ww < 0 || bed < 0) return { error: "Added wastewater and bedding cannot be negative (ft3/day)." };
  if (area < 0) return { error: "Surface area cannot be negative (ft2)." };
  if (precip < 0 || storm < 0) return { error: "Net precipitation and storm depth cannot be negative (in)." };
  if (fb < 0) return { error: "Freeboard cannot be negative (in)." };
  const manure_volume_ft3 = (manure + ww + bed) * days;
  const precip_storm_ft3 = area * (precip + storm) / 12;
  const freeboard_ft3 = area * fb / 12;
  const total_ft3 = manure_volume_ft3 + precip_storm_ft3 + freeboard_ft3;
  const total_gal = total_ft3 * (1728 / 231);
  const short_days = days < 120 - 1e-9 * Math.abs(120);
  return {
    manure_volume_ft3, precip_storm_ft3, freeboard_ft3, total_ft3, total_gal, short_days,
    note: "An uncovered liquid facility must bank the net precipitation and the 25-year, 24-hour storm falling on its own surface over the storage period - sizing to manure alone overtops in a wet spring. CPS 313 sets no fixed minimum storage period -- it bases the period on when the manure can be applied safely given climate, crops, and soils, which is why many nutrient-management plans and states land on 120 to 180 days -- and the tile flags anything under 120 days as short for that reason. CPS 313 also requires at least 6 inches of residual solids in a tank that is not cleaned out completely, which this total does not include. Freeboard is 6 inches for a vertical-wall tank and 12 inches for other structures. NRCS 313 and the engineer/planner govern - a planning aid, not the engineer of record.",
  };
}
export const manureStorageVolumeExample = { inputs: { daily_manure_ft3: 150, wastewater_ft3: 0, bedding_ft3: 20, storage_days: 120, surface_area_ft2: 8000, net_precip_in: 6, storm_in: 4, freeboard_in: 12 } };
function _v582renderManureStorageVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not the engineer of record; NRCS 313 and the engineer/planner govern. Citation: NRCS Conservation Practice Standard 313 / ASABE D384 manure production, by name. manure = (daily + wastewater + bedding) x storage_days; precip_storm = area x (net_precip + storm) / 12; freeboard = area x freeboard_in / 12; total = the sum. An uncovered facility must bank the net precipitation and the 25-year, 24-hour storm over the storage period; CPS 313 sets the storage period by safe-utilization timing rather than a fixed minimum (under 120 days is flagged as short, a common planning floor); add at least 6 in of residual solids in a tank that is not fully emptied; freeboard is 6 in (vertical wall) or 12 in (other).";
  const manure = makeNumber("Daily manure (ft3/day = head x rate)", "msv-manure", { step: "any", min: "0" });
  const ww = makeNumber("Added wastewater (ft3/day, 0 if none)", "msv-ww", { step: "any", min: "0" });
  const bed = makeNumber("Added bedding (ft3/day, 0 if none)", "msv-bed", { step: "any", min: "0" });
  const days = makeNumber("Storage period (days; under 120 flagged short)", "msv-days", { step: "any", min: "0" });
  const area = makeNumber("Surface area (ft2, 0 if roofed)", "msv-area", { step: "any", min: "0" });
  const precip = makeNumber("Net precipitation over period (in)", "msv-precip", { step: "any", min: "0" });
  const storm = makeNumber("25-yr 24-hr storm depth (in)", "msv-storm", { step: "any", min: "0" });
  const fb = makeNumber("Freeboard (in: 6 vertical wall / 12 other)", "msv-fb", { step: "any", min: "0" });
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { manure.input.value = "150"; ww.input.value = "0"; bed.input.value = "20"; days.input.value = "120"; area.input.value = "8000"; precip.input.value = "6"; storm.input.value = "4"; fb.input.value = "12"; update(); });
  const oManure = makeOutputLine(outputRegion, "Manure + wastewater + bedding volume", "msv-out-manure");
  const oPrecip = makeOutputLine(outputRegion, "Precipitation + 25-yr storm volume", "msv-out-precip");
  const oFree = makeOutputLine(outputRegion, "Freeboard volume", "msv-out-free");
  const oTotal = makeOutputLine(outputRegion, "Total required storage", "msv-out-total");
  const oNote = makeOutputLine(outputRegion, "Note", "msv-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureStorageVolume({ daily_manure_ft3: readNum(manure.input), wastewater_ft3: readNum(ww.input), bedding_ft3: readNum(bed.input), storage_days: readNum(days.input), surface_area_ft2: readNum(area.input), net_precip_in: readNum(precip.input), storm_in: readNum(storm.input), freeboard_in: readNum(fb.input) });
    if (r.error) { oManure.textContent = r.error; oPrecip.textContent = "-"; oFree.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oManure.textContent = fmt(r.manure_volume_ft3, 0) + " ft3";
    oPrecip.textContent = fmt(r.precip_storm_ft3, 0) + " ft3";
    oFree.textContent = fmt(r.freeboard_ft3, 0) + " ft3";
    oTotal.textContent = fmt(r.total_ft3, 0) + " ft3 (" + fmt(r.total_gal, 0) + " gal)" + (r.short_days ? " - under 120 days, short of most nutrient-management plans" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["manure-storage-volume"] = _v582renderManureStorageVolume;

// --- spec-v606 L: Manure storage covered-vs-open roof savings ---
// open = (manure+ww+bed)*days + area*(precip+storm)/12 + area*fb/12. roof_saving = area*(precip+storm)/12. covered = open - roof_saving.
// dims: in { daily_manure_ft3: L^3 T^-1, wastewater_ft3: L^3 T^-1, bedding_ft3: L^3 T^-1, storage_days: T, surface_area_ft2: L^2, net_precip_in: L, storm_in: L, freeboard_in: L } out: { open_ft3: L^3, covered_ft3: L^3, roof_saving_ft3: L^3, roof_saving_gal: L^3, percent_saved: dimensionless }
export function computeManureCoverSavings({ daily_manure_ft3 = 0, wastewater_ft3 = 0, bedding_ft3 = 0, storage_days = 0, surface_area_ft2 = 0, net_precip_in = 0, storm_in = 0, freeboard_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const manure = Number(daily_manure_ft3) || 0;
  const ww = Number(wastewater_ft3) || 0;
  const bed = Number(bedding_ft3) || 0;
  const days = Number(storage_days) || 0;
  const area = Number(surface_area_ft2) || 0;
  const precip = Number(net_precip_in) || 0;
  const storm = Number(storm_in) || 0;
  const fb = Number(freeboard_in) || 0;
  if (!(manure > 0)) return { error: "Daily manure production must be positive (ft3/day)." };
  if (!(days > 0)) return { error: "Storage period must be positive (days)." };
  if (!(area > 0)) return { error: "Surface area must be positive (ft2) - there is nothing for a roof to cover." };
  if (ww < 0 || bed < 0) return { error: "Added wastewater and bedding cannot be negative (ft3/day)." };
  if (precip < 0 || storm < 0) return { error: "Net precipitation and storm depth cannot be negative (in)." };
  if (fb < 0) return { error: "Freeboard cannot be negative (in)." };
  const manure_volume_ft3 = (manure + ww + bed) * days;
  const roof_saving_ft3 = area * (precip + storm) / 12;
  const freeboard_ft3 = area * fb / 12;
  const open_ft3 = manure_volume_ft3 + roof_saving_ft3 + freeboard_ft3;
  const covered_ft3 = open_ft3 - roof_saving_ft3;
  const roof_saving_gal = roof_saving_ft3 * (1728 / 231);
  const percent_saved = open_ft3 > 0 ? roof_saving_ft3 / open_ft3 * 100 : 0;
  return {
    open_ft3, covered_ft3, roof_saving_ft3, roof_saving_gal, percent_saved,
    note: "The roof saving is the net precipitation and the 25-year, 24-hour storm the open facility must otherwise bank on its own surface. The freeboard is held the same in both cases (a conservatism - a roofed structure can often carry less). The saving is clean rainwater the operation also avoids hauling and land-applying, so the payback is both smaller storage and less spreading. NRCS 313 and the engineer/planner govern - a planning aid, not the engineer of record.",
  };
}
export const manureCoverSavingsExample = { inputs: { daily_manure_ft3: 150, wastewater_ft3: 0, bedding_ft3: 20, storage_days: 120, surface_area_ft2: 8000, net_precip_in: 6, storm_in: 4, freeboard_in: 12 } };
function _v606renderManureCoverSavings(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: manure storage covered-vs-open comparison (USDA-NRCS Conservation Practice 313 waste storage facility), by name. open = (manure + wastewater + bedding) x days + area x (net_precip + storm)/12 + area x freeboard/12; roof_saving = area x (net_precip + storm)/12; covered = open - roof_saving. The roof saving is the net precipitation and the 25-year, 24-hour storm the open facility must otherwise bank on its own surface; the freeboard is held the same in both cases. The saving is clean rainwater the operation also avoids hauling.";
  const manure = makeNumber("Daily manure (ft3/day)", "mcs-manure", { step: "any", min: "0" });
  const ww = makeNumber("Added wastewater (ft3/day)", "mcs-ww", { step: "any", min: "0" });
  const bed = makeNumber("Added bedding (ft3/day)", "mcs-bed", { step: "any", min: "0" });
  const days = makeNumber("Storage period (days)", "mcs-days", { step: "any", min: "0" });
  const area = makeNumber("Surface / roof area (ft2)", "mcs-area", { step: "any", min: "0" });
  const precip = makeNumber("Net precipitation over the period (in)", "mcs-precip", { step: "any", min: "0" });
  const storm = makeNumber("25-yr 24-hr storm depth (in)", "mcs-storm", { step: "any", min: "0" });
  const fb = makeNumber("Freeboard (in: 6 vertical wall, 12 other)", "mcs-fb", { step: "any", min: "0" });
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { manure.input.value = "150"; ww.input.value = "0"; bed.input.value = "20"; days.input.value = "120"; area.input.value = "8000"; precip.input.value = "6"; storm.input.value = "4"; fb.input.value = "12"; update(); });
  const oOpen = makeOutputLine(outputRegion, "Open facility volume", "mcs-out-open");
  const oCovered = makeOutputLine(outputRegion, "Covered (roofed) volume", "mcs-out-covered");
  const oSave = makeOutputLine(outputRegion, "Volume a roof saves", "mcs-out-save");
  const oNote = makeOutputLine(outputRegion, "Note", "mcs-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureCoverSavings({ daily_manure_ft3: readNum(manure.input), wastewater_ft3: readNum(ww.input), bedding_ft3: readNum(bed.input), storage_days: readNum(days.input), surface_area_ft2: readNum(area.input), net_precip_in: readNum(precip.input), storm_in: readNum(storm.input), freeboard_in: readNum(fb.input) });
    if (r.error) { oOpen.textContent = r.error; oCovered.textContent = "-"; oSave.textContent = "-"; oNote.textContent = ""; return; }
    oOpen.textContent = fmt(r.open_ft3, 0) + " ft3";
    oCovered.textContent = fmt(r.covered_ft3, 0) + " ft3";
    oSave.textContent = fmt(r.roof_saving_ft3, 0) + " ft3 (" + fmt(r.roof_saving_gal, 0) + " gal, " + fmt(r.percent_saved, 0) + "% of the facility)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["manure-cover-savings"] = _v606renderManureCoverSavings;

// ===================== spec-v914: tractor ballast for a target weight-to-power ratio =====================
// dims: in { power_hp: M L^2 T^-3, weight_to_power_ratio: T L^-1, current_weight_lb: M L T^-2 } out: { target_weight_lb: M L T^-2, ballast_change_lb: M L T^-2 }
export function computeTractorBallast({ power_hp = 180, weight_to_power_ratio = 125, current_weight_lb = 18000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(power_hp > 0)) return { error: "Engine / PTO power must be positive (hp)." };
  if (!(weight_to_power_ratio > 0)) return { error: "Weight-to-power ratio must be positive (lb/hp)." };
  if (current_weight_lb < 0) return { error: "Current weight cannot be negative (lb)." };
  // Ballast to a target total weight = ratio x power; add (or, if negative, remove) to reach it.
  const target_weight_lb = weight_to_power_ratio * power_hp;
  const ballast_change_lb = target_weight_lb - current_weight_lb;
  if (![target_weight_lb, ballast_change_lb].every(Number.isFinite)) return { error: "Ballast math is not a finite value." };
  return {
    target_weight_lb,
    ballast_change_lb,
    note: "Ballast a tractor to a target total weight = weight-to-power ratio x power. Rules of thumb (ASABE / operator's manual): about 120 to 145 lb/hp for tillage and drawbar work at field speeds, dropping toward 90 to 110 lb/hp for higher-speed transport and lighter draft -- too much ballast wastes fuel to rolling resistance, too little spins the tires (target 8 to 15% wheel slip). A positive result is ballast to ADD, a negative result is ballast to REMOVE. The ratio, the split between front and rear, and the tire and inflation ratings come from the operator's manual and the implement; a wrong number is a re-ballast, not a failure.",
  };
}

export const tractorBallastExample = { inputs: { power_hp: 180, weight_to_power_ratio: 125, current_weight_lb: 18000 } };

function _v914renderTractorBallast(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: tractor ballasting rule by name. target weight = weight-to-power ratio x power (hp); ballast change = target - current. ASABE / operator's-manual guidance (~120-145 lb/hp for field draft, ~90-110 for transport; target 8-15% wheel slip). The operator's manual and implement govern.";
  const hp = makeNumber("Engine or PTO power (hp)", "tbal-hp", { step: "any", min: "0" });
  const rt = makeNumber("Weight-to-power ratio (lb/hp)", "tbal-rt", { step: "any", min: "0" });
  const cw = makeNumber("Current tractor weight (lb)", "tbal-cw", { step: "any", min: "0" });
  for (const f of [hp, rt, cw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "180"; rt.input.value = "125"; cw.input.value = "18000"; update(); });
  const oTarget = makeOutputLine(outputRegion, "Target total weight", "tbal-out-t");
  const oChange = makeOutputLine(outputRegion, "Ballast to add / remove", "tbal-out-c");
  const update = debounce(() => {
    const r = computeTractorBallast({
      power_hp: hp.input.value === "" ? 180 : Number(hp.input.value), weight_to_power_ratio: rt.input.value === "" ? 125 : Number(rt.input.value),
      current_weight_lb: cw.input.value === "" ? 18000 : Number(cw.input.value),
    });
    if (r.error) { oTarget.textContent = r.error; oChange.textContent = "-"; return; }
    oTarget.textContent = fmt(r.target_weight_lb, 0) + " lb";
    oChange.textContent = (r.ballast_change_lb >= 0 ? "add " : "remove ") + fmt(Math.abs(r.ballast_change_lb), 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [hp, rt, cw]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["tractor-ballast"] = _v914renderTractorBallast;

// ===================== spec-v940: anhydrous ammonia product rate from target nitrogen =====================
// dims: in { n_target_lb_per_ac: dimensionless, tank_gal: L^3 } out: { product_lb_per_ac: dimensionless, product_gal_per_ac: dimensionless, acres_per_tank: L^2 }
export function computeAnhydrousAmmoniaRate({ n_target_lb_per_ac = 180, tank_gal = 1000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(n_target_lb_per_ac > 0)) return { error: "Target nitrogen must be positive (lb N/acre)." };
  if (tank_gal < 0) return { error: "Tank size cannot be negative (gal)." };
  // Anhydrous ammonia is 82-0-0 (82% N by weight); liquid density ~5.15 lb/gal.
  const product_lb_per_ac = n_target_lb_per_ac / 0.82;
  const product_gal_per_ac = product_lb_per_ac / 5.15;
  const acres_per_tank = tank_gal > 0 ? tank_gal / product_gal_per_ac : null;
  if (![product_lb_per_ac, product_gal_per_ac].every(Number.isFinite)) return { error: "Anhydrous-rate math is not a finite value." };
  return {
    product_lb_per_ac,
    product_gal_per_ac,
    acres_per_tank,
    note: "Anhydrous ammonia is 82-0-0 (82% nitrogen by weight), so the product rate = target N / 0.82; at a liquid density of about 5.15 lb/gal that is the gallons per acre, and a nurse-tank's gallons divided by that is the acres it covers. A 180 lb N/acre target is about 219.5 lb (42.6 gal) of anhydrous per acre, so a 1,000-gal tank covers about 23.5 acres. Anhydrous is a pressurized, hazardous liquid -- set the applicator with a flow monitor and calibrate against a weigh or flow check, allow for temperature and vapor, and follow the label and safety (PPE, water, closed-transfer) requirements. A rate estimate; the applicator calibration, the soil-test N recommendation, and the co-op / label govern.",
  };
}

export const anhydrousAmmoniaRateExample = { inputs: { n_target_lb_per_ac: 180, tank_gal: 1000 } };

function _v940renderAnhydrousAmmoniaRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: anhydrous ammonia rate by name. product = target N / 0.82 (82-0-0 grade); gal/acre = lb/acre / 5.15 (liquid density); acres/tank = tank gal / (gal/acre). Anhydrous is hazardous and pressurized -- calibrate the applicator; the label and co-op govern.";
  const nt = makeNumber("Target nitrogen (lb N/acre)", "anh-nt", { step: "any", min: "0" });
  const tk = makeNumber("Nurse tank size (gal, 0 to skip)", "anh-tk", { step: "any", min: "0" });
  for (const f of [nt, tk]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { nt.input.value = "180"; tk.input.value = "1000"; update(); });
  const oRate = makeOutputLine(outputRegion, "Anhydrous rate", "anh-out-rate");
  const oAcres = makeOutputLine(outputRegion, "Acres per tank", "anh-out-acres");
  const update = debounce(() => {
    const r = computeAnhydrousAmmoniaRate({
      n_target_lb_per_ac: nt.input.value === "" ? 180 : Number(nt.input.value), tank_gal: tk.input.value === "" ? 1000 : Number(tk.input.value),
    });
    if (r.error) { oRate.textContent = r.error; oAcres.textContent = "-"; return; }
    oRate.textContent = fmt(r.product_lb_per_ac, 1) + " lb/acre (" + fmt(r.product_gal_per_ac, 1) + " gal/acre)";
    oAcres.textContent = r.acres_per_tank === null ? "- (enter tank size)" : fmt(r.acres_per_tank, 1) + " acres/tank";
  }, DEBOUNCE_MS);
  for (const f of [nt, tk]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["anhydrous-ammonia-rate"] = _v940renderAnhydrousAmmoniaRate;

// ===================== spec-v964: available-water / MAD irrigation trigger =====================
// dims: in { field_capacity: dimensionless, wilting_point: dimensionless, root_depth_in: L, mad_fraction: dimensionless, etc_in_day: L T^-1 } out: { taw_in: L, raw_in: L, irrigation_interval_days: T }
export function computeMadIrrigationTrigger({ field_capacity = 0.30, wilting_point = 0.12, root_depth_in = 24, mad_fraction = 0.5, etc_in_day = 0.25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(field_capacity > 0 && field_capacity < 1)) return { error: "Field capacity must be a fraction between 0 and 1 (in/in)." };
  if (!(wilting_point >= 0 && wilting_point < field_capacity)) return { error: "Wilting point must be below field capacity (in/in)." };
  if (!(root_depth_in > 0)) return { error: "Root depth must be positive (in)." };
  if (!(mad_fraction > 0 && mad_fraction <= 1)) return { error: "Management-allowed-depletion fraction must be between 0 and 1." };
  if (!(etc_in_day > 0)) return { error: "Crop water use ETc must be positive (in/day)." };
  // TAW = plant-available water in the root zone; RAW = the fraction (MAD) you let deplete before irrigating.
  const taw_in = (field_capacity - wilting_point) * root_depth_in;
  const raw_in = mad_fraction * taw_in;
  const irrigation_interval_days = raw_in / etc_in_day;
  if (![taw_in, raw_in, irrigation_interval_days].every(Number.isFinite)) return { error: "Irrigation-trigger math is not a finite value." };
  return {
    taw_in,
    raw_in,
    irrigation_interval_days,
    note: "When to irrigate and how much, from the soil water reservoir (FAO-56 / NRCS Irrigation Guide). The total available water the root zone can hold is TAW = (field capacity - permanent wilting point) x root depth, both water contents as a fraction (in of water per in of soil). You do not let the crop use all of it: the readily available water RAW = MAD x TAW is the fraction you allow to deplete before the crop stresses, where MAD (management-allowed depletion) is commonly 0.5 (0.3 for shallow-rooted or sensitive crops, up to 0.6 for deep-rooted grains). A silt loam at field capacity 0.30, wilting point 0.12, and a 24 in root zone holds 4.32 in of available water, so at MAD 0.5 you irrigate after 2.16 in is used; at a crop use of 0.25 in/day that is an 8.6-day interval, and the net refill depth is that same 2.16 in (gross depth adds the application efficiency -- see irrigation-requirement). Hotter weather (higher ETc) shortens the interval, a deeper root zone or a finer soil lengthens it. A scheduling aid; the field-measured soil moisture, the actual crop root depth and ETc, and the agronomist govern.",
  };
}

export const madIrrigationTriggerExample = { inputs: { field_capacity: 0.30, wilting_point: 0.12, root_depth_in: 24, mad_fraction: 0.5, etc_in_day: 0.25 } };

function _v964renderMadIrrigationTrigger(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: available-water / management-allowed-depletion irrigation scheduling (FAO-56 / NRCS Irrigation Guide), by name. TAW = (field capacity - wilting point) x root depth; RAW = MAD x TAW; interval = RAW / ETc. MAD ~0.5 (0.3-0.6 by crop). The field-measured soil moisture, the actual root depth and ETc, and the agronomist govern.";
  const fc = makeNumber("Field capacity (in/in, e.g. 0.30)", "mad-fc", { step: "any", min: "0" });
  const wp = makeNumber("Wilting point (in/in, e.g. 0.12)", "mad-wp", { step: "any", min: "0" });
  const rd = makeNumber("Root depth (in)", "mad-rd", { step: "any", min: "0" });
  const md = makeNumber("MAD fraction (0-1, ~0.5)", "mad-md", { step: "any", min: "0" });
  const et = makeNumber("Crop use ETc (in/day)", "mad-et", { step: "any", min: "0" });
  for (const f of [fc, wp, rd, md, et]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fc.input.value = "0.30"; wp.input.value = "0.12"; rd.input.value = "24"; md.input.value = "0.5"; et.input.value = "0.25"; update(); });
  const oT = makeOutputLine(outputRegion, "Total available water (TAW)", "mad-out-t");
  const oR = makeOutputLine(outputRegion, "Readily available / net refill (RAW)", "mad-out-r");
  const oI = makeOutputLine(outputRegion, "Irrigation interval", "mad-out-i");
  const update = debounce(() => {
    const r = computeMadIrrigationTrigger({
      field_capacity: fc.input.value === "" ? 0.30 : Number(fc.input.value), wilting_point: wp.input.value === "" ? 0.12 : Number(wp.input.value),
      root_depth_in: rd.input.value === "" ? 24 : Number(rd.input.value), mad_fraction: md.input.value === "" ? 0.5 : Number(md.input.value),
      etc_in_day: et.input.value === "" ? 0.25 : Number(et.input.value),
    });
    if (r.error) { oT.textContent = r.error; oR.textContent = "-"; oI.textContent = "-"; return; }
    oT.textContent = fmt(r.taw_in, 2) + " in in the root zone";
    oR.textContent = fmt(r.raw_in, 2) + " in";
    oI.textContent = fmt(r.irrigation_interval_days, 1) + " days";
  }, DEBOUNCE_MS);
  for (const f of [fc, wp, rd, md, et]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["mad-irrigation-trigger"] = _v964renderMadIrrigationTrigger;

// ===================== spec-v974: fertigation / chemigation injection rate =====================
// dims: in { product_rate_gal_per_acre: L, area_acres: L^2, set_time_hours: T } out: { total_product_gal: L^3, injection_rate_gph: L^3 T^-1, injection_rate_gpm: L^3 T^-1 }
export function computeFertigationInjectionRate({ product_rate_gal_per_acre = 5, area_acres = 40, set_time_hours = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(product_rate_gal_per_acre > 0)) return { error: "Product rate must be positive (gal/acre)." };
  if (!(area_acres > 0)) return { error: "Area must be positive (acres)." };
  if (!(set_time_hours > 0)) return { error: "Set (irrigation) time must be positive (hours)." };
  // Total product for the field, injected evenly over the irrigation set: injection rate = total / set time.
  const total_product_gal = product_rate_gal_per_acre * area_acres;
  const injection_rate_gph = total_product_gal / set_time_hours;
  const injection_rate_gpm = injection_rate_gph / 60;
  if (![total_product_gal, injection_rate_gph, injection_rate_gpm].every(Number.isFinite)) return { error: "Fertigation math is not a finite value." };
  return {
    total_product_gal,
    injection_rate_gph,
    injection_rate_gpm,
    note: "The injection-pump rate to apply a liquid fertilizer or chemical through an irrigation system (fertigation / chemigation): the total product for the field is the per-acre rate times the acres, and injecting it evenly over the irrigation SET means the pump runs at total product / set time. Applying 5 gal/acre over 40 acres in a 6-hour set is 200 gallons total at a 33.3 gph (0.56 gpm) injection rate -- set the metering pump to that and start it after the system reaches pressure and the last emitter is flowing, then flush the lines with clear water at the end of the set. For a stock (concentrate) solution, the resulting concentration in the irrigation water is the injection flow divided by the system flow times the stock strength (target ppm sets the dilution), and a mixed formulation is checked for compatibility before injecting. CRITICAL: an EPA-required, functioning anti-siphon / check-valve and interlock package must protect the water source from backflow whenever a chemical is injected (chemigation regulations), and the actual injection is calibrated against a drawdown/weight check on the day. A rate estimate; the product label (FIFRA), the state chemigation rules, and the agronomist govern.",
  };
}

export const fertigationInjectionRateExample = { inputs: { product_rate_gal_per_acre: 5, area_acres: 40, set_time_hours: 6 } };

function _v974renderFertigationInjectionRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fertigation / chemigation injection rate, by name. total product = rate (gal/acre) x acres; injection rate = total / set hours. Start after the system is pressurized, flush at the end; an EPA-required anti-siphon/check-valve/interlock package must protect the water source (chemigation rules). The product label (FIFRA), the state chemigation rules, and a drawdown calibration govern.";
  const pr = makeNumber("Product rate (gal/acre)", "fir-pr", { step: "any", min: "0" });
  const ac = makeNumber("Area (acres)", "fir-ac", { step: "any", min: "0" });
  const st = makeNumber("Irrigation set time (hours)", "fir-st", { step: "any", min: "0" });
  for (const f of [pr, ac, st]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pr.input.value = "5"; ac.input.value = "40"; st.input.value = "6"; update(); });
  const oT = makeOutputLine(outputRegion, "Total product", "fir-out-t");
  const oI = makeOutputLine(outputRegion, "Injection rate", "fir-out-i");
  const update = debounce(() => {
    const r = computeFertigationInjectionRate({
      product_rate_gal_per_acre: pr.input.value === "" ? 5 : Number(pr.input.value), area_acres: ac.input.value === "" ? 40 : Number(ac.input.value),
      set_time_hours: st.input.value === "" ? 6 : Number(st.input.value),
    });
    if (r.error) { oT.textContent = r.error; oI.textContent = "-"; return; }
    oT.textContent = fmt(r.total_product_gal, 1) + " gal for the field";
    oI.textContent = fmt(r.injection_rate_gph, 2) + " gph (" + fmt(r.injection_rate_gpm, 3) + " gpm)";
  }, DEBOUNCE_MS);
  for (const f of [pr, ac, st]) f.input.addEventListener("input", update);
}
FARMPRODUCTION_RENDERERS["fertigation-injection-rate"] = _v974renderFertigationInjectionRate;

// ===================== spec-v993: cattle live weight from heart girth =====================
// dims: in { heart_girth_in: L, body_length_in: L } out: { live_weight_lb: M }
export function computeCattleHeartGirthWeight({ heart_girth_in = 70, body_length_in = 55 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(heart_girth_in > 0)) return { error: "Heart girth must be positive (in)." };
  if (!(body_length_in > 0)) return { error: "Body length must be positive (in)." };
  // Schaeffer's formula: live weight (lb) = girth^2 x length / 300, girth and length in inches.
  const live_weight_lb = heart_girth_in * heart_girth_in * body_length_in / 300;
  if (!Number.isFinite(live_weight_lb)) return { error: "Weight math is not a finite value." };
  return {
    live_weight_lb,
    note: "An estimate of a beef animal's live weight from two tape measurements, the weigh-tape method a producer uses when no scale is at hand. Schaeffer's formula multiplies the square of the HEART GIRTH -- the circumference of the body just behind the front legs, around the barrel at the heart -- by the BODY LENGTH from the point of the shoulder to the pin bone (the point of the rump), then divides by 300, with both measurements in inches: weight = girth^2 x length / 300. A steer measuring 70 in around the heart girth and 55 in long estimates 70 x 70 x 55 / 300 = 898 lb. The heart girth dominates because it captures the barrel's cross-section, which is why a snug tape pulled at the smallest point behind the shoulder, with the animal standing square, gives the most repeatable number. The formula is calibrated for mature beef-type cattle and runs a bit off for very young, very fat, dairy-type, or heavily pregnant animals, and commercial weigh tapes printed with just the girth make the same estimate with the length folded into their scale. An on-farm estimate; a certified scale governs a sale weight, and a vet or the tape maker's chart governs a dose or a market decision.",
  };
}

export const cattleHeartGirthWeightExample = { inputs: { heart_girth_in: 70, body_length_in: 55 } };

FARMPRODUCTION_RENDERERS["cattle-heart-girth-weight"] = _r({
  citation: "Citation: cattle live weight from heart girth (Schaeffer's formula), by name. weight (lb) = heart girth^2 x body length / 300, both in inches; girth behind the front legs, length shoulder-point to pin bone. Calibrated for mature beef cattle; off for young/dairy/pregnant animals. A certified scale governs a sale weight.",
  example: cattleHeartGirthWeightExample.inputs,
  fields: [
    { key: "heart_girth_in", label: "Heart girth (in, behind front legs)", kind: "number" },
    { key: "body_length_in", label: "Body length (in, shoulder to pin bone)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "chg-out-w", label: "Estimated live weight", value: (r) => fmt(r.live_weight_lb, 0) + " lb" },
    { key: "n", id: "chg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCattleHeartGirthWeight,
});

// ===================== spec-v994: pre-harvest corn yield (yield component method) =====================
// dims: in { ears_per_thousandth_acre: dimensionless, kernel_rows_around: dimensionless, kernels_per_row: dimensionless, kernel_factor: dimensionless } out: { kernels_per_ear: dimensionless, bushels_per_acre: dimensionless }
export function computeCornYieldEstimate({ ears_per_thousandth_acre = 32, kernel_rows_around = 16, kernels_per_row = 35, kernel_factor = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ears_per_thousandth_acre > 0)) return { error: "Ear count must be positive (ears in 1/1000 acre)." };
  if (!(kernel_rows_around > 0)) return { error: "Kernel rows around the ear must be positive." };
  if (!(kernels_per_row > 0)) return { error: "Kernels per row must be positive." };
  if (!(kernel_factor > 0)) return { error: "Kernel factor (thousands of kernels per bushel) must be positive." };
  // Yield component method: bu/ac = ears (per 1/1000 acre) x kernels/ear / factor (factor = 1000s of kernels/bushel).
  const kernels_per_ear = kernel_rows_around * kernels_per_row;
  const bushels_per_acre = ears_per_thousandth_acre * kernels_per_ear / kernel_factor;
  if (![kernels_per_ear, bushels_per_acre].every(Number.isFinite)) return { error: "Corn-yield math is not a finite value." };
  return {
    kernels_per_ear,
    bushels_per_acre,
    note: "An in-season estimate of corn grain yield from three field counts, the yield component (ear-count) method extension agronomists use weeks before harvest. Count the ears in 1/1000 of an acre -- 17 ft 5 in of a single row at 30 in row spacing -- then on a representative ear count the kernel ROWS around the cob and the kernels per row; their product is the kernels per ear. Estimated bushels per acre is the ears times the kernels per ear, divided by a kernel factor: ears x (rows around x kernels per row) / factor. The factor is the thousands of kernels in a 56-lb bushel, about 90 for average-size kernels, adjusted DOWN to about 75-80 in a good year with big, heavy kernels (which RAISES the estimate) and UP to about 95-100 in a stressed year with small kernels. Thirty-two ears with 16 rows of 35 kernels at a factor of 90 gives 32 x 560 / 90 = 199 bushels per acre; a thinner, smaller-eared stand at 28 ears and 480 kernels per ear gives about 149. Accuracy improves by averaging several 1/1000-acre counts across the field and picking truly representative ears, and the estimate is roughest before the kernels finish filling (the R5-R6 dent-to-black-layer stage). A pre-harvest estimate; the actual harvested and moisture-corrected yield (crop-yield) is the real number, and the combine and the scale govern.",
  };
}

export const cornYieldEstimateExample = { inputs: { ears_per_thousandth_acre: 32, kernel_rows_around: 16, kernels_per_row: 35, kernel_factor: 90 } };

FARMPRODUCTION_RENDERERS["corn-yield-estimate"] = _r({
  citation: "Citation: pre-harvest corn yield, yield component (ear-count) method (Purdue / Iowa State Extension), by name. bu/ac = ears (per 1/1000 acre) x (rows around x kernels per row) / factor; factor = thousands of kernels per bushel (~90, 75-80 big kernels, 95-100 small). Count ears in 17.5 ft of 30-in row. A pre-harvest estimate; the harvested, moisture-corrected yield governs.",
  example: cornYieldEstimateExample.inputs,
  fields: [
    { key: "ears_per_thousandth_acre", label: "Ears in 1/1000 acre (17.5 ft of 30-in row)", kind: "number" },
    { key: "kernel_rows_around", label: "Kernel rows around the ear", kind: "number" },
    { key: "kernels_per_row", label: "Kernels per row", kind: "number" },
    { key: "kernel_factor", label: "Kernel factor (1000s kernels/bu, ~90)", kind: "number" },
  ],
  outputs: [
    { key: "k", id: "cye-out-k", label: "Kernels per ear", value: (r) => fmt(r.kernels_per_ear, 0) },
    { key: "y", id: "cye-out-y", label: "Estimated yield", value: (r) => fmt(r.bushels_per_acre, 0) + " bu/acre" },
    { key: "n", id: "cye-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCornYieldEstimate,
});

// ===================== spec-v995: carcass dressing percentage =====================
// dims: in { live_weight_lb: M, hot_carcass_weight_lb: M, cutting_yield_pct: dimensionless, chill_shrink_pct: dimensionless } out: { dressing_pct: dimensionless, chilled_carcass_lb: M, boneless_yield_lb: M }
export function computeDressingPercentage({ live_weight_lb = 1200, hot_carcass_weight_lb = 744, cutting_yield_pct = 67, chill_shrink_pct = 3.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(live_weight_lb > 0)) return { error: "Live weight must be positive (lb)." };
  if (!(hot_carcass_weight_lb > 0)) return { error: "Hot carcass weight must be positive (lb)." };
  if (!(hot_carcass_weight_lb <= live_weight_lb)) return { error: "Carcass weight cannot exceed the live weight." };
  if (!(cutting_yield_pct > 0 && cutting_yield_pct <= 100)) return { error: "Cutting yield must be between 0 and 100 percent." };
  if (!(chill_shrink_pct >= 0 && chill_shrink_pct < 100)) return { error: "Chill shrink must be at least 0 and under 100 percent." };
  // Dressing % = hot carcass weight / live weight. The cutting yield applies to
  // the CHILLED carcass: the hot carcass loses moisture in the cooler (UW-Madison
  // Extension uses 3.5%, Mississippi State 4%). Until 2026-09-25 the yield was
  // applied to the hot weight, overstating the freezer meat by the shrink.
  const dressing_pct = hot_carcass_weight_lb / live_weight_lb * 100;
  const chilled_carcass_lb = hot_carcass_weight_lb * (1 - chill_shrink_pct / 100);
  const boneless_yield_lb = chilled_carcass_lb * cutting_yield_pct / 100;
  if (![dressing_pct, chilled_carcass_lb, boneless_yield_lb].every(Number.isFinite)) return { error: "Dressing-percentage math is not a finite value." };
  return {
    dressing_pct,
    chilled_carcass_lb,
    boneless_yield_lb,
    note: "The dressing percentage and take-home meat yield of a slaughter animal, the numbers a producer and a locker use to price freezer beef, pork, or lamb. Dressing percentage is the hot carcass weight (the carcass weighed right after slaughter, before chilling, with head, hide, feet, and offal removed) divided by the live weight: a 1,200 lb steer yielding a 744 lb carcass dresses at 744 / 1,200 = 62.0%, typical for beef (about 60-64%). Pork runs higher because the skin and feet stay on -- a 260 lb hog with a 190 lb carcass dresses at 73.1% (about 72-75%) -- and lamb runs lower, near 50%. The actual boneless meat that goes in the freezer is far less than the carcass, because the carcass weight still includes bone, trim fat, and cutting loss: the carcass first loses about 3.5-4% of its weight as moisture in the cooler, and a beef cutting yield of about 65-70% of that chilled carcass is common, so the 744 lb carcass chills to 744 x 0.965 = 718 lb and gives roughly 718 x 0.67 = 481 lb of cut-and-wrapped meat (UW-Madison Extension's worked example). Dressing percentage rises with fatter, more muscular, lighter-gutted animals and falls with fill (a full rumen) and heavy hide or mud. A pricing and planning aid; the actual weights come from the processor's certified scale, and the exact cut sheet, aging shrink, and the packer or locker govern the freezer yield.",
  };
}

export const dressingPercentageExample = { inputs: { live_weight_lb: 1200, hot_carcass_weight_lb: 744, cutting_yield_pct: 67, chill_shrink_pct: 3.5 } };

FARMPRODUCTION_RENDERERS["dressing-percentage"] = _r({
  citation: "Citation: carcass dressing percentage and freezer yield, by name. dressing % = hot carcass weight / live weight x 100; chilled carcass = hot carcass x (1 - chill shrink); take-home = chilled carcass x cutting yield. Typical dressing: beef 60-64%, pork 72-75%, lamb ~50%; beef cutting yield ~65-70% of the carcass. The processor's certified scale and the cut sheet govern the actual freezer yield.",
  example: dressingPercentageExample.inputs,
  fields: [
    { key: "live_weight_lb", label: "Live weight (lb)", kind: "number" },
    { key: "hot_carcass_weight_lb", label: "Hot carcass weight (lb)", kind: "number" },
    { key: "cutting_yield_pct", label: "Cutting yield (% of chilled carcass)", kind: "number" },
    { key: "chill_shrink_pct", label: "Cooler chill shrink (%)", kind: "number", default: 3.5 },
  ],
  outputs: [
    { key: "d", id: "drp-out-d", label: "Dressing percentage", value: (r) => fmt(r.dressing_pct, 1) + " %" },
    { key: "c", id: "drp-out-c", label: "Chilled carcass", value: (r) => fmt(r.chilled_carcass_lb, 0) + " lb" },
    { key: "b", id: "drp-out-b", label: "Freezer yield", value: (r) => fmt(r.boneless_yield_lb, 0) + " lb" },
    { key: "n", id: "drp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDressingPercentage,
});

// --- spec-v1265: reference evapotranspiration ET0 (Hargreaves / FAO-56) ---
// The irrigation tiles (acre-foot ET requirement, irrigation scheduling) CONSUME a reference ET (ET0) but
// none computes it -- the note at the crop-Kc table says ET0 "is user-supplied from the local CIMIS / Mesonet /
// NOAA station." This fills that needed-input gap with the Hargreaves (1985) equation, the temperature-only
// method FAO-56 recommends when only air temperature is reliable: ET0 = 0.0023 (Tmean + 17.8) sqrt(Tmax - Tmin) Ra,
// with Ra the extraterrestrial radiation computed from latitude and day of year by the FAO-56 astronomical
// equations (Annex 2) -- no table lookup. Temperatures in F (US practice), ET0 out in in/day and mm/day.
// dims: in { latitude_deg: dimensionless, month: dimensionless, tmax_f: T, tmin_f: T } out: { et0_in_day: L T^-1, et0_mm_day: L T^-1, ra_mj_m2_day: dimensionless, day_of_year: dimensionless, tmean_f: T }
export function computeReferenceEt0({ latitude_deg = 0, month = "jul", tmax_f = 0, tmin_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const mi = MONTHS.indexOf(String(month));
  if (mi < 0) return { error: "Month must be one of jan..dec." };
  const lat = Number(latitude_deg);
  const tmaxF = Number(tmax_f);
  const tminF = Number(tmin_f);
  if (!Number.isFinite(lat) || lat < -66.5 || lat > 66.5) return { error: "Latitude must be between -66.5 and 66.5 degrees (+ north, - south); the polar circles are outside this method." };
  if (!Number.isFinite(tmaxF) || !Number.isFinite(tminF)) return { error: "Both temperatures must be numbers (F)." };
  if (!(tmaxF >= tminF)) return { error: "The daily high (Tmax) must be at or above the daily low (Tmin)." };
  const J = Math.floor(30.4 * (mi + 1) - 15 + 1e-9); // FAO-56 mid-month day of year
  const tmaxC = (tmaxF - 32) * 5 / 9;
  const tminC = (tminF - 32) * 5 / 9;
  const tmeanC = (tmaxC + tminC) / 2;
  const dT = tmaxC - tminC;
  const phi = lat * Math.PI / 180;
  const dr = 1 + 0.033 * Math.cos(2 * Math.PI * J / 365);
  const dec = 0.409 * Math.sin(2 * Math.PI * J / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
  const Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws)); // MJ/m^2/day
  const raMm = Ra / 2.45; // equivalent evaporation, mm/day
  const et0Mm = 0.0023 * raMm * (tmeanC + 17.8) * Math.sqrt(dT);
  const et0In = et0Mm / 25.4;
  if (![Ra, et0Mm, et0In].every(Number.isFinite) || et0Mm < 0) return { error: "ET0 math is not a finite non-negative value; check the inputs." };
  return {
    et0_in_day: et0In, et0_mm_day: et0Mm, ra_mj_m2_day: Ra, day_of_year: J, tmean_f: (tmaxF + tminF) / 2,
    note: "Reference evapotranspiration ET0 by the Hargreaves equation, the value the irrigation tiles ask you to look up: ET0 = 0.0023 (Tmean + 17.8) sqrt(Tmax - Tmin) Ra. It is the water a short, well-watered reference grass would use per day, the baseline every crop's demand is scaled from (crop ET = Kc x ET0, the acre-foot and scheduling tiles). Hargreaves is the temperature-only method FAO-56 recommends where only reliable air temperature is available; the extraterrestrial radiation Ra is computed from your latitude and the middle of the selected month using the FAO-56 astronomical equations, so no radiation table is needed. The daily temperature range stands in for cloudiness and humidity, which is why a clear, dry site reads higher than a humid one at the same mean temperature. Expect roughly 0.05-0.10 in/day in cool weather and 0.25-0.35 in/day at a hot, arid mid-summer peak. A planning aid; a local weather-station ET0 (CIMIS, Mesonet) and the full FAO-56 Penman-Monteith method govern when full climate data exist.",
  };
}
export const referenceEt0Example = { inputs: { latitude_deg: 45, month: "jul", tmax_f: 86, tmin_f: 59 } };
FARMPRODUCTION_RENDERERS["reference-et0"] = _r({
  citation: "Citation: Hargreaves reference ET (Hargreaves & Samani 1985) as presented in FAO Irrigation & Drainage Paper 56 (Allen et al. 1998), by name: ET0 = 0.0023 (Tmean + 17.8) sqrt(Tmax - Tmin) Ra; extraterrestrial radiation Ra from the FAO-56 Annex 2 astronomical equations by latitude and day of year. Free at fao.org. A local station ET0 and the full Penman-Monteith method govern when full climate data exist.",
  example: referenceEt0Example.inputs,
  fields: [
    { key: "latitude_deg", label: "Latitude (deg, + north / - south)", kind: "number", attrs: { step: "any" } },
    { key: "month", label: "Month", kind: "select", default: "jul", options: [
      { value: "jan", label: "January" }, { value: "feb", label: "February" }, { value: "mar", label: "March" },
      { value: "apr", label: "April" }, { value: "may", label: "May" }, { value: "jun", label: "June" },
      { value: "jul", label: "July" }, { value: "aug", label: "August" }, { value: "sep", label: "September" },
      { value: "oct", label: "October" }, { value: "nov", label: "November" }, { value: "dec", label: "December" },
    ] },
    { key: "tmax_f", label: "Daily high Tmax (°F)", kind: "number", attrs: { step: "any" } },
    { key: "tmin_f", label: "Daily low Tmin (°F)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "e", id: "et0-out-e", label: "Reference ET0", value: (r) => fmt(r.et0_in_day, 3) + " in/day (" + fmt(r.et0_mm_day, 2) + " mm/day)" },
    { key: "r", id: "et0-out-r", label: "Extraterrestrial radiation Ra", value: (r) => fmt(r.ra_mj_m2_day, 1) + " MJ/m2/day (mid-month day " + r.day_of_year + ")" },
    { key: "n", id: "et0-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReferenceEt0,
});
