// Group B: Plumbing and Gas calculators (utilities 12 through 20).

import {
  hazenWilliamsFrictionLoss,
  feetOfHeadToPsi,
  darcyWeisbachFrictionLoss,
} from "./pure-math.js";

// --- Utility 12: Pipe Sizing (Hunter's Curve) ---

// Fixture units per fixture (Hunter's Curve method per public-domain plumbing
// engineering texts; values reflect public-domain consensus).
export const FIXTURE_UNITS = {
  lavatory: { wsfu_total: 1, dfu: 1 },
  water_closet_flush_tank: { wsfu_total: 2.5, dfu: 3 },
  water_closet_flush_valve: { wsfu_total: 6, dfu: 6 },
  shower: { wsfu_total: 2, dfu: 2 },
  bathtub: { wsfu_total: 4, dfu: 2 },
  kitchen_sink: { wsfu_total: 1.5, dfu: 2 },
  laundry_tray: { wsfu_total: 1.5, dfu: 2 },
  dishwasher: { wsfu_total: 1.5, dfu: 2 },
  hose_bibb: { wsfu_total: 2.5, dfu: 0 },
};

// Hunter's Curve estimate (gpm from total WSFU) - flush-tank predominant.
// Values represent public-domain Hunter's Curve at typical points.
export const HUNTERS_CURVE = [
  { wsfu: 1, gpm: 3 },
  { wsfu: 5, gpm: 8 },
  { wsfu: 10, gpm: 12 },
  { wsfu: 20, gpm: 18 },
  { wsfu: 40, gpm: 26 },
  { wsfu: 80, gpm: 38 },
  { wsfu: 150, gpm: 55 },
  { wsfu: 300, gpm: 88 },
];

function huntersFlowFromWSFU(wsfu) {
  if (wsfu <= 0) return 0;
  if (wsfu <= HUNTERS_CURVE[0].wsfu) return HUNTERS_CURVE[0].gpm * (wsfu / HUNTERS_CURVE[0].wsfu);
  for (let i = 1; i < HUNTERS_CURVE.length; i++) {
    if (wsfu <= HUNTERS_CURVE[i].wsfu) {
      const a = HUNTERS_CURVE[i - 1];
      const b = HUNTERS_CURVE[i];
      const t = (wsfu - a.wsfu) / (b.wsfu - a.wsfu);
      return a.gpm + t * (b.gpm - a.gpm);
    }
  }
  // Above table: extend linearly using last slope.
  const a = HUNTERS_CURVE[HUNTERS_CURVE.length - 2];
  const b = HUNTERS_CURVE[HUNTERS_CURVE.length - 1];
  const slope = (b.gpm - a.gpm) / (b.wsfu - a.wsfu);
  return b.gpm + slope * (wsfu - b.wsfu);
}

// Recommended minimum size by demand gpm (typical plumbing engineering).
export function recommendedSupplySize(gpm) {
  if (gpm <= 4) return "1/2";
  if (gpm <= 12) return "3/4";
  if (gpm <= 25) return "1";
  if (gpm <= 50) return "1-1/4";
  if (gpm <= 80) return "1-1/2";
  return "2 or larger";
}

// Drainage minimum size by total DFU (consensus engineering values).
export function recommendedDrainageSize(dfu, slope_in_per_ft = 0.25) {
  // Slope-aware approximation; consensus values for 1/4-in/ft slope.
  if (slope_in_per_ft >= 0.5) {
    if (dfu <= 6) return "2";
    if (dfu <= 21) return "3";
    if (dfu <= 96) return "4";
    return "6 or larger";
  }
  if (dfu <= 6) return "2";
  if (dfu <= 16) return "3";
  if (dfu <= 84) return "4";
  return "6 or larger";
}

export function computePipeSizing({ fixtures, slope_in_per_ft = 0.25 }) {
  let wsfu = 0;
  let dfu = 0;
  for (const f of fixtures || []) {
    const v = FIXTURE_UNITS[f.fixture];
    if (!v) return { error: "Unknown fixture: " + f.fixture };
    const c = f.count || 1;
    wsfu += (v.wsfu_total || 0) * c;
    dfu += (v.dfu || 0) * c;
  }
  const gpm = huntersFlowFromWSFU(wsfu);
  return {
    total_wsfu: wsfu,
    total_dfu: dfu,
    estimated_demand_gpm: gpm,
    recommended_supply_size: recommendedSupplySize(gpm),
    recommended_drainage_size: recommendedDrainageSize(dfu, slope_in_per_ft),
  };
}

export const pipeSizingExample = {
  inputs: { fixtures: [
    { fixture: "lavatory", count: 2 },
    { fixture: "water_closet_flush_tank", count: 2 },
    { fixture: "shower", count: 1 },
    { fixture: "kitchen_sink", count: 1 },
  ]},
  expected: { total_wsfu: 2*1 + 2*2.5 + 2 + 1.5 },
};

// --- Utility 13: Friction Loss ---

// Schedule 40 internal diameters in inches.
export const SCH40_ID_IN = {
  "0.5": 0.622, "0.75": 0.824, "1": 1.049, "1.25": 1.380, "1.5": 1.610,
  "2": 2.067, "2.5": 2.469, "3": 3.068, "4": 4.026,
};

export const HAZEN_C = {
  PVC: 150, CPVC: 150, copper: 140, steel_new: 120, steel_old: 100, pex: 150,
};

