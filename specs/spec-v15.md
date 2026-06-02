# roughlogic.com Specification v15 — Trades Core Expansion, Part I of III

> **Implementation status (drafted 2026-05-19; landing incrementally
> against the live catalog).** As of 2026-06-01, 33 of the 35 v15
> tiles are live: 22 had already landed under the earlier expansion
> windows (a 2026-06-01 audit found A.2 / A.4 / A.5 / A.7 / A.12,
> E.1-E.6 / E.9 / E.10, F.1 / F.3 / F.4, and G.2 / G.5 / G.6 / G.7
> already present); all seven Group A gaps (A.1, A.3, A.6, A.8, A.9,
> A.10, A.11) landed 2026-06-01, **closing Group A**; and the four
> Group G gaps — **G.1 pump total dynamic head** (`pump-tdh`), **G.3
> hydraulic cylinder force and speed** (`hydraulic-cylinder`), **G.4
> V-belt sheave and drive sizing** (`vbelt-drive`), and **G.8 gear
> ratio and RPM cascade** (`gear-cascade`) — landed the same day,
> **closing Group G**. All eleven shipped with full v14
> discipline (dimensional annotation, bounds fuzzer, worked-example
> cross-check, citation stamp, related-tiles + tile-meta + search
> aliases). The remaining genuinely-missing tiles are E.7, E.8, F.2,
> and F.5 (Groups E and F). The package
> version stamps at 0.15.0 only when the full v15 set closes; the
> §H.6 reviewer signoffs remain open and gate the "audited"
> announcement, not the incremental landing. v15 is the first of
> three sibling specs (v15, v16, v17)
> that together add 100 new tiles to the catalog (385 -> 485). v15
> handles the trades core: 35 new tiles across Group A (Electrical),
> Group E (Carpentry / Construction), Group F (Fire-Ground
> Engineering), and Group G (Cross-Trade Utilities). v16 handles the
> mechanical, plumbing, HVAC, restoration, and water deep-dive (30
> tiles). v17 handles the allied-profession expansion that v12 began
> (35 tiles across Groups U / V / W / X / Y plus depth in R / S / T
> / L). No new groups in any of the three specs; every tile lands in
> an existing group letter. No new third-party dependencies, no new
> licenses, no new storage keys, no telemetry, no AI. The site
> remains a 100 percent client-side static bundle. Every constraint
> from spec.md through spec-v14.md continues unchanged. Package
> version stamped at 0.15.0 at the close of v15; v16 will bump to
> 0.16.0; v17 to 0.17.0.

> Foreword, in the voice of a maintainer who has watched the catalog
> grow from 64 utilities in spec.md to 385 tiles in v12 and now,
> standing at the threshold of v15, has to answer the question the
> first 385 implicitly answered: what is the site actually for, when
> it is finished.
>
> The answer is the same answer it was on day one. The site is the
> reference the trade professional reaches for when the question is
> "what is the number," not "what is the philosophy." It is MDCalc,
> for the people MDCalc never thought to build for. The cardiologist
> has MDCalc. The electrician has a battered Ugly's, a phone in a
> drywall-dusted pocket, and ten browser tabs of ad-laden third-party
> calculators that may or may not have been updated since the 2014
> code cycle. The point of this site, three years in, is to be the
> first hit, the only hit, and the right hit. A tile per question.
> One formula, one citation, one source stamp, one copy-to-clipboard,
> and out of the way.
>
> v12 promised to "build it the way the rest of the site was built.
> One tile, one calculation, one citation, one copy." v15 is the next
> 35 tiles built that way, and v16 and v17 are the 65 after that.
> 100 tiles in total, split three ways for review, gating, and
> rollout sanity. The split is not arbitrary. v15 is the trade core
> the v1 spec promised the audience: the electrician sizing the EV
> charger circuit on a Friday at 4 PM, the carpenter sizing the
> header for the window the owner just decided to enlarge, the
> engine-company captain doing the standpipe math on the second
> floor of a high-rise, and the cross-trade professional sizing a
> pump for the well house. These are the people the v1 spec opened
> with. v15 closes the gaps in their daily question set that the
> first 14 specs left open.
>
> Build it the way the rest was built. One tile, one derivation, one
> cross-check, one tolerance, one signoff. Then get out of the way.

This document is the v15 spec. It inherits everything from spec.md,
spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md, spec-v6.md,
spec-v7.md, spec-v8.md, spec-v9.md, spec-v10.md, spec-v11.md,
spec-v12.md, spec-v13.md, and spec-v14.md. Every prior constraint
remains in force. Where v15 references a v14 correctness mechanism
(dimensional-analysis lint, bounds-and-edge-case fuzzer, per-tile
worked-example registry, reviewer signoff per group), the new tiles
must pass those gates before they land; the v14 mechanism is now
the floor, not an aspiration.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States.

## 1. Inheritance and conventions

- Every tile carries Inputs / Output / Math / Citation / Edge cases /
  Tests, exactly as v9 and v12 established.
- Every tile's `editions`, `asOf`, `tolerance`, `worked_example`, and
  `reviewer_signoff` fields are populated in the manifest per
  spec-v8, spec-v10, and spec-v14. The v14 audit-trail entry must be
  recorded before the tile renders in production.
- Every tile carries the v3 inline disclaimer variant appropriate to
  its group (trades / fire / legal / etc.).
- Tile IDs within this spec are letter.number scoped to v15: A.1
  through A.12 are the twelve new electrical tiles added in v15,
  numbered fresh within this spec. The runtime tile-meta.js entries
  get globally-unique slug names per the v5 routing scheme.
- No tile in v15 introduces a new external data file beyond what is
  already in `data/`. Where a calculation depends on a value the
  user supplies (e.g., soil bearing pressure, manufacturer C-factor,
  NEC table entry from an edition the AHJ has adopted), the tile
  prompts for it; the tile does not bundle paywalled table values.
- All new tiles must satisfy the v14 dimensional-analysis lint and
  pass at least one independently published worked-example test
  within the per-tile tolerance band declared in the manifest.

## 2. Phase A — Electrical expansion (Group A)

Twelve new tiles. All cite NEC 2023 by section only; none reproduce
a table. Per spec-v6 source-stamp discipline, each tile carries
"AHJ governs" and a free-access pointer to nfpa.org/freeaccess.

### A.1 Three-phase voltage drop with reactance

**Inputs.** System voltage line-to-line (V), load current (A), one-way
length (ft), conductor material (Cu / Al), conductor size (AWG /
kcmil from the v8 standard-sizes list), conduit type (PVC /
aluminum / steel), power factor (0.5 to 1.0; default 0.85),
phases (1 / 3).

