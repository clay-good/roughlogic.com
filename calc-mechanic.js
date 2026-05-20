// Group K: Mechanic - Auto, Marine, and Aviation (utilities 195-202).
// See spec-v4.md section 2.2.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// --- 195: Aircraft Weight and Balance ---
//
// CG = total moment / total weight, both expressed in inches aft of datum.
// Pass/fail against user-supplied forward and aft CG limits and max gross.

// dims: in { stations: dimensionless, fwd_cg_limit_in: L, aft_cg_limit_in: L, max_gross_lb: M, mac_le_in: L, mac_chord_in: L }
//        out: { total_weight_lb: M, total_moment_lbin: M L, cg_in: L, within_cg: dimensionless, within_gross: dimensionless, pass: dimensionless, cg_pct_mac: dimensionless, fwd_pct_mac: dimensionless, aft_pct_mac: dimensionless }
// (Weights in lb here are treated as mass `M` (pilot mass / fuel
// mass arithmetic); CG arms in inches are `L`; %MAC is a percentage
// and dimensionless. Stations is a caller-typed array, dimensionless.)
export function computeWeightBalance({ stations = [], fwd_cg_limit_in = 0, aft_cg_limit_in = 0, max_gross_lb = 0, mac_le_in = 0, mac_chord_in = 0 }) {
  if (!Array.isArray(stations) || stations.length === 0) return { error: "Provide at least one station." };
  let total_w = 0;
  let total_m = 0;
  for (const s of stations) {
    const w = Number(s.weight_lb) || 0;
    const a = Number(s.arm_in) || 0;
    if (w < 0) return { error: "Station weight must be non-negative." };
    total_w += w;
    total_m += w * a;
  }
  if (total_w <= 0) return { error: "Total weight must be positive." };
  const cg_in = total_m / total_w;
  const within_cg = (fwd_cg_limit_in <= 0 || aft_cg_limit_in <= 0)
    ? null
    : (cg_in >= fwd_cg_limit_in && cg_in <= aft_cg_limit_in);
  const within_gross = max_gross_lb > 0 ? total_w <= max_gross_lb : null;
  let pass;
  if (within_cg === null && within_gross === null) pass = null;
  else pass = (within_cg !== false) && (within_gross !== false);
  // v8 §C.5: CG as percent of MAC (mean aerodynamic chord). Pilots read CG
  // as %MAC on the published loading graph. %MAC = (cg - LE_MAC) / chord × 100.
  let cg_pct_mac = null;
  let fwd_pct_mac = null;
  let aft_pct_mac = null;
  if (mac_le_in > 0 && mac_chord_in > 0) {
    cg_pct_mac = ((cg_in - mac_le_in) / mac_chord_in) * 100;
    if (fwd_cg_limit_in > 0) fwd_pct_mac = ((fwd_cg_limit_in - mac_le_in) / mac_chord_in) * 100;
    if (aft_cg_limit_in > 0) aft_pct_mac = ((aft_cg_limit_in - mac_le_in) / mac_chord_in) * 100;
  }
  return {
    total_weight_lb: total_w, total_moment_lbin: total_m, cg_in,
    within_cg, within_gross, pass,
    cg_pct_mac, fwd_pct_mac, aft_pct_mac,
  };
}

export const weightBalanceExample = {
  inputs: {
    stations: [
      { name: "Empty", weight_lb: 1500, arm_in: 36 },
      { name: "Pilot", weight_lb: 170, arm_in: 38 },
      { name: "Passenger front", weight_lb: 170, arm_in: 38 },
      { name: "Fuel", weight_lb: 240, arm_in: 48 },
      { name: "Baggage", weight_lb: 50, arm_in: 95 },
    ],
    fwd_cg_limit_in: 35, aft_cg_limit_in: 47, max_gross_lb: 2400,
  },
};

// --- 196: Marine Prop Slip ---

// dims: in { rpm: T^-1, gear_ratio: dimensionless, pitch_in: L, gps_speed_kt: L T^-1 }
//        out: { theoretical_kt: L T^-1, slip_percent: dimensionless, category: dimensionless }
// (RPM is revolutions-per-time so `T^-1`; pitch in inches is length;
// boat speed in knots is length / time; gear ratio is a pure ratio.)
export function computePropSlip({ rpm = 0, gear_ratio = 1, pitch_in = 0, gps_speed_kt = 0 }) {
  if (!(rpm > 0)) return { error: "RPM must be positive." };
  if (!(gear_ratio > 0)) return { error: "Gear ratio must be positive." };
  if (!(pitch_in > 0)) return { error: "Pitch must be positive." };
  if (!(gps_speed_kt >= 0)) return { error: "Speed must be non-negative." };
  const theoretical_kt = (rpm / gear_ratio) * pitch_in / 1056;
  const slip_percent = theoretical_kt > 0 ? ((theoretical_kt - gps_speed_kt) / theoretical_kt) * 100 : 0;
  let category = "unknown";
  if (slip_percent >= 8 && slip_percent <= 18) category = "planing-typical (10-15%)";
  else if (slip_percent >= 22 && slip_percent <= 33) category = "displacement-typical (25-30%)";
  else if (slip_percent < 0) category = "over-pitched / GPS error";
  else if (slip_percent > 35) category = "high slip - check prop";
  else category = "outside typical bands";
  return { theoretical_kt, slip_percent, category };
}

