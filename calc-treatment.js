// Group M: Water and Wastewater Operations -- treatment / process-control bench.
// spec-v75 cap-relief split: the cohesive spec-v20 Phase M bench (weir-flow,
// langelier-index, chemical-feed-pump) relocated out of calc-water.js (which had
// reached 95.8% of cap -- the tightest remaining calculator module) into this
// module. The three tiles KEEP group: "M" (a tile's group letter is independent
// of the module that holds it -- the spec-v42/v70..v74 precedent); their ids,
// citations, worked examples, dimensional annotations, and behavior are
// byte-for-byte unchanged. The cut is clean: the bench reaches nothing outside
// its own scoped ./ui-fields.js imports and never calls calc-water.js's
// _finiteGuard (each compute fn does its own positive/finite guards inline), so
// the moved code is verbatim and no guard helper is copied.
// See spec-v4.md section 2.4 (the parent Group M spec) and spec-v20.md (M.1-M.3).

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export const TREATMENT_RENDERERS = {};

// ===========================================================================
// spec-v20 Phase M - three new water/wastewater tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 M.1: Weir / flume open-channel flow (`weir-flow`) ---
// 90deg V-notch Q = 2.49*H^2.48; rectangular Francis Q = 3.33*(L-0.2H)*H^1.5
// (contracted) or 3.33*L*H^1.5 (suppressed). 1 cfs = 448.831 GPM.
// dims: in { weir_type: dimensionless, head_ft: L, crest_length_ft: L, coeff: dimensionless } out: { flow_cfs: L^3*T^-1, flow_gpm: L^3*T^-1 }
export function computeWeirFlow({ weir_type = "vnotch90", head_ft = 0, crest_length_ft = 0, coeff = 0 } = {}) {
  const H = Number(head_ft) || 0;
  const L = Number(crest_length_ft) || 0;
  if (!(H > 0 && Number.isFinite(H))) return { error: "Head over crest must be positive (ft)." };
  let cfs;
  if (weir_type === "vnotch90") {
    const C = coeff > 0 ? coeff : 2.49;
    cfs = C * Math.pow(H, 2.48);
  } else {
    if (!(L > 0 && Number.isFinite(L))) return { error: "Crest length must be positive (ft) for a rectangular weir." };
    const C = coeff > 0 ? coeff : 3.33;
    const effL = weir_type === "rect_contracted" ? (L - 0.2 * H) : L;
    if (effL <= 0) return { error: "Effective crest length is non-positive - head too large for this crest." };
    cfs = C * effL * Math.pow(H, 1.5);
  }
  const gpm = cfs * 448.831;
  const mgd = gpm * 1440 / 1e6;
  return {
    flow_cfs: Number.isFinite(cfs) ? cfs : null,
    flow_gpm: Number.isFinite(gpm) ? gpm : null,
    flow_mgd: Number.isFinite(mgd) ? mgd : null,
    low_accuracy: H < 0.2,
    note: (H < 0.2 ? "Head below ~0.2 ft - low-accuracy reading, flagged. " : "")
      + "Requires a fully-contracted, ventilated, sharp-crested weir with free flow; a submerged/drowned condition is invalid. Approach-velocity correction ignored.",
  };
}
export const weirFlowExample = { inputs: { weir_type: "vnotch90", head_ft: 0.5, crest_length_ft: 0, coeff: 0 } };

function renderWeirFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the USBR Water Measurement Manual (public domain) - V-notch and Francis rectangular-weir equations and Kindsvater-Carter / Francis coefficients; the user confirms the calibrated weir coefficient. Requires a sharp-crested, ventilated, free-flow weir. Free at usbr.gov/tsc/techreferences/mands/wmm.";
  const type = makeSelect("Weir type", "wf-type", [
    { value: "vnotch90", label: "90-degree V-notch", selected: true },
    { value: "rect_contracted", label: "Rectangular (contracted)" },
    { value: "rect_suppressed", label: "Rectangular (suppressed)" },
  ]);
  const H = makeNumber("Head over crest H (ft)", "wf-h", { step: "any", min: "0", value: "0.5" }); H.input.value = "0.5";
  const L = makeNumber("Crest length L (ft, rectangular)", "wf-l", { step: "any", min: "0" });
  const coeff = makeNumber("Weir coefficient (0 = default)", "wf-c", { step: "any", min: "0" });
  for (const f of [type, H, L, coeff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "vnotch90"; H.input.value = "0.5"; L.input.value = ""; coeff.input.value = ""; update(); });
  const oCfs = makeOutputLine(outputRegion, "Flow (cfs)", "wf-out-cfs");
  const oGpm = makeOutputLine(outputRegion, "Flow (GPM / MGD)", "wf-out-gpm");
  const oNote = makeOutputLine(outputRegion, "Note", "wf-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWeirFlow({ weir_type: type.select.value, head_ft: readNum(H.input), crest_length_ft: readNum(L.input), coeff: readNum(coeff.input) });
    if (r.error) { oCfs.textContent = r.error; oGpm.textContent = ""; oNote.textContent = ""; return; }
    oCfs.textContent = fmt(r.flow_cfs, 3) + " cfs";
    oGpm.textContent = fmt(r.flow_gpm, 1) + " GPM (" + fmt(r.flow_mgd, 3) + " MGD)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [type.select, H.input, L.input, coeff.input]) f.addEventListener("input", update);
}
TREATMENT_RENDERERS["weir-flow"] = renderWeirFlow;

// --- v20 M.2: Langelier saturation index (`langelier-index`) ---
// LSI = pH - pHs; pHs = (9.3 + A + B) - (C + D).
// dims: in { ph: dimensionless, temp: T, temp_unit: dimensionless, ca_mgl: dimensionless, alk_mgl: dimensionless, tds_mgl: dimensionless } out: { lsi: dimensionless, phs: dimensionless }
export function computeLangelierIndex({ ph = 0, temp = 0, temp_unit = "C", ca_mgl = 0, alk_mgl = 0, tds_mgl = 0 } = {}) {
  const pH = Number(ph) || 0;
  const ca = Number(ca_mgl) || 0;
  const alk = Number(alk_mgl) || 0;
  const tds = Number(tds_mgl) || 0;
  let tC = Number(temp);
  if (temp_unit === "F") tC = (tC - 32) * 5 / 9;
  if (!Number.isFinite(pH) || pH <= 0) return { error: "pH must be a positive number." };
  if (!(ca > 0 && Number.isFinite(ca))) return { error: "Calcium hardness must be positive (mg/L as CaCO3)." };
  if (!(alk > 0 && Number.isFinite(alk))) return { error: "Total alkalinity must be positive (mg/L as CaCO3)." };
  if (!(tds > 0 && Number.isFinite(tds))) return { error: "TDS must be positive (mg/L)." };
  if (!Number.isFinite(tC)) return { error: "Temperature must be finite." };
  const tK = tC + 273.15;
  if (!(tK > 0)) return { error: "Temperature in Kelvin must be positive." };
  const A = (Math.log10(tds) - 1) / 10;
  const B = -13.12 * Math.log10(tK) + 34.55;
  const C = Math.log10(ca) - 0.4;
  const D = Math.log10(alk);
  const pHs = (9.3 + A + B) - (C + D);
  const lsi = pH - pHs;
  let interp = "balanced (near equilibrium)";
  if (lsi < -0.05) interp = "corrosive / undersaturated (tends to dissolve scale)";
  else if (lsi > 0.05) interp = "scaling / oversaturated (tends to deposit scale)";
  const outRange = ca < 25 || ca > 250 || alk < 25 || alk > 250;
  return {
    phs: Number.isFinite(pHs) ? pHs : null,
    lsi: Number.isFinite(lsi) ? lsi : null,
    interpretation: interp,
    out_of_range: outRange,
    note: (outRange ? "Calcium or alkalinity is outside ~25-250 mg/L - consider the Ryznar / modified indices, flagged. " : "")
      + "LSI predicts tendency, not rate. Temperature handled in Kelvin.",
  };
}
export const langelierIndexExample = { inputs: { ph: 7.5, temp: 25, temp_unit: "C", ca_mgl: 200, alk_mgl: 150, tds_mgl: 320 } };

function renderLangelierIndex(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Langelier (1936) saturation index as standardized in Standard Methods for the Examination of Water and Wastewater (APHA/AWWA/WEF) and AWWA practice, by name; method cited, not reproduced. The user supplies measured water-quality values. LSI predicts tendency, not rate.";
  const ph = makeNumber("pH", "lsi-ph", { step: "any", min: "0", value: "7.5" }); ph.input.value = "7.5";
  const temp = makeNumber("Water temperature", "lsi-temp", { step: "any", value: "77" }); temp.input.value = "77";
  const unit = makeSelect("Temp unit", "lsi-unit", [{ value: "F", label: "Fahrenheit", selected: true }, { value: "C", label: "Celsius" }]);
  const ca = makeNumber("Calcium hardness (mg/L CaCO3)", "lsi-ca", { step: "any", min: "0", value: "200" }); ca.input.value = "200";
  const alk = makeNumber("Total alkalinity (mg/L CaCO3)", "lsi-alk", { step: "any", min: "0", value: "150" }); alk.input.value = "150";
  const tds = makeNumber("TDS (mg/L)", "lsi-tds", { step: "any", min: "0", value: "320" }); tds.input.value = "320";
  for (const f of [ph, temp, unit, ca, alk, tds]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ph.input.value = "7.5"; temp.input.value = "77"; unit.select.value = "F"; ca.input.value = "200"; alk.input.value = "150"; tds.input.value = "320"; update(); });
  const oLSI = makeOutputLine(outputRegion, "LSI", "lsi-out-lsi");
  const oInterp = makeOutputLine(outputRegion, "Interpretation", "lsi-out-int");
  const oNote = makeOutputLine(outputRegion, "Note", "lsi-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeLangelierIndex({ ph: readNum(ph.input), temp: readNum(temp.input), temp_unit: unit.select.value, ca_mgl: readNum(ca.input), alk_mgl: readNum(alk.input), tds_mgl: readNum(tds.input) });
    if (r.error) { oLSI.textContent = r.error; oInterp.textContent = ""; oNote.textContent = ""; return; }
    oLSI.textContent = fmt(r.lsi, 2) + " (pHs " + fmt(r.phs, 2) + ")";
    oInterp.textContent = r.interpretation;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ph.input, temp.input, unit.select, ca.input, alk.input, tds.input]) f.addEventListener("input", update);
}
TREATMENT_RENDERERS["langelier-index"] = renderLangelierIndex;

