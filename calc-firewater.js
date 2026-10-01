// Group F: Fire-ground water-supply operations calculators.
//
// Split intact from calc-fire.js by spec-v1867. Calculator IDs, formulas,
// fields, outputs, citations, examples, and Group F assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeOutputLine, attachExampleButton, fmt,
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

export const FIREWATER_RENDERERS = {};

// ===================== spec-v389: hydrant rated flow at 20 psi (water-system hydraulics trio) =====================

// dims: in { static_psi: M L^-1 T^-2, residual_psi: M L^-1 T^-2, qf_gpm: L^3 T^-1 } out: { hf_psi: M L^-1 T^-2, hr_psi: M L^-1 T^-2, qr_gpm: L^3 T^-1 }
export function computeHydrantAvailableFlow({ static_psi = 0, residual_psi = 0, qf_gpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const s = Number(static_psi) || 0;
  const res = Number(residual_psi) || 0;
  const qf = Number(qf_gpm) || 0;
  if (!(qf > 0)) return { error: "Test flow QF must be positive (gpm)." };
  if (!(s > 20)) return { error: "Static pressure must be above 20 psi (the rated residual)." };
  if (!(res < s)) return { error: "Residual pressure must be below the static pressure (a flow must drop it)." };
  if (!(res >= 0)) return { error: "Residual pressure must be non-negative (psi)." };
  const hf_psi = s - res;
  const hr_psi = s - 20;
  const qr_gpm = qf * Math.pow(hr_psi / hf_psi, 0.54);
  const cls = qr_gpm >= 1500 ? "AA (light blue)" : qr_gpm >= 1000 ? "A (green)" : qr_gpm >= 500 ? "B (orange)" : "C (red)";
  return {
    hf_psi, hr_psi, qr_gpm, hydrant_class: cls,
    note: "NFPA 291 hydrant rated capacity at 20 psi residual: QR = QF x (hr/hf)^0.54, where hf is the test pressure drop (static minus residual at the measured flow QF) and hr is the drop from static to the 20 psi rated residual. The 0.54 exponent is the standard hydraulic fit. The color class (AA >= 1500, A >= 1000, B >= 500, C < 500 gpm) is the NFPA 291 marking. A field/planning estimate at one location and time; the water authority's flow data govern.",
  };
}
export const hydrantAvailableFlowExample = { inputs: { static_psi: 70, residual_psi: 50, qf_gpm: 1000 } };
function renderHydrantAvailableFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NFPA 291 (Fire Flow Testing and Marking of Hydrants) -- rated flow at 20 psi QR = QF x (hr/hf)^0.54 with hf = static - residual and hr = static - 20, and the AA/A/B/C color classes (>= 1500 / 1000 / 500 / < 500 gpm). A field estimate at one location and time; the water authority's flow data govern.";
  const s = makeNumber("Static pressure (psi)", "haf-s", { step: "any", min: "0" });
  const res = makeNumber("Residual pressure while flowing (psi)", "haf-r", { step: "any", min: "0" });
  const qf = makeNumber("Test flow QF (gpm)", "haf-q", { step: "any", min: "0" });
  for (const f of [s, res, qf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { s.input.value = "70"; res.input.value = "50"; qf.input.value = "1000"; update(); });
  const oQ = makeOutputLine(outputRegion, "Rated flow at 20 psi", "haf-out-q");
  const oC = makeOutputLine(outputRegion, "Hydrant class", "haf-out-c");
  const oN = makeOutputLine(outputRegion, "Note", "haf-out-n");
  const update = debounce(() => {
    const r = computeHydrantAvailableFlow({ static_psi: Number(s.input.value) || 0, residual_psi: Number(res.input.value) || 0, qf_gpm: Number(qf.input.value) || 0 });
    if (r.error) { oQ.textContent = r.error; oC.textContent = "-"; oN.textContent = ""; return; }
    oQ.textContent = fmt(r.qr_gpm, 0) + " gpm (test drop " + fmt(r.hf_psi, 0) + " psi; " + fmt(r.hr_psi, 0) + " psi drop to the 20 psi rated residual)";
    oC.textContent = "Class " + r.hydrant_class;
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [s, res, qf]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["hydrant-available-flow"] = renderHydrantAvailableFlow;

// --- spec-v577 F: National Fire Academy quick fire-flow ---
// base = (L*W/3)*(pct/100)*floors. exposure = 0.25*base*exposures. valid: pct<=50 and base<=1000.
// dims: in { length_ft: L, width_ft: L, percent_involved: dimensionless, floors_involved: dimensionless, exposures: dimensionless } out: { base_gpm: L^3 T^-1, exposure_gpm: L^3 T^-1, total_gpm: L^3 T^-1 }
export function computeNfaFiregroundFlow({ length_ft = 0, width_ft = 0, percent_involved = 0, floors_involved = 1, exposures = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const pct = Number(percent_involved) || 0;
  const floors = Number(floors_involved) || 0;
  const exp = Number(exposures) || 0;
  if (!(L > 0)) return { error: "Length must be positive (ft)." };
  if (!(W > 0)) return { error: "Width must be positive (ft)." };
  if (!(pct > 0 && pct <= 100)) return { error: "Percent involved must be over 0 and at most 100." };
  if (!(floors >= 1)) return { error: "Floors involved must be at least 1." };
  if (exp < 0) return { error: "Exposures cannot be negative." };
  const base_gpm = (L * W / 3) * (pct / 100) * floors;
  const exposure_gpm = 0.25 * base_gpm * exp;
  const total_gpm = base_gpm + exposure_gpm;
  const valid = pct <= 50 && base_gpm <= 1000;
  return {
    base_gpm, exposure_gpm, total_gpm, valid,
    note: "The NFA fireground formula is validated only for interior/offensive attack up to about 50% involvement and roughly 1,000 gpm - beyond that it under-predicts badly and the fight is defensive, where the ISO / required-fire-flow method belongs. It is a mental scene-size-up tool, not a water-supply design. Incident command governs.",
  };
}
export const nfaFiregroundFlowExample = { inputs: { length_ft: 40, width_ft: 60, percent_involved: 50, floors_involved: 1, exposures: 2 } };
function renderNfaFiregroundFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A size-up aid, not a water-supply design; incident command governs. Citation: National Fire Academy fireground fire-flow quick-calc (NFA; IFSTA), by name. base = (L x W / 3) x (percent/100) x floors; exposures add 0.25 x base each; total = base + exposures. Validated only for interior/offensive attack up to ~50% involvement and ~1,000 gpm - beyond that use the ISO / required-fire-flow method.";
  const L = makeNumber("Building length (ft)", "nfa-l", { step: "any", min: "0" });
  const W = makeNumber("Building width (ft)", "nfa-w", { step: "any", min: "0" });
  const pct = makeNumber("Percent involved (%)", "nfa-pct", { step: "any", min: "0", max: "100" });
  const floors = makeNumber("Involved floors", "nfa-floors", { step: "1", min: "1" });
  const exp = makeNumber("Exposures to protect", "nfa-exp", { step: "1", min: "0" });
  for (const f of [L, W, pct, floors, exp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "40"; W.input.value = "60"; pct.input.value = "50"; floors.input.value = "1"; exp.input.value = "2"; update(); });
  const oBase = makeOutputLine(outputRegion, "Base fire flow", "nfa-out-base");
  const oExp = makeOutputLine(outputRegion, "Exposure addition / total", "nfa-out-exp");
  const oValid = makeOutputLine(outputRegion, "Within the NFA valid range?", "nfa-out-valid");
  const oNote = makeOutputLine(outputRegion, "Note", "nfa-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeNfaFiregroundFlow({ length_ft: readNum(L.input), width_ft: readNum(W.input), percent_involved: readNum(pct.input), floors_involved: floors.input.value === "" ? 1 : readNum(floors.input), exposures: readNum(exp.input) });
    if (r.error) { oBase.textContent = r.error; oExp.textContent = "-"; oValid.textContent = "-"; oNote.textContent = ""; return; }
    oBase.textContent = fmt(r.base_gpm, 0) + " gpm";
    oExp.textContent = "+" + fmt(r.exposure_gpm, 0) + " gpm exposures -> " + fmt(r.total_gpm, 0) + " gpm total";
    oValid.textContent = r.valid ? "YES - offensive attack within the formula's range" : "NO - over ~50% involved or ~1,000 gpm; go defensive, use ISO / required-fire-flow";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [L, W, pct, floors, exp]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["nfa-fireground-flow"] = renderNfaFiregroundFlow;

// --- spec-v601 F: Iowa rate-of-flow (Royer-Nelson volume method) ---
// volume = L*W*H. total_gal = V/200. rate_gpm = V/100 (that water in the 30-second burst).
// dims: in { length_ft: L, width_ft: L, height_ft: L } out: { volume_ft3: L^3, total_gal: L^3, rate_gpm: L^3 T^-1 }
export function computeIowaRateOfFlow({ length_ft = 0, width_ft = 0, height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const H = Number(height_ft) || 0;
  if (!(L > 0)) return { error: "Length must be positive (ft)." };
  if (!(W > 0)) return { error: "Width must be positive (ft)." };
  if (!(H > 0)) return { error: "Height must be positive (ft)." };
  const volume_ft3 = L * W * H;
  const total_gal = volume_ft3 / 200;
  const rate_gpm = volume_ft3 / 100;
  return {
    volume_ft3, total_gal, rate_gpm,
    note: "The Iowa rate-of-flow is a 30-second confined-compartment knockdown burst for a single open area - not a sustained supply, which the NFA (nfa-fireground-flow) and ISO / required-fire-flow methods size, and which run much higher for the same footprint. It assumes fog application filling the space and a single undivided volume; the 200-cubic-feet-per-gallon steam basis carries the built-in margin. Incident command governs - a fire-behavior teaching and size-up aid, not a water-supply design.",
  };
}
export const iowaRateOfFlowExample = { inputs: { length_ft: 20, width_ft: 30, height_ft: 10 } };
function renderIowaRateOfFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A fire-behavior teaching and size-up aid, not a water-supply design; incident command governs. Citation: Iowa rate-of-flow formula (Royer-Nelson / Iowa State fire behavior), by name. volume_ft3 = length x width x height; total_gal = volume_ft3 / 200 (one gallon controls ~200 ft^3 of compartment); rate_gpm = volume_ft3 / 100 (that water applied in the 30-second knockdown burst). This is a confined-compartment interior burst for a single open area, not the sustained flow the NFA and ISO methods size.";
  const L = makeNumber("Compartment length (ft)", "iowa-l", { step: "any", min: "0" });
  const W = makeNumber("Compartment width (ft)", "iowa-w", { step: "any", min: "0" });
  const H = makeNumber("Compartment height / ceiling (ft)", "iowa-h", { step: "any", min: "0" });
  for (const f of [L, W, H]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "20"; W.input.value = "30"; H.input.value = "10"; update(); });
  const oVol = makeOutputLine(outputRegion, "Compartment volume", "iowa-out-vol");
  const oGal = makeOutputLine(outputRegion, "Water to control (total)", "iowa-out-gal");
  const oRate = makeOutputLine(outputRegion, "Rate of flow (30-second knockdown)", "iowa-out-rate");
  const oNote = makeOutputLine(outputRegion, "Note", "iowa-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeIowaRateOfFlow({ length_ft: readNum(L.input), width_ft: readNum(W.input), height_ft: readNum(H.input) });
    if (r.error) { oVol.textContent = r.error; oGal.textContent = "-"; oRate.textContent = "-"; oNote.textContent = ""; return; }
    oVol.textContent = fmt(r.volume_ft3, 0) + " ft^3";
    oGal.textContent = fmt(r.total_gal, 0) + " gal";
    oRate.textContent = fmt(r.rate_gpm, 0) + " gpm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [L, W, H]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["iowa-rate-of-flow"] = renderIowaRateOfFlow;

// --- spec-v578 F: Relay pumping max distance ---
// budget = max_discharge - intake_residual - 0.434*elevation. FL_per_100 = C*(Q/100)^2. max_distance = budget/FL_per_100*100.
// dims: in { target_flow_gpm: L^3 T^-1, hose_coefficient: dimensionless, max_discharge_psi: M L^-1 T^-2, intake_residual_psi: M L^-1 T^-2, elevation_ft: L } out: { budget_psi: M L^-1 T^-2, fl_per_100_psi: M L^-1 T^-2, max_distance_ft: L }
export function computeRelayPumpDistance({ target_flow_gpm = 0, hose_coefficient = 0, max_discharge_psi = 0, intake_residual_psi = 20, elevation_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q = Number(target_flow_gpm) || 0;
  const C = Number(hose_coefficient) || 0;
  const maxD = Number(max_discharge_psi) || 0;
  const intake = Number(intake_residual_psi) || 0;
  const elev = Number(elevation_ft) || 0;
  if (!(Q > 0)) return { error: "Relay flow must be positive (gpm)." };
  if (!(C > 0)) return { error: "Hose coefficient must be positive." };
  if (!(maxD > 0)) return { error: "Max discharge pressure must be positive (psi)." };
  const budget_psi = maxD - intake - 0.434 * elev;
  if (!(budget_psi > 0)) return { error: "No pressure budget: the intake residual and elevation lift already exceed the pump's max discharge." };
  const fl_per_100_psi = C * Math.pow(Q / 100, 2);
  if (!(fl_per_100_psi > 0)) return { error: "Friction loss per 100 ft resolved to zero; check the flow and coefficient." };
  const max_distance_ft = budget_psi / fl_per_100_psi * 100;
  return {
    budget_psi, fl_per_100_psi, max_distance_ft,
    note: "The next pumper needs a 20 psi residual on its intake or it cavitates, so the usable pressure is the max discharge minus 20 minus the lift - not the whole pump. The distance falls with the square of flow (doubling gpm quarters the spacing, which is why big water uses large-diameter hose and more pumpers, not more pressure). The elevation term is 0.434 psi per foot. The SOP and the pump's real capability govern - a planning aid, not incident command.",
  };
}
export const relayPumpDistanceExample = { inputs: { target_flow_gpm: 800, hose_coefficient: 0.08, max_discharge_psi: 200, intake_residual_psi: 20, elevation_ft: 10 } };
function renderRelayPumpDistance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not incident command; the SOP and the pump's real capability govern. Citation: IFSTA Pumping Apparatus Driver/Operator relay pumping maximum distance, by name. budget = max_discharge - intake_residual - 0.434 x elevation; FL_per_100 = C x (Q/100)^2; max_distance = budget / FL_per_100 x 100. The next pumper needs a 20 psi intake residual or it cavitates, so the usable pressure is the max discharge minus 20 minus the lift; distance falls with the square of flow.";
  const Q = makeNumber("Relay flow (gpm)", "relay-q", { step: "any", min: "0" });
  const C = makeNumber("Hose coefficient C (5 in LDH ~ 0.08)", "relay-c", { step: "any", min: "0" });
  const maxD = makeNumber("Pump max discharge (psi)", "relay-maxd", { step: "any", min: "0" });
  const intake = makeNumber("Intake residual to hold (psi)", "relay-intake", { step: "any", min: "0" });
  const elev = makeNumber("Elevation gain (ft, negative = downhill)", "relay-elev", { step: "any" });
  for (const f of [Q, C, maxD, intake, elev]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Q.input.value = "800"; C.input.value = "0.08"; maxD.input.value = "200"; intake.input.value = "20"; elev.input.value = "10"; update(); });
  const oBudget = makeOutputLine(outputRegion, "Pressure budget", "relay-out-budget");
  const oFL = makeOutputLine(outputRegion, "Friction loss per 100 ft", "relay-out-fl");
  const oDist = makeOutputLine(outputRegion, "Maximum pumper spacing", "relay-out-dist");
  const oNote = makeOutputLine(outputRegion, "Note", "relay-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeRelayPumpDistance({ target_flow_gpm: readNum(Q.input), hose_coefficient: readNum(C.input), max_discharge_psi: readNum(maxD.input), intake_residual_psi: intake.input.value === "" ? 20 : readNum(intake.input), elevation_ft: readNum(elev.input) });
    if (r.error) { oBudget.textContent = r.error; oFL.textContent = "-"; oDist.textContent = "-"; oNote.textContent = ""; return; }
    oBudget.textContent = fmt(r.budget_psi, 1) + " psi";
    oFL.textContent = fmt(r.fl_per_100_psi, 1) + " psi per 100 ft";
    oDist.textContent = fmt(r.max_distance_ft, 0) + " ft between pumpers";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [Q, C, maxD, intake, elev]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["relay-pump-distance"] = renderRelayPumpDistance;

// --- spec-v579 F: Drafting maximum lift, altitude-corrected ---
// theoretical = 33.9 - elevation/1000. attainable = factor*theoretical - suction_losses. factor ~2/3.
// dims: in { site_elevation_ft: L, pump_factor: dimensionless, suction_losses_ft: L } out: { theoretical_lift_ft: L, attainable_lift_ft: L }
export function computeDraftLiftMax({ site_elevation_ft = 0, pump_factor = 0.667, suction_losses_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const elev = Number(site_elevation_ft) || 0;
  const factor = Number(pump_factor) || 0;
  const loss = Number(suction_losses_ft) || 0;
  if (elev < 0) return { error: "Site elevation cannot be negative (ft)." };
  if (loss < 0) return { error: "Suction losses cannot be negative (ft)." };
  if (!(factor > 0 && factor <= 1)) return { error: "Pump condition factor must be over 0 and at most 1." };
  const theoretical_lift_ft = 33.9 - elev / 1000;
  const attainable_lift_ft = factor * theoretical_lift_ft - loss;
  return {
    theoretical_lift_ft, attainable_lift_ft,
    note: "A real pump cannot pull a perfect vacuum, so about two-thirds of theoretical is the practical ceiling (about 22.5 ft at sea level), and every 1,000 ft of altitude shaves another foot. Lift is limited by atmospheric pressure pushing water up the suction, not the pump pulling it, so a bigger pump does not help; over the attainable lift you must resite the pump lower. 1 in Hg of vacuum is about 1.13 ft of lift. A planning aid, not incident command.",
  };
}
export const draftLiftMaxExample = { inputs: { site_elevation_ft: 3000, pump_factor: 0.667, suction_losses_ft: 0 } };
function renderDraftLiftMax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not incident command. Citation: IFSTA / NWCG firefighter math altitude-corrected drafting maximum lift, by name. theoretical = 33.9 - elevation / 1000; attainable = factor x theoretical - suction losses (factor about 2/3). 1 in Hg of vacuum is about 1.13 ft of lift. A real pump cannot pull a perfect vacuum, so about two-thirds of theoretical (about 22.5 ft at sea level) is the ceiling, and every 1,000 ft of altitude shaves another foot; lift is set by atmosphere pushing water up the suction, not the pump.";
  const elev = makeNumber("Site elevation (ft above sea level)", "draft-elev", { step: "any", min: "0" });
  const factor = makeNumber("Pump condition factor (0-1, default 0.667)", "draft-factor", { step: "any", min: "0", max: "1" });
  const loss = makeNumber("Strainer / suction losses (ft, 0 if unknown)", "draft-loss", { step: "any", min: "0" });
  for (const f of [elev, factor, loss]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { elev.input.value = "3000"; factor.input.value = "0.667"; loss.input.value = "0"; update(); });
  const oTheo = makeOutputLine(outputRegion, "Theoretical lift", "draft-out-theo");
  const oAtt = makeOutputLine(outputRegion, "Attainable lift", "draft-out-att");
  const oNote = makeOutputLine(outputRegion, "Note", "draft-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeDraftLiftMax({ site_elevation_ft: readNum(elev.input), pump_factor: factor.input.value === "" ? 0.667 : readNum(factor.input), suction_losses_ft: readNum(loss.input) });
    if (r.error) { oTheo.textContent = r.error; oAtt.textContent = "-"; oNote.textContent = ""; return; }
    oTheo.textContent = fmt(r.theoretical_lift_ft, 1) + " ft";
    oAtt.textContent = fmt(r.attainable_lift_ft, 1) + " ft below the pump";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [elev, factor, loss]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["draft-lift-max"] = renderDraftLiftMax;

// --- spec-v597 F: Vacuum gauge to drafting lift readout ---
// suction_head = vacuum_inhg * 1.13. ceiling = 33.9 - elev/1000 (theoretical), factor*that (attainable). margin = attainable - head.
// dims: in { vacuum_inhg: dimensionless, site_elevation_ft: L, pump_factor: dimensionless } out: { suction_head_ft: L, theoretical_ceiling_ft: L, attainable_ceiling_ft: L, margin_ft: L, pct_of_attainable: dimensionless }
export function computeVacuumLiftReading({ vacuum_inhg = 0, site_elevation_ft = 0, pump_factor = 0.667 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vac = Number(vacuum_inhg) || 0;
  const elev = Number(site_elevation_ft) || 0;
  const factor = Number(pump_factor) || 0;
  if (vac < 0) return { error: "Vacuum reading cannot be negative (in Hg)." };
  if (elev < 0) return { error: "Site elevation cannot be negative (ft)." };
  if (!(factor > 0 && factor <= 1)) return { error: "Pump condition factor must be over 0 and at most 1." };
  const suction_head_ft = vac * 1.13;
  const theoretical_ceiling_ft = 33.9 - elev / 1000;
  const attainable_ceiling_ft = factor * theoretical_ceiling_ft;
  const margin_ft = attainable_ceiling_ft - suction_head_ft;
  const pct_of_attainable = attainable_ceiling_ft > 0 ? suction_head_ft / attainable_ceiling_ft * 100 : null;
  const over_ceiling = margin_ft < 0;
  const near_ceiling = !over_ceiling && pct_of_attainable !== null && pct_of_attainable >= 90;
  return {
    suction_head_ft, theoretical_ceiling_ft, attainable_ceiling_ft, margin_ft, pct_of_attainable, over_ceiling, near_ceiling,
    note: "At steady flow the compound gauge reads the lift plus the suction-hose friction, so this is total suction head, not pure lift. A reading approaching the attainable ceiling means the pump is about to lose prime and cavitate - the fix is to resite the pump lower, not to throttle up, because lift is limited by the atmosphere pushing water up the hose (a bigger pump does not raise the ceiling). 1 in Hg is about 1.13 ft. The pump operator and incident command govern - a readout aid, not incident command.",
  };
}
export const vacuumLiftReadingExample = { inputs: { vacuum_inhg: 10, site_elevation_ft: 0, pump_factor: 0.667 } };
function renderVacuumLiftReading(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A readout aid, not incident command; the pump operator and incident command govern. Citation: IFSTA / NWCG fire-pump drafting practice vacuum-to-lift conversion, by name. suction_head_ft = vacuum_inhg x 1.13; theoretical_ceiling = 33.9 - elevation/1000; attainable_ceiling = factor x theoretical (factor about 2/3); margin = attainable - suction_head. At steady flow the compound gauge reads the lift plus the suction-hose friction, so the readout is total suction head; a reading approaching the ceiling means the pump is about to lose prime and cavitate.";
  const vac = makeNumber("Compound (vacuum) gauge reading (in Hg)", "vlr-vac", { step: "any", min: "0" });
  const elev = makeNumber("Draft-site elevation (ft above sea level)", "vlr-elev", { step: "any", min: "0" });
  const factor = makeNumber("Pump condition factor (0-1, default 0.667)", "vlr-factor", { step: "any", min: "0", max: "1" });
  for (const f of [vac, elev, factor]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vac.input.value = "10"; elev.input.value = "0"; factor.input.value = "0.667"; update(); });
  const oHead = makeOutputLine(outputRegion, "Total suction head", "vlr-out-head");
  const oCeil = makeOutputLine(outputRegion, "Attainable ceiling (altitude-corrected)", "vlr-out-ceil");
  const oMargin = makeOutputLine(outputRegion, "Margin to the ceiling", "vlr-out-margin");
  const oNote = makeOutputLine(outputRegion, "Note", "vlr-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVacuumLiftReading({ vacuum_inhg: readNum(vac.input), site_elevation_ft: readNum(elev.input), pump_factor: factor.input.value === "" ? 0.667 : readNum(factor.input) });
    if (r.error) { oHead.textContent = r.error; oCeil.textContent = "-"; oMargin.textContent = "-"; oNote.textContent = ""; return; }
    oHead.textContent = fmt(r.suction_head_ft, 1) + " ft (" + (r.pct_of_attainable !== null ? fmt(r.pct_of_attainable, 0) + "% of ceiling" : "-") + ")";
    oCeil.textContent = fmt(r.attainable_ceiling_ft, 1) + " ft";
    oMargin.textContent = r.over_ceiling ? fmt(-r.margin_ft, 1) + " ft OVER the ceiling - the draft will break; resite the pump lower" : fmt(r.margin_ft, 1) + " ft" + (r.near_ceiling ? " - near the ceiling, watch for cavitation" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vac, elev, factor]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["vacuum-lift-reading"] = renderVacuumLiftReading;

// --- spec-v580 F: Tanker (water shuttle) sustained flow ---
// usable = nominal*fraction. shuttle_flow = usable*tankers/cycle. cycle = fill+dump+2*travel.
// dims: in { nominal_tank_gal: L^3, usable_fraction: dimensionless, tanker_count: dimensionless, cycle_time_min: T } out: { usable_gal: L^3, shuttle_flow_gpm: L^3 T^-1 }
export function computeTankerShuttleFlow({ nominal_tank_gal = 0, usable_fraction = 0.9, tanker_count = 0, cycle_time_min = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const nom = Number(nominal_tank_gal) || 0;
  const frac = Number(usable_fraction) || 0;
  const count = Number(tanker_count) || 0;
  const cycle = Number(cycle_time_min) || 0;
  if (!(nom > 0)) return { error: "Nominal tank volume must be positive (gal)." };
  if (!(frac > 0 && frac <= 1)) return { error: "Usable fraction must be over 0 and at most 1." };
  if (!(count > 0)) return { error: "Tanker count must be positive." };
  if (!(cycle > 0)) return { error: "Cycle time must be positive (min)." };
  const usable_gal = nom * frac;
  const shuttle_flow_gpm = usable_gal * count / cycle;
  return {
    usable_gal, shuttle_flow_gpm,
    note: "The fleet flow is capped by the slowest link - usually the fill or dump site, not the tank size - so an extra tanker adds nothing if the fill pump cannot turn it around. ISO credits only about 90% of nominal tank volume. This is a sustained rate (water-supply-duration handles the drawdown of a fixed on-scene volume). The fill-site pump capacity and the operation govern - a planning aid, not incident command.",
  };
}
export const tankerShuttleFlowExample = { inputs: { nominal_tank_gal: 3000, usable_fraction: 0.9, tanker_count: 3, cycle_time_min: 12 } };
function renderTankerShuttleFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not incident command; the fill-site pump capacity and the operation govern. Citation: ISO PPC hauled-water credit / NFPA 1142 water shuttle, by name. usable = nominal x fraction; shuttle_flow = usable x tankers / cycle (cycle = fill + dump + 2 x travel). ISO credits only about 90% of nominal tank volume, and the fleet flow is capped by the slowest link - usually the fill or dump site, not the tank size.";
  const nom = makeNumber("Nominal tank volume (gal)", "shuttle-nom", { step: "any", min: "0" });
  const frac = makeNumber("Usable fraction (ISO ~0.90)", "shuttle-frac", { step: "any", min: "0", max: "1" });
  const count = makeNumber("Number of tankers", "shuttle-count", { step: "1", min: "0" });
  const cycle = makeNumber("Cycle time (min: fill + dump + round-trip)", "shuttle-cycle", { step: "any", min: "0" });
  for (const f of [nom, frac, count, cycle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { nom.input.value = "3000"; frac.input.value = "0.9"; count.input.value = "3"; cycle.input.value = "12"; update(); });
  const oUse = makeOutputLine(outputRegion, "Usable volume per tanker", "shuttle-out-use");
  const oFlow = makeOutputLine(outputRegion, "Sustained shuttle flow", "shuttle-out-flow");
  const oNote = makeOutputLine(outputRegion, "Note", "shuttle-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTankerShuttleFlow({ nominal_tank_gal: readNum(nom.input), usable_fraction: frac.input.value === "" ? 0.9 : readNum(frac.input), tanker_count: readNum(count.input), cycle_time_min: readNum(cycle.input) });
    if (r.error) { oUse.textContent = r.error; oFlow.textContent = "-"; oNote.textContent = ""; return; }
    oUse.textContent = fmt(r.usable_gal, 0) + " gal";
    oFlow.textContent = fmt(r.shuttle_flow_gpm, 0) + " gpm sustained";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [nom, frac, count, cycle]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["tanker-shuttle-flow"] = renderTankerShuttleFlow;

// --- spec-v599 F: Tanker shuttle cycle time (fill + dump + round-trip travel) ---
// fill = tank/fill_gpm. dump = tank/dump_gpm. travel = 2*dist/speed*60. cycle = fill+dump+travel. single = tank/cycle.
// dims: in { tank_gal: L^3, fill_gpm: L^3 T^-1, dump_gpm: L^3 T^-1, distance_mi: L, speed_mph: L T^-1 } out: { fill_min: T, dump_min: T, travel_min: T, cycle_min: T, single_tanker_gpm: L^3 T^-1 }
export function computeTankerShuttleCycle({ tank_gal = 0, fill_gpm = 0, dump_gpm = 0, distance_mi = 0, speed_mph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tank = Number(tank_gal) || 0;
  const fill = Number(fill_gpm) || 0;
  const dump = Number(dump_gpm) || 0;
  const dist = Number(distance_mi) || 0;
  const speed = Number(speed_mph) || 0;
  if (!(tank > 0)) return { error: "Tank load must be positive (gal)." };
  if (!(fill > 0)) return { error: "Fill rate must be positive (gpm)." };
  if (!(dump > 0)) return { error: "Dump rate must be positive (gpm)." };
  if (!(dist > 0)) return { error: "Haul distance must be positive (mi)." };
  if (!(speed > 0)) return { error: "Road speed must be positive (mph)." };
  const fill_min = tank / fill;
  const dump_min = tank / dump;
  const travel_min = 2 * dist / speed * 60;
  const cycle_min = fill_min + dump_min + travel_min;
  const single_tanker_gpm = tank / cycle_min;
  return {
    fill_min, dump_min, travel_min, cycle_min, single_tanker_gpm,
    note: "The travel is the round trip (both directions) - counting only one way understates the cycle and oversizes the flow. The tank load is the usable water actually moved (ISO credits about 90% of nominal - use that here); the fill and dump rates are the site-limited rates, not the pump nameplate. A single tanker sustains only tank / cycle, so rural supply needs a fleet - feed this cycle to tanker-shuttle-flow for the fleet flow. The fill-site capacity and the operation govern - a planning aid, not incident command.",
  };
}
export const tankerShuttleCycleExample = { inputs: { tank_gal: 3000, fill_gpm: 1000, dump_gpm: 1000, distance_mi: 2, speed_mph: 35 } };
function renderTankerShuttleCycle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not incident command; the fill-site capacity and the operation govern. Citation: IFSTA / NFPA 1142 rural water-supply shuttle cycle time, by name. fill_min = tank_gal / fill_gpm; dump_min = tank_gal / dump_gpm; travel_min = 2 x distance_mi / speed_mph x 60 (round trip); cycle_min = fill + dump + travel; single_tanker_gpm = tank_gal / cycle_min. The travel is the round trip; the tank load is the usable water moved (ISO ~90% of nominal); fill and dump are the site-limited rates. Feed the cycle to tanker-shuttle-flow for the fleet flow.";
  const tank = makeNumber("Usable water per trip (gal)", "tsc-tank", { step: "any", min: "0" });
  const fill = makeNumber("Fill-site rate (gpm)", "tsc-fill", { step: "any", min: "0" });
  const dump = makeNumber("Dump / unload rate (gpm)", "tsc-dump", { step: "any", min: "0" });
  const dist = makeNumber("One-way haul distance (mi)", "tsc-dist", { step: "any", min: "0" });
  const speed = makeNumber("Average road speed (mph)", "tsc-speed", { step: "any", min: "0" });
  for (const f of [tank, fill, dump, dist, speed]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tank.input.value = "3000"; fill.input.value = "1000"; dump.input.value = "1000"; dist.input.value = "2"; speed.input.value = "35"; update(); });
  const oBreak = makeOutputLine(outputRegion, "Fill / dump / travel", "tsc-out-break");
  const oCycle = makeOutputLine(outputRegion, "Round-trip cycle time", "tsc-out-cycle");
  const oSingle = makeOutputLine(outputRegion, "One tanker sustains", "tsc-out-single");
  const oNote = makeOutputLine(outputRegion, "Note", "tsc-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTankerShuttleCycle({ tank_gal: readNum(tank.input), fill_gpm: readNum(fill.input), dump_gpm: readNum(dump.input), distance_mi: readNum(dist.input), speed_mph: readNum(speed.input) });
    if (r.error) { oBreak.textContent = r.error; oCycle.textContent = "-"; oSingle.textContent = "-"; oNote.textContent = ""; return; }
    oBreak.textContent = fmt(r.fill_min, 1) + " / " + fmt(r.dump_min, 1) + " / " + fmt(r.travel_min, 1) + " min";
    oCycle.textContent = fmt(r.cycle_min, 1) + " min";
    oSingle.textContent = fmt(r.single_tanker_gpm, 0) + " gpm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tank, fill, dump, dist, speed]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["tanker-shuttle-cycle"] = renderTankerShuttleCycle;

// --- spec-v605 F: Tanker shuttle fill-site-limited fleet size ---
// bottleneck = max(fill_min, dump_min). fleet_for_max = ceil(cycle/bottleneck). site_flow = tank/bottleneck.
// dims: in { tank_gal: L^3, fill_gpm: L^3 T^-1, dump_gpm: L^3 T^-1, distance_mi: L, speed_mph: L T^-1 } out: { cycle_min: T, bottleneck_min: T, fleet_for_max: dimensionless, site_limited_flow_gpm: L^3 T^-1 }
export function computeTankerFleetSize({ tank_gal = 0, fill_gpm = 0, dump_gpm = 0, distance_mi = 0, speed_mph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tank = Number(tank_gal) || 0;
  const fill = Number(fill_gpm) || 0;
  const dump = Number(dump_gpm) || 0;
  const dist = Number(distance_mi) || 0;
  const speed = Number(speed_mph) || 0;
  if (!(tank > 0)) return { error: "Tank load must be positive (gal)." };
  if (!(fill > 0)) return { error: "Fill rate must be positive (gpm)." };
  if (!(dump > 0)) return { error: "Dump rate must be positive (gpm)." };
  if (!(dist > 0)) return { error: "Haul distance must be positive (mi)." };
  if (!(speed > 0)) return { error: "Road speed must be positive (mph)." };
  const fill_min = tank / fill;
  const dump_min = tank / dump;
  const travel_min = 2 * dist / speed * 60;
  const cycle_min = fill_min + dump_min + travel_min;
  const bottleneck_min = Math.max(fill_min, dump_min);
  const bottleneck_site = fill_min >= dump_min ? "fill" : "dump";
  const fleet_for_max = Math.ceil(cycle_min / bottleneck_min - 1e-9);
  const site_limited_flow_gpm = tank / bottleneck_min;
  return {
    fill_min, dump_min, travel_min, cycle_min, bottleneck_min, bottleneck_site, fleet_for_max, site_limited_flow_gpm,
    note: "The bottleneck is the slower of the two fixed sites (fill or dump); the sustainable flow caps at the tank load over that service time no matter the fleet, so every tanker beyond the solved fleet queues and adds nothing. The fix for more water is a faster bottleneck site, not more trucks. The tank load is the usable water moved (ISO ~90% of nominal). The fill-site capacity and the operation govern - a planning aid, not incident command.",
  };
}
export const tankerFleetSizeExample = { inputs: { tank_gal: 3000, fill_gpm: 1000, dump_gpm: 1000, distance_mi: 2, speed_mph: 35 } };
function renderTankerFleetSize(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not incident command; the fill-site capacity and the operation govern. Citation: IFSTA / NFPA 1142 rural water-supply fill-site-limited fleet size, by name. bottleneck_min = max(tank/fill_gpm, tank/dump_gpm); fleet_for_max = ceil(cycle_min / bottleneck_min); site_limited_flow_gpm = tank / bottleneck_min. The bottleneck is the slower fixed site; the flow caps at the tank load over that service time no matter the fleet, so tankers beyond the solved fleet just queue. The tank load is the usable water moved (ISO ~90% of nominal).";
  const tank = makeNumber("Usable water per trip (gal)", "tfs-tank", { step: "any", min: "0" });
  const fill = makeNumber("Fill-site rate (gpm)", "tfs-fill", { step: "any", min: "0" });
  const dump = makeNumber("Dump / unload rate (gpm)", "tfs-dump", { step: "any", min: "0" });
  const dist = makeNumber("One-way haul distance (mi)", "tfs-dist", { step: "any", min: "0" });
  const speed = makeNumber("Average road speed (mph)", "tfs-speed", { step: "any", min: "0" });
  for (const f of [tank, fill, dump, dist, speed]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tank.input.value = "3000"; fill.input.value = "1000"; dump.input.value = "1000"; dist.input.value = "2"; speed.input.value = "35"; update(); });
  const oFleet = makeOutputLine(outputRegion, "Fleet to reach the ceiling", "tfs-out-fleet");
  const oFlow = makeOutputLine(outputRegion, "Site-limited ceiling flow", "tfs-out-flow");
  const oBottle = makeOutputLine(outputRegion, "Bottleneck", "tfs-out-bottle");
  const oNote = makeOutputLine(outputRegion, "Note", "tfs-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTankerFleetSize({ tank_gal: readNum(tank.input), fill_gpm: readNum(fill.input), dump_gpm: readNum(dump.input), distance_mi: readNum(dist.input), speed_mph: readNum(speed.input) });
    if (r.error) { oFleet.textContent = r.error; oFlow.textContent = "-"; oBottle.textContent = "-"; oNote.textContent = ""; return; }
    oFleet.textContent = r.fleet_for_max + " tankers (a further tanker just queues)";
    oFlow.textContent = fmt(r.site_limited_flow_gpm, 0) + " gpm";
    oBottle.textContent = "the " + r.bottleneck_site + " site (" + fmt(r.bottleneck_min, 1) + " min per tanker)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tank, fill, dump, dist, speed]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["tanker-fleet-size"] = renderTankerFleetSize;

// --- spec-v581 F: In-line foam eductor back-pressure / hose-lay limit ---
// max_bp = 0.65*inlet. FL_per_100 = C*(Q/100)^2. max_length = (max_bp - nozzle - 0.434*elev)/FL_per_100*100 (>=0).
// dims: in { inlet_pressure_psi: M L^-1 T^-2, eductor_flow_gpm: L^3 T^-1, hose_coefficient: dimensionless, nozzle_pressure_psi: M L^-1 T^-2, elevation_ft: L } out: { max_back_pressure_psi: M L^-1 T^-2, fl_per_100_psi: M L^-1 T^-2, max_length_ft: L }
export function computeFoamEductorLimit({ inlet_pressure_psi = 0, eductor_flow_gpm = 0, hose_coefficient = 0, nozzle_pressure_psi = 0, elevation_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const inlet = Number(inlet_pressure_psi) || 0;
  const Q = Number(eductor_flow_gpm) || 0;
  const C = Number(hose_coefficient) || 0;
  const nozzle = Number(nozzle_pressure_psi) || 0;
  const elev = Number(elevation_ft) || 0;
  if (!(inlet > 0)) return { error: "Inlet pressure must be positive (psi)." };
  if (!(Q > 0)) return { error: "Eductor flow must be positive (gpm)." };
  if (!(C > 0)) return { error: "Hose coefficient must be positive." };
  if (nozzle < 0) return { error: "Nozzle pressure cannot be negative (psi)." };
  const max_back_pressure_psi = 0.65 * inlet;
  const fl_per_100_psi = C * Math.pow(Q / 100, 2);
  const friction_budget = max_back_pressure_psi - nozzle - 0.434 * elev;
  const max_length_ft = friction_budget > 0 ? friction_budget / fl_per_100_psi * 100 : 0;
  const proportions = max_length_ft > 0;
  return {
    max_back_pressure_psi, fl_per_100_psi, max_length_ft, proportions,
    note: "If the downstream back-pressure exceeds about 65% of the inlet, the eductor stops drawing foam concentrate entirely - not less, none - while water keeps flowing, so it looks like it is working. A long lay, an elevated nozzle, or a high-pressure automatic nozzle can cross that line. The eductor's rated flow must equal the nozzle's flow. The eductor manufacturer data governs - a planning aid, not incident command.",
  };
}
export const foamEductorLimitExample = { inputs: { inlet_pressure_psi: 200, eductor_flow_gpm: 95, hose_coefficient: 15.5, nozzle_pressure_psi: 100, elevation_ft: 30 } };
function renderFoamEductorLimit(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not incident command; the eductor manufacturer data governs. Citation: IFSTA / eductor manufacturer data (TFT/Elkhart) in-line foam eductor back-pressure limit, by name. max_back_pressure = 0.65 x inlet; FL_per_100 = C x (Q/100)^2; max_length = (max_back_pressure - nozzle - 0.434 x elevation) / FL_per_100 x 100. If the back-pressure exceeds about 65% of inlet the eductor stops drawing foam concentrate entirely (not less, none) while water keeps flowing; the eductor's rated flow must equal the nozzle's flow.";
  const inlet = makeNumber("Eductor inlet pressure (psi, ~200)", "fe-inlet", { step: "any", min: "0" });
  const Q = makeNumber("Rated eductor flow (gpm, = nozzle flow)", "fe-q", { step: "any", min: "0" });
  const C = makeNumber("Downstream hose coefficient C (1.75 in ~ 15.5)", "fe-c", { step: "any", min: "0" });
  const nozzle = makeNumber("Nozzle operating pressure (psi)", "fe-nozzle", { step: "any", min: "0" });
  const elev = makeNumber("Elevation to nozzle (ft, negative = downhill)", "fe-elev", { step: "any" });
  for (const f of [inlet, Q, C, nozzle, elev]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { inlet.input.value = "200"; Q.input.value = "95"; C.input.value = "15.5"; nozzle.input.value = "100"; elev.input.value = "30"; update(); });
  const oBP = makeOutputLine(outputRegion, "Maximum allowable back-pressure", "fe-out-bp");
  const oFL = makeOutputLine(outputRegion, "Downstream friction loss per 100 ft", "fe-out-fl");
  const oLen = makeOutputLine(outputRegion, "Maximum hose length past the eductor", "fe-out-len");
  const oNote = makeOutputLine(outputRegion, "Note", "fe-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeFoamEductorLimit({ inlet_pressure_psi: readNum(inlet.input), eductor_flow_gpm: readNum(Q.input), hose_coefficient: readNum(C.input), nozzle_pressure_psi: readNum(nozzle.input), elevation_ft: readNum(elev.input) });
    if (r.error) { oBP.textContent = r.error; oFL.textContent = "-"; oLen.textContent = "-"; oNote.textContent = ""; return; }
    oBP.textContent = fmt(r.max_back_pressure_psi, 0) + " psi (65% of inlet)";
    oFL.textContent = fmt(r.fl_per_100_psi, 1) + " psi per 100 ft";
    oLen.textContent = r.proportions ? fmt(r.max_length_ft, 0) + " ft before proportioning fails" : "0 ft - nozzle + lift already exceed the 65% ceiling; the eductor will not draw foam";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [inlet, Q, C, nozzle, elev]) f.input.addEventListener("input", update);
}
FIREWATER_RENDERERS["foam-eductor-limit"] = renderFoamEductorLimit;