export const propSlipExample = { inputs: { rpm: 4500, gear_ratio: 1.85, pitch_in: 19, gps_speed_kt: 35 } };

// --- 197: Engine Displacement and Compression Ratio ---

// dims: in { bore_in: L, stroke_in: L, cylinders: dimensionless, chamber_cc: L^3, gasket_bore_in: L, gasket_thickness_in: L, deck_clearance_in: L, dome_dish_cc: L^3 }
//        out: { displacement_in3: L^3, displacement_l: L^3, compression_ratio: dimensionless, pump_gas_window: dimensionless, requires_premium_octane: dimensionless }
// (Engine bore / stroke / clearances are lengths `L`; chamber and
// dome volumes are `L^3`; cylinders count is a pure count.)
export function computeDisplacementCR({
  bore_in = 0, stroke_in = 0, cylinders = 0,
  chamber_cc = 0, gasket_bore_in = 0, gasket_thickness_in = 0,
  deck_clearance_in = 0, dome_dish_cc = 0,
}) {
  if (!(bore_in > 0 && stroke_in > 0 && cylinders > 0)) return { error: "Bore / stroke / cylinder count must be positive." };
  // Per-cylinder swept volume (in^3): pi/4 * bore^2 * stroke
  const cyl_vol_in3 = Math.PI * 0.25 * bore_in * bore_in * stroke_in;
  const total_in3 = cyl_vol_in3 * cylinders;
  const liters = total_in3 * 0.0163871;
  // Compression ratio uses cc throughout. 1 in^3 = 16.387 cc.
  const cyl_cc = cyl_vol_in3 * 16.387;
  const gasket_cc = gasket_bore_in > 0 && gasket_thickness_in > 0
    ? Math.PI * 0.25 * gasket_bore_in * gasket_bore_in * gasket_thickness_in * 16.387
    : 0;
  const deck_cc = deck_clearance_in > 0
    ? Math.PI * 0.25 * bore_in * bore_in * deck_clearance_in * 16.387
    : 0;
  // Standard form: CR = (V_cyl + V_chamber + V_gasket + V_deck - V_dome) / (V_chamber + V_gasket + V_deck - V_dome)
  const tdc_volume = chamber_cc + gasket_cc + deck_cc - dome_dish_cc;
  if (tdc_volume <= 0) return { error: "Top-dead-center volume must be positive." };
  const cr = (cyl_cc + tdc_volume) / tdc_volume;
  let pump_gas_window;
  if (cr <= 9.5) pump_gas_window = "low (<= 9.5:1) - 87 octane likely OK";
  else if (cr <= 10.5) pump_gas_window = "moderate (9.5-10.5) - 89-91 octane";
  else if (cr <= 11.5) pump_gas_window = "high (10.5-11.5) - 91-93 octane / aluminum heads";
  else pump_gas_window = "race (> 11.5) - race fuel or e85";
  // v8 §C.5: explicit "likely requires premium octane" flag at CR > 10.5:1.
  const requires_premium_octane = cr > 10.5;
  return {
    displacement_in3: total_in3,
    displacement_l: liters,
    compression_ratio: cr,
    pump_gas_window,
    requires_premium_octane,
  };
}

export const displacementCRExample = {
  inputs: { bore_in: 4.0, stroke_in: 3.48, cylinders: 8, chamber_cc: 64, gasket_bore_in: 4.1, gasket_thickness_in: 0.040, deck_clearance_in: 0.005, dome_dish_cc: 0 },
};

// --- 198: Bolt Stretch and Clamp Load ---

export const FASTENER_MODULUS_PSI = {
  steel: 30000000,
  stainless: 28000000,
  inconel: 31000000,
  titanium: 16500000,
  aluminum: 10000000,
};

// Tensile area lookup (mirrors calc-construction.js); inlined here so the
// stretch tool stands alone.
const STRETCH_TENSILE_AREA_IN2 = {
  0.25: 0.0318, 0.3125: 0.0524, 0.375: 0.0775, 0.4375: 0.1063, 0.5: 0.1419,
  0.5625: 0.1820, 0.625: 0.2260, 0.75: 0.3340, 0.875: 0.4620, 1: 0.6060, 1.25: 0.9690, 1.5: 1.405,
};

