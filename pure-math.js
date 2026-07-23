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
// dims: in { awg: dimensionless } out: diameter_in: L
export function awgDiameterInches(awg) {
  const n = awgToNumber(awg);
  return 0.005 * Math.pow(92, (36 - n) / 39);
}

// dims: in { awg: dimensionless } out: n: dimensionless
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
// dims: in { awg: dimensionless } out: area_cmils: L^2
export function awgAreaCmils(awg) {
  const d_in = awgDiameterInches(awg);
  const d_mils = d_in * 1000;
  return d_mils * d_mils;
}

// Cross-sectional area in square meters.
// dims: in { awg: dimensionless } out: area_m2: L^2
export function awgAreaM2(awg) {
  const d_in = awgDiameterInches(awg);
  const d_m = d_in * 0.0254;
  return Math.PI * (d_m / 2) ** 2;
}

// Resistance of a conductor at temperature T (Celsius).
//   R(T) = rho_0 * (L / A) * (1 + alpha * (T - 20))
// Inputs in SI. Returns ohms.
// dims: in { material: dimensionless, awg: dimensionless, length_m: L, temperature_C: T }
//        out: resistance_ohm: M L^2 T^-3 I^-2
export function conductorResistance({ material, awg, length_m, temperature_C }) {
  const m = MATERIALS[material];
  if (!m) throw new Error("Unknown material: " + material);
  const A = awgAreaM2(awg);
  const rho = m.rho_20C * (1 + m.alpha * (temperature_C - 20));
  return (rho * length_m) / A;
}

// Convenience: per-1000-foot resistance at temperature.
// dims: in { material: dimensionless, awg: dimensionless, temperature_C: T }
//        out: resistance_ohm_per_kft: M L^2 T^-3 I^-2
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
// dims: in { material: dimensionless, awg: dimensionless, insulation_rating_C: T, ambient_C: T, bundle_count: dimensionless, h_eff: M T^-3 }
//        out: ampacity_A: I
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

  // NEC 310.15(C)(1) adjustment factors for more than three current-carrying
  // conductors. The previous table floored at 0.50 for EVERY count >= 10, which
  // is right only through 20 conductors: 21-30 is 0.45, 31-40 is 0.40, and 41+
  // is 0.35. Flooring at 0.50 was NON-CONSERVATIVE above 20 conductors (43%
  // high at 41+) and contradicted _fillFactor() in calc-electrical.js, which
  // already carried the correct steps. Counts of 1-20 are unchanged.
  const k = bundle_count <= 3 ? 1.0
    : bundle_count <= 6 ? 0.80
      : bundle_count <= 9 ? 0.70
        : bundle_count <= 20 ? 0.50
          : bundle_count <= 30 ? 0.45
            : bundle_count <= 40 ? 0.40
              : 0.35;
  I *= k;

  return I;
}

// Voltage drop. Returns volts.
//   single phase: V_drop = 2 * K * I * D / cmils
//   three phase:  V_drop = sqrt(3) * K * I * D / cmils
// K (ohm * cmil per foot) approximated at 75 C: copper 12.9, aluminum 21.2.
// dims: in { phase: dimensionless, material: dimensionless, awg: dimensionless, length_ft: L, current_A: I }
//        out: voltage_drop_V: M L^2 T^-3 I^-1
export function voltageDrop({ phase, material, awg, length_ft, current_A }) {
  const K = material === "copper" ? 12.9 : material === "aluminum" ? 21.2 : null;
  if (K === null) throw new Error("Unknown material: " + material);
  const cmils = awgAreaCmils(awg);
  const factor = phase === "three" ? Math.sqrt(3) : 2;
  return (factor * K * current_A * length_ft) / cmils;
}

