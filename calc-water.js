// Group M: Water and Wastewater Operations (utilities 210-215).
// See spec-v4.md section 2.4.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// --- 210: Pounds Formula ---
//
// Pounds/day = flow (MGD) * dose (mg/L) * 8.34
// Adjusted dose = pounds_target / (flow * purity_pct/100 * 8.34)

export const CHEMICAL_PURITY = {
  chlorine_gas:           { pct: 100,  label: "Chlorine gas (Cl2)" },
  sodium_hypochlorite:    { pct: 12.5, label: "Sodium hypochlorite (12.5%)" },
  calcium_hypochlorite:   { pct: 65,   label: "Calcium hypochlorite (65%)" },
  fluorosilicic_acid:     { pct: 23,   label: "Fluorosilicic acid (23%)" },
  alum_dry:               { pct: 100,  label: "Alum, dry" },
  alum_liquid:            { pct: 48.5, label: "Alum liquid (48.5%)" },
  ferric_chloride_38:     { pct: 38,   label: "Ferric chloride (38%)" },
};

export function computePoundsFormula({ flow_mgd = 0, dose_mg_l = 0, chemical = "chlorine_gas" }) {
  const c = CHEMICAL_PURITY[chemical];
  if (!c) return { error: "Unknown chemical." };
  if (!(flow_mgd >= 0)) return { error: "Flow must be non-negative." };
  if (!(dose_mg_l >= 0)) return { error: "Dose must be non-negative." };
  const pure_lb_day = flow_mgd * dose_mg_l * 8.34;
  const purity = c.pct / 100;
  const product_lb_day = purity > 0 ? pure_lb_day / purity : pure_lb_day;
  return { pure_lb_day, product_lb_day, purity_pct: c.pct, chemical_label: c.label };
}

export const poundsFormulaExample = { inputs: { flow_mgd: 5, dose_mg_l: 2.5, chemical: "sodium_hypochlorite" } };

// --- 211: Filter Loading Rate and Backwash ---