// dims: in { diameter_in: L, grip_length_in: L, stretch_thou: L, material: dimensionless, k_factor: dimensionless }
//        out: { clamp_load_lb: M L T^-2, cross_check_torque_ft_lb: M L^2 T^-2, modulus_psi: M L^-1 T^-2 }
// (Clamp load surfaces as force `M L T^-2`; torque is force * length
// so `M L^2 T^-2`; Young's modulus in psi is pressure `M L^-1 T^-2`;
// material categorical and dimensionless k-factor.)
export function computeBoltStretch({ diameter_in = 0, grip_length_in = 0, stretch_thou = 0, material = "steel", k_factor = 0.18 }) {
  const E = FASTENER_MODULUS_PSI[material];
  if (!Number.isFinite(E)) return { error: "Unknown fastener material." };
  if (!(diameter_in > 0)) return { error: "Diameter must be positive." };
  if (!(grip_length_in > 0)) return { error: "Grip length must be positive." };
  if (!(stretch_thou > 0)) return { error: "Stretch must be positive." };
  const A = STRETCH_TENSILE_AREA_IN2[diameter_in];
  if (!Number.isFinite(A)) return { error: "Unsupported diameter." };
  const stretch_in = stretch_thou / 1000;
  const F_lb = (stretch_in * A * E) / grip_length_in;
  const cross_check_torque_ft_lb = (k_factor * diameter_in * F_lb) / 12;
  return { clamp_load_lb: F_lb, cross_check_torque_ft_lb, modulus_psi: E };
}

export const boltStretchExample = { inputs: { diameter_in: 0.5, grip_length_in: 4, stretch_thou: 5, material: "steel", k_factor: 0.18 } };

// --- 199: Driveshaft Critical Speed ---
//
// Euler-Bernoulli first mode for a simply-supported tube:
//   N_crit_rpm = (4.7 / L^2) * sqrt((E*I) / (rho*A)) * (60 / (2*pi))
// Convert to standard public engineering form. We compute in SI then output RPM.

export const SHAFT_MATERIALS = {
  steel:    { E_pa: 200e9, rho_kg_m3: 7850 },
  aluminum: { E_pa: 70e9,  rho_kg_m3: 2700 },
  carbon:   { E_pa: 130e9, rho_kg_m3: 1600 },
};

// dims: in { od_in: L, wall_in: L, length_in: L, material: dimensionless }
//        out: { critical_rpm: T^-1, recommended_max_rpm: T^-1 }
// (Tube outer diameter / wall / length are lengths; critical speed in
// RPM is revolutions per time, so `T^-1`; material is categorical.)
export function computeDriveshaftCritical({ od_in = 0, wall_in = 0, length_in = 0, material = "steel" }) {
  const m = SHAFT_MATERIALS[material];
  if (!m) return { error: "Unknown material." };
  if (!(od_in > 0)) return { error: "OD must be positive." };
  if (!(wall_in > 0 && wall_in < od_in / 2)) return { error: "Wall must be positive and less than half OD." };
  if (!(length_in > 0)) return { error: "Length must be positive." };
  const od_m = od_in * 0.0254;
  const id_m = (od_in - 2 * wall_in) * 0.0254;
  const L_m = length_in * 0.0254;
  // Polar moment for tube I = pi/64 * (od^4 - id^4); cross-section A = pi/4 * (od^2 - id^2)
  const I = (Math.PI / 64) * (Math.pow(od_m, 4) - Math.pow(id_m, 4));
  const A = (Math.PI / 4) * (Math.pow(od_m, 2) - Math.pow(id_m, 2));
  const omega_n = (4.7 / Math.pow(L_m, 2)) * Math.sqrt((m.E_pa * I) / (m.rho_kg_m3 * A));
  const N_crit_rpm = omega_n * 60 / (2 * Math.PI);
  // Public guidance: operate below 0.6-0.75 of critical.
  const safe_rpm = N_crit_rpm * 0.65;
  return { critical_rpm: N_crit_rpm, recommended_max_rpm: safe_rpm };
}

export const driveshaftExample = { inputs: { od_in: 3.5, wall_in: 0.083, length_in: 50, material: "steel" } };

// --- 200: Fuel Energy and Range ---

export const FUEL_PROPERTIES = {
  gasoline_E10: { lhv_btu_gal: 112000, density_lb_gal: 6.1 },
  gasoline_E85: { lhv_btu_gal: 81000,  density_lb_gal: 6.4 },
  diesel_2:     { lhv_btu_gal: 128450, density_lb_gal: 7.0 },
  LPG:          { lhv_btu_gal: 84000,  density_lb_gal: 4.2 },
  CNG:          { lhv_btu_gal: 33000,  density_lb_gal: 1.7 },  // gasoline-gallon-equivalent
  jet_a:        { lhv_btu_gal: 124000, density_lb_gal: 6.7 },
};

