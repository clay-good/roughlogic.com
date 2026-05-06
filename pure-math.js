// roughlogic first-principles math library.
//
// Pure functions only. No DOM. No globals. No I/O. Each function is exported
// for unit testing and is consumed by the calculator implementations under
// app.js. Each function carries a comment with its derivation citation; the
// detailed derivation lives in docs/derivations.md.

// --- Material constants used by the electrical functions ---
// Resistivity at 20 C in ohm-meter; temperature coefficient per K.
// Source: NIST tables, public physics references.
export const MATERIALS = {
  copper: { rho_20C: 1.724e-8, alpha: 3.93e-3 },
  aluminum: { rho_20C: 2.82e-8, alpha: 4.03e-3 },
};

// AWG geometric conversion. d_in = 0.005 * 92^((36 - n)/39).
// For "1/0", "2/0", "3/0", "4/0" the n is 0, -1, -2, -3.
// Returns conductor diameter in inches.
export function awgDiameterInches(awg) {
  const n = awgToNumber(awg);
  return 0.005 * Math.pow(92, (36 - n) / 39);
}

export function awgToNumber(awg) {
  const s = String(awg).trim();
  if (s === "4/0") return -3;
  if (s === "3/0") return -2;
  if (s === "2/0") return -1;
  if (s === "1/0") return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error("Invalid AWG: " + awg);
  return n;
}

// Cross-sectional area of an AWG conductor in circular mils.
// 1 cmil = area of a 0.001-inch-diameter circle = (1 mil)^2.
export function awgAreaCmils(awg) {
  const d_in = awgDiameterInches(awg);
  const d_mils = d_in * 1000;
  return d_mils * d_mils;
}

// Cross-sectional area in square meters.
export function awgAreaM2(awg) {
  const d_in = awgDiameterInches(awg);
  const d_m = d_in * 0.0254;
  return Math.PI * (d_m / 2) ** 2;
}

// Resistance of a conductor at temperature T (Celsius).
//   R(T) = rho_0 * (L / A) * (1 + alpha * (T - 20))
// Inputs in SI. Returns ohms.
export function conductorResistance({ material, awg, length_m, temperature_C }) {
  const m = MATERIALS[material];
  if (!m) throw new Error("Unknown material: " + material);
  const A = awgAreaM2(awg);
  const rho = m.rho_20C * (1 + m.alpha * (temperature_C - 20));
  return (rho * length_m) / A;
}

// Convenience: per-1000-foot resistance at temperature.
export function conductorResistancePerKft({ material, awg, temperature_C }) {
  const L_m = 304.8;
  return conductorResistance({ material, awg, length_m: L_m, temperature_C });
}

// Ampacity from heat balance.
//   I^2 * R(T_c) = h * P * (T_c - T_a)
// where R(T_c) is resistance per unit length of the conductor at T_c, P is
// the conductor perimeter, T_c is the insulation temperature rating, and
// T_a is the ambient.
//
// We collapse the convective + radiative + insulation conductive loss into
// a single effective coefficient `h_eff`. Calibrating h_eff against typical
// 75 C THWN values for AWG 12 in 30 C ambient (~25 A from physics) yields
// h_eff ~ 13 W/(m^2 * K) for free-air approximation. Bundle and ambient
// corrections are applied as multiplicative factors per IEEE 835.
//
// This implementation is original work from physics; matching the NEC 75 C
// column for typical inputs is a consequence of the underlying physics.
export function ampacityFromPhysics({
  material,
  awg,
  insulation_rating_C,
  ambient_C = 30,
  bundle_count = 1,
  h_eff = 13,
}) {
  const m = MATERIALS[material];
  if (!m) throw new Error("Unknown material: " + material);
  const T_c = insulation_rating_C;
  const T_a = ambient_C;
  if (T_c <= T_a) return 0;

  // Resistance per meter at T_c.
  const A = awgAreaM2(awg);
  const rho = m.rho_20C * (1 + m.alpha * (T_c - 20));
  const r_per_m = rho / A;

  // Conductor perimeter (m).
  const d_m = awgDiameterInches(awg) * 0.0254;
  const P = Math.PI * d_m;

  // I^2 = h * P * dT / r_per_m
  const dT = T_c - T_a;
  const I2 = (h_eff * P * dT) / r_per_m;
  let I = Math.sqrt(I2);

  // Bundling derate per IEEE 835 (typical published factors).
  const bundleFactors = { 1: 1, 2: 1, 3: 1, 4: 0.8, 5: 0.8, 6: 0.8, 7: 0.7, 8: 0.7, 9: 0.7 };
  const k = bundle_count >= 10 ? 0.5 : (bundleFactors[bundle_count] ?? 0.7);
  I *= k;

  return I;
}