export function computeFilterLoading({ filter_area_ft2 = 0, flow_gpm = 0, backwash_rate_gpm_ft2 = 15 }) {
  if (!(filter_area_ft2 > 0)) return { error: "Filter area must be positive." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive." };
  if (!(backwash_rate_gpm_ft2 > 0)) return { error: "Backwash rate must be positive." };
  const loading = flow_gpm / filter_area_ft2;
  const backwash_gpm = backwash_rate_gpm_ft2 * filter_area_ft2;
  let category = "outside typical bands";
  if (loading >= 2 && loading <= 5) category = "rapid sand (2-5 gpm/ft^2)";
  else if (loading > 5 && loading <= 8) category = "high-rate (4-8 gpm/ft^2)";
  else if (loading < 2) category = "below typical (low loading)";
  else category = "above high-rate (verify design)";
  return { loading_gpm_per_ft2: loading, backwash_gpm, category };
}

export const filterLoadingExample = { inputs: { filter_area_ft2: 200, flow_gpm: 800, backwash_rate_gpm_ft2: 15 } };

// --- 212: Detention Time ---

export function computeDetentionTime({ tank_volume_gal = 0, flow_gpm = 0, target_minutes = 0 }) {
  if (!(tank_volume_gal >= 0)) return { error: "Tank volume must be non-negative." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive." };
  const minutes = tank_volume_gal / flow_gpm;
  const hours = minutes / 60;
  const days = hours / 24;
  const pass_target = target_minutes > 0 ? minutes >= target_minutes : null;
  return { minutes, hours, days, pass_target };
}

export const detentionTimeExample = { inputs: { tank_volume_gal: 50000, flow_gpm: 350, target_minutes: 120 } };

// --- 213: Lab Dilution and Serial Dilution ---
//
// C1V1 = C2V2; serial: each step divides by the dilution factor.

export function computeDilution({ c1 = 0, v1 = 0, c2 = 0, v2 = 0, mode = "single", steps = 1, dilution_factor = 10 }) {
  if (mode === "single") {
    // Solve for the missing one of v1 / v2 / c1 / c2 if exactly one is zero.
    const known = [c1, v1, c2, v2].filter((x) => x > 0).length;
    if (known < 3) return { error: "Provide three of c1, v1, c2, v2." };
    let out = { c1, v1, c2, v2 };
    if (out.c2 === 0) out.c2 = (c1 * v1) / v2;
    else if (out.v2 === 0) out.v2 = (c1 * v1) / c2;
    else if (out.c1 === 0) out.c1 = (c2 * v2) / v1;
    else if (out.v1 === 0) out.v1 = (c2 * v2) / c1;
    out.diluent = out.v2 - out.v1;
    return out;
  }
  if (mode === "serial") {
    if (!(c1 > 0)) return { error: "Stock concentration must be positive." };
    if (!(steps >= 1)) return { error: "Need at least one step." };
    if (!(dilution_factor > 1)) return { error: "Dilution factor must be > 1." };
    const series = [];
    let c = c1;
    for (let i = 0; i < steps; i++) {
      c = c / dilution_factor;
      series.push({ step: i + 1, concentration: c });
    }
    return { mode: "serial", series, final_concentration: c };
  }
  return { error: "Unknown mode." };
}

export const dilutionExample = { inputs: { c1: 1000, v1: 0, c2: 50, v2: 100, mode: "single" } };

// --- 214: Pump Wire-to-Water Efficiency ---

export function computePumpEfficiency({ flow_gpm = 0, tdh_ft = 0, motor_kW = 0, motor_eff = 0.92, drive_eff = 1.0 }) {
  if (!(flow_gpm >= 0)) return { error: "Flow must be non-negative." };
  if (!(tdh_ft >= 0)) return { error: "TDH must be non-negative." };
  if (!(motor_kW > 0)) return { error: "Motor input kW must be positive." };
  if (!(motor_eff > 0 && motor_eff <= 1)) return { error: "Motor efficiency must be 0-1." };
  if (!(drive_eff > 0 && drive_eff <= 1)) return { error: "Drive efficiency must be 0-1." };
  const whp = (flow_gpm * tdh_ft) / 3960; // water horsepower
  const motor_hp = motor_kW * 1.34102;
  const bhp = motor_hp * motor_eff * drive_eff; // brake horsepower at the pump shaft
  const wire_to_water_pct = (whp / motor_hp) * 100;
  let category;
  if (wire_to_water_pct >= 65) category = "good";
  else if (wire_to_water_pct >= 50) category = "ok";
  else category = "degraded";
  return { whp, bhp, wire_to_water_pct, category };
}

export const pumpEfficiencyExample = { inputs: { flow_gpm: 1500, tdh_ft: 100, motor_kW: 60, motor_eff: 0.93, drive_eff: 1.0 } };

// --- 215: Solids Retention Time and F/M Ratio ---

export function computeSRTandFM({
  aeration_volume_gal = 0, mlss_mg_l = 0, mlvss_mg_l = 0,
  ras_flow_mgd = 0, ras_tss_mg_l = 0,
  was_flow_mgd = 0, was_tss_mg_l = 0,
  bod_load_lb_day = 0, effluent_tss_mg_l = 0, effluent_flow_mgd = 0,
}) {
  if (!(aeration_volume_gal > 0)) return { error: "Aeration volume must be positive." };
  if (!(mlss_mg_l > 0)) return { error: "MLSS must be positive." };
  // Convert aeration volume to MG, then to lb of solids.
  const aeration_mg = aeration_volume_gal / 1e6;
  const mlss_lb = aeration_mg * mlss_mg_l * 8.34;
  const mlvss_lb = aeration_mg * mlvss_mg_l * 8.34;
  // Solids leaving the system per day: WAS + effluent.
  const was_lb_day = was_flow_mgd * was_tss_mg_l * 8.34;
  const eff_lb_day = effluent_flow_mgd * effluent_tss_mg_l * 8.34;
  const total_out = was_lb_day + eff_lb_day;
  const srt_days = total_out > 0 ? mlss_lb / total_out : Infinity;
  // F/M = BOD load / (MLVSS * tank volume in MG); equivalent to BOD lb/day / MLVSS lb in tank.
  const fm_ratio = mlvss_lb > 0 ? bod_load_lb_day / mlvss_lb : null;
  let cas_flag = "outside typical CAS";
  if (srt_days >= 4 && srt_days <= 15 && fm_ratio !== null && fm_ratio >= 0.2 && fm_ratio <= 0.5) {
    cas_flag = "within conventional activated-sludge range (SRT 4-15 d, F/M 0.2-0.5)";
  }
  return { mlss_lb, mlvss_lb, srt_days, fm_ratio, cas_flag };
}

export const srtFMExample = { inputs: { aeration_volume_gal: 1500000, mlss_mg_l: 2500, mlvss_mg_l: 1900, ras_flow_mgd: 2.0, ras_tss_mg_l: 8000, was_flow_mgd: 0.05, was_tss_mg_l: 7500, bod_load_lb_day: 6000, effluent_tss_mg_l: 12, effluent_flow_mgd: 5.0 } };

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
}

const renderPounds = _r({
  citation: "Citation: Pounds formula by name. lb/day = flow MGD * dose mg/L * 8.34. Adjusted product dose at the selected purity.",
  example: poundsFormulaExample.inputs,
  fields: [
    { key: "flow_mgd",   label: "Flow (MGD)", kind: "number" },
    { key: "dose_mg_l",  label: "Dose (mg/L)", kind: "number" },
    { key: "chemical",   label: "Chemical", kind: "select", options: Object.keys(CHEMICAL_PURITY).map((k) => ({ value: k, label: CHEMICAL_PURITY[k].label })) },
  ],
  outputs: [
    { key: "p", id: "pf-out-p", label: "Pure equivalent",     value: (r) => fmt(r.pure_lb_day, 2) + " lb/day" },
    { key: "a", id: "pf-out-a", label: "Product feed",        value: (r) => fmt(r.product_lb_day, 2) + " lb/day" },
    { key: "u", id: "pf-out-u", label: "Purity used",         value: (r) => r.chemical_label + " (" + r.purity_pct + "%)" },
  ],
  compute: computePoundsFormula,
});

const renderFilterLoading = _r({
  citation: "Citation: AWWA general practice by name only. Loading rate = flow / area. Backwash flow = backwash rate * area.",
  example: filterLoadingExample.inputs,
  fields: [
    { key: "filter_area_ft2",       label: "Filter area (ft^2)", kind: "number" },
    { key: "flow_gpm",              label: "Flow (GPM)", kind: "number" },
    { key: "backwash_rate_gpm_ft2", label: "Backwash rate (gpm/ft^2)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "l", id: "fl-out-l", label: "Loading rate", value: (r) => fmt(r.loading_gpm_per_ft2, 2) + " gpm/ft^2" },
    { key: "b", id: "fl-out-b", label: "Backwash flow",value: (r) => fmt(r.backwash_gpm, 0) + " GPM" },
    { key: "c", id: "fl-out-c", label: "Category",     value: (r) => r.category },
  ],
  compute: computeFilterLoading,
});

const renderDetentionTime = _r({
  citation: "Citation: Detention time = volume / flow. Used for chlorine contact, flocculation, sedimentation.",
  example: detentionTimeExample.inputs,
  fields: [
    { key: "tank_volume_gal", label: "Tank volume (gal)", kind: "number" },
    { key: "flow_gpm",        label: "Flow (GPM)", kind: "number" },
    { key: "target_minutes",  label: "Target (min, optional)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "dt-out-m", label: "Detention time", value: (r) => fmt(r.minutes, 1) + " min / " + fmt(r.hours, 2) + " hr / " + fmt(r.days, 3) + " d" },
    { key: "p", id: "dt-out-p", label: "Pass target",    value: (r) => r.pass_target === null ? "(no target set)" : (r.pass_target ? "PASS" : "FAIL") },
  ],
  compute: computeDetentionTime,
});

function renderDilution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: C1V1 = C2V2 dilution form. Serial mode applies the dilution factor at each step.";
  attachExampleButton(inputRegion, () => fillExample(dilutionExample.inputs));
  const c1 = makeNumber("Stock C1", "dl-c1", { step: "any", min: "0" });
  const v1 = makeNumber("Stock V1", "dl-v1", { step: "any", min: "0" });
  const c2 = makeNumber("Final C2", "dl-c2", { step: "any", min: "0" });
  const v2 = makeNumber("Final V2", "dl-v2", { step: "any", min: "0" });
  const mode = makeSelect("Mode", "dl-mode", [{ value: "single", label: "Single (solve missing)" }, { value: "serial", label: "Serial" }]);
  const steps = makeNumber("Serial steps", "dl-steps", { step: "1", min: "1" });
  const df = makeNumber("Dilution factor (>1)", "dl-df", { step: "any", min: "1.001" });
  for (const f of [c1, v1, c2, v2, mode, steps, df]) inputRegion.appendChild(f.wrap);
  const oC1 = makeOutputLine(outputRegion, "C1", "dl-out-c1");
  const oV1 = makeOutputLine(outputRegion, "V1", "dl-out-v1");
  const oC2 = makeOutputLine(outputRegion, "C2", "dl-out-c2");
  const oV2 = makeOutputLine(outputRegion, "V2", "dl-out-v2");
  const oD = makeOutputLine(outputRegion, "Diluent / final concentration", "dl-out-d");
  function fillExample(v) {
    c1.input.value = v.c1; v1.input.value = v.v1; c2.input.value = v.c2; v2.input.value = v.v2; mode.select.value = v.mode;
    update();
  }
  const update = debounce(() => {
    const r = computeDilution({
      c1: Number(c1.input.value) || 0, v1: Number(v1.input.value) || 0,
      c2: Number(c2.input.value) || 0, v2: Number(v2.input.value) || 0,
      mode: mode.select.value, steps: Number(steps.input.value) || 1, dilution_factor: Number(df.input.value) || 10,
    });
    if (r.error) { oC1.textContent = r.error; oV1.textContent = "-"; oC2.textContent = "-"; oV2.textContent = "-"; oD.textContent = "-"; return; }
    if (r.mode === "serial") {
      oC1.textContent = "(serial)"; oV1.textContent = "-"; oC2.textContent = "-"; oV2.textContent = "-";
      oD.textContent = "Final " + fmt(r.final_concentration, 4) + " (" + r.series.length + " steps)";
    } else {
      oC1.textContent = fmt(r.c1, 4); oV1.textContent = fmt(r.v1, 4);
      oC2.textContent = fmt(r.c2, 4); oV2.textContent = fmt(r.v2, 4);
      oD.textContent = "Diluent " + fmt(r.diluent, 4);
    }
  }, DEBOUNCE_MS);
  for (const el of [c1.input, v1.input, c2.input, v2.input, mode.select, steps.input, df.input]) el.addEventListener("input", update);
}

const renderPumpEff = _r({
  citation: "Citation: Hydraulic Institute by name only. WHP = (GPM * TDH) / 3960. Wire-to-water % = WHP / motor_HP.",
  example: pumpEfficiencyExample.inputs,
  fields: [
    { key: "flow_gpm",   label: "Flow (GPM)", kind: "number" },
    { key: "tdh_ft",     label: "Total dynamic head (ft)", kind: "number" },
    { key: "motor_kW",   label: "Motor input (kW)", kind: "number" },
    { key: "motor_eff",  label: "Motor efficiency (0-1)", kind: "number", default: 0.92 },
    { key: "drive_eff",  label: "Drive efficiency (0-1)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "w", id: "pe-out-w", label: "Water HP",         value: (r) => fmt(r.whp, 2) + " hp" },
    { key: "b", id: "pe-out-b", label: "Brake HP estimate",value: (r) => fmt(r.bhp, 2) + " hp" },
    { key: "p", id: "pe-out-p", label: "Wire-to-water",    value: (r) => fmt(r.wire_to_water_pct, 1) + " % - " + r.category },
  ],
  compute: computePumpEfficiency,
});

const renderSRTFM = _r({
  citation: "Citation: Metcalf and Eddy by name only. SRT = aeration solids / waste solids per day. F/M = BOD load / MLVSS in tank.",
  example: srtFMExample.inputs,
  fields: [
    { key: "aeration_volume_gal", label: "Aeration volume (gal)", kind: "number" },
    { key: "mlss_mg_l",           label: "MLSS (mg/L)", kind: "number" },
    { key: "mlvss_mg_l",          label: "MLVSS (mg/L)", kind: "number" },
    { key: "ras_flow_mgd",        label: "RAS flow (MGD)", kind: "number" },
    { key: "ras_tss_mg_l",        label: "RAS TSS (mg/L)", kind: "number" },
    { key: "was_flow_mgd",        label: "WAS flow (MGD)", kind: "number" },
    { key: "was_tss_mg_l",        label: "WAS TSS (mg/L)", kind: "number" },
    { key: "bod_load_lb_day",     label: "BOD load (lb/day)", kind: "number" },
    { key: "effluent_tss_mg_l",   label: "Effluent TSS (mg/L)", kind: "number" },
    { key: "effluent_flow_mgd",   label: "Effluent flow (MGD)", kind: "number" },
  ],
  outputs: [
    { key: "ml", id: "sf-out-ml", label: "MLSS in tank",    value: (r) => fmt(r.mlss_lb, 1) + " lb" },
    { key: "mv", id: "sf-out-mv", label: "MLVSS in tank",   value: (r) => fmt(r.mlvss_lb, 1) + " lb" },
    { key: "s",  id: "sf-out-s",  label: "SRT",             value: (r) => Number.isFinite(r.srt_days) ? fmt(r.srt_days, 2) + " d" : "infinity (no waste)" },
    { key: "f",  id: "sf-out-f",  label: "F/M ratio",       value: (r) => r.fm_ratio === null ? "-" : fmt(r.fm_ratio, 3) },
    { key: "c",  id: "sf-out-c",  label: "CAS check",       value: (r) => r.cas_flag },
  ],
  compute: computeSRTandFM,
});

// =====================================================================
// v8 Phase E.5 (utility 257): Coagulant Dose from Jar Test
// =====================================================================

// Liquid-stock concentrations: alum 48.5% (manufacturer typical for liquid
// alum in the U.S.); ferric chloride 38% FeCl3 by mass; PAC 10% Al2O3.
// Each shipped product also has a density (specific gravity), since gallons
// per day is the operator's purchase unit.

export const COAGULANT_PRODUCTS = {
  alum_dry:        { strength_pct: 100,  sg: 1.0,  description: "Alum, dry (Al2(SO4)3 14H2O)" },
  alum_liquid:     { strength_pct: 48.5, sg: 1.33, description: "Alum, liquid 48.5%" },
  ferric_chloride: { strength_pct: 38,   sg: 1.40, description: "Ferric chloride 38%" },
  pac_liquid:      { strength_pct: 10,   sg: 1.20, description: "PAC, liquid (10% Al2O3)" },
};

export function computeCoagulantDose({
  flow_mgd = 0,
  jar_test_dose_mg_l = 0,
  product = "alum_liquid",
} = {}) {
  if (!(flow_mgd > 0)) return { error: "Flow MGD must be positive." };
  if (!(jar_test_dose_mg_l > 0)) return { error: "Jar-test dose must be positive." };
  const p = COAGULANT_PRODUCTS[product];
  if (!p) return { error: "Unknown coagulant product." };
  // Pure equivalent pounds per day (mass-balance constant 8.34 lb/gal water at 60 F).
  const pure_lb_day = flow_mgd * jar_test_dose_mg_l * 8.34;
  // Product feed adjusts for strength.
  const product_lb_day = pure_lb_day / (p.strength_pct / 100);
  // Product gallons per day uses product density.
  const product_density_lb_per_gal = p.sg * 8.34;
  const product_gal_day = product_lb_day / product_density_lb_per_gal;
  return {
    pure_lb_day, product_lb_day, product_gal_day,
    product_label: p.description,
    product_strength_pct: p.strength_pct,
    product_density_lb_per_gal,
  };
}

export const coagulantDoseExample = {
  inputs: { flow_mgd: 5, jar_test_dose_mg_l: 20, product: "alum_liquid" },
};

import {
  DEBOUNCE_MS as _V8W_DEB, debounce as _v8w_debounce, fmt as _v8w_fmt,
  makeNumber as _v8w_makeNumber, makeSelect as _v8w_makeSelect,
  attachExampleButton as _v8w_attachEx, makeOutputLine as _v8w_makeOut,
} from "./ui-fields.js";

function _v8w_renderCoagulantDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pounds-formula equivalent for coagulants. lb/day = MGD × mg/L × 8.34. Product feed = pure lb / strength%. Product gal = product lb / (sg × 8.34). Metcalf & Eddy / AWWA M37 by name. Operator of record and primacy agency govern.";
  _v8w_attachEx(inputRegion, () => fillExample(coagulantDoseExample.inputs));
  const f = _v8w_makeNumber("Flow (MGD)", "cd-f", { step: "any", min: "0" });
  const d = _v8w_makeNumber("Jar-test optimal dose (mg/L)", "cd-d", { step: "any", min: "0" });
  const p = _v8w_makeSelect("Product", "cd-p", Object.keys(COAGULANT_PRODUCTS).map((k) => ({ value: k, label: COAGULANT_PRODUCTS[k].description })));
  for (const x of [f, d, p]) inputRegion.appendChild(x.wrap);
  const oP = _v8w_makeOut(outputRegion, "Pure equivalent", "cd-out-p");
  const oF = _v8w_makeOut(outputRegion, "Product feed (lb/day)", "cd-out-f");
  const oG = _v8w_makeOut(outputRegion, "Product feed (gal/day)", "cd-out-g");
  function fillExample(x) { f.input.value = x.flow_mgd; d.input.value = x.jar_test_dose_mg_l; p.select.value = x.product; update(); }
  const update = _v8w_debounce(() => {
    const r = computeCoagulantDose({
      flow_mgd: Number(f.input.value) || 0, jar_test_dose_mg_l: Number(d.input.value) || 0,
      product: p.select.value,
    });
    if (r.error) { oP.textContent = r.error; oF.textContent = "-"; oG.textContent = "-"; return; }
    oP.textContent = _v8w_fmt(r.pure_lb_day, 1) + " lb/day";
    oF.textContent = _v8w_fmt(r.product_lb_day, 1) + " lb/day (" + r.product_strength_pct + "%)";
    oG.textContent = _v8w_fmt(r.product_gal_day, 1) + " gal/day (sg " + (r.product_density_lb_per_gal / 8.34).toFixed(2) + ")";
  }, _V8W_DEB);
  for (const x of [f.input, d.input, p.select]) x.addEventListener("input", update);
}

// =====================================================================
// v9 §E.1 (partial): Sludge Volume Index (SVI)
// =====================================================================
//
// Public USEPA / WEF operator-training formula. The companion F/M ratio
// already lives in the v4 srt-fm-ratio tile; this tile focuses on SVI
// from a 30-minute settled-volume reading and MLSS, with the
// operational bands wastewater operators read at a glance.
//
//   SVI (mL/g) = (SV30_mL_per_L * 1000) / MLSS_mg_per_L
//
// Operational bands (per WEF MOP 11 and USEPA Wastewater Operator
// Training, cited by name; not reproduced as a table):
//   < 80         pin floc / under-aerated; verify against MLSS / DO
//   80 to 150    typical for conventional activated sludge
//   150 to 200   filamentous growth developing; investigate
//   > 200        bulking conditions; sludge will not settle

export function computeSVI({
  sv30_ml_per_l = 0,
  mlss_mg_per_l = 0,
} = {}) {
  const sv30 = Number(sv30_ml_per_l) || 0;
  const mlss = Number(mlss_mg_per_l) || 0;
  if (!(sv30 >= 0)) return { error: "SV30 must be non-negative (mL/L)." };
  if (!(mlss > 0)) return { error: "MLSS must be positive (mg/L)." };
  if (sv30 > 1000) return { error: "SV30 cannot exceed 1000 mL/L (a 1 L cylinder)." };

  const svi_ml_per_g = (sv30 * 1000) / mlss;
  let band;
  if (svi_ml_per_g < 80) band = "pin floc / under-aerated (< 80; verify MLSS and DO)";
  else if (svi_ml_per_g <= 150) band = "typical conventional activated sludge (80-150)";
  else if (svi_ml_per_g <= 200) band = "filamentous growth developing (150-200; investigate)";
  else band = "bulking conditions (> 200; sludge will not settle)";

  const settling_fraction = sv30 / 1000;
  const warnings = [];
  if (mlss > 8000) warnings.push("MLSS above 8000 mg/L is outside the typical CAS range; verify the sample.");
  if (mlss < 500) warnings.push("MLSS below 500 mg/L is outside the typical CAS range; verify the sample.");

  return {
    svi_ml_per_g,
    sv30_settled_fraction: settling_fraction,
    band,
    sv30_ml_per_l: sv30,
    mlss_mg_per_l: mlss,
    warnings,
  };
}

export const sviExample = {
  // Typical CAS plant: SV30 = 300 mL/L, MLSS = 2500 mg/L -> SVI = 120 mL/g (band: typical 80-150).
  inputs: { sv30_ml_per_l: 300, mlss_mg_per_l: 2500 },
};

function renderSVI(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USEPA Wastewater Operator Training (public domain) and WEF Manual of Practice No. 11 by name. State primacy agency NPDES permit governs effluent limits. Companion F:M ratio in the srt-fm-ratio tile. Free at epa.gov.";

  const sv = makeNumber("SV30 (mL/L; volume after 30-min settling)", "svi-sv30", { step: "any", min: "0", max: "1000" });
  const ml = makeNumber("MLSS (mg/L)", "svi-mlss", { step: "any", min: "0" });
  for (const f of [sv, ml]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    sv.input.value = "300"; ml.input.value = "2500"; update();
  });

  const oSVI = makeOutputLine(outputRegion, "SVI (mL/g)", "svi-out-svi");
  const oB = makeOutputLine(outputRegion, "Operational band", "svi-out-b");
  const oSF = makeOutputLine(outputRegion, "30-min settled fraction", "svi-out-sf");
  const oW = makeOutputLine(outputRegion, "Notes", "svi-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeSVI({
      sv30_ml_per_l: readNum(sv.input),
      mlss_mg_per_l: readNum(ml.input),
    });
    if (r.error) {
      oSVI.textContent = r.error; oB.textContent = ""; oSF.textContent = ""; oW.textContent = "";
      return;
    }
    oSVI.textContent = fmt(r.svi_ml_per_g, 1) + " mL/g";
    oB.textContent = r.band;
    oSF.textContent = fmt(r.sv30_settled_fraction * 100, 1) + " %";
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "USEPA / WEF bands; sample procedure (Imhoff cone or 1 L cylinder) governs precision.";
  }, DEBOUNCE_MS);
  for (const f of [sv.input, ml.input]) f.addEventListener("input", update);
}

