// Group C: HVAC calculators (utilities 21 through 31).
//
// Manual J cooling and heating estimators (utilities 21 and 22) are
// simplified and run in a Web Worker. Every Manual J view carries the
// inline notice that the result is a simplified estimate and that a
// code-compliant load calculation requires Manual J.

import {
  darcyWeisbachFrictionLoss,
  hazenWilliamsFrictionLoss,
  interpolateRefrigerant,
  psychrometric,
  saturationVaporPressure_hPa,
  F_to_C,
} from "./pure-math.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

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
  return {
    round_diameter_in: d_in,
    velocity_fpm: (cfm / (Math.PI * (d_in / 12 / 2) ** 2)),
    equivalent_square_in: square_in,
    friction_color,
    friction_label,
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

// --- Utility 25: Refrigerant P-T Chart ---

// dims: in { refrigerant: dimensionless, pressure_psig: M L^-1 T^-2, temperature_F: T, outdoor_F: T, indoor_wb_F: T } out: { saturation_temp_F: T, pressure_psig: M L^-1 T^-2, target_superheat_F: T, target_subcool_F: T }
export function computeRefrigerantPT({ refrigerant, pressure_psig = null, temperature_F = null, outdoor_F = null, indoor_wb_F = null }) {
  const r = REFRIGERANTS[refrigerant];
  if (!r) return { error: "Unknown refrigerant." };
  if (pressure_psig === null && temperature_F === null) return { error: "Provide pressure or temperature." };
  const value = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig, temperature_F });
  // v8 §C.3: target-superheat lookup for outdoor temp + indoor wet-bulb.
  // Carrier / Trane published TXV / fixed-orifice charging charts collapse
  // to a roughly-linear band: superheat decreases as outdoor temp rises and
  // increases as indoor wet-bulb rises. The bundled engineering-practice
  // approximation: target_superheat_F = clamp(70 + 0.6 × WB - 0.5 × OAT, 5, 30).
  let target_superheat_F = null;
  if (outdoor_F !== null && indoor_wb_F !== null) {
    const t = 70 + 0.6 * Number(indoor_wb_F) - 0.5 * Number(outdoor_F);
    target_superheat_F = Math.max(5, Math.min(30, t));
  }
  const out = pressure_psig !== null
    ? { saturated_temperature_F: value, manufacturer: r.manufacturer }
    : { saturated_pressure_psig: value, manufacturer: r.manufacturer };
  if (target_superheat_F !== null) {
    out.target_superheat_F = target_superheat_F;
    out.superheat_lookup_note = "Engineering-practice band; manufacturer-published charging chart governs.";
  }
  return out;
}

export const refrigerantPTExample = {
  inputs: { refrigerant: "R-410A", pressure_psig: 118 },
  expected: { saturated_temperature_F: 40 },
};

// --- Utility 26: Superheat and Subcool ---

// v8 §C.3: classify a superheat or subcool reading against typical bands
// and return a one-line diagnostic so the renderer doesn't have to.
function _v8shScDiagnostic(value, mode) {
  if (!Number.isFinite(value)) return null;
  if (mode === "superheat") {
    if (value < 5)  return { band: "low",  diagnostic: "low - check overcharge or restricted metering" };
    if (value > 25) return { band: "high", diagnostic: "high - check coil fouling or low charge" };
    return { band: "in-range", diagnostic: "in-range (5-25 F)" };
  }
  if (mode === "subcool") {
    if (value < 2)  return { band: "low",  diagnostic: "low - check undercharge or liquid-line restriction" };
    if (value > 10) return { band: "high", diagnostic: "high - check overcharge" };
    return { band: "in-range", diagnostic: "in-range (2-10 F)" };
  }
  return null;
}

// dims: in { refrigerant: dimensionless, system_pressure_psig: M L^-1 T^-2, line_temperature_F: T, mode: dimensionless, indoor_wet_bulb_F: T, outdoor_dry_bulb_F: T, deadband_F: T } out: { value_F: T, sat_F: T, target_superheat_F: T }
export function computeSuperheatSubcool({ refrigerant, system_pressure_psig, line_temperature_F, mode, indoor_wet_bulb_F = 0, outdoor_dry_bulb_F = 0, deadband_F = 5 }) {
  const r = REFRIGERANTS[refrigerant];
  if (!r) return { error: "Unknown refrigerant." };
  const sat_T = interpolateRefrigerant({ pairs: r.pt_pairs, pressure_psig: system_pressure_psig });
  if (mode === "superheat") {
    const value = line_temperature_F - sat_T;
    const d = _v8shScDiagnostic(value, "superheat");
    // v23 EN.2: fixed-orifice target-superheat method + charge verdict. The
    // common charging-chart approximation target_SH = (3*IWB - 80 - ODB)/2
    // (user-confirmable against the manufacturer chart). Default off.
    let target_superheat_F = null, charge_verdict = null;
    const iwb = Number(indoor_wet_bulb_F) || 0, odb = Number(outdoor_dry_bulb_F) || 0;
    let dead = Number(deadband_F); if (!Number.isFinite(dead) || dead < 0) dead = 5;
    if (iwb > 0 && Number.isFinite(iwb) && Number.isFinite(odb)) {
      const tgt = (3 * iwb - 80 - odb) / 2;
      if (Number.isFinite(tgt)) {
        target_superheat_F = tgt;
        if (Number.isFinite(value)) {
          charge_verdict = value > tgt + dead ? "undercharge (superheat above target)"
            : value < tgt - dead ? "overcharge (superheat below target)"
            : "within target band";
        }
      }
    }
    return { saturated_temperature_F: sat_T, superheat_F: value, band: d && d.band, diagnostic: d && d.diagnostic, target_superheat_F, charge_verdict };
  }
  if (mode === "subcool") {
    const value = sat_T - line_temperature_F;
    const d = _v8shScDiagnostic(value, "subcool");
    return { saturated_temperature_F: sat_T, subcool_F: value, band: d && d.band, diagnostic: d && d.diagnostic };
  }
  return { error: "Mode must be 'superheat' or 'subcool'." };
}

