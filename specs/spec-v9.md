# roughlogic.com Specification v9 — Field-Reality Expansion (Tier 1 and Tier 2 New Utilities)

> **Implementation status (drafted 2026-05-10, landed 2026-05-12, status confirmed 2026-05-17): complete.** Every spec-v9 phase is closed: A substantively complete; B / C / E / F / H closed by 2026-05-12; D and G each shipped the net-new tile and noted the remaining sub-section as overlapping an existing spec-v2 / spec-v7 tile (the v11 surface-reduction posture confirmed the no-duplicate-tile rule). The §F.1 magnetic-declination WMM2025 bundle and the §F.2 lightning-countdown 30-minute resume timer were the last items to land. Phase A
> substantively complete (§A.1 = v7 short-circuit-pp; §A.2 grounding-
> electrode resistance, §A.3 arc-flash incident-energy screen, §A.4
> motor branch-circuit from nameplate landed in v9 batches 1-3). Phase
> B closed as of 2026-05-11: §B.1 shr-latent (ASHRAE Fundamentals 2021
> Ch. 1 / Ch. 18 sensible / latent split with altitude correction and
> psychrometric humidity-ratio helpers), §B.2 outdoor-air-ventilation
> (ASHRAE 62.1 single-zone), and §B.3 hood-exhaust (IMC 2021 §507.13 /
> §507.20 hood-type x duty multipliers with makeup-air and grease-duct
> reminders) shipped in [../calc-hvac.js](../calc-hvac.js); §B.4
> recirc-loop-sizing (ASPE Data Book Vol. 4 Ch. 6 simplified per-foot
> heat-loss method with Hazen-Williams friction and a pump-size ladder)
> shipped in [../calc-plumbing.js](../calc-plumbing.js) as a companion
> to the existing v2 recirc-pump-head tile; §B.5 septic-drainfield was
> already shipped as the v7 tile of the same name. Phase C closed as of
> 2026-05-11: §C.3 SCBA cylinder work time and §C.6 confined-space-vent
> (OSHA 1910.146 / NIOSH 80-106 with contaminant-driven default ACH,
> steady-state ACH, and the 1910.146(d)(5) 4-gas-meter reminder)
> shipped in [../calc-fire.js](../calc-fire.js). §C.2 ladder placement
> and §C.4 fall-clearance overlap the existing v3 ladder-angle and
> fall-protection-clearance tiles; §C.1 NFPA 1142, §C.5 OSHA noise
> and §C.6 confined-space pre-entry ventilation remain (§C.5 noise-
> dose / TWA shipped 2026-05-11 as a Group G cross-trade tile in
> [../calc-cross.js](../calc-cross.js); §C.1 nfpa-1142-water-supply
> shipped 2026-05-11 in [../calc-fire.js](../calc-fire.js)).
> Phase D partial as of 2026-05-10: §D.2 stopping-sight-distance
> (AASHTO Green Book) shipped in
> [../calc-trucking.js](../calc-trucking.js); §D.1 is the existing
> bridge-formula tile. Phase E substantively closed as of 2026-05-11: §E.1
> svi-sludge-index (USEPA / WEF SVI = SV30 * 1000 / MLSS with
> operational bands) and §E.2 disinfection-ct (USEPA SWTR
> Guidance Manual EPA 815-R-99-014 Table A-1 free chlorine 3-log
> Giardia interpolation over a 6 temperature x 4 pH grid) both
> shipped in [../calc-water.js](../calc-water.js).
> Phase F closed as of 2026-05-12: §F.2 lightning-countdown shipped
> in [../calc-field.js](../calc-field.js) (basic distance + 30-30
> advisory landed 2026-05-10; the 30-minute resume timer with hash-
> state serialization landed 2026-05-12 with hidden `lc-timer` input
> carrying `active:<end_at_s>` / `paused:<remaining_s>` / `""` through
> the existing wireHashState path; the four state helpers are pure
> and unit-tested in [../test/unit/calc-field-v9.test.js](../test/unit/calc-field-v9.test.js)).
> §F.1 magnetic-declination landed 2026-05-12 in [../calc-field.js](../calc-field.js):
> NOAA NCEI WMM2025 coefficient bundle ships at
> [../data/field/wmm/coefficients.json](../data/field/wmm/coefficients.json)
> (verbatim from WMM2025.COF, 90 rows to degree 12, public domain) with
> the manifest carrying the WMM2025 edition stamp and a 2030-01-01
> `expires_on`. The forward computation is a Schmidt semi-normalized
> spherical-harmonic expansion with the geodetic / geocentric rotation
> and secular-variation chain rule, exercised against every row of the
> bundled NCEI WMM2025_TestValues.txt (100 vectors; max declination
> error 0.005 deg, max H error 0.001 nT). The renderer carries the
> bearing-correction helper inline (magnetic to / from true) and
> surfaces a date-window notice when the user enters a date outside
> 2025-2030. §F.3 avalanche slope-angle (the existing slope-avalanche
> tile already covers the basics) does not need a separate tile per
> the v11 surface-reduction posture. Phase G partial as of 2026-05-11: §G.2 excavation-bench-plan
> (OSHA Subpart P slope ratios with spoil volume / footprint / bench
> layout) shipped in [../calc-construction.js](../calc-construction.js).
> §G.1 stair-stringer-geometry overlaps the existing v2 stair-stringer
> tile. Phase H partial as of 2026-05-10: §H.3 sprayer-calibration
> (USDA 1/128-acre method) and §H.4 thi-livestock (USDA-ARS Temperature-
> Humidity Index for dairy / beef / hog / poultry / horse) shipped in
> [../calc-agriculture.js](../calc-agriculture.js); §H.6 sous-vide-
> pasteurization shipped in [../calc-kitchen.js](../calc-kitchen.js)
> on 2026-05-11 (closes the last spec-v10 §B.3 simplified-screening
> tile blocker). §H.5 Beer-Lambert is already shipped as the v5 lab
> tile. §H.2 spl-atmospheric (ANSI S1.26-2014 (R2019) per-octave-band
> atmospheric absorption layered on top of inverse-square) shipped
> 2026-05-11 in [../calc-stage.js](../calc-stage.js) as a companion to
> the v1 spl-distance tile. §H.1 drying-log (IICRC S500-2021 boundary-
> humidity test over up to 14 daily readings with OLS chamber-GPP
> trend and a dry-down estimate) shipped 2026-05-11 in
> [../calc-restoration.js](../calc-restoration.js). Phase H closed.
> See
> [../CHANGELOG.md](../CHANGELOG.md) for build-progress notes. The
> constraints below remain in force for any future work.

> Foreword, in the voice of someone who has watched a tradesperson type
> a question into a search engine on a job site, get five results that
> demand an account, two results that demand a credit card, and one
> result wrapped in twelve seconds of video advertising, and finally
> give up and call the boss.
>
> v1 through v4 built the calculators. v5 added the bench-science,
> accounting, and legal expansion. v6 set the citation discipline. v7
> added twenty more tools. v8 was the audit pass and the
> field-reality refinement. v9 is the next layer of obvious gaps:
> the questions tradespeople ask daily that this site does not yet
> answer, where the answer can be derived from public physics or
> federal regulation without reproducing a single line of paywalled
> code text.
>
> Build it the way the rest of the site is built. One tile, one
> calculation, one citation, one copy. Then get out of the user's
> way.

This document is the v9 spec. It inherits everything from spec.md,
spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md, spec-v6.md, spec-v7.md,
and spec-v8.md. If anything below conflicts with an earlier spec, the
earlier spec wins; rewrite the v9 entry until it complies.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States.

## 1. Inheritance