// dims: in { fuel: dimensionless, tank_gal: L^3, mpg: dimensionless, mpg_basis: dimensionless, load_factor: dimensionless, price_per_gal: dimensionless }
//        out: { total_btu: M L^2 T^-2, total_kwh: M L^2 T^-2, range_mi: L, derate_flag: dimensionless, fuel_cost_usd: dimensionless, cost_per_mile_usd: dimensionless }
// (Tank capacity in gallons is volume `L^3`; energy in BTU / kWh is
// `M L^2 T^-2`; range in miles is length; miles-per-gallon is
// length / volume = `L^-2`, but the calculator treats it as a
// caller-supplied dimensionless figure-of-merit per spec-v14 §7.1's
// dimensionless-for-monetary-and-ratio convention; cost-per-gal /
// cost-per-mile are monetary, dimensionless.)
export function computeFuelRange({ fuel = "gasoline_E10", tank_gal = 0, mpg = 0, mpg_basis = "gasoline_E10", load_factor = 1.0, price_per_gal = 0 }) {
  const p = FUEL_PROPERTIES[fuel];
  if (!p) return { error: "Unknown fuel." };
  if (!(tank_gal >= 0)) return { error: "Tank must be non-negative." };
  if (!(mpg > 0)) return { error: "MPG must be positive." };
  if (!(load_factor > 0 && load_factor <= 1.5)) return { error: "Load factor must be 0-1.5." };
  const total_btu = tank_gal * p.lhv_btu_gal;
  const total_kwh = total_btu * 0.0002930711;
  const range_mi = tank_gal * mpg * load_factor;
  const derate_flag = mpg_basis !== fuel ? "MPG basis differs from selected fuel - estimated range may be off" : "ok";
  // v8 §C.5: optional cost output. Tank fill cost when $/gal supplied.
  const fuel_cost_usd = price_per_gal > 0 ? tank_gal * price_per_gal : null;
  const cost_per_mile_usd = price_per_gal > 0 && range_mi > 0 ? fuel_cost_usd / range_mi : null;
  return { total_btu, total_kwh, range_mi, derate_flag, fuel_cost_usd, cost_per_mile_usd };
}

export const fuelRangeExample = { inputs: { fuel: "gasoline_E10", tank_gal: 18, mpg: 28, mpg_basis: "gasoline_E10", load_factor: 1.0 } };

// --- 201: Tire Size and Effective Gear Ratio ---

// Parses metric (P285/75R17) and imperial (33x12.50R17) sizes to a diameter
// in inches. Returns NaN for unparseable strings.
// dims: in { str: dimensionless } out: diameter_in: L
// (Input is a tire-size string (e.g. "265/70R17") parsed to an outer
// diameter in inches; the string is categorical / dimensionless.)
export function parseTireSize(str) {
  if (typeof str !== "string") return NaN;
  const s = str.trim().toUpperCase();
  // Metric: WIDTH/RATIO R RIM (e.g. 285/75R17). Imperial: OD x WIDTH R RIM (33x12.50R17).
  const metric = s.match(/^P?(\d{2,3})\/(\d{2,3})R(\d{1,2})$/);
  if (metric) {
    const width_mm = parseFloat(metric[1]);
    const ratio = parseFloat(metric[2]);
    const rim_in = parseFloat(metric[3]);
    const sidewall_in = (width_mm * (ratio / 100)) / 25.4;
    return rim_in + 2 * sidewall_in;
  }
  const imperial = s.match(/^(\d{2}(?:\.\d+)?)X(\d{1,2}(?:\.\d+)?)R(\d{1,2})$/);
  if (imperial) {
    return parseFloat(imperial[1]);
  }
  return NaN;
}

// dims: in { original_size: dimensionless, new_size: dimensionless, axle_ratio: dimensionless, top_gear_ratio: dimensionless, target_rpm: T^-1 }
//        out: { diameter_orig_in: L, diameter_new_in: L, rev_per_mi_orig: L^-1, rev_per_mi_new: L^-1, effective_orig: dimensionless, effective_new: dimensionless, cruise_mph: L T^-1, recommended_axle_ratio: dimensionless }
// (Tire-size strings are categorical; axle / gear ratios are pure
// ratios; target RPM is `T^-1`; cruise mph is length / time;
// revolutions-per-mile is one revolution (dimensionless) per length,
// so `L^-1` per spec-v14 §7.1.)
export function computeTireGearing({ original_size = "", new_size = "", axle_ratio = 0, top_gear_ratio = 1, target_rpm = 1800 }) {
  const od_orig = parseTireSize(original_size);
  const od_new = parseTireSize(new_size);
  if (!Number.isFinite(od_orig) || od_orig <= 0) return { error: "Original tire size unparseable." };
  if (!Number.isFinite(od_new) || od_new <= 0) return { error: "New tire size unparseable." };
  if (!(axle_ratio > 0)) return { error: "Axle ratio must be positive." };
  if (!(top_gear_ratio > 0)) return { error: "Top gear ratio must be positive." };
  if (!(target_rpm > 0)) return { error: "Target RPM must be positive." };
  const rev_per_mi_orig = 63360 / (Math.PI * od_orig);
  const rev_per_mi_new = 63360 / (Math.PI * od_new);
  const effective_orig = axle_ratio * top_gear_ratio;
  const effective_new = effective_orig * (od_orig / od_new);
  const cruise_mph = (target_rpm * 60) / (rev_per_mi_new * top_gear_ratio * axle_ratio);
  const candidates = [3.73, 4.10, 4.56, 4.88, 5.13, 5.38];
  const recommended = candidates
    .map((ratio) => ({ ratio, effective: ratio * top_gear_ratio * (od_orig / od_new), delta: Math.abs(ratio * top_gear_ratio * (od_orig / od_new) - effective_orig) }))
    .sort((a, b) => a.delta - b.delta)[0];
  return {
    diameter_orig_in: od_orig,
    diameter_new_in: od_new,
    rev_per_mi_orig, rev_per_mi_new,
    effective_orig, effective_new,
    cruise_mph,
    recommended_axle_ratio: recommended.ratio,
  };
}