// --- v20 M.3: Chemical metering-pump setting (`chemical-feed-pump`) ---
// pure lb/day = MGD*dose*8.34; solution lb/day = pure/(strength/100);
// GPD = solution_lb/day/(8.34*SG); mL/min = GPD*3785.41/1440; setting% = GPD/pump_max*100.
// dims: in { flow_mgd: L^3*T^-1, dose_mgl: dimensionless, strength_pct: dimensionless, sg: dimensionless, pump_max_gpd: L^3*T^-1 } out: { solution_gpd: L^3*T^-1, setting_pct: dimensionless }
export function computeChemicalFeedPump({ flow_mgd = 0, dose_mgl = 0, strength_pct = 100, sg = 1, pump_max_gpd = 0 } = {}) {
  const mgd = Number(flow_mgd) || 0;
  const dose = Number(dose_mgl) || 0;
  const strength = Number(strength_pct) || 0;
  const SG = Number(sg) || 0;
  const pumpMax = Number(pump_max_gpd) || 0;
  if (!(mgd > 0 && Number.isFinite(mgd))) return { error: "Plant flow must be positive (MGD)." };
  if (!(dose > 0 && Number.isFinite(dose))) return { error: "Target dose must be positive (mg/L)." };
  if (!(strength > 0 && strength <= 100)) return { error: "Solution strength must be in (0, 100]% active." };
  if (!(SG > 0 && Number.isFinite(SG))) return { error: "Specific gravity must be positive." };
  const pureLbDay = mgd * dose * 8.34;
  const solutionLbDay = pureLbDay / (strength / 100);
  const gpd = solutionLbDay / (8.34 * SG);
  const mlMin = gpd * 3785.41 / 1440;
  const settingPct = pumpMax > 0 ? gpd / pumpMax * 100 : null;
  return {
    pure_lb_day: Number.isFinite(pureLbDay) ? pureLbDay : null,
    solution_lb_day: Number.isFinite(solutionLbDay) ? solutionLbDay : null,
    solution_gpd: Number.isFinite(gpd) ? gpd : null,
    ml_min: Number.isFinite(mlMin) ? mlMin : null,
    setting_pct: settingPct != null && Number.isFinite(settingPct) ? settingPct : null,
    undersized: settingPct != null && settingPct > 100,
    note: (settingPct != null && settingPct > 100 ? "Setting above 100% - pump is undersized for this dose. " : "")
      + "Percent-by-weight differs from trade strength (12.5% NaOCl is ~11.8% by weight). Calibrate against a drawdown cylinder, not the dial.",
  };
}
export const chemicalFeedPumpExample = { inputs: { flow_mgd: 0.5, dose_mgl: 8, strength_pct: 12.5, sg: 1.16, pump_max_gpd: 50 } };

function renderChemicalFeedPump(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pounds-formula basis (lb/day = MGD x mg/L x 8.34), standard AWWA / EPA water-operator practice, by name. Distinct from the coagulant-dose and pounds-formula tiles - this solves for the physical pump setting (% / GPD / mL per min). The operator of record and primacy agency govern.";
  const flow = makeNumber("Plant flow (MGD)", "cfp-flow", { step: "any", min: "0", value: "0.5" }); flow.input.value = "0.5";
  const dose = makeNumber("Target dose (mg/L)", "cfp-dose", { step: "any", min: "0", value: "8" }); dose.input.value = "8";
  const strength = makeNumber("Solution strength (% active)", "cfp-str", { step: "any", min: "0", max: "100", value: "12.5" }); strength.input.value = "12.5";
  const sg = makeNumber("Solution specific gravity", "cfp-sg", { step: "any", min: "0", value: "1.16" }); sg.input.value = "1.16";
  const pump = makeNumber("Pump max output (GPD)", "cfp-pump", { step: "any", min: "0", value: "50" }); pump.input.value = "50";
  for (const f of [flow, dose, strength, sg, pump]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "0.5"; dose.input.value = "8"; strength.input.value = "12.5"; sg.input.value = "1.16"; pump.input.value = "50"; update(); });
  const oFeed = makeOutputLine(outputRegion, "Solution feed", "cfp-out-feed");
  const oSet = makeOutputLine(outputRegion, "Pump setting", "cfp-out-set");
  const oNote = makeOutputLine(outputRegion, "Note", "cfp-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeChemicalFeedPump({ flow_mgd: readNum(flow.input), dose_mgl: readNum(dose.input), strength_pct: readNum(strength.input), sg: readNum(sg.input), pump_max_gpd: readNum(pump.input) });
    if (r.error) { oFeed.textContent = r.error; oSet.textContent = ""; oNote.textContent = ""; return; }
    oFeed.textContent = fmt(r.solution_gpd, 2) + " GPD (" + fmt(r.ml_min, 1) + " mL/min)";
    oSet.textContent = r.setting_pct != null ? fmt(r.setting_pct, 1) + "% of max" : "Enter pump max for the setting.";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [flow.input, dose.input, strength.input, sg.input, pump.input]) f.addEventListener("input", update);
}
TREATMENT_RENDERERS["chemical-feed-pump"] = renderChemicalFeedPump;

// =====================================================================
// spec-v93 M - pool and spa chemical balance: pool-alkalinity-adjust,
// pool-cya-dose, pool-salt-dose. The rest of the start-up-and-balance
// sequence a pool service tech runs (pool-turnover doses chlorine,
// langelier-index reports balance). GOVERNANCE.worker_safety (chemical
// handling - muriatic acid, generator salt, cyanuric acid). NSPF CPO /
// ANSI-APSP-ICC dosing rates; 8.34 lb/gal water; 31.45% (20 Baume)
// muriatic acid. Starting doses to add in portions, circulate, and retest.
// =====================================================================

const _finiteGuardPool = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) return { error: "All numeric inputs must be finite numbers." };
    }
  }
  return null;
};

// Compact renderer factory for the number-input pool dosing tiles (same
// shape as the kitchen/stage _r and trucking _simpleRenderer factories).
function _rPool(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) { if (v[f.key] === undefined) continue; fields[f.key].input.value = v[f.key]; }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };
}

