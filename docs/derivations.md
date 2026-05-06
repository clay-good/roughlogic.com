# Derivations

This document is the load-bearing record that each physics-derived calculator in roughlogic.com is original work computed from first principles, not a reproduction of a licensed code table. For every calculator listed here, the derivation is given with the underlying physics citation and the rationale for why the implementation is original. The unit tests for each calculator assert the numeric correctness of the implementation against worked examples drawn from the underlying physics references.

The structure of each section is: inputs, governing equations, citations, and verification approach.

## 1. Conductor resistance at temperature

Inputs: conductor material (Cu, Al), conductor cross-sectional area (from AWG), length, temperature.

Governing equation:

  R(T) = rho_0 * (L / A) * (1 + alpha * (T - T_ref))

Where rho_0 is the resistivity of the material at the reference temperature T_ref, alpha is the temperature coefficient of resistivity, L is conductor length, and A is the cross-sectional area.

Material values used:

- Copper: rho_0 = 1.724e-8 ohm-m at 20 C, alpha = 3.93e-3 per K.
- Aluminum: rho_0 = 2.82e-8 ohm-m at 20 C, alpha = 4.03e-3 per K.

Cross-sectional area for a given AWG comes from the standard AWG dimensional definition (a geometric series; AWG n diameter in inches = 0.005 * 92^((36 - n) / 39)).

Citations: NIST material property tables; standard physics references for resistivity and temperature coefficient.

Originality: The implementation is a direct evaluation of the equation above using public material constants. It is not a reproduction of any code table.

Verification: At least 10 unit tests against representative AWG sizes, lengths, and temperatures. The tests assert the result against worked examples computed directly from the equation; they also check that for typical room temperature inputs the result agrees with widely published per-1000-foot resistance values for the same AWG within a small tolerance.

## 2. Wire ampacity from physics

Inputs: AWG, conductor material, insulation temperature rating (60, 75, or 90 C), ambient temperature, conductor count for derating.

Governing equations: ampacity is the current at which the conductor temperature reaches the insulation rating. The steady-state heat balance for a conductor in air or in a raceway is:

  I^2 * R(T_c) = h * P * (T_c - T_a)

Where R(T_c) is the conductor resistance per unit length at the conductor temperature T_c, h is the effective heat transfer coefficient (combined convective and radiative dissipation through the insulation and surrounding medium), P is the conductor perimeter, and T_a is the ambient temperature. Solving for I at T_c equal to the insulation rating gives the ampacity. Derating for ambient and conductor count follows the standard linear adjustments published by IEEE conductor sizing methodology.

Citations: IEEE Standard 835 conductor ampacity methodology; physics of cylindrical conductor heat transfer; insulation manufacturer published temperature ratings.

Originality: The implementation derives ampacity from the heat balance using public physical inputs. NEC ampacity tables are the result of the same physical computation; the values match for typical cases by physics, not by copying.

Verification: Unit tests at representative AWG sizes and insulation ratings. The tests assert that the computed ampacity at standard ambient and no derating is within a documented tolerance of NEC 75 C column values for the same AWG. The tolerance is the test's only acknowledgement of the table's existence; the computation does not consult the table.

## 3. Hazen-Williams friction loss

Inputs: pipe material (sets C value), nominal pipe size (sets internal diameter), length, flow rate, water properties.

Governing equation (US customary units, head loss in feet):

  h_f = 4.52 * Q^1.852 / (C^1.852 * d^4.87) * L

Where Q is flow in gpm, C is the Hazen-Williams roughness coefficient (material-dependent; published in public references), d is internal diameter in inches, and L is length in feet.

Citations: Hazen and Williams, 1905; the equation is in the public domain.

Originality: A direct numerical evaluation of the public equation.

Verification: Unit tests against worked examples in public engineering references for at least 10 combinations of material, diameter, and flow.

## 4. Darcy-Weisbach friction loss (water and gas)

Inputs: pipe internal diameter, length, fluid density, fluid viscosity, flow rate or velocity, pipe roughness.

Governing equation:

  h_f = f * (L / d) * (v^2 / (2 * g))

Where f is the Darcy friction factor obtained from the Colebrook-White correlation:

  1 / sqrt(f) = -2 * log10(eps / (3.7 * d) + 2.51 / (Re * sqrt(f)))

solved iteratively, and Re is the Reynolds number (rho * v * d / mu).

For gas piping, the same equation is used with gas properties (density at the operating pressure, viscosity at the operating temperature) and a head loss converted to pressure drop using gas density.

