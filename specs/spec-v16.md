# roughlogic.com Specification v16 — Mechanical, Plumbing, HVAC, and Water Deep-Dive, Part II of III

> **Implementation status (drafted 2026-05-19; Phase B opened
> 2026-06-02; Phase C first-principles batch landed 2026-06-02; Phase M
> (water/wastewater) first-principles batch landed 2026-06-03; Phase C
> second first-principles batch landed 2026-06-04, in
> progress).** v16 is the second of three sibling
> specs (v15, v16, v17) that together add 100 new tiles to the
> catalog (385 -> 485). v16 handles the mechanical deepening: 30 new
> tiles across Group B (Plumbing and Gas), Group C (HVAC), Group D
> (Water Damage and Mold Restoration), and Group N (Water /
> Wastewater). No new groups. No new third-party dependencies, no
> new licenses, no new storage keys, no telemetry, no AI. Every
> constraint from spec.md through spec-v15.md continues unchanged.
> Package version stamps at 0.16.0 at the **close** of v16; until
> then it stays 0.15.0 (v16 is open, not closed).
>
> **Landed so far (2026-06-02): the first Group B batch — B.1
> water-heater recovery rate (`water-heater-recovery`), B.2 potable
> thermal-expansion-tank sizing (`wh-expansion-tank`), B.5
> sanitary-drain DFU sizing (`sanitary-dfu`), and B.6 trap-primer
> sizing (`trap-primer`).** The catalog now stands at 404 tiles.
> Each shipped with full v14 discipline: dimensional annotation,
> bounds-fuzzer test, worked-example fixture cross-checked against
> the cited reference (DOE 10 CFR 430 / AHRI 1300, the ASPE Plumbing
> Engineering Design Handbook + ASME B40.1 steam tables, and IPC
> 2021 Tables 709.1 / 710.1), a citations.js entry, tile-meta +
> related-tiles + search aliases, and a prerendered shell. The
> §Z.4 reviewer signoffs remain open and gate the "audited"
> announcement, not the landing.
>
> **Landed next (2026-06-02): the first Group C batch — C.3 chiller
> tonnage from delta-T and GPM (`chiller-tons`), C.5 heat-exchanger
> LMTD and effectiveness-NTU (`hx-lmtd-ntu`), and C.9 air changes per
> hour (`air-changes-hour`).** These are the pure first-principles
> HVAC tiles that bundle no new reference dataset; they ship with the
> same full v14 discipline (dimensional annotation, bounds-fuzzer
> test, worked-example fixture cross-checked against the cited
> reference — ASHRAE Fundamentals 2021 Ch. 31, the TEMA standards /
> Incropera, and ASHRAE 62.1 / 170 — a citations.js entry, tile-meta +
> related-tiles + search aliases, and a prerendered shell). **The
> catalog now stands at 407 tiles.**
>
> **Deferred within Group C, with reasons (audit findings, not silent
> skips):** C.1 duct-fitting equivalent-length is substantially
> covered by the existing `equivalent-length` tile (spec-v2), which
> already sums equivalent feet from fitting type and diameter counts
> and feeds the duct-sizing friction loss; C.1 would extend that
> tile's fitting library rather than ship a duplicate. C.4
> cooling-tower range/approach is substantially covered by the
> existing `cooling-tower` tile (spec-v7), which already reports
> range, approach, heat rejection, and fan kW/ton against the typical
> 5-10 F approach / 8-12 F range bands; the only net-new output C.4
> proposed — the efficiency ratio range/(range+approach) — is a minor
> extension of that tile, not a new one. C.2 (refrigerant line-set
> sizing), C.6 (boiler distribution pipe sizing), C.7 (filter
> pressure-drop schedule), C.8 (compressor short-cycle protection),
> and C.10 (humidifier capacity) remain drafted for a later v16 batch.
>
> **Landed next (2026-06-03): the first Group M (water/wastewater)
> batch — N.1 pool turnover rate and chlorine demand
> (`pool-turnover`), N.3 well drawdown and specific capacity
> (`well-drawdown`), N.4 cooling water makeup from cycles of
> concentration (`cooling-water-makeup`), and N.5 chlorine residual
> decay (`chlorine-decay`).** These are the pure first-principles
> small-system-operator tiles that bundle no new reference dataset;
> they register under the live catalog's Group **M** (per the
> group-letter note below) and ship with the full v14 discipline
> (dimensional annotation, bounds-fuzzer test, worked-example fixture
> cross-checked against the cited reference — the NSPF CPO Handbook,
> AWWA A100 / USGS OFR 02-197, CTI / ASHRAE, and EPA 815-R-02-020 /
> AWWA M14 — a citations.js entry, tile-meta + related-tiles + search
> aliases, and a prerendered shell). **The catalog now stands at 411
> tiles.**
>
> **Landed next (2026-06-04): the second Group C batch — the remaining
> pure first-principles HVAC tiles that bundle no new reference dataset:
> C.6 hot-water boiler distribution pipe sizing
> (`boiler-pipe-sizing`), C.8 compressor short-cycle protection
> (`compressor-short-cycle`), and C.10 humidifier capacity
> (`humidifier-capacity`).** C.6 derives the hydronic GPM from the
> Q = GPM x 500 x delta-T energy balance, picks the smallest standard
> copper Type L / steel Sch 40 / PEX size at or below the material
> velocity ceiling (v = GPM / (2.448 x d^2)), and reports Hazen-Williams
> head loss and pump head; **audit refinement noted, not a silent
> skip:** the §C.6 draft's "1.25 in copper" worked example sizes to
> **1-1/2 in** under the spec's own stated 4 ft/s copper ceiling (the
> 1.265 in ID runs 5.11 ft/s at 20 GPM), so the implementation follows
> the velocity-limited method and the 1-1/2 in result. C.8 applies the
> ASHRAE/AHRI part-load cycling parabola (N = N_max x 4X(1-X), peaking
> at 50% load) to flag the classic oversized-single-stage short-cycle.
> C.10 reuses the v9 psychrometric helpers to convert the entering-to-
> target RH rise into lb/hr, gal/day, and latent BTU/hr, altitude-
> corrected. Each ships with the full v14 discipline (dimensional
> annotation, bounds-fuzzer rows, worked-example fixtures cross-checked
> against ASHRAE Systems and Equipment 2020 Ch. 13 + Hazen-Williams,
> the Copeland AE Bulletin 17-1226 cycling model, and ASHRAE
> Fundamentals 2021 Ch. 1 — a citations.js entry, tile-meta +
> related-tiles + search aliases, and a prerendered shell). **The
> catalog now stands at 414 tiles.** This closes the Group C
> first-principles set; the only remaining v16 HVAC tiles (C.2
> refrigerant line-set, C.7 filter pressure-drop) each bundle a new
> reference dataset and land as their own reviewed change per
> spec-v12 §H.
>
> **Deferred within Groups D and M, with reasons (audit findings, not
> silent skips):** the entire Group D restoration set is substantially
> covered by tiles that already shipped — D.1 air-mover quantity by
> the existing `air-movers` tile, D.2 dehumidifier GPP load by
> `dehumidifier`, D.3 HEPA-scrubber containment ACH by `nam-sizing`
> and `containment-air-balance`, and D.4 drying-time estimation by
> `drying-times`; only D.5 (equipment power draw vs available circuit
> capacity, an NEC 210.20 continuous-load check) is genuinely new and
> is held for a later batch. Within Group M, N.2 backwash flow and
> N.7 filter media depth/loading rate are partly covered by the
> existing `filter-loading` tile; N.6 domestic water-service WSFU
> sizing remains drafted (it bundles the public-domain Hunter's-curve
> WSFU-to-GPM table, which lands as its own reviewed change).
>
> **Deferred within Group B, with reasons (audit findings, not
> silent skips):** B.3 domestic recirculation heat-loss is
> substantially covered by the existing `recirc-loop-sizing` tile
> (spec-v9 §B.4), which already derives per-foot loss, total loss,
> required recirc GPM, and pump size from the same ASPE Ch. 6
> method; B.3 will extend that tile's annual-cost output rather than
> ship a duplicate. B.4 storm-drain sizing, B.7 LP-gas vaporization,
> and B.8 cross-connection backflow sizing are held for a later v16
> batch because each requires bundling a new reference dataset (the
> IPC Appendix B state-keyed rainfall shard, the NPGA vaporization
> curve, and the USC FCCCHR approved-assembly head-loss curves,
> respectively) — data work that lands as its own reviewed change
> per spec-v12 §H rather than riding in with the first-principles
> tiles. Groups C, D, and N remain drafted, not yet landed.
>
> **Group-letter note (issue identified during the 2026-06-02
> audit):** §5 below labels the Water / Wastewater group "Group N,"
> but the live catalog uses **Group M** for water/wastewater
> operators (calc-water.js; the SVI, CT-value, pounds-formula, and
> filter-loading tiles) and Group N for the stage / AV trade. The
> v16 N.x tiles, when they land, will register under the actual
> Group M to match the codebase; the spec's "N" labels in §5 are a
> drafting carryover and should be read as "the water/wastewater
> group (M)."

