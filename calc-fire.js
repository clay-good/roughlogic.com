// Group F: Fire-Ground Engineering calculators (51 through 58).
//
// All Group F utilities carry the SOP-and-incident-command notice variant
// (rendered by app.js based on the tool's trade tag).

import { fireHoseFrictionLoss, hydrantFlow } from "./pure-math.js";

// --- Utility 51: Fire Hose Friction Loss ---

// CQ^2L coefficients per hose diameter from National Fire Academy training
// materials (U.S. government, public domain).
export const HOSE_FRICTION_COEFFICIENTS = {
  "1.5_in": 24,
  "1.75_in": 15.5,
  "2.5_in": 2,
  "3_in": 0.677,
  "4_in": 0.2,
  "5_in": 0.08,
};

// dims: in { hose_diameter: dimensionless, gpm: L^3 T^-1, length_ft: L }
//        out: { friction_loss_psi: M L^-1 T^-2, coefficient: dimensionless }
export function computeFireFriction({ hose_diameter, gpm, length_ft }) {
  const C = HOSE_FRICTION_COEFFICIENTS[hose_diameter];
  if (C === undefined) return { error: "Unknown hose diameter." };
  return { friction_loss_psi: fireHoseFrictionLoss({ C, gpm, length_ft }), coefficient: C };
}

export const fireFrictionExample = {
  inputs: { hose_diameter: "2.5_in", gpm: 250, length_ft: 200 },
  expected: { friction_loss_psi: 25 },
};

// --- Utility 52: Pump Discharge Pressure ---

// dims: in { nozzle_pressure_psi: M L^-1 T^-2, friction_loss_psi: M L^-1 T^-2, elevation_ft: L, appliance_loss_psi: M L^-1 T^-2 }
//        out: { pdp_psi: M L^-1 T^-2, elevation_psi: M L^-1 T^-2 }
export function computePDP({ nozzle_pressure_psi, friction_loss_psi, elevation_ft = 0, appliance_loss_psi = 0 }) {
  // DR-08: pressures and losses cannot be negative (elevation may be, for a
  // downhill lay). One validation pass for the unguarded pressure inputs.
  if (!(nozzle_pressure_psi >= 0) || !(friction_loss_psi >= 0) || !(appliance_loss_psi >= 0)) {
    return { error: "Pressures and losses cannot be negative." };
  }
  // Elevation: add 0.5 psi per foot up; subtract per foot down.
  const elevation_psi = elevation_ft * 0.5;
  const pdp = nozzle_pressure_psi + friction_loss_psi + elevation_psi + appliance_loss_psi;
  return { pdp_psi: pdp, elevation_psi };
}

export const pdpExample = {
  inputs: { nozzle_pressure_psi: 100, friction_loss_psi: 25, elevation_ft: 20, appliance_loss_psi: 0 },
  expected: { pdp_psi: 135 },
};

// --- Utility 53: Hydrant Flow ---

// dims: in { pitot_psi: M L^-1 T^-2, outlet_diameter_in: L, c: dimensionless }
//        out: { flow_gpm: L^3 T^-1, coefficient_of_discharge: dimensionless, reaction_lb: M L T^-2 }
export function computeHydrantFlow({ pitot_psi, outlet_diameter_in, c = 0.9 }) {
  // v23 EN.12: smooth-bore outlet reaction NR = 1.57 * d^2 * NP (IFSTA),
  // treating the pitot pressure as the nozzle pressure. Finite-guarded so a
  // perturbed pitot / diameter never leaks a non-finite field.
  let reaction_lb = null;
  const d = Number(outlet_diameter_in), np = Number(pitot_psi);
  if (Number.isFinite(d) && Number.isFinite(np) && d > 0 && np >= 0) {
    const nr = 1.57 * d * d * np;
    if (Number.isFinite(nr)) reaction_lb = nr;
  }
  return { flow_gpm: hydrantFlow({ pitot_psi, outlet_diameter_in, c }), coefficient_of_discharge: c, reaction_lb };
}

export const hydrantFlowExample = {
  inputs: { pitot_psi: 10, outlet_diameter_in: 2.5, c: 0.9 },
  expectedRange: { flow_gpm: { min: 525, max: 535 } },
};

// --- Utility 54: Required Fire Flow (ISO method) ---

// Public ISO Public Protection Classification published formulas.
//   NFF = (C * O * X * P)
// C is the construction-class factor times sqrt(area). For estimation only.

export const ISO_CONSTRUCTION_FACTORS = {
  fire_resistive: 0.6,
  masonry: 0.8,
  ordinary: 1.0,
  wood_frame: 1.5,
};

// dims: in { structure_area_ft2: L^2, construction_class: dimensionless, occupancy_factor: dimensionless, exposure_factor: dimensionless, communication_factor: dimensionless, volume_ft3: L^3 }
//        out: { needed_fire_flow_gpm: L^3 T^-1, base_C_gpm: L^3 T^-1, construction_factor: dimensionless, iowa_rate_gpm: L^3 T^-1, divergence_gpm: L^3 T^-1 }
export function computeRequiredFireFlow({ structure_area_ft2, construction_class = "ordinary", occupancy_factor = 1.0, exposure_factor = 1.0, communication_factor = 1.0, volume_ft3 = 0 }) {
  const F = ISO_CONSTRUCTION_FACTORS[construction_class];
  if (!F) return { error: "Unknown construction class." };
  // DR-05 (RC-1): a negative area yields sqrt(negative) = NaN in the flow.
  // Guard positivity exactly as the sibling computeIsoNeededFireFlow does.
  if (!(structure_area_ft2 > 0)) return { error: "Structure area must be positive." };
  const C = 18 * F * Math.sqrt(structure_area_ft2);
  let NFF = C * occupancy_factor * exposure_factor * communication_factor;
  NFF = Math.round(NFF / 250) * 250; // round to nearest 250 gpm per ISO practice
  // ISO maximum guideline: 12000 gpm.
  NFF = Math.min(NFF, 12000);
  // v23 EN.11: the Iowa State rate-of-flow second method (Q = V / 100, V in
  // ft^3) shown beside the ISO needed-fire-flow with the divergence labeled.
  // Only computed when a structure volume is supplied; default unchanged.
  let iowa_rate_gpm = null, divergence_gpm = null;
  const V = Number(volume_ft3) || 0;
  if (V > 0 && Number.isFinite(V)) {
    iowa_rate_gpm = V / 100;
    divergence_gpm = NFF - iowa_rate_gpm;
    if (!Number.isFinite(iowa_rate_gpm)) { iowa_rate_gpm = null; divergence_gpm = null; }
  }
  return { needed_fire_flow_gpm: NFF, base_C_gpm: Math.round(C), construction_factor: F, iowa_rate_gpm, divergence_gpm };
}

export const requiredFireFlowExample = {
  inputs: { structure_area_ft2: 5000, construction_class: "ordinary", occupancy_factor: 1.0, exposure_factor: 1.0, communication_factor: 1.0 },
};

// --- Utility 55: Master Stream Reach ---

// Reach values are typical published master-stream values. Expressed as a
// function of nozzle pressure (psi) for common nozzle types.
export const MASTER_STREAM_TYPES = {
  smooth_bore_1_75: { typical_pressure_psi: 80, base_reach_ft: 90 },
  smooth_bore_2: { typical_pressure_psi: 80, base_reach_ft: 100 },
  fog_master: { typical_pressure_psi: 100, base_reach_ft: 75 },
};

// dims: in { nozzle_type: dimensionless, nozzle_pressure_psi: M L^-1 T^-2 }
//        out: { typical_reach_ft: L, nozzle_type: dimensionless, base_reach_ft: L, typical_pressure_psi: M L^-1 T^-2, reaction_lb: M L T^-2 }
export function computeMasterStreamReach({ nozzle_type, nozzle_pressure_psi }) {
  const t = MASTER_STREAM_TYPES[nozzle_type];
  if (!t) return { error: "Unknown nozzle type." };
  // DR-06 (RC-1): a negative pressure makes sqrt(negative) = NaN, and the
  // NaN propagates into computeLadderPipeReach. Pressure cannot be negative.
  if (!(nozzle_pressure_psi >= 0)) return { error: "Nozzle pressure cannot be negative." };
  // Reach scales as sqrt(P / P_typical) of base reach.
  const reach = t.base_reach_ft * Math.sqrt(nozzle_pressure_psi / t.typical_pressure_psi);
  // v23 EN.12: smooth-bore nozzle reaction NR = 1.57 * d^2 * NP (IFSTA).
  // The bore is implied by the smooth-bore type; fog reaction needs a flow
  // (use the fire-stream-reaction tile). Finite-guarded so a perturbed NP
  // never leaks a non-finite field.
  const BORE_IN = { smooth_bore_1_75: 1.75, smooth_bore_2: 2.0 };
  let reaction_lb = null;
  const d = BORE_IN[nozzle_type];
  if (d) {
    const nr = 1.57 * d * d * nozzle_pressure_psi;
    if (Number.isFinite(nr)) reaction_lb = nr;
  }
  return { typical_reach_ft: reach, nozzle_type, base_reach_ft: t.base_reach_ft, typical_pressure_psi: t.typical_pressure_psi, reaction_lb };
}

export const masterStreamExample = {
  inputs: { nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 },
  expected: { typical_reach_ft: 100 },
};

// --- Utility 56: Aerial Ladder Reach ---

// dims: in { angle_deg: dimensionless, extension_ft: L }
//        out: { horizontal_reach_ft: L, vertical_reach_ft: L }
export function computeAerialLadderReach({ angle_deg, extension_ft }) {
  // DR-08: a negative extension yields a negative reach. Length is non-negative.
  if (!(extension_ft >= 0)) return { error: "Ladder extension cannot be negative." };
  const rad = angle_deg * Math.PI / 180;
  return {
    horizontal_reach_ft: extension_ft * Math.cos(rad),
    vertical_reach_ft: extension_ft * Math.sin(rad),
  };
}

export const aerialLadderExample = {
  inputs: { angle_deg: 70, extension_ft: 100 },
};

// --- Utility 57: Foam Concentrate ---

// dims: in { fire_area_ft2: L^2, application_rate_gpm_per_ft2: L T^-1, foam_percentage: dimensionless, duration_min: T }
//        out: { total_solution_gpm: L^3 T^-1, concentrate_gpm: L^3 T^-1, total_concentrate_gallons: L^3, total_solution_gallons: L^3 }
export function computeFoam({ fire_area_ft2, application_rate_gpm_per_ft2 = 0.10, foam_percentage = 3, duration_min = 15 }) {
  // DR-07: no validation let negatives flow to finite-but-negative gallons.
  if (!(fire_area_ft2 > 0)) return { error: "Fire area must be positive." };
  if (!(application_rate_gpm_per_ft2 > 0)) return { error: "Application rate must be positive." };
  if (!(foam_percentage >= 0) || !(duration_min >= 0)) {
    return { error: "Foam percentage and duration cannot be negative." };
  }
  const total_solution_gpm = fire_area_ft2 * application_rate_gpm_per_ft2;
  const concentrate_gpm = total_solution_gpm * (foam_percentage / 100);
  const total_concentrate_gallons = concentrate_gpm * duration_min;
  const total_solution_gallons = total_solution_gpm * duration_min;
  return { total_solution_gpm, concentrate_gpm, total_concentrate_gallons, total_solution_gallons };
}

export const foamExample = {
  inputs: { fire_area_ft2: 1500, application_rate_gpm_per_ft2: 0.10, foam_percentage: 3, duration_min: 15 },
};

// --- Utility 58: Smoke Reading Reference ---

export const SMOKE_READING = [
  {
    attribute: "Volume",
    summary: "Greater volume implies more fuel pyrolyzing. Increasing volume with no opening change suggests growth or backdraft potential.",
  },
  {
    attribute: "Velocity",
    summary: "High velocity from any opening indicates pressurized environment. Turbulent smoke at openings suggests ventilation-limited combustion.",
  },
  {
    attribute: "Density",
    summary: "Thick black smoke indicates incomplete combustion and a fuel-rich environment. Lighter smoke suggests early-stage or ventilated combustion.",
  },
  {
    attribute: "Color",
    summary: "Black smoke often indicates synthetic fuels burning fuel-rich. Brown smoke can indicate structural members pyrolyzing. White smoke suggests early-stage combustion or steam.",
  },
];

// dims: in { } out: reference: dimensionless
// (Reference lookup tile; returns a categorical SMOKE_READING table.)
export function computeSmokeReading() { return { reference: SMOKE_READING }; }