// dims: in { gallons: dimensionless, current_ta_ppm: dimensionless, target_ta_ppm: dimensionless } out: { delta_ppm: dimensionless, bicarb_lb: dimensionless, acid_floz: dimensionless }
export function computePoolAlkalinityAdjust({ gallons = 0, current_ta_ppm = 0, target_ta_ppm = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  if (current_ta_ppm < 0 || target_ta_ppm < 0) return { error: "Alkalinity readings must be non-negative." };
  if (!(gallons > 0)) return { error: "Pool volume must be positive." };
  const delta_ppm = target_ta_ppm - current_ta_ppm;
  const vol_factor = gallons / 10000;
  let action = "none", bicarb_lb = null, acid_floz = null;
  if (delta_ppm > 0) { action = "raise"; bicarb_lb = 1.5 * vol_factor * (delta_ppm / 10); }
  else if (delta_ppm < 0) { action = "lower"; acid_floz = 25 * vol_factor * (Math.abs(delta_ppm) / 10); }
  return {
    action, delta_ppm, bicarb_lb, acid_floz,
    note: "Set total alkalinity (the buffer) before pH, because a stable TA keeps pH from bouncing. About 1.5 lb of sodium bicarbonate per 10,000 gal raises TA ~10 ppm; about 25 fl oz of 31.45% (20 Baume) muriatic acid per 10,000 gal lowers it ~10 ppm (acid lowers pH too). Target TA is typically 80-120 ppm. These are starting doses - add in portions, circulate, and retest. Always add acid to water, never water to acid.",
  };
}
const poolAlkalinityAdjustExample = { inputs: { gallons: 20000, current_ta_ppm: 60, target_ta_ppm: 100 } };
const renderPoolAlkalinityAdjust = _rPool({
  citation: "Citation: NSPF CPO Handbook / ANSI-APSP-ICC dosing tables (by name). ~1.5 lb sodium bicarbonate or ~25 fl oz 31.45% muriatic acid per 10,000 gal per 10 ppm.",
  example: poolAlkalinityAdjustExample.inputs,
  fields: [
    { key: "gallons", label: "Pool volume (gal)", kind: "number" },
    { key: "current_ta_ppm", label: "Current TA (ppm)", kind: "number" },
    { key: "target_ta_ppm", label: "Target TA (ppm)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "pta-out-a", label: "Action", value: (r) => r.action },
    { key: "d", id: "pta-out-d", label: "Change", value: (r) => (r.delta_ppm > 0 ? "+" : "") + fmt(r.delta_ppm, 0) + " ppm" },
    { key: "x", id: "pta-out-x", label: "Dose", value: (r) => r.bicarb_lb !== null ? fmt(r.bicarb_lb, 2) + " lb sodium bicarbonate" : r.acid_floz !== null ? fmt(r.acid_floz, 1) + " fl oz muriatic acid (" + fmt(r.acid_floz / 128, 2) + " gal)" : "none (at target)" },
    { key: "n", id: "pta-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolAlkalinityAdjust,
});
TREATMENT_RENDERERS["pool-alkalinity-adjust"] = renderPoolAlkalinityAdjust;

// dims: in { gallons: dimensionless, current_cya_ppm: dimensionless, target_cya_ppm: dimensionless } out: { delta_ppm: dimensionless, cya_lb: dimensionless, drain_gallons: dimensionless }
export function computePoolCyaDose({ gallons = 0, current_cya_ppm = 0, target_cya_ppm = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  if (current_cya_ppm < 0 || target_cya_ppm < 0) return { error: "Cyanuric acid readings must be non-negative." };
  if (!(gallons > 0)) return { error: "Pool volume must be positive." };
  const delta_ppm = target_cya_ppm - current_cya_ppm;
  const vol_factor = gallons / 10000;
  let action = "none", cya_lb = null, cya_oz = null, drain_fraction = null, drain_gallons = null;
  if (delta_ppm > 0) { action = "raise"; cya_lb = 0.81 * vol_factor * (delta_ppm / 10); cya_oz = cya_lb * 16; }
  else if (delta_ppm < 0) {
    if (!(current_cya_ppm > 0)) return { error: "Cannot dilute down from a zero reading." };
    action = "dilute"; drain_fraction = 1 - target_cya_ppm / current_cya_ppm; drain_gallons = drain_fraction * gallons;
  }
  return {
    action, delta_ppm, cya_lb, cya_oz, drain_fraction, drain_gallons,
    note: "Cyanuric acid (stabilizer / conditioner) protects free chlorine from the sun, but too much locks up chlorine and forces a higher free-chlorine target. About 13 oz of cyanuric acid per 10,000 gal raises CYA ~10 ppm. CYA comes down only by dilution, so to halve it you replace about half the water. Target CYA is typically 30-50 ppm for an outdoor chlorine pool. Add stabilizer slowly through the skimmer - it dissolves slowly and can etch plaster.",
  };
}
const poolCyaDoseExample = { inputs: { gallons: 15000, current_cya_ppm: 20, target_cya_ppm: 40 } };
const renderPoolCyaDose = _rPool({
  citation: "Citation: NSPF CPO Handbook / ANSI-APSP-ICC (by name). ~13 oz (0.81 lb) cyanuric acid per 10,000 gal per 10 ppm; lower only by dilution (drained fraction = 1 - target/current).",
  example: poolCyaDoseExample.inputs,
  fields: [
    { key: "gallons", label: "Pool volume (gal)", kind: "number" },
    { key: "current_cya_ppm", label: "Current CYA (ppm)", kind: "number" },
    { key: "target_cya_ppm", label: "Target CYA (ppm)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "pcya-out-a", label: "Action", value: (r) => r.action },
    { key: "d", id: "pcya-out-d", label: "Change", value: (r) => (r.delta_ppm > 0 ? "+" : "") + fmt(r.delta_ppm, 0) + " ppm" },
    { key: "x", id: "pcya-out-x", label: "Dose / drain", value: (r) => r.cya_lb !== null ? fmt(r.cya_lb, 2) + " lb (" + fmt(r.cya_oz, 1) + " oz) cyanuric acid" : r.drain_gallons !== null ? "drain " + fmt(r.drain_fraction * 100, 0) + "% / " + fmt(r.drain_gallons, 0) + " gal" : "none (at target)" },
    { key: "n", id: "pcya-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolCyaDose,
});
TREATMENT_RENDERERS["pool-cya-dose"] = renderPoolCyaDose;

// dims: in { gallons: dimensionless, current_salt_ppm: dimensionless, target_salt_ppm: dimensionless } out: { delta_ppm: dimensionless, salt_lb: dimensionless, salt_bags: dimensionless, drain_gallons: dimensionless }
export function computePoolSaltDose({ gallons = 0, current_salt_ppm = 0, target_salt_ppm = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  if (current_salt_ppm < 0) return { error: "Salt reading must be non-negative." };
  if (!(gallons > 0)) return { error: "Pool volume must be positive." };
  if (!(target_salt_ppm > 0)) return { error: "Target salt must be positive." };
  const delta_ppm = target_salt_ppm - current_salt_ppm;
  let action = "none", salt_lb = null, salt_bags = null, drain_fraction = null, drain_gallons = null;
  if (delta_ppm > 0) { action = "add"; salt_lb = gallons * 8.34 * delta_ppm / 1000000; salt_bags = Math.ceil(salt_lb / 40); }
  else if (delta_ppm < 0) { action = "dilute"; drain_fraction = 1 - target_salt_ppm / current_salt_ppm; drain_gallons = drain_fraction * gallons; }
  return {
    action, delta_ppm, salt_lb, salt_bags, drain_fraction, drain_gallons,
    note: "A salt-chlorine generator needs the salt at the level on the cell's spec plate, typically about 3,000-3,500 ppm. The salt to add is the volume x 8.34 lb/gal x ppm rise / a million. Salt leaves only by splash-out, backwash, and dilution, so to lower it you replace water. Use pool-grade NaCl (99%+), broadcast it, brush it off the floor, and run the pump - do not run the generator until it has dissolved. Too little underproduces chlorine; too much can corrode fittings.",
  };
}
const poolSaltDoseExample = { inputs: { gallons: 20000, current_salt_ppm: 2000, target_salt_ppm: 3200 } };
const renderPoolSaltDose = _rPool({
  citation: "Citation: Mass-balance identity gallons x 8.34 lb/gal x ppm / 1,000,000 (NSPF CPO / ANSI-APSP-ICC, by name). Lower only by dilution; pool salt sold in 40-lb bags.",
  example: poolSaltDoseExample.inputs,
  fields: [
    { key: "gallons", label: "Pool volume (gal)", kind: "number" },
    { key: "current_salt_ppm", label: "Current salt (ppm)", kind: "number" },
    { key: "target_salt_ppm", label: "Target salt (ppm)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "psalt-out-a", label: "Action", value: (r) => r.action },
    { key: "d", id: "psalt-out-d", label: "Change", value: (r) => (r.delta_ppm > 0 ? "+" : "") + fmt(r.delta_ppm, 0) + " ppm" },
    { key: "x", id: "psalt-out-x", label: "Dose / drain", value: (r) => r.salt_lb !== null ? fmt(r.salt_lb, 2) + " lb pool salt (" + r.salt_bags + " x 40-lb bags)" : r.drain_gallons !== null ? "drain " + fmt(r.drain_fraction * 100, 0) + "% / " + fmt(r.drain_gallons, 0) + " gal" : "none (at target)" },
    { key: "n", id: "psalt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolSaltDose,
});
TREATMENT_RENDERERS["pool-salt-dose"] = renderPoolSaltDose;

// ===================== spec-v353..v355: pool chlorination & heating batch (Group M) =====================
// The dose-and-heat field numbers the alkalinity/CYA/salt adjust tiles never
// give: the free-chlorine dose by product strength (v353), the heater sizing
// and heat-up time (v354), and the breakpoint (superchlorination) shock dose
// that clears chloramines (v355).

const _POOL_CL_PRODUCTS = { "liquid-12.5": 12.5, "cal-hypo-65": 65, "dichlor-56": 56, "trichlor-90": 90 };
// dims: in { ppm: dimensionless, gallons: dimensionless, product: dimensionless, avail: dimensionless } out: { lb_cl: dimensionless, lb_prod: dimensionless, dry_oz: dimensionless, liq_floz: dimensionless }
export function computePoolChlorineDose({ ppm = 0, gallons = 0, product = "cal-hypo-65", avail = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const rise = Number(ppm) || 0;
  const gal = Number(gallons) || 0;
  if (!(rise > 0)) return { error: "Target free-chlorine rise must be positive (ppm)." };
  if (!(gal > 0)) return { error: "Pool volume must be positive (gallons)." };
  let av = product === "custom" ? (Number(avail) || 0) : _POOL_CL_PRODUCTS[product];
  if (av === undefined) return { error: "Unknown product." };
  if (!(av > 0 && av <= 100)) return { error: "Available chlorine must be between 0 and 100 percent." };
  const lb_cl = rise * (gal / 1e6) * 8.34;
  const lb_prod = lb_cl / (av / 100);
  const dry_oz = lb_prod * 16;
  const liq_floz = (lb_prod / 10) * 128; // ~10 lb per gallon of liquid chlorine
  const isLiquid = product === "liquid-12.5" || (product === "custom" && av <= 15);
  return {
    lb_cl, lb_prod, dry_oz, liq_floz, avail_pct: av, isLiquid,
    note: "Free-chlorine dose: pounds of chlorine = ppm x (gallons/1,000,000) x 8.34, divided by the product's available-chlorine fraction to get the product weight, then expressed as dry ounces or (for liquid, ~10 lb/gal) fluid ounces. A weaker product needs proportionally more weight - liquid 12.5% takes five times the weight of 65% cal-hypo for the same chlorine - the cost/handling trade between a cheap heavy jug and a concentrated scoop. Dose to a target free-chlorine level; test and retest, and follow the product label. A pool-care aid, not a substitute for the label directions.",
  };
}
const poolChlorineDoseExample = { inputs: { ppm: 2, gallons: 15000, product: "cal-hypo-65", avail: 0 } };
function renderPoolChlorineDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: free-chlorine dose = ppm x (gallons/1,000,000) x 8.34 lb, divided by the product available-chlorine fraction; liquid ~10 lb/gal. Product strengths: liquid 12.5%, cal-hypo 65%, dichlor 56%, trichlor 90%. Dose to a target and retest; the product label governs.";
  const ppm = makeNumber("Target free-chlorine rise (ppm)", "pcd-ppm", { step: "any", min: "0" }); ppm.input.value = "2";
  const gal = makeNumber("Pool volume (gallons)", "pcd-gal", { step: "any", min: "0" }); gal.input.value = "15000";
  const prod = makeSelect("Product", "pcd-prod", [
    { value: "cal-hypo-65", label: "Cal-hypo 65% (granular)" },
    { value: "liquid-12.5", label: "Liquid chlorine 12.5%" },
    { value: "dichlor-56", label: "Dichlor 56%" },
    { value: "trichlor-90", label: "Trichlor 90%" },
    { value: "custom", label: "Custom (enter %)" },
  ]);
  const av = makeNumber("Available chlorine (%, custom only)", "pcd-av", { step: "any", min: "0", max: "100" });
  for (const f of [ppm, gal]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(prod.wrap); inputRegion.appendChild(av.wrap);
  const oCl = makeOutputLine(outputRegion, "Chlorine mass", "pcd-out-cl");
  const oProd = makeOutputLine(outputRegion, "Product amount", "pcd-out-prod");
  const oNote = makeOutputLine(outputRegion, "Note", "pcd-out-note");
  function syncFields() { av.wrap.style.display = prod.select.value === "custom" ? "" : "none"; }
  const update = debounce(() => {
    const r = computePoolChlorineDose({ ppm: Number(ppm.input.value) || 0, gallons: Number(gal.input.value) || 0, product: prod.select.value, avail: Number(av.input.value) || 0 });
    if (r.error) { oCl.textContent = r.error; oProd.textContent = "-"; oNote.textContent = ""; return; }
    oCl.textContent = fmt(r.lb_cl, 3) + " lb chlorine (" + fmt(r.avail_pct, 1) + "% product)";
    oProd.textContent = r.isLiquid ? fmt(r.liq_floz, 1) + " fl oz (" + fmt(r.lb_prod, 2) + " lb)" : fmt(r.dry_oz, 1) + " oz (" + fmt(r.lb_prod, 2) + " lb)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { ppm.input.value = "2"; gal.input.value = "15000"; prod.select.value = "cal-hypo-65"; av.input.value = ""; syncFields(); update(); });
  prod.select.addEventListener("change", () => { syncFields(); update(); });
  for (const f of [ppm, gal, av]) f.input.addEventListener("input", update);
  syncFields();
}
TREATMENT_RENDERERS["pool-chlorine-dose"] = renderPoolChlorineDose;

// dims: in { gallons: dimensionless, dT_F: T, output: M L^2 T^-3, eff: dimensionless } out: { Q_btu: M L^2 T^-2, delivered: M L^2 T^-3, hours: T }
export function computePoolHeaterBtu({ gallons = 0, dT_F = 0, output = 0, eff = 0.80 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const gal = Number(gallons) || 0;
  const dT = Number(dT_F) || 0;
  const out = Number(output) || 0;
  const e = Number(eff) || 0;
  if (!(gal > 0)) return { error: "Pool volume must be positive (gallons)." };
  if (!(dT > 0)) return { error: "Temperature rise must be positive (F)." };
  if (!(out > 0)) return { error: "Heater output must be positive (Btu/h)." };
  if (!(e > 0)) return { error: "Efficiency (or COP-equivalent) must be positive." };
  const Q_btu = gal * 8.34 * dT;
  const delivered = out * e;
  const hours = Q_btu / delivered;
  return {
    Q_btu, delivered, hours,
    note: "Pool heat-up: energy Btu = gallons x 8.34 lb/gal x temperature rise (1 Btu warms 1 lb of water 1 F), and the heat-up time = energy / (heater output x efficiency). A gas heater at ~80% warms fast; a heat pump (enter its COP-equivalent Btu/h) is far slower but cheaper to run, which is why a heat pump is left on to hold temperature rather than for a quick warm-up. Ignores cover, evaporation, and standby losses, so real heat-up runs longer. A sizing estimate; the equipment ratings and site conditions govern.",
  };
}
const poolHeaterBtuExample = { inputs: { gallons: 20000, dT_F: 10, output: 400000, eff: 0.80 } };
TREATMENT_RENDERERS["pool-heater-btu"] = _rPool({
  citation: "Citation: pool heat-up energy Btu = gallons x 8.34 x temperature rise; time = energy / (output x efficiency). Gas ~80%; enter a heat pump's COP-equivalent Btu/h. Ignores cover/evaporation/standby losses. A sizing estimate; the equipment ratings govern.",
  example: poolHeaterBtuExample.inputs,
  fields: [
    { key: "gallons", label: "Pool volume (gallons)", default: 20000 },
    { key: "dT_F", label: "Temperature rise (F)", default: 10 },
    { key: "output", label: "Heater output (Btu/h)", default: 400000 },
    { key: "eff", label: "Efficiency (0.80 gas; COP-equiv HP)", default: 0.80 },
  ],
  outputs: [
    { key: "q", id: "phb-out-q", label: "Heat-up energy", value: (r) => fmt(r.Q_btu, 0) + " Btu" },
    { key: "h", id: "phb-out-h", label: "Heat-up time", value: (r) => fmt(r.hours, 1) + " h (" + fmt(r.delivered, 0) + " Btu/h delivered)" },
    { key: "n", id: "phb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolHeaterBtu,
});

// dims: in { total_ppm: dimensionless, free_ppm: dimensionless, ratio: dimensionless, gallons: dimensionless, avail: dimensionless } out: { combined_ppm: dimensionless, dose_ppm: dimensionless, lb_product: dimensionless }
export function computeBreakpointChlorination({ total_ppm = 0, free_ppm = 0, ratio = 10, gallons = 0, avail = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const total = Number(total_ppm) || 0;
  const free = Number(free_ppm) || 0;
  const r = Number(ratio) || 0;
  if (!(total >= 0)) return { error: "Total chlorine must be zero or positive (ppm)." };
  if (!(free >= 0)) return { error: "Free chlorine must be zero or positive (ppm)." };
  if (free > total) return { error: "Free chlorine cannot exceed total chlorine." };
  if (!(r > 0)) return { error: "Breakpoint ratio must be positive." };
  const combined_ppm = total - free;
  const dose_ppm = r * combined_ppm;
  const gal = Number(gallons) || 0;
  const av = Number(avail) || 0;
  let lb_product = null;
  if (gal > 0 && av > 0) lb_product = dose_ppm * (gal / 1e6) * 8.34 / (av / 100);
  return {
    combined_ppm, dose_ppm, lb_product,
    note: "Breakpoint (superchlorination) shock: combined chlorine (chloramines) = total - free, and the free-chlorine dose to reach breakpoint = ratio x combined (the ratio is commonly ~10:1). Chloramines cause the 'chlorine smell' and eye irritation; a partial dose below breakpoint makes it worse, so shock all the way. A heavier chloramine load needs a proportionally heavier shock, the reason letting combined chlorine build is expensive to clear. Optional volume and product strength convert the ppm dose to product weight. A pool-care aid; the product label and testing govern.",
  };
}
const breakpointChlorinationExample = { inputs: { total_ppm: 1.5, free_ppm: 1.0, ratio: 10, gallons: 15000, avail: 65 } };
TREATMENT_RENDERERS["breakpoint-chlorination"] = _rPool({
  citation: "Citation: breakpoint chlorination: combined chlorine = total - free, breakpoint dose = ratio x combined (commonly ~10:1). Shock past breakpoint (a partial dose worsens chloramines). Optional volume/product convert ppm to weight. A pool-care aid; the label and testing govern.",
  example: breakpointChlorinationExample.inputs,
  fields: [
    { key: "total_ppm", label: "Total chlorine (ppm)", default: 1.5 },
    { key: "free_ppm", label: "Free chlorine (ppm)", default: 1.0 },
    { key: "ratio", label: "Breakpoint ratio (default 10)", default: 10 },
    { key: "gallons", label: "Pool volume (gallons, optional)", default: 15000 },
    { key: "avail", label: "Product available chlorine (%, optional)", default: 65 },
  ],
  outputs: [
    { key: "c", id: "bpc-out-c", label: "Combined chlorine (chloramines)", value: (r) => fmt(r.combined_ppm, 2) + " ppm" },
    { key: "d", id: "bpc-out-d", label: "Breakpoint free-chlorine dose", value: (r) => fmt(r.dose_ppm, 1) + " ppm" },
    { key: "p", id: "bpc-out-p", label: "Product amount", value: (r) => r.lb_product == null ? "(enter volume and product % for weight)" : fmt(r.lb_product * 16, 1) + " oz (" + fmt(r.lb_product, 2) + " lb)" },
    { key: "n", id: "bpc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBreakpointChlorination,
});

// ===================== spec-v405..v407: water/wastewater-operations trio (Group M) =====================

// dims: in { flow_mgd: dimensionless, surface_ft2: L^2, weir_len_ft: L, mlss_mgl: dimensionless } out: { sor_gpd_ft2: dimensionless, weir_gpd_ft: dimensionless, solids_lb_ft2_day: dimensionless }
export function computeClarifierSurfaceLoading({ flow_mgd = 0, surface_ft2 = 0, weir_len_ft = 0, mlss_mgl = 0 } = {}) {
  const flow = Number(flow_mgd) || 0;
  const area = Number(surface_ft2) || 0;
  const weir = Number(weir_len_ft) || 0;
  const mlss = Number(mlss_mgl) || 0;
  if (!(flow > 0 && Number.isFinite(flow))) return { error: "Flow must be positive (MGD)." };
  if (!(area > 0 && Number.isFinite(area))) return { error: "Surface area must be positive (ft^2)." };
  if (!(weir > 0 && Number.isFinite(weir))) return { error: "Weir length must be positive (ft)." };
  if (mlss < 0 || !Number.isFinite(mlss)) return { error: "MLSS must be a non-negative finite number (mg/L)." };
  const sor_gpd_ft2 = (flow * 1e6) / area;
  const weir_gpd_ft = (flow * 1e6) / weir;
  const solids_lb_ft2_day = mlss > 0 ? flow * mlss * 8.34 / area : null;
  return {
    sor_gpd_ft2, weir_gpd_ft, solids_lb_ft2_day,
    sor_overloaded: sor_gpd_ft2 > 1000,
    note: "Clarifier loading checks: surface overflow rate SOR = flow / surface area (gpd/ft^2), weir overflow rate = flow / total weir length (gpd/ft), and (for a secondary clarifier) solids loading = flow x MLSS x 8.34 / area (lb/ft^2/day). Typical design limits are roughly 700-1000 gpd/ft^2 SOR, 10,000-20,000 gpd/ft weir, and 20-30 lb/ft^2/day solids; exceeding the SOR carries floc over the weir. Ten States Standards and the state design criteria govern the limits. An operations aid; the operator of record and the primacy agency govern compliance.",
  };
}
export const clarifierSurfaceLoadingExample = { inputs: { flow_mgd: 1.0, surface_ft2: 1256.6, weir_len_ft: 125.7, mlss_mgl: 2500 } };
function renderClarifierSurfaceLoading(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Clarifier hydraulic and solids loading (Ten States Standards / Metcalf & Eddy, Wastewater Engineering): surface overflow rate = flow/area (gpd/ft^2), weir overflow rate = flow/weir length (gpd/ft), solids loading = flow x MLSS x 8.34 / area (lb/ft^2/day). The state design criteria govern the limits. An operations aid; the operator of record and the primacy agency govern compliance.";
  const flow = makeNumber("Flow (MGD)", "csl-flow", { step: "any", min: "0" }); flow.input.value = "1.0";
  const area = makeNumber("Surface area (ft^2)", "csl-area", { step: "any", min: "0" }); area.input.value = "1256.6";
  const weir = makeNumber("Total weir length (ft)", "csl-weir", { step: "any", min: "0" }); weir.input.value = "125.7";
  const mlss = makeNumber("MLSS (mg/L, secondary only)", "csl-mlss", { step: "any", min: "0" }); mlss.input.value = "2500";
  for (const f of [flow, area, weir, mlss]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "1.0"; area.input.value = "1256.6"; weir.input.value = "125.7"; mlss.input.value = "2500"; update(); });
  const oSor = makeOutputLine(outputRegion, "Surface overflow rate", "csl-out-sor");
  const oWeir = makeOutputLine(outputRegion, "Weir overflow rate", "csl-out-weir");
  const oSolids = makeOutputLine(outputRegion, "Solids loading", "csl-out-solids");
  const oNote = makeOutputLine(outputRegion, "Note", "csl-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeClarifierSurfaceLoading({ flow_mgd: readNum(flow.input), surface_ft2: readNum(area.input), weir_len_ft: readNum(weir.input), mlss_mgl: readNum(mlss.input) });
    if (r.error) { oSor.textContent = r.error; oWeir.textContent = "-"; oSolids.textContent = "-"; oNote.textContent = ""; return; }
    oSor.textContent = fmt(r.sor_gpd_ft2, 0) + " gpd/ft^2" + (r.sor_overloaded ? " (OVER ~1000 -- floc carryover risk)" : "");
    oWeir.textContent = fmt(r.weir_gpd_ft, 0) + " gpd/ft";
    oSolids.textContent = r.solids_lb_ft2_day == null ? "(enter MLSS for a secondary clarifier)" : fmt(r.solids_lb_ft2_day, 1) + " lb/ft^2/day";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [flow, area, weir, mlss]) f.input.addEventListener("input", update);
}
TREATMENT_RENDERERS["clarifier-surface-loading"] = renderClarifierSurfaceLoading;

// dims: in { flow_mgd: dimensionless, influent_mgl: dimensionless, effluent_mgl: dimensionless } out: { influent_lb_day: dimensionless, effluent_lb_day: dimensionless, removed_lb_day: dimensionless, removal_pct: dimensionless }
export function computeBodTssLoadingRemoval({ flow_mgd = 0, influent_mgl = 0, effluent_mgl = 0 } = {}) {
  const flow = Number(flow_mgd) || 0;
  const inf = Number(influent_mgl) || 0;
  const eff = Number(effluent_mgl) || 0;
  if (!(flow > 0 && Number.isFinite(flow))) return { error: "Flow must be positive (MGD)." };
  if (!(inf > 0 && Number.isFinite(inf))) return { error: "Influent concentration must be positive (mg/L)." };
  if (!(eff >= 0 && Number.isFinite(eff))) return { error: "Effluent concentration must be non-negative (mg/L)." };
  const influent_lb_day = flow * inf * 8.34;
  const effluent_lb_day = flow * eff * 8.34;
  const removed_lb_day = influent_lb_day - effluent_lb_day;
  const removal_pct = (inf - eff) / inf * 100;
  return {
    influent_lb_day, effluent_lb_day, removed_lb_day, removal_pct,
    upset: removal_pct < 0,
    note: "BOD/TSS mass loading and percent removal: load (lb/day) = flow (MGD) x concentration (mg/L) x 8.34, applied to the influent and effluent, with removed = influent - effluent load and removal% = (influent - effluent) / influent x 100. Load scales with flow while removal efficiency does not, so a bigger plant at the same concentrations carries a proportionally larger load. An effluent above the influent is a treatment upset (negative removal), reported rather than errored. An operations aid; the operator of record and the primacy agency govern compliance.",
  };
}
export const bodTssLoadingRemovalExample = { inputs: { flow_mgd: 1.0, influent_mgl: 200, effluent_mgl: 20 } };
function renderBodTssLoadingRemoval(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: BOD/TSS mass loading and removal (the pounds formula, Metcalf & Eddy / operator practice): load (lb/day) = MGD x mg/L x 8.34, removal% = (influent - effluent) / influent x 100. An operations aid; the operator of record and the primacy agency govern compliance.";
  const flow = makeNumber("Plant flow (MGD)", "btl-flow", { step: "any", min: "0" }); flow.input.value = "1.0";
  const inf = makeNumber("Influent BOD or TSS (mg/L)", "btl-inf", { step: "any", min: "0" }); inf.input.value = "200";
  const eff = makeNumber("Effluent BOD or TSS (mg/L)", "btl-eff", { step: "any", min: "0" }); eff.input.value = "20";
  for (const f of [flow, inf, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "1.0"; inf.input.value = "200"; eff.input.value = "20"; update(); });
  const oInf = makeOutputLine(outputRegion, "Influent / effluent load", "btl-out-inf");
  const oRem = makeOutputLine(outputRegion, "Removed load", "btl-out-rem");
  const oPct = makeOutputLine(outputRegion, "Percent removal", "btl-out-pct");
  const oNote = makeOutputLine(outputRegion, "Note", "btl-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBodTssLoadingRemoval({ flow_mgd: readNum(flow.input), influent_mgl: readNum(inf.input), effluent_mgl: readNum(eff.input) });
    if (r.error) { oInf.textContent = r.error; oRem.textContent = "-"; oPct.textContent = "-"; oNote.textContent = ""; return; }
    oInf.textContent = fmt(r.influent_lb_day, 0) + " / " + fmt(r.effluent_lb_day, 0) + " lb/day";
    oRem.textContent = fmt(r.removed_lb_day, 0) + " lb/day";
    oPct.textContent = fmt(r.removal_pct, 1) + "%" + (r.upset ? " (UPSET -- effluent above influent)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [flow, inf, eff]) f.input.addEventListener("input", update);
}
TREATMENT_RENDERERS["bod-tss-loading-removal"] = renderBodTssLoadingRemoval;

// dims: in { conductivity_us_cm: dimensionless, k_factor: dimensionless } out: { tds_mgl: dimensionless }
export function computeTdsFromConductivity({ conductivity_us_cm = 0, k_factor = 0.65 } = {}) {
  const ec = Number(conductivity_us_cm) || 0;
  const k = Number(k_factor) || 0;
  if (!(ec > 0 && Number.isFinite(ec))) return { error: "Conductivity must be positive (uS/cm)." };
  if (!(k >= 0.4 && k <= 0.9)) return { error: "TDS/EC factor must be between 0.4 and 0.9." };
  const tds_mgl = k * ec;
  return {
    tds_mgl, tds_low: 0.55 * ec, tds_high: 0.75 * ec,
    note: "Total dissolved solids from electrical conductivity: TDS (mg/L) = k x EC (uS/cm at 25 C), with the correlation factor k commonly 0.55-0.75 (default 0.65) depending on the dominant ions. The result is an estimate, not a gravimetric measurement; the +/-15% band from the k range is shown so the number is not read as exact. Calibrate k against a lab TDS for the specific water. An operations aid; the operator of record and the primacy agency govern compliance.",
  };
}
export const tdsFromConductivityExample = { inputs: { conductivity_us_cm: 1000, k_factor: 0.65 } };
function renderTdsFromConductivity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: TDS from conductivity (Standard Methods 2510 / operator practice): TDS (mg/L) = k x EC (uS/cm at 25 C), k commonly 0.55-0.75 by ion makeup. An estimate, not a gravimetric TDS; calibrate k against a lab result. An operations aid; the operator of record and the primacy agency govern compliance.";
  const ec = makeNumber("Conductivity (uS/cm at 25 C)", "tfc-ec", { step: "any", min: "0" }); ec.input.value = "1000";
  const k = makeNumber("TDS/EC factor (0.4-0.9, default 0.65)", "tfc-k", { step: "any", min: "0" }); k.input.value = "0.65";
  for (const f of [ec, k]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ec.input.value = "1000"; k.input.value = "0.65"; update(); });
  const oTds = makeOutputLine(outputRegion, "Total dissolved solids", "tfc-out-tds");
  const oBand = makeOutputLine(outputRegion, "Range (k 0.55-0.75)", "tfc-out-band");
  const oNote = makeOutputLine(outputRegion, "Note", "tfc-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTdsFromConductivity({ conductivity_us_cm: readNum(ec.input), k_factor: readNum(k.input) });
    if (r.error) { oTds.textContent = r.error; oBand.textContent = "-"; oNote.textContent = ""; return; }
    oTds.textContent = fmt(r.tds_mgl, 0) + " mg/L";
    oBand.textContent = fmt(r.tds_low, 0) + " to " + fmt(r.tds_high, 0) + " mg/L";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ec, k]) f.input.addEventListener("input", update);
}
TREATMENT_RENDERERS["tds-from-conductivity"] = renderTdsFromConductivity;

// --- spec-v573 M: Anaerobic digester volatile-solids loading rate ---
// VS_fed = gpd*8.34*(%TS/100)*(%VS/100). VSLR = VS_fed/ft3*1000. DT = ft3*7.48/gpd.
// dims: in { feed_flow_gpd: L^3 T^-1, percent_ts: dimensionless, percent_vs: dimensionless, digester_ft3: L^3 } out: { vs_fed_lb_day: M T^-1, vslr: dimensionless, dt_days: T }
export function computeDigesterVsLoading({ feed_flow_gpd = 0, percent_ts = 0, percent_vs = 0, digester_ft3 = 0 } = {}) {
  const feed = Number(feed_flow_gpd) || 0;
  const ts = Number(percent_ts) || 0;
  const vs = Number(percent_vs) || 0;
  const vol = Number(digester_ft3) || 0;
  if (!(feed > 0 && Number.isFinite(feed))) return { error: "Feed flow must be positive (gpd)." };
  if (!(vol > 0 && Number.isFinite(vol))) return { error: "Digester volume must be positive (ft^3)." };
  if (!(ts > 0 && ts <= 100)) return { error: "Total solids percent must be over 0 and at most 100." };
  if (!(vs > 0 && vs <= 100)) return { error: "Volatile solids percent must be over 0 and at most 100." };
  const vs_fed_lb_day = feed * 8.34 * (ts / 100) * (vs / 100);
  const vslr = vs_fed_lb_day / vol * 1000;
  const dt_days = vol * 7.48 / feed;
  const over_limit = vslr > 400;
  const in_band = vslr >= 100 && vslr <= 400;
  return {
    vs_fed_lb_day, vslr, dt_days, over_limit, in_band,
    note: "Overloading past about 400 lb VS/day per 1,000 ft^3 sours the digester as the acid-formers outrun the methane-formers and the pH and alkalinity crash - a slow failure that takes weeks to recover. The loading rate, not a full tank, is the health metric; a thin feed can hit the limit at high flow and a rich feed at low flow. The high-rate band is 100-400 lb VS/day per 1,000 ft^3. The digester monitoring (pH, alkalinity, gas) and the operator govern.",
  };
}
export const digesterVsLoadingExample = { inputs: { feed_flow_gpd: 15000, percent_ts: 4, percent_vs: 75, digester_ft3: 20000 } };
const renderDigesterVsLoading = _rPool({
  citation: "Citation: anaerobic digester volatile-solids loading rate (WEF; university operator courses), by name. VS_fed = feed_gal x 8.34 x (%TS/100) x (%VS/100); VSLR = VS_fed / volume x 1000; DT = volume x 7.48 / feed_gal. Overloading past ~400 lb VS/day per 1,000 ft^3 sours the digester (acid-formers outrun the methane-formers, pH and alkalinity crash). The loading rate, not a full tank, is the health metric. The digester monitoring and the operator govern.",
  example: digesterVsLoadingExample.inputs,
  fields: [
    { key: "feed_flow_gpd", label: "Sludge feed flow (gpd)", kind: "number" },
    { key: "percent_ts", label: "Total solids (%)", kind: "number" },
    { key: "percent_vs", label: "Volatile fraction of TS (%)", kind: "number" },
    { key: "digester_ft3", label: "Digester volume (ft^3)", kind: "number" },
  ],
  outputs: [
    { key: "vs", id: "dvl-out-vs", label: "Volatile solids fed", value: (r) => fmt(r.vs_fed_lb_day, 0) + " lb/day" },
    { key: "l", id: "dvl-out-l", label: "VSLR (per 1,000 ft^3)", value: (r) => fmt(r.vslr, 0) + " lb VS/day - " + (r.over_limit ? "OVER ~400, digester may sour" : r.in_band ? "in the 100-400 healthy band" : "below the high-rate band") },
    { key: "d", id: "dvl-out-d", label: "Hydraulic detention time", value: (r) => fmt(r.dt_days, 1) + " days" },
    { key: "n", id: "dvl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDigesterVsLoading,
});
TREATMENT_RENDERERS["digester-vs-loading"] = renderDigesterVsLoading;

// --- spec-v620 M: Digester volatile-acid to alkalinity ratio (`va-alkalinity-ratio`) ---
// ratio = volatile_acids / alkalinity (common CaCO3 basis). Bands: <0.1 stable, <=0.25 acceptable, <=0.4 corrective, >0.4 souring.
// dims: in { volatile_acids_mgl: dimensionless, alkalinity_mgl: dimensionless } out: { ratio: dimensionless, buffer_margin_mgl: dimensionless }
export function computeVaAlkalinityRatio({ volatile_acids_mgl = 0, alkalinity_mgl = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const va = Number(volatile_acids_mgl) || 0;
  const alk = Number(alkalinity_mgl) || 0;
  if (!(alk > 0)) return { error: "Alkalinity must be positive (mg/L as CaCO3)." };
  if (va < 0) return { error: "Volatile acids cannot be negative (mg/L)." };
  const ratio = va / alk;
  const band = ratio < 0.1 ? "stable"
    : ratio <= 0.25 ? "acceptable"
    : ratio <= 0.4 ? "corrective action"
    : "souring";
  const buffer_margin_mgl = alk - va;
  return {
    ratio, band, buffer_margin_mgl,
    note: "The volatile-acid to alkalinity ratio is the early-warning index of digester stability: below ~0.1 stable, 0.1-0.25 acceptable, 0.25-0.4 begin corrective action (cut the feed, add alkalinity), above ~0.4 the digester is going sour. The pH is a LAGGING indicator - the bicarbonate buffer holds the pH steady until the alkalinity is consumed, so the ratio flags the upset days before the pH moves. Both readings must be to the same CaCO3 basis. The digester monitoring and the operator govern.",
  };
}
export const vaAlkalinityRatioExample = { inputs: { volatile_acids_mgl: 180, alkalinity_mgl: 2400 } };
const renderVaAlkalinityRatio = _rPool({
  citation: "Citation: volatile-acid to alkalinity ratio, digester stability index (WEF Manual of Practice; EPA anaerobic-digester operator practice), by name. ratio = volatile_acids / alkalinity (both to a common CaCO3 basis). Bands: < 0.1 stable, 0.1-0.25 acceptable, 0.25-0.4 corrective action, > 0.4 souring. The pH is a lagging indicator - the bicarbonate buffer holds the pH steady until the alkalinity is consumed, so the ratio flags the upset days before the pH moves. The digester monitoring and the operator govern.",
  example: vaAlkalinityRatioExample.inputs,
  fields: [
    { key: "volatile_acids_mgl", label: "Volatile acids as acetic (mg/L)", kind: "number" },
    { key: "alkalinity_mgl", label: "Total alkalinity as CaCO3 (mg/L)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "var-out-r", label: "VA / alkalinity ratio", value: (r) => fmt(r.ratio, 3) + " - " + r.band },
    { key: "b", id: "var-out-b", label: "Bicarbonate buffer margin", value: (r) => fmt(r.buffer_margin_mgl, 0) + " mg/L not yet consumed" },
    { key: "n", id: "var-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVaAlkalinityRatio,
});
TREATMENT_RENDERERS["va-alkalinity-ratio"] = renderVaAlkalinityRatio;

// --- spec-v596 M: Digester gas and methane production (`digester-gas-production`) ---
// VS_destroyed = VS_fed x reduction/100; gas = VS_destroyed x yield; methane = gas x methane_pct/100; energy = methane x 960 BTU/ft^3.
// dims: in { vs_fed_lb_day: dimensionless, vs_reduction_pct: dimensionless, gas_yield_ft3_lb: dimensionless, methane_pct: dimensionless } out: { vs_destroyed_lb_day: dimensionless, gas_ft3_day: dimensionless, methane_ft3_day: dimensionless, energy_btu_day: dimensionless }
export function computeDigesterGasProduction({ vs_fed_lb_day = 0, vs_reduction_pct = 0, gas_yield_ft3_lb = 15, methane_pct = 65 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const vsf = Number(vs_fed_lb_day) || 0;
  const red = Number(vs_reduction_pct) || 0;
  const yld = Number(gas_yield_ft3_lb) || 0;
  const ch4 = Number(methane_pct) || 0;
  if (!(vsf > 0)) return { error: "Volatile solids fed must be positive (lb/day)." };
  if (!(red > 0 && red <= 100)) return { error: "Volatile-solids reduction must be over 0 and at most 100 (%)." };
  if (!(yld > 0)) return { error: "Gas yield must be positive (ft^3 per lb VS destroyed)." };
  if (!(ch4 > 0 && ch4 <= 100)) return { error: "Methane percent must be over 0 and at most 100." };
  const vs_destroyed_lb_day = vsf * red / 100;
  const gas_ft3_day = vs_destroyed_lb_day * yld;
  const methane_ft3_day = gas_ft3_day * ch4 / 100;
  const energy_btu_day = methane_ft3_day * 960;
  return {
    vs_destroyed_lb_day, gas_ft3_day, methane_ft3_day, energy_btu_day,
    energy_mmbtu_day: energy_btu_day / 1e6,
    note: "The yield (12-18 ft^3/lb VS destroyed) and the methane fraction (~65%) depend on the feed and temperature - a digester-gas analysis governs the real values. The energy counts the methane heating value only (~960 BTU/ft^3); the CO2 fraction carries none. The estimate assumes steady mesophilic operation. The digester monitoring and the operator of record govern - a planning estimate, not a metered gas measurement.",
  };
}
export const digesterGasProductionExample = { inputs: { vs_fed_lb_day: 10000, vs_reduction_pct: 55, gas_yield_ft3_lb: 15, methane_pct: 65 } };
const renderDigesterGasProduction = _rPool({
  citation: "Citation: anaerobic digester gas production (WEF; university operator courses), by name. VS_destroyed = VS_fed x reduction/100; gas = VS_destroyed x yield (12-18 ft^3/lb, default 15); methane = gas x methane_pct/100 (~65%); energy = methane x 960 BTU/ft^3. The yield and methane fraction depend on feed and temperature; a digester-gas analysis governs. The digester monitoring and the operator of record govern - a planning estimate, not a metered gas measurement.",
  example: digesterGasProductionExample.inputs,
  fields: [
    { key: "vs_fed_lb_day", label: "Volatile solids fed (lb/day)", kind: "number" },
    { key: "vs_reduction_pct", label: "VS reduction (%, typical 50-60)", kind: "number" },
    { key: "gas_yield_ft3_lb", label: "Gas yield (ft^3 per lb VS destroyed)", kind: "number", default: 15 },
    { key: "methane_pct", label: "Methane fraction of gas (%)", kind: "number", default: 65 },
  ],
  outputs: [
    { key: "vsd", id: "dgp-out-vsd", label: "VS destroyed", value: (r) => fmt(r.vs_destroyed_lb_day, 0) + " lb/day" },
    { key: "gas", id: "dgp-out-gas", label: "Digester gas", value: (r) => fmt(r.gas_ft3_day, 0) + " ft^3/day" },
    { key: "ch4", id: "dgp-out-ch4", label: "Methane", value: (r) => fmt(r.methane_ft3_day, 0) + " ft^3/day" },
    { key: "e", id: "dgp-out-e", label: "Recoverable energy", value: (r) => fmt(r.energy_mmbtu_day, 1) + " MMBtu/day" },
    { key: "n", id: "dgp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDigesterGasProduction,
});
TREATMENT_RENDERERS["digester-gas-production"] = renderDigesterGasProduction;

// --- spec-v575 M: Mixing velocity gradient (Camp-Stein G / Gt) ---
// mu(T) from a water-property table; G = sqrt(P/(mu*V)); Gt = G*t.
const _WATER_VISCOSITY_PAS = [
  [0, 0.001792], [5, 0.001519], [10, 0.001307], [15, 0.001138], [20, 0.001002],
  [25, 0.000890], [30, 0.000798], [35, 0.000719], [40, 0.000653],
];
function _waterViscosity(t) {
  const T = _WATER_VISCOSITY_PAS;
  if (t <= T[0][0]) return T[0][1];
  if (t >= T[T.length - 1][0]) return T[T.length - 1][1];
  for (let i = 0; i < T.length - 1; i++) {
    if (t >= T[i][0] && t <= T[i + 1][0]) {
      const f = (t - T[i][0]) / (T[i + 1][0] - T[i][0]);
      return T[i][1] + f * (T[i + 1][1] - T[i][1]);
    }
  }
  return null;
}
// dims: in { power_input_w: M L^2 T^-3, basin_volume_m3: L^3, water_temp_c: dimensionless, detention_time_s: T } out: { g_value: dimensionless, gt_value: dimensionless }
export function computeFlocculationGValue({ power_input_w = 0, basin_volume_m3 = 0, water_temp_c = 15, detention_time_s = 0 } = {}) {
  const p = Number(power_input_w) || 0;
  const v = Number(basin_volume_m3) || 0;
  const t = Number(water_temp_c);
  const dt = Number(detention_time_s) || 0;
  if (!(p > 0 && Number.isFinite(p))) return { error: "Power input must be positive (W)." };
  if (!(v > 0 && Number.isFinite(v))) return { error: "Basin volume must be positive (m^3)." };
  if (!(dt > 0 && Number.isFinite(dt))) return { error: "Detention time must be positive (s)." };
  if (!Number.isFinite(t) || t < 0 || t > 40) return { error: "Water temperature must be between 0 and 40 C (viscosity-table range)." };
  const mu = _waterViscosity(t);
  const g_value = Math.sqrt(p / (mu * v));
  const gt_value = g_value * dt;
  if (![g_value, gt_value].every(Number.isFinite)) return { error: "G-value math is not a finite value." };
  const band = g_value >= 500 ? "rapid mix (500-1,000 range)" : g_value >= 20 && g_value <= 70 ? "flocculation (20-70 band)" : g_value < 20 ? "below the flocculation floor (weak mixing)" : "between flocculation and rapid mix";
  return {
    mu, g_value, gt_value, band,
    note: "G depends on the water temperature through viscosity, so cold water yields a LOWER G for the same paddle power and can drop flocculation below the 20-per-second floor. Too high a G in the flocculation basin shears the floc apart - the reason rapid mix (G 500-1,000) and flocculation (G 20-70) are staged, not merged. Gt characterizes the whole basin (10^4 to 10^5 typical). The viscosity is taken from a water-property table at the given temperature; the treatment-process design governs.",
  };
}
// Correlation-native (SI) example -- the Camp-Stein compute keeps this signature
// and the test fixtures stay in this form.
export const flocculationGValueExample = { inputs: { power_input_w: 300, basin_volume_m3: 100, water_temp_c: 10, detention_time_s: 1200 } };
// spec-v593: the USER-FACING fields are hp / gallons / deg F, converted to the
// correlation's native W / m^3 / deg C at the renderer boundary. The math and
// citation above stay metric-native; the SI equivalents are echoed as an output
// line so the metric entry path stays one read away.
const _FGV_W_PER_HP = 745.699872;
const _FGV_M3_PER_GAL = 0.003785411784;
const renderFlocculationGValue = _rPool({
  citation: "Citation: Camp-Stein velocity gradient (Camp & Stein; Ten States Standards), by name. G = sqrt(P / (mu x V)); Gt = G x detention_time; mu is water dynamic viscosity at the given temperature. Bands: rapid mix G 500-1,000/s, flocculation G 20-70/s, Gt 10^4-10^5. Cold water is more viscous, so the same paddle delivers a lower G in winter; too high a G in flocculation shears the floc. The treatment-process design governs.",
  example: { power_input_hp: 0.4, basin_volume_gal: 26400, water_temp_f: 50, detention_time_s: 1200 },
  fields: [
    { key: "power_input_hp", label: "Net power to the water P (hp)", kind: "number" },
    { key: "basin_volume_gal", label: "Mixing basin volume V (gal)", kind: "number" },
    { key: "water_temp_f", label: "Water temperature (F)", kind: "number", default: 59 },
    { key: "detention_time_s", label: "Detention time (s)", kind: "number" },
  ],
  outputs: [
    { key: "g", id: "fgv-out-g", label: "Velocity gradient G", value: (r) => fmt(r.g_value, 0) + " /s - " + r.band },
    { key: "gt", id: "fgv-out-gt", label: "Gt product", value: (r) => fmt(r.gt_value, 0) + " (mu " + r.mu.toFixed(6) + " Pa-s)" },
    { key: "si", id: "fgv-out-si", label: "SI equivalents", value: (r) => "P " + fmt(r.power_input_w, 1) + " W, V " + fmt(r.basin_volume_m3, 1) + " m^3, T " + fmt(r.water_temp_c, 1) + " C" },
    { key: "n", id: "fgv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: (inp = {}) => {
    const hp = Number(inp.power_input_hp) || 0;
    const gal = Number(inp.basin_volume_gal) || 0;
    const tF = Number(inp.water_temp_f);
    if (!(hp > 0 && Number.isFinite(hp))) return { error: "Power input must be positive (hp)." };
    if (!(gal > 0 && Number.isFinite(gal))) return { error: "Basin volume must be positive (gal)." };
    if (!Number.isFinite(tF) || tF < 32 || tF > 104) return { error: "Water temperature must be between 32 and 104 F (the 0-40 C viscosity-table range)." };
    const power_input_w = hp * _FGV_W_PER_HP;
    const basin_volume_m3 = gal * _FGV_M3_PER_GAL;
    const water_temp_c = (tF - 32) * 5 / 9;
    const r = computeFlocculationGValue({ power_input_w, basin_volume_m3, water_temp_c, detention_time_s: inp.detention_time_s });
    return r.error ? r : Object.assign({ power_input_w, basin_volume_m3, water_temp_c }, r);
  },
});
TREATMENT_RENDERERS["flocculation-g-value"] = renderFlocculationGValue;

// --- spec-v621 M: Tapered flocculation multi-stage G schedule (`tapered-flocculation-g`) ---
// P_stage = G_stage^2 x mu(T) x V_stage (Camp-Stein inverted). Stage 3 G = 0 models a 2-stage train. Gt = mean(G) x total_time.
// dims: in { stage1_g_per_s: dimensionless, stage2_g_per_s: dimensionless, stage3_g_per_s: dimensionless, stage_volume_m3: L^3, water_temp_c: dimensionless, total_detention_min: T } out: { stage1_power_w: M L^2 T^-3, stage2_power_w: M L^2 T^-3, stage3_power_w: M L^2 T^-3, total_power_w: M L^2 T^-3, mean_g: dimensionless, gt_value: dimensionless }
export function computeTaperedFlocculationG({ stage1_g_per_s = 0, stage2_g_per_s = 0, stage3_g_per_s = 0, stage_volume_m3 = 0, water_temp_c = 15, total_detention_min = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const g1 = Number(stage1_g_per_s) || 0;
  const g2 = Number(stage2_g_per_s) || 0;
  const g3 = Number(stage3_g_per_s) || 0;
  const V = Number(stage_volume_m3) || 0;
  const t = Number(water_temp_c);
  const tmin = Number(total_detention_min) || 0;
  if (!(g1 > 0)) return { error: "Stage 1 G must be positive (per second)." };
  if (!(g2 > 0)) return { error: "Stage 2 G must be positive (per second)." };
  if (g3 < 0) return { error: "Stage 3 G cannot be negative (enter 0 for a 2-stage train)." };
  if (!(V > 0)) return { error: "Stage volume must be positive (m^3)." };
  if (!Number.isFinite(t) || t < 0 || t > 40) return { error: "Water temperature must be between 0 and 40 C (viscosity-table range)." };
  if (!(tmin > 0)) return { error: "Total detention time must be positive (min)." };
  const mu = _waterViscosity(t);
  const stage1_power_w = g1 * g1 * mu * V;
  const stage2_power_w = g2 * g2 * mu * V;
  const stage3_power_w = g3 > 0 ? g3 * g3 * mu * V : 0;
  const total_power_w = stage1_power_w + stage2_power_w + stage3_power_w;
  const gs = g3 > 0 ? [g1, g2, g3] : [g1, g2];
  const mean_g = gs.reduce((a, b) => a + b, 0) / gs.length;
  const gt_value = mean_g * (tmin * 60);
  const tapered = g3 > 0 ? (g1 > g2 && g2 > g3) : (g1 > g2);
  const in_band = gs.every((g) => g >= 10 && g <= 100);
  return {
    stage1_power_w, stage2_power_w, stage3_power_w, total_power_w, mean_g, gt_value, tapered, in_band, stages: gs.length,
    note: (tapered ? "" : "Not tapered - a tapered schedule decreases G stage to stage (vigorous first stage builds floc, gentle last stage grows it without shear). ")
      + (in_band ? "" : "A stage G is outside the 10-100 per-second flocculation band (rapid mix G 500-1,000 belongs in a separate basin - merging it shears the floc). ")
      + "Each stage's power is P = G^2 x mu(T) x V; cold water is more viscous, so the same G costs more power in winter. Gt characterizes the whole train (10^4-10^5 typical). The treatment-process design governs.",
  };
}
export const taperedFlocculationGExample = { inputs: { stage1_g_per_s: 50, stage2_g_per_s: 30, stage3_g_per_s: 20, stage_volume_m3: 100, water_temp_c: 15, total_detention_min: 30 } };
const renderTaperedFlocculationG = _rPool({
  citation: "Citation: Camp-Stein velocity gradient, tapered multi-stage schedule (Camp & Stein; Ten States Standards), by name. P_stage = G_stage^2 x mu(T) x V_stage; Gt = mean(G) x total_time; mu is water dynamic viscosity at the given temperature. A tapered schedule decreases G stage to stage (each in the 10-70/s flocculation band); the vigorous first stage builds floc and the gentle last stage grows it without shear. Cold water is more viscous, so the same G costs more power in winter. The treatment-process design governs.",
  example: { stage1_g_per_s: 50, stage2_g_per_s: 30, stage3_g_per_s: 20, stage_volume_gal: 26417, water_temp_f: 59, total_detention_min: 30 },
  fields: [
    { key: "stage1_g_per_s", label: "Stage 1 target G (per s, highest)", kind: "number" },
    { key: "stage2_g_per_s", label: "Stage 2 target G (per s)", kind: "number" },
    { key: "stage3_g_per_s", label: "Stage 3 target G (per s, 0 for 2-stage)", kind: "number", default: 0 },
    { key: "stage_volume_gal", label: "Each stage volume (gal)", kind: "number" },
    { key: "water_temp_f", label: "Water temperature (F)", kind: "number", default: 59 },
    { key: "total_detention_min", label: "Total detention time (min)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "tfg-out-p", label: "Power per stage", value: (r) => fmt(r.stage1_power_w, 1) + " / " + fmt(r.stage2_power_w, 1) + (r.stages === 3 ? " / " + fmt(r.stage3_power_w, 1) : "") + " W" },
    { key: "t", id: "tfg-out-t", label: "Total mixing power", value: (r) => fmt(r.total_power_w, 1) + " W" + (r.tapered ? " (tapered)" : " - NOT tapered") },
    { key: "g", id: "tfg-out-g", label: "Mean G / composite Gt", value: (r) => fmt(r.mean_g, 1) + " per s, Gt " + fmt(r.gt_value, 0) },
    { key: "n", id: "tfg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: (inp = {}) => {
    const gal = Number(inp.stage_volume_gal) || 0;
    const tF = Number(inp.water_temp_f);
    if (!(gal > 0 && Number.isFinite(gal))) return { error: "Stage volume must be positive (gal)." };
    if (!Number.isFinite(tF) || tF < 32 || tF > 104) return { error: "Water temperature must be between 32 and 104 F (the 0-40 C viscosity-table range)." };
    return computeTaperedFlocculationG({
      stage1_g_per_s: inp.stage1_g_per_s, stage2_g_per_s: inp.stage2_g_per_s, stage3_g_per_s: inp.stage3_g_per_s,
      stage_volume_m3: gal * _FGV_M3_PER_GAL, water_temp_c: (tF - 32) * 5 / 9, total_detention_min: inp.total_detention_min,
    });
  },
});
TREATMENT_RENDERERS["tapered-flocculation-g"] = renderTaperedFlocculationG;

// --- spec-v613 M: Paddle flocculator power from geometry (Camp drag) ---
// v_tip = 2*pi*r*rpm/60. v_rel = v_tip*(1-k). P = 0.5*Cd*1.937*A*v_rel^3 (ft-lb/s), *1.35582 W, /550 hp.
// dims: in { paddle_radius_ft: L, wheel_rpm: dimensionless, paddle_area_ft2: L^2, drag_coeff: dimensionless, slip_factor: dimensionless } out: { v_tip_fps: dimensionless, v_rel_fps: dimensionless, power_ftlbs: dimensionless, power_w: dimensionless, power_hp: dimensionless }
export function computeFlocculatorPaddlePower({ paddle_radius_ft = 0, wheel_rpm = 0, paddle_area_ft2 = 0, drag_coeff = 1.8, slip_factor = 0.25 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const r = Number(paddle_radius_ft) || 0;
  const n = Number(wheel_rpm) || 0;
  const a = Number(paddle_area_ft2) || 0;
  const cd = Number(drag_coeff) || 0;
  const k = Number(slip_factor);
  if (!(r > 0)) return { error: "Paddle radius must be positive (ft)." };
  if (!(n > 0)) return { error: "Wheel speed must be positive (rpm)." };
  if (!(a > 0)) return { error: "Paddle area must be positive (ft^2)." };
  if (!(cd > 0)) return { error: "Drag coefficient must be positive." };
  if (!Number.isFinite(k) || k < 0 || k >= 1) return { error: "Slip factor must be at least 0 and less than 1." };
  const v_tip_fps = 2 * Math.PI * r * n / 60;
  const v_rel_fps = v_tip_fps * (1 - k);
  const power_ftlbs = 0.5 * cd * 1.937 * a * Math.pow(v_rel_fps, 3);
  const power_w = power_ftlbs * 1.35582;
  const power_hp = power_ftlbs / 550;
  return {
    v_tip_fps, v_rel_fps, power_ftlbs, power_w, power_hp,
    note: "The power goes as the CUBE of the relative velocity, so a small speed change swings it hard. The water slips (it rotates with the paddles) so the relative velocity is only (1 - k) of the tip speed - ignoring the slip roughly doubles the power. The drag coefficient (about 1.8, 1.0 to 1.8 reported) and the slip factor (about 0.25, 0.25 to 0.40 reported) are user inputs because the references disagree; the drag physics is exact once they are chosen. This power feeds flocculation-g-value for the mixing gradient. The flocculator design and the operator govern - a design aid, not a metered power.",
  };
}
export const flocculatorPaddlePowerExample = { inputs: { paddle_radius_ft: 6, wheel_rpm: 3, paddle_area_ft2: 40, drag_coeff: 1.8, slip_factor: 0.25 } };
function renderFlocculatorPaddlePower(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Camp paddle flocculator power (water-treatment design practice), by name. v_tip = 2 x pi x radius x rpm / 60; v_rel = v_tip x (1 - k); P = 0.5 x Cd x 1.937 x area x v_rel^3 (ft-lb/s, x 1.35582 for W, / 550 for hp). The power goes as the cube of the relative velocity; the water slips (rotates with the paddles) so v_rel is only (1 - k) of the tip speed - ignoring the slip roughly doubles the power. Cd (about 1.8, 1.0 to 1.8 reported) and k (about 0.25, 0.25 to 0.40 reported) are user inputs because references disagree. This power feeds flocculation-g-value.";
  const r = makeNumber("Paddle radius to blade centroid (ft)", "fpp-r", { step: "any", min: "0", value: "6" }); r.input.value = "6";
  const n = makeNumber("Wheel speed (rpm)", "fpp-n", { step: "any", min: "0", value: "3" }); n.input.value = "3";
  const a = makeNumber("Total paddle-blade area (ft^2)", "fpp-a", { step: "any", min: "0", value: "40" }); a.input.value = "40";
  const cd = makeNumber("Drag coefficient Cd (about 1.8)", "fpp-cd", { step: "any", min: "0", value: "1.8" }); cd.input.value = "1.8";
  const k = makeNumber("Slip factor k (about 0.25)", "fpp-k", { step: "any", min: "0", max: "1", value: "0.25" }); k.input.value = "0.25";
  for (const f of [r, n, a, cd, k]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { r.input.value = "6"; n.input.value = "3"; a.input.value = "40"; cd.input.value = "1.8"; k.input.value = "0.25"; update(); });
  const oPower = makeOutputLine(outputRegion, "Power into the basin", "fpp-out-power");
  const oVel = makeOutputLine(outputRegion, "Tip / relative velocity", "fpp-out-vel");
  const oNote = makeOutputLine(outputRegion, "Note", "fpp-out-note");
  function readNum(x) { if (x.value === "") return 0; const v = Number(x.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const res = computeFlocculatorPaddlePower({ paddle_radius_ft: readNum(r.input), wheel_rpm: readNum(n.input), paddle_area_ft2: readNum(a.input), drag_coeff: cd.input.value === "" ? 1.8 : readNum(cd.input), slip_factor: k.input.value === "" ? 0.25 : readNum(k.input) });
    if (res.error) { oPower.textContent = res.error; oVel.textContent = "-"; oNote.textContent = ""; return; }
    oPower.textContent = fmt(res.power_w, 0) + " W (" + fmt(res.power_hp, 2) + " hp, " + fmt(res.power_ftlbs, 0) + " ft-lb/s)";
    oVel.textContent = fmt(res.v_tip_fps, 2) + " / " + fmt(res.v_rel_fps, 2) + " ft/s";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [r, n, a, cd, k]) f.input.addEventListener("input", update);
}
TREATMENT_RENDERERS["flocculator-paddle-power"] = renderFlocculatorPaddlePower;

// --- spec-v576 M: Gas chlorine cylinder withdrawal rate ---
// per_container = base(type) x temp-derate. containers = ceil(feed / per). Frost warn if cold or near ceiling.
const _CL_WITHDRAWAL_BASE = { cylinder: 40, ton: 400 }; // lb/day at ~70 F
// dims: in { feed_rate_lb_day: M T^-1, container_type: dimensionless, room_temp_f: dimensionless } out: { per_container_lb_day: M T^-1, containers: dimensionless }
export function computeChlorineCylinderWithdrawal({ feed_rate_lb_day = 0, container_type = "cylinder", room_temp_f = 70 } = {}) {
  const feed = Number(feed_rate_lb_day) || 0;
  const temp = Number(room_temp_f);
  if (!(feed > 0 && Number.isFinite(feed))) return { error: "Feed rate must be positive (lb/day)." };
  const base = _CL_WITHDRAWAL_BASE[container_type];
  if (base === undefined) return { error: "Container type must be cylinder (150 lb) or ton." };
  if (!Number.isFinite(temp) || temp <= -20) return { error: "Room temperature is too low for liquid chlorine to vaporize (well below the practical limit)." };
  const derate = Math.min(1, Math.max(0, (temp + 29) / 99)); // linear from the -29 F boiling point to the 70 F reference
  const per_container_lb_day = base * derate;
  if (!(per_container_lb_day > 0)) return { error: "The derated withdrawal ceiling is zero at this temperature - warm the room or use an evaporator." };
  const containers = Math.ceil(feed / per_container_lb_day);
  const per_container_draw = feed / containers;
  const frost_warn = temp < 60 || per_container_draw >= 0.9 * per_container_lb_day;
  return {
    per_container_lb_day, containers, per_container_draw, frost_warn, derate,
    note: "The withdrawal rate is a temperature-dependent ceiling, not a valve setting - pulling gas faster than the liquid re-vaporizes frosts the container and the rate collapses (the latent-heat limit). About 40 lb/day for a 150-lb cylinder and 400 lb/day for a 1-ton container at ~70 F, derated in a colder room. Exceeding it forces a multi-container manifold or an evaporator, never a bigger regulator. The Chlorine Institute guidance and the manufacturer chart govern.",
  };
}
export const chlorineCylinderWithdrawalExample = { inputs: { feed_rate_lb_day: 100, container_type: "cylinder", room_temp_f: 70 } };
function renderChlorineCylinderWithdrawal(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gas chlorine container withdrawal rate (The Chlorine Institute; state operator training), by name. Per-container ceiling ~40 lb/day (150-lb cylinder) or ~400 lb/day (1-ton) at ~70 F, derated in a colder room; containers = ceil(feed / per-container). The withdrawal rate is a temperature-dependent latent-heat ceiling - pulling too fast frosts the container. Exceeding it forces a manifold or evaporator. The Chlorine Institute guidance and the manufacturer chart govern.";
  const feed = makeNumber("Required chlorine feed (lb/day)", "ccw-feed", { step: "any", min: "0", value: "100" }); feed.input.value = "100";
  const type = makeSelect("Container type", "ccw-type", [
    { value: "cylinder", label: "150-lb cylinder (~40 lb/day)", selected: true },
    { value: "ton", label: "1-ton container (~400 lb/day)" },
  ]);
  const temp = makeNumber("Chlorine room temperature (F)", "ccw-temp", { step: "any", value: "70" }); temp.input.value = "70";
  for (const f of [feed, type, temp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { feed.input.value = "100"; type.select.value = "cylinder"; temp.input.value = "70"; update(); });
  const oPer = makeOutputLine(outputRegion, "Per-container ceiling", "ccw-out-per");
  const oCont = makeOutputLine(outputRegion, "Containers to manifold", "ccw-out-cont");
  const oWarn = makeOutputLine(outputRegion, "Frost / temperature", "ccw-out-warn");
  const oNote = makeOutputLine(outputRegion, "Note", "ccw-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeChlorineCylinderWithdrawal({ feed_rate_lb_day: readNum(feed.input), container_type: type.select.value, room_temp_f: temp.input.value === "" ? 70 : readNum(temp.input) });
    if (r.error) { oPer.textContent = r.error; oCont.textContent = "-"; oWarn.textContent = "-"; oNote.textContent = ""; return; }
    oPer.textContent = fmt(r.per_container_lb_day, 0) + " lb/day" + (r.derate < 0.999 ? " (derated " + fmt(r.derate * 100, 0) + "% for the room temp)" : "");
    oCont.textContent = r.containers + " (each draws " + fmt(r.per_container_draw, 0) + " lb/day)";
    oWarn.textContent = r.frost_warn ? "FROST RISK - cold room or near the ceiling; add a container or an evaporator" : "OK - within the ceiling with margin";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [feed, temp]) f.input.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
TREATMENT_RENDERERS["chlorine-cylinder-withdrawal"] = renderChlorineCylinderWithdrawal;