export const superheatSubcoolExample = {
  inputs: { refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" },
  expected: { superheat_F_approx: 10 },
};

// --- Utility 27: SEER and EER Conversion ---

// dims: in { value: dimensionless, from: dimensionless, cooling_load_btu_hr: M L^2 T^-3, annual_hours: dimensionless, electricity_rate: dimensionless } out: { seer: dimensionless, eer: dimensionless, annual_kwh: dimensionless, annual_cost_usd: dimensionless }
export function computeSeerEer({ value, from, cooling_load_btu_hr = 0, annual_hours = 0, electricity_rate = 0 }) {
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

// dims: in { refrigerant: dimensionless, sections: dimensionless } out: { total_charge_oz: M }
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

// dims: in { refrigerant_a: dimensionless, refrigerant_b: dimensionless, pressure_psig: M L^-1 T^-2, temperature_F: T } out: { delta: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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
export function renderCompareRefrigerants(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer P-T table by attribution. ASHRAE 15-2022 governs refrigerant safety; manufacturer technical bulletin governs charge. Free at ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards.";
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
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
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
export const REFRIGERANT_OAT_PRESETS = [
  { id: "mild",     label: "Mild 75 F",     oat_F: 75,  description: "Mild summer day; AHRI 210/240 A2 / mild start-up" },
  { id: "design",   label: "Design 85 F",   oat_F: 85,  description: "ASHRAE 0.4% cooling design typical (varies by climate)" },
  { id: "hot",      label: "Hot 95 F",      oat_F: 95,  description: "AHRI 210/240 A condition (rated cooling)" },
  { id: "extreme",  label: "Extreme 105 F", oat_F: 105, description: "Direct-sun rooftop / desert summer peak" },
];

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

  const update = debounce(async () => {
    const inputs = { cfm: Number(cfm.input.value) || 0, friction_in_wc_per_100ft: Number(fr.input.value) || 0 };
    const r = await runInWorker({ kind: "duct", inputs }, computeDuctSize);
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; oV.textContent = "-"; oF.textContent = "-"; return; }
    oR.textContent = fmt(r.round_diameter_in, 2) + " in";
    oS.textContent = fmt(r.equivalent_square_in, 2) + " in (square)";
    oV.textContent = fmt(r.velocity_fpm, 0) + " fpm";
    oF.textContent = r.friction_color.toUpperCase() + " - " + r.friction_label;
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
export function renderRefrigerantPT(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-published P-T tables for common refrigerants. Each refrigerant attributes its publishing manufacturer.";
  const ref = makeSelect("Refrigerant", "rp-r", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Input", "rp-m", [{ value: "pressure", label: "Pressure (psig)" }, { value: "temperature", label: "Temperature (F)" }]);
  const value = makeNumber("Value", "rp-v", { step: "any" });
  // v8 §C.3: optional outdoor air temp + indoor wet-bulb so the renderer
  // can also surface the typical target superheat for those conditions.
  const oat = makeNumber("Outdoor air temp (F, optional)", "rp-oat", { step: "any" });
  const wb = makeNumber("Indoor wet-bulb (F, optional)", "rp-wb", { step: "any" });
  // v8 §C.3 + accessibility.md preset-chip pattern: common OAT charging
  // conditions. One tap sets the OAT field.
  const oatChips = document.createElement("div");
  oatChips.className = "preset-chip-row";
  oatChips.setAttribute("role", "group");
  oatChips.setAttribute("aria-label", "Outdoor air temp presets");
  for (const p of REFRIGERANT_OAT_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.dataset.presetId = p.id;
    btn.textContent = p.label;
    btn.title = p.description;
    btn.addEventListener("click", () => { oat.input.value = String(p.oat_F); update(); });
    oatChips.appendChild(btn);
  }
  for (const f of [ref, mode, value, oat]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(oatChips);
  inputRegion.appendChild(wb.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; mode.select.value = "pressure"; value.input.value = "118"; update(); });
  const oT = makeOutputLine(outputRegion, "Saturated value", "rp-out-t");
  const oS = makeOutputLine(outputRegion, "Source", "rp-out-s");
  const oTSH = makeOutputLine(outputRegion, "Target superheat (if OAT + WB supplied)", "rp-out-tsh");
  const update = debounce(() => {
    const inputs = { refrigerant: ref.select.value };
    if (mode.select.value === "pressure") inputs.pressure_psig = Number(value.input.value);
    else inputs.temperature_F = Number(value.input.value);
    const oatVal = Number(oat.input.value);
    const wbVal = Number(wb.input.value);
    if (oat.input.value !== "" && wb.input.value !== "") {
      inputs.outdoor_F = oatVal;
      inputs.indoor_wb_F = wbVal;
    }
    const r = computeRefrigerantPT(inputs);
    if (r.error) { oT.textContent = r.error; oS.textContent = "-"; oTSH.textContent = "-"; return; }
    if (r.saturated_temperature_F !== undefined) oT.textContent = fmt(r.saturated_temperature_F, 1) + " F";
    else oT.textContent = fmt(r.saturated_pressure_psig, 1) + " psig";
    oS.textContent = r.manufacturer;
    oTSH.textContent = r.target_superheat_F == null ? "-" : (fmt(r.target_superheat_F, 1) + " F - " + r.superheat_lookup_note);
  }, DEBOUNCE_MS);
  for (const el of [ref.select, mode.select, value.input, oat.input, wb.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSuperheatSubcool(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Superheat = line temperature minus saturated temperature at suction pressure. Subcool = saturated temperature at liquid pressure minus liquid line temperature.";
  const ref = makeSelect("Refrigerant", "ss-r", Object.keys(REFRIGERANTS).map((k) => ({ value: k, label: k })));
  const mode = makeSelect("Mode", "ss-m", [{ value: "superheat", label: "Superheat" }, { value: "subcool", label: "Subcool" }]);
  const press = makeNumber("System pressure (psig)", "ss-p", { step: "any" });
  const temp = makeNumber("Line temperature (F)", "ss-t", { step: "any" });
  // v23 EN.2: optional fixed-orifice target-superheat from indoor wet-bulb +
  // outdoor dry-bulb, with a pass / overcharge / undercharge verdict.
  const iwb = makeNumber("Indoor wet-bulb (F, fixed-orifice target)", "ss-iwb", { step: "any", min: "0" });
  const odb = makeNumber("Outdoor dry-bulb (F)", "ss-odb", { step: "any" });
  for (const f of [ref, mode, press, temp, iwb, odb]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "R-410A"; mode.select.value = "superheat"; press.input.value = "118"; temp.input.value = "50"; iwb.input.value = "63"; odb.input.value = "95"; update(); });
  const oSat = makeOutputLine(outputRegion, "Saturated temperature", "ss-out-sat");
  const oR = makeOutputLine(outputRegion, "Result", "ss-out-r");
  // v8 §C.3: out-of-range diagnostic.
  const oD = makeOutputLine(outputRegion, "Diagnostic", "ss-out-diag");
  const oV = makeOutputLine(outputRegion, "Target superheat / charge", "ss-out-verdict");
  const update = debounce(() => {
    const r = computeSuperheatSubcool({
      refrigerant: ref.select.value,
      system_pressure_psig: Number(press.input.value) || 0,
      line_temperature_F: Number(temp.input.value) || 0,
      mode: mode.select.value,
      indoor_wet_bulb_F: Number(iwb.input.value) || 0,
      outdoor_dry_bulb_F: Number(odb.input.value) || 0,
    });
    if (r.error) { oSat.textContent = r.error; oR.textContent = "-"; oD.textContent = "-"; oV.textContent = "-"; return; }
    oSat.textContent = fmt(r.saturated_temperature_F, 1) + " F";
    oR.textContent = mode.select.value === "superheat"
      ? (fmt(r.superheat_F, 1) + " F superheat")
      : (fmt(r.subcool_F, 1) + " F subcool");
    oD.textContent = r.diagnostic || "-";
    oV.textContent = (r.target_superheat_F == null) ? "(enter wet-bulb + outdoor dry-bulb)" : (fmt(r.target_superheat_F, 1) + " F target - " + (r.charge_verdict || "-"));
  }, DEBOUNCE_MS);
  for (const el of [ref.select, mode.select, press.input, temp.input, iwb.input, odb.input]) el.addEventListener("input", update);
}

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
    const cf = document.createElement("input"); cf.type = "number"; cf.step = "any"; cf.min = "0"; cf.placeholder = "Tool CFM";
    const dc = document.createElement("input"); dc.type = "number"; dc.step = "any"; dc.min = "0"; dc.max = "1"; dc.placeholder = "Duty cycle 0..1";
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

// --- 243: Refrigerant Superheat and Subcooling (psig/psia toggle) ---

export const REFRIGERANT_PT_TABLES_v7 = {
  R_410A: [
    { psia: 30,  T_F: -25 }, { psia: 50,  T_F: -8 }, { psia: 80,  T_F: 13 },
    { psia: 100, T_F: 25 },  { psia: 130, T_F: 40 }, { psia: 170, T_F: 56 },
    { psia: 220, T_F: 73 },  { psia: 280, T_F: 90 }, { psia: 350, T_F: 105 },
    { psia: 430, T_F: 120 }, { psia: 520, T_F: 134 },
  ],
  R_32: [
    { psia: 30,  T_F: -22 }, { psia: 50,  T_F: -5 }, { psia: 80,  T_F: 16 },
    { psia: 100, T_F: 28 },  { psia: 130, T_F: 43 }, { psia: 170, T_F: 59 },
    { psia: 220, T_F: 76 },  { psia: 280, T_F: 93 }, { psia: 350, T_F: 109 },
    { psia: 430, T_F: 124 }, { psia: 520, T_F: 138 },
  ],
  R_454B: [
    { psia: 30,  T_F: -23 }, { psia: 50,  T_F: -6 }, { psia: 80,  T_F: 14 },
    { psia: 100, T_F: 26 },  { psia: 130, T_F: 41 }, { psia: 170, T_F: 57 },
    { psia: 220, T_F: 74 },  { psia: 280, T_F: 91 }, { psia: 350, T_F: 107 },
  ],
  R_22: [
    { psia: 25,  T_F: -10 }, { psia: 50,  T_F: 18 }, { psia: 75,  T_F: 38 },
    { psia: 100, T_F: 53 },  { psia: 150, T_F: 78 }, { psia: 200, T_F: 99 },
    { psia: 250, T_F: 117 }, { psia: 300, T_F: 132 }, { psia: 350, T_F: 146 },
  ],
  R_134a: [
    { psia: 15,  T_F: -10 }, { psia: 25,  T_F: 8 },  { psia: 40,  T_F: 28 },
    { psia: 60,  T_F: 50 },  { psia: 80,  T_F: 67 }, { psia: 100, T_F: 79 },
    { psia: 130, T_F: 95 },  { psia: 170, T_F: 110 }, { psia: 220, T_F: 128 },
  ],
};

function _interpRefSatT(refrigerant, psia) {
  const tbl = REFRIGERANT_PT_TABLES_v7[refrigerant];
  if (!tbl) return null;
  if (psia <= tbl[0].psia) return tbl[0].T_F;
  for (let i = 1; i < tbl.length; i++) {
    if (psia <= tbl[i].psia) {
      const lo = tbl[i - 1], hi = tbl[i];
      const f = (psia - lo.psia) / (hi.psia - lo.psia);
      return lo.T_F + f * (hi.T_F - lo.T_F);
    }
  }
  return tbl[tbl.length - 1].T_F;
}

// dims: in { args: dimensionless } out: { target_subcool_F: T, target_superheat_F: T }
export function computeRefrigerantCharging({
  refrigerant = "R_410A",
  suction_pressure = 0, suction_unit = "psig", suction_line_temp_F = 0,
  liquid_pressure = 0, liquid_unit = "psig", liquid_line_temp_F = 0,
} = {}) {
  if (!REFRIGERANT_PT_TABLES_v7[refrigerant]) return { error: "Unknown refrigerant." };
  if (!(suction_pressure > 0) || !(liquid_pressure > 0)) return { error: "Pressures must be positive." };
  const suction_psia = suction_unit === "psig" ? suction_pressure + 14.696 : suction_pressure;
  const liquid_psia = liquid_unit === "psig" ? liquid_pressure + 14.696 : liquid_pressure;
  const T_sat_suction = _interpRefSatT(refrigerant, suction_psia);
  const T_sat_liquid = _interpRefSatT(refrigerant, liquid_psia);
  const superheat_F = Number(suction_line_temp_F) - T_sat_suction;
  const subcool_F = T_sat_liquid - Number(liquid_line_temp_F);
  const superheat_flag = superheat_F < 8 ? "low" : superheat_F > 12 ? "high" : "in-range";
  const subcool_flag = subcool_F < 8 ? "low" : subcool_F > 15 ? "high" : "in-range";
  return {
    suction_psia, liquid_psia,
    T_sat_suction_F: T_sat_suction, T_sat_liquid_F: T_sat_liquid,
    superheat_F, subcool_F, superheat_flag, subcool_flag,
  };
}

export const refrigerantChargingExample = {
  inputs: {
    refrigerant: "R_410A",
    suction_pressure: 130, suction_unit: "psig", suction_line_temp_F: 50,
    liquid_pressure: 350, liquid_unit: "psig", liquid_line_temp_F: 100,
  },
};

// --- 244: Cooling Tower Approach and Range ---

// dims: in { T_in_F: T, T_out_F: T, T_wb_F: T, gpm: L^3 T^-1, fan_kW: M L^2 T^-3 } out: { range_F: T, approach_F: T, evaporation_gpm: L^3 T^-1 }
export function computeCoolingTower({ T_in_F = 0, T_out_F = 0, T_wb_F = 0, gpm = 0, fan_kW = 0 } = {}) {
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

function _v7h_renderRefrigerantCharging(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manufacturer-attributed P-T tables (data/hvac/refrigerant-pt-tables.json). psig is the gauge default; toggle to psia per input. Manufacturer typical 8-12 °F superheat / 8-15 °F subcool when no charging chart applies.";
  _v7h_attachEx(inputRegion, () => fillExample(refrigerantChargingExample.inputs));
  const ref = _v7h_makeSelect("Refrigerant", "rc-ref", Object.keys(REFRIGERANT_PT_TABLES_v7).map((k) => ({ value: k, label: k.replace("_", "-") })));
  const sp = _v7h_makeNumber("Suction pressure", "rc-sp", { step: "any", min: "0" });
  const su = _v7h_makeSelect("Suction unit", "rc-su", [{ value: "psig", label: "psig (gauge)" }, { value: "psia", label: "psia (absolute)" }]);
  const st = _v7h_makeNumber("Suction line T (°F)", "rc-st", { step: "any" });
  const lp = _v7h_makeNumber("Liquid pressure", "rc-lp", { step: "any", min: "0" });
  const lu = _v7h_makeSelect("Liquid unit", "rc-lu", [{ value: "psig", label: "psig (gauge)" }, { value: "psia", label: "psia (absolute)" }]);
  const lt = _v7h_makeNumber("Liquid line T (°F)", "rc-lt", { step: "any" });
  for (const f of [ref, sp, su, st, lp, lu, lt]) inputRegion.appendChild(f.wrap);
  const oTSS = _v7h_makeOut(outputRegion, "T_sat at suction", "rc-out-tss");
  const oTSL = _v7h_makeOut(outputRegion, "T_sat at liquid", "rc-out-tsl");
  const oSH = _v7h_makeOut(outputRegion, "Superheat", "rc-out-sh");
  const oSC = _v7h_makeOut(outputRegion, "Subcool", "rc-out-sc");
  function fillExample(x) {
    ref.select.value = x.refrigerant; sp.input.value = x.suction_pressure; su.select.value = x.suction_unit;
    st.input.value = x.suction_line_temp_F; lp.input.value = x.liquid_pressure; lu.select.value = x.liquid_unit;
    lt.input.value = x.liquid_line_temp_F; update();
  }
  const update = _v7h_debounce(() => {
    const r = computeRefrigerantCharging({
      refrigerant: ref.select.value,
      suction_pressure: Number(sp.input.value) || 0, suction_unit: su.select.value,
      suction_line_temp_F: Number(st.input.value) || 0,
      liquid_pressure: Number(lp.input.value) || 0, liquid_unit: lu.select.value,
      liquid_line_temp_F: Number(lt.input.value) || 0,
    });
    if (r.error) { oTSS.textContent = r.error; oTSL.textContent = "-"; oSH.textContent = "-"; oSC.textContent = "-"; return; }
    oTSS.textContent = _v7h_fmt(r.T_sat_suction_F, 1) + " °F (" + _v7h_fmt(r.suction_psia, 1) + " psia)";
    oTSL.textContent = _v7h_fmt(r.T_sat_liquid_F, 1) + " °F (" + _v7h_fmt(r.liquid_psia, 1) + " psia)";
    oSH.textContent = _v7h_fmt(r.superheat_F, 1) + " °F (" + r.superheat_flag + ")";
    oSC.textContent = _v7h_fmt(r.subcool_F, 1) + " °F (" + r.subcool_flag + ")";
  }, _V7H_DEB);
  for (const f of [ref.select, sp.input, su.select, st.input, lp.input, lu.select, lt.input]) f.addEventListener("input", update);
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
HVAC_RENDERERS["refrigerant-charging"] = _v7h_renderRefrigerantCharging;
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

// =====================================================================
// spec-v16 Group C expansion (HVAC). The first-principles batch lands
// here per spec-v16 §3 / §Z.2: C.3 chiller tonnage from delta-T and GPM,
// C.5 heat-exchanger LMTD and effectiveness-NTU, and C.9 air changes per
// hour. C.4 (cooling-tower range/approach) is substantially covered by
// the existing `cooling-tower` tile and C.1 (duct fitting equivalent
// length) by the existing `equivalent-length` tile -- see the spec-v16
// status header for the audit findings. Render functions are module-
// local; only the pure compute functions enter the v14 corpus.
// =====================================================================

const _v16h_readNum = (input) => {
  if (!input || input.value === "") return null;
  const n = Number(input.value);
  return Number.isFinite(n) ? n : null;
};

// --- C.3 Chiller tonnage from delta-T and GPM ------------------------

// Fluid energy-balance factor: Q (BTU/hr) = gpm * factor * delta_T,
// where factor = 60 min/hr * density (lb/gal) * specific heat
// (BTU/lb-F). Water is the textbook 500. Propylene-glycol factors are
// property-derived at a typical 40-50 F chilled-water mean per ASHRAE
// Fundamentals 2021 Chapter 31 (secondary coolants); the manufacturer's
// fluid table governs final selection.
export const CHILLER_FLUID_FACTORS = {
  water: 500,
  glycol_30: 475, // 30% propylene glycol: ~8.6 lb/gal * 0.92 cp * 60
  glycol_50: 449, // 50% propylene glycol: ~8.8 lb/gal * 0.85 cp * 60
};

// dims: in { args: dimensionless } out: { delta_T_F: T, q_btu_hr: dimensionless, tons: dimensionless, required_gpm: L^3 T^-1 }
export function computeChillerTons({
  gpm = 0,
  ewt_F = 54,
  lwt_F = 44,
  fluid = "water",
  nameplate_tons = null,
} = {}) {
  const flow = Number(gpm) || 0;
  const Te = Number(ewt_F);
  const Tl = Number(lwt_F);
  const factor = CHILLER_FLUID_FACTORS[fluid] ?? CHILLER_FLUID_FACTORS.water;
  if (!(flow > 0)) return { error: "Enter a positive chilled-water flow (GPM)." };
  if (!Number.isFinite(Te) || !Number.isFinite(Tl)) return { error: "Enter entering and leaving water temperatures." };
  const delta_T_F = Te - Tl;
  if (!(delta_T_F > 0)) return { error: "Entering water temperature must exceed leaving water temperature." };

  const q_btu_hr = flow * factor * delta_T_F;
  const tons = q_btu_hr / 12000;
  const kw = q_btu_hr / 3412;

  // Required flow to carry the chiller's nameplate tons at this delta-T.
  const np = nameplate_tons != null && Number.isFinite(Number(nameplate_tons)) ? Number(nameplate_tons) : null;
  const required_gpm = np != null && np > 0 ? (np * 12000) / (factor * delta_T_F) : null;

  const warnings = [];
  if (delta_T_F < 5 || delta_T_F > 20) warnings.push("Delta-T outside the typical 10-14 F chiller range; confirm the entering and leaving temperatures.");
  if (fluid !== "water") warnings.push("Glycol factor is property-derived at a typical chilled-water mean; the manufacturer's fluid correction table governs.");

  return {
    delta_T_F,
    factor,
    q_btu_hr,
    tons,
    kw,
    fluid,
    nameplate_tons: np,
    required_gpm,
    warnings,
  };
}

export const chillerTonsExample = {
  // 240 GPM water, 54 F EWT -> 44 F LWT (10 F delta-T):
  // Q = 240 * 500 * 10 = 1,200,000 BTU/hr = 100 tons exactly.
  inputs: { gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "water" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderChillerTons(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Q (BTU/hr) = GPM x factor x delta-T; tons = Q / 12000. The water factor 500 = 60 min/hr x 8.33 lb/gal x 1 BTU/lb-F (first-principles fluid energy balance). Glycol factors per ASHRAE Fundamentals 2021 Ch. 31 (secondary coolants). Free at ashrae.org for the TOC.";
  const gpm = makeNumber("Chilled-water flow (GPM)", "ct3-gpm", { step: "any", min: "0", value: "240" });
  const ewt = makeNumber("Entering water temp (F)", "ct3-ewt", { step: "any", value: "54" });
  const lwt = makeNumber("Leaving water temp (F)", "ct3-lwt", { step: "any", value: "44" });
  const fluid = makeSelect("Fluid", "ct3-fluid", [
    { value: "water", label: "Water (500)", selected: true },
    { value: "glycol_30", label: "30% propylene glycol" },
    { value: "glycol_50", label: "50% propylene glycol" },
  ]);
  const np = makeNumber("Nameplate tons (optional)", "ct3-np", { step: "any", min: "0" });
  for (const f of [gpm, ewt, lwt, fluid, np]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    gpm.input.value = "240"; ewt.input.value = "54"; lwt.input.value = "44";
    fluid.select.value = "water"; np.input.value = ""; update();
  });

  const oDt = makeOutputLine(outputRegion, "Delta-T", "ct3-out-dt");
  const oTons = makeOutputLine(outputRegion, "Cooling capacity", "ct3-out-tons");
  const oReq = makeOutputLine(outputRegion, "Required flow at nameplate", "ct3-out-req");
  const oNote = makeOutputLine(outputRegion, "Notes", "ct3-out-note");

  const update = debounce(() => {
    const r = computeChillerTons({
      gpm: _v16h_readNum(gpm.input),
      ewt_F: _v16h_readNum(ewt.input),
      lwt_F: _v16h_readNum(lwt.input),
      fluid: fluid.select.value,
      nameplate_tons: _v16h_readNum(np.input),
    });
    if (r.error) { oDt.textContent = r.error; oTons.textContent = "-"; oReq.textContent = "-"; oNote.textContent = ""; return; }
    oDt.textContent = fmt(r.delta_T_F, 1) + " F (factor " + r.factor + ")";
    oTons.textContent = fmt(r.tons, 1) + " tons (" + fmt(r.q_btu_hr, 0) + " BTU/hr, " + fmt(r.kw, 1) + " kW)";
    oReq.textContent = r.required_gpm != null ? fmt(r.required_gpm, 1) + " GPM for " + fmt(r.nameplate_tons, 1) + " tons" : "-";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Within the typical chiller delta-T range.";
  }, DEBOUNCE_MS);
  for (const el of [gpm.input, ewt.input, lwt.input, np.input]) el.addEventListener("input", update);
  fluid.select.addEventListener("change", update);
}
HVAC_RENDERERS["chiller-tons"] = _v16h_renderChillerTons;

// --- C.5 Heat exchanger LMTD and effectiveness-NTU -------------------

// Capacity-rate factor per fluid (BTU/hr-F per GPM) = same fluid energy
// balance as the chiller tile. C = GPM * factor.
export const HX_FLUID_FACTORS = CHILLER_FLUID_FACTORS;

// dims: in { args: dimensionless } out: { lmtd_F: T, q_btu_hr: dimensionless, ua_btu_hr_F: dimensionless, effectiveness: dimensionless, ntu: dimensionless }
export function computeHxLmtdNtu({
  config = "counterflow",
  th_in_F = 0,
  th_out_F = 0,
  tc_in_F = 0,
  tc_out_F = 0,
  hot_gpm = 0,
  cold_gpm = 0,
  hot_fluid = "water",
  cold_fluid = "water",
} = {}) {
  const Thi = Number(th_in_F), Tho = Number(th_out_F);
  const Tci = Number(tc_in_F), Tco = Number(tc_out_F);
  const gh = Number(hot_gpm) || 0, gc = Number(cold_gpm) || 0;
  if ([Thi, Tho, Tci, Tco].some((v) => !Number.isFinite(v))) return { error: "Enter all four inlet/outlet temperatures." };
  if (!(Thi > Tho)) return { error: "Hot fluid must cool down (hot inlet above hot outlet)." };
  if (!(Tco > Tci)) return { error: "Cold fluid must warm up (cold outlet above cold inlet)." };
  if (Tco > Thi) return { error: "Cold outlet cannot exceed hot inlet (thermodynamic limit)." };

  let dT1, dT2;
  if (config === "parallel") {
    dT1 = Thi - Tci;
    dT2 = Tho - Tco;
    if (!(dT2 > 0)) return { error: "Parallel-flow outlets cross (hot outlet below cold outlet is impossible)." };
  } else {
    // counter-flow (and a reasonable approximation entry for cross-flow)
    dT1 = Thi - Tco;
    dT2 = Tho - Tci;
    if (!(dT1 > 0) || !(dT2 > 0)) return { error: "Temperature difference at an end is non-positive; check the temperatures." };
  }
  // LMTD; the limit as dT1 -> dT2 is the common difference.
  const lmtd_F = Math.abs(dT1 - dT2) < 1e-9 ? dT1 : (dT1 - dT2) / Math.log(dT1 / dT2);

  const fh = HX_FLUID_FACTORS[hot_fluid] ?? 500;
  const fc = HX_FLUID_FACTORS[cold_fluid] ?? 500;
  const Ch = gh > 0 ? gh * fh : null; // BTU/hr-F
  const Cc = gc > 0 ? gc * fc : null;

  // Heat duty from the hot side if its flow is known, else the cold side.
  let q_btu_hr = null;
  if (Ch != null) q_btu_hr = Ch * (Thi - Tho);
  else if (Cc != null) q_btu_hr = Cc * (Tco - Tci);

  const ua_btu_hr_F = q_btu_hr != null && lmtd_F > 0 ? q_btu_hr / lmtd_F : null;

  let effectiveness = null, ntu = null, cr = null, c_min = null;
  if (Ch != null && Cc != null) {
    c_min = Math.min(Ch, Cc);
    const c_max = Math.max(Ch, Cc);
    cr = c_min / c_max;
    const q_max = c_min * (Thi - Tci);
    effectiveness = q_max > 0 ? q_btu_hr / q_max : null;
    ntu = ua_btu_hr_F != null ? ua_btu_hr_F / c_min : null;
  }

  const warnings = [];
  if (config === "parallel" && effectiveness != null && effectiveness > 0.75) warnings.push("Parallel-flow effectiveness above ~0.75 is unusual; a counter-flow arrangement reaches higher effectiveness for the same area.");
  if (Ch == null && Cc == null) warnings.push("Enter at least one side's flow (GPM) to compute heat duty, UA, effectiveness, and NTU.");

  return {
    config,
    dT1,
    dT2,
    lmtd_F,
    c_hot: Ch,
    c_cold: Cc,
    c_ratio: cr,
    q_btu_hr,
    ua_btu_hr_F,
    effectiveness,
    ntu,
    warnings,
  };
}

export const hxLmtdNtuExample = {
  // Counter-flow water/water: hot 200->100 F at 50 GPM (C_h = 25,000),
  // cold 60->140 F at 62.5 GPM (C_c = 31,250). LMTD = (60-40)/ln(60/40)
  // = 49.33 F; Q = 2,500,000 BTU/hr; UA = 50,683; C_min = 25,000;
  // effectiveness = 2.5e6/3.5e6 = 0.7143; NTU = 2.027.
  inputs: {
    config: "counterflow",
    th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140,
    hot_gpm: 50, cold_gpm: 62.5,
  },
};

const _v16h_HX_FLUIDS = [
  { value: "water", label: "Water" },
  { value: "glycol_30", label: "30% propylene glycol" },
  { value: "glycol_50", label: "50% propylene glycol" },
];

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderHxLmtdNtu(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: LMTD = (dT1 - dT2) / ln(dT1/dT2); Q = C x delta-T with C = GPM x fluid factor; UA = Q / LMTD; effectiveness = Q / (C_min x (Th_in - Tc_in)); NTU = UA / C_min. Per the TEMA standards and standard heat-transfer texts (Incropera, Cengel). Free at tema.org for the standards TOC.";
  const config = makeSelect("Flow configuration", "hx-config", [
    { value: "counterflow", label: "Counter-flow", selected: true },
    { value: "parallel", label: "Parallel-flow" },
  ]);
  const thi = makeNumber("Hot inlet (F)", "hx-thi", { step: "any", value: "200" });
  const tho = makeNumber("Hot outlet (F)", "hx-tho", { step: "any", value: "100" });
  const tci = makeNumber("Cold inlet (F)", "hx-tci", { step: "any", value: "60" });
  const tco = makeNumber("Cold outlet (F)", "hx-tco", { step: "any", value: "140" });
  const hg = makeNumber("Hot flow (GPM)", "hx-hg", { step: "any", min: "0", value: "50" });
  const cg = makeNumber("Cold flow (GPM)", "hx-cg", { step: "any", min: "0", value: "62.5" });
  const hf = makeSelect("Hot fluid", "hx-hf", _v16h_HX_FLUIDS.map((o) => ({ ...o })));
  const cf = makeSelect("Cold fluid", "hx-cf", _v16h_HX_FLUIDS.map((o) => ({ ...o })));
  for (const f of [config, thi, tho, tci, tco, hg, cg, hf, cf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    config.select.value = "counterflow";
    thi.input.value = "200"; tho.input.value = "100"; tci.input.value = "60"; tco.input.value = "140";
    hg.input.value = "50"; cg.input.value = "62.5"; hf.select.value = "water"; cf.select.value = "water"; update();
  });

  const oLmtd = makeOutputLine(outputRegion, "LMTD", "hx-out-lmtd");
  const oQ = makeOutputLine(outputRegion, "Heat duty", "hx-out-q");
  const oUa = makeOutputLine(outputRegion, "Required UA", "hx-out-ua");
  const oEff = makeOutputLine(outputRegion, "Effectiveness / NTU", "hx-out-eff");
  const oNote = makeOutputLine(outputRegion, "Notes", "hx-out-note");

  const update = debounce(() => {
    const r = computeHxLmtdNtu({
      config: config.select.value,
      th_in_F: _v16h_readNum(thi.input), th_out_F: _v16h_readNum(tho.input),
      tc_in_F: _v16h_readNum(tci.input), tc_out_F: _v16h_readNum(tco.input),
      hot_gpm: _v16h_readNum(hg.input), cold_gpm: _v16h_readNum(cg.input),
      hot_fluid: hf.select.value, cold_fluid: cf.select.value,
    });
    if (r.error) { oLmtd.textContent = r.error; oQ.textContent = "-"; oUa.textContent = "-"; oEff.textContent = "-"; oNote.textContent = ""; return; }
    oLmtd.textContent = fmt(r.lmtd_F, 2) + " F";
    oQ.textContent = r.q_btu_hr != null ? fmt(r.q_btu_hr, 0) + " BTU/hr" : "enter a flow";
    oUa.textContent = r.ua_btu_hr_F != null ? fmt(r.ua_btu_hr_F, 0) + " BTU/hr-F" : "-";
    oEff.textContent = r.effectiveness != null ? fmt(r.effectiveness, 3) + " / NTU " + fmt(r.ntu, 2) + " (Cr " + fmt(r.c_ratio, 2) + ")" : "enter both flows";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Sized from the four temperatures and the entered flows.";
  }, DEBOUNCE_MS);
  for (const el of [thi.input, tho.input, tci.input, tco.input, hg.input, cg.input]) el.addEventListener("input", update);
  for (const s of [config.select, hf.select, cf.select]) s.addEventListener("change", update);
}
HVAC_RENDERERS["hx-lmtd-ntu"] = _v16h_renderHxLmtdNtu;

// --- C.9 Air changes per hour from CFM and room volume ---------------

// Typical ACH design targets by occupancy (ASHRAE 62.1-2022 ventilation
// and ASHRAE 170-2021 healthcare). These are comparison bands, not the
// code minimum for a specific project; the AHJ and the governing
// standard's full procedure govern.
export const ACH_TARGET_BANDS = {
  residential: { lo: 0.35, hi: 1, label: "Residential whole-house ventilation (ASHRAE 62.2)" },
  office: { lo: 4, hi: 10, label: "Office / commercial" },
  classroom: { lo: 4, hi: 6, label: "Classroom (ASHRAE 62.1)" },
  lab: { lo: 6, hi: 12, label: "Laboratory" },
  patient_room: { lo: 6, hi: 6, label: "Hospital patient room (ASHRAE 170)" },
  operating_room: { lo: 20, hi: 25, label: "Operating room (ASHRAE 170)" },
};

// dims: in { args: dimensionless } out: { ach: T^-1, net_ach: T^-1, pressurization_cfm: L^3 T^-1 }
export function computeAirChangesPerHour({
  volume_ft3 = 0,
  supply_cfm = 0,
  return_cfm = null,
  occupancy = "classroom",
} = {}) {
  const vol = Number(volume_ft3) || 0;
  const supply = Number(supply_cfm) || 0;
  const ret = return_cfm != null && Number.isFinite(Number(return_cfm)) ? Number(return_cfm) : supply;
  if (!(vol > 0)) return { error: "Enter a positive room volume (ft^3)." };
  if (!(supply > 0)) return { error: "Enter a positive supply CFM." };

  const ach = (supply * 60) / vol;
  // Net delivered air change is governed by the smaller of supply and
  // return; the difference is the pressurization (exfiltration) airflow.
  const net_cfm = Math.min(supply, ret);
  const net_ach = (net_cfm * 60) / vol;
  const pressurization_cfm = supply - ret;

  const band = ACH_TARGET_BANDS[occupancy] ?? ACH_TARGET_BANDS.classroom;
  let comparison;
  if (ach < band.lo) comparison = "below the " + band.lo + "-" + band.hi + " ACH target (" + band.label + ")";
  else if (ach > band.hi) comparison = "above the " + band.lo + "-" + band.hi + " ACH target (" + band.label + ")";
  else comparison = "within the " + band.lo + "-" + band.hi + " ACH target (" + band.label + ")";

  let pressure_state;
  if (pressurization_cfm > 1e-9) pressure_state = "positively pressurized (" + fmt(pressurization_cfm, 0) + " CFM exfiltration)";
  else if (pressurization_cfm < -1e-9) pressure_state = "negatively pressurized (" + fmt(-pressurization_cfm, 0) + " CFM infiltration)";
  else pressure_state = "balanced (supply = return)";

  const warnings = [];
  if (vol < 100) warnings.push("Room volume below 100 ft^3 is outside the typical range; confirm the dimensions.");
  if (ach > 50) warnings.push("ACH above 50 is outside the typical HVAC range; confirm the CFM and volume.");

  return {
    volume_ft3: vol,
    supply_cfm: supply,
    return_cfm: ret,
    ach,
    net_ach,
    pressurization_cfm,
    pressure_state,
    band: band.label,
    comparison,
    warnings,
  };
}

export const airChangesPerHourExample = {
  // 10,000 ft^3 classroom, 1,000 CFM supply, balanced return:
  // ACH = 1000 * 60 / 10000 = 6.0, within the 4-6 classroom target.
  inputs: { volume_ft3: 10000, supply_cfm: 1000, occupancy: "classroom" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderAirChangesPerHour(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ACH = supply CFM x 60 / room volume (ft^3). Net delivered ACH uses the smaller of supply and return; their difference is the pressurization airflow. Target bands per ASHRAE 62.1-2022 (ventilation) and ASHRAE 170-2021 (healthcare). AHJ and the governing standard's full procedure govern. Free at ashrae.org for the TOCs.";
  const vol = makeNumber("Room volume (ft^3)", "ach-vol", { step: "any", min: "0", value: "10000" });
  const supply = makeNumber("Supply CFM", "ach-supply", { step: "any", min: "0", value: "1000" });
  const ret = makeNumber("Return CFM (blank = supply)", "ach-return", { step: "any", min: "0" });
  const occ = makeSelect("Occupancy (comparison band)", "ach-occ", [
    { value: "residential", label: "Residential (0.35-1)" },
    { value: "office", label: "Office (4-10)" },
    { value: "classroom", label: "Classroom (4-6)", selected: true },
    { value: "lab", label: "Laboratory (6-12)" },
    { value: "patient_room", label: "Patient room (6)" },
    { value: "operating_room", label: "Operating room (20-25)" },
  ]);
  for (const f of [vol, supply, ret, occ]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    vol.input.value = "10000"; supply.input.value = "1000"; ret.input.value = "";
    occ.select.value = "classroom"; update();
  });

  const oAch = makeOutputLine(outputRegion, "Air changes per hour", "ach-out-ach");
  const oNet = makeOutputLine(outputRegion, "Net / pressurization", "ach-out-net");
  const oBand = makeOutputLine(outputRegion, "Comparison", "ach-out-band");
  const oNote = makeOutputLine(outputRegion, "Notes", "ach-out-note");

  const update = debounce(() => {
    const r = computeAirChangesPerHour({
      volume_ft3: _v16h_readNum(vol.input),
      supply_cfm: _v16h_readNum(supply.input),
      return_cfm: _v16h_readNum(ret.input),
      occupancy: occ.select.value,
    });
    if (r.error) { oAch.textContent = r.error; oNet.textContent = "-"; oBand.textContent = "-"; oNote.textContent = ""; return; }
    oAch.textContent = fmt(r.ach, 2) + " ACH";
    oNet.textContent = fmt(r.net_ach, 2) + " net ACH; " + r.pressure_state;
    oBand.textContent = r.comparison;
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "ACH compared against the selected occupancy target.";
  }, DEBOUNCE_MS);
  for (const el of [vol.input, supply.input, ret.input]) el.addEventListener("input", update);
  occ.select.addEventListener("change", update);
}
HVAC_RENDERERS["air-changes-hour"] = _v16h_renderAirChangesPerHour;

// --- C.6 Hot water boiler distribution pipe sizing -------------------

// Standard inner diameters (in) by material and nominal trade size.
// Copper Type L (ASTM B88) and Steel Schedule 40 (ASTM A53) are
// published dimensional standards; PEX is ASTM F876 SDR-9 nominal. The
// Hazen-Williams roughness coefficient C is the water-flow value for
// each material (copper/PEX smooth ~150; black steel ~130).
export const BOILER_PIPE_TABLE = {
  copper: {
    label: "Copper Type L",
    c: 150,
    sizes: [
      { size: "1/2", id_in: 0.545 }, { size: "3/4", id_in: 0.785 },
      { size: "1", id_in: 1.025 }, { size: "1-1/4", id_in: 1.265 },
      { size: "1-1/2", id_in: 1.505 }, { size: "2", id_in: 1.985 },
      { size: "2-1/2", id_in: 2.465 }, { size: "3", id_in: 2.945 },
    ],
  },
  steel: {
    label: "Steel Schedule 40",
    c: 130,
    sizes: [
      { size: "1/2", id_in: 0.622 }, { size: "3/4", id_in: 0.824 },
      { size: "1", id_in: 1.049 }, { size: "1-1/4", id_in: 1.380 },
      { size: "1-1/2", id_in: 1.610 }, { size: "2", id_in: 2.067 },
      { size: "2-1/2", id_in: 2.469 }, { size: "3", id_in: 3.068 },
    ],
  },
  pex: {
    label: "PEX (SDR-9)",
    c: 150,
    sizes: [
      { size: "1/2", id_in: 0.475 }, { size: "3/4", id_in: 0.671 },
      { size: "1", id_in: 0.863 }, { size: "1-1/4", id_in: 1.053 },
      { size: "1-1/2", id_in: 1.243 }, { size: "2", id_in: 1.629 },
    ],
  },
};

// Default quiet-operation velocity ceiling (ft/sec) by material.
export const BOILER_PIPE_VMAX = { copper: 4, steel: 6, pex: 3 };

// Velocity (ft/sec) of `gpm` through a pipe of inner diameter `id_in`.
// v = gpm / (2.44778 * d^2): A(ft^2) * 448.831 gal/(ft^3·min) inverted.
function _v16h_pipeVelocityFps(gpm, id_in) {
  return id_in > 0 ? gpm / (2.44778 * id_in * id_in) : Infinity;
}

// dims: in { args: dimensionless } out: { gpm: L^3 T^-1, velocity_fps: L T^-1, friction_ft_per_100ft: dimensionless, head_ft: L }
export function computeBoilerPipeSizing({
  boiler_btu_hr = 0,
  delta_T_F = 20,
  material = "copper",
  max_velocity_fps = null,
  length_ft = 100,
} = {}) {
  const Q = Number(boiler_btu_hr) || 0;
  const dT = Number(delta_T_F) || 0;
  const tbl = BOILER_PIPE_TABLE[material] ?? BOILER_PIPE_TABLE.copper;
  const vmax = max_velocity_fps != null && Number.isFinite(Number(max_velocity_fps)) && Number(max_velocity_fps) > 0
    ? Number(max_velocity_fps)
    : (BOILER_PIPE_VMAX[material] ?? 4);
  const len = Number(length_ft);
  if (!(Q > 0)) return { error: "Enter a positive boiler output (BTU/hr)." };
  if (!(dT > 0)) return { error: "Enter a positive supply-return delta-T (F)." };

  // Hydronic energy balance: GPM = Q / (500 * delta-T) for water.
  const gpm = Q / (500 * dT);

  // Smallest table size whose velocity is at or below the ceiling.
  let pick = null;
  for (const s of tbl.sizes) {
    if (_v16h_pipeVelocityFps(gpm, s.id_in) <= vmax) { pick = s; break; }
  }
  const oversize = pick == null;
  if (oversize) pick = tbl.sizes[tbl.sizes.length - 1];

  const velocity_fps = _v16h_pipeVelocityFps(gpm, pick.id_in);
  // Hazen-Williams head loss (ft) per 100 ft at the recommended size.
  const friction_ft_per_100ft = hazenWilliamsFrictionLoss({
    flow_gpm: gpm, internal_diameter_in: pick.id_in, length_ft: 100, C: tbl.c,
  });
  const runLen = Number.isFinite(len) && len > 0 ? len : 0;
  const head_ft = friction_ft_per_100ft * (runLen / 100);

  const warnings = [];
  if (dT < 10 || dT > 40) warnings.push("Delta-T outside the typical 10-40 F hydronic range; high-delta-T commercial systems exist but are non-default.");
  if (oversize) warnings.push("Flow exceeds the largest tabulated size (3 in) at the velocity ceiling; parallel mains or a larger main are required.");

  return {
    gpm,
    material,
    material_label: tbl.label,
    max_velocity_fps: vmax,
    recommended_size: pick.size,
    recommended_id_in: pick.id_in,
    velocity_fps,
    friction_ft_per_100ft,
    length_ft: runLen,
    head_ft,
    oversize,
    warnings,
  };
}

export const boilerPipeSizingExample = {
  // 200,000 BTU/hr boiler, 20 F delta-T -> 20 GPM. Copper Type L at a
  // 4 ft/s quiet-operation ceiling: 1-1/4 in (ID 1.265) runs 5.11 ft/s
  // (over), so the tile steps up to 1-1/2 in (ID 1.505) at 3.61 ft/s.
  // Hazen-Williams (C=150): 1.48 ft head per 100 ft; 100 ft run -> 1.48 ft.
  inputs: { boiler_btu_hr: 200000, delta_T_F: 20, material: "copper", max_velocity_fps: 4, length_ft: 100 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderBoilerPipeSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GPM = Q / (500 x delta-T) (hydronic water energy balance); velocity = GPM / (2.448 x d^2); the smallest standard size at or below the velocity ceiling is recommended; head loss per Hazen-Williams (public domain, 1905). Per ASHRAE Systems and Equipment 2020 Ch. 13 (hydronic heating) with Bell & Gossett / Taco velocity limits. Free at ashrae.org for the TOC.";
  const q = makeNumber("Boiler output (BTU/hr)", "bp6-q", { step: "any", min: "0", value: "200000" });
  const dt = makeNumber("Supply-return delta-T (F)", "bp6-dt", { step: "any", min: "0", value: "20" });
  const mat = makeSelect("Pipe material", "bp6-mat", [
    { value: "copper", label: "Copper Type L (4 ft/s)", selected: true },
    { value: "steel", label: "Steel Schedule 40 (6 ft/s)" },
    { value: "pex", label: "PEX SDR-9 (3 ft/s)" },
  ]);
  const vmax = makeNumber("Max velocity (ft/s, blank = material default)", "bp6-vmax", { step: "any", min: "0" });
  const len = makeNumber("Run length one-way (ft)", "bp6-len", { step: "any", min: "0", value: "100" });
  for (const f of [q, dt, mat, vmax, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    q.input.value = "200000"; dt.input.value = "20"; mat.select.value = "copper";
    vmax.input.value = "4"; len.input.value = "100"; update();
  });

  const oGpm = makeOutputLine(outputRegion, "Required flow", "bp6-out-gpm");
  const oSize = makeOutputLine(outputRegion, "Recommended size", "bp6-out-size");
  const oVel = makeOutputLine(outputRegion, "Velocity", "bp6-out-vel");
  const oFric = makeOutputLine(outputRegion, "Friction / pump head", "bp6-out-fric");
  const oNote = makeOutputLine(outputRegion, "Notes", "bp6-out-note");

  const update = debounce(() => {
    const r = computeBoilerPipeSizing({
      boiler_btu_hr: _v16h_readNum(q.input),
      delta_T_F: _v16h_readNum(dt.input),
      material: mat.select.value,
      max_velocity_fps: _v16h_readNum(vmax.input),
      length_ft: _v16h_readNum(len.input),
    });
    if (r.error) { oGpm.textContent = r.error; oSize.textContent = "-"; oVel.textContent = "-"; oFric.textContent = "-"; oNote.textContent = ""; return; }
    oGpm.textContent = fmt(r.gpm, 1) + " GPM";
    oSize.textContent = r.recommended_size + " in " + r.material_label + " (ID " + fmt(r.recommended_id_in, 3) + " in)";
    oVel.textContent = fmt(r.velocity_fps, 2) + " ft/s (ceiling " + fmt(r.max_velocity_fps, 0) + " ft/s)";
    oFric.textContent = fmt(r.friction_ft_per_100ft, 2) + " ft/100 ft; pump head " + fmt(r.head_ft, 2) + " ft at " + fmt(r.length_ft, 0) + " ft";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Sized at or below the velocity ceiling; add fitting equivalent length for the final pump head.";
  }, DEBOUNCE_MS);
  for (const el of [q.input, dt.input, vmax.input, len.input]) el.addEventListener("input", update);
  mat.select.addEventListener("change", update);
}
HVAC_RENDERERS["boiler-pipe-sizing"] = _v16h_renderBoilerPipeSizing;

// --- C.8 Compressor short-cycle protection minimum runtime -----------

// Protection thresholds by system type. min_on (oil return / latent
// removal), min_off (high/low pressure equalization), and the
// maximum cycles per hour the cycling-rate parabola peaks at. Inverter
// systems modulate capacity and do not cycle the compressor the same
// way; their limits are per-manufacturer. Copeland Application
// Engineering Bulletin 17-1226 and ASHRAE Fundamentals 2021.
export const COMPRESSOR_CYCLE_LIMITS = {
  single: { label: "Single-stage", min_on_min: 10, min_off_min: 5, max_cph: 6 },
  two_stage: { label: "Two-stage", min_on_min: 8, min_off_min: 5, max_cph: 8 },
  inverter: { label: "VRF / inverter", min_on_min: 4, min_off_min: 3, max_cph: null },
};

// dims: in { args: dimensionless } out: { cph_estimated: T^-1, on_time_min: T, off_time_min: T }
export function computeCompressorShortCycle({
  system_type = "single",
  load_fraction_pct = 50,
  observed_cph = null,
} = {}) {
  const lim = COMPRESSOR_CYCLE_LIMITS[system_type] ?? COMPRESSOR_CYCLE_LIMITS.single;
  const lf = Number(load_fraction_pct);
  if (!Number.isFinite(lf) || lf <= 0 || lf >= 100) return { error: "Enter a load fraction between 0 and 100 percent (the part-load operating point)." };
  const x = lf / 100;

  // Cycling-rate parabola (ASHRAE/AHRI part-load model): the cycle rate
  // peaks at the 50% runtime fraction and falls to zero at 0% and 100%.
  // N(x) = N_max * 4 * x * (1 - x). Inverter systems modulate instead of
  // cycling, so the parabola does not apply.
  let cph_estimated = null, on_time_min = null, off_time_min = null;
  if (lim.max_cph != null) {
    cph_estimated = lim.max_cph * 4 * x * (1 - x);
    if (cph_estimated > 1e-9) {
      on_time_min = (x * 60) / cph_estimated;
      off_time_min = ((1 - x) * 60) / cph_estimated;
    }
  }

  const obs = observed_cph != null && Number.isFinite(Number(observed_cph)) && Number(observed_cph) > 0 ? Number(observed_cph) : null;

  const flags = [];
  let short_cycling = false;
  if (lim.max_cph == null) {
    flags.push("Inverter / VRF systems modulate capacity rather than cycle; minimum on-time " + lim.min_on_min + " min per the manufacturer, no fixed cycles-per-hour ceiling.");
  } else {
    if (on_time_min != null && on_time_min < lim.min_on_min) {
      short_cycling = true;
      flags.push("Estimated on-time " + on_time_min.toFixed(1) + " min is below the " + lim.min_on_min + "-min oil-return / dehumidification runtime; the unit is oversized for this load and will short-cycle.");
    }
    if (off_time_min != null && off_time_min < lim.min_off_min) {
      flags.push("Estimated off-time below the " + lim.min_off_min + "-min pressure-equalization delay; a hard-start anti-short-cycle timer is indicated.");
    }
    if (obs != null && obs > lim.max_cph) {
      short_cycling = true;
      flags.push("Observed " + obs + " cycles/hr exceeds the " + lim.max_cph + " cph ceiling; check the thermostat differential and refrigerant charge.");
    }
  }

  return {
    system_type,
    system_label: lim.label,
    load_fraction_pct: lf,
    min_runtime_min: lim.min_on_min,
    min_off_min: lim.min_off_min,
    max_cph: lim.max_cph,
    cph_estimated,
    on_time_min,
    off_time_min,
    observed_cph: obs,
    short_cycling,
    flags,
  };
}

export const compressorShortCycleExample = {
  // Single-stage at 50% load: the cycling parabola peaks at the 6 cph
  // ceiling, on-time = 0.5 * 60 / 6 = 5 min, below the 10-min oil-return
  // runtime -> short-cycling flagged (the classic oversized-unit case).
  inputs: { system_type: "single", load_fraction_pct: 50 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderCompressorShortCycle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cycle rate N = N_max x 4 x X x (1 - X) where X is the runtime (load) fraction (the ASHRAE/AHRI part-load cycling model, peaking at 50% load); on-time = X x 60 / N. Minimum runtime and pressure-equalization delays per the Copeland Application Engineering Bulletin 17-1226 and ASHRAE Fundamentals 2021. Per-manufacturer guidance governs inverter systems. Free at copeland.com/literature.";
  const sys = makeSelect("System type", "cc8-sys", [
    { value: "single", label: "Single-stage", selected: true },
    { value: "two_stage", label: "Two-stage" },
    { value: "inverter", label: "VRF / inverter" },
  ]);
  const lf = makeNumber("Load fraction (% of design)", "cc8-lf", { step: "any", min: "0", max: "100", value: "50" });
  const obs = makeNumber("Observed cycles/hr (optional)", "cc8-obs", { step: "any", min: "0" });
  for (const f of [sys, lf, obs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    sys.select.value = "single"; lf.input.value = "50"; obs.input.value = ""; update();
  });

  const oCph = makeOutputLine(outputRegion, "Estimated cycles/hr", "cc8-out-cph");
  const oOn = makeOutputLine(outputRegion, "On / off time", "cc8-out-on");
  const oMin = makeOutputLine(outputRegion, "Minimum runtime", "cc8-out-min");
  const oNote = makeOutputLine(outputRegion, "Notes", "cc8-out-note");

  const update = debounce(() => {
    const r = computeCompressorShortCycle({
      system_type: sys.select.value,
      load_fraction_pct: _v16h_readNum(lf.input),
      observed_cph: _v16h_readNum(obs.input),
    });
    if (r.error) { oCph.textContent = r.error; oOn.textContent = "-"; oMin.textContent = "-"; oNote.textContent = ""; return; }
    oCph.textContent = r.cph_estimated != null ? fmt(r.cph_estimated, 2) + " cph (ceiling " + r.max_cph + ")" : "modulates (no fixed ceiling)";
    oOn.textContent = r.on_time_min != null ? fmt(r.on_time_min, 1) + " min on / " + fmt(r.off_time_min, 1) + " min off" : "-";
    oMin.textContent = fmt(r.min_runtime_min, 0) + " min on (oil return), " + fmt(r.min_off_min, 0) + " min off (equalization)";
    oNote.textContent = r.flags.length ? r.flags.join(" ") : "On-time meets the minimum runtime at this load fraction.";
  }, DEBOUNCE_MS);
  for (const el of [lf.input, obs.input]) el.addEventListener("input", update);
  sys.select.addEventListener("change", update);
}
HVAC_RENDERERS["compressor-short-cycle"] = _v16h_renderCompressorShortCycle;

// --- C.10 Humidifier capacity (lb/hr from RH target) -----------------

// Humidity ratio (lb water / lb dry air) from dry-bulb (F) and relative
// humidity (%) at total pressure P (kPa). W = 0.621945 * Pw / (P - Pw),
// Pw = RH * Pws(T). ASHRAE Fundamentals 2021 Ch. 1.
function _v16h_humidityRatioFromRH({ T_db_F, rh_pct, P_kPa }) {
  const T_C = (T_db_F - 32) * 5 / 9;
  const Pws = _v9_satPressure_kPa(T_C);
  const Pw = (rh_pct / 100) * Pws;
  if (Pw >= P_kPa) return null;
  return 0.621945 * Pw / (P_kPa - Pw);
}

// Latent heat of vaporization of water near room temperature (BTU/lb).
const _V16H_HFG_BTU_LB = 1061;

// dims: in { args: dimensionless } out: { addition_lb_hr: M T^-1, gpd: L^3 T^-1, latent_btu_hr: M L^2 T^-3 }
export function computeHumidifierCapacity({
  cfm = 0,
  supply_db_F = 70,
  entering_rh_pct = 20,
  target_rh_pct = 40,
  altitude_ft = 0,
} = {}) {
  const CFM = Number(cfm) || 0;
  const Tdb = Number(supply_db_F);
  const rhIn = Number(entering_rh_pct);
  const rhTgt = Number(target_rh_pct);
  const z = Number(altitude_ft) || 0;
  if (!(CFM > 0)) return { error: "Enter a positive supply airflow (CFM)." };
  if (!Number.isFinite(Tdb)) return { error: "Enter the supply-air dry-bulb temperature (F)." };
  if (!Number.isFinite(rhIn) || !Number.isFinite(rhTgt) || rhIn < 0 || rhTgt <= 0) return { error: "Enter entering and target relative humidity (percent)." };
  if (rhTgt <= rhIn) return { error: "Target RH must exceed entering RH (a humidifier adds moisture)." };

  const P_kPa = _v9_pressureAtAltitude_kPa(z);
  const W_in = _v16h_humidityRatioFromRH({ T_db_F: Tdb, rh_pct: rhIn, P_kPa });
  const W_tgt = _v16h_humidityRatioFromRH({ T_db_F: Tdb, rh_pct: rhTgt, P_kPa });
  if (W_in == null || W_tgt == null) return { error: "Saturation reached at this temperature and pressure; check the inputs." };
  const dW = W_tgt - W_in;

  // Dry-air density (lb/ft^3) at the altitude pressure and dry-bulb temp.
  const T_K = (Tdb - 32) * 5 / 9 + 273.15;
  const rho_kg_m3 = (P_kPa * 1000) / (287.055 * T_K);
  const rho_lb_ft3 = rho_kg_m3 * 0.0624280;

  const m_dot_air_lb_hr = 60 * CFM * rho_lb_ft3;
  const addition_lb_hr = m_dot_air_lb_hr * dW;
  const gpd = (addition_lb_hr * 24) / 8.34;
  const latent_btu_hr = addition_lb_hr * _V16H_HFG_BTU_LB;

  const warnings = [];
  if (rhTgt > 60) warnings.push("Target RH above 60% risks condensation on cold surfaces and windows; confirm the building envelope.");
  if (z < 0 || z > 12000) warnings.push("Altitude " + z + " ft is outside the standard-atmosphere correction's typical range (0-12,000 ft).");

  return {
    cfm: CFM,
    supply_db_F: Tdb,
    altitude_ft: z,
    pressure_kPa: P_kPa,
    W_entering: W_in,
    W_target: W_tgt,
    delta_W: dW,
    air_density_lb_ft3: rho_lb_ft3,
    addition_lb_hr,
    gpd,
    latent_btu_hr,
    warnings,
  };
}

export const humidifierCapacityExample = {
  // 1,000 CFM, 70 F supply, 20% -> 40% RH at sea level. W rises from
  // ~0.00308 to ~0.00620 lb/lb; dry-air density ~0.0749 lb/ft^3;
  // m_dot = 60*1000*0.0749 = 4,493 lb/hr; addition ~13.99 lb/hr ~ 40 gpd;
  // latent ~14,850 BTU/hr.
  inputs: { cfm: 1000, supply_db_F: 70, entering_rh_pct: 20, target_rh_pct: 40, altitude_ft: 0 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderHumidifierCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: addition (lb/hr) = 60 x CFM x rho x (W_target - W_entering), with W from dry-bulb and RH at the altitude-corrected pressure; latent load = addition x 1061 BTU/lb. Per ASHRAE Fundamentals 2021 Ch. 1 (psychrometrics). AHJ and the manufacturer's published humidifier capacity govern actual delivery. Free at ashrae.org for the TOC.";
  const cfm = makeNumber("Supply airflow (CFM)", "hc10-cfm", { step: "any", min: "0", value: "1000" });
  const db = makeNumber("Supply dry-bulb (F)", "hc10-db", { step: "any", value: "70" });
  const rin = makeNumber("Entering RH (%)", "hc10-rin", { step: "any", min: "0", max: "100", value: "20" });
  const rtg = makeNumber("Target RH (%)", "hc10-rtg", { step: "any", min: "0", max: "100", value: "40" });
  const alt = makeNumber("Altitude (ft)", "hc10-alt", { step: "any", value: "0" });
  for (const f of [cfm, db, rin, rtg, alt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    cfm.input.value = "1000"; db.input.value = "70"; rin.input.value = "20"; rtg.input.value = "40"; alt.input.value = "0"; update();
  });

  const oAdd = makeOutputLine(outputRegion, "Moisture addition", "hc10-out-add");
  const oGpd = makeOutputLine(outputRegion, "Daily water", "hc10-out-gpd");
  const oLat = makeOutputLine(outputRegion, "Latent load added", "hc10-out-lat");
  const oNote = makeOutputLine(outputRegion, "Notes", "hc10-out-note");

  const update = debounce(() => {
    const r = computeHumidifierCapacity({
      cfm: _v16h_readNum(cfm.input),
      supply_db_F: _v16h_readNum(db.input),
      entering_rh_pct: _v16h_readNum(rin.input),
      target_rh_pct: _v16h_readNum(rtg.input),
      altitude_ft: _v16h_readNum(alt.input),
    });
    if (r.error) { oAdd.textContent = r.error; oGpd.textContent = "-"; oLat.textContent = "-"; oNote.textContent = ""; return; }
    oAdd.textContent = fmt(r.addition_lb_hr, 1) + " lb/hr (delta-W " + fmt(r.delta_W * 7000, 1) + " gr/lb)";
    oGpd.textContent = fmt(r.gpd, 1) + " gal/day";
    oLat.textContent = fmt(r.latent_btu_hr, 0) + " BTU/hr";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Required steam or evaporative output; the manufacturer's capacity governs delivery.";
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, db.input, rin.input, rtg.input, alt.input]) el.addEventListener("input", update);
}
HVAC_RENDERERS["humidifier-capacity"] = _v16h_renderHumidifierCapacity;

// --- C.7 Filter pressure-drop schedule and fan-energy penalty --------

// Representative clean and change-out (final) pressure drops (in. WC) by
// filter class at a 300 fpm reference face velocity, from typical
// manufacturer cut sheets for 2-4 in pleated media (the MERV rating
// itself is defined by ASHRAE 52.2; the cut sheet, not the test method,
// publishes the pressure drop). These are user-overridable defaults, not
// a fixed reference table; the actual filter's cut sheet governs.
export const FILTER_DP_TABLE = {
  merv8: { label: "MERV 8", clean_dp: 0.20, final_dp: 0.50 },
  merv11: { label: "MERV 11", clean_dp: 0.28, final_dp: 0.60 },
  merv13: { label: "MERV 13", clean_dp: 0.35, final_dp: 0.70 },
  merv16: { label: "MERV 16", clean_dp: 0.55, final_dp: 1.00 },
  hepa: { label: "HEPA", clean_dp: 1.00, final_dp: 2.00 },
};

// Reference face velocity (fpm) the bundled clean/final drops are quoted
// at. Pressure drop through fibrous media scales ~linearly with face
// velocity in the operating range (Darcy regime), so dp(V) = dp_ref *
// V / V_ref is the first-order correction the tile applies.
const _V16H_FILTER_REF_FPM = 300;
// Air horsepower constant: AHP = CFM * dp(in. WC) / 6356.
const _V16H_AHP_CONST = 6356;

// dims: in { args: dimensionless } out: { airflow_cfm: L^3 T^-1, clean_dp_in_wc: dimensionless, final_dp_in_wc: dimensionless, clean_fan_kw: M L^2 T^-3 }
export function computeFilterPressureDrop({
  filter_type = "merv13",
  face_area_ft2 = 0,
  face_velocity_fpm = 300,
  clean_dp_override = null,
  final_dp_override = null,
  fan_total_efficiency = 0.6,
  runtime_hr_per_year = 4000,
  energy_cost_per_kwh = null,
} = {}) {
  const t = FILTER_DP_TABLE[filter_type] ?? FILTER_DP_TABLE.merv13;
  const area = Number(face_area_ft2) || 0;
  const vel = Number(face_velocity_fpm) || 0;
  const eta = Number(fan_total_efficiency) || 0;
  const runtime = Number(runtime_hr_per_year);
  if (!(area > 0)) return { error: "Enter a positive filter face area (ft^2)." };
  if (!(vel > 0)) return { error: "Enter a positive face velocity (fpm)." };
  if (!(eta > 0 && eta <= 1)) return { error: "Fan total efficiency must be between 0 and 1." };

  const airflow_cfm = area * vel;
  // Velocity-scaled clean / final drops (unless the user overrides with a
  // cut-sheet value, which is taken at the actual operating point as-is).
  const velScale = vel / _V16H_FILTER_REF_FPM;
  const clean_dp_in_wc = clean_dp_override != null && Number.isFinite(Number(clean_dp_override)) && Number(clean_dp_override) > 0
    ? Number(clean_dp_override)
    : t.clean_dp * velScale;
  const final_dp_in_wc = final_dp_override != null && Number.isFinite(Number(final_dp_override)) && Number(final_dp_override) > 0
    ? Number(final_dp_override)
    : t.final_dp * velScale;
  // Average drop across a roughly linear loading cycle.
  const avg_dp_in_wc = (clean_dp_in_wc + final_dp_in_wc) / 2;

  // Fan power (kW) attributable to the filter at a given pressure drop:
  // brake HP = (CFM * dp / 6356) / efficiency; kW = HP * 0.7457.
  const fanKw = (dp) => ((airflow_cfm * dp) / _V16H_AHP_CONST / eta) * 0.7457;
  const clean_fan_kw = fanKw(clean_dp_in_wc);
  const final_fan_kw = fanKw(final_dp_in_wc);
  const avg_fan_kw = fanKw(avg_dp_in_wc);

  // Annual fan energy attributable to the filter (averaged over the
  // loading cycle) and the penalty over a clean filter.
  const rt = Number.isFinite(runtime) && runtime > 0 ? runtime : 0;
  const annual_fan_kwh = avg_fan_kw * rt;
  const annual_penalty_kwh = (avg_fan_kw - clean_fan_kw) * rt;
  const cost = energy_cost_per_kwh != null && Number.isFinite(Number(energy_cost_per_kwh)) && Number(energy_cost_per_kwh) >= 0 ? Number(energy_cost_per_kwh) : null;
  const annual_fan_cost = cost != null ? annual_fan_kwh * cost : null;

  const warnings = [];
  if (vel > 500) warnings.push("Face velocity above 500 fpm is outside the typical commercial range; pressure drop and filter loading rise steeply and HEPA stages may need a pre-filter.");
  if (final_dp_in_wc <= clean_dp_in_wc) warnings.push("Change-out pressure drop is at or below the clean drop; enter a higher final (loaded) value.");

  return {
    filter_type,
    filter_label: t.label,
    airflow_cfm,
    face_velocity_fpm: vel,
    clean_dp_in_wc,
    final_dp_in_wc,
    avg_dp_in_wc,
    clean_fan_kw,
    final_fan_kw,
    avg_fan_kw,
    runtime_hr_per_year: rt,
    annual_fan_kwh,
    annual_penalty_kwh,
    annual_fan_cost,
    warnings,
  };
}

export const filterPressureDropExample = {
  // MERV 13, 4 ft^2 face at the 300 fpm reference velocity -> 1,200 CFM.
  // Clean 0.35 in WC, change-out 0.70 in WC. Clean fan power =
  // (1200 * 0.35 / 6356) / 0.6 * 0.7457 = 0.0821 kW.
  inputs: { filter_type: "merv13", face_area_ft2: 4, face_velocity_fpm: 300, fan_total_efficiency: 0.6, runtime_hr_per_year: 4000 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderFilterPressureDrop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: face velocity = CFM / face area; pressure drop scales ~linearly with face velocity (Darcy regime), dp(V) = dp_ref x V / 300 fpm; fan power (kW) = (CFM x dp_in_wc / 6356) / fan efficiency x 0.7457. Clean / change-out drops are representative cut-sheet values; the MERV rating is per ASHRAE 52.2-2017 and the actual filter's cut sheet governs the drop. Free at ashrae.org for the ASHRAE 52.2 TOC.";
  const type = makeSelect("Filter class", "fp7-type", [
    { value: "merv8", label: "MERV 8" },
    { value: "merv11", label: "MERV 11" },
    { value: "merv13", label: "MERV 13", selected: true },
    { value: "merv16", label: "MERV 16" },
    { value: "hepa", label: "HEPA" },
  ]);
  const area = makeNumber("Face area (ft^2)", "fp7-area", { step: "any", min: "0", value: "4" });
  const vel = makeNumber("Face velocity (fpm)", "fp7-vel", { step: "any", min: "0", value: "300" });
  const cleanO = makeNumber("Clean drop override (in WC, optional)", "fp7-clean", { step: "any", min: "0" });
  const finalO = makeNumber("Change-out drop override (in WC, optional)", "fp7-final", { step: "any", min: "0" });
  const eff = makeNumber("Fan total efficiency (0-1)", "fp7-eff", { step: "any", min: "0", max: "1", value: "0.6" });
  const rt = makeNumber("Runtime (hr/yr)", "fp7-rt", { step: "any", min: "0", value: "4000" });
  const cost = makeNumber("Energy cost ($/kWh, optional)", "fp7-cost", { step: "any", min: "0" });
  for (const f of [type, area, vel, cleanO, finalO, eff, rt, cost]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    type.select.value = "merv13"; area.input.value = "4"; vel.input.value = "300";
    cleanO.input.value = ""; finalO.input.value = ""; eff.input.value = "0.6"; rt.input.value = "4000"; cost.input.value = ""; update();
  });

  const oFlow = makeOutputLine(outputRegion, "Airflow", "fp7-out-flow");
  const oDp = makeOutputLine(outputRegion, "Pressure drop (clean -> change-out)", "fp7-out-dp");
  const oFan = makeOutputLine(outputRegion, "Fan power (clean -> change-out)", "fp7-out-fan");
  const oEnergy = makeOutputLine(outputRegion, "Annual fan energy / penalty", "fp7-out-energy");
  const oNote = makeOutputLine(outputRegion, "Notes", "fp7-out-note");

  const update = debounce(() => {
    const r = computeFilterPressureDrop({
      filter_type: type.select.value,
      face_area_ft2: _v16h_readNum(area.input),
      face_velocity_fpm: _v16h_readNum(vel.input),
      clean_dp_override: _v16h_readNum(cleanO.input),
      final_dp_override: _v16h_readNum(finalO.input),
      fan_total_efficiency: _v16h_readNum(eff.input),
      runtime_hr_per_year: _v16h_readNum(rt.input),
      energy_cost_per_kwh: _v16h_readNum(cost.input),
    });
    if (r.error) { oFlow.textContent = r.error; oDp.textContent = "-"; oFan.textContent = "-"; oEnergy.textContent = "-"; oNote.textContent = ""; return; }
    oFlow.textContent = fmt(r.airflow_cfm, 0) + " CFM at " + fmt(r.face_velocity_fpm, 0) + " fpm";
    oDp.textContent = fmt(r.clean_dp_in_wc, 2) + " -> " + fmt(r.final_dp_in_wc, 2) + " in WC (avg " + fmt(r.avg_dp_in_wc, 2) + ")";
    oFan.textContent = fmt(r.clean_fan_kw, 3) + " -> " + fmt(r.final_fan_kw, 3) + " kW";
    oEnergy.textContent = r.runtime_hr_per_year > 0
      ? fmt(r.annual_fan_kwh, 0) + " kWh/yr (loading penalty " + fmt(r.annual_penalty_kwh, 0) + " kWh" + (r.annual_fan_cost != null ? ", " + "$" + fmt(r.annual_fan_cost, 0) : "") + ")"
      : "enter a runtime";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Change the filter when it reaches the change-out drop; the average drop drives the fan-energy cost.";
  }, DEBOUNCE_MS);
  for (const el of [area.input, vel.input, cleanO.input, finalO.input, eff.input, rt.input, cost.input]) el.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
HVAC_RENDERERS["filter-pressure-drop"] = _v16h_renderFilterPressureDrop;

// =====================================================================
// v23 C.1 / C.2: duct velocity pressure + refrigerant line velocity
// =====================================================================
import {
  DEBOUNCE_MS as _V23H_DEB, debounce as _v23h_debounce, fmt as _v23h_fmt,
  makeNumber as _v23h_makeNumber, makeSelect as _v23h_makeSelect,
  attachExampleButton as _v23h_attachEx, makeOutputLine as _v23h_makeOut,
} from "./ui-fields.js";

// --- C.1: Duct velocity pressure (V = 4005*sqrt(VP), sea-level std air) ---
// The 4005 constant assumes standard air density (0.075 lb/ft^3 at sea
// level, 70 F). At altitude or high temperature the density correction is
// not applied; the result is then a standard-air equivalent, flagged.
//
// dims: in { solve_for: dimensionless, vp_inwc: dimensionless, velocity_fpm: L T^-1 } out: { velocity_fpm: L T^-1, vp_inwc: dimensionless }
export function computeDuctVelocityPressure({ solve_for = "velocity", vp_inwc = 0, velocity_fpm = 0 } = {}) {
  const K = 4005;
  if (solve_for === "vp") {
    const v = Number(velocity_fpm) || 0;
    if (!(v > 0 && Number.isFinite(v))) return { error: "Air velocity must be positive (fpm)." };
    const vp = (v / K) ** 2;
    return { solve_for, velocity_fpm: v, vp_inwc: vp };
  }
  // solve_for velocity (default)
  const vp = Number(vp_inwc) || 0;
  if (!(vp > 0 && Number.isFinite(vp))) return { error: "Velocity pressure must be positive (in. w.c.)." };
  const v = K * Math.sqrt(vp);
  return { solve_for: "velocity", vp_inwc: vp, velocity_fpm: v };
}

export const ductVelocityPressureExample = { inputs: { solve_for: "velocity", vp_inwc: 0.25, velocity_fpm: 0 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderDuctVelocityPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the ACCA Manual D / ASHRAE Fundamentals velocity-pressure relation V = 4005 x sqrt(VP) for standard air (0.075 lb/ft^3, sea level). At altitude or high temperature apply a density correction. Public duct-design relation.";
  const mode = _v23h_makeSelect("Solve for", "dvp-mode", [
    { value: "velocity", label: "Velocity from VP", selected: true },
    { value: "vp", label: "VP from velocity" },
  ]);
  const vp = _v23h_makeNumber("Velocity pressure (in. w.c.)", "dvp-vp", { step: "any", min: "0", value: "0.25" });
  vp.input.value = "0.25";
  const vel = _v23h_makeNumber("Air velocity (fpm)", "dvp-vel", { step: "any", min: "0" });
  for (const f of [mode, vp, vel]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { mode.select.value = "velocity"; vp.input.value = "0.25"; vel.input.value = ""; update(); });
  const oOut = _v23h_makeOut(outputRegion, "Result", "dvp-out");
  const oNote = _v23h_makeOut(outputRegion, "Note", "dvp-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const r = computeDuctVelocityPressure({ solve_for: mode.select.value, vp_inwc: readNum(vp.input), velocity_fpm: readNum(vel.input) });
    if (r.error) { oOut.textContent = r.error; oNote.textContent = ""; return; }
    oOut.textContent = r.solve_for === "vp" ? _v23h_fmt(r.vp_inwc, 4) + " in. w.c." : _v23h_fmt(r.velocity_fpm, 0) + " fpm";
    oNote.textContent = "Standard-air constant (4005); apply a density correction at altitude or high temperature.";
  }, _V23H_DEB);
  for (const f of [mode.select, vp.input, vel.input]) f.addEventListener("input", update);
}
HVAC_RENDERERS["duct-velocity-pressure"] = renderDuctVelocityPressure;

// --- C.2: Refrigerant line velocity / oil return ---
// V_fpm = (mass_flow_lb_hr * specific_volume_ft3_lb) / area_ft2 / 60.
// Oil return needs a minimum velocity (higher in a suction riser); above
// ~4000 fpm the line is noisy. Specific volume is user-supplied at the line
// condition; manufacturer line-sizing tables govern.
//
// dims: in { mass_flow_lb_hr: M T^-1, line_id_in: L, specific_volume_ft3_lb: L^3 M^-1, orientation: dimensionless } out: { velocity_fpm: L T^-1 }
export function computeRefrigerantVelocity({ mass_flow_lb_hr = 0, line_id_in = 0, specific_volume_ft3_lb = 0, orientation = "horizontal" } = {}) {
  const m = Number(mass_flow_lb_hr) || 0;
  const d = Number(line_id_in) || 0;
  const sv = Number(specific_volume_ft3_lb) || 0;
  if (!(m > 0 && Number.isFinite(m))) return { error: "Mass flow must be positive (lb/hr)." };
  if (!(d > 0 && Number.isFinite(d))) return { error: "Line inside diameter must be positive (in)." };
  if (!(sv > 0 && Number.isFinite(sv))) return { error: "Specific volume must be positive (ft^3/lb)." };
  const area_ft2 = (Math.PI / 4) * (d / 12) ** 2;
  const q_ft3_hr = m * sv;
  const velocity_fpm = q_ft3_hr / area_ft2 / 60;
  const riser_min = 1500; // suction-riser oil-return minimum (fpm), advisory
  const horiz_min = 700;  // horizontal minimum (fpm), advisory
  const noise_max = 4000;
  const min = orientation === "riser" ? riser_min : horiz_min;
  let verdict = "within oil-return window";
  if (velocity_fpm < min) verdict = "below oil-return minimum (risk of oil trapping)";
  else if (velocity_fpm > noise_max) verdict = "above ~4000 fpm (noise / erosion risk)";
  return { velocity_fpm, area_ft2, oil_return_min_fpm: min, verdict };
}

export const refrigerantVelocityExample = { inputs: { mass_flow_lb_hr: 600, line_id_in: 0.75, specific_volume_ft3_lb: 0.5, orientation: "riser" } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderRefrigerantVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the ASHRAE Refrigeration Handbook line-sizing and oil-return guidance, by name. Refrigerant specific volume at the line condition is user-supplied. Estimate; manufacturer line-sizing tables govern.";
  const mf = _v23h_makeNumber("Mass flow (lb/hr)", "rv-mf", { step: "any", min: "0", value: "600" });
  mf.input.value = "600";
  const id = _v23h_makeNumber("Line inside diameter (in)", "rv-id", { step: "any", min: "0", value: "0.75" });
  id.input.value = "0.75";
  const sv = _v23h_makeNumber("Specific volume (ft^3/lb)", "rv-sv", { step: "any", min: "0", value: "0.5" });
  sv.input.value = "0.5";
  const orient = _v23h_makeSelect("Orientation", "rv-or", [
    { value: "horizontal", label: "Horizontal", selected: true },
    { value: "riser", label: "Suction riser (higher minimum)" },
  ]);
  for (const f of [mf, id, sv, orient]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { mf.input.value = "600"; id.input.value = "0.75"; sv.input.value = "0.5"; orient.select.value = "riser"; update(); });
  const oV = _v23h_makeOut(outputRegion, "Velocity", "rv-out-v");
  const oVerdict = _v23h_makeOut(outputRegion, "Oil-return verdict", "rv-out-verdict");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const r = computeRefrigerantVelocity({ mass_flow_lb_hr: readNum(mf.input), line_id_in: readNum(id.input), specific_volume_ft3_lb: readNum(sv.input), orientation: orient.select.value });
    if (r.error) { oV.textContent = r.error; oVerdict.textContent = ""; return; }
    oV.textContent = _v23h_fmt(r.velocity_fpm, 0) + " fpm";
    oVerdict.textContent = r.verdict + " (min ~ " + r.oil_return_min_fpm + " fpm)";
  }, _V23H_DEB);
  for (const f of [mf.input, id.input, sv.input, orient.select]) f.addEventListener("input", update);
}
HVAC_RENDERERS["refrigerant-velocity"] = renderRefrigerantVelocity;