// Three-phase power. P = sqrt(3) * V_LL * I_L * pf.
// dims: in { V_LL: M L^2 T^-3 I^-1, I_L: I, pf: dimensionless }
//        out: { P_W: M L^2 T^-3, S_VA: M L^2 T^-3, Q_var: M L^2 T^-3, kW: M L^2 T^-3, kVA: M L^2 T^-3, kVAR: M L^2 T^-3 }
export function threePhasePower({ V_LL, I_L, pf }) {
  const S = Math.sqrt(3) * V_LL * I_L; // VA
  const P = S * pf;
  const Q = Math.sqrt(Math.max(0, S * S - P * P));
  return { P_W: P, S_VA: S, Q_var: Q, kW: P / 1000, kVA: S / 1000, kVAR: Q / 1000 };
}

// Single-phase power. P = V * I * pf.
// dims: in { V: M L^2 T^-3 I^-1, I: I, pf: dimensionless }
//        out: { P_W: M L^2 T^-3, S_VA: M L^2 T^-3, Q_var: M L^2 T^-3 }
export function singlePhasePower({ V, I, pf }) {
  const S = V * I;
  const P = S * pf;
  const Q = Math.sqrt(Math.max(0, S * S - P * P));
  return { P_W: P, S_VA: S, Q_var: Q };
}

// Hazen-Williams friction loss (US customary).
//   h_f (ft) = (10.44 * Q^1.852) / (C^1.852 * d^4.87) * L
// Q in gpm, d in inches (internal), L in feet, h_f in feet of head.
// (10.44 is the feet-of-head coefficient; the NFPA-13 4.52 gives psi = feet / 2.307.)
// Citation: Hazen and Williams, 1905. Public domain.
// dims: in { flow_gpm: L^3 T^-1, internal_diameter_in: L, length_ft: L, C: dimensionless }
//        out: headLoss_ft: L
export function hazenWilliamsFrictionLoss({ flow_gpm, internal_diameter_in, length_ft, C }) {
  if (flow_gpm <= 0 || internal_diameter_in <= 0 || length_ft <= 0 || C <= 0) return 0;
  // Hazen-Williams head loss in FEET of head (Q in gpm, d in inches, L in ft).
  // The coefficient is 10.44; the NFPA-13 4.52 coefficient gives psi, not feet
  // (feet = psi x 2.307). Every caller uses this as feet of head.
  const headLoss_ft = (10.44 * Math.pow(flow_gpm, 1.852)) /
    (Math.pow(C, 1.852) * Math.pow(internal_diameter_in, 4.87)) *
    length_ft;
  return headLoss_ft;
}

// dims: in { feet: L, fluid_density_lb_ft3: M L^-3 } out: psi: M L^-1 T^-2
export function feetOfHeadToPsi(feet, fluid_density_lb_ft3 = 62.4) {
  // psi = ft * (rho / 144). For water at 60 F, rho ~ 62.4 lb/ft^3, so psi = ft / 2.31.
  return (feet * fluid_density_lb_ft3) / 144;
}

// Darcy-Weisbach friction loss using the Colebrook-White friction factor.
//   h_f = f * (L / d) * (v^2 / (2 * g))
// All inputs SI; returns head loss in meters.
// dims: in { internal_diameter_m: L, length_m: L, velocity_m_s: L T^-1, density_kg_m3: M L^-3, viscosity_Pa_s: M L^-1 T^-1, roughness_m: L, g: L T^-2 }
//        out: headLoss_m: L
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
// dims: in { Re: dimensionless, relativeRoughness: dimensionless }
//        out: frictionFactor: dimensionless
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
// dims: in { w_lb_ft: M T^-2, L_ft: L, E_psi: M L^-1 T^-2, I_in4: L^4 }
//        out: { M_lbft: M L^2 T^-2, delta_in: L }
export function beamUniformLoadSimplySupported({ w_lb_ft, L_ft, E_psi, I_in4 }) {
  const M_lbft = (w_lb_ft * L_ft * L_ft) / 8;
  const w_lb_in = w_lb_ft / 12;
  const L_in = L_ft * 12;
  const delta_in = (5 * w_lb_in * Math.pow(L_in, 4)) / (384 * E_psi * I_in4);
  return { M_lbft, delta_in };
}