> Foreword, in the voice of a maintainer who has lived in two
> mechanical rooms in two months — one a furnace closet in a
> 1947 Cape Cod where the chimney liner was three sizes too big
> and the draft was inducing the water heater to backdraft, and
> the other the basement of a strip mall pizza place where the
> 5-ton rooftop unit was short-cycling because nobody had
> calculated that the makeup-air unit was the wrong size for the
> Type I hood it was paired with. Two visits. Three calculators
> needed in the field that the site did not have on day one. v16
> is the spec that says: those calculators are now table stakes,
> we are putting them on the site, and we are putting them on
> next to the rest of the mechanical math so the journeyman who
> shows up after me has the numbers in one place.
>
> The math is not new. The chimney draft equation has been in
> the ASHRAE Handbook since the 1970s. The expansion-tank sizing
> nomograph is on the wall of every plumbing-supply house in the
> country. The Lake Tahoe pool turnover-rate formula was in a
> 1962 Department of Public Health bulletin. The site's
> contribution is putting them in front of the right
> professional, with a citation that names the publisher and
> edition and date, with a "what this is not" banner, with a
> tolerance the calculator promises to hit, and with the
> reviewer signoff that says a licensed engineer or a
> credentialed inspector read the implementation and shipped
> their name with it.
>
> Build it the way the rest was built. One tile, one
> derivation, one cross-check, one tolerance, one signoff. The
> water-damage tech rebuilding a basement at 11 PM on a Tuesday
> deserves the same calm reference the cardiologist gets from
> MDCalc. v16 hands them 30 of those references.

This document is the v16 spec. It inherits everything from
spec.md, spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md,
spec-v6.md, spec-v7.md, spec-v8.md, spec-v9.md, spec-v10.md,
spec-v11.md, spec-v12.md, spec-v13.md, spec-v14.md, and
spec-v15.md. Every prior constraint remains in force.

Repository: github.com/clay-good/roughlogic.com

US standards only.

## 1. Inheritance and conventions

- Per-tile structure (Inputs / Output / Math / Citation / Edge
  cases / Tests) per the v9 / v12 / v15 pattern.
- v14 dimensional-analysis lint, bounds-and-edge-case fuzzer,
  worked-example registry, and reviewer-signoff requirements
  apply to every new tile.
- No new external data file beyond what is already in `data/`.
  Where a calculation depends on a manufacturer or table value
  the user is expected to have on hand (refrigerant superheat,
  expansion-tank acceptance volume, pool design flow), the tile
  prompts; it does not bundle paywalled tables.
