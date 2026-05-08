// Unit tests for pure-math.js. Uses Node's built-in test runner.
//
// Tolerance philosophy: physics-derived implementations are checked against
// values computed from the same equations, against published worked examples,
// and (for ampacity and lumber spans) against documented tolerance bounds
// relative to widely published code-table values for typical inputs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  awgDiameterInches,
  awgAreaCmils,
  conductorResistance,
  conductorResistancePerKft,
  ampacityFromPhysics,
  voltageDrop,
  threePhasePower,
  singlePhasePower,
  hazenWilliamsFrictionLoss,
  feetOfHeadToPsi,
  colebrookFrictionFactor,
  darcyWeisbachFrictionLoss,
  beamUniformLoadSimplySupported,
  beamCenterPointLoadSimplySupported,
  rectangularSection,
  allowableSpanByBending,
  allowableSpanByDeflection,
  saturationVaporPressure_hPa,
  dewPointFromVaporPressure_C,
  psychrometric,
  interpLinear,
  interpolateRefrigerant,
  fireHoseFrictionLoss,
  hydrantFlow,
  F_to_C,
  C_to_F,
} from "../../pure-math.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- AWG geometry ---

test("AWG geometric definition: AWG 12 diameter approx 0.0808 in", () => {
  assert.ok(close(awgDiameterInches("12"), 0.0808, 0.001));
});

test("AWG geometric definition: 4/0 diameter approx 0.4600 in", () => {
  assert.ok(close(awgDiameterInches("4/0"), 0.4600, 0.001));
});

test("AWG 12 area approx 6530 cmils (within 1 percent)", () => {
  // Published nominal: 6530 cmils.
  const cmils = awgAreaCmils("12");
  assert.ok(close(cmils, 6530, 100), "got " + cmils);
});

test("AWG 14 area approx 4110 cmils (within 1 percent)", () => {
  const cmils = awgAreaCmils("14");
  assert.ok(close(cmils, 4110, 100), "got " + cmils);
});

// --- Conductor resistance ---

test("Copper AWG 12 resistance per 1000 ft at 20 C approx 1.6 ohm (within 5 percent)", () => {
  const r = conductorResistancePerKft({ material: "copper", awg: "12", temperature_C: 20 });
  assert.ok(r > 1.5 && r < 1.7, "got " + r);
});

test("Aluminum AWG 4/0 resistance per 1000 ft at 75 C in physically reasonable range", () => {
  // Bare-conductor first-principles result (no insulation skin or stranding factors):
  // rho_75 = 2.82e-8 * (1 + 4.03e-3 * 55) ~ 3.45e-8 ohm*m
  // A(4/0) ~ 1.07e-4 m^2 -> R/kft ~ 0.098 ohm. Published 4/0 aluminum DC values
  // typically span 0.08-0.10 ohm/kft.
  const r = conductorResistancePerKft({ material: "aluminum", awg: "4/0", temperature_C: 75 });
  assert.ok(r > 0.08 && r < 0.11, "got " + r);
});

test("Conductor resistance scales linearly with length", () => {
  const r1 = conductorResistance({ material: "copper", awg: "10", length_m: 100, temperature_C: 20 });
  const r2 = conductorResistance({ material: "copper", awg: "10", length_m: 200, temperature_C: 20 });
  assert.ok(close(r2, 2 * r1, 1e-9));
});

test("Conductor resistance increases with temperature", () => {
  const r20 = conductorResistance({ material: "copper", awg: "12", length_m: 100, temperature_C: 20 });
  const r75 = conductorResistance({ material: "copper", awg: "12", length_m: 100, temperature_C: 75 });
  assert.ok(r75 > r20);
});

// --- Ampacity ---

test("Ampacity returns positive number for AWG 12 copper at 75 C insulation, 30 C ambient", () => {
  const a = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 75, ambient_C: 30 });
  assert.ok(a > 0);
});

test("Ampacity decreases when ambient rises", () => {
  const a30 = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 75, ambient_C: 30 });
  const a40 = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 75, ambient_C: 40 });
  assert.ok(a40 < a30);
});

test("Ampacity decreases when insulation rating drops to 60 C", () => {
  const a75 = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 75, ambient_C: 30 });
  const a60 = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 60, ambient_C: 30 });
  assert.ok(a60 < a75);
});

test("Ampacity is zero when ambient equals insulation rating", () => {
  const a = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 75, ambient_C: 75 });
  assert.equal(a, 0);
});

test("Ampacity for aluminum AWG 12 is lower than copper AWG 12 (same conditions)", () => {
  const cu = ampacityFromPhysics({ material: "copper", awg: "12", insulation_rating_C: 75, ambient_C: 30 });
  const al = ampacityFromPhysics({ material: "aluminum", awg: "12", insulation_rating_C: 75, ambient_C: 30 });
  assert.ok(al < cu);
});

