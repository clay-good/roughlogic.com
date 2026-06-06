# roughlogic.com Specification v20 — Catalog Expansion VI (55 New Tiles)

> **Implementation status: OPEN (opened 2026-06-05).** v20 is the third
> of the three-spec set (v18 hardening, v19 citation integrity, v20
> expansion). It inherits everything from spec.md through spec-v19.md and
> lands after v18's contract sweep and v19's citation sweep are green, so
> that every v20 tile is born into the hardened contract and the citation
> discipline rather than retrofitted. v20 adds **55 new tiles** across
> nineteen existing groups. **No new groups, no new third-party
> dependencies, no new licenses, no telemetry, no AI, US standards only.**
> Every v20 tile ships with the full v14 discipline: a dimensional
> annotation, bounds-fuzzer rows, a worked-example fixture cross-checked
> against a cited source, a complete inline `citations.js` entry, a
> `tile-meta.js` entry with related-tiles and at least three search
> aliases, and a prerendered shell. Package stamps **0.20.0** at the close
> of v20.
>
> **Count.** Measured against the catalog as it stands when v20 opens —
> **437 live tiles** (2026-06-05) — the catalog reaches **492**. If v17's
> remaining drafted tiles land first, the base shifts and the +55 delta
> holds. Distribution: A +3, B +3, C +3, D +2, E +3, F +2, J +3, K +3,
> L +3, M +3, N +1, O +1, P +1, R +3, S +2, T +2, U +4, V +4, W +3,
> X +3, Y +3.

> Foreword. The audit that opened the v15–v17 trio kept finding the same
> thing: much of what looked new already existed. v20 was built the other
> way around — every candidate was checked against all 437 live tile ids
> before it earned a line in this spec, and the dozen that turned out to
> duplicate an existing tile (an electrical box-fill already in Group A, a
> voltage-drop already covered three ways, a concrete-volume already in
> Group E) were dropped, not renamed. What remains is fifty-five numbers
> that a working professional reaches for, that the site does not yet
> compute, and that trace to a real US authority. The fan motor's brake
> horsepower. The water operator's Langelier index. The owner-operator's
> true cost per mile. The teacher's "what do I need on the final." The
> nephrology-curious medic's Cockcroft-Gault. Each is one formula, one
> cross-check, one tolerance, one citation. Built the way the rest was
> built.

This document inherits spec.md, spec-v2.md … spec-v19.md. Every prior
constraint remains in force. Group-specific disclaimers apply unchanged:
Group V (EMS) and Group U (Veterinary) tiles carry the spec-v12 §13
"licensed provider / veterinarian governs — estimate/score only, not
clinical advice" banner; Group R (Accounting/Tax), Group S (Legal), and
Group T (Bench Science) tiles carry the spec-v5 tax-law /
legal-information / bench-science variant notices; Group W (Aviation)
tiles carry the "POH/AFM and ATC govern" notice; code-dependent trades
tiles (A/B/C/E/F) carry the "AHJ-adopted edition governs" disclosure.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- Per-tile structure below is Inputs / Output / Math / Citation / Edge
  cases / Tests, per the v9/v12/v15/v16/v17 pattern.
- v14 dimensional-analysis lint, bounds-and-edge-case fuzzer,
  worked-example registry, and reviewer-signoff requirements apply to
  every new tile.
- v18 tile-contract (§2 of spec-v18: totality, purity, domain honesty,
  unit-toggle consistency, flag-threshold correctness, magnitude safety,
  render faithfulness) applies to every new function from the first
  commit.
- v19 citation discipline (inline, current, linkified, wraps at 320px)
  applies to every new `citations.js` entry from the first commit.
- Tile ids below are kebab-case and were checked against all 437 live
  ids; none collide. Letter.number labels are scoped to v20.
- Every "current rate / bracket / wage base / code table value" is
  user-supplied or a declared shard per spec-v12 §H. v20 bundles no
  paywalled lookup. Where a citation's section/edition number is not
  certain, the entry cites the authority **by name** and directs the user
  to confirm the locally adopted edition — never asserts a precise
  section it cannot stand behind (per v19 §3.1).

## 2. Phase A — Electrical (Group A, 3 tiles → calc-electrical.js)

### A.1 Parallel conductor ampacity (`parallel-conductor-derate`)

**Inputs.** Single-conductor ampacity (A; user-supplied from the NEC
ampacity table for their conductor/insulation/termination), number of
parallel sets N, total current-carrying conductors in the raceway (for
the >3-CCC adjustment), optional ambient-correction factor.

**Output.** Total parallel ampacity (A), per-set current at a given
load, the adjustment factor applied, and a per-set conductor-size
adequacy note.

**Math.** `I_total = I_single × N × F_ccc × F_ambient`; per-set current
`I_set = I_load / N`. Conductors are paralleled only at 1/0 AWG and
larger.

**Citation.** "Per NEC (NFPA 70) — paralleled conductors (Article 310,
parallel-conductor provisions) and the more-than-three current-carrying-
conductor adjustment. Conductor ampacities user-supplied from the
adopted NEC edition's ampacity table; the AHJ-adopted edition governs.
Free read-only access at nfpa.org/freeaccess."

**Edge cases.** Conductor size below 1/0 AWG rejected (paralleling not
permitted). All parallel sets must be identical length / material /
termination — a banner states this. Adjustment factor below 0 or above 1
rejected.

**Tests.** Eight unit tests including a 3/0 Cu at 200 A, N=3, no derate →
600 A; worked-example fixture cross-checked against the NEC
parallel-conductor rule.

### A.2 Three-phase neutral current (`neutral-current-3ph`)

**Inputs.** Phase currents Ia, Ib, Ic (A); optional per-phase triplen
(3rd-harmonic) content (%).

**Output.** Fundamental/unbalanced neutral current (A), the
harmonic-dominated neutral estimate, and a "neutral counts as a CCC"
advisory when triplens dominate.

**Math.** `I_N = sqrt(Ia² + Ib² + Ic² − Ia·Ib − Ib·Ic − Ic·Ia)`
(phasor sum of 120°-displaced currents). With dominant triplens the
neutral approaches `3 × I_triplen_per_phase`.

**Citation.** "Phasor sum of three 120°-displaced currents (first
principles). Neutral-as-current-carrying-conductor and harmonic guidance
per NEC Article 310 and IEEE Std 519 by name; the AHJ-adopted edition
governs. Free read-only at nfpa.org/freeaccess."

**Edge cases.** Balanced linear load → I_N = 0 (verified). Major
nonlinear load can drive neutral current above phase current — flagged.
Result is RMS magnitude, not direction.

**Tests.** Six unit tests; fixture Ia=100, Ib=80, Ic=60 → I_N ≈ 34.64 A.

### A.3 Motor starting voltage dip (`motor-vd-starting`)

**Inputs.** Source voltage (V), one-way conductor length (ft), conductor
circular mils, motor locked-rotor current (A; or 6× FLA estimate when no
code letter), phase (1Φ/3Φ), conductor constant K (Cu ≈ 12.9, Al ≈
21.2), optional dip limit (%).

**Output.** Voltage drop during start (V), terminal voltage during start
(V), % dip, and a pass/fail against the dip limit (default 15%).

**Math.** `V_drop = (2 or √3) × K × LRC × L / cmils`;
`V_terminal = V_source − V_drop`; `%dip = V_drop / V_source × 100`.

**Citation.** "Ohm's-law voltage-drop method (first principles); motor
locked-rotor current per NEC Article 430 code-letter tables (user-
supplied); contactor pickup/dropout commonly ~85% nominal per NEMA ICS
2 by name. AHJ governs. Free read-only at nfpa.org/freeaccess."

**Edge cases.** LRC estimate (6× FLA) flagged when no nameplate code
letter is entered. Dip above ~15% flagged as a likely contactor dropout
/ failed start. Distinguished from the steady-state `voltage-drop` tile
in the banner.

**Tests.** Six unit tests including 480 V 3Φ, LRC 180 A, 250 ft, 250
kcmil Cu → ~0.8% dip.

## 3. Phase B — Plumbing and Gas (Group B, 3 tiles → calc-plumbing.js)

### B.1 Water thermal-expansion volume (`thermal-expansion-volume`)

**Inputs.** System water volume (gal), cold inlet temperature (°F), set
hot temperature (°F).

**Output.** Expanded volume gained (gal), expansion as a percent of
system volume, and a "closed system needs expansion control" note.

**Math.** `ΔV = V × (ρ_cold / ρ_hot − 1)` using bundled NIST water
density points (public), interpolated within 32–212 °F.

**Citation.** "Water density vs. temperature, NIST / standard steam
tables (public domain). Distinct from the expansion-tank sizing tiles —
this outputs the raw expansion volume only. Free at nist.gov."

**Edge cases.** Temperatures outside 32–212 °F rejected (no
extrapolation). Hot ≤ cold rejected. Open system → note that expansion
control is not required.

**Tests.** Six unit tests; fixture 50 gal, 50→140 °F → ≈ 0.84 gal.

### B.2 DWV vent-stack DFU/length check (`vent-sizing-stack`)

**Inputs.** Vent nominal diameter (in), connected drainage fixture units
(DFU), developed vent length (ft), the table-permitted DFU and max
length for that diameter (user-supplied from the adopted IPC/UPC table).

**Output.** Within-limit pass/fail, percent of permitted length used,
remaining length margin, and a "vent ≥ ½ drain diameter" check.

**Math.** Pass if `connected_DFU ≤ table_DFU` and
`developed_length ≤ table_max_length`. No proprietary table reproduced —
the user enters the two governing code values; the tile computes margins.