- Tile IDs within this spec are letter.number scoped to v16: B.1
  through B.8 are the eight new plumbing-and-gas tiles added in
  v16, numbered fresh within this spec.

## 2. Phase B — Plumbing and Gas expansion (Group B)

Eight new tiles.

### B.1 Water heater recovery rate (gph at delta-T)

**Inputs.** Heater type (electric / gas), input rating (kW for
electric, BTU/hr for gas), recovery efficiency (default 0.98
electric, 0.80 atmospheric gas, 0.94 condensing gas), incoming
water temperature (F), set-point temperature (F).

**Output.** Recovery rate (gph), gallons available in the first
hour for the user's tank size (recovery + 70 percent of stored
volume per DOE first-hour-rating convention), and the AHRI
first-hour-rating estimate.

**Math.** Public:

    delta_T_F = T_setpoint - T_incoming
    Q_useful_BTU_per_hr = input_BTU_per_hr * efficiency
    gph = Q_useful / (8.33 * delta_T_F)
    // 8.33 BTU/lb-F * 1 gal water = ~8.33 BTU/gal-F

For electric: Q = kW * 3412.

**Citation.** "Per the DOE 10 CFR 430 water-heater efficiency
test procedure and AHRI 1300 (residential water heaters). 8.33
BTU per gallon per degree F is first-principles water properties.
Free at energy.gov/eere for DOE TPs and ahri.org for AHRI TOC."

**Edge cases.** delta_T below 20 F or above 130 F flagged as
outside typical residential range. Efficiency outside (0.50,
1.05) flagged.

**Tests.** Ten unit tests covering a 40 kBTU/hr atmospheric
gas, a 50 gallon 4500 W electric, and a published AHRI
certified example.

### B.2 Thermal expansion tank sizing

**Inputs.** Water heater capacity (gal), incoming pressure (psi),
relief setting (psi; default 150 psi), incoming water temperature
(F), setpoint temperature (F), expansion tank acceptance factor
(user enters from manufacturer; default 0.46 for diaphragm types).

**Output.** Expansion volume (gal), required tank volume (gal),
recommended bundled-size tank (2, 4.4, 8.5, 14, 20 gal standard
sizes), pre-charge pressure recommendation (psi; equal to incoming
pressure).

**Math.** Public:

    expansion_factor = (rho_cold - rho_hot) / rho_hot
    V_expansion = water_heater_vol * expansion_factor
    V_tank = V_expansion / acceptance_factor

Water density at temperature from bundled steam-table values
(ASME B40.1 reference). Expansion factor at typical 50 F to 140 F
is approximately 2.3 percent.

**Citation.** "Per the Plumbing Engineering Design Handbook
(ASPE, 2nd ed.) Chapter 6 and ASME B40.1 steam tables. AHJ
governs. Free at aspe.org for table-of-contents excerpts."

**Edge cases.** Pressure above 80 psi flagged as needing pressure
regulator (IPC 604). delta_T above 100 F flagged.

**Tests.** Ten unit tests including a 40 gal heater at 60 psi
incoming, 50 F to 120 F, against the Amtrol XT sizing table.

### B.3 Domestic recirculation heat-loss

**Inputs.** Pipe size (in), insulation R-value (default per IECC
C403), pipe length (ft), recirculation flow (GPM), supply water
temperature (F), ambient air temperature (F), pump runtime
(continuous / scheduled).

**Output.** Heat loss per linear ft (BTU/hr-ft), total loss
(BTU/hr), required reheating capacity (BTU/hr) and pump
recirculation flow to keep return loop above 105 F, annual
energy cost at user-entered fuel cost ($/therm or $/kWh).

**Math.** Public thermal-resistance network:

    R_total = R_pipe + R_insulation + R_air_film
    Q_per_ft = (T_water - T_ambient) / R_total

Pipe and air-film R-values from ASHRAE Fundamentals 2021 Chapter
4 (heat transfer). The energy cost includes the v8 D.1 optional
cost output.

**Citation.** "Per ASHRAE Fundamentals 2021 Chapter 4 (heat
transfer) and IECC 2021 §C403.5 (service hot water pipe insulation).
AHJ governs minimum insulation R-value. Free at ashrae.org for
TOC."

**Edge cases.** Pipe size above 4 in flagged as commercial
range. Insulation R below the IECC minimum flagged.

**Tests.** Eight unit tests.

### B.4 Storm drain sizing

**Inputs.** Roof area (ft^2) projected horizontal, location ZIP
code (used to look up the IPC Appendix B rainfall rate; user
confirms or overrides), design storm rainfall (in/hr; 100-yr,
60-min default per IPC), drain type (roof drain, gutter,
downspout, scupper).

**Output.** Required drain area (in^2), recommended drain size
(2, 3, 4, 6, 8 in), gutter size (5, 6, 7, 8 in K-style), and
downspout size (2x3, 3x4, 4x5 in).

**Math.** Per IPC 2021 Table 1106.6 (roof drains) and Table
1106.6(2) (gutters), which are sized from public-domain rational-
method formulas tied to local rainfall intensity. The local
rainfall intensity is the only paywalled-looking input; the IPC
Appendix B chart is published in the free IPC TOC excerpts and
is bundled as a state-keyed shard per spec-v12 §H.

**Citation.** "Per IPC 2021 §1106 (storm drainage). Rainfall
rates per IPC Appendix B (state-keyed). AHJ governs design
storm. Free at codes.iccsafe.org for IPC TOC."

**Edge cases.** Rainfall above 6 in/hr flagged as outside
continental US typical range (subtropical / hurricane zones).
Roof area above 100,000 ft^2 flagged as commercial-engineered.

**Tests.** Ten unit tests covering a Phoenix 1.5 in/hr roof, a
Miami 4 in/hr roof, and a Seattle 1.0 in/hr roof.

### B.5 Sanitary stack DFU sizing

