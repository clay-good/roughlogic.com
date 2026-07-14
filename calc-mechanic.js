// Group K: Mechanic - Auto, Marine, and Aviation (utilities 195-202).
// See spec-v4.md section 2.2.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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


// --- 196: Marine Prop Slip ---

// dims: in { rpm: T^-1, gear_ratio: dimensionless, pitch_in: L, gps_speed_kt: L T^-1 }
//        out: { theoretical_kt: L T^-1, slip_percent: dimensionless, category: dimensionless }
// (RPM is revolutions-per-time so `T^-1`; pitch in inches is length;
// boat speed in knots is length / time; gear ratio is a pure ratio.)
export function computePropSlip({ rpm = 0, gear_ratio = 1, pitch_in = 0, gps_speed_kt = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { fuel: dimensionless, tank_gal: L^3, mpg: dimensionless, mpg_basis: dimensionless, load_factor: dimensionless, price_per_gal: dimensionless, solve_for: dimensionless, target_range_mi: L }
//        out: { total_btu: M L^2 T^-2, total_kwh: M L^2 T^-2, range_mi: L, derate_flag: dimensionless, fuel_cost_usd: dimensionless, cost_per_mile_usd: dimensionless, solved_mpg: dimensionless, solved_tank_gal: L^3 }
// (Tank capacity in gallons is volume `L^3`; energy in BTU / kWh is
// `M L^2 T^-2`; range in miles is length; miles-per-gallon is
// length / volume = `L^-2`, but the calculator treats it as a
// caller-supplied dimensionless figure-of-merit per spec-v14 §7.1's
// dimensionless-for-monetary-and-ratio convention; cost-per-gal /
// cost-per-mile are monetary, dimensionless.)
export function computeFuelRange({ fuel = "gasoline_E10", tank_gal = 0, mpg = 0, mpg_basis = "gasoline_E10", load_factor = 1.0, price_per_gal = 0, solve_for = "range", target_range_mi = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p = FUEL_PROPERTIES[fuel];
  if (!p) return { error: "Unknown fuel." };
  if (!(load_factor > 0 && load_factor <= 1.5)) return { error: "Load factor must be 0-1.5." };
  // v23 EN.13: solve-for-MPG / solve-for-tank inverses from a known range.
  // The inverse resolves the missing term, then the default computation
  // runs unchanged so every mode returns the same full result shape.
  let tank = Number(tank_gal) || 0;
  let mpgv = Number(mpg) || 0;
  if (solve_for === "mpg") {
    const R = Number(target_range_mi) || 0;
    if (!(tank > 0 && Number.isFinite(tank))) return { error: "Tank must be positive to solve for MPG." };
    if (!(R > 0 && Number.isFinite(R))) return { error: "Range must be positive (mi)." };
    mpgv = R / (tank * load_factor);
  } else if (solve_for === "tank") {
    const R = Number(target_range_mi) || 0;
    if (!(mpgv > 0 && Number.isFinite(mpgv))) return { error: "MPG must be positive to solve for tank." };
    if (!(R > 0 && Number.isFinite(R))) return { error: "Range must be positive (mi)." };
    tank = R / (mpgv * load_factor);
  }
  if (!(tank >= 0 && Number.isFinite(tank))) return { error: "Tank must be non-negative." };
  if (!(mpgv > 0 && Number.isFinite(mpgv))) return { error: "MPG must be positive." };
  const tank_gal_r = tank, mpg_r = mpgv;
  const total_btu = tank_gal_r * p.lhv_btu_gal;
  const total_kwh = total_btu * 0.0002930711;
  const range_mi = tank_gal_r * mpg_r * load_factor;
  const derate_flag = mpg_basis !== fuel ? "MPG basis differs from selected fuel - estimated range may be off" : "ok";
  // v8 §C.5: optional cost output. Tank fill cost when $/gal supplied.
  const fuel_cost_usd = price_per_gal > 0 ? tank_gal_r * price_per_gal : null;
  const cost_per_mile_usd = price_per_gal > 0 && range_mi > 0 ? fuel_cost_usd / range_mi : null;
  return { total_btu, total_kwh, range_mi, derate_flag, fuel_cost_usd, cost_per_mile_usd, solve_for, solved_mpg: mpg_r, solved_tank_gal: tank_gal_r };
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
export function computeTireGearing({ original_size = "", new_size = "", axle_ratio = 0, top_gear_ratio = 1, target_rpm = 1800, indicated_mph = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  // v24 EN.1: speedometer / odometer error from the tire-diameter change.
  // A speedometer calibrated for the original tire reads off by the diameter
  // ratio once a new size is fitted; a larger new tire under-reads.
  const speedo_error_pct = (od_new - od_orig) / od_orig * 100;
  const speedo_reads = od_new > od_orig
    ? "under-reads (true speed higher than indicated)"
    : od_new < od_orig
      ? "over-reads (true speed lower than indicated)"
      : "accurate (no change)";
  const actual_mph = indicated_mph > 0 ? indicated_mph * (od_new / od_orig) : null;
  return {
    diameter_orig_in: od_orig,
    diameter_new_in: od_new,
    rev_per_mi_orig, rev_per_mi_new,
    effective_orig, effective_new,
    cruise_mph,
    recommended_axle_ratio: recommended.ratio,
    speedo_error_pct, speedo_reads, actual_mph,
  };
}

export const tireGearingExample = { inputs: { original_size: "265/70R17", new_size: "285/75R17", axle_ratio: 3.55, top_gear_ratio: 0.69, target_rpm: 1800 } };

// --- 202: Brake Pad Lifespan and Heat Capacity ---

export const PAD_WEAR_RATE = {
  organic:       { mm_per_kJ: 0.000020, label: "Organic / NAO" },
  semi_metallic: { mm_per_kJ: 0.000012, label: "Semi-metallic" },
  ceramic:       { mm_per_kJ: 0.000009, label: "Ceramic" },
};

// dims: in { vehicle_weight_lb: M, speed_delta_mph: L T^-1, stops_per_mile: L^-1, pad_thickness_mm: L, pad_material: dimensionless, rotor_mass_lb: M, pad_set_cost_usd: dimensionless, wear_rate_mm_per_kj: dimensionless, front_bias_pct: dimensionless }
//        out: { ke_J: M L^2 T^-2, ke_kJ: M L^2 T^-2, rotor_temp_rise_C: T, wear_per_stop_mm: L, stops_until_worn: dimensionless, miles_until_worn: L, pad_label: dimensionless, cost_per_100k_miles_usd: dimensionless, front_miles_until_worn: L, rear_miles_until_worn: L, wear_rate_used: dimensionless, front_bias_pct: dimensionless }
// (Masses surface as `M`; speed is `L T^-1`; stops-per-mile is one
// stop (dimensionless) per length, so `L^-1`; kinetic energy is
// `M L^2 T^-2`; pad thickness and miles-until-worn are lengths;
// temperature rise is `T` per spec-v14 §7.1's T/temperature shortcut;
// pad-set cost is monetary and therefore dimensionless.)
export function computeBrakePadLife({ vehicle_weight_lb = 0, speed_delta_mph = 0, stops_per_mile = 1, pad_thickness_mm = 12, pad_material = "ceramic", rotor_mass_lb = 18, pad_set_cost_usd = 0, wear_rate_mm_per_kj = 0, front_bias_pct = 50 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = PAD_WEAR_RATE[pad_material];
  if (!w) return { error: "Unknown pad material." };
  if (!(vehicle_weight_lb > 0)) return { error: "Vehicle weight must be positive." };
  if (!(speed_delta_mph > 0)) return { error: "Speed delta must be positive." };
  if (!(stops_per_mile >= 0)) return { error: "Stops per mile must be non-negative." };
  if (!(pad_thickness_mm > 0)) return { error: "Pad thickness must be positive." };
  // v23 EN.14: optional shop wear-rate override and a front/rear bias split.
  // wear_rate defaults to the material table; front_bias defaults to 50
  // (an even split, which reproduces the single-axle estimate exactly).
  const wear_rate = (Number(wear_rate_mm_per_kj) > 0 && Number.isFinite(Number(wear_rate_mm_per_kj))) ? Number(wear_rate_mm_per_kj) : w.mm_per_kJ;
  let frontPct = Number(front_bias_pct);
  if (!Number.isFinite(frontPct) || frontPct <= 0 || frontPct >= 100) frontPct = 50;
  // Kinetic energy: KE = 0.5 * m * v^2. Convert lb -> kg, mph -> m/s.
  const m_kg = vehicle_weight_lb * 0.4536;
  const v_ms = speed_delta_mph * 0.4470;
  const ke_J = 0.5 * m_kg * v_ms * v_ms;
  const ke_kJ = ke_J / 1000;
  // Rotor temp rise per stop (rough): assume ~20% of energy absorbed by rotor; cast iron specific heat ~ 460 J/(kg*K).
  const rotor_kg = rotor_mass_lb * 0.4536;
  const rotor_temp_rise_C = rotor_kg > 0 ? (0.20 * ke_J) / (rotor_kg * 460) : null;
  // Pad life: each pad covers ~ ke_kJ * wear_rate per stop.
  const wear_per_stop_mm = ke_kJ * wear_rate;
  const stops_until_worn = pad_thickness_mm / wear_per_stop_mm;
  const miles_until_worn = stops_per_mile > 0 ? stops_until_worn / stops_per_mile : null;
  // Per-axle split: an even 50/50 share reproduces the single estimate;
  // a front-heavy bias makes the front pads see more energy and wear first.
  const frontFactor = (2 * frontPct) / 100;        // 1.0 at 50%, 1.4 at 70%
  const rearFactor = (2 * (100 - frontPct)) / 100; // 1.0 at 50%, 0.6 at 70%
  const front_miles_until_worn = (stops_per_mile > 0 && frontFactor > 0) ? miles_until_worn / frontFactor : null;
  const rear_miles_until_worn = (stops_per_mile > 0 && rearFactor > 0) ? miles_until_worn / rearFactor : null;
  // v8 §C.5: optional cost output. cost_per_100k_miles = $/set × 100000 / miles_until_worn.
  const cost_per_100k_miles_usd = pad_set_cost_usd > 0 && Number.isFinite(miles_until_worn) && miles_until_worn > 0
    ? (pad_set_cost_usd * 100000) / miles_until_worn
    : null;
  return { ke_J, ke_kJ, rotor_temp_rise_C, wear_per_stop_mm, stops_until_worn, miles_until_worn, pad_label: w.label, cost_per_100k_miles_usd, front_bias_pct: frontPct, wear_rate_used: wear_rate, front_miles_until_worn, rear_miles_until_worn };
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
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id || f.key);
      else if (f.kind === "text") {
        const wrap = document.createElement("div"); wrap.className = "field";
        const lab = document.createElement("label"); lab.htmlFor = f.id; lab.textContent = f.label;
        const input = document.createElement("input"); input.type = "text"; input.id = f.id; input.autocomplete = "off";
        wrap.appendChild(lab); wrap.appendChild(input);
        field = { wrap, input };
      }
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
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
    // v23 EN.13: solve-for selector across {range, MPG, tank}.
    { key: "solve_for", label: "Solve for", kind: "select", options: [
      { value: "range", label: "Range from tank + MPG" },
      { value: "mpg", label: "MPG from range + tank" },
      { value: "tank", label: "Tank from range + MPG" },
    ] },
    { key: "fuel", label: "Fuel", kind: "select", options: Object.keys(FUEL_PROPERTIES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "tank_gal", label: "Tank (gal)", kind: "number" },
    { key: "mpg", label: "MPG", kind: "number" },
    { key: "target_range_mi", label: "Range (mi, for inverse modes)", kind: "number" },
    { key: "mpg_basis", label: "MPG basis fuel", kind: "select", options: Object.keys(FUEL_PROPERTIES).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "load_factor", label: "Load factor (0-1.5)", kind: "number", default: 1.0 },
    // v8 §C.5 + §D.1: optional cost input. The simple renderer treats this
    // as a numeric field; the user leaves it blank to skip the cost output.
    { key: "price_per_gal", label: "Price ($/gal, optional)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "sv", id: "fr-out-sv", label: "Solved", value: (r) => r.solve_for === "mpg" ? fmt(r.solved_mpg, 2) + " MPG" : r.solve_for === "tank" ? fmt(r.solved_tank_gal, 2) + " gal tank" : fmt(r.range_mi, 0) + " mi range" },
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
    { key: "indicated_mph", label: "Indicated speed (mph, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "do", id: "tg-out-do", label: "Diameter (in)", value: (r) => fmt(r.diameter_orig_in, 2) + " orig / " + fmt(r.diameter_new_in, 2) + " new" },
    { key: "ro", id: "tg-out-ro", label: "Rev/mi", value: (r) => fmt(r.rev_per_mi_orig, 0) + " orig / " + fmt(r.rev_per_mi_new, 0) + " new" },
    { key: "eo", id: "tg-out-eo", label: "Effective ratio", value: (r) => fmt(r.effective_orig, 3) + " orig / " + fmt(r.effective_new, 3) + " new" },
    { key: "c", id: "tg-out-c", label: "Cruise speed at target RPM", value: (r) => fmt(r.cruise_mph, 1) + " mph" },
    { key: "se", id: "tg-out-se", label: "Speedometer error", value: (r) => fmt(r.speedo_error_pct, 2) + "% - " + r.speedo_reads },
    { key: "am", id: "tg-out-am", label: "Actual speed (if indicated supplied)", value: (r) => r.actual_mph === null ? "-" : fmt(r.actual_mph, 1) + " mph" },
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
    // v23 EN.14: optional shop wear-rate override + front/rear bias split.
    { key: "wear_rate_mm_per_kj", label: "Wear rate (mm/kJ, optional shop data)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "front_bias_pct", label: "Front brake bias (%, default 50)", kind: "number", default: 50 },
    { key: "rotor_mass_lb", label: "Rotor mass (lb)", kind: "number", default: 18 },
    { key: "pad_set_cost_usd", label: "Pad-set cost ($, optional)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    // spec-v593: primary outputs restated US-customary (1 kJ = 737.562149 ft-lb;
    // a rise of X deg C = X x 9/5 deg F rise; 1 mm = 39.3700787 mils); metric
    // stays as the parenthetical. Compute unchanged.
    { key: "ke", id: "bp-out-ke", label: "KE per stop", value: (r) => fmt(r.ke_kJ * 737.562149, 0) + " ft-lb (" + fmt(r.ke_kJ, 1) + " kJ)" },
    { key: "tr", id: "bp-out-tr", label: "Rotor temp rise per stop", value: (r) => r.rotor_temp_rise_C === null ? "-" : fmt(r.rotor_temp_rise_C * 9 / 5, 1) + " deg F (" + fmt(r.rotor_temp_rise_C, 1) + " deg C)" },
    { key: "w", id: "bp-out-w", label: "Wear per stop", value: (r) => fmt(r.wear_per_stop_mm * 39.3700787, 3) + " mils (" + fmt(r.wear_per_stop_mm * 1000, 3) + " um)" },
    { key: "m", id: "bp-out-m", label: "Estimated pad life", value: (r) => Number.isFinite(r.miles_until_worn) ? fmt(r.miles_until_worn, 0) + " mi" : "n/a" },
    { key: "ax", id: "bp-out-ax", label: "Per-axle life (front bias)", value: (r) => Number.isFinite(r.front_miles_until_worn) ? "front " + fmt(r.front_miles_until_worn, 0) + " mi / rear " + fmt(r.rear_miles_until_worn, 0) + " mi" : "n/a" },
    { key: "c", id: "bp-out-c", label: "Cost per 100k mi (if $/set supplied)", value: (r) => r.cost_per_100k_miles_usd === null ? "-" : "$" + fmt(r.cost_per_100k_miles_usd, 2) + " / 100,000 mi" },
  ],
  compute: computeBrakePadLife,
});

export const MECHANIC_RENDERERS = {
  "prop-slip":        renderPropSlip,
  "displacement-cr":  renderDisplacementCR,
  "bolt-stretch":     renderBoltStretch,
  "driveshaft-crit":  renderDriveshaft,
  "fuel-range":       renderFuelRange,
  "tire-gearing":     renderTireGearing,
  "brake-pad-life":   renderBrakePadLife,
};

// =====================================================================
// v23 K.1: Valve flow coefficient Cv (liquid form Q = Cv*sqrt(dP/SG))
// =====================================================================
// The liquid sizing relation is Q = Cv * sqrt(dP / SG), solved for any of
// {Cv, Q, dP}. The gas/compressible regime uses a different equation and is
// flagged, not computed. Choked / cavitating flow is out of scope.
//
// dims: in { solve_for: dimensionless, fluid: dimensionless, specific_gravity: dimensionless, cv: dimensionless, flow_gpm: dimensionless, dp_psi: dimensionless } out: { cv: dimensionless, flow_gpm: dimensionless, dp_psi: dimensionless }
export function computeValveFlowCoefficient({ solve_for = "flow", fluid = "liquid", specific_gravity = 1, cv = 0, flow_gpm = 0, dp_psi = 0 } = {}) {
  const SG = Number(specific_gravity) || 0;
  const Cv = Number(cv) || 0;
  const Q = Number(flow_gpm) || 0;
  const dP = Number(dp_psi) || 0;
  if (!(SG > 0 && Number.isFinite(SG))) return { error: "Specific gravity must be positive." };
  const gas_note = fluid === "gas" ? "Liquid relation shown; the gas/compressible regime uses a different (choked-aware) equation - verify against the manufacturer's gas Cv method." : null;
  if (solve_for === "cv") {
    if (!(dP > 0 && Number.isFinite(dP))) return { error: "Pressure drop must be positive (psi)." };
    if (!(Q > 0 && Number.isFinite(Q))) return { error: "Flow must be positive (gpm)." };
    return { solve_for, cv: Q / Math.sqrt(dP / SG), flow_gpm: Q, dp_psi: dP, gas_note };
  }
  if (solve_for === "dp") {
    if (!(Cv > 0 && Number.isFinite(Cv))) return { error: "Cv must be positive." };
    if (!(Q > 0 && Number.isFinite(Q))) return { error: "Flow must be positive (gpm)." };
    return { solve_for, dp_psi: SG * (Q / Cv) ** 2, flow_gpm: Q, cv: Cv, gas_note };
  }
  // solve flow
  if (!(Cv > 0 && Number.isFinite(Cv))) return { error: "Cv must be positive." };
  if (!(dP > 0 && Number.isFinite(dP))) return { error: "Pressure drop must be positive (psi)." };
  return { solve_for: "flow", flow_gpm: Cv * Math.sqrt(dP / SG), dp_psi: dP, cv: Cv, gas_note };
}

export const valveFlowCoefficientExample = { inputs: { solve_for: "flow", fluid: "liquid", specific_gravity: 1, cv: 10, dp_psi: 25, flow_gpm: 0 } };

const renderValveFlowCoefficient = _simpleRenderer({
  citation: "Citation: Per the ISA-75.01 / Crane TP-410 control-valve sizing relation Q = Cv * sqrt(dP / SG) (liquid form). The gas/compressible regime uses a different equation, flagged. Choked / cavitating flow out of scope. Manufacturer sizing governs.",
  example: valveFlowCoefficientExample.inputs,
  fields: [
    { key: "solve_for", label: "Solve for", kind: "select", options: [
      { value: "flow", label: "Flow Q from Cv, dP" },
      { value: "cv", label: "Cv from Q, dP" },
      { value: "dp", label: "dP from Cv, Q" },
    ] },
    { key: "fluid", label: "Fluid", kind: "select", options: [
      { value: "liquid", label: "Liquid" },
      { value: "gas", label: "Gas (flagged - different equation)" },
    ] },
    { key: "specific_gravity", label: "Specific gravity", kind: "number", default: 1 },
    { key: "cv", label: "Cv", kind: "number" },
    { key: "flow_gpm", label: "Flow (gpm)", kind: "number" },
    { key: "dp_psi", label: "Pressure drop (psi)", kind: "number" },
  ],
  outputs: [
    { key: "out", id: "vfc-out", label: "Result", value: (r) => r.solve_for === "cv" ? "Cv = " + fmt(r.cv, 2) : r.solve_for === "dp" ? fmt(r.dp_psi, 2) + " psi" : fmt(r.flow_gpm, 2) + " gpm" },
    { key: "note", id: "vfc-note", label: "Note", value: (r) => r.gas_note || "Liquid sizing relation (incompressible); manufacturer Cv chart governs." },
  ],
  compute: computeValveFlowCoefficient,
});
MECHANIC_RENDERERS["valve-flow-coefficient"] = renderValveFlowCoefficient;

// =====================================================================
// v23 K.2: Screw / auger conveyor capacity (CEMA Book No. 350)
// =====================================================================
// Volumetric capacity from the annular swept area times pitch times RPM
// times the trough loading fraction. With a bulk density, the mass rate
// follows. Loading fractions come from the CEMA material class
// (user-supplied); exceeding the class maximum is flagged.
//
// dims: in { screw_diameter_in: L, shaft_diameter_in: L, pitch_in: L, rpm: dimensionless, loading_fraction: dimensionless, bulk_density_lb_ft3: dimensionless } out: { capacity_ft3_hr: dimensionless, mass_rate_lb_hr: dimensionless, mass_rate_ton_hr: dimensionless }
export function computeScrewConveyor({ screw_diameter_in = 0, shaft_diameter_in = 0, pitch_in = 0, rpm = 0, loading_fraction = 0, bulk_density_lb_ft3 = 0 } = {}) {
  const D = Number(screw_diameter_in) || 0;
  const d = Number(shaft_diameter_in) || 0;
  const pitch = Number(pitch_in) || 0;
  const N = Number(rpm) || 0;
  const load = Number(loading_fraction) || 0;
  const rho = Number(bulk_density_lb_ft3) || 0;
  if (!(D > 0 && Number.isFinite(D))) return { error: "Screw diameter must be positive (in)." };
  if (!(d >= 0 && d < D && Number.isFinite(d))) return { error: "Shaft diameter must be in [0, screw diameter)." };
  if (!(pitch > 0 && Number.isFinite(pitch))) return { error: "Pitch must be positive (in)." };
  if (!(N > 0 && Number.isFinite(N))) return { error: "RPM must be positive." };
  if (!(load > 0 && load <= 1 && Number.isFinite(load))) return { error: "Loading fraction must be in (0, 1]." };
  // Convert inches to feet: area (ft^2) * pitch (ft) per rev * rev/hr * loading.
  const area_ft2 = (Math.PI / 4) * (((D / 12) ** 2) - ((d / 12) ** 2));
  const capacity_ft3_hr = area_ft2 * (pitch / 12) * (N * 60) * load;
  const over_loaded = load > 0.45; // typical CEMA Class-limit guard (light loading ~15-45%)
  let mass_rate_lb_hr = null, mass_rate_ton_hr = null;
  if (rho > 0 && Number.isFinite(rho)) {
    mass_rate_lb_hr = capacity_ft3_hr * rho;
    mass_rate_ton_hr = mass_rate_lb_hr / 2000;
  }
  return { capacity_ft3_hr, mass_rate_lb_hr, mass_rate_ton_hr, over_loaded };
}

export const screwConveyorExample = { inputs: { screw_diameter_in: 9, shaft_diameter_in: 2.5, pitch_in: 9, rpm: 40, loading_fraction: 0.30, bulk_density_lb_ft3: 45 } };

const renderScrewConveyor = _simpleRenderer({
  citation: "Citation: Per the CEMA Screw Conveyor standard (Book No. 350) capacity method; the trough loading fraction is per the CEMA material class (user-supplied; light/heavy/abrasive classes cap loading differently). Estimate; CEMA and the manufacturer govern.",
  example: screwConveyorExample.inputs,
  fields: [
    { key: "screw_diameter_in", label: "Screw diameter (in)", kind: "number" },
    { key: "shaft_diameter_in", label: "Shaft / pipe diameter (in)", kind: "number" },
    { key: "pitch_in", label: "Pitch (in)", kind: "number" },
    { key: "rpm", label: "Screw speed (RPM)", kind: "number" },
    { key: "loading_fraction", label: "Trough loading fraction (CEMA class)", kind: "number" },
    { key: "bulk_density_lb_ft3", label: "Bulk density (lb/ft^3, optional)", kind: "number" },
  ],
  outputs: [
    { key: "cap", id: "scv-out-cap", label: "Volumetric capacity", value: (r) => fmt(r.capacity_ft3_hr, 1) + " ft^3/hr" + (r.over_loaded ? " (loading high - verify CEMA class)" : "") },
    { key: "mass", id: "scv-out-mass", label: "Mass rate (if density given)", value: (r) => r.mass_rate_lb_hr === null ? "(enter bulk density)" : fmt(r.mass_rate_lb_hr, 0) + " lb/hr (" + fmt(r.mass_rate_ton_hr, 2) + " ton/hr)" },
  ],
  compute: computeScrewConveyor,
});
MECHANIC_RENDERERS["screw-conveyor"] = renderScrewConveyor;

// ===========================================================================
// spec-v20 Phase K - three new mechanic tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 K.1: Horsepower from torque and RPM (`hp-from-torque`) ---
// HP = Torque * RPM / 5252; kW = HP * 0.7457. Solve for any of {HP, T, RPM}.
// dims: in { solve_for: dimensionless, torque_lbft: M*L^2*T^-2, rpm: T^-1, hp: dimensionless } out: { hp: dimensionless, kw: dimensionless }
export function computeHpFromTorque({ solve_for = "hp", torque_lbft = 0, rpm = 0, hp = 0 } = {}) {
  const T = Number(torque_lbft) || 0;
  const N = Number(rpm) || 0;
  const HP = Number(hp) || 0;
  if (solve_for === "torque") {
    if (!(HP > 0 && Number.isFinite(HP))) return { error: "Horsepower must be positive to solve for torque." };
    if (!(N > 0 && Number.isFinite(N))) return { error: "RPM must be positive to solve for torque." };
    const torque = HP * 5252 / N;
    return { torque_lbft: torque, hp: HP, kw: HP * 0.7457, rpm: N, note: "Torque = HP * 5252 / RPM. Torque and HP are equal at 5252 RPM by definition." };
  }
  if (solve_for === "rpm") {
    if (!(HP > 0 && Number.isFinite(HP))) return { error: "Horsepower must be positive to solve for RPM." };
    if (!(T > 0 && Number.isFinite(T))) return { error: "Torque must be positive to solve for RPM." };
    const rpmOut = HP * 5252 / T;
    return { rpm: rpmOut, hp: HP, kw: HP * 0.7457, torque_lbft: T, note: "RPM = HP * 5252 / Torque." };
  }
  // solve for HP
  if (!Number.isFinite(T) || T < 0) return { error: "Torque must be a non-negative number (lb-ft)." };
  if (!Number.isFinite(N) || N < 0) return { error: "RPM must be a non-negative number." };
  const hpOut = T * N / 5252;
  return {
    hp: Number.isFinite(hpOut) ? hpOut : null,
    kw: Number.isFinite(hpOut) ? hpOut * 0.7457 : null,
    torque_lbft: T, rpm: N,
    note: "HP = Torque * RPM / 5252 (5252 = 33,000 / 2*pi). Brake/observed power per the inputs, not SAE-corrected unless the dyno applied the correction.",
  };
}
export const hpFromTorqueExample = { inputs: { solve_for: "hp", torque_lbft: 400, rpm: 5000, hp: 0 } };

function renderHpFromTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Classical definition of mechanical power (Watt's 33,000 ft-lb/min); SAE J1349 engine-power rating, by name. The constant 5252 is a pure derivation, fully public. Torque and HP are equal at 5252 RPM by definition.";
  const solve = makeSelect("Solve for", "hpt-solve", [{ value: "hp", label: "Horsepower", selected: true }, { value: "torque", label: "Torque" }, { value: "rpm", label: "RPM" }]);
  const t = makeNumber("Torque (lb-ft)", "hpt-t", { step: "any", min: "0", value: "400" }); t.input.value = "400";
  const n = makeNumber("RPM", "hpt-n", { step: "any", min: "0", value: "5000" }); n.input.value = "5000";
  const hp = makeNumber("Horsepower", "hpt-hp", { step: "any", min: "0" });
  for (const f of [solve, t, n, hp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { solve.select.value = "hp"; t.input.value = "400"; n.input.value = "5000"; hp.input.value = ""; update(); });
  const oOut = makeOutputLine(outputRegion, "Result", "hpt-out");
  const oKw = makeOutputLine(outputRegion, "Kilowatts", "hpt-out-kw");
  const oNote = makeOutputLine(outputRegion, "Note", "hpt-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeHpFromTorque({ solve_for: solve.select.value, torque_lbft: readNum(t.input), rpm: readNum(n.input), hp: readNum(hp.input) });
    if (r.error) { oOut.textContent = r.error; oKw.textContent = ""; oNote.textContent = ""; return; }
    oOut.textContent = solve.select.value === "torque" ? fmt(r.torque_lbft, 1) + " lb-ft" : solve.select.value === "rpm" ? fmt(r.rpm, 0) + " RPM" : fmt(r.hp, 1) + " HP";
    oKw.textContent = r.kw != null ? fmt(r.kw, 2) + " kW" : "";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [solve.select, t.input, n.input, hp.input]) f.addEventListener("input", update);
}
MECHANIC_RENDERERS["hp-from-torque"] = renderHpFromTorque;

// --- v20 K.2: Volumetric efficiency and airflow (`volumetric-efficiency`) ---
// 4-stroke theoretical CFM = disp * RPM / 3456; 2-stroke / 1728. VE% = actual/theoretical*100.
// dims: in { displacement_ci: L^3, rpm: T^-1, cycle: dimensionless, actual_cfm: L^3*T^-1, ve_pct: dimensionless } out: { theoretical_cfm: L^3*T^-1, ve_pct: dimensionless }
export function computeVolumetricEfficiency({ displacement_ci = 0, rpm = 0, cycle = "four", actual_cfm = 0, ve_pct = 0 } = {}) {
  const disp = Number(displacement_ci) || 0;
  const N = Number(rpm) || 0;
  const actual = Number(actual_cfm) || 0;
  const ve = Number(ve_pct) || 0;
  if (!(disp > 0 && Number.isFinite(disp))) return { error: "Displacement must be positive (ci)." };
  if (!(N > 0 && Number.isFinite(N))) return { error: "RPM must be positive." };
  const divisor = cycle === "two" ? 1728 : 3456;
  const theoretical = disp * N / divisor;
  let veOut = null, actualOut = null;
  if (actual > 0 && Number.isFinite(actual)) { veOut = actual / theoretical * 100; actualOut = actual; }
  else if (ve > 0 && Number.isFinite(ve)) { actualOut = theoretical * ve / 100; veOut = ve; }
  return {
    theoretical_cfm: Number.isFinite(theoretical) ? theoretical : null,
    actual_cfm: actualOut != null && Number.isFinite(actualOut) ? actualOut : null,
    ve_pct: veOut != null && Number.isFinite(veOut) ? veOut : null,
    over_100: veOut != null && veOut > 100,
    note: "4-stroke uses /3456 (1728 * 2 revs per intake cycle); 2-stroke /1728. VE above 100% is legitimate for forced induction / tuned runners (not clamped). CFM is at standard density.",
  };
}
export const volumetricEfficiencyExample = { inputs: { displacement_ci: 350, rpm: 5500, cycle: "four", actual_cfm: 0, ve_pct: 0 } };

function renderVolumetricEfficiency(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Classical four-stroke airflow derivation; SAE engine-test conventions, by name. The 3456/1728 constants are pure unit derivations, public (in every engine-builder reference). VE above 100% is legitimate for forced induction.";
  const disp = makeNumber("Displacement (ci)", "ve-disp", { step: "any", min: "0", value: "350" }); disp.input.value = "350";
  const rpm = makeNumber("RPM", "ve-rpm", { step: "any", min: "0", value: "5500" }); rpm.input.value = "5500";
  const cycle = makeSelect("Cycle", "ve-cycle", [{ value: "four", label: "4-stroke", selected: true }, { value: "two", label: "2-stroke" }]);
  const actual = makeNumber("Measured CFM (optional, to compute VE)", "ve-actual", { step: "any", min: "0" });
  const vep = makeNumber("Target VE % (optional, to compute CFM)", "ve-vep", { step: "any", min: "0" });
  for (const f of [disp, rpm, cycle, actual, vep]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { disp.input.value = "350"; rpm.input.value = "5500"; cycle.select.value = "four"; actual.input.value = ""; vep.input.value = ""; update(); });
  const oTheo = makeOutputLine(outputRegion, "Theoretical CFM", "ve-out-theo");
  const oVE = makeOutputLine(outputRegion, "Actual CFM / VE", "ve-out-ve");
  const oNote = makeOutputLine(outputRegion, "Note", "ve-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVolumetricEfficiency({ displacement_ci: readNum(disp.input), rpm: readNum(rpm.input), cycle: cycle.select.value, actual_cfm: readNum(actual.input), ve_pct: readNum(vep.input) });
    if (r.error) { oTheo.textContent = r.error; oVE.textContent = ""; oNote.textContent = ""; return; }
    oTheo.textContent = fmt(r.theoretical_cfm, 1) + " CFM";
    oVE.textContent = r.ve_pct != null ? fmt(r.actual_cfm, 1) + " CFM @ " + fmt(r.ve_pct, 1) + "% VE" : "Enter measured CFM or target VE.";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [disp.input, rpm.input, cycle.select, actual.input, vep.input]) f.addEventListener("input", update);
}
MECHANIC_RENDERERS["volumetric-efficiency"] = renderVolumetricEfficiency;

// --- v20 K.3: Gear-ratio MPH from RPM (`gear-mph-rpm`) ---
// MPH = RPM * pi * dia * 60 / (trans * axle * 63360); revs/mile = 63360/(pi*dia).
// dims: in { solve_for: dimensionless, rpm: T^-1, trans_ratio: dimensionless, axle_ratio: dimensionless, tire_dia_in: L, mph: L*T^-1 } out: { mph: L*T^-1, rpm: T^-1 }
export function computeGearMphRpm({ solve_for = "mph", rpm = 0, trans_ratio = 1, axle_ratio = 0, tire_dia_in = 0, mph = 0 } = {}) {
  const N = Number(rpm) || 0;
  const trans = Number(trans_ratio) || 0;
  const axle = Number(axle_ratio) || 0;
  const dia = Number(tire_dia_in) || 0;
  const MPH = Number(mph) || 0;
  if (!(dia > 0 && Number.isFinite(dia))) return { error: "Tire diameter must be positive (in)." };
  if (!(trans > 0 && Number.isFinite(trans))) return { error: "Transmission gear ratio must be positive." };
  if (!(axle > 0 && Number.isFinite(axle))) return { error: "Axle ratio must be positive." };
  const totalRatio = trans * axle;
  const revsPerMile = 63360 / (Math.PI * dia);
  if (solve_for === "rpm") {
    if (!(MPH > 0 && Number.isFinite(MPH))) return { error: "MPH must be positive to solve for RPM." };
    const rpmOut = MPH * totalRatio * 63360 / (Math.PI * dia * 60);
    return { rpm: rpmOut, mph: MPH, total_ratio: totalRatio, revs_per_mile: revsPerMile, note: "Geometric (no-slip) speed; ignores tire and torque-converter slip." };
  }
  if (!(N > 0 && Number.isFinite(N))) return { error: "RPM must be positive to solve for MPH." };
  const mphOut = N * Math.PI * dia * 60 / (totalRatio * 63360);
  const wheelRpm = N / totalRatio;
  return {
    mph: Number.isFinite(mphOut) ? mphOut : null,
    wheel_rpm: Number.isFinite(wheelRpm) ? wheelRpm : null,
    revs_per_mile: Number.isFinite(revsPerMile) ? revsPerMile : null,
    total_ratio: totalRatio,
    note: "Geometric (no-slip) speed; ignores tire and torque-converter slip. Consistent with the tire-gearing decoder.",
  };
}
export const gearMphRpmExample = { inputs: { solve_for: "mph", rpm: 2500, trans_ratio: 1, axle_ratio: 3.55, tire_dia_in: 28.5, mph: 0 } };

function renderGearMphRpm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Classical drivetrain kinematics; SAE J267 metric tire-size convention for decoding a tire code to diameter, by name. Pure geometry, public. Geometric (no-slip) speed - ignores tire and torque-converter slip. Consistent with the tire-gearing decoder.";
  const solve = makeSelect("Solve for", "gmr-solve", [{ value: "mph", label: "MPH", selected: true }, { value: "rpm", label: "RPM" }]);
  const rpm = makeNumber("Engine RPM", "gmr-rpm", { step: "any", min: "0", value: "2500" }); rpm.input.value = "2500";
  const trans = makeNumber("Transmission gear ratio", "gmr-trans", { step: "any", min: "0", value: "1" }); trans.input.value = "1";
  const axle = makeNumber("Axle ratio", "gmr-axle", { step: "any", min: "0", value: "3.55" }); axle.input.value = "3.55";
  const dia = makeNumber("Tire diameter (in)", "gmr-dia", { step: "any", min: "0", value: "28.5" }); dia.input.value = "28.5";
  const mph = makeNumber("MPH (for RPM solve)", "gmr-mph", { step: "any", min: "0" });
  for (const f of [solve, rpm, trans, axle, dia, mph]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { solve.select.value = "mph"; rpm.input.value = "2500"; trans.input.value = "1"; axle.input.value = "3.55"; dia.input.value = "28.5"; mph.input.value = ""; update(); });
  const oOut = makeOutputLine(outputRegion, "Result", "gmr-out");
  const oRev = makeOutputLine(outputRegion, "Tire revs per mile", "gmr-out-rev");
  const oNote = makeOutputLine(outputRegion, "Note", "gmr-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGearMphRpm({ solve_for: solve.select.value, rpm: readNum(rpm.input), trans_ratio: readNum(trans.input), axle_ratio: readNum(axle.input), tire_dia_in: readNum(dia.input), mph: readNum(mph.input) });
    if (r.error) { oOut.textContent = r.error; oRev.textContent = ""; oNote.textContent = ""; return; }
    oOut.textContent = solve.select.value === "rpm" ? fmt(r.rpm, 0) + " RPM" : fmt(r.mph, 1) + " MPH (" + fmt(r.wheel_rpm, 0) + " wheel RPM)";
    oRev.textContent = fmt(r.revs_per_mile, 1) + " revs/mile";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [solve.select, rpm.input, trans.input, axle.input, dia.input, mph.input]) f.addEventListener("input", update);
}
MECHANIC_RENDERERS["gear-mph-rpm"] = renderGearMphRpm;

// =====================================================================
// spec-v100 K - 2K paint mix ratio (auto-body). From a ratio (4:1 or
// 4:1:1) and a measured base-paint volume, the hardener and reducer to
// add and the total batch, the way a painter mixes off a stick.
// GOVERNANCE.general; ratios are by volume; 29.5735 mL per US fluid
// ounce. The product technical data sheet governs ratio/induction/pot
// life. (cutting-fluid-concentration lands in calc-machining.js.)
// =====================================================================

// dims: in { paint_volume_oz: L^3, part_paint: dimensionless, part_hardener: dimensionless, part_reducer: dimensionless } out: { hardener_oz: L^3, reducer_oz: L^3, total_oz: L^3, total_ml: L^3 }
export function computePaintMixRatio({ paint_volume_oz = 0, part_paint = 4, part_hardener = 1, part_reducer = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (part_hardener < 0 || part_reducer < 0) return { error: "Hardener and reducer parts must be non-negative." };
  if (!(paint_volume_oz > 0)) return { error: "Base paint volume must be positive." };
  if (!(part_paint > 0)) return { error: "Paint parts must be positive." };
  const ML_PER_OZ = 29.5735;
  const hardener_oz = paint_volume_oz * part_hardener / part_paint;
  const reducer_oz = part_reducer > 0 ? paint_volume_oz * part_reducer / part_paint : null;
  const total_oz = paint_volume_oz + hardener_oz + (reducer_oz || 0);
  return {
    hardener_oz, reducer_oz, total_oz, total_ml: total_oz * ML_PER_OZ,
    ratio_text: part_paint + ":" + part_hardener + (part_reducer > 0 ? ":" + part_reducer : ""),
    note: "2K mix ratios are by volume, and the first number is the base/color - a 4:1 adds one part hardener to four of paint (20%), a 4:1:1 adds a part each of hardener and reducer. Measure the color first and add the rest by parts off a mixing stick or graduated cup. Most products want a short induction (sweat-in) of about 10-30 minutes after mixing and have a pot life of roughly 1-4 hours at 70 F that shortens with heat and extra hardener. The product data sheet governs the exact ratio, induction, and pot life.",
  };
}
const paintMixRatioExample = { inputs: { paint_volume_oz: 16, part_paint: 4, part_hardener: 1, part_reducer: 1 } };
const renderPaintMixRatio = _simpleRenderer({
  citation: "Citation: Paint manufacturer technical data sheet (mix ratio by volume; induction and pot life off the TDS, by name). 29.5735 mL per US fluid ounce.",
  example: paintMixRatioExample.inputs,
  fields: [
    { key: "paint_volume_oz", label: "Base / color volume (fl oz)", kind: "number" },
    { key: "part_paint", label: "Paint parts", kind: "number", default: 4 },
    { key: "part_hardener", label: "Hardener parts", kind: "number", default: 1 },
    { key: "part_reducer", label: "Reducer parts (0 = two-part)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "h", id: "pmr-out-h", label: "Hardener", value: (r) => fmt(r.hardener_oz, 2) + " oz" },
    { key: "r", id: "pmr-out-r", label: "Reducer", value: (r) => r.reducer_oz === null ? "-" : fmt(r.reducer_oz, 2) + " oz" },
    { key: "t", id: "pmr-out-t", label: "Total batch", value: (r) => fmt(r.total_oz, 2) + " oz (" + fmt(r.total_ml, 1) + " mL)" },
    { key: "x", id: "pmr-out-x", label: "Ratio", value: (r) => r.ratio_text },
    { key: "n", id: "pmr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePaintMixRatio,
});
MECHANIC_RENDERERS["paint-mix-ratio"] = renderPaintMixRatio;

// ===================== spec-v323..v325: engine-build performance batch =====================
// The sizing and durability numbers the displacement/horsepower tiles never
// give: the fuel injector flow a power target needs, the mean piston speed and
// its rpm-limit reading, and the horsepower a car makes from its trap speed.

// dims: in { hp: M L^2 T^-3, bsfc: T^2 L^-2, n_cyl: dimensionless, duty: dimensionless } out: { total_lbh: M T^-1, inj_lbh: M T^-1, inj_ccmin: L^3 T^-1 }
export function computeInjectorSize({ hp = 0, bsfc = 0.50, n_cyl = 0, duty = 0.80 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hp > 0)) return { error: "Target horsepower must be positive (hp)." };
  if (!(bsfc > 0)) return { error: "BSFC must be positive (lb/hp-h; ~0.50 NA, 0.55-0.65 boosted)." };
  if (!(n_cyl >= 1) || !Number.isInteger(n_cyl)) return { error: "Injector count must be a whole number of at least 1." };
  if (!(duty > 0 && duty <= 1)) return { error: "The duty cycle must be over 0 and up to 1 (0.80 typical)." };
  const total_lbh = hp * bsfc;
  const inj_lbh = total_lbh / (n_cyl * duty);
  const inj_ccmin = inj_lbh * 10.5;
  return {
    total_lbh, inj_lbh, inj_ccmin,
    note: "Fuel injector flow lb/h = HP x BSFC / (n_cyl x duty), the total fuel demand divided across the injectors at a safe maximum duty cycle. BSFC (brake-specific fuel consumption) runs about 0.45-0.50 for a naturally-aspirated gas engine and 0.55-0.65 boosted (it rises with boost and richer tuning), the customary maximum duty cycle is 80%, and lb/h x 10.5 = cc/min for gasoline (specific gravity ~0.72). Evenly-distributed port injection with one injector per cylinder - it does not cover a return-versus-returnless fuel system, the rail pressure that sets the injector's static flow, or direct injection. A tuning aid; the engine's measured fueling and the tuner's judgment govern.",
  };
}
export const injectorSizeExample = { inputs: { hp: 400, bsfc: 0.50, n_cyl: 8, duty: 0.80 } };

function renderInjectorSize(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fuel injector flow lb/h = HP x BSFC / (n_cyl x duty), BSFC ~0.50 NA / 0.55-0.65 boosted, the 80% maximum duty cycle, and lb/h x 10.5 = cc/min for gasoline, by name. Port injection, entered BSFC. A tuning aid; the measured fueling governs.";
  const hp = makeNumber("Target horsepower (hp)", "inj-hp", { step: "any", min: "0" });
  const bsfc = makeNumber("BSFC (lb/hp-h; 0.50 NA, 0.55-0.65 boost)", "inj-bsfc", { step: "any", min: "0" }); bsfc.input.value = "0.50";
  const n = makeNumber("Number of injectors", "inj-n", { step: "1", min: "1" });
  const duty = makeNumber("Maximum duty cycle (0-1)", "inj-duty", { step: "any", min: "0" }); duty.input.value = "0.80";
  for (const f of [hp, bsfc, n, duty]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "400"; bsfc.input.value = "0.50"; n.input.value = "8"; duty.input.value = "0.80"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total fuel demand", "inj-out-total");
  const oInj = makeOutputLine(outputRegion, "Per-injector flow", "inj-out-inj");
  const oNote = makeOutputLine(outputRegion, "Note", "inj-out-note");
  const update = debounce(() => {
    const r = computeInjectorSize({ hp: Number(hp.input.value) || 0, bsfc: Number(bsfc.input.value) || 0, n_cyl: Number(n.input.value) || 0, duty: Number(duty.input.value) || 0 });
    if (r.error) { oTotal.textContent = r.error; oInj.textContent = "-"; oNote.textContent = "-"; return; }
    oTotal.textContent = fmt(r.total_lbh, 1) + " lb/h";
    oInj.textContent = fmt(r.inj_lbh, 1) + " lb/h (" + fmt(r.inj_ccmin, 0) + " cc/min)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [hp, bsfc, n, duty]) f.input.addEventListener("input", update);
}
MECHANIC_RENDERERS["injector-size"] = renderInjectorSize;

// dims: in { inj_flow: M T^-1, flow_unit: dimensionless, n_cyl: dimensionless, duty: dimensionless, bsfc: T^2 L^-2 } out: { inj_lbh: M T^-1, total_lbh: M T^-1, hp_max: M L^2 T^-3 }
export function computeInjectorMaxHp({ inj_flow = 0, flow_unit = "lbh", n_cyl = 0, duty = 0.80, bsfc = 0.50 } = {}) {
  const _g = _finiteGuard({ inj_flow, n_cyl, duty, bsfc }); if (_g) return _g;
  const flow = Number(inj_flow) || 0;
  const n = Number(n_cyl) || 0;
  const d = Number(duty) || 0;
  const b = Number(bsfc) || 0;
  if (!(flow > 0)) return { error: "Injector flow must be positive." };
  if (!(n >= 1) || !Number.isInteger(n)) return { error: "Injector count must be a whole number of at least 1." };
  if (!(d > 0 && d <= 1)) return { error: "The duty cycle must be over 0 and up to 1 (0.80 typical)." };
  if (!(b > 0)) return { error: "BSFC must be positive (lb/hp-h; ~0.50 NA, 0.55-0.65 boosted)." };
  const inj_lbh = String(flow_unit) === "ccmin" ? flow / 10.5 : flow;
  const total_lbh = inj_lbh * n * d;
  const hp_max = total_lbh / b;
  return {
    inj_lbh, total_lbh, hp_max,
    note: "The maximum horsepower a fuel-injector set supports, the inverse of the injector-sizing tile: HP_max = injector lb/h x n_cyl x duty / BSFC, the fuel the injectors can flow at a safe maximum duty cycle divided by the brake-specific fuel consumption. Enter the injector static flow in lb/h or cc/min (lb/h x 10.5 = cc/min for gasoline). BSFC runs about 0.45-0.50 naturally aspirated and 0.55-0.65 boosted, so the SAME injectors support meaningfully less power once boost richens the tune; the customary maximum duty cycle is 80% (headroom above that risks a lean fuel cut at redline). Evenly-distributed port injection, one injector per cylinder - not rail pressure (which sets the static flow), a return/returnless system, or direct injection. A tuning aid; the engine's measured fueling and the tuner's judgment govern.",
  };
}
export const injectorMaxHpExample = { inputs: { inj_flow: 31.25, flow_unit: "lbh", n_cyl: 8, duty: 0.80, bsfc: 0.50 } };
MECHANIC_RENDERERS["injector-max-hp"] = _simpleRenderer({
  citation: "Citation: fuel-injector power capacity HP_max = injector lb/h x n_cyl x duty / BSFC, the inverse of the injector-sizing relation, with BSFC ~0.50 NA / 0.55-0.65 boosted, the 80% maximum duty cycle, and lb/h x 10.5 = cc/min for gasoline, by name. Port injection, entered BSFC. A tuning aid; the measured fueling governs.",
  example: injectorMaxHpExample.inputs,
  fields: [
    { key: "inj_flow", label: "Injector static flow", kind: "number", default: 31.25 },
    { key: "flow_unit", label: "Flow unit", kind: "select", options: [{ value: "lbh", label: "lb/h" }, { value: "ccmin", label: "cc/min" }], default: "lbh" },
    { key: "n_cyl", label: "Number of injectors", kind: "number", default: 8, attrs: { step: "1", min: "1" } },
    { key: "duty", label: "Maximum duty cycle (0-1)", kind: "number", default: 0.80 },
    { key: "bsfc", label: "BSFC (lb/hp-h; 0.50 NA, 0.55-0.65 boost)", kind: "number", default: 0.50 },
  ],
  outputs: [
    { key: "hp", id: "imh-out-hp", label: "Maximum supported horsepower", value: (r) => fmt(r.hp_max, 0) + " hp" },
    { key: "f", id: "imh-out-f", label: "Total fuel at max duty", value: (r) => fmt(r.total_lbh, 1) + " lb/h (" + fmt(r.inj_lbh, 1) + " lb/h per injector)" },
    { key: "n", id: "imh-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInjectorMaxHp,
});

// dims: in { stroke_in: L, rpm: T^-1 } out: { mps_fpm: L T^-1, mps_ms: L T^-1 }
export function computeMeanPistonSpeed({ stroke_in = 0, rpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(stroke_in > 0)) return { error: "Stroke must be positive (in)." };
  if (!(rpm > 0)) return { error: "Engine speed must be positive (rpm)." };
  const mps_fpm = (stroke_in * rpm) / 6;
  const mps_ms = mps_fpm * 0.00508;
  const regime = mps_fpm < 4000 ? "street / endurance (under ~4,000 ft/min)" : (mps_fpm < 4500 ? "performance (4,000-4,500 ft/min)" : "race-only (over 4,500 ft/min; needs exotic parts)");
  return {
    mps_fpm, mps_ms, regime,
    note: "Mean piston speed MPS = 2 x stroke x RPM = stroke_in x RPM / 6 (ft/min), the average speed the piston travels over a stroke. It sets the inertial load on the rods, pins, and bearings independent of bore, so it is the single best predictor of whether an rpm is safe for the stroke: street and endurance builds stay under ~3,500-4,000 ft/min, well-built performance engines run 4,000-4,500, and only race engines with exotic parts exceed 4,500. This is the AVERAGE (not peak, which is roughly pi/2 higher and offset by the rod ratio) speed; the bands are guidance for typical materials, and a specific assembly's limit depends on the rods, pistons, and pins. A shop aid; the component makers' rpm ratings govern.",
  };
}
export const meanPistonSpeedExample = { inputs: { stroke_in: 3.48, rpm: 6000 } };

function renderMeanPistonSpeed(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: mean piston speed MPS = 2 x stroke x RPM (= stroke_in x RPM / 6 ft/min) and the practical regime bands (street/endurance under ~4,000, performance 4,000-4,500, race over 4,500 ft/min), per the engine-building references, by name. Average, not peak. A shop aid; the component ratings govern.";
  const stroke = makeNumber("Crankshaft stroke (in)", "mps-stroke", { step: "any", min: "0" });
  const rpm = makeNumber("Engine speed (rpm)", "mps-rpm", { step: "any", min: "0" });
  for (const f of [stroke, rpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { stroke.input.value = "3.48"; rpm.input.value = "6000"; update(); });
  const oMps = makeOutputLine(outputRegion, "Mean piston speed", "mps-out-mps");
  const oReg = makeOutputLine(outputRegion, "Regime reading", "mps-out-reg");
  const oNote = makeOutputLine(outputRegion, "Note", "mps-out-note");
  const update = debounce(() => {
    const r = computeMeanPistonSpeed({ stroke_in: Number(stroke.input.value) || 0, rpm: Number(rpm.input.value) || 0 });
    if (r.error) { oMps.textContent = r.error; oReg.textContent = "-"; oNote.textContent = "-"; return; }
    oMps.textContent = fmt(r.mps_fpm, 0) + " ft/min (" + fmt(r.mps_ms, 1) + " m/s)";
    oReg.textContent = r.regime;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [stroke, rpm]) f.input.addEventListener("input", update);
}
MECHANIC_RENDERERS["mean-piston-speed"] = renderMeanPistonSpeed;

// dims: in { stroke_in: L, mps_limit_fpm: L T^-1 } out: { rpm_max: T^-1, mps_limit_ms: L T^-1 }
export function computeMaxRpmFromPistonSpeed({ stroke_in = 0, mps_limit_fpm = 4000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(stroke_in > 0)) return { error: "Stroke must be positive (in)." };
  if (!(mps_limit_fpm > 0)) return { error: "Mean-piston-speed limit must be positive (ft/min)." };
  const rpm_max = 6 * mps_limit_fpm / stroke_in;
  const mps_limit_ms = mps_limit_fpm * 0.00508;
  const band = mps_limit_fpm < 4000 ? "a conservative street / endurance ceiling" : (mps_limit_fpm <= 4500 ? "a performance-build ceiling" : "a race-only ceiling that needs exotic parts");
  return {
    rpm_max, mps_limit_ms, band,
    note: "The maximum engine speed for a mean-piston-speed ceiling, the inverse of the mean-piston-speed tile: from MPS = stroke x RPM / 6 (ft/min), the RPM cap is 6 x MPS_limit / stroke. Mean piston speed sets the inertial load on the rods, pins, and bearings independent of bore, so a chosen ceiling gives a safe redline for the stroke - street and endurance builds cap around 4,000 ft/min, well-built performance engines 4,000-4,500, and only race engines with exotic parts exceed 4,500. A longer stroke lowers the RPM cap for the same piston-speed limit (the trade a stroker accepts). This is the AVERAGE (not peak) piston speed; the bands are guidance for typical materials, and a specific assembly's limit depends on the rods, pistons, and pins. A shop aid; the component makers' rpm ratings govern.",
  };
}
export const maxRpmFromPistonSpeedExample = { inputs: { stroke_in: 3.48, mps_limit_fpm: 4000 } };
MECHANIC_RENDERERS["max-rpm-from-piston-speed"] = _simpleRenderer({
  citation: "Citation: the mean-piston-speed relation MPS = stroke x RPM / 6 (ft/min) solved for the RPM cap, rpm_max = 6 x MPS_limit / stroke, with the practical ceiling bands (street/endurance ~4,000, performance 4,000-4,500, race over 4,500 ft/min), per the engine-building references, by name. Average, not peak. A shop aid; the component ratings govern.",
  example: maxRpmFromPistonSpeedExample.inputs,
  fields: [
    { key: "stroke_in", label: "Crankshaft stroke (in)", kind: "number", default: 3.48 },
    { key: "mps_limit_fpm", label: "Mean-piston-speed limit (ft/min)", kind: "number", default: 4000 },
  ],
  outputs: [
    { key: "r", id: "mrps-out-r", label: "Maximum safe RPM", value: (r) => fmt(r.rpm_max, 0) + " rpm" },
    { key: "l", id: "mrps-out-l", label: "Limit", value: (r) => fmt(r.mps_limit_ms, 1) + " m/s - " + r.band },
    { key: "n", id: "mrps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMaxRpmFromPistonSpeed,
});

// dims: in { weight_lb: M L T^-2, trap_mph: L T^-1 } out: { hp: M L^2 T^-3, et_s: T }
export function computeTrapSpeedHorsepower({ weight_lb = 0, trap_mph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(weight_lb > 0)) return { error: "Vehicle weight must be positive (lb)." };
  if (!(trap_mph > 0)) return { error: "Trap speed must be positive (mph)." };
  const hp = weight_lb * Math.pow(trap_mph / 234, 3);
  const et_s = 5.825 * Math.pow(weight_lb / hp, 1 / 3);
  return {
    hp, et_s,
    note: "Hale's empirical quarter-mile relations HP = weight x (mph/234)^3 and ET = 5.825 x (weight/HP)^(1/3), with weight the race weight including driver (lb) and mph the trap speed. Trap speed depends on power by a CUBE law, so a small trap gain implies a large power gain (7 mph on a 108 mph run is ~20% more power), which makes trap speed - not ET, which traction and launch corrupt - the cleaner power indicator. A statistical fit to typical cars (the 234 constant averages out aerodynamics, driveline loss, and traction; a very slippery or very draggy car deviates); it reflects the power reaching the wheels at the traps and is not a substitute for a dyno. A hobbyist estimate; the actual dyno measurement governs.",
  };
}
export const trapSpeedHorsepowerExample = { inputs: { weight_lb: 3200, trap_mph: 108 } };

function renderTrapSpeedHorsepower(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Hale's quarter-mile HP = weight x (mph/234)^3 and ET = 5.825 x (weight/HP)^(1/3), weight including driver (lb), mph the trap speed, per the drag-racing references, by name. Empirical fit, wheel power, not a dyno. A hobbyist estimate; the dyno governs.";
  const w = makeNumber("Vehicle weight incl. driver (lb)", "tsh-w", { step: "any", min: "0" });
  const trap = makeNumber("Quarter-mile trap speed (mph)", "tsh-trap", { step: "any", min: "0" });
  for (const f of [w, trap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "3200"; trap.input.value = "108"; update(); });
  const oHp = makeOutputLine(outputRegion, "Estimated horsepower", "tsh-out-hp");
  const oEt = makeOutputLine(outputRegion, "Companion 1/4-mile ET", "tsh-out-et");
  const oNote = makeOutputLine(outputRegion, "Note", "tsh-out-note");
  const update = debounce(() => {
    const r = computeTrapSpeedHorsepower({ weight_lb: Number(w.input.value) || 0, trap_mph: Number(trap.input.value) || 0 });
    if (r.error) { oHp.textContent = r.error; oEt.textContent = "-"; oNote.textContent = "-"; return; }
    oHp.textContent = fmt(r.hp, 0) + " hp (at the wheels)";
    oEt.textContent = fmt(r.et_s, 1) + " s";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [w, trap]) f.input.addEventListener("input", update);
}
MECHANIC_RENDERERS["trap-speed-horsepower"] = renderTrapSpeedHorsepower;

// dims: in { weight_lb: M L T^-2, et_s: T } out: { hp: M L^2 T^-3 }
export function computeEtHorsepower({ weight_lb = 0, et_s = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(weight_lb) || 0;
  const et = Number(et_s) || 0;
  if (!(w > 0)) return { error: "Vehicle weight must be positive (lb)." };
  if (!(et > 0)) return { error: "Elapsed time must be positive (s)." };
  const hp = w * Math.pow(5.825 / et, 3);
  return {
    hp,
    note: "Horsepower from the quarter-mile elapsed time, the inverse of the trap-speed tile's ET relation ET = 5.825 x (weight/HP)^(1/3): HP = weight x (5.825/ET)^3, with weight the race weight including driver (lb) and ET the quarter-mile time (s). Because ET depends on power by a cube-root law, HP scales with the cube of 1/ET, so a small ET drop implies a large power gain. ET is what a timeslip gives directly, but it is corrupted by traction and the launch (a car that spins or bogs runs a slower ET at the same power), so trap speed is the cleaner power indicator when it is available. A statistical fit to typical cars (the 5.825 constant averages out weight transfer, driveline loss, and the 60-foot time; a very slippery or very draggy car deviates); a hobbyist estimate, not a substitute for a dyno. The actual dyno measurement governs.",
  };
}
export const etHorsepowerExample = { inputs: { weight_lb: 3200, et_s: 12.63 } };
MECHANIC_RENDERERS["et-horsepower"] = _simpleRenderer({
  citation: "Citation: Hale's quarter-mile relation ET = 5.825 x (weight/HP)^(1/3) solved for power, HP = weight x (5.825/ET)^3, weight including driver (lb), ET the quarter-mile time (s), per the drag-racing references, by name. Empirical fit, ET corrupted by traction/launch, not a dyno. A hobbyist estimate; the dyno governs.",
  example: etHorsepowerExample.inputs,
  fields: [
    { key: "weight_lb", label: "Vehicle weight incl. driver (lb)", kind: "number", default: 3200 },
    { key: "et_s", label: "Quarter-mile elapsed time (s)", kind: "number", default: 12.63 },
  ],
  outputs: [
    { key: "hp", id: "eth-out-hp", label: "Estimated horsepower", value: (r) => fmt(r.hp, 0) + " hp (at the wheels)" },
    { key: "n", id: "eth-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEtHorsepower,
});

// ===================== spec-v396..v398: fluid-power / cooling trio (Group K) =====================

// dims: in { gpm: L^3 T^-1, psi: M L^-1 T^-2, efficiency: dimensionless } out: { fluid_hp: M L^2 T^-3, input_hp: M L^2 T^-3 }
export function computeHydraulicPumpHorsepower({ gpm = 0, psi = 0, efficiency = 0.85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(gpm) || 0;
  const p = Number(psi) || 0;
  const eff = Number(efficiency) || 0;
  if (!(q > 0)) return { error: "Pump flow must be positive (gpm)." };
  if (!(p > 0)) return { error: "Working pressure must be positive (psi)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Efficiency must be between 0 and 1." };
  const fluid_hp = q * p / 1714;
  const input_hp = fluid_hp / eff;
  return {
    fluid_hp, input_hp, loss_hp: input_hp - fluid_hp,
    note: "Hydraulic pump power: fluid (hydraulic) horsepower = gpm x psi / 1714, and the drive (input) horsepower = fluid HP / overall efficiency (typically 0.80-0.90 for a gear/vane pump, higher for a piston pump). Size the prime mover to the input HP and round up to a standard motor. The 1714 constant folds the unit conversions (1 HP = 1714 psi-gpm). A sizing aid; the pump and motor manufacturer data govern.",
  };
}
export const hydraulicPumpHorsepowerExample = { inputs: { gpm: 10, psi: 2000, efficiency: 0.85 } };
MECHANIC_RENDERERS["hydraulic-pump-horsepower"] = _simpleRenderer({
  citation: "Citation: Hydraulic pump power (fluid-power engineering): fluid horsepower = gpm x psi / 1714, drive horsepower = fluid HP / overall pump efficiency. The 1714 constant is the psi-gpm-to-HP conversion. A sizing aid; the pump and motor manufacturer's data govern.",
  example: hydraulicPumpHorsepowerExample.inputs,
  fields: [
    { key: "gpm", label: "Pump flow (gpm)", kind: "number", default: 10 },
    { key: "psi", label: "Working pressure (psi)", kind: "number", default: 2000 },
    { key: "efficiency", label: "Overall pump efficiency (0-1)", kind: "number", default: 0.85 },
  ],
  outputs: [
    { key: "fh", id: "hph-out-fh", label: "Fluid horsepower", value: (r) => fmt(r.fluid_hp, 1) + " HP" },
    { key: "ih", id: "hph-out-ih", label: "Drive (input) horsepower", value: (r) => fmt(r.input_hp, 1) + " HP (loss " + fmt(r.loss_hp, 1) + " HP)" },
    { key: "n", id: "hph-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicPumpHorsepower,
});

// dims: in { psi: M L^-1 T^-2, disp_in3: L^3, gpm: L^3 T^-1, mech_eff: dimensionless, vol_eff: dimensionless } out: { torque_inlb: M L^2 T^-2, rpm: T^-1, output_hp: M L^2 T^-3 }
export function computeHydraulicMotorTorqueSpeed({ psi = 0, disp_in3 = 0, gpm = 0, mech_eff = 0.90, vol_eff = 0.95 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p = Number(psi) || 0;
  const disp = Number(disp_in3) || 0;
  const q = Number(gpm) || 0;
  const me = Number(mech_eff) || 0;
  const ve = Number(vol_eff) || 0;
  if (!(p > 0)) return { error: "Pressure differential must be positive (psi)." };
  if (!(disp > 0)) return { error: "Motor displacement must be positive (in^3/rev)." };
  if (!(q > 0)) return { error: "Supply flow must be positive (gpm)." };
  if (!(me > 0 && me <= 1)) return { error: "Mechanical efficiency must be between 0 and 1." };
  if (!(ve > 0 && ve <= 1)) return { error: "Volumetric efficiency must be between 0 and 1." };
  const torque_inlb = p * disp / (2 * Math.PI) * me;
  const rpm = 231 * q / disp * ve;
  const output_hp = torque_inlb * rpm / 63025;
  return {
    torque_inlb, rpm, output_hp,
    note: "Hydraulic motor output: torque = pressure x displacement / (2 pi) x mechanical efficiency (in-lb), speed = 231 x gpm / displacement x volumetric efficiency (rpm, 231 in^3 per gallon), and output HP = torque x rpm / 63025. A larger displacement trades speed for torque at the same flow and pressure (same power). A sizing aid; the motor manufacturer's data govern.",
  };
}
export const hydraulicMotorTorqueSpeedExample = { inputs: { psi: 2000, disp_in3: 2.0, gpm: 10, mech_eff: 0.90, vol_eff: 0.95 } };
MECHANIC_RENDERERS["hydraulic-motor-torque-speed"] = _simpleRenderer({
  citation: "Citation: Hydraulic motor performance (fluid-power engineering): torque = psi x displacement / (2 pi) x mechanical efficiency (in-lb), speed = 231 x gpm / displacement x volumetric efficiency (rpm), output HP = torque x rpm / 63025. A sizing aid; the motor manufacturer's data govern.",
  example: hydraulicMotorTorqueSpeedExample.inputs,
  fields: [
    { key: "psi", label: "Pressure differential (psi)", kind: "number", default: 2000 },
    { key: "disp_in3", label: "Motor displacement (in^3/rev)", kind: "number", default: 2.0 },
    { key: "gpm", label: "Supply flow (gpm)", kind: "number", default: 10 },
    { key: "mech_eff", label: "Mechanical efficiency (0-1)", kind: "number", default: 0.90 },
    { key: "vol_eff", label: "Volumetric efficiency (0-1)", kind: "number", default: 0.95 },
  ],
  outputs: [
    { key: "t", id: "hmt-out-t", label: "Output torque", value: (r) => fmt(r.torque_inlb, 0) + " in-lb" },
    { key: "n", id: "hmt-out-n", label: "Output speed", value: (r) => fmt(r.rpm, 0) + " rpm" },
    { key: "hp", id: "hmt-out-hp", label: "Output power", value: (r) => fmt(r.output_hp, 2) + " HP" },
    { key: "note", id: "hmt-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicMotorTorqueSpeed,
});

// dims: in { disp_in3: L^3, rpm: T^-1, vol_eff: dimensionless } out: { q_theo_gpm: L^3 T^-1, q_actual_gpm: L^3 T^-1, q_slip_gpm: L^3 T^-1 }
export function computeHydraulicPumpFlow({ disp_in3 = 0, rpm = 0, vol_eff = 0.95 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const disp = Number(disp_in3) || 0;
  const n = Number(rpm) || 0;
  const ve = Number(vol_eff) || 0;
  if (!(disp > 0)) return { error: "Pump displacement must be positive (in^3/rev)." };
  if (!(n > 0)) return { error: "Drive speed must be positive (rpm)." };
  if (!(ve > 0 && ve <= 1)) return { error: "Volumetric efficiency must be between 0 and 1." };
  const q_theo_gpm = disp * n / 231;
  const q_actual_gpm = q_theo_gpm * ve;
  const q_slip_gpm = q_theo_gpm - q_actual_gpm;
  return {
    q_theo_gpm, q_actual_gpm, q_slip_gpm,
    note: "Hydraulic pump delivered flow: theoretical flow = displacement x rpm / 231 (231 in^3 per gallon), and the delivered flow = theoretical x volumetric efficiency (~0.90-0.95 gear/vane, higher for a piston pump); the difference is internal slip that grows with pressure and wear. This is the inverse of the hydraulic-motor speed relation (231 x gpm / displacement x vol_eff), and the delivered gpm is exactly the flow the hydraulic-pump-horsepower tile takes as its input. A sizing aid; the pump manufacturer's data govern.",
  };
}
export const hydraulicPumpFlowExample = { inputs: { disp_in3: 2.0, rpm: 1800, vol_eff: 0.95 } };
MECHANIC_RENDERERS["hydraulic-pump-flow"] = _simpleRenderer({
  citation: "Citation: Hydraulic pump delivered flow (fluid-power engineering): theoretical flow = displacement x rpm / 231 (231 in^3 per gallon), delivered flow = theoretical x volumetric efficiency, the inverse of the hydraulic-motor speed relation. A sizing aid; the pump manufacturer's data govern.",
  example: hydraulicPumpFlowExample.inputs,
  fields: [
    { key: "disp_in3", label: "Pump displacement (in^3/rev)", kind: "number", default: 2.0 },
    { key: "rpm", label: "Drive speed (rpm)", kind: "number", default: 1800 },
    { key: "vol_eff", label: "Volumetric efficiency (0-1)", kind: "number", default: 0.95 },
  ],
  outputs: [
    { key: "qa", id: "hpf-out-qa", label: "Delivered flow", value: (r) => fmt(r.q_actual_gpm, 2) + " gpm" },
    { key: "qt", id: "hpf-out-qt", label: "Theoretical flow", value: (r) => fmt(r.q_theo_gpm, 2) + " gpm (slip " + fmt(r.q_slip_gpm, 2) + " gpm)" },
    { key: "n", id: "hpf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicPumpFlow,
});

// dims: in { q_btuh: M L^2 T^-3, dt_f: T, coolant: dimensionless } out: { gpm: L^3 T^-1 }
export function computeCoolingSystemFlow({ q_btuh = 0, dt_f = 0, coolant = "water" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(q_btuh) || 0;
  const dt = Number(dt_f) || 0;
  const cmap = { water: 500, glycol50: 427 };
  const c = cmap[coolant] || 500;
  if (!(q > 0)) return { error: "Heat load must be positive (Btu/hr)." };
  if (!(dt > 0)) return { error: "Temperature rise must be positive (deg F)." };
  const gpm = q / (c * dt);
  return {
    gpm, c, coolant_label: coolant === "glycol50" ? "50/50 glycol (c=427)" : "water (c=500)",
    note: "Coolant flow for a heat load: gpm = Q / (c x deltaT), where the constant c folds the fluid's density and specific heat into Btu/hr per (gpm x deg F) - 500 for water (8.33 lb/gal x 60 min/hr x 1.0 Btu/lb-F), about 427 for 50/50 glycol (denser but lower specific heat, so it needs ~17% more flow for the same duty). A tighter allowed rise raises the flow proportionally. A sizing aid; the equipment ratings and the actual fluid properties govern.",
  };
}
export const coolingSystemFlowExample = { inputs: { q_btuh: 150000, dt_f: 10, coolant: "water" } };
MECHANIC_RENDERERS["cooling-system-flow"] = _simpleRenderer({
  citation: "Citation: Cooling-system coolant flow (heat-transfer first principles): gpm = Q / (c x deltaT), with c = 500 for water and about 427 for 50/50 glycol (density x specific heat x 60 min/hr). A sizing aid; the equipment ratings and the actual fluid properties govern.",
  example: coolingSystemFlowExample.inputs,
  fields: [
    { key: "q_btuh", label: "Heat rejection to coolant (Btu/hr)", kind: "number", default: 150000 },
    { key: "dt_f", label: "Coolant temperature rise (deg F)", kind: "number", default: 10 },
    { key: "coolant", label: "Coolant", kind: "select", options: [
      { value: "water", label: "Water (c=500)" },
      { value: "glycol50", label: "50/50 glycol (c=427)" },
    ], default: "water" },
  ],
  outputs: [
    { key: "g", id: "csf-out-g", label: "Required coolant flow", value: (r) => fmt(r.gpm, 1) + " gpm (" + r.coolant_label + ")" },
    { key: "n", id: "csf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoolingSystemFlow,
});

// ===================== spec-v462: marine propeller pitch selection =====================
// dims: in { current_pitch_in: L, current_wot_rpm: dimensionless, target_wot_rpm: dimensionless, rpm_per_inch: dimensionless } out: { pitch_change_in: L, new_pitch_in: L }
export function computePropPitchSelection({ current_pitch_in = 0, current_wot_rpm = 0, target_wot_rpm = 0, rpm_per_inch = 200 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pitch = Number(current_pitch_in) || 0;
  const curRpm = Number(current_wot_rpm) || 0;
  const tgtRpm = Number(target_wot_rpm) || 0;
  const rpi = Number(rpm_per_inch) || 0;
  if (!(pitch > 0)) return { error: "Current pitch must be positive (in)." };
  if (!(curRpm > 0)) return { error: "Current WOT RPM must be positive." };
  if (!(tgtRpm > 0)) return { error: "Target WOT RPM must be positive." };
  if (!(rpi > 0)) return { error: "RPM per inch of pitch must be positive." };
  const pitch_change_in = (tgtRpm - curRpm) / rpi;
  const new_pitch_in = pitch - pitch_change_in;
  if (!(new_pitch_in > 0)) return { error: "The computed pitch is not positive -- check the RPM values (too large a change for this prop)." };
  return {
    pitch_change_in, new_pitch_in, lower: pitch_change_in > 0,
    note: "Marine propeller pitch selection: at wide-open throttle the engine should reach the top of its rated RPM band. Each inch of propeller pitch changes WOT RPM by roughly 200 rpm (150-250 depending on the boat), so pitch change = (target - current WOT RPM) / rpm-per-inch and the new pitch = current pitch - that change. An engine that under-revs (below its band) needs LESS pitch; one that over-revs needs MORE. Diameter, blade count, cupping, and gear ratio also matter, so treat this as the starting point for a prop swap. A selection aid; a WOT test with the new prop and the dealer's prop chart govern.",
  };
}
export const propPitchSelectionExample = { inputs: { current_pitch_in: 19, current_wot_rpm: 5000, target_wot_rpm: 5400, rpm_per_inch: 200 } };
MECHANIC_RENDERERS["prop-pitch-selection"] = _simpleRenderer({
  citation: "Citation: Marine prop pitch selection (rule of thumb): each inch of pitch changes WOT RPM by ~200 rpm; pitch change = (target - current WOT RPM) / rpm-per-inch, new pitch = current - change. Under-rev needs less pitch, over-rev needs more. A selection aid; a WOT test and the prop chart govern.",
  example: propPitchSelectionExample.inputs,
  fields: [
    { key: "current_pitch_in", label: "Current prop pitch (in)", kind: "number", default: 19 },
    { key: "current_wot_rpm", label: "Measured WOT RPM now", kind: "number", default: 5000 },
    { key: "target_wot_rpm", label: "Target WOT RPM (rated band)", kind: "number", default: 5400 },
    { key: "rpm_per_inch", label: "RPM change per inch of pitch", kind: "number", default: 200 },
  ],
  outputs: [
    { key: "np", id: "pps-out-np", label: "New pitch", value: (r) => fmt(r.new_pitch_in, 1) + " in (" + (r.lower ? "lower pitch, engine was under-revving" : "higher pitch, engine was over-revving") + ")" },
    { key: "pc", id: "pps-out-pc", label: "Pitch change", value: (r) => fmt(Math.abs(r.pitch_change_in), 1) + " in " + (r.lower ? "less" : "more") },
    { key: "n", id: "pps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePropPitchSelection,
});

// ===================== spec-v463: engine fuel burn from horsepower (BSFC) =====================
// dims: in { horsepower: dimensionless, bsfc_lb_hp_hr: dimensionless, density_lb_gal: dimensionless, tank_gal: L^3 } out: { gph: L^3 T^-1, run_hours: dimensionless }
export function computeEngineFuelBurnGph({ horsepower = 0, bsfc_lb_hp_hr = 0, density_lb_gal = 0, tank_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hp = Number(horsepower) || 0;
  const bsfc = Number(bsfc_lb_hp_hr) || 0;
  const dens = Number(density_lb_gal) || 0;
  const tank = Number(tank_gal) || 0;
  if (!(hp > 0)) return { error: "Horsepower must be positive." };
  if (!(bsfc > 0)) return { error: "BSFC must be positive (lb/hp-hr)." };
  if (!(dens > 0)) return { error: "Fuel density must be positive (lb/gal)." };
  if (tank < 0) return { error: "Tank size must be non-negative (gal)." };
  const gph = hp * bsfc / dens;
  const run_hours = tank > 0 ? tank / gph : null;
  return {
    gph, run_hours, lb_per_hr: hp * bsfc,
    note: "Engine fuel burn from horsepower and BSFC: the fuel flow in lb/hr = horsepower x brake-specific fuel consumption (BSFC, the pounds of fuel per horsepower per hour), and gallons per hour = that divided by the fuel density (diesel about 7.1 lb/gal, gasoline about 6.1). A modern diesel runs BSFC ~0.35-0.40; a gasoline engine ~0.45-0.55, so a gasoline engine of the same power burns markedly more volume per hour. Given a tank size the run time = tank / gph. This is the burn at the entered (usually near-full) power; real duty-cycle burn is lower. A planning aid; the engine's fuel map and a measured burn govern.",
  };
}
export const engineFuelBurnGphExample = { inputs: { horsepower: 300, bsfc_lb_hp_hr: 0.37, density_lb_gal: 7.1, tank_gal: 200 } };
MECHANIC_RENDERERS["engine-fuel-burn-gph"] = _simpleRenderer({
  citation: "Citation: Engine fuel burn (BSFC): lb/hr = HP x BSFC, gph = lb/hr / fuel density (diesel ~7.1, gasoline ~6.1 lb/gal); run time = tank / gph. The burn at the entered power; real duty-cycle burn is lower. A planning aid; the engine's fuel map and a measured burn govern.",
  example: engineFuelBurnGphExample.inputs,
  fields: [
    { key: "horsepower", label: "Engine power output (hp)", kind: "number", default: 300 },
    { key: "bsfc_lb_hp_hr", label: "BSFC (lb/hp-hr, diesel ~0.37)", kind: "number", default: 0.37 },
    { key: "density_lb_gal", label: "Fuel density (lb/gal, diesel 7.1 / gas 6.1)", kind: "number", default: 7.1 },
    { key: "tank_gal", label: "Tank size (gal, optional for run time)", kind: "number", default: 200 },
  ],
  outputs: [
    { key: "gph", id: "efb-out-gph", label: "Fuel burn", value: (r) => fmt(r.gph, 1) + " gph (" + fmt(r.lb_per_hr, 0) + " lb/hr)" },
    { key: "rt", id: "efb-out-rt", label: "Run time on tank", value: (r) => r.run_hours === null ? "enter a tank size" : fmt(r.run_hours, 1) + " hours" },
    { key: "n", id: "efb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEngineFuelBurnGph,
});

// ===================== spec-v464: alternator charging load balance =====================
// dims: in { total_load_a: dimensionless, alternator_a: dimensionless, idle_frac: dimensionless, cruise_frac: dimensionless } out: { idle_out_a: dimensionless, cruise_out_a: dimensionless, idle_balance_a: dimensionless, cruise_balance_a: dimensionless }
export function computeAlternatorChargingLoad({ total_load_a = 0, alternator_a = 0, idle_frac = 0.5, cruise_frac = 0.9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(total_load_a) || 0;
  const alt = Number(alternator_a) || 0;
  const idleF = Number(idle_frac) || 0;
  const cruiseF = Number(cruise_frac) || 0;
  if (!(load > 0)) return { error: "Total electrical load must be positive (A)." };
  if (!(alt > 0)) return { error: "Alternator rating must be positive (A)." };
  if (!(idleF > 0 && idleF <= 1)) return { error: "Idle output fraction must be between 0 and 1." };
  if (!(cruiseF > 0 && cruiseF <= 1)) return { error: "Cruise output fraction must be between 0 and 1." };
  const idle_out_a = alt * idleF;
  const cruise_out_a = alt * cruiseF;
  const idle_balance_a = idle_out_a - load;
  const cruise_balance_a = cruise_out_a - load;
  return {
    idle_out_a, cruise_out_a, idle_balance_a, cruise_balance_a,
    idle_ok: idle_balance_a >= 0, cruise_ok: cruise_balance_a >= 0,
    note: "Alternator charging load balance: an alternator makes only a fraction of its rated output at engine idle (roughly 50%) and most of it at cruise (roughly 90%). The balance = output - total continuous load: a negative idle balance means the battery drains at idle or a stoplight (accessories, lights, blower, and the charging deficit come from the battery), while a positive cruise balance means it recharges on the road. If the idle balance is negative and matters (lots of idling, a stereo, a winch), step up the alternator or reduce the load. A screening aid; the alternator's actual output curve and the real duty cycle govern.",
  };
}
export const alternatorChargingLoadExample = { inputs: { total_load_a: 65, alternator_a: 120, idle_frac: 0.5, cruise_frac: 0.9 } };
MECHANIC_RENDERERS["alternator-charging-load"] = _simpleRenderer({
  citation: "Citation: Alternator charging balance: an alternator makes ~50% of rated output at idle and ~90% at cruise; balance = output - total load. A negative idle balance drains the battery at idle; a positive cruise balance recharges it. A screening aid; the actual output curve and duty cycle govern.",
  example: alternatorChargingLoadExample.inputs,
  fields: [
    { key: "total_load_a", label: "Total continuous electrical load (A)", kind: "number", default: 65 },
    { key: "alternator_a", label: "Alternator rated output (A)", kind: "number", default: 120 },
    { key: "idle_frac", label: "Output fraction at idle (0-1)", kind: "number", default: 0.5 },
    { key: "cruise_frac", label: "Output fraction at cruise (0-1)", kind: "number", default: 0.9 },
  ],
  outputs: [
    { key: "idle", id: "acl-out-idle", label: "Idle: output / balance", value: (r) => fmt(r.idle_out_a, 0) + " A / " + (r.idle_ok ? "+" : "") + fmt(r.idle_balance_a, 0) + " A " + (r.idle_ok ? "(surplus)" : "(DEFICIT -- drains at idle)") },
    { key: "cruise", id: "acl-out-cruise", label: "Cruise: output / balance", value: (r) => fmt(r.cruise_out_a, 0) + " A / " + (r.cruise_ok ? "+" : "") + fmt(r.cruise_balance_a, 0) + " A " + (r.cruise_ok ? "(surplus)" : "(DEFICIT)") },
    { key: "n", id: "acl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAlternatorChargingLoad,
});

// spec-v485: torque-wrench extension / crowfoot correction. A crowfoot or
// in-line extension changes the effective lever, so the wrench setting differs
// from the torque at the fastener: TW = TA x L / (L + E cos(angle)).
// dims: in { target_torque_ftlb: M L^2 T^-2, wrench_length_in: L, adapter_length_in: L, adapter_angle_deg: dimensionless } out: { effective_extension_in: L, wrench_setting_ftlb: M L^2 T^-2, uncorrected_actual_ftlb: M L^2 T^-2, correction_pct: dimensionless }
export function computeTorqueAdapterCorrection({ target_torque_ftlb = 0, wrench_length_in = 0, adapter_length_in = 0, adapter_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(target_torque_ftlb) || 0;
  const L = Number(wrench_length_in) || 0;
  const E = Number(adapter_length_in) || 0;
  const ang = Number(adapter_angle_deg) || 0;
  if (!(T > 0)) return { error: "Target torque must be positive (ft-lb)." };
  if (!(L > 0)) return { error: "Wrench length must be positive (in)." };
  if (!(E >= 0)) return { error: "Adapter length must be zero or positive (in)." };
  const effective_extension_in = E * Math.cos(ang * Math.PI / 180);
  const denom = L + effective_extension_in;
  if (!(denom > 0)) return { error: "The adapter geometry drives the effective lever to zero or less; check the length and angle." };
  const wrench_setting_ftlb = T * L / denom;
  const uncorrected_actual_ftlb = T * denom / L;
  const correction_pct = (wrench_setting_ftlb - T) / T * 100;
  if (![effective_extension_in, wrench_setting_ftlb, uncorrected_actual_ftlb, correction_pct].every(Number.isFinite)) return { error: "Torque-correction math is not a finite value." };
  return {
    effective_extension_in, wrench_setting_ftlb, uncorrected_actual_ftlb, correction_pct,
    note: "Torque-adapter correction: with a crowfoot or in-line extension, dial the wrench to TW = TA x L / (L + E cos(angle)), where TA is the torque wanted at the fastener, L is the wrench lever length (drive center to hand-grip center), E is the adapter length, and the angle is the adapter's offset from the wrench axis. An in-line adapter (0 deg) lengthens the lever, so setting the wrench to the target over-torques the fastener by the (L + E)/L ratio - a 3 in crowfoot on an 18 in wrench delivers 17% more than the dial reads. Mounting the crowfoot at 90 deg to the handle makes cos(angle) = 0, so the adapter adds no effective length and no correction is needed - the standard field workaround. Measure L to where the hand actually pulls; the relation assumes the extension lies in the plane of the swing. A shop aid; the calibrated wrench and the manufacturer's fastener torque spec govern.",
  };
}
export const torqueAdapterCorrectionExample = { inputs: { target_torque_ftlb: 100, wrench_length_in: 18, adapter_length_in: 3, adapter_angle_deg: 0 } };
MECHANIC_RENDERERS["torque-adapter-correction"] = _simpleRenderer({
  citation: "Citation: standard torque-adapter correction (Snap-on / FAA AC 43.13.1B): wrench setting TW = TA x L / (L + E cos(angle)), with L the wrench lever length and E the crowfoot/extension length. An in-line adapter over-torques if set to the target; a 90-degree crowfoot needs no correction. A shop aid; the calibrated wrench and the fastener torque spec govern.",
  example: torqueAdapterCorrectionExample.inputs,
  fields: [
    { key: "target_torque_ftlb", label: "Target torque at fastener (ft-lb)", kind: "number", default: 100 },
    { key: "wrench_length_in", label: "Wrench lever length (in, drive to grip)", kind: "number", default: 18 },
    { key: "adapter_length_in", label: "Crowfoot / extension length (in)", kind: "number", default: 3 },
    { key: "adapter_angle_deg", label: "Adapter angle from wrench axis (deg, 0 in-line / 90 perpendicular)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "set", id: "tac-out-set", label: "Dial the wrench to", value: (r) => fmt(r.wrench_setting_ftlb, 1) + " ft-lb (" + (r.correction_pct >= 0 ? "+" : "") + fmt(r.correction_pct, 1) + "%)" },
    { key: "unc", id: "tac-out-unc", label: "If set to target instead (uncorrected)", value: (r) => fmt(r.uncorrected_actual_ftlb, 1) + " ft-lb at the fastener" },
    { key: "eff", id: "tac-out-eff", label: "Effective added lever", value: (r) => fmt(r.effective_extension_in, 2) + " in" },
    { key: "n", id: "tac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTorqueAdapterCorrection,
});

// ===================== spec-v500: density altitude and pressure altitude =====================

// dims: in { field_elevation_ft: L, altimeter_in_hg: dimensionless, oat_f: T } out: { oat_c: T, pa_ft: L, isa_c: T, da_ft: L }
export function computeDensityAltitude({ field_elevation_ft = 0, altimeter_in_hg = 29.92, oat_f = 59 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const elev = Number(field_elevation_ft) || 0;
  const alt = Number(altimeter_in_hg) || 0;
  const oatf = Number(oat_f);
  if (!(alt > 0)) return { error: "Altimeter setting must be positive (in Hg)." };
  if (!Number.isFinite(oatf) || oatf < -459.67) return { error: "Outside air temperature must be above absolute zero (-459.67 F)." };
  const oat_c = (oatf - 32) * 5 / 9;
  const pa_ft = elev + (29.92 - alt) * 1000;
  const isa_c = 15 - 2 * (pa_ft / 1000);
  const da_ft = pa_ft + 120 * (oat_c - isa_c);
  if (![oat_c, pa_ft, isa_c, da_ft].every(Number.isFinite)) return { error: "Density-altitude math is not a finite value." };
  return {
    oat_c, pa_ft, isa_c, da_ft,
    note: "FAA density-altitude method (ISA lapse correction): PA = elevation + (29.92 - altimeter) x 1000, ISA temp = 15 - 2 x (PA/1000) degrees C, and DA = PA + 120 x (OAT - ISA). Density altitude is the pressure altitude corrected for the temperature departure from standard -- hot and high robs lift, engine power, and prop thrust even when the field elevation looks benign, so a warm day flies like a much higher field. Humidity lowers air density further; this dry-air model ignores it, so it slightly under-predicts DA on a humid day. A planning estimate; the aircraft flight manual performance charts and the pilot in command govern.",
  };
}
export const densityAltitudeExample = { inputs: { field_elevation_ft: 5000, altimeter_in_hg: 29.92, oat_f: 95 } };

MECHANIC_RENDERERS["density-altitude"] = _simpleRenderer({
  citation: "Citation: FAA density-altitude method (FAA AC 00-6 / ICAO Standard Atmosphere): PA = elevation + (29.92 - altimeter) x 1000; ISA = 15 - 2 x (PA/1000) degrees C; DA = PA + 120 x (OAT - ISA). Density altitude is the pressure altitude corrected for temperature; this dry-air model ignores humidity. A planning estimate; the aircraft flight manual and the pilot in command govern.",
  example: densityAltitudeExample.inputs,
  fields: [
    { key: "field_elevation_ft", label: "Field / station elevation (ft)", kind: "number", default: 5000 },
    { key: "altimeter_in_hg", label: "Altimeter setting (in Hg)", kind: "number", default: 29.92 },
    { key: "oat_f", label: "Outside air temperature (deg F)", kind: "number", default: 95 },
  ],
  outputs: [
    { key: "pa", id: "da-out-pa", label: "Pressure altitude", value: (r) => fmt(r.pa_ft, 0) + " ft" },
    { key: "isa", id: "da-out-isa", label: "Standard (ISA) temp at that altitude", value: (r) => fmt(r.isa_c, 1) + " C (OAT " + fmt(r.oat_c, 1) + " C)" },
    { key: "da", id: "da-out-da", label: "Density altitude", value: (r) => fmt(r.da_ft, 0) + " ft (" + (r.da_ft >= r.pa_ft ? "+" : "") + fmt(r.da_ft - r.pa_ft, 0) + " ft vs pressure altitude)" },
    { key: "n", id: "da-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDensityAltitude,
});

// ===================== spec-v501: crosswind and headwind component =====================

// dims: in { runway_heading_deg: dimensionless, wind_dir_deg: dimensionless, wind_speed_kt: L T^-1, gust_kt: L T^-1, max_demo_xwind_kt: L T^-1 } out: { angle_deg: dimensionless, crosswind_kt: L T^-1, headwind_kt: L T^-1, gust_xwind_kt: L T^-1, tailwind: dimensionless, exceeds: dimensionless }
export function computeCrosswindComponent({ runway_heading_deg = 0, wind_dir_deg = 0, wind_speed_kt = 0, gust_kt = 0, max_demo_xwind_kt = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rw = Number(runway_heading_deg);
  const wd = Number(wind_dir_deg);
  const sp = Number(wind_speed_kt) || 0;
  const gust = Number(gust_kt) || 0;
  const maxd = Number(max_demo_xwind_kt) || 0;
  if (!(rw >= 0 && rw <= 360)) return { error: "Runway heading must be 0 to 360 degrees." };
  if (!(wd >= 0 && wd <= 360)) return { error: "Wind direction must be 0 to 360 degrees." };
  if (sp < 0) return { error: "Wind speed cannot be negative (kt)." };
  if (gust < 0) return { error: "Gust cannot be negative (kt)." };
  if (gust > 0 && gust < sp) return { error: "Gust must be at least the steady wind speed (kt)." };
  if (maxd < 0) return { error: "Maximum demonstrated crosswind cannot be negative (kt)." };
  let angle_deg = Math.abs(wd - rw) % 360; if (angle_deg > 180) angle_deg = 360 - angle_deg;
  const rad = angle_deg * Math.PI / 180;
  const crosswind_kt = sp * Math.sin(rad);
  const headwind_kt = sp * Math.cos(rad);
  const gust_speed = gust > 0 ? gust : sp;
  const gust_xwind_kt = gust_speed * Math.sin(rad);
  const tailwind = angle_deg > 90;
  const exceeds = maxd > 0 && gust_xwind_kt > maxd;
  if (![angle_deg, crosswind_kt, headwind_kt, gust_xwind_kt].every(Number.isFinite)) return { error: "Wind-component math is not a finite value." };
  return {
    angle_deg, crosswind_kt, headwind_kt, gust_xwind_kt, tailwind, exceeds,
    note: "Runway wind-component resolution: angle = |wind direction - runway heading| folded to 0-180, crosswind = speed x sin(angle), headwind = speed x cos(angle) (a negative headwind is a tailwind). The value checked against the aircraft's maximum demonstrated crosswind should be the GUST, not the steady wind. A wind more than 90 degrees off the runway is a tailwind that adds crosswind while removing the headwind margin -- the setup that overruns a runway. The demonstrated crosswind is a capability figure, not a regulatory limit. A planning aid, not a clearance; the pilot in command and the flight manual govern.",
  };
}
export const crosswindComponentExample = { inputs: { runway_heading_deg: 360, wind_dir_deg: 30, wind_speed_kt: 20, gust_kt: 0, max_demo_xwind_kt: 0 } };

MECHANIC_RENDERERS["crosswind-component"] = _simpleRenderer({
  citation: "Citation: runway wind-component resolution (FAA vector method / POH crosswind chart): angle = |wind dir - runway heading| folded to 0-180; crosswind = speed x sin(angle); headwind = speed x cos(angle), negative = tailwind. Check the crosswind limit against the gust, not the steady wind. A planning aid; the pilot in command and the flight manual govern.",
  example: crosswindComponentExample.inputs,
  fields: [
    { key: "runway_heading_deg", label: "Runway heading (deg, e.g. 360 for runway 36)", kind: "number", default: 360 },
    { key: "wind_dir_deg", label: "Wind direction FROM (deg)", kind: "number", default: 30 },
    { key: "wind_speed_kt", label: "Steady wind speed (kt)", kind: "number", default: 20 },
    { key: "gust_kt", label: "Gust speed (kt, 0 = none)", kind: "number", default: 0 },
    { key: "max_demo_xwind_kt", label: "Max demonstrated crosswind (kt, 0 = skip check)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "xw", id: "cwc-out-xw", label: "Crosswind component", value: (r) => fmt(r.crosswind_kt, 1) + " kt" + (r.gust_xwind_kt > r.crosswind_kt ? " (gust " + fmt(r.gust_xwind_kt, 1) + " kt)" : "") + (r.exceeds ? " -- EXCEEDS the demonstrated crosswind" : "") },
    { key: "hw", id: "cwc-out-hw", label: "Headwind component", value: (r) => r.tailwind ? fmt(-r.headwind_kt, 1) + " kt TAILWIND" : fmt(r.headwind_kt, 1) + " kt headwind" },
    { key: "ang", id: "cwc-out-ang", label: "Wind angle off the runway", value: (r) => fmt(r.angle_deg, 0) + " deg" + (r.tailwind ? " (behind the runway heading)" : "") },
    { key: "n", id: "cwc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrosswindComponent,
});

// ===================== spec-v502: displacement hull speed and speed/length ratio =====================

// dims: in { lwl_ft: L, actual_speed_kn: L T^-1 } out: { hull_speed_kn: L T^-1, sl_ratio: dimensionless, regime: dimensionless }
export function computeHullSpeed({ lwl_ft = 0, actual_speed_kn = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lwl = Number(lwl_ft) || 0;
  const sp = Number(actual_speed_kn) || 0;
  if (!(lwl > 0)) return { error: "Waterline length must be positive (ft)." };
  if (sp < 0) return { error: "Actual speed cannot be negative (kn)." };
  const hull_speed_kn = 1.34 * Math.sqrt(lwl);
  const sl_ratio = sp > 0 ? sp / Math.sqrt(lwl) : null;
  const regime = sl_ratio === null ? null : (sl_ratio <= 1.34 ? "displacement" : sl_ratio <= 2.5 ? "semi-displacement" : "planing");
  if (![hull_speed_kn].every(Number.isFinite)) return { error: "Hull-speed math is not a finite value." };
  return {
    hull_speed_kn, sl_ratio, regime,
    note: "Displacement hull-speed relation (Froude speed-length theory): hull_speed = 1.34 x sqrt(LWL) knots, and the speed-length ratio SL = speed / sqrt(LWL). A pure displacement hull is trapped by the wave it makes -- near SL = 1.34 the bow and stern waves merge into a single wave as long as the boat, and the hull cannot climb its own bow wave without enormous added power, so 1.34 is a practical wall. Regime bands: SL <= 1.34 displacement, 1.34-2.5 semi-displacement, > 2.5 planing (riding on top of the water, no longer bound by the displacement ceiling). Light and long hulls exceed the wall more easily; the coefficient is an approximation (some references use 1.34 to 1.4). A planning estimate; the actual hull form, displacement, and power govern.",
  };
}
export const hullSpeedExample = { inputs: { lwl_ft: 25, actual_speed_kn: 0 } };

MECHANIC_RENDERERS["hull-speed"] = _simpleRenderer({
  citation: "Citation: displacement hull-speed relation (Froude speed-length theory): hull_speed = 1.34 x sqrt(LWL) knots; SL ratio = speed / sqrt(LWL); regime bands SL <= 1.34 displacement, 1.34-2.5 semi-displacement, > 2.5 planing. The 1.34 ceiling is a practical wall for a pure displacement hull. A planning estimate; the hull form, displacement, and power govern.",
  example: hullSpeedExample.inputs,
  fields: [
    { key: "lwl_ft", label: "Load waterline length LWL (ft)", kind: "number", default: 25 },
    { key: "actual_speed_kn", label: "Actual / target speed (kn, 0 = hull speed only)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "hs", id: "hs-out-hs", label: "Theoretical hull speed", value: (r) => fmt(r.hull_speed_kn, 2) + " kn" },
    { key: "sl", id: "hs-out-sl", label: "Speed-length ratio", value: (r) => r.sl_ratio === null ? "- (enter an actual speed)" : fmt(r.sl_ratio, 2) },
    { key: "rg", id: "hs-out-rg", label: "Regime", value: (r) => r.regime === null ? "-" : r.regime },
    { key: "n", id: "hs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHullSpeed,
});

// ===================== spec-v505: anchor rode scope and swing radius =====================

// dims: in { water_depth_ft: L, bow_height_ft: L, scope_ratio: dimensionless, boat_loa_ft: L } out: { vertical_ft: L, rode_ft: L, actual_scope: dimensionless, swing_radius_ft: L }
export function computeAnchorRodeScope({ water_depth_ft = 0, bow_height_ft = 0, scope_ratio = 7, boat_loa_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const depth = Number(water_depth_ft) || 0;
  const bow = Number(bow_height_ft) || 0;
  const scope = Number(scope_ratio) || 0;
  const loa = Number(boat_loa_ft) || 0;
  if (!(depth > 0)) return { error: "Water depth must be positive (ft)." };
  if (bow < 0) return { error: "Bow-roller height cannot be negative (ft)." };
  if (loa < 0) return { error: "Boat length cannot be negative (ft)." };
  if (!(scope >= 1)) return { error: "Scope ratio must be at least 1." };
  const vertical_ft = depth + bow;
  const rode_ft = scope * vertical_ft;
  const actual_scope = rode_ft / vertical_ft;
  const swing_radius_ft = Math.sqrt(Math.max(0, rode_ft * rode_ft - vertical_ft * vertical_ft)) + loa;
  if (![vertical_ft, rode_ft, actual_scope, swing_radius_ft].every(Number.isFinite)) return { error: "Anchor-scope math is not a finite value." };
  return {
    vertical_ft, rode_ft, actual_scope, swing_radius_ft,
    note: "Anchor rode scope and swing radius: scope is the ratio of rode paid out to the VERTICAL rise from the seabed to the bow roller -- depth PLUS the bow-roller height, and figured at HIGH tide, not the instantaneous sounder depth. Skip the bow height and the rising tide and the real scope falls short, the anchor breaks out, and the boat drags. rode = scope x vertical, and the swing radius = sqrt(rode^2 - vertical^2) + boat length is the circle the boat sweeps around a set anchor, governing spacing to neighbors and hazards. An all-chain rode holds at a lower ratio (about 5:1 or even 3:1) while rope-and-chain wants 7:1. A planning aid, not a guarantee the anchor holds; local conditions, bottom type, and skipper judgment govern.",
  };
}
export const anchorRodeScopeExample = { inputs: { water_depth_ft: 15, bow_height_ft: 3, scope_ratio: 7, boat_loa_ft: 30 } };

MECHANIC_RENDERERS["anchor-rode-scope"] = _simpleRenderer({
  citation: "Citation: anchor rode scope and swing radius (seamanship convention -- Chapman Piloting, US Sailing, ABYC ground-tackle references): vertical = depth + bow height (at high tide); rode = scope x vertical; swing_radius = sqrt(rode^2 - vertical^2) + boat length. All-chain holds at a lower ratio (5:1 or 3:1); rope-and-chain wants 7:1. A planning aid; local conditions, bottom type, and skipper judgment govern.",
  example: anchorRodeScopeExample.inputs,
  fields: [
    { key: "water_depth_ft", label: "Water depth at high tide (ft)", kind: "number", default: 15 },
    { key: "bow_height_ft", label: "Bow-roller height above water (ft)", kind: "number", default: 3 },
    { key: "scope_ratio", label: "Desired scope (7 rope+chain / 5 mixed / 3 all-chain)", kind: "number", default: 7 },
    { key: "boat_loa_ft", label: "Boat length overall (ft, for swing radius)", kind: "number", default: 30 },
  ],
  outputs: [
    { key: "vt", id: "ars-out-vt", label: "True vertical (depth + bow height)", value: (r) => fmt(r.vertical_ft, 1) + " ft" },
    { key: "rd", id: "ars-out-rd", label: "Rode to deploy", value: (r) => fmt(r.rode_ft, 0) + " ft (actual scope " + fmt(r.actual_scope, 1) + ":1)" },
    { key: "sw", id: "ars-out-sw", label: "Swing radius", value: (r) => fmt(r.swing_radius_ft, 1) + " ft" },
    { key: "n", id: "ars-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAnchorRodeScope,
});

// ===================== spec-v506: turbocharger pressure ratio and charge-air temp =====================

// dims: in { boost_psi: M L^-1 T^-2, ambient_psia: M L^-1 T^-2, inlet_temp_f: T, compressor_eff_pct: dimensionless } out: { pr: dimensionless, t_out_f: T, temp_rise_f: T }
export function computeTurboPressureRatio({ boost_psi = 0, ambient_psia = 14.7, inlet_temp_f = 0, compressor_eff_pct = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const boost = Number(boost_psi) || 0;
  const amb = Number(ambient_psia) || 0;
  const tinF = Number(inlet_temp_f);
  const eff = Number(compressor_eff_pct) || 0;
  if (!(amb > 0)) return { error: "Ambient pressure must be positive (psia)." };
  if (boost < 0) return { error: "Boost cannot be negative (psi)." };
  if (!Number.isFinite(tinF) || tinF <= -459.67) return { error: "Inlet temperature must be above absolute zero (-459.67 F)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Compressor efficiency must be over 0 and at most 100 percent." };
  const pr = (amb + boost) / amb;
  const t_in_r = tinF + 459.67;
  const t_out_r = t_in_r * (1 + (Math.pow(pr, 0.283) - 1) / (eff / 100));
  const t_out_f = t_out_r - 459.67;
  const temp_rise_f = t_out_f - tinF;
  if (![pr, t_out_f, temp_rise_f].every(Number.isFinite)) return { error: "Turbo math is not a finite value." };
  return {
    pr, t_out_f, temp_rise_f,
    note: "Turbocharger pressure ratio and charge-air temperature: boost is a GAUGE number, so PR = (ambient_abs + boost) / ambient_abs -- the ambient must be added before dividing, and the same gauge boost needs a higher pressure ratio at altitude where the ambient is lower. Compressing air heats it: T_out = T_in x [1 + (PR^0.283 - 1) / efficiency] (temperatures absolute), and the PR^0.283 adiabatic term can raise the charge-air temperature well over a hundred degrees, which is why an intercooler is not optional on a serious build. This reports the compressor-OUTLET temperature (it ignores any intercooler, not the manifold temperature) and assumes the gamma = 1.4 dry-air exponent. A planning estimate, not a tune; the compressor map and the engine build govern.",
  };
}
export const turboPressureRatioExample = { inputs: { boost_psi: 15, ambient_psia: 14.7, inlet_temp_f: 80, compressor_eff_pct: 70 } };

MECHANIC_RENDERERS["turbo-pressure-ratio"] = _simpleRenderer({
  citation: "Citation: turbocharger pressure-ratio and charge-air-temperature model (compressor-map sizing; ideal-gas adiabatic compression): PR = (ambient_abs + boost) / ambient_abs; T_out = T_in x [1 + (PR^0.283 - 1) / efficiency], temperatures absolute. Boost is gauge, so add the ambient first; the PR^0.283 term is the heat of compression. Compressor-outlet temperature (ignores any intercooler); gamma = 1.4 assumed. A planning estimate; the compressor map and engine build govern.",
  example: turboPressureRatioExample.inputs,
  fields: [
    { key: "boost_psi", label: "Target boost (psi, gauge)", kind: "number", default: 15 },
    { key: "ambient_psia", label: "Ambient pressure (psia, 14.7 at sea level)", kind: "number", default: 14.7 },
    { key: "inlet_temp_f", label: "Compressor inlet air temp (deg F)", kind: "number", default: 80 },
    { key: "compressor_eff_pct", label: "Compressor isentropic efficiency (%)", kind: "number", default: 70 },
  ],
  outputs: [
    { key: "pr", id: "tpr-out-pr", label: "Pressure ratio", value: (r) => fmt(r.pr, 2) },
    { key: "to", id: "tpr-out-to", label: "Compressor-outlet temp", value: (r) => fmt(r.t_out_f, 0) + " F (rise " + fmt(r.temp_rise_f, 0) + " F)" },
    { key: "n", id: "tpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurboPressureRatio,
});

// ===================== spec-v507: Crouch planing-speed estimate =====================

// dims: in { displacement_lb: M L T^-2, shaft_hp: M L^2 T^-3, hull_constant: dimensionless } out: { weight_to_power: dimensionless, speed_mph: L T^-1 }
export function computeCrouchPlaningSpeed({ displacement_lb = 0, shaft_hp = 0, hull_constant = 190 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const wt = Number(displacement_lb) || 0;
  const hp = Number(shaft_hp) || 0;
  const c = Number(hull_constant) || 0;
  if (!(wt > 0)) return { error: "Displacement must be positive (lb)." };
  if (!(hp > 0)) return { error: "Shaft horsepower must be positive (hp)." };
  if (!(c > 0)) return { error: "Hull constant C must be positive." };
  const weight_to_power = wt / hp;
  const speed_mph = c / Math.sqrt(weight_to_power);
  if (![weight_to_power, speed_mph].every(Number.isFinite)) return { error: "Crouch-speed math is not a finite value." };
  return {
    weight_to_power, speed_mph,
    note: "Crouch's planing-speed formula: speed_mph = C / sqrt(weight / hp). The answer is in MILES PER HOUR, not knots, for the conventional hull constant C, so do not compare it directly to a displacement hull speed in knots. Speed rises only with the square root of the power-to-weight ratio, so doubling the horsepower (or halving the weight) buys about 41% more speed, not double -- the diminishing return that makes the last few mph so expensive. The hull constant C (about 150 heavy cruiser, 190 runabout, 210 race) is chosen by hull type and dominates the estimate. The formula assumes the boat is already ON PLANE; below the planing threshold it does not apply -- use the displacement hull speed. A planning estimate, not a performance prediction; the actual hull, propeller, and conditions govern.",
  };
}
export const crouchPlaningSpeedExample = { inputs: { displacement_lb: 6000, shaft_hp: 200, hull_constant: 190 } };

MECHANIC_RENDERERS["crouch-planing-speed"] = _simpleRenderer({
  citation: "Citation: Crouch's planing-speed formula (naval-architecture back-of-envelope): speed_mph = C / sqrt(weight / hp), with the hull constant C about 150 heavy cruiser / 190 runabout / 210 race. The answer is mph, not knots; speed rises with the square root of the power-to-weight ratio. Assumes the boat is on plane. A planning estimate; the hull, propeller, and conditions govern.",
  example: crouchPlaningSpeedExample.inputs,
  fields: [
    { key: "displacement_lb", label: "Loaded displacement (lb)", kind: "number", default: 6000 },
    { key: "shaft_hp", label: "Shaft / propeller horsepower (hp)", kind: "number", default: 200 },
    { key: "hull_constant", label: "Hull constant C (150 cruiser / 190 runabout / 210 race)", kind: "number", default: 190 },
  ],
  outputs: [
    { key: "sp", id: "cps-out-sp", label: "Planing speed", value: (r) => fmt(r.speed_mph, 1) + " mph (" + fmt(r.speed_mph * 0.868976, 1) + " kn)" },
    { key: "wp", id: "cps-out-wp", label: "Weight-to-power ratio", value: (r) => fmt(r.weight_to_power, 1) + " lb/hp" },
    { key: "n", id: "cps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrouchPlaningSpeed,
});

// ===================== spec-v510: wheel offset and backspacing =====================

// dims: in { rim_width_in: L, offset_mm: L, backspacing_in: L } out: { overall_width_in: L, backspacing_out_in: L, offset_mm_out: L, frontspacing_in: L }
export function computeWheelOffsetBackspacing({ rim_width_in = 0, offset_mm = 0, backspacing_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rim = Number(rim_width_in) || 0;
  const off = Number(offset_mm) || 0;
  const back = Number(backspacing_in) || 0;
  if (!(rim > 0)) return { error: "Rim width must be positive (in)." };
  const overall_width_in = rim + 1;
  let backspacing_out_in, offset_mm_out;
  if (back > 0) {
    backspacing_out_in = back;
    offset_mm_out = (back - rim / 2 - 0.5) * 25.4;
  } else {
    offset_mm_out = off;
    backspacing_out_in = rim / 2 + 0.5 + off / 25.4;
  }
  const frontspacing_in = overall_width_in - backspacing_out_in;
  if (![overall_width_in, backspacing_out_in, offset_mm_out, frontspacing_in].every(Number.isFinite)) return { error: "Wheel-fitment math is not a finite value." };
  return {
    overall_width_in, backspacing_out_in, offset_mm_out, frontspacing_in,
    note: "Wheel offset / backspacing conversion: OFFSET (ET, mm) is from the mounting face to the wheel centerline, BACKSPACING (in) is from the mounting face to the inboard rim edge -- the same geometry in different units and directions. The rim 'width' is the BEAD SEAT, but the wheel is about one inch wider overall (half an inch per flange), so backspacing = rim_width/2 + 0.5 + offset/25.4 -- omit that inch and a fitment comes out an inch wrong. A more POSITIVE offset pulls the wheel INBOARD (more fender clearance, less brake and strut clearance): 0 to +45 mm moves the wheel about 1.8 in inward. A fitment aid, not a guarantee it clears; the actual wheel, hub, and suspension clearances govern.",
  };
}
export const wheelOffsetBackspacingExample = { inputs: { rim_width_in: 8, offset_mm: 45, backspacing_in: 0 } };

MECHANIC_RENDERERS["wheel-offset-backspacing"] = _simpleRenderer({
  citation: "Citation: wheel offset / backspacing conversion (Tire & Rim Association wheel dimensions): overall_width = rim_width + 1; backspacing = rim_width/2 + 0.5 + offset/25.4; offset = (backspacing - rim_width/2 - 0.5) x 25.4. The rim width is the bead seat; the wheel is ~1 in wider overall. A more positive offset pulls the wheel inboard. A fitment aid; the wheel, hub, and suspension clearances govern.",
  example: wheelOffsetBackspacingExample.inputs,
  fields: [
    { key: "rim_width_in", label: "Rim (bead-seat) width (in)", kind: "number", default: 8 },
    { key: "offset_mm", label: "Offset ET (mm, + = outboard face; use if solving from offset)", kind: "number", default: 45 },
    { key: "backspacing_in", label: "Backspacing (in, 0 = solve it from offset)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "ov", id: "wob-out-ov", label: "Overall width (bead seat + 1 in)", value: (r) => fmt(r.overall_width_in, 2) + " in" },
    { key: "bk", id: "wob-out-bk", label: "Backspacing", value: (r) => fmt(r.backspacing_out_in, 2) + " in" },
    { key: "of", id: "wob-out-of", label: "Offset ET", value: (r) => fmt(r.offset_mm_out, 0) + " mm" },
    { key: "fr", id: "wob-out-fr", label: "Frontspacing", value: (r) => fmt(r.frontspacing_in, 2) + " in" },
    { key: "n", id: "wob-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWheelOffsetBackspacing,
});

// ===================== spec-v514: brake pedal ratio and line pressure =====================

// dims: in { pedal_force_lb: M L T^-2, pedal_ratio: dimensionless, booster_factor: dimensionless, mc_bore_in: L, caliper_area_in2: L^2, pad_friction: dimensionless, rotor_radius_in: L } out: { mc_force_lb: M L T^-2, line_psi: M L^-1 T^-2, clamp_lb: M L T^-2, brake_torque_inlb: M L^2 T^-2 }
export function computeBrakePedalHydraulic({ pedal_force_lb = 0, pedal_ratio = 0, booster_factor = 1, mc_bore_in = 0, caliper_area_in2 = 0, pad_friction = 0.4, rotor_radius_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pf = Number(pedal_force_lb) || 0;
  const ratio = Number(pedal_ratio) || 0;
  const boost = Number(booster_factor) || 0;
  const bore = Number(mc_bore_in) || 0;
  const cal = Number(caliper_area_in2) || 0;
  const mu = Number(pad_friction) || 0;
  const rr = Number(rotor_radius_in) || 0;
  if (!(pf > 0)) return { error: "Pedal force must be positive (lb)." };
  if (!(ratio > 0)) return { error: "Pedal ratio must be positive." };
  if (!(boost > 0)) return { error: "Booster factor must be positive (1.0 = manual)." };
  if (!(bore > 0)) return { error: "Master-cylinder bore must be positive (in)." };
  if (!(cal > 0)) return { error: "Caliper piston area must be positive (in^2)." };
  if (!(rr > 0)) return { error: "Rotor radius must be positive (in)." };
  if (mu < 0) return { error: "Pad friction coefficient cannot be negative." };
  const mc_force_lb = pf * ratio * boost;
  const mc_area = Math.PI / 4 * bore * bore;
  const line_psi = mc_force_lb / mc_area;
  const clamp_lb = line_psi * cal;
  const brake_torque_inlb = clamp_lb * 2 * mu * rr;
  if (![mc_force_lb, line_psi, clamp_lb, brake_torque_inlb].every(Number.isFinite)) return { error: "Brake-hydraulic math is not a finite value." };
  return {
    mc_force_lb, line_psi, clamp_lb, brake_torque_inlb,
    note: "Hydraulic brake force chain (Pascal's law): mc_force = pedal_force x pedal_ratio x booster; line_pressure = mc_force / mc_area (mc_area = pi/4 x bore^2); clamp = line_pressure x caliper_area; brake_torque = clamp x 2 x pad_friction x rotor_radius. Because pressure is force over area and area scales with the SQUARE of the bore, DOUBLING the master-cylinder bore QUARTERS the line pressure for the same leg effort -- the whole manual-versus-boosted trade: a big-bore master makes less pressure but moves more fluid (firmer-but-heavier), a small-bore master makes pressure easily but needs more pedal travel. The factor of 2 in the torque accounts for both pad faces. A design aid, not a validated brake system; the actual pad friction, thermal state, and system compliance govern.",
  };
}
export const brakePedalHydraulicExample = { inputs: { pedal_force_lb: 50, pedal_ratio: 5, booster_factor: 1, mc_bore_in: 0.875, caliper_area_in2: 4, pad_friction: 0.4, rotor_radius_in: 4.5 } };

MECHANIC_RENDERERS["brake-pedal-hydraulic"] = _simpleRenderer({
  citation: "Citation: hydraulic brake force chain (Pascal's law; SAE brake-system design practice): mc_force = pedal_force x ratio x booster; line_pressure = mc_force / (pi/4 x bore^2); clamp = line_pressure x caliper_area; brake_torque = clamp x 2 x friction x rotor_radius. Doubling the master-cylinder bore quarters the pressure (area ~ bore^2); the 2 accounts for both pad faces. A design aid; the pad friction, thermal state, and system compliance govern.",
  example: brakePedalHydraulicExample.inputs,
  fields: [
    { key: "pedal_force_lb", label: "Pedal force (lb)", kind: "number", default: 50 },
    { key: "pedal_ratio", label: "Pedal ratio", kind: "number", default: 5 },
    { key: "booster_factor", label: "Booster factor (1.0 = manual)", kind: "number", default: 1 },
    { key: "mc_bore_in", label: "Master-cylinder bore (in)", kind: "number", default: 0.875 },
    { key: "caliper_area_in2", label: "Caliper piston area per corner (in^2)", kind: "number", default: 4 },
    { key: "pad_friction", label: "Pad friction coefficient (~0.4)", kind: "number", default: 0.4 },
    { key: "rotor_radius_in", label: "Effective rotor radius (in)", kind: "number", default: 4.5 },
  ],
  outputs: [
    { key: "lp", id: "bph-out-lp", label: "Line pressure", value: (r) => fmt(r.line_psi, 0) + " psi (MC force " + fmt(r.mc_force_lb, 0) + " lb)" },
    { key: "cl", id: "bph-out-cl", label: "Caliper clamp", value: (r) => fmt(r.clamp_lb, 0) + " lb" },
    { key: "bt", id: "bph-out-bt", label: "Brake torque (per corner)", value: (r) => fmt(r.brake_torque_inlb, 0) + " in-lb" },
    { key: "n", id: "bph-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBrakePedalHydraulic,
});

// ===================== spec-v515: SAE J1349 dyno correction factor =====================

// dims: in { observed_hp: M L^2 T^-3, baro_mbar: M L^-1 T^-2, air_temp_c: T, humidity_pct: dimensionless } out: { vapor_mbar: M L^-1 T^-2, p_dry_mbar: M L^-1 T^-2, cf: dimensionless, corrected_hp: M L^2 T^-3, in_window: dimensionless }
export function computeDynoCorrectionSae({ observed_hp = 0, baro_mbar = 0, air_temp_c = 25, humidity_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p = Number(observed_hp) || 0;
  const baro = Number(baro_mbar) || 0;
  const t = Number(air_temp_c);
  const rh = Number(humidity_pct) || 0;
  if (!(p > 0)) return { error: "Observed power must be positive (hp)." };
  if (!(baro > 0)) return { error: "Barometric pressure must be positive (mbar)." };
  if (!Number.isFinite(t) || t <= -273.15) return { error: "Air temperature must be above absolute zero (-273.15 C)." };
  if (!(rh >= 0 && rh <= 100)) return { error: "Relative humidity must be 0 to 100 percent." };
  const es_mbar = 6.1078 * Math.pow(10, 7.5 * t / (237.3 + t)); // Magnus saturation vapor pressure
  const vapor_mbar = es_mbar * rh / 100;
  const p_dry_mbar = baro - vapor_mbar;
  if (!(p_dry_mbar > 0)) return { error: "Dry pressure came out non-positive; check the barometric pressure and humidity." };
  const cf = 1.18 * (990 / p_dry_mbar) * Math.sqrt((t + 273) / 298) - 0.18;
  const corrected_hp = p * cf;
  const in_window = t >= 15 && t <= 35 && p_dry_mbar >= 900 && p_dry_mbar <= 1050;
  if (![vapor_mbar, p_dry_mbar, cf, corrected_hp].every(Number.isFinite)) return { error: "Dyno-correction math is not a finite value." };
  return {
    vapor_mbar, p_dry_mbar, cf, corrected_hp, in_window,
    note: "SAE J1349 dyno correction factor: corrects observed power to a standard day (25 C, 99 kPa DRY). The pressure used must be the DRY pressure with the water-vapor pressure removed (humid air makes less power, and the correction must know it): P_dry = baro - vapor, CF = 1.18 x (990 / P_dry) x sqrt((temp_C + 273)/298) - 0.18, corrected = observed x CF. The factor is valid only in about the 15 to 35 C and 900 to 1050 mbar window; outside it the correction distorts (this tile flags it). The older STD (SAE J607) basis runs about 4% higher than J1349, so a shop quoting STD numbers cannot be compared to a SAE number without matching the basis. A comparison aid, not a certified rating; the dyno, correction basis, and test procedure govern.",
  };
}
export const dynoCorrectionSaeExample = { inputs: { observed_hp: 400, baro_mbar: 980, air_temp_c: 30, humidity_pct: 0 } };

// spec-v593: the tile faces the US user in in Hg / deg F and converts at the
// renderer boundary to the metric reference the J1349 correlation is published
// in (1 in Hg = 33.8638866667 mbar; deg C = (deg F - 32) x 5/9). The compute
// keeps its metric-native signature; fixtures stay correlation-native.
const _DCS_MBAR_PER_INHG = 33.8638866667;
MECHANIC_RENDERERS["dyno-correction-sae"] = _simpleRenderer({
  citation: "Citation: SAE J1349 dyno correction factor (STD per SAE J607): P_dry = baro - vapor(temp, RH); CF = 1.18 x (990 / P_dry_mbar) x sqrt((temp_C + 273)/298) - 0.18; corrected = observed x CF. Corrects to a standard dry day; the pressure must be dry (vapor removed); valid ~15-35 C, 900-1050 mbar; STD (J607) runs ~4% higher. A comparison aid; the dyno and correction basis govern.",
  example: { observed_hp: 400, baro_inhg: 28.94, air_temp_f: 86, humidity_pct: 0 },
  fields: [
    { key: "observed_hp", label: "Observed power (hp)", kind: "number", default: 400 },
    { key: "baro_inhg", label: "Barometric pressure (in Hg, absolute)", kind: "number", default: 28.94 },
    { key: "air_temp_f", label: "Inlet air temperature (deg F)", kind: "number", default: 86 },
    { key: "humidity_pct", label: "Relative humidity (%)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "pd", id: "dcs-out-pd", label: "Dry pressure (vapor removed)", value: (r) => fmt(r.p_dry_mbar / _DCS_MBAR_PER_INHG, 2) + " in Hg (" + fmt(r.p_dry_mbar, 1) + " mbar)" },
    { key: "cf", id: "dcs-out-cf", label: "SAE J1349 correction factor", value: (r) => fmt(r.cf, 4) + (r.in_window ? "" : " -- OUTSIDE the 59-95 F / 26.6-31.0 in Hg validity window") },
    { key: "cp", id: "dcs-out-cp", label: "Corrected power (SAE)", value: (r) => fmt(r.corrected_hp, 1) + " hp" },
    { key: "n", id: "dcs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: (p) => computeDynoCorrectionSae({
    observed_hp: p.observed_hp,
    baro_mbar: p.baro_inhg * _DCS_MBAR_PER_INHG,
    air_temp_c: (p.air_temp_f - 32) * 5 / 9,
    humidity_pct: p.humidity_pct,
  }),
});

// ===================== spec-v516: aircraft weight and balance (CG envelope) =====================

// dims: in { empty_weight_lb: M L T^-2, empty_arm_in: L, front_weight_lb: M L T^-2, front_arm_in: L, rear_weight_lb: M L T^-2, rear_arm_in: L, fuel_weight_lb: M L T^-2, fuel_arm_in: L, baggage_weight_lb: M L T^-2, baggage_arm_in: L, max_gross_lb: M L T^-2, fwd_cg_limit_in: L, aft_cg_limit_in: L } out: { total_weight_lb: M L T^-2, total_moment_inlb: M L^2 T^-2, cg_in: L, in_envelope: dimensionless }
export function computeAircraftWeightBalance({ empty_weight_lb = 0, empty_arm_in = 0, front_weight_lb = 0, front_arm_in = 0, rear_weight_lb = 0, rear_arm_in = 0, fuel_weight_lb = 0, fuel_arm_in = 0, baggage_weight_lb = 0, baggage_arm_in = 0, max_gross_lb = 0, fwd_cg_limit_in = 0, aft_cg_limit_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ew = Number(empty_weight_lb) || 0;
  const mgw = Number(max_gross_lb) || 0;
  const fwd = Number(fwd_cg_limit_in) || 0;
  const aft = Number(aft_cg_limit_in) || 0;
  const stations = [
    [ew, Number(empty_arm_in) || 0],
    [Number(front_weight_lb) || 0, Number(front_arm_in) || 0],
    [Number(rear_weight_lb) || 0, Number(rear_arm_in) || 0],
    [Number(fuel_weight_lb) || 0, Number(fuel_arm_in) || 0],
    [Number(baggage_weight_lb) || 0, Number(baggage_arm_in) || 0],
  ];
  if (!(ew > 0)) return { error: "Empty weight must be positive (lb)." };
  if (!(mgw > 0)) return { error: "Maximum gross weight must be positive (lb)." };
  if (!(fwd < aft)) return { error: "Forward CG limit must be below the aft CG limit (in)." };
  for (const [w] of stations) if (w < 0) return { error: "Station weights cannot be negative (lb)." };
  let total_weight_lb = 0, total_moment_inlb = 0;
  for (const [w, arm] of stations) { total_weight_lb += w; total_moment_inlb += w * arm; }
  const cg_in = total_moment_inlb / total_weight_lb;
  const over_gross = total_weight_lb > mgw;
  const cg_out = cg_in < fwd || cg_in > aft;
  const in_envelope = !over_gross && !cg_out;
  if (![total_weight_lb, total_moment_inlb, cg_in].every(Number.isFinite)) return { error: "Weight-and-balance math is not a finite value." };
  return {
    total_weight_lb, total_moment_inlb, cg_in, in_envelope, over_gross, cg_out,
    note: "Station-moment weight and balance: total_weight = sum(w), total_moment = sum(w x arm), CG = total_moment / total_weight, and the load is legal only if weight <= max gross AND fwd_limit <= CG <= aft_limit. A load WITHIN gross weight can still be OUT of CG -- pile baggage aft and the airplane weighs less than its maximum while its CG slides behind the aft limit, dangerously unstable in pitch. This is the trap W&B exists to catch. Fuel burn moves the CG in flight, so a load in the envelope at takeoff can drift out by landing -- both the takeoff and the zero-fuel/landing CG must fall in the envelope. Arms are measured from the aircraft datum. A loading aid, not an airworthiness determination; the specific aircraft flight manual and the pilot in command govern.",
  };
}
export const aircraftWeightBalanceExample = { inputs: { empty_weight_lb: 1500, empty_arm_in: 39, front_weight_lb: 340, front_arm_in: 37, rear_weight_lb: 0, rear_arm_in: 71, fuel_weight_lb: 180, fuel_arm_in: 48, baggage_weight_lb: 200, baggage_arm_in: 95, max_gross_lb: 2300, fwd_cg_limit_in: 35, aft_cg_limit_in: 47 } };

MECHANIC_RENDERERS["aircraft-weight-balance"] = _simpleRenderer({
  citation: "Citation: station-moment weight and balance (FAA Weight & Balance Handbook FAA-H-8083-1; AC 91-23): total_weight = sum(w), total_moment = sum(w x arm), CG = moment / weight; legal only if weight <= max gross AND fwd_limit <= CG <= aft_limit. A load within gross can still be out of CG; fuel burn moves the CG, so both ends must be checked. A loading aid; the aircraft flight manual and the pilot in command govern.",
  example: aircraftWeightBalanceExample.inputs,
  fields: [
    { key: "empty_weight_lb", label: "Empty weight (lb)", kind: "number", default: 1500 },
    { key: "empty_arm_in", label: "Empty-weight arm (in from datum)", kind: "number", default: 39 },
    { key: "front_weight_lb", label: "Front seats weight (lb)", kind: "number", default: 340 },
    { key: "front_arm_in", label: "Front seats arm (in)", kind: "number", default: 37 },
    { key: "rear_weight_lb", label: "Rear seats weight (lb)", kind: "number", default: 0 },
    { key: "rear_arm_in", label: "Rear seats arm (in)", kind: "number", default: 71 },
    { key: "fuel_weight_lb", label: "Fuel weight (lb)", kind: "number", default: 180 },
    { key: "fuel_arm_in", label: "Fuel arm (in)", kind: "number", default: 48 },
    { key: "baggage_weight_lb", label: "Baggage weight (lb)", kind: "number", default: 200 },
    { key: "baggage_arm_in", label: "Baggage arm (in)", kind: "number", default: 95 },
    { key: "max_gross_lb", label: "Maximum gross weight (lb)", kind: "number", default: 2300 },
    { key: "fwd_cg_limit_in", label: "Forward CG limit (in)", kind: "number", default: 35 },
    { key: "aft_cg_limit_in", label: "Aft CG limit (in)", kind: "number", default: 47 },
  ],
  outputs: [
    { key: "tw", id: "awb-out-tw", label: "Total weight", value: (r) => fmt(r.total_weight_lb, 0) + " lb" + (r.over_gross ? " -- OVER max gross" : "") },
    { key: "cg", id: "awb-out-cg", label: "Center of gravity", value: (r) => fmt(r.cg_in, 2) + " in" + (r.cg_out ? " -- OUTSIDE the CG envelope" : "") },
    { key: "v", id: "awb-out-v", label: "In envelope?", value: (r) => r.in_envelope ? "YES (within weight and CG)" : (r.over_gross && r.cg_out ? "NO -- over gross AND out of CG" : r.over_gross ? "NO -- over max gross" : "NO -- out of CG (under gross but CG outside limits)") },
    { key: "n", id: "awb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAircraftWeightBalance,
});

// ===================== spec-v517: ABYC E-11 marine DC wire sizing =====================
// Standard AWG circular-mil areas, smallest wire to largest.
const _AWG_CIRCULAR_MILS = [
  { awg: "18", cm: 1620 }, { awg: "16", cm: 2580 }, { awg: "14", cm: 4110 },
  { awg: "12", cm: 6530 }, { awg: "10", cm: 10380 }, { awg: "8", cm: 16510 },
  { awg: "6", cm: 26240 }, { awg: "4", cm: 41740 }, { awg: "2", cm: 66360 },
  { awg: "1", cm: 83690 }, { awg: "1/0", cm: 105600 }, { awg: "2/0", cm: 133100 },
  { awg: "3/0", cm: 167800 }, { awg: "4/0", cm: 211600 },
];
// dims: in { current_a: I, run_length_ft: L, system_voltage_v: M L^2 T^-3 I^-1, drop_pct: dimensionless } out: { v_drop_v: M L^2 T^-3 I^-1, circular_mils: dimensionless, awg: dimensionless }
export function computeAbycDcWire({ current_a = 0, run_length_ft = 0, system_voltage_v = 0, drop_pct = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const i = Number(current_a) || 0;
  const len = Number(run_length_ft) || 0;
  const v = Number(system_voltage_v) || 0;
  const dp = Number(drop_pct) || 0;
  if (!(i > 0)) return { error: "Load current must be positive (A)." };
  if (!(len > 0)) return { error: "Run length must be positive (ft)." };
  if (!(v > 0)) return { error: "System voltage must be positive (V)." };
  if (!(dp > 0 && dp <= 100)) return { error: "Allowable drop must be over 0 and at most 100 percent." };
  const v_drop_v = dp / 100 * v;
  const circular_mils = 10.75 * i * (2 * len) / v_drop_v;
  const pick = _AWG_CIRCULAR_MILS.find((a) => a.cm >= circular_mils);
  const awg = pick ? pick.awg : null;
  if (![v_drop_v, circular_mils].every(Number.isFinite)) return { error: "ABYC wire-size math is not a finite value." };
  return {
    v_drop_v, circular_mils, awg, awg_cm: pick ? pick.cm : null,
    note: "ABYC E-11 DC wire sizing by voltage drop: a dockside NEC wire size undersizes on a boat for two reasons. First, ABYC sizes on the ROUND-TRIP length (out and back), CM = 10.75 x current x (2 x length) / V_drop, not the NEC one-way habit. Second, the marine allowable drop is stricter where it matters: 3% for panelboard feeders and navigation/critical loads (10% for non-critical) -- on a 12 V system a 3% drop is only 0.36 V of headroom, which drives the conductor up fast. The AWG is the smallest standard size with at least that circular-mil area. The ABYC ampacity table (with its engine-space and bundling derates) sets a SEPARATE floor the drop size must also clear. A design aid, not the ABYC standard itself; the standard, the wire's temperature rating, and the installation govern.",
  };
}
export const abycDcWireExample = { inputs: { current_a: 20, run_length_ft: 25, system_voltage_v: 12, drop_pct: 3 } };

MECHANIC_RENDERERS["abyc-dc-wire"] = _simpleRenderer({
  citation: "Citation: ABYC E-11 (AC & DC Electrical Systems on Boats) DC wire sizing by voltage drop: V_drop = drop_pct/100 x system_voltage; CM = 10.75 x current x (2 x length) / V_drop (round-trip length); AWG = smallest standard size with >= that circular-mil area. 3% drop for panelboard feeders and critical loads, 10% non-critical; the ABYC ampacity table sets a separate floor. A design aid; the standard and installation govern.",
  example: abycDcWireExample.inputs,
  fields: [
    { key: "current_a", label: "Load current (A)", kind: "number", default: 20 },
    { key: "run_length_ft", label: "One-way run length (ft, tile doubles it)", kind: "number", default: 25 },
    { key: "system_voltage_v", label: "System voltage (V, 12 / 24 / 32)", kind: "number", default: 12 },
    { key: "drop_pct", label: "Allowable drop (%, 3 critical / 10 non-critical)", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "vd", id: "adw-out-vd", label: "Allowable voltage drop", value: (r) => fmt(r.v_drop_v, 2) + " V" },
    { key: "cm", id: "adw-out-cm", label: "Required copper", value: (r) => fmt(r.circular_mils, 0) + " circular mils" },
    { key: "awg", id: "adw-out-awg", label: "AWG to pick (by voltage drop)", value: (r) => r.awg === null ? "> 4/0 (exceeds this tile's table)" : "#" + r.awg + " (" + fmt(r.awg_cm, 0) + " CM)" },
    { key: "n", id: "adw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAbycDcWire,
});
