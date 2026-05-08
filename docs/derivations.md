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

---

When a new physics-derived calculator is added, this document gets a new section in the same pull request. The reviewer's job is to confirm that each section cites only public physics or public-domain sources and that the verification approach uses worked examples that are themselves traceable to public references.