**Inputs.** List of fixtures by type (per IPC 709.1 DFU values
bundled), drainage configuration (horizontal branch / vertical
stack / building drain), pipe slope (1/8 / 1/4 / 1/2 in per ft).

**Output.** Total DFU load, minimum pipe size per IPC 710.1 (for
horizontal) or 710.1(2) (for stacks), slope-adjusted capacity,
and a flag if the user's pipe size is undersized.

**Math.** Sum DFUs; look up in bundled IPC Table 710.1 (the
table is public IPC TOC content). For stacks: also check the
maximum DFUs per branch interval per IPC 710.1(2).

**Citation.** "Per IPC 2021 §710 (drainage system sizing).
DFU values per IPC Table 709.1. AHJ governs adopted code. Free
at codes.iccsafe.org."

**Edge cases.** DFU count above 1400 flagged as commercial-
engineered. Slope below 1/8 in/ft for pipe 4 in or smaller
flagged as outside IPC minimum.

**Tests.** Ten unit tests including a single-bath residential
branch and a 24-fixture commercial stack.

### B.6 Trap primer sizing

**Inputs.** Floor-drain count, building zone (occupied / mech
room / parking), prime method (manual / electronic / pressure-
drop / pump-discharge), primer manufacturer flow rate (gpm or
mL/cycle).

**Output.** Recommended primer count and zoning, water consumption
estimate (gal/yr), and an IPC 1002.4 compliance check (every
floor drain in occupied space requires a primer).

**Math.** Arithmetic per published Precision Plumbing Products /
Sioux Chief / Mifab primer flow rates.

**Citation.** "Per IPC 2021 §1002.4 (trap seals). Manufacturer
flow rates per published cut sheets. AHJ governs. Free at
codes.iccsafe.org for IPC TOC."

**Edge cases.** Manual prime in unoccupied space flagged as
likely insufficient (the IPC 2021 §1002.4 exception allows it
only in mechanical spaces with documented seasonal prime
procedures).

**Tests.** Eight unit tests.

### B.7 LP gas vaporization rate from cylinder

**Inputs.** Cylinder size (20 / 30 / 40 / 100 / 420 / 1000 lb
nominal; or user enters propane gallons), ambient temperature
(F), wind condition (calm / breezy), liquid-fill level (percent).

**Output.** Maximum continuous vaporization rate (BTU/hr), peak
draw allowed before icing (BTU/hr), and a flag if the user's
appliance load exceeds either threshold (manifold tanks needed).

**Math.** Vaporization rate at given temperature and wetted-
surface area, per the LP-Gas Engineering Handbook (NPGA)
published curve. The bundled defaults are NPGA published values
(common to every supplier in the industry).

**Citation.** "Per the NFPA 58 (Liquefied Petroleum Gas Code)
2024 Annex F and the NPGA LP-Gas Engineering Handbook (8th
ed.). Free at nfpa.org/freeaccess for NFPA 58 TOC."

**Edge cases.** Temperature below -20 F flagged (vaporization
essentially zero on small cylinders). Fill above 80 percent
rejected (LP cylinders fill to 80 percent).

**Tests.** Eight unit tests covering a 100 lb cylinder at 20 F,
40 F, and 60 F against the NPGA curve.

### B.8 Cross-connection backflow assembly sizing screen

**Inputs.** Service size (in), service flow demand (GPM),
backflow hazard category (low / high per IPC 312), assembly type
(DC / DCDA / RP / RPDA / PVB), upstream pressure (psi).

**Output.** Recommended assembly size (1, 1.25, 1.5, 2, 3, 4, 6,
8, 10 in), assembly head loss at design flow (psi), pressure
remaining downstream, and an AWWA M14-style compliance check
notes block (annual test by certified tester required per
EPA 40 CFR 141.85).

**Math.** Assembly head-loss curves bundled from USC FCCCHR
(Foundation for Cross-Connection Control and Hydraulic Research)
approved-assemblies list. Sizing logic per published USC FCCCHR
guidance.

**Citation.** "Per AWWA M14 (Recommended Practice for
Backflow Prevention and Cross-Connection Control) and USC FCCCHR
approved-assemblies list. EPA 40 CFR 141.85 governs annual
testing. AHJ governs. Free at awwa.org for M14 TOC and
fccchr.usc.edu for approved-assembly list."

**Edge cases.** RP recommended for any high-hazard cross-
connection regardless of user selection; the tile overrides and
documents the override on the result.

**Tests.** Eight unit tests.

## 3. Phase C — HVAC expansion (Group C)

Ten new tiles.

### C.1 Duct fittings equivalent-length total

**Inputs.** List of fittings by type (90 elbow short / 90 elbow
long / 45 elbow / branch tee straight / branch tee branch /
reducer / damper / register), each with quantity and duct size.

**Output.** Total equivalent length (ft) by branch, broken out
per fitting type. Output feeds back into the v1 duct-sizing tile
as an additive friction loss.

**Math.** Bundled ASHRAE Fundamentals 2021 Chapter 21 equivalent-
length factors. The table is bundled per spec-v6 because the
factors are de facto standard published in many free engineering
references.

**Citation.** "Per ASHRAE Fundamentals 2021 Chapter 21 (duct
design) and SMACNA HVAC Duct Construction Standards. Free at
ashrae.org for TOC and smacna.org for standard reference."

**Edge cases.** Duct size below 4 in or above 60 in flagged as
outside table range.

**Tests.** Eight unit tests.

### C.2 Refrigerant line set sizing

**Inputs.** Refrigerant (R-410A / R-32 / R-454B / R-22 legacy),
system capacity (tons), line length (ft) one-way, vertical lift
(ft), suction temperature (F), liquid temperature (F).

**Output.** Recommended suction line OD (in), liquid line OD
(in), discharge line OD if applicable (heat-pump reversing-valve
condition), pressure drop along each line (psi, equivalent to F
saturation), and capacity derate from line losses.

