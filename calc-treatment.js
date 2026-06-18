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
  const temp = makeNumber("Water temperature", "lsi-temp", { step: "any", value: "25" }); temp.input.value = "25";
  const unit = makeSelect("Temp unit", "lsi-unit", [{ value: "C", label: "Celsius", selected: true }, { value: "F", label: "Fahrenheit" }]);
  const ca = makeNumber("Calcium hardness (mg/L CaCO3)", "lsi-ca", { step: "any", min: "0", value: "200" }); ca.input.value = "200";
  const alk = makeNumber("Total alkalinity (mg/L CaCO3)", "lsi-alk", { step: "any", min: "0", value: "150" }); alk.input.value = "150";
  const tds = makeNumber("TDS (mg/L)", "lsi-tds", { step: "any", min: "0", value: "320" }); tds.input.value = "320";
  for (const f of [ph, temp, unit, ca, alk, tds]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ph.input.value = "7.5"; temp.input.value = "25"; unit.select.value = "C"; ca.input.value = "200"; alk.input.value = "150"; tds.input.value = "320"; update(); });
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
      const field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
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
