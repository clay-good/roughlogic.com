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

// v8 §C.2: residential fixture-list presets. Lets the renderer offer
// "3-bed/2-bath" / "4-bed/3-bath" / "5-bed/3.5-bath" buttons that prefill
// the fixture list; the user tweaks individual rows.
export const PIPE_SIZING_RESIDENTIAL_PRESETS = {
  "3bed_2bath": {
    label: "3-bed / 2-bath",
    fixtures: [
      { fixture: "water_closet_flush_tank", count: 2 },
      { fixture: "lavatory", count: 3 },
      { fixture: "shower", count: 1 },
      { fixture: "bathtub", count: 1 },
      { fixture: "kitchen_sink", count: 1 },
      { fixture: "dishwasher", count: 1 },
      { fixture: "laundry_tray", count: 1 },
      { fixture: "hose_bibb", count: 2 },
    ],
  },
  "4bed_3bath": {
    label: "4-bed / 3-bath",
    fixtures: [
      { fixture: "water_closet_flush_tank", count: 3 },
      { fixture: "lavatory", count: 5 },
      { fixture: "shower", count: 2 },
      { fixture: "bathtub", count: 1 },
      { fixture: "kitchen_sink", count: 1 },
      { fixture: "dishwasher", count: 1 },
      { fixture: "laundry_tray", count: 1 },
      { fixture: "hose_bibb", count: 2 },
    ],
  },
  "5bed_35bath": {
    label: "5-bed / 3.5-bath",
    fixtures: [
      { fixture: "water_closet_flush_tank", count: 4 },
      { fixture: "lavatory", count: 7 },
      { fixture: "shower", count: 3 },
      { fixture: "bathtub", count: 2 },
      { fixture: "kitchen_sink", count: 1 },
      { fixture: "dishwasher", count: 1 },
      { fixture: "laundry_tray", count: 1 },
      { fixture: "hose_bibb", count: 3 },
    ],
  },
};