Every constraint from prior specs continues without exception. v9 adds
no new groups, no new licenses, no new third-party dependencies, no new
storage keys, and no new state-mechanism. v9 adds thirty-one new
utilities distributed across existing groups A, B, C, E, F, G, J, M,
N, O, P, and T. No new group letter is introduced.

The hard limits still bind:

- 100 percent client-side, single-page static, Cloudflare Pages, no
  server, no account, no telemetry, no AI, no API key, no third-party
  fetch beyond same-origin static assets.
- No localStorage / sessionStorage / cookies / IndexedDB beyond
  rl-theme and rl-bigbuttons. URL hash is the only state mechanism.
- CSP default-src 'self', connect-src 'self', worker-src 'self'.
- WCAG 2.2 AA, 48 px touch targets, voice input, single h1, Big
  Buttons mode, High-Contrast theme.
- No emojis, no em-dashes, no decorative icons.
- Home-view payload budget under 100 KB after gzip.
- Public changelog, semver, no flags, 90-day deprecation.

## 2. Selection criteria (informational)

Every tile in this spec passed all four of the following gates before
inclusion. A future v10 (or later) expansion that wants to add tiles
should apply the same gates.

1. **First-principles or federally-public.** The math is derivable
   from public physics, an explicit federal regulation in the eCFR,
   or a NIST / NOAA / USGS / USDA / USEPA / NIOSH publication. No
   reproduction of NEC, IPC, IRC, IBC, IMC, IFC, NFPA, ASHRAE,
   AWWA, AISC, ACI, AWC, or AHRI table content. Section numbers may
   be cited; table values may not be reproduced.
2. **Field-asked.** A working tradesperson in the named group asks
   this question often enough that the absence of a tile is a
   recurring friction. Frequency beats novelty.
3. **Bounded inputs.** The user can answer every required input
   from what is on their truck, on their phone, or in front of
   them on the wall. Tiles that need a soils report, a Btu meter,
   or a calibrated reference load do not pass this gate.
4. **AHJ-respecting.** The output is a math aid. The tile says so.
   The authority having jurisdiction governs every installation,
   inspection, citation, transport, or release. Where a federal
   regulation sets a floor and states routinely set tighter
   limits, the tile says so.

Tier 1 below is "high impact, low risk, fills obvious gaps." Tier 2
is "useful but smaller audience or narrower frequency." The
implementation order in section 12.1 reflects field impact per
kilobyte, not the order tools appear in this document.

## 3. Phase A — Electrical expansion (Group A)

Four new tiles. All cite NEC 2023 by section only; none reproduce a
table. Per spec-v6 source-stamp discipline, each tile carries
"AHJ governs" and a free-access pointer to nfpa.org/freeaccess.

### A.1 Point-to-point short-circuit current

**Inputs.** Source short-circuit current (A) at the upstream device
(transformer secondary or upstream panel), conductor type (Cu / Al),
conductor size (AWG / kcmil from the v8 standard-sizes list), one-way
length (ft), system voltage (V), system phase (1ph 120/240, 3ph
208Y/120, 3ph 480Y/277, 3ph 480 delta).

**Output.** Available short-circuit current (A_sca) at the downstream
panel. Recommended panel SCCR rating to specify (next standard step:
10 kA, 14 kA, 22 kA, 25 kA, 35 kA, 42 kA, 50 kA, 65 kA, 100 kA,
200 kA). Multiplier f and the per-conductor C value used in the
calculation are exposed as a "show your work" disclosure.

**Math.** Bussmann / IEEE 241 point-to-point method. The formula

    f = (1.732 * L * I_source) / (C * n * E_LL)
    M = 1 / (1 + f)
    I_sca = M * I_source

is public algebra. The C constants for copper and aluminum at the
standard sizes are derived from conductor resistance and reactance per
NEC Chapter 9, Table 9 (the table values are inputs to a publicly
documented calculation; the calculator does not display the table
itself, only the calculation result).

**Citation.** "Point-to-point method (Bussmann SPD; IEEE 241).
Available short-circuit current is the basis for SCCR labeling per
NEC 2023 §110.24. AHJ governs final equipment ratings.
Free at nfpa.org/freeaccess and ieeexplore.ieee.org."

**Edge cases.** Reject negative or zero source current. Reject
conductor sizes outside the bundled standard-sizes range. When
M < 0.05 (very long run), output a warning that the source impedance
dominates and the calculator's C-value model is approximate.

**Tests.** Ten unit tests minimum. Include the worked example from
the Bussmann SPD published guide (single-phase 120/240 V,
2000 A source, 100 ft of 4 AWG copper). Verify the I_sca result
matches the published worked example within 1 percent.

### A.2 Grounding electrode resistance

**Inputs.** Electrode type (driven rod, ring, plate, concrete-encased
"Ufer"), rod diameter (in), rod length (ft), soil resistivity
(ohm-cm). For ring: ring diameter (ft), conductor diameter (in). For
plate: plate area (ft^2), burial depth (ft).

**Output.** Resistance to remote earth (ohms). Comparison band
against the IEEE 142 25-ohm advisory and the NEC 250.53(A)(2)
two-electrode rule. Suggested supplemental electrode count to reach
the 25-ohm target for the entered soil resistivity.

**Math.** Dwight (1936) closed-form for a driven rod:

    R = (rho / (2 * pi * L)) * (ln(8L / d) - 1)

Ring electrode and buried-plate forms per IEEE 142 §4 (the formulas
are public; the values they produce are computed, not table-looked).

**Citation.** "Per IEEE 142-2007 (Green Book) §4. Dwight (1936)
closed-form for driven rods. NEC 2023 §250.53 governs adoption.
Soil resistivity varies seasonally; field megger reading is the
authoritative value at the time of inspection.
Free at standards.ieee.org for IEEE bibliographic data."

**Edge cases.** Soil resistivity below 100 ohm-cm or above
100,000 ohm-cm flagged as outside typical range. Rod length below
2 ft or above 40 ft flagged. Ring conductor smaller than 2 AWG
flagged as below NEC 250.66 minimum.

**Tests.** Ten unit tests. Worked examples: 8 ft x 5/8 in rod in
10,000 ohm-cm soil (textbook reference). Plate, ring, and Ufer
each have at least one bounded-input test.

### A.3 Arc-flash incident-energy screen (simplified Lee method)

**Inputs.** System voltage (V), bolted-fault current at the
equipment (A_bf), arc clearing time (s), working distance (in),
equipment configuration (open-air / box).

**Output.** Estimated incident energy (cal/cm^2) at the working
distance. PPE category band (CAT 1 / 2 / 3 / 4 per the
incident-energy ranges in NFPA 70E Table 130.7(C)(15)(c) referenced
by name only). Arc-flash boundary distance.

**Math.** Ralph Lee (1982) closed-form, public, pre-IEEE-1584. For
voltages above 600 V open-air:

    E_lee = (2.142e6 * V * I_bf * t) / D^2

Below 600 V the Lee equation is conservative; the calculator notes
that and outputs the boundary anyway with the conservatism flagged.

**Citation, prominent.** The tile carries a banner notice, not a
footnote: "This is a screening estimate using the 1982 Ralph Lee
equation. It is NOT a substitute for an IEEE 1584-2018 incident-
energy study. NFPA 70E-2024 §130.5 requires an arc-flash risk
assessment performed by a qualified person before energized work.
The Lee equation is conservative below 600 V and may be
non-conservative for some 480 V configurations covered by IEEE
1584. Free at nfpa.org/freeaccess for NFPA 70E TOC and Annex D."

