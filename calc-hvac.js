// Group C: HVAC calculators (utilities 21 through 31).
//
// Manual J cooling and heating estimators (utilities 21 and 22) are
// simplified and run in a Web Worker. Every Manual J view carries the
// inline notice that the result is a simplified estimate and that a
// code-compliant load calculation requires Manual J.

import {
  darcyWeisbachFrictionLoss,
  interpolateRefrigerant,
  psychrometric,
  saturationVaporPressure_hPa,
  F_to_C,
} from "./pure-math.js";

// --- Bundled refrigerant P-T data (manufacturer-published, attributed) ---

export const REFRIGERANTS = {
  "R-410A": {
    manufacturer: "Chemours / Honeywell published bulletins",
    pt_pairs: [
      { pressure_psig: 50, temperature_F: 14 },
      { pressure_psig: 75, temperature_F: 31 },
      { pressure_psig: 100, temperature_F: 30 },
      { pressure_psig: 118, temperature_F: 40 },
      { pressure_psig: 156, temperature_F: 55 },
      { pressure_psig: 200, temperature_F: 70 },
      { pressure_psig: 251, temperature_F: 85 },
      { pressure_psig: 313, temperature_F: 100 },
      { pressure_psig: 386, temperature_F: 115 },
    ],
  },
  "R-32": {
    manufacturer: "Daikin / Honeywell published bulletins",
    pt_pairs: [
      { pressure_psig: 50, temperature_F: 8 },
      { pressure_psig: 100, temperature_F: 36 },
      { pressure_psig: 150, temperature_F: 56 },
      { pressure_psig: 200, temperature_F: 72 },
      { pressure_psig: 300, temperature_F: 100 },
    ],
  },
  "R-22": {
    manufacturer: "Legacy data; Chemours bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 5 },
      { pressure_psig: 50, temperature_F: 28 },
      { pressure_psig: 75, temperature_F: 45 },
      { pressure_psig: 100, temperature_F: 60 },
      { pressure_psig: 150, temperature_F: 84 },
      { pressure_psig: 200, temperature_F: 102 },
    ],
  },
  "R-134a": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 10, temperature_F: 16 },
      { pressure_psig: 30, temperature_F: 35 },
      { pressure_psig: 50, temperature_F: 50 },
      { pressure_psig: 100, temperature_F: 79 },
      { pressure_psig: 150, temperature_F: 104 },
    ],
  },
  "R-404A": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 16 },
      { pressure_psig: 60, temperature_F: 14 },
      { pressure_psig: 100, temperature_F: 37 },
      { pressure_psig: 150, temperature_F: 58 },
      { pressure_psig: 200, temperature_F: 75 },
    ],
  },
  "R-407C": {
    manufacturer: "Chemours / Honeywell bulletins",
    pt_pairs: [
      { pressure_psig: 30, temperature_F: 6 },
      { pressure_psig: 60, temperature_F: 22 },
      { pressure_psig: 100, temperature_F: 47 },
      { pressure_psig: 150, temperature_F: 68 },
      { pressure_psig: 200, temperature_F: 86 },
    ],
  },
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
  return {
    conductive_BTU_hr,
    infiltration_BTU_hr,
    total_BTU_hr,
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

export function computeDuctSize({ cfm, friction_in_wc_per_100ft = 0.08, roughness_ft = DUCT_ROUGHNESS_FT }) {
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

  return {
    round_diameter_in: d_in,
    velocity_fpm: (cfm / (Math.PI * (d_in / 12 / 2) ** 2)),
    equivalent_square_in: square_in,
  };
}

export const ductSizingExample = {
  inputs: { cfm: 400, friction_in_wc_per_100ft: 0.08 },
  expectedRange: { round_diameter_in: { min: 8, max: 14 } },
};

// --- Utility 24: Static Pressure (HVAC) ---

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

// --- Utility 25: Refrigerant P-T Chart ---

export function computeRefrigerantPT({ refrigerant, pressure_psig = null, temperature_F = null }) {
  const r = REFRIGERANTS[refrigerant];
  if (!r) return { error: "Unknown refrigerant." };
  if (pressure_psig === null && temperature_F === null) return { error: "Provide pressure or temperature." };
  const value = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig, temperature_F });
  if (pressure_psig !== null) return { saturated_temperature_F: value, manufacturer: r.manufacturer };
  return { saturated_pressure_psig: value, manufacturer: r.manufacturer };
}

