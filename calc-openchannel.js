// Group M open-channel measurement calculators split from calc-treatment.js by spec-v1856.
// IDs, compute behavior, examples, citations, and Group M placement are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const _finiteGuardPool = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) return { error: "All numeric inputs must be finite numbers." };
    }
  }
  return null;
};

export const OPENCHANNEL_RENDERERS = {};

// ===========================================================================
// Group M open-channel flow measurement and inverse sizing.
// ===========================================================================

// --- v20 M.1: Weir / flume open-channel flow (`weir-flow`) ---
// 90deg V-notch Q = 2.49*H^2.48; rectangular Francis Q = 3.33*(L-0.2H)*H^1.5
// (contracted) or 3.33*L*H^1.5 (suppressed). 1 cfs = 448.831 GPM.
// dims: in { weir_type: dimensionless, head_ft: L, crest_length_ft: L, coeff: dimensionless } out: { flow_cfs: L^3*T^-1, flow_gpm: L^3 T^-1 }
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
  const gpm = cfs * (60 * 1728 / 231);
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
  const H = makeNumber("Head over crest H (ft)", "wf-h", { step: "any", min: "0" });
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
OPENCHANNEL_RENDERERS["weir-flow"] = renderWeirFlow;

// ===================== spec-v1227: Cipolletti (trapezoidal) weir flow =====================
// The third canonical sharp-crested weir the weir-flow tile (90-deg V-notch + rectangular Francis) leaves
// out. A Cipolletti weir is trapezoidal with 1H:4V side slopes chosen so the slope exactly compensates
// the end-contraction, letting a simple rectangular-form equation use the full crest length: Q = 3.367 L
// H^(3/2) (cfs, L and H in ft). USBR Water Measurement Manual Ch. 7 / King's Handbook of Hydraulics.
// dims: in { crest_length_ft: L, head_ft: L, coeff: dimensionless } out: { flow_cfs: L^3 T^-1, flow_gpm: L^3 T^-1, flow_mgd: L^3 T^-1 }
export function computeCipollettiWeir({ crest_length_ft = 0, head_ft = 0, coeff = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const L = Number(crest_length_ft) || 0;
  const H = Number(head_ft) || 0;
  if (!(L > 0)) return { error: "Crest length must be positive (ft)." };
  if (!(H > 0)) return { error: "Head over crest must be positive (ft)." };
  const C = coeff > 0 ? coeff : 3.367;
  const cfs = C * L * Math.pow(H, 1.5);
  const gpm = cfs * (60 * 1728 / 231);
  const mgd = gpm * 1440 / 1e6;
  if (![cfs, gpm, mgd].every(Number.isFinite)) return { error: "Cipolletti-weir math is not a finite value." };
  return {
    flow_cfs: cfs, flow_gpm: gpm, flow_mgd: mgd,
    low_accuracy: H < 0.2 || H > L,
    note: "The free-flow discharge over a Cipolletti weir, the trapezoidal sharp-crested weir with 1-horizontal-to-4-vertical side slopes: Q = 3.367 x L x H^(3/2) (cfs, crest length L and head H in ft; the coefficient is editable). The Cipolletti is the third standard sharp-crested weir alongside the 90-degree V-notch and the rectangular (Francis) weir the weir-flow tile already covers; its cleverness is that the 4:1 side batter is chosen so the added flow through the sloping ends exactly makes up the loss from end-contraction, so it behaves like a full-width suppressed rectangular weir and uses the full crest length L with no 0.2H contraction deduction. A 3 ft crest at 0.5 ft of head passes 3.57 cfs (1,603 gpm, 2.31 MGD). It is the common field weir for ditches and irrigation turnouts because the rating is simple and the crest length reads straight off the notch. Requires a fully-contracted, ventilated, sharp-crested weir with FREE (non-submerged) flow, the head measured upstream at about 4H back from the crest, and the approach-velocity correction is ignored; a head below about 0.2 ft or greater than the crest length is a low-accuracy reading and flagged. An operations aid; the USBR Water Measurement Manual, the weir's calibration, and the operator of record govern.",
  };
}
export const cipollettiWeirExample = { inputs: { crest_length_ft: 3, head_ft: 0.5, coeff: 0 } };
function renderCipollettiWeir(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cipolletti (trapezoidal, 1H:4V) sharp-crested weir free-flow discharge Q = 3.367 x L x H^(3/2) (cfs, ft), per the USBR Water Measurement Manual (public domain) / King's Handbook of Hydraulics; the 4:1 side slopes compensate end-contraction so the full crest length is used. Requires a ventilated, free-flow, sharp-crested weir; the head is measured about 4H upstream. Free at usbr.gov/tsc/techreferences/mands/wmm.";
  const L = makeNumber("Crest length L (ft)", "cip-l", { step: "any", min: "0" });
  const H = makeNumber("Head over crest H (ft)", "cip-h", { step: "any", min: "0" });
  const coeff = makeNumber("Weir coefficient (0 = default 3.367)", "cip-c", { step: "any", min: "0" });
  for (const f of [L, H, coeff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "3"; H.input.value = "0.5"; coeff.input.value = ""; update(); });
  const oCfs = makeOutputLine(outputRegion, "Flow (cfs)", "cip-out-cfs");
  const oGpm = makeOutputLine(outputRegion, "Flow (GPM / MGD)", "cip-out-gpm");
  const oNote = makeOutputLine(outputRegion, "Note", "cip-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCipollettiWeir({ crest_length_ft: readNum(L.input), head_ft: readNum(H.input), coeff: readNum(coeff.input) });
    if (r.error) { oCfs.textContent = r.error; oGpm.textContent = ""; oNote.textContent = ""; return; }
    oCfs.textContent = fmt(r.flow_cfs, 3) + " cfs" + (r.low_accuracy ? " (head outside ~0.2 ft to L -- low accuracy)" : "");
    oGpm.textContent = fmt(r.flow_gpm, 1) + " GPM (" + fmt(r.flow_mgd, 3) + " MGD)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [L.input, H.input, coeff.input]) f.addEventListener("input", update);
}
OPENCHANNEL_RENDERERS["cipolletti-weir"] = renderCipollettiWeir;

// spec-v1240: sluice-gate (underflow) free-flow discharge -- the third canal-control structure
// alongside the overflow weir and the submerged orifice. Free-flow: Q = Cd b a sqrt(2 g y1),
// with the discharge coefficient Cd = Cc / sqrt(1 + Cc a / y1) from the contraction coefficient
// Cc (~0.61 for a sharp-edged vertical gate). First-principles open-channel hydraulics (Henderson,
// Open Channel Flow) / USBR Water Measurement Manual. g = 32.2 ft/s^2.
// dims: in { gate_opening_ft: L, gate_width_ft: L, upstream_depth_ft: L, contraction_coeff: dimensionless } out: { discharge_coeff: dimensionless, flow_cfs: L^3 T^-1, flow_gpm: L^3 T^-1, flow_mgd: L^3 T^-1 }
export function computeSluiceGateFlow({ gate_opening_ft = 0, gate_width_ft = 0, upstream_depth_ft = 0, contraction_coeff = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const a = Number(gate_opening_ft) || 0;
  const b = Number(gate_width_ft) || 0;
  const y1 = Number(upstream_depth_ft) || 0;
  if (!(a > 0)) return { error: "Gate opening must be positive (ft)." };
  if (!(b > 0)) return { error: "Gate width must be positive (ft)." };
  if (!(y1 > 0)) return { error: "Upstream water depth must be positive (ft)." };
  if (!(a < y1)) return { error: "The gate opening must be less than the upstream depth (an underflow gate); if the opening reaches the water surface it is not a sluice gate." };
  const Cc = contraction_coeff > 0 ? contraction_coeff : 0.61;
  if (!(Cc > 0 && Cc <= 1)) return { error: "Contraction coefficient must be over 0 and up to 1.0 (about 0.61 for a sharp-edged vertical gate)." };
  const g = 32.2; // ft/s^2
  const Cd = Cc / Math.sqrt(1 + Cc * a / y1);
  const cfs = Cd * b * a * Math.sqrt(2 * g * y1);
  const gpm = cfs * (60 * 1728 / 231);
  const mgd = gpm * 1440 / 1e6;
  if (![Cd, cfs, gpm, mgd].every(Number.isFinite)) return { error: "Sluice-gate math is not a finite value." };
  return {
    discharge_coeff: Cd, flow_cfs: cfs, flow_gpm: gpm, flow_mgd: mgd,
    note: "The free-flow discharge under a sluice (underflow) gate, the third canal-control structure alongside the overflow weir (weir-flow, cipolletti-weir) and the submerged orifice (orifice-flow). Water is drawn UNDER a raised gate rather than over a crest: Q = Cd x b x a x sqrt(2 g y1), with a the gate opening, b the gate width, y1 the upstream depth measured from the channel floor, and g = 32.2 ft/s^2. The discharge coefficient Cd = Cc / sqrt(1 + Cc a / y1) comes from the jet contraction downstream of the gate lip (the vena contracta), with the contraction coefficient Cc about 0.61 for a sharp-edged vertical gate; Cd is typically 0.55-0.60. A 1 ft opening on a 5 ft-wide gate under 6 ft of head passes about 57 cfs. This is the FREE-flow rating: the downstream tailwater must be low enough that the contracted jet is not drowned (submerged flow reduces the discharge and needs a separate energy balance). The head is the upstream depth above the floor, not the head on the opening. An operations aid; the USBR Water Measurement Manual, the gate's calibration, and the operator of record govern.",
  };
}
export const sluiceGateFlowExample = { inputs: { gate_opening_ft: 1, gate_width_ft: 5, upstream_depth_ft: 6, contraction_coeff: 0 } };
function renderSluiceGateFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: free-flow sluice (underflow) gate discharge Q = Cd b a sqrt(2 g y1), with Cd = Cc / sqrt(1 + Cc a / y1) and the contraction coefficient Cc ~ 0.61 for a sharp-edged vertical gate (first-principles open-channel hydraulics, Henderson Open Channel Flow / USBR Water Measurement Manual). g = 32.2 ft/s^2; a = gate opening, b = width, y1 = upstream depth above the floor. Free-flow only: the tailwater must not drown the contracted jet. Free at usbr.gov/tsc/techreferences/mands/wmm.";
  const a = makeNumber("Gate opening a (ft)", "slg-a", { step: "any", min: "0" });
  const b = makeNumber("Gate width b (ft)", "slg-b", { step: "any", min: "0" });
  const y1 = makeNumber("Upstream depth y1, above floor (ft)", "slg-y1", { step: "any", min: "0" });
  const cc = makeNumber("Contraction coeff Cc (0 = default 0.61)", "slg-cc", { step: "any", min: "0", max: "1" });
  for (const f of [a, b, y1, cc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "1"; b.input.value = "5"; y1.input.value = "6"; cc.input.value = ""; update(); });
  const oCfs = makeOutputLine(outputRegion, "Flow (cfs)", "slg-out-cfs");
  const oGpm = makeOutputLine(outputRegion, "Flow (GPM / MGD)", "slg-out-gpm");
  const oCd = makeOutputLine(outputRegion, "Discharge coefficient Cd", "slg-out-cd");
  const oNote = makeOutputLine(outputRegion, "Note", "slg-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSluiceGateFlow({ gate_opening_ft: readNum(a.input), gate_width_ft: readNum(b.input), upstream_depth_ft: readNum(y1.input), contraction_coeff: readNum(cc.input) });
    if (r.error) { oCfs.textContent = r.error; oGpm.textContent = ""; oCd.textContent = "-"; oNote.textContent = ""; return; }
    oCfs.textContent = fmt(r.flow_cfs, 2) + " cfs";
    oGpm.textContent = fmt(r.flow_gpm, 0) + " GPM (" + fmt(r.flow_mgd, 2) + " MGD)";
    oCd.textContent = fmt(r.discharge_coeff, 4);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [a.input, b.input, y1.input, cc.input]) f.addEventListener("input", update);
}
OPENCHANNEL_RENDERERS["sluice-gate-flow"] = renderSluiceGateFlow;

// spec-v1241: broad-crested weir free-flow discharge -- the critical-flow weir that completes the
// weir family (the sharp-crested trio V-notch/rectangular/Cipolletti is already covered). At the
// crest the flow passes through critical depth, so Q = Cd (2/3)^1.5 sqrt(g) L H^1.5; the theoretical
// coefficient (2/3)^1.5 sqrt(g) = 3.089 (ft units), well below the 3.33 sharp-crested Francis value,
// and Cd ~ 0.85-0.95 for losses. First-principles critical-flow hydraulics / USBR Water Measurement
// Manual. g = 32.2 ft/s^2.
// dims: in { crest_length_ft: L, head_ft: L, discharge_coeff: dimensionless } out: { effective_coeff: dimensionless, flow_cfs: L^3 T^-1, flow_gpm: L^3 T^-1, flow_mgd: L^3 T^-1 }
export function computeBroadCrestedWeir({ crest_length_ft = 0, head_ft = 0, discharge_coeff = 0 } = {}) {
  const _g = _finiteGuardPool(arguments[0]); if (_g) return _g;
  const L = Number(crest_length_ft) || 0;
  const H = Number(head_ft) || 0;
  if (!(L > 0)) return { error: "Crest length must be positive (ft)." };
  if (!(H > 0)) return { error: "Head over crest must be positive (ft)." };
  const Cd = discharge_coeff > 0 ? discharge_coeff : 0.9;
  if (!(Cd > 0 && Cd <= 1)) return { error: "Discharge coefficient must be over 0 and up to 1.0 (about 0.85-0.95 for a well-rounded broad crest)." };
  const g = 32.2; // ft/s^2
  const K = Math.pow(2 / 3, 1.5) * Math.sqrt(g); // theoretical critical-flow coefficient = 3.0888
  const effective_coeff = Cd * K;
  const cfs = effective_coeff * L * Math.pow(H, 1.5);
  const gpm = cfs * (60 * 1728 / 231);
  const mgd = gpm * 1440 / 1e6;
  if (![effective_coeff, cfs, gpm, mgd].every(Number.isFinite)) return { error: "Broad-crested-weir math is not a finite value." };
  return {
    effective_coeff, flow_cfs: cfs, flow_gpm: gpm, flow_mgd: mgd,
    note: "The free-flow discharge over a broad-crested weir, the critical-flow member that completes the weir family alongside the sharp-crested V-notch, rectangular, and Cipolletti weirs. A broad, level crest long enough (in the flow direction) to force the flow through CRITICAL depth on the crest gives Q = Cd (2/3)^1.5 sqrt(g) L H^1.5, where L is the crest width across the channel, H is the upstream head above the crest, and g = 32.2 ft/s^2. The theoretical coefficient (2/3)^1.5 sqrt(g) = 3.089 is well below the 3.33 of a sharp-crested (Francis) weir -- a broad crest passes less flow at the same head -- and the discharge coefficient Cd (about 0.85-0.95 for a well-rounded upstream nose) trims it further for boundary-layer and approach losses, so the effective coefficient here is about 2.6-2.9. A 10 ft crest at 1 ft of head with Cd 0.90 passes about 27.8 cfs. Broad-crested weirs are the workhorse for spillways, embankment and road-overtopping checks, and long-throated flumes because the rating is stable and the crest tolerates debris and submergence better than a sharp edge. This is the FREE-flow rating (modular flow, critical depth on the crest); heavy downstream submergence reduces it and the approach-velocity head is neglected. An operations aid; the USBR Water Measurement Manual, the weir's calibration, and the operator or engineer of record govern.",
  };
}
export const broadCrestedWeirExample = { inputs: { crest_length_ft: 10, head_ft: 1, discharge_coeff: 0 } };
function renderBroadCrestedWeir(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: broad-crested (critical-flow) weir free-flow discharge Q = Cd (2/3)^1.5 sqrt(g) L H^1.5, theoretical coefficient (2/3)^1.5 sqrt(g) = 3.089 (ft units, below the 3.33 sharp-crested Francis value), Cd ~ 0.85-0.95, per first-principles critical-flow hydraulics and the USBR Water Measurement Manual (public domain). Free-flow (modular) only; the approach-velocity head is neglected. Free at usbr.gov/tsc/techreferences/mands/wmm.";
  const L = makeNumber("Crest length L, across channel (ft)", "bcw-l", { step: "any", min: "0" });
  const H = makeNumber("Head over crest H (ft)", "bcw-h", { step: "any", min: "0" });
  const coeff = makeNumber("Discharge coeff Cd (0 = default 0.90)", "bcw-c", { step: "any", min: "0", max: "1" });
  for (const f of [L, H, coeff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "10"; H.input.value = "1"; coeff.input.value = ""; update(); });
  const oCfs = makeOutputLine(outputRegion, "Flow (cfs)", "bcw-out-cfs");
  const oGpm = makeOutputLine(outputRegion, "Flow (GPM / MGD)", "bcw-out-gpm");
  const oC = makeOutputLine(outputRegion, "Effective coefficient (Cd x 3.089)", "bcw-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "bcw-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBroadCrestedWeir({ crest_length_ft: readNum(L.input), head_ft: readNum(H.input), discharge_coeff: readNum(coeff.input) });
    if (r.error) { oCfs.textContent = r.error; oGpm.textContent = ""; oC.textContent = "-"; oNote.textContent = ""; return; }
    oCfs.textContent = fmt(r.flow_cfs, 2) + " cfs";
    oGpm.textContent = fmt(r.flow_gpm, 0) + " GPM (" + fmt(r.flow_mgd, 2) + " MGD)";
    oC.textContent = fmt(r.effective_coeff, 3) + " (sharp-crested is 3.33)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [L.input, H.input, coeff.input]) f.addEventListener("input", update);
}
OPENCHANNEL_RENDERERS["broad-crested-weir"] = renderBroadCrestedWeir;

// --- spec-v658 M: weir head from a target flow (inverse of weir-flow) ---
// V-notch H = (Q/C)^(1/2.48); rect suppressed H = (Q/(C L))^(2/3); rect
// contracted solves L-0.2H by a few fixed-point passes seeded from suppressed.
// dims: in { weir_type: dimensionless, target_flow_cfs: L^3*T^-1, crest_length_ft: L, coeff: dimensionless } out: { head_ft: L, flow_gpm: L^3 T^-1, flow_mgd: L^3*T^-1 }
export function computeWeirHeadFromFlow({ weir_type = "vnotch90", target_flow_cfs = 0, crest_length_ft = 0, coeff = 0 } = {}) {
  const Q = Number(target_flow_cfs) || 0;
  const L = Number(crest_length_ft) || 0;
  if (!(Q > 0 && Number.isFinite(Q))) return { error: "Target flow must be positive (cfs)." };
  let head_ft;
  if (weir_type === "vnotch90") {
    const C = coeff > 0 ? coeff : 2.49;
    head_ft = Math.pow(Q / C, 1 / 2.48);
  } else {
    if (!(L > 0 && Number.isFinite(L))) return { error: "Crest length must be positive (ft) for a rectangular weir." };
    const C = coeff > 0 ? coeff : 3.33;
    if (weir_type === "rect_suppressed") {
      head_ft = Math.pow(Q / (C * L), 2 / 3);
    } else {
      let H = Math.pow(Q / (C * L), 2 / 3); // suppressed seed
      for (let i = 0; i < 40; i++) {
        const effL = L - 0.2 * H;
        if (effL <= 0) return { error: "Target flow is too large for this crest length (the end contractions close the notch)." };
        const Hn = Math.pow(Q / (C * effL), 2 / 3);
        if (Math.abs(Hn - H) < 1e-12) { H = Hn; break; }
        H = Hn;
      }
      head_ft = H;
    }
  }
  const gpm = Q * (60 * 1728 / 231);
  return {
    head_ft: Number.isFinite(head_ft) ? head_ft : null,
    flow_gpm: gpm, flow_mgd: gpm * 1440 / 1e6, low_accuracy: head_ft < 0.2,
    note: (head_ft < 0.2 ? "Head below ~0.2 ft - low-accuracy reading, flagged. " : "")
      + "The head over a sharp-crested weir needed to pass a target flow, the inverse of the weir-flow tile: 90-degree V-notch H = (Q/C)^(1/2.48) (default C 2.49); suppressed rectangular H = (Q/(C L))^(2/3) (default C 3.33); the contracted rectangular weir's effective crest L - 0.2 H depends on H, so it is solved by a few fixed-point passes seeded from the suppressed form. Useful to size a weir box or set a staff-gauge mark for a design flow. Requires a sharp-crested, ventilated weir (fully contracted, or suppressed for the suppressed option) with free (non-submerged) flow; the approach-velocity correction is ignored. An operations aid; the operator of record and the primacy agency govern compliance.",
  };
}
export const weirHeadFromFlowExample = { inputs: { weir_type: "vnotch90", target_flow_cfs: 0.446, crest_length_ft: 0, coeff: 0 } };
function renderWeirHeadFromFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the USBR Water Measurement Manual (public domain) - the V-notch and Francis rectangular-weir equations solved for the head over the crest, the inverse of the weir-flow tile; the contracted weir is solved by fixed-point iteration. Requires a sharp-crested, ventilated, free-flow weir. Free at usbr.gov/tsc/techreferences/mands/wmm.";
  const type = makeSelect("Weir type", "whf-type", [
    { value: "vnotch90", label: "90-degree V-notch", selected: true },
    { value: "rect_contracted", label: "Rectangular (contracted)" },
    { value: "rect_suppressed", label: "Rectangular (suppressed)" },
  ]);
  const Q = makeNumber("Target flow Q (cfs)", "whf-q", { step: "any", min: "0" });
  const L = makeNumber("Crest length L (ft, rectangular)", "whf-l", { step: "any", min: "0" });
  const coeff = makeNumber("Weir coefficient (0 = default)", "whf-c", { step: "any", min: "0" });
  for (const f of [type, Q, L, coeff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "vnotch90"; Q.input.value = "0.446"; L.input.value = ""; coeff.input.value = ""; update(); });
  const oHead = makeOutputLine(outputRegion, "Required head over crest", "whf-out-head");
  const oFlow = makeOutputLine(outputRegion, "Flow (GPM / MGD)", "whf-out-flow");
  const oNote = makeOutputLine(outputRegion, "Note", "whf-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWeirHeadFromFlow({ weir_type: type.select.value, target_flow_cfs: readNum(Q.input), crest_length_ft: readNum(L.input), coeff: readNum(coeff.input) });
    if (r.error) { oHead.textContent = r.error; oFlow.textContent = ""; oNote.textContent = ""; return; }
    oHead.textContent = fmt(r.head_ft, 3) + " ft";
    oFlow.textContent = fmt(r.flow_gpm, 1) + " GPM (" + fmt(r.flow_mgd, 3) + " MGD)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [type.select, Q.input, L.input, coeff.input]) f.addEventListener("input", update);
}
OPENCHANNEL_RENDERERS["weir-head-from-flow"] = renderWeirHeadFromFlow;