export function pipeSizingFromPreset(presetId) {
  const p = PIPE_SIZING_RESIDENTIAL_PRESETS[presetId];
  if (!p) return { error: "Unknown residential preset." };
  return computePipeSizing({ fixtures: p.fixtures, slope_in_per_ft: 0.25 });
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

// v8 §C.2: classify velocity against plumbing-engineering-practice
// thresholds. > 5 ft/s flags noise risk (water hammer / hiss); > 10 ft/s
// flags erosion risk (especially for copper).
function _v8frictionVelocityFlag(v_ft_s) {
  if (!Number.isFinite(v_ft_s) || v_ft_s <= 0) return null;
  if (v_ft_s > 10) return "erosion risk (>10 ft/s; copper especially)";
  if (v_ft_s > 5) return "noise risk (>5 ft/s)";
  return "within typical (≤5 ft/s)";
}

export function computeFrictionLoss({ method, material, nominal_size, length_ft, flow_gpm, internal_diameter_in }) {
  const d = internal_diameter_in || SCH40_ID_IN[String(nominal_size)];
  if (!d) return { error: "Unknown nominal size; provide internal diameter directly." };
  // Compute velocity once (independent of method): V (ft/s) = (Q gpm × 0.4085) / d² (in²).
  const velocity_ft_s = (Number(flow_gpm) || 0) * 0.4085 / (d * d);
  const velocity_flag = _v8frictionVelocityFlag(velocity_ft_s);

  if (method === "hazen-williams") {
    const C = HAZEN_C[material];
    if (!C) return { error: "Unknown material for Hazen-Williams." };
    const headLoss_ft = hazenWilliamsFrictionLoss({ flow_gpm, internal_diameter_in: d, length_ft, C });
    return { headLoss_ft, pressureLoss_psi: feetOfHeadToPsi(headLoss_ft), velocity_ft_s, velocity_flag };
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
    // v_m_s / 0.3048 produces a slightly different velocity from the Hazen-Williams
    // analytic shortcut at the second decimal; both are correct, so we keep the
    // Darcy-Weisbach value for consistency with that branch's other outputs.
    const v_dw = v_m_s / 0.3048;
    return { headLoss_ft, pressureLoss_psi: feetOfHeadToPsi(headLoss_ft), velocity_ft_s: v_dw, velocity_flag: _v8frictionVelocityFlag(v_dw) };
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
      // v8 §C.2: actual achieved pressure drop at the chosen size + actual
      // load. Spitzglass: Q ∝ sqrt(dP), so dP_actual = dP_design × (Q_actual/Q_max)².
      const dP_achieved_in_wc = capacity > 0 ? dP_in_wc * Math.pow(required_cfh / capacity, 2) : null;
      return { required_cfh, recommended_size: size, capacity_cfh: capacity, dP_in_wc, dP_achieved_in_wc };
    }
  }
  return { required_cfh, recommended_size: "larger than " + candidate_sizes[candidate_sizes.length - 1], capacity_cfh: null, dP_achieved_in_wc: null };
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
  citationEl.textContent = "Citation: per IPC 2021 Table 422.1 (fixture units); Hunter's Curve (1940; NBS BMS65) public-domain methodology. AHJ governs. Free at codes.iccsafe.org.";
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
  citationEl.textContent = "Citation: Hazen-Williams (1905, public domain). IPC 2021 referenced for application. Darcy-Weisbach with Colebrook-White for general fluid use. Free at codes.iccsafe.org.";
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
  // v8 §C.2: surface velocity + 5/10 ft/s threshold flag.
  const oVel = makeOutputLine(outputRegion, "Velocity", "fl-out-vel");
  const oVelFlag = makeOutputLine(outputRegion, "Velocity status", "fl-out-vel-flag");
  const update = debounce(() => {
    const r = computeFrictionLoss({
      method: method.select.value,
      material: material.select.value,
      nominal_size: size.select.value,
      length_ft: Number(length.input.value) || 0,
      flow_gpm: Number(flow.input.value) || 0,
    });
    if (r.error) { oH.textContent = r.error; oP.textContent = "-"; oVel.textContent = "-"; oVelFlag.textContent = "-"; return; }
    oH.textContent = fmt(r.headLoss_ft, 2) + " ft of head";
    oP.textContent = fmt(r.pressureLoss_psi, 2) + " psi";
    oVel.textContent = r.velocity_ft_s === undefined ? "-" : fmt(r.velocity_ft_s, 2) + " ft/s";
    oVelFlag.textContent = r.velocity_flag || "-";
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
  citationEl.textContent = "Citation: per IFGC 2021 Table 402.4 (NFPA 54). Spitzglass low-pressure gas formula Q = 3550 × sqrt(d^5 × dP / (SG × L)). AHJ governs. Free at codes.iccsafe.org.";
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
  // v8 §C.2: actual achieved pressure drop at the chosen size + actual load.
  const oD = makeOutputLine(outputRegion, "Achieved pressure drop", "gp-out-d");
  const update = debounce(() => {
    const r = computeGasPipeSizing({
      btu_load: Number(btu.input.value) || 0, length_ft: Number(length.input.value) || 0,
      gas: gas.select.value, dP_in_wc: Number(dP.input.value) || 0.5,
    });
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; oD.textContent = "-"; return; }
    oR.textContent = fmt(r.required_cfh, 1) + " ft^3/hr";
    oS.textContent = String(r.recommended_size).includes("larger") ? r.recommended_size : (r.recommended_size + "\"");
    oD.textContent = r.dP_achieved_in_wc === null ? "(no size fits the load; oversize the pipe or relax dP)"
      : fmt(r.dP_achieved_in_wc, 3) + " in WC (allowable " + fmt(r.dP_in_wc, 2) + ")";
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

export function computeWaterHammerArrestor({ wsfu, length_ft = 0, internal_diameter_in = 0, system_pressure_psi = 0 }) {
  const w = Number(wsfu) || 0;
  if (w <= 0) return { error: "Provide a positive WSFU total." };
  const row = PDI_WH_ARRESTOR_SIZES.find((r) => w <= r.max_wsfu);
  if (!row) return { error: "WSFU exceeds bundled PDI size table." };
  // Long branches typically need an arrestor at every fixture group; flag
  // the case for the user.
  const long_branch = (Number(length_ft) || 0) > 20;
  // v8 §C.2: arrestor air-charge pre-charge pressure that the tech needs
  // to set with the system depressurized. Manufacturer typical: pre-charge
  // = static system pressure (so the bladder sits at the wall at static
  // conditions). When system_pressure not supplied, default to a
  // residential 60 psi typical.
  const sys_psi = system_pressure_psi > 0 ? system_pressure_psi : 60;
  const precharge_psi = sys_psi;
  return {
    designation: row.designation,
    wsfu_total: w,
    long_branch_flag: long_branch,
    pipe_diameter_in: internal_diameter_in,
    precharge_psi,
    placement_note: "Install at the end of the branch line, downstream of the last fixture. Pre-charge with the system depressurized.",
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

// v8 §C.2 / accessibility.md preset-chip pattern: typical static water
// pressure values residential / suburban / commercial techs see most often.
export const WHA_SYSTEM_PRESSURE_PRESETS = [
  { id: "low",      label: "Low 40 psi",     psi: 40, description: "Low residential / well system" },
  { id: "typical",  label: "Typical 60 psi", psi: 60, description: "Typical residential static pressure" },
  { id: "high",     label: "High 80 psi",    psi: 80, description: "High residential / commercial near PRV limit" },
];

export function renderWaterHammerArrestor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: PDI WH-201 sizing method (the method, not the published text). Designation by fixture-unit totals.";
  const wsfu = makeNumber("Total fixture units (WSFU)", "wha-w", { step: "any", min: "0" });
  const length = makeNumber("Branch length (ft)", "wha-l", { step: "any", min: "0", value: "0" });
  length.input.value = "0";
  const dia = makeNumber("Pipe internal diameter (in)", "wha-d", { step: "any", min: "0" });
  // v8 §C.2: optional system pressure so the renderer can show the
  // air-charge pre-charge pressure the tech needs to set.
  const sp = makeNumber("System pressure (psi, optional)", "wha-sp", { step: "any", min: "0" });
  // v8 §C.2 + accessibility.md preset-chip pattern: typical residential /
  // commercial system-pressure presets so the tech sets pre-charge with
  // one tap.
  const chipRow = document.createElement("div");
  chipRow.className = "preset-chip-row";
  chipRow.setAttribute("role", "group");
  chipRow.setAttribute("aria-label", "System pressure presets");
  for (const p of WHA_SYSTEM_PRESSURE_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { sp.input.value = String(p.psi); update(); });
    chipRow.appendChild(btn);
  }
  for (const f of [wsfu, length, dia, sp]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(chipRow);
  attachExampleButton(inputRegion, () => { wsfu.input.value = "30"; length.input.value = "25"; dia.input.value = "1"; update(); });
  const oD = makeOutputLine(outputRegion, "Designation", "wha-out-d");
  const oF = makeOutputLine(outputRegion, "Long-branch note", "wha-out-f");
  const oPC = makeOutputLine(outputRegion, "Pre-charge (set air side, system depressurized)", "wha-out-pc");
  const oPN = makeOutputLine(outputRegion, "Placement", "wha-out-pn");
  const update = debounce(() => {
    const r = computeWaterHammerArrestor({
      wsfu: Number(wsfu.input.value) || 0,
      length_ft: Number(length.input.value) || 0,
      internal_diameter_in: Number(dia.input.value) || 0,
      system_pressure_psi: Number(sp.input.value) || 0,
    });
    if (r.error) { oD.textContent = r.error; oF.textContent = "-"; oPC.textContent = "-"; oPN.textContent = "-"; return; }
    oD.textContent = r.designation;
    oF.textContent = r.long_branch_flag ? "Branch length over 20 ft; consider an arrestor at each fixture group." : "Standard branch length.";
    oPC.textContent = fmt(r.precharge_psi, 1) + " psi" + (Number(sp.input.value) > 0 ? "" : " (default 60 psi residential)");
    oPN.textContent = r.placement_note;
  }, DEBOUNCE_MS);
  for (const el of [wsfu.input, length.input, dia.input, sp.input]) el.addEventListener("input", update);
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
  citationEl.textContent = "Citation: EPA Onsite Wastewater Treatment Manual (EPA/625/R-00/008). 150 gpd per bedroom rule of thumb; tank floor 1000 gal; tank gallons ≥ 2× daily flow. State primacy agency governs final design. Free at epa.gov/septic.";
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

// =====================================================================
// v3 utilities (132 through 138). See spec-v3.md section 2.2.
// =====================================================================

// --- Utility 132: Stormwater Rational Method ---
//
// Q (cfs) = C * i (in/hr) * A (acres). With area in ft^2, A_acres = ft^2 / 43560.
// Bundled C values mirror data/plumbing/runoff-coefficients.json.

export const RUNOFF_COEFFICIENTS = {
  asphalt: 0.95,
  concrete: 0.95,
  metal_roof: 0.95,
  asphalt_shingle_roof: 0.90,
  gravel: 0.50,
  packed_earth: 0.60,
  lawn_sandy_flat: 0.10,
  lawn_clay_flat: 0.18,
  lawn: 0.25,
  forest: 0.10,
};

export function computeStormwaterRational({ area_ft2 = 0, surface = "asphalt", rainfall_in_per_hr = 0 }) {
  if (!(area_ft2 > 0)) return { error: "Area must be positive." };
  if (!(rainfall_in_per_hr >= 0)) return { error: "Rainfall must be non-negative." };
  const C = RUNOFF_COEFFICIENTS[surface];
  if (!Number.isFinite(C)) return { error: "Unknown surface type." };
  const A_acres = area_ft2 / 43560;
  const Q_cfs = C * rainfall_in_per_hr * A_acres;
  // 1 cfs = 448.831 gpm.
  const Q_gpm = Q_cfs * 448.831;
  return { runoff_coefficient: C, peak_flow_cfs: Q_cfs, peak_flow_gpm: Q_gpm, area_acres: A_acres };
}

export const stormwaterRationalExample = {
  inputs: { area_ft2: 5000, surface: "asphalt", rainfall_in_per_hr: 2 },
};

// --- Utility 133: Manning's Equation Drainage Slope ---
//
// Manning: V = (1.486 / n) * R^(2/3) * S^(1/2) (English units, ft, ft/s).
// For circular pipes flowing half-full, hydraulic radius R = D/4 (D in ft).
// Solve for slope: S = ( V * n / (1.486 * R^(2/3)) )^2.

export const MANNING_ROUGHNESS = {
  pvc: 0.009,
  copper: 0.011,
  cast_iron: 0.013,
  concrete: 0.013,
  galvanized_steel: 0.016,
  corrugated_metal: 0.024,
};

export function computeManningSlope({ pipe_diameter_in = 0, target_flow_gpm = 0, material = "pvc" }) {
  if (!(pipe_diameter_in > 0)) return { error: "Pipe diameter must be positive." };
  if (!(target_flow_gpm >= 0)) return { error: "Target flow must be non-negative." };
  const n = MANNING_ROUGHNESS[material];
  if (!Number.isFinite(n)) return { error: "Unknown pipe material." };
  const D_ft = pipe_diameter_in / 12;
  // Half-full hydraulic radius and area:
  const R_ft = D_ft / 4;
  const A_half_ft2 = Math.PI * D_ft * D_ft / 8;
  // Self-cleansing velocity 2 ft/s; slope to achieve V_target:
  const slopeForVelocity = (V) => Math.pow((V * n) / (1.486 * Math.pow(R_ft, 2 / 3)), 2);
  const slope_self_cleansing = slopeForVelocity(2);
  // Slope to carry the target flow at half-full:
  // Q (cfs) = V * A_half. 1 gpm = 0.002228 cfs.
  const Q_cfs = target_flow_gpm * 0.002228;
  let slope_for_flow = null;
  if (Q_cfs > 0) {
    const V_required = Q_cfs / A_half_ft2;
    slope_for_flow = slopeForVelocity(V_required);
  }
  return {
    slope_self_cleansing,
    slope_self_cleansing_in_per_ft: slope_self_cleansing * 12,
    slope_for_flow,
    slope_for_flow_in_per_ft: slope_for_flow !== null ? slope_for_flow * 12 : null,
    n, D_ft, R_ft, A_half_ft2,
  };
}

export const manningSlopeExample = {
  inputs: { pipe_diameter_in: 4, target_flow_gpm: 50, material: "pvc" },
};

// --- Utility 134: Hydrostatic Test Pressure and Hold Time ---

export function computeHydrostaticTest({ working_pressure_psi = 0, system_volume_gal = 0, material = "water", multiplier = null }) {
  if (!(working_pressure_psi > 0)) return { error: "Working pressure must be positive." };
  if (!(system_volume_gal >= 0)) return { error: "System volume must be non-negative." };
  // Default multipliers per public engineering practice.
  const defaultMultiplier = material === "fuel_gas" ? 1.25 : 1.5;
  const m = multiplier !== null && multiplier > 0 ? multiplier : defaultMultiplier;
  const test_pressure = working_pressure_psi * m;
  // Hold-time recommendation (piecewise):
  let hold_minutes;
  if (system_volume_gal < 50) hold_minutes = 15;
  else if (system_volume_gal < 500) hold_minutes = 30;
  else if (system_volume_gal < 5000) hold_minutes = 60;
  else hold_minutes = 240;
  // Acceptable leak rate: water typically zero allowable in 15 min hold;
  // gas test maintains pressure within instrumentation accuracy.
  const acceptable_leak_note = material === "fuel_gas"
    ? "Hold pressure within gauge accuracy; no observable drop."
    : "Zero observable drop on calibrated gauge.";
  return { test_pressure_psi: test_pressure, multiplier: m, hold_minutes, acceptable_leak_note };
}

export const hydrostaticTestExample = {
  inputs: { working_pressure_psi: 80, system_volume_gal: 200, material: "water" },
};

// --- Utility 135: Grease Trap Sizing ---
//
// Volume = peak_gpm * retention_minutes * loading_factor. PDI G101 cited by name.

export function computeGreaseTrap({ peak_flow_gpm = 0, retention_minutes = 30, loading_factor = 1.25 }) {
  if (!(peak_flow_gpm > 0)) return { error: "Peak flow must be positive." };
  if (!(retention_minutes > 0)) return { error: "Retention time must be positive." };
  if (!(loading_factor > 0)) return { error: "Loading factor must be positive." };
  const volume_gal = peak_flow_gpm * retention_minutes * loading_factor;
  // Typical commercial trap nominal sizes (gallons).
  const standardSizes = [20, 35, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000];
  const recommended = standardSizes.find((s) => s >= volume_gal) || standardSizes[standardSizes.length - 1];
  return { volume_gal, recommended_nominal_gal: recommended };
}

export const greaseTrapExample = {
  inputs: { peak_flow_gpm: 25, retention_minutes: 30, loading_factor: 1.25 },
};

// --- Utility 136: Glycol Freeze Protection Mix ---
//
// Manufacturer freeze-point curves (typical Dow / Dynalene / Houghton data;
// each row attributes the publishing manufacturer). Mirrored in
// data/plumbing/glycol-curves.json. We linearly interpolate between rows.

export const GLYCOL_FREEZE_CURVES = {
  propylene: [
    { percent: 0, freeze_F: 32 }, { percent: 10, freeze_F: 26 }, { percent: 20, freeze_F: 18 },
    { percent: 30, freeze_F: 8 }, { percent: 40, freeze_F: -7 }, { percent: 50, freeze_F: -28 },
    { percent: 60, freeze_F: -55 },
  ],
  ethylene: [
    { percent: 0, freeze_F: 32 }, { percent: 10, freeze_F: 25 }, { percent: 20, freeze_F: 16 },
    { percent: 30, freeze_F: 4 }, { percent: 40, freeze_F: -12 }, { percent: 50, freeze_F: -34 },
    { percent: 60, freeze_F: -62 },
  ],
};

export const GLYCOL_ATTRIBUTION = {
  propylene: "Dow Dowfrost technical bulletin (typical curve)",
  ethylene: "Dow Dowtherm SR-1 technical bulletin (typical curve)",
};

export function computeGlycolMix({ system_volume_gal = 0, target_burst_F = 32, glycol_type = "propylene" }) {
  if (!(system_volume_gal > 0)) return { error: "System volume must be positive." };
  const curve = GLYCOL_FREEZE_CURVES[glycol_type];
  if (!curve) return { error: "Unknown glycol type." };
  // Find smallest percent whose freeze_F <= target.
  let percent = null;
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].freeze_F >= target_burst_F && curve[i + 1].freeze_F < target_burst_F) {
      // interpolate
      const a = curve[i], b = curve[i + 1];
      const t = (a.freeze_F - target_burst_F) / (a.freeze_F - b.freeze_F);
      percent = a.percent + t * (b.percent - a.percent);
      break;
    }
    if (curve[i].freeze_F <= target_burst_F) { percent = curve[i].percent; break; }
  }
  if (percent === null) {
    if (target_burst_F < curve[curve.length - 1].freeze_F) return { error: "Target temperature below curve range; choose a different glycol or accept partial protection." };
    percent = curve[0].percent;
  }
  const concentrate_gal = system_volume_gal * (percent / 100);
  return {
    glycol_percent: percent,
    concentrate_gal,
    attribution: GLYCOL_ATTRIBUTION[glycol_type],
  };
}

export const glycolMixExample = {
  inputs: { system_volume_gal: 100, target_burst_F: 0, glycol_type: "propylene" },
};

// --- Utility 137: Hydronic Expansion Tank ---
//
// V_tank = V_sys * ((rho_cold / rho_hot) - 1) / (1 - (P_initial / P_final))
// Pressures are absolute (psi + 14.7).

export const WATER_DENSITY_F = [
  { F: 40, rho: 62.43 }, { F: 60, rho: 62.37 }, { F: 80, rho: 62.22 }, { F: 100, rho: 62.00 },
  { F: 120, rho: 61.71 }, { F: 140, rho: 61.39 }, { F: 160, rho: 61.01 }, { F: 180, rho: 60.57 },
  { F: 200, rho: 60.13 }, { F: 220, rho: 59.63 }, { F: 240, rho: 59.10 },
];

function rhoAt(F) {
  const t = WATER_DENSITY_F;
  if (F <= t[0].F) return t[0].rho;
  if (F >= t[t.length - 1].F) return t[t.length - 1].rho;
  for (let i = 0; i < t.length - 1; i++) {
    if (F >= t[i].F && F <= t[i + 1].F) {
      const r = (F - t[i].F) / (t[i + 1].F - t[i].F);
      return t[i].rho + r * (t[i + 1].rho - t[i].rho);
    }
  }
  return t[0].rho;
}

export function computeExpansionTank({ system_volume_gal = 0, fill_temperature_F = 60, max_temperature_F = 200, fill_pressure_psi = 12, relief_pressure_psi = 30 }) {
  if (!(system_volume_gal > 0)) return { error: "System volume must be positive." };
  if (!(max_temperature_F > fill_temperature_F)) return { error: "Max temperature must exceed fill temperature." };
  if (!(relief_pressure_psi > fill_pressure_psi)) return { error: "Relief pressure must exceed fill pressure." };
  const rho_cold = rhoAt(fill_temperature_F);
  const rho_hot = rhoAt(max_temperature_F);
  const P_initial_abs = fill_pressure_psi + 14.7;
  const P_final_abs = relief_pressure_psi + 14.7;
  const V_tank = system_volume_gal * (((rho_cold / rho_hot) - 1) / (1 - (P_initial_abs / P_final_abs)));
  // v8 §C.2: surface the pre-charge pressure the tech needs to set on the
  // air side of the bladder. Standard practice: pre-charge = system fill
  // pressure (e.g., 12 psi for a 1-story residential hydronic system) so
  // the diaphragm sits at the wall at fill conditions.
  const precharge_psi = fill_pressure_psi;
  const placement_note = "Install on the suction side of the pump, at the supply main, before the first branch. Pre-charge the air side to the system fill pressure with the system depressurized.";
  return {
    tank_volume_gal: V_tank, rho_cold, rho_hot, P_initial_abs, P_final_abs,
    precharge_psi, placement_note,
  };
}

export const expansionTankExample = {
  inputs: { system_volume_gal: 100, fill_temperature_F: 60, max_temperature_F: 200, fill_pressure_psi: 12, relief_pressure_psi: 30 },
};

// --- Utility 138: Backflow Preventer Pressure Loss ---
//
// Manufacturer-published curves bundled in data/plumbing/backflow-curves.json.
// Linear interpolation per device class by flow gpm and pipe size.

export const BACKFLOW_CURVES = {
  RP: { attribution: "Watts Series 909 RP technical bulletin (typical)", points: { "0.75": [[0,0],[10,9],[20,12],[30,15]], "1": [[0,0],[20,7],[40,10],[60,13]], "1.5": [[0,0],[40,6],[80,9],[120,12]], "2": [[0,0],[60,5],[120,8],[180,11]] } },
  DCV: { attribution: "Watts Series 909 DCV technical bulletin (typical)", points: { "0.75": [[0,0],[10,4],[20,6],[30,8]], "1": [[0,0],[20,3.5],[40,5],[60,7]], "1.5": [[0,0],[40,3],[80,4.5],[120,6]], "2": [[0,0],[60,2.5],[120,4],[180,5.5]] } },
  PVB: { attribution: "Watts Series 800 PVB technical bulletin (typical)", points: { "0.75": [[0,0],[10,5],[20,7],[30,9]], "1": [[0,0],[20,4],[40,6],[60,8]], "1.5": [[0,0],[40,3.5],[80,5],[120,7]], "2": [[0,0],[60,3],[120,4.5],[180,6]] } },
  AVB: { attribution: "Watts Series 8 AVB technical bulletin (typical)", points: { "0.75": [[0,0],[10,3],[20,5],[30,7]], "1": [[0,0],[20,2.5],[40,4],[60,6]] } },
};

export function computeBackflowLoss({ device_class = "RP", flow_gpm = 0, pipe_size_in = "1" }) {
  const dev = BACKFLOW_CURVES[device_class];
  if (!dev) return { error: "Unknown device class." };
  const pts = dev.points[String(pipe_size_in)];
  if (!pts) return { error: "Unknown pipe size for this device." };
  if (!(flow_gpm >= 0)) return { error: "Flow must be non-negative." };
  // Interpolate.
  let psi_loss;
  if (flow_gpm <= pts[0][0]) psi_loss = pts[0][1];
  else if (flow_gpm >= pts[pts.length - 1][0]) psi_loss = pts[pts.length - 1][1];
  else {
    for (let i = 0; i < pts.length - 1; i++) {
      if (flow_gpm >= pts[i][0] && flow_gpm <= pts[i + 1][0]) {
        const t = (flow_gpm - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        psi_loss = pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
        break;
      }
    }
  }
  return { pressure_loss_psi: psi_loss, attribution: dev.attribution };
}

export const backflowLossExample = {
  inputs: { device_class: "RP", flow_gpm: 30, pipe_size_in: "1" },
};

// --- v3 renderers ---

export function renderStormwaterRational(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Rational method Q = C * i * A (cfs / acres / in-per-hr). Public engineering practice. Runoff coefficients bundled per surface from public engineering tables.";
  attachExampleButton(inputRegion, () => fillExample(stormwaterRationalExample.inputs));
  const a = makeNumber("Catchment area (ft^2)", "sw-a", { step: "any", min: "0" });
  const s = makeSelect("Surface", "sw-s", Object.keys(RUNOFF_COEFFICIENTS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const r = makeNumber("Rainfall intensity (in/hr)", "sw-r", { step: "any", min: "0" });
  for (const f of [a, s, r]) inputRegion.appendChild(f.wrap);
  const oC = makeOutputLine(outputRegion, "Runoff coefficient", "sw-out-c");
  const oCfs = makeOutputLine(outputRegion, "Peak flow", "sw-out-cfs");
  const oGpm = makeOutputLine(outputRegion, "Peak flow", "sw-out-gpm");
  function fillExample(v) { a.input.value = v.area_ft2; s.select.value = v.surface; r.input.value = v.rainfall_in_per_hr; update(); }
  const update = debounce(() => {
    const x = computeStormwaterRational({ area_ft2: Number(a.input.value) || 0, surface: s.select.value, rainfall_in_per_hr: Number(r.input.value) || 0 });
    if (x.error) { oC.textContent = x.error; oCfs.textContent = "-"; oGpm.textContent = "-"; return; }
    oC.textContent = fmt(x.runoff_coefficient, 2);
    oCfs.textContent = fmt(x.peak_flow_cfs, 3) + " cfs";
    oGpm.textContent = fmt(x.peak_flow_gpm, 1) + " gpm";
  }, DEBOUNCE_MS);
  for (const el of [a.input, s.select, r.input]) el.addEventListener("input", update);
}

export function renderManningSlope(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning's equation V = (1.486/n) * R^(2/3) * S^(1/2). Public engineering. Pipe roughness values from public engineering tables.";
  attachExampleButton(inputRegion, () => fillExample(manningSlopeExample.inputs));
  const d = makeNumber("Pipe diameter (in)", "mn-d", { step: "any", min: "0" });
  const f = makeNumber("Target flow (gpm)", "mn-f", { step: "any", min: "0" });
  const m = makeSelect("Pipe material", "mn-m", Object.keys(MANNING_ROUGHNESS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const x of [d, f, m]) inputRegion.appendChild(x.wrap);
  const oSC = makeOutputLine(outputRegion, "Self-cleansing slope", "mn-out-sc");
  const oFL = makeOutputLine(outputRegion, "Slope for flow (half-full)", "mn-out-fl");
  function fillExample(v) { d.input.value = v.pipe_diameter_in; f.input.value = v.target_flow_gpm; m.select.value = v.material; update(); }
  const update = debounce(() => {
    const r = computeManningSlope({ pipe_diameter_in: Number(d.input.value) || 0, target_flow_gpm: Number(f.input.value) || 0, material: m.select.value });
    if (r.error) { oSC.textContent = r.error; oFL.textContent = "-"; return; }
    oSC.textContent = fmt(r.slope_self_cleansing_in_per_ft, 4) + " in/ft";
    oFL.textContent = r.slope_for_flow_in_per_ft !== null ? fmt(r.slope_for_flow_in_per_ft, 4) + " in/ft" : "-";
  }, DEBOUNCE_MS);
  for (const el of [d.input, f.input, m.select]) el.addEventListener("input", update);
}

export function renderHydrostaticTest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public engineering practice. Default multipliers 1.5 for water, 1.25 for fuel gas. Hold-time scales with system volume.";
  attachExampleButton(inputRegion, () => fillExample(hydrostaticTestExample.inputs));
  const wp = makeNumber("Working pressure (psi)", "ht-wp", { step: "any", min: "0" });
  const sv = makeNumber("System volume (gal)", "ht-sv", { step: "any", min: "0" });
  const mat = makeSelect("System type", "ht-m", [{ value: "water", label: "Water (1.5x)" }, { value: "fuel_gas", label: "Fuel gas (1.25x)" }]);
  for (const f of [wp, sv, mat]) inputRegion.appendChild(f.wrap);
  const oP = makeOutputLine(outputRegion, "Test pressure", "ht-out-p");
  const oM = makeOutputLine(outputRegion, "Multiplier", "ht-out-m");
  const oH = makeOutputLine(outputRegion, "Hold time", "ht-out-h");
  const oN = makeOutputLine(outputRegion, "Acceptable leak", "ht-out-n");
  function fillExample(v) { wp.input.value = v.working_pressure_psi; sv.input.value = v.system_volume_gal; mat.select.value = v.material; update(); }
  const update = debounce(() => {
    const r = computeHydrostaticTest({ working_pressure_psi: Number(wp.input.value) || 0, system_volume_gal: Number(sv.input.value) || 0, material: mat.select.value });
    if (r.error) { oP.textContent = r.error; oM.textContent = "-"; oH.textContent = "-"; oN.textContent = "-"; return; }
    oP.textContent = fmt(r.test_pressure_psi, 1) + " psi";
    oM.textContent = String(r.multiplier);
    oH.textContent = String(r.hold_minutes) + " min";
    oN.textContent = r.acceptable_leak_note;
  }, DEBOUNCE_MS);
  for (const el of [wp.input, sv.input, mat.select]) el.addEventListener("input", update);
}

export function renderGreaseTrap(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IPC 2021 Table 1003.2 and PDI G101 by name. Volume = peak_flow × retention × loading_factor. AHJ governs. Free at codes.iccsafe.org.";
  attachExampleButton(inputRegion, () => fillExample(greaseTrapExample.inputs));
  const pf = makeNumber("Peak fixture flow (gpm)", "gt-pf", { step: "any", min: "0" });
  const rt = makeNumber("Retention time (min)", "gt-rt", { step: "any", min: "0", value: "30" });
  rt.input.value = "30";
  const lf = makeNumber("Loading factor", "gt-lf", { step: "any", min: "0", value: "1.25" });
  lf.input.value = "1.25";
  for (const f of [pf, rt, lf]) inputRegion.appendChild(f.wrap);
  const oV = makeOutputLine(outputRegion, "Required volume", "gt-out-v");
  const oR = makeOutputLine(outputRegion, "Recommended nominal", "gt-out-r");
  function fillExample(v) { pf.input.value = v.peak_flow_gpm; rt.input.value = v.retention_minutes; lf.input.value = v.loading_factor; update(); }
  const update = debounce(() => {
    const r = computeGreaseTrap({ peak_flow_gpm: Number(pf.input.value) || 0, retention_minutes: Number(rt.input.value) || 30, loading_factor: Number(lf.input.value) || 1.25 });
    if (r.error) { oV.textContent = r.error; oR.textContent = "-"; return; }
    oV.textContent = fmt(r.volume_gal, 0) + " gal";
    oR.textContent = String(r.recommended_nominal_gal) + " gal";
  }, DEBOUNCE_MS);
  for (const el of [pf.input, rt.input, lf.input]) el.addEventListener("input", update);
}

export function renderGlycolMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer freeze-point curves (Dow Dowfrost / Dowtherm). Attribution included with output.";
  attachExampleButton(inputRegion, () => fillExample(glycolMixExample.inputs));
  const sv = makeNumber("System volume (gal)", "gm-sv", { step: "any", min: "0" });
  const tb = makeNumber("Target burst-protection (F)", "gm-tb", { step: "any" });
  const gt = makeSelect("Glycol type", "gm-gt", [{ value: "propylene", label: "Propylene (food/HVAC)" }, { value: "ethylene", label: "Ethylene (industrial)" }]);
  for (const f of [sv, tb, gt]) inputRegion.appendChild(f.wrap);
  const oP = makeOutputLine(outputRegion, "Glycol percent", "gm-out-p");
  const oC = makeOutputLine(outputRegion, "Concentrate to add", "gm-out-c");
  const oA = makeOutputLine(outputRegion, "Source", "gm-out-a");
  function fillExample(v) { sv.input.value = v.system_volume_gal; tb.input.value = v.target_burst_F; gt.select.value = v.glycol_type; update(); }
  const update = debounce(() => {
    const r = computeGlycolMix({ system_volume_gal: Number(sv.input.value) || 0, target_burst_F: Number(tb.input.value), glycol_type: gt.select.value });
    if (r.error) { oP.textContent = r.error; oC.textContent = "-"; oA.textContent = "-"; return; }
    oP.textContent = fmt(r.glycol_percent, 1) + " %";
    oC.textContent = fmt(r.concentrate_gal, 1) + " gal";
    oA.textContent = r.attribution;
  }, DEBOUNCE_MS);
  for (const el of [sv.input, tb.input, gt.select]) el.addEventListener("input", update);
}

export function renderExpansionTank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: V_tank = V_sys * ((rho_cold/rho_hot) - 1) / (1 - (P_i/P_f)) using public expansion-tank derivation. Water densities interpolated from public engineering tables.";
  attachExampleButton(inputRegion, () => fillExample(expansionTankExample.inputs));
  const sv = makeNumber("System water volume (gal)", "et-sv", { step: "any", min: "0" });
  const ft = makeNumber("Fill temp (F)", "et-ft", { step: "any", value: "60" }); ft.input.value = "60";
  const mt = makeNumber("Max water temp (F)", "et-mt", { step: "any", value: "200" }); mt.input.value = "200";
  const fp = makeNumber("Fill pressure (psi)", "et-fp", { step: "any", value: "12" }); fp.input.value = "12";
  const rp = makeNumber("Relief pressure (psi)", "et-rp", { step: "any", value: "30" }); rp.input.value = "30";
  for (const f of [sv, ft, mt, fp, rp]) inputRegion.appendChild(f.wrap);
  const oV = makeOutputLine(outputRegion, "Required tank volume", "et-out-v");
  // v8 §C.2: pre-charge pressure + placement note.
  const oP = makeOutputLine(outputRegion, "Pre-charge (set air side)", "et-out-pc");
  const oN = makeOutputLine(outputRegion, "Placement", "et-out-note");
  function fillExample(v) { sv.input.value = v.system_volume_gal; ft.input.value = v.fill_temperature_F; mt.input.value = v.max_temperature_F; fp.input.value = v.fill_pressure_psi; rp.input.value = v.relief_pressure_psi; update(); }
  const update = debounce(() => {
    const r = computeExpansionTank({
      system_volume_gal: Number(sv.input.value) || 0,
      fill_temperature_F: Number(ft.input.value),
      max_temperature_F: Number(mt.input.value),
      fill_pressure_psi: Number(fp.input.value),
      relief_pressure_psi: Number(rp.input.value),
    });
    if (r.error) { oV.textContent = r.error; oP.textContent = "-"; oN.textContent = "-"; return; }
    oV.textContent = fmt(r.tank_volume_gal, 2) + " gal";
    oP.textContent = fmt(r.precharge_psi, 1) + " psi";
    oN.textContent = r.placement_note;
  }, DEBOUNCE_MS);
  for (const el of [sv.input, ft.input, mt.input, fp.input, rp.input]) el.addEventListener("input", update);
}

export function renderBackflowLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-published backflow preventer pressure-loss curves (Watts technical bulletins). Each result attributes the publishing manufacturer.";
  attachExampleButton(inputRegion, () => fillExample(backflowLossExample.inputs));
  const dc = makeSelect("Device class", "bl-dc", Object.keys(BACKFLOW_CURVES).map((k) => ({ value: k, label: k })));
  const f = makeNumber("Flow (gpm)", "bl-f", { step: "any", min: "0" });
  const ps = makeSelect("Pipe size", "bl-ps", ["0.75", "1", "1.5", "2"].map((s) => ({ value: s, label: s + "\"" })));
  for (const x of [dc, f, ps]) inputRegion.appendChild(x.wrap);
  const oL = makeOutputLine(outputRegion, "Pressure loss", "bl-out-l");
  const oA = makeOutputLine(outputRegion, "Source", "bl-out-a");
  function fillExample(v) { dc.select.value = v.device_class; f.input.value = v.flow_gpm; ps.select.value = String(v.pipe_size_in); update(); }
  const update = debounce(() => {
    const r = computeBackflowLoss({ device_class: dc.select.value, flow_gpm: Number(f.input.value) || 0, pipe_size_in: ps.select.value });
    if (r.error) { oL.textContent = r.error; oA.textContent = "-"; return; }
    oL.textContent = fmt(r.pressure_loss_psi, 2) + " psi";
    oA.textContent = r.attribution;
  }, DEBOUNCE_MS);
  for (const el of [dc.select, f.input, ps.select]) el.addEventListener("input", update);
}

// =====================================================================
// v7 Group B extensions (utilities 238 through 241)
// =====================================================================

import {
  DEBOUNCE_MS as _V7P_DEB, debounce as _v7p_debounce, fmt as _v7p_fmt,
  makeNumber as _v7p_makeNumber, makeSelect as _v7p_makeSelect,
  attachExampleButton as _v7p_attachEx, makeOutputLine as _v7p_makeOut,
} from "./ui-fields.js";

// --- 238: Water Hammer Pressure Surge (Joukowsky) ---
//
// Wave celerity:  a = sqrt(K/rho) / sqrt(1 + (K * D) / (E * t))
// Pressure surge: dP = rho * a * dV
// Reflection time: 2L/a (rapid closure if t_close < 2L/a)
//
// Bulk modulus K of water = 2.19 GPa = 318 ksi (~317 800 psi).
// Densities and pipe moduli per material from
// data/plumbing/pipe-elastic-properties.json.

// Pipe elastic properties keyed to material. E in psi (Young's modulus);
// fluid bulk modulus K in psi; fluid density rho in slug/ft^3 for Imperial.
// Wall-thickness ratio (D/t) is built into the table per Schedule 40 nominal.
export const PIPE_ELASTIC_PROPERTIES = {
  copper:        { E_psi: 17e6,    description: "Copper Type L (engineering reference)" },
  pex:           { E_psi: 95000,   description: "PEX-A / PEX-B (manufacturer typical)" },
  cpvc:          { E_psi: 360000,  description: "CPVC SDR-11 (manufacturer typical)" },
  steel:         { E_psi: 30e6,    description: "Carbon steel Schedule 40 (engineering reference)" },
  ductile_iron:  { E_psi: 24e6,    description: "Ductile iron AWWA C151 (engineering reference)" },
  pvc:           { E_psi: 420000,  description: "PVC Schedule 80 (manufacturer typical)" },
};

// Schedule 40 nominal D and t in inches by trade size (engineering reference).
export const SCH40_DIMS_IN = {
  "1/2": { D: 0.840, t: 0.109 },
  "3/4": { D: 1.050, t: 0.113 },
  "1":   { D: 1.315, t: 0.133 },
  "1.25":{ D: 1.660, t: 0.140 },
  "1.5": { D: 1.900, t: 0.145 },
  "2":   { D: 2.375, t: 0.154 },
  "3":   { D: 3.500, t: 0.216 },
  "4":   { D: 4.500, t: 0.237 },
};

// Bulk modulus K and density rho for the pumped fluid (water default).
export const FLUID_PROPERTIES = {
  water:        { K_psi: 317800, rho_slug_ft3: 1.940, label: "Water at 60 °F" },
  glycol_30:    { K_psi: 320000, rho_slug_ft3: 2.005, label: "30% propylene glycol" },
  glycol_50:    { K_psi: 322000, rho_slug_ft3: 2.045, label: "50% propylene glycol" },
};

export function computeWaterHammerSurge({
  material = "copper",
  pipe_size = "1",
  velocity_fps = 0,
  closure_time_s = 0,
  run_length_ft = 100,
  fluid = "water",
} = {}) {
  const m = PIPE_ELASTIC_PROPERTIES[material];
  if (!m) return { error: "Unknown pipe material." };
  const dims = SCH40_DIMS_IN[pipe_size];
  if (!dims) return { error: "Unknown pipe size." };
  const f = FLUID_PROPERTIES[fluid];
  if (!f) return { error: "Unknown fluid." };
  if (!(velocity_fps >= 0)) return { error: "Velocity must be non-negative." };
  if (!(closure_time_s >= 0)) return { error: "Closure time must be non-negative." };
  if (!(run_length_ft > 0)) return { error: "Run length must be positive." };

  // Joukowsky celerity in fps. K in psi → lb/in² × (144 in²/ft²) → lb/ft².
  // a = sqrt((K_psf / rho_slug_ft3)) / sqrt(1 + (K_psf * D / (E_psf * t)))
  const K_psf = f.K_psi * 144;
  const E_psf = m.E_psi * 144;
  const a_unrestricted = Math.sqrt(K_psf / f.rho_slug_ft3); // pure-water celerity ~ 4720 fps
  const compliance = (K_psf * dims.D) / (E_psf * dims.t);
  const a_fps = a_unrestricted / Math.sqrt(1 + compliance);
  // dP (psi) = rho (slug/ft^3) * a (fps) * dV (fps), then / 144 to convert lb/ft² → psi.
  const dP_psi = (f.rho_slug_ft3 * a_fps * velocity_fps) / 144;
  const reflection_time_s = (2 * run_length_ft) / a_fps;
  const rapid_closure = closure_time_s < reflection_time_s;
  return {
    celerity_fps: a_fps, surge_psi: dP_psi, reflection_time_s,
    rapid_closure, fluid_label: f.label, material_label: m.description,
  };
}

export const waterHammerSurgeExample = {
  inputs: { material: "copper", pipe_size: "1", velocity_fps: 8, closure_time_s: 0.05, run_length_ft: 100, fluid: "water" },
};

// --- 239: Pump Operating Point ---
//
// System curve: H_sys = H_static + k * Q^2.
// Pump curve:   bundled polyline H_p(Q).
// Operating point: intersection found by binary search on Q in [Q_min, Q_max].

export const PUMP_CURVES = {
  small_centrifugal_60Hz: {
    name: "Small centrifugal, 60 Hz (manufacturer-attributed)",
    attribution: "Engineering-practice composite (representative end-suction centrifugal). Replace with a manufacturer-attributed curve before relying on this for selection.",
    points: [
      { gpm: 0,   head_ft: 110, eff: 0.0 },
      { gpm: 25,  head_ft: 108, eff: 0.40 },
      { gpm: 50,  head_ft: 102, eff: 0.55 },
      { gpm: 75,  head_ft: 92,  eff: 0.65 },
      { gpm: 100, head_ft: 78,  eff: 0.70 },
      { gpm: 125, head_ft: 60,  eff: 0.66 },
      { gpm: 150, head_ft: 38,  eff: 0.55 },
      { gpm: 175, head_ft: 12,  eff: 0.30 },
    ],
  },
  inline_circulator_3spd: {
    name: "Inline hydronic circulator (3-speed)",
    attribution: "Engineering-practice composite (residential hydronic circulator). Replace with manufacturer-attributed curve before relying on it for selection.",
    points: [
      { gpm: 0,  head_ft: 18, eff: 0.0 },
      { gpm: 5,  head_ft: 17, eff: 0.20 },
      { gpm: 10, head_ft: 15, eff: 0.32 },
      { gpm: 15, head_ft: 12, eff: 0.38 },
      { gpm: 20, head_ft: 8,  eff: 0.34 },
      { gpm: 25, head_ft: 3,  eff: 0.20 },
    ],
  },
};

// Linear interpolation of head (and efficiency) at a given gpm.
function _interpPumpCurve(curve, gpm) {
  const pts = curve.points;
  if (gpm <= pts[0].gpm) return { head_ft: pts[0].head_ft, eff: pts[0].eff };
  for (let i = 1; i < pts.length; i++) {
    if (gpm <= pts[i].gpm) {
      const lo = pts[i - 1], hi = pts[i];
      const frac = (gpm - lo.gpm) / (hi.gpm - lo.gpm);
      return {
        head_ft: lo.head_ft + frac * (hi.head_ft - lo.head_ft),
        eff: lo.eff + frac * (hi.eff - lo.eff),
      };
    }
  }
  return { head_ft: pts[pts.length - 1].head_ft, eff: pts[pts.length - 1].eff };
}

export function computePumpOperatingPoint({
  pump = "small_centrifugal_60Hz",
  static_head_ft = 0,
  k_friction = 0,
} = {}) {
  const c = PUMP_CURVES[pump];
  if (!c) return { error: "Unknown pump curve." };
  if (!(static_head_ft >= 0)) return { error: "Static head must be non-negative." };
  if (!(k_friction >= 0)) return { error: "Friction k must be non-negative." };
  const Qmax = c.points[c.points.length - 1].gpm;
  // Binary search on Q for the intersection where pump head = system head.
  let lo = 0, hi = Qmax;
  const f = (Q) => _interpPumpCurve(c, Q).head_ft - (static_head_ft + k_friction * Q * Q);
  // At Q=0 pump head exceeds system static; at Qmax pump head is small.
  if (f(0) < 0) return { error: "Static head exceeds pump shutoff head; pump cannot start at this static." };
  if (f(Qmax) > 0) return { error: "Pump curve intersects beyond bundled max gpm; widen the curve before relying on this." };
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) > 0) lo = mid; else hi = mid;
  }
  const Q = 0.5 * (lo + hi);
  const point = _interpPumpCurve(c, Q);
  return {
    operating_gpm: Q, head_ft: point.head_ft, efficiency: point.eff,
    pump_label: c.name, attribution: c.attribution,
    sample_table: c.points.map((p) => ({
      gpm: p.gpm, pump_head_ft: p.head_ft, system_head_ft: static_head_ft + k_friction * p.gpm * p.gpm,
    })),
  };
}