**Citation.** "Per the adopted plumbing code's vent sizing and length
provisions (IPC Chapter 9 / UPC Chapter 9 by name). Table values user-
supplied; the AHJ-adopted edition governs. Code library free read-only at
codes.iccsafe.org."

**Edge cases.** Vent smaller than half the drain diameter flagged.
Developed length excludes fitting equivalents — a banner notes it.
Wet-vent configurations out of scope.

**Tests.** Six unit tests; fixture 2-in vent, 24 DFU / 120 ft permitted,
18 DFU over 90 ft → pass, 75% length used.

### B.3 Low-pressure fuel-gas pressure drop (`gas-pipe-pressure-drop`)

**Inputs.** Gas flow (CFH), pipe inside diameter (in), pipe length (ft),
gas specific gravity (default 0.60 natural gas), low-pressure regime
confirmation (≤ ~1.5 psi).

**Output.** Pressure drop (in. w.c.), velocity (fpm), and an "exceeds
low-pressure validity" flag.

**Math.** Spitzglass low-pressure form
`Q = 3550 × K × sqrt((ΔH × D⁵) / (SG × L))` (public Spitzglass equation),
solved for ΔH given Q; velocity from Q and bore area.

**Citation.** "Per the published Spitzglass low-pressure gas-flow
equation (public engineering formula). The longhand alternative to the
NFPA 54 / IFGC capacity tables that the gas-pipe-sizing tile uses; NFPA
54 governs the installation. Free read-only at nfpa.org/freeaccess and
codes.iccsafe.org."

**Edge cases.** Inlet pressure above ~1.5 psi rejected (use the
high-pressure compressible form). Inside diameter must be actual bore,
not nominal — a banner notes it. Negative/zero flow or length rejected.

**Tests.** Six unit tests including 1000 CFH, 1.049-in ID, 100 ft, SG
0.60.

## 4. Phase C — HVAC (Group C, 3 tiles → calc-hvac.js)

### C.1 Air-side economizer free-cooling hours (`economizer-savings-hours`)

**Inputs.** Supply airflow (CFM), economizer changeover dry-bulb (°F),
required supply temperature (°F), economizer-eligible hours, mix-to-supply
ΔT (°F).

**Output.** Sensible free-cooling capacity (BTU/hr), ton-hours of
mechanical cooling offset, and an annual estimate over the entered hours.

**Math.** `Q_sens = 1.08 × CFM × ΔT`;
`ton-hours = Q_sens × hours / 12,000`.

**Citation.** "ASHRAE sensible-heat relation Q = 1.08 × CFM × ΔT
(public); air-side economizer changeover per ASHRAE Standard 90.1 by
name. Estimate; design conditions govern. ASHRAE 90.1 free read-only at
ashrae.org."

**Edge cases.** ΔT ≤ 0 → no free cooling (flagged, returns 0). The 1.08
factor is sea-level standard air — altitude/temperature density
correction not included, noted. Hours above 8760 rejected.

**Tests.** Six unit tests; fixture 4000 CFM, ΔT 20 °F → 86,400 BTU/hr.

### C.2 Insulated pipe heat loss, radial (`pipe-heat-loss-radial`)

**Inputs.** Pipe outer diameter (in), insulation thickness (in),
insulation k-value (BTU·in / hr·ft²·°F, user-supplied), fluid/surface
temperature (°F), ambient temperature (°F), pipe length (ft).

**Output.** Heat loss per linear foot (BTU/hr·ft) and total (BTU/hr),
with an outer-surface-temperature note.

**Math.** Cylindrical (radial) conduction
`Q/L = 2π·k·(T_hot − T_amb) / ln(r₂/r₁)`, `r₂ = r₁ + thickness`, units
reconciled in implementation.

**Citation.** "Fourier conduction through a cylindrical shell (public
heat-transfer formula); insulation k-values per ASHRAE Fundamentals /
ASTM C335 by name (user-supplied). Distinct from the flat-wall
insulation tiles — this is the radial log-mean form. Free principles in
published HVAC texts."

**Edge cases.** Thickness ≤ 0 rejected (flat-wall form understates a
small pipe). k rises with temperature — a banner notes the value is at
mean temperature. Ambient ≥ hot → returns 0 with a note.

**Tests.** Six unit tests; fixture r₁ = 1 in, r₂ = 2 in, k = 0.25, 200
vs 70 °F.

### C.3 Fan brake horsepower (`fan-motor-bhp`)

**Inputs.** Airflow (CFM), total static pressure (in. w.c.), fan total
efficiency (%), drive/belt efficiency (%).

**Output.** Air horsepower, brake horsepower (BHP), and the next standard
motor HP size.

**Math.** `AHP = CFM × TSP / 6356`; `BHP = AHP / η_fan`;
`motor HP = BHP / η_drive`, rounded up to the next standard NEMA size.

**Citation.** "AMCA / ASHRAE fan-power relation BHP = (CFM × SP) /
(6356 × η) (public); standard motor HP sizes per NEMA MG 1 by name.
Estimate; fan curve and motor data govern. Free principles in published
HVAC texts."

**Edge cases.** TSP must be *total* (external + internal) — a banner
notes it. Efficiency at the duty point, not peak. Zero/negative CFM or
TSP rejected; efficiency outside (0,1] rejected.

**Tests.** Six unit tests; fixture 4000 CFM, 2.0 in w.c., η_fan 0.65 →
BHP ≈ 1.94 → 2 HP.

## 5. Phase D — Water Damage / Mold Restoration (Group D, 2 tiles → calc-restoration.js)

### D.1 Moisture removed by grain depression (`grains-removed`)

**Inputs.** Dehumidifier process airflow (CFM), inlet grains-per-pound
(GPP), outlet GPP, run hours.

**Output.** Grain depression (GPP), water-removal rate (lb/hr and
pints/hr), and total water over the run (gal).

**Math.** `ΔG = inlet − outlet`; mass air `≈ CFM × 60 / 13.33` lb-dry-air/hr
(standard humid volume); water `lb/hr = mass-air × ΔG / 7000`
(7000 grains = 1 lb); gal = `lb/hr × hours / 8.345`.

**Citation.** "First-principles psychrometric mass balance (7000
grains/lb; ~13.33 ft³/lb dry air at standard conditions). IICRC S500
grain-depression field method by name. Distinct from the psychrometric
and dehumidifier-sizing tiles — this verifies in-situ performance from
measured inlet/outlet readings. IICRC S500 governs the drying plan."

**Edge cases.** Outlet GPP ≥ inlet → sensor/placement error, flagged.
Humid volume varies with temperature — the 13.33 constant flagged at high
temperatures. Verifies field performance, not the AHAM rating.

**Tests.** Six unit tests; fixture 250 CFM, ΔG 40 GPP, 24 hr → ≈ 6.43
lb/hr, ≈ 18.5 gal.

### D.2 Evaporation load / dehu demand (`evaporation-load`)

**Inputs.** Affected floor area (ft²), water class (1–4), ceiling height
(ft; default 8), per-class initial-load factor (gal/ft²; editable
default), first-24-hour fraction (default), dehumidifier derating factor
(default).

**Output.** Estimated initial water load (gal and lb), first-24-hour
removal target (pints), and suggested AHAM dehumidifier pints with a
safety factor.

**Math.** `load_gal = area × load_factor(class)`; `lb = gal × 8.345`;
first-24h pints `= load_gal × 8 × fraction`; suggested AHAM pints
`= target / derating`.

**Citation.** "Per the IICRC S500 water-class framework and evaporation-
load drying principle by name (not reproduced); per-class load factors
are editable field defaults the user tunes to the standard and the job.
IICRC S500 governs."

**Edge cases.** Load factors are estimates — output is only as good as
the class assessment, stated plainly. Class 4 (bound water) is non-linear
in area, flagged. Ignores HVAC/open-air contribution, noted.

**Tests.** Six unit tests; fixture 800 ft², Class 3 (0.08 gal/ft²) → 64
gal initial load.

## 6. Phase E — Construction / Carpentry (Group E, 3 tiles → calc-construction.js)

### E.1 Bearing length on a wood plate (`point-load-bearing`)

**Inputs.** Reaction load (lb), member bearing width (in), allowable
compression perpendicular to grain Fc⊥ (psi; user-supplied by
species/grade), bearing-area factor Cb (optional).

**Output.** Required bearing length (in), actual bearing stress (psi),
and pass/fail vs. allowable.

**Math.** `A_req = P / (Fc⊥ × Cb)`; `length = A_req / width`;
`f_c⊥ = P / (width × length)`.

**Citation.** "Per the National Design Specification (NDS) for Wood
Construction — compression perpendicular to grain and the bearing-area
factor, by name; Fc⊥ values user-supplied by species/grade. The
IBC-adopted NDS edition governs. AWC publishes the NDS free read-only at
awc.org."

**Edge cases.** Cb applies only to bearings under ~6 in not near a member
end — flagged. Perpendicular vs. parallel grain values differ greatly — a
banner names the axis. Does not check crushing of the supported member.

**Tests.** Six unit tests; fixture 4000 lb, 3.0-in width, Fc⊥ 625 psi →
≈ 2.13 in bearing.

### E.2 Wood column capacity, slenderness (`column-buckling-wood`)

**Inputs.** Column dimensions b × d (in), unbraced length (in), Fc* (psi,
user-supplied), Emin (psi, user-supplied), effective-length factor Ke.

**Output.** Slenderness ratio le/d, column stability factor Cp, allowable
Fc′ (psi), and allowable axial load (lb).

**Math.** `le/d` (larger ratio governs);
`FcE = 0.822·Emin / (le/d)²`; `α = FcE / Fc*`, `c = 0.8` (sawn lumber);
`Cp = (1+α)/(2c) − sqrt(((1+α)/(2c))² − α/c)`; `Fc′ = Fc*·Cp`;
capacity = `Fc′ × b × d`.

