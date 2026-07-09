// Group C: HVAC calculators (utilities 21 through 31).
//
// Manual J cooling and heating estimators (utilities 21 and 22) are
// simplified and run in a Web Worker. Every Manual J view carries the
// inline notice that the result is a simplified estimate and that a
// code-compliant load calculation requires Manual J.

import {
  darcyWeisbachFrictionLoss,
  hazenWilliamsFrictionLoss,
  psychrometric,
  saturationVaporPressure_hPa,
  F_to_C,
} from "./pure-math.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

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


// --- Utility 21 + 22: Manual J Cooling/Heating (simplified) ---
//
// The full Manual J methodology is licensed by ACCA. This is a simplified
// engineering estimator using the underlying physics: conductive transmission
// through the envelope, infiltration, internal gains, latent and solar load
// fractions. The output is for sizing-orientation only; a code-compliant
// load calculation requires Manual J.

// U-factor presets (BTU/hr*ft^2*F) drawn from typical engineering references.
// These are physical heat-transfer coefficients, not ASHRAE table reproductions.
export const U_FACTORS = {
  wall: { poor: 0.20, average: 0.10, good: 0.06 },
  ceiling: { poor: 0.10, average: 0.05, good: 0.03 },
  floor: { poor: 0.15, average: 0.08, good: 0.04 },
  window: { single: 1.10, double: 0.50, triple: 0.30 },
};

