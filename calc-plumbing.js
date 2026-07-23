// Group B: Plumbing and Gas calculators (utilities 12 through 20).

import {
  hazenWilliamsFrictionLoss,
  feetOfHeadToPsi,
  darcyWeisbachFrictionLoss,
} from "./pure-math.js";
// spec-v86 cap-relief split: the onsite-wastewater / septic bench (septic-tank,
// septic-drainfield, septic-dose-tank, septic-pumpout-interval,
// septic-lpp-orifice) relocated to calc-septic.js. The limitation-banner import
// moved with it (only the drainfield renderer used it), leaving no orphan here.

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
// dims: in { gpm: L^3 T^-1 } out: { size_in: L }
export function recommendedSupplySize(gpm) {
  if (gpm <= 4) return "1/2";
  if (gpm <= 12) return "3/4";
  if (gpm <= 25) return "1";
  if (gpm <= 50) return "1-1/4";
  if (gpm <= 80) return "1-1/2";
  return "2 or larger";
}

// Drainage minimum size by total DFU (consensus engineering values).
// dims: in { dfu: dimensionless, slope_in_per_ft: dimensionless } out: { size_in: L }
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

// dims: in { presetId: dimensionless } out: { preset: dimensionless }
export function pipeSizingFromPreset(presetId) {
  const p = PIPE_SIZING_RESIDENTIAL_PRESETS[presetId];
  if (!p) return { error: "Unknown residential preset." };
  return computePipeSizing({ fixtures: p.fixtures, slope_in_per_ft: 0.25 });
}

// dims: in { fixtures: dimensionless, slope_in_per_ft: dimensionless } out: { wsfu: dimensionless, dfu: dimensionless, supply_size_in: L, drain_size_in: L }
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

// dims: in { method: dimensionless, material: dimensionless, nominal_size: L, length_ft: L, flow_gpm: L^3 T^-1, internal_diameter_in: L } out: { head_loss_ft: L, pressure_loss_psi: M L^-1 T^-2 }
export function computeFrictionLoss({ method, material, nominal_size, length_ft, flow_gpm, internal_diameter_in }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  expectedRange: { pressureLoss_psi: { min: 2.0, max: 2.8 } },
};

// --- Utility 14: Pipe Volume ---

// dims: in { internal_diameter_in: L, length_ft: L, nominal_size: L } out: { volume_gal: L^3 }
export function computePipeVolume({ internal_diameter_in, length_ft, nominal_size }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = internal_diameter_in || SCH40_ID_IN[String(nominal_size)];
  if (!d) return { error: "Unknown nominal size; provide internal diameter directly." };
  // V (in^3) = pi/4 * d^2 * L_in. 1 gal = 231 in^3.
  const L_in = length_ft * 12;
  const v_in3 = (Math.PI / 4) * d * d * L_in;
  const gallons = v_in3 / 231;
  const cubic_feet = v_in3 / 1728;
  return { gallons, gallons_per_ft: length_ft > 0 ? gallons / length_ft : null, cubic_feet };
}

export const pipeVolumeExample = {
  inputs: { nominal_size: "1", length_ft: 100 },
  expectedRange: { gallons: { min: 4.0, max: 4.8 } },
};

// --- Utility 15: Pump Sizing ---