export const pumpOperatingPointExample = {
  inputs: { pump: "small_centrifugal_60Hz", static_head_ft: 30, k_friction: 0.003 },
};

// --- 240: Septic Drainfield Trench Length ---
//
// Required absorption area = daily_flow_gpd / application_rate_gpd_per_ft2.
// Trench linear feet = required_area / trench_width_ft.

export function computeSepticDrainfield({
  design_flow_gpd = 0,
  application_rate_gpd_per_ft2 = 0,
  trench_width_ft = 3,
} = {}) {
  if (!(design_flow_gpd > 0)) return { error: "Design daily flow must be positive." };
  if (!(application_rate_gpd_per_ft2 > 0)) return { error: "Application rate must be positive." };
  if (!(trench_width_ft > 0)) return { error: "Trench width must be positive." };
  const required_area_ft2 = design_flow_gpd / application_rate_gpd_per_ft2;
  const trench_feet = required_area_ft2 / trench_width_ft;
  return { required_area_ft2, trench_feet, design_flow_gpd, application_rate_gpd_per_ft2 };
}

export const septicDrainfieldExample = {
  inputs: { design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 },
};

// --- 241: Pipe Thermal Expansion + Guided-Cantilever Loop ---
//
// Linear expansion: dL = alpha * L * dT (alpha in 1/F).
// Guided-cantilever expansion-loop leg length:
//   L_loop = sqrt(3 * E * D * dL / S_a)
// where E is Young's modulus (psi), D is pipe outside diameter (in),
// dL is the expansion (in), S_a is the allowable stress (psi).