export const WATER_RENDERERS = {
  "pounds-formula":   renderPounds,
  "filter-loading":   renderFilterLoading,
  "detention-time":   renderDetentionTime,
  "lab-dilution":     renderDilution,
  "pump-eff-w2w":     renderPumpEff,
  "srt-fm-ratio":     renderSRTFM,
  // v8
  "coagulant-dose": _v8w_renderCoagulantDose,
  // v9
  "svi-sludge-index": renderSVI,
};

// =====================================================================
// v9 §E.2: Disinfection CT (USEPA SWTR Guidance Manual)
// =====================================================================
//
// CT = chlorine residual (mg/L) * t10 contact time (min). The SWTR
// requires the CT achieved at the basin's hydraulic 10-percentile to
// equal or exceed the table-required CT for the target log inactivation
// at the entered temperature, pH, and chlorine residual band.
//
// Bundled table: USEPA SWTR Guidance Manual EPA 815-R-99-014 (1999)
// Table A-1 free chlorine 3-log Giardia inactivation, residual <= 0.4
// mg/L band. The values are public-domain federal data. The
// calculator interpolates linearly between the published temperature
// breakpoints (0.5 / 5 / 10 / 15 / 20 / 25 C) and pH breakpoints
// (6.0 / 7.0 / 8.0 / 9.0).
//
// pH and temperature outside the table range flag the input as
// outside the SWTR table; the calculator does not extrapolate.

