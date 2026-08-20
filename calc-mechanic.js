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
  // 1215.2 = inches per nautical mile / minutes per hour = (12 * 6076.12) / 60.
  // (The old 1056 = 12 * 5280 / 60 is the statute-mile constant, which yields
  // mph, not the knots this tile's inputs and output are labeled in.)
  const theoretical_kt = (rpm / gear_ratio) * pitch_in / 1215.2;
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

// dims: in { bore_in: L, stroke_in: L, target_cr: dimensionless, gasket_bore_in: L, gasket_thickness_in: L, deck_clearance_in: L, dome_dish_cc: L^3 } out: { chamber_cc: L^3, tdc_volume_cc: L^3, cyl_cc: L^3 }
export function computeChamberCcForCr({
  bore_in = 0, stroke_in = 0, target_cr = 0,
  gasket_bore_in = 0, gasket_thickness_in = 0,
  deck_clearance_in = 0, dome_dish_cc = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bore_in > 0 && stroke_in > 0)) return { error: "Bore and stroke must be positive (in)." };
  if (!(target_cr > 1)) return { error: "Target compression ratio must be greater than 1." };
  // Per-cylinder swept volume in cc (1 in^3 = 16.387 cc), matching displacement-cr.
  const cyl_cc = Math.PI * 0.25 * bore_in * bore_in * stroke_in * 16.387;
  const gasket_cc = gasket_bore_in > 0 && gasket_thickness_in > 0
    ? Math.PI * 0.25 * gasket_bore_in * gasket_bore_in * gasket_thickness_in * 16.387
    : 0;
  const deck_cc = deck_clearance_in > 0
    ? Math.PI * 0.25 * bore_in * bore_in * deck_clearance_in * 16.387
    : 0;
  const dome = Number(dome_dish_cc) || 0;
  // Inverse of CR = (cyl_cc + tdc) / tdc: tdc = cyl_cc / (CR - 1);
  // then chamber = tdc - gasket_cc - deck_cc + dome (from tdc = chamber + gasket + deck - dome).
  const tdc_volume_cc = cyl_cc / (target_cr - 1);
  const chamber_cc = tdc_volume_cc - gasket_cc - deck_cc + dome;
  if (!Number.isFinite(chamber_cc)) return { error: "Chamber-volume math is not a finite value." };
  if (!(chamber_cc > 0)) return { error: "Target CR is too high for this geometry: the chamber volume would be zero or negative. Lower the target CR, reduce deck/gasket, or add a dished piston." };
  return {
    chamber_cc, tdc_volume_cc, cyl_cc, gasket_cc, deck_cc,
    note: "The combustion-chamber volume needed to hit a target static compression ratio, the inverse of the displacement-cr tile: from CR = (cylinder_cc + TDC_volume) / TDC_volume, TDC_volume = cylinder_cc / (CR - 1), and the chamber = TDC_volume - gasket - deck + dome. This is how much cc the head chambers must measure (or, comparing to a known chamber, how much to mill or how large a dished/domed piston to run). A domed piston subtracts volume (raises CR), a dished piston adds it; a thinner gasket or less deck clearance raises CR. Static CR only; it does not model dynamic CR, cam timing, or quench. A build aid; cc'ing the actual chambers and the engine builder govern."
  };
}
export const chamberCcForCrExample = { inputs: { bore_in: 4.0, stroke_in: 3.48, target_cr: 10.73, gasket_bore_in: 4.1, gasket_thickness_in: 0.040, deck_clearance_in: 0.005, dome_dish_cc: 0 } };

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

export const boltStretchExample = { inputs: { diameter_in: 0.5, grip_length_in: 3, stretch_thou: 5, material: "steel", k_factor: 0.18 } };

// --- 199: Driveshaft Critical Speed ---
//
// Euler-Bernoulli first mode for a simply-supported tube (first-mode eigenvalue (beta*L)^2 = pi^2):
//   N_crit_rpm = (pi^2 / L^2) * sqrt((E*I) / (rho*A)) * (60 / (2*pi))
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
  const omega_n = (Math.PI * Math.PI / Math.pow(L_m, 2)) * Math.sqrt((m.E_pa * I) / (m.rho_kg_m3 * A));
  const N_crit_rpm = omega_n * 60 / (2 * Math.PI);
  // Public guidance: operate below 0.6-0.75 of critical.
  const safe_rpm = N_crit_rpm * 0.65;
  return { critical_rpm: N_crit_rpm, recommended_max_rpm: safe_rpm };
}

export const driveshaftExample = { inputs: { od_in: 3.5, wall_in: 0.083, length_in: 48, material: "steel" } };