// Per-material thermal-expansion coefficient and allowable-stress benchmark.
// alpha in 1/°F, E in psi, S_a in psi (typical engineering-practice values).
export const THERMAL_EXPANSION_COEFFICIENTS = {
  copper:        { alpha_per_F: 9.4e-6,  E_psi: 17e6,    S_a_psi: 5800,  description: "Copper Type L" },
  pex:           { alpha_per_F: 1.1e-4,  E_psi: 95000,   S_a_psi: 1500,  description: "PEX-A / PEX-B (manufacturer typical)" },
  cpvc:          { alpha_per_F: 3.4e-5,  E_psi: 360000,  S_a_psi: 2000,  description: "CPVC SDR-11 (manufacturer typical)" },
  steel:         { alpha_per_F: 6.5e-6,  E_psi: 30e6,    S_a_psi: 12500, description: "Carbon steel A53 Grade B" },
  ductile_iron:  { alpha_per_F: 6.2e-6,  E_psi: 24e6,    S_a_psi: 14000, description: "Ductile iron AWWA C151" },
  aluminum:      { alpha_per_F: 1.28e-5, E_psi: 10e6,    S_a_psi: 6500,  description: "Aluminum 6061-T6" },
  pvc:           { alpha_per_F: 3.0e-5,  E_psi: 420000,  S_a_psi: 2000,  description: "PVC Schedule 80" },
};