**Output.** Voltage drop (V), percent drop relative to nominal, and
voltage at the load. The "include reactance" toggle exposes the
underlying R and X used; the simplified "resistance only" mode
matches the v1 voltage-drop tile. The output includes the
NEC 210.19(A) Note 4 and 215.2(A)(1) Note 2 advisory band (3 percent
branch, 5 percent total).

**Math.** Public formula. Single-phase:

    Vd = 2 * I * (R * cos(theta) + X * sin(theta)) * L / 1000

Three-phase:

    Vd = 1.732 * I * (R * cos(theta) + X * sin(theta)) * L / 1000

R and X per conductor per 1000 ft computed from NEC Chapter 9
Table 9 reference values (the table is an input to the
calculation; the calculator does not display it). theta = arccos(PF).

**Citation.** "NEC 2023 Chapter 9 Table 9 reference impedance per
1000 ft, with R and X selected by conductor type and conduit
material. NEC 210.19(A) Note 4 and 215.2(A)(1) Note 2 establish
the 3 percent / 5 percent advisory bands. AHJ governs.
Free at nfpa.org/freeaccess."

**Edge cases.** PF outside (0.5, 1.0) flagged. Conductor size
outside bundled range rejected. Negative or zero current rejected.
For 1ph 120/240 V three-wire systems, the user picks "single-phase"
and gets the same 2 * I * L formula; the tile notes that line-to-
line drop on a three-wire system uses the per-line current.

**Tests.** Twelve unit tests. Worked example: 100 A, 200 ft, 1/0
copper THHN in steel conduit, 480 V three-phase, PF 0.85 — verify
against the Mike Holt voltage-drop calculator within 2 percent
(the tolerance band recorded per v14 §C.3).

### A.2 Transformer kVA sizing from connected load

**Inputs.** List of loads (each: kW or kVA, power factor, demand
factor 0 to 1.0, continuous / non-continuous flag). Service voltage
and phase. Optional spare capacity factor (default 25 percent per
NEC 220.61 service load practice).

**Output.** Total connected load (kVA), total demand load (kVA),
recommended next-standard transformer kVA size (15, 30, 45, 75,
112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500 kVA),
secondary full-load amperes for the recommended size, and a flag
for any single load whose inrush could exceed 25 percent of the
selected transformer's kVA (motor starting screen).

**Math.** Public arithmetic. kVA_total = sum(kVA_i * DF_i) +
(continuous loads at 125 percent per NEC 215.2(A)(1)). Secondary
FLA = kVA * 1000 / (1.732 * V_LL) for three-phase, kVA * 1000 / V
for single-phase. Standard size lookup uses the v8 standard-sizes
list.

**Citation.** "Per NEC 2023 Article 220 (load calculation) and
Article 450 (transformers). Standard transformer sizes per IEEE
C57. Continuous-load 125 percent rule per NEC 215.2(A)(1).
AHJ governs. Free at nfpa.org/freeaccess."

**Edge cases.** Loads with PF below 0.5 flagged. Demand factor
above 1.0 rejected. Empty load list rejected. Total connected
load below 5 kVA flagged as below typical transformer sizing
range.

**Tests.** Ten unit tests covering single-phase residential,
three-phase commercial, and a worked example from an IEEE 141
(Red Book) section.

### A.3 Power triangle (kW / kVA / kVAR / PF) solver

**Inputs.** Any two of: real power (kW), apparent power (kVA),
reactive power (kVAR), power factor (0 to 1.0), phase angle
(degrees). The tile detects which two are supplied and solves
for the remaining three.

**Output.** All four derived quantities plus phase angle. A small
phasor diagram (SVG, accessible per spec-v3 §accessibility) shows
the triangle to scale.

**Math.** Public algebra: kVA^2 = kW^2 + kVAR^2, PF = kW / kVA,
theta = arccos(PF).

**Citation.** "First-principles AC power triangle. IEEE 1459
defines apparent, real, and reactive power for sinusoidal and
non-sinusoidal systems; this tile handles the sinusoidal case.
Free at standards.ieee.org for IEEE 1459 abstract."

**Edge cases.** Fewer than two inputs rejected with "supply any
two." PF > 1.0 rejected. kVAR sign flag (leading vs lagging) is
an explicit toggle; the output labels each accordingly.

**Tests.** Ten unit tests covering every two-input pair.

### A.4 Power-factor correction capacitor sizing

**Inputs.** Existing real power (kW), existing power factor (0 to
1.0), target power factor (0 to 1.0), system voltage (V), phase
(1 / 3), system frequency (60 Hz default).

**Output.** Required reactive power compensation (kVAR), standard
capacitor bank size (rounded up to 2.5 kVAR steps for residential
or 5 / 10 / 25 / 50 / 100 kVAR steps for industrial), capacitor
microfarads (uF) for the user's voltage and frequency, expected
new line current draw, and the kW savings from reduced I^2 R
losses for a stated upstream distance.

**Math.** Public:

    kVAR_required = kW * (tan(arccos(PF_old)) - tan(arccos(PF_target)))
    C_uF = (kVAR * 1e9) / (2 * pi * f * V^2)

**Citation.** "Per IEEE 519 (harmonics) and IEEE 1036 (shunt
capacitor application). Standard capacitor bank sizes per NEMA
CP-1. Caution: capacitors can resonate with system inductance
near harmonic frequencies; a power-quality study is recommended
above 100 kVAR. Free at standards.ieee.org for IEEE 1036 abstract."

**Edge cases.** Target PF > 0.99 flagged (resonance risk; over-
correction can produce leading PF and over-voltage at light
load). Target PF below existing PF rejected. Voltage below 208 V
flagged as residential range.

**Tests.** Ten unit tests including a worked example from IEEE
1036 (industrial plant 800 kW, PF 0.72 to 0.95).

### A.5 Generator sizing for motor starting

**Inputs.** Generator nameplate kVA (or user types target), motor
HP, motor voltage and phase, motor starting method (across-the-
line / star-delta / soft-start / VFD), motor code letter (A through
V; default G), motor service factor, ambient temperature (F).

**Output.** Motor starting kVA (locked-rotor), required generator
kVA to limit voltage dip to 15 percent (the NEMA MG-1 advisory),
required kVA to limit dip to 10 percent (premium), starting
voltage dip estimate for the user's entered generator size, and a
flag if the user's generator is undersized.

**Math.** Public:

    LR_kVA = HP * code_letter_kVA_per_HP
    V_dip_pct = (LR_kVA * Z_gen) / (gen_kVA + LR_kVA * Z_gen) * 100

NEMA MG-1 code-letter kVA per HP table values are bundled as
public reference. Generator subtransient impedance defaulted to
0.15 with user override.