Citations: Darcy-Weisbach equation, public; Colebrook-White correlation, public; gas properties from NIST.

Originality: Direct numerical implementation of public equations.

Verification: Unit tests against worked examples; cross-verification against simplified flow regime correlations for laminar and fully turbulent cases.

## 5. Psychrometric calculations

Inputs: dry-bulb temperature, relative humidity, atmospheric pressure.

Governing equations (saturation vapor pressure via the August-Roche-Magnus approximation, then specific humidity, dew point, and grains per pound):

  e_s(T) = 6.1094 * exp(17.625 * T / (T + 243.04))      (T in C, e_s in hPa)
  e = (RH / 100) * e_s
  W = 0.622 * e / (P - e)                                (W is mass mixing ratio)
  GPP = W * 7000                                         (grains per pound dry air)
  T_d via inversion of e_s

Citations: August-Roche-Magnus saturation vapor pressure; standard psychrometric definitions in physics. ASHRAE Handbook of Fundamentals is referenced for cross-check but not reproduced.

Originality: Direct numerical evaluation of the public equations.

Verification: Unit tests against worked psychrometric examples at multiple temperature and humidity points; cross-check at known fixed points (e.g., dew point equals dry bulb at 100 percent RH).

## 6. Three-phase and single-phase power

Inputs: line voltage, line current, power factor.

Governing equations:

  P_1ph = V * I * pf
  P_3ph = sqrt(3) * V_LL * I_L * pf
  S = P / pf
  Q = sqrt(S^2 - P^2)

Citations: Standard AC power equations; public.

Originality: Direct evaluation.

Verification: Unit tests at representative inputs and at boundary values (pf=1, pf=0).

## 7. Voltage drop

Inputs: phase (single or three), conductor material, conductor size (AWG -> circular mils), one-way length, current.

Governing equation (single phase):

  V_drop = 2 * K * I * D / cmils

For three phase, the leading 2 is replaced by sqrt(3). K is the resistivity of the conductor material expressed in ohm * cmil per foot (a standard unit of K in electrical engineering: K_Cu approx 12.9, K_Al approx 21.2 at 75 C).

Citations: Public derivations from Ohm's law applied to conductor resistance.

Originality: Direct evaluation.

Verification: Unit tests at multiple AWG sizes, lengths, and currents.

## 8. Refrigerant pressure-temperature interpolation

Inputs: refrigerant ID, pressure or temperature.

Method: bundled manufacturer-published P-T pairs are interpolated linearly between adjacent points to return the corresponding saturated value. The bundled tables are attributed to the publishing manufacturer per entry.

Citations: Manufacturer technical bulletins (DuPont, Honeywell, Chemours, Arkema) per refrigerant.

Originality: The interpolation routine is original code; the underlying P-T pairs are facts attributed to their publishers.

Verification: Unit tests against published P-T pairs at the bundled saturation points and at interpolated midpoints.

## 9. Beam mechanics

Inputs: span, load type (point or uniformly distributed), load magnitude, beam cross-section, modulus of elasticity, allowable bending stress.

Governing equations (simply supported, simple span):

  Maximum moment for uniform load: M = w * L^2 / 8
  Maximum moment for centered point load: M = P * L / 4
  Maximum deflection for uniform load: delta = 5 * w * L^4 / (384 * E * I)
  Bending stress: sigma = M * c / I
  Allowable span by stress: solve sigma <= F_b
  Allowable span by deflection: solve delta <= L / k (k is the deflection limit, typically L/360)

Where I is moment of inertia of the cross-section, c is distance from neutral axis to extreme fiber, E is modulus of elasticity, and F_b is allowable bending stress.

Citations: Standard mechanics of materials (Timoshenko et al.); lumber material properties from public engineering references and lumber grading agency basic-design values.

Originality: Direct evaluation of public equations using public material constants.

Verification: Unit tests against worked beam examples for representative spans and loads; cross-verification of the lumber-span calculator against AWC table values within a documented tolerance for representative species, grades, and sizes. The cross-verification confirms physical equivalence; the implementation is derived, not reproduced.

## 10. Fire-ground friction loss

Inputs: hose diameter, length, flow rate (GPM).

Governing equation (fireground formula):

  FL = C * Q^2 * L / 100

Where Q is in hundreds of GPM, L is hose length in hundreds of feet, and C is the friction coefficient per hose diameter from National Fire Academy training materials (a U.S. government public-domain source).