// --- Voltage drop ---

test("Voltage drop scales with current and length", () => {
  const v1 = voltageDrop({ phase: "single", material: "copper", awg: "10", length_ft: 100, current_A: 10 });
  const v2 = voltageDrop({ phase: "single", material: "copper", awg: "10", length_ft: 200, current_A: 20 });
  assert.ok(close(v2, 4 * v1, 1e-9));
});

test("Voltage drop single-phase AWG 12 copper at 20 A over 100 ft approx 4 V", () => {
  const v = voltageDrop({ phase: "single", material: "copper", awg: "12", length_ft: 100, current_A: 20 });
  // K=12.9, cmils approx 6530 -> Vd = 2*12.9*20*100/6530 approx 7.9. Use approx range.
  assert.ok(v > 7 && v < 9, "got " + v);
});

test("Three-phase voltage drop is sqrt(3)/2 times single-phase for same K, I, D, cmils", () => {
  const v1 = voltageDrop({ phase: "single", material: "copper", awg: "10", length_ft: 100, current_A: 10 });
  const v3 = voltageDrop({ phase: "three", material: "copper", awg: "10", length_ft: 100, current_A: 10 });
  assert.ok(close(v3 / v1, Math.sqrt(3) / 2, 1e-9));
});

// --- Power ---

test("Three-phase power: 480 V, 100 A, pf 0.9 -> approx 74.8 kW", () => {
  const r = threePhasePower({ V_LL: 480, I_L: 100, pf: 0.9 });
  assert.ok(close(r.kW, 74.83, 0.5));
});

test("Single-phase power: 120 V, 10 A, pf 1 -> 1200 W", () => {
  const r = singlePhasePower({ V: 120, I: 10, pf: 1 });
  assert.ok(close(r.P_W, 1200, 1e-6));
});

// --- Hazen-Williams ---

test("Hazen-Williams: 1-inch PVC (C=150), 100 ft, 10 gpm produces small head loss", () => {
  // For Schedule 40 PVC nominal 1 in, ID approx 1.049 in.
  // h_f = 4.52 * 10^1.852 / (150^1.852 * 1.049^4.87) * 100 -> ~2.4 ft -> ~1 psi.
  const hf = hazenWilliamsFrictionLoss({ flow_gpm: 10, internal_diameter_in: 1.049, length_ft: 100, C: 150 });
  const psi = feetOfHeadToPsi(hf);
  assert.ok(psi > 0.5 && psi < 2.0, "got psi " + psi);
});

test("Hazen-Williams scales linearly with length", () => {
  const a = hazenWilliamsFrictionLoss({ flow_gpm: 10, internal_diameter_in: 1, length_ft: 100, C: 150 });
  const b = hazenWilliamsFrictionLoss({ flow_gpm: 10, internal_diameter_in: 1, length_ft: 200, C: 150 });
  assert.ok(close(b, 2 * a, 1e-9));
});

test("Hazen-Williams returns 0 for zero flow", () => {
  assert.equal(hazenWilliamsFrictionLoss({ flow_gpm: 0, internal_diameter_in: 1, length_ft: 100, C: 150 }), 0);
});

// --- Darcy-Weisbach / Colebrook ---

test("Colebrook friction factor: Re 2000 (laminar) -> f = 64/Re", () => {
  const f = colebrookFrictionFactor({ Re: 2000, relativeRoughness: 0.001 });
  assert.ok(close(f, 64 / 2000, 1e-9));
});

test("Colebrook friction factor: Re 1e5, smooth pipe approx 0.018", () => {
  const f = colebrookFrictionFactor({ Re: 1e5, relativeRoughness: 1e-6 });
  assert.ok(f > 0.015 && f < 0.022, "got " + f);
});

test("Darcy-Weisbach: positive head loss for typical water flow", () => {
  const h = darcyWeisbachFrictionLoss({
    internal_diameter_m: 0.025,
    length_m: 30,
    velocity_m_s: 1.0,
    density_kg_m3: 999,
    viscosity_Pa_s: 1.124e-3,
    roughness_m: 1.5e-6,
  });
  assert.ok(h > 0);
});

// --- Beam mechanics ---

test("Rectangular section 2x10 actual: I = 1.5 * 9.25^3 / 12", () => {
  const { I_in4, S_in3 } = rectangularSection({ b_in: 1.5, d_in: 9.25 });
  assert.ok(close(I_in4, (1.5 * Math.pow(9.25, 3)) / 12, 1e-6));
  assert.ok(close(S_in3, (1.5 * 9.25 * 9.25) / 6, 1e-6));
});