export function computeFrictionLoss({ method, material, nominal_size, length_ft, flow_gpm, internal_diameter_in }) {
  const d = internal_diameter_in || SCH40_ID_IN[String(nominal_size)];
  if (!d) return { error: "Unknown nominal size; provide internal diameter directly." };

  if (method === "hazen-williams") {
    const C = HAZEN_C[material];
    if (!C) return { error: "Unknown material for Hazen-Williams." };
    const headLoss_ft = hazenWilliamsFrictionLoss({ flow_gpm, internal_diameter_in: d, length_ft, C });
    return { headLoss_ft, pressureLoss_psi: feetOfHeadToPsi(headLoss_ft) };
  }

  if (method === "darcy-weisbach") {
    // For water at 60 F by default.
    const rho = 999.0;
    const mu = 1.124e-3;
    const eps = 1.5e-6; // smooth pipe default
    const d_m = d * 0.0254;
    const A_m2 = Math.PI * (d_m / 2) ** 2;
    const Q_m3_s = (flow_gpm * 0.003785411784) / 60;
    const v_m_s = Q_m3_s / A_m2;
    const L_m = length_ft * 0.3048;
    const h_m = darcyWeisbachFrictionLoss({
      internal_diameter_m: d_m, length_m: L_m, velocity_m_s: v_m_s,
      density_kg_m3: rho, viscosity_Pa_s: mu, roughness_m: eps,
    });
    const headLoss_ft = h_m / 0.3048;
    return { headLoss_ft, pressureLoss_psi: feetOfHeadToPsi(headLoss_ft), velocity_ft_s: v_m_s / 0.3048 };
  }

  return { error: "Unknown method." };
}

export const frictionLossExample = {
  inputs: { method: "hazen-williams", material: "PVC", nominal_size: "1", length_ft: 100, flow_gpm: 10 },
  expectedRange: { pressureLoss_psi: { min: 0.5, max: 2.0 } },
};

// --- Utility 14: Pipe Volume ---

export function computePipeVolume({ internal_diameter_in, length_ft, nominal_size }) {
  const d = internal_diameter_in || SCH40_ID_IN[String(nominal_size)];
  if (!d) return { error: "Unknown nominal size; provide internal diameter directly." };
  // V (in^3) = pi/4 * d^2 * L_in. 1 gal = 231 in^3.
  const L_in = length_ft * 12;
  const v_in3 = (Math.PI / 4) * d * d * L_in;
  const gallons = v_in3 / 231;
  const cubic_feet = v_in3 / 1728;
  return { gallons, gallons_per_ft: gallons / length_ft, cubic_feet };
}

export const pipeVolumeExample = {
  inputs: { nominal_size: "1", length_ft: 100 },
  expectedRange: { gallons: { min: 4.0, max: 4.8 } },
};

// --- Utility 15: Pump Sizing ---

export function computePumpSize({ flow_gpm, total_dynamic_head_ft, efficiency = 0.65, fluid_specific_gravity = 1 }) {
  // Hydraulic horsepower: HP_h = (Q * H * SG) / 3960.  Pump shaft hp = HP_h / efficiency.
  const hp_h = (flow_gpm * total_dynamic_head_ft * fluid_specific_gravity) / 3960;
  const hp_shaft = efficiency > 0 ? hp_h / efficiency : null;
  return { hydraulic_hp: hp_h, shaft_hp: hp_shaft };
}

export const pumpSizingExample = {
  inputs: { flow_gpm: 100, total_dynamic_head_ft: 80, efficiency: 0.65 },
  expectedRange: { shaft_hp: { min: 2.5, max: 4.0 } },
};

// --- Utility 16: Static Pressure Loss in Piping ---

export function computeStaticPressureLossPiping({ elevation_change_ft, friction_loss_psi = 0, fluid_density_lb_ft3 = 62.4 }) {
  const elev_psi = (elevation_change_ft * fluid_density_lb_ft3) / 144;
  return { elevation_loss_psi: elev_psi, friction_loss_psi, total_psi: elev_psi + friction_loss_psi };
}

export const staticPressurePipingExample = {
  inputs: { elevation_change_ft: 30, friction_loss_psi: 5 },
  expected: { total_psi_approx: 30 / 2.31 + 5 },
};

// --- Utility 17: Gas Pipe Sizing ---

// Spitzglass formula (low-pressure gas, < 1.5 psig). Q in cubic feet per hour.
//   Q = 3550 * sqrt( d^5 * dP / (SG * L) )
// where d is internal diameter in inches, dP is pressure drop in inches w.c.,
// SG is specific gravity, and L is length in feet.
export function spitzglassFlow({ d_in, dP_in_wc, specific_gravity, L_ft }) {
  if (L_ft <= 0 || d_in <= 0) return 0;
  return 3550 * Math.sqrt((Math.pow(d_in, 5) * dP_in_wc) / (specific_gravity * L_ft));
}

export const GAS_PROPERTIES = {
  natural_gas: { specific_gravity: 0.60, heating_value_btu_ft3: 1030 },
  propane: { specific_gravity: 1.52, heating_value_btu_ft3: 2516 },
};

export function computeGasPipeSizing({ btu_load, length_ft, gas, dP_in_wc = 0.5, candidate_sizes = ["0.5", "0.75", "1", "1.25", "1.5", "2"] }) {
  const props = GAS_PROPERTIES[gas];
  if (!props) return { error: "Unknown gas." };
  const required_cfh = btu_load / props.heating_value_btu_ft3;
  for (const size of candidate_sizes) {
    const d = SCH40_ID_IN[size];
    if (!d) continue;
    const capacity = spitzglassFlow({ d_in: d, dP_in_wc, specific_gravity: props.specific_gravity, L_ft: length_ft });
    if (capacity >= required_cfh) {
      return { required_cfh, recommended_size: size, capacity_cfh: capacity, dP_in_wc };
    }
  }
  return { required_cfh, recommended_size: "larger than " + candidate_sizes[candidate_sizes.length - 1], capacity_cfh: null };
}

export const gasPipeSizingExample = {
  inputs: { btu_load: 100000, length_ft: 50, gas: "natural_gas" },
};

// --- Utility 18: Slope ---

export function computeSlope({ rise, run, units = "in_per_ft" }) {
  if (run === 0) return { error: "Run cannot be zero." };
  let in_per_ft;
  if (units === "in_per_ft") in_per_ft = rise; // rise is already in inches per foot
  else if (units === "rise_run") in_per_ft = (rise / run) * 12; // rise and run in same units
  else return { error: "Unknown units." };
  const fraction = in_per_ft / 12;
  const percent = fraction * 100;
  const degrees = Math.atan(fraction) * (180 / Math.PI);
  return { in_per_ft, percent, degrees, fraction };
}