**Math.** Public:

    velocity = (mass_flow * v_specific) / area
    delta_P = f * (L/D) * (rho * v^2 / 2)

Mass flow rate per ton from refrigerant property tables (bundled
NIST REFPROP values for the listed refrigerants are public).
Equivalent-length adders for fittings via C.1.

**Citation.** "Per ASHRAE Refrigeration 2022 Chapter 1 (system
practices) and the manufacturer (Carrier / Trane / Lennox)
published line-set sizing charts. NIST REFPROP property data
public. Free at ashrae.org and nist.gov/srd/refprop for tools."

**Edge cases.** Line length above 100 ft flagged as needing
manufacturer engineering. Vertical lift above 50 ft flagged as
oil-return concern.

**Tests.** Twelve unit tests covering a 3-ton R-410A 25-ft
line set, a 5-ton R-454B 75-ft line set, and a published Carrier
line-sizing chart point.

### C.3 Chiller tonnage from delta-T and GPM

**Inputs.** Chilled water flow (GPM), entering water temperature
(F), leaving water temperature (F), fluid (water / 30 percent
glycol / 50 percent glycol; affects specific heat).

**Output.** Cooling capacity (tons of refrigeration, BTU/hr, kW),
delta-T (F), required flow at the chiller's nameplate tons at
the entered delta-T.

**Math.** Public:

    Q_BTU_per_hr = GPM * 500 * delta_T   // water; the "500" is 60 min/hr * 8.33 lb/gal
    tons = Q / 12000

Glycol coefficient adjustments per ASHRAE Fundamentals 2021
Chapter 31 (secondary coolants).

**Citation.** "First-principles fluid energy balance. ASHRAE
Fundamentals 2021 Chapter 31 for glycol specific-heat values.
Free at ashrae.org for TOC."

**Edge cases.** delta_T below 5 F or above 20 F flagged (typical
chiller range is 10 F to 14 F). Glycol concentration above 50
percent flagged as outside the bundled property range.

**Tests.** Ten unit tests including a 100-ton chiller at 240
GPM, 54 F EWT, 44 F LWT, verifying tons = 100.

### C.4 Cooling tower range, approach, and efficiency

**Inputs.** Hot water temperature in (F), cold water temperature
out (F), entering wet-bulb (F), water flow (GPM).

**Output.** Range (hot - cold, F), approach (cold - WB, F),
efficiency (range / (range + approach)), and a comparison band
against typical industrial cooling-tower ranges (approach 5-10 F
indicates a well-sized tower).

**Math.** Public arithmetic.

**Citation.** "Per the CTI (Cooling Technology Institute) ATC-105
standard test code. Approach is bounded by wet-bulb; perfect-
efficiency tower cannot cool below WB. Free at cti.org for ATC
TOC."

**Edge cases.** Cold water below wet-bulb rejected (thermodynamic
impossibility for evaporative cooling). Range above 30 F flagged
as outside typical industrial.

**Tests.** Eight unit tests.

### C.5 Heat exchanger LMTD and effectiveness-NTU

**Inputs.** Flow configuration (counter-flow / parallel-flow /
cross-flow), hot fluid inlet (F), hot fluid outlet (F), cold
fluid inlet (F), cold fluid outlet (F), hot fluid flow (GPM),
cold fluid flow (GPM), fluid types (water / glycol mixtures /
brine).

**Output.** Log mean temperature difference (F), effectiveness
(0 to 1), NTU, capacity rate ratio, and required UA product
(BTU/hr-F).

**Math.** Public:

    LMTD = (dT_1 - dT_2) / ln(dT_1 / dT_2)
    Q = m_dot * cp * delta_T
    UA = Q / LMTD
    eta = Q / Q_max
    NTU = UA / C_min

**Citation.** "Per the TEMA (Tubular Exchanger Manufacturers
Association) standards and any heat-transfer textbook (Incropera,
Cengel). Free at tema.org for standards TOC."

**Edge cases.** Parallel-flow with outlet temperatures crossing
rejected (thermodynamic impossibility). Counter-flow with cold-
outlet above hot-inlet rejected.

**Tests.** Twelve unit tests covering each flow configuration
with a worked example from Incropera.

### C.6 Hot water boiler distribution pipe sizing

**Inputs.** Boiler output (BTU/hr), supply-return delta-T (F;
default 20), pipe material (copper Type L / steel Schedule 40 /
PEX), maximum velocity (ft/sec; default 4 for copper, 6 for
steel, 3 for PEX).

**Output.** Required GPM, recommended pipe size, velocity at
recommended size, pressure drop per 100 ft, and pump head at
the user-entered run length.

**Math.** Public:

    GPM = Q_BTU_per_hr / (500 * delta_T)
    velocity = GPM_to_FPS(pipe_size, GPM)
    pressure_drop = darcy_weisbach(pipe_size, velocity, fluid)

**Citation.** "Per ASHRAE Systems and Equipment 2020 Chapter 13
(hydronic heating). Velocity limits per Bell and Gossett and
Taco system design guides. Free at ashrae.org and
bellgossett.com / tacocomfort.com for guides."

**Edge cases.** delta_T below 10 F or above 40 F flagged
(commercial high-delta-T systems exist but are non-default).

**Tests.** Ten unit tests including a 200 kBTU boiler at 20 F
delta-T sized at 1.25 in copper.

### C.7 Filter pressure-drop schedule

**Inputs.** Filter type (MERV 8 / 11 / 13 / 16 / HEPA), face
area (ft^2), face velocity (fpm; default 300 fpm), loaded /
clean condition (selector).

**Output.** Clean pressure drop (in WC), loaded (recommended
change-out) pressure drop (in WC), recommended change interval
based on user-entered fan curve and runtime.

**Math.** Filter pressure-drop curves bundled per ASHRAE 52.2
test data published for typical commercial filters. The user can
override with the manufacturer's curve.