// Rows: temperatures in C; columns: pH values. Cell = CT_required
// (mg-min/L) for 3-log Giardia inactivation, free chlorine <= 0.4
// mg/L. Cited by name only; values per USEPA SWTR Guidance Manual.
const SWTR_GIARDIA_3LOG_FREECL = {
  temps_C: [0.5, 5, 10, 15, 20, 25],
  pH:      [6.0, 7.0, 8.0, 9.0],
  // Each row matches temps_C; each entry matches pH. Values are
  // commonly cited from the SWTR Guidance Manual operator-training
  // table; see citation. Verify against the state-primacy-agency
  // adopted table before relying on them.
  table: [
    [137, 165, 198, 236], // 0.5 C
    [99,  116, 139, 165], //   5 C
    [73,   87, 104, 125], //  10 C
    [49,   58,  70,  83], //  15 C
    [36,   44,  52,  62], //  20 C
    [24,   29,  35,  41], //  25 C
  ],
};

function _bilinearInterp(table, xs, ys, x, y) {
  // Find x interval.
  let xi = 0;
  for (xi = 0; xi < xs.length - 1; xi++) if (x <= xs[xi + 1]) break;
  xi = Math.min(Math.max(0, xi), xs.length - 2);
  let yi = 0;
  for (yi = 0; yi < ys.length - 1; yi++) if (y <= ys[yi + 1]) break;
  yi = Math.min(Math.max(0, yi), ys.length - 2);
  const x0 = xs[xi], x1 = xs[xi + 1], y0 = ys[yi], y1 = ys[yi + 1];
  const tx = (x - x0) / (x1 - x0);
  const ty = (y - y0) / (y1 - y0);
  const v00 = table[xi][yi];
  const v01 = table[xi][yi + 1];
  const v10 = table[xi + 1][yi];
  const v11 = table[xi + 1][yi + 1];
  // Bilinear: v(x,y) = v00*(1-tx)*(1-ty) + v10*tx*(1-ty) + v01*(1-tx)*ty + v11*tx*ty
  return v00 * (1 - tx) * (1 - ty)
       + v10 * tx       * (1 - ty)
       + v01 * (1 - tx) * ty
       + v11 * tx       * ty;
}