**Citation.** "Per the NDS column-stability provisions (the Cp / Euler
buckling basis), by name; reference design values user-supplied. The
IBC-adopted NDS edition governs. AWC publishes the NDS free read-only at
awc.org."

**Edge cases.** le/d above 50 rejected (NDS limit). Solid rectangular
only — built-up/round out of scope, flagged. The smaller two-axis
capacity governs.

**Tests.** Six unit tests; fixture 3.5×3.5 in, le 96 in, Fc* 1150, Emin
580,000 → capacity ≈ 6,950 lb.

### E.3 Simple-span beam reactions and max moment (`beam-reactions`)

**Inputs.** Span L (ft), uniform load w (plf), optional point load P (lb)
at distance a (ft) from the left support.

**Output.** Left/right reactions (lb), max shear (lb), and max bending
moment (ft-lb), with superposition of UDL and point load.

**Math.** UDL: `R = wL/2`, `M_max = wL²/8`. Point load:
`R_left = P(L−a)/L`, `R_right = Pa/L`, moment at the load = `R_left·a`.
Superpose.

**Citation.** "Statics / AISC Steel Construction Manual simple-beam
diagram formulas (public; also in the AWC/NDS and any statics text).
Distinct from the beam-loading and joist-deflection tiles — this outputs
reactions and moment for post/footing sizing, not stress or deflection."

**Edge cases.** Simple-span pinned-roller only — fixed/continuous/
cantilever out of scope, flagged. Point-load location must be 0 ≤ a ≤ L.
Self-weight not added unless folded into w, noted.

**Tests.** Six unit tests; fixture L 16 ft, w 200 plf → R 1600 lb,
M_max 6400 ft-lb.

## 7. Phase F — Fire-Ground Engineering (Group F, 2 tiles → calc-fire.js)

### F.1 Elevation pressure loss/gain (`elevation-pressure-loss`)

**Inputs.** Elevation change (ft) or number of floors, direction
(up/down).

**Output.** Elevation pressure loss or gain (psi), reported both as the
exact hydrostatic value and the fire-ground rule of thumb.

**Math.** Exact `P_elev = 0.434 × ΔH_ft`; rule of thumb `≈ 5 psi/floor`
(~10-ft floors). Loss climbing, gain descending.

**Citation.** "Hydrostatic head 0.434 psi/ft (public). Fire-ground
'5 psi per floor' standpipe approximation per IFSTA Pumping Apparatus
Driver/Operator and the NFPA 14 design basis, by name. Feeds the pump
discharge pressure tiles; distinct from pdp / standpipe-pdp which bundle
friction and nozzle pressure."

**Edge cases.** The 5-psi/floor rule assumes 10-ft floors — both values
shown so the user sees the divergence. Below-grade gives a gain.
Friction loss not included, noted.

**Tests.** Six unit tests; fixture 9 floors above pump → exact ≈ 39 psi,
rule 45 psi.

### F.2 Water-supply duration (`water-supply-duration`)

**Inputs.** Available water volume (gal), required/selected flow (GPM),
optional continuous resupply rate (GPM).

**Output.** Sustainable duration (min); with resupply, net drawdown time
and the steady-state sustainable flow.

**Math.** `t = V / GPM`; with resupply R: net drain `GPM − R`; if
`R ≥ GPM`, supply is effectively sustained (report sustainable flow);
else `t = V / (GPM − R)`.

**Citation.** "Volume/flow continuity (first principles). Required-
duration context per NFPA 1142 (rural/suburban water supply) by name.
Distinct from nfpa-1142-water-supply (which sizes required supply from
the structure) and scba-cylinder-time (air, not water). NFPA 1142 free
read-only at nfpa.org/freeaccess."

**Edge cases.** Constant flow assumed. Resupply ≥ demand → effectively
unlimited, flagged, reports sustainable flow instead. Usable tank volume
< nominal (draft losses), noted.

**Tests.** Six unit tests; fixture 3000 gal, 250 GPM, no resupply → 12
min; with 150 GPM shuttle → 30 min.

## 8. Phase J — Trucking and Logistics (Group J, 3 tiles → calc-trucking.js)

### J.1 Operating cost per mile (`cost-per-mile`)

**Inputs.** Fixed monthly costs ($), miles per month, fuel price ($/gal),
fuel economy (mpg), maintenance ($/mi), driver pay ($/mi or salary).

**Output.** Fixed CPM, fuel CPM, maintenance CPM, driver CPM, total CPM,
and break-even rate per mile.

**Math.** `fixed_cpm = fixed_monthly / miles`; `fuel_cpm = price / mpg`;
`total_cpm = fixed + fuel + maintenance + driver`; break-even = total CPM.

**Citation.** "Cost-per-mile bucket methodology per ATRI (American
Transportation Research Institute), 'An Analysis of the Operational Costs
of Trucking,' by name; arithmetic is public and all figures are user-
supplied. Report free at truckingresearch.org."

**Edge cases.** Miles/month = 0 → fixed CPM undefined, rejected. mpg = 0
rejected. A banner notes deadhead miles should be in the mileage base or
fixed costs are understated.

**Tests.** Six unit tests; fixture fixed $6000 / 10,000 mi, $4.00/gal at
6.5 mpg, $0.18 maint, $0.65 driver → ≈ $2.045/mi.

### J.2 Deadhead percentage and effective rate (`deadhead-percent`)

**Inputs.** Loaded miles, deadhead miles, linehaul revenue ($), optional
fuel surcharge ($).

**Output.** Total miles, deadhead %, rate per loaded mile, rate per total
mile, and the effective loaded rate after absorbing empty miles.

**Math.** `total = loaded + deadhead`; `deadhead% = deadhead/total × 100`;
`rate_loaded = revenue/loaded`; `rate_total = revenue/total`.

**Citation.** "Freight-economics arithmetic; FMCSA/DOT terminology
('deadhead' = unladen movement), by name. Public definitions, no
proprietary table."

**Edge cases.** Loaded miles = 0 → rate per loaded mile undefined,
flagged. Deadhead above ~25% flagged as a profitability warning (advisory,
not a rule). Fuel surcharge not double-counted against the empty leg.

**Tests.** Six unit tests; fixture 800 loaded / 120 deadhead / $1840 →
13.0% deadhead, $2.30 loaded, $2.00 total.

### J.3 Axle-load tandem slide (`axle-load-distribution`)

**Inputs.** Drive-tandem weight (lb), trailer-tandem weight (lb),
kingpin-to-tandem distance (in, for the lever-arm method), hole spacing
(in; default 6), legal cap (lb; default 34,000 tandem / 12,000 steer).

**Output.** Over/under per axle group (lb), holes to slide, direction
(forward/back), weight shift per hole (lb), and projected weights.

**Math.** Lever-arm: moving the tandem d inches changes the trailer-
tandem reaction by `ΔW = load × d / L`. Holes = `target_shift /
shift_per_hole`, rounded. The per-hole constant is computed from the lever
arm, not assumed.

**Citation.** "Per the federal axle/gross weight limits — 23 CFR 658.17
(12,000 lb steer, 34,000 lb tandem, 80,000 lb gross) and the federal
Bridge Formula, by name; lever-arm statics is public. Cross-references the
bridge-formula tile. FMCSA enforces. Free at ecfr.gov."

**Edge cases.** Sliding redistributes between drive and trailer groups
only — it cannot fix an over-gross load, flagged separately. The steer
limit is set by the fifth-wheel position, not the tandem slide, noted.
Bridge-formula spacing may bind before the 34,000-lb cap — cross-linked.

**Tests.** Six unit tests including a 1200-lb-over drive tandem shifted
under the cap.

## 9. Phase K — Mechanic (Group K, 3 tiles → calc-mechanic.js)

### K.1 Horsepower from torque and RPM (`hp-from-torque`)

**Inputs.** Torque (lb-ft), RPM, or any two of {HP, torque, RPM} with a
solve-for selector.

**Output.** Horsepower, kilowatts, and the solved-for quantity.

**Math.** `HP = Torque × RPM / 5252` (5252 = 33,000 / 2π);
`kW = HP × 0.7457`. Torque and HP are equal at 5252 RPM by definition.

**Citation.** "Classical definition of mechanical power (Watt's 33,000
ft-lb/min); SAE J1349 engine-power rating by name. The constant 5252 is a
pure derivation, fully public."

**Edge cases.** RPM = 0 → HP = 0 (torque may be non-zero at stall).
Solving for RPM with torque = 0 → undefined, rejected. Output is
brake/observed power per the inputs, not SAE-corrected unless the dyno
applied the correction, noted.

**Tests.** Six unit tests; fixture 400 lb-ft at 5000 RPM → ≈ 380.8 HP.

### K.2 Volumetric efficiency and airflow (`volumetric-efficiency`)

**Inputs.** Displacement (ci), RPM, VE % (to compute CFM) or measured CFM
(to compute VE), cycle (4-stroke / 2-stroke).

**Output.** Theoretical CFM, actual CFM, and volumetric efficiency (%) or
required induction CFM at a target VE.

**Math.** 4-stroke theoretical CFM = `displacement × RPM / 3456` (3456 =
1728 × 2 revs/intake-cycle); 2-stroke uses `/1728`.
`VE% = actual / theoretical × 100`.

**Citation.** "Classical four-stroke airflow derivation; SAE engine-test
conventions by name. The 3456/1728 constants are pure unit derivations,
public (in every engine-builder reference)."

**Edge cases.** 2-stroke toggle changes the divisor. VE above 100% is
legitimate for forced induction / tuned runners — flagged, not clamped.
CFM is at standard density — boosted/altitude air differs, noted.