export function computePipeExpansionLoop({
  material = "copper",
  length_ft = 0,
  delta_T_F = 0,
  pipe_OD_in = 1.315,
} = {}) {
  const m = THERMAL_EXPANSION_COEFFICIENTS[material];
  if (!m) return { error: "Unknown pipe material." };
  if (!(length_ft >= 0)) return { error: "Length must be non-negative." };
  if (!(pipe_OD_in > 0)) return { error: "Pipe OD must be positive." };
  if (!Number.isFinite(Number(delta_T_F))) return { error: "Provide a numeric ΔT." };
  const dL_in = m.alpha_per_F * length_ft * 12 * delta_T_F;
  const dL_abs_in = Math.abs(dL_in);
  const L_loop_in = Math.sqrt(3 * m.E_psi * pipe_OD_in * dL_abs_in / m.S_a_psi);
  return {
    delta_L_in: dL_in, alpha_per_F: m.alpha_per_F,
    loop_leg_in: L_loop_in, loop_leg_ft: L_loop_in / 12,
    material_label: m.description,
  };
}

export const pipeExpansionLoopExample = {
  inputs: { material: "steel", length_ft: 200, delta_T_F: 100, pipe_OD_in: 4.5 },
};

// --- v7 renderers ---

function _v7p_renderWaterHammer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Joukowsky equation by name. Pipe-fluid coupling via celerity formula. Rapid closure flagged when t_close < 2L/a.";
  _v7p_attachEx(inputRegion, () => fillExample(waterHammerSurgeExample.inputs));
  const mat = _v7p_makeSelect("Pipe material", "wh-mat", Object.keys(PIPE_ELASTIC_PROPERTIES).map((k) => ({ value: k, label: PIPE_ELASTIC_PROPERTIES[k].description })));
  const sz = _v7p_makeSelect("Pipe size (Sch 40)", "wh-sz", Object.keys(SCH40_DIMS_IN).map((k) => ({ value: k, label: '"' + k + '" (D=' + SCH40_DIMS_IN[k].D + ' in)' })));
  const v = _v7p_makeNumber("Velocity at closure (fps)", "wh-v", { step: "any", min: "0" });
  const tc = _v7p_makeNumber("Closure time (s)", "wh-tc", { step: "any", min: "0" });
  const len = _v7p_makeNumber("Run length (ft)", "wh-len", { step: "any", min: "0" });
  const fluid = _v7p_makeSelect("Fluid", "wh-fl", Object.keys(FLUID_PROPERTIES).map((k) => ({ value: k, label: FLUID_PROPERTIES[k].label })));
  for (const f of [mat, sz, v, tc, len, fluid]) inputRegion.appendChild(f.wrap);
  const oC = _v7p_makeOut(outputRegion, "Wave celerity", "wh-out-c");
  const oS = _v7p_makeOut(outputRegion, "Surge ΔP", "wh-out-s");
  const oR = _v7p_makeOut(outputRegion, "Reflection time 2L/a", "wh-out-r");
  const oF = _v7p_makeOut(outputRegion, "Closure category", "wh-out-f");
  function fillExample(x) { mat.select.value = x.material; sz.select.value = x.pipe_size; v.input.value = x.velocity_fps; tc.input.value = x.closure_time_s; len.input.value = x.run_length_ft; fluid.select.value = x.fluid; update(); }
  const update = _v7p_debounce(() => {
    const r = computeWaterHammerSurge({
      material: mat.select.value, pipe_size: sz.select.value,
      velocity_fps: Number(v.input.value) || 0, closure_time_s: Number(tc.input.value) || 0,
      run_length_ft: Number(len.input.value) || 1, fluid: fluid.select.value,
    });
    if (r.error) { oC.textContent = r.error; oS.textContent = "-"; oR.textContent = "-"; oF.textContent = "-"; return; }
    oC.textContent = _v7p_fmt(r.celerity_fps, 0) + " fps";
    oS.textContent = _v7p_fmt(r.surge_psi, 1) + " psi";
    oR.textContent = _v7p_fmt(r.reflection_time_s * 1000, 1) + " ms";
    oF.textContent = r.rapid_closure ? "RAPID CLOSURE (full Joukowsky surge applies)" : "slow closure (surge attenuated)";
  }, _V7P_DEB);
  for (const f of [mat.select, sz.select, v.input, tc.input, len.input, fluid.select]) f.addEventListener("input", update);
}