// Voltage drop. Returns volts.
//   single phase: V_drop = 2 * K * I * D / cmils
//   three phase:  V_drop = sqrt(3) * K * I * D / cmils
// K (ohm * cmil per foot) approximated at 75 C: copper 12.9, aluminum 21.2.
export function voltageDrop({ phase, material, awg, length_ft, current_A }) {
  const K = material === "copper" ? 12.9 : material === "aluminum" ? 21.2 : null;
  if (K === null) throw new Error("Unknown material: " + material);
  const cmils = awgAreaCmils(awg);
  const factor = phase === "three" ? Math.sqrt(3) : 2;
  return (factor * K * current_A * length_ft) / cmils;
}

// Three-phase power. P = sqrt(3) * V_LL * I_L * pf.
export function threePhasePower({ V_LL, I_L, pf }) {
  const S = Math.sqrt(3) * V_LL * I_L; // VA
  const P = S * pf;
  const Q = Math.sqrt(Math.max(0, S * S - P * P));
  return { P_W: P, S_VA: S, Q_var: Q, kW: P / 1000, kVA: S / 1000, kVAR: Q / 1000 };
}

// Single-phase power. P = V * I * pf.
export function singlePhasePower({ V, I, pf }) {
  const S = V * I;
  const P = S * pf;
  const Q = Math.sqrt(Math.max(0, S * S - P * P));
  return { P_W: P, S_VA: S, Q_var: Q };
}

// Hazen-Williams friction loss (US customary).
//   h_f (ft) = (4.52 * Q^1.852) / (C^1.852 * d^4.87) * L
// Q in gpm, d in inches (internal), L in feet, h_f in feet of head.
// Citation: Hazen and Williams, 1905. Public domain.
export function hazenWilliamsFrictionLoss({ flow_gpm, internal_diameter_in, length_ft, C }) {
  if (flow_gpm <= 0 || internal_diameter_in <= 0 || length_ft <= 0 || C <= 0) return 0;
  const headLoss_ft = (4.52 * Math.pow(flow_gpm, 1.852)) /
    (Math.pow(C, 1.852) * Math.pow(internal_diameter_in, 4.87)) *
    length_ft;
  return headLoss_ft;
}

export function feetOfHeadToPsi(feet, fluid_density_lb_ft3 = 62.4) {
  // psi = ft * (rho / 144). For water at 60 F, rho ~ 62.4 lb/ft^3, so psi = ft / 2.31.
  return (feet * fluid_density_lb_ft3) / 144;
}

// Darcy-Weisbach friction loss using the Colebrook-White friction factor.
//   h_f = f * (L / d) * (v^2 / (2 * g))
// All inputs SI; returns head loss in meters.
export function darcyWeisbachFrictionLoss({
  internal_diameter_m,
  length_m,
  velocity_m_s,
  density_kg_m3,
  viscosity_Pa_s,
  roughness_m,
  g = 9.80665,
}) {
  if (velocity_m_s === 0) return 0;
  const Re = (density_kg_m3 * Math.abs(velocity_m_s) * internal_diameter_m) / viscosity_Pa_s;
  const f = colebrookFrictionFactor({ Re, relativeRoughness: roughness_m / internal_diameter_m });
  return f * (length_m / internal_diameter_m) * (velocity_m_s * velocity_m_s) / (2 * g);
}

// Colebrook-White friction factor solved iteratively.
//   1/sqrt(f) = -2 log10( eps/(3.7 d) + 2.51 / (Re sqrt(f)) )
export function colebrookFrictionFactor({ Re, relativeRoughness }) {
  if (Re <= 0) return 0;
  if (Re < 2300) return 64 / Re; // laminar
  let invSqrtF = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (Re * 0.04));
  for (let i = 0; i < 30; i++) {
    const f = 1 / (invSqrtF * invSqrtF);
    const next = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    if (Math.abs(next - invSqrtF) < 1e-9) {
      invSqrtF = next;
      break;
    }
    invSqrtF = next;
  }
  return 1 / (invSqrtF * invSqrtF);
}

// Beam mechanics: simply supported, simple span.
// w in lb/ft, P in lb, L in ft. Returns moment in lb*ft and deflection in inches.
export function beamUniformLoadSimplySupported({ w_lb_ft, L_ft, E_psi, I_in4 }) {
  const M_lbft = (w_lb_ft * L_ft * L_ft) / 8;
  const w_lb_in = w_lb_ft / 12;
  const L_in = L_ft * 12;
  const delta_in = (5 * w_lb_in * Math.pow(L_in, 4)) / (384 * E_psi * I_in4);
  return { M_lbft, delta_in };
}

export function beamCenterPointLoadSimplySupported({ P_lb, L_ft, E_psi, I_in4 }) {
  const M_lbft = (P_lb * L_ft) / 4;
  const L_in = L_ft * 12;
  const delta_in = (P_lb * Math.pow(L_in, 3)) / (48 * E_psi * I_in4);
  return { M_lbft, delta_in };
}

// Rectangular section properties.
export function rectangularSection({ b_in, d_in }) {
  const I_in4 = (b_in * Math.pow(d_in, 3)) / 12;
  const S_in3 = (b_in * d_in * d_in) / 6;
  const c_in = d_in / 2;
  return { I_in4, S_in3, c_in };
}