export const slopeExample = {
  inputs: { rise: 1, run: 4, units: "rise_run" },
  expected: { in_per_ft: 3 },
};

// --- Utility 19: Pressure Conversion ---

export function pressureConvert({ value, from, to }) {
  // Convert all to Pa first.
  const toPa = {
    psi: 6894.757293168,
    kPa: 1000,
    bar: 100000,
    in_h2o: 248.84,
    ft_h2o: 2989.067,
    Pa: 1,
    atm: 101325,
  };
  const aPa = toPa[from];
  const bPa = toPa[to];
  if (!aPa || !bPa) return { error: "Unknown unit." };
  const Pa = value * aPa;
  return { value: Pa / bPa };
}

export const pressureConversionExample = {
  inputs: { value: 1, from: "atm", to: "psi" },
  expectedRange: { value: { min: 14.69, max: 14.7 } },
};

// --- Utility 20: Backflow Reference (data only) ---

export const BACKFLOW_REFERENCE = [
  { scenario: "Hose bibb to grade or yard", typical_preventer: "Atmospheric vacuum breaker (AVB) or hose-bibb vacuum breaker." },
  { scenario: "Lawn irrigation, no chemicals", typical_preventer: "Pressure vacuum breaker (PVB)." },
  { scenario: "Lawn irrigation with chemicals or boilers", typical_preventer: "Reduced-pressure principle assembly (RPZ)." },
  { scenario: "Fire sprinkler systems", typical_preventer: "Double-check valve assembly (DCVA) or RPZ depending on hazard." },
  { scenario: "Commercial dishwasher", typical_preventer: "Air gap or RPZ depending on chemical use." },
  { scenario: "Boiler with chemical treatment", typical_preventer: "RPZ." },
];

export function computeBackflow() { return { reference: BACKFLOW_REFERENCE }; }

export const backflowExample = { inputs: {} };

// --- Renderers ---
//
// Lighter-weight renderer set than the electrical group: each calculator
// constructs inputs and an output region wired to compute().

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export function renderPipeSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hunter's Curve fixture-unit method (Hunter 1940; NBS BMS65). Public-domain methodology.";
  const fixtures = Object.keys(FIXTURE_UNITS);
  const rows = [];
  for (const f of fixtures) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const lab = document.createElement("label"); lab.textContent = f.replace(/_/g, " "); lab.htmlFor = "ps-" + f;
    const inp = document.createElement("input"); inp.type = "number"; inp.id = "ps-" + f; inp.inputMode = "decimal"; inp.min = "0"; inp.value = "";
    wrap.appendChild(lab); wrap.appendChild(inp); inputRegion.appendChild(wrap);
    rows.push({ key: f, input: inp });
  }
  attachExampleButton(inputRegion, () => {
    const ex = { lavatory: 2, water_closet_flush_tank: 2, shower: 1, kitchen_sink: 1 };
    for (const r of rows) r.input.value = ex[r.key] || "";
    update();
  });
  const oWSFU = makeOutputLine(outputRegion, "Total WSFU", "ps-out-wsfu");
  const oGPM = makeOutputLine(outputRegion, "Estimated demand", "ps-out-gpm");
  const oSup = makeOutputLine(outputRegion, "Recommended supply size", "ps-out-sup");
  const oDFU = makeOutputLine(outputRegion, "Total DFU", "ps-out-dfu");
  const oDr = makeOutputLine(outputRegion, "Recommended drainage size", "ps-out-dr");
  const update = debounce(() => {
    const fx = rows.map((r) => ({ fixture: r.key, count: Number(r.input.value) || 0 })).filter((f) => f.count > 0);
    const r = computePipeSizing({ fixtures: fx });
    if (r.error) { oWSFU.textContent = r.error; return; }
    oWSFU.textContent = fmt(r.total_wsfu, 1);
    oGPM.textContent = fmt(r.estimated_demand_gpm, 1) + " gpm";
    oSup.textContent = r.recommended_supply_size + "\"";
    oDFU.textContent = fmt(r.total_dfu, 1);
    oDr.textContent = r.recommended_drainage_size + "\"";
  }, DEBOUNCE_MS);
  for (const r of rows) r.input.addEventListener("input", update);
}

export function renderFrictionLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hazen-Williams (Hazen and Williams 1905, public domain) for water; Darcy-Weisbach with Colebrook-White friction factor for general fluid use.";
  const method = makeSelect("Method", "fl-method", [
    { value: "hazen-williams", label: "Hazen-Williams (water)" },
    { value: "darcy-weisbach", label: "Darcy-Weisbach (water)" },
  ]);
  const material = makeSelect("Material", "fl-mat", Object.keys(HAZEN_C).map((m) => ({ value: m, label: m })));
  const size = makeSelect("Nominal Sch 40 size", "fl-size", Object.keys(SCH40_ID_IN).map((s) => ({ value: s, label: s + "\""})));
  const length = makeNumber("Length (ft)", "fl-len", { step: "any", min: "0" });
  const flow = makeNumber("Flow (gpm)", "fl-flow", { step: "any", min: "0" });
  for (const f of [method, material, size, length, flow]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    method.select.value = "hazen-williams"; material.select.value = "PVC"; size.select.value = "1";
    length.input.value = "100"; flow.input.value = "10"; update();
  });
  const oH = makeOutputLine(outputRegion, "Head loss", "fl-out-h");
  const oP = makeOutputLine(outputRegion, "Pressure loss", "fl-out-p");
  const update = debounce(() => {
    const r = computeFrictionLoss({
      method: method.select.value,
      material: material.select.value,
      nominal_size: size.select.value,
      length_ft: Number(length.input.value) || 0,
      flow_gpm: Number(flow.input.value) || 0,
    });
    if (r.error) { oH.textContent = r.error; oP.textContent = "-"; return; }
    oH.textContent = fmt(r.headLoss_ft, 2) + " ft of head";
    oP.textContent = fmt(r.pressureLoss_psi, 2) + " psi";
  }, DEBOUNCE_MS);
  for (const el of [method.select, material.select, size.select, length.input, flow.input]) el.addEventListener("input", update);
}