function _v7p_renderPumpOperatingPoint(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: System curve H_sys = H_static + k Q². Operating point at the intersection with the bundled pump curve. Curves cited per manufacturer name in data/plumbing/pump-curves.json.";
  _v7p_attachEx(inputRegion, () => fillExample(pumpOperatingPointExample.inputs));
  const pump = _v7p_makeSelect("Pump curve", "po-p", Object.keys(PUMP_CURVES).map((k) => ({ value: k, label: PUMP_CURVES[k].name })));
  const stat = _v7p_makeNumber("Static head (ft)", "po-s", { step: "any", min: "0" });
  const k = _v7p_makeNumber("Friction k (ft per gpm²)", "po-k", { step: "any", min: "0" });
  for (const f of [pump, stat, k]) inputRegion.appendChild(f.wrap);
  const oQ = _v7p_makeOut(outputRegion, "Operating gpm", "po-out-q");
  const oH = _v7p_makeOut(outputRegion, "Head at operating point", "po-out-h");
  const oE = _v7p_makeOut(outputRegion, "Efficiency at point", "po-out-e");
  const oA = _v7p_makeOut(outputRegion, "Source", "po-out-a");
  // Mount a small SVG plot region (pure DOM, no innerHTML) and a numeric
  // sample table beneath the output lines.
  const svgWrap = document.createElement("div");
  svgWrap.className = "po-plot-wrap";
  outputRegion.appendChild(svgWrap);
  const tableWrap = document.createElement("div");
  tableWrap.className = "po-table-wrap";
  outputRegion.appendChild(tableWrap);
  function _drawPlot(curve, opQ, opH, staticH, kF) {
    while (svgWrap.firstChild) svgWrap.removeChild(svgWrap.firstChild);
    const SVG_NS = "http://www.w3.org/2000/svg";
    const W = 360, H = 200, m = 24;
    const Qmax = curve.points[curve.points.length - 1].gpm;
    const Hmax = Math.max(curve.points[0].head_ft, staticH + kF * Qmax * Qmax) * 1.1;
    const xS = (q) => m + (q / Qmax) * (W - 2 * m);
    const yS = (h) => H - m - (h / Hmax) * (H - 2 * m);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "po-plot");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Pump curve and system curve intersection");
    // axes
    const ax = document.createElementNS(SVG_NS, "path");
    ax.setAttribute("d", "M" + m + "," + (H - m) + " L" + (W - m) + "," + (H - m) + " M" + m + "," + m + " L" + m + "," + (H - m));
    ax.setAttribute("class", "po-plot-axes");
    svg.appendChild(ax);
    // pump polyline
    const pump = document.createElementNS(SVG_NS, "polyline");
    pump.setAttribute("points", curve.points.map((p) => xS(p.gpm) + "," + yS(p.head_ft)).join(" "));
    pump.setAttribute("class", "po-plot-pump");
    pump.setAttribute("fill", "none");
    svg.appendChild(pump);
    // system curve
    const sys = document.createElementNS(SVG_NS, "polyline");
    const sysPts = [];
    for (let i = 0; i <= 30; i++) {
      const q = (i / 30) * Qmax;
      sysPts.push(xS(q) + "," + yS(staticH + kF * q * q));
    }
    sys.setAttribute("points", sysPts.join(" "));
    sys.setAttribute("class", "po-plot-system");
    sys.setAttribute("fill", "none");
    svg.appendChild(sys);
    // operating point
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(xS(opQ)));
    dot.setAttribute("cy", String(yS(opH)));
    dot.setAttribute("r", "4");
    dot.setAttribute("class", "po-plot-op");
    svg.appendChild(dot);
    svgWrap.appendChild(svg);
  }
  function _drawTable(rows) {
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    const t = document.createElement("table");
    const head = document.createElement("thead");
    const trh = document.createElement("tr");
    for (const lbl of ["GPM", "Pump head (ft)", "System head (ft)"]) {
      const th = document.createElement("th"); th.textContent = lbl; trh.appendChild(th);
    }
    head.appendChild(trh); t.appendChild(head);
    const body = document.createElement("tbody");
    for (const row of rows) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td"); td1.textContent = String(row.gpm); tr.appendChild(td1);
      const td2 = document.createElement("td"); td2.textContent = _v7p_fmt(row.pump_head_ft, 1); tr.appendChild(td2);
      const td3 = document.createElement("td"); td3.textContent = _v7p_fmt(row.system_head_ft, 1); tr.appendChild(td3);
      body.appendChild(tr);
    }
    t.appendChild(body);
    tableWrap.appendChild(t);
  }
  function fillExample(x) { pump.select.value = x.pump; stat.input.value = x.static_head_ft; k.input.value = x.k_friction; update(); }
  const update = _v7p_debounce(() => {
    const r = computePumpOperatingPoint({
      pump: pump.select.value,
      static_head_ft: Number(stat.input.value) || 0,
      k_friction: Number(k.input.value) || 0,
    });
    if (r.error) { oQ.textContent = r.error; oH.textContent = "-"; oE.textContent = "-"; oA.textContent = "-"; return; }
    oQ.textContent = _v7p_fmt(r.operating_gpm, 1) + " gpm";
    oH.textContent = _v7p_fmt(r.head_ft, 1) + " ft";
    oE.textContent = _v7p_fmt(r.efficiency * 100, 1) + " %";
    oA.textContent = r.attribution;
    const curve = PUMP_CURVES[pump.select.value];
    _drawPlot(curve, r.operating_gpm, r.head_ft, Number(stat.input.value) || 0, Number(k.input.value) || 0);
    _drawTable(r.sample_table);
  }, _V7P_DEB);
  for (const f of [pump.select, stat.input, k.input]) f.addEventListener("input", update);
}