**Edge cases.** Reject voltage below 208 V (Lee model invalid).
Reject clearing time above 2.0 s (most upstream protection should
clear faster; warn the user that long clearing times produce
dangerous incident-energy values regardless of method). Working
distance below 6 in or above 36 in flagged as outside typical PPE
selection ranges.

**Tests.** Ten unit tests including a 480 V worked example from a
public utility safety bulletin (cite which one in the test
fixture).

### A.4 Motor branch-circuit math from nameplate

**Inputs.** Motor HP, voltage (V), phase (1 / 3), nameplate
efficiency (eta, 0.0 to 1.0; default 0.90 for >= 1 HP), nameplate
power factor (PF, 0.0 to 1.0; default 0.85). Optional: nameplate
FLA in amps.

**Output.** Computed full-load current (A) from physics. If the
nameplate FLA was provided, both the nameplate value and the
computed value, with the larger of the two flagged as the design
value. Recommended branch-circuit conductor size per the NEC
125 percent continuous rule. Recommended motor-overload size
per NEC §430.32 (115 percent / 125 percent of FLA depending on
service factor; user enters service factor).

**Math.** First principles. Single-phase:

    I = (HP * 746) / (V * eta * PF)

Three-phase:

    I = (HP * 746) / (1.732 * V * eta * PF)

The NEC 430.247 / 430.248 / 430.250 reference-FLA tables are NOT
reproduced. The output of this tile is a physics calculation; the
NEC requires the table values for sizing the branch-circuit. The
tile says so on every result.

**Citation.** "Computed from nameplate. NEC 2023 §430.6(A)(1)
requires using the table FLA values (430.247, 430.248, 430.250)
for branch-circuit conductor and overcurrent sizing where motor
nameplate is not the reference. Continuous-load 125 percent rule
per §430.22. AHJ governs.
Free at nfpa.org/freeaccess."

**Edge cases.** HP < 1/4 below the table range; flagged. PF or
eta outside (0.5, 1.0) flagged. Service factor input bounded to
1.0 to 1.4.

**Tests.** Ten unit tests. Compare a 5 HP, 230 V, 1ph motor with
nameplate eta 0.875, PF 0.78 against the NEC 430.248 table value
of 28 A and confirm the calculator returns a value within
2 percent.

## 4. Phase B — HVAC and Plumbing expansion (Groups B and C)

Five new tiles.

### B.1 Sensible heat ratio and latent load split

**Inputs.** Total cooling capacity (Btu/hr), entering air dry-bulb
(F), entering air wet-bulb (F), supply air dry-bulb (F), CFM at
register, altitude (ft, default 0).

**Output.** Sensible cooling delivered (Btu/hr), latent cooling
delivered (Btu/hr), sensible heat ratio (SHR = Q_s / Q_total),
sensible heat factor (SHF, same value), supply air humidity ratio
(grains/lb), and a context band (SHR 0.65 to 0.80 typical for
residential cooling, 0.55 to 0.70 typical for high-latent climates).

**Math.** Sea-level psychrometric coefficients with altitude
correction:

    Q_s = 1.08 * CFM * (T_ra - T_sa) * (rho / rho_sea)
    Q_l = 0.68 * CFM * (W_ra - W_sa) * (rho / rho_sea)

Humidity ratio from the bundled psychrometric helper already in
the worker pool. Altitude correction via the standard atmosphere.

**Citation.** "ASHRAE Fundamentals 2021 Chapter 1 (psychrometrics)
and Chapter 18 (nonresidential cooling and heating load calculations).
Sea-level coefficients per ASHRAE Handbook. Free at ashrae.org for
TOC; full handbook is licensed."

**Edge cases.** Wet-bulb above dry-bulb rejected. Negative CFM or
zero dry-bulb difference rejected. Altitude above 12,000 ft
flagged with "outside typical correction range."

**Tests.** Twelve unit tests including the worked example from
ASHRAE Fundamentals Chapter 18 (cooling coil example), SHR
within 0.02 of the reference.

### B.2 ASHRAE 62.1 outdoor-air ventilation requirement

**Inputs.** Occupancy category (user enters Rp and Ra from their
AHJ-adopted edition, with placeholder defaults for "office",
"classroom", and "retail" that the user must confirm against
their edition before relying on). Floor area (ft^2). Number of
people. System air-distribution effectiveness E_z (default 1.0
for ceiling supply with ceiling return).

**Output.** Breathing-zone outdoor airflow Vbz (CFM). Zone
outdoor airflow Voz = Vbz / E_z (CFM). Per-person ratio (CFM
per person). Floor-area ratio (CFM per ft^2).

**Math.** Public formula:

    Vbz = Rp * Pz + Ra * Az
    Voz = Vbz / E_z

The Rp and Ra values from ASHRAE 62.1 Table 6-1 are NOT bundled.
The user enters them. The tile prominently states this and links
to the free TOC at ashrae.org for users to look up the current
values from their AHJ-adopted edition.

**Citation.** "Per ASHRAE 62.1-2022 §6.2.2.1 (single-zone
breathing-zone procedure). Rp and Ra values per Table 6-1 of the
AHJ-adopted edition. AHJ governs adopted edition.
Free at ashrae.org for TOC."

**Edge cases.** Negative or zero people / area rejected.
E_z < 0.5 or > 1.2 flagged as outside Table 6-2 range.

**Tests.** Eight unit tests. The user-supplied Rp/Ra means tests
use parametric inputs, not bundled table values.

### B.3 Type I and Type II commercial kitchen hood exhaust

**Inputs.** Hood type (wall-canopy / single-island / double-island
/ proximity / backshelf / pass-over). Cooking-appliance duty
(light / medium / heavy / extra-heavy per the bundled IMC
classification reference, which is descriptive text, not a table
reproduction). Hood length L (ft). For Type I: number of exposed
sides. For Type II (vapor-only): hood length and width.

**Output.** Required exhaust airflow Q (CFM) per the IMC 507
hood-type formula. Required makeup air (typically 80 percent of
exhaust per IMC 508 with "balance check" hint). Recommended duct
velocity (Type I: 500 to 2000 fpm) and resulting duct area
(in^2). Recommended grease-duct slope reminder (1/4 in/ft per
IMC 506.3).

**Math.** IMC 507.13 formulas are public algebra:

    Q_wall_canopy = 100 * L * (perimeter exposed factor)

with the per-duty multiplier the IMC sets out. The duty
multipliers (200, 300, 400, 550 cfm/ft) are formula coefficients,
not a code table; the calculator uses them as published.

**Citation.** "Per IMC 2021 §507.13 (Type I) and §507.20 (Type II).
NFPA 96-2024 governs grease-handling exhaust system design.
AHJ governs final equipment selection.
Free at codes.iccsafe.org for IMC TOC and at nfpa.org/freeaccess
for NFPA 96 TOC."

**Edge cases.** Hood length below 4 ft or above 16 ft flagged.
Duty selection required. Type II vapor-only path warns that
greasy effluent requires Type I.

**Tests.** Ten unit tests. Worked example: 8 ft wall-canopy
hood over a six-burner range and char-broiler (heavy duty),
expected Q within 5 percent of 4000 cfm.

### B.4 Hot-water recirculation pump sizing

**Inputs.** Total recirc loop length (ft). Pipe nominal size
(in). Pipe insulation thickness (in). Hot supply temperature
(F). Recirculation set-point delta (F, default 10). Ambient
temperature surrounding pipe (F, default 65).

**Output.** Loop heat-loss rate (Btu/hr per ft, total Btu/hr).
Required recirc flow GPM. Required pump head (ft of water) from
loop length and the bundled friction tables. Recommended pump
size (next-standard from the bundled HP / GPM ladder).