**Citation.** "Per NEMA MG-1 (motor code letters) and IEEE 446
(Orange Book, emergency and standby power). Generator subtransient
impedance varies by manufacturer; confirm with nameplate. AHJ and
generator manufacturer govern. Free at standards.ieee.org for
IEEE 446 abstract."

**Edge cases.** HP above 500 flagged as outside small-genset
range. Code letter not on the NEMA table flagged. Across-the-line
starting on a generator below 2 x motor kVA flagged as marginal.

**Tests.** Ten unit tests including a worked example from the
Cummins or Caterpillar published generator sizing guide
(within 5 percent of the manufacturer's recommended size).

### A.6 EV charger continuous-load and panel impact

**Inputs.** Charger nameplate amperes (typical 16, 24, 32, 40, 48,
80 A at 240 V), charger voltage, panel main breaker (A), existing
service load calc (A) from the v1 service-load tile (optional
import via hash-link), panel busbar rating (A).

**Output.** Continuous-load circuit ampacity required (charger A x
1.25 per NEC 625.41 / 625.42), recommended branch-circuit conductor
size and conduit fill, recommended breaker size, new panel load
total, panel headroom remaining, and a NEC 625.42(A) energy-
management notice if the charger is sized via a load-management
controller rather than full-rated.

**Math.** Public:

    I_circuit = I_charger * 1.25
    conductor = lookup(I_circuit, NEC_310.16)  // from physics, per v1
    new_panel_load = existing_load + I_circuit

**Citation.** "Per NEC 2023 Article 625 (EV charging). 625.41
governs charger load classification (continuous); 625.42 governs
load management. NEC 220.83 / 220.87 governs panel load calc.
AHJ governs. Free at nfpa.org/freeaccess."

**Edge cases.** Charger > 80 A on a 100 A panel rejected.
Charger on a panel with a busbar rating below the new total load
flagged. Panel headroom < 10 percent flagged as marginal.

**Tests.** Twelve unit tests. Worked example: 48 A charger on a
200 A service with 130 A existing load, conductor sized per NEC
310.16 at 75 C, against the Mike Holt EV-charger article published
in EC&M.

### A.7 PV string sizing (cold Voc and hot Vmp)

**Inputs.** PV module Voc (V), Vmp (V), Isc (A), Imp (A),
temperature coefficient of Voc (%/C), temperature coefficient of
Vmp (%/C), record low temperature (F) for site, record high
ambient temperature (F), modules per string, inverter Vmax (V),
inverter MPPT window low and high (V).

**Output.** Adjusted string Voc at record low (V), adjusted string
Vmp at record high (V), maximum modules per string that keep Voc
below inverter Vmax, minimum modules per string that keep Vmp
above MPPT low, and a "valid" / "invalid" verdict for the user's
entered modules-per-string.

**Math.** Public:

    Voc_cold = Voc_stc * (1 + alpha_Voc * (T_cold - 25)) * N
    Vmp_hot  = Vmp_stc * (1 + alpha_Vmp * (T_hot_cell - 25)) * N

with cell temperature at hot ambient estimated as ambient + 25 C
per NEC 690.7 default assumption.

**Citation.** "Per NEC 2023 Article 690 (Solar PV). 690.7 governs
maximum voltage. Temperature coefficients per module datasheet
(user enters from current datasheet, not bundled). Record low
temperature per ASHRAE 99 percent design temperature; the user
enters from local ASHRAE Fundamentals Climatic Design Data tables.
AHJ governs. Free at nfpa.org/freeaccess for NEC TOC."

**Edge cases.** Site temperature outside (-50 F, +130 F) flagged.
Module Voc above 100 V flagged as commercial-only. Inverter Vmax
below module Voc rejected (no valid string).

**Tests.** Twelve unit tests including a worked example from the
NABCEP PV Installation Professional study guide (Enphase IQ8 or
SolarEdge example).

### A.8 PV interconnection 120% busbar rule

**Inputs.** Main breaker rating (A), panel busbar rating (A),
existing PV breaker (A; 0 if no existing PV), proposed PV breaker
(A), interconnection method (load-side line-tap / load-side breaker
at opposite end / supply-side tap).

**Output.** Sum of breakers (A), busbar limit at the chosen
interconnection method (120 percent of busbar for opposite-end
load-side per NEC 705.12), pass / fail verdict, and a
recommendation if fail (supply-side tap or main-breaker downsize).

**Math.** Public:

    if method == "opposite_end_load_side":
        limit = 1.20 * busbar
    else:
        limit = 1.00 * busbar
    pass = (main + PV_existing + PV_proposed) <= limit

**Citation.** "Per NEC 2023 Article 705 (Interconnected Electric
Power Production Sources). 705.12 governs load-side
interconnection. 'Opposite end of busbar from main' is a code term
of art; the AHJ inspector reads the panel to verify. AHJ governs.
Free at nfpa.org/freeaccess."

**Edge cases.** Main breaker > busbar rating flagged as a separate
pre-existing code violation. PV proposed > 80 percent of main
flagged as needing main-breaker downsize.

**Tests.** Ten unit tests covering each interconnection method
and a worked example from a Solar Energy Industries Association
training deck.

### A.9 Battery bank sizing for off-grid

**Inputs.** Daily load (Wh/day or kWh/day), days of autonomy (1
to 5; default 3 per off-grid PV industry practice), depth-of-
discharge limit (0 to 1.0; default 0.5 for lead-acid, 0.8 for
LFP), system DC voltage (12 / 24 / 48 V), round-trip efficiency
(0.7 to 0.95; default 0.85 lead-acid, 0.95 LFP), temperature
derate factor.

**Output.** Required usable capacity (Wh), required nameplate
capacity accounting for DoD limit and efficiency (Wh), nameplate
in amp-hours at the system DC voltage (Ah), and a parallel /
series configuration suggestion if the user has specified the
battery's per-unit capacity.

**Math.** Public:

    usable_Wh = daily_Wh * days_autonomy
    nameplate_Wh = usable_Wh / (DoD * eta * derate)
    Ah = nameplate_Wh / V_dc

**Citation.** "Per IEEE 1013 (Sizing Lead-Acid Batteries for
Photovoltaic Systems) and IEEE 1561 (PV / Hybrid Power Systems).
Lithium-iron-phosphate (LFP) industry practice uses 80 percent DoD;
flooded lead-acid uses 50 percent. Manufacturer datasheet governs
chemistry-specific derates. Free at standards.ieee.org for IEEE
1013 abstract."

**Edge cases.** Days of autonomy above 5 flagged as cost-driven
edge case. DoD limit outside (0.3, 1.0) flagged. System voltage
not in {12, 24, 48} flagged as non-standard.

**Tests.** Ten unit tests covering lead-acid 12 V and LFP 48 V
off-grid sizing against published Solar Living Sourcebook examples.