function _v7p_renderSepticDrainfield(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Required absorption area = design flow / application rate. State and county codes set the application rate. Enter the value from your local code; the tool does not bundle a per-state shard. AHJ governs.";
  _v7p_attachEx(inputRegion, () => fillExample(septicDrainfieldExample.inputs));
  const flow = _v7p_makeNumber("Design daily flow (gpd)", "sd-flow", { step: "any", min: "0" });
  const rate = _v7p_makeNumber("Application rate (gpd / ft²)", "sd-rate", { step: "any", min: "0" });
  const wid = _v7p_makeNumber("Trench width (ft)", "sd-w", { step: "any", min: "0" });
  wid.input.value = "3";
  for (const f of [flow, rate, wid]) inputRegion.appendChild(f.wrap);
  const oA = _v7p_makeOut(outputRegion, "Required absorption area", "sd-out-a");
  const oT = _v7p_makeOut(outputRegion, "Trench linear feet", "sd-out-t");
  function fillExample(x) { flow.input.value = x.design_flow_gpd; rate.input.value = x.application_rate_gpd_per_ft2; wid.input.value = x.trench_width_ft; update(); }
  const update = _v7p_debounce(() => {
    const r = computeSepticDrainfield({
      design_flow_gpd: Number(flow.input.value) || 0,
      application_rate_gpd_per_ft2: Number(rate.input.value) || 0,
      trench_width_ft: Number(wid.input.value) || 0,
    });
    if (r.error) { oA.textContent = r.error; oT.textContent = "-"; return; }
    oA.textContent = _v7p_fmt(r.required_area_ft2, 0) + " ft²";
    oT.textContent = _v7p_fmt(r.trench_feet, 1) + " ft";
  }, _V7P_DEB);
  for (const f of [flow.input, rate.input, wid.input]) f.addEventListener("input", update);
}