**Citation.** "Per ASHRAE 52.2-2017 (Method of Testing General
Ventilation Air-Cleaning Devices) and manufacturer published
cut sheets. Free at ashrae.org for ASHRAE 52.2 TOC."

**Edge cases.** Face velocity above 500 fpm flagged as outside
typical commercial. HEPA at the entered face velocity may
require pre-filter.

**Tests.** Eight unit tests.

### C.8 Compressor short-cycle protection minimum runtime

**Inputs.** Compressor size (tons), system type (single-stage /
two-stage / VRF / inverter), conditioned space volume (ft^3),
design indoor delta-T (F), ambient temperature at startup (F).

**Output.** Minimum runtime to maintain compressor lubrication
and oil return (typically 10 minutes for non-inverter; per
manufacturer for inverter), maximum cycles per hour
(typically 6), and a flag if the user's thermostat schedule
produces shorter cycles.

**Math.** Mostly arithmetic with bundled industry rules of thumb
(Copeland / Carrier / Trane published guidance). Inverter
systems have specific manufacturer overrides.

**Citation.** "Per the Copeland Application Engineering Bulletin
17-1226 and ASHRAE Fundamentals 2021. Per-manufacturer guidance
governs final operation. Free at copeland.com/literature."

**Edge cases.** Cycles per hour above 8 flagged as short-cycling
risk.

**Tests.** Six unit tests.

### C.9 Air changes per hour from CFM and room volume

**Inputs.** Room volume (ft^3), supply CFM, return CFM (default
equal to supply), occupied / unoccupied selector.

**Output.** ACH at supply, net ACH if return less than supply
(pressurization condition), and a comparison band against
typical ACH targets (residential 0.35 ACH, classroom 4 to 6,
operating room 20+, lab 6 to 12 per ASHRAE 170).

**Math.** Public:

    ACH = CFM * 60 / volume_ft3

**Citation.** "Per ASHRAE 62.1-2022 (ventilation) and ASHRAE
170-2021 (healthcare). Free at ashrae.org for TOCs."

**Edge cases.** Room volume below 100 ft^3 flagged. ACH above 50
flagged as outside typical HVAC range.

**Tests.** Six unit tests.

### C.10 Humidifier capacity (lb/hr from RH target)

**Inputs.** Supply air CFM, supply air dry-bulb (F), entering
RH (percent), target supply RH (percent), altitude (ft).

**Output.** Required moisture addition (lb/hr, gpd), latent
load (BTU/hr) added.

**Math.** Public psychrometric: humidity ratios at entering and
target conditions; difference times mass flow.

    m_dot_air_lb_per_hr = 60 * CFM * rho
    addition = m_dot_air * (W_target - W_entering)

Density and W from the v1 psychrometric helper, altitude-corrected.

**Citation.** "Per ASHRAE Fundamentals 2021 Chapter 1. AHJ and
manufacturer humidifier capacity govern actual delivery. Free at
ashrae.org for TOC."

**Edge cases.** Target RH below entering RH rejected. Target RH
above 60 percent flagged as condensation risk.

**Tests.** Eight unit tests.

## 4. Phase D — Restoration expansion (Group D)

Five new tiles.

### D.1 Air mover quantity per IICRC S500

**Inputs.** Affected wet area (ft^2), class of water loss (Class
1 / 2 / 3 / 4 per IICRC S500), surface (carpet / hardwood /
concrete / tile / drywall flood-cut).

**Output.** Recommended air-mover count, recommended placement
density (one per 50 to 75 ft^2 of wet wall surface and one per
10 to 16 lineal ft of wet wall), and a comparison band
indicating that S500 is judgment-driven and the recommendation
is a starting point.

**Math.** Bundled S500 industry-rule-of-thumb factors.

**Citation.** "Per IICRC S500-2021 (Standard for Professional
Water Damage Restoration) Chapter 12. IICRC governs scope;
restoration technician judgment governs placement. Free at
iicrc.org for S500 TOC."

**Edge cases.** Class 4 (specialty drying situations) flagged as
needing custom approach (panels, mat systems).

**Tests.** Eight unit tests.

### D.2 Dehumidifier capacity (GPP load)

**Inputs.** Affected volume (ft^3), starting GPP (grains per
pound), target GPP, drying-window hours, dehumidifier rated
capacity (pints per day) at AHAM 80F/60RH condition.