**Math.** Heat loss per ASPE Data Book Vol 4 Ch 6 method:

    q = (T_hot - T_ambient) / R_total
    GPM = Q_total / (500 * delta_T)

where R_total combines pipe wall, insulation, and air film
resistances. Friction loss via Hazen-Williams with C = 140 for
copper hot water.

**Citation.** "Per ASPE Data Book Vol. 4 (Plumbing Engineering
Design Handbook) Chapter 6. ASHRAE 90.1-2022 §7.4.4 governs
recirculation control requirements where adopted. AHJ governs.
Free at aspe.org for TOC."

**Edge cases.** Loop length under 50 ft flagged as "may not need
recirc; consider point-of-use heater." Insulation thickness 0
flagged as "non-compliant for most ASHRAE 90.1 jurisdictions."

**Tests.** Ten unit tests including a worked 200 ft, 3/4 in
copper loop with 1 in insulation.

### B.5 Septic drainfield area

**Inputs.** Design flow Q (gpd; default by occupancy: 75 gpd per
bedroom for single-family, user may override). Soil percolation
rate (min/in) OR soil texture class (sandy / loamy / clayey).
Trench width (ft, default 2). Trench depth (ft, default 2.5).
Effluent type (septic-tank effluent / advanced treatment).

**Output.** Long-term acceptance rate LTAR (gpd / ft^2) from the
bundled USEPA texture-to-LTAR mapping. Required drainfield area
(ft^2). Required trench length at the entered width (ft). Number
of trenches at standard 100 ft trench length (1 to 5 typical).

**Math.** Public USEPA method:

    A = Q / LTAR

The texture-to-LTAR mapping is from USEPA Onsite Wastewater
Treatment Manual EPA/625/R-00/008, a public-domain federal
publication. State primacy agencies set local values; the tile
warns that local rules may be tighter and the user should enter
the local LTAR if known.

**Citation.** "Per USEPA Onsite Wastewater Treatment Systems
Manual (EPA/625/R-00/008, 2002), public-domain. State primacy
agencies govern final design. Free at epa.gov."

**Edge cases.** Perc rate above 60 min/in flagged as
"conventional drainfield not suitable, consult designer." Below
1 min/in flagged as "soil percolates too fast for septic
treatment, consult designer."

**Tests.** Ten unit tests including a 4-bedroom single-family on
loamy soil (perc 30 min/in) returning approx 600 ft^2 drainfield.

## 5. Phase C — Fire-ground and life-safety expansion (Groups F and G)

Six new tiles. Three fire-ground, three OSHA-derived safety.

### C.1 NFPA 1142 rural water-supply

**Inputs.** Building total volume V (ft^3) computed from footprint
and average ceiling height. Occupancy hazard classification (1
through 7 per NFPA 1142 §5.2 by name; user enters the
classification). Construction class (I to V per NFPA 1142
§5.2.7). Exposure factor (yes / no, 1.5x multiplier). Sprinkler
present (yes / no, 0.5x multiplier).

**Output.** Required minimum fire-flow (gallons total). Required
on-site water supply (gallons). Recommended apparatus tank size
or mutual-aid tanker count (using the bundled standard tanker
sizes 1000 / 1500 / 2000 / 3000 gal).

**Math.** Public formula from NFPA 1142 §5:

    Q_total = (V * O * H) / X

where O is occupancy hazard, H is construction-class factor, X
is fire-flow class divisor. The factor table values are formula
coefficients per the spec discipline; not reproduced as a table.

**Citation.** "Per NFPA 1142-2022 (Standard on Water Supplies for
Suburban and Rural Firefighting) §5. AHJ governs final water-
supply requirement. Free at nfpa.org/freeaccess."

**Edge cases.** Building volume below 8,000 ft^3 may not require
calculation per §5; warn the user. Sprinkler reduction without
a confirmed UL-listed system flagged.

**Tests.** Ten unit tests including a 30,000 ft^3 single-family
residence (Class IV construction, occupancy 6, no exposure, no
sprinkler).

### C.2 Ground ladder placement angle (75-degree rule)

**Inputs.** Ladder length L (ft). Eave or window-sill height H
(ft). OR base distance D (ft).

**Output.** Required base distance D for 75-degree placement
(D = L / 4, or atan-derived). Actual ladder angle for the
entered D and H. Pass / fail against the 75-degree target with
a 70 to 80 degree advisory band. Working height at the tip
(maximum reach).

**Math.** Pure geometry:

    angle = atan(H / D)
    D_for_75 = H / tan(75 deg)

NFPA 1932 specifies the 75-degree placement; the calculator
output is geometry, not a code interpretation.

**Citation.** "Per NFPA 1932-2020 (Use, Maintenance, Service
Testing of In-Service Emergency Service Ground Ladders) §5.
OSHA 29 CFR 1910.23(c)(11) sets the 4-to-1 base-to-height
rule. Free at nfpa.org/freeaccess and ecfr.gov."

**Edge cases.** Angle below 60 degrees flagged as "ladder will
slip outward under load." Angle above 80 degrees flagged as
"ladder will tip backward when climber leans out."

**Tests.** Ten unit tests covering 24 ft, 28 ft, 35 ft, and
40 ft ladders at typical residential and commercial heights.

### C.3 SCBA cylinder work time

**Inputs.** Cylinder rating (volume in scf at rated pressure;
common values 30 / 45 / 60 minute ratings, with their actual scf
content). Starting pressure (psi). Low-air alarm pressure (psi,
typical 33 percent of rated). Work rate consumption (scfm,
default 40 scfm light to 100 scfm heavy work).

**Output.** Available time to low-air alarm (min:sec). Available
time to empty (min:sec) with a prominent "do not plan to
empty" notice. Pressure remaining at the desired exit time
(reverse calculation).

**Math.** First principles:

    available_scf = (P_start - P_alarm) / P_rated * V_rated
    time_to_alarm = available_scf / consumption_rate

NFPA 1981 governs the SCBA performance requirements; the
calculator math is per the gas law and the manufacturer's
rated scf, both public.

**Citation.** "Per NFPA 1981-2019 (Open-Circuit SCBA for
Emergency Services) and NIOSH 42 CFR 84. Manufacturer cylinder
rating governs absolute scf. Field consumption varies with
work rate; this is a planning estimate. Free at nfpa.org/freeaccess
and ecfr.gov."

**Edge cases.** Starting pressure above rated pressure rejected.
Consumption rate below 20 scfm or above 200 scfm flagged.

**Tests.** Eight unit tests including the standard 4500 psi /
60 minute (88 scf) bottle at 100 percent fill with 40 scfm work.

### C.4 Fall-clearance distance (ANSI Z359 / OSHA 1926.502)

**Inputs.** Anchor height above lower level (ft). Lanyard
length L (ft, max 6 typical). Energy-absorber maximum elongation
EA (ft, default 3.5 per ANSI Z359.13). Worker height D + safety
margin (ft, default 6 + 3 safety). Free-fall distance FF (ft,
typically equals lanyard length minus anchor offset).

**Output.** Required clearance below anchor (ft). Pass / fail
against the entered anchor height. Recommended retrofit if
clearance fails: shorter lanyard, retractable lifeline, anchor
relocation.

**Math.** Public formula:

    Required_clearance = FF + EA + worker_height + safety_margin

OSHA 1926.502(d)(16) governs the clearance requirement; the
calculator output is the distance, not a code interpretation.

**Citation.** "Per ANSI/ASSP Z359.13-2013 (Personal Energy
Absorbers and Lanyards) and OSHA 29 CFR 1926.502(d)(16).
Manufacturer instructions for the specific energy absorber
govern the absorber elongation value. AHJ and competent
person govern final fall-protection plan. Free at ecfr.gov."