**Tests.** Six unit tests; fixture 350 ci at 5500 RPM 4-stroke → 557 CFM
theoretical.

### K.3 Gear-ratio MPH from RPM (`gear-mph-rpm`)

**Inputs.** RPM, transmission gear ratio, axle ratio, tire diameter (in)
or size code, solve-for (MPH / RPM).

**Output.** MPH (or RPM), wheel RPM, and tire revolutions per mile.

**Math.** `MPH = RPM × π × dia × 60 / (trans × axle × 63,360)`; inverse
for RPM; revs/mile = `63,360 / (π × dia)`.

**Citation.** "Classical drivetrain kinematics; SAE J267 metric tire-size
convention for decoding a tire code to diameter, by name. Pure geometry,
public. Consistent with the tire-gearing decoder."

**Edge cases.** Total ratio = 0 rejected. Geometric (no-slip) speed —
ignores tire and torque-converter slip, noted. Tire-code → diameter
matches the tire-gearing tile for consistency.

**Tests.** Six unit tests; fixture 2500 RPM, 1:1, 3.55 axle, 28.5-in
tire → ≈ 59.7 MPH.

## 10. Phase L — Agriculture and Forestry (Group L, 3 tiles → calc-agriculture.js)

### L.1 Growing degree days (`growing-degree-days`)

**Inputs.** Daily {Tmax °F, Tmin °F} series, base temperature (°F;
crop-specific, e.g., corn 50), optional upper cutoff (°F; e.g., corn 86),
method (standard / modified).

**Output.** Daily GDD series, accumulated GDD, and days counted.

**Math.** `GDD = ((min(Tmax, cutoff) + max(Tmin, base?)) / 2) − base`,
floored at 0; the modified method caps Tmax at the cutoff and floors Tmin
at the base before averaging.

**Citation.** "Per the USDA / NWS growing-degree-day method and McMaster
& Wilhelm (1997), 'Growing degree-days: one equation, two
interpretations,' Agric. & Forest Meteorology 87, by name. Corn 50/86 °F
base/cutoff is the long-standing land-grant extension convention. Free at
university extension sites and pubmed/agresearch indexes."

**Edge cases.** Tmin > Tmax (bad data) → the day is flagged and skipped.
Negative daily GDD clamps to 0, never subtracted. Standard vs. modified
materially differs on hot days — the method is labeled.

**Tests.** Six unit tests; fixture corn, Tmax 92 / Tmin 64 (modified) →
25 GDD.

### L.2 Pearson-square feed ration (`pearson-square-ration`)

**Inputs.** Feed A nutrient %, feed B nutrient %, target %, optional total
batch (lb).

**Output.** Parts A, parts B, percent A/B, lb A/B (if batch given), and a
verified blend %.

**Math.** `parts_a = |B − target|`, `parts_b = |A − target|`;
`pct_a = parts_a / (parts_a + parts_b)`; verify
`pct_a·A + pct_b·B = target`.

**Citation.** "Pearson square method — standard land-grant animal-science
ration formulation (USDA / university extension; Ensminger 'Feeds &
Nutrition'), by name. The square is public arithmetic. Free at university
extension sites."

**Edge cases.** Target must lie strictly between A and B, else negative
parts → "blend impossible," flagged. A = B → degenerate, rejected. Single
nutrient only — does not balance energy and protein simultaneously,
noted.

**Tests.** Six unit tests; fixture corn 9% / SBM 44% to 16% CP → 80%
corn, 20% SBM.

### L.3 Livestock water requirement (`livestock-water-requirement`)

**Inputs.** Species/class (beef / dairy / swine / sheep / poultry /
horse), head count, body weight (lb) or class, air temperature (°F),
lactating flag, optional dry-matter intake (lb).

**Output.** Gallons per head per day, total herd gallons per day, and the
method note.

**Math.** Temperature-scaled per-class gallons interpolated linearly
between user-supplied published breakpoints; or the intake-ratio method
(~3–4 lb water per lb DMI for cattle). Breakpoint values are user-
supplied, not bundled.

**Citation.** "Per NRC Nutrient Requirements of Beef Cattle / Dairy
Cattle water-intake guidance and the USDA NRCS National Range and Pasture
Handbook water section, by name; per-class gallon breakpoints user-
supplied (table values, not reproduced). Distinct from thi-livestock
(heat-stress index, no water demand). Free NRCS guidance at
nrcs.usda.gov."

**Edge cases.** Lactation roughly doubles dairy demand — the flag is
required. Above ~90 °F extrapolates beyond the table — flagged as
out-of-range. Intake-ratio thumb rule labeled approximate vs. the table
method.

**Tests.** Six unit tests; fixture 50 beef cows, ~1200 lb, 80 °F → herd
total at the user-entered per-head rate.

## 11. Phase M — Water and Wastewater (Group M, 3 tiles → calc-water.js)

### M.1 Weir / flume open-channel flow (`weir-flow`)

**Inputs.** Weir type (90° V-notch / rectangular contracted / rectangular
suppressed), head over crest H (ft), crest length L (ft, rectangular),
weir coefficient (editable default per type).

**Output.** Flow rate (ft³/s, GPM, MGD).

**Math.** 90° V-notch: `Q = 2.49 × H^2.48`. Rectangular (Francis):
`Q = 3.33 × (L − 0.2H) × H^1.5` (contracted) or `3.33 × L × H^1.5`
(suppressed). 1 cfs = 448.831 GPM.

**Citation.** "Per the USBR Water Measurement Manual (public domain) —
V-notch and Francis rectangular-weir equations and Kindsvater-Carter /
Francis coefficients; the user confirms the calibrated weir coefficient.
Free at usbr.gov/tsc/techreferences/mands/wmm."

**Edge cases.** Requires a fully-contracted, ventilated, sharp-crested
weir with free flow — submerged/drowned condition flagged invalid. H
below ~0.2 ft flagged as low-accuracy. Approach-velocity correction
ignored, noted.

**Tests.** Six unit tests; fixture 90° V-notch, H 0.5 ft → ≈ 0.446 cfs
≈ 200 GPM.

### M.2 Langelier saturation index (`langelier-index`)

**Inputs.** pH, water temperature (°F or °C), calcium hardness (mg/L as
CaCO₃), total alkalinity (mg/L as CaCO₃), TDS (mg/L).

**Output.** LSI value and interpretation (corrosive < 0 / balanced ≈ 0 /
scaling > 0).

**Math.** `LSI = pH − pHs`, `pHs = (9.3 + A + B) − (C + D)` with
`A = (log₁₀(TDS) − 1)/10`, `B = −13.12·log₁₀(T_K) + 34.55`,
`C = log₁₀(Ca) − 0.4`, `D = log₁₀(alkalinity)`.

**Citation.** "Langelier (1936) saturation index as standardized in
Standard Methods for the Examination of Water and Wastewater
(APHA/AWWA/WEF) and AWWA practice, by name; method cited, not reproduced.
The user supplies measured water-quality values."

**Edge cases.** Valid roughly 25–250 mg/L Ca and alkalinity — outside
that, Ryznar/modified indices suggested, flagged. Temperature handled in
Kelvin (°F/°C convert). LSI predicts tendency, not rate, noted.

**Tests.** Six unit tests; fixture pH 7.5, 25 °C, Ca 200, alk 150, TDS
320 → LSI ≈ +0.04.

### M.3 Chemical metering-pump setting (`chemical-feed-pump`)

**Inputs.** Plant flow (MGD or GPM), target dose (mg/L), solution
strength (% active by weight), solution specific gravity, pump max output
(GPD).

**Output.** Neat chemical (lb/day), solution feed (GPD and mL/min), and
pump setting (% of max).

**Math.** `pure_lb/day = MGD × dose × 8.34`;
`solution_lb/day = pure / (strength%/100)`;
`GPD = solution_lb/day / (8.34 × SG)`;
`mL/min = GPD × 3785.41 / 1440`; `setting% = GPD / pump_max × 100`.

**Citation.** "Pounds-formula basis (lb/day = MGD × mg/L × 8.34),
standard AWWA / EPA water-operator practice, by name. Distinct from the
coagulant-dose and pounds-formula tiles — this solves for the physical
pump setting (% / GPD / mL·min⁻¹). The operator of record and primacy
agency govern."

**Edge cases.** % by weight vs. trade strength (12.5% NaOCl ≈ 11.8% by
weight) — a banner flags the distinction. Setting above 100% → pump
undersized, flagged. Calibrate against a drawdown cylinder, not the dial,
noted.

**Tests.** Six unit tests; fixture 0.5 MGD, 8 mg/L, 12.5% NaOCl, SG 1.16,
50 GPD pump → ≈ 55% of max.

## 12. Phase N — Stage and Live Production (Group N, 1 tile → calc-stage.js)

### N.1 Power distro per-leg loading (`power-distro`)

**Inputs.** Total connected load (W, or per-phase W), service voltage
(120/208 1Φ or 3Φ), service rating (A per leg), power factor (default
1.0), continuous-derate target (default 80%).

**Output.** Current per leg (A), % of service rating, headroom (A), and
pass/fail vs. the 80% continuous limit.

**Math.** 1Φ: `I = W / (V × PF)`; 3Φ balanced:
`I = W / (√3 × V_LL × PF)`; `%load = I / rating × 100`; continuous limit
= `rating × 0.80`.

**Citation.** "First-principles AC power (P = V·I·PF; 3Φ adds √3). The
NEC continuous-load 80% rule and temporary-power Articles 520/525 by
name; a qualified electrician and the AHJ govern temporary power.
Distinct from neutral-imbalance (which solves neutral current) — this
solves per-leg service loading. Free read-only at nfpa.org/freeaccess."

**Edge cases.** Assumes balanced legs unless per-phase entered —
imbalance loads one leg harder, noted. Ignores inrush/dimmer harmonics on
the neutral. PF < 1 for LED/motor loads raises current.

**Tests.** Six unit tests; fixture 12,000 W on 120/208 3Φ, 60 A/leg → ≈
33.3 A/leg, pass.

## 13. Phase O — Kitchen and Food Service (Group O, 1 tile → calc-kitchen.js)

### O.1 Brine / cure concentration (`brine-cure`)

**Inputs.** Mode (brine-by-volume / equilibrium-cure-by-weight), water
weight or volume, salt added, meat weight, optional curing-salt #1
(6.25% nitrite) amount, target salt %.

**Output.** Brine salinity (% by weight), equilibrium salt % of total,
finished-product nitrite ppm (if cure entered), and salt-to-add for the
target %.

**Math.** Brine % = `salt / (salt + water) × 100`; equilibrium salt % =
`salt / (meat + water) × 100`; nitrite ppm = `cure × 0.0625 × 1e6 /
total`; salt-to-add = `target% × total / 100 − current_salt`.

**Citation.** "First-principles mass-fraction chemistry. Prague Powder #1
is 6.25% sodium nitrite; finished-product ingoing nitrite is limited per
USDA FSIS regulation (9 CFR 424.21/424.22, by name) — the user confirms
the current FSIS limit. Free at fsis.usda.gov and ecfr.gov."

**Edge cases.** Nitrite ppm at or above the regulated ingoing maximum →
flagged red. Equilibrium cure assumes full absorption (real uptake
varies), noted. "Salt % by weight vs. by volume" labeled clearly to avoid
the classic cook's error.

**Tests.** Six unit tests including an equilibrium dry-cure nitrite-ppm
case checked against the published 6.25% nitrite constant.

## 14. Phase P — Field, Backcountry, and SAR (Group P, 1 tile → calc-field.js)

### P.1 Search probability of detection (`search-probability`)

**Inputs.** Per-pass POD values (%, up to 5 passes), optional POA
(probability the area contains the subject, %).

**Output.** Cumulative POD (%), cumulative POS = POA × cumulative POD
(%), and residual containment probability after the searches.

**Math.** `cumulative_POD = 1 − Π(1 − POD_i)`;
`POS = POA × cumulative_POD`; residual = `POA × (1 − cumulative_POD)`.

**Citation.** "Standard SAR search theory (Koopman detection theory) as
used in the U.S. National SAR Supplement and NASAR / FEMA search-planning
doctrine, by name; POD/POA/POS definitions are public. Method cited, not
reproduced."

**Edge cases.** Assumes independent passes — correlated searches (same
searcher/conditions) overstate cumulative POD, flagged. POD is a field
estimate, noted. POS ≤ POA always (asserted).

**Tests.** Six unit tests; fixture POD 30/40/50%, POA 60% → cumulative
POD 79%, POS 47.4%.

## 15. Phase R — Accounting, Tax, and Small-Business (Group R, 3 tiles → calc-accounting.js)

### R.1 Declining-balance depreciation, book (`declining-balance-depreciation`)

**Inputs.** Cost ($), salvage ($), useful life (yr), DB factor (150% /
200%), year of interest, switch-to-straight-line toggle.

**Output.** Per-year depreciation schedule, the year's depreciation ($),
accumulated depreciation ($), and year-end book value ($).

**Math.** `DB_rate = factor × (1/life)`;
`dep = book_begin × DB_rate`, floored so book value never drops below
salvage; optional straight-line crossover when
`(book − salvage)/remaining_life ≥ DB_amount`.

**Citation.** "GAAP book depreciation — ASC 360 (Property, Plant, and
Equipment), by name; distinct from the macrs-depreciation tile (IRS Pub
946 tax method). Accounting information, not advice; a CPA and current
GAAP govern."