export const tireGearingExample = { inputs: { original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 } };

// --- 202: Brake Pad Lifespan and Heat Capacity ---

export const PAD_WEAR_RATE = {
  organic:       { mm_per_kJ: 0.000020, label: "Organic / NAO" },
  semi_metallic: { mm_per_kJ: 0.000012, label: "Semi-metallic" },
  ceramic:       { mm_per_kJ: 0.000009, label: "Ceramic" },
};

// dims: in { vehicle_weight_lb: M, speed_delta_mph: L T^-1, stops_per_mile: L^-1, pad_thickness_mm: L, pad_material: dimensionless, rotor_mass_lb: M, pad_set_cost_usd: dimensionless }
//        out: { ke_J: M L^2 T^-2, ke_kJ: M L^2 T^-2, rotor_temp_rise_C: T, wear_per_stop_mm: L, stops_until_worn: dimensionless, miles_until_worn: L, pad_label: dimensionless, cost_per_100k_miles_usd: dimensionless }
// (Masses surface as `M`; speed is `L T^-1`; stops-per-mile is one
// stop (dimensionless) per length, so `L^-1`; kinetic energy is
// `M L^2 T^-2`; pad thickness and miles-until-worn are lengths;
// temperature rise is `T` per spec-v14 §7.1's T/temperature shortcut;
// pad-set cost is monetary and therefore dimensionless.)
export function computeBrakePadLife({ vehicle_weight_lb = 0, speed_delta_mph = 0, stops_per_mile = 1, pad_thickness_mm = 12, pad_material = "ceramic", rotor_mass_lb = 18, pad_set_cost_usd = 0 }) {
  const w = PAD_WEAR_RATE[pad_material];
  if (!w) return { error: "Unknown pad material." };
  if (!(vehicle_weight_lb > 0)) return { error: "Vehicle weight must be positive." };
  if (!(speed_delta_mph > 0)) return { error: "Speed delta must be positive." };
  if (!(stops_per_mile >= 0)) return { error: "Stops per mile must be non-negative." };
  if (!(pad_thickness_mm > 0)) return { error: "Pad thickness must be positive." };
  // Kinetic energy: KE = 0.5 * m * v^2. Convert lb -> kg, mph -> m/s.
  const m_kg = vehicle_weight_lb * 0.4536;
  const v_ms = speed_delta_mph * 0.4470;
  const ke_J = 0.5 * m_kg * v_ms * v_ms;
  const ke_kJ = ke_J / 1000;
  // Rotor temp rise per stop (rough): assume ~20% of energy absorbed by rotor; cast iron specific heat ~ 460 J/(kg*K).
  const rotor_kg = rotor_mass_lb * 0.4536;
  const rotor_temp_rise_C = (0.20 * ke_J) / (rotor_kg * 460);
  // Pad life: each pad covers ~ ke_kJ * wear_rate per stop.
  const wear_per_stop_mm = ke_kJ * w.mm_per_kJ;
  const stops_until_worn = pad_thickness_mm / wear_per_stop_mm;
  const miles_until_worn = stops_per_mile > 0 ? stops_until_worn / stops_per_mile : Infinity;
  // v8 §C.5: optional cost output. cost_per_100k_miles = $/set × 100000 / miles_until_worn.
  const cost_per_100k_miles_usd = pad_set_cost_usd > 0 && Number.isFinite(miles_until_worn) && miles_until_worn > 0
    ? (pad_set_cost_usd * 100000) / miles_until_worn
    : null;
  return { ke_J, ke_kJ, rotor_temp_rise_C, wear_per_stop_mm, stops_until_worn, miles_until_worn, pad_label: w.label, cost_per_100k_miles_usd };
}

export const brakePadLifeExample = { inputs: { vehicle_weight_lb: 3500, speed_delta_mph: 30, stops_per_mile: 0.4, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 } };

// --- Renderers ---

function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id);
      else if (f.kind === "text") {
        const wrap = document.createElement("div"); wrap.className = "field";
        const lab = document.createElement("label"); lab.htmlFor = f.id; lab.textContent = f.label;
        const input = document.createElement("input"); input.type = "text"; input.id = f.id; input.autocomplete = "off";
        wrap.appendChild(lab); wrap.appendChild(input);
        field = { wrap, input };
      }
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else if (f.kind === "text") params[f.key] = fields[f.key].input.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
    }
  };
}