**Edge cases.** Lanyard length above 6 ft flagged as
"non-standard, confirm with manufacturer." Free-fall distance
above 6 ft flagged as exceeding OSHA 1926.502(d)(16)(i).

**Tests.** Eight unit tests covering rooftop, leading-edge, and
suspended scaffold configurations.

### C.5 OSHA 1910.95 noise dose and time-weighted average

**Inputs.** Up to ten exposure rows. Each row: sound level (dBA)
and exposure duration (hr). Optional: action-level toggle
(80 dBA action level vs 90 dBA PEL).

**Output.** Permissible exposure time T per row (hr) per the
5 dB exchange formula. Per-row dose contribution C/T. Total
dose D (percent). 8-hour time-weighted average TWA (dBA). Pass /
fail against the entered action level.

**Math.** OSHA 1910.95(b) formulas, public:

    T = 8 / 2^((L - 90) / 5)
    D = sum(C_i / T_i) * 100
    TWA = 16.61 * log10(D / 100) + 90

**Citation.** "Per OSHA 29 CFR 1910.95(b) Appendix A and
Table G-16a. NIOSH recommends a 3 dB exchange rate (NIOSH
98-126); this calculator implements the OSHA 5 dB rule. AHJ
governs. Free at ecfr.gov and at cdc.gov/niosh."

**Edge cases.** Sound level below 80 dBA contributes zero to
the OSHA dose. Exposure duration above 16 hr in a single row
flagged. Total exposure across all rows above 24 hr rejected.

**Tests.** Twelve unit tests including the worked example from
OSHA 1910.95 Appendix A (multi-level workshift exposure).

### C.6 Confined-space pre-entry ventilation

**Inputs.** Space volume V (ft^3) from length, width, height.
Blower CFM Q. Target air-changes desired before entry (default
7 per NIOSH 80-106). Optional: target contaminant (combustible
gas / oxygen-deficient / H2S / CO) selects different default
ACH and a reminder of the 4-gas-meter requirement.

**Output.** Time required to achieve target ACH (min:sec).
Resulting air-changes per hour at steady ventilation. Reminder
that mechanical ventilation alone does not certify the space;
4-gas-meter readings before and during entry are required by
1910.146.

**Math.** Public mass-balance:

    minutes_to_purge = (V * ACH_target) / Q
    ACH = Q * 60 / V

**Citation.** "Per OSHA 29 CFR 1910.146 (Permit-Required
Confined Spaces) and NIOSH 80-106 (Working in Confined Spaces).
Pre-entry atmospheric monitoring with a calibrated 4-gas meter
is required by 1910.146(d)(5). Ventilation does not substitute
for monitoring. AHJ governs. Free at ecfr.gov and at
cdc.gov/niosh."

**Edge cases.** Volume below 100 ft^3 flagged as "very small;
purge times are short and stratification dominates."
Q < 100 cfm flagged as "may not be effective."

**Tests.** Eight unit tests including a typical 8 ft x 8 ft x
12 ft tank with a 1500 cfm blower.

## 6. Phase D — Trucking expansion (Group J)

Two new tiles.

### D.1 Federal Bridge Formula

**Inputs.** Number of axles in the group (N). Distance in feet
between the outermost axles in the group (L). Optional gross
vehicle weight (GVW, lbs).

**Output.** Maximum gross weight allowed on the group (lbs)
per the federal formula. Comparison to the entered GVW (pass /
fail with margin in lbs). 80,000 lb federal interstate cap
also shown.

**Math.** Public regulation, 23 CFR 658.17(c):

    W = 500 * (LN / (N - 1) + 12N + 36)

with the federal cap of 80,000 lbs on the interstate system
applied as min(W, 80000) where applicable.

**Citation.** "Per FMCSA 23 CFR 658.17 (federal bridge formula
B). State limits may be lower or higher (grandfathered).
USDOT scales are the legal record. Free at ecfr.gov."

**Edge cases.** N = 1 (single axle) returns the single-axle
limit (20,000 lbs federal). N = 2 (tandem) capped at the
34,000 lb tandem-axle limit. L below the 4 ft minimum spacing
between axles flagged.

**Tests.** Ten unit tests covering single, tandem, tridem, and
five-axle tractor-trailer configurations.

### D.2 Stopping sight distance

**Inputs.** Speed v (mph). Perception-reaction time t_pr (s,
default 2.5 per AASHTO Green Book). Coefficient of friction f
(default 0.35 dry, 0.20 wet, 0.10 ice; user selects condition).
Grade g (decimal, default 0.0; positive uphill).

**Output.** Brake reaction distance d_pr (ft). Braking distance
d_br (ft). Total stopping sight distance d (ft). Comparison to
the AASHTO design SSD for the entered speed.

**Math.** AASHTO Green Book formula, public algebra:

    d_pr = 1.47 * v * t_pr
    d_br = v^2 / (30 * (f + g))
    d = d_pr + d_br

**Citation.** "Per AASHTO Green Book (Policy on Geometric
Design of Highways and Streets, 7th ed.) Chapter 3 stopping
sight distance. AASHTO publishes design SSD tables; this
calculator outputs the underlying physics. AHJ (state DOT)
governs roadway design. Free at transportation.org for TOC."

**Edge cases.** Speed below 5 mph flagged as below the
formula's design range. Coefficient of friction below 0.05
flagged as "essentially uncontrolled, do not drive these
conditions."

**Tests.** Ten unit tests at 30, 45, 55, 65, 75 mph covering
dry, wet, and downgrade scenarios.

## 7. Phase E — Water and wastewater operations (Group M)

Two new tiles.

### E.1 F:M ratio and SVI

**Inputs.** BOD load (lb/day) entering the aeration basin OR
flow (MGD) and influent BOD (mg/L). Aeration basin volume
(million gallons). MLVSS concentration (mg/L). 30-minute
settled volume SV30 (mL/L). MLSS (mg/L).

**Output.** F:M ratio (lb BOD per day per lb MLVSS). SVI
(mL/g, computed as SV30 * 1000 / MLSS). Sludge age / mean cell
residence time (days, optional). Operational band: F:M typical
0.05 to 0.5 for conventional activated sludge; SVI 80 to 150
typical, > 200 indicates bulking.

**Math.** Public formulas from USEPA Wastewater Operator
Training and WEF MOP 11:

    F:M = BOD_in / (MLVSS * V_basin)
    SVI = SV30 * 1000 / MLSS

**Citation.** "Per USEPA Wastewater Operator Training (public
domain) and WEF Manual of Practice No. 11 by name. State
primacy agency NPDES permit governs effluent limits. Free at
epa.gov."

**Edge cases.** MLSS = 0 flagged. SV30 > MLSS volume rejected.

**Tests.** Eight unit tests covering conventional, extended-
aeration, and high-rate plants.

### E.2 Disinfection CT value

**Inputs.** Free chlorine residual C (mg/L). Contact time t10
(min) at the basin's hydraulic 10-percentile. Water temperature
(C, default 5 worst-case for cold-climate compliance). pH
(default 7.0).

**Output.** CT achieved (mg/L * min). Required CT for the
entered temperature, pH, and target log inactivation (3-log
Giardia, 4-log virus per the SWTR primary standard). Pass / fail
against the most-stringent applicable target.

**Math.** Public USEPA SWTR Guidance Manual EPA 815-R-99-014
tables for required CT are reference values. The calculator
interpolates linearly between the published temperature and pH
breakpoints (5 / 10 / 15 / 20 / 25 C; pH 6.0 / 7.0 / 8.0 / 9.0)
for free chlorine. The interpolation method is published in the
Guidance Manual; the table values themselves are public-domain
federal data.