### A.10 Conductor ambient-temperature adjustment

**Inputs.** Base conductor size, base temperature column (60 C / 75
C / 90 C), ambient temperature (F or C), number of current-
carrying conductors in the conduit / cable.

**Output.** Adjusted ampacity (A) after ambient correction (per
NEC 310.15(B)(1) factors) and after conductor-fill adjustment (per
NEC 310.15(C)(1)). The combined correction factor is exposed.

**Math.** Public arithmetic. Ambient correction factor table per
NEC 310.15(B)(1) is bundled (the factors are published in the free
NEC TOC excerpts and are de facto standard). Conductor-fill
factors per NEC 310.15(C)(1) are bundled identically.

**Citation.** "Per NEC 2023 §310.15(B)(1) (ambient temperature)
and §310.15(C)(1) (more than three current-carrying conductors).
AHJ governs. Free at nfpa.org/freeaccess."

**Edge cases.** Ambient above 60 C or below -10 C flagged as
outside the bundled correction-factor table. Conductor count above
40 in a single conduit flagged as outside the standard table.

**Tests.** Ten unit tests including #6 THHN copper at 50 C ambient
in a 12-conductor bundle, against NEC 2023 Annex example values.

### A.11 Service load calculation (NEC 220 optional method)

**Inputs.** Dwelling size (ft^2), small-appliance branch-circuit
count (default 2), laundry branch count (default 1), fixed
appliance kW list, range or cooktop kW, dryer kW, water heater
kW, HVAC (heating kW, cooling kW; the larger of the two governs
per 220.82(C)), EV charger A (optional).

**Output.** Optional-method total (VA), optional-method service
demand (A), and a comparison line to the standard method (NEC
220.42). The recommended service size (100, 125, 150, 175, 200,
225, 300, 400 A) per the larger of the two methods.

**Math.** Public arithmetic per NEC 220.82. First 10 kVA at 100
percent; remainder at 40 percent; the HVAC larger value added
at 100 percent.

**Citation.** "Per NEC 2023 §220.82 (optional dwelling load
calculation) and §220.42 (standard method). AHJ governs adopted
edition. Free at nfpa.org/freeaccess."

**Edge cases.** Dwelling size below 500 ft^2 or above 10,000 ft^2
flagged as outside typical optional-method range. Negative kVA
rejected.

**Tests.** Twelve unit tests including a 2400 ft^2 dwelling with
the IAEI study-guide example.

### A.12 Voltage unbalance percent

**Inputs.** Three line-to-line voltage readings (V_AB, V_BC, V_CA).

**Output.** Average voltage, maximum deviation, voltage unbalance
percent per NEMA MG-1 definition, a flag if the result exceeds 1
percent (NEMA threshold for motor derating), and a derating factor
for a polyphase motor at the computed unbalance.

**Math.** Public:

    V_avg = (V_AB + V_BC + V_CA) / 3
    max_dev = max(|V_AB - V_avg|, |V_BC - V_avg|, |V_CA - V_avg|)
    unbalance_pct = (max_dev / V_avg) * 100

The motor derating curve from NEMA MG-1 14.35 is bundled as the
canonical derate table (the curve is a public NEMA reference).

**Citation.** "Per NEMA MG-1 §14.35 (effects of unbalanced
voltages on polyphase motors). The IEC definition (symmetrical
component) differs; this tile uses the NEMA definition, which is
the common US trade convention. Free at nema.org for MG-1 TOC."

**Edge cases.** Any voltage reading below 50 percent of the
average rejected as an obvious measurement error. Average voltage
outside (90, 600) V flagged.

**Tests.** Eight unit tests covering balanced, 1 percent unbalance,
3 percent unbalance, and the published NEMA MG-1 example values.

## 3. Phase E — Carpentry and Construction expansion (Group E)

Ten new tiles. All compute from first principles using public
engineering mechanics and bundled material properties; none
reproduce a paywalled span table.

### E.1 Footing size from soil bearing pressure

**Inputs.** Column load (lb), allowable soil bearing pressure
(psf; user enters from soils report or AHJ presumptive value),
footing shape (square / rectangular / continuous strip),
rectangular aspect ratio (if rectangular), footing depth (in;
default 12).