// --- Renderers ---

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderFireFriction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: National Fire Academy hydraulics training. FL = C * (Q/100)^2 * (L/100), Q in GPM, L in ft, FL in psi.";
  const dia = makeSelect("Hose diameter", "ff-d", Object.keys(HOSE_FRICTION_COEFFICIENTS).map((k) => ({ value: k, label: k.replace("_in", " in") })));
  const gpm = makeNumber("Flow (gpm)", "ff-q", { step: "any", min: "0" });
  const len = makeNumber("Length (ft)", "ff-l", { step: "any", min: "0" });
  for (const f of [dia, gpm, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.select.value = "2.5_in"; gpm.input.value = "250"; len.input.value = "200"; update(); });
  const oFL = makeOutputLine(outputRegion, "Friction loss", "ff-out-fl");
  const oC = makeOutputLine(outputRegion, "Coefficient C", "ff-out-c");
  const update = debounce(() => {
    const r = computeFireFriction({ hose_diameter: dia.select.value, gpm: Number(gpm.input.value) || 0, length_ft: Number(len.input.value) || 0 });
    if (r.error) { oFL.textContent = r.error; oC.textContent = "-"; return; }
    oFL.textContent = fmt(r.friction_loss_psi, 1) + " psi";
    oC.textContent = String(r.coefficient);
  }, DEBOUNCE_MS);
  for (const el of [dia.select, gpm.input, len.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPDP(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per NFPA 13-2022 §8.3 (pressure calculations). PDP = nozzle pressure + friction loss + elevation (0.434 psi/ft of water) + appliance loss. AHJ governs. Free at nfpa.org/freeaccess.";
  const NP = makeNumber("Nozzle pressure (psi)", "pdp-np", { step: "any", min: "0", value: "100" });
  NP.input.value = "100";
  const FL = makeNumber("Total friction loss (psi)", "pdp-fl", { step: "any", min: "0", value: "0" });
  FL.input.value = "0";
  const E = makeNumber("Elevation change (ft up positive)", "pdp-e", { step: "any", value: "0" });
  E.input.value = "0";
  const A = makeNumber("Appliance loss (psi)", "pdp-a", { step: "any", min: "0", value: "0" });
  A.input.value = "0";
  for (const f of [NP, FL, E, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { NP.input.value = "100"; FL.input.value = "25"; E.input.value = "20"; A.input.value = "0"; update(); });
  const oP = makeOutputLine(outputRegion, "Pump discharge pressure", "pdp-out");
  const oE = makeOutputLine(outputRegion, "Elevation contribution", "pdp-out-e");
  const update = debounce(() => {
    const r = computePDP({
      nozzle_pressure_psi: Number(NP.input.value) || 0,
      friction_loss_psi: Number(FL.input.value) || 0,
      elevation_ft: Number(E.input.value) || 0,
      appliance_loss_psi: Number(A.input.value) || 0,
    });
    oP.textContent = fmt(r.pdp_psi, 1) + " psi";
    oE.textContent = fmt(r.elevation_psi, 1) + " psi";
  }, DEBOUNCE_MS);
  for (const el of [NP.input, FL.input, E.input, A.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderHydrantFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Q = 29.83 * c * d^2 * sqrt(P). c is the coefficient of discharge (typical 0.9 round-and-smooth).";
  const P = makeNumber("Pitot pressure (psi)", "hf-p", { step: "any", min: "0" });
  const d = makeNumber("Outlet diameter (in)", "hf-d", { step: "any", min: "0", value: "2.5" });
  d.input.value = "2.5";
  const c = makeNumber("Coefficient of discharge", "hf-c", { step: "any", min: "0", max: "1", value: "0.9" });
  c.input.value = "0.9";
  for (const f of [P, d, c]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "10"; d.input.value = "2.5"; c.input.value = "0.9"; update(); });
  const oQ = makeOutputLine(outputRegion, "Flow", "hf-out");
  const oNR = makeOutputLine(outputRegion, "Nozzle reaction (smooth bore)", "hf-out-nr");
  const update = debounce(() => {
    const r = computeHydrantFlow({ pitot_psi: Number(P.input.value) || 0, outlet_diameter_in: Number(d.input.value) || 0, c: Number(c.input.value) || 0.9 });
    oQ.textContent = fmt(r.flow_gpm, 0) + " gpm";
    oNR.textContent = r.reaction_lb === null ? "-" : fmt(r.reaction_lb, 1) + " lb (NR = 1.57 d^2 NP)";
  }, DEBOUNCE_MS);
  for (const el of [P.input, d.input, c.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderRequiredFireFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IFC 2021 Table B105.1 (ISO needed-fire-flow method). NFF = C * O * X * P; C = 18 * F * sqrt(A). AHJ governs. Free at codes.iccsafe.org.";
  const A = makeNumber("Structure area (ft^2)", "rff-a", { step: "any", min: "0" });
  const cls = makeSelect("Construction class", "rff-c", Object.keys(ISO_CONSTRUCTION_FACTORS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const O = makeNumber("Occupancy factor", "rff-o", { step: "any", min: "0", value: "1.0" });
  O.input.value = "1.0";
  const X = makeNumber("Exposure factor", "rff-x", { step: "any", min: "0", value: "1.0" });
  X.input.value = "1.0";
  const Pf = makeNumber("Communication factor", "rff-p", { step: "any", min: "0", value: "1.0" });
  Pf.input.value = "1.0";
  // v23 EN.11: optional structure volume for the Iowa rate-of-flow method.
  const Vol = makeNumber("Structure volume (ft^3, for Iowa method)", "rff-v", { step: "any", min: "0" });
  for (const f of [A, cls, O, X, Pf, Vol]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { A.input.value = "5000"; cls.select.value = "ordinary"; O.input.value = "1.0"; X.input.value = "1.0"; Pf.input.value = "1.0"; Vol.input.value = "40000"; update(); });
  const oN = makeOutputLine(outputRegion, "Needed fire flow (ISO)", "rff-out");
  const oC = makeOutputLine(outputRegion, "Base C", "rff-out-c");
  const oIowa = makeOutputLine(outputRegion, "Iowa rate-of-flow (V/100)", "rff-out-iowa");
  const update = debounce(() => {
    const r = computeRequiredFireFlow({
      structure_area_ft2: Number(A.input.value) || 0,
      construction_class: cls.select.value,
      occupancy_factor: Number(O.input.value) || 1.0,
      exposure_factor: Number(X.input.value) || 1.0,
      communication_factor: Number(Pf.input.value) || 1.0,
      volume_ft3: Number(Vol.input.value) || 0,
    });
    if (r.error) { oN.textContent = r.error; oC.textContent = "-"; oIowa.textContent = "-"; return; }
    oN.textContent = String(r.needed_fire_flow_gpm) + " gpm";
    oC.textContent = String(r.base_C_gpm);
    oIowa.textContent = r.iowa_rate_gpm === null ? "(enter volume)" : fmt(r.iowa_rate_gpm, 0) + " gpm (ISO - Iowa divergence " + fmt(r.divergence_gpm, 0) + " gpm)";
  }, DEBOUNCE_MS);
  for (const el of [A.input, cls.select, O.input, X.input, Pf.input, Vol.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderMasterStream(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Reach scales as sqrt(P/P_typical) of the published base reach for each nozzle type.";
  const t = makeSelect("Nozzle type", "ms-t", Object.keys(MASTER_STREAM_TYPES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const p = makeNumber("Nozzle pressure (psi)", "ms-p", { step: "any", min: "0" });
  for (const f of [t, p]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.select.value = "smooth_bore_2"; p.input.value = "80"; update(); });
  const oR = makeOutputLine(outputRegion, "Typical reach", "ms-out");
  const oNR = makeOutputLine(outputRegion, "Nozzle reaction (smooth bore)", "ms-out-nr");
  const update = debounce(() => {
    const r = computeMasterStreamReach({ nozzle_type: t.select.value, nozzle_pressure_psi: Number(p.input.value) || 0 });
    if (r.error) { oR.textContent = r.error; oNR.textContent = "-"; return; }
    oR.textContent = fmt(r.typical_reach_ft, 1) + " ft";
    oNR.textContent = r.reaction_lb === null ? "fog: use the fire-stream-reaction tile" : fmt(r.reaction_lb, 1) + " lb (NR = 1.57 d^2 NP)";
  }, DEBOUNCE_MS);
  for (const el of [t.select, p.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderAerialLadder(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Geometry. horizontal = L * cos(angle); vertical = L * sin(angle).";
  const a = makeNumber("Angle (degrees)", "al-a", { step: "any", min: "0", max: "90" });
  const L = makeNumber("Ladder extension (ft)", "al-l", { step: "any", min: "0" });
  for (const f of [a, L]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "70"; L.input.value = "100"; update(); });
  const oH = makeOutputLine(outputRegion, "Horizontal reach", "al-out-h");
  const oV = makeOutputLine(outputRegion, "Vertical reach", "al-out-v");
  const update = debounce(() => {
    const r = computeAerialLadderReach({ angle_deg: Number(a.input.value) || 0, extension_ft: Number(L.input.value) || 0 });
    oH.textContent = fmt(r.horizontal_reach_ft, 1) + " ft";
    oV.textContent = fmt(r.vertical_reach_ft, 1) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [a.input, L.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderFoam(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Foam volume = area * application rate * foam percentage * duration. Application rate from departmental SOP.";
  const A = makeNumber("Fire area (ft^2)", "fo-a", { step: "any", min: "0" });
  const r = makeNumber("Application rate (gpm/ft^2)", "fo-r", { step: "any", min: "0", value: "0.10" });
  r.input.value = "0.10";
  const pct = makeNumber("Foam concentrate (percent)", "fo-pct", { step: "any", min: "0", max: "10", value: "3" });
  pct.input.value = "3";
  const dur = makeNumber("Duration (min)", "fo-d", { step: "any", min: "0", value: "15" });
  dur.input.value = "15";
  for (const f of [A, r, pct, dur]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { A.input.value = "1500"; r.input.value = "0.10"; pct.input.value = "3"; dur.input.value = "15"; update(); });
  const oS = makeOutputLine(outputRegion, "Solution flow", "fo-out-s");
  const oC = makeOutputLine(outputRegion, "Concentrate", "fo-out-c");
  const oT = makeOutputLine(outputRegion, "Total concentrate", "fo-out-t");
  const update = debounce(() => {
    const x = computeFoam({
      fire_area_ft2: Number(A.input.value) || 0,
      application_rate_gpm_per_ft2: Number(r.input.value) || 0,
      foam_percentage: Number(pct.input.value) || 0,
      duration_min: Number(dur.input.value) || 0,
    });
    oS.textContent = fmt(x.total_solution_gpm, 1) + " gpm";
    oC.textContent = fmt(x.concentrate_gpm, 2) + " gpm concentrate";
    oT.textContent = fmt(x.total_concentrate_gallons, 1) + " gal";
  }, DEBOUNCE_MS);
  for (const el of [A.input, r.input, pct.input, dur.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderSmokeReading(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summaries of established fire-science training on smoke volume, velocity, density, and color interpretation.";
  const dl = document.createElement("dl");
  for (const item of SMOKE_READING) {
    const dt = document.createElement("dt"); dt.textContent = item.attribute; dl.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = item.summary; dl.appendChild(dd);
  }
  outputRegion.appendChild(dl);
}

// =====================================================================
// v2 utilities (100-104): spec-v2.md section 2 Group F extensions.
// =====================================================================

// --- Utility 100: Reverse-Lay Supply Friction Loss ---
//
// Extends the single-pump CQ^2L formula to a two-pump tandem operation.
// Per spec-v2: per-pump friction = single-pump friction * (1/n_pumps)^2
// for the parallel section.

// dims: in { hose_diameter: dimensionless, gpm: L^3 T^-1, length_ft: L, n_pumps: dimensionless }
//        out: { single_pump_psi: M L^-1 T^-2, per_pump_psi: M L^-1 T^-2, n_pumps: dimensionless, coefficient: dimensionless }
export function computeReverseLayFriction({ hose_diameter, gpm, length_ft, n_pumps = 1 }) {
  const C = HOSE_FRICTION_COEFFICIENTS[hose_diameter];
  if (C === undefined) return { error: "Unknown hose diameter." };
  // DR-08: flow and length cannot be negative.
  if (!(gpm >= 0) || !(length_ft >= 0)) return { error: "Flow and length cannot be negative." };
  const single = fireHoseFrictionLoss({ C, gpm, length_ft });
  const n = Math.max(1, Number(n_pumps) || 1);
  const per_pump = single * Math.pow(1 / n, 2);
  return {
    single_pump_psi: single,
    per_pump_psi: per_pump,
    n_pumps: n,
    coefficient: C,
  };
}

export const reverseLayExample = {
  inputs: { hose_diameter: "5_in", gpm: 1000, length_ft: 1000, n_pumps: 2 },
  // Single-pump 5" at 1000 GPM, 1000 ft: FL = 0.08 * (10)^2 * (10) = 80 psi.
  // Two-pump: 80 * (1/2)^2 = 20 psi per pump.
  expected: { single_pump_psi: 80, per_pump_psi: 20 },
};

// --- Utility 101: Sprinkler GPM Density ---
//
// total_gpm = area_of_operation_ft2 * density_gpm_per_ft2
// Hazard categories from public NFPA 13 (referenced by name only).

export const SPRINKLER_HAZARD_MIN_DENSITY = {
  light: 0.10,
  ordinary_1: 0.15,
  ordinary_2: 0.20,
  extra_1: 0.30,
  extra_2: 0.40,
};

// dims: in { area_of_operation_ft2: L^2, density_gpm_per_ft2: L T^-1, hazard_category: dimensionless }
//        out: { total_gpm: L^3 T^-1, density_gpm_per_ft2: L T^-1, meets_minimum: dimensionless, hazard_minimum_density: L T^-1 }
export function computeSprinklerDensity({ area_of_operation_ft2, density_gpm_per_ft2, hazard_category }) {
  const a = Number(area_of_operation_ft2) || 0;
  let d = Number(density_gpm_per_ft2) || 0;
  if (a <= 0) return { error: "Area must be positive." };
  if (d <= 0 && hazard_category) d = SPRINKLER_HAZARD_MIN_DENSITY[hazard_category];
  if (!(d > 0)) return { error: "Provide density or hazard category." };
  const total_gpm = a * d;
  const minimum_for_hazard = hazard_category ? SPRINKLER_HAZARD_MIN_DENSITY[hazard_category] : null;
  const meets_minimum = minimum_for_hazard === null ? null : d >= minimum_for_hazard;
  return { total_gpm, density_gpm_per_ft2: d, meets_minimum, hazard_minimum_density: minimum_for_hazard };
}

export const sprinklerDensityExample = {
  inputs: { area_of_operation_ft2: 1500, hazard_category: "ordinary_2" },
  expected: { total_gpm: 1500 * 0.20 },
};

// --- Utility 102: Standpipe Friction Loss ---
//
// total = riser elevation (0.434 psi/ft of water column)
//       + per-outlet friction summed (CQ^2L per outlet length)

// dims: in { riser_height_ft: L, outlet_count: dimensionless, gpm_per_outlet: L^3 T^-1, outlet_length_ft: L, hose_diameter: dimensionless }
//        out: { elevation_psi: M L^-1 T^-2, friction_total_psi: M L^-1 T^-2, per_outlet_psi: M L^-1 T^-2, total_psi: M L^-1 T^-2, outlet_count: dimensionless }
export function computeStandpipeFriction({ riser_height_ft, outlet_count, gpm_per_outlet, outlet_length_ft = 50, hose_diameter = "2.5_in" }) {
  const h = Number(riser_height_ft) || 0;
  const n = Number(outlet_count) || 0;
  const Q = Number(gpm_per_outlet) || 0;
  if (h <= 0 || n <= 0 || Q <= 0) return { error: "Provide positive height, outlets, and gpm." };
  const C = HOSE_FRICTION_COEFFICIENTS[hose_diameter];
  if (C === undefined) return { error: "Unknown hose diameter." };
  const elevation_psi = h * 0.434;
  const per_outlet_psi = fireHoseFrictionLoss({ C, gpm: Q, length_ft: outlet_length_ft });
  const friction_total_psi = per_outlet_psi * n;
  return {
    elevation_psi,
    friction_total_psi,
    per_outlet_psi,
    total_psi: elevation_psi + friction_total_psi,
    outlet_count: n,
  };
}

export const standpipeExample = {
  inputs: { riser_height_ft: 100, outlet_count: 2, gpm_per_outlet: 250, outlet_length_ft: 100, hose_diameter: "2.5_in" },
};

// --- Utility 103: Ladder Pipe Reach ---
//
// Combines the existing aerial-ladder geometry (horizontal/vertical reach
// from set angle and extension) with master-stream reach scaling at the
// tip. Effective reach = horizontal_ladder_ft + horizontal_stream_ft.

// dims: in { angle_deg: dimensionless, extension_ft: L, nozzle_type: dimensionless, nozzle_pressure_psi: M L^-1 T^-2 }
//        out: { horizontal_ladder_ft: L, vertical_ladder_ft: L, stream_reach_ft: L, horizontal_stream_ft: L, horizontal_total_ft: L }
export function computeLadderPipeReach({ angle_deg, extension_ft, nozzle_type, nozzle_pressure_psi }) {
  const ladder = computeAerialLadderReach({ angle_deg, extension_ft });
  if (ladder.error) return ladder;
  const stream = computeMasterStreamReach({ nozzle_type, nozzle_pressure_psi });
  if (stream.error) return stream;
  // Stream projects roughly forward at 30 deg below horizontal as a
  // standard fireground assumption; horizontal stream contribution is
  // typical_reach_ft * cos(30).
  const stream_forward_ft = stream.typical_reach_ft * Math.cos(30 * Math.PI / 180);
  return {
    horizontal_ladder_ft: ladder.horizontal_reach_ft,
    vertical_ladder_ft: ladder.vertical_reach_ft,
    stream_reach_ft: stream.typical_reach_ft,
    horizontal_stream_ft: stream_forward_ft,
    horizontal_total_ft: ladder.horizontal_reach_ft + stream_forward_ft,
  };
}

export const ladderPipeExample = {
  inputs: { angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 },
};

// --- Utility 104: Vehicle Braking Distance ---
//
// d_ft = v_mph^2 / (30 * (mu +/- grade%/100))
// Reaction-time distance = v_mph * 1.467 * t_s.

// dims: in { speed_mph: L T^-1, friction_coefficient: dimensionless, grade_percent: dimensionless, reaction_time_s: T }
//        out: { braking_distance_ft: L, reaction_distance_ft: L, total_distance_ft: L, effective_friction: dimensionless }
export function computeBrakingDistance({ speed_mph, friction_coefficient, grade_percent = 0, reaction_time_s = 1.5 }) {
  const v = Number(speed_mph) || 0;
  const mu = Number(friction_coefficient) || 0;
  const g_pct = Number(grade_percent) || 0;
  const t = Number(reaction_time_s) || 0;
  if (v <= 0 || mu <= 0) return { error: "Provide positive speed and friction coefficient." };
  const eff = mu + g_pct / 100; // negative grade subtracts
  if (eff <= 0) return { error: "Effective friction is non-positive (downhill on ice)." };
  const braking_ft = (v * v) / (30 * eff);
  const reaction_ft = v * 1.467 * t;
  return {
    braking_distance_ft: braking_ft,
    reaction_distance_ft: reaction_ft,
    total_distance_ft: braking_ft + reaction_ft,
    effective_friction: eff,
  };
}

export const brakingExample = {
  inputs: { speed_mph: 55, friction_coefficient: 0.7, grade_percent: 0, reaction_time_s: 1.5 },
  expectedRange: { braking_distance_ft: { min: 130, max: 160 } },
};

// --- v2 view renderers ---

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderReverseLayFriction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NFA CQ^2L extended to tandem-pump operation. Per-pump friction (parallel section) scales as (1/n_pumps)^2.";
  const dia = makeSelect("Hose diameter", "rl-d", Object.keys(HOSE_FRICTION_COEFFICIENTS).map((k) => ({ value: k, label: k.replace("_in", " in") })));
  const gpm = makeNumber("Total flow (gpm)", "rl-q", { step: "any", min: "0" });
  const len = makeNumber("Length (ft)", "rl-l", { step: "any", min: "0" });
  const np = makeNumber("Number of pumps", "rl-n", { step: "1", min: "1", value: "1" });
  np.input.value = "1";
  for (const f of [dia, gpm, len, np]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.select.value = "5_in"; gpm.input.value = "1000"; len.input.value = "1000"; np.input.value = "2"; update(); });
  const oS = makeOutputLine(outputRegion, "Single-pump friction", "rl-out-s");
  const oP = makeOutputLine(outputRegion, "Per-pump friction (parallel)", "rl-out-p");
  const oN = makeOutputLine(outputRegion, "Pump count", "rl-out-n");
  const update = debounce(() => {
    const r = computeReverseLayFriction({
      hose_diameter: dia.select.value,
      gpm: Number(gpm.input.value) || 0,
      length_ft: Number(len.input.value) || 0,
      n_pumps: Number(np.input.value) || 1,
    });
    if (r.error) { oS.textContent = r.error; oP.textContent = "-"; oN.textContent = "-"; return; }
    oS.textContent = fmt(r.single_pump_psi, 1) + " psi";
    oP.textContent = fmt(r.per_pump_psi, 1) + " psi";
    oN.textContent = String(r.n_pumps);
  }, DEBOUNCE_MS);
  for (const el of [dia.select, gpm.input, len.input, np.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderSprinklerDensity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per NFPA 13-2022 Table 12.1 (hazard density). total_gpm = area * density (gpm/ft^2). AHJ governs. Free at nfpa.org/freeaccess.";
  const a = makeNumber("Area of operation (ft^2)", "sd-a", { step: "any", min: "0" });
  const d = makeNumber("Density (gpm/ft^2)", "sd-d", { step: "any", min: "0", value: "" });
  const cat = makeSelect("Hazard category (default if density blank)", "sd-c", [
    { value: "", label: "(none)" },
    ...Object.keys(SPRINKLER_HAZARD_MIN_DENSITY).map((k) => ({ value: k, label: k.replace(/_/g, " ") })),
  ]);
  for (const f of [a, d, cat]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "1500"; d.input.value = ""; cat.select.value = "ordinary_2"; update(); });
  const oG = makeOutputLine(outputRegion, "Total gpm", "sd-out-g");
  const oM = makeOutputLine(outputRegion, "Meets hazard minimum", "sd-out-m");
  const update = debounce(() => {
    const r = computeSprinklerDensity({
      area_of_operation_ft2: Number(a.input.value) || 0,
      density_gpm_per_ft2: Number(d.input.value) || 0,
      hazard_category: cat.select.value || null,
    });
    if (r.error) { oG.textContent = r.error; oM.textContent = "-"; return; }
    oG.textContent = fmt(r.total_gpm, 1) + " gpm @ " + fmt(r.density_gpm_per_ft2, 2) + " gpm/ft^2";
    oM.textContent = r.meets_minimum === null ? "n/a" : (r.meets_minimum ? "yes" : "no (" + r.hazard_minimum_density + " gpm/ft^2 minimum)");
  }, DEBOUNCE_MS);
  for (const el of [a.input, d.input, cat.select]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderStandpipeFriction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per NFPA 14-2022 (standpipes). Elevation 0.434 psi/ft of water; CQ^2L friction per outlet hose section. AHJ governs. Free at nfpa.org/freeaccess.";
  const h = makeNumber("Riser height (ft)", "sp-h", { step: "any", min: "0" });
  const n = makeNumber("Outlet count", "sp-n", { step: "1", min: "0" });
  const q = makeNumber("GPM per outlet", "sp-q", { step: "any", min: "0" });
  const L = makeNumber("Outlet hose length (ft)", "sp-l", { step: "any", min: "0", value: "100" });
  L.input.value = "100";
  const dia = makeSelect("Outlet hose diameter", "sp-d", Object.keys(HOSE_FRICTION_COEFFICIENTS).map((k) => ({ value: k, label: k.replace("_in", " in") })));
  for (const f of [h, n, q, L, dia]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "100"; n.input.value = "2"; q.input.value = "250"; L.input.value = "100"; dia.select.value = "2.5_in"; update(); });
  const oE = makeOutputLine(outputRegion, "Elevation pressure", "sp-out-e");
  const oF = makeOutputLine(outputRegion, "Friction (all outlets)", "sp-out-f");
  const oT = makeOutputLine(outputRegion, "Total", "sp-out-t");
  const update = debounce(() => {
    const r = computeStandpipeFriction({
      riser_height_ft: Number(h.input.value) || 0,
      outlet_count: Number(n.input.value) || 0,
      gpm_per_outlet: Number(q.input.value) || 0,
      outlet_length_ft: Number(L.input.value) || 0,
      hose_diameter: dia.select.value,
    });
    if (r.error) { oE.textContent = r.error; oF.textContent = "-"; oT.textContent = "-"; return; }
    oE.textContent = fmt(r.elevation_psi, 1) + " psi";
    oF.textContent = fmt(r.friction_total_psi, 1) + " psi";
    oT.textContent = fmt(r.total_psi, 1) + " psi";
  }, DEBOUNCE_MS);
  for (const el of [h.input, n.input, q.input, L.input, dia.select]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderLadderPipeReach(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Aerial geometry plus stream-reach scaling. Stream projects forward at ~30 deg below horizontal (standard fireground assumption).";
  const a = makeNumber("Set angle (degrees)", "lp-a", { step: "any", min: "0", max: "90" });
  const L = makeNumber("Extension (ft)", "lp-l", { step: "any", min: "0" });
  const t = makeSelect("Nozzle type", "lp-t", Object.keys(MASTER_STREAM_TYPES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const p = makeNumber("Nozzle pressure (psi)", "lp-p", { step: "any", min: "0" });
  for (const f of [a, L, t, p]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "70"; L.input.value = "100"; t.select.value = "smooth_bore_2"; p.input.value = "80"; update(); });
  const oH = makeOutputLine(outputRegion, "Horizontal ladder reach", "lp-out-h");
  const oV = makeOutputLine(outputRegion, "Vertical ladder reach", "lp-out-v");
  const oS = makeOutputLine(outputRegion, "Stream reach", "lp-out-s");
  const oT = makeOutputLine(outputRegion, "Total horizontal reach", "lp-out-t");
  const update = debounce(() => {
    const r = computeLadderPipeReach({
      angle_deg: Number(a.input.value) || 0,
      extension_ft: Number(L.input.value) || 0,
      nozzle_type: t.select.value,
      nozzle_pressure_psi: Number(p.input.value) || 0,
    });
    if (r.error) { oH.textContent = r.error; oV.textContent = "-"; oS.textContent = "-"; oT.textContent = "-"; return; }
    oH.textContent = fmt(r.horizontal_ladder_ft, 1) + " ft";
    oV.textContent = fmt(r.vertical_ladder_ft, 1) + " ft";
    oS.textContent = fmt(r.stream_reach_ft, 1) + " ft";
    oT.textContent = fmt(r.horizontal_total_ft, 1) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [a.input, L.input, t.select, p.input]) el.addEventListener("input", update);
}

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderBrakingDistance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: d = v^2 / (30 * (mu +/- grade%/100)). Reaction distance = v * 1.467 * t.";
  const v = makeNumber("Speed (mph)", "br-v", { step: "any", min: "0" });
  const mu = makeNumber("Road friction coefficient", "br-mu", { step: "any", min: "0", max: "1" });
  const g = makeNumber("Grade (%, downhill negative)", "br-g", { step: "any", value: "0" });
  g.input.value = "0";
  const t = makeNumber("Reaction time (s)", "br-t", { step: "any", min: "0", value: "1.5" });
  t.input.value = "1.5";
  for (const f of [v, mu, g, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { v.input.value = "55"; mu.input.value = "0.7"; g.input.value = "0"; t.input.value = "1.5"; update(); });
  const oB = makeOutputLine(outputRegion, "Braking distance", "br-out-b");
  const oR = makeOutputLine(outputRegion, "Reaction distance", "br-out-r");
  const oT = makeOutputLine(outputRegion, "Total stopping distance", "br-out-t");
  const update = debounce(() => {
    const r = computeBrakingDistance({
      speed_mph: Number(v.input.value) || 0,
      friction_coefficient: Number(mu.input.value) || 0,
      grade_percent: Number(g.input.value) || 0,
      reaction_time_s: Number(t.input.value) || 0,
    });
    if (r.error) { oB.textContent = r.error; oR.textContent = "-"; oT.textContent = "-"; return; }
    oB.textContent = fmt(r.braking_distance_ft, 1) + " ft";
    oR.textContent = fmt(r.reaction_distance_ft, 1) + " ft";
    oT.textContent = fmt(r.total_distance_ft, 1) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [v.input, mu.input, g.input, t.input]) el.addEventListener("input", update);
}

// =====================================================================
// v3 utilities (159 through 161). See spec-v3.md section 2.6.
// =====================================================================

// --- Utility 159: Confined Space Air Change Time ---
//
// minutes = (volume * target_purges) / CFM. OSHA 1910.146 cited by section.

// dims: in { volume_ft3: L^3, blower_cfm: L^3 T^-1, target_purges: dimensionless } out: minutes: T
export function computeConfinedSpacePurge({ volume_ft3 = 0, blower_cfm = 0, target_purges = 7 }) {
  if (!(volume_ft3 > 0)) return { error: "Volume must be positive." };
  if (!(blower_cfm > 0)) return { error: "Blower CFM must be positive." };
  if (!(target_purges > 0)) return { error: "Target purges must be positive." };
  const minutes = (volume_ft3 * target_purges) / blower_cfm;
  return { minutes };
}

export const confinedSpacePurgeExample = { inputs: { volume_ft3: 1000, blower_cfm: 200, target_purges: 7 } };

// --- Utility 160: Rope Rescue Mechanical Advantage ---
//
// theoretical MA from rig type; actual MA = theoretical * (efficiency)^pulleys.
// haul_force = load / actual MA. NFA / NFPA training literature cited by name.

export const ROPE_RIGS = {
  "1:1": { ma: 1, pulleys: 0 },
  "2:1": { ma: 2, pulleys: 1 },
  "3:1": { ma: 3, pulleys: 2 },
  "4:1": { ma: 4, pulleys: 3 },
  "5:1": { ma: 5, pulleys: 3 },
  T_method: { ma: 5, pulleys: 4 },
  "5:1_piggyback": { ma: 5, pulleys: 4 },
};

// dims: in { rig: dimensionless, efficiency: dimensionless, load_lb: M L T^-2 }
//        out: { theoretical_ma: dimensionless, actual_ma: dimensionless, haul_force_lb: M L T^-2, pulleys: dimensionless }
export function computeRopeMA({ rig = "3:1", efficiency = 0.9, load_lb = 0 }) {
  const r = ROPE_RIGS[rig];
  if (!r) return { error: "Unknown rig type." };
  if (!(efficiency > 0 && efficiency <= 1)) return { error: "Efficiency must be 0..1." };
  if (!(load_lb >= 0)) return { error: "Load must be non-negative." };
  const actual_ma = r.ma * Math.pow(efficiency, r.pulleys);
  const haul_force_lb = load_lb / actual_ma;
  return { theoretical_ma: r.ma, actual_ma, haul_force_lb, pulleys: r.pulleys };
}

export const ropeMAExample = { inputs: { rig: "4:1", efficiency: 0.9, load_lb: 600 } };

// --- Utility 161: Sling Angle Load Multiplier ---
//
// L = W / (n * sin(theta/2)) for basket / vertical.
// Choker reduction factor 0.75 typical. ASME B30.9 cited by section.

// dims: in { load_lb: M L T^-2, sling_config: dimensionless, included_angle_deg: dimensionless, n_legs: dimensionless }
//        out: { tension_per_leg_lb: M L T^-2, choker_factor: dimensionless }
export function computeSlingAngle({ load_lb = 0, sling_config = "vertical", included_angle_deg = 60, n_legs = 2 }) {
  if (!(load_lb >= 0)) return { error: "Load must be non-negative." };
  if (!(n_legs >= 1)) return { error: "At least one leg required." };
  if (!(included_angle_deg > 0 && included_angle_deg < 180)) return { error: "Included angle must be 0-180 deg." };
  const theta_rad = (included_angle_deg / 2) * Math.PI / 180;
  let tension_per_leg;
  let factor;
  if (sling_config === "vertical") {
    tension_per_leg = load_lb / n_legs;
    factor = 1;
  } else if (sling_config === "basket" || sling_config === "bridle") {
    tension_per_leg = load_lb / (n_legs * Math.sin(theta_rad));
    factor = 1;
  } else if (sling_config === "choker") {
    tension_per_leg = load_lb / (n_legs * Math.sin(theta_rad));
    factor = 0.75;
    tension_per_leg = tension_per_leg / factor; // applied capacity reduction = effective tension increase
  } else {
    return { error: "Unknown sling configuration." };
  }
  return { tension_per_leg_lb: tension_per_leg, choker_factor: factor };
}

export const slingAngleExample = { inputs: { load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 } };

// --- v3 renderers ---

import {
  DEBOUNCE_MS as _DF, debounce as _debF, makeNumber as _mnF, makeSelect as _msF,
  makeOutputLine as _moF, attachExampleButton as _aeF, fmt as _fmtF,
} from "./ui-fields.js";

function renderConfinedSpacePurge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all confined-space and worker-safety operations. Citation: OSHA 1910.146 by section number only. Formula: t (min) = (V * N) / CFM.";
  _aeF(inputRegion, () => fillExample(confinedSpacePurgeExample.inputs));
  const v = _mnF("Space volume (ft^3)", "cs-v", { step: "any", min: "0" });
  const c = _mnF("Blower CFM", "cs-c", { step: "any", min: "0" });
  const n = _mnF("Target air changes", "cs-n", { step: "any", min: "0", value: "7" });
  n.input.value = "7";
  for (const f of [v, c, n]) inputRegion.appendChild(f.wrap);
  const oM = _moF(outputRegion, "Minutes to purge", "cs-out-m");
  function fillExample(x) { v.input.value = x.volume_ft3; c.input.value = x.blower_cfm; n.input.value = x.target_purges; update(); }
  const update = _debF(() => {
    const r = computeConfinedSpacePurge({ volume_ft3: Number(v.input.value) || 0, blower_cfm: Number(c.input.value) || 0, target_purges: Number(n.input.value) || 0 });
    if (r.error) { oM.textContent = r.error; return; }
    oM.textContent = _fmtF(r.minutes, 1) + " min";
  }, _DF);
  for (const el of [v.input, c.input, n.input]) el.addEventListener("input", update);
}

function renderRopeMA(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all rope-rescue operations. Citation: NFA / NFPA training literature by name only.";
  _aeF(inputRegion, () => fillExample(ropeMAExample.inputs));
  const r = _msF("Rig", "rm-r", Object.keys(ROPE_RIGS).map((k) => ({ value: k, label: k })));
  const e = _mnF("Pulley efficiency (0-1)", "rm-e", { step: "any", min: "0", max: "1", value: "0.9" });
  e.input.value = "0.9";
  const l = _mnF("Load (lb)", "rm-l", { step: "any", min: "0" });
  for (const f of [r, e, l]) inputRegion.appendChild(f.wrap);
  const oT = _moF(outputRegion, "Theoretical MA", "rm-out-t");
  const oA = _moF(outputRegion, "Actual MA (after pulley losses)", "rm-out-a");
  const oH = _moF(outputRegion, "Haul force", "rm-out-h");
  function fillExample(x) { r.select.value = x.rig; e.input.value = x.efficiency; l.input.value = x.load_lb; update(); }
  const update = _debF(() => {
    const x = computeRopeMA({ rig: r.select.value, efficiency: Number(e.input.value) || 0, load_lb: Number(l.input.value) || 0 });
    if (x.error) { oT.textContent = x.error; oA.textContent = "-"; oH.textContent = "-"; return; }
    oT.textContent = String(x.theoretical_ma);
    oA.textContent = _fmtF(x.actual_ma, 2);
    oH.textContent = _fmtF(x.haul_force_lb, 0) + " lb";
  }, _DF);
  for (const el of [r.select, e.input, l.input]) el.addEventListener("input", update);
}

function renderSlingAngle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all rigging and lifting operations. Citation: ASME B30.9 by section number only. L = W / (n * sin(theta/2)).";
  _aeF(inputRegion, () => fillExample(slingAngleExample.inputs));
  const w = _mnF("Load (lb)", "sa-w", { step: "any", min: "0" });
  const c = _msF("Sling configuration", "sa-c", [{ value: "vertical", label: "Vertical" }, { value: "basket", label: "Basket" }, { value: "bridle", label: "Bridle" }, { value: "choker", label: "Choker" }]);
  const a = _mnF("Included angle (deg)", "sa-a", { step: "any", min: "0", max: "180" });
  const n = _mnF("Legs", "sa-n", { step: "1", min: "1", value: "2" });
  n.input.value = "2";
  for (const f of [w, c, a, n]) inputRegion.appendChild(f.wrap);
  const oT = _moF(outputRegion, "Tension per leg", "sa-out-t");
  function fillExample(x) { w.input.value = x.load_lb; c.select.value = x.sling_config; a.input.value = x.included_angle_deg; n.input.value = x.n_legs; update(); }
  const update = _debF(() => {
    const r = computeSlingAngle({ load_lb: Number(w.input.value) || 0, sling_config: c.select.value, included_angle_deg: Number(a.input.value) || 0, n_legs: Number(n.input.value) || 1 });
    if (r.error) { oT.textContent = r.error; return; }
    oT.textContent = _fmtF(r.tension_per_leg_lb, 0) + " lb";
  }, _DF);
  for (const el of [w.input, c.select, a.input, n.input]) el.addEventListener("input", update);
}

export const FIRE_RENDERERS = {
  "fire-friction": renderFireFriction,
  "pdp": renderPDP,
  "hydrant-flow": renderHydrantFlow,
  "required-fire-flow": renderRequiredFireFlow,
  "master-stream": renderMasterStream,
  "aerial-ladder": renderAerialLadder,
  "foam": renderFoam,
  "smoke-reading": renderSmokeReading,
  // v2
  "reverse-lay-friction": renderReverseLayFriction,
  "sprinkler-density": renderSprinklerDensity,
  "standpipe-friction": renderStandpipeFriction,
  "ladder-pipe-reach": renderLadderPipeReach,
  "braking-distance": renderBrakingDistance,
  // v3
  "confined-space-purge": renderConfinedSpacePurge,
  "rope-ma": renderRopeMA,
  "sling-angle": renderSlingAngle,
};

// =====================================================================
// v7 utility 252: ISO Needed Fire Flow (NFF)
// =====================================================================

import {
  DEBOUNCE_MS as _V7F_DEB, debounce as _v7f_debounce, fmt as _v7f_fmt,
  makeNumber as _v7f_makeNumber, makeSelect as _v7f_makeSelect,
  attachExampleButton as _v7f_attachEx, makeOutputLine as _v7f_makeOut,
} from "./ui-fields.js";

export const ISO_CONSTRUCTION_F = { 1: 1.5, 2: 1.0, 3: 0.8, 4: 0.8, 5: 0.6, 6: 0.6 };

export const NFF_MAX_GPM = 12000;
export const NFF_MIN_GPM = 500;
export const NFF_ROUND_INCREMENT = 250;

// dims: in { area_ft2: L^2, stories: dimensionless, construction_class: dimensionless, occupancy_factor: dimensionless, exposure_distance_ft: L, exposure_communication_factor: dimensionless }
//        out: { F_factor: dimensionless, A_eff_ft2: L^2, Ci_raw: L^3 T^-1, Ci_capped: L^3 T^-1, X_exposure: dimensionless, occupancy_factor: dimensionless, P_communication: dimensionless, NFF_raw_gpm: L^3 T^-1, NFF_gpm: L^3 T^-1 }
export function computeIsoNeededFireFlow({
  area_ft2 = 0, stories = 1, construction_class = 3,
  occupancy_factor = 1.0, exposure_distance_ft = 100,
  exposure_communication_factor = 0,
} = {}) {
  if (!(area_ft2 > 0)) return { error: "Building footprint area must be positive." };
  if (!(stories >= 1)) return { error: "Stories must be >= 1." };
  const F = ISO_CONSTRUCTION_F[construction_class];
  if (F === undefined) return { error: "Construction class must be 1 through 6." };
  if (!(occupancy_factor > 0)) return { error: "Occupancy factor must be positive." };
  const A_eff = construction_class >= 5 ? area_ft2 : area_ft2 * Math.min(stories, 3);
  const Ci_raw = 18 * F * Math.sqrt(A_eff);
  const Ci = Math.min(Ci_raw, 8000);
  let X = 0;
  if (exposure_distance_ft > 0) {
    if (exposure_distance_ft <= 10) X = 0.25;
    else if (exposure_distance_ft <= 30) X = 0.20;
    else if (exposure_distance_ft <= 60) X = 0.15;
    else if (exposure_distance_ft <= 100) X = 0.10;
    else if (exposure_distance_ft <= 150) X = 0.05;
    else X = 0;
  }
  const P = Math.max(0, Number(exposure_communication_factor) || 0);
  const NFF_raw = Ci * occupancy_factor * (1 + X + P);
  let NFF = Math.round(NFF_raw / NFF_ROUND_INCREMENT) * NFF_ROUND_INCREMENT;
  if (NFF > NFF_MAX_GPM) NFF = NFF_MAX_GPM;
  if (NFF < NFF_MIN_GPM) NFF = NFF_MIN_GPM;
  return {
    F_factor: F, A_eff_ft2: A_eff,
    Ci_raw, Ci_capped: Ci,
    X_exposure: X, occupancy_factor, P_communication: P,
    NFF_raw_gpm: NFF_raw, NFF_gpm: NFF,
  };
}

export const isoNeededFireFlowExample = {
  inputs: { area_ft2: 5000, stories: 2, construction_class: 2, occupancy_factor: 1.0, exposure_distance_ft: 50, exposure_communication_factor: 0 },
};

function _v7f_renderIsoNFF(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ISO Public Protection Classification (PPC) Schedule by name. NFF = Ci × Oi × (1 + X + P) where Ci = 18 × F × sqrt(A); rounded to the published 250 gpm increment and capped at 12 000 gpm. SOP-and-incident-command governs.";
  _v7f_attachEx(inputRegion, () => fillExample(isoNeededFireFlowExample.inputs));
  const a = _v7f_makeNumber("Footprint area (ft²)", "nf-a", { step: "any", min: "0" });
  const s = _v7f_makeNumber("Stories", "nf-s", { step: "1", min: "1" });
  s.input.value = "1";
  const c = _v7f_makeSelect("Construction class", "nf-c", [
    { value: "1", label: "1 - Frame (F=1.5)" },
    { value: "2", label: "2 - Joisted masonry (F=1.0)" },
    { value: "3", label: "3 - Noncombustible (F=0.8)" },
    { value: "4", label: "4 - Masonry noncombustible (F=0.8)" },
    { value: "5", label: "5 - Modified fire-resistive (F=0.6)" },
    { value: "6", label: "6 - Fire-resistive (F=0.6)" },
  ]);
  const o = _v7f_makeNumber("Occupancy factor Oi (0.75-1.25)", "nf-o", { step: "any", min: "0" });
  o.input.value = "1.0";
  const e = _v7f_makeNumber("Exposure distance (ft)", "nf-e", { step: "any", min: "0" });
  const p = _v7f_makeNumber("Communication factor P (0-0.30)", "nf-p", { step: "any", min: "0" });
  p.input.value = "0";
  for (const f of [a, s, c, o, e, p]) inputRegion.appendChild(f.wrap);
  const oCi = _v7f_makeOut(outputRegion, "Construction factor Ci", "nf-out-ci");
  const oX = _v7f_makeOut(outputRegion, "Exposure factor X", "nf-out-x");
  const oNFF = _v7f_makeOut(outputRegion, "Needed Fire Flow (NFF)", "nf-out-nff");
  function fillExample(x) { a.input.value = x.area_ft2; s.input.value = x.stories; c.select.value = String(x.construction_class); o.input.value = x.occupancy_factor; e.input.value = x.exposure_distance_ft; p.input.value = x.exposure_communication_factor; update(); }
  const update = _v7f_debounce(() => {
    const r = computeIsoNeededFireFlow({
      area_ft2: Number(a.input.value) || 0, stories: Number(s.input.value) || 1,
      construction_class: Number(c.select.value), occupancy_factor: Number(o.input.value) || 1.0,
      exposure_distance_ft: Number(e.input.value) || 100,
      exposure_communication_factor: Number(p.input.value) || 0,
    });
    if (r.error) { oCi.textContent = r.error; oX.textContent = "-"; oNFF.textContent = "-"; return; }
    oCi.textContent = _v7f_fmt(r.Ci_capped, 0) + " (raw " + _v7f_fmt(r.Ci_raw, 0) + ")";
    oX.textContent = _v7f_fmt(r.X_exposure, 2);
    oNFF.textContent = _v7f_fmt(r.NFF_gpm, 0) + " gpm (rounded; cap 12 000)";
  }, _V7F_DEB);
  for (const f of [a.input, s.input, c.select, o.input, e.input, p.input]) f.addEventListener("input", update);
}

FIRE_RENDERERS["iso-nff"] = _v7f_renderIsoNFF;

// =====================================================================
// v9 §C.3: SCBA cylinder work time (NFPA 1981; manufacturer rated scf)
// =====================================================================
//
// Public gas-law math. The cylinder's rated scf at rated pressure is
// the manufacturer's published value (common ratings: 30 / 45 / 60 min
// duration at 4500 psi rated pressure -> 45 / 66 / 88 scf typical).
//
//   available_scf_to_alarm = (P_start - P_alarm) / P_rated * V_rated
//   time_to_alarm_min      = available_scf_to_alarm / consumption_scfm
//   time_to_empty_min      = (P_start / P_rated * V_rated) / consumption_scfm
//
// "Time to empty" is a math-aid only, not a planning number. NFPA 1500
// and incident-command practice train members to exit at the low-air
// alarm, not at empty. The output surfaces this caveat on every result.

// dims: in { V_rated_scf: L^3, P_rated_psi: M L^-1 T^-2, P_start_psi: M L^-1 T^-2, P_alarm_psi: M L^-1 T^-2, consumption_scfm: L^3 T^-1 }
//        out: { available_scf_to_alarm: L^3, available_scf_to_empty: L^3, time_to_alarm_min: T, time_to_empty_min: T, warnings: dimensionless }
export function computeScbaCylinderTime({
  V_rated_scf = 0,
  P_rated_psi = 0,
  P_start_psi = 0,
  P_alarm_psi = 0,
  consumption_scfm = 0,
} = {}) {
  const Vr = Number(V_rated_scf) || 0;
  const Pr = Number(P_rated_psi) || 0;
  const Ps = Number(P_start_psi) || 0;
  const Pa = Number(P_alarm_psi) || 0;
  const C = Number(consumption_scfm) || 0;
  if (!(Vr > 0)) return { error: "Cylinder rated volume must be positive (scf)." };
  if (!(Pr > 0)) return { error: "Rated pressure must be positive (psi)." };
  if (!(Ps > 0)) return { error: "Starting pressure must be positive (psi)." };
  if (Ps > Pr) return { error: "Starting pressure cannot exceed rated pressure." };
  if (!(Pa >= 0)) return { error: "Low-air alarm pressure must be non-negative." };
  if (Pa >= Ps) return { error: "Low-air alarm pressure must be below starting pressure." };
  if (!(C > 0)) return { error: "Consumption rate must be positive (scfm)." };

  const available_scf_to_alarm = ((Ps - Pa) / Pr) * Vr;
  const available_scf_to_empty = (Ps / Pr) * Vr;
  const time_to_alarm_min = available_scf_to_alarm / C;
  const time_to_empty_min = available_scf_to_empty / C;

  const warnings = ["Time-to-empty is a math aid only. NFPA 1500 / incident-command practice trains members to exit at the low-air alarm; do not plan to empty."];
  if (C < 20) warnings.push("Consumption below 20 scfm is below the NFPA 1981 light-work range; verify against manufacturer field data.");
  if (C > 200) warnings.push("Consumption above 200 scfm is above the typical heavy-work range; verify the input.");

  return {
    available_scf_to_alarm,
    available_scf_to_empty,
    time_to_alarm_min,
    time_to_empty_min,
    warnings,
  };
}

export const scbaCylinderExample = {
  // Standard 60-min 4500-psi cylinder (88 scf rated) at full fill,
  // 33% low-air alarm (1485 psi), 40 scfm light work.
  inputs: { V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485, consumption_scfm: 40 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderScbaCylinder(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NFPA 1981-2019 (Open-Circuit SCBA for Emergency Services) and NIOSH 42 CFR 84. Manufacturer cylinder rating governs absolute scf. Field consumption varies with work rate; this is a planning estimate. Free at nfpa.org/freeaccess and ecfr.gov.";

  const vr = makeNumber("Cylinder rated volume (scf)", "scba-vr", { step: "any", min: "0" });
  const pr = makeNumber("Rated pressure (psi)", "scba-pr", { step: "any", min: "0", value: "4500" });
  pr.input.value = "4500";
  const ps = makeNumber("Starting pressure (psi)", "scba-ps", { step: "any", min: "0" });
  const pa = makeNumber("Low-air alarm pressure (psi; typically ~33% of rated)", "scba-pa", { step: "any", min: "0" });
  const cs = makeNumber("Consumption rate (scfm; ~40 light, ~100 heavy)", "scba-cs", { step: "any", min: "0", value: "40" });
  cs.input.value = "40";
  for (const f of [vr, pr, ps, pa, cs]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    vr.input.value = "88"; pr.input.value = "4500"; ps.input.value = "4500";
    pa.input.value = "1485"; cs.input.value = "40"; update();
  });

  const oA = makeOutputLine(outputRegion, "Time to low-air alarm", "scba-out-a");
  const oE = makeOutputLine(outputRegion, "Time to empty (math aid only)", "scba-out-e");
  const oSa = makeOutputLine(outputRegion, "Available scf to alarm", "scba-out-sa");
  const oW = makeOutputLine(outputRegion, "Notes", "scba-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  function formatMinSec(min) {
    const totalSec = Math.max(0, Math.round(min * 60));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ":" + (s < 10 ? "0" + s : String(s));
  }
  const update = debounce(() => {
    const r = computeScbaCylinderTime({
      V_rated_scf: readNum(vr.input),
      P_rated_psi: readNum(pr.input),
      P_start_psi: readNum(ps.input),
      P_alarm_psi: readNum(pa.input),
      consumption_scfm: readNum(cs.input),
    });
    if (r.error) {
      oA.textContent = r.error; oE.textContent = ""; oSa.textContent = ""; oW.textContent = "";
      return;
    }
    oA.textContent = formatMinSec(r.time_to_alarm_min) + " (" + fmt(r.time_to_alarm_min, 1) + " min)";
    oE.textContent = formatMinSec(r.time_to_empty_min) + " (" + fmt(r.time_to_empty_min, 1) + " min)";
    oSa.textContent = fmt(r.available_scf_to_alarm, 1) + " scf";
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [vr.input, pr.input, ps.input, pa.input, cs.input]) f.addEventListener("input", update);
}

FIRE_RENDERERS["scba-cylinder-time"] = renderScbaCylinder;

// =====================================================================
// v9 §C.1: NFPA 1142 rural water-supply
// =====================================================================
//
// Public NFPA 1142 §5 formula for minimum-fire-flow:
//
//   Q_total = (V * O * H) / X
//
// where V is building volume (ft^3), O is the occupancy-hazard factor,
// H is the construction-class factor, and X is the fire-flow class
// divisor. Exposure factor (1.5x multiplier when adjacent structure
// within 50 ft) and sprinkler reduction (0.5x multiplier when UL-
// listed) per NFPA 1142 §5.4 / §5.5.
//
// The occupancy / construction factor values are formula coefficients
// per the spec-v9 §C.1 discipline: cited by NFPA 1142 §5 by name only,
// not reproduced as a table.
//
// Standard tanker sizes 1000 / 1500 / 2000 / 3000 gal per spec-v9 §C.1.

// Occupancy hazard categories per NFPA 1142 §5.2. Numeric factors are
// the published formula coefficients; values are commonly cited.
export const NFPA1142_OCCUPANCY = {
  1: { factor: 3, label: "Light hazard (offices, schools, dwellings)" },
  2: { factor: 5, label: "Ordinary hazard (small mercantile, light manufacturing)" },
  3: { factor: 6, label: "Medium hazard (lumber storage, garages)" },
  4: { factor: 7, label: "High hazard (woodworking, paint shops)" },
  5: { factor: 5, label: "Storage occupancies (general)" },
  6: { factor: 6, label: "Storage of flammables" },
  7: { factor: 4, label: "Apartments / dormitories" },
};

// Construction class factors per NFPA 1142 §5.2.7. Lower factor =
// more fire-resistive construction.
export const NFPA1142_CONSTRUCTION = {
  I:   { factor: 0.5, label: "Class I (fire-resistive)" },
  II:  { factor: 0.75, label: "Class II (noncombustible)" },
  III: { factor: 1.0, label: "Class III (ordinary brick / masonry)" },
  IV:  { factor: 1.0, label: "Class IV (heavy timber)" },
  V:   { factor: 1.5, label: "Class V (wood frame)" },
};

const NFPA1142_FIRE_FLOW_DIVISOR = 5; // standard NFPA 1142 §5 small-structure divisor

const NFPA1142_TANKER_SIZES_GAL = [1000, 1500, 2000, 3000];

// dims: in { volume_ft3: L^3, occupancy_class: dimensionless, construction_class: dimensionless, exposure_within_50_ft: dimensionless, sprinkler_listed: dimensionless }
//        out: { Q_min_gal: L^3, Q_pre_sprinkler_gal: L^3, occupancy_factor: dimensionless, construction_factor: dimensionless, tanker_count: dimensionless, warnings: dimensionless }
export function computeNFPA1142WaterSupply({
  volume_ft3 = 0,
  occupancy_class = 1,
  construction_class = "V",
  exposure_within_50_ft = false,
  sprinkler_listed = false,
} = {}) {
  const V = Number(volume_ft3) || 0;
  if (!(V > 0)) return { error: "Building volume must be positive (ft^3)." };
  const occ = NFPA1142_OCCUPANCY[occupancy_class];
  if (!occ) return { error: "Occupancy class must be 1 through 7 per NFPA 1142 §5.2." };
  const con = NFPA1142_CONSTRUCTION[construction_class];
  if (!con) return { error: "Construction class must be I through V per NFPA 1142 §5.2.7." };

  let Q = (V * occ.factor * con.factor) / NFPA1142_FIRE_FLOW_DIVISOR;
  if (exposure_within_50_ft) Q *= 1.5;
  const Q_after_exposure = Q;
  if (sprinkler_listed) Q *= 0.5;

  // Recommended tanker count (number of standard tankers needed to
  // deliver Q in a single shuttle cycle; the smallest tanker that
  // satisfies the volume in N apparatus trips with N round up).
  const tanker_count = {};
  for (const sz of NFPA1142_TANKER_SIZES_GAL) {
    tanker_count[sz] = Math.ceil(Q / sz);
  }

  const warnings = [];
  if (V < 8000) warnings.push("Building volume below 8,000 ft^3 may not require formal NFPA 1142 calculation per §5.1; the AHJ may waive.");
  if (sprinkler_listed) warnings.push("Sprinkler 0.5x reduction is contingent on a confirmed UL-listed system; AHJ inspection governs.");
  if (exposure_within_50_ft) warnings.push("1.5x exposure multiplier applies when an adjacent structure is within 50 ft; verify pre-incident plan.");

  return {
    Q_min_gal: Q,
    Q_pre_sprinkler_gal: Q_after_exposure,
    occupancy_factor: occ.factor,
    construction_factor: con.factor,
    tanker_count,
    warnings,
  };
}

export const nfpa1142Example = {
  // Spec-v9 §C.1 worked example: 30,000 ft^3 single-family residence,
  // Class V construction, occupancy 1, no exposure, no sprinkler.
  // Q = 30000 * 3 * 1.5 / 5 = 27,000 gal.
  inputs: { volume_ft3: 30000, occupancy_class: 1, construction_class: "V", exposure_within_50_ft: false, sprinkler_listed: false },
};

function renderNFPA1142(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NFPA 1142-2022 (Standard on Water Supplies for Suburban and Rural Firefighting) §5. AHJ governs final water-supply requirement. Free at nfpa.org/freeaccess.";

  const v = makeNumber("Building volume (ft^3; footprint x avg ceiling)", "nfpa-v", { step: "any", min: "0" });
  const occ = makeSelect("Occupancy class (NFPA 1142 §5.2, types 1-7)", "nfpa-occ",
    Object.keys(NFPA1142_OCCUPANCY).map((k) => ({ value: k, label: "Type " + k + " - " + NFPA1142_OCCUPANCY[k].label, selected: k === "1" })),
  );
  const con = makeSelect("Construction class (NFPA 1142 §5.2.7)", "nfpa-con",
    Object.keys(NFPA1142_CONSTRUCTION).map((k) => ({ value: k, label: NFPA1142_CONSTRUCTION[k].label, selected: k === "V" })),
  );
  const exp = makeSelect("Exposure within 50 ft", "nfpa-exp", [
    { value: "false", label: "No", selected: true },
    { value: "true",  label: "Yes (1.5x multiplier)" },
  ]);
  const spr = makeSelect("UL-listed sprinkler system present", "nfpa-spr", [
    { value: "false", label: "No", selected: true },
    { value: "true",  label: "Yes (0.5x reduction)" },
  ]);
  for (const f of [v, occ, con, exp, spr]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    v.input.value = "30000"; occ.select.value = "1"; con.select.value = "V";
    exp.select.value = "false"; spr.select.value = "false"; update();
  });

  const oQ = makeOutputLine(outputRegion, "Required minimum fire-flow (gal)", "nfpa-out-q");
  const o1000 = makeOutputLine(outputRegion, "1000-gal tanker trips", "nfpa-out-1000");
  const o2000 = makeOutputLine(outputRegion, "2000-gal tanker trips", "nfpa-out-2000");
  const o3000 = makeOutputLine(outputRegion, "3000-gal tanker trips", "nfpa-out-3000");
  const oW = makeOutputLine(outputRegion, "Notes", "nfpa-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeNFPA1142WaterSupply({
      volume_ft3: readNum(v.input),
      occupancy_class: occ.select.value,
      construction_class: con.select.value,
      exposure_within_50_ft: exp.select.value === "true",
      sprinkler_listed: spr.select.value === "true",
    });
    if (r.error) {
      oQ.textContent = r.error; o1000.textContent = ""; o2000.textContent = ""; o3000.textContent = ""; oW.textContent = "";
      return;
    }
    oQ.textContent = fmt(r.Q_min_gal, 0) + " gal";
    o1000.textContent = r.tanker_count[1000] + " trips";
    o2000.textContent = r.tanker_count[2000] + " trips";
    o3000.textContent = r.tanker_count[3000] + " trips";
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "Q = (V * occupancy * construction) / 5 per NFPA 1142 §5. AHJ governs final requirement.";
  }, DEBOUNCE_MS);
  for (const f of [v.input, occ.select, con.select, exp.select, spr.select]) f.addEventListener("input", update);
}

FIRE_RENDERERS["nfpa-1142-water-supply"] = renderNFPA1142;

// v9 §C.6 confined-space pre-entry ventilation.
// Companion to the v3 confined-space-purge tile: takes L x W x H (not
// raw volume), selects a contaminant-driven default ACH target, returns
// both minutes-to-purge and steady-state ACH, and surfaces the OSHA
// 1910.146(d)(5) 4-gas-meter requirement so the operator does not treat
// ventilation alone as space-certification.

// Default target air-changes-per-hour by contaminant class, per
// NIOSH 80-106 and operator-grade engineering practice.
export const CONFINED_SPACE_CONTAMINANTS = {
  "combustible-gas":   { default_purges: 7,  label: "Combustible gas (LEL)",
                          reminder: "Pre-entry and continuous monitoring for LEL with a calibrated 4-gas meter is required by 1910.146(d)(5). Ventilation does not certify the space." },
  "oxygen-deficient":  { default_purges: 7,  label: "Oxygen-deficient atmosphere",
                          reminder: "Maintain O2 between 19.5 and 23.5 percent per 1910.146; supplied-air respiratory protection is required if it cannot be maintained by ventilation." },
  "h2s":               { default_purges: 10, label: "Hydrogen sulfide (H2S)",
                          reminder: "H2S is heavier than air and persists in low areas; continuous monitoring is required and ventilation alone is not sufficient at >100 ppm." },
  "co":                { default_purges: 10, label: "Carbon monoxide (CO)",
                          reminder: "CO from internal-combustion equipment outside the space can re-enter; relocate the blower upwind and continue to monitor with a 4-gas meter." },
  "general":           { default_purges: 7,  label: "General / unknown",
                          reminder: "Default 7 air-changes per NIOSH 80-106; 4-gas-meter readings before and during entry are required by 1910.146(d)(5)." },
};

// dims: in { length_ft: L, width_ft: L, height_ft: L, volume_ft3: L^3, blower_cfm: L^3 T^-1, contaminant: dimensionless, target_purges: dimensionless }
//        out: { volume_ft3: L^3, minutes_to_purge: T, steady_ACH: T^-1, target_purges: dimensionless, contaminant_label: dimensionless, warnings: dimensionless }
export function computeConfinedSpaceVent({
  length_ft = 0,
  width_ft = 0,
  height_ft = 0,
  volume_ft3 = null,
  blower_cfm = 0,
  contaminant = "general",
  target_purges = null,
} = {}) {
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const H = Number(height_ft) || 0;
  const Vexp = (volume_ft3 === null || volume_ft3 === "") ? null : Number(volume_ft3);
  const V = Vexp !== null && Vexp > 0 ? Vexp : (L * W * H);
  const Q = Number(blower_cfm) || 0;
  const ct = CONFINED_SPACE_CONTAMINANTS[contaminant];
  if (!ct) return { error: "Unknown contaminant class '" + contaminant + "'." };
  const N = (target_purges === null || target_purges === "") ? ct.default_purges : Number(target_purges);
  if (!(V > 0)) return { error: "Provide L x W x H (or volume) so V is positive (ft^3)." };
  if (!(Q > 0)) return { error: "Blower CFM must be positive." };
  if (!(N > 0)) return { error: "Target air-changes must be positive." };

  const minutes_to_purge = (V * N) / Q;
  const steady_ACH = Q * 60 / V;

  const warnings = [ct.reminder ];
  if (minutes_to_purge > 60) warnings.push("Purge time above 60 minutes; consider a higher-capacity blower or smaller staged sections.");
  if (steady_ACH < 6) warnings.push("Steady-state ACH below 6 is below the NIOSH 80-106 typical minimum; verify blower placement and the path length.");

  return {
    volume_ft3: V,
    minutes_to_purge,
    steady_ACH,
    target_purges: N,
    contaminant_label: ct.label,
    warnings,
  };
}

export const confinedSpaceVentExample = {
  // Spec-v9 §C.6 worked example: 10 ft x 10 ft x 10 ft tank (1000 ft^3),
  // 200 cfm blower, general contaminant default 7 ACH -> 35 minutes,
  // steady ACH = 12.
  inputs: { length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: "general" },
};

function _v9f_renderConfinedSpaceVent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per OSHA 29 CFR 1910.146 (Permit-Required Confined Spaces) and NIOSH 80-106 (Working in Confined Spaces). Pre-entry atmospheric monitoring with a calibrated 4-gas meter is required by 1910.146(d)(5); ventilation does not substitute for the meter. AHJ governs. Free at ecfr.gov and at cdc.gov/niosh.";

  const L = makeNumber("Length (ft)", "csv-l", { step: "any", min: "0" });
  const W = makeNumber("Width (ft)", "csv-w", { step: "any", min: "0" });
  const H = makeNumber("Height (ft)", "csv-h", { step: "any", min: "0" });
  const cfm = makeNumber("Blower CFM (Q)", "csv-q", { step: "any", min: "0" });
  const ct = makeSelect("Target contaminant", "csv-ct",
    Object.keys(CONFINED_SPACE_CONTAMINANTS).map((k) => ({ value: k, label: CONFINED_SPACE_CONTAMINANTS[k].label }))
  );
  const N = makeNumber("Target air-changes (blank = contaminant default)", "csv-n", { step: "any", min: "0" });
  for (const f of [L, W, H, cfm, ct, N]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    L.input.value = "10"; W.input.value = "10"; H.input.value = "10";
    cfm.input.value = "200"; ct.select.value = "general"; N.input.value = "";
    update();
  });

  const oV = makeOutputLine(outputRegion, "Volume (ft^3)", "csv-out-v");
  const oM = makeOutputLine(outputRegion, "Minutes to purge", "csv-out-m");
  const oA = makeOutputLine(outputRegion, "Steady-state ACH", "csv-out-a");
  const oT = makeOutputLine(outputRegion, "Target air-changes used", "csv-out-t");
  const oC = makeOutputLine(outputRegion, "Contaminant", "csv-out-c");
  const oW = makeOutputLine(outputRegion, "4-gas-meter reminder", "csv-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeConfinedSpaceVent({
      length_ft: readNum(L.input),
      width_ft: readNum(W.input),
      height_ft: readNum(H.input),
      blower_cfm: readNum(cfm.input),
      contaminant: ct.select.value,
      target_purges: N.input.value === "" ? null : readNum(N.input),
    });
    if (r.error) {
      oV.textContent = r.error; oM.textContent = ""; oA.textContent = ""; oT.textContent = ""; oC.textContent = ""; oW.textContent = "";
      return;
    }
    oV.textContent = fmt(r.volume_ft3, 0) + " ft^3";
    oM.textContent = fmt(r.minutes_to_purge, 2) + " min";
    oA.textContent = fmt(r.steady_ACH, 1);
    oT.textContent = fmt(r.target_purges, 1);
    oC.textContent = r.contaminant_label;
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [L.input, W.input, H.input, cfm.input, N.input]) el.addEventListener("input", update);
  ct.select.addEventListener("change", update);
}

FIRE_RENDERERS["confined-space-vent"] = _v9f_renderConfinedSpaceVent;

// =====================================================================
// spec-v15 Group F close: F.2 standpipe pump pressure + F.5 smoke ejector
// =====================================================================

import {
  DEBOUNCE_MS as _V15F_DEB, debounce as _v15f_debounce, fmt as _v15f_fmt,
  makeNumber as _v15f_makeNumber, makeSelect as _v15f_makeSelect,
  attachExampleButton as _v15f_attachEx, makeOutputLine as _v15f_makeOut,
} from "./ui-fields.js";

// --- F.2: Standpipe Pump Discharge Pressure (NFPA 14) ---
//
// PDP = NP + FL_supply + FL_appliance + EL. Elevation loss is the head of
// water at 0.434 psi/ft (NFPA 14). Supply-hose friction is the NFA CQ^2L
// engine over the supply lay at the design flow. The appliance loss covers
// the standpipe system itself (intake, riser check, hose valve, FDC).

// dims: in { standpipe_class: dimensionless, highest_outlet_elevation_ft: L, nozzle_pressure_psi: M L^-1 T^-2, design_gpm: L^3 T^-1, appliance_loss_psi: M L^-1 T^-2, supply_hose_length_ft: L, supply_hose_diameter: dimensionless, building_height_ft: L } out: { pdp_psi: M L^-1 T^-2, elevation_loss_psi: M L^-1 T^-2, supply_friction_psi: M L^-1 T^-2 }
export function computeStandpipePDP({
  standpipe_class = "I",
  highest_outlet_elevation_ft = 0,
  nozzle_pressure_psi = 100,
  design_gpm = 250,
  appliance_loss_psi = 25,
  supply_hose_length_ft = 0,
  supply_hose_diameter = "3_in",
  building_height_ft = 0,
} = {}) {
  const elev = Number(highest_outlet_elevation_ft) || 0;
  const NP = Number(nozzle_pressure_psi) || 0;
  const Q = Number(design_gpm) || 0;
  const appliance = Number(appliance_loss_psi) || 0;
  const supplyLen = Number(supply_hose_length_ft) || 0;
  const height = Number(building_height_ft) || 0;
  if (!(NP > 0)) return { error: "Required nozzle pressure must be positive (psi)." };
  if (!(Q > 0)) return { error: "Design flow must be positive (GPM)." };
  if (appliance < 0 || supplyLen < 0) return { error: "Appliance loss and supply length cannot be negative." };
  const C = HOSE_FRICTION_COEFFICIENTS[supply_hose_diameter];
  if (C === undefined) return { error: "Unknown supply hose diameter." };

  const elevation_loss_psi = 0.434 * elev; // negative elevation (below pumper) subtracts
  const supply_friction_psi = fireHoseFrictionLoss({ C, gpm: Q, length_ft: supplyLen });
  const pdp_psi = NP + supply_friction_psi + appliance + elevation_loss_psi;

  const warnings = [];
  if (height > 75) warnings.push("Building over 75 ft is a high-rise; NFPA 14 §7.10 supplemental pressure-regulation and fire-pump requirements apply.");
  if (elev > 600) warnings.push("Lift above 600 ft is outside typical single-pumper capability; a relay or in-building fire pump is needed.");
  if (pdp_psi > 350) warnings.push("PDP above 350 psi exceeds typical apparatus pump and hose ratings; stage a relay or use the building fire pump.");

  return {
    standpipe_class,
    pdp_psi,
    nozzle_pressure_psi: NP,
    supply_friction_psi,
    appliance_loss_psi: appliance,
    elevation_loss_psi,
    design_gpm: Q,
    warnings,
  };
}

export const standpipePDPExample = {
  // 12-story building, highest outlet ~110 ft above the pumper, 250 GPM at a
  // 100 psi smooth-bore tip, 25 psi appliance loss, 200 ft of 3 in supply:
  // EL = 47.7 psi, supply FL = 0.677*(250/100)^2*(200/100) = 8.46 psi.
  inputs: {
    standpipe_class: "I",
    highest_outlet_elevation_ft: 110,
    nozzle_pressure_psi: 100,
    design_gpm: 250,
    appliance_loss_psi: 25,
    supply_hose_length_ft: 200,
    supply_hose_diameter: "3_in",
    building_height_ft: 120,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v15f_renderStandpipePDP(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all standpipe and pumping operations. Citation: per NFPA 14-2024 (standpipes) §7. PDP = nozzle pressure + supply friction (NFA CQ^2L) + appliance loss + elevation (0.434 psi/ft). AHJ governs. Free at nfpa.org/freeaccess.";
  const cls = _v15f_makeSelect("Standpipe class", "spp-cls", [
    { value: "I", label: "Class I (2.5 in)" },
    { value: "II", label: "Class II (1.5 in)" },
    { value: "III", label: "Class III (both)" },
  ]);
  const elev = _v15f_makeNumber("Highest outlet above pumper (ft)", "spp-elev", { step: "any", value: "110" });
  elev.input.value = "110";
  const np = _v15f_makeNumber("Required nozzle pressure (psi)", "spp-np", { step: "any", min: "0", value: "100" });
  np.input.value = "100";
  const gpm = _v15f_makeNumber("Design flow (GPM)", "spp-gpm", { step: "any", min: "0", value: "250" });
  gpm.input.value = "250";
  const appl = _v15f_makeNumber("Appliance loss (psi)", "spp-appl", { step: "any", min: "0", value: "25" });
  appl.input.value = "25";
  const slen = _v15f_makeNumber("Supply hose length (ft)", "spp-slen", { step: "any", min: "0", value: "200" });
  slen.input.value = "200";
  const sdia = _v15f_makeSelect("Supply hose diameter", "spp-sdia", Object.keys(HOSE_FRICTION_COEFFICIENTS).map((k) => ({ value: k, label: k.replace("_in", " in") })));
  sdia.select.value = "3_in";
  const bh = _v15f_makeNumber("Building height (ft)", "spp-bh", { step: "any", min: "0", value: "120" });
  bh.input.value = "120";
  for (const f of [cls, elev, np, gpm, appl, slen, sdia, bh]) inputRegion.appendChild(f.wrap);
  _v15f_attachEx(inputRegion, () => {
    cls.select.value = "I"; elev.input.value = "110"; np.input.value = "100"; gpm.input.value = "250"; appl.input.value = "25"; slen.input.value = "200"; sdia.select.value = "3_in"; bh.input.value = "120"; update();
  });

  const oPdp = _v15f_makeOut(outputRegion, "Pump discharge pressure (psi)", "spp-out-pdp");
  const oBreak = _v15f_makeOut(outputRegion, "Breakdown (NP / supply FL / appliance / EL)", "spp-out-break");
  const oW = _v15f_makeOut(outputRegion, "Notes", "spp-out-w");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = _v15f_debounce(() => {
    const r = computeStandpipePDP({
      standpipe_class: cls.select.value,
      highest_outlet_elevation_ft: readNum(elev.input),
      nozzle_pressure_psi: readNum(np.input),
      design_gpm: readNum(gpm.input),
      appliance_loss_psi: readNum(appl.input),
      supply_hose_length_ft: readNum(slen.input),
      supply_hose_diameter: sdia.select.value,
      building_height_ft: readNum(bh.input),
    });
    if (r.error) { oPdp.textContent = r.error; oBreak.textContent = "-"; oW.textContent = ""; return; }
    oPdp.textContent = _v15f_fmt(r.pdp_psi, 0) + " psi";
    oBreak.textContent = _v15f_fmt(r.nozzle_pressure_psi, 0) + " + " + _v15f_fmt(r.supply_friction_psi, 1) + " + " + _v15f_fmt(r.appliance_loss_psi, 0) + " + " + _v15f_fmt(r.elevation_loss_psi, 1) + " psi";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Within typical single-pumper standpipe range; SOP and incident command govern.";
  }, _V15F_DEB);
  for (const el of [elev.input, np.input, gpm.input, appl.input, slen.input, bh.input]) el.addEventListener("input", update);
  for (const el of [cls.select, sdia.select]) el.addEventListener("change", update);
}

FIRE_RENDERERS["standpipe-pdp"] = _v15f_renderStandpipePDP;

// --- F.5: Smoke Ejector / Negative-Pressure Ventilation CFM ---
//
// CFM_required = volume * ACH / 60. Fans needed = ceil(required / per-fan CFM).
// Time to one air change = volume / actual CFM. The exhaust-to-entry opening
// ratio drives PPV efficiency (1:1 to 1.5:1 is the fireground best practice).

// dims: in { length_ft: L, width_ft: L, height_ft: L, target_ach: dimensionless, fan_cfm: L^3 T^-1, exhaust_opening_ft2: L^2, entry_opening_ft2: L^2 } out: { cfm_required: L^3 T^-1, fans: dimensionless, time_to_one_change_min: T }
export function computeSmokeEjector({
  length_ft = 0,
  width_ft = 0,
  height_ft = 0,
  room_volume_ft3 = null,
  target_ach = 5,
  fan_cfm = 0,
  exhaust_opening_ft2 = 0,
  entry_opening_ft2 = 0,
} = {}) {
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const H = Number(height_ft) || 0;
  const ach = Number(target_ach) || 0;
  const fan = Number(fan_cfm) || 0;
  const exhaust = Number(exhaust_opening_ft2) || 0;
  const entry = Number(entry_opening_ft2) || 0;
  const volume_ft3 = room_volume_ft3 != null && Number(room_volume_ft3) > 0
    ? Number(room_volume_ft3)
    : L * W * H;
  if (!(volume_ft3 > 0)) return { error: "Provide a positive room volume (or length, width, and height)." };
  if (!(ach > 0)) return { error: "Target air changes per hour must be positive." };
  if (!(fan > 0)) return { error: "Fan CFM rating must be positive." };

  const cfm_required = (volume_ft3 * ach) / 60;
  const fans = Math.ceil(cfm_required / fan);
  const cfm_actual = fans * fan;
  const time_to_one_change_min = volume_ft3 / cfm_actual;
  const opening_ratio = entry > 0 ? exhaust / entry : null;

  const warnings = [];
  if (volume_ft3 > 100000) warnings.push("Room volume above 100,000 ft^3 is a commercial space; plan multiple ejectors and confirm the exhaust path.");
  if (opening_ratio != null && (opening_ratio < 0.5 || opening_ratio > 2.0)) warnings.push("Exhaust-to-entry opening ratio outside 0.5-2.0 is inefficient PPV; aim for 1:1 to 1.5:1 (exhaust slightly larger than entry).");
  if (opening_ratio == null) warnings.push("Enter the entry opening to check the exhaust-to-entry ratio.");

  return {
    volume_ft3,
    cfm_required,
    fans,
    cfm_actual,
    time_to_one_change_min,
    opening_ratio,
    target_ach: ach,
    warnings,
  };
}

export const smokeEjectorExample = {
  // 30 x 40 x 10 ft room = 12,000 ft^3, 5 ACH target, 4,000 CFM ejector,
  // 12 ft^2 exhaust, 10 ft^2 entry: required 1,000 CFM, 1 fan, ~3 min/change.
  inputs: {
    length_ft: 30, width_ft: 40, height_ft: 10,
    target_ach: 5, fan_cfm: 4000,
    exhaust_opening_ft2: 12, entry_opening_ft2: 10,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v15f_renderSmokeEjector(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all ventilation operations. Citation: per NFPA 1500 §8.5 and the IFSTA Essentials of Fire Fighting ventilation chapter. CFM = volume * ACH / 60; fans = ceil(CFM / per-fan rating). Free at usfa.fema.gov.";
  const L = _v15f_makeNumber("Room length (ft)", "se-l", { step: "any", min: "0", value: "30" });
  L.input.value = "30";
  const W = _v15f_makeNumber("Room width (ft)", "se-w", { step: "any", min: "0", value: "40" });
  W.input.value = "40";
  const H = _v15f_makeNumber("Ceiling height (ft)", "se-h", { step: "any", min: "0", value: "10" });
  H.input.value = "10";
  const ach = _v15f_makeNumber("Target air changes per hour", "se-ach", { step: "any", min: "0", value: "5" });
  ach.input.value = "5";
  const fan = _v15f_makeNumber("Ejector fan CFM rating", "se-fan", { step: "any", min: "0", value: "4000" });
  fan.input.value = "4000";
  const ex = _v15f_makeNumber("Exhaust opening (ft^2)", "se-ex", { step: "any", min: "0", value: "12" });
  ex.input.value = "12";
  const en = _v15f_makeNumber("Entry opening (ft^2)", "se-en", { step: "any", min: "0", value: "10" });
  en.input.value = "10";
  for (const f of [L, W, H, ach, fan, ex, en]) inputRegion.appendChild(f.wrap);
  _v15f_attachEx(inputRegion, () => {
    L.input.value = "30"; W.input.value = "40"; H.input.value = "10"; ach.input.value = "5"; fan.input.value = "4000"; ex.input.value = "12"; en.input.value = "10"; update();
  });

  const oReq = _v15f_makeOut(outputRegion, "Required CFM for target ACH", "se-out-req");
  const oFans = _v15f_makeOut(outputRegion, "Fans needed", "se-out-fans");
  const oTime = _v15f_makeOut(outputRegion, "Time to one air change", "se-out-time");
  const oRatio = _v15f_makeOut(outputRegion, "Exhaust-to-entry ratio", "se-out-ratio");
  const oW = _v15f_makeOut(outputRegion, "Notes", "se-out-w");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = _v15f_debounce(() => {
    const r = computeSmokeEjector({
      length_ft: readNum(L.input),
      width_ft: readNum(W.input),
      height_ft: readNum(H.input),
      target_ach: readNum(ach.input),
      fan_cfm: readNum(fan.input),
      exhaust_opening_ft2: readNum(ex.input),
      entry_opening_ft2: readNum(en.input),
    });
    if (r.error) { oReq.textContent = r.error; oFans.textContent = "-"; oTime.textContent = "-"; oRatio.textContent = "-"; oW.textContent = ""; return; }
    oReq.textContent = _v15f_fmt(r.cfm_required, 0) + " CFM (" + _v15f_fmt(r.volume_ft3, 0) + " ft^3)";
    oFans.textContent = String(r.fans) + " (" + _v15f_fmt(r.cfm_actual, 0) + " CFM actual)";
    oTime.textContent = _v15f_fmt(r.time_to_one_change_min, 1) + " min";
    oRatio.textContent = r.opening_ratio != null ? _v15f_fmt(r.opening_ratio, 2) + " : 1" : "-";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Within efficient PPV range; SOP and incident command govern.";
  }, _V15F_DEB);
  for (const el of [L.input, W.input, H.input, ach.input, fan.input, ex.input, en.input]) el.addEventListener("input", update);
}

FIRE_RENDERERS["smoke-ejector-cfm"] = _v15f_renderSmokeEjector;

// =====================================================================
// v23 F.1 / F.2: nozzle reaction force + sprinkler K-factor
// =====================================================================
import {
  DEBOUNCE_MS as _V23F_DEB, debounce as _v23f_debounce, fmt as _v23f_fmt,
  makeNumber as _v23f_makeNumber, makeSelect as _v23f_makeSelect,
  attachExampleButton as _v23f_attachEx, makeOutputLine as _v23f_makeOut,
} from "./ui-fields.js";

// --- F.1: Nozzle / fire-stream reaction force ---
// Smooth bore: NR = 1.57 * d^2 * NP. Fog: NR = 0.0505 * Q * sqrt(NP).
// Staffing thresholds (~60 lb one person, ~75 lb hose team) are advisory.
//
// dims: in { nozzle_type: dimensionless, bore_in: L, flow_gpm: dimensionless, nozzle_pressure_psi: dimensionless } out: { reaction_lb: dimensionless }
export function computeFireStreamReaction({ nozzle_type = "smooth", bore_in = 0, flow_gpm = 0, nozzle_pressure_psi = 0 } = {}) {
  const np = Number(nozzle_pressure_psi) || 0;
  if (!(np > 0 && Number.isFinite(np))) return { error: "Nozzle pressure must be positive (psi)." };
  let reaction_lb;
  if (nozzle_type === "fog") {
    const q = Number(flow_gpm) || 0;
    if (!(q > 0 && Number.isFinite(q))) return { error: "Flow must be positive (gpm) for a fog nozzle." };
    reaction_lb = 0.0505 * q * Math.sqrt(np);
  } else {
    const d = Number(bore_in) || 0;
    if (!(d > 0 && Number.isFinite(d))) return { error: "Bore diameter must be positive (in) for a smooth bore." };
    reaction_lb = 1.57 * d * d * np;
  }
  let staffing = "within one-firefighter range";
  if (reaction_lb > 75) staffing = "hose team required (> ~75 lb)";
  else if (reaction_lb > 60) staffing = "near one-person limit (~60-75 lb)";
  return { nozzle_type, reaction_lb, staffing };
}

export const fireStreamReactionExample = { inputs: { nozzle_type: "smooth", bore_in: 1.0, flow_gpm: 0, nozzle_pressure_psi: 50 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderFireStreamReaction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the IFSTA Pumping Apparatus Driver/Operator nozzle-reaction formulas: smooth bore NR = 1.57 * d^2 * NP; fog NR = 0.0505 * Q * sqrt(NP). Staffing thresholds (~60 lb one person, ~75 lb hose team) are advisory. AHJ and fire-officer judgment govern.";
  const type = _v23f_makeSelect("Nozzle type", "fsr-type", [
    { value: "smooth", label: "Smooth bore (bore + NP)", selected: true },
    { value: "fog", label: "Fog (flow + NP)" },
  ]);
  const bore = _v23f_makeNumber("Bore diameter (in)", "fsr-bore", { step: "any", min: "0", value: "1.0" });
  bore.input.value = "1.0";
  const flow = _v23f_makeNumber("Flow (gpm, fog)", "fsr-flow", { step: "any", min: "0" });
  const np = _v23f_makeNumber("Nozzle pressure (psi)", "fsr-np", { step: "any", min: "0", value: "50" });
  np.input.value = "50";
  for (const f of [type, bore, flow, np]) inputRegion.appendChild(f.wrap);
  _v23f_attachEx(inputRegion, () => { type.select.value = "smooth"; bore.input.value = "1.0"; flow.input.value = ""; np.input.value = "50"; update(); });
  const oNR = _v23f_makeOut(outputRegion, "Nozzle reaction", "fsr-out-nr");
  const oStaff = _v23f_makeOut(outputRegion, "Staffing note", "fsr-out-staff");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23f_debounce(() => {
    const r = computeFireStreamReaction({ nozzle_type: type.select.value, bore_in: readNum(bore.input), flow_gpm: readNum(flow.input), nozzle_pressure_psi: readNum(np.input) });
    if (r.error) { oNR.textContent = r.error; oStaff.textContent = ""; return; }
    oNR.textContent = _v23f_fmt(r.reaction_lb, 1) + " lb";
    oStaff.textContent = r.staffing;
  }, _V23F_DEB);
  for (const f of [type.select, bore.input, flow.input, np.input]) f.addEventListener("input", update);
}
FIRE_RENDERERS["fire-stream-reaction"] = renderFireStreamReaction;

// --- F.2: Sprinkler K-factor solver (Q = K * sqrt(P)) ---
// dims: in { solve_for: dimensionless, flow_gpm: dimensionless, pressure_psi: dimensionless, k_factor: dimensionless } out: { flow_gpm: dimensionless, pressure_psi: dimensionless, k_factor: dimensionless }
export function computeSprinklerKFactor({ solve_for = "flow", flow_gpm = 0, pressure_psi = 0, k_factor = 0 } = {}) {
  const Q = Number(flow_gpm) || 0;
  const P = Number(pressure_psi) || 0;
  const K = Number(k_factor) || 0;
  if (solve_for === "pressure") {
    if (!(K > 0 && Number.isFinite(K))) return { error: "K-factor must be positive." };
    if (!(Q > 0 && Number.isFinite(Q))) return { error: "Flow must be positive (gpm)." };
    return { solve_for, pressure_psi: (Q / K) ** 2, flow_gpm: Q, k_factor: K };
  }
  if (solve_for === "k") {
    if (!(P > 0 && Number.isFinite(P))) return { error: "Pressure must be positive (psi)." };
    if (!(Q > 0 && Number.isFinite(Q))) return { error: "Flow must be positive (gpm)." };
    return { solve_for, k_factor: Q / Math.sqrt(P), flow_gpm: Q, pressure_psi: P };
  }
  // solve flow
  if (!(K > 0 && Number.isFinite(K))) return { error: "K-factor must be positive." };
  if (!(P > 0 && Number.isFinite(P))) return { error: "Pressure must be positive (psi)." };
  return { solve_for: "flow", flow_gpm: K * Math.sqrt(P), pressure_psi: P, k_factor: K };
}

export const sprinklerKFactorExample = { inputs: { solve_for: "flow", k_factor: 5.6, pressure_psi: 7, flow_gpm: 0 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSprinklerKFactor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the NFPA 13 sprinkler discharge relation Q = K x sqrt(P) (Q gpm, P psi, K nominal nameplate K-factor). Complements the sprinkler-density tile. NFPA 13 governs the design; free read-only at nfpa.org/freeaccess.";
  const mode = _v23f_makeSelect("Solve for", "skf-mode", [
    { value: "flow", label: "Flow Q from K, P", selected: true },
    { value: "pressure", label: "Pressure P from Q, K" },
    { value: "k", label: "K from Q, P" },
  ]);
  const k = _v23f_makeNumber("K-factor (nameplate)", "skf-k", { step: "any", min: "0", value: "5.6" });
  k.input.value = "5.6";
  const p = _v23f_makeNumber("Pressure (psi)", "skf-p", { step: "any", min: "0", value: "7" });
  p.input.value = "7";
  const q = _v23f_makeNumber("Flow (gpm)", "skf-q", { step: "any", min: "0" });
  for (const f of [mode, k, p, q]) inputRegion.appendChild(f.wrap);
  _v23f_attachEx(inputRegion, () => { mode.select.value = "flow"; k.input.value = "5.6"; p.input.value = "7"; q.input.value = ""; update(); });
  const oOut = _v23f_makeOut(outputRegion, "Result", "skf-out");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23f_debounce(() => {
    const r = computeSprinklerKFactor({ solve_for: mode.select.value, flow_gpm: readNum(q.input), pressure_psi: readNum(p.input), k_factor: readNum(k.input) });
    if (r.error) { oOut.textContent = r.error; return; }
    if (r.solve_for === "pressure") oOut.textContent = _v23f_fmt(r.pressure_psi, 2) + " psi";
    else if (r.solve_for === "k") oOut.textContent = "K = " + _v23f_fmt(r.k_factor, 2);
    else oOut.textContent = _v23f_fmt(r.flow_gpm, 2) + " gpm";
  }, _V23F_DEB);
  for (const f of [mode.select, k.input, p.input, q.input]) f.addEventListener("input", update);
}
FIRE_RENDERERS["sprinkler-k-factor"] = renderSprinklerKFactor;

// ===========================================================================
// spec-v20 Phase F - two new fire-ground tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 F.1: Elevation pressure loss/gain (`elevation-pressure-loss`) ---
// Exact P = 0.434 * dH_ft; rule of thumb ~5 psi/floor (~10-ft floors).
// dims: in { mode: dimensionless, value: dimensionless, floor_height_ft: L, direction: dimensionless } out: { exact_psi: M*L^-1*T^-2, rule_psi: M*L^-1*T^-2 }
export function computeElevationPressureLoss({ mode = "floors", value = 0, floor_height_ft = 10, direction = "up" } = {}) {
  const v = Number(value) || 0;
  const fh = Number(floor_height_ft) || 0;
  if (!Number.isFinite(v) || v < 0) return { error: "Elevation change / floor count must be non-negative." };
  if (mode === "floors" && !(fh > 0 && Number.isFinite(fh))) return { error: "Floor height must be positive (ft)." };
  const elevFt = mode === "floors" ? v * fh : v;
  const floors = mode === "floors" ? v : (fh > 0 ? v / fh : 0);
  const exact = 0.434 * elevFt;
  const rule = 5 * floors;
  const sign = direction === "down" ? -1 : 1; // up = loss (positive), down = gain (negative)
  return {
    elevation_ft: Number.isFinite(elevFt) ? elevFt : null,
    exact_psi: Number.isFinite(exact * sign) ? exact * sign : null,
    rule_psi: Number.isFinite(rule * sign) ? rule * sign : null,
    is_gain: direction === "down",
    note: "Exact hydrostatic 0.434 psi/ft vs. the fire-ground 5-psi/floor rule (assumes 10-ft floors) - both shown so you see the divergence. Climbing is a loss, descending a gain. Friction loss is not included.",
  };
}
export const elevationPressureLossExample = { inputs: { mode: "floors", value: 9, floor_height_ft: 10, direction: "up" } };

function renderElevationPressureLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hydrostatic head 0.434 psi/ft (public). Fire-ground '5 psi per floor' standpipe approximation per IFSTA Pumping Apparatus Driver/Operator and the NFPA 14 design basis, by name. Feeds the pump discharge pressure tiles; distinct from pdp / standpipe-pdp which bundle friction and nozzle pressure.";
  const mode = makeSelect("Input mode", "epl-mode", [{ value: "floors", label: "Number of floors", selected: true }, { value: "feet", label: "Elevation change (ft)" }]);
  const val = makeNumber("Floors or feet", "epl-val", { step: "any", min: "0", value: "9" });
  val.input.value = "9";
  const fh = makeNumber("Floor height (ft)", "epl-fh", { step: "any", min: "0", value: "10" });
  fh.input.value = "10";
  const dir = makeSelect("Direction", "epl-dir", [{ value: "up", label: "Up (loss)", selected: true }, { value: "down", label: "Down (gain)" }]);
  for (const f of [mode, val, fh, dir]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "floors"; val.input.value = "9"; fh.input.value = "10"; dir.select.value = "up"; update(); });
  const oExact = makeOutputLine(outputRegion, "Exact (0.434 psi/ft)", "epl-out-exact");
  const oRule = makeOutputLine(outputRegion, "Rule of thumb (5 psi/floor)", "epl-out-rule");
  const oNote = makeOutputLine(outputRegion, "Note", "epl-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeElevationPressureLoss({ mode: mode.select.value, value: readNum(val.input), floor_height_ft: readNum(fh.input), direction: dir.select.value });
    if (r.error) { oExact.textContent = r.error; oRule.textContent = ""; oNote.textContent = ""; return; }
    oExact.textContent = fmt(r.exact_psi, 1) + " psi " + (r.is_gain ? "(gain)" : "(loss)");
    oRule.textContent = fmt(r.rule_psi, 1) + " psi " + (r.is_gain ? "(gain)" : "(loss)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mode.select, val.input, fh.input, dir.select]) f.addEventListener("input", update);
}
FIRE_RENDERERS["elevation-pressure-loss"] = renderElevationPressureLoss;

// --- v20 F.2: Water-supply duration (`water-supply-duration`) ---
// t = V / GPM; with resupply R: if R >= GPM, sustained; else t = V/(GPM-R).
// dims: in { volume_gal: L^3, flow_gpm: L^3*T^-1, resupply_gpm: L^3*T^-1 } out: { duration_min: T, net_drain_gpm: L^3*T^-1 }
export function computeWaterSupplyDuration({ volume_gal = 0, flow_gpm = 0, resupply_gpm = 0 } = {}) {
  const V = Number(volume_gal) || 0;
  const Q = Number(flow_gpm) || 0;
  const R = Number(resupply_gpm) || 0;
  if (!(V > 0 && Number.isFinite(V))) return { error: "Available water volume must be positive (gal)." };
  if (!(Q > 0 && Number.isFinite(Q))) return { error: "Required flow must be positive (GPM)." };
  if (R < 0 || !Number.isFinite(R)) return { error: "Resupply rate must be non-negative (GPM)." };
  if (R >= Q) {
    return { duration_min: null, sustained: true, net_drain_gpm: 0, sustainable_flow_gpm: R, note: "Resupply meets or exceeds demand - supply is effectively sustained. Sustainable flow equals the resupply rate. Usable tank volume is less than nominal (draft losses)." };
  }
  const net = Q - R;
  const t = V / net;
  return {
    duration_min: Number.isFinite(t) ? t : null,
    sustained: false,
    net_drain_gpm: Number.isFinite(net) ? net : null,
    sustainable_flow_gpm: null,
    note: "Constant flow assumed. Usable tank volume is less than nominal (draft losses). Distinct from nfpa-1142-water-supply (which sizes required supply) and scba-cylinder-time (air, not water).",
  };
}
export const waterSupplyDurationExample = { inputs: { volume_gal: 3000, flow_gpm: 250, resupply_gpm: 0 } };

function renderWaterSupplyDuration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Volume/flow continuity (first principles). Required-duration context per NFPA 1142 (rural/suburban water supply), by name. Distinct from nfpa-1142-water-supply (which sizes required supply from the structure) and scba-cylinder-time (air, not water). NFPA 1142 free read-only at nfpa.org/freeaccess.";
  const vol = makeNumber("Available water volume (gal)", "wsd-v", { step: "any", min: "0", value: "3000" });
  vol.input.value = "3000";
  const flow = makeNumber("Required / selected flow (GPM)", "wsd-q", { step: "any", min: "0", value: "250" });
  flow.input.value = "250";
  const re = makeNumber("Continuous resupply rate (GPM, optional)", "wsd-r", { step: "any", min: "0" });
  for (const f of [vol, flow, re]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vol.input.value = "3000"; flow.input.value = "250"; re.input.value = ""; update(); });
  const oDur = makeOutputLine(outputRegion, "Sustainable duration", "wsd-out-dur");
  const oNet = makeOutputLine(outputRegion, "Net drawdown / sustainable flow", "wsd-out-net");
  const oNote = makeOutputLine(outputRegion, "Note", "wsd-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWaterSupplyDuration({ volume_gal: readNum(vol.input), flow_gpm: readNum(flow.input), resupply_gpm: readNum(re.input) });
    if (r.error) { oDur.textContent = r.error; oNet.textContent = ""; oNote.textContent = ""; return; }
    oDur.textContent = r.sustained ? "Effectively sustained" : fmt(r.duration_min, 1) + " min";
    oNet.textContent = r.sustained ? "Sustainable flow " + fmt(r.sustainable_flow_gpm, 0) + " GPM" : "Net drain " + fmt(r.net_drain_gpm, 0) + " GPM";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vol.input, flow.input, re.input]) f.addEventListener("input", update);
}
FIRE_RENDERERS["water-supply-duration"] = renderWaterSupplyDuration;