export function renderPipeVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: V = (pi/4) * d^2 * L. 1 US gallon = 231 in^3.";
  const size = makeSelect("Nominal Sch 40 size", "pv-size", Object.keys(SCH40_ID_IN).map((s) => ({ value: s, label: s + "\""})));
  const length = makeNumber("Length (ft)", "pv-len", { step: "any", min: "0" });
  for (const f of [size, length]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { size.select.value = "1"; length.input.value = "100"; update(); });
  const oG = makeOutputLine(outputRegion, "Volume", "pv-out-g");
  const oPF = makeOutputLine(outputRegion, "Per foot", "pv-out-pf");
  const update = debounce(() => {
    const r = computePipeVolume({ nominal_size: size.select.value, length_ft: Number(length.input.value) || 0 });
    if (r.error) { oG.textContent = r.error; return; }
    oG.textContent = fmt(r.gallons, 2) + " gal (" + fmt(r.cubic_feet, 3) + " ft^3)";
    oPF.textContent = fmt(r.gallons_per_ft, 4) + " gal/ft";
  }, DEBOUNCE_MS);
  for (const el of [size.select, length.input]) el.addEventListener("input", update);
}

export function renderPumpSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hydraulic horsepower HP_h = (Q * H * SG) / 3960; shaft hp = HP_h / efficiency.";
  const flow = makeNumber("Flow (gpm)", "pm-q", { step: "any", min: "0" });
  const tdh = makeNumber("Total dynamic head (ft)", "pm-h", { step: "any", min: "0" });
  const eff = makeNumber("Pump efficiency (0-1)", "pm-e", { step: "any", min: "0", max: "1", value: "0.65" });
  eff.input.value = "0.65";
  for (const f of [flow, tdh, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "100"; tdh.input.value = "80"; eff.input.value = "0.65"; update(); });
  const oH = makeOutputLine(outputRegion, "Hydraulic hp", "pm-out-h");
  const oS = makeOutputLine(outputRegion, "Shaft hp", "pm-out-s");
  const update = debounce(() => {
    const r = computePumpSize({ flow_gpm: Number(flow.input.value) || 0, total_dynamic_head_ft: Number(tdh.input.value) || 0, efficiency: Number(eff.input.value) || 0.65 });
    oH.textContent = fmt(r.hydraulic_hp, 2);
    oS.textContent = r.shaft_hp === null ? "-" : fmt(r.shaft_hp, 2);
  }, DEBOUNCE_MS);
  for (const el of [flow.input, tdh.input, eff.input]) el.addEventListener("input", update);
}

export function renderStaticPressurePiping(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pressure from elevation = rho * g * h. For water at 60 F, 1 ft of head ~ 0.433 psi.";
  const elev = makeNumber("Elevation change (ft)", "sp-e", { step: "any" });
  const fric = makeNumber("Friction loss (psi)", "sp-f", { step: "any", min: "0", value: "0" });
  fric.input.value = "0";
  for (const f of [elev, fric]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { elev.input.value = "30"; fric.input.value = "5"; update(); });
  const oE = makeOutputLine(outputRegion, "Elevation loss", "sp-out-e");
  const oT = makeOutputLine(outputRegion, "Total", "sp-out-t");
  const update = debounce(() => {
    const r = computeStaticPressureLossPiping({ elevation_change_ft: Number(elev.input.value) || 0, friction_loss_psi: Number(fric.input.value) || 0 });
    oE.textContent = fmt(r.elevation_loss_psi, 2) + " psi";
    oT.textContent = fmt(r.total_psi, 2) + " psi";
  }, DEBOUNCE_MS);
  for (const el of [elev.input, fric.input]) el.addEventListener("input", update);
}

export function renderGasPipeSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Spitzglass low-pressure gas formula. Q = 3550 * sqrt(d^5 * dP / (SG * L)). Public engineering equation.";
  const btu = makeNumber("BTU load (BTU/hr)", "gp-btu", { step: "any", min: "0" });
  const length = makeNumber("Pipe length (ft)", "gp-len", { step: "any", min: "0" });
  const dP = makeNumber("Allowable pressure drop (in w.c.)", "gp-dp", { step: "any", min: "0", value: "0.5" });
  dP.input.value = "0.5";
  const gas = makeSelect("Gas", "gp-gas", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  for (const f of [btu, length, dP, gas]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { btu.input.value = "100000"; length.input.value = "50"; dP.input.value = "0.5"; gas.select.value = "natural_gas"; update(); });
  const oR = makeOutputLine(outputRegion, "Required capacity", "gp-out-r");
  const oS = makeOutputLine(outputRegion, "Recommended size", "gp-out-s");
  const update = debounce(() => {
    const r = computeGasPipeSizing({
      btu_load: Number(btu.input.value) || 0, length_ft: Number(length.input.value) || 0,
      gas: gas.select.value, dP_in_wc: Number(dP.input.value) || 0.5,
    });
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; return; }
    oR.textContent = fmt(r.required_cfh, 1) + " ft^3/hr";
    oS.textContent = String(r.recommended_size).includes("larger") ? r.recommended_size : (r.recommended_size + "\"");
  }, DEBOUNCE_MS);
  for (const el of [btu.input, length.input, dP.input, gas.select]) el.addEventListener("input", update);
}