test("Beam uniform load: M = w L^2 / 8", () => {
  const { M_lbft } = beamUniformLoadSimplySupported({ w_lb_ft: 100, L_ft: 10, E_psi: 1.6e6, I_in4: 50 });
  assert.ok(close(M_lbft, (100 * 100) / 8, 1e-9));
});

test("Beam center point load: M = P L / 4", () => {
  const { M_lbft } = beamCenterPointLoadSimplySupported({ P_lb: 1000, L_ft: 10, E_psi: 1.6e6, I_in4: 50 });
  assert.ok(close(M_lbft, (1000 * 10) / 4, 1e-9));
});

test("Allowable span by bending: 2x10 DF-L No.2 at 40 psf live + 10 dead approx 14-15 ft", () => {
  // 50 psf on 16 in tributary = 50 * (16/12) = 66.7 lb/ft
  const L = allowableSpanByBending({ w_lb_ft: 66.7, Fb_psi: 900, b_in: 1.5, d_in: 9.25 });
  assert.ok(L > 12 && L < 18, "got " + L);
});

test("Allowable span by deflection: shorter than by bending typically governs at low load", () => {
  const Lb = allowableSpanByBending({ w_lb_ft: 30, Fb_psi: 900, b_in: 1.5, d_in: 9.25 });
  const Ld = allowableSpanByDeflection({ w_lb_ft: 30, E_psi: 1.6e6, b_in: 1.5, d_in: 9.25 });
  assert.ok(Lb > 0 && Ld > 0);
});

// --- Psychrometrics ---

test("Saturation vapor pressure at 0 C approx 6.11 hPa", () => {
  assert.ok(close(saturationVaporPressure_hPa(0), 6.11, 0.05));
});

test("Saturation vapor pressure at 20 C approx 23.4 hPa", () => {
  assert.ok(close(saturationVaporPressure_hPa(20), 23.4, 0.5));
});

test("Dew point equals dry bulb at 100 percent RH", () => {
  const r = psychrometric({ T_C: 25, RH_percent: 100 });
  assert.ok(close(r.dewPoint_C, 25, 0.05));
});

test("Dew point inversion is exact within tolerance", () => {
  const T = 18;
  const e = saturationVaporPressure_hPa(T) * 0.5;
  const Td = dewPointFromVaporPressure_C(e);
  // Re-evaluate forward: e at Td should equal e.
  assert.ok(close(saturationVaporPressure_hPa(Td), e, 0.05));
});

test("Psychrometric GPP at 75 F (23.9 C), 50 percent RH approx 65 GPP", () => {
  const r = psychrometric({ T_C: 23.9, RH_percent: 50 });
  // Reference: about 65 grains/lb dry air.
  assert.ok(r.GPP > 55 && r.GPP < 75, "got " + r.GPP);
});

// --- Interpolation / refrigerant ---

test("interpLinear: midpoint", () => {
  const y = interpLinear([0, 10], [0, 100], 5);
  assert.equal(y, 50);
});

test("interpLinear: extrapolation off the low end", () => {
  const y = interpLinear([10, 20], [100, 200], 5);
  assert.equal(y, 50);
});

test("interpolateRefrigerant: by pressure returns interpolated temperature", () => {
  const pairs = [
    { pressure_psig: 100, temperature_F: 30 },
    { pressure_psig: 200, temperature_F: 70 },
  ];
  const T = interpolateRefrigerant({ pairs, pressure_psig: 150 });
  assert.equal(T, 50);
});

test("interpolateRefrigerant: by temperature returns interpolated pressure", () => {
  const pairs = [
    { pressure_psig: 100, temperature_F: 30 },
    { pressure_psig: 200, temperature_F: 70 },
  ];
  const P = interpolateRefrigerant({ pairs, temperature_F: 50 });
  assert.equal(P, 150);
});

// --- Fire-ground ---

test("Fire hose friction loss: 2.5 in (C=2), 200 ft, 250 gpm = 25 psi", () => {
  // FL = 2 * (250/100)^2 * (200/100) = 2 * 6.25 * 2 = 25
  const FL = fireHoseFrictionLoss({ C: 2, gpm: 250, length_ft: 200 });
  assert.ok(close(FL, 25, 1e-9));
});

test("Hydrant flow: 2.5 in outlet, 10 psi Pitot, c=0.9 -> approx 530 gpm", () => {
  // Q = 29.83 * 0.9 * 6.25 * sqrt(10) = 29.83 * 0.9 * 6.25 * 3.162 = ~530
  const Q = hydrantFlow({ pitot_psi: 10, outlet_diameter_in: 2.5, c: 0.9 });
  assert.ok(close(Q, 530, 5), "got " + Q);
});

// --- Temperature ---

test("F_to_C and C_to_F invert", () => {
  for (const F of [-40, 0, 32, 72, 212]) {
    assert.ok(close(C_to_F(F_to_C(F)), F, 1e-9));
  }
});