// dims: in { args: dimensionless } out: { cooling_load_btuhr: M L^2 T^-3, sensible_btuhr: M L^2 T^-3, latent_btuhr: M L^2 T^-3 }
export function manualJCooling({
  floor_area_ft2,
  wall_area_ft2,
  window_area_ft2,
  ceiling_area_ft2,
  insulation_level = "average",
  window_type = "double",
  occupants = 2,
  outdoor_design_F,
  indoor_design_F = 75,
  solar_factor = 30,
  ach = 0.5,
  ceiling_height_ft = 8,
  outdoor_RH_percent = 50,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dT = Math.max(0, outdoor_design_F - indoor_design_F);
  const Uw = U_FACTORS.wall[insulation_level];
  const Uc = U_FACTORS.ceiling[insulation_level];
  const Uf = U_FACTORS.floor[insulation_level];
  const Uwin = U_FACTORS.window[window_type];

  const conductive_BTU_hr =
    Uw * wall_area_ft2 * dT +
    Uc * ceiling_area_ft2 * dT +
    Uf * floor_area_ft2 * (dT * 0.3) +
    Uwin * window_area_ft2 * dT;

  const solar_BTU_hr = solar_factor * window_area_ft2;

  const internal_gain_BTU_hr = occupants * 230 + floor_area_ft2 * 0.5;

  const volume_ft3 = floor_area_ft2 * ceiling_height_ft;
  // 1.08 = sensible heat factor for air at standard conditions.
  const infiltration_BTU_hr = 1.08 * (ach * volume_ft3) / 60 * dT;

  const sensible_BTU_hr = conductive_BTU_hr + solar_BTU_hr + internal_gain_BTU_hr + infiltration_BTU_hr;

  // Latent load: outdoor humidity above indoor target drives moisture removal.
  // 0.68 = latent factor at standard conditions; convert RH to grains/lb diff.
  const indoor = psychrometric({ T_C: F_to_C(indoor_design_F), RH_percent: 50 });
  const outdoor = psychrometric({ T_C: F_to_C(outdoor_design_F), RH_percent: outdoor_RH_percent });
  const dW_grains_per_lb = Math.max(0, outdoor.GPP - indoor.GPP);
  const latent_BTU_hr = 0.68 * (ach * volume_ft3) / 60 * dW_grains_per_lb;

  const total_BTU_hr = sensible_BTU_hr + latent_BTU_hr;
  const tons = total_BTU_hr / 12000;

  return {
    conductive_BTU_hr,
    solar_BTU_hr,
    internal_gain_BTU_hr,
    infiltration_BTU_hr,
    sensible_BTU_hr,
    latent_BTU_hr,
    total_BTU_hr,
    tons,
    SHR: total_BTU_hr > 0 ? sensible_BTU_hr / total_BTU_hr : null,
  };
}

export const manualJCoolingExample = {
  inputs: {
    floor_area_ft2: 1500, wall_area_ft2: 1200, window_area_ft2: 200, ceiling_area_ft2: 1500,
    insulation_level: "average", window_type: "double", occupants: 4, outdoor_design_F: 95, indoor_design_F: 75,
  },
  expectedRange: { tons: { min: 1.5, max: 6 } },
};

// dims: in { args: dimensionless } out: { heating_load_btuhr: M L^2 T^-3 }
export function manualJHeating({
  floor_area_ft2,
  wall_area_ft2,
  window_area_ft2,
  ceiling_area_ft2,
  insulation_level = "average",
  window_type = "double",
  outdoor_design_F,
  indoor_design_F = 70,
  ach = 0.5,
  ceiling_height_ft = 8,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dT = Math.max(0, indoor_design_F - outdoor_design_F);
  const Uw = U_FACTORS.wall[insulation_level];
  const Uc = U_FACTORS.ceiling[insulation_level];
  const Uf = U_FACTORS.floor[insulation_level];
  const Uwin = U_FACTORS.window[window_type];

  const conductive_BTU_hr =
    Uw * wall_area_ft2 * dT +
    Uc * ceiling_area_ft2 * dT +
    Uf * floor_area_ft2 * (dT * 0.5) +
    Uwin * window_area_ft2 * dT;

  const volume_ft3 = floor_area_ft2 * ceiling_height_ft;
  const infiltration_BTU_hr = 1.08 * (ach * volume_ft3) / 60 * dT;

  const total_BTU_hr = conductive_BTU_hr + infiltration_BTU_hr;
  // v8 §C.3: surface tons alongside BTU/hr (1 ton = 12 000 BTU/hr).
  // Heat-pump sizing typically reads in tons; gas furnaces in BTU/hr.
  // Showing both eliminates a mental conversion at a sizing decision.
  const tons = total_BTU_hr / 12000;
  return {
    conductive_BTU_hr,
    infiltration_BTU_hr,
    total_BTU_hr,
    tons,
  };
}

export const manualJHeatingExample = {
  inputs: {
    floor_area_ft2: 1500, wall_area_ft2: 1200, window_area_ft2: 200, ceiling_area_ft2: 1500,
    insulation_level: "average", window_type: "double", outdoor_design_F: 10, indoor_design_F: 70,
  },
};

// --- Utility 23: Duct Sizing ---
//
// From CFM and friction rate, compute required round duct diameter using
// Darcy-Weisbach with standard surface roughness. Equivalent rectangular
// dimensions via the standard equivalent-diameter formula.

const AIR_DENSITY_LB_FT3 = 0.075;
const DUCT_ROUGHNESS_FT = 0.0003; // galvanized steel default

// dims: in { cfm: L^3 T^-1, friction_in_wc_per_100ft: dimensionless, roughness_ft: L } out: { diameter_in: L, velocity_fpm: L T^-1 }
export function computeDuctSize({ cfm, friction_in_wc_per_100ft = 0.08, roughness_ft = DUCT_ROUGHNESS_FT }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (cfm <= 0 || friction_in_wc_per_100ft <= 0) return { error: "Provide positive CFM and friction rate." };

  // Solve d (in inches) such that Darcy-Weisbach friction rate equals target.
  // 1 in w.c./100 ft = 5.197 lb/ft^2 / 100 ft = 0.05197 lb/ft^3 of head loss along pipe.
  // Convert h_f (m) per L (m) to in w.c. per 100 ft: 1 m of air column ~ unchanged
  // because air density is fixed; instead compute pressure drop directly.
  // Pressure loss per 100 ft: dP_pa = f * (100*0.3048 / d_m) * 0.5 * rho_air * v^2
  // dP_in_wc = dP_pa / 248.84

  const rho_air = 1.204; // SI for default
  const mu = 1.825e-5;

  let d_m_low = 0.05, d_m_high = 1.5;
  for (let i = 0; i < 60; i++) {
    const d_m = (d_m_low + d_m_high) / 2;
    const A = Math.PI * (d_m / 2) ** 2;
    const Q_m3_s = (cfm * 0.000471947);
    const v = Q_m3_s / A;
    const Re = (rho_air * v * d_m) / mu;
    let f;
    if (Re < 2300) f = 64 / Re;
    else {
      let invSqrtF = -2 * Math.log10((roughness_ft * 0.3048) / d_m / 3.7 + 2.51 / (Re * 0.04));
      for (let k = 0; k < 20; k++) {
        const fk = 1 / (invSqrtF * invSqrtF);
        invSqrtF = -2 * Math.log10((roughness_ft * 0.3048) / d_m / 3.7 + 2.51 / (Re * Math.sqrt(fk)));
      }
      f = 1 / (invSqrtF * invSqrtF);
    }
    const L_m = 100 * 0.3048;
    const dP_pa = f * (L_m / d_m) * 0.5 * rho_air * v * v;
    const dP_in_wc = dP_pa / 248.84;
    if (dP_in_wc > friction_in_wc_per_100ft) d_m_low = d_m; else d_m_high = d_m;
  }
  const d_in = ((d_m_low + d_m_high) / 2) / 0.0254;

  // Equivalent rectangular: D_e = 1.30 * (a*b)^0.625 / (a+b)^0.250
  // For a square duct s, D_e = 1.30 * s^1.25 / (2s)^0.25 = 1.30 * s / 2^0.25 = 1.0925 * s.
  // So square s = D_e / 1.0925.
  const square_in = d_in / 1.0925;

  // v8 §C.3: friction-rate benchmark color so the renderer can show a
  // green / yellow / red badge against ACCA Manual D typical bands.
  // green ≤ 0.08 in WC/100 ft; yellow 0.08-0.12; red > 0.12.
  let friction_color, friction_label;
  if (friction_in_wc_per_100ft <= 0.08) { friction_color = "green"; friction_label = "low (<= 0.08 in WC / 100 ft; quiet, lower static)"; }
  else if (friction_in_wc_per_100ft <= 0.12) { friction_color = "yellow"; friction_label = "moderate (0.08-0.12 in WC / 100 ft; typical residential)"; }
  else { friction_color = "red"; friction_label = "high (> 0.12 in WC / 100 ft; check noise + AHU static budget)"; }
  // spec-v27 EN: residential velocity ceiling check (ACCA Manual D / SMACNA):
  // trunk <= 900 fpm, branch <= 600 fpm. Additive; reported alongside the
  // friction band so the prior output is unchanged.
  const velocity_fpm = (cfm / (Math.PI * (d_in / 12 / 2) ** 2));
  const within_trunk = velocity_fpm <= 900;
  const within_branch = velocity_fpm <= 600;
  let velocity_label;
  if (within_branch) velocity_label = "within branch ceiling (<= 600 fpm) and trunk ceiling (<= 900 fpm)";
  else if (within_trunk) velocity_label = "within trunk ceiling (<= 900 fpm) but over the 600 fpm branch ceiling";
  else velocity_label = "over the 900 fpm trunk ceiling (check noise/comfort)";
  return {
    round_diameter_in: d_in,
    velocity_fpm,
    equivalent_square_in: square_in,
    friction_color,
    friction_label,
    velocity_within_trunk: within_trunk,
    velocity_within_branch: within_branch,
    velocity_label,
  };
}

export const ductSizingExample = {
  inputs: { cfm: 400, friction_in_wc_per_100ft: 0.08 },
  expectedRange: { round_diameter_in: { min: 8, max: 14 } },
};

// --- Utility 24: Static Pressure (HVAC) ---

// dims: in { elements: dimensionless } out: { total_static_in_wc: M L^-1 T^-2 }
export function computeStaticPressureHvac({ elements }) {
  // elements: array of { name, dp_in_wc }.
  let total = 0;
  for (const e of elements || []) total += Number(e.dp_in_wc) || 0;
  return { total_in_wc: total, items: elements || [] };
}

export const staticPressureHvacExample = {
  inputs: { elements: [
    { name: "Filter", dp_in_wc: 0.10 },
    { name: "Coil", dp_in_wc: 0.30 },
    { name: "Supply duct", dp_in_wc: 0.20 },
    { name: "Return duct", dp_in_wc: 0.10 },
  ]},
  expected: { total_in_wc: 0.70 },
};

// --- Utility 27: SEER and EER Conversion ---

// dims: in { value: dimensionless, from: dimensionless, cooling_load_btu_hr: M L^2 T^-3, annual_hours: dimensionless, electricity_rate: dimensionless } out: { seer: dimensionless, eer: dimensionless, annual_kwh: dimensionless, annual_cost_usd: dimensionless }
export function computeSeerEer({ value, from, cooling_load_btu_hr = 0, annual_hours = 0, electricity_rate = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Common engineering approximation: SEER ~ EER * 1.12 (averaged across rating conditions).
  // This is an estimate; actual conversion depends on rating method.
  // The 0.95 factor is the ~4.5% DOE 10 CFR 430 App. M1 external-static delta
  // (SEER2 ~ SEER * 0.95), user-confirmable against the nameplate.
  let out, seer;
  if (from === "EER") { seer = value * 1.12; out = { SEER: seer, SEER2_estimate: value * 1.12 * 0.95 }; }
  else if (from === "SEER") { seer = value; out = { EER: value / 1.12, EER2_estimate: (value / 1.12) * 0.95 }; }
  else if (from === "SEER2") { seer = value / 0.95; out = { SEER: value / 0.95, EER: (value / 0.95) / 1.12 }; }
  else if (from === "EER2") { seer = (value / 0.95) * 1.12; out = { EER: value / 0.95, SEER: (value / 0.95) * 1.12 }; }
  else return { error: "Unknown rating system." };
  // v23 EN.1: optional annual-kWh / $ cross-check from a cooling load + rate.
  // annual_kWh = load_BTU/hr * hours / (SEER * 1000). Default (no load) omits it.
  const load = Number(cooling_load_btu_hr) || 0, hrs = Number(annual_hours) || 0, rate = Number(electricity_rate) || 0;
  let annual_kwh = null, annual_cost_usd = null;
  if (load > 0 && hrs > 0 && seer > 0 && Number.isFinite(load) && Number.isFinite(hrs) && Number.isFinite(seer)) {
    const kwh = (load * hrs) / (seer * 1000);
    if (Number.isFinite(kwh)) {
      annual_kwh = kwh;
      if (rate > 0 && Number.isFinite(rate)) annual_cost_usd = kwh * rate;
    }
  }
  return { ...out, annual_kwh, annual_cost_usd };
}

export const seerEerExample = {
  inputs: { value: 12, from: "EER" },
  expectedRange: { SEER: { min: 13, max: 14 } },
};

// --- Utility 28: Heat Pump Balance Point ---

// dims: in { heating_capacity_btu_hr_at_design: M L^2 T^-3, design_outdoor_F: T, building_heat_loss_btu_hr: M L^2 T^-3, indoor_F: T } out: { balance_point_F: T, aux_heat_btu_hr: M L^2 T^-3, aux_strip_kw: dimensionless }
export function computeBalancePoint({ heating_capacity_btu_hr_at_design, design_outdoor_F, building_heat_loss_btu_hr, indoor_F = 65 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Capacity falls roughly linearly with outdoor temperature; building load
  // is linear in (indoor - outdoor). Solve for outdoor temp where they meet.
  // Capacity model: Q_cap(T) = Q_design + slope * (T - design_F).
  // Use a simple slope: capacity rises 1 percent per degree F above design.
  const slope_capacity = heating_capacity_btu_hr_at_design * 0.01;
  const slope_load = building_heat_loss_btu_hr / Math.max(1, (indoor_F - design_outdoor_F));
  // Q_cap(T) = Q_design + s_c * (T - design); Q_load(T) = s_l * (indoor - T)
  // Solve s_c*(T - d) + Q_d = s_l*(indoor - T)
  // T*(s_c + s_l) = s_l*indoor + s_c*d - Q_d
  const T = (slope_load * indoor_F + slope_capacity * design_outdoor_F - heating_capacity_btu_hr_at_design) / (slope_capacity + slope_load);
  // v23 EN.3: supplemental (strip) heat required at the design condition.
  // Q_aux = design heat loss - heat-pump capacity at design (>= 0); kW = Q_aux / 3412.
  let aux_heat_btu_hr = Math.max(0, building_heat_loss_btu_hr - heating_capacity_btu_hr_at_design);
  if (!Number.isFinite(aux_heat_btu_hr)) aux_heat_btu_hr = null;
  const aux_strip_kw = aux_heat_btu_hr === null ? null : aux_heat_btu_hr / 3412;
  return { balance_point_F: T, aux_heat_btu_hr, aux_strip_kw };
}

export const balancePointExample = {
  inputs: { heating_capacity_btu_hr_at_design: 30000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 },
};

// --- Utility 29: Sensible Heat Ratio ---

// dims: in { sensible_btu_hr: M L^2 T^-3, total_btu_hr: M L^2 T^-3 } out: { shr: dimensionless }
export function computeSHR({ sensible_btu_hr, total_btu_hr }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (total_btu_hr <= 0) return { error: "Total load must be positive." };
  return { SHR: sensible_btu_hr / total_btu_hr };
}

export const shrExample = {
  inputs: { sensible_btu_hr: 24000, total_btu_hr: 30000 },
  expected: { SHR: 0.8 },
};

// --- Utility 30: CFM per Ton ---

// dims: in { tons: dimensionless, climate: dimensionless } out: { cfm: L^3 T^-1, cfm_per_ton: dimensionless }
export function computeCfmPerTon({ tons, climate = "standard" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const map = {
    dry:      { factor: 450, label: "Dry climate", hint: "high SHR (~0.85+); raise CFM to keep coil warmer and avoid over-dehumidification." },
    standard: { factor: 400, label: "Standard / mixed", hint: "typical SHR 0.75-0.80; default ACCA Manual S target." },
    humid:    { factor: 350, label: "Humid climate", hint: "low SHR (<0.75); reduce CFM to drive more latent removal." },
  };
  // v8 §C.3: explicit climate-selector input mode with a one-line hint.
  const m = map[climate] || map.standard;
  if (!(tons > 0)) return { error: "Tons must be positive." };
  return {
    cfm_per_ton: m.factor,
    total_cfm: tons * m.factor,
    climate_label: m.label,
    climate_hint: m.hint,
  };
}

export const cfmPerTonExample = {
  inputs: { tons: 3, climate: "standard" },
  expected: { total_cfm: 1200 },
};

// --- Utility 31: Combustion Air ---

// dims: in { btu_input: M L^2 T^-3, room_volume_ft3: L^3 } out: { required_volume_ft3: L^3, sufficient: dimensionless }
export function computeCombustionAir({ btu_input, room_volume_ft3 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // If room volume >= 50 ft^3 per 1000 BTU/hr, combustion air is "adequate
  // by volume" (standard rule of thumb). Otherwise combustion air must be
  // supplied; opening size approx 1 in^2 per 1000 BTU/hr from outside,
  // or 1 in^2 per 4000 BTU/hr from indoor adjacent communicating spaces.
  const required_volume_ft3 = (btu_input / 1000) * 50;
  const adequate_by_volume = room_volume_ft3 >= required_volume_ft3;
  const opening_outdoor_in2 = btu_input / 1000;
  const opening_indoor_in2 = btu_input / 4000;
  return { required_volume_ft3, adequate_by_volume, opening_outdoor_in2, opening_indoor_in2 };
}

export const combustionAirExample = {
  inputs: { btu_input: 100000, room_volume_ft3: 4000 },
};

// =====================================================================
// v2 utilities (79-85): spec-v2.md section 2 Group C extensions.
// =====================================================================

// --- Utility 80: Approach and delta-T Diagnostics ---

// dims: in { value: dimensionless, low: dimensionless, high: dimensionless } out: { band: dimensionless }
export function bandLabel(value, low, high) {
  if (value < low) return "low";
  if (value > high) return "high";
  return "normal";
}

// dims: in { args: dimensionless } out: { approach_F: T, delta_t_F: T, band: dimensionless }
export function computeApproachDeltaT({
  outdoor_F, condenser_saturation_F, supply_F, return_F,
  approach_normal_low = 5, approach_normal_high = 20,
  delta_T_normal_low = 16, delta_T_normal_high = 22,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const approach = condenser_saturation_F - outdoor_F;
  const delta_T = return_F - supply_F;
  return {
    approach_F: approach,
    approach_band: bandLabel(approach, approach_normal_low, approach_normal_high),
    delta_T_F: delta_T,
    delta_T_band: bandLabel(delta_T, delta_T_normal_low, delta_T_normal_high),
  };
}

export const approachDeltaTExample = {
  inputs: { outdoor_F: 90, condenser_saturation_F: 105, supply_F: 55, return_F: 75 },
  expected: { approach_F: 15, delta_T_F: 20 },
};

// --- Utility 81: Outdoor Air Mix ---
//
// mixed_T = OA_fraction * OA_T + (1 - OA_fraction) * RA_T
// mixed_W = mass-mixing of humidity ratios from psychrometric helpers.

// dims: in { return_T_F: T, return_RH_percent: dimensionless, outdoor_T_F: T, outdoor_RH_percent: dimensionless, oa_fraction: dimensionless } out: { mixed_T_F: T, mixed_RH_percent: dimensionless }
export function computeOutdoorAirMix({ return_T_F, return_RH_percent, outdoor_T_F, outdoor_RH_percent, oa_fraction }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const f = Math.max(0, Math.min(1, Number(oa_fraction) || 0));
  const ra_T_C = F_to_C(return_T_F);
  const oa_T_C = F_to_C(outdoor_T_F);
  const ra = psychrometric({ T_C: ra_T_C, RH_percent: return_RH_percent });
  const oa = psychrometric({ T_C: oa_T_C, RH_percent: outdoor_RH_percent });
  const mixed_T_F = f * outdoor_T_F + (1 - f) * return_T_F;
  const mixed_W = f * oa.W_kg_kg + (1 - f) * ra.W_kg_kg;
  const mixed_GPP = mixed_W * 7000;
  return {
    mixed_T_F, mixed_W_kg_kg: mixed_W, mixed_GPP,
    return_W_kg_kg: ra.W_kg_kg, outdoor_W_kg_kg: oa.W_kg_kg, oa_fraction: f,
  };
}

export const outdoorAirMixExample = {
  inputs: { return_T_F: 75, return_RH_percent: 50, outdoor_T_F: 95, outdoor_RH_percent: 60, oa_fraction: 0.2 },
  expectedRange: { mixed_T_F: { min: 78.9, max: 79.1 } },
};

// --- Utility 82: Equivalent Length of Fittings ---

export const FITTING_EQUIVALENT_LENGTH_FT = {
  elbow_90_long: { "0.5": 1.0, "0.75": 1.4, "1": 1.7, "1.25": 2.3, "1.5": 2.7, "2": 3.5 },
  elbow_90_short: { "0.5": 1.5, "0.75": 2.0, "1": 2.5, "1.25": 3.5, "1.5": 4.0, "2": 5.0 },
  elbow_45: { "0.5": 0.8, "0.75": 1.0, "1": 1.3, "1.25": 1.7, "1.5": 2.0, "2": 2.6 },
  tee_branch: { "0.5": 4.0, "0.75": 5.0, "1": 6.0, "1.25": 7.0, "1.5": 8.0, "2": 10.0 },
  tee_run: { "0.5": 1.0, "0.75": 1.4, "1": 1.7, "1.25": 2.3, "1.5": 2.7, "2": 3.5 },
  gate_valve: { "0.5": 0.4, "0.75": 0.5, "1": 0.6, "1.25": 0.8, "1.5": 1.0, "2": 1.2 },
  ball_valve: { "0.5": 0.3, "0.75": 0.4, "1": 0.5, "1.25": 0.7, "1.5": 0.9, "2": 1.1 },
  check_valve: { "0.5": 4.0, "0.75": 5.0, "1": 7.0, "1.25": 9.0, "1.5": 11.0, "2": 13.0 },
};

// dims: in { items: dimensionless } out: { equivalent_length_ft: L }
export function computeEquivalentLength({ items = [] }) {
  let total = 0;
  const detail = [];
  for (const it of items) {
    const t = FITTING_EQUIVALENT_LENGTH_FT[it.type];
    if (!t) return { error: "Unknown fitting type: " + it.type };
    const ft = t[String(it.diameter)];
    if (ft === undefined) return { error: "Unknown diameter for " + it.type + ": " + it.diameter };
    const c = Number(it.count) || 0;
    total += ft * c;
    detail.push({ type: it.type, diameter: it.diameter, count: c, equivalent_ft_each: ft });
  }
  return { total_equivalent_ft: total, items: detail };
}

export const equivalentLengthExample = {
  inputs: { items: [
    { type: "elbow_90_long", diameter: "1", count: 4 },
    { type: "tee_branch", diameter: "1", count: 1 },
  ] },
  expected: { total_equivalent_ft: 4 * 1.7 + 1 * 6.0 },
};

// --- Utility 83: Wet-Bulb / Sling Psychrometer ---
//
// Solve for RH given dry-bulb (Td) and wet-bulb (Tw) using the standard
// psychrometric wet-bulb relation:
//   e = e_s(Tw) - A * P * (Td - Tw)
// where A is the psychrometric constant ~ 0.000662 1/C at sea-level
// pressure (1013.25 hPa). RH = e / e_s(Td).

// dims: in { dry_bulb_F: T, wet_bulb_F: T, P_hPa: M L^-1 T^-2 } out: { rh_percent: dimensionless, dewpoint_F: T, humidity_ratio: dimensionless }
export function computeWetBulbPsychrometer({ dry_bulb_F, wet_bulb_F, P_hPa = 1013.25 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Td_C = F_to_C(dry_bulb_F);
  const Tw_C = F_to_C(wet_bulb_F);
  if (Tw_C > Td_C) return { error: "Wet-bulb cannot exceed dry-bulb." };
  const e_sw = saturationVaporPressure_hPa(Tw_C);
  const A = 0.000662; // 1/C
  const e = e_sw - A * P_hPa * (Td_C - Tw_C);
  const e_sd = saturationVaporPressure_hPa(Td_C);
  const RH = Math.max(0, Math.min(100, (e / e_sd) * 100));
  // dew point from e:
  const ln = Math.log(Math.max(1e-9, e) / 6.1094);
  const dew_C = (243.04 * ln) / (17.625 - ln);
  const W = (0.622 * e) / (P_hPa - e);
  const GPP = W * 7000;
  return { RH_percent: RH, dew_point_F: dew_C * 9 / 5 + 32, GPP };
}

export const wetBulbPsychrometerExample = {
  inputs: { dry_bulb_F: 80, wet_bulb_F: 67 },
  expectedRange: { RH_percent: { min: 40, max: 60 } },
};

// --- Utility 84: Pipe Insulation Thickness ---
//
// Q = 2*pi*k*L*dT / ln(r2/r1) per unit length L=1.
// Outer surface temperature is governed by ambient + Q*R_out where R_out
// is the outside film resistance. For estimation, iterate on r2 (i.e.
// thickness = r2 - r1) until Q matches a target heat loss that yields
// the desired surface temperature for a given outside film coefficient.
//
// For this calculator we accept ambient_F, surface_temp_limit_F, and pipe
// surface_temp_F (the warmer surface), insulation k (BTU*in/hr*ft^2*F),
// pipe outer diameter d_in. We solve for thickness such that the steady
// outer surface is below the limit, with an outside film coefficient of
// 1.65 BTU/hr/ft^2/F (still air on a horizontal pipe, public engineering
// reference value).

// dims: in { args: dimensionless } out: { thickness_in: L, r_value: dimensionless }
export function computeInsulationThickness({
  pipe_od_in, surface_temp_F, ambient_F, surface_limit_F, k_btu_in_per_hr_ft2_F,
  outside_film_coeff_btu_hr_ft2_F = 1.65,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r1 = pipe_od_in / 2;
  const dT = surface_temp_F - ambient_F;
  if (dT <= 0) return { error: "Pipe surface must exceed ambient." };
  const allowable_outer_dT = surface_limit_F - ambient_F;
  if (allowable_outer_dT <= 0) return { error: "Surface limit must exceed ambient." };
  // Iterate r2 such that q (per ft) flows through insulation and equals
  // outside film flux at allowable surface dT:
  //   q_through = 2*pi*k*(Td - Tsurf) / ln(r2/r1)  (k converted to per inch)
  //   q_out     = h * A_out * dT_out = h * (pi*2*r2/12) * allowable_outer_dT
  // Set Td - Tsurf = surface_temp_F - surface_limit_F.
  // Solve for r2.
  const k = k_btu_in_per_hr_ft2_F; // BTU * in / (hr ft^2 F)
  const Td_minus_Ts = surface_temp_F - surface_limit_F;
  if (Td_minus_Ts <= 0) {
    return { error: "Surface limit must be below pipe surface temp." };
  }
  // Bisection on r2 in inches.
  let lo = r1 + 1e-3;
  let hi = r1 + 12;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const q_through = (2 * Math.PI * k * Td_minus_Ts) / Math.log(mid / r1);
    const q_out = outside_film_coeff_btu_hr_ft2_F * (Math.PI * 2 * mid / 12) * allowable_outer_dT;
    if (q_through > q_out) lo = mid; else hi = mid;
  }
  const r2 = (lo + hi) / 2;
  const thickness_in = r2 - r1;
  return { thickness_in, r2_in: r2, r1_in: r1 };
}

export const insulationThicknessExample = {
  inputs: { pipe_od_in: 1, surface_temp_F: 250, ambient_F: 75, surface_limit_F: 120, k_btu_in_per_hr_ft2_F: 0.27 },
  expectedRange: { thickness_in: { min: 0.4, max: 3.0 } },
};

// --- Utility 85: Latent Heat Evaporative Cooling ---
//
// Q (BTU/hr) = mass_flow (lb/hr) * h_fg (BTU/lb)
// h_fg of water ~ 1054 BTU/lb at typical evaporation conditions.

export const HFG_WATER_BTU_PER_LB = 1054;

// dims: in { evaporation_rate_lb_hr: M T^-1, hfg_btu_per_lb: dimensionless } out: { cooling_btu_hr: M L^2 T^-3 }
export function computeEvaporativeCooling({ evaporation_rate_lb_hr, hfg_btu_per_lb = HFG_WATER_BTU_PER_LB }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const m = Number(evaporation_rate_lb_hr) || 0;
  if (m <= 0) return { error: "Evaporation rate must be positive." };
  const Q = m * hfg_btu_per_lb;
  return { cooling_btu_hr: Q, cooling_tons: Q / 12000 };
}

export const evaporativeCoolingExample = {
  inputs: { evaporation_rate_lb_hr: 10 },
  expected: { cooling_btu_hr: 10540 },
};

// --- v2 view renderers ---

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderApproachDeltaT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Approach = T_sat_cond - T_outdoor; delta-T = T_return - T_supply. Bands from public engineering practice.";
  const od = makeNumber("Outdoor air (F)", "ad-od", { step: "any" });
  const sat = makeNumber("Condenser saturation (F)", "ad-sat", { step: "any" });
  const supply = makeNumber("Supply air (F)", "ad-supply", { step: "any" });
  const ret = makeNumber("Return air (F)", "ad-return", { step: "any" });
  for (const f of [od, sat, supply, ret]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "90"; sat.input.value = "105"; supply.input.value = "55"; ret.input.value = "75"; update(); });
  const oA = makeOutputLine(outputRegion, "Approach", "ad-out-a");
  const oAB = makeOutputLine(outputRegion, "Approach band", "ad-out-ab");
  const oD = makeOutputLine(outputRegion, "Delta-T", "ad-out-d");
  const oDB = makeOutputLine(outputRegion, "Delta-T band", "ad-out-db");
  const update = debounce(() => {
    const r = computeApproachDeltaT({
      outdoor_F: Number(od.input.value) || 0,
      condenser_saturation_F: Number(sat.input.value) || 0,
      supply_F: Number(supply.input.value) || 0,
      return_F: Number(ret.input.value) || 0,
    });
    oA.textContent = fmt(r.approach_F, 1) + " F";
    oAB.textContent = r.approach_band;
    oD.textContent = fmt(r.delta_T_F, 1) + " F";
    oDB.textContent = r.delta_T_band;
  }, DEBOUNCE_MS);
  for (const el of [od.input, sat.input, supply.input, ret.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOutdoorAirMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Mixed air dry-bulb is OA_fraction-weighted; mixed humidity ratio is mass-weighted via the psychrometric helpers.";
  // v10 §B.3 wiring: simplified-screening banner (ASHRAE 62.1 disclaimer).
  renderLimitationBanner(inputRegion, getLimitationCopy("outdoor-air-mix"));
  const rt = makeNumber("Return air temp (F)", "om-rt", { step: "any" });
  const rh = makeNumber("Return RH (%)", "om-rh", { step: "any", min: "0", max: "100" });
  const ot = makeNumber("Outdoor air temp (F)", "om-ot", { step: "any" });
  const oh = makeNumber("Outdoor RH (%)", "om-oh", { step: "any", min: "0", max: "100" });
  const f = makeNumber("OA fraction (0-1)", "om-f", { step: "any", min: "0", max: "1" });
  for (const x of [rt, rh, ot, oh, f]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { rt.input.value = "75"; rh.input.value = "50"; ot.input.value = "95"; oh.input.value = "60"; f.input.value = "0.2"; update(); });
  const oT = makeOutputLine(outputRegion, "Mixed dry-bulb", "om-out-t");
  const oG = makeOutputLine(outputRegion, "Mixed grains", "om-out-g");
  const update = debounce(() => {
    const r = computeOutdoorAirMix({
      return_T_F: Number(rt.input.value) || 0,
      return_RH_percent: Number(rh.input.value) || 0,
      outdoor_T_F: Number(ot.input.value) || 0,
      outdoor_RH_percent: Number(oh.input.value) || 0,
      oa_fraction: Number(f.input.value) || 0,
    });
    oT.textContent = fmt(r.mixed_T_F, 2) + " F";
    oG.textContent = fmt(r.mixed_GPP, 1) + " GPP";
  }, DEBOUNCE_MS);
  for (const el of [rt.input, rh.input, ot.input, oh.input, f.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderEquivalentLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public engineering equivalent-length tables for common fittings and valves.";
  const type = makeSelect("Fitting type", "el-t", Object.keys(FITTING_EQUIVALENT_LENGTH_FT).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const dia = makeSelect("Diameter (in)", "el-d", ["0.5", "0.75", "1", "1.25", "1.5", "2"].map((s) => ({ value: s, label: s })));
  const cnt = makeNumber("Count", "el-c", { step: "1", min: "0", value: "1" });
  cnt.input.value = "1";
  for (const f of [type, dia, cnt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "elbow_90_long"; dia.select.value = "1"; cnt.input.value = "4"; update(); });
  const oT = makeOutputLine(outputRegion, "Total equivalent length", "el-out-t");
  const oE = makeOutputLine(outputRegion, "Per fitting", "el-out-e");
  const update = debounce(() => {
    const r = computeEquivalentLength({
      items: [{ type: type.select.value, diameter: dia.select.value, count: Number(cnt.input.value) || 0 }],
    });
    if (r.error) { oT.textContent = r.error; oE.textContent = "-"; return; }
    oT.textContent = fmt(r.total_equivalent_ft, 2) + " ft";
    oE.textContent = r.items.length ? fmt(r.items[0].equivalent_ft_each, 2) + " ft" : "-";
  }, DEBOUNCE_MS);
  for (const el of [type.select, dia.select, cnt.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderWetBulbPsychrometer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard psychrometric wet-bulb relation e = e_s(Tw) - A * P * (Td - Tw); A ~ 0.000662 1/C at sea level.";
  const td = makeNumber("Dry-bulb (F)", "wb-td", { step: "any" });
  const tw = makeNumber("Wet-bulb (F)", "wb-tw", { step: "any" });
  for (const f of [td, tw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { td.input.value = "80"; tw.input.value = "67"; update(); });
  const oRH = makeOutputLine(outputRegion, "Relative humidity", "wb-out-rh");
  const oDP = makeOutputLine(outputRegion, "Dew point", "wb-out-dp");
  const oG = makeOutputLine(outputRegion, "GPP", "wb-out-g");
  const update = debounce(() => {
    const r = computeWetBulbPsychrometer({
      dry_bulb_F: Number(td.input.value) || 0,
      wet_bulb_F: Number(tw.input.value) || 0,
    });
    if (r.error) { oRH.textContent = r.error; oDP.textContent = "-"; oG.textContent = "-"; return; }
    oRH.textContent = fmt(r.RH_percent, 1) + " %";
    oDP.textContent = fmt(r.dew_point_F, 1) + " F";
    oG.textContent = fmt(r.GPP, 1);
  }, DEBOUNCE_MS);
  for (const el of [td.input, tw.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderInsulationThickness(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cylindrical conduction Q = 2*pi*k*L*dT / ln(r2/r1) iterated against an outside film coefficient (~1.65 BTU/hr/ft^2/F still air).";
  const od = makeNumber("Pipe OD (in)", "it-od", { step: "any", min: "0" });
  const ts = makeNumber("Pipe surface (F)", "it-ts", { step: "any" });
  const amb = makeNumber("Ambient (F)", "it-amb", { step: "any" });
  const lim = makeNumber("Outer surface limit (F)", "it-lim", { step: "any" });
  const k = makeNumber("Insulation k (BTU*in/hr*ft^2*F)", "it-k", { step: "any", min: "0", value: "0.27" });
  k.input.value = "0.27";
  for (const f of [od, ts, amb, lim, k]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    od.input.value = "1"; ts.input.value = "250"; amb.input.value = "75"; lim.input.value = "120"; k.input.value = "0.27"; update();
  });
  const oT = makeOutputLine(outputRegion, "Required thickness", "it-out-t");
  const update = debounce(() => {
    const r = computeInsulationThickness({
      pipe_od_in: Number(od.input.value) || 0,
      surface_temp_F: Number(ts.input.value) || 0,
      ambient_F: Number(amb.input.value) || 0,
      surface_limit_F: Number(lim.input.value) || 0,
      k_btu_in_per_hr_ft2_F: Number(k.input.value) || 0.27,
    });
    if (r.error) { oT.textContent = r.error; return; }
    oT.textContent = fmt(r.thickness_in, 3) + " in";
  }, DEBOUNCE_MS);
  for (const el of [od.input, ts.input, amb.input, lim.input, k.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderEvaporativeCooling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Q = m_dot * h_fg with h_fg of water ~ 1054 BTU/lb at typical evaporation conditions.";
  const m = makeNumber("Evaporation rate (lb/hr)", "ev-m", { step: "any", min: "0" });
  const h = makeNumber("Latent heat (BTU/lb)", "ev-h", { step: "any", min: "0", value: String(HFG_WATER_BTU_PER_LB) });
  h.input.value = String(HFG_WATER_BTU_PER_LB);
  for (const f of [m, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { m.input.value = "10"; h.input.value = String(HFG_WATER_BTU_PER_LB); update(); });
  const oQ = makeOutputLine(outputRegion, "Cooling effect", "ev-out-q");
  const oT = makeOutputLine(outputRegion, "Cooling effect (tons)", "ev-out-t");
  const update = debounce(() => {
    const r = computeEvaporativeCooling({
      evaporation_rate_lb_hr: Number(m.input.value) || 0,
      hfg_btu_per_lb: Number(h.input.value) || HFG_WATER_BTU_PER_LB,
    });
    if (r.error) { oQ.textContent = r.error; oT.textContent = "-"; return; }
    oQ.textContent = fmt(r.cooling_btu_hr, 0) + " BTU/hr";
    oT.textContent = fmt(r.cooling_tons, 3) + " tons";
  }, DEBOUNCE_MS);
  for (const el of [m.input, h.input]) el.addEventListener("input", update);
}

// --- Renderers ---

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox, makeTextarea,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
// v8 §D.2 shared context-band helper.
import { formatContextBand } from "./context-band.js";

// --- Worker handle for Manual J ---
//
// The Manual J calculators run inside a Web Worker so the UI stays
// responsive on multi-zone inputs. The worker module is loaded with type
// "module" from the same origin. The compute functions also run in-thread
// so unit tests can verify them without a browser.

let manualJWorker = null;
function ensureWorker() {
  if (manualJWorker) return manualJWorker;
  if (typeof Worker === "undefined") return null;
  try {
    manualJWorker = new Worker("./manual-j-worker.js", { type: "module" });
  } catch {
    manualJWorker = null;
  }
  return manualJWorker;
}

function runInWorker(payload, fallbackFn) {
  return new Promise((resolve) => {
    const w = ensureWorker();
    if (!w) { resolve(fallbackFn(payload.inputs)); return; }
    const id = Math.random().toString(36).slice(2);
    const onMessage = (e) => {
      if (e.data && e.data.id === id) {
        w.removeEventListener("message", onMessage);
        resolve(e.data.result);
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, ...payload });
  });
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderManualJCooling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Simplified screening estimate from envelope conductance, infiltration, internal gains, solar, and latent loads. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern. Free at codes.iccsafe.org for IMC references.";
  // v10 §B.3 wiring: render the simplified-screening limitation banner
  // above the inputs. Canonical copy lives in limitation-banner.js so
  // a future language tweak is one-file.
  renderLimitationBanner(inputRegion, getLimitationCopy("manual-j-cooling"));
  const fa = makeNumber("Floor area (ft^2)", "mjc-fa", { step: "any", min: "0" });
  const wa = makeNumber("Above-grade wall area (ft^2)", "mjc-wa", { step: "any", min: "0" });
  const win = makeNumber("Window area (ft^2)", "mjc-win", { step: "any", min: "0" });
  const ca = makeNumber("Ceiling area (ft^2)", "mjc-ca", { step: "any", min: "0" });
  const ins = makeSelect("Insulation level", "mjc-ins", [
    { value: "poor", label: "Poor" }, { value: "average", label: "Average", selected: true }, { value: "good", label: "Good" },
  ]);
  const wt = makeSelect("Window type", "mjc-wt", [
    { value: "single", label: "Single pane" }, { value: "double", label: "Double pane", selected: true }, { value: "triple", label: "Triple pane" },
  ]);
  const occ = makeNumber("Occupants", "mjc-occ", { step: "1", min: "0", value: "2" });
  occ.input.value = "2";
  const od = makeNumber("Outdoor design temp (F)", "mjc-od", { step: "any" });
  const id = makeNumber("Indoor design temp (F)", "mjc-id", { step: "any", value: "75" });
  id.input.value = "75";
  const orh = makeNumber("Outdoor RH (percent)", "mjc-orh", { step: "any", min: "0", max: "100", value: "50" });
  orh.input.value = "50";
  for (const f of [fa, wa, win, ca, ins, wt, occ, od, id, orh]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    fa.input.value = "1500"; wa.input.value = "1200"; win.input.value = "200"; ca.input.value = "1500";
    ins.select.value = "average"; wt.select.value = "double"; occ.input.value = "4";
    od.input.value = "95"; id.input.value = "75"; orh.input.value = "50"; update();
  });

  const oTotal = makeOutputLine(outputRegion, "Total cooling load", "mjc-out-total");
  const oTons = makeOutputLine(outputRegion, "Tons", "mjc-out-tons");
  const oSens = makeOutputLine(outputRegion, "Sensible", "mjc-out-sens");
  const oLat = makeOutputLine(outputRegion, "Latent", "mjc-out-lat");
  // v8 §D.2 context band: typical residential cooling load 15-30 BTU/hr per
  // sq ft of conditioned floor area. Below 15 = under-loaded house; above
  // 30 = leaky / large-glass / hot climate (or wrong inputs).
  const oBand = makeOutputLine(outputRegion, "BTU/hr per sq ft (typical 15-30)", "mjc-out-band");

  const update = debounce(async () => {
    const floor_ft2 = Number(fa.input.value) || 0;
    const inputs = {
      floor_area_ft2: floor_ft2,
      wall_area_ft2: Number(wa.input.value) || 0,
      window_area_ft2: Number(win.input.value) || 0,
      ceiling_area_ft2: Number(ca.input.value) || 0,
      insulation_level: ins.select.value,
      window_type: wt.select.value,
      occupants: Number(occ.input.value) || 0,
      outdoor_design_F: Number(od.input.value) || 0,
      indoor_design_F: Number(id.input.value) || 75,
      outdoor_RH_percent: Number(orh.input.value) || 50,
    };
    const r = await runInWorker({ kind: "cooling", inputs }, manualJCooling);
    oTotal.textContent = fmt(r.total_BTU_hr, 0) + " BTU/hr";
    oTons.textContent = fmt(r.tons, 2);
    oSens.textContent = fmt(r.sensible_BTU_hr, 0) + " BTU/hr";
    oLat.textContent = fmt(r.latent_BTU_hr, 0) + " BTU/hr";
    if (floor_ft2 > 0 && r.total_BTU_hr > 0) {
      const band = formatContextBand(r.total_BTU_hr / floor_ft2, 15, 30, "BTU/hr/ft^2");
      oBand.textContent = band.error ? "-" : band.text;
    } else {
      oBand.textContent = "-";
    }
  }, DEBOUNCE_MS);

  for (const el of [fa.input, wa.input, win.input, ca.input, ins.select, wt.select, occ.input, od.input, id.input, orh.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderManualJHeating(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Simplified screening estimate from envelope conductance and infiltration. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern. Free at codes.iccsafe.org for IMC references.";
  // v10 §B.3 wiring: render the simplified-screening limitation banner.
  renderLimitationBanner(inputRegion, getLimitationCopy("manual-j-heating"));
  const fa = makeNumber("Floor area (ft^2)", "mjh-fa", { step: "any", min: "0" });
  const wa = makeNumber("Above-grade wall area (ft^2)", "mjh-wa", { step: "any", min: "0" });
  const win = makeNumber("Window area (ft^2)", "mjh-win", { step: "any", min: "0" });
  const ca = makeNumber("Ceiling area (ft^2)", "mjh-ca", { step: "any", min: "0" });
  const ins = makeSelect("Insulation level", "mjh-ins", [
    { value: "poor", label: "Poor" }, { value: "average", label: "Average", selected: true }, { value: "good", label: "Good" },
  ]);
  const wt = makeSelect("Window type", "mjh-wt", [
    { value: "single", label: "Single pane" }, { value: "double", label: "Double pane", selected: true }, { value: "triple", label: "Triple pane" },
  ]);
  const od = makeNumber("Outdoor design temp (F)", "mjh-od", { step: "any" });
  const id = makeNumber("Indoor design temp (F)", "mjh-id", { step: "any", value: "70" });
  id.input.value = "70";
  for (const f of [fa, wa, win, ca, ins, wt, od, id]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    fa.input.value = "1500"; wa.input.value = "1200"; win.input.value = "200"; ca.input.value = "1500";
    ins.select.value = "average"; wt.select.value = "double"; od.input.value = "10"; id.input.value = "70"; update();
  });

  const oTotal = makeOutputLine(outputRegion, "Total heating load", "mjh-out-total");
  // v8 §C.3: tons parity with manual-j-cooling. Heat pumps read in tons.
  const oTons = makeOutputLine(outputRegion, "Tons", "mjh-out-tons");
  const oCond = makeOutputLine(outputRegion, "Conductive", "mjh-out-cond");
  const oInf = makeOutputLine(outputRegion, "Infiltration", "mjh-out-inf");
  // v8 §D.2 context band: typical residential heating load 25-50 BTU/hr per
  // sq ft. Cold climates push higher; well-insulated mild climates lower.
  const oBand = makeOutputLine(outputRegion, "BTU/hr per sq ft (typical 25-50)", "mjh-out-band");

  const update = debounce(async () => {
    const floor_ft2 = Number(fa.input.value) || 0;
    const inputs = {
      floor_area_ft2: floor_ft2,
      wall_area_ft2: Number(wa.input.value) || 0,
      window_area_ft2: Number(win.input.value) || 0,
      ceiling_area_ft2: Number(ca.input.value) || 0,
      insulation_level: ins.select.value,
      window_type: wt.select.value,
      outdoor_design_F: Number(od.input.value) || 0,
      indoor_design_F: Number(id.input.value) || 70,
    };
    const r = await runInWorker({ kind: "heating", inputs }, manualJHeating);
    oTotal.textContent = fmt(r.total_BTU_hr, 0) + " BTU/hr";
    oTons.textContent = fmt(r.tons, 2) + " tons (1 ton = 12 000 BTU/hr)";
    oCond.textContent = fmt(r.conductive_BTU_hr, 0) + " BTU/hr";
    oInf.textContent = fmt(r.infiltration_BTU_hr, 0) + " BTU/hr";
    if (floor_ft2 > 0 && r.total_BTU_hr > 0) {
      const band = formatContextBand(r.total_BTU_hr / floor_ft2, 25, 50, "BTU/hr/ft^2");
      oBand.textContent = band.error ? "-" : band.text;
    } else {
      oBand.textContent = "-";
    }
  }, DEBOUNCE_MS);

  for (const el of [fa.input, wa.input, win.input, ca.input, ins.select, wt.select, od.input, id.input]) el.addEventListener("input", update);
}

// v8 §C.3 / accessibility.md preset-chip pattern: typical outdoor-air
// temperatures the field tech runs charging charts against. One tap fills
// the OAT field on refrigerant-pt.
// v8 §C.3 / accessibility.md preset-chip pattern: friction-rate canonical
// values per ACCA Manual D bands. Tap one chip to set the rate.
export const DUCT_FRICTION_PRESETS = [
  { id: "low",      label: "Low 0.06",      friction: 0.06, description: "Quiet / low-velocity duct (ACCA Manual D low band)" },
  { id: "typical",  label: "Typical 0.08",  friction: 0.08, description: "ACCA Manual D residential default" },
  { id: "high",     label: "High 0.10",     friction: 0.10, description: "Tight space / commercial high band" },
];

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderDuctSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IMC 2021 §603 and Darcy-Weisbach with Colebrook-White friction factor on standard galvanized-steel duct. Equivalent rectangular diameter per Huebscher. AHJ governs. Free at codes.iccsafe.org.";
  const cfm = makeNumber("CFM", "ds-cfm", { step: "any", min: "0" });
  const fr = makeNumber("Friction rate (in w.c. / 100 ft)", "ds-fr", { step: "any", min: "0", value: "0.08" });
  fr.input.value = "0.08";
  // v8 §C.3 + accessibility.md preset-chip pattern.
  const chipRow = document.createElement("div");
  chipRow.className = "preset-chip-row";
  chipRow.setAttribute("role", "group");
  chipRow.setAttribute("aria-label", "Friction-rate presets");
  for (const p of DUCT_FRICTION_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { fr.input.value = String(p.friction); update(); });
    chipRow.appendChild(btn);
  }
  inputRegion.appendChild(cfm.wrap);
  inputRegion.appendChild(fr.wrap);
  inputRegion.appendChild(chipRow);
  attachExampleButton(inputRegion, () => { cfm.input.value = "400"; fr.input.value = "0.08"; update(); });

  const oR = makeOutputLine(outputRegion, "Round diameter", "ds-out-r");
  const oS = makeOutputLine(outputRegion, "Equivalent square", "ds-out-s");
  const oV = makeOutputLine(outputRegion, "Velocity", "ds-out-v");
  // v8 §C.3: green / yellow / red friction-rate badge against ACCA Manual D bands.
  const oF = makeOutputLine(outputRegion, "Friction rate band", "ds-out-f");
  // spec-v27 EN: trunk/branch velocity ceiling verdict.
  const oVc = makeOutputLine(outputRegion, "Velocity ceiling", "ds-out-vc");

  const update = debounce(async () => {
    const inputs = { cfm: Number(cfm.input.value) || 0, friction_in_wc_per_100ft: Number(fr.input.value) || 0 };
    const r = await runInWorker({ kind: "duct", inputs }, computeDuctSize);
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; oV.textContent = "-"; oF.textContent = "-"; oVc.textContent = "-"; return; }
    oR.textContent = fmt(r.round_diameter_in, 2) + " in";
    oS.textContent = fmt(r.equivalent_square_in, 2) + " in (square)";
    oV.textContent = fmt(r.velocity_fpm, 0) + " fpm";
    oF.textContent = r.friction_color.toUpperCase() + " - " + r.friction_label;
    oVc.textContent = r.velocity_label;
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, fr.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderStaticPressureHvac(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Total external static pressure equals the sum of the pressure drops of each element in the airpath.";
  const elements = [
    { id: "filter", label: "Filter" },
    { id: "coil", label: "Coil" },
    { id: "supply", label: "Supply duct" },
    { id: "return", label: "Return duct" },
    { id: "registers", label: "Registers" },
  ];
  const inputs = {};
  for (const el of elements) {
    const f = makeNumber(el.label + " (in w.c.)", "sp-" + el.id, { step: "any", min: "0", value: "0" });
    f.input.value = "0";
    inputs[el.id] = f.input;
    inputRegion.appendChild(f.wrap);
  }
  attachExampleButton(inputRegion, () => {
    inputs.filter.value = "0.10"; inputs.coil.value = "0.30"; inputs.supply.value = "0.20";
    inputs.return.value = "0.10"; inputs.registers.value = "0.00"; update();
  });
  const oT = makeOutputLine(outputRegion, "Total external static pressure", "sp-out-t");
  const update = debounce(() => {
    const list = elements.map((e) => ({ name: e.label, dp_in_wc: Number(inputs[e.id].value) || 0 }));
    const r = computeStaticPressureHvac({ elements: list });
    oT.textContent = fmt(r.total_in_wc, 3) + " in w.c.";
  }, DEBOUNCE_MS);
  for (const el of Object.values(inputs)) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSeerEer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: SEER and EER are rated under different conditions. The 1.12 conversion factor is an engineering approximation; actual values depend on the rating method.";
  const value = makeNumber("Value", "se-v", { step: "any", min: "0" });
  const from = makeSelect("From", "se-f", [{ value: "EER", label: "EER" }, { value: "SEER", label: "SEER" }, { value: "SEER2", label: "SEER2" }, { value: "EER2", label: "EER2" }]);
  // v23 EN.1: optional annual-kWh / $ cross-check.
  const load = makeNumber("Cooling load (BTU/hr, optional)", "se-load", { step: "any", min: "0" });
  const hrs = makeNumber("Annual cooling hours (optional)", "se-hrs", { step: "any", min: "0" });
  const rate = makeNumber("Electricity rate ($/kWh, optional)", "se-rate", { step: "any", min: "0" });
  for (const f of [value, from, load, hrs, rate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { value.input.value = "12"; from.select.value = "EER"; load.input.value = "36000"; hrs.input.value = "1000"; rate.input.value = "0.15"; update(); });
  const oOut = makeOutputLine(outputRegion, "Result", "se-out");
  const oAnnual = makeOutputLine(outputRegion, "Annual energy (if load + hours)", "se-out-annual");
  const update = debounce(() => {
    const r = computeSeerEer({ value: Number(value.input.value) || 0, from: from.select.value, cooling_load_btu_hr: Number(load.input.value) || 0, annual_hours: Number(hrs.input.value) || 0, electricity_rate: Number(rate.input.value) || 0 });
    if (r.error) { oOut.textContent = r.error; oAnnual.textContent = "-"; return; }
    oOut.textContent = Object.entries(r).filter(([k]) => k !== "annual_kwh" && k !== "annual_cost_usd").map(([k, v]) => k + " " + fmt(v, 2)).join(", ");
    oAnnual.textContent = r.annual_kwh == null ? "(enter cooling load + annual hours)" : (fmt(r.annual_kwh, 0) + " kWh/yr" + (r.annual_cost_usd == null ? "" : " (~$" + fmt(r.annual_cost_usd, 0) + "/yr)"));
  }, DEBOUNCE_MS);
  for (const el of [value.input, from.select, load.input, hrs.input, rate.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBalancePoint(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Linear capacity and load model. Balance point is the outdoor temperature at which heat-pump heating capacity equals building heat loss.";
  const cap = makeNumber("Heating capacity at design (BTU/hr)", "bp-c", { step: "any", min: "0" });
  const dT = makeNumber("Design outdoor temperature (F)", "bp-d", { step: "any" });
  const load = makeNumber("Building heat loss (BTU/hr)", "bp-l", { step: "any", min: "0" });
  const indoor = makeNumber("Indoor design temperature (F)", "bp-i", { step: "any", value: "65" });
  indoor.input.value = "65";
  for (const f of [cap, dT, load, indoor]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "30000"; dT.input.value = "17"; load.input.value = "50000"; indoor.input.value = "65"; update(); });
  const oBP = makeOutputLine(outputRegion, "Balance point", "bp-out");
  const oAux = makeOutputLine(outputRegion, "Supplemental heat at design", "bp-out-aux");
  const update = debounce(() => {
    const r = computeBalancePoint({
      heating_capacity_btu_hr_at_design: Number(cap.input.value) || 0,
      design_outdoor_F: Number(dT.input.value) || 0,
      building_heat_loss_btu_hr: Number(load.input.value) || 0,
      indoor_F: Number(indoor.input.value) || 65,
    });
    oBP.textContent = fmt(r.balance_point_F, 1) + " F";
    oAux.textContent = r.aux_heat_btu_hr == null ? "-" : fmt(r.aux_heat_btu_hr, 0) + " BTU/hr (" + fmt(r.aux_strip_kw, 2) + " kW strip)";
  }, DEBOUNCE_MS);
  for (const el of [cap.input, dT.input, load.input, indoor.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSHR(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Sensible heat ratio = sensible cooling load / total cooling load.";
  const sens = makeNumber("Sensible cooling load (BTU/hr)", "shr-s", { step: "any", min: "0" });
  const total = makeNumber("Total cooling load (BTU/hr)", "shr-t", { step: "any", min: "0" });
  for (const f of [sens, total]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sens.input.value = "24000"; total.input.value = "30000"; update(); });
  const oS = makeOutputLine(outputRegion, "SHR", "shr-out");
  const update = debounce(() => {
    const r = computeSHR({ sensible_btu_hr: Number(sens.input.value) || 0, total_btu_hr: Number(total.input.value) || 0 });
    oS.textContent = r.error ? r.error : fmt(r.SHR, 3);
  }, DEBOUNCE_MS);
  for (const el of [sens.input, total.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderCfmPerTon(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard 400 CFM per ton with 350 for humid climates and 450 for dry climates.";
  const tons = makeNumber("Tons", "cpt-t", { step: "any", min: "0" });
  const climate = makeSelect("Climate", "cpt-c", [
    { value: "standard", label: "Standard (400 CFM/ton)", selected: true },
    { value: "humid", label: "Humid (350 CFM/ton)" }, { value: "dry", label: "Dry (450 CFM/ton)" },
  ]);
  for (const f of [tons, climate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tons.input.value = "3"; climate.select.value = "standard"; update(); });
  const oC = makeOutputLine(outputRegion, "CFM per ton", "cpt-out-c");
  const oT = makeOutputLine(outputRegion, "Total CFM", "cpt-out-t");
  // v8 §C.3: surface the climate label + one-line latent-removal hint.
  const oH = makeOutputLine(outputRegion, "Climate hint", "cpt-out-h");
  const update = debounce(() => {
    const r = computeCfmPerTon({ tons: Number(tons.input.value) || 0, climate: climate.select.value });
    if (r.error) { oC.textContent = r.error; oT.textContent = "-"; oH.textContent = "-"; return; }
    oC.textContent = String(r.cfm_per_ton);
    oT.textContent = fmt(r.total_cfm, 0);
    oH.textContent = r.climate_label + " - " + r.climate_hint;
  }, DEBOUNCE_MS);
  for (const el of [tons.input, climate.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderCombustionAir(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IMC 2021 §304 (combustion air). 50 ft^3 per 1000 BTU/hr by volume; outdoor opening 1 in^2 per 1000 BTU/hr or indoor opening 1 in^2 per 4000 BTU/hr. AHJ governs. Free at codes.iccsafe.org.";
  const btu = makeNumber("Appliance BTU input", "ca-b", { step: "any", min: "0" });
  const vol = makeNumber("Room volume (ft^3)", "ca-v", { step: "any", min: "0" });
  for (const f of [btu, vol]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { btu.input.value = "100000"; vol.input.value = "4000"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required volume", "ca-out-req");
  const oAd = makeOutputLine(outputRegion, "Adequate by volume", "ca-out-ad");
  const oOut = makeOutputLine(outputRegion, "Outdoor opening", "ca-out-out");
  const oIn = makeOutputLine(outputRegion, "Indoor opening", "ca-out-in");
  const update = debounce(() => {
    const r = computeCombustionAir({ btu_input: Number(btu.input.value) || 0, room_volume_ft3: Number(vol.input.value) || 0 });
    oReq.textContent = fmt(r.required_volume_ft3, 0) + " ft^3";
    oAd.textContent = r.adequate_by_volume ? "Yes" : "No (combustion air opening required)";
    oOut.textContent = fmt(r.opening_outdoor_in2, 1) + " in^2";
    oIn.textContent = fmt(r.opening_indoor_in2, 1) + " in^2";
  }, DEBOUNCE_MS);
  for (const el of [btu.input, vol.input]) el.addEventListener("input", update);
}

// =====================================================================
// v3 utilities (139 through 144). See spec-v3.md section 2.3.
// =====================================================================

// --- Utility 139: Fan Affinity Laws ---
//
// Q ~ N, P ~ N^2, kW ~ N^3 with N = RPM.

// dims: in { args: dimensionless } out: { flow2: L^3 T^-1, head2: L, power2: M L^2 T^-3 }
export function computeAffinityLaws({
  baseline_RPM = 0, baseline_CFM = 0, baseline_SP_in_wc = 0, baseline_kW = 0,
  target_kind = "RPM", target_value = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(baseline_RPM > 0)) return { error: "Baseline RPM must be positive." };
  if (!(target_value > 0)) return { error: "Target value must be positive." };
  let ratio;
  switch (target_kind) {
    case "RPM": ratio = target_value / baseline_RPM; break;
    case "CFM":
      if (!(baseline_CFM > 0)) return { error: "Baseline CFM required." };
      ratio = target_value / baseline_CFM; break;
    case "SP":
      if (!(baseline_SP_in_wc > 0)) return { error: "Baseline SP required." };
      ratio = Math.sqrt(target_value / baseline_SP_in_wc); break;
    case "kW":
      if (!(baseline_kW > 0)) return { error: "Baseline kW required." };
      ratio = Math.cbrt(target_value / baseline_kW); break;
    default: return { error: "Unknown target kind." };
  }
  return {
    ratio,
    RPM: baseline_RPM * ratio,
    CFM: baseline_CFM * ratio,
    SP_in_wc: baseline_SP_in_wc * ratio * ratio,
    kW: baseline_kW * ratio * ratio * ratio,
  };
}

export const affinityLawsExample = {
  inputs: { baseline_RPM: 1750, baseline_CFM: 5000, baseline_SP_in_wc: 1.0, baseline_kW: 5.0, target_kind: "RPM", target_value: 1500 },
};

// --- Utility 140: Belt Length and Pulley Speed ---
//
// L = 2C + (pi/2)(D + d) + ((D - d)^2)/(4C)
// driven_RPM = motor_RPM * (D_drive / D_driven)
// belt_speed_fpm = pi * D_drive_in / 12 * motor_RPM

// dims: in { drive_dia_in: L, driven_dia_in: L, center_distance_in: L, motor_rpm: T^-1 } out: { driven_rpm: T^-1, belt_length_in: L }
export function computeBeltAndPulley({ drive_dia_in = 0, driven_dia_in = 0, center_distance_in = 0, motor_rpm = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(drive_dia_in > 0 && driven_dia_in > 0)) return { error: "Pulley diameters must be positive." };
  if (!(center_distance_in > 0)) return { error: "Center distance must be positive." };
  const D = Math.max(drive_dia_in, driven_dia_in);
  const d = Math.min(drive_dia_in, driven_dia_in);
  const C = center_distance_in;
  const L = 2 * C + (Math.PI / 2) * (D + d) + Math.pow(D - d, 2) / (4 * C);
  const driven_rpm = motor_rpm > 0 ? motor_rpm * (drive_dia_in / driven_dia_in) : null;
  const belt_speed_fpm = motor_rpm > 0 ? (Math.PI * drive_dia_in / 12) * motor_rpm : null;
  return { belt_length_in: L, driven_rpm, belt_speed_fpm };
}

export const beltAndPulleyExample = {
  inputs: { drive_dia_in: 4, driven_dia_in: 8, center_distance_in: 18, motor_rpm: 1750 },
};

// --- Utility 141: Compressed Air Receiver and Tool Budget ---
//
// V_gal = (t_min * (C_demand_scfm - C_pump_scfm) * P_atm_psi) / (P1 - P2)
// converted to gallons via 7.4805 gal per ft^3.

// dims: in { args: dimensionless } out: { receiver_gal: L^3 }
export function computeAirReceiver({
  tools = [], pump_scfm = 0, p_high_psi = 0, p_low_psi = 0,
  drawdown_minutes = 1, p_atm_psi = 14.7,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(tools)) return { error: "Tools must be a list." };
  if (!(p_high_psi > p_low_psi)) return { error: "P1 must exceed P2." };
  if (!(drawdown_minutes > 0)) return { error: "Drawdown minutes must be positive." };
  let demand = 0;
  for (const t of tools) {
    const cfm = Number(t.cfm) || 0;
    const dc = Number(t.duty_cycle) || 0;
    if (cfm < 0 || dc < 0 || dc > 1) return { error: "Tool inputs must be non-negative; duty cycle 0..1." };
    demand += cfm * dc;
  }
  const deficit = demand - pump_scfm;
  let receiver_ft3 = 0;
  if (deficit > 0) {
    receiver_ft3 = (drawdown_minutes * deficit * p_atm_psi) / (p_high_psi - p_low_psi);
  }
  const receiver_gal = receiver_ft3 * 7.4805;
  // Concurrent tools count: how many tools (in given order) total cfm <= pump+deficit-supply
  // Simpler: how many full tools the pump alone can sustain at duty cycle.
  let concurrent = 0;
  let acc = 0;
  for (const t of tools) {
    acc += (Number(t.cfm) || 0) * (Number(t.duty_cycle) || 0);
    if (acc <= pump_scfm) concurrent++;
    else break;
  }
  return { demand_scfm: demand, deficit_scfm: deficit, receiver_ft3, receiver_gal, concurrent };
}

export const airReceiverExample = {
  inputs: {
    tools: [{ cfm: 4, duty_cycle: 0.5 }, { cfm: 3, duty_cycle: 0.4 }, { cfm: 8, duty_cycle: 0.3 }],
    pump_scfm: 5, p_high_psi: 175, p_low_psi: 125, drawdown_minutes: 1,
  },
};

// --- Utility 142: Geothermal Loop Length ---
//
// length_ft = design_BTU / btu_per_linear_foot[soil][loop_type]
// DOE technical-report style benchmarks (public domain).

export const GEO_LOOP_BTU_PER_FT = {
  vertical: { sand: 30, clay: 40, rock: 55 },
  horizontal: { sand: 18, clay: 25, rock: 0 }, // rock not typical for horizontal
};

// dims: in { heating_btu: M L^2 T^-3, cooling_btu: M L^2 T^-3, soil: dimensionless, loop_type: dimensionless } out: { loop_length_ft: L }
export function computeGeothermalLoop({ heating_btu = 0, cooling_btu = 0, soil = "clay", loop_type = "vertical" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const map = GEO_LOOP_BTU_PER_FT[loop_type];
  if (!map) return { error: "Unknown loop type." };
  const btuPerFt = map[soil];
  if (!Number.isFinite(btuPerFt) || btuPerFt <= 0) return { error: "Soil class not supported for this loop type." };
  if (!(heating_btu >= 0 && cooling_btu >= 0)) return { error: "BTU values must be non-negative." };
  if (heating_btu === 0 && cooling_btu === 0) return { error: "Provide a heating or cooling design load." };
  const design = Math.max(heating_btu, cooling_btu);
  const length_ft = design / btuPerFt;
  return { btu_per_ft: btuPerFt, design_btu: design, length_ft };
}

export const geothermalLoopExample = {
  inputs: { heating_btu: 60000, cooling_btu: 48000, soil: "clay", loop_type: "vertical" },
};

// --- Utility 143: Hydronic Baseboard Output ---
//
// Manufacturer-attributed BTU-per-foot tables interpolated by water temp.

export const BASEBOARD_OUTPUT = {
  slant_fin_baseline: {
    attribution: "Slant/Fin Fine Line 30 Series technical bulletin (typical 1 gpm)",
    points: [
      { water_F: 140, btu_per_ft: 380 }, { water_F: 160, btu_per_ft: 510 },
      { water_F: 180, btu_per_ft: 600 }, { water_F: 200, btu_per_ft: 690 },
      { water_F: 220, btu_per_ft: 780 },
    ],
  },
  high_capacity: {
    attribution: "Generic high-output baseboard (typical 4 gpm)",
    points: [
      { water_F: 140, btu_per_ft: 480 }, { water_F: 160, btu_per_ft: 640 },
      { water_F: 180, btu_per_ft: 760 }, { water_F: 200, btu_per_ft: 870 },
      { water_F: 220, btu_per_ft: 970 },
    ],
  },
};

// dims: in { water_temp_F: T, flow_gpm: L^3 T^-1, length_ft: L, model: dimensionless } out: { output_btuhr: M L^2 T^-3 }
export function computeBaseboardOutput({ water_temp_F = 0, flow_gpm = 1, length_ft = 0, model = "slant_fin_baseline" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const m = BASEBOARD_OUTPUT[model];
  if (!m) return { error: "Unknown baseboard model." };
  if (!(water_temp_F > 0)) return { error: "Water temperature must be positive." };
  if (!(length_ft >= 0)) return { error: "Length must be non-negative." };
  const pts = m.points;
  let btuPerFt;
  if (water_temp_F <= pts[0].water_F) btuPerFt = pts[0].btu_per_ft;
  else if (water_temp_F >= pts[pts.length - 1].water_F) btuPerFt = pts[pts.length - 1].btu_per_ft;
  else {
    for (let i = 0; i < pts.length - 1; i++) {
      if (water_temp_F >= pts[i].water_F && water_temp_F <= pts[i + 1].water_F) {
        const t = (water_temp_F - pts[i].water_F) / (pts[i + 1].water_F - pts[i].water_F);
        btuPerFt = pts[i].btu_per_ft + t * (pts[i + 1].btu_per_ft - pts[i].btu_per_ft);
        break;
      }
    }
  }
  // Flow correction (rough): factor 1.0 at 1 gpm, 1.05 at 4 gpm (manufacturer typical).
  const flowFactor = 1 + Math.min(Math.max(flow_gpm - 1, 0) * 0.0167, 0.05);
  const btu_total = btuPerFt * length_ft * flowFactor;
  return { btu_per_ft: btuPerFt, btu_total, attribution: m.attribution, flow_factor: flowFactor };
}

export const baseboardOutputExample = {
  inputs: { water_temp_F: 180, flow_gpm: 1, length_ft: 8, model: "slant_fin_baseline" },
};

// --- Utility 144: Pump NPSH Available ---
//
// NPSHa = H_atm - H_vapor +/- H_static - H_friction (feet)
// H_atm and H_vapor are in feet of water at the system temperature.

const H_ATM_AT_ELEVATION_FT = (elevation_ft) => {
  // Simple lapse: 1 in Hg per 1000 ft above sea level. Sea level = 33.95 ft H2O.
  // Convert: 1 in Hg ~= 1.133 ft H2O.
  const inHg = 29.92 - elevation_ft / 1000;
  return Math.max(0, inHg * 1.133);
};

// Vapor pressure of water in psi by temperature (engineering reference).
const VAPOR_PRESSURE_F_PSI = [
  { F: 60, psi: 0.256 }, { F: 80, psi: 0.507 }, { F: 100, psi: 0.949 }, { F: 120, psi: 1.692 },
  { F: 140, psi: 2.889 }, { F: 160, psi: 4.741 }, { F: 180, psi: 7.510 }, { F: 200, psi: 11.526 }, { F: 212, psi: 14.696 },
];

function vaporPressureFt(F) {
  const t = VAPOR_PRESSURE_F_PSI;
  let psi;
  if (F <= t[0].F) psi = t[0].psi;
  else if (F >= t[t.length - 1].F) psi = t[t.length - 1].psi;
  else {
    for (let i = 0; i < t.length - 1; i++) {
      if (F >= t[i].F && F <= t[i + 1].F) {
        const r = (F - t[i].F) / (t[i + 1].F - t[i].F);
        psi = t[i].psi + r * (t[i + 1].psi - t[i].psi); break;
      }
    }
  }
  // 1 psi = 2.31 ft H2O.
  return psi * 2.31;
}

// dims: in { args: dimensionless } out: { npsh_a_ft: L }
export function computeNPSHa({
  elevation_ft = 0, water_temp_F = 60,
  source_elevation_relative_ft = 0, // positive if source above pump
  friction_loss_ft = 0,
  npsh_required_ft = null,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(water_temp_F >= 32)) return { error: "Water temperature must be at or above 32 F." };
  if (friction_loss_ft < 0) return { error: "Friction loss cannot be negative." };
  const H_atm = H_ATM_AT_ELEVATION_FT(elevation_ft);
  const H_vapor = vaporPressureFt(water_temp_F);
  const H_static = source_elevation_relative_ft;
  const npsha = H_atm - H_vapor + H_static - friction_loss_ft;
  let cavitation = null;
  if (npsh_required_ft !== null) cavitation = npsha < npsh_required_ft;
  return {
    H_atm_ft: H_atm, H_vapor_ft: H_vapor, H_static_ft: H_static,
    H_friction_ft: friction_loss_ft, NPSHa_ft: npsha, cavitation_risk: cavitation,
  };
}

export const npshaExample = {
  inputs: { elevation_ft: 0, water_temp_F: 60, source_elevation_relative_ft: 5, friction_loss_ft: 2, npsh_required_ft: 8 },
};

// --- v3 renderers ---

function renderAffinityLaws(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fan affinity laws Q ~ N, P ~ N^2, kW ~ N^3. Public engineering.";
  attachExampleButton(inputRegion, () => fillExample(affinityLawsExample.inputs));
  const r = makeNumber("Baseline RPM", "af-r", { step: "any", min: "0" });
  const c = makeNumber("Baseline CFM", "af-c", { step: "any", min: "0" });
  const s = makeNumber("Baseline SP (in wc)", "af-s", { step: "any", min: "0" });
  const k = makeNumber("Baseline kW", "af-k", { step: "any", min: "0" });
  const tk = makeSelect("Target", "af-tk", [{ value: "RPM", label: "RPM", selected: true }, { value: "CFM", label: "CFM" }, { value: "SP", label: "SP" }, { value: "kW", label: "kW" }]);
  const tv = makeNumber("Target value", "af-tv", { step: "any", min: "0" });
  for (const f of [r, c, s, k, tk, tv]) inputRegion.appendChild(f.wrap);
  const oR = makeOutputLine(outputRegion, "RPM", "af-out-r");
  const oC = makeOutputLine(outputRegion, "CFM", "af-out-c");
  const oS = makeOutputLine(outputRegion, "SP", "af-out-s");
  const oK = makeOutputLine(outputRegion, "kW", "af-out-k");
  function fillExample(v) { r.input.value = v.baseline_RPM; c.input.value = v.baseline_CFM; s.input.value = v.baseline_SP_in_wc; k.input.value = v.baseline_kW; tk.select.value = v.target_kind; tv.input.value = v.target_value; update(); }
  const update = debounce(() => {
    const x = computeAffinityLaws({
      baseline_RPM: Number(r.input.value) || 0, baseline_CFM: Number(c.input.value) || 0,
      baseline_SP_in_wc: Number(s.input.value) || 0, baseline_kW: Number(k.input.value) || 0,
      target_kind: tk.select.value, target_value: Number(tv.input.value) || 0,
    });
    if (x.error) { oR.textContent = x.error; oC.textContent = "-"; oS.textContent = "-"; oK.textContent = "-"; return; }
    oR.textContent = fmt(x.RPM, 0);
    oC.textContent = fmt(x.CFM, 0);
    oS.textContent = fmt(x.SP_in_wc, 3) + " in wc";
    oK.textContent = fmt(x.kW, 3) + " kW";
  }, DEBOUNCE_MS);
  for (const el of [r.input, c.input, s.input, k.input, tk.select, tv.input]) el.addEventListener("input", update);
}

function renderBeltAndPulley(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public V-belt length L = 2C + (pi/2)(D + d) + (D - d)^2 / (4C). Driven RPM via diameter ratio. Belt speed = pi * D / 12 * RPM.";
  attachExampleButton(inputRegion, () => fillExample(beltAndPulleyExample.inputs));
  const dr = makeNumber("Drive pulley diameter (in)", "bp-dr", { step: "any", min: "0" });
  const dn = makeNumber("Driven pulley diameter (in)", "bp-dn", { step: "any", min: "0" });
  const c = makeNumber("Center distance (in)", "bp-c", { step: "any", min: "0" });
  const m = makeNumber("Motor RPM", "bp-m", { step: "any", min: "0" });
  for (const f of [dr, dn, c, m]) inputRegion.appendChild(f.wrap);
  const oL = makeOutputLine(outputRegion, "Belt length", "bp-out-l");
  const oR = makeOutputLine(outputRegion, "Driven RPM", "bp-out-r");
  const oS = makeOutputLine(outputRegion, "Belt speed", "bp-out-s");
  function fillExample(v) { dr.input.value = v.drive_dia_in; dn.input.value = v.driven_dia_in; c.input.value = v.center_distance_in; m.input.value = v.motor_rpm; update(); }
  const update = debounce(() => {
    const r = computeBeltAndPulley({
      drive_dia_in: Number(dr.input.value) || 0, driven_dia_in: Number(dn.input.value) || 0,
      center_distance_in: Number(c.input.value) || 0, motor_rpm: Number(m.input.value) || 0,
    });
    if (r.error) { oL.textContent = r.error; oR.textContent = "-"; oS.textContent = "-"; return; }
    oL.textContent = fmt(r.belt_length_in, 2) + " in";
    oR.textContent = r.driven_rpm !== null ? fmt(r.driven_rpm, 0) + " rpm" : "-";
    oS.textContent = r.belt_speed_fpm !== null ? fmt(r.belt_speed_fpm, 0) + " fpm" : "-";
  }, DEBOUNCE_MS);
  for (const el of [dr.input, dn.input, c.input, m.input]) el.addEventListener("input", update);
}

function renderAirReceiver(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Public receiver formula V = (t * (C_demand - C_pump) * P_atm) / (P1 - P2). 1 ft^3 = 7.4805 gal.";
  attachExampleButton(inputRegion, () => fillExample(airReceiverExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const cf = document.createElement("input"); cf.type = "number"; cf.step = "any"; cf.min = "0"; cf.inputMode = "decimal"; cf.placeholder = "Tool CFM"; cf.setAttribute("aria-label", "Tool " + (i + 1) + " CFM");
    const dc = document.createElement("input"); dc.type = "number"; dc.step = "any"; dc.min = "0"; dc.max = "1"; dc.inputMode = "decimal"; dc.placeholder = "Duty cycle 0..1"; dc.setAttribute("aria-label", "Tool " + (i + 1) + " duty cycle (0 to 1)");
    wrap.appendChild(cf); wrap.appendChild(dc); list.appendChild(wrap);
    cf.addEventListener("input", update); dc.addEventListener("input", update);
    rows.push({ cf, dc });
  }
  const ps = makeNumber("Pump SCFM", "ar-ps", { step: "any", min: "0" });
  const ph = makeNumber("Pressure high (psi)", "ar-ph", { step: "any", min: "0" });
  const pl = makeNumber("Pressure low (psi)", "ar-pl", { step: "any", min: "0" });
  const dr = makeNumber("Drawdown minutes", "ar-dr", { step: "any", min: "0", value: "1" }); dr.input.value = "1";
  for (const f of [ps, ph, pl, dr]) inputRegion.appendChild(f.wrap);
  const oD = makeOutputLine(outputRegion, "Demand SCFM", "ar-out-d");
  const oG = makeOutputLine(outputRegion, "Required receiver", "ar-out-g");
  const oC = makeOutputLine(outputRegion, "Concurrent tools (pump alone)", "ar-out-c");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      if (v.tools[i]) { rows[i].cf.value = v.tools[i].cfm; rows[i].dc.value = v.tools[i].duty_cycle; }
    }
    ps.input.value = v.pump_scfm; ph.input.value = v.p_high_psi; pl.input.value = v.p_low_psi; dr.input.value = v.drawdown_minutes;
    update();
  }
  function update() {
    const tools = rows.map((r) => ({ cfm: Number(r.cf.value) || 0, duty_cycle: Number(r.dc.value) || 0 })).filter((t) => t.cfm > 0);
    const r = computeAirReceiver({
      tools, pump_scfm: Number(ps.input.value) || 0, p_high_psi: Number(ph.input.value) || 0,
      p_low_psi: Number(pl.input.value) || 0, drawdown_minutes: Number(dr.input.value) || 1,
    });
    if (r.error) { oD.textContent = r.error; oG.textContent = "-"; oC.textContent = "-"; return; }
    oD.textContent = fmt(r.demand_scfm, 2) + " scfm";
    oG.textContent = fmt(r.receiver_gal, 1) + " gal";
    oC.textContent = String(r.concurrent);
  }
}

function renderGeothermalLoop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Simplified estimate. A code-compliant ground-loop design requires a full IGSHPA procedure. Citation: BTU per linear foot benchmarks from public DOE technical reports.";
  attachExampleButton(inputRegion, () => fillExample(geothermalLoopExample.inputs));
  const h = makeNumber("Heating design (BTU/hr)", "gl-h", { step: "any", min: "0" });
  const cl = makeNumber("Cooling design (BTU/hr)", "gl-c", { step: "any", min: "0" });
  const s = makeSelect("Soil class", "gl-s", [{ value: "sand", label: "Sand" }, { value: "clay", label: "Clay" }, { value: "rock", label: "Rock" }]);
  const lt = makeSelect("Loop type", "gl-lt", [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }]);
  for (const f of [h, cl, s, lt]) inputRegion.appendChild(f.wrap);
  const oF = makeOutputLine(outputRegion, "BTU per linear foot", "gl-out-f");
  const oL = makeOutputLine(outputRegion, "Estimated loop length", "gl-out-l");
  function fillExample(v) { h.input.value = v.heating_btu; cl.input.value = v.cooling_btu; s.select.value = v.soil; lt.select.value = v.loop_type; update(); }
  const update = debounce(() => {
    const r = computeGeothermalLoop({
      heating_btu: Number(h.input.value) || 0, cooling_btu: Number(cl.input.value) || 0,
      soil: s.select.value, loop_type: lt.select.value,
    });
    if (r.error) { oF.textContent = r.error; oL.textContent = "-"; return; }
    oF.textContent = fmt(r.btu_per_ft, 0) + " BTU/ft";
    oL.textContent = fmt(r.length_ft, 0) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [h.input, cl.input, s.select, lt.select]) el.addEventListener("input", update);
}

function renderBaseboardOutput(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-attributed BTU-per-foot baseboard tables interpolated by water temperature. Attribution included with output.";
  attachExampleButton(inputRegion, () => fillExample(baseboardOutputExample.inputs));
  const t = makeNumber("Avg water temp (F)", "bo-t", { step: "any", min: "0" });
  const fw = makeNumber("Flow (gpm)", "bo-f", { step: "any", min: "0", value: "1" }); fw.input.value = "1";
  const l = makeNumber("Length (ft)", "bo-l", { step: "any", min: "0" });
  const m = makeSelect("Model", "bo-m", Object.keys(BASEBOARD_OUTPUT).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const f of [t, fw, l, m]) inputRegion.appendChild(f.wrap);
  const oP = makeOutputLine(outputRegion, "BTU/ft at this temp", "bo-out-p");
  const oT = makeOutputLine(outputRegion, "Total BTU/hr", "bo-out-t");
  const oA = makeOutputLine(outputRegion, "Source", "bo-out-a");
  function fillExample(v) { t.input.value = v.water_temp_F; fw.input.value = v.flow_gpm; l.input.value = v.length_ft; m.select.value = v.model; update(); }
  const update = debounce(() => {
    const r = computeBaseboardOutput({
      water_temp_F: Number(t.input.value) || 0, flow_gpm: Number(fw.input.value) || 1,
      length_ft: Number(l.input.value) || 0, model: m.select.value,
    });
    if (r.error) { oP.textContent = r.error; oT.textContent = "-"; oA.textContent = "-"; return; }
    oP.textContent = fmt(r.btu_per_ft, 0);
    oT.textContent = fmt(r.btu_total, 0) + " BTU/hr";
    oA.textContent = r.attribution;
  }, DEBOUNCE_MS);
  for (const el of [t.input, fw.input, l.input, m.select]) el.addEventListener("input", update);
}

function renderNPSHa(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NPSHa = H_atm - H_vapor +/- H_static - H_friction (feet). Atmospheric head from elevation lapse; vapor pressure from public engineering table.";
  attachExampleButton(inputRegion, () => fillExample(npshaExample.inputs));
  const e = makeNumber("Site elevation (ft)", "np-e", { step: "any", value: "0" });
  const w = makeNumber("Water temperature (F)", "np-w", { step: "any", value: "60" });
  const s = makeNumber("Source elevation vs pump (ft, + above)", "np-s", { step: "any" });
  const f = makeNumber("Suction friction loss (ft)", "np-f", { step: "any", min: "0" });
  const r = makeNumber("NPSH required (ft, optional)", "np-r", { step: "any", min: "0" });
  for (const x of [e, w, s, f, r]) inputRegion.appendChild(x.wrap);
  const oA = makeOutputLine(outputRegion, "Atmospheric head", "np-out-a");
  const oV = makeOutputLine(outputRegion, "Vapor pressure head", "np-out-v");
  const oN = makeOutputLine(outputRegion, "NPSH available", "np-out-n");
  const oC = makeOutputLine(outputRegion, "Cavitation risk", "np-out-c");
  function fillExample(v) {
    e.input.value = v.elevation_ft; w.input.value = v.water_temp_F; s.input.value = v.source_elevation_relative_ft;
    f.input.value = v.friction_loss_ft; r.input.value = v.npsh_required_ft;
    update();
  }
  const update = debounce(() => {
    const npshrVal = r.input.value === "" ? null : Number(r.input.value);
    const x = computeNPSHa({
      elevation_ft: Number(e.input.value) || 0, water_temp_F: Number(w.input.value) || 60,
      source_elevation_relative_ft: Number(s.input.value) || 0,
      friction_loss_ft: Number(f.input.value) || 0,
      npsh_required_ft: npshrVal,
    });
    if (x.error) { oA.textContent = x.error; oV.textContent = "-"; oN.textContent = "-"; oC.textContent = "-"; return; }
    oA.textContent = fmt(x.H_atm_ft, 2) + " ft";
    oV.textContent = fmt(x.H_vapor_ft, 2) + " ft";
    oN.textContent = fmt(x.NPSHa_ft, 2) + " ft";
    oC.textContent = x.cavitation_risk === null ? "(no NPSHr supplied)" : (x.cavitation_risk ? "RISK: NPSHa < NPSHr" : "ok");
  }, DEBOUNCE_MS);
  for (const el of [e.input, w.input, s.input, f.input, r.input]) el.addEventListener("input", update);
}

export const HVAC_RENDERERS = {
  "manual-j-cooling": renderManualJCooling,
  "manual-j-heating": renderManualJHeating,
  "duct-sizing": renderDuctSizing,
  "static-pressure-hvac": renderStaticPressureHvac,
  "seer-eer": renderSeerEer,
  "balance-point": renderBalancePoint,
  "shr": renderSHR,
  "cfm-per-ton": renderCfmPerTon,
  "combustion-air": renderCombustionAir,
  // v2
  "approach-delta-t": renderApproachDeltaT,
  "outdoor-air-mix": renderOutdoorAirMix,
  "equivalent-length": renderEquivalentLength,
  "wet-bulb-psychrometer": renderWetBulbPsychrometer,
  "insulation-thickness": renderInsulationThickness,
  "evaporative-cooling": renderEvaporativeCooling,
  // v3
  "affinity-laws": renderAffinityLaws,
  "belt-pulley": renderBeltAndPulley,
  "air-receiver": renderAirReceiver,
  "geothermal-loop": renderGeothermalLoop,
  "baseboard-output": renderBaseboardOutput,
  "npsh-a": renderNPSHa,
};

// =====================================================================
// v7 Group C extensions (utilities 242 through 245)
// =====================================================================

import {
  DEBOUNCE_MS as _V7H_DEB, debounce as _v7h_debounce, fmt as _v7h_fmt,
  makeNumber as _v7h_makeNumber, makeSelect as _v7h_makeSelect,
  attachExampleButton as _v7h_attachEx, makeOutputLine as _v7h_makeOut,
} from "./ui-fields.js";

// --- 242: Duct Friction Loss and Static Pressure ---

export const DUCT_ROUGHNESS_FT_v7 = {
  galv_smooth:    0.0003,
  galv_general:   0.0005,
  flex_extended:  0.003,
  flex_compressed: 0.0035,
  fiberboard:     0.005,
  flex_metal:     0.012,
};

export const DUCT_FITTINGS_C_O = {
  elbow_90_smooth_radius: 0.22,
  elbow_90_short_radius:  0.40,
  elbow_45_smooth_radius: 0.18,
  tee_thru_branch:        1.30,
  tee_thru_main:          0.30,
  reducer_concentric:     0.10,
  expansion_concentric:   0.30,
  damper_open:            0.20,
  filter_typical:         0.50,
  diffuser_typical:       0.30,
  return_grille:          0.40,
};

const _AIR_RHO = 0.075;       // lb/ft^3 at 70 F sea level
const _WATER_RHO = 62.32;     // lb/ft^3
const _NU_AIR = 1.62e-4;      // ft^2/s
const _G = 32.174;            // ft/s^2

function _frictionFactor(eps_ft, D_h_ft, Re) {
  const denom = Math.log10(eps_ft / (3.7 * D_h_ft) + 5.74 / Math.pow(Re, 0.9));
  return 0.25 / (denom * denom);
}

// dims: in { args: dimensionless } out: { total_static_in_wc: M L^-1 T^-2, friction_loss_in_wc: M L^-1 T^-2 }
export function computeDuctFrictionStatic({
  shape = "round", D_in = 0, W_in = 0, H_in = 0,
  material = "galv_smooth", cfm = 0, length_ft = 0, fittings = [],
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cfm > 0)) return { error: "Airflow CFM must be positive." };
  if (!(length_ft >= 0)) return { error: "Run length must be non-negative." };
  const eps_ft = DUCT_ROUGHNESS_FT_v7[material];
  if (eps_ft === undefined) return { error: "Unknown duct material." };

  let area_ft2, D_h_ft, D_eq_ft;
  if (shape === "round") {
    if (!(D_in > 0)) return { error: "Round duct diameter must be positive." };
    const D_ft = D_in / 12;
    area_ft2 = Math.PI * D_ft * D_ft / 4;
    D_h_ft = D_ft;
    D_eq_ft = D_ft;
  } else if (shape === "rectangular") {
    if (!(W_in > 0 && H_in > 0)) return { error: "Rectangular W and H must be positive." };
    const Wft = W_in / 12, Hft = H_in / 12;
    area_ft2 = Wft * Hft;
    D_h_ft = 4 * (Wft * Hft) / (2 * (Wft + Hft));
    D_eq_ft = 1.30 * Math.pow(Wft * Hft, 0.625) / Math.pow(Wft + Hft, 0.250);
  } else {
    return { error: "Shape must be 'round' or 'rectangular'." };
  }

  const V_fpm = cfm / area_ft2;
  const V_fps = V_fpm / 60;
  const VP_in_wc = Math.pow(V_fpm / 4005, 2);
  const Re = (V_fps * D_eq_ft) / _NU_AIR;
  const f = _frictionFactor(eps_ft, D_eq_ft, Re);
  const dP_per_ft_psf = f * (1 / D_eq_ft) * (_AIR_RHO * V_fps * V_fps / (2 * _G));
  const dP_per_100_in_wc = (dP_per_ft_psf * 100 / _WATER_RHO) * 12;
  const straight_loss_in_wc = (dP_per_ft_psf * length_ft / _WATER_RHO) * 12;
  let fitting_loss_in_wc = 0;
  const fitting_breakdown = [];
  for (const fit of fittings || []) {
    let C_o;
    if (fit.C_o !== undefined && fit.C_o !== null && Number.isFinite(Number(fit.C_o))) C_o = Number(fit.C_o);
    else if (fit.kind && DUCT_FITTINGS_C_O[fit.kind] !== undefined) C_o = DUCT_FITTINGS_C_O[fit.kind];
    else return { error: "Each fitting needs a C_o or a known kind." };
    const count = Number(fit.count) || 1;
    const loss = C_o * VP_in_wc * count;
    fitting_loss_in_wc += loss;
    fitting_breakdown.push({ kind: fit.kind || "user", C_o, count, loss_in_wc: loss });
  }
  return {
    velocity_fpm: V_fpm, velocity_pressure_in_wc: VP_in_wc,
    reynolds: Re, friction_factor: f,
    friction_loss_per_100ft_in_wc: dP_per_100_in_wc,
    straight_loss_in_wc, fitting_loss_in_wc, fitting_breakdown,
    total_static_in_wc: straight_loss_in_wc + fitting_loss_in_wc,
    hydraulic_diameter_in: D_h_ft * 12, equivalent_diameter_in: D_eq_ft * 12,
  };
}

export const ductFrictionStaticExample = {
  inputs: {
    shape: "round", D_in: 12, material: "galv_smooth",
    cfm: 1200, length_ft: 60,
    fittings: [
      { kind: "elbow_90_smooth_radius", count: 4 },
      { kind: "filter_typical", count: 1 },
      { kind: "diffuser_typical", count: 2 },
    ],
  },
};

// --- 244: Cooling Tower Approach and Range ---

// dims: in { T_in_F: T, T_out_F: T, T_wb_F: T, gpm: L^3 T^-1, fan_kW: M L^2 T^-3 } out: { range_F: T, approach_F: T, evaporation_gpm: L^3 T^-1 }
export function computeCoolingTower({ T_in_F = 0, T_out_F = 0, T_wb_F = 0, gpm = 0, fan_kW = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(T_in_F > T_out_F)) return { error: "Entering temp must exceed leaving temp." };
  if (!(T_out_F > T_wb_F)) return { error: "Leaving temp must exceed wet-bulb." };
  if (!(gpm > 0)) return { error: "Flow gpm must be positive." };
  const range_F = T_in_F - T_out_F;
  const approach_F = T_out_F - T_wb_F;
  const heat_rejection_BTU_hr = gpm * 500 * range_F;
  const approach_flag = approach_F < 5 ? "tight" : approach_F > 10 ? "wide" : "in-range (5-10 °F)";
  const range_flag = range_F < 8 ? "low" : range_F > 12 ? "high" : "in-range (8-12 °F)";
  const fan_kW_per_ton = fan_kW > 0 && heat_rejection_BTU_hr > 0
    ? (fan_kW * 12000) / heat_rejection_BTU_hr : null;
  // spec-v16 C.4: thermal efficiency = range / (range + approach), where
  // range + approach = T_in - T_wb (the total driving temperature toward
  // the wet-bulb limit). A higher ratio means the tower cools closer to
  // the thermodynamic wet-bulb floor (CTI ATC-105). A tight approach
  // (5-10 °F) drives the ratio toward a well-sized tower.
  const efficiency = (range_F + approach_F) > 0 ? range_F / (range_F + approach_F) : null;
  return { range_F, approach_F, efficiency, heat_rejection_BTU_hr, approach_flag, range_flag, fan_kW_per_ton };
}

export const coolingTowerExample = {
  inputs: { T_in_F: 95, T_out_F: 85, T_wb_F: 78, gpm: 600, fan_kW: 7.5 },
};

// --- 245: Pipe / Duct Insulation Bare vs. Insulated Heat Loss ---

export const INSULATION_K_VALUES_v7 = {
  fiberglass:       { k: 0.025, description: "Mineral fiberglass pipe insulation (manufacturer typical)" },
  mineral_wool:     { k: 0.026, description: "Mineral wool pipe insulation (manufacturer typical)" },
  calcium_silicate: { k: 0.040, description: "Calcium silicate (high-temp service)" },
  elastomeric:      { k: 0.026, description: "Elastomeric foam (Armaflex / Aeroflex typical)" },
  polyiso:          { k: 0.018, description: "Polyisocyanurate rigid (manufacturer typical)" },
  pheno_foam:       { k: 0.014, description: "Phenolic foam (manufacturer typical)" },
};

function _filmCoeff(V_fpm, eps_jacket, T_surface_F, T_ambient_F) {
  const h_conv = 0.225 + 0.000625 * Math.max(0, V_fpm);
  const T_s_R = T_surface_F + 459.67;
  const T_a_R = T_ambient_F + 459.67;
  const h_rad = eps_jacket * 0.1714e-8 * ((T_s_R * T_s_R + T_a_R * T_a_R) * (T_s_R + T_a_R));
  return h_conv + h_rad;
}

// dims: in { args: dimensionless } out: { heat_loss_btuhr: M L^2 T^-3, surface_T_F: T }
export function computeInsulationHeatLoss({
  pipe_OD_in = 0, surface_T_F = 0, ambient_T_F = 0,
  air_velocity_fpm = 0, insulation = "fiberglass",
  thickness_in = 1.0, jacket_emissivity = 0.9,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_OD_in > 0)) return { error: "Pipe OD must be positive." };
  if (!(thickness_in >= 0)) return { error: "Thickness must be non-negative." };
  if (!Number.isFinite(Number(surface_T_F))) return { error: "Provide a numeric surface temperature." };
  if (!Number.isFinite(Number(ambient_T_F))) return { error: "Provide a numeric ambient temperature." };
  const m = INSULATION_K_VALUES_v7[insulation];
  if (!m) return { error: "Unknown insulation type." };
  const r1 = (pipe_OD_in / 2) / 12;
  const r2 = r1 + thickness_in / 12;
  const dT = surface_T_F - ambient_T_F;
  const h_bare = _filmCoeff(air_velocity_fpm, jacket_emissivity, surface_T_F, ambient_T_F);
  const Q_bare_per_ft = h_bare * (2 * Math.PI * r1) * dT;
  let T_s2 = surface_T_F - 0.7 * dT;
  let R_cond = 0, R_out = 0, Q_ins = 0;
  for (let i = 0; i < 12; i++) {
    R_cond = Math.log(r2 / r1) / (2 * Math.PI * m.k);
    const h_out = _filmCoeff(air_velocity_fpm, jacket_emissivity, T_s2, ambient_T_F);
    R_out = 1 / (h_out * 2 * Math.PI * r2);
    Q_ins = dT / (R_cond + R_out);
    T_s2 = surface_T_F - Q_ins * R_cond;
  }
  const effectiveness_pct = Q_bare_per_ft > 0 ? (1 - Q_ins / Q_bare_per_ft) * 100 : 0;
  return {
    Q_bare_BTU_hr_ft: Q_bare_per_ft,
    Q_insulated_BTU_hr_ft: Q_ins,
    outer_surface_T_F: T_s2,
    effectiveness_pct,
    insulation_label: m.description, k_value: m.k,
  };
}

export const insulationHeatLossExample = {
  inputs: {
    pipe_OD_in: 2.375, surface_T_F: 200, ambient_T_F: 70, air_velocity_fpm: 0,
    insulation: "fiberglass", thickness_in: 1.5, jacket_emissivity: 0.9,
  },
};

// --- v7 renderers ---

function _v7h_renderDuctFrictionStatic(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Darcy-Weisbach with Swamee-Jain Colebrook approximation. ASHRAE Fundamentals duct-design chapter by name. Roughness from data/hvac/duct-roughness.json; fitting C_o from data/hvac/duct-fittings.json.";
  _v7h_attachEx(inputRegion, () => fillExample(ductFrictionStaticExample.inputs));
  const shape = _v7h_makeSelect("Duct shape", "df-shape", [{ value: "round", label: "Round" }, { value: "rectangular", label: "Rectangular" }]);
  const D = _v7h_makeNumber("Round D (in)", "df-d", { step: "any", min: "0" });
  const W = _v7h_makeNumber("Rect W (in)", "df-w", { step: "any", min: "0" });
  const H = _v7h_makeNumber("Rect H (in)", "df-h", { step: "any", min: "0" });
  const mat = _v7h_makeSelect("Material", "df-mat", Object.keys(DUCT_ROUGHNESS_FT_v7).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const cfm = _v7h_makeNumber("Airflow (CFM)", "df-cfm", { step: "any", min: "0" });
  const len = _v7h_makeNumber("Run length (ft)", "df-len", { step: "any", min: "0" });
  const fitN = _v7h_makeSelect("Fitting kind", "df-fit-k", [{ value: "", label: "(none / done)" }].concat(Object.keys(DUCT_FITTINGS_C_O).map((k) => ({ value: k, label: k.replace(/_/g, " ") + " (Co=" + DUCT_FITTINGS_C_O[k] + ")" }))));
  const fitC = _v7h_makeNumber("Fitting count", "df-fit-c", { step: "1", min: "0" });
  fitC.input.value = "1";
  for (const f of [shape, D, W, H, mat, cfm, len, fitN, fitC]) inputRegion.appendChild(f.wrap);
  const oV = _v7h_makeOut(outputRegion, "Velocity", "df-out-v");
  const oVP = _v7h_makeOut(outputRegion, "Velocity pressure", "df-out-vp");
  const oF = _v7h_makeOut(outputRegion, "Friction factor", "df-out-f");
  const oFr = _v7h_makeOut(outputRegion, "Friction per 100 ft", "df-out-fr");
  const oS = _v7h_makeOut(outputRegion, "Straight-duct static", "df-out-s");
  const oFi = _v7h_makeOut(outputRegion, "Fitting losses", "df-out-fi");
  const oT = _v7h_makeOut(outputRegion, "Total static", "df-out-t");
  function fillExample(x) {
    shape.select.value = x.shape; D.input.value = x.D_in || ""; W.input.value = x.W_in || ""; H.input.value = x.H_in || "";
    mat.select.value = x.material; cfm.input.value = x.cfm; len.input.value = x.length_ft;
    if (x.fittings && x.fittings.length > 0) { fitN.select.value = x.fittings[0].kind; fitC.input.value = x.fittings[0].count; }
    update();
  }
  const update = _v7h_debounce(() => {
    const fittings = [];
    if (fitN.select.value) fittings.push({ kind: fitN.select.value, count: Number(fitC.input.value) || 1 });
    const r = computeDuctFrictionStatic({
      shape: shape.select.value,
      D_in: Number(D.input.value) || 0,
      W_in: Number(W.input.value) || 0, H_in: Number(H.input.value) || 0,
      material: mat.select.value,
      cfm: Number(cfm.input.value) || 0,
      length_ft: Number(len.input.value) || 0,
      fittings,
    });
    if (r.error) { oV.textContent = r.error; oVP.textContent = "-"; oF.textContent = "-"; oFr.textContent = "-"; oS.textContent = "-"; oFi.textContent = "-"; oT.textContent = "-"; return; }
    oV.textContent = _v7h_fmt(r.velocity_fpm, 0) + " fpm";
    oVP.textContent = _v7h_fmt(r.velocity_pressure_in_wc, 4) + " in WC";
    oF.textContent = _v7h_fmt(r.friction_factor, 5);
    oFr.textContent = _v7h_fmt(r.friction_loss_per_100ft_in_wc, 4) + " in WC / 100 ft";
    oS.textContent = _v7h_fmt(r.straight_loss_in_wc, 4) + " in WC";
    oFi.textContent = _v7h_fmt(r.fitting_loss_in_wc, 4) + " in WC";
    oT.textContent = _v7h_fmt(r.total_static_in_wc, 4) + " in WC";
  }, _V7H_DEB);
  for (const f of [shape.select, D.input, W.input, H.input, mat.select, cfm.input, len.input, fitN.select, fitC.input]) f.addEventListener("input", update);
}

function _v7h_renderCoolingTower(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Range = T_in - T_out; approach = T_out - T_wb; efficiency = range / (range + approach); heat rejection = gpm × 500 × range BTU/hr. Cooling Technology Institute (CTI) ATC-105 standard practice by name; the wet-bulb is the thermodynamic floor.";
  _v7h_attachEx(inputRegion, () => fillExample(coolingTowerExample.inputs));
  const tin = _v7h_makeNumber("Entering water T (°F)", "ct-in", { step: "any" });
  const tout = _v7h_makeNumber("Leaving water T (°F)", "ct-out", { step: "any" });
  const twb = _v7h_makeNumber("Ambient wet-bulb (°F)", "ct-wb", { step: "any" });
  const gpm = _v7h_makeNumber("Design flow (gpm)", "ct-gpm", { step: "any", min: "0" });
  const fan = _v7h_makeNumber("Fan kW (optional)", "ct-fan", { step: "any", min: "0" });
  for (const f of [tin, tout, twb, gpm, fan]) inputRegion.appendChild(f.wrap);
  const oR = _v7h_makeOut(outputRegion, "Range", "ct-out-r");
  const oA = _v7h_makeOut(outputRegion, "Approach", "ct-out-a");
  const oEff = _v7h_makeOut(outputRegion, "Efficiency", "ct-out-eff");
  const oH = _v7h_makeOut(outputRegion, "Heat rejection", "ct-out-h");
  const oF = _v7h_makeOut(outputRegion, "Fan kW per ton", "ct-out-f");
  function fillExample(x) { tin.input.value = x.T_in_F; tout.input.value = x.T_out_F; twb.input.value = x.T_wb_F; gpm.input.value = x.gpm; fan.input.value = x.fan_kW; update(); }
  const update = _v7h_debounce(() => {
    const r = computeCoolingTower({
      T_in_F: Number(tin.input.value) || 0, T_out_F: Number(tout.input.value) || 0,
      T_wb_F: Number(twb.input.value) || 0, gpm: Number(gpm.input.value) || 0,
      fan_kW: Number(fan.input.value) || 0,
    });
    if (r.error) { oR.textContent = r.error; oA.textContent = "-"; oEff.textContent = "-"; oH.textContent = "-"; oF.textContent = "-"; return; }
    oR.textContent = _v7h_fmt(r.range_F, 1) + " °F (" + r.range_flag + ")";
    oA.textContent = _v7h_fmt(r.approach_F, 1) + " °F (" + r.approach_flag + ")";
    oEff.textContent = r.efficiency === null ? "-" : _v7h_fmt(r.efficiency * 100, 1) + "% (range / (range + approach))";
    oH.textContent = _v7h_fmt(r.heat_rejection_BTU_hr, 0) + " BTU/hr (" + _v7h_fmt(r.heat_rejection_BTU_hr / 12000, 2) + " tons)";
    oF.textContent = r.fan_kW_per_ton === null ? "-" : _v7h_fmt(r.fan_kW_per_ton, 3) + " kW/ton";
  }, _V7H_DEB);
  for (const f of [tin.input, tout.input, twb.input, gpm.input, fan.input]) f.addEventListener("input", update);
}

function _v7h_renderInsulationHeatLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cylindrical conduction Q = (T_s - T_a) / (R_cond + R_outside) where R_cond = ln(r2/r1)/(2π k). Outside film coefficient h = h_conv(V) + h_rad(eps, T). k values from data/hvac/insulation-k-values.json (manufacturer-attributed).";
  _v7h_attachEx(inputRegion, () => fillExample(insulationHeatLossExample.inputs));
  const od = _v7h_makeNumber("Pipe OD (in)", "ih-od", { step: "any", min: "0" });
  const ts = _v7h_makeNumber("Pipe surface T (°F)", "ih-ts", { step: "any" });
  const ta = _v7h_makeNumber("Ambient T (°F)", "ih-ta", { step: "any" });
  const v = _v7h_makeNumber("Air velocity (fpm)", "ih-v", { step: "any", min: "0" });
  const ins = _v7h_makeSelect("Insulation type", "ih-ins", Object.keys(INSULATION_K_VALUES_v7).map((k) => ({ value: k, label: INSULATION_K_VALUES_v7[k].description })));
  const t = _v7h_makeNumber("Thickness (in)", "ih-t", { step: "any", min: "0" });
  const eps = _v7h_makeNumber("Jacket emissivity (0-1)", "ih-eps", { step: "any", min: "0", max: "1" });
  eps.input.value = "0.9";
  for (const f of [od, ts, ta, v, ins, t, eps]) inputRegion.appendChild(f.wrap);
  const oB = _v7h_makeOut(outputRegion, "Q bare", "ih-out-b");
  const oI = _v7h_makeOut(outputRegion, "Q insulated", "ih-out-i");
  const oS = _v7h_makeOut(outputRegion, "Outer surface T", "ih-out-s");
  const oE = _v7h_makeOut(outputRegion, "Effectiveness", "ih-out-e");
  function fillExample(x) {
    od.input.value = x.pipe_OD_in; ts.input.value = x.surface_T_F; ta.input.value = x.ambient_T_F;
    v.input.value = x.air_velocity_fpm; ins.select.value = x.insulation; t.input.value = x.thickness_in;
    eps.input.value = x.jacket_emissivity; update();
  }
  const update = _v7h_debounce(() => {
    const r = computeInsulationHeatLoss({
      pipe_OD_in: Number(od.input.value) || 0,
      surface_T_F: Number(ts.input.value) || 0, ambient_T_F: Number(ta.input.value) || 0,
      air_velocity_fpm: Number(v.input.value) || 0,
      insulation: ins.select.value, thickness_in: Number(t.input.value) || 0,
      jacket_emissivity: Number(eps.input.value) || 0.9,
    });
    if (r.error) { oB.textContent = r.error; oI.textContent = "-"; oS.textContent = "-"; oE.textContent = "-"; return; }
    oB.textContent = _v7h_fmt(r.Q_bare_BTU_hr_ft, 1) + " BTU/hr·ft";
    oI.textContent = _v7h_fmt(r.Q_insulated_BTU_hr_ft, 1) + " BTU/hr·ft";
    oS.textContent = _v7h_fmt(r.outer_surface_T_F, 1) + " °F";
    oE.textContent = _v7h_fmt(r.effectiveness_pct, 1) + " %";
  }, _V7H_DEB);
  for (const f of [od.input, ts.input, ta.input, v.input, ins.select, t.input, eps.input]) f.addEventListener("input", update);
}

// Add v7 ids to the renderer registry.
HVAC_RENDERERS["duct-friction-static"] = _v7h_renderDuctFrictionStatic;
HVAC_RENDERERS["cooling-tower"] = _v7h_renderCoolingTower;
HVAC_RENDERERS["insulation-heat-loss"] = _v7h_renderInsulationHeatLoss;

// =====================================================================
// v8 Phase E.3 (utility 255): Duct Leakage Test-and-Balance
// =====================================================================

// SMACNA Duct Leakage Test Manual leakage classes (cfm per 100 ft^2 of
// duct surface at 1 in WC). Class numbers are the SMACNA-published
// constants; lower class = tighter duct.
export const SMACNA_LEAKAGE_CLASSES = {
  3:  { cfm_per_100ft2_at_1inwc: 3,  description: "Class 3 - new sealed metal duct (best practice)" },
  6:  { cfm_per_100ft2_at_1inwc: 6,  description: "Class 6 - sealed metal duct" },
  12: { cfm_per_100ft2_at_1inwc: 12, description: "Class 12 - sealed flexible / fibrous-glass duct" },
  24: { cfm_per_100ft2_at_1inwc: 24, description: "Class 24 - unsealed metal / unsealed flex" },
  48: { cfm_per_100ft2_at_1inwc: 48, description: "Class 48 - severely-leaking duct (failure)" },
};

// dims: in { args: dimensionless } out: { leakage_cfm: L^3 T^-1, leakage_percent: dimensionless }
export function computeDuctLeakage({
  design_cfm = 0, measured_cfm = 0,
  duct_surface_ft2 = 0, test_pressure_inwc = 1.0,
  design_class = 6,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(design_cfm > 0)) return { error: "Design CFM must be positive." };
  if (!(measured_cfm >= 0)) return { error: "Measured CFM must be non-negative." };
  if (!(duct_surface_ft2 > 0)) return { error: "Duct surface area must be positive." };
  if (!(test_pressure_inwc > 0)) return { error: "Test pressure must be positive." };
  const target = SMACNA_LEAKAGE_CLASSES[design_class];
  if (!target) return { error: "Unknown SMACNA leakage class. Valid: 3, 6, 12, 24, 48." };
  const leakage_cfm = Math.max(0, design_cfm - measured_cfm);
  const leakage_pct = (leakage_cfm / design_cfm) * 100;
  // Normalize to SMACNA reference at 1 in WC: leak scales with sqrt(P).
  const leak_at_1inwc = leakage_cfm / Math.sqrt(test_pressure_inwc);
  const leak_per_100ft2 = (leak_at_1inwc / duct_surface_ft2) * 100;
  // Determine effective class (the smallest class number whose limit
  // exceeds the measured leak).
  const sortedClasses = Object.keys(SMACNA_LEAKAGE_CLASSES).map(Number).sort((a, b) => a - b);
  let effective_class = sortedClasses[sortedClasses.length - 1];
  for (const c of sortedClasses) {
    if (leak_per_100ft2 <= SMACNA_LEAKAGE_CLASSES[c].cfm_per_100ft2_at_1inwc) { effective_class = c; break; }
  }
  const pass = leak_per_100ft2 <= target.cfm_per_100ft2_at_1inwc;
  return {
    leakage_cfm, leakage_pct,
    leak_at_1inwc, leak_per_100ft2,
    effective_class,
    target_class: design_class, target_label: target.description,
    pass,
  };
}

export const ductLeakageExample = {
  inputs: { design_cfm: 1200, measured_cfm: 1140, duct_surface_ft2: 600, test_pressure_inwc: 1.0, design_class: 6 },
};

function _v8h_renderDuctLeakage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: SMACNA Duct Leakage Test Manual (3rd ed.) by name. ASHRAE 90.1-2022 §6.4.4.2 references the leakage-class system. Leakage scales with sqrt(P) per the orifice-flow model.";
  _v7h_attachEx(inputRegion, () => fillExample(ductLeakageExample.inputs));
  const dc = _v7h_makeNumber("Design CFM", "dl-dc", { step: "any", min: "0" });
  const mc = _v7h_makeNumber("Measured CFM at registers", "dl-mc", { step: "any", min: "0" });
  const sf = _v7h_makeNumber("Duct surface area (ft²)", "dl-sf", { step: "any", min: "0" });
  const tp = _v7h_makeNumber("Test pressure (in WC)", "dl-tp", { step: "any", min: "0" });
  tp.input.value = "1.0";
  const cl = _v7h_makeSelect("Design class", "dl-cl", Object.keys(SMACNA_LEAKAGE_CLASSES).map((k) => ({ value: k, label: SMACNA_LEAKAGE_CLASSES[k].description })));
  cl.select.value = "6";
  for (const f of [dc, mc, sf, tp, cl]) inputRegion.appendChild(f.wrap);
  const oL = _v7h_makeOut(outputRegion, "Leakage", "dl-out-l");
  const oP = _v7h_makeOut(outputRegion, "Leakage % of design", "dl-out-p");
  const oC = _v7h_makeOut(outputRegion, "Effective leakage class", "dl-out-c");
  const oF = _v7h_makeOut(outputRegion, "Pass/fail", "dl-out-f");
  function fillExample(x) { dc.input.value = x.design_cfm; mc.input.value = x.measured_cfm; sf.input.value = x.duct_surface_ft2; tp.input.value = x.test_pressure_inwc; cl.select.value = String(x.design_class); update(); }
  const update = _v7h_debounce(() => {
    const r = computeDuctLeakage({
      design_cfm: Number(dc.input.value) || 0, measured_cfm: Number(mc.input.value) || 0,
      duct_surface_ft2: Number(sf.input.value) || 0, test_pressure_inwc: Number(tp.input.value) || 0,
      design_class: Number(cl.select.value),
    });
    if (r.error) { oL.textContent = r.error; oP.textContent = "-"; oC.textContent = "-"; oF.textContent = "-"; return; }
    oL.textContent = _v7h_fmt(r.leakage_cfm, 1) + " CFM (" + _v7h_fmt(r.leak_per_100ft2, 1) + " CFM per 100 ft² at 1 in WC)";
    oP.textContent = _v7h_fmt(r.leakage_pct, 2) + " %";
    oC.textContent = "Class " + r.effective_class;
    oF.textContent = r.pass ? "PASS (≤ Class " + r.target_class + ")" : "FAIL (exceeds Class " + r.target_class + ")";
  }, _V7H_DEB);
  for (const f of [dc.input, mc.input, sf.input, tp.input, cl.select]) f.addEventListener("input", update);
}

HVAC_RENDERERS["duct-leakage"] = _v8h_renderDuctLeakage;

// =====================================================================
// v9 §B.2: ASHRAE 62.1 outdoor-air ventilation requirement
// =====================================================================
//
// Public formula from ASHRAE 62.1 §6.2.2.1 single-zone breathing-zone
// procedure:
//
//   Vbz = Rp * Pz + Ra * Az
//   Voz = Vbz / E_z
//
// Where:
//   Rp = outdoor air rate per person (cfm/person)
//   Pz = zone population (people)
//   Ra = outdoor air rate per floor area (cfm/ft^2)
//   Az = zone floor area (ft^2)
//   E_z = zone air-distribution effectiveness (Table 6-2; default 1.0)
//
// Per spec-v9 §B.2 the Rp / Ra values from ASHRAE 62.1 Table 6-1 are
// NOT bundled. The user enters them. Small placeholder presets for
// office / classroom / retail are provided as starting points; the
// tile prominently states that the user must confirm against the
// AHJ-adopted edition.

// Placeholder defaults. These are commonly cited values for ASHRAE
// 62.1-2022 Table 6-1 but the user MUST confirm against the AHJ-
// adopted edition before relying on them.
export const OA_OCCUPANCY_PRESETS = {
  custom:    { Rp: 0,   Ra: 0,    label: "Custom (enter Rp and Ra from your edition)" },
  office:    { Rp: 5,   Ra: 0.06, label: "Office space (ASHRAE 62.1-2022 placeholder)" },
  classroom: { Rp: 10,  Ra: 0.12, label: "Classroom 9+ (ASHRAE 62.1-2022 placeholder)" },
  retail:    { Rp: 7.5, Ra: 0.12, label: "Retail sales floor (ASHRAE 62.1-2022 placeholder)" },
};

// dims: in { args: dimensionless } out: { required_cfm: L^3 T^-1 }
export function computeOutdoorAirVentilation({
  Rp_cfm_per_person = 0,
  Ra_cfm_per_ft2 = 0,
  people = 0,
  floor_area_ft2 = 0,
  Ez = 1.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Rp = Number(Rp_cfm_per_person) || 0;
  const Ra = Number(Ra_cfm_per_ft2) || 0;
  const Pz = Number(people) || 0;
  const Az = Number(floor_area_ft2) || 0;
  // Use the provided value verbatim so explicit zero is caught below.
  const E_z = Number(Ez);
  if (!(Pz > 0)) return { error: "People count must be positive." };
  if (!(Az > 0)) return { error: "Floor area must be positive (ft^2)." };
  if (!(Rp >= 0)) return { error: "Rp must be non-negative." };
  if (!(Ra >= 0)) return { error: "Ra must be non-negative." };
  if (!Number.isFinite(E_z) || !(E_z > 0)) return { error: "Air-distribution effectiveness must be positive." };

  const Vbz_cfm = Rp * Pz + Ra * Az;
  const Voz_cfm = Vbz_cfm / E_z;
  const cfm_per_person = Pz > 0 ? Voz_cfm / Pz : null;
  const cfm_per_ft2 = Az > 0 ? Voz_cfm / Az : null;

  const warnings = [];
  if (E_z < 0.5 || E_z > 1.2) {
    warnings.push("Zone air-distribution effectiveness " + E_z.toFixed(2) + " is outside the ASHRAE 62.1 Table 6-2 typical range of 0.5 to 1.2; verify against the adopted edition.");
  }
  warnings.push("Rp and Ra are user-supplied. ASHRAE 62.1 Table 6-1 governs the per-occupancy values for the AHJ-adopted edition. The tile does not bundle the table.");

  return {
    Vbz_cfm,
    Voz_cfm,
    cfm_per_person,
    cfm_per_ft2,
    Rp_cfm_per_person: Rp,
    Ra_cfm_per_ft2: Ra,
    Ez: E_z,
    warnings,
  };
}

export const outdoorAirVentilationExample = {
  // 25-person open office, 2500 ft^2, Rp=5, Ra=0.06, ceiling supply -> E_z=1.0.
  // Vbz = 5*25 + 0.06*2500 = 125 + 150 = 275 cfm.
  inputs: { Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 2500, Ez: 1.0 },
};

import { renderLimitationBanner as _v9oa_banner, getLimitationCopy as _v9oa_copy } from "./limitation-banner.js";

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOutdoorAirVentilation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per ASHRAE 62.1-2022 §6.2.2.1 (single-zone breathing-zone procedure). Rp and Ra values per Table 6-1 of the AHJ-adopted edition; the tile does not bundle the table. AHJ governs adopted edition. Free at ashrae.org for TOC.";
  _v9oa_banner(inputRegion, _v9oa_copy("outdoor-air-ventilation"));

  const preset = makeSelect("Occupancy preset (placeholders only; confirm against edition)", "oav-preset",
    Object.keys(OA_OCCUPANCY_PRESETS).map((k) => ({ value: k, label: OA_OCCUPANCY_PRESETS[k].label })),
  );
  const rp = makeNumber("Rp (cfm per person)", "oav-rp", { step: "any", min: "0" });
  const ra = makeNumber("Ra (cfm per ft^2)", "oav-ra", { step: "any", min: "0" });
  const ppl = makeNumber("People (Pz)", "oav-people", { step: "1", min: "0" });
  const area = makeNumber("Floor area (ft^2; Az)", "oav-area", { step: "any", min: "0" });
  const ez = makeNumber("Air-distribution effectiveness (E_z; default 1.0)", "oav-ez", { step: "any", min: "0", value: "1.0" });
  ez.input.value = "1.0";
  for (const f of [preset, rp, ra, ppl, area, ez]) inputRegion.appendChild(f.wrap);

  // Picking a preset fills Rp/Ra. User can override afterward.
  preset.select.addEventListener("change", () => {
    const p = OA_OCCUPANCY_PRESETS[preset.select.value];
    if (p && preset.select.value !== "custom") {
      rp.input.value = String(p.Rp);
      ra.input.value = String(p.Ra);
      update();
    }
  });

  attachExampleButton(inputRegion, () => {
    preset.select.value = "office"; rp.input.value = "5"; ra.input.value = "0.06";
    ppl.input.value = "25"; area.input.value = "2500"; ez.input.value = "1.0"; update();
  });

  const oVbz = makeOutputLine(outputRegion, "Vbz breathing-zone outdoor air (cfm)", "oav-out-vbz");
  const oVoz = makeOutputLine(outputRegion, "Voz zone outdoor airflow (cfm)", "oav-out-voz");
  const oPP = makeOutputLine(outputRegion, "Per-person (cfm/person)", "oav-out-pp");
  const oPF = makeOutputLine(outputRegion, "Per area (cfm/ft^2)", "oav-out-pf");
  const oW = makeOutputLine(outputRegion, "Notes", "oav-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeOutdoorAirVentilation({
      Rp_cfm_per_person: readNum(rp.input),
      Ra_cfm_per_ft2: readNum(ra.input),
      people: readNum(ppl.input),
      floor_area_ft2: readNum(area.input),
      Ez: readNum(ez.input),
    });
    if (r.error) {
      oVbz.textContent = r.error; oVoz.textContent = ""; oPP.textContent = ""; oPF.textContent = ""; oW.textContent = "";
      return;
    }
    oVbz.textContent = fmt(r.Vbz_cfm, 1) + " cfm";
    oVoz.textContent = fmt(r.Voz_cfm, 1) + " cfm";
    oPP.textContent = fmt(r.cfm_per_person, 2) + " cfm/person";
    oPF.textContent = fmt(r.cfm_per_ft2, 3) + " cfm/ft^2";
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [rp.input, ra.input, ppl.input, area.input, ez.input]) f.addEventListener("input", update);
}

HVAC_RENDERERS["outdoor-air-ventilation"] = renderOutdoorAirVentilation;

// v9 §B.3 commercial kitchen hood exhaust (Type I and Type II).
// IMC 2021 §507.13 published cfm-per-linear-foot multipliers by hood
// type and cooking-appliance duty. The numeric multipliers are formula
// coefficients per v9 §B.3 discipline; cited by name, not as a code-
// table reproduction. AHJ governs final equipment selection.
export const HOOD_DUTY_MULTIPLIERS_CFM_PER_FT = {
  // Type I (grease) hood-type x duty table. null = duty not allowed
  // for that hood type per IMC 507.13 (operator must reselect duty
  // or hood type).
  "wall-canopy":      { light: 200, medium: 300, heavy: 400, "extra-heavy": 550 },
  "single-island":    { light: 400, medium: 500, heavy: 600, "extra-heavy": 700 },
  "double-island":    { light: 250, medium: 300, heavy: 400, "extra-heavy": 550 },
  "backshelf":        { light: 250, medium: 300, heavy: 400, "extra-heavy": null },
  "proximity":        { light: 250, medium: 300, heavy: 400, "extra-heavy": null },
  "pass-over":        { light: 250, medium: 300, heavy: 400, "extra-heavy": null },
};

// Type II vapor-only hoods (IMC 507.20) - flat rate per linear foot.
export const TYPE_II_HOOD_CFM_PER_FT = 100;

// dims: in { args: dimensionless } out: { required_cfm: L^3 T^-1 }
export function computeHoodExhaust({
  hood_type = "wall-canopy",
  hood_class = "I",
  duty = "medium",
  length_ft = 0,
  width_ft = 0,
  duct_velocity_fpm = 1500,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const Vd = Number(duct_velocity_fpm) || 1500;
  if (L <= 0) return { error: "Hood length must be positive (ft)." };
  if (hood_class !== "I" && hood_class !== "II") return { error: "Hood class must be 'I' (grease) or 'II' (vapor)." };

  const warnings = [];
  if (L < 4) warnings.push("Hood length below 4 ft is unusual; verify against the appliance footprint and IMC 507.13.");
  if (L > 16) warnings.push("Hood length above 16 ft is unusual; long hoods often split into multiple sections - verify the duty selection.");

  let Q_cfm = 0;
  let cfm_per_ft = 0;
  if (hood_class === "II") {
    if (W <= 0) return { error: "Type II vapor-only hood requires positive width (ft)." };
    cfm_per_ft = TYPE_II_HOOD_CFM_PER_FT;
    Q_cfm = cfm_per_ft * L;
    warnings.push("Type II vapor-only: greasy effluent requires a Type I hood. Confirm the appliance bank is dishwasher / oven / steam-kettle class only.");
  } else {
    const row = HOOD_DUTY_MULTIPLIERS_CFM_PER_FT[hood_type];
    if (!row) return { error: "Unknown Type I hood type '" + hood_type + "'." };
    const m = row[duty];
    if (m == null) return { error: "Duty '" + duty + "' is not permitted with hood type '" + hood_type + "' per IMC 507.13." };
    cfm_per_ft = m;
    Q_cfm = m * L;
  }

  // Makeup air per IMC 508: typically 80 percent of exhaust as a
  // balance-check rule of thumb; AHJ governs final balance.
  const makeup_cfm = 0.80 * Q_cfm;

  // Duct sizing: duct area (in^2) = Q_cfm / duct_velocity_fpm * 144.
  // Recommended Type I velocity range per IMC 506 / NFPA 96: 500 - 2000 fpm.
  const duct_area_in2 = Vd > 0 ? (Q_cfm / Vd) * 144 : 0;
  if (hood_class === "I" && (Vd < 500 || Vd > 2000)) {
    warnings.push("Type I duct velocity outside 500-2000 fpm range; NFPA 96 §8.2.1.1 governs minimum velocity to keep grease suspended.");
  }

  return {
    Q_exhaust_cfm: Q_cfm,
    cfm_per_ft,
    makeup_cfm,
    duct_area_in2,
    grease_duct_slope_in_per_ft: hood_class === "I" ? 0.25 : 0,
    warnings,
  };
}

export const hoodExhaustExample = {
  // Spec-v9 §B.3 worked example: 8 ft wall-canopy heavy-duty hood ->
  // 400 cfm/ft * 8 = 3200 cfm exhaust, 2560 cfm makeup.
  inputs: { hood_type: "wall-canopy", hood_class: "I", duty: "heavy", length_ft: 8, duct_velocity_fpm: 1500 },
};

function renderHoodExhaust(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per IMC 2021 §507.13 (Type I grease hoods) and §507.20 (Type II vapor-only hoods). Duty multipliers (200 / 300 / 400 / 550 cfm/ft for wall-canopy) are formula coefficients per the published IMC. NFPA 96-2024 governs grease-handling exhaust system design. Makeup air per IMC 508. AHJ governs final equipment selection. Free at codes.iccsafe.org for IMC TOC and at nfpa.org/freeaccess for NFPA 96 TOC.";

  const cls = makeSelect("Hood class", "he-class", [
    { value: "I", label: "Type I (grease, hot)" },
    { value: "II", label: "Type II (vapor only)" },
  ]);
  const ht = makeSelect("Type I hood type (ignored for Type II)", "he-ht", [
    { value: "wall-canopy", label: "Wall-canopy" },
    { value: "single-island", label: "Single-island canopy" },
    { value: "double-island", label: "Double-island canopy" },
    { value: "backshelf", label: "Backshelf" },
    { value: "proximity", label: "Proximity" },
    { value: "pass-over", label: "Pass-over" },
  ]);
  const duty = makeSelect("Cooking-appliance duty", "he-duty", [
    { value: "light", label: "Light (steam, oven)" },
    { value: "medium", label: "Medium (range, fryer)" },
    { value: "heavy", label: "Heavy (charbroiler, wok)" },
    { value: "extra-heavy", label: "Extra-heavy (solid-fuel, mesquite)" },
  ]);
  const len = makeNumber("Hood length (ft)", "he-len", { step: "any", min: "0" });
  const wid = makeNumber("Hood width (ft; Type II only)", "he-wid", { step: "any", min: "0" });
  const vel = makeNumber("Duct velocity (fpm; default 1500)", "he-vel", { step: "any", min: "0", value: "1500" });
  vel.input.value = "1500";
  for (const f of [cls, ht, duty, len, wid, vel]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    cls.select.value = "I"; ht.select.value = "wall-canopy"; duty.select.value = "heavy";
    len.input.value = "8"; vel.input.value = "1500"; wid.input.value = ""; update();
  });

  const oQ = makeOutputLine(outputRegion, "Exhaust airflow Q (cfm)", "he-out-q");
  const oC = makeOutputLine(outputRegion, "Multiplier (cfm/ft of length)", "he-out-c");
  const oM = makeOutputLine(outputRegion, "Makeup air (cfm; 80%)", "he-out-m");
  const oA = makeOutputLine(outputRegion, "Duct area (in^2; at chosen velocity)", "he-out-a");
  const oS = makeOutputLine(outputRegion, "Grease-duct slope reminder", "he-out-s");
  const oW = makeOutputLine(outputRegion, "Notes", "he-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeHoodExhaust({
      hood_class: cls.select.value,
      hood_type: ht.select.value,
      duty: duty.select.value,
      length_ft: readNum(len.input),
      width_ft: readNum(wid.input),
      duct_velocity_fpm: readNum(vel.input),
    });
    if (r.error) {
      oQ.textContent = r.error; oC.textContent = ""; oM.textContent = ""; oA.textContent = ""; oS.textContent = ""; oW.textContent = "";
      return;
    }
    oQ.textContent = fmt(r.Q_exhaust_cfm, 0) + " cfm";
    oC.textContent = fmt(r.cfm_per_ft, 0) + " cfm/ft";
    oM.textContent = fmt(r.makeup_cfm, 0) + " cfm";
    oA.textContent = fmt(r.duct_area_in2, 1) + " in^2";
    oS.textContent = r.grease_duct_slope_in_per_ft > 0 ? (fmt(r.grease_duct_slope_in_per_ft, 2) + " in/ft (per IMC 506.3)") : "N/A (Type II)";
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [cls.select, ht.select, duty.select, len.input, wid.input, vel.input]) el.addEventListener("input", update);
  for (const el of [cls.select, ht.select, duty.select]) el.addEventListener("change", update);
}

HVAC_RENDERERS["hood-exhaust"] = renderHoodExhaust;

// v9 §B.1 sensible heat ratio and latent load split.
// Field-measurement tile: given the total cooling capacity (or measured
// total Q), return-air dry-bulb / wet-bulb, supply-air dry-bulb, and
// register CFM, compute the sensible / latent split, SHR, and supply
// humidity ratio. Altitude correction applied via the standard
// atmosphere density ratio. ASHRAE Fundamentals 2021 Ch. 1 / Ch. 18.

// Saturation vapor pressure at temperature T (C), in kPa. ASHRAE
// Fundamentals 2021 Ch. 1 equation 6 (Hyland-Wexler simplified;
// Magnus-Tetens form is adequate for the SHR tile's 32-120 F range).
function _v9_satPressure_kPa(T_C) {
  // Magnus form: e_s = 0.61094 * exp(17.625 * T / (T + 243.04)).
  return 0.61094 * Math.exp((17.625 * T_C) / (T_C + 243.04));
}

// Humidity ratio (lb water / lb dry air) from dry-bulb and wet-bulb (F)
// at total pressure P (kPa). ASHRAE Fundamentals 2021 Ch. 1 §35-37.
function _v9_humidityRatio({ T_db_F, T_wb_F, P_kPa }) {
  const T_db_C = (T_db_F - 32) * 5 / 9;
  const T_wb_C = (T_wb_F - 32) * 5 / 9;
  if (T_wb_F > T_db_F + 1e-9) return null;
  const e_s_wb = _v9_satPressure_kPa(T_wb_C);
  const W_s_wb = 0.621945 * e_s_wb / (P_kPa - e_s_wb);
  // ASHRAE Fund Ch. 1 eq. 35: W = ((2501 - 2.326*T_wb_C)*W_s_wb - 1.006*(T_db_C - T_wb_C))
  //                               / (2501 + 1.86*T_db_C - 4.186*T_wb_C)
  const num = (2501 - 2.326 * T_wb_C) * W_s_wb - 1.006 * (T_db_C - T_wb_C);
  const den = 2501 + 1.86 * T_db_C - 4.186 * T_wb_C;
  return num / den;
}

// Standard-atmosphere pressure (kPa) at altitude z (ft). ASHRAE Fund
// Ch. 1 eq. 3. Sea-level P0 = 101.325 kPa.
function _v9_pressureAtAltitude_kPa(z_ft) {
  const z_m = z_ft * 0.3048;
  return 101.325 * Math.pow(1 - 2.25577e-5 * z_m, 5.2559);
}

// dims: in { args: dimensionless } out: { shr: dimensionless, latent_btuhr: M L^2 T^-3, sensible_btuhr: M L^2 T^-3 }
export function computeSHRLatent({
  total_capacity_btu_hr = 0,
  return_db_F = 75,
  return_wb_F = 63,
  supply_db_F = 55,
  cfm = 0,
  altitude_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q_tot = Number(total_capacity_btu_hr) || 0;
  const T_ra = Number(return_db_F);
  const T_wb_ra = Number(return_wb_F);
  const T_sa = Number(supply_db_F);
  const CFM = Number(cfm) || 0;
  const z = Number(altitude_ft) || 0;
  if (Q_tot <= 0) return { error: "Total cooling capacity must be positive (Btu/hr)." };
  if (CFM <= 0) return { error: "Register CFM must be positive." };
  if (!Number.isFinite(T_ra) || !Number.isFinite(T_wb_ra) || !Number.isFinite(T_sa)) return { error: "Temperatures must be numeric (F)." };
  if (T_wb_ra > T_ra + 1e-9) return { error: "Wet-bulb cannot exceed dry-bulb at the same point." };
  if (T_sa >= T_ra) return { error: "Supply dry-bulb must be below return dry-bulb for a cooling tile." };

  const warnings = [];
  if (z < 0 || z > 12000) warnings.push("Altitude " + z + " ft is outside the standard-atmosphere correction's typical range (0 - 12,000 ft); verify against an ASHRAE psychrometric chart at the operating altitude.");

  const P_kPa = _v9_pressureAtAltitude_kPa(z);
  const P_sea_kPa = 101.325;
  const rho_ratio = P_kPa / P_sea_kPa; // dry-air density ratio at constant T.

  const Q_s = 1.08 * CFM * (T_ra - T_sa) * rho_ratio;
  if (Q_s > Q_tot) warnings.push("Computed sensible (" + Q_s.toFixed(0) + " Btu/hr) exceeds reported total (" + Q_tot.toFixed(0) + " Btu/hr); the measurement or capacity value is inconsistent. Verify CFM, supply temperature, or rated capacity.");
  const Q_l = Math.max(0, Q_tot - Q_s);
  const SHR = Q_s / Q_tot;

  // Return-air humidity ratio from T_db_ra / T_wb_ra at altitude P.
  const W_ra = _v9_humidityRatio({ T_db_F: T_ra, T_wb_F: T_wb_ra, P_kPa });
  // Latent removed in lb/lb = Q_l / (1060 Btu/lb water * CFM * rho_air_sea * 60 min/hr * rho_ratio).
  // Equivalent shorthand: Q_l = 4840 * CFM * dW * rho_ratio  =>  dW = Q_l / (4840 * CFM * rho_ratio).
  const dW_lb_lb = Q_l / (4840 * CFM * rho_ratio);
  const W_sa_lb_lb = Math.max(0, W_ra - dW_lb_lb);
  const W_ra_gpp = W_ra * 7000;
  const W_sa_gpp = W_sa_lb_lb * 7000;

  let band = "typical residential cooling (0.65 - 0.80)";
  if (SHR < 0.55) band = "very high latent (SHR < 0.55) - dehumidification-dominant";
  else if (SHR < 0.65) band = "high-latent climate or humid-day operation (0.55 - 0.65)";
  else if (SHR > 0.80) band = "low-latent / dry-climate operation (SHR > 0.80)";

  return {
    Q_sensible_btu_hr: Q_s,
    Q_latent_btu_hr: Q_l,
    SHR,
    W_ra_gpp,
    W_sa_gpp,
    rho_ratio,
    band,
    warnings,
  };
}

export const shrLatentExample = {
  // ASHRAE Fundamentals Ch. 18 worked-example pattern: residential
  // 36,000 Btu/hr cooling, 75 F / 63 F return air, 55 F supply, 1200
  // CFM, sea level. Q_s = 1.08 * 1200 * (75-55) * 1.0 = 25,920 Btu/hr.
  // Q_l = 36,000 - 25,920 = 10,080 Btu/hr. SHR = 0.72.
  inputs: { total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 63, supply_db_F: 55, cfm: 1200, altitude_ft: 0 },
};

function renderSHRLatent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per ASHRAE Fundamentals 2021 Chapter 1 (psychrometrics) and Chapter 18 (nonresidential cooling and heating load calculations). Sea-level coefficients (1.08 sensible, 4840 latent) per ASHRAE Handbook; altitude correction via the standard atmosphere density ratio. Field measurement is the verdict; the rated total capacity is one input among several. Free at ashrae.org for TOC; full handbook is licensed.";

  const qt = makeNumber("Total cooling capacity (Btu/hr; nameplate or measured)", "shr-qt", { step: "any", min: "0" });
  const tra = makeNumber("Return-air dry-bulb (F)", "shr-tra", { step: "any", value: "75" });
  tra.input.value = "75";
  const twb = makeNumber("Return-air wet-bulb (F)", "shr-twb", { step: "any", value: "63" });
  twb.input.value = "63";
  const tsa = makeNumber("Supply-air dry-bulb (F)", "shr-tsa", { step: "any", value: "55" });
  tsa.input.value = "55";
  const cfm = makeNumber("Register CFM", "shr-cfm", { step: "any", min: "0" });
  const alt = makeNumber("Altitude (ft; default 0)", "shr-alt", { step: "any", value: "0" });
  alt.input.value = "0";
  for (const f of [qt, tra, twb, tsa, cfm, alt]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    qt.input.value = "36000"; tra.input.value = "75"; twb.input.value = "63";
    tsa.input.value = "55"; cfm.input.value = "1200"; alt.input.value = "0"; update();
  });

  const oQs = makeOutputLine(outputRegion, "Sensible cooling (Btu/hr)", "shr-out-qs");
  const oQl = makeOutputLine(outputRegion, "Latent cooling (Btu/hr)", "shr-out-ql");
  const oSHR = makeOutputLine(outputRegion, "Sensible heat ratio (SHR)", "shr-out-shr");
  const oWra = makeOutputLine(outputRegion, "Return-air humidity ratio (grains/lb)", "shr-out-wra");
  const oWsa = makeOutputLine(outputRegion, "Supply-air humidity ratio (grains/lb)", "shr-out-wsa");
  const oRho = makeOutputLine(outputRegion, "Altitude density ratio (rho / rho_sea)", "shr-out-rho");
  const oB = makeOutputLine(outputRegion, "Band", "shr-out-b");
  const oW = makeOutputLine(outputRegion, "Notes", "shr-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeSHRLatent({
      total_capacity_btu_hr: readNum(qt.input),
      return_db_F: readNum(tra.input),
      return_wb_F: readNum(twb.input),
      supply_db_F: readNum(tsa.input),
      cfm: readNum(cfm.input),
      altitude_ft: readNum(alt.input),
    });
    if (r.error) {
      oQs.textContent = r.error;
      oQl.textContent = ""; oSHR.textContent = ""; oWra.textContent = ""; oWsa.textContent = "";
      oRho.textContent = ""; oB.textContent = ""; oW.textContent = "";
      return;
    }
    oQs.textContent = fmt(r.Q_sensible_btu_hr, 0) + " Btu/hr";
    oQl.textContent = fmt(r.Q_latent_btu_hr, 0) + " Btu/hr";
    oSHR.textContent = fmt(r.SHR, 3);
    oWra.textContent = fmt(r.W_ra_gpp, 1) + " gr/lb";
    oWsa.textContent = fmt(r.W_sa_gpp, 1) + " gr/lb";
    oRho.textContent = fmt(r.rho_ratio, 3);
    oB.textContent = r.band;
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [qt.input, tra.input, twb.input, tsa.input, cfm.input, alt.input]) el.addEventListener("input", update);
}

HVAC_RENDERERS["shr-latent"] = renderSHRLatent;

// ===========================================================================
// spec-v20 Phase C - three new HVAC tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 C.1: Air-side economizer free-cooling hours (`economizer-savings-hours`) ---
// Q_sens = 1.08 * CFM * dT; ton-hours = Q_sens * hours / 12,000.
// dims: in { cfm: L^3*T^-1, delta_t_f: T, hours: dimensionless } out: { q_sens_btuh: M*L^2*T^-3, ton_hours: dimensionless }
export function computeEconomizerSavingsHours({ cfm = 0, delta_t_f = 0, hours = 0 } = {}) {
  const CFM = Number(cfm) || 0;
  const dT = Number(delta_t_f) || 0;
  const hrs = Number(hours) || 0;
  if (!(CFM > 0 && Number.isFinite(CFM))) return { error: "Supply airflow must be positive (CFM)." };
  if (!Number.isFinite(dT)) return { error: "Mix-to-supply delta-T must be finite (F)." };
  if (!Number.isFinite(hrs) || hrs < 0) return { error: "Economizer-eligible hours must be non-negative." };
  if (hrs > 8760) return { error: "Hours cannot exceed 8760 (one year)." };
  if (dT <= 0) {
    return { q_sens_btuh: 0, ton_hours: 0, no_cooling: true, note: "Mix-to-supply delta-T is not positive - no free cooling available." };
  }
  const qSens = 1.08 * CFM * dT;
  const tonHours = qSens * hrs / 12000;
  return {
    q_sens_btuh: Number.isFinite(qSens) ? qSens : null,
    tons: Number.isFinite(qSens) ? qSens / 12000 : null,
    ton_hours: Number.isFinite(tonHours) ? tonHours : null,
    no_cooling: false,
    note: "Sensible free-cooling capacity at the mix-to-supply delta-T. The 1.08 factor is sea-level standard air (apply a density correction at altitude). ASHRAE 90.1 economizer changeover governs eligibility.",
  };
}
export const economizerSavingsHoursExample = { inputs: { cfm: 4000, delta_t_f: 20, hours: 1500 } };

function renderEconomizerSavingsHours(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE sensible-heat relation Q = 1.08 * CFM * dT (public); air-side economizer changeover per ASHRAE Standard 90.1, by name. Estimate; design conditions govern. The 1.08 factor is sea-level standard air. ASHRAE 90.1 free read-only at ashrae.org.";
  const cfm = makeNumber("Supply airflow (CFM)", "esh-cfm", { step: "any", min: "0", value: "4000" });
  cfm.input.value = "4000";
  const dt = makeNumber("Mix-to-supply delta-T (F)", "esh-dt", { step: "any", value: "20" });
  dt.input.value = "20";
  const hrs = makeNumber("Economizer-eligible hours", "esh-hrs", { step: "any", min: "0", max: "8760", value: "1500" });
  hrs.input.value = "1500";
  for (const f of [cfm, dt, hrs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "4000"; dt.input.value = "20"; hrs.input.value = "1500"; update(); });
  const oQ = makeOutputLine(outputRegion, "Sensible free-cooling capacity", "esh-out-q");
  const oTH = makeOutputLine(outputRegion, "Ton-hours offset (annual)", "esh-out-th");
  const oNote = makeOutputLine(outputRegion, "Note", "esh-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEconomizerSavingsHours({ cfm: readNum(cfm.input), delta_t_f: readNum(dt.input), hours: readNum(hrs.input) });
    if (r.error) { oQ.textContent = r.error; oTH.textContent = ""; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.q_sens_btuh, 0) + " BTU/hr (" + fmt(r.tons, 2) + " tons)";
    oTH.textContent = fmt(r.ton_hours, 0) + " ton-hours";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cfm.input, dt.input, hrs.input]) f.addEventListener("input", update);
}
HVAC_RENDERERS["economizer-savings-hours"] = renderEconomizerSavingsHours;

// --- v20 C.2: Insulated pipe heat loss, radial (`pipe-heat-loss-radial`) ---
// Q/L = 2*pi*k'*(T_hot - T_amb) / ln(r2/r1), k' = k_inF/12 in BTU/(hr.ft.F).
// dims: in { od_in: L, thickness_in: L, k_value: dimensionless, hot_f: T, amb_f: T, length_ft: L } out: { q_per_ft_btuh: M*L*T^-3, q_total_btuh: M*L^2*T^-3 }
export function computePipeHeatLossRadial({ od_in = 0, thickness_in = 0, k_value = 0, hot_f = 0, amb_f = 0, length_ft = 1 } = {}) {
  const od = Number(od_in) || 0;
  const th = Number(thickness_in) || 0;
  const k = Number(k_value) || 0;
  const hot = Number(hot_f), amb = Number(amb_f);
  const L = Number(length_ft) || 0;
  if (!(od > 0 && Number.isFinite(od))) return { error: "Pipe outer diameter must be positive (in)." };
  if (!(th > 0 && Number.isFinite(th))) return { error: "Insulation thickness must be positive (in); the flat-wall form understates a small pipe." };
  if (!(k > 0 && Number.isFinite(k))) return { error: "Insulation k-value must be positive (BTU-in/hr-ft2-F)." };
  if (!Number.isFinite(hot) || !Number.isFinite(amb)) return { error: "Temperatures must be finite (F)." };
  if (!(L > 0 && Number.isFinite(L))) return { error: "Pipe length must be positive (ft)." };
  if (amb >= hot) {
    return { q_per_ft_btuh: 0, q_total_btuh: 0, note: "Ambient is at or above the surface temperature - no outward heat loss." };
  }
  const r1 = od / 2; // inches
  const r2 = r1 + th;
  const kFt = k / 12; // BTU/(hr.ft.F)
  const qPerFt = 2 * Math.PI * kFt * (hot - amb) / Math.log(r2 / r1);
  const qTotal = qPerFt * L;
  return {
    q_per_ft_btuh: Number.isFinite(qPerFt) ? qPerFt : null,
    q_total_btuh: Number.isFinite(qTotal) ? qTotal : null,
    note: "Radial (cylindrical) conduction, log-mean form; distinct from the flat-wall insulation tiles. k rises with temperature - the value is at the mean insulation temperature.",
  };
}
export const pipeHeatLossRadialExample = { inputs: { od_in: 2, thickness_in: 1, k_value: 0.25, hot_f: 200, amb_f: 70, length_ft: 1 } };

function renderPipeHeatLossRadial(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fourier conduction through a cylindrical shell (public heat-transfer formula); insulation k-values per ASHRAE Fundamentals / ASTM C335, by name (user-supplied). Distinct from the flat-wall insulation tiles - this is the radial log-mean form. k is at the mean insulation temperature.";
  const od = makeNumber("Pipe outer diameter (in)", "phlr-od", { step: "any", min: "0", value: "2" });
  od.input.value = "2";
  const th = makeNumber("Insulation thickness (in)", "phlr-th", { step: "any", min: "0", value: "1" });
  th.input.value = "1";
  const k = makeNumber("Insulation k-value (BTU-in/hr-ft2-F)", "phlr-k", { step: "any", min: "0", value: "0.25" });
  k.input.value = "0.25";
  const hot = makeNumber("Fluid / surface temperature (F)", "phlr-hot", { step: "any", value: "200" });
  hot.input.value = "200";
  const amb = makeNumber("Ambient temperature (F)", "phlr-amb", { step: "any", value: "70" });
  amb.input.value = "70";
  const len = makeNumber("Pipe length (ft)", "phlr-len", { step: "any", min: "0", value: "1" });
  len.input.value = "1";
  for (const f of [od, th, k, hot, amb, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "2"; th.input.value = "1"; k.input.value = "0.25"; hot.input.value = "200"; amb.input.value = "70"; len.input.value = "1"; update(); });
  const oPF = makeOutputLine(outputRegion, "Heat loss per linear foot", "phlr-out-pf");
  const oT = makeOutputLine(outputRegion, "Total heat loss", "phlr-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "phlr-out-note");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computePipeHeatLossRadial({ od_in: readNum(od.input), thickness_in: readNum(th.input), k_value: readNum(k.input), hot_f: readNum(hot.input), amb_f: readNum(amb.input), length_ft: readNum(len.input) });
    if (r.error) { oPF.textContent = r.error; oT.textContent = ""; oNote.textContent = ""; return; }
    oPF.textContent = fmt(r.q_per_ft_btuh, 1) + " BTU/hr-ft";
    oT.textContent = fmt(r.q_total_btuh, 1) + " BTU/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [od.input, th.input, k.input, hot.input, amb.input, len.input]) f.addEventListener("input", update);
}
HVAC_RENDERERS["pipe-heat-loss-radial"] = renderPipeHeatLossRadial;

// --- v20 C.3: Fan brake horsepower (`fan-motor-bhp`) ---
// AHP = CFM * TSP / 6356; BHP = AHP / eta_fan; motor HP = BHP / eta_drive,
// rounded up to the next standard NEMA size.
const NEMA_HP_SIZES = [0.25, 0.33, 0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300];
// dims: in { cfm: L^3*T^-1, tsp_inwc: M*L^-1*T^-2, eta_fan: dimensionless, eta_drive: dimensionless } out: { ahp: dimensionless, bhp: dimensionless }
export function computeFanMotorBhp({ cfm = 0, tsp_inwc = 0, eta_fan = 0.65, eta_drive = 1 } = {}) {
  const CFM = Number(cfm) || 0;
  const TSP = Number(tsp_inwc) || 0;
  const ef = Number(eta_fan) || 0;
  const ed = Number(eta_drive) || 0;
  if (!(CFM > 0 && Number.isFinite(CFM))) return { error: "Airflow must be positive (CFM)." };
  if (!(TSP > 0 && Number.isFinite(TSP))) return { error: "Total static pressure must be positive (in. w.c.)." };
  if (!(ef > 0 && ef <= 1)) return { error: "Fan total efficiency must be in (0, 1]." };
  if (!(ed > 0 && ed <= 1)) return { error: "Drive/belt efficiency must be in (0, 1]." };
  const ahp = CFM * TSP / 6356;
  const bhp = ahp / ef;
  const motorHp = bhp / ed;
  let nextHp = NEMA_HP_SIZES.find((s) => s >= motorHp);
  if (nextHp === undefined) nextHp = NEMA_HP_SIZES[NEMA_HP_SIZES.length - 1];
  return {
    ahp: Number.isFinite(ahp) ? ahp : null,
    bhp: Number.isFinite(bhp) ? bhp : null,
    motor_hp_required: Number.isFinite(motorHp) ? motorHp : null,
    next_nema_hp: nextHp,
    note: "TSP must be the total (external + internal) static pressure, and efficiency at the duty point, not peak. Standard NEMA MG 1 motor sizes. Fan curve and motor data govern.",
  };
}
export const fanMotorBhpExample = { inputs: { cfm: 4000, tsp_inwc: 2.0, eta_fan: 0.65, eta_drive: 1 } };

function renderFanMotorBhp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AMCA / ASHRAE fan-power relation BHP = (CFM * SP) / (6356 * eta) (public); standard motor HP sizes per NEMA MG 1, by name. Estimate; fan curve and motor data govern. TSP must be total (external + internal). Free principles in published HVAC texts.";
  const cfm = makeNumber("Airflow (CFM)", "fmb-cfm", { step: "any", min: "0", value: "4000" });
  cfm.input.value = "4000";
  const tsp = makeNumber("Total static pressure (in. w.c.)", "fmb-tsp", { step: "any", min: "0", value: "2.0" });
  tsp.input.value = "2.0";
  const ef = makeNumber("Fan total efficiency (0-1)", "fmb-ef", { step: "any", min: "0", max: "1", value: "0.65" });
  ef.input.value = "0.65";
  const ed = makeNumber("Drive/belt efficiency (0-1)", "fmb-ed", { step: "any", min: "0", max: "1", value: "1" });
  ed.input.value = "1";
  for (const f of [cfm, tsp, ef, ed]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "4000"; tsp.input.value = "2.0"; ef.input.value = "0.65"; ed.input.value = "1"; update(); });
  const oA = makeOutputLine(outputRegion, "Air horsepower", "fmb-out-a");
  const oB = makeOutputLine(outputRegion, "Brake horsepower (BHP)", "fmb-out-b");
  const oN = makeOutputLine(outputRegion, "Next standard motor HP", "fmb-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeFanMotorBhp({ cfm: readNum(cfm.input), tsp_inwc: readNum(tsp.input), eta_fan: readNum(ef.input), eta_drive: readNum(ed.input) });
    if (r.error) { oA.textContent = r.error; oB.textContent = ""; oN.textContent = ""; return; }
    oA.textContent = fmt(r.ahp, 3) + " HP";
    oB.textContent = fmt(r.bhp, 3) + " BHP";
    oN.textContent = r.next_nema_hp + " HP (NEMA MG 1)";
  }, DEBOUNCE_MS);
  for (const f of [cfm.input, tsp.input, ef.input, ed.input]) f.addEventListener("input", update);
}
HVAC_RENDERERS["fan-motor-bhp"] = renderFanMotorBhp;

// =====================================================================
// spec-v27 Part II - Group C: round-to-rectangular duct equivalent
// ASHRAE equal-friction circular equivalent D_e = 1.30*(a*b)^0.625/(a+b)^0.250.
// =====================================================================
import {
  makeNumber as _v27hMakeNumber, makeSelect as _v27hMakeSelect,
  makeOutputLine as _v27hMakeOut, attachExampleButton as _v27hAttachEx,
  debounce as _v27hDebounce, DEBOUNCE_MS as _V27H_DEB, fmt as _v27hFmt,
} from "./ui-fields.js";

function _v27Deq(a, b) { return 1.30 * Math.pow(a * b, 0.625) / Math.pow(a + b, 0.250); }

// dims: in { round_diameter_in: L, side_a_in: L, side_b_in: L, known_side_in: L } out: { equivalent_diameter_in: L, other_side_in: L, aspect_ratio: dimensionless }
export function computeRoundToRectDuct({ mode = "rect-to-round", round_diameter_in = 0, side_a_in = 0, side_b_in = 0, known_side_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;

  if (mode === "rect-to-round") {
    const a = Number(side_a_in), b = Number(side_b_in);
    if (!(a > 0) || !(b > 0)) return { error: "Both rectangular sides must be positive (in)." };
    const De = _v27Deq(a, b);
    const aspect = Math.max(a, b) / Math.min(a, b);
    const notes = ["Equal-friction equivalence (not equal-velocity). The fabrication drawing governs."];
    if (aspect > 4) notes.push("Aspect ratio " + _v27hFmt(aspect, 2) + ":1 exceeds the 4:1 sheet-metal practical limit.");
    return { mode, equivalent_diameter_in: De, side_a_in: a, side_b_in: b, aspect_ratio: aspect, notes };
  }

  // round-to-rect: solve the other side for the target equivalent diameter at a chosen known side.
  const D = Number(round_diameter_in);
  const known = Number(known_side_in);
  if (!(D > 0)) return { error: "Round diameter must be positive (in)." };
  if (!(known > 0)) return { error: "Chosen (known) side must be positive (in)." };
  // Bisection solve for the unknown side w such that D_eq(known, w) = D.
  let lo = 0.01, hi = 1000;
  if (_v27Deq(known, hi) < D) return { error: "No rectangular width reaches that equivalent diameter at the chosen side; pick a smaller side." };
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (_v27Deq(known, mid) < D) lo = mid; else hi = mid;
  }
  const w = (lo + hi) / 2;
  if (!(w > 0)) return { error: "Chosen side makes the other side non-positive." };
  const aspect = Math.max(known, w) / Math.min(known, w);
  const notes = ["Equal-friction equivalence (not equal-velocity). The fabrication drawing governs."];
  if (aspect > 4) notes.push("Aspect ratio " + _v27hFmt(aspect, 2) + ":1 exceeds the 4:1 sheet-metal practical limit.");
  return { mode, round_diameter_in: D, known_side_in: known, other_side_in: w, equivalent_diameter_in: _v27Deq(known, w), aspect_ratio: aspect, notes };
}

export const roundToRectDuctExample = { inputs: { mode: "rect-to-round", side_a_in: 14, side_b_in: 8 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v27renderRoundToRectDuct(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The ASHRAE equal-friction circular equivalent of a rectangular duct, D_e = 1.30*(a*b)^0.625/(a+b)^0.250, per ASHRAE Fundamentals (duct design) and SMACNA, by name; first-principles. An equal-friction equivalence, not an equal-velocity one. The fabrication drawing governs.";
  const mode = _v27hMakeSelect("Mode", "r2r-mode", [
    { value: "rect-to-round", label: "Rectangular to round", selected: true },
    { value: "round-to-rect", label: "Round to rectangular" },
  ]);
  const a = _v27hMakeNumber("Rect side a (in)", "r2r-a", { step: "any", min: "0" });
  const b = _v27hMakeNumber("Rect side b (in)", "r2r-b", { step: "any", min: "0" });
  const d = _v27hMakeNumber("Round diameter (in)", "r2r-d", { step: "any", min: "0" });
  const known = _v27hMakeNumber("Chosen side (in, round-to-rect)", "r2r-known", { step: "any", min: "0" });
  for (const f of [mode, a, b, d, known]) inputRegion.appendChild(f.wrap);
  _v27hAttachEx(inputRegion, () => { mode.select.value = "rect-to-round"; a.input.value = "14"; b.input.value = "8"; d.input.value = ""; known.input.value = ""; update(); });

  const oDe = _v27hMakeOut(outputRegion, "Equivalent diameter / other side", "r2r-out-de");
  const oAspect = _v27hMakeOut(outputRegion, "Aspect ratio", "r2r-out-aspect");
  const oNote = _v27hMakeOut(outputRegion, "Notes", "r2r-out-note");

  const update = _v27hDebounce(() => {
    const r = computeRoundToRectDuct({
      mode: mode.select.value,
      round_diameter_in: Number(d.input.value) || 0,
      side_a_in: Number(a.input.value) || 0,
      side_b_in: Number(b.input.value) || 0,
      known_side_in: Number(known.input.value) || 0,
    });
    if (r.error) { oDe.textContent = r.error; oAspect.textContent = "-"; oNote.textContent = ""; return; }
    if (r.mode === "rect-to-round") oDe.textContent = "D_e " + _v27hFmt(r.equivalent_diameter_in, 2) + " in";
    else oDe.textContent = "other side " + _v27hFmt(r.other_side_in, 2) + " in (D_e " + _v27hFmt(r.equivalent_diameter_in, 2) + " in)";
    oAspect.textContent = _v27hFmt(r.aspect_ratio, 2) + ":1";
    oNote.textContent = r.notes.join(" ");
  }, _V27H_DEB);
  for (const f of [a.input, b.input, d.input, known.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
HVAC_RENDERERS["round-to-rect-duct"] = _v27renderRoundToRectDuct;

// =====================================================================
// spec-v99 C - building-envelope insulation: assembly-r-value,
// blown-insulation-coverage. The opaque-envelope numbers the pipe-radial
// insulation tiles (insulation-thickness, insulation-heat-loss) do not
// touch. GOVERNANCE.general (building science). ASHRAE Fundamentals
// parallel-path (isothermal-planes) method; softwood framing ~1.25
// R/inch; DOE framing factors; manufacturer blown-insulation charts.
// =====================================================================

const _finiteGuardEnv = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) return { error: "All numeric inputs must be finite numbers." };
    }
  }
  return null;
};
function _rEnv(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) { for (const f of spec.fields) { if (v[f.key] === undefined) continue; fields[f.key].input.value = v[f.key]; } update(); }
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

// dims: in { cavity_r: dimensionless, continuous_r: dimensionless, stud_depth_in: L, framing_factor: dimensionless, air_films_r: dimensionless, finish_layers_r: dimensionless } out: { r_assembly: dimensionless, r_center: dimensionless }
// (R-value carries hr-sq-ft-degF/Btu; treated dimensionless per spec-v14 for the U=1/R reciprocal and area-weighting core.)
export function computeAssemblyRValue({ cavity_r = 0, continuous_r = 0, stud_depth_in = 0, framing_factor = 0.25, air_films_r = 0.85, finish_layers_r = 1.05 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (cavity_r < 0 || continuous_r < 0 || air_films_r < 0 || finish_layers_r < 0) return { error: "R-values must be non-negative." };
  if (!(stud_depth_in > 0)) return { error: "Stud depth must be positive." };
  if (!(framing_factor >= 0 && framing_factor < 1)) return { error: "Framing factor must be at least 0 and less than 1." };
  const common_r = air_films_r + finish_layers_r + continuous_r;
  const r_framing_path = common_r + stud_depth_in * 1.25;
  const r_cavity_path = common_r + cavity_r;
  const u_framing = 1 / r_framing_path;
  const u_cavity = 1 / r_cavity_path;
  const u_assembly = framing_factor * u_framing + (1 - framing_factor) * u_cavity;
  const r_assembly = 1 / u_assembly;
  const r_center = r_cavity_path;
  return {
    r_framing_path, r_cavity_path, u_assembly, r_assembly, r_center,
    bridging_pct: (1 - r_assembly / r_center) * 100,
    note: "A framed wall has two heat paths - through the studs (about R-1.25 per inch of softwood, so a 2x4 stud is only about R-4.4) and through the insulated cavity - so the wall performs below its center-of-cavity R. Average the U-values weighted by the framing fraction (about a quarter of a 16 in on-center wall is framing), never the R-values, which overstates the wall. Continuous insulation outside the studs counts on both paths, so it buys more than its nominal R. Air films and finishes are editable ASHRAE-table defaults.",
  };
}
const assemblyRValueExample = { inputs: { cavity_r: 13, continuous_r: 0, stud_depth_in: 3.5, framing_factor: 0.25, air_films_r: 0.85, finish_layers_r: 1.05 } };
HVAC_RENDERERS["assembly-r-value"] = _rEnv({
  citation: "Citation: ASHRAE Handbook of Fundamentals parallel-path (isothermal-planes) method (by name). U_assembly = ff x U_framing + (1-ff) x U_cavity; R = 1/U. Framing ~1.25 R/inch.",
  example: assemblyRValueExample.inputs,
  fields: [
    { key: "cavity_r", label: "Cavity insulation R", kind: "number" },
    { key: "continuous_r", label: "Continuous insulation R", kind: "number", default: 0 },
    { key: "stud_depth_in", label: "Stud depth (in)", kind: "number" },
    { key: "framing_factor", label: "Framing factor (0-1)", kind: "number", default: 0.25 },
    { key: "air_films_r", label: "Air films R", kind: "number", default: 0.85 },
    { key: "finish_layers_r", label: "Finish layers R", kind: "number", default: 1.05 },
  ],
  outputs: [
    { key: "f", id: "arv-out-f", label: "Framing path R", value: (r) => fmt(r.r_framing_path, 2) },
    { key: "c", id: "arv-out-c", label: "Cavity path R", value: (r) => fmt(r.r_cavity_path, 2) },
    { key: "a", id: "arv-out-a", label: "Whole-assembly", value: (r) => "U " + fmt(r.u_assembly, 4) + " / R " + fmt(r.r_assembly, 1) },
    { key: "b", id: "arv-out-b", label: "vs center-of-cavity", value: (r) => "R " + fmt(r.r_center, 1) + " (bridging costs " + fmt(r.bridging_pct, 0) + "%)" },
    { key: "n", id: "arv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAssemblyRValue,
});

// dims: in { area_sqft: L^2, bags_per_1000: dimensionless, r_per_inch: dimensionless, target_r: dimensionless } out: { bags: dimensionless, coverage_per_bag: L^2, min_thickness_in: L }
export function computeBlownInsulationCoverage({ area_sqft = 0, bags_per_1000 = 0, r_per_inch = 3.5, target_r = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(area_sqft > 0)) return { error: "Attic area must be positive." };
  if (!(bags_per_1000 > 0)) return { error: "Bags per 1,000 sq ft must be positive." };
  if (!(r_per_inch > 0)) return { error: "R per inch must be positive." };
  if (!(target_r > 0)) return { error: "Target R must be positive." };
  return {
    bags: Math.ceil(area_sqft / 1000 * bags_per_1000),
    coverage_per_bag: 1000 / bags_per_1000,
    min_thickness_in: target_r / r_per_inch,
    note: "Blown-insulation coverage is brand-specific, so read the bag's own bags per 1,000 sq ft at this R-value and its minimum settled thickness - both must be met, because a machine can hit the thickness while blowing too few bags (under-dense, and it will settle short). Cellulose runs about R-3.5 per inch and blown fiberglass about R-2.5, so a target R sets the depth. Settling is already in the chart's settled-thickness column. Mark the joists to the target depth so the crew blows it even.",
  };
}
const blownInsulationCoverageExample = { inputs: { area_sqft: 1200, bags_per_1000: 36, r_per_inch: 3.5, target_r: 38 } };
HVAC_RENDERERS["blown-insulation-coverage"] = _rEnv({
  citation: "Citation: Manufacturer blown-insulation coverage charts (bags per 1,000 sq ft and minimum settled thickness at the target R, by name). Cellulose ~R-3.5/in, blown FG ~R-2.5/in.",
  example: blownInsulationCoverageExample.inputs,
  fields: [
    { key: "area_sqft", label: "Attic area (sq ft)", kind: "number" },
    { key: "bags_per_1000", label: "Bags per 1,000 sq ft", kind: "number" },
    { key: "r_per_inch", label: "R per inch", kind: "number", default: 3.5 },
    { key: "target_r", label: "Target R-value", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "bic-out-b", label: "Bags", value: (r) => String(r.bags) },
    { key: "c", id: "bic-out-c", label: "Coverage per bag", value: (r) => fmt(r.coverage_per_bag, 1) + " sq ft" },
    { key: "t", id: "bic-out-t", label: "Min settled thickness", value: (r) => fmt(r.min_thickness_in, 1) + " in" },
    { key: "n", id: "bic-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlownInsulationCoverage,
});

// =====================================================================
// spec-v233..v235: heat-pump heating-mode batch (Group C). Seasonal
// operating cost vs gas and resistance, the economic dual-fuel switchover,
// and the cold-temperature capacity / auxiliary-heat check. Currency and
// rate figures are carried as dimensionless per the v14 economic-tile
// convention. Named unit constants: 1 MMBtu = 293.07 kWh; 3,412 Btu per
// kWh (resistance, COP 1); 100,000 Btu per therm (10 therms per MMBtu).
// =====================================================================
const _MMBTU_TO_KWH = 293.07;
const _BTU_PER_KWH = 3412;
const _THERMS_PER_MMBTU = 10;

// dims: in { seasonal_load_mmbtu: M L^2 T^-2, hspf: dimensionless, rate_kwh: dimensionless, afue: dimensionless, rate_therm: dimensionless } out: { hp_kwh: M L^2 T^-2, hp_cost: dimensionless, resistance_kwh: M L^2 T^-2, resistance_cost: dimensionless, gas_therms: M L^2 T^-2, gas_cost: dimensionless }
export function computeHeatPumpSeasonalEnergy({ seasonal_load_mmbtu = 0, hspf = 0, rate_kwh = 0, afue = 0.95, rate_therm = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(seasonal_load_mmbtu > 0)) return { error: "Seasonal heating load must be positive (MMBtu)." };
  if (!(hspf > 0)) return { error: "HSPF must be positive." };
  if (!(afue > 0 && afue <= 1)) return { error: "AFUE must be over 0 and up to 1." };
  if (rate_kwh < 0 || rate_therm < 0) return { error: "Rates must be non-negative." };
  const hp_kwh = seasonal_load_mmbtu * 1000 / hspf; // HSPF is Btu/Wh = kBtu/kWh, 1 MMBtu = 1000 kBtu
  const hp_cost = hp_kwh * rate_kwh;
  const resistance_kwh = seasonal_load_mmbtu * 1e6 / _BTU_PER_KWH;
  const resistance_cost = resistance_kwh * rate_kwh;
  const gas_therms = rate_therm > 0 ? seasonal_load_mmbtu * _THERMS_PER_MMBTU / afue : null;
  const gas_cost = rate_therm > 0 ? gas_therms * rate_therm : null;
  return {
    hp_kwh, hp_cost, resistance_kwh, resistance_cost, gas_therms, gas_cost,
    note: "AHRI 210/240 HSPF (season Btu delivered per Wh input) and the standard fuel-cost comparison (gas therms = load / AFUE, resistance at COP 1). The HSPF is the rated regional value (Region IV; a colder region delivers less, and the field seasonal COP depends on the actual climate and controls). The seasonal heating load comes from a Manual J plus degree-days or metered history, and the gas comparison uses the delivered efficiency AFUE, not the steady-state efficiency. An operating-cost estimate, not a metered bill.",
  };
}
const heatPumpSeasonalEnergyExample = { inputs: { seasonal_load_mmbtu: 60, hspf: 9, rate_kwh: 0.15, afue: 0.95, rate_therm: 1.50 } };
HVAC_RENDERERS["heat-pump-seasonal-energy"] = _rEnv({
  citation: "Citation: AHRI 210/240 HSPF (season Btu delivered per Wh) and the standard fuel-cost comparison gas therms = load / AFUE, resistance at COP 1 (by name). HSPF is the rated regional value; the gas side uses the delivered AFUE. An operating-cost estimate, not a metered bill.",
  example: heatPumpSeasonalEnergyExample.inputs,
  fields: [
    { key: "seasonal_load_mmbtu", label: "Seasonal heating load (MMBtu)", kind: "number" },
    { key: "hspf", label: "Heat-pump HSPF", kind: "number" },
    { key: "rate_kwh", label: "Electric rate ($/kWh)", kind: "number" },
    { key: "afue", label: "Furnace AFUE (0-1)", kind: "number", default: 0.95 },
    { key: "rate_therm", label: "Gas rate ($/therm, 0 = skip gas)", kind: "number" },
  ],
  outputs: [
    { key: "hp", id: "hpse-out-hp", label: "Heat pump", value: (r) => fmt(r.hp_kwh, 0) + " kWh = $" + fmt(r.hp_cost, 0) + "/season" },
    { key: "res", id: "hpse-out-res", label: "Resistance heat", value: (r) => fmt(r.resistance_kwh, 0) + " kWh = $" + fmt(r.resistance_cost, 0) + "/season" },
    { key: "gas", id: "hpse-out-gas", label: "Gas furnace", value: (r) => r.gas_cost === null ? "(enter gas rate)" : fmt(r.gas_therms, 0) + " therms = $" + fmt(r.gas_cost, 0) + "/season" },
    { key: "n", id: "hpse-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHeatPumpSeasonalEnergy,
});

// dims: in { rate_kwh: dimensionless, rate_therm: dimensionless, afue: dimensionless, cop_now: dimensionless } out: { gas_per_mmbtu: dimensionless, hp_per_mmbtu: dimensionless, cop_switch: dimensionless }
export function computeDualFuelBalancePoint({ rate_kwh = 0, rate_therm = 0, afue = 0.95, cop_now = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(rate_kwh > 0)) return { error: "Electric rate must be positive ($/kWh)." };
  if (!(rate_therm > 0)) return { error: "Gas rate must be positive ($/therm)." };
  if (!(afue > 0 && afue <= 1)) return { error: "AFUE must be over 0 and up to 1." };
  if (!(cop_now > 0)) return { error: "Heat-pump COP must be positive." };
  const gas_per_mmbtu = _THERMS_PER_MMBTU / afue * rate_therm;
  const hp_per_mmbtu = _MMBTU_TO_KWH / cop_now * rate_kwh;
  const cop_switch = _MMBTU_TO_KWH * rate_kwh / gas_per_mmbtu;
  const run_hp = hp_per_mmbtu <= gas_per_mmbtu;
  const verdict = run_hp
    ? "Run the heat pump - it is the cheaper source at this COP"
    : "Switch to gas - below the economic switchover COP the furnace is cheaper";
  return {
    gas_per_mmbtu, hp_per_mmbtu, cop_switch, run_hp, verdict,
    note: "Delivered-Btu fuel-cost comparison: heat-pump $/MMBtu = 293.07 / COP x rate_kwh, gas $/MMBtu = 10 / AFUE x rate_therm, switchover COP where the two are equal. The switchover COP maps to an outdoor temperature only through the specific unit's COP-vs-temperature curve (from AHRI ratings or the heat-pump-cold-capacity tile). The comparison is on operating cost only (it ignores equipment wear, defrost, and comfort), and the gas side uses the delivered AFUE. An economic setpoint aid, not a controls-commissioning procedure.",
  };
}
const dualFuelBalancePointExample = { inputs: { rate_kwh: 0.15, rate_therm: 1.50, afue: 0.95, cop_now: 2.5 } };
HVAC_RENDERERS["dual-fuel-balance-point"] = _rEnv({
  citation: "Citation: delivered-Btu fuel-cost comparison heat-pump $/MMBtu = 293.07 / COP x rate_kwh, gas $/MMBtu = 10 / AFUE x rate_therm, switchover COP where equal (by name). The switchover COP maps to a temperature only through the unit's COP curve. An economic setpoint aid, not a controls procedure.",
  example: dualFuelBalancePointExample.inputs,
  fields: [
    { key: "rate_kwh", label: "Electric rate ($/kWh)", kind: "number" },
    { key: "rate_therm", label: "Gas rate ($/therm)", kind: "number" },
    { key: "afue", label: "Furnace AFUE (0-1)", kind: "number", default: 0.95 },
    { key: "cop_now", label: "Heat-pump COP at current temp", kind: "number" },
  ],
  outputs: [
    { key: "gas", id: "dfbp-out-gas", label: "Gas delivered cost", value: (r) => "$" + fmt(r.gas_per_mmbtu, 2) + "/MMBtu" },
    { key: "hp", id: "dfbp-out-hp", label: "Heat-pump delivered cost", value: (r) => "$" + fmt(r.hp_per_mmbtu, 2) + "/MMBtu" },
    { key: "cop", id: "dfbp-out-cop", label: "Economic switchover COP", value: (r) => fmt(r.cop_switch, 2) },
    { key: "v", id: "dfbp-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "dfbp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDualFuelBalancePoint,
});

// dims: in { cap_47_btuh: M L^2 T^-3, cap_17_btuh: M L^2 T^-3, design_temp_f: T, design_load_btuh: M L^2 T^-3 } out: { slope: M L^2 T^-3, cap_design: M L^2 T^-3, shortfall: M L^2 T^-3, aux_kw: M L^2 T^-3 }
export function computeHeatPumpColdCapacity({ cap_47_btuh = 0, cap_17_btuh = 0, design_temp_f = 0, design_load_btuh = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(cap_47_btuh > 0) || !(cap_17_btuh > 0)) return { error: "Rated capacities must be positive (Btu/h)." };
  if (!(design_load_btuh > 0)) return { error: "Design heating load must be positive (Btu/h)." };
  const slope = (cap_47_btuh - cap_17_btuh) / (47 - 17); // 47 and 17 are the fixed AHRI rating points
  const cap_design = Math.max(0, cap_17_btuh + slope * (design_temp_f - 17));
  const clamped = cap_17_btuh + slope * (design_temp_f - 17) < 0;
  const shortfall = Math.max(0, design_load_btuh - cap_design);
  const aux_kw = shortfall / _BTU_PER_KWH;
  const covers = shortfall === 0;
  return {
    slope, cap_design, shortfall, aux_kw, covers, clamped,
    note: "AHRI 210/240 low-temperature rating points (the 47 F and 17 F integrated heating capacities) with a linear capacity-versus-temperature interpolation. The two rated points come from the manufacturer's expanded performance data - a cold-climate / variable-capacity unit holds capacity far better than a linear extrapolation of a single-speed unit suggests, so prefer a published low-temperature data point over extrapolation when a conversion hinges on it. The design load and design temperature come from a Manual J; defrost and cycling trim the field capacity. A sizing check, not a performance guarantee.",
  };
}
const heatPumpColdCapacityExample = { inputs: { cap_47_btuh: 36000, cap_17_btuh: 22000, design_temp_f: 5, design_load_btuh: 30000 } };
HVAC_RENDERERS["heat-pump-cold-capacity"] = _rEnv({
  citation: "Citation: AHRI 210/240 low-temperature rating points (47 F and 17 F integrated heating capacities) and a linear capacity-versus-temperature interpolation (by name). Prefer a published low-temperature data point over extrapolation. A sizing check, not a performance guarantee.",
  example: heatPumpColdCapacityExample.inputs,
  fields: [
    { key: "cap_47_btuh", label: "Rated capacity at 47 F (Btu/h)", kind: "number" },
    { key: "cap_17_btuh", label: "Rated capacity at 17 F (Btu/h)", kind: "number" },
    { key: "design_temp_f", label: "Outdoor design temp (F)", kind: "number" },
    { key: "design_load_btuh", label: "Design heating load (Btu/h)", kind: "number" },
  ],
  outputs: [
    { key: "cap", id: "hpcc-out-cap", label: "Delivered capacity at design", value: (r) => fmt(r.cap_design, 0) + " Btu/h" + (r.clamped ? " (clamped to 0)" : "") },
    { key: "short", id: "hpcc-out-short", label: "Shortfall vs design load", value: (r) => fmt(r.shortfall, 0) + " Btu/h" },
    { key: "aux", id: "hpcc-out-aux", label: "Auxiliary heat needed", value: (r) => r.covers ? "None (heat pump covers the load)" : fmt(r.aux_kw, 2) + " kW" },
    { key: "n", id: "hpcc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHeatPumpColdCapacity,
});

// =====================================================================
// spec-v239..v241: compressed-air energy batch (Group C). The three levers
// of a plant's most expensive utility: the cost of its leaks (DOE load/unload
// test), the isentropic power to make the air, and the savings from dropping
// the discharge pressure. Named constants: k = 1.4 (air); 0.004364 =
// 144/33,000 unit constant; 0.746 kW/hp.
// =====================================================================
const _K_AIR = 1.4;
const _HP_UNIT_CONST = 0.004364; // 144 in^2/ft^2 over 33,000 ft-lb/min/hp
const _KW_PER_HP = 0.746;

// dims: in { compressor_cfm: L^3 T^-1, load_min: T, unload_min: T, specific_power: M L^2 T^-3, run_hours: T, rate_kwh: dimensionless } out: { leak_fraction: dimensionless, leak_cfm: L^3 T^-1, leak_kw: M L^2 T^-3, annual_kwh: M L^2 T^-2, annual_cost: dimensionless }
export function computeAirLeakCost({ compressor_cfm = 0, load_min = 0, unload_min = 0, specific_power = 22, run_hours = 8760, rate_kwh = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(compressor_cfm > 0)) return { error: "Compressor capacity must be positive (cfm)." };
  if (!(specific_power > 0)) return { error: "Specific power must be positive (kW/100cfm)." };
  if (!(run_hours > 0)) return { error: "Run hours must be positive." };
  if (load_min < 0 || unload_min < 0) return { error: "Loaded and unloaded times must be non-negative." };
  if (!(load_min + unload_min > 0)) return { error: "Total cycle time must be positive." };
  if (rate_kwh < 0) return { error: "Energy rate must be non-negative." };
  const leak_fraction = load_min / (load_min + unload_min);
  const leak_cfm = compressor_cfm * leak_fraction;
  const leak_kw = leak_cfm * specific_power / 100;
  const annual_kwh = leak_kw * run_hours;
  const annual_cost = annual_kwh * rate_kwh;
  return {
    leak_fraction, leak_cfm, leak_kw, annual_kwh, annual_cost,
    note: "US DOE Compressed Air Challenge load/unload leak test: leak fraction = t_load / (t_load + t_unload), leak flow = fraction x compressor cfm, with the compressed-air specific-power convention (18-22 kW per 100 cfm at 100 psig for a rotary-screw system). The test is run with all production draw off so the only demand is the leaks; the loaded capacity is the compressor's actual delivered cfm at the operating pressure (not the nameplate); the specific power is the whole system's wire-to-air figure at its pressure; the run hours are the hours the compressor is energized. An estimate from a stopwatch test, not a metered audit.",
  };
}
const airLeakCostExample = { inputs: { compressor_cfm: 500, load_min: 3, unload_min: 12, specific_power: 22, run_hours: 8760, rate_kwh: 0.10 } };
HVAC_RENDERERS["air-leak-cost"] = _rEnv({
  citation: "Citation: US DOE Compressed Air Challenge load/unload leak test (leak fraction = t_load / (t_load + t_unload), leak flow = fraction x cfm) and the 18-22 kW per 100 cfm specific-power convention (by name). Run with production off. An estimate from a stopwatch test, not a metered audit.",
  example: airLeakCostExample.inputs,
  fields: [
    { key: "compressor_cfm", label: "Compressor delivered capacity (cfm)", kind: "number" },
    { key: "load_min", label: "Loaded time over test cycles (min)", kind: "number" },
    { key: "unload_min", label: "Unloaded time over test cycles (min)", kind: "number" },
    { key: "specific_power", label: "Specific power (kW/100cfm)", kind: "number", default: 22 },
    { key: "run_hours", label: "Run hours/yr (energized)", kind: "number", default: 8760 },
    { key: "rate_kwh", label: "Energy rate ($/kWh)", kind: "number" },
  ],
  outputs: [
    { key: "frac", id: "alc-out-frac", label: "Leak fraction", value: (r) => fmt(r.leak_fraction * 100, 1) + "%" },
    { key: "cfm", id: "alc-out-cfm", label: "Leak flow", value: (r) => fmt(r.leak_cfm, 1) + " cfm = " + fmt(r.leak_kw, 1) + " kW" },
    { key: "kwh", id: "alc-out-kwh", label: "Annual leak energy", value: (r) => fmt(r.annual_kwh, 0) + " kWh/yr" },
    { key: "cost", id: "alc-out-cost", label: "Annual leak cost", value: (r) => "$" + fmt(r.annual_cost, 0) + "/yr" },
    { key: "n", id: "alc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirLeakCost,
});

// dims: in { free_air_cfm: L^3 T^-1, inlet_psia: M L^-1 T^-2, discharge_psig: M L^-1 T^-2, overall_eff: dimensionless, run_hours: T, rate_kwh: dimensionless } out: { theo_hp: M L^2 T^-3, input_kw: M L^2 T^-3, annual_kwh: M L^2 T^-2, annual_cost: dimensionless }
export function computeCompressedAirPower({ free_air_cfm = 0, inlet_psia = 14.7, discharge_psig = 0, overall_eff = 0.75, run_hours = 4000, rate_kwh = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(free_air_cfm > 0)) return { error: "Free-air flow must be positive (cfm)." };
  if (!(inlet_psia > 0)) return { error: "Inlet pressure must be positive (psia)." };
  if (!(run_hours > 0)) return { error: "Run hours must be positive." };
  const p2_abs = discharge_psig + 14.7;
  if (!(p2_abs > inlet_psia)) return { error: "Discharge pressure must be above the inlet." };
  if (!(overall_eff > 0 && overall_eff <= 1)) return { error: "Overall efficiency must be over 0 and up to 1." };
  if (rate_kwh < 0) return { error: "Energy rate must be non-negative." };
  const theo_hp = _HP_UNIT_CONST * inlet_psia * free_air_cfm * (_K_AIR / (_K_AIR - 1)) * ((p2_abs / inlet_psia) ** ((_K_AIR - 1) / _K_AIR) - 1);
  const input_kw = theo_hp * _KW_PER_HP / overall_eff;
  const annual_kwh = input_kw * run_hours;
  const annual_cost = annual_kwh * rate_kwh;
  return {
    p2_abs, theo_hp, input_kw, annual_kwh, annual_cost,
    note: "Single-stage adiabatic (isentropic) compression power: hp = 0.004364 x P1 x Q x (k/(k-1)) x [(P2/P1)^((k-1)/k) - 1], with P in psia, Q in cfm free air, k = 1.4. This is the ideal single-stage isentropic work - a real compressor needs more, so the overall efficiency divides the ideal down to the wire, and multi-staging with intercooling beats single stage above roughly 100 psig. The free-air flow is referenced to intake conditions and the discharge is the absolute pressure at the compressor. A sizing and cost estimate, not a compressor selection.",
  };
}
const compressedAirPowerExample = { inputs: { free_air_cfm: 100, inlet_psia: 14.7, discharge_psig: 100, overall_eff: 0.75, run_hours: 4000, rate_kwh: 0.10 } };
HVAC_RENDERERS["compressed-air-power"] = _rEnv({
  citation: "Citation: single-stage adiabatic (isentropic) compression power hp = 0.004364 x P1 x Q x (k/(k-1)) x [(P2/P1)^((k-1)/k) - 1], P in psia, Q in cfm free air, k = 1.4 (by name). Ideal work divided by the overall efficiency; multi-stage beats single stage above ~100 psig. A sizing and cost estimate, not a compressor selection.",
  example: compressedAirPowerExample.inputs,
  fields: [
    { key: "free_air_cfm", label: "Free-air flow at intake (cfm)", kind: "number" },
    { key: "inlet_psia", label: "Inlet pressure (psia)", kind: "number", default: 14.7 },
    { key: "discharge_psig", label: "Discharge pressure (psig)", kind: "number" },
    { key: "overall_eff", label: "Overall wire-to-air efficiency (0-1)", kind: "number", default: 0.75 },
    { key: "run_hours", label: "Run hours/yr", kind: "number", default: 4000 },
    { key: "rate_kwh", label: "Energy rate ($/kWh)", kind: "number" },
  ],
  outputs: [
    { key: "hp", id: "cap-out-hp", label: "Theoretical power", value: (r) => fmt(r.theo_hp, 1) + " hp" },
    { key: "kw", id: "cap-out-kw", label: "Input power (wire)", value: (r) => fmt(r.input_kw, 1) + " kW" },
    { key: "kwh", id: "cap-out-kwh", label: "Annual energy", value: (r) => fmt(r.annual_kwh, 0) + " kWh/yr" },
    { key: "cost", id: "cap-out-cost", label: "Annual cost", value: (r) => "$" + fmt(r.annual_cost, 0) + "/yr" },
    { key: "n", id: "cap-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCompressedAirPower,
});

// dims: in { current_psig: M L^-1 T^-2, reduced_psig: M L^-1 T^-2, inlet_psia: M L^-1 T^-2, input_kw: M L^2 T^-3, run_hours: T, rate_kwh: dimensionless } out: { pct_saved: dimensionless, kw_saved: M L^2 T^-3, annual_kwh: M L^2 T^-2, annual_savings: dimensionless }
export function computeAirPressureSetpointSavings({ current_psig = 0, reduced_psig = 0, inlet_psia = 14.7, input_kw = 0, run_hours = 6000, rate_kwh = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(inlet_psia > 0)) return { error: "Inlet pressure must be positive (psia)." };
  if (!(input_kw > 0)) return { error: "Current input power must be positive (kW)." };
  if (!(run_hours > 0)) return { error: "Run hours must be positive." };
  if (!(reduced_psig > 0)) return { error: "Reduced discharge must be above zero gauge." };
  if (!(reduced_psig < current_psig)) return { error: "Reduced pressure must be below the current pressure." };
  if (rate_kwh < 0) return { error: "Energy rate must be non-negative." };
  const exp = (_K_AIR - 1) / _K_AIR;
  const work_current = ((current_psig + 14.7) / inlet_psia) ** exp - 1;
  const work_reduced = ((reduced_psig + 14.7) / inlet_psia) ** exp - 1;
  const pct_saved = 1 - work_reduced / work_current;
  const kw_saved = input_kw * pct_saved;
  const annual_kwh = kw_saved * run_hours;
  const annual_savings = annual_kwh * rate_kwh;
  return {
    pct_saved, kw_saved, annual_kwh, annual_savings,
    note: "Isentropic compression-power ratio: percent saved = 1 - [(P_reduced/P1)^((k-1)/k) - 1] / [(P_current/P1)^((k-1)/k) - 1], which reproduces the DOE rule of roughly 0.5 percent of compressor energy per psi of reduction. The reduced setpoint must still hold the minimum pressure the tools need after system pressure drop (the point of a leak and piping fix is to allow the drop). The saving is on the compression energy that actually falls with pressure (an unloaded or modulating compressor may not capture all of it), and the ratio assumes single-stage isentropic behavior. An energy-savings estimate, not a metered result.",
  };
}
const airPressureSetpointSavingsExample = { inputs: { current_psig: 120, reduced_psig: 105, inlet_psia: 14.7, input_kw: 50, run_hours: 6000, rate_kwh: 0.10 } };
HVAC_RENDERERS["air-pressure-setpoint-savings"] = _rEnv({
  citation: "Citation: isentropic compression-power ratio percent saved = 1 - [(P_reduced/P1)^((k-1)/k) - 1] / [(P_current/P1)^((k-1)/k) - 1], reproducing the DOE ~0.5 percent per psi rule (by name). The reduced setpoint must still hold the minimum tool pressure. An energy-savings estimate, not a metered result.",
  example: airPressureSetpointSavingsExample.inputs,
  fields: [
    { key: "current_psig", label: "Current discharge setpoint (psig)", kind: "number" },
    { key: "reduced_psig", label: "Proposed lower setpoint (psig)", kind: "number" },
    { key: "inlet_psia", label: "Inlet pressure (psia)", kind: "number", default: 14.7 },
    { key: "input_kw", label: "Current compressor input (kW)", kind: "number" },
    { key: "run_hours", label: "Run hours/yr", kind: "number", default: 6000 },
    { key: "rate_kwh", label: "Energy rate ($/kWh)", kind: "number" },
  ],
  outputs: [
    { key: "pct", id: "apss-out-pct", label: "Percent energy saved", value: (r) => fmt(r.pct_saved * 100, 2) + "%" },
    { key: "kw", id: "apss-out-kw", label: "Power saved", value: (r) => fmt(r.kw_saved, 2) + " kW" },
    { key: "kwh", id: "apss-out-kwh", label: "Annual energy saved", value: (r) => fmt(r.annual_kwh, 0) + " kWh/yr" },
    { key: "save", id: "apss-out-save", label: "Annual savings", value: (r) => "$" + fmt(r.annual_savings, 0) + "/yr" },
    { key: "n", id: "apss-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirPressureSetpointSavings,
});

// =====================================================================
// spec-v275..v277: ventilation-and-recovery batch (Group C). The three
// ways the trade meets a ventilation requirement without oversizing the
// equipment behind it: recover (the ERV/HRV pre-tempers incoming outdoor
// air off the leaving exhaust), temper (the makeup-air unit heats the
// outdoor air an exhaust hood pulls in), modulate (the CO2-setpoint
// demand-controlled ventilation rate). Sea-level psychrometric constants:
// 1.08 = 60 x 0.075 x 0.24 (sensible), 0.68 = 60 x 0.075 x (1076/1.0)/7000
// (latent, humidity ratio in gr/lb).
// =====================================================================

// dims: in { cfm: L^3 T^-1, t_oa_F: T, t_ra_F: T, eps_s: dimensionless } out: { dT_F: T, t_leave_F: T, Q_s_btuh: M L^2 T^-3, Q_noerv_btuh: M L^2 T^-3, Q_resid_btuh: M L^2 T^-3 }
export function computeErvSensibleRecovery({ cfm = 0, t_oa_F = 0, t_ra_F = 0, eps_s = 0.75 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(cfm > 0)) return { error: "Ventilation airflow must be positive (cfm)." };
  if (!(eps_s >= 0 && eps_s <= 1)) return { error: "Sensible effectiveness must be between 0 and 1." };
  const dT_F = t_ra_F - t_oa_F;
  const t_leave_F = t_oa_F + eps_s * dT_F;
  const Q_s_btuh = 1.08 * cfm * eps_s * dT_F;
  const Q_noerv_btuh = 1.08 * cfm * dT_F;
  const Q_resid_btuh = Q_noerv_btuh - Q_s_btuh;
  return {
    dT_F, t_leave_F, Q_s_btuh, Q_noerv_btuh, Q_resid_btuh,
    note: "ASHRAE Standard 84 / AHRI 1060 sensible effectiveness: T_leaving = T_oa + eps_s x (T_ra - T_oa); recovered sensible load Q_s = 1.08 x CFM x eps_s x (T_ra - T_oa) with the sea-level constant 1.08 = 60 x 0.075 x 0.24. A positive Q_s is heating recovered in winter, a negative Q_s is sensible cooling relieved in summer; equal outdoor and return temperatures recover nothing (zero, not an error). Assumes balanced (equal supply and exhaust) airflow at the manufacturer's rated effectiveness - no part-load, frosting, or defrost derate, no latent (enthalpy) recovery, and no fan or pressure-drop penalty. A design aid, not the manufacturer's certified performance data.",
  };
}
const ervSensibleRecoveryExample = { inputs: { cfm: 200, t_oa_F: 10, t_ra_F: 70, eps_s: 0.75 } };
HVAC_RENDERERS["erv-sensible-recovery"] = _rEnv({
  citation: "Citation: ASHRAE Standard 84 / AHRI 1060 sensible-effectiveness definition (eps_s = (T_leaving - T_oa) / (T_ra - T_oa)) and the recovered sensible load Q_s = 1.08 x CFM x eps_s x dT (by name). Balanced flow at the rated effectiveness, sensible only. A design aid, not the manufacturer's certified data.",
  example: ervSensibleRecoveryExample.inputs,
  fields: [
    { key: "cfm", label: "Balanced ventilation airflow (cfm)", kind: "number" },
    { key: "t_oa_F", label: "Outdoor air temperature (F)", kind: "number" },
    { key: "t_ra_F", label: "Return/exhaust air temperature (F)", kind: "number", default: 70 },
    { key: "eps_s", label: "Rated sensible effectiveness (0-1)", kind: "number", default: 0.75 },
  ],
  outputs: [
    { key: "dt", id: "esr-out-dt", label: "Available temperature difference", value: (r) => fmt(r.dT_F, 1) + " F" },
    { key: "tl", id: "esr-out-tl", label: "Outdoor air leaving the core", value: (r) => fmt(r.t_leave_F, 1) + " F" },
    { key: "qs", id: "esr-out-qs", label: "Recovered sensible load", value: (r) => fmt(r.Q_s_btuh, 0) + " Btu/h" },
    { key: "qno", id: "esr-out-qno", label: "OA load with no recovery", value: (r) => fmt(r.Q_noerv_btuh, 0) + " Btu/h" },
    { key: "qr", id: "esr-out-qr", label: "Residual OA load for the plant", value: (r) => fmt(r.Q_resid_btuh, 0) + " Btu/h" },
    { key: "n", id: "esr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeErvSensibleRecovery,
});

// dims: in { cfm: L^3 T^-1, t_oa_F: T, t_target_F: T, eta: dimensionless, w_oa_gr: dimensionless, w_target_gr: dimensionless } out: { dT_F: T, Q_s_btuh: M L^2 T^-3, Q_l_btuh: M L^2 T^-3, Q_t_btuh: M L^2 T^-3, input_btuh: M L^2 T^-3 }
export function computeMuaTemperingLoad({ cfm = 0, t_oa_F = 0, t_target_F = 0, eta = 0.80, w_oa_gr = 0, w_target_gr = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(cfm > 0)) return { error: "Makeup airflow must be positive (cfm)." };
  if (!(eta > 0 && eta <= 1)) return { error: "Thermal efficiency must be over 0 and up to 1." };
  if (w_oa_gr < 0 || w_target_gr < 0) return { error: "Humidity ratios must be non-negative (gr/lb)." };
  const dT_F = t_target_F - t_oa_F;
  const Q_s_btuh = 1.08 * cfm * dT_F;
  const Q_l_btuh = 0.68 * cfm * (w_oa_gr - w_target_gr);
  const Q_t_btuh = Q_s_btuh + Q_l_btuh;
  const input_btuh = Q_s_btuh / eta;
  return {
    dT_F, Q_s_btuh, Q_l_btuh, Q_t_btuh, input_btuh,
    note: "ASHRAE Fundamentals psychrometric loads at sea level: sensible Q_s = 1.08 x CFM x dT, latent Q_l = 0.68 x CFM x dW (gr/lb), total Q_t = Q_s + Q_l; the gas/heater input is the sensible load over the thermal efficiency. IMC 508 requires makeup air roughly equal to the exhaust. Leave both humidity ratios at zero for a heating-only MUA (latent = 0). Sea-level air density (no altitude derate), makeup CFM equal to the exhaust, delivery at the target temperature; duct and cabinet losses, fan heat, and hood capture efficiency excluded. A design aid, not the mechanical engineer's stamped design.",
  };
}
const muaTemperingLoadExample = { inputs: { cfm: 2000, t_oa_F: 20, t_target_F: 65, eta: 0.80 } };
HVAC_RENDERERS["mua-tempering-load"] = _rEnv({
  citation: "Citation: ASHRAE Fundamentals sensible Q_s = 1.08 x CFM x dT and latent Q_l = 0.68 x CFM x dW (gr/lb) tempering loads with the IMC 508 makeup-air-equals-exhaust requirement (by name). Sea-level constants, neutral supply target, no duct losses. A design aid, not the engineer's stamped design.",
  example: muaTemperingLoadExample.inputs,
  fields: [
    { key: "cfm", label: "Makeup airflow (cfm, = exhaust)", kind: "number" },
    { key: "t_oa_F", label: "Outdoor air temperature (F)", kind: "number" },
    { key: "t_target_F", label: "Target supply temperature (F)", kind: "number", default: 65 },
    { key: "eta", label: "Heater thermal efficiency (0-1)", kind: "number", default: 0.80 },
    { key: "w_oa_gr", label: "Outdoor humidity ratio (gr/lb, optional)", kind: "number" },
    { key: "w_target_gr", label: "Target humidity ratio (gr/lb, optional)", kind: "number" },
  ],
  outputs: [
    { key: "dt", id: "mua-out-dt", label: "Temperature rise", value: (r) => fmt(r.dT_F, 1) + " F" },
    { key: "qs", id: "mua-out-qs", label: "Sensible tempering load", value: (r) => fmt(r.Q_s_btuh, 0) + " Btu/h" },
    { key: "ql", id: "mua-out-ql", label: "Latent load", value: (r) => fmt(r.Q_l_btuh, 0) + " Btu/h" },
    { key: "qt", id: "mua-out-qt", label: "Total load", value: (r) => fmt(r.Q_t_btuh, 0) + " Btu/h" },
    { key: "in", id: "mua-out-in", label: "Required heater input", value: (r) => fmt(r.input_btuh, 0) + " Btu/h" },
    { key: "n", id: "mua-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMuaTemperingLoad,
});

// dims: in { n: dimensionless, co2_set_ppm: dimensionless, co2_oa_ppm: dimensionless, gen_cfm: L^3 T^-1 } out: { Q_person_cfm: L^3 T^-1, Q_total_cfm: L^3 T^-1, co2_check_ppm: dimensionless }
export function computeDcvCo2Ventilation({ n = 0, co2_set_ppm = 0, co2_oa_ppm = 400, gen_cfm = 0.0106 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(n > 0)) return { error: "Occupancy must be positive." };
  if (!(gen_cfm > 0)) return { error: "Per-person CO2 generation must be positive (cfm)." };
  if (co2_oa_ppm < 0) return { error: "Outdoor CO2 must be non-negative (ppm)." };
  if (!(co2_set_ppm > co2_oa_ppm)) return { error: "The setpoint must exceed the outdoor CO2 - no finite airflow can hold a setpoint at or below the outdoor concentration." };
  const dC_frac = (co2_set_ppm - co2_oa_ppm) / 1e6;
  const Q_person_cfm = gen_cfm / dC_frac;
  const Q_total_cfm = Q_person_cfm * n;
  const co2_check_ppm = co2_oa_ppm + (gen_cfm / Q_person_cfm) * 1e6;
  return {
    Q_person_cfm, Q_total_cfm, co2_check_ppm,
    note: "Steady-state single-zone CO2 mass balance: C_in = C_oa + N / Q, solved for the per-person outdoor airflow Q = N / (C_set - C_oa) with the concentrations as volume fractions; the sedentary office generation rate is about 0.0106 cfm per person. This is the equilibrium (fully mixed) airflow that eventually holds the setpoint, not the transient buildup or decay time; one zone at one occupancy and a fixed metabolic rate. ASHRAE 62.1 treats CO2 as an indicator of occupant bioeffluents - the Ventilation Rate Procedure and the engineer of record govern the minimum outdoor air. A design and commissioning aid.",
  };
}
const dcvCo2VentilationExample = { inputs: { n: 20, co2_set_ppm: 1100, co2_oa_ppm: 400, gen_cfm: 0.0106 } };
HVAC_RENDERERS["dcv-co2-ventilation"] = _rEnv({
  citation: "Citation: steady-state single-zone CO2 mass balance C_in = C_oa + N/Q, solved as Q = N / (C_set - C_oa), with the ASHRAE 62.1 CO2-as-indicator note and a sedentary generation of about 0.0106 cfm/person (by name). Equilibrium airflow, one fully mixed zone. The ASHRAE 62.1 rate procedure governs the minimum.",
  example: dcvCo2VentilationExample.inputs,
  fields: [
    { key: "n", label: "Occupancy (people)", kind: "number" },
    { key: "co2_set_ppm", label: "Indoor CO2 setpoint (ppm)", kind: "number" },
    { key: "co2_oa_ppm", label: "Outdoor CO2 (ppm)", kind: "number", default: 400 },
    { key: "gen_cfm", label: "CO2 generation per person (cfm)", kind: "number", default: 0.0106 },
  ],
  outputs: [
    { key: "qp", id: "dcv-out-qp", label: "Outdoor airflow per person", value: (r) => fmt(r.Q_person_cfm, 1) + " cfm/person" },
    { key: "qt", id: "dcv-out-qt", label: "Total outdoor airflow", value: (r) => fmt(r.Q_total_cfm, 0) + " cfm" },
    { key: "chk", id: "dcv-out-chk", label: "Steady-state CO2 back-check", value: (r) => fmt(r.co2_check_ppm, 0) + " ppm" },
    { key: "n", id: "dcv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDcvCo2Ventilation,
});

// =====================================================================
// spec-v305..v307: pump-and-fluid fundamentals batch (Group C). The
// pieces the friction and pump tiles use internally but never expose:
// the Reynolds number and regime, the hydronic system flow from load and
// delta-T, and the pump specific speed and impeller type.
// =====================================================================

// dims: in { v_fps: L T^-1, d_in: L, nu: L^2 T^-1 } out: { re: dimensionless }
export function computeReynoldsNumberPipe({ v_fps = 0, d_in = 0, nu = 1.21e-5 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(v_fps > 0)) return { error: "Velocity must be positive (ft/s)." };
  if (!(d_in > 0)) return { error: "Diameter must be positive (in)." };
  if (!(nu > 0)) return { error: "Kinematic viscosity must be positive (ft^2/s)." };
  const re = (v_fps * (d_in / 12)) / nu;
  const regime = re < 2300 ? "laminar (Re < 2,300; f = 64/Re, loss linear in velocity)" : (re <= 4000 ? "transitional (2,300-4,000; unstable, avoid designing here)" : "turbulent (Re > 4,000; the regime the Hazen-Williams / Colebrook friction tiles assume)");
  return {
    re, regime,
    note: "Reynolds number Re = V D / nu (= rho V D / mu), the velocity times diameter over kinematic viscosity, sorting full pipe flow into laminar (below ~2,300), transitional (~2,300 to 4,000), and turbulent (above ~4,000). Nearly all trade piping is turbulent, which is why the friction tiles' Hazen-Williams and Colebrook forms apply. A 60 degF water kinematic viscosity is about 1.21e-5 ft^2/s (1.13 centistokes); the value is temperature- and fluid-dependent, so provide it for the fluid and temperature at hand. Circular full pipe; this does not itself compute the friction factor or head loss. An engineering aid; the fluid property data at the operating condition govern.",
  };
}
const reynoldsNumberPipeExample = { inputs: { v_fps: 6, d_in: 2, nu: 1.21e-5 } };
HVAC_RENDERERS["reynolds-number-pipe"] = _rEnv({
  citation: "Citation: Reynolds number Re = V D / nu, the pipe-flow transition bands (laminar below ~2,300, turbulent above ~4,000), and a 60 degF water kinematic viscosity of about 1.21e-5 ft^2/s, by name. Full circular pipe; the friction factor is separate. An engineering aid; the fluid property data govern.",
  example: reynoldsNumberPipeExample.inputs,
  fields: [
    { key: "v_fps", label: "Mean flow velocity (ft/s)", kind: "number" },
    { key: "d_in", label: "Inside diameter (in)", kind: "number" },
    { key: "nu", label: "Kinematic viscosity (ft^2/s)", kind: "number", default: 1.21e-5 },
  ],
  outputs: [
    { key: "re", id: "rnp-out-re", label: "Reynolds number", value: (r) => fmt(r.re, 0) },
    { key: "rg", id: "rnp-out-rg", label: "Flow regime", value: (r) => r.regime },
    { key: "n", id: "rnp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReynoldsNumberPipe,
});

// dims: in { load: M L^2 T^-3, unit_tons: dimensionless, dt_f: T, factor: dimensionless } out: { q_btuh: M L^2 T^-3, gpm: L^3 T^-1 }
export function computeHydronicGpmDeltat({ load = 0, unit_tons = 0, dt_f = 0, factor = 500 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(load > 0)) return { error: "Load must be positive." };
  if (!(dt_f > 0)) return { error: "Design delta-T must be positive (degF)." };
  if (!(factor > 0)) return { error: "The fluid factor must be positive (500 water, ~485 at 30% PG)." };
  const is_tons = unit_tons === 1;
  const q_btuh = is_tons ? load * 12000 : load;
  const gpm = q_btuh / (factor * dt_f);
  return {
    q_btuh, gpm,
    note: "Water-side heat transport Q = 500 x GPM x dT (500 = 8.33 lb/gal x 60 min/h x 1.0 Btu/lb-degF for water), rearranged to the design flow GPM = Q / (500 dT); for chilled water the shortcut is GPM = 24 tons/dT (12,000/500 = 24). The delta-T is the lever: a wide design delta-T shrinks the flow, pump, and pipe for the same load. Pure water at the sea-level factor (adjust for glycol via the fluid factor, about 485 at 30% propylene glycol); assumes the full load is carried by the entered delta-T (no bypass or primary/secondary decoupling), and does not size the pump head, the pipe, or the coil. A design aid; the mechanical engineer of record's design governs.",
  };
}
const hydronicGpmDeltatExample = { inputs: { load: 10, unit_tons: 1, dt_f: 10, factor: 500 } };
HVAC_RENDERERS["hydronic-gpm-deltat"] = _rEnv({
  citation: "Citation: hydronic flow GPM = Q / (500 dT) from Q = 500 GPM dT (500 = 8.33 x 60 x 1.0 for water), the chilled-water form GPM = 24 tons/dT, and the glycol-lowered factor, by name. Pure water, full load on the delta-T; the pump head is separate. A design aid; the mechanical engineer of record governs.",
  example: hydronicGpmDeltatExample.inputs,
  fields: [
    { key: "load", label: "Load (Btu/h, or tons if unit set to 1)", kind: "number" },
    { key: "unit_tons", label: "Load unit (0 = Btu/h, 1 = tons)", kind: "number", default: 0 },
    { key: "dt_f", label: "Design delta-T (degF)", kind: "number" },
    { key: "factor", label: "Fluid factor (500 water, ~485 30% PG)", kind: "number", default: 500 },
  ],
  outputs: [
    { key: "q", id: "hgd-out-q", label: "Load", value: (r) => fmt(r.q_btuh, 0) + " Btu/h" },
    { key: "gpm", id: "hgd-out-gpm", label: "Design system flow", value: (r) => fmt(r.gpm, 1) + " gpm" },
    { key: "n", id: "hgd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydronicGpmDeltat,
});

// dims: in { n_rpm: T^-1, q_gpm: L^3 T^-1, h_ft: L } out: { ns: dimensionless }
export function computePumpSpecificSpeed({ n_rpm = 0, q_gpm = 0, h_ft = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(n_rpm > 0)) return { error: "Pump speed must be positive (rpm)." };
  if (!(q_gpm > 0)) return { error: "Flow at BEP must be positive (gpm)." };
  if (!(h_ft > 0)) return { error: "Head per stage must be positive (ft)." };
  const ns = (n_rpm * Math.sqrt(q_gpm)) / Math.pow(h_ft, 0.75);
  const impeller = ns < 2000 ? "radial (high head, low flow; the building-service centrifugal norm)" : (ns <= 4500 ? "mixed flow (moderate head and flow)" : "axial (low head, high flow)");
  return {
    ns, impeller,
    note: "US pump specific speed Ns = N sqrt(Q) / H^(3/4) (N rpm, Q gpm at the best-efficiency point, H ft per stage - divide total head by the number of stages), the dimensionless-in-practice index that classifies the impeller geometry a duty calls for: roughly radial below ~2,000, mixed flow ~2,000 to 4,500, axial above ~4,500. The head-to-flow ratio, not the size, sets the wheel type; the H^(3/4) denominator makes a low-head high-flow duty jump families. The customary dimensional US form (not the dimensionless or metric nq); this does not compute the suction specific speed Nss (a separate NPSH-margin index) or select a specific pump. An engineering aid; the pump manufacturer's curves govern.",
  };
}
const pumpSpecificSpeedExample = { inputs: { n_rpm: 1750, q_gpm: 500, h_ft: 100 } };
HVAC_RENDERERS["pump-specific-speed"] = _rEnv({
  citation: "Citation: US pump specific speed Ns = N sqrt(Q) / H^(3/4) (rpm, gpm at BEP, ft/stage) and the impeller-type bands (radial below ~2,000, mixed ~2,000-4,500, axial above ~4,500), Hydraulic Institute convention, by name. US dimensional form; the suction specific speed Nss is separate. An engineering aid; the manufacturer's curves govern.",
  example: pumpSpecificSpeedExample.inputs,
  fields: [
    { key: "n_rpm", label: "Pump speed N (rpm)", kind: "number" },
    { key: "q_gpm", label: "Flow at BEP Q (gpm)", kind: "number" },
    { key: "h_ft", label: "Head per stage H (ft)", kind: "number" },
  ],
  outputs: [
    { key: "ns", id: "pss-out-ns", label: "Specific speed Ns", value: (r) => fmt(r.ns, 0) },
    { key: "imp", id: "pss-out-imp", label: "Indicative impeller type", value: (r) => r.impeller },
    { key: "n", id: "pss-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePumpSpecificSpeed,
});

// =====================================================================
// spec-v329..v331: building-energy batch (Group C). The whole-house
// numbers the single-assembly tiles never roll up: the building heat-loss
// coefficient UA, the annual heating energy from UA and degree-days, and
// the through-wall condensation gradient.
// =====================================================================

// dims: in { assemblies: dimensionless, cfm_inf: L^3 T^-1, dt_f: T } out: { cond: M L^2 T^-3, ua_inf: M L^2 T^-3, ua: M L^2 T^-3, design_load: M L^2 T^-3 }
export function computeBuildingUa({ assemblies, cfm_inf = 0, dt_f = 0 } = {}) {
  const _g = _finiteGuardEnv({ cfm_inf, dt_f }); if (_g) return _g;
  if (!Array.isArray(assemblies) || assemblies.length < 1) return { error: "Enter at least one envelope assembly (area, R-value)." };
  if (cfm_inf < 0) return { error: "Infiltration airflow cannot be negative (cfm)." };
  let cond = 0;
  for (const a of assemblies) {
    if (!a || !Number.isFinite(a.area) || !Number.isFinite(a.r)) return { error: "Each assembly needs a finite area and R-value." };
    if (!(a.area > 0)) return { error: "Each assembly area must be positive (ft^2)." };
    if (!(a.r > 0)) return { error: "Each assembly R-value must be positive." };
    cond += a.area / a.r;
  }
  const ua_inf = 1.08 * cfm_inf;
  const ua = cond + ua_inf;
  const design_load = dt_f > 0 ? ua * dt_f : null;
  return {
    cond, ua_inf, ua, design_load,
    note: "Whole-building heat-loss coefficient UA = sum(A_i/R_i) + 1.08 x CFM, in Btu/h per degF, with the infiltration conductance from the sensible-air constant 1.08 = 60 x 0.075 x 0.24 and the design load Q = UA x dT. It sums the entered assemblies and a single infiltration airflow (convert ACH50 to natural infiltration via an LBL/N-factor first, or enter the natural cfm), uses clear-field assembly R-values (thermal bridging is captured only to the extent each R_i already accounts for it), and does not add the latent, ground-coupling, or solar terms. An energy-audit aid, not a stamped Manual J; the ACCA Manual J / RESNET analysis governs.",
  };
}
const buildingUaExample = { inputs: { assemblies: [{ area: 1200, r: 17 }, { area: 1500, r: 38 }, { area: 200, r: 3 }, { area: 1500, r: 19 }], cfm_inf: 50, dt_f: 70 } };
function _v329renderBuildingUa(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: whole-building heat-loss coefficient UA = sum(A/R) + 1.08 x CFM, the infiltration conductance from 1.08 = 60 x 0.075 x 0.24, and the design load Q = UA x dT, ASHRAE Fundamentals / RESNET basis, by name. Sensible only; enter the natural infiltration cfm. An energy-audit aid, not a stamped Manual J.";
  const asm = makeTextarea("Assemblies, one per line as area_ft2,R-value", "bua-asm", { rows: "4" });
  asm.input.value = "1200,17\n1500,38\n200,3\n1500,19";
  const cfm = makeNumber("Natural infiltration (cfm)", "bua-cfm", { step: "any", min: "0" }); cfm.input.value = "50";
  const dt = makeNumber("Design temperature difference (F, optional)", "bua-dt", { step: "any", min: "0" }); dt.input.value = "70";
  for (const f of [asm, cfm, dt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { asm.input.value = "1200,17\n1500,38\n200,3\n1500,19"; cfm.input.value = "50"; dt.input.value = "70"; update(); });
  const oCond = makeOutputLine(outputRegion, "Conduction + infiltration conductance", "bua-out-cond");
  const oUa = makeOutputLine(outputRegion, "Heat-loss coefficient UA", "bua-out-ua");
  const oLoad = makeOutputLine(outputRegion, "Design heating load", "bua-out-load");
  const oNote = makeOutputLine(outputRegion, "Note", "bua-out-note");
  function parse(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim(); if (!line) continue;
      const p = line.split(",").map((s) => Number(s.trim()));
      if (p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
      out.push({ area: p[0], r: p[1] });
    }
    return out;
  }
  const update = debounce(() => {
    const list = parse(asm.input.value);
    if (list === null) { oCond.textContent = "Each line must be area_ft2,R-value with finite numbers."; oUa.textContent = "-"; oLoad.textContent = "-"; oNote.textContent = "-"; return; }
    const r = computeBuildingUa({ assemblies: list, cfm_inf: Number(cfm.input.value) || 0, dt_f: Number(dt.input.value) || 0 });
    if (r.error) { oCond.textContent = r.error; oUa.textContent = "-"; oLoad.textContent = "-"; oNote.textContent = "-"; return; }
    oCond.textContent = fmt(r.cond, 1) + " + " + fmt(r.ua_inf, 1) + " Btu/h-F";
    oUa.textContent = fmt(r.ua, 1) + " Btu/h-F";
    oLoad.textContent = r.design_load === null ? "- (enter a design dT)" : fmt(r.design_load, 0) + " Btu/h";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [asm.input, cfm.input, dt.input]) f.addEventListener("input", update);
}
HVAC_RENDERERS["building-ua"] = _v329renderBuildingUa;

// dims: in { ua_btuhf: M L^2 T^-3, hdd: T, eff: dimensionless, fuel: dimensionless, price: dimensionless } out: { q_mmbtu: M L^2 T^-2, fuel_units: dimensionless, cost: dimensionless }
export function computeDegreeDayEnergy({ ua_btuhf = 0, hdd = 0, eff = 0.80, fuel = "gas", price = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(ua_btuhf > 0)) return { error: "The heat-loss coefficient UA must be positive (Btu/h-F)." };
  if (!(hdd > 0)) return { error: "Heating degree-days must be positive (degF-days)." };
  if (!(eff > 0)) return { error: "Efficiency (AFUE or COP) must be positive." };
  if (price < 0) return { error: "Fuel price cannot be negative." };
  const per_unit = { gas: 1e5, oil: 138500, electric: 3412 };
  const unit_btu = per_unit[fuel];
  if (!unit_btu) return { error: "Fuel must be gas (therm), oil (gal), or electric (kWh)." };
  const unit_label = { gas: "therms", oil: "gal", electric: "kWh" }[fuel];
  const q_btu = 24 * hdd * ua_btuhf;
  const fuel_btu = q_btu / eff;
  const fuel_units = fuel_btu / unit_btu;
  const cost = fuel_units * price;
  return {
    q_mmbtu: q_btu / 1e6, fuel_units, unit_label, cost,
    note: "Degree-day annual heating energy Q = 24 x HDD x UA (base-65 degF heating degree-days), the fuel = Q/efficiency, and the cost = fuel x unit price, with 1 therm = 100,000 Btu, 1 gal fuel oil ~ 138,500 Btu, and 1 kWh = 3,412 Btu. The energy scales directly with UA, so a 20% envelope improvement is a 20% lower bill. This is the base-65 steady-state degree-day method - a variable-base method with the building's actual balance point is more accurate, and it ignores internal and solar gains that lower the true balance point; it takes UA and local HDD as entered and adds no cooling, latent, or domestic-hot-water energy. An estimate, not a utility-bill-calibrated model; actual consumption depends on occupancy, weather, and gains.",
  };
}
const degreeDayEnergyExample = { inputs: { ua_btuhf: 500, hdd: 5000, eff: 0.80, fuel: "gas", price: 1.20 } };
function _v330renderDegreeDayEnergy(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: degree-day annual heating energy Q = 24 x HDD x UA (base-65 degF), fuel = Q/efficiency, with 1 therm = 100,000 Btu / 1 gal oil ~ 138,500 Btu / 1 kWh = 3,412 Btu, ASHRAE degree-day / RESNET basis, by name. Steady-state, no gains, heating only. An estimate, not a calibrated model.";
  const ua = makeNumber("Heat-loss coefficient UA (Btu/h-F)", "dde-ua", { step: "any", min: "0" });
  const hdd = makeNumber("Heating degree-days (base 65 F)", "dde-hdd", { step: "any", min: "0" });
  const eff = makeNumber("System efficiency (AFUE or COP)", "dde-eff", { step: "any", min: "0" }); eff.input.value = "0.80";
  const fuel = makeSelect("Fuel", "dde-fuel", [
    { value: "gas", label: "Gas (therms)" },
    { value: "oil", label: "Fuel oil (gal)" },
    { value: "electric", label: "Electric (kWh)" },
  ]);
  const price = makeNumber("Fuel unit price ($/unit, optional)", "dde-price", { step: "any", min: "0" });
  inputRegion.appendChild(ua.wrap); inputRegion.appendChild(hdd.wrap); inputRegion.appendChild(eff.wrap); inputRegion.appendChild(fuel.wrap); inputRegion.appendChild(price.wrap);
  attachExampleButton(inputRegion, () => { ua.input.value = "500"; hdd.input.value = "5000"; eff.input.value = "0.80"; fuel.select.value = "gas"; price.input.value = "1.20"; update(); });
  const oQ = makeOutputLine(outputRegion, "Delivered heating energy", "dde-out-q");
  const oFuel = makeOutputLine(outputRegion, "Fuel use", "dde-out-fuel");
  const oCost = makeOutputLine(outputRegion, "Annual cost", "dde-out-cost");
  const oNote = makeOutputLine(outputRegion, "Note", "dde-out-note");
  const update = debounce(() => {
    const r = computeDegreeDayEnergy({ ua_btuhf: Number(ua.input.value) || 0, hdd: Number(hdd.input.value) || 0, eff: Number(eff.input.value) || 0, fuel: fuel.select.value, price: Number(price.input.value) || 0 });
    if (r.error) { oQ.textContent = r.error; oFuel.textContent = "-"; oCost.textContent = "-"; oNote.textContent = "-"; return; }
    oQ.textContent = fmt(r.q_mmbtu, 1) + " MMBtu/yr";
    oFuel.textContent = fmt(r.fuel_units, 0) + " " + r.unit_label + "/yr";
    oCost.textContent = (Number(price.input.value) || 0) > 0 ? "$" + fmt(r.cost, 0) + "/yr" : "- (enter a price)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ua.input, hdd.input, eff.input, price.input]) f.addEventListener("input", update);
  fuel.select.addEventListener("change", update);
}
HVAC_RENDERERS["degree-day-energy"] = _v330renderDegreeDayEnergy;

// dims: in { r_inside: dimensionless, r_outside: dimensionless, t_in_f: T, t_out_f: T, rh_in_pct: dimensionless } out: { t_plane_f: T, t_dew_f: T, margin_f: T }
export function computeWallCondensationGradient({ r_inside = 0, r_outside = 0, t_in_f = 0, t_out_f = 0, rh_in_pct = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(r_inside > 0)) return { error: "The inside R-value (warm side to the plane) must be positive." };
  if (!(r_outside > 0)) return { error: "The outside R-value (beyond the plane) must be positive." };
  if (!(rh_in_pct > 0 && rh_in_pct <= 100)) return { error: "Indoor relative humidity must be over 0 and up to 100%." };
  const r_total = r_inside + r_outside;
  const t_plane_f = t_in_f - (r_inside / r_total) * (t_in_f - t_out_f);
  // Magnus dew point of the indoor air.
  const t_in_c = (t_in_f - 32) / 1.8;
  const a = 17.625, b = 243.04;
  const gamma = Math.log(rh_in_pct / 100) + (a * t_in_c) / (b + t_in_c);
  const dew_c = (b * gamma) / (a - gamma);
  const t_dew_f = dew_c * 1.8 + 32;
  const margin_f = t_plane_f - t_dew_f;
  const condensing = margin_f <= 0;
  return {
    t_plane_f, t_dew_f, margin_f, condensing,
    note: "One-dimensional steady-state wall condensation screen: temperature drops across an assembly in proportion to R-value, so the interface temperature is T_plane = T_in - (R_inside/R_total)(T_in - T_out), and condensation forms wherever that plane sits at or below the interior air's Magnus dew point. Warming the plane - by adding continuous exterior insulation, which raises R_outside and shifts the ratio - keeps the structural sheathing above the dew point, the whole point of the ratio rule. This is a 1-D steady-state gradient (no thermal bridging, air movement, or vapor-diffusion/transient moisture accumulation, which a Glaser or hygrothermal model adds), uses the interior air's dew point moderated by any vapor retarder, and is a screen. A building-science aid, not a substitute for a hygrothermal (WUFI-type) analysis; the assembly's vapor control governs.",
  };
}
const wallCondensationGradientExample = { inputs: { r_inside: 13.5, r_outside: 4, t_in_f: 70, t_out_f: 20, rh_in_pct: 40 } };
HVAC_RENDERERS["wall-condensation-gradient"] = _rEnv({
  citation: "Citation: R-proportional interface temperature T_plane = T_in - (R_inside/R_total)(T_in - T_out), the Magnus dew point of the indoor air, and the condensation criterion T_plane <= T_dew, by name. 1-D steady-state screen, no vapor diffusion. A building-science aid, not a hygrothermal analysis.",
  example: wallCondensationGradientExample.inputs,
  fields: [
    { key: "r_inside", label: "R-value warm side to the plane", kind: "number" },
    { key: "r_outside", label: "R-value beyond the plane", kind: "number" },
    { key: "t_in_f", label: "Indoor air temperature (F)", kind: "number", default: 70 },
    { key: "t_out_f", label: "Outdoor air temperature (F)", kind: "number" },
    { key: "rh_in_pct", label: "Indoor relative humidity (%)", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "tp", id: "wcg-out-tp", label: "Condensation-plane temperature", value: (r) => fmt(r.t_plane_f, 1) + " F" },
    { key: "td", id: "wcg-out-td", label: "Indoor dew point", value: (r) => fmt(r.t_dew_f, 1) + " F" },
    { key: "m", id: "wcg-out-m", label: "Margin to dew point", value: (r) => fmt(r.margin_f, 1) + " F - " + (r.condensing ? "CONDENSING" : "dry") },
    { key: "n", id: "wcg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWallCondensationGradient,
});

// =====================================================================
// spec-v347..v349: air-distribution / air-property batch (Group C). The
// duct-and-grille field numbers the load and friction tiles never give:
// duct heat gain through unconditioned space (v347), grille face velocity
// and free-area sizing (v348), and the altitude/temperature air-density
// correction that turns ACFM into SCFM (v349).
// =====================================================================

// dims: in { R_duct: dimensionless, A_ft2: L^2, dT_F: T, cfm: L^3 T^-1 } out: { Q_btuh: M L^2 T^-3, dT_air: T }
export function computeDuctHeatGain({ R_duct = 0, A_ft2 = 0, dT_F = 0, cfm = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  if (!(R_duct > 0)) return { error: "Duct insulation R-value must be positive." };
  if (!(A_ft2 > 0)) return { error: "Duct surface area must be positive (ft^2)." };
  if (!(cfm > 0)) return { error: "Airflow must be positive (cfm)." };
  const U = 1 / R_duct;
  const Q_btuh = U * A_ft2 * dT_F;
  const dT_air = Q_btuh / (1.08 * cfm);
  return {
    U, Q_btuh, dT_air,
    note: "Conductive duct heat gain/loss through unconditioned space: U = 1/R, Q = U A dT with dT the ambient-minus-in-duct temperature (positive = the duct gains heat, e.g. a cold supply in a hot attic), and the resulting air temperature change dT_air = Q / (1.08 x cfm). Doubling the duct R-value halves the loss - the linear return that pays for attic-duct insulation - and halving the airflow doubles the per-cfm temperature swing. Steady-state conduction only; no radiant gain, air leakage, or latent transfer. A design aid; the ductwork design and the ambient conditions govern.",
  };
}
const ductHeatGainExample = { inputs: { R_duct: 4, A_ft2: 100, dT_F: 65, cfm: 1000 } };
HVAC_RENDERERS["duct-heat-gain"] = _rEnv({
  citation: "Citation: Conductive duct heat gain Q = U A dT with U = 1/R (ASHRAE Handbook - Fundamentals / duct-design method), and the air temperature change dT_air = Q / (1.08 x cfm). Steady-state conduction, no leakage or radiant gain. A design aid; the ductwork design governs.",
  example: ductHeatGainExample.inputs,
  fields: [
    { key: "R_duct", label: "Duct insulation R (h-ft2-F/Btu)", kind: "number" },
    { key: "A_ft2", label: "Duct surface area (ft^2)", kind: "number" },
    { key: "dT_F", label: "Ambient minus in-duct temp (F, signed)", kind: "number" },
    { key: "cfm", label: "Airflow (cfm)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "dhg-out-q", label: "Heat gain (+) / loss (-)", value: (r) => fmt(r.Q_btuh, 0) + " Btu/h" },
    { key: "dt", id: "dhg-out-dt", label: "Air temperature change", value: (r) => fmt(r.dT_air, 2) + " F" },
    { key: "n", id: "dhg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDuctHeatGain,
});

// dims: in { mode: dimensionless, cfm: L^3 T^-1, ratio: dimensionless, A_gross_ft2: L^2, V_target: L T^-1 } out: { V_face: L T^-1, A_gross_req_ft2: L^2 }
export function computeGrilleFaceVelocity({ mode = "velocity", cfm = 0, ratio = 0.75, A_gross_ft2 = 0, V_target = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  const r = Number(ratio) || 0;
  if (!(q > 0)) return { error: "Airflow must be positive (cfm)." };
  if (!(r > 0 && r <= 1)) return { error: "Free-area ratio must be between 0 and 1." };
  if (mode === "size") {
    const v = Number(V_target) || 0;
    if (!(v > 0)) return { error: "Target face velocity must be positive (fpm)." };
    const A_gross_req_ft2 = q / (v * r);
    if (!Number.isFinite(A_gross_req_ft2)) return { error: "Required grille area is not valid." };
    return { mode: "size", A_gross_req_ft2, A_gross_req_in2: A_gross_req_ft2 * 144, V_face: null };
  }
  const A_gross = Number(A_gross_ft2) || 0;
  if (!(A_gross > 0)) return { error: "Gross grille area must be positive (ft^2)." };
  const A_free = A_gross * r;
  const V_face = q / A_free;
  if (!Number.isFinite(V_face)) return { error: "Face velocity is not valid." };
  let band;
  if (V_face < 400) band = "quiet (return / low-velocity supply, < 400 fpm)";
  else if (V_face <= 700) band = "typical supply band (400-700 fpm)";
  else band = "high (> 700 fpm; noise and draft risk)";
  return { mode: "velocity", V_face, band, A_gross_req_ft2: null };
}
const grilleFaceVelocityExample = { inputs: { mode: "size", cfm: 400, ratio: 0.75, V_target: 500 } };

function _renderGrilleFaceVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Grille/register sizing from the free area: face velocity V = cfm / (gross area x free-area ratio), or the required gross area = cfm / (target velocity x ratio). Supply grilles run about 400-700 fpm, returns slower (quieter), which is why a return is larger than a supply for the same airflow. The manufacturer's published free-area ratio and throw data govern the selection.";
  const mode = makeSelect("Solve for", "gfv-mode", [
    { value: "size", label: "Required grille size (from a target velocity)" },
    { value: "velocity", label: "Face velocity (from a gross grille size)" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const cfm = makeNumber("Airflow (cfm)", "gfv-cfm", { step: "any", min: "0" }); cfm.input.value = "400";
  const ratio = makeNumber("Free-area ratio (0-1, default 0.75)", "gfv-ratio", { step: "any", min: "0", max: "1" }); ratio.input.value = "0.75";
  const vtar = makeNumber("Target face velocity (fpm)", "gfv-vtar", { step: "any", min: "0" }); vtar.input.value = "500";
  const agr = makeNumber("Gross grille area (ft^2)", "gfv-agr", { step: "any", min: "0" });
  for (const f of [cfm, ratio, vtar, agr]) inputRegion.appendChild(f.wrap);
  const oOut = makeOutputLine(outputRegion, "Result", "gfv-out");
  const oBand = makeOutputLine(outputRegion, "Velocity band", "gfv-out-band");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isSize = mode.select.value === "size";
    vtar.wrap.style.display = isSize ? "" : "none";
    agr.wrap.style.display = isSize ? "none" : "";
  }
  const update = debounce(() => {
    const r = computeGrilleFaceVelocity({ mode: mode.select.value, cfm: readNum(cfm.input), ratio: readNum(ratio.input), A_gross_ft2: readNum(agr.input), V_target: readNum(vtar.input) });
    if (r.error) { oOut.textContent = r.error; oBand.textContent = "-"; return; }
    if (r.mode === "size") { oOut.textContent = fmt(r.A_gross_req_ft2, 2) + " ft^2 gross (" + fmt(r.A_gross_req_in2, 0) + " in^2)"; oBand.textContent = "-"; return; }
    oOut.textContent = fmt(r.V_face, 0) + " fpm face velocity";
    oBand.textContent = r.band;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "size"; syncFields(); cfm.input.value = "400"; ratio.input.value = "0.75"; vtar.input.value = "500"; agr.input.value = ""; update(); });
  mode.select.addEventListener("change", () => { syncFields(); update(); });
  for (const f of [cfm.input, ratio.input, vtar.input, agr.input]) f.addEventListener("input", update);
  syncFields();
}
HVAC_RENDERERS["grille-face-velocity"] = _renderGrilleFaceVelocity;

// ===================== spec-v482: ADPI room air diffusion selection (ASHRAE) =====================
// The ASHRAE Handbook -- Fundamentals "Space Air Diffusion" ADPI Selection Guide,
// per outlet type and cooling load (Btu/hr-ft^2): { opt: T/L for max ADPI, max:
// achievable ADPI, thr: the published "ADPI greater than" threshold, lo/hi: the
// T/L band over which ADPI stays above that threshold (null = no band published
// at that load). Throw is T0.25 (50 fpm) for all rows here except ceiling slot,
// which is T0.5 (100 fpm). The light-troffer row is omitted: its throw basis is
// inconsistent across the published reproductions. Values from the ASHRAE table
// as reproduced in the Price / Krueger / Titus engineering guides.
const _ADPI_TABLE = {
  "high-sidewall": { throw: "T0.25 (50 fpm)", 80: { opt: 1.8, max: 68, thr: null, lo: null, hi: null }, 60: { opt: 1.8, max: 72, thr: 70, lo: 1.5, hi: 2.2 }, 40: { opt: 1.6, max: 78, thr: 70, lo: 1.2, hi: 2.3 }, 20: { opt: 1.5, max: 85, thr: 80, lo: 1.0, hi: 1.9 } },
  "circular-ceiling": { throw: "T0.25 (50 fpm)", 80: { opt: 0.8, max: 76, thr: 70, lo: 0.7, hi: 1.3 }, 60: { opt: 0.8, max: 83, thr: 80, lo: 0.7, hi: 1.2 }, 40: { opt: 0.8, max: 88, thr: 80, lo: 0.5, hi: 1.5 }, 20: { opt: 0.8, max: 93, thr: 80, lo: 0.4, hi: 1.7 } },
  "sill-straight": { throw: "T0.25 (50 fpm)", 80: { opt: 1.7, max: 61, thr: 60, lo: 1.5, hi: 1.7 }, 60: { opt: 1.7, max: 72, thr: 70, lo: 1.4, hi: 1.7 }, 40: { opt: 1.3, max: 86, thr: 80, lo: 1.2, hi: 1.8 }, 20: { opt: 0.9, max: 95, thr: 90, lo: 0.8, hi: 1.3 } },
  "sill-spread": { throw: "T0.25 (50 fpm)", 80: { opt: 0.7, max: 94, thr: 90, lo: 0.6, hi: 1.5 }, 60: { opt: 0.7, max: 94, thr: 80, lo: 0.6, hi: 1.7 }, 40: { opt: 0.7, max: 94, thr: null, lo: null, hi: null }, 20: { opt: 0.7, max: 94, thr: null, lo: null, hi: null } },
  "ceiling-slot": { throw: "T0.5 (100 fpm)", 80: { opt: 0.3, max: 85, thr: 80, lo: 0.3, hi: 0.7 }, 60: { opt: 0.3, max: 88, thr: 80, lo: 0.3, hi: 0.8 }, 40: { opt: 0.3, max: 91, thr: 80, lo: 0.3, hi: 1.1 }, 20: { opt: 0.3, max: 92, thr: 80, lo: 0.3, hi: 1.5 } },
};
const _ADPI_PERFORATED = { throw: "T0.25 (50 fpm)", opt: 2.0, max: 96, thr: 80, lo: 1.0, hi: 3.4 };
const _ADPI_LOADS = [20, 40, 60, 80];

// dims: in { diffuser_type: dimensionless, cooling_load: dimensionless, throw_ft: L, char_length_ft: L } out: { ratio: dimensionless, opt_ratio: dimensionless, max_adpi: dimensionless, threshold: dimensionless, target_throw_ft: L }
export function computeAdpiSelection({ diffuser_type = "circular-ceiling", cooling_load = 40, throw_ft = 0, char_length_ft = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const Tt = Number(throw_ft) || 0;
  const L = Number(char_length_ft) || 0;
  if (!(Tt > 0)) return { error: "Throw must be positive (ft)." };
  if (!(L > 0)) return { error: "Characteristic length must be positive (ft)." };
  let row, throwBasis, load_used;
  if (diffuser_type === "perforated") {
    row = _ADPI_PERFORATED; throwBasis = _ADPI_PERFORATED.throw; load_used = null;
  } else {
    const t = _ADPI_TABLE[diffuser_type];
    if (!t) return { error: "Unknown diffuser type." };
    const load = Number(cooling_load) || 40;
    load_used = _ADPI_LOADS.reduce((a, b) => (Math.abs(b - load) < Math.abs(a - load) ? b : a));
    row = t[load_used]; throwBasis = t.throw;
  }
  const ratio = Tt / L;
  const has_band = row.lo != null && row.hi != null;
  const in_band = has_band && ratio >= row.lo && ratio <= row.hi;
  const target_throw_ft = row.opt * L;
  return {
    ratio, opt_ratio: row.opt, max_adpi: row.max, threshold: row.thr,
    band_lo: row.lo, band_hi: row.hi, has_band, in_band, target_throw_ft,
    throw_basis: throwBasis, load_used,
    note: "ASHRAE Handbook -- Fundamentals Space Air Diffusion, ADPI Selection Guide: the outlet's throw-to-characteristic-length ratio T/L predicts the Air Diffusion Performance Index (the fraction of occupied-zone points inside the draft-comfort envelope). Each outlet type and cooling load has a T/L for maximum ADPI and a band over which ADPI stays above the published threshold; a heavier load caps the achievable ADPI regardless of throw. Enter the manufacturer's isothermal catalog throw to the outlet's terminal velocity (" + throwBasis + " for this type) and the characteristic length L (to the wall or the midplane between outlets, per the ASHRAE footnote, adjusted from the 9 ft tabulated ceiling). Cooling mode only; the light-troffer row, heating, and the noise-criterion selection are separate. A selection aid, not a stamped air-distribution design.",
  };
}
const adpiSelectionExample = { inputs: { diffuser_type: "circular-ceiling", cooling_load: 40, throw_ft: 8, char_length_ft: 10 } };

function _renderAdpiSelection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE Handbook -- Fundamentals, Space Air Diffusion, ADPI Selection Guide (throw per ASHRAE Standard 70, ADPI per Standard 113; the Miller / Nevins Kansas State research). T/L predicts the Air Diffusion Performance Index; each outlet type and cooling load has a max-ADPI T/L and an above-threshold band. Isothermal catalog throw to the outlet's terminal velocity (50 fpm most; 100 fpm ceiling slots). Cooling mode; a selection aid, the manufacturer's data and the design engineer govern.";
  const type = makeSelect("Outlet type", "adpi-type", [
    { value: "high-sidewall", label: "High sidewall grille (T0.25)" },
    { value: "circular-ceiling", label: "Circular ceiling diffuser (T0.25)" },
    { value: "sill-straight", label: "Sill grille, straight vanes (T0.25)" },
    { value: "sill-spread", label: "Sill grille, spread vanes (T0.25)" },
    { value: "ceiling-slot", label: "Ceiling slot diffuser (T0.5)" },
    { value: "perforated", label: "Perforated / louvered ceiling (T0.25)" },
  ]);
  type.select.value = "circular-ceiling";
  const load = makeSelect("Room cooling load (Btu/hr-ft^2)", "adpi-load", [
    { value: "20", label: "20 (light)" }, { value: "40", label: "40" }, { value: "60", label: "60" }, { value: "80", label: "80 (heavy)" },
  ]);
  load.select.value = "40";
  inputRegion.appendChild(type.wrap); inputRegion.appendChild(load.wrap);
  const thr = makeNumber("Catalog isothermal throw T (ft)", "adpi-throw", { step: "any", min: "0" }); thr.input.value = "8";
  const clen = makeNumber("Characteristic length L (ft)", "adpi-l", { step: "any", min: "0" }); clen.input.value = "10";
  for (const f of [thr, clen]) inputRegion.appendChild(f.wrap);
  const oRatio = makeOutputLine(outputRegion, "T/L ratio", "adpi-out-ratio");
  const oOpt = makeOutputLine(outputRegion, "Optimum T/L (max ADPI)", "adpi-out-opt");
  const oAdpi = makeOutputLine(outputRegion, "Achievable ADPI at this load", "adpi-out-adpi");
  const oBand = makeOutputLine(outputRegion, "Comfort band", "adpi-out-band");
  const oTarget = makeOutputLine(outputRegion, "Throw to spec for max ADPI", "adpi-out-target");
  const oNote = makeOutputLine(outputRegion, "Note", "adpi-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() { load.wrap.style.display = type.select.value === "perforated" ? "none" : ""; }
  const update = debounce(() => {
    const r = computeAdpiSelection({ diffuser_type: type.select.value, cooling_load: load.select.value, throw_ft: readNum(thr.input), char_length_ft: readNum(clen.input) });
    if (r.error) { oRatio.textContent = r.error; oOpt.textContent = "-"; oAdpi.textContent = "-"; oBand.textContent = "-"; oTarget.textContent = "-"; oNote.textContent = ""; return; }
    oRatio.textContent = fmt(r.ratio, 2);
    oOpt.textContent = fmt(r.opt_ratio, 2);
    oAdpi.textContent = "up to ADPI " + fmt(r.max_adpi, 0) + (r.max_adpi < 80 ? " (load caps comfort below 80)" : "");
    oBand.textContent = r.has_band
      ? (r.in_band ? "in the band" : "OUTSIDE the band") + " (ADPI > " + fmt(r.threshold, 0) + " for T/L " + fmt(r.band_lo, 1) + " to " + fmt(r.band_hi, 1) + ")"
      : "no band above threshold at this load (optimum only)";
    oTarget.textContent = fmt(r.target_throw_ft, 1) + " ft (T/L " + fmt(r.opt_ratio, 2) + " x L)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { type.select.value = "circular-ceiling"; load.select.value = "40"; thr.input.value = "8"; clen.input.value = "10"; syncFields(); update(); });
  type.select.addEventListener("change", () => { syncFields(); update(); });
  load.select.addEventListener("change", update);
  for (const f of [thr.input, clen.input]) f.addEventListener("input", update);
  syncFields();
}
HVAC_RENDERERS["adpi-diffuser-selection"] = _renderAdpiSelection;

// ===================== spec-v483: vibration isolation efficiency (ASHRAE) =====================

// dims: in { equipment_rpm: dimensionless, static_deflection_in: L } out: { fn_hz: T^-1, fn_cpm: T^-1, disturbing_hz: T^-1, ratio: dimensionless, transmissibility: dimensionless, efficiency_pct: dimensionless }
export function computeVibrationIsolation({ equipment_rpm = 0, static_deflection_in = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const rpm = Number(equipment_rpm) || 0;
  const defl = Number(static_deflection_in) || 0;
  if (!(rpm > 0)) return { error: "Running speed must be positive (rpm)." };
  if (!(defl > 0)) return { error: "Static deflection must be positive (in)." };
  // ASHRAE / Den Hartog single-DOF isolator: fn = (1/2pi) sqrt(g/defl), g = 386.4 in/s^2 -> 3.13/sqrt(defl) Hz.
  const fn_hz = 3.13 / Math.sqrt(defl);
  const fn_cpm = fn_hz * 60;
  const disturbing_hz = rpm / 60;
  const ratio = disturbing_hz / fn_hz;
  const isolating = ratio > Math.SQRT2;
  const transmissibility = 1 / Math.abs(ratio * ratio - 1);
  const efficiency_pct = isolating ? (1 - transmissibility) * 100 : null;
  return {
    fn_hz, fn_cpm, disturbing_hz, ratio, transmissibility, efficiency_pct, isolating,
    note: "ASHRAE Handbook -- Fundamentals, Sound and Vibration: the single-degree-of-freedom vibration isolator. The isolated system's natural frequency fn = 3.13 / sqrt(static deflection in inches) Hz (= (1/2pi) sqrt(g/deflection)); the disturbing frequency is the running speed rpm/60 Hz (the lowest forcing frequency, which isolates worst); the transmissibility T = 1 / |(f/fn)^2 - 1| is the fraction of the shaking force that still reaches the structure, and the isolation efficiency is (1 - T). Isolation requires the frequency ratio to exceed sqrt(2) = 1.414; below that the mount amplifies the vibration (true resonance at a ratio of 1), and the fix is a stiffer isolator (less deflection raises fn). The undamped idealization (damping trims high-frequency isolation slightly but tames the resonant peak). The deflection is the isolator's rated value under the actual load; the equipment unbalance, floor stiffness, seismic restraint, and the isolator selection are the mechanical engineer's. A design aid, not a stamped vibration-isolation design.",
  };
}
const vibrationIsolationExample = { inputs: { equipment_rpm: 900, static_deflection_in: 1 } };

function _renderVibrationIsolation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE Handbook -- Fundamentals, Sound and Vibration (single-DOF isolator). Natural frequency fn = 3.13/sqrt(static deflection in inches) Hz; disturbing frequency = rpm/60; transmissibility T = 1/|(f/fn)^2 - 1|; isolation efficiency = (1 - T). Isolation needs a frequency ratio over sqrt(2) = 1.414, else the mount amplifies (resonance at 1). Undamped idealization; the rated isolator deflection under load governs. A design aid, not a stamped vibration-isolation design.";
  const rpm = makeNumber("Equipment running speed (rpm)", "vib-rpm", { step: "any", min: "0" }); rpm.input.value = "900";
  const defl = makeNumber("Isolator static deflection under load (in)", "vib-defl", { step: "any", min: "0" }); defl.input.value = "1";
  for (const f of [rpm, defl]) inputRegion.appendChild(f.wrap);
  const oFn = makeOutputLine(outputRegion, "System natural frequency", "vib-out-fn");
  const oFd = makeOutputLine(outputRegion, "Disturbing frequency", "vib-out-fd");
  const oR = makeOutputLine(outputRegion, "Frequency ratio f/fn", "vib-out-r");
  const oT = makeOutputLine(outputRegion, "Transmissibility", "vib-out-t");
  const oEff = makeOutputLine(outputRegion, "Isolation efficiency", "vib-out-eff");
  const oNote = makeOutputLine(outputRegion, "Note", "vib-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVibrationIsolation({ equipment_rpm: readNum(rpm.input), static_deflection_in: readNum(defl.input) });
    if (r.error) { oFn.textContent = r.error; oFd.textContent = "-"; oR.textContent = "-"; oT.textContent = "-"; oEff.textContent = "-"; oNote.textContent = ""; return; }
    oFn.textContent = fmt(r.fn_hz, 2) + " Hz (" + fmt(r.fn_cpm, 0) + " cpm)";
    oFd.textContent = fmt(r.disturbing_hz, 2) + " Hz";
    oR.textContent = fmt(r.ratio, 2) + (r.isolating ? " (over sqrt(2): isolating)" : " (under sqrt(2): amplifying)");
    oT.textContent = fmt(r.transmissibility, 3);
    oEff.textContent = r.isolating ? fmt(r.efficiency_pct, 1) + "%" : "none - the mount AMPLIFIES " + fmt(r.transmissibility, 1) + "x (near resonance; use a stiffer isolator)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { rpm.input.value = "900"; defl.input.value = "1"; update(); });
  for (const f of [rpm.input, defl.input]) f.addEventListener("input", update);
}
HVAC_RENDERERS["vibration-isolation"] = _renderVibrationIsolation;

// dims: in { elev_ft: L, T_F: T, acfm: L^3 T^-1, rated_sp: dimensionless } out: { DF: dimensionless, SCFM: L^3 T^-1, const_corr: dimensionless, sp_corr: dimensionless }
export function computeAirDensityCorrection({ elev_ft = 0, T_F = 70, acfm = 0, rated_sp = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const elev = Number(elev_ft) || 0;
  const T = Number(T_F);
  if (!Number.isFinite(T)) return { error: "Enter a valid air temperature (F)." };
  if (!(460 + T > 0)) return { error: "Temperature is below absolute zero." };
  const alt_factor = Math.pow(1 - 6.73e-6 * elev, 5.258);
  if (!Number.isFinite(alt_factor) || alt_factor <= 0) return { error: "Elevation is out of range." };
  const temp_factor = 530 / (460 + T);
  const DF = alt_factor * temp_factor;
  const acfm_v = Number(acfm) || 0;
  const SCFM = acfm_v > 0 ? acfm_v * DF : null;
  const const_corr = 1.08 * DF;
  const sp_v = Number(rated_sp) || 0;
  const sp_corr = sp_v > 0 ? sp_v * DF : null;
  return {
    alt_factor, temp_factor, DF, SCFM, const_corr, sp_corr,
    note: "Air density factor DF vs standard air (0.075 lb/ft^3, 70 F sea level): the altitude factor (1 - 6.73e-6 x elev)^5.258 and the temperature factor 530/(460 + T), multiplied. Thinner air (high altitude or hot air) carries less mass per cfm, so SCFM = ACFM x DF, the sensible constant 1.08 scales to 1.08 x DF, and a sea-level-rated fan delivers rated_sp x DF of static. A 5,000 ft site runs about 16% thinner; 120 F rooftop air is about 9% thinner even at sea level, which is why summer rooftop capacity lags the rating. A correction factor; the fan curve and the equipment ratings at the actual condition govern.",
  };
}
const airDensityCorrectionExample = { inputs: { elev_ft: 5000, T_F: 70, acfm: 1000, rated_sp: 0.5 } };
HVAC_RENDERERS["air-density-correction"] = _rEnv({
  citation: "Citation: Air density correction (ASHRAE Handbook - Fundamentals): altitude factor (1 - 6.73e-6 x elev)^5.258, temperature factor 530/(460 + T_F), density factor DF = their product; SCFM = ACFM x DF, corrected sensible constant 1.08 x DF, delivered fan static = rated x DF. A correction factor; the fan curve and equipment ratings govern.",
  example: airDensityCorrectionExample.inputs,
  fields: [
    { key: "elev_ft", label: "Site elevation (ft)", kind: "number" },
    { key: "T_F", label: "Air temperature (F)", kind: "number", default: 70 },
    { key: "acfm", label: "Actual airflow ACFM (cfm, optional)", kind: "number" },
    { key: "rated_sp", label: "Sea-level rated fan static (in-wc, optional)", kind: "number" },
  ],
  outputs: [
    { key: "df", id: "adc-out-df", label: "Density factor DF", value: (r) => fmt(r.DF, 3) + " (alt " + fmt(r.alt_factor, 3) + " x temp " + fmt(r.temp_factor, 3) + ")" },
    { key: "scfm", id: "adc-out-scfm", label: "Standard airflow SCFM", value: (r) => r.SCFM == null ? "(enter ACFM)" : fmt(r.SCFM, 0) + " scfm" },
    { key: "cc", id: "adc-out-cc", label: "Corrected sensible constant", value: (r) => fmt(r.const_corr, 3) + " (vs 1.08)" },
    { key: "sp", id: "adc-out-sp", label: "Delivered fan static", value: (r) => r.sp_corr == null ? "(enter rated static)" : fmt(r.sp_corr, 3) + " in-wc" },
    { key: "n", id: "adc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirDensityCorrection,
});

// =====================================================================
// spec-v375..v377: psychrometric coil-analysis trio (Group C).
// =====================================================================

// dims: in { t_db_f: T, w_lb_lb: dimensionless } out: { h: L^2 T^-2, h_sensible: L^2 T^-2, h_latent: L^2 T^-2 }
export function computeMoistAirEnthalpy({ t_db_f = 0, w_lb_lb = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const t = Number(t_db_f);
  const w = Number(w_lb_lb);
  if (w < 0) return { error: "Humidity ratio must be non-negative (lb water / lb dry air)." };
  const h_sensible = 0.240 * t;
  const h_latent = w * (1061 + 0.444 * t);
  const h = h_sensible + h_latent;
  return {
    h, h_sensible, h_latent,
    note: "ASHRAE I-P moist-air enthalpy h = 0.240 t + W (1061 + 0.444 t) Btu per lb dry air: 0.240 is the dry-air specific heat, 1061 the latent heat of vaporization at the 0 F datum, 0.444 the water-vapor specific heat. The humidity ratio W (lb water / lb dry air) is the moisture input - pair with outdoor-air-mix or a psychrometric chart to get W from RH. This is the total heat content of one air state; a cooling coil removes the difference between two of these. Sea-level coefficients; a design aid, not a substitute for a measured chart state or equipment ratings.",
  };
}
const moistAirEnthalpyExample = { inputs: { t_db_f: 80, w_lb_lb: 0.0112 } };
HVAC_RENDERERS["moist-air-enthalpy"] = _rEnv({
  citation: "Citation: Moist-air enthalpy (ASHRAE Handbook - Fundamentals): h = 0.240 t + W (1061 + 0.444 t) Btu per lb dry air, with t the dry-bulb (F) and W the humidity ratio (lb water / lb dry air). 0.240 = dry-air specific heat, 1061 = latent heat at the 0 F datum, 0.444 = water-vapor specific heat. Total heat content of one air state; pair with outdoor-air-mix or a psychrometric chart for W. Sea-level coefficients; a design aid, not a substitute for a measured chart state or equipment ratings.",
  example: moistAirEnthalpyExample.inputs,
  fields: [
    { key: "t_db_f", label: "Dry-bulb temperature (F)", kind: "number", default: 80 },
    { key: "w_lb_lb", label: "Humidity ratio W (lb water / lb dry air)", kind: "number", default: 0.0112 },
  ],
  outputs: [
    { key: "h", id: "mae-out-h", label: "Enthalpy h", value: (r) => fmt(r.h, 2) + " Btu/lb dry air" },
    { key: "split", id: "mae-out-split", label: "Sensible + latent", value: (r) => fmt(r.h_sensible, 2) + " + " + fmt(r.h_latent, 2) + " Btu/lb" },
    { key: "n", id: "mae-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMoistAirEnthalpy,
});

// dims: in { cfm: L^3 T^-1, h_ent_btu: L^2 T^-2, h_lvg_btu: L^2 T^-2 } out: { q_btuh: M L^2 T^-3, tons: dimensionless, dh: L^2 T^-2 }
export function computeCoolingCoilTotalLoad({ cfm = 0, h_ent_btu = 0, h_lvg_btu = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  if (!(q > 0)) return { error: "Airflow must be positive (cfm)." };
  const dh = Number(h_ent_btu) - Number(h_lvg_btu);
  const q_btuh = 4.5 * q * dh;
  const tons = q_btuh / 12000;
  return {
    q_btuh, tons, dh,
    heating: dh < 0,
    note: "Total coil load Q = 4.5 x CFM x (h_ent - h_lvg) Btu/hr, where 4.5 = 60 min/hr x 0.075 lb/ft^3 standard air density. This is the whole heat the coil removes - sensible drop plus condensed moisture (latent) - not the dry-bulb-only 1.08 x CFM x deltaT, which misses the latent load. Feed the entering and leaving enthalpies from moist-air-enthalpy. tons = Q / 12000. A leaving enthalpy above entering returns a negative Q (the coil is heating). A design aid; the equipment ratings govern.",
  };
}
const coolingCoilTotalLoadExample = { inputs: { cfm: 2000, h_ent_btu: 31.48, h_lvg_btu: 22.97 } };
HVAC_RENDERERS["cooling-coil-total-load"] = _rEnv({
  citation: "Citation: Cooling-coil total load (ASHRAE Handbook - Fundamentals): Q = 4.5 x CFM x (h_ent - h_lvg) Btu/hr, with 4.5 = 60 x 0.075 (standard air) and enthalpies from moist-air-enthalpy; tons = Q / 12000. Captures the full sensible-plus-latent heat the coil removes, unlike the dry-bulb 1.08 x CFM x deltaT. A leaving enthalpy above entering gives a negative Q (heating). A design aid; equipment ratings govern.",
  example: coolingCoilTotalLoadExample.inputs,
  fields: [
    { key: "cfm", label: "Airflow across the coil (cfm)", kind: "number", default: 2000 },
    { key: "h_ent_btu", label: "Entering-air enthalpy (Btu/lb)", kind: "number", default: 31.48 },
    { key: "h_lvg_btu", label: "Leaving-air enthalpy (Btu/lb)", kind: "number", default: 22.97 },
  ],
  outputs: [
    { key: "q", id: "cctl-out-q", label: "Total coil load", value: (r) => (r.heating ? "heating: " : "") + fmt(r.q_btuh, 0) + " Btu/hr" },
    { key: "tons", id: "cctl-out-tons", label: "Tons", value: (r) => fmt(r.tons, 2) + " tons (dh = " + fmt(r.dh, 2) + " Btu/lb)" },
    { key: "n", id: "cctl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoolingCoilTotalLoad,
});

// dims: in { t_ent_f: T, t_lvg_f: T, t_adp_f: T } out: { bf: dimensionless, cf: dimensionless }
export function computeCoilBypassFactor({ t_ent_f = 0, t_lvg_f = 0, t_adp_f = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const te = Number(t_ent_f);
  const tl = Number(t_lvg_f);
  const ta = Number(t_adp_f);
  if (!(te > ta)) return { error: "Entering dry-bulb must be above the apparatus dew point." };
  const bf = (tl - ta) / (te - ta);
  if (!(bf >= 0 && bf <= 1)) return { error: "Leaving temperature must be between the apparatus dew point and the entering temperature (bypass factor outside [0,1])." };
  const cf = 1 - bf;
  return {
    bf, cf,
    note: "Bypass factor BF = (t_lvg - t_adp) / (t_ent - t_adp), contact factor CF = 1 - BF, where the apparatus dew point (ADP) is the effective coil-surface temperature the air is driven toward. BF is the fraction of air that slips past the coil unconditioned; a lower BF (deeper, slower coil) contacts more air and dehumidifies better. Leaving air cannot be colder than the ADP or warmer than entering. A design aid; the coil rating and ADP selection govern.",
  };
}
const coilBypassFactorExample = { inputs: { t_ent_f: 80, t_lvg_f: 55, t_adp_f: 50 } };
HVAC_RENDERERS["coil-bypass-factor"] = _rEnv({
  citation: "Citation: Coil bypass / contact factor (ASHRAE Handbook - Fundamentals): BF = (t_lvg - t_adp) / (t_ent - t_adp), CF = 1 - BF, with the apparatus dew point (ADP) the effective coil-surface temperature. BF is the fraction of air bypassing the coil unconditioned; a lower BF dehumidifies better. Leaving air lies between the ADP and the entering temperature. A design aid; the coil rating governs.",
  example: coilBypassFactorExample.inputs,
  fields: [
    { key: "t_ent_f", label: "Entering-air dry-bulb (F)", kind: "number", default: 80 },
    { key: "t_lvg_f", label: "Leaving-air dry-bulb (F)", kind: "number", default: 55 },
    { key: "t_adp_f", label: "Apparatus dew point ADP (F)", kind: "number", default: 50 },
  ],
  outputs: [
    { key: "bf", id: "cbf-out-bf", label: "Bypass factor BF", value: (r) => fmt(r.bf, 3) },
    { key: "cf", id: "cbf-out-cf", label: "Contact factor CF", value: (r) => fmt(r.cf, 3) },
    { key: "n", id: "cbf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoilBypassFactor,
});

// ===================== spec-v384: fan affinity laws (HVAC airflow field-methods trio) =====================

// dims: in { q1_cfm: L^3 T^-1, sp1_inwg: dimensionless, bhp1_hp: dimensionless, n1: T^-1, n2: T^-1 } out: { r: dimensionless, q2_cfm: L^3 T^-1, sp2_inwg: dimensionless, bhp2_hp: dimensionless }
export function computeFanAffinityLaws({ q1_cfm = 0, sp1_inwg = 0, bhp1_hp = 0, n1 = 0, n2 = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const N1 = Number(n1) || 0, N2 = Number(n2) || 0;
  if (!(N1 > 0)) return { error: "Baseline speed N1 must be positive (rpm)." };
  if (!(N2 > 0)) return { error: "New speed N2 must be positive (rpm)." };
  const r = N2 / N1;
  const q2_cfm = (Number(q1_cfm) || 0) * r;
  const sp2_inwg = (Number(sp1_inwg) || 0) * r * r;
  const bhp2_hp = (Number(bhp1_hp) || 0) * r * r * r;
  return {
    r, q2_cfm, sp2_inwg, bhp2_hp,
    note: "Fan affinity laws for a fixed fan changing speed: airflow scales with speed (Q2 = Q1 r), static pressure with the square (SP2 = SP1 r^2), and brake horsepower with the cube (BHP2 = BHP1 r^3), where r = N2/N1. The cube law is why a small speed cut saves large power (a 25% slowdown cuts power ~58%), the core of VFD energy savings. Valid for the same fan on its system curve; it does not account for motor/drive efficiency shifts, belt losses, or a changed system curve. A field aid; the fan curve and equipment ratings govern.",
  };
}
const fanAffinityLawsExample = { inputs: { q1_cfm: 10000, sp1_inwg: 1.0, bhp1_hp: 5.0, n1: 900, n2: 1200 } };
HVAC_RENDERERS["fan-affinity-laws"] = _rEnv({
  citation: "Citation: Fan affinity laws (AMCA / ASHRAE Handbook - Fundamentals) for a fixed fan at a changed speed: Q2 = Q1 (N2/N1), SP2 = SP1 (N2/N1)^2, BHP2 = BHP1 (N2/N1)^3. The cube-law power relation is the basis of VFD energy savings. Valid for the same fan on the same system curve; it does not capture motor/drive efficiency changes or a shifted system curve. A field aid; the fan curve and equipment ratings govern.",
  example: fanAffinityLawsExample.inputs,
  fields: [
    { key: "q1_cfm", label: "Baseline airflow Q1 (cfm)", kind: "number", default: 10000 },
    { key: "sp1_inwg", label: "Baseline static pressure SP1 (in wg)", kind: "number", default: 1.0 },
    { key: "bhp1_hp", label: "Baseline brake horsepower BHP1 (hp)", kind: "number", default: 5.0 },
    { key: "n1", label: "Baseline speed N1 (rpm)", kind: "number", default: 900 },
    { key: "n2", label: "New speed N2 (rpm)", kind: "number", default: 1200 },
  ],
  outputs: [
    { key: "r", id: "fal-out-r", label: "Speed ratio r = N2/N1", value: (r) => fmt(r.r, 4) },
    { key: "q", id: "fal-out-q", label: "New airflow Q2 = Q1 r", value: (r) => fmt(r.q2_cfm, 0) + " cfm" },
    { key: "sp", id: "fal-out-sp", label: "New static SP2 = SP1 r^2", value: (r) => fmt(r.sp2_inwg, 2) + " in wg" },
    { key: "bhp", id: "fal-out-bhp", label: "New power BHP2 = BHP1 r^3", value: (r) => fmt(r.bhp2_hp, 2) + " hp" },
    { key: "n", id: "fal-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFanAffinityLaws,
});

// ===================== spec-v387: Darcy friction factor (water-system hydraulics trio) =====================

// dims: in { reynolds: dimensionless, rel_roughness: dimensionless } out: { f: dimensionless }
export function computeColebrookFrictionFactor({ reynolds = 0, rel_roughness = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const re = Number(reynolds) || 0;
  const rr = Number(rel_roughness) || 0;
  if (!(re > 0)) return { error: "Reynolds number must be positive." };
  if (rr < 0) return { error: "Relative roughness must be non-negative." };
  const laminar = re < 2300;
  const transitional = re >= 2300 && re <= 4000;
  const f = laminar ? 64 / re : 0.25 / Math.pow(Math.log10(rr / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
  const regime = laminar ? "laminar (f = 64/Re)" : transitional ? "transitional (2300-4000; f is indeterminate, estimate shown)" : "turbulent (Swamee-Jain)";
  return {
    f, regime, laminar, transitional,
    note: "Darcy-Weisbach friction factor f: laminar (Re < 2300) is exactly 64/Re, independent of roughness; turbulent uses the Swamee-Jain explicit fit to the Colebrook equation, f = 0.25 / [log10(eps/D / 3.7 + 5.74 / Re^0.9)]^2, within ~1% of Moody-chart values for 5000 < Re < 1e8 and eps/D < 0.05. The 2300-4000 transition band is physically indeterminate; the turbulent estimate is flagged there. Feeds the head-loss h = f (L/D) V^2/(2g). A design aid; the system analysis governs.",
  };
}
const colebrookFrictionFactorExample = { inputs: { reynolds: 100000, rel_roughness: 0.0003 } };
HVAC_RENDERERS["colebrook-friction-factor"] = _rEnv({
  citation: "Citation: Darcy friction factor -- laminar f = 64/Re, and the Swamee-Jain (1976) explicit approximation to the Colebrook-White equation f = 0.25 / [log10(eps/D / 3.7 + 5.74 / Re^0.9)]^2 for turbulent flow (within ~1% of the Colebrook/Moody value over 5000 < Re < 1e8, eps/D <= 0.05). The 2300-4000 transition is indeterminate. Feeds the Darcy-Weisbach head loss h = f (L/D) V^2/(2g). A design aid; the system analysis governs.",
  example: colebrookFrictionFactorExample.inputs,
  fields: [
    { key: "reynolds", label: "Reynolds number Re", kind: "number", default: 100000 },
    { key: "rel_roughness", label: "Relative roughness eps/D", kind: "number", default: 0.0003 },
  ],
  outputs: [
    { key: "f", id: "cff-out-f", label: "Darcy friction factor f", value: (r) => fmt(r.f, 4) },
    { key: "reg", id: "cff-out-reg", label: "Flow regime", value: (r) => r.regime },
    { key: "n", id: "cff-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeColebrookFrictionFactor,
});

// ===================== spec-v408: Manual D friction rate (HVAC duct-design trio) =====================

// dims: in { blower_esp_inwg: dimensionless, component_drop_inwg: dimensionless, tel_ft: L } out: { asp_inwg: dimensionless, fr_inwg_100ft: dimensionless }
export function computeManualDFrictionRate({ blower_esp_inwg = 0, component_drop_inwg = 0, tel_ft = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const esp = Number(blower_esp_inwg) || 0;
  const drops = Number(component_drop_inwg) || 0;
  const tel = Number(tel_ft) || 0;
  if (!(esp > 0)) return { error: "Blower external static pressure must be positive (in wg)." };
  if (drops < 0) return { error: "Component pressure drops must be non-negative (in wg)." };
  if (!(tel > 0)) return { error: "Total effective length must be positive (ft)." };
  const asp_inwg = esp - drops;
  if (!(asp_inwg > 0)) return { error: "Component drops meet or exceed the blower static -- no available static for the ducts (unworkable; reduce drops or pick a stronger blower)." };
  const fr_inwg_100ft = asp_inwg * 100 / tel;
  return {
    asp_inwg, fr_inwg_100ft,
    note: "ACCA Manual D friction rate: the available static pressure ASP = blower rated external static at design CFM - the sum of component drops (coil, filter, registers/grilles, dampers, balancing), and the design friction rate FR = ASP x 100 / total effective length (in wg per 100 ft). The TEL is the longest supply-plus-return path including the equivalent lengths of the fittings, not the physical run. A typical FR target is 0.06-0.10; a lower rate needs larger ducts. A design aid; a full Manual D duct layout governs.",
  };
}
const manualDFrictionRateExample = { inputs: { blower_esp_inwg: 0.60, component_drop_inwg: 0.42, tel_ft: 180 } };
HVAC_RENDERERS["manual-d-friction-rate"] = _rEnv({
  citation: "Citation: ACCA Manual D friction rate: available static pressure ASP = blower rated ESP - total component drops, design friction rate FR = ASP x 100 / total effective length (in wg per 100 ft). The TEL includes the fitting equivalent lengths, not just the physical run. A design aid; the full Manual D layout governs.",
  example: manualDFrictionRateExample.inputs,
  fields: [
    { key: "blower_esp_inwg", label: "Blower rated ESP at design CFM (in wg)", kind: "number", default: 0.60 },
    { key: "component_drop_inwg", label: "Total component drops (in wg)", kind: "number", default: 0.42 },
    { key: "tel_ft", label: "Total effective length (ft)", kind: "number", default: 180 },
  ],
  outputs: [
    { key: "asp", id: "mdf-out-asp", label: "Available static pressure", value: (r) => fmt(r.asp_inwg, 2) + " in wg" },
    { key: "fr", id: "mdf-out-fr", label: "Design friction rate", value: (r) => fmt(r.fr_inwg_100ft, 3) + " in wg/100 ft" },
    { key: "n", id: "mdf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeManualDFrictionRate,
});

// ===================== spec-v441..v443: HVAC energy-recovery / hydronic / economizer trio (Group C) =====================

// dims: in { cfm: L^3 T^-1, effectiveness: dimensionless, h_outdoor: L^2 T^-2, h_return: L^2 T^-2 } out: { q_total_btuh: M L^2 T^-3, h_supply: L^2 T^-2 }
export function computeErvTotalEnthalpyRecovery({ cfm = 0, effectiveness = 0, h_outdoor = 0, h_return = 0 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  const eff = Number(effectiveness) || 0;
  const hoa = Number(h_outdoor);
  const hra = Number(h_return);
  if (!(q > 0)) return { error: "Ventilation airflow must be positive (cfm)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Effectiveness must be between 0 and 1." };
  if (!Number.isFinite(hoa) || !Number.isFinite(hra)) return { error: "Enter valid enthalpies (Btu/lb)." };
  const q_total_btuh = 4.5 * q * eff * (hoa - hra);
  const h_supply = hoa - eff * (hoa - hra);
  return {
    q_total_btuh, h_supply, cooling: q_total_btuh > 0,
    note: "ERV total (enthalpy) recovery: Q = 4.5 x CFM x effectiveness x (h_outdoor - h_return) Btu/hr, and the air leaving the wheel toward the space is h_supply = h_outdoor - effectiveness x (h_outdoor - h_return). In summer the outdoor air is more energetic than the return, so the wheel pre-cools and dries the incoming air (a positive Q, a cooling recovery that offloads the coil); in winter it pre-warms and humidifies it (a negative Q, a heating recovery). The effectiveness is the wheel's total-energy rating at the design airflow. Feed the two enthalpies from moist-air-enthalpy. A design aid; the ERV manufacturer's rated effectiveness governs.",
  };
}
const ervTotalEnthalpyRecoveryExample = { inputs: { cfm: 1000, effectiveness: 0.75, h_outdoor: 38, h_return: 28 } };
HVAC_RENDERERS["erv-total-enthalpy-recovery"] = _rEnv({
  citation: "Citation: ERV total (enthalpy) recovery (ASHRAE Handbook - Fundamentals / AHRI 1060): Q = 4.5 x CFM x effectiveness x (h_outdoor - h_return) Btu/hr, supply enthalpy = h_outdoor - effectiveness x (h_outdoor - h_return). Positive Q is a summer cooling recovery, negative a winter heating recovery. A design aid; the ERV's rated effectiveness governs.",
  example: ervTotalEnthalpyRecoveryExample.inputs,
  fields: [
    { key: "cfm", label: "Ventilation airflow through the ERV (cfm)", kind: "number", default: 1000 },
    { key: "effectiveness", label: "Enthalpy (total-energy) effectiveness (0-1)", kind: "number", default: 0.75 },
    { key: "h_outdoor", label: "Outdoor-air enthalpy (Btu/lb)", kind: "number", default: 38 },
    { key: "h_return", label: "Return/exhaust-air enthalpy (Btu/lb)", kind: "number", default: 28 },
  ],
  outputs: [
    { key: "q", id: "erv-out-q", label: "Total energy recovered", value: (r) => (r.cooling ? "" : "heating: ") + fmt(Math.abs(r.q_total_btuh), 0) + " Btu/hr" + (r.cooling ? " (cooling recovery)" : "") },
    { key: "h", id: "erv-out-h", label: "Supply-air enthalpy leaving the wheel", value: (r) => fmt(r.h_supply, 2) + " Btu/lb" },
    { key: "n", id: "erv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeErvTotalEnthalpyRecovery,
});

// dims: in { mode: dimensionless, t_surface_f: T, t_room_f: T, q_target: M T^-3 } out: { q_btuh_ft2: M T^-3, t_surface_out_f: T }
export function computeRadiantFloorOutput({ mode = "surface_to_q", t_surface_f = 0, t_room_f = 70, q_target = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const room = Number(t_room_f);
  if (!Number.isFinite(room)) return { error: "Enter a valid room temperature (F)." };
  if (mode === "q_to_surface") {
    const q = Number(q_target) || 0;
    if (!(q > 0)) return { error: "Target output must be positive (Btu/hr-ft^2)." };
    const t_surface_out_f = room + Math.pow(q / 2, 1 / 1.1);
    return {
      mode, q_btuh_ft2: q, t_surface_out_f, comfort_ok: t_surface_out_f <= 85,
      note: "Radiant floor heat output (the standard q = 2 x (T_surface - T_room)^1.1 Btu/hr-ft^2 relation): here solved inverse for the mean floor surface temperature that delivers the target output. The 85 F comfort limit caps the output at about 39 Btu/hr-ft^2 for a 70 F room; a higher load needs supplemental heat or a warmer design condition, not a hotter floor. The output scales with the surface-to-room difference, set by the water temperature, tube spacing, and floor covering resistance (see radiant-loop-sizing for the tubing). A design aid; the panel manufacturer's ratings govern.",
    };
  }
  const surf = Number(t_surface_f);
  if (!Number.isFinite(surf)) return { error: "Enter a valid surface temperature (F)." };
  if (!(surf > room)) return { error: "Surface temperature must be above the room temperature." };
  const q_btuh_ft2 = 2 * Math.pow(surf - room, 1.1);
  return {
    mode, q_btuh_ft2, t_surface_out_f: surf, comfort_ok: surf <= 85,
    note: "Radiant floor heat output: q = 2 x (T_surface - T_room)^1.1 Btu/hr-ft^2, the combined convective-plus-radiant output of a warm floor. Comfort caps the mean surface temperature at about 85 F (a warmer floor is uncomfortable underfoot), which limits the output to roughly 39 Btu/hr-ft^2 in a 70 F room; a higher load needs more floor area or supplemental heat. The surface temperature follows from the water temperature, tube spacing, and floor covering (see radiant-loop-sizing). A design aid; the panel manufacturer's ratings govern.",
  };
}
export const radiantFloorOutputExample = { inputs: { mode: "surface_to_q", t_surface_f: 85, t_room_f: 70, q_target: 0 } };
function _v442renderRadiantFloorOutput(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Radiant floor heat output q = 2 x (T_surface - T_room)^1.1 Btu/hr-ft^2 (ASHRAE / radiant-panel practice), with the ~85 F mean-surface comfort limit (~39 Btu/hr-ft^2 in a 70 F room). A design aid; the panel manufacturer's ratings govern.";
  const mode = makeSelect("Solve for", "rfo-mode", [
    { value: "surface_to_q", label: "Output from a surface temperature" },
    { value: "q_to_surface", label: "Surface temperature for a target output" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const surf = makeNumber("Floor mean surface temperature (F)", "rfo-surf", { step: "any" }); surf.input.value = "85";
  const room = makeNumber("Room air temperature (F)", "rfo-room", { step: "any" }); room.input.value = "70";
  const qt = makeNumber("Target output (Btu/hr-ft^2)", "rfo-qt", { step: "any", min: "0" }); qt.input.value = "30";
  for (const f of [surf, room, qt]) inputRegion.appendChild(f.wrap);
  const oQ = makeOutputLine(outputRegion, "Heat output", "rfo-out-q");
  const oS = makeOutputLine(outputRegion, "Mean surface temperature", "rfo-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "rfo-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function sync() { const inv = mode.select.value === "q_to_surface"; surf.wrap.style.display = inv ? "none" : ""; qt.wrap.style.display = inv ? "" : "none"; }
  const update = debounce(() => {
    const r = computeRadiantFloorOutput({ mode: mode.select.value, t_surface_f: readNum(surf.input), t_room_f: readNum(room.input), q_target: readNum(qt.input) });
    if (r.error) { oQ.textContent = r.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.q_btuh_ft2, 1) + " Btu/hr-ft^2";
    oS.textContent = fmt(r.t_surface_out_f, 1) + " F" + (r.comfort_ok ? " (within 85 F comfort limit)" : " -- OVER the 85 F comfort limit");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "surface_to_q"; surf.input.value = "85"; room.input.value = "70"; qt.input.value = "30"; sync(); update(); });
  mode.select.addEventListener("change", () => { sync(); update(); });
  for (const f of [surf, room, qt]) f.input.addEventListener("input", update);
  sync();
}
HVAC_RENDERERS["radiant-floor-output"] = _v442renderRadiantFloorOutput;

// ----- spec-v478: Hydronic Snowmelt Surface Load and Boiler Sizing (ASHRAE / Chapman) -----

// dims: in { s_inhr: L T^-1, t_air_f: T, wind_mph: L T^-1, rh_pct: dimensionless, ar: dimensionless, area_ft2: L^2, back_loss_pct: dimensionless } out: { p_av_inhg: M L^-1 T^-2, q_s: M T^-3, q_m: M T^-3, q_h: M T^-3, q_e: M T^-3, q_o: M T^-3, boiler_btu_hr: M L^2 T^-3, t_m_f: T }
export function computeSnowmeltLoad({ s_inhr = 0, t_air_f = 0, wind_mph = 0, rh_pct = 0, ar = 0.5, area_ft2 = 0, back_loss_pct = 20 } = {}) {
  const _g = _finiteGuardEnv(arguments[0]); if (_g) return _g;
  const TF = 33; // melting film temperature, F (Chapman / ASHRAE)
  if (!(s_inhr > 0)) return { error: "Design snowfall rate must be positive (in/hr water equivalent)." };
  if (!(t_air_f <= TF)) return { error: "Design air temperature must be at or below the 33 F melting film (the correlation is for snowfall conditions)." };
  if (!(rh_pct >= 0 && rh_pct <= 100)) return { error: "Relative humidity must be 0 to 100 percent." };
  if (wind_mph < 0) return { error: "Wind speed cannot be negative (mph)." };
  if (!(ar >= 0 && ar <= 1)) return { error: "Snow-free area ratio must be 0 to 1 (0 Class I, 0.5 Class II, 1 Class III)." };
  if (!(area_ft2 > 0)) return { error: "Heated slab area must be positive (ft^2)." };
  if (!(back_loss_pct >= 0 && back_loss_pct < 100)) return { error: "Back and edge losses must be 0 to 99 percent." };
  // Ambient vapor pressure from the Magnus saturation curve (hPa -> in Hg), times RH.
  const tc = (t_air_f - 32) / 1.8;
  const es_hpa = 6.1094 * Math.exp((17.625 * tc) / (tc + 243.04));
  const p_av_inhg = (rh_pct / 100) * es_hpa * 0.02953;
  const wind_fn = 0.0201 * wind_mph + 0.055;
  const q_s = 2.6 * s_inhr * (TF - t_air_f);
  const q_m = 746 * s_inhr;
  const q_h = 11.4 * wind_fn * (TF - t_air_f);
  // h_fg = 1075.5 Btu/lb at the 33 F film (steam table); 0.188 in Hg = saturation at the film.
  const q_e = 1075.5 * wind_fn * Math.max(0, 0.188 - p_av_inhg);
  const q_o = q_s + q_m + ar * (q_h + q_e);
  const boiler_btu_hr = q_o * area_ft2 * (1 + back_loss_pct / 100);
  const t_m_f = 0.5 * q_o + TF;
  return { p_av_inhg, q_s, q_m, q_h, q_e, q_o, boiler_btu_hr, mbh: boiler_btu_hr / 1000, t_m_f };
}
export const snowmeltLoadExample = { inputs: { s_inhr: 0.1, t_air_f: 20, wind_mph: 10, rh_pct: 80, ar: 0.5, area_ft2: 500, back_loss_pct: 20 } };
HVAC_RENDERERS["snowmelt-load"] = _rEnv({
  citation: "Citation: ASHRAE Handbook (HVAC Applications, Snow Melting and Freeze Protection) steady-state surface flux q_o = q_s + q_m + A_r(q_h + q_e), with the Chapman (1956) IP component forms as printed in Lund, Pavement Snow Melting (Geo-Heat Center): q_s = 2.6 s (33 - t_a); q_m = 746 s; q_h = 11.4 (0.0201 V + 0.055)(33 - t_a); q_e = h_fg (0.0201 V + 0.055)(0.188 - p_av) with h_fg = 1075.5 Btu/lb at the 33 F film (steam table) and p_av from the Magnus curve times RH. A_r: 0 Class I residential, 0.5 Class II commercial, 1 Class III critical. Boiler = q_o x area x (1 + back loss), ~20% typical for an insulated slab back. Mean fluid roughly 0.5 q_o + 33 F (Chapman rule of thumb). A steady-state design flux for the chosen storm, not an annual energy; controls, idling, and glycol design follow the manufacturer's manual. A sizing aid, not a stamped hydronic design.",
  example: snowmeltLoadExample.inputs,
  fields: [
    { key: "s_inhr", label: "Snowfall rate, water equiv (in/hr)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "t_air_f", label: "Design air temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "wind_mph", label: "Design wind speed (mph)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "rh_pct", label: "Relative humidity (%)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "ar", label: "Snow-free area ratio A_r (0 / 0.5 / 1)", kind: "number", default: 0.5, attrs: { step: "any", min: "0" } },
    { key: "area_ft2", label: "Heated slab area (ft^2)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "back_loss_pct", label: "Back + edge losses (%)", kind: "number", default: 20, attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "qo", id: "sml-out-qo", label: "Design surface flux q_o", value: (r) => fmt(r.q_o, 1) + " Btu/hr-ft^2" },
    { key: "cp", id: "sml-out-cp", label: "Components qs / qm / qh / qe", value: (r) => fmt(r.q_s, 1) + " / " + fmt(r.q_m, 1) + " / " + fmt(r.q_h, 1) + " / " + fmt(r.q_e, 1) },
    { key: "bl", id: "sml-out-bl", label: "Boiler output (with back loss)", value: (r) => fmt(r.boiler_btu_hr, 0) + " Btu/hr (" + fmt(r.mbh, 1) + " MBH)" },
    { key: "tm", id: "sml-out-tm", label: "Mean fluid temp (rule of thumb)", value: (r) => fmt(r.t_m_f, 0) + " F" },
  ],
  compute: computeSnowmeltLoad,
});

// dims: in { mode: dimensionless, h_outdoor: L^2 T^-2, h_return: L^2 T^-2, t_outdoor_f: T, setpoint_f: T } out: { enable: dimensionless, margin: dimensionless }
export function computeEconomizerEnthalpyChangeover({ mode = "differential_enthalpy", h_outdoor = 0, h_return = 0, t_outdoor_f = 0, setpoint_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (mode === "fixed_drybulb") {
    const toa = Number(t_outdoor_f);
    const sp = Number(setpoint_f);
    if (!Number.isFinite(toa) || !Number.isFinite(sp)) return { error: "Enter valid temperatures (F)." };
    const enable = toa < sp;
    return {
      mode, enable, margin: sp - toa, unit: "F",
      note: "Fixed-dry-bulb economizer high-limit: enable free cooling when the outdoor dry-bulb is below the setpoint (commonly 65-75 F by climate zone, ASHRAE 90.1 Table 6.5.1.1.3), lock out above it. Simple and reliable but it ignores humidity, so in a humid climate it can bring in muggy air that the coil must then dehumidify. The differential-enthalpy mode is the more accurate high-limit where latent load matters. A control aid; the ASHRAE 90.1 high-limit for the climate zone and the equipment sequence govern.",
    };
  }
  const hoa = Number(h_outdoor);
  const hra = Number(h_return);
  if (!Number.isFinite(hoa) || !Number.isFinite(hra)) return { error: "Enter valid enthalpies (Btu/lb)." };
  const enable = hoa < hra;
  return {
    mode, enable, margin: hra - hoa, unit: "Btu/lb",
    note: "Differential-enthalpy economizer high-limit: enable free cooling when the outdoor-air total heat content (enthalpy) is below the return-air enthalpy, lock out above it. Unlike a dry-bulb changeover this accounts for the latent (moisture) load, so a cool but humid outdoor condition that carries more total energy than the return correctly locks the economizer out - bringing that air in would add a dehumidification load. Feed the enthalpies from moist-air-enthalpy. A control aid; the ASHRAE 90.1 high-limit and the equipment sequence govern.",
  };
}
export const economizerEnthalpyChangeoverExample = { inputs: { mode: "differential_enthalpy", h_outdoor: 24, h_return: 28, t_outdoor_f: 70, setpoint_f: 65 } };
function _v443renderEconomizerEnthalpyChangeover(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Economizer high-limit changeover (ASHRAE 90.1 6.5.1.1.3): differential-enthalpy enables free cooling when outdoor enthalpy < return enthalpy (accounts for latent load); fixed-dry-bulb enables below a dry-bulb setpoint. A control aid; the 90.1 high-limit for the climate zone and the equipment sequence govern.";
  const mode = makeSelect("Changeover type", "eco-mode", [
    { value: "differential_enthalpy", label: "Differential enthalpy (accounts for humidity)" },
    { value: "fixed_drybulb", label: "Fixed dry-bulb setpoint" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const hoa = makeNumber("Outdoor-air enthalpy (Btu/lb)", "eco-hoa", { step: "any" }); hoa.input.value = "24";
  const hra = makeNumber("Return-air enthalpy (Btu/lb)", "eco-hra", { step: "any" }); hra.input.value = "28";
  const toa = makeNumber("Outdoor dry-bulb (F)", "eco-toa", { step: "any" }); toa.input.value = "70";
  const sp = makeNumber("Fixed high-limit setpoint (F)", "eco-sp", { step: "any" }); sp.input.value = "65";
  for (const f of [hoa, hra, toa, sp]) inputRegion.appendChild(f.wrap);
  const oE = makeOutputLine(outputRegion, "Economizer", "eco-out-e");
  const oM = makeOutputLine(outputRegion, "Margin to changeover", "eco-out-m");
  const oNote = makeOutputLine(outputRegion, "Note", "eco-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function sync() { const en = mode.select.value === "differential_enthalpy"; hoa.wrap.style.display = en ? "" : "none"; hra.wrap.style.display = en ? "" : "none"; toa.wrap.style.display = en ? "none" : ""; sp.wrap.style.display = en ? "none" : ""; }
  const update = debounce(() => {
    const r = computeEconomizerEnthalpyChangeover({ mode: mode.select.value, h_outdoor: readNum(hoa.input), h_return: readNum(hra.input), t_outdoor_f: readNum(toa.input), setpoint_f: readNum(sp.input) });
    if (r.error) { oE.textContent = r.error; oM.textContent = "-"; oNote.textContent = ""; return; }
    oE.textContent = r.enable ? "ENABLE free cooling" : "LOCK OUT (mechanical cooling)";
    oM.textContent = (r.margin >= 0 ? "+" : "") + fmt(r.margin, 1) + " " + r.unit + (r.enable ? " below the limit" : " over the limit");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "differential_enthalpy"; hoa.input.value = "24"; hra.input.value = "28"; toa.input.value = "70"; sp.input.value = "65"; sync(); update(); });
  mode.select.addEventListener("change", () => { sync(); update(); });
  for (const f of [hoa, hra, toa, sp]) f.input.addEventListener("input", update);
  sync();
}
HVAC_RENDERERS["economizer-enthalpy-changeover"] = _v443renderEconomizerEnthalpyChangeover;