**Output.** Required footing area (ft^2), footing dimensions
rounded up to the nearest 3 in, footing concrete volume (yd^3),
rebar weight estimate (#4 grid at 12 in OC), and an IRC
R403.1(1)-style presumptive-bearing reference table inline.

**Math.** Public:

    A_required = P / q_allow
    side = sqrt(A_required)  // for square

**Citation.** "Per IRC 2021 §R403 (footings) and ASCE 7 §11
(foundation design). Presumptive soil bearing per IRC Table
R401.4.1 unless a soils report is provided. AHJ governs.
Free at codes.iccsafe.org for IRC TOC."

**Edge cases.** Soil bearing below 1000 psf flagged (uncommon for
residential without engineered foundation). Column load above
50,000 lb flagged as commercial-engineered range.

**Tests.** Ten unit tests including a 15 kip column on 2000 psf
soil and a worked example from the IRC commentary.

### E.2 Drywall takeoff (sheets, screws, mud, tape)

**Inputs.** Wall area (ft^2) and / or ceiling area (ft^2), sheet
size (4x8 / 4x9 / 4x10 / 4x12), waste factor (default 10 percent
for walls, 15 percent for ceilings), screw spacing (12 in OC
field per IRC R702.3 standard).

**Output.** Number of sheets, number of screws (lb estimate), mud
volume (5-gallon buckets for taping plus 5-gallon for finishing),
tape length (ft), corner-bead length if entered. Waste-adjusted
quantities and unadjusted quantities both shown.

**Math.** First-principles arithmetic. Mud volume estimated at
the published USG and National Gypsum coverage rates (gallons per
1000 sq ft).

**Citation.** "Per the USG and National Gypsum published
estimation guides. Screw spacing per IRC 2021 §R702.3.5.
Coverage rates per manufacturer published documentation.
Free at usg.com/literature and nationalgypsum.com."

**Edge cases.** Negative area rejected. Sheet size not in
allowed list rejected. Waste factor outside (0, 30) percent
flagged.

**Tests.** Ten unit tests.

### E.3 Rafter length from pitch and run

**Inputs.** Roof pitch (rise / 12, e.g., 6/12), horizontal run
(ft, in, fraction), overhang (in), ridge board thickness (1.5 in
default), rafter species and grade (for sag check), rafter spacing
(12 / 16 / 19.2 / 24 in OC), live load (psf; 20 default ground
snow per IRC), dead load (psf; 10 default).

**Output.** Rafter line length (ft, in to 1/16), rafter total
length including overhang and ridge cut (ft, in), plumb-cut angle
(degrees), seat-cut depth (in), and a sag-check pass / fail at the
entered span using the v1 lumber-spans engine.

**Math.** Public geometry: hypotenuse from rise and run. Sag check
reuses the v1 lumber-spans simple-span beam calculation.

**Citation.** "Geometry is geometry. Sag-check material properties
per the American Wood Council reference values (the same bundled
constants used by the v1 lumber-spans tile). AWC governs allowable
stress; AHJ governs adopted code. Free at awc.org."

**Edge cases.** Pitch above 24/12 (almost vertical) flagged.
Span above 30 ft flagged as outside typical residential rafter
range. Overhang above 36 in flagged as cantilever-design range.

**Tests.** Ten unit tests including a 6/12 pitch with 12 ft run
verified against a hand calculation to 1/16 in.

### E.4 Concrete slab volume, rebar, and waste

**Inputs.** Slab length (ft, in), slab width (ft, in), slab
thickness (in), rebar grid (#3 at 18 in OC / #4 at 12 in OC /
#5 at 12 in OC / none), waste factor (default 5 percent).

**Output.** Slab volume (yd^3), waste-adjusted concrete order
(yd^3), rebar weight (lb), rebar count by length (linear ft of
each bar size). Optional cost output (v8 D.1) if user enters
$/yd^3.

**Math.** Public arithmetic. Rebar weight per linear ft for #3
through #6 from the published ASTM A615 standard weights
(0.376, 0.668, 1.043, 1.502 lb/ft).

**Citation.** "Volume is L x W x T / 27. Rebar weights per ASTM
A615. Coverage rates per the ACI 318 detailing reference.
Free at concrete.org for ACI 318 TOC."

**Edge cases.** Slab below 2 in or above 12 in thickness flagged
as outside typical residential slab range. Rebar grid above #6
flagged as engineered design.

**Tests.** Ten unit tests including a 20 x 30 x 4 in slab with #4
at 12 in OC.

### E.5 Asphalt tonnage estimator

**Inputs.** Area (ft^2), compacted thickness (in), mix density
(lb/ft^3; default 145 for typical HMA), waste factor (default 5
percent).

**Output.** Volume (yd^3), tonnage (US tons), waste-adjusted
tonnage. Optional cost output if user enters $/ton.

**Math.** Public:

    tons = (area_ft2 * thickness_ft * density_lb_per_ft3) / 2000

**Citation.** "Per the National Asphalt Pavement Association
published density ranges (140 to 150 lb/ft^3 typical for dense-
graded mixes). Free at asphaltpavement.org for NAPA factsheets."

**Edge cases.** Thickness below 1 in flagged as below typical
overlay. Density outside (120, 155) lb/ft^3 flagged.

**Tests.** Eight unit tests.

### E.6 Excavation cubic yards (cut / fill, swell / shrink)

**Inputs.** Length (ft), width (ft), depth (ft) (or grid of
station depths for irregular cuts; up to 9 stations), soil type
(common earth / clay / sand / rock; sets default swell and shrink
percentages), purpose (cut to spoil / cut to re-use as fill).

**Output.** Bank-cubic-yards (BCY), loose-cubic-yards (LCY) for
hauling, compacted-cubic-yards (CCY) for fill, truck loads at
the user-entered truck capacity (default 10 CY).

**Math.** Public:

    BCY = volume_in_place / 27
    LCY = BCY * (1 + swell_factor)
    CCY = BCY * (1 - shrink_factor)

Soil-type defaults per the Caterpillar Performance Handbook
published ranges (the values are de facto standard in earthwork
estimating). User can override.

**Citation.** "Per the Caterpillar Performance Handbook
(published, freely distributed at trade shows; bundled defaults
are typical published mid-range values, not the proprietary
handbook text)."

**Edge cases.** Negative volume rejected. Swell or shrink outside
(0, 60) percent flagged.

**Tests.** Ten unit tests including a 100 x 50 x 6 ft excavation
in common earth with a 25 percent swell.

### E.7 Window / door header sizing (IRC R602.7)

**Inputs.** Header span (ft, in), wall location (interior bearing /
exterior bearing / non-bearing), number of stories supported above
(0, 1, 2), ground snow load (psf), header species and grade.

**Output.** Required header member size (e.g., 2x6, 2x8, 2x10,
2x12, double or triple), jack-stud count per IRC Table
R602.7.5, and the AWC NDS allowable-stress verification.

**Math.** First-principles beam mechanics using the v1
lumber-spans engine: tributary load to header, simple-span
moment and deflection, allowable bending stress from AWC NDS
bundled values. Output cross-checked against IRC Table
R602.7(1) for verification.

**Citation.** "IRC 2021 §R602.7 (headers). AWC NDS reference
design values bundled per v1 lumber-spans citation. Allowable
spans verified against IRC Table R602.7(1) within tolerance;
discrepancies flagged. AHJ governs. Free at codes.iccsafe.org."

**Edge cases.** Header span above 12 ft flagged as engineered-
design range (IRC table top end). Triple-stud requirement
flagged when needed.

**Tests.** Twelve unit tests with verification against IRC table
values for the matrix of common header sizes.

### E.8 Deck post and beam sizing (IRC R507)

**Inputs.** Deck size (ft x ft), beam span (ft), post spacing
(ft), live load (40 psf default per IRC R507), dead load (10 psf
default), species and grade for beam and post, ledger condition
(attached / freestanding).

**Output.** Recommended beam size and ply (e.g., (2) 2x10
SYP #2), post size (4x4 / 6x6), footing size from E.1, and a
ledger-attachment screw schedule per IRC Table R507.2.3.

**Math.** Tributary area to beam = deck width / 2 + cantilever.
Simple-span beam moment and deflection using the v1 engine.
Post compression check using AWC NDS values.

**Citation.** "Per IRC 2021 §R507 (decks). AWC NDS allowable
values bundled. Ledger schedule per IRC Table R507.2.3.
Free at codes.iccsafe.org for IRC TOC; AWC NDS free at awc.org."

**Edge cases.** Deck height above 30 in triggers a guardrail
notice (IRC R312). Beam span above the IRC table max flagged
as engineered design.

**Tests.** Twelve unit tests covering a 12x16 deck, a 16x20 deck,
and an L-shaped deck against IRC table values.

### E.9 Stair stringer geometry and code check

**Inputs.** Total rise (in), total run (in), tread depth (in;
default 10), riser height (in; default 7.5), nosing (in; default
0.75), headroom (in), stair width (in).

**Output.** Tread count, individual riser height (in), individual
tread depth (in), stringer length (in), stringer cut layout
(SVG), code-compliance pass / fail per IRC R311.7 (max 7.75 in
riser, min 10 in tread, max variation 0.375 in, min 36 in width,
min 80 in headroom).

**Math.** Public arithmetic. Stringer length = sqrt(total_rise^2 +
total_run^2). Variation check: max riser - min riser <= 0.375.

**Citation.** "Per IRC 2021 §R311.7 (stairways). AHJ governs.
Free at codes.iccsafe.org."

**Edge cases.** Total rise above 12 ft flagged (requires landing
per R311.7.3). Riser-tread sum outside (17, 18) in flagged as
uncomfortable per the 2R + T rule.

**Tests.** Ten unit tests covering compliant stairs, borderline
risers, and a worked example from a published IRC commentary.

### E.10 Roof sheathing and shingle takeoff

**Inputs.** Roof area (ft^2; computed from E.3 rafter length and
ridge length or entered directly), sheathing thickness (7/16,
15/32, 19/32 in), shingle bundle coverage (33.3 ft^2 per bundle
3-tab default; 28 ft^2 architectural), starter row, ridge / hip
cap.

**Output.** Sheathing sheet count (4x8 sheets), shingle bundle
count, starter linear ft, ridge / hip cap linear ft, nail count
(lb), drip edge linear ft, ice-and-water shield ft^2 (per IRC
R905.1.2 in CDD zones).

**Math.** Public arithmetic. Coverage rates per manufacturer
(GAF, Owens Corning, CertainTeed) published values.

**Citation.** "Per IRC 2021 §R905 (roofing). Coverage rates per
manufacturer published estimation guides. AHJ governs ice-shield
extent (R905.1.2). Free at codes.iccsafe.org."

**Edge cases.** Roof pitch below 2/12 flagged as low-slope (not
shingle-rated per most manufacturers).

**Tests.** Eight unit tests.

## 4. Phase F — Fire-Ground Engineering expansion (Group F)

Five new tiles. Group F notice (SOP and incident-command variant)
on every tile per spec.md §9.

### F.1 Master stream reach distance from nozzle pressure

**Inputs.** Nozzle pressure (psi), tip diameter (in), nozzle
elevation angle (degrees), wind condition (calm / moderate /
strong; sets a reach derate), wind direction (with / against /
crosswind).

**Output.** GPM at the nozzle (NFA formula), horizontal reach
(ft), maximum reach height (ft), reach derate factor applied.

**Math.** GPM = 29.7 * d^2 * sqrt(P) (NFA fireground formula).
Reach approximated from ballistic trajectory with empirical
fireground correction factors per IFSTA Pumping Apparatus
Driver / Operator Handbook.

**Citation.** "GPM per the National Fire Academy fireground
formula (29.7 coefficient for smooth bore). Reach per IFSTA
Pumping Apparatus Driver/Operator Handbook, 4th ed. SOP and
incident-command govern. Free at usfa.fema.gov for NFA
materials."

**Edge cases.** Nozzle pressure above 100 psi for smooth bore
flagged as outside the IFSTA range. Elevation above 70 degrees
flagged.

**Tests.** Ten unit tests including a 1-3/4 in tip at 80 psi
against the IFSTA published reach table.

### F.2 Standpipe pump-pressure calc (NFPA 14)

**Inputs.** Standpipe class (I / II / III), building height
(ft), highest hose-valve elevation above pumper (ft), required
nozzle pressure at the topmost outlet (default 100 psi smooth
bore, 100 psi fog), hose appliance friction loss (psi; default
25 psi for typical standpipe), supply hose length (ft) and
diameter (in).

**Output.** Required pump discharge pressure (psi) to deliver
the required GPM at the topmost outlet at the required nozzle
pressure, accounting for elevation loss (0.434 psi/ft), supply
hose friction (CQ^2L), and appliance loss.

**Math.** Public NFPA 14:

    PDP = NP + FL_supply + FL_appliance + EL
    EL = 0.434 * elevation_ft
    FL = C * Q^2 * L  // per v1 NFA coefficients

**Citation.** "Per NFPA 14-2024 (Standpipes) §7. Pump discharge
calculated per the v1 NFA fireground formula. AHJ and SOP
govern. Free at nfpa.org/freeaccess."

**Edge cases.** Building height above 75 ft flagged as high-rise
(NFPA 14 §7.10 supplemental requirements). Elevation above 600 ft
flagged as outside typical pumper capability.

**Tests.** Ten unit tests including a 12-story building with a
3 in supply at 200 ft.

### F.3 Aerial ladder tip-load vs angle and extension

**Inputs.** Aerial-ladder manufacturer rated tip load at full
extension (lb), maximum extension (ft), current extension (ft),
current elevation angle (degrees), water flow in waterway (GPM;
optional for tower / platform).

**Output.** Allowable tip load (lb) at the current extension and
angle per the manufacturer's published derate curve (bundled
defaults for typical Pierce / E-One / KME aerials, with user
override), water-loaded reduction factor if waterway is flowing,
and a flag if the user's intended load exceeds 90 percent of the
allowable.

**Math.** The derate curves are bundled as piecewise-linear
defaults from the published manufacturer apparatus operating
guides; the user can override per their specific apparatus.

**Citation.** "Per NFPA 1901 (Apparatus) and the manufacturer's
published Aerial Operating Guide. Defaults are typical published
values; the apparatus-specific load chart governs operations.
SOP and incident-command govern. Free at nfpa.org/freeaccess for
NFPA 1901 TOC."

**Edge cases.** Angle below 30 degrees flagged as low-angle
(reduced capacity). Extension above 90 percent of rated flagged.

**Tests.** Eight unit tests against published Pierce 105 ft
aerial load chart points.

### F.4 Foam application rate and concentrate volume (NFPA 11)

**Inputs.** Fuel type (hydrocarbon / polar solvent), fire area
(ft^2), application method (Type II / Type III / fixed monitor /
sprinkler), application duration (min; default per NFPA 11),
foam concentrate proportioning rate (1, 3, or 6 percent).

**Output.** Foam solution application rate (GPM/ft^2),
total solution volume (gal), foam concentrate volume (gal), and
recommended water supply rate (GPM) for the duration.

**Math.** NFPA 11 published application rates per fuel type and
method (0.10 GPM/ft^2 for hydrocarbon Type II, etc.) bundled as
public reference values.

**Citation.** "Per NFPA 11-2024 (Low-, Medium-, and High-
Expansion Foam) §5.2 (application rates). AHJ and SOP govern.
Free at nfpa.org/freeaccess for NFPA 11 TOC."

**Edge cases.** Polar solvent on a 1 percent AR-AFFF concentrate
flagged as incompatible. Application rate below NFPA 11 minimum
rejected.

**Tests.** Eight unit tests including a 5000 ft^2 hydrocarbon
spill at 0.10 GPM/ft^2 for 65 min.

### F.5 Smoke ejector / negative-pressure ventilation CFM

**Inputs.** Room volume (ft^3), target air changes per hour (ACH;
default 5 for PPV after fire), ejector fan CFM rating, exhaust
opening size (ft^2), entry opening size (ft^2).

**Output.** Required CFM for target ACH, number of fans needed,
exhaust-to-entry opening ratio (PPV best practice is 1:1 to 1.5:1),
estimated time to one full air change (min).

**Math.** Public:

    CFM_required = volume * ACH / 60
    fans = ceil(CFM_required / fan_CFM)
    time_to_one_change_min = volume / CFM_actual

**Citation.** "Per NFPA 1500 §8.5 (apparatus and equipment) and
the IFSTA Essentials of Fire Fighting chapter on ventilation.
SOP and incident-command govern. Free at usfa.fema.gov."

**Edge cases.** Room volume above 100,000 ft^3 flagged as
commercial range needing multiple ejectors. Opening ratio
outside (0.5, 2.0) flagged as inefficient PPV.

**Tests.** Eight unit tests.

## 5. Phase G — Cross-Trade Utilities expansion (Group G)

Eight new tiles.

### G.1 Pump total dynamic head (TDH)

**Inputs.** Static suction lift or head (ft; negative if flooded
suction), static discharge head (ft), suction pipe length (ft),
discharge pipe length (ft), pipe size and material (for friction
loss), flow rate (GPM), fittings count by type (using v1
fittings equivalent-length table).

**Output.** Total dynamic head (ft), broken into static lift,
static discharge, suction friction, discharge friction, and
fittings equivalent-length friction. Pump operating-point
coordinate (GPM, TDH) to overlay on a manufacturer pump curve.

**Math.** Hazen-Williams friction loss (v1 engine), arithmetic
for static head, fittings via equivalent-length per Crane TP-410.

**Citation.** "Hazen-Williams per Crane Technical Paper No. 410
(public engineering reference). Fittings equivalent-length per
the same. Manufacturer pump curve governs operating point.
Free at flowoffluids.com for Crane TP-410 excerpts."

**Edge cases.** Suction lift above 25 ft flagged (cavitation
risk; cross-references G.2 NPSHa). Flow above pipe-velocity
recommendation flagged.

**Tests.** Ten unit tests including a worked example from
Goulds / Xylem pump sizing manual.

### G.2 NPSHa available net positive suction head

**Inputs.** Atmospheric pressure (psi; defaults from altitude),
fluid vapor pressure (psi; defaults by fluid and temperature),
fluid specific gravity (default 1.0 water), suction static head
(ft; positive if flooded, negative if lift), suction friction
loss (ft; output of G.1 or user-entered).

**Output.** Net positive suction head available (ft), comparison
against a user-entered NPSHr (required) from the pump curve, and
a safety-margin verdict (3 ft margin is the industry rule of
thumb).

**Math.** Public:

    NPSHa = (P_atm - P_vapor) * 2.31 / SG + h_static - h_friction

**Citation.** "Per the Hydraulic Institute pump standards (ANSI/
HI 1.3, 2.3). Vapor pressure values per ASHRAE Fundamentals 2021
Chapter 1. Free at pumps.org for HI standards bibliographic
data."