function renderWeightBalance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Pilot-in-command and the airplane flight manual govern. Math aid only; verify against the AFM loading graph or table. Citation: per FAA AC 91-23A (Pilot's Weight and Balance Handbook). Free at faa.gov/regulations_policies/advisory_circulars.";
  attachExampleButton(inputRegion, () => fillExample(weightBalanceExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const w = document.createElement("input"); w.type = "number"; w.step = "any"; w.placeholder = "Weight (lb)";
    const a = document.createElement("input"); a.type = "number"; a.step = "any"; a.placeholder = "Arm (in)";
    wrap.appendChild(w); wrap.appendChild(a); list.appendChild(wrap);
    w.addEventListener("input", update); a.addEventListener("input", update);
    rows.push({ w, a });
  }
  const fwd = makeNumber("Forward CG limit (in)", "wb-fwd", { step: "any", min: "0" });
  const aft = makeNumber("Aft CG limit (in)", "wb-aft", { step: "any", min: "0" });
  const mg = makeNumber("Max gross (lb)", "wb-mg", { step: "any", min: "0" });
  // v8 §C.5: optional MAC LE + chord so the result also reports CG as %MAC,
  // which is how pilots read CG on the published loading graph.
  const macLe = makeNumber("MAC leading-edge (in, optional)", "wb-macle", { step: "any", min: "0" });
  const macCh = makeNumber("MAC chord (in, optional)", "wb-macch", { step: "any", min: "0" });
  for (const f of [fwd, aft, mg, macLe, macCh]) inputRegion.appendChild(f.wrap);
  const oW = makeOutputLine(outputRegion, "Total weight", "wb-out-w");
  const oM = makeOutputLine(outputRegion, "Total moment", "wb-out-m");
  const oCG = makeOutputLine(outputRegion, "CG (in aft of datum)", "wb-out-cg");
  const oMAC = makeOutputLine(outputRegion, "CG as %MAC (if MAC supplied)", "wb-out-mac");
  const oP = makeOutputLine(outputRegion, "Pass / fail", "wb-out-p");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      if (v.stations[i]) { rows[i].w.value = v.stations[i].weight_lb; rows[i].a.value = v.stations[i].arm_in; }
    }
    fwd.input.value = v.fwd_cg_limit_in; aft.input.value = v.aft_cg_limit_in; mg.input.value = v.max_gross_lb;
    if (v.mac_le_in !== undefined) macLe.input.value = v.mac_le_in;
    if (v.mac_chord_in !== undefined) macCh.input.value = v.mac_chord_in;
    update();
  }
  function update() {
    const stations = rows.map((r) => ({ weight_lb: Number(r.w.value) || 0, arm_in: Number(r.a.value) || 0 })).filter((s) => s.weight_lb > 0);
    if (stations.length === 0) { for (const o of [oW, oM, oCG, oMAC, oP]) o.textContent = "-"; return; }
    const r = computeWeightBalance({
      stations,
      fwd_cg_limit_in: Number(fwd.input.value) || 0,
      aft_cg_limit_in: Number(aft.input.value) || 0,
      max_gross_lb: Number(mg.input.value) || 0,
      mac_le_in: Number(macLe.input.value) || 0,
      mac_chord_in: Number(macCh.input.value) || 0,
    });
    if (r.error) { oW.textContent = r.error; oM.textContent = "-"; oCG.textContent = "-"; oMAC.textContent = "-"; oP.textContent = "-"; return; }
    oW.textContent = fmt(r.total_weight_lb, 1) + " lb";
    oM.textContent = fmt(r.total_moment_lbin, 1) + " lb-in";
    oCG.textContent = fmt(r.cg_in, 2) + " in";
    if (r.cg_pct_mac === null) oMAC.textContent = "-";
    else {
      const fwdStr = r.fwd_pct_mac !== null ? fmt(r.fwd_pct_mac, 1) + "% MAC" : "-";
      const aftStr = r.aft_pct_mac !== null ? fmt(r.aft_pct_mac, 1) + "% MAC" : "-";
      oMAC.textContent = fmt(r.cg_pct_mac, 1) + "% MAC (envelope " + fwdStr + " to " + aftStr + ")";
    }
    oP.textContent = r.pass === null ? "(set CG / gross limits)" : (r.pass ? "PASS" : "FAIL - outside CG / gross envelope");
  }
  for (const el of [fwd.input, aft.input, mg.input, macLe.input, macCh.input]) el.addEventListener("input", update);
}