**Citation.** "Per USEPA Surface Water Treatment Rule Guidance
Manual EPA 815-R-99-014 (1999, public domain). State primacy
agency governs compliance. Free at epa.gov."

**Edge cases.** Temperature below 0.5 C flagged as outside table
range. pH above 9.0 flagged. Chlorine residual below 0.2 mg/L
returns zero CT achieved.

**Tests.** Twelve unit tests reproducing the SWTR Guidance
Manual worked examples for 3-log Giardia at 5 C, 10 C, 15 C
and pH 7.0.

## 8. Phase F — Field, backcountry, and SAR (Group P)

Three new tiles.

### F.1 Magnetic declination

**Inputs.** Latitude (decimal degrees, -90 to 90). Longitude
(decimal degrees, -180 to 180). Date (default today).
Optional: altitude in km above WGS84 ellipsoid (default 0).

**Output.** Magnetic declination (degrees, positive east,
negative west). Annual change (deg/year). Bearing-correction
helper: enter a magnetic bearing, output true bearing, and
vice versa. Date warning if user enters a date more than five
years from the WMM coefficient publication date.

**Math.** World Magnetic Model. Bundle the current published
WMM coefficients (WMM2025 covers 2025 to 2030). The WMM is
explicitly public-domain (NCEI / NGA), no license, no fee.
Implementation is the canonical NCEI WMM C reference port to
JavaScript, ~250 lines.

**Citation.** "Per NOAA / NCEI World Magnetic Model 2025 (WMM
2025), valid 2025-2030. Public domain. Free at
ncei.noaa.gov/products/world-magnetic-model. Solar storms,
local geological anomalies, and ferrous gear can shift the
local field by several degrees beyond the model. The model is
not a substitute for a recent compass calibration."

**Edge cases.** Date outside the WMM coefficient range
(< 2025 or > 2030) flagged with a "model has expired,
update bundled coefficients" notice surfaced to the build,
not silently consumed by the user.

**Tests.** Twelve unit tests against the NCEI WMM2025 test-
value table (a public-domain test fixture) at a range of
latitudes and dates.

### F.2 Lightning 30-30 rule countdown

**Inputs.** Flash-to-bang count (seconds between visible
flash and audible thunder).

**Output.** Estimated distance to last strike (miles,
computed as seconds / 5). 30-second threshold pass / fail
("seek shelter immediately" if under 30). 30-minute resume
countdown timer that starts when the user taps "last strike
now" and counts down from 30 minutes (suspends the timer if
the user re-taps; the URL hash holds the remaining time so a
page reload does not reset).

**Math.** Public: speed of sound at sea level is approximately
1125 ft/s; 5 seconds approximates one mile.

**Citation.** "Per NOAA / NWS lightning safety. The 30-30 rule
is an NWS public guideline. Free at weather.gov/safety/lightning."

**Edge cases.** Flash-to-bang above 60 seconds (12+ miles)
flagged "storm distant; continue to monitor." Below 5 seconds
flagged "imminent danger, seek shelter."

**Tests.** Six unit tests including the timer-state hash
serialization round-trip.

### F.3 Avalanche slope-angle screen

**Inputs.** Measured slope angle (degrees, from clinometer or
phone). Aspect (N / NE / E / SE / S / SW / W / NW). Recent
24-hour snowfall (in, optional). Avalanche warning level
issued by the local center (1 to 5, optional, user enters).

**Output.** Slope-angle band: < 25 deg (low), 25 to 30 deg
(caution), 30 to 45 deg (avalanche terrain, the prime danger
zone), > 45 deg (sluffs but rarely full avalanches). Aspect
risk note (lee-loaded slopes given the entered prevailing wind,
if entered). Conservative go / no-go advisory with a prominent
"this is a screening tool, not avalanche-rescue training" notice.

**Math.** Pure threshold logic. The 30-to-45 degree danger band
is the avalanche-education consensus, not a copyrighted table.

**Citation.** "Per NOAA / NWS NWAC and the Colorado Avalanche
Information Center public education materials. AIARE Level 1
training is the recommended minimum for avalanche-terrain
travel. This calculator does not substitute for training,
experience, or a daily avalanche advisory. Free at avalanche.org."

**Edge cases.** Angle above 60 deg or below 0 deg rejected.

**Tests.** Six unit tests covering each band, plus aspect-load
permutations.

## 9. Phase G — Carpentry and excavation (Group E)

Two new tiles.

### G.1 Stair stringer geometry

**Inputs.** Total rise (in, floor-to-floor). User-supplied
maximum rise (in, default 7.75 per IRC R311.7.5.1). User-
supplied minimum tread depth (in, default 10 per IRC R311.7.5.2).
Stringer pitch override (rise/run ratio, optional).

**Output.** Number of risers N. Actual unit rise R (in, total
rise / N). Actual tread depth T (in). Total run (in). Stringer
length L (in, hypotenuse). Headroom verification at the entered
ceiling height (default 80 in per IRC). Pass / fail with each
limit shown side-by-side.

**Math.** Pure geometry:

    N = ceil(total_rise / max_rise)
    R = total_rise / N
    L = sqrt(total_rise^2 + (T * (N - 1))^2)

The IRC R311.7 limits are user-supplied so the tile is
AHJ-agnostic. Default values are the most common IRC values
but the user must confirm against their adopted edition.

**Citation.** "Per IRC 2021 §R311.7 (stairways). User must
confirm the rise / tread / headroom limits against the
AHJ-adopted edition; defaults are placeholders. AHJ governs
final inspection. Free at codes.iccsafe.org for IRC TOC."

**Edge cases.** Rise per the calculation exceeds the user-
supplied max: shown in red and the calculator suggests the
next-higher N. Tread below user-supplied minimum: same
treatment. Total rise below 12 in returned with "step, not
stair, no calculation needed."

**Tests.** Ten unit tests covering 8 ft, 9 ft, 10 ft floor-to-
floor heights with default and overridden limits.

### G.2 Excavation slope and bench-step optimizer

**Inputs.** Trench depth D (ft). Soil class (A / B / C per
OSHA 1926 Subpart P Appendix B descriptions). Surcharge load
near trench (yes / no). Total excavation length (ft).

**Output.** Maximum allowable slope (H:V ratio per soil class).
Bench-step layout: number of benches, height per bench, and
horizontal step at each bench, optimized to minimize total
spoil volume. Total spoil volume (yd^3) at the optimized
layout. Surface footprint (ft^2 of cleared area required).

The existing trench-protection tile (calc-cross.js) returns the
slope ratio. This new tile turns the slope ratio into an
excavation plan with quantities the foreman orders against.

**Math.** Public OSHA Appendix B slope ratios (A 0.75:1, B 1:1,
C 1.5:1). Bench geometry is public excavation engineering.
The optimizer minimizes spoil under the OSHA bench-height
limit (4 ft per bench typical for type B soil).

**Citation.** "Per OSHA 29 CFR 1926 Subpart P Appendix B (soil
classification and slope). Competent person on-site governs
final plan; this calculator outputs geometry only. Free at
ecfr.gov."

**Edge cases.** Depth below 5 ft does not require sloping per
1926.652(a)(1); the calculator notes this. Depth above 20 ft
requires a registered professional engineer's design per
1926.652(b)(4); the calculator stops and tells the user.

**Tests.** Ten unit tests covering 5, 8, 12, 16, and 20 ft
depths in each soil class.

## 10. Phase H — Tier 2 smaller-audience expansion