**Edge cases.** NPSHa - NPSHr below 1 ft flagged as imminent
cavitation. Fluid temperature above water boiling point at
suction conditions rejected.

**Tests.** Ten unit tests.

### G.3 Hydraulic cylinder force and speed

**Inputs.** Bore diameter (in), rod diameter (in), system pressure
(psi), pump flow (GPM), direction (extend / retract).

**Output.** Cylinder force (lb), extension or retraction speed
(in/sec), volume of oil per stroke (gal), cycle time for the
entered stroke length.

**Math.** Public:

    A_extend = pi * (D/2)^2
    A_retract = A_extend - pi * (d/2)^2
    F = P * A
    v = (GPM * 231) / (60 * A)  // 231 in^3/gal

**Citation.** "First-principles fluid power. Per NFPA T2.13.7
hydraulic cylinder definitions. AHJ and machine-design governs.
Free at nfpa.com for NFPA fluid-power TOC."

**Edge cases.** System pressure above 5000 psi flagged as outside
typical industrial range. Bore below 0.5 in flagged as miniature.

**Tests.** Ten unit tests.

### G.4 V-belt sheave and drive sizing

**Inputs.** Driver RPM, driven RPM, driver shaft power (HP),
center distance (in; estimated), belt cross-section (A / B / C
/ D / 3V / 5V / 8V).