// dims: in { P_lb: M L T^-2, L_ft: L, E_psi: M L^-1 T^-2, I_in4: L^4 }
//        out: { M_lbft: M L^2 T^-2, delta_in: L }
export function beamCenterPointLoadSimplySupported({ P_lb, L_ft, E_psi, I_in4 }) {
  const M_lbft = (P_lb * L_ft) / 4;
  const L_in = L_ft * 12;
  const delta_in = (P_lb * Math.pow(L_in, 3)) / (48 * E_psi * I_in4);
  return { M_lbft, delta_in };
}

// Rectangular section properties.
// dims: in { b_in: L, d_in: L } out: { I_in4: L^4, S_in3: L^3, c_in: L }
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
// dims: in { w_lb_ft: M T^-2, Fb_psi: M L^-1 T^-2, b_in: L, d_in: L }
//        out: L_max_ft: L
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
// dims: in { w_lb_ft: M T^-2, E_psi: M L^-1 T^-2, b_in: L, d_in: L, deflectionLimit: dimensionless }
//        out: L_max_ft: L
export function allowableSpanByDeflection({ w_lb_ft, E_psi, b_in, d_in, deflectionLimit = 360 }) {
  const { I_in4 } = rectangularSection({ b_in, d_in });
  const w_lb_in = w_lb_ft / 12;
  const L_in = Math.cbrt((384 * E_psi * I_in4) / (5 * w_lb_in * deflectionLimit));
  return L_in / 12;
}

// Psychrometrics. August-Roche-Magnus saturation vapor pressure (T in C, e_s in hPa).
//   e_s(T) = 6.1094 * exp(17.625 * T / (T + 243.04))
// dims: in { T_C: T } out: e_s_hPa: M L^-1 T^-2
export function saturationVaporPressure_hPa(T_C) {
  return 6.1094 * Math.exp((17.625 * T_C) / (T_C + 243.04));
}

// Inversion: dew point from vapor pressure (hPa).
// dims: in { e_hPa: M L^-1 T^-2 } out: dewPoint_C: T
export function dewPointFromVaporPressure_C(e_hPa) {
  const ln = Math.log(e_hPa / 6.1094);
  return (243.04 * ln) / (17.625 - ln);
}

// Mass mixing ratio W = 0.622 * e / (P - e). e and P in same units.
// GPP = W * 7000 (grains per pound dry air).
// dims: in { T_C: T, RH_percent: dimensionless, P_hPa: M L^-1 T^-2 }
//        out: { e_s_hPa: M L^-1 T^-2, e_hPa: M L^-1 T^-2, W_kg_kg: dimensionless, dewPoint_C: T, GPP: dimensionless }
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
// dims: in { pairs: dimensionless, pressure_psig: M L^-1 T^-2, temperature_F: T }
//        out: interpolated_value: dimensionless
//   (the output unit is conditional: temperature_F when pressure_psig is supplied,
//    pressure_psig when temperature_F is supplied; the annotation is conservative
//    per spec-v14 §7.1 for table-lookup functions whose output dimension is
//    selected at call time.)
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