export function renderSlope(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Geometric slope. 1/4 inch per foot equals approximately 2.08 percent or 1.19 degrees.";
  const rise = makeNumber("Rise", "sl-r", { step: "any" });
  const run = makeNumber("Run (same units as rise)", "sl-rn", { step: "any", min: "0" });
  for (const f of [rise, run]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rise.input.value = "1"; run.input.value = "4"; update(); });
  const oI = makeOutputLine(outputRegion, "Inches per foot", "sl-out-i");
  const oP = makeOutputLine(outputRegion, "Percent", "sl-out-p");
  const oD = makeOutputLine(outputRegion, "Degrees", "sl-out-d");
  const update = debounce(() => {
    const r = computeSlope({ rise: Number(rise.input.value) || 0, run: Number(run.input.value) || 0, units: "rise_run" });
    if (r.error) { oI.textContent = r.error; oP.textContent = "-"; oD.textContent = "-"; return; }
    oI.textContent = fmt(r.in_per_ft, 3); oP.textContent = fmt(r.percent, 2) + " %"; oD.textContent = fmt(r.degrees, 2);
  }, DEBOUNCE_MS);
  for (const el of [rise.input, run.input]) el.addEventListener("input", update);
}

export function renderPressureConversion(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NIST SP 811 unit factors. 1 psi = 6894.757 Pa; 1 atm = 101325 Pa; 1 in w.c. = 248.84 Pa.";
  const value = makeNumber("Value", "pc-v", { step: "any" });
  const units = ["psi", "kPa", "bar", "in_h2o", "ft_h2o", "Pa", "atm"];
  const from = makeSelect("From", "pc-from", units.map((u) => ({ value: u, label: u })));
  const to = makeSelect("To", "pc-to", units.map((u) => ({ value: u, label: u })));
  for (const f of [value, from, to]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { value.input.value = "1"; from.select.value = "atm"; to.select.value = "psi"; update(); });
  const oV = makeOutputLine(outputRegion, "Result", "pc-out");
  const update = debounce(() => {
    const r = pressureConvert({ value: Number(value.input.value) || 0, from: from.select.value, to: to.select.value });
    oV.textContent = r.error ? r.error : (fmt(r.value, 4) + " " + to.select.value);
  }, DEBOUNCE_MS);
  for (const el of [value.input, from.select, to.select]) el.addEventListener("input", update);
}

export function renderBackflow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Original plain-English summaries by the project author. Common backflow scenarios and typical preventer types.";
  const list = document.createElement("dl");
  for (const item of BACKFLOW_REFERENCE) {
    const dt = document.createElement("dt"); dt.textContent = item.scenario; list.appendChild(dt);
    const dd = document.createElement("dd"); dd.textContent = item.typical_preventer; list.appendChild(dd);
  }
  outputRegion.appendChild(list);
  const note = document.createElement("p"); note.textContent = "Always verify against the AHJ and the manufacturer of the assembly. Reduced-pressure principle assemblies require periodic testing by a certified tester.";
  outputRegion.appendChild(note);
}

// =====================================================================
// v2 utilities (72-78): spec-v2.md section 2 Group B extensions.
// =====================================================================

// --- Utility 72: Water Hammer Arrestor Sizing (PDI WH-201 method) ---
//
// Method only; the published PDI WH-201 text is not reproduced. The
// designation map is the public PDI sizing convention by fixture-unit
// totals.

export const PDI_WH_ARRESTOR_SIZES = [
  { designation: "AA-A", max_wsfu: 11 },
  { designation: "AA-B", max_wsfu: 32 },
  { designation: "AA-C", max_wsfu: 60 },
  { designation: "AA-D", max_wsfu: 113 },
  { designation: "AA-E", max_wsfu: 154 },
  { designation: "AA-F", max_wsfu: 330 },
];

export function computeWaterHammerArrestor({ wsfu, length_ft = 0, internal_diameter_in = 0 }) {
  const w = Number(wsfu) || 0;
  if (w <= 0) return { error: "Provide a positive WSFU total." };
  const row = PDI_WH_ARRESTOR_SIZES.find((r) => w <= r.max_wsfu);
  if (!row) return { error: "WSFU exceeds bundled PDI size table." };
  // Long branches typically need an arrestor at every fixture group; flag
  // the case for the user.
  const long_branch = (Number(length_ft) || 0) > 20;
  return {
    designation: row.designation,
    wsfu_total: w,
    long_branch_flag: long_branch,
    pipe_diameter_in: internal_diameter_in,
  };
}

export const waterHammerArrestorExample = {
  inputs: { wsfu: 30, length_ft: 25, internal_diameter_in: 1 },
  expected: { designation: "AA-B" },
};

// --- Utility 73: Hot Water Recirculation Pump Head ---

export function computeRecircPumpHead({
  pipe_length_ft, fittings_count = 0, target_flow_gpm,
  internal_diameter_in, material = "copper",
  equivalent_length_per_fitting_ft = 2,
}) {
  const d = Number(internal_diameter_in) || 0;
  const L = Number(pipe_length_ft) || 0;
  const Q = Number(target_flow_gpm) || 0;
  const C = HAZEN_C[material] || 140;
  if (d <= 0 || L <= 0 || Q <= 0) return { error: "Provide positive length, diameter, and flow." };
  const equiv_ft = Number(fittings_count) * Number(equivalent_length_per_fitting_ft);
  const total_length_ft = L + equiv_ft;
  const headLoss_ft = hazenWilliamsFrictionLoss({
    flow_gpm: Q, internal_diameter_in: d, length_ft: total_length_ft, C,
  });
  return {
    head_ft: headLoss_ft,
    pressure_psi: feetOfHeadToPsi(headLoss_ft),
    equivalent_length_ft: equiv_ft,
    total_length_ft,
    target_flow_gpm: Q,
  };
}

export const recircPumpHeadExample = {
  inputs: { pipe_length_ft: 100, fittings_count: 8, target_flow_gpm: 4, internal_diameter_in: 0.75, material: "copper" },
  expectedRange: { head_ft: { min: 0.2, max: 5 } },
};

// --- Utility 74: Septic Tank Sizing ---