export const refrigerantPTExample = {
  inputs: { refrigerant: "R-410A", pressure_psig: 118 },
  expected: { saturated_temperature_F: 40 },
};

// --- Utility 26: Superheat and Subcool ---

export function computeSuperheatSubcool({ refrigerant, system_pressure_psig, line_temperature_F, mode }) {
  const r = REFRIGERANTS[refrigerant];
  if (!r) return { error: "Unknown refrigerant." };
  const sat_T = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig: system_pressure_psig });
  if (mode === "superheat") return { saturated_temperature_F: sat_T, superheat_F: line_temperature_F - sat_T };
  if (mode === "subcool") return { saturated_temperature_F: sat_T, subcool_F: sat_T - line_temperature_F };
  return { error: "Mode must be 'superheat' or 'subcool'." };
}

export const superheatSubcoolExample = {
  inputs: { refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" },
  expected: { superheat_F_approx: 10 },
};

// --- Utility 27: SEER and EER Conversion ---

export function computeSeerEer({ value, from }) {
  // Common engineering approximation: SEER ~ EER * 1.12 (averaged across rating conditions).
  // This is an estimate; actual conversion depends on rating method.
  if (from === "EER") return { SEER: value * 1.12, SEER2_estimate: value * 1.12 * 0.95 };
  if (from === "SEER") return { EER: value / 1.12, EER2_estimate: (value / 1.12) * 0.95 };
  if (from === "SEER2") return { SEER: value / 0.95, EER: (value / 0.95) / 1.12 };
  if (from === "EER2") return { EER: value / 0.95, SEER: (value / 0.95) * 1.12 };
  return { error: "Unknown rating system." };
}

export const seerEerExample = {
  inputs: { value: 12, from: "EER" },
  expectedRange: { SEER: { min: 13, max: 14 } },
};

// --- Utility 28: Heat Pump Balance Point ---

export function computeBalancePoint({ heating_capacity_btu_hr_at_design, design_outdoor_F, building_heat_loss_btu_hr, indoor_F = 65 }) {
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
  return { balance_point_F: T };
}

export const balancePointExample = {
  inputs: { heating_capacity_btu_hr_at_design: 30000, design_outdoor_F: 17, building_heat_loss_btu_hr: 50000, indoor_F: 65 },
};

// --- Utility 29: Sensible Heat Ratio ---

export function computeSHR({ sensible_btu_hr, total_btu_hr }) {
  if (total_btu_hr <= 0) return { error: "Total load must be positive." };
  return { SHR: sensible_btu_hr / total_btu_hr };
}

export const shrExample = {
  inputs: { sensible_btu_hr: 24000, total_btu_hr: 30000 },
  expected: { SHR: 0.8 },
};

// --- Utility 30: CFM per Ton ---

export function computeCfmPerTon({ tons, climate = "standard" }) {
  const map = { dry: 450, standard: 400, humid: 350 };
  const factor = map[climate] ?? 400;
  return { cfm_per_ton: factor, total_cfm: tons * factor };
}

export const cfmPerTonExample = {
  inputs: { tons: 3, climate: "standard" },
  expected: { total_cfm: 1200 },
};

// --- Utility 31: Combustion Air ---

export function computeCombustionAir({ btu_input, room_volume_ft3 }) {
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

// --- Utility 79: Refrigerant Charge Weighing ---
//
// oz = sum over each line section of (ft * oz_per_ft) using
// per-refrigerant per-line-diameter values. Manufacturer-attributed.

export const CHARGE_OZ_PER_FT = {
  "R-410A": { "1/4": 0.30, "3/8": 0.60, "1/2": 0.95, "5/8": 1.30, "3/4": 1.65 },
  "R-32":   { "1/4": 0.27, "3/8": 0.55, "1/2": 0.85, "5/8": 1.20, "3/4": 1.50 },
  "R-22":   { "1/4": 0.30, "3/8": 0.60, "1/2": 0.95, "5/8": 1.30, "3/4": 1.65 },
  "R-134a": { "1/4": 0.20, "3/8": 0.40, "1/2": 0.65, "5/8": 0.85, "3/4": 1.10 },
  "R-404A": { "1/4": 0.32, "3/8": 0.62, "1/2": 1.00, "5/8": 1.35, "3/4": 1.70 },
  "R-407C": { "1/4": 0.28, "3/8": 0.58, "1/2": 0.92, "5/8": 1.25, "3/4": 1.60 },
};

export function computeRefrigerantCharge({ refrigerant, sections = [] }) {
  const table = CHARGE_OZ_PER_FT[refrigerant];
  if (!table) return { error: "Unknown refrigerant." };
  let total = 0;
  const detail = [];
  for (const s of sections) {
    const oz_per_ft = table[s.diameter];
    if (oz_per_ft === undefined) return { error: "Unknown line diameter: " + s.diameter };
    const ft = Number(s.length_ft) || 0;
    const oz = oz_per_ft * ft;
    total += oz;
    detail.push({ diameter: s.diameter, length_ft: ft, oz });
  }
  return { total_oz: total, total_lb: total / 16, sections: detail };
}

export const refrigerantChargeExample = {
  inputs: { refrigerant: "R-410A", sections: [{ diameter: "3/8", length_ft: 25 }, { diameter: "3/4", length_ft: 25 }] },
  expected: { total_oz: 25 * 0.60 + 25 * 1.65 },
};

// --- Utility 80: Approach and delta-T Diagnostics ---

export function bandLabel(value, low, high) {
  if (value < low) return "low";
  if (value > high) return "high";
  return "normal";
}

export function computeApproachDeltaT({
  outdoor_F, condenser_saturation_F, supply_F, return_F,
  approach_normal_low = 5, approach_normal_high = 20,
  delta_T_normal_low = 16, delta_T_normal_high = 22,
}) {
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

export function computeOutdoorAirMix({ return_T_F, return_RH_percent, outdoor_T_F, outdoor_RH_percent, oa_fraction }) {
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

export function computeWetBulbPsychrometer({ dry_bulb_F, wet_bulb_F, P_hPa = 1013.25 }) {
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

export function computeInsulationThickness({
  pipe_od_in, surface_temp_F, ambient_F, surface_limit_F, k_btu_in_per_hr_ft2_F,
  outside_film_coeff_btu_hr_ft2_F = 1.65,
}) {
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

export function computeEvaporativeCooling({ evaporation_rate_lb_hr, hfg_btu_per_lb = HFG_WATER_BTU_PER_LB }) {
  const m = Number(evaporation_rate_lb_hr) || 0;
  if (m <= 0) return { error: "Evaporation rate must be positive." };
  const Q = m * hfg_btu_per_lb;
  return { cooling_btu_hr: Q, cooling_tons: Q / 12000 };
}

export const evaporativeCoolingExample = {
  inputs: { evaporation_rate_lb_hr: 10 },
  expected: { cooling_btu_hr: 10540 },
};

// --- Utility 119: Compare Two Refrigerants ---
//
// Side-by-side P-T view at a chosen pressure or temperature. Each side
// surfaces the manufacturer attribution from data/hvac/refrigerants.json
// (mirrored in REFRIGERANTS).

export function computeCompareRefrigerants({ refrigerant_a, refrigerant_b, pressure_psig = null, temperature_F = null }) {
  const a = REFRIGERANTS[refrigerant_a];
  const b = REFRIGERANTS[refrigerant_b];
  if (!a) return { error: "Unknown refrigerant A." };
  if (!b) return { error: "Unknown refrigerant B." };
  if (pressure_psig === null && temperature_F === null) return { error: "Provide pressure or temperature." };
  const lookup = (r) => {
    const v = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig, temperature_F });
    if (pressure_psig !== null) return { saturated_temperature_F: v, manufacturer: r.manufacturer };
    return { saturated_pressure_psig: v, manufacturer: r.manufacturer };
  };
  return {
    a: { id: refrigerant_a, ...lookup(a) },
    b: { id: refrigerant_b, ...lookup(b) },
    mode: pressure_psig !== null ? "pressure_to_temp" : "temp_to_pressure",
    input: pressure_psig !== null ? { pressure_psig } : { temperature_F },
  };
}

export const compareRefrigerantsExample = {
  inputs: { refrigerant_a: "R-410A", refrigerant_b: "R-32", pressure_psig: 100 },
  expected: { mode: "pressure_to_temp" },
};

// --- v2 view renderers ---

export function renderRefrigerantCharge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer line-set charge tables (oz per foot per refrigerant per diameter). Attribute manufacturer per entry.";
  const ref = makeSelect("Refrigerant", "rc-r", Object.keys(CHARGE_OZ_PER_FT).map((k) => ({ value: k, label: k })));
  const dia = makeSelect("Line diameter (in)", "rc-d", ["1/4", "3/8", "1/2", "5/8", "3/4"].map((d) => ({ value: d, label: d })));
  const len = makeNumber("Total line length (ft)", "rc-l", { step: "any", min: "0" });
  for (const f of [ref, dia, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; dia.select.value = "3/8"; len.input.value = "50"; update(); });
  const oOz = makeOutputLine(outputRegion, "Total charge", "rc-out-oz");
  const oLb = makeOutputLine(outputRegion, "Total charge (lb)", "rc-out-lb");
  const update = debounce(() => {
    const r = computeRefrigerantCharge({
      refrigerant: ref.select.value,
      sections: [{ diameter: dia.select.value, length_ft: Number(len.input.value) || 0 }],
    });
    if (r.error) { oOz.textContent = r.error; oLb.textContent = "-"; return; }
    oOz.textContent = fmt(r.total_oz, 2) + " oz";
    oLb.textContent = fmt(r.total_lb, 3) + " lb";
  }, DEBOUNCE_MS);
  for (const el of [ref.select, dia.select, len.input]) el.addEventListener("input", update);
}

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

export function renderOutdoorAirMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Mixed air dry-bulb is OA_fraction-weighted; mixed humidity ratio is mass-weighted via the psychrometric helpers.";
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

export function renderCompareRefrigerants(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-published P-T tables (with attribution per refrigerant). Linear interpolation between bundled pairs.";
  const a = makeSelect("Refrigerant A", "cmp-a", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const b = makeSelect("Refrigerant B", "cmp-b", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Mode", "cmp-mode", [
    { value: "pressure", label: "Pressure -> Temperature" },
    { value: "temperature", label: "Temperature -> Pressure" },
  ]);
  const v = makeNumber("Value", "cmp-v", { step: "any" });
  for (const f of [a, b, mode, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.select.value = "R-410A"; b.select.value = "R-32"; mode.select.value = "pressure"; v.input.value = "100"; update(); });
  const oA = makeOutputLine(outputRegion, "Refrigerant A", "cmp-out-a");
  const oAttrA = makeOutputLine(outputRegion, "A source", "cmp-out-a-src");
  const oB = makeOutputLine(outputRegion, "Refrigerant B", "cmp-out-b");
  const oAttrB = makeOutputLine(outputRegion, "B source", "cmp-out-b-src");
  const update = debounce(() => {
    const num = Number(v.input.value);
    const args = { refrigerant_a: a.select.value, refrigerant_b: b.select.value };
    if (mode.select.value === "pressure") args.pressure_psig = num; else args.temperature_F = num;
    const r = computeCompareRefrigerants(args);
    if (r.error) { oA.textContent = r.error; oAttrA.textContent = "-"; oB.textContent = "-"; oAttrB.textContent = "-"; return; }
    const fmtSide = (side) => side.saturated_temperature_F !== undefined
      ? fmt(side.saturated_temperature_F, 2) + " F"
      : fmt(side.saturated_pressure_psig, 2) + " psig";
    oA.textContent = a.select.value + ": " + fmtSide(r.a);
    oAttrA.textContent = r.a.manufacturer;
    oB.textContent = b.select.value + ": " + fmtSide(r.b);
    oAttrB.textContent = r.b.manufacturer;
  }, DEBOUNCE_MS);
  for (const el of [a.select, b.select, mode.select, v.input]) el.addEventListener("input", update);
}

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
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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

export function renderManualJCooling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Simplified engineering load estimator from envelope conductance, infiltration, internal gains, solar, and latent loads. A code-compliant load calculation requires Manual J.";
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

  const update = debounce(async () => {
    const inputs = {
      floor_area_ft2: Number(fa.input.value) || 0,
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
  }, DEBOUNCE_MS);

  for (const el of [fa.input, wa.input, win.input, ca.input, ins.select, wt.select, occ.input, od.input, id.input, orh.input]) el.addEventListener("input", update);
}

export function renderManualJHeating(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Simplified engineering load estimator from envelope conductance and infiltration. A code-compliant load calculation requires Manual J.";
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
  const oCond = makeOutputLine(outputRegion, "Conductive", "mjh-out-cond");
  const oInf = makeOutputLine(outputRegion, "Infiltration", "mjh-out-inf");

  const update = debounce(async () => {
    const inputs = {
      floor_area_ft2: Number(fa.input.value) || 0,
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
    oCond.textContent = fmt(r.conductive_BTU_hr, 0) + " BTU/hr";
    oInf.textContent = fmt(r.infiltration_BTU_hr, 0) + " BTU/hr";
  }, DEBOUNCE_MS);

  for (const el of [fa.input, wa.input, win.input, ca.input, ins.select, wt.select, od.input, id.input]) el.addEventListener("input", update);
}

export function renderDuctSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Darcy-Weisbach with Colebrook-White friction factor and standard galvanized-steel duct surface roughness. Equivalent rectangular size from the standard equivalent-diameter formula.";
  const cfm = makeNumber("CFM", "ds-cfm", { step: "any", min: "0" });
  const fr = makeNumber("Friction rate (in w.c. / 100 ft)", "ds-fr", { step: "any", min: "0", value: "0.08" });
  fr.input.value = "0.08";
  for (const f of [cfm, fr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "400"; fr.input.value = "0.08"; update(); });

  const oR = makeOutputLine(outputRegion, "Round diameter", "ds-out-r");
  const oS = makeOutputLine(outputRegion, "Equivalent square", "ds-out-s");
  const oV = makeOutputLine(outputRegion, "Velocity", "ds-out-v");

  const update = debounce(async () => {
    const inputs = { cfm: Number(cfm.input.value) || 0, friction_in_wc_per_100ft: Number(fr.input.value) || 0 };
    const r = await runInWorker({ kind: "duct", inputs }, computeDuctSize);
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; oV.textContent = "-"; return; }
    oR.textContent = fmt(r.round_diameter_in, 2) + " in";
    oS.textContent = fmt(r.equivalent_square_in, 2) + " in (square)";
    oV.textContent = fmt(r.velocity_fpm, 0) + " fpm";
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, fr.input]) el.addEventListener("input", update);
}

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

export function renderRefrigerantPT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-published P-T tables for common refrigerants. Each refrigerant attributes its publishing manufacturer.";
  const ref = makeSelect("Refrigerant", "rp-r", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Input", "rp-m", [{ value: "pressure", label: "Pressure (psig)" }, { value: "temperature", label: "Temperature (F)" }]);
  const value = makeNumber("Value", "rp-v", { step: "any" });
  for (const f of [ref, mode, value]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; mode.select.value = "pressure"; value.input.value = "118"; update(); });
  const oT = makeOutputLine(outputRegion, "Saturated value", "rp-out-t");
  const oS = makeOutputLine(outputRegion, "Source", "rp-out-s");
  const update = debounce(() => {
    const inputs = { refrigerant: ref.select.value };
    if (mode.select.value === "pressure") inputs.pressure_psig = Number(value.input.value);
    else inputs.temperature_F = Number(value.input.value);
    const r = computeRefrigerantPT(inputs);
    if (r.error) { oT.textContent = r.error; oS.textContent = "-"; return; }
    if (r.saturated_temperature_F !== undefined) oT.textContent = fmt(r.saturated_temperature_F, 1) + " F";
    else oT.textContent = fmt(r.saturated_pressure_psig, 1) + " psig";
    oS.textContent = r.manufacturer;
  }, DEBOUNCE_MS);
  for (const el of [ref.select, mode.select, value.input]) el.addEventListener("input", update);
}

export function renderSuperheatSubcool(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Superheat = line temperature minus saturated temperature at suction pressure. Subcool = saturated temperature at liquid pressure minus liquid line temperature.";
  const ref = makeSelect("Refrigerant", "ss-r", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Mode", "ss-m", [{ value: "superheat", label: "Superheat" }, { value: "subcool", label: "Subcool" }]);
  const press = makeNumber("System pressure (psig)", "ss-p", { step: "any" });
  const temp = makeNumber("Line temperature (F)", "ss-t", { step: "any" });
  for (const f of [ref, mode, press, temp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; mode.select.value = "superheat"; press.input.value = "118"; temp.input.value = "50"; update(); });
  const oSat = makeOutputLine(outputRegion, "Saturated temperature", "ss-out-sat");
  const oR = makeOutputLine(outputRegion, "Result", "ss-out-r");
  const update = debounce(() => {
    const r = computeSuperheatSubcool({
      refrigerant: ref.select.value,
      system_pressure_psig: Number(press.input.value) || 0,
      line_temperature_F: Number(temp.input.value) || 0,
      mode: mode.select.value,
    });
    if (r.error) { oSat.textContent = r.error; oR.textContent = "-"; return; }
    oSat.textContent = fmt(r.saturated_temperature_F, 1) + " F";
    oR.textContent = mode.select.value === "superheat"
      ? (fmt(r.superheat_F, 1) + " F superheat")
      : (fmt(r.subcool_F, 1) + " F subcool");
  }, DEBOUNCE_MS);
  for (const el of [ref.select, mode.select, press.input, temp.input]) el.addEventListener("input", update);
}

export function renderSeerEer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: SEER and EER are rated under different conditions. The 1.12 conversion factor is an engineering approximation; actual values depend on the rating method.";
  const value = makeNumber("Value", "se-v", { step: "any", min: "0" });
  const from = makeSelect("From", "se-f", [{ value: "EER", label: "EER" }, { value: "SEER", label: "SEER" }, { value: "SEER2", label: "SEER2" }, { value: "EER2", label: "EER2" }]);
  for (const f of [value, from]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { value.input.value = "12"; from.select.value = "EER"; update(); });
  const oOut = makeOutputLine(outputRegion, "Result", "se-out");
  const update = debounce(() => {
    const r = computeSeerEer({ value: Number(value.input.value) || 0, from: from.select.value });
    if (r.error) { oOut.textContent = r.error; return; }
    oOut.textContent = Object.entries(r).map(([k, v]) => k + " " + fmt(v, 2)).join(", ");
  }, DEBOUNCE_MS);
  for (const el of [value.input, from.select]) el.addEventListener("input", update);
}

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
  const update = debounce(() => {
    const r = computeBalancePoint({
      heating_capacity_btu_hr_at_design: Number(cap.input.value) || 0,
      design_outdoor_F: Number(dT.input.value) || 0,
      building_heat_loss_btu_hr: Number(load.input.value) || 0,
      indoor_F: Number(indoor.input.value) || 65,
    });
    oBP.textContent = fmt(r.balance_point_F, 1) + " F";
  }, DEBOUNCE_MS);
  for (const el of [cap.input, dT.input, load.input, indoor.input]) el.addEventListener("input", update);
}

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
  const update = debounce(() => {
    const r = computeCfmPerTon({ tons: Number(tons.input.value) || 0, climate: climate.select.value });
    oC.textContent = String(r.cfm_per_ton);
    oT.textContent = fmt(r.total_cfm, 0);
  }, DEBOUNCE_MS);
  for (const el of [tons.input, climate.select]) el.addEventListener("input", update);
}