**Edge cases.** Pure DDB never reaches salvage without the SL switch or a
final-year plug — the convention used is stated. Salvage is *not*
subtracted before applying the DB rate (unlike straight-line) — flagged
to prevent the common error. Optional mid-year first-year convention.

**Tests.** Eight unit tests; fixture $50,000 cost, $5,000 salvage, 5 yr,
200% DDB → Yr1 $20,000, with the SL crossover schedule verified.

### R.2 Markup vs. margin converter (`markup-vs-margin`)

**Inputs.** Any two of {cost, selling price, markup %, gross margin %},
optional unit count for total gross profit.

**Output.** Selling price ($), cost ($), markup (%), gross margin (%), and
gross profit per unit and total ($).

**Math.** `markup% = (price − cost)/cost × 100`;
`margin% = (price − cost)/price × 100`;
`margin% = markup%/(1 + markup%)`; `markup% = margin%/(1 − margin%)`;
`price = cost × (1 + markup%) = cost/(1 − margin%)`.

**Citation.** "Standard managerial-accounting pricing identity (cost-
volume-profit), universal public formula; AICPA / introductory
managerial-accounting texts by name."

**Edge cases.** Margin ≥ 100% → division by zero guarded (price would be
infinite), rejected. Markup and margin diverge sharply (50% markup =
33.3% margin) — both shown. Cost > price (selling at a loss) allowed but
flagged.

**Tests.** Six unit tests; fixture cost $60, markup 50% → price $90,
margin 33.3%.

### R.3 Employer payroll tax (`employer-payroll-tax`)

**Inputs.** Gross annual wages ($), Social Security wage base ($,
user-supplied current year), FUTA wage base ($7,000), FUTA effective rate
(% after state credit; default 0.6), optional state SUTA rate (%) and
wage base.

**Output.** Employer Social Security ($), employer Medicare ($), FUTA ($),
SUTA ($), total employer payroll tax ($), and fully-loaded employer cost.

**Math.** `SS = min(wages, SS_base) × 6.2%`; `Medicare = wages × 1.45%`
(no employer Additional Medicare); `FUTA = min(wages, 7000) × FUTA_rate`;
`SUTA = min(wages, state_base) × SUTA_rate`.

**Citation.** "FICA — 26 USC 3101/3111 and IRS Pub 15 (Circular E),
rates 6.2% SS / 1.45% Medicare; FUTA — 26 USC 3301–3306, $7,000 wage
base, 6.0% gross / 0.6% net with the state credit, IRS Form 940 — all by
name. The SS wage base is indexed annually and user-supplied. Distinct
from the employee-side payroll-withholding tile. Tax information, not
advice; the current-year wage base and IRS Circular E govern. Free at
irs.gov/forms-pubs and uscode.house.gov."

**Edge cases.** SS wage base changes yearly — required as a user input.
FUTA credit-reduction states (rate > 0.6%) flagged. Employer pays no
Additional Medicare match — clarified.

**Tests.** Eight unit tests including a high-earner case above the SS
wage base.

## 16. Phase S — Legal (Group S, 2 tiles → calc-legal.js)

### S.1 Federal post-judgment interest (`federal-post-judgment-interest`)

**Inputs.** Judgment principal ($), the applicable 1-year Treasury
weekly-average rate (%, user-supplied for the week preceding judgment),
judgment date, accrual-through date.

**Output.** Statutory rate used (%), days elapsed, accrued interest ($),
total owed ($), per-day accrual ($), and the annual-compounding
breakdown.

**Math.** Rate = the 1-year constant-maturity Treasury yield for the
calendar week preceding judgment; interest from the date of entry,
**compounded annually**: `accrued = principal × ((1 + r)^years − 1)`,
with the daily rate `principal × r × days/365` within a year.

**Citation.** "Per 28 USC 1961 — §1961(a) rate (the weekly-average 1-year
CMT yield published by the Federal Reserve for the week preceding
judgment) and §1961(b) annual compounding, by name; the rate is published
by the Federal Reserve (H.15) and user-supplied. Distinct from the
state-rate judgment-interest tile. Legal information, not advice; the
court's judgment and the clerk's rate determination govern. Free at
uscode.house.gov and federalreserve.gov."

**Edge cases.** The rate is fixed at the week-before-judgment value for
the life of the judgment (not floating) — the user supplies the correct
historical rate, noted. Compounds annually, not daily — differs from many
state methods. State-court judgments use state law — cross-linked to the
state tile.

**Tests.** Six unit tests; fixture $100,000 at 5.00% over 2 yr (annual
compounding) → $10,250 accrued, $110,250 owed.

### S.2 Lease / rent proration (`lease-rent-proration`)

**Inputs.** Monthly rent ($), move-in or move-out date, period type,
proration method (actual days / 30-day / 365-day), optional lease end
date.

**Output.** Daily rate ($), days owed, prorated amount ($), the method
used, and the inclusive-day convention applied.

**Math.** Actual-days: `daily = rent / days_in_month`. 30-day:
`daily = rent / 30`. 365-day: `daily = rent × 12 / 365`. Prorated =
`daily × occupied_days` (move-in day inclusive by the common convention).

**Citation.** "Governed by the lease and state landlord-tenant law (cited
as such); the 365-day and 30-day proration methods mirror RESPA/CFPB
closing-proration conventions (12 CFR 1024, by name). Legal information,
not advice; the lease terms and governing state law control the method.
Free at consumerfinance.gov and ecfr.gov."

**Edge cases.** The method changes the amount (a February actual-day rate
exceeds the 30-day rate) — the method is labeled, "lease governs" stated.
Inclusive vs. exclusive of the move-in/out day differs by lease — the
convention is exposed. Leap-year February handled in actual-days.

**Tests.** Six unit tests including a move-in mid-March across all three
methods.

## 17. Phase T — Bench Science and Laboratory (Group T, 2 tiles → calc-lab.js)

### T.1 Primer melting temperature (`primer-tm`)