export function computeSepticTank({ bedrooms, gallons_per_day }) {
  const gpd = Number(gallons_per_day) > 0 ? Number(gallons_per_day) : (Number(bedrooms) || 0) * 150;
  if (gpd <= 0) return { error: "Provide bedrooms or daily flow gpd." };
  // Standard rule: tank gallons >= 2 * daily flow, with 1000 gal floor.
  const recommended = Math.max(1000, 2 * gpd);
  return {
    daily_flow_gpd: gpd,
    minimum_tank_gallons: recommended,
    floor_gallons: 1000,
  };
}

export const septicTankExample = {
  inputs: { bedrooms: 3 },
  expected: { daily_flow_gpd: 450, minimum_tank_gallons: 1000 },
};

// --- Utility 75: Trap Arm Length ---
//
// Public plumbing engineering practice: maximum trap arm length depends
// on pipe diameter; the slope must not allow the trap weir to drain.
// Values reflect long-standing engineering consensus.

export const TRAP_ARM_MAX_FT = {
  "1.25": 3.5,
  "1.5": 5,
  "2": 8,
  "3": 12,
  "4": 16,
};

export function computeTrapArm({ pipe_diameter_in, slope_in_per_ft = 0.25 }) {
  const max_ft = TRAP_ARM_MAX_FT[String(pipe_diameter_in)];
  if (max_ft === undefined) return { error: "Pipe diameter not in bundled table." };
  // The trap weir must not be below the inlet to the vent (the vent must
  // be above the weir). Limit length so total fall does not exceed one
  // pipe diameter (engineering practice).
  const max_fall_in = Number(pipe_diameter_in);
  const slope = Number(slope_in_per_ft) || 0.25;
  const fall_limited_ft = slope > 0 ? max_fall_in / slope : max_ft;
  return {
    max_length_ft: Math.min(max_ft, fall_limited_ft),
    table_max_ft: max_ft,
    fall_limited_ft,
    pipe_diameter_in: Number(pipe_diameter_in),
  };
}

export const trapArmExample = {
  inputs: { pipe_diameter_in: 1.5, slope_in_per_ft: 0.25 },
  expected: { table_max_ft: 5 },
};

// --- Utility 76: Pipe Thermal Expansion (delta-L = alpha * L * delta-T) ---
//
// alpha values in 1/F from data/plumbing/material-expansion.json.

export const PIPE_EXPANSION_ALPHA_PER_F = {
  copper: 9.4e-6,
  PEX: 1.1e-4,
  PVC: 3.0e-5,
  CPVC: 3.7e-5,
  steel: 6.5e-6,
};

export function computePipeExpansion({ material, length_ft, delta_T_F }) {
  const alpha = PIPE_EXPANSION_ALPHA_PER_F[material];
  if (alpha === undefined) return { error: "Unknown pipe material." };
  const L = Number(length_ft) || 0;
  const dT = Number(delta_T_F);
  if (!Number.isFinite(dT)) return { error: "Provide a numeric temperature change." };
  // Convert L to inches for output: dL (in) = alpha (1/F) * L (ft) * 12 * dT (F).
  const dL_in = alpha * L * 12 * dT;
  return { delta_L_in: dL_in, alpha_per_F: alpha, length_ft: L, delta_T_F: dT };
}

export const pipeExpansionExample = {
  inputs: { material: "copper", length_ft: 100, delta_T_F: 80 },
  expectedRange: { delta_L_in: { min: 0.7, max: 1.0 } },
};

// --- Utility 77: Tankless Water Heater GPM ---
//
// GPM = kBTU * 1000 / (8.33 * 60 * delta-T)
// 1 lb water needs 1 BTU per F; 1 gal water = 8.33 lb; 60 min/hr.

export const TANKLESS_INLET_F_BY_ZONE = {
  "1A_Miami_FL": 75,
  "2A_Houston_TX": 70,
  "3A_Atlanta_GA": 60,
  "4A_Baltimore_MD": 55,
  "5A_Chicago_IL": 50,
  "6A_Minneapolis_MN": 45,
  "7_Duluth_MN": 40,
};

export function computeTanklessGPM({ kbtu_input, climate_zone, target_outlet_F = 110 }) {
  const inlet = TANKLESS_INLET_F_BY_ZONE[climate_zone];
  if (inlet === undefined) return { error: "Unknown climate zone." };
  const kbtu = Number(kbtu_input) || 0;
  const out = Number(target_outlet_F) || 0;
  const dT = out - inlet;
  if (kbtu <= 0 || dT <= 0) return { error: "Provide positive kBTU and outlet > inlet." };
  const gpm = (kbtu * 1000) / (8.33 * 60 * dT);
  return { gpm, delta_T_F: dT, inlet_F: inlet, target_outlet_F: out };
}

export const tanklessGPMExample = {
  inputs: { kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 },
  expectedRange: { gpm: { min: 5, max: 8 } },
};

// --- Utility 78: Gas Leak Rate (orifice flow) ---
//
// Q (cfh) = 3550 * c * A * sqrt(dP / SG / L_unit_factor)
// Simplified per spec-v2: Q (cfh) = 3550 * c * A * sqrt(dP / SG)
// where A is orifice area in in^2, dP in psi (gauge), SG is gas specific gravity.
// This is a Spitzglass-style leak estimate, not an authoritative value.

export function computeGasLeakRate({ orifice_diameter_in, upstream_psi, gas, c = 0.7 }) {
  const props = GAS_PROPERTIES[gas];
  if (!props) return { error: "Unknown gas." };
  const d = Number(orifice_diameter_in) || 0;
  const dP = Number(upstream_psi) || 0;
  if (d <= 0 || dP <= 0) return { error: "Provide positive orifice diameter and pressure." };
  const A = Math.PI * (d / 2) ** 2;
  const Q = 3550 * c * A * Math.sqrt(dP / props.specific_gravity);
  return {
    leak_rate_cfh: Q,
    orifice_area_in2: A,
    discharge_coefficient: c,
    specific_gravity: props.specific_gravity,
  };
}

export const gasLeakRateExample = {
  inputs: { orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 },
  expectedRange: { leak_rate_cfh: { min: 1, max: 10 } },
};