Six new tiles. Lower frequency than Tier 1, still standards-backed
and field-derivable.

### H.1 Restoration psychrometric drying log (Group D)

**Inputs.** Ambient and chamber temperature (F), RH (percent),
and timestamp at each reading. Up to 14 readings (one per day
for a typical drying job). Target boundary humidity ratio
(grains/lb, computed from ambient or user-entered).

**Output.** Grains-per-pound at each reading. Boundary-pass
indicator per IICRC S500 (chamber GPP must trend below ambient
GPP for drying to be in progress). Trend slope (GPP per day).
Estimated dry-down completion date.

**Math.** Bundled psychrometric helper (already present in the
worker). Boundary-humidity test per IICRC S500.

**Citation.** "Per IICRC S500-2021 (Standard for Professional
Water Damage Restoration). IICRC certification governs.
Boundary-humidity test is public method; the standard governs
acceptance. Free at iicrc.org for TOC."

**Edge cases.** Chamber GPP above ambient GPP flagged as "drying
not in progress, check equipment placement and exhaust."

**Tests.** Eight unit tests including a 7-day drying log fixture.

### H.2 Sound pressure level at distance (Group N)

**Inputs.** Source SPL (dB) at reference distance (m, default 1).
Target distance (m or ft). Atmospheric absorption parameters
(temperature C, RH percent, pressure kPa).

**Output.** Far-field SPL at target distance using inverse-square
plus atmospheric absorption per ANSI S1.26-2014. Frequency-band
breakdown (octave bands 125 Hz to 8 kHz) for the absorption
component.

**Math.** Public formulas:

    SPL_far = SPL_ref - 20 * log10(d_far / d_ref) - alpha * d_far

where alpha is the ANSI S1.26 absorption coefficient. ANSI
publishes the formula; the calculator computes per the formula.

**Citation.** "Inverse-square law. Atmospheric absorption per
ANSI S1.26-2014 (R2019). For closed venues, room acoustics
dominate over inverse-square. AHJ governs final coverage.
Free at ansi.org for TOC."

**Edge cases.** Distance below the reference rejected. Frequency
above 12.5 kHz flagged as outside ANSI S1.26 coefficient range.

**Tests.** Eight unit tests including a 95 dB / 1 m source at
30 m and 100 m.

### H.3 Sprayer 1/128-acre calibration (Group L)

**Inputs.** Travel distance for 1/128 acre at the boom width
(ft; default boom-width to 1/128-acre travel distance lookup
from the bundled USDA extension table). Time to travel that
distance (s). Total spray volume collected from one nozzle in
the same time (oz).

**Output.** Application rate (gpa, gallons per acre). Pass / fail
against the entered target rate. Recommended pressure or speed
adjustment to bring the actual rate to the target.

**Math.** USDA extension method, public:

    GPA = oz_per_nozzle * nozzles / (acre_fraction * unit_correction)

The 1/128-acre method exploits 128 fl oz per gallon: catching
1 oz across 1/128 acre per nozzle equals 1 gpa.

**Citation.** "Per USDA Cooperative Extension Service public
calibration method. Pesticide label rates govern application;
pesticide-applicator license governs use. Free at extension.org
and at land-grant university extension offices."

**Edge cases.** Travel distance under 50 ft flagged. Volume per
nozzle under 1 oz flagged as "below precision threshold;
re-collect at 2x distance."

**Tests.** Eight unit tests including the USDA worked example
for a 20 ft boom at 4 mph.

### H.4 Temperature-Humidity Index for livestock (Group L)

**Inputs.** Dry-bulb temperature (F or C). Relative humidity
(percent). Animal type (dairy cow / beef cow / hog / poultry /
horse). Optional: ventilation type (closed / open).

**Output.** THI value. Stress band per the bundled USDA-ARS
public THI table by animal type (mild / moderate / severe /
emergency). Recommended cooling intervention per the band.

**Math.** Public formula:

    THI = (1.8 * T_C + 32) - (0.55 - 0.0055 * RH) * (1.8 * T_C - 26)

The species-specific stress thresholds are USDA-ARS / Kansas
State extension public values.

**Citation.** "Per USDA-ARS livestock heat-stress research
publications and Kansas State University Cooperative Extension.
Public domain. Free at usda.gov and at K-State Research and
Extension."

**Edge cases.** Temperature below 50 F flagged "no heat stress
expected; check cold-stress tools instead." RH above 100 or
below 0 rejected.

**Tests.** Eight unit tests covering each species at three
temperature-humidity combinations.

### H.5 Beer-Lambert solver (Group T, conditional)

This tile is added only if `calc-lab.js` does not already export
a Beer-Lambert solver. Verify against the v0.9.0 lab module
before implementing.

**Inputs.** Two of three: absorbance A (unitless, 0 to 4
typical), molar absorptivity epsilon (M^-1 cm^-1), concentration
c (M). Path length l (cm, default 1.0). The user enters two of
the three primary values; the calculator solves for the third.

