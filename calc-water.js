// Group M: Water and Wastewater Operations (utilities 210-215).
// See spec-v4.md section 2.4.

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

// dims: in { flow_mgd: L^3 T^-1, dose_mg_l: M L^-3, chemical: dimensionless }
//        out: { pure_lb_day: M T^-1, product_lb_day: M T^-1, purity_pct: dimensionless, chemical_label: dimensionless }
// (Flow in MGD is volume / time; dose in mg/L is mass / volume;
// pounds-per-day is mass / time; chemical is a categorical selector.)
export function computePoundsFormula({ flow_mgd = 0, dose_mg_l = 0, chemical = "chlorine_gas" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { filter_area_ft2: L^2, flow_gpm: L^3 T^-1, backwash_rate_gpm_ft2: L T^-1 }
//        out: { loading_gpm_per_ft2: L T^-1, backwash_gpm: L^3 T^-1, category: dimensionless }
// (Filter area is `L^2`; flow is volume / time = `L^3 T^-1`; loading
// rate (volume / area / time) reduces to `L T^-1`; backwash rate is
// also a per-area velocity; category is a categorical string.)
export function computeFilterLoading({ filter_area_ft2 = 0, flow_gpm = 0, backwash_rate_gpm_ft2 = 15 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(filter_area_ft2 > 0)) return { error: "Filter area must be positive." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive." };
  if (!(backwash_rate_gpm_ft2 > 0)) return { error: "Backwash rate must be positive." };
  const loading = flow_gpm / filter_area_ft2;
  const backwash_gpm = backwash_rate_gpm_ft2 * filter_area_ft2;
  let category = "outside typical bands";
  if (loading >= 2 && loading <= 5) category = "rapid sand (2-5 gpm/ft^2)";
  else if (loading > 5 && loading <= 8) category = "high-rate (5-8 gpm/ft^2)";
  else if (loading < 2) category = "below typical (low loading)";
  else category = "above high-rate (verify design)";
  return { loading_gpm_per_ft2: loading, backwash_gpm, category };
}

export const filterLoadingExample = { inputs: { filter_area_ft2: 200, flow_gpm: 800, backwash_rate_gpm_ft2: 15 } };

// filter-area-for-loading: inverse of filter-loading. The forward tile gives the loading rate from the area; the inverse
// sizes the filter area for a target loading rate at the design flow, area = flow_gpm / target_loading. It reports the
// backwash flow that area draws and names the loading band, so a designer picks the area that lands in the rapid-sand or
// high-rate range instead of reading the rate off a fixed area.
// dims: in { flow_gpm: L^3 T^-1, target_loading_gpm_ft2: L T^-1, backwash_rate_gpm_ft2: L T^-1 } out: { required_area_ft2: L^2, backwash_gpm: L^3 T^-1 }
export function computeFilterAreaForLoading({ flow_gpm = 0, target_loading_gpm_ft2 = 0, backwash_rate_gpm_ft2 = 15 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flow_gpm > 0)) return { error: "Flow must be positive." };
  if (!(target_loading_gpm_ft2 > 0)) return { error: "Target loading rate must be positive." };
  if (!(backwash_rate_gpm_ft2 > 0)) return { error: "Backwash rate must be positive." };
  const loading = target_loading_gpm_ft2;
  const required_area_ft2 = flow_gpm / loading;
  const backwash_gpm = backwash_rate_gpm_ft2 * required_area_ft2;
  let category = "outside typical bands";
  if (loading >= 2 && loading <= 5) category = "rapid sand (2-5 gpm/ft^2)";
  else if (loading > 5 && loading <= 8) category = "high-rate (5-8 gpm/ft^2)";
  else if (loading < 2) category = "below typical (low loading)";
  else category = "above high-rate (verify design)";
  return { required_area_ft2, backwash_gpm, category };
}

export const filterAreaForLoadingExample = { inputs: { flow_gpm: 800, target_loading_gpm_ft2: 4, backwash_rate_gpm_ft2: 15 } };

// --- 212: Detention Time ---

// dims: in { tank_volume_gal: L^3, flow_gpm: L^3 T^-1, target_minutes: T }
//        out: { minutes: T, hours: T, days: T, pass_target: dimensionless }
// (Tank volume is `L^3`; flow is volume / time; the resulting
// detention time is just time. Pass flag is a boolean.)
export function computeDetentionTime({ tank_volume_gal = 0, flow_gpm = 0, target_minutes = 0, surface_area_ft2 = 0, weir_length_ft = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tank_volume_gal >= 0)) return { error: "Tank volume must be non-negative." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive." };
  const minutes = tank_volume_gal / flow_gpm;
  const hours = minutes / 60;
  const days = hours / 24;
  const pass_target = target_minutes > 0 ? minutes >= target_minutes : null;
  // v23 EN.16: surface overflow rate (gpd/ft^2) and weir overflow rate
  // (gpd/ft) companion loadings every Ten States Standards review checks.
  const flow_gpd = flow_gpm * 1440;
  const sa = Number(surface_area_ft2) || 0;
  const wl = Number(weir_length_ft) || 0;
  let surface_overflow_rate_gpd_ft2 = null, weir_overflow_rate_gpd_ft = null;
  if (sa > 0 && Number.isFinite(sa)) { const v = flow_gpd / sa; if (Number.isFinite(v)) surface_overflow_rate_gpd_ft2 = v; }
  if (wl > 0 && Number.isFinite(wl)) { const v = flow_gpd / wl; if (Number.isFinite(v)) weir_overflow_rate_gpd_ft = v; }
  return { minutes, hours, days, pass_target, surface_overflow_rate_gpd_ft2, weir_overflow_rate_gpd_ft };
}

export const detentionTimeExample = { inputs: { tank_volume_gal: 50000, flow_gpm: 350, target_minutes: 120 } };

// --- 212b: Detention Basin Volume (inverse of Detention Time) ---
//
// The forward tile gives minutes = volume / flow; sizing a chlorine-contact,
// flocculation, or sedimentation basin to a target time is the inverse:
// required volume = target_minutes x flow.
// dims: in { target_minutes: T, flow_gpm: L^3 T^-1 }
//        out: { tank_volume_gal: L^3, tank_volume_ft3: L^3, hours: T }
// (Time x volumetric flow = volume; the ft^3 form divides gallons by 7.48052.)
export function computeDetentionBasinVolume({ target_minutes = 0, flow_gpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = Number(target_minutes);
  const q = Number(flow_gpm);
  if (!(t > 0)) return { error: "Target detention time must be positive (min)." };
  if (!(q > 0)) return { error: "Flow must be positive (GPM)." };
  const tank_volume_gal = t * q;
  return { tank_volume_gal, tank_volume_ft3: tank_volume_gal / 7.48052, hours: t / 60 };
}

export const detentionBasinVolumeExample = { inputs: { target_minutes: 120, flow_gpm: 350 } };

// --- 213: Lab Dilution and Serial Dilution ---
//
// C1V1 = C2V2; serial: each step divides by the dilution factor.

// dims: in { c1: M L^-3, v1: L^3, c2: M L^-3, v2: L^3, mode: dimensionless, steps: dimensionless, dilution_factor: dimensionless }
//        out: { c1: M L^-3, v1: L^3, c2: M L^-3, v2: L^3, diluent: L^3, mode: dimensionless, series: dimensionless, final_concentration: M L^-3 }
// (C1V1 = C2V2 form: concentrations carry mass / volume, volumes
// carry `L^3`; serial mode and step count are categorical; series
// is a caller-typed array, conservatively dimensionless.)
export function computeDilution({ c1 = 0, v1 = 0, c2 = 0, v2 = 0, mode = "single", steps = 1, dilution_factor = 10 }) {
  if (mode === "single") {
    // DR-18: solve for the one field left blank. Reject negatives (which the
    // old `> 0` count silently skipped, leaving a stale field) and reject the
    // all-positive case (known === 4), which previously returned the raw
    // inputs as if solved.
    const vals = [c1, v1, c2, v2];
    // A non-finite input would pass through the solve branch into a non-finite
    // output field (C-1/C-3); reject it before counting/solving.
    if (vals.some((x) => !Number.isFinite(x))) return { error: "Inputs must be finite numbers." };
    if (vals.some((x) => x < 0)) return { error: "Concentrations and volumes cannot be negative." };
    const zeros = vals.filter((x) => x === 0).length;
    if (zeros === 0) return { error: "Leave exactly one of c1, v1, c2, v2 blank to solve for it." };
    if (zeros > 1) return { error: "Provide three of c1, v1, c2, v2." };
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

// dims: in { flow_gpm: L^3 T^-1, tdh_ft: L, motor_kW: M L^2 T^-3, motor_eff: dimensionless, drive_eff: dimensionless }
//        out: { whp: M L^2 T^-3, bhp: M L^2 T^-3, wire_to_water_pct: dimensionless, category: dimensionless }
// (Flow is `L^3 T^-1`; total dynamic head is a length; motor input
// kW and horsepower are power `M L^2 T^-3`; efficiencies are pure
// ratios; category is a categorical string.)
export function computePumpEfficiency({ flow_gpm = 0, tdh_ft = 0, motor_kW = 0, motor_eff = 0.92, drive_eff = 1.0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { aeration_volume_gal: L^3, mlss_mg_l: M L^-3, mlvss_mg_l: M L^-3, was_flow_mgd: L^3 T^-1, was_tss_mg_l: M L^-3, bod_load_lb_day: M T^-1, effluent_tss_mg_l: M L^-3, effluent_flow_mgd: L^3 T^-1 }
//        out: { mlss_lb: M, mlvss_lb: M, srt_days: T, fm_ratio: T^-1, cas_flag: dimensionless }
// (Tank volume is `L^3`; suspended-solids concentrations are mass /
// volume; flows are volume / time; BOD load is mass / time; SRT is
// time; F/M ratio is (mass / time) / mass = `T^-1`.)
export function computeSRTandFM({
  aeration_volume_gal = 0, mlss_mg_l = 0, mlvss_mg_l = 0,
  was_flow_mgd = 0, was_tss_mg_l = 0,
  bod_load_lb_day = 0, effluent_tss_mg_l = 0, effluent_flow_mgd = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  // DR-17 (RC-2): zero outflow (no wasting, no effluent solids) makes SRT
  // unbounded. Represent it as null with a flag, never Infinity in a numeric
  // field -- the contract is "all numeric fields finite or null."
  const srt_days = total_out > 0 ? mlss_lb / total_out : null;
  const srt_note = total_out > 0 ? null : "No waste or effluent solids leaving the system; solids retention time is unbounded.";
  // F/M = BOD load / (MLVSS * tank volume in MG); equivalent to BOD lb/day / MLVSS lb in tank.
  const fm_ratio = mlvss_lb > 0 ? bod_load_lb_day / mlvss_lb : null;
  let cas_flag = "outside typical CAS";
  if (srt_days !== null && srt_days >= 4 && srt_days <= 15 && fm_ratio !== null && fm_ratio >= 0.2 && fm_ratio <= 0.5) {
    cas_flag = "within conventional activated-sludge range (SRT 4-15 d, F/M 0.2-0.5)";
  }
  return { mlss_lb, mlvss_lb, srt_days, srt_note, fm_ratio, cas_flag };
}

export const srtFMExample = { inputs: { aeration_volume_gal: 1500000, mlss_mg_l: 2500, mlvss_mg_l: 1900, was_flow_mgd: 0.05, was_tss_mg_l: 7500, bod_load_lb_day: 6000, effluent_tss_mg_l: 12, effluent_flow_mgd: 5.0 } };

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

const renderFilterAreaForLoading = _r({
  citation: "Citation: AWWA general practice by name only. Filter area = flow / target loading rate. Backwash flow = backwash rate * area.",
  example: filterAreaForLoadingExample.inputs,
  fields: [
    { key: "flow_gpm",               label: "Design flow (GPM)", kind: "number" },
    { key: "target_loading_gpm_ft2", label: "Target loading rate (gpm/ft^2)", kind: "number" },
    { key: "backwash_rate_gpm_ft2",  label: "Backwash rate (gpm/ft^2)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "a", id: "fal-out-a", label: "Required filter area", value: (r) => fmt(r.required_area_ft2, 1) + " ft^2" },
    { key: "b", id: "fal-out-b", label: "Backwash flow",        value: (r) => fmt(r.backwash_gpm, 0) + " GPM" },
    { key: "c", id: "fal-out-c", label: "Loading band",         value: (r) => r.category },
  ],
  compute: computeFilterAreaForLoading,
});

const renderDetentionTime = _r({
  citation: "Citation: Detention time = volume / flow. Used for chlorine contact, flocculation, sedimentation.",
  example: detentionTimeExample.inputs,
  fields: [
    { key: "tank_volume_gal", label: "Tank volume (gal)", kind: "number" },
    { key: "flow_gpm",        label: "Flow (GPM)", kind: "number" },
    { key: "target_minutes",  label: "Target (min, optional)", kind: "number" },
    { key: "surface_area_ft2", label: "Surface area (ft^2, optional)", kind: "number" },
    { key: "weir_length_ft",  label: "Weir length (ft, optional)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "dt-out-m", label: "Detention time", value: (r) => fmt(r.minutes, 1) + " min / " + fmt(r.hours, 2) + " hr / " + fmt(r.days, 3) + " d" },
    { key: "p", id: "dt-out-p", label: "Pass target",    value: (r) => r.pass_target === null ? "(no target set)" : (r.pass_target ? "PASS" : "FAIL") },
    { key: "sor", id: "dt-out-sor", label: "Surface overflow rate", value: (r) => r.surface_overflow_rate_gpd_ft2 == null ? "(enter surface area)" : fmt(r.surface_overflow_rate_gpd_ft2, 0) + " gpd/ft^2" },
    { key: "wor", id: "dt-out-wor", label: "Weir overflow rate", value: (r) => r.weir_overflow_rate_gpd_ft == null ? "(enter weir length)" : fmt(r.weir_overflow_rate_gpd_ft, 0) + " gpd/ft" },
  ],
  compute: computeDetentionTime,
});

const renderDetentionBasinVolume = _r({
  citation: "Citation: Required basin volume = target detention time x flow (the inverse of detention time = volume / flow). Sizes chlorine-contact, flocculation, and sedimentation basins to a target time (Ten States Standards).",
  example: detentionBasinVolumeExample.inputs,
  fields: [
    { key: "target_minutes", label: "Target detention time (min)", kind: "number" },
    { key: "flow_gpm",       label: "Flow (GPM)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "dbv-out-v", label: "Required volume", value: (r) => fmt(r.tank_volume_gal, 0) + " gal (" + fmt(r.tank_volume_ft3, 1) + " ft^3)" },
    { key: "h", id: "dbv-out-h", label: "Target time",     value: (r) => fmt(r.hours, 2) + " hr" },
  ],
  compute: computeDetentionBasinVolume,
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
    { key: "was_flow_mgd",        label: "WAS flow (MGD)", kind: "number" },
    { key: "was_tss_mg_l",        label: "WAS TSS (mg/L)", kind: "number" },
    { key: "bod_load_lb_day",     label: "BOD load (lb/day)", kind: "number" },
    { key: "effluent_tss_mg_l",   label: "Effluent TSS (mg/L)", kind: "number" },
    { key: "effluent_flow_mgd",   label: "Effluent flow (MGD)", kind: "number" },
  ],
  outputs: [
    { key: "ml", id: "sf-out-ml", label: "MLSS in tank",    value: (r) => fmt(r.mlss_lb, 1) + " lb" },
    { key: "mv", id: "sf-out-mv", label: "MLVSS in tank",   value: (r) => fmt(r.mlvss_lb, 1) + " lb" },
    { key: "s",  id: "sf-out-s",  label: "SRT",             value: (r) => Number.isFinite(r.srt_days) ? fmt(r.srt_days, 2) + " d" : "n/a (no waste/effluent solids)" },
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

// dims: in { flow_mgd: L^3 T^-1, jar_test_dose_mg_l: M L^-3, product: dimensionless }
//        out: { pure_lb_day: M T^-1, product_lb_day: M T^-1, product_gal_day: L^3 T^-1, product_label: dimensionless, product_strength_pct: dimensionless, product_density_lb_per_gal: M L^-3 }
// (Pounds-formula equivalent for coagulants. Flow is volume / time;
// dose is mass / volume; product density is mass / volume; product
// is a categorical selector per spec-v14 §7.1.)
export function computeCoagulantDose({
  flow_mgd = 0,
  jar_test_dose_mg_l = 0,
  product = "alum_liquid",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { sv30_ml_per_l: dimensionless, mlss_mg_per_l: M L^-3 }
//        out: { svi_ml_per_g: L^3 M^-1, sv30_settled_fraction: dimensionless, band: dimensionless, sv30_ml_per_l: dimensionless, mlss_mg_per_l: M L^-3, warnings: dimensionless }
// (SV30 in mL/L is a volume-per-volume settled-fraction and therefore
// dimensionless; MLSS in mg/L is mass / volume; SVI in mL/g is
// volume / mass = `L^3 M^-1`; band and warnings are categorical /
// caller-typed and dimensionless.)
export function computeSVI({
  sv30_ml_per_l = 0,
  mlss_mg_per_l = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  "filter-area-for-loading": renderFilterAreaForLoading,
  "detention-time":   renderDetentionTime,
  "detention-basin-volume": renderDetentionBasinVolume,
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
  // USEPA SWTR Guidance Manual (EPA 815-R-99-014) Table A-1: 3-log Giardia
  // inactivation by free chlorine, residual <= 0.4 mg/L, at pH 6.0/7.0/8.0/9.0.
  table: [
    [137, 195, 277, 390], // 0.5 C
    [ 97, 139, 198, 279], //   5 C
    [ 73, 104, 149, 209], //  10 C
    [ 49,  70,  99, 140], //  15 C
    [ 36,  52,  74, 105], //  20 C
    [ 24,  35,  50,  70], //  25 C
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

// dims: in { chlorine_mg_l: M L^-3, t10_minutes: T, temperature_C: T, pH: dimensionless }
//        out: { CT_achieved: M L^-3 T, CT_required_3log_Giardia: M L^-3 T, log_inactivation: dimensionless, pass_3log_giardia: dimensionless, pass_4log_virus: dimensionless, warnings: dimensionless }
// (Chlorine residual is mass / volume; contact time and temperature
// both surface as `T` per the spec-v14 §7.1 T-shortcut; CT product
// surfaces as (mass / volume) * time; pH is a logarithmic ratio
// and therefore dimensionless.)
export function computeDisinfectionCT({
  chlorine_mg_l = 0,
  t10_minutes = 0,
  temperature_C = 5,
  pH = 7.0,
  log_target = 3,
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
    // The CT *required* for the selected log credit is a table lookup that
    // does not depend on the achieved residual, so return the full v23
    // EN.15 shape (selected-log required CT + log_target) here too -- the
    // renderer reads these fields unconditionally, and omitting them leaked
    // "(undefined-log)" when the residual was cleared (2026-06-08).
    // required_t10_min stays null: below 0.2 mg/L the SWTR gives no credit,
    // so "raise the residual" is the correct guidance, not a contact time.
    let ltLow = Number(log_target); if (!Number.isFinite(ltLow) || ltLow <= 0) ltLow = 3;
    const CT_required_giardia_low = _bilinearInterp(SWTR_GIARDIA_3LOG_FREECL.table, SWTR_GIARDIA_3LOG_FREECL.temps_C, SWTR_GIARDIA_3LOG_FREECL.pH, T, p);
    return {
      CT_achieved: 0,
      CT_required_3log_Giardia: CT_required_giardia_low,
      CT_required_selected: CT_required_giardia_low * (ltLow / 3),
      log_target: ltLow,
      required_t10_min: null,
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

  // v23 EN.15: solve-for-required-t10 inverse + log-target selector. Giardia
  // CT scales linearly with the log credit (CT_Nlog = CT_3log * N/3); the
  // required contact time at the current residual is CT_required / C.
  let lt = Number(log_target); if (!Number.isFinite(lt) || lt <= 0) lt = 3;
  const CT_required_selected = CT_required_giardia * (lt / 3);
  let required_t10_min = null;
  if (C > 0 && Number.isFinite(CT_required_selected)) {
    const t = CT_required_selected / C;
    if (Number.isFinite(t)) required_t10_min = t;
  }

  return {
    CT_achieved,
    CT_required_3log_Giardia: CT_required_giardia,
    CT_required_selected,
    log_target: lt,
    required_t10_min,
    log_inactivation,
    pass_3log_giardia,
    pass_4log_virus,
    warnings,
  };
}

export const disinfectionCTExample = {
  // 3-log Giardia at 5 C / pH 7.0: CT_required = 139 mg-min/L (SWTR Table A-1).
  // Operator achieves C=1.0 mg/L * t10=150 min = 150 mg-min/L >= 139 -> passes
  // 3-log Giardia (log_inactivation = 150/139 * 3 = 3.24).
  inputs: { chlorine_mg_l: 1.0, t10_minutes: 150, temperature_C: 5, pH: 7.0 },
};

function renderDisinfectionCT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USEPA Surface Water Treatment Rule Guidance Manual EPA 815-R-99-014 Table A-1 (free chlorine 3-log Giardia inactivation, ≤0.4 mg/L band, 6 temperature x 4 pH grid). 4-log virus pass inferred from the Giardia result (free-chlorine 3-log Giardia is more stringent than 4-log virus; no separate Table E-1 lookup). State primacy agency governs CT compliance; this tile is a planning check, not a compliance report. Free at epa.gov/dwreginfo/surface-water-treatment-rules.";

  const c = makeNumber("Free chlorine residual (mg/L)", "ct-c", { step: "any", min: "0" });
  const t10 = makeNumber("Contact time t10 (min; basin 10-percentile)", "ct-t10", { step: "any", min: "0" });
  const t = makeNumber("Water temperature (C; 0.5 - 25)", "ct-t", { step: "any", value: "5" });
  t.input.value = "5";
  const p = makeNumber("pH (6.0 - 9.0)", "ct-p", { step: "any", value: "7.0" });
  p.input.value = "7.0";
  // v23 EN.15: log-target selector for the required-CT / required-t10 inverse.
  const lt = makeSelect("Log target (Giardia)", "ct-lt", [{ value: "2", label: "2-log" }, { value: "3", label: "3-log", selected: true }, { value: "4", label: "4-log" }]);
  for (const f of [c, t10, t, p, lt]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    c.input.value = "0.4"; t10.input.value = "300"; t.input.value = "5"; p.input.value = "7.0"; lt.select.value = "3"; update();
  });

  const oA = makeOutputLine(outputRegion, "CT achieved (mg-min/L)", "ct-out-a");
  const oR = makeOutputLine(outputRegion, "CT required (selected log)", "ct-out-r");
  const oReq = makeOutputLine(outputRegion, "Required t10 at this residual", "ct-out-req");
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
      log_target: Number(lt.select.value) || 3,
    });
    if (r.error) {
      oA.textContent = r.error; oR.textContent = ""; oReq.textContent = ""; oL.textContent = ""; oG.textContent = ""; oV.textContent = ""; oW.textContent = "";
      return;
    }
    oA.textContent = fmt(r.CT_achieved, 1) + " mg-min/L";
    oR.textContent = fmt(r.CT_required_selected, 1) + " mg-min/L (" + r.log_target + "-log)";
    oReq.textContent = r.required_t10_min == null ? "(raise residual above 0.2 mg/L)" : fmt(r.required_t10_min, 1) + " min";
    oL.textContent = fmt(r.log_inactivation, 2);
    oG.textContent = r.pass_3log_giardia ? "PASS" : "FAIL (raise residual, slow flow, or shift pH)";
    oV.textContent = r.pass_4log_virus ? "PASS" : "FAIL";
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "SWTR Guidance Manual table; state primacy agency table governs final compliance.";
  }, DEBOUNCE_MS);
  for (const f of [c.input, t10.input, t.input, p.input]) f.addEventListener("input", update);
  lt.select.addEventListener("change", update);
}

WATER_RENDERERS["disinfection-ct"] = renderDisinfectionCT;

// =====================================================================
// spec-v16 Group M (Water / Wastewater) expansion. The first-principles
// small-system-operator batch lands here per spec-v16 §5 (the spec
// labels the group "N," but the live catalog uses Group M for
// water/wastewater operators -- see the spec-v16 status header): N.1
// pool turnover rate and chlorine demand, N.3 well drawdown and specific
// capacity, N.4 cooling water makeup from cycles of concentration, and
// N.5 chlorine residual decay. All four are first-principles arithmetic
// with no new bundled dataset. Render functions are module-local; only
// the pure compute functions enter the v14 corpus.
// =====================================================================

const _v16w_readNum = (input) => {
  if (!input || input.value === "") return null;
  const n = Number(input.value);
  return Number.isFinite(n) ? n : null;
};

// --- N.1 Pool turnover rate and chlorine demand ----------------------

// Available-chlorine fraction by product (NSPF Certified Pool Operator
// Handbook). The chlorine demand is the product weight to deliver the
// target free-chlorine ppm to the whole pool volume.
export const POOL_CHLORINE_TYPES = {
  cal_hypo: { frac: 0.65, label: "Calcium hypochlorite (65%)" },
  trichlor: { frac: 0.90, label: "Trichlor (90%)" },
  liquid_bleach: { frac: 0.125, label: "Liquid bleach / sodium hypochlorite (12.5%)" },
};

// dims: in { pool_volume_gal: L^3, turnover_hr: T, chlorine_ppm: dimensionless, chlorine_type: dimensionless }
//        out: { turnover_gpm: L^3 T^-1, chlorine_product_lb: M, dose_pure_lb: M }
// (Pool volume `L^3` divided by turnover time `T` gives required flow
// `L^3 T^-1`; the chlorine dose is a product mass `M`. ppm and the
// product selector are dimensionless.)
export function computePoolTurnover({
  pool_volume_gal = 0,
  turnover_hr = 6,
  chlorine_ppm = 2,
  chlorine_type = "cal_hypo",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(pool_volume_gal) || 0;
  const hr = Number(turnover_hr) || 0;
  const ppm = Number(chlorine_ppm);
  const type = POOL_CHLORINE_TYPES[chlorine_type] ?? POOL_CHLORINE_TYPES.cal_hypo;
  if (!(vol > 0)) return { error: "Enter a positive pool volume (gal)." };
  if (!(hr > 0)) return { error: "Enter a positive turnover time (hr)." };
  if (!Number.isFinite(ppm) || ppm < 0) return { error: "Free-chlorine target must be non-negative (ppm)." };
  if (ppm > 10) return { error: "Free-chlorine target above 10 ppm is a pool-closure threshold; this tile does not size to it." };

  const turnover_gpm = vol / (hr * 60);
  // lbs of available (pure) chlorine to dose the volume by ppm:
  // lb = gal * ppm * 8.34 / 1,000,000.
  const dose_pure_lb = (vol * ppm * 8.34) / 1e6;
  const chlorine_product_lb = type.frac > 0 ? dose_pure_lb / type.frac : dose_pure_lb;

  const warnings = [];
  if (hr > 24) warnings.push("Turnover above 24 hr is outside the typical 6-8 hr range; confirm the design.");
  if (ppm > 5) warnings.push("Free-chlorine target above 5 ppm exceeds the usual 1-3 ppm operating band; confirm against the AHJ maximum.");

  return {
    turnover_gpm,
    dose_pure_lb,
    chlorine_product_lb,
    chlorine_label: type.label,
    chlorine_pct: type.frac * 100,
    warnings,
  };
}

export const poolTurnoverExample = {
  // 20,000 gal pool, 6 hr turnover, 2 ppm free chlorine, cal-hypo (65%):
  // GPM = 20000/(6*60) = 55.56; pure lb = 20000*2*8.34/1e6 = 0.3336;
  // cal-hypo product = 0.3336 / 0.65 = 0.513 lb.
  inputs: { pool_volume_gal: 20000, turnover_hr: 6, chlorine_ppm: 2, chlorine_type: "cal_hypo" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16w_renderPoolTurnover(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: required flow = pool volume / (turnover hours x 60); chlorine product = volume x ppm x 8.34 / 1,000,000 / available-chlorine fraction. Per the NSPF Certified Pool Operator Handbook (2022) and ANSI/APSP/ICC 11. NSPF governs operator certification; AHJ governs adopted code. Free at phta.org for the APSP-11 TOC.";
  const vol = makeNumber("Pool volume (gal)", "pt-vol", { step: "any", min: "0", value: "20000" });
  const hr = makeNumber("Turnover target (hr)", "pt-hr", { step: "any", min: "0", value: "6" });
  const ppm = makeNumber("Free-chlorine target (ppm)", "pt-ppm", { step: "any", min: "0", value: "2" });
  const type = makeSelect("Chlorine product", "pt-type", [
    { value: "cal_hypo", label: "Cal-hypo (65%)", selected: true },
    { value: "trichlor", label: "Trichlor (90%)" },
    { value: "liquid_bleach", label: "Liquid bleach (12.5%)" },
  ]);
  for (const f of [vol, hr, ppm, type]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    vol.input.value = "20000"; hr.input.value = "6"; ppm.input.value = "2"; type.select.value = "cal_hypo"; update();
  });

  const oGpm = makeOutputLine(outputRegion, "Required pump flow", "pt-out-gpm");
  const oCl = makeOutputLine(outputRegion, "Chlorine product to dose", "pt-out-cl");
  const oNote = makeOutputLine(outputRegion, "Notes", "pt-out-note");

  const update = debounce(() => {
    const r = computePoolTurnover({
      pool_volume_gal: _v16w_readNum(vol.input),
      turnover_hr: _v16w_readNum(hr.input),
      chlorine_ppm: _v16w_readNum(ppm.input),
      chlorine_type: type.select.value,
    });
    if (r.error) { oGpm.textContent = r.error; oCl.textContent = "-"; oNote.textContent = ""; return; }
    oGpm.textContent = fmt(r.turnover_gpm, 1) + " GPM";
    oCl.textContent = fmt(r.chlorine_product_lb, 3) + " lb " + r.chlorine_label + " (" + fmt(r.dose_pure_lb, 3) + " lb available Cl)";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Within the typical pool operating band.";
  }, DEBOUNCE_MS);
  for (const el of [vol.input, hr.input, ppm.input]) el.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
WATER_RENDERERS["pool-turnover"] = _v16w_renderPoolTurnover;

// --- N.3 Well drawdown and specific capacity -------------------------

// dims: in { static_level_ft: L, pumping_level_ft: L, discharge_gpm: L^3 T^-1, pump_offset_ft: L }
//        out: { drawdown_ft: L, specific_capacity_gpm_ft: L^2 T^-1, pump_setting_ft: L }
// (Levels and the offset are lengths `L`; discharge is `L^3 T^-1`;
// specific capacity is flow per foot of drawdown = `L^2 T^-1`.)
export function computeWellDrawdown({
  static_level_ft = 0,
  pumping_level_ft = 0,
  discharge_gpm = 0,
  pump_offset_ft = 20,
  delta_s_per_log_ft = 0,
  recovery_level_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const stat = Number(static_level_ft);
  const pump = Number(pumping_level_ft);
  const q = Number(discharge_gpm) || 0;
  const offset = Number(pump_offset_ft);
  if (!Number.isFinite(stat) || !Number.isFinite(pump)) return { error: "Enter the static and pumping water levels (ft below ground)." };
  if (!(q > 0)) return { error: "Enter a positive discharge rate (GPM)." };
  if (!(pump > stat)) return { error: "Pumping level must be deeper than the static level (drawdown is positive)." };

  const drawdown_ft = pump - stat;
  const specific_capacity_gpm_ft = q / drawdown_ft;
  const pump_setting_ft = pump + (Number.isFinite(offset) ? offset : 20);

  const warnings = [];
  if (specific_capacity_gpm_ft < 0.5) warnings.push("Specific capacity below 0.5 GPM/ft is a marginal well; consider a lower pump rate or rehabilitation.");

  // v23 EN.17: Cooper-Jacob transmissivity T ~ 264*Q / ds per log cycle, and
  // an optional residual drawdown from a recovery measurement. Both optional.
  const ds = Number(delta_s_per_log_ft) || 0;
  let transmissivity_gpd_ft = null;
  if (ds > 0 && Number.isFinite(ds)) { const t = (264 * q) / ds; if (Number.isFinite(t)) transmissivity_gpd_ft = t; }
  const rec = Number(recovery_level_ft) || 0;
  let residual_drawdown_ft = null;
  if (rec > 0 && Number.isFinite(rec)) { const v = rec - stat; if (Number.isFinite(v)) residual_drawdown_ft = v; }

  return {
    drawdown_ft,
    specific_capacity_gpm_ft,
    pump_setting_ft,
    transmissivity_gpd_ft,
    residual_drawdown_ft,
    warnings,
  };
}

export const wellDrawdownExample = {
  // Static 50 ft, pumping 80 ft, 30 GPM: drawdown 30 ft, specific
  // capacity 1.0 GPM/ft, pump setting 80 + 20 = 100 ft.
  inputs: { static_level_ft: 50, pumping_level_ft: 80, discharge_gpm: 30, pump_offset_ft: 20 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16w_renderWellDrawdown(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: drawdown = pumping level - static level; specific capacity = discharge / drawdown (GPM per ft); recommended pump setting = pumping level + offset (default 20 ft). Per the AWWA A100 (Water Wells) standard and USGS well-testing methods (Open-File Report 02-197). Free at awwa.org for the A100 TOC and pubs.usgs.gov.";
  const stat = makeNumber("Static water level (ft below ground)", "wd-stat", { step: "any", value: "50" });
  const pump = makeNumber("Pumping water level (ft below ground)", "wd-pump", { step: "any", value: "80" });
  const q = makeNumber("Discharge rate (GPM)", "wd-q", { step: "any", min: "0", value: "30" });
  const offset = makeNumber("Pump-setting offset below pumping level (ft)", "wd-offset", { step: "any", value: "20" });
  // v23 EN.17: Cooper-Jacob transmissivity (ds per log cycle) + recovery level.
  const ds = makeNumber("Drawdown per log cycle (ft, optional)", "wd-ds", { step: "any", min: "0" });
  const rec = makeNumber("Recovery water level (ft, optional)", "wd-rec", { step: "any" });
  for (const f of [stat, pump, q, offset, ds, rec]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    stat.input.value = "50"; pump.input.value = "80"; q.input.value = "30"; offset.input.value = "20"; ds.input.value = "5"; rec.input.value = "55"; update();
  });

  const oDraw = makeOutputLine(outputRegion, "Drawdown", "wd-out-draw");
  const oSc = makeOutputLine(outputRegion, "Specific capacity", "wd-out-sc");
  const oSet = makeOutputLine(outputRegion, "Recommended pump setting", "wd-out-set");
  const oT = makeOutputLine(outputRegion, "Transmissivity (Cooper-Jacob)", "wd-out-t");
  const oNote = makeOutputLine(outputRegion, "Notes", "wd-out-note");

  const update = debounce(() => {
    const r = computeWellDrawdown({
      static_level_ft: _v16w_readNum(stat.input),
      pumping_level_ft: _v16w_readNum(pump.input),
      discharge_gpm: _v16w_readNum(q.input),
      pump_offset_ft: _v16w_readNum(offset.input),
      delta_s_per_log_ft: _v16w_readNum(ds.input),
      recovery_level_ft: _v16w_readNum(rec.input),
    });
    if (r.error) { oDraw.textContent = r.error; oSc.textContent = "-"; oSet.textContent = "-"; oT.textContent = "-"; oNote.textContent = ""; return; }
    oDraw.textContent = fmt(r.drawdown_ft, 1) + " ft" + (r.residual_drawdown_ft == null ? "" : " (residual " + fmt(r.residual_drawdown_ft, 1) + " ft)");
    oSc.textContent = fmt(r.specific_capacity_gpm_ft, 2) + " GPM per ft of drawdown";
    oSet.textContent = fmt(r.pump_setting_ft, 0) + " ft below ground";
    oT.textContent = r.transmissivity_gpd_ft == null ? "(enter drawdown per log cycle)" : fmt(r.transmissivity_gpd_ft, 0) + " gpd/ft (T = 264 Q / ds)";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Specific capacity within the typical range; re-test periodically for trend.";
  }, DEBOUNCE_MS);
  for (const el of [stat.input, pump.input, q.input, offset.input, ds.input, rec.input]) el.addEventListener("input", update);
}
WATER_RENDERERS["well-drawdown"] = _v16w_renderWellDrawdown;

// dims: in { specific_capacity_gpm_ft: L^2 T^-1, allowable_drawdown_ft: L } out: { max_yield_gpm: L^3 T^-1 }
export function computeWellMaxYield({ specific_capacity_gpm_ft = 0, allowable_drawdown_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sc = Number(specific_capacity_gpm_ft) || 0;
  const s = Number(allowable_drawdown_ft) || 0;
  if (!(sc > 0)) return { error: "Specific capacity must be positive (GPM per ft)." };
  if (!(s > 0)) return { error: "Allowable drawdown must be positive (ft)." };
  // Inverse of specific_capacity = discharge / drawdown: max_yield = specific_capacity x allowable_drawdown.
  const max_yield_gpm = sc * s;
  if (!Number.isFinite(max_yield_gpm) || !(max_yield_gpm > 0)) return { error: "Yield math is not a finite positive value." };
  const marginal = sc < 0.5;
  return {
    max_yield_gpm, marginal,
    note: "The sustainable pumping rate a well can give up without pulling the water below the pump, the inverse of the well-drawdown tile: max_yield = specific_capacity x allowable_drawdown. The specific capacity (GPM per foot of drawdown) comes from a step-drawdown test or the well-drawdown tile; the allowable drawdown is the head you can spend, from the static level down to a safe level above the pump intake or the top of the screen (leave a margin so the pump never breaks suction). Specific capacity DECLINES at higher rates because of well losses, so this linear estimate holds near the tested rate and overstates the yield far above it - confirm with a constant-rate test. A specific capacity below 0.5 GPM/ft is a marginal well and is flagged. A planning estimate; a pumping test and the well driller govern."
  };
}
export const wellMaxYieldExample = { inputs: { specific_capacity_gpm_ft: 1.0, allowable_drawdown_ft: 30 } };

function _renderWellMaxYield(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: sustainable well yield from specific capacity: max_yield = specific_capacity x allowable_drawdown (GPM). Specific capacity (GPM per ft) from a step-drawdown test or the well-drawdown tile; the allowable drawdown is static level to a safe level above the pump intake. Per AWWA A100 and USGS well-testing methods; a constant-rate test governs. Free at awwa.org / pubs.usgs.gov.";
  const sc = makeNumber("Specific capacity (GPM per ft of drawdown)", "wmy-sc", { step: "any", min: "0", value: "1.0" });
  const s = makeNumber("Allowable drawdown (ft, static to safe level)", "wmy-s", { step: "any", min: "0", value: "30" });
  sc.input.value = "1.0"; s.input.value = "30";
  for (const f of [sc, s]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sc.input.value = "1.0"; s.input.value = "30"; update(); });
  const oY = makeOutputLine(outputRegion, "Max sustainable yield", "wmy-out-y");
  const oNote = makeOutputLine(outputRegion, "Note", "wmy-out-note");
  const update = debounce(() => {
    const r = computeWellMaxYield({ specific_capacity_gpm_ft: _v16w_readNum(sc.input), allowable_drawdown_ft: _v16w_readNum(s.input) });
    if (r.error) { oY.textContent = r.error; oNote.textContent = ""; return; }
    oY.textContent = fmt(r.max_yield_gpm, 1) + " GPM" + (r.marginal ? " (marginal well - specific capacity below 0.5 GPM/ft)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [sc.input, s.input]) el.addEventListener("input", update);
}
WATER_RENDERERS["well-max-yield"] = _renderWellMaxYield;

// --- N.4 Cooling water makeup from cycles of concentration -----------

// dims: in { recirculation_gpm: L^3 T^-1, delta_T_F: T, coc: dimensionless, drift_fraction: dimensionless }
//        out: { evaporation_gpm: L^3 T^-1, blowdown_gpm: L^3 T^-1, drift_gpm: L^3 T^-1, makeup_gpm: L^3 T^-1 }
// (Recirculation and every derived flow are `L^3 T^-1`; delta-T is a
// temperature `T`; cycles of concentration and drift fraction are
// dimensionless ratios.)
export function computeCoolingWaterMakeup({
  recirculation_gpm = 0,
  delta_T_F = 0,
  coc = 4,
  drift_fraction = 0.002,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const recirc = Number(recirculation_gpm) || 0;
  const dT = Number(delta_T_F);
  const cycles = Number(coc) || 0;
  const drift = Number(drift_fraction);
  if (!(recirc > 0)) return { error: "Enter a positive recirculation flow (GPM)." };
  if (!Number.isFinite(dT) || dT <= 0) return { error: "Enter a positive cooling-range delta-T (F)." };
  // Phrase the COC<=1 rejection without the literal word "undefined": the
  // §5.4 render-leak gate scans output text for the JS token `undefined`, so a
  // legitimate error message carrying that word would flake the gate red.
  if (!(cycles > 1)) return { error: "Cycles of concentration must be greater than 1 (blowdown is not defined at COC <= 1)." };
  if (!Number.isFinite(drift) || drift < 0) return { error: "Drift fraction must be non-negative." };

  // Industry rule of thumb: ~1% of recirculation evaporates per ~10 F of
  // range, i.e. evaporation = recirc * delta_T / 1000.
  const evaporation_gpm = (recirc * dT) / 1000;
  const blowdown_gpm = evaporation_gpm / (cycles - 1);
  const drift_gpm = recirc * drift;
  const makeup_gpm = evaporation_gpm + blowdown_gpm + drift_gpm;

  const warnings = [];
  if (cycles > 10) warnings.push("Cycles of concentration above 10 is a scaling risk; verify the makeup-water hardness and a scale-inhibitor program.");
  if (drift > 0.005) warnings.push("Drift above 0.5% suggests a deficient drift eliminator; modern eliminators hold ~0.002 (0.2%).");

  return {
    evaporation_gpm,
    blowdown_gpm,
    drift_gpm,
    makeup_gpm,
    coc: cycles,
    warnings,
  };
}

export const coolingWaterMakeupExample = {
  // 1,000 GPM recirculation, 10 F range, COC 4, drift 0.002:
  // evaporation 10, blowdown 10/3 = 3.33, drift 2, makeup 15.33 GPM.
  inputs: { recirculation_gpm: 1000, delta_T_F: 10, coc: 4, drift_fraction: 0.002 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16w_renderCoolingWaterMakeup(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: evaporation = recirculation x delta-T / 1000; blowdown = evaporation / (COC - 1); drift = recirculation x drift fraction; makeup = evaporation + blowdown + drift. Per the Cooling Technology Institute (CTI) publications and ASHRAE Systems and Equipment 2020 Ch. 40 (cooling towers). Free at cti.org and ashrae.org for the TOCs.";
  const recirc = makeNumber("Recirculation flow (GPM)", "cm-recirc", { step: "any", min: "0", value: "1000" });
  const dT = makeNumber("Cooling range delta-T (F)", "cm-dt", { step: "any", min: "0", value: "10" });
  const coc = makeNumber("Cycles of concentration", "cm-coc", { step: "any", min: "0", value: "4" });
  const drift = makeNumber("Drift fraction (e.g. 0.002)", "cm-drift", { step: "any", min: "0", value: "0.002" });
  for (const f of [recirc, dT, coc, drift]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    recirc.input.value = "1000"; dT.input.value = "10"; coc.input.value = "4"; drift.input.value = "0.002"; update();
  });

  const oFlows = makeOutputLine(outputRegion, "Evaporation / blowdown / drift", "cm-out-flows");
  const oMakeup = makeOutputLine(outputRegion, "Total makeup", "cm-out-makeup");
  const oNote = makeOutputLine(outputRegion, "Notes", "cm-out-note");

  const update = debounce(() => {
    const r = computeCoolingWaterMakeup({
      recirculation_gpm: _v16w_readNum(recirc.input),
      delta_T_F: _v16w_readNum(dT.input),
      coc: _v16w_readNum(coc.input),
      drift_fraction: _v16w_readNum(drift.input),
    });
    if (r.error) { oFlows.textContent = r.error; oMakeup.textContent = "-"; oNote.textContent = ""; return; }
    oFlows.textContent = fmt(r.evaporation_gpm, 2) + " / " + fmt(r.blowdown_gpm, 2) + " / " + fmt(r.drift_gpm, 2) + " GPM";
    oMakeup.textContent = fmt(r.makeup_gpm, 2) + " GPM";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Higher COC reduces makeup but raises scaling risk; balance against makeup-water hardness.";
  }, DEBOUNCE_MS);
  for (const el of [recirc.input, dT.input, coc.input, drift.input]) el.addEventListener("input", update);
}
WATER_RENDERERS["cooling-water-makeup"] = _v16w_renderCoolingWaterMakeup;

// --- N.5 Chlorine residual decay (first-order) -----------------------

// dims: in { initial_mg_l: M L^-3, decay_k_per_hr: T^-1, time_hr: T, target_mg_l: M L^-3, velocity_fps: L T^-1 }
//        out: { residual_mg_l: M L^-3, time_to_target_hr: T, booster_distance_ft: L }
// (Concentrations are `M L^-3`; the decay constant is per time `T^-1`;
// times are `T`; the optional pipe velocity is `L T^-1` and yields a
// distance `L`.)
export function computeChlorineDecay({
  initial_mg_l = 0,
  decay_k_per_hr = 0.1,
  time_hr = 0,
  target_mg_l = 0.2,
  velocity_fps = null,
} = {}) {
  const C0 = Number(initial_mg_l);
  const k = Number(decay_k_per_hr);
  const t = Number(time_hr);
  const target = Number(target_mg_l);
  if (!Number.isFinite(C0) || C0 <= 0) return { error: "Enter a positive initial free-chlorine residual (mg/L)." };
  if (!Number.isFinite(k) || k <= 0) return { error: "Enter a positive decay-rate constant (1/hr)." };
  if (!Number.isFinite(t) || t < 0) return { error: "Elapsed time must be non-negative (hr)." };
  if (!Number.isFinite(target) || target <= 0) return { error: "Target residual must be positive (mg/L)." };

  const residual_mg_l = C0 * Math.exp(-k * t);
  // Time from the source for the residual to fall to the target.
  const time_to_target_hr = target < C0 ? Math.log(C0 / target) / k : 0;

  let booster_distance_ft = null;
  if (velocity_fps != null && Number.isFinite(Number(velocity_fps)) && Number(velocity_fps) > 0 && time_to_target_hr > 0) {
    booster_distance_ft = Number(velocity_fps) * time_to_target_hr * 3600;
  }

  const warnings = [];
  if (k > 0.5) warnings.push("Decay rate above 0.5 1/hr is outside the typical range and suggests a gross TOC or nitrification issue.");
  if (target >= C0) warnings.push("Target residual is at or above the initial residual; the residual is already below target only after it decays, not within this distribution.");

  return {
    residual_mg_l,
    time_to_target_hr,
    booster_distance_ft,
    below_target: residual_mg_l < target,
    warnings,
  };
}

export const chlorineDecayExample = {
  // C0 = 2.0 mg/L, k = 0.1 1/hr, t = 10 hr: residual = 2*exp(-1) =
  // 0.7358 mg/L; time to 0.2 mg/L = ln(2/0.2)/0.1 = 23.03 hr.
  inputs: { initial_mg_l: 2.0, decay_k_per_hr: 0.1, time_hr: 10, target_mg_l: 0.2 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16w_renderChlorineDecay(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-order decay C(t) = C0 x exp(-k x t); time to target = ln(C0 / target) / k; booster distance = velocity x time-to-target (when a distribution velocity is entered). Per EPA 815-R-02-020 (Effects of Water Age on Distribution System Water Quality) and AWWA M14. EPA 40 CFR 141.74 governs the residual at the extremity. Free at epa.gov and awwa.org.";
  const c0 = makeNumber("Initial free chlorine (mg/L)", "cd-c0", { step: "any", min: "0", value: "2.0" });
  const k = makeNumber("Decay-rate constant k (1/hr)", "cd-k", { step: "any", min: "0", value: "0.1" });
  const t = makeNumber("Elapsed time (hr)", "cd-t", { step: "any", min: "0", value: "10" });
  const target = makeNumber("Target residual (mg/L)", "cd-target", { step: "any", min: "0", value: "0.2" });
  const vel = makeNumber("Distribution velocity (ft/s, optional)", "cd-vel", { step: "any", min: "0" });
  for (const f of [c0, k, t, target, vel]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    c0.input.value = "2.0"; k.input.value = "0.1"; t.input.value = "10"; target.input.value = "0.2"; vel.input.value = ""; update();
  });

  const oRes = makeOutputLine(outputRegion, "Residual at elapsed time", "cd-out-res");
  const oTtt = makeOutputLine(outputRegion, "Time to reach target", "cd-out-ttt");
  const oDist = makeOutputLine(outputRegion, "Booster distance from source", "cd-out-dist");
  const oNote = makeOutputLine(outputRegion, "Notes", "cd-out-note");

  const update = debounce(() => {
    const r = computeChlorineDecay({
      initial_mg_l: _v16w_readNum(c0.input),
      decay_k_per_hr: _v16w_readNum(k.input),
      time_hr: _v16w_readNum(t.input),
      target_mg_l: _v16w_readNum(target.input),
      velocity_fps: _v16w_readNum(vel.input),
    });
    if (r.error) { oRes.textContent = r.error; oTtt.textContent = "-"; oDist.textContent = "-"; oNote.textContent = ""; return; }
    oRes.textContent = fmt(r.residual_mg_l, 3) + " mg/L" + (r.below_target ? " (below target)" : "");
    oTtt.textContent = r.time_to_target_hr > 0 ? fmt(r.time_to_target_hr, 1) + " hr" : "already at or below target";
    oDist.textContent = r.booster_distance_ft != null ? fmt(r.booster_distance_ft, 0) + " ft (enter velocity to refine)" : "enter a distribution velocity";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "First-order model; field decay depends on temperature, TOC, and pipe material.";
  }, DEBOUNCE_MS);
  for (const el of [c0.input, k.input, t.input, target.input, vel.input]) el.addEventListener("input", update);
}
WATER_RENDERERS["chlorine-decay"] = _v16w_renderChlorineDecay;

// dims: in { initial_mg_l: dimensionless, residual_mg_l: dimensionless, time_hr: dimensionless } out: { decay_k_per_hr: dimensionless, half_life_hr: dimensionless }
// Inverse of the chlorine-decay tile: given an initial residual and a
// measured residual after an elapsed time (a distribution bottle test),
// back out the first-order decay constant. C = C0 * exp(-k*t), so
// k = ln(C0 / C) / t. Half-life = ln(2) / k.
export function computeChlorineDecayConstant({
  initial_mg_l = 0,
  residual_mg_l = 0,
  time_hr = 0,
} = {}) {
  const C0 = Number(initial_mg_l);
  const C = Number(residual_mg_l);
  const t = Number(time_hr);
  if (!Number.isFinite(C0) || C0 <= 0) return { error: "Enter a positive initial free-chlorine residual (mg/L)." };
  if (!Number.isFinite(C) || C <= 0) return { error: "Enter a positive measured residual (mg/L)." };
  if (!Number.isFinite(t) || t <= 0) return { error: "Elapsed time must be positive (hr)." };
  if (C >= C0) return { error: "Measured residual must be below the initial residual (chlorine decays over time)." };

  const decay_k_per_hr = Math.log(C0 / C) / t;
  const half_life_hr = Math.log(2) / decay_k_per_hr;

  const warnings = [];
  if (decay_k_per_hr > 0.5) warnings.push("Decay rate above 0.5 1/hr is outside the typical range and suggests a gross TOC or nitrification issue.");

  return {
    decay_k_per_hr,
    half_life_hr,
    warnings,
  };
}

export const chlorineDecayConstantExample = {
  // C0 = 2.0 mg/L decays to C = 0.7358 mg/L over t = 10 hr:
  // k = ln(2.0 / 0.7358) / 10 = ln(2.7182) / 10 = 1.0 / 10 = 0.100 1/hr.
  inputs: { initial_mg_l: 2.0, residual_mg_l: 0.7358, time_hr: 10 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16w_renderChlorineDecayConstant(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-order decay C(t) = C0 x exp(-k x t) solved for the rate constant, k = ln(C0 / C) / t, from an initial and a measured residual over an elapsed time (a distribution bottle test); half-life = ln(2) / k. Per EPA 815-R-02-020 (Effects of Water Age on Distribution System Water Quality) and AWWA M14. Free at epa.gov and awwa.org.";
  const c0 = makeNumber("Initial free chlorine (mg/L)", "cdc-c0", { step: "any", min: "0", value: "2.0" });
  const c = makeNumber("Measured residual after time (mg/L)", "cdc-c", { step: "any", min: "0", value: "0.7358" });
  const t = makeNumber("Elapsed time (hr)", "cdc-t", { step: "any", min: "0", value: "10" });
  for (const f of [c0, c, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    c0.input.value = "2.0"; c.input.value = "0.7358"; t.input.value = "10"; update();
  });

  const oK = makeOutputLine(outputRegion, "Decay-rate constant k", "cdc-out-k");
  const oHl = makeOutputLine(outputRegion, "Half-life", "cdc-out-hl");
  const oNote = makeOutputLine(outputRegion, "Notes", "cdc-out-note");

  const update = debounce(() => {
    const r = computeChlorineDecayConstant({
      initial_mg_l: _v16w_readNum(c0.input),
      residual_mg_l: _v16w_readNum(c.input),
      time_hr: _v16w_readNum(t.input),
    });
    if (r.error) { oK.textContent = r.error; oHl.textContent = "-"; oNote.textContent = ""; return; }
    oK.textContent = fmt(r.decay_k_per_hr, 3) + " 1/hr";
    oHl.textContent = fmt(r.half_life_hr, 1) + " hr";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "First-order model; field decay depends on temperature, TOC, and pipe material.";
  }, DEBOUNCE_MS);
  for (const el of [c0.input, c.input, t.input]) el.addEventListener("input", update);
}
WATER_RENDERERS["chlorine-decay-constant"] = _v16w_renderChlorineDecayConstant;

// =====================================================================
// v23 shared simple-renderer (select + number fields). Non-exported.
// =====================================================================
function _v23SimpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select" ? makeSelect(f.label, f.id || f.key, f.options) : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) { if (f.kind === "select") field.select.value = f.default; else field.input.value = String(f.default); }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key]; else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = f.kind === "select" ? fields[f.key].select.value : (Number(fields[f.key].input.value) || 0);
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) (f.kind === "select" ? fields[f.key].select : fields[f.key].input).addEventListener("input", update);
  };
}

// =====================================================================
// v23 M.1: Backflow assembly test pass criteria (USC FCCCHR / AWWA C511)
// =====================================================================
// dims: in { assembly_type: dimensionless, check1_psid: M L^-1 T^-2, relief_open_psid: M L^-1 T^-2, check2_psi: M L^-1 T^-2 } out: { pass: dimensionless, buffer_psid: M L^-1 T^-2 }
export function computeBackflowTestPSI({ assembly_type = "rp", check1_psid = 0, relief_open_psid = 0, check2_psi = 0 } = {}) {
  const c1 = Number(check1_psid) || 0;
  const relief = Number(relief_open_psid) || 0;
  const c2 = Number(check2_psi) || 0;
  if (!(Number.isFinite(c1) && c1 >= 0)) return { error: "Check #1 differential must be zero or positive (psid)." };
  if (!(Number.isFinite(relief) && relief >= 0)) return { error: "Relief opening point must be zero or positive (psid)." };
  if (!(Number.isFinite(c2) && c2 >= 0)) return { error: "Check #2 tightness must be zero or positive (psi)." };
  if (assembly_type === "dc") {
    const pass = c1 >= 1 && c2 >= 1;
    return { assembly_type: "dc", pass, buffer_psid: 0, criterion: "DC: each check >= 1 psid tight" };
  }
  // RP: #1 check >= 5 psid AND relief opens >= 2 psid below the #1 check.
  const buffer_psid = c1 - relief;
  const check1_ok = c1 >= 5;
  const relief_ok = buffer_psid >= 2;
  const pass = check1_ok && relief_ok;
  return { assembly_type: "rp", pass, buffer_psid, check1_ok, relief_ok, criterion: "RP: #1 check >= 5 psid and relief opens >= 2 psid below it" };
}
export const backflowTestPsiExample = { inputs: { assembly_type: "rp", check1_psid: 8, relief_open_psid: 4, check2_psi: 3 } };
const renderBackflowTestPSI = _v23SimpleRenderer({
  citation: "Citation: Per the USC FCCCHR Manual of Cross-Connection Control and the AWWA C511 field-test procedure. RP: relief opens >= 2 psid below the #1 check and the #1 check holds >= 5 psid; DC: each check holds >= 1 psid. The certified tester and the water purveyor govern; gauge accuracy and the opening-point definition apply.",
  example: backflowTestPsiExample.inputs,
  fields: [
    { key: "assembly_type", label: "Assembly type", kind: "select", options: [
      { value: "rp", label: "RP (reduced-pressure principle)" },
      { value: "dc", label: "DC (double check)" },
    ] },
    { key: "check1_psid", label: "Check #1 differential (psid)", kind: "number" },
    { key: "relief_open_psid", label: "RP relief opening point (psid)", kind: "number" },
    { key: "check2_psi", label: "Check #2 tightness (psi)", kind: "number" },
  ],
  outputs: [
    { key: "pass", id: "bft-out-p", label: "Verdict", value: (r) => r.pass ? "PASS" : "FAIL - below the field-test threshold" },
    { key: "crit", id: "bft-out-c", label: "Governing criterion", value: (r) => r.criterion + (r.assembly_type === "rp" ? " (buffer " + fmt(r.buffer_psid, 1) + " psid)" : "") },
  ],
  compute: computeBackflowTestPSI,
});
WATER_RENDERERS["backflow-test-psi"] = renderBackflowTestPSI;

// =====================================================================
// spec-v116: chlorine-demand + uv-dose (Group M) - disinfection.
// chlorine-demand returns the chlorine consumed (applied minus residual) and
// the dose to hold a target residual; uv-dose returns the delivered UV dose
// (intensity x time) against a validated target. Standard Methods 4500-Cl /
// AWWA M14 and the USEPA UV Disinfection Guidance; the state primacy agency
// sets the compliance residual / validated dose.
// =====================================================================

// dims: in { applied_mg_l: M L^-3, measured_residual_mg_l: M L^-3, target_residual_mg_l: M L^-3 } out: { demand_mg_l: M L^-3, dose_for_target_mg_l: M L^-3 }
export function computeChlorineDemand({ applied_mg_l = 0, measured_residual_mg_l = 0, target_residual_mg_l = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(applied_mg_l > 0)) return { error: "Applied chlorine must be positive (mg/L)." };
  if (measured_residual_mg_l < 0) return { error: "Measured residual must be non-negative (mg/L)." };
  if (target_residual_mg_l < 0) return { error: "Target residual must be non-negative (mg/L)." };
  const demand_mg_l = applied_mg_l - measured_residual_mg_l;
  const dose_for_target_mg_l = demand_mg_l + target_residual_mg_l;
  const high_demand = demand_mg_l > 4;
  return {
    demand_mg_l, dose_for_target_mg_l, high_demand,
    note: "Chlorine demand is the chlorine consumed by the water: applied minus the measured residual. To hold a target residual, dose = demand + target. A high or rising demand (here flagged above 4 mg/L) points to ammonia or organics - check the breakpoint curve (free vs combined chlorine) before chasing residual with more dose. The compliance residual, the contact time, and the method are set by the state primacy agency.",
  };
}
export const chlorineDemandExample = { inputs: { applied_mg_l: 3.0, measured_residual_mg_l: 0.8, target_residual_mg_l: 1.0 } };
const renderChlorineDemand = _v23SimpleRenderer({
  citation: "Citation: Standard Methods 4500-Cl / AWWA M14 (by name, not reproduced). Demand = applied - residual; dose for a target = demand + target. A high demand suggests ammonia / organics - check breakpoint. The state primacy agency sets the compliance residual and method.",
  example: chlorineDemandExample.inputs,
  fields: [
    { key: "applied_mg_l", label: "Applied chlorine (mg/L)", kind: "number", default: 3.0 },
    { key: "measured_residual_mg_l", label: "Measured residual (mg/L)", kind: "number", default: 0.8 },
    { key: "target_residual_mg_l", label: "Target residual (mg/L)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "d", id: "cld-out-d", label: "Chlorine demand", value: (r) => fmt(r.demand_mg_l, 2) + " mg/L" + (r.high_demand ? " (high - check ammonia / breakpoint)" : "") },
    { key: "t", id: "cld-out-t", label: "Dose for target", value: (r) => fmt(r.dose_for_target_mg_l, 2) + " mg/L" },
    { key: "n", id: "cld-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeChlorineDemand,
});
WATER_RENDERERS["chlorine-demand"] = renderChlorineDemand;

// dims: in { intensity_mw_cm2: M T^-3, exposure_time_s: T, target_dose_mj_cm2: M T^-2 } out: { dose_mj_cm2: M T^-2 }
export function computeUvDose({ intensity_mw_cm2 = 0, exposure_time_s = 0, target_dose_mj_cm2 = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(intensity_mw_cm2 > 0)) return { error: "UV intensity must be positive (mW/cm^2)." };
  if (!(exposure_time_s > 0)) return { error: "Exposure time must be positive (s)." };
  if (!(target_dose_mj_cm2 > 0)) return { error: "Target dose must be positive (mJ/cm^2)." };
  const dose_mj_cm2 = intensity_mw_cm2 * exposure_time_s;
  const meets = dose_mj_cm2 >= target_dose_mj_cm2;
  const margin = dose_mj_cm2 - target_dose_mj_cm2;
  return {
    dose_mj_cm2, meets, margin,
    verdict: meets ? "meets the target (margin " + fmt(margin, 1) + " mJ/cm^2)" : "SHORT by " + fmt(-margin, 1) + " mJ/cm^2 - check lamp age / UV transmittance",
    note: "UV dose = intensity x exposure time, with mW.s/cm^2 equal to mJ/cm^2. A common validated target is 40 mJ/cm^2 (editable to the validated reactor value). A short dose usually means an aged lamp, a fouled sleeve, or low UV transmittance (turbidity). The validated reactor dose and the state primacy agency govern compliance.",
  };
}
export const uvDoseExample = { inputs: { intensity_mw_cm2: 10, exposure_time_s: 5, target_dose_mj_cm2: 40 } };
const renderUvDose = _v23SimpleRenderer({
  citation: "Citation: USEPA UV Disinfection Guidance Manual (by name, not reproduced). Dose = intensity x time (mW.s/cm^2 = mJ/cm^2); common validated target 40 mJ/cm^2 (editable). The validated reactor dose and the state primacy agency govern.",
  example: uvDoseExample.inputs,
  fields: [
    { key: "intensity_mw_cm2", label: "UV intensity (mW/cm^2)", kind: "number", default: 10 },
    { key: "exposure_time_s", label: "Exposure time (s)", kind: "number", default: 5 },
    { key: "target_dose_mj_cm2", label: "Target dose (mJ/cm^2)", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "d", id: "uvd-out-d", label: "Delivered dose", value: (r) => fmt(r.dose_mj_cm2, 1) + " mJ/cm^2" },
    { key: "v", id: "uvd-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "uvd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUvDose,
});
WATER_RENDERERS["uv-dose"] = renderUvDose;

// dims: in { target_dose_mj_cm2: M T^-2, intensity_mw_cm2: M T^-3, exposure_time_s: T } out: { required_time_s: T, required_intensity_mw_cm2: M T^-3 }
export function computeUvRequiredExposure({ target_dose_mj_cm2 = 40, intensity_mw_cm2 = 0, exposure_time_s = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const target = Number(target_dose_mj_cm2) || 0;
  const I = Number(intensity_mw_cm2) || 0;
  const t = Number(exposure_time_s) || 0;
  if (!(target > 0)) return { error: "Target dose must be positive (mJ/cm^2)." };
  const haveI = I > 0, haveT = t > 0;
  if (haveI === haveT) return { error: "Enter exactly one of intensity or exposure time (leave the unknown blank)." };
  let required_time_s = null, required_intensity_mw_cm2 = null;
  if (haveI) required_time_s = target / I;
  else required_intensity_mw_cm2 = target / t;
  return {
    required_time_s, required_intensity_mw_cm2,
    note: "UV dose = intensity x exposure time (mW.s/cm^2 = mJ/cm^2), solved for the operand you are missing: leave intensity blank to get the required intensity = dose / time, or leave time blank to get the required contact time = dose / intensity. A common validated target is 40 mJ/cm^2 (editable to the validated reactor value). It answers how long a lamp of a known intensity must expose the flow, or how strong a lamp must be for a fixed contact time, to reach the target dose. A short delivered dose usually means an aged lamp, a fouled sleeve, or low UV transmittance (turbidity). The validated reactor dose and the state primacy agency govern compliance.",
  };
}
export const uvRequiredExposureExample = { inputs: { target_dose_mj_cm2: 40, intensity_mw_cm2: 10, exposure_time_s: 0 } };
const renderUvRequiredExposure = _v23SimpleRenderer({
  citation: "Citation: USEPA UV Disinfection Guidance Manual (by name, not reproduced). Dose = intensity x time (mW.s/cm^2 = mJ/cm^2) solved for the missing operand: required time = dose / intensity, or required intensity = dose / time; common validated target 40 mJ/cm^2 (editable). The validated reactor dose and the state primacy agency govern.",
  example: uvRequiredExposureExample.inputs,
  fields: [
    { key: "target_dose_mj_cm2", label: "Target dose (mJ/cm^2)", kind: "number", default: 40 },
    { key: "intensity_mw_cm2", label: "UV intensity (mW/cm^2, 0 = solve for it)", kind: "number", default: 10 },
    { key: "exposure_time_s", label: "Exposure time (s, 0 = solve for it)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "t", id: "uvr-out-t", label: "Required exposure time", value: (r) => r.required_time_s == null ? "(time was given)" : fmt(r.required_time_s, 2) + " s" },
    { key: "i", id: "uvr-out-i", label: "Required UV intensity", value: (r) => r.required_intensity_mw_cm2 == null ? "(intensity was given)" : fmt(r.required_intensity_mw_cm2, 2) + " mW/cm^2" },
    { key: "n", id: "uvr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUvRequiredExposure,
});
WATER_RENDERERS["uv-required-exposure"] = renderUvRequiredExposure;

// --- spec-v570 M: Population equivalent (organic load) ---
// PE_bod = MGD*BOD*8.34/0.17. PE_flow = MGD*1e6/100. PE_ss = MGD*SS*8.34/0.20. PE = max.
// dims: in { flow_mgd: L^3 T^-1, bod_mg_l: M L^-3, ss_mg_l: M L^-3 } out: { pe_bod: dimensionless, pe_flow: dimensionless, pe_governing: dimensionless }
export function computePopulationEquivalent({ flow_mgd = 0, bod_mg_l = 0, ss_mg_l = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mgd = Number(flow_mgd) || 0;
  const bod = Number(bod_mg_l) || 0;
  const ss = Number(ss_mg_l) || 0;
  if (!(mgd > 0)) return { error: "Flow must be positive (MGD)." };
  if (!(bod > 0)) return { error: "BOD must be positive (mg/L)." };
  if (ss < 0) return { error: "Suspended solids cannot be negative (mg/L)." };
  const bod_load_lb = mgd * bod * 8.34;
  const pe_bod = bod_load_lb / 0.17;
  const pe_flow = mgd * 1e6 / 100;
  const pe_ss = ss > 0 ? (mgd * ss * 8.34) / 0.20 : null;
  const pe_governing = Math.max(pe_bod, pe_flow, pe_ss || 0);
  const governed_by = pe_governing === pe_bod ? "BOD" : pe_governing === pe_flow ? "flow" : "suspended solids";
  return {
    bod_load_lb, pe_bod, pe_flow, pe_ss, pe_governing, governed_by,
    note: "The population equivalent is set by the governing parameter (BOD, flow, or suspended solids), whichever is largest, not by BOD alone - a high-strength, low-flow industrial discharge can equal thousands of residents in oxygen demand while its gallons say otherwise, so billing on flow alone under-bills the loader. The per-capita bases (0.17 lb BOD, 100 gpd, 0.20 lb SS per person per day) are editable conventions. The pretreatment ordinance and the authority govern.",
  };
}
export const populationEquivalentExample = { inputs: { flow_mgd: 0.5, bod_mg_l: 600, ss_mg_l: 400 } };
const renderPopulationEquivalent = _v23SimpleRenderer({
  citation: "Citation: population equivalent (organic load), standard sanitary engineering, by name. bod_load = MGD x BOD x 8.34; PE_bod = bod_load / 0.17; PE_flow = gpd / 100; PE_ss = ss_load / 0.20; governing PE = max of the three. The largest of BOD, flow, and SS governs, not BOD alone. The per-capita bases are editable conventions; the pretreatment ordinance and the authority govern.",
  example: populationEquivalentExample.inputs,
  fields: [
    { key: "flow_mgd", label: "Discharge flow (MGD)", kind: "number" },
    { key: "bod_mg_l", label: "BOD concentration (mg/L)", kind: "number" },
    { key: "ss_mg_l", label: "Suspended solids (mg/L, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "b", id: "pe-out-b", label: "PE from BOD", value: (r) => fmt(r.pe_bod, 0) + " people (" + fmt(r.bod_load_lb, 0) + " lb/day)" },
    { key: "f", id: "pe-out-f", label: "PE from flow / SS", value: (r) => fmt(r.pe_flow, 0) + " (flow) / " + (r.pe_ss == null ? "-" : fmt(r.pe_ss, 0) + " (SS)") + " people" },
    { key: "g", id: "pe-out-g", label: "Governing PE", value: (r) => fmt(r.pe_governing, 0) + " people (" + r.governed_by + " governs)" },
    { key: "n", id: "pe-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePopulationEquivalent,
});
WATER_RENDERERS["population-equivalent"] = renderPopulationEquivalent;

// --- spec-v571 M: Return activated sludge (RAS) flow rate ---
// Q_RAS = Q x MLSS / (RAS_SS - MLSS). ratio = Q_RAS / Q x 100.
// dims: in { plant_flow_mgd: L^3 T^-1, mlss_mg_l: M L^-3, ras_ss_mg_l: M L^-3 } out: { q_ras_mgd: L^3 T^-1, ras_ratio_pct: dimensionless }
export function computeRasFlowRate({ plant_flow_mgd = 0, mlss_mg_l = 0, ras_ss_mg_l = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(plant_flow_mgd) || 0;
  const mlss = Number(mlss_mg_l) || 0;
  const ras = Number(ras_ss_mg_l) || 0;
  if (!(q > 0)) return { error: "Plant flow must be positive (MGD)." };
  if (!(mlss > 0)) return { error: "Mixed-liquor solids must be positive (mg/L)." };
  if (!(ras > mlss)) return { error: "Return solids must exceed the mixed-liquor solids (the clarifier cannot thicken to at or below the basin concentration)." };
  const q_ras_mgd = q * mlss / (ras - mlss);
  const ras_ratio_pct = q_ras_mgd / q * 100;
  const thickening = ras / mlss;
  return {
    q_ras_mgd, ras_ratio_pct, thickening,
    note: "The clarifier only thickens sludge about three to four times, so the return solids concentration is capped - cranking the RAS pump to chase a higher MLSS floods the clarifier and washes solids over the weir. The mass balance, not the pump maximum, sets the rate; the return solids must exceed the mixed-liquor solids. The settleability (SVI) and clarifier performance govern.",
  };
}
export const rasFlowRateExample = { inputs: { plant_flow_mgd: 5, mlss_mg_l: 2500, ras_ss_mg_l: 8000 } };
const renderRasFlowRate = _v23SimpleRenderer({
  citation: "Citation: RAS flow from the solids mass balance (WEF / Sacramento activated-sludge manuals), by name. Q_RAS = Q x MLSS / (RAS_SS - MLSS); ratio = Q_RAS / Q x 100. The clarifier only thickens sludge 3-4x, so the return solids are capped - the mass balance, not the pump maximum, sets the rate. The settleability and clarifier performance govern.",
  example: rasFlowRateExample.inputs,
  fields: [
    { key: "plant_flow_mgd", label: "Plant influent flow Q (MGD)", kind: "number" },
    { key: "mlss_mg_l", label: "Mixed-liquor solids MLSS (mg/L, target)", kind: "number" },
    { key: "ras_ss_mg_l", label: "Return solids RAS_SS (mg/L, > MLSS)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "ras-out-q", label: "RAS flow rate", value: (r) => fmt(r.q_ras_mgd, 2) + " MGD" },
    { key: "r", id: "ras-out-r", label: "Return ratio", value: (r) => fmt(r.ras_ratio_pct, 0) + "% of plant flow (" + fmt(r.thickening, 1) + "x thickening)" },
    { key: "n", id: "ras-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRasFlowRate,
});
WATER_RENDERERS["ras-flow-rate"] = renderRasFlowRate;

// --- spec-v600 M: Settleability-based RAS rate from SVI ---
// Xr = 1e6/SVI. R = MLSS/(Xr-MLSS). Q_RAS = R*Q.
// dims: in { plant_flow_mgd: L^3 T^-1, mlss_mg_l: M L^-3, svi_ml_g: dimensionless } out: { achievable_ras_ss_mg_l: M L^-3, ras_ratio_pct: dimensionless, q_ras_mgd: L^3 T^-1 }
export function computeRasSviSettleability({ plant_flow_mgd = 0, mlss_mg_l = 0, svi_ml_g = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(plant_flow_mgd) || 0;
  const mlss = Number(mlss_mg_l) || 0;
  const svi = Number(svi_ml_g) || 0;
  if (!(q > 0)) return { error: "Plant flow must be positive (MGD)." };
  if (!(mlss > 0)) return { error: "Mixed-liquor solids must be positive (mg/L)." };
  if (!(svi > 0)) return { error: "Sludge volume index must be positive (mL/g)." };
  const achievable_ras_ss_mg_l = 1e6 / svi;
  if (!(achievable_ras_ss_mg_l > mlss)) return { error: "At this SVI the clarifier cannot thicken past the mixed-liquor solids - the settling is too poor to return sludge at this MLSS." };
  const ras_ratio = mlss / (achievable_ras_ss_mg_l - mlss);
  const ras_ratio_pct = ras_ratio * 100;
  const q_ras_mgd = ras_ratio * q;
  return {
    achievable_ras_ss_mg_l, ras_ratio_pct, q_ras_mgd,
    note: "The achievable return concentration Xr = 1,000,000 / SVI is the settleability ceiling, not a guaranteed value - clarifier depth, loading, and temperature move it. Poor settling (a high SVI) forces a higher return rate, and a bulking sludge can make a target MLSS unreachable within the pump capacity. This is the settleometer path to the same mass balance ras-flow-rate does from a measured RAS_SS. The settleability and clarifier performance govern - an operating aid, not a process design.",
  };
}
export const rasSviSettleabilityExample = { inputs: { plant_flow_mgd: 4, mlss_mg_l: 2500, svi_ml_g: 100 } };
const renderRasSviSettleability = _v23SimpleRenderer({
  citation: "Citation: settleability-based RAS from the sludge volume index (WEF / Sacramento activated-sludge manuals), by name. Xr = 1,000,000 / SVI; R = MLSS / (Xr - MLSS); Q_RAS = R x Q. The achievable return concentration is the settleability ceiling, not a guaranteed value; poor settling forces a higher return rate and a bulking sludge can make a target MLSS unreachable within the pump capacity. The settleability and clarifier performance govern.",
  example: rasSviSettleabilityExample.inputs,
  fields: [
    { key: "plant_flow_mgd", label: "Plant influent flow Q (MGD)", kind: "number" },
    { key: "mlss_mg_l", label: "Mixed-liquor solids MLSS (mg/L, target)", kind: "number" },
    { key: "svi_ml_g", label: "Sludge volume index SVI (mL/g, from the settleometer)", kind: "number" },
  ],
  outputs: [
    { key: "xr", id: "rsvi-out-xr", label: "Achievable return solids (settleability ceiling)", value: (r) => fmt(r.achievable_ras_ss_mg_l, 0) + " mg/L" },
    { key: "r", id: "rsvi-out-r", label: "Return ratio", value: (r) => fmt(r.ras_ratio_pct, 0) + "% of plant flow" },
    { key: "q", id: "rsvi-out-q", label: "RAS flow rate", value: (r) => fmt(r.q_ras_mgd, 2) + " MGD" },
    { key: "n", id: "rsvi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRasSviSettleability,
});
WATER_RENDERERS["ras-svi-settleability"] = renderRasSviSettleability;

// --- spec-v572 M: WAS rate to hold target SRT (sludge age) ---
// system_solids = V*MLSS*8.34. solids_to_waste = system_solids/SRT. Q_WAS = (stw - eff_solids)/(WAS*8.34).
// dims: in { aeration_volume_mg: L^3, mlss_mg_l: M L^-3, target_srt_days: T, was_conc_mg_l: M L^-3, effluent_flow_mgd: L^3 T^-1, effluent_tss_mg_l: M L^-3 } out: { q_was_mgd: L^3 T^-1, q_was_gpm: L^3 T^-1 }
export function computeWasSrtControl({ aeration_volume_mg = 0, mlss_mg_l = 0, target_srt_days = 0, was_conc_mg_l = 0, effluent_flow_mgd = 0, effluent_tss_mg_l = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(aeration_volume_mg) || 0;
  const mlss = Number(mlss_mg_l) || 0;
  const srt = Number(target_srt_days) || 0;
  const wc = Number(was_conc_mg_l) || 0;
  const qeff = Number(effluent_flow_mgd) || 0;
  const teff = Number(effluent_tss_mg_l) || 0;
  if (!(V > 0)) return { error: "Aeration volume must be positive (MG)." };
  if (!(mlss > 0)) return { error: "Mixed-liquor solids must be positive (mg/L)." };
  if (!(srt > 0)) return { error: "Target SRT must be positive (days)." };
  if (!(wc > 0)) return { error: "WAS concentration must be positive (mg/L)." };
  if (qeff < 0 || teff < 0) return { error: "Effluent flow and TSS must be non-negative." };
  const system_solids_lb = V * mlss * 8.34;
  const solids_to_waste_lb = system_solids_lb / srt;
  const effluent_solids_lb = qeff * teff * 8.34;
  const was_solids_lb = solids_to_waste_lb - effluent_solids_lb;
  if (was_solids_lb <= 0) return { error: "The effluent solids already meet or exceed the target wasting - no WAS pumping is needed (or lengthen the SRT / check the effluent TSS)." };
  const q_was_mgd = was_solids_lb / (wc * 8.34);
  const q_was_gpm = q_was_mgd * 1e6 / 1440;
  return {
    system_solids_lb, solids_to_waste_lb, effluent_solids_lb, q_was_mgd, q_was_gpm,
    note: "This is the inverse of a sludge-age readout - it answers how much to waste today. SRT responds over roughly one SRT (days), so over-correcting on a single reading chases the process; make changes gradually. The effluent solids carried over the weir count as wasted and reduce the WAS pump rate. The process trend and the operator govern.",
  };
}
export const wasSrtControlExample = { inputs: { aeration_volume_mg: 2, mlss_mg_l: 3000, target_srt_days: 10, was_conc_mg_l: 8000, effluent_flow_mgd: 5, effluent_tss_mg_l: 15 } };
const renderWasSrtControl = _v23SimpleRenderer({
  citation: "Citation: WAS rate for a target SRT (MCRT/SRT control; WEF operator training), by name. system_solids = V x MLSS x 8.34; solids_to_waste = system_solids / SRT; effluent_solids = Qeff x TSSeff x 8.34; Q_WAS = (solids_to_waste - effluent_solids) / (WAS x 8.34); Q_WAS_gpm = Q_WAS x 1e6/1440. SRT responds over ~one SRT, so change gradually; effluent solids count as wasted. The process trend and the operator govern.",
  example: wasSrtControlExample.inputs,
  fields: [
    { key: "aeration_volume_mg", label: "Aeration volume (MG)", kind: "number" },
    { key: "mlss_mg_l", label: "Mixed-liquor solids MLSS (mg/L)", kind: "number" },
    { key: "target_srt_days", label: "Target SRT (days)", kind: "number" },
    { key: "was_conc_mg_l", label: "WAS concentration (mg/L)", kind: "number" },
    { key: "effluent_flow_mgd", label: "Effluent flow (MGD)", kind: "number", default: 0 },
    { key: "effluent_tss_mg_l", label: "Effluent TSS (mg/L)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "s", id: "was-out-s", label: "System solids / to waste", value: (r) => fmt(r.system_solids_lb, 0) + " lb / " + fmt(r.solids_to_waste_lb, 0) + " lb-day (" + fmt(r.effluent_solids_lb, 0) + " lb-day over the weir)" },
    { key: "q", id: "was-out-q", label: "WAS flow", value: (r) => fmt(r.q_was_mgd, 3) + " MGD (" + fmt(r.q_was_gpm, 0) + " gpm)" },
    { key: "n", id: "was-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWasSrtControl,
});
WATER_RENDERERS["was-srt-control"] = renderWasSrtControl;

// --- spec-v574 M: Activated-sludge oxygen and blower air demand ---
// O2 = factor*BOD_removed + 4.6*NH3. air_scfm = O2 / (0.075*0.232*(SOTE/100)*1440).
// dims: in { bod_removed_lb_day: M T^-1, oxygen_factor: dimensionless, nh3_nitrified_lb_day: M T^-1, sote_pct: dimensionless } out: { o2_demand_lb_day: M T^-1, air_scfm: L^3 T^-1 }
export function computeAerationOxygenDemand({ bod_removed_lb_day = 0, oxygen_factor = 0, nh3_nitrified_lb_day = 0, sote_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bod = Number(bod_removed_lb_day) || 0;
  const factor = Number(oxygen_factor) || 0;
  const nh3 = Number(nh3_nitrified_lb_day) || 0;
  const sote = Number(sote_pct) || 0;
  if (!(bod > 0)) return { error: "BOD removed must be positive (lb/day)." };
  if (!(factor > 0)) return { error: "Oxygen factor must be positive (lb O2 per lb BOD)." };
  if (nh3 < 0) return { error: "Ammonia nitrified cannot be negative (lb/day)." };
  if (!(sote > 0 && sote <= 100)) return { error: "SOTE must be over 0 and at most 100 (%)." };
  const o2_carbon_lb_day = factor * bod;
  const o2_nitro_lb_day = 4.6 * nh3;
  const o2_demand_lb_day = o2_carbon_lb_day + o2_nitro_lb_day;
  const air_scfm = o2_demand_lb_day / (0.075 * 0.232 * (sote / 100) * 1440);
  return {
    o2_carbon_lb_day, o2_nitro_lb_day, o2_demand_lb_day, air_scfm,
    note: "Nitrification adds 4.6 lb of oxygen per pound of ammonia-nitrogen oxidized - a large term that is easy to forget and that starves the process at high sludge age. The standard oxygen transfer efficiency (SOTE) of diffused aeration is only about 10-35%, so most of the blown air leaves the tank unused and the air demand in scfm far exceeds what the oxygen pounds suggest. The oxygen factor rises 0.9 (short SRT) to 1.5 (extended aeration). The aeration equipment and the field transfer efficiency govern.",
  };
}
export const aerationOxygenDemandExample = { inputs: { bod_removed_lb_day: 2000, oxygen_factor: 1.1, nh3_nitrified_lb_day: 200, sote_pct: 20 } };
const renderAerationOxygenDemand = _v23SimpleRenderer({
  citation: "Citation: activated-sludge oxygen and air demand (WEF aeration design), by name. O2_demand = factor x BOD_removed + 4.6 x NH3_nitrified; air_scfm = O2_demand / (0.075 x 0.232 x (SOTE/100) x 1440). Nitrification adds 4.6 lb O2 per lb ammonia-N (easy to forget). Diffused-aeration SOTE is only ~10-35%, so the air demand far exceeds the oxygen pounds. The aeration equipment and field transfer efficiency govern.",
  example: aerationOxygenDemandExample.inputs,
  fields: [
    { key: "bod_removed_lb_day", label: "BOD removed (lb/day)", kind: "number" },
    { key: "oxygen_factor", label: "Oxygen factor (lb O2 / lb BOD, 0.9-1.5)", kind: "number", default: 1.1 },
    { key: "nh3_nitrified_lb_day", label: "Ammonia-N nitrified (lb/day, 0 to skip)", kind: "number", default: 0 },
    { key: "sote_pct", label: "SOTE (%, ~10-35 diffused)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "o", id: "aod-out-o", label: "Oxygen demand (carbon + nitrogen)", value: (r) => fmt(r.o2_demand_lb_day, 0) + " lb/day (" + fmt(r.o2_carbon_lb_day, 0) + " carbon + " + fmt(r.o2_nitro_lb_day, 0) + " nitrification)" },
    { key: "a", id: "aod-out-a", label: "Blower air demand", value: (r) => fmt(r.air_scfm, 0) + " scfm" },
    { key: "n", id: "aod-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAerationOxygenDemand,
});
WATER_RENDERERS["aeration-oxygen-demand"] = renderAerationOxygenDemand;

// ===================== spec-v926: RO recovery, concentrate flow, and concentration factor =====================
// dims: in { feed_gpm: L^3 T^-1, permeate_gpm: L^3 T^-1, feed_tds_mgl: M L^-3 } out: { recovery_pct: dimensionless, concentrate_gpm: L^3 T^-1, concentration_factor: dimensionless, concentrate_tds_mgl: M L^-3 }
export function computeRoRecoveryConcentration({ feed_gpm = 10, permeate_gpm = 7.5, feed_tds_mgl = 500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(feed_gpm > 0)) return { error: "Feed flow must be positive (gpm)." };
  if (!(permeate_gpm > 0)) return { error: "Permeate flow must be positive (gpm)." };
  if (feed_tds_mgl < 0) return { error: "Feed TDS cannot be negative (mg/L)." };
  if (!(permeate_gpm < feed_gpm)) return { error: "Permeate flow must be less than the feed flow (recovery below 100%)." };
  const recovery = permeate_gpm / feed_gpm;
  const recovery_pct = recovery * 100;
  const concentrate_gpm = feed_gpm - permeate_gpm;
  const concentration_factor = 1 / (1 - recovery);
  const concentrate_tds_mgl = concentration_factor * feed_tds_mgl;
  if (![recovery_pct, concentrate_gpm, concentration_factor, concentrate_tds_mgl].every(Number.isFinite)) return { error: "RO recovery math is not a finite value." };
  return {
    recovery_pct,
    concentrate_gpm,
    concentration_factor,
    concentrate_tds_mgl,
    note: "Reverse-osmosis mass balance: recovery R = permeate / feed, concentrate (reject) flow = feed - permeate, and the concentration factor CF = 1 / (1 - R) is how much the rejected salts are concentrated in the reject stream. At 75% recovery CF = 4, so a 500 mg/L feed leaves about a 2,000 mg/L concentrate (assuming near-complete rejection). Pushing recovery higher shrinks the reject flow but raises CF sharply -- past the scaling limit of the least-soluble salt (calcium carbonate, sulfate, silica) the membrane fouls, which antiscalant dosing and the LSI govern. The membrane manufacturer's projection software and the state primacy agency (for a public system) govern the actual design.",
  };
}

export const roRecoveryConcentrationExample = { inputs: { feed_gpm: 10, permeate_gpm: 7.5, feed_tds_mgl: 500 } };

function _v926renderRoRecoveryConcentration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: RO mass balance by name (AMTA / AWWA membrane practice). recovery = permeate/feed; concentrate flow = feed - permeate; concentration factor CF = 1/(1-recovery); concentrate TDS ~ CF x feed TDS at high rejection. The membrane maker's projection and the state primacy agency govern.";
  const fd = makeNumber("Feed flow (gpm)", "ror-fd", { step: "any", min: "0", value: "10" });
  fd.input.value = "10";
  const pm = makeNumber("Permeate flow (gpm)", "ror-pm", { step: "any", min: "0", value: "7.5" });
  pm.input.value = "7.5";
  const td = makeNumber("Feed TDS (mg/L)", "ror-td", { step: "any", min: "0", value: "500" });
  td.input.value = "500";
  for (const f of [fd, pm, td]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fd.input.value = "10"; pm.input.value = "7.5"; td.input.value = "500"; update(); });
  const oR = makeOutputLine(outputRegion, "Recovery", "ror-out-r");
  const oC = makeOutputLine(outputRegion, "Concentrate (reject) flow", "ror-out-c");
  const oCF = makeOutputLine(outputRegion, "Concentration factor / reject TDS", "ror-out-cf");
  const update = debounce(() => {
    const r = computeRoRecoveryConcentration({
      feed_gpm: fd.input.value === "" ? 10 : Number(fd.input.value), permeate_gpm: pm.input.value === "" ? 7.5 : Number(pm.input.value),
      feed_tds_mgl: td.input.value === "" ? 500 : Number(td.input.value),
    });
    if (r.error) { oR.textContent = r.error; oC.textContent = "-"; oCF.textContent = "-"; return; }
    oR.textContent = fmt(r.recovery_pct, 1) + "%";
    oC.textContent = fmt(r.concentrate_gpm, 2) + " gpm";
    oCF.textContent = fmt(r.concentration_factor, 2) + "x -> " + fmt(r.concentrate_tds_mgl, 0) + " mg/L reject";
  }, DEBOUNCE_MS);
  for (const f of [fd, pm, td]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["ro-recovery-concentration"] = _v926renderRoRecoveryConcentration;

// ===================== spec-v927: chlorine dose to oxidize iron and manganese =====================
// dims: in { fe_mgl: M L^-3, mn_mgl: M L^-3, extra_demand_mgl: M L^-3, target_residual_mgl: M L^-3, flow_mgd: L^3 T^-1 } out: { dose_mgl: M L^-3, dose_lb_day: M T^-1 }
export function computeIronManganeseChlorineDose({ fe_mgl = 3.0, mn_mgl = 0.5, extra_demand_mgl = 0.5, target_residual_mgl = 0.3, flow_mgd = 0.05 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (fe_mgl < 0) return { error: "Iron cannot be negative (mg/L)." };
  if (mn_mgl < 0) return { error: "Manganese cannot be negative (mg/L)." };
  if (extra_demand_mgl < 0) return { error: "Extra demand cannot be negative (mg/L)." };
  if (target_residual_mgl < 0) return { error: "Target residual cannot be negative (mg/L)." };
  if (!(flow_mgd > 0)) return { error: "Flow must be positive (MGD)." };
  // Stoichiometry: 0.62 mg Cl2 per mg Fe(II), 1.30 mg Cl2 per mg Mn(II); plus the other demand and the target residual.
  const dose_mgl = 0.62 * fe_mgl + 1.30 * mn_mgl + extra_demand_mgl + target_residual_mgl;
  const dose_lb_day = dose_mgl * flow_mgd * 8.34;
  if (![dose_mgl, dose_lb_day].every(Number.isFinite)) return { error: "Chlorine-dose math is not a finite value." };
  return {
    dose_mgl,
    dose_lb_day,
    note: "Free-chlorine dose to oxidize dissolved iron and manganese ahead of a filter: 0.62 mg Cl2 per mg of ferrous iron, 1.30 mg Cl2 per mg of manganese, plus any other chlorine demand and the free-chlorine residual to carry. Dose (mg/L) x flow (MGD) x 8.34 = lb/day of chlorine. Fe(II) oxidizes in minutes, but Mn(II) is slow at low pH and often needs a pH near 8 or a catalytic (greensand / pyrolusite) filter to finish; permanganate or air are alternatives to chlorine. A dosing estimate; jar tests, the pH, the contact time, and the state primacy agency govern the actual feed. A wrong dose is a re-set, breakthrough, or a dirty filter, not a compliance sign-off.",
  };
}

export const ironManganeseChlorineDoseExample = { inputs: { fe_mgl: 3.0, mn_mgl: 0.5, extra_demand_mgl: 0.5, target_residual_mgl: 0.3, flow_mgd: 0.05 } };

function _v927renderIronManganeseChlorineDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: iron/manganese chlorine-oxidation stoichiometry by name (AWWA / Ten States). 0.62 mg Cl2 per mg Fe, 1.30 mg Cl2 per mg Mn, plus other demand and the target residual; lb/day = dose x flow(MGD) x 8.34. Jar tests, pH, and the state primacy agency govern.";
  const fe = makeNumber("Iron Fe (mg/L)", "imc-fe", { step: "any", min: "0", value: "3.0" });
  fe.input.value = "3.0";
  const mn = makeNumber("Manganese Mn (mg/L)", "imc-mn", { step: "any", min: "0", value: "0.5" });
  mn.input.value = "0.5";
  const dm = makeNumber("Other chlorine demand (mg/L)", "imc-dm", { step: "any", min: "0", value: "0.5" });
  dm.input.value = "0.5";
  const rs = makeNumber("Target free residual (mg/L)", "imc-rs", { step: "any", min: "0", value: "0.3" });
  rs.input.value = "0.3";
  const fl = makeNumber("Flow (MGD)", "imc-fl", { step: "any", min: "0", value: "0.05" });
  fl.input.value = "0.05";
  for (const f of [fe, mn, dm, rs, fl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fe.input.value = "3.0"; mn.input.value = "0.5"; dm.input.value = "0.5"; rs.input.value = "0.3"; fl.input.value = "0.05"; update(); });
  const oDose = makeOutputLine(outputRegion, "Chlorine dose", "imc-out-d");
  const oLb = makeOutputLine(outputRegion, "Chlorine feed", "imc-out-lb");
  const update = debounce(() => {
    const r = computeIronManganeseChlorineDose({
      fe_mgl: fe.input.value === "" ? 3.0 : Number(fe.input.value), mn_mgl: mn.input.value === "" ? 0.5 : Number(mn.input.value),
      extra_demand_mgl: dm.input.value === "" ? 0.5 : Number(dm.input.value), target_residual_mgl: rs.input.value === "" ? 0.3 : Number(rs.input.value),
      flow_mgd: fl.input.value === "" ? 0.05 : Number(fl.input.value),
    });
    if (r.error) { oDose.textContent = r.error; oLb.textContent = "-"; return; }
    oDose.textContent = fmt(r.dose_mgl, 2) + " mg/L";
    oLb.textContent = fmt(r.dose_lb_day, 2) + " lb/day";
  }, DEBOUNCE_MS);
  for (const f of [fe, mn, dm, rs, fl]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["iron-manganese-chlorine-dose"] = _v927renderIronManganeseChlorineDose;

// ===================== spec-v935: cistern / storage reserve days =====================
// dims: in { usable_storage_gal: L^3, daily_demand_gpd: L^3 T^-1, target_days: T } out: { reserve_days: T, required_gal_for_target: L^3 }
export function computeCisternStorageDays({ usable_storage_gal = 2500, daily_demand_gpd = 150, target_days = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(usable_storage_gal > 0)) return { error: "Usable storage must be positive (gal)." };
  if (!(daily_demand_gpd > 0)) return { error: "Daily demand must be positive (gpd)." };
  if (!(target_days > 0)) return { error: "Target days must be positive." };
  const reserve_days = usable_storage_gal / daily_demand_gpd;
  const required_gal_for_target = daily_demand_gpd * target_days;
  if (![reserve_days, required_gal_for_target].every(Number.isFinite)) return { error: "Storage-reserve math is not a finite value." };
  return {
    reserve_days,
    required_gal_for_target,
    note: "Cistern / storage reserve, a straight mass balance: days of reserve = usable storage / daily demand, and the tank needed to bank a target dry spell = daily demand x target days. A 2,500-gal usable tank at 150 gpd carries 16.7 days; banking a 30-day dry spell needs 4,500 gal. Use USABLE storage (above the pump intake and below overflow, and above any fire or first-flush reserve), and a realistic peak demand, not the annual average. For a rain-fed cistern the reserve must bridge the longest dry spell between refills, and for a hauled or well-fed tank it sets the refill interval. A planning estimate; local rainfall or the source yield, the storage detail, and the AHJ (for potable use) govern." ,
  };
}

export const cisternStorageDaysExample = { inputs: { usable_storage_gal: 2500, daily_demand_gpd: 150, target_days: 30 } };

function _v935renderCisternStorageDays(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: storage-reserve mass balance by name. reserve days = usable storage / daily demand; required volume = daily demand x target days. Use usable storage and a peak (not average) demand; local rainfall or source yield and the AHJ govern.";
  const st = makeNumber("Usable storage (gal)", "csd-st", { step: "any", min: "0", value: "2500" });
  st.input.value = "2500";
  const dd = makeNumber("Daily demand (gpd)", "csd-dd", { step: "any", min: "0", value: "150" });
  dd.input.value = "150";
  const td = makeNumber("Target reserve (days, for required volume)", "csd-td", { step: "any", min: "0", value: "30" });
  td.input.value = "30";
  for (const f of [st, dd, td]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { st.input.value = "2500"; dd.input.value = "150"; td.input.value = "30"; update(); });
  const oDays = makeOutputLine(outputRegion, "Reserve on this tank", "csd-out-days");
  const oReq = makeOutputLine(outputRegion, "Tank needed for the target", "csd-out-req");
  const update = debounce(() => {
    const r = computeCisternStorageDays({
      usable_storage_gal: st.input.value === "" ? 2500 : Number(st.input.value), daily_demand_gpd: dd.input.value === "" ? 150 : Number(dd.input.value),
      target_days: td.input.value === "" ? 30 : Number(td.input.value),
    });
    if (r.error) { oDays.textContent = r.error; oReq.textContent = "-"; return; }
    oDays.textContent = fmt(r.reserve_days, 1) + " days";
    oReq.textContent = fmt(r.required_gal_for_target, 0) + " gal (for " + fmt(Number(td.input.value) || 30, 0) + " days)";
  }, DEBOUNCE_MS);
  for (const f of [st, dd, td]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["cistern-storage-days"] = _v935renderCisternStorageDays;

// ===================== spec-v971: dechlorination chemical dose =====================
// dims: in { args: dimensionless } out: { reagent_dose_mg_l: dimensionless, feed_lb_day: dimensionless }
export function computeDechlorinationDose({ chlorine_residual_mg_l = 2, flow_mgd = 5, stoich_ratio = 1.46, purity_pct = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(chlorine_residual_mg_l > 0)) return { error: "Chlorine residual must be positive (mg/L)." };
  if (!(flow_mgd > 0)) return { error: "Flow must be positive (MGD)." };
  if (!(stoich_ratio > 0)) return { error: "Stoichiometric ratio must be positive (mg reagent per mg Cl2)." };
  if (!(purity_pct > 0 && purity_pct <= 100)) return { error: "Reagent purity must be between 0 and 100 percent." };
  // Dechlorination reagent dose = stoichiometric ratio x the chlorine residual to remove; pounds formula for feed.
  const reagent_dose_mg_l = stoich_ratio * chlorine_residual_mg_l;
  const feed_lb_day = reagent_dose_mg_l * flow_mgd * 8.34 / (purity_pct / 100);
  if (![reagent_dose_mg_l, feed_lb_day].every(Number.isFinite)) return { error: "Dechlorination-dose math is not a finite value." };
  return {
    reagent_dose_mg_l,
    feed_lb_day,
    note: "The dechlorination chemical to neutralize a chlorine residual before an NPDES discharge (or to protect a fish-bearing receiving stream): the reagent dose in mg/L is the stoichiometric ratio times the chlorine residual to remove, and the feed rate is the pounds formula, dose x flow (MGD) x 8.34 / purity. The stoichiometric RATIO -- mg of reagent per mg of chlorine -- is reagent-specific and is entered here: about 0.9-1.0 for sulfur dioxide (SO2), 1.34 for sodium metabisulfite, 1.46 for sodium bisulfite, 1.77 for sodium sulfite, and about 0.56 for sodium thiosulfate. Removing a 2.0 mg/L residual from 5 MGD with sodium bisulfite (ratio 1.46) is a 2.92 mg/L dose and 121.8 lb/day of 100% product; a less-pure product needs proportionally more. Sulfur-based dechlorination consumes dissolved oxygen and depresses pH, so an over-dose has its own permit consequences -- dose to just neutralize the residual, and confirm a zero (or the permit-required near-zero) residual downstream of mixing. A dosing estimate; the discharge permit limit, the actual reagent and its assay, and the state primacy agency govern.",
  };
}

export const dechlorinationDoseExample = { inputs: { chlorine_residual_mg_l: 2, flow_mgd: 5, stoich_ratio: 1.46, purity_pct: 100 } };

function _v971renderDechlorinationDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: dechlorination chemical dose (stoichiometry + the pounds formula), by name. reagent dose (mg/L) = ratio x chlorine residual; feed (lb/day) = dose x flow (MGD) x 8.34 / (purity/100). Ratio (mg reagent / mg Cl2): SO2 ~0.9-1.0, metabisulfite 1.34, bisulfite 1.46, sulfite 1.77, thiosulfate ~0.56. The discharge permit, the reagent assay, and the state primacy agency govern.";
  const cr = makeNumber("Chlorine residual to remove (mg/L)", "dcl-cr", { step: "any", min: "0", value: "2" });
  cr.input.value = "2";
  const fl = makeNumber("Flow (MGD)", "dcl-fl", { step: "any", min: "0", value: "5" });
  fl.input.value = "5";
  const sr = makeNumber("Stoich ratio (mg reagent / mg Cl2)", "dcl-sr", { step: "any", min: "0", value: "1.46" });
  sr.input.value = "1.46";
  const pu = makeNumber("Reagent purity (percent)", "dcl-pu", { step: "any", min: "0", value: "100" });
  pu.input.value = "100";
  for (const f of [cr, fl, sr, pu]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cr.input.value = "2"; fl.input.value = "5"; sr.input.value = "1.46"; pu.input.value = "100"; update(); });
  const oD = makeOutputLine(outputRegion, "Reagent dose", "dcl-out-d");
  const oF = makeOutputLine(outputRegion, "Feed rate", "dcl-out-f");
  const update = debounce(() => {
    const r = computeDechlorinationDose({
      chlorine_residual_mg_l: cr.input.value === "" ? 2 : Number(cr.input.value), flow_mgd: fl.input.value === "" ? 5 : Number(fl.input.value),
      stoich_ratio: sr.input.value === "" ? 1.46 : Number(sr.input.value), purity_pct: pu.input.value === "" ? 100 : Number(pu.input.value),
    });
    if (r.error) { oD.textContent = r.error; oF.textContent = "-"; return; }
    oD.textContent = fmt(r.reagent_dose_mg_l, 2) + " mg/L";
    oF.textContent = fmt(r.feed_lb_day, 1) + " lb/day";
  }, DEBOUNCE_MS);
  for (const f of [cr, fl, sr, pu]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["dechlorination-dose"] = _v971renderDechlorinationDose;

// ===================== spec-v973: float-method (velocity-area) open-channel flow =====================
// dims: in { args: dimensionless } out: { surface_velocity_fps: dimensionless, cross_area_ft2: dimensionless, flow_cfs: dimensionless, flow_gpm: dimensionless }
export function computeFloatMethodFlow({ float_distance_ft = 20, travel_time_s = 10, channel_width_ft = 4, mean_depth_ft = 1.5, float_coefficient = 0.85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(float_distance_ft > 0)) return { error: "Float travel distance must be positive (ft)." };
  if (!(travel_time_s > 0)) return { error: "Travel time must be positive (s)." };
  if (!(channel_width_ft > 0)) return { error: "Channel width must be positive (ft)." };
  if (!(mean_depth_ft > 0)) return { error: "Mean depth must be positive (ft)." };
  if (!(float_coefficient > 0 && float_coefficient <= 1)) return { error: "Float coefficient must be between 0 and 1." };
  // Velocity-area (float) method: Q = C x surface velocity x cross-sectional area.
  const surface_velocity_fps = float_distance_ft / travel_time_s;
  const cross_area_ft2 = channel_width_ft * mean_depth_ft;
  const flow_cfs = float_coefficient * surface_velocity_fps * cross_area_ft2;
  const flow_gpm = flow_cfs * 448.831;
  if (![surface_velocity_fps, cross_area_ft2, flow_cfs, flow_gpm].every(Number.isFinite)) return { error: "Float-method math is not a finite value." };
  return {
    surface_velocity_fps,
    cross_area_ft2,
    flow_cfs,
    flow_gpm,
    note: "A field estimate of open-channel flow (a ditch, canal, or outfall) with only a float, a tape, and a stopwatch -- the velocity-area method. Time a float over a measured straight reach to get the SURFACE velocity (distance / time), multiply by the cross-sectional area (width x mean depth), and apply a float coefficient C to convert surface velocity to the lower MEAN velocity of the whole cross section, since flow is slower along the bed and banks: Q = C x surface velocity x area. C is about 0.85 for a typical channel (0.8 rough / shallow, up to ~0.9 smooth / deep). A float running 20 ft in 10 s (2.0 ft/s surface) in a 4 ft wide, 1.5 ft deep channel gives Q = 0.85 x 2.0 x 6 = 10.2 cfs (about 4,580 gpm). Accuracy improves by averaging several float runs in the fastest thread of flow, surveying the real cross-section (not a single mean depth), and using a straight, uniform, debris-free reach. This is a rough field gauging estimate, well below a metered or current-meter measurement in accuracy; a permit-compliance flow needs a calibrated device, and the metering standard and the permit govern.",
  };
}

export const floatMethodFlowExample = { inputs: { float_distance_ft: 20, travel_time_s: 10, channel_width_ft: 4, mean_depth_ft: 1.5, float_coefficient: 0.85 } };

function _v973renderFloatMethodFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: float (velocity-area) open-channel flow method, by name. Q = C x surface velocity x cross-sectional area; surface velocity = distance / time, area = width x mean depth. C ~0.85 converts surface to mean velocity (0.8 rough to ~0.9 smooth). A rough field estimate; a permit-compliance flow needs a calibrated meter, and the metering standard governs.";
  const fd = makeNumber("Float travel distance (ft)", "fmf-fd", { step: "any", min: "0", value: "20" });
  fd.input.value = "20";
  const tt = makeNumber("Travel time (s)", "fmf-tt", { step: "any", min: "0", value: "10" });
  tt.input.value = "10";
  const cw = makeNumber("Channel width (ft)", "fmf-cw", { step: "any", min: "0", value: "4" });
  cw.input.value = "4";
  const md = makeNumber("Mean depth (ft)", "fmf-md", { step: "any", min: "0", value: "1.5" });
  md.input.value = "1.5";
  const fc = makeNumber("Float coefficient (0-1, ~0.85)", "fmf-fc", { step: "any", min: "0", value: "0.85" });
  fc.input.value = "0.85";
  for (const f of [fd, tt, cw, md, fc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fd.input.value = "20"; tt.input.value = "10"; cw.input.value = "4"; md.input.value = "1.5"; fc.input.value = "0.85"; update(); });
  const oV = makeOutputLine(outputRegion, "Surface velocity", "fmf-out-v");
  const oQ = makeOutputLine(outputRegion, "Flow", "fmf-out-q");
  const update = debounce(() => {
    const r = computeFloatMethodFlow({
      float_distance_ft: fd.input.value === "" ? 20 : Number(fd.input.value), travel_time_s: tt.input.value === "" ? 10 : Number(tt.input.value),
      channel_width_ft: cw.input.value === "" ? 4 : Number(cw.input.value), mean_depth_ft: md.input.value === "" ? 1.5 : Number(md.input.value),
      float_coefficient: fc.input.value === "" ? 0.85 : Number(fc.input.value),
    });
    if (r.error) { oV.textContent = r.error; oQ.textContent = "-"; return; }
    oV.textContent = fmt(r.surface_velocity_fps, 2) + " ft/s (area " + fmt(r.cross_area_ft2, 1) + " ft^2)";
    oQ.textContent = fmt(r.flow_cfs, 2) + " cfs (" + fmt(r.flow_gpm, 0) + " gpm)";
  }, DEBOUNCE_MS);
  for (const f of [fd, tt, cw, md, fc]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["float-method-flow"] = _v973renderFloatMethodFlow;

// ===================== spec-v984: fluoride feed dose (available-fluoride-ion) =====================
// Unlike the generic pounds formula, fluoride dosing must divide by the AVAILABLE FLUORIDE ION (AFI)
// fraction of the compound and subtract the raw background fluoride already in the source water.
// dims: in { args: dimensionless } out: { feed_lb_day: dimensionless, pure_fluoride_lb_day: dimensionless }
export function computeFluorideFeedDose({ target_dose_mg_l = 0.7, raw_fluoride_mg_l = 0.1, flow_mgd = 2, afi_fraction = 0.792, purity_fraction = 0.25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flow_mgd > 0)) return { error: "Flow must be positive (MGD)." };
  if (!(afi_fraction > 0 && afi_fraction <= 1)) return { error: "Available-fluoride-ion fraction must be between 0 and 1." };
  if (!(purity_fraction > 0 && purity_fraction <= 1)) return { error: "Purity / solution strength must be between 0 and 1." };
  if (!(target_dose_mg_l >= 0) || !(raw_fluoride_mg_l >= 0)) return { error: "Doses must be non-negative (mg/L)." };
  const net_dose = target_dose_mg_l - raw_fluoride_mg_l;
  if (!(net_dose > 0)) return { error: "Target dose must exceed the raw background fluoride; no feed is needed." };
  // Pounds formula with the AFI and commercial-strength factors: feed = net dose x flow x 8.34 / (AFI x purity).
  const pure_fluoride_lb_day = net_dose * flow_mgd * 8.34;
  const feed_lb_day = pure_fluoride_lb_day / (afi_fraction * purity_fraction);
  if (!Number.isFinite(feed_lb_day)) return { error: "Fluoride-feed math is not a finite value." };
  return {
    feed_lb_day,
    pure_fluoride_lb_day,
    note: "The pounds-per-day of a fluoridation chemical to hit a target fluoride level, the calculation a water operator runs to set the feed pump or dry feeder. It is the pounds formula (net dose x flow in MGD x 8.34) with two corrections the generic chemical-feed tile leaves out: divide by the AVAILABLE FLUORIDE ION (AFI) fraction -- the share of the compound that is actually fluoride ion -- and by the commercial strength, and first SUBTRACT the raw background fluoride the source water already carries. The AFI is a fixed property of the chemical: fluorosilicic acid (H2SiF6) is 0.792, sodium fluoride (NaF) is 0.452, and sodium fluorosilicate (Na2SiF6) is 0.607. Feeding a net 0.6 mg/L (0.7 target minus 0.1 raw) into 2 MGD with 25% fluorosilicic acid is 0.6 x 2 x 8.34 / (0.792 x 0.25) = 50.55 lb/day of acid solution, which carries 10.0 lb/day of actual fluoride ion. The current US Public Health Service recommendation is 0.7 mg/L. A feed-setpoint aid; the operator's daily lab checks, the SDWA maximum, the exact product assay and specific gravity, and the state fluoridation program govern the real feed.",
  };
}

export const fluorideFeedDoseExample = { inputs: { target_dose_mg_l: 0.7, raw_fluoride_mg_l: 0.1, flow_mgd: 2, afi_fraction: 0.792, purity_fraction: 0.25 } };

function _v984renderFluorideFeedDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fluoride feed dose (available-fluoride-ion pounds formula), by name. feed lb/day = (target - raw) x flow MGD x 8.34 / (AFI x purity). AFI: fluorosilicic acid 0.792, sodium fluoride 0.452, sodium fluorosilicate 0.607. US PHS target 0.7 mg/L. The daily lab checks, the SDWA maximum, the product assay, and the state fluoridation program govern.";
  const td = makeNumber("Target fluoride (mg/L)", "flf-td", { step: "any", min: "0", value: "0.7" });
  td.input.value = "0.7";
  const rf = makeNumber("Raw background fluoride (mg/L)", "flf-rf", { step: "any", min: "0", value: "0.1" });
  rf.input.value = "0.1";
  const fl = makeNumber("Flow (MGD)", "flf-fl", { step: "any", min: "0", value: "2" });
  fl.input.value = "2";
  const af = makeNumber("Available fluoride ion (0-1): FSA 0.792, NaF 0.452, Na2SiF6 0.607", "flf-af", { step: "any", min: "0", max: "1", value: "0.792" });
  af.input.value = "0.792";
  const pu = makeNumber("Purity / solution strength (0-1)", "flf-pu", { step: "any", min: "0", max: "1", value: "0.25" });
  pu.input.value = "0.25";
  for (const f of [td, rf, fl, af, pu]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { td.input.value = "0.7"; rf.input.value = "0.1"; fl.input.value = "2"; af.input.value = "0.792"; pu.input.value = "0.25"; update(); });
  const oF = makeOutputLine(outputRegion, "Chemical feed", "flf-out-f");
  const oP = makeOutputLine(outputRegion, "Pure fluoride ion fed", "flf-out-p");
  const update = debounce(() => {
    const r = computeFluorideFeedDose({
      target_dose_mg_l: td.input.value === "" ? 0.7 : Number(td.input.value), raw_fluoride_mg_l: rf.input.value === "" ? 0.1 : Number(rf.input.value),
      flow_mgd: fl.input.value === "" ? 2 : Number(fl.input.value), afi_fraction: af.input.value === "" ? 0.792 : Number(af.input.value),
      purity_fraction: pu.input.value === "" ? 0.25 : Number(pu.input.value),
    });
    if (r.error) { oF.textContent = r.error; oP.textContent = "-"; return; }
    oF.textContent = fmt(r.feed_lb_day, 2) + " lb/day of product";
    oP.textContent = fmt(r.pure_fluoride_lb_day, 2) + " lb/day fluoride ion";
  }, DEBOUNCE_MS);
  for (const f of [td, rf, fl, af, pu]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["fluoride-feed-dose"] = _v984renderFluorideFeedDose;

// ===================== spec-v992: flow-weighted two-source water blend =====================
// dims: in { args: dimensionless } out: { blended_conc: dimensionless, required_low_source_pct: dimensionless }
export function computeTwoSourceBlend({ flow1_gpm = 500, conc1 = 4, flow2_gpm = 300, conc2 = 12, target_conc = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flow1_gpm > 0)) return { error: "Source 1 flow must be positive (gpm)." };
  if (!(flow2_gpm > 0)) return { error: "Source 2 flow must be positive (gpm)." };
  if (!(conc1 >= 0) || !(conc2 >= 0)) return { error: "Concentrations must be non-negative." };
  if (!(target_conc >= 0)) return { error: "Target concentration must be non-negative." };
  // Flow-weighted mass balance for the blend; the low-source fraction to hit a target is (C2 - Ct)/(C2 - C1).
  const blended_conc = (flow1_gpm * conc1 + flow2_gpm * conc2) / (flow1_gpm + flow2_gpm);
  const lo = Math.min(conc1, conc2), hi = Math.max(conc1, conc2);
  let required_low_source_pct = null;
  let target_note = "";
  if (conc1 === conc2) {
    target_note = "Both sources are the same concentration -- blending cannot change it.";
  } else if (target_conc >= lo && target_conc <= hi) {
    // Fraction of the LOWER-concentration source needed to reach the target.
    required_low_source_pct = (hi - target_conc) / (hi - lo) * 100;
    target_note = "To hit the target, run about " + required_low_source_pct.toFixed(1) + "% of the total flow from the lower-concentration source.";
  } else {
    target_note = "The target is outside the two source concentrations -- no blend of these two can reach it; treatment or a third source is needed.";
  }
  if (!Number.isFinite(blended_conc)) return { error: "Blend math is not a finite value." };
  return {
    blended_conc,
    required_low_source_pct,
    target_note,
    note: "The concentration of two water sources blended together, and the split needed to meet a target -- the everyday calculation when an operator combines wells or surface intakes to hold a contaminant (nitrate, fluoride, hardness, TDS, chloride) under its limit. The blend is the flow-weighted average: (flow1 x conc1 + flow2 x conc2) / (flow1 + flow2), the same mass balance behind the pounds formula. Blending 500 gpm of a 4 mg/L well with 300 gpm of a 12 mg/L well gives (2,000 + 3,600) / 800 = 7.0 mg/L, comfortably under a 10 mg/L MCL. To design toward a target that lies between the two source concentrations, the fraction of the LOWER-concentration source is (high conc - target) / (high conc - low conc): to reach 8 mg/L from the 4 and 12 mg/L wells needs (12 - 8) / (12 - 4) = 50% of the total flow from the clean well, i.e. equal flows. A target outside the two source concentrations cannot be reached by blending them at all -- it takes treatment or a different source. A blending screen; the actual source concentrations vary over time, the SDWA maximum contaminant level is a running or single-sample limit depending on the contaminant, and the state primacy agency and the operator's monitoring govern compliance.",
  };
}

export const twoSourceBlendExample = { inputs: { flow1_gpm: 500, conc1: 4, flow2_gpm: 300, conc2: 12, target_conc: 8 } };

function _v992renderTwoSourceBlend(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: flow-weighted two-source water blend, by name. blended = (Q1 C1 + Q2 C2)/(Q1 + Q2); low-source fraction for a target = (Chigh - target)/(Chigh - Clow). A blending mass balance; the source concentrations vary, the SDWA MCL applies, and the state primacy agency and the operator's monitoring govern compliance.";
  const f1 = makeNumber("Source 1 flow (gpm)", "tsb-f1", { step: "any", min: "0", value: "500" });
  f1.input.value = "500";
  const c1 = makeNumber("Source 1 concentration (mg/L)", "tsb-c1", { step: "any", min: "0", value: "4" });
  c1.input.value = "4";
  const f2 = makeNumber("Source 2 flow (gpm)", "tsb-f2", { step: "any", min: "0", value: "300" });
  f2.input.value = "300";
  const c2 = makeNumber("Source 2 concentration (mg/L)", "tsb-c2", { step: "any", min: "0", value: "12" });
  c2.input.value = "12";
  const tc = makeNumber("Target concentration (mg/L)", "tsb-tc", { step: "any", min: "0", value: "8" });
  tc.input.value = "8";
  for (const f of [f1, c1, f2, c2, tc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { f1.input.value = "500"; c1.input.value = "4"; f2.input.value = "300"; c2.input.value = "12"; tc.input.value = "8"; update(); });
  const oB = makeOutputLine(outputRegion, "Blended concentration", "tsb-out-b");
  const oT = makeOutputLine(outputRegion, "To hit the target", "tsb-out-t");
  const update = debounce(() => {
    const r = computeTwoSourceBlend({
      flow1_gpm: f1.input.value === "" ? 500 : Number(f1.input.value), conc1: c1.input.value === "" ? 4 : Number(c1.input.value),
      flow2_gpm: f2.input.value === "" ? 300 : Number(f2.input.value), conc2: c2.input.value === "" ? 12 : Number(c2.input.value),
      target_conc: tc.input.value === "" ? 8 : Number(tc.input.value),
    });
    if (r.error) { oB.textContent = r.error; oT.textContent = "-"; return; }
    oB.textContent = fmt(r.blended_conc, 2) + " mg/L";
    oT.textContent = r.target_note;
  }, DEBOUNCE_MS);
  for (const f of [f1, c1, f2, c2, tc]) f.input.addEventListener("input", update);
}
WATER_RENDERERS["two-source-blend"] = _v992renderTwoSourceBlend;