// --- v2 view renderers ---

export function renderWaterHammerArrestor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: PDI WH-201 sizing method (the method, not the published text). Designation by fixture-unit totals.";
  const wsfu = makeNumber("Total fixture units (WSFU)", "wha-w", { step: "any", min: "0" });
  const length = makeNumber("Branch length (ft)", "wha-l", { step: "any", min: "0", value: "0" });
  length.input.value = "0";
  const dia = makeNumber("Pipe internal diameter (in)", "wha-d", { step: "any", min: "0" });
  for (const f of [wsfu, length, dia]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wsfu.input.value = "30"; length.input.value = "25"; dia.input.value = "1"; update(); });
  const oD = makeOutputLine(outputRegion, "Designation", "wha-out-d");
  const oF = makeOutputLine(outputRegion, "Long-branch note", "wha-out-f");
  const update = debounce(() => {
    const r = computeWaterHammerArrestor({
      wsfu: Number(wsfu.input.value) || 0,
      length_ft: Number(length.input.value) || 0,
      internal_diameter_in: Number(dia.input.value) || 0,
    });
    if (r.error) { oD.textContent = r.error; oF.textContent = "-"; return; }
    oD.textContent = r.designation;
    oF.textContent = r.long_branch_flag ? "Branch length over 20 ft; consider an arrestor at each fixture group." : "Standard branch length.";
  }, DEBOUNCE_MS);
  for (const el of [wsfu.input, length.input, dia.input]) el.addEventListener("input", update);
}

export function renderRecircPumpHead(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hazen-Williams head loss over the supply loop plus an equivalent-length allowance for fittings. Public engineering practice.";
  const len = makeNumber("Pipe length one-way (ft)", "rp-l", { step: "any", min: "0" });
  const fits = makeNumber("Fittings count", "rp-f", { step: "1", min: "0", value: "0" });
  fits.input.value = "0";
  const eq = makeNumber("Equiv length per fitting (ft)", "rp-eq", { step: "any", min: "0", value: "2" });
  eq.input.value = "2";
  const flow = makeNumber("Target flow (gpm)", "rp-q", { step: "any", min: "0" });
  const dia = makeNumber("Internal diameter (in)", "rp-d", { step: "any", min: "0" });
  const mat = makeSelect("Material", "rp-m", Object.keys(HAZEN_C).map((m) => ({ value: m, label: m })));
  for (const f of [len, fits, eq, flow, dia, mat]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    len.input.value = "100"; fits.input.value = "8"; eq.input.value = "2";
    flow.input.value = "4"; dia.input.value = "0.75"; mat.select.value = "copper"; update();
  });
  const oH = makeOutputLine(outputRegion, "Pump head", "rp-out-h");
  const oP = makeOutputLine(outputRegion, "Pressure", "rp-out-p");
  const oE = makeOutputLine(outputRegion, "Equivalent length", "rp-out-e");
  const update = debounce(() => {
    const r = computeRecircPumpHead({
      pipe_length_ft: Number(len.input.value) || 0,
      fittings_count: Number(fits.input.value) || 0,
      equivalent_length_per_fitting_ft: Number(eq.input.value) || 2,
      target_flow_gpm: Number(flow.input.value) || 0,
      internal_diameter_in: Number(dia.input.value) || 0,
      material: mat.select.value,
    });
    if (r.error) { oH.textContent = r.error; oP.textContent = "-"; oE.textContent = "-"; return; }
    oH.textContent = fmt(r.head_ft, 3) + " ft";
    oP.textContent = fmt(r.pressure_psi, 3) + " psi";
    oE.textContent = fmt(r.equivalent_length_ft, 1) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [len.input, fits.input, eq.input, flow.input, dia.input, mat.select]) el.addEventListener("input", update);
}

export function renderSepticTank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 150 gpd per bedroom rule of thumb (EPA / state-published septic sizing); tank floor 1000 gal; tank gallons >= 2 x daily flow.";
  const beds = makeNumber("Bedrooms", "st-b", { step: "1", min: "0" });
  const gpd = makeNumber("Daily flow gpd (overrides bedrooms if > 0)", "st-g", { step: "any", min: "0", value: "0" });
  gpd.input.value = "0";
  for (const f of [beds, gpd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { beds.input.value = "3"; gpd.input.value = "0"; update(); });
  const oG = makeOutputLine(outputRegion, "Daily flow", "st-out-g");
  const oT = makeOutputLine(outputRegion, "Minimum tank gallons", "st-out-t");
  const update = debounce(() => {
    const r = computeSepticTank({
      bedrooms: Number(beds.input.value) || 0,
      gallons_per_day: Number(gpd.input.value) || 0,
    });
    if (r.error) { oG.textContent = r.error; oT.textContent = "-"; return; }
    oG.textContent = fmt(r.daily_flow_gpd, 0) + " gpd";
    oT.textContent = fmt(r.minimum_tank_gallons, 0) + " gal";
  }, DEBOUNCE_MS);
  for (const el of [beds.input, gpd.input]) el.addEventListener("input", update);
}