**Output.** Required pitch diameters for driver and driven
sheaves at the entered ratio, belt length (in), service-factor-
adjusted design HP (1.0 to 1.8 typical), recommended number of
belts per the manufacturer power-per-belt table (bundled defaults
from Gates / Goodyear published catalogs).

**Math.** Public:

    ratio = RPM_in / RPM_out = D_out / D_in
    L = 2 * C + (pi/2)(D1 + D2) + (D2 - D1)^2 / (4 * C)

**Citation.** "Per ANSI/RMA IP-20 (Classical V-belts) and ANSI/
RMA IP-22 (Narrow V-belts). Power per belt per Gates Industrial
Drive Design Manual (published, public). Manufacturer service-
factor table governs final selection. Free at gates.com/literature."

**Edge cases.** Ratio above 7:1 flagged as outside single-belt
range. Center distance below D_large flagged as too close.

**Tests.** Ten unit tests including a 1750 RPM, 5 HP motor
driving a 875 RPM blower against the Gates manual example.

### G.5 Pulley / block-and-tackle mechanical advantage

**Inputs.** System type (fixed / movable / block-and-tackle),
number of supporting rope falls (1 to 8), load (lb), efficiency
per sheave (default 0.95).

**Output.** Mechanical advantage (theoretical and accounting for
friction), required input force (lb), required rope length
(input distance) for a given lift height, and a rope working-load
check against a user-entered rope WLL.

**Math.** Public:

    MA_theoretical = N_falls
    MA_actual = (1 - eta^N) / (1 - eta) / N  // not quite; use sum
    F_required = Load / MA_actual

**Citation.** "Per the Cordage Institute and the ANSI/ASSP Z359
fall-protection standards (for the WLL check). Cordage Institute
references published at ropecord.com."

**Edge cases.** WLL exceeded flagged as a stop-work condition.

**Tests.** Eight unit tests covering single-fixed through
six-fall block-and-tackle.

### G.6 Bolt torque to clamp load (K factor method)