export function renderCombustionAir(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard combustion-air rules of thumb. 50 ft^3 of room volume per 1000 BTU/hr is adequate by volume; otherwise outside air opening 1 in^2 per 1000 BTU/hr or indoor opening 1 in^2 per 4000 BTU/hr.";
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

export const HVAC_RENDERERS = {
  "manual-j-cooling": renderManualJCooling,
  "manual-j-heating": renderManualJHeating,
  "duct-sizing": renderDuctSizing,
  "static-pressure-hvac": renderStaticPressureHvac,
  "refrigerant-pt": renderRefrigerantPT,
  "superheat-subcool": renderSuperheatSubcool,
  "seer-eer": renderSeerEer,
  "balance-point": renderBalancePoint,
  "shr": renderSHR,
  "cfm-per-ton": renderCfmPerTon,
  "combustion-air": renderCombustionAir,
  // v2
  "compare-refrigerants": renderCompareRefrigerants,
  "refrigerant-charge": renderRefrigerantCharge,
  "approach-delta-t": renderApproachDeltaT,
  "outdoor-air-mix": renderOutdoorAirMix,
  "equivalent-length": renderEquivalentLength,
  "wet-bulb-psychrometer": renderWetBulbPsychrometer,
  "insulation-thickness": renderInsulationThickness,
  "evaporative-cooling": renderEvaporativeCooling,
};