export function renderTrapArm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard trap-arm length table (public plumbing engineering practice). The trap weir must not drain through the vent; total fall limited to one pipe diameter.";
  const dia = makeSelect("Pipe diameter (in)", "ta-d", Object.keys(TRAP_ARM_MAX_FT).map((s) => ({ value: s, label: s + "\""})));
  const slope = makeNumber("Slope (in/ft)", "ta-s", { step: "any", min: "0", value: "0.25" });
  slope.input.value = "0.25";
  for (const f of [dia, slope]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.select.value = "1.5"; slope.input.value = "0.25"; update(); });
  const oM = makeOutputLine(outputRegion, "Maximum length", "ta-out-m");
  const oT = makeOutputLine(outputRegion, "Table max", "ta-out-t");
  const update = debounce(() => {
    const r = computeTrapArm({
      pipe_diameter_in: dia.select.value,
      slope_in_per_ft: Number(slope.input.value) || 0.25,
    });
    if (r.error) { oM.textContent = r.error; oT.textContent = "-"; return; }
    oM.textContent = fmt(r.max_length_ft, 2) + " ft";
    oT.textContent = fmt(r.table_max_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [dia.select, slope.input]) el.addEventListener("input", update);
}

export function renderPipeExpansion(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Linear thermal expansion dL = alpha * L * dT. Coefficients (per F) from NIST and manufacturer technical bulletins.";
  const mat = makeSelect("Material", "pe-m", Object.keys(PIPE_EXPANSION_ALPHA_PER_F).map((m) => ({ value: m, label: m })));
  const len = makeNumber("Length (ft)", "pe-l", { step: "any", min: "0" });
  const dT = makeNumber("Temperature change (F)", "pe-t", { step: "any" });
  for (const f of [mat, len, dT]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mat.select.value = "copper"; len.input.value = "100"; dT.input.value = "80"; update(); });
  const oL = makeOutputLine(outputRegion, "Expansion", "pe-out-l");
  const oA = makeOutputLine(outputRegion, "Coefficient", "pe-out-a");
  const update = debounce(() => {
    const r = computePipeExpansion({
      material: mat.select.value,
      length_ft: Number(len.input.value) || 0,
      delta_T_F: Number(dT.input.value),
    });
    if (r.error) { oL.textContent = r.error; oA.textContent = "-"; return; }
    oL.textContent = fmt(r.delta_L_in, 3) + " in";
    oA.textContent = r.alpha_per_F.toExponential(2) + " 1/F";
  }, DEBOUNCE_MS);
  for (const el of [mat.select, len.input, dT.input]) el.addEventListener("input", update);
}

export function renderTanklessGPM(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GPM = kBTU * 1000 / (8.33 * 60 * dT). 1 lb water requires 1 BTU per F; 1 gal water = 8.33 lb. Inlet temperatures by climate zone (NOAA design data).";
  const kbtu = makeNumber("Burner input (kBTU/hr)", "tl-k", { step: "any", min: "0" });
  const zone = makeSelect("Climate zone", "tl-z", Object.keys(TANKLESS_INLET_F_BY_ZONE).map((z) => ({ value: z, label: z.replace(/_/g, " ") })));
  const out = makeNumber("Target outlet (F)", "tl-o", { step: "any", min: "0", value: "110" });
  out.input.value = "110";
  for (const f of [kbtu, zone, out]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kbtu.input.value = "199"; zone.select.value = "5A_Chicago_IL"; out.input.value = "110"; update(); });
  const oG = makeOutputLine(outputRegion, "Achievable flow", "tl-out-g");
  const oI = makeOutputLine(outputRegion, "Inlet temperature", "tl-out-i");
  const oD = makeOutputLine(outputRegion, "delta T", "tl-out-d");
  const update = debounce(() => {
    const r = computeTanklessGPM({
      kbtu_input: Number(kbtu.input.value) || 0,
      climate_zone: zone.select.value,
      target_outlet_F: Number(out.input.value) || 0,
    });
    if (r.error) { oG.textContent = r.error; oI.textContent = "-"; oD.textContent = "-"; return; }
    oG.textContent = fmt(r.gpm, 2) + " gpm";
    oI.textContent = fmt(r.inlet_F, 0) + " F";
    oD.textContent = fmt(r.delta_T_F, 0) + " F";
  }, DEBOUNCE_MS);
  for (const el of [kbtu.input, zone.select, out.input]) el.addEventListener("input", update);
}

export function renderGasLeakRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Q = 3550 * c * A * sqrt(dP / SG). Orifice flow approximation for a small gas leak. Estimation only.";
  const dia = makeNumber("Orifice diameter (in)", "gl-d", { step: "any", min: "0" });
  const psi = makeNumber("Upstream gauge pressure (psi)", "gl-p", { step: "any", min: "0" });
  const c = makeNumber("Discharge coefficient", "gl-c", { step: "any", min: "0", max: "1", value: "0.7" });
  c.input.value = "0.7";
  const gas = makeSelect("Gas", "gl-g", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  for (const f of [dia, psi, c, gas]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.05"; psi.input.value = "0.25"; c.input.value = "0.7"; gas.select.value = "natural_gas"; update(); });
  const oQ = makeOutputLine(outputRegion, "Leak rate", "gl-out-q");
  const oA = makeOutputLine(outputRegion, "Orifice area", "gl-out-a");
  const update = debounce(() => {
    const r = computeGasLeakRate({
      orifice_diameter_in: Number(dia.input.value) || 0,
      upstream_psi: Number(psi.input.value) || 0,
      c: Number(c.input.value) || 0.7,
      gas: gas.select.value,
    });
    if (r.error) { oQ.textContent = r.error; oA.textContent = "-"; return; }
    oQ.textContent = fmt(r.leak_rate_cfh, 2) + " ft^3/hr";
    oA.textContent = fmt(r.orifice_area_in2, 5) + " in^2";
  }, DEBOUNCE_MS);
  for (const el of [dia.input, psi.input, c.input, gas.select]) el.addEventListener("input", update);
}

export const PLUMBING_RENDERERS = {
  "pipe-sizing": renderPipeSizing,
  "friction-loss": renderFrictionLoss,
  "pipe-volume": renderPipeVolume,
  "pump-sizing": renderPumpSizing,
  "static-pressure-piping": renderStaticPressurePiping,
  "gas-pipe-sizing": renderGasPipeSizing,
  "slope": renderSlope,
  "pressure-conversion": renderPressureConversion,
  "backflow": renderBackflow,
  // v2
  "water-hammer-arrestor": renderWaterHammerArrestor,
  "recirc-pump-head": renderRecircPumpHead,
  "septic-tank": renderSepticTank,
  "trap-arm": renderTrapArm,
  "pipe-expansion": renderPipeExpansion,
  "tankless-gpm": renderTanklessGPM,
  "gas-leak-rate": renderGasLeakRate,
};