Citations: National Fire Academy hydraulics training materials.

Originality: Direct evaluation of a public formula.

Verification: Unit tests against published worked examples for common hose diameters at representative flows.

## 11. Hydrant flow

Inputs: Pitot gauge reading, hydrant outlet diameter, coefficient of discharge.

Governing equation:

  Q = 29.83 * c * d^2 * sqrt(P)

Where Q is in GPM, c is the coefficient of discharge (typical 0.9 for round-and-smooth outlets), d is outlet diameter in inches, and P is Pitot pressure in psi.

Citations: Public fireground hydraulics formula.

Originality: Direct evaluation.

Verification: Unit tests against published worked examples.

## 12. Solar PV string sizing (v2)

Inputs: module Voc and Vmp at STC (25 C), Voc temperature coefficient (% per C, magnitude), record-low and record-high site temperatures, inverter MPPT min and max, inverter Vdc max.

Governing relations (linear-temperature corrections):

  V_oc_cold = V_oc * (1 + |coeff| * (25 - T_low) / 100)
  V_mp_warm = V_mp * (1 - |coeff| * (T_high - 25) / 100)
  max_series = floor(V_dc_max / V_oc_cold)
  min_series = ceil(MPPT_min / V_mp_warm)

If min_series > max_series the configuration is infeasible.

Citations: Standard PV system design practice; module manufacturer technical bulletins for the temperature coefficients.

Originality: Direct evaluation of the linear-temperature corrections.

Verification: Unit tests cover monotonicity (lower record_low_C inflates V_oc_cold; tighter V_dc_max lowers max_series) and the infeasibility flag.

## 13. Battery runtime with Peukert correction (v2)

Inputs: battery capacity C in Ah, system voltage V, depth-of-discharge fraction, load in W, Peukert exponent k.

Without correction (k = 1):

  t = (C * V * DoD) / load_W

With Peukert correction (k > 1) per the standard form:

  I = load_W / V
  t = C / I^k

Citations: Battery manufacturer technical bulletins on Peukert behavior.

Originality: Direct evaluation.

Verification: Unit tests cover the simple case (load doubling halves runtime), DoD scaling, and that k > 1 reduces runtime relative to k = 1 at high discharge currents.

## 14. Pipe thermal expansion (v2)

Inputs: pipe material (alpha in 1/F), length L (ft), temperature change dT (F).

Governing equation:

  dL (in) = alpha (1/F) * L (ft) * 12 * dT (F)

Coefficients are bundled in data/plumbing/material-expansion.json (copper 9.4e-6, PEX 1.1e-4, PVC 3.0e-5, CPVC 3.7e-5, steel 6.5e-6).

Citations: NIST and pipe manufacturer technical bulletins.

Originality: Direct evaluation of the linear-expansion form.

Verification: Unit tests cover linearity in L and dT, sign preservation, and the relative ordering of materials.

## 15. Outdoor air mixing (v2)

Inputs: return air temp and RH, outdoor air temp and RH, OA fraction.

Governing relations:

  T_mixed = f * T_OA + (1 - f) * T_RA
  W_mixed = f * W_OA + (1 - f) * W_RA  (mass-mixing of humidity ratios)
  GPP_mixed = W_mixed * 7000

W is computed via the existing psychrometric helpers (W = 0.622 * e / (P - e)).

Citations: Standard psychrometric mixing.

Originality: Direct evaluation; no licensed table reproduction.

Verification: Unit tests cover f=0, f=1, midpoint, fraction clamping, and that mixed W lies between RA and OA W.

## 16. Pipe insulation thickness (v2)

Inputs: pipe outer diameter (OD), pipe surface temperature, ambient temperature, outer surface limit, insulation thermal conductivity k (BTU * in / hr / ft^2 / F).

Per-unit-length cylindrical conduction:

  q = 2 * pi * k * (T_pipe - T_surface) / ln(r2 / r1)

Outside film flux at allowable surface delta-T:

  q_out = h_out * (pi * D_out / 12) * (T_surface - T_ambient)

Bisect on r2 (in) until q_through equals q_out, with h_out ~ 1.65 BTU/hr/ft^2/F (still air on horizontal pipe). Required thickness = r2 - r1.

Citations: Public engineering reference values for k and h_out.

Originality: Direct evaluation.

Verification: Unit tests cover monotonicity (hotter pipe -> more thickness; tighter limit -> more thickness; lower k -> less thickness) and the geometric invariants.