// dims: in { target_rpm: T^-1, od_in: L, wall_in: L, material: dimensionless } out: { max_length_in: L, critical_rpm: T^-1 }
export function computeDriveshaftMaxLength({ target_rpm = 0, od_in = 0, wall_in = 0, material = "steel" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rpm = Number(target_rpm) || 0;
  if (!(rpm > 0)) return { error: "Target operating RPM must be positive." };
  // Reuse the forward tile at a reference length to extract the geometry constant K (N_crit = K / L^2).
  const L_ref = 100;
  const ref = computeDriveshaftCritical({ od_in, wall_in, length_in: L_ref, material });
  if (ref.error) return ref;
  // N_crit(L) = N_crit_ref x (L_ref/L)^2; the safe limit is 0.65 x N_crit. Setting safe(L_max) = target_rpm:
  // L_max = L_ref x sqrt(0.65 x N_crit_ref / target_rpm), and the critical speed there is target_rpm / 0.65.
  const max_length_in = L_ref * Math.sqrt(0.65 * ref.critical_rpm / rpm);
  const critical_rpm = rpm / 0.65;
  if (!Number.isFinite(max_length_in) || !(max_length_in > 0)) return { error: "Length math is not a finite positive value." };
  return {
    max_length_in, critical_rpm, safety_factor: 0.65,
    note: "The longest a driveshaft tube can be before it whips at a target operating speed, the inverse of the driveshaft-crit tile: the first-mode critical speed falls as 1/length^2 (Euler-Bernoulli), so L_max = L_ref x sqrt(0.65 x N_crit_ref / target_rpm), keeping the running speed at or below 0.65 of critical (the public guidance is to stay below 0.6-0.75). Halving the operating RPM lets the shaft grow by sqrt(2) = 41% before it whips, which is why a long run is split with a center support bearing or built from a larger, stiffer, or composite tube. This is a bare-tube first-mode estimate; the yokes, slip joint, balance, and support bearings shift the real critical speed, so keep margin. A design aid; the driveline manufacturer and a whirl analysis govern."
  };
}
export const driveshaftMaxLengthExample = { inputs: { target_rpm: 6385.23, od_in: 3.5, wall_in: 0.083, material: "steel" } };
const renderDriveshaftMaxLength = _simpleRenderer({
  citation: "Citation: Euler-Bernoulli first-mode critical speed solved for length: the critical RPM falls as 1/length^2, so L_max = L_ref x sqrt(0.65 x N_crit_ref / target_rpm), keeping the running speed below 0.65 of critical (public guidance 0.6-0.75). A bare-tube estimate; the yokes, slip joint, balance, and support bearings shift the real critical speed. A design aid; the driveline manufacturer and a whirl analysis govern.",
  example: driveshaftMaxLengthExample.inputs,
  fields: [
    { key: "target_rpm", label: "Operating speed (RPM)", kind: "number" },
    { key: "od_in", label: "Tube outer diameter (in)", kind: "number" },
    { key: "wall_in", label: "Tube wall thickness (in)", kind: "number" },
    { key: "material", label: "Material", kind: "select", options: Object.keys(SHAFT_MATERIALS).map((k) => ({ value: k, label: k })) },
  ],
  outputs: [
    { key: "l", id: "dml-out-l", label: "Max shaft length", value: (r) => fmt(r.max_length_in, 1) + " in" },
    { key: "c", id: "dml-out-c", label: "Critical speed at that length", value: (r) => fmt(r.critical_rpm, 0) + " RPM (running at 0.65 of critical)" },
    { key: "n", id: "dml-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDriveshaftMaxLength,
});

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

export const tireGearingExample = { inputs: { original_size: "P265/70R17", new_size: "33x12.50R17", axle_ratio: 3.73, top_gear_ratio: 0.84, target_rpm: 1800 } };

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

export const brakePadLifeExample = { inputs: { vehicle_weight_lb: 4000, speed_delta_mph: 30, stops_per_mile: 1, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 } };

// --- Renderers ---

function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
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

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

const renderPropSlip = _simpleRenderer({
  citation: "Citation: Public marine engineering practice. Theoretical kt = (RPM/gear) * pitch / 1215.2. Slip percent = (theoretical - actual) / theoretical * 100.",
  example: propSlipExample.inputs,
  fields: [
    { key: "rpm", label: "Engine RPM", kind: "number" },
    { key: "gear_ratio", label: "Gear ratio", kind: "number" },
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

const renderChamberCcForCr = _simpleRenderer({
  citation: "Citation: static compression-ratio identity solved for the chamber volume: TDC_volume = cylinder_cc / (target_CR - 1), chamber = TDC_volume - gasket - deck + dome, from CR = (cylinder_cc + TDC_volume) / TDC_volume. 1 in^3 = 16.387 cc. Static CR only; cc'ing the actual chambers and the engine builder govern.",
  example: chamberCcForCrExample.inputs,
  fields: [
    { key: "bore_in", label: "Bore (in)", kind: "number" },
    { key: "stroke_in", label: "Stroke (in)", kind: "number" },
    { key: "target_cr", label: "Target compression ratio (x:1)", kind: "number" },
    { key: "gasket_bore_in", label: "Head-gasket bore (in)", kind: "number" },
    { key: "gasket_thickness_in", label: "Head-gasket thickness (in)", kind: "number" },
    { key: "deck_clearance_in", label: "Deck clearance (in)", kind: "number" },
    { key: "dome_dish_cc", label: "Dome (+) / dish (-) volume (cc)", kind: "number" },
  ],
  outputs: [
    { key: "ch", id: "cccr-out-ch", label: "Required chamber volume", value: (r) => fmt(r.chamber_cc, 1) + " cc" },
    { key: "tdc", id: "cccr-out-tdc", label: "Total TDC volume", value: (r) => fmt(r.tdc_volume_cc, 1) + " cc (cylinder " + fmt(r.cyl_cc, 1) + " cc)" },
    { key: "n", id: "cccr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeChamberCcForCr,
});

const renderBoltStretch = _simpleRenderer({
  citation: "Citation: Public engineering practice. Clamp load F = (stretch * area * E) / grip. Cross-check torque from utility 153 short form.",
  example: boltStretchExample.inputs,
  fields: [
    { key: "diameter_in", label: "Bolt diameter (in)", kind: "number" },
    { key: "grip_length_in", label: "Grip length (in)", kind: "number" },
    { key: "stretch_thou", label: "Target stretch (0.001 in)", kind: "number" },
    { key: "material", label: "Fastener material", kind: "select", options: Object.keys(FASTENER_MODULUS_PSI).map((k) => ({ value: k, label: k })) },
    { key: "k_factor", label: "Torque K-factor", kind: "number" },
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
    { key: "load_factor", label: "Load factor (0-1.5)", kind: "number" },
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
    { key: "target_rpm", label: "Target cruise RPM", kind: "number" },
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
    { key: "pad_thickness_mm", label: "Pad thickness (mm)", kind: "number" },
    { key: "pad_material", label: "Pad material", kind: "select", options: Object.keys(PAD_WEAR_RATE).map((k) => ({ value: k, label: PAD_WEAR_RATE[k].label })) },
    // v23 EN.14: optional shop wear-rate override + front/rear bias split.
    { key: "wear_rate_mm_per_kj", label: "Wear rate (mm/kJ, optional shop data)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "front_bias_pct", label: "Front brake bias (%, default 50)", kind: "number", default: 50 },
    { key: "rotor_mass_lb", label: "Rotor mass (lb)", kind: "number" },
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
  "chamber-cc-for-cr": renderChamberCcForCr,
  "bolt-stretch":     renderBoltStretch,
  "driveshaft-crit":  renderDriveshaft,
  "driveshaft-max-length": renderDriveshaftMaxLength,
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
    { key: "specific_gravity", label: "Specific gravity", kind: "number" },
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
    { key: "bulk_density_lb_ft3", label: "Bulk density (lb/ft³, optional)", kind: "number" },
  ],
  outputs: [
    { key: "cap", id: "scv-out-cap", label: "Volumetric capacity", value: (r) => fmt(r.capacity_ft3_hr, 1) + " ft^3/hr" + (r.over_loaded ? " (loading high - verify CEMA class)" : "") },
    { key: "mass", id: "scv-out-mass", label: "Mass rate (if density given)", value: (r) => r.mass_rate_lb_hr === null ? "(enter bulk density)" : fmt(r.mass_rate_lb_hr, 0) + " lb/hr (" + fmt(r.mass_rate_ton_hr, 2) + " ton/hr)" },
  ],
  compute: computeScrewConveyor,
});
MECHANIC_RENDERERS["screw-conveyor"] = renderScrewConveyor;

// dims: in { target_ft3_hr: dimensionless, screw_diameter_in: L, shaft_diameter_in: L, pitch_in: L, loading_fraction: dimensionless } out: { rpm: dimensionless }
export function computeScrewConveyorRpm({ target_ft3_hr = 0, screw_diameter_in = 0, shaft_diameter_in = 0, pitch_in = 0, loading_fraction = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const target = Number(target_ft3_hr) || 0;
  const D = Number(screw_diameter_in) || 0;
  const d = Number(shaft_diameter_in) || 0;
  const pitch = Number(pitch_in) || 0;
  const load = Number(loading_fraction) || 0;
  if (!(target > 0)) return { error: "Target capacity must be positive (ft^3/hr)." };
  if (!(D > 0)) return { error: "Screw diameter must be positive (in)." };
  if (!(d >= 0 && d < D)) return { error: "Shaft diameter must be in [0, screw diameter)." };
  if (!(pitch > 0)) return { error: "Pitch must be positive (in)." };
  if (!(load > 0 && load <= 1)) return { error: "Loading fraction must be in (0, 1]." };
  const area_ft2 = (Math.PI / 4) * (((D / 12) ** 2) - ((d / 12) ** 2));
  const per_rpm = area_ft2 * (pitch / 12) * 60 * load; // ft^3/hr per RPM
  // Inverse of capacity_ft3_hr = area x (pitch/12) x (rpm x 60) x loading: rpm = target / per_rpm.
  const rpm = target / per_rpm;
  if (!Number.isFinite(rpm) || !(rpm > 0)) return { error: "RPM math is not a finite positive value." };
  const over_speed = rpm > 100;
  return {
    rpm, per_rpm, area_ft2, over_speed,
    note: "The screw speed a conveyor must turn to hit a target volumetric capacity, the inverse of the screw-conveyor tile: from capacity = flight_area x (pitch/12) x (rpm x 60) x loading, rpm = target / (flight_area x (pitch/12) x 60 x loading). To hit a mass rate instead, divide the mass rate by the bulk density to get the volumetric target first. Capacity is linear in speed, so doubling the RPM doubles the throughput - but CEMA caps the speed by screw diameter (large augers run slower), and running faster than the class limit accelerates wear and can flood the trough, so a flagged high RPM means step up a screw size instead. Per the CEMA Screw Conveyor standard (Book No. 350); the loading fraction is per the material class. An estimate; CEMA and the manufacturer govern."
  };
}
export const screwConveyorRpmExample = { inputs: { target_ft3_hr: 220.2, screw_diameter_in: 9, shaft_diameter_in: 2.5, pitch_in: 9, loading_fraction: 0.30 } };
MECHANIC_RENDERERS["screw-conveyor-rpm"] = _simpleRenderer({
  citation: "Citation: CEMA Screw Conveyor standard (Book No. 350) capacity method solved for speed: rpm = target / (flight_area x (pitch/12) x 60 x loading). Divide a mass rate by the bulk density for the volumetric target. CEMA caps speed by screw diameter. Estimate; CEMA and the manufacturer govern.",
  example: screwConveyorRpmExample.inputs,
  fields: [
    { key: "target_ft3_hr", label: "Target capacity (ft³/hr)", kind: "number" },
    { key: "screw_diameter_in", label: "Screw diameter (in)", kind: "number" },
    { key: "shaft_diameter_in", label: "Shaft / pipe diameter (in)", kind: "number" },
    { key: "pitch_in", label: "Pitch (in)", kind: "number" },
    { key: "loading_fraction", label: "Trough loading fraction (CEMA class)", kind: "number" },
  ],
  outputs: [
    { key: "rpm", id: "scr-out-rpm", label: "Required screw speed", value: (r) => fmt(r.rpm, 1) + " RPM" + (r.over_speed ? " (high - CEMA caps speed by diameter; step up a screw size)" : "") },
    { key: "n", id: "scr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScrewConveyorRpm,
});

// --- v770: Helical compression spring rate (`helical-spring-rate`) ---
// Rate k = G d^4 / (8 D^3 Na), G the wire shear modulus, d the wire diameter,
// D the mean coil diameter, Na the number of ACTIVE coils. Spring index D/d.
export const SPRING_MATERIALS = {
  // gamma_lb_in3 = wire weight density (spec-v1284, surge-frequency tile); E_psi = Young's modulus (spec-v1296,
  // torsion-spring tile, which loads the wire in bending). The compression-rate tile reads only G_psi.
  "music-wire": { label: "Music wire (ASTM A228)", G_psi: 11850000, gamma_lb_in3: 0.284, E_psi: 29500000 },
  "hard-drawn": { label: "Hard-drawn steel (ASTM A227)", G_psi: 11500000, gamma_lb_in3: 0.284, E_psi: 28800000 },
  "chrome-silicon": { label: "Chrome-silicon (ASTM A401)", G_psi: 11200000, gamma_lb_in3: 0.284, E_psi: 29500000 },
  "stainless-302": { label: "Stainless 302/304 (ASTM A313)", G_psi: 10000000, gamma_lb_in3: 0.286, E_psi: 28000000 },
  "phosphor-bronze": { label: "Phosphor bronze (ASTM B159)", G_psi: 6000000, gamma_lb_in3: 0.320, E_psi: 15000000 },
};

// dims: in { wire_diameter_in: L, mean_coil_diameter_in: L, active_coils: dimensionless, material: dimensionless } out: { spring_rate_lb_in: M T^-2, spring_index: dimensionless, shear_modulus_psi: M L^-1 T^-2 }
export function computeHelicalSpringRate({ wire_diameter_in = 0, mean_coil_diameter_in = 0, active_coils = 0, material = "music-wire" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(wire_diameter_in) || 0;
  const D = Number(mean_coil_diameter_in) || 0;
  const Na = Number(active_coils) || 0;
  const m = SPRING_MATERIALS[material];
  if (!m) return { error: "Unknown spring material." };
  if (!(d > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(D > d)) return { error: "Mean coil diameter must be greater than the wire diameter (in)." };
  if (!(Na > 0)) return { error: "Active coils must be positive." };
  const G = m.G_psi;
  const spring_rate_lb_in = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * Na);
  const spring_index = D / d;
  const index_flag = spring_index < 4
    ? "Spring index D/d < 4: hard to coil and high stress concentration."
    : spring_index > 12
      ? "Spring index D/d > 12: the spring tangles and buckles easily."
      : null;
  return {
    spring_rate_lb_in, spring_index, shear_modulus_psi: G, index_flag,
    note: "Helical compression (or extension) spring rate k = G d^4 / (8 D^3 Na), from the wire shear modulus G, wire diameter d, mean coil diameter D (measured to the wire centers, = OD - d), and the number of ACTIVE coils Na. Get Na from the total coils by the end condition: squared-and-ground Na = Nt - 2, plain Na = Nt. A good spring index D/d is 4-12. The rate is linear only away from solid height; add wire-stress and buckling checks for a full design. Machinery's Handbook / Shigley; the spring maker governs.",
  };
}
export const helicalSpringRateExample = { inputs: { wire_diameter_in: 0.080, mean_coil_diameter_in: 0.75, active_coils: 8, material: "hard-drawn" } };
MECHANIC_RENDERERS["helical-spring-rate"] = _simpleRenderer({
  citation: "Citation: helical compression spring rate k = G d^4 / (8 D^3 Na), the standard Machinery's Handbook / Shigley formula, with the wire shear modulus G by material (music wire 11.85e6, hard-drawn 11.5e6, chrome-silicon 11.2e6, stainless 302 10.0e6, phosphor bronze 6.0e6 psi). d = wire diameter, D = mean coil diameter (OD - d), Na = active coils. A good spring index D/d is 4-12. Rate only (not stress, solid height, or buckling); the spring maker governs.",
  example: helicalSpringRateExample.inputs,
  fields: [
    { key: "wire_diameter_in", label: "Wire diameter d (in)", kind: "number" },
    { key: "mean_coil_diameter_in", label: "Mean coil diameter D = OD - d (in)", kind: "number" },
    { key: "active_coils", label: "Active coils Na", kind: "number" },
    { key: "material", label: "Wire material", kind: "select", default: "music-wire", options: Object.keys(SPRING_MATERIALS).map((k) => ({ value: k, label: SPRING_MATERIALS[k].label })) },
  ],
  outputs: [
    { key: "k", id: "hsr-out-k", label: "Spring rate", value: (r) => fmt(r.spring_rate_lb_in, 2) + " lb/in (G " + fmt(r.shear_modulus_psi / 1e6, 2) + "e6 psi)" },
    { key: "c", id: "hsr-out-c", label: "Spring index D/d", value: (r) => fmt(r.spring_index, 2) + (r.index_flag ? " - " + r.index_flag : " (good, 4-12)") },
    { key: "n", id: "hsr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHelicalSpringRate,
});

// --- spec-v1284 K: helical spring natural (surge) frequency (`spring-natural-frequency`) ---
// The fifth standard spring check the family leaves out: rate (helical-spring-rate) and Wahl
// stress / solid height / buckling (spring-wire-stress) are built, but not the surge frequency.
// A spring cycled near its resonance surges - the coils bunch in a travelling wave, the force
// spikes, and the spring floats off the cam or fatigues. Shigley closed form for a spring held
// between flat parallel plates: fn = (1/2) sqrt(k g / W), with the same rate k = G d^4/(8 D^3 Na)
// as helical-spring-rate and the weight of the active coils W = pi^2 d^2 D Na gamma / 4
// (gamma = wire weight density). The rate cross-pins exactly to the helical-spring-rate tile.
// dims: in { wire_diameter_in: L, mean_coil_diameter_in: L, active_coils: dimensionless, material: dimensionless } out: { spring_rate_lb_in: M T^-2, active_weight_lb: M L T^-2, natural_frequency_hz: T^-1, natural_frequency_cpm: T^-1 }
export function computeSpringNaturalFrequency({ wire_diameter_in = 0, mean_coil_diameter_in = 0, active_coils = 0, material = "music-wire" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(wire_diameter_in) || 0;
  const D = Number(mean_coil_diameter_in) || 0;
  const Na = Number(active_coils) || 0;
  const m = SPRING_MATERIALS[material];
  if (!m) return { error: "Unknown spring material." };
  if (!(d > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(D > d)) return { error: "Mean coil diameter must be greater than the wire diameter (in)." };
  if (!(Na > 0)) return { error: "Active coils must be positive." };
  const G = m.G_psi;
  const gamma = m.gamma_lb_in3;
  const g = 386.4; // in/s^2
  const spring_rate_lb_in = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * Na);
  const active_weight_lb = (Math.PI * Math.PI * d * d * D * Na * gamma) / 4;
  const natural_frequency_hz = 0.5 * Math.sqrt((spring_rate_lb_in * g) / active_weight_lb);
  const natural_frequency_cpm = natural_frequency_hz * 60;
  const spring_index = D / d;
  return {
    spring_rate_lb_in, active_weight_lb, natural_frequency_hz, natural_frequency_cpm, spring_index,
    note: "Fundamental natural (surge) frequency of a helical compression spring held between flat parallel plates, fn = (1/2) sqrt(k g / W), with the rate k = G d^4/(8 D^3 Na) (identical to helical-spring-rate) and the weight of the ACTIVE coils W = pi^2 d^2 D Na gamma / 4, gamma the wire weight density (steel 0.284, stainless 0.286, phosphor bronze 0.320 lb/in^3) and g = 386.4 in/s^2. The higher surge modes are integer multiples 2 fn, 3 fn... A spring cycled near fn surges: the coils bunch into a travelling wave, the working force spikes, and the spring can float off the cam or fatigue. For a valve spring keep fn well above the valvetrain forcing harmonics - a common target is fn at least 13-20 times the highest significant cam-acceleration harmonic. Damping, variable-pitch/conical springs, preload, and the actual harmonic content are not modeled. A screen; Machinery's Handbook / Shigley and the spring maker govern.",
  };
}
export const springNaturalFrequencyExample = { inputs: { wire_diameter_in: 0.080, mean_coil_diameter_in: 0.75, active_coils: 8, material: "hard-drawn" } };
MECHANIC_RENDERERS["spring-natural-frequency"] = _simpleRenderer({
  citation: "Citation: helical spring fundamental surge frequency fn = (1/2) sqrt(k g / W) for a spring between flat parallel plates (Shigley, Mechanical Engineering Design; Machinery's Handbook), with the rate k = G d^4/(8 D^3 Na) and the active-coil weight W = pi^2 d^2 D Na gamma / 4, gamma the wire weight density by material and g = 386.4 in/s^2. The rate is identical to the helical-spring-rate tile. Higher modes are integer multiples. A screen; the spring maker governs.",
  example: springNaturalFrequencyExample.inputs,
  fields: [
    { key: "wire_diameter_in", label: "Wire diameter d (in)", kind: "number" },
    { key: "mean_coil_diameter_in", label: "Mean coil diameter D = OD - d (in)", kind: "number" },
    { key: "active_coils", label: "Active coils Na", kind: "number" },
    { key: "material", label: "Wire material", kind: "select", default: "music-wire", options: Object.keys(SPRING_MATERIALS).map((k) => ({ value: k, label: SPRING_MATERIALS[k].label })) },
  ],
  outputs: [
    { key: "fn", id: "snf-out-fn", label: "Surge frequency fn", value: (r) => fmt(r.natural_frequency_hz, 0) + " Hz (" + fmt(r.natural_frequency_cpm, 0) + " cycles/min)" },
    { key: "k", id: "snf-out-k", label: "Spring rate", value: (r) => fmt(r.spring_rate_lb_in, 2) + " lb/in (matches helical-spring-rate)" },
    { key: "w", id: "snf-out-w", label: "Active-coil weight W", value: (r) => fmt(r.active_weight_lb, 4) + " lb (spring index D/d = " + fmt(r.spring_index, 2) + ")" },
    { key: "n", id: "snf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSpringNaturalFrequency,
});

// dims: in { wire_diameter_in: L, mean_coil_diameter_in: L, force_lb: M L T^-2, total_coils: dimensionless, free_length_in: L, end_type: dimensionless } out: { spring_index: dimensionless, wahl_factor: dimensionless, tau_uncorrected_psi: M L^-1 T^-2, tau_psi: M L^-1 T^-2, solid_height_in: L, max_deflection_in: L, slenderness: dimensionless }
export function computeSpringWireStress({ wire_diameter_in = 0, mean_coil_diameter_in = 0, force_lb = 0, total_coils = 0, free_length_in = 0, end_type = "squared-ground" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(wire_diameter_in) || 0;
  const D = Number(mean_coil_diameter_in) || 0;
  const F = Number(force_lb) || 0;
  const Nt = Number(total_coils) || 0;
  const L0 = Number(free_length_in) || 0;
  if (!(d > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(D > d)) return { error: "Mean coil diameter must be greater than the wire diameter (in)." };
  if (!(F > 0)) return { error: "Spring force must be positive (lb)." };
  if (!(Nt > 0)) return { error: "Total coils must be positive." };
  if (!(L0 > 0)) return { error: "Free length must be positive (in)." };
  const GROUND = { "squared-ground": true, "plain-ground": true, "squared": false, "plain": false };
  if (!(end_type in GROUND)) return { error: "End type must be squared-ground, squared, plain-ground, or plain." };
  const spring_index = D / d;
  // Wahl correction: curvature plus direct (transverse) shear on the inner fiber.
  const wahl_factor = (4 * spring_index - 1) / (4 * spring_index - 4) + 0.615 / spring_index;
  // Torsion in the wire is T = F D/2; for round wire J/c = pi d^3/16, so the
  // uncorrected torsional stress is 8 F D / (pi d^3).
  const tau_uncorrected_psi = (8 * F * D) / (Math.PI * Math.pow(d, 3));
  const tau_psi = wahl_factor * tau_uncorrected_psi;
  // Ground ends close flat: Ls = Nt d. Unground ends leave a gap: Ls = (Nt + 1) d.
  const solid_height_in = GROUND[end_type] ? Nt * d : (Nt + 1) * d;
  const max_deflection_in = L0 - solid_height_in;
  const bottoms_out = max_deflection_in <= 0;
  const slenderness = L0 / D;
  // Absolute stability for squared-and-ground ends on parallel flat plates
  // requires L0 < 2.63 D / alpha with alpha = 0.5, i.e. slenderness < 5.26.
  const buckling_limit = 5.26;
  const buckling_risk = slenderness > buckling_limit;
  const index_flag = spring_index < 4
    ? "Spring index D/d < 4: hard to coil and a high stress concentration (Wahl factor climbs fast)."
    : spring_index > 12
      ? "Spring index D/d > 12: the spring tangles and buckles easily."
      : null;
  return {
    spring_index, wahl_factor, tau_uncorrected_psi, tau_psi, solid_height_in,
    max_deflection_in, bottoms_out, slenderness, buckling_limit, buckling_risk, index_flag,
    note: "The wire-stress, solid-height, and buckling checks the spring-rate tile leaves out. Torsion in the wire is T = F D/2, so the uncorrected torsional stress is 8 F D / (pi d^3); the Wahl factor Kw = (4C - 1)/(4C - 4) + 0.615/C with C = D/d corrects it for the wire curvature (the inner fiber runs hotter) plus direct transverse shear, and the corrected value is the one to compare against the allowable. A tight spring index runs the correction up fast: Kw is 1.40 at C = 4 but only 1.12 at C = 12, which is why 4-12 is the practical range. Solid height is Nt d for GROUND ends and (Nt + 1) d for unground, and free length minus solid height is the most the spring can ever travel. The buckling screen is the squared-and-ground-on-parallel-plates case, stable while the slenderness L0/D stays under 5.26; a pivoted or free end drops that limit sharply (to about 3.7 with one end pivoted, 2.63 with both), so a guided rod or bore may be needed. Allowable stress depends on the wire material, diameter, and whether the load is static or cyclic (use the maker's percent-of-tensile tables). Machinery's Handbook / Shigley; the spring maker governs.",
  };
}
export const springWireStressExample = { inputs: { wire_diameter_in: 0.080, mean_coil_diameter_in: 0.75, force_lb: 5, total_coils: 10, free_length_in: 2.0, end_type: "squared-ground" } };

MECHANIC_RENDERERS["spring-wire-stress"] = _simpleRenderer({
  citation: "Citation: helical compression spring wire shear stress tau = Kw x 8 F D / (pi d^3) with the Wahl correction factor Kw = (4C - 1)/(4C - 4) + 0.615/C, C = D/d, the standard Machinery's Handbook / Shigley formulation; solid height Nt d (ground ends) or (Nt + 1) d (unground) per the Shigley end-condition table; and the absolute-stability slenderness limit L0/D < 5.26 for squared-and-ground ends on parallel flat plates. Stress, travel, and buckling only - the allowable stress by material and duty, fatigue life, and set-removal are the spring maker's. The companion rate calculation is helical-spring-rate.",
  example: springWireStressExample.inputs,
  fields: [
    { key: "wire_diameter_in", label: "Wire diameter d (in)", kind: "number" },
    { key: "mean_coil_diameter_in", label: "Mean coil diameter D = OD - d (in)", kind: "number" },
    { key: "force_lb", label: "Spring force F (lb)", kind: "number" },
    { key: "total_coils", label: "Total coils Nt", kind: "number" },
    { key: "free_length_in", label: "Free length L0 (in)", kind: "number" },
    { key: "end_type", label: "End condition", kind: "select", options: [
      { value: "squared-ground", label: "Squared and ground (Ls = Nt d)" },
      { value: "squared", label: "Squared, not ground (Ls = (Nt+1) d)" },
      { value: "plain-ground", label: "Plain and ground (Ls = Nt d)" },
      { value: "plain", label: "Plain (Ls = (Nt+1) d)" },
    ], default: "squared-ground" },
  ],
  outputs: [
    { key: "c", id: "sws-out-c", label: "Spring index D/d", value: (r) => fmt(r.spring_index, 2) + (r.index_flag ? " - " + r.index_flag : " (good, 4-12)") },
    { key: "kw", id: "sws-out-kw", label: "Wahl correction factor Kw", value: (r) => fmt(r.wahl_factor, 3) },
    { key: "tu", id: "sws-out-tu", label: "Uncorrected torsional stress", value: (r) => fmt(r.tau_uncorrected_psi, 0) + " psi" },
    { key: "t", id: "sws-out-t", label: "Corrected wire shear stress", value: (r) => fmt(r.tau_psi, 0) + " psi" },
    { key: "sh", id: "sws-out-sh", label: "Solid height Ls", value: (r) => fmt(r.solid_height_in, 3) + " in" },
    { key: "md", id: "sws-out-md", label: "Max travel to solid", value: (r) => r.bottoms_out ? "NONE - free length is at or below solid height" : fmt(r.max_deflection_in, 3) + " in" },
    { key: "sl", id: "sws-out-sl", label: "Slenderness L0/D", value: (r) => fmt(r.slenderness, 2) + (r.buckling_risk ? " - OVER the 5.26 limit, check buckling (guide the spring)" : " (under the 5.26 squared-and-ground limit)") },
    { key: "n", id: "sws-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSpringWireStress,
});

// --- spec-v1015 K: gear tooth bending stress, Lewis (`gear-tooth-bending-stress`) ---
// Lewis beam strength treats a spur-gear tooth as a cantilever loaded by the
// tangential (transmitted) load Wt at the pitch line. The bending stress at the
// weakest root section is sigma = Wt / (F pc y), where F is the face width,
// pc = pi/Pd is the circular pitch, and y is the Lewis form factor. For the
// standard involute systems y is a closed form of the tooth count T (Wilfred
// Lewis, 1892): 20 deg full depth y = 0.154 - 0.912/T; 14.5 deg full depth
// y = 0.124 - 0.684/T; 20 deg stub y = 0.175 - 0.841/T. The diametral-pitch
// form factor Y = pi y (Shigley) gives the identical stress as Wt Pd/(F Y).
// This is the STATIC Lewis stress; the Barth velocity factor and the AGMA
// geometry (J) and load factors are not modeled. The spur-gear-geometry tile
// names this omission: "the geometry only; does not check tooth strength".
export const GEAR_TOOTH_SYSTEMS = {
  "20-full-depth": { a: 0.154, b: 0.912, label: "20 deg full depth" },
  "14.5-full-depth": { a: 0.124, b: 0.684, label: "14.5 deg full depth" },
  "20-stub": { a: 0.175, b: 0.841, label: "20 deg stub" },
};
// dims: in { transmitted_load_lb: M L T^-2, diametral_pitch_1_in: L^-1, face_width_in: L, number_of_teeth: dimensionless, tooth_system: dimensionless } out: { bending_stress_psi: M L^-1 T^-2, circular_pitch_in: L, lewis_form_factor_y: dimensionless, lewis_Y_diametral: dimensionless }
export function computeGearToothBendingStress({ transmitted_load_lb = 0, diametral_pitch_1_in = 0, face_width_in = 0, number_of_teeth = 0, tooth_system = "20-full-depth" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Wt = Number(transmitted_load_lb) || 0;
  const Pd = Number(diametral_pitch_1_in) || 0;
  const F = Number(face_width_in) || 0;
  const T = Number(number_of_teeth) || 0;
  const sys = GEAR_TOOTH_SYSTEMS[tooth_system];
  if (!sys) return { error: "Tooth system must be 20-full-depth, 14.5-full-depth, or 20-stub." };
  if (!(Wt > 0)) return { error: "Transmitted (tangential) load must be positive (lb)." };
  if (!(Pd > 0)) return { error: "Diametral pitch must be positive (teeth per inch)." };
  if (!(F > 0)) return { error: "Face width must be positive (in)." };
  if (!(T >= 6)) return { error: "Number of teeth must be at least 6 for the Lewis form factor." };
  const y = sys.a - sys.b / T;
  if (!(y > 0)) return { error: "Too few teeth for this tooth system: the Lewis form factor is non-physical." };
  const pc = Math.PI / Pd;
  const bending_stress_psi = Wt / (F * pc * y);
  const lewis_Y_diametral = Math.PI * y;
  const undercut_teeth = tooth_system === "14.5-full-depth" ? 32 : 17;
  const undercut_flag = T < undercut_teeth
    ? "Fewer than " + undercut_teeth + " teeth may undercut at the root; the Lewis factor assumes a full tooth."
    : null;
  return {
    bending_stress_psi, circular_pitch_in: pc, lewis_form_factor_y: y, lewis_Y_diametral, undercut_flag,
    note: "Lewis beam strength treats the tooth as a cantilever loaded by the tangential load Wt at the pitch line: sigma = Wt / (F pc y), with face width F, circular pitch pc = pi/Pd, and the Lewis form factor y = a - b/T for the tooth system (20 full-depth a,b = 0.154, 0.912; 14.5 full-depth 0.124, 0.684; 20 stub 0.175, 0.841). The diametral-pitch form Y = pi y gives the same stress as sigma = Wt Pd / (F Y). This is the STATIC Lewis stress: it does not apply the velocity (Barth) dynamic factor or the AGMA geometry (J) and load-distribution factors, so it runs optimistic at speed. Compare against the material endurance limit with the maker's factors; AGMA 2001 and the gear maker govern.",
  };
}
export const gearToothBendingStressExample = { inputs: { transmitted_load_lb: 500, diametral_pitch_1_in: 8, face_width_in: 1.5, number_of_teeth: 20, tooth_system: "20-full-depth" } };

MECHANIC_RENDERERS["gear-tooth-bending-stress"] = _simpleRenderer({
  citation: "Citation: Lewis beam-strength equation (Wilfred Lewis, 1892; public domain): sigma = Wt / (F pc y) with face width F, circular pitch pc = pi/Pd, and the Lewis form factor y = a - b/T (20 deg full depth a,b = 0.154, 0.912; 14.5 deg full depth 0.124, 0.684; 20 deg stub 0.175, 0.841). The diametral-pitch form is sigma = Wt Pd / (F Y) with Y = pi y. Static Lewis stress only - the Barth velocity factor and the AGMA 2001 geometry (J) and load factors are not modeled. The gear maker and AGMA govern.",
  example: gearToothBendingStressExample.inputs,
  fields: [
    { key: "transmitted_load_lb", label: "Transmitted (tangential) load Wt (lb)", kind: "number" },
    { key: "diametral_pitch_1_in", label: "Diametral pitch Pd (teeth per in)", kind: "number" },
    { key: "face_width_in", label: "Face width F (in)", kind: "number" },
    { key: "number_of_teeth", label: "Number of teeth T", kind: "number" },
    { key: "tooth_system", label: "Tooth system", kind: "select", options: [
      { value: "20-full-depth", label: "20 deg full depth" },
      { value: "14.5-full-depth", label: "14.5 deg full depth" },
      { value: "20-stub", label: "20 deg stub" },
    ], default: "20-full-depth" },
  ],
  outputs: [
    { key: "s", id: "gtb-out-s", label: "Tooth bending stress", value: (r) => fmt(r.bending_stress_psi, 0) + " psi" },
    { key: "y", id: "gtb-out-y", label: "Lewis form factor", value: (r) => "y = " + fmt(r.lewis_form_factor_y, 4) + " (circular pitch); Y = pi y = " + fmt(r.lewis_Y_diametral, 3) + " (diametral pitch)" },
    { key: "pc", id: "gtb-out-pc", label: "Circular pitch pc", value: (r) => fmt(r.circular_pitch_in, 4) + " in" },
    { key: "u", id: "gtb-out-u", label: "Undercut check", value: (r) => r.undercut_flag ? r.undercut_flag : "OK (enough teeth to avoid root undercut)" },
    { key: "n", id: "gtb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGearToothBendingStress,
});

// --- spec-v1282 K: gear tooth contact stress / surface durability (`gear-contact-stress`) ---
// The pitting failure mode gear-tooth-bending-stress and gear-dynamic-tooth-stress
// leave out. Both compute BENDING (root breakage); the Barth tile's own note ends
// "pitting often governs before bending does." Surface durability is the Hertzian
// contact stress at the pitch point (Buckingham; Shigley): sigma_c = Cp sqrt(Wt/(F dp I)),
// with elastic coefficient Cp (~2300 sqrt(psi) steel/steel), pinion pitch diameter
// dp = Np/Pd, face width F, and the AGMA geometry factor for pitting resistance of an
// external spur mesh, I = (cos phi sin phi / 2) mG/(mG+1), mG = Ng/Np the gear ratio.
// Static value only: the AGMA 2001 Ko/Kv/Ks/Km/Cf factors are all 1. Contact stress runs
// far above the Lewis bending stress on the same tooth, so pitting frequently governs.
// dims: in { transmitted_load_lb: M L T^-2, diametral_pitch_1_in: L^-1, pinion_teeth: dimensionless, gear_teeth: dimensionless, face_width_in: L, pressure_angle_deg: dimensionless, elastic_coefficient_cp: dimensionless } out: { contact_stress_psi: M L^-1 T^-2, geometry_factor_I: dimensionless, pinion_pitch_diameter_in: L, gear_ratio_mG: dimensionless }
export function computeGearContactStress({ transmitted_load_lb = 0, diametral_pitch_1_in = 0, pinion_teeth = 0, gear_teeth = 0, face_width_in = 0, pressure_angle_deg = 20, elastic_coefficient_cp = 2300 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Wt = Number(transmitted_load_lb) || 0;
  const Pd = Number(diametral_pitch_1_in) || 0;
  const Np = Number(pinion_teeth) || 0;
  const Ng = Number(gear_teeth) || 0;
  const F = Number(face_width_in) || 0;
  const phi = Number(pressure_angle_deg) || 0;
  const Cp = Number(elastic_coefficient_cp) || 0;
  if (!(Wt > 0)) return { error: "Transmitted (tangential) load must be positive (lb)." };
  if (!(Pd > 0)) return { error: "Diametral pitch must be positive (teeth per inch)." };
  if (!(Np >= 6)) return { error: "Pinion teeth must be at least 6." };
  if (!(Ng >= Np)) return { error: "Gear teeth must be at least the pinion teeth (mG >= 1)." };
  if (!(F > 0)) return { error: "Face width must be positive (in)." };
  if (!(phi > 0 && phi < 45)) return { error: "Pressure angle must be between 0 and 45 deg." };
  if (!(Cp > 0)) return { error: "Elastic coefficient Cp must be positive (sqrt-psi)." };
  const dp = Np / Pd;
  const mG = Ng / Np;
  const phi_rad = (phi * Math.PI) / 180;
  const geometry_factor_I = (Math.cos(phi_rad) * Math.sin(phi_rad) / 2) * (mG / (mG + 1));
  const contact_stress_psi = Cp * Math.sqrt(Wt / (F * dp * geometry_factor_I));
  return {
    contact_stress_psi, geometry_factor_I, pinion_pitch_diameter_in: dp, gear_ratio_mG: mG,
    note: "Hertzian gear contact stress (surface durability / pitting): sigma_c = Cp sqrt(Wt / (F dp I)), with elastic coefficient Cp (about 2300 sqrt-psi for steel on steel), pinion pitch diameter dp = Np/Pd, face width F, and the AGMA geometry factor I = (cos phi sin phi / 2) mG/(mG+1) for an external spur mesh, mG = Ng/Np. This is the STATIC contact stress: the AGMA 2001 application (Ko), dynamic (Kv), size (Ks), load-distribution (Km), and surface-condition (Cf) factors are all 1. Contact stress runs far above the Lewis bending stress on the same tooth, so surface pitting often governs the durability limit before root breakage does. Compare against the allowable contact stress for the material, hardness, life, and reliability; AGMA 2001 and the gear maker govern.",
  };
}
export const gearContactStressExample = { inputs: { transmitted_load_lb: 500, diametral_pitch_1_in: 8, pinion_teeth: 20, gear_teeth: 60, face_width_in: 1.5, pressure_angle_deg: 20, elastic_coefficient_cp: 2300 } };

MECHANIC_RENDERERS["gear-contact-stress"] = _simpleRenderer({
  citation: "Citation: Hertzian gear contact stress for surface durability (J. O. Buckingham; Shigley, Mechanical Engineering Design; AGMA surface-durability geometry): sigma_c = Cp sqrt(Wt / (F dp I)), with elastic coefficient Cp = sqrt(1/(pi ((1-v1^2)/E1 + (1-v2^2)/E2))) (about 2300 sqrt-psi steel on steel), pinion pitch diameter dp = Np/Pd, and geometry factor I = (cos phi sin phi / 2) mG/(mG+1) for an external spur mesh, mG = Ng/Np. Static value only - the AGMA 2001 Ko/Kv/Ks/Km/Cf factors are 1, and the allowable contact stress is the material's. The gear maker and AGMA govern.",
  example: gearContactStressExample.inputs,
  fields: [
    { key: "transmitted_load_lb", label: "Transmitted (tangential) load Wt (lb)", kind: "number" },
    { key: "diametral_pitch_1_in", label: "Diametral pitch Pd (teeth per in)", kind: "number" },
    { key: "pinion_teeth", label: "Pinion teeth Np", kind: "number" },
    { key: "gear_teeth", label: "Gear teeth Ng", kind: "number" },
    { key: "face_width_in", label: "Face width F (in)", kind: "number" },
    { key: "pressure_angle_deg", label: "Pressure angle phi (deg)", kind: "number", attrs: { step: "any", value: "20" } },
    { key: "elastic_coefficient_cp", label: "Elastic coefficient Cp (sqrt-psi)", kind: "number", attrs: { step: "any", value: "2300" } },
  ],
  outputs: [
    { key: "s", id: "gcs-out-s", label: "Contact stress", value: (r) => fmt(r.contact_stress_psi, 0) + " psi" },
    { key: "i", id: "gcs-out-i", label: "Geometry factor I", value: (r) => "I = " + fmt(r.geometry_factor_I, 4) + " (external spur, pitting resistance)" },
    { key: "dp", id: "gcs-out-dp", label: "Pinion pitch diameter dp", value: (r) => fmt(r.pinion_pitch_diameter_in, 3) + " in (gear ratio mG = " + fmt(r.gear_ratio_mG, 3) + ")" },
    { key: "n", id: "gcs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGearContactStress,
});

// --- spec-v1291 K: aerodynamic drag force and power (`aerodynamic-drag-force`) ---
// The bluff-body drag the Stokes settling tile (creeping flow) leaves out: F = 1/2 rho V^2 Cd A,
// the reason a vehicle needs so much more power at highway speed (drag power grows with the cube
// of speed). rho is the mass density (weight density / g); V in ft/s. Power P = F V to hp/kW.
// dims: in { speed_mph: L T^-1, frontal_area_ft2: L^2, drag_coefficient: dimensionless, air_density_lb_ft3: M L^-3 } out: { drag_force_lbf: M L T^-2, drag_power_hp: M L^2 T^-3, drag_power_kw: M L^2 T^-3, dynamic_pressure_psf: M L^-1 T^-2 }
export function computeAerodynamicDragForce({ speed_mph = 0, frontal_area_ft2 = 0, drag_coefficient = 0, air_density_lb_ft3 = 0.0765 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Vmph = Number(speed_mph) || 0;
  const A = Number(frontal_area_ft2) || 0;
  const Cd = Number(drag_coefficient) || 0;
  const rhoW = Number(air_density_lb_ft3) || 0;
  if (!(Vmph > 0)) return { error: "Speed must be positive (mph)." };
  if (!(A > 0)) return { error: "Frontal area must be positive (ft^2)." };
  if (!(Cd > 0)) return { error: "Drag coefficient must be positive." };
  if (!(rhoW > 0)) return { error: "Air density must be positive (lb/ft^3)." };
  const g = 32.174; // ft/s^2
  const V = Vmph * 1.46667; // ft/s
  const rhoMass = rhoW / g; // slug/ft^3
  const dynamic_pressure_psf = 0.5 * rhoMass * V * V;
  const drag_force_lbf = dynamic_pressure_psf * Cd * A;
  const drag_power_ftlb_s = drag_force_lbf * V;
  const drag_power_hp = drag_power_ftlb_s / 550;
  const drag_power_kw = drag_power_hp * 0.745699872;
  if (![drag_force_lbf, drag_power_hp, drag_power_kw, dynamic_pressure_psf].every(Number.isFinite) || !(drag_force_lbf > 0)) return { error: "Drag math is not a finite value; check the inputs." };
  return {
    drag_force_lbf, drag_power_hp, drag_power_kw, dynamic_pressure_psf, speed_fps: V,
    note: "Aerodynamic drag force F = 1/2 rho V^2 Cd A for a bluff body in steady air, with the mass density rho = (weight density)/g (g = 32.174 ft/s^2), V the speed, Cd the drag coefficient, and A the frontal area; the power to overcome it is P = F V. Cd is the shape factor (a modern car ~0.30, a pickup ~0.45, a semi tractor-trailer ~0.6-0.8, a motorcycle and rider ~0.6, a flat plate ~1.28, a sphere ~0.47, a streamlined body ~0.04). Because power grows with the CUBE of speed, the aero power at 80 mph is about 1.5x that at 70 - the reason high-speed cruising is so thirsty. This is the aero drag only; rolling resistance, driveline loss, grade, headwind, lift, and compressibility are separate parts of the road load. The drag coefficient and frontal area are the user's (from the vehicle or a wind-tunnel value). A planning estimate; the manufacturer's road-load data governs.",
  };
}
export const aerodynamicDragForceExample = { inputs: { speed_mph: 70, frontal_area_ft2: 24, drag_coefficient: 0.30, air_density_lb_ft3: 0.0765 } };

MECHANIC_RENDERERS["aerodynamic-drag-force"] = _simpleRenderer({
  citation: "Citation: aerodynamic drag F = 1/2 rho V^2 Cd A (standard fluid mechanics; SAE road-load), with the mass density rho = (weight density)/g, and the drag power P = F V. Cd and frontal area are the user's (car ~0.30, pickup ~0.45, semi ~0.6-0.8). Aero drag only; rolling resistance and driveline loss are separate. A planning estimate; the manufacturer's road-load data governs.",
  example: aerodynamicDragForceExample.inputs,
  fields: [
    { key: "speed_mph", label: "Speed V (mph)", kind: "number" },
    { key: "frontal_area_ft2", label: "Frontal area A (ft²)", kind: "number" },
    { key: "drag_coefficient", label: "Drag coefficient Cd", kind: "number" },
    { key: "air_density_lb_ft3", label: "Air density (lb/ft³)", kind: "number", attrs: { step: "any", value: "0.0765" } },
  ],
  outputs: [
    { key: "f", id: "adf-out-f", label: "Drag force", value: (r) => fmt(r.drag_force_lbf, 1) + " lbf" },
    { key: "p", id: "adf-out-p", label: "Power to overcome drag", value: (r) => fmt(r.drag_power_hp, 2) + " hp (" + fmt(r.drag_power_kw, 2) + " kW)" },
    { key: "q", id: "adf-out-q", label: "Dynamic pressure", value: (r) => fmt(r.dynamic_pressure_psf, 2) + " lb/ft^2 (at " + fmt(r.speed_fps, 1) + " ft/s)" },
    { key: "n", id: "adf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAerodynamicDragForce,
});

// --- spec-v1292 K: vehicle road-load force and power (`vehicle-road-load-power`) ---
// aerodynamic-drag-force computes only the aero term and names "rolling resistance, driveline
// loss, grade... are separate parts of the road load." This is the full road load: aero + rolling
// + grade, and the tractive power to hold a steady speed. The aero term DELEGATES to
// computeAerodynamicDragForce so the two never drift.
// dims: in { speed_mph: L T^-1, vehicle_weight_lb: M L T^-2, frontal_area_ft2: L^2, drag_coefficient: dimensionless, rolling_coefficient: dimensionless, grade_pct: dimensionless, air_density_lb_ft3: M L^-3 } out: { total_force_lbf: M L T^-2, road_load_power_hp: M L^2 T^-3, road_load_power_kw: M L^2 T^-3, aero_force_lbf: M L T^-2, rolling_force_lbf: M L T^-2, grade_force_lbf: M L T^-2 }
export function computeVehicleRoadLoadPower({ speed_mph = 0, vehicle_weight_lb = 0, frontal_area_ft2 = 0, drag_coefficient = 0, rolling_coefficient = 0.012, grade_pct = 0, air_density_lb_ft3 = 0.0765 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Vmph = Number(speed_mph) || 0;
  const W = Number(vehicle_weight_lb) || 0;
  const Crr = Number(rolling_coefficient) || 0;
  const grade = Number(grade_pct) || 0;
  if (!(Vmph > 0)) return { error: "Speed must be positive (mph)." };
  if (!(W > 0)) return { error: "Vehicle weight must be positive (lb)." };
  if (Crr < 0) return { error: "Rolling-resistance coefficient cannot be negative." };
  // Delegate the aero term to the aerodynamic-drag-force tile so the two cannot drift.
  const aero = computeAerodynamicDragForce({ speed_mph: Vmph, frontal_area_ft2, drag_coefficient, air_density_lb_ft3 });
  if (aero.error) return { error: aero.error };
  const V = Vmph * 1.46667; // ft/s
  const aero_force_lbf = aero.drag_force_lbf;
  const rolling_force_lbf = Crr * W;
  const grade_force_lbf = W * Math.sin(Math.atan(grade / 100));
  const total_force_lbf = aero_force_lbf + rolling_force_lbf + grade_force_lbf;
  const road_load_power_hp = (total_force_lbf * V) / 550;
  const road_load_power_kw = road_load_power_hp * 0.745699872;
  if (![total_force_lbf, road_load_power_hp, road_load_power_kw].every(Number.isFinite)) return { error: "Road-load math is not a finite value; check the inputs." };
  return {
    total_force_lbf, road_load_power_hp, road_load_power_kw, aero_force_lbf, rolling_force_lbf, grade_force_lbf, speed_fps: V,
    note: "Steady-speed vehicle road load: the tractive force is aero drag F_aero = 1/2 rho V^2 Cd A (delegated to the aerodynamic-drag-force tile) plus rolling resistance F_roll = Crr W plus the grade load F_grade = W sin(atan(grade%/100)), and the power to hold the speed is P = F_total V. Rolling resistance is nearly constant with speed (Crr ~ 0.010-0.015 on pavement); aero grows with the square of speed and its power with the cube; grade adds a fixed pull of the weight times the slope. The three-way breakdown shows which dominates - at highway speed on the level the wind leads, but even a modest grade quickly takes over. This is the power AT THE WHEELS; divide by the driveline efficiency for engine/motor power, and add the mass x acceleration term for launch. Headwind and air-density change with altitude/temperature are separate. A planning estimate; the manufacturer's coastdown road-load data governs.",
  };
}
export const vehicleRoadLoadPowerExample = { inputs: { speed_mph: 70, vehicle_weight_lb: 3500, frontal_area_ft2: 24, drag_coefficient: 0.30, rolling_coefficient: 0.012, grade_pct: 0, air_density_lb_ft3: 0.0765 } };

MECHANIC_RENDERERS["vehicle-road-load-power"] = _simpleRenderer({
  citation: "Citation: vehicle road-load force and power (SAE J2263 / J1263 road-load): F_total = 1/2 rho V^2 Cd A + Crr W + W sin(atan(grade%/100)), P = F_total V. The aero term is the aerodynamic-drag-force tile. Power at the wheels; divide by driveline efficiency for engine power. A planning estimate; the manufacturer's coastdown data governs.",
  example: vehicleRoadLoadPowerExample.inputs,
  fields: [
    { key: "speed_mph", label: "Speed V (mph)", kind: "number" },
    { key: "vehicle_weight_lb", label: "Vehicle weight W (lb)", kind: "number" },
    { key: "frontal_area_ft2", label: "Frontal area A (ft²)", kind: "number" },
    { key: "drag_coefficient", label: "Drag coefficient Cd", kind: "number" },
    { key: "rolling_coefficient", label: "Rolling-resistance coefficient Crr", kind: "number", attrs: { step: "any", value: "0.012" } },
    { key: "grade_pct", label: "Grade (%)", kind: "number", attrs: { step: "any", value: "0" } },
    { key: "air_density_lb_ft3", label: "Air density (lb/ft³)", kind: "number", attrs: { step: "any", value: "0.0765" } },
  ],
  outputs: [
    { key: "p", id: "vrl-out-p", label: "Road-load power (at the wheels)", value: (r) => fmt(r.road_load_power_hp, 2) + " hp (" + fmt(r.road_load_power_kw, 2) + " kW)" },
    { key: "f", id: "vrl-out-f", label: "Total tractive force", value: (r) => fmt(r.total_force_lbf, 1) + " lbf" },
    { key: "b", id: "vrl-out-b", label: "Force breakdown", value: (r) => "aero " + fmt(r.aero_force_lbf, 1) + " + rolling " + fmt(r.rolling_force_lbf, 1) + " + grade " + fmt(r.grade_force_lbf, 1) + " lbf" },
    { key: "n", id: "vrl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVehicleRoadLoadPower,
});

// --- spec-v1293 K: planetary (epicyclic) gear ratio (`planetary-gear-ratio`) ---
// gear-cascade handles a fixed-axis train (stage ratios multiply); a planetary set (sun, planets,
// ring, carrier) does not, because two members move and the ratio depends on which is held. Willis
// (superposition) ratios for the six standard single-stage configurations, R0 = Nr/Ns.
const PLANETARY_CONFIGS = {
  "ring-fixed-sun-carrier": { label: "Ring fixed, sun in -> carrier out (reduction)", ratio: (R0) => 1 + R0 },
  "sun-fixed-ring-carrier": { label: "Sun fixed, ring in -> carrier out (reduction)", ratio: (R0) => (R0 + 1) / R0 },
  "ring-fixed-carrier-sun": { label: "Ring fixed, carrier in -> sun out (overdrive)", ratio: (R0) => 1 / (1 + R0) },
  "sun-fixed-carrier-ring": { label: "Sun fixed, carrier in -> ring out (overdrive)", ratio: (R0) => R0 / (1 + R0) },
  "carrier-fixed-sun-ring": { label: "Carrier fixed, sun in -> ring out (reversal)", ratio: (R0) => -R0 },
  "carrier-fixed-ring-sun": { label: "Carrier fixed, ring in -> sun out (reversal)", ratio: (R0) => -1 / R0 },
};
// dims: in { sun_teeth: dimensionless, ring_teeth: dimensionless, input_speed_rpm: T^-1, configuration: dimensionless } out: { gear_ratio: dimensionless, output_speed_rpm: T^-1, planet_teeth: dimensionless }
export function computePlanetaryGearRatio({ sun_teeth = 0, ring_teeth = 0, input_speed_rpm = 0, configuration = "ring-fixed-sun-carrier" } = {}) {
  const _g = _finiteGuard({ sun_teeth, ring_teeth, input_speed_rpm }); if (_g) return _g;
  const Ns = Number(sun_teeth) || 0;
  const Nr = Number(ring_teeth) || 0;
  const nin = Number(input_speed_rpm) || 0;
  const cfg = PLANETARY_CONFIGS[configuration];
  if (!(Ns > 0)) return { error: "Sun teeth must be positive." };
  if (!(Nr > 0)) return { error: "Ring teeth must be positive." };
  if (!(Nr > Ns)) return { error: "Ring teeth must be greater than the sun teeth (Nr > Ns)." };
  if (!(nin > 0)) return { error: "Input speed must be positive (rpm)." };
  if (!cfg) return { error: "Unknown configuration." };
  const R0 = Nr / Ns;
  const gear_ratio = cfg.ratio(R0);
  const output_speed_rpm = nin / gear_ratio;
  const planet_teeth = (Nr - Ns) / 2;
  const planet_integer = Number.isInteger(planet_teeth);
  if (![gear_ratio, output_speed_rpm].every(Number.isFinite) || gear_ratio === 0) return { error: "Planetary math is not a finite value; check the inputs." };
  const planet_flag = planet_integer ? null : "Ring minus sun is odd, so the planet teeth Np = (Nr - Ns)/2 is not an integer; a standard concentric set needs Nr - Ns even.";
  return {
    gear_ratio, output_speed_rpm, planet_teeth, basic_ratio_R0: R0, reversed: gear_ratio < 0, planet_flag,
    note: "Single-stage planetary (epicyclic) gear ratio by the Willis superposition method, with the sun teeth Ns, ring teeth Nr, basic ratio R0 = Nr/Ns, and the planet teeth Np = (Nr - Ns)/2 from the concentric constraint Nr = Ns + 2 Np. The ratio (input speed / output speed) depends on which member is HELD: ring fixed with the sun driving the carrier gives 1 + R0 (reduction, same direction); a carrier-fixed set reverses (ratio -R0 with the sun driving the ring); driving the carrier gives an overdrive (ratio below 1). A negative ratio means the output turns opposite the input. Same gears, different held member, completely different drive - the thing a fixed-axis cascade (gear-cascade) cannot capture. Compound and multi-stage planetaries, torque split among the planets, efficiency, and the equal-spacing assembly constraint on the planet count are separate; tooth strength is the gear-stress tiles. A design aid; Machinery's Handbook / Shigley and the gear maker govern.",
  };
}
export const planetaryGearRatioExample = { inputs: { sun_teeth: 30, ring_teeth: 72, input_speed_rpm: 3400, configuration: "ring-fixed-sun-carrier" } };

MECHANIC_RENDERERS["planetary-gear-ratio"] = _simpleRenderer({
  citation: "Citation: epicyclic (planetary) gear-train ratio by the Willis superposition method (Machinery's Handbook; Shigley, Mechanical Engineering Design), with R0 = Nr/Ns and the six standard held-member configurations; planet teeth Np = (Nr - Ns)/2 from Nr = Ns + 2 Np. A negative ratio reverses the output. A design aid; the gear maker governs.",
  example: planetaryGearRatioExample.inputs,
  fields: [
    { key: "sun_teeth", label: "Sun teeth Ns", kind: "number" },
    { key: "ring_teeth", label: "Ring teeth Nr", kind: "number" },
    { key: "input_speed_rpm", label: "Input speed (rpm)", kind: "number" },
    { key: "configuration", label: "Configuration (held member, in -> out)", kind: "select", default: "ring-fixed-sun-carrier", options: Object.keys(PLANETARY_CONFIGS).map((k) => ({ value: k, label: PLANETARY_CONFIGS[k].label })) },
  ],
  outputs: [
    { key: "r", id: "pgr-out-r", label: "Overall gear ratio", value: (r) => fmt(r.gear_ratio, 4) + ":1" + (r.reversed ? " (output reversed)" : "") },
    { key: "o", id: "pgr-out-o", label: "Output speed", value: (r) => fmt(r.output_speed_rpm, 1) + " rpm" + (r.reversed ? " (opposite direction)" : " (same direction)") },
    { key: "p", id: "pgr-out-p", label: "Planet teeth Np", value: (r) => (r.planet_flag ? r.planet_flag : fmt(r.planet_teeth, 0) + " (Nr = Ns + 2 Np; R0 = " + fmt(r.basic_ratio_R0, 3) + ")") },
    { key: "n", id: "pgr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlanetaryGearRatio,
});

// --- spec-v1294 K: band brake / capstan torque (`band-brake-torque`) ---
// disk-clutch-torque names "band brakes are separate." The Eytelwein/capstan relation
// T1 = T2 e^(mu theta) is the physics behind a band brake, a rope around a bollard, and a capstan.
// Braking torque T = (T1 - T2) r. The tension ratio climbs fast with wrap angle.
// dims: in { slack_tension_lbf: M L T^-2, wrap_angle_deg: dimensionless, friction_coefficient: dimensionless, drum_radius_in: L } out: { tight_tension_lbf: M L T^-2, tension_ratio: dimensionless, brake_torque_in_lbf: M L^2 T^-2, brake_torque_ft_lbf: M L^2 T^-2 }
export function computeBandBrakeTorque({ slack_tension_lbf = 0, wrap_angle_deg = 0, friction_coefficient = 0, drum_radius_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T2 = Number(slack_tension_lbf) || 0;
  const wrap = Number(wrap_angle_deg) || 0;
  const mu = Number(friction_coefficient) || 0;
  const r = Number(drum_radius_in) || 0;
  if (!(T2 > 0)) return { error: "Slack-side (actuating) tension must be positive (lbf)." };
  if (!(wrap > 0)) return { error: "Wrap angle must be positive (deg)." };
  if (mu < 0) return { error: "Friction coefficient cannot be negative." };
  if (!(r > 0)) return { error: "Drum radius must be positive (in)." };
  const theta = (wrap * Math.PI) / 180;
  const tension_ratio = Math.exp(mu * theta);
  const tight_tension_lbf = T2 * tension_ratio;
  const brake_torque_in_lbf = (tight_tension_lbf - T2) * r;
  const brake_torque_ft_lbf = brake_torque_in_lbf / 12;
  if (![tension_ratio, tight_tension_lbf, brake_torque_in_lbf].every(Number.isFinite) || !(brake_torque_in_lbf >= 0)) return { error: "Band-brake math is not a finite value; check the inputs." };
  return {
    tight_tension_lbf, tension_ratio, brake_torque_in_lbf, brake_torque_ft_lbf, wrap_angle_deg: wrap,
    note: "Band brake / capstan torque from the Eytelwein (belt-friction) relation T1 = T2 e^(mu theta): the tight-side tension T1 grows exponentially from the applied slack-side tension T2 with the friction mu and the wrap angle theta (radians), and the braking torque on the drum is T = (T1 - T2) r. The ratio e^(mu theta) climbs fast with wrap - a 270-degree wrap at mu 0.3 multiplies the pull by 4.1, a full turn by 6.6 - which is why a couple of turns of rope on a bollard hold a boat and a light lever pull stops a heavy drum. A band brake whose anchored end is the tight side is self-energizing (rotation tightens it). The lever geometry that sets the actuating force, the self-energizing sign, the band stress and width, and the heat of braking are separate; the friction coefficient is the user's (band lining on the drum). A design aid; Shigley and the brake maker govern.",
  };
}
export const bandBrakeTorqueExample = { inputs: { slack_tension_lbf: 50, wrap_angle_deg: 270, friction_coefficient: 0.3, drum_radius_in: 6 } };

MECHANIC_RENDERERS["band-brake-torque"] = _simpleRenderer({
  citation: "Citation: band brake / capstan torque from the Eytelwein belt-friction relation T1 = T2 e^(mu theta) (Shigley, Mechanical Engineering Design, Ch. 16; capstan equation), with the braking torque T = (T1 - T2) r. The friction coefficient and lever geometry are the user's. A design aid; the brake maker governs.",
  example: bandBrakeTorqueExample.inputs,
  fields: [
    { key: "slack_tension_lbf", label: "Slack-side (actuating) tension T2 (lbf)", kind: "number" },
    { key: "wrap_angle_deg", label: "Wrap angle (deg)", kind: "number" },
    { key: "friction_coefficient", label: "Band-to-drum friction coefficient", kind: "number" },
    { key: "drum_radius_in", label: "Drum radius (in)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "bbt-out-t", label: "Braking torque", value: (r) => fmt(r.brake_torque_in_lbf, 0) + " in-lbf (" + fmt(r.brake_torque_ft_lbf, 1) + " ft-lbf)" },
    { key: "t1", id: "bbt-out-t1", label: "Tight-side tension T1", value: (r) => fmt(r.tight_tension_lbf, 1) + " lbf (ratio e^(mu*theta) = " + fmt(r.tension_ratio, 3) + ")" },
    { key: "n", id: "bbt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBandBrakeTorque,
});

// --- spec-v1295 K: centrifugal force of a rotating mass (`centrifugal-force`) ---
// flywheel-energy stores rotational KE but nothing computes the centrifugal force a rotating mass
// throws outward - the force that bursts a grinding wheel, shakes an unbalanced rotor, stresses a
// flywheel rim. F = (W/g) omega^2 r, climbing with the SQUARE of speed. Also the g-multiple and rim speed.
// dims: in { weight_lb: M L T^-2, radius_in: L, speed_rpm: T^-1 } out: { centrifugal_force_lbf: M L T^-2, acceleration_g: dimensionless, rim_speed_fps: L T^-1, rim_speed_fpm: L T^-1 }
export function computeCentrifugalForce({ weight_lb = 0, radius_in = 0, speed_rpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(weight_lb) || 0;
  const rIn = Number(radius_in) || 0;
  const N = Number(speed_rpm) || 0;
  if (!(W > 0)) return { error: "Weight must be positive (lb)." };
  if (!(rIn > 0)) return { error: "Radius must be positive (in)." };
  if (!(N > 0)) return { error: "Rotational speed must be positive (rpm)." };
  const g = 32.174; // ft/s^2
  const r = rIn / 12; // ft
  const omega = (2 * Math.PI * N) / 60; // rad/s
  const centrifugal_force_lbf = (W / g) * omega * omega * r;
  const acceleration_g = (omega * omega * r) / g;
  const rim_speed_fps = omega * r;
  const rim_speed_fpm = rim_speed_fps * 60;
  if (![centrifugal_force_lbf, acceleration_g, rim_speed_fps].every(Number.isFinite) || !(centrifugal_force_lbf > 0)) return { error: "Centrifugal-force math is not a finite value; check the inputs." };
  return {
    centrifugal_force_lbf, acceleration_g, rim_speed_fps, rim_speed_fpm, angular_velocity_rad_s: omega,
    note: "Centrifugal (centripetal) force of a concentrated mass at a radius, F = (W/g) omega^2 r, with omega = 2 pi N/60 the angular velocity, g = 32.174 ft/s^2, and r the radius to the mass center. The acceleration in g's is a = omega^2 r/g and the rim (tangential) speed is v = omega r. The force climbs with the SQUARE of speed, so doubling the rpm quadruples the force - which is why a small imbalance is harmless at idle and violent at speed, and why a chipped grinding wheel that is safe by hand can burst at operating rpm. Use the mass and the radius of the center of gravity for a distributed rotor. The burst stress of a rim or disk, the bearing reaction from an imbalance couple, and the critical (whirl) speed are separate. A design aid; Machinery's Handbook and the equipment maker govern.",
  };
}
export const centrifugalForceExample = { inputs: { weight_lb: 2, radius_in: 6, speed_rpm: 1800 } };

MECHANIC_RENDERERS["centrifugal-force"] = _simpleRenderer({
  citation: "Citation: centrifugal (centripetal) force F = (W/g) omega^2 r with omega = 2 pi N/60, g = 32.174 ft/s^2 (standard dynamics; Machinery's Handbook); the acceleration in g's is omega^2 r/g and the rim speed is v = omega r. A design aid; the equipment maker governs.",
  example: centrifugalForceExample.inputs,
  fields: [
    { key: "weight_lb", label: "Mass weight W (lb)", kind: "number" },
    { key: "radius_in", label: "Radius to mass center r (in)", kind: "number" },
    { key: "speed_rpm", label: "Rotational speed (rpm)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "cff-out-f", label: "Centrifugal force", value: (r) => fmt(r.centrifugal_force_lbf, 1) + " lbf" },
    { key: "g", id: "cff-out-g", label: "Acceleration", value: (r) => fmt(r.acceleration_g, 1) + " g" },
    { key: "v", id: "cff-out-v", label: "Rim (tangential) speed", value: (r) => fmt(r.rim_speed_fps, 1) + " ft/s (" + fmt(r.rim_speed_fpm, 0) + " ft/min)" },
    { key: "n", id: "cff-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCentrifugalForce,
});

// --- spec-v1296 K: helical torsion spring rate and torque (`torsion-spring-rate`) ---
// The spring family covers the compression coil but not the torsion spring (garage-door counterbalance,
// clothespin, hinge return). A torsion spring loads its wire in BENDING, so its rate uses E (not G):
// k' = d^4 E/(10.8 D Na) in-lb per turn; torque T = k'(deg/360); bending stress sigma = Kb 32 T/(pi d^3),
// Kb = (4C^2 - C - 1)/(4C(C - 1)) the Wahl round-wire bending factor.
// dims: in { wire_diameter_in: L, mean_coil_diameter_in: L, active_coils: dimensionless, deflection_deg: dimensionless, material: dimensionless } out: { rate_in_lb_per_turn: M L^2 T^-2, rate_in_lb_per_deg: M L^2 T^-2, torque_in_lb: M L^2 T^-2, bending_stress_psi: M L^-1 T^-2 }
export function computeTorsionSpringRate({ wire_diameter_in = 0, mean_coil_diameter_in = 0, active_coils = 0, deflection_deg = 0, material = "music-wire" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(wire_diameter_in) || 0;
  const D = Number(mean_coil_diameter_in) || 0;
  const Na = Number(active_coils) || 0;
  const deg = Number(deflection_deg) || 0;
  const m = SPRING_MATERIALS[material];
  if (!m) return { error: "Unknown spring material." };
  if (!(d > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(D > d)) return { error: "Mean coil diameter must be greater than the wire diameter (in)." };
  if (!(Na > 0)) return { error: "Active coils must be positive." };
  if (deg < 0) return { error: "Deflection cannot be negative (deg)." };
  const E = m.E_psi;
  const C = D / d;
  const rate_in_lb_per_turn = (Math.pow(d, 4) * E) / (10.8 * D * Na);
  const rate_in_lb_per_deg = rate_in_lb_per_turn / 360;
  const torque_in_lb = rate_in_lb_per_turn * (deg / 360);
  const wahl_kb = (4 * C * C - C - 1) / (4 * C * (C - 1));
  const bending_stress_psi = (wahl_kb * 32 * torque_in_lb) / (Math.PI * Math.pow(d, 3));
  const index_flag = C < 4 ? "Spring index D/d < 4: hard to coil and high stress concentration." : C > 14 ? "Spring index D/d > 14: loose, prone to tangling." : null;
  if (![rate_in_lb_per_turn, torque_in_lb, bending_stress_psi, wahl_kb].every(Number.isFinite) || !(rate_in_lb_per_turn > 0)) return { error: "Torsion-spring math is not a finite value; check the inputs." };
  return {
    rate_in_lb_per_turn, rate_in_lb_per_deg, torque_in_lb, bending_stress_psi, spring_index: C, wahl_kb, youngs_modulus_psi: E, index_flag,
    note: "Helical torsion spring rate k' = d^4 E/(10.8 D Na), in-lbf per revolution, using the Young's modulus E because a torsion spring loads its wire in BENDING (not the shear a compression spring sees). The torque at a wind-up of deg degrees is T = k'(deg/360), and the maximum bending stress is sigma = Kb 32 T/(pi d^3) with the Wahl round-wire bending factor Kb = (4C^2 - C - 1)/(4C(C - 1)), C = D/d the spring index. The rate is a torque per turn: wind a fraction of a turn for a hinge return, several turns for a garage-door counterbalance. Torque and stress scale linearly with wind-up, so a full turn is four times the 90-degree value. Compare the stress to the material's allowable bending stress (often 0.7-0.9 Sut for torsion springs). The slight rise in rate as the coil tightens on wind-up (and possible binding on the arbor), end-arm bending, and fatigue life are separate. A design aid; Machinery's Handbook / Shigley and the spring maker govern.",
  };
}
export const torsionSpringRateExample = { inputs: { wire_diameter_in: 0.1875, mean_coil_diameter_in: 1.5, active_coils: 30, deflection_deg: 90, material: "music-wire" } };

MECHANIC_RENDERERS["torsion-spring-rate"] = _simpleRenderer({
  citation: "Citation: helical torsion spring rate k' = d^4 E/(10.8 D Na) in-lbf per turn (Young's modulus E, the wire is in bending), torque T = k'(deg/360), and bending stress sigma = Kb 32 T/(pi d^3) with the Wahl factor Kb = (4C^2 - C - 1)/(4C(C - 1)) (Shigley, Mechanical Engineering Design, Ch. 10; Machinery's Handbook). Compare to the material's allowable bending stress; the spring maker governs.",
  example: torsionSpringRateExample.inputs,
  fields: [
    { key: "wire_diameter_in", label: "Wire diameter d (in)", kind: "number" },
    { key: "mean_coil_diameter_in", label: "Mean coil diameter D (in)", kind: "number" },
    { key: "active_coils", label: "Active coils Na", kind: "number" },
    { key: "deflection_deg", label: "Wind-up deflection (deg)", kind: "number" },
    { key: "material", label: "Wire material", kind: "select", default: "music-wire", options: Object.keys(SPRING_MATERIALS).map((k) => ({ value: k, label: SPRING_MATERIALS[k].label })) },
  ],
  outputs: [
    { key: "k", id: "tsr-out-k", label: "Rate", value: (r) => fmt(r.rate_in_lb_per_turn, 2) + " in-lbf/turn (" + fmt(r.rate_in_lb_per_deg, 4) + " in-lbf/deg)" },
    { key: "t", id: "tsr-out-t", label: "Torque at deflection", value: (r) => fmt(r.torque_in_lb, 2) + " in-lbf" },
    { key: "s", id: "tsr-out-s", label: "Max bending stress", value: (r) => fmt(r.bending_stress_psi, 0) + " psi (index D/d = " + fmt(r.spring_index, 2) + ", Kb = " + fmt(r.wahl_kb, 3) + ")" + (r.index_flag ? " - " + r.index_flag : "") },
    { key: "n", id: "tsr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTorsionSpringRate,
});

// --- spec-v1299 K: universal joint (Cardan) speed variation (`universal-joint-speed`) ---
// The driveline bench has whirl (driveshaft-crit/max-length) but not the Cardan error: the twice-per-rev
// speed fluctuation a single U-joint introduces at an angle. Output ranges between omega cos(beta) and
// omega/cos(beta); fluctuation = 1/cos(beta) - cos(beta). Why driveline angles are kept small and equal.
// dims: in { joint_angle_deg: dimensionless, input_speed_rpm: T^-1 } out: { max_output_rpm: T^-1, min_output_rpm: T^-1, fluctuation_pct: dimensionless }
export function computeUniversalJointSpeed({ joint_angle_deg = 0, input_speed_rpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const beta = Number(joint_angle_deg) || 0;
  const rpm = Number(input_speed_rpm) || 0;
  if (!(beta > 0 && beta <= 85)) return { error: "Joint angle must be between 0 and 85 degrees." };
  if (!(rpm > 0)) return { error: "Input speed must be positive (rpm)." };
  const cb = Math.cos((beta * Math.PI) / 180);
  const max_output_rpm = rpm / cb;
  const min_output_rpm = rpm * cb;
  const fluctuation_pct = (1 / cb - cb) * 100;
  if (![max_output_rpm, min_output_rpm, fluctuation_pct].every(Number.isFinite) || !(cb > 0)) return { error: "Universal-joint math is not a finite value; check the inputs." };
  return {
    max_output_rpm, min_output_rpm, fluctuation_pct, velocity_ratio_max: 1 / cb, velocity_ratio_min: cb,
    note: "Cardan (Hooke) universal-joint speed variation. A single U-joint at operating angle beta makes its output run ahead of and then behind the input twice per revolution: the output speed ranges between omega cos(beta) (slowest, at 90 and 270 degrees of input) and omega/cos(beta) (fastest, at 0 and 180 degrees), a peak-to-peak fluctuation of (1/cos(beta) - cos(beta)) = sin(beta) tan(beta) of the input speed. The swing grows fast with angle - about +/-1.5% at 10 degrees but nearly 29% peak-to-peak at 30 degrees - which is why U-joint working angles are held to a few degrees. A second joint phased 90 degrees at an equal angle (a double-Cardan or a matched two-joint shaft) reverses the error so the far output turns uniformly again. The induced torque pulsation and inertial (secondary) shaking couple, the cancellation math for a specific double-Cardan geometry, and true constant-velocity (CV) joints are separate. Match and phase the joints on a real shaft. A design aid; Machinery's Handbook / Shigley and the driveline maker govern.",
  };
}
export const universalJointSpeedExample = { inputs: { joint_angle_deg: 10, input_speed_rpm: 1000 } };

MECHANIC_RENDERERS["universal-joint-speed"] = _simpleRenderer({
  citation: "Citation: Cardan (Hooke) universal-joint velocity relation (Machinery's Handbook; Shigley): the output speed ranges between omega cos(beta) and omega/cos(beta), a fluctuation of 1/cos(beta) - cos(beta) of the input, twice per revolution at angle beta. A second joint phased 90 degrees at an equal angle cancels it. A design aid; the driveline maker governs.",
  example: universalJointSpeedExample.inputs,
  fields: [
    { key: "joint_angle_deg", label: "Joint operating angle beta (deg)", kind: "number" },
    { key: "input_speed_rpm", label: "Input speed (rpm)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "ujs-out-f", label: "Speed fluctuation (peak-to-peak)", value: (r) => fmt(r.fluctuation_pct, 2) + "% of input" },
    { key: "r", id: "ujs-out-r", label: "Output speed range", value: (r) => fmt(r.min_output_rpm, 1) + " to " + fmt(r.max_output_rpm, 1) + " rpm (twice per rev)" },
    { key: "v", id: "ujs-out-v", label: "Velocity ratio range", value: (r) => fmt(r.velocity_ratio_min, 4) + " to " + fmt(r.velocity_ratio_max, 4) },
    { key: "n", id: "ujs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUniversalJointSpeed,
});

// --- spec-v1300 K: slider-crank piston position (`slider-crank-piston-position`) ---
// The engine bench has mean-piston-speed (average) but not the instantaneous piston position at a crank
// angle - the slider-crank geometry for degreeing a cam, port timing, or piston-to-valve clearance.
// x = r + L - (r cos(theta) + sqrt(L^2 - r^2 sin^2(theta))), r = stroke/2. The rod swing puts the piston
// PAST mid-stroke at 90 deg. dims: in { stroke_in: L, rod_length_in: L, crank_angle_deg: dimensionless } out: { position_from_tdc_in: L, percent_of_stroke: dimensionless, rod_angularity_shift_in: L }
export function computeSliderCrankPistonPosition({ stroke_in = 0, rod_length_in = 0, crank_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const stroke = Number(stroke_in) || 0;
  const L = Number(rod_length_in) || 0;
  const theta_deg = Number(crank_angle_deg);
  if (!(stroke > 0)) return { error: "Stroke must be positive (in)." };
  const r = stroke / 2;
  if (!(L > r)) return { error: "Rod length must be greater than the crank radius (stroke/2) (in)." };
  if (!(theta_deg >= 0 && theta_deg <= 360)) return { error: "Crank angle must be between 0 and 360 degrees." };
  const th = (theta_deg * Math.PI) / 180;
  const position_from_tdc_in = r + L - (r * Math.cos(th) + Math.sqrt(L * L - r * r * Math.sin(th) * Math.sin(th)));
  const simple = r * (1 - Math.cos(th));
  const rod_angularity_shift_in = position_from_tdc_in - simple;
  const percent_of_stroke = (position_from_tdc_in / stroke) * 100;
  const rod_stroke_ratio = L / stroke;
  if (![position_from_tdc_in, percent_of_stroke, rod_angularity_shift_in].every(Number.isFinite)) return { error: "Slider-crank math is not a finite value; check the inputs." };
  return {
    position_from_tdc_in, percent_of_stroke, rod_angularity_shift_in, rod_stroke_ratio, simple_position_in: simple,
    note: "Exact piston position of a centered slider-crank at a crank angle theta after top dead center: x = r + L - (r cos(theta) + sqrt(L^2 - r^2 sin^2(theta))), with the crank radius r = stroke/2 and the connecting-rod length L. At TDC (theta 0) x = 0; at BDC (theta 180) x = stroke. Because the rod swings, the piston moves faster leaving TDC and is already PAST mid-stroke at 90 degrees - the pure-sinusoid position r(1 - cos theta) misses this, and the shorter the rod (smaller rod/stroke ratio) the bigger the shift. Use it to degree a cam, set port timing, or check piston-to-valve and deck clearance against crank angle. Centered (non-offset) slider-crank; piston velocity and acceleration, a wrist-pin offset, rod stretch, and the gas/inertia loads are separate. A design aid; Machinery's Handbook and the engine builder govern.",
  };
}
export const sliderCrankPistonPositionExample = { inputs: { stroke_in: 3.48, rod_length_in: 5.7, crank_angle_deg: 90 } };

MECHANIC_RENDERERS["slider-crank-piston-position"] = _simpleRenderer({
  citation: "Citation: exact slider-crank piston displacement x = r + L - (r cos(theta) + sqrt(L^2 - r^2 sin^2(theta))), r = stroke/2 (Machinery's Handbook; standard kinematics). The rod angularity puts the piston past mid-stroke at 90 degrees; the pure sinusoid r(1 - cos theta) is shown for comparison. A design aid; the engine builder governs.",
  example: sliderCrankPistonPositionExample.inputs,
  fields: [
    { key: "stroke_in", label: "Stroke (in)", kind: "number" },
    { key: "rod_length_in", label: "Connecting-rod length center-to-center (in)", kind: "number" },
    { key: "crank_angle_deg", label: "Crank angle after TDC (deg)", kind: "number" },
  ],
  outputs: [
    { key: "x", id: "scp-out-x", label: "Piston position below TDC", value: (r) => fmt(r.position_from_tdc_in, 4) + " in (" + fmt(r.percent_of_stroke, 1) + "% of stroke)" },
    { key: "d", id: "scp-out-d", label: "Rod-angularity shift", value: (r) => (r.rod_angularity_shift_in >= 0 ? "+" : "") + fmt(r.rod_angularity_shift_in, 4) + " in vs the simple sinusoid (" + fmt(r.simple_position_in, 4) + " in)" },
    { key: "r", id: "scp-out-r", label: "Rod / stroke ratio", value: (r) => fmt(r.rod_stroke_ratio, 2) },
    { key: "n", id: "scp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSliderCrankPistonPosition,
});

// --- spec-v1333 K: scotch-yoke motion (`scotch-yoke-motion`) ---
// The slider-crank tile's note calls out "the pure-sinusoid position r(1 - cos theta)" as the thing rod obliquity
// makes it deviate from, and names "piston velocity and acceleration" as separate. A scotch yoke IS that pure
// mechanism: a crank pin riding in a slotted yoke gives EXACT simple harmonic motion with no connecting rod, so
// x = r(1 - cos theta), v = r omega sin theta, a = r omega^2 cos theta. Used for reciprocating pumps and
// compressors, valve/gate actuators, and sine-motion shaker or vibration-test rigs. Peak speed r*omega at mid-stroke,
// peak acceleration r*omega^2 at each end (which sets the reciprocating inertia load).
// dims: in { crank_radius_in: L, crank_rpm: T^-1, crank_angle_deg: dimensionless } out: { stroke_in: L, peak_velocity_fps: L T^-1, peak_accel_g: dimensionless }
export function computeScotchYokeMotion({ crank_radius_in = 0, crank_rpm = 0, crank_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const G_IN_S2 = 386.0886; // 1 g in in/s^2 (32.174 ft/s^2 x 12)
  const r = Number(crank_radius_in) || 0;
  const N = Number(crank_rpm) || 0;
  const theta_deg = Number(crank_angle_deg);
  if (!(r > 0)) return { error: "Crank radius must be positive (in)." };
  if (!(N > 0)) return { error: "Crank speed must be positive (rpm)." };
  if (!(theta_deg >= 0 && theta_deg <= 360)) return { error: "Crank angle must be between 0 and 360 degrees." };
  const w = (2 * Math.PI * N) / 60; // rad/s
  const th = (theta_deg * Math.PI) / 180;
  const stroke_in = 2 * r;
  const peak_velocity_ips = r * w;
  const peak_velocity_fps = peak_velocity_ips / 12;
  const peak_accel_ips2 = r * w * w;
  const peak_accel_g = peak_accel_ips2 / G_IN_S2;
  const position_in = r * (1 - Math.cos(th)); // from one end, 0 at theta 0 to stroke at 180
  const percent_of_stroke = (position_in / stroke_in) * 100;
  const velocity_ips = r * w * Math.sin(th);
  const accel_ips2 = r * w * w * Math.cos(th);
  const accel_g = accel_ips2 / G_IN_S2;
  if (![stroke_in, peak_velocity_fps, peak_accel_g, position_in, velocity_ips, accel_g].every(Number.isFinite)) return { error: "Scotch-yoke math is not a finite value; check the inputs." };
  return {
    stroke_in, peak_velocity_fps, peak_velocity_ips, peak_accel_g, peak_accel_ips2,
    position_in, percent_of_stroke, velocity_ips, accel_g,
    note: "A scotch yoke - a crank pin riding in a slotted yoke - converts steady rotation into EXACT simple harmonic (pure sinusoidal) linear motion, with no connecting rod: x = r(1 - cos theta) from one end, velocity v = r omega sin theta, acceleration a = r omega^2 cos theta, where r is the crank radius and omega = 2 pi N/60. This is the pure sinusoid the slider-crank only approximates - there is no rod-angularity shift, so the motion is symmetric about mid-stroke and the piston reaches exactly mid-stroke at 90 degrees. The stroke is 2r; the speed peaks at r omega at mid-stroke (theta 90/270) and is zero at the ends, while the acceleration peaks at r omega^2 at each END (theta 0/180) and is zero at mid-stroke - that end acceleration times the reciprocating mass is the inertia force the frame and bearings carry, and it climbs with the SQUARE of rpm. Used for reciprocating pumps and compressors, valve and gate actuators, and sine-motion shaker or vibration-test tables. Rigid ideal mechanism; friction, the yoke side thrust, clearance, and the driven-load force are separate. A design aid; Machinery's Handbook and the machine builder govern.",
  };
}
export const scotchYokeMotionExample = { inputs: { crank_radius_in: 2, crank_rpm: 300, crank_angle_deg: 45 } };

MECHANIC_RENDERERS["scotch-yoke-motion"] = _simpleRenderer({
  citation: "Citation: scotch-yoke simple harmonic motion x = r(1 - cos theta), v = r omega sin theta, a = r omega^2 cos theta, omega = 2 pi N/60 (Machinery's Handbook; standard kinematics). Peak speed r omega at mid-stroke, peak acceleration r omega^2 at the ends. A design aid; the machine builder governs.",
  example: scotchYokeMotionExample.inputs,
  fields: [
    { key: "crank_radius_in", label: "Crank radius r (in, half the stroke)", kind: "number" },
    { key: "crank_rpm", label: "Crank speed (rpm)", kind: "number" },
    { key: "crank_angle_deg", label: "Crank angle (deg)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "syk-out-s", label: "Stroke / peak velocity", value: (r) => fmt(r.stroke_in, 3) + " in stroke; peak " + fmt(r.peak_velocity_fps, 2) + " ft/s (" + fmt(r.peak_velocity_ips, 1) + " in/s) at mid-stroke" },
    { key: "a", id: "syk-out-a", label: "Peak acceleration (at the ends)", value: (r) => fmt(r.peak_accel_g, 2) + " g (" + fmt(r.peak_accel_ips2, 0) + " in/s^2)" },
    { key: "t", id: "syk-out-t", label: "At this crank angle", value: (r) => "x = " + fmt(r.position_in, 3) + " in (" + fmt(r.percent_of_stroke, 1) + "% of stroke), v = " + fmt(r.velocity_ips, 1) + " in/s, a = " + fmt(r.accel_g, 2) + " g" },
    { key: "n", id: "syk-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScotchYokeMotion,
});

// --- spec-v1334 K: toggle mechanism mechanical advantage (`toggle-mechanism-force`) ---
// The MA family has pulley (pulley-ma-gen), rope (rope-ma), and chain hoist (chain-lever-hoist) but not the TOGGLE -
// the linkage in a hold-down clamp, a knee/toggle press, a rivet squeezer, or an injection-mold clamp. Two equal
// links pinned at a knee driven perpendicular to the output line: F_out = F_in/(2 tan theta), where theta is each
// link's angle from the straight (lockup) line. As theta -> 0 the advantage diverges (why a toggle clamp holds hard
// at lockup) but the output travel per unit input travel -> 0, and any over-travel past lockup releases it.
// dims: in { input_force_lb: M L T^-2, toggle_angle_deg: dimensionless } out: { mechanical_advantage: dimensionless, output_force_lb: M L T^-2, velocity_ratio: dimensionless }
export function computeToggleMechanismForce({ input_force_lb = 0, toggle_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(input_force_lb) || 0;
  const theta_deg = Number(toggle_angle_deg);
  if (!(P > 0)) return { error: "Input force must be positive (lb)." };
  if (!(theta_deg > 0 && theta_deg < 90)) return { error: "Toggle angle must be between 0 and 90 degrees (measured from the straight lockup line)." };
  const th = (theta_deg * Math.PI) / 180;
  const mechanical_advantage = 1 / (2 * Math.tan(th));
  const output_force_lb = P * mechanical_advantage;
  const velocity_ratio = 2 * Math.tan(th); // output travel per unit input travel = 1/MA
  if (![mechanical_advantage, output_force_lb, velocity_ratio].every(Number.isFinite) || !(mechanical_advantage > 0)) return { error: "Toggle math is not a finite value; check the inputs." };
  const warnings = [];
  if (theta_deg < 2) warnings.push("Below about 2 degrees the ideal advantage runs away (over " + Math.round(mechanical_advantage) + "x), but joint friction, link stiffness, and clearance cap the real clamp force well short of it - and over-travel past lockup releases the clamp. Size the links and pins for the actual working force, not the theoretical peak.");
  return {
    mechanical_advantage, output_force_lb, velocity_ratio,
    note: "Mechanical advantage of a symmetric toggle linkage - the mechanism in a hold-down clamp, a knee (toggle) press, a rivet or crimp squeezer, or an injection-mold clamp, the one the pulley/rope/chain MA tiles do not cover. Two equal links meet at a knee driven perpendicular to the output line; each link sits at an angle theta from the straight (lockup) line, and the output force is F_out = F_in/(2 tan theta). Near lockup (theta small) the advantage runs toward infinity - a light hand force at the handle becomes a large clamping force - which is exactly why a toggle clamp snaps hard and stays put at over-center. The catch is the reciprocal: the output MOVES only 2 tan theta per unit of input travel, so the huge force comes with almost no stroke, and pushing PAST lockup (theta going negative) releases the clamp instead of tightening it. At 50 lb in and theta 10 degrees the output is 142 lb (MA 2.84); at 5 degrees it is 286 lb (MA 5.72). Ideal frictionless linkage; joint friction, link buckling, pin shear, and the over-center holding geometry are separate. A design aid; Machinery's Handbook and the clamp maker govern.",
    warnings,
  };
}
export const toggleMechanismForceExample = { inputs: { input_force_lb: 50, toggle_angle_deg: 10 } };

MECHANIC_RENDERERS["toggle-mechanism-force"] = _simpleRenderer({
  citation: "Citation: symmetric toggle-linkage mechanical advantage F_out = F_in/(2 tan theta), theta the angle of each link from the straight (lockup) line; output travel per unit input travel = 2 tan theta (Machinery's Handbook; standard statics of the toggle joint). The advantage diverges at lockup; friction and link strength cap the real force. A design aid; the clamp maker governs.",
  example: toggleMechanismForceExample.inputs,
  fields: [
    { key: "input_force_lb", label: "Input force at the knee (lb)", kind: "number" },
    { key: "toggle_angle_deg", label: "Toggle angle from lockup (deg)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "tgl-out-f", label: "Output (clamping) force", value: (r) => fmt(r.output_force_lb, 1) + " lb" },
    { key: "m", id: "tgl-out-m", label: "Mechanical advantage", value: (r) => fmt(r.mechanical_advantage, 3) + " : 1  (output moves " + fmt(r.velocity_ratio, 3) + " per unit of input travel)" },
    { key: "w", id: "tgl-out-w", label: "Note", value: (r) => (r.warnings && r.warnings.length ? r.warnings.join(" ") + " " : "") + r.note },
  ],
  compute: computeToggleMechanismForce,
});

// --- spec-v1335 K: inclined-plane push/hold force (`inclined-plane-force`) ---
// The simple-machine the MA bench skips: the force to move a load along an incline (skidding a crate up a loading
// ramp, sizing a winch pull for a ramp, checking whether a load slides). Along the incline, F_up = W(sin th + mu cos
// th) to move up, W(sin th - mu cos th) is the net down-slope pull gravity wins by (positive => slides on its own).
// Ideal (frictionless) MA = 1/sin th = ramp length/rise; the self-slide threshold is the repose angle atan(mu).
// dims: in { weight_lb: M L T^-2, incline_angle_deg: dimensionless, friction_coefficient: dimensionless } out: { force_up_lb: M L T^-2, normal_force_lb: M L T^-2, ideal_mechanical_advantage: dimensionless }
export function computeInclinedPlaneForce({ weight_lb = 0, incline_angle_deg = 0, friction_coefficient = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(weight_lb) || 0;
  const theta_deg = Number(incline_angle_deg);
  const mu = Number(friction_coefficient) || 0;
  if (!(W > 0)) return { error: "Weight must be positive (lb)." };
  if (!(theta_deg > 0 && theta_deg < 90)) return { error: "Incline angle must be between 0 and 90 degrees." };
  if (mu < 0) return { error: "Friction coefficient cannot be negative." };
  const th = (theta_deg * Math.PI) / 180;
  const s = Math.sin(th), c = Math.cos(th);
  const normal_force_lb = W * c;
  const force_up_lb = W * (s + mu * c);
  const gravity_minus_friction_lb = W * (s - mu * c); // >0 the load slides down on its own; <0 self-locking
  const slides_on_own = s > mu * c; // tan theta > mu
  const restraint_or_push_lb = Math.abs(gravity_minus_friction_lb);
  const ideal_mechanical_advantage = 1 / s; // ramp length / rise, frictionless
  const actual_mechanical_advantage = W / force_up_lb;
  const repose_angle_deg = (Math.atan(mu) * 180) / Math.PI;
  if (![force_up_lb, normal_force_lb, ideal_mechanical_advantage, actual_mechanical_advantage].every(Number.isFinite) || !(force_up_lb > 0)) return { error: "Inclined-plane math is not a finite value; check the inputs." };
  return {
    force_up_lb, normal_force_lb, gravity_minus_friction_lb, restraint_or_push_lb, slides_on_own,
    ideal_mechanical_advantage, actual_mechanical_advantage, repose_angle_deg,
    note: "The force to move a load along an inclined plane - the simple machine the pulley/rope/toggle MA tiles skip: skidding a crate up a loading ramp, sizing a winch or come-along pull for a ramp, or checking whether a parked load will slide. Along the incline the force to push UP at steady speed is F = W(sin theta + mu cos theta), the weight's own down-slope pull (W sin theta) plus friction (mu times the normal W cos theta); the ideal frictionless advantage is 1/sin theta, which equals the ramp length divided by its rise, so a longer, shallower ramp trades distance for force. Whether the load holds by itself is set by the angle of repose atan(mu): below it friction wins and the load is self-locking (it takes a push to send it DOWN); above it the load slides on its own and must be restrained. A 1,000 lb crate on a 20-degree ramp at mu 0.3 takes 624 lb to push up (actual advantage 1.6), sits above its 16.7-degree repose angle so it slides, and needs 60 lb to hold. Rigid load, uniform dry friction, force parallel to the incline; rolling resistance, a winch/tackle reeving (see the pulley and rope MA tiles), tipping, and dynamic starting friction are separate. A planning aid; the rigging plan and a competent person govern.",
  };
}
export const inclinedPlaneForceExample = { inputs: { weight_lb: 1000, incline_angle_deg: 20, friction_coefficient: 0.3 } };

MECHANIC_RENDERERS["inclined-plane-force"] = _simpleRenderer({
  citation: "Citation: inclined-plane statics - force up the incline F = W(sin theta + mu cos theta), normal W cos theta, net down-slope pull W(sin theta - mu cos theta), ideal MA 1/sin theta = length/rise, self-slide at the repose angle atan(mu) (standard mechanics; Machinery's Handbook). Force parallel to the incline, dry friction. A planning aid; the rigging plan governs.",
  example: inclinedPlaneForceExample.inputs,
  fields: [
    { key: "weight_lb", label: "Load weight (lb)", kind: "number" },
    { key: "incline_angle_deg", label: "Incline angle (deg)", kind: "number" },
    { key: "friction_coefficient", label: "Friction coefficient mu", kind: "number" },
  ],
  outputs: [
    { key: "u", id: "inc-out-u", label: "Force to push up the incline", value: (r) => fmt(r.force_up_lb, 1) + " lb (actual advantage " + fmt(r.actual_mechanical_advantage, 2) + " vs ideal " + fmt(r.ideal_mechanical_advantage, 2) + ")" },
    { key: "h", id: "inc-out-h", label: "Holding", value: (r) => r.slides_on_own ? ("slides on its own (above the " + fmt(r.repose_angle_deg, 1) + " deg repose angle) - needs " + fmt(r.restraint_or_push_lb, 1) + " lb to hold or lower at steady speed") : ("self-locking (below the " + fmt(r.repose_angle_deg, 1) + " deg repose angle) - needs " + fmt(r.restraint_or_push_lb, 1) + " lb to push it DOWN") },
    { key: "n", id: "inc-out-n", label: "Normal force", value: (r) => fmt(r.normal_force_lb, 1) + " lb" },
    { key: "t", id: "inc-out-t", label: "Note", value: (r) => r.note },
  ],
  compute: computeInclinedPlaneForce,
});

// --- spec-v1336 K: wedge splitting force and self-locking (`wedge-force`) ---
// The last classic simple machine: a wedge splits, lifts, or shims. A driving force P along the centerline of a
// symmetric wedge of included angle alpha (half-angle b = alpha/2) drives normal + friction forces on the two faces;
// the useful spreading force per side is N(cos b - mu sin b) and P = 2 N(sin b + mu cos b), so the mechanical
// advantage is (cos b - mu sin b)/(sin b + mu cos b). Frictionless it is cot b, but wedges live on friction: the
// self-locking property (a driven wedge or shim STAYS put) holds when the half-angle is under the friction angle,
// b < atan(mu). Distinct in use from the toggle (a clamp linkage) and the inclined plane (a load sliding up a ramp).
// dims: in { driving_force_lb: M L T^-2, included_angle_deg: dimensionless, friction_coefficient: dimensionless } out: { spreading_force_lb: M L T^-2, mechanical_advantage: dimensionless, self_locking: dimensionless }
export function computeWedgeForce({ driving_force_lb = 0, included_angle_deg = 0, friction_coefficient = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(driving_force_lb) || 0;
  const alpha = Number(included_angle_deg);
  const mu = Number(friction_coefficient) || 0;
  if (!(P > 0)) return { error: "Driving force must be positive (lb)." };
  if (!(alpha > 0 && alpha < 90)) return { error: "Included wedge angle must be between 0 and 90 degrees." };
  if (mu < 0) return { error: "Friction coefficient cannot be negative." };
  const b = ((alpha / 2) * Math.PI) / 180; // half-angle per face
  const sb = Math.sin(b), cb = Math.cos(b);
  const denom = sb + mu * cb; // driving factor
  const num = cb - mu * sb; // useful (spreading) factor
  if (!(num > 0)) return { error: "The wedge is too blunt for this friction: friction on the faces exceeds the spreading geometry, so it jams instead of splitting. Use a sharper wedge or reduce the friction." };
  const mechanical_advantage = num / denom;
  const spreading_force_lb = P * mechanical_advantage;
  const ideal_mechanical_advantage = cb / sb; // frictionless, = cot(b)
  const self_locking = Math.tan(b) < mu; // b < atan(mu)
  const friction_angle_deg = (Math.atan(mu) * 180) / Math.PI;
  const half_angle_deg = alpha / 2;
  if (![spreading_force_lb, mechanical_advantage, ideal_mechanical_advantage].every(Number.isFinite) || !(spreading_force_lb > 0)) return { error: "Wedge math is not a finite value; check the inputs." };
  return {
    spreading_force_lb, mechanical_advantage, ideal_mechanical_advantage, self_locking, friction_angle_deg, half_angle_deg,
    note: "The splitting, lifting, or shimming force of a wedge - the last of the classic simple machines, the one the pulley/rope/toggle/incline MA tiles do not cover: a splitting maul or log-splitter wedge, a wedge jack, a machine-leveling wedge, or a shim. A driving force P along the centerline of a symmetric wedge of included angle alpha (half-angle b = alpha/2) becomes a spreading force on each face; with dry friction the advantage is (cos b - mu sin b)/(sin b + mu cos b). Frictionless that is cot b - a sharp wedge multiplies hugely - but a wedge lives on friction: a big share of the drive is spent overcoming it (a 30-degree wedge at mu 0.3 delivers 1.6x, not the frictionless 3.7x), and that same friction is what lets a driven wedge or shim STAY put. It self-locks when the half-angle is under the friction angle, b < atan(mu): a 15-degree half-angle holds under mu 0.3 (friction angle 16.7 degrees) but backs out under a slicker mu 0.2 (11.3 degrees). A blunt wedge (large angle) can multiply less than 1 or jam entirely. Ideal rigid wedge, uniform dry friction, quasi-static; the splitting resistance of the material, impact driving, and the wedge strength are separate. A planning aid; Machinery's Handbook and the tool maker govern.",
  };
}
export const wedgeForceExample = { inputs: { driving_force_lb: 100, included_angle_deg: 30, friction_coefficient: 0.3 } };

MECHANIC_RENDERERS["wedge-force"] = _simpleRenderer({
  citation: "Citation: wedge statics - spreading force per face N(cos b - mu sin b) with P = 2 N(sin b + mu cos b), so MA = (cos b - mu sin b)/(sin b + mu cos b), b the half-angle; frictionless MA = cot b; self-locks when b < atan(mu) (standard mechanics; Machinery's Handbook). Quasi-static, dry friction. A planning aid; the tool maker governs.",
  example: wedgeForceExample.inputs,
  fields: [
    { key: "driving_force_lb", label: "Driving force along the wedge (lb)", kind: "number" },
    { key: "included_angle_deg", label: "Included (total) wedge angle (deg)", kind: "number" },
    { key: "friction_coefficient", label: "Friction coefficient mu", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "wdg-out-f", label: "Spreading (splitting/lifting) force", value: (r) => fmt(r.spreading_force_lb, 1) + " lb (advantage " + fmt(r.mechanical_advantage, 2) + " vs frictionless " + fmt(r.ideal_mechanical_advantage, 2) + ")" },
    { key: "l", id: "wdg-out-l", label: "Self-locking", value: (r) => r.self_locking ? ("yes - stays put once driven (the " + fmt(r.half_angle_deg, 1) + " deg half-angle is under the " + fmt(r.friction_angle_deg, 1) + " deg friction angle)") : ("no - backs out under load (the " + fmt(r.half_angle_deg, 1) + " deg half-angle exceeds the " + fmt(r.friction_angle_deg, 1) + " deg friction angle); hold or retain it") },
    { key: "n", id: "wdg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWedgeForce,
});

// --- spec-v1302 K: impact load factor, energy method (`impact-load-factor`) ---
// No general impact factor for a dropped/suddenly-applied load (fall-arrest is PPE, tree-rigging-shock is
// arborist rope). Energy method: n = 1 + sqrt(1 + 2h/delta_st); impact force = nW; even h=0 gives n=2.
// dims: in { weight_lb: M L T^-2, drop_height_in: L, static_deflection_in: L } out: { impact_factor: dimensionless, impact_force_lbf: M L T^-2, impact_deflection_in: L }
export function computeImpactLoadFactor({ weight_lb = 0, drop_height_in = 0, static_deflection_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(weight_lb) || 0;
  const h = Number(drop_height_in);
  const dst = Number(static_deflection_in) || 0;
  if (!(W > 0)) return { error: "Weight must be positive (lb)." };
  if (h < 0) return { error: "Drop height cannot be negative (in)." };
  if (!(dst > 0)) return { error: "Static deflection must be positive (in)." };
  const impact_factor = 1 + Math.sqrt(1 + (2 * h) / dst);
  const impact_force_lbf = impact_factor * W;
  const impact_deflection_in = impact_factor * dst;
  if (![impact_factor, impact_force_lbf, impact_deflection_in].every(Number.isFinite) || !(impact_factor >= 2)) return { error: "Impact math is not a finite value; check the inputs." };
  return {
    impact_factor, impact_force_lbf, impact_deflection_in,
    note: "Energy-method impact (amplification) factor for a load dropped or suddenly applied onto an elastic member: n = 1 + sqrt(1 + 2h/delta_st), with the falling weight W, the free-fall drop height h before it engages the member, and the static deflection delta_st the member shows under W applied slowly (W/k for stiffness k). The peak force is n W and the peak deflection is n delta_st. The factor is the price of suddenness: at h = 0 (a load released while just touching) it is exactly 2, and it climbs with the square root of the drop divided by how much the catch gives, so a stiff catch (tiny delta_st) makes even a small drop brutal - the reason a load must never be dropped onto a slack sling or a rigid stop, and why a shock-absorbing lanyard or a bit of rope stretch (a larger delta_st) sharply cuts the peak. Elastic, no energy loss (all drop energy goes into elastic strain); plastic deformation, damping, the member's own mass, repeated (fatigue) impact, and rope/sling dynamics are separate. A design aid; Roark and the engineer of record govern.",
  };
}
export const impactLoadFactorExample = { inputs: { weight_lb: 1000, drop_height_in: 2, static_deflection_in: 0.10 } };

MECHANIC_RENDERERS["impact-load-factor"] = _simpleRenderer({
  citation: "Citation: energy-method impact factor n = 1 + sqrt(1 + 2h/delta_st) for a load dropped onto an elastic member, with the impact force n W and deflection n delta_st (Roark's Formulas for Stress and Strain; mechanics of materials). At h = 0 the factor is 2. Elastic, no energy loss; the engineer of record governs.",
  example: impactLoadFactorExample.inputs,
  fields: [
    { key: "weight_lb", label: "Falling weight W (lb)", kind: "number" },
    { key: "drop_height_in", label: "Free-fall drop height h (in)", kind: "number" },
    { key: "static_deflection_in", label: "Static deflection under W, delta_st (in)", kind: "number" },
  ],
  outputs: [
    { key: "n", id: "ilf-out-n", label: "Impact factor", value: (r) => fmt(r.impact_factor, 3) + " x static" },
    { key: "f", id: "ilf-out-f", label: "Peak impact force", value: (r) => fmt(r.impact_force_lbf, 0) + " lbf" },
    { key: "d", id: "ilf-out-d", label: "Peak impact deflection", value: (r) => fmt(r.impact_deflection_in, 4) + " in" },
    { key: "note", id: "ilf-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeImpactLoadFactor,
});

// --- spec-v1304 K: hydraulic accumulator usable oil volume (`hydraulic-accumulator-volume`) ---
// The catalog sizes a compressed-AIR receiver but not a hydraulic accumulator, which sizes on the gas law
// between precharge and working pressures: dV = V0[(P0/P1)^(1/n) - (P0/P2)^(1/n)], absolute pressures,
// n = 1 isothermal (slow) / 1.4 adiabatic (fast). Precharge must sit at or below the minimum working pressure.
// dims: in { accumulator_size_gal: L^3, precharge_psig: M L^-1 T^-2, min_pressure_psig: M L^-1 T^-2, max_pressure_psig: M L^-1 T^-2, gas_process: dimensionless } out: { usable_volume_gal: L^3, utilization_pct: dimensionless }
export function computeHydraulicAccumulatorVolume({ accumulator_size_gal = 0, precharge_psig = 0, min_pressure_psig = 0, max_pressure_psig = 0, gas_process = "isothermal" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V0 = Number(accumulator_size_gal) || 0;
  const P0g = Number(precharge_psig) || 0;
  const P1g = Number(min_pressure_psig) || 0;
  const P2g = Number(max_pressure_psig) || 0;
  if (!(V0 > 0)) return { error: "Accumulator size must be positive (gal)." };
  if (!(P0g > 0)) return { error: "Precharge pressure must be positive (psig)." };
  if (!(P1g > 0)) return { error: "Minimum working pressure must be positive (psig)." };
  if (!(P2g > P1g)) return { error: "Maximum working pressure must be greater than the minimum (psig)." };
  if (P0g > P1g) return { error: "Precharge must be at or below the minimum working pressure (psig)." };
  if (gas_process !== "isothermal" && gas_process !== "adiabatic") return { error: "Gas process must be isothermal or adiabatic." };
  const n = gas_process === "adiabatic" ? 1.4 : 1;
  const P0 = P0g + 14.7, P1 = P1g + 14.7, P2 = P2g + 14.7;
  const usable_volume_gal = V0 * (Math.pow(P0 / P1, 1 / n) - Math.pow(P0 / P2, 1 / n));
  const utilization_pct = (usable_volume_gal / V0) * 100;
  if (![usable_volume_gal, utilization_pct].every(Number.isFinite) || !(usable_volume_gal > 0)) return { error: "Accumulator math is not a finite value; check the inputs." };
  return {
    usable_volume_gal, utilization_pct, polytropic_n: n,
    note: "Usable (deliverable) oil volume of a gas-charged bladder or piston hydraulic accumulator, dV = V0[(P0/P1)^(1/n) - (P0/P2)^(1/n)] with ABSOLUTE pressures (gauge + 14.7): V0 the accumulator (nominal gas) size, P0 the precharge, P1 the minimum working pressure, and P2 the maximum. Below the precharge the accumulator holds no oil, so the precharge must sit at or just below P1 (a common rule is P0 = 0.9 P1). The gas process sets the exponent: a slow cycle is isothermal (n = 1) and stores the most oil; a fast cycle is adiabatic (n = 1.4), where the heated gas stores less; the truth is between. Widen the pressure band or precharge closer to the minimum to get more usable oil, or step up to a bigger accumulator. Temperature correction of the precharge, real-gas effects at very high pressure, response time, and the shock/pulsation duty are separate. Keep the precharge and pressures within the accumulator's rating. A design aid; Machinery's Handbook / NFPA fluid-power practice and the accumulator maker govern.",
  };
}
export const hydraulicAccumulatorVolumeExample = { inputs: { accumulator_size_gal: 1, precharge_psig: 1500, min_pressure_psig: 1600, max_pressure_psig: 3000, gas_process: "isothermal" } };

MECHANIC_RENDERERS["hydraulic-accumulator-volume"] = _simpleRenderer({
  citation: "Citation: hydraulic accumulator usable oil volume dV = V0[(P0/P1)^(1/n) - (P0/P2)^(1/n)] with absolute pressures (Machinery's Handbook; NFPA fluid-power practice; Boyle's law n = 1 isothermal, 1.4 adiabatic). The precharge sits at or below the minimum working pressure. A design aid; the accumulator maker governs.",
  example: hydraulicAccumulatorVolumeExample.inputs,
  fields: [
    { key: "accumulator_size_gal", label: "Accumulator size V0 (gal)", kind: "number" },
    { key: "precharge_psig", label: "Gas precharge P0 (psig)", kind: "number" },
    { key: "min_pressure_psig", label: "Minimum working pressure P1 (psig)", kind: "number" },
    { key: "max_pressure_psig", label: "Maximum working pressure P2 (psig)", kind: "number" },
    { key: "gas_process", label: "Gas process", kind: "select", default: "isothermal", options: [
      { value: "isothermal", label: "Isothermal (slow cycle, n = 1)" },
      { value: "adiabatic", label: "Adiabatic (fast cycle, n = 1.4)" },
    ] },
  ],
  outputs: [
    { key: "v", id: "hav-out-v", label: "Usable oil volume", value: (r) => fmt(r.usable_volume_gal, 4) + " gal (" + fmt(r.usable_volume_gal * 231, 1) + " in^3)" },
    { key: "u", id: "hav-out-u", label: "Utilization", value: (r) => fmt(r.utilization_pct, 1) + "% of the nominal size (n = " + fmt(r.polytropic_n, 1) + ")" },
    { key: "n", id: "hav-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicAccumulatorVolume,
});

// --- spec-v1306 K: projectile range, height, and flight time (`projectile-range`) ---
// fire-stream-reaction gives the nozzle force but not the TRAJECTORY. Level-ground projectile:
// R = v^2 sin(2 theta)/g, H = v^2 sin^2(theta)/(2g), t = 2 v sin(theta)/g. Range peaks at 45 deg;
// complementary angles give equal range. Still-air upper bound (no drag). g = 32.174 ft/s^2.
// dims: in { velocity_fps: L T^-1, angle_deg: dimensionless } out: { range_ft: L, max_height_ft: L, flight_time_s: T }
export function computeProjectileRange({ velocity_fps = 0, angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const v = Number(velocity_fps) || 0;
  const th = Number(angle_deg);
  if (!(v > 0)) return { error: "Launch speed must be positive (ft/s)." };
  if (!(th > 0 && th < 90)) return { error: "Launch angle must be between 0 and 90 degrees." };
  const g = 32.174; // ft/s^2
  const rad = (th * Math.PI) / 180;
  const range_ft = (v * v * Math.sin(2 * rad)) / g;
  const max_height_ft = (v * v * Math.sin(rad) * Math.sin(rad)) / (2 * g);
  const flight_time_s = (2 * v * Math.sin(rad)) / g;
  if (![range_ft, max_height_ft, flight_time_s].every(Number.isFinite) || !(range_ft > 0)) return { error: "Projectile math is not a finite value; check the inputs." };
  return {
    range_ft, max_height_ft, flight_time_s, complementary_angle_deg: 90 - th,
    note: "Still-air, level-ground trajectory of a point projectile launched at speed v and angle theta above horizontal: horizontal range R = v^2 sin(2 theta)/g, maximum height H = v^2 sin^2(theta)/(2g), and time of flight t = 2 v sin(theta)/g, with g = 32.174 ft/s^2. The range peaks at 45 degrees; any two complementary angles (for example 30 and 60 degrees) give the SAME range but different heights and hang times, the trade a nozzle operator or a sprinkler layout makes between reach, height, and coverage. Air resistance is NEGLECTED, so a real water stream or light object falls short of these numbers - they are the still-air upper bound. A launch height above the landing plane, wind, and stream break-up are separate. Use it for reach and clearance estimates, not a ballistic or aerodynamic calculation. A planning estimate; field conditions govern.",
  };
}
export const projectileRangeExample = { inputs: { velocity_fps: 80, angle_deg: 45 } };

MECHANIC_RENDERERS["projectile-range"] = _simpleRenderer({
  citation: "Citation: level-ground projectile kinematics (standard mechanics): range R = v^2 sin(2 theta)/g, max height H = v^2 sin^2(theta)/(2g), flight time t = 2 v sin(theta)/g, g = 32.174 ft/s^2. Range peaks at 45 degrees; complementary angles give equal range. Still-air (no drag) upper bound. A planning estimate; field conditions govern.",
  example: projectileRangeExample.inputs,
  fields: [
    { key: "velocity_fps", label: "Launch speed v (ft/s)", kind: "number" },
    { key: "angle_deg", label: "Launch angle above horizontal (deg)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "prj-out-r", label: "Horizontal range", value: (r) => fmt(r.range_ft, 1) + " ft" },
    { key: "h", id: "prj-out-h", label: "Maximum height", value: (r) => fmt(r.max_height_ft, 1) + " ft" },
    { key: "t", id: "prj-out-t", label: "Time of flight", value: (r) => fmt(r.flight_time_s, 2) + " s (same range at " + fmt(r.complementary_angle_deg, 0) + " deg)" },
    { key: "n", id: "prj-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeProjectileRange,
});

// --- spec-v1307 K: free-fall drop time, impact speed, and energy (`free-fall-drop`) ---
// Personal fall-arrest tiles exist but not the dropped-OBJECT hazard (DROPS): how fast a tool hits and
// with how much energy. v = sqrt(2 g h), t = sqrt(2 h/g), KE = W h. Still air (no drag). g = 32.174 ft/s^2.
// dims: in { drop_height_ft: L, object_weight_lb: M L T^-2 } out: { impact_speed_fps: L T^-1, impact_speed_mph: L T^-1, fall_time_s: T, impact_energy_ftlb: M L^2 T^-2 }
export function computeFreeFallDrop({ drop_height_ft = 0, object_weight_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(drop_height_ft) || 0;
  const W = Number(object_weight_lb) || 0;
  if (!(h > 0)) return { error: "Drop height must be positive (ft)." };
  if (W < 0) return { error: "Object weight cannot be negative (lb)." };
  const g = 32.174; // ft/s^2
  const impact_speed_fps = Math.sqrt(2 * g * h);
  const impact_speed_mph = impact_speed_fps * 0.681818182;
  const fall_time_s = Math.sqrt((2 * h) / g);
  const impact_energy_ftlb = W > 0 ? W * h : null;
  if (![impact_speed_fps, fall_time_s].every(Number.isFinite) || !(impact_speed_fps > 0)) return { error: "Free-fall math is not a finite value; check the inputs." };
  return {
    impact_speed_fps, impact_speed_mph, fall_time_s, impact_energy_ftlb,
    note: "Still-air free fall from a height h: the impact speed is v = sqrt(2 g h), the time to fall is t = sqrt(2 h/g), and the impact (kinetic) energy at the bottom is KE = W h (= m g h) when an object weight is given, with g = 32.174 ft/s^2. Speed grows with the square ROOT of height (fast at first, then slowly), while the energy grows in direct proportion to height. A 5 lb tool dropped 50 ft hits at about 39 mph with 250 ft-lbf - easily fatal, the reason for hard hats, toe boards, tethers, and a cleared drop zone (the DROPS problem). Air resistance is NEGLECTED - fine for a dense, compact object over jobsite heights, optimistic for a light or bluff one that reaches its terminal velocity. The deceleration force on impact (which depends on how far the object and surface give - see impact-load-factor), a horizontal launch (projectile-range), and bounce are separate. A safety-planning estimate; the competent person and the site safety plan govern.",
  };
}
export const freeFallDropExample = { inputs: { drop_height_ft: 50, object_weight_lb: 5 } };

MECHANIC_RENDERERS["free-fall-drop"] = _simpleRenderer({
  citation: "Citation: still-air free-fall kinematics (standard mechanics): impact speed v = sqrt(2 g h), fall time t = sqrt(2 h/g), impact energy KE = W h (= m g h), g = 32.174 ft/s^2. Air drag (terminal velocity), impact deceleration force, and horizontal launch are separate. A safety-planning estimate; the competent person governs.",
  example: freeFallDropExample.inputs,
  fields: [
    { key: "drop_height_ft", label: "Drop height h (ft)", kind: "number" },
    { key: "object_weight_lb", label: "Object weight W (lb, optional for energy)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "ffd-out-v", label: "Impact speed", value: (r) => fmt(r.impact_speed_fps, 1) + " ft/s (" + fmt(r.impact_speed_mph, 1) + " mph)" },
    { key: "t", id: "ffd-out-t", label: "Time to fall", value: (r) => fmt(r.fall_time_s, 2) + " s" },
    { key: "e", id: "ffd-out-e", label: "Impact energy", value: (r) => r.impact_energy_ftlb != null ? fmt(r.impact_energy_ftlb, 0) + " ft-lbf" : "enter a weight for the impact energy" },
    { key: "n", id: "ffd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFreeFallDrop,
});

// --- spec-v1308 K: terminal velocity from weight, area, and drag (`terminal-velocity`) ---
// free-fall-drop gives the no-drag speed and aerodynamic-drag-force gives drag at a speed; this is where
// they balance. At terminal velocity W = 1/2 rho V^2 Cd A, so V_t = sqrt(2 W/(rho_mass Cd A)). The cap that
// free-fall ignores for a light/bluff object. rho_mass = rho_weight/g, g = 32.174 ft/s^2.
// dims: in { weight_lb: M L T^-2, frontal_area_ft2: L^2, drag_coefficient: dimensionless, air_density_lb_ft3: M L^-3 } out: { terminal_velocity_fps: L T^-1, terminal_velocity_mph: L T^-1 }
export function computeTerminalVelocity({ weight_lb = 0, frontal_area_ft2 = 0, drag_coefficient = 0, air_density_lb_ft3 = 0.0765 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(weight_lb) || 0;
  const A = Number(frontal_area_ft2) || 0;
  const Cd = Number(drag_coefficient) || 0;
  const rhoW = Number(air_density_lb_ft3) || 0;
  if (!(W > 0)) return { error: "Weight must be positive (lb)." };
  if (!(A > 0)) return { error: "Frontal area must be positive (ft^2)." };
  if (!(Cd > 0)) return { error: "Drag coefficient must be positive." };
  if (!(rhoW > 0)) return { error: "Air density must be positive (lb/ft^3)." };
  const g = 32.174; // ft/s^2
  const rhoMass = rhoW / g; // slug/ft^3
  const terminal_velocity_fps = Math.sqrt((2 * W) / (rhoMass * Cd * A));
  const terminal_velocity_mph = terminal_velocity_fps * 0.681818182;
  if (![terminal_velocity_fps, terminal_velocity_mph].every(Number.isFinite) || !(terminal_velocity_fps > 0)) return { error: "Terminal-velocity math is not a finite value; check the inputs." };
  return {
    terminal_velocity_fps, terminal_velocity_mph,
    note: "Terminal velocity, the steady speed where the aerodynamic drag 1/2 rho V^2 Cd A exactly balances the weight W and the object stops accelerating: V_t = sqrt(2 W/(rho_mass Cd A)), with the mass air density rho_mass = (weight density)/g (g = 32.174 ft/s^2), the frontal area A, and the drag coefficient Cd. Heavy, compact, slick objects (small A, small Cd, big W) fall fast; light, bluff ones settle slowly. A 180 lb skydiver at 7 ft^2 and Cd 0.7 terminals at the familiar 120 mph. This is the CEILING that free-fall-drop (no drag) ignores - a compact tool over a short jobsite drop is still accelerating (free-fall is right), but a sheet of plywood or a person tops out and falls no faster no matter the height. The distance and time to REACH terminal (an exponential approach), tumbling that changes Cd and A, compressibility, and altitude density change are separate. Pair with free-fall-drop and aerodynamic-drag-force. A planning estimate; field conditions govern.",
  };
}
export const terminalVelocityExample = { inputs: { weight_lb: 180, frontal_area_ft2: 7, drag_coefficient: 0.7, air_density_lb_ft3: 0.0765 } };

MECHANIC_RENDERERS["terminal-velocity"] = _simpleRenderer({
  citation: "Citation: terminal-velocity balance W = 1/2 rho V^2 Cd A solved for V (standard fluid mechanics): V_t = sqrt(2 W/(rho_mass Cd A)), rho_mass = (weight density)/g. The distance/time to reach terminal, tumbling, and density change are separate. A planning estimate; field conditions govern.",
  example: terminalVelocityExample.inputs,
  fields: [
    { key: "weight_lb", label: "Object weight W (lb)", kind: "number" },
    { key: "frontal_area_ft2", label: "Frontal area A (ft²)", kind: "number" },
    { key: "drag_coefficient", label: "Drag coefficient Cd", kind: "number" },
    { key: "air_density_lb_ft3", label: "Air density (lb/ft³)", kind: "number", attrs: { step: "any", value: "0.0765" } },
  ],
  outputs: [
    { key: "v", id: "tv-out-v", label: "Terminal velocity", value: (r) => fmt(r.terminal_velocity_fps, 1) + " ft/s (" + fmt(r.terminal_velocity_mph, 1) + " mph)" },
    { key: "n", id: "tv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTerminalVelocity,
});

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
  const t = makeNumber("Torque (lb-ft)", "hpt-t", { step: "any", min: "0" });
  const n = makeNumber("RPM", "hpt-n", { step: "any", min: "0" });
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
  const disp = makeNumber("Displacement (ci)", "ve-disp", { step: "any", min: "0" });
  const rpm = makeNumber("RPM", "ve-rpm", { step: "any", min: "0" });
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
  const rpm = makeNumber("Engine RPM", "gmr-rpm", { step: "any", min: "0"});
  const trans = makeNumber("Transmission gear ratio", "gmr-trans", { step: "any", min: "0", value: "1" }); trans.input.value = "1";
  const axle = makeNumber("Axle ratio", "gmr-axle", { step: "any", min: "0"});
  const dia = makeNumber("Tire diameter (in)", "gmr-dia", { step: "any", min: "0"});
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
export const paintMixRatioExample = { inputs: { paint_volume_oz: 16, part_paint: 4, part_hardener: 1, part_reducer: 1 } };
const renderPaintMixRatio = _simpleRenderer({
  citation: "Citation: Paint manufacturer technical data sheet (mix ratio by volume; induction and pot life off the TDS, by name). 29.5735 mL per US fluid ounce.",
  example: paintMixRatioExample.inputs,
  fields: [
    { key: "paint_volume_oz", label: "Base / color volume (fl oz)", kind: "number" },
    { key: "part_paint", label: "Paint parts", kind: "number" },
    { key: "part_hardener", label: "Hardener parts", kind: "number" },
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
    { key: "inj_flow", label: "Injector static flow", kind: "number" },
    { key: "flow_unit", label: "Flow unit", kind: "select", options: [{ value: "lbh", label: "lb/h" }, { value: "ccmin", label: "cc/min" }], default: "lbh" },
    { key: "n_cyl", label: "Number of injectors", kind: "number", attrs: { step: "1", min: "1" } },
    { key: "duty", label: "Maximum duty cycle (0-1)", kind: "number" },
    { key: "bsfc", label: "BSFC (lb/hp-h; 0.50 NA, 0.55-0.65 boost)", kind: "number" },
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
    { key: "stroke_in", label: "Crankshaft stroke (in)", kind: "number" },
    { key: "mps_limit_fpm", label: "Mean-piston-speed limit (ft/min)", kind: "number" },
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
    { key: "weight_lb", label: "Vehicle weight incl. driver (lb)", kind: "number" },
    { key: "et_s", label: "Quarter-mile elapsed time (s)", kind: "number" },
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
    { key: "gpm", label: "Pump flow (gpm)", kind: "number" },
    { key: "psi", label: "Working pressure (psi)", kind: "number" },
    { key: "efficiency", label: "Overall pump efficiency (0-1)", kind: "number" },
  ],
  outputs: [
    { key: "fh", id: "hph-out-fh", label: "Fluid horsepower", value: (r) => fmt(r.fluid_hp, 1) + " HP" },
    { key: "ih", id: "hph-out-ih", label: "Drive (input) horsepower", value: (r) => fmt(r.input_hp, 1) + " HP (loss " + fmt(r.loss_hp, 1) + " HP)" },
    { key: "n", id: "hph-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicPumpHorsepower,
});

// dims: in { drive_hp: M L^2 T^-3, psi: M L^-1 T^-2, efficiency: dimensionless } out: { max_gpm: L^3 T^-1, fluid_hp: M L^2 T^-3 }
export function computeHydraulicDriveFlowLimit({ drive_hp = 0, psi = 0, efficiency = 0.85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hp = Number(drive_hp) || 0;
  const p = Number(psi) || 0;
  const eff = Number(efficiency) || 0;
  if (!(hp > 0)) return { error: "Drive horsepower must be positive (HP)." };
  if (!(p > 0)) return { error: "Working pressure must be positive (psi)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Efficiency must be between 0 and 1." };
  // Inverse of input_hp = (gpm x psi / 1714) / efficiency: gpm = 1714 x drive_hp x efficiency / psi.
  const fluid_hp = hp * eff;
  const max_gpm = 1714 * fluid_hp / p;
  if (!Number.isFinite(max_gpm) || !(max_gpm > 0)) return { error: "Flow math is not a finite positive value." };
  return {
    max_gpm, fluid_hp,
    note: "The most flow a hydraulic power unit can deliver at a working pressure for a given drive horsepower, the inverse of the hydraulic-pump-horsepower tile: from drive_hp = (gpm x psi / 1714) / efficiency, gpm = 1714 x drive_hp x efficiency / psi. Flow trades directly against pressure at a fixed power, which is why a system that needs more force (pressure) at the same motor gives up speed (flow), the constant-horsepower curve a pressure-compensated pump rides. The overall efficiency (typically 0.80-0.90 gear/vane, higher for a piston pump) is the fraction of drive power that reaches the fluid. This is the power ceiling; the pump displacement and rpm set the actual flow, so use it as the maximum the motor can support. A sizing aid; the pump and motor manufacturer data govern."
  };
}
export const hydraulicDriveFlowLimitExample = { inputs: { drive_hp: 13.73, psi: 2000, efficiency: 0.85 } };
MECHANIC_RENDERERS["hydraulic-drive-flow-limit"] = _simpleRenderer({
  citation: "Citation: hydraulic pump power solved for flow: gpm = 1714 x drive_hp x efficiency / psi, from fluid HP = gpm x psi / 1714 and drive HP = fluid HP / efficiency. Flow trades against pressure at fixed power. A sizing aid; the pump and motor manufacturer's data govern.",
  example: hydraulicDriveFlowLimitExample.inputs,
  fields: [
    { key: "drive_hp", label: "Available drive horsepower (HP)", kind: "number" },
    { key: "psi", label: "Working pressure (psi)", kind: "number" },
    { key: "efficiency", label: "Overall pump efficiency (0-1)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "hdfl-out-q", label: "Max flow", value: (r) => fmt(r.max_gpm, 1) + " gpm" },
    { key: "fh", id: "hdfl-out-fh", label: "Fluid horsepower", value: (r) => fmt(r.fluid_hp, 1) + " HP" },
    { key: "n", id: "hdfl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicDriveFlowLimit,
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
    { key: "psi", label: "Pressure differential (psi)", kind: "number" },
    { key: "disp_in3", label: "Motor displacement (in³/rev)", kind: "number" },
    { key: "gpm", label: "Supply flow (gpm)", kind: "number" },
    { key: "mech_eff", label: "Mechanical efficiency (0-1)", kind: "number" },
    { key: "vol_eff", label: "Volumetric efficiency (0-1)", kind: "number" },
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
    { key: "disp_in3", label: "Pump displacement (in³/rev)", kind: "number" },
    { key: "rpm", label: "Drive speed (rpm)", kind: "number" },
    { key: "vol_eff", label: "Volumetric efficiency (0-1)", kind: "number" },
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
    { key: "q_btuh", label: "Heat rejection to coolant (Btu/hr)", kind: "number" },
    { key: "dt_f", label: "Coolant temperature rise (°F)", kind: "number" },
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
    { key: "current_pitch_in", label: "Current prop pitch (in)", kind: "number" },
    { key: "current_wot_rpm", label: "Measured WOT RPM now", kind: "number" },
    { key: "target_wot_rpm", label: "Target WOT RPM (rated band)", kind: "number" },
    { key: "rpm_per_inch", label: "RPM change per inch of pitch", kind: "number" },
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
    { key: "horsepower", label: "Engine power output (hp)", kind: "number" },
    { key: "bsfc_lb_hp_hr", label: "BSFC (lb/hp-hr, diesel ~0.37)", kind: "number" },
    { key: "density_lb_gal", label: "Fuel density (lb/gal, diesel 7.1 / gas 6.1)", kind: "number" },
    { key: "tank_gal", label: "Tank size (gal, optional for run time)", kind: "number" },
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
    { key: "total_load_a", label: "Total continuous electrical load (A)", kind: "number" },
    { key: "alternator_a", label: "Alternator rated output (A)", kind: "number" },
    { key: "idle_frac", label: "Output fraction at idle (0-1)", kind: "number" },
    { key: "cruise_frac", label: "Output fraction at cruise (0-1)", kind: "number" },
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
    { key: "target_torque_ftlb", label: "Target torque at fastener (ft-lb)", kind: "number" },
    { key: "wrench_length_in", label: "Wrench lever length (in, drive to grip)", kind: "number" },
    { key: "adapter_length_in", label: "Crowfoot / extension length (in)", kind: "number" },
    { key: "adapter_angle_deg", label: "Adapter angle from wrench axis (deg, 0 in-line / 90 perpendicular)", kind: "number" },
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
    { key: "field_elevation_ft", label: "Field / station elevation (ft)", kind: "number" },
    { key: "altimeter_in_hg", label: "Altimeter setting (in Hg)", kind: "number" },
    { key: "oat_f", label: "Outside air temperature (°F)", kind: "number" },
  ],
  outputs: [
    { key: "pa", id: "da-out-pa", label: "Pressure altitude", value: (r) => fmt(r.pa_ft, 0) + " ft" },
    { key: "isa", id: "da-out-isa", label: "Standard (ISA) temp at that altitude", value: (r) => fmt(r.isa_c, 1) + " C (OAT " + fmt(r.oat_c, 1) + " C)" },
    { key: "da", id: "da-out-da", label: "Density altitude", value: (r) => fmt(r.da_ft, 0) + " ft (" + (r.da_ft >= r.pa_ft ? "+" : "") + fmt(r.da_ft - r.pa_ft, 0) + " ft vs pressure altitude)" },
    { key: "n", id: "da-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDensityAltitude,
});

// ===================== spec-v1252: true airspeed from CAS and density altitude =====================
// The companion the density-altitude tile feeds and turn-radius-bank consumes: no tile converted CAS
// to TAS. TAS = CAS / sqrt(sigma), sigma the ISA density ratio at the density altitude,
// sigma = (1 - 6.87535e-6 h)^4.2559 (h = density altitude in ft, troposphere). FAA PHAK / ICAO ISA.
// dims: in { cas_kt: dimensionless, density_altitude_ft: dimensionless } out: { tas_kt: dimensionless, density_ratio: dimensionless, rule_of_thumb_kt: dimensionless }
export function computeTrueAirspeed({ cas_kt = 0, density_altitude_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cas = Number(cas_kt);
  const da = Number(density_altitude_ft);
  if (!(cas > 0)) return { error: "Calibrated airspeed must be positive (kt)." };
  if (!Number.isFinite(da)) return { error: "Density altitude must be a number (ft)." };
  if (da > 36089) return { error: "This ISA density-ratio form is for the troposphere (density altitude at or below 36,089 ft); above the tropopause a different relation applies." };
  const base = 1 - 6.87535e-6 * da;
  if (!(base > 0)) return { error: "Density altitude is out of range for the ISA density-ratio formula." };
  const density_ratio = Math.pow(base, 4.2559);
  const tas_kt = cas / Math.sqrt(density_ratio);
  const rule_of_thumb_kt = cas * (1 + 0.02 * da / 1000);
  if (![density_ratio, tas_kt, rule_of_thumb_kt].every(Number.isFinite)) return { error: "True-airspeed math is not a finite value." };
  return {
    tas_kt, density_ratio, rule_of_thumb_kt,
    note: "The true airspeed from the calibrated airspeed and the density altitude, the conversion the density-altitude tile leads up to and the turn-radius-bank tile takes as an input. The airspeed indicator senses dynamic pressure (half rho V squared), so in thinner air the same indicated speed is a faster true speed: TAS = CAS / sqrt(sigma), where sigma is the air-density ratio rho/rho0. At the density altitude, sigma equals the ISA value sigma = (1 - 6.87535e-6 h)^4.2559 with h in feet, which is 1.000 at sea level, 0.862 at 5,000 ft (TAS 7.7% over CAS), and 0.739 at 10,000 ft (16.4% over). A 120 KCAS climb at an 8,000 ft density altitude is really 135 KTAS across the ground-referenced air mass. The field rule of thumb, add 2% per 1,000 ft of density altitude, is shown alongside; it tracks the exact value to a few knots up to about 10,000 ft, then reads a touch low. This treats CAS as equal to equivalent airspeed (the low-speed assumption; the compressibility correction to EAS matters only at high speed and altitude), and TAS is still airspeed - add the wind vector to get ground speed. A planning estimate; the aircraft flight manual and the pilot in command govern.",
  };
}
export const trueAirspeedExample = { inputs: { cas_kt: 120, density_altitude_ft: 8000 } };
MECHANIC_RENDERERS["true-airspeed"] = _simpleRenderer({
  citation: "Citation: true airspeed TAS = CAS / sqrt(sigma), with the ISA density ratio sigma = (1 - 6.87535e-6 h)^4.2559 at the density altitude h (ft), per the FAA Pilot's Handbook of Aeronautical Knowledge and the ICAO Standard Atmosphere; the +2%/1000 ft rule of thumb is shown for comparison. Treats CAS = equivalent airspeed (low-speed assumption); add wind for ground speed. A planning estimate; the aircraft flight manual and the pilot in command govern.",
  example: trueAirspeedExample.inputs,
  fields: [
    { key: "cas_kt", label: "Calibrated airspeed CAS (kt)", kind: "number" },
    { key: "density_altitude_ft", label: "Density altitude (ft, from the density-altitude tile)", kind: "number" },
  ],
  outputs: [
    { key: "tas", id: "tas-out-tas", label: "True airspeed", value: (r) => fmt(r.tas_kt, 1) + " kt" },
    { key: "sig", id: "tas-out-sig", label: "Density ratio sigma", value: (r) => fmt(r.density_ratio, 4) },
    { key: "rot", id: "tas-out-rot", label: "Rule of thumb (+2%/1000 ft)", value: (r) => fmt(r.rule_of_thumb_kt, 1) + " kt" },
    { key: "n", id: "tas-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrueAirspeed,
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
    { key: "runway_heading_deg", label: "Runway heading (deg, e.g. 360 for runway 36)", kind: "number" },
    { key: "wind_dir_deg", label: "Wind direction FROM (deg)", kind: "number" },
    { key: "wind_speed_kt", label: "Steady wind speed (kt)", kind: "number" },
    { key: "gust_kt", label: "Gust speed (kt, 0 = none)", kind: "number" },
    { key: "max_demo_xwind_kt", label: "Max demonstrated crosswind (kt, 0 = skip check)", kind: "number" },
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
    { key: "lwl_ft", label: "Load waterline length LWL (ft)", kind: "number" },
    { key: "actual_speed_kn", label: "Actual / target speed (kn, 0 = hull speed only)", kind: "number" },
  ],
  outputs: [
    { key: "hs", id: "hs-out-hs", label: "Theoretical hull speed", value: (r) => fmt(r.hull_speed_kn, 2) + " kn" },
    { key: "sl", id: "hs-out-sl", label: "Speed-length ratio", value: (r) => r.sl_ratio === null ? "- (enter an actual speed)" : fmt(r.sl_ratio, 2) },
    { key: "rg", id: "hs-out-rg", label: "Regime", value: (r) => r.regime === null ? "-" : r.regime },
    { key: "n", id: "hs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHullSpeed,
});

// waterline-for-hull-speed: inverse of hull-speed. The forward tile gives the
// displacement hull speed from a waterline length; sizing the waterline a hull
// needs to reach a target speed is the inverse. From hull_speed = 1.34 x sqrt(LWL),
// LWL = (target_speed / 1.34)^2 (the coefficient is editable, ~1.34-1.4).
// dims: in { target_hull_speed_kn: L T^-1, coefficient: dimensionless } out: { waterline_length_ft: L }
export function computeWaterlineForHullSpeed({ target_hull_speed_kn = 0, coefficient = 1.34 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sp = Number(target_hull_speed_kn) || 0;
  const c = Number(coefficient) > 0 ? Number(coefficient) : 1.34;
  if (!(sp > 0)) return { error: "Target hull speed must be positive (kn)." };
  if (!(c > 0)) return { error: "Speed-length coefficient must be positive." };
  const ratio = sp / c;
  const waterline_length_ft = ratio * ratio;
  return {
    waterline_length_ft, coefficient: c,
    note: "Displacement hull-speed relation solved for the waterline: LWL = (target speed / 1.34)^2, since hull_speed = 1.34 x sqrt(LWL). This is the waterline a PURE DISPLACEMENT hull needs to reach the target without climbing its own bow wave - near the speed-length ratio of 1.34 the bow and stern waves merge and the hull hits a practical wall. A semi-displacement or planing hull exceeds it with enough power and the right form, so this is the displacement ceiling, not a hard limit. The coefficient is an approximation (some references use 1.34 to 1.4, editable). A planning estimate; the actual hull form, displacement, and power govern.",
  };
}
export const waterlineForHullSpeedExample = { inputs: { target_hull_speed_kn: 8, coefficient: 1.34 } };
MECHANIC_RENDERERS["waterline-for-hull-speed"] = _simpleRenderer({
  citation: "Citation: displacement hull-speed relation (Froude speed-length theory) solved for the waterline: LWL = (target speed / 1.34)^2, from hull_speed = 1.34 x sqrt(LWL). The 1.34 ceiling is a practical wall for a pure displacement hull; the coefficient is editable (~1.34-1.4). A planning estimate; the hull form, displacement, and power govern.",
  example: waterlineForHullSpeedExample.inputs,
  fields: [
    { key: "target_hull_speed_kn", label: "Target hull speed (kn)", kind: "number" },
    { key: "coefficient", label: "Speed-length coefficient (~1.34)", kind: "number" },
  ],
  outputs: [
    { key: "lwl", id: "wlh-out-lwl", label: "Required waterline length", value: (r) => fmt(r.waterline_length_ft, 1) + " ft" },
    { key: "n", id: "wlh-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWaterlineForHullSpeed,
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
    { key: "water_depth_ft", label: "Water depth at high tide (ft)", kind: "number" },
    { key: "bow_height_ft", label: "Bow-roller height above water (ft)", kind: "number" },
    { key: "scope_ratio", label: "Desired scope (7 rope+chain / 5 mixed / 3 all-chain)", kind: "number" },
    { key: "boat_loa_ft", label: "Boat length overall (ft, for swing radius)", kind: "number" },
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
    { key: "boost_psi", label: "Target boost (psi, gauge)", kind: "number" },
    { key: "ambient_psia", label: "Ambient pressure (psia, 14.7 at sea level)", kind: "number" },
    { key: "inlet_temp_f", label: "Compressor inlet air temp (°F)", kind: "number" },
    { key: "compressor_eff_pct", label: "Compressor isentropic efficiency (%)", kind: "number" },
  ],
  outputs: [
    { key: "pr", id: "tpr-out-pr", label: "Pressure ratio", value: (r) => fmt(r.pr, 2) },
    { key: "to", id: "tpr-out-to", label: "Compressor-outlet temp", value: (r) => fmt(r.t_out_f, 0) + " F (rise " + fmt(r.temp_rise_f, 0) + " F)" },
    { key: "n", id: "tpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurboPressureRatio,
});

// turbo-max-boost-for-charge-temp: inverse of turbo-pressure-ratio. The forward
// tile gives the charge-air temperature from a boost; keeping that temperature
// under a limit is the inverse. From T_out = T_in x [1 + (PR^0.283 - 1)/eff],
// PR = [1 + eff x (T_out/T_in - 1)]^(1/0.283) and boost = ambient x (PR - 1),
// all temperatures absolute (Rankine).
// dims: in { max_charge_temp_f: T, inlet_temp_f: T, compressor_eff_pct: dimensionless, ambient_psia: M L^-1 T^-2 } out: { max_boost_psi: M L^-1 T^-2, pressure_ratio: dimensionless }
export function computeTurboMaxBoostForChargeTemp({ max_charge_temp_f = 0, inlet_temp_f = 0, compressor_eff_pct = 70, ambient_psia = 14.7 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tout = Number(max_charge_temp_f);
  const tin = Number(inlet_temp_f);
  const eff = Number(compressor_eff_pct) || 0;
  const amb = Number(ambient_psia) || 0;
  if (!Number.isFinite(tin) || tin <= -459.67) return { error: "Inlet temperature must be above absolute zero (-459.67 F)." };
  if (!Number.isFinite(tout) || tout <= -459.67) return { error: "Charge-air temperature limit must be above absolute zero (-459.67 F)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Compressor efficiency must be over 0 and at most 100 percent." };
  if (!(amb > 0)) return { error: "Ambient pressure must be positive (psia)." };
  const tin_r = tin + 459.67, tout_r = tout + 459.67;
  const ratio = tout_r / tin_r;
  if (!(ratio > 1)) return { error: "The charge-air temperature limit must be above the inlet temperature; compressing air only heats it." };
  const pr_pow = 1 + (eff / 100) * (ratio - 1);
  const pressure_ratio = Math.pow(pr_pow, 1 / 0.283);
  const max_boost_psi = amb * (pressure_ratio - 1);
  if (![pressure_ratio, max_boost_psi].every(Number.isFinite)) return { error: "Turbo math is not a finite value." };
  return {
    max_boost_psi, pressure_ratio,
    note: "The compressor-outlet-temperature model solved for the boost: the gauge boost at which the charge-air (compressor-outlet) temperature reaches the limit, boost = ambient x (PR - 1) with PR = [1 + efficiency x (T_out/T_in - 1)]^(1/0.283) (temperatures absolute). Above this boost the outlet air is hotter than the limit, so more intercooling (which resets this against the intercooler-outlet temp), a more efficient compressor, or a cooler inlet is needed to run more boost safely. This is the compressor-outlet temperature and ignores any intercooler and assumes the gamma = 1.4 dry-air exponent. A planning estimate, not a tune; the compressor map and the engine build govern.",
  };
}
export const turboMaxBoostForChargeTempExample = { inputs: { max_charge_temp_f: 250, inlet_temp_f: 80, compressor_eff_pct: 70, ambient_psia: 14.7 } };
MECHANIC_RENDERERS["turbo-max-boost-for-charge-temp"] = _simpleRenderer({
  citation: "Citation: turbocharger charge-air-temperature model solved for the boost: PR = [1 + efficiency x (T_out/T_in - 1)]^(1/0.283), boost = ambient x (PR - 1), temperatures absolute (compressor-map sizing; ideal-gas adiabatic compression). Compressor-outlet temperature (ignores any intercooler); gamma = 1.4 assumed. A planning estimate; the compressor map and engine build govern.",
  example: turboMaxBoostForChargeTempExample.inputs,
  fields: [
    { key: "max_charge_temp_f", label: "Charge-air temperature limit (°F)", kind: "number" },
    { key: "inlet_temp_f", label: "Compressor inlet air temp (°F)", kind: "number" },
    { key: "compressor_eff_pct", label: "Compressor isentropic efficiency (%)", kind: "number" },
    { key: "ambient_psia", label: "Ambient pressure (psia, 14.7 at sea level)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "tmb-out-b", label: "Max boost (gauge)", value: (r) => fmt(r.max_boost_psi, 1) + " psi" },
    { key: "pr", id: "tmb-out-pr", label: "Pressure ratio at the limit", value: (r) => fmt(r.pressure_ratio, 2) },
    { key: "n", id: "tmb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurboMaxBoostForChargeTemp,
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
    { key: "displacement_lb", label: "Loaded displacement (lb)", kind: "number" },
    { key: "shaft_hp", label: "Shaft / propeller horsepower (hp)", kind: "number" },
    { key: "hull_constant", label: "Hull constant C (150 cruiser / 190 runabout / 210 race)", kind: "number" },
  ],
  outputs: [
    { key: "sp", id: "cps-out-sp", label: "Planing speed", value: (r) => fmt(r.speed_mph, 1) + " mph (" + fmt(r.speed_mph * 0.868976, 1) + " kn)" },
    { key: "wp", id: "cps-out-wp", label: "Weight-to-power ratio", value: (r) => fmt(r.weight_to_power, 1) + " lb/hp" },
    { key: "n", id: "cps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrouchPlaningSpeed,
});

// ===================== spec-v671: horsepower for a target planing speed (inverse of crouch-planing-speed) =====================

// dims: in { target_speed_mph: L T^-1, displacement_lb: M L T^-2, hull_constant: dimensionless } out: { required_hp: M L^2 T^-3, weight_to_power: dimensionless }
export function computeCrouchHpForSpeed({ target_speed_mph = 0, displacement_lb = 0, hull_constant = 190 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const v = Number(target_speed_mph) || 0;
  const wt = Number(displacement_lb) || 0;
  const c = Number(hull_constant) || 0;
  if (!(v > 0)) return { error: "Target speed must be positive (mph)." };
  if (!(wt > 0)) return { error: "Displacement must be positive (lb)." };
  if (!(c > 0)) return { error: "Hull constant C must be positive." };
  // Inverse of speed = C sqrt(hp / weight): hp = weight x (speed / C)^2.
  const required_hp = wt * Math.pow(v / c, 2);
  const weight_to_power = wt / required_hp;
  if (![required_hp, weight_to_power].every(Number.isFinite) || !(required_hp > 0)) return { error: "Crouch-power math is not a finite value." };
  return {
    required_hp, weight_to_power,
    note: "The shaft horsepower Crouch's formula says a planing hull needs for a target speed, the inverse of the crouch-planing-speed tile: from speed_mph = C / sqrt(weight / hp), hp = weight x (speed / C)^2. Because speed rises only with the square root of the power-to-weight ratio, the horsepower rises with the SQUARE of the target speed - going 40% faster needs about twice the power, and the last few mph are the most expensive. The answer is for speed in MILES PER HOUR (not knots) with the conventional hull constant C (about 150 heavy cruiser, 190 runabout, 210 race), chosen by hull type. The formula assumes the boat is on plane; below the planing threshold it does not apply. A planning estimate, not a performance prediction; the actual hull, propeller, and conditions govern.",
  };
}
export const crouchHpForSpeedExample = { inputs: { target_speed_mph: 34.7, displacement_lb: 6000, hull_constant: 190 } };

MECHANIC_RENDERERS["crouch-hp-for-speed"] = _simpleRenderer({
  citation: "Citation: Crouch's planing-speed formula solved for the power: hp = weight x (speed / C)^2, from speed_mph = C / sqrt(weight / hp), with the hull constant C about 150 heavy cruiser / 190 runabout / 210 race. Speed is mph, not knots; horsepower rises with the square of the target speed. Assumes the boat is on plane. A planning estimate; the hull, propeller, and conditions govern.",
  example: crouchHpForSpeedExample.inputs,
  fields: [
    { key: "target_speed_mph", label: "Target planing speed (mph)", kind: "number" },
    { key: "displacement_lb", label: "Loaded displacement (lb)", kind: "number" },
    { key: "hull_constant", label: "Hull constant C (150 cruiser / 190 runabout / 210 race)", kind: "number" },
  ],
  outputs: [
    { key: "hp", id: "chfs-out-hp", label: "Required shaft horsepower", value: (r) => fmt(r.required_hp, 0) + " hp" },
    { key: "wp", id: "chfs-out-wp", label: "Weight-to-power ratio", value: (r) => fmt(r.weight_to_power, 1) + " lb/hp" },
    { key: "n", id: "chfs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrouchHpForSpeed,
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
    { key: "rim_width_in", label: "Rim (bead-seat) width (in)", kind: "number" },
    { key: "offset_mm", label: "Offset ET (mm, + = outboard face; use if solving from offset)", kind: "number" },
    { key: "backspacing_in", label: "Backspacing (in, 0 = solve it from offset)", kind: "number" },
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
    { key: "pedal_force_lb", label: "Pedal force (lb)", kind: "number" },
    { key: "pedal_ratio", label: "Pedal ratio", kind: "number" },
    { key: "booster_factor", label: "Booster factor (1.0 = manual)", kind: "number" },
    { key: "mc_bore_in", label: "Master-cylinder bore (in)", kind: "number" },
    { key: "caliper_area_in2", label: "Caliper piston area per corner (in²)", kind: "number" },
    { key: "pad_friction", label: "Pad friction coefficient (~0.4)", kind: "number" },
    { key: "rotor_radius_in", label: "Effective rotor radius (in)", kind: "number" },
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
    { key: "air_temp_f", label: "Inlet air temperature (°F)", kind: "number", default: 86 },
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
    { key: "empty_weight_lb", label: "Empty weight (lb)", kind: "number" },
    { key: "empty_arm_in", label: "Empty-weight arm (in from datum)", kind: "number" },
    { key: "front_weight_lb", label: "Front seats weight (lb)", kind: "number" },
    { key: "front_arm_in", label: "Front seats arm (in)", kind: "number" },
    { key: "rear_weight_lb", label: "Rear seats weight (lb)", kind: "number" },
    { key: "rear_arm_in", label: "Rear seats arm (in)", kind: "number" },
    { key: "fuel_weight_lb", label: "Fuel weight (lb)", kind: "number" },
    { key: "fuel_arm_in", label: "Fuel arm (in)", kind: "number" },
    { key: "baggage_weight_lb", label: "Baggage weight (lb)", kind: "number" },
    { key: "baggage_arm_in", label: "Baggage arm (in)", kind: "number" },
    { key: "max_gross_lb", label: "Maximum gross weight (lb)", kind: "number" },
    { key: "fwd_cg_limit_in", label: "Forward CG limit (in)", kind: "number" },
    { key: "aft_cg_limit_in", label: "Aft CG limit (in)", kind: "number" },
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
    { key: "current_a", label: "Load current (A)", kind: "number" },
    { key: "run_length_ft", label: "One-way run length (ft, tile doubles it)", kind: "number" },
    { key: "system_voltage_v", label: "System voltage (V, 12 / 24 / 32)", kind: "number" },
    { key: "drop_pct", label: "Allowable drop (%, 3 critical / 10 non-critical)", kind: "number" },
  ],
  outputs: [
    { key: "vd", id: "adw-out-vd", label: "Allowable voltage drop", value: (r) => fmt(r.v_drop_v, 2) + " V" },
    { key: "cm", id: "adw-out-cm", label: "Required copper", value: (r) => fmt(r.circular_mils, 0) + " circular mils" },
    { key: "awg", id: "adw-out-awg", label: "AWG to pick (by voltage drop)", value: (r) => r.awg === null ? "> 4/0 (exceeds this tile's table)" : "#" + r.awg + " (" + fmt(r.awg_cm, 0) + " CM)" },
    { key: "n", id: "adw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAbycDcWire,
});

// ===================== spec-v783: BCI reserve capacity to amp-hours =====================
// Reserve capacity (RC) is the minutes a fully charged 12 V battery at 80 F sustains a
// 25 A draw before terminal voltage falls to 10.5 V (BCI / SAE J537). Ah at the RC rate
// = 25 x RC/60.
// dims: in { rc_minutes: T } out: { amp_hours: I T }
export function computeReserveCapacityAmpHours({ rc_minutes = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rc = Number(rc_minutes) || 0;
  if (!(rc > 0)) return { error: "Reserve capacity must be positive (minutes)." };
  const amp_hours = 25 * (rc / 60);
  if (!Number.isFinite(amp_hours)) return { error: "Reserve-capacity math is not a finite value." };
  return {
    amp_hours, rc_minutes: rc,
    note: "BCI / SAE J537 reserve capacity is the number of minutes a fully charged 12 V battery at 80 F can deliver 25 A before the terminal voltage falls to 10.5 V; the amp-hours at that reserve rate are 25 x RC/60. This RC-rate capacity is smaller than the 20-hour-rate amp-hours printed on a deep-cycle label, because a higher discharge current delivers less capacity (Peukert's effect), so the two figures are not interchangeable. Cold cuts the available capacity further. A comparison aid; the battery's published rating and a load test govern.",
  };
}
export const reserveCapacityAmpHoursExample = { inputs: { rc_minutes: 120 } };

MECHANIC_RENDERERS["reserve-capacity-amp-hours"] = _simpleRenderer({
  citation: "Citation: BCI / SAE J537 reserve capacity: RC is the minutes a fully charged 12 V battery at 80 F sustains a 25 A draw to a 10.5 V cutoff; amp-hours at the reserve rate = 25 x RC/60. The RC-rate capacity is lower than the 20-hour-rate amp-hours on a deep-cycle label (Peukert's effect), so the two are not interchangeable; cold reduces capacity further. A comparison aid; the battery rating and a load test govern.",
  example: reserveCapacityAmpHoursExample.inputs,
  fields: [
    { key: "rc_minutes", label: "Reserve capacity (minutes)", kind: "number" },
  ],
  outputs: [
    { key: "ah", id: "rcah-out-ah", label: "Amp-hours (at the 25 A reserve rate)", value: (r) => fmt(r.amp_hours, 1) + " Ah" },
    { key: "n", id: "rcah-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReserveCapacityAmpHours,
});

// ===================== spec-v786: sacrificial (galvanic) anode service life =====================
// Faraday's law: an anode's life = the charge it can deliver / the charge it consumes per year.
// Q (electrochemical capacity, A-h per lb): zinc 354, aluminum (Al-Zn-In) 1150, magnesium 500.
const _ANODE_CAPACITY_AH_PER_LB = { zinc: 354, aluminum: 1150, magnesium: 500 };
// dims: in { anode_material: dimensionless, anode_mass_lb: M, current_draw_a: I, utilization_factor: dimensionless } out: { life_years: T, life_months: T, consumption_lb_per_year: M T^-1 }
export function computeSacrificialAnodeLife({ anode_material = "zinc", anode_mass_lb = 0, current_draw_a = 0, utilization_factor = 0.85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mass = Number(anode_mass_lb) || 0;
  const current = Number(current_draw_a) || 0;
  const u = Number(utilization_factor) || 0;
  const capacity = _ANODE_CAPACITY_AH_PER_LB[anode_material];
  if (!capacity) return { error: "Anode material must be zinc, aluminum, or magnesium." };
  if (!(mass > 0)) return { error: "Anode net mass must be positive (lb)." };
  if (!(current > 0)) return { error: "Protective current draw must be positive (A)." };
  if (!(u > 0 && u <= 1)) return { error: "Utilization factor must be over 0 and at most 1 (typically 0.85)." };
  const life_hours = mass * capacity * u / current;
  const life_years = life_hours / 8760;
  const life_months = life_years * 12;
  const consumption_lb_per_year = current * 8760 / (capacity * u);
  if (![life_years, consumption_lb_per_year].every(Number.isFinite)) return { error: "Anode-life math is not a finite value." };
  return {
    life_years, life_months, consumption_lb_per_year, capacity, material: anode_material,
    note: "Sacrificial-anode life by Faraday's law: the charge an anode can deliver (net mass x electrochemical capacity x utilization) divided by the charge the protective current draws per year (current x 8760 h). Electrochemical capacity is a material property -- zinc about 354 A-h/lb, aluminum (Al-Zn-In alloy) about 1150, magnesium about 500 -- so an aluminum anode of equal mass lasts far longer per amp and is why aluminum has largely replaced zinc on modern boats (it also works in brackish water, where zinc passivates). The utilization factor (about 0.85 for a slender standoff anode) accounts for the anode becoming ineffective before it is fully consumed. The protective current itself depends on the wetted area, coating, and water, so measure it with a reference electrode or a bonding-system meter. Replace an anode at about half consumed, not when it is gone. A planning estimate; a corrosion survey and the reference-cell reading govern.",
  };
}
export const sacrificialAnodeLifeExample = { inputs: { anode_material: "zinc", anode_mass_lb: 5, current_draw_a: 0.15, utilization_factor: 0.85 } };

MECHANIC_RENDERERS["sacrificial-anode-life"] = _simpleRenderer({
  citation: "Citation: sacrificial-anode life by Faraday's law (ABYC E-2 cathodic protection; DNV-RP-B401 capacities): life = anode_mass x capacity x utilization / (current x 8760 h). Electrochemical capacity ~354 A-h/lb zinc, ~1150 aluminum (Al-Zn-In), ~500 magnesium; utilization ~0.85 for a standoff anode. The protective current depends on wetted area, coating, and water; measure it with a reference electrode. Replace at about half consumed. A planning estimate; a corrosion survey governs.",
  example: sacrificialAnodeLifeExample.inputs,
  fields: [
    { key: "anode_material", label: "Anode material", kind: "select", options: [{ value: "zinc", label: "Zinc (~354 A-h/lb)" }, { value: "aluminum", label: "Aluminum Al-Zn-In (~1150 A-h/lb)" }, { value: "magnesium", label: "Magnesium (~500 A-h/lb)" }] },
    { key: "anode_mass_lb", label: "Anode net mass (lb)", kind: "number" },
    { key: "current_draw_a", label: "Protective current draw (A)", kind: "number" },
    { key: "utilization_factor", label: "Utilization factor (0-1, ~0.85)", kind: "number" },
  ],
  outputs: [
    { key: "y", id: "anode-out-y", label: "Estimated life", value: (r) => fmt(r.life_years, 2) + " yr (" + fmt(r.life_months, 1) + " months)" },
    { key: "c", id: "anode-out-c", label: "Consumption rate", value: (r) => fmt(r.consumption_lb_per_year, 2) + " lb/yr" },
    { key: "q", id: "anode-out-q", label: "Capacity used", value: (r) => fmt(r.capacity, 0) + " A-h/lb (" + r.material + ")" },
    { key: "n", id: "anode-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSacrificialAnodeLife,
});

// ===================== spec-v791: engine brake mean effective pressure (BMEP) =====================
// BMEP normalizes torque by displacement, letting engines of any size be compared on how hard each
// cycle works. From Power = 2*pi*N*T and Power = BMEP*V_d*(N/n_rev): BMEP = 2*pi*n_rev*T/V_d.
// A 4-stroke fires every 2 crank revs (n_rev = 2), a 2-stroke every rev (n_rev = 1). With T in lb-in
// (= lb-ft*12) and V_d in in^3, BMEP(psi) = 2*pi*n_rev*12*T_lbft/CID -> 150.8 (4-stroke) / 75.4 (2-stroke).
const _BMEP_FACTOR = { four_stroke: 150.796, two_stroke: 75.398 };
// dims: in { torque_lb_ft: M L^2 T^-2, displacement_cid: L^3, cycle_type: dimensionless } out: { bmep_psi: M L^-1 T^-2 }
export function computeEngineBmep({ torque_lb_ft = 0, displacement_cid = 0, cycle_type = "four_stroke" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = Number(torque_lb_ft) || 0;
  const cid = Number(displacement_cid) || 0;
  const factor = _BMEP_FACTOR[cycle_type];
  if (!factor) return { error: "Cycle type must be four_stroke or two_stroke." };
  if (!(t > 0)) return { error: "Peak torque must be positive (lb-ft)." };
  if (!(cid > 0)) return { error: "Displacement must be positive (cubic inches)." };
  const bmep_psi = factor * t / cid;
  if (!Number.isFinite(bmep_psi)) return { error: "BMEP math is not a finite value." };
  let band;
  if (bmep_psi < 125) band = "low -- a mild, understressed, or worn engine (or a naturally-aspirated diesel)";
  else if (bmep_psi < 190) band = "typical of a healthy naturally-aspirated gasoline engine at its torque peak";
  else if (bmep_psi < 300) band = "high -- boosted (turbo/supercharged) or a strong turbodiesel";
  else band = "very high -- a heavily-boosted, race, or purpose-built engine";
  return {
    bmep_psi, band, factor, cycle_type,
    note: "Brake mean effective pressure is torque normalized by displacement: BMEP = " + (cycle_type === "two_stroke" ? "75.4" : "150.8") + " x torque(lb-ft) / displacement(CID) for a " + (cycle_type === "two_stroke" ? "two" : "four") + "-stroke. It is the average pressure that, acting on the piston through one power stroke, would produce the measured torque -- so it strips engine SIZE out and measures how hard each cycle works, letting a 350 and a 2.0 L be compared directly. It is evaluated at the TORQUE peak (the rpm of maximum BMEP), not peak power. Naturally-aspirated gasoline engines top out around 180-190 psi because they can only fill the cylinder with one atmosphere; a BMEP above that is the signature of boost, and a low value points to a mild cam, restriction, or wear. Use the peak torque from the dyno, corrected to a standard day. A comparison metric, not a design limit; the engine and its dyno sheet govern.",
  };
}
export const engineBmepExample = { inputs: { torque_lb_ft: 400, displacement_cid: 350, cycle_type: "four_stroke" } };

MECHANIC_RENDERERS["engine-bmep"] = _simpleRenderer({
  citation: "Citation: brake mean effective pressure (SAE; Heywood, Internal Combustion Engine Fundamentals): BMEP = 2*pi*n_rev*T/V_d, which for T in lb-ft and V_d in CID is 150.8 x torque / displacement (4-stroke, n_rev=2) or 75.4 (2-stroke, n_rev=1). Evaluated at the torque peak; naturally-aspirated gasoline tops out near 180-190 psi, boost runs higher. A comparison metric; the dyno sheet governs.",
  example: engineBmepExample.inputs,
  fields: [
    { key: "torque_lb_ft", label: "Peak torque (lb-ft)", kind: "number" },
    { key: "displacement_cid", label: "Displacement (cubic inches)", kind: "number" },
    { key: "cycle_type", label: "Engine cycle", kind: "select", options: [{ value: "four_stroke", label: "4-stroke (150.8)" }, { value: "two_stroke", label: "2-stroke (75.4)" }] },
  ],
  outputs: [
    { key: "b", id: "bmep-out-b", label: "BMEP", value: (r) => fmt(r.bmep_psi, 1) + " psi (" + fmt(r.bmep_psi / 14.5038, 1) + " bar)" },
    { key: "i", id: "bmep-out-i", label: "Interpretation", value: (r) => r.band },
    { key: "n", id: "bmep-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEngineBmep,
});

// ===================== spec-v794: required rate of descent on a glidepath =====================
// Ground speed is the horizontal velocity; the descent right triangle gives vertical drop per
// horizontal unit = tan(gamma). ROD(ft/min) = GS(kt) x tan(gamma), converting nm/hr to ft/min by
// x 6076.12 ft/nm / 60 min = x 101.269. Feet-per-nm = 6076.12 x tan(gamma) (TERPS: 318 ft/nm at 3.00 deg).
// dims: in { ground_speed_kt: L T^-1, glidepath_angle_deg: dimensionless } out: { rod_fpm: L T^-1, ft_per_nm: dimensionless }
export function computeGlidepathDescentRate({ ground_speed_kt = 0, glidepath_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const gs = Number(ground_speed_kt) || 0;
  const ang = Number(glidepath_angle_deg) || 0;
  if (!(gs > 0)) return { error: "Ground speed must be positive (kt)." };
  if (!(ang > 0 && ang < 90)) return { error: "Glidepath angle must be over 0 and under 90 degrees." };
  const rad = Math.PI / 180;
  const tan = Math.tan(ang * rad);
  const rod_fpm = gs * 101.269 * tan;
  const ft_per_nm = 6076.12 * tan;
  if (![rod_fpm, ft_per_nm].every(Number.isFinite)) return { error: "Glidepath descent-rate math is not a finite value." };
  return {
    rod_fpm, ft_per_nm, tan,
    note: "Required rate of descent to hold a glidepath: ground speed is the horizontal velocity, and the glidepath angle sets the vertical drop per horizontal foot (tan of the angle), so ROD = ground speed x 101.27 x tan(angle) feet per minute (the 101.27 converts knots, which are nautical miles per hour, to feet per minute). The path steepness itself is 6076.12 x tan(angle) feet per nautical mile -- 318 ft/nm at a standard 3.00 degree ILS, the exact FAA TERPS figure that fixes the tangent (not sine) form. Because the descent rate scales with GROUND speed, a tailwind or a faster true airspeed demands a higher rate of descent to stay on the same path, and the handy 'ground speed x 5' rule (about 600 fpm at 120 kt on a 3-degree path) is this relation rounded. A planning aid, not a clearance; the approach chart, the flight director, and the pilot in command govern.",
  };
}
export const glidepathDescentRateExample = { inputs: { ground_speed_kt: 120, glidepath_angle_deg: 3 } };

MECHANIC_RENDERERS["glidepath-descent-rate"] = _simpleRenderer({
  citation: "Citation: required rate of descent on a glidepath (FAA Instrument Flying Handbook; TERPS Order 8260.3): ROD(fpm) = ground_speed(kt) x 101.27 x tan(angle); path steepness = 6076.12 x tan(angle) ft/nm (318 ft/nm at 3.00 deg, the TERPS value fixing the tangent form). ROD scales with ground speed, so a tailwind demands a higher descent rate. A planning aid; the approach chart and the pilot in command govern.",
  example: glidepathDescentRateExample.inputs,
  fields: [
    { key: "ground_speed_kt", label: "Ground speed (kt)", kind: "number" },
    { key: "glidepath_angle_deg", label: "Glidepath angle (deg, 3.0 typical ILS)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "gprd-out-r", label: "Required rate of descent", value: (r) => fmt(r.rod_fpm, 0) + " ft/min" },
    { key: "g", id: "gprd-out-g", label: "Path steepness", value: (r) => fmt(r.ft_per_nm, 0) + " ft/nm" },
    { key: "n", id: "gprd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGlidepathDescentRate,
});

// ===================== spec-v795: coordinated-turn radius and rate =====================
// In a coordinated level turn, horizontal lift = centripetal force: L sin(phi) = m V^2 / R and
// L cos(phi) = m g, so tan(phi) = V^2/(g R) -> R = V^2/(g tan(phi)). With V in kt -> ft/s (x1.68781)
// and g = 32.174 ft/s^2, R = 0.08854 x V_kt^2 / tan(phi). Rate of turn = V/R (rad/s) in deg/s.
// dims: in { airspeed_kt: L T^-1, bank_angle_deg: dimensionless } out: { turn_radius_ft: L, rate_of_turn_deg_s: T^-1 }
export function computeTurnRadiusBank({ airspeed_kt = 0, bank_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const v = Number(airspeed_kt) || 0;
  const phi = Number(bank_angle_deg) || 0;
  if (!(v > 0)) return { error: "Airspeed must be positive (kt)." };
  if (!(phi > 0 && phi < 90)) return { error: "Bank angle must be over 0 and under 90 degrees." };
  const rad = Math.PI / 180;
  const tan = Math.tan(phi * rad);
  const v_fps = v * 1.68781;
  const turn_radius_ft = (v_fps * v_fps) / (32.174 * tan);
  const rate_of_turn_deg_s = (v_fps / turn_radius_ft) / rad;
  if (![turn_radius_ft, rate_of_turn_deg_s].every(Number.isFinite)) return { error: "Turn-radius math is not a finite value." };
  return {
    turn_radius_ft, rate_of_turn_deg_s, turn_diameter_ft: 2 * turn_radius_ft,
    note: "Coordinated level-turn geometry: banking tilts the lift so its horizontal component pulls the aircraft around the turn, and setting that equal to the centripetal force gives tan(bank) = V^2/(g x radius), so radius = V^2/(g x tan(bank)) and it depends ONLY on airspeed and bank, not weight or aircraft type. Speed enters squared -- doubling the speed quadruples the radius -- which is why a fast jet needs miles to turn and a trainer needs yards, and why holding a tight radius at speed demands a steep bank. The rate of turn (degrees per second) is the flip side: for a given bank, a slower aircraft turns a smaller circle faster, and a 'standard rate' turn is 3 deg/s (a 2-minute 360). The bank for a target rate rises with speed (the rule of thumb: bank ~ TAS/10 + 7 for standard rate). Level, coordinated flight assumed; a slip or climb changes it. A planning aid; the flight manual and the pilot in command govern.",
  };
}
export const turnRadiusBankExample = { inputs: { airspeed_kt: 120, bank_angle_deg: 30 } };

MECHANIC_RENDERERS["turn-radius-bank"] = _simpleRenderer({
  citation: "Citation: coordinated-turn radius (FAA Airplane Flying Handbook; classical flight dynamics): tan(bank) = V^2/(g x radius), so radius = V^2/(g x tan(bank)) = 0.08854 x V_kt^2 / tan(bank); rate of turn = V/radius. Depends only on airspeed and bank, not weight; speed enters squared. A standard-rate turn is 3 deg/s. Level coordinated flight assumed. A planning aid; the flight manual and the pilot in command govern.",
  example: turnRadiusBankExample.inputs,
  fields: [
    { key: "airspeed_kt", label: "True airspeed (kt)", kind: "number" },
    { key: "bank_angle_deg", label: "Bank angle (deg)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "trb-out-r", label: "Turn radius", value: (r) => fmt(r.turn_radius_ft, 0) + " ft (" + fmt(r.turn_radius_ft / 6076.12, 2) + " nm)" },
    { key: "d", id: "trb-out-d", label: "Turn diameter", value: (r) => fmt(r.turn_diameter_ft, 0) + " ft" },
    { key: "t", id: "trb-out-t", label: "Rate of turn", value: (r) => fmt(r.rate_of_turn_deg_s, 2) + " deg/s" + (r.rate_of_turn_deg_s >= 3 ? " (>= standard rate)" : " (below standard rate)") },
    { key: "n", id: "trb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurnRadiusBank,
});

// ===================== spec-v796: climb gradient to required rate of climb =====================
// A departure gradient is feet of climb per nautical mile of ground track. Ground speed (kt = nm/hr)
// times the gradient (ft/nm) is ft/hr; / 60 is the rate of climb in ft/min. The gradient as a percent
// is ft_per_nm / 6076.12 x 100, and its angle is atan(ft_per_nm / 6076.12).
// dims: in { climb_gradient_ft_per_nm: dimensionless, ground_speed_kt: L T^-1 } out: { roc_fpm: L T^-1, gradient_percent: dimensionless, gradient_deg: dimensionless }
export function computeClimbGradientRoc({ climb_gradient_ft_per_nm = 0, ground_speed_kt = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const grad = Number(climb_gradient_ft_per_nm) || 0;
  const gs = Number(ground_speed_kt) || 0;
  if (!(grad > 0)) return { error: "Climb gradient must be positive (ft/nm)." };
  if (!(gs > 0)) return { error: "Ground speed must be positive (kt)." };
  const roc_fpm = grad * gs / 60;
  const gradient_percent = grad / 6076.12 * 100;
  const gradient_deg = Math.atan(grad / 6076.12) * 180 / Math.PI;
  if (![roc_fpm, gradient_percent, gradient_deg].every(Number.isFinite)) return { error: "Climb-gradient math is not a finite value." };
  return {
    roc_fpm, gradient_percent, gradient_deg,
    note: "Required rate of climb for a departure gradient: an obstacle departure procedure states the climb as a GRADIENT in feet per nautical mile (the obstacle-clearance surface's slope), but the cockpit vertical speed indicator reads in feet per MINUTE, so the two must be reconciled through the ground speed. Ground speed is nautical miles per hour, so ground speed x gradient is feet per hour, and dividing by 60 gives the feet-per-minute the VSI must show. The key trap: because it scales with GROUND speed, flying faster (or a tailwind) demands a HIGHER rate of climb to hold the same gradient, and a heavy, high-density-altitude departure that limits rate of climb may not make a steep required gradient at all -- the go/no-go a takeoff analysis turns on. The gradient as a percent is ft/nm over 6076.12; the default 200 ft/nm standard is about 3.3%. A planning aid, not a clearance; the departure procedure and the aircraft performance charts govern.",
  };
}
export const climbGradientRocExample = { inputs: { climb_gradient_ft_per_nm: 300, ground_speed_kt: 120 } };

MECHANIC_RENDERERS["climb-gradient-roc"] = _simpleRenderer({
  citation: "Citation: climb gradient to rate of climb (FAA TERPS / AIM departure procedures): ROC(fpm) = climb_gradient(ft/nm) x ground_speed(kt) / 60; gradient percent = ft_per_nm / 6076.12 x 100. The gradient is fixed (obstacle clearance) but the required rate of climb scales with ground speed, so a tailwind or a faster climb speed demands more fpm. The 200 ft/nm default is ~3.3%. A planning aid; the departure procedure and the performance charts govern.",
  example: climbGradientRocExample.inputs,
  fields: [
    { key: "climb_gradient_ft_per_nm", label: "Climb gradient (ft/nm, 200 default)", kind: "number" },
    { key: "ground_speed_kt", label: "Ground speed (kt)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "cgr-out-r", label: "Required rate of climb", value: (r) => fmt(r.roc_fpm, 0) + " ft/min" },
    { key: "p", id: "cgr-out-p", label: "Gradient", value: (r) => fmt(r.gradient_percent, 2) + "% (" + fmt(r.gradient_deg, 2) + " deg)" },
    { key: "n", id: "cgr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeClimbGradientRoc,
});

// =====================================================================
// spec-v808 tire-contact-patch - contact-patch area from load and pressure.
// A = W / p (an ideal-membrane first-order estimate).
// =====================================================================
// dims: in { corner_load_lb: M L T^-2, inflation_pressure_psi: M L^-1 T^-2 } out: { contact_area_in2: L^2, contact_area_cm2: L^2 }
export function computeTireContactPatch({ corner_load_lb = 0, inflation_pressure_psi = 0 } = {}) {
  const W = Number(corner_load_lb) || 0;
  const p = Number(inflation_pressure_psi) || 0;
  if (!(W > 0 && Number.isFinite(W))) return { error: "Corner load must be positive (lb)." };
  if (!(p > 0 && Number.isFinite(p))) return { error: "Inflation pressure must be positive (psi)." };
  const contact_area_in2 = W / p;
  const contact_area_cm2 = contact_area_in2 * 6.4516;
  if (![contact_area_in2, contact_area_cm2].every(Number.isFinite)) return { error: "Contact-patch math is not a finite value." };
  return {
    contact_area_in2, contact_area_cm2,
    note: "First-order tire contact-patch area: A = W / p, the corner load divided by the inflation pressure. It falls out of treating the tire as an ideal air-pressure membrane -- the patch carries the load at the inflation pressure, so W = p x A. The useful corollary: the average ground pressure under the tire roughly EQUALS the inflation pressure, independent of load, which is why airing down is the lever for flotation and for limiting soil compaction. A 900 lb corner at 35 psi rides on about 25.7 in^2; drop to 15 psi and the patch grows to 60 in^2 (2.3x) at the same load, spreading the weight and floating over soft ground. This is an idealization: the tire's sidewall and tread stiffness carry a little of the load, so the real patch runs a bit smaller than W/p (more so at high pressure and on stiff sidewalls), and the shape is set by the tire and rim. A field estimate, not a measured footprint; the tire, load, and surface govern.",
  };
}
export const tireContactPatchExample = { inputs: { corner_load_lb: 900, inflation_pressure_psi: 35 } };
MECHANIC_RENDERERS["tire-contact-patch"] = _simpleRenderer({
  citation: "Citation: first-order tire contact-patch area A = W / p (corner load / inflation pressure), the ideal-membrane relation where average ground pressure ~ inflation pressure. A field estimate; sidewall/tread stiffness make the real patch a bit smaller. The tire, load, and surface govern.",
  example: tireContactPatchExample.inputs,
  fields: [
    { key: "corner_load_lb", label: "Corner load W (lb)", kind: "number" },
    { key: "inflation_pressure_psi", label: "Inflation pressure p (psi)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "tcp-out-a", label: "Contact patch area", value: (r) => fmt(r.contact_area_in2, 1) + " in^2 (" + fmt(r.contact_area_cm2, 0) + " cm^2)" },
    { key: "n", id: "tcp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTireContactPatch,
});

// ===================== spec-v928: dynamic compression ratio =====================
// dims: in { bore_in: L, stroke_in: L, rod_length_in: L, static_cr: dimensionless, ivc_abdc_deg: dimensionless } out: { dynamic_cr: dimensionless, clearance_volume_in3: L^3, effective_volume_in3: L^3 }
export function computeDynamicCompressionRatio({ bore_in = 4.030, stroke_in = 3.75, rod_length_in = 6.0, static_cr = 10.5, ivc_abdc_deg = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bore_in > 0)) return { error: "Bore must be positive (in)." };
  if (!(stroke_in > 0)) return { error: "Stroke must be positive (in)." };
  if (!(rod_length_in > stroke_in / 2)) return { error: "Rod length must exceed the crank radius (stroke / 2)." };
  if (!(static_cr > 1)) return { error: "Static compression ratio must be greater than 1." };
  if (!(ivc_abdc_deg > 0 && ivc_abdc_deg < 180)) return { error: "Intake valve closing must be between 0 and 180 degrees after BDC." };
  const r = stroke_in / 2;
  const bore_area = Math.PI / 4 * bore_in * bore_in;
  const full_displacement = bore_area * stroke_in;
  const clearance_volume_in3 = full_displacement / (static_cr - 1);
  // Piston position below TDC at the intake-valve-closing crank angle (measured from TDC).
  const theta = (180 - ivc_abdc_deg) * Math.PI / 180;
  const piston_from_tdc = r + rod_length_in - (r * Math.cos(theta) + Math.sqrt(rod_length_in * rod_length_in - r * r * Math.sin(theta) * Math.sin(theta)));
  const effective_volume_in3 = bore_area * piston_from_tdc;
  const dynamic_cr = (effective_volume_in3 + clearance_volume_in3) / clearance_volume_in3;
  if (![dynamic_cr, clearance_volume_in3, effective_volume_in3].every(Number.isFinite)) return { error: "Dynamic-CR math is not a finite value." };
  return {
    dynamic_cr,
    clearance_volume_in3,
    effective_volume_in3,
    note: "Dynamic (effective) compression ratio measures compression only from where the intake valve actually CLOSES, not from BDC, so it reflects what the cam does to cylinder pressure. From the clearance volume (set by the static CR) and the piston position at intake-valve-closing (slider-crank geometry off the rod length and stroke), DCR = (swept-from-IVC + clearance) / clearance. A big cam closes the intake late (a high ABDC number), bleeding off cylinder charge and dropping the DCR -- which is why a high-static-CR engine with a large cam can still run on pump gas, and a mild cam on the same short block can detonate. Roughly 7.5 to 8.5 DCR suits 91-93 octane pump gas at sea level; altitude and iron vs aluminum heads shift it. An estimate off the geometry; the cam's actual seat-timing at the checking lash, the octane, and the tune govern.",
  };
}

export const dynamicCompressionRatioExample = { inputs: { bore_in: 4.030, stroke_in: 3.75, rod_length_in: 6.0, static_cr: 10.5, ivc_abdc_deg: 60 } };

MECHANIC_RENDERERS["dynamic-compression-ratio"] = _simpleRenderer({
  citation: "Citation: dynamic compression ratio by name (slider-crank geometry from intake-valve-closing). clearance volume from the static CR; piston position at IVC from the rod/stroke; DCR = (swept-from-IVC + clearance) / clearance. ~7.5-8.5 suits pump gas at sea level; the cam seat-timing, octane, and tune govern.",
  example: dynamicCompressionRatioExample.inputs,
  fields: [
    { key: "bore_in", label: "Bore (in)", kind: "number" },
    { key: "stroke_in", label: "Stroke (in)", kind: "number" },
    { key: "rod_length_in", label: "Rod length (in, center-to-center)", kind: "number" },
    { key: "static_cr", label: "Static compression ratio", kind: "number" },
    { key: "ivc_abdc_deg", label: "Intake valve closing (deg ABDC, at checking lash)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "dcr-out-d", label: "Dynamic compression ratio", value: (r) => fmt(r.dynamic_cr, 2) + " : 1" },
    { key: "c", id: "dcr-out-c", label: "Clearance / effective volume", value: (r) => fmt(r.clearance_volume_in3, 3) + " in3 / " + fmt(r.effective_volume_in3, 2) + " in3" },
    { key: "n", id: "dcr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDynamicCompressionRatio,
});

// ===================== spec-v959: driveline U-joint operating angle and cancellation =====================
// dims: in { args: dimensionless } out: { first_joint_variation_pct: dimensionless, second_joint_variation_pct: dimensionless, angle_difference_deg: dimensionless }
export function computeUjointOperatingAngle({ input_angle_deg = 10, output_angle_deg = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(input_angle_deg >= 0 && input_angle_deg < 90)) return { error: "Input (first) U-joint operating angle must be between 0 and 90 degrees." };
  if (!(output_angle_deg >= 0 && output_angle_deg < 90)) return { error: "Output (second) U-joint operating angle must be between 0 and 90 degrees." };
  // A single Cardan (Hooke) joint at angle b makes the output speed swing between cos(b) and 1/cos(b) of the input,
  // twice per revolution; peak-to-peak variation as a fraction of input speed = 1/cos(b) - cos(b) = sin^2(b)/cos(b).
  const varPct = (deg) => { const b = deg * Math.PI / 180; return 100 * (1 / Math.cos(b) - Math.cos(b)); };
  const first_joint_variation_pct = varPct(input_angle_deg);
  const second_joint_variation_pct = varPct(output_angle_deg);
  const angle_difference_deg = Math.abs(input_angle_deg - output_angle_deg);
  const cancelled = angle_difference_deg <= 1.0;
  if (![first_joint_variation_pct, second_joint_variation_pct].every(Number.isFinite)) return { error: "U-joint angle math is not a finite value." };
  return {
    first_joint_variation_pct,
    second_joint_variation_pct,
    angle_difference_deg,
    cancelled,
    verdict: cancelled ? "cancelled -- the two working angles are equal within 1 degree (phase the yokes in the same plane)" : "UNCANCELLED -- equalize the two working angles; the mismatch drives a 2/rev speed fluctuation and vibration",
    note: "How a Cardan (Hooke) universal joint's operating angle drives a speed fluctuation, and the two-joint rule that cancels it. A single U-joint at a working angle b does NOT pass motion uniformly: the output speed swings between cos(b) and 1/cos(b) of the input speed TWICE per revolution, a peak-to-peak variation of 1/cos(b) - cos(b) = sin^2(b)/cos(b). At a 10 degree angle that is 3.1%, at 3 degrees only 0.3%, but at 15 degrees it climbs to 6.9% -- and the fluctuating acceleration, not just the speed, is what beats the driveline. A standard two-joint driveshaft CANCELS the fluctuation only when BOTH working angles are equal AND the two yokes are phased in the same plane (in-phase): the second joint's fluctuation exactly offsets the first's. So the design targets are (1) keep each working angle small -- a common rule of thumb is under about 3 degrees at highway rpm, less as rpm rises -- and (2) make the two angles equal (within ~1 degree) with the slip yoke phased correctly. This tile gives the per-joint variation and the equal-angle cancellation check; the exact maximum working angle for a given driveshaft rpm comes from the U-joint / driveshaft manufacturer's chart (Spicer/Dana, GMB), and the vehicle service manual and the measured pinion, transmission, and shaft inclinations govern the setup.",
  };
}

export const ujointOperatingAngleExample = { inputs: { input_angle_deg: 10, output_angle_deg: 10 } };

function _v959renderUjointOperatingAngle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cardan (Hooke) U-joint kinematics and the two-joint cancellation rule, by name. A single joint at angle b swings the output speed between cos(b) and 1/cos(b) of input (peak-to-peak = 1/cos(b) - cos(b)) twice per rev; a two-joint shaft cancels it only when both working angles are equal and the yokes are phased. Keep angles small; the manufacturer's rpm-vs-angle chart and the service manual govern.";
  const ia = makeNumber("Input (first) U-joint angle (deg)", "uja-ia", { step: "any", min: "0" });
  const oa = makeNumber("Output (second) U-joint angle (deg)", "uja-oa", { step: "any", min: "0" });
  for (const f of [ia, oa]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ia.input.value = "10"; oa.input.value = "10"; update(); });
  const oV = makeOutputLine(outputRegion, "Cancellation verdict", "uja-out-v");
  const oF = makeOutputLine(outputRegion, "Per-joint speed variation", "uja-out-f");
  const update = debounce(() => {
    const r = computeUjointOperatingAngle({
      input_angle_deg: ia.input.value === "" ? 10 : Number(ia.input.value), output_angle_deg: oa.input.value === "" ? 10 : Number(oa.input.value),
    });
    if (r.error) { oV.textContent = r.error; oF.textContent = "-"; return; }
    oV.textContent = r.verdict + " (delta " + fmt(r.angle_difference_deg, 1) + " deg)";
    oF.textContent = "first " + fmt(r.first_joint_variation_pct, 2) + "%, second " + fmt(r.second_joint_variation_pct, 2) + "% peak-to-peak";
  }, DEBOUNCE_MS);
  for (const f of [ia, oa]) f.input.addEventListener("input", update);
}
MECHANIC_RENDERERS["ujoint-operating-angle"] = _v959renderUjointOperatingAngle;

// ===================== spec-v967: hull displacement and block coefficient =====================
// dims: in { args: dimensionless } out: { displacement_ft3: dimensionless, displacement_lb: dimensionless, displacement_long_tons: dimensionless }
export function computeHullDisplacement({ lwl_ft = 30, bwl_ft = 10, draft_ft = 4, block_coefficient = 0.5, water_density_pcf = 64 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lwl_ft > 0)) return { error: "Waterline length must be positive (ft)." };
  if (!(bwl_ft > 0)) return { error: "Waterline beam must be positive (ft)." };
  if (!(draft_ft > 0)) return { error: "Draft must be positive (ft)." };
  if (!(block_coefficient > 0 && block_coefficient <= 1)) return { error: "Block coefficient must be between 0 and 1." };
  if (!(water_density_pcf > 0)) return { error: "Water density must be positive (pcf)." };
  // Archimedes: the boat weighs what it displaces. Displaced volume = the L x B x T box x the block coefficient.
  const displacement_ft3 = lwl_ft * bwl_ft * draft_ft * block_coefficient;
  const displacement_lb = displacement_ft3 * water_density_pcf;
  const displacement_long_tons = displacement_lb / 2240;
  if (![displacement_ft3, displacement_lb, displacement_long_tons].every(Number.isFinite)) return { error: "Hull-displacement math is not a finite value." };
  return {
    displacement_ft3,
    displacement_lb,
    displacement_long_tons,
    note: "A boat's displacement -- what it weighs, because by Archimedes it floats on the weight of water it pushes aside. The immersed volume is the waterline length x waterline beam x draft box, filled only partway by the actual underwater shape: that fill fraction is the block coefficient Cb (roughly 0.35-0.45 for a fine planing or semi-displacement hull, 0.40-0.60 for a full displacement/work hull). Displacement volume = LWL x BWL x draft x Cb; weight = volume x water density (64.0 lb/ft^3 seawater, 62.4 fresh); long tons = weight / 2,240. A 30 ft waterline, 10 ft beam, 4 ft draft hull at Cb 0.5 in seawater displaces 600 ft^3 = 38,400 lb = 17.1 long tons. Fresh water is less dense, so the same hull floats a touch deeper to displace the same weight. This is a first-order estimate from block dimensions; the real value comes from a lines drawing integrated by Simpson's rule (or a builder's displacement/immersion table), and the loaded trim, appendages, and the actual hull form shift it. A screening estimate for sizing ground tackle, a trailer, or a lift; the naval architect's hydrostatics govern.",
  };
}

export const hullDisplacementExample = { inputs: { lwl_ft: 30, bwl_ft: 10, draft_ft: 4, block_coefficient: 0.5, water_density_pcf: 64 } };

MECHANIC_RENDERERS["hull-displacement"] = _simpleRenderer({
  citation: "Citation: hull displacement by Archimedes and the block coefficient, by name. Displacement volume = LWL x BWL x draft x Cb; weight = volume x water density (64.0 lb/ft^3 seawater, 62.4 fresh); long tons = weight/2240. Cb ~0.35-0.60 by hull form. A first-order block estimate; the lines drawing (Simpson's rule) and loaded trim govern, and the naval architect's hydrostatics rule.",
  example: hullDisplacementExample.inputs,
  fields: [
    { key: "lwl_ft", label: "Waterline length LWL (ft)", kind: "number" },
    { key: "bwl_ft", label: "Waterline beam BWL (ft)", kind: "number" },
    { key: "draft_ft", label: "Draft (ft)", kind: "number" },
    { key: "block_coefficient", label: "Block coefficient Cb (~0.35-0.60)", kind: "number" },
    { key: "water_density_pcf", label: "Water density (pcf: 64 sea, 62.4 fresh)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "hdp-out-v", label: "Displacement volume", value: (r) => fmt(r.displacement_ft3, 1) + " ft^3" },
    { key: "w", id: "hdp-out-w", label: "Displacement (weight)", value: (r) => fmt(r.displacement_lb, 0) + " lb" },
    { key: "t", id: "hdp-out-t", label: "Displacement (long tons)", value: (r) => fmt(r.displacement_long_tons, 2) + " long tons" },
    { key: "n", id: "hdp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHullDisplacement,
});

// ===================== spec-v998: sailboat performance ratios (SA/D and DLR) =====================
// dims: in { args: dimensionless } out: { sa_d_ratio: dimensionless, dl_ratio: dimensionless }
export function computeSailboatPerformanceRatios({ sail_area_sqft = 500, displacement_lb = 10000, lwl_ft = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(sail_area_sqft > 0)) return { error: "Sail area must be positive (sq ft)." };
  if (!(displacement_lb > 0)) return { error: "Displacement must be positive (lb)." };
  if (!(lwl_ft > 0)) return { error: "Waterline length must be positive (ft)." };
  // SA/D uses the displaced volume (disp/64 ft^3 seawater); DLR uses displacement in long tons and LWL.
  const displaced_volume_ft3 = displacement_lb / 64;
  const sa_d_ratio = sail_area_sqft / Math.pow(displaced_volume_ft3, 2 / 3);
  const dl_ratio = (displacement_lb / 2240) / Math.pow(0.01 * lwl_ft, 3);
  if (![sa_d_ratio, dl_ratio].every(Number.isFinite)) return { error: "Sailboat-ratio math is not a finite value." };
  const sa_d_class = sa_d_ratio < 16 ? "heavy cruiser (under-canvassed)" : sa_d_ratio <= 20 ? "moderate cruiser" : "performance / racer";
  const dl_class = dl_ratio < 100 ? "ultralight" : dl_ratio <= 200 ? "light" : dl_ratio <= 300 ? "moderate" : "heavy displacement";
  return {
    sa_d_ratio,
    dl_ratio,
    sa_d_class,
    dl_class,
    note: "Two dimensionless ratios that characterize a sailboat's power and heft, the numbers a surveyor, designer, or shopper reads off the specs. The SAIL AREA-TO-DISPLACEMENT ratio (SA/D) is the sail area divided by the displaced volume to the two-thirds power, where the volume is the displacement in pounds divided by 64 (the weight of a cubic foot of seawater): it measures how much sail the boat carries for its size, its 'horsepower to weight.' Under about 16 is a heavy, under-canvassed cruiser, 16 to 20 is a moderate cruiser, and over 20 is a performance boat or racer. The DISPLACEMENT-TO-LENGTH ratio (DLR) is the displacement in long tons (2,240 lb) divided by one one-hundredth of the waterline length, cubed: it measures how heavy the boat is for its length. Under 100 is ultralight, 100 to 200 light, 200 to 300 moderate, and over 300 a heavy full-keel cruiser. A 500 sq ft, 10,000 lb, 30 ft-waterline boat has an SA/D of 500 / (10,000/64)^(2/3) = 17.2 (moderate cruiser) and a DLR of (10,000/2,240) / 0.30^3 = 165 (light). A bigger rig or lighter hull raises SA/D; a heavier boat on a shorter waterline raises DLR. Comparative screens, not a performance prediction; the actual displacement (loaded vs design), the measured sail area and waterline, and a naval architect's velocity-prediction analysis govern real performance.",
  };
}

export const sailboatPerformanceRatiosExample = { inputs: { sail_area_sqft: 500, displacement_lb: 10000, lwl_ft: 30 } };

MECHANIC_RENDERERS["sailboat-performance-ratios"] = _simpleRenderer({
  citation: "Citation: sailboat performance ratios (sail area-to-displacement and displacement-to-length), by name. SA/D = sail area / (displacement/64)^(2/3); DLR = (displacement/2240) / (0.01 x LWL)^3. SA/D: <16 heavy, 16-20 moderate, >20 performance; DLR: <100 ultralight, 100-200 light, 200-300 moderate, >300 heavy. Comparative screens; the loaded displacement, measured sail/waterline, and a VPP analysis govern real performance.",
  example: sailboatPerformanceRatiosExample.inputs,
  fields: [
    { key: "sail_area_sqft", label: "Sail area (sq ft)", kind: "number" },
    { key: "displacement_lb", label: "Displacement (lb)", kind: "number" },
    { key: "lwl_ft", label: "Waterline length LWL (ft)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "spr-out-s", label: "Sail area / displacement", value: (r) => fmt(r.sa_d_ratio, 1) + " (" + r.sa_d_class + ")" },
    { key: "d", id: "spr-out-d", label: "Displacement / length", value: (r) => fmt(r.dl_ratio, 0) + " (" + r.dl_class + ")" },
    { key: "n", id: "spr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSailboatPerformanceRatios,
});

// ===================== spec-v1007: flywheel stored kinetic energy and speed fluctuation =====================
// dims: in { args: dimensionless } out: { kinetic_energy_ftlb: dimensionless, speed_fluctuation_pct: dimensionless }
export function computeFlywheelEnergy({ weight_lb = 100, radius_of_gyration_ft = 1, rpm = 1000, energy_fluctuation_ftlb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(weight_lb > 0)) return { error: "Flywheel weight must be positive (lb)." };
  if (!(radius_of_gyration_ft > 0)) return { error: "Radius of gyration must be positive (ft)." };
  if (!(rpm > 0)) return { error: "Speed must be positive (rpm)." };
  if (!(energy_fluctuation_ftlb >= 0)) return { error: "Energy fluctuation cannot be negative (ft-lb)." };
  // I = (W/g) k^2 (slug-ft^2); omega = rpm * pi/30; KE = 1/2 I omega^2. Coefficient of fluctuation Cs = dE/(I omega^2).
  const I = (weight_lb / 32.174) * radius_of_gyration_ft * radius_of_gyration_ft;
  const omega = rpm * Math.PI / 30;
  const kinetic_energy_ftlb = 0.5 * I * omega * omega;
  const speed_fluctuation_pct = energy_fluctuation_ftlb > 0 ? energy_fluctuation_ftlb / (I * omega * omega) * 100 : null;
  if (!Number.isFinite(kinetic_energy_ftlb)) return { error: "Flywheel-energy math is not a finite value." };
  return {
    kinetic_energy_ftlb,
    speed_fluctuation_pct,
    note: "The rotational kinetic energy stored in a spinning flywheel, and how much its speed swings when a machine pulls energy out of it -- the number a millwright or machine builder uses to size a flywheel for a punch press, shear, engine, or any machine with a pulsing load. The stored energy is one-half times the mass moment of inertia times the angular velocity squared. In US units the moment of inertia I is the weight divided by gravity (32.174 ft/s^2) times the radius of gyration squared, where the radius of gyration k captures the mass distribution: for a solid disk k = radius / sqrt(2), for a thin rim k is nearly the rim radius (rim flywheels store far more energy for their weight, which is why real flywheels put the mass at the outside). The angular velocity is the rpm times pi over 30. A 100 lb flywheel with a 1 ft radius of gyration at 1,000 rpm stores 0.5 x (100/32.174) x (1,000 x pi/30)^2 = about 17,000 ft-lb of energy. When the machine draws an energy pulse out during a stroke, the flywheel slows: the coefficient of fluctuation -- the fractional speed swing -- is that energy fluctuation divided by (I times omega squared), or the pulse divided by twice the stored energy, so a 2,000 ft-lb draw on this flywheel swings the speed about 5.9%. Machines are designed to a target coefficient of fluctuation (roughly 0.002 for AC generators up to 0.2 for punches and shears), and the flywheel is sized up until the swing is small enough. A sizing aid; the actual inertia from the flywheel's geometry, the load's real energy profile, and the drive and prime mover govern the design.",
  };
}

export const flywheelEnergyExample = { inputs: { weight_lb: 100, radius_of_gyration_ft: 1, rpm: 1000, energy_fluctuation_ftlb: 2000 } };

MECHANIC_RENDERERS["flywheel-energy"] = _simpleRenderer({
  citation: "Citation: flywheel stored kinetic energy and speed fluctuation, by name. I = (W/g) k^2; omega = rpm x pi/30; KE = 1/2 I omega^2; coefficient of fluctuation Cs = energy pulse / (I omega^2) = pulse / (2 KE). Radius of gyration k: disk = radius/sqrt(2), rim ~ radius. Target Cs ~0.002 (generators) to 0.2 (punches/shears). The actual inertia, the load's energy profile, and the drive govern.",
  example: flywheelEnergyExample.inputs,
  fields: [
    { key: "weight_lb", label: "Flywheel weight (lb)", kind: "number" },
    { key: "radius_of_gyration_ft", label: "Radius of gyration k (ft): disk r/1.414, rim ~r", kind: "number" },
    { key: "rpm", label: "Speed (rpm)", kind: "number" },
    { key: "energy_fluctuation_ftlb", label: "Energy pulse per cycle (ft-lb, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "e", id: "fly-out-e", label: "Stored kinetic energy", value: (r) => fmt(r.kinetic_energy_ftlb, 0) + " ft-lb" },
    { key: "s", id: "fly-out-s", label: "Speed fluctuation", value: (r) => r.speed_fluctuation_pct === null ? "-" : fmt(r.speed_fluctuation_pct, 2) + " % swing" },
    { key: "n", id: "fly-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFlywheelEnergy,
});

// --- spec-v1037 K: Hydraulic line fluid velocity ---
// V (ft/s) = 231 in^3/gal / (60 s/min x 12 in/ft) x Q / A = 0.3208333 Q / A, with A = pi/4 d^2.
// The constant is DERIVED from the gallon and the unit conversions, not recalled. The recommended
// velocity bands are conventions and PUBLISHED SETS DISAGREE, so the ceiling is an editable input
// seeded by line type; both published sets are named in the citation.
const HYD_GPM_TO_FPS = 231 / (60 * 12); // 0.3208333... in^3/gal -> ft/s per gpm per in^2
const HYD_LINE_BANDS = {
  suction: { label: "Suction / inlet", min: 2, max: 4 },
  return: { label: "Return", min: 4, max: 13 },
  pressure: { label: "Pressure / discharge", min: 7, max: 18 },
};
// dims: in { flow_gpm: L^3 T^-1, inside_dia_in: L, line_type: dimensionless, max_velocity_override_fps: L T^-1 } out: { area_in2: L^2, velocity_fps: L T^-1, min_dia_in: L }
export function computeHydraulicLineVelocity({ flow_gpm = 0, inside_dia_in = 0, line_type = "pressure", max_velocity_override_fps = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(flow_gpm) || 0;
  const d = Number(inside_dia_in) || 0;
  const override = Number(max_velocity_override_fps) || 0;
  const band = HYD_LINE_BANDS[line_type];
  if (!band) return { error: "Line type must be suction, return, or pressure." };
  if (!(q > 0)) return { error: "Flow must be positive (gpm)." };
  if (!(d > 0)) return { error: "Line inside diameter must be positive (in) - the hose ID, not the dash size or the OD." };
  if (override < 0) return { error: "Velocity ceiling override cannot be negative (ft/s); use 0 to take the line-type default." };
  const max_fps = override > 0 ? override : band.max;
  const area_in2 = Math.PI / 4 * d * d;
  const velocity_fps = HYD_GPM_TO_FPS * q / area_in2;
  const over = velocity_fps > max_fps;
  const under = velocity_fps < band.min;
  const min_area_in2 = HYD_GPM_TO_FPS * q / max_fps;
  const min_dia_in = Math.sqrt(4 * min_area_in2 / Math.PI);
  const max_flow_gpm = max_fps * area_in2 / HYD_GPM_TO_FPS;
  if (![area_in2, velocity_fps, min_dia_in, max_flow_gpm].every(Number.isFinite)) return { error: "Hydraulic-velocity math did not produce a finite value." };
  return {
    band_label: band.label, band_min_fps: band.min, band_max_fps: max_fps,
    area_in2, velocity_fps, over, under, min_dia_in, max_flow_gpm,
    note: (over
      ? "OVER the ceiling for a " + band.label.toLowerCase() + " line: " + velocity_fps.toFixed(1) + " ft/s against " + max_fps + ". Step up to at least " + min_dia_in.toFixed(3) + " in ID. "
      : "Within the " + band.label.toLowerCase() + " range at " + velocity_fps.toFixed(1) + " ft/s. ")
      + (line_type === "suction"
        ? "A suction line is the one that punishes you: too fast and the pump cavitates, which sounds like gravel and destroys the pump, so the ceiling is far lower than on any pressure line and the run should be short, straight, and generously sized. "
        : "Excess velocity turns pressure into heat and noise rather than work, and every fitting multiplies the effect. ")
      + "PUBLISHED BANDS DISAGREE - one common set gives return 4-13 and pressure 7-18 ft/s while another gives return 10-15, medium pressure 15-20, and high pressure 20-25 - so the ceiling here is editable and the defaults are the more conservative set. Higher system pressures tolerate higher velocity; continuous-duty circuits should sit at the low end of whichever band you use. Enter the true hose ID, not the dash size or the OD. Velocity is one criterion: pressure drop, heat rejection, and hose pressure rating are separate, and the hose manufacturer's data governs.",
  };
}
export const hydraulicLineVelocityExample = { inputs: { flow_gpm: 20, inside_dia_in: 0.625, line_type: "pressure", max_velocity_override_fps: 0 } };
MECHANIC_RENDERERS["hydraulic-line-velocity"] = _simpleRenderer({
  citation: "Citation: fluid velocity V (ft/s) = 0.3208 x Q (gpm) / A (in^2), where the constant is 231 in^3 per gallon divided by 60 s/min and 12 in/ft - derived, not tabulated - with A = pi/4 x ID^2. The recommended velocity bands are industry conventions and published sets DISAGREE: one gives suction 2-4, return 4-13, pressure 7-18 ft/s; another gives suction 2-4, return 10-15, medium pressure 15-20, high pressure 20-25. The defaults here are the more conservative set and the ceiling is an editable input. Higher system pressures tolerate higher velocity; continuous duty belongs at the low end. Velocity is one criterion - pressure drop, heat rejection, and the hose pressure rating are separate, and the hose manufacturer's data governs.",
  example: hydraulicLineVelocityExample.inputs,
  fields: [
    { key: "flow_gpm", label: "Flow (gpm)", kind: "number" },
    { key: "inside_dia_in", label: "Line inside diameter (in, true ID)", kind: "number" },
    { key: "line_type", label: "Line type", kind: "select", options: [{ value: "pressure", label: "Pressure / discharge (7-18 ft/s)", selected: true }, { value: "return", label: "Return (4-13 ft/s)" }, { value: "suction", label: "Suction / inlet (2-4 ft/s)" }] },
    { key: "max_velocity_override_fps", label: "Velocity ceiling override (ft/s, 0 = default)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "hlv-out-v", label: "Velocity", value: (r) => fmt(r.velocity_fps, 2) + " ft/s (" + r.band_label + " band " + fmt(r.band_min_fps, 0) + "-" + fmt(r.band_max_fps, 0) + ")" },
    { key: "s", id: "hlv-out-s", label: "Verdict", value: (r) => (r.over ? "OVER the ceiling" : r.under ? "below the band - oversized, but not harmful" : "within the band") },
    { key: "d", id: "hlv-out-d", label: "Minimum ID at the ceiling", value: (r) => fmt(r.min_dia_in, 3) + " in" },
    { key: "q", id: "hlv-out-q", label: "Max flow through this line", value: (r) => fmt(r.max_flow_gpm, 1) + " gpm at the ceiling" },
    { key: "n", id: "hlv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicLineVelocity,
});

// --- spec-v1107 K: Injector static flow at a different rail pressure ---
// injector-size's own note says it "does not cover a return-versus-returnless fuel system, the rail
// pressure that sets the injector's static flow". An injector is an ORIFICE, so flow scales with
// sqrt of the pressure DIFFERENTIAL across it - no table, no fitted constant. The differential is
// where the two fuel systems part: a return system's regulator references manifold pressure and
// holds the differential constant, while a returnless system holds the RAIL constant, so boost eats
// the differential and the injector flows LESS exactly when the engine wants more.
// dims: in { rated_flow_ccmin: L^3 T^-1, rated_pressure_psi: M L^-1 T^-2, rail_pressure_psi: M L^-1 T^-2, manifold_pressure_psig: M L^-1 T^-2, system_type: dimensionless } out: { effective_dp_psi: M L^-1 T^-2, flow_ccmin: L^3 T^-1, flow_lbh: M T^-1 }
export function computeInjectorFlowAtPressure({ rated_flow_ccmin = 0, rated_pressure_psi = 43.5, rail_pressure_psi = 43.5, manifold_pressure_psig = 0, system_type = "returnless" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rated = Number(rated_flow_ccmin) || 0;
  const ratedP = Number(rated_pressure_psi) || 0;
  const rail = Number(rail_pressure_psi) || 0;
  const map = Number(manifold_pressure_psig);
  if (system_type !== "returnless" && system_type !== "return") return { error: "System type must be returnless or return." };
  if (!(rated > 0)) return { error: "Rated injector flow must be positive (cc/min)." };
  if (!(ratedP > 0)) return { error: "Rated test pressure must be positive (psi; 43.5 psi / 3 bar is the common rating point)." };
  if (!(rail > 0)) return { error: "Rail pressure must be positive (psi)." };
  if (!Number.isFinite(map)) return { error: "Manifold pressure must be a number (psig; positive is boost, negative is vacuum)." };
  const returnless = system_type === "returnless";
  const effective_dp_psi = returnless ? rail - map : rail;
  if (!(effective_dp_psi > 0)) return { error: "Boost has consumed the entire rail pressure - the differential across the injector is zero or negative and no fuel flows. Raise the rail pressure or use a manifold-referenced regulator." };
  const pressure_ratio = effective_dp_psi / ratedP;
  const flow_factor = Math.sqrt(pressure_ratio);
  const flow_ccmin = rated * flow_factor;
  const flow_lbh = flow_ccmin / 10.5;
  const rated_lbh = rated / 10.5;
  const pct_change = (flow_factor - 1) * 100;
  const loses_flow_under_boost = returnless && map > 0;
  if (![effective_dp_psi, flow_ccmin, flow_lbh].every(Number.isFinite)) return { error: "Injector-flow math did not produce a finite value." };
  return {
    effective_dp_psi, pressure_ratio, flow_factor, flow_ccmin, flow_lbh, rated_lbh, pct_change,
    loses_flow_under_boost, returnless,
    note: "An injector is an orifice, so flow follows the SQUARE ROOT of the pressure differential across it - which means pressure is a weak lever: it takes 4x the differential to double the flow, and no amount of fuel pressure rescues an injector that is simply too small. "
      + (returnless
        ? "RETURNLESS system: the rail is held at a fixed pressure, so the differential is rail minus manifold. " + (map > 0 ? "Under " + map + " psi of boost the differential drops to " + effective_dp_psi.toFixed(1) + " psi and this injector flows " + Math.abs(pct_change).toFixed(1) + "% LESS than its rating - the engine loses fuel exactly when it wants more, and it is the classic returnless-plus-boost failure. Raise the rail or fit a manifold-referenced regulator. " : "At " + map + " psig manifold the differential is " + effective_dp_psi.toFixed(1) + " psi. ")
        : "RETURN system with a manifold-referenced regulator: the regulator tracks manifold pressure and holds the differential CONSTANT, so boost does not change the static flow - which is the whole reason that plumbing exists. ")
      + "Static flow only: this is the injector's full-open capacity, not what it delivers at a given pulse width, and it says nothing about the dead time (latency) that shifts with voltage and pressure and that a tune must correct. Raising rail pressure also slows the injector's opening and can push a small injector out of its linear range at short pulse widths. Gasoline at about 0.72 specific gravity for the cc/min to lb/h conversion; ethanol blends are denser per unit energy and change the whole fuel budget. A tuning aid; the injector's own flow data and the tuner's measured fueling govern.",
  };
}
export const injectorFlowAtPressureExample = { inputs: { rated_flow_ccmin: 550, rated_pressure_psi: 43.5, rail_pressure_psi: 43.5, manifold_pressure_psig: 15, system_type: "returnless" } };
MECHANIC_RENDERERS["injector-flow-at-pressure"] = _simpleRenderer({
  citation: "Citation: orifice flow scales with the square root of the pressure differential, flow_new = flow_rated x sqrt(dP_new / dP_rated) - no table and no fitted constant. The differential depends on the fuel system: a RETURN system's manifold-referenced regulator holds the differential constant regardless of boost, while a RETURNLESS system holds the rail pressure constant so the differential is rail minus manifold pressure and boost reduces it. Static (full-open) flow only - not delivered flow at a pulse width, and not injector dead time, which shifts with voltage and pressure. Gasoline at about 0.72 specific gravity for the cc/min to lb/h conversion, matching the injector-size tile. A tuning aid; the injector's flow data and measured fueling govern.",
  example: injectorFlowAtPressureExample.inputs,
  fields: [
    { key: "rated_flow_ccmin", label: "Rated injector flow (cc/min)", kind: "number" },
    { key: "rated_pressure_psi", label: "Rated at pressure (psi; 43.5 = 3 bar)", kind: "number" },
    { key: "rail_pressure_psi", label: "Actual rail pressure (psi)", kind: "number" },
    { key: "manifold_pressure_psig", label: "Manifold pressure (psig; + boost, - vacuum)", kind: "number", default: 0 },
    { key: "system_type", label: "Fuel system", kind: "select", options: [{ value: "returnless", label: "Returnless (fixed rail pressure)", selected: true }, { value: "return", label: "Return (manifold-referenced regulator)" }] },
  ],
  outputs: [
    { key: "dp", id: "ifp-out-dp", label: "Differential across the injector", value: (r) => fmt(r.effective_dp_psi, 1) + " psi" },
    { key: "f", id: "ifp-out-f", label: "Static flow at this pressure", value: (r) => fmt(r.flow_ccmin, 1) + " cc/min (" + fmt(r.flow_lbh, 1) + " lb/h)" },
    { key: "c", id: "ifp-out-c", label: "Change from the rating", value: (r) => (r.pct_change >= 0 ? "+" : "") + fmt(r.pct_change, 1) + "% (factor " + fmt(r.flow_factor, 4) + ")" + (r.loses_flow_under_boost ? " - losing flow under boost" : "") },
    { key: "n", id: "ifp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInjectorFlowAtPressure,
});


// --- spec-v1118: V-Belt Force-Deflection Tensioning ---
// The field procedure for SETTING belt tension, which the three existing belt tiles all
// assume has already been done. Span is the external tangent between the two sheaves,
// pure geometry: t = sqrt(C^2 - ((D-d)/2)^2). Deflect the midspan 1/64 in per inch of
// span. The force that takes is proportional to the static tension: at midspan a force F
// is balanced by the two half-spans pulling back, F = 4 T d / t for a small deflection,
// and substituting d = t/64 collapses the span out entirely to F = T/16. So the measured
// deflection force times 16 IS the static tension per belt, which is why the 1/64 rule
// works on any drive without knowing its size.
// dims: in { center_distance_in: L, large_sheave_dia_in: L, small_sheave_dia_in: L, measured_force_lb: M L T^-2, rec_min_force_lb: M L T^-2, rec_max_force_lb: M L T^-2, belt_condition: dimensionless, new_belt_factor: dimensionless, belt_count: dimensionless } out: { span_in: L, deflection_in: L, static_tension_lb: M L T^-2, target_min_force_lb: M L T^-2, target_max_force_lb: M L T^-2, wrap_angle_deg: dimensionless, shaft_load_lb: M L T^-2 }
export function computeBeltDeflectionTension({ center_distance_in = 0, large_sheave_dia_in = 0, small_sheave_dia_in = 0, measured_force_lb = 0, rec_min_force_lb = 0, rec_max_force_lb = 0, belt_condition = "used", new_belt_factor = 1.3, belt_count = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const C = Number(center_distance_in) || 0;
  const D = Number(large_sheave_dia_in) || 0;
  const d = Number(small_sheave_dia_in) || 0;
  const F = Number(measured_force_lb) || 0;
  const fmin = Number(rec_min_force_lb) || 0;
  const fmax = Number(rec_max_force_lb) || 0;
  const kNew = Number(new_belt_factor) || 0;
  const n = Number(belt_count) || 0;
  if (C <= 0 || D <= 0 || d <= 0) return { error: "Center distance and both sheave diameters must be greater than zero." };
  if (d > D) return { error: "The small sheave diameter cannot exceed the large sheave diameter - swap the two entries." };
  if (!Number.isInteger(n) || n < 1) return { error: "Belt count must be a whole number of 1 or more." };
  if (F < 0) return { error: "Measured deflection force cannot be negative." };
  if (fmin <= 0 || fmax <= 0) return { error: "Enter the manufacturer's recommended minimum and maximum deflection force (both greater than zero)." };
  if (fmax < fmin) return { error: "The recommended maximum force cannot be below the recommended minimum." };
  if (kNew < 1 || kNew > 2) return { error: "New-belt factor must be between 1.0 and 2.0." };
  const halfDiff = (D - d) / 2;
  if (C <= halfDiff) return { error: "Center distance is too small for these sheaves - the belt has no straight span." };

  const span_in = Math.sqrt(C * C - halfDiff * halfDiff);
  const deflection_in = span_in / 64;
  const deflection_64ths = Math.round(span_in);
  const static_tension_lb = 16 * F;
  const isNew = belt_condition === "new";
  const factor = isNew ? kNew : 1;
  const target_min_force_lb = fmin * factor;
  const target_max_force_lb = fmax * factor;
  const under = F < target_min_force_lb;
  const over = F > target_max_force_lb;
  const status = under ? "UNDER-TENSIONED" : over ? "OVER-TENSIONED" : "IN RANGE";
  const pct_of_min = target_min_force_lb > 0 ? (F / target_min_force_lb) * 100 : null;

  // Wrap on the SMALL sheave (the limiting one) and the static side load the drive puts
  // into the shafts and bearings with no torque applied. Both belt strands pull toward the
  // other sheave, so the resultant is 2 T sin(theta/2) per belt.
  const wrap_rad = Math.PI - 2 * Math.asin(Math.min(1, halfDiff / C));
  const wrap_angle_deg = wrap_rad * 180 / Math.PI;
  const shaft_load_lb = 2 * static_tension_lb * n * Math.sin(wrap_rad / 2);
  const target_tension_min_lb = 16 * target_min_force_lb;
  const target_tension_max_lb = 16 * target_max_force_lb;

  const note = "Span " + span_in.toFixed(2) + " in, so deflect the midspan " + deflection_in.toFixed(3)
    + " in (about " + deflection_64ths + "/64 in) and read the force there. "
    + "At the 1/64-per-inch deflection the span cancels out of the statics and the force is exactly one sixteenth of the static tension, so " + F.toFixed(1) + " lb of force = " + static_tension_lb.toFixed(0) + " lb per belt. "
    + (isNew
      ? "NEW belt: the target range is the manufacturer's " + fmin.toFixed(1) + "-" + fmax.toFixed(1) + " lb multiplied by " + kNew + " (" + target_min_force_lb.toFixed(1) + "-" + target_max_force_lb.toFixed(1) + " lb), because an unseated belt sheds tension fast. Re-check and drop to the plain range after the first day or two of running. "
      : "RUN-IN belt: the target is the manufacturer's plain " + target_min_force_lb.toFixed(1) + "-" + target_max_force_lb.toFixed(1) + " lb range. ")
    + status + ". "
    + (under ? "Under-tension slips, and a slipping belt turns the lost power into heat that glazes the sidewalls - it fails from the friction, not the load. "
      : over ? "Over-tension buys no extra capacity: only the DIFFERENCE between the tight and slack sides transmits power. What it buys is roughly " + shaft_load_lb.toFixed(0) + " lb of static side load on the shafts, and bearing life falls off as the cube of the load. "
      : "Static side load into the shafts is about " + shaft_load_lb.toFixed(0) + " lb across " + n + " belt" + (n === 1 ? "" : "s") + " at " + wrap_angle_deg.toFixed(0) + " degrees of wrap on the small sheave. ")
    + "The recommended force range is manufacturer and belt-section specific - read it off the belt maker's own table for your section, small-sheave diameter, and speed; this tile does not supply it. Measure at the midpoint of the span with a tensiometer, take a reading on each belt of a multi-belt drive and average, and never tension a matched set by feel. Single-belt drives read against a straightedge across both sheave rims. A field aid; the drive manufacturer's instructions govern.";

  return { span_in, deflection_in, deflection_64ths, static_tension_lb, target_min_force_lb, target_max_force_lb, target_tension_min_lb, target_tension_max_lb, wrap_angle_deg, shaft_load_lb, pct_of_min, under, over, status, note };
}
export const beltDeflectionTensionExample = { inputs: { center_distance_in: 32, large_sheave_dia_in: 12, small_sheave_dia_in: 4, measured_force_lb: 5.5, rec_min_force_lb: 4.8, rec_max_force_lb: 7.2, belt_condition: "used", new_belt_factor: 1.3, belt_count: 2 } };
MECHANIC_RENDERERS["belt-deflection-tension"] = _simpleRenderer({
  citation: "Citation: force-deflection tensioning per the belt manufacturers' standard field procedure (Carlisle/Timken, Gates, TB Wood's, Bestorq all publish the same rule) - deflect the midspan 1/64 in for each 1 in of span and compare the force to the maker's recommended range. Span is the external tangent between the sheaves, t = sqrt(C^2 - ((D-d)/2)^2), pure geometry. The static tension follows from statics, not a table: a midspan force F against two half-spans gives F = 4 T x deflection / t, and at deflection = t/64 the span cancels to T = 16 F. The 1.3 multiplier for an unseated new belt is the commonly published run-in allowance and is editable here; the maker's own figure governs. The recommended force range itself is belt-section, sheave-diameter, and speed specific proprietary table data and is an INPUT, not built in. A field aid; the drive manufacturer's instructions govern.",
  example: beltDeflectionTensionExample.inputs,
  fields: [
    { key: "center_distance_in", label: "Center distance (in)", kind: "number" },
    { key: "large_sheave_dia_in", label: "Large sheave pitch diameter (in)", kind: "number" },
    { key: "small_sheave_dia_in", label: "Small sheave pitch diameter (in)", kind: "number" },
    { key: "measured_force_lb", label: "Measured deflection force (lb)", kind: "number" },
    { key: "rec_min_force_lb", label: "Maker's recommended min force (lb)", kind: "number" },
    { key: "rec_max_force_lb", label: "Maker's recommended max force (lb)", kind: "number" },
    { key: "belt_condition", label: "Belt condition", kind: "select", options: [{ value: "used", label: "Run-in (used) belt", selected: true }, { value: "new", label: "New belt (not yet seated)" }] },
    { key: "new_belt_factor", label: "New-belt factor", kind: "number" },
    { key: "belt_count", label: "Number of belts", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "bdt-out-s", label: "Belt span", value: (r) => fmt(r.span_in, 2) + " in" },
    { key: "d", id: "bdt-out-d", label: "Deflect the midspan", value: (r) => fmt(r.deflection_in, 3) + " in (about " + r.deflection_64ths + "/64 in)" },
    { key: "t", id: "bdt-out-t", label: "Static tension at the measured force", value: (r) => fmt(r.static_tension_lb, 0) + " lb per belt" },
    { key: "r", id: "bdt-out-r", label: "Target force range", value: (r) => fmt(r.target_min_force_lb, 1) + " - " + fmt(r.target_max_force_lb, 1) + " lb (" + fmt(r.target_tension_min_lb, 0) + " - " + fmt(r.target_tension_max_lb, 0) + " lb tension)" },
    { key: "v", id: "bdt-out-v", label: "Verdict", value: (r) => r.status + " (" + fmt(r.pct_of_min, 0) + "% of the target minimum)" },
    { key: "l", id: "bdt-out-l", label: "Static shaft side load", value: (r) => fmt(r.shaft_load_lb, 0) + " lb at " + fmt(r.wrap_angle_deg, 0) + " deg wrap" },
    { key: "n", id: "bdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBeltDeflectionTension,
});


// --- spec-v1125: gear tooth dynamic (Barth) bending stress ---
// gear-tooth-bending-stress ends by naming exactly what it leaves out: "the Barth velocity
// factor and the AGMA geometry (J) and load factors are not modeled, so it runs optimistic
// at speed." This adds the velocity factor, and starts a step earlier - from horsepower and
// rpm rather than from a tangential load the user has to work out first.
// The static stress is DELEGATED to the landed Lewis tile so the two cannot drift; this one
// only multiplies by Kv (and by the idler factor for reversed bending).
// Kv = (1200 + V)/1200 for cut or milled teeth, (600 + V)/600 for cast or crude teeth, with
// V the pitch-line velocity in feet per minute.
// dims: in { horsepower: M L^2 T^-3, rpm: T^-1, number_of_teeth: dimensionless, diametral_pitch_1_in: L^-1, face_width_in: L, tooth_system: dimensionless, y_diametral_override: dimensionless, tooth_cut: dimensionless, is_idler: dimensionless, sut_psi: M L^-1 T^-2 } out: { pitch_diameter_in: L, torque_inlb: M L^2 T^-2, wt_lb: M L T^-2, velocity_fpm: L T^-1, kv: dimensionless, static_stress_psi: M L^-1 T^-2, dynamic_stress_psi: M L^-1 T^-2, allowable_psi: M L^-1 T^-2, safety_factor: dimensionless }
export function computeGearDynamicToothStress({ horsepower = 0, rpm = 0, number_of_teeth = 0, diametral_pitch_1_in = 0, face_width_in = 0, tooth_system = "20-full-depth", y_diametral_override = 0, tooth_cut = "cut", is_idler = "no", sut_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hp = Number(horsepower) || 0, N = Number(rpm) || 0, T = Number(number_of_teeth) || 0;
  const Pd = Number(diametral_pitch_1_in) || 0, F = Number(face_width_in) || 0;
  const Yov = Number(y_diametral_override) || 0, Sut = Number(sut_psi) || 0;
  if (!(hp > 0)) return { error: "Horsepower must be positive." };
  if (!(N > 0)) return { error: "Speed must be positive (rpm)." };
  if (!(Pd > 0)) return { error: "Diametral pitch must be positive (teeth per inch)." };
  if (!(F > 0)) return { error: "Face width must be positive (in)." };
  if (!(T >= 6)) return { error: "Number of teeth must be at least 6 for the Lewis form factor." };
  if (Yov < 0) return { error: "Lewis Y override cannot be negative." };
  if (Sut < 0) return { error: "Ultimate tensile strength cannot be negative (psi)." };

  const pitch_diameter_in = T / Pd;
  // 63,025 is 12 x 33,000 / (2 pi): horsepower to inch-pounds of torque at a given rpm.
  const torque_inlb = 63025 * hp / N;
  const wt_lb = 2 * torque_inlb / pitch_diameter_in;
  const velocity_fpm = Math.PI * pitch_diameter_in * N / 12;

  const cast = tooth_cut === "cast";
  const kv_base = cast ? 600 : 1200;
  const kv = (kv_base + velocity_fpm) / kv_base;

  // Static Lewis stress from the landed tile, unless a Y is entered from a table or chart.
  let static_stress_psi, lewis_Y_diametral, undercut_flag = null, y_source;
  if (Yov > 0) {
    static_stress_psi = wt_lb * Pd / (F * Yov);
    lewis_Y_diametral = Yov;
    y_source = "entered";
  } else {
    const base = computeGearToothBendingStress({ transmitted_load_lb: wt_lb, diametral_pitch_1_in: Pd, face_width_in: F, number_of_teeth: T, tooth_system });
    if (base.error) return { error: base.error };
    static_stress_psi = base.bending_stress_psi;
    lewis_Y_diametral = base.lewis_Y_diametral;
    undercut_flag = base.undercut_flag;
    y_source = "Lewis y = a - b/T";
  }

  const idler = is_idler === "yes";
  const ki = idler ? 1.42 : 1;
  const dynamic_stress_psi = static_stress_psi * kv * ki;
  const dynamic_penalty_pct = (dynamic_stress_psi / static_stress_psi - 1) * 100;
  const allowable_psi = Sut > 0 ? Sut / 3 : null;
  const safety_factor = allowable_psi !== null ? allowable_psi / dynamic_stress_psi : null;

  const note = "A " + T + "-tooth gear at " + Pd + " diametral pitch is " + pitch_diameter_in.toFixed(3) + " in at the pitch circle, so " + hp + " HP at " + N + " rpm is " + torque_inlb.toFixed(1) + " in-lb of torque and " + wt_lb.toFixed(1) + " lb of tangential load, running at " + velocity_fpm.toFixed(0) + " ft/min at the pitch line. "
    + "The static Lewis stress is " + static_stress_psi.toFixed(0) + " psi (Y = " + lewis_Y_diametral.toFixed(4) + ", " + y_source + "). "
    + "Barth multiplies that by Kv = (" + kv_base + " + V)/" + kv_base + " = " + kv.toFixed(4) + " for " + (cast ? "CAST or crude teeth, which take the harsher 600 base because a rough profile hammers harder at every mesh" : "CUT or milled teeth") + ". "
    + (idler ? "This gear is an IDLER, so the 1.42 reversed-bending factor also applies: an idler is pushed one way by the driver and the other way by the driven gear, and its teeth see a fully reversed cycle rather than a released one. " : "")
    + "Dynamic stress " + dynamic_stress_psi.toFixed(0) + " psi, " + dynamic_penalty_pct.toFixed(0) + "% above the static value - which is the whole point: the static Lewis number is what the tooth would see if the mesh were quasi-static, and at " + velocity_fpm.toFixed(0) + " ft/min it is not. "
    + (allowable_psi !== null
      ? "Against an allowable of Sut/3 = " + allowable_psi.toFixed(0) + " psi the safety factor is " + safety_factor.toFixed(2) + (safety_factor >= 1 ? ". " : " - UNDER 1, the tooth is overstressed on this screen. ")
      : "Enter an ultimate tensile strength to get the Sut/3 allowable screen. ")
    + (undercut_flag ? undercut_flag + " " : "")
    + "Barth is an approximation and a conservative one - it is the ancestor of the AGMA dynamic factor Kv, which is tailored to a measured gear quality number and typically lands between 1 and 1.8. The Sut/3 allowable is a rough estimate for when no material allowable is available, not a rated endurance limit. Not modeled: the AGMA application, size, load-distribution, and rim-thickness factors, the geometry factor J that corrects Y for stress concentration, or any surface-durability (pitting) check, which often governs before bending does. A screen; AGMA 2001 and the gear maker govern.";

  return { pitch_diameter_in, torque_inlb, wt_lb, velocity_fpm, kv, kv_base, cast, static_stress_psi, lewis_Y_diametral, y_source, idler, ki, dynamic_stress_psi, dynamic_penalty_pct, allowable_psi, safety_factor, undercut_flag, note };
}

export const gearDynamicToothStressExample = { inputs: { horsepower: 4, rpm: 1000, number_of_teeth: 43, diametral_pitch_1_in: 8, face_width_in: 0.5, tooth_system: "20-full-depth", y_diametral_override: 0.4, tooth_cut: "cut", is_idler: "no", sut_psi: 0 } };

MECHANIC_RENDERERS["gear-dynamic-tooth-stress"] = _simpleRenderer({
  citation: "Citation: the Barth velocity factor applied to the Lewis bending stress - Kv = (1200 + V)/1200 for cut or milled teeth and (600 + V)/600 for cast or crude teeth, with V the pitch-line velocity in feet per minute, so sigma = (Wt Pd / (F Y)) x Kv. The static Lewis stress is delegated to the landed gear-tooth-bending-stress tile rather than reimplemented. Tangential load comes from horsepower and speed: torque = 63,025 HP / rpm in-lb, Wt = 2 T / D, V = pi D N / 12. The 1.42 idler factor accounts for fully reversed bending in a gear driven on one flank and driving on the other. The Sut/3 allowable is the rough estimate used when no material allowable is available, not a rated endurance limit. Barth is the ancestor of the AGMA dynamic factor and is conservative; the AGMA application, size, load-distribution, rim-thickness, and geometry (J) factors and any surface-durability check are not modeled. A screen; AGMA 2001 and the gear maker govern.",
  example: gearDynamicToothStressExample.inputs,
  fields: [
    { key: "horsepower", label: "Transmitted horsepower", kind: "number" },
    { key: "rpm", label: "Gear speed (rpm)", kind: "number" },
    { key: "number_of_teeth", label: "Number of teeth", kind: "number" },
    { key: "diametral_pitch_1_in", label: "Diametral pitch Pd (teeth per inch)", kind: "number" },
    { key: "face_width_in", label: "Face width F (in)", kind: "number" },
    { key: "tooth_system", label: "Tooth system", kind: "select", options: [{ value: "20-full-depth", label: "20 deg full depth", selected: true }, { value: "14.5-full-depth", label: "14.5 deg full depth" }, { value: "20-stub", label: "20 deg stub" }] },
    { key: "y_diametral_override", label: "Lewis Y override (0 = derive from the tooth system)", kind: "number", default: 0 },
    { key: "tooth_cut", label: "Tooth quality", kind: "select", options: [{ value: "cut", label: "Cut or milled (Kv base 1200)", selected: true }, { value: "cast", label: "Cast or crude (Kv base 600)" }] },
    { key: "is_idler", label: "Is this gear an idler?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes - reversed bending, 1.42" }] },
    { key: "sut_psi", label: "Material ultimate strength Sut (psi; 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "gdt-out-l", label: "Tangential load and pitch-line speed", value: (r) => fmt(r.wt_lb, 1) + " lb at " + fmt(r.velocity_fpm, 0) + " ft/min (D = " + fmt(r.pitch_diameter_in, 3) + " in, T = " + fmt(r.torque_inlb, 1) + " in-lb)" },
    { key: "s", id: "gdt-out-s", label: "Static Lewis stress", value: (r) => fmt(r.static_stress_psi, 0) + " psi (Y = " + fmt(r.lewis_Y_diametral, 4) + ")" },
    { key: "k", id: "gdt-out-k", label: "Barth velocity factor", value: (r) => fmt(r.kv, 4) + " = (" + r.kv_base + " + " + fmt(r.velocity_fpm, 0) + ") / " + r.kv_base + (r.idler ? ", plus the 1.42 idler factor" : "") },
    { key: "d", id: "gdt-out-d", label: "Dynamic bending stress", value: (r) => fmt(r.dynamic_stress_psi, 0) + " psi (+" + fmt(r.dynamic_penalty_pct, 0) + "% over static)" },
    { key: "f", id: "gdt-out-f", label: "Against an Sut/3 allowable", value: (r) => r.allowable_psi === null ? "- (enter Sut)" : fmt(r.allowable_psi, 0) + " psi, safety factor " + fmt(r.safety_factor, 2) },
    { key: "n", id: "gdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGearDynamicToothStress,
});