const renderPropSlip = _simpleRenderer({
  citation: "Citation: Public marine engineering practice. Theoretical kt = (RPM/gear) * pitch / 1056. Slip percent = (theoretical - actual) / theoretical * 100.",
  example: propSlipExample.inputs,
  fields: [
    { key: "rpm", label: "Engine RPM", kind: "number" },
    { key: "gear_ratio", label: "Gear ratio", kind: "number", default: 1.85 },
    { key: "pitch_in", label: "Prop pitch (in)", kind: "number" },
    { key: "gps_speed_kt", label: "GPS speed (kt)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "ps-out-t", label: "Theoretical speed", value: (r) => fmt(r.theoretical_kt, 2) + " kt" },
    { key: "s", id: "ps-out-s", label: "Slip", value: (r) => fmt(r.slip_percent, 1) + " %" },
    { key: "c", id: "ps-out-c", label: "Category", value: (r) => r.category },
  ],
  compute: computePropSlip,
});

const renderDisplacementCR = _simpleRenderer({
  citation: "Citation: Public engine geometry. Displacement = pi/4 * bore^2 * stroke * cylinders. CR = (V_cyl + V_TDC) / V_TDC where V_TDC = chamber + gasket + deck - dome.",
  example: displacementCRExample.inputs,
  fields: [
    { key: "bore_in", label: "Bore (in)", kind: "number" },
    { key: "stroke_in", label: "Stroke (in)", kind: "number" },
    { key: "cylinders", label: "Cylinders", kind: "number" },
    { key: "chamber_cc", label: "Combustion chamber (cc)", kind: "number" },
    { key: "gasket_bore_in", label: "Gasket bore (in)", kind: "number" },
    { key: "gasket_thickness_in", label: "Gasket thickness (in)", kind: "number" },
    { key: "deck_clearance_in", label: "Deck clearance (in)", kind: "number" },
    { key: "dome_dish_cc", label: "Dome (+) / dish (-) cc", kind: "number" },
  ],
  outputs: [
    { key: "ci", id: "dc-out-ci", label: "Displacement", value: (r) => fmt(r.displacement_in3, 1) + " in^3 / " + fmt(r.displacement_l, 2) + " L" },
    { key: "cr", id: "dc-out-cr", label: "Compression ratio", value: (r) => fmt(r.compression_ratio, 2) + ":1" },
    { key: "g", id: "dc-out-g", label: "Pump-gas window", value: (r) => r.pump_gas_window },
    { key: "po", id: "dc-out-po", label: "Premium octane required", value: (r) => r.requires_premium_octane ? "YES - likely requires premium octane" : "no - regular pump gas window" },
  ],
  compute: computeDisplacementCR,
});

const renderBoltStretch = _simpleRenderer({
  citation: "Citation: Public engineering practice. Clamp load F = (stretch * area * E) / grip. Cross-check torque from utility 153 short form.",
  example: boltStretchExample.inputs,
  fields: [
    { key: "diameter_in", label: "Bolt diameter (in)", kind: "number" },
    { key: "grip_length_in", label: "Grip length (in)", kind: "number" },
    { key: "stretch_thou", label: "Target stretch (0.001 in)", kind: "number" },
    { key: "material", label: "Fastener material", kind: "select", options: Object.keys(FASTENER_MODULUS_PSI).map((k) => ({ value: k, label: k })) },
    { key: "k_factor", label: "Torque K-factor", kind: "number", default: 0.18 },
  ],
  outputs: [
    { key: "f", id: "bs-out-f", label: "Clamp load", value: (r) => fmt(r.clamp_load_lb, 0) + " lb" },
    { key: "t", id: "bs-out-t", label: "Cross-check torque", value: (r) => fmt(r.cross_check_torque_ft_lb, 1) + " ft-lb" },
  ],
  compute: computeBoltStretch,
});

const renderDriveshaft = _simpleRenderer({
  citation: "Citation: Public Euler-Bernoulli derivation. Operate below 0.6-0.75 of critical RPM.",
  example: driveshaftExample.inputs,
  fields: [
    { key: "od_in", label: "OD (in)", kind: "number" },
    { key: "wall_in", label: "Wall (in)", kind: "number" },
    { key: "length_in", label: "Length between U-joints (in)", kind: "number" },
    { key: "material", label: "Material", kind: "select", options: Object.keys(SHAFT_MATERIALS).map((k) => ({ value: k, label: k })) },
  ],
  outputs: [
    { key: "c", id: "ds-out-c", label: "Critical RPM", value: (r) => fmt(r.critical_rpm, 0) + " rpm" },
    { key: "s", id: "ds-out-s", label: "Recommended max (0.65x)", value: (r) => fmt(r.recommended_max_rpm, 0) + " rpm" },
  ],
  compute: computeDriveshaftCritical,
});

const renderFuelRange = _simpleRenderer({
  citation: "Citation: DOE EERE fuel-property tables by name only. Energy = tank * LHV; range = tank * mpg * load_factor. Optional $/gal computes fuel cost and cost per mile (never persisted, never reported).",
  example: fuelRangeExample.inputs,
  fields: [
    { key: "fuel", label: "Fuel", kind: "select", options: Object.keys(FUEL_PROPERTIES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "tank_gal", label: "Tank (gal)", kind: "number" },
    { key: "mpg", label: "MPG", kind: "number" },
    { key: "mpg_basis", label: "MPG basis fuel", kind: "select", options: Object.keys(FUEL_PROPERTIES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "load_factor", label: "Load factor (0-1.5)", kind: "number", default: 1.0 },
    // v8 §C.5 + §D.1: optional cost input. The simple renderer treats this
    // as a numeric field; the user leaves it blank to skip the cost output.
    { key: "price_per_gal", label: "Price ($/gal, optional)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "b", id: "fr-out-b", label: "Total energy", value: (r) => fmt(r.total_btu, 0) + " BTU / " + fmt(r.total_kwh, 1) + " kWh" },
    { key: "r", id: "fr-out-r", label: "Theoretical range", value: (r) => fmt(r.range_mi, 0) + " mi" },
    { key: "fc", id: "fr-out-fc", label: "Fuel cost (if $/gal supplied)", value: (r) => r.fuel_cost_usd === null ? "-" : "$" + fmt(r.fuel_cost_usd, 2) + " / tank" },
    { key: "cm", id: "fr-out-cm", label: "Cost per mile", value: (r) => r.cost_per_mile_usd === null ? "-" : "$" + fmt(r.cost_per_mile_usd, 4) + " / mi" },
    { key: "d", id: "fr-out-d", label: "Notes", value: (r) => r.derate_flag },
  ],
  compute: computeFuelRange,
});

const renderTireGearing = _simpleRenderer({
  citation: "Citation: Public physical geometry. rev/mi = 63360 / (pi * OD_in). Effective ratio scales by OD_orig / OD_new.",
  example: tireGearingExample.inputs,
  fields: [
    { key: "original_size", label: "Original tire size", kind: "text" },
    { key: "new_size", label: "New tire size", kind: "text" },
    { key: "axle_ratio", label: "Axle ratio", kind: "number" },
    { key: "top_gear_ratio", label: "Top gear ratio", kind: "number", default: 0.69 },
    { key: "target_rpm", label: "Target cruise RPM", kind: "number", default: 1800 },
  ],
  outputs: [
    { key: "do", id: "tg-out-do", label: "Diameter (in)", value: (r) => fmt(r.diameter_orig_in, 2) + " orig / " + fmt(r.diameter_new_in, 2) + " new" },
    { key: "ro", id: "tg-out-ro", label: "Rev/mi", value: (r) => fmt(r.rev_per_mi_orig, 0) + " orig / " + fmt(r.rev_per_mi_new, 0) + " new" },
    { key: "eo", id: "tg-out-eo", label: "Effective ratio", value: (r) => fmt(r.effective_orig, 3) + " orig / " + fmt(r.effective_new, 3) + " new" },
    { key: "c", id: "tg-out-c", label: "Cruise speed at target RPM", value: (r) => fmt(r.cruise_mph, 1) + " mph" },
    { key: "rec", id: "tg-out-rec", label: "Recommended axle ratio", value: (r) => String(r.recommended_axle_ratio) },
  ],
  compute: computeTireGearing,
});

const renderBrakePadLife = _simpleRenderer({
  citation: "Notice: Estimate only. Manufacturer and AHJ govern. Citation: KE = 0.5 m v^2. Wear-rate benchmarks from public engineering practice.",
  example: brakePadLifeExample.inputs,
  fields: [
    { key: "vehicle_weight_lb", label: "Vehicle weight (lb)", kind: "number" },
    { key: "speed_delta_mph", label: "Speed delta per stop (mph)", kind: "number" },
    { key: "stops_per_mile", label: "Stops per mile", kind: "number", default: 0.4 },
    { key: "pad_thickness_mm", label: "Pad thickness (mm)", kind: "number", default: 12 },
    { key: "pad_material", label: "Pad material", kind: "select", options: Object.keys(PAD_WEAR_RATE).map((k) => ({ value: k, label: PAD_WEAR_RATE[k].label })) },
    { key: "rotor_mass_lb", label: "Rotor mass (lb)", kind: "number", default: 18 },
    { key: "pad_set_cost_usd", label: "Pad-set cost ($, optional)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "ke", id: "bp-out-ke", label: "KE per stop", value: (r) => fmt(r.ke_kJ, 1) + " kJ" },
    { key: "tr", id: "bp-out-tr", label: "Rotor temp rise per stop", value: (r) => fmt(r.rotor_temp_rise_C, 1) + " C" },
    { key: "w", id: "bp-out-w", label: "Wear per stop", value: (r) => fmt(r.wear_per_stop_mm * 1000, 3) + " micrometres" },
    { key: "m", id: "bp-out-m", label: "Estimated pad life", value: (r) => Number.isFinite(r.miles_until_worn) ? fmt(r.miles_until_worn, 0) + " mi" : "n/a" },
    { key: "c", id: "bp-out-c", label: "Cost per 100k mi (if $/set supplied)", value: (r) => r.cost_per_100k_miles_usd === null ? "-" : "$" + fmt(r.cost_per_100k_miles_usd, 2) + " / 100,000 mi" },
  ],
  compute: computeBrakePadLife,
});

export const MECHANIC_RENDERERS = {
  "weight-balance":   renderWeightBalance,
  "prop-slip":        renderPropSlip,
  "displacement-cr":  renderDisplacementCR,
  "bolt-stretch":     renderBoltStretch,
  "driveshaft-crit":  renderDriveshaft,
  "fuel-range":       renderFuelRange,
  "tire-gearing":     renderTireGearing,
  "brake-pad-life":   renderBrakePadLife,
};