## 17. Joist mid-span deflection (v2)

For a uniformly loaded simply supported beam:

  delta = 5 * w * L^4 / (384 * E * I)

with w in lb/in (= plf / 12), L in inches (= ft * 12), E in psi, I in in^4. Compare against L/360 (live-load) and L/240 (total-load) limits.

Citations: First-principles beam mechanics.

Originality: Direct evaluation.

Verification: Unit tests cover linearity in w, the L^4 dependence, and inverse scaling with E.

## 18. Excavation volume with side slopes (v2)

Frustum volume (rectangular pad, sides battered to top opening):

  set_back = D / tan(angle_deg)
  L_top = L + 2 * set_back
  W_top = W + 2 * set_back
  V = D / 3 * (A1 + A2 + sqrt(A1 * A2))   where A1 = L*W, A2 = L_top*W_top

Vertical sides (angle = 90 deg) reduce to V = L * W * D.

Citations: Standard frustum geometry.

Originality: Direct evaluation.

Verification: Unit tests cover vertical case (V = L*W*D), 45 deg setback equality, and monotonicity.

## 19. Wind velocity pressure (v2)

Public ASCE 7 formula:

  q (psf) = 0.00256 * V^2   (V in mph)

Output also reports qz at 30 ft using a typical Kz (B 0.70, C 0.85, D 1.03) and standard pressure coefficients (Cp +0.8 windward, -0.5 leeward) for orientation.

Citations: Public ASCE 7 velocity-pressure form.

Originality: Direct evaluation; no licensed table reproduction.

Verification: Unit tests cover q ~ V^2 scaling, Cp values, leeward suction sign, and exposure ordering.

## 20. Snow load (v2)

Public ASCE 7 flat-roof formula:

  Pf = 0.7 * Ce * Ct * Is * Pg

Citations: Public ASCE 7 form.

Originality: Direct evaluation.

Verification: Unit tests cover linear scaling in each factor and the 0.7 base.

## 21. Anchor bolt embedment (v2)

Public bond-strength form:

  T = 0.7 * sqrt(fc) * pi * d * ld
  ld = T / (0.7 * sqrt(fc) * pi * d)

with T in lb, d in in, fc in psi, ld in in.

Citations: Public bond-strength derivation.

Originality: Direct evaluation.

Verification: Unit tests cover linear T scaling, inverse d scaling, and sqrt(fc) scaling.

## 22. Reverse-lay tandem-pump friction (v2)

For a parallel section of supply hose feeding n pumps in tandem, per-pump
friction approximates:

  per_pump_psi = single_pump_psi * (1 / n_pumps)^2

This is a fireground simplification of parallel hose flow assuming equal
pumps and equal flow division.

Citations: NFA hydraulics training; standard parallel-flow simplification.

Originality: Direct evaluation.

Verification: Unit tests cover n=1 -> single, n=2 -> /4, n=4 -> /16.

## 23. Vehicle braking distance (v2)

Customary-units form derived from v^2 = 2*a*d with a = mu * g (in feet)
and 2g ~ 30 (where v is in mph and d is in ft):

  braking_distance_ft = v_mph^2 / (30 * (mu +/- grade%/100))
  reaction_distance_ft = v_mph * 1.467 * t_s

A negative grade (downhill) reduces the effective friction coefficient.

Citations: Standard traffic-engineering form.

Originality: Direct evaluation.

Verification: Unit tests cover v^2 scaling, grade effect, and the v*1.467 reaction term.

## 24. Haversine distance and initial bearing (v2)

Great-circle distance:

  a = sin^2(dphi/2) + cos(phi1) * cos(phi2) * sin^2(dlambda/2)
  c = 2 * atan2(sqrt(a), sqrt(1 - a))
  d = R * c

Earth radius R = 3958.8 mi (6371.0088 km). Initial bearing:

  y = sin(dlambda) * cos(phi2)
  x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(dlambda)
  bearing = atan2(y, x)  (normalized to [0, 360))

Citations: Public great-circle / haversine derivation.

Originality: Direct evaluation.

Verification: Unit tests cover same-point zero distance, 1 degree latitude ~ 69 mi, due-north / due-east bearings, and antipodal distance ~ pi*R.

---

When a new physics-derived calculator is added, this document gets a new section in the same pull request. The reviewer's job is to confirm that each section cites only public physics or public-domain sources and that the verification approach uses worked examples that are themselves traceable to public references.