export function computeDisinfectionCT({
  chlorine_mg_l = 0,
  t10_minutes = 0,
  temperature_C = 5,
  pH = 7.0,
} = {}) {
  const C = Number(chlorine_mg_l) || 0;
  const t10 = Number(t10_minutes) || 0;
  const T = Number(temperature_C);
  const p = Number(pH);
  if (!Number.isFinite(C) || C < 0) return { error: "Chlorine residual must be non-negative (mg/L)." };
  if (!Number.isFinite(t10) || t10 <= 0) return { error: "Contact time t10 must be positive (min)." };
  if (!Number.isFinite(T)) return { error: "Temperature must be a number (C)." };
  if (!Number.isFinite(p)) return { error: "pH must be a number." };
  if (T < 0.5 || T > 25) return { error: "Temperature " + T + " C is outside the SWTR Guidance Manual table range (0.5 - 25 C). The tile does not extrapolate." };
  if (p < 6.0 || p > 9.0) return { error: "pH " + p + " is outside the SWTR Guidance Manual table range (6.0 - 9.0). The tile does not extrapolate." };

  // Below 0.2 mg/L the SWTR explicitly does not give credit for
  // disinfection; CT achieved is zero per the spec's edge case.
  if (C < 0.2) {
    return {
      CT_achieved: 0,
      CT_required_3log_Giardia: _bilinearInterp(SWTR_GIARDIA_3LOG_FREECL.table, SWTR_GIARDIA_3LOG_FREECL.temps_C, SWTR_GIARDIA_3LOG_FREECL.pH, T, p),
      log_inactivation: 0,
      pass_3log_giardia: false,
      pass_4log_virus: false,
      warnings: ["Chlorine residual below 0.2 mg/L returns zero CT achieved per SWTR; raise the residual before claiming disinfection credit."],
    };
  }

  const CT_achieved = C * t10;
  const CT_required_giardia = _bilinearInterp(SWTR_GIARDIA_3LOG_FREECL.table, SWTR_GIARDIA_3LOG_FREECL.temps_C, SWTR_GIARDIA_3LOG_FREECL.pH, T, p);
  const log_inactivation = (CT_achieved / CT_required_giardia) * 3.0;
  const pass_3log_giardia = CT_achieved >= CT_required_giardia;
  // 4-log virus is far easier to achieve than 3-log Giardia for free
  // chlorine; if Giardia passes, virus passes. This is the operator
  // shorthand referenced in the SWTR Guidance Manual.
  const pass_4log_virus = pass_3log_giardia;

  const warnings = [];
  if (C > 0.4) warnings.push("Chlorine residual above 0.4 mg/L falls in a different SWTR band; the bundled table covers <= 0.4 mg/L. Verify against the higher-residual table for high-residual systems.");

  return {
    CT_achieved,
    CT_required_3log_Giardia: CT_required_giardia,
    log_inactivation,
    pass_3log_giardia,
    pass_4log_virus,
    warnings,
  };
}