**Inputs.** Primer sequence (or A/T/G/C counts), method (Wallace
short-oligo / basic GC%), optional [Na⁺].

**Output.** Tm (°C), primer length (nt), and GC content (%).

**Math.** Wallace (≤14 nt): `Tm = 2(A+T) + 4(G+C)`. Basic GC% (>14 nt):
`Tm = 64.9 + 41 × (G + C − 16.4) / (A+T+G+C)`.

**Citation.** "Per Wallace R.B. et al., Nucleic Acids Research 6 (1979),
for the short-oligo rule and Marmur & Doty, J Mol Biol 5 (1962) /
standard molecular-biology references for the GC% formula, by name.
Complements the pcr-master-mix tile. Nearest-neighbor (SantaLucia)
thermodynamics is the modern gold standard — these are quick estimates,
labeled. Free abstracts at pubmed.ncbi.nlm.nih.gov."

**Edge cases.** The Wallace rule is valid only for short primers (≤14 nt)
at ~1 M NaCl — the method is gated by length and diverges otherwise.
Self-complementarity/hairpins not modeled. Non-ACGT characters flagged
and dropped.

**Tests.** Six unit tests; fixture `GCGGATCCATG` (11 nt) via Wallace →
Tm 36 °C.

### T.2 CFU/mL viable plate count (`cfu-plate-count`)

**Inputs.** Colonies counted, dilution factor, volume plated (mL);
optional second countable dilution for the standard averaged method.

**Output.** CFU/mL of the original sample and a countable-range validity
flag.

**Math.** `CFU/mL = colonies / (dilution_factor × volume_plated)`; for
averaged plates the standard `ΣC / [V × (n1 + 0.1·n2) × d]` form.

**Citation.** "Per the FDA Bacteriological Analytical Manual (BAM)
Chapter 3 (Aerobic Plate Count) and APHA Standard Methods, by name; both
public/free. Countable range 25–250 (FDA BAM) or 30–300 (APHA). Free at
fda.gov/food/laboratory-methods-food."

**Edge cases.** Counts outside the countable range are statistically
unreliable — TNTC/TFTC flagged. Dilution-factor sign convention (10⁻⁶ vs
"1,000,000×") accepted both ways and echoed. Spread/pour/spiral change the
effective plated volume, noted.

**Tests.** Six unit tests; fixture 150 colonies, 10⁻⁵ dilution, 0.1 mL →
1.5 × 10⁸ CFU/mL.

## 18. Phase U — Veterinary (Group U, 4 tiles → calc-vet.js)

Every Group U tile carries the spec-v12 "veterinarian governs — estimate
only" banner.

### U.1 Veterinary body surface area (`vet-body-surface-area`)

**Inputs.** Species (dog / cat), body weight (kg), optional dose
(mg/m²).

**Output.** Body surface area (m²) and the total dose (mg) if a mg/m²
rate is entered.

**Math.** Meeh formula `BSA = K × W_g^(2/3) / 1e4`, K = 10.1 (dog) / 10.0
(cat), weight in grams; the equivalent kg form (dog) `0.101 × W_kg^(2/3)`.

**Citation.** "Per the Meeh formula with the standard veterinary K
constants (dog 10.1, cat 10.0) as published in Plumb's Veterinary Drug
Handbook and the veterinary-oncology weight-to-BSA conversion, by name.
Veterinarian governs."

**Edge cases.** BSA dosing of cytotoxics is debated below ~10 kg — dogs
under 10 kg flagged (many protocols cap or switch to mg/kg). The g-vs-kg
unit is validated and echoed (the classic catastrophic error). Does not
capture lean mass — obesity inflates a BSA-based dose, noted.

**Tests.** Six unit tests; fixture dog 20 kg → BSA 0.744 m².

### U.2 Corrected reticulocyte / production index (`vet-corrected-reticulocyte`)

**Inputs.** Reticulocyte % (or absolute /µL), patient PCV (%), species,
normal PCV (default 45 dog / 37 cat), optional RBC count.

**Output.** Corrected reticulocyte %, absolute reticulocyte count (/µL),
and a regenerative / non-regenerative band.

**Math.** `corrected% = observed% × patient_PCV / normal_PCV`;
`absolute = retic% × RBC`. Regenerative thresholds: dog > 60,000/µL, cat
(aggregate) > 50,000/µL.

**Citation.** "Standard veterinary hematology — Weiss & Wardrop, Schalm's
Veterinary Hematology, and ASVCP regenerative thresholds, by name; the
correction ratio is classical (Crosby). Reference thresholds are
laboratory- and species-specific. Veterinarian governs."

**Edge cases.** Cats have aggregate vs. punctate reticulocytes — only
aggregate reflects acute regeneration, flagged. Regeneration lags 3–5
days — an early result may be pre-regenerative, noted. Absolute count is
preferred over corrected % — both output.

**Tests.** Six unit tests; fixture dog 5% retic, PCV 20%, normal 45% →
corrected 2.2%, absolute 150,000/µL.

### U.3 Veterinary dehydration fluid deficit (`vet-fluid-deficit`)

**Inputs.** Body weight (kg), estimated dehydration (%), maintenance rate
(mL/kg/day, default), ongoing losses (mL/day), replacement period (hr).

**Output.** Fluid deficit (mL), maintenance volume (mL/day), total
24-hour volume (mL), and the hourly rate (mL/hr).

**Math.** `deficit = %dehydration/100 × weight × 1000`;
`total_24h = deficit + maintenance + ongoing_losses`;
`rate = total / hours`.

**Citation.** "Standard small-animal fluid therapy — DiBartola, Fluid,
Electrolyte, and Acid-Base Disorders in Small Animal Practice, and the
AAHA/AAFP Fluid Therapy Guidelines, by name. Distinct from the
maintenance-fluid and crystalloid-plan tiles — this is the
dehydration-percentage → deficit framing plus the combined 24-hr plan.
Veterinarian governs."

**Edge cases.** Clinical dehydration below 5% is not detectable and above
12% is near-shock — both bounds flagged. Cardiac/renal/pulmonary patients
need slower correction, noted. The 1 kg ≈ 1 L deficit identity stated.

**Tests.** Six unit tests; fixture 10 kg, 8% dehydrated, 60 mL/kg/day
maintenance → 1400 mL/day, 58 mL/hr.

### U.4 Veterinary anion gap (`vet-anion-gap`)

**Inputs.** Na, K, Cl, HCO₃/TCO₂ (mEq/L), species (dog / cat).

**Output.** Anion gap (mEq/L) and a within/above species-reference flag.

**Math.** `AG = (Na + K) − (Cl + HCO₃)`; reference ~12–25 (dog), ~13–27
(cat) mEq/L.

**Citation.** "Per DiBartola, Fluid, Electrolyte, and Acid-Base Disorders
in Small Animal Practice, with species reference intervals from Schalm's
Veterinary Hematology / standard clinical-pathology texts, by name.
Distinct from the human anion-gap tile (the veterinary convention
includes K, and species ranges differ). Reference intervals are lab- and
analyzer-specific. Veterinarian governs."

**Edge cases.** The veterinary convention includes K (the human
convention often omits it) — made explicit. Hypoalbuminemia lowers the
apparent gap (~2.5 mEq/L per 1 g/dL albumin drop), flagged. Bundled
ranges are guidance only.

**Tests.** Six unit tests; fixture dog Na 145, K 4.0, Cl 110, HCO₃ 20 →
AG 19 mEq/L.

## 19. Phase V — EMS and Pre-hospital (Group V, 4 tiles → calc-ems.js)

Every Group V tile carries the spec-v12 §13 disclaimer banner ("Estimate
/ score only. Decision support, not medical advice. A licensed provider
governs care.").

### V.1 Cockcroft-Gault creatinine clearance (`cockcroft-gault-crcl`)

**Inputs.** Age (yr), weight (kg; IBW/AdjBW selectable), sex, serum
creatinine (mg/dL).

**Output.** Estimated creatinine clearance (mL/min) with a CKD-staging
band note.

**Math.** `CrCl = (140 − age) × weight × (0.85 if female) / (72 × SCr)`.

**Citation.** "Per Cockcroft D.W. and Gault M.H., 'Prediction of
creatinine clearance from serum creatinine,' Nephron 16 (1976), by name.
Free abstract at pubmed.ncbi.nlm.nih.gov (PMID 1244564). Licensed
provider governs."

**Edge cases.** SCr below 1.0 mg/dL in cachectic/elderly patients
overestimates CrCl — a "round SCr to 1.0" toggle is offered, never
applied silently. Not validated in AKI / non-steady-state creatinine,
pregnancy, or age < 18 — flagged. Total body weight in obesity
overestimates — adjusted weight recommended.

**Tests.** Six unit tests; fixture 70 yr, 72 kg, male, SCr 1.2 →
CrCl 58.3 mL/min.

### V.2 Winters' formula expected pCO₂ (`winters-expected-pco2`)

**Inputs.** Measured HCO₃ (mEq/L), optional measured pCO₂ (mmHg).

**Output.** Expected pCO₂ range (mmHg) and a concordant / superimposed-
respiratory-acidosis-or-alkalosis flag.

**Math.** `expected_pCO2 = 1.5 × HCO3 + 8 (± 2)`.

**Citation.** "Per Albert, Dell & Winters, 'Quantitative displacement of
acid-base equilibrium in metabolic acidosis,' Ann Intern Med 66 (1967),
by name. Free abstract at pubmed.ncbi.nlm.nih.gov (PMID 6016545).
Licensed provider governs."

**Edge cases.** Valid only for metabolic acidosis — flagged (alkalosis
uses a different relationship). Measured pCO₂ above expected+2 → super-
imposed respiratory acidosis; below expected−2 → respiratory alkalosis.
Assumes steady-state compensation, noted.

**Tests.** Six unit tests; fixture HCO₃ 12 → expected 26 ± 2 mmHg.

### V.3 Alveolar-arterial oxygen gradient (`aa-gradient`)

**Inputs.** FiO₂ (fraction), PaO₂ (mmHg), PaCO₂ (mmHg), barometric
pressure (mmHg; default 760), age (yr).

**Output.** Alveolar PAO₂ (mmHg), A-a gradient (mmHg), the age-expected
normal, and an elevated/normal flag.

**Math.** `PAO2 = FiO2 × (Patm − 47) − PaCO2/0.8`;
`A-a = PAO2 − PaO2`; expected normal ≈ `(age/4) + 4` on room air.

**Citation.** "Standard alveolar gas equation (respiratory physiology;
West, Respiratory Physiology: The Essentials, by name). The age-expected
upper limit is a commonly-cited room-air approximation. Licensed provider
governs."