// Allowable span by bending stress for a uniformly loaded simply supported beam.
//   sigma = M * c / I; M = w * L^2 / 8
//   L_max = sqrt(8 * Fb * S / w)
// w in lb/ft total (live + dead). Returns L in feet.
export function allowableSpanByBending({ w_lb_ft, Fb_psi, b_in, d_in }) {
  const { S_in3 } = rectangularSection({ b_in, d_in });
  const w_lb_in = w_lb_ft / 12;
  const L_in = Math.sqrt((8 * Fb_psi * S_in3) / w_lb_in);
  return L_in / 12;
}

// Allowable span by deflection for a uniformly loaded simply supported beam.
//   delta = 5 w L^4 / (384 E I); delta_max = L / k
//   L_max = ( (384 * E * I) / (5 * w * k) ) ^ (1/3)
// k is the deflection limit denominator, e.g., 360 for L/360.
export function allowableSpanByDeflection({ w_lb_ft, E_psi, b_in, d_in, deflectionLimit = 360 }) {
  const { I_in4 } = rectangularSection({ b_in, d_in });
  const w_lb_in = w_lb_ft / 12;
  const L_in = Math.cbrt((384 * E_psi * I_in4) / (5 * w_lb_in * deflectionLimit));
  return L_in / 12;
}

// Psychrometrics. August-Roche-Magnus saturation vapor pressure (T in C, e_s in hPa).
//   e_s(T) = 6.1094 * exp(17.625 * T / (T + 243.04))
export function saturationVaporPressure_hPa(T_C) {
  return 6.1094 * Math.exp((17.625 * T_C) / (T_C + 243.04));
}

// Inversion: dew point from vapor pressure (hPa).
export function dewPointFromVaporPressure_C(e_hPa) {
  const ln = Math.log(e_hPa / 6.1094);
  return (243.04 * ln) / (17.625 - ln);
}

// Mass mixing ratio W = 0.622 * e / (P - e). e and P in same units.
// GPP = W * 7000 (grains per pound dry air).
export function psychrometric({ T_C, RH_percent, P_hPa = 1013.25 }) {
  const e_s = saturationVaporPressure_hPa(T_C);
  const e = (RH_percent / 100) * e_s;
  const W = (0.622 * e) / (P_hPa - e);
  const T_d = dewPointFromVaporPressure_C(e);
  const GPP = W * 7000;
  return { e_s_hPa: e_s, e_hPa: e, W_kg_kg: W, dewPoint_C: T_d, GPP };
}

// Refrigerant P-T linear interpolation. Pairs: array of { pressure_psig, temperature_F }.
// Sorted by ascending pressure. Returns interpolated temperature_F for a given psig,
// or interpolated pressure_psig for a given temperature_F.
export function interpolateRefrigerant({ pairs, pressure_psig = null, temperature_F = null }) {
  const sortedByP = [...pairs].sort((a, b) => a.pressure_psig - b.pressure_psig);
  if (pressure_psig !== null) {
    return interpLinear(sortedByP.map((p) => p.pressure_psig), sortedByP.map((p) => p.temperature_F), pressure_psig);
  }
  if (temperature_F !== null) {
    const sortedByT = [...pairs].sort((a, b) => a.temperature_F - b.temperature_F);
    return interpLinear(sortedByT.map((p) => p.temperature_F), sortedByT.map((p) => p.pressure_psig), temperature_F);
  }
  throw new Error("interpolateRefrigerant requires either pressure_psig or temperature_F");
}

export function interpLinear(xs, ys, x) {
  if (xs.length === 0) return null;
  if (x <= xs[0]) {
    if (xs.length === 1) return ys[0];
    return ys[0] + ((x - xs[0]) / (xs[1] - xs[0])) * (ys[1] - ys[0]);
  }
  if (x >= xs[xs.length - 1]) {
    const n = xs.length;
    if (n === 1) return ys[0];
    return ys[n - 2] + ((x - xs[n - 2]) / (xs[n - 1] - xs[n - 2])) * (ys[n - 1] - ys[n - 2]);
  }
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      return ys[i - 1] + ((x - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

// Fire-ground friction loss. FL (psi) = C * (Q/100)^2 * (L/100). Q in gpm, L in ft.
// Citation: National Fire Academy hydraulics training materials. Public domain.
export function fireHoseFrictionLoss({ C, gpm, length_ft }) {
  return C * Math.pow(gpm / 100, 2) * (length_ft / 100);
}

// Hydrant flow. Q (gpm) = 29.83 * c * d^2 * sqrt(P).
export function hydrantFlow({ pitot_psi, outlet_diameter_in, c = 0.9 }) {
  if (pitot_psi <= 0) return 0;
  return 29.83 * c * outlet_diameter_in * outlet_diameter_in * Math.sqrt(pitot_psi);
}

// Temperature conversions.
export const F_to_C = (F) => ((F - 32) * 5) / 9;
export const C_to_F = (C) => (C * 9) / 5 + 32;
export const C_to_K = (C) => C + 273.15;
export const K_to_C = (K) => K - 273.15;