**Inputs.** Bolt diameter (in or M-series), bolt grade (SAE
J429 grade 2 / 5 / 8 or ISO 8.8 / 10.9 / 12.9), thread type
(coarse / fine), lubrication (dry / oiled / anti-seize; sets K),
target clamp load (lb) or target torque (ft-lb).

**Output.** Required torque for the target clamp load (or clamp
load for the entered torque), proof load comparison (clamp load
should be 75 percent of proof load for permanent joints), and
the K factor used (0.20 dry / 0.15 lubricated / 0.10 anti-seize
default).

**Math.** Public:

    T = K * D * F_clamp

**Citation.** "Per the Industrial Fasteners Institute Bolted
Joint Design Manual and SAE J429 (inch) / ISO 898-1 (metric).
K factor is empirical and varies; the bundled defaults are
typical published values, not a guarantee. Free at indfast.org."

**Edge cases.** Clamp load above proof load rejected. K factor
override outside (0.05, 0.40) flagged.

**Tests.** Ten unit tests including 1/2-13 grade 5 dry and oiled
against the IFI published torque chart.

### G.7 Beam deflection multi-load combiner

**Inputs.** Beam span (ft), beam properties (E in psi, I in
in^4; or user picks a steel W or wood section from a bundled
list), end conditions (simply supported / fixed-fixed / cantilever
/ propped), up to 5 point loads (each: location ft, magnitude lb)
and up to 3 distributed loads (each: start ft, end ft, load
plf), allowable deflection ratio (L/240, L/360, L/480).

**Output.** Maximum deflection (in), location of max deflection
(ft), pass / fail vs the entered limit, and a sketch (SVG,
accessible) of the deflected shape.

**Math.** Superposition of public closed-form deflection cases
from AISC Steel Construction Manual Part 3 (the formulas are
public textbook beam mechanics; the AISC manual republishes them
in a convenient form). For non-classical cases (overhang, mixed
end conditions), a simple finite-element 100-element solver runs
in the v1 Web Worker pool.

**Citation.** "First-principles beam mechanics. Closed-form
cases per any mechanics-of-materials textbook (Hibbeler, Beer,
Gere). AISC Steel Construction Manual 16th ed. for steel I and
S values bundled by section. AWC NDS for wood. AHJ governs.
Free at aisc.org for steel TOC."

**Edge cases.** Combined load resulting in stress above allowable
flagged separately (deflection-only tile, but bending check is
included as a courtesy). Span below 1 ft rejected.

**Tests.** Twelve unit tests covering each end condition with a
worked example from a public mechanics textbook.

### G.8 Gear ratio and RPM cascade

**Inputs.** Up to 4 gear stages, each with input and output tooth
counts. Input RPM and input torque (optional).

**Output.** Per-stage ratio, overall ratio, output RPM, output
torque (if input torque entered, with a per-stage efficiency
default of 0.97 for spur gears).

**Math.** Public:

    ratio = N_out / N_in
    RPM_out = RPM_in / overall_ratio
    T_out = T_in * overall_ratio * efficiency^stages

**Citation.** "First-principles gear math. Per AGMA 2000 (gear
classification) for tolerance, but the ratio math is independent
of standard. Free at agma.org for AGMA standards TOC."

**Edge cases.** Tooth count below 8 flagged as undercut risk.
Ratio above 100:1 in a single stage flagged as outside spur-
gear range.

**Tests.** Eight unit tests.

## 6. Phase H — Cross-cutting and platform changes

v15 introduces no new groups, no new platform affordances, and no
new storage keys. It does require:

### H.1 Manifest entries

35 new entries in `tile-meta.js`, each with:

- `id`: kebab-case slug (e.g., `voltage-drop-3ph`, `footing-bearing`).
- `group`: existing group letter.
- `editions`: array of {publisher, edition, section, asOf, source_url}
  per spec-v6.
- `tolerance`: numeric tolerance per spec-v10 §C.3.
- `worked_example`: per spec-v10 §C.1.
- `reviewer_signoff`: empty string until spec-v14 §15 entry recorded.

### H.2 Calc modules

No new calc-*.js modules. The 35 new tiles distribute among existing
modules:

- A.1 through A.12 -> `calc-electrical.js`
- E.1 through E.10 -> `calc-construction.js`
- F.1 through F.5 -> `calc-fire.js`
- G.1 through G.8 -> `calc-cross.js`

Each module's file-size growth must stay under the spec-v10 §H.1
per-tile gzipped-size cap. If a tile crosses the cap, split the
module per the existing v5-platform.js precedent (split, not bloat).

### H.3 Tests

Every new tile lands with at least the unit-test count stated in
its **Tests** section. The v14 dimensional-analysis lint and bounds
fuzzer apply to all new tiles before the tile renders in production.

### H.4 Search aliases

Each new tile contributes at least three aliases per spec-v10 §D.1
(e.g., voltage-drop-3ph: "three phase voltage drop", "vd 480",
"3p vd with reactance"). The alias index is rebuilt on every
deploy.

### H.5 Print parity, CSV parity, accessibility parity

Per spec-v10 §E, every new tile must pass the print, CSV-export,
and a11y (axe-core) parity audits before landing.

### H.6 Per-group reviewer signoff

Per spec-v14 §15, each group's expansion (A, E, F, G) gets a
single reviewer signoff entered into [../docs/audit-trail.md](../docs/audit-trail.md)
before the v15 release. Reviewer-of-record for v15:

- Group A: a US-licensed PE electrical (sought via solicitation).
- Group E: a US-licensed PE structural (sought).
- Group F: an active US fire-service company officer with
  pumping-apparatus operator certification (sought).
- Group G: a US-licensed PE mechanical (sought).

Open signoffs do not block v15 from landing in main; they block
the v15 release from being announced as "audited" per the v14
audit-trail convention.

## 7. Out of scope for v15

- Allied-profession expansion (Groups U / V / W / X / Y deepening):
  v17.
- Mechanical / plumbing / HVAC / restoration / water deepening:
  v16.
- New groups or new groups letters: not in any of v15 / v16 / v17.
- Server-side anything, accounts, telemetry, AI: still no.

## 8. Closing note

35 tiles in v15. 30 in v16. 35 in v17. 100 in total, landing the
catalog at 485 tiles. Each is a number a trade professional needs
once a week. Each is an independent published worked example, a
citation, a tolerance, and a reviewer signoff away from
production. None changes the site's posture: client-side static
bundle, no telemetry, no AI, no accounts, no fee. v15 closes the
trade-core gaps the first 14 specs left open and clears the runway
for the v16 mechanical deepening and the v17 allied-profession
deepening that follow.

The site was always going to grow. It will only ever grow methodically:
one tile, one derivation, one cross-check, one tolerance, one signoff,
in that order. v15 honors that pattern for 35 tiles. The next two
specs honor it for 65 more.
