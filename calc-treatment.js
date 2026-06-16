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