**Edge cases.** The 47 mmHg water-vapor term assumes 37 °C full
saturation; altitude changes Patm. The respiratory quotient is fixed at
0.8 (diet-dependent). The age-adjusted normal applies to room air — on
supplemental O₂ the absolute gradient inflates, flagged.

**Tests.** Six unit tests; fixture FiO₂ 0.21, PaO₂ 70, PaCO₂ 40, age 40 →
A-a ≈ 29.7, expected 14.

### V.4 Fractional excretion of sodium (`fena`)

**Inputs.** Serum Na (mEq/L), urine Na (mEq/L), serum creatinine (mg/dL),
urine creatinine (mg/dL).

**Output.** FENa (%) with a pre-renal (< 1%) vs. intrinsic/ATN (> 2%)
interpretive band.

**Math.** `FENa% = (UNa × SCr) / (SNa × UCr) × 100`.

**Citation.** "Per Espinel C.H., 'The FENa test,' JAMA 236 (1976), by
name. Free abstract at pubmed.ncbi.nlm.nih.gov (PMID 947239). Licensed
provider governs."

**Edge cases.** Invalid after loop diuretics — FEUrea suggested, flagged.
The 1–2% band is indeterminate; CKD/contrast/glomerulonephritis can give
pre-renal-range FENa despite intrinsic disease, noted. Requires an
oliguric-AKI context to interpret.

**Tests.** Six unit tests; fixture SNa 140, UNa 10, SCr 3.0, UCr 100 →
FENa 0.21% (pre-renal).

## 20. Phase W — Pilots and General Aviation (Group W, 3 tiles → calc-aviation.js)

Every Group W tile carries the "POH/AFM, the published procedure, and ATC
govern" notice.

### W.1 Cold-temperature altitude correction (`isa-temp-correction`)

**Inputs.** Reported airport temperature (°C), airport elevation (ft
MSL), published (charted) altitude (ft MSL), altimeter reference.

**Output.** Altitude correction to add (ft), corrected minimum altitude
(ft MSL), and a Cold-Temperature-Restricted-Airport advisory note.

**Math.** Height above station `H = published − station_elev`; the AIM
rule-of-thumb `correction ≈ H × (15 − OAT) × 4 / 1000` (4 ft per 1,000 ft
of height per °C below ISA), with the precise ICAO Doc 8168 table cited
as the governing method; ISA at elevation `15 − 1.98 × elev/1000`.

**Citation.** "Per the FAA Aeronautical Information Manual cold-
temperature altimetry guidance and the ICAO Doc 8168 (PANS-OPS) cold-
temperature correction table, by name; the FAA Cold Temperature
Restricted Airports list. Advisory only; the published procedure and ATC
govern. Free at faa.gov."

**Edge cases.** The correction is meaningful only when OAT is below ISA —
warmer than ISA returns 0. The rule of thumb diverges from the ICAO table
at high height/low temperature — "the table governs for IFR," flagged.
The pilot applies the correction only on the specified segments.

**Tests.** Six unit tests; fixture MDA 1000 ft above station, OAT −20 °C
→ ≈ 140 ft correction.

### W.2 Weight-and-balance CG shift (`weight-shift-cg`)

**Inputs.** Basic empty weight (lb) and arm (in), up to N station loads
(weight lb, arm in), forward CG limit (in), aft CG limit (in), max gross
weight (lb).

**Output.** Total weight (lb), total moment (lb-in), CG (in), in/out of
forward/aft/gross limits, pounds over gross, and the weight-to-shift to
reach a target CG.

**Math.** `CG = Σ(weight·arm) / Σweight`; weight-shift form
`weight_to_shift = total_weight × ΔCG / (arm_to − arm_from)`.

**Citation.** "Per the FAA Aircraft Weight and Balance Handbook
(FAA-H-8083-1) and the Pilot's Handbook of Aeronautical Knowledge weight-
and-balance chapter, by name; the type-specific CG envelope and gross
weight come from the POH/AFM (user-supplied). Distinct from a static
weight-balance check — this computes the CG shift / ballast move. Free at
faa.gov."

**Edge cases.** All arms must reference the same datum — a mixed-datum
entry is flagged. The CG envelope is for a moment in time (fuel burn
moves it), noted. "POH/AFM and the type CG envelope govern" stated.

**Tests.** Six unit tests; fixture empty 1500 lb @ 36 in plus stations →
CG and in-limits verdict.

### W.3 Takeoff/landing density-altitude correction (`landing-takeoff-da-correction`)

**Inputs.** Chart-reference ground roll (ft), pressure altitude (ft) or
density altitude (ft), OAT (°C), surface (paved/grass), optional headwind
(kt) and runway gradient (%).

**Output.** Density altitude (ft), corrected ground roll (ft), percent
increase, and a "use the AFM chart for go/no-go" advisory.

**Math.** `DA = PA + 120 × (OAT − ISA_at_PA)`,
`ISA = 15 − 1.98 × PA/1000`; distance correction (handbook rule of thumb)
`corrected = ref × (1 + 0.10 × DA/1000)`; optional grass/headwind/gradient
adjustments.

**Citation.** "Per the FAA Pilot's Handbook of Aeronautical Knowledge
performance chapter and the Airplane Flying Handbook, by name; the
10%-per-1,000-ft-DA and grass factors are handbook rules of thumb. The
POH/AFM performance charts govern the go/no-go. Free at faa.gov."

**Edge cases.** The rule of thumb understates at high DA / high gross —
"use the AFM chart," flagged. A tailwind (negative headwind) sharply
increases distance, warned. Ground roll vs. total over a 50-ft obstacle
distinguished.

**Tests.** Six unit tests; fixture 1000-ft roll, PA 5000 ft, OAT +25 °C →
DA ≈ 7388 ft, roll ≈ 1739 ft.

## 21. Phase X — Real Estate (Group X, 3 tiles → calc-realestate.js)

### X.1 Gross rent multiplier (`gross-rent-multiplier`)

**Inputs.** Purchase price / value ($), gross rental income ($, annual or
monthly toggle), optional market/comparable GRM.

**Output.** GRM (annual and monthly), implied value from the market GRM
($), and the gross rent yield (%).

**Math.** `GRM_annual = price / gross_annual_rent`; `GRM_monthly = price /
gross_monthly_rent`; `implied_value = market_GRM × gross_rent`;
`gross_yield% = 1/GRM_annual × 100`.

**Citation.** "Standard income-approach screening metric (gross rent /
gross income multiplier) per the Appraisal Institute's The Appraisal of
Real Estate income approach, by name; USPAP governs the appraiser's value
opinion. Distinct from cap-rate-dscr, which uses NOI, not gross rent.
Screening only."

**Edge cases.** GRM ignores vacancy and operating expenses — "screening
only; use cap rate / DSCR for underwriting," flagged. Annual vs. monthly
GRM differ by 12× — labeled clearly. Gross rent must be market rent for
comparability, noted.

**Tests.** Six unit tests; fixture $300,000 / $36,000 annual → GRM 8.33,
yield 12%.

### X.2 PMI cancellation / termination (`pmi-cancellation-date`)

**Inputs.** Original property value ($), original loan amount ($),
interest rate (% APR), term (months), first-payment date.

**Output.** Balance and date at 80% LTV (borrower may request
cancellation), balance and date at 78% LTV (automatic termination), the
amortization-midpoint backstop date, and months of PMI saved.

**Math.** Amortized balance
`B(m) = P × ((1+r)^n − (1+r)^m) / ((1+r)^n − 1)`, `r = APR/12`; solve for
the first month where `B(m) ≤ 0.80·value` and `≤ 0.78·value`; midpoint =
`ceil(n/2)`.

**Citation.** "Per the Homeowners Protection Act of 1998 (12 USC
4901–4910) — automatic termination at 78% and borrower-requested
cancellation at 80% of original value, with the amortization-midpoint
requirement, by name; applies to borrower-paid PMI on conventional loans,
not FHA MIP. CFPB consumer guidance free at consumerfinance.gov;
uscode.house.gov for the statute. Estimate; the servicer governs."

**Edge cases.** The HPA uses *original* value and *scheduled* amortization
(not market value or extra payments) — flagged. Does not apply to FHA MIP;
the borrower must be current on payments — disclaimer. Lender-paid PMI and
investment properties differ.

**Tests.** Six unit tests; fixture $250,000 value/loan, 30 yr at 6.5% →
80% near month ~70, 78% near month ~82.

### X.3 Seller net proceeds sheet (`seller-net-sheet`)

**Inputs.** Sale price ($), mortgage payoff ($), commission (% or flat $),
transfer/excise tax (% or per-$500/$1,000), title/escrow/attorney fees
($), seller-paid concessions ($), property-tax proration (annual tax $,
closing date, paid-through date), other ($).