// dims: in { flow_gpm: L^3 T^-1, total_dynamic_head_ft: L, efficiency: dimensionless, fluid_specific_gravity: dimensionless } out: { brake_hp: M L^2 T^-3, motor_hp: M L^2 T^-3 }
export function computePumpSize({ flow_gpm, total_dynamic_head_ft, efficiency = 0.65, fluid_specific_gravity = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { elevation_change_ft: L, friction_loss_psi: M L^-1 T^-2, fluid_density_lb_ft3: M L^-3 } out: { total_pressure_loss_psi: M L^-1 T^-2 }
export function computeStaticPressureLossPiping({ elevation_change_ft, friction_loss_psi = 0, fluid_density_lb_ft3 = 62.4 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // DR-09: a non-positive density is non-physical (yields zero/negative head).
  if (!(fluid_density_lb_ft3 > 0)) return { error: "Fluid density must be positive." };
  const elev_psi = (elevation_change_ft * fluid_density_lb_ft3) / 144;
  return { elevation_loss_psi: elev_psi, friction_loss_psi, total_psi: elev_psi + friction_loss_psi };
}

export const staticPressurePipingExample = {
  inputs: { elevation_change_ft: 30, friction_loss_psi: 5 },
  expected: { total_psi_approx: 30 / 2.31 + 5 },
};

// --- Utility 17: Gas Pipe Sizing -> relocated to calc-gas.js (spec-v42 split) ---

// --- Utility 18: Slope ---

// dims: in { rise: L, run: L, units: dimensionless } out: { slope_in_per_ft: dimensionless, slope_percent: dimensionless, slope_degrees: dimensionless }
export function computeSlope({ rise, run, units = "in_per_ft" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { value: M L^-1 T^-2, from: dimensionless, to: dimensionless } out: { value: M L^-1 T^-2 }
export function pressureConvert({ value, from, to }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { args: dimensionless } out: { reference: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// renderGasPipeSizing -> relocated to calc-gas.js (spec-v42 split)

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { wsfu: dimensionless, length_ft: L, internal_diameter_in: L, system_pressure_psi: M L^-1 T^-2 } out: { aa_size: dimensionless, pre_charge_psi: M L^-1 T^-2 }
export function computeWaterHammerArrestor({ wsfu, length_ft = 0, internal_diameter_in = 0, system_pressure_psi = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { args: dimensionless } out: { head_ft: L, flow_gpm: L^3 T^-1, pump_hp: M L^2 T^-3 }
export function computeRecircPumpHead({
  pipe_length_ft, fittings_count = 0, target_flow_gpm,
  internal_diameter_in, material = "copper",
  equivalent_length_per_fitting_ft = 2,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  expectedRange: { head_ft: { min: 0.2, max: 10 } },
};

// --- Utility 74: Septic Tank Sizing -> relocated to calc-septic.js (spec-v86 split) ---

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

// dims: in { pipe_diameter_in: L, slope_in_per_ft: dimensionless } out: { max_trap_arm_in: L }
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

// dims: in { material: dimensionless, length_ft: L, delta_T_F: T } out: { expansion_in: L }
export function computePipeExpansion({ material, length_ft, delta_T_F }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { kbtu_input: M L^2 T^-3, climate_zone: dimensionless, target_outlet_F: T, solve_for: dimensionless, target_gpm: L^3 T^-1, inlet_override_F: T } out: { gpm: L^3 T^-1, kbtu_input: M L^2 T^-3, delta_T_F: T }
export function computeTanklessGPM({ kbtu_input, climate_zone, target_outlet_F = 110, solve_for = "gpm", target_gpm = 0, inlet_override_F = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let inlet = TANKLESS_INLET_F_BY_ZONE[climate_zone];
  if (inlet === undefined) return { error: "Unknown climate zone." };
  // v23 EN.4: optional inlet override (a summer/winter worst-case preset the
  // renderer fills) and a solve-for selector across {GPM, kBTU, delta-T}.
  const ov = Number(inlet_override_F);
  if (Number.isFinite(ov) && ov > 0) inlet = ov;
  const out = Number(target_outlet_F) || 0;
  const dT = out - inlet;
  if (solve_for === "kbtu") {
    const g = Number(target_gpm) || 0;
    if (!(g > 0 && Number.isFinite(g))) return { error: "Provide a positive target GPM." };
    if (!(dT > 0)) return { error: "Outlet must exceed inlet." };
    return { solve_for, kbtu_input: (g * 8.33 * 60 * dT) / 1000, gpm: g, delta_T_F: dT, inlet_F: inlet, target_outlet_F: out };
  }
  if (solve_for === "dt") {
    const g = Number(target_gpm) || 0;
    const kbtu = Number(kbtu_input) || 0;
    if (!(g > 0 && Number.isFinite(g))) return { error: "Provide a positive target GPM." };
    if (!(kbtu > 0 && Number.isFinite(kbtu))) return { error: "Provide positive kBTU." };
    const dt_req = (kbtu * 1000) / (8.33 * 60 * g);
    return { solve_for, delta_T_F: dt_req, gpm: g, kbtu_input: kbtu, inlet_F: inlet, target_outlet_F: inlet + dt_req };
  }
  const kbtu = Number(kbtu_input) || 0;
  if (kbtu <= 0 || dT <= 0) return { error: "Provide positive kBTU and outlet > inlet." };
  const gpm = (kbtu * 1000) / (8.33 * 60 * dT);
  return { gpm, delta_T_F: dT, inlet_F: inlet, target_outlet_F: out, solve_for: "gpm" };
}

export const tanklessGPMExample = {
  inputs: { kbtu_input: 199, climate_zone: "5A_Chicago_IL", target_outlet_F: 110 },
  expectedRange: { gpm: { min: 5, max: 8 } },
};

// --- Utility 78: Gas Leak Rate -> relocated to calc-gas.js (spec-v42 split) ---

// --- v2 view renderers ---

// v8 §C.2 / accessibility.md preset-chip pattern: typical static water
// pressure values residential / suburban / commercial techs see most often.
export const WHA_SYSTEM_PRESSURE_PRESETS = [
  { id: "low",      label: "Low 40 psi",     psi: 40, description: "Low residential / well system" },
  { id: "typical",  label: "Typical 60 psi", psi: 60, description: "Typical residential static pressure" },
  { id: "high",     label: "High 80 psi",    psi: 80, description: "High residential / commercial near PRV limit" },
];

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// renderSepticTank -> relocated to calc-septic.js (spec-v86 split)

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderTanklessGPM(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GPM = kBTU * 1000 / (8.33 * 60 * dT). 1 lb water requires 1 BTU per F; 1 gal water = 8.33 lb. Inlet temperatures by climate zone (NOAA design data).";
  // v23 EN.4: solve-for selector + worst-case inlet override (season preset).
  const solve = makeSelect("Solve for", "tl-s", [
    { value: "gpm", label: "GPM from kBTU + dT" },
    { value: "kbtu", label: "kBTU from GPM + dT" },
    { value: "dt", label: "dT from kBTU + GPM" },
  ]);
  const kbtu = makeNumber("Burner input (kBTU/hr)", "tl-k", { step: "any", min: "0" });
  const tgpm = makeNumber("Target flow (gpm, for inverse)", "tl-tg", { step: "any", min: "0" });
  const zone = makeSelect("Climate zone", "tl-z", Object.keys(TANKLESS_INLET_F_BY_ZONE).map((z) => ({ value: z, label: z.replace(/_/g, " ") })));
  const ovr = makeNumber("Inlet override (F, winter worst-case; blank = zone)", "tl-ov", { step: "any", min: "0" });
  const out = makeNumber("Target outlet (F)", "tl-o", { step: "any", min: "0", value: "110" });
  out.input.value = "110";
  for (const f of [solve, kbtu, tgpm, zone, ovr, out]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { solve.select.value = "kbtu"; kbtu.input.value = ""; tgpm.input.value = "5"; zone.select.value = "5A_Chicago_IL"; ovr.input.value = "40"; out.input.value = "110"; update(); });
  const oG = makeOutputLine(outputRegion, "Solved", "tl-out-g");
  const oI = makeOutputLine(outputRegion, "Inlet temperature", "tl-out-i");
  const oD = makeOutputLine(outputRegion, "delta T", "tl-out-d");
  const update = debounce(() => {
    const r = computeTanklessGPM({
      kbtu_input: Number(kbtu.input.value) || 0,
      climate_zone: zone.select.value,
      target_outlet_F: Number(out.input.value) || 0,
      solve_for: solve.select.value,
      target_gpm: Number(tgpm.input.value) || 0,
      inlet_override_F: Number(ovr.input.value) || 0,
    });
    if (r.error) { oG.textContent = r.error; oI.textContent = "-"; oD.textContent = "-"; return; }
    oG.textContent = r.solve_for === "kbtu" ? (fmt(r.kbtu_input, 1) + " kBTU/hr") : r.solve_for === "dt" ? (fmt(r.delta_T_F, 1) + " F rise") : (fmt(r.gpm, 2) + " gpm");
    oI.textContent = fmt(r.inlet_F, 0) + " F";
    oD.textContent = fmt(r.delta_T_F, 0) + " F";
  }, DEBOUNCE_MS);
  for (const el of [solve.select, kbtu.input, tgpm.input, zone.select, ovr.input, out.input]) el.addEventListener("input", update);
}

// renderGasLeakRate -> relocated to calc-gas.js (spec-v42 split)

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

// dims: in { area_ft2: L^2, surface: dimensionless, rainfall_in_per_hr: L T^-1 } out: { peak_flow_cfs: L^3 T^-1, peak_flow_gpm: L^3 T^-1 }
export function computeStormwaterRational({ area_ft2 = 0, surface = "asphalt", rainfall_in_per_hr = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// stormwater-max-drainage-area: inverse of stormwater-rational. The forward tile
// gives the peak runoff from a catchment area; sizing the tributary area to an
// allowable outlet/inlet capacity is the inverse. From Q = C x i x A_acres,
// A_acres = Q / (C x i), then A_ft2 = A_acres x 43560.
// dims: in { allowable_flow_cfs: L^3 T^-1, surface: dimensionless, rainfall_in_per_hr: L T^-1 } out: { max_area_ft2: L^2, max_area_acres: L^2, runoff_coefficient: dimensionless }
export function computeStormwaterMaxDrainageArea({ allowable_flow_cfs = 0, surface = "asphalt", rainfall_in_per_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q = Number(allowable_flow_cfs) || 0;
  const i = Number(rainfall_in_per_hr) || 0;
  if (!(Q > 0)) return { error: "Allowable flow must be positive (cfs)." };
  if (!(i > 0)) return { error: "Rainfall intensity must be positive (in/hr)." };
  const C = RUNOFF_COEFFICIENTS[surface];
  if (!Number.isFinite(C)) return { error: "Unknown surface type." };
  const max_area_acres = Q / (C * i);
  const max_area_ft2 = max_area_acres * 43560;
  return {
    max_area_ft2, max_area_acres, runoff_coefficient: C,
    note: "The Rational method Q = C x i x A solved for the area: the largest tributary catchment of this surface that an inlet, pipe, or outlet rated for the allowable flow can accept at the design rainfall intensity. A rougher (lower C) surface or a lower rainfall intensity lets a larger area drain to the same outlet. The Rational method suits small (< about 200-acre) uniform catchments; the runoff coefficient and the design storm (intensity-duration-frequency at the time of concentration) are set by the local drainage code. A design aid; the AHJ and the civil engineer of record govern.",
  };
}
export const stormwaterMaxDrainageAreaExample = {
  inputs: { allowable_flow_cfs: 2, surface: "asphalt", rainfall_in_per_hr: 2 },
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

// dims: in { pipe_diameter_in: L, target_flow_gpm: L^3 T^-1, material: dimensionless } out: { slope_in_per_ft: dimensionless, slope_percent: dimensionless }
export function computeManningSlope({ pipe_diameter_in = 0, target_flow_gpm = 0, material = "pvc" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { working_pressure_psi: M L^-1 T^-2, system_volume_gal: L^3, material: dimensionless, multiplier: dimensionless } out: { test_pressure_psi: M L^-1 T^-2, hold_minutes: T }
export function computeHydrostaticTest({ working_pressure_psi = 0, system_volume_gal = 0, material = "water", multiplier = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { peak_flow_gpm: L^3 T^-1, retention_minutes: T, loading_factor: dimensionless } out: { trap_size_gal: L^3 }
export function computeGreaseTrap({ peak_flow_gpm = 0, retention_minutes = 30, loading_factor = 1.25 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// grease-interceptor-flow-capacity: inverse of grease-trap. The forward tile sizes
// the interceptor volume from a peak flow; given an in-place interceptor, the peak
// flow it is rated to serve is the inverse: volume = peak_flow * retention * loading,
// so peak_flow = volume / (retention * loading).
// dims: in { interceptor_volume_gal: L^3, retention_minutes: T, loading_factor: dimensionless } out: { peak_flow_gpm: L^3 T^-1 }
export function computeGreaseInterceptorFlowCapacity({ interceptor_volume_gal = 0, retention_minutes = 30, loading_factor = 1.25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(interceptor_volume_gal) || 0;
  const ret = Number(retention_minutes) || 0;
  const lf = Number(loading_factor) || 0;
  if (!(vol > 0)) return { error: "Interceptor volume must be positive (gal)." };
  if (!(ret > 0)) return { error: "Retention time must be positive (min)." };
  if (!(lf > 0)) return { error: "Loading factor must be positive." };
  const peak_flow_gpm = vol / (ret * lf);
  return {
    peak_flow_gpm,
    note: "The peak fixture flow an existing grease interceptor is rated to serve: the volume = peak flow x retention x loading relation solved for the flow, peak_flow = volume / (retention x loading). Compare it to the drainage-fixture-unit peak flow of the connected sinks and dishwasher (per IPC / PDI G101): if the fixtures can deliver more than this, the interceptor is undersized. The retention (commonly 30 min) and the loading factor come from the code and the AHJ. A sizing aid; the AHJ and the plumbing code govern.",
  };
}
export const greaseInterceptorFlowCapacityExample = {
  inputs: { interceptor_volume_gal: 1000, retention_minutes: 30, loading_factor: 1.25 },
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

// dims: in { system_volume_gal: L^3, target_burst_F: T, glycol_type: dimensionless, protection_mode: dimensionless } out: { glycol_gal: L^3, water_gal: L^3, percent: dimensionless, heat_transfer_penalty_pct: dimensionless }
export function computeGlycolMix({ system_volume_gal = 0, target_burst_F = 32, glycol_type = "propylene", protection_mode = "freeze" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  // v23 EN.6: burst-vs-freeze toggle. Burst protection (the system may freeze
  // solid but the lines won't rupture) is allowed at a lower concentration -
  // roughly 70% of the freeze-protection dilution for the same temperature
  // (manufacturer curve governs). The freeze default is unchanged.
  const freeze_percent = percent;
  if (protection_mode === "burst") percent = freeze_percent * 0.7;
  const concentrate_gal = system_volume_gal * (percent / 100);
  // Heat-transfer penalty: the mix's specific heat is below water's, roughly
  // ~0.6% per percent glycol (propylene runs higher than ethylene). Reported
  // as an approximate fractional reduction in heat-carrying capacity.
  const heat_transfer_penalty_pct = percent * (glycol_type === "propylene" ? 0.6 : 0.5);
  return {
    glycol_percent: percent,
    freeze_percent,
    protection_mode: protection_mode === "burst" ? "burst" : "freeze",
    concentrate_gal,
    heat_transfer_penalty_pct,
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

// dims: in { system_volume_gal: L^3, fill_temperature_F: T, max_temperature_F: T, fill_pressure_psi: M L^-1 T^-2, relief_pressure_psi: M L^-1 T^-2 } out: { tank_gal: L^3 }
export function computeExpansionTank({ system_volume_gal = 0, fill_temperature_F = 60, max_temperature_F = 200, fill_pressure_psi = 12, relief_pressure_psi = 30 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { device_class: dimensionless, flow_gpm: L^3 T^-1, pipe_size_in: L } out: { loss_psi: M L^-1 T^-2 }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

function renderStormwaterMaxDrainageArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Rational method Q = C * i * A solved for the area, A_acres = Q / (C * i) (cfs / in-per-hr / acres). Public engineering practice; runoff coefficients bundled per surface from public engineering tables. A design aid; the AHJ and the civil engineer govern.";
  attachExampleButton(inputRegion, () => fillExample(stormwaterMaxDrainageAreaExample.inputs));
  const q = makeNumber("Allowable outlet/inlet flow (cfs)", "swm-q", { step: "any", min: "0" });
  const s = makeSelect("Surface", "swm-s", Object.keys(RUNOFF_COEFFICIENTS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const r = makeNumber("Rainfall intensity (in/hr)", "swm-r", { step: "any", min: "0" });
  for (const f of [q, s, r]) inputRegion.appendChild(f.wrap);
  const oC = makeOutputLine(outputRegion, "Runoff coefficient", "swm-out-c");
  const oFt2 = makeOutputLine(outputRegion, "Max tributary area", "swm-out-ft2");
  const oN = makeOutputLine(outputRegion, "Note", "swm-out-n");
  function fillExample(v) { q.input.value = v.allowable_flow_cfs; s.select.value = v.surface; r.input.value = v.rainfall_in_per_hr; update(); }
  const update = debounce(() => {
    const x = computeStormwaterMaxDrainageArea({ allowable_flow_cfs: Number(q.input.value) || 0, surface: s.select.value, rainfall_in_per_hr: Number(r.input.value) || 0 });
    if (x.error) { oC.textContent = x.error; oFt2.textContent = "-"; oN.textContent = "-"; return; }
    oC.textContent = fmt(x.runoff_coefficient, 2);
    oFt2.textContent = fmt(x.max_area_ft2, 0) + " ft^2 (" + fmt(x.max_area_acres, 3) + " acres)";
    oN.textContent = x.note;
  }, DEBOUNCE_MS);
  for (const el of [q.input, s.select, r.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { d_in: L, slope: dimensionless, material: dimensionless } out: { v_fps: L T^-1, q_cfs: L^3 T^-1, q_gpm: L^3 T^-1 }
export function computeManningPipeCapacity({ d_in = 0, slope = 0, material = "pvc" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Pipe diameter must be positive (in)." };
  if (!(slope > 0)) return { error: "Pipe slope must be positive (ft/ft)." };
  const n = MANNING_ROUGHNESS[material];
  if (!Number.isFinite(n)) return { error: "Unknown pipe material." };
  const D_ft = d_in / 12;
  const r_ft = D_ft / 4;
  const a_ft2 = Math.PI * D_ft * D_ft / 4;
  const v_fps = (1.486 / n) * Math.pow(r_ft, 2 / 3) * Math.sqrt(slope);
  const q_cfs = v_fps * a_ft2;
  const q_gpm = q_cfs * 448.831;
  return {
    n, a_ft2, r_ft, v_fps, q_cfs, q_gpm,
    note: "Manning full-bore gravity-flow capacity: V = (1.486/n) R^(2/3) sqrt(S) with the hydraulic radius R = D/4 for a circular pipe flowing full and Q = V (pi/4) D^2 - the discharge side of the same Manning equation the manning-slope tile inverts. The roughness n is taken from the standard tables (PVC 0.009, cast iron / concrete 0.013, corrugated metal 0.024). Because Q scales with sqrt(S), doubling the slope raises the capacity only about 1.41x. A steady, uniform (normal-depth) full flow in a circular pipe; it does not compute the partial-flow depth, and a circular pipe actually carries a few percent more than full-bore at about 0.94 depth (the partial-flow curves are separate). A design aid; the engineer of record and the local plumbing/sewer code govern.",
  };
}
export const manningPipeCapacityExample = { inputs: { d_in: 8, slope: 0.01, material: "concrete" } };

function renderManningPipeCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning full-bore capacity V = (1.486/n) R^(2/3) S^(1/2), R = D/4, Q = V (pi/4) D^2, by name. Circular pipe flowing full; the roughness n is from the standard tables. The partial-flow depth is separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => fillExample(manningPipeCapacityExample.inputs));
  const d = makeNumber("Pipe diameter (in)", "mpc-d", { step: "any", min: "0" });
  const s = makeNumber("Pipe slope S (ft/ft)", "mpc-s", { step: "any", min: "0" });
  const m = makeSelect("Pipe material", "mpc-m", Object.keys(MANNING_ROUGHNESS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const x of [d, s, m]) inputRegion.appendChild(x.wrap);
  const oQ = makeOutputLine(outputRegion, "Full-flow capacity", "mpc-out-q");
  const oV = makeOutputLine(outputRegion, "Full-flow velocity", "mpc-out-v");
  const oNote = makeOutputLine(outputRegion, "Note", "mpc-out-n");
  function fillExample(v) { d.input.value = v.d_in; s.input.value = v.slope; m.select.value = v.material; update(); }
  const update = debounce(() => {
    const r = computeManningPipeCapacity({ d_in: Number(d.input.value) || 0, slope: Number(s.input.value) || 0, material: m.select.value });
    if (r.error) { oQ.textContent = r.error; oV.textContent = "-"; oNote.textContent = "-"; return; }
    oQ.textContent = fmt(r.q_cfs, 2) + " cfs (" + fmt(r.q_gpm, 0) + " gpm)";
    oV.textContent = fmt(r.v_fps, 2) + " ft/s";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [d.input, s.input, m.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGreaseTrap(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IPC 2021 Table 1003.2 and PDI G101 by name. Volume = peak_flow * retention * loading_factor. AHJ governs. Free at codes.iccsafe.org.";
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

function renderGreaseInterceptorFlowCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IPC 2021 Table 1003.2 and PDI G101 by name, the sizing relation volume = peak_flow x retention x loading solved for the flow: peak_flow = volume / (retention x loading). Compare to the connected fixtures' DFU peak flow. AHJ governs. Free at codes.iccsafe.org.";
  attachExampleButton(inputRegion, () => fillExample(greaseInterceptorFlowCapacityExample.inputs));
  const vol = makeNumber("Interceptor volume (gal)", "gifc-v", { step: "any", min: "0" });
  const rt = makeNumber("Retention time (min)", "gifc-rt", { step: "any", min: "0", value: "30" });
  rt.input.value = "30";
  const lf = makeNumber("Loading factor", "gifc-lf", { step: "any", min: "0", value: "1.25" });
  lf.input.value = "1.25";
  for (const f of [vol, rt, lf]) inputRegion.appendChild(f.wrap);
  const oF = makeOutputLine(outputRegion, "Peak flow served", "gifc-out-f");
  const oN = makeOutputLine(outputRegion, "Note", "gifc-out-n");
  function fillExample(v) { vol.input.value = v.interceptor_volume_gal; rt.input.value = v.retention_minutes; lf.input.value = v.loading_factor; update(); }
  const update = debounce(() => {
    const r = computeGreaseInterceptorFlowCapacity({ interceptor_volume_gal: Number(vol.input.value) || 0, retention_minutes: Number(rt.input.value) || 30, loading_factor: Number(lf.input.value) || 1.25 });
    if (r.error) { oF.textContent = r.error; oN.textContent = "-"; return; }
    oF.textContent = fmt(r.peak_flow_gpm, 1) + " gpm";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [vol.input, rt.input, lf.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGlycolMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer freeze-point curves (Dow Dowfrost / Dowtherm). Attribution included with output.";
  attachExampleButton(inputRegion, () => fillExample(glycolMixExample.inputs));
  const sv = makeNumber("System volume (gal)", "gm-sv", { step: "any", min: "0" });
  const tb = makeNumber("Target protection (F)", "gm-tb", { step: "any" });
  const gt = makeSelect("Glycol type", "gm-gt", [{ value: "propylene", label: "Propylene (food/HVAC)" }, { value: "ethylene", label: "Ethylene (industrial)" }]);
  // v23 EN.6: burst-vs-freeze protection toggle.
  const pm = makeSelect("Protection mode", "gm-pm", [{ value: "freeze", label: "Freeze (full flow protection)" }, { value: "burst", label: "Burst (line-rupture only, less glycol)" }]);
  for (const f of [sv, tb, gt, pm]) inputRegion.appendChild(f.wrap);
  const oP = makeOutputLine(outputRegion, "Glycol percent", "gm-out-p");
  const oC = makeOutputLine(outputRegion, "Concentrate to add", "gm-out-c");
  const oH = makeOutputLine(outputRegion, "Heat-transfer penalty (approx)", "gm-out-h");
  const oA = makeOutputLine(outputRegion, "Source", "gm-out-a");
  function fillExample(v) { sv.input.value = v.system_volume_gal; tb.input.value = v.target_burst_F; gt.select.value = v.glycol_type; update(); }
  const update = debounce(() => {
    const r = computeGlycolMix({ system_volume_gal: Number(sv.input.value) || 0, target_burst_F: Number(tb.input.value), glycol_type: gt.select.value, protection_mode: pm.select.value });
    if (r.error) { oP.textContent = r.error; oC.textContent = "-"; oH.textContent = "-"; oA.textContent = "-"; return; }
    oP.textContent = fmt(r.glycol_percent, 1) + " % (" + r.protection_mode + ")";
    oC.textContent = fmt(r.concentrate_gal, 1) + " gal";
    oH.textContent = "~" + fmt(r.heat_transfer_penalty_pct, 1) + "% lower heat-carrying capacity vs water";
    oA.textContent = r.attribution;
  }, DEBOUNCE_MS);
  for (const el of [sv.input, tb.input, gt.select, pm.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { args: dimensionless } out: { surge_pressure_psi: M L^-1 T^-2, wave_velocity_fps: L T^-1 }
export function computeWaterHammerSurge({
  material = "copper",
  pipe_size = "1",
  velocity_fps = 0,
  closure_time_s = 0,
  run_length_ft = 100,
  fluid = "water",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { args: dimensionless } out: { flow_gpm: L^3 T^-1, head_ft: L, efficiency: dimensionless }
export function computePumpOperatingPoint({
  pump = "small_centrifugal_60Hz",
  static_head_ft = 0,
  k_friction = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// --- 240: Septic Drainfield Trench Length -> relocated to calc-septic.js (spec-v86 split) ---

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

// dims: in { args: dimensionless } out: { leg_length_in: L, loop_length_in: L }
export function computePipeExpansionLoop({
  material = "copper",
  length_ft = 0,
  delta_T_F = 0,
  pipe_OD_in = 1.315,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// _v7p_renderSepticDrainfield -> relocated to calc-septic.js (spec-v86 split)

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
  "slope": renderSlope,
  "pressure-conversion": renderPressureConversion,
  "backflow": renderBackflow,
  // v2
  "water-hammer-arrestor": renderWaterHammerArrestor,
  "recirc-pump-head": renderRecircPumpHead,
  "trap-arm": renderTrapArm,
  "pipe-expansion": renderPipeExpansion,
  "tankless-gpm": renderTanklessGPM,
  // v3
  "stormwater-rational": renderStormwaterRational,
  "manning-slope": renderManningSlope,
  "manning-pipe-capacity": renderManningPipeCapacity,
  "hydrostatic-test": renderHydrostaticTest,
  "grease-trap": renderGreaseTrap,
  "grease-interceptor-flow-capacity": renderGreaseInterceptorFlowCapacity,
  "stormwater-max-drainage-area": renderStormwaterMaxDrainageArea,
  "glycol-mix": renderGlycolMix,
  "expansion-tank": renderExpansionTank,
  "backflow-loss": renderBackflowLoss,
  // v7
  "water-hammer-surge": _v7p_renderWaterHammer,
  "pump-operating-point": _v7p_renderPumpOperatingPoint,
  "pipe-expansion-loop": _v7p_renderPipeExpansionLoop,
};

// v9 §B.4 hot-water recirculation loop sizing.
// Inputs the loop geometry / hot supply / ambient / set-point delta and
// returns the heat-loss rate, required recirc GPM, friction head, and
// recommended pump size. Per ASPE Data Book Vol. 4 Chapter 6 method.
// The companion v2 recirc-pump-head tile takes a target flow and
// returns head; this tile derives that target flow from the loop
// heat-loss budget.
//
// Coefficient table: U_BTU_HR_FT_DEG_F[nominalSize][insulationThick]
// (Btu / hr / ft / °F-delta). Values are operator-grade defaults that
// match ASPE Data Book Vol 4 Ch 6 simplified per-foot losses for
// copper pipe at typical residential conditions; AHJ governs.
export const RECIRC_LOSS_U = {
  // nominal copper size (in) -> insulation thickness (in) -> U.
  "0.5":  { "0": 0.65, "0.5": 0.22, "1": 0.13, "1.5": 0.10 },
  "0.75": { "0": 0.80, "0.5": 0.26, "1": 0.17, "1.5": 0.13 },
  "1":    { "0": 1.00, "0.5": 0.31, "1": 0.21, "1.5": 0.16 },
  "1.25": { "0": 1.20, "0.5": 0.36, "1": 0.24, "1.5": 0.18 },
  "1.5":  { "0": 1.40, "0.5": 0.41, "1": 0.27, "1.5": 0.20 },
};

// Internal diameter (in) by nominal copper size (Type L approximation).
export const COPPER_TYPE_L_ID_IN = {
  "0.5": 0.545, "0.75": 0.785, "1": 1.025, "1.25": 1.265, "1.5": 1.505,
};

// Recommended pump-size ladder (1/40, 1/25, 1/20, 1/12, 1/6, 1/4 HP).
export const RECIRC_PUMP_LADDER_HP = [1/40, 1/25, 1/20, 1/12, 1/6, 1/4];

function _interpInsulationU(row, t) {
  const keys = Object.keys(row).map((k) => Number(k)).sort((a, b) => a - b);
  if (t <= keys[0]) return row[String(keys[0])];
  if (t >= keys[keys.length - 1]) return row[String(keys[keys.length - 1])];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i] && t <= keys[i + 1]) {
      const u0 = row[String(keys[i])], u1 = row[String(keys[i + 1])];
      return u0 + ((t - keys[i]) / (keys[i + 1] - keys[i])) * (u1 - u0);
    }
  }
  return row[String(keys[0])];
}

// dims: in { args: dimensionless } out: { pipe_size_in: L, flow_gpm: L^3 T^-1, head_ft: L }
export function computeRecircLoopSizing({
  loop_length_ft = 0,
  nominal_size_in = "0.75",
  insulation_in = 1,
  hot_supply_F = 120,
  ambient_F = 65,
  set_point_delta_F = 10,
  // spec-v16 B.3 extension: annual heat-loss energy cost. Optional;
  // the cost figure only renders when a fuel price is supplied.
  fuel = "gas",
  heater_efficiency = 0.8,
  runtime_hr_per_year = 8760,
  fuel_price = null,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(loop_length_ft) || 0;
  const t_ins = Math.max(0, Number(insulation_in) || 0);
  const T_h = Number(hot_supply_F);
  const T_a = Number(ambient_F);
  const dT_set = (set_point_delta_F === undefined || set_point_delta_F === null || set_point_delta_F === "")
    ? 10 : Number(set_point_delta_F);
  if (L <= 0) return { error: "Loop length must be positive (ft)." };
  if (!Number.isFinite(T_h) || !Number.isFinite(T_a)) return { error: "Hot-supply and ambient temperatures must be numeric (F)." };
  if (T_h <= T_a) return { error: "Hot-supply temperature must exceed ambient." };
  if (dT_set <= 0) return { error: "Set-point delta must be positive (F)." };
  const row = RECIRC_LOSS_U[String(nominal_size_in)];
  if (!row) return { error: "Unknown nominal copper size '" + nominal_size_in + "'." };
  const id = COPPER_TYPE_L_ID_IN[String(nominal_size_in)];

  const warnings = [];
  if (L < 50) warnings.push("Loop length below 50 ft may not need recirculation; consider a point-of-use water heater instead.");
  if (t_ins === 0) warnings.push("Insulation thickness 0 is non-compliant for most jurisdictions adopting ASHRAE 90.1-2022 §7.4.4.");

  const dT_pipe = T_h - T_a;
  const U = _interpInsulationU(row, t_ins);
  const q_per_ft = U * dT_pipe;
  const Q_total_btu_hr = q_per_ft * L;
  const gpm_required = Q_total_btu_hr / (500 * dT_set);

  // Friction head via Hazen-Williams with C = 140 for copper.
  const head_ft = hazenWilliamsFrictionLoss({
    flow_gpm: gpm_required, internal_diameter_in: id, length_ft: L, C: HAZEN_C.copper,
  });
  const pressure_psi = feetOfHeadToPsi(head_ft);

  // Pump-size recommendation: hydraulic HP plus a typical 25 percent
  // efficiency factor (small wet-rotor circulators run 20-30 percent
  // wire-to-water), then round up to the next-standard size on the
  // ladder.
  const hyd_hp = (gpm_required * head_ft) / 3960; // ideal hydraulic HP
  const hp_required = hyd_hp / 0.25;
  let recommended_hp = RECIRC_PUMP_LADDER_HP[RECIRC_PUMP_LADDER_HP.length - 1];
  for (const h of RECIRC_PUMP_LADDER_HP) { if (h >= hp_required) { recommended_hp = h; break; } }

  // spec-v16 B.3: annual energy cost of the standing heat loss. The loop
  // loses Q_total continuously over the runtime; the heater replaces it
  // at its efficiency. Gas is billed per therm (100,000 BTU); electric
  // per kWh (3,412 BTU). The fuel price is optional, so the cost is null
  // until the user supplies one.
  const eff = Number.isFinite(Number(heater_efficiency)) && Number(heater_efficiency) > 0 ? Number(heater_efficiency) : 0.8;
  const runtime = Number.isFinite(Number(runtime_hr_per_year)) && Number(runtime_hr_per_year) > 0 ? Number(runtime_hr_per_year) : 8760;
  const annual_loss_btu = Q_total_btu_hr * runtime;
  const isElectric = fuel === "electric";
  const btu_per_unit = isElectric ? 3412 : 100000;
  const energy_unit = isElectric ? "kWh" : "therms";
  const annual_energy_units = annual_loss_btu / btu_per_unit / eff;
  const price = fuel_price != null && fuel_price !== "" && Number.isFinite(Number(fuel_price)) && Number(fuel_price) >= 0 ? Number(fuel_price) : null;
  const annual_cost = price != null ? annual_energy_units * price : null;

  return {
    q_per_ft_btu_hr: q_per_ft,
    Q_total_btu_hr,
    gpm_required,
    head_ft,
    pressure_psi,
    recommended_hp,
    U_coefficient: U,
    fuel,
    heater_efficiency: eff,
    runtime_hr_per_year: runtime,
    annual_loss_btu,
    annual_energy_units,
    energy_unit,
    annual_cost,
    warnings,
  };
}

export const recircLoopSizingExample = {
  // Spec-v9 §B.4 worked example: 200 ft, 3/4" copper, 1" insulation,
  // 120 F hot supply, 65 F ambient, 10 F set-point delta.
  // q_per_ft = 0.17 * 55 = 9.35 Btu/hr/ft -> Q_total = 1870 Btu/hr ->
  // GPM = 1870 / 5000 = 0.374. Friction head via Hazen-Williams.
  inputs: { loop_length_ft: 200, nominal_size_in: "0.75", insulation_in: 1, hot_supply_F: 120, ambient_F: 65, set_point_delta_F: 10 },
};

function _v9p_renderRecircLoopSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per ASPE Data Book Vol. 4 (Plumbing Engineering Design Handbook) Chapter 6 simplified per-foot heat-loss method. Friction head via Hazen-Williams (C=140 for copper). Annual cost = standing heat loss x runtime / heater efficiency / (100,000 BTU/therm gas or 3,412 BTU/kWh electric) x fuel price. ASHRAE 90.1-2022 §7.4.4 governs recirculation control requirements where adopted. AHJ governs. Free at aspe.org for TOC.";

  const len = makeNumber("Loop length (ft)", "rls-len", { step: "any", min: "0" });
  const sz = makeSelect("Nominal copper size (in)", "rls-sz",
    Object.keys(RECIRC_LOSS_U).map((k) => ({ value: k, label: k }))
  );
  const ins = makeNumber("Insulation thickness (in; 0 / 0.5 / 1 / 1.5)", "rls-ins", { step: "any", min: "0", value: "1" });
  ins.input.value = "1";
  const hot = makeNumber("Hot supply temperature (F)", "rls-hot", { step: "any", value: "120" });
  hot.input.value = "120";
  const amb = makeNumber("Ambient temperature surrounding pipe (F)", "rls-amb", { step: "any", value: "65" });
  amb.input.value = "65";
  const dt = makeNumber("Set-point delta (F)", "rls-dt", { step: "any", min: "0", value: "10" });
  dt.input.value = "10";
  const fuel = makeSelect("Heating fuel (for annual cost)", "rls-fuel", [
    { value: "gas", label: "Natural gas ($/therm)", selected: true },
    { value: "electric", label: "Electric ($/kWh)" },
  ]);
  const eff = makeNumber("Heater efficiency (0-1)", "rls-eff", { step: "any", min: "0", max: "1", value: "0.8" });
  eff.input.value = "0.8";
  const runtime = makeNumber("Runtime (hr/yr; 8760 = continuous)", "rls-rt", { step: "any", min: "0", value: "8760" });
  runtime.input.value = "8760";
  const price = makeNumber("Fuel price (optional, $/therm or $/kWh)", "rls-price", { step: "any", min: "0" });
  for (const f of [len, sz, ins, hot, amb, dt, fuel, eff, runtime, price]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    len.input.value = "200"; sz.select.value = "0.75"; ins.input.value = "1";
    hot.input.value = "120"; amb.input.value = "65"; dt.input.value = "10";
    fuel.select.value = "gas"; eff.input.value = "0.8"; runtime.input.value = "8760"; price.input.value = "1.50"; update();
  });

  const oQft = makeOutputLine(outputRegion, "Heat-loss rate per ft (Btu/hr/ft)", "rls-out-qft");
  const oQt = makeOutputLine(outputRegion, "Total loop heat loss (Btu/hr)", "rls-out-qt");
  const oGPM = makeOutputLine(outputRegion, "Required recirc flow (GPM)", "rls-out-gpm");
  const oH = makeOutputLine(outputRegion, "Friction head (ft of water)", "rls-out-h");
  const oP = makeOutputLine(outputRegion, "Pump pressure (psi)", "rls-out-p");
  const oHP = makeOutputLine(outputRegion, "Recommended pump size (HP, next standard)", "rls-out-hp");
  const oCost = makeOutputLine(outputRegion, "Annual standing-loss energy / cost", "rls-out-cost");
  const oW = makeOutputLine(outputRegion, "Notes", "rls-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeRecircLoopSizing({
      loop_length_ft: readNum(len.input),
      nominal_size_in: sz.select.value,
      insulation_in: readNum(ins.input),
      hot_supply_F: readNum(hot.input),
      ambient_F: readNum(amb.input),
      set_point_delta_F: readNum(dt.input),
      fuel: fuel.select.value,
      heater_efficiency: readNum(eff.input),
      runtime_hr_per_year: readNum(runtime.input),
      fuel_price: readNum(price.input),
    });
    if (r.error) {
      oQft.textContent = r.error;
      oQt.textContent = ""; oGPM.textContent = ""; oH.textContent = ""; oP.textContent = ""; oHP.textContent = ""; oCost.textContent = ""; oW.textContent = "";
      return;
    }
    oQft.textContent = fmt(r.q_per_ft_btu_hr, 2) + " Btu/hr/ft";
    oQt.textContent = fmt(r.Q_total_btu_hr, 0) + " Btu/hr";
    oGPM.textContent = fmt(r.gpm_required, 3) + " GPM";
    oH.textContent = fmt(r.head_ft, 2) + " ft";
    oP.textContent = fmt(r.pressure_psi, 2) + " psi";
    oHP.textContent = "1 / " + fmt(1 / r.recommended_hp, 0) + " HP";
    oCost.textContent = fmt(r.annual_energy_units, 0) + " " + r.energy_unit + "/yr"
      + (r.annual_cost != null ? " = $" + fmt(r.annual_cost, 0) + "/yr" : " (enter a fuel price for the cost)");
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [len.input, sz.select, ins.input, hot.input, amb.input, dt.input, eff.input, runtime.input, price.input]) el.addEventListener("input", update);
  for (const s of [sz.select, fuel.select]) s.addEventListener("change", update);
}

PLUMBING_RENDERERS["recirc-loop-sizing"] = _v9p_renderRecircLoopSizing;

// =====================================================================
// spec-v16 Group B expansion (Plumbing and Gas). Four new tiles land in
// this module per spec-v16 §2 / §Z.2: B.1 water-heater recovery rate,
// B.2 potable thermal-expansion-tank sizing, B.5 sanitary-drain DFU
// sizing, and B.6 trap-primer sizing. Render functions are module-local
// (registered into PLUMBING_RENDERERS by id) so only the pure compute
// functions enter the v14 formula corpus. Helpers shared from ui-fields.
// =====================================================================

const _v16p_readNum = (input) => {
  if (!input || input.value === "") return null;
  const n = Number(input.value);
  return Number.isFinite(n) ? n : null;
};

// --- B.1 Water heater recovery rate (gph at delta-T) -----------------

// Recovery-efficiency defaults by heater type (DOE 10 CFR 430 / AHRI
// 1300 test-procedure conventions; user overrides per the nameplate).
export const WATER_HEATER_EFFICIENCY = {
  electric: 0.98,
  gas_atmospheric: 0.80,
  gas_condensing: 0.94,
};

// dims: in { args: dimensionless } out: { recovery_gph: L^3 T^-1, first_hour_gph: L^3 T^-1, q_useful_btu_hr: dimensionless }
export function computeWaterHeaterRecovery({
  heater_type = "gas_atmospheric",
  input_btu_hr = 0,
  input_kw = 0,
  efficiency = null,
  incoming_F = 50,
  setpoint_F = 120,
  tank_gal = 40,
  peak_demand_gph = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const isElectric = heater_type === "electric";
  const eff = efficiency != null && Number.isFinite(Number(efficiency))
    ? Number(efficiency)
    : (WATER_HEATER_EFFICIENCY[heater_type] ?? 0.80);
  const Ti = Number(incoming_F);
  const Ts = Number(setpoint_F);
  const tank = Number(tank_gal) || 0;
  // Input firing rate -> BTU/hr. Electric: kW * 3412 BTU/hr per kW.
  const inputBtu = isElectric
    ? (Number(input_kw) || 0) * 3412
    : (Number(input_btu_hr) || 0);
  if (!(inputBtu > 0)) return { error: "Enter a positive input rating (BTU/hr for gas, kW for electric)." };
  if (!Number.isFinite(Ti) || !Number.isFinite(Ts)) return { error: "Enter incoming and set-point temperatures." };
  const delta_T_F = Ts - Ti;
  if (!(delta_T_F > 0)) return { error: "Set-point temperature must exceed incoming temperature." };

  const q_useful_btu_hr = inputBtu * eff;
  // 8.33 BTU per gallon per degree F (water properties).
  const recovery_gph = q_useful_btu_hr / (8.33 * delta_T_F);
  // DOE first-hour-rating convention: recovery + ~70% of stored volume.
  const first_hour_gph = recovery_gph + 0.70 * tank;

  const warnings = [];
  if (delta_T_F < 20 || delta_T_F > 130) warnings.push("Temperature rise outside the 20-130 F residential range; confirm incoming and set-point values.");
  if (eff < 0.50 || eff > 1.05) warnings.push("Recovery efficiency outside (0.50, 1.05) is non-physical for a single heater; confirm the test-procedure value.");
  if (Ts > 140) warnings.push("Set point above 140 F is a scald hazard; a mixing valve at fixtures is recommended (IPC 424).");

  // v23 EN.5: peak-demand sizing cross-check. meets = first-hour rating >=
  // entered peak demand (fixtures x draw). Default (no demand) omits it.
  const peak = Number(peak_demand_gph) || 0;
  let meets_peak = null;
  if (peak > 0 && Number.isFinite(peak)) meets_peak = first_hour_gph >= peak;

  return {
    heater_type,
    delta_T_F,
    efficiency: eff,
    input_btu_hr: inputBtu,
    q_useful_btu_hr,
    recovery_gph,
    first_hour_gph,
    tank_gal: tank,
    peak_demand_gph: peak,
    meets_peak,
    warnings,
  };
}

export const waterHeaterRecoveryExample = {
  // 40,000 BTU/hr atmospheric gas, 0.80 efficiency, 50 F in -> 120 F set,
  // 40 gal tank: 70 F rise, 32,000 BTU/hr useful, ~54.9 gph recovery,
  // ~82.9 gph first-hour rating.
  inputs: {
    heater_type: "gas_atmospheric",
    input_btu_hr: 40000,
    efficiency: 0.80,
    incoming_F: 50,
    setpoint_F: 120,
    tank_gal: 40,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16p_renderWaterHeaterRecovery(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gph = (input BTU/hr x efficiency) / (8.33 x delta-T). 8.33 BTU per gallon per degree F is first-principles water properties. Per DOE 10 CFR 430 and AHRI 1300. First-hour rating = recovery + 70% of stored volume (DOE FHR convention). Free at energy.gov/eere and ahri.org.";
  const type = makeSelect("Heater type", "whr-type", [
    { value: "gas_atmospheric", label: "Gas, atmospheric (0.80)", selected: true },
    { value: "gas_condensing", label: "Gas, condensing (0.94)" },
    { value: "electric", label: "Electric (0.98)" },
  ]);
  const btu = makeNumber("Gas input rating (BTU/hr)", "whr-btu", { step: "any", min: "0", value: "40000" });
  const kw = makeNumber("Electric element rating (kW)", "whr-kw", { step: "any", min: "0", value: "4.5" });
  const eff = makeNumber("Recovery efficiency (blank = default)", "whr-eff", { step: "any", min: "0", max: "1.05" });
  const tin = makeNumber("Incoming water temp (F)", "whr-tin", { step: "any", value: "50" });
  const tset = makeNumber("Set-point temp (F)", "whr-tset", { step: "any", value: "120" });
  const tank = makeNumber("Tank size (gal)", "whr-tank", { step: "any", min: "0", value: "40" });
  // v23 EN.5: peak-demand sizing cross-check (fixtures x draw, gph).
  const peak = makeNumber("Peak demand (gph, optional)", "whr-peak", { step: "any", min: "0" });
  for (const f of [type, btu, kw, eff, tin, tset, tank, peak]) inputRegion.appendChild(f.wrap);

  function syncRows() {
    const electric = type.select.value === "electric";
    btu.wrap.style.display = electric ? "none" : "";
    kw.wrap.style.display = electric ? "" : "none";
  }
  attachExampleButton(inputRegion, () => {
    type.select.value = "gas_atmospheric"; btu.input.value = "40000"; eff.input.value = "0.80";
    tin.input.value = "50"; tset.input.value = "120"; tank.input.value = "40"; syncRows(); update();
  });

  const oRise = makeOutputLine(outputRegion, "Temperature rise", "whr-out-rise");
  const oRec = makeOutputLine(outputRegion, "Recovery rate", "whr-out-rec");
  const oFhr = makeOutputLine(outputRegion, "First-hour rating", "whr-out-fhr");
  const oPeak = makeOutputLine(outputRegion, "Meets peak demand?", "whr-out-peak");
  const oNote = makeOutputLine(outputRegion, "Notes", "whr-out-note");

  const update = debounce(() => {
    const r = computeWaterHeaterRecovery({
      heater_type: type.select.value,
      input_btu_hr: _v16p_readNum(btu.input),
      input_kw: _v16p_readNum(kw.input),
      efficiency: _v16p_readNum(eff.input),
      incoming_F: _v16p_readNum(tin.input),
      setpoint_F: _v16p_readNum(tset.input),
      tank_gal: _v16p_readNum(tank.input),
      peak_demand_gph: _v16p_readNum(peak.input),
    });
    if (r.error) { oRise.textContent = r.error; oRec.textContent = "-"; oFhr.textContent = "-"; oPeak.textContent = "-"; oNote.textContent = ""; return; }
    oRise.textContent = fmt(r.delta_T_F, 0) + " F (" + fmt(r.q_useful_btu_hr, 0) + " BTU/hr useful)";
    oRec.textContent = fmt(r.recovery_gph, 1) + " gph";
    oFhr.textContent = fmt(r.first_hour_gph, 1) + " gph";
    oPeak.textContent = r.meets_peak === null ? "(enter peak demand)" : (r.meets_peak ? "Yes - first-hour rating >= peak demand" : "No - undersized for peak; go larger or add storage");
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Within typical residential range.";
  }, DEBOUNCE_MS);
  for (const el of [btu.input, kw.input, eff.input, tin.input, tset.input, tank.input, peak.input]) el.addEventListener("input", update);
  type.select.addEventListener("change", () => { syncRows(); update(); });
  syncRows();
}
PLUMBING_RENDERERS["water-heater-recovery"] = _v16p_renderWaterHeaterRecovery;

// dims: in { args: dimensionless } out: { input_btu_hr: dimensionless, input_kw: dimensionless, delta_T_F: T }
export function computeWaterHeaterInput({
  heater_type = "gas_atmospheric",
  target_recovery_gph = 0,
  efficiency = null,
  incoming_F = 50,
  setpoint_F = 120,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const isElectric = heater_type === "electric";
  const eff = efficiency != null && Number.isFinite(Number(efficiency))
    ? Number(efficiency)
    : (WATER_HEATER_EFFICIENCY[heater_type] ?? 0.80);
  const Ti = Number(incoming_F);
  const Ts = Number(setpoint_F);
  const rec = Number(target_recovery_gph) || 0;
  if (!(rec > 0)) return { error: "Target recovery rate must be positive (gph)." };
  if (!Number.isFinite(Ti) || !Number.isFinite(Ts)) return { error: "Enter incoming and set-point temperatures." };
  const delta_T_F = Ts - Ti;
  if (!(delta_T_F > 0)) return { error: "Set-point temperature must exceed incoming temperature." };
  if (!(eff > 0)) return { error: "Recovery efficiency must be positive." };
  // Inverse of recovery_gph = input_btu x eff / (8.33 x delta_T):
  // input_btu = recovery_gph x 8.33 x delta_T / eff. Electric: kW = input_btu / 3412.
  const input_btu_hr = rec * 8.33 * delta_T_F / eff;
  const input_kw = input_btu_hr / 3412;
  if (![input_btu_hr, input_kw].every(Number.isFinite) || !(input_btu_hr > 0)) return { error: "Water-heater-input math is not a finite positive value." };
  const warnings = [];
  if (delta_T_F < 20 || delta_T_F > 130) warnings.push("Temperature rise outside the 20-130 F residential range; confirm incoming and set-point values.");
  if (eff < 0.50 || eff > 1.05) warnings.push("Recovery efficiency outside (0.50, 1.05) is non-physical for a single heater; confirm the test-procedure value.");
  return {
    heater_type, isElectric, efficiency: eff, delta_T_F,
    target_recovery_gph: rec, input_btu_hr, input_kw, warnings,
    note: "The burner (or element) input a water heater needs to sustain a target recovery rate, the inverse of the water-heater-recovery tile: input = recovery_gph x 8.33 x rise / efficiency, with the useful heat 8.33 BTU per gallon per degree F. For an electric heater the kW output is the input divided by 3412 BTU/hr per kW. This is the steady recovery input; the AHRI first-hour rating also credits the stored tank volume, so a tank can meet a short peak with less input than this. Per DOE 10 CFR 430 / AHRI 1300. A sizing estimate; the appliance rating and the gas or electrical service govern."
  };
}
export const waterHeaterInputExample = { inputs: { heater_type: "gas_atmospheric", target_recovery_gph: 54.9, efficiency: 0.80, incoming_F: 50, setpoint_F: 120 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderWaterHeaterInput(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: input = (recovery_gph x 8.33 x delta-T) / efficiency, from gph = (input BTU/hr x efficiency) / (8.33 x delta-T); electric kW = input / 3412. 8.33 BTU per gallon per degree F is first-principles water properties. Per DOE 10 CFR 430 and AHRI 1300. Free at energy.gov/eere and ahri.org.";
  const type = makeSelect("Heater type", "whi-type", [
    { value: "gas_atmospheric", label: "Gas, atmospheric (0.80)", selected: true },
    { value: "gas_condensing", label: "Gas, condensing (0.94)" },
    { value: "electric", label: "Electric (0.98)" },
  ]);
  const rec = makeNumber("Target recovery rate (gph)", "whi-rec", { step: "any", min: "0", value: "54.9" });
  const eff = makeNumber("Recovery efficiency (blank = default)", "whi-eff", { step: "any", min: "0", max: "1.05" });
  const tin = makeNumber("Incoming water temp (F)", "whi-tin", { step: "any", value: "50" });
  const tset = makeNumber("Set-point temp (F)", "whi-tset", { step: "any", value: "120" });
  for (const f of [type, rec, eff, tin, tset]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "gas_atmospheric"; rec.input.value = "54.9"; eff.input.value = "0.80"; tin.input.value = "50"; tset.input.value = "120"; update(); });
  const oInput = makeOutputLine(outputRegion, "Required input rating", "whi-out-input");
  const oNote = makeOutputLine(outputRegion, "Note", "whi-out-n");
  const update = debounce(() => {
    const effVal = eff.input.value === "" ? null : _v16p_readNum(eff.input);
    const r = computeWaterHeaterInput({ heater_type: type.select.value, target_recovery_gph: _v16p_readNum(rec.input), efficiency: effVal, incoming_F: _v16p_readNum(tin.input), setpoint_F: _v16p_readNum(tset.input) });
    if (r.error) { oInput.textContent = r.error; oNote.textContent = ""; return; }
    oInput.textContent = r.isElectric ? (fmt(r.input_kw, 2) + " kW (" + fmt(r.input_btu_hr, 0) + " BTU/hr)") : (fmt(r.input_btu_hr, 0) + " BTU/hr (" + fmt(r.input_kw, 2) + " kW)");
    oNote.textContent = (r.warnings.length ? r.warnings.join(" ") + " " : "") + r.note;
  }, DEBOUNCE_MS);
  for (const el of [rec.input, eff.input, tin.input, tset.input]) el.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
PLUMBING_RENDERERS["water-heater-input"] = renderWaterHeaterInput;

// --- B.2 Potable thermal expansion tank sizing -----------------------

// Water density (lb/ft^3) vs temperature (F), public steam-table values
// (ASME B40.1 reference). Linear interpolation between points.
export const WATER_DENSITY_LB_FT3 = [
  { F: 40, rho: 62.42 }, { F: 50, rho: 62.41 }, { F: 60, rho: 62.37 },
  { F: 70, rho: 62.30 }, { F: 80, rho: 62.22 }, { F: 100, rho: 62.00 },
  { F: 120, rho: 61.71 }, { F: 140, rho: 61.38 }, { F: 160, rho: 61.00 },
  { F: 180, rho: 60.57 },
];

// Standard diaphragm potable-expansion-tank acceptance volumes (gal).
export const EXPANSION_TANK_SIZES_GAL = [2, 4.4, 8.5, 14, 20];

function _v16p_waterDensity(F) {
  const t = WATER_DENSITY_LB_FT3;
  if (F <= t[0].F) return t[0].rho;
  if (F >= t[t.length - 1].F) return t[t.length - 1].rho;
  for (let i = 1; i < t.length; i++) {
    if (F <= t[i].F) {
      const a = t[i - 1], b = t[i];
      return a.rho + ((F - a.F) / (b.F - a.F)) * (b.rho - a.rho);
    }
  }
  return t[t.length - 1].rho;
}

// dims: in { args: dimensionless } out: { v_expansion_gal: L^3, v_tank_gal: L^3, recommended_gal: L^3 }
export function computeWhExpansionTank({
  water_heater_vol_gal = 0,
  incoming_psi = 60,
  relief_psi = 150,
  incoming_F = 50,
  setpoint_F = 120,
  acceptance_factor = 0.46,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(water_heater_vol_gal) || 0;
  const Pi = Number(incoming_psi) || 0;
  const Pf = Number(relief_psi) || 0;
  const af = Number(acceptance_factor) || 0;
  const Ti = Number(incoming_F);
  const Ts = Number(setpoint_F);
  if (!(vol > 0)) return { error: "Enter a positive water-heater capacity (gal)." };
  if (!(af > 0 && af <= 1)) return { error: "Acceptance factor must be between 0 and 1 (manufacturer value)." };
  if (!Number.isFinite(Ti) || !Number.isFinite(Ts)) return { error: "Enter incoming and set-point temperatures." };
  const delta_T_F = Ts - Ti;
  if (!(delta_T_F > 0)) return { error: "Set-point temperature must exceed incoming temperature." };

  const rho_cold = _v16p_waterDensity(Ti);
  const rho_hot = _v16p_waterDensity(Ts);
  const expansion_factor = (rho_cold - rho_hot) / rho_hot;
  const v_expansion_gal = vol * expansion_factor;
  const v_tank_gal = v_expansion_gal / af;
  const recommended_gal = EXPANSION_TANK_SIZES_GAL.find((s) => s >= v_tank_gal) ?? EXPANSION_TANK_SIZES_GAL[EXPANSION_TANK_SIZES_GAL.length - 1];

  const warnings = [];
  if (Pi > 80) warnings.push("Incoming pressure above 80 psi requires a pressure-reducing valve (IPC 604.8); a PRV creates a closed system that mandates this tank.");
  if (delta_T_F > 100) warnings.push("Temperature rise above 100 F is outside the typical residential band; confirm the set point.");
  if (v_tank_gal > EXPANSION_TANK_SIZES_GAL[EXPANSION_TANK_SIZES_GAL.length - 1]) warnings.push("Required volume exceeds the largest standard residential tank; size a commercial tank or manifold two.");

  return {
    delta_T_F,
    rho_cold,
    rho_hot,
    expansion_factor,
    v_expansion_gal,
    v_tank_gal,
    recommended_gal,
    pre_charge_psi: Pi,
    relief_psi: Pf,
    warnings,
  };
}

export const whExpansionTankExample = {
  // 40 gal heater, 60 psi incoming, 50 F -> 120 F, acceptance 0.46:
  // rho 62.41 -> 61.71, factor 0.01134, V_exp 0.4538 gal, V_tank 0.987 gal
  // -> recommend the 2 gal standard tank, pre-charge 60 psi.
  inputs: {
    water_heater_vol_gal: 40,
    incoming_psi: 60,
    relief_psi: 150,
    incoming_F: 50,
    setpoint_F: 120,
    acceptance_factor: 0.46,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16p_renderWhExpansionTank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: expansion factor = (rho_cold - rho_hot) / rho_hot from public steam-table densities; V_expansion = heater volume x factor; V_tank = V_expansion / acceptance factor. Per the ASPE Plumbing Engineering Design Handbook (2nd ed.) Ch. 6 and ASME B40.1. Pre-charge equals incoming pressure. AHJ governs. Free at aspe.org.";
  const vol = makeNumber("Water heater capacity (gal)", "xt-vol", { step: "any", min: "0", value: "40" });
  const pin = makeNumber("Incoming pressure (psi)", "xt-pin", { step: "any", min: "0", value: "60" });
  const prel = makeNumber("Relief setting (psi)", "xt-prel", { step: "any", min: "0", value: "150" });
  const tin = makeNumber("Incoming water temp (F)", "xt-tin", { step: "any", value: "50" });
  const tset = makeNumber("Set-point temp (F)", "xt-tset", { step: "any", value: "120" });
  const af = makeNumber("Acceptance factor (manufacturer)", "xt-af", { step: "any", min: "0", max: "1", value: "0.46" });
  for (const f of [vol, pin, prel, tin, tset, af]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    vol.input.value = "40"; pin.input.value = "60"; prel.input.value = "150";
    tin.input.value = "50"; tset.input.value = "120"; af.input.value = "0.46"; update();
  });

  const oExp = makeOutputLine(outputRegion, "Expansion volume", "xt-out-exp");
  const oTank = makeOutputLine(outputRegion, "Required tank volume", "xt-out-tank");
  const oRec = makeOutputLine(outputRegion, "Recommended standard tank", "xt-out-rec");
  const oPre = makeOutputLine(outputRegion, "Pre-charge pressure", "xt-out-pre");
  const oNote = makeOutputLine(outputRegion, "Notes", "xt-out-note");

  const update = debounce(() => {
    const r = computeWhExpansionTank({
      water_heater_vol_gal: _v16p_readNum(vol.input),
      incoming_psi: _v16p_readNum(pin.input),
      relief_psi: _v16p_readNum(prel.input),
      incoming_F: _v16p_readNum(tin.input),
      setpoint_F: _v16p_readNum(tset.input),
      acceptance_factor: _v16p_readNum(af.input),
    });
    if (r.error) { oExp.textContent = r.error; oTank.textContent = "-"; oRec.textContent = "-"; oPre.textContent = "-"; oNote.textContent = ""; return; }
    oExp.textContent = fmt(r.v_expansion_gal, 3) + " gal (factor " + fmt(r.expansion_factor * 100, 2) + "%)";
    oTank.textContent = fmt(r.v_tank_gal, 3) + " gal";
    oRec.textContent = fmt(r.recommended_gal, 1) + " gal";
    oPre.textContent = fmt(r.pre_charge_psi, 0) + " psi (= incoming)";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Closed-system thermal expansion covered by the recommended tank.";
  }, DEBOUNCE_MS);
  for (const el of [vol.input, pin.input, prel.input, tin.input, tset.input, af.input]) el.addEventListener("input", update);
}
PLUMBING_RENDERERS["wh-expansion-tank"] = _v16p_renderWhExpansionTank;

// --- B.5 Sanitary stack / branch DFU sizing --------------------------

// Drainage fixture units (DFU) per fixture, IPC 2021 Table 709.1.
export const SANITARY_DFU_VALUES = {
  water_closet_private: 3,
  water_closet_public: 4,
  lavatory: 1,
  bathtub: 2,
  shower: 2,
  kitchen_sink: 2,
  dishwasher: 2,
  clothes_washer: 3,
  laundry_tub: 2,
  floor_drain: 2,
  urinal: 4,
  drinking_fountain: 0.5,
  bar_sink: 1,
  bidet: 1,
};

// IPC 2021 Table 710.1(2): horizontal fixture branch and stack max DFU.
export const SANITARY_BRANCH_STACK_MAX_DFU = [
  { size: 1.5, branch: 3, stack: 8, per_interval: 2 },
  { size: 2, branch: 6, stack: 24, per_interval: 6 },
  { size: 2.5, branch: 12, stack: 42, per_interval: 9 },
  { size: 3, branch: 20, stack: 72, per_interval: 20 },
  { size: 4, branch: 160, stack: 500, per_interval: 90 },
  { size: 5, branch: 360, stack: 1100, per_interval: 200 },
  { size: 6, branch: 620, stack: 1900, per_interval: 350 },
  { size: 8, branch: 1400, stack: 3600, per_interval: 600 },
];

// IPC 2021 Table 710.1(1): building drains and sewers max DFU by slope.
export const SANITARY_BUILDING_DRAIN_MAX_DFU = {
  "0.125": { 3: 36, 4: 180, 5: 390, 6: 700, 8: 1600 },
  "0.25": { 2: 21, 2.5: 24, 3: 42, 4: 216, 5: 480, 6: 840, 8: 1920 },
  "0.5": { 2: 26, 2.5: 31, 3: 50, 4: 250, 5: 575, 6: 1000, 8: 2300 },
};

// dims: in { args: dimensionless } out: { total_dfu: dimensionless, min_size_in: L }
export function computeSanitaryDfu({
  fixtures = {},
  config = "horizontal_branch",
  slope_in_per_ft = 0.25,
  proposed_size_in = null,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let total_dfu = 0;
  for (const [type, count] of Object.entries(fixtures)) {
    const dfu = SANITARY_DFU_VALUES[type];
    const n = Number(count) || 0;
    if (dfu != null && n > 0) total_dfu += dfu * n;
  }
  if (!(total_dfu > 0)) return { error: "Enter at least one fixture count." };

  let min_size_in = null;
  let capacity_at_size = null;
  if (config === "building_drain") {
    const slopeKey = String(slope_in_per_ft);
    const table = SANITARY_BUILDING_DRAIN_MAX_DFU[slopeKey];
    if (!table) return { error: "Slope must be 1/8 (0.125), 1/4 (0.25), or 1/2 (0.5) in per ft." };
    const sizes = Object.keys(table).map(Number).sort((a, b) => a - b);
    for (const s of sizes) {
      if (table[s] >= total_dfu) { min_size_in = s; capacity_at_size = table[s]; break; }
    }
  } else {
    const col = config === "stack" ? "stack" : "branch";
    for (const row of SANITARY_BRANCH_STACK_MAX_DFU) {
      if (row[col] >= total_dfu) { min_size_in = row.size; capacity_at_size = row[col]; break; }
    }
  }

  const warnings = [];
  if (min_size_in == null) warnings.push("Total DFU exceeds the bundled table maximum; this is a commercial-engineered system, consult IPC Table 710.1 directly.");
  if (total_dfu > 1400) warnings.push("DFU load above 1400 is a commercial-engineered system; an engineer of record should size the drainage.");
  if (slope_in_per_ft < 0.125 && config !== "stack") warnings.push("Slope below 1/8 in per ft is below the IPC minimum for pipe 3 in and smaller.");

  const proposed = proposed_size_in != null ? Number(proposed_size_in) : null;
  const undersized = proposed != null && min_size_in != null && proposed < min_size_in;
  if (undersized) warnings.push("Proposed " + proposed + " in pipe is undersized for " + total_dfu + " DFU; minimum is " + min_size_in + " in.");

  return {
    total_dfu,
    config,
    slope_in_per_ft: Number(slope_in_per_ft),
    min_size_in,
    capacity_at_size,
    proposed_size_in: proposed,
    adequate: proposed == null ? null : !undersized,
    warnings,
  };
}

export const sanitaryDfuExample = {
  // Single-bathroom branch: 1 private WC (3) + 1 lavatory (1) + 1
  // bathtub (2) = 6 DFU. A 2 in horizontal branch (max 6 DFU) is the
  // minimum per IPC Table 710.1(2).
  inputs: {
    fixtures: { water_closet_private: 1, lavatory: 1, bathtub: 1 },
    config: "horizontal_branch",
    slope_in_per_ft: 0.25,
  },
};

const _v16p_DFU_LABELS = {
  water_closet_private: "Water closet (private)",
  water_closet_public: "Water closet (public)",
  lavatory: "Lavatory",
  bathtub: "Bathtub",
  shower: "Shower",
  kitchen_sink: "Kitchen sink",
  dishwasher: "Dishwasher",
  clothes_washer: "Clothes washer",
  laundry_tub: "Laundry tub",
  floor_drain: "Floor drain",
  urinal: "Urinal",
  drinking_fountain: "Drinking fountain",
  bar_sink: "Bar sink",
  bidet: "Bidet",
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16p_renderSanitaryDfu(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: total DFU = sum(fixture count x DFU value); minimum pipe size from the max-DFU table. Per IPC 2021 §710 with DFU values per IPC Table 709.1 and capacities per Tables 710.1(1) and 710.1(2). AHJ governs the adopted code. Free at codes.iccsafe.org.";
  const config = makeSelect("Configuration", "dfu-config", [
    { value: "horizontal_branch", label: "Horizontal fixture branch", selected: true },
    { value: "stack", label: "Vertical stack" },
    { value: "building_drain", label: "Building drain / sewer" },
  ]);
  const slope = makeSelect("Slope (building drain)", "dfu-slope", [
    { value: "0.125", label: "1/8 in per ft" },
    { value: "0.25", label: "1/4 in per ft", selected: true },
    { value: "0.5", label: "1/2 in per ft" },
  ]);
  inputRegion.appendChild(config.wrap);
  inputRegion.appendChild(slope.wrap);
  const fixtureInputs = {};
  for (const [key, label] of Object.entries(_v16p_DFU_LABELS)) {
    const f = makeNumber(label + " (" + SANITARY_DFU_VALUES[key] + " DFU)", "dfu-" + key, { step: "1", min: "0", value: "0" });
    fixtureInputs[key] = f.input;
    inputRegion.appendChild(f.wrap);
  }
  attachExampleButton(inputRegion, () => {
    config.select.value = "horizontal_branch"; slope.select.value = "0.25";
    for (const k of Object.keys(fixtureInputs)) fixtureInputs[k].value = "0";
    fixtureInputs.water_closet_private.value = "1";
    fixtureInputs.lavatory.value = "1";
    fixtureInputs.bathtub.value = "1";
    update();
  });

  const oDfu = makeOutputLine(outputRegion, "Total DFU load", "dfu-out-total");
  const oSize = makeOutputLine(outputRegion, "Minimum pipe size", "dfu-out-size");
  const oNote = makeOutputLine(outputRegion, "Notes", "dfu-out-note");

  const update = debounce(() => {
    const fixtures = {};
    for (const [k, input] of Object.entries(fixtureInputs)) {
      const n = _v16p_readNum(input);
      if (n) fixtures[k] = n;
    }
    const r = computeSanitaryDfu({
      fixtures,
      config: config.select.value,
      slope_in_per_ft: Number(slope.select.value),
    });
    if (r.error) { oDfu.textContent = r.error; oSize.textContent = "-"; oNote.textContent = ""; return; }
    oDfu.textContent = fmt(r.total_dfu, 1) + " DFU";
    oSize.textContent = r.min_size_in != null
      ? r.min_size_in + " in (max " + r.capacity_at_size + " DFU at this size)"
      : "above bundled table";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Sized per IPC Table 710.1.";
  }, DEBOUNCE_MS);
  for (const input of Object.values(fixtureInputs)) input.addEventListener("input", update);
  config.select.addEventListener("change", update);
  slope.select.addEventListener("change", update);
}
PLUMBING_RENDERERS["sanitary-dfu"] = _v16p_renderSanitaryDfu;

// --- B.6 Trap primer sizing ------------------------------------------

// Floor drains served per primer by prime method (manufacturer cut
// sheets; electronic / pump-discharge / pressure-drop types feed a
// distribution unit serving up to four drains, manual serves one).
export const TRAP_PRIMER_DRAINS_PER_UNIT = {
  manual: 1,
  electronic: 4,
  pressure_drop: 4,
  pump_discharge: 4,
};

// dims: in { args: dimensionless } out: { primers_needed: dimensionless, water_gal_per_year: L^3 }
export function computeTrapPrimer({
  floor_drain_count = 0,
  zone = "occupied",
  prime_method = "electronic",
  prime_volume_oz = 8,
  cycles_per_day = 1,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const drains = Math.floor(Number(floor_drain_count) || 0);
  if (!(drains > 0)) return { error: "Enter the number of floor drains (1 or more)." };
  const perUnit = TRAP_PRIMER_DRAINS_PER_UNIT[prime_method] ?? 1;
  const primers_needed = Math.ceil(drains / perUnit);
  const ozPerCycle = Number(prime_volume_oz) || 0;
  const cyclesPerYear = (Number(cycles_per_day) || 0) * 365;
  // 128 fluid ounces per US gallon.
  const water_gal_per_year = drains * (ozPerCycle / 128) * cyclesPerYear;

  const warnings = [];
  let compliant = true;
  if (zone === "occupied" && prime_method === "manual") {
    compliant = false;
    warnings.push("Manual priming in occupied space is insufficient per IPC 2021 §1002.4; the exception allows manual prime only in mechanical spaces with a documented seasonal procedure.");
  }
  if (zone === "parking" && prime_method === "manual") {
    warnings.push("Parking-structure drains evaporate seasonally; an automatic primer is recommended even where the manual exception applies.");
  }
  if (ozPerCycle <= 0) warnings.push("Enter the primer delivery volume per cycle (manufacturer cut sheet) to estimate annual water use.");

  return {
    floor_drain_count: drains,
    zone,
    prime_method,
    drains_per_unit: perUnit,
    primers_needed,
    water_gal_per_year,
    compliant,
    warnings,
  };
}

export const trapPrimerExample = {
  // 6 occupied-space floor drains on electronic primers (4 drains/unit
  // via distribution): 2 primers; 8 oz/cycle once daily = ~136.9 gal/yr.
  inputs: {
    floor_drain_count: 6,
    zone: "occupied",
    prime_method: "electronic",
    prime_volume_oz: 8,
    cycles_per_day: 1,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16p_renderTrapPrimer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: primers = ceil(floor drains / drains-per-distribution-unit); annual water = drains x (oz per cycle / 128) x cycles per year. Per IPC 2021 §1002.4 (trap seals) with manufacturer flow rates from published cut sheets (Precision Plumbing Products / Sioux Chief / Mifab). AHJ governs. Free at codes.iccsafe.org.";
  const drains = makeNumber("Floor-drain count", "tp-drains", { step: "1", min: "0", value: "6" });
  const zone = makeSelect("Building zone", "tp-zone", [
    { value: "occupied", label: "Occupied space", selected: true },
    { value: "mech_room", label: "Mechanical room" },
    { value: "parking", label: "Parking structure" },
  ]);
  const method = makeSelect("Prime method", "tp-method", [
    { value: "electronic", label: "Electronic (up to 4 drains)", selected: true },
    { value: "pressure_drop", label: "Pressure-drop (up to 4 drains)" },
    { value: "pump_discharge", label: "Pump-discharge (up to 4 drains)" },
    { value: "manual", label: "Manual (1 drain)" },
  ]);
  const vol = makeNumber("Delivery per cycle (fl oz)", "tp-vol", { step: "any", min: "0", value: "8" });
  const cyc = makeNumber("Prime cycles per day", "tp-cyc", { step: "any", min: "0", value: "1" });
  for (const f of [drains, zone, method, vol, cyc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    drains.input.value = "6"; zone.select.value = "occupied"; method.select.value = "electronic";
    vol.input.value = "8"; cyc.input.value = "1"; update();
  });

  const oPrimers = makeOutputLine(outputRegion, "Primers / distribution units", "tp-out-primers");
  const oWater = makeOutputLine(outputRegion, "Annual water use", "tp-out-water");
  const oComp = makeOutputLine(outputRegion, "IPC 1002.4 compliance", "tp-out-comp");
  const oNote = makeOutputLine(outputRegion, "Notes", "tp-out-note");

  const update = debounce(() => {
    const r = computeTrapPrimer({
      floor_drain_count: _v16p_readNum(drains.input),
      zone: zone.select.value,
      prime_method: method.select.value,
      prime_volume_oz: _v16p_readNum(vol.input),
      cycles_per_day: _v16p_readNum(cyc.input),
    });
    if (r.error) { oPrimers.textContent = r.error; oWater.textContent = "-"; oComp.textContent = "-"; oNote.textContent = ""; return; }
    oPrimers.textContent = String(r.primers_needed) + " (" + r.drains_per_unit + " drains each)";
    oWater.textContent = fmt(r.water_gal_per_year, 1) + " gal/yr";
    oComp.textContent = r.compliant ? "OK for this zone" : "Not compliant as configured";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Every floor drain in occupied space has a primer per IPC 1002.4.";
  }, DEBOUNCE_MS);
  for (const el of [drains.input, vol.input, cyc.input]) el.addEventListener("input", update);
  zone.select.addEventListener("change", update);
  method.select.addEventListener("change", update);
}
PLUMBING_RENDERERS["trap-primer"] = _v16p_renderTrapPrimer;

// --- spec-v16 B.8 Cross-connection backflow assembly sizing screen ----

// Maps the common assembly-type names to the head-loss curve classes
// already bundled in BACKFLOW_CURVES (Watts technical-bulletin curves,
// used here as representative head-loss values; the specific assembly's
// cut sheet and the USC FCCCHR approved-assembly list govern the actual
// loss). DC = double-check (DCV curve); RP = reduced-pressure principle;
// PVB / AVB = vacuum breakers (back-siphonage only).
export const BACKFLOW_ASSEMBLY_TO_CLASS = {
  DC: "DCV",
  RP: "RP",
  PVB: "PVB",
  AVB: "AVB",
};

// Assemblies that protect against backpressure (not just back-siphonage).
// PVB / AVB are back-siphonage-only and never valid for a high (health)
// hazard or any backpressure condition.
const _V16P_BACKPRESSURE_OK = new Set(["DC", "RP"]);

// dims: in { args: dimensionless } out: { head_loss_psi: M L^-1 T^-2, downstream_psi: M L^-1 T^-2 }
export function computeBackflowSizing({
  service_flow_gpm = 0,
  hazard = "high",
  assembly_type = "RP",
  pipe_size_in = "1",
  upstream_pressure_psi = 0,
  min_residual_psi = 20,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(service_flow_gpm);
  const up = Number(upstream_pressure_psi);
  const minRes = Number.isFinite(Number(min_residual_psi)) ? Number(min_residual_psi) : 20;
  if (!(flow >= 0)) return { error: "Enter a non-negative service flow demand (GPM)." };
  if (!(up > 0)) return { error: "Enter a positive upstream (supply) pressure (psi)." };
  if (!BACKFLOW_ASSEMBLY_TO_CLASS[assembly_type]) return { error: "Unknown assembly type '" + assembly_type + "'." };

  // High (health) hazard requires a reduced-pressure principle assembly
  // regardless of the user's selection; the tile overrides and records it.
  // A backpressure condition likewise rules out PVB / AVB.
  const highHazard = hazard === "high";
  let required_assembly = assembly_type;
  let overridden = false;
  let override_reason = "";
  if (highHazard && assembly_type !== "RP") {
    required_assembly = "RP";
    overridden = true;
    override_reason = "High (health) hazard requires a reduced-pressure principle (RP) assembly per IPC 312 / the cross-connection control program; overriding the selected " + assembly_type + ".";
  } else if (!highHazard && !_V16P_BACKPRESSURE_OK.has(assembly_type)) {
    // Low hazard but a back-siphonage-only device under possible backpressure: note it.
    override_reason = assembly_type + " protects against back-siphonage only; if backpressure is possible, use a DC (low hazard) or RP (high hazard) assembly.";
  }

  const curve_class = BACKFLOW_ASSEMBLY_TO_CLASS[required_assembly];
  const loss = computeBackflowLoss({ device_class: curve_class, flow_gpm: flow, pipe_size_in: String(pipe_size_in) });
  if (loss.error) return { error: loss.error + " (sizes available depend on the assembly type)." };
  const head_loss_psi = loss.pressure_loss_psi;
  const downstream_psi = up - head_loss_psi;
  const low_pressure = downstream_psi < minRes;

  const warnings = [];
  if (override_reason) warnings.push(override_reason);
  if (low_pressure) warnings.push("Downstream pressure " + downstream_psi.toFixed(1) + " psi is below the " + minRes + " psi minimum residual; size up the assembly / service or boost the supply.");
  if (downstream_psi <= 0) warnings.push("The assembly head loss exceeds the supply pressure; this configuration cannot deliver water.");

  return {
    service_flow_gpm: flow,
    hazard,
    selected_assembly: assembly_type,
    required_assembly,
    overridden,
    curve_class,
    pipe_size_in: String(pipe_size_in),
    head_loss_psi,
    upstream_pressure_psi: up,
    downstream_psi,
    min_residual_psi: minRes,
    low_pressure,
    attribution: loss.attribution,
    compliance_note: "Annual test by a certified backflow assembly tester is required per EPA 40 CFR 141.85 and AWWA M14, and by most local cross-connection control programs. AHJ governs.",
    warnings,
  };
}

export const backflowSizingExample = {
  // High-hazard cross-connection, user picked a double-check, 2 in service
  // at 100 GPM, 70 psi upstream. The screen overrides to RP (high hazard);
  // RP 2 in at 100 GPM loses ~7 psi, leaving 63 psi downstream.
  inputs: { service_flow_gpm: 100, hazard: "high", assembly_type: "DC", pipe_size_in: "2", upstream_pressure_psi: 70 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16p_renderBackflowSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: high (health) hazard requires a reduced-pressure principle (RP) assembly per IPC 312 / the cross-connection control program; downstream pressure = upstream - assembly head loss. Head loss interpolated from the bundled Watts technical-bulletin curves (representative; the assembly cut sheet and the USC FCCCHR approved-assembly list govern). Annual test required per EPA 40 CFR 141.85 / AWWA M14. AHJ governs. Free at codes.iccsafe.org and awwa.org for M14 TOC.";
  const flow = makeNumber("Service flow demand (GPM)", "bs-flow", { step: "any", min: "0", value: "100" });
  const hazard = makeSelect("Hazard category (IPC 312)", "bs-haz", [
    { value: "high", label: "High / health hazard", selected: true },
    { value: "low", label: "Low / non-health hazard" },
  ]);
  const assembly = makeSelect("Intended assembly type", "bs-asm", [
    { value: "RP", label: "RP (reduced-pressure principle)", selected: true },
    { value: "DC", label: "DC (double check)" },
    { value: "PVB", label: "PVB (pressure vacuum breaker)" },
    { value: "AVB", label: "AVB (atmospheric vacuum breaker)" },
  ]);
  const size = makeSelect("Service / assembly size (in)", "bs-size", [
    { value: "0.75", label: "3/4 in" },
    { value: "1", label: "1 in", selected: true },
    { value: "1.5", label: "1-1/2 in" },
    { value: "2", label: "2 in" },
  ]);
  const up = makeNumber("Upstream supply pressure (psi)", "bs-up", { step: "any", min: "0", value: "70" });
  const minRes = makeNumber("Minimum residual required (psi)", "bs-res", { step: "any", min: "0", value: "20" });
  for (const f of [flow, hazard, assembly, size, up, minRes]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    flow.input.value = "100"; hazard.select.value = "high"; assembly.select.value = "DC";
    size.select.value = "2"; up.input.value = "70"; minRes.input.value = "20"; update();
  });

  const oReq = makeOutputLine(outputRegion, "Required assembly", "bs-out-req");
  const oLoss = makeOutputLine(outputRegion, "Head loss at design flow", "bs-out-loss");
  const oDown = makeOutputLine(outputRegion, "Pressure remaining downstream", "bs-out-down");
  const oComp = makeOutputLine(outputRegion, "Compliance", "bs-out-comp");
  const oNote = makeOutputLine(outputRegion, "Notes", "bs-out-note");

  const update = debounce(() => {
    const r = computeBackflowSizing({
      service_flow_gpm: _v16p_readNum(flow.input),
      hazard: hazard.select.value,
      assembly_type: assembly.select.value,
      pipe_size_in: size.select.value,
      upstream_pressure_psi: _v16p_readNum(up.input),
      min_residual_psi: _v16p_readNum(minRes.input),
    });
    if (r.error) { oReq.textContent = r.error; oLoss.textContent = "-"; oDown.textContent = "-"; oComp.textContent = "-"; oNote.textContent = ""; return; }
    oReq.textContent = r.required_assembly + (r.overridden ? " (overridden from " + r.selected_assembly + " for high hazard)" : "") + " at " + r.pipe_size_in + " in";
    oLoss.textContent = fmt(r.head_loss_psi, 1) + " psi";
    oDown.textContent = fmt(r.downstream_psi, 1) + " psi" + (r.low_pressure ? " (below the " + fmt(r.min_residual_psi, 0) + " psi minimum)" : "");
    oComp.textContent = r.compliance_note;
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Assembly type satisfies the hazard category; downstream pressure clears the minimum residual.";
  }, DEBOUNCE_MS);
  for (const el of [flow.input, up.input, minRes.input]) el.addEventListener("input", update);
  for (const s of [hazard.select, assembly.select, size.select]) s.addEventListener("change", update);
}
PLUMBING_RENDERERS["backflow-sizing"] = _v16p_renderBackflowSizing;

// =====================================================================
// v23 shared simple-renderer (select + number fields). Non-exported so it
// stays out of the dimensional-analysis corpus.
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
// v23 B.1: Trap-seal protection check (IPC/UPC §1002 trap-to-vent)
// =====================================================================
// dims: in { developed_distance_ft: L, table_max_ft: L, trap_seal_in: L } out: { percent_used: dimensionless, within_limit: dimensionless, siphonage_risk: dimensionless, trap_seal_in: L }
export function computeTrapSealLoss({ developed_distance_ft = 0, table_max_ft = 0, trap_seal_in = 2 } = {}) {
  // The permitted maximum trap-to-vent distance is entered directly (looked up
  // by the user from the adopted code table for the fixture-drain size), so the
  // drain diameter itself is not part of this check.
  const dist = Number(developed_distance_ft) || 0;
  const max = Number(table_max_ft) || 0;
  let seal = Number(trap_seal_in); if (!Number.isFinite(seal) || seal < 0) seal = 0;
  if (!(dist > 0 && Number.isFinite(dist))) return { error: "Developed vent distance must be positive (ft)." };
  if (!(max > 0 && Number.isFinite(max))) return { error: "Permitted trap-to-vent distance must be positive (ft)." };
  const percent_used = (dist / max) * 100;
  const within_limit = dist <= max;
  const siphonage_risk = !within_limit || seal < 1;
  return { percent_used, within_limit, siphonage_risk, trap_seal_in: seal };
}
export const trapSealLossExample = { inputs: { developed_distance_ft: 6, table_max_ft: 8, trap_seal_in: 2 } };
const renderTrapSealLoss = _v23SimpleRenderer({
  citation: "Citation: Per the adopted plumbing code's trap-seal-protection and trap-to-vent distance provisions (IPC §1002 / UPC §1002). The permitted maximum distance is user-supplied from the adopted table; no proprietary table is reproduced. S-traps are out of scope. The AHJ-adopted edition governs. Free read-only at codes.iccsafe.org.",
  example: trapSealLossExample.inputs,
  fields: [
    { key: "developed_distance_ft", label: "Developed trap-to-vent distance (ft)", kind: "number" },
    { key: "table_max_ft", label: "Permitted maximum (ft, from adopted table)", kind: "number" },
    { key: "trap_seal_in", label: "Trap-seal depth (in)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "pass", id: "tsl-out-pass", label: "Within limit", value: (r) => r.within_limit ? "PASS - within permitted distance" : "FAIL - trap arm exceeds the table maximum" },
    { key: "pct", id: "tsl-out-pct", label: "Percent of permitted used", value: (r) => fmt(r.percent_used, 0) + "%" },
    { key: "risk", id: "tsl-out-risk", label: "Siphonage risk", value: (r) => r.siphonage_risk ? "Flag - self-/induced-siphonage risk (vent inadequate or seal < 1 in)" : "Adequate seal protection" },
  ],
  compute: computeTrapSealLoss,
});
PLUMBING_RENDERERS["trap-seal-loss"] = renderTrapSealLoss;

// =====================================================================
// v23 B.2: Water meter sizing from peak demand (AWWA M22)
// =====================================================================
// dims: in { peak_demand_gpm: dimensionless, normal_rating_gpm: dimensionless, peak_rating_gpm: dimensionless } out: { percent_used: dimensionless, headroom_gpm: dimensionless, adequate: dimensionless, above_peak_rating: dimensionless }
export function computeWaterMeterSizing({ peak_demand_gpm = 0, normal_rating_gpm = 0, peak_rating_gpm = 0 } = {}) {
  const peak = Number(peak_demand_gpm) || 0;
  const normal = Number(normal_rating_gpm) || 0;
  let peakRating = Number(peak_rating_gpm); if (!Number.isFinite(peakRating) || peakRating < 0) peakRating = 0;
  if (!(peak > 0 && Number.isFinite(peak))) return { error: "Peak demand must be positive (gpm)." };
  if (!(normal > 0 && Number.isFinite(normal))) return { error: "Meter normal-flow rating must be positive (gpm)." };
  const percent_used = (peak / normal) * 100;
  const headroom_gpm = normal - peak;
  const adequate = peak <= normal;
  const above_peak_rating = peakRating > 0 ? peak > peakRating : false;
  return { percent_used, headroom_gpm, adequate, above_peak_rating };
}
export const waterMeterSizingExample = { inputs: { peak_demand_gpm: 30, normal_rating_gpm: 50, peak_rating_gpm: 100 } };
const renderWaterMeterSizing = _v23SimpleRenderer({
  citation: "Citation: Per AWWA M22 (Sizing Water Service Lines and Meters) and the AWWA C700-series meter standards. Meter flow ranges are user-supplied for the candidate size. Free guidance summaries at awwa.org.",
  example: waterMeterSizingExample.inputs,
  fields: [
    { key: "peak_demand_gpm", label: "Peak demand (gpm)", kind: "number" },
    { key: "normal_rating_gpm", label: "Meter normal-flow rating (gpm)", kind: "number" },
    { key: "peak_rating_gpm", label: "Meter peak-flow rating (gpm, optional)", kind: "number" },
  ],
  outputs: [
    { key: "verdict", id: "wms-out-v", label: "Verdict", value: (r) => r.above_peak_rating ? "UNDERSIZED - demand exceeds peak rating; go a size up" : (r.adequate ? "Adequate at the normal-flow rating" : "Undersized at the normal-flow rating") },
    { key: "pct", id: "wms-out-p", label: "Percent of normal rating used", value: (r) => fmt(r.percent_used, 0) + "%" },
    { key: "head", id: "wms-out-h", label: "Headroom", value: (r) => fmt(r.headroom_gpm, 1) + " gpm" },
  ],
  compute: computeWaterMeterSizing,
});
PLUMBING_RENDERERS["water-meter-sizing"] = renderWaterMeterSizing;

// ===========================================================================
// spec-v20 Phase B - three new plumbing/gas tiles (v18/v21 tile contract:
// no non-finite numeric output field, ever).
// ===========================================================================

// --- v20 B.1: Water thermal-expansion volume (`thermal-expansion-volume`) ---
// dV = V * (rho_cold / rho_hot - 1), using bundled NIST water-density points
// (g/mL) interpolated within 32-212 F. Closed systems need expansion control.
const WATER_DENSITY_C = [
  [0, 0.99984], [4, 0.99997], [10, 0.99970], [20, 0.99821], [25, 0.99705],
  [30, 0.99565], [40, 0.99222], [50, 0.98803], [60, 0.98320], [70, 0.97778],
  [80, 0.97181], [90, 0.96535], [100, 0.95835],
];
function waterDensityAtF(tF) {
  const c = (tF - 32) * 5 / 9;
  const tbl = WATER_DENSITY_C;
  if (c <= tbl[0][0]) return tbl[0][1];
  if (c >= tbl[tbl.length - 1][0]) return tbl[tbl.length - 1][1];
  for (let i = 1; i < tbl.length; i++) {
    if (c <= tbl[i][0]) {
      const [c0, d0] = tbl[i - 1], [c1, d1] = tbl[i];
      return d0 + (d1 - d0) * (c - c0) / (c1 - c0);
    }
  }
  return tbl[tbl.length - 1][1];
}
// dims: in { volume_gal: L^3, cold_f: T, hot_f: T } out: { expansion_gal: L^3, expansion_pct: dimensionless }
export function computeThermalExpansionVolume({ volume_gal = 0, cold_f = 0, hot_f = 0, closed_system = true } = {}) {
  const V = Number(volume_gal) || 0;
  const tc = Number(cold_f), th = Number(hot_f);
  if (!(V > 0 && Number.isFinite(V))) return { error: "System water volume must be positive (gal)." };
  if (!Number.isFinite(tc) || !Number.isFinite(th)) return { error: "Temperatures must be finite (F)." };
  if (tc < 32 || tc > 212 || th < 32 || th > 212) return { error: "Temperatures must be within 32-212 F (no extrapolation)." };
  if (th <= tc) return { error: "Hot temperature must exceed cold inlet temperature." };
  const rhoCold = waterDensityAtF(tc), rhoHot = waterDensityAtF(th);
  const dV = V * (rhoCold / rhoHot - 1);
  const pct = dV / V * 100;
  return {
    expansion_gal: Number.isFinite(dV) ? dV : null,
    expansion_pct: Number.isFinite(pct) ? pct : null,
    rho_cold: rhoCold, rho_hot: rhoHot,
    note: closed_system
      ? "Closed system - this expansion must be absorbed by an expansion tank or relief path (no backflow to the main)."
      : "Open system - expansion control is not required if expansion can flow back to the supply.",
  };
}
export const thermalExpansionVolumeExample = { inputs: { volume_gal: 50, cold_f: 50, hot_f: 140, closed_system: true } };

function renderThermalExpansionVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Water density vs. temperature, NIST / standard steam tables (public domain). dV = V*(rho_cold/rho_hot - 1), interpolated within 32-212 F. Distinct from the expansion-tank sizing tiles - this outputs the raw expansion volume only. Free at nist.gov.";
  const vol = makeNumber("System water volume (gal)", "tev-v", { step: "any", min: "0", value: "50" });
  vol.input.value = "50";
  const cold = makeNumber("Cold inlet temperature (F)", "tev-c", { step: "any", value: "50" });
  cold.input.value = "50";
  const hot = makeNumber("Set hot temperature (F)", "tev-h", { step: "any", value: "140" });
  hot.input.value = "140";
  const sys = makeSelect("System type", "tev-sys", [{ value: "closed", label: "Closed (needs expansion control)", selected: true }, { value: "open", label: "Open" }]);
  for (const f of [vol, cold, hot, sys]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vol.input.value = "50"; cold.input.value = "50"; hot.input.value = "140"; sys.select.value = "closed"; update(); });
  const oV = makeOutputLine(outputRegion, "Expanded volume gained", "tev-out-v");
  const oP = makeOutputLine(outputRegion, "Expansion (% of system)", "tev-out-p");
  const oNote = makeOutputLine(outputRegion, "Note", "tev-out-note");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computeThermalExpansionVolume({ volume_gal: readNum(vol.input), cold_f: readNum(cold.input), hot_f: readNum(hot.input), closed_system: sys.select.value === "closed" });
    if (r.error) { oV.textContent = r.error; oP.textContent = ""; oNote.textContent = ""; return; }
    oV.textContent = fmt(r.expansion_gal, 3) + " gal";
    oP.textContent = fmt(r.expansion_pct, 2) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vol.input, cold.input, hot.input, sys.select]) f.addEventListener("input", update);
}
PLUMBING_RENDERERS["thermal-expansion-volume"] = renderThermalExpansionVolume;

// --- v20 B.2: DWV vent-stack DFU/length check (`vent-sizing-stack`) ---
// Pass if connected_DFU <= table_DFU AND developed_length <= table_max_length.
// No proprietary table reproduced; the user enters the two governing values.
// dims: in { vent_dia_in: L, connected_dfu: dimensionless, developed_length_ft: L, table_dfu: dimensionless, table_max_length_ft: L, drain_dia_in: L }
//        out: { length_used_pct: dimensionless, length_margin_ft: L }
export function computeVentSizingStack({ vent_dia_in = 0, connected_dfu = 0, developed_length_ft = 0, table_dfu = 0, table_max_length_ft = 0, drain_dia_in = 0 } = {}) {
  const d = Number(vent_dia_in) || 0;
  const dfu = Number(connected_dfu) || 0;
  const len = Number(developed_length_ft) || 0;
  const tdfu = Number(table_dfu) || 0;
  const tmax = Number(table_max_length_ft) || 0;
  const drain = Number(drain_dia_in) || 0;
  if (!(d > 0 && Number.isFinite(d))) return { error: "Vent diameter must be positive (in)." };
  if (!(tdfu > 0 && Number.isFinite(tdfu))) return { error: "Table-permitted DFU must be positive." };
  if (!(tmax > 0 && Number.isFinite(tmax))) return { error: "Table-permitted maximum length must be positive (ft)." };
  if (dfu < 0 || len < 0) return { error: "Connected DFU and developed length must be non-negative." };
  const dfuOk = dfu <= tdfu;
  const lenOk = len <= tmax;
  const pctLen = len / tmax * 100;
  const margin = tmax - len;
  const halfDrainOk = drain > 0 ? d >= drain / 2 : null;
  return {
    pass: dfuOk && lenOk && (halfDrainOk !== false),
    dfu_ok: dfuOk, length_ok: lenOk,
    length_used_pct: Number.isFinite(pctLen) ? pctLen : null,
    length_margin_ft: Number.isFinite(margin) ? margin : null,
    half_drain_ok: halfDrainOk,
    note: (dfuOk ? "" : "Connected DFU exceeds the table limit - increase vent size. ")
      + (lenOk ? "" : "Developed length exceeds the table maximum - increase vent size. ")
      + (halfDrainOk === false ? "Vent is smaller than half the drain diameter - undersized. " : "")
      + "Developed length excludes fitting equivalents; wet-vent configurations are out of scope.",
  };
}
export const ventSizingStackExample = { inputs: { vent_dia_in: 2, connected_dfu: 18, developed_length_ft: 90, table_dfu: 24, table_max_length_ft: 120, drain_dia_in: 3 } };

function renderVentSizingStack(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the adopted plumbing code's vent sizing and length provisions (IPC Chapter 9 / UPC Chapter 9, by name). Table values user-supplied; the AHJ-adopted edition governs. Developed length excludes fitting equivalents; wet-vent configurations out of scope. Code library free read-only at codes.iccsafe.org.";
  const d = makeNumber("Vent nominal diameter (in)", "vss-d", { step: "any", min: "0", value: "2" });
  d.input.value = "2";
  const dfu = makeNumber("Connected drainage fixture units (DFU)", "vss-dfu", { step: "any", min: "0", value: "18" });
  dfu.input.value = "18";
  const len = makeNumber("Developed vent length (ft)", "vss-len", { step: "any", min: "0", value: "90" });
  len.input.value = "90";
  const tdfu = makeNumber("Table-permitted DFU for this diameter", "vss-tdfu", { step: "any", min: "0", value: "24" });
  tdfu.input.value = "24";
  const tmax = makeNumber("Table-permitted max length (ft)", "vss-tmax", { step: "any", min: "0", value: "120" });
  tmax.input.value = "120";
  const drain = makeNumber("Served drain diameter (in, optional)", "vss-drain", { step: "any", min: "0", value: "3" });
  drain.input.value = "3";
  for (const f of [d, dfu, len, tdfu, tmax, drain]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "2"; dfu.input.value = "18"; len.input.value = "90"; tdfu.input.value = "24"; tmax.input.value = "120"; drain.input.value = "3"; update(); });
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "vss-out-v");
  const oPct = makeOutputLine(outputRegion, "Length used / margin", "vss-out-p");
  const oNote = makeOutputLine(outputRegion, "Note", "vss-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVentSizingStack({ vent_dia_in: readNum(d.input), connected_dfu: readNum(dfu.input), developed_length_ft: readNum(len.input), table_dfu: readNum(tdfu.input), table_max_length_ft: readNum(tmax.input), drain_dia_in: readNum(drain.input) });
    if (r.error) { oVerdict.textContent = r.error; oPct.textContent = ""; oNote.textContent = ""; return; }
    oVerdict.textContent = r.pass ? "PASS (DFU and length within limits)" : "FAIL";
    oPct.textContent = fmt(r.length_used_pct, 1) + "% used, " + fmt(r.length_margin_ft, 1) + " ft margin";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d.input, dfu.input, len.input, tdfu.input, tmax.input, drain.input]) f.addEventListener("input", update);
}
PLUMBING_RENDERERS["vent-sizing-stack"] = renderVentSizingStack;

// --- v20 B.3: gas-pipe-pressure-drop -> relocated to calc-gas.js (spec-v42 split) ---

// =====================================================================
// spec-v26 Part II - Group B: Plumbing and Gas (3 tiles)
// Mixing/tempering valve blend temperature, well pressure-tank drawdown,
// and pipe velocity / copper erosion check. All first-principles; the
// helpers (makeNumber, makeSelect, makeOutputLine, attachExampleButton,
// fmt, debounce, DEBOUNCE_MS) are already imported at module top.
// =====================================================================

// dims: in { hot_temp_F: T, cold_temp_F: T, hot_gpm: dimensionless, cold_gpm: dimensionless, target_temp_F: T } out: { blend_temp_F: T, percent_hot: dimensionless, hot_fraction: dimensionless, hot_cold_ratio: dimensionless, hot_gpm: dimensionless }
export function computeMixedWaterTemp({ mode = "find-blend", hot_temp_F = 0, cold_temp_F = 0, hot_gpm = 0, cold_gpm = 0, target_temp_F = 0 } = {}) {
  const _g = _finiteGuard({ hot_temp_F, cold_temp_F, hot_gpm, cold_gpm, target_temp_F }); if (_g) return _g;
  const Th = Number(hot_temp_F), Tc = Number(cold_temp_F);
  // ASSE scald-guard delivery limits.
  const FIXTURE_LIMIT_F = 120, SHOWER_LIMIT_F = 110;
  function scaldFlag(T) {
    const flags = [];
    if (T > FIXTURE_LIMIT_F) flags.push("Delivered temperature exceeds the 120 F fixture scald limit (ASSE 1017/1016/1070).");
    else if (T > SHOWER_LIMIT_F) flags.push("Delivered temperature exceeds the 110 F shower/tub-fill limit (ASSE 1016/1070).");
    return flags;
  }

  if (mode === "find-blend") {
    const Qh = Number(hot_gpm), Qc = Number(cold_gpm);
    if (!(Qh >= 0) || !(Qc >= 0)) return { error: "Flows must be non-negative." };
    const total = Qh + Qc;
    if (!(total > 0)) return { error: "Total flow (hot + cold) must be positive." };
    const blend = (Qh * Th + Qc * Tc) / total;
    const hot_fraction = Qh / total;
    const notes = [];
    if (Th === Tc) notes.push("Hot and cold supply are equal: the blend is degenerate (one temperature).");
    notes.push.apply(notes, scaldFlag(blend));
    return { mode, blend_temp_F: blend, percent_hot: hot_fraction * 100, hot_fraction, total_gpm: total, notes };
  }

  if (mode === "find-mix-ratio") {
    const Tt = Number(target_temp_F);
    if (Th === Tc) return { error: "Hot and cold supply are equal: no blend ratio is defined." };
    const lo = Math.min(Th, Tc), hi = Math.max(Th, Tc);
    if (Tt < lo || Tt > hi) return { error: "Target " + Tt + " F is outside the [" + lo + ", " + hi + "] F achievable range; cannot extrapolate." };
    const hot_fraction = (Tt - Tc) / (Th - Tc);
    const denom = (Th - Tt);
    const hot_cold_ratio = denom !== 0 ? (Tt - Tc) / denom : Infinity;
    const notes = scaldFlag(Tt);
    return { mode, target_temp_F: Tt, percent_hot: hot_fraction * 100, hot_fraction, hot_cold_ratio, notes };
  }

  if (mode === "find-hot-flow") {
    const Tt = Number(target_temp_F), Qc = Number(cold_gpm);
    if (!(Qc >= 0)) return { error: "Cold flow must be non-negative." };
    if (Th === Tc) return { error: "Hot and cold supply are equal: hot flow is not defined." };
    const lo = Math.min(Th, Tc), hi = Math.max(Th, Tc);
    if (Tt < lo || Tt > hi) return { error: "Target " + Tt + " F is outside the [" + lo + ", " + hi + "] F achievable range." };
    const denom = (Th - Tt);
    if (!(denom !== 0)) return { error: "Target equals the hot supply: hot flow is unbounded." };
    const hot = Qc * (Tt - Tc) / denom;
    const total = hot + Qc;
    const hot_fraction = total > 0 ? hot / total : 0;
    const notes = scaldFlag(Tt);
    return { mode, hot_gpm: hot, percent_hot: hot_fraction * 100, hot_fraction, total_gpm: total, notes };
  }
  return { error: "Unknown mode." };
}

export const mixedWaterTempExample = { inputs: { mode: "find-blend", hot_temp_F: 140, cold_temp_F: 60, hot_gpm: 1, cold_gpm: 1 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderMixedWaterTemp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles mixing energy balance for blending hot and cold potable water (T_blend = (Qh*Th + Qc*Tc)/(Qh+Qc)); the delivery-temperature limits follow the ASSE 1017 (master tempering) and ASSE 1016/1070 (point-of-use scald-guard) device standards and the IPC/UPC scald provisions, by name. The listed mixing valve and the AHJ govern the installed setpoint.";
  const mode = makeSelect("Mode", "mwt-mode", [
    { value: "find-blend", label: "Find blended temperature", selected: true },
    { value: "find-mix-ratio", label: "Find mix ratio for a target" },
    { value: "find-hot-flow", label: "Find hot flow for a target" },
  ]);
  const th = makeNumber("Hot supply temp (F)", "mwt-th", { step: "any" });
  const tc = makeNumber("Cold supply temp (F)", "mwt-tc", { step: "any" });
  const qh = makeNumber("Hot flow (gpm)", "mwt-qh", { step: "any", min: "0" });
  const qc = makeNumber("Cold flow (gpm)", "mwt-qc", { step: "any", min: "0" });
  const tt = makeNumber("Target delivered temp (F)", "mwt-tt", { step: "any" });
  for (const f of [mode, th, tc, qh, qc, tt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "find-blend"; th.input.value = "140"; tc.input.value = "60"; qh.input.value = "1"; qc.input.value = "1"; tt.input.value = ""; update(); });

  const oOut = makeOutputLine(outputRegion, "Result", "mwt-out-r");
  const oPct = makeOutputLine(outputRegion, "Percent hot", "mwt-out-pct");
  const oNote = makeOutputLine(outputRegion, "Notes", "mwt-out-note");

  const update = debounce(() => {
    const r = computeMixedWaterTemp({
      mode: mode.select.value,
      hot_temp_F: Number(th.input.value) || 0,
      cold_temp_F: Number(tc.input.value) || 0,
      hot_gpm: Number(qh.input.value) || 0,
      cold_gpm: Number(qc.input.value) || 0,
      target_temp_F: Number(tt.input.value) || 0,
    });
    if (r.error) { oOut.textContent = r.error; oPct.textContent = "-"; oNote.textContent = ""; return; }
    if (r.mode === "find-blend") oOut.textContent = fmt(r.blend_temp_F, 1) + " F blended (" + fmt(r.total_gpm, 2) + " gpm total)";
    else if (r.mode === "find-mix-ratio") oOut.textContent = "hot fraction " + fmt(r.hot_fraction, 4) + " (hot:cold " + fmt(r.hot_cold_ratio, 3) + ")";
    else oOut.textContent = fmt(r.hot_gpm, 3) + " gpm hot (" + fmt(r.total_gpm, 2) + " gpm total)";
    oPct.textContent = fmt(r.percent_hot, 1) + " %";
    oNote.textContent = r.notes && r.notes.length ? r.notes.join(" ") : "Within the scald-guard delivery limits.";
  }, DEBOUNCE_MS);
  for (const f of [th.input, tc.input, qh.input, qc.input, tt.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
PLUMBING_RENDERERS["mixed-water-temp"] = _v26renderMixedWaterTemp;

// dims: in { tank_volume_gal: dimensionless, cut_in_psi: dimensionless, cut_out_psi: dimensionless, precharge_psi: dimensionless, pump_gpm: dimensionless, target_drawdown_gal: dimensionless } out: { drawdown_gal: dimensionless, runtime_min: T, cycles_per_hour: dimensionless, tank_volume_gal: dimensionless }
export function computePressureTankDrawdown({ mode = "find-drawdown", tank_volume_gal = 0, cut_in_psi = 0, cut_out_psi = 0, precharge_psi = null, pump_gpm = 0, target_drawdown_gal = 0 } = {}) {
  const _g = _finiteGuard({ tank_volume_gal, cut_in_psi, cut_out_psi, pump_gpm, target_drawdown_gal }); if (_g) return _g;
  const Pin = Number(cut_in_psi), Pout = Number(cut_out_psi);
  if (!(Pin > 0)) return { error: "Cut-in pressure must be positive (psi)." };
  if (!(Pout > Pin)) return { error: "Cut-out pressure must exceed cut-in pressure." };
  const Ppre = (precharge_psi === null || precharge_psi === undefined || precharge_psi === "") ? (Pin - 2) : Number(precharge_psi);
  if (!Number.isFinite(Ppre)) return { error: "Precharge must be a finite pressure (psi)." };
  const ATM = 14.7;
  const Pin_abs = Pin + ATM, Pout_abs = Pout + ATM, Ppre_abs = Ppre + ATM;
  if (!(Ppre_abs > 0)) return { error: "Absolute precharge must be positive." };

  const notes = [];
  const precharge_default = (precharge_psi === null || precharge_psi === undefined || precharge_psi === "");
  if (precharge_default) notes.push("Precharge defaulted to cut-in minus 2 psi (" + fmt(Ppre, 1) + " psi), the standard diaphragm-tank rule.");
  if (Ppre >= Pin) notes.push("Precharge (" + fmt(Ppre, 1) + " psi) is at or above cut-in (" + Pin + " psi): the tank will not draw down usefully.");

  // Drawdown fraction per Boyle's law on absolute pressures.
  const factor = Ppre_abs / Pin_abs - Ppre_abs / Pout_abs;

  if (mode === "size-the-tank") {
    const target = Number(target_drawdown_gal);
    if (!(target > 0)) return { error: "Target drawdown must be positive (gal)." };
    if (!(factor > 0)) return { error: "Precharge too high for this cut-in/cut-out: no usable drawdown to size to." };
    const tank = target / factor;
    let runtime = null, cycles = null;
    const gpm = Number(pump_gpm);
    if (gpm > 0) { runtime = target / gpm; cycles = 30 / runtime; if (runtime < 1) notes.push("Runtime per cycle " + fmt(runtime, 2) + " min is below the 1-minute anti-short-cycle minimum."); }
    else notes.push("Pump gpm not entered: runtime and cycles suppressed.");
    return { mode, tank_volume_gal: tank, drawdown_gal: target, precharge_psi: Ppre, runtime_min: runtime, cycles_per_hour: cycles, notes };
  }

  // find-drawdown
  const V = Number(tank_volume_gal);
  if (!(V > 0)) return { error: "Tank total volume must be positive (gal)." };
  const drawdown = V * Math.max(factor, 0);
  let runtime = null, cycles = null;
  const gpm = Number(pump_gpm);
  if (gpm > 0) { runtime = drawdown / gpm; cycles = runtime > 0 ? 30 / runtime : null; if (runtime > 0 && runtime < 1) notes.push("Runtime per cycle " + fmt(runtime, 2) + " min is below the 1-minute anti-short-cycle minimum."); }
  else notes.push("Pump gpm not entered: runtime and cycles suppressed.");
  return { mode, tank_volume_gal: V, drawdown_gal: drawdown, precharge_psi: Ppre, runtime_min: runtime, cycles_per_hour: cycles, notes };
}

export const pressureTankDrawdownExample = { inputs: { mode: "find-drawdown", tank_volume_gal: 44, cut_in_psi: 40, cut_out_psi: 60, pump_gpm: 10 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderPressureTankDrawdown(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pressure-tank drawdown from Boyle's law on the diaphragm air charge (drawdown = V * (Ppre_abs/Pin_abs - Ppre_abs/Pout_abs)) and the anti-short-cycle minimum-runtime rule (about 1 min per cycle), per the published pump/tank engineering practice (Amtrol/WellMate and the WQA references), by name; first-principles gas law. The pump manufacturer's minimum runtime and the installed precharge govern.";
  const mode = makeSelect("Mode", "ptd-mode", [
    { value: "find-drawdown", label: "Find drawdown from a tank", selected: true },
    { value: "size-the-tank", label: "Size the tank for a drawdown" },
  ]);
  const v = makeNumber("Tank total volume (gal)", "ptd-v", { step: "any", min: "0" });
  const td = makeNumber("Target drawdown (gal, size mode)", "ptd-td", { step: "any", min: "0" });
  const pin = makeNumber("Cut-in pressure (psi)", "ptd-pin", { step: "any", min: "0" });
  const pout = makeNumber("Cut-out pressure (psi)", "ptd-pout", { step: "any", min: "0" });
  const pre = makeNumber("Precharge (psi, default cut-in - 2)", "ptd-pre", { step: "any" });
  const gpm = makeNumber("Pump capacity (gpm, optional)", "ptd-gpm", { step: "any", min: "0" });
  for (const f of [mode, v, td, pin, pout, pre, gpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "find-drawdown"; v.input.value = "44"; td.input.value = ""; pin.input.value = "40"; pout.input.value = "60"; pre.input.value = ""; gpm.input.value = "10"; update(); });

  const oDD = makeOutputLine(outputRegion, "Drawdown (gal)", "ptd-out-dd");
  const oTank = makeOutputLine(outputRegion, "Tank volume (gal)", "ptd-out-tank");
  const oRun = makeOutputLine(outputRegion, "Runtime / cycle (min)", "ptd-out-run");
  const oCyc = makeOutputLine(outputRegion, "Worst-case cycles/hr", "ptd-out-cyc");
  const oNote = makeOutputLine(outputRegion, "Notes", "ptd-out-note");

  const update = debounce(() => {
    const r = computePressureTankDrawdown({
      mode: mode.select.value,
      tank_volume_gal: Number(v.input.value) || 0,
      cut_in_psi: Number(pin.input.value) || 0,
      cut_out_psi: Number(pout.input.value) || 0,
      precharge_psi: pre.input.value === "" ? null : Number(pre.input.value),
      pump_gpm: Number(gpm.input.value) || 0,
      target_drawdown_gal: Number(td.input.value) || 0,
    });
    if (r.error) { oDD.textContent = r.error; oTank.textContent = "-"; oRun.textContent = "-"; oCyc.textContent = "-"; oNote.textContent = ""; return; }
    oDD.textContent = fmt(r.drawdown_gal, 2) + " gal";
    oTank.textContent = fmt(r.tank_volume_gal, 1) + " gal";
    oRun.textContent = r.runtime_min !== null ? fmt(r.runtime_min, 2) + " min" : "(enter pump gpm)";
    oCyc.textContent = r.cycles_per_hour !== null ? fmt(r.cycles_per_hour, 1) : "(enter pump gpm)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [v.input, td.input, pin.input, pout.input, pre.input, gpm.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
PLUMBING_RENDERERS["pressure-tank-drawdown"] = _v26renderPressureTankDrawdown;

// Velocity ceilings (ft/s) by material and water service for erosion-corrosion.
const _V26_VELOCITY_CEILING = {
  copper: { hot: 5, cold: 8 }, cpvc: { hot: 8, cold: 8 }, pex: { hot: 8, cold: 8 }, steel: { hot: 10, cold: 10 },
};
// Common actual inside diameters (in) for the renderer's size lookup.
const _V26_PIPE_ID_IN = {
  copper: { "0.5": 0.545, "0.75": 0.785, "1": 1.025, "1.25": 1.265, "1.5": 1.505, "2": 1.985 },
  cpvc:   { "0.5": 0.469, "0.75": 0.695, "1": 0.901, "1.25": 1.232, "1.5": 1.469, "2": 1.913 },
  pex:    { "0.5": 0.475, "0.75": 0.671, "1": 0.863, "1.25": 1.053, "1.5": 1.243, "2": 1.629 },
  steel:  { "0.5": 0.622, "0.75": 0.824, "1": 1.049, "1.25": 1.380, "1.5": 1.610, "2": 2.067 },
};

// dims: in { flow_gpm: dimensionless, diameter_in: L, target_velocity_fps: dimensionless } out: { velocity_fps: dimensionless, max_flow_gpm: dimensionless }
export function computePipeVelocity({ mode = "velocity-from-flow", flow_gpm = 0, diameter_in = 0, material = "copper", service = "hot", target_velocity_fps = 0 } = {}) {
  const _g = _finiteGuard({ flow_gpm, diameter_in, target_velocity_fps }); if (_g) return _g;
  const d = Number(diameter_in);
  if (!(d > 0)) return { error: "Pipe inside diameter must be positive (in)." };
  const mat = String(material).toLowerCase();
  const svc = String(service).toLowerCase() === "cold" ? "cold" : "hot";
  const ceilTable = _V26_VELOCITY_CEILING[mat] || _V26_VELOCITY_CEILING.steel;
  const ceiling = ceilTable[svc];
  const K = 0.4085; // v(ft/s) = 0.4085 * gpm / d^2

  if (mode === "max-flow-for-velocity") {
    const vt = Number(target_velocity_fps);
    const useCeiling = !(vt > 0);
    const v = useCeiling ? ceiling : vt;
    const max_flow_gpm = v * d * d / K;
    return { mode, material: mat, service: svc, diameter_in: d, ceiling_fps: ceiling, target_velocity_fps: v, max_flow_gpm, notes: [useCeiling ? "No target entered: used the material erosion-corrosion ceiling (" + ceiling + " ft/s)." : ""].filter(Boolean) };
  }

  const q = Number(flow_gpm);
  if (!(q >= 0)) return { error: "Flow must be non-negative (gpm)." };
  const velocity_fps = K * q / (d * d);
  const over = velocity_fps > ceiling;
  const notes = [];
  if (over) notes.push("Velocity " + fmt(velocity_fps, 2) + " ft/s exceeds the " + mat + " " + svc + " erosion-corrosion ceiling of " + ceiling + " ft/s.");
  notes.push("Actual inside diameter (not nominal) governs. Copper ceiling about 5 ft/s hot, 8 ft/s cold.");
  return { mode, material: mat, service: svc, diameter_in: d, velocity_fps, ceiling_fps: ceiling, over_limit: over, verdict: over ? "over-limit" : "within-limit", notes };
}

export const pipeVelocityExample = { inputs: { mode: "velocity-from-flow", flow_gpm: 10, diameter_in: 0.785, material: "copper", service: "hot" } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderPipeVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pipe-flow velocity from continuity (v = 0.4085*gpm/d^2) and the copper erosion-corrosion velocity limits (about 5 ft/s hot, 8 ft/s cold) per the Copper Development Association / ASTM and ASPE plumbing-design guidance, by name; first-principles. Pairs with pipe-sizing and friction-loss. Actual inside diameter, not nominal, governs.";
  const mode = makeSelect("Mode", "pv-mode", [
    { value: "velocity-from-flow", label: "Velocity from flow", selected: true },
    { value: "max-flow-for-velocity", label: "Max flow for a velocity" },
  ]);
  const mat = makeSelect("Material", "pv-mat", [
    { value: "copper", label: "Copper (Type L)", selected: true },
    { value: "cpvc", label: "CPVC" },
    { value: "pex", label: "PEX" },
    { value: "steel", label: "Steel (Sch 40)" },
  ]);
  const svc = makeSelect("Water service", "pv-svc", [
    { value: "hot", label: "Hot (lower copper ceiling)", selected: true },
    { value: "cold", label: "Cold" },
  ]);
  const size = makeSelect("Nominal size (fills ID)", "pv-size", [
    { value: "0.5", label: "1/2 in" }, { value: "0.75", label: "3/4 in", selected: true },
    { value: "1", label: "1 in" }, { value: "1.25", label: "1-1/4 in" },
    { value: "1.5", label: "1-1/2 in" }, { value: "2", label: "2 in" },
  ]);
  const d = makeNumber("Inside diameter (in, actual bore)", "pv-d", { step: "any", min: "0" });
  const q = makeNumber("Flow (gpm)", "pv-q", { step: "any", min: "0" });
  const vt = makeNumber("Target velocity (ft/s, max-flow mode)", "pv-vt", { step: "any", min: "0" });
  for (const f of [mode, mat, svc, size, d, q, vt]) inputRegion.appendChild(f.wrap);

  function fillID() { const tbl = _V26_PIPE_ID_IN[mat.select.value] || {}; const id = tbl[size.select.value]; if (id) d.input.value = String(id); }
  fillID();
  attachExampleButton(inputRegion, () => { mode.select.value = "velocity-from-flow"; mat.select.value = "copper"; svc.select.value = "hot"; size.select.value = "0.75"; fillID(); q.input.value = "10"; vt.input.value = ""; update(); });

  const oV = makeOutputLine(outputRegion, "Velocity / max flow", "pv-out-v");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "pv-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Notes", "pv-out-note");

  const update = debounce(() => {
    const r = computePipeVelocity({
      mode: mode.select.value,
      flow_gpm: Number(q.input.value) || 0,
      diameter_in: Number(d.input.value) || 0,
      material: mat.select.value,
      service: svc.select.value,
      target_velocity_fps: Number(vt.input.value) || 0,
    });
    if (r.error) { oV.textContent = r.error; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    if (r.mode === "max-flow-for-velocity") { oV.textContent = fmt(r.max_flow_gpm, 2) + " gpm at " + fmt(r.target_velocity_fps, 2) + " ft/s"; oVerdict.textContent = "ceiling " + r.ceiling_fps + " ft/s (" + r.material + " " + r.service + ")"; }
    else { oV.textContent = fmt(r.velocity_fps, 2) + " ft/s (ceiling " + r.ceiling_fps + " ft/s)"; oVerdict.textContent = r.verdict; }
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [d.input, q.input, vt.input]) f.addEventListener("input", update);
  for (const f of [mode.select, svc.select]) f.addEventListener("change", update);
  for (const f of [mat.select, size.select]) f.addEventListener("change", () => { fillID(); update(); });
}
PLUMBING_RENDERERS["pipe-velocity"] = _v26renderPipeVelocity;

// =====================================================================
// spec-v61: Water-supply demand and pressure budget (Group B).
// =====================================================================

// --- wsfu-demand: Probable Peak Demand from Fixture Units ---
//
// Hunter's-curve interpolation: total water-supply fixture units (WSFU) ->
// probable simultaneous peak flow (GPM). The curve splits flush-tank vs
// flush-valve; both ship as editable breakpoints (approximations of IPC 2021
// Appendix E Table E103.3(2) / NBS BMS65, tune to the published table).
const WSFU_FLUSH_TANK = [[10, 8], [50, 24], [100, 43], [150, 51], [240, 65]];
const WSFU_FLUSH_VALVE = [[10, 27], [50, 51], [100, 55], [150, 66], [240, 80]];

// dims: in { wsfu: dimensionless, system_type: dimensionless, curve: dimensionless } out: { gpm: L^3 T^-1, bracket_low_wsfu: dimensionless, bracket_high_wsfu: dimensionless }
// (Fixture units are dimensionless; the probable peak demand is a volumetric
//  flow L^3 T^-1 (GPM). The curve is a piecewise-linear table.)
export function computeWsfuDemand({ wsfu, system_type = "flush_tank", curve = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fu = Number(wsfu);
  if (!Number.isFinite(fu) || fu < 0) return { error: "WSFU must be a non-negative finite number." };
  const c = curve || (system_type === "flush_valve" ? WSFU_FLUSH_VALVE : WSFU_FLUSH_TANK);
  if (!Array.isArray(c) || c.length < 2) return { error: "Curve must have at least two breakpoints." };
  for (let i = 1; i < c.length; i++) {
    if (!(Number(c[i][0]) > Number(c[i - 1][0]))) return { error: "Curve breakpoints must be strictly increasing in WSFU." };
  }
  let i = 0;
  while (i < c.length - 2 && fu > c[i + 1][0]) i++;
  const x1 = c[i][0], y1 = c[i][1], x2 = c[i + 1][0], y2 = c[i + 1][1];
  const gpm = y1 + (fu - x1) * (y2 - y1) / (x2 - x1);
  const extrapolated = fu < c[0][0] || fu > c[c.length - 1][0];
  if (!Number.isFinite(gpm)) return { error: "Interpolation produced a non-finite result." };
  return {
    gpm,
    bracket_low_wsfu: x1,
    bracket_high_wsfu: x2,
    bracket_low_gpm: y1,
    bracket_high_gpm: y2,
    system_type: system_type === "flush_valve" ? "flush valve" : "flush tank",
    extrapolated,
    note: "WSFU come from the fixture schedule (IPC Table E103.3(2) assigns WSFU per fixture by supply type). Flush-valve systems peak higher at low WSFU - use that curve. The bundled curve is an editable approximation of Hunter's curve (NBS BMS65 / IPC Appendix E); tune it to the published table. This is the design demand that feeds pipe-sizing, water-meter-sizing, and supply-pressure-budget, not a metered actual.",
  };
}

export const wsfuDemandExample = {
  inputs: { wsfu: 120, system_type: "flush_valve" },
  expectedRange: { gpm: { min: 59.3, max: 59.5 } },
};

function renderWsfuDemand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hunter's curve (NBS BMS65, Methods of Estimating Loads in Plumbing Systems) and IPC 2021 Appendix E (Table E103.3(2)) by name; the demand curve ships as editable breakpoints, not a transcribed table.";
  const fu = makeNumber("Total water-supply fixture units (WSFU)", "wd-fu", { step: "any", min: "0" });
  const sys = makeSelect("System type", "wd-sys", [
    { value: "flush_tank", label: "Flush tank (gravity)", selected: true }, { value: "flush_valve", label: "Flush valve (flushometer)" },
  ]);
  for (const f of [fu, sys]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fu.input.value = "120"; sys.select.value = "flush_valve"; update(); });
  const oGpm = makeOutputLine(outputRegion, "Probable peak demand", "wd-out-gpm");
  const oBracket = makeOutputLine(outputRegion, "Curve bracket", "wd-out-bracket");
  const oCurve = makeOutputLine(outputRegion, "Curve", "wd-out-curve");
  const update = debounce(() => {
    const r = computeWsfuDemand({ wsfu: Number(fu.input.value) || 0, system_type: sys.select.value });
    if (r.error) { oGpm.textContent = r.error; oBracket.textContent = "-"; oCurve.textContent = "-"; return; }
    oGpm.textContent = fmt(r.gpm, 1) + " GPM" + (r.extrapolated ? " (extrapolated)" : "");
    oBracket.textContent = r.bracket_low_wsfu + " WSFU (" + r.bracket_low_gpm + " GPM) to " + r.bracket_high_wsfu + " WSFU (" + r.bracket_high_gpm + " GPM)";
    oCurve.textContent = r.system_type;
  }, DEBOUNCE_MS);
  for (const el of [fu.input, sys.select]) el.addEventListener("input", update);
}
PLUMBING_RENDERERS["wsfu-demand"] = renderWsfuDemand;

// --- supply-pressure-budget: Available Pressure at the Critical Fixture ---
//
// elevation_loss = fixture_height * 0.433 (psi per ft of water);
// available = street - elevation - meter - bfp - friction;
// headroom = available - fixture_min; adequate = headroom >= 0.
// dims: in { street_pressure: M L^-1 T^-2, fixture_height: L, meter_loss: M L^-1 T^-2, bfp_loss: M L^-1 T^-2, friction_loss: M L^-1 T^-2, fixture_min: M L^-1 T^-2 } out: { elevation_loss: M L^-1 T^-2, available: M L^-1 T^-2, headroom: M L^-1 T^-2, adequate: dimensionless }
// (Street, meter, backflow, friction, and the fixture minimum are pressures
//  M L^-1 T^-2 (psi); the 0.433 psi/ft constant converts the elevation length
//  L to a pressure.)
export function computeSupplyPressureBudget({ street_pressure, fixture_height = 0, meter_loss = 0, bfp_loss = 0, friction_loss = 0, fixture_min = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const street = Number(street_pressure) || 0;
  const height = Number(fixture_height) || 0;
  const meter = Number(meter_loss) || 0;
  const bfp = Number(bfp_loss) || 0;
  const friction = Number(friction_loss) || 0;
  const fixtureMin = Number(fixture_min);
  if (!(street > 0)) return { error: "Street pressure must be positive (psi)." };
  if (height < 0) return { error: "Fixture height cannot be negative (ft)." };
  if (!Number.isFinite(fixtureMin)) return { error: "Fixture minimum must be a finite number." };
  const elevationLoss = height * 0.433;
  const available = street - elevationLoss - meter - bfp - friction;
  const headroom = available - fixtureMin;
  return {
    elevation_loss: elevationLoss,
    available,
    headroom,
    adequate: headroom >= 0,
    verdict: headroom >= 0 ? "adequate" : "short",
    note: "Use the minimum recorded street pressure (a residual sized at peak-day low pressure protects the worst case). Flush-valve and tankless fixtures carry a higher minimum (15-25 psi) than a standard tank fixture (8 psi). IPC 604 caps static pressure at 80 psi, requiring a PRV above it (which adds its own downstream loss).",
  };
}

export const supplyPressureBudgetExample = {
  inputs: { street_pressure: 60, fixture_height: 30, meter_loss: 8, bfp_loss: 0, friction_loss: 12, fixture_min: 8 },
  expectedRange: { available: { min: 26.95, max: 27.05 }, headroom: { min: 18.95, max: 19.05 } },
};

function renderSupplyPressureBudget(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 2021 Section 604 and the ASPE Plumbing Engineering Design Handbook Vol. 2 by name. Elevation loss = 0.433 psi per foot of water column. Use the minimum recorded street pressure.";
  const street = makeNumber("Street pressure (psi, use the low)", "spb-street", { step: "any", min: "0" });
  const height = makeNumber("Critical fixture height above main (ft)", "spb-height", { step: "any", min: "0" });
  const meter = makeNumber("Meter loss (psi)", "spb-meter", { step: "any", min: "0" });
  const bfp = makeNumber("Backflow / softener / filter loss (psi)", "spb-bfp", { step: "any", min: "0", value: "0" });
  bfp.input.value = "0";
  const friction = makeNumber("Developed-length friction loss (psi)", "spb-friction", { step: "any", min: "0" });
  const fmin = makeNumber("Required fixture residual (psi)", "spb-fmin", { step: "any", value: "8" });
  fmin.input.value = "8";
  for (const f of [street, height, meter, bfp, friction, fmin]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { street.input.value = "60"; height.input.value = "30"; meter.input.value = "8"; bfp.input.value = "0"; friction.input.value = "12"; fmin.input.value = "8"; update(); });
  const oElev = makeOutputLine(outputRegion, "Elevation loss", "spb-out-elev");
  const oAvail = makeOutputLine(outputRegion, "Available at fixture", "spb-out-avail");
  const oHead = makeOutputLine(outputRegion, "Headroom above minimum", "spb-out-head");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "spb-out-verdict");
  const update = debounce(() => {
    const r = computeSupplyPressureBudget({
      street_pressure: Number(street.input.value) || 0,
      fixture_height: Number(height.input.value) || 0,
      meter_loss: Number(meter.input.value) || 0,
      bfp_loss: bfp.input.value === "" ? 0 : Number(bfp.input.value),
      friction_loss: Number(friction.input.value) || 0,
      fixture_min: fmin.input.value === "" ? 8 : Number(fmin.input.value),
    });
    if (r.error) { oElev.textContent = r.error; for (const o of [oAvail, oHead, oVerdict]) o.textContent = "-"; return; }
    oElev.textContent = fmt(r.elevation_loss, 1) + " psi";
    oAvail.textContent = fmt(r.available, 1) + " psi";
    oHead.textContent = fmt(r.headroom, 1) + " psi";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const el of [street.input, height.input, meter.input, bfp.input, friction.input, fmin.input]) el.addEventListener("input", update);
}
PLUMBING_RENDERERS["supply-pressure-budget"] = renderSupplyPressureBudget;

// =====================================================================
// spec-v112: water-heater-storage-sizing (Group B) - storage water-heater
// sizing by first-hour rating vs peak-hour demand. The number a plumber
// needs to pick a tank: usable storage plus one hour of recovery (the
// DOE/AHRI first-hour rating), checked against the peak-hour draw.
// =====================================================================

// dims: in { tank_gal: L^3, input_btuh: M L^2 T^-3, efficiency_pct: dimensionless, rise_F: T, usable_fraction: dimensionless, peak_hour_gal: L^3 } out: { recovery_gph: L^3 T^-1, fhr_gph: L^3 T^-1, short_by_gph: L^3 T^-1 }
export function computeWaterHeaterStorageSizing({ tank_gal = 0, input_btuh = 0, efficiency_pct = 80, rise_F = 90, usable_fraction = 0.70, peak_hour_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tank_gal > 0)) return { error: "Tank capacity must be positive (gal)." };
  if (!(input_btuh > 0)) return { error: "Input rate must be positive (BTU/hr)." };
  if (!(efficiency_pct > 0)) return { error: "Recovery efficiency must be positive (%)." };
  if (!(rise_F > 0)) return { error: "Temperature rise must be positive (set point above inlet, F)." };
  if (!(usable_fraction > 0)) return { error: "Usable-storage fraction must be positive." };
  const recovery_gph = (input_btuh * (efficiency_pct / 100)) / (8.33 * rise_F);
  const fhr_gph = tank_gal * usable_fraction + recovery_gph;
  let verdict, short_by_gph = 0;
  if (peak_hour_gal > 0) {
    if (fhr_gph >= peak_hour_gal) verdict = "adequate - the first-hour rating covers the peak-hour demand";
    else { short_by_gph = peak_hour_gal - fhr_gph; verdict = "short by " + fmt(short_by_gph, 1) + " gph - upsize the tank, the input, or add storage"; }
  } else {
    verdict = "enter a peak-hour demand for a pass/fail verdict";
  }
  return {
    recovery_gph, fhr_gph, short_by_gph, verdict,
    note: "The first-hour rating (FHR) is the usable storage plus one hour of recovery: FHR = tank x usable-fraction + recovery, with recovery = input x efficiency / (8.33 x rise). Match it to the household peak-hour draw, not to the tank gallons alone. The manufacturer's rated FHR (the DOE/AHRI test value on the yellow EnergyGuide label) governs the final selection; this is a sizing check, not the rating.",
  };
}
export const waterHeaterStorageSizingExample = { inputs: { tank_gal: 50, input_btuh: 40000, efficiency_pct: 80, rise_F: 90, usable_fraction: 0.70, peak_hour_gal: 80 } };

function renderWaterHeaterStorageSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles recovery Q = 8.33 x gph x delta-T with the DOE/AHRI first-hour-rating definition (usable storage plus one hour of recovery), by name, not reproduced. The 8.33 lb/gal water constant and the default 0.70 usable-storage fraction are editable. The manufacturer's rated FHR on the EnergyGuide label and the AHJ govern.";
  const tank = makeNumber("Tank capacity (gal)", "whss-tank", { step: "any", min: "0", value: "50" });
  const input = makeNumber("Input rate (BTU/hr)", "whss-in", { step: "any", min: "0", value: "40000" });
  const eff = makeNumber("Recovery efficiency (%)", "whss-eff", { step: "any", min: "0", value: "80" });
  const rise = makeNumber("Temperature rise (F)", "whss-rise", { step: "any", min: "0", value: "90" });
  const usable = makeNumber("Usable-storage fraction", "whss-usable", { step: "any", min: "0", value: "0.70" });
  const peak = makeNumber("Peak-hour demand (gal)", "whss-peak", { step: "any", min: "0", value: "80" });
  tank.input.value = "50"; input.input.value = "40000"; eff.input.value = "80"; rise.input.value = "90"; usable.input.value = "0.70"; peak.input.value = "80";
  for (const f of [tank, input, eff, rise, usable, peak]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    tank.input.value = "50"; input.input.value = "40000"; eff.input.value = "80"; rise.input.value = "90"; usable.input.value = "0.70"; peak.input.value = "80"; update();
  });
  const oRec = makeOutputLine(outputRegion, "Recovery", "whss-out-rec");
  const oFhr = makeOutputLine(outputRegion, "First-hour rating", "whss-out-fhr");
  const oVer = makeOutputLine(outputRegion, "Verdict", "whss-out-ver");
  const oN = makeOutputLine(outputRegion, "Note", "whss-out-n");
  const update = debounce(() => {
    const r = computeWaterHeaterStorageSizing({
      tank_gal: Number(tank.input.value) || 0, input_btuh: Number(input.input.value) || 0,
      efficiency_pct: Number(eff.input.value) || 0, rise_F: Number(rise.input.value) || 0,
      usable_fraction: Number(usable.input.value) || 0, peak_hour_gal: Number(peak.input.value) || 0,
    });
    if (r.error) { oRec.textContent = r.error; oFhr.textContent = "-"; oVer.textContent = "-"; oN.textContent = "-"; return; }
    oRec.textContent = fmt(r.recovery_gph, 1) + " gph";
    oFhr.textContent = fmt(r.fhr_gph, 1) + " gph";
    oVer.textContent = r.verdict;
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [tank.input, input.input, eff.input, rise.input, usable.input, peak.input]) el.addEventListener("input", update);
}
PLUMBING_RENDERERS["water-heater-storage-sizing"] = renderWaterHeaterStorageSizing;

// --- spec-v163 Drainage Invert Elevation, Drop, and Cover ---
// Carries a gravity run from its slope to the field elevations: total fall over
// the run, the downstream invert-out, the top-of-pipe, and the resulting cover
// against the governing minimum. Slope minimums per IPC 2021 Section 704; the
// minimum cover, frost depth, and live-load bury are set by the adopted code and
// the engineer/survey of record (the minimum-cover compared against is supplied
// by the user). A non-finite input, a non-positive run, or a negative slope
// returns { error }; a negative cover (pipe above grade) is a flag, not an error.

// dims: in { invert_in_ft: L, slope: dimensionless, slope_units: dimensionless, run_ft: L, pipe_od_in: L, surface_out_ft: L, min_cover_ft: L } out: { slope_ftft: dimensionless, total_fall_ft: L, invert_out_ft: L, top_of_pipe_ft: L, cover_out_ft: L, cover_flag: dimensionless }
export function computeDrainageInvert({ invert_in_ft = 0, slope = 0, slope_units = "in_per_ft", run_ft = 0, pipe_od_in = 0, surface_out_ft = null, min_cover_ft = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(run_ft > 0)) return { error: "Run length must be positive." };
  if (!(slope >= 0)) return { error: "Slope must be non-negative." };
  const slope_ftft = slope_units === "percent" ? slope / 100 : slope / 12;
  const total_fall_ft = slope_ftft * run_ft;
  const invert_out_ft = invert_in_ft - total_fall_ft;
  const top_of_pipe_ft = invert_out_ft + pipe_od_in / 12;
  let cover_out_ft = null;
  let cover_flag = false;
  if (Number.isFinite(surface_out_ft)) {
    cover_out_ft = surface_out_ft - top_of_pipe_ft;
    // Under-cover when below the supplied minimum; with no minimum given, a
    // negative cover (pipe crown above grade) is itself the flag.
    cover_flag = Number.isFinite(min_cover_ft) ? cover_out_ft < min_cover_ft : cover_out_ft < 0;
  }
  return { slope_ftft, total_fall_ft, invert_out_ft, top_of_pipe_ft, cover_out_ft, cover_flag };
}

export const drainageInvertExample = {
  inputs: { invert_in_ft: 100, slope: 0.25, slope_units: "in_per_ft", run_ft: 80, pipe_od_in: 4.5, surface_out_ft: 102, min_cover_ft: 2 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderDrainageInvert(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: invert-out = invert-in - slope x run; cover = surface - (invert-out + OD). Slope minimums per IPC 2021 Section 704; minimum cover, frost depth, and live-load bury are set by the adopted code and the engineer/survey of record.";
  const invIn = makeNumber("Invert-in elevation (ft)", "di-in", { step: "any" });
  const slope = makeNumber("Slope", "di-s", { step: "any", min: "0" });
  const units = makeSelect("Slope units", "di-u", [{ value: "in_per_ft", label: "in/ft" }, { value: "percent", label: "%" }]);
  const run = makeNumber("Run length (ft)", "di-r", { step: "any", min: "0" });
  const od = makeNumber("Pipe OD (in)", "di-od", { step: "any", min: "0" });
  const surf = makeNumber("Downstream surface elevation (ft, optional)", "di-surf", { step: "any" });
  const minCov = makeNumber("Minimum cover (ft, optional)", "di-mc", { step: "any", min: "0" });
  for (const f of [invIn, slope, units, run, od, surf, minCov]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    invIn.input.value = "100"; slope.input.value = "0.25"; units.select.value = "in_per_ft";
    run.input.value = "80"; od.input.value = "4.5"; surf.input.value = "102"; minCov.input.value = "2"; update();
  });
  const oFall = makeOutputLine(outputRegion, "Total fall", "di-out-fall");
  const oInv = makeOutputLine(outputRegion, "Invert-out", "di-out-inv");
  const oTop = makeOutputLine(outputRegion, "Top of pipe", "di-out-top");
  const oCov = makeOutputLine(outputRegion, "Cover", "di-out-cov");
  const update = debounce(() => {
    const r = computeDrainageInvert({
      invert_in_ft: Number(invIn.input.value) || 0,
      slope: Number(slope.input.value) || 0,
      slope_units: units.select.value,
      run_ft: Number(run.input.value) || 0,
      pipe_od_in: Number(od.input.value) || 0,
      surface_out_ft: surf.input.value === "" ? null : Number(surf.input.value),
      min_cover_ft: minCov.input.value === "" ? null : Number(minCov.input.value),
    });
    if (r.error) { oFall.textContent = r.error; oInv.textContent = "-"; oTop.textContent = "-"; oCov.textContent = "-"; return; }
    oFall.textContent = fmt(r.total_fall_ft, 2) + " ft";
    oInv.textContent = fmt(r.invert_out_ft, 2) + " ft";
    oTop.textContent = fmt(r.top_of_pipe_ft, 2) + " ft";
    oCov.textContent = r.cover_out_ft === null
      ? "- (enter surface elevation)"
      : fmt(r.cover_out_ft, 2) + " ft" + (r.cover_flag ? " - UNDER minimum cover" : "");
  }, DEBOUNCE_MS);
  for (const el of [invIn.input, slope.input, units.select, run.input, od.input, surf.input, minCov.input]) el.addEventListener("input", update);
}
PLUMBING_RENDERERS["drainage-invert"] = renderDrainageInvert;

// ---------------------------------------------------------------------
// v199 Hydronic radiant floor loop sizing (radiant-loop-sizing)
// ---------------------------------------------------------------------
// Tube footage from the area and on-center spacing, the loop count against
// the per-loop length limit (so no loop exceeds the head the manifold can
// push), and the design flow per loop from the room load: a four-line calc
// on every radiant job, between the boiler and the expansion tank.
// dims: in { floor_area_ft2: L^2, spacing_in: L, load_btuhr: M L^2 T^-3, max_loop_ft: L, design_dt: T } out: { tube_ft: L, loops: dimensionless, per_loop_ft: L, total_gpm: L^3 T^-1, per_loop_gpm: L^3 T^-1 }
export function computeRadiantLoopSizing({ floor_area_ft2 = 0, spacing_in = 0, load_btuhr = 0, max_loop_ft = 300, design_dt = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(floor_area_ft2);
  const spacing = Number(spacing_in);
  const load = Number(load_btuhr);
  const maxLoop = Number(max_loop_ft);
  const dt = Number(design_dt);
  if (!(area > 0)) return { error: "Floor area must be positive (ft^2)." };
  if (!(spacing > 0)) return { error: "Tube spacing must be positive (in)." };
  if (!(load > 0)) return { error: "Design heat load must be positive (Btu/hr)." };
  if (!(maxLoop > 0)) return { error: "Maximum loop length must be positive (ft)." };
  if (!(dt > 0)) return { error: "Design delta-T must be positive (F)." };
  const tube_ft = (area * 12) / spacing;
  const loops = Math.ceil(tube_ft / maxLoop);
  const per_loop_ft = tube_ft / loops;
  const total_gpm = load / (500 * dt);
  const per_loop_gpm = total_gpm / loops;
  return { tube_ft, loops, per_loop_ft, total_gpm, per_loop_gpm };
}
export const radiantLoopSizingExample = { inputs: { floor_area_ft2: 300, spacing_in: 6, load_btuhr: 9000, max_loop_ft: 300, design_dt: 20 } };

function renderRadiantLoopSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Radiant floor loop sizing - tube footage = area x 12 / spacing; loops = ceil(footage / max loop length); flow GPM = Q / (500 x delta-T), split across the loops - first-principles, with the radiant-panel practice per ASHRAE HVAC Systems and Equipment (radiant panel chapter) and the Radiant Panel Association, by name. The manufacturer's tubing tables and the room-by-room heat loss govern the final layout; this sizes footage, loops, and flow from a uniform load, not the panel surface-temperature or downward-loss design.";
  const area = makeNumber("Heated floor area (ft^2)", "rl-area", { step: "any", min: "0" });
  const spacing = makeNumber("Tube on-center spacing (in)", "rl-sp", { step: "any", min: "0", value: "9" });
  const load = makeNumber("Design heat load (Btu/hr)", "rl-load", { step: "any", min: "0" });
  const maxLoop = makeNumber("Max loop length (ft)", "rl-ml", { step: "any", min: "0", value: "300" });
  maxLoop.input.value = "300";
  const dt = makeNumber("Supply-to-return delta-T (F)", "rl-dt", { step: "any", min: "0", value: "20" });
  dt.input.value = "20";
  for (const f of [area, spacing, load, maxLoop, dt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "300"; spacing.input.value = "6"; load.input.value = "9000"; maxLoop.input.value = "300"; dt.input.value = "20"; update(); });
  const oTube = makeOutputLine(outputRegion, "Total tube footage", "rl-out-tube");
  const oLoops = makeOutputLine(outputRegion, "Loops / length each", "rl-out-loops");
  const oFlow = makeOutputLine(outputRegion, "Total flow / per loop", "rl-out-flow");
  const update = debounce(() => {
    const r = computeRadiantLoopSizing({ floor_area_ft2: Number(area.input.value) || 0, spacing_in: Number(spacing.input.value) || 0, load_btuhr: Number(load.input.value) || 0, max_loop_ft: Number(maxLoop.input.value) || 0, design_dt: Number(dt.input.value) || 0 });
    if (r.error) { oTube.textContent = r.error; oLoops.textContent = "-"; oFlow.textContent = "-"; return; }
    oTube.textContent = fmt(r.tube_ft, 0) + " ft";
    oLoops.textContent = fmt(r.loops, 0) + " loop(s), " + fmt(r.per_loop_ft, 0) + " ft each";
    oFlow.textContent = fmt(r.total_gpm, 2) + " GPM total, " + fmt(r.per_loop_gpm, 2) + " GPM per loop";
  }, DEBOUNCE_MS);
  for (const f of [area.input, spacing.input, load.input, maxLoop.input, dt.input]) f.addEventListener("input", update);
}
PLUMBING_RENDERERS["radiant-loop-sizing"] = renderRadiantLoopSizing;

// --- spec-v62 roof-drain-sizing / sump-basin-sizing -> relocated to calc-drainage.js (spec-v73 split) ---

// --- spec-v63 gas-appliance-demand / tpr-discharge + spec-v64 pipe-support-spacing / softener-sizing -> relocated to calc-service.js (spec-v78 split) ---

// --- spec-v83 onsite-septic pressure-distribution bench (septic-dose-tank, septic-pumpout-interval, septic-lpp-orifice) -> relocated to calc-septic.js (spec-v86 split) ---

// ===================== spec-v302..v304: site-hydraulics depth batch =====================
// The pieces the rational-method and open-channel tiles need but do not
// compute: the watershed time of concentration (Kirpich) that sets the design
// storm duration, the orifice discharge of a detention outlet, and the
// open-channel flow regime by Froude number.

// dims: in { l_ft: L, s_slope: dimensionless } out: { tc_min: T, tc_hr: T }
export function computeTimeOfConcentration({ l_ft = 0, s_slope = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(l_ft > 0)) return { error: "Flow-path length must be positive (ft)." };
  if (!(s_slope > 0)) return { error: "Slope must be positive (ft/ft)." };
  const tc_min = 0.0078 * Math.pow(l_ft, 0.77) * Math.pow(s_slope, -0.385);
  const tc_hr = tc_min / 60;
  return {
    tc_min, tc_hr,
    note: "Kirpich (1940) time of concentration tc = 0.0078 L^0.77 S^(-0.385) (tc minutes, L feet, S ft/ft), as compiled in the TR-55 and NRCS drainage references - the time for runoff to travel from the hydraulically most distant point to the outlet, which sets the design storm duration read off the local IDF curve. Kirpich was calibrated on small rural channelized watersheds; overland/sheet flow on a paved surface is often taken at about 0.4x the Kirpich value. A single-segment estimate, not the TR-55 three-segment (sheet + shallow concentrated + channel) travel-time sum, and not a routed hydrograph. A design aid; the engineer of record and the local drainage manual govern.",
  };
}
export const timeOfConcentrationExample = { inputs: { l_ft: 1000, s_slope: 0.02 } };

function _v302renderTimeOfConcentration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Kirpich (1940) time of concentration tc = 0.0078 L^0.77 S^(-0.385) (tc min, L ft, S ft/ft), as compiled in TR-55 / NRCS, by name. Single-segment estimate for the design storm duration; the paved/overland factor and the TR-55 three-segment sum are separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { l.input.value = "1000"; s.input.value = "0.02"; update(); });
  const l = makeNumber("Flow-path length L (ft)", "toc-l", { step: "any", min: "0" });
  const s = makeNumber("Average slope S (ft/ft)", "toc-s", { step: "any", min: "0" });
  for (const f of [l, s]) inputRegion.appendChild(f.wrap);
  const oTc = makeOutputLine(outputRegion, "Time of concentration", "toc-out-tc");
  const oNote = makeOutputLine(outputRegion, "Note", "toc-out-n");
  const update = debounce(() => {
    const r = computeTimeOfConcentration({ l_ft: Number(l.input.value) || 0, s_slope: Number(s.input.value) || 0 });
    if (r.error) { oTc.textContent = r.error; oNote.textContent = "-"; return; }
    oTc.textContent = fmt(r.tc_min, 1) + " min (" + fmt(r.tc_hr, 3) + " hr)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [l, s]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["time-of-concentration"] = _v302renderTimeOfConcentration;

// dims: in { d_in: L, h_ft: L, cd: dimensionless } out: { a_ft2: L^2, q_cfs: L^3 T^-1, q_gpm: L^3 T^-1 }
export function computeOrificeFlow({ d_in = 0, h_ft = 0, cd = 0.60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Orifice diameter must be positive (in)." };
  if (!(h_ft > 0)) return { error: "Head must be positive (ft)." };
  if (!(cd > 0)) return { error: "The discharge coefficient must be positive (~0.6 sharp-edged)." };
  const a_ft2 = (Math.PI / 4) * Math.pow(d_in / 12, 2);
  const q_cfs = cd * a_ft2 * Math.sqrt(2 * 32.2 * h_ft);
  const q_gpm = q_cfs * 448.831;
  return {
    a_ft2, q_cfs, q_gpm,
    note: "Orifice discharge Q = Cd A sqrt(2 g h) with g = 32.2 ft/s^2, Cd about 0.6 for a sharp-edged orifice (~0.8 short tube, ~0.98 rounded), and the head measured to the orifice centroid. The flow scales with the square root of the head, which makes an orifice a gentle stage-discharge control for a detention outlet. Free/submerged discharge under a steady head for a small orifice (uniform velocity across it) - it does not integrate the falling head of a draining tank (the time-to-drain is a follow-on) or a partially submerged/gated outlet. A design aid; the engineer of record governs.",
  };
}
export const orificeFlowExample = { inputs: { d_in: 6, h_ft: 4, cd: 0.60 } };

function _v303renderOrificeFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: orifice discharge Q = Cd A sqrt(2 g h), g = 32.2 ft/s^2, Cd ~ 0.6 sharp-edged, head to the centroid, by name. Small orifice, steady head; the falling-head time-to-drain is separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { d.input.value = "6"; h.input.value = "4"; cd.input.value = "0.60"; update(); });
  const d = makeNumber("Orifice diameter (in)", "orf-d", { step: "any", min: "0" });
  const h = makeNumber("Head to orifice center (ft)", "orf-h", { step: "any", min: "0" });
  const cd = makeNumber("Discharge coefficient Cd", "orf-cd", { step: "any", min: "0" });
  cd.input.value = "0.60";
  for (const f of [d, h, cd]) inputRegion.appendChild(f.wrap);
  const oA = makeOutputLine(outputRegion, "Orifice area", "orf-out-a");
  const oQ = makeOutputLine(outputRegion, "Discharge", "orf-out-q");
  const oNote = makeOutputLine(outputRegion, "Note", "orf-out-n");
  const update = debounce(() => {
    const r = computeOrificeFlow({ d_in: Number(d.input.value) || 0, h_ft: Number(h.input.value) || 0, cd: Number(cd.input.value) || 0 });
    if (r.error) { oA.textContent = r.error; oQ.textContent = "-"; oNote.textContent = "-"; return; }
    oA.textContent = fmt(r.a_ft2, 3) + " ft^2";
    oQ.textContent = fmt(r.q_cfs, 2) + " cfs (" + fmt(r.q_gpm, 0) + " gpm)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, h, cd]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["orifice-flow"] = _v303renderOrificeFlow;

// dims: in { q_cfs: L^3 T^-1, h_ft: L, cd: dimensionless } out: { a_ft2: L^2, d_in: L }
export function computeOrificeDiameterForFlow({ q_cfs = 0, h_ft = 0, cd = 0.60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(q_cfs > 0)) return { error: "Target discharge must be positive (cfs)." };
  if (!(h_ft > 0)) return { error: "Head must be positive (ft)." };
  if (!(cd > 0)) return { error: "The discharge coefficient must be positive (~0.6 sharp-edged)." };
  const a_ft2 = q_cfs / (cd * Math.sqrt(2 * 32.2 * h_ft));
  const d_in = 12 * Math.sqrt(4 * a_ft2 / Math.PI);
  return {
    a_ft2, d_in,
    note: "Inverse orifice sizing: the diameter that passes a target discharge under a steady head, from Q = Cd A sqrt(2 g h) solved for A = Q / (Cd sqrt(2 g h)) and d = sqrt(4 A / pi), with g = 32.2 ft/s^2, Cd about 0.6 for a sharp-edged orifice (~0.8 short tube, ~0.98 rounded), and the head measured to the orifice centroid. This sizes a detention-outlet or restrictor plate to hold a release to a target rate; because the flow scales with the square root of the head, the required area scales as 1/sqrt(h), so a 4x head shrinks the diameter to 0.71x. Free/submerged discharge under a steady head for a small orifice - it does not integrate the falling head of a draining tank (the time-to-drain is separate). A design aid; the engineer of record governs.",
  };
}
export const orificeDiameterForFlowExample = { inputs: { q_cfs: 1.5, h_ft: 4, cd: 0.60 } };

function _v639renderOrificeDiameterForFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: inverse orifice sizing A = Q / (Cd sqrt(2 g h)), d = sqrt(4 A / pi), g = 32.2 ft/s^2, Cd ~ 0.6 sharp-edged, head to the centroid, by name. Small orifice, steady head; the falling-head time-to-drain is separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { q.input.value = "1.5"; h.input.value = "4"; cd.input.value = "0.60"; update(); });
  const q = makeNumber("Target discharge (cfs)", "ord-q", { step: "any", min: "0" });
  const h = makeNumber("Head to orifice center (ft)", "ord-h", { step: "any", min: "0" });
  const cd = makeNumber("Discharge coefficient Cd", "ord-cd", { step: "any", min: "0" });
  cd.input.value = "0.60";
  for (const f of [q, h, cd]) inputRegion.appendChild(f.wrap);
  const oD = makeOutputLine(outputRegion, "Required orifice diameter", "ord-out-d");
  const oA = makeOutputLine(outputRegion, "Orifice area", "ord-out-a");
  const oNote = makeOutputLine(outputRegion, "Note", "ord-out-n");
  const update = debounce(() => {
    const r = computeOrificeDiameterForFlow({ q_cfs: Number(q.input.value) || 0, h_ft: Number(h.input.value) || 0, cd: Number(cd.input.value) || 0 });
    if (r.error) { oD.textContent = r.error; oA.textContent = "-"; oNote.textContent = "-"; return; }
    oD.textContent = fmt(r.d_in, 2) + " in";
    oA.textContent = fmt(r.a_ft2, 3) + " ft^2";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q, h, cd]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["orifice-diameter-for-flow"] = _v639renderOrificeDiameterForFlow;

// dims: in { tank_area_ft2: L^2, d_in: L, cd: dimensionless, h1_ft: L, h2_ft: L } out: { a_o_ft2: L^2, t_s: T, t_min: T }
export function computeTankDrainTime({ tank_area_ft2 = 0, d_in = 0, cd = 0.60, h1_ft = 0, h2_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tank_area_ft2 > 0)) return { error: "Tank cross-section area must be positive (ft^2)." };
  if (!(d_in > 0)) return { error: "Orifice diameter must be positive (in)." };
  if (!(cd > 0)) return { error: "The discharge coefficient must be positive (~0.6 sharp-edged)." };
  if (h2_ft < 0) return { error: "Ending head cannot be negative (ft)." };
  if (!(h1_ft > h2_ft)) return { error: "Starting head must be greater than the ending head (ft)." };
  const a_o_ft2 = (Math.PI / 4) * Math.pow(d_in / 12, 2);
  const t_s = 2 * tank_area_ft2 * (Math.sqrt(h1_ft) - Math.sqrt(h2_ft)) / (cd * a_o_ft2 * Math.sqrt(2 * 32.2));
  const t_min = t_s / 60;
  return {
    a_o_ft2, t_s, t_min,
    note: "Falling-head (Torricelli) drain time t = 2 A_t (sqrt(h1) - sqrt(h2)) / (Cd A_o sqrt(2 g)), g = 32.2 ft/s^2, integrating the orifice discharge Q = Cd A_o sqrt(2 g h) over the falling head of a constant-cross-section (prismatic) tank, with the head measured above the orifice. The flow slows as sqrt(h), so the last of the water drains slowest - draining to a residual h2 above the outlet takes far less than draining fully. Free discharge to atmosphere, small orifice, a steady discharge coefficient (~0.6 sharp-edged), a prismatic tank (constant area with depth). A design aid; the engineer of record governs.",
  };
}
export const tankDrainTimeExample = { inputs: { tank_area_ft2: 100, d_in: 6, cd: 0.60, h1_ft: 9, h2_ft: 0 } };

function _v630renderTankDrainTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: falling-head (Torricelli) drain time t = 2 A_t (sqrt(h1) - sqrt(h2)) / (Cd A_o sqrt(2 g)), g = 32.2 ft/s^2, Cd ~ 0.6 sharp-edged, prismatic tank, head above the orifice, by name. Integrates the orifice equation over the falling head; the flow slows as sqrt(h). A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { at.input.value = "100"; d.input.value = "6"; cd.input.value = "0.60"; h1.input.value = "9"; h2.input.value = "0"; update(); });
  const at = makeNumber("Tank cross-section area (ft^2)", "tdt-at", { step: "any", min: "0" });
  const d = makeNumber("Orifice diameter (in)", "tdt-d", { step: "any", min: "0" });
  const cd = makeNumber("Discharge coefficient Cd", "tdt-cd", { step: "any", min: "0" });
  cd.input.value = "0.60";
  const h1 = makeNumber("Starting head above orifice (ft)", "tdt-h1", { step: "any", min: "0" });
  const h2 = makeNumber("Ending head above orifice (ft, 0 = empty)", "tdt-h2", { step: "any", min: "0" });
  h2.input.value = "0";
  for (const f of [at, d, cd, h1, h2]) inputRegion.appendChild(f.wrap);
  const oT = makeOutputLine(outputRegion, "Drain time", "tdt-out-t");
  const oA = makeOutputLine(outputRegion, "Orifice area", "tdt-out-a");
  const oNote = makeOutputLine(outputRegion, "Note", "tdt-out-n");
  const update = debounce(() => {
    const r = computeTankDrainTime({ tank_area_ft2: Number(at.input.value) || 0, d_in: Number(d.input.value) || 0, cd: Number(cd.input.value) || 0, h1_ft: Number(h1.input.value) || 0, h2_ft: Number(h2.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oA.textContent = "-"; oNote.textContent = "-"; return; }
    oT.textContent = fmt(r.t_s, 0) + " s (" + fmt(r.t_min, 1) + " min)";
    oA.textContent = fmt(r.a_o_ft2, 3) + " ft^2";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [at, d, cd, h1, h2]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["tank-drain-time"] = _v630renderTankDrainTime;

// dims: in { b_ft: L, q_cfs: L^3 T^-1, y_ft: L } out: { v_fps: L T^-1, fr: dimensionless, q_unit: L^2 T^-1, yc_ft: L }
export function computeChannelFroudeNumber({ b_ft = 0, q_cfs = 0, y_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_ft > 0)) return { error: "Channel width must be positive (ft)." };
  if (!(q_cfs > 0)) return { error: "Discharge must be positive (cfs)." };
  if (!(y_ft > 0)) return { error: "Flow depth must be positive (ft)." };
  const v_fps = q_cfs / (b_ft * y_ft);
  const fr = v_fps / Math.sqrt(32.2 * y_ft);
  const regime = fr < 0.995 ? "subcritical (tranquil, downstream-controlled)" : (fr > 1.005 ? "supercritical (rapid, upstream-controlled)" : "critical (Fr = 1)");
  const q_unit = q_cfs / b_ft;
  const yc_ft = Math.cbrt((q_unit * q_unit) / 32.2);
  const yc_consistent = (y_ft > yc_ft && fr < 1) || (y_ft < yc_ft && fr > 1) || Math.abs(fr - 1) < 0.01;
  return {
    v_fps, fr, regime, q_unit, yc_ft, yc_consistent,
    note: "Open-channel Froude number Fr = V/sqrt(g D) (g = 32.2 ft/s^2, D = A/T the hydraulic depth, equal to y for a rectangular section) classifies the regime: Fr < 1 subcritical (tranquil, downstream-controlled), Fr = 1 critical, Fr > 1 supercritical (rapid, upstream-controlled); the rectangular critical depth is yc = (q^2/g)^(1/3) with q = Q/b, and the flow is subcritical when y > yc. Prismatic rectangular channel with D = y - it does not compute the normal depth (that is Manning), the hydraulic-jump conjugate depth, or a trapezoidal/irregular section's critical depth. A design aid; the engineer of record governs.",
  };
}
export const channelFroudeNumberExample = { inputs: { b_ft: 4, q_cfs: 50, y_ft: 2 } };

function _v304renderChannelFroudeNumber(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: open-channel Froude number Fr = V/sqrt(g D) (g = 32.2, D = y rectangular), the subcritical/critical/supercritical regimes, and the rectangular critical depth yc = (q^2/g)^(1/3), as compiled in Chow, by name. Rectangular section; normal depth and hydraulic jump are separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { b.input.value = "4"; q.input.value = "50"; y.input.value = "2"; update(); });
  const b = makeNumber("Channel width b (ft)", "cfn-b", { step: "any", min: "0" });
  const q = makeNumber("Discharge Q (cfs)", "cfn-q", { step: "any", min: "0" });
  const y = makeNumber("Flow depth y (ft)", "cfn-y", { step: "any", min: "0" });
  for (const f of [b, q, y]) inputRegion.appendChild(f.wrap);
  const oV = makeOutputLine(outputRegion, "Mean velocity", "cfn-out-v");
  const oFr = makeOutputLine(outputRegion, "Froude number / regime", "cfn-out-fr");
  const oYc = makeOutputLine(outputRegion, "Critical depth yc", "cfn-out-yc");
  const oNote = makeOutputLine(outputRegion, "Note", "cfn-out-n");
  const update = debounce(() => {
    const r = computeChannelFroudeNumber({ b_ft: Number(b.input.value) || 0, q_cfs: Number(q.input.value) || 0, y_ft: Number(y.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oFr.textContent = "-"; oYc.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = fmt(r.v_fps, 2) + " ft/s";
    oFr.textContent = fmt(r.fr, 2) + " - " + r.regime;
    oYc.textContent = fmt(r.yc_ft, 2) + " ft (flow depth is " + (r.yc_consistent ? "consistent with the regime" : "inconsistent - check inputs") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [b, q, y]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["channel-froude-number"] = _v304renderChannelFroudeNumber;

// dims: in { b_ft: L, q_cfs: L^3 T^-1, n: dimensionless, s_slope: dimensionless } out: { yn_ft: L, a_ft2: L^2, v_fps: L T^-1, fr: dimensionless, yc_ft: L }
export function computeChannelNormalDepth({ b_ft = 0, q_cfs = 0, n = 0, s_slope = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_ft > 0)) return { error: "Channel width must be positive (ft)." };
  if (!(q_cfs > 0)) return { error: "Discharge must be positive (cfs)." };
  if (!(n > 0)) return { error: "Manning roughness n must be positive (~0.013 concrete, ~0.022 earth)." };
  if (!(s_slope > 0)) return { error: "Channel slope must be positive (ft/ft)." };
  const qOf = (y) => {
    const A = b_ft * y;
    const R = A / (b_ft + 2 * y);
    return (1.486 / n) * A * Math.pow(R, 2 / 3) * Math.sqrt(s_slope);
  };
  let lo = 0, hi = 1;
  while (qOf(hi) < q_cfs) { hi *= 2; if (hi > 1e7) return { error: "No normal depth converged; check the inputs." }; }
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (qOf(mid) < q_cfs) lo = mid; else hi = mid; }
  const yn_ft = (lo + hi) / 2;
  const a_ft2 = b_ft * yn_ft;
  const v_fps = q_cfs / a_ft2;
  const fr = v_fps / Math.sqrt(32.2 * yn_ft);
  const regime = fr < 0.995 ? "subcritical (mild slope, tranquil)" : (fr > 1.005 ? "supercritical (steep slope, rapid)" : "critical (Fr = 1)");
  const yc_ft = Math.cbrt(Math.pow(q_cfs / b_ft, 2) / 32.2);
  return {
    yn_ft, a_ft2, v_fps, fr, regime, yc_ft,
    note: "Rectangular-channel normal (uniform-flow) depth: the depth yn at which Manning's Q = (1.486/n) A R^(2/3) sqrt(S) is satisfied for a rectangular section (A = b yn, R = A/(b + 2 yn)), solved by bisection. This is the Manning normal depth the Froude tile leaves out; comparing it to the critical depth yc = (q^2/g)^(1/3) gives the slope class - yn > yc is a mild slope (subcritical normal flow), yn < yc is steep (supercritical). The velocity and Froude number are reported at the normal depth. Steady uniform flow in a prismatic rectangular channel with Manning roughness n; it does not compute a trapezoidal or irregular section, a gradually-varied (backwater) profile, or the partial-flow depth of a closed conduit. A design aid; the engineer of record governs.",
  };
}
export const channelNormalDepthExample = { inputs: { b_ft: 10, q_cfs: 200, n: 0.015, s_slope: 0.001 } };

function _v641renderChannelNormalDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning normal depth from Q = (1.486/n) A R^(2/3) S^(1/2) for a rectangular section (A = b y, R = A/(b + 2y)), solved by bisection, with the slope class from yc = (q^2/g)^(1/3), as compiled in Chow, by name. Prismatic rectangular channel, uniform flow; trapezoidal sections and backwater profiles are separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { b.input.value = "10"; q.input.value = "200"; nn.input.value = "0.015"; s.input.value = "0.001"; update(); });
  const b = makeNumber("Channel width b (ft)", "cnd-b", { step: "any", min: "0" });
  const q = makeNumber("Discharge Q (cfs)", "cnd-q", { step: "any", min: "0" });
  const nn = makeNumber("Manning roughness n", "cnd-n", { step: "any", min: "0" });
  const s = makeNumber("Channel slope S (ft/ft)", "cnd-s", { step: "any", min: "0" });
  for (const f of [b, q, nn, s]) inputRegion.appendChild(f.wrap);
  const oYn = makeOutputLine(outputRegion, "Normal depth yn", "cnd-out-yn");
  const oV = makeOutputLine(outputRegion, "Velocity / Froude at yn", "cnd-out-v");
  const oYc = makeOutputLine(outputRegion, "Critical depth yc / slope class", "cnd-out-yc");
  const oNote = makeOutputLine(outputRegion, "Note", "cnd-out-n");
  const update = debounce(() => {
    const r = computeChannelNormalDepth({ b_ft: Number(b.input.value) || 0, q_cfs: Number(q.input.value) || 0, n: Number(nn.input.value) || 0, s_slope: Number(s.input.value) || 0 });
    if (r.error) { oYn.textContent = r.error; oV.textContent = "-"; oYc.textContent = "-"; oNote.textContent = "-"; return; }
    oYn.textContent = fmt(r.yn_ft, 3) + " ft";
    oV.textContent = fmt(r.v_fps, 2) + " ft/s - Fr " + fmt(r.fr, 2) + " " + r.regime;
    oYc.textContent = fmt(r.yc_ft, 3) + " ft (" + (r.yn_ft > r.yc_ft ? "yn > yc: mild slope" : "yn < yc: steep slope") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [b, q, nn, s]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["channel-normal-depth"] = _v641renderChannelNormalDepth;

// spec-v1011: circular-pipe partial-flow depth. The two turning points below are
// DERIVED, not tabulated. With A = (D^2/8)(th - sin th) and P = D th/2:
//   max discharge (maximize A R^(2/3) = A^(5/3) P^(-2/3)): 5 A' P = 2 A P'
//     -> 3 th - 5 th cos th + 2 sin th = 0  -> th = 5.27811, d/D = 0.9382
//   max velocity (maximize R = A/P):        A' P = A P'  -> tan th = th
//     -> th = 4.49341, d/D = 0.8128
// Discharge is NOT monotonic in depth, so the solver must bisect only on the
// rising branch (0, THETA_MAX_Q]; the smaller root is the physical normal depth.
function _v1011root(f, a, b) {
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; }
  return (a + b) / 2;
}
const THETA_MAX_Q = _v1011root((t) => 3 * t - 5 * t * Math.cos(t) + 2 * Math.sin(t), 4.0, 6.0);
const THETA_MAX_V = _v1011root((t) => Math.tan(t) - t, Math.PI + 1e-9, 3 * Math.PI / 2 - 1e-9);

// dims: in { d_in: L, slope: dimensionless, flow_gpm: L^3 T^-1, material: dimensionless } out: { depth_in: L, d_over_d: dimensionless, v_fps: L T^-1, a_ft2: L^2, r_ft: L, q_full_gpm: L^3 T^-1, q_max_gpm: L^3 T^-1, shear_psf: M L^-1 T^-2 }
export function computePipePartialFlowDepth({ d_in = 0, slope = 0, flow_gpm = 0, material = "pvc" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Pipe diameter must be positive (in)." };
  if (!(slope > 0)) return { error: "Pipe slope must be positive (ft/ft)." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive (gpm)." };
  const n = MANNING_ROUGHNESS[material];
  if (!Number.isFinite(n)) return { error: "Unknown pipe material." };
  const d_ft = d_in / 12;
  const q_cfs = flow_gpm / 448.831;
  const areaOf = (th) => (d_ft * d_ft / 8) * (th - Math.sin(th));
  const perimOf = (th) => (d_ft * th) / 2;
  const qOf = (th) => {
    const A = areaOf(th), P = perimOf(th);
    return (1.486 / n) * A * Math.pow(A / P, 2 / 3) * Math.sqrt(slope);
  };
  const q_full_cfs = qOf(2 * Math.PI);
  const q_max_cfs = qOf(THETA_MAX_Q);
  if (q_cfs > q_max_cfs) {
    return { error: "Flow exceeds the pipe's maximum gravity capacity of " + (q_max_cfs * 448.831).toFixed(0) + " gpm (reached at d/D = 0.94). Use a larger pipe or a steeper slope." };
  }
  // Bisect on the rising branch only: qOf is monotonic on (0, THETA_MAX_Q].
  let lo = 1e-9, hi = THETA_MAX_Q;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (qOf(mid) < q_cfs) lo = mid; else hi = mid; }
  const theta = (lo + hi) / 2;
  const a_ft2 = areaOf(theta);
  const r_ft = a_ft2 / perimOf(theta);
  const depth_ft = (d_ft / 2) * (1 - Math.cos(theta / 2));
  const depth_in = depth_ft * 12;
  const d_over_d = depth_ft / d_ft;
  const v_fps = q_cfs / a_ft2;
  const self_cleansing = v_fps >= 2;
  // Tractive (boundary) shear stress: tau = gamma R S, gamma = 62.4 lb/ft^3.
  const shear_psf = 62.4 * r_ft * slope;
  return {
    n, d_ft, theta, depth_in, d_over_d, a_ft2, r_ft, v_fps, self_cleansing, shear_psf,
    q_full_gpm: q_full_cfs * 448.831,
    q_max_gpm: q_max_cfs * 448.831,
    d_over_d_at_max_q: (1 - Math.cos(THETA_MAX_Q / 2)) / 2,
    d_over_d_at_max_v: (1 - Math.cos(THETA_MAX_V / 2)) / 2,
    pct_full: (q_cfs / q_full_cfs) * 100,
    note: "The partial-flow (normal) depth a circular gravity pipe runs at, which the full-bore capacity tile leaves out. Manning Q = (1.486/n) A R^(2/3) sqrt(S) is applied to the circular segment A = (D^2/8)(theta - sin theta), P = D theta/2, y = (D/2)(1 - cos(theta/2)), and solved for theta by bisection. The key subtlety: discharge is NOT monotonic with depth. It peaks about 7.6% ABOVE full-bore at d/D = 0.938 and falls back to the full value at the crown, and velocity peaks at d/D = 0.813 - both derived from the geometry here, not read off a chart. So a pipe has two depths for most flows, and the SMALLER (the physical normal depth) is the one reported. Hydraulic radius is D/4 at both half-full and full, which is why a half-full pipe runs the same velocity as a full one at the same slope. The 2 ft/s self-cleansing check and the boundary shear tau = 62.4 R S (roughly 0.02 to 0.03 lb/ft^2 is the usual grit-moving target) tell you whether solids stay suspended at this depth. Steady uniform flow, constant n with depth; Camp's variable-n curves raise n at shallow depths, so a low d/D result here is slightly optimistic. A design aid; the engineer of record and the local sewer code govern.",
  };
}
export const pipePartialFlowDepthExample = { inputs: { d_in: 8, slope: 0.01, flow_gpm: 200, material: "concrete" } };

function _v1011renderPipePartialFlowDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning's equation applied to the circular-segment geometry (A = (D^2/8)(theta - sin theta), P = D theta/2, y = (D/2)(1 - cos(theta/2))) and solved for the partial-flow normal depth by bisection, the standard gravity-sewer partial-flow relation as compiled in ASCE/WEF MOP FD-5 and Chow, by name. The maximum-discharge depth d/D = 0.938 and maximum-velocity depth d/D = 0.813 are derived from these equations, not tabulated. Roughness n from the standard tables; self-cleansing taken as 2 ft/s. Constant n with depth (Camp's variable-n curves are separate). A design aid; the engineer of record and the local sewer code govern.";
  attachExampleButton(inputRegion, () => { d.input.value = "8"; s.input.value = "0.01"; q.input.value = "200"; m.select.value = "concrete"; update(); });
  const d = makeNumber("Pipe diameter (in)", "ppfd-d", { step: "any", min: "0" });
  const s = makeNumber("Pipe slope S (ft/ft)", "ppfd-s", { step: "any", min: "0" });
  const q = makeNumber("Flow Q (gpm)", "ppfd-q", { step: "any", min: "0" });
  const m = makeSelect("Pipe material", "ppfd-m", Object.keys(MANNING_ROUGHNESS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const f of [d, s, q]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(m.wrap);
  const oY = makeOutputLine(outputRegion, "Flow depth", "ppfd-out-y");
  const oDD = makeOutputLine(outputRegion, "Depth ratio d/D", "ppfd-out-dd");
  const oV = makeOutputLine(outputRegion, "Velocity at that depth", "ppfd-out-v");
  const oSC = makeOutputLine(outputRegion, "Self-cleansing (2 ft/s)", "ppfd-out-sc");
  const oSH = makeOutputLine(outputRegion, "Boundary shear", "ppfd-out-sh");
  const oCap = makeOutputLine(outputRegion, "Capacity full / maximum", "ppfd-out-cap");
  const oNote = makeOutputLine(outputRegion, "Note", "ppfd-out-n");
  const update = debounce(() => {
    const r = computePipePartialFlowDepth({
      d_in: Number(d.input.value) || 0,
      slope: Number(s.input.value) || 0,
      flow_gpm: Number(q.input.value) || 0,
      material: m.select.value,
    });
    if (r.error) {
      oY.textContent = r.error;
      for (const o of [oDD, oV, oSC, oSH, oCap, oNote]) o.textContent = "-";
      return;
    }
    oY.textContent = fmt(r.depth_in, 2) + " in of " + fmt(r.d_ft * 12, 2) + " in";
    oDD.textContent = fmt(r.d_over_d, 3) + " (" + fmt(r.pct_full, 0) + "% of full-bore flow)";
    oV.textContent = fmt(r.v_fps, 2) + " ft/s";
    oSC.textContent = r.self_cleansing ? "YES (at or above 2 ft/s)" : "NO - below 2 ft/s, solids may settle";
    oSH.textContent = fmt(r.shear_psf, 4) + " lb/ft^2";
    oCap.textContent = fmt(r.q_full_gpm, 0) + " gpm full, " + fmt(r.q_max_gpm, 0) + " gpm max at d/D " + fmt(r.d_over_d_at_max_q, 3);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, s, q]) f.input.addEventListener("input", update);
  m.select.addEventListener("change", update);
}
PLUMBING_RENDERERS["pipe-partial-flow-depth"] = _v1011renderPipePartialFlowDepth;

// dims: in { b_ft: L, q_cfs: L^3 T^-1, y1_ft: L } out: { v1_fps: L T^-1, fr1: dimensionless, y2_ft: L, fr2: dimensionless, de_ft: L, efficiency: dimensionless }
export function computeHydraulicJump({ b_ft = 0, q_cfs = 0, y1_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_ft > 0)) return { error: "Channel width must be positive (ft)." };
  if (!(q_cfs > 0)) return { error: "Discharge must be positive (cfs)." };
  if (!(y1_ft > 0)) return { error: "Upstream depth must be positive (ft)." };
  const v1_fps = q_cfs / (b_ft * y1_ft);
  const fr1 = v1_fps / Math.sqrt(32.2 * y1_ft);
  if (!(fr1 > 1)) return { error: "Upstream flow must be supercritical (Fr1 > 1) for a hydraulic jump to form; this depth gives Fr1 = " + fr1.toFixed(2) + "." };
  const y2_ft = (y1_ft / 2) * (Math.sqrt(1 + 8 * fr1 * fr1) - 1);
  const v2_fps = q_cfs / (b_ft * y2_ft);
  const fr2 = v2_fps / Math.sqrt(32.2 * y2_ft);
  const de_ft = Math.pow(y2_ft - y1_ft, 3) / (4 * y1_ft * y2_ft);
  const e1 = y1_ft + v1_fps * v1_fps / (2 * 32.2);
  const e2 = y2_ft + v2_fps * v2_fps / (2 * 32.2);
  const efficiency = e2 / e1;
  const jump_type = fr1 < 1.7 ? "undular (Fr1 1-1.7, a rippled surface)" : (fr1 < 2.5 ? "weak (Fr1 1.7-2.5)" : (fr1 < 4.5 ? "oscillating (Fr1 2.5-4.5, an unstable surface jet)" : (fr1 < 9 ? "steady (Fr1 4.5-9, the best-performing basin range)" : "strong (Fr1 > 9, rough and choppy)")));
  return {
    v1_fps, fr1, y2_ft, v2_fps, fr2, de_ft, e1, e2, efficiency, jump_type, height_ft: y2_ft - y1_ft,
    note: "Belanger momentum sequent (conjugate) depth y2 = (y1/2)(sqrt(1 + 8 Fr1^2) - 1) for a rectangular horizontal channel, with the specific-energy loss dE = (y2 - y1)^3 / (4 y1 y2) and the downstream/upstream energy efficiency, as compiled in Chow (Open-Channel Hydraulics). The jump carries a supercritical (Fr1 > 1) flow up to its subcritical sequent depth, dissipating energy in the turbulence; the tailwater must actually supply that depth for the jump to sit at this location (otherwise it sweeps downstream or drowns out). Rectangular, horizontal, prismatic channel, hydrostatic pressure, negligible boundary friction over the short jump. A design aid; the engineer of record's stilling-basin design governs.",
  };
}
export const hydraulicJumpExample = { inputs: { b_ft: 10, q_cfs: 100, y1_ft: 0.8 } };

function _v632renderHydraulicJump(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Belanger sequent depth y2 = (y1/2)(sqrt(1 + 8 Fr1^2) - 1) and the energy loss dE = (y2 - y1)^3/(4 y1 y2) for a rectangular channel, g = 32.2 ft/s^2, as compiled in Chow, by name. Supercritical upstream (Fr1 > 1); the tailwater must supply the sequent depth. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { b.input.value = "10"; q.input.value = "100"; y1.input.value = "0.8"; update(); });
  const b = makeNumber("Channel width b (ft)", "hj-b", { step: "any", min: "0" });
  const q = makeNumber("Discharge Q (cfs)", "hj-q", { step: "any", min: "0" });
  const y1 = makeNumber("Upstream (supercritical) depth y1 (ft)", "hj-y1", { step: "any", min: "0" });
  for (const f of [b, q, y1]) inputRegion.appendChild(f.wrap);
  const oFr1 = makeOutputLine(outputRegion, "Upstream Fr1 / jump type", "hj-out-fr1");
  const oY2 = makeOutputLine(outputRegion, "Sequent depth y2 / Fr2", "hj-out-y2");
  const oDE = makeOutputLine(outputRegion, "Energy loss / efficiency", "hj-out-de");
  const oNote = makeOutputLine(outputRegion, "Note", "hj-out-n");
  const update = debounce(() => {
    const r = computeHydraulicJump({ b_ft: Number(b.input.value) || 0, q_cfs: Number(q.input.value) || 0, y1_ft: Number(y1.input.value) || 0 });
    if (r.error) { oFr1.textContent = r.error; oY2.textContent = "-"; oDE.textContent = "-"; oNote.textContent = "-"; return; }
    oFr1.textContent = fmt(r.fr1, 2) + " - " + r.jump_type;
    oY2.textContent = fmt(r.y2_ft, 2) + " ft (rise " + fmt(r.height_ft, 2) + " ft), Fr2 " + fmt(r.fr2, 2);
    oDE.textContent = fmt(r.de_ft, 3) + " ft of head lost (" + fmt(r.efficiency * 100, 0) + "% energy retained)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [b, q, y1]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["hydraulic-jump"] = _v632renderHydraulicJump;

// dims: in { b_ft: L, q_cfs: L^3 T^-1, y_ft: L } out: { v_fps: L T^-1, e_ft: L, yc_ft: L, ec_ft: L, fr: dimensionless, y_alt_ft: L }
export function computeSpecificEnergy({ b_ft = 0, q_cfs = 0, y_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_ft > 0)) return { error: "Channel width must be positive (ft)." };
  if (!(q_cfs > 0)) return { error: "Discharge must be positive (cfs)." };
  if (!(y_ft > 0)) return { error: "Flow depth must be positive (ft)." };
  const q_unit = q_cfs / b_ft;
  const v_fps = q_unit / y_ft;
  const e_ft = y_ft + (q_unit * q_unit) / (2 * 32.2 * y_ft * y_ft);
  const yc_ft = Math.cbrt((q_unit * q_unit) / 32.2);
  const ec_ft = 1.5 * yc_ft;
  const fr = v_fps / Math.sqrt(32.2 * y_ft);
  const regime = fr < 0.995 ? "subcritical (tranquil, downstream-controlled)" : (fr > 1.005 ? "supercritical (rapid, upstream-controlled)" : "critical (Fr = 1)");
  // The alternate depth is the second positive root of the specific-energy
  // cubic y^3 - E y^2 + q^2/(2g) = 0; with y a known root, the remaining
  // positive root is this closed form (the negative root is discarded).
  const y_alt_ft = ((e_ft - y_ft) + Math.sqrt((e_ft - y_ft) * (e_ft - y_ft) + 2 * q_unit * q_unit / (32.2 * y_ft))) / 2;
  const alt_regime = y_alt_ft > yc_ft ? "subcritical" : "supercritical";
  return {
    v_fps, e_ft, yc_ft, ec_ft, fr, regime, q_unit, y_alt_ft, alt_regime,
    note: "Specific energy E = y + q^2/(2 g y^2) (g = 32.2 ft/s^2, q = Q/b the unit discharge) is the flow energy per unit weight measured from the channel bed. For one discharge the same E occurs at two alternate depths - a deep subcritical depth and a shallow supercritical depth - that meet at the critical depth yc = (q^2/g)^(1/3), where E is at its minimum Ec = 1.5 yc; the flow is subcritical when y > yc and supercritical when y < yc. The two alternate depths carry the SAME specific energy (an energy conjugate, no loss); this is not the momentum sequent depth across a hydraulic jump, which dissipates energy. Prismatic rectangular channel. A design aid; the engineer of record governs.",
  };
}
export const specificEnergyExample = { inputs: { b_ft: 10, q_cfs: 100, y_ft: 3 } };

function _v637renderSpecificEnergy(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: specific energy E = y + q^2/(2 g y^2), the rectangular critical depth yc = (q^2/g)^(1/3) with minimum specific energy Ec = 1.5 yc, and the alternate depth sharing the same E, as compiled in Chow, by name. Rectangular section; the alternate depth is the energy conjugate, not the momentum sequent depth of a jump. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => { b.input.value = "10"; q.input.value = "100"; y.input.value = "3"; update(); });
  const b = makeNumber("Channel width b (ft)", "spe-b", { step: "any", min: "0" });
  const q = makeNumber("Discharge Q (cfs)", "spe-q", { step: "any", min: "0" });
  const y = makeNumber("Flow depth y (ft)", "spe-y", { step: "any", min: "0" });
  for (const f of [b, q, y]) inputRegion.appendChild(f.wrap);
  const oV = makeOutputLine(outputRegion, "Mean velocity", "spe-out-v");
  const oE = makeOutputLine(outputRegion, "Specific energy E / regime", "spe-out-e");
  const oYc = makeOutputLine(outputRegion, "Critical depth yc / min energy Ec", "spe-out-yc");
  const oAlt = makeOutputLine(outputRegion, "Alternate depth (same E)", "spe-out-alt");
  const oNote = makeOutputLine(outputRegion, "Note", "spe-out-n");
  const update = debounce(() => {
    const r = computeSpecificEnergy({ b_ft: Number(b.input.value) || 0, q_cfs: Number(q.input.value) || 0, y_ft: Number(y.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oE.textContent = "-"; oYc.textContent = "-"; oAlt.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = fmt(r.v_fps, 2) + " ft/s";
    oE.textContent = fmt(r.e_ft, 3) + " ft - Fr " + fmt(r.fr, 2) + " " + r.regime;
    oYc.textContent = fmt(r.yc_ft, 3) + " ft / " + fmt(r.ec_ft, 3) + " ft" + (r.e_ft < r.ec_ft - 1e-6 ? " (below minimum - check inputs)" : "");
    oAlt.textContent = fmt(r.y_alt_ft, 3) + " ft (" + r.alt_regime + ", carries the same " + fmt(r.e_ft, 3) + " ft of energy)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [b, q, y]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["specific-energy"] = _v637renderSpecificEnergy;

// ===================== spec-v371..v373: pipe-flow energy batch (Group B) =====================
// The Bernoulli energy pieces the friction and pressure tiles use but never
// expose: the velocity head and dynamic pressure (v371), the continuity velocity
// at a pipe size change (v372), and the Bernoulli total head (v373).

// dims: in { V_fps: L T^-1, gamma: M L^-2 T^-2, rho: M L^-3 } out: { h_v_ft: L, q_psf: M L^-1 T^-2, q_psi: M L^-1 T^-2 }
export function computeVelocityHead({ V_fps = 0, gamma = 62.4, rho = 1.94 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(V_fps) || 0;
  const r = Number(rho) > 0 ? Number(rho) : 1.94;
  if (!(V > 0)) return { error: "Velocity must be positive (ft/s)." };
  const h_v_ft = V * V / (2 * 32.2);
  const q_psf = 0.5 * r * V * V;
  const q_psi = q_psf / 144;
  return {
    h_v_ft, q_psf, q_psi,
    note: "Velocity head h_v = V^2 / (2g) is the kinetic energy of the flow expressed as feet of fluid, and the dynamic pressure q = 1/2 rho V^2 is that energy as a pressure. Both scale with the square of velocity, so doubling the velocity quadruples the head and pressure - the reason a small velocity increase drives large minor (fitting) losses and erosion, and why plumbing codes cap water velocity around 5-8 ft/s. Water defaults: rho 1.94 slug/ft^3, gamma 62.4 lb/ft^3. A design aid; the code velocity limits and the engineer of record govern.",
  };
}
export const velocityHeadExample = { inputs: { V_fps: 10, gamma: 62.4, rho: 1.94 } };
function _v371renderVelocityHead(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: velocity head h_v = V^2/(2g) (g = 32.2 ft/s^2) and dynamic pressure q = 1/2 rho V^2, first-principles fluid mechanics. Both scale with V^2. The code velocity limits (~5-8 ft/s water) and the engineer of record govern.";
  const V = makeNumber("Flow velocity (ft/s)", "vh-v", { step: "any", min: "0" }); V.input.value = "10";
  const rho = makeNumber("Fluid density (slug/ft^3, 1.94 water)", "vh-rho", { step: "any", min: "0" }); rho.input.value = "1.94";
  for (const f of [V, rho]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { V.input.value = "10"; rho.input.value = "1.94"; update(); });
  const oHv = makeOutputLine(outputRegion, "Velocity head", "vh-out-hv");
  const oQ = makeOutputLine(outputRegion, "Dynamic pressure", "vh-out-q");
  const oNote = makeOutputLine(outputRegion, "Note", "vh-out-n");
  const update = debounce(() => {
    const r = computeVelocityHead({ V_fps: Number(V.input.value) || 0, rho: Number(rho.input.value) || 0 });
    if (r.error) { oHv.textContent = r.error; oQ.textContent = "-"; oNote.textContent = ""; return; }
    oHv.textContent = fmt(r.h_v_ft, 2) + " ft of fluid";
    oQ.textContent = fmt(r.q_psf, 1) + " lb/ft^2 (" + fmt(r.q_psi, 2) + " psi)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [V, rho]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["velocity-head"] = _v371renderVelocityHead;

// dims: in { V1_fps: L T^-1, D1_in: L, D2_in: L } out: { V2_fps: L T^-1 }
export function computeFlowContinuity({ V1_fps = 0, D1_in = 0, D2_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V1 = Number(V1_fps) || 0;
  const D1 = Number(D1_in) || 0;
  const D2 = Number(D2_in) || 0;
  if (!(V1 > 0)) return { error: "Upstream velocity must be positive (ft/s)." };
  if (!(D1 > 0)) return { error: "Upstream diameter must be positive (in)." };
  if (!(D2 > 0)) return { error: "Downstream diameter must be positive (in)." };
  const V2_fps = V1 * Math.pow(D1 / D2, 2);
  const ratio = V2_fps / V1;
  return {
    V2_fps, ratio, reducing: D2 < D1,
    note: "Continuity: for an incompressible fluid the volumetric flow Q = A V is constant, so the velocity changes with the inverse square of the diameter, V2 = V1 (D1/D2)^2. Reducing the pipe accelerates the flow (a 4-to-2 in reduction quadruples the velocity, often past the erosion limit); expanding it slows the flow and converts the velocity head back to pressure (a diffuser). The downstream size is chosen to hold velocity in an acceptable band. Full flow, incompressible; a gas or two-phase flow does not obey this. A design aid; the code velocity limits govern.",
  };
}
export const flowContinuityExample = { inputs: { V1_fps: 6, D1_in: 4, D2_in: 2 } };
function _v372renderFlowContinuity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: continuity V2 = V1 (D1/D2)^2 from Q = A V constant for an incompressible fluid, first-principles. Reducing the pipe accelerates the flow; expanding it slows it. The code velocity limits and the engineer of record govern.";
  const V1 = makeNumber("Upstream velocity (ft/s)", "fc-v1", { step: "any", min: "0" }); V1.input.value = "6";
  const D1 = makeNumber("Upstream diameter (in)", "fc-d1", { step: "any", min: "0" }); D1.input.value = "4";
  const D2 = makeNumber("Downstream diameter (in)", "fc-d2", { step: "any", min: "0" }); D2.input.value = "2";
  for (const f of [V1, D1, D2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { V1.input.value = "6"; D1.input.value = "4"; D2.input.value = "2"; update(); });
  const oV2 = makeOutputLine(outputRegion, "Downstream velocity", "fc-out-v2");
  const oNote = makeOutputLine(outputRegion, "Note", "fc-out-n");
  const update = debounce(() => {
    const r = computeFlowContinuity({ V1_fps: Number(V1.input.value) || 0, D1_in: Number(D1.input.value) || 0, D2_in: Number(D2.input.value) || 0 });
    if (r.error) { oV2.textContent = r.error; oNote.textContent = ""; return; }
    oV2.textContent = fmt(r.V2_fps, 2) + " ft/s (" + fmt(r.ratio, 2) + "x, " + (r.reducing ? "reducing/accelerating" : "expanding/slowing") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [V1, D1, D2]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["flow-continuity"] = _v372renderFlowContinuity;

// dims: in { P_psi: M L^-1 T^-2, V_fps: L T^-1, z_ft: L, gamma: M L^-2 T^-2 } out: { h_press_ft: L, h_vel_ft: L, H_ft: L }
export function computeBernoulliHead({ P_psi = 0, V_fps = 0, z_ft = 0, gamma = 62.4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(P_psi);
  const V = Number(V_fps) || 0;
  const z = Number(z_ft);
  const g = Number(gamma) > 0 ? Number(gamma) : 62.4;
  if (!Number.isFinite(P)) return { error: "Enter a valid gauge pressure (psi)." };
  if (!(V >= 0)) return { error: "Velocity must be zero or positive (ft/s)." };
  if (!Number.isFinite(z)) return { error: "Enter a valid elevation (ft)." };
  const h_press_ft = P * 144 / g;
  const h_vel_ft = V * V / (2 * 32.2);
  const H_ft = h_press_ft + h_vel_ft + z;
  return {
    h_press_ft, h_vel_ft, z_ft: z, H_ft,
    note: "Bernoulli total head H = pressure head (P/gamma) + velocity head (V^2/2g) + elevation head (z), the total mechanical energy per unit weight of fluid, in feet. Along a streamline with no loss the total head is conserved, so where the velocity drops (a pipe widens) the velocity head converts to pressure head - the Venturi/diffuser effect - and where it rises, pressure falls. Real flow loses head to friction and fittings (H1 = H2 + h_loss). Water default gamma 62.4 lb/ft^3. A design aid; the engineer of record governs the system analysis.",
  };
}
export const bernoulliHeadExample = { inputs: { P_psi: 30, V_fps: 6, z_ft: 10, gamma: 62.4 } };
function _v373renderBernoulliHead(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bernoulli total head H = P/gamma + V^2/(2g) + z (feet of fluid), first-principles energy equation; conserved along a streamline with no loss (H1 = H2 + h_loss). The engineer of record governs the system analysis.";
  const P = makeNumber("Gauge pressure (psi)", "bh-p", { step: "any" }); P.input.value = "30";
  const V = makeNumber("Velocity (ft/s)", "bh-v", { step: "any", min: "0" }); V.input.value = "6";
  const z = makeNumber("Elevation (ft)", "bh-z", { step: "any" }); z.input.value = "10";
  const g = makeNumber("Fluid specific weight (lb/ft^3, 62.4 water)", "bh-g", { step: "any", min: "0" }); g.input.value = "62.4";
  for (const f of [P, V, z, g]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "30"; V.input.value = "6"; z.input.value = "10"; g.input.value = "62.4"; update(); });
  const oComp = makeOutputLine(outputRegion, "Pressure / velocity / elevation head", "bh-out-comp");
  const oH = makeOutputLine(outputRegion, "Total head", "bh-out-h");
  const oNote = makeOutputLine(outputRegion, "Note", "bh-out-n");
  const update = debounce(() => {
    const r = computeBernoulliHead({ P_psi: Number(P.input.value), V_fps: Number(V.input.value) || 0, z_ft: Number(z.input.value), gamma: Number(g.input.value) || 0 });
    if (r.error) { oComp.textContent = r.error; oH.textContent = "-"; oNote.textContent = ""; return; }
    oComp.textContent = fmt(r.h_press_ft, 2) + " + " + fmt(r.h_vel_ft, 2) + " + " + fmt(r.z_ft, 2) + " ft";
    oH.textContent = fmt(r.H_ft, 2) + " ft of fluid";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [P, V, z, g]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["bernoulli-head"] = _v373renderBernoulliHead;

// ===================== spec-v388: thrust block bearing area at a pipe bend (water-system hydraulics trio) =====================

// dims: in { pressure_psi: M L^-1 T^-2, od_in: L, bend_deg: dimensionless, soil_bearing_psf: M L^-1 T^-2 } out: { area_in2: L^2, thrust_lb: M L T^-2, bearing_area_ft2: L^2 }
export function computeThrustBlockSizing({ pressure_psi = 0, od_in = 0, bend_deg = 0, soil_bearing_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(pressure_psi) || 0;
  const od = Number(od_in) || 0;
  const bend = Number(bend_deg) || 0;
  const soil = Number(soil_bearing_psf) || 0;
  if (!(P > 0)) return { error: "Internal pressure must be positive (psi)." };
  if (!(od > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(bend > 0 && bend < 180)) return { error: "Bend angle must be between 0 and 180 degrees." };
  if (!(soil > 0)) return { error: "Allowable soil bearing must be positive (psf)." };
  const area_in2 = (Math.PI / 4) * od * od;
  const thrust_lb = 2 * P * area_in2 * Math.sin((bend * Math.PI / 180) / 2);
  const bearing_area_ft2 = thrust_lb / soil;
  return {
    area_in2, thrust_lb, bearing_area_ft2,
    note: "Thrust at a horizontal bend T = 2 P A sin(theta/2) (AWWA M41), where A is the pipe cross-sectional area from the outside diameter and the sin(theta/2) term makes a 90-degree bend push far harder than a 45; the bearing block face must be at least Ab = T / (allowable soil bearing). Use the test or surge pressure, not the working pressure, and a conservative soil value from the geotechnical report. This sizes the bearing face only; block geometry, depth, and the passive-restraint or restrained-joint alternative are the engineer's design. A design aid; the engineer of record governs.",
  };
}
export const thrustBlockSizingExample = { inputs: { pressure_psi: 100, od_in: 8.625, bend_deg: 90, soil_bearing_psf: 2000 } };
function _v388renderThrustBlockSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AWWA M41 (Ductile-Iron Pipe and Fittings) thrust-block method -- resultant thrust at a bend T = 2 P A sin(theta/2), bearing area Ab = T / (allowable soil bearing). Use the test/surge pressure and a geotechnical soil-bearing value. Sizes the bearing face only; the engineer of record governs the block design.";
  const P = makeNumber("Internal pressure (psi, test/surge)", "tbs-p", { step: "any", min: "0" }); P.input.value = "100";
  const od = makeNumber("Pipe outside diameter (in)", "tbs-od", { step: "any", min: "0" }); od.input.value = "8.625";
  const bend = makeNumber("Bend angle (deg)", "tbs-b", { step: "any", min: "0" }); bend.input.value = "90";
  const soil = makeNumber("Allowable soil bearing (psf)", "tbs-s", { step: "any", min: "0" }); soil.input.value = "2000";
  for (const f of [P, od, bend, soil]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "100"; od.input.value = "8.625"; bend.input.value = "90"; soil.input.value = "2000"; update(); });
  const oT = makeOutputLine(outputRegion, "Resultant thrust", "tbs-out-t");
  const oA = makeOutputLine(outputRegion, "Required bearing area", "tbs-out-a");
  const oN = makeOutputLine(outputRegion, "Note", "tbs-out-n");
  const update = debounce(() => {
    const r = computeThrustBlockSizing({ pressure_psi: Number(P.input.value) || 0, od_in: Number(od.input.value) || 0, bend_deg: Number(bend.input.value) || 0, soil_bearing_psf: Number(soil.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oA.textContent = "-"; oN.textContent = ""; return; }
    oT.textContent = fmt(r.thrust_lb, 0) + " lb (pipe area " + fmt(r.area_in2, 1) + " in^2)";
    oA.textContent = fmt(r.bearing_area_ft2, 2) + " ft^2";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [P, od, bend, soil]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["thrust-block-sizing"] = _v388renderThrustBlockSizing;

// thrust-block-max-pressure: inverse of thrust-block-sizing. The forward tile gives the required bearing area from the
// pressure; the inverse recovers the highest test/surge pressure a thrust block of a given bearing-face area restrains at
// a bend, so a designer checks an existing or standard block against a line pressure. From
// bearing_area = 2 P A sin(theta/2) / soil, P = bearing_area x soil / (2 A sin(theta/2)), with A the pipe area from the OD.
// dims: in { bearing_area_ft2: L^2, od_in: L, bend_deg: dimensionless, soil_bearing_psf: M L^-1 T^-2 } out: { max_pressure_psi: M L^-1 T^-2, max_thrust_lb: M L T^-2, area_in2: L^2 }
export function computeThrustBlockMaxPressure({ bearing_area_ft2 = 0, od_in = 0, bend_deg = 0, soil_bearing_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Ab = Number(bearing_area_ft2) || 0;
  const od = Number(od_in) || 0;
  const bend = Number(bend_deg) || 0;
  const soil = Number(soil_bearing_psf) || 0;
  if (!(Ab > 0)) return { error: "Bearing-face area must be positive (ft^2)." };
  if (!(od > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(bend > 0 && bend < 180)) return { error: "Bend angle must be between 0 and 180 degrees." };
  if (!(soil > 0)) return { error: "Allowable soil bearing must be positive (psf)." };
  const area_in2 = (Math.PI / 4) * od * od;
  const max_thrust_lb = Ab * soil;
  const max_pressure_psi = max_thrust_lb / (2 * area_in2 * Math.sin((bend * Math.PI / 180) / 2));
  if (![area_in2, max_thrust_lb, max_pressure_psi].every(Number.isFinite)) return { error: "Max-pressure math is not a finite value." };
  return {
    max_pressure_psi, max_thrust_lb, area_in2,
    note: "Max pressure a thrust block restrains = bearing area x allowable soil bearing / (2 A sin(theta/2)), the inverse of the AWWA M41 thrust relation T = 2 P A sin(theta/2) with A the pipe area from the OD. The soil takes at most Ab x allowable bearing of thrust, which sets the pressure ceiling at the bend. Compare against the TEST or SURGE pressure, not the working pressure, and use a conservative geotechnical soil value. This checks the bearing face only; block geometry, depth, and the restrained-joint alternative are the engineer's design. A design aid; the engineer of record governs.",
  };
}
export const thrustBlockMaxPressureExample = { inputs: { bearing_area_ft2: 4.13, od_in: 8.625, bend_deg: 90, soil_bearing_psf: 2000 } };
function _v745renderThrustBlockMaxPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AWWA M41 (Ductile-Iron Pipe and Fittings) thrust-block method -- T = 2 P A sin(theta/2), Ab = T / soil, solved for the pressure: P = Ab x soil / (2 A sin(theta/2)). Compare against the test/surge pressure and a geotechnical soil-bearing value. Checks the bearing face only; the engineer of record governs the block design.";
  const Ab = makeNumber("Bearing-face area (ft^2)", "tbm-a", { step: "any", min: "0" }); Ab.input.value = "4.13";
  const od = makeNumber("Pipe outside diameter (in)", "tbm-od", { step: "any", min: "0" }); od.input.value = "8.625";
  const bend = makeNumber("Bend angle (deg)", "tbm-b", { step: "any", min: "0" }); bend.input.value = "90";
  const soil = makeNumber("Allowable soil bearing (psf)", "tbm-s", { step: "any", min: "0" }); soil.input.value = "2000";
  for (const f of [Ab, od, bend, soil]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Ab.input.value = "4.13"; od.input.value = "8.625"; bend.input.value = "90"; soil.input.value = "2000"; update(); });
  const oP = makeOutputLine(outputRegion, "Max test / surge pressure", "tbm-out-p");
  const oT = makeOutputLine(outputRegion, "Max thrust the soil takes", "tbm-out-t");
  const oN = makeOutputLine(outputRegion, "Note", "tbm-out-n");
  const update = debounce(() => {
    const r = computeThrustBlockMaxPressure({ bearing_area_ft2: Number(Ab.input.value) || 0, od_in: Number(od.input.value) || 0, bend_deg: Number(bend.input.value) || 0, soil_bearing_psf: Number(soil.input.value) || 0 });
    if (r.error) { oP.textContent = r.error; oT.textContent = "-"; oN.textContent = ""; return; }
    oP.textContent = fmt(r.max_pressure_psi, 0) + " psi (pipe area " + fmt(r.area_in2, 1) + " in^2)";
    oT.textContent = fmt(r.max_thrust_lb, 0) + " lb";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [Ab, od, bend, soil]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["thrust-block-max-pressure"] = _v745renderThrustBlockMaxPressure;

// ===================== spec-v428: stormwater detention volume (drainage trio) =====================

// dims: in { runoff_c: dimensionless, intensity_in_hr: dimensionless, area_ac: dimensionless, q_allow_cfs: L^3 T^-1, duration_min: dimensionless } out: { q_in_cfs: L^3 T^-1, storage_cf: L^3, storage_ac_ft: L^3 }
export function computeStormwaterDetentionVolume({ runoff_c = 0, intensity_in_hr = 0, area_ac = 0, q_allow_cfs = 0, duration_min = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = Number(runoff_c) || 0;
  const i = Number(intensity_in_hr) || 0;
  const area = Number(area_ac) || 0;
  const qa = Number(q_allow_cfs) || 0;
  const dur = Number(duration_min) || 0;
  if (!(c > 0)) return { error: "Runoff coefficient must be positive." };
  if (!(i > 0)) return { error: "Rainfall intensity must be positive (in/hr)." };
  if (!(area > 0)) return { error: "Drainage area must be positive (acres)." };
  if (qa < 0) return { error: "Allowable release must be non-negative (cfs)." };
  if (!(dur > 0)) return { error: "Storm duration must be positive (min)." };
  const q_in_cfs = c * i * area;
  if (!(q_in_cfs > qa)) return { error: "Allowable release meets or exceeds the inflow -- no detention is needed for this duration (search a longer, less intense storm)." };
  const storage_cf = (q_in_cfs - qa) * dur * 60;
  const storage_ac_ft = storage_cf / 43560;
  return {
    q_in_cfs, storage_cf, storage_ac_ft, storage_gal: storage_cf * 7.48052,
    note: "Modified Rational detention volume: the peak inflow Q_in = C i A (the Rational method, C runoff coefficient, i design intensity in in/hr, A in acres gives cfs directly), and the required storage = (Q_in - Q_allow) x duration x 60, the volume that must be held while the outlet passes only the allowable (pre-development) release. Because a longer, lighter storm can require MORE storage than the short intense one, the critical duration must be searched by trying several durations off the IDF curve and taking the largest volume. This sizes one duration; the routing, the outlet structure, and the local drainage ordinance govern. A design aid; the engineer of record governs.",
  };
}
export const stormwaterDetentionVolumeExample = { inputs: { runoff_c: 0.85, intensity_in_hr: 3, area_ac: 2, q_allow_cfs: 1.0, duration_min: 30 } };
function _v428renderStormwaterDetentionVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Modified Rational detention volume: peak inflow Q_in = C i A (Rational method), storage = (Q_in - Q_allow) x duration x 60. The critical duration is found by searching the IDF curve for the largest volume. A design aid; the routing, the outlet, and the local drainage ordinance govern.";
  const c = makeNumber("Developed runoff coefficient C", "sdv-c", { step: "any", min: "0" }); c.input.value = "0.85";
  const i = makeNumber("Design rainfall intensity (in/hr)", "sdv-i", { step: "any", min: "0" }); i.input.value = "3";
  const area = makeNumber("Drainage area (acres)", "sdv-a", { step: "any", min: "0" }); area.input.value = "2";
  const qa = makeNumber("Allowable release (cfs)", "sdv-qa", { step: "any", min: "0" }); qa.input.value = "1.0";
  const dur = makeNumber("Storm duration (min)", "sdv-d", { step: "any", min: "0" }); dur.input.value = "30";
  for (const f of [c, i, area, qa, dur]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "0.85"; i.input.value = "3"; area.input.value = "2"; qa.input.value = "1.0"; dur.input.value = "30"; update(); });
  const oQ = makeOutputLine(outputRegion, "Peak inflow", "sdv-out-q");
  const oV = makeOutputLine(outputRegion, "Required storage", "sdv-out-v");
  const oNote = makeOutputLine(outputRegion, "Note", "sdv-out-n");
  const update = debounce(() => {
    const r = computeStormwaterDetentionVolume({ runoff_c: Number(c.input.value) || 0, intensity_in_hr: Number(i.input.value) || 0, area_ac: Number(area.input.value) || 0, q_allow_cfs: Number(qa.input.value) || 0, duration_min: Number(dur.input.value) || 0 });
    if (r.error) { oQ.textContent = r.error; oV.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.q_in_cfs, 2) + " cfs";
    oV.textContent = fmt(r.storage_cf, 0) + " ft^3 (" + fmt(r.storage_ac_ft, 3) + " acre-ft, " + fmt(r.storage_gal, 0) + " gal)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [c, i, area, qa, dur]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["stormwater-detention-volume"] = _v428renderStormwaterDetentionVolume;

// dims: in { height_ft: L, margin_psi: M L^-1 T^-2 } out: { fill_psi: M L^-1 T^-2, static_psi: M L^-1 T^-2, top_static_psi: M L^-1 T^-2 }
export function computeHydronicFillPressure({ height_ft = 0, margin_psi = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const height = Number(height_ft) || 0;
  const margin = Number(margin_psi) || 0;
  if (!(height > 0)) return { error: "Height to the highest point must be positive (ft)." };
  if (margin < 0) return { error: "Top-of-system margin must be non-negative (psi)." };
  const static_psi = height / 2.31;
  const fill_psi = static_psi + margin;
  return {
    static_psi, fill_psi, top_static_psi: margin,
    note: "Hydronic fill (make-up) pressure by static height: the cold-fill pressure at the boiler must lift water to the highest point of the loop plus a small margin so the top stays above atmospheric (preventing air being drawn in and pump cavitation). fill = height / 2.31 + margin, where 2.31 ft of water = 1 psi and the margin is commonly about 4 psi (roughly 5 psi at the top of the system). Set the automatic fill valve and the expansion-tank pre-charge to this pressure. The relief valve (typically 30 psi on residential boilers) must sit well above it. A design aid; the boiler and system manufacturer's instructions govern.",
  };
}
export const hydronicFillPressureExample = { inputs: { height_ft: 30, margin_psi: 4 } };
function _v452renderHydronicFillPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hydronic fill pressure by static height: fill = height / 2.31 + margin (2.31 ft of water = 1 psi), a common margin ~4 psi to keep the top of the loop above atmospheric. The expansion-tank pre-charge matches the fill; the relief valve sits well above. A design aid; the manufacturer's instructions govern.";
  const h = makeNumber("Height fill-to-highest-point (ft)", "hfp-h", { step: "any", min: "0" }); h.input.value = "30";
  const m = makeNumber("Top-of-system margin (psi, default 4)", "hfp-m", { step: "any", min: "0" }); m.input.value = "4";
  for (const f of [h, m]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "30"; m.input.value = "4"; update(); });
  const oFill = makeOutputLine(outputRegion, "Cold-fill pressure", "hfp-out-fill");
  const oStatic = makeOutputLine(outputRegion, "Static lift (height/2.31)", "hfp-out-static");
  const oNote = makeOutputLine(outputRegion, "Note", "hfp-out-n");
  const update = debounce(() => {
    const r = computeHydronicFillPressure({ height_ft: Number(h.input.value) || 0, margin_psi: Number(m.input.value) || 0 });
    if (r.error) { oFill.textContent = r.error; oStatic.textContent = "-"; oNote.textContent = ""; return; }
    oFill.textContent = fmt(r.fill_psi, 1) + " psi (" + fmt(r.top_static_psi, 1) + " psi left at the top)";
    oStatic.textContent = fmt(r.static_psi, 1) + " psi";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [h, m]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["hydronic-fill-pressure"] = _v452renderHydronicFillPressure;

// ===================== spec-v856: solder and flux per sweat-joint takeoff =====================
// dims: in { joints: dimensionless, wire_in_per_joint: L, wire_dia_in: L, solder_density_lb_in3: M L^-3, spool_lb: M } out: { w_per_in: M L^-1, solder_lb: M, spools: dimensionless }
export function computeSolderJointQuantity({ joints = 200, wire_in_per_joint = 0.75, wire_dia_in = 0.125, solder_density_lb_in3 = 0.30, spool_lb = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(joints > 0)) return { error: "Joint count must be positive." };
  if (!(wire_in_per_joint > 0)) return { error: "Wire per joint must be positive (in)." };
  if (!(wire_dia_in > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(solder_density_lb_in3 > 0)) return { error: "Solder density must be positive (lb/in^3)." };
  if (!(spool_lb > 0)) return { error: "Spool weight must be positive (lb)." };
  const w_per_in = (Math.PI / 4) * wire_dia_in * wire_dia_in * solder_density_lb_in3;
  const solder_lb = joints * wire_in_per_joint * w_per_in;
  const spools = Math.ceil(solder_lb / spool_lb);
  if (![w_per_in, solder_lb, spools].every(Number.isFinite)) return { error: "Solder math is not a finite value." };
  return {
    w_per_in,
    solder_lb,
    spools,
    note: "The wire length per joint is a field rule of thumb (roughly the pipe diameter in inches of 1/8 in solid wire) that varies with cup depth and technique. Lead-free solder runs about 0.30 lb/in^3. The crew buys spools with a spare. Flux is a separate small line, roughly one 4 oz jar per 100-150 joints.",
  };
}

export const solderJointQuantityExample = { inputs: { joints: 200, wire_in_per_joint: 0.75, wire_dia_in: 0.125, solder_density_lb_in3: 0.30, spool_lb: 1 } };

function _v856renderSolderJointQuantity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: solder-weight identity by name. weight per inch = pi/4 x diameter^2 x density; solder = joints x wire per joint x weight per inch. The wire per joint is a field rule (~the pipe diameter in inches of 1/8 in wire); lead-free solder is ~0.30 lb/in^3.";
  const j = makeNumber("Joints to sweat", "sjq-j", { step: "any", min: "0", value: "200" });
  j.input.value = "200";
  const wj = makeNumber("Solder wire per joint (in)", "sjq-wj", { step: "any", min: "0", value: "0.75" });
  wj.input.value = "0.75";
  const wd = makeNumber("Solder wire diameter (in)", "sjq-wd", { step: "any", min: "0", value: "0.125" });
  wd.input.value = "0.125";
  const dn = makeNumber("Solder density (lb/in^3)", "sjq-dn", { step: "any", min: "0", value: "0.30" });
  dn.input.value = "0.30";
  const sp = makeNumber("Spool weight (lb)", "sjq-sp", { step: "any", min: "0", value: "1" });
  sp.input.value = "1";
  for (const f of [j, wj, wd, dn, sp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { j.input.value = "200"; wj.input.value = "0.75"; wd.input.value = "0.125"; dn.input.value = "0.30"; sp.input.value = "1"; update(); });
  const oSolder = makeOutputLine(outputRegion, "Solder to order", "sjq-out-solder");
  const oSpools = makeOutputLine(outputRegion, "Spools", "sjq-out-spools");
  const update = debounce(() => {
    const r = computeSolderJointQuantity({
      joints: j.input.value === "" ? 200 : Number(j.input.value), wire_in_per_joint: wj.input.value === "" ? 0.75 : Number(wj.input.value),
      wire_dia_in: wd.input.value === "" ? 0.125 : Number(wd.input.value), solder_density_lb_in3: dn.input.value === "" ? 0.30 : Number(dn.input.value),
      spool_lb: sp.input.value === "" ? 1 : Number(sp.input.value),
    });
    if (r.error) { oSolder.textContent = r.error; oSpools.textContent = "-"; return; }
    oSolder.textContent = fmt(r.solder_lb, 2) + " lb";
    oSpools.textContent = fmt(r.spools, 0) + " spools";
  }, DEBOUNCE_MS);
  for (const f of [j, wj, wd, dn, sp]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["solder-joint-quantity"] = _v856renderSolderJointQuantity;

// ===================== spec-v857: pipe insulation and jacket material takeoff =====================
// dims: in { pipe_ft: L, waste_pct: dimensionless, num_fittings: dimensionless, fitting_allow_ft: L, section_len_ft: L, insul_od_in: L } out: { cut_ft: L, sections: dimensionless, jacket_sf: L^2 }
export function computePipeInsulationTakeoff({ pipe_ft = 250, waste_pct = 5, num_fittings = 12, fitting_allow_ft = 1, section_len_ft = 3, insul_od_in = 4.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_ft > 0)) return { error: "Pipe length must be positive (ft)." };
  if (!(fitting_allow_ft > 0)) return { error: "Fitting allowance must be positive (ft)." };
  if (!(section_len_ft > 0)) return { error: "Section length must be positive (ft)." };
  if (!(insul_od_in > 0)) return { error: "Insulation OD must be positive (in)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  if (num_fittings < 0) return { error: "Fitting count cannot be negative." };
  const cut_ft = pipe_ft * (1 + waste_pct / 100) + num_fittings * fitting_allow_ft;
  const sections = Math.ceil(cut_ft / section_len_ft);
  const jacket_sf = Math.PI * (insul_od_in / 12) * cut_ft;
  if (![cut_ft, sections, jacket_sf].every(Number.isFinite)) return { error: "Insulation-takeoff math is not a finite value." };
  return {
    cut_ft,
    sections,
    jacket_sf,
    note: "The fitting allowance covers ells, tees, and valves (a valve is several feet of equivalent length). The jacket area uses the insulation outside diameter (not the pipe). This is a material takeoff distinct from the thermal insulation-thickness; the spec sets the thickness and jacket type.",
  };
}

export const pipeInsulationTakeoffExample = { inputs: { pipe_ft: 250, waste_pct: 5, num_fittings: 12, fitting_allow_ft: 1, section_len_ft: 3, insul_od_in: 4.5 } };

function _v857renderPipeInsulationTakeoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: insulation-takeoff identity by name. cut = pipe x (1 + waste) + fittings x allowance; sections = ceil(cut / section length); jacket = pi x insulation OD x cut. The jacket area uses the insulation OD, not the pipe.";
  const p = makeNumber("Pipe run length (ft)", "pit-p", { step: "any", min: "0", value: "250" });
  p.input.value = "250";
  const w = makeNumber("Waste allowance (percent)", "pit-w", { step: "any", min: "0", value: "5" });
  w.input.value = "5";
  const nf = makeNumber("Ells / tees / valves (count)", "pit-nf", { step: "any", min: "0", value: "12" });
  nf.input.value = "12";
  const fa = makeNumber("Insulation allowance per fitting (ft)", "pit-fa", { step: "any", min: "0", value: "1" });
  fa.input.value = "1";
  const sl = makeNumber("Insulation section length (ft)", "pit-sl", { step: "any", min: "0", value: "3" });
  sl.input.value = "3";
  const od = makeNumber("Insulation outside diameter (in)", "pit-od", { step: "any", min: "0", value: "4.5" });
  od.input.value = "4.5";
  for (const f of [p, w, nf, fa, sl, od]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "250"; w.input.value = "5"; nf.input.value = "12"; fa.input.value = "1"; sl.input.value = "3"; od.input.value = "4.5"; update(); });
  const oSections = makeOutputLine(outputRegion, "Insulation sections", "pit-out-sections");
  const oJacket = makeOutputLine(outputRegion, "Jacket area", "pit-out-jacket");
  const update = debounce(() => {
    const r = computePipeInsulationTakeoff({
      pipe_ft: p.input.value === "" ? 250 : Number(p.input.value), waste_pct: w.input.value === "" ? 0 : Number(w.input.value),
      num_fittings: nf.input.value === "" ? 0 : Number(nf.input.value), fitting_allow_ft: fa.input.value === "" ? 1 : Number(fa.input.value),
      section_len_ft: sl.input.value === "" ? 3 : Number(sl.input.value), insul_od_in: od.input.value === "" ? 4.5 : Number(od.input.value),
    });
    if (r.error) { oSections.textContent = r.error; oJacket.textContent = "-"; return; }
    oSections.textContent = fmt(r.sections, 0) + " sections (" + fmt(r.cut_ft, 1) + " ft cut)";
    oJacket.textContent = fmt(r.jacket_sf, 0) + " sf";
  }, DEBOUNCE_MS);
  for (const f of [p, w, nf, fa, sl, od]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["pipe-insulation-takeoff"] = _v857renderPipeInsulationTakeoff;

// ===================== spec-v858: freeze-protection heat-trace cable and circuit =====================
// dims: in { pipe_ft: L, allowance_pct: dimensionless, num_valves: dimensionless, valve_allow_ft: L, rated_w_per_ft: dimensionless, voltage: dimensionless, breaker_a: dimensionless } out: { cable_ft: L, watts: dimensionless, amps: dimensionless }
export function computeHeatTraceSizing({ pipe_ft = 150, allowance_pct = 10, num_valves = 1, valve_allow_ft = 3, rated_w_per_ft = 5, voltage = 120, breaker_a = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_ft > 0)) return { error: "Pipe length must be positive (ft)." };
  if (!(rated_w_per_ft > 0)) return { error: "Rated wattage must be positive (W/ft)." };
  if (!(voltage > 0)) return { error: "Voltage must be positive (V)." };
  if (!(breaker_a > 0)) return { error: "Breaker rating must be positive (A)." };
  if (allowance_pct < 0) return { error: "Allowance cannot be negative (percent)." };
  if (num_valves < 0) return { error: "Valve count cannot be negative." };
  if (valve_allow_ft < 0) return { error: "Valve allowance cannot be negative (ft)." };
  const cable_ft = pipe_ft * (1 + allowance_pct / 100) + num_valves * valve_allow_ft;
  const watts = rated_w_per_ft * cable_ft;
  const amps = watts / voltage;
  const breaker_ok = amps <= 0.8 * breaker_a;
  if (![cable_ft, watts, amps].every(Number.isFinite)) return { error: "Heat-trace math is not a finite value." };
  return {
    cable_ft,
    watts,
    amps,
    breaker_ok,
    note: "The required W/ft (the pipe heat loss) comes from insulation-heat-loss or the manufacturer; the picked cable must be rated at or above it. Valves, flanges, and supports are heat sinks that add cable. A cold start can draw two to three times the steady current on self-regulating cable. The manufacturer's design tables and maximum circuit length govern.",
  };
}

export const heatTraceSizingExample = { inputs: { pipe_ft: 150, allowance_pct: 10, num_valves: 1, valve_allow_ft: 3, rated_w_per_ft: 5, voltage: 120, breaker_a: 20 } };

function _v858renderHeatTraceSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: heat-trace identity by name. cable = pipe x (1 + allowance) + valves x allowance; watts = rated W/ft x cable; amps = watts / voltage. Continuous load must stay under 80% of the breaker. The manufacturer's tables and max circuit length govern.";
  const p = makeNumber("Pipe run length (ft)", "hts-p", { step: "any", min: "0", value: "150" });
  p.input.value = "150";
  const al = makeNumber("Support / spiral allowance (percent)", "hts-al", { step: "any", min: "0", value: "10" });
  al.input.value = "10";
  const nv = makeNumber("Valves and flanges (count)", "hts-nv", { step: "any", min: "0", value: "1" });
  nv.input.value = "1";
  const va = makeNumber("Cable allowance per valve (ft)", "hts-va", { step: "any", min: "0", value: "3" });
  va.input.value = "3";
  const wf = makeNumber("Cable rated wattage (W/ft)", "hts-wf", { step: "any", min: "0", value: "5" });
  wf.input.value = "5";
  const v = makeNumber("Supply voltage (V)", "hts-v", { step: "any", min: "0", value: "120" });
  v.input.value = "120";
  const br = makeNumber("Circuit breaker rating (A)", "hts-br", { step: "any", min: "0", value: "20" });
  br.input.value = "20";
  for (const f of [p, al, nv, va, wf, v, br]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "150"; al.input.value = "10"; nv.input.value = "1"; va.input.value = "3"; wf.input.value = "5"; v.input.value = "120"; br.input.value = "20"; update(); });
  const oCable = makeOutputLine(outputRegion, "Heat-trace cable", "hts-out-cable");
  const oCircuit = makeOutputLine(outputRegion, "Circuit load", "hts-out-circuit");
  const update = debounce(() => {
    const r = computeHeatTraceSizing({
      pipe_ft: p.input.value === "" ? 150 : Number(p.input.value), allowance_pct: al.input.value === "" ? 0 : Number(al.input.value),
      num_valves: nv.input.value === "" ? 0 : Number(nv.input.value), valve_allow_ft: va.input.value === "" ? 3 : Number(va.input.value),
      rated_w_per_ft: wf.input.value === "" ? 5 : Number(wf.input.value), voltage: v.input.value === "" ? 120 : Number(v.input.value),
      breaker_a: br.input.value === "" ? 20 : Number(br.input.value),
    });
    if (r.error) { oCable.textContent = r.error; oCircuit.textContent = "-"; return; }
    oCable.textContent = fmt(r.cable_ft, 0) + " ft (" + fmt(r.watts, 0) + " W)";
    oCircuit.textContent = fmt(r.amps, 1) + " A - " + (r.breaker_ok ? "OK on one circuit" : "OVER 80% - split the run");
  }, DEBOUNCE_MS);
  for (const f of [p, al, nv, va, wf, v, br]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["heat-trace-sizing"] = _v858renderHeatTraceSizing;

// ===================== spec-v894: pipe inert purge volume and time =====================
// dims: in { pipe_id_in: L, length_ft: L, air_changes: dimensionless, flow_scfh: L^3 T^-1 } out: { pipe_volume_ft3: L^3, purge_volume_ft3: L^3, purge_min: T }
export function computePipePurgeVolume({ pipe_id_in = 2.067, length_ft = 100, air_changes = 5, flow_scfh = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_id_in > 0)) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(air_changes > 0)) return { error: "Air changes must be positive." };
  if (!(flow_scfh > 0)) return { error: "Purge flow must be positive (scfh)." };
  const pipe_volume_ft3 = (Math.PI / 4) * Math.pow(pipe_id_in / 12, 2) * length_ft;
  const purge_volume_ft3 = pipe_volume_ft3 * air_changes;
  const purge_min = purge_volume_ft3 / flow_scfh * 60;
  if (![pipe_volume_ft3, purge_volume_ft3, purge_min].every(Number.isFinite)) return { error: "Purge math is not a finite value." };
  return {
    pipe_volume_ft3,
    purge_volume_ft3,
    purge_min,
    note: "A nitrogen purge while brazing keeps scale and oxidation out of the line. The number of volume changes (about five to seven to reach a low oxygen level) and the acceptable oxygen or dew point come from the spec or manufacturer. A flow or oxygen meter confirms the endpoint; this estimates the time. Distinct from the room confined-space-purge.",
  };
}

export const pipePurgeVolumeExample = { inputs: { pipe_id_in: 2.067, length_ft: 100, air_changes: 5, flow_scfh: 60 } };

function _v894renderPipePurgeVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: purge identity by name. pipe volume = pi/4 x ID^2 x length; purge volume = pipe volume x air changes; time = purge volume / flow. A nitrogen purge while brazing keeps scale and oxidation out of the line.";
  const id = makeNumber("Pipe inside diameter (in)", "ppv-id", { step: "any", min: "0", value: "2.067" });
  id.input.value = "2.067";
  const ln = makeNumber("Run length (ft)", "ppv-ln", { step: "any", min: "0", value: "100" });
  ln.input.value = "100";
  const ac = makeNumber("Volume changes to sweep", "ppv-ac", { step: "any", min: "0", value: "5" });
  ac.input.value = "5";
  const fl = makeNumber("Purge gas flow (scfh)", "ppv-fl", { step: "any", min: "0", value: "60" });
  fl.input.value = "60";
  for (const f of [id, ln, ac, fl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { id.input.value = "2.067"; ln.input.value = "100"; ac.input.value = "5"; fl.input.value = "60"; update(); });
  const oPipe = makeOutputLine(outputRegion, "Pipe volume", "ppv-out-pipe");
  const oPurge = makeOutputLine(outputRegion, "Purge volume", "ppv-out-purge");
  const oTime = makeOutputLine(outputRegion, "Purge time", "ppv-out-time");
  const update = debounce(() => {
    const r = computePipePurgeVolume({
      pipe_id_in: id.input.value === "" ? 2.067 : Number(id.input.value), length_ft: ln.input.value === "" ? 100 : Number(ln.input.value),
      air_changes: ac.input.value === "" ? 5 : Number(ac.input.value), flow_scfh: fl.input.value === "" ? 60 : Number(fl.input.value),
    });
    if (r.error) { oPipe.textContent = r.error; oPurge.textContent = "-"; oTime.textContent = "-"; return; }
    oPipe.textContent = fmt(r.pipe_volume_ft3, 2) + " ft^3";
    oPurge.textContent = fmt(r.purge_volume_ft3, 2) + " ft^3";
    oTime.textContent = fmt(r.purge_min, 1) + " min";
  }, DEBOUNCE_MS);
  for (const f of [id, ln, ac, fl]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["pipe-purge-volume"] = _v894renderPipePurgeVolume;

// ===================== spec-v903: hydronic system water and glycol volume =====================
// dims: in { pipe_length_ft: L, gal_per_ft: L^2, terminal_gal: L^3, boiler_tank_gal: L^3, glycol_fraction: dimensionless } out: { pipe_gal: L^3, system_gal: L^3, glycol_gal: L^3, water_gal: L^3 }
export function computeHydronicSystemVolume({ pipe_length_ft = 500, gal_per_ft = 0.023, terminal_gal = 0, boiler_tank_gal = 0, glycol_fraction = 0.30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_length_ft > 0)) return { error: "Pipe length must be positive (ft)." };
  if (!(gal_per_ft > 0)) return { error: "Gallons per foot must be positive." };
  if (terminal_gal < 0) return { error: "Terminal volume cannot be negative (gal)." };
  if (boiler_tank_gal < 0) return { error: "Boiler / tank volume cannot be negative (gal)." };
  if (glycol_fraction < 0 || glycol_fraction > 1) return { error: "Glycol fraction must be 0 to 1." };
  const pipe_gal = pipe_length_ft * gal_per_ft;
  const system_gal = pipe_gal + terminal_gal + boiler_tank_gal;
  const glycol_gal = system_gal * glycol_fraction;
  const water_gal = system_gal - glycol_gal;
  if (![pipe_gal, system_gal, glycol_gal, water_gal].every(Number.isFinite)) return { error: "System-volume math is not a finite value." };
  return {
    pipe_gal,
    system_gal,
    glycol_gal,
    water_gal,
    note: "The gallons per foot comes from the pipe size (3/4 in is about 0.023 gal/ft). The terminal and boiler or buffer volumes come from the equipment. The glycol fraction comes from the freeze-protection target (glycol-mix gives the ratio). This fill volume sizes the expansion tank (expansion-tank) and the glycol order. Distinct from the loop-length radiant-loop-sizing.",
  };
}

export const hydronicSystemVolumeExample = { inputs: { pipe_length_ft: 500, gal_per_ft: 0.023, terminal_gal: 8, boiler_tank_gal: 5, glycol_fraction: 0.30 } };

function _v903renderHydronicSystemVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: volume identity by name. system = pipe length x gallons per foot + terminals + boiler; glycol = system x fraction; water = system - glycol. The gallons per foot comes from the pipe size (3/4 in ~0.023 gal/ft).";
  const pl = makeNumber("Total pipe length (ft)", "hsv-pl", { step: "any", min: "0", value: "500" });
  pl.input.value = "500";
  const gf = makeNumber("Gallons per foot (gal/ft)", "hsv-gf", { step: "any", min: "0", value: "0.023" });
  gf.input.value = "0.023";
  const tg = makeNumber("Terminal / emitter volume (gal)", "hsv-tg", { step: "any", min: "0", value: "8" });
  tg.input.value = "8";
  const bg = makeNumber("Boiler + buffer tank volume (gal)", "hsv-bg", { step: "any", min: "0", value: "5" });
  bg.input.value = "5";
  const gc = makeNumber("Glycol fraction (0-1)", "hsv-gc", { step: "any", min: "0", value: "0.30" });
  gc.input.value = "0.30";
  for (const f of [pl, gf, tg, bg, gc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pl.input.value = "500"; gf.input.value = "0.023"; tg.input.value = "8"; bg.input.value = "5"; gc.input.value = "0.30"; update(); });
  const oSystem = makeOutputLine(outputRegion, "System volume", "hsv-out-system");
  const oGlycol = makeOutputLine(outputRegion, "Glycol charge", "hsv-out-glycol");
  const oWater = makeOutputLine(outputRegion, "Water", "hsv-out-water");
  const update = debounce(() => {
    const r = computeHydronicSystemVolume({
      pipe_length_ft: pl.input.value === "" ? 500 : Number(pl.input.value), gal_per_ft: gf.input.value === "" ? 0.023 : Number(gf.input.value),
      terminal_gal: tg.input.value === "" ? 0 : Number(tg.input.value), boiler_tank_gal: bg.input.value === "" ? 0 : Number(bg.input.value),
      glycol_fraction: gc.input.value === "" ? 0.30 : Number(gc.input.value),
    });
    if (r.error) { oSystem.textContent = r.error; oGlycol.textContent = "-"; oWater.textContent = "-"; return; }
    oSystem.textContent = fmt(r.system_gal, 1) + " gal (" + fmt(r.pipe_gal, 1) + " gal in the pipe)";
    oGlycol.textContent = fmt(r.glycol_gal, 1) + " gal";
    oWater.textContent = fmt(r.water_gal, 1) + " gal";
  }, DEBOUNCE_MS);
  for (const f of [pl, gf, tg, bg, gc]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["hydronic-system-volume"] = _v903renderHydronicSystemVolume;

// ===================== spec-v906: PEX home-run manifold port and tubing takeoff =====================
// dims: in { fixtures: dimensionless, hot_fixtures: dimensionless, avg_run_ft: L, waste_pct: dimensionless } out: { cold_ports: dimensionless, hot_ports: dimensionless, total_ports: dimensionless, tubing_lf: L }
export function computePexHomerunTakeoff({ fixtures = 8, hot_fixtures = 6, avg_run_ft = 35, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fixtures > 0)) return { error: "Fixture count must be positive." };
  if (!(avg_run_ft > 0)) return { error: "Average run must be positive (ft)." };
  if (hot_fixtures < 0) return { error: "Hot-fixture count cannot be negative." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  if (hot_fixtures > fixtures) return { error: "Hot fixtures cannot exceed total fixtures." };
  const cold_ports = fixtures;
  const hot_ports = hot_fixtures;
  const total_ports = cold_ports + hot_ports;
  // (100 + waste)/100 rather than (1 + waste/100): the latter's 1.1 is not exactly
  // representable, so 770 * 1.1 = 847.0000000000001 and ceils to 848 not 847.
  const tubing_lf = Math.ceil(total_ports * avg_run_ft * (100 + waste_pct) / 100);
  if (![cold_ports, hot_ports, total_ports, tubing_lf].every(Number.isFinite)) return { error: "Home-run math is not a finite value." };
  return {
    cold_ports,
    hot_ports,
    total_ports,
    tubing_lf,
    note: "Home-run (manifold) plumbing runs one line per fixture from a central manifold. The manifold is sized to the total ports plus spares. The tubing footage uses the average home-run length. A port count and footage distinct from the flow-sizing pipe-sizing.",
  };
}

export const pexHomerunTakeoffExample = { inputs: { fixtures: 8, hot_fixtures: 6, avg_run_ft: 35, waste_pct: 10 } };

function _v906renderPexHomerunTakeoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: takeoff identity by name. cold ports = fixtures; hot ports = hot fixtures; tubing = (cold + hot) x average run x (1 + waste). Home-run plumbing runs one line per fixture from a central manifold.";
  const fx = makeNumber("Total fixtures", "phr-fx", { step: "1", min: "0", value: "8" });
  fx.input.value = "8";
  const hf = makeNumber("Fixtures needing hot", "phr-hf", { step: "1", min: "0", value: "6" });
  hf.input.value = "6";
  const ar = makeNumber("Average home-run length (ft)", "phr-ar", { step: "any", min: "0", value: "35" });
  ar.input.value = "35";
  const ws = makeNumber("Waste allowance (%)", "phr-ws", { step: "any", min: "0", value: "10" });
  ws.input.value = "10";
  for (const f of [fx, hf, ar, ws]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fx.input.value = "8"; hf.input.value = "6"; ar.input.value = "35"; ws.input.value = "10"; update(); });
  const oPorts = makeOutputLine(outputRegion, "Manifold ports", "phr-out-ports");
  const oTubing = makeOutputLine(outputRegion, "PEX tubing", "phr-out-tubing");
  const update = debounce(() => {
    const r = computePexHomerunTakeoff({
      fixtures: fx.input.value === "" ? 8 : Number(fx.input.value), hot_fixtures: hf.input.value === "" ? 6 : Number(hf.input.value),
      avg_run_ft: ar.input.value === "" ? 35 : Number(ar.input.value), waste_pct: ws.input.value === "" ? 10 : Number(ws.input.value),
    });
    if (r.error) { oPorts.textContent = r.error; oTubing.textContent = "-"; return; }
    oPorts.textContent = fmt(r.total_ports, 0) + " ports (" + fmt(r.cold_ports, 0) + " cold, " + fmt(r.hot_ports, 0) + " hot)";
    oTubing.textContent = fmt(r.tubing_lf, 0) + " LF";
  }, DEBOUNCE_MS);
  for (const f of [fx, hf, ar, ws]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["pex-homerun-takeoff"] = _v906renderPexHomerunTakeoff;

// ===================== spec-v987: solar thermal flat-plate collector output =====================
// dims: in { args: dimensionless } out: { efficiency: dimensionless, useful_btu_per_sqft: dimensionless, useful_btu_hr: dimensionless }
export function computeSolarThermalCollector({ optical_efficiency = 0.70, loss_coeff = 0.85, inlet_temp_f = 120, ambient_temp_f = 70, irradiance_btu = 300, area_sqft = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(optical_efficiency > 0 && optical_efficiency <= 1)) return { error: "Optical efficiency (y-intercept) must be between 0 and 1." };
  if (!(loss_coeff >= 0)) return { error: "Loss coefficient must be non-negative (Btu/hr-ft^2-F)." };
  if (!(irradiance_btu > 0)) return { error: "Solar irradiance must be positive (Btu/hr-ft^2)." };
  if (!(area_sqft > 0)) return { error: "Collector area must be positive (sq ft)." };
  // ASHRAE 93 / Hottel-Whillier-Bliss: eta = FR(ta) - FR*UL*(Ti - Ta)/G, useful heat = G*eta*area (clamped at 0).
  const efficiency = optical_efficiency - loss_coeff * (inlet_temp_f - ambient_temp_f) / irradiance_btu;
  const eff_clamped = Math.max(0, efficiency);
  const useful_btu_per_sqft = irradiance_btu * eff_clamped;
  const useful_btu_hr = useful_btu_per_sqft * area_sqft;
  if (![efficiency, useful_btu_per_sqft, useful_btu_hr].every(Number.isFinite)) return { error: "Collector math is not a finite value." };
  const verdict = efficiency > 0
    ? "The collector delivers useful heat at this operating point."
    : "AT OR BELOW STAGNATION: the collector loses as much as it captures -- no useful heat until the irradiance rises or the inlet temperature drops.";
  return {
    efficiency,
    useful_btu_per_sqft,
    useful_btu_hr,
    verdict,
    note: "The useful heat a flat-plate solar thermal collector delivers at a given operating point, by the ASHRAE 93 / Hottel-Whillier-Bliss efficiency line the SRCC prints on every collector rating: efficiency = optical efficiency (the y-intercept, FR times tau-alpha) minus the loss coefficient (FR times UL, the slope) times (inlet temp minus ambient) divided by the solar irradiance. The optical efficiency (~0.68-0.75 for a good glazed flat plate) is the ceiling when the fluid runs at ambient; the loss term eats into it as the collector runs hotter than the air. With an optical efficiency of 0.70, a loss coefficient of 0.85 Btu/hr-ft^2-F, a 120 F inlet, 70 F ambient, and 300 Btu/hr-ft^2 of sun, efficiency = 0.70 - 0.85 x 50/300 = 0.56, so the collector makes 300 x 0.56 = 168 Btu/hr per sq ft, or 6,700 Btu/hr over 40 sq ft. On a colder, dimmer day (140 F inlet, 40 F ambient, 250 Btu/hr-ft^2) efficiency falls to 0.36 and output to 3,600 Btu/hr -- the collector is least efficient exactly when the heat is needed most. Past the stagnation point (efficiency <= 0) it delivers nothing. An unglazed pool collector has a near-1.0 optical efficiency but a very high loss slope, which is why it works only near ambient. A performance estimate; the actual SRCC-rated intercept and slope, the incidence angle, the flow rate, and the glazing condition govern the real output.",
  };
}

export const solarThermalCollectorExample = { inputs: { optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 120, ambient_temp_f: 70, irradiance_btu: 300, area_sqft: 40 } };

function _v987renderSolarThermalCollector(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: solar thermal flat-plate collector output (ASHRAE 93 / Hottel-Whillier-Bliss efficiency line), by name. eta = optical efficiency - loss coeff x (inlet - ambient)/irradiance; useful heat = irradiance x eta x area. The SRCC-rated intercept and slope, the incidence angle, flow rate, and glazing govern.";
  const oe = makeNumber("Optical efficiency (y-intercept, ~0.70)", "stc-oe", { step: "any", min: "0", max: "1", value: "0.70" });
  oe.input.value = "0.70";
  const lc = makeNumber("Loss coefficient (Btu/hr-ft^2-F, slope)", "stc-lc", { step: "any", min: "0", value: "0.85" });
  lc.input.value = "0.85";
  const it = makeNumber("Fluid inlet temp (F)", "stc-it", { step: "any", value: "120" });
  it.input.value = "120";
  const at = makeNumber("Ambient air temp (F)", "stc-at", { step: "any", value: "70" });
  at.input.value = "70";
  const ir = makeNumber("Solar irradiance (Btu/hr-ft^2)", "stc-ir", { step: "any", min: "0", value: "300" });
  ir.input.value = "300";
  const ar = makeNumber("Collector area (sq ft)", "stc-ar", { step: "any", min: "0", value: "40" });
  ar.input.value = "40";
  for (const f of [oe, lc, it, at, ir, ar]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oe.input.value = "0.70"; lc.input.value = "0.85"; it.input.value = "120"; at.input.value = "70"; ir.input.value = "300"; ar.input.value = "40"; update(); });
  const oE = makeOutputLine(outputRegion, "Collector efficiency", "stc-out-e");
  const oQ = makeOutputLine(outputRegion, "Useful heat output", "stc-out-q");
  const update = debounce(() => {
    const r = computeSolarThermalCollector({
      optical_efficiency: oe.input.value === "" ? 0.70 : Number(oe.input.value), loss_coeff: lc.input.value === "" ? 0.85 : Number(lc.input.value),
      inlet_temp_f: it.input.value === "" ? 120 : Number(it.input.value), ambient_temp_f: at.input.value === "" ? 70 : Number(at.input.value),
      irradiance_btu: ir.input.value === "" ? 300 : Number(ir.input.value), area_sqft: ar.input.value === "" ? 40 : Number(ar.input.value),
    });
    if (r.error) { oE.textContent = r.error; oQ.textContent = "-"; return; }
    oE.textContent = fmt(r.efficiency * 100, 1) + "%";
    oQ.textContent = fmt(r.useful_btu_hr, 0) + " Btu/hr (" + fmt(r.useful_btu_per_sqft, 1) + " per sq ft)";
  }, DEBOUNCE_MS);
  for (const f of [oe, lc, it, at, ir, ar]) f.input.addEventListener("input", update);
}
PLUMBING_RENDERERS["solar-thermal-collector"] = _v987renderSolarThermalCollector;