**Output.** Moisture load to remove (lb), required removal rate
(pints per day at the dehumidifier's rated condition), and
recommended dehumidifier count given the unit's published curve
at the actual room condition.

**Math.** Public:

    moisture_lb = volume * rho_air * (W_initial - W_target) / 7000

Dehumidifier capacity at non-AHAM conditions per the manufacturer's
published performance curve (user enters; bundled defaults for
representative LGR units optional).

**Citation.** "Per IICRC S500-2021 Chapter 8 (psychrometry) and
AHAM DH-1 (dehumidifier rating). AHAM is the rating condition,
not the field condition. Free at iicrc.org and aham.org for TOCs."

**Edge cases.** Target GPP below 30 flagged as outside typical
restoration drying targets.

**Tests.** Eight unit tests.

### D.3 HEPA scrubber ACH for containment

**Inputs.** Containment volume (ft^3), containment class
(category 1 mold abatement / category 2 mold / asbestos / lead),
required ACH (4 to 6 typical for mold, 4 minimum for asbestos
NESHAP).

**Output.** Required CFM, number of HEPA scrubbers at the
user-entered unit CFM, expected negative pressure differential
(in WC), recommended manometer placement and alarm setting.

**Math.** Public:

    CFM_required = volume * ACH / 60

Negative-pressure differential per ANSI/IICRC S520 chapter 13
(approx 0.02 in WC minimum).

**Citation.** "Per IICRC S520-2024 (Mold) Chapter 13 and EPA
40 CFR 763 Subpart E (asbestos in schools, NESHAP). AHJ governs.
Free at iicrc.org and epa.gov for regulations."

**Edge cases.** Asbestos work flagged as requiring licensed
contractor per state regulation regardless of calculator output.

**Tests.** Six unit tests.

### D.4 Drying time estimation

**Inputs.** Material (carpet / hardwood / drywall / concrete /
plaster), thickness (in), initial moisture content (percent or
GPP), target moisture content, drying conditions (chamber temp F,
chamber RH percent, surface air velocity fpm).

**Output.** Estimated drying time (hours), drying-rate curve
(SVG, accessible), and a flag if the projected time exceeds 72
hours (the IICRC S500 microbial-growth threshold).

**Math.** Diffusion-based first-principles drying model: a
boundary-layer driven moisture-flux per Fick's law calibrated
against published IICRC S500 reference materials.

    flux = h_m * (rho_surface - rho_air)
    time_to_target = (initial - target) * mass / flux

**Citation.** "Per IICRC S500-2021 Chapter 8 (psychrometry) and
the IRMI Inspection, Testing and Restoration of Water-Damaged
Buildings reference. Material thermal properties from ASHRAE
Fundamentals 2021 Chapter 26. Free at iicrc.org and ashrae.org
for TOCs."

**Edge cases.** Initial MC above 50 percent (saturated)
flagged. Target MC below the material's equilibrium MC for the
chamber RH rejected.

**Tests.** Eight unit tests including a 5/8 in drywall and a
3/4 in hardwood drying-time comparison against published S500
case studies.

### D.5 Equipment power draw vs available circuit capacity

**Inputs.** Equipment list by type (LGR dehu / 1/4 HP air mover /
HEPA scrubber 500 / heat-pump dryer), each with quantity. Circuit
breaker amperage (15 / 20 / 30) and voltage (120 / 240).

**Output.** Total amperage draw, circuit utilization percent (vs
80 percent NEC 210.20 continuous limit), recommended circuit
count, and a flag for any single piece of equipment exceeding 80
percent of its dedicated circuit.

**Math.** Public arithmetic with bundled equipment nameplate
defaults (typical Phoenix / Dri-Eaz / Drieaz / B-Air values; user
overrides per actual nameplate).

**Citation.** "Per NEC 2023 §210.20 (overcurrent protection for
branch circuits). Equipment nameplate governs final draw. AHJ
governs. Free at nfpa.org/freeaccess."

**Edge cases.** Total draw above 80 percent of the smallest
dedicated circuit flagged.

**Tests.** Six unit tests.

## 5. Phase N — Water / Wastewater expansion (Group N)

Seven new tiles. Group N (water/wastewater operators) was
introduced in v9 for SVI, CT-value, and a small set of operations
tiles. v16 deepens it for the typical small-system operator.

### N.1 Pool turnover rate and chlorine demand

**Inputs.** Pool volume (gal), turnover target hours (default 6
for commercial, 8 for residential per NSPF), free chlorine target
(ppm; default 2 for residential, 3 for commercial), bather load
(bathers per hour for commercial).

**Output.** Required pump flow (GPM), recommended pump size,
chlorine demand (lb/day at user-entered chlorine type — cal-hypo,
trichlor, liquid bleach), feed rate per chlorinator.

**Math.** Public:

    GPM = volume / (turnover_hr * 60)
    chlorine_lb_per_day = volume * dose_ppm * 8.345e-6 / type_percent

**Citation.** "Per the NSPF Certified Pool Operator Handbook
(2022) and ANSI/APSP/ICC 11 (Public Pools and Spas). NSPF governs
operator certification; AHJ governs adopted code. Free at
phta.org for APSP-11 TOC."

**Edge cases.** Free chlorine target above 10 ppm rejected
(closure threshold). Turnover above 24 hr flagged.

**Tests.** Ten unit tests.

### N.2 Backwash flow rate and waste volume

**Inputs.** Filter type (sand / DE / cartridge), filter area
(ft^2), backwash flow rate per manufacturer (gpm/ft^2; default
12 to 15 for sand, 1 to 2 for cartridge rinse), backwash duration
(min; default 2 to 5).

**Output.** Total backwash flow (GPM), waste volume per cycle
(gal), recommended waste-line size for the flow, and waste
volume per year at user-entered backwash frequency.

**Math.** Public arithmetic.

**Citation.** "Per the NSPF Certified Pool Operator Handbook
(2022) and the AWWA M30 manual (filter operation). Free at
phta.org for NSPF TOC and awwa.org for M30 TOC."

**Edge cases.** Backwash flow above 25 gpm/ft^2 flagged as
exceeding most sand filter ratings.

**Tests.** Six unit tests.

### N.3 Well drawdown and specific capacity

**Inputs.** Static water level (ft below ground), pumping water
level (ft below ground), discharge rate (GPM), well-test duration
(min).

**Output.** Drawdown (ft), specific capacity (GPM per ft of
drawdown), recommended pump-setting depth (typically 20 ft
below pumping level; user override), and a flag if specific
capacity decreased during the test (silt / collapse indicator).

**Math.** Public:

    drawdown = pumping_level - static_level
    specific_capacity = GPM / drawdown

**Citation.** "Per the AWWA A100 (Water Wells) standard and the
US Geological Survey published well-testing methods (USGS Open-
File Report 02-197). Free at awwa.org for A100 TOC and pubs.usgs.gov."

**Edge cases.** Specific capacity below 0.5 GPM/ft flagged as
marginal well. Pumping level above static level rejected.

**Tests.** Six unit tests.

### N.4 Cooling water makeup from cycles of concentration

**Inputs.** Cooling tower flow (GPM), delta_T (F), cycles of
concentration (COC; typical 3 to 8), drift rate (percent of
recirculation; default 0.002 per modern drift eliminator).

**Output.** Evaporation rate (GPM), blowdown rate (GPM), drift
rate (GPM), makeup rate (GPM), and a comparison band on COC vs
makeup-water hardness target (higher COC reduces makeup but
risks scale).