export const disinfectionCTExample = {
  // Spec-v9 §E.2 worked example: 3-log Giardia at 5 C / pH 7.0 with
  // CT_required = 116 mg-min/L. Operator achieves C=0.4 mg/L * t10=300
  // min = 120 mg-min/L -> passes 3-log Giardia.
  inputs: { chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 7.0 },
};

function renderDisinfectionCT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USEPA Surface Water Treatment Rule Guidance Manual EPA 815-R-99-014 Table A-1 (free chlorine 3-log Giardia inactivation, ≤0.4 mg/L band, 6 temperature x 4 pH grid). 4-log virus credit per SWTR Table E-1 simplified contact-time formula. State primacy agency governs CT compliance; this tile is a planning check, not a compliance report. Free at epa.gov/dwreginfo/surface-water-treatment-rules.";

  const c = makeNumber("Free chlorine residual (mg/L)", "ct-c", { step: "any", min: "0" });
  const t10 = makeNumber("Contact time t10 (min; basin 10-percentile)", "ct-t10", { step: "any", min: "0" });
  const t = makeNumber("Water temperature (C; 0.5 - 25)", "ct-t", { step: "any", value: "5" });
  t.input.value = "5";
  const p = makeNumber("pH (6.0 - 9.0)", "ct-p", { step: "any", value: "7.0" });
  p.input.value = "7.0";
  for (const f of [c, t10, t, p]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    c.input.value = "0.4"; t10.input.value = "300"; t.input.value = "5"; p.input.value = "7.0"; update();
  });

  const oA = makeOutputLine(outputRegion, "CT achieved (mg-min/L)", "ct-out-a");
  const oR = makeOutputLine(outputRegion, "CT required (3-log Giardia)", "ct-out-r");
  const oL = makeOutputLine(outputRegion, "Log inactivation (Giardia)", "ct-out-l");
  const oG = makeOutputLine(outputRegion, "Pass 3-log Giardia", "ct-out-g");
  const oV = makeOutputLine(outputRegion, "Pass 4-log virus", "ct-out-v");
  const oW = makeOutputLine(outputRegion, "Notes", "ct-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeDisinfectionCT({
      chlorine_mg_l: readNum(c.input),
      t10_minutes: readNum(t10.input),
      temperature_C: readNum(t.input),
      pH: readNum(p.input),
    });
    if (r.error) {
      oA.textContent = r.error; oR.textContent = ""; oL.textContent = ""; oG.textContent = ""; oV.textContent = ""; oW.textContent = "";
      return;
    }
    oA.textContent = fmt(r.CT_achieved, 1) + " mg-min/L";
    oR.textContent = fmt(r.CT_required_3log_Giardia, 1) + " mg-min/L";
    oL.textContent = fmt(r.log_inactivation, 2);
    oG.textContent = r.pass_3log_giardia ? "PASS" : "FAIL (raise residual, slow flow, or shift pH)";
    oV.textContent = r.pass_4log_virus ? "PASS" : "FAIL";
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "SWTR Guidance Manual table; state primacy agency table governs final compliance.";
  }, DEBOUNCE_MS);
  for (const f of [c.input, t10.input, t.input, p.input]) f.addEventListener("input", update);
}

WATER_RENDERERS["disinfection-ct"] = renderDisinfectionCT;
