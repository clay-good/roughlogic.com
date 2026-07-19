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

## 25. Capstan equation for cable pulling tension (v3, utility 125)

Tension at the head end of a run with bends accumulates per the capstan / Euler equation:

  T_out = T_in * exp(mu * theta)

where mu is the friction coefficient between cable jacket and conduit (dry 0.50, wax 0.35, polymer 0.20 are widely cited engineering benchmarks) and theta is the bend angle in radians. Resistive tension along straight portions is added linearly as mu * w * L, where w is the cable weight per foot. Sidewall pressure at a bend is approximated as T_out / R with R the inside bend radius in feet.

Citations: Capstan equation by name (public-domain mechanics).

Originality: Direct evaluation; head-end (5000 lb) and sidewall (1000 lb/ft) thresholds are widely-cited engineering practice.

Verification: Unit tests cover monotonic growth with bend angle, lubricant ordering, sidewall scaling with radius, and explicit error returns for zero weight, negative run length, unknown lubricant.

## 26. Power factor correction kVAR (v3, utility 127)

Reactive power to move existing PF1 to target PF2 at constant real power kW:

  kVAR = kW * (tan(acos(PF1)) - tan(acos(PF2)))

Capacitance follows from Q = V^2 * 2*pi*f*C at 60 Hz. For three-phase Y, per-leg capacitance uses V_LN = V_LL / sqrt(3) and the per-leg form is C_leg = (kVAR * 1000) / (3 * 2*pi*f * V_LN^2).

Citations: Standard public-domain power engineering form.

Originality: Direct evaluation.

Verification: Unit tests cover kVAR scaling with kW, kVAR larger for lower starting PF, and explicit error returns for PF2 below PF1, kW <= 0, V <= 0, and out-of-range PF.

## 27. Branch voltage drop with multiple loads (v3, utility 129)

With loads sorted by distance, the current carried by segment i is the sum of all loads at distances at or beyond ordered[i]:

  I_seg(i) = sum_{j>=i} I_j
  V_drop(i) = V_drop(i-1) + I_seg(i) * (2 * R_per_kft) * (L_seg / 1000)

Single-phase round-trip resistance (factor of 2) reuses the v1 voltage-drop helper. The worst case is at the farthest load.

Citations: Standard public-domain electrical engineering form.

Originality: Direct evaluation.

Verification: Unit tests cover monotonic drop with distance, aluminum-vs-copper ordering, gauge ordering, percent matches drop / V_source, zero-current zero-drop, and explicit error returns for empty load list and unknown AWG.

## 28e. Fan affinity laws (v3, utility 139)

  Q ~ N    (CFM proportional to RPM)
  P ~ N^2  (static pressure proportional to RPM^2)
  kW ~ N^3 (shaft power proportional to RPM^3)

Solving for RPM given any one of CFM / SP / kW: ratio = target/baseline (linear), sqrt(target/baseline) (SP), or cbrt(target/baseline) (kW).

Citations: Public engineering (fan / pump affinity laws).

Originality: Direct evaluation.

Verification: Unit tests cover doubling RPM doubles CFM / quadruples SP / 8x kW; targeting by SP uses sqrt; targeting by kW uses cbrt; identity at ratio 1; error cases for missing baseline values.

## 28f. V-belt length (v3, utility 140)

  L = 2C + (pi/2)(D + d) + (D - d)^2 / (4C)

driven_RPM = motor_RPM * (D_drive / D_driven). Belt speed (fpm) = pi * D_drive_in / 12 * motor_RPM.

Citations: Public V-belt formula (engineering reference).

Originality: Direct evaluation.

Verification: Unit tests against worked example (4 / 8 in pulleys, 18 in centers ~ 55.07 in), 1:1 ratio when pulleys equal, monotonic in C, orientation-symmetric for length.

## 28g. Compressed-air receiver formula (v3, utility 141)

  V_ft3 = (t_min * (C_demand_scfm - C_pump_scfm) * P_atm_psi) / (P1_psi - P2_psi)

Demand is sum of tool CFM at duty cycle. Convert ft^3 to gallons via 7.4805. Concurrent-tool count (pump alone) is the prefix sum that stays under pump_scfm.

Citations: Public receiver-volume formula (engineering reference).

Originality: Direct evaluation.

Verification: Unit tests cover linear scaling with drawdown, gallon conversion factor, P1 <= P2 error, duty-cycle bounds, empty-list zero-demand.

## 28h. NPSH available (v3, utility 144)

  NPSHa = H_atm - H_vapor +/- H_static - H_friction (feet of water)

H_atm from elevation lapse (29.92 - elevation_ft/1000 in Hg, * 1.133 ft/in Hg). H_vapor interpolated from a public engineering vapor-pressure table converted via 2.31 ft / psi. cavitation_risk flag set when NPSHa < user-supplied NPSHr.

Citations: Standard public-domain pump engineering form.

Originality: Direct evaluation; vapor and atmospheric tables are engineering consensus.

Verification: Unit tests cover H_atm decreasing with elevation, hotter water increasing vapor head, friction subtracting linearly, source-above-pump adding linearly, sea-level baseline 33.95 ft, and explicit error returns for water below 32 F or negative friction.

## 28i. Containment orifice flow (v3, utility 145)

  Q (cfm) = 2610 * A (in^2) * sqrt(delta_P (in wc))

Public orifice-flow form. Recommended NAM count from typical 500 / 1000 / 2000 CFM units.

Citations: Public engineering practice.

Originality: Direct evaluation.

Verification: Unit tests cover linear scaling with leakage area, sqrt scaling with pressure, NAM-rec totals >= required CFM, and error cases for zero volume / pressure / negative leakage.

## 28j. ACI 211 simplified mix design (v3, utility 152)

Water-to-cement ratio interpolated from ACI 211 published curve points by target strength and exposure class. Water content selected by max aggregate size with slump correction (+6 lb / in over 4 in baseline). Cement weight = water / (w/c). Coarse aggregate ~ 1700 lb/yd^3 typical; fine fills the remainder of a ~ 4000 lb/yd^3 cubic-yard mix.

Citations: ACI 211 by name only; values are interpolated public-domain points.

Originality: Direct evaluation.

Verification: Unit tests cover monotonic w/c with strength and exposure class, water/aggregate inverse, slump-water correction, every-exposure-has-6000-psi invariant, error cases.

## 28k. Bolt torque short form (v3, utility 153)

  T = K * D * F

K from lubrication (dry 0.20, oiled 0.18, anti-seize 0.15). F = proof_psi * tensile_area_in2 * preload_fraction. Tensile area per ANSI/ASME B1.1 short-form values per nominal diameter.

Citations: Short-form torque equation by name; ASTM/SAE proof loads cited by name only.

Originality: Direct evaluation.

Verification: Unit tests cover SAE 8 > SAE 5 ordering, anti-seize < dry torque, linear scaling with preload, error cases for unknown grade / lube / unsupported diameter.

## 28l. Sheet-metal bend allowance (v3, utility 154)

  BA = (pi / 180) * angle * (R + K * t)

Flat blank length = leg_a + leg_b + BA - 2 * setback, with setback = (R + t) * tan(angle / 2).

Citations: Bend-allowance formula by name (sheet-metal practice).

Originality: Direct evaluation.

Verification: Unit tests cover BA matches the formula numerically, hard K (0.33) < soft K (0.44) bend allowance, linear scaling with angle, error cases for invalid angle or thickness.

## 28m. SFM-to-RPM machining (v3, utility 155)

  RPM = SFM * 3.82 / D
  IPM = RPM * chipload_ipt * flutes

SFM and chipload by tool / material from public Machinery's Handbook equivalent values.

Citations: Public engineering practice.

Originality: Direct evaluation.

Verification: Unit tests cover material ordering (aluminum > steel SFM), inverse-with-diameter RPM, linear-with-flutes IPM, identity RPM = SFM*3.82/D, error cases.

## 28n. AWS deposition rate (v3, utility 156)

Deposit weight = cross-section * length * 0.283 lb/in^3 (steel). Consumable weight = deposit / efficiency. AWS deposition efficiencies: SMAW 60%, GMAW 90%, FCAW 80%, GTAW 100%. Time = deposit / deposition rate. Shielding gas = process_cfh * minutes / 60.

Citations: AWS deposition benchmarks cited by name only.

Originality: Direct evaluation.

Verification: Unit tests cover GTAW efficiency 100% (deposit = consumable), SMAW > GMAW consumable, SMAW zero gas, GMAW positive gas, deposit linear in length, error cases.

## 28o. ACI 347 formwork pressure (v3, utility 158)

  P = C_w * (150 + 9000R / T)

Capped at the wet-head pressure unit_weight * wall_height. C_w from a public weight factor table (normal 1.0, lightweight 0.85-0.93, plasticized 1.20).

Citations: ACI 347 by name only.

Originality: Direct evaluation.

Verification: Unit tests cover boundary cap behavior (tall pour clamps to wet head), faster pour increases ACI value, lighter concrete reduces ACI value, error cases.

## 28p. Capstan-and-pulley MA with friction (v3, utility 160)

  actual_MA = theoretical_MA * efficiency^pulleys
  haul_force = load / actual_MA

Theoretical MA per rig type (1:1, 2:1, 3:1, 4:1, 5:1, 5:1 piggyback, T-method).

Citations: NFA / NFPA training literature by name only.

Originality: Direct evaluation.

Verification: Unit tests cover 1:1 has no losses, lower efficiency lowers actual MA, haul force = load / actual MA, every rig has positive MA, error cases.

## 28q. Sling angle leg tension (v3, utility 161)

  L = W / (n * sin(theta / 2))

For basket / bridle. Vertical: L = W / n. Choker: divide by published 0.75 reduction factor.

Citations: ASME B30.9 by section number only.

Originality: Direct evaluation.

Verification: Unit tests cover vertical = W/n, small included angle blows up tension (limit case), choker reduction = 0.75, error cases for invalid angle or configuration.

## 28a. Stormwater Rational Method (v3, utility 132)

  Q (cfs) = C * i (in/hr) * A (acres)

C is the runoff coefficient by surface (asphalt 0.95, lawn 0.25, etc.). Convert ft^2 to acres via /43560 and cfs to gpm via *448.831.

Citations: Rational method by name (public engineering practice).

Originality: Direct evaluation; coefficients bundled per public engineering tables.

Verification: Unit tests cover known-area worked example (1 acre asphalt at 1 in/hr ~ 0.95 cfs), surface ordering, zero-rainfall zero-flow, gpm/cfs conversion, error cases.

## 28b. Manning's equation slope solve (v3, utility 133)

English Manning: V = (1.486 / n) * R^(2/3) * S^(1/2). Solve for slope:

  S = ( V * n / (1.486 * R^(2/3)) )^2

Half-full circular pipe: hydraulic radius R = D/4. Self-cleansing velocity = 2 ft/s. Convert ft/ft slope to in/ft via *12.

Citations: Manning's equation (public engineering, Chow Open-Channel Hydraulics).

Originality: Direct evaluation.

Verification: Unit tests cover material ordering (rougher needs more slope), diameter ordering (bigger needs less), R = D/4 invariant, in/ft conversion, error cases.

## 28c. Hydronic expansion tank formula (v3, utility 137)

  V_tank = V_sys * ((rho_cold / rho_hot) - 1) / (1 - (P_initial_abs / P_final_abs))

Pressures absolute (gauge + 14.7). Water densities interpolated from a public-engineering table at the fill and max temperatures.

Citations: Public expansion-tank derivation (cited by name).

Originality: Direct evaluation; water density table is engineering consensus.

Verification: Unit tests verify a worked-example result (100 gal sys 60-200F 12-30 psi yields ~8-9 gal tank), monotonic in volume / max temp, error cases for inverted pressure or temperature inputs.

## 28d. Hydrostatic test pressure and hold (v3, utility 134)

Test pressure = working_pressure * multiplier. Default multiplier 1.5 for water lines, 1.25 for fuel gas (public engineering practice). Hold-time recommendation is a piecewise step function of system volume (15 / 30 / 60 / 240 minutes). Acceptable leak rate is qualitative per published practice.

Citations: Public engineering practice; methodology cited generally.

Originality: Direct evaluation; thresholds piecewise.

Verification: Unit tests verify default multipliers, multiplier override, hold-time piecewise transitions, gas-vs-water note divergence, error cases.

## 28. PoE budget and run distance (v3, utility 131)

Loop resistance of category cable scales linearly with length and is temperature-corrected with copper alpha:

  R_loop = (R_per_100m * (L / 100m)) * (1 + alpha * (T - 20))

Power dissipated as I^2 * R reduces the PD-side budget. Current is sized at PSE port voltage minimum per IEEE 802.3 (44 V for af, 50 V for at / bt):

  I = pse_W / V_source
  V_drop = I * R_loop
  P_loss = I^2 * R_loop
  pd_W   = pse_W - P_loss

Available power at the PD is flagged green / amber / red against the class minimum (af 12.95 W, at 25.5 W, bt3 51 W, bt4 71.3 W).

Citations: IEEE 802.3 by name only; manufacturer category cable resistance (Belden / CommScope) attributed in data shard.

Originality: Direct evaluation.

Verification: Unit tests cover green flag at short Cat6A runs, red flag at long Cat5e bt4 runs, ambient-temperature loss growth, category ordering, and explicit error returns for unknown class / category / negative length.

## 29. Percentile bands over a trailing window (v4, utility 233)

For a series of monthly observations { (t_i, v_i) } sorted ascending by date, the trailing-window percentile band over the last `lookback_months` points is computed by linear interpolation between order statistics. Let `window = points[-lookback_months:]`, sort the values ascending, and for each target percentile `p in {0.25, 0.50, 0.75, 0.90}`:

  idx  = p * (n - 1)        // n = window length
  lo   = floor(idx)
  hi   = ceil(idx)
  frac = idx - lo
  q    = sorted[lo] * (1 - frac) + sorted[hi] * frac

Placement of the latest reading `v_latest` against the band:

  v_latest <= p25            -> "low"
  p25 < v_latest <= p50      -> "normal-low"
  p50 < v_latest <= p75      -> "normal-high"
  p75 < v_latest <= p90      -> "elevated"
  v_latest > p90             -> "high"

Citations: Standard linear-interpolation quantile (Hyndman-Fan type 7; matches the NumPy and spreadsheet defaults). The formula is computed from public statistics; no licensed source is reproduced. Bundled monthly history is sourced from BLS PPI / EIA / USDA NASS / FRED federal series; series IDs and the fetched date are stamped on every shard.

Originality: Direct evaluation. The tool does not interpolate, forecast, or smooth values; it reports the bundled federal readings as published and computes the percentile of the latest reading against the trailing window.

Verification: Unit tests cover the empty-input and short-window error paths, the linear-interpolation case (sorted [10, 20, 30, 40] at p=0.25 -> 17.5), the median of an arithmetic sequence, latest-equals-max placement, and a per-shard freshness check (every bundled commodity's latest point is within 60 days of the shard's fetched date). The build script enforces the same 30-day freshness limit at build time.

## 30. Transformer kVA sizing and FLA (v7, utility 234)

Three-phase: FLA = (kVA × 1000) / (V × √3). Single-phase: FLA = (kVA × 1000) / V.

Required kVA = connected_kVA × (1 + reserve_pct/100). Recommended size = first ANSI/IEEE C57 step ≥ required (15 / 30 / 45 / 75 / 112.5 / 150 / 225 / 300 / 500 / 750 / 1000).

Citations: ANSI/IEEE C57 standard kVA step series by name; NEC 2023 Article 450 (transformer protection) by section.

Verification: 50 kVA at 480V three-phase → primary FLA ≈ 60.1 A. 25 kVA single-phase 240V → 30 kVA recommended (next step), secondary FLA at 120V = 250 A. Step series 15 / 30 / 45 / ... / 1000 verified against ANSI/IEEE C57 published ladder. Edge cases: empty load list errors, missing kVA / watts errors, negative voltage errors, > 1000 kVA caps at 1000 (last step).

## 31. Short-circuit current at panel - Bussmann point-to-point method (v7, utility 235)

For a transformer secondary fault with utility kVA and percent impedance:

  I_sca_secondary = (kVA × 1000) / (V × √phases × Z_pct/100)

For a downstream panel, the multiplier M reduces the let-through fault current per the Bussmann SPD point-to-point formula:

  f = (k × L × I_sca_secondary) / (n × C × V)
  M = 1 / (1 + f)
  I_sca_panel = I_sca_secondary × M

where k = √3 for three-phase or 2 for single-phase, L is run length in feet, n is the number of parallel sets, C is the per-conductor C-value from data/electrical/conductor-c-values.json (Eaton/Bussmann SPD), and V is the secondary line-to-line voltage.

Citations: Bussmann Point-to-Point Method (Eaton/Bussmann SPD electrical-safety publication) by name. C-values cited by Eaton/Bussmann SPD by name only; tariff text not reproduced.

Verification: 1500 kVA at 5.75% Z, 480V three-phase → I_sca_secondary ≈ 31370 A (matches Bussmann SPD canonical worked example). length=0 → M=1 (no drop). Doubling parallel sets halves f. Single-phase numerator factor is 2 instead of √3. Edge cases: zero / negative kVA / Z / V / C errors, parallel_sets < 1 errors.

## 32. Generator sizing for motor starting (v7, utility 236)

Steady running kW = Σ motor_running_kW + non_motor_kW.

Worst-case motor starting kVA per motor:

  starting_kVA = HP × code_kVA_per_HP        (NEMA MG-1 code letter)
  OR starting_kVA = LRA × V × √phases / 1000 (if user supplies LRA)

Required generator kVA under the published 30% voltage-dip criterion:

  required_starting_kVA = (worst_starting_kVA / dip_factor) × starts_factor

where dip_factor defaults to 0.30 and starts_factor is 1.0 (occasional) / 1.15 (frequent) / 1.30 (continuous). Required kW = max(steady_kW, required_starting_kVA × 0.8). Recommended size = first step in 15 / 22 / 35 / 50 / 60 / 80 / ... ≥ required.

Citations: NEMA MG-1 (Motors and Generators) by name; engineering-practice 30% voltage-dip criterion for transient motor starts.

Verification: 25 HP code G (5.6 kVA/HP) → 140 kVA worst-start; with 30% dip → 466.67 kVA required-starting. LRA override path: 200 A LRA at 480V three-phase → 166.3 kVA starting. NEMA MG-1 code-letter coverage A through V verified. Edge cases: empty motor list, unknown code letter, dip factor outside (0,1) all error.

## 33. Service entrance demand load - Standard Method (v7, utility 237)

NEC 2023 Article 220 demand-factor walk (numeric thresholds only; no NEC text reproduced):

  general_VA = area_ft² × 3 + small_appliance_circuits × 1500 + laundry_circuits × 1500
  general_demand_VA:
    if general ≤ 3000:        general
    elif general ≤ 120000:    3000 + (general − 3000) × 0.35
    else:                     3000 + 117000 × 0.35 + (general − 120000) × 0.25
  range_demand:
    ≤ 8 kW:   nameplate
    8-12 kW:  fixed 8000 VA
    > 12 kW:  8000 + (kW − 12) × 0.05 × 1000
  dryer_demand = max(5000, nameplate)            (NEC 220.54)
  fixed_appliance_demand = nameplate × 0.75 if count ≥ 4 else nameplate  (NEC 220.53)
  largest_motor_adder = nameplate × 0.25         (NEC 430.24)
  hvac_demand = max(cooling, heating)            (NEC 220.60)

  total_VA = general_demand + range + dryer + fixed + motor + hvac
  required_A = total_VA / V
  recommended_A = first ladder step (100 / 125 / 150 / 175 / 200 / 225 / 300 / 400) ≥ required

Citations: NEC 2023 Article 220 by section (220.42 / 220.53 / 220.54 / 220.55) + 430.24 (largest motor) + 220.60 (HVAC). Numeric thresholds only.

Verification: 2000 ft² area → general 6000 VA → demand 4050 VA. 40000 ft² area (third tier kicks in) → general 124500 VA → demand 45075 VA. Dryer 3000 W → 5000 W minimum. Range 12 kW → 8000 VA fixed. Range 16 kW → 8200 VA. Fixed 8000 W with 4+ count → 6000 VA (75%). HVAC chooses larger of cooling vs. heating. Largest motor 2000 W → 500 VA adder (25%).

## 34. Joukowsky water-hammer surge (v7, utility 238)

For a closed-conduit pipe full of an incompressible fluid, an instantaneous valve closure produces a pressure surge that propagates upstream as a wave. Joukowsky (1898) gives the wave celerity and the peak pressure rise:

  a = sqrt(K / rho) / sqrt(1 + (K * D) / (E * t))
  dP = rho * a * dV

where K is the fluid bulk modulus, rho is the fluid density, D is the pipe inside diameter (Schedule 40 nominal), t is the pipe wall thickness, E is Young's modulus of the pipe material, and dV is the velocity change at the valve. The reflection time 2L / a determines whether the closure is "rapid" (full Joukowsky surge applies) or "slow" (surge attenuated):

  rapid_closure = (t_close < 2 * L / a)

Citations: Joukowsky (1898) classical-fluids result by name; ASCE Manual of Practice 49 (Pipeline Design for Water and Wastewater) by name; pipe-elastic properties from data/plumbing/pipe-elastic-properties.json.

Originality: Direct evaluation. The unrestricted-pipe celerity for water at 60 F is sqrt(K/rho) ~ 4720 fps, which the elastic-coupling term reduces depending on pipe stiffness.

Verification: Steel pipe celerity falls in 4000-4720 fps band. Copper celerity is below steel's. PEX celerity drops below 1000 fps due to wall compliance. Surge dP scales linearly with velocity. rapid_closure flips at the t_close = 2L/a boundary.

## 35. Pump operating point (v7, utility 239)

The pump operating point is the (Q, H) intersection of the pump curve H_p(Q) and the system curve:

  H_sys(Q) = H_static + k * Q^2

where H_static is the elevation difference plus any back-pressure, and k is the friction coefficient calibrated at the design flow. The pump curve is a manufacturer-attributed polyline; H_p(Q) is computed by linear interpolation between adjacent published points.

The operating point is found by binary search on Q in [0, Q_max] for the root of f(Q) = H_p(Q) - H_sys(Q). At Q=0 the pump dominates (f > 0); at Q_max the system curve dominates (f < 0); a unique crossing exists for any monotone-decreasing pump curve.

Citations: Hydraulic Institute by name; pump curves cited per manufacturer in data/plumbing/pump-curves.json; ship only curves cleared for redistribution.

Originality: Direct numerical root-finding on the bundled polyline.

Verification: Raising H_static moves the operating point left (lower gpm). Increasing k_friction moves the operating point left. At the operating point H_p equals H_sys to within the binary-search tolerance. Static head above shutoff errors. Pump head and system head agree at the returned Q to better than 0.5 ft.

## 36. Pipe thermal expansion and guided-cantilever loop (v7, utility 241)

Linear thermal expansion of a pipe segment:

  dL = alpha * L * dT

where alpha is the per-material coefficient in 1/F (copper 9.4e-6, steel 6.5e-6, PEX 1.1e-4, etc.), L is the run length in feet (converted to inches with the 12-inch factor inside the implementation), and dT is the temperature change.

For an offset expansion loop with a guided-cantilever leg, the leg length needed to absorb |dL| at allowable bending stress S_a is:

  L_loop = sqrt(3 * E * D * |dL| / S_a)

where E is Young's modulus, D is pipe outside diameter, and S_a is the allowable longitudinal stress per material (engineering-practice values: copper 5800 psi, steel A53-B 12500 psi, PEX 1500 psi).

Citations: ASME B31.1 / B31.9 (Power and Building Services Piping) guided-cantilever method by name; per-material alpha / E / S_a from data/plumbing/thermal-expansion-coefficients.json.

Originality: Direct evaluation. ASME B31 series is licensed; the guided-cantilever closed form is reproducible from public piping-engineering texts and is not reproduced from the standard.

Verification: Steel 200 ft x 100 F expansion = 6.5e-6 x 200 x 12 x 100 = 1.56 in (matches example fixture). PEX expands ~17 times more than steel for the same dT. L_loop computed independently matches sqrt(3 * E * D * |dL| / S_a) to within rounding. Negative dT yields negative dL but positive loop leg (uses absolute value).

## 37. Duct friction loss and static pressure (v7, utility 242)

For round duct hydraulic diameter D_h = D; for rectangular duct, the Huebscher equivalent friction diameter is:

  D_eq = 1.30 * (W * H)^0.625 / (W + H)^0.250

Velocity in fpm is V = CFM / A. Velocity pressure VP (in WC) follows the standard duct convention:

  VP = (V_fpm / 4005)^2

Reynolds number Re = V_fps * D_eq / nu_air. The friction factor uses the Swamee-Jain explicit Colebrook-White approximation:

  f = 0.25 / [ log10( eps_ft / (3.7 * D_eq) + 5.74 / Re^0.9 ) ]^2

Pressure drop along the straight duct:

  dP_psf = f * (L / D_eq) * (rho_air * V_fps^2 / (2 * g))
  dP_in_wc = dP_psf / rho_water * 12

Fitting losses sum across the run:

  dP_fit = sum_i ( C_o[i] * VP * count[i] )

Citations: ASHRAE Handbook Fundamentals duct-design chapter and fittings tables by name; engineering-practice consensus C_o values from data/hvac/duct-fittings.json; absolute roughness values from data/hvac/duct-roughness.json.

Verification: 12 in round duct at 1200 CFM gives ~1528 fpm (geometric). Velocity pressure follows (V/4005)^2 to within 0.0001 in WC. Doubling run length doubles straight-duct loss linearly. Rectangular Huebscher D_eq differs from D_h within ~ 1-2 in for a 12x12 duct. User-supplied C_o overrides the library and yields fitting_loss = C_o * VP exactly.

## 38. Refrigerant superheat and subcooling with psig/psia toggle (v7, utility 243)

Saturation temperature at a given absolute pressure is interpolated linearly from the bundled manufacturer P-T table:

  T_sat(P_psia) = lo.T + (P - lo.P) / (hi.P - lo.P) * (hi.T - lo.T)

Per-input gauge / absolute toggle: psia = psig + 14.696 when the input is supplied in psig (the default).

Superheat = T_suction_line - T_sat(P_suction_psia)
Subcool   = T_sat(P_liquid_psia) - T_liquid_line

Manufacturer-typical bands absent a charging chart: 8-12 F superheat, 8-15 F subcool. The tile flags "low" / "in-range" / "high" against these bands.

Citations: Manufacturer-attributed P-T tables (DuPont, Honeywell Solstice, Chemours Opteon, Arkema Forane) by name in data/hvac/refrigerant-pt-tables.json. ASHRAE 34 safety classifications by name.

Verification: psig + 14.696 = psia per the standard atmospheric conversion (regression test bundles both forms and asserts identical superheat / subcool to within 0.05 F). Superheat and subcool match T_line - T_sat and T_sat - T_line directly. P-T table for each of the five refrigerants is monotone-increasing in T as a function of P. Out-of-band superheat (35 F line at 130 psig R-410A) flags "low"; 75 F flags "high".

## 39. Cooling tower approach and range (v7, utility 244)

  Range    = T_in - T_out
  Approach = T_out - T_wb
  Heat rejection (BTU/hr) = gpm * 500 * range

The constant 500 derives from water properties at 60 F: 8.34 lb/gal * 60 min/hr * cp_water (1 BTU/lb-F) ~ 500 BTU/(hr * gpm * F). Fan kW per ton uses 12000 BTU/hr per ton of refrigeration: kW_per_ton = fan_kW * 12000 / heat_rejection.

Citations: Cooling Technology Institute (CTI) standard practice by name; ASHRAE Handbook (HVAC Systems and Equipment) cooling-tower chapter by name.

Verification: 95-85 F (range 10) at 600 gpm yields 600 * 500 * 10 = 3 000 000 BTU/hr (250 tons). Fan 7.5 kW at 250 tons gives 0.030 kW/ton. Approach 7 F flags "in-range (5-10)"; 4 F flags "tight"; 13 F flags "wide". Errors fire on T_out >= T_in, T_wb >= T_out, or zero gpm.

## 40. Pipe / duct insulation bare vs. insulated heat loss (v7, utility 245)

For a cylindrical pipe of OD D_o with insulation of thickness t and thermal conductivity k:

  r1 = D_o / 2,  r2 = r1 + t      (per foot of length)
  R_cond = ln(r2 / r1) / (2 * pi * k)
  R_outside = 1 / (h_outside * 2 * pi * r2)
  Q_insulated = (T_s - T_a) / (R_cond + R_outside)

The outer-surface film coefficient combines convection and radiation:

  h_conv = 0.225 + 0.000625 * V_fpm                         (engineering approximation)
  h_rad  = eps * 0.1714e-8 * ((T_s_R^2 + T_a_R^2)(T_s_R + T_a_R))   (Stefan-Boltzmann)
  h_outside = h_conv + h_rad

Outer-surface temperature T_s2 enters the radiative term and is solved iteratively (12 fixed-point iterations from an initial guess of T_s - 0.7 * dT). Bare-pipe Q is the same expression with R_cond = 0 and r2 = r1.

Citations: ASHRAE Handbook Fundamentals chapter 25 (insulation) by name; ASTM C680 (cylindrical surface conditions) by name; manufacturer k-values in data/hvac/insulation-k-values.json.

Verification: 2.375 in OD (Schedule-40 2 inch) at 200 F surface, 70 F ambient, 1.5 in fiberglass insulation produces a non-trivial bare loss > 0 and Q_insulated < Q_bare. Thicker insulation reduces Q_insulated (regression test: 0.5 in vs 2.0 in). Lower-k polyiso reduces Q vs fiberglass at the same thickness. Outer-surface T falls between ambient and pipe surface. Zero thickness yields ~ 0% effectiveness (R_cond = 0).

## 41. Stair stringer layout with code check (v7, utility 246)

  riser_count   = ceil(total_rise / target_rise)
  exact_rise    = total_rise / riser_count
  total_run     = (riser_count - 1) * target_tread
  stringer_len  = sqrt(total_rise^2 + total_run^2)
  theta         = atan2(total_rise, total_run)
  throat        = stringer_thickness * cos(theta) - exact_rise * sin(theta)

Pass/fail uses user-entered local-code rise max and tread min: rise_pass = exact_rise <= code_max_rise; tread_pass = (target_tread + nosing) >= code_min_tread.

Citations: First-principles geometry. IRC 2021 Section R311.7 referenced by name; the user supplies the AHJ's adopted max rise and min tread. The tool deliberately does not bundle a per-jurisdiction code shard.

Verification: 109 in / 7 in target gives 16 risers and exact rise 6.8125 in. Stringer hypotenuse equals sqrt(rise^2 + run^2) to within rounding. Forced-fail cases verify both rise and tread flags.

## 42. Hip, valley, and jack rafter schedule (v7, utility 247)

For a roof at pitch P (rise per 12 in run), the common-rafter run multiplier is:

  m_common = sqrt(P^2 + 144) / 12

The hip / valley rafter travels along the diagonal of a P-by-12-by-12 wedge:

  m_hip = sqrt(P^2 + 288) / 12

The 16.97 in diagonal of a 12-by-12 square is the carpentry framing-square's hip / valley reference value (sqrt(2 * 12^2)). Common-rafter length = run * m_common; hip rafter length = run * m_hip; jack-rafter shortening per OC = oc * m_common.

Citations: Carpentry framing-square method by name. Public layout taught in any framing-square reference (Steel Square Pocket Book, Audel's Carpenters and Builders Library) by name.

Verification: At pitch 6/12, m_common = sqrt(36 + 144) / 12 = 13.4164 / 12. At pitch 0, m_hip = sqrt(288) / 12 = 16.97 / 12. Hip length always exceeds common length by geometry. Jack count grows as the building run grows.

## 43. Rebar bend allowance and weight schedule (v7, utility 248)

  cut_length_ft = straight_ft + bend_allowance_in / 12
  bend_allowance_in = sum over bend types of (multiplier * bar_diameter_in)
  row_weight_lb = cut_length_ft * unit_weight_lb_per_ft * pieces

Bend-type multipliers (CRSI / engineering practice): bend_90 = 6 db, bend_135 = 6 db, bend_180 = 4 db, stirrup = 14 db (total stirrup tie), hook = 6 db.

Citations: ASTM A615 nominal bar weights and diameters by name. CRSI Manual of Standard Practice by name. ACI 318-19 by name.

Verification: #5 bar (db = 0.625 in) with two 90 deg bends adds 12 * 0.625 = 7.5 in to the cut length. #4 stirrup (db = 0.500) adds 14 * 0.5 = 7 in. Row weight = cut_length * unit_weight * pieces. Unknown bar size errors. Empty-row input errors.

## 44. Helical pile torque-to-capacity (v7, utility 250)

  ultimate_capacity_lb = Kt * installation_torque_ft_lb
  allowable_capacity_lb = ultimate / factor_of_safety

Kt by shaft (engineering practice): 1.5 in solid 10, 1.75 in solid 9, 2.875 in pipe 7, 3.5 in pipe 5. Larger / smoother shafts have smaller Kt (more conservative).

Citations: ICC-ES Acceptance Criteria AC358 (helical foundation systems) by name; manufacturer technical bulletins (CHANCE, Magnum, Ram Jack, AB Chance) by name.

Verification: 4500 ft-lb torque on a 1.5 in solid shaft (Kt = 10) gives 45000 lb ultimate, 22500 lb allowable at FS = 2.0. Larger 3.5 in pipe (Kt = 5) gives less capacity at the same torque (more conservative). FS < 1 errors. Zero torque errors.

## 45. Crane lift plan quick-math (v7, utility 251)

  gross_load_lb = load + rigging + block + jib_deduct
  per_leg_tension_lb = load / (n * sin(theta / 2))     (basket / bridle)
  percent_of_chart = gross_load / chart_capacity * 100
  flag = "GREEN" (< 75 percent) | "YELLOW" (75-90 percent) | "RED" (>= 90 percent)

The tool refuses to render percent-of-chart unless the user has entered the chart capacity for the supplied boom length, angle, and radius. The crane manufacturer's load chart is never reproduced.

Citations: ASME B30.5 (Mobile and Locomotive Cranes) by name and section. ASME B30.9 (Slings) for the per-leg formula. OSHA 29 CFR 1926 Subpart CC (cranes and derricks) by section.

Verification: gross load = sum of four contributions. Per-leg tension at 60 deg sling, 4 legs, 8000 lb load equals 8000 / (4 * sin(30)) = 4000 lb. Below 75 percent flags GREEN; 75-90 percent flags YELLOW; >= 90 percent flags RED. Refuses output when chart_capacity = 0 (input incomplete) and surfaces the load-chart-governs message.

## 46. ISO Needed Fire Flow (v7, utility 252)

  Ci = 18 * F * sqrt(A_eff)        (capped at 8000)
  A_eff = footprint * min(stories, 3)   for non-fire-resistive
  A_eff = footprint                     for fire-resistive (class 5/6)
  X = exposure factor by distance band: 0 ft >= 150 ft to 0.25 within 10 ft
  NFF_raw = Ci * Oi * (1 + X + P)
  NFF = round-to-250(NFF_raw), floored at 500, capped at 12 000

F values per ISO PPC: Frame 1.5; Joisted masonry 1.0; Noncombustible 0.8; Masonry noncombustible 0.8; Modified fire-resistive 0.6; Fire-resistive 0.6.

Citations: ISO Public Protection Classification (PPC) Schedule by name. Cited by name only; the schedule's commentary is not reproduced.

Verification: Class 2 (F=1.0), 5000 ft^2, 1 story gives Ci_raw = 18 * 1.0 * sqrt(5000) ~ 1273. Stories cap at 3 for non-fire-resistive (regression: stories=3 and stories=10 give the same A_eff). Fire-resistive stops the multiplier (A_eff = footprint regardless of stories). NFF rounded to nearest 250 gpm. Floor 500, cap 12 000 verified at the extremes. X by distance: 8 ft = 0.25, 200 ft = 0.

## 47. Fall protection clearance (v7, utility 253)

  required_clearance_ft = free_fall + decel + worker_height + harness_stretch + safety_factor
  remaining_clearance_ft = actual_clearance - required_clearance

Defaults: free-fall 6 ft for personal fall arrest (29 CFR 1926.502(d)(16)); decel 3.5 ft for shock-absorbing lanyard or 1.0 ft for SRL (manufacturer typical); worker height 5 ft (D-ring to feet); harness stretch 1 ft; safety factor 1 ft. Per-input override exposes user-supplied free-fall and decel values.

Citations: 29 CFR 1926.502 by section. ANSI Z359 by name. Manufacturer connector benchmarks (3M / Capital Safety, MSA, Honeywell-Miller) in data/cross/fall-protection-benchmarks.json.

Verification: 6 ft lanyard + 3.5 ft decel + 5 + 1 + 1 = 16.5 ft required. SRL connectors give shorter required clearance than shock-absorbing lanyards. PASS / FAIL flags fire correctly. free_fall_ft_override and decel_ft_override are honored. Negative remaining clearance (10 ft actual vs 16.5 ft required) flags FAIL.

## 48. Panel loading and phase rebalance (v8 Phase E.1, utility 254)

  total[A] = sum of single-leg amps on phase A    (likewise B and C)
  mean = (total[A] + total[B] + total[C]) / 3
  imbalance_pct = (max(totals) - min(totals)) / mean * 100

Greedy swap suggestion: when imbalance_pct > 5, find the heaviest phase H and the lightest phase L; iterate the H-side single-leg circuits sorted descending by amps; for each candidate c, project the post-swap totals (H -= c.amps, L += c.amps) and the post-swap imbalance; the first candidate whose projected imbalance is strictly less than the current imbalance is the suggestion. An optional `swappable_pairs` constraint restricts the search to circuit indices that the user has flagged as breaker-position-compatible.

Citations: NEC 2023 Article 220 (load calculations) and Section 408.36 (panel rating) by section. NEMA MG-1 by name for the imbalance / horsepower derate cited adjacent to the result.

Verification: Balanced panel (20-20-20) yields 0 imbalance and no suggestion. A 30-30-0 panel (forced to A=60, B=30, C=30) gives mean=40, max-min=30, imbalance 75%. Suggestion projected_imbalance < current_imbalance always. swappable_pairs constraint correctly excludes circuits not in any listed pair.

## 49. Duct leakage test-and-balance (v8 Phase E.3, utility 255)

  leakage_cfm = max(0, design_cfm - measured_cfm)
  leak_at_1inwc = leakage_cfm / sqrt(test_pressure_inwc)
  leak_per_100ft2 = leak_at_1inwc / duct_surface_ft2 * 100
  effective_class = smallest SMACNA class (3, 6, 12, 24, 48) whose limit
                    is greater than or equal to leak_per_100ft2
  pass = leak_per_100ft2 <= target_class_limit

The sqrt(P) scaling is the orifice-flow regression: leakage at any test pressure converts to the SMACNA reference at 1 in WC by dividing by sqrt(P_inwc). Class numbers are the SMACNA-published constants (Class 3 = sealed metal best practice; Class 48 = severely-leaking duct).

Citations: SMACNA Duct Leakage Test Manual (3rd ed.) by name. ASHRAE 90.1-2022 Section 6.4.4.2 references the leakage-class system.

Verification: 60 CFM lost at 1 in WC normalizes to the same physical leak as 60 * sqrt(2) at 2 in WC (regression test). 60 / 600 ft^2 * 100 = 10 CFM/100ft^2 fails Class 6 (limit 6) but passes Class 12 (limit 12). Zero leakage yields effective class 3.

## 50. Residential framing package (v8 Phase E.4, utility 256)

  stud_count = ceil(perimeter_ft / stud_oc_ft) + 8       (corner + T allowance)
  plate_lf = ceil(perimeter_ft * 3 * 1.10)                (sole + 2 top + 10% waste)
  joist_count = ceil(footprint_ft2 / (joist_span_ft * joist_oc_ft)) + 2
  rafter_length_ft = building_run_ft * sqrt(P^2 + 144) / 12
  rafter_count = ceil(approx_length / rafter_oc_ft) * 2 + 2  (both sides + ridge ends)
  bf_per_ft = { 2x4: 0.667, 2x6: 1.0, 2x8: 1.333, 2x10: 1.667, 2x12: 2.0 }
  total_bf = stud_bf + plate_bf + joist_bf + rafter_bf

Citations: IRC 2021 Tables R502.5 (joist spans), R602.5 (stud schedules), R802.5.1 (rafter spans). Board-feet conventions per WWPA standard grading rules. Common-rafter run multiplier from utility 247.

Verification: 144 ft perimeter at 16 in OC studs gives 144 / (16/12) = 108; +8 corner allowance = 116 studs. Plate lf = ceil(144 * 3 * 1.10) = 476 lf. 24 in OC reduces stud count vs 16 in OC. Rafter length matches building_run * common multiplier.

## 51. Coagulant dose from jar test (v8 Phase E.5, utility 257)

  pure_lb_day = flow_MGD * jar_dose_mg_L * 8.34
  product_lb_day = pure_lb_day / (strength_pct / 100)
  product_density_lb_per_gal = sg * 8.34
  product_gal_day = product_lb_day / product_density_lb_per_gal

Manufacturer products bundled: alum_dry (100%, sg 1.0), alum_liquid (48.5%, sg 1.33), ferric_chloride (38%, sg 1.40), pac_liquid (10%, sg 1.20). The 8.34 factor is the physical-fact mass per gallon of water at 60 F.

Citations: Metcalf and Eddy (Wastewater Engineering: Treatment and Resource Recovery, 5th ed.) by name. AWWA M37 (Operational Control of Coagulation and Filtration Processes) by name. Manufacturer product strengths and densities cited per row.

Verification: 5 MGD * 20 mg/L * 8.34 = 834 lb/day pure. Alum dry equals pure (100% strength). Alum liquid 48.5% requires 100/48.5 ~ 2.06 times more product than dry (regression test). Product gal/day = lb/day / (sg * 8.34).

## 52. Straight-line depreciation (v5 Step 58, utility 234)

  annual = (cost - salvage) / useful_life_years
  accumulated(y) = annual * y
  book_value(y) = cost - accumulated(y)

Citations: IRS Publication 946 Chapter 1 (Straight-Line Method) by name only. No reproduction of Pub 946 text.

Verification: $50,000 cost, $5,000 salvage, 10-year life: annual = $4,500; year-3 accumulated = $13,500; year-3 book value = $36,500. The arithmetic is invariant under year choice up to the recovery period; the test fixture asserts this directly.

## 53. MACRS depreciation (v5 Step 58, utility 235)

For 3 / 5 / 7 / 10-year property under the half-year convention, the IRS bundles a fully-resolved 200% declining-balance schedule that switches to straight-line in the optimal year. For 15 / 20-year property the same table uses 150% DB. The percentages in MACRS_TABLES are the published values from Pub 946 Table A-1 to four-decimal precision; the calculation is just multiplication:

  depreciation(year) = cost * percent_table[class_life][year] / 100

Citations: IRS Publication 946 Tables A-1 (half-year convention, 3 / 5 / 7 / 10-year 200% DB and 15 / 20-year 150% DB) by table number only.

Verification: 5-year row sums to 100.00%, 7-year row sums to 100.00 (within published rounding), and applying the table to a $10,000 asset returns $2,000 in year 1 (matches Pub 946 Appendix A worked example for 5-year property).

## 54. Section 179 / Bonus depreciation interaction (v5 Step 58, utility 236)

  business_basis = cost * (business_use_pct / 100)
  phaseout_overage = max(0, business_basis - phaseout_start)
  dollar_cap = max(0, annual_cap - phaseout_overage)
  sec179 = min(business_basis, dollar_cap, taxable_income)
  after_179 = business_basis - sec179
  bonus = after_179 * (bonus_pct / 100)
  remaining_basis_to_macrs = after_179 - bonus

Citations: IRC 179 (Election to expense certain depreciable business assets), IRS annual Rev. Proc. for the inflation-adjusted cap and phase-out threshold. Bonus depreciation per IRC 168(k) with the TCJA phase-down (80 / 60 / 40 / 20 percent for 2023 / 2024 / 2025 / 2026).

Verification: At cost = phaseout_start + $100k, dollar_cap drops by exactly $100k (phaseout is dollar-for-dollar). business_use_pct = 50 halves the basis. Bonus applies to the residual after Section 179, never the original cost.

## 55. Self-Employment tax (v5 Step 58, utility 237)

  net_adjusted = net_se_earnings * 0.9235
  ss_taxable = min(net_adjusted, ss_wage_base - w2_ss_wages)
  ss_tax = ss_taxable * 0.124
  medicare_tax = net_adjusted * 0.029
  addl_medicare = max(0, net_adjusted - threshold(filing_status)) * 0.009
  se_tax = ss_tax + medicare_tax + addl_medicare
  deductible_half = (ss_tax + medicare_tax) / 2

Citations: Schedule SE (Form 1040). SSA wage-base announcement (annual). IRC 3101(b)(2) for the Additional Medicare 0.9% threshold. The 92.35% adjustment is the inverse of the employer-side FICA grossing-up the SE earner pays both halves of.

Verification: $100k net SE -> $92,350 adjusted; SS tax saturates at the wage base; W-2 wages already at the SS cap zero out the SE SS portion; net SE below $400 returns $0 (Schedule SE filing threshold); deductible half is exactly half of (SS + Medicare), not half of total SE tax (Additional Medicare is not deductible).

## 56. Quarterly estimated-tax safe harbor (v5 Step 58, utility 238)

  required_annual_payment = min(0.90 * projected_current_tax, multiplier * prior_year_tax)
  multiplier = 1.10 if prior-year AGI > $150k else 1.00
  per_quarter = max(0, required_annual_payment - current_withholding) / 4

Citations: IRC 6654(d)(1)(B). IRS Form 1040-ES (current year) for the quarterly schedule.

Verification: Required = min(90% current, 100/110% prior); withholding subtracts from the required total; due dates roll forward each year per the bundled ESTIMATED_TAX_DUE_DATES table.

## 57. Standard amortization payment formula (v5 Step 58, utility 240)

The standard fixed-payment installment formula:

  P = (r * PV) / (1 - (1+r)^-n)

where r is the periodic rate (annual rate / 12 for monthly), PV is principal, and n is the number of periods. The schedule recurrence:

  interest_i = balance_(i-1) * r
  principal_i = P - interest_i + extra_principal
  balance_i = balance_(i-1) - principal_i

When extra principal is supplied, the payoff month shrinks because each row reduces the balance by more than the amortization curve assumed.

Citations: standard mortgage / installment-loan formula; first principles. Cross-check against any published mortgage calculator.

Verification: $250,000 at 6.5% over 360 months yields $1,580.17/month (matches published examples). Zero rate degenerates to principal/n. Sum of principal columns equals principal. Final balance is below 1 cent. Extra principal strictly reduces both payoff month and total interest.

## 58. Breakeven and contribution-margin algebra (v5 Step 58, utility 241)

  CM = sale_price - variable_cost
  CM_ratio = CM / sale_price
  breakeven_units = fixed_costs / CM
  breakeven_revenue = breakeven_units * sale_price
  margin_of_safety_units = max(0, target - breakeven_units)
  margin_of_safety_pct = margin_of_safety_units / target

Citations: standard cost-volume-profit identity. First principles.

Verification: $50k FC, $20 SP, $8 VC -> CM $12, CM ratio 60%, breakeven 4166.67 units. Sale price <= variable cost errors (no positive CM means no breakeven).

## 59. Cash conversion cycle (v5 Step 58, utility 244)

  CCC = DIO + DSO - DPO

A standard working-capital identity. Days inventory outstanding plus days sales outstanding minus days payables outstanding equals the number of days a dollar is tied up between buying inventory and collecting cash.

Citations: standard working-capital identity. First principles.

Verification: example values 60 / 45 / 30 -> 75 days. Negative CCC is meaningful (suppliers finance the operation; see Amazon, Apple) and is preserved.

## 60. Statutory judgment interest (v5 Step 59, utility 246)

  simple:    interest_period = balance * rate * (days / 365)
  compound:  factor = (1 + rate/365)^days
             interest_period = balance * (factor - 1)

The U.S. Rule applies partial payments to accrued interest first, with any remainder reducing principal:

  to_interest = min(accrued_interest, payment)
  remainder = payment - to_interest
  accrued_interest -= to_interest
  balance = max(0, balance - remainder)

Citations: per-state judgment-interest statute (e.g., Cal. Civ. Proc. Code 685.010 simple, Colo. Rev. Stat. 5-12-102 compound). Story v. Livingston, 38 U.S. (13 Pet.) 359 (1839) for the U.S. Rule.

Verification: $10,000 at 10% simple in California for one year = ~$1,000 (test fixture). Compound (Colorado, 8%) over the same period exceeds simple at the same rate. Full repayment zeroes the principal. Per-day accrual at end uses the post-payment balance.

## 61. Court-day computation (v5 Step 59, utility 247)

Calendar day:
  end = trigger + N
  while end is Saturday, Sunday, or legal holiday: end = end + 1

Court day:
  count = 0; cursor = trigger
  while count < N:
    cursor = cursor + 1
    if cursor is Saturday, Sunday, or legal holiday: skip (do not count)
    else: count += 1
  while cursor still inaccessible: cursor = cursor + 1

Citations: Fed. R. Civ. P. 6(a)(1) (calendar-day periods stated in days), 6(a)(2) (court-day periods less than 11 days, certain rules), 6(a)(3) (inaccessible day rollover), 6(a)(6) (legal holiday definition).

Verification: 2025-07-01 + 30 calendar days = 2025-07-31 (a Thursday, no rollover). 2025-07-01 + 4 calendar days = 2025-07-07 (lands Saturday, rolls to Monday). 2025-07-01 + 5 court days = 2025-07-09 (skip 7/4 holiday and 7/5-6 weekend; count 7/2, 7/3, 7/7, 7/8, 7/9).

## 62. Molecular weight parser (v5 Step 60, utility 257)

The chemical formula parser is recursive-descent over three token kinds: element ([A-Z][a-z]? followed by optional integer subscript), open paren, close paren followed by optional integer multiplier. The grammar:

  formula  := group EOF
  group    := ( atom | "(" group ")" multiplier? )*
  atom     := ELEMENT subscript?
  multiplier := INTEGER

Parser walks tokens with a position cursor and a stack-free recursion; on "(" it recurses, on ")" it returns and the caller reads any post-paren multiplier and applies it to the inner tally. MW = sum over (atomic_weight[symbol] * count). Unknown element symbol errors.

Citations: IUPAC Standard Atomic Weights 2021 (bundled in IUPAC_ATOMIC_WEIGHTS).

Verification: NaCl, C6H12O6, K2HPO4, (NH4)2SO4, Ca(OH)2, Fe2(SO4)3, Na2SO4 all match to within 0.01 g/mol of the textbook values computed independently. Unknown element symbol returns an error rather than a silent miss.

## 63. Centrifuge RCF (v5 Step 60, utility 259)

  RCF (g) = 1.118e-5 * r(cm) * RPM^2

Both directions:

  RPM = sqrt( RCF / (1.118e-5 * r_cm) )

Citations: standard centrifuge formula. r is the rotor radius (typically r_max for bottom-of-tube g; some manufacturers provide r_min for top-of-tube g).

Verification: 84 mm rotor at 14000 rpm yields ~18412 g (matches Eppendorf 5424 published RCF for the FA-45-30-11 rotor at max speed). Round-trip RPM->RCF->RPM stays within floating-point precision.

## 64. Beer-Lambert (v5 Step 60, utility 262)

  A = epsilon * c * L  =>  c = A / (epsilon * L)

Citations: Beer-Lambert law (Beer 1852, Lambert 1760). Path length L in cm; molar extinction epsilon in M^-1 cm^-1; concentration in M.

Verification: A = 0.5 with L = 1 cm and epsilon = 50,000 M^-1 cm^-1 gives c = 1e-5 M (matches textbook spectrophotometry problems). Linearity in absorbance verified by doubling A and observing concentration doubles.

## 65. Henderson-Hasselbalch (v5 Step 60, utility 263)

  pH = pKa + log10([A-] / [HA])
  ratio = 10^(pH - pKa)
  fraction_base = ratio / (ratio + 1)
  fraction_acid = 1 - fraction_base
  moles_base = total_buffer * total_volume * fraction_base
  moles_acid = total_buffer * total_volume * fraction_acid

Citations: Henderson-Hasselbalch equation (Henderson 1908, Hasselbalch 1917). pKa values for common laboratory buffers from CRC Handbook of Chemistry and Physics 95th ed. (Tris, phosphate, acetate, bicarbonate) and Good et al., Biochemistry 5(2): 467 (1966) for the "Good's buffers" (HEPES, MES, MOPS, PIPES).

Verification: pH = pKa returns ratio 1.00 exactly (50/50 base / acid). Total moles equals total_buffer * total_volume.

## 66. Hemocytometer cell count (v5 Step 60, utility 264)

For an improved Neubauer hemocytometer, each large corner square is 1 mm * 1 mm * 0.1 mm = 1e-4 mL = 0.1 uL.

  cells_per_mL = (total_cells_counted / squares_counted) * 10^4 * dilution_factor
  viability_pct = (total_cells - dead_cells) / total_cells * 100

Citations: standard cell-counting convention (improved Neubauer chamber). Trypan-blue viability convention: dead cells take up the dye and stain blue.

Verification: 200 cells across 4 squares at 2x dilution = 50 avg/sq * 1e4 * 2 = 1.0e6 cells/mL.

## 67. Magnetic declination, inclination, and field intensity (v9 §F.1, magnetic-declination)

The Earth's main magnetic field is modeled as the negative gradient of a scalar potential V whose spherical-harmonic expansion runs to degree N = 12:

  V(r, theta, lambda, t) = a * sum_{n=1..N} (a / r)^{n+1} * sum_{m=0..n} [g_n^m(t) cos(m lambda) + h_n^m(t) sin(m lambda)] * P_n^m(cos theta)

where r is geocentric radius, theta is colatitude, lambda is longitude, a = 6371.2 km is the geomagnetic reference radius, P_n^m is the Schmidt semi-normalized associated Legendre function, and the Gauss coefficients g_n^m(t), h_n^m(t) are linear in time:

  g_n^m(t) = g_n^m(t_0) + (t - t_0) * dg_n^m / dt
  h_n^m(t) = h_n^m(t_0) + (t - t_0) * dh_n^m / dt

The field components in geocentric spherical coordinates are:

  X' (north) = +(1/r) dV/dtheta = sum_{n,m} (a/r)^{n+2} [g cos + h sin] dP_n^m/dtheta
  Y' (east)  = -(1/(r sin theta)) dV/dlambda = sum_{n,m} (a/r)^{n+2} m [g sin - h cos] P_n^m / sin theta
  Z' (down)  = dV/dr = -sum_{n,m} (n+1) (a/r)^{n+2} [g cos + h sin] P_n^m

Geodetic latitude phi is converted to geocentric latitude phi' on the WGS84 ellipsoid (a = 6378.137 km, b = 6356.7523142 km); the geocentric components are rotated back to geodetic (X, Y, Z) by psi = phi' - phi. Derived quantities:

  H = sqrt(X^2 + Y^2)
  F = sqrt(H^2 + Z^2)
  D = atan2(Y, X)   (declination, deg)
  I = atan2(Z, H)   (inclination, deg)

Secular variation rates dD/dt, dI/dt, dH/dt, dF/dt follow from differentiating the field-magnitude expressions and applying the chain rule.

Citations: NOAA NCEI World Magnetic Model 2025 (WMM2025), public domain, free at ncei.noaa.gov/products/world-magnetic-model. The coefficient file bundled at data/field/wmm/coefficients.json is WMM2025.COF verbatim (90 rows to degree 12). The algorithm is the canonical NCEI WMM C reference (public-domain) ported to JavaScript.

Originality: Direct evaluation of a public-domain coefficient bundle. The Schmidt-normalized recurrences are textbook (Heiskanen and Moritz, "Physical Geodesy," 1967, sec. 1-14; NCEI WMM Technical Report 2025, Eqs. 11-15). No copyrighted table content is reproduced; only the published coefficient file, which NOAA releases as public domain.

Verification: Every row of the bundled NCEI WMM2025_TestValues.txt (100 vectors spanning 2025.0 to 2029.5 across the globe and altitudes 0-100 km) is exercised in test/unit/calc-field-v9.test.js. Max errors over the full table: declination 0.005 deg, inclination 0.005 deg, H 0.001 nT, F 0.000 nT, at NCEI's published precision.

## 68. Veterinary energy and fluid math (v12 §5, Groups U.2 / U.3 / U.14 / U.16)

Resting Energy Requirement (RER) is an allometric scaling of basal metabolism to body mass. The constant 70 and exponent 0.75 are the Kleiber-line fit (Kleiber, "Body size and metabolism," Hilgardia 6:11, 1932; restated as `RER_kcal_per_day = 70 * BW_kg^0.75` across the AAHA-AAFP Life Stage Guidelines):

  RER_kcal_per_day = 70 * weight_kg^0.75
  MER_kcal_per_day = RER * activity_factor   (AAHA published factors)

Maintenance fluid rate for small animals adapts Holliday-Segar (Holliday and Segar, "The Maintenance Need for Water in Parenteral Fluid Therapy," Pediatrics 19:5, 1957) to veterinary practice (DiBartola, Fluid, Electrolyte, and Acid-Base Disorders in Small Animal Practice, 4th ed., Ch. 16). The 60 mL/kg/day rule of thumb for dogs and cats is the integral of the 4-2-1 rule over a typical small-animal weight range:

  maintenance_mL_per_hr = (weight_kg * 60) / 24
  replacement_mL = weight_kg * dehydration_fraction * 1000   (1 mL = 1 g body-water deficit)
  total_mL_per_hr = maintenance + replacement / hours + ongoing_losses

Steady-state plasma concentration (U.16) is the textbook intravenous-infusion identity (Riviere and Papich, Veterinary Pharmacology and Therapeutics, 10th ed., Ch. 3):

  Css = (Dose * F) / (CL * tau)

where F is the bioavailability fraction (1.0 for IV), CL is patient clearance, and tau is the dosing interval. Patient CL is the per-kg literature value times body weight.

Citations: Kleiber 1932 by name; Holliday and Segar 1957 by name (Pediatrics article, public via PubMed Central); DiBartola 4th ed. (Saunders / Elsevier, cited by edition only); AAHA Canine Life Stage Guidelines (2019) and AAHA-AAFP Feline Life Stage Guidelines (2021), open-access at aaha.org and catvets.com; Riviere and Papich 10th ed. cited by name.

Verification: a 10 kg dog at 70 * 10^0.75 = 393.6 kcal/day RER matches the worked example in DiBartola Table 16-1; maintenance 25 mL/hr matches the same table. Css worked example: 100 mg every 8 hr at F = 1.0, CL = 5 mL/kg/min over 10 kg = 50 mL/min = 3000 mL/hr; tau = 8 hr; Css = 100,000 ug / (3000 mL/hr * 8 hr) = 4.167 ug/mL.

## 69. Burn fluid resuscitation and TBSA estimation (v12 §6, Groups V.2 / V.3)

The Parkland formula (Baxter, "Fluid Volume and Electrolyte Changes in the Early Post-burn Period," Clinics in Plastic Surgery 1:4, 1974; adopted by the American Burn Association and ATLS) computes 24-hour crystalloid resuscitation volume from body weight and the burned fraction of total body surface area:

  total_24hr_mL = 4 * weight_kg * TBSA_percent
  first_8hr_mL = total_24hr_mL / 2
  hourly_0_to_8 = first_8hr_mL / 8
  hourly_8_to_24 = (total_24hr_mL - first_8hr_mL) / 16

TBSA is summed from regional contributions. Rule of 9s (Pulaski and Tennison, "Estimation of the area of burns," Surgery, 1947) applies the adult-anatomy bands: head 9, each arm 9, anterior trunk 18, posterior trunk 18, each leg 18, perineum 1. Lund-Browder (Lund and Browder, "The estimation of areas of burns," Surgery, Gynecology and Obstetrics 79, 1944) replaces the head and leg bands with age-banded values to correct the head-vs-leg surface-area drift between infant (head ~ 19%, each leg ~ 13%) and adult (head ~ 7%, each leg ~ 18%).

Citations: Baxter 1974 by name; Pulaski and Tennison 1947 by name; Lund and Browder 1944 by name. All three articles are pre-Bayh-Dole, pre-DMCA, and cited extensively in public textbooks (ATLS 10th ed., ABA Burn Center referral criteria).

Verification: 70 kg adult / 30% TBSA / Parkland = 4 * 70 * 30 = 8,400 mL over 24 hr; first 8 hr = 4,200 mL = 525 mL/hr; hours 8-24 = 4,200 mL / 16 hr = 262.5 mL/hr. Matches the canonical worked example in ATLS Student Course Manual 10th ed. Ch. 9.

## 70. Aviation: density altitude, true airspeed, crosswind (v12 §7, Groups W.1 / W.2 / W.3 / W.10)

Density altitude is the pressure altitude corrected for non-ISA temperature. The standard-atmosphere temperature at pressure altitude PA (feet) is ISA_C = 15 - 1.98 * PA / 1000. The DA approximation in the FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 4 is:

  DA_ft = PA_ft + 120 * (OAT_C - ISA_C)

True airspeed corrects calibrated airspeed for the density ratio (ICAO Standard Atmosphere, 1976):

  rho = rho_0 * (1 - 0.0065 * h / 288.15)^4.2561     (h in m below the tropopause)
  TAS = CAS * sqrt(rho_0 / rho)

The crosswind / headwind decomposition is pure planar geometry over the angle (wd - rh) between wind-from direction and runway heading:

  headwind_kt = ws_kt * cos(wd - rh)
  crosswind_kt = ws_kt * sin(wd - rh)

The wind-triangle / wind-correction-angle solution (W.10) is the E6B vector identity: ground velocity = true-airspeed vector + wind vector. Given true course TC, true airspeed V, wind direction wd and speed ws, the wind-correction angle WCA satisfies sin(WCA) = (ws / V) * sin(wd - TC), and groundspeed GS = V * cos(WCA) + ws * cos(wd - TC).

Citations: FAA-H-8083-25C public at faa.gov/regulations_policies/handbooks_manuals/aviation; ICAO Standard Atmosphere 1976 (ISO 2533:1975 by reference) cited by edition.

Verification: Sea-level / standard day (PA = 0, OAT = 15) -> DA = 0 + 120 * (15 - 15) = 0. PA = 5000, OAT = 25 -> ISA = 15 - 9.9 = 5.1 -> DA = 5000 + 120 * 19.9 = 7,388 ft, matching the FAA-H-8083-25C Figure 11-4 worked example. CAS 110 / PA 8000 / OAT 0 -> TAS ~ 124.3 kt matches the same chapter's E6B example to within 0.5 kt. Crosswind: 060 runway with 090 / 20 kt wind -> headwind = 20 * cos(30) = 17.3 kt, crosswind = 20 * sin(30) = 10 kt.

## 71. Mortgage and CRE ratio math (v12 §8, Groups X.1 / X.2 / X.3 / X.4 / X.5)

Monthly principal-and-interest payment is the closed-form annuity (textbook, e.g. Brealey-Myers Principles of Corporate Finance, App. A):

  i = APR / 12
  n = years * 12
  P_and_I = principal * i * (1 + i)^n / ((1 + i)^n - 1)     (i > 0)
  P_and_I = principal / n                                    (i = 0)

PITI adds the simple per-month division of annual property tax + annual insurance + monthly HOA + monthly PMI. The full amortization schedule (X.2) iterates each month: interest_t = balance_{t-1} * i; principal_t = payment - interest_t; balance_t = balance_{t-1} - principal_t. Extra principal added per month accelerates payoff and is propagated row-by-row.

DTI is the unweighted ratio of monthly housing cost (front-end) and total monthly debt service (back-end) to monthly gross income, banded against the FNMA Single-Family Selling Guide and FHA Handbook 4000.1 thresholds. LTV = loan / value; CLTV adds any junior loan to the numerator. Cap rate = NOI / value; DSCR = NOI / annual debt service. All five are pure ratio identities; the value-add is the threshold bands and the lender-governs notice, not the arithmetic.

Citations: standard mortgage math (no copyright on the annuity identity); FNMA Single-Family Selling Guide and FHA Handbook 4000.1 free at singlefamily.fanniemae.com and hud.gov; FHFA Conforming Loan Limit Values free at fhfa.gov; VA full-entitlement cap-removal per Blue Water Navy Vietnam Veterans Act of 2019.

Verification: 320,000 loan / 6.5% / 30 yr: i = 0.005417, n = 360, P_and_I = 320000 * 0.005417 * (1.005417)^360 / ((1.005417)^360 - 1) = $2,022.62. Total paid = $2,022.62 * 360 = $728,142.36; total interest = $408,142.36. Matches the X.2 worked example fixture to within $0.01.

## 72. Educator math: readability and z-score (v12 §9, Groups Y.1 / Y.2 / Y.14)

Flesch-Kincaid Grade Level (Kincaid, Fishburne, Rogers, and Chissom, "Derivation of New Readability Formulas," Naval Technical Training Command Research Branch Report 8-75, 1975; public-domain federal publication) is a linear combination of average sentence length and average syllables per word:

  FKGL = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
  FRE  = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)

SMOG (McLaughlin, "SMOG Grading: A New Readability Formula," Journal of Reading 12:8, 1969) targets polysyllable density:

  SMOG = 1.0430 * sqrt(polysyllables * 30 / sentences) + 3.1291

Coleman-Liau (Coleman and Liau, "A computer readability formula designed for machine scoring," Journal of Applied Psychology 60:2, 1975) uses letter and sentence density rather than syllable counts (easier to compute deterministically):

  L = (letters / words) * 100
  S = (sentences / words) * 100
  Coleman_Liau = 0.0588 * L - 0.296 * S - 15.8

Z-score and percentile (Y.14) are the standard-normal identity and CDF:

  z = (raw - mean) / sd
  percentile = Phi(z)

The CDF Phi(z) is approximated by Abramowitz and Stegun formula 26.2.17 (Handbook of Mathematical Functions, 1964, public domain), which is accurate to ~7.5e-8 over the full real line.

Citations: Kincaid 1975 by name (NTIS ADA006655, public domain); McLaughlin 1969 by name; Coleman and Liau 1975 by name; Abramowitz and Stegun 1964 by name (public-domain federal publication, NIST DLMF successor at dlmf.nist.gov).

Verification: 30-sentence / 90-polysyllable synthetic input -> SMOG = 1.0430 * sqrt(90 * 30 / 30) + 3.1291 = 1.0430 * sqrt(90) + 3.1291 = 1.0430 * 9.4868 + 3.1291 = 13.02. Z = 1.0 (raw 85, mean 75, sd 10) -> percentile = Phi(1) ~ 0.8413 = 84.13%, matches the standard-normal table to four decimal places.

---

When a new physics-derived calculator is added, this document gets a new section in the same pull request. The reviewer's job is to confirm that each section cites only public physics or public-domain sources and that the verification approach uses worked examples that are themselves traceable to public references.

<!-- BEGIN function-corpus-v14 (generated by scripts/build-corpus.mjs) -->

## Function corpus (v14)

Per spec-v14 §5.1, one row per exported calculator function in
pure-math.js and the calc-*.js modules. This table is the
mechanically-extracted skeleton emitted by
[scripts/build-corpus.mjs](../scripts/build-corpus.mjs) and
kept in sync by `npm run audit:corpus` (wired into `npm run lint`).

The Inputs / Output / Expression / Citation / Fixture / Tolerance
columns are filled in incrementally by Phases B (cross-validation),
C (dimensional analysis), G (citation round-trip), and H (per-group
reviewer signoff). An underscore placeholder marks a row that is
present in the corpus but whose annotation has not yet landed.

Reference-only exports (named presets, example fixtures, lookup
tables, all-caps constants) are excluded; their correctness
posture is the v6 source-stamp recheck (see
[docs/v6-audit.md](v6-audit.md)) rather than a calculation
cross-check.

| Module | Function | Parameters | Citation | Fixture | Tolerance |
| --- | --- | --- | --- | --- | --- |
| calc-accounting.js | `computeAmortization` | `{ principal = 0, annual_rate_pct = 0, term_months = 0, extra_principal = 0, f...` | _ | _ | _ |
| calc-accounting.js | `computeBreakeven` | `{ fixed_costs = 0, variable_cost_per_unit = 0, sale_price_per_unit = 0, targe...` | _ | _ | _ |
| calc-accounting.js | `computeCashConversionCycle` | `{ dso = 0, dio = 0, dpo = 0 }` | _ | _ | _ |
| calc-accounting.js | `computeChangeOrderMarkup` | `{ direct_cost_usd = 0, overhead_pct = 10, profit_pct = 10, current_contract_u...` | _ | _ | _ |
| calc-accounting.js | `computeDecliningBalanceDepreciation` | `{ cost = 0, salvage = 0, life_yr = 0, factor = 2, year = 1, sl_switch = true ...` | _ | _ | _ |
| calc-accounting.js | `computeEmployerPayrollTax` | `{ wages = 0, ss_base = 0, futa_base = 7000, futa_rate_pct = 0.6, suta_rate_pc...` | _ | _ | _ |
| calc-accounting.js | `computeEoqOrderQuantity` | `{ annual_demand = 0, order_cost = 0, holding_cost = 0 } = {}` | _ | _ | _ |
| calc-accounting.js | `computeEquipmentHourlyRate` | `{ purchase = 0, salvage = 0, life_hr = 0, annual_hr = 0, iit_pct = 0, fuel_gp...` | _ | _ | _ |
| calc-accounting.js | `computeEstimatedTax` | `{ projected_current_tax = 0, prior_year_tax = 0, current_withholding = 0, pri...` | _ | _ | _ |
| calc-accounting.js | `computeHomeOffice` | `{ office_ft2 = 0, home_ft2 = 0, total_home_expenses = 0, } = {}` | _ | _ | _ |
| calc-accounting.js | `computeInventoryTurnover` | `{ cogs = 0, beginning_inventory = 0, ending_inventory = 0, period_days = 365,...` | _ | _ | _ |
| calc-accounting.js | `computeLaborBurdenRate` | `{ wage = 0, payroll_pct = 9.15, wc_pct = 0, liab_pct = 0, benefits = 0, produ...` | _ | _ | _ |
| calc-accounting.js | `computeMacrs` | `{ cost = 0, class_life = 5, convention = "half_year", year_of_interest = 1 }` | _ | _ | _ |
| calc-accounting.js | `computeMarkupVsMargin` | `{ cost = 0, price = 0, markup_pct = 0, margin_pct = 0, units = 0 } = {}` | _ | _ | _ |
| calc-accounting.js | `computeMileageRollup` | `{ trips = [], tax_year = 2025 }` | _ | _ | _ |
| calc-accounting.js | `computeOverheadRecoveryRate` | `{ annual_overhead = 0, basis = "per-hour", billable_hours = 0, annual_direct ...` | _ | _ | _ |
| calc-accounting.js | `computePayrollWithholding` | `{ gross_per_period = 0, pay_frequency = "biweekly", filing_status = "single",...` | _ | _ | _ |
| calc-accounting.js | `computePrevailingWageFringe` | `{ base_wage_hr = 0, fringe_hr = 0, payroll_tax = 0 } = {}` | _ | _ | _ |
| calc-accounting.js | `computeReorderPoint` | `{ avg_daily_demand = 0, lead_time_days = 0, demand_sd = 0, service_level_pct ...` | _ | _ | _ |
| calc-accounting.js | `computeRetainageTracker` | `{ work_this_period_usd = 0, retainage_pct = 10, prior_retained_usd = 0 } = {}` | _ | _ | _ |
| calc-accounting.js | `computeSETax` | `{ net_se_earnings = 0, w2_ss_wages = 0, tax_year = 2025, filing_status = "sin...` | _ | _ | _ |
| calc-accounting.js | `computeSalesTaxCompound` | `{ pre_tax = 0, post_tax = 0, rate1_pct = 0, rate2_pct = 0, }` | _ | _ | _ |
| calc-accounting.js | `computeSection179` | `{ cost = 0, business_use_pct = 100, taxable_income = 0, tax_year = 2025, bonu...` | _ | _ | _ |
| calc-accounting.js | `computeStraightLine` | `{ cost = 0, salvage = 0, life_years = 0, year_of_interest = 1 }` | _ | _ | _ |
| calc-accounting.js | `computeSuretyBondPremium` | `{ contract_usd = 0, rate1_per_k = 25, rate2_per_k = 15, rate3_per_k = 10 } = {}` | _ | _ | _ |
| calc-accounting.js | `computeUnitsOfProductionDepr` | `{ cost_basis = 0, salvage_value = 0, total_units = 0, period_units = 0, accum...` | _ | _ | _ |
| calc-accounting.js | `computeWipPercentComplete` | `{ contract_usd = 0, cost_to_date_usd = 0, est_total_cost_usd = 0, billed_to_d...` | _ | _ | _ |
| calc-accounting.js | `computeWorkersCompEmrPremium` | `{ payroll_usd = 0, class_rate = 0, emr = 1.0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeAnhydrousAmmoniaRate` | `{ n_target_lb_per_ac = 180, tank_gal = 1000 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeBulkDensity` | `{ dry_mass_g = 0, core_volume_cc = 0, particle_density_pcc = 2.65, texture = ...` | _ | _ | _ |
| calc-agriculture.js | `computeBunkerSiloCapacity` | `{ bottom_width_ft = 0, top_width_ft = 0, average_depth_ft = 0, length_ft = 0,...` | _ | _ | _ |
| calc-agriculture.js | `computeCattleHeartGirthWeight` | `{ heart_girth_in = 70, body_length_in = 55 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeCenterPivotRuntime` | `{ system_flow_gpm = 0, area_acres = 0, target_depth_in = 0, efficiency_pct = ...` | _ | _ | _ |
| calc-agriculture.js | `computeCornYieldEstimate` | `{ ears_per_thousandth_acre = 32, kernel_rows_around = 16, kernels_per_row = 3...` | _ | _ | _ |
| calc-agriculture.js | `computeCropYield` | `{ crop = "corn", rows_per_pass = 1, row_spacing_in = 30, measured_length_ft =...` | _ | _ | _ |
| calc-agriculture.js | `computeDrawbarPower` | `{ pull_lb = 0, speed_mph = 0, surface = "firm_soil" }` | _ | _ | _ |
| calc-agriculture.js | `computeDrawbarPull` | `{ power_hp = 0, power_basis = "drawbar", speed_mph = 0, surface = "firm_soil"...` | _ | _ | _ |
| calc-agriculture.js | `computeDripZoneFlow` | `{ mode = "inline", tubing_ft = 0, spacing_in = 0, emitter_gph = 0, emitter_co...` | _ | _ | _ |
| calc-agriculture.js | `computeFeedConversionRatio` | `{ initial_weight_lb = 0, final_weight_lb = 0, days_on_feed = 0, total_feed_lb...` | _ | _ | _ |
| calc-agriculture.js | `computeFertigationInjectionRate` | `{ product_rate_gal_per_acre = 5, area_acres = 40, set_time_hours = 6 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeGPA` | `{ gpm = 0, spacing_in = 0, speed_mph = 0, target_gpa = 0 }` | _ | _ | _ |
| calc-agriculture.js | `computeGrainAerationAirflow` | `{ bin_capacity_bu = 0, airflow_rate = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeGrainBin` | `{ diameter_ft = 0, eave_height_ft = 0, peak_height_ft = 0, grain = "corn", pa...` | _ | _ | _ |
| calc-agriculture.js | `computeGrainBinHeightForCapacity` | `{ target_bushels = 0, diameter_ft = 0, peak_height_ft = 0, packing_factor = 1...` | _ | _ | _ |
| calc-agriculture.js | `computeGrainDryingEnergy` | `{ bushels = 0, lb_per_bushel = 56, mi_percent = 0, mf_percent = 0, btu_per_lb...` | _ | _ | _ |
| calc-agriculture.js | `computeGrainShrinkMoisture` | `{ W_lb = 0, M_wet_pct = 0, M_dry_pct = 0, handling = 0.5, tw_lbbu = 56 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeGrowingDegreeDays` | `{ days_series = [], base_f = 50, cutoff_f = 0, method = "standard" } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeHayDryMatter` | `{ bale_weight_lb = 0, moisture_pct = 0, target_moisture_pct = 15, safe_thresh...` | _ | _ | _ |
| calc-agriculture.js | `computeIrrigationRequirement` | `{ crop = "corn", et_ref_in_per_day = 0, period_days = 0, area_acres = 0, effi...` | _ | _ | _ |
| calc-agriculture.js | `computeIrrigationZoneRuntime` | `{ target_in = 0, precip_in_hr = 0, du = 1.0, max_cycle_min = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeLivestockDryMatterIntake` | `{ BW_lb = 0, intake = 0, feed_DM = 0, head = 1 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeLivestockWaterRequirement` | `{ method = "table", head = 1, temp_f = 0, t_low_f = 0, gal_low = 0, t_high_f ...` | _ | _ | _ |
| calc-agriculture.js | `computeMadIrrigationTrigger` | `{ field_capacity = 0.30, wilting_point = 0.12, root_depth_in = 24, mad_fracti...` | _ | _ | _ |
| calc-agriculture.js | `computeManureApplicationRate` | `{ crop_need = 0, total_nutr = 0, availability = 0, form = "solid" } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeManureCoverSavings` | `{ daily_manure_ft3 = 0, wastewater_ft3 = 0, bedding_ft3 = 0, storage_days = 0...` | _ | _ | _ |
| calc-agriculture.js | `computeManureNutrientApplication` | `{ crop_n_need_lb_acre = 0, total_n_lb_ton = 0, availability_pct = 0, p2o5_lb_...` | _ | _ | _ |
| calc-agriculture.js | `computeManureStorageVolume` | `{ daily_manure_ft3 = 0, wastewater_ft3 = 0, bedding_ft3 = 0, storage_days = 0...` | _ | _ | _ |
| calc-agriculture.js | `computeMulchTopsoilVolume` | `{ area_ft2 = 0, depth_in = 0, bulk_density = 0, bag_ft3 = 2, load_yd3 = 10, w...` | _ | _ | _ |
| calc-agriculture.js | `computeNozzleFlowPressure` | `{ rated_gpm, rated_psi, new_psi, target_gpm = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeNpkBlend` | `{ crop = "corn", soil_n_lb_per_acre = 0, soil_p_lb_per_acre = 0, soil_k_lb_pe...` | _ | _ | _ |
| calc-agriculture.js | `computePearsonSquareRation` | `{ feed_a_pct = 0, feed_b_pct = 0, target_pct = 0, batch_lb = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computePesticideReiPhi` | `{ rei_hours = 0, phi_days = 0, hours_since_application = 0, days_since_applic...` | _ | _ | _ |
| calc-agriculture.js | `computePivotApplicationRate` | `{ pass_depth_in = 0, pivot_length_ft = 0, revolution_hr = 0, wetted_band_ft =...` | _ | _ | _ |
| calc-agriculture.js | `computePivotTimerDepth` | `{ system_flow_gpm = 0, area_acres = 0, revolution_100_hr = 0, timer_pct = 0 }...` | _ | _ | _ |
| calc-agriculture.js | `computePlantSpacingCount` | `{ bed_ft2 = 0, spacing_in = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeSeedRate` | `{ row_width_in = 0, in_row_spacing_in = 0, target_pop_per_acre = 0, seeds_per...` | _ | _ | _ |
| calc-agriculture.js | `computeSodTakeoff` | `{ lawn_ft2 = 0, waste_pct = 0, slab_ft2 = 10, pallet_ft2 = 450 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeSprayDriftBuffer` | `{ base_buffer_ft = 0, droplet_class = "medium", wind_mph, boom_height_in = 20...` | _ | _ | _ |
| calc-agriculture.js | `computeSprayerCalibration` | `{ boom_width_ft = 0, oz_per_nozzle = 0, time_s = 0, target_gpa = 0, field_acr...` | _ | _ | _ |
| calc-agriculture.js | `computeSprayerFieldCapacity` | `{ boom_width_ft, speed_mph, field_efficiency_pct = 70, field_acres, tank_gal,...` | _ | _ | _ |
| calc-agriculture.js | `computeSprinklerGpmForPrecip` | `{ target_precip_in_hr = 0, zone_ft2 = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeSprinklerPrecipRate` | `{ zone_gpm = 0, zone_ft2 = 0 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeStockingRate` | `{ area_acres = 0, forage_lb_per_acre = 0, utilization_pct = 40, animal_class ...` | _ | _ | _ |
| calc-agriculture.js | `computeTHI` | `{ temperature = 0, unit = "F", rh_percent = 0, animal = "dairy-cow", ventilat...` | _ | _ | _ |
| calc-agriculture.js | `computeTankMix` | `{ tank_gal = 0, spray_volume_gpa = 0, product_rate_per_acre = 0, product_unit...` | _ | _ | _ |
| calc-agriculture.js | `computeTimberCruise` | `{ small_end_dib_in = 0, log_length_ft = 16, rule = "doyle", price_per_bf = 0 }` | _ | _ | _ |
| calc-agriculture.js | `computeTractorBallast` | `{ power_hp = 180, weight_to_power_ratio = 125, current_weight_lb = 18000 } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeTwoStrokeMix` | `{ ratio = 50, fuel_amount = 0, fuel_unit = "gallon" } = {}` | _ | _ | _ |
| calc-agriculture.js | `computeTwoStrokeMixRatioCheck` | `{ fuel_amount = 0, fuel_unit = "gallon", oil_amount = 0, target_ratio = 50 } ...` | _ | _ | _ |
| calc-agriculture.js | `computeUniformity` | `{ catch_volumes = [] }` | _ | _ | _ |
| calc-arborist.js | `computeBasalAreaPrism` | `{ baf = 0, in_tree_count = 0, dbh_in = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeChipperDebris` | `{ green_weight_lb, chip_density_lcy = 550, box_capacity_cy } = {}` | _ | _ | _ |
| calc-arborist.js | `computeCrownPruningDose` | `{ live_foliage = 0, removed_foliage = 0, maturity_class = "mature" } = {}` | _ | _ | _ |
| calc-arborist.js | `computeFellingNotchHinge` | `{ cut_dia_in, notch_pct = 22, open_face = 70 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeFirewoodCord` | `{ length_ft = 0, height_ft = 0, depth_ft = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeLogLimbWeight` | `{ butt_dia_in, top_dia_in, length_ft, species = "generic_hardwood", density =...` | _ | _ | _ |
| calc-arborist.js | `computePortaWrapFriction` | `{ load_lb, mu = 0.20, wraps = 3 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeQuadraticMeanDiameter` | `{ tally = "" } = {}` | _ | _ | _ |
| calc-arborist.js | `computeReinekeSdi` | `{ trees_per_acre = 0, qmd_in = 0, sdi_max = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeThinningTargetTpa` | `{ sdi_max = 0, target_pct = 0, qmd_in = 0, current_tpa = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeTreeCrzEncroachment` | `{ dbh_in = 0, radius_factor = 1.0, limit_distance_ft = 0, species_tolerance =...` | _ | _ | _ |
| calc-arborist.js | `computeTreeHeightClinometer` | `{ horizontal_distance_ft = 0, top_reading_pct = 0, base_reading_pct = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeTreeOpenCavity` | `{ diameter_in = 0, shell_thick_in = 0, opening_width_in = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeTreeProtectionZone` | `{ dbh_in = 0, radius_factor = 1.0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeTreeRiggingShock` | `{ static_weight_lb, drop_ft, rope_length_ft, elong_pct = 5 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeTrunkDecayStrength` | `{ diameter_in = 0, shell_thick_in = 0 } = {}` | _ | _ | _ |
| calc-arborist.js | `computeTrunkMinShellThickness` | `{ diameter_in = 0, allow_loss_pct = 0 } = {}` | _ | _ | _ |
| calc-civil.js | `computeCurveDeflectionStakeout` | `{ mode, radius_ft, degree_of_curve, arc_length_ft } = {}` | _ | _ | _ |
| calc-civil.js | `computeEarthworkEndArea` | `{ areas, interval_ft, mid_area_ft2, swell_shrink_factor } = {}` | _ | _ | _ |
| calc-civil.js | `computeHorizontalCurve` | `{ mode, radius_ft, degree_of_curve, delta_deg, pi_station_ft } = {}` | _ | _ | _ |
| calc-civil.js | `computeHorizontalSightlineOffset` | `{ mode, R_ft, S_ft, M_ft } = {}` | _ | _ | _ |
| calc-civil.js | `computeSagVerticalCurve` | `{ A_pct, S_ft } = {}` | _ | _ | _ |
| calc-civil.js | `computeSagVerticalCurveComfort` | `{ A_pct, V_mph } = {}` | _ | _ | _ |
| calc-civil.js | `computeSlopeStakeCutFill` | `{ existing_elev_ft, design_elev_ft, slope_ratio_h, offset_at_hinge_ft } = {}` | _ | _ | _ |
| calc-civil.js | `computeSuperelevation` | `{ mode, V_mph, R_ft, e_max, f } = {}` | _ | _ | _ |
| calc-civil.js | `computeSuperelevationSafeCurveSpeed` | `{ R_ft, e, f } = {}` | _ | _ | _ |
| calc-civil.js | `computeVerticalCurve` | `{ g1_pct, g2_pct, length_ft, pvi_station_ft, pvi_elevation_ft, eval_station_f...` | _ | _ | _ |
| calc-civil.js | `computeVerticalCurveSightDistance` | `{ A_pct, S_ft, C } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteAnchorBlowout` | `{ edge_distance_in = 0, head_bearing_area_in2 = 0, fc_psi = 0, embedment_in =...` | _ | _ | _ |
| calc-concrete.js | `computeConcreteAnchorBreakout` | `{ embedment_in = 0, fc_psi = 0, edge_distance_in = 0, anchor_type = "cast-in"...` | _ | _ | _ |
| calc-concrete.js | `computeConcreteAnchorPullout` | `{ head_bearing_area_in2 = 0, fc_psi = 0, cracking = "cracked" } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteBeamMinFlexuralSteel` | `{ fc_psi = 4000, fy_psi = 60000, bw_in = 0, d_in = 0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteBearingStrength` | `{ loaded_area_in2 = 0, support_area_in2 = 0, fc_psi = 4000, factored_load_kip...` | _ | _ | _ |
| calc-concrete.js | `computeConcreteCorbelBracket` | `{ factored_shear_lb = 0, horiz_tension_lb = 0, shear_span_av_in = 0, eff_dept...` | _ | _ | _ |
| calc-concrete.js | `computeConcreteCrackControlSpacing` | `{ fs_psi = 40000, cc_in = 0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteCrackingMoment` | `{ b_in = 0, h_in = 0, fc_psi = 4000, lambda = 1.0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteDepthForCrackingMoment` | `{ target_mcr_kipft = 0, b_in = 0, fc_psi = 4000, lambda = 1.0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteElasticModulus` | `{ fc_psi = 4000, wc_pcf = 145 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteIsolationJoint` | `{ slab_length_ft = 40, slab_width_ft = 30, num_columns = 6, column_perimeter_...` | _ | _ | _ |
| calc-concrete.js | `computeConcreteLongtermDefl` | `{ immediate_defl_in = 0, duration_months = 60, comp_steel_ratio = 0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteModulusOfRupture` | `{ fc_psi = 4000, lambda = 1.0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteShrinkageTemperatureSteel` | `{ h_in = 0, b_in = 12, grade_ksi = 60 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteStairVolume` | `{ num_risers = 4, riser_in = 7, tread_in = 11, width_in = 48, throat_in = 4 }...` | _ | _ | _ |
| calc-concrete.js | `computeConcreteStrengthFromModulus` | `{ ec_psi = 0, wc_pcf = 145 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteStrengthFromRupture` | `{ fr_psi = 0, lambda = 1.0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeConcreteTorsionThreshold` | `{ fc_psi = 4000, b_in = 0, h_in = 0, lambda = 1.0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeCuringCompoundCoverage` | `{ slab_area_sf = 2500, coats = 1, coverage_sf_per_gal = 200, waste_pct = 0 } ...` | _ | _ | _ |
| calc-concrete.js | `computeFreshConcreteTemp` | `{ agg_weight_lb = 0, agg_temp_f = 0, cement_weight_lb = 0, cement_temp_f = 0,...` | _ | _ | _ |
| calc-concrete.js | `computeRcBeamFlexure` | `{ fc = 4000, fy = 60000, as_in2 = 0, b = 0, d = 0, mu = 0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeRcBeamShear` | `{ fc = 4000, fyt = 60000, bw = 0, d = 0, av_in2 = 0, vu = 0, lambda = 1.0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeRcColumnAxial` | `{ b_in = 0, h_in = 0, fc_psi = 4000, fy_psi = 60000, ast_in2 = 0 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeRcColumnSteelForLoad` | `{ target_load_kip = 0, b_in = 0, h_in = 0, fc_psi = 4000, fy_psi = 60000 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeRcCompressionDevLength` | `{ bar_diameter_in = 0, fy_psi = 60000, fc_psi = 4000, lambda = 1.0, psi_r = 1...` | _ | _ | _ |
| calc-concrete.js | `computeRcDevelopmentLength` | `{ fc = 4000, fy = 60000, db = 0, psi_t = 1.0, psi_e = 1.0, psi_s = 1.0, psi_g...` | _ | _ | _ |
| calc-concrete.js | `computeRcDoublyReinforced` | `{ b_in = 0, d_in = 0, dp_in = 0, as_in2 = 0, asp_in2 = 0, fc_psi = 4000, fy_p...` | _ | _ | _ |
| calc-concrete.js | `computeRcHookDevelopment` | `{ db_in = 0, fy_psi = 60000, fc_psi = 4000, psi_e = 1.0, psi_r = 1.0, psi_o =...` | _ | _ | _ |
| calc-concrete.js | `computeRcPunchingShear` | `{ c1_in = 0, c2_in = 0, d_in = 0, fc_psi = 4000, position = "interior", lambd...` | _ | _ | _ |
| calc-concrete.js | `computeRcShearFriction` | `{ avf_in2 = 0, fy_psi = 60000, ac_in2 = 0, fc_psi = 4000, iface = "roughened"...` | _ | _ | _ |
| calc-concrete.js | `computeRcSlabMaxSpanForThickness` | `{ available_thickness_in = 0, support = "simply", fy_psi = 60000, wc_pcf = 14...` | _ | _ | _ |
| calc-concrete.js | `computeRcSlabMinThickness` | `{ l_ft = 0, support = "simply", fy_psi = 60000, wc_pcf = 145 } = {}` | _ | _ | _ |
| calc-concrete.js | `computeRcSlenderColumnMagnify` | `{ factored_axial_kip = 0, end_moment_m2_kft = 0, end_moment_m1_kft = 0, unbra...` | _ | _ | _ |
| calc-concrete.js | `computeSlabDowelSchedule` | `{ joint_length_ft = 40, slab_thickness_in = 6, dowel_spacing_in = 12, edge_cl...` | _ | _ | _ |
| calc-concrete.js | `computeTBeamEffectiveFlangeWidth` | `{ bw_in = 0, hf_in = 0, ln_in = 0, sw_in = 0, beam_type = "interior" } = {}` | _ | _ | _ |
| calc-construction.js | `computeAbrasiveBlast` | `{ nozzle_bore_in, pressure_psi = 100, area_ft2, lb_per_ft2 = 8 } = {}` | _ | _ | _ |
| calc-construction.js | `computeAdaRampSlope` | `{ rise_in = 0, slope_ratio = 12, landing_in = 60 } = {}` | _ | _ | _ |
| calc-construction.js | `computeAggregate` | `{ area_ft2 = 0, depth_in = 0, material = "crushed_stone" }` | _ | _ | _ |
| calc-construction.js | `computeAllowableArea` | `{ tabular_area = 0, ns_area = 0, frontage_ft = 0, perimeter_ft = 0, open_widt...` | _ | _ | _ |
| calc-construction.js | `computeAnchorEmbedment` | `{ uplift_lb, bolt_diameter_in, fc_psi, cracked = false, edge_distance_in = 0 }` | _ | _ | _ |
| calc-construction.js | `computeAnchorEpoxyVolume` | `{ holes = 40, hole_dia_in = 0.75, bar_dia_in = 0.625, embed_in = 6, cartridge...` | _ | _ | _ |
| calc-construction.js | `computeAnnularGroutVolume` | `{ bore_dia_in = 0, carrier_od_in = 0, length_ft = 0, waste_pct = 5 } = {}` | _ | _ | _ |
| calc-construction.js | `computeArea` | `{ shape, ...dims }` | _ | _ | _ |
| calc-construction.js | `computeAsce7LoadCombinations` | `{ dead_psf = 0, live_psf = 0, snow_psf = 0, wind_psf = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeAsceLiveLoadReduction` | `{ unreduced_load_psf = 0, tributary_area_ft2 = 0, member_type = "interior_col...` | _ | _ | _ |
| calc-construction.js | `computeAsphaltPavingSpeed` | `{ speed_fpm = 0, width_ft = 0, depth_in = 0, density_pcf = 145, eff_min_per_h...` | _ | _ | _ |
| calc-construction.js | `computeAsphaltSpreadRate` | `{ thickness_in = 2, density_pcf = 145 } = {}` | _ | _ | _ |
| calc-construction.js | `computeAsphaltTackCoatQuantity` | `{ area_sf = 0, residual_rate_gal_sy = 0.04, residue_pct = 60 } = {}` | _ | _ | _ |
| calc-construction.js | `computeAsphaltTonnage` | `{ area_ft2 = 0, depth_in = 0, density_pcf = 145, paving_width_ft = 0 }` | _ | _ | _ |
| calc-construction.js | `computeBalusterPicketCount` | `{ rail_clear_in = 96, picket_width_in = 1.5, max_gap_in = 4 } = {}` | _ | _ | _ |
| calc-construction.js | `computeBaseplateGroutVolume` | `{ plate_length_in = 18, plate_width_in = 18, column_area_in2 = 64, grout_thic...` | _ | _ | _ |
| calc-construction.js | `computeBeamLoading` | `{ load_type, load_value, length_ft, E_psi, b_in, d_in }` | _ | _ | _ |
| calc-construction.js | `computeBeamReactions` | `{ span_ft = 0, w_plf = 0, point_lb = 0, a_ft = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeBendAllowance` | `{ thickness_in = 0, bend_angle_deg = 0, inside_radius_in = 0, k_factor = 0.44...` | _ | _ | _ |
| calc-construction.js | `computeBoardFootage` | `{ thickness_in, width_in, length_ft, count = 1 }` | _ | _ | _ |
| calc-construction.js | `computeBoltTorque` | `{ grade = "SAE_5", diameter_in = 0.5, lubrication = "dry", preload_fraction =...` | _ | _ | _ |
| calc-construction.js | `computeCantileverBeam` | `{ L_ft = 0, P_lb = 0, w_plf = 0, E_psi = 29e6, I_in4 = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeCarpetTakeoff` | `{ area_sf = 900, waste_pct = 10, roll_width_ft = 12 } = {}` | _ | _ | _ |
| calc-construction.js | `computeChainLinkFenceTakeoff` | `{ perimeter_ft = 200, height_ft = 4, gate_width_ft = 0, corners = 4, line_pos...` | _ | _ | _ |
| calc-construction.js | `computeCmuGroutVolume` | `{ wall_len_ft = 0, wall_ht_ft = 0, core_spacing_in = 0, core_area_in2 = 24, b...` | _ | _ | _ |
| calc-construction.js | `computeCoatingCoverageDft` | `{ vol_solids_pct, dft_mils, area_ft2, loss_pct = 35 } = {}` | _ | _ | _ |
| calc-construction.js | `computeColumnBucklingWood` | `{ b_in = 0, d_in = 0, le_in = 0, fc_star_psi = 0, emin_psi = 0, ke = 1 } = {}` | _ | _ | _ |
| calc-construction.js | `computeCombinedStressAxialBending` | `{ P_lb = 0, M_lbin = 0, A_in2 = 0, c_in = 0, I_in4 = 0, e_in = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeConcreteEvaporationRate` | `{ air_temp_f = 70, concrete_temp_f = null, rh_pct = 50, wind_mph = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeConcreteMaturity` | `{ concrete_temp_f = 0, hours = 0, datum_f = 32, q_kelvin = 5000, ref_temp_f =...` | _ | _ | _ |
| calc-construction.js | `computeConcreteMixDesign` | `{ strength_psi = 3000, exposure = "interior", max_aggregate_in = 1, slump_in ...` | _ | _ | _ |
| calc-construction.js | `computeConcretePourRate` | `{ placement_rate_cyhr = 0, form_plan_area_ft2 = 0, total_volume_cy = 0, truck...` | _ | _ | _ |
| calc-construction.js | `computeConcreteSawcutFootage` | `{ length_ft = 60, width_ft = 40, spacing_ft = 12 } = {}` | _ | _ | _ |
| calc-construction.js | `computeConcreteStrengthGain` | `{ fc28 = 0, age_days = 0, a = 4.0, b = 0.85, target_pct = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeConcreteVibratorSpacing` | `{ radius_of_action_in = 12, lift_length_ft = 20 } = {}` | _ | _ | _ |
| calc-construction.js | `computeConcreteVolume` | `{ shape, waste_factor = 0.10, ...d }` | _ | _ | _ |
| calc-construction.js | `computeConcreteWashoutVolume` | `{ trucks = 20, washout_gal_per_truck = 50, freeboard_pct = 15, pit_depth_ft =...` | _ | _ | _ |
| calc-construction.js | `computeConcreteYield` | `{ total_batch_mass_lb = 0, measured_unit_weight_lb_ft3 = 0, design_volume_yd3...` | _ | _ | _ |
| calc-construction.js | `computeConstructionAdhesiveTubes` | `{ total_lf = 1200, tube_volume_in3 = 50.6, bead_dia_in = 0.375 } = {}` | _ | _ | _ |
| calc-construction.js | `computeControlJointSpacing` | `{ slab_thickness_in = 0, spacing_factor = 2.5, max_spacing_ft = 18, slab_leng...` | _ | _ | _ |
| calc-construction.js | `computeCraneLiftCheck` | `{ load_lb = 0, rigging_lb = 0, block_lb = 0, jib_deduct_lb = 0, sling_legs = ...` | _ | _ | _ |
| calc-construction.js | `computeCurbGutterVolume` | `{ cross_section_ft2 = 2.0, length_ft = 300, waste_pct = 8 } = {}` | _ | _ | _ |
| calc-construction.js | `computeDeckBeamPost` | `{ joist_span_ft = 0, beam_span_ft = 0, post_height_ft = 8, live_load_psf = 40...` | _ | _ | _ |
| calc-construction.js | `computeDeckLedgerFasteners` | `{ joist_span_ft = 0, spacing_in = 0, ledger_length_ft = 0, fastener = "lag" }...` | _ | _ | _ |
| calc-construction.js | `computeDemoDebris` | `{ structure_type = "wood_frame", volume_yd3 = 0 }` | _ | _ | _ |
| calc-construction.js | `computeDrainageBoardTakeoff` | `{ perimeter_ft = 150, below_grade_height_ft = 8, roll_width_ft = 4, roll_leng...` | _ | _ | _ |
| calc-construction.js | `computeDrywall` | `{ wall_area_ft2 = 0, ceiling_area_ft2 = 0, sheet_size = "4x8", waste_percent ...` | _ | _ | _ |
| calc-construction.js | `computeDrywallFastenerTakeoff` | `{ sheets = 100, sheet_length_ft = 8, sheet_width_ft = 4, stud_spacing_in = 16...` | _ | _ | _ |
| calc-construction.js | `computeDuctBankConcrete` | `{ bank_width_ft = 2.0, bank_height_ft = 1.5, length_ft = 100, num_conduits = ...` | _ | _ | _ |
| calc-construction.js | `computeDuctHangerLoad` | `{ duct_lb_per_ft = 5.5, spacing_ft = 8, run_ft = 40, hanger_swl_lb = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeDuctMetalWeight` | `{ width_in = 24, height_in = 12, length_ft = 100, lb_per_sf = 1.156, seam_fac...` | _ | _ | _ |
| calc-construction.js | `computeDuctWrapTakeoff` | `{ width_in = 20, height_in = 12, length_ft = 40, overlap_waste_factor = 1.15,...` | _ | _ | _ |
| calc-construction.js | `computeDumpsterCount` | `{ debris_cy = 60, debris_tons = 45, container_cy = 30, fill_efficiency = 0.7,...` | _ | _ | _ |
| calc-construction.js | `computeEgressCapacity` | `{ occupant_load = 0, sprinklered = true, path = "level", min_door_in = 32 } = {}` | _ | _ | _ |
| calc-construction.js | `computeEgressTravelDistance` | `{ travel_ft = 0, travel_limit_ft = 300, common_path_ft = 0, common_path_limit...` | _ | _ | _ |
| calc-construction.js | `computeExcavationBenchPlan` | `{ depth_ft = 0, soil_class = "B", surcharge = false, length_ft = 0, bottom_wi...` | _ | _ | _ |
| calc-construction.js | `computeExcavationVolume` | `{ length_ft, width_ft, depth_ft, side_slope_angle_deg = 90 }` | _ | _ | _ |
| calc-construction.js | `computeExteriorOpeningProtection` | `{ fsd_ft = 0, wall_area = 0, protected: prot = false, actual_opening = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeFenceEstimate` | `{ length_ft = 0, post_spacing_ft = 8, rails_per_section = 2, picket_width_in ...` | _ | _ | _ |
| calc-construction.js | `computeFilletWeldStrength` | `{ mode = "capacity-from-size", leg_in = 0, length_in = 0, electrode = "E70", ...` | _ | _ | _ |
| calc-construction.js | `computeFootingArea` | `{ column_load_lb, soil_class, applied_moment_lbft = 0 }` | _ | _ | _ |
| calc-construction.js | `computeFormworkPressure` | `{ pour_rate_ft_per_hr = 0, concrete_temp_F = 70, weight_factor = "normal", un...` | _ | _ | _ |
| calc-construction.js | `computeFormworkTieLoad` | `{ lateral_pressure_psf = 600, h_spacing_ft = 2, v_spacing_ft = 2, tie_swl_lb ...` | _ | _ | _ |
| calc-construction.js | `computeFoundationWaterproofingTakeoff` | `{ perimeter_ft = 150, below_grade_height_ft = 8, coverage_sf_per_gal = 50, wa...` | _ | _ | _ |
| calc-construction.js | `computeGlassVacuumLift` | `{ area_sf = 32, glass_thickness_in = 0.5, safety_factor = 4, cup_wll_lb = 150...` | _ | _ | _ |
| calc-construction.js | `computeGlulamVolumeFactor` | `{ span_ft = 0, depth_in = 0, width_in = 0, x = 10, kl = 1.0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeGuardHandrailCheck` | `{ occupancy = "residential", surface_height_in = 0, measured_guard_in = 0, me...` | _ | _ | _ |
| calc-construction.js | `computeHeaderSizing` | `{ header_span_ft = 0, tributary_width_ft = 0, floors_above = 0, ground_snow_p...` | _ | _ | _ |
| calc-construction.js | `computeHelicalPile` | `{ shaft = "1.5_inch_solid", torque_ft_lb = 0, factor_of_safety = 2.0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeHelicalPileTorque` | `{ shaft = "1.5_inch_solid", target_capacity_lb = 0, capacity_basis = "allowab...` | _ | _ | _ |
| calc-construction.js | `computeHipValleyRafter` | `{ run_ft = 0, pitch = 6, pitch_irregular = 0, overhang_in = 12, jack_oc_in = ...` | _ | _ | _ |
| calc-construction.js | `computeHoopStressMawp` | `{ t_in = 0, D_in = 0, S_allow = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeHoopStressThinWall` | `{ P_psi = 0, D_in = 0, t_in = 0, S_allow = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeHousewrapRolls` | `{ wall_area_sf = 4000, roll_coverage_sf = 1350, overlap_waste_pct = 10, faste...` | _ | _ | _ |
| calc-construction.js | `computeIceBarrierCoverage` | `{ eave_length_ft = 0, overhang_in = 0, pitch_rise = 0, roll_width_in = 36, ro...` | _ | _ | _ |
| calc-construction.js | `computeInsulationBattCoverage` | `{ area_ft2 = 0, coverage_per_batt = 0, coverage_per_bag = 0, waste_pct = 0 } ...` | _ | _ | _ |
| calc-construction.js | `computeIntermittentFilletWeld` | `{ w_req_in = 0, w_intermit_in = 0, increment_in = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeJoistCantileverCheck` | `{ backspan_ft = 10, overhang_ft = 2 } = {}` | _ | _ | _ |
| calc-construction.js | `computeJoistDeflection` | `{ uniform_load_plf, span_ft, E_psi, I_in4 }` | _ | _ | _ |
| calc-construction.js | `computeJoistHangerCount` | `{ run_width_ft = 16, spacing_in = 16, ends_per_joist = 2, nails_per_hanger = ...` | _ | _ | _ |
| calc-construction.js | `computeJoistNotchBoreLimit` | `{ joist_depth_in = 9.25 } = {}` | _ | _ | _ |
| calc-construction.js | `computeLayoutSquaring` | `{ mode, side_a, side_b, diag1, diag2 } = {}` | _ | _ | _ |
| calc-construction.js | `computeLumberSpan` | `{ species_grade, nominal_size, total_load_psf, tributary_width_in = 16, defle...` | _ | _ | _ |
| calc-construction.js | `computeMasonryControlJointLayout` | `{ wall_length_ft = 80, wall_height_ft = 16, max_spacing_cap_ft = 25 } = {}` | _ | _ | _ |
| calc-construction.js | `computeMasonryCount` | `{ wall_area_ft2, unit_type, mortar_joint_in = 0.375, waste_factor = 0.05 }` | _ | _ | _ |
| calc-construction.js | `computeMasonryCoursing` | `{ target_in = 0, unit_in = 7.625, joint_in = 0.375 } = {}` | _ | _ | _ |
| calc-construction.js | `computeMassConcreteTempRise` | `{ cementitious_lb_per_cy = 600, rise_f_per_100lb = 12, placing_temp_f = 70, d...` | _ | _ | _ |
| calc-construction.js | `computeMaterialQuantity` | `{ assembly, area_ft2 }` | _ | _ | _ |
| calc-construction.js | `computeMembraneRoofTakeoff` | `{ roof_area_sf = 8000, roll_width_ft = 10, roll_length_ft = 100, sidelap_in =...` | _ | _ | _ |
| calc-construction.js | `computeMetalDeckTakeoff` | `{ area_sf = 10000, cover_width_in = 36, sheet_length_ft = 30, waste_pct = 5 }...` | _ | _ | _ |
| calc-construction.js | `computeMetalRoofPanels` | `{ eave_width_ft = 0, panel_length_ft = 0, panel_net_in = 36, fasteners_per_sq...` | _ | _ | _ |
| calc-construction.js | `computeMetalStudTakeoff` | `{ wall_length_ft = 50, spacing_in = 16, openings = 2, extra_per_opening = 2 }...` | _ | _ | _ |
| calc-construction.js | `computeMetalWeight` | `{ shape, dia_in, id_in, side_in, width_in, height_in, thickness_in, wall_in, ...` | _ | _ | _ |
| calc-construction.js | `computeMinimumRoofSnow` | `{ pg_psf = 0, importance = 1.0, pf_computed = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeMortarMix` | `{ unit_count = 0, unit_kind = "brick", joint_in = 0.375, mortar_type = "N" }` | _ | _ | _ |
| calc-construction.js | `computeMultiBendFlatPattern` | `{ mold_line_in = 0, n_bends = 0, bd_in = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeOccupantLoad` | `{ spaces = [] } = {}` | _ | _ | _ |
| calc-construction.js | `computePaintCoverage` | `{ area_ft2, coats = 2, primer_needed = false, surface_porosity = "smooth" }` | _ | _ | _ |
| calc-construction.js | `computePavementMillingProduction` | `{ drum_width_ft = 7, speed_fpm = 30, depth_in = 4, density_pcf = 148, efficie...` | _ | _ | _ |
| calc-construction.js | `computePlumbingFixtureCount` | `{ occupant_load = 0, wc_ratio = 25, wc_ratio_over = 50, wc_tier = 50, lav_rat...` | _ | _ | _ |
| calc-construction.js | `computePlywoodSpan` | `{ span_rating = "24/16", panel_thickness_in = 0, application = "roof", suppor...` | _ | _ | _ |
| calc-construction.js | `computePointLoadBearing` | `{ load_lb = 0, width_in = 0, fc_perp_psi = 0, cb = 1, provided_length_in = 0 ...` | _ | _ | _ |
| calc-construction.js | `computePolymericSandBags` | `{ area_sf = 400, coverage_per_bag_sf = 75, waste_pct = 5 } = {}` | _ | _ | _ |
| calc-construction.js | `computePostHoleConcrete` | `{ num_posts = 0, hole_diameter_in = 0, hole_depth_in = 0, post_side_in = 0, b...` | _ | _ | _ |
| calc-construction.js | `computePoweredAtticVentilator` | `{ attic_area_ft2 = 0, cfm_per_ft2 = 0.7, dark_roof = "no" } = {}` | _ | _ | _ |
| calc-construction.js | `computePullout` | `{ fastener_type, fastener_size, species, penetration_in }` | _ | _ | _ |
| calc-construction.js | `computeRafter` | `{ horizontal_span_ft, pitch_rise_per_12, overhang_ft = 0 }` | _ | _ | _ |
| calc-construction.js | `computeRainLoadPonding` | `{ static_head_in = 0, hydraulic_head_in = 0, roof_area_ft2 = 0, rainfall_in_h...` | _ | _ | _ |
| calc-construction.js | `computeRainOnSnowSurcharge` | `{ pf_psf = 0, pg_psf = 0, slope_deg = 0, eave_to_ridge_ft = 0, surcharge_psf ...` | _ | _ | _ |
| calc-construction.js | `computeReadyMixConcreteOrder` | `{ volume_yd3 = 0, waste_pct = 8, load_yd3 = 10, min_yd3 = 10, price_per_yd3 =...` | _ | _ | _ |
| calc-construction.js | `computeRebar` | `{ length_ft, width_ft, spacing_in, edge_clearance_in = 3, bar_size = "#4" }` | _ | _ | _ |
| calc-construction.js | `computeRebarChairCount` | `{ slab_area_sf = 1000, support_spacing_ft = 4, waste_pct = 5 } = {}` | _ | _ | _ |
| calc-construction.js | `computeRebarLapSplice` | `{ bar_size = "#5", lap_factor = 48, min_lap_in = 12 } = {}` | _ | _ | _ |
| calc-construction.js | `computeRebarSchedule` | `{ rows = [] } = {}` | _ | _ | _ |
| calc-construction.js | `computeRebarTieWire` | `{ length_ft = 30, width_ft = 20, spacing_in = 12, tie_fraction = 0.5, tie_len...` | _ | _ | _ |
| calc-construction.js | `computeRebarWeightTakeoff` | `{ bar_size = "5", total_len_ft = 0, price_per_lb = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeResidentialFraming` | `{ footprint_ft2 = 0, perimeter_ft = 0, wall_height_ft = 8, stud_oc_in = 16, j...` | _ | _ | _ |
| calc-construction.js | `computeRidgeCapFasteners` | `{ ridge_lf = 0, hip_lf = 0, cap_lf_per_bundle = 20, cap_exposure_in = 5, squa...` | _ | _ | _ |
| calc-construction.js | `computeRigidFoamBoardCount` | `{ area_sf = 1600, board_area_sf = 32, layers = 1, waste_pct = 8 } = {}` | _ | _ | _ |
| calc-construction.js | `computeRoofBallastWeight` | `{ roof_area_sqft = 5000, ballast_psf = 12, stone_density_pcf = 100 } = {}` | _ | _ | _ |
| calc-construction.js | `computeRoofInsulationFasteners` | `{ field_boards = 100, field_per_board = 8, perimeter_boards = 20, perimeter_p...` | _ | _ | _ |
| calc-construction.js | `computeRoofPitch` | `{ rise = null, run = 12, mode = "rise_run" }` | _ | _ | _ |
| calc-construction.js | `computeRoofUnderlaymentRolls` | `{ roof_area_sf = 2500, roll_coverage_sf = 1000, lap_waste_pct = 10 } = {}` | _ | _ | _ |
| calc-construction.js | `computeRoofingSquares` | `{ roof_area_ft2 = 0, pitch_rise = 0, shingle_product = "architectural", perim...` | _ | _ | _ |
| calc-construction.js | `computeScaffoldLegLoad` | `{ platform_dead_lb = 100, num_workers = 2, worker_lb = 250, material_lb = 500...` | _ | _ | _ |
| calc-construction.js | `computeScaffoldMudsillBearing` | `{ leg_load_lb = 0, plank_width_in = 0, plank_length_in = 0, allowable_psf = 0...` | _ | _ | _ |
| calc-construction.js | `computeScaffoldTakeoff` | `{ run_length_ft = 40, bay_length_ft = 7, lifts = 1, planks_per_bay = 4 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSealantJointYield` | `{ joint_lf = 500, cartridge_in3 = 20.5, joint_width_in = 0.375, joint_depth_i...` | _ | _ | _ |
| calc-construction.js | `computeSectionProperties` | `{ shape = "rectangle", b_in = 0, h_in = 0, d_in = 0, di_in = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSeismicBaseShear` | `{ weight_kip = 0, sds = 0, sd1 = 0, r_factor = 0, ie = 1.0, period_s = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSeismicDesignSpectralAcceleration` | `{ ss = 0, s1 = 0, fa = 0, fv = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSeismicOverturningMoment` | `{ base_shear_kip = 0, period_s = 0, stories = [] } = {}` | _ | _ | _ |
| calc-construction.js | `computeSeismicPdeltaStability` | `{ px_kip = 0, delta_in = 0, ie = 1.0, vx_kip = 0, hsx_in = 0, cd = 0, beta = ...` | _ | _ | _ |
| calc-construction.js | `computeSeismicStoryDrift` | `{ delta_xe_in = 0, cd = 0, ie = 1.0, hsx_in = 0, drift_ratio = 0.020 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSeismicVerticalDistribution` | `{ base_shear_kip = 0, period_s = 0, stories = [] } = {}` | _ | _ | _ |
| calc-construction.js | `computeSelfLevelerBags` | `{ area_sf = 500, avg_thickness_in = 0.25, bag_yield_sf_in = 6.25, waste_pct =...` | _ | _ | _ |
| calc-construction.js | `computeSfrmTakeoff` | `{ area_sf = 5000, thickness_in = 1.5, density_pcf = 15, bag_lb = 44, waste_pc...` | _ | _ | _ |
| calc-construction.js | `computeShaftDiameterForTorsion` | `{ T_lbin = 0, tau_allow_psi = 0, L_in = 0, G_psi = 11.5e6 } = {}` | _ | _ | _ |
| calc-construction.js | `computeShaftTorsion` | `{ T_lbin = 0, d_in = 0, di_in = 0, L_in = 0, G_psi = 11.5e6 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSheathingTakeoff` | `{ area_sf = 1600, waste_pct = 8, sheet_sf = 32, nails_per_sheet = 60 } = {}` | _ | _ | _ |
| calc-construction.js | `computeShingleNails` | `{ squares = 30, shingles_per_square = 80, nails_per_shingle = 4, nails_per_lb...` | _ | _ | _ |
| calc-construction.js | `computeShorePostLoad` | `{ slab_in = 0, unit_weight = 150, form_load = 10, live_load = 50, spacing_x =...` | _ | _ | _ |
| calc-construction.js | `computeShotcreteReboundQuantity` | `{ area_sf = 0, thickness_in = 0, rebound_pct = 20 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSidingTakeoff` | `{ wall_area_sf = 2000, opening_area_sf = 0, waste_pct = 12, exposure_in = 4 }...` | _ | _ | _ |
| calc-construction.js | `computeSillPlateAnchorCount` | `{ wall_length_ft = 40, max_spacing_ft = 6, end_distance_in = 9 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSlidingSnowLoad` | `{ pf_upper_psf = 0, eave_ridge_ft = 0, lower_width_ft = 15 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSnowDriftLoad` | `{ lu_ft = 0, pg_psf = 0, hc_ft = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSnowLoad` | `{ Pg_psf, Ce = 1.0, Ct = 1.0, Is = 1.0, Cs = 1.0, drift_upwind_length_ft = 0 }` | _ | _ | _ |
| calc-construction.js | `computeSnowUnbalancedGable` | `{ ground_snow_pg_psf = 0, flat_roof_ps_psf = 0, roof_rise_on_12 = 0, eave_to_...` | _ | _ | _ |
| calc-construction.js | `computeSpeedsAndFeeds` | `{ tool = "drill", material = "steel", diameter_in = 0, flutes = 1 }` | _ | _ | _ |
| calc-construction.js | `computeSprayFoamBoardFeet` | `{ area_sf = 2000, thickness_in = 3, yield_bd_ft_per_set = 4800, waste_pct = 1...` | _ | _ | _ |
| calc-construction.js | `computeStairCodeCheck` | `{ occupancy = "commercial", riser_height_in = 0, tread_depth_in = 0, stair_wi...` | _ | _ | _ |
| calc-construction.js | `computeStairStringer` | `{ total_rise_in, total_run_in, tread_cut_depth_in = 1 }` | _ | _ | _ |
| calc-construction.js | `computeStairStringerV7` | `{ total_rise_in = 0, target_rise_in = 7.0, target_tread_in = 11.0, nosing_in ...` | _ | _ | _ |
| calc-construction.js | `computeStairs` | `{ total_rise_in, preferred_riser_height_in = 7.5 }` | _ | _ | _ |
| calc-construction.js | `computeStockpileVolume` | `{ base_diameter_ft = 0, repose_angle_deg = 37, density_pcf = 100 } = {}` | _ | _ | _ |
| calc-construction.js | `computeStripingPaintQuantity` | `{ length_ft = 5280, width_in = 4, coverage_sf_per_gal = 320, bead_rate_lb_per...` | _ | _ | _ |
| calc-construction.js | `computeStuccoCoverage` | `{ area_sf = 1000, total_thickness_in = 0.875, bag_yield_sf_in = 10.1, waste_p...` | _ | _ | _ |
| calc-construction.js | `computeStudNotchBoreLimit` | `{ stud_width_in = 5.5 } = {}` | _ | _ | _ |
| calc-construction.js | `computeSuspendedCeilingGrid` | `{ room_length_ft = 24, room_width_ft = 40 } = {}` | _ | _ | _ |
| calc-construction.js | `computeTaperedRoofInsulation` | `{ run_ft = 40, slope_in_per_ft = 0.25, start_thk_in = 0.5, area_sf = 2000, r_...` | _ | _ | _ |
| calc-construction.js | `computeThermalStressMaxDeltaT` | `{ allowable_stress_psi = 0, E_psi = 0, alpha = 0, restraint = 1 } = {}` | _ | _ | _ |
| calc-construction.js | `computeThermalStressRestrained` | `{ E_psi = 0, alpha = 0, dT_F = 0, A_in2 = 0, L_in = 0, restraint = 1 } = {}` | _ | _ | _ |
| calc-construction.js | `computeTileCount` | `{ area_ft2, tile_width_in, tile_height_in, grout_joint_width_in = 0.125, tile...` | _ | _ | _ |
| calc-construction.js | `computeTrafficTaperLength` | `{ offset_width_ft = 12, speed_mph = 55, device_spacing_ft = 40 } = {}` | _ | _ | _ |
| calc-construction.js | `computeTrimLinearFootage` | `{ perimeter_ft = 0, openings_ft = 0, waste_pct = 10, stock_len_ft = 16, sprin...` | _ | _ | _ |
| calc-construction.js | `computeVaporBarrierRolls` | `{ area_sf = 3000, roll_coverage_sf = 1000, overlap_waste_pct = 10, roll_width...` | _ | _ | _ |
| calc-construction.js | `computeWallBracingLength` | `{ wall_line_length_ft = 0, bracing_percent = 0, provided_length_ft = 0, metho...` | _ | _ | _ |
| calc-construction.js | `computeWallpaperRolls` | `{ perimeter_in = 0, height_in = 0, roll_width_in = 0, roll_len_in = 0, repeat...` | _ | _ | _ |
| calc-construction.js | `computeWaterCementRatio` | `{ water_lb = 0, cement_lb = 0, scm_lb = 0, exposure_class = "none" } = {}` | _ | _ | _ |
| calc-construction.js | `computeWeldHeatInput` | `{ process, voltage_V, current_A, travel_in_min, efficiency, wps_min_kj_in, wp...` | _ | _ | _ |
| calc-construction.js | `computeWeldUsage` | `{ process = "GMAW", weld_cross_section_in2 = 0, weld_length_in = 0, depositio...` | _ | _ | _ |
| calc-construction.js | `computeWeldedWireMesh` | `{ slab_area_sf = 0, sheet_width_ft = 5, sheet_length_ft = 10, side_lap_in = 6...` | _ | _ | _ |
| calc-construction.js | `computeWindCcPressure` | `{ v_mph = 0, kz = 0, gcp = 0, kzt = 1.0, kd = 0.85, ke = 1.0, gcpi = 0.18 } = {}` | _ | _ | _ |
| calc-construction.js | `computeWindMwfrsPressure` | `{ qz_psf = 0, qh_psf = 0, cp_ww = 0.8, cp_lw = -0.5, g_f = 0.85, gcpi = 0.18 ...` | _ | _ | _ |
| calc-construction.js | `computeWindPressure` | `{ V_mph, exposure = "C", Kz = 0, Kzt = 1.0, Kd = 0.85, G = 0.85 }` | _ | _ | _ |
| calc-construction.js | `computeWindSolidSign` | `{ velocity_pressure_psf = 0, gust_factor = 0.85, force_coefficient = 0, solid...` | _ | _ | _ |
| calc-construction.js | `computeWindSpeedFromVelocityPressure` | `{ velocity_pressure_psf = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodBeamBending` | `{ fb_star_psi = 0, emin_psi = 620000, b_in = 0, d_in = 0, le_in = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodBeamShear` | `{ fv_prime_psi = 0, b_in = 0, d_in = 0, dn_in = 0, v_applied_lb = 0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodBearingPerpendicular` | `{ r_lb = 0, b_in = 0, lb_in = 0, fcperp_psi = 625, near_end = "no" } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodBoltConnection` | `{ d_in = 0, lm_in = 0, ls_in = 0, gm = 0.50, gs = 0.50, fyb_psi = 45000, thet...` | _ | _ | _ |
| calc-construction.js | `computeWoodCombinedBendingAxial` | `{ p_lb = 0, m_inlb = 0, a_in2 = 0, s_in3 = 0, fc_adj_psi = 0, fb_adj_psi = 0,...` | _ | _ | _ |
| calc-construction.js | `computeWoodLagWithdrawal` | `{ g = 0, d_in = 0, p_thread_in = 0, cd = 1.0, end_grain = "no" } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodNailWithdrawal` | `{ g = 0, d_in = 0, p_in = 0, cd = 1.0, toenail = "no" } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodScrewWithdrawal` | `{ g = 0, d_in = 0, p_in = 0, cd = 1.0 } = {}` | _ | _ | _ |
| calc-construction.js | `computeWoodTensionMember` | `{ t_lb = 0, b_in = 0, d_in = 0, dh_in = 0, nh = 0, ft_psi = 575, cd_f = 1.0, ...` | _ | _ | _ |
| calc-construction.js | `renderAnchorEmbedment` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderArea` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderBeamLoading` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderBoardFootage` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderConcrete` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderExcavation` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderFootingArea` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderJoistDeflection` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderLumberSpans` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderMasonryCount` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderMaterialQuantity` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderPaintCoverage` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderPullout` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderRafter` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderRebar` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderRoofPitch` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderSnowLoad` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderStairStringer` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderStairs` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderTileCount` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-construction.js | `renderWindPressure` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `computeBeltHpTransmitted` | `{ tight_side_tension_lb = 0, slack_side_tension_lb = 0, sheave_diameter_in = ...` | _ | _ | _ |
| calc-cross.js | `computeBoltProofLoad` | `{ nominal_diameter_in = 0, threads_per_inch = 0, grade = "5" } = {}` | _ | _ | _ |
| calc-cross.js | `computeCrossConnectionAirGap` | `{ opening_in = 0, near_wall = false, measured_in = 0 } = {}` | _ | _ | _ |
| calc-cross.js | `computeDilution` | `{ concentrate_percent, target_percent, final_volume }` | _ | _ | _ |
| calc-cross.js | `computeFallProtectionClearance` | `{ connector = "shock-absorbing-lanyard-6ft", free_fall_ft_override = null, de...` | _ | _ | _ |
| calc-cross.js | `computeGearCascade` | `{ stages = [], input_rpm = 0, input_torque = 0, efficiency = 0.97, } = {}` | _ | _ | _ |
| calc-cross.js | `computeGeometry` | `{ shape, ...args }` | _ | _ | _ |
| calc-cross.js | `computeHaversineDistance` | `{ lat1, lon1, lat2, lon2 }` | _ | _ | _ |
| calc-cross.js | `computeHeatStress` | `{ T_F = 0, RH_percent = 0, solar = false }` | _ | _ | _ |
| calc-cross.js | `computeHydraulicCylinder` | `{ bore_in = 0, rod_in = 0, pressure_psi = 0, flow_gpm = 0, direction = "exten...` | _ | _ | _ |
| calc-cross.js | `computeLadderAngle` | `{ ladder_length_ft = 0, working_height_ft = 0 }` | _ | _ | _ |
| calc-cross.js | `computeLinearInterpolation` | `{ x1 = 0, y1 = 0, x2 = 0, y2 = 0, x = 0 } = {}` | _ | _ | _ |
| calc-cross.js | `computeLoanPayment` | `{ principal, apr_percent, term_months }` | _ | _ | _ |
| calc-cross.js | `computeMarkup` | `{ cost, mode, value }` | _ | _ | _ |
| calc-cross.js | `computeMaterialCost` | `{ unit_price, quantity, tax_rate_percent = 0, delivery_fee = 0 }` | _ | _ | _ |
| calc-cross.js | `computeMileageCost` | `{ round_trip_miles, mpg, fuel_price_per_gallon, irs_rate_per_mile = IRS_STAND...` | _ | _ | _ |
| calc-cross.js | `computeNIOSHLifting` | `{ weight_lb = 0, H_in = 10, V_in = 30, D_in = 0, asymmetry_deg = 0, frequency...` | _ | _ | _ |
| calc-cross.js | `computeNoiseDose` | `{ rows = [] } = {}` | _ | _ | _ |
| calc-cross.js | `computeOvertime` | `{ total_hours, regular_rate, overtime_multiplier = 1.5, double_time_multiplie...` | _ | _ | _ |
| calc-cross.js | `computePerDiem` | `{ state, type = "lodging" }` | _ | _ | _ |
| calc-cross.js | `computePulleyMA` | `{ rig = "block_2", efficiency = 0.95 }` | _ | _ | _ |
| calc-cross.js | `computePumpTdh` | `{ flow_gpm = 0, internal_diameter_in = 0, hw_c = 150, static_suction_lift_ft ...` | _ | _ | _ |
| calc-cross.js | `computeRainwaterCatchmentArea` | `{ target_annual_gal = 0, annual_in = 0, efficiency = 0.62 } = {}` | _ | _ | _ |
| calc-cross.js | `computeRainwaterYield` | `{ catchment_ft2 = 0, monthly_in = [], annual_in = null, efficiency = 0.62 }` | _ | _ | _ |
| calc-cross.js | `computeRampSlope` | `{ rise_in = 0, run_in = 0 }` | _ | _ | _ |
| calc-cross.js | `computeRollingOffset` | `{ rise_in, roll_in, angle_deg }` | _ | _ | _ |
| calc-cross.js | `computeSalesTax` | `{ state, subtotal, custom_rate_percent = null }` | _ | _ | _ |
| calc-cross.js | `computeSlopeFromLevel` | `{ value, from }` | _ | _ | _ |
| calc-cross.js | `computeTankVolume` | `{ orientation = "horizontal", linear_unit = "in", diameter = 0, length = 0, d...` | _ | _ | _ |
| calc-cross.js | `computeTimeAndMaterials` | `{ hours, labor_rate_per_hour, material_cost, overhead_percent = 0, profit_per...` | _ | _ | _ |
| calc-cross.js | `computeTimesheet` | `{ jobs = [], regular_rate = 0, weekly_overtime_threshold_hr = 40, irs_rate_pe...` | _ | _ | _ |
| calc-cross.js | `computeTipOut` | `{ total_amount, members }` | _ | _ | _ |
| calc-cross.js | `computeTrenchSlope` | `{ depth_ft = 0, soil_class = "B", surcharge = false }` | _ | _ | _ |
| calc-cross.js | `computeUpgradeROI` | `{ incremental_cost, annual_savings, discount_rate_percent = 0, years = 10 }` | _ | _ | _ |
| calc-cross.js | `computeVbeltDrive` | `{ driver_rpm = 0, driven_rpm = 0, driver_hp = 0, driver_pitch_diameter_in = 0...` | _ | _ | _ |
| calc-cross.js | `computeVehicleLoad` | `{ wheelbase_in = 0, payload_lb = 0, payload_position_from_cab_in = 0, gvwr_lb...` | _ | _ | _ |
| calc-cross.js | `computeWindChill` | `{ T_F = 0, wind_mph = 0 }` | _ | _ | _ |
| calc-cross.js | `computeWindChillWindSpeed` | `{ T_F = 0, target_wc_F = 0 } = {}` | _ | _ | _ |
| calc-cross.js | `convertTemperature` | `{ value, from, to }` | _ | _ | _ |
| calc-cross.js | `convertUnit` | `{ category, value, from, to }` | _ | _ | _ |
| calc-cross.js | `renderDilution` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderGeometry` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderHaversineDistance` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderLoanPayment` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderMarkup` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderMaterialCost` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderMileageCost` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderOvertime` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderPerDiem` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderSalesTax` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderSlopeFromLevel` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderTimeAndMaterials` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderTipOut` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderUnitConverter` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-cross.js | `renderUpgradeROI` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-demo.js | `computeAbatementContainment` | `{ room_len_ft, room_wid_ft, room_ht_ft, ach_target = 4, nam_cfm = 1500, debri...` | _ | _ | _ |
| calc-demo.js | `computeFloodCutQuantity` | `{ wall_run_lf, cut_height_in = 24, two_sided = false, insulated = false } = {}` | _ | _ | _ |
| calc-demo.js | `computeMoistureDryGoal` | `{ reference_reading, affected_reading, acceptable_delta = 4 } = {}` | _ | _ | _ |
| calc-disinfect.js | `computeMainDisinfectionChlorine` | `{ diameter_in = 0, length_ft = 0, dose_mg_l = 25, product_pct = 65 } = {}` | _ | _ | _ |
| calc-disinfect.js | `computeWellShockChlorination` | `{ casing_diameter_in = 0, water_column_ft = 0, target_ppm = 100, bleach_pct =...` | _ | _ | _ |
| calc-drainage.js | `computeDrywellInfiltration` | `{ runoff_volume_ft3 = 200, void_ratio = 0.35, trench_depth_ft = 4, infiltrati...` | _ | _ | _ |
| calc-drainage.js | `computeOverflowScupperSizing` | `{ length_in = 0, head_in = 0 } = {}` | _ | _ | _ |
| calc-drainage.js | `computeRoofDrainSizing` | `{ roof_area, rainfall_rate, drain_slope = "1/4", leader_table = null, horiz_t...` | _ | _ | _ |
| calc-drainage.js | `computeScupperWidthForFlow` | `{ required_gpm = 0, head_in = 0 } = {}` | _ | _ | _ |
| calc-drainage.js | `computeSewageForceMainVelocity` | `{ gpm = 0, id_in = 0 } = {}` | _ | _ | _ |
| calc-drainage.js | `computeSumpBasinSizing` | `{ basin_dia, drawdown_in, inflow_gpm, pump_gpm, min_run_s = 60 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeAtterbergIndices` | `{ ll = 0, pl = 0, w_pct = 0 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeCheckDamSpacing` | `{ dam_height_ft = 0, channel_slope_pct = 0, reach_length_ft = 0 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeCompactionRollerProduction` | `{ drum_width_ft, speed_mph, lift_in, passes, efficiency = 0.75 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeDewateringRate` | `{ pit_len_ft, pit_wid_ft, drawdown_ft = 0, drawdown_min, inflow_gpm = 0, safe...` | _ | _ | _ |
| calc-earthwork.js | `computeDozerProduction` | `{ blade_cap_lcy, push_dist_ft, push_speed_fpm, return_speed_fpm, fixed_min = ...` | _ | _ | _ |
| calc-earthwork.js | `computeDumpTruckLoads` | `{ total_lcy = 625, box_vol_cy = 12, weight_limit_lb = 40000, material_density...` | _ | _ | _ |
| calc-earthwork.js | `computeDustControlWater` | `{ length_ft = 2000, width_ft = 20, rate_gal_per_sy = 0.5, truck_cap_gal = 400...` | _ | _ | _ |
| calc-earthwork.js | `computeErosionBlanketCoverage` | `{ area_sf = 0, overlap_pct = 10, roll_width_ft = 8, roll_length_ft = 112.5, s...` | _ | _ | _ |
| calc-earthwork.js | `computeFinenessModulus` | `{ r4 = 0, r8 = 0, r16 = 0, r30 = 0, r50 = 0, r100 = 0 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeFlexiblePipeDeflection` | `{ cover_ft = 12, soil_density_pcf = 120, deflection_lag = 1.5, bedding_consta...` | _ | _ | _ |
| calc-earthwork.js | `computeHaulCycleProduction` | `{ truck_cap_lcy, load_min, haul_min = 0, dump_min = 0, return_min = 0, spot_m...` | _ | _ | _ |
| calc-earthwork.js | `computeHaulRoadResistance` | `{ gvw_lb = 150000, grade_pct = 5, rolling_resistance_pct = 4 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeHddPullback` | `{ eff_weight_plf = 5, length_ft = 800, friction_coeff = 0.3, bend_factor = 1....` | _ | _ | _ |
| calc-earthwork.js | `computeHydroseedMix` | `{ area_ac = 0, seed_rate_lb_ac = 5, mulch_rate_lb_ac = 2000, tackifier_rate_l...` | _ | _ | _ |
| calc-earthwork.js | `computeLoaderProduction` | `{ bucket_cap_lcy, fill_factor = 0.95, cycle_min, eff_min_per_hr = 50, hours_p...` | _ | _ | _ |
| calc-earthwork.js | `computePipeBeddingBackfill` | `{ trench_width_ft, pipe_od_in, bedding_depth_in = 0, cover_ft = 0, length_ft,...` | _ | _ | _ |
| calc-earthwork.js | `computePipeFlotation` | `{ pipe_od_in = 48, pipe_weight_plf = 200, backfill_weight_plf = 900, target_f...` | _ | _ | _ |
| calc-earthwork.js | `computeRelativeCompaction` | `{ wet_pcf = 0, w_pct = 0, max_pcf = 0, spec_pct = 95 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeRestrainedPipeLength` | `{ pipe_od_in = 12, pressure_psi = 150, bend_angle_deg = 90, unit_resistance_p...` | _ | _ | _ |
| calc-earthwork.js | `computeRipperProduction` | `{ spacing_ft, penetration_ft, speed_fpm, efficiency = 0.75 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeRiprapD50` | `{ velocity_fps, specific_gravity = 2.65, turbulence_coeff = 0.86, safety_fact...` | _ | _ | _ |
| calc-earthwork.js | `computeRiprapTonnage` | `{ area_sf = 0, thickness_ft = 0, unit_wt_pcf = 165 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeRockConstructionEntrance` | `{ length_ft = 50, width_ft = 14, depth_in = 6, unit_wt_pcf = 100 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeRusleSoilLoss` | `{ r_factor, k_factor, ls_factor, c_factor, p_factor, acres } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeSedimentBasinVolume` | `{ disturbed_ac = 0, storage_rule_cf_per_ac = 3600, basin_depth_ft = 3 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeSiltFenceDrainage` | `{ tributary_area_ac = 0, fence_length_ft = 0, slope_length_ft = 0, max_slope_...` | _ | _ | _ |
| calc-earthwork.js | `computeSoilPhaseRelations` | `{ gamma_pcf = 0, w_pct = 0, gs = 2.70 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeSoilStabilizationQuantity` | `{ application_pct = 6, soil_density_pcf = 110, depth_in = 8, area_sy = 10000 ...` | _ | _ | _ |
| calc-earthwork.js | `computeSoilSwellShrink` | `{ bank_cy, swell_pct = 25, shrink_pct = 15 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeSpoilSetback` | `{ trench_depth_ft, spoil_height_ft, repose_deg = 34, min_setback_ft = 2 } = {}` | _ | _ | _ |
| calc-earthwork.js | `computeUnitCostEarthwork` | `{ equipment_rate_per_hr = 150, operator_rate_per_hr = 65, support_rate_per_hr...` | _ | _ | _ |
| calc-earthwork.js | `computeWaterForCompaction` | `{ volume_bcy, dry_density_pcf, omc_pct, field_pct } = {}` | _ | _ | _ |
| calc-edu.js | `computeAlternateReadability` | `{ text }` | _ | _ | _ |
| calc-edu.js | `computeBaseConvert` | `{ value, from_base, to_base }` | _ | _ | _ |
| calc-edu.js | `computeBellCurve` | `{ raw_score, mean, sd }` | _ | _ | _ |
| calc-edu.js | `computeCategoryWeightedGrade` | `{ categories = [] } = {}` | _ | _ | _ |
| calc-edu.js | `computeChiSquareGof` | `{ observed, expected, expected_type = "counts", alpha = 0.05 }` | _ | _ | _ |
| calc-edu.js | `computeConfidenceInterval` | `{ mode, n, proportion, mean, sd, confidence_pct }` | _ | _ | _ |
| calc-edu.js | `computeCurveGradeScaler` | `{ method = "flat", raw_score = 0, param = 0, class_mean = 0 } = {}` | _ | _ | _ |
| calc-edu.js | `computeFinalGradeNeeded` | `{ current_pct = 0, final_weight_pct = 0, target_pct = 0 } = {}` | _ | _ | _ |
| calc-edu.js | `computeGPA` | `{ courses }` | _ | _ | _ |
| calc-edu.js | `computeLexileBand` | `{ grade }` | _ | _ | _ |
| calc-edu.js | `computeLinearRegression` | `{ x_values, y_values, predict_x = null, alpha = 0.05 }` | _ | _ | _ |
| calc-edu.js | `computeLinearSystem2x2` | `{ a1, b1, c1, a2, b2, c2 }` | _ | _ | _ |
| calc-edu.js | `computePearson` | `{ x_values, y_values, alpha = 0.05 }` | _ | _ | _ |
| calc-edu.js | `computePeriodicElement` | `{ query }` | _ | _ | _ |
| calc-edu.js | `computeQuadratic` | `{ a, b, c }` | _ | _ | _ |
| calc-edu.js | `computeReadability` | `{ text }` | _ | _ | _ |
| calc-edu.js | `computeSampleSizeForMargin` | `{ proportion, target_moe, confidence_pct }` | _ | _ | _ |
| calc-edu.js | `computeScientificNotation` | `{ value }` | _ | _ | _ |
| calc-edu.js | `computeSigFigs` | `{ value, target_sig_figs }` | _ | _ | _ |
| calc-edu.js | `computeStandardsBasedGrade` | `{ rows }` | _ | _ | _ |
| calc-edu.js | `computeStatistics` | `{ values }` | _ | _ | _ |
| calc-edu.js | `computeTwoSampleTTest` | `{ mean1 = 0, sd1 = 0, n1 = 0, mean2 = 0, sd2 = 0, n2 = 0, tail = "two", alpha...` | _ | _ | _ |
| calc-edu.js | `countSentences` | `text` | _ | _ | _ |
| calc-edu.js | `countSigFigs` | `raw` | _ | _ | _ |
| calc-edu.js | `countSyllables` | `text` | _ | _ | _ |
| calc-edu.js | `countSyllablesInWord` | `word` | _ | _ | _ |
| calc-edu.js | `countWords` | `text` | _ | _ | _ |
| calc-edu.js | `renderAlternateReadability` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderBaseConvert` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderBellCurve` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderChiSquareGof` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderConfidenceInterval` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderCurveGradeScaler` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderGPA` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderLexileBand` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderLinearRegression` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderLinearSystem2x2` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderPearson` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderPeriodicElement` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderQuadratic` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderReadability` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderSampleSizeForMargin` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderScientificNotation` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderSigFigs` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderStandardsBasedGrade` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `renderStatistics` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-edu.js | `roundToSigFigs` | `value, n` | _ | _ | _ |
| calc-elecdesign.js | `computeEgressLightingCheck` | `{ avg_fc = 0, min_fc = 0, max_fc = 0, mode = "normal" } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeGroundPotentialRise` | `{ grid_current_a = 0, grid_resistance_ohm = 0, tolerable_touch_v = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeLightingLightLossFactor` | `{ LLD = 0, LDD = 0, BF = 0, LBO = 0, RSDD = 0, other = 0, initial_lm = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeLightingUniformityRatio` | `{ readings = [], target_avgmin = 0, target_maxmin = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeLumenMethod` | `{ target_fc = 0, area_sqft = 0, lumens_per_lum = 0, cu = 0.7, llf = 0.8 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeLuminaireHeightForIlluminance` | `{ intensity_cd = 0, target_fc = 0, angle_deg = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeLuminaireSpacingMh` | `{ smh_ratio = 1.3, mounting_height_ft = 8, actual_spacing_ft = 9 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeMaxGridResistanceForTouch` | `{ tolerable_touch_v = 0, grid_current_a = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeNeutralGroundingResistor` | `{ system_voltage_ll_v = 0, target_fault_a = 0, duty = "hrg" } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computePointIlluminance` | `{ intensity_cd = 0, mount_height_ft = 0, angle_deg = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computePointMethodRequiredCandela` | `{ target_illuminance = 0, illuminance_unit = "fc", mount_height_ft = 0, angle...` | _ | _ | _ |
| calc-elecdesign.js | `computePullBoxSizing` | `{ pull_type = "straight", largest_raceway_in = 0, other_raceways_in = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeRollingSphereProtection` | `{ mast_height_ft = 0, sphere_radius_ft = 150 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeRoomCavityRatio` | `{ room_length_ft = 40, room_width_ft = 30, cavity_height_ft = 8 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeSccrCombination` | `{ component_sccrs_ka = [], feeder_ir_ka = 0, available_fault_ka = 0 } = {}` | _ | _ | _ |
| calc-elecdesign.js | `computeStepTouchVoltage` | `{ clearing_time_s = 0, surface_resistivity = 0, native_resistivity = 0, layer...` | _ | _ | _ |
| calc-electrical.js | `computeAmbientAmpacityAdjust` | `{ base_ampacity_a = 0, temp_column = 75, ambient_c = 30, conductor_count = 3,...` | _ | _ | _ |
| calc-electrical.js | `computeArcFlashScreen` | `{ voltage_V = 0, bolted_fault_A = 0, clearing_time_s = 0, working_distance_in...` | _ | _ | _ |
| calc-electrical.js | `computeAsymmetricalFaultXr` | `{ isym_ka = 0, x_over_r = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeAwgWireGeometry` | `{ awg = "12" } = {}` | _ | _ | _ |
| calc-electrical.js | `computeBatteryHydrogenVent` | `{ cell_count = 0, charge_current_a = 0, room_volume_ft3 = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeBatteryInverterDcConductor` | `{ inverter_power_w = 4000, battery_voltage_v = 48, efficiency_pct = 90 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeBatteryVentMaxCurrent` | `{ available_cfm = 0, cell_count = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeBendRadius` | `{ cable_type, cable_od_in }` | _ | _ | _ |
| calc-electrical.js | `computeBendsBetweenPulls` | `{ bend1_deg = 0, bend2_deg = 0, bend3_deg = 0, bend4_deg = 0, bend5_deg = 0, ...` | _ | _ | _ |
| calc-electrical.js | `computeBondingJumper` | `{ mode = "supply-side", material = "copper", service_kcmil = 0, ocpd_A = 0, p...` | _ | _ | _ |
| calc-electrical.js | `computeBoxFill` | `{ box_volume_in3, conductors_by_size, devices = 0, internal_clamps = false, l...` | _ | _ | _ |
| calc-electrical.js | `computeBranchCircuitWireFootage` | `{ circuits = 20, avg_homerun_ft = 45, makeup_ft = 15, conductors_per_circuit ...` | _ | _ | _ |
| calc-electrical.js | `computeBreakerSize` | `{ load_A, continuous, load_W = 0, voltage_V = 0, power_factor = 1, phase = "s...` | _ | _ | _ |
| calc-electrical.js | `computeBuckBoostSizing` | `{ supply_v = 0, desired_v = 0, load_a = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeCableReelCapacity` | `{ flange_dia_in = 30, drum_dia_in = 12, traverse_width_in = 18, cable_od_in =...` | _ | _ | _ |
| calc-electrical.js | `computeCapacitorDischargeTime` | `{ capacitance_uf = 0, initial_voltage = 0, safe_voltage = 50, time_limit_s = ...` | _ | _ | _ |
| calc-electrical.js | `computeConductorResistance` | `{ material, awg, length_ft, temperature_C }` | _ | _ | _ |
| calc-electrical.js | `computeConductorShortCircuitWithstand` | `{ area_cmil = 0, fault_current_a = 0, clearing_time_s = 0, material = "copper...` | _ | _ | _ |
| calc-electrical.js | `computeConduitExpansionMaxRun` | `{ temp_change_f = 0, coeff_in_per_in_f = 0.0000338, trigger_in = 0.25 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeConduitFill` | `{ conduit, trade_size, conductors }` | _ | _ | _ |
| calc-electrical.js | `computeConduitJamRatio` | `{ conduit_id_in = 0, conductor_od_in = 0, n_conductors = 3 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeConduitNipple60Fill` | `{ conduit_area_sqin = 0.864, conductor_area_sqin = 0.0211, conductor_count = ...` | _ | _ | _ |
| calc-electrical.js | `computeConduitThermalExpansion` | `{ run_length_ft = 0, temp_change_f = 0, coeff_in_per_in_f = 0.0000338, trigge...` | _ | _ | _ |
| calc-electrical.js | `computeDeltaWyeLinePhase` | `{ configuration = "wye", line_voltage_v = 0, line_current_a = 0, power_factor...` | _ | _ | _ |
| calc-electrical.js | `computeEGCSize` | `{ ocpd_A, material }` | _ | _ | _ |
| calc-electrical.js | `computeEconomicConductorSizing` | `{ current_a = 0, r_small_ohm = 0, r_big_ohm = 0, hours = 0, rate_kwh = 0, ups...` | _ | _ | _ |
| calc-electrical.js | `computeEgcUpsizeProportional` | `{ base_egc_cmil = 0, base_phase_cmil = 0, installed_phase_cmil = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeGFCIReference` | `` | _ | _ | _ |
| calc-electrical.js | `computeGeneratorFuelRuntime` | `{ tank_capacity_gal = 0, consumption_gph = 0, usable_pct = 90, target_runtime...` | _ | _ | _ |
| calc-electrical.js | `computeGeneratorMotorStarting` | `{ motors = [], non_motor_kW = 0, dip_factor = 0.30, starts_per_hour = "occasi...` | _ | _ | _ |
| calc-electrical.js | `computeGeneratorSize` | `{ items = [] }` | _ | _ | _ |
| calc-electrical.js | `computeGroundingElectrodeConductor` | `{ service_kcmil = 0, material = "copper", electrode_type = "rod-pipe-plate" }...` | _ | _ | _ |
| calc-electrical.js | `computeGroundingElectrodeResistance` | `{ electrode_type = "driven_rod", soil_resistivity_ohm_cm = 0, rod_diameter_in...` | _ | _ | _ |
| calc-electrical.js | `computeLVDCDrop` | `{ system_V = 12, awg = "10", run_length_ft = 0, current_A = 0, application = ...` | _ | _ | _ |
| calc-electrical.js | `computeLightingDensity` | `{ area_ft2, occupancy_class }` | _ | _ | _ |
| calc-electrical.js | `computeLuxFootcandle` | `{ mode = "convert", lux = 0, footcandles = 0, lumens = 0, area_ft2 = 0, cu = ...` | _ | _ | _ |
| calc-electrical.js | `computeMaxCircuitLengthForVd` | `{ source_voltage_v = 120, target_vd_pct = 3, current_a = 20, conductor_cmil =...` | _ | _ | _ |
| calc-electrical.js | `computeMicroinverterBranchCount` | `{ branch_ocpd_a = 20, unit_max_current_a = 1.21 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeMinConductorForVd` | `{ phase = "single", material = "copper", current_A = 0, length_ft = 0, source...` | _ | _ | _ |
| calc-electrical.js | `computeMotorBranchFromNameplate` | `{ hp = 0, voltage_V = 0, phase = 1, eta = 0.90, power_factor = 0.85, nameplat...` | _ | _ | _ |
| calc-electrical.js | `computeMotorBranchProtection` | `{ flc_a = 0, device_type = "inverse-time breaker" } = {}` | _ | _ | _ |
| calc-electrical.js | `computeMotorEfficiencyUpgradeSavings` | `{ hp = 0, load = 0, eff_standard = 0, eff_premium = 0, hours = 0, rate_kwh = ...` | _ | _ | _ |
| calc-electrical.js | `computeMotorFLA` | `{ hp, voltage, phase }` | _ | _ | _ |
| calc-electrical.js | `computeMultiLoadVoltageDrop` | `{ material = "copper", awg = "12", source_voltage_V = 120, loads = [], }` | _ | _ | _ |
| calc-electrical.js | `computeOhmsLaw` | `{ V, I, R, P }` | _ | _ | _ |
| calc-electrical.js | `computeOpenDeltaTransformer` | `{ transformer_kva_each = 25, required_load_kva = 40 } = {}` | _ | _ | _ |
| calc-electrical.js | `computePFCorrection` | `{ kW, pf1, pf2, system_V, phase = "single" }` | _ | _ | _ |
| calc-electrical.js | `computePanelRebalance` | `{ circuits = [], swappable_pairs = null, } = {}` | _ | _ | _ |
| calc-electrical.js | `computePhaseBalance` | `{ circuits = [], threshold_percent = 10 }` | _ | _ | _ |
| calc-electrical.js | `computePoEBudget` | `{ poe_class = "at", category = "Cat6", run_length_ft = 100, ambient_C = 25 }` | _ | _ | _ |
| calc-electrical.js | `computePowerTriangle` | `{ kw = null, kva = null, kvar = null, pf = null, angle_deg = null, sign = "la...` | _ | _ | _ |
| calc-electrical.js | `computePullingTension` | `{ cable_weight_lb_per_ft = 0, run_length_ft = 0, lubricant = "polymer", strai...` | _ | _ | _ |
| calc-electrical.js | `computePvAcOutputCircuit` | `{ ac_power_w = 9600, ac_voltage_v = 240, phases = 1 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeRooftopTempAdder` | `{ measured_ambient_f = 0, height_above_roof_in = 0, base_ampacity_a = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeServiceLoad` | `{ area_ft2 = 0, small_appliance_circuits = 2, laundry_circuits = 1, fixed_app...` | _ | _ | _ |
| calc-electrical.js | `computeServiceLoadOptional` | `{ area_ft2 = 0, small_appliance_circuits = 2, laundry_circuits = 1, fixed_app...` | _ | _ | _ |
| calc-electrical.js | `computeServiceLoadStandard` | `{ area_ft2 = 0, small_appliance_circuits = 2, laundry_circuit = 1, fixed_appl...` | _ | _ | _ |
| calc-electrical.js | `computeShockApproachBoundary` | `{ nominal_v_ac = "151-750 V" } = {}` | _ | _ | _ |
| calc-electrical.js | `computeShortCircuitPP` | `{ utility_kVA = 0, utility_Z_pct = 0, secondary_V = 0, phase = "three", C_val...` | _ | _ | _ |
| calc-electrical.js | `computeSoilResistivityWenner` | `{ probe_spacing_ft = 10, meter_resistance_ohm = 5 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeTerminationTempAmpacity` | `{ amp_90c = 0, amp_75c = 0, amp_60c = 0, termination_rating = 75, over_100a =...` | _ | _ | _ |
| calc-electrical.js | `computeThreePhase` | `{ V_LL, I_L, pf }` | _ | _ | _ |
| calc-electrical.js | `computeTransformerInrushPoint` | `{ kva = 0, primary_voltage_v = 0, phase = 3, inrush_multiple = 12, duration_s...` | _ | _ | _ |
| calc-electrical.js | `computeTransformerKvaSizing` | `{ loads = [], primary_V = 480, secondary_V = 208, phase = "three", growth_res...` | _ | _ | _ |
| calc-electrical.js | `computeTransformerLoadingEfficiency` | `{ kva_rating = 0, noload_w = 0, loadloss_w = 0, load = 0, pf = 1.0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeTransformerSize` | `{ load_kW, power_factor = 1, primary_V, secondary_V, phase = "three" }` | _ | _ | _ |
| calc-electrical.js | `computeTransformerTurnsRatio` | `{ primary_voltage_v = 0, secondary_voltage_v = 0, secondary_current_a = 0, lo...` | _ | _ | _ |
| calc-electrical.js | `computeTransformerVoltageRegulation` | `{ percent_r = 0, percent_x = 0, power_factor = 0.85, leading = false, load_fr...` | _ | _ | _ |
| calc-electrical.js | `computeVoltageDrop` | `{ phase, material, awg, length_ft, current_A, source_voltage_V }` | _ | _ | _ |
| calc-electrical.js | `computeVoltageDropReactance` | `{ system_voltage_v = 0, current_a = 0, length_ft = 0, r_ohm_per_kft = 0, x_oh...` | _ | _ | _ |
| calc-electrical.js | `computeVoltageImbalance` | `{ V_a, V_b, V_c }` | _ | _ | _ |
| calc-electrical.js | `computeWelderArcCircuitConductor` | `{ primary_current_a = 40, duty_pct = 50 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeWelderResistanceCircuitConductor` | `{ primary_current_a = 100, duty_pct = 50 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeWireAmpacity` | `{ awg, material, insulation_rating_C, ambient_C, bundle_count = 1 }` | _ | _ | _ |
| calc-electrical.js | `computeWirePullingLubricant` | `{ length_ft = 400, conduit_id_in = 3, k_factor = 0.0015, bend_factor = 1.0 } ...` | _ | _ | _ |
| calc-electrical.js | `computeWirewayFill` | `{ width_in = 0, height_in = 0, conductor_area_in2 = 0, ccc_count = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `computeWorkingSpace11026` | `{ nominal_v_to_ground = "0-150 V", condition = 1, equipment_width_in = 0 } = {}` | _ | _ | _ |
| calc-electrical.js | `parseConductorShorthand` | `s` | _ | _ | _ |
| calc-electrical.js | `renderAmbientAmpacityAdjust` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderArcFlashScreen` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderBoxFill` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderBreakerSize` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderConductorResistance` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderConduitFill` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderEGC` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderGFCIReference` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderGeneratorSize` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderGroundingElectrode` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderLightingDensity` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderLuxFootcandle` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderMotorBranchFromNameplate` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderMotorFLA` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderOhmsLaw` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderPowerTriangle` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderServiceLoad` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderServiceLoadOptional` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderThreePhase` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderTransformerSize` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderVoltageDrop` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderVoltageDropReactance` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-electrical.js | `renderVoltageImbalance` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-electrical.js | `renderWireAmpacity` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-fab.js | `computeBarstockCutlist` | `{ stock_length_in = 240, piece_length_in = 14.5, kerf_in = 0.125, pieces_need...` | _ | _ | _ |
| calc-fab.js | `computeBendSpringback` | `{ tool_radius_in = 1.0, thickness_in = 0.1, yield_strength_psi = 50000, modul...` | _ | _ | _ |
| calc-fab.js | `computeCoilLength` | `{ outside_diameter_in = 0, inside_diameter_in = 0, material_thickness_in = 0 ...` | _ | _ | _ |
| calc-fab.js | `computeConduit90Stub` | `{ mode = "stub-up", height_in = 0, deduct_in = 0, back_to_back_in = 0, radius...` | _ | _ | _ |
| calc-fab.js | `computeConduitOffset` | `{ offset_in = 0, angle_deg = 0 } = {}` | _ | _ | _ |
| calc-fab.js | `computeConduitSaddle` | `{ mode = "three-point", depth_in = 0, preset = "45/22.5", width_in = 0 } = {}` | _ | _ | _ |
| calc-fab.js | `computeFlangeBoltTorque` | `{ bolt_diameter_in = 0, thread_series = "UNC", bolt_count = 8, tensile_area_i...` | _ | _ | _ |
| calc-fab.js | `computeMinBendRadius` | `{ thickness_in = 0, elongation_pct = 0 } = {}` | _ | _ | _ |
| calc-fab.js | `computeOxyfuelCuttingGas` | `{ oxygen_cfh, fuel_cfh, cut_length_in, cut_speed_ipm, oxygen_cyl_ft3 = 244, f...` | _ | _ | _ |
| calc-fab.js | `computePipeFittingTakeout` | `{ reference = "center-to-center", dimension_in = 0, takeout_a_in = 0, takeout...` | _ | _ | _ |
| calc-fab.js | `computePipeMiterCut` | `{ total_angle_deg = 90, pieces = 2, outside_diameter_in = 0, centerline_radiu...` | _ | _ | _ |
| calc-fab.js | `computePipeTemplateWrap` | `{ outside_diameter_in = 0, cut_angle_deg = 0, stations = 8 } = {}` | _ | _ | _ |
| calc-fab.js | `computeShieldingGasRuntime` | `{ flow_cfh, arc_on_min, cylinder_ft3, gas_cost = 0 } = {}` | _ | _ | _ |
| calc-fab.js | `computeShrinkFit` | `{ nominal_dia_in = 0, interference_in = 0, clearance_in = 0, alpha_per_f = 0....` | _ | _ | _ |
| calc-fab.js | `computeVesselHeadVolume` | `{ inside_diameter_in = 48, head_type = "elliptical", straight_flange_in = 0 }...` | _ | _ | _ |
| calc-fab.js | `computeWeldCostPerFoot` | `{ deposit_lb_per_ft, deposition_eff_pct = 95, filler_cost_per_lb = 0, deposit...` | _ | _ | _ |
| calc-fab.js | `computeWeldDilution` | `{ A_base = 0, A_filler = 0 } = {}` | _ | _ | _ |
| calc-fab.js | `computeWeldGroupEccentric` | `{ load_lb = 0, ecc_in = 0, weld_len_in = 0, separation_in = 0, allow_per_16 =...` | _ | _ | _ |
| calc-fab.js | `computeWeldMetalVolume` | `{ joint_type = "fillet", fillet_leg_in = 0, groove_area_in2 = 0, length_in = ...` | _ | _ | _ |
| calc-fab.js | `computeWeldPassesArcTime` | `{ A_groove = 0, length_in = 0, a_pass = 0, dep_rate = 0, density = 0.283, op_...` | _ | _ | _ |
| calc-fab.js | `computeWeldPreheatFuel` | `{ steel_lb, start_temp_F, preheat_temp_F, efficiency_pct = 25, c_steel = 0.11...` | _ | _ | _ |
| calc-fab.js | `computeWeldTransverseShrinkage` | `{ weld_area_in2 = 0, thickness_in = 0, weld_count = 1 } = {}` | _ | _ | _ |
| calc-fab.js | `computeWeldTravelSpeed` | `{ V_volts = 0, I_amps = 0, eta = 0.8, HI_kjin = 0 } = {}` | _ | _ | _ |
| calc-fab.js | `computeWireFeedDeposition` | `{ wfs_in_min = 0, wire_dia_in = 0, deposition_eff = 0.92 } = {}` | _ | _ | _ |
| calc-fab.js | `computeWireFeedSpeedForDeposition` | `{ target_deposit_lb_hr = 0, wire_dia_in = 0, deposition_eff = 0.92 } = {}` | _ | _ | _ |
| calc-feeder.js | `computeContinuousLoadOcpd` | `{ l_cont_A = 0, l_noncont_A = 0, rated_100 = false } = {}` | _ | _ | _ |
| calc-feeder.js | `computeEvChargerThrottle` | `{ aggregate_limit_a = 0, charger_max_a = 0, active_chargers = 0 } = {}` | _ | _ | _ |
| calc-feeder.js | `computeEvLoadManagementEms` | `{ charger_count = 0, per_charger_a = 0, evems_limit_a = 0, apply_125_setpoint...` | _ | _ | _ |
| calc-feeder.js | `computeExistingLoad22087` | `{ recorded_peak_a = 0, new_load_a = 0, service_rating_a = 0, pv_or_peakshave ...` | _ | _ | _ |
| calc-feeder.js | `computeFeederTapRule` | `{ feeder_ocpd_a = 0, tap_length_ft = 0, tap_ampacity_a = 0 } = {}` | _ | _ | _ |
| calc-feeder.js | `computeGeneratorConductor445` | `{ nameplate_current_a = 0, gen_kw = 0, voltage_v = 0, phase = 3, power_factor...` | _ | _ | _ |
| calc-feeder.js | `computeMotorFeederMultiple` | `{ motors = [], nonmotor_continuous_A = 0, nonmotor_noncontinuous_A = 0 } = {}` | _ | _ | _ |
| calc-feeder.js | `computeTransformerConductorProtection` | `{ kva = 0, primary_v = 0, secondary_v = 0, phase = 3, secondary_protection = ...` | _ | _ | _ |
| calc-field.js | `computeBackcountryNeeds` | `{ body_weight_lb = 0, ambient_band = "moderate", exertion = "moderate", trip_...` | _ | _ | _ |
| calc-field.js | `computeBearingConversion` | `{ declination_deg = 0, bearing_deg = 0, direction = "magnetic_to_true" }` | _ | _ | _ |
| calc-field.js | `computeHikingTime` | `{ distance = 0, distance_unit = "km", ascent = 0, ascent_unit = "m", speed = ...` | _ | _ | _ |
| calc-field.js | `computeLightningCountdown` | `{ flash_to_bang_s = 0 } = {}` | _ | _ | _ |
| calc-field.js | `computeMagneticDeclination` | `` | _ | _ | _ |
| calc-field.js | `computePacing` | `{ calibration_distance_ft = 0, calibration_paces = 0, current_paces = 0, terr...` | _ | _ | _ |
| calc-field.js | `computeSearchProbability` | `{ pod_list = [], poa_pct = 100 } = {}` | _ | _ | _ |
| calc-field.js | `computeSlopeAvalanche` | `{ rise_ft = 0, run_ft = 0, measured_angle_deg = 0 }` | _ | _ | _ |
| calc-field.js | `computeSolarTimes` | `{ lat_deg = 0, lon_deg = 0, date_iso = "", tz_offset_hours = 0 }` | _ | _ | _ |
| calc-field.js | `computeUTM` | `{ direction = "latlon_to_utm", lat_deg = 0, lon_deg = 0, zone = 0, hemisphere...` | _ | _ | _ |
| calc-field.js | `computeWMM` | `{ lat_deg, lon_deg, alt_km = 0, decimal_year, coefficients }` | _ | _ | _ |
| calc-field.js | `decimalYearFromIso` | `iso` | _ | _ | _ |
| calc-field.js | `encodeTimerState` | `t` | _ | _ | _ |
| calc-field.js | `formatTimerMMSS` | `seconds` | _ | _ | _ |
| calc-field.js | `latlonToUTM` | `lat_deg, lon_deg` | _ | _ | _ |
| calc-field.js | `parseTimerState` | `s` | _ | _ | _ |
| calc-field.js | `timerRemainingSeconds` | `t, now_s` | _ | _ | _ |
| calc-field.js | `utmToLatLon` | `zone, hemisphere, easting, northing` | _ | _ | _ |
| calc-finish.js | `computeAtticVentilation` | `{ attic_floor_area_sqft = 0, ratio = "150", intake_vent_nfa_sqin = 9, ridge_n...` | _ | _ | _ |
| calc-finish.js | `computeCementBoardTakeoff` | `{ area_sf = 120, sheet_area_sf = 15, waste_pct = 10, screws_per_sheet = 35 } ...` | _ | _ | _ |
| calc-finish.js | `computeDeckBoardTakeoff` | `{ deck_width_ft = 0, deck_length_ft = 0, board_face_width_in = 5.5, gap_in = ...` | _ | _ | _ |
| calc-finish.js | `computeFlooringTakeoff` | `{ room_length_ft = 0, room_width_ft = 0, box_coverage_sqft = 20, pattern = "s...` | _ | _ | _ |
| calc-finish.js | `computeGlassWeight` | `{ width_in = 0, height_in = 0, thickness_in = 0, panes = 1 } = {}` | _ | _ | _ |
| calc-finish.js | `computeGutterDownspout` | `{ roof_area_sqft = 0, pitch_factor = "1.00", rainfall_in_hr = 5, downspout_sq...` | _ | _ | _ |
| calc-finish.js | `computeGutterDownspoutTakeoff` | `{ eave_length_ft = 140, roof_area_sf = 2400, max_area_per_downspout_sf = 800,...` | _ | _ | _ |
| calc-finish.js | `computePaverPatio` | `{ area_sqft = 0, paver_length_in = 0, paver_width_in = 0, base_depth_in = 6, ...` | _ | _ | _ |
| calc-finish.js | `computeRetainingWallBlock` | `{ wall_length_ft = 0, exposed_height_ft = 0, block_length_in = 18, block_heig...` | _ | _ | _ |
| calc-finish.js | `computeSoffitRidgeVentCount` | `{ attic_area_sf = 1500, vent_ratio = 300, soffit_vent_nfa_in2 = 26, ridge_nfa...` | _ | _ | _ |
| calc-finish.js | `computeStepFlashingCount` | `{ wall_run_ft = 20, shingle_exposure_in = 5, waste_pct = 5 } = {}` | _ | _ | _ |
| calc-finish.js | `computeThinsetCoverage` | `{ area_sqft = 0, trowel = "quarter_three_eighths", coverage_per_bag = 0, bag_...` | _ | _ | _ |
| calc-fire.js | `computeAerialLadderReach` | `{ angle_deg, extension_ft }` | _ | _ | _ |
| calc-fire.js | `computeBrakingDistance` | `{ speed_mph, friction_coefficient, grade_percent = 0, reaction_time_s = 1.5 }` | _ | _ | _ |
| calc-fire.js | `computeConfinedSpaceVent` | `{ length_ft = 0, width_ft = 0, height_ft = 0, volume_ft3 = null, blower_cfm =...` | _ | _ | _ |
| calc-fire.js | `computeDraftLiftMax` | `{ site_elevation_ft = 0, pump_factor = 0.667, suction_losses_ft = 0 } = {}` | _ | _ | _ |
| calc-fire.js | `computeElevationPressureLoss` | `{ mode = "floors", value = 0, floor_height_ft = 10, direction = "up" } = {}` | _ | _ | _ |
| calc-fire.js | `computeFireFriction` | `{ hose_diameter, gpm, length_ft }` | _ | _ | _ |
| calc-fire.js | `computeFireStreamReaction` | `{ nozzle_type = "smooth", bore_in = 0, flow_gpm = 0, nozzle_pressure_psi = 0 ...` | _ | _ | _ |
| calc-fire.js | `computeFoam` | `{ fire_area_ft2, application_rate_gpm_per_ft2 = 0.10, foam_percentage = 3, du...` | _ | _ | _ |
| calc-fire.js | `computeFoamEductorLimit` | `{ inlet_pressure_psi = 0, eductor_flow_gpm = 0, hose_coefficient = 0, nozzle_...` | _ | _ | _ |
| calc-fire.js | `computeFoamMaxCoverageArea` | `{ available_concentrate_gal = 0, application_rate_gpm_per_ft2 = 0.10, foam_pe...` | _ | _ | _ |
| calc-fire.js | `computeHydrantAvailableFlow` | `{ static_psi = 0, residual_psi = 0, qf_gpm = 0 } = {}` | _ | _ | _ |
| calc-fire.js | `computeHydrantFlow` | `{ pitot_psi, outlet_diameter_in, c = 0.9 }` | _ | _ | _ |
| calc-fire.js | `computeIowaRateOfFlow` | `{ length_ft = 0, width_ft = 0, height_ft = 0 } = {}` | _ | _ | _ |
| calc-fire.js | `computeIsoNeededFireFlow` | `{ area_ft2 = 0, stories = 1, construction_class = 3, occupancy_factor = 1.0, ...` | _ | _ | _ |
| calc-fire.js | `computeLadderPipeReach` | `{ angle_deg, extension_ft, nozzle_type, nozzle_pressure_psi }` | _ | _ | _ |
| calc-fire.js | `computeMasterStreamReach` | `{ nozzle_type, nozzle_pressure_psi }` | _ | _ | _ |
| calc-fire.js | `computeNFPA1142WaterSupply` | `{ volume_ft3 = 0, occupancy_class = 7, construction_class = "V", exposure_wit...` | _ | _ | _ |
| calc-fire.js | `computeNfaFiregroundFlow` | `{ length_ft = 0, width_ft = 0, percent_involved = 0, floors_involved = 1, exp...` | _ | _ | _ |
| calc-fire.js | `computePDP` | `{ nozzle_pressure_psi, friction_loss_psi, elevation_ft = 0, appliance_loss_ps...` | _ | _ | _ |
| calc-fire.js | `computeRelayPumpDistance` | `{ target_flow_gpm = 0, hose_coefficient = 0, max_discharge_psi = 0, intake_re...` | _ | _ | _ |
| calc-fire.js | `computeRequiredFireFlow` | `{ structure_area_ft2, construction_class = "ordinary", occupancy_factor = 1.0...` | _ | _ | _ |
| calc-fire.js | `computeReverseLayFriction` | `{ hose_diameter, gpm, length_ft, n_pumps = 1 }` | _ | _ | _ |
| calc-fire.js | `computeScbaCylinderTime` | `{ V_rated_scf = 0, P_rated_psi = 0, P_start_psi = 0, P_alarm_psi = 0, consump...` | _ | _ | _ |
| calc-fire.js | `computeSmokeEjector` | `{ length_ft = 0, width_ft = 0, height_ft = 0, room_volume_ft3 = null, target_...` | _ | _ | _ |
| calc-fire.js | `computeSmokeReading` | `` | _ | _ | _ |
| calc-fire.js | `computeSmoothBoreDiameterForFlow` | `{ target_gpm = 0, nozzle_pressure_psi = 50 } = {}` | _ | _ | _ |
| calc-fire.js | `computeSmoothBoreFlow` | `{ bore_in = 0, nozzle_pressure_psi = 50 } = {}` | _ | _ | _ |
| calc-fire.js | `computeSprinklerDensity` | `{ area_of_operation_ft2, density_gpm_per_ft2, hazard_category }` | _ | _ | _ |
| calc-fire.js | `computeSprinklerKFactor` | `{ solve_for = "flow", flow_gpm = 0, pressure_psi = 0, k_factor = 0 } = {}` | _ | _ | _ |
| calc-fire.js | `computeStandpipeFriction` | `{ riser_height_ft, outlet_count, gpm_per_outlet, outlet_length_ft = 50, hose_...` | _ | _ | _ |
| calc-fire.js | `computeStandpipePDP` | `{ standpipe_class = "I", highest_outlet_elevation_ft = 0, nozzle_pressure_psi...` | _ | _ | _ |
| calc-fire.js | `computeTankerFleetSize` | `{ tank_gal = 0, fill_gpm = 0, dump_gpm = 0, distance_mi = 0, speed_mph = 0 } ...` | _ | _ | _ |
| calc-fire.js | `computeTankerShuttleCycle` | `{ tank_gal = 0, fill_gpm = 0, dump_gpm = 0, distance_mi = 0, speed_mph = 0 } ...` | _ | _ | _ |
| calc-fire.js | `computeTankerShuttleFlow` | `{ nominal_tank_gal = 0, usable_fraction = 0.9, tanker_count = 0, cycle_time_m...` | _ | _ | _ |
| calc-fire.js | `computeVacuumLiftReading` | `{ vacuum_inhg = 0, site_elevation_ft = 0, pump_factor = 0.667 } = {}` | _ | _ | _ |
| calc-fire.js | `computeWaterSupplyDuration` | `{ volume_gal = 0, flow_gpm = 0, resupply_gpm = 0 } = {}` | _ | _ | _ |
| calc-fire.js | `renderAerialLadder` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderBrakingDistance` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderFireFriction` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderFireStreamReaction` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderFoam` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderHydrantFlow` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderLadderPipeReach` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderMasterStream` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderPDP` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderRequiredFireFlow` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderReverseLayFriction` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderScbaCylinder` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderSmokeReading` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderSprinklerDensity` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderSprinklerKFactor` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-fire.js | `renderStandpipeFriction` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-firesprinkler.js | `computeDrypipeAirCompressor` | `{ dry_volume_gal = 400, normal_pressure_psig = 40, restore_minutes = 30 } = {}` | _ | _ | _ |
| calc-firesprinkler.js | `computeFirePumpCurve` | `{ rated_gpm = 0, rated_psi = 0, churn_psi = 0, overload_psi = 0 } = {}` | _ | _ | _ |
| calc-firesprinkler.js | `computeJockeyPumpSizing` | `{ fire_pump_gpm = 750, churn_psi = 120, min_static_psi = 50 } = {}` | _ | _ | _ |
| calc-firesprinkler.js | `computeSmokeDetectorSpacingCount` | `{ room_length_ft = 60, room_width_ft = 40, listed_spacing_ft = 30 } = {}` | _ | _ | _ |
| calc-firesprinkler.js | `computeSprinklerHeadLayout` | `{ room_length = 0, room_width = 0, area_per_head = 130, max_spacing = 15 } = {}` | _ | _ | _ |
| calc-firesprinkler.js | `computeSprinklerPressureDemand` | `{ q_head_gpm = 0, k_factor = 5.6, q_total_gpm = 0, pipe_id_in = 0, c_factor =...` | _ | _ | _ |
| calc-firesprinkler.js | `computeSprinklerProtectionAreaForSupply` | `{ available_supply_gpm = 0, density = 0.20, hose_gpm = 250 } = {}` | _ | _ | _ |
| calc-firesprinkler.js | `computeSprinklerSystemDemand` | `{ density = 0.20, design_area = 1500, hose_gpm = 250, duration_min = 90 } = {}` | _ | _ | _ |
| calc-gas.js | `computeGasAltitudeDerate` | `{ nameplate_input_btuh = 0, elevation_ft = 0, derate_pct_per_1000 = 4, thresh...` | _ | _ | _ |
| calc-gas.js | `computeGasFuelConversion` | `{ appliance_input_btuh = 0, hv_from = 1030, hv_to = 2500, sg_from = 0.60, sg_...` | _ | _ | _ |
| calc-gas.js | `computeGasLeakHoleDiameter` | `{ leak_rate_cfh, upstream_psi, gas, c = 0.7 }` | _ | _ | _ |
| calc-gas.js | `computeGasLeakRate` | `{ orifice_diameter_in, upstream_psi, gas, c = 0.7 }` | _ | _ | _ |
| calc-gas.js | `computeGasPipeMaxFlow` | `{ drop_inwc = 0, id_in = 0, length_ft = 0, sg = 0.6 } = {}` | _ | _ | _ |
| calc-gas.js | `computeGasPipePressureDrop` | `{ flow_cfh = 0, id_in = 0, length_ft = 0, sg = 0.6 } = {}` | _ | _ | _ |
| calc-gas.js | `computeGasPipeSizing` | `{ btu_load, length_ft, gas, dP_in_wc = 0.5, candidate_sizes = ["0.5", "0.75",...` | _ | _ | _ |
| calc-gas.js | `computeMedgasDemand` | `{ stations = 0, per_station_scfm = 0, diversity = 1 } = {}` | _ | _ | _ |
| calc-gas.js | `computeWobbeIndex` | `{ hhv_btu_ft3 = 1000, specific_gravity = 0.60 } = {}` | _ | _ | _ |
| calc-gas.js | `renderGasLeakRate` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-gas.js | `renderGasPipeSizing` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-gas.js | `spitzglassFlow` | `{ d_in, dP_in_wc, specific_gravity, L_ft }` | _ | _ | _ |
| calc-geotech.js | `computeAtRestEarthPressure` | `{ phi = 0, gamma = 120, h_ft = 0, q = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeBoussinesqSurchargeWall` | `{ ql_plf = 0, h_ft = 0, x_ft = 0, z_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeConsolidationDegree` | `{ cv_ft2_day = 0, hdr_ft = 0, t_days = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeConsolidationTimeRate` | `{ u_percent = 0, cv_ft2_day = 0, hdr_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeCoulombEarthPressure` | `{ phi = 0, delta = 0, theta = 0, alpha = 0, gamma = 120, h_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeElasticSettlementAllowablePressure` | `{ settlement_limit_in = 1, b_ft = 0, es_ksf = 0, nu = 0.3, is_f = 0.82 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeFootingEccentricPressure` | `{ p_kip = 0, m_kft = 0, b_ft = 0, l_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeFrostDepthBerggren` | `{ freezing_index_f_days = 2000, frozen_conductivity_btu = 1.0, dry_density_pc...` | _ | _ | _ |
| calc-geotech.js | `computeLateralEarthPressure` | `{ phi = 0, gamma = 120, h_ft = 0, q = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeLiquefactionScreening` | `{ amax_g = 0, sigma_v_psf = 0, sigma_vp_psf = 0, depth_ft = 0, crr = 0, msf =...` | _ | _ | _ |
| calc-geotech.js | `computePileAxialCapacity` | `{ d_ft = 0, l_ft = 0, cu_ksf = 0, alpha = 0.55, fs = 3 } = {}` | _ | _ | _ |
| calc-geotech.js | `computePileGroupEfficiency` | `{ rows_n = 0, cols_m = 0, diameter_in = 0, spacing_in = 0, single_allow_kip =...` | _ | _ | _ |
| calc-geotech.js | `computePileGroupSpacingForEfficiency` | `{ rows_n = 0, cols_m = 0, diameter_in = 0, target_eg = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computePileLengthForCapacity` | `{ qall_target_kip = 0, d_ft = 0, cu_ksf = 0, alpha = 0.55, fs = 3 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeRetainingWallStability` | `{ h_ft = 0, b_ft = 0, t_base = 0, t_stem = 0, toe_ft = 0, gamma_s = 110, gamm...` | _ | _ | _ |
| calc-geotech.js | `computeSettlementLimitLoad` | `{ sc_allow_in = 0, cc = 0, h_ft = 0, e0 = 0, sig0_psf = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSlopeFailureDepthForFs` | `{ beta_deg = 0, phi_deg = 0, c_psf = 0, gamma_pcf = 120, target_fs = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSlopeStabilityInfinite` | `{ beta_deg = 0, phi_deg = 0, c_psf = 0, gamma_pcf = 120, h_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSlopeStabilitySeepage` | `{ beta_deg = 0, phi_deg = 0, c_psf = 0, gamma_sat = 125, h_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSlopedBackfillEarthPressure` | `{ phi = 0, beta = 0, gamma = 120, h_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSoilBearingCapacity` | `{ c = 0, phi = 0, gamma = 120, b_ft = 0, df_ft = 0, shape = "strip", fs = 3 }...` | _ | _ | _ |
| calc-geotech.js | `computeSoilConsolidationSettlement` | `{ cc = 0, h_ft = 0, e0 = 0, sig0_psf = 0, dsig_psf = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSoilSettlementElastic` | `{ q_ksf = 0, b_ft = 0, es_ksf = 0, nu = 0.3, is_f = 0.82 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSptBearingCapacity` | `{ n60 = 0, b_ft = 0, d_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSptRequiredN60` | `{ qa_target_ksf = 0, b_ft = 0, d_ft = 0 } = {}` | _ | _ | _ |
| calc-geotech.js | `computeSubmergedEarthPressure` | `{ phi = 0, gamma_sat = 125, h_ft = 0, q = 0 } = {}` | _ | _ | _ |
| calc-historical.js | `computeHistorical` | `{ commodity, lookback_months = 12, shard }` | _ | _ | _ |
| calc-historical.js | `computePercentileBands` | `{ points = [], lookback_months = 12 } = {}` | _ | _ | _ |
| calc-historical.js | `quantile` | `values, p` | _ | _ | _ |
| calc-hvac.js | `bandLabel` | `value, low, high` | _ | _ | _ |
| calc-hvac.js | `computeAdpiSelection` | `{ diffuser_type = "circular-ceiling", cooling_load = 40, throw_ft = 0, char_l...` | _ | _ | _ |
| calc-hvac.js | `computeAffinityLaws` | `{ baseline_RPM = 0, baseline_CFM = 0, baseline_SP_in_wc = 0, baseline_kW = 0,...` | _ | _ | _ |
| calc-hvac.js | `computeAirDensityCorrection` | `{ elev_ft = 0, T_F = 70, acfm = 0, rated_sp = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeAirLeakCost` | `{ compressor_cfm = 0, load_min = 0, unload_min = 0, specific_power = 22, run_...` | _ | _ | _ |
| calc-hvac.js | `computeAirPressureSetpointSavings` | `{ current_psig = 0, reduced_psig = 0, inlet_psia = 14.7, input_kw = 0, run_ho...` | _ | _ | _ |
| calc-hvac.js | `computeAirReceiver` | `{ tools = [], pump_scfm = 0, p_high_psi = 0, p_low_psi = 0, drawdown_minutes ...` | _ | _ | _ |
| calc-hvac.js | `computeApproachDeltaT` | `{ outdoor_F, condenser_saturation_F, supply_F, return_F, approach_normal_low ...` | _ | _ | _ |
| calc-hvac.js | `computeAssemblyRValue` | `{ cavity_r = 0, continuous_r = 0, stud_depth_in = 0, framing_factor = 0.25, a...` | _ | _ | _ |
| calc-hvac.js | `computeBalancePoint` | `{ heating_capacity_btu_hr_at_design, design_outdoor_F, building_heat_loss_btu...` | _ | _ | _ |
| calc-hvac.js | `computeBaseboardLengthForLoad` | `{ target_btuhr = 0, water_temp_F = 0, flow_gpm = 1, model = "slant_fin_baseli...` | _ | _ | _ |
| calc-hvac.js | `computeBaseboardOutput` | `{ water_temp_F = 0, flow_gpm = 1, length_ft = 0, model = "slant_fin_baseline" }` | _ | _ | _ |
| calc-hvac.js | `computeBeltAndPulley` | `{ drive_dia_in = 0, driven_dia_in = 0, center_distance_in = 0, motor_rpm = 0 }` | _ | _ | _ |
| calc-hvac.js | `computeBlownInsulationCoverage` | `{ area_sqft = 0, bags_per_1000 = 0, r_per_inch = 3.5, target_r = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeBuildingUa` | `{ assemblies, cfm_inf = 0, dt_f = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeCfmPerTon` | `{ tons, climate = "standard" }` | _ | _ | _ |
| calc-hvac.js | `computeCoilBypassFactor` | `{ t_ent_f = 0, t_lvg_f = 0, t_adp_f = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeColebrookFrictionFactor` | `{ reynolds = 0, rel_roughness = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeCombustionAir` | `{ btu_input, room_volume_ft3 }` | _ | _ | _ |
| calc-hvac.js | `computeCombustionAirMaxInput` | `{ room_volume_ft3 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeCompressedAirPower` | `{ free_air_cfm = 0, inlet_psia = 14.7, discharge_psig = 0, overall_eff = 0.75...` | _ | _ | _ |
| calc-hvac.js | `computeCoolingCoilTotalLoad` | `{ cfm = 0, h_ent_btu = 0, h_lvg_btu = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeCoolingTower` | `{ T_in_F = 0, T_out_F = 0, T_wb_F = 0, gpm = 0, fan_kW = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeDcvCo2Ventilation` | `{ n = 0, co2_set_ppm = 0, co2_oa_ppm = 400, gen_cfm = 0.0106 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeDegreeDayEnergy` | `{ ua_btuhf = 0, hdd = 0, eff = 0.80, fuel = "gas", price = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeDrybulbFromEnthalpy` | `{ enthalpy_btu = 0, w_lb_lb = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeDualFuelBalancePoint` | `{ rate_kwh = 0, rate_therm = 0, afue = 0.95, cop_now = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeDuctFrictionStatic` | `{ shape = "round", D_in = 0, W_in = 0, H_in = 0, material = "galv_smooth", cf...` | _ | _ | _ |
| calc-hvac.js | `computeDuctHeatGain` | `{ R_duct = 0, A_ft2 = 0, dT_F = 0, cfm = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeDuctLeakage` | `{ design_cfm = 0, measured_cfm = 0, duct_surface_ft2 = 0, test_pressure_inwc ...` | _ | _ | _ |
| calc-hvac.js | `computeDuctSize` | `{ cfm, friction_in_wc_per_100ft = 0.08, roughness_ft = DUCT_ROUGHNESS_FT }` | _ | _ | _ |
| calc-hvac.js | `computeEconomizerEnthalpyChangeover` | `{ mode = "differential_enthalpy", h_outdoor = 0, h_return = 0, t_outdoor_f = ...` | _ | _ | _ |
| calc-hvac.js | `computeEconomizerSavingsHours` | `{ cfm = 0, delta_t_f = 0, hours = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeEquivalentLength` | `{ items = [] }` | _ | _ | _ |
| calc-hvac.js | `computeErvSensibleRecovery` | `{ cfm = 0, t_oa_F = 0, t_ra_F = 0, eps_s = 0.75 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeErvTotalEnthalpyRecovery` | `{ cfm = 0, effectiveness = 0, h_outdoor = 0, h_return = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeEvaporativeCoolerEffectiveness` | `{ dry_bulb_F, wet_bulb_F, effectiveness = 0.85 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeEvaporativeCooling` | `{ evaporation_rate_lb_hr, hfg_btu_per_lb = HFG_WATER_BTU_PER_LB }` | _ | _ | _ |
| calc-hvac.js | `computeFanAffinityLaws` | `{ q1_cfm = 0, sp1_inwg = 0, bhp1_hp = 0, n1 = 0, n2 = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeFanMotorBhp` | `{ cfm = 0, tsp_inwc = 0, eta_fan = 0.65, eta_drive = 1 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeFanMotorMaxAirflow` | `{ power_hp = 0, power_basis = "motor", tsp_inwc = 0, eta_fan = 0.65, eta_driv...` | _ | _ | _ |
| calc-hvac.js | `computeGeothermalLoop` | `{ heating_btu = 0, cooling_btu = 0, soil = "clay", loop_type = "vertical" }` | _ | _ | _ |
| calc-hvac.js | `computeGrilleFaceVelocity` | `{ mode = "velocity", cfm = 0, ratio = 0.75, A_gross_ft2 = 0, V_target = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeHeatPumpColdCapacity` | `{ cap_47_btuh = 0, cap_17_btuh = 0, design_temp_f = 0, design_load_btuh = 0 }...` | _ | _ | _ |
| calc-hvac.js | `computeHeatPumpSeasonalEnergy` | `{ seasonal_load_mmbtu = 0, hspf = 0, rate_kwh = 0, afue = 0.95, rate_therm = ...` | _ | _ | _ |
| calc-hvac.js | `computeHoodExhaust` | `{ hood_type = "wall-canopy", hood_class = "I", duty = "medium", length_ft = 0...` | _ | _ | _ |
| calc-hvac.js | `computeHydronicGpmDeltat` | `{ load = 0, unit_tons = 0, dt_f = 0, factor = 500 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeInsulationHeatLoss` | `{ pipe_OD_in = 0, surface_T_F = 0, ambient_T_F = 0, air_velocity_fpm = 0, ins...` | _ | _ | _ |
| calc-hvac.js | `computeInsulationThickness` | `{ pipe_od_in, surface_temp_F, ambient_F, surface_limit_F, k_btu_in_per_hr_ft2...` | _ | _ | _ |
| calc-hvac.js | `computeInsulationThicknessForHeatLoss` | `{ od_in = 0, k_value = 0, hot_f = 0, amb_f = 0, target_q_per_ft_btuh = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeIsolatorDeflection` | `{ equipment_rpm = 0, target_efficiency = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeManualDFrictionRate` | `{ blower_esp_inwg = 0, component_drop_inwg = 0, tel_ft = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeMoistAirEnthalpy` | `{ t_db_f = 0, w_lb_lb = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeMuaTemperingLoad` | `{ cfm = 0, t_oa_F = 0, t_target_F = 0, eta = 0.80, w_oa_gr = 0, w_target_gr =...` | _ | _ | _ |
| calc-hvac.js | `computeNPSHa` | `{ elevation_ft = 0, water_temp_F = 60, source_elevation_relative_ft = 0, // p...` | _ | _ | _ |
| calc-hvac.js | `computeOutdoorAirMix` | `{ return_T_F, return_RH_percent, outdoor_T_F, outdoor_RH_percent, oa_fraction }` | _ | _ | _ |
| calc-hvac.js | `computeOutdoorAirVentilation` | `{ Rp_cfm_per_person = 0, Ra_cfm_per_ft2 = 0, people = 0, floor_area_ft2 = 0, ...` | _ | _ | _ |
| calc-hvac.js | `computePipeHeatLossRadial` | `{ od_in = 0, thickness_in = 0, k_value = 0, hot_f = 0, amb_f = 0, length_ft =...` | _ | _ | _ |
| calc-hvac.js | `computePumpSpecificSpeed` | `{ n_rpm = 0, q_gpm = 0, h_ft = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computePumpSuctionSpecificSpeed` | `{ n_rpm = 0, q_gpm = 0, npshr_ft = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeRadiantFloorOutput` | `{ mode = "surface_to_q", t_surface_f = 0, t_room_f = 70, q_target = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeReynoldsNumberPipe` | `{ v_fps = 0, d_in = 0, nu = 1.21e-5 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeRoundToRectDuct` | `{ mode = "rect-to-round", round_diameter_in = 0, side_a_in = 0, side_b_in = 0...` | _ | _ | _ |
| calc-hvac.js | `computeSHR` | `{ sensible_btu_hr, total_btu_hr }` | _ | _ | _ |
| calc-hvac.js | `computeSHRLatent` | `{ total_capacity_btu_hr = 0, return_db_F = 75, return_wb_F = 63, supply_db_F ...` | _ | _ | _ |
| calc-hvac.js | `computeSeerEer` | `{ value, from, cooling_load_btu_hr = 0, annual_hours = 0, electricity_rate = 0 }` | _ | _ | _ |
| calc-hvac.js | `computeSnowmeltLoad` | `{ s_inhr = 0, t_air_f = 0, wind_mph = 0, rh_pct = 0, ar = 0.5, area_ft2 = 0, ...` | _ | _ | _ |
| calc-hvac.js | `computeStaticPressureHvac` | `{ elements }` | _ | _ | _ |
| calc-hvac.js | `computeVibrationIsolation` | `{ equipment_rpm = 0, static_deflection_in = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeWallCondensationGradient` | `{ r_inside = 0, r_outside = 0, t_in_f = 0, t_out_f = 0, rh_in_pct = 0 } = {}` | _ | _ | _ |
| calc-hvac.js | `computeWetBulbPsychrometer` | `{ dry_bulb_F, wet_bulb_F, P_hPa = 1013.25 }` | _ | _ | _ |
| calc-hvac.js | `manualJCooling` | `{ floor_area_ft2, wall_area_ft2, window_area_ft2, ceiling_area_ft2, insulatio...` | _ | _ | _ |
| calc-hvac.js | `manualJHeating` | `{ floor_area_ft2, wall_area_ft2, window_area_ft2, ceiling_area_ft2, insulatio...` | _ | _ | _ |
| calc-hvac.js | `renderApproachDeltaT` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderBalancePoint` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderCfmPerTon` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderCombustionAir` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderCombustionAirMaxInput` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderDuctSizing` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderEquivalentLength` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderEvaporativeCooling` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderInsulationThickness` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderManualJCooling` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderManualJHeating` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderOutdoorAirMix` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderOutdoorAirVentilation` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderSHR` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderSeerEer` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderStaticPressureHvac` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvac.js | `renderWetBulbPsychrometer` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-hvacservice.js | `computeAshrae622Ventilation` | `{ floor_area_ft2 = 0, bedrooms = 0, infil_credit_cfm = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeBlowerDoorAch50` | `{ cfm50 = 0, volume_ft3 = 0, n_factor = 17, target_ach50 = 3 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeChimneyDraft` | `{ stack_height_ft = 0, ambient_temp_f = 0, mean_flue_temp_f = 0, baro_psia = ...` | _ | _ | _ |
| calc-hvacservice.js | `computeChimneyHeightForDraft` | `{ target_draft_net_inwc = 0, ambient_temp_f = 0, mean_flue_temp_f = 0, baro_p...` | _ | _ | _ |
| calc-hvacservice.js | `computeCoAirFree` | `{ measured_co_ppm = 0, measured_o2_pct = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeCombustionLambda` | `{ fuel = "natural_gas", flue_o2_pct = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeCondensateDrain` | `{ tons = 0, pints_per_ton_hr = 3, run_ft = 0, slope_in_per_ft = 0.125 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeDraftHoodDilution` | `{ appliance_o2_pct = 0, diluted_o2_pct = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeDuctLeakageCfm25` | `{ leakage_cfm25 = 0, cfa_ft2 = 0, limit = 4 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeExcessAirO2` | `{ measured_o2_pct = 0, measured_co2_pct = 0, co2max_pct = 11.7 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeFlueGasCombustionEff` | `{ fuel = "natural_gas", flue_o2_pct = 0, stack_temp_f = 0, air_temp_f = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeFurnaceAirflowToRise` | `{ input_btuh = 0, efficiency_pct = 80, cfm = 0, return_air_F = 70, rise_min_F...` | _ | _ | _ |
| calc-hvacservice.js | `computeFurnaceTempRise` | `{ return_air_F = 0, supply_air_F = 0, input_btuh = 0, efficiency_pct = 80, ri...` | _ | _ | _ |
| calc-hvacservice.js | `computeGasMeterClock` | `{ sec_per_rev = 0, dial_size_cf = 0, heating_value_btu_cf = 1030, nameplate_i...` | _ | _ | _ |
| calc-hvacservice.js | `computeGasMeterClockTarget` | `{ target_input_btuh = 0, dial_size_cf = 0, heating_value_btu_cf = 1030 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeHvacEquipmentCircuit` | `{ compressor_rla_A = 0, fan_fla_A = 0, other_load_A = 0, installed_breaker_A ...` | _ | _ | _ |
| calc-hvacservice.js | `computeInfiltrationLoad` | `{ cfm = 0, delta_t_f = 0, delta_gr = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeNitrogenPressureTest` | `{ start_psig = 0, start_temp_F = 0, end_temp_F = 0, end_psig = 0, atm_psi = 1...` | _ | _ | _ |
| calc-hvacservice.js | `computeOutsideAirPercentTemps` | `{ t_ra_f = 0, t_ma_f = 0, t_oa_f = 0 } = {}` | _ | _ | _ |
| calc-hvacservice.js | `computeRecoveryCylinder` | `{ water_capacity_lb = 0, refrig_density_lb_gal = 0, current_net_lb = 0, fill_...` | _ | _ | _ |
| calc-hvacservice.js | `computeRunCapacitorMicrofarad` | `{ rated_uf = 0, measured_volts_V = 0, measured_amps_A = 0, tolerance_pct = 6 ...` | _ | _ | _ |
| calc-hvacservice.js | `computeVacuumDecayTest` | `{ start_micron = 0, end_micron = 0, hold_min = 0, pass_ceiling_micron = 500 }...` | _ | _ | _ |
| calc-hvacsystems.js | `computeAirChangesPerHour` | `{ volume_ft3 = 0, supply_cfm = 0, return_cfm = null, occupancy = "classroom",...` | _ | _ | _ |
| calc-hvacsystems.js | `computeBoilerPipeSizing` | `{ boiler_btu_hr = 0, delta_T_F = 20, material = "copper", max_velocity_fps = ...` | _ | _ | _ |
| calc-hvacsystems.js | `computeBufferTankLoopCredit` | `{ min_on_time_min = 0, source_min_btu = 0, zone_min_load_btu = 0, delta_t_f =...` | _ | _ | _ |
| calc-hvacsystems.js | `computeChillerTons` | `{ gpm = 0, ewt_F = 54, lwt_F = 44, fluid = "water", nameplate_tons = null, } ...` | _ | _ | _ |
| calc-hvacsystems.js | `computeCoilFaceArea` | `{ cfm = 0, target_fpm = 500 } = {}` | _ | _ | _ |
| calc-hvacsystems.js | `computeCoilFaceVelocity` | `{ cfm = 0, face_width_in = 0, face_height_in = 0, threshold_fpm = 500 } = {}` | _ | _ | _ |
| calc-hvacsystems.js | `computeCompressorShortCycle` | `{ system_type = "single", load_fraction_pct = 50, observed_cph = null, } = {}` | _ | _ | _ |
| calc-hvacsystems.js | `computeEnvelopeConductionLoad` | `{ area_ft2 = 0, u_factor = 0, cltd_f = 0 } = {}` | _ | _ | _ |
| calc-hvacsystems.js | `computeFilterPressureDrop` | `{ filter_type = "merv13", face_area_ft2 = 0, face_velocity_fpm = 300, clean_d...` | _ | _ | _ |
| calc-hvacsystems.js | `computeHumidifierCapacity` | `{ cfm = 0, supply_db_F = 70, entering_rh_pct = 20, target_rh_pct = 40, altitu...` | _ | _ | _ |
| calc-hvacsystems.js | `computeHxLmtdNtu` | `{ config = "counterflow", th_in_F = 0, th_out_F = 0, tc_in_F = 0, tc_out_F = ...` | _ | _ | _ |
| calc-hvacsystems.js | `computeHydronicBufferTank` | `{ min_on_time_min = 0, source_min_btu = 0, zone_min_load_btu = 0, delta_t_f =...` | _ | _ | _ |
| calc-hvacsystems.js | `computeHydronicInjectionMixing` | `{ secondary_gpm = 10, secondary_supply_f = 110, secondary_return_f = 90, prim...` | _ | _ | _ |
| calc-hvacsystems.js | `computeInternalHeatGains` | `{ occupants = 0, sens_per_person = 245, lat_per_person = 200, lighting_w = 0,...` | _ | _ | _ |
| calc-hvacsystems.js | `computeOutdoorResetRatio` | `{ supply_design_f = 180, supply_min_f = 80, oa_design_f = 0, oa_noheat_f = 65...` | _ | _ | _ |
| calc-hvacsystems.js | `computeValveAuthority` | `{ valve_pressure_drop_psi = 5, controlled_circuit_drop_psi = 3 } = {}` | _ | _ | _ |
| calc-hvacsystems.js | `computeVavBoxAirflow` | `{ zone_sensible_btuh = 0, supply_dt_f = 0, ventilation_cfm = 0, turndown = 0....` | _ | _ | _ |
| calc-hvacsystems.js | `computeWindowSolarHeatGain` | `{ area_ft2 = 0, shgc = 0, psf = 0, u_factor = 0, cltd_f = 0 } = {}` | _ | _ | _ |
| calc-kitchen.js | `computeBakersPercentage` | `{ flour_g = 0, hydration_pct = 0, salt_pct = 0, yeast_pct = 0, other_pct = 0,...` | _ | _ | _ |
| calc-kitchen.js | `computeBrineCure` | `{ mode = "brine", water_g = 0, salt_g = 0, meat_g = 0, cure_g = 0, target_pct...` | _ | _ | _ |
| calc-kitchen.js | `computeCoolingCurve` | `{ start_F = 135, ambient_F = 70, container = "full_pan_4in", product_type = "...` | _ | _ | _ |
| calc-kitchen.js | `computeDraftBeerLineBalance` | `{ applied_pressure_psi = 0, rise_ft = 0, tubing_type = "vinyl_316" } = {}` | _ | _ | _ |
| calc-kitchen.js | `computeDrinkAbvDilution` | `{ total_volume_oz = 0, weighted_abv_pct = 0, method = "stirred", dilution_pct...` | _ | _ | _ |
| calc-kitchen.js | `computeFoodCostPercentage` | `{ beginning_inventory = 0, purchases = 0, ending_inventory = 0, food_sales = ...` | _ | _ | _ |
| calc-kitchen.js | `computeKitchenSanitizerPpm` | `{ sanitizer_type = "chlorine", active_pct = 0, target_ppm = 0, batch_gallons ...` | _ | _ | _ |
| calc-kitchen.js | `computeMenuEngineering` | `{ units_sold = 0, menu_price = 0, food_cost = 0, total_units = 0, item_count ...` | _ | _ | _ |
| calc-kitchen.js | `computeOverrunPercent` | `{ mix_weight_lb = 0, finished_weight_lb = 0 } = {}` | _ | _ | _ |
| calc-kitchen.js | `computePanConversion` | `{ target_qt = 0, target_servings = 0, portion_oz = 0, pan_size = "full", pan_...` | _ | _ | _ |
| calc-kitchen.js | `computePlateCost` | `{ ingredients = [], target_food_cost_pct = 30 }` | _ | _ | _ |
| calc-kitchen.js | `computePourCost` | `{ bottle_cost = 0, bottle_size_ml = 0, pour_size_oz = 0, target_pour_cost_pct...` | _ | _ | _ |
| calc-kitchen.js | `computePrimeCost` | `{ food_cost = 0, beverage_cost = 0, labor_cost = 0, total_sales = 0 } = {}` | _ | _ | _ |
| calc-kitchen.js | `computeRecipeScale` | `{ rows = [], original_yield = 0, target_yield = 0 }` | _ | _ | _ |
| calc-kitchen.js | `computeSousVidePasteurization` | `{ category = "beef", thickness_in = 0, bath_temperature_F = 0, initial_temper...` | _ | _ | _ |
| calc-kitchen.js | `computeYieldEP` | `{ ap_weight = 0, trim_weight = 0, cooking_loss_pct = 0, ap_cost_per_lb = 0 }` | _ | _ | _ |
| calc-lab.js | `computeBeerLambert` | `{ absorbance = 0, path_length_cm = 1, epsilon = 0 }` | _ | _ | _ |
| calc-lab.js | `computeCfuPlateCount` | `{ colonies = 0, dilution_factor = 0, volume_ml = 0, low = 25, high = 250 } = {}` | _ | _ | _ |
| calc-lab.js | `computeDilution` | `{ c1, v1, c2, v2 }` | _ | _ | _ |
| calc-lab.js | `computeDoublingTime` | `{ initial_count = 0, final_count = 0, elapsed_time = 0 } = {}` | _ | _ | _ |
| calc-lab.js | `computeGelPercentAgarose` | `{ target_bp_high = 0, gel_percent = 0, buffer_volume_ml = 0 } = {}` | _ | _ | _ |
| calc-lab.js | `computeGrowthProjectedCount` | `{ initial_count = 0, doubling_time = 0, elapsed_time = 0 } = {}` | _ | _ | _ |
| calc-lab.js | `computeHemocytometer` | `{ total_cells_counted = 0, squares_counted = 4, dilution_factor = 1, dead_cel...` | _ | _ | _ |
| calc-lab.js | `computeHendersonHasselbalch` | `{ pKa = 0, target_pH = 0, total_buffer_concentration = 0, total_volume = 0, }` | _ | _ | _ |
| calc-lab.js | `computeLigationMolarRatio` | `{ vector_ng = 0, vector_length_bp = 0, insert_length_bp = 0, molar_ratio = 3 ...` | _ | _ | _ |
| calc-lab.js | `computeMassMoles` | `{ mass_g, moles, molecular_weight }` | _ | _ | _ |
| calc-lab.js | `computeMichaelisMenten` | `{ vmax = 0, km = 0, substrate = 0 } = {}` | _ | _ | _ |
| calc-lab.js | `computeMolarityFromStock` | `{ purity_pct = 0, density_g_ml = 0, mol_weight = 0, target_m = 0, final_volum...` | _ | _ | _ |
| calc-lab.js | `computeMolecularWeight` | `{ formula = "" }` | _ | _ | _ |
| calc-lab.js | `computeNucleicAcidA260` | `{ a260 = 0, na_type = "dsDNA", dilution_factor = 1, a280 = 0 } = {}` | _ | _ | _ |
| calc-lab.js | `computeOd600CellCount` | `{ od600 = 0, factor_cells_per_od = 0, dilution = 1 } = {}` | _ | _ | _ |
| calc-lab.js | `computePcrMix` | `{ number_of_reactions = 1, components = [], fudge_factor_pct = 10, }` | _ | _ | _ |
| calc-lab.js | `computePrimerTm` | `{ sequence = "", method = "auto" } = {}` | _ | _ | _ |
| calc-lab.js | `computeRcf` | `{ rotor_radius_mm = 0, rpm, rcf }` | _ | _ | _ |
| calc-lab.js | `computeResuspension` | `{ mass_g = 0, target_concentration = 0 }` | _ | _ | _ |
| calc-lab.js | `computeSerialDilution` | `{ starting_concentration = 0, dilution_factor = 10, volume_per_tube = 0.001, ...` | _ | _ | _ |
| calc-lab.js | `computeSubstrateForVelocity` | `{ km = 0, target_percent = 0 } = {}` | _ | _ | _ |
| calc-lab.js | `renderOd600CellCount` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-lateral.js | `computeDiaphragmCollectorForce` | `{ unit_shear_plf = 0, collector_len_ft = 0, omega0 = 2.5 } = {}` | _ | _ | _ |
| calc-lateral.js | `computeDiaphragmShear` | `{ w_plf = 0, l_ft = 0, b_ft = 0 } = {}` | _ | _ | _ |
| calc-lateral.js | `computeShearwallDeflection` | `{ v_plf = 0, h_ft = 0, b_ft = 0, e_psi = 1600000, a_in2 = 0, ga_kin = 0, da_i...` | _ | _ | _ |
| calc-lateral.js | `computeShearwallOverturning` | `{ v_lb = 0, b_ft = 0, h_ft = 0, w_lb = 0 } = {}` | _ | _ | _ |
| calc-layout.js | `computeBoltCircle` | `{ bolt_circle_dia_in = 0, num_holes = 0, start_angle_deg = 0, center_x_in = 0...` | _ | _ | _ |
| calc-layout.js | `computeCenterOfGravity2Point` | `{ mode = "two-scale-weigh", reading_1_lb = 0, reading_2_lb = 0, span_ft = 0, ...` | _ | _ | _ |
| calc-layout.js | `computeCircleFrom3Points` | `{ x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0 } = {}` | _ | _ | _ |
| calc-layout.js | `computeCircularArc` | `{ chord_in = 0, rise_in = 0 } = {}` | _ | _ | _ |
| calc-layout.js | `computeCircularArcRiseFromRadius` | `{ chord_in = 0, radius_in = 0 } = {}` | _ | _ | _ |
| calc-layout.js | `computeDecimalToFraction` | `{ value_in = 0, denominator = 16 } = {}` | _ | _ | _ |
| calc-layout.js | `computeEqualSpacing` | `{ run_in = 0, item_width_in = 0, mode = "max-gap", max_gap_in = 0, count = 0 ...` | _ | _ | _ |
| calc-layout.js | `computePolygonMiter` | `{ sides = 0, size_mode = "side", size_in = 0 } = {}` | _ | _ | _ |
| calc-layout.js | `computeSineBar` | `{ solve_for = "angle", bar_length_in = 5, stack_height_in = 0, target_angle_d...` | _ | _ | _ |
| calc-layout.js | `computeThreadPitch` | `{ thread_standard = "inch", tpi = 0, pitch_mm = 0, starts = 1 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeAccessControlPowerSupply` | `{ lock_count = 4, lock_current_a = 0.5, reader_count = 2, reader_current_a = ...` | _ | _ | _ |
| calc-lowvoltage.js | `computeCableSupportJhook` | `{ run_ft = 400, spacing_ft = 4, num_cables = 50, cable_lb_per_ft = 0.035, hoo...` | _ | _ | _ |
| calc-lowvoltage.js | `computeCableTrayFill` | `{ tray_type = "ladder", tray_width_in = 0, cables = [] } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeCameraLensFov` | `{ sensor_width_mm = 0, focal_length_mm = 0, distance_ft = 0, h_pixels = 0 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeCameraMaxDistanceForPpf` | `{ sensor_width_mm = 0, focal_length_mm = 0, h_pixels = 0, target_ppf = 76 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeCctvRetentionDays` | `{ disk_capacity_gb = 0, camera_count = 1, bitrate_mbps = 0, recording_mode = ...` | _ | _ | _ |
| calc-lowvoltage.js | `computeCctvStorage` | `{ camera_count = 1, bitrate_mbps = 0, recording_mode = "continuous", motion_d...` | _ | _ | _ |
| calc-lowvoltage.js | `computeCeilingSpeakerCoverage` | `{ ceiling_ft = 0, ear_ft = 0, coverage_deg = 90, room_area_ft2 = 0, layout = ...` | _ | _ | _ |
| calc-lowvoltage.js | `computeCeilingSpeakerCoverageAngle` | `{ ceiling_ft = 0, ear_ft = 0, target_diameter_ft = 0 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeCoaxRgLoss` | `{ mode = "loss", loss_per_100ft_db = 0, length_ft = 0, source_level = null, t...` | _ | _ | _ |
| calc-lowvoltage.js | `computeDpLevelHydrostatic` | `{ measured_pressure_psi = 4.33, specific_gravity = 1.0, max_level_ft = 20 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeFiberLossBudget` | `{ length_m = 0, attenuation_db_km = 0, connector_count = 0, loss_per_connecto...` | _ | _ | _ |
| calc-lowvoltage.js | `computeFiberMaxLength` | `{ max_channel_loss_db = 0, attenuation_db_km = 0, connector_count = 0, loss_p...` | _ | _ | _ |
| calc-lowvoltage.js | `computeFireAlarmNacVoltageDrop` | `{ nominal_voltage_v = 24, total_current_a = 0.8, run_length_ft = 250, resista...` | _ | _ | _ |
| calc-lowvoltage.js | `computeLoopSignalScaling` | `{ signal_ma = 12, range_low = 0, range_high = 100 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeLoopVoltageBudget` | `{ supply_v = 24, transmitter_min_v = 10.5, load_resistance_ohms = 250, wire_r...` | _ | _ | _ |
| calc-lowvoltage.js | `computeLvCablePullFootage` | `{ drops = 48, avg_run_ft = 120, slack_ft = 15, box_ft = 1000 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computePidTuningZieglerNichols` | `{ ultimate_gain_ku = 4, ultimate_period_tu_sec = 2 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computePulseFlowmeterRate` | `{ frequency_hz = 100, k_factor_pulses_per_gal = 200 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeRtdResistanceToTemp` | `{ resistance_ohms = 119.397, r0_ohms = 100 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeSpeaker70vLine` | `{ amp_rated_w = 0, headroom_percent = 20, tap_watts = 0, tap_count = 0, line_...` | _ | _ | _ |
| calc-lowvoltage.js | `computeStandbyBatteryRuntime` | `{ battery_ah = 0, standby_current_a = 0, alarm_current_a = 0, alarm_minutes =...` | _ | _ | _ |
| calc-lowvoltage.js | `computeStandbyBatterySizing` | `{ standby_current_a = 0, standby_hours = 0, alarm_current_a = 0, alarm_minute...` | _ | _ | _ |
| calc-lowvoltage.js | `computeStructuredCablingChannel` | `{ permanent_link_m = 0, cords_m = 0, temp_c = 20, derate_per_c = 0.004 } = {}` | _ | _ | _ |
| calc-lowvoltage.js | `computeThermistorBetaTemp` | `{ resistance_ohms = 10000, r0_ohms = 10000, beta_k = 3950, ref_temp_c = 25 } ...` | _ | _ | _ |
| calc-machining.js | `computeBallnoseScallopHeight` | `{ r_in = 0, mode = "scallop-from-stepover", s_in = 0, h_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeBearingL10Life` | `{ dynamic_rating_lbf = 0, equivalent_load_lbf = 0, speed_rpm = 0, bearing_typ...` | _ | _ | _ |
| calc-machining.js | `computeBearingMaxLoad` | `{ dynamic_rating_lbf = 0, target_life_hr = 0, speed_rpm = 0, bearing_type = "...` | _ | _ | _ |
| calc-machining.js | `computeBoringBarDeflection` | `{ d_in = 0, l_in = 0, f_lb = 0, e_psi = 30e6 } = {}` | _ | _ | _ |
| calc-machining.js | `computeBoringBarMaxOverhang` | `{ d_in = 0, f_lb = 0, allowable_deflection_in = 0, e_psi = 30e6 } = {}` | _ | _ | _ |
| calc-machining.js | `computeCountersinkDepth` | `{ countersink_dia_in = 0, included_angle_deg = 82, pilot_hole_dia_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeCountersinkDiameterFromDepth` | `{ plunge_depth_in = 0, included_angle_deg = 82, pilot_hole_dia_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeCuttingDiameterForRpm` | `{ surface_speed_sfm = 0, target_rpm = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeCuttingFluidConcentration` | `{ brix_reading = 0, refractometer_factor = 0, sump_volume_gal = 0, target_pct...` | _ | _ | _ |
| calc-machining.js | `computeCuttingSpeed` | `{ surface_speed_sfm = 0, diameter_in = 0, num_flutes = 0, chip_load_in = 0 } ...` | _ | _ | _ |
| calc-machining.js | `computeDrillPointAngleFromLength` | `{ diameter_in = 0, point_length_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeDrillPointDepth` | `{ diameter_in = 0, point_angle_deg = 118, full_depth_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeGearChordalThickness` | `{ diametral_pitch = 0, teeth = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeGearIdentification` | `{ teeth = 0, outside_dia_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeGrindingWheelRpm` | `{ wheel_diameter_in = 7, rated_max_sfpm = 6500, grinder_rpm = 3450 } = {}` | _ | _ | _ |
| calc-machining.js | `computeKeyseatKeySize` | `{ shaft_diameter_in = 0, torque_in_lb = 0, key_length_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeKnurlBlankDiameter` | `{ target_diameter_in = 0.75, knurl_tpi = 21 } = {}` | _ | _ | _ |
| calc-machining.js | `computeRadialChipThinning` | `{ ae_in = 0, d_in = 0, fz_target = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeReamingDrillAllowance` | `{ reamer_diameter_in = 0.5, allowance_override_in = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeSpindleMaxMrr` | `{ available_motor_hp = 0, unit_power_hp = 1.0, efficiency_pct = 80 } = {}` | _ | _ | _ |
| calc-machining.js | `computeSpindlePowerTorque` | `{ mrr_in3_min = 0, unit_power_hp = 1.0, efficiency_pct = 80, rpm = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeSpurGearGeometry` | `{ diametral_pitch = 0, teeth = 0, mating_teeth = 0 } = {}` | _ | _ | _ |
| calc-machining.js | `computeTaylorToolLife` | `{ taylor_c = 300, taylor_n = 0.2, cutting_speed_sfm = 200, target_life_min = ...` | _ | _ | _ |
| calc-masonry.js | `computeBrickVeneerAnchorSpacing` | `{ area_ft2 = 0, area_per = 2.67, max_horiz_in = 32, max_vert_in = 24 } = {}` | _ | _ | _ |
| calc-masonry.js | `computeBrickVeneerWeepCount` | `{ wall_length_ft = 30, max_spacing_in = 33, flashing_lines = 1 } = {}` | _ | _ | _ |
| calc-masonry.js | `computeCmuShearWall` | `{ fm_psi = 1500, b_in = 0, dv_in = 0, p_lb = 0, mvd = 0.5, av_in2 = 0, s_in =...` | _ | _ | _ |
| calc-masonry.js | `computeCmuWallAxial` | `{ fm_psi = 2000, an_in2 = 0, ast_in2 = 0, h_in = 0, r_in = 0, fs_psi = 32000 ...` | _ | _ | _ |
| calc-masonry.js | `computeCmuWallFlexure` | `{ fm_psi = 2000, as_in2 = 0, d_in = 0, b_in = 12, fs_psi = 32000 } = {}` | _ | _ | _ |
| calc-masonry.js | `computeMasonryAnchorBolt` | `{ fm_psi = 1500, lbe_in = 0, ab_in2 = 0, fy_psi = 36000 } = {}` | _ | _ | _ |
| calc-masonry.js | `computeMasonryAnchorEmbedment` | `{ required_tension_lb = 0, fm_psi = 1500, ab_in2 = 0.442, fy_psi = 36000 } = {}` | _ | _ | _ |
| calc-masonry.js | `computeMasonryJointReinforcement` | `{ wall_length_ft = 40, wall_height_ft = 12, vertical_spacing_in = 16, piece_l...` | _ | _ | _ |
| calc-masonry.js | `computeMasonryLintelLoading` | `{ span_ft = 0, wall_psf = 0, wall_h_above = 0 } = {}` | _ | _ | _ |
| calc-masonry.js | `computeMasonryPrismFm` | `{ unit_type = "concrete", unit_strength_psi = 2000, mortar_type = "ms" } = {}` | _ | _ | _ |
| calc-masonry.js | `computeMasonryWallWeight` | `{ hollow_psf = 0, grout_adder = 0, cell_spacing = 8, grout_spacing = 0, heigh...` | _ | _ | _ |
| calc-mechanic.js | `computeAbycDcWire` | `{ current_a = 0, run_length_ft = 0, system_voltage_v = 0, drop_pct = 3 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeAircraftWeightBalance` | `{ empty_weight_lb = 0, empty_arm_in = 0, front_weight_lb = 0, front_arm_in = ...` | _ | _ | _ |
| calc-mechanic.js | `computeAlternatorChargingLoad` | `{ total_load_a = 0, alternator_a = 0, idle_frac = 0.5, cruise_frac = 0.9 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeAnchorRodeScope` | `{ water_depth_ft = 0, bow_height_ft = 0, scope_ratio = 7, boat_loa_ft = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeBoltStretch` | `{ diameter_in = 0, grip_length_in = 0, stretch_thou = 0, material = "steel", ...` | _ | _ | _ |
| calc-mechanic.js | `computeBrakePadLife` | `{ vehicle_weight_lb = 0, speed_delta_mph = 0, stops_per_mile = 1, pad_thickne...` | _ | _ | _ |
| calc-mechanic.js | `computeBrakePedalHydraulic` | `{ pedal_force_lb = 0, pedal_ratio = 0, booster_factor = 1, mc_bore_in = 0, ca...` | _ | _ | _ |
| calc-mechanic.js | `computeChamberCcForCr` | `{ bore_in = 0, stroke_in = 0, target_cr = 0, gasket_bore_in = 0, gasket_thick...` | _ | _ | _ |
| calc-mechanic.js | `computeClimbGradientRoc` | `{ climb_gradient_ft_per_nm = 0, ground_speed_kt = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeCoolingSystemFlow` | `{ q_btuh = 0, dt_f = 0, coolant = "water" } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeCrosswindComponent` | `{ runway_heading_deg = 0, wind_dir_deg = 0, wind_speed_kt = 0, gust_kt = 0, m...` | _ | _ | _ |
| calc-mechanic.js | `computeCrouchHpForSpeed` | `{ target_speed_mph = 0, displacement_lb = 0, hull_constant = 190 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeCrouchPlaningSpeed` | `{ displacement_lb = 0, shaft_hp = 0, hull_constant = 190 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeDensityAltitude` | `{ field_elevation_ft = 0, altimeter_in_hg = 29.92, oat_f = 59 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeDisplacementCR` | `{ bore_in = 0, stroke_in = 0, cylinders = 0, chamber_cc = 0, gasket_bore_in =...` | _ | _ | _ |
| calc-mechanic.js | `computeDriveshaftCritical` | `{ od_in = 0, wall_in = 0, length_in = 0, material = "steel" }` | _ | _ | _ |
| calc-mechanic.js | `computeDriveshaftMaxLength` | `{ target_rpm = 0, od_in = 0, wall_in = 0, material = "steel" } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeDynamicCompressionRatio` | `{ bore_in = 4.030, stroke_in = 3.75, rod_length_in = 6.0, static_cr = 10.5, i...` | _ | _ | _ |
| calc-mechanic.js | `computeDynoCorrectionSae` | `{ observed_hp = 0, baro_mbar = 0, air_temp_c = 25, humidity_pct = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeEngineBmep` | `{ torque_lb_ft = 0, displacement_cid = 0, cycle_type = "four_stroke" } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeEngineFuelBurnGph` | `{ horsepower = 0, bsfc_lb_hp_hr = 0, density_lb_gal = 0, tank_gal = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeEtHorsepower` | `{ weight_lb = 0, et_s = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeFuelRange` | `{ fuel = "gasoline_E10", tank_gal = 0, mpg = 0, mpg_basis = "gasoline_E10", l...` | _ | _ | _ |
| calc-mechanic.js | `computeGearMphRpm` | `{ solve_for = "mph", rpm = 0, trans_ratio = 1, axle_ratio = 0, tire_dia_in = ...` | _ | _ | _ |
| calc-mechanic.js | `computeGlidepathDescentRate` | `{ ground_speed_kt = 0, glidepath_angle_deg = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeHelicalSpringRate` | `{ wire_diameter_in = 0, mean_coil_diameter_in = 0, active_coils = 0, material...` | _ | _ | _ |
| calc-mechanic.js | `computeHpFromTorque` | `{ solve_for = "hp", torque_lbft = 0, rpm = 0, hp = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeHullDisplacement` | `{ lwl_ft = 30, bwl_ft = 10, draft_ft = 4, block_coefficient = 0.5, water_dens...` | _ | _ | _ |
| calc-mechanic.js | `computeHullSpeed` | `{ lwl_ft = 0, actual_speed_kn = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeHydraulicDriveFlowLimit` | `{ drive_hp = 0, psi = 0, efficiency = 0.85 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeHydraulicMotorTorqueSpeed` | `{ psi = 0, disp_in3 = 0, gpm = 0, mech_eff = 0.90, vol_eff = 0.95 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeHydraulicPumpFlow` | `{ disp_in3 = 0, rpm = 0, vol_eff = 0.95 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeHydraulicPumpHorsepower` | `{ gpm = 0, psi = 0, efficiency = 0.85 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeInjectorMaxHp` | `{ inj_flow = 0, flow_unit = "lbh", n_cyl = 0, duty = 0.80, bsfc = 0.50 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeInjectorSize` | `{ hp = 0, bsfc = 0.50, n_cyl = 0, duty = 0.80 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeMaxRpmFromPistonSpeed` | `{ stroke_in = 0, mps_limit_fpm = 4000 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeMeanPistonSpeed` | `{ stroke_in = 0, rpm = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computePaintMixRatio` | `{ paint_volume_oz = 0, part_paint = 4, part_hardener = 1, part_reducer = 0 } ...` | _ | _ | _ |
| calc-mechanic.js | `computePropPitchSelection` | `{ current_pitch_in = 0, current_wot_rpm = 0, target_wot_rpm = 0, rpm_per_inch...` | _ | _ | _ |
| calc-mechanic.js | `computePropSlip` | `{ rpm = 0, gear_ratio = 1, pitch_in = 0, gps_speed_kt = 0 }` | _ | _ | _ |
| calc-mechanic.js | `computeReserveCapacityAmpHours` | `{ rc_minutes = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeSacrificialAnodeLife` | `{ anode_material = "zinc", anode_mass_lb = 0, current_draw_a = 0, utilization...` | _ | _ | _ |
| calc-mechanic.js | `computeScrewConveyor` | `{ screw_diameter_in = 0, shaft_diameter_in = 0, pitch_in = 0, rpm = 0, loadin...` | _ | _ | _ |
| calc-mechanic.js | `computeScrewConveyorRpm` | `{ target_ft3_hr = 0, screw_diameter_in = 0, shaft_diameter_in = 0, pitch_in =...` | _ | _ | _ |
| calc-mechanic.js | `computeTireContactPatch` | `{ corner_load_lb = 0, inflation_pressure_psi = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeTireGearing` | `{ original_size = "", new_size = "", axle_ratio = 0, top_gear_ratio = 1, targ...` | _ | _ | _ |
| calc-mechanic.js | `computeTorqueAdapterCorrection` | `{ target_torque_ftlb = 0, wrench_length_in = 0, adapter_length_in = 0, adapte...` | _ | _ | _ |
| calc-mechanic.js | `computeTrapSpeedHorsepower` | `{ weight_lb = 0, trap_mph = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeTurboMaxBoostForChargeTemp` | `{ max_charge_temp_f = 0, inlet_temp_f = 0, compressor_eff_pct = 70, ambient_p...` | _ | _ | _ |
| calc-mechanic.js | `computeTurboPressureRatio` | `{ boost_psi = 0, ambient_psia = 14.7, inlet_temp_f = 0, compressor_eff_pct = ...` | _ | _ | _ |
| calc-mechanic.js | `computeTurnRadiusBank` | `{ airspeed_kt = 0, bank_angle_deg = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeUjointOperatingAngle` | `{ input_angle_deg = 10, output_angle_deg = 10 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeValveFlowCoefficient` | `{ solve_for = "flow", fluid = "liquid", specific_gravity = 1, cv = 0, flow_gp...` | _ | _ | _ |
| calc-mechanic.js | `computeVolumetricEfficiency` | `{ displacement_ci = 0, rpm = 0, cycle = "four", actual_cfm = 0, ve_pct = 0 } ...` | _ | _ | _ |
| calc-mechanic.js | `computeWaterlineForHullSpeed` | `{ target_hull_speed_kn = 0, coefficient = 1.34 } = {}` | _ | _ | _ |
| calc-mechanic.js | `computeWheelOffsetBackspacing` | `{ rim_width_in = 0, offset_mm = 0, backspacing_in = 0 } = {}` | _ | _ | _ |
| calc-mechanic.js | `parseTireSize` | `str` | _ | _ | _ |
| calc-metalair.js | `computeCompressionRatio` | `{ suction_psig = 0, discharge_psig = 0, atmospheric_psia = 14.696 } = {}` | _ | _ | _ |
| calc-metalair.js | `computeDuctStaticRegain` | `{ upstream_velocity_fpm = 2000, downstream_velocity_fpm = 1500, recovery_fact...` | _ | _ | _ |
| calc-metalair.js | `computeDuctStaticTotal` | `{ components = [], rated_esp_in_wc = 0 } = {}` | _ | _ | _ |
| calc-metalair.js | `computeDuctTransitionLength` | `{ large_dim_in = 20, small_dim_in = 12, slope_deg = 15 } = {}` | _ | _ | _ |
| calc-metalair.js | `computeGrooveWeldLengthForLoad` | `{ applied_load_lb = 0, weld_type = "PJP", effective_throat_in = 0, base_thick...` | _ | _ | _ |
| calc-metalair.js | `computeGrooveWeldStrength` | `{ weld_type = "PJP", effective_throat_in = 0, base_thickness_in = 0, length_i...` | _ | _ | _ |
| calc-motor.js | `computeMotorAccelerationTime` | `{ inertia_lbft2 = 100, speed_change_rpm = 1750, net_accel_torque_lbft = 50 } ...` | _ | _ | _ |
| calc-motor.js | `computeMotorFaultContribution` | `{ motor_fla_a = 0, x_subtransient_pu = 0.167, utility_fault_a = 0 } = {}` | _ | _ | _ |
| calc-motor.js | `computeMotorLockedRotorKva` | `{ horsepower = 0, code_letter = "G", voltage_v = 0, phase = 3 } = {}` | _ | _ | _ |
| calc-motor.js | `computeMotorMaxHpForStartingCurrent` | `{ max_starting_current_a = 0, code_letter = "G", voltage_v = 0, phase = 3 } = {}` | _ | _ | _ |
| calc-motor.js | `computeMotorOperatingCost` | `{ hp = 0, efficiency_pct = 93, load_factor_pct = 100, hours_per_year = 0, rat...` | _ | _ | _ |
| calc-motor.js | `computeMotorOverloadSizing` | `{ fla_A = 0, sf = 0, rise_C = 0 } = {}` | _ | _ | _ |
| calc-motor.js | `computeMotorPoleIdentification` | `{ rated_rpm = 0, line_freq_hz = 60 } = {}` | _ | _ | _ |
| calc-motor.js | `computeMotorRmsHp` | `{ hp_run = 20, run_time_s = 10, hp_idle = 0, idle_time_s = 20, cooling_factor...` | _ | _ | _ |
| calc-motor.js | `computeMotorRunHoursForBudget` | `{ hp = 0, efficiency_pct = 93, load_factor_pct = 100, rate_usd_per_kwh = 0.12...` | _ | _ | _ |
| calc-motor.js | `computeMotorShaftTorque` | `{ rpm = 0, hp = null, torque_lbft = null } = {}` | _ | _ | _ |
| calc-motor.js | `computeMotorSyncSlip` | `{ line_freq_hz = 60, poles = 4, rated_rpm = 0 } = {}` | _ | _ | _ |
| calc-motor.js | `computeMultiMotorFeeder` | `{ largest_flc_a = 0, sum_other_flc_a = 0, largest_branch_ocpd_a = 0 } = {}` | _ | _ | _ |
| calc-motor.js | `computeReducedVoltageStarter` | `{ across_line_lra_a = 0, across_line_lrt_pct = 100, starter_type = "autotrans...` | _ | _ | _ |
| calc-motor.js | `computeRotaryPhaseConverter` | `{ largest_motor_hp = 10, total_running_hp = 15, start_factor = 2 } = {}` | _ | _ | _ |
| calc-motor.js | `computeVfdReflectedWave` | `{ rise_time_us = 0, velocity_pct = 50, system_voltage_v = 0, run_length_ft = ...` | _ | _ | _ |
| calc-pipefit.js | `computeBoilerHorsepower` | `{ output_btuhr = 0 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeBranchReinforcement` | `{ run_od_in = 0, run_wall_in = 0, run_treq_in = 0, branch_od_in = 0, branch_w...` | _ | _ | _ |
| calc-pipefit.js | `computeBranchSaddleCutback` | `{ branch_od_in = 0, run_od_in = 0, stations = 6 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeColdSpring` | `{ material = "steel", run_length_ft = 0, install_temp_f = 0, operating_temp_f...` | _ | _ | _ |
| calc-pipefit.js | `computeCondensateReturnSizing` | `{ condensate_lbhr = 0, flash_fraction = 0, spec_vol_ft3lb = 0, vel_ceiling_fp...` | _ | _ | _ |
| calc-pipefit.js | `computeExpansionGuideSpacing` | `{ pipe_od_in = 0, d1_mult = 4, d2_mult = 14 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeFlangeRating` | `{ flange_class = 150, temp_f = 0 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeFlashSteamPct` | `{ hf_high = 0, hf_low = 0, hfg_low = 0 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeHangerRodSizing` | `{ load_lb = 0, temp_derate = 1 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computePipeFilledSupportLoad` | `{ od_in = 0, wall_in = 0, pipe_density = 490, fluid_density = 62.4, insul_thk...` | _ | _ | _ |
| calc-pipefit.js | `computePipePressureRating` | `{ od_in = 0, wall_in = 0, allow_stress = 0, joint_factor = 1, y_coeff = 0.4, ...` | _ | _ | _ |
| calc-pipefit.js | `computePipeSpacingRack` | `{ pipe_od_in = 0, insulation_thickness_in = 0, clearance_in = 1, pipe_count =...` | _ | _ | _ |
| calc-pipefit.js | `computeRacewayExpansion` | `{ run_length_ft = 0, temp_range_f = 0, alpha_per_f = 0.0000338, fitting_trave...` | _ | _ | _ |
| calc-pipefit.js | `computeRadiatorEdrOutput` | `{ edr_sqft = 320, system_k = 240, pickup_factor = 0.33 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeReducerOffset` | `{ large_od_in = 0, small_od_in = 0, lay_length_in = 0, type = "concentric" } ...` | _ | _ | _ |
| calc-pipefit.js | `computeSteamBoilerBlowdown` | `{ steam_rate_lb_hr = 10000, feedwater_tds_ppm = 100, max_boiler_tds_ppm = 350...` | _ | _ | _ |
| calc-pipefit.js | `computeSteamPipeCapacity` | `{ nps = "2", spec_vol_ft3lb = 0, vel_ceiling_fpm = 0 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeSteamPipeVelocity` | `{ steam_flow_lbhr = 0, spec_vol_ft3lb = 0, vel_ceiling_fpm = 0 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeSteamPrvAreaForCapacity` | `{ required_capacity_lb_hr = 0, upstream_p_psia = 0, discharge_coeff = 0.9 } = {}` | _ | _ | _ |
| calc-pipefit.js | `computeSteamPrvNapier` | `{ orifice_area_in2 = 0, upstream_p_psia = 0, downstream_p_psia = 0, discharge...` | _ | _ | _ |
| calc-pipefit.js | `computeSteamTrapSizing` | `{ heat_duty_btuhr = 0, hfg_btulb = 0, safety_factor = 2 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeBackflow` | `` | _ | _ | _ |
| calc-plumbing.js | `computeBackflowLoss` | `{ device_class = "RP", flow_gpm = 0, pipe_size_in = "1" }` | _ | _ | _ |
| calc-plumbing.js | `computeBackflowSizing` | `{ service_flow_gpm = 0, hazard = "high", assembly_type = "RP", pipe_size_in =...` | _ | _ | _ |
| calc-plumbing.js | `computeBernoulliHead` | `{ P_psi = 0, V_fps = 0, z_ft = 0, gamma = 62.4 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeChannelFroudeNumber` | `{ b_ft = 0, q_cfs = 0, y_ft = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeChannelNormalDepth` | `{ b_ft = 0, q_cfs = 0, n = 0, s_slope = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeDrainageInvert` | `{ invert_in_ft = 0, slope = 0, slope_units = "in_per_ft", run_ft = 0, pipe_od...` | _ | _ | _ |
| calc-plumbing.js | `computeExpansionTank` | `{ system_volume_gal = 0, fill_temperature_F = 60, max_temperature_F = 200, fi...` | _ | _ | _ |
| calc-plumbing.js | `computeFlowContinuity` | `{ V1_fps = 0, D1_in = 0, D2_in = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeFrictionLoss` | `{ method, material, nominal_size, length_ft, flow_gpm, internal_diameter_in }` | _ | _ | _ |
| calc-plumbing.js | `computeGlycolMix` | `{ system_volume_gal = 0, target_burst_F = 32, glycol_type = "propylene", prot...` | _ | _ | _ |
| calc-plumbing.js | `computeGreaseInterceptorFlowCapacity` | `{ interceptor_volume_gal = 0, retention_minutes = 30, loading_factor = 1.25 }...` | _ | _ | _ |
| calc-plumbing.js | `computeGreaseTrap` | `{ peak_flow_gpm = 0, retention_minutes = 30, loading_factor = 1.25 }` | _ | _ | _ |
| calc-plumbing.js | `computeHeatTraceSizing` | `{ pipe_ft = 150, allowance_pct = 10, num_valves = 1, valve_allow_ft = 3, rate...` | _ | _ | _ |
| calc-plumbing.js | `computeHydraulicJump` | `{ b_ft = 0, q_cfs = 0, y1_ft = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeHydronicFillPressure` | `{ height_ft = 0, margin_psi = 4 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeHydronicSystemVolume` | `{ pipe_length_ft = 500, gal_per_ft = 0.023, terminal_gal = 0, boiler_tank_gal...` | _ | _ | _ |
| calc-plumbing.js | `computeHydrostaticTest` | `{ working_pressure_psi = 0, system_volume_gal = 0, material = "water", multip...` | _ | _ | _ |
| calc-plumbing.js | `computeManningPipeCapacity` | `{ d_in = 0, slope = 0, material = "pvc" } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeManningSlope` | `{ pipe_diameter_in = 0, target_flow_gpm = 0, material = "pvc" }` | _ | _ | _ |
| calc-plumbing.js | `computeMixedWaterTemp` | `{ mode = "find-blend", hot_temp_F = 0, cold_temp_F = 0, hot_gpm = 0, cold_gpm...` | _ | _ | _ |
| calc-plumbing.js | `computeOrificeDiameterForFlow` | `{ q_cfs = 0, h_ft = 0, cd = 0.60 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeOrificeFlow` | `{ d_in = 0, h_ft = 0, cd = 0.60 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computePexHomerunTakeoff` | `{ fixtures = 8, hot_fixtures = 6, avg_run_ft = 35, waste_pct = 10 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computePipeExpansion` | `{ material, length_ft, delta_T_F }` | _ | _ | _ |
| calc-plumbing.js | `computePipeExpansionLoop` | `{ material = "copper", length_ft = 0, delta_T_F = 0, pipe_OD_in = 1.315, } = {}` | _ | _ | _ |
| calc-plumbing.js | `computePipeInsulationTakeoff` | `{ pipe_ft = 250, waste_pct = 5, num_fittings = 12, fitting_allow_ft = 1, sect...` | _ | _ | _ |
| calc-plumbing.js | `computePipePurgeVolume` | `{ pipe_id_in = 2.067, length_ft = 100, air_changes = 5, flow_scfh = 60 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computePipeSizing` | `{ fixtures, slope_in_per_ft = 0.25 }` | _ | _ | _ |
| calc-plumbing.js | `computePipeVelocity` | `{ mode = "velocity-from-flow", flow_gpm = 0, diameter_in = 0, material = "cop...` | _ | _ | _ |
| calc-plumbing.js | `computePipeVolume` | `{ internal_diameter_in, length_ft, nominal_size }` | _ | _ | _ |
| calc-plumbing.js | `computePressureTankDrawdown` | `{ mode = "find-drawdown", tank_volume_gal = 0, cut_in_psi = 0, cut_out_psi = ...` | _ | _ | _ |
| calc-plumbing.js | `computePumpOperatingPoint` | `{ pump = "small_centrifugal_60Hz", static_head_ft = 0, k_friction = 0, } = {}` | _ | _ | _ |
| calc-plumbing.js | `computePumpSize` | `{ flow_gpm, total_dynamic_head_ft, efficiency = 0.65, fluid_specific_gravity ...` | _ | _ | _ |
| calc-plumbing.js | `computeRadiantLoopSizing` | `{ floor_area_ft2 = 0, spacing_in = 0, load_btuhr = 0, max_loop_ft = 300, desi...` | _ | _ | _ |
| calc-plumbing.js | `computeRecircLoopSizing` | `{ loop_length_ft = 0, nominal_size_in = "0.75", insulation_in = 1, hot_supply...` | _ | _ | _ |
| calc-plumbing.js | `computeRecircPumpHead` | `{ pipe_length_ft, fittings_count = 0, target_flow_gpm, internal_diameter_in, ...` | _ | _ | _ |
| calc-plumbing.js | `computeSanitaryDfu` | `{ fixtures = {}, config = "horizontal_branch", slope_in_per_ft = 0.25, propos...` | _ | _ | _ |
| calc-plumbing.js | `computeSlope` | `{ rise, run, units = "in_per_ft" }` | _ | _ | _ |
| calc-plumbing.js | `computeSolarThermalCollector` | `{ optical_efficiency = 0.70, loss_coeff = 0.85, inlet_temp_f = 120, ambient_t...` | _ | _ | _ |
| calc-plumbing.js | `computeSolderJointQuantity` | `{ joints = 200, wire_in_per_joint = 0.75, wire_dia_in = 0.125, solder_density...` | _ | _ | _ |
| calc-plumbing.js | `computeSpecificEnergy` | `{ b_ft = 0, q_cfs = 0, y_ft = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeStaticPressureLossPiping` | `{ elevation_change_ft, friction_loss_psi = 0, fluid_density_lb_ft3 = 62.4 }` | _ | _ | _ |
| calc-plumbing.js | `computeStormwaterDetentionVolume` | `{ runoff_c = 0, intensity_in_hr = 0, area_ac = 0, q_allow_cfs = 0, duration_m...` | _ | _ | _ |
| calc-plumbing.js | `computeStormwaterMaxDrainageArea` | `{ allowable_flow_cfs = 0, surface = "asphalt", rainfall_in_per_hr = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeStormwaterRational` | `{ area_ft2 = 0, surface = "asphalt", rainfall_in_per_hr = 0 }` | _ | _ | _ |
| calc-plumbing.js | `computeSupplyPressureBudget` | `{ street_pressure, fixture_height = 0, meter_loss = 0, bfp_loss = 0, friction...` | _ | _ | _ |
| calc-plumbing.js | `computeTankDrainTime` | `{ tank_area_ft2 = 0, d_in = 0, cd = 0.60, h1_ft = 0, h2_ft = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeTanklessGPM` | `{ kbtu_input, climate_zone, target_outlet_F = 110, solve_for = "gpm", target_...` | _ | _ | _ |
| calc-plumbing.js | `computeThermalExpansionVolume` | `{ volume_gal = 0, cold_f = 0, hot_f = 0, closed_system = true } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeThrustBlockMaxPressure` | `{ bearing_area_ft2 = 0, od_in = 0, bend_deg = 0, soil_bearing_psf = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeThrustBlockSizing` | `{ pressure_psi = 0, od_in = 0, bend_deg = 0, soil_bearing_psf = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeTimeOfConcentration` | `{ l_ft = 0, s_slope = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeTrapArm` | `{ pipe_diameter_in, slope_in_per_ft = 0.25 }` | _ | _ | _ |
| calc-plumbing.js | `computeTrapPrimer` | `{ floor_drain_count = 0, zone = "occupied", prime_method = "electronic", prim...` | _ | _ | _ |
| calc-plumbing.js | `computeTrapSealLoss` | `{ developed_distance_ft = 0, table_max_ft = 0, trap_seal_in = 2 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeVelocityHead` | `{ V_fps = 0, gamma = 62.4, rho = 1.94 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeVentSizingStack` | `{ vent_dia_in = 0, connected_dfu = 0, developed_length_ft = 0, table_dfu = 0,...` | _ | _ | _ |
| calc-plumbing.js | `computeWaterHammerArrestor` | `{ wsfu, length_ft = 0, internal_diameter_in = 0, system_pressure_psi = 0 }` | _ | _ | _ |
| calc-plumbing.js | `computeWaterHammerSurge` | `{ material = "copper", pipe_size = "1", velocity_fps = 0, closure_time_s = 0,...` | _ | _ | _ |
| calc-plumbing.js | `computeWaterHeaterInput` | `{ heater_type = "gas_atmospheric", target_recovery_gph = 0, efficiency = null...` | _ | _ | _ |
| calc-plumbing.js | `computeWaterHeaterRecovery` | `{ heater_type = "gas_atmospheric", input_btu_hr = 0, input_kw = 0, efficiency...` | _ | _ | _ |
| calc-plumbing.js | `computeWaterHeaterStorageSizing` | `{ tank_gal = 0, input_btuh = 0, efficiency_pct = 80, rise_F = 90, usable_frac...` | _ | _ | _ |
| calc-plumbing.js | `computeWaterMeterSizing` | `{ peak_demand_gpm = 0, normal_rating_gpm = 0, peak_rating_gpm = 0 } = {}` | _ | _ | _ |
| calc-plumbing.js | `computeWhExpansionTank` | `{ water_heater_vol_gal = 0, incoming_psi = 60, relief_psi = 150, incoming_F =...` | _ | _ | _ |
| calc-plumbing.js | `computeWsfuDemand` | `{ wsfu, system_type = "flush_tank", curve = null } = {}` | _ | _ | _ |
| calc-plumbing.js | `pressureConvert` | `{ value, from, to }` | _ | _ | _ |
| calc-plumbing.js | `recommendedDrainageSize` | `dfu, slope_in_per_ft = 0.25` | _ | _ | _ |
| calc-plumbing.js | `recommendedSupplySize` | `gpm` | _ | _ | _ |
| calc-plumbing.js | `renderBackflow` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderBackflowLoss` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderDrainageInvert` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderExpansionTank` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderFrictionLoss` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderGlycolMix` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderGreaseTrap` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderHydrostaticTest` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderManningSlope` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderPipeExpansion` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderPipeSizing` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderPipeVolume` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderPressureConversion` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderPumpSizing` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderRecircPumpHead` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderSlope` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderStaticPressurePiping` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderStormwaterRational` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderTanklessGPM` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderTrapArm` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-plumbing.js | `renderWaterHammerArrestor` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-powerquality.js | `computeCapacitorBankForResonanceOrder` | `{ short_circuit_mva = 0, target_resonant_order = 4.7 } = {}` | _ | _ | _ |
| calc-powerquality.js | `computeHarmonicResonance` | `{ short_circuit_mva = 0, cap_bank_mvar = 0 } = {}` | _ | _ | _ |
| calc-powerquality.js | `computeMotorCapacitorMax` | `{ v_ll = 0, i_noload_a = 0, safety_factor = 0.90 } = {}` | _ | _ | _ |
| calc-powerquality.js | `computeMotorUnbalanceDerate` | `{ v_ab = 0, v_bc = 0, v_ca = 0 } = {}` | _ | _ | _ |
| calc-powerquality.js | `computeMotorVdStarting` | `{ source_voltage_V = 0, length_ft = 0, cmils = 0, lrc_A = 0, phase = "three",...` | _ | _ | _ |
| calc-powerquality.js | `computeNeutralCurrent3ph` | `{ ia_A = 0, ib_A = 0, ic_A = 0, triplen_pct = 0 } = {}` | _ | _ | _ |
| calc-powerquality.js | `computeParallelConductorDerate` | `{ i_single_A = 0, n_sets = 1, total_ccc = 0, ambient_factor = 1, i_load_A = 0...` | _ | _ | _ |
| calc-powerquality.js | `computeRlcReactanceResonance` | `{ frequency_hz = 60, resistance_ohm = 10, inductance_h = 0.05, capacitance_uf...` | _ | _ | _ |
| calc-powerquality.js | `computeTddIeee519` | `{ isc_a = 0, il_a = 0, measured_tdd_pct = 0 } = {}` | _ | _ | _ |
| calc-powerquality.js | `computeTransformerKFactor` | `{ i1 = 1, i3 = 0, i5 = 0, i7 = 0, i9 = 0, i11 = 0, i13 = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `compute1031Timeline` | `{ sale_close_iso }` | _ | _ | _ |
| calc-realestate.js | `computeAmortizationSchedule` | `{ principal, apr_percent, term_years, extra_monthly_principal }` | _ | _ | _ |
| calc-realestate.js | `computeBlendedMortgageRate` | `{ balance_1 = 0, rate_1 = 0, balance_2 = 0, rate_2 = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeBreakEvenOccupancy` | `{ opex = 0, debt_svc = 0, pgi = 0, target_occ = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeBrrrrRefi` | `{ arv_usd = 0, total_invested_usd = 0, refi_ltv_pct = 75, existing_payoff_usd...` | _ | _ | _ |
| calc-realestate.js | `computeCapRateDSCR` | `{ noi_annual, property_value, annual_debt_service, loan_amount = 0, loan_rate...` | _ | _ | _ |
| calc-realestate.js | `computeCashOnCash` | `{ cash_invested, annual_pretax_cashflow }` | _ | _ | _ |
| calc-realestate.js | `computeClosingCosts` | `{ purchase_price, loan_amount, transfer_tax_rate_pct, note_rate_pct }` | _ | _ | _ |
| calc-realestate.js | `computeCommercialLoadFactor` | `{ usable_sf = 0, common_area_factor = 0, base_rent = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeCommissionSplit` | `{ sale_price, total_commission_percent, side_share_percent, brokerage_split_t...` | _ | _ | _ |
| calc-realestate.js | `computeCostOfWaiting` | `{ principal, current_rate_percent, future_rate_percent, term_years }` | _ | _ | _ |
| calc-realestate.js | `computeDTI` | `{ gross_monthly_income, housing_payment, other_monthly_debts }` | _ | _ | _ |
| calc-realestate.js | `computeDebtYield` | `{ mode = "yield", noi = 0, loan = 0, dy_target = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeDepreciationRecapture` | `{ asset_class = "1250", accumulated_depreciation = 0, total_gain = 0, ordinar...` | _ | _ | _ |
| calc-realestate.js | `computeFixFlipProfit` | `{ arv_usd = 0, purchase_usd = 0, rehab_usd = 0, holding_usd = 0, financing_us...` | _ | _ | _ |
| calc-realestate.js | `computeFloorAreaRatio` | `{ building_floor_area_sf = 0, lot_area_sf = 0, far_limit = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeGrossRentMultiplier` | `{ price = 0, gross_rent = 0, rent_basis = "annual", market_grm = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeHudFmr` | `input` | _ | _ | _ |
| calc-realestate.js | `computeLTV` | `{ loan_amount, value }` | _ | _ | _ |
| calc-realestate.js | `computeLoanLimits` | `input` | _ | _ | _ |
| calc-realestate.js | `computeMaxOffer70Rule` | `{ arv = 0, repairs = 0, rule_pct = 70, fee = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeMortgagePointBreakeven` | `{ loan_amount, base_rate_pct, points_rate_pct, point_cost_pct, term_years, ho...` | _ | _ | _ |
| calc-realestate.js | `computeMortgageReserves` | `{ piti_monthly, reserves_months, liquid_assets, retirement_balance, retiremen...` | _ | _ | _ |
| calc-realestate.js | `computeNetEffectiveRent` | `{ face_rent = 0, term_periods = 0, free_periods = 0, one_time_credit = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computePITI` | `{ principal, apr_percent, term_years, annual_property_tax, annual_insurance, ...` | _ | _ | _ |
| calc-realestate.js | `computePerDiemInterest` | `{ loan_amount, annual_rate_pct, closing_date_iso, day_count }` | _ | _ | _ |
| calc-realestate.js | `computePmiCancellationDate` | `{ value = 0, loan = 0, rate_pct = 0, term_months = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computePropertyTax` | `{ assessed_value, mill_rate, homestead_exemption }` | _ | _ | _ |
| calc-realestate.js | `computeRentRollVacancy` | `{ potential_gross_rent = 0, vacancy_rate_pct = 0, credit_loss_pct = 0, other_...` | _ | _ | _ |
| calc-realestate.js | `computeRentVsBuy` | `inp` | _ | _ | _ |
| calc-realestate.js | `computeRentalTotalReturn` | `{ cash_invested_usd = 0, annual_cash_flow_usd = 0, principal_paydown_usd = 0,...` | _ | _ | _ |
| calc-realestate.js | `computeRentalWorksheet` | `inputs` | _ | _ | _ |
| calc-realestate.js | `computeRequiredFaceRent` | `{ target_ner = 0, term_periods = 0, free_periods = 0, one_time_credit = 0 } = {}` | _ | _ | _ |
| calc-realestate.js | `computeSection121` | `{ filing_status, sale_price, selling_costs, purchase_price, improvements, mee...` | _ | _ | _ |
| calc-realestate.js | `computeSellerNetSheet` | `{ price = 0, payoff = 0, commission_pct = 0, transfer_tax_pct = 0, fees = 0, ...` | _ | _ | _ |
| calc-realestate.js | `render1031Timeline` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderAmortizationSchedule` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderCapRateDSCR` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderCashOnCash` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderClosingCosts` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderCommissionSplit` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderCostOfWaiting` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderDTI` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderHudFmr` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderLTV` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderLoanLimits` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderMortgagePointBreakeven` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderMortgageReserves` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderPITI` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderPerDiemInterest` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderPropertyTax` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderRentVsBuy` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderRentalWorksheet` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-realestate.js | `renderSection121` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-references.js | `computeBurialDepth3005` | `{ wiring_method = "direct burial cable/conductors", location = "general earth...` | _ | _ | _ |
| calc-references.js | `computeColorCodes` | `` | _ | _ | _ |
| calc-references.js | `computeDefensibleSpace` | `` | _ | _ | _ |
| calc-references.js | `computeEmergencyContacts` | `` | _ | _ | _ |
| calc-references.js | `computeHandSignals` | `` | _ | _ | _ |
| calc-references.js | `computeInspectionChecklist` | `` | _ | _ | _ |
| calc-references.js | `computeIrsFormIndex` | `` | _ | _ | _ |
| calc-references.js | `computeKnotReference` | `` | _ | _ | _ |
| calc-references.js | `computeLOTO` | `` | _ | _ | _ |
| calc-references.js | `computeLabSafety` | `` | _ | _ | _ |
| calc-references.js | `computeOSHATop10` | `` | _ | _ | _ |
| calc-references.js | `computeOshaRecordkeeping` | `` | _ | _ | _ |
| calc-references.js | `computePoolBonding68026` | `{ pool_type = "permanent pool/spa" } = {}` | _ | _ | _ |
| calc-references.js | `computeSalesTaxNexus` | `{ state = "CA" } = {}` | _ | _ | _ |
| calc-references.js | `computeStormShelter` | `` | _ | _ | _ |
| calc-references.js | `computeSupportSpacing` | `{ wiring_method = "EMT", trade_size_in = 0 } = {}` | _ | _ | _ |
| calc-references.js | `computeToolMaintenance` | `` | _ | _ | _ |
| calc-references.js | `computeTriage` | `` | _ | _ | _ |
| calc-references.js | `renderColorCodes` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-references.js | `renderEmergencyContacts` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-references.js | `renderInspectionChecklist` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-references.js | `renderKnotReference` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-references.js | `renderToolMaintenance` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-refrigerant.js | `computeCompareRefrigerants` | `{ refrigerant_a, refrigerant_b, pressure_psig = null, temperature_F = null }` | _ | _ | _ |
| calc-refrigerant.js | `computeCompressorDisplacement` | `{ bore_in = 0, stroke_in = 0, cylinders = 0, rpm = 0 } = {}` | _ | _ | _ |
| calc-refrigerant.js | `computeCompressorVolumetricEfficiency` | `{ clearance_ratio = 0.045, suction_pressure_psia = 70, discharge_pressure_psi...` | _ | _ | _ |
| calc-refrigerant.js | `computeCondenserCopForHeatRejection` | `{ q_evap = 0, target_thr = 0, unit_tons = 0 } = {}` | _ | _ | _ |
| calc-refrigerant.js | `computeCondenserHeatRejection` | `{ q_evap = 0, unit_tons = 0, cop = 0 } = {}` | _ | _ | _ |
| calc-refrigerant.js | `computeEvaporatorTdDtd` | `{ box_temp_f = 0, sst_f = 0 } = {}` | _ | _ | _ |
| calc-refrigerant.js | `computeFlashGasSubcool` | `{ vertical_lift_ft = 0, friction_dp_psi = 0, static_gradient = 0.43, pt_slope...` | _ | _ | _ |
| calc-refrigerant.js | `computeProductPullDownLoad` | `{ mass_lb = 0, cp_above = 0, t_enter_f = 0, t_storage_f = 0, t_freeze_f = 0, ...` | _ | _ | _ |
| calc-refrigerant.js | `computeProductPullDownTime` | `{ mass_lb = 0, cp_above = 0, t_enter_f = 0, t_storage_f = 0, t_freeze_f = 0, ...` | _ | _ | _ |
| calc-refrigerant.js | `computeRefrigerantCharge` | `{ refrigerant, sections = [] }` | _ | _ | _ |
| calc-refrigerant.js | `computeRefrigerantCharging` | `{ refrigerant = "R_410A", suction_pressure = 0, suction_unit = "psig", suctio...` | _ | _ | _ |
| calc-refrigerant.js | `computeRefrigerantLinesetChargeAdjust` | `{ lineset_length_ft = 60, factory_charge_length_ft = 15, rate_oz_per_ft = 0.6...` | _ | _ | _ |
| calc-refrigerant.js | `computeRefrigerantMassFlow` | `{ q = 0, unit_tons = 0, h1_btulb = 0, h4_btulb = 0 } = {}` | _ | _ | _ |
| calc-refrigerant.js | `computeRefrigerantPT` | `{ refrigerant, pressure_psig = null, temperature_F = null, outdoor_F = null, ...` | _ | _ | _ |
| calc-refrigerant.js | `computeRefrigerationCop` | `{ h1_btulb = 0, h2_btulb = 0, h4_btulb = 0, tevap_f = 0, tcond_f = 0 } = {}` | _ | _ | _ |
| calc-refrigerant.js | `computeSuperheatSubcool` | `{ refrigerant, system_pressure_psig, line_temperature_F, mode, indoor_wet_bul...` | _ | _ | _ |
| calc-refrigerant.js | `computeWalkInCoolerLoad` | `{ u_factor = 0, area_ft2 = 0, delta_t_f = 0, infiltration_btuh = 0, product_b...` | _ | _ | _ |
| calc-refrigerant.js | `renderCompareRefrigerants` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-refrigerant.js | `renderRefrigerantCharge` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-refrigerant.js | `renderRefrigerantPT` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-refrigerant.js | `renderSuperheatSubcool` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-rescue.js | `computeConfinedSpacePurge` | `{ volume_ft3 = 0, blower_cfm = 0, target_purges = 7 }` | _ | _ | _ |
| calc-rescue.js | `computeFallArrestClearance` | `{ free_fall_distance_ft = 0, deceleration_distance_ft = 0, worker_height_ft =...` | _ | _ | _ |
| calc-rescue.js | `computeRopeMA` | `{ rig = "3:1", efficiency = 0.9, load_lb = 0 }` | _ | _ | _ |
| calc-rescue.js | `computeSearchTrackSpacing` | `{ sweep_width_m = 0, track_spacing_m = 0, target_pod = 0 } = {}` | _ | _ | _ |
| calc-rescue.js | `computeSearcherHours` | `{ area_acres = 0, track_spacing_ft = 0, speed_mph = 0, searchers = 1 } = {}` | _ | _ | _ |
| calc-rescue.js | `computeSlingAngle` | `{ load_lb = 0, sling_config = "vertical", included_angle_deg = 60, n_legs = 2...` | _ | _ | _ |
| calc-rescue.js | `computeSweatRateHydration` | `{ pre_weight_lb = 0, post_weight_lb = 0, fluid_oz = 0, urine_oz = 0, duration...` | _ | _ | _ |
| calc-rescue.js | `computeSweepWidthCorrection` | `{ uncorrected_width_ft = 0, weather_factor = 1, speed_factor = 1, fatigue_fac...` | _ | _ | _ |
| calc-restoration.js | `computeAirMovers` | `{ affected_area_ft2, water_class = "2" }` | _ | _ | _ |
| calc-restoration.js | `computeAirSampleVolume` | `{ flow_rate_lpm, target_volume_L, sample_count = 1 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeAntimicrobialDilution` | `{ affected_area_ft2, coverage_ft2_per_gal, tank_size_gal, mode = "oz_per_gal"...` | _ | _ | _ |
| calc-restoration.js | `computeBoundWater` | `{ material_volume_ft3 = 0, dry_density_lb_ft3 = 0, mc_current_pct = 0, mc_goa...` | _ | _ | _ |
| calc-restoration.js | `computeCarpetRestoreReplace` | `{ water_category = "cat1", component = "carpet", delaminated = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeCategoryDeterioration` | `{ origin_category = "cat1", elapsed_hours = 0, warm_environment = 0, contacte...` | _ | _ | _ |
| calc-restoration.js | `computeCavityDryingSystem` | `{ affected_wall_ft = 0, stud_spacing_in = 16, ports_per_bay = 1, ports_per_sy...` | _ | _ | _ |
| calc-restoration.js | `computeCeilingWaterLoad` | `{ pooled_area_ft2 = 0, avg_depth_in = 0, threshold_psf = 5 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeChamberTurnover` | `{ chamber_volume_ft3 = 0, target_ach = 60, air_mover_total_cfm = 0, dehu_cfm ...` | _ | _ | _ |
| calc-restoration.js | `computeCharDepthCapacity` | `{ exposure_min = 0, nominal_width_in = 0, nominal_depth_in = 0, faces_across_...` | _ | _ | _ |
| calc-restoration.js | `computeContainmentAirBalance` | `{ target_dp_in_wc = 0.02, leakage_area_in2 = 0, }` | _ | _ | _ |
| calc-restoration.js | `computeContentsPackoutInventory` | `{ floor_area_ft2 = 0, contents_ft3_per_ft2 = 2, box_volume_ft3 = 3, stacking_...` | _ | _ | _ |
| calc-restoration.js | `computeDehumidifierDerate` | `{ aham_pints_per_day = 0, derate_factor = 0.5, required_pints_per_day = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeDehumidifierSize` | `{ room_cubic_feet, water_class = "2", expected_pints_per_day = null }` | _ | _ | _ |
| calc-restoration.js | `computeDesiccantAirflow` | `{ required_pints_per_day = 0, design_grain_depression = 60, nameplate_process...` | _ | _ | _ |
| calc-restoration.js | `computeDisinfectantDwell` | `{ product_class = "quat" } = {}` | _ | _ | _ |
| calc-restoration.js | `computeDryTimeProjection` | `{ current_mc_pct = 0, goal_mc_pct = 0, daily_drop_pct = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeDryingBalance` | `{ evap_load_ppd = 0, installed_ppd = 0, target_margin = 1.2 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeDryingChamberCO2` | `{ containment_volume_ft3 = 0, co2_generation_cfm = 0, target_indoor_ppm = 100...` | _ | _ | _ |
| calc-restoration.js | `computeDryingGoal` | `{ outdoor_temperature_F, outdoor_RH_percent, indoor_temperature_F = 70, margi...` | _ | _ | _ |
| calc-restoration.js | `computeDryingLog` | `{ readings = [], drying_target_GPP = null, } = {}` | _ | _ | _ |
| calc-restoration.js | `computeDryingTime` | `{ material }` | _ | _ | _ |
| calc-restoration.js | `computeEquipmentCircuitLoad` | `{ qty_lgr_dehu = 0, qty_air_mover = 0, qty_hepa_500 = 0, qty_heat_dryer = 0, ...` | _ | _ | _ |
| calc-restoration.js | `computeEquipmentHeatLoad` | `{ total_equipment_watts = 0, target_temp_rise_f = 10, exhaust_cfm = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeEvaporationLoad` | `{ area_ft2 = 0, water_class = 3, load_factor = 0, first24_fraction = 0.4, der...` | _ | _ | _ |
| calc-restoration.js | `computeFloodCutTakeoff` | `{ wall_perimeter_ft = 0, cut_height_in = 24, removed_faces = 1, has_insulatio...` | _ | _ | _ |
| calc-restoration.js | `computeGrainsRemoved` | `{ cfm = 0, inlet_gpp = 0, outlet_gpp = 0, hours = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeHEPALife` | `{ cfm, hours_per_day, particulate_category = "medium", capacity_grams = HEPA_...` | _ | _ | _ |
| calc-restoration.js | `computeHardwoodFloorDryingMat` | `{ floor_area_ft2 = 0, mat_coverage_ft2 = 6, mats_per_unit = 16 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeHydroxylSizing` | `{ structure_volume_ft3 = 0, unit_coverage_ft3 = 0, expected_days = 3 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeMoldCleaningLabor` | `{ affected_sf = 0, production_sf_per_hr = 100, passes = 2, crew_size = 2 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeMoldConditions` | `` | _ | _ | _ |
| calc-restoration.js | `computeMoldRemediationLevel` | `{ affected_area_ft2, porous = false, hvac_involved = false, vulnerable_occupa...` | _ | _ | _ |
| calc-restoration.js | `computeMoldRisk` | `{ rh_percent, temperature_F, hours_elevated }` | _ | _ | _ |
| calc-restoration.js | `computeNAMSizing` | `{ room_volume_ft3, target_ach = 6 }` | _ | _ | _ |
| calc-restoration.js | `computeOzoneShockTreatment` | `{ structure_volume_ft3 = 0, rated_volume_per_unit = 2000, treatment_time_hr =...` | _ | _ | _ |
| calc-restoration.js | `computePPE` | `{ category }` | _ | _ | _ |
| calc-restoration.js | `computePsychrometric` | `{ temperature_F, RH_percent, atmospheric_pressure_hPa = 1013.25 }` | _ | _ | _ |
| calc-restoration.js | `computeSmokeResidueMethod` | `{ residue_type = "dry" } = {}` | _ | _ | _ |
| calc-restoration.js | `computeSootCleaningTakeoff` | `{ affected_sf = 0, sponge_coverage_sf = 100, production_sf_per_hr = 150, seal...` | _ | _ | _ |
| calc-restoration.js | `computeSporeIoRatio` | `{ indoor_spores_m3 = 0, outdoor_spores_m3 = 0, indoor_marker = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeStandingWater` | `{ area_ft2, depth_in }` | _ | _ | _ |
| calc-restoration.js | `computeSurfaceCondensationRisk` | `{ air_temp_f = 0, air_rh_pct = 0, surface_temp_f = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeThermalDeltaTReference` | `` | _ | _ | _ |
| calc-restoration.js | `computeThermalFogDeodorization` | `{ structure_volume_ft3 = 0, dose_oz_per_1000ft3 = 5, treatments = 1 } = {}` | _ | _ | _ |
| calc-restoration.js | `computeWaterClassScreen` | `{ floor_wet_fraction = 0, wall_wet_fraction = 0, wick_height_ft = 0, low_evap...` | _ | _ | _ |
| calc-restoration.js | `computeWaterReference` | `` | _ | _ | _ |
| calc-restoration.js | `computeWoodEmc` | `{ temperature_F = 0, rh_pct = 0 } = {}` | _ | _ | _ |
| calc-restoration.js | `renderAirMovers` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderDehumidifier` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderDryingGoal` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderDryingTimes` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderHEPALife` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderMold` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderNAMSizing` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderPPE` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderPsychrometric` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderStandingWater` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderThermalDeltaT` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-restoration.js | `renderWaterClasses` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-rigging.js | `computeBeamClampSidePull` | `{ leg_tension_lb, leg_angle_deg, vertical_wll_lb, side_pull_lb = 0 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeBlockRedirectLoad` | `{ line_tension_lb, direction_chg_deg } = {}` | _ | _ | _ |
| calc-rigging.js | `computeBlockRedirectMaxAngle` | `{ line_tension_lb, block_wll_lb } = {}` | _ | _ | _ |
| calc-rigging.js | `computeBridleLegTension` | `{ apex_load_lb, run1_ft, rise1_ft, run2_ft, rise2_ft } = {}` | _ | _ | _ |
| calc-rigging.js | `computeCgLoadShare` | `{ total_weight_lb, span_in, cg_from_p1_in } = {}` | _ | _ | _ |
| calc-rigging.js | `computeChainLeverHoist` | `{ load_lb, rated_wll_lb, mech_adv, efficiency = 0.85, lift_ft = 1 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeCraneGroundBearing` | `{ reaction_lb, bearing_area_ft2, allowable_psf } = {}` | _ | _ | _ |
| calc-rigging.js | `computeCraneLoadRadiusBoom` | `{ boom_length_ft = 30, boom_angle_deg = 60, boom_foot_offset_ft = 4, boom_foo...` | _ | _ | _ |
| calc-rigging.js | `computeCraneNetCapacity` | `{ gross_chart_lb, hook_block_lb = 0, jib_attach_lb = 0, wire_rope_lb = 0, bel...` | _ | _ | _ |
| calc-rigging.js | `computeCraneOutriggerReaction` | `{ gross_load_kip, counterweight_kip = 0, load_radius_ft, cw_radius_ft = 0, ou...` | _ | _ | _ |
| calc-rigging.js | `computeForkliftCapacityDerate` | `{ rated_cap_lb, rated_lc_in = 24, actual_lc_in, load_lb } = {}` | _ | _ | _ |
| calc-rigging.js | `computeLiftingLugDesign` | `{ applied_load_kip, plate_thick_in, hole_dia_in, pin_dia_in, edge_dist_in, pl...` | _ | _ | _ |
| calc-rigging.js | `computeMaxWindSpeedForLift` | `{ max_swing_deg = 5, load_weight_lb, sail_area_ft2, shape_coef = 1.6 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeMultiLegSling` | `{ total_load_lb = 0, num_legs = 2, horizontal_angle_deg = 60 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeReevingPartsOfLine` | `{ load_lb = 20000, parts_of_line = 4, sheave_efficiency = 0.98 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeRollerJackForce` | `{ load_lb, roll_coef = 0.03, incline_deg = 0, skate_cap_lb } = {}` | _ | _ | _ |
| calc-rigging.js | `computeShackleEyeboltWll` | `{ leg_load_lb, rated_wll_lb, angle_deg = 0, hardware = "shackle", design_fact...` | _ | _ | _ |
| calc-rigging.js | `computeSlingDdEfficiency` | `{ rated_wll_lb, bend_dia_in, sling_dia_in } = {}` | _ | _ | _ |
| calc-rigging.js | `computeSpanlineSagForTension` | `{ span_ft, load_lb_per_ft, allowable_tension_lb } = {}` | _ | _ | _ |
| calc-rigging.js | `computeSpanlineSagTension` | `{ span_ft, load_lb_per_ft, sag_ft } = {}` | _ | _ | _ |
| calc-rigging.js | `computeSpreaderBeam` | `{ load_lb, bar_length_ft, top_height_ft } = {}` | _ | _ | _ |
| calc-rigging.js | `computeSpreaderBeamMinHeight` | `{ load_lb, bar_length_ft, sling_wll_lb } = {}` | _ | _ | _ |
| calc-rigging.js | `computeTaglineForce` | `{ lateral_force_lb, tagline_angle_deg, per_person_lb = 50 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeTandemLiftShare` | `{ total_weight_lb, span_in, cg_from_c1_in, derate_pct = 75, c1_chart_lb, c2_c...` | _ | _ | _ |
| calc-rigging.js | `computeThreePointBridle` | `{ apex_load_lb, e1_ft, n1_ft, r1_ft, e2_ft, n2_ft, r2_ft, e3_ft, n3_ft, r3_ft...` | _ | _ | _ |
| calc-rigging.js | `computeWinchDrumLinePull` | `{ rated_pull_lb, drum_dia_in, rope_dia_in, barrel_width_in, target_layer = 1 ...` | _ | _ | _ |
| calc-rigging.js | `computeWindOnLoad` | `{ sail_area_ft2, wind_mph, shape_coef = 1.6, load_weight_lb } = {}` | _ | _ | _ |
| calc-rigging.js | `computeWireRopeClips` | `{ rope_diameter_in = 0.75 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeWireRopeDiameterForWll` | `{ wll_required_tons = 0, construction_factor = 46, design_factor = 5 } = {}` | _ | _ | _ |
| calc-rigging.js | `computeWireRopeStrength` | `{ diameter_in = 0, construction_factor = 46, design_factor = 5 } = {}` | _ | _ | _ |
| calc-septic.js | `computeLeachFieldAggregate` | `{ num_trenches = 3, trench_length_ft = 60, trench_width_in = 24, stone_depth_...` | _ | _ | _ |
| calc-septic.js | `computeSepticDoseTank` | `{ daily_flow_gpd, doses_per_day = 4, drainback_gal = 0 } = {}` | _ | _ | _ |
| calc-septic.js | `computeSepticDrainfield` | `{ design_flow_gpd = 0, application_rate_gpd_per_ft2 = 0, trench_width_ft = 3,...` | _ | _ | _ |
| calc-septic.js | `computeSepticDrainfieldCapacity` | `{ available_trench_ft = 0, application_rate_gpd_per_ft2 = 0, trench_width_ft ...` | _ | _ | _ |
| calc-septic.js | `computeSepticLppOrifice` | `{ orifice_dia_in, squirt_ft, cd = 0.6, orifices_per_lateral, num_laterals } = {}` | _ | _ | _ |
| calc-septic.js | `computeSepticLppSquirtHead` | `{ per_orifice_gpm, orifice_dia_in, cd = 0.6 } = {}` | _ | _ | _ |
| calc-septic.js | `computeSepticPumpoutInterval` | `{ tank_gal, people, accum_gal_pp_yr = 30, fill_fraction = 0.33 } = {}` | _ | _ | _ |
| calc-septic.js | `computeSepticTank` | `{ bedrooms, gallons_per_day }` | _ | _ | _ |
| calc-septic.js | `computeSepticTankForInterval` | `{ target_years = 0, people = 0, accum_gal_pp_yr = 30, fill_fraction = 0.33 } ...` | _ | _ | _ |
| calc-septic.js | `renderSepticTank` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-service.js | `computeCommercialLightingLoad` | `{ floor_area_ft2 = 0, unit_load_va_ft2 = 0, receptacle_count = 0, supply_v = ...` | _ | _ | _ |
| calc-service.js | `computeDryerDemand22054` | `{ num_dryers = 1, nameplate_w = 5000, supply_v = 240 } = {}` | _ | _ | _ |
| calc-service.js | `computeGasApplianceDemand` | `{ appliances = [], fuel = "natural_gas", heating_value = null } = {}` | _ | _ | _ |
| calc-service.js | `computeInsulationResistancePi` | `{ ir_30s_mohm = 800, ir_1min_mohm = 1040, ir_10min_mohm = 4160 } = {}` | _ | _ | _ |
| calc-service.js | `computeLightingRetrofitSavings` | `{ fixtures = 0, watts_existing = 0, watts_new = 0, annual_hours = 0, rate_kwh...` | _ | _ | _ |
| calc-service.js | `computeNeutralDemand22061` | `{ max_unbalanced_a = 0, nonlinear_excluded = 0 } = {}` | _ | _ | _ |
| calc-service.js | `computeNoncoincidentLoad` | `{ load_a_va = 0, load_b_va = 0, both_can_run = 0 } = {}` | _ | _ | _ |
| calc-service.js | `computePipeSupportSpacing` | `{ material = "copper", pipe_size, run_length, orientation = "horizontal", tab...` | _ | _ | _ |
| calc-service.js | `computePowerFactorBillingSavings` | `{ real_power_kw = 0, pf_existing = 0, pf_target = 0.95, demand_per_kva_mo = 0...` | _ | _ | _ |
| calc-service.js | `computeRangeDemand22055` | `{ num_ranges = 1, nameplate_kw = 0, supply_v = 240 } = {}` | _ | _ | _ |
| calc-service.js | `computeServiceConductorSizing` | `{ service_A = 0, material = "copper" } = {}` | _ | _ | _ |
| calc-service.js | `computeSoftenerSizing` | `{ people, use_per_cap = 75, hardness_gpg, iron_ppm = 0, capacity, salt_per_re...` | _ | _ | _ |
| calc-service.js | `computeTprDischarge` | `{ heater_input, valve_rating, outlet_size = 0.75 } = {}` | _ | _ | _ |
| calc-service.js | `computeVfdEnergySavings` | `{ full_load_kw = 0, frac_a = 1.0, hours_a = 0, frac_b = 0.75, hours_b = 0, fr...` | _ | _ | _ |
| calc-shop.js | `computeCarbonEquivalent` | `{ c = 0, mn = 0, cr = 0, mo = 0, v = 0, ni = 0, cu = 0 } = {}` | _ | _ | _ |
| calc-shop.js | `computeCompoundMiter` | `{ spring_angle_deg = 38, corner_angle_deg = 90 } = {}` | _ | _ | _ |
| calc-shop.js | `computeConeFlatPattern` | `{ base_radius_in = 0, height_in = 0 } = {}` | _ | _ | _ |
| calc-shop.js | `computeDividingHead` | `{ divisions = 0, worm_ratio = 40, circles = "" } = {}` | _ | _ | _ |
| calc-shop.js | `computeFeedForSurfaceFinish` | `{ target_finish_uin = 0, finish_basis = "ra", nose_radius_in = 0 } = {}` | _ | _ | _ |
| calc-shop.js | `computeMachiningTime` | `{ feed_mode = "rpm-ipr", cut_length_in = 0, rpm = 0, feed_ipr_in = 0, feed_ip...` | _ | _ | _ |
| calc-shop.js | `computeMaterialRemovalRate` | `{ mode = "milling", woc_in = 0, doc_in = 0, feed_ipm_in = 0, sfm = 0, feed_ip...` | _ | _ | _ |
| calc-shop.js | `computePressBrakeMaxThickness` | `{ available_tonnage_tons = 0, die_opening_in = 0, bend_length_ft = 0, uts_ksi...` | _ | _ | _ |
| calc-shop.js | `computePressBrakeTonnage` | `{ thickness_in = 0, bend_length_ft = 0, die_opening_in = 0, uts_ksi = 60 } = {}` | _ | _ | _ |
| calc-shop.js | `computePressFitInterferenceForForce` | `{ target_holding_lb = 0, shaft_dia_in = 0, hub_od_in = 0, modulus_psi = 30e6,...` | _ | _ | _ |
| calc-shop.js | `computePressFitPressure` | `{ shaft_dia_in = 0, interference_in = 0, hub_od_in = 0, modulus_psi = 30e6, f...` | _ | _ | _ |
| calc-shop.js | `computePunchCapacity` | `{ capacity_tons = 0, shear_strength_psi = 0, solve_for = "thickness", diamete...` | _ | _ | _ |
| calc-shop.js | `computePunchForce` | `{ shape = "round", diameter_in = 0, side_a_in = 0, side_b_in = 0, perimeter_i...` | _ | _ | _ |
| calc-shop.js | `computeRolledBlank` | `{ reference = "od", diameter_in = 0, thickness_in = 0, k_factor = 0.5 } = {}` | _ | _ | _ |
| calc-shop.js | `computeRollerChainLength` | `{ small_teeth_n1 = 0, large_teeth_n2 = 0, center_distance_in = 0, pitch_in = ...` | _ | _ | _ |
| calc-shop.js | `computeSprocketPitchDiameter` | `{ chain_pitch_in = 0, tooth_count_n = 0 } = {}` | _ | _ | _ |
| calc-shop.js | `computeTailstockSetover` | `{ overall_length_in = 0, large_dia_in = 0, small_dia_in = 0, taper_length_in ...` | _ | _ | _ |
| calc-shop.js | `computeTapDrillSize` | `{ thread_standard = "inch", major_dia_in = 0, tpi = 0, pitch_mm = 0, thread_p...` | _ | _ | _ |
| calc-shop.js | `computeTaperCalc` | `{ large_dia_in = 0, small_dia_in = 0, length_in = 0 } = {}` | _ | _ | _ |
| calc-shop.js | `computeTaperDiameter` | `{ known_dia_in = 0, known_end = "large", taper_per_foot = 0, length_in = 0 } ...` | _ | _ | _ |
| calc-shop.js | `computeThreadMeasureWire` | `{ thread_standard = "inch", tpi = 0, pitch_mm = 0, pitch_diameter_in = 0, wir...` | _ | _ | _ |
| calc-shop.js | `computeThreadPitchDiaFromWires` | `{ thread_standard = "inch", tpi = 0, pitch_mm = 0, measurement_over_wires_in ...` | _ | _ | _ |
| calc-shop.js | `computeToleranceStackRss` | `{ nominal_gap_in = 0, tolerances = "" } = {}` | _ | _ | _ |
| calc-shop.js | `computeTurningSurfaceFinish` | `{ feed_ipr_in = 0, nose_radius_in = 0 } = {}` | _ | _ | _ |
| calc-shop.js | `computeWeldDutyCycle` | `{ rated_amps = 0, rated_duty_pct = 0, target_amps = 0 } = {}` | _ | _ | _ |
| calc-solar.js | `computeBatteryCRate` | `{ nameplate_kwh = 0, c_rate = 0.5, dod = 0.90, inverter_kw = 0 } = {}` | _ | _ | _ |
| calc-solar.js | `computeBatteryPeakShaving` | `{ nameplate_kwh = 0, dod = 0.90, event_duration_h = 0, target_shave_kw = 0, d...` | _ | _ | _ |
| calc-solar.js | `computeBatteryRuntime` | `{ amp_hours, system_V, dod_percent = 100, load_W, peukert_k = 1 }` | _ | _ | _ |
| calc-solar.js | `computeBatterySeriesParallel` | `{ target_bus_v = 48, module_v = 12.8, module_ah = 100, parallel_strings = 2, ...` | _ | _ | _ |
| calc-solar.js | `computeBatteryTouArbitrage` | `{ nameplate_kwh = 0, dod = 0.90, rte = 0.86, peak_price = 0, offpeak_price = ...` | _ | _ | _ |
| calc-solar.js | `computeBifacialPvGain` | `{ front_poa_wm2 = 1000, rear_poa_wm2 = 150, bifaciality = 0.75, front_power_w...` | _ | _ | _ |
| calc-solar.js | `computeDcShuntSizing` | `{ rated_current_a = 100, rated_millivolt = 50, measured_millivolt = 25 } = {}` | _ | _ | _ |
| calc-solar.js | `computeEvChargeCost` | `{ battery_capacity_kwh = 0, start_soc_pct = 0, target_soc_pct = 80, electrici...` | _ | _ | _ |
| calc-solar.js | `computeEvChargeTime` | `{ battery_capacity_kwh = 0, start_soc_pct = 0, target_soc_pct = 80, evse_powe...` | _ | _ | _ |
| calc-solar.js | `computeEvChargerLoad` | `{ charger_amps = 0, main_breaker_a = 0, existing_load_a = 0, busbar_rating_a ...` | _ | _ | _ |
| calc-solar.js | `computeEvDcfcTime` | `{ usable_capacity_kwh = 0, start_soc_pct = 0, target_soc_pct = 80, charger_po...` | _ | _ | _ |
| calc-solar.js | `computeEvRangePerHour` | `{ evse_power_kw = 7.7, charge_efficiency = 0.88, vehicle_efficiency_mi_per_kw...` | _ | _ | _ |
| calc-solar.js | `computeOffGridBattery` | `{ daily_load_wh = 0, days_autonomy = 3, dod_limit = 0.5, system_voltage_v = 4...` | _ | _ | _ |
| calc-solar.js | `computePVStringSizing` | `{ module_voc_V, module_vmp_V, voc_temp_coeff_pct_per_C, record_low_C, record_...` | _ | _ | _ |
| calc-solar.js | `computePvArraySizing` | `{ target_annual_kwh = 0, psh = 5.0, perf_ratio = 0.77 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvBallastWeight` | `{ modules = 30, module_wt_lb = 50, ballast_per_module_lb = 40, racking_wt_lb ...` | _ | _ | _ |
| calc-solar.js | `computePvCellTemperaturePower` | `{ T_amb_C = 0, G_wm2 = 0, NOCT_C = 45, P_stc_W = 0, gamma = -0.35 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvCircuitAmpacity` | `{ module_isc_a = 0, parallel_strings = 1, ocpd_a = 0 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvEnergyYield` | `{ dc_kw = 0, psh = 5.0, perf_ratio = 0.77 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvInterconnectionBusbar` | `{ main_breaker_a = 0, busbar_rating_a = 0, pv_existing_a = 0, pv_proposed_a =...` | _ | _ | _ |
| calc-solar.js | `computePvInverterRatio` | `{ dc_kw = 0, ac_kw = 0, inv_eff = 0.96 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvMaxAmbientForPower` | `{ target_power_W = 0, P_stc_W = 0, G_wm2 = 0, NOCT_C = 45, gamma = -0.35 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvPerformanceRatio` | `inputs = {}` | _ | _ | _ |
| calc-solar.js | `computePvRailClampTakeoff` | `{ rows = 2, modules_per_row = 12, module_width_ft = 3.42, gap_ft = 0, rails_p...` | _ | _ | _ |
| calc-solar.js | `computePvRowShadeAngle` | `{ module_length_ft = 0, tilt_deg = 0, row_pitch_ft = 0 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvRowSpacing` | `{ module_length_ft = 0, tilt_deg = 0, profile_angle_deg = 0 } = {}` | _ | _ | _ |
| calc-solar.js | `computePvStringFusing` | `{ Isc_A = 0, max_fuse_A = 0, n_strings = 1 } = {}` | _ | _ | _ |
| calc-solar.js | `computeShadowLength` | `{ object_height_ft = 0, sun_altitude_deg = 0 } = {}` | _ | _ | _ |
| calc-solar.js | `computeSolarEgc69045` | `{ ocpd_rating_a = 0, pv_isc_a = 0, vd_upsized = "no" } = {}` | _ | _ | _ |
| calc-solar.js | `renderBatteryRuntime` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-solar.js | `renderEvChargerLoad` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-solar.js | `renderOffGridBattery` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-solar.js | `renderPVStringSizing` | `inputRegion, outputRegion, citationEl, params` | _ | _ | _ |
| calc-solar.js | `renderPvInterconnectionBusbar` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-stage.js | `_v9_atmosphericAbsorption` | `{ f_Hz, T_K, h_r, p_a_kPa }` | _ | _ | _ |
| calc-stage.js | `computeAmpPowerSpl` | `{ sensitivity_db, power_w, distance_m, crest_db, target_spl_db, max_spl_db }` | _ | _ | _ |
| calc-stage.js | `computeCounterweightArborLoad` | `{ batten_weight_lb = 0, attached_load_lb = 0, purchase_type = "single", brick...` | _ | _ | _ |
| calc-stage.js | `computeDMX` | `{ fixtures = [] }` | _ | _ | _ |
| calc-stage.js | `computeDecibelConverter` | `{ mode, p1, p2, v1, v2, level_db, ref_type, levels }` | _ | _ | _ |
| calc-stage.js | `computeLedTapeMaxRun` | `{ power_per_ft_w = 0, supply_voltage_v = 0, resistance_per_ft = 0, drop_toler...` | _ | _ | _ |
| calc-stage.js | `computeLedTapeRun` | `{ power_per_ft_w = 0, run_length_ft = 0, supply_voltage_v = 0, resistance_per...` | _ | _ | _ |
| calc-stage.js | `computeLedVideoWall` | `{ cab_w_px = 0, cab_h_px = 0, pixel_pitch_mm = 0, cols = 0, rows = 0, cab_wei...` | _ | _ | _ |
| calc-stage.js | `computeLightingBeam` | `{ beam_angle_deg = 0, throw_distance = 0, distance_unit = "ft", source = "can...` | _ | _ | _ |
| calc-stage.js | `computeLightingThrowForPool` | `{ target_pool_diameter = 0, beam_angle_deg = 0, distance_unit = "ft" } = {}` | _ | _ | _ |
| calc-stage.js | `computeNeutralImbalance` | `{ I_A = 0, I_B = 0, I_C = 0, harmonic_loads = false }` | _ | _ | _ |
| calc-stage.js | `computePowerDistro` | `{ watts = 0, voltage_v = 208, phase = "three", rating_a = 0, pf = 1, derate =...` | _ | _ | _ |
| calc-stage.js | `computeProjectorBrightness` | `{ screen_w_ft = 0, screen_h_ft = 0, screen_gain = 1.0, target_foot_lamberts =...` | _ | _ | _ |
| calc-stage.js | `computeProjectorMaxScreenSize` | `{ available_lumens = 0, screen_gain = 1.0, target_foot_lamberts = 16, aspect_...` | _ | _ | _ |
| calc-stage.js | `computeRiggingCheck` | `{ hardware = "sling_5_8_steel", configuration = "vertical", load_lb = 0, incl...` | _ | _ | _ |
| calc-stage.js | `computeRoomAbsorptionTarget` | `{ volume_ft3 = 0, target_rt60_s = 0, existing_sabins = 0, sabine_coeff = 0.04...` | _ | _ | _ |
| calc-stage.js | `computeRoomAcoustics` | `{ volume_ft3 = 0, total_sabins = 0, length_ft = 0, width_ft = 0, height_ft = ...` | _ | _ | _ |
| calc-stage.js | `computeSPL` | `{ L1_dB = 0, d1 = 1, d2 = 0, mode = "free_field", n_sources = 1 }` | _ | _ | _ |
| calc-stage.js | `computeSPLAtmospheric` | `{ source_SPL_dB = 0, d_ref_m = 1, d_far_m = 0, temperature_C = 20, RH_percent...` | _ | _ | _ |
| calc-stage.js | `computeSPLDistanceForLevel` | `{ L1_dB = 0, d1 = 1, target_L2_dB = 0, mode = "free_field", n_sources = 1 } = {}` | _ | _ | _ |
| calc-stage.js | `computeSpeakerImpedance` | `{ topology, z_ohm, count, series_per_branch, branches, amp_min_ohm, power_w }` | _ | _ | _ |
| calc-stage.js | `computeTimeAlignment` | `{ d_main_ft = 0, d_delay_ft = 0, ambient_C = 20, haas_offset_ms = 15 }` | _ | _ | _ |
| calc-stage.js | `computeTrussCapacity` | `{ truss_model = "16in_box", span_ft = 0, point_loads = [] }` | _ | _ | _ |
| calc-stage.js | `computeWinchFleetAngle` | `{ lateral_offset = 0, lead_distance = 0 } = {}` | _ | _ | _ |
| calc-steel.js | `computeBoltGroupEccentric` | `{ load_kip = 0, ecc_in = 0, ncols = 2, nrows = 3, gage_in = 3, pitch_in = 3 }...` | _ | _ | _ |
| calc-steel.js | `computeBoltShearBearing` | `{ d_in = 0.75, ab_in2 = 0.4418, fnv_ksi = 54, nplanes = 1, t_in = 0.5, fu_ksi...` | _ | _ | _ |
| calc-steel.js | `computeColumnBasePlate` | `{ pu_kip = 0, fc_ksi = 4, fy_ksi = 36, d_in = 0, bf_in = 0, b_in = 0, n_in = ...` | _ | _ | _ |
| calc-steel.js | `computeCompositeBeamFlexure` | `{ as_in2 = 0, fy_ksi = 50, d_in = 0, tslab_in = 0, be_in = 0, fc_ksi = 4 } = {}` | _ | _ | _ |
| calc-steel.js | `computeRequiredSectionModulus` | `{ fy = 50, moment_kipft = 0, method = "lrfd" } = {}` | _ | _ | _ |
| calc-steel.js | `computeShearStudStrength` | `{ asc_in2 = 0, fc_psi = 4000, ec_psi = 0, fu_ksi = 65, rg = 1.0, rp = 0.75, v...` | _ | _ | _ |
| calc-steel.js | `computeSteelBeamFlexure` | `{ fy = 50, zx = 0, mu = 0 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelBeamLtb` | `{ fy = 50, zx = 0, sx = 0, ry = 0, rts = 0, j = 0, ho = 0, lb_ft = 0, cb = 1....` | _ | _ | _ |
| calc-steel.js | `computeSteelBeamShear` | `{ fy = 50, d = 0, tw = 0, cv1 = 1.0, omega_v = 1.50, vu = 0 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelBlockShear` | `{ t_in = 0, fy = 36, fu = 58, n = 0, s_in = 3, end_in = 0, edge_in = 0, dh_in...` | _ | _ | _ |
| calc-steel.js | `computeSteelBoltSlipCritical` | `{ mu = 0.30, tb_kip = 0, ns = 1, n = 1, hf = 1.0, du = 1.13 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelBoltTensionShear` | `{ fnt_ksi = 90, fnv_ksi = 54, ab_in2 = 0, frv_ksi = 0, method = "LRFD" } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelCamber` | `{ w_kip_ft = 0, span_ft = 0, moi_in4 = 0, e_ksi = 29000, fraction = 0.80 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelColumnCapacity` | `{ fy = 50, e_mod = 29000, k = 1.0, l_ft = 0, r_in = 0, ag = 0, pu = 0 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelDoublerPlate` | `{ required_shear_kip = 0, fy_ksi = 50, col_depth_dc_in = 0, col_web_tw_in = 0...` | _ | _ | _ |
| calc-steel.js | `computeSteelEffectiveLengthK` | `{ ga = 0, gb = 0, frame = "sway" } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelFilletWeldSize` | `{ t1_in = 0, t2_in = 0, w_in = 0 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelFloorVibration` | `{ natural_freq_hz = 0, effective_wt_lb = 0, damping_ratio = 0.03, walker_forc...` | _ | _ | _ |
| calc-steel.js | `computeSteelH1Interaction` | `{ pr_kip = 0, pc_kip = 0, mrx_kft = 0, mcx_kft = 0, mry_kft = 0, mcy_kft = 0 ...` | _ | _ | _ |
| calc-steel.js | `computeSteelInertiaForDeflection` | `{ w_kip_ft = 0, span_ft = 0, allow_defl_in = 0, e_ksi = 29000 } = {}` | _ | _ | _ |
| calc-steel.js | `computeSteelPanelZoneAxial` | `{ fy_ksi = 50, col_depth_dc_in = 0, col_web_tw_in = 0, col_area_ag_in2 = 0, p...` | _ | _ | _ |
| calc-steel.js | `computeSteelPanelZoneShear` | `{ fy_ksi = 50, col_depth_dc_in = 0, col_web_tw_in = 0, col_flange_bcf_in = 0,...` | _ | _ | _ |
| calc-steel.js | `computeSteelTensionMember` | `{ ag_in2 = 0, fy = 36, fu = 58, t_in = 0, dh_in = 0.875, nh = 0, xbar_in = 0,...` | _ | _ | _ |
| calc-steel.js | `computeSteelWebLocalStrength` | `{ fy = 50, tw = 0, tf = 0, k_in = 0, d_in = 0, lb_in = 0, location = "interio...` | _ | _ | _ |
| calc-survey.js | `computeAreaByCoordinates` | `{ points } = {}` | _ | _ | _ |
| calc-survey.js | `computeCogoForwardPoint` | `{ start_n = 0, start_e = 0, azimuth_deg = 0, distance_ft = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeCogoInverseLocate` | `{ start_n = 0, start_e = 0, end_n = 0, end_e = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeDifferentialLeveling` | `{ bm_elev = 0, bs, fs, known_close = null } = {}` | _ | _ | _ |
| calc-survey.js | `computeEdmSlopeReduction` | `{ angle_mode, slope_distance_ft = 0, angle_deg = 0, hi_ft = 0, hr_ft = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeGridToGround` | `{ grid_distance_ft = 0, grid_scale_factor = 1, ellipsoid_height_ft = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeLevelLoopAdjustment` | `{ elevs, dists, known_close = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeLevelingCurvatureRefraction` | `{ sight_distance_ft = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeStadiaDistance` | `{ s_ft = 0, theta_deg = 0, k_f = 100, hi_ft = 0, rod_ft = 0, sta_elev = 0 } = {}` | _ | _ | _ |
| calc-survey.js | `computeTapingCorrections` | `{ l_ft = 0, t_f = 68, t0_f = 68, h_ft = 0, p_lb = 0, p0_lb = 0, a_in2 = 0, w_...` | _ | _ | _ |
| calc-survey.js | `computeTraverseClosure` | `{ courses, n0 = 0, e0 = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeBodTssLoadingRemoval` | `{ flow_mgd = 0, influent_mgl = 0, effluent_mgl = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeBreakpointChlorination` | `{ total_ppm = 0, free_ppm = 0, ratio = 10, gallons = 0, avail = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeChemicalFeedPump` | `{ flow_mgd = 0, dose_mgl = 0, strength_pct = 100, sg = 1, pump_max_gpd = 0 } ...` | _ | _ | _ |
| calc-treatment.js | `computeChlorineCylinderWithdrawal` | `{ feed_rate_lb_day = 0, container_type = "cylinder", room_temp_f = 70 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeClarifierAreaForLoading` | `{ flow_mgd = 0, target_sor_gpd_ft2 = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeClarifierSurfaceLoading` | `{ flow_mgd = 0, surface_ft2 = 0, weir_len_ft = 0, mlss_mgl = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeConductivityFromTds` | `{ tds_mgl = 0, k_factor = 0.65 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeDigesterGasProduction` | `{ vs_fed_lb_day = 0, vs_reduction_pct = 0, gas_yield_ft3_lb = 15, methane_pct...` | _ | _ | _ |
| calc-treatment.js | `computeDigesterVsLoading` | `{ feed_flow_gpd = 0, percent_ts = 0, percent_vs = 0, digester_ft3 = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeFlocculationGValue` | `{ power_input_w = 0, basin_volume_m3 = 0, water_temp_c = 15, detention_time_s...` | _ | _ | _ |
| calc-treatment.js | `computeFlocculatorPaddlePower` | `{ paddle_radius_ft = 0, wheel_rpm = 0, paddle_area_ft2 = 0, drag_coeff = 1.8,...` | _ | _ | _ |
| calc-treatment.js | `computeLangelierIndex` | `{ ph = 0, temp = 0, temp_unit = "C", ca_mgl = 0, alk_mgl = 0, tds_mgl = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeOilWaterSeparatorSizing` | `{ flow_gpm = 50, oil_sg = 0.85, droplet_micron = 150, water_viscosity_cp = 1....` | _ | _ | _ |
| calc-treatment.js | `computePoolAlkalinityAdjust` | `{ gallons = 0, current_ta_ppm = 0, target_ta_ppm = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolCalciumHardnessDose` | `{ gallons = 20000, ppm_increase = 20, product_purity_pct = 77 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolChlorineDose` | `{ ppm = 0, gallons = 0, product = "cal-hypo-65", avail = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolCyaDose` | `{ gallons = 0, current_cya_ppm = 0, target_cya_ppm = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolHeaterBtu` | `{ gallons = 0, dT_F = 0, output = 0, eff = 0.80 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolHeaterSize` | `{ gallons = 0, dT_F = 0, target_hours = 0, eff = 0.80 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolInteriorFinishVolume` | `{ length_ft = 30, width_ft = 15, avg_depth_ft = 5.5, shell_thickness_in = 8, ...` | _ | _ | _ |
| calc-treatment.js | `computePoolSaltDose` | `{ gallons = 0, current_salt_ppm = 0, target_salt_ppm = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computePoolTileCopingPerimeter` | `{ length_ft = 32, width_ft = 16, tile_length_in = 6, courses = 1, coping_leng...` | _ | _ | _ |
| calc-treatment.js | `computePoolVolume` | `{ shape = "rectangle", length_ft = 0, width_ft = 0, diameter_ft = 0, shallow_...` | _ | _ | _ |
| calc-treatment.js | `computeTaperedFlocculationG` | `{ stage1_g_per_s = 0, stage2_g_per_s = 0, stage3_g_per_s = 0, stage_volume_m3...` | _ | _ | _ |
| calc-treatment.js | `computeTdsFromConductivity` | `{ conductivity_us_cm = 0, k_factor = 0.65 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeVaAlkalinityRatio` | `{ volatile_acids_mgl = 0, alkalinity_mgl = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeWeirFlow` | `{ weir_type = "vnotch90", head_ft = 0, crest_length_ft = 0, coeff = 0 } = {}` | _ | _ | _ |
| calc-treatment.js | `computeWeirHeadFromFlow` | `{ weir_type = "vnotch90", target_flow_cfs = 0, crest_length_ft = 0, coeff = 0...` | _ | _ | _ |
| calc-trucking.js | `computeAxleLoadDistribution` | `{ drive_lb = 0, trailer_lb = 0, kingpin_to_tandem_in = 0, hole_spacing_in = 6...` | _ | _ | _ |
| calc-trucking.js | `computeBridgeFormula` | `{ axle_weights_lb = [], axle_spacings_ft = [] }` | _ | _ | _ |
| calc-trucking.js | `computeBridgeFormulaMinSpacing` | `{ target_weight_lb = 0, num_axles = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeCargoSecurementWLL` | `{ cargo_weight_lb = 0, tiedown_count = 0, wll_each_lb = 0, cargo_length_ft = ...` | _ | _ | _ |
| calc-trucking.js | `computeCostPerMile` | `{ fixed_monthly = 0, miles_month = 0, fuel_price = 0, mpg = 0, maint_cpm = 0,...` | _ | _ | _ |
| calc-trucking.js | `computeDIM` | `{ length_in = 0, width_in = 0, height_in = 0, actual_weight_lb = 0, carrier =...` | _ | _ | _ |
| calc-trucking.js | `computeDeadheadPercent` | `{ loaded_mi = 0, deadhead_mi = 0, revenue = 0, surcharge = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeDefConsumption` | `{ diesel_gal = 0, trip_miles = 0, mpg = 0, dose_pct = 2.5, def_tank_gal = 0 }...` | _ | _ | _ |
| calc-trucking.js | `computeDetentionDemurrageBilling` | `{ free_hours = 0, actual_hours = 0, rate_usd_hr = 0, truck_rev_usd_hr = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeDriverPayCpmVsPercentage` | `{ cpm_usd = 0, pct = 0, miles = 0, linehaul_usd = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeFreightDensity` | `{ length_in = 0, width_in = 0, height_in = 0, weight_lb = 0 }` | _ | _ | _ |
| calc-trucking.js | `computeFuelSurcharge` | `{ current_fuel_price = 0, base_fuel_price = 0, mpg_peg = 0, loaded_miles = 0 ...` | _ | _ | _ |
| calc-trucking.js | `computeFuelTaxIFTA` | `{ miles = 0, fleet_mpg = 0, tax_rate_per_gal = 0, gallons_purchased = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeGcwrCheck` | `{ gcwr_lb = 0, tractor_weight_lb = 0, trailer_weight_lb = 0, federal_max_lb =...` | _ | _ | _ |
| calc-trucking.js | `computeHOS` | `{ profile = "property_70_8", events = [], weekly_on_duty_used_hr = 0, current...` | _ | _ | _ |
| calc-trucking.js | `computeIncoterm` | `{ term = "FOB" }` | _ | _ | _ |
| calc-trucking.js | `computeInvoiceFactoringCost` | `{ invoice_usd = 0, advance_pct = 90, fee_pct = 3, days_to_pay = 30 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeLoadProfitability` | `{ linehaul_revenue = 0, loaded_miles = 0, deadhead_miles = 0, fuel_price = 0,...` | _ | _ | _ |
| calc-trucking.js | `computeMaintenanceReserve` | `{ tire_set_cost = 0, tire_life_mi = 0, pm_cost = 0, pm_interval_mi = 0, major...` | _ | _ | _ |
| calc-trucking.js | `computePalletLoadout` | `{ case_length_in = 0, case_width_in = 0, case_height_in = 0, case_weight_lb =...` | _ | _ | _ |
| calc-trucking.js | `computeReeferBurn` | `{ unit = "thermo_king_continuous", tank_gal = 50, haul_hr = 24, ambient_band ...` | _ | _ | _ |
| calc-trucking.js | `computeSsdDesignSpeed` | `{ sight_distance_ft = 0, reaction_time_s = 2.5, friction = 0.35, grade = 0.0 ...` | _ | _ | _ |
| calc-trucking.js | `computeStaticRolloverThreshold` | `{ track_width_in = 72, cg_height_in = 80, curve_radius_ft = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeStoppingSightDistance` | `{ speed_mph = 0, reaction_time_s = 2.5, friction = 0.35, grade = 0.0, } = {}` | _ | _ | _ |
| calc-trucking.js | `computeTireLoadCheck` | `{ axle_weight_lb = 0, tires_on_axle = 2, tire_max_load_lb = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `computeTrailerTongueWeight` | `{ trailer_gross_weight_lb = 0, tongue_weight_lb = 0, hitch_type = "convention...` | _ | _ | _ |
| calc-trucking.js | `computeTruckOffTracking` | `{ turn_radius_ft = 0, wheelbase1_ft = 0, wheelbase2_ft = 0 } = {}` | _ | _ | _ |
| calc-trucking.js | `renderSsdDesignSpeed` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-trucking.js | `renderStoppingSightDistance` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-velocity.js | `computeDuctVelocityPressure` | `{ solve_for = "velocity", vp_inwc = 0, velocity_fpm = 0 } = {}` | _ | _ | _ |
| calc-velocity.js | `computePitotTraverseCfm` | `{ vp_avg_inwc = 0, w_in = 0, h_in = 0 } = {}` | _ | _ | _ |
| calc-velocity.js | `computeRefrigerantLineSize` | `{ mass_flow_lb_hr = 0, specific_volume_ft3_lb = 0, target_velocity_fpm = 1500...` | _ | _ | _ |
| calc-velocity.js | `computeRefrigerantVelocity` | `{ mass_flow_lb_hr = 0, line_id_in = 0, specific_volume_ft3_lb = 0, orientatio...` | _ | _ | _ |
| calc-velocity.js | `renderDuctVelocityPressure` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-velocity.js | `renderPitotTraverseCfm` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-velocity.js | `renderRefrigerantLineSize` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-velocity.js | `renderRefrigerantVelocity` | `inputRegion, outputRegion, citationEl` | _ | _ | _ |
| calc-water.js | `computeAerationOxygenDemand` | `{ bod_removed_lb_day = 0, oxygen_factor = 0, nh3_nitrified_lb_day = 0, sote_p...` | _ | _ | _ |
| calc-water.js | `computeBackflowTestPSI` | `{ assembly_type = "rp", check1_psid = 0, relief_open_psid = 0, check2_psi = 0...` | _ | _ | _ |
| calc-water.js | `computeChlorineDecay` | `{ initial_mg_l = 0, decay_k_per_hr = 0.1, time_hr = 0, target_mg_l = 0.2, vel...` | _ | _ | _ |
| calc-water.js | `computeChlorineDemand` | `{ applied_mg_l = 0, measured_residual_mg_l = 0, target_residual_mg_l = 0 } = {}` | _ | _ | _ |
| calc-water.js | `computeCisternStorageDays` | `{ usable_storage_gal = 2500, daily_demand_gpd = 150, target_days = 30 } = {}` | _ | _ | _ |
| calc-water.js | `computeCoagulantDose` | `{ flow_mgd = 0, jar_test_dose_mg_l = 0, product = "alum_liquid", } = {}` | _ | _ | _ |
| calc-water.js | `computeCoolingWaterMakeup` | `{ recirculation_gpm = 0, delta_T_F = 0, coc = 4, drift_fraction = 0.002, } = {}` | _ | _ | _ |
| calc-water.js | `computeDechlorinationDose` | `{ chlorine_residual_mg_l = 2, flow_mgd = 5, stoich_ratio = 1.46, purity_pct =...` | _ | _ | _ |
| calc-water.js | `computeDetentionBasinVolume` | `{ target_minutes = 0, flow_gpm = 0 } = {}` | _ | _ | _ |
| calc-water.js | `computeDetentionTime` | `{ tank_volume_gal = 0, flow_gpm = 0, target_minutes = 0, surface_area_ft2 = 0...` | _ | _ | _ |
| calc-water.js | `computeDilution` | `{ c1 = 0, v1 = 0, c2 = 0, v2 = 0, mode = "single", steps = 1, dilution_factor...` | _ | _ | _ |
| calc-water.js | `computeDisinfectionCT` | `{ chlorine_mg_l = 0, t10_minutes = 0, temperature_C = 5, pH = 7.0, log_target...` | _ | _ | _ |
| calc-water.js | `computeFilterAreaForLoading` | `{ flow_gpm = 0, target_loading_gpm_ft2 = 0, backwash_rate_gpm_ft2 = 15 }` | _ | _ | _ |
| calc-water.js | `computeFilterLoading` | `{ filter_area_ft2 = 0, flow_gpm = 0, backwash_rate_gpm_ft2 = 15 }` | _ | _ | _ |
| calc-water.js | `computeFloatMethodFlow` | `{ float_distance_ft = 20, travel_time_s = 10, channel_width_ft = 4, mean_dept...` | _ | _ | _ |
| calc-water.js | `computeFluorideFeedDose` | `{ target_dose_mg_l = 0.7, raw_fluoride_mg_l = 0.1, flow_mgd = 2, afi_fraction...` | _ | _ | _ |
| calc-water.js | `computeIronManganeseChlorineDose` | `{ fe_mgl = 3.0, mn_mgl = 0.5, extra_demand_mgl = 0.5, target_residual_mgl = 0...` | _ | _ | _ |
| calc-water.js | `computePoolTurnover` | `{ pool_volume_gal = 0, turnover_hr = 6, chlorine_ppm = 2, chlorine_type = "ca...` | _ | _ | _ |
| calc-water.js | `computePopulationEquivalent` | `{ flow_mgd = 0, bod_mg_l = 0, ss_mg_l = 0 } = {}` | _ | _ | _ |
| calc-water.js | `computePoundsFormula` | `{ flow_mgd = 0, dose_mg_l = 0, chemical = "chlorine_gas" }` | _ | _ | _ |
| calc-water.js | `computePumpEfficiency` | `{ flow_gpm = 0, tdh_ft = 0, motor_kW = 0, motor_eff = 0.92, drive_eff = 1.0 }` | _ | _ | _ |
| calc-water.js | `computeRasFlowRate` | `{ plant_flow_mgd = 0, mlss_mg_l = 0, ras_ss_mg_l = 0 } = {}` | _ | _ | _ |
| calc-water.js | `computeRasSviSettleability` | `{ plant_flow_mgd = 0, mlss_mg_l = 0, svi_ml_g = 0 } = {}` | _ | _ | _ |
| calc-water.js | `computeRoRecoveryConcentration` | `{ feed_gpm = 10, permeate_gpm = 7.5, feed_tds_mgl = 500 } = {}` | _ | _ | _ |
| calc-water.js | `computeSRTandFM` | `{ aeration_volume_gal = 0, mlss_mg_l = 0, mlvss_mg_l = 0, was_flow_mgd = 0, w...` | _ | _ | _ |
| calc-water.js | `computeSVI` | `{ sv30_ml_per_l = 0, mlss_mg_per_l = 0, } = {}` | _ | _ | _ |
| calc-water.js | `computeTwoSourceBlend` | `{ flow1_gpm = 500, conc1 = 4, flow2_gpm = 300, conc2 = 12, target_conc = 8 } ...` | _ | _ | _ |
| calc-water.js | `computeUvDose` | `{ intensity_mw_cm2 = 0, exposure_time_s = 0, target_dose_mj_cm2 = 40 } = {}` | _ | _ | _ |
| calc-water.js | `computeUvRequiredExposure` | `{ target_dose_mj_cm2 = 40, intensity_mw_cm2 = 0, exposure_time_s = 0 } = {}` | _ | _ | _ |
| calc-water.js | `computeWasSrtControl` | `{ aeration_volume_mg = 0, mlss_mg_l = 0, target_srt_days = 0, was_conc_mg_l =...` | _ | _ | _ |
| calc-water.js | `computeWellDrawdown` | `{ static_level_ft = 0, pumping_level_ft = 0, discharge_gpm = 0, pump_offset_f...` | _ | _ | _ |
| calc-water.js | `computeWellMaxYield` | `{ specific_capacity_gpm_ft = 0, allowable_drawdown_ft = 0 } = {}` | _ | _ | _ |
| pure-math.js | `C_to_F` | `C` | _ | _ | _ |
| pure-math.js | `C_to_K` | `C` | _ | _ | _ |
| pure-math.js | `F_to_C` | `F` | _ | _ | _ |
| pure-math.js | `K_to_C` | `K` | _ | _ | _ |
| pure-math.js | `allowableSpanByBending` | `{ w_lb_ft, Fb_psi, b_in, d_in }` | _ | _ | _ |
| pure-math.js | `allowableSpanByDeflection` | `{ w_lb_ft, E_psi, b_in, d_in, deflectionLimit = 360 }` | _ | _ | _ |
| pure-math.js | `ampacityFromPhysics` | `{ material, awg, insulation_rating_C, ambient_C = 30, bundle_count = 1, h_eff...` | _ | _ | _ |
| pure-math.js | `awgAreaCmils` | `awg` | _ | _ | _ |
| pure-math.js | `awgAreaM2` | `awg` | _ | _ | _ |
| pure-math.js | `awgDiameterInches` | `awg` | _ | _ | _ |
| pure-math.js | `awgToNumber` | `awg` | _ | _ | _ |
| pure-math.js | `beamCenterPointLoadSimplySupported` | `{ P_lb, L_ft, E_psi, I_in4 }` | _ | _ | _ |
| pure-math.js | `beamUniformLoadSimplySupported` | `{ w_lb_ft, L_ft, E_psi, I_in4 }` | _ | _ | _ |
| pure-math.js | `betainc` | `x, a, b` | _ | _ | _ |
| pure-math.js | `chi2Cdf` | `x, df` | _ | _ | _ |
| pure-math.js | `colebrookFrictionFactor` | `{ Re, relativeRoughness }` | _ | _ | _ |
| pure-math.js | `conductorResistance` | `{ material, awg, length_m, temperature_C }` | _ | _ | _ |
| pure-math.js | `conductorResistancePerKft` | `{ material, awg, temperature_C }` | _ | _ | _ |
| pure-math.js | `darcyWeisbachFrictionLoss` | `{ internal_diameter_m, length_m, velocity_m_s, density_kg_m3, viscosity_Pa_s,...` | _ | _ | _ |
| pure-math.js | `dewPointFromVaporPressure_C` | `e_hPa` | _ | _ | _ |
| pure-math.js | `erf` | `x` | _ | _ | _ |
| pure-math.js | `feetOfHeadToPsi` | `feet, fluid_density_lb_ft3 = 62.4` | _ | _ | _ |
| pure-math.js | `fireHoseFrictionLoss` | `{ C, gpm, length_ft }` | _ | _ | _ |
| pure-math.js | `gammainc` | `a, x` | _ | _ | _ |
| pure-math.js | `gammaln` | `x` | _ | _ | _ |
| pure-math.js | `hazenWilliamsFrictionLoss` | `{ flow_gpm, internal_diameter_in, length_ft, C }` | _ | _ | _ |
| pure-math.js | `hydrantFlow` | `{ pitot_psi, outlet_diameter_in, c = 0.9 }` | _ | _ | _ |
| pure-math.js | `interpLinear` | `xs, ys, x` | _ | _ | _ |
| pure-math.js | `interpolateRefrigerant` | `{ pairs, pressure_psig = null, temperature_F = null }` | _ | _ | _ |
| pure-math.js | `normCdf` | `z` | _ | _ | _ |
| pure-math.js | `psychrometric` | `{ T_C, RH_percent, P_hPa = 1013.25 }` | _ | _ | _ |
| pure-math.js | `rectangularSection` | `{ b_in, d_in }` | _ | _ | _ |
| pure-math.js | `saturationVaporPressure_hPa` | `T_C` | _ | _ | _ |
| pure-math.js | `singlePhasePower` | `{ V, I, pf }` | _ | _ | _ |
| pure-math.js | `tcdf` | `t, df` | _ | _ | _ |
| pure-math.js | `threePhasePower` | `{ V_LL, I_L, pf }` | _ | _ | _ |
| pure-math.js | `voltageDrop` | `{ phase, material, awg, length_ft, current_A }` | _ | _ | _ |

Row count: 1690.

<!-- END function-corpus-v14 -->

## spec-v20 new-tile derivations

| Tile | Name | Derivation / worked example | Fixture |
| --- | --- | --- | --- |
| `thermal-expansion-volume` | Water Thermal-Expansion Volume | NIST water density; dV = V*(rho_cold/rho_hot - 1); 50 gal 50->140 F -> 0.839 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vent-sizing-stack` | DWV Vent-Stack DFU / Length Check | IPC/UPC Ch.9 (user-supplied table); pass if DFU<=table and length<=max; 18/24 DFU, 90/120 ft -> pass, 75% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gas-pipe-pressure-drop` | Low-Pressure Fuel-Gas Pressure Drop (Spitzglass) | Spitzglass low-pressure Q=3550*K*sqrt(dH*D^5/(SG*L)); 1000 CFH/1.049 in/100 ft/0.60 -> 16.73 in w.c. | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `economizer-savings-hours` | Air-Side Economizer Free-Cooling Hours | ASHRAE Q_sens = 1.08*CFM*dT; ton-hours = Q*hours/12000; 4000 CFM dT 20 -> 86,400 BTU/hr | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-heat-loss-radial` | Insulated Pipe Heat Loss (Radial) | Fourier cylindrical Q/L = 2*pi*(k/12)*dT/ln(r2/r1); OD 2 in, 1 in insul, k 0.25, 200/70 F -> 24.55 BTU/hr-ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fan-motor-bhp` | Fan Brake Horsepower | AMCA BHP = CFM*TSP/(6356*eta); 4000 CFM, 2.0 in, eta 0.65 -> BHP 1.94 -> 2 HP (NEMA) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grains-removed` | Moisture Removed by Grain Depression | Psychrometric mass balance; (CFM*60/13.33)*dG/7000; 250 CFM, dG 40, 24 hr -> 6.43 lb/hr, 18.5 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `evaporation-load` | Evaporation Load / Dehu Demand | IICRC S500 load_gal = area*load_factor(class); 800 ft2 Class 3 (0.08) -> 64 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `point-load-bearing` | Bearing Length on a Wood Plate | NDS Fc-perp bearing; length = P/(Fc_perp*Cb*width); 4000 lb, 3 in, 625 psi -> 2.13 in | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `column-buckling-wood` | Wood Column Capacity (Slenderness) | NDS Cp column stability; 3.5x3.5, le 96, Fc* 1150, Emin 580k -> Cp 0.468, cap ~6600 lb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `beam-reactions` | Simple-Span Beam Reactions and Max Moment | Statics simple beam; R=wL/2, M=wL^2/8; L 16 ft w 200 plf -> R 1600 lb, M 6400 ft-lb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `elevation-pressure-loss` | Elevation Pressure Loss / Gain | Hydrostatic 0.434 psi/ft vs 5 psi/floor; 9 floors @10 ft -> 39.06 vs 45 psi | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `water-supply-duration` | Water-Supply Duration | Continuity t = V/(GPM-resupply); 3000 gal/250 GPM -> 12 min; +150 GPM shuttle -> 30 min | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cost-per-mile` | Operating Cost Per Mile | ATRI buckets; total = fixed/miles + price/mpg + maint + driver; $6000/10k, $4/6.5mpg, .18, .65 -> $2.045 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `deadhead-percent` | Deadhead Percentage and Effective Rate | deadhead% = dead/total; 120/920 -> 13.04%; $1840/800 = $2.30 loaded, $2.00 total | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `axle-load-distribution` | Axle-Load Tandem Slide | Lever-arm slide; shift/hole = trailer*spacing/L; 32000*6/400 = 480; 1200 over -> 3 holes forward | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hp-from-torque` | Horsepower from Torque and RPM | HP = T*RPM/5252; 400 lb-ft @ 5000 RPM -> 380.8 HP | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `volumetric-efficiency` | Volumetric Efficiency and Airflow | 4-stroke CFM = disp*RPM/3456; 350 ci @ 5500 -> 557 CFM | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gear-mph-rpm` | Gear-Ratio MPH from RPM | MPH = RPM*pi*dia*60/(trans*axle*63360); 2500/1:1/3.55/28.5 -> 59.71 MPH | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `growing-degree-days` | Growing Degree Days | USDA GDD; modified (min(Tmax,86)+max(Tmin,50))/2-50; 92/64 -> 25 GDD | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pearson-square-ration` | Pearson-Square Feed Ration | Pearson square pct_a = |B-T|/(|B-T|+|A-T|); 9/44 to 16 -> 80% corn, 20% SBM | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `livestock-water-requirement` | Livestock Water Requirement | NRC/NRCS interpolation; 80 F between (40,8) and (90,20) -> 17.6 gal/head x 50 = 880 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `weir-flow` | Weir / Flume Open-Channel Flow | USBR V-notch Q = 2.49*H^2.48; H 0.5 ft -> 0.446 cfs = 200 GPM | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `langelier-index` | Langelier Saturation Index | Langelier LSI = pH - pHs; pH 7.5/25 C/Ca 200/alk 150/TDS 320 -> +0.04 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chemical-feed-pump` | Chemical Metering-Pump Setting | Pounds formula; 0.5 MGD*8*8.34/0.125/(8.34*1.16) = 27.6 GPD -> 55% of 50 GPD pump | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `power-distro` | Power Distro Per-Leg Loading | AC power 3-phase I = W/(sqrt(3)*V*PF); 12kW/208 V -> 33.3 A/leg, pass (80% of 60) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `brine-cure` | Brine / Cure Concentration | Mass fraction; equilibrium ingoing nitrite ppm = cure*0.0625*1e6/meat (green meat weight, 9 CFR 424.22); 2.5 g cure / 1000 g meat -> 156 ppm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `search-probability` | Search Probability of Detection | Koopman; cumPOD = 1-(0.7*0.6*0.5) = 79%; POS = 0.6*0.79 = 47.4% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `declining-balance-depreciation` | Declining-Balance Depreciation (Book) | ASC 360 DDB; rate = 2/5 = 0.4; Yr1 = 50000*0.4 = $20,000; book $30,000 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `markup-vs-margin` | Markup vs. Margin Converter | CVP; price = 60*1.5 = $90; margin = 30/90 = 33.3% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `employer-payroll-tax` | Employer Payroll Tax | FICA; SS = min(200k,168600)*6.2% = $10,453.20; Medicare = 200k*1.45% = $2,900 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `federal-post-judgment-interest` | Federal Post-Judgment Interest | 28 USC 1961; 100000*((1.05)^2-1) = $10,250 accrued, $110,250 owed | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lease-rent-proration` | Lease / Rent Proration | Actual-days; daily = 1500/31 = $48.39; x 17 days = $822.58 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `primer-tm` | Primer Melting Temperature | Wallace Tm = 2(A+T)+4(G+C); GCGGATCCATG (AT 4, GC 7) -> 8+28 = 36 C | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cfu-plate-count` | CFU/mL Viable Plate Count | FDA BAM; CFU/mL = 150 / (1e-5 * 0.1) = 1.5e8 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vet-body-surface-area` | Veterinary Body Surface Area | Meeh BSA = 10.1 * 20000^(2/3) / 1e4 = 0.744 m2 (dog 20 kg) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vet-corrected-reticulocyte` | Corrected Reticulocyte / Production Index | corrected% = 5 * 20/45 = 2.22%; absolute = 5% * 3e6 = 150,000/uL | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vet-fluid-deficit` | Veterinary Dehydration Fluid Deficit | deficit = 0.08*10*1000 = 800; +600 maintenance = 1400 mL/day; /24 = 58 mL/hr | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vet-anion-gap` | Veterinary Anion Gap | AG = (145+4) - (110+20) = 19 mEq/L (dog, within 12-25) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cockcroft-gault-crcl` | Cockcroft-Gault Creatinine Clearance | Cockcroft-Gault; (140-70)*72/(72*1.2) = 58.3 mL/min | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `winters-expected-pco2` | Winters' Formula Expected pCO2 | Winters; 1.5*12 + 8 = 26 +/- 2 mmHg | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `aa-gradient` | Alveolar-Arterial Oxygen Gradient | Alveolar gas; PAO2 = 0.21*713 - 50 = 99.7; A-a = 29.7; expected = 40/4+4 = 14 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fena` | Fractional Excretion of Sodium | FENa = (10*3.0)/(140*100)*100 = 0.21% (pre-renal) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gross-rent-multiplier` | Gross Rent Multiplier | GRM = 300000/36000 = 8.33; gross yield = 1/8.33 = 12% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pmi-cancellation-date` | PMI Cancellation / Termination | HPA; 250k/250k @6.5%/360 amortizes to 80% LTV at month 146, 78% at 156 (corrects spec's ~70/~82 arithmetic slip) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `seller-net-sheet` | Seller Net Proceeds Sheet | net = 400000 - 250000 - 22000 - 2000 - 2500 = $123,500 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `final-grade-needed` | Final-Exam Grade Needed | needed = (90 - 88*0.75)/0.25 = 24/0.25 = 96% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `category-weighted-grade` | Weighted Category Grade | overall = (92*20 + 85*30 + 78*50)/100 = 82.9% (B) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `two-sample-t-test` | Two-Sample t-Test | Welch t = 4/sqrt(36/25+49/22) = 2.09; df ~41.7; two-sided p ~0.043 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `isa-temp-correction` | Cold-Temperature Altitude Correction | FAA AIM; 1000 ft * (15-(-20)) * 4/1000 = 140 ft cold-temperature correction | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `weight-shift-cg` | Weight-and-Balance CG Shift | CG = sum(w*arm)/sum(w) = 81024/2118 = 38.25 in (2118 lb, in envelope) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `landing-takeoff-da-correction` | Takeoff/Landing Density-Altitude Correction | DA = 5000 + 120*(25-5.1) = 7388 ft; roll = 1000*(1+0.1*7.388) = 1739 ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

<!-- BEGIN tile-index-v14 (generated by scripts/build-tile-index.mjs) -->

## Per-tile derivation index (v14)

Per spec-v14 §13.1, one row per TOOLS tile recording the tile id,
its group, the source publisher / section that the v10 cross-
validation fixture cites for the tile's worked example, and a
pointer to the fixture file. This table is the mechanically-
extracted skeleton emitted by
[scripts/build-tile-index.mjs](../scripts/build-tile-index.mjs)
and kept in sync by `npm run audit:tile-index` (wired into
`npm run lint`).

The per-formula derivation prose lives in the numbered sections
above; one section per formula family covers the tiles that share
the underlying physics. Reference-only tiles (Groups H and Q per
spec-v14 §12.1) record the v6 source-stamp recheck row in
[docs/v6-audit.md](v6-audit.md) rather than a formula derivation,
per spec-v14 §13.1 second paragraph.

### Group A Electrical (197 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `access-control-power-supply` | Access-Control Power Supply and Standby Battery | access-control power / standby sizing...; load = 4*0.5 + 2*0.15 + 0.225 = 2.525; psu = 1.25*2.525 =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ambient-ampacity-adjust` | Conductor Ambient and Fill Ampacity Adjustment | NFPA; adjusted = base * ambient_factor * fill_factor = 75 * 0.8... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `arc-flash-screen` | Arc-Flash Incident-Energy Screen (Lee 1982) | Lee 1982 / NFPA; Closed-form Lee equation; NFPA 70E-2024 §130.5 governs th... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `asymmetrical-fault-xr` | Asymmetrical and Peak Fault Current from X/R | first-cycle fault asymmetry model (DC...; spec-v496 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `awg-wire-geometry` | AWG Conductor Geometry (Diameter, Circular Mils, mm^2) | AWG geometric definition (ASTM B258); spec-v804 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-c-rate` | Battery C-Rate: Deliverable Power and Discharge Duration | Battery C-rate definition; spec-v238 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-hydrogen-vent` | Battery Room Hydrogen Ventilation (IEEE 1635) | IEEE 1635 battery-room hydrogen venti...; spec-v518 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-inverter-dc-conductor` | Battery-to-Inverter DC Conductor and OCPD (NEC 690.9 / 706) | battery-inverter DC sizing (NEC 690.8...; I_dc = 4000/(48*0.90) = 92.59; 1.25x = 115.74; next std O... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-peak-shaving` | Battery Peak-Shaving Demand-Charge Savings | Demand-charge peak-shaving method; spec-v237 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-runtime` | Battery Runtime | Project (first-principles); 100 Ah * 0.80 * 12 V = 960 Wh; 960 Wh / 120 W = 8 h | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `battery-series-parallel` | Battery Bank Series/Parallel Configuration | Battery bank series/parallel configur...; series = round(48/12.8) = 4; bus = 4*12.8 = 51.2; Ah = 2*... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-tou-arbitrage` | Battery Time-of-Use Arbitrage Value | NREL battery round-trip / arbitrage v...; spec-v236 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `battery-vent-max-current` | Battery Room Max Charge Current from Available Airflow | IEEE 1635 battery-room hydrogen venti...; spec-v666 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bends-between-pulls` | Conduit Bends Between Pull Points (360-Degree Rule) | NEC 2023 (NFPA 70); 90 + 90 + 45 + 45 = 270 deg; 270/90 = 3.0 quarter bends, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bifacial-pv-gain` | Bifacial PV Rear-Side Gain | Bifacial PV rear-side gain (bifaciali...; gain = 0.75 x 150/1000 = 0.1125; effective = 400 x 1.1125... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bonding-jumper` | Bonding Jumper Sizing (Supply-Side and Equipment) | NFPA; spec-v109 section 2.2 pinned example (350 kcmil Cu servic... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `box-fill` | Box Fill | NFPA; 12 AWG = 2.25 in^3 each; 6 conductors = 13.5; clamps +2.2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `branch-circuit-wire-footage` | Branch-Circuit Conductor Footage Takeoff | Branch-circuit footage takeoff identi...; total = 20*(45+15)*3 = 3,600 ft; rolls = ceil(3600/1000) = 4 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `breaker-sizing` | Breaker Sizing | NFPA; NEC §210.20(A), §240.6 standard sizes | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `buck-boost-sizing` | Buck-Boost Transformer Sizing (Single-Phase) | NEC 2023 (NFPA 70) Article 450; manuf...; 208 V to 230 V at 50 A -> boost 22 V; xfmr = 22 x 50 / 10... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `burial-depth-300-5` | Underground Burial Cover-Depth Lookup (NEC Table 300.5) | NEC 2023 (NFPA 70); nonmetallic raceway (PVC), general earth -> 18 in cover | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cable-bend-radius` | Cable Bend Radius Minimum | Southwire; Single-conductor THHN: 8x multiple; 0.5 in OD -> 4 in min... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cable-reel-capacity` | Cable Reel Capacity / Length on Reel | Reel-capacity identity (first-princip...; length = 0.9*PI*(900-144)*18/(48*1) = 801 ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cable-support-jhook` | J-Hook / Bridle-Ring Count and Bundle Weight | J-hook support identity (first-princi...; hooks = ceil(400/4) = 100; load = 50*0.035*4 = 7 lb/hook | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cable-tray-fill` | Cable Tray Fill | NEC Article 392.22(A) (by name); six 1.5 in 4/0 cables in a 12 in ladder tray -> 9 in of 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `camera-lens-fov` | Camera Lens FOV and Pixel Density (DORI) | IEC 62676-4 DORI; spec-v456 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `camera-max-distance-for-ppf` | Camera Max Distance for a Pixel Density (DORI) | IEC 62676-4 DORI (solved for the dist...; spec-v741 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `capacitor-bank-for-resonance-order` | Max PF Capacitor Bank to Keep Resonance Off a Harmonic | parallel-resonance order of a PF capa...; 200 MVA bus, target order 4.7 (below the 5th) -> 9.05 MVA... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `capacitor-discharge-time` | Capacitor Discharge Time and Bleed Resistor (NEC 460.6) | NEC 2023 460.6; spec-v495 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cctv-retention-days` | CCTV Retention Days from Disk Capacity | first-principles NVR/VMS bitrate acco...; 16000 GB disk, 8 cameras at 4 Mbps, 24 h -> 16000 / (8 * ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cctv-storage` | IP Camera / NVR Storage and Bandwidth | first-principles NVR/VMS bitrate acco...; 1 camera at 4 Mbps, 24 h, 30 days -> 4 * 10.8 * 30 = 1296 GB | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ceiling-speaker-coverage` | Ceiling Speaker Coverage and Spacing | commercial-audio design practice; spec-v457 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ceiling-speaker-coverage-angle` | Ceiling Speaker Coverage Angle for a Target Spacing | commercial-audio design practice (sol...; spec-v740 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `coax-rg-loss` | Coaxial Cable Attenuation | Belden / CommScope loss curves (by name); 100 ft RG6 @ 1000 MHz (6 dB/100 ft) -> 6 dB; source 0 dBm... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `commercial-lighting-load` | Commercial General-Lighting and Receptacle Load (NEC 220.12 / 220.44) | NEC 2023 (NFPA 70); 5,000 ft2 x 3 VA = 15,000 VA lighting; 60 x 180 = 10,800 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `conductor-short-circuit-withstand` | Conductor Short-Circuit Thermal Withstand (Onderdonk / ICEA) | ICEA / Onderdonk; spec-v125 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `conduit-90-stub` | Conduit 90 Stub and Back-to-Back | Ugly's Electrical References (by name); 3/4 in EMT, 8 in stub, 6 in deduct -> 2 in mark | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `conduit-expansion-max-run` | PVC Conduit Max Run Before an Expansion Fitting | NFPA; spec-v665 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `conduit-fill` | Conduit Fill | NFPA; Chapter 9 Tables 1, 4, 5; 4 conductors -> 40% fill thresh... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `conduit-jam-ratio` | Conduit Jam Ratio for Three Same-Size Conductors (NEC Ch. 9) | NEC (NFPA 70) Chapter 9; spec-v374 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `conduit-nipple-60-fill` | Conduit Nipple 60% Fill (NEC Ch. 9 Note 4) | Conduit nipple 60% fill (NEC Chapter ...; fill = 20 x 0.0211 / 0.864 = 48.8%; nipple max floor(0.6 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `conduit-offset` | Conduit Offset Bend | Ugly's Electrical References / NECA b...; 6 in offset at 30 deg -> 12 in mark spacing, multiplier 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `conduit-saddle` | Conduit Saddle Bend | Ugly's Electrical References (by name); 3 in obstruction, 45/22.5 preset -> 7.5 in outer-mark spa... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `conduit-thermal-expansion` | PVC Conduit Thermal Expansion (NEC 352.44) | NFPA; spec-v126 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `continuous-load-ocpd` | Continuous-Load OCPD and Conductor at 125% (NEC 210.20 / 215.3) | NEC 2023 210.20(A) / 215.3 / 240.6(A); spec-v280 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `copper-resistance` | Conductor Resistance at Temperature | NFPA; NEC Table 8 gives 1.93 ohm/1000 ft at 75 C uncoated coppe... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dc-shunt-sizing` | DC Ammeter Shunt Sizing | DC current-shunt sizing (Ohm's law); R = 0.05/100 = 0.0005 ohm; I = 100*25/50 = 50 A; P = 100*... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `delta-wye-line-phase` | Wye / Delta Line-to-Phase Voltage and Current | First-principles three-phase theory; spec-v128 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dp-level-hydrostatic` | Hydrostatic DP Level Transmitter (Head to Level) | Hydrostatic DP level transmitter (P =...; level = 4.33/(0.433*1.0) = 10 ft; span = 0.433*1.0*20 = 8... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dryer-demand-220-54` | Household Clothes Dryer Demand Load (NEC 220.54) | NEC 2023 (NFPA 70); each at 5000 W floor; 4 x 5000 = 20000 W at 100% = 83.3 A... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `economic-conductor-sizing` | Economic Conductor Sizing (I2R Payback) | economic conductor sizing (I2R); spec-v473 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `egc-sizing` | Equipment Grounding Conductor Sizing | NFPA; Table 250.122 (60 A OCPD -> 10 AWG copper EGC) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `egc-upsize-proportional` | EGC Proportional Upsize for Increased Conductors (NEC 250.122(B)) | NFPA; spec-v127 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `egress-lighting-check` | Egress Lighting Illuminance Compliance Check (NFPA 101 / IBC) | NFPA 101 / IBC; spec-v367 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ev-charge-cost` | EV Charge Cost at the Meter | EV charge-cost-at-the-meter model (en...; spec-v489 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ev-charge-time` | EV Charge Time (AC Level 2) | AC Level 2 EV charge-time model (SAE ...; spec-v488 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ev-charger-load` | EV Charger Continuous Load and Panel Impact | NFPA; I_circuit = I_charger*1.25; new_load = existing + I_circuit | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ev-charger-throttle` | EV Charger Throttled-Current Schedule (NEC 625.42) | NEC 2023 Article 625 (625.42(A) EVEMS); 100-A EVEMS budget, four 40-A chargers, all active -> 25 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ev-dcfc-time` | EV DC Fast-Charge Time (CC-CV Taper) | DC fast-charge CC-CV taper model (thr...; spec-v492 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ev-load-management-ems` | EV Load-Management (EVEMS) Diversified Load (NEC 625.42) | NEC 2023 625.42(A) / 2026 625.48; Four 40 A chargers, 80 A EVEMS -> 200 A un-managed, 100 A... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ev-range-per-hour` | EV Range Added per Hour of Charging | EV range added per hour of AC charging; range/hr = 7.7*0.88*3.5 = 23.716; hours = 100/23.716 = 4.217 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `existing-load-220-87` | Existing-Facility Load by Peak Demand (NEC 220.87) | NEC 2023 220.87; spec-v519 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `feeder-tap-rule` | Feeder Tap Conductor 10-ft / 25-ft Rule (NEC 240.21(B)) | NEC 2023 (NFPA 70); 400 A feeder, 22 ft tap -> 25-ft rule, min = 400/3 = 133.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fiber-loss-budget` | Fiber Optic Loss Budget | TIA-568 / TIA-526 / IEEE 802.3 (by name); 300 m OM4 @ 850 nm (3.0 dB/km, 2 connectors @ 0.75 dB) ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fiber-max-length` | Fiber Max Length for a Loss Budget | TIA-568 / IEEE 802.3 (by name), inverse; 2.6 dB budget, OM4 3.0 dB/km, 2 connectors @ 0.75 dB -> 3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fire-alarm-nac-voltage-drop` | Fire-Alarm NAC Circuit Voltage Drop (End-of-Line) | fire-alarm NAC voltage drop (NFPA 72); CUSTV = 0.85*24 = 20.4; loop R = 2*250*(2.525/1000) = 1.2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `generator-conductor-445` | Generator Output Conductor at 115% (NEC 445.13) | NEC 2023 445.13(A); spec-v493 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `generator-fuel-runtime` | Generator Fuel Runtime and Backup Duration | generator fuel runtime (first-princip...; spec-v487 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `generator-motor-starting` | Generator Sizing for Motor Starting | NEC 430.110 + manufacturer locked-rot...; 25 hp Code G + 10 hp Code F + 5 hp Code B motors, 15 kW n... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `generator-sizing` | Generator Sizing | Project (first-principles); Refrigerator (700 / 2200) + Lights (400 / 400) + Sump pum... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gfci-afci-reference` | GFCI / AFCI Requirements Reference | NEC 2023 + project bundled GFCI/AFCI ...; Reference compute returns the per-attribute table; runner... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ground-potential-rise` | Ground Potential Rise Screen (IEEE 80) | IEEE Std 80 (ground potential rise); 200-A grid current, 0.5-ohm grid, 200-V tolerable touch -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `grounding-electrode` | Grounding Electrode Resistance (Dwight / IEEE 142) | IEEE / Dwight; R = (rho / (2*pi*L)) * (ln(8L/d) - 1) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grounding-electrode-conductor` | Grounding Electrode Conductor Sizing | NFPA; spec-v109 section 2.1 pinned example (250 kcmil Cu servic... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `harmonic-resonance` | Harmonic Parallel-Resonance Order | parallel-resonance order of a PF capa...; spec-v523 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `insulation-resistance-pi` | Insulation Resistance PI / DAR (Megger Test) | Insulation resistance PI / DAR (IEEE ...; DAR = 1040/800 = 1.30; PI = 4160/1040 = 4.0 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lighting-density` | Lighting Power Density | ASHRAE / IECC; 1000 ft^2 office @ 1.0 W/ft^2 -> 1000 W target lighting load | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lighting-light-loss-factor` | Lighting Light-Loss Factor (Maintained/Initial) | IES Lighting Handbook; spec-v365 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lighting-retrofit-savings` | LED Lighting Retrofit Savings and Payback | Energy-and-demand lighting-savings me...; spec-v231 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lighting-uniformity-ratio` | Lighting Illuminance Uniformity Ratio | IES recommended practice; spec-v366 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `loop-signal-scaling` | 4-20 mA Current-Loop Signal Scaling | 4-20 mA current-loop live-zero scalin...; percent = (12-4)/16*100 = 50; value = 0 + 0.5*(100-0) = 50 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `loop-voltage-budget` | Loop-Powered (2-Wire) 4-20 mA Transmitter Voltage Budget | Loop-powered 2-wire 4-20 mA transmitt...; maxR = (24-10.5)/0.020 = 675; V_at = 24 - 0.020*300 = 18;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lumen-method` | Lumen-Method Luminaire Count | IES lumen method (by name).; spec-v101 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `luminaire-height-for-illuminance` | Luminaire Mounting Height for a Target Illuminance | IES Lighting Handbook (point method, ...; angle 0: h = sqrt(1000 x cos(0)^3 / 10) = 10.0 ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `luminaire-spacing-mh-ratio` | Luminaire Spacing-to-Mounting-Height Ratio | IES luminaire spacing criterion (spac...; max spacing = 1.3 x 8 = 10.4 ft; proposed 9 ft <= 10.4 ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lux-to-footcandle` | Lux / Footcandle Converter and Lumen Method | IES Lighting Handbook (lumen method) ...; convert mode: 100 fc -> 1076.4 lux (100 * 10.764) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lv-cable-pull-footage` | Low-Voltage Cable Footage and Box Count | Low-voltage footage takeoff identity ...; total = 48*(120+15) = 6,480 ft; boxes = ceil(6480/1000) = 7 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lv-dc-drop` | Low-Voltage DC Drop | Project (first-principles); 12 V / 10 AWG Cu / 20 ft / 10 A LED lighting -> ~0.407 V ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `max-circuit-length-for-vd` | Maximum Circuit Length for a Voltage-Drop Target | Max circuit length for a voltage-drop...; VD = 0.03*120 = 3.6; L = 3.6*6530/(2*12.9*20) = 23508/516... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `max-grid-resistance-for-touch` | Max Grounding-Grid Resistance for the GPR Screen (IEEE 80) | IEEE Std 80 (ground potential rise); 200-V tolerable touch, 200-A grid current -> 1.0 ohm max ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `microinverter-branch-count` | Max Microinverters per AC Branch Circuit (NEC 705.60) | max microinverters per AC branch (NEC...; limit = 20*0.80 = 16 A; N = floor(16/1.21) = floor(13.22)... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `min-conductor-for-vd` | Minimum Conductor Size for a Voltage-Drop Target | First-principles I x R voltage drop (...; spec-v109 section 2.3 (20 A, 150 ft one-way, 120 V, 3 per... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-acceleration-time` | Motor Across-the-Line Acceleration Time | Motor across-the-line acceleration ti...; t = WK^2*dN/(308*T_net) = 100*1750/(308*50) = 11.36 s | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-branch-from-nameplate` | Motor Branch-Circuit from Nameplate | NFPA; §430.6(A)(1) reference-FLA tables; §430.22 125% rule; §43... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `motor-branch-protection` | Motor Branch-Circuit Protection and Disconnect (NEC 430.52 / 430.110) | NEC 2023 (NFPA 70); 10 HP 230 V 3ph FLC 28 A x 250% = 70 A (standard); discon... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-capacitor-max` | Max Capacitor kVAR at Motor Terminals (Self-Excitation Limit) | NEMA MG-1 / IEEE 18; 480 V, 8 A no-load: sqrt(3) x 480 x 8 / 1000 = 6.65 kVAR;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-efficiency-upgrade-savings` | Premium Motor Upgrade Energy Savings | motor-efficiency retrofit practice; spec-v471 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-fault-contribution` | Motor Short-Circuit Contribution (First Cycle) | first-cycle motor short-circuit contr...; spec-v521 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-feeder-multiple` | Feeder Sizing for Multiple Motors | NEC Articles 430.24 / 430.62 (by name); FLC 28/16/10 A, largest device 40 A -> conductor 1.25*28+... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `motor-fla` | Motor Full Load Amps | NFPA / NEMA; Tables 430.247-430.250; manufacturer NEMA-aligned bulletins | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `motor-locked-rotor-kva` | Motor Locked-Rotor Current from Code Letter (NEC 430.7(B)) | NEC 2023 Table 430.7(B); spec-v499 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-max-hp-for-starting-current` | Max Motor HP for a Starting-Current Budget (NEC 430.7(B)) | NEC 2023 Table 430.7(B); 300 A budget, code G, 460 V three-phase -> 38.0 hp | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `motor-operating-cost` | Motor Input Power, Annual Energy, and Cost | First-principles motor input power; spec-v123 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-overload-sizing` | Motor Running Overload Protection (NEC 430.32) | NEC 2023 430.32(A)(1) / 430.32(C); spec-v278 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-pole-identification` | Motor Pole Count from Nameplate RPM | First-principles AC-machine theory (i...; spec-v654 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-rms-hp` | Motor RMS Horsepower for a Duty-Cycle Load | Motor duty-cycle RMS horsepower (NEMA...; sqrt((20^2*10 + 0)/(10 + 20/3)) = sqrt(4000/16.667) = 15.49 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-run-hours-for-budget` | Motor Run Hours for an Energy Budget | First-principles motor input power (s...; spec-v735 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `motor-shaft-torque` | Motor Shaft Torque, Horsepower, and Speed | First-principles rotational-power ide...; spec-v122 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-synchronous-speed-slip` | Motor Synchronous Speed, Slip, and Rotor Frequency | First-principles AC-machine theory; spec-v121 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-unbalance-derate` | Motor Derating for Voltage Unbalance (NEMA MG-1) | NEMA MG-1; avg 455, max dev 5 -> 1.10% unbalance -> derate ~0.977 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `motor-vd-starting` | Motor Starting Voltage Dip | Ohm's-law voltage-drop method (first ...; 480 V 3ph, LRC 180 A, 250 ft, 250 kcmil Cu -> V_drop 4.02... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `multi-load-vd` | Branch Voltage Drop With Multiple Loads | Project (first-principles); 12 AWG copper feeder at 120 V with 5 A @ 50 ft and 10 A @... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `multi-motor-feeder` | Feeder for a Group of Motors (NEC 430.24 / 430.62) | NFPA; spec-v124 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `neutral-current-3ph` | Three-Phase Neutral Current | Phasor sum of three 120-degree-displa...; Ia=100, Ib=80, Ic=60 -> I_N = sqrt(1200) = 34.641 A | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `neutral-demand-220-61` | Feeder/Service Neutral Demand Load (NEC 220.61) | NEC 2023 (NFPA 70); 200 A at 100% + 50 A at 70% = 200 + 35 = 235 A | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `neutral-grounding-resistor` | Neutral Grounding Resistor Sizing (IEEE 142) | neutral grounding resistor sizing (IE...; spec-v525 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `noncoincident-load` | Noncoincident Loads: Larger of Heating vs A/C (NEC 220.60) | NEC 2023 (NFPA 70); heat 9,000 VA vs A/C 6,000 VA, not simultaneous -> count ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `off-grid-battery` | Off-Grid Battery Bank Sizing | IEEE; nameplate_Wh = daily_Wh * days / (DoD * efficiency); Ah =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ohms-law` | Ohm's Law | Project (first-principles); Ohm's law definition | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `open-delta-transformer` | Open-Delta (V-V) Transformer Bank Capacity | Open-delta (V-V) transformer bank cap...; available = sqrt(3) x 25 = 43.30; per unit = 40/sqrt(3) =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `panel-rebalance` | Panel Loading and Phase Rebalance | Project (first-principles); Six-circuit panel skewed onto A (65 A) vs B (22 A) vs C (... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `parallel-conductor-derate` | Parallel Conductor Ampacity | NEC (NFPA 70) Article 310 parallel-co...; 3/0 Cu at 200 A, N=3, no derate -> 600 A total | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pf-correction` | Power Factor Correction Capacitor | Project (first-principles); 100 kW / pf 0.75 -> 0.95 / 480 V three-phase -> 55.32 kVA... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `phase-balance` | Phase Balance Across Panels | Project (first-principles); Four circuits {A:1500, A:800, B:600, C:700} -> 141.67% in... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pid-tuning-ziegler-nichols` | PID Loop Tuning (Ziegler-Nichols Closed-Loop) | Ziegler-Nichols closed-loop PID tunin...; Kp = 0.6*4 = 2.4; Ti = 0.5*2 = 1.0; Td = 0.125*2 = 0.25; ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `poe-budget` | PoE Budget and Run Distance | IEEE; Type 2 PSE = 30 W, PD min 25.5 W; 200 ft Cat6 @ 25 C -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `point-illuminance` | Point-Method Illuminance (Inverse-Square + Cosine) | IES Lighting Handbook (point method); angle 0: E = 1000 x cos(0) / 10^2 = 10.0 fc (107.6 lux) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `point-method-required-candela` | Point-Method Required Candela for a Target | IES Lighting Handbook (point method),...; 10 fc target, 10 ft up, nadir -> 1,000 cd (round-trips po... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-bonding-680-26` | Swimming-Pool Equipotential Bonding Checklist (NEC 680.26) | NEC 2023 (NFPA 70); permanent pool/spa -> full 8-component 680.26(B)/(C) bond... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `power-factor-billing-savings` | Power-Factor Correction Demand-Billing Savings | Power-triangle demand-billing method; spec-v232 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `power-triangle` | Power Triangle Solver (kW / kVA / kVAR / PF) | IEEE; kVA^2 = kW^2 + kVAR^2; PF = kW/kVA; theta = arccos(PF) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pull-box-sizing` | NEC Pull and Junction Box Sizing | NEC (NFPA 70) 314.28(A)(1) and (A)(2)...; spec-v101 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pulling-tension` | Conductor Pulling Tension | NECA / cable-pulling engineering prac...; 1.5 lb/ft cable / 100 ft straight / one 90-deg bend at 2 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pulse-flowmeter-k-factor` | Pulse Flowmeter K-Factor (Frequency to Flow) | Pulse flowmeter K-factor (turbine/pad...; rate = 100 Hz x 60 / 200 pulses/gal = 30 gpm; x60 = 1800 gph | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-ac-output-circuit` | Inverter AC Output Circuit Conductor and OCPD (NEC 690.8(B)) | inverter AC output sizing (NEC 690.8(B)); I = 9600/240 = 40; 1.25x = 50; next std OCPD >= 50 = 50 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-array-sizing` | PV Array Size from a Target Annual Energy | NREL PVWatts energy model (inverted f...; spec-v647 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-ballast-weight` | PV Flat-Roof Ballast Weight and Roof PSF Screen | PV ballast load-screen identity (firs...; total = 30*(50+40)+150 = 2850; added = 2850/630 = 4.52 <=... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-cell-temperature-power` | PV Cell Temperature and Temperature-Derated Power | PV design practice / NREL; spec-v350 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-circuit-ampacity` | PV Circuit Maximum Current and Ampacity (NEC 690.8, the 156% Rule) | NEC 2023 (NFPA 70); 2 strings x Isc 10 A x 1.25 = 25 A; x 1.25 = 31.25 A (10 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-energy-yield` | PV Annual Energy, Specific Yield, and Capacity Factor | NREL PVWatts energy model; spec-v221 section 2.1 pinned example (average US site) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-interconnection-busbar` | PV Interconnection 120% Busbar Rule | NFPA; 705.12(B)(3)(2): sum = main + PV <= 1.20 * busbar | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pv-inverter-ratio` | PV Inverter Loading Ratio (DC:AC) and Clipping Onset | Inverter loading ratio + NREL guidance; spec-v223 section 2.1 pinned example (in-band) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-max-ambient-for-power` | PV Max Ambient Temperature for a Target Power | PV design practice / NREL (solved for...; spec-v743 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pv-performance-ratio` | PV Performance Ratio from Stacked Losses | NREL PVWatts; spec-v351 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-rail-clamp-takeoff` | PV Racking Rail, Clamp, and Splice Takeoff | PV racking-takeoff identity (first-pr...; run=12*3.42=41.04; rail=2*2*41.04=164.16; mid=2*2*11=44; ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-row-shade-angle` | PV Shade-Free Sun Angle from Row Pitch | NREL / Sandia row-spacing geometry; spec-v702 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pv-row-spacing` | PV Inter-Row Spacing and Ground-Coverage Ratio | NREL / Sandia row-spacing geometry; spec-v222 section 2.1 pinned example (30-degree ground mo... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-string-fusing` | PV Source-Circuit Fuse Sizing (NEC 690.9) | NEC 690.9; spec-v352 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pv-string-sizing` | Solar PV String Sizing | NFPA; Module 40 V Voc / 33 V Vmp / 0.3%/C at -10 C record low a... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `raceway-expansion-fitting` | PVC Raceway Expansion Fitting | NEC Article 352.44 / Table 352.44 (by...; 100 ft PVC, dT 100 F -> 3.38e-5 * 1200 in * 100 = 4.056 i... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `range-demand-220-55` | Household Range Demand Load (NEC Table 220.55 Col. C) | NEC 2023 (NFPA 70); 1 range Column C = 8 kW (not 12); demand 8 kW = 33.3 A at... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `reduced-voltage-starter` | Reduced-Voltage Starter Current and Torque | reduced-voltage-starter current and t...; spec-v522 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rlc-reactance-resonance` | Series R-L-C Reactance, Impedance, and Resonant Frequency | Series R-L-C reactance / impedance / ...; XL=2pi*60*0.05=18.85; XC=1/(2pi*60*50e-6)=53.05; Z=sqrt(1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rolling-sphere-protection` | Lightning Rolling-Sphere Zone of Protection | NFPA 780 (rolling-sphere method); 30 ft mast, 150 ft sphere -> sqrt(9000 - 900) = sqrt(8100... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rooftop-temp-adder` | Rooftop Conduit Sunlight Ambient Adder (NEC 310.15(B)(2)) | NEC 2023 (NFPA 70); 95 F on the roof (<7/8 in) + 60 F adder = 155 F (~68 C) -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `room-cavity-ratio` | Room Cavity Ratio (RCR) for CU Lookup | IES zonal-cavity room cavity ratio; RCR = 5*8*(40+30)/(40*30) = 5*8*70/1200 = 2800/1200 = 2.333 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rotary-phase-converter-sizing` | Rotary Phase Converter Idler Sizing | rotary phase converter idler sizing (...; start = 2*10 = 20; idler = max(20, 15) = 20 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rtd-resistance-to-temp` | RTD (Pt100 / Pt1000) Resistance to Temperature | IEC 60751 platinum RTD (Callendar-Van...; T = (-A + sqrt(A^2 - 4B(1 - 119.397/100)))/(2B), A=3.9083... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sccr-combination` | Industrial Control Panel SCCR (UL 508A) | UL 508A Supplement SB / NEC 409.110; 65/5/5/10 kA components, 22 kA fault -> panel SCCR 5 kA (... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `service-conductor-sizing` | Dwelling Service/Feeder Conductor at 83% (NEC 310.12) | NEC 2023 310.12 / Table 310.16 (75 degC); spec-v279 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `service-load` | Service Load Calculation (Residential) | NFPA; 2000 ft^2 dwelling with 2 small-appliance + 1 laundry + 6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `service-load-optional` | Service Load Calculation (NEC 220.82 Optional Method) | NFPA; general demand = 10kVA + 40%*(general-10kVA); + larger HV... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `service-load-standard` | Service Entrance Demand Load (Standard Method) | NFPA; 2500 ft^2 dwelling + 2 small-appliance + 1 laundry + 5 fi... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shadow-length` | Sun Shadow Length | Sun shadow-length geometry (first-pri...; 10 ft object under a 30 deg sun -> 10 / tan(30) = 17.32 f... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shock-approach-boundary` | Shock Approach Boundaries (NFPA 70E Table 130.4) | NFPA 70E-2024; 151-750 V: limited fixed 3 ft 6 in, limited movable 10 ft... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `short-circuit-pp` | Short-Circuit Current at Panel (Point-to-Point) | NEMA / Bussmann (Cooper); 1500 kVA / 5.75 %Z / 480 V three-phase utility -> 31,379 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `soil-resistivity-wenner` | Wenner 4-Pin Soil Resistivity | Wenner 4-pin soil resistivity (IEEE 8...; rho = 2*pi*(10*0.3048)*5 = 2*pi*3.048*5 = 95.76 ohm-m; x1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `solar-egc-690-45` | PV Equipment Grounding Conductor (NEC 690.45) | NFPA; 20 A OCPD -> 12 AWG copper EGC (above the 14 AWG floor) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `speaker-70v-line` | 70-Volt Distributed Speaker Line | constant-voltage distributed audio pr...; sixteen 8 W taps (128 W) on a 200 W amp at 20% headroom -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `standby-battery-runtime` | Standby Battery Runtime from Capacity | NFPA 72 §10.6 (by name), inverse; 14.6 Ah, 0.5 A standby, 2 A / 5 min alarm, derate 1.2 -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `standby-battery-sizing` | Fire-Alarm / Security Standby Battery | NFPA 72 §10.6 (by name); 0.5 A x 24 h + 2.0 A x 5 min, derate 1.2 -> (12 + 0.1667)... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `step-touch-voltage` | Tolerable Step and Touch Voltage (IEEE 80) | IEEE Std 80 (tolerable step and touch...; 0.5 s, 3000 ohm-m rock over 100, 0.1 m, 50 kg -> Cs 0.70,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `structured-cabling-channel` | Structured Cabling Channel Length (TIA-568) | ANSI/TIA-568; spec-v458 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `support-spacing` | Raceway / Cable Support-Spacing Lookup (NEC Chapter 3) | NEC 2023 (NFPA 70); EMT secure within 36 in of each box; support every 10 ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tdd-ieee-519` | Total Demand Distortion Limit Check (IEEE 519-2022) | IEEE 519-2022 Table 1 current-distort...; spec-v524 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `termination-temp-ampacity` | Termination Temperature Ampacity Limit (NEC 110.14(C)) | NEC 2023 110.14(C) with Table 310.16; 4/0 THHN: 90C 260, 75C 230, 60C 195; 75C term, over 100 A... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `thermistor-beta-temp` | NTC Thermistor Resistance to Temperature (Beta Equation) | NTC thermistor beta (B-parameter) equ...; 1/T = 1/298.15 + (1/3950) ln(20000/10000) -> T = 283.33 K... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `three-phase` | Three-Phase Power | Project (first-principles); V_LL=480 V / I_L=100 A / pf=0.9 -> kVA=83.14 / kW=74.82 /... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `transformer-conductor-protection` | Transformer Conductor and Overcurrent Protection | NEC Table 450.3(B) and 240.21(C) (by ...; 45 kVA 3-phase 480->208 V -> primary FLA 54.13 A, seconda... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `transformer-inrush-point` | Transformer Inrush Coordination Point | transformer energization-inrush coord...; spec-v520 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `transformer-k-factor` | Transformer K-Factor From the Harmonic Spectrum (UL 1561) | UL 1561 / IEEE C57.110; K = sum(Ih^2 h^2)/sum(Ih^2) = 5.455/1.183 = 4.61 -> K-9 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `transformer-kva-sizing` | Transformer kVA Sizing and FLA | NFPA / ANSI/IEEE C57; Loads {25 kVA, 18 kVA, 7500 W @ 0.85 pf = 8.82 kVA, 15 kV... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `transformer-loading-efficiency` | Transformer Loading Efficiency and Losses | transformer loss model; spec-v472 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `transformer-sizing` | Transformer Sizing | Project (first-principles); 90 kW @ 0.9 pf -> 100 kVA required; next ANSI standard st... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `transformer-turns-ratio` | Transformer Turns / Voltage / Current / Impedance Ratio | ideal transformer circuit relations; spec-v806 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `transformer-voltage-regulation` | Transformer Voltage Regulation from %R and %X | transformer voltage-regulation approx...; spec-v494 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vfd-energy-savings` | VFD Retrofit Energy and Cost Savings (Affinity Cube Law) | US DOE motor/pump-system energy method; spec-v230 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vfd-reflected-wave` | VFD Reflected-Wave Cable Length Limit | VFD reflected-wave cable-length limit...; 480 V, 0.1 us rise, 50% velocity, 100 ft -> L_crit 24.6 f... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `voltage-drop` | Voltage Drop | Project (first-principles); Standard single-phase voltage-drop derivation; K=12.9 ohm... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `voltage-drop-reactance` | Voltage Drop With Reactance | NFPA; Vd = sqrt(3)*I*(R*cos(theta)+X*sin(theta))*L/1000 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `voltage-imbalance` | Voltage Imbalance | NEMA; V_a=480 / V_b=475 / V_c=470 -> avg 475 / max deviation 5 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `welder-arc-circuit-conductor` | Arc-Welder Branch-Circuit Conductor and OCPD (NEC 630.11) | arc-welder circuit sizing (NEC 630.11...; mult = sqrt(0.50) = 0.7071; I_eff = 40*0.7071 = 28.28; OC... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `welder-resistance-circuit-conductor` | Resistance / Spot-Welder Branch-Circuit Conductor and OCPD (NEC 630.31) | resistance-welder circuit sizing (NEC...; mult = sqrt(0.50) = 0.7071; conductor = 100*0.7071 = 70.7... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wire-ampacity` | Wire Ampacity | NFPA; 12 AWG copper THWN/THHN at 30 C ambient, single conductor... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wire-pulling-lubricant` | Cable-Pulling Lubricant Quantity | Film-coating lubricant estimate (rule...; gallons = 0.0015*400*9*1.0 = 5.4 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wireway-fill` | Wireway / Auxiliary Gutter 20% Fill (NEC 376.22) | NEC 2023 (NFPA 70); 4x4 in interior 16 in^2, allowed 0.20 x 16 = 3.2 in^2; 2.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `working-space-110-26` | Working-Space Clearance Lookup (NEC 110.26) | NEC 2023 (NFPA 70); 480Y/277 V (151-600 V) Condition 2 -> 3.5 ft depth; width... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group B Plumbing (117 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `backflow` | Backflow Reference | IPC 2024 + project bundled backflow-p...; Reference compute returns the per-attribute table; runner... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `backflow-loss` | Backflow Preventer Pressure Loss | Watts Regulator; 1 in RP at 30 gpm -> ~8.5 psi typical loss across the ass... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `backflow-sizing` | Backflow Assembly Sizing Screen | IPC / AWWA / EPA; high hazard -> RP required (override from DC); RP 2 in at... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bernoulli-head` | Bernoulli Total Head (Pressure + Velocity + Elevation) | fluid mechanics; spec-v373 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `boiler-horsepower` | Boiler Horsepower, Steam Output, and EDR | ABMA / ASME boiler-horsepower definition; BHP = 500000/33475 = 14.937; steam = 14.937 x 34.5 = 515.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `branch-reinforcement` | Branch Connection Reinforcement (Area Replacement, ASME B31.1) | ASME B31.1 para 104.3.1 area replacem...; spec-v204 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `branch-saddle-cutback` | Branch Saddle Cutback Template (Pipe-on-Pipe) | Cylinder-intersection geometry; Pipe ...; spec-v201 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `channel-froude-number` | Open-Channel Froude Number, Regime, and Critical Depth | Chow, Open-Channel Hydraulics; spec-v304 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `channel-normal-depth` | Rectangular Channel Normal Depth (Manning) | Manning normal depth (Chow, Open-Chan...; spec-v641 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `condensate-return-sizing` | Condensate Return Line Size From the Flash Steam | Continuity; ASHRAE / Spirax Sarco ret...; spec-v200 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cross-connection-air-gap` | Cross-Connection Air Gap (IPC 608.15.1) | IPC 608.15.1 / ASME A112.1.2; spec-v450 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drainage-invert` | Drainage Invert Elevation, Drop, and Cover | Project (first-principles); slope = 0.25/12 = 0.020833 ft/ft; total_fall = 0.020833 x... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drywell-infiltration` | Dry Well / Infiltration Trench Sizing | Dry well / infiltration trench (void-...; excavation = 200/0.35 = 571.4; footprint = 571.4/4 = 142.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `expansion-guide-spacing` | Expansion Joint / Loop Guide Spacing (EJMA 4D/14D) | EJMA 4-diameter / 14-diameter guide-p...; spec-v205 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `expansion-tank` | Hydronic Expansion Tank | ASHRAE Handbook (HVAC Systems and Equ...; 100 gal system, 60 F -> 200 F, 12 psig fill, 30 psig reli... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `flange-rating` | Flange Pressure-Temperature Rating (ASME B16.5) | ASME B16.5 pressure-temperature ratin...; spec-v203 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `flash-steam-pct` | Flash Steam Percentage Across a Pressure Drop | Steam thermodynamics; ASME steam tabl...; spec-v157 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `flow-continuity` | Flow Continuity Velocity at a Size Change | fluid mechanics; spec-v372 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `friction-loss` | Friction Loss | Project (first-principles); 10 gpm through 100 ft of 1 in SCH40 PVC -> ~5.49 ft head ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gas-altitude-derate` | High-Altitude Appliance Input Derate | NFPA 54 (National Fuel Gas Code) / IF...; spec-v111 section 2.1 pinned example (100k at 6,000 ft ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gas-appliance-demand` | Gas Appliance Connected Load (CFH) | IFGC 2021 Section 402 / NFPA 54; furnace 100,000 + WH 40,000 + range 65,000 + dryer 35,000... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gas-fuel-conversion` | Natural-Gas / Propane Conversion (Input and Orifice) | First-principles orifice flow Q ~ are...; spec-v111 section 2.2 pinned example (100k NG->LP -> 97.0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `gas-leak-hole-diameter` | Gas Leak Equivalent Hole Diameter | Project (first-principles, solved for...; 3.15 cfh natural-gas leak at 0.25 psi -> ~0.050 in equiva... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gas-leak-rate` | Gas Leak Rate (Orifice) | Project (first-principles); 0.05 in orifice / 0.25 psi upstream natural gas -> ~3.15 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gas-pipe-max-flow` | Fuel-Gas Pipe Capacity (Spitzglass) | Spitzglass low-pressure gas-flow equa...; 1.049-in ID, 100 ft, SG 0.60, 0.5 in w.c. allowable drop ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gas-pipe-pressure-drop` | Low-Pressure Fuel-Gas Pressure Drop (Spitzglass) | Spitzglass low-pressure gas-flow equa...; 1000 CFH, 1.049-in ID, 100 ft, SG 0.60 -> ~16.73 in w.c.,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gas-pipe-sizing` | Gas Pipe Sizing | NFPA; 100,000 BTU natural gas at 50 ft / 0.5 in w.c. drop -> 97... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `glycol-mix` | Glycol Freeze Protection Mix | Dow; 50 gal system / -10 F target burst protection / propylene... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grease-interceptor-flow-capacity` | Grease Interceptor Flow Capacity | PDI; 1000 gal interceptor, 30 min retention, 1.25 loading -> 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grease-trap` | Grease Trap Sizing | PDI; 50 gpm peak / 30 min retention / 1.25 loading factor -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hanger-rod-sizing` | Minimum Hanger Rod Diameter from Load (MSS SP-58) | MSS SP-58 carbon-steel threaded-rod l...; spec-v162 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `heat-trace-sizing` | Freeze-Protection Heat-Trace Cable and Circuit | Heat-trace sizing identity (first-pri...; cable = 150*1.10 + 3 = 168 ft; watts = 5*168 = 840; amps ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydraulic-jump` | Hydraulic Jump: Sequent Depth and Energy Loss | Belanger sequent depth (Chow, Open-Ch...; spec-v632 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydronic-fill-pressure` | Hydronic Fill Pressure (Static Height) | hydronic practice (static head); spec-v452 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydronic-system-volume` | Hydronic System Water and Glycol Volume | Hydronic system-volume identity (firs...; pipe=500*0.023=11.5; system=11.5+8+5=24.5; glycol=24.5*0.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydrostatic-test` | Hydrostatic Test Pressure and Hold | IPC / Plumbing engineering practice; 100 psi working / 200 gal volume / water -> test_pressure... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `leach-field-aggregate` | Leach-Field / Trench Drainrock Volume | Leach-field drainrock identity (first...; stone=3*60*2*1=360; cy=360/27*1.10=14.67; tons=14.67*1.4=... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `main-disinfection-chlorine` | Water Main Chlorination Dose | AWWA C651 Disinfecting Water Mains (b...; spec-v103 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manning-pipe-capacity` | Manning Pipe Capacity (Full-Bore Gravity Flow) | Manning full-bore capacity V = (1.486...; spec-v640 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manning-slope` | Manning's Equation Drainage Slope | Project (first-principles); 4 in PVC sewer at 50 gpm target -> slope ~0.0788 in/ft (s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `medgas-demand` | Medical Gas System Demand and Diversity (NFPA 99) | NFPA 99 Health Care Facilities Code d...; spec-v206 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mixed-water-temp` | Mixing / Tempering Valve Blend Temperature | First-principles mixing energy balanc...; 140 F hot + 60 F cold at equal flow -> 100 F, 50% hot | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `orifice-diameter-for-flow` | Orifice Diameter for a Target Flow | Inverse orifice sizing A = Q / (Cd sq...; spec-v639 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `orifice-flow` | Orifice Discharge Flow | Orifice discharge Q = Cd A sqrt(2 g h); spec-v303 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `overflow-scupper-sizing` | Overflow Scupper Sizing (Weir Flow) | Francis weir / IPC 1108; spec-v426 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pex-homerun-takeoff` | PEX Home-Run Manifold Port and Tubing Takeoff | PEX home-run takeoff identity (first-...; total ports = 8 + 6 = 14; tubing = ceil(14*35*1.10) = 539 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pipe-cold-spring` | Pipe Cold Spring (Cut-Short) | ASME B31.1 §119 / B31.9 (by name); 100 ft carbon steel (alpha 6.5e-6), 50 F to 250 F (dT 200... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-expansion` | Pipe Thermal Expansion | ASHRAE / ASTM; Copper alpha = 9.4e-6 in/in/F; 100 ft of copper x 100 F d... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-expansion-loop` | Pipe Thermal Expansion and Loop Sizing | Project (first-principles); Carbon steel A53 4.5 in OD / 200 ft run / 100 F dT -> 1.5... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-filled-support-load` | Filled Pipe Support Load per Hanger | First-principles cross-section x dens...; spec-v161 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pipe-insulation-takeoff` | Pipe Insulation and Jacket Material Takeoff | Mechanical-insulation takeoff identit...; cut = 250*1.05 + 12 = 274.5 ft; sections = ceil(274.5/3) ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pipe-pressure-rating` | Pipe Pressure Rating and Required Wall (ASME B31.1) | ASME B31.1 Power Piping (by name); spec-v160 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pipe-purge-volume` | Pipe Inert Purge Volume and Time | Inert-purge identity (first-principles); pipe = (PI/4)*(2.067/12)^2*100 = 2.33; purge = 2.33*5 = 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pipe-sizing` | Pipe Sizing | IPC / UPC fixture-unit tables (projec...; 2x lavatory + 2x WC flush-tank + 1x shower + 1x kitchen s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-support-spacing` | Pipe Hanger Spacing and Count | IPC 2021 Table 308.5 / MSS SP-58; 1 in type-L copper, horizontal, 24 ft run -> 6 ft max spa... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-velocity` | Pipe Velocity and Erosion Check | Continuity; Copper Development Associ...; 10 gpm in 3/4 in Type-L copper (ID 0.785 in) -> 6.63 ft/s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-volume` | Pipe Volume | Project (first-principles); 1 in Schedule 40 steel pipe ID 1.049 in over 100 ft -> 4.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pressure-conversion` | Pressure Conversion | NIST; 1 atm -> 14.6959 psi exact-to-rounding by 101325 / 6894.757 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pressure-tank-drawdown` | Well Pressure-Tank Drawdown and Sizing | Boyle's law on the diaphragm air char...; 44 gal at 40/60 psi (38 psi precharge) -> 11.35 gal drawd... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pump-operating-point` | Pump Operating Point | Project (engineering composite); Static head 30 ft / friction k = 0.003 / small centrifuga... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pump-sizing` | Pump Sizing | Project (first-principles); Standard centrifugal-pump identity (US customary, gpm and... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `radiant-loop-sizing` | Hydronic Radiant Floor Loop Sizing | First-principles; ASHRAE HVAC Systems...; spec-v199 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `radiator-edr-output` | Radiator EDR to Heat Output | Radiator EDR to heat output (Hydronic...; Q = 320 x 240 = 76,800; gross = 76,800 x 1.33 = 102,144 B... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `recirc-loop-sizing` | Hot Water Recirc Loop Sizing (ASPE) | ASPE; U=0.17 Btu/hr/ft/F at 3/4-in / 1-in insulation; dT_pipe =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `recirc-pump-head` | Hot Water Recirc Pump Head | Project (first-principles); 100 ft of 0.75 in copper / 8 fittings (eq. ~16 ft) / 4 gp... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `reducer-offset` | Reducer Centerline Offset and Invert Continuity | Geometry; ASME B16.9 lay lengths (by ...; spec-v202 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `roof-drain-sizing` | Roof Drain and Leader Sizing | IPC 2021 Section 1106 (Tables 1106.2 ...; 5000 ft^2 roof, 4 in/hr design rainfall -> 208 GPM, 6 in ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sanitary-dfu` | Sanitary Drain DFU Sizing | ICC; DFU = 3 + 1 + 2 = 6; 2 in horizontal branch (max 6 DFU) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `scupper-width-for-flow` | Scupper Width for a Required Overflow Flow | Francis weir / IPC 1108 (solved for t...; spec-v731 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `septic-dose-tank` | Septic Pump / Dose Tank Volume | USEPA Onsite Wastewater Treatment Sys...; 600 gpd, 4 doses, 5 gal drainback -> 150 net, 155 per cyc... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `septic-drainfield` | Septic Drainfield Trench Length | Project (first-principles); 600 gpd design flow / 0.6 gpd/ft^2 application rate -> 10... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `septic-drainfield-capacity` | Septic Drainfield Capacity (Flow / Bedrooms) | Project (first-principles) / USEPA OWTS; 300 ft of 3 ft trench at 0.6 gpd/ft^2 -> 900 ft^2 -> 540 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `septic-lpp-orifice` | Septic LPP Orifice Flow and Squirt Height | Orifice-discharge equation / universi...; 1/4 in orifice, 5 ft squirt, Cd 0.6, 10 orifices x 4 late... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `septic-lpp-squirt-head` | Septic LPP Squirt Head for a Target Orifice Flow | Orifice-discharge equation / universi...; spec-v757 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `septic-pumpout-interval` | Septic Tank Pump-Out Interval | USEPA Onsite Wastewater Treatment Sys...; 1,000 gal tank, 4 people, 30 gal/pp/yr, 1/3 fill -> 330 g... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `septic-tank` | Septic Tank Sizing | IPC / state primacy agency; 4 bedrooms -> 4 x 150 = 600 gpd, 2 x retention = 1200 gal... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `septic-tank-for-interval` | Septic Tank Size for a Target Pump-Out Interval | USEPA Onsite Wastewater Treatment Sys...; 5 years, 4 people, 30 gal/pp/yr, 1/3 fill -> 600 gal accu... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sewage-force-main-velocity` | Sewage Force-Main Scour Velocity | Ten States Standards; spec-v427 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `slope` | Drainage Slope | IPC; Rise 1, run 4 (same units) -> 3 in/ft / 25% / 14.04 deg /... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `softener-sizing` | Water Softener Sizing | NSF/ANSI 44 / Water Quality Association; 4 people at 75 gal/day, 20 gpg, 2 ppm iron, 32,000-grain ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `solar-thermal-collector` | Solar Thermal Collector Output | Solar thermal collector (ASHRAE 93 / ...; eta = 0.70 - 0.85 x 50/300 = 0.5583; per sf = 300 x 0.558... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `solder-joint-quantity` | Solder and Flux per Sweat-Joint Takeoff | Solder-weight identity (first-princip...; w/in = (PI/4)*0.125^2*0.30 = 0.003682; solder = 200*0.75*... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `specific-energy` | Open-Channel Specific Energy and Alternate Depth | Specific energy E = y + q^2/(2 g y^2)...; spec-v637 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `static-pressure-piping` | Static Pressure Loss in Piping | Project (first-principles); 30 ft column of water -> 30 * 62.4 / 144 = 13.00 psi elev... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `steam-boiler-blowdown` | Steam Boiler Surface Blowdown (Cycles of Concentration) | Steam boiler surface blowdown (TDS ma...; CoC = 3500/100 = 35; blowdown = 10000*100/(3500-100) = 29... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steam-pipe-capacity` | Steam Main Capacity from Size and Velocity | Continuity; ASHRAE Fundamentals / Sys...; spec-v643 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steam-pipe-velocity` | Steam Main Size from Flow and Velocity | Continuity; ASHRAE Fundamentals / Sys...; spec-v158 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steam-prv-area-for-capacity` | Steam PRV Orifice Area for a Required Capacity (Napier) | Napier's formula / ASME/API 520 (solv...; spec-v759 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `steam-prv-napier` | Steam Orifice / PRV Capacity (Napier) | Napier's formula / ASME/API 520; 0.5 in2 orifice, 100 psia upstream, 30 psia downstream, C... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steam-trap-sizing` | Steam Trap Condensate Load and Required Capacity | Steam thermodynamics; safety-factor p...; spec-v159 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stormwater-detention-volume` | Stormwater Detention Volume (Modified Rational) | Modified Rational method; spec-v428 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stormwater-max-drainage-area` | Max Tributary Drainage Area for an Allowable Flow | USEPA / NRCS; 2 cfs allowable, asphalt (C=0.95), 2 in/hr -> 1.053 acres... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `stormwater-rational` | Stormwater Rational Method | USEPA / NRCS; 5000 ft^2 asphalt (C=0.95), 2 in/hr -> 0.218 cfs / 97.9 g... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sump-basin-sizing` | Sump / Ejector Basin Drawdown and Cycle Check | IPC 2021 Section 712 / Hydraulic Inst...; 24 in basin, 12 in float spread, 10 GPM inflow, 30 GPM pu... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `supply-pressure-budget` | Water-Supply Pressure Budget | IPC 2021 Section 604 / ASPE PEDH Vol. 2; street 60, 30 ft up, meter 8, friction 12, min 8 -> 12.99... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tank-drain-time` | Tank Drain Time (Falling-Head Orifice) | Falling-head (Torricelli) orifice dra...; spec-v630 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tankless-gpm` | Tankless Water Heater GPM | Project (first-principles); 199 kBTU input, climate 5A (Chicago) inlet 50 F, target 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thermal-expansion-volume` | Water Thermal-Expansion Volume | NIST / standard steam tables (water d...; 50 gal, 50->140 F -> ~0.839 gal expansion | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thrust-block-max-pressure` | Max Line Pressure for a Thrust Block (AWWA M41) | AWWA M41 (solved for the pressure); spec-v745 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thrust-block-sizing` | Thrust Block Bearing Area at a Pipe Bend (AWWA M41) | AWWA M41; spec-v388 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `time-of-concentration` | Time of Concentration (Kirpich) | Kirpich (1940) / USDA TR-55; spec-v302 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tpr-discharge` | Water-Heater T&P Relief and Discharge | IPC 2021 Section 504 / ANSI Z21.22; heater input 50,000, T&P valve 150,000, 3/4 in outlet -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `trap-arm` | Trap Arm Length | IPC; Table 906.1: 2 in trap arm at 1/4 in/ft slope -> 8 ft max... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `trap-primer` | Trap Primer Sizing | ICC / manufacturer; primers = ceil(6/4) = 2; water = 6*(8/128)*365 = 136.875 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `trap-seal-loss` | Trap-Seal Protection Check | IPC/UPC §1002 (trap-to-vent); 6 ft used of 8 ft permitted -> pass, 75% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `velocity-head` | Velocity Head and Dynamic Pressure | fluid mechanics; spec-v371 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vent-sizing-stack` | DWV Vent-Stack DFU / Length Check | IPC Chapter 9 / UPC Chapter 9 vent si...; 2-in vent, 24 DFU/120 ft permitted, 18 DFU over 90 ft -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `water-hammer-arrestor` | Water Hammer Arrestor Sizing | PDI; Sizing table: WSFU 12-32 -> AA-B; 25 ft of 1 in branch is... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `water-hammer-surge` | Water Hammer Pressure Surge (Joukowsky) | Project (first-principles); Copper Type L 1 in / water at 60 F / 8 fps velocity / 0.0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `water-heater-input` | Water Heater Input for a Target Recovery | DOE / AHRI (inverse); round-trips the water-heater-recovery pinned example: 400... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `water-heater-recovery` | Water Heater Recovery Rate | DOE / AHRI; gph = 40000*0.80/(8.33*70) = 54.88; FHR = 54.88 + 0.70*40... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `water-heater-storage-sizing` | Storage Water-Heater Sizing (First-Hour Rating) | DOE/AHRI first-hour-rating method (by...; spec-v112 section 2.1 pinned example (50 gal / 40k / 80% ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `water-meter-sizing` | Water Meter Sizing from Peak Demand | AWWA M22 / C700-series; 30 gpm peak vs 50 gpm normal -> 60% used, 20 gpm headroom | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `well-shock-chlorination` | Well Shock-Chlorination Dose | AWWA A100 / state private-well shock-...; spec-v103 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wh-expansion-tank` | Water Heater Thermal Expansion Tank | ASPE / ASME; factor = (62.41-61.71)/61.71 = 0.01134; V_exp = 40*0.0113... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wobbe-index` | Wobbe Index (Fuel-Gas Interchangeability) | Wobbe index (fuel-gas interchangeabil...; WI = 1000 / sqrt(0.60) = 1000 / 0.77460 = 1290.99 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wsfu-demand` | Probable Peak Demand (WSFU to GPM) | Hunter's curve (NBS BMS65) / IPC 2021...; 120 WSFU flush-valve between (100,55) and (150,66) -> 59.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group C HVAC (137 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `adpi-diffuser-selection` | ADPI Room Air Diffusion Selection (ASHRAE) | ASHRAE Handbook -- Fundamentals, Spac...; spec-v482 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `affinity-laws` | Fan Affinity Laws | ASHRAE; ratio = 1500/1750 = 0.857; CFM = 5000 * r = 4285.7; SP = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `air-changes-hour` | Air Changes per Hour (ACH) | ASHRAE; ACH = 1000*60/10000 = 6.0, within the 4-6 classroom target | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `air-density-correction` | Air Density Correction for Altitude and Temperature (ACFM/SCFM) | ASHRAE Fundamentals; spec-v349 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `air-leak-cost` | Compressed-Air Leak Load and Annual Cost (Load/Unload Test) | US DOE Compressed Air Challenge load/...; spec-v239 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `air-pressure-setpoint-savings` | Compressed-Air Discharge-Pressure Setpoint Savings | Isentropic compression-power ratio (D...; spec-v241 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `air-receiver` | Compressed Air Receiver Sizing | Compressed Air & Gas Institute (CAGI)...; Two tools (5 cfm @ 0.4 + 3 cfm @ 0.5) / 8 scfm pump / 175... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `approach-delta-t` | Approach and Delta-T Diagnostics | ACCA / manufacturer commissioning bul...; Outdoor 90 F / condenser sat 105 F -> approach 15 F (norm... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ashrae-622-ventilation` | ASHRAE 62.2 Whole-House Mechanical Ventilation Rate | ASHRAE 62.2-2019 §4.1; spec-v219 section 2.1 pinned example (no credit) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `assembly-r-value` | Wall Assembly R-Value | ASHRAE Handbook of Fundamentals paral...; spec-v99 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `balance-point` | Heat Pump Balance Point | Project (first-principles); slope_capacity = 300 Btu/hr/F (1 percent of design); slop... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `baseboard-length-for-load` | Baseboard Length for a Room Load | Slant/Fin (inverse); 4,800 BTU/hr, 180 F water, 1 gpm, Fine Line 30 (600 BTU/f... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `baseboard-output` | Hydronic Baseboard Output | Slant/Fin; 180 F water / 1 gpm / 8 ft of Slant/Fin Fine Line 30 -> 6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `belt-pulley` | Belt Length and Pulley Speed | Project (first-principles); 4 in drive / 8 in driven / 18 in centers / 1750 RPM motor... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `blower-door-ach50` | Blower-Door Air-Tightness (ACH50, Natural Infiltration, Code Check) | IECC R402.4.1.2 + LBL infiltration model; spec-v218 section 2.1 pinned example (first test, FAIL) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `blown-insulation-coverage` | Blown Insulation Coverage | Manufacturer blown-insulation coverag...; spec-v99 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `boiler-pipe-sizing` | Boiler Distribution Pipe Sizing | ASHRAE / Bell & Gossett; GPM = 200000/(500*20) = 20; v(1.265 in) = 5.11 > 4 -> ste... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `buffer-tank-loop-credit` | Buffer Tank with Distribution-Loop Credit | ASHRAE / Idronics (Caleffi); 60 gal gross, 1.5 in x 200 ft loop holds 18.36 gal -> 41.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `building-ua` | Whole-Building Heat-Loss Coefficient UA | Whole-building UA (ASHRAE / RESNET); spec-v329 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cfm-per-ton` | CFM per Ton | Project (first-principles); ACCA Manual D / industry rule of thumb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chiller-tons` | Chiller Tonnage (Delta-T and GPM) | ASHRAE; Q = 240*500*10 = 1,200,000 BTU/hr; tons = 1,200,000/12000... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chimney-draft` | Theoretical Chimney Draft | ASHRAE Handbook HVAC Systems / NFPA 211; 30 ft stack, 60 F ambient, 400 F mean flue, 14.7 psia -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chimney-height-for-draft` | Chimney Height for a Target Draft | ASHRAE Handbook HVAC Systems / NFPA 2...; 0.1046 in wc net, 60 F ambient, 400 F mean flue, 14.7 psi... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `co-air-free` | Air-Free CO Correction | ANSI Z21 / BPI field practice; 60 ppm measured at 8% O2 -> 60 x 20.9 / 12.9 = 97 ppm air... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `coil-bypass-factor` | Coil Bypass Factor and Apparatus Dew Point | ASHRAE Fundamentals; spec-v377 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `coil-face-area` | Cooling Coil Face Area for a Target Velocity | coil-selection practice; spec-v701 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `coil-face-velocity` | Cooling Coil Face Velocity and Carryover Check | coil-selection practice; spec-v409 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `colebrook-friction-factor` | Darcy Friction Factor (Swamee-Jain / Colebrook) | Swamee-Jain / Moody; spec-v387 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `combustion-air` | Combustion Air | ICC; required_volume = 50 ft^3 per 1000 Btu/hr = 5000 ft^3; 40... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `combustion-air-max-input` | Max Appliance Input from Room Volume | ICC; max input = (4000 / 50) * 1000 = 80,000 Btu/hr; at that i... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `combustion-lambda` | Combustion Lambda and Air-Fuel Ratio | Combustion-analysis practice (lambda ...; Natural gas at 3% O2 -> lambda 1.168, 16.8% excess air, 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `compare-refrigerants` | Compare Two Refrigerants | Chemours / Honeywell / Daikin publish...; R-410A vs R-32 at 118 psig -> 40 F vs 43.2 F sat-temp; pr... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `compressed-air-power` | Compressed-Air Compression Power (Isentropic) and Energy Cost | Single-stage adiabatic (isentropic) c...; spec-v240 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `compression-ratio-refrig` | Refrigeration Compression Ratio | ASHRAE Handbook Refrigeration (by name); suction 70 psig, discharge 260 psig, atm 14.696 -> 274.69... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `compressor-displacement` | Compressor Theoretical Displacement | Reciprocating compressor theoretical ...; 2.0 in bore, 1.5 in stroke, 4 cyl, 1750 rpm -> 18.85 in^3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `compressor-short-cycle` | Compressor Short-Cycle Protection | Copeland / ASHRAE; N = 6*4*0.5*0.5 = 6 cph; on = 0.5*60/6 = 5 min < 10 min o... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `compressor-volumetric-efficiency` | Compressor Volumetric Efficiency (Clearance Re-Expansion) | Reciprocating compressor clearance vo...; ratio = 300/70 = 4.286; VE = 100*(1+0.045-0.045*4.286^(1/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `condensate-drain` | Condensate Rate and Drain Size | IMC 307.2.2 (drain size by capacity) ...; spec-v102 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `condenser-cop-for-heat-rejection` | COP Implied by the Heat of Rejection | THR = Q_evap (1 + 1/COP), solved for COP; spec-v761 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `condenser-heat-rejection` | Condenser Total Heat of Rejection | Total heat of rejection THR = Q_evap ...; spec-v322 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cooling-coil-total-load` | Cooling Coil Total Load from Enthalpy Difference | ASHRAE Fundamentals; spec-v376 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cooling-tower` | Cooling Tower Approach and Range | CTI ATC-105 cooling-tower test code; 95 F in / 85 F out / 75 F wet-bulb / 300 gpm / 15 kW fan ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dcv-co2-ventilation` | Demand-Controlled Ventilation Rate from a CO2 Setpoint | Steady-state single-zone CO2 mass bal...; spec-v277 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `degree-day-energy` | Annual Heating Energy and Fuel Cost from Degree-Days | Degree-day method (ASHRAE / RESNET); spec-v330 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `draft-hood-dilution` | Draft-Hood Dilution Ratio | Combustion-analysis practice; appliance O2 5%, diluted O2 12% -> ratio 1.79, 44.0% dilu... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drybulb-from-enthalpy` | Dry-Bulb from Enthalpy and Humidity Ratio | ASHRAE Fundamentals (moist-air enthal...; spec-v663 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dual-fuel-balance-point` | Dual-Fuel Economic Switchover (Heat Pump vs Gas Balance Point) | Delivered-Btu fuel-cost comparison; spec-v234 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-friction-static` | Duct Friction Loss and Static Pressure | ASHRAE Fundamentals Darcy-Weisbach + ...; 10 in round / 400 cfm / 30 ft / no fittings -> 733.39 fpm... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `duct-heat-gain` | Duct Heat Gain/Loss Through Unconditioned Space | ASHRAE Fundamentals; spec-v347 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-leakage` | Duct Leakage Test-and-Balance | ACCA Manual D + SMACNA HVAC Duct Cons...; 1000 design cfm / 60 measured / 300 ft^2 / 1.0 in WC -> n... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `duct-leakage-cfm25` | Residential Duct Leakage CFM25 (IECC R403.3.5) | IECC R403.3.5; spec-v461 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-sizing` | Duct Sizing | ACCA Manual D / ASHRAE Fundamentals; 400 cfm @ 0.08 in WC / 100 ft -> 10.14 in round (9.28 in ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `duct-static-pressure-total` | Total External Static Pressure | ACCA Manual D / SMACNA (by name); filter 0.10 + registers 0.03 + grille 0.03 + coil 0.30 + ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `duct-static-regain` | Duct Static Regain at a Velocity Decrease | Duct static-regain method (SMACNA / A...; VP_up = (2000/4005)^2 = 0.2494; VP_dn = (1500/4005)^2 = 0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-transition-length` | Duct Transition (Reducer) Length from Slope | duct transition length geometry (SMACNA); concentric = ((20-12)/2)/tan(15) = 4/0.26795 = 14.93; ecc... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-velocity-pressure` | Duct Velocity Pressure | ACCA Manual D / ASHRAE Fundamentals (...; VP 0.25 in. w.c. -> V = 4005 * 0.5 = 2002.5 fpm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `economizer-enthalpy-changeover` | Economizer Enthalpy Changeover | ASHRAE 90.1; spec-v443 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `economizer-savings-hours` | Air-Side Economizer Free-Cooling Hours | ASHRAE sensible-heat relation + Stand...; 4000 CFM, dT 20 F -> 86,400 BTU/hr | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `envelope-conduction-load` | Opaque-Envelope Conduction Cooling Load (Sol-Air CLTD) | ASHRAE / ACCA Manual J opaque envelope; spec-v229 section 2.1 pinned example (dark roof) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `equivalent-length` | Equivalent Length of Fittings | ASHRAE / SMACNA fitting tables; Four long-radius 90-degree elbows at 1 in (1.7 ft each) +... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `erv-sensible-recovery` | ERV/HRV Sensible Effectiveness and Recovered Load | ASHRAE Standard 84 / AHRI Standard 10...; spec-v275 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `erv-total-enthalpy-recovery` | ERV Total Enthalpy Recovery | ASHRAE Fundamentals; spec-v441 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `evaporative-cooler-effectiveness` | Evaporative (Swamp) Cooler Leaving Temperature | ASHRAE Fundamentals (saturation effec...; depression = 95 - 65 = 30; drop = 0.85 x 30 = 25.5; leavi... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `evaporative-cooling` | Latent Heat Evaporative Cooling | Project (first-principles); Q = m * hfg = 10 * 1054 = 10540 Btu/hr = 0.878 tons | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `evaporator-td-dtd` | Evaporator Design TD and Humidity Band | ASHRAE Refrigeration; spec-v434 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `excess-air-o2` | Excess Air from Flue-Gas O2 | ASME PTC 4.1 / combustion analysis pr...; Natural-gas appliance reading 4% O2 -> 4 / 16.9 x 100 = 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fan-affinity-laws` | Fan Affinity Laws (Speed / Diameter Change) | AMCA / ASHRAE Fundamentals; spec-v384 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fan-motor-bhp` | Fan Brake Horsepower | AMCA / ASHRAE fan-power relation + NE...; 4000 CFM, 2.0 in w.c., eta_fan 0.65 -> BHP ~1.94 -> 2 HP | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fan-motor-max-airflow` | Fan Max Airflow from Motor Power | AMCA / ASHRAE fan-power relation (inv...; 1.936 BHP, 2.0 in w.c., eta_fan 0.65 -> ~4,000 CFM (round... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `filter-pressure-drop` | Filter Pressure Drop and Fan-Energy Penalty | ASHRAE / manufacturer cut sheets; airflow = 4*300 = 1200 CFM; clean 0.35 / change-out 0.70 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `flash-gas-subcool` | Liquid-Line Subcooling to Prevent Flash Gas | ASHRAE Refrigeration Handbook; 40 ft R-410A riser, 15 psi friction -> 17.2 psi lift, 32.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `flue-gas-combustion-eff` | Flue-Gas Combustion Efficiency (Stack Loss) | Siegert stack-loss method (DIN combus...; Natural gas, 5% O2, 400 F stack over 70 F air -> CO2 8.90... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `furnace-airflow-to-rise` | Furnace Airflow to Temperature Rise | First-principles sensible-heat relati...; spec-v655 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `furnace-temp-rise` | Furnace Temperature Rise and Derived Airflow | First-principles sensible-heat relati...; spec-v110 section 2.2 pinned example (70->120 F, 100k inp... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gas-meter-clock` | Gas-Meter Clocking (Actual Firing Rate) | First-principles meter-clocking arith...; spec-v110 section 2.1 pinned example (1 cf dial, 37 sec, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gas-meter-clock-target` | Gas-Meter Clock Target Time | First-principles meter-clocking arith...; spec-v652 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `geothermal-loop` | Geothermal Loop Length | IGSHPA / ASHRAE Handbook (Applications); 60,000 BTU/hr heating (governs over 48,000 BTU/hr cooling... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grille-face-velocity` | Grille/Register Face Velocity and Free-Area Sizing | ASHRAE / SMACNA; spec-v348 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `heat-pump-cold-capacity` | Heat-Pump Cold-Temperature Capacity and Auxiliary Heat | AHRI 210/240 low-temperature rating p...; spec-v235 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `heat-pump-seasonal-energy` | Heat-Pump Seasonal Heating Energy and Cost vs Gas and Resistance | AHRI 210/240 HSPF / fuel-cost comparison; spec-v233 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hood-exhaust` | Commercial Kitchen Hood Exhaust (IMC 507) | ICC; §507.13: 400 cfm/ft heavy-duty wall-canopy x 8 ft = 3200 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `humidifier-capacity` | Humidifier Capacity (RH Target) | ASHRAE; W 0.00308 -> 0.00620 lb/lb; rho 0.0749 lb/ft^3; m_dot 449... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hvac-equipment-circuit` | HVAC Equipment Circuit (MCA / MOCP) | NEC 2023 (NFPA 70) 440.33 / 440.22(A)...; spec-v104 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hx-lmtd-ntu` | Heat Exchanger LMTD and Effectiveness-NTU | Incropera / TEMA; LMTD = (60-40)/ln(60/40) = 49.33 F; Q = 25000*100 = 2.5e6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hydronic-buffer-tank` | Hydronic Buffer Tank Sizing (Anti-Short-Cycle) | ASHRAE / Idronics (Caleffi); 10 min on-time, 60,000 Btu/hr boiler min, zero load, 20 F... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydronic-gpm-deltat` | Hydronic System Flow from Load and Delta-T | Water-side heat transport Q = 500 GPM dT; spec-v306 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydronic-injection-mixing` | Hydronic Injection-Mixing Loop Flow | hydronic injection-mixing loop (prima...; inj = 10*(110-90)/(180-90) = 10*20/90 = 2.222 gpm; %sec =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `infiltration-load` | Infiltration Heating / Cooling Load (Sensible + Latent) | ASHRAE Handbook of Fundamentals (air-...; spec-v220 section 2.1 pinned example (winter heating) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `insulation-heat-loss` | Pipe Insulation Heat Loss (bare vs insulated) | ASHRAE Handbook (Fundamentals) / manu...; 2.375 in OD pipe at 200 F into 70 F still air with 1.5 in... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `insulation-thickness` | Pipe Insulation Thickness | ASHRAE Handbook (Fundamentals); 1 in OD pipe at 250 F into 75 F ambient, 120 F surface li... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `insulation-thickness-for-heat-loss` | Pipe Insulation Thickness for a Target Heat Loss | Fourier cylindrical-shell conduction ...; od 2 in, k 0.25, 200 vs 70 F, target 40 BTU/hr-ft -> 0.53... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `internal-heat-gains` | Internal Heat Gains: People, Lighting, Equipment | ASHRAE / ACCA Manual J internal gains; spec-v228 section 2.1 pinned example (small office) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `isolator-deflection` | Isolator Static Deflection for a Target Isolation | ASHRAE Fundamentals, Sound and Vibrat...; spec-v633 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manual-d-friction-rate` | Manual D Friction Rate (Available Static Pressure) | ACCA Manual D; spec-v408 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manual-j-cooling` | Manual J Cooling Load (Simplified) | ACCA Manual J residential cooling-loa...; 1500 ft^2 / 1200 wall / 200 window / 4 occupants / 95 out... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `manual-j-heating` | Manual J Heating Load (Simplified) | ACCA Manual J residential heating-loa...; 1500 ft^2 / 1200 wall / 200 window / 1500 ceiling / 10 ou... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `moist-air-enthalpy` | Moist Air Enthalpy (ASHRAE Psychrometrics) | ASHRAE Fundamentals; spec-v375 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `mua-tempering-load` | Makeup-Air Unit Tempering Load (Sensible, Latent, Total) | ASHRAE Fundamentals psychrometric loa...; spec-v276 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `nitrogen-pressure-test` | Nitrogen Pressure Test (Temperature-Corrected) | First-principles Gay-Lussac's law (co...; spec-v105 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `npsh-a` | Pump NPSH Available | Hydraulic Institute / centrifugal-pum...; 0 ft elevation / 60 F water / +5 ft flooded source / 2 ft... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `outdoor-air-mix` | Outdoor Air Mix | ASHRAE Handbook (Fundamentals); Return 75 F / 50% RH, outdoor 95 F / 60% RH, OA fraction ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `outdoor-air-ventilation` | ASHRAE 62.1 Outdoor-Air Ventilation | ASHRAE; Vbz = Rp*Pz + Ra*Az; Voz = Vbz / E_z | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `outdoor-reset-ratio` | Hydronic Outdoor Reset Ratio and Supply Target | hydronic outdoor reset control (Idron...; ratio = (180-80)/(65-0) = 1.5385; target = 80 + 1.5385*(6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `outside-air-percent-temps` | Measured Outside-Air Percent from Mixed-Air Temperatures | ASHRAE / AABC-NEBB; spec-v386 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pipe-heat-loss-radial` | Insulated Pipe Heat Loss (Radial) | Fourier cylindrical-shell conduction ...; r1=1 in, r2=2 in, k=0.25, 200 vs 70 F -> ~24.55 BTU/hr-ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pitot-traverse-cfm` | Pitot Traverse Airflow (Velocity Pressure to CFM) | ASHRAE Fundamentals / AABC-NEBB; spec-v385 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `product-pull-down-load` | Product Pull-Down Load | ASHRAE Refrigeration; spec-v433 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `product-pull-down-time` | Product Pull-Down Time | ASHRAE Refrigeration; spec-v698 section 2.1 pinned example (inverse of spec-v433) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pump-specific-speed` | Pump Specific Speed and Impeller Type | Hydraulic Institute specific speed; spec-v307 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pump-suction-specific-speed` | Pump Suction Specific Speed (Nss) | Hydraulic Institute suction specific ...; spec-v629 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `radiant-floor-output` | Radiant Floor Heat Output | radiant-panel practice; spec-v442 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `recovery-cylinder` | Recovery-Cylinder 80% Fill | DOT / AHRI 700 / EPA Section 608 reco...; spec-v102 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `refrigerant-charge` | Refrigerant Charge Weighing | Chemours / Honeywell published refrig...; R-410A / 25 ft of 3/8 in + 5 ft of 1/2 in -> 15 + 4.75 = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `refrigerant-charging` | Refrigerant Superheat / Subcooling (psig-psia toggle) | ACCA / NATE refrigerant-charging meth...; R_410A / 130 psig suction / 50 F suction-line / 350 psig ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `refrigerant-line-size` | Refrigerant Line Size for Oil Return | ASHRAE Refrigeration Handbook (line s...; 600 lb/hr, 0.5 ft^3/lb, 1500 fpm riser min -> 0.782 in ma... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `refrigerant-lineset-charge-adjust` | Line-Set Length Refrigerant Charge Adder | Line-set charge-adder identity (first...; extra = max(0, 60-15)*0.6 = 27 oz (1.69 lb) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `refrigerant-mass-flow` | Refrigerant Mass Flow from Capacity and Refrigeration Effect | Vapor-compression cycle (m_dot = Q/(h...; spec-v320 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `refrigerant-pt` | Refrigerant P-T Chart | Chemours / Honeywell published P-T bu...; R-410A / 118 psig -> 40 F sat temp; pure table lookup | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `refrigerant-velocity` | Refrigerant Line Velocity and Oil Return | ASHRAE Refrigeration Handbook (line s...; 600 lb/hr / 0.5 ft^3/lb / 0.75 in ID -> 1629.75 fpm (suct... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `refrigeration-cop` | Refrigeration COP and Carnot Limit | Refrigeration COP and Carnot limit; spec-v321 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `reynolds-number-pipe` | Pipe Flow Reynolds Number and Regime | Reynolds number Re = V D / nu; spec-v305 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `round-to-rect-duct` | Round-to-Rectangular Duct Equivalent | ASHRAE Fundamentals (duct design) / S...; 14 in x 8 in rectangular -> equivalent diameter 11.46 in | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `run-capacitor-microfarad` | Run Capacitor Microfarad Check | First-principles capacitive reactance...; spec-v104 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seer-eer` | SEER and EER Conversion | Project (engineering approximation); EER 12 -> SEER 13.44 / SEER2 estimate 12.768 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shr` | Sensible Heat Ratio | ASHRAE Handbook (Fundamentals); 24,000 BTU/hr sensible / 30,000 BTU/hr total -> SHR 0.80 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shr-latent` | Sensible Heat Ratio / Latent Split (ASHRAE) | ASHRAE; Q_s = 1.08 * 1200 * 20 = 25,920; Q_l = 36,000 - 25,920 = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `snowmelt-load` | Hydronic Snowmelt Load and Boiler Sizing (ASHRAE) | ASHRAE snow-melting flux / Chapman IP...; spec-v478 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `static-pressure-hvac` | Static Pressure | ACCA Manual D / ASHRAE Fundamentals; filter 0.25 + coil 0.30 + duct 0.20 -> 0.75 in WC TESP | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `superheat-subcool` | Superheat and Subcool | AHRI / manufacturer P-T charts; R-410A at 118 psig saturates at ~40 F; suction line at 50... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vacuum-decay-test` | Vacuum Decay (Blank-Off) Test | First-principles standing-decay (blan...; spec-v105 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `valve-authority` | Control Valve Authority (Beta) | Control valve authority (beta); beta = 5/(5+3) = 5/8 = 0.625 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vav-box-airflow` | VAV Box Minimum and Maximum Airflow | VAV design / ASHRAE 62.1; spec-v410 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vibration-isolation` | Vibration Isolation Efficiency (ASHRAE) | ASHRAE Handbook -- Fundamentals, Soun...; spec-v483 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `walk-in-cooler-load` | Walk-In Cooler Heat Load | ASHRAE Refrigeration; spec-v432 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wall-condensation-gradient` | Wall Condensation Plane Temperature vs Dew Point | R-proportional gradient + Magnus dew ...; spec-v331 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wet-bulb-psychrometer` | Wet-Bulb Sling Psychrometer | ASHRAE Handbook (Fundamentals); 80 F dry-bulb / 67 F wet-bulb at 1013.25 hPa -> ~50.7% RH... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `window-solar-heat-gain` | Window Solar Heat Gain and Conduction Cooling Load | ASHRAE / ACCA Manual J fenestration; spec-v227 section 2.1 pinned example (west window) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group D Restoration (51 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `abatement-containment` | Asbestos / Lead Abatement Containment Take-Off | EPA NESHAP 40 CFR 61 M / OSHA 1926.1101; 20 x 15 x 9 containment, 4 ACH, 1,500 cfm machines, 3 cy ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `air-movers` | Air Mover Placement | IICRC S500-2021 air-mover sizing tabl...; 600 ft^2 / Class 2 -> 6 air movers / 15,000 total cfm / c... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `air-sample-volume` | Air Sample Run Time and Volume | ASTM D7391 spore-trap method; cassett...; 15 L/min, 75 L, 3 cassettes -> 5.0 min (300 s) each, 225 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `antimicrobial-dilution` | Antimicrobial Mix and Coverage | FIFRA / EPA-registered product label;...; 400 ft2 at 200 ft2/gal, 4 oz/gal, 1.5 gal tank -> 2.0 gal... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bound-water` | Bound Water in Wet Materials | ANSI/IICRC S500 gravimetric water-mas...; 10 ft^3 softwood at 32 lb/ft^3, 40%->12% -> 320 lb dry ma... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `carpet-restore-replace` | Carpet / Cushion Restore-vs-Replace Decision (IICRC S500) | ANSI/IICRC S500 carpet/cushion restor...; Category 1 carpet, not delaminated -> dry in place / floa... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `category-deterioration` | Water Category Deterioration Over Time (IICRC S500) | ANSI/IICRC S500 category-at-time-of-r...; Category 1, 72 h, warm -> reclassified to Category 2 (gray) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cavity-drying-system` | Injection / Wall-Cavity Drying System Sizing | ANSI/IICRC S500 bays-from-length geom...; 32 ft on 16 in centers, 1 port/bay, 12 ports/system -> 24... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ceiling-water-load` | Trapped Ceiling-Cavity Water Load and Collapse Screen | ANSI/IICRC S500 safety practice; wate...; spec-v137 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chamber-turnover` | Drying Chamber Air Turnover | IICRC; actual_ACH = 1450 * 60 / 1500 = 58; required_CFM = 60 * 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `char-depth-capacity` | Fire-Exposed Wood Char Depth and Residual Capacity | AWC National Design Specification cha...; 6x10 (5.5x9.5) 30 min, 2 width + 1 depth faces -> 0.53 S-... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `class-of-loss-screen` | S500 Class-of-Loss Screen by Wetted-Surface Fraction | ANSI/IICRC S500 Class-of-loss definit...; spec-v139 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `containment-air-balance` | Containment Air Balance | IICRC S520 negative-pressure-containm...; 0.02 in WC target / 8 in^2 leakage -> 2610 * (8/144) * sq... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `contents-packout-inventory` | Contents Pack-Out Volume, Boxes, and Storage | Restoration estimating practice (ANSI...; 200 ft^2 at 2 ft^3/ft^2 -> 400 ft^3, 134 boxes, 600 ft^3,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dehumidifier` | Dehumidifier Sizing | AHAM DH-1 / IICRC S500 dehumidificati...; 6000 ft^3 / Class 2 -> 240 pints/day AHAM, 372 pints/day ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dehumidifier-derate` | Field-Effective Dehumidifier Capacity at Chamber Grain Depression | ANSI/IICRC S500 AHAM-overstates-field...; spec-v138 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `desiccant-airflow-sizing` | Desiccant Process-Airflow Sizing for Deep and Low-Temperature Drying | Psychrometric mass balance; ANSI/IICR...; spec-v140 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `disinfectant-dwell` | Disinfectant / Antimicrobial Contact (Dwell) Time Reference | ANSI/IICRC S500 / S520 antimicrobial ...; quaternary ammonium (quat) -> ~10 min wet contact | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dry-time-projection` | Drying Completion Projection (Days to Goal) | ANSI/IICRC S500 linear-trend completi...; 28% to 12% goal at 4 points/day -> 16 remaining, 4 days | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drying-balance` | Drying-System Balance (Installed Dehu vs Evaporation Load) | ANSI/IICRC S500 balanced-drying-syste...; 200 ppd load vs 260 ppd installed at 1.2 target -> +60 pp... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drying-chamber-co2` | Drying-Chamber Fresh-Air / CO2 Buildup | ASHRAE 62.1 (mass balance); 0.06 cfm CO2, 1000-400 ppm, 2000 ft^3 -> 100 cfm, 3.0 ACH | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drying-goal` | Drying Goal | IICRC; outdoor_GPP ~ 108 grains; target = outdoor - 10 = 98 grai... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drying-log` | Drying Log (IICRC S500 Boundary Test) | IICRC; Boundary-humidity test: chamber GPP < ambient GPP per day... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drying-times` | Material Drying Times | IICRC S500-2021 typical drying-time b...; drywall -> 2-4 days typical; pure table lookup; exercises... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `equipment-heat-load` | Drying-Equipment Sensible Heat Load and Ventilation | ANSI/IICRC S500 drying-equipment sens...; 4000 W at a 10 degF target rise -> 13,648 BTU/hr, ~1,264 cfm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `equipment-power-draw` | Equipment Power Draw vs Circuit Capacity | NFPA (NEC); total = 4*2.5 + 1*8.5 = 18.5 A; continuous limit = 0.8*20... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `evaporation-load` | Evaporation Load / Dehu Demand | IICRC S500 water-class evaporation-lo...; 800 ft2, Class 3 (0.08 gal/ft2) -> 64 gal initial load | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `flood-cut-quantity` | Flood-Cut Demolition Take-Off | IICRC S500-2021 structural-removal pr...; 60 LF, 24 in, one side, insulated -> 120 ft2 drywall, 4 s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `flood-cut-takeoff` | Wicking-Height Flood Cut and Demolition Takeoff | ANSI/IICRC S500 flood-cut demolition ...; spec-v136 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `grains-removed` | Moisture Removed by Grain Depression | Psychrometric mass balance + IICRC S5...; 250 CFM, dG 40 GPP, 24 hr -> ~6.43 lb/hr, ~18.5 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hardwood-floor-drying-mat` | Hardwood Floor Drying-Mat System Sizing | ANSI/IICRC S500 Class 4 specialty drying; 120 ft^2 at 6 ft^2/mat, 16 mats/unit -> 20 mats, 2 units | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hepa-filter-life` | HEPA Scrubber Filter Life | EPA / IICRC S520 HEPA loading practic...; 1000 cfm / 8 hr/day / medium / 5-day job / $80 filter -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hydroxyl-sizing` | Hydroxyl Generator Sizing by Volume (IICRC S700) | ANSI/IICRC S700 volume-and-coverage s...; 12,000 ft^3 / 6,000 ft^3 per unit -> 2 generators | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `moisture-dry-goal` | Dry Standard vs Affected Reading | IICRC S500-2021 dry-standard concept; reference 12, affected 35, delta-allow 4 -> delta 23, con... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mold` | Mold Growth Conditions | EPA / IICRC S520-2024 mold-risk practice; 80% RH / 75 F / 60 hr elevated -> high risk; exercises th... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mold-cleaning-labor` | Mold Surface Remediation Labor and HEPA Vacuuming | ANSI/IICRC S520 source removal; 500 ft^2 at 100 ft^2/hr, 2 passes, crew 2 -> 10.0 labor-h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mold-conditions` | IICRC S520 Condition Reference | IICRC S520-2024 Condition framework; Reference compute returns the three Conditions + remediat... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mold-remediation-level` | Mold Remediation Scope by Area | EPA 402-K-01-001 / NYC DOHMH / IICRC ...; 45 ft2 porous, no HVAC, healthy occupant -> medium band, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `nam-sizing` | Negative Air Machine Sizing | IICRC; 8000 ft^3 chamber at 6 ACH -> 800 cfm required; one 1000-... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ozone-shock-treatment` | Ozone Deodorization Sizing, Time, and Lockout | ANSI/IICRC S700 deodorization; 8000 ft^3 at 2000 ft^3/unit -> 4 generators, lockout requ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ppe` | PPE Selection | OSHA / IICRC S500 PPE category schedule; Category 1 -> nitrile gloves, safety glasses, work clothi... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `psychrometric` | Psychrometric Calculator | ASHRAE Handbook (Fundamentals); 75 F @ 50% RH -> dew point ~55.1 F, ~64.5 GPP (grains per... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `smoke-residue-method` | Smoke Residue Type and Cleaning Method Screen | ANSI/IICRC S700 residue-method mapping; dry residue -> dry-sponge then dry/wet cleaning | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soot-cleaning-takeoff` | Dry-Sponge Soot Cleaning Takeoff and Seal Coat | ANSI/IICRC S700 fire and smoke restor...; 1200 ft^2 at 100 ft^2/sponge, 150 ft^2/hr, seal -> 12, 8.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spore-io-ratio` | Indoor/Outdoor Spore Ratio Clearance Screen | ANSI/IICRC S520 (indoor/outdoor clear...; 800 vs 1,500 spores/m^3, no marker -> 0.53 ratio, support... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `standing-water` | Standing Water Volume | Project (first-principles); 500 ft^2 of standing water 1 in deep -> 41.67 ft^3 / 311.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `surface-condensation-risk` | Surface Condensation Risk and Dew-Point Margin | ANSI/IICRC S500 (Magnus-Tetens dew-po...; 80 degF / 50% RH vs a 50 degF single-pane window -> 59.7 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `thermal-delta-t` | Thermal Imager Delta-T Reference | IICRC S500 + ASHRAE-bundled thermal-d...; Reference compute returns the per-attribute table; runner... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thermal-fog-deodorization` | Thermal/ULV Fog Deodorizer Dosage | ANSI/IICRC S700 deodorization; 8000 ft^3 at 5 oz/1000 ft^3, 1 pass -> 40 oz, 0.31 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `water-classes` | Water Loss Class and Category | IICRC S500-2021 water-damage category...; Reference compute returns the per-attribute table; runner... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wood-emc` | Equilibrium Moisture Content of Wood | USDA Forest Products Laboratory Wood ...; spec-v119 section 2.1 pinned example (textbook ~9.1%) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group E Construction (366 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `abrasive-blast` | Abrasive Blast Air and Abrasive Consumption | SSPC / AMPP SP specs / nozzle manufac...; 3/8 in nozzle at 100 psi, 3,000 ft^2 at 8 lb/ft^2 -> 283 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ada-ramp-slope` | ADA Ramp Slope, Runs, and Landings (IBC 1012 / ADA) | IBC 1012 / ADA; spec-v474 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `aggregate` | Aggregate / Gravel Cubic Yards | Project (first-principles); volume = 1000 * 4/12 = 333.33 ft^3; cubic_yards = 333.33/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `allowable-area` | Allowable Building Area per Story (IBC Chapter 5) | IBC 2021 §506.2 / §506.3 and Table 506.2; spec-v251 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `anchor-embedment` | Anchor Bolt Embedment | Project (public bond-strength formula); 5000 lb uplift / 5/8 in bolt / 3000 psi concrete -> 66.42... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `anchor-epoxy-volume` | Adhesive-Anchor Epoxy Cartridge Volume | Adhesive-anchor epoxy-volume identity...; per hole = (PI/4)*(0.75^2-0.625^2)*6 = 0.810 in^3; total ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `annular-grout-volume` | Annular Grout Volume for Cased Bore / Pipe-in-Casing | Annular-area identity (first-principles); area = (PI/4)(24^2-16^2) = 251.3 in^2; neat = 251.3/144*1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `asce-live-load-reduction` | Live Load Reduction (ASCE 7 Ch. 4) | ASCE 7 minimum design loads; spec-v803 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `asce7-load-combinations` | ASCE 7 ASD Load Combinations: Governing Demand and Net Uplift | ASCE 7 §2.4.1 basic ASD combinations; spec-v225 section 2.1 pinned example (roof uplift) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `asphalt-paving-speed` | Asphalt Paver Speed and Production Rate | Paving production identity (first-pri...; tons/hr = 20 * 50 * 12 * (2/12) * 145 / 2000 = 145; lane-... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `asphalt-spread-rate` | Asphalt Spread Rate and Yield Check | Asphalt spread / yield identity (firs...; spread = 2*145*0.75 = 217.5 lb/sy; yield = 2000/217.5 = 9... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `asphalt-tack-coat-quantity` | Asphalt Tack / Prime Coat Quantity | Coverage identity / DOT tack-coat pra...; area = 10000/9 = 1,111.1 sy; undiluted = 0.04/0.60 = 0.06... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `asphalt-tonnage` | Asphalt Tonnage | Project (first-principles); volume = 5000 * 3/12 = 1250 ft^3; tons = 1250 * 145 / 200... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `at-rest-earth-pressure` | At-Rest Earth Pressure on a Braced Wall (Jaky K0) | Jaky (1944) as compiled in Das / NAVF...; spec-v624 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `atterberg-indices` | Atterberg Plasticity Indices and A-Line Classification | Atterberg limits / USCS A-line; spec-v328 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `attic-ventilation` | Attic Ventilation Net Free Area | IRC R806 attic-ventilation rule; spec-v98 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `baluster-picket-count` | Guard Baluster / Picket Count (4-in Sphere Rule) | Guard baluster spacing (IRC 4 in sphe...; pickets = ceil((96-4)/(1.5+4)) = ceil(16.7) = 17; gaps = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `barstock-cutlist` | Bar / Tube Stock Cut List Yield | linear cut-list yield identity (first...; pieces = floor((240+0.125)/(14.5+0.125)) = 16; drop = 240... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `baseplate-grout-volume` | Non-Shrink Grout Volume Under a Base Plate | Base-plate grout-volume identity (fir...; grout = (324-64)*1.5 = 390 in^3; ft^3 = 390/1728*1.10 = 0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `beam-loading` | Beam Loading | Project (first-principles); 200 plf / 12 ft / E = 1.6e6 psi / 4x10 -> M = 3600 lb-ft,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `beam-reactions` | Simple-Span Beam Reactions and Max Moment | Statics / AISC simple-beam diagrams; L 16 ft, w 200 plf -> R 1600 lb, M_max 6400 ft-lb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bend-allowance` | Sheet Metal Bend Allowance | Project (first-principles); BA = (pi/180) * 90 * (0.125 + 0.44 * 0.06) = 0.2378; setb... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bend-springback` | Sheet-Metal Bend Springback | Machinery's Handbook sheet-metal spri...; x = 1*50000/(29e6*0.1) = 0.017241; Ks = 4x^3-3x+1 = 0.948... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `board-footage` | Lumber Board Footage | Project (first-principles); Standard lumber-yard board-foot identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bolt-group-eccentric` | Eccentric Bolt Group in Shear (Elastic Vector Method) | AISC Manual Part 7 (elastic vector me...; spec-v266 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bolt-shear-bearing` | Bolt Shear + Bearing / Tearout Strength (AISC 360 J3) | AISC 360-22 J3.6 / J3.10; spec-v267 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bolt-torque` | Bolt Torque to Clamp Load | Project (first-principles); F = 85000 * 0.1419 * 0.75 = 9046 lb; T_in_lb = 0.20 * 0.5... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `boussinesq-surcharge-wall` | Surcharge Lateral Pressure on a Wall from a Line Load (Boussinesq) | NAVFAC DM-7.2 modified Boussinesq; spec-v310 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `brick-veneer-anchor-spacing` | Brick Veneer Anchor Spacing and Count (TMS 402 / IBC 1405) | TMS 402 / IBC 1405; spec-v369 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `brick-veneer-weep-count` | Brick Veneer Weep-Hole Count (IRC R703.8.6) | brick veneer weep spacing (IRC R703.8.6); weeps = ceil(30*12/33) + 1 = ceil(10.9) + 1 = 11 + 1 = 12 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cantilever-beam` | Cantilever Beam Moment, Shear, and Deflection | Roark / AISC beam diagrams; spec-v341 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `carbon-equivalent` | Carbon Equivalent and Preheat Screen | IIW / AWS D1.1 carbon-equivalent formula; A36-type C 0.25, Mn 0.80 -> CE 0.38333 (0.35-0.55 band) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `carpet-takeoff` | Carpet Square-Yard and Linear-Foot Takeoff | Carpet takeoff identity (first-princi...; gross = 900*1.10 = 990 sf; SY = 990/9 = 110; linear = 990... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cement-board-takeoff` | Cement Board (Tile Backer) Sheet and Screw Takeoff | cement-board takeoff (ANSI A108 / TCNA); sheets = ceil(120*1.10/15) = ceil(8.8) = 9; screws = 9*35... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chain-link-fence-takeoff` | Chain-Link Fabric, Post, and Tension-Band Takeoff | Chain-link takeoff identity (first-pr...; fabric=200-4=196; terminals=4+2=6; posts=ceil(200/10)=20;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `check-dam-spacing` | Rock Check Dam Spacing | Crest-to-toe check-dam spacing identi...; spacing = 2 / 0.04 = 50 ft; dams = ceil(300/50) = 6 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cmu-grout-volume` | CMU Grout Volume (Partial and Full Grout) | TMS 602 / ACI 530.1, NCMA TEK; spec-v212 section 2.1 pinned example (partial grout, 24 i... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cmu-shear-wall` | Reinforced CMU Shear Wall In-Plane Shear (TMS 402 ASD) | TMS 402-16 (ACI 530 / ASCE 5) via Mas...; spec-v270 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cmu-wall-axial` | Reinforced CMU Wall Axial Compression (TMS 402 ASD) | TMS 402-16 (ACI 530 / ASCE 5) via Mas...; spec-v271 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cmu-wall-flexure` | Reinforced CMU Wall Out-of-Plane Flexure (TMS 402 ASD) | TMS 402-16 (ACI 530 / ASCE 5) via Mas...; spec-v269 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `coating-coverage-dft` | Coating Coverage from Volume-Solids and DFT | SSPC / AMPP PA 2; 60% volume-solids, 5.0 mil DFT, 2,000 ft^2, 35% loss -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `coil-length` | Coil / Roll Stock Length | coil / roll stock annulus identity; spec-v802 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `column-base-plate` | Column Base Plate under Axial Load (AISC Design Guide 1) | AISC Design Guide 1 §3.1 / AISC 360-2...; spec-v268 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `column-buckling-wood` | Wood Column Capacity (Slenderness) | NDS column-stability (Cp / Euler buck...; 3.5x3.5 in, le 96 in, Fc* 1150, Emin 580,000 -> capacity ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `combined-stress-axial-bending` | Combined Axial and Bending Stress (P/A +/- Mc/I) | mechanics of materials; spec-v343 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `compaction-roller-production` | Roller Compaction Production Rate | Roller production identity (first-pri...; area = 7*3*5280*0.75/6 = 13,860 sf/hr (1,540 sy/hr); prod... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `composite-beam-flexure` | Composite Beam Flexural Strength (AISC 360-22 I3) | AISC 360-22 I3; spec-v412 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `compound-miter` | Compound Miter (Crown Molding) | First-principles compound-miter trigo...; 38 deg spring crown at a 90 deg corner -> 31.62 deg miter... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `concrete` | Concrete Volume | Project (first-principles); Volume identity; 20x10 footing 4 in deep | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-anchor-blowout` | Concrete Anchor Side-Face Blowout (ACI 318-19 17.6.4) | ACI 318-19; 3/4-in heavy-hex (Abrg 0.654 in^2), f'c 4000, ca1 3 in, h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-anchor-breakout` | Cast-In Anchor Tension Concrete Breakout (ACI 318-19 Ch. 17) | ACI 318-19 Section 17.6.2 (concrete b...; 6 in cast-in, 4000 psi, away from edges -> Nb 22308 lb, N... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-anchor-pullout` | Concrete Headed-Anchor Pullout (ACI 318-19 17.6.3) | ACI 318-19 Section 17.6.3 (headed-anc...; 3/4-in bolt, 0.654-in2 head, 4,000-psi cracked -> Np 20,9... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-beam-min-flexural-steel` | Minimum Flexural Reinforcement As,min (ACI 318-19 9.6.1.2) | ACI 318-19 9.6.1.2; spec-v394 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-bearing-strength` | Concrete Bearing Strength (ACI 318-19 22.8) | ACI 318-19 22.8.3; spec-v490 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-corbel-bracket` | Concrete Corbel / Bracket Design (ACI 318-19 16.5) | ACI 318-19 Section 16.5 (brackets and...; Vu 40k, av 4, d 12, h 14, b 14, fc 4000, fy 60k -> Nuc 8k... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-crack-control-spacing` | Crack-Control Bar Spacing (ACI 318-19 24.3.2) | ACI 318-19 24.3.2; spec-v395 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-cracking-moment` | Concrete Cracking Moment Mcr (ACI 318-19) | ACI 318-19 (Mcr = fr Ig/yt, 19.2.3 mo...; spec-v651 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-depth-for-cracking-moment` | Concrete Section Depth for a Target Cracking Moment | ACI 318-19 (Mcr = fr b h^2/6, solved ...; spec-v752 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `concrete-elastic-modulus` | Concrete Modulus of Elasticity Ec (ACI 318-19 19.2.2) | ACI 318-19 19.2.2; spec-v378 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-evaporation-rate` | Concrete Surface Evaporation Rate and Plastic-Shrinkage Risk (ACI 305) | ACI 305 Hot Weather Concreting / Menz...; spec-v246 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-isolation-joint` | Concrete Isolation-Joint Filler Takeoff | isolation-joint filler takeoff (ACI 3...; perimeter = 2*(40+30) = 140; columns = 6*4 = 24; filler =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-longterm-defl` | Long-Term Deflection Multiplier (ACI 318-19 24.2.4) | ACI 318-19 24.2.4.1.1; spec-v497 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-maturity` | Concrete Maturity and Equivalent Age (ASTM C1074) | ASTM C1074 maturity method (Nurse-Sau...; spec-v476 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-mix-design` | Concrete Mix Design (Simplified) | ACI; wc = 0.48; water = 325 lb/yd^3 (1 in agg, 4 in slump base... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `concrete-modulus-of-rupture` | Concrete Modulus of Rupture fr (ACI 318-19 19.2.3) | ACI 318-19 19.2.3; spec-v379 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-pour-rate` | Concrete Pour Rate, Rate of Rise, and Delivery Cadence | Rate-of-rise identity (first-principles); rate of rise = 20*27/100 = 5.4 ft/hr; pour = 44.44/20 = 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-sawcut-footage` | Concrete Control-Joint Saw-Cut Footage | Control-joint saw-cut-footage identit...; panels_l=ceil(60/12)=5, panels_w=ceil(40/12)=4; joint=(5-... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-shrinkage-temperature-steel` | Shrinkage and Temperature Reinforcement (ACI 318-19 24.4) | ACI 318-19 24.4; spec-v380 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-stair-volume` | Concrete Stair / Stoop Volume Takeoff | concrete stair volume geometry (first...; steps = 4*0.5*7*11 = 154; rake = sqrt(28^2+44^2) = 52.15;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-strength-from-modulus` | Concrete f'c from Modulus of Elasticity (ACI 318-19 19.2.2) | ACI 318-19 19.2.2; Ec 3,644,147 psi at 145 pcf -> ~4,000 psi | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `concrete-strength-from-rupture` | Concrete f'c from Modulus of Rupture (ACI 318-19 19.2.3) | ACI 318-19 19.2.3; fr 474.342 psi, lambda 1.0 -> ~4,000 psi | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `concrete-strength-gain` | Concrete Age-Strength Gain for Form Stripping (ACI 209) | ACI 209R strength-development model; spec-v247 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-torsion-threshold` | Concrete Threshold and Cracking Torsion (ACI 318-19 22.7) | ACI 318-19 §22.7; spec-v447 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-vibrator-spacing` | Internal Vibrator Spacing (ACI 309) | ACI 309 internal-vibration spacing rule; spacing = 1.5*12 = 18 in; edge = 0.75*12 = 9 in; insertio... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-washout-volume` | Concrete Washout Containment Volume | Washout-containment identity (first-p...; total = 1,000 gal; required = 1000/7.48052*1.15 = 153.7 c... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `concrete-yield` | Concrete Yield and Relative Yield (ASTM C138) | ASTM C138 / AASHTO T121 (concrete yield); 3993 lb batch at 148 lb/ft3, 1.0 yd3 design, 564 lb cemen... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `consolidation-degree` | Consolidation Degree from Elapsed Time (Terzaghi) | Terzaghi consolidation theory (invert...; spec-v645 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `consolidation-time-rate` | Consolidation Time Rate (Terzaghi) | Terzaghi consolidation theory; spec-v414 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `construction-adhesive-tubes` | Construction Adhesive Tube Count | Adhesive bead-yield identity (first-p...; bead area = (PI/4)*0.375^2 = 0.1105 in^2; lf/tube = 50.6/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `control-joint-spacing` | Concrete Control Joint Spacing | ACI 302.1R / 360R slab-on-ground guid...; spec-v96 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `coulomb-earth-pressure` | Coulomb Active Earth Pressure (Wall Friction and Batter) | Coulomb (1776) as compiled in Das / N...; spec-v628 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `crane-lift-quick` | Crane Lift Plan Quick-Math | ASME B30.5 / manufacturer load-chart ...; 8000 lb load + 200 lb rigging / 2-leg sling at 60 deg fro... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `curb-gutter-volume` | Curb-and-Gutter Concrete Volume | Linear-pour identity (first-principles); volume = 2.0*300/27*1.08 = 24.0; cy/100LF = 2.0*100/27 = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `curing-compound-coverage` | Concrete Curing Compound Coverage | liquid membrane cure coverage (ASTM C...; gallons = ceil(2500*1/200) = ceil(12.5) = 13; pails = cei... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `curve-deflection-stakeout` | Curve Deflection-Angle Stakeout | AASHTO Green Book / FM 5-233 (by name); delta = (100/1000)(180/pi) = 5.7296 deg; chord = 1000 sin... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `deck-beam-post` | Deck Beam and Post Sizing (IRC R507) | IRC / AWC NDS; trib = 6 ft; w = 50 x 6 = 300 plf; double 2x8 beam, 4x4 p... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `deck-board-takeoff` | Deck Board and Fastener Takeoff | First-principles deck-surface takeoff; 12 x 16 ft deck, 5.5 in boards, 0.25 in gap, 16 in OC, 10... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `deck-ledger-fasteners` | Deck Ledger Fastener Spacing (IRC R507.9) | IRC R507.9 (deck ledger connection); 16 ft ledger at 16 in OC -> floor(192/16)+1 = 13 fasteners | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `demo-debris` | Demolition Debris Weight | Project (industry debris-density rules); Wood-frame demo / 25 yd^3 -> 675 ft^3 / 16.875 tons / 30 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dewatering-rate` | Excavation Dewatering Pump Rate | First-principles volume / pumping rate; 20 x 12 pit, draw 3 ft in 30 min, inflow 40 gpm, 25% marg... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `diaphragm-collector-force` | Collector / Drag Strut Axial Force (ASCE 7 12.10) | ASCE 7-22 Section 12.10 (collectors a...; 300 plf dragged 40 ft -> 12000 lb; Omega0 2.5 -> 30000 lb... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `diaphragm-shear` | Wood Diaphragm Unit Shear and Chord Force (SDPWS) | AWC SDPWS flexible-diaphragm model (A...; spec-v272 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dozer-production` | Dozer Slot / Blade Production Rate | Caterpillar Performance Handbook slot...; 8 lcy blade, 100 ft push at 200 fpm, return 400 fpm, 0.05... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drainage-board-takeoff` | Foundation Drainage Board (Dimple Mat) Takeoff | Foundation drainage board (dimple mat...; area = 150 x 8 = 1,200 sf; rolls = ceil(1200 x 1.1 / 200)... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drywall` | Drywall Sheet Count and Mud | Project (first-principles); sheets = ceil(1.10 * 1800 / 32) = 62; mud = 0.053 * 1800 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drywall-fastener-takeoff` | Drywall Screw Fastener Takeoff | Drywall fastener identity (first-prin...; studs=floor(48/16)+1=4; screws/stud=floor(96/12)+1=9; per... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-bank-concrete` | Electrical Duct-Bank Concrete Encasement Volume | Duct-bank encasement identity (first-...; net = 3.0 - 6*(PI/4)*(4.5/12)^2 = 2.337 ft^2; volume = 2.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-hanger-load` | Duct Hanger Load and Count | Duct-hanger load / count identity (fi...; load = 5.5*8 = 44 lb; count = ceil(40/8)+1 = 6 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-metal-weight` | Galvanized Duct Sheet-Metal Weight Takeoff | Duct sheet-metal weight identity (fir...; perimeter = 2*(24+12)/12 = 6 ft; area = 600 sf; weight = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `duct-wrap-takeoff` | Duct Wrap / Liner Material Takeoff | Duct-wrap takeoff identity (first-pri...; perimeter = 2*(20+12)/12 = 5.33 ft; wrap = 5.33*40*1.15 =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dump-truck-loads` | Dump Truck Governing Payload and Load Count | Governing-payload identity (first-pri...; weight-limited = 40000/2800 = 14.29 > 12, payload = 12; l... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dumpster-count` | Roll-Off Dumpster / Haul Count | Roll-off haul-count identity (first-p...; by vol = ceil(60/(30*0.7)) = 3; by wt = ceil(45/8) = 6; h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dust-control-water` | Dust-Control Watering Volume and Truck Trips | Dust-control watering identity (first...; area = 2000*20/9 = 4,444 sy; gal/app = 4444*0.5 = 2,222; ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `earthwork-end-area` | Earthwork Volume (End-Area) | FHWA / state-DOT earthwork references...; two 100 ft^2 sections 100 ft apart -> 10000 ft^3 (370.37 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `egress-capacity` | Egress Exit Count and Required Width (IBC 1005.3 / 1006.2) | IBC 2021 §1005.3 / §1006.2 / §1010.1.1; spec-v243 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `egress-travel-distance` | Egress Travel Distance, Common Path, and Dead-End Check (IBC Chapter 10) | IBC 2021 §1017 / §1006.2.1 / §1020.5; spec-v252 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `elastic-settlement-allowable-pressure` | Allowable Bearing Pressure for a Settlement Limit | Theory-of-elasticity immediate settle...; 1 in limit, 6 ft footing, Es 250 ksf, nu 0.3, Is 0.82 -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `erosion-blanket-coverage` | Erosion Blanket (RECP) Roll and Staple Takeoff | Lapped-roll takeoff identity (RECP in...; coverage = 18000/9 = 2,000 sy; roll = 100 sy; rolls = cei... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `excavation` | Excavation Volume | Project (first-principles); vertical (90 deg) -> setback=0; A1=A2=100 ft^2; V = D/3 *... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `excavation-bench-plan` | Excavation Slope and Bench-Step Plan | OSHA; Type B ratio 1:1; bench 4 ft per layer; bottom width 2 ft... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `exterior-opening-protection` | Exterior Wall Opening Limit by Fire Separation Distance (IBC Table 705.8) | IBC 2021 Table 705.8; spec-v253 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fastener-pullout` | Nail and Screw Pull-Out | Project (public fastener-engineering ...; 16d common nail (D=0.162 in) in DF-L (G=0.50), 1.5 in pen... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fence-estimate` | Fence Material Takeoff | Standard fence-layout identities.; spec-v94 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fillet-weld-strength` | Fillet Weld Strength and Size | AWS D1.1 / AISC 360 §J2 (by name); 1/4 in E70 fillet, 6 in long, ASD -> throat 0.1768 in, 21... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fineness-modulus` | Aggregate Fineness Modulus (ASTM C136) | ASTM C136 / C125 (aggregate fineness ...; cumulative retained 2/12/32/57/82/95 -> sum 280 -> FM 2.8... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `flexible-pipe-deflection` | Buried Flexible Pipe Deflection (Modified Iowa) | Modified Iowa (Spangler) deflection f...; Wc = 12*120/144 = 10 psi; deflection = 1.5*0.1*10/(0.149*... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `flooring-takeoff` | Resilient / LVP Flooring Takeoff | Published flooring waste rules of thu...; spec-v95 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `footing-area` | Footing Area for Soil Bearing | Project (first-principles); ASCE 7 / IRC R401 conceptual basis; bundled allowable bea... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `footing-eccentric-pressure` | Eccentric Footing Bearing Pressure and Kern Check | Eccentric footing bearing pressure (k...; spec-v309 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `formwork-pressure` | Formwork Pressure | ACI 347 Guide to Formwork for Concrete; Pour 5 ft/hr / 70 F / normal-weight 150 pcf / 12 ft wall ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `formwork-tie-load` | Formwork Tie Load and Spacing | Formwork tie-load identity (first-pri...; tie load = 600*2*2 = 2,400 lb; util = 2400/3000 = 0.80 (p... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `foundation-waterproofing-takeoff` | Foundation Waterproofing / Dampproofing Takeoff | Foundation waterproofing/dampproofing...; area = 150*8 = 1200; gal = ceil(1200*1.10/50) = ceil(26.4... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fresh-concrete-temp` | Fresh Concrete Temperature (ACI 305.1) | ACI 305.1 Hot Weather Concreting (bat...; agg 3000 lb@80F, cement 564 lb@150F, water 240 lb@70F, ag... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `frost-depth-berggren` | Frost Penetration Depth (Stefan / Modified Berggren) | Stefan / modified-Berggren frost pene...; L = 144*100*0.15 = 2160; X = sqrt(48*1.0*2000/2160) = 6.6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `glass-vacuum-lift` | Glass Weight and Suction-Cup Lifter Count | Suction-cup lifter identity (first-pr...; weight = 32*0.5*13 = 208; cups = ceil(208*4/150) = ceil(5... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `glass-weight` | Flat Glass Lite Weight | NGA Glazing Manual glass-weight table...; 60 x 40 in lite of 1/4 in soda-lime -> 16.67 ft2, 54.2 lb... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `glulam-volume-factor` | Glulam Volume Factor Cv (NDS 5.3.6) | NDS 2018 §5.3.6; spec-v448 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `groove-weld-length-for-load` | Groove Weld Length for an Applied Load | AWS D1.1 / AISC 360 §J2 (solved for l...; 100,000 lb LRFD, E70, PJP throat 0.25 in -> 31.5 ksi -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `groove-weld-strength` | Groove Weld Strength | AWS D1.1 / AISC 360 §J2 Table J2.5 (b...; PJP throat 0.25 in, 6 in long, E70, LRFD -> 0.75*0.60*70 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `guard-handrail-check` | Guard and Handrail Code Check | IRC R312 / R311.7.8 / IBC 1015 (by se...; spec-v113 section 2.1 pinned example (48 in surface, 36 i... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gutter-downspout` | Gutter and Downspout Sizing | SMACNA / standard residential gutter ...; spec-v98 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gutter-downspout-takeoff` | Gutter LF and Downspout Count Takeoff | Gutter takeoff identity (first-princi...; downspouts=ceil(2400/800)=3; pipe=3*10=30; hangers=ceil(1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `haul-cycle-production` | Haul-Cycle Production and Fleet Match | Caterpillar Performance Handbook cycl...; 12 lcy truck, load 2.0, haul 8.0, dump 1.5, return 6.0, s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `haul-road-resistance` | Haul-Road Total Resistance and Required Rimpull | Haul-road resistance identity (first-...; total = 5+4 = 9%; rimpull = 0.09*150000 = 13,500 lb; per ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hdd-pullback` | HDD Pullback Force First-Order Estimate | Simplified HDD pullback identity (AST...; pullback = 0.3*5*800*1.5 = 1,800 lb; utilization = 1800/2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `header-sizing` | Window / Door Header Sizing (IRC R602.7) | IRC / AWC NDS; w = (snow + 15 dead) x trib = 45 x 14 = 630 plf; double 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `helical-pile` | Helical Pile Torque-to-Capacity | Project (first-principles) over IBC s...; 1.5 in solid square shaft / 5000 ft-lb torque / FOS 2.0 -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `helical-pile-torque` | Helical Pile Acceptance Torque for a Target Capacity | IBC sec. 1810.3.3.1.9 helical-pile to...; 1.5 in solid shaft (Kt 10), 25,000 lb allowable at FOS 2 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hip-valley-rafter` | Hip / Valley / Jack Rafter Schedule | Project (first-principles); 14 ft run / 6:12 pitch / 12 in overhang -> common 15.65 f... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hoop-stress-mawp` | Thin-Wall Vessel Max Allowable Working Pressure | thin-wall / Barlow (inverse); spec-v668 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hoop-stress-thin-wall` | Thin-Wall Pressure Vessel Hoop and Longitudinal Stress | thin-wall / Barlow; spec-v361 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `horizontal-curve` | Horizontal Curve Layout | AASHTO Green Book / FM 5-233 (by name); R = 1000 ft, delta = 30 deg -> T 267.95, L 523.60, LC 517... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `horizontal-sightline-offset` | Horizontal Sightline Offset on a Curve (AASHTO) | AASHTO Green Book; spec-v337 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `housewrap-rolls` | Housewrap (WRB) Rolls, Cap Fasteners, and Seam Tape | Housewrap takeoff identity (first-pri...; rolls = ceil(4000*1.10/1350) = ceil(3.26) = 4; cap = ceil... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydroseed-mix` | Hydroseed Slurry Mix and Tank Count | Slurry loading identity (first-princi...; solids = 3*(5+2000+50) = 6,165 lb; tanks = ceil(6165/(300... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ice-barrier-coverage` | Eave Ice-Barrier Membrane Courses and Rolls | IRC R905.1.2 eave ice-barrier extent ...; spec-v215 section 2.1 pinned example (typical 4/12, 12 in... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `insulation-batt-coverage` | Insulation Batt Coverage and Count | manufacturer label; spec-v439 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `intermittent-fillet-weld` | Intermittent Fillet Weld Schedule (AISC J2 / AWS) | AISC 360 J2.2b / AWS D1.1; spec-v453 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `joist-cantilever-check` | Joist / Deck Cantilever Ratio Check (IRC R507.6) | joist cantilever ratio (IRC R507.6); max = 10/4 = 2.5; overhang 3 > 2.5 -> EXCEEDS (margin -0.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `joist-deflection` | Joist Mid-Span Deflection | Project (first-principles); 50 plf / 12 ft span / E 1.6e6 psi / I 47.6 in^4 (typical ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `joist-hanger-count` | Joist Hanger and Connector-Nail Count | Joist-hanger count identity (first-pr...; joists = ceil(16*12/16)+1 = 13; hangers = 13*2 = 26; nail... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `joist-notch-bore-limit` | Floor Joist Notching and Boring Limits (IRC R502.8.1) | floor joist notch/bore limits (IRC R5...; end = 9.25/4 = 2.3125; depth = 9.25/6 = 1.5417; length = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lateral-earth-pressure` | Lateral Earth Pressure and Thrust (Rankine) | Rankine (1857) as compiled in Das / N...; spec-v261 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `layout-squaring` | Layout Squaring (3-4-5) | Pythagorean 3-4-5 method (public); sides 3 and 4 -> diagonal 5 exactly (the 3-4-5 right tria... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `liquefaction-screening` | Liquefaction Triggering Screening (Seed-Idriss CSR) | Seed-Idriss; spec-v416 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `loader-production` | Wheel-Loader / Excavator Bucket Production Rate | Caterpillar Performance Handbook cycl...; 3.5 lcy bucket, 0.95 fill, 0.50 min cycle, 50-min hour, 8... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lumber-spans` | Lumber Spans | Project (first-principles) over AWC N...; DF-L No.2 / 2x10 / 50 psf total / 16 in o.c. / L/360 -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `masonry-anchor-bolt` | Masonry Headed Anchor Bolt Tension (TMS 402 ASD) | TMS 402 ASD; spec-v449 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `masonry-anchor-embedment` | Masonry Anchor Embedment for a Tension (TMS 402 ASD) | TMS 402 ASD; 5,000 lb tension, 1,500 psi masonry -> 5.73 in embedment;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `masonry-control-joint-layout` | Masonry Control-Joint Layout | Masonry control-joint rule (NCMA empi...; max spacing = min(1.5*16, 25) = 24 ft; panels = ceil(80/2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `masonry-count` | Brick and CMU Count | Project (first-principles face-area c...; 100 ft^2 wall / CMU 8x8x16 (15.625x7.625 actual) / 3/8 in... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `masonry-coursing` | Masonry Coursing and Course-Out Check | BIA Technical Notes / NCMA TEK; spec-v213 section 2.1 pinned example (CMU wall on module) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `masonry-joint-reinforcement` | Masonry Horizontal Joint-Reinforcement Takeoff (IRC R606.12.2) | masonry joint-reinforcement takeoff (...; courses = ceil(144/16) = 9; per course = ceil(40/10) = 4;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `masonry-lintel-loading` | Masonry Lintel Arching Load (Triangular Load Over an Opening) | masonry design method; spec-v370 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `masonry-prism-fm` | Masonry Compressive Strength f'm, Unit-Strength Method (TMS 602 Table 2) | TMS 602-16 (ACI 530.1 / ASCE 6) Table...; spec-v551 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `masonry-wall-weight` | Masonry Wall Dead Load | NCMA TEK; spec-v368 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mass-concrete-temp-rise` | Mass Concrete Adiabatic Temperature Rise Screen (ACI 207) | ACI 207 adiabatic temperature-rise sc...; rise = 600*12/100 = 72 degF; peak = 70+72 = 142 degF; 72 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `material-quantity` | Material Quantity | Project (industry coverage rules); 1000 ft^2 / drywall 4x8 (32 ft^2 per sheet, 10% waste) ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `membrane-roof-takeoff` | Single-Ply Membrane Roof Rolls and Seam Length | Single-ply membrane takeoff identity ...; usable = 10 - 0.5 = 9.5 ft; rolls = ceil(8400/950) = 9; s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `metal-deck-takeoff` | Steel Roof / Floor Deck Sheet Takeoff | Steel deck-takeoff identity (first-pr...; cover = (36/12)*30 = 90 sf; sheets = ceil(10500/90) = 117... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `metal-roof-panels` | Metal Roof Panels, Linear Feet, and Fasteners | MCA / MRA install references + manufa...; spec-v216 section 2.1 pinned example (exposed-fastener ag... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `metal-stud-takeoff` | Light-Gauge Steel Stud and Track Takeoff | Steel stud/track takeoff identity (fi...; studs = ceil(50/(16/12)) + 1 + 2*2 = 38 + 1 + 4 = 43; tra... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `metal-weight` | Metal Weight by Shape and Alloy | first-principles (volume x density); 1 in x 12 in x 120 in A36 plate -> area 12 in^2, 408.384 lb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `min-bend-radius` | Minimum Plate Bend Radius | published forming-limit relation; 1/4 in A36 at 20% elongation -> 1.5 T, 0.375 in | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `minimum-roof-snow` | Minimum Roof Snow Load (ASCE 7 7.3.4) | ASCE 7 §7.3.4; spec-v470 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mortar-mix` | Mortar Mix and Yield | PCA; 600 modular bricks at 3/8 in joints, Type N -> 20 bags (6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `multi-bend-flat-pattern` | Multi-Bend Flat Pattern (Developed Length) | sheet-metal layout (developed length); spec-v454 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `occupant-load` | Building Occupant Load from Area and Use (IBC Table 1004.5) | IBC 2021 Table 1004.5 occupant-load f...; spec-v242 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `oxyfuel-cutting-gas` | Oxy-Fuel Cutting Gas Consumption | Torch maker's tip charts; 1/2 in tip: 55 cfh oxygen, 12 cfh acetylene, 240 in at 16... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `paint-coverage` | Paint Coverage | Project (first-principles); 700 ft^2 smooth wall, 2 coats, primer needed -> 2.0 gal/c... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pavement-milling-production` | Cold-Planing (Milling) Production and RAP Tonnage | Cold-planing production identity (fir...; sy/hr = 7*30*60*0.7/9 = 980; spread = 4*148*0.75 = 444; R... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `paver-patio` | Paver Patio Takeoff | ICPI interlocking-paver base and bedd...; spec-v97 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pile-axial-capacity` | Deep Pile Axial Capacity in Clay (Alpha Method) | Alpha (total-stress) pile method (FHW...; spec-v288 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pile-group-efficiency` | Pile Group Efficiency (Converse-Labarre) | Converse-Labarre pile-group efficiency; spec-v498 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pile-group-spacing-for-efficiency` | Pile Group Spacing for a Target Efficiency | Converse-Labarre pile-group efficienc...; spec-v748 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pile-length-for-capacity` | Pile Embedment Length for a Target Capacity (Alpha Method) | Alpha (total-stress) pile method (FHW...; 50 kip target, 16 in pile, cu 1 ksf, alpha 0.55, FS 3 -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-bedding-backfill` | Trench Pipe Bedding and Backfill Take-Off | ASTM D2321 / municipal bedding detail; 100 ft run, 24 in trench, 12 in OD, 4 in bedding, 3 ft co... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-flotation` | Buried Pipe Flotation and Anti-Flotation Backfill | Archimedes flotation identity (first-...; uplift = 62.4*(PI/4)*4^2 = 784.1; FS = 1100/784.1 = 1.40;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `plumbing-fixture-count` | Minimum Plumbing Fixtures by Occupancy (IBC Table 2902.1) | IBC 2021 Table 2902.1 (mirrored in IP...; spec-v244 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `plywood-span` | Plywood and OSB Sheathing Span Rating | APA Engineered Wood Span Ratings (pro...; 24/16 / 0.5 in / roof / 24 in support / 30 psf live + 8 p... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `point-load-bearing` | Bearing Length on a Wood Plate | NDS compression perpendicular to grai...; 4000 lb, 3.0-in width, Fc-perp 625 psi -> ~2.133 in bearing | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `polymeric-sand-bags` | Polymeric Paver Joint Sand Bag Count | Polymeric joint-sand bag-count identi...; bags = ceil(400*1.05/75) = ceil(5.6) = 6 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `post-hole-concrete` | Concrete per Post Hole | Cylinder-volume geometry less post di...; spec-v94 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `powered-attic-ventilator` | Powered Attic Ventilator Sizing | attic-fan sizing practice; spec-v467 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `press-brake-max-thickness` | Press-Brake Max Bendable Thickness | Press-brake air-bend tonnage chart + ...; 100 tons, V 0.5 in, L 4 ft, mild steel -> 0.1474 in max t... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `press-brake-tonnage` | Press-Brake Air-Bend Tonnage | Press-brake air-bend tonnage chart + ...; T 0.125 in, L 4 ft, V 1 in, mild steel -> 8.9844 tons/ft,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rafter` | Rafter Length | Project (first-principles); Pythagoras on rise / 12 run with overhang | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rain-load-ponding` | Roof Rain Load and Secondary-Drainage Flow (ASCE 7 Ch. 8) | ASCE 7 Ch. 8 + IPC drainage; spec-v224 section 2.1 pinned example (typical scupper) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rain-on-snow-surcharge` | Rain-on-Snow Surcharge (ASCE 7-22 7.10) | ASCE 7-22 §7.10; spec-v468 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-beam-flexure` | Reinforced Concrete Beam Flexural Capacity (ACI 318-19) | ACI 318-19 (Building Code Requirement...; spec-v257 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-beam-shear` | Reinforced Concrete Beam Shear and Stirrup Spacing (ACI 318-19) | ACI 318-19 (Building Code Requirement...; spec-v258 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-column-axial` | RC Tied Column Axial Capacity (ACI 318-19 22.4) | ACI 318-19 22.4.2 / 22.4.2.1; spec-v284 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-column-steel-for-load` | RC Column Longitudinal Steel for a Target Load | ACI 318-19 22.4.2 (solved for the steel); spec-v753 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rc-compression-dev-length` | Rebar Compression Development Length (ACI 318-19 25.4.9) | ACI 318-19 25.4.9.2; spec-v491 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-development-length` | Rebar Tension Development Length (ACI 318-19) | ACI 318-19 (Building Code Requirement...; spec-v259 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-doubly-reinforced` | Doubly-Reinforced Concrete Beam Flexural Capacity (ACI 318-19) | ACI 318-19 doubly-reinforced flexure; spec-v300 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-hook-development` | Standard Hook Development Length (ACI 318-19 25.4.3) | ACI 318-19 Eq. 25.4.3.1a; spec-v286 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-punching-shear` | Two-Way Slab Punching Shear at a Column (ACI 318-19 22.6) | ACI 318-19 Table 22.6.5.2; spec-v285 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-shear-friction` | Shear Friction Across an Interface (ACI 318-19 22.9) | ACI 318-19 22.9; spec-v301 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-slab-max-span-for-thickness` | Max One-Way Slab / Beam Span for a Given Depth (ACI 318-19) | ACI 318-19 Table 7.3.1.1 / 9.3.1.1; 10 in, both ends continuous (l/28), Grade 60 normalweight... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rc-slab-min-thickness` | One-Way Slab / Beam Minimum Thickness for Deflection (ACI 318-19) | ACI 318-19 Table 7.3.1.1 / 9.3.1.1; spec-v299 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rc-slender-column-magnify` | Slender Column Moment Magnifier, Nonsway (ACI 318-19 6.6.4) | ACI 318-19 Section 6.6.4.5 (nonsway m...; Pu 200, M2 80, M1 50, lu 14 ft, k 1, EI 1.5e6, h 16 -> Cm... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ready-mix-concrete-order` | Ready-Mix Concrete Order (Trucks, Waste, Short Load) | concrete-supply practice; spec-v431 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rebar` | Rebar Spacing and Quantity | Project (first-principles slab grid l...; 20 ft x 10 ft slab / 12 in spacing / 3 in edge clearance ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rebar-chair-count` | Rebar Chair / Bar-Support Count | Bar-support count identity (first-pri...; chairs = ceil(1000/4^2*1.05) = ceil(65.6) = 66 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rebar-lap-splice` | Rebar Lap-Splice Length | ACI 318 development-and-splice basis ...; spec-v96 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rebar-schedule` | Rebar Bend and Weight Schedule | ACI Detailing Manual / CRSI (project ...; 12 #5 @ 20 ft + 2x 90 + 30 #4 @ 16 ft + 1 stirrup + 8 #6 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rebar-tie-wire` | Rebar Tie-Wire Count and Weight | Rebar tie-wire identity (first-princi...; bars = 21 x 31 = 651 intersections; ties = round(651*0.5)... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rebar-weight-takeoff` | Rebar Weight Takeoff | ASTM A615; spec-v430 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `relative-compaction` | Relative Compaction from Field Density and Proctor Maximum | Relative compaction (earthwork QC); spec-v326 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `required-section-modulus` | Required Plastic Section Modulus for a Steel Beam | AISC 360-22 Chapter F (Mp = Fy Zx, in...; spec-v634 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `residential-framing` | Residential Framing Package | IRC framing practice + AWC NDS (proje...; 1500 ft^2 / 160 ft perim / 9 ft walls / 2x4 / 2x10 joists... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `restrained-pipe-length` | Restrained-Joint Length at a Pipe Bend | Thrust / restrained-length identity (...; area = (PI/4)*12^2 = 113.1; thrust = 2*150*113.1*sin(45) ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `retaining-wall-block` | Segmental Retaining Wall Takeoff | Segmental retaining-wall maker guidan...; spec-v97 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `retaining-wall-stability` | Cantilever Retaining Wall Stability (Overturning / Sliding / Bearing) | Das / NAVFAC DM-7.02 stability checks...; spec-v262 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ridge-cap-fasteners` | Hip / Ridge Cap Bundles and Roofing Nails by the Pound | IRC R905.2.6 asphalt-shingle fastenin...; spec-v217 section 2.1 pinned example (24-square, 40 ft ri... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rigid-foam-board-count` | Rigid / Continuous Insulation Board Count | Rigid-insulation board-count identity...; per layer = ceil(1600*1.08/32) = ceil(54.0) = 54; boards ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ripper-production` | Dozer Ripper Loosening Production Rate | Swept-prism production identity (firs...; cross-section = 3*1.5 = 4.5 ft^2; production = 4.5*132*60... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `riprap-d50` | Riprap Median Stone Size (Isbash) | Isbash riprap-sizing equation (public...; D50 = 1.2*64 / (2*32.2*0.86^2*1.65) = 76.8/78.59 = 0.977 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `riprap-tonnage` | Riprap Layer Volume and Tonnage | Layer take-off identity (first-princi...; volume = 500*2/27 = 37.0 cy; tons = 500*2*165/2000 = 82.5 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rock-construction-entrance` | Stabilized Construction Entrance Stone | Pad take-off identity (first-principles); volume = 50*14*0.5/27 = 13.0 cy; tons = 50*14*0.5*100/200... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `roof-ballast-weight` | Ballasted Roof Ballast Weight and Order | Ballasted single-ply roof ballast wei...; lb = 5000 x 12 = 60,000; tons = 30; cy = 60000/100/27 = 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `roof-insulation-fasteners` | Roof Board Fastener and Plate Count by Zone | Roof-board fastener identity (first-p...; fasteners = 100*8 + 20*12 + 5*16 = 800 + 240 + 80 = 1120;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `roof-pitch` | Roof Pitch | Project (first-principles); Pitch (rise / 12 run); angle = atan(rise/run) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `roof-underlayment-rolls` | Roof Underlayment Roll Count | Roofing underlayment roll-count ident...; rolls = ceil(2500*1.10/1000) = ceil(2.75) = 3 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `roofing-squares` | Roofing Squares and Bundles | Project (industry rule of thumb); 2200 ft^2 roof / 6:12 pitch (12% waste) / architectural s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rusle-soil-loss` | RUSLE Annual Soil Loss | RUSLE (USDA Agriculture Handbook 703); A = 150*0.32*1.5*1.0*1.0 = 72 tons/acre/yr; site = 72*5 =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sag-vertical-curve` | Sag Vertical Curve Length for Headlight SSD (AASHTO) | AASHTO Green Book (sag headlight crit...; spec-v636 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sag-vertical-curve-comfort` | Sag Vertical Curve Comfort and Drainage (AASHTO) | AASHTO Green Book (sag comfort criter...; spec-v638 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `scaffold-leg-load` | Scaffold Per-Leg Load and OSHA 4:1 Check | OSHA 1926.451(a)(1) capacity rule (fi...; total = 100+500+500 = 1,100; leg = 1100/4 = 275; SWL = 25... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `scaffold-mudsill-bearing` | Scaffold Mudsill Bearing Pressure and Sill Length | Bearing-pressure identity / OSHA 1926...; area = 9.25*24/144 = 1.542 ft^2; bearing = 4000/1.542 = 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `scaffold-takeoff` | Frame Scaffold Material Takeoff | Frame-scaffold takeoff geometry (firs...; bays = ceil(40/7) = 6; frames = 7*3 = 21; braces = 2*6*3 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sealant-joint-yield` | Caulk / Sealant Cartridge Yield from Joint Size | Sealant cartridge-yield identity (fir...; cross = 0.375*0.25 = 0.09375 in^2; lf/cart = 20.5/0.09375... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `section-properties` | Cross-Section Properties (A, I, S, r) | mechanics of materials; spec-v342 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sediment-basin-volume` | Sediment Basin / Trap Storage Volume | Sediment-basin storage identity (cons...; required = 5*3600 = 18,000 cf (667 cy); surface = 18000/3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seismic-base-shear` | Seismic Base Shear (ASCE 7 §12.8 Equivalent Lateral Force) | ASCE 7 §12.8 equivalent lateral force; spec-v226 section 2.1 pinned example (short period) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seismic-design-spectral-acceleration` | Design Spectral Response Accelerations SDS / SD1 (ASCE 7-22 11.4) | ASCE 7-22 11.4; spec-v381 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `seismic-overturning-moment` | Seismic Overturning Moment (ASCE 7 §12.8.5) | ASCE 7-22 §12.8.5 (Overturning) with ...; spec-v480 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seismic-pdelta-stability` | Seismic P-Delta Stability Coefficient (ASCE 7-22 12.8.7) | ASCE 7-22 12.8.7; spec-v383 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seismic-story-drift` | Seismic Design Story Drift and Allowable Limit (ASCE 7-22 12.8.6 / 12.12) | ASCE 7-22 12.8.6 / 12.12; spec-v382 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seismic-vertical-distribution` | Vertical Distribution of Seismic Forces (ASCE 7 §12.8.3) | ASCE 7-22 §12.8.3 / §12.8.4 (Eqs. 12....; spec-v477 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `self-leveler-bags` | Self-Leveling Underlayment Bag Count | Self-leveler bag-count identity (firs...; neat = 500*0.25/6.25 = 20; bags = ceil(20*1.05) = 21 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `settlement-limit-load` | Allowable Load for a Settlement Limit (NC Clay) | Terzaghi primary consolidation solved...; spec-v648 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sfrm-takeoff` | Spray Fireproofing (SFRM) Material Takeoff | SFRM material-takeoff identity (first...; volume = 5000*1.5/12 = 625 ft^3; weight = 9,375 lb; bags ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shaft-diameter-for-torsion` | Solid Shaft Diameter for an Allowable Torsion | mechanics of materials (solid shaft, ...; spec-v747 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shaft-torsion` | Shaft Torsional Shear Stress and Angle of Twist | mechanics of materials; spec-v359 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shear-stud-strength` | Composite Shear Stud Strength and Count (AISC 360-22 I8) | AISC 360-22 I8; spec-v411 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shearwall-deflection` | Wood Shear Wall Deflection (SDPWS Eq 4.3-1) | AWC SDPWS Equation 4.3-1 (AWC/APA des...; spec-v274 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shearwall-overturning` | Wood Shear Wall Unit Shear and Holdown (SDPWS / ASD) | AWC SDPWS segmented shear wall + ASCE...; spec-v273 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sheathing-takeoff` | Wall / Roof Sheathing Panel and Nail Takeoff | Sheathing takeoff identity (first-pri...; sheets = ceil(1600*1.08/32) = ceil(54.0) = 54; nails = 54... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shielding-gas-runtime` | Shielding-Gas Cylinder Runtime and Cost | Torch / regulator maker's flow charts...; 35 cfh, 120 min arc-on, 251 ft3 cylinder, $60/cylinder ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `shingle-nails` | Roofing Nail Count by Wind Zone | Roofing fastener-count identity (firs...; nails = 30*80*6 = 14,400; weight = 14400/140 = 102.9 lb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shore-post-load` | Formwork Shore Post Load and Spacing (ACI 347) | ACI 347 Guide to Formwork for Concrete; spec-v245 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `shotcrete-rebound-quantity` | Shotcrete / Gunite Order Quantity with Rebound | Rebound gross-up identity (first-prin...; in-place = 500*(4/12)/27 = 6.173 cy; shot = 6.173/0.80 = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `siding-takeoff` | Lap / Panel Siding Squares and Linear Footage | Siding-takeoff identity (first-princi...; net = 2000-200 = 1800; squares = 1800*1.12/100 = 20.16; l... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sill-plate-anchor-count` | Sill-Plate Anchor Bolt Count (IRC R403.1.6) | IRC R403.1.6 anchor-count rule; effective = 40 - 2*(9/12) = 38.5 ft; bolts = max(2, ceil(... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `silt-fence-drainage` | Silt Fence Drainage-Area and Length Check | Silt-fence drainage-area guideline (g...; required = 0.5*400 = 200 ft (250 adequate); max area = 25... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `slab-dowel-schedule` | Slab Load-Transfer Dowel Schedule (ACI 302) | Slab load-transfer dowel schedule (AC...; per joint = floor((40*12-2*6)/12)+1 = floor(468/12)+1 = 3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sliding-snow-load` | Sliding Snow Load on a Lower Roof (ASCE 7 7.9) | ASCE 7 §7.9; spec-v469 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `slope-failure-depth-for-fs` | Infinite Slope Critical Depth for a Target FS | Infinite-slope stability (Das / NAVFA...; spec-v749 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `slope-stability-infinite` | Infinite Slope Stability Factor of Safety | Infinite-slope stability (Das / NAVFA...; spec-v289 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `slope-stability-seepage` | Infinite Slope Stability with Seepage | Infinite-slope seepage stability (Das...; spec-v627 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `slope-stake-cut-fill` | Slope-Stake Cut and Fill | FM 5-233 / FHWA construction-survey g...; existing 104.5, design 100.0 -> 4.5 ft cut; 2:1 slope, of... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sloped-backfill-earth-pressure` | Sloped-Backfill Earth Pressure (Rankine Inclined Surface) | Rankine sloped-backfill as compiled i...; spec-v626 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `snow-drift-load` | Snow Drift Surcharge at a Roof Step or Parapet (ASCE 7 Ch. 7) | ASCE 7-22 Chapter 7; spec-v297 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `snow-load` | Flat-Roof Snow Load | ASCE; Pg=30 psf ground snow / Ce=Ct=Is=1.0 -> Pf=21 psf flat-ro... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `snow-unbalanced-gable` | Unbalanced Snow Load on Gable Roof (ASCE 7 7.6.1) | ASCE 7-22 Section 7.6.1 (unbalanced s...; pg 30, ps 25, 4:12, W 30 ft -> applies; windward 7.5, lee... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soffit-ridge-vent-count` | Soffit Vent and Ridge-Vent Count from Required NFA | Attic vent-count identity (first-prin...; total=1500/300*144=720; intake=360; soffit=ceil(360/26)=1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soil-bearing-capacity` | Shallow Foundation Bearing Capacity (Vesic) | Das, Principles of Foundation Enginee...; spec-v260 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soil-consolidation-settlement` | Primary Consolidation Settlement (NC Clay) | Terzaghi primary consolidation (Das /...; spec-v308 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soil-phase-relations` | Soil Phase Relations (Void Ratio, Porosity, Saturation) | Soil phase relations (Das / NAVFAC); spec-v327 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soil-settlement-elastic` | Shallow Foundation Elastic (Immediate) Settlement | Theory-of-elasticity immediate settle...; spec-v287 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soil-stabilization-quantity` | Soil Stabilization (Lime / Cement) Quantity | Stabilizer-quantity identity (first-p...; spread = 0.06*110*(8/12)*9 = 39.6 lb/sy; tons = 39.6*1000... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `soil-swell-shrink` | Soil Swell / Shrinkage Volume Conversion | Caterpillar Performance Handbook soil...; 100 bank cy common earth, swell 25%, shrink 15% -> 125 lo... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `speeds-feeds` | Shop Speeds and Feeds | Machining Data Handbook / project bun...; drill / steel / 0.5 in / 2 flutes -> SFM 80, chipload 0.0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spoil-setback` | Trench Spoil Pile Setback and Surcharge | OSHA 29 CFR 1926.651(j) / Subpart P; 10 ft trench, 4 ft pile at 34 deg, 2 ft minimum -> 5.93 f... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spray-foam-board-feet` | Spray Foam Board-Feet and Set Count | Spray-foam board-feet identity (first...; board-feet = 2000*3 = 6,000; sets = ceil(6000*1.10/4800) = 2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spt-bearing-capacity` | SPT Allowable Bearing on Sand (Meyerhof) | Meyerhof / Das; spec-v415 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spt-required-n60` | Required SPT N60 for a Target Bearing (Meyerhof) | Meyerhof / Das; 5 ksf target, B 6 ft, D 2 ft -> N60 ~19.86 (design 20) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `square-footage` | Square Footage | Project (first-principles); 10 ft x 12 ft rectangle -> 120 ft^2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `stair-code-check` | Stair Geometry Code Check (IBC 1011 / IRC R311) | IBC 2021 §1011.5.2 / §1011.2 (by sect...; spec-v481 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stair-stringer` | Stair Stringer Length | Project (first-principles); 9 ft rise / 12 ft run -> 180 in stringer (15 ft); 21.09 B... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `stair-stringer-layout` | Stair Stringer Layout (with code check) | IRC R311 (residential stair geometry;...; 108 in rise / 6.75 in preferred riser -> 16 risers / 6.75... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `stairs` | Stair Calculator | Project (first-principles); IRC R311.7 stair geometry; 7.5 in preferred riser | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `steel-beam-flexure` | Steel Beam Flexural Capacity (AISC 360 Ch. F, Compact + Braced) | AISC 360-22 Chapter F / Steel Constru...; spec-v254 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-beam-ltb` | Steel Beam Lateral-Torsional Buckling (AISC 360 F2) | AISC 360-22 Section F2 (AISC Manual W...; spec-v281 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-beam-shear` | Steel Beam Web Shear Capacity (AISC 360 Ch. G) | AISC 360-22 Chapter G / Steel Constru...; spec-v255 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-block-shear` | Steel Block Shear Rupture (AISC 360 J4.3) | AISC 360-22 Section J4.3; spec-v282 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-bolt-slip-critical` | Slip-Critical Bolt Design Strength (AISC 360 J3.8) | AISC 360-22 J3.8 / Table J3.1; spec-v294 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-bolt-tension-shear` | Bolt Combined Tension and Shear (AISC 360 J3.7) | AISC 360-22 J3.7; spec-v316 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-camber` | Steel Beam Camber from Dead-Load Deflection | AISC / fabrication practice; spec-v413 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-column-capacity` | Steel Column Compressive Capacity (AISC 360 Ch. E, Flexural Buckling) | AISC 360-22 Chapter E / Steel Constru...; spec-v256 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-doubler-plate` | Panel-Zone Doubler-Plate Thickness (AISC 360 J10.6) | AISC 360-16 Section J10.6 (panel-zone...; W14 column, 300-kip demand: phiRn_bare 183 kip, shortfall... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-effective-length-k` | Column Effective Length Factor K (Alignment Chart) | AISC alignment chart (Dumonteil fit); spec-v315 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-fillet-weld-size` | Fillet Weld Size Limits and Effective Throat (AISC 360 J2.2b) | AISC 360-22 Table J2.4 / J2.2b; spec-v295 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-floor-vibration` | Steel Floor Walking Vibration (AISC DG11) | AISC Design Guide 11 (2nd ed.) walkin...; fn 5 Hz, W 30000 lb, beta 0.03, P0 65 lb, limit 0.5% -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-h1-interaction` | Steel Beam-Column Combined Axial and Flexure (AISC 360 H1.1) | AISC 360-22 H1.1; spec-v314 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-inertia-for-deflection` | Required Moment of Inertia for a Deflection Limit | AISC / mechanics of materials (solved...; spec-v754 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `steel-panel-zone-axial` | Panel-Zone Shear Under High Column Axial (AISC 360 J10-10/J10-12) | AISC 360-16; Fy 50, dc 14, tw 0.5, Ag 26.5 (Py 1,325), Pr 600, not mod... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-panel-zone-shear` | Column Web Panel-Zone Shear (AISC 360 J10.6) | AISC 360-16 Section J10.6 (panel-zone...; W14 Fy50 dc14 tw0.5, 24 in beam, Mf 5500, Vcol 40, basic ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-tension-member` | Steel Tension Member: Yield and Rupture with Shear Lag (AISC 360 D2/D3) | AISC 360-22 Chapter D (D2 / D3, Table...; spec-v283 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `steel-web-local-strength` | Steel Web Local Yielding and Crippling (AISC 360 J10) | AISC 360-22 J10.2 / J10.3; spec-v293 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `step-flashing-count` | Roof Step-Flashing Piece Count | Roof step-flashing takeoff (one per s...; pieces = ceil(20*12/5) + 1 = 48 + 1 = 49; order = ceil(49... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stockpile-volume` | Conical Stockpile Volume and Tonnage | Right-circular-cone identity (first-p...; radius = 30; height = 30*tan(37) = 22.6 ft; volume = (1/3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `striping-paint-quantity` | Pavement Marking Paint and Glass Bead Quantity | Pavement-marking quantity identity (f...; area = 5280*4/12 = 1,760 sf; paint = 1760/320 = 5.5 gal; ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stucco-coverage` | Portland-Cement Plaster (Stucco) Material Takeoff | Portland-cement plaster bag-count ide...; bags = ceil(1000*0.875/10.1*1.10) = ceil(95.30) = 96 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stud-notch-bore-limit` | Wall Stud Notching and Boring Limits (IRC R602.6) | wall stud notch/bore limits (IRC R602.6); notch bearing = 0.25*5.5 = 1.375; bore single = 0.40*5.5 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `submerged-earth-pressure` | Submerged-Backfill Earth Pressure (Buoyant + Hydrostatic) | Rankine effective-stress as compiled ...; spec-v625 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `superelevation` | Superelevation / Min Curve Radius (AASHTO) | AASHTO Green Book; spec-v335 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `superelevation-safe-curve-speed` | Safe Curve Speed from Radius and Superelevation | AASHTO Green Book (solved for speed); spec-v756 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `suspended-ceiling-grid` | Suspended Acoustical Ceiling Grid Takeoff | Suspended-ceiling 2x4 grid takeoff ra...; panels = ceil(960/8) = 120; main = 240; cross = 480; wall... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `t-beam-effective-flange-width` | T-Beam Effective Flange Width (ACI 318-19 6.3.2) | ACI 318-19 6.3.2; spec-v393 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tapered-roof-insulation` | Tapered Roof Insulation Average Thickness and Quantity | Tapered-insulation identity (first-pr...; avg = 0.5 + 0.25*40/2 = 5.5 in; board-feet = 2000*5.5 = 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `thermal-stress-max-deltat` | Max Temperature Change for a Stress Limit | mechanics of materials (inverse); spec-v674 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `thermal-stress-restrained` | Restrained Thermal Stress and Force | mechanics of materials; spec-v360 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `thinset-coverage` | Thin-Set Mortar Coverage | Manufacturer thin-set coverage charts...; spec-v95 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tile-count` | Tile Count and Grout Volume | Project (first-principles); 100 ft^2 with 12x12 tiles, default 1/8 in grout, 10% wast... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `traffic-taper-length` | Work-Zone Merging Taper Length and Device Count (MUTCD) | MUTCD merging-taper identity (public-...; S >= 45: L = 12*55 = 660 ft; devices = ceil(660/40)+1 = 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `trim-linear-footage` | Trim Linear Footage and Miters | finish-carpentry practice; spec-v440 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `unit-cost-earthwork` | Earthwork Production Unit Cost | Production unit-cost identity (first-...; hourly = 150+65 = 215; unit cost = 215/656 = $0.328/cy | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vapor-barrier-rolls` | Under-Slab Vapor Barrier Rolls and Seam Tape | Roll-takeoff identity (first-principles); rolls = ceil(3000*1.10/1000) = ceil(3.3) = 4; seam tape =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vertical-curve` | Vertical Curve Elevations | AASHTO Green Book / FM 5-233 (by name); g1 +3, g2 -2, L 400, PVI sta 5000 elev 100 -> BVC 94.00, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vertical-curve-sight-distance` | Crest Vertical Curve Length for SSD (AASHTO) | AASHTO Green Book; spec-v336 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vessel-head-volume` | Dished Tank / Vessel Head Volume | dished-head volume geometry (first-pr...; V = pi*48^3/24 = 14476.5 in3; gal = 14476.5/231 = 62.67 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wall-bracing-length` | Braced-Wall-Panel Length (IRC R602.10) | IRC R602.10 (wall bracing); 40 ft line at 20% -> 8 ft required; 9 ft provided -> pass | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wallpaper-rolls` | Wallcovering Roll Takeoff With Pattern Repeat | Wallcovering industry estimating prac...; spec-v214 section 2.1 pinned example (Euro roll, modest r... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `water-cement-ratio` | Water-Cementitious Ratio and Exposure Cap (ACI 318) | ACI 318 Table 19.3.2.1; ACI 211.1 (wa...; 282 lb water / (470 cement + 94 fly ash = 564) = 0.50, ex... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `water-for-compaction` | Water to Reach Optimum Moisture for Compaction | Gravimetric water-content identity (f...; dry weight = 100*27*105 = 283,500 lb; water = 0.05*283,50... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `weld-cost-per-foot` | All-In Welding Cost per Foot | AWS welding cost and consumable refer...; 0.10 lb/ft, 95% eff, $2.50/lb, 8 lb/hr, 30% factor, $65/h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `weld-dilution` | Weld Dilution Ratio | welding metallurgy / AWS; spec-v356 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weld-duty-cycle` | Welder Duty Cycle | NEMA EW-1 inverse-square duty-cycle r...; 250 A at 60% -> at 300 A: 41.67%, A100 193.6 A | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `weld-group-eccentric` | Eccentric Fillet Weld Group (Elastic Method) | AISC 360 / Steel Construction Manual ...; 12 kip at 6 in, two 10 in welds 4 in apart -> J 246.7 in3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weld-heat-input` | Welding Heat Input | AWS D1.1 / ASME BPVC Section IX (by n...; 25 V, 200 A, 8 in/min, eta 0.8 -> arc energy 37500 J/in, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `weld-metal-volume` | Weld Deposit Weight, Filler, and Pass Count | first-principles joint geometry and s...; 5/16 in fillet, 120 in, 0.90 eff -> 0.0488 in2, 1.66 lb d... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weld-passes-arc-time` | Weld Passes and Arc Time to Fill a Groove | welding-cost estimating; spec-v357 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weld-preheat-fuel` | Weld Preheat Energy and Fuel | Carbon-steel specific heat / propane ...; 200 lb, 70 to 300 degF, 25% efficiency -> 5,060 Btu, 20,2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `weld-transverse-shrinkage` | Weld Transverse Shrinkage and Pre-Set | Blodgett, Design of Welded Structures; 0.10 in2 weld in 1/2 in plate, 3 welds -> 0.040 in per we... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weld-travel-speed` | Weld Travel Speed for a Target Heat Input | AWS / ASME; spec-v358 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weld-usage` | Welding Rod and Wire Usage | AWS / Lincoln / Miller welding-engine...; GMAW / 0.05 in^2 cross-section / 120 in weld / 4 lb/min -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `welded-wire-mesh` | Welded-Wire Reinforcement (Mesh) Sheet Takeoff | Lapped-coverage identity (first-princ...; effective = (5-0.5)(10-0.5) = 42.75 sf; gross = 2000*1.05... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wind-cc-pressure` | Wind Components and Cladding Pressure (ASCE 7 Ch. 30) | ASCE 7-22 Chapter 30; spec-v296 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wind-mwfrs-pressure` | MWFRS Wall Pressure (ASCE 7 Ch. 27) | ASCE 7-22 Chapter 27; spec-v298 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wind-pressure` | Wind Velocity Pressure | ASCE; 100 mph basic wind, Exposure C (Kz=0.98 at 30 ft per ASCE... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wind-solid-sign` | Wind Force on Solid Freestanding Wall / Sign | ASCE 7-22 Section 29.3 (solid freesta...; qh 17 psf, G 0.85, Cf 1.35, As 64 ft^2, B 8 ft -> F 1248 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wind-speed-from-velocity-pressure` | Basic Wind Speed from Velocity Pressure | ASCE; 25 psf bare velocity pressure -> 98.8 mph equivalent basi... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wire-feed-deposition` | Wire Feed Speed to Deposition Rate | first-principles wire-volume geometry...; 0.035 in wire, 300 in/min, 0.92 eff -> 4.91 lb/hr melt, 4... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wire-feed-speed-for-deposition` | Wire Feed Speed for a Target Deposition Rate | first-principles wire-volume geometry...; 6 lb/hr, 0.035 in wire, 0.92 eff -> ~398 in/min, 6.52 lb/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wood-beam-bending` | Wood Bending Member (NDS Beam Stability Factor CL and Adjusted Fb') | NDS 3.3.3 (National Design Specificat...; spec-v263 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-beam-shear` | Wood Bending Member Shear (fv and the NDS Tension-Side End-Notch Reduction) | NDS 3.4.2 / 3.4.3.2 (National Design ...; spec-v264 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-bearing-perpendicular` | Wood Bearing Perpendicular to Grain (NDS 3.10) | NDS 2018 3.10.2 / 3.10.4; spec-v290 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-bolt-connection` | Single-Shear Bolted / Dowel Lateral Design Value (NDS Yield-Limit Z) | NDS Table 12.3.1A (National Design Sp...; spec-v265 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-combined-bending-axial` | Wood Beam-Column Interaction (NDS 3.9.2) | NDS 2018 3.9.2 (Eq. 3.9-3); spec-v292 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-lag-withdrawal` | Lag Screw Withdrawal Design Value (NDS 12.2.1) | NDS 2018 12.2.1; spec-v333 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-nail-withdrawal` | Nail Withdrawal Design Value (NDS 12.2.3) | NDS 2018 12.2.3; spec-v332 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-screw-withdrawal` | Wood Screw Withdrawal Design Value (NDS 12.2.2) | NDS 2018 12.2.2; spec-v334 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wood-tension-member` | Wood Tension Member Parallel to Grain (NDS 3.8) | NDS 2018 3.8.1; spec-v291 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group F Fire-ground (48 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `aerial-ladder` | Aerial Ladder Reach | Project (first-principles); 100 ft extension at 70 deg elevation -> horizontal 34.20 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `braking-distance` | Vehicle Braking Distance | Project (first-principles); braking = v^2 / (30 * mu) = 55*55 / 21 = 144.0 ft; reacti... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `confined-space-purge` | Confined Space Air Change Time | 29 CFR 1910.146 + ACGIH ventilation e...; 2000 ft^3 / 1000 cfm / 7 target purges -> 14 min purge | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `confined-space-vent` | Confined-Space Pre-Entry Ventilation (OSHA 1910.146) | OSHA / NIOSH; V=1000 ft^3; minutes_to_purge = 1000 * 7 / 200 = 35 min; ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `draft-lift-max` | Drafting Maximum Lift (Altitude-Corrected) | IFSTA / NWCG firefighter math; 3,000 ft, 0.667 factor, no suction loss -> 30.9 ft theore... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drypipe-air-compressor` | Dry-Pipe / Preaction Air Compressor CFM | dry-pipe air compressor sizing (NFPA 13); ft3 = 400/7.48 = 53.48; CFM = 53.48*(40/14.7)/30 = 4.85 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `elevation-pressure-loss` | Elevation Pressure Loss / Gain | Hydrostatic head 0.434 psi/ft + IFSTA...; 9 floors above pump -> exact ~39.06 psi, rule 45 psi | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fall-arrest-clearance` | Required Fall-Arrest Clearance (ANSI Z359) | ANSI Z359.1 / OSHA 1926 Subpart M; free fall 6 + deceleration 3.5 + worker 5 + margin 3 = 17... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fire-friction` | Fire Hose Friction Loss | National Fire Academy; FL = C * Q^2 * L; 2.5 in C = 2; FL = 2 * (2.5)^2 * 2 = 25... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fire-pump-curve` | Fire Pump Rated / Churn / Overload Curve Check (NFPA 20) | NFPA 20 (Standard for the Installatio...; spec-v248 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `fire-stream-reaction` | Nozzle / Fire-Stream Reaction Force | IFSTA Pumping Apparatus Driver/Operat...; 1.0 in smooth bore @ 50 psi -> NR = 1.57 * 1 * 50 = 78.5 lb | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `foam` | Foam Concentrate | NFPA; 1500 ft^2 fire / 0.10 gpm/ft^2 application / 3% concentra... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `foam-eductor-limit` | Foam Eductor Back-Pressure / Hose-Lay Limit | IFSTA / eductor manufacturer data (TF...; 200 psi inlet, 95 gpm eductor, C 15.5, 100 psi nozzle, 30... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `foam-max-coverage-area` | Max Fire Area from Available Foam Concentrate | NFPA; 100 gal concentrate, 0.10 gpm/ft^2, 3%, 15 min -> 2,222 ft^2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hydrant-available-flow` | Hydrant Rated Flow at 20 psi (NFPA 291) | NFPA 291; spec-v389 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydrant-flow` | Hydrant Flow | NFPA; Q = 29.83 * c * d^2 * sqrt(P) = 29.83 * 0.9 * 6.25 * sqrt... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `iowa-rate-of-flow` | Iowa Rate-of-Flow (Volume Method) | Iowa rate-of-flow formula (Royer-Nels...; 20 x 30 x 10 ft room = 6,000 ft3 -> 30 gal to control, 60... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `iso-nff` | ISO Needed Fire Flow | ISO Public Protection Classification ...; 5000 ft^2 / 2 stories / Class 2 / occupancy 1.0 / 50 ft e... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `jockey-pump-sizing` | Jockey (Pressure-Maintenance) Pump Sizing (NFPA 20) | jockey pump sizing (NFPA 20); jockey = max(0.01*750, 1) = 7.5; stop = 120+50 = 170; sta... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ladder-pipe-reach` | Ladder Pipe Reach | IFSTA Pumping Apparatus / ladder-pipe...; 70 deg / 100 ft extension / smooth_bore_1_75 / 80 psi -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `master-stream` | Master Stream Reach | IFSTA / fire-stream engineering practice; smooth_bore_1_75 / 80 psi -> 90 ft typical reach; pure ta... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `nfa-fireground-flow` | National Fire Academy Quick Fire-Flow | National Fire Academy / IFSTA; 40 x 60 ft, 50% involved, 1 floor, 2 exposures -> base 40... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `nfpa-1142-water-supply` | NFPA 1142 Rural Water Supply | NFPA; §5 WS = (V * CCN) / OHC = 30000 * 1.5 / 7 = 6,429 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pdp` | Pump Discharge Pressure | NFPA; PDP = NP + FL + elev_psi + appliance = 100 + 25 + 0.5*20 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `relay-pump-distance` | Relay Pumping Max Distance | IFSTA Pumping Apparatus Driver/Operator; 800 gpm, C 0.08, 200 psi pump, 20 psi intake, 10 ft uphil... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `required-fire-flow` | Required Fire Flow | ISO / NFPA 1142 area-based simplified...; 5000 ft^2 / ordinary / occupancy 1.0 / exposure 1.0 / com... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `reverse-lay-friction` | Reverse-Lay Friction Loss | IFSTA Pumping Apparatus / NFPA 1962 h...; 2.5 in / 250 gpm / 600 ft / 2 pumps -> 75 psi single-pump... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rope-ma` | Rope Rescue Mechanical Advantage | Project (first-principles); 4:1 rig (3 pulleys), efficiency 0.9, 600 lb load -> theor... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `scba-cylinder-time` | SCBA Cylinder Work Time | NFPA / NIOSH; Manufacturer rated scf / pressure; 33% low-air alarm; 40 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sling-angle` | Sling Angle Load Multiplier | OSHA 1926.251 + ASME B30.9 sling-angl...; 4000 lb / vertical / 2 legs -> 2000 lb per leg / choker_f... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `smoke-detector-spacing-count` | Spot Smoke / Heat Detector Count (Smooth Ceiling) | NFPA 72 spot-detector grid identity (...; rows=ceil(60/30)=2; cols=ceil(40/30)=2; detectors=4; wall... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `smoke-ejector-cfm` | Smoke Ejector / Ventilation CFM (NFPA 1500) | NFPA 1500 / IFSTA; CFM = 12000 x 5 / 60 = 1000; 1 fan; time = 12000 / 4000 =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `smoke-reading` | Smoke Reading Reference | IFSTA Building Construction for the F...; Reference compute returns the per-attribute table; runner... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `smooth-bore-diameter-for-flow` | Smooth-Bore Tip Diameter for a Target Flow | IFSTA Pumping Apparatus Driver/Operat...; spec-v738 section 2.1 pinned example (250 gpm, 50 psi -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `smooth-bore-flow` | Smooth-Bore Nozzle Flow (GPM) | IFSTA Pumping Apparatus Driver/Operat...; spec-v114 section 2.1 pinned example (1.125 in, 50 psi ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sprinkler-density` | Sprinkler GPM Density | NFPA; Ordinary Hazard Group 2 minimum density 0.20 gpm/ft^2; 15... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sprinkler-head-layout` | Sprinkler Head Count and Spacing (NFPA 13) | NFPA 13 (Standard for the Installatio...; spec-v250 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sprinkler-k-factor` | Sprinkler K-Factor Solver | NFPA 13 (sprinkler discharge relation); K 5.6 @ 7 psi -> Q = 5.6 * sqrt(7) = 14.816 gpm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sprinkler-pressure-demand` | Sprinkler Pressure Demand at the Base of Riser (NFPA 13) | NFPA 13 (Standard for the Installatio...; spec-v479 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sprinkler-protection-area-for-supply` | Max Sprinkler Design Area for a Water Supply (NFPA 13) | NFPA 13 (Standard for the Installatio...; 550 gpm supply, 250 gpm hose, 0.20 gpm/ft^2 -> 1,500 ft^2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sprinkler-system-demand` | Sprinkler System Demand and Water Supply (NFPA 13) | NFPA 13 (Standard for the Installatio...; spec-v249 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `standpipe-friction` | Standpipe Friction Loss | NFPA 14 (2024) standpipe hydraulics; 200 ft riser / 1 outlet @ 250 gpm / 100 ft 2.5 in outlet ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `standpipe-pdp` | Standpipe Pump Discharge Pressure (NFPA 14) | NFPA 14 / National Fire Academy; PDP = 100 + 8.46 supply FL + 25 appliance + 47.74 elevati... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tanker-fleet-size` | Tanker Shuttle Fill-Site-Limited Fleet Size | IFSTA / NFPA 1142 rural water-supply ...; 3,000 gal, 1,000 gpm fill and dump, 2 mi at 35 mph -> 12.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tanker-shuttle-cycle` | Tanker Shuttle Cycle Time | IFSTA / NFPA 1142 rural water-supply ...; 3,000 gal at 1,000 gpm fill and dump, 2 mi at 35 mph -> 3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tanker-shuttle-flow` | Tanker (Water Shuttle) Flow Capability | ISO PPC hauled-water credit / NFPA 1142; 3,000 gal tankers at 90%, 3 tankers, 12-min cycle -> 2,70... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `vacuum-lift-reading` | Vacuum Gauge to Drafting Lift Readout | IFSTA / NWCG fire-pump drafting practice; 10 in Hg at sea level -> 11.3 ft of head, 50% of the ~22.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `water-supply-duration` | Water-Supply Duration | Volume/flow continuity + NFPA 1142 co...; 3000 gal, 250 GPM, no resupply -> 12 min | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group G Cross-trade (63 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `belt-hp-transmitted` | Belt Power from Tension and Speed | belt-drive power relation (Machinery'...; spec-v807 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bolt-circle` | Bolt Circle Layout | First-principles circle-of-holes trig...; 8-in bolt circle, 6 holes, start 0 deg -> R 4, spacing 60... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bolt-proof-load` | Bolt Proof, Yield, and Tensile Load (SAE J429) | SAE J429 (ASME B1.1 tensile stress area); spec-v503 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `center-of-gravity-2point` | Center of Gravity from Two Scales | ASME B30.9 / ITI rigging references (...; readings 3000 and 1000 lb over 10 ft -> 4000 lb total, CG... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `circle-from-3-points` | Circle Through Three Points | First-principles coordinate geometry ...; (0,0),(4,0),(0,3) -> center (2, 1.5), radius 2.5 (right-t... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `circular-arc` | Circular Arc Layout | First-principles circle geometry (sag...; chord 24 in, rise 4 in -> radius 20 in, central angle 73.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `circular-arc-rise-from-radius` | Arc Rise (Sagitta) from Radius and Chord | First-principles circle geometry (sag...; chord 24 in, radius 20 in -> rise 4.0 in, central angle 7... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cone-flat-pattern` | Cone Flat-Pattern Development (Radial Line) | sheet-metal radial-line layout; spec-v400 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `decimal-to-fraction` | Decimal to Fraction | First-principles tape-measure arithmetic; 2.375 in to nearest 1/16 -> 2-3/8 in (whole 2, 3/8), error 0 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dilution` | Dilution / Mixing Ratio | Project (first-principles); C1*V1 = C2*V2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `equal-spacing` | Equal Spacing Layout | First-principles equal-spacing layout...; 60 in run, 1.5 in balusters, 4 in max gap -> 11 balusters... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fall-protection-clearance` | Fall Protection Clearance | 29 CFR 1926.502 (fall-protection syst...; 6 ft shock-absorbing lanyard / 5 ft worker height / 1 ft ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `flange-bolt-torque` | Flange Bolt-Up Torque | ASME PCC-1 / B16.5 (by name); 3/4 in B7 bolt (A_t 0.334 in^2) at 50% of 105 ksi yield, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gear-cascade` | Gear Ratio and RPM Cascade | First-principles / AGMA; overall = product of stage ratios; RPM_out = RPM_in/overa... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `geometry` | Geometry Pack | Project (first-principles); r=10 ft / sector 90 deg -> circumference 62.832 / area 31... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `haversine` | GPS Distance (Haversine) | Project (first-principles); Haversine identity over Earth radius 3958.8 mi | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `heat-stress` | Heat Stress (WBGT and Heat Index) | NWS; NWS Technical Attachment SR 90-23 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hydraulic-cylinder` | Hydraulic Cylinder Force and Speed | NFPA (fluid power); F = P*A; v = GPM*231/(60*A); A_extend = pi*(bore/2)^2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ladder-angle` | Ladder Placement Angle | OSHA; OSHA 1926.1053(b)(5) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `linear-interpolation` | Linear Interpolation | First-principles linear interpolation; (0,10) and (10,30), x = 4 -> y = 18, slope 2 (within range) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `loan-payment` | Loan Payment | Project (first-principles); Closed-form annuity-immediate at monthly rate r = APR/12/100 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `markup` | Markup and Margin | Project (first-principles); selling_price = cost * (1 + markup); margin = profit / price | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `material-cost` | Material Cost Estimator | Project (first-principles); Standard sales-line arithmetic | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mileage-cost` | Mileage and Fuel Cost | Project (first-principles); Standard fleet-cost arithmetic | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `niosh-lifting` | NIOSH Lifting Equation | NIOSH; 30 lb load / H=12 in / V=30 in / D=20 in / 0 deg asym / 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `noise-dose` | OSHA 1910.95 Noise Dose and TWA | OSHA; T = 8 / 2^((L-90)/5); D = sum(C/T)*100; TWA = 16.61 log10... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `overtime` | Overtime Hours | Project (first-principles); Standard FLSA / state DOL overtime schedule | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `per-diem` | Per-Diem (GSA) | U.S. General Services Administration ...; TX state-default M&IE -> $69/day; table lookup, exercises... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-fitting-takeout` | Fitting Take-Out Cut Length | NCCER Pipefitting / standard fitter's...; 24 in C-to-C, two 1 in threaded 90 ells (take-out 1.5 in,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-miter-cut` | Multi-Piece Miter Elbow Layout | NCCER Pipefitting / standard fabricat...; 3-piece 90 deg miter -> 22.5 deg at each of two cuts; 12.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-spacing-rack` | Insulated Pipe Rack Spacing | ASTM C585 + first-principles geometry...; 2.375 in OD + 1 in insulation -> 4.375 in insulated OD; +... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pipe-template-wrap` | Pipe Wraparound Template Ordinates | NCCER Pipefitting / standard layout r...; 45 deg cut on 6.625 in OD, 8 stations -> max ordinate 6.6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `polygon-miter` | Regular Polygon Miter and Layout | First-principles regular-polygon geom...; regular hexagon, side 12 in -> 30 deg miter, 120 deg inte... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `press-fit-interference-for-force` | Interference for a Target Press-Fit Holding Force | Lame interference-fit model (Machiner...; spec-v728 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `press-fit-pressure` | Interference Press-Fit Pressure and Holding Force (Lame) | Lame interference-fit model (Machiner...; spec-v511 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pulley-ma-gen` | Pulley System Mechanical Advantage | Project (first-principles); Triple block (block_3, 3 pulleys), efficiency 0.95 -> the... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pump-tdh` | Pump Total Dynamic Head (TDH) | Crane / Hazen-Williams; TDH = static + suction + discharge + fittings friction; h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `punch-capacity` | Punch Capacity: Max Hole or Thickness | First-principles shear (inverse); 9.8175 ton press, 0.5 in hole, 50,000 psi shear -> 0.25 i... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `punch-force` | Punch / Shear Force | First-principles shear + Machinery's ...; round 0.5 in hole, T 0.25 in, tau 50,000 psi -> 19,634.95... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rainwater-catchment-area` | Catchment Area for a Target Harvest | ARCSA / NOAA (inverse); 11,593 gal target, 30 in, 0.62 efficiency -> about 1,000 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rainwater-yield` | Rainwater Harvesting Yield | Project (first-principles); Standard 0.6233 gal-per-in-per-ft^2 conversion factor | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ramp-slope` | Ramp Slope (ADA) | Project (first-principles); ADA 4.8.2 1:12 maximum running slope (cited by name) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rolled-blank` | Rolled Plate Blank Length | First-principles arc-length geometry ...; OD 12 in, T 0.25 in, k 0.5 -> neutral 11.75 in, L 36.9137... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rolling-offset` | Rolling Offset | NCCER pipefitting / standard fitter's...; rise 12, roll 9 -> true offset 15; at 45 deg travel 21.21 in | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sales-tax` | Sales Tax | Texas Comptroller of Public Accounts; $1,000 subtotal in TX (6.25%) -> $62.50 tax / $1062.50 total | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shrink-fit` | Interference Shrink-Fit Temperature | first-principles thermal-expansion re...; 4 in fit, 0.004 in interference, 0.002 in clearance, stee... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sine-bar` | Sine Bar Angle Setup | First-principles sine-bar trigonometr...; 5-in sine bar on a 2.5-in stack -> arcsin(0.5) = 30.000 deg | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `slope-from-level` | Slope from Digital Level | Project (first-principles); Trig conversion arctan / tan | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tank-volume` | Tank Volume (Dipstick) | First-principles circular-segment geo...; 24 in dia x 48 in horizontal, depth 12 in (half) -> 47.00... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thread-measure-wire` | Three-Wire Thread Measurement | First-principles three-wire geometry ...; 1/2-13 UNC, E 0.45 in -> best wire 0.044412 in, M 0.51661... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thread-pitch` | Thread Pitch and Lead | First-principles 60-degree thread geo...; 1/4-20 UNC: 20 TPI -> 0.050 in pitch, 0.043301 in sharp-V... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thread-pitch-dia-from-wires` | Pitch Diameter from Three-Wire Measurement | First-principles three-wire geometry ...; 1/2-13 UNC, M 0.49 in over best wires -> E 0.423383 in | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `time-and-materials` | Time and Materials | Project (first-principles); Standard contracting cost-up identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `timesheet` | Daily Multi-Job Timesheet | Project (first-principles) over IRS s...; Five jobs / 47.5 total hours / 40 reg + 7.5 OT / $25 rate... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tip-out` | Tip Out | Project (first-principles); $600 pool, 8/4/4 hours -> 16 total hours, 50% / 25% / 25%... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tolerance-stack-rss` | Tolerance Stack-Up: Worst-Case and RSS | mechanical design / GD&T; spec-v399 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `trench-slope` | OSHA Trench Sloping | OSHA; Type A 0.75:1; Type B 1:1; Type C 1.5:1 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `unit-converter` | Unit Converter | NIST SI/customary unit conversion fac...; 100 ft -> meters: 30.48 m; pure unit conversion identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `upgrade-roi` | Upgrade ROI / Payback | Project (first-principles); NPV = -C + sum(S / (1+d)^i) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vbelt-drive` | V-Belt Sheave and Drive Sizing | ANSI/RMA / Gates; L = 2C + (pi/2)(D1+D2) + (D2-D1)^2/(4C); design_HP = HP*SF | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `vehicle-load` | Vehicle Load Distribution | Project (first-principles) over FMVSS...; 140 in wheelbase / 1000 lb payload at 60 in from cab / 88... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wind-chill` | Wind Chill Exposure | NWS; T_wc = 35.74 + 0.6215 T - 35.75 V^0.16 + 0.4275 T V^0.16 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wind-chill-wind-speed` | Wind Speed from Wind Chill and Temperature | NWS (2001 formula, solved for wind sp...; spec-v758 pinned example: 5 F air, -19 F wind chill -> ~2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group H References (15 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `color-codes` | Wire / Pipe / Gas Color Codes | NEC + APWA + project bundled color-co...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `defensible-space` | Defensible Space Reference | CALFIRE / NFPA defensible-space publi...; Returns 3 zones + citation; tested on the citation string... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `emergency-contacts` | Utility Locator and Emergency Contacts | Project bundled emergency contact ref...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `hand-signals` | Hand Signal Reference | 29 CFR 1926.1419 (crane) + ANSI A10.3...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `inspection-checklist` | Inspection Prep Checklist | Project bundled per-trade inspection ...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `irs-form-index` | IRS Form Quick-Read Index | IRS form library reference (project b...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `knot-reference` | Knot Reference | IFSTA + Mountaineers knot reference (...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `lab-safety-quickread` | Lab Safety Quick-Read (GHS + Spill) | GHS pictograms + spill decision tree ...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `loto-steps` | Lockout / Tagout Steps | 29 CFR 1910.147 (cited by section num...; Returns 9-step sequence + citation; tested on the citatio... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `osha-recordkeeping` | OSHA Recordkeeping Quick-Read | 29 CFR 1904 OSHA injury and illness r...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `osha-top10` | OSHA Top-10 Citations | OSHA (cited by publication name only;...; Returns publication string + items[10]; tested on the pub... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `sales-tax-nexus` | State Sales Tax Nexus Quick-Read | California (Cal. Rev. & Tax. Code 620...; CA -> $500,000 sales threshold; null transactions thresho... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `storm-shelter` | Storm Shelter Spec Reference | FEMA P-320 (cited by name only; figur...; Returns 5 topics + citation; tested on the citation strin... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `tool-maintenance` | Tool Maintenance Intervals | Project bundled tool maintenance sche...; Reference compute returns the per-attribute table; runner... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |
| `triage-quickread` | Field First Aid Triage Quick-Read | START / SALT triage protocols (projec...; Returns 4 categories + notice + citation; tested on the n... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |

### Group J Trucking (27 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `axle-load-distribution` | Axle-Load Tandem Slide | 23 CFR 658.17 federal weight limits +...; drive 35,200 (1200 over), trailer 32,000, L 400 in, 6-in ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bridge-formula` | Federal Bridge Formula and Axle Weights | FHWA; 23 CFR 658.17 Table B | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bridge-formula-min-spacing` | Bridge Formula Minimum Axle Spread | FHWA (Federal Bridge Formula B, solve...; spec-v656 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cargo-securement-wll` | Cargo Securement Working-Load-Limit Check | FMCSA 49 CFR 393.100-393.136; 8000 lb, 4 tiedowns x 1500 lb -> 6000 lb aggregate >= 400... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cost-per-mile` | Operating Cost Per Mile | ATRI cost-per-mile bucket methodology; $6000/10,000 mi, $4.00/gal at 6.5 mpg, $0.18 maint, $0.65... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `deadhead-percent` | Deadhead Percentage and Effective Rate | Freight-economics arithmetic + FMCSA ...; 800 loaded / 120 deadhead / $1840 -> 13.04% deadhead, $2.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `def-consumption` | Diesel Exhaust Fluid (DEF) Consumption and Range | DEF consumption and range model (SCR ...; spec-v508 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `detention-demurrage-billing` | Detention Billing and Opportunity Cost | carrier tariff practice; spec-v423 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dim-weight` | Dimensional Weight (DIM) | UPS / FedEx (carrier-published); UPS Service Guide divisor; FedEx Ground / Express also 13... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `driver-pay-cpm-vs-percentage` | Driver Pay: Cents-per-Mile vs Percentage | carrier settlement practice; spec-v424 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `freight-density` | Freight Density and NMFC Class | NMFTA; NMFTA NMFC density-class bracket (cited by name) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fuel-surcharge` | Fuel Surcharge per Mile | Standard pegged fuel-surcharge identi...; spec-v91 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fuel-tax-ifta` | IFTA Per-Jurisdiction Fuel Tax | IFTA Articles of Agreement; 1200 mi / 6 MPG = 200 gal; (200-150) x $0.30 = $15 net due | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gcwr-check` | Gross Combination Weight Check | 23 CFR 658.17 / 49 CFR 393.75 + GCWR ...; spec-v115 section 2.1 pinned example (18k + 60k = 78k, +2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hos-math` | Hours of Service Math | 49 CFR 395 (FMCSA hours of service fo...; property_70_8 / no events yet / 35 hr weekly used -> 11 h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `incoterm-decoder` | Incoterms 2020 Decoder | ICC Incoterms 2020 (cited by name only); FOB -> name 'Free On Board' / freight 'buyer' / export 's... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `invoice-factoring-cost` | Invoice Factoring Cost and Effective APR | freight-factoring practice; spec-v425 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `load-profitability` | Per-Load Net Profit | First-principles owner-operator load ...; spec-v91 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `maintenance-reserve` | Maintenance Reserve per Mile | First-principles owner-operator reser...; spec-v91 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pallet-loadout` | Pallet Cube and Trailer Loadout | GMA pallet (48 x 40 in) + 53 ft dry-v...; 12 x 10 x 8 in case @ 25 lb / 48 cases per pallet -> 26 p... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `reefer-burn` | Reefer Fuel Burn and Run Time | Thermo King published technical bulle...; Continuous SB / 50 gal tank / 24 hr / moderate / 1200 mi ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ssd-design-speed` | Max Design Speed from Sight Distance | AASHTO (inverse); 490.225 ft sight distance, dry level (f 0.35, t 2.5 s) ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `static-rollover-threshold` | Static Rollover Threshold | static stability factor (NHTSA); srt = (72/2)/80 = 0.45; speed = sqrt(0.45*32.174*200)*0.6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `stopping-sight-distance` | Stopping Sight Distance (AASHTO) | AASHTO; d_pr = 1.47*v*t_pr; d_br = v^2 / (30*(f+g)) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tire-load-check` | Tire Load-Rating Check (per Axle) | 49 CFR 393.75 + DOT sidewall marking; spec-v115 section 2.2 pinned example (capacity 12,350, ut... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `trailer-tongue-weight` | Trailer Tongue Weight and Sway Check | NHTSA / SAE J2807 towing tongue-weigh...; spec-v486 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `truck-off-tracking` | Low-Speed Off-Tracking (Swept Path) | AASHTO Green Book (low-speed off-trac...; OT = 50 - sqrt(2500 - 400) = 50 - 45.826 = 4.174 ft; effe... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group K Mechanic (90 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `abyc-dc-wire` | ABYC E-11 Marine DC Wire Sizing | ABYC E-11 DC wire sizing by voltage drop; spec-v517 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `aircraft-weight-balance` | Aircraft Weight and Balance (CG Envelope) | station-moment weight and balance (FA...; spec-v516 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `alternator-charging-load` | Alternator Charging Load Balance | automotive-electrical practice; spec-v464 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `anchor-rode-scope` | Anchor Rode Scope and Swing Radius | anchor rode scope and swing radius (s...; spec-v505 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ballnose-scallop-height` | Ballnose Milling Scallop Height from Stepover | Ballnose scallop geometry; spec-v319 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bearing-l10-life` | Rolling-Bearing L10 Rating Life (ISO 281) | ISO 281 basic rating life; spec-v504 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bearing-max-load` | Max Bearing Load for a Target L10 Life | ISO 281 basic rating life (inverse); spec-v672 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bolt-stretch` | Bolt Stretch and Clamp Load | Project (first-principles) over RCSC ...; 1/2 in steel / 3 in grip / 0.005 in stretch / K = 0.18 ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `boring-bar-deflection` | Boring Bar / Tool Overhang Deflection and L/D Limit | Cantilever tool deflection; spec-v318 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `boring-bar-max-overhang` | Boring Bar Max Overhang for a Deflection Limit | Cantilever tool deflection (inverse); 0.75 in steel bar, 100 lb, 0.01545 in allowable -> 6.0 in... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `brake-pad-life` | Brake Pad Lifespan and Heat Capacity | Project (first-principles) over SAE J...; 4000 lb / 30 mph speed delta / 1 stop/mi / ceramic / 12 m... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `brake-pedal-hydraulic` | Brake Pedal Ratio and Line Pressure | hydraulic brake force chain (Pascal's...; spec-v514 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chamber-cc-for-cr` | Chamber Volume for a Target Compression Ratio | SAE engine-geometry identities (inverse); 4.0 x 3.48 in cylinder, 10.73:1 target, 4.1 gasket bore /... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `climb-gradient-roc` | Climb Gradient to Rate of Climb | FAA TERPS / AIM (departure climb grad...; 300 ft/nm gradient at 120 kt -> 300 x 120 / 60 = 600 ft/m... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cooling-system-flow` | Cooling-System Coolant Flow for a Heat Load | heat-transfer first principles; spec-v398 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `countersink-depth` | Countersink Diameter and Cutting Depth | Machinery's Handbook countersinking; spec-v509 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `countersink-diameter-from-depth` | Countersink Diameter from a Plunge Depth | Machinery's Handbook countersinking (...; spec-v733 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `crosswind-component` | Crosswind and Headwind Component | runway wind-component resolution (FAA...; spec-v501 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `crouch-hp-for-speed` | Horsepower for a Target Planing Speed | Crouch's planing-speed formula (inverse); spec-v671 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `crouch-planing-speed` | Crouch Planing-Speed Estimate | Crouch's planing-speed formula; spec-v507 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cutting-diameter-for-rpm` | Cutter Diameter for a Spindle RPM | First-principles cutting geometry + M...; 100 SFM at 1000 RPM -> 0.382 in diameter | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cutting-fluid-concentration` | Cutting-Fluid Concentration | Metalworking-fluid refractometer method; spec-v100 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cutting-speed-rpm` | Machining Speed and Feed | First-principles cutting geometry + M...; 100 SFM, 0.5-in cutter, 2 flutes, 0.002 in/tooth -> 763.9... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `density-altitude` | Density Altitude and Pressure Altitude | FAA density-altitude method (ISA laps...; spec-v500 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `displacement-cr` | Engine Displacement and Compression Ratio | Project (first-principles) over stand...; 4.0 bore / 3.48 stroke / 8 cyl / 64 cc chamber / 4.1 gask... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dividing-head` | Dividing-Head Simple Indexing | First-principles indexing arithmetic ...; N 9 on a 40:1 head -> 4 turns + 4/9; on a 54-hole circle ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drill-point-angle-from-length` | Drill Point Angle from Tip Length | First-principles drill-point geometry...; 0.5-in drill, 0.15-in tip -> 118.1-deg point (59.0-deg lip) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drill-point-depth` | Drill Point Depth | First-principles drill-point geometry...; 0.5-in drill, 118-deg point, 1.0-in full depth -> 0.1502-... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `driveshaft-crit` | Driveshaft Critical Speed | Project (first-principles) over Spice...; 3.5 in OD / 0.083 in wall / 48 in long / steel -> 9823 rp... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `driveshaft-max-length` | Driveshaft Max Length for an Operating Speed | Project (first-principles, inverse) o...; 3.5 in OD / 0.083 in wall / steel, running at the 6,385.2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dynamic-compression-ratio` | Dynamic Compression Ratio | dynamic compression ratio (slider-cra...; Vc = 47.833/(10.5-1) = 5.035; piston@IVC = 3.036; Veff = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `dyno-correction-sae` | SAE J1349 Dyno Correction Factor | SAE J1349 dyno correction factor; spec-v515 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `engine-bmep` | Engine BMEP (Brake Mean Effective Pressure) | Brake mean effective pressure (SAE; H...; 350 CID at 400 lb-ft (4-stroke) -> 150.8 x 400 / 350 = 17... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `engine-fuel-burn-gph` | Engine Fuel Burn from Horsepower (BSFC) | BSFC engine-performance practice; spec-v463 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `et-horsepower` | Horsepower from Quarter-Mile ET | Hale quarter-mile ET relation (invers...; spec-v662 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `feed-for-surface-finish` | Feed for a Target Turned Finish | First-principles scallop geometry (in...; 25 uin Ra target, 1/32 in nose radius -> 0.005 IPR (round... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fuel-range` | Fuel Energy and Range | Project (first-principles); range = 18 * 28 * 1.0 = 504 mi; total_btu = 18 * 112000 =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gear-chordal-thickness` | Gear-Tooth Chordal Thickness (Caliper) | Machinery's Handbook / AGMA (gear-too...; half-angle 2.25 deg; tc = 4 sin(2.25) = 0.15704; ac = 0.1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gear-identification` | Gear Identification (Pitch from Teeth and OD) | Machinery's Handbook / AGMA (inverse ...; spec-v649 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gear-mph-rpm` | Gear-Ratio MPH from RPM | Drivetrain kinematics + SAE J267 tire...; 2500 RPM, 1:1, 3.55 axle, 28.5-in tire -> 59.71 MPH | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `glidepath-descent-rate` | Glidepath Rate of Descent | FAA Instrument Flying Handbook; TERPS...; 120 kt on a 3.0 deg glidepath -> 637 ft/min, 318 ft/nm (T... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grinding-wheel-rpm` | Grinding Wheel Surface Speed and Max Safe RPM | grinding wheel surface-speed identity...; max_rpm = 6500*12/(pi*7) = 3547; actual_sfpm = pi*7*3450/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `helical-spring-rate` | Helical Compression Spring Rate | Machinery's Handbook / Shigley; k = 11.5e6 x 0.080^4 / (8 x 0.75^3 x 8) = 471.04 / 27.0 =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hp-from-torque` | Horsepower from Torque and RPM | Classical mechanical power (Watt) + S...; 400 lb-ft at 5000 RPM -> 380.8 HP | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hull-displacement` | Hull Displacement and Block Coefficient | Hull displacement (Archimedes + block...; vol = 30*10*4*0.5 = 600; wt = 600*64 = 38400; long tons =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hull-speed` | Displacement Hull Speed and Speed/Length Ratio | displacement hull-speed relation (Fro...; spec-v502 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydraulic-drive-flow-limit` | Hydraulic Flow Limit from Drive Power | fluid-power engineering (inverse); 13.73 drive HP, 2000 psi, 0.85 efficiency -> 10 GPM (roun... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydraulic-motor-torque-speed` | Hydraulic Motor Torque and Speed | fluid-power engineering; spec-v397 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydraulic-pump-flow` | Hydraulic Pump Output Flow | fluid-power engineering; spec-v642 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `hydraulic-pump-horsepower` | Hydraulic Pump Drive Horsepower | fluid-power engineering; spec-v396 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `injector-max-hp` | Injector Max Horsepower Capacity | Fuel injector power capacity (inverse...; spec-v661 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `injector-size` | Fuel Injector Size from Horsepower, BSFC, and Duty Cycle | Fuel injector sizing (HP x BSFC / (n ...; spec-v323 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `keyseat-key-size` | Shaft Key and Keyseat Size (ANSI B17.1) | ANSI B17.1 Keys and Keyseats; spec-v513 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `knurl-blank-diameter` | Knurling Blank Diameter for Clean Tracking | knurl tracking rule (first-principles); teeth = round(pi*0.75*21) = round(49.48) = 49; blank = 49... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `machining-time` | Cut Time per Pass | First-principles cutting time + Machi...; 6 in at 500 RPM x 0.010 IPR -> 5 IPM, 1.2 min/pass, 4 pas... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `material-removal-rate` | Material Removal Rate | First-principles swept-volume geometr...; 0.5 x 0.1 x 10 IPM -> 0.5 in3/min | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `max-rpm-from-piston-speed` | Max RPM from a Piston-Speed Limit | Mean piston speed (engine building), ...; spec-v660 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mean-piston-speed` | Mean Piston Speed and RPM-Limit Reading | Mean piston speed (engine building); spec-v324 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `paint-mix-ratio` | 2K Paint Mix Ratio | Paint manufacturer technical data she...; spec-v100 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `prop-pitch-selection` | Marine Propeller Pitch Selection | outboard prop selection practice; spec-v462 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `prop-slip` | Marine Prop Slip | Project (first-principles); theoretical_kt = (4500/1.85) * 19 / 1215.2 = 38.03; slip ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `radial-chip-thinning` | Radial Chip Thinning Feed Compensation | Radial chip thinning geometry; spec-v317 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `reaming-drill-allowance` | Reaming Prebore (Drill) Allowance | machine-reaming stock allowance (Mach...; 0.5 in is in the 1/4-1/2 band (0.015); drill = 0.500 - 0.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `reserve-capacity-amp-hours` | Battery Reserve Capacity to Amp-Hours | BCI / SAE J537 reserve capacity; RC 120 min at the 25 A / 10.5 V / 80 F reserve rate -> 50... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `roller-chain-length` | Roller Chain Length in Pitches (ANSI B29.1) | ANSI B29.1 roller-chain length; spec-v512 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sacrificial-anode-life` | Sacrificial Anode Service Life | Sacrificial-anode life by Faraday's l...; 5 lb zinc (354 A-h/lb), 0.85 utilization, 0.15 A -> 1.14 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `screw-conveyor` | Screw / Auger Conveyor Capacity | CEMA Screw Conveyor standard (Book No...; 9 in screw, 2.5 in shaft, 9 in pitch, 40 RPM, 0.30 loadin... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `screw-conveyor-rpm` | Screw Conveyor Speed for a Target Capacity | CEMA Screw Conveyor standard (Book No...; 220.157 ft^3/hr, 9 in screw, 2.5 in shaft, 9 in pitch, 0.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spindle-max-mrr` | Max Material Removal Rate from Spindle Power | first-principles specific-cutting-ene...; 5 hp motor, 80% eff, unit power 1.0 (carbon steel) -> 4.0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spindle-power-torque` | Cutting Power and Spindle Torque | first-principles specific-cutting-ene...; 3.0 in3/min steel, 80% eff, 800 rpm -> 3.0 cutting hp, 3.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sprocket-pitch-diameter` | Sprocket Pitch Diameter (ANSI B29.1) | ANSI B29.1 sprocket geometry; spec-v801 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spur-gear-geometry` | Spur Gear Tooth Geometry (Diametral Pitch) | Machinery's Handbook / AGMA; spec-v401 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tailstock-setover` | Tailstock Setover for Taper Turning | Machinery's Handbook (Industrial Press); spec-v805 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tap-drill-size` | Tap Drill Size | First-principles 60-degree thread geo...; 1/4-20 UNC at 75% -> 0.201286 in (#7 drill 0.201 in); nea... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `taper-calc` | Taper per Foot and Angle | First-principles taper trigonometry +...; D 1.0, d 0.75, L 3.0 -> TPF 1.0 in/ft, angle/side 2.38594... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `taper-diameter` | Taper Missing Diameter (Lathe Setup) | First-principles taper trigonometry (...; spec-v650 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `taylor-tool-life` | Taylor Tool-Life vs Cutting Speed | Taylor tool-life equation (F.W. Taylor); T = (300/200)^(1/0.2) = 1.5^5 = 7.594 min; V = 300/15^0.2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tire-contact-patch` | Tire Contact Patch from Load and Pressure | first-order pneumatic-tire relation A...; spec-v808 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tire-gearing` | Tire Size and Effective Gear Ratio | Project (first-principles) over Tire ...; P265/70R17 -> 33x12.50R17 / 3.73 axle / 0.84 top gear / 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `torque-adapter-correction` | Torque Wrench Extension / Crowfoot Correction | Standard torque-adapter correction (S...; spec-v485 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `trap-speed-horsepower` | Horsepower from Quarter-Mile Trap Speed | Hale quarter-mile trap-speed relation; spec-v325 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `turbo-max-boost-for-charge-temp` | Max Boost Before a Charge-Air Temperature Limit | turbocharger charge-air-temperature m...; 250 F limit, 80 F inlet, 70% eff, 14.7 psia -> 15.0 psi m... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `turbo-pressure-ratio` | Turbocharger Pressure Ratio and Charge-Air Temp | turbocharger pressure-ratio and charg...; spec-v506 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `turn-radius-bank` | Coordinated Turn Radius and Rate | FAA Airplane Flying Handbook (coordin...; 120 kt at 30 deg bank -> 2208 ft radius, 5.25 deg/s rate ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `turning-surface-finish` | Theoretical Surface Finish | First-principles scallop geometry + M...; f 0.005 IPR, r 1/32 in -> Rt 100 uin, Ra 25 uin | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ujoint-operating-angle` | Driveline U-Joint Operating Angle and Cancellation | Cardan (Hooke) U-joint kinematics + c...; variation = 1/cos(10) - cos(10) = 1.01543 - 0.98481 = 0.0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `valve-flow-coefficient` | Valve Flow Coefficient (Cv) | ISA-75.01 / Crane TP-410 (control-val...; Cv 10, dP 25 psi, SG 1 -> Q = 10 * sqrt(25) = 50 gpm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `volumetric-efficiency` | Volumetric Efficiency and Airflow | Classical four-stroke airflow derivat...; 350 ci at 5500 RPM 4-stroke -> 557 CFM theoretical | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `waterline-for-hull-speed` | Waterline Length for a Target Hull Speed | displacement hull-speed relation (Fro...; 8 kn target displacement hull -> 35.6 ft waterline | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wheel-offset-backspacing` | Wheel Offset and Backspacing | wheel offset / backspacing conversion...; spec-v510 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group L Agriculture (69 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `anhydrous-ammonia-rate` | Anhydrous Ammonia Rate from Target Nitrogen | anhydrous ammonia rate (82-0-0); product = 180/0.82 = 219.5 lb; gal/ac = 219.5/5.15 = 42.6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `basal-area-prism` | Basal Area per Acre (Prism Cruise) | USDA Forest Service mensuration / Bit...; BAF-10, 8 trees in, 14 in DBH -> 80 ft^2/ac, 1.069 ft^2/t... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `bulk-density` | Soil Bulk Density and Compaction | USDA-NRCS; bulk_density = 200/150 = 1.333 g/cc; porosity = 1 - 1.333... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bunker-silo-capacity` | Bunker (Horizontal) Silo Forage Capacity | NRCS / MWPS forage storage sizing; A = (30+30)/2 x 8 = 240 ft^2; V = 240 x 100 = 24000 ft^3;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cattle-heart-girth-weight` | Cattle Live Weight from Heart Girth | Cattle live weight from heart girth (...; weight = 70^2 x 55 / 300 = 4900 x 55 / 300 = 269,500 / 30... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cattle-stocking-rate` | Cattle Stocking Rate (AUM) | USDA NRCS; available = 1500*160*0.40 = 96,000 lb; AUMs = 96,000/780 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `center-pivot-runtime` | Center-Pivot Application Depth and Runtime | USDA-NRCS center-pivot design / unive...; 800 gpm, 125 ac, 1 in gross, 85% -> 70.7 hr, 6.4 gpm/ac, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chipper-debris` | Brush Chip Volume and Haul Loads | First-principles green-weight to chip...; 4,400 lb of green wood, 550 lb/lcy, 15 cy box -> 8.0 loos... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `corn-yield-estimate` | Pre-Harvest Corn Yield (Yield Component Method) | Pre-harvest corn yield (yield compone...; kernels/ear = 16 x 35 = 560; bu/ac = 32 x 560 / 90 = 17,9... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `crop-yield` | Crop Yield and Harvest Loss | USDA NASS yield-strip identity (proje...; Corn / 2 rows @ 30 in / 50 ft strip / 8 lb / 18% moisture... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `crown-pruning-dose` | Live Crown Removal Limit (Pruning Dose) | ANSI A300 Part 1 / ISA BMP - Pruning; 15 of 100 live foliage, mature -> 15% removal, cap 25% (w... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drawbar-power` | Tractor Drawbar Power | ASABE; DBHP = pull * mph / 375 = 4500 * 4.5 / 375 = 54; PTO ~= 5... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drawbar-pull` | Tractor Drawbar Pull from Power | ASABE (inverse); 75 PTO hp at 4.5 mph on firm soil (0.72) -> 54 drawbar hp... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `drip-zone-flow` | Drip Zone Flow and Valve Capacity | Irrigation Association low-volume / m...; spec-v209 section 2.1 pinned example (inline dripline) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `feed-conversion-ratio` | Feed Conversion Ratio and Average Daily Gain | USDA / land-grant extension (animal s...; gain = 1250-650 = 600 lb; ADG = 600/200 = 3.0 lb/day; FCR... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `felling-notch-hinge` | Felling Notch and Hinge Geometry | ANSI Z133-2017 open-face felling; 20 in cut, 22% notch, 70 deg -> 4.4 in notch, 2.0 in hing... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fertigation-injection-rate` | Fertigation / Chemigation Injection Rate | Fertigation / chemigation injection rate; total = 5*40 = 200; injection = 200/6 = 33.333 gph = 0.55... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `firewood-cord` | Firewood Cord Volume | NIST Handbook 130 (Method of Sale); cords = 8 x 4 x 4 / 128 = 128/128 = 1.00 cord | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gpa-rate` | Chemical Application Rate (GPA) | Project (first-principles); Standard agricultural-sprayer calibration identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grain-aeration-airflow` | Stored-Grain Aeration Fan Airflow | MWPS / university extension (Shedd ai...; 20000 bu at 0.15 cfm/bu -> 3000 cfm, ~100 hr per cooling ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `grain-bin-capacity` | Grain Bin Capacity (Bushels) | USDA FGIS; area = pi*15^2 = 706.86; cyl = 14,137.2 ft^3; cone = (1/3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grain-bin-height-for-capacity` | Grain Bin Wall Height for a Target Capacity | Bin geometry first-principles (inverse); 12,875 bu, 30 ft dia, 8 ft cone, free-flow -> 20 ft wall ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `grain-drying-energy` | Grain Drying Energy and Fuel | grain-handling practice; spec-v418 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `grain-shrink-moisture` | Grain Drying Shrink and Net Bushels | USDA / land-grant extension; spec-v338 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `growing-degree-days` | Growing Degree Days | USDA / NWS GDD method + McMaster & Wi...; corn, Tmax 92 / Tmin 64 (modified) -> 25 GDD | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hay-dry-matter` | Hay Dry-Matter and Safe-Storage Weight | First-principles dry-matter balance +...; spec-v118 section 2.1 pinned example (over the 18% ceiling) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `irrigation-requirement` | Irrigation Requirement (ET-based, acre-feet) | FAO / USDA NRCS; ET_crop = 1.20*0.25*30 = 9.0 in; net = 9.0-1.0 = 8.0; gro... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `irrigation-uniformity` | Irrigation Sprinkler Uniformity | Irrigation Association / ANSI / ASABE...; 8 catch volumes around 100 mL -> mean 99.625 / CU 97.62 /... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `irrigation-zone-runtime` | Irrigation Zone Runtime and Cycle-and-Soak | Irrigation Association scheduling ref...; spec-v208 section 2.1 pinned example (clay lawn zone) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `livestock-dry-matter-intake` | Livestock Dry-Matter Intake and As-Fed Ration | NRC Nutrient Requirements; spec-v339 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `livestock-water-requirement` | Livestock Water Requirement | NRC / USDA NRCS water-intake guidance...; 50 head, 80 F between (40 F,8 gal) and (90 F,20 gal) -> 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `log-limb-weight` | Green Log and Limb Weight | USDA FPL Wood Handbook green density; 16 in butt / 16 in top, 8 ft red oak (density 64) -> 11.1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mad-irrigation-trigger` | Available Water and MAD Irrigation Trigger | FAO-56 / NRCS soil-water reservoir (MAD); TAW = (0.30-0.12)*24 = 4.32; RAW = 0.5*4.32 = 2.16; inter... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manure-application-rate` | Nutrient-Based Manure Application Rate | USDA NRCS Code 590; spec-v340 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manure-cover-savings` | Manure Storage Roof Savings (Covered vs Open) | USDA-NRCS Conservation Practice 313 (...; 8,000 ft2 pit, 6-in net precip + 4-in storm -> 6,667 ft3 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manure-nutrient-application` | Manure Nutrient Application Rate | USDA NRCS Code 590; spec-v419 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `manure-storage-volume` | Waste Storage Facility Volume (NRCS 313) | NRCS Conservation Practice Standard 3...; 150 ft3/day manure + 20 bedding, 120 days, 8,000 ft2 open... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mulch-topsoil-volume` | Mulch, Topsoil, and Aggregate Volume | landscape material take-off; spec-v417 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `nozzle-flow-pressure` | Nozzle Flow vs Pressure and Tip Selection | Spray-nozzle hydraulics / USDA land-g...; 0.4 gpm tip at 40 psi run at 60 psi -> 0.49 gpm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `npk-blend` | NPK Fertilizer Blend from Soil Test | USDA NRCS; rec = 130 N / 50 P2O5 / 25 K2O; DAP = 50/0.46 = 108.70 (N... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pearson-square-ration` | Pearson-Square Feed Ration | Pearson square (land-grant animal sci...; corn 9% / SBM 44% to 16% CP -> 80% corn, 20% SBM | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pesticide-rei-phi` | Pesticide REI / PHI Clock | EPA WPS 40 CFR 170 + product label; REI 12 hr, 4 hr elapsed -> 8 hr remaining; PHI 7 d, 2 d e... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pivot-application-rate` | Center-Pivot Outer-Span Application Rate vs Soil Intake | USDA-NRCS center-pivot design / unive...; 1-in pass, 1,320 ft pivot, 24-hr revolution, 100-ft band ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pivot-timer-depth` | Center-Pivot Percent-Timer to Depth | USDA-NRCS center-pivot design / unive...; 800 gpm, 125 ac, 20-hr full-speed pass, timer 50% -> 40-h... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `plant-spacing-count` | Plant Spacing Count (Square and Triangular) | Nursery / landscape estimating refere...; spec-v210 section 2.1 pinned example (1 ft on center) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `porta-wrap-friction` | Friction-Device Hold Force by Wraps | Capstan (Euler-Eytelwein) / ANSI Z133...; 800 lb load side, friction 0.20 -> 1 wrap 227.7 lb, 2 wra... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `quadratic-mean-diameter` | Quadratic Mean Diameter (from a Tally) | USDA Forest Service forest-mensuratio...; Five-tree tally 8, 10, 10, 12, 14 in -> sum_sq 604, QMD s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `reineke-sdi` | Reineke Stand Density Index | Reineke Stand Density Index (Reineke ...; 300 TPA, QMD 10 in, SDI_max 400 -> SDI 300, 75% of max (u... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `seed-rate` | Planting Density and Seed Rate | Project (first-principles); 30 in rows / 32,000 plants/ac target / 1,500 seeds/lb / 9... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sod-takeoff` | Sod Takeoff (Slabs and Pallets) | Turfgrass producer / landscape estima...; spec-v211 section 2.1 pinned example (residential lawn) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spray-drift-buffer` | Downwind Spray Drift Buffer | USDA land-grant extension drift-manag...; Medium droplets (base 20 ft), 15 mph, 30 in boom, 20 in r... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `sprayer-calibration` | Sprayer 1/128-Acre Calibration | USDA Cooperative Extension Service; travel_distance_ft = 43560/128 / boom_width; gpa = oz_per... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sprayer-field-capacity` | Sprayer Field Capacity and Spray Time | USDA land-grant extension sprayer fie...; 30 ft boom, 6 mph, 70% eff, 80 acres, 300 gal tank, 15 GP... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+2 more) |
| `sprinkler-gpm-for-precip` | Sprinkler Zone Flow for a Target Precip Rate | Irrigation Association / Rain Bird / ...; spec-v736 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sprinkler-precip-rate` | Sprinkler Precipitation Rate | Irrigation Association / Rain Bird / ...; spec-v207 section 2.1 pinned example (rotor lawn zone) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tank-mix` | Pesticide Tank-Mix and Acres per Tank | EPA / USDA NRCS; acres/tank = 300/15 = 20; product/tank = 20*1.5 = 30 pt; ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thi-livestock` | Temperature-Humidity Index (Livestock) | USDA-ARS / K-State Extension; THI = T_F - (0.55 - 0.0055*RH) * (T_F - 58) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `thinning-target-tpa` | Thinning Target TPA From a Target SDI | Reineke 1933 / USDA FS stocking-guide...; SDI_max 450 at 35%, QMD 10 in, current 300 TPA -> target ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `timber-cruise` | Timber Cruise (Doyle / Scribner / International 1/4) | Project (first-principles); Doyle rule (public-domain timber-cruising convention) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tractor-ballast` | Tractor Ballast for a Target Weight-to-Power Ratio | tractor ballasting rule (ASABE); target = 125*180 = 22500; change = 22500 - 18000 = 4500 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tree-crz-encroachment` | Critical Root Zone Encroachment Percent | ANSI A300 Part 5 tree protection / ar...; 20-in DBH, 1.0 ft/in factor (R 20 ft), limit line 5 ft fr... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tree-height-clinometer` | Clinometer Tree Height (Percent-Slope) | USDA Forest Service mensuration / hyp...; H = 100 x (58 - (-4))/100 = 62 ft (58 ft above eye + 4 ft... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tree-open-cavity` | Open-Cavity Trunk Strength Loss (Smiley & Fraedrich) | Smiley & Fraedrich (1992) open-cavity...; 24-in trunk, 3-in wall, 8-in opening -> R 0.106, open los... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tree-protection-zone` | Tree Protection / Critical Root Zone | ANSI A300 Part 5 / ISA critical root ...; 20 in DBH, 1.0 ft/in standard -> 20 ft radius, 1257 ft^2 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tree-rigging-shock` | Tree Rigging Shock (Dynamic) Load | Arborist rigging research / ANSI Z133...; 500 lb, 3 ft drop, 30 ft rope at 5% -> 1.5 ft stretch, 1,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `trunk-decay-strength` | Hollow / Decayed Trunk Strength Loss | Wagener 1963 / Mattheck t/R / ISA TRAQ; 24 in trunk, 4 in sound shell (hollow 16) -> 29.6% loss, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `trunk-min-shell-thickness` | Minimum Sound Shell for an Allowable Trunk Strength Loss | Wagener 1963 / Mattheck t/R / ISA TRA...; 24 in trunk held to 29.6% loss -> 4.0 in min shell, t/R 0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `two-stroke-mix` | Two-Stroke Fuel Mix | First-principles volume arithmetic (s...; 50:1, 1 US gallon -> 2.56 fl oz (75.71 mL) of oil | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `two-stroke-mix-ratio-check` | Two-Stroke Mix Ratio Check | First-principles volume arithmetic (i...; spec-v653 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group M Water and wastewater (61 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `aeration-oxygen-demand` | Activated-Sludge Oxygen and Blower Air Demand | WEF aeration design; 2000 lb BOD, factor 1.1, 200 lb NH3, 20% SOTE -> 3120 lb/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `backflow-test-psi` | Backflow Assembly Test Pass Criteria | USC FCCCHR Manual / AWWA C511; #1 check 8 psid, relief 4 psid -> buffer 4 psid, pass | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bod-tss-loading-removal` | BOD/TSS Mass Loading and Percent Removal | wastewater operations (pounds formula); spec-v406 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `breakpoint-chlorination` | Breakpoint Chlorination Dose | Standard Methods 4500-Cl; spec-v355 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chemical-feed-pump` | Chemical Metering-Pump Setting | Pounds formula (AWWA / EPA water-oper...; 0.5 MGD, 8 mg/L, 12.5% NaOCl, SG 1.16, 50 GPD pump -> ~55... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chlorine-cylinder-withdrawal` | Gas Chlorine Cylinder Withdrawal Rate | The Chlorine Institute / state operat...; 100 lb/day from 150-lb cylinders at 70 F -> 40 lb/day cei... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `chlorine-decay` | Chlorine Residual Decay (First-Order) | EPA / AWWA; C(10) = 2*exp(-1) = 0.7358 mg/L; time to 0.2 mg/L = ln(2/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chlorine-decay-constant` | Chlorine Decay Constant from a Bottle Test | EPA / AWWA; k = ln(2.0/0.7358)/10 = ln(2.7182)/10 = 0.100 1/hr; half-... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chlorine-demand` | Chlorine Demand and Dose for a Target Residual | Standard Methods 4500-Cl / AWWA M14 (...; spec-v116 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cistern-storage-days` | Cistern / Storage Reserve Days and Required Volume | storage reserve mass balance (ARCSA /...; days = 2500/150 = 16.67; required = 150*30 = 4500 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `clarifier-area-for-loading` | Clarifier Surface Area for a Target SOR | Ten States Standards / Metcalf & Eddy...; spec-v742 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `clarifier-surface-loading` | Clarifier Surface, Weir, and Solids Loading | Ten States Standards / Metcalf & Eddy; spec-v405 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `coagulant-dose` | Coagulant Dose from Jar Test | USEPA / WEF; pure_lb_day = 5 * 20 * 8.34 = 834; product_lb_day = 834 /... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `conductivity-from-tds` | Conductivity from Total Dissolved Solids | Standard Methods 2510 (inverse of tds...; spec-v657 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cooling-water-makeup` | Cooling Water Makeup (Cycles of Concentration) | CTI / ASHRAE; evap = 1000*10/1000 = 10; blowdown = 10/(4-1) = 3.333; dr... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dechlorination-dose` | Dechlorination Chemical Dose | Dechlorination stoichiometry + pounds...; dose = 1.46*2.0 = 2.92; feed = 2.92*5*8.34/1.0 = 121.76 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `detention-basin-volume` | Detention Basin Volume for a Target Time | Ten States Standards / USEPA; 120 min contact at 350 GPM -> 42,000 gal | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `detention-time` | Detention Time | USEPA; Standard hydraulic retention identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `digester-gas-production` | Digester Gas and Methane Production | Anaerobic digester gas production (WE...; 10,000 lb/day VS fed at 55% reduction, 15 ft3/lb, 65% met... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `digester-vs-loading` | Anaerobic Digester Volatile Solids Loading | WEF / university operator courses; 15000 gpd, 4% TS, 75% VS, 20000 ft^3 -> 3753 lb/day, 188 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `disinfection-ct` | Disinfection CT (USEPA SWTR) | USEPA; Table A-1 (<=0.4 mg/L band): CT_required = 139 mg-min/L a... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `filter-area-for-loading` | Filter Area for a Target Loading Rate | USEPA / AWWA general practice; Rapid-sand band 2-5 gpm/ft^2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `filter-loading` | Filter Loading Rate and Backwash | USEPA; Rapid-sand band 2-5 gpm/ft^2 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `float-method-flow` | Float-Method (Velocity-Area) Open-Channel Flow | Float (velocity-area) open-channel fl...; V = 20/10 = 2.0; A = 4*1.5 = 6; Q = 0.85*2.0*6 = 10.2 cfs... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `flocculation-g-value` | Mixing Velocity Gradient (G / Gt) | Camp & Stein / Ten States Standards; 300 W, 100 m^3, 10 C, 1200 s -> G 48/s, Gt 57492 (floccul... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `flocculator-paddle-power` | Paddle Flocculator Power from Geometry | Camp paddle flocculator power (water-...; 6-ft wheel, 3 rpm, 40 ft2, Cd 1.8, slip 0.25 -> v_tip 1.8... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `fluoride-feed-dose` | Fluoride Feed Dose (Available Fluoride Ion) | Water-fluoridation feed (available-fl...; pure = 0.6 x 2 x 8.34 = 10.008; feed = 10.008 / (0.792 x ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `iron-manganese-chlorine-dose` | Chlorine Dose to Oxidize Iron and Manganese | iron/manganese chlorine oxidation (AW...; dose = 0.62*3.0 + 1.30*0.5 + 0.5 + 0.3 = 3.31; lb/day = 3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `lab-dilution` | Lab Dilution and Serial Dilution | Project (first-principles) over stand...; C1=1000 / C2=50 / V2=100 -> V1=5, diluent=95 (computed by... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `langelier-index` | Langelier Saturation Index | Langelier (1936) / Standard Methods (...; pH 7.5, 25 C, Ca 200, alk 150, TDS 320 -> LSI ~+0.04 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `oil-water-separator-sizing` | Gravity Oil/Water Separator Surface Area (API 421) | API Publication 421 (gravity oil/wate...; Vt=9.81*(rho_w-rho_o)*d^2/(18*mu) SI -> 0.3285 ft/min; ar... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-alkalinity-adjust` | Pool Total Alkalinity Adjustment | NSPF CPO Handbook / ANSI-APSP-ICC dos...; spec-v93 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pool-calcium-hardness-dose` | Pool Calcium Hardness Increase (Calcium Chloride) | Pool calcium hardness increase (calci...; lb = 20*20000*8.34e-6*(110.98/100.09)/0.77 = 3.336*1.1088... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-chlorine-dose` | Pool Free-Chlorine Dose by Product | pool-care practice; spec-v353 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-cya-dose` | Pool Cyanuric Acid Dose | NSPF CPO Handbook / ANSI-APSP-ICC; spec-v93 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pool-heater-btu` | Pool Heater Sizing and Heat-Up Time | thermodynamics; spec-v354 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-heater-size` | Pool Heater Output for a Target Heat-Up Time | thermodynamics (inverse); spec-v677 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-interior-finish-volume` | Pool Gunite Shell and Plaster Volume | Pool interior-finish identity (first-...; interior=15*30+2*45*5.5=945; gunite=945*(8/12)/27*1.15=26... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-salt-dose` | Pool Salt Dose | Mass-balance identity (NSPF CPO / ANS...; spec-v93 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pool-tile-coping-perimeter` | Pool Waterline Tile and Coping Perimeter Takeoff | Pool perimeter-takeoff identity (firs...; perimeter=2*(16+32)=96; tiles=ceil(96/0.5*1*1.10)=ceil(21... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pool-turnover` | Pool Turnover Rate and Chlorine Demand | NSPF; GPM = 20000/(6*60) = 55.56; pure Cl = 20000*2*8.34/1e6 = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pool-volume` | Pool Water Volume by Shape | NSPF CPO pool-volume method / plane g...; avg = (3+8)/2 = 5.5; area = 512; vol = 2816 ft^3; gal = 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `population-equivalent` | Population Equivalent (Organic Load) | Population equivalent (organic load),...; 0.5 MGD, 600 mg/L BOD, 400 mg/L SS -> PE_bod 14718, PE_fl... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `pounds-formula` | Pounds Formula | USEPA; Standard water-treatment chemical dose identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pump-eff-w2w` | Pump Wire-to-Water Efficiency | Hydraulic Institute pump-efficiency i...; 500 gpm / 120 ft TDH / 25 kW / 0.92 motor eff -> WHP 15.1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ras-flow-rate` | Return Activated Sludge (RAS) Flow Rate | WEF / Sacramento activated-sludge man...; 5 MGD, 2500 MLSS, 8000 RAS_SS -> 2.27 MGD, 45% return | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ras-svi-settleability` | Settleability-Based RAS Rate (from SVI) | WEF / Sacramento activated-sludge ope...; 4 MGD, 2,500 mg/L MLSS, SVI 100 -> Xr 10,000 mg/L, 33% re... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `ro-recovery-concentration` | RO Recovery, Concentrate Flow, and Concentration Factor | RO mass balance (AMTA / AWWA); R = 7.5/10 = 0.75; reject = 2.5; CF = 1/(1-0.75) = 4; rej... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `srt-fm-ratio` | SRT and F/M Ratio | WEF MOP 11 + Metcalf & Eddy activated...; 1 MG aeration / 2500 mg/L MLSS / 2000 mg/L MLVSS / 0.05 M... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `svi-sludge-index` | Sludge Volume Index (SVI) | USEPA / WEF; SVI = SV30 * 1000 / MLSS | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tapered-flocculation-g` | Tapered Flocculation G Schedule | Camp & Stein 1943 / Ten States Standards; G 50/30/20 per s, three 100 m3 stages, 15 C (mu 1.138e-3)... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `tds-from-conductivity` | Total Dissolved Solids from Conductivity | Standard Methods 2510; spec-v407 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `two-source-blend` | Flow-Weighted Two-Source Water Blend | Flow-weighted two-source water blend; blend = (500x4 + 300x12)/800 = 5600/800 = 7.0; low-source... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `uv-dose` | UV Dose and Target Check | USEPA UV Disinfection Guidance Manual...; spec-v116 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `uv-required-exposure` | UV Required Intensity or Contact Time | USEPA UV Disinfection Guidance Manual...; spec-v659 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `va-alkalinity-ratio` | Digester Volatile-Acid to Alkalinity Ratio | WEF Manual of Practice / EPA operator...; VA 180 mg/L, alkalinity 2,400 mg/L -> ratio 0.075 (stable... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `was-srt-control` | WAS Rate to Hold Target SRT (Sludge Age) | MCRT/SRT control; WEF operator training; 2 MG, 3000 MLSS, SRT 10 d, WAS 8000, eff 5 MGD/15 mg/L ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `weir-flow` | Weir / Flume Open-Channel Flow | USBR Water Measurement Manual (V-notc...; 90-degree V-notch, H 0.5 ft -> ~0.446 cfs ~200 GPM | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `weir-head-from-flow` | Weir Head from a Target Flow | USBR Water Measurement Manual (invers...; spec-v658 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `well-drawdown` | Well Drawdown and Specific Capacity | AWWA / USGS; drawdown = 80 - 50 = 30 ft; specific capacity = 30/30 = 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `well-max-yield` | Well Sustainable Yield from Specific Capacity | AWWA / USGS (inverse); 1.0 GPM/ft, 30 ft allowable drawdown -> 30 GPM (round-tri... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group N Stage (23 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `amp-power-spl` | Amplifier Power to SPL | first-principles loudspeaker SPL (ANS...; 90 dB sensitivity, 100 W, 1 m -> 110 dB | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `counterweight-arbor-load` | Counterweight Fly System Balance | Theatrical counterweight rigging (sin...; 100 lb batten + 400 lb load, single, 30 lb bricks, 200 lb... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `decibel-converter` | Decibel Converter | ANSI S1.1 (by name); P2/P1 = 2 -> 3.0103 dB | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dmx-planner` | DMX-512 Address and Universe Planner | USITT DMX512-A / project bundled DMX ...; 12 PARs @ 8 ch starting at 1 + 4 movers @ 24 ch starting ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `led-tape-max-run` | LED Tape Max Run Before the Far End Dims | Constant-voltage LED strip voltage dr...; 4.4 W/ft, 12 V, 0.05 ohm/ft, 10% -> 11.44 ft max end-fed run | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `led-tape-run` | LED Tape PSU and Voltage-Drop Run | Constant-voltage LED strip loading an...; 4.4 W/ft, 16 ft, 12 V, 0.05 ohm/ft -> 70.4 W load, 88 W P... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `led-video-wall` | LED Video Wall Build | LED panel maker's spec sheet (native ...; spec-v92 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lighting-beam` | Stage Lighting Beam and Throw | first-principles theatrical photometr...; 20 deg beam, 30 ft throw, 100000 cd -> 10.58 ft pool, 111... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lighting-throw-for-pool` | Throw Distance for a Target Beam Pool | first-principles theatrical photometr...; 10.58 ft pool from a 20 deg beam -> 30 ft throw (round-tr... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `neutral-imbalance` | Three-Phase Neutral Imbalance and Distro | Project (first-principles); Standard symmetric-components root for balanced magnitude... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `power-distro` | Power Distro Per-Leg Loading | First-principles AC power + NEC 80% c...; 12,000 W on 120/208 3-phase, 60 A/leg -> 33.3 A/leg, pass | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `projector-brightness` | Projector Brightness and Throw | Standard AV screen-luminance identity...; spec-v92 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `projector-max-screen-size` | Max Screen Size for a Projector | Standard AV screen-luminance identity...; spec-v727 section 2 pinned example: 5,000 lm, gain 1.0, 1... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rigging-check` | Rigging Capacity Quick Check | OSHA 1926.251 + ASME B30.9 sling capa...; 5/8 in steel / vertical / 1500 lb / 2 legs -> WLL 6700 / ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `room-absorption-target` | Absorption Needed for a Target RT60 | W.C. Sabine reverberation equation (p...; spec-v664 section 2 pinned example: 5,000 ft^3 targeting ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `room-acoustics` | Room Acoustics: RT60 and Axial Modes | W.C. Sabine reverberation equation (p...; spec-v120 section 2 pinned example: 5,000 ft^3 / 500 sabi... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `speaker-impedance` | Speaker Impedance Network | Ohm's-law network theory (public); four 8-ohm drivers in parallel -> 2 ohm | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spl-atmospheric` | SPL with Atmospheric Absorption (ANSI S1.26) | ANSI; Inverse-square 20*log10(30) = 29.54 dB; absorption at 1 k... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spl-distance` | SPL and Inverse Square Law | Project (first-principles); Free-field SPL attenuation; 110 dB at 1 m -> ~80.5 dB at ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spl-distance-for-level` | Distance for a Target SPL | Project (inverse-square law, inverse); 110 dB at 1 ft free-field falls to 84 dB at about 20 ft (... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `time-alignment` | Audio Speaker Time Alignment | Project (first-principles) over Haas ...; Main 30 ft / delay 90 ft / 20 C / 15 ms Haas offset -> c ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `truss-capacity` | Truss Point Load and Span Capacity | Tomcat 16 in box truss published tech...; 16 in box / 40 ft span / 200 + 400 + 200 lb point loads -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `winch-fleet-angle` | Winch Drum Fleet Angle | Winch drum fleet angle (Wire Rope Use...; 6 in offset over a 240 in lead -> atan(0.025) = 1.43 deg,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group O Kitchen (16 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `bakers-percentage` | Baker's Percentage | Baker's percentage (baker's math); flour 1000 g, 65% hydration, 2% salt, 1% yeast, 4 pieces ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `brine-cure` | Brine / Cure Concentration | Mass-fraction chemistry + USDA FSIS 9...; equilibrium: meat 1000 g, salt 25 g, cure 2.5 g -> 2.5% s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cooling-curve` | Food Safety Cooling Curve | FDA Food Code 2022 (project bundled t...; Full 4 in pan / thick liquid / start 135 F / ambient 70 F... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `draft-beer-line-balance` | Draft Beer Line Balancing | Draft-beer line balancing (Brewers As...; 12 psi, 4 ft rise, 3/16 in vinyl (3.0 psi/ft) -> (12 - 2 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `drink-abv-dilution` | Cocktail ABV with Dilution | Cocktail dilution model (Dave Arnold,...; Stirred Martini 3 oz at 32.67% ABV, 25% melt -> 26.1% ABV... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `food-cost-percentage` | Period Food-Cost Percentage | Standard restaurant-accounting identi...; spec-v90 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `kitchen-sanitizer-ppm` | 3-Compartment Sink Sanitizer Dilution | FDA Food Code Sec. 4-501.114 sanitizi...; Bleach 5.25% active, 100 ppm, 3-gal compartment -> 0.24 o... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `menu-engineering` | Menu Engineering Matrix | Kasavana & Smith menu-engineering model; 200 of 1000 units, 10-item menu, price $12, food cost $4,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `overrun-percent` | Ice Cream Overrun | Goff & Hartel, Ice Cream, 7th ed.; FD...; Mix 9.0 lb/gal frozen to 4.5 lb/gal -> 100% overrun, 50% ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pan-conversion` | Steam Table and Pan Conversion | ServSafe / hotel-pan capacity tables ...; 120 servings * 6 oz / full pan @ 4 in -> 22.5 qt total / ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `plate-cost` | Plate Cost and Menu Pricing | NRA / CIA menu-engineering practice; ribeye 0.5 lb @ $16/lb + potato 0.4 lb @ $1.20/lb + veg 0... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pour-cost` | Beverage Pour Cost and Drink Price | First-principles bar cost control; US...; spec-v90 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `prime-cost` | Restaurant Prime Cost | Standard restaurant P&L prime-cost de...; spec-v90 section 2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `recipe-scale` | Recipe Scaling | Project (first-principles); Original yield 8 -> target 12 -> factor 1.5; 500 g flour ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sous-vide-pasteurization` | Sous-Vide Pasteurization Time | FDA / Baldwin; Heisler-slab approximation Fo ~ 0.4; Annex 6 hold at 140 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `yield-ep` | Yield Percentage and Edible Portion | Project (first-principles) over Culin...; 10 lb AP / 1.5 lb trim / 15% cooking loss / $8/lb -> 72.2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group P Field (25 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `area-by-coordinates` | Area by Coordinates | FM 5-233 Construction Surveying (by n...; 100 ft x 100 ft square from four corners -> 10000 ft^2, p... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `backcountry-needs` | Backcountry Water and Caloric Requirement | USGS / NOLS backcountry-planning bund...; 170 lb / moderate / moderate / 3 days / solo -> 3.5 L/day... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bearing-conversion` | Magnetic Declination and Bearing Conversion | Project (first-principles); true = magnetic + east declination = 280 + 12 = 292 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cogo-forward-point` | COGO Forward Locate (Bearing and Distance) | Coordinate geometry (Ghilani & Wolf; ...; dN = 200 cos45 = 141.421; dE = 200 sin45 = 141.421; N2 = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cogo-inverse-locate` | COGO Inverse (Two Points to Bearing and Distance) | Coordinate geometry (Ghilani & Wolf; ...; dN = 141.42, dE = 141.42; distance = sqrt(141.42^2 x 2) =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `differential-leveling` | Differential Leveling (HI Method) and Loop Misclosure | Height-of-instrument leveling (Ghilan...; spec-v311 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `edm-slope-reduction` | Total-Station Slope-to-Horizontal Reduction | Ghilani, Elementary Surveying (plane-...; H = 250 sin86 = 249.391 ft; V = 250 cos86 = 17.439 ft | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `grid-to-ground` | State-Plane Grid-to-Ground Distance | NGS State Plane Coordinate System; EF = 20906000/20911280 = 0.9997475; CF = 0.9999 x 0.99974... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hiking-time` | Hiking Time (Naismith's Rule) | Naismith's rule (W. W. Naismith, 1892); 10 km, 600 m ascent, 5 km/h -> 2 hr flat + 1 hr ascent = ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `level-loop-adjustment` | Level-Loop Misclosure Distribution (Compass Rule) | Compass-rule level-loop adjustment (G...; spec-v631 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `leveling-curvature-refraction` | Leveling Curvature-and-Refraction Correction | Ghilani, Elementary Surveying (leveli...; K = 2.0; h_cr = 0.0206 x 4 = 0.0824 ft (curvature 0.0956 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lightning-countdown` | Lightning 30-30 Rule Countdown | NOAA / NWS; Public NWS lightning-safety guideline | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `magnetic-declination` | Magnetic Declination (WMM2025) | NOAA NCEI; Bundled at data/field/wmm/coefficients.json (verbatim fro... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pacing-distance` | Pacing and Distance | Project (first-principles); 100 ft over 38 paces / 120 current paces / flat -> pace 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `search-probability` | Search Probability of Detection | SAR search theory (Koopman) / Nationa...; POD 30/40/50%, POA 60% -> cum POD 79%, POS 47.4% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `search-track-spacing` | Search Track Spacing and Coverage | NSARC / USCG search theory (exponenti...; 100 m sweep width, 50 m spacing -> coverage 2.0, POD 86% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `searcher-hours` | Search Effort in Searcher-Hours | NSARC / USCG search-planning practice; 160 acres at 40 ft spacing -> 33 mi of track line; at 1.5... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `slope-avalanche` | Slope Angle and Avalanche Risk Window | American Avalanche Association / NWS ...; Measured 32 deg -> 62.49% slope, in_avalanche_window true... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `solar-times` | Sunrise, Sunset, and Civil Twilight | NOAA Solar Position Algorithm (SPA, p...; 40 N / -105 W / 2026-06-21 (summer solstice) / -6 UTC -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `stadia-distance` | Stadia Tacheometry (Distance and Elevation) | Stadia tacheometry (K = 100); spec-v312 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sweat-rate-hydration` | Sweat Rate and Fluid Replacement | ACSM / NATA fluid-replacement (weigh-...; 180 lb pre, 177 lb post, 20 oz drunk, 2 hr -> 68 oz sweat... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sweep-width-correction` | Sweep Width Correction (Weather, Speed, Fatigue) | IAMSAR Manual Vol. II / US National S...; 120 ft raw width, weather 0.5, speed 1.0, fatigue 0.9 -> ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `taping-corrections` | Steel Tape Distance Corrections (Temperature, Slope, Tension, Sag) | Steel-tape corrections (Ghilani/Wolf); spec-v313 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `traverse-closure` | Traverse Closure and Adjustment | FM 5-233 Construction Surveying (by n...; courses (0 deg, 100 ft), (90 deg, 100 ft) -> sumLat 100, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `utm-conversion` | UTM and Lat-Lon Conversion | USGS / NGA WGS84 UTM forward (project...; lat 40 N / lon 105 W (central meridian of zone 13) -> zon... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group Q Historical (1 tile)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `historical-pricing` | Historical Pricing Context | BLS PPI / EIA / USDA NASS / FRED fede...; copper / 12-month lookback over the bundled 2026-05-08 sh... | [docs/v6-audit.md](v6-audit.md) (reference cadence) |

### Group R Accounting (28 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `breakeven` | Breakeven and Contribution Margin | Project (first-principles); Standard CVP identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cash-conversion-cycle` | Cash Conversion Cycle | Project (first-principles); DSO 45 / DIO 60 / DPO 30 -> CCC 75 days | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `change-order-markup` | Change Order Price with Overhead and Profit | construction estimating (AIA G701); spec-v391 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `declining-balance-depreciation` | Declining-Balance Depreciation (Book) | GAAP book depreciation (ASC 360); $50,000 cost, $5,000 salvage, 5 yr, 200% DDB -> Yr1 $20,000 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `employer-payroll-tax` | Employer Payroll Tax | FICA/FUTA (26 USC 3101-3306 + IRS Pub...; $200,000 wages above the SS base ($168,600) -> SS capped ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `eoq-order-quantity` | Economic Order Quantity (Wilson EOQ) | Wilson economic order quantity (EOQ) ...; spec-v529 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `equipment-hourly-rate` | Equipment Owning and Operating Hourly Rate | CAT / AED method; spec-v363 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `estimated-tax` | Quarterly Estimated Tax | IRS Form 1040-ES + Pub 505 estimated-...; $20k projected / $18k prior / $4k withheld / 100% prior m... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `home-office` | Home-Office Deduction (Simplified vs Actual) | IRS; simplified = 200 x $5 = $1,000; actual = (200/2000) x 24,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `inventory-turnover` | Inventory Turnover and DSI | Project (financial-analysis identity); $2,000,000 COGS / $250k beginning / $270k ending / 365 da... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `labor-burden-rate` | Fully-Burdened Labor Rate | contractor estimating; spec-v362 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `loan-amortization` | Loan Amortization Schedule | Project (first-principles); 30-year fixed at 6.5% APR on $250,000 principal; canonica... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `macrs-depreciation` | MACRS Depreciation | IRS Pub. 946; $50,000 / 5-year / half-year / year 1 -> $10,000 deprecia... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `markup-vs-margin` | Markup vs. Margin Converter | Managerial-accounting CVP pricing ide...; cost $60, markup 50% -> price $90, margin 33.3% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mileage-rollup` | Mileage Log Roll-Up | IRS Pub. 463 / IRS Notice (annual sta...; Two trips / 60 business miles total / 2025 -> $42.00 dedu... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `overhead-recovery-rate` | Overhead Recovery Rate | contractor cost accounting; spec-v364 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `payroll-withholding` | Payroll Tax Withholding (Simplified) | IRS Pub 15-T percentage method (singl...; $1500 biweekly / single / 2025 -> annualized $39,000 / fe... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `prevailing-wage-fringe` | Prevailing-Wage Package: Cash vs Bona-Fide Fringe | Davis-Bacon / state wage determination; spec-v446 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `reorder-point` | Reorder Point and Safety Stock (Service Level) | reorder point and safety stock (servi...; spec-v530 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `retainage-tracker` | Retainage Withheld and Net Payment (AIA G702/G703) | construction billing (AIA G702/G703); spec-v392 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `sales-tax-compound` | Sales Tax Compounding and Reverse | Project (first-principles); $1,000 / 6.25% state + 1.5% local -> 7.75% combined / $77... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `se-tax` | Self-Employment Tax (Schedule SE) | IRS Schedule SE (Form 1040); $80,000 net SE earnings / no W-2 wages / single / 2025 ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `section-179` | Section 179 and Bonus Depreciation | IRC sec. 179 (annual indexed limits; ...; $50,000 cost / 100% business use / $200k taxable income /... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `straight-line-depreciation` | Straight-Line Depreciation | Project (first-principles); annual = (cost - salvage) / life | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `surety-bond-premium` | Surety Bond Premium (Tiered Rate) | surety pricing (tiered rate schedule); spec-v444 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `units-of-production-depr` | Units-of-Production Depreciation | units-of-production (activity) deprec...; spec-v531 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wip-percent-complete` | Work-in-Progress Percent Complete and Over/Under Billing | construction accounting (cost-to-cost...; spec-v390 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `workers-comp-emr-premium` | Workers-Comp Premium and Experience Mod | workers-comp rating (NCCI-style); spec-v445 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group T Lab (21 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `beer-lambert` | Beer-Lambert Concentration | Project (first-principles); Beer-Lambert law | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cfu-plate-count` | CFU/mL Viable Plate Count | FDA BAM Ch. 3 (Aerobic Plate Count) /...; 150 colonies, 10^-5 dilution, 0.1 mL -> 1.5e8 CFU/mL | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `doubling-time` | Cell Culture Doubling Time | Exponential-growth / population-doubl...; 1e5 to 8e5 cells/mL in 24 h -> 8.0 h doubling, 0.087 /h, ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `gel-percent-agarose` | Agarose Gel Percent | Sambrook & Russell, Molecular Cloning; 10 kb max -> 0.8%; 100 mL -> 0.8 g | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `growth-projected-count` | Projected Cell Count from Doubling Time | Exponential-growth kinetics (solved f...; 1e5 cells, 8 h doubling, 24 h -> 8e5 (3 doublings, 8x) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hemocytometer` | Hemocytometer Cell Count | Improved Neubauer hemocytometer (proj...; 240 cells / 4 squares / 1:2 dilution / 12 dead -> 60 avg,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `henderson-hasselbalch` | Henderson-Hasselbalch Buffer | Project (first-principles); pH = pKa + log10([A-]/[HA]) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ligation-molar-ratio` | Ligation Insert:Vector Molar Ratio | Standard molecular cloning (ligation ...; 50 ng of a 5000 bp vector, 1000 bp insert, 3:1 -> 30 ng i... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mass-moles` | Mass-to-Moles and Moles-to-Mass | Project (first-principles); Mole identity | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `michaelis-menten` | Michaelis-Menten Enzyme Kinetics | Enzyme kinetics (Michaelis-Menten equ...; Vmax 100, Km 25, [S]=25=Km -> v 50 (exactly Vmax/2), 50% ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `molarity-dilution` | Molarity and Dilution (C1V1=C2V2) | Project (first-principles); C1 = 1.0 M / C2 = 0.1 M / V2 = 50 mL -> V1 = 5 mL stock +... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `molarity-from-stock` | Molarity from Concentrated Reagent | Standard reagent preparation (stock m...; Concentrated HCl: 37% w/w, 1.19 g/mL, MW 36.46 -> 12.08 M... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `molecular-weight` | Molecular Weight from Formula | IUPAC; Na 22.99 + Cl 35.45 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `nucleic-acid-a260` | Nucleic Acid Concentration (A260) | Standard spectrophotometric nucleic-a...; A260 0.6, dsDNA (50), 1:50 dilution, A280 0.324 -> 1500 n... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `od600-cell-count` | OD600 to Cell Density | Standard microbiology spectrophotomet...; OD 0.5 * 8e8 cells/mL/OD * 1 -> 4.0e8 cells/mL | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pcr-master-mix` | PCR Master Mix | Project (first-principles); 24 reactions / 10% extra / 25 uL total per rxn (12.5 mast... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `primer-tm` | Primer Melting Temperature | Wallace 1979 / Marmur & Doty 1962 (pr...; GCGGATCCATG (11 nt) via Wallace -> Tm 36 C | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rcf-rpm` | Centrifuge RPM and RCF | Project (first-principles); Centrifuge G-force identity (r in cm, rpm in revolutions/... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `resuspension-volume` | Resuspension Volume | Project (first-principles); 0.05 g lyophilized / 10 mg/mL target -> 0.005 (5 mL) resu... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `serial-dilution` | Serial Dilution Planner | Project (first-principles); 1.0 stock / DF 10 / volume 0.001 / 5 steps -> transfer 0.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `substrate-for-velocity` | Substrate for a Target Fraction of Vmax (Michaelis-Menten Inverse) | Enzyme kinetics (Michaelis-Menten equ...; spec-v635 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

### Group X Real Estate (35 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `amortization-schedule` | Full Amortization Schedule | Standard mortgage amortization (public); Worked example: $320,000 at 6.5% for 30 yr -> P&I $2022.6... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `blended-mortgage-rate` | Blended Mortgage Rate (Two Loans) | blended mortgage rate (weighted-avera...; spec-v528 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `break-even-occupancy` | Break-Even Occupancy | CRE underwriting; spec-v345 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `brrrr-refi` | BRRRR Cash-Out Refinance and Capital Left In | real-estate-investing practice; spec-v403 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cap-rate-dscr` | Cap Rate and DSCR | Standard CRE underwriting ratios (pub...; Worked example: NOI $84,000 / value $1.2M -> 7.0%; debt s... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cash-on-cash` | Cash-on-Cash Return | Standard rental-RE investor practice ...; Worked example: $75,000 invested + $6,750 annual cash flo... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `closing-costs` | Closing-Cost Estimator (CFPB Line Items) | CFPB Closing Disclosure (12 CFR Part ...; Worked example: $400k purchase / $320k loan / 0.4% transf... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `commercial-load-factor` | Rentable/Usable Load Factor (BOMA) | BOMA rentable/usable load factor (ANS...; spec-v527 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `commission-split` | Commission Split | Standard residential-brokerage practi...; Worked example: $500k sale, 5% total, 50/50 sides, 80/20 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `cost-of-waiting` | Cost of Waiting (Rate-Rise Scenario) | Standard mortgage amortization at two...; Worked example: $320,000 / 30 yr / 6.5% -> 7.5% raises P&... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `debt-yield` | Debt Yield | CRE lender underwriting; spec-v344 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `depreciation-recapture` | Depreciation Recapture on Sale | IRS Pub 544 / IRC §1245 / §1250; $100k accum SL, $150k gain -> $100k recaptured at 25% = $... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `dti` | Debt-to-Income (DTI) | FNMA / FHA / VA underwriting guidelin...; Worked example: $7500/mo income, $2100 housing, $600 othe... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `exchange-1031-timeline` | IRC §1031 Exchange Timeline | 26 USC 1031 / Treas. Reg. 1.1031(k)-1...; Worked example: sale-close 2026-03-01 -> identification 2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `fix-flip-profit` | Fix-and-Flip Profit and Return | real-estate-investing practice; spec-v402 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `floor-area-ratio` | Floor Area Ratio (Zoning) | Floor area ratio (municipal zoning in...; 30,000 SF building on a 20,000 SF lot -> FAR 1.5; 2.0 cap... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gross-rent-multiplier` | Gross Rent Multiplier | Appraisal Institute income-approach (...; $300,000 / $36,000 annual -> GRM 8.33, yield 12% | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `hud-fmr` | HUD Fair Market Rents | HUD PD&R Fair Market Rents FY2026 (fe...; Worked example: San Francisco-Oakland-Berkeley HUD Metro ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `loan-limits` | FHFA / FHA / VA Loan Limits by County | FHFA / HUD / VA (federal-published, 2...; Worked example: San Francisco, CA (FIPS 06075) returns th... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `ltv` | Loan-to-Value (LTV) | FNMA Single-Family Selling Guide (pub...; Worked example: $320,000 loan on $400,000 value -> LTV 80... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `max-offer-70-rule` | Fix-and-Flip Maximum Offer (70% Rule) | real-estate-investing heuristic; spec-v346 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `mortgage-point-breakeven` | Mortgage Discount-Point Break-Even | First-principles amortization; CFPB L...; Worked example: $300k, 7.0% base vs 6.5% with 2 points ($... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `mortgage-reserves` | Mortgage Reserves Requirement (Months PITI) | Fannie Mae Selling Guide B3-4.1-01 / ...; Worked example: $2,500 PITI x 6 mo = $15,000 required; $2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `net-effective-rent` | Net Effective Rent (Lease Concessions) | net effective rent (straight-line con...; spec-v526 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `per-diem-interest` | Per-Diem Prorated Interest at Closing | CFPB Closing Disclosure (12 CFR 1026....; Worked example: $300k @ 6.0%, close 2026-06-15, Actual/36... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `piti` | PITI Mortgage Payment | Standard mortgage amortization (public); Worked example: $320k @ 6.5% for 30y + $4800 tax + $1800 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pmi-cancellation-date` | PMI Cancellation / Termination | Homeowners Protection Act of 1998 (12...; $250,000 value/loan, 30 yr at 6.5% -> 80% at month 146, 7... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `property-tax` | Property Tax Estimator | Standard mill-rate convention; Worked example: assessed $400k, mill 15, exemption $25k -... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rent-roll-vacancy` | Rent Roll to Effective Gross Income | Appraisal Institute (income approach); $120k PGR, 5% vac + 2% credit, $6k other -> $8.4k loss, $... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rent-vs-buy` | Rent vs Buy NPV Comparison | New York Times rent-vs-buy methodolog...; $400k / $80k down / 6.5% 30yr / tax 1.2% / ins 1800 / mai... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `rental-total-return` | Rental Total Return (Four Components) | real-estate-investing practice; spec-v404 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `rental-worksheet` | Rental Income / Expense Worksheet (Schedule E) | IRS Schedule E (Form 1040) Part I (pu...; Worked example: $2200 monthly rent / 5% vacancy / $19,412... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `required-face-rent` | Required Face Rent from a Target Net Effective Rent | required face rent (inverse of the ne...; spec-v646 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `section-121-exclusion` | Home-Sale Capital-Gains Exclusion (§121) | 26 USC 121 / IRS Pub 523 (public); Worked example MFJ: sale $850k, costs $45k, basis $300k +... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `seller-net-sheet` | Seller Net Proceeds Sheet | TILA-RESPA Closing Disclosure (12 CFR...; $400,000 sale, $250,000 payoff, 5.5% commission, 0.5% tra... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group Y Educators (23 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `alternate-readability` | Alternate Readability Formulas (SMOG / Coleman-Liau / Gunning Fog / ARI) | McLaughlin (1969) / Coleman + Liau (1...; Run against the Y.1 sample paragraph (7 sentences ~ 60-70... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `base-converter` | Number Base Converter (2-36) | Standard positional-notation conversion; Worked example FF (hex) -> 11111111 (binary); decimal 255 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bell-curve-zscore` | Bell Curve / z-Score and Percentile | Abramowitz + Stegun (AMS 55, 1965), f...; z = (85 - 75)/10 = 1.0; percentile ~ 84.13%; band: A | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `category-weighted-grade` | Weighted Category Grade | Weighted-mean arithmetic + standard U...; HW 92% @20%, Quiz 85% @30%, Final 78% @50% -> 82.9% (B) | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chi-square-gof` | Chi-Square Goodness-of-Fit | OpenIntro / Numerical Recipes; chi2 = (15^2 + 5^2 + 5^2 + 15^2)/25 = (225+25+25+225)/25 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `codon-table` | Genetic Codon Table (DNA / RNA) | Standard genetic code (universal); Worked example AUGGCCUAA -> 3 codons: Met/START, Ala, STOP | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `confidence-interval` | Confidence Interval (Proportion or Mean) | Wald (1943); standard inferential sta...; phat = 0.6, n = 100, z = 1.96 -> SE = sqrt(0.6*0.4/100) =... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `curve-grade-scaler` | Grade-Curve Scaler | Standard psychometric score scaling; square-root curve: raw 49 -> 10 * sqrt(49) = 70 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `final-grade-needed` | Final-Exam Grade Needed | Weighted-average syllabus arithmetic; current 88%, final weight 25%, target 90% -> 96% needed | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `gpa-calculator` | GPA Calculator (Weighted + Unweighted) | Standard US 4.0 / 5.0 scale (AACRAO t...; Five courses: A in AP Calc (5 cr), B+ honors English (4 c... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lexile-band` | Lexile Band by Grade (CCSS Stretch) | CCSS Appendix A (June 2010); state-DO...; Grade 5 typical band 830L - 1010L | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `linear-regression` | Linear Regression (slope, intercept, R^2) | OpenIntro; Sxx=10, Sxy=6, Syy=6 -> slope=0.6, intercept=4-0.6*3=2.2;... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `linear-system-2x2` | System of Two Linear Equations | Cramer (1750); standard linear algebra; 2x + 3y = 8; x - y = 1. det = 2*(-1) - 1*3 = -5. x = (8*(... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `pearson-correlation` | Pearson Correlation (r, R^2, significance) | OpenIntro / Numerical Recipes; Sxy=6, Sxx=10, Syy=6 -> r = 6/sqrt(60) = 0.7746; R^2 = 0.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `periodic-element` | Periodic Element Reference (Electronegativity / Configuration / Oxidation) | IUPAC / NIST / Pauling (1960) / Green...; Fe (iron, Z=26): period 4 / group 8 / d-block; Pauling EN... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `quadratic-formula` | Quadratic Formula and Discriminant | Classical algebra; Worked example: x^2 - 3x + 2 = 0 -> roots 1 and 2; discri... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `readability` | Readability Scores (Flesch-Kincaid) | Kincaid et al. (1975); Flesch (1948);...; 7-sentence ~65-word example paragraph from the renderer's... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sample-size-for-margin` | Sample Size for a Target Margin of Error | Cochran (1977); standard survey sampling; p = 0.5, E = 0.03, z = 1.96 -> n = 1.96^2 * 0.25 / 0.03^2... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `scientific-notation` | Scientific Notation and Significant Figures | NIST SP 811 (Guide for the Use of the...; Worked example: 0.00347 -> mantissa 3.47, exponent -3, 3 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `significant-figures` | Significant Figures (count + round) | NIST SP 811 §7 (public); Worked example 0.00347 -> 3 sig figs; rounded to 2 -> 0.0035 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `standards-based-grade` | Standards-Based Grade (Mastery 1-4) | Marzano + Heflebower (2014); Achieve ...; Worked example: 4 standards (4 major / 3 major / 3 suppor... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `statistics-quickread` | Statistics Quick-Read | Standard descriptive statistics (clas...; Wikipedia worked example list 2, 4, 4, 4, 5, 5, 7, 9 -> m... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `two-sample-t-test` | Two-Sample t-Test | OpenIntro Statistics Ch. 7 (Welch's t...; 82/6/25 vs 78/7/22 -> t ~2.09, df ~41.7, two-sided p ~0.043 | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |

### Group Z (unnamed) (30 tiles)

| tile_id | name | citation source | fixture |
| --- | --- | --- | --- |
| `beam-clamp-side-pull` | Beam Clamp Reaction and Side-Pull Check | ASME B30.20 / beam-clamp manufacturer...; 860.23 lb at 63.43 deg on a 2,000 lb WLL clamp with a 500... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `block-redirect-load` | Rigging Block Redirect Resultant Load | ASME B30.26 / rigging statics; 3,000 lb line turning 90 deg through a block -> 2 x 3,000... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `block-redirect-max-angle` | Max Redirect Angle for a Block WLL | ASME B30.26 / rigging statics (solved...; 3,000 lb line, 5,000 lb block -> 2 x asin(0.8333) = 112.9... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `bridle-leg-tension` | Two-Leg Bridle Leg Tension | Entertainment rigging bridle geometry...; 1000 lb; leg1 4 out/8 up (steep), leg2 10 out/6 up (shall... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `cg-load-share` | Center of Gravity and Pick-Point Load Share | ASME B30.9 / ITI rigging practice; 12,000 lb skid, picks 120 in apart, CG 40 in from pick 1 ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `chain-lever-hoist` | Chain / Lever Hoist Effort and Travel | ASME B30.16 / B30.21; 2,000 lb, 2,000 lb hoist, MA 32, eff 0.85, lift 4 ft -> 7... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `crane-ground-bearing` | Crane Ground Bearing Pressure and Mat Size | OSHA 1926 Subpart CC / outrigger-reac...; 60,000 lb on a 4.0 ft^2 float, 3,000 psf allowable -> 15,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `crane-load-radius-boom` | Crane Load Radius and Boom-Tip Height from Boom Geometry | Crane boom geometry (load radius / ti...; R = 4 + 30*cos(60) = 19; H = 6 + 30*sin(60) = 31.98; angl... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `crane-net-capacity` | Crane Net Capacity After Deductions | OSHA 1926.1417(o) / ASME B30.5; gross 30,000, hook 800, wire 400, below-hook 600, load 22... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `crane-outrigger-reaction` | Crane Outrigger Reaction from Lift Geometry | Crane load-moment method / SAE J1063 ...; 40 kip at 30 ft, 30 kip CW at 12 ft, 20 ft spread -> even... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `forklift-capacity-derate` | Forklift Load-Center Capacity Derate | ASME B56.1 / truck data plate; 5,000 lb @ 24 in handling a load at 36 in, 3,000 lb -> 3,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `lifting-lug-design` | Lifting Lug / Padeye Pin-Hole Check | ASME BTH-1 Section 3-3.3 (pin-connect...; 20 kip; t 1.0, hole 1.06, pin 1.0, edge 2.0, width 4.0, A... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `max-wind-speed-for-lift` | Max Wind Speed Before a Load's Swing Limit | ASCE 7 velocity pressure / OSHA 1926 ...; 4,000 lb, 200 ft^2, shape 1.6, 5 deg swing cap -> 20.7 mph | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `multi-leg-sling` | Multi-Leg Sling Load per Leg | ASME B30.9 (Slings, by name); spec-v117 section 2.1 pinned example (4,619 lb/leg, 2,309... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `reeving-parts-of-line` | Block-and-Tackle Reeving Line Pull | Block-and-tackle reeving line pull (W...; pull = 20000 x 0.02 / (1 - 0.98^4) = 20000 x 0.02/0.07763... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `roller-jack-force` | Roller / Skate / Jacking Push Force | Standard machinery-moving practice; 12,000 lb on skates (coef 0.03), level, 5,000 lb skate ->... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `shackle-eyebolt-wll` | Shackle / Eye-Bolt WLL and Angular Derate | ASME B30.26 / B18.15 manufacturer data; shoulder eye bolt rated 7,000 lb, leg 3,000 lb, pull 45 d... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `sling-d-d-efficiency` | Wire-Rope Sling D/d Bend Efficiency | WRTB Wire Rope Users Manual / ASME B30.9; 10,000 lb 6x19 sling around a 3 in pin, 1 in sling -> D/d... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spanline-sag-for-tension` | Spanned Cable Minimum Sag for a Tension Limit | Shallow-cable parabola statics (by na...; spec-v670 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spanline-sag-tension` | Spanned Cable Sag and Tension | Shallow-cable parabola statics (by name); spec-v484 section 2.1 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `spreader-beam` | Spreader Bar vs Lifting Beam Below the Hook | ASME BTH-1 / B30.20; 10,000 lb on a 10 ft bar, top 6 ft -> 50.2 deg, 6,509 lb ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `spreader-beam-min-height` | Spreader Beam Minimum Top-Point Height | ASME BTH-1 / B30.20 (solved for the h...; 10,000 lb on a 10 ft bar, 6,000 lb slings -> 56.4 deg, 7.... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tagline-force` | Tag Line Pull and Handler Count | OSHA 1926 Subpart CC / rigging practice; 328 lb wind force, tag at 30 deg, 50 lb per person -> 378... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `tandem-lift-share` | Tandem (Two-Crane) Lift Load Share | ASME B30.5 / OSHA 1926 Subpart CC; 40,000 lb, picks 300 in apart, CG 120 from crane 1, 75% d... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `three-point-bridle` | Three-Point Bridle Leg Tension (3-D) | Entertainment rigging bridle statics; 1,200 lb on three legs 120 deg apart, 6 ft out / 8 ft up ... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `winch-drum-line-pull` | Winch Drum Line Pull by Layer | Wire-rope drum mechanics / SAE winch ...; 10000 lb bare, 10 in drum, 1/2 in rope, 12 in barrel, lay... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wind-on-load` | Wind Force and Swing on a Suspended Load | ASCE 7 velocity pressure / OSHA 1926 ...; 200 ft^2 panel, 20 mph, shape 1.6, 4,000 lb -> 1.024 psf,... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wire-rope-clips` | Wire-Rope Clip Count and Spacing (OSHA Table H-2) | wire-rope clip requirements (OSHA Tab...; OSHA Table H-2: 3/4 in -> 4 clips; spacing = 6 x 0.75 = 4... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |
| `wire-rope-diameter-for-wll` | Wire-Rope Diameter for a Required WLL | Wire Rope Users Manual rule-of-thumb ...; 5 ton WLL, cf 46, DF 5 -> 0.737 in exact, next standard 3... | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) |
| `wire-rope-strength` | Wire-Rope Breaking-Strength Estimate and WLL | Wire Rope Users Manual rule-of-thumb ...; spec-v117 section 2.2 pinned example | [test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json) (+1 more) |

Tile count: 1443. Fixture-covered or reference-cadence: 1443 / 1443.

<!-- END tile-index-v14 -->