**Output.** Gross price, itemized selling costs, the property-tax
proration (debit/credit), estimated net proceeds ($), and effective cost
of sale (%).

**Math.** `commission = price × rate` (or flat); `transfer_tax = price ×
rate`; `tax_proration = annual_tax × days_seller_owes / 365`;
`net = price − payoff − commission − transfer_tax − fees − concessions ±
proration`.

**Citation.** "Per the TILA-RESPA Integrated Disclosure / Closing
Disclosure (12 CFR 1026.38) and RESPA (12 CFR 1024), by name; the
transfer-tax rate is state/local and user-supplied. Distinct from the
buyer-side closing-costs tile. Estimate; the settlement statement and
closing agent govern. Free at consumerfinance.gov and ecfr.gov."

**Edge cases.** Transfer-tax base and payer vary by jurisdiction (some
states levy per $500 of value) — user supplies the rate, flagged. The
proration convention (365 vs 360, arrears vs advance) varies — flagged.
Payoff includes per-diem interest and any prepayment penalty not in the
principal balance, noted.

**Tests.** Six unit tests; fixture $400,000 sale, $250,000 payoff, 5.5%
commission, 0.5% transfer tax → net ≈ $123,000.

## 22. Phase Y — Educators and K-12 (Group Y, 3 tiles → calc-edu.js)

### Y.1 Final-exam grade needed (`final-grade-needed`)

**Inputs.** Current grade (%), current weight (%, the graded portion so
far), final weight (%), target grade (%).

**Output.** Needed final score (%), the maximum and minimum possible
final course grade, and an achievable flag.

**Math.** `needed = (target − current × (1 − w_f)) / w_f`,
`w_f = final_weight/100`; max = `current × (1 − w_f) + 100 × w_f`;
min = `current × (1 − w_f)`.

**Citation.** "Standard weighted-average arithmetic (the common syllabus
weighted-category convention); the instructor's gradebook governs. Pure
public algebra."

**Edge cases.** Needed above 100% → "not achievable with a perfect
final," flagged. Final weight = 0 → division by zero, rejected. Needed
below 0 → "already secured," clamped to 0% with a note.

**Tests.** Six unit tests; fixture current 88%, final weight 25%, target
90% → 96% needed.

### Y.2 Weighted category grade (`category-weighted-grade`)

**Inputs.** A list of {category, earned points, possible points, weight
%}.

**Output.** Overall percent, per-category percent, a weight-sum check, and
a standard letter grade.

**Math.** category% = `earned/possible × 100`; overall =
`Σ(category% × weight) / Σweight` (normalizing by Σweight handles a
partially-complete term).

**Citation.** "Pure weighted-mean arithmetic; standard US letter bands
(A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60). The instructor's gradebook governs;
bands vary by school."

**Edge cases.** Σweight ≠ 100 → a normalization notice (not silent
rescaling). A category with possible = 0 is excluded, not divided by zero.
Empty category list → informative error.

**Tests.** Six unit tests; fixture HW 92% @ 20%, Quiz 85% @ 30%, Final 78%
@ 50% → 82.9% (B).

### Y.3 Two-sample t-test (`two-sample-t-test`)

**Inputs.** mean₁, sd₁, n₁, mean₂, sd₂, n₂, tail (two-sided/one-sided),
alpha (default 0.05).

**Output.** t-statistic, Welch-Satterthwaite df, p-value, significance
flag, mean difference, and the confidence interval on the difference.

**Math.** `t = (x̄₁ − x̄₂) / sqrt(s₁²/n₁ + s₂²/n₂)`; Welch df =
`(s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) ]`; p-value
from the Student-t CDF (the spec-v17 §Z.4 `tcdf` helper in `pure-math.js`,
reused); CI = `(x̄₁−x̄₂) ± t_crit × SE`.

**Citation.** "Per OpenIntro Statistics Chapter 7 (inference for
numerical data, Welch's t) and the Welch-Satterthwaite df, by name; the
t-CDF reuses the bundled special-function helper. Free at openintro.org."

**Edge cases.** n < 2 in either group → df undefined, rejected. sd = 0 in
both groups → SE = 0, t undefined, flagged. Small n (< 30) → the
normality assumption is noted.

**Tests.** Six unit tests; fixture x̄₁ 82/s 6/n 25 vs x̄₂ 78/s 7/n 22 →
t ≈ 2.09, df ≈ 41.4, two-sided p ≈ 0.043. A cross-tile test confirms the
t-CDF matches the regression/correlation tiles on shared inputs.

## 23. Phase Z — Cross-cutting platform and manifest changes

### Z.1 Manifest entries

55 new entries in `tile-meta.js`, each carrying editions, asOf, tolerance,
worked_example, and reviewer_signoff fields per spec-v10 and spec-v14.
No tile in v20 requires a new bundled state-keyed shard: every
current-value dependency (NEC ampacities, IPC/UPC vent tables, Fc⊥/k
values, SS wage base, FUTA credit-reduction states, the §1961 Treasury
rate, NRC water breakpoints, the FSIS nitrite limit) is **user-supplied**,
consistent with spec-v12 §H and v19 §3.4.

### Z.2 Calc modules

No new `calc-*.js` modules. Distribution: A→calc-electrical.js,
B→calc-plumbing.js, C→calc-hvac.js, D→calc-restoration.js,
E→calc-construction.js, F→calc-fire.js, J→calc-trucking.js,
K→calc-mechanic.js, L→calc-agriculture.js, M→calc-water.js,
N→calc-stage.js, O→calc-kitchen.js, P→calc-field.js,
R→calc-accounting.js, S→calc-legal.js, T→calc-lab.js, U→calc-vet.js,
V→calc-ems.js, W→calc-aviation.js, X→calc-realestate.js, Y→calc-edu.js.
Where a target module's size cap binds, it is bumped per the
current-plus-20%-headroom convention.

### Z.3 Helper reuse

Y.3 (`two-sample-t-test`) reuses the spec-v17 §Z.4 `tcdf` /`betainc`
helpers in `pure-math.js`; no new special function is added. A cross-tile
test asserts `tcdf` agrees across `two-sample-t-test`, `linear-regression`,
and `pearson-correlation` on shared inputs.

### Z.4 Tests, search aliases, parity audits

Same gates as v15 §H, v16 §Z, and v17 §Z. Every new tile lands with its
declared test count, at least three search aliases in
`data/search/aliases.json`, a related-tiles entry in
`scripts/related-tiles.mjs` (≤6, no self-reference), a dimensional
annotation, a bounds-fuzzer row, a worked-example fixture in
`test/fixtures/worked-examples.json` cross-checked against the cited
source at the per-group v14 §14.1 tolerance ceiling, a complete inline
`citations.js` entry (v19 discipline), a prerendered shell that passes the
v18 §6 320px mobile audit, and clean axe-core / print / CSV parity
audits.

### Z.5 Per-group reviewer signoff

Per spec-v14 §15, v20 solicits reviewer-of-record signoffs for the groups
it touches, reusing the standing solicitations from the v15–v17 expansion
where a group already has one open: a US-licensed electrician (A), master
plumber (B), mechanical/HVAC engineer (C), IICRC-certified restorer (D),
licensed structural/PE or experienced GC (E), fire-service officer (F),
CDL owner-operator or fleet safety manager (J), ASE-certified or
performance-engine technician (K), Cooperative-Extension agronomist (L),
licensed water/wastewater operator (M), entertainment-electrician /
ETCP-certified rigger (N), ServSafe-certified chef (O), SAR planning-
section chief (P), licensed CPA (R), licensed attorney (S), bench
scientist with publication history (T), licensed DVM (U), licensed
paramedic with QA experience (V), ATP/CFI-I pilot (W), licensed real
estate broker (X), and a quantitative-courseware educator (Y). Open
signoffs do not block landing in main; they block the v20 release
announcement from carrying the "audited" label per the v14 audit-trail
convention. The audit-trail entries land in
[../docs/audit-trail.md](../docs/audit-trail.md) under the v20 stanza.

## 24. Reading v18–v20 together

v18 made every existing tile incapable of returning a wrong, non-finite,
or unrenderable result. v19 made every existing citation inline, current,
and clean. v20 adds fifty-five new tiles, each born into that contract and
that discipline rather than retrofitted into it. The order is deliberate:
harden, then verify the provenance, then grow. A site that grows before it
hardens accumulates defects faster than it can audit them; this set grows
last, on a foundation the first two specs made sound.

## 25. Out of scope for v20 (and the set)

- New groups beyond the existing nineteen letters.
- Telemetry, AI, accounts, server, fee, ad — no spec since v1 has proposed
  any, and this set does not either.
- Any bundled paywalled or fast-moving lookup; every current value stays
  user-supplied or a declared shard (none new in v20).
- Internationalization beyond US standards; every authority cited above is
  US (NEC/NFPA, IPC/UPC, ASHRAE/AMCA/NEMA, NDS/AISC, IICRC, USBR, AWWA,
  EPA/FDA, USDA NRCS/NRC, FAA, IRS/AICPA, USC/CFR, FMCSA, ATRI, the
  Appraisal Institute, OpenIntro, and the named clinical/veterinary
  primary literature).

## 26. Closing note

Fifty-five numbers, each one a thing a working professional reaches for
and currently cannot get here. The fan tech's brake horsepower, the water
operator's saturation index, the owner-operator's true cost per mile, the
teacher's "what do I need on the final," the medic's creatinine
clearance, the vet's body-surface-area dose, the appraiser's gross rent
multiplier. No accounts, no telemetry, no AI. Just the formula, the
citation, the source stamp, the tolerance, and the clipboard. Built last,
on a hardened foundation, the way the rest was built — one tile, one
derivation, one cross-check, one tolerance, one signoff.
