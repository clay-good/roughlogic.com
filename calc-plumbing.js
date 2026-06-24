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
  expectedRange: { pressureLoss_psi: { min: 0.5, max: 2.0 } },
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
  expectedRange: { head_ft: { min: 0.2, max: 5 } },
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
  "hydrostatic-test": renderHydrostaticTest,
  "grease-trap": renderGreaseTrap,
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
      const field = f.kind === "select" ? makeSelect(f.label, f.id, f.options) : makeNumber(f.label, f.id, f.attrs || { step: "any" });
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
// dims: in { drain_diameter_in: L, developed_distance_ft: L, table_max_ft: L, trap_seal_in: L } out: { percent_used: dimensionless, within_limit: dimensionless, siphonage_risk: dimensionless, trap_seal_in: L }
export function computeTrapSealLoss({ drain_diameter_in = 0, developed_distance_ft = 0, table_max_ft = 0, trap_seal_in = 2 } = {}) {
  const dia = Number(drain_diameter_in) || 0;
  const dist = Number(developed_distance_ft) || 0;
  const max = Number(table_max_ft) || 0;
  let seal = Number(trap_seal_in); if (!Number.isFinite(seal) || seal < 0) seal = 0;
  if (!(dia > 0 && Number.isFinite(dia))) return { error: "Fixture-drain diameter must be positive (in)." };
  if (!(dist > 0 && Number.isFinite(dist))) return { error: "Developed vent distance must be positive (ft)." };
  if (!(max > 0 && Number.isFinite(max))) return { error: "Permitted trap-to-vent distance must be positive (ft)." };
  const percent_used = (dist / max) * 100;
  const within_limit = dist <= max;
  const siphonage_risk = !within_limit || seal < 1;
  return { percent_used, within_limit, siphonage_risk, trap_seal_in: seal };
}
export const trapSealLossExample = { inputs: { drain_diameter_in: 2, developed_distance_ft: 6, table_max_ft: 8, trap_seal_in: 2 } };
const renderTrapSealLoss = _v23SimpleRenderer({
  citation: "Citation: Per the adopted plumbing code's trap-seal-protection and trap-to-vent distance provisions (IPC §1002 / UPC §1002). The permitted maximum distance is user-supplied from the adopted table; no proprietary table is reproduced. S-traps are out of scope. The AHJ-adopted edition governs. Free read-only at codes.iccsafe.org.",
  example: trapSealLossExample.inputs,
  fields: [
    { key: "drain_diameter_in", label: "Fixture-drain diameter (in)", kind: "number" },
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
// dims: in { peak_demand_gpm: dimensionless, normal_rating_gpm: dimensionless, peak_rating_gpm: dimensionless, available_loss_psi: dimensionless } out: { percent_used: dimensionless, headroom_gpm: dimensionless, adequate: dimensionless, above_peak_rating: dimensionless }
export function computeWaterMeterSizing({ peak_demand_gpm = 0, normal_rating_gpm = 0, peak_rating_gpm = 0, available_loss_psi = 0 } = {}) {
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
export const waterMeterSizingExample = { inputs: { peak_demand_gpm: 30, normal_rating_gpm: 50, peak_rating_gpm: 100, available_loss_psi: 5 } };
const renderWaterMeterSizing = _v23SimpleRenderer({
  citation: "Citation: Per AWWA M22 (Sizing Water Service Lines and Meters) and the AWWA C700-series meter standards. Meter flow ranges are user-supplied for the candidate size; the available pressure loss must be the drop across the meter, not the static pressure. Free guidance summaries at awwa.org.",
  example: waterMeterSizingExample.inputs,
  fields: [
    { key: "peak_demand_gpm", label: "Peak demand (gpm)", kind: "number" },
    { key: "normal_rating_gpm", label: "Meter normal-flow rating (gpm)", kind: "number" },
    { key: "peak_rating_gpm", label: "Meter peak-flow rating (gpm, optional)", kind: "number" },
    { key: "available_loss_psi", label: "Available pressure loss across meter (psi)", kind: "number" },
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

// --- spec-v62 roof-drain-sizing / sump-basin-sizing -> relocated to calc-drainage.js (spec-v73 split) ---

// --- spec-v63 gas-appliance-demand / tpr-discharge + spec-v64 pipe-support-spacing / softener-sizing -> relocated to calc-service.js (spec-v78 split) ---

// --- spec-v83 onsite-septic pressure-distribution bench (septic-dose-tank, septic-pumpout-interval, septic-lpp-orifice) -> relocated to calc-septic.js (spec-v86 split) ---