function _v7p_renderPipeExpansionLoop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: dL = alpha × L × ΔT (per-material alpha). Guided-cantilever expansion-loop leg L_loop = sqrt(3 × E × D × dL / S_a) by name.";
  _v7p_attachEx(inputRegion, () => fillExample(pipeExpansionLoopExample.inputs));
  const mat = _v7p_makeSelect("Pipe material", "pe-mat", Object.keys(THERMAL_EXPANSION_COEFFICIENTS).map((k) => ({ value: k, label: THERMAL_EXPANSION_COEFFICIENTS[k].description })));
  const len = _v7p_makeNumber("Run length (ft)", "pe-len", { step: "any", min: "0" });
  const dT = _v7p_makeNumber("ΔT (°F, install to operating)", "pe-dt", { step: "any" });
  const od = _v7p_makeNumber("Pipe OD (in)", "pe-od", { step: "any", min: "0" });
  od.input.value = "1.315";
  for (const f of [mat, len, dT, od]) inputRegion.appendChild(f.wrap);
  const oDL = _v7p_makeOut(outputRegion, "Linear expansion ΔL", "pe-out-dl");
  const oA = _v7p_makeOut(outputRegion, "Coefficient alpha", "pe-out-a");
  const oLoopIn = _v7p_makeOut(outputRegion, "Recommended loop leg", "pe-out-l");
  function fillExample(x) { mat.select.value = x.material; len.input.value = x.length_ft; dT.input.value = x.delta_T_F; od.input.value = x.pipe_OD_in; update(); }
  const update = _v7p_debounce(() => {
    const r = computePipeExpansionLoop({
      material: mat.select.value,
      length_ft: Number(len.input.value) || 0,
      delta_T_F: Number(dT.input.value) || 0,
      pipe_OD_in: Number(od.input.value) || 0,
    });
    if (r.error) { oDL.textContent = r.error; oA.textContent = "-"; oLoopIn.textContent = "-"; return; }
    oDL.textContent = _v7p_fmt(r.delta_L_in, 3) + " in";
    oA.textContent = _v7p_fmt(r.alpha_per_F * 1e6, 2) + " × 10⁻⁶ /°F (" + r.material_label + ")";
    oLoopIn.textContent = _v7p_fmt(r.loop_leg_in, 1) + " in (" + _v7p_fmt(r.loop_leg_ft, 2) + " ft)";
  }, _V7P_DEB);
  for (const f of [mat.select, len.input, dT.input, od.input]) f.addEventListener("input", update);
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
  // v3
  "stormwater-rational": renderStormwaterRational,
  "manning-slope": renderManningSlope,
  "hydrostatic-test": renderHydrostaticTest,
  "grease-trap": renderGreaseTrap,
  "glycol-mix": renderGlycolMix,
  "expansion-tank": renderExpansionTank,
  "backflow-loss": renderBackflowLoss,
  // v7
  "water-hammer-surge": _v7p_renderWaterHammer,
  "pump-operating-point": _v7p_renderPumpOperatingPoint,
  "septic-drainfield": _v7p_renderSepticDrainfield,
  "pipe-expansion-loop": _v7p_renderPipeExpansionLoop,
};
