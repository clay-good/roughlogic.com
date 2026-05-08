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

export function computePDP({ nozzle_pressure_psi, friction_loss_psi, elevation_ft = 0, appliance_loss_psi = 0 }) {
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

export function computeHydrantFlow({ pitot_psi, outlet_diameter_in, c = 0.9 }) {
  return { flow_gpm: hydrantFlow({ pitot_psi, outlet_diameter_in, c }), coefficient_of_discharge: c };
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

export function computeRequiredFireFlow({ structure_area_ft2, construction_class = "ordinary", occupancy_factor = 1.0, exposure_factor = 1.0, communication_factor = 1.0 }) {
  const F = ISO_CONSTRUCTION_FACTORS[construction_class];
  if (!F) return { error: "Unknown construction class." };
  const C = 18 * F * Math.sqrt(structure_area_ft2);
  let NFF = C * occupancy_factor * exposure_factor * communication_factor;
  NFF = Math.round(NFF / 250) * 250; // round to nearest 250 gpm per ISO practice
  // ISO maximum guideline: 12000 gpm.
  NFF = Math.min(NFF, 12000);
  return { needed_fire_flow_gpm: NFF, base_C_gpm: Math.round(C), construction_factor: F };
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

export function computeMasterStreamReach({ nozzle_type, nozzle_pressure_psi }) {
  const t = MASTER_STREAM_TYPES[nozzle_type];
  if (!t) return { error: "Unknown nozzle type." };
  // Reach scales as sqrt(P / P_typical) of base reach.
  const reach = t.base_reach_ft * Math.sqrt(nozzle_pressure_psi / t.typical_pressure_psi);
  return { typical_reach_ft: reach, nozzle_type, base_reach_ft: t.base_reach_ft, typical_pressure_psi: t.typical_pressure_psi };
}

export const masterStreamExample = {
  inputs: { nozzle_type: "smooth_bore_2", nozzle_pressure_psi: 80 },
  expected: { typical_reach_ft: 100 },
};

// --- Utility 56: Aerial Ladder Reach ---

export function computeAerialLadderReach({ angle_deg, extension_ft }) {
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

export function computeFoam({ fire_area_ft2, application_rate_gpm_per_ft2 = 0.10, foam_percentage = 3, duration_min = 15 }) {
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

export function computeSmokeReading() { return { reference: SMOKE_READING }; }

// --- Renderers ---

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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
  const update = debounce(() => {
    const r = computeHydrantFlow({ pitot_psi: Number(P.input.value) || 0, outlet_diameter_in: Number(d.input.value) || 0, c: Number(c.input.value) || 0.9 });
    oQ.textContent = fmt(r.flow_gpm, 0) + " gpm";
  }, DEBOUNCE_MS);
  for (const el of [P.input, d.input, c.input]) el.addEventListener("input", update);
}

export function renderRequiredFireFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IFC 2021 Table B105.1 (ISO needed-fire-flow method). NFF = C × O × X × P; C = 18 × F × sqrt(A). AHJ governs. Free at codes.iccsafe.org.";
  const A = makeNumber("Structure area (ft^2)", "rff-a", { step: "any", min: "0" });
  const cls = makeSelect("Construction class", "rff-c", Object.keys(ISO_CONSTRUCTION_FACTORS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const O = makeNumber("Occupancy factor", "rff-o", { step: "any", min: "0", value: "1.0" });
  O.input.value = "1.0";
  const X = makeNumber("Exposure factor", "rff-x", { step: "any", min: "0", value: "1.0" });
  X.input.value = "1.0";
  const Pf = makeNumber("Communication factor", "rff-p", { step: "any", min: "0", value: "1.0" });
  Pf.input.value = "1.0";
  for (const f of [A, cls, O, X, Pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { A.input.value = "5000"; cls.select.value = "ordinary"; O.input.value = "1.0"; X.input.value = "1.0"; Pf.input.value = "1.0"; update(); });
  const oN = makeOutputLine(outputRegion, "Needed fire flow", "rff-out");
  const oC = makeOutputLine(outputRegion, "Base C", "rff-out-c");
  const update = debounce(() => {
    const r = computeRequiredFireFlow({
      structure_area_ft2: Number(A.input.value) || 0,
      construction_class: cls.select.value,
      occupancy_factor: Number(O.input.value) || 1.0,
      exposure_factor: Number(X.input.value) || 1.0,
      communication_factor: Number(Pf.input.value) || 1.0,
    });
    if (r.error) { oN.textContent = r.error; oC.textContent = "-"; return; }
    oN.textContent = String(r.needed_fire_flow_gpm) + " gpm";
    oC.textContent = String(r.base_C_gpm);
  }, DEBOUNCE_MS);
  for (const el of [A.input, cls.select, O.input, X.input, Pf.input]) el.addEventListener("input", update);
}

export function renderMasterStream(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Reach scales as sqrt(P/P_typical) of the published base reach for each nozzle type.";
  const t = makeSelect("Nozzle type", "ms-t", Object.keys(MASTER_STREAM_TYPES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const p = makeNumber("Nozzle pressure (psi)", "ms-p", { step: "any", min: "0" });
  for (const f of [t, p]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.select.value = "smooth_bore_2"; p.input.value = "80"; update(); });
  const oR = makeOutputLine(outputRegion, "Typical reach", "ms-out");
  const update = debounce(() => {
    const r = computeMasterStreamReach({ nozzle_type: t.select.value, nozzle_pressure_psi: Number(p.input.value) || 0 });
    if (r.error) { oR.textContent = r.error; return; }
    oR.textContent = fmt(r.typical_reach_ft, 1) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [t.select, p.input]) el.addEventListener("input", update);
}

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

export function computeReverseLayFriction({ hose_diameter, gpm, length_ft, n_pumps = 1 }) {
  const C = HOSE_FRICTION_COEFFICIENTS[hose_diameter];
  if (C === undefined) return { error: "Unknown hose diameter." };
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

export function computeLadderPipeReach({ angle_deg, extension_ft, nozzle_type, nozzle_pressure_psi }) {
  const ladder = computeAerialLadderReach({ angle_deg, extension_ft });
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

export function renderSprinklerDensity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per NFPA 13-2022 Table 12.1 (hazard density). total_gpm = area × density (gpm/ft²). AHJ governs. Free at nfpa.org/freeaccess.";
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

export function renderStandpipeFriction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per NFPA 14-2022 (standpipes). Elevation 0.434 psi/ft of water; CQ²L friction per outlet hose section. AHJ governs. Free at nfpa.org/freeaccess.";
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