// dims: in { xs: dimensionless, ys: dimensionless, x: dimensionless }
//        out: y: dimensionless
//   (generic linear-interpolation primitive; dimensions are inherited from
//    the caller's xs/ys arrays. The annotation is conservative per
//    spec-v14 §7.1; a future per-call-site dimensional check would dispatch
//    on the calling function's annotation, not this one's.)
export function interpLinear(xs, ys, x) {
  if (xs.length === 0) return null;
  // spec-v14 §9.1 NaN-guard: a NaN input must propagate as NaN rather
  // than silently falling through to the upper-tail branch (every
  // comparison against NaN evaluates false, so the function used to
  // return ys[ys.length - 1]).
  if (Number.isNaN(x)) return NaN;
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
// dims: in { C: dimensionless, gpm: L^3 T^-1, length_ft: L }
//        out: friction_loss_psi: M L^-1 T^-2
export function fireHoseFrictionLoss({ C, gpm, length_ft }) {
  return C * Math.pow(gpm / 100, 2) * (length_ft / 100);
}

// Hydrant flow. Q (gpm) = 29.83 * c * d^2 * sqrt(P).
// dims: in { pitot_psi: M L^-1 T^-2, outlet_diameter_in: L, c: dimensionless }
//        out: flow_gpm: L^3 T^-1
export function hydrantFlow({ pitot_psi, outlet_diameter_in, c = 0.9 }) {
  if (pitot_psi <= 0) return 0;
  return 29.83 * c * outlet_diameter_in * outlet_diameter_in * Math.sqrt(pitot_psi);
}

// --- spec-v17 §Z.4 statistical special functions ---------------------
//
// Shared numeric implementations of the error function and the
// regularized incomplete gamma / beta functions, with the normal,
// chi-square, and Student-t CDFs derived from them. Used by the v17
// Educators statistics tiles (Y.1 z-percentile, Y.3 chi-square, Y.4
// Pearson significance). Each carries a worked-example test against a
// published table value per the v14 §C.3 tolerance discipline.

// Error function via Abramowitz & Stegun (Handbook of Mathematical
// Functions, 1964) formula 7.1.26. Maximum absolute error 1.5e-7.
// dims: in { x: dimensionless } out: { result: dimensionless }
export function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((((1.061405429 * t) - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

// Standard normal cumulative distribution function.
// dims: in { z: dimensionless } out: { result: dimensionless }
export function normCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// Natural log of the gamma function via the Lanczos approximation
// (g = 7, nine coefficients), ~15 significant digits for x > 0.
// dims: in { x: dimensionless } out: { result: dimensionless }
export function gammaln(x) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // Reflection: gammaln(x) = log(pi / |sin(pi x)|) - gammaln(1 - x).
    // The magnitude keeps the log real for negative non-integer x, where
    // sin(pi x) < 0 (DR-02): gammaln returns log|Gamma|, the documented form.
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - gammaln(1 - x);
  }
  x -= 1;
  const g = 7;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Regularized lower incomplete gamma function P(a, x) = gamma(a, x) /
// Gamma(a). Numerical Recipes 6.2: power series for x < a + 1, the
// complementary continued fraction otherwise.
// dims: in { a: dimensionless, x: dimensionless } out: { result: dimensionless }
export function gammainc(a, x) {
  if (!(a > 0) || x < 0) return NaN;
  if (x === 0) return 0;
  // P(a, +Inf) = 1 (DR-01): the continued-fraction prefactor
  // exp(-x + a*ln(x) - gammaln(a)) is exp(-Inf + Inf) = NaN at x = Inf,
  // so the limit is supplied directly beside the x === 0 guard.
  if (x === Infinity) return 1;
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let n = 0; n < 300; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
  return 1 - q;
}

// Chi-square cumulative distribution function with df degrees of freedom.
// dims: in { x: dimensionless, df: dimensionless } out: { result: dimensionless }
export function chi2Cdf(x, df) {
  if (x <= 0) return 0;
  return gammainc(df / 2, x / 2);
}

// Continued fraction for the incomplete beta function (Numerical
// Recipes 6.4, betacf). Not exported.
function _betacf(x, a, b) {
  const tiny = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

// Regularized incomplete beta function I_x(a, b). Numerical Recipes 6.4.
// dims: in { x: dimensionless, a: dimensionless, b: dimensionless } out: { result: dimensionless }
export function betainc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * _betacf(x, a, b)) / a;
  }
  return 1 - (bt * _betacf(1 - x, b, a)) / b;
}

// Student-t cumulative distribution function with df degrees of freedom,
// derived from the incomplete beta function.
// dims: in { t: dimensionless, df: dimensionless } out: { result: dimensionless }
export function tcdf(t, df) {
  const x = df / (df + t * t);
  const ib = 0.5 * betainc(x, df / 2, 0.5);
  return t >= 0 ? 1 - ib : ib;
}

// Temperature conversions.
// dims: in { F: T } out: C: T
export const F_to_C = (F) => ((F - 32) * 5) / 9;
// dims: in { C: T } out: F: T
export const C_to_F = (C) => (C * 9) / 5 + 32;
// dims: in { C: T } out: K: T
export const C_to_K = (C) => C + 273.15;
// dims: in { K: T } out: C: T
export const K_to_C = (K) => K - 273.15;