**Math.** Public:

    evaporation_GPM = recirculation * delta_T / 1000  // rule of thumb
    blowdown_GPM = evaporation / (COC - 1)
    drift_GPM = recirculation * drift_pct
    makeup_GPM = evaporation + blowdown + drift

**Citation.** "Per the Cooling Technology Institute (CTI)
publications and ASHRAE Systems and Equipment 2020 Chapter 40
(cooling towers). Free at cti.org and ashrae.org for TOCs."

**Edge cases.** COC above 10 flagged as scaling risk. Drift
above 0.005 flagged as deficient drift eliminator.

**Tests.** Eight unit tests.

### N.5 Chlorine residual decay (first-order)

**Inputs.** Initial free chlorine (mg/L), decay rate constant
(1/hr; default 0.05 to 0.20 depending on TOC and temperature),
time elapsed (hr), target residual (mg/L; default 0.2 at the
extremity per EPA SDWA).

**Output.** Residual at time t, time remaining to target,
recommended booster-chlorination location distance from source.

**Math.** Public first-order:

    C(t) = C0 * exp(-k * t)

**Citation.** "Per EPA 815-R-02-020 (Effects of Water Age on
Distribution System Water Quality) and AWWA M14 manual. EPA 40
CFR 141.74 governs residual at extremity. Free at epa.gov and
awwa.org."

**Edge cases.** Decay rate above 0.5 1/hr flagged as outside
typical (suggests gross TOC issue).

**Tests.** Six unit tests.

### N.6 Domestic water service sizing (WSFU method)

**Inputs.** Fixture list per IPC Table 604.3 (bundled WSFU values),
service-pressure-available (psi at street main minus elevation
loss), available pressure at the most-remote fixture (psi;
default 8 for flush-tank, 25 for flushometer), service length
(ft), service material (copper / PEX / PE plastic / DI).

**Output.** Total WSFU, demand (GPM) from IPC Hunter's-curve
table (bundled), recommended service size, service friction loss
at design flow, residual pressure at the most-remote fixture, and
a flag if residual is below the minimum required.

**Math.** WSFU sum, lookup against IPC Table E103.3(2) (Hunter's
Curve), Hazen-Williams friction loss (v1 engine).

**Citation.** "Per IPC 2021 §604 (water-distribution sizing) and
Appendix E (sizing of water-piping systems). Hunter's Curve is
public, NBS BMS 65 (1940). Free at codes.iccsafe.org for IPC TOC."

**Edge cases.** Static pressure above 80 psi flagged (PRV
required per IPC 604.8). Available pressure at fixture below
8 psi flagged.

**Tests.** Ten unit tests including a 4-bathroom residential
service and a small commercial 30-fixture service.

### N.7 Filter media depth and loading rate

**Inputs.** Design flow (GPM), filter area (ft^2), media type
(silica sand / GAC / anthracite / mixed), service hours
between backwash, target turbidity (NTU).

**Output.** Loading rate (gpm/ft^2), required media depth (in)
per AWWA B100 / B102 standards, and an effluent-turbidity
prediction band based on bundled pilot-test data ranges.

**Math.** Loading rate = GPM / area. Media depth and effective
size per AWWA B100 (silica sand) and B102 (anthracite) published
reference values.

**Citation.** "Per AWWA B100-21 (Granular Filter Material) and
B102-21 (Manganese Greensand). Free at awwa.org for standards
TOC."

**Edge cases.** Loading rate above 5 gpm/ft^2 for gravity sand
filters flagged as outside conventional rapid-rate range.

**Tests.** Six unit tests.

## 6. Phase Z — Cross-cutting platform and manifest changes

(Labeled Z here per the v15 H convention; Z is reserved for cross-
cutting work and is not a tile-group letter.)

### Z.1 Manifest entries

30 new entries in `tile-meta.js`, each carrying editions, asOf,
tolerance, worked_example, and reviewer_signoff fields per
spec-v10 and spec-v14.

### Z.2 Calc modules

No new calc-*.js modules. Distribution:

- B.1 through B.8 -> `calc-plumbing.js`
- C.1 through C.10 -> `calc-hvac.js`
- D.1 through D.5 -> `calc-restoration.js`
- N.1 through N.7 -> `calc-water.js`

### Z.3 Tests, search aliases, print / CSV / a11y parity

Same gates as v15 §H.3 / §H.4 / §H.5. Every new tile lands with
its declared test count, at least three search aliases, and clean
axe-core, print, and CSV parity audits.

### Z.4 Per-group reviewer signoff

Per spec-v14 §15:

- Group B: a US-licensed PE plumbing or master plumber (sought).
- Group C: a US-licensed PE mechanical with HVAC experience
  (sought).
- Group D: an IICRC-certified water-damage restoration
  technician (sought).
- Group N: a US-licensed water-system operator (Grade III or
  higher) (sought).

Open signoffs do not block v16 from landing; they block the v16
release announcement from carrying the "audited" label per the
v14 convention.

## 7. Out of scope for v16

- Trades core (Groups A / E / F / G expansion): v15.
- Allied professions (Groups U / V / W / X / Y deepening, plus
  R / S / T / L deepening): v17.
- New groups: none in v15 / v16 / v17.

## 8. Closing note

30 tiles in v16. They cover the mechanical questions the trade
professional asks Monday through Friday, in the boiler room, on
the chiller deck, in the dehumidified containment, and at the
well head. Each is built from first-principles math the relevant
standard cites. Each carries a publisher, edition, section, and
verified-on date. Each must hit its tolerance against an
independent published worked example before it renders in
production. Each carries the appropriate trade-specific disclaimer.

The site continues to be the calm reference for the trade
professional whose work is fundamentally "do the math over public
data, then defer to the human who governs the decision." v16
hands the mechanical-trade professional 30 more of those numbers.
v17 finishes the 100.