**Output.** The solved unknown. A clearly stated assumption that
the sample obeys Beer-Lambert (dilute, non-scattering, single
wavelength). Range warning when A > 1 (linearity degrades) and
A > 2 (calculator stops with "instrument near saturation, dilute
the sample").

**Math.** A = epsilon * c * l. Public physics.

**Citation.** "Beer-Lambert law (public physics). NIST SP 260
governs spectroscopic standards. Free at nist.gov."

**Edge cases.** Negative absorbance rejected. Path length not in
(0.01, 10) cm flagged.

**Tests.** Eight unit tests including the standard
copper-sulfate visible-range example used in undergraduate labs.

### H.6 Sous-vide pasteurization time (Group O)

**Inputs.** Food category (poultry / pork / beef / fish / egg).
Thickness (mm or in). Target water-bath temperature (F or C).
Initial food temperature (F or C, default refrigerated 38 F).
Target log reduction (default 6.5-log Salmonella per FDA Food
Code Annex 6).

**Output.** Come-up time (min, time for thermal center to reach
within 0.5 C of bath temperature using the bundled food thermal-
diffusivity table for each category, public USDA values).
Pasteurization hold time at the bath temperature (min). Total
time (come-up + hold). Safety band: above 130 F is the FDA
range, below 130 F flagged as "outside FDA pasteurization range,
not for ready-to-eat applications."

**Math.** Public Baldwin / FDA Food Code Annex 6 method. Come-up
time uses the standard 1-D heat-conduction approximation:

    t_cup = (thickness^2 / (alpha)) * F_o_target

Pasteurization hold time uses the bundled time-temperature
inactivation curve (USDA-FSIS / FDA, public).

**Citation.** "Per FDA Food Code 2022 Annex 6 (sous vide). USDA-
FSIS time-temperature inactivation tables for Salmonella, public
domain. Local health code adopts and may modify. Free at fda.gov
and fsis.usda.gov."

**Edge cases.** Thickness above 75 mm (3 in) flagged as "outside
typical sous-vide range." Bath temperature below 130 F or above
185 F flagged.

**Tests.** Twelve unit tests including the FDA Annex 6 worked
examples for 1 in chicken breast at 150 F and 1.5 in pork chop
at 145 F.

## 11. Out of scope

In addition to all prior-spec out-of-scope items:

- Service / demand-load electrical calc beyond the simplified
  lighting density already in v8 Phase B. NEC 220 demand-factor
  tables are licensed and the simplified version risks misuse.
  AHJ-supplied demand factors are the right input; this site does
  not bundle them.
- State-by-state statute-of-limitations countdowns and filing-fee
  lookups. State law drifts faster than the 90-day deprecation
  cycle. Out of v9 scope; revisit if a public, machine-readable
  state law feed appears.
- HazMat reference content. Reserved for the future hazmat-
  reference site per README and per spec-v8 §8.
- Live drug-dosing or clinical decision support. Reserved for the
  separate clinical-utility site.
- Real-time anything: prices, weather, fuel, traffic, regulations.
  Not within the static-site architecture.
- AI / LLM / probabilistic / generative anything.
- Any tool that requires an account, login, or external API call.

## 12. Build, test, deployment

### 12.1 Phase order

Implement in the order that maximizes field impact per kilobyte
of new payload, with each phase separately CHANGELOG-stamped:

1. **Phase A (Electrical, 4 tiles)**, ship as v0.10.0. Field
   impact: very high. Each tile is roughly 200 lines of calc
   plus tests. Approx 12 KB of new module code, lazy-loaded.
2. **Phase C.4, C.5, C.6 (life-safety: fall, noise, confined),
   3 tiles**, ship as v0.10.0 alongside Phase A. Each is small
   and the formulas are eCFR-public. Approx 6 KB.
3. **Phase D (Trucking, 2 tiles)**, ship as v0.10.0 alongside
   Phase A. Bridge formula is one short function. Approx 4 KB.
4. **Phase F.1 (declination, 1 tile)**, ship as v0.10.0
   alongside Phase A. WMM coefficients add roughly 4 KB
   (gzipped) and live in `data/field/wmm/coefficients.json`
   with a manifest carrying the WMM2025 edition stamp.
5. **Phase B (HVAC and Plumbing, 5 tiles)**, ship as v0.11.0.
   Approx 15 KB.
6. **Phase G (Carpentry and excavation, 2 tiles)**, ship as
   v0.11.0 alongside Phase B. Approx 6 KB.
7. **Phase E (Water and wastewater, 2 tiles)**, ship as
   v0.11.0 alongside Phase B. Approx 6 KB.
8. **Phase C.1, C.2, C.3 (fire-ground, 3 tiles)**, ship as
   v0.12.0. Approx 9 KB.
9. **Phase F.2, F.3 (lightning, avalanche, 2 tiles)**, ship as
   v0.12.0. Approx 4 KB.
10. **Phase H (Tier 2, 6 tiles)**, ship across v0.12.0 and
    v0.13.0 as time and audit allow. Approx 18 KB.

The home-view critical-path payload does not change; new tiles
are dynamic-imported per the existing routing pattern in
[../routing.js](../routing.js).

### 12.2 Test requirements

Every new tile follows the v3-and-later discipline:

- Ten or more unit tests per tile, in
  `test/unit/calc-<group>-v9.test.js`, including at least one
  worked example from a primary public source (USEPA manual,
  AASHTO Green Book, OSHA appendix, etc.) cited in the test
  fixture itself.
- One renderer-wiring test per tile asserting the user-visible
  source-stamp string contains the standard's edition year and a
  free-access URL.
- For tiles with bundled data (Phase E.2 SWTR table, Phase F.1
  WMM coefficients, Phase H.4 THI thresholds): a manifest with
  `edition` (and `asOf` where applicable) per spec-v6 §7 and
  spec-v8 §3.
- Lint additions to `scripts/check-manifests.mjs` for any new
  manifests.
- Playwright a11y test: each new tile passes axe-core with zero
  violations at default and Big-Buttons modes.
- Playwright e2e test for the URL-hash round-trip on at least
  one tile per phase.

### 12.3 Payload budget

The home-view payload budget remains 100 KB after gzip. v9 adds
roughly 80 KB of new calc-module code total (uncompressed),
gzipping to roughly 25 KB. None lives on the home-view critical
path; all is dynamic-imported when the tile is opened. The home-
view stays well under the 100 KB cap.

The bundled WMM coefficients (Phase F.1) are roughly 4 KB
gzipped and live in a separate data shard with its own manifest.

### 12.4 Documentation

- `docs/data-sources.md`: rows for the WMM coefficients (F.1),
  USEPA SWTR CT tables (E.2), USDA THI thresholds (H.4),
  USDA-FSIS pasteurization tables (H.6), and IICRC S500 boundary-
  humidity reference (H.1).
- `docs/derivations.md`: derivation entry for every Phase A, B,
  C, D, E, F, G, H tile.
- `docs/citation-discipline.md`: source-stamp strings for every
  new tile, in the per-edition table introduced by spec-v8 Phase B.
- `docs/threat-model.md`: no change. All new tiles are pure
  client-side computation. The lightning-30/30 timer (F.2) writes
  to URL hash only; same as every other state-bearing tile.
- `docs/accessibility.md`: confirm 48-px touch targets on the
  multi-row inputs (C.5 noise dose, B.1 SHR with up to 10 rows;
  H.1 drying log with up to 14 rows). Confirm voice-input parity
  on the slider-style inputs.
- `docs/launch-checklist.md`: the v9-specific gates described in
  section 13 below.
- `CHANGELOG.md`: one stanza per phase as it ships.

## 13. Launch checklist (v9-specific)

In addition to the prior-spec gates:

1. Every Phase A through H tile passes its unit tests.
2. Every Phase A through H tile renders without console error in
   Chrome, Safari, Firefox, and Mobile Safari.
3. axe-core reports zero violations on every new tile.
4. Big Buttons mode renders every new tile without overflow.
5. High-Contrast theme renders every new tile with a contrast
   ratio above 4.5:1 for normal text, 3:1 for large.
6. The WMM coefficients manifest (F.1) carries `"edition":
   "WMM2025 (2025-2030)"` and the build fails CI on a date past
   2030-01-01 unless the coefficients are updated.
7. The home-view payload budget audit (`npm run check:home-payload`)
   passes after every phase ships.
8. `npm run lint` passes including the v8 manifest checks.
9. The CHANGELOG carries a stanza for each phase that links to
   the source-of-truth standard for every tile.

## 14. Operations and ongoing maintenance

The recheck cadence per spec-v8 §10 carries forward. v9 adds:

- **WMM coefficients**: 5-year cycle. WMM2025 expires 2030-01-01.
  A build-time check warns at 6 months out. The replacement
  WMM2030 will be a public-domain release from NCEI; bundle it
  and bump the edition stamp.
- **NFPA 1142, 1932, 1981**: triennial cycle. Track in
  `scripts/sources.md`.
- **OSHA 1910.95, 1910.146, 1926.502, 1926.1053, 1926 Subpart P**:
  amendments are infrequent and noticed in the Federal Register.
  Subscribe via OSHA newsroom RSS; check on every minor release.
- **USEPA SWTR Guidance Manual**: the 1999 edition remains the
  reference; if USEPA reissues, bump the bundle.
- **AASHTO Green Book**: ~7 year cycle. Current 7th ed. (2018);
  watch for 8th ed.
- **FDA Food Code**: quadrennial cycle. 2022 -> 2026 due.
- **IRC, IPC, IBC, IMC, IFC**: triennial cycle.
- **ANSI Z359**: revisions issued periodically; track on annual
  cadence.

Track every recheck in `scripts/sources.md` with date and
reviewer per spec-v6 §6.

## 15. Closing note

v8 was the audit pass. v9 is the next layer of obvious gaps:
the questions tradespeople ask daily that this site does not
yet answer. None of these tiles is novel research. Every formula
in this spec is in a textbook, a federal regulation, or a NIST /
NOAA / USDA / USEPA publication available without payment or
account. The contribution of this site is not the formula. It is
the calm, fast, ad-free, account-free, ever-free presentation of
the formula at the moment a tradesperson needs the answer.

Build it the way the rest was built. One tile, one calculation,
one citation, one copy. Then get out of the user's way.
