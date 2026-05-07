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

export const WATER_RENDERERS = {
  "pounds-formula":   renderPounds,
  "filter-loading":   renderFilterLoading,
  "detention-time":   renderDetentionTime,
  "lab-dilution":     renderDilution,
  "pump-eff-w2w":     renderPumpEff,
  "srt-fm-ratio":     renderSRTFM,
};
