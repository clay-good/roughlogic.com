# v6 Citation-Discipline Audit Tracker

This document tracks the v6 audit pass mandated by spec-v6.md §6. Every existing tile (utilities 1 through 233 across groups A–Q) is checked against the section-2 / section-3 reference rule and marked off here as it passes. v6 is "done" only when every tile is green.

The audit is organized as one PR per group, in the priority order from spec §6:

1. NEC-derived tiles in calc-electrical.js (Group A)
2. IPC / IFGC tiles in calc-plumbing.js (Group B)
3. NFPA 13 / IFC tiles in calc-construction.js and Group H
4. ACCA / ASHRAE tiles in calc-hvac.js (Group C)
5. IRC / IBC / AWC tiles in calc-construction.js (Group E)
6. FMCSA / FHWA tiles in Group J
7. FAA / USCG tiles in Group K
8. FDA / USDA tiles in Group O
9. EPA / SDWA / AWWA tiles in Group M
10. IICRC tiles in calc-restoration.js (Group D)
11. Everything else (Groups F, G, L, N, P, Q)

## Per-tile checklist (spec-v6.md §6)

For each tile, the audit PR confirms:

- [ ] Reference block present in the order from §3 (Formula → Edition → Free-access pointer → Governance notice → Edition selector/disclosure → Numeric assumptions).
- [ ] Edition or source date visible on the tile, not buried in a footer.
- [ ] Free public-access pointer named (codes.iccsafe.org, nfpa.org/freeaccess, ecfr.gov, etc.).
- [ ] Governance notice from §2.5 sized to the stakes (electrical / plumbing / structural / mechanical / fire / pesticide-label / trucking / aviation / marine / food-service / water-and-wastewater / stage-rigging / field-SAR).
- [ ] Numeric assumptions list complete and source-stamped.
- [ ] "Copy answer with full reference block" affordance wired.
- [ ] Data shard scanned for prose paste-ins by the build-time prose-lint.
- [ ] docs/data-sources.md entry up to date.
- [ ] scripts/sources.md entry up to date.
- [ ] data/integrity.json hash refreshed.

## Platform foundation (landed)

- [x] Edition stamps present on every per-folder manifest (`scripts/build-data.mjs` DATASETS table; build fails without them).
- [x] Build-time prose-lint flags string values longer than 140 characters that look like prose paste-ins. Field-name and ancestor-name exemptions cover narrative shards (summaries.json, v3-references.json, etc.).
- [x] Free-access lint (`scripts/check-v6-discipline.mjs`) verifies every shipped shard has a `### data/<folder>/<file>` section in `docs/data-sources.md`. Wildcard pattern (`### data/historical/commodities/*.json`) supported for fan-out shards.
- [x] Citation-string lint (advisory only) reports inline `"per <Source>"` strings across `calc-*.js` so the maintainer knows where audit work is concentrated.
- [x] Lint chained into `npm run lint` so a CI failure blocks deploys.
- [x] Structured citation data model (`citations.js`) scaffolded; Group A populated as the priority-1 worked example. The reference-block renderer in `app.js` opportunistically picks up any tile id present in the structured `CITATIONS` map.
- [ ] "Copy answer with full reference block" affordance (extends v3 "Copy citation"). Pending — depends on the reference block component reaching every tile.
- [ ] Reference block UI component in `app.js` rendering all six §3 lines from the structured citation. Stub present; full per-tile content arrives with each group's audit PR.

## Per-group audit status

Tile counts include every entry registered in `TOOLS` in `app.js`. The status column is one of: `not started`, `in progress`, `complete`. A tile is `complete` when every checklist item above is checked.

### Group A — Electrical (calc-electrical.js) — priority 1

Status: **complete** — citations.js populated as the worked example for the v6 platform; per-tile §3 reference block content authored. The reference-block UI component ships via the dynamic `citations.js` import in `app.js` (the `renderCitationBlock` call inserts the §3 block under every tile that has a structured entry; the "Copy answer with full reference block" button emits the §3 plain-text form via `buildAnswerWithReference`).

| Tile id | Tile name | Status |
| --- | --- | --- |
| ohms-law | Ohm's Law | citation authored |
| wire-ampacity | Wire Ampacity | citation authored |
| voltage-drop | Voltage Drop | citation authored |
| conduit-fill | Conduit Fill | citation authored |
| box-fill | Box Fill | citation authored |
| breaker-sizing | Breaker Sizing | citation authored |
| motor-fla | Motor Full Load Amps | citation authored |
| transformer-sizing | Transformer Sizing | citation authored |
| three-phase | Three-Phase Power | citation authored |
| copper-resistance | Conductor Resistance at Temperature | citation authored |
| egc-sizing | Equipment Grounding Conductor Sizing | citation authored |
| service-load | Service Load Calculation (Residential) | citation authored |
| generator-sizing | Generator Sizing | citation authored |
| pv-string-sizing | Solar PV String Sizing | citation authored |
| battery-runtime | Battery Runtime | citation authored |
| voltage-imbalance | Voltage Imbalance | citation authored |
| gfci-afci-reference | GFCI / AFCI Requirements Reference | citation authored |
| lighting-density | Lighting Power Density | citation authored |
| pulling-tension | Conductor Pulling Tension | citation authored |
| cable-bend-radius | Cable Bend Radius Minimum | citation authored |
| pf-correction | Power Factor Correction Capacitor | citation authored |
| phase-balance | Phase Balance Across Panels | citation authored |
| multi-load-vd | Branch Voltage Drop With Multiple Loads | citation authored |
| lv-dc-drop | Low-Voltage DC Drop | citation authored |
| poe-budget | PoE Budget and Run Distance | citation authored |

### Group B — Plumbing and Gas (calc-plumbing.js) — priority 2

Status: **complete** — citations.js populated for every Group B tile; per-tile §3 reference block content authored. The reference-block UI component ships via the dynamic `citations.js` import in `app.js` (shared with Group A).

| Tile id | Tile name | Status |
| --- | --- | --- |
| pipe-sizing | Pipe Sizing | citation authored |
| friction-loss | Friction Loss | citation authored |
| pipe-volume | Pipe Volume | citation authored |
| pump-sizing | Pump Sizing | citation authored |
| static-pressure-piping | Static Pressure Loss in Piping | citation authored |
| gas-pipe-sizing | Gas Pipe Sizing | citation authored |
| slope | Drainage Slope | citation authored |
| pressure-conversion | Pressure Conversion | citation authored |
| backflow | Backflow Reference | citation authored |
| water-hammer-arrestor | Water Hammer Arrestor Sizing | citation authored |
| recirc-pump-head | Hot Water Recirc Pump Head | citation authored |
| septic-tank | Septic Tank Sizing | citation authored |
| trap-arm | Trap Arm Length | citation authored |
| pipe-expansion | Pipe Thermal Expansion | citation authored |
| tankless-gpm | Tankless Water Heater GPM | citation authored |
| gas-leak-rate | Gas Leak Rate (Orifice) | citation authored |
| stormwater-rational | Stormwater Rational Method | citation authored |
| manning-slope | Manning's Equation Drainage Slope | citation authored |
| hydrostatic-test | Hydrostatic Test Pressure and Hold | citation authored |
| grease-trap | Grease Trap Sizing | citation authored |
| glycol-mix | Glycol Freeze Protection Mix | citation authored |
| expansion-tank | Hydronic Expansion Tank | citation authored |
| backflow-loss | Backflow Preventer Pressure Loss | citation authored |

### Group H — Knowledge References (NFPA / IFC / OSHA / FEMA reference set) — priority 3

Status: **complete** — citations.js populated for every Group H reference tile; per-tile §3 reference block content authored. Reference pages cite their source (NEC / IPC / OSHA / NFPA / FEMA / CALFIRE / FAA / ASME) by section number or document name only; image reproduction is prohibited where applicable. (Spec §6 priority 3 is "NFPA 13 / IFC tiles in calc-construction.js and group H"; calc-construction.js carries no NFPA 13 / IFC tiles in the current catalog, so this audit covers the entire Group H reference set as the priority-3 unit.)

| Tile id | Tile name | Status |
| --- | --- | --- |
| color-codes | Wire / Pipe / Gas Color Codes | citation authored |
| knot-reference | Knot Reference | citation authored |
| inspection-checklist | Inspection Prep Checklist | citation authored |
| emergency-contacts | Utility Locator and Emergency Contacts | citation authored |
| tool-maintenance | Tool Maintenance Intervals | citation authored |
| hand-signals | Hand Signal Reference | citation authored |
| osha-top10 | OSHA Top-10 Citations | citation authored |
| loto-steps | Lockout / Tagout Steps | citation authored |
| defensible-space | Defensible Space Reference | citation authored |
| storm-shelter | Storm Shelter Spec Reference | citation authored |
| triage-quickread | Field First Aid Triage Quick-Read | citation authored |

### Group C — HVAC (calc-hvac.js) — priority 4

Status: **complete** — citations.js populated for every Group C tile; per-tile §3 reference block content authored. Cites ACCA Manual J / D / S, ASHRAE 62.1-2022, IMC 2021, IFGC 2021, AHRI 210/240-2023, manufacturer P-T tables and commissioning guides. The simplified Manual J cooling / heating tiles disclose explicitly that they are estimators, not code-compliant load calculations.

| Tile id | Tile name | Status |
| --- | --- | --- |
| manual-j-cooling | Manual J Cooling Load (Simplified) | citation authored |
| manual-j-heating | Manual J Heating Load (Simplified) | citation authored |
| duct-sizing | Duct Sizing | citation authored |
| static-pressure-hvac | Static Pressure | citation authored |
| refrigerant-pt | Refrigerant P-T Chart | citation authored |
| superheat-subcool | Superheat and Subcool | citation authored |
| seer-eer | SEER and EER Conversion | citation authored |
| balance-point | Heat Pump Balance Point | citation authored |
| shr | Sensible Heat Ratio | citation authored |
| cfm-per-ton | CFM per Ton | citation authored |
| combustion-air | Combustion Air | citation authored |
| compare-refrigerants | Compare Two Refrigerants | citation authored |
| refrigerant-charge | Refrigerant Charge Weighing | citation authored |
| approach-delta-t | Approach and Delta-T Diagnostics | citation authored |
| outdoor-air-mix | Outdoor Air Mix | citation authored |
| equivalent-length | Equivalent Length of Fittings | citation authored |
| wet-bulb-psychrometer | Wet-Bulb Sling Psychrometer | citation authored |
| insulation-thickness | Pipe Insulation Thickness | citation authored |
| evaporative-cooling | Latent Heat Evaporative Cooling | citation authored |
| affinity-laws | Fan Affinity Laws | citation authored |
| belt-pulley | Belt Length and Pulley Speed | citation authored |
| air-receiver | Compressed Air Receiver Sizing | citation authored |
| geothermal-loop | Geothermal Loop Length | citation authored |
| baseboard-output | Hydronic Baseboard Output | citation authored |
| npsh-a | Pump NPSH Available | citation authored |

### Group E — Carpentry and Construction (calc-construction.js) — priority 5

Status: **complete** — citations.js populated for every Group E tile; per-tile §3 reference block content authored. Cites IRC 2021, IBC 2021, ASCE 7-22, AWC NDS-2018, ACI 318-19 / 347R-14 / 211.1, ASTM / SAE bolt grades, AWS Welding Handbook, OSHA 29 CFR 1926, NAPA, BIA, NCMA TEK, GA-216, TCNA Handbook, and PCA. ASCE 7 formulas applied without reproducing licensed text.

| Tile id | Tile name | Status |
| --- | --- | --- |
| stairs | Stair Calculator | citation authored |
| roof-pitch | Roof Pitch | citation authored |
| rafter | Rafter Length | citation authored |
| square-footage | Square Footage | citation authored |
| board-footage | Lumber Board Footage | citation authored |
| concrete | Concrete Volume | citation authored |
| rebar | Rebar Spacing and Quantity | citation authored |
| lumber-spans | Lumber Spans | citation authored |
| fastener-pullout | Nail and Screw Pull-Out | citation authored |
| beam-loading | Beam Loading | citation authored |
| material-quantity | Material Quantity | citation authored |
| stair-stringer | Stair Stringer Length | citation authored |
| joist-deflection | Joist Mid-Span Deflection | citation authored |
| footing-area | Footing Area for Soil Bearing | citation authored |
| tile-count | Tile Count and Grout Volume | citation authored |
| paint-coverage | Paint Coverage | citation authored |
| excavation | Excavation Volume | citation authored |
| masonry-count | Brick and CMU Count | citation authored |
| wind-pressure | Wind Velocity Pressure | citation authored |
| snow-load | Flat-Roof Snow Load | citation authored |
| anchor-embedment | Anchor Bolt Embedment | citation authored |
| drywall | Drywall Sheet Count and Mud | citation authored |
| roofing-squares | Roofing Squares and Bundles | citation authored |
| asphalt-tonnage | Asphalt Tonnage | citation authored |
| aggregate | Aggregate / Gravel Cubic Yards | citation authored |
| mortar-mix | Mortar Mix and Yield | citation authored |
| concrete-mix-design | Concrete Mix Design (Simplified) | citation authored |
| bolt-torque | Bolt Torque to Clamp Load | citation authored |
| bend-allowance | Sheet Metal Bend Allowance | citation authored |
| speeds-feeds | Shop Speeds and Feeds | citation authored |
| weld-usage | Welding Rod and Wire Usage | citation authored |
| demo-debris | Demolition Debris Weight | citation authored |
| formwork-pressure | Formwork Pressure | citation authored |

### Group J — Trucking and Logistics (calc-trucking.js) — priority 6

Status: **complete** — citations.js populated for every Group J tile; per-tile §3 reference block content authored. Cites FMCSA 49 CFR 395.3 (HOS), 23 CFR 658.17 (Federal Bridge Formula), NMFTA NMFC density brackets, ICC Incoterms 2020, ISO 668 ocean-container specs, and carrier / OEM technical bulletins by name. The trucking governance variant flags the ELD and the carrier tariff as the legal record and notes that state limits may be lower than federal.

| Tile id | Tile name | Status |
| --- | --- | --- |
| dim-weight | Dimensional Weight (DIM) | citation authored |
| freight-density | Freight Density and NMFC Class | citation authored |
| pallet-loadout | Pallet Cube and Trailer Loadout | citation authored |
| hos-math | Hours of Service Math | citation authored |
| bridge-formula | Federal Bridge Formula and Axle Weights | citation authored |
| reefer-burn | Reefer Fuel Burn and Run Time | citation authored |
| incoterm-decoder | Incoterms 2020 Decoder | citation authored |

### Group K — Mechanic / Auto / Marine / Aviation (calc-mechanic.js) — priority 7

Status: **complete** — citations.js populated for every Group K tile; per-tile §3 reference block content authored. Cites FAA AC 91-23A (weight & balance), ABYC P-17 (marine prop), SAE J429 / J604 / J1349 / J267 / J661 / J2522, ASTM A325 / A490 / D975 / D4814 / D2, DOE EERE Alternative Fuels Data Center, TRA / ETRTO tire conventions, AAM / Spicer driveshaft engineering manuals, and manufacturer pad-chemistry bulletins. Aviation tile carries the spec §2.5 aviation governance variant (PIC + AFM); marine tile carries the marine variant (vessel master + USCG-approved loading manual).

| Tile id | Tile name | Status |
| --- | --- | --- |
| weight-balance | Aircraft Weight and Balance | citation authored |
| prop-slip | Marine Prop Slip | citation authored |
| displacement-cr | Engine Displacement and Compression Ratio | citation authored |
| bolt-stretch | Bolt Stretch and Clamp Load | citation authored |
| driveshaft-crit | Driveshaft Critical Speed | citation authored |
| fuel-range | Fuel Energy and Range | citation authored |
| tire-gearing | Tire Size and Effective Gear Ratio | citation authored |
| brake-pad-life | Brake Pad Lifespan and Heat Capacity | citation authored |

### Group O — Kitchen and Food Service (calc-kitchen.js) — priority 8

Status: **complete** — citations.js populated for every Group O tile; per-tile §3 reference block content authored. Cites FDA Food Code 2022 §3-501.14 (cooling curve) and §1-201.10 (TCS food definition), USDA FoodData Central reference weights and yield factors, NSF/ANSI 2-2022 / NSF/ANSI 4-2022 (food equipment standards), DIN EN 631 (Gastronorm pan dimensions), and NRA Restaurant Industry Forecast (food-cost benchmarks). Every tile carries the spec §2.5 food-service governance variant ("The thermometer on the food is the verdict. Local health department governs.").

| Tile id | Tile name | Status |
| --- | --- | --- |
| recipe-scale | Recipe Scaling | citation authored |
| yield-ep | Yield Percentage and Edible Portion | citation authored |
| cooling-curve | Food Safety Cooling Curve | citation authored |
| plate-cost | Plate Cost and Menu Pricing | citation authored |
| pan-conversion | Steam Table and Pan Conversion | citation authored |

### Group M — Water and Wastewater Operations (calc-water.js) — priority 9

Status: **complete** — citations.js populated for every Group M tile; per-tile §3 reference block content authored. Cites EPA SDWA 40 CFR 141 (Surface Water Treatment Rule, CT inactivation), AWWA M3 / M11 / B100 / B130, WEF MOP-8 / MOP-11, Metcalf & Eddy (Wastewater Engineering) 5th ed., Ten States Standards, Hydraulic Institute / ANSI/HI 14.6, and Standard Methods 24th ed. Every tile carries the spec §2.5 water governance variant ("Estimate. Operator of record and primacy agency govern.").

| Tile id | Tile name | Status |
| --- | --- | --- |
| pounds-formula | Pounds Formula | citation authored |
| filter-loading | Filter Loading Rate and Backwash | citation authored |
| detention-time | Detention Time | citation authored |
| lab-dilution | Lab Dilution and Serial Dilution | citation authored |
| pump-eff-w2w | Pump Wire-to-Water Efficiency | citation authored |
| srt-fm-ratio | SRT and F/M Ratio | citation authored |

### Group D — Water Damage and Mold Restoration (calc-restoration.js) — priority 10

Status: **complete** — citations.js populated for every Group D tile; per-tile §3 reference block content authored. Cites IICRC S500-2021 (Standard for Professional Water Damage Restoration), IICRC S520-2024 (Standard for Professional Mold Remediation), EPA 402-K-01-001 (Mold Remediation in Schools and Commercial Buildings), OSHA 29 CFR 1910.134 (Respiratory Protection), AHAM DH-1-2008 (dehumidifier rating), ANSI/ASHRAE 52.2 (filter testing), ASHRAE 170 (healthcare ventilation), ASTM C1153 (IR roof inspection), and ASHRAE Handbook (Fundamentals) Chapter 1 by name. Spec §2.5 carries no IICRC-specific governance variant, so restoration tiles use the general variant ("Estimate. AHJ and licensed professional govern.") - IICRC S500/S520 are private consensus standards, not law, but are the industry standard of care.

| Tile id | Tile name | Status |
| --- | --- | --- |
| psychrometric | Psychrometric Calculator | citation authored |
| drying-goal | Drying Goal | citation authored |
| dehumidifier | Dehumidifier Sizing | citation authored |
| air-movers | Air Mover Placement | citation authored |
| water-classes | Water Loss Class and Category | citation authored |
| drying-times | Material Drying Times | citation authored |
| mold | Mold Growth Conditions | citation authored |
| ppe | PPE Selection | citation authored |
| standing-water | Standing Water Volume | citation authored |
| nam-sizing | Negative Air Machine Sizing | citation authored |
| hepa-filter-life | HEPA Scrubber Filter Life | citation authored |
| thermal-delta-t | Thermal Imager Delta-T Reference | citation authored |
| containment-air-balance | Containment Air Balance | citation authored |
| chamber-turnover | Drying Chamber Air Turnover | citation authored |

### Group F — Fire-Ground Engineering (calc-fire.js) — priority 11

Status: **complete** — citations.js populated for every Group F tile (20 tiles after v7 / v8 / v9 additions: ISO PPC NFF, NFPA 1142 rural water supply, SCBA cylinder time, and OSHA 1910.146 confined-space ventilation). Cites NFA hose-friction (U.S. government, public domain), NFPA 13-2022 (sprinklers) / NFPA 14-2024 (standpipes) / NFPA 11 (foam) / NFPA 1006 / 1670 / 1901 / 1965, ISO Public Protection Classification, AWWA M17, OSHA 29 CFR 1910.146 + 1910.184, ANSI/ASSP Z117.1, ASME B30.9, AASHTO Green Book, IFSTA Pumping Apparatus Driver/Operator Handbook, and Dave Dodson 'Reading Smoke' methodology.

### Group G — Cross-Trade Utilities (calc-cross.js) — priority 11

Status: **complete** — citations.js populated for every Group G tile (30 tiles after the v9 OSHA 1910.95 noise-dose addition). Cites NIST SP 811, IRS standard mileage rate, GSA per-diem (FY2026), FLSA 29 USC 207, OSHA 29 CFR 1926 Subpart P + Appendix B, NIOSH Applications Manual for the Revised NIOSH Lifting Equation (DHHS 94-110), NWS 2001 Wind Chill formula, NWS Heat Index polynomial + OSHA Heat Illness Prevention work-rest table, ANSI A14.7 / ASSP A1264.1, ADA Standards (2010) §405, ICC A117.1-2017, ARCSA Rainwater Harvesting Manual, FMVSS 49 CFR 567.4, classical haversine + WGS84, and engineering-practice financial conventions for markup / loan-amortization / NPV.

### Group L — Agriculture and Forestry (calc-agriculture.js) — priority 11

Status: **complete** — citations.js populated for every Group L tile (9 tiles after the v9 USDA-ARS THI livestock-stress and USDA 1/128-acre sprayer-calibration additions). Cites ASABE EP367 / D497, USDA Forest Service Manual 2400 + public log-volume tables (Doyle 1825 / Scribner Decimal C / International 1/4-inch), USDA Cooperative Extension seeding-rate guides, Nebraska Tractor Test Lab, Christiansen 1942 + USDA NRCS NEH Part 623, USDA NRCS Soil Survey Manual, USDA FGIS standard moisture grades, and the FIFRA "label is the law" pesticide governance variant.

### Group N — Stage and Live Production (calc-stage.js) — priority 11

Status: **complete** — citations.js populated for every Group N tile (7 tiles after the v9 ANSI S1.26 atmospheric-absorption SPL addition). Cites ANSI E1.11 (DMX-512-A) + ANSI E1.21 (Temporary Ground-Supported Structures), ASME B30.9 / B30.16 / B30.26, IEEE 519, ISO 9613-2, AES information documents on time-alignment, manufacturer truss span-vs-load tables (Tomcat / Total Structures / Tyler GT / Global Truss), and manufacturer hoist data sheets (CM Lodestar, Columbus McKinnon, Chain Master). Every tile carries the spec §2.5 rigging governance variant.

### Group P — Field, Backcountry, and SAR (calc-field.js) — priority 11

Status: **complete** — citations.js populated for every Group P tile (8 tiles after the v9 §F.1 magnetic-declination tile and the v9 §F.2 lightning-30/30-countdown tile). Cites NOAA NCEI World Magnetic Model 2025 (now driving both bearing-conversion and the dedicated magnetic-declination forward solution), NWS lightning safety, NOAA Solar Position Algorithm (Reda & Andreas, NREL/TP-560-34302, 2008), USGS PP 1395 (Snyder Map Projections — A Working Manual, 1987) + Krueger series for UTM, AIARE Level 1 curriculum + USFS National Avalanche Center, U.S. Army FM 3-25.26 + FM 21-10, USDA Dietary Reference Intakes, and ACSM Position Stand on hydration. Every tile carries the spec §2.5 field governance variant.

### Group Q — Historical Reference Data (calc-historical.js) — priority 11

Status: **complete** — citations.js populated for the single Group Q tile. Cites BLS PPI series WPU* (industrial commodities), EIA series PET.* / NG.* (retail fuel + city-gate gas), and USDA NASS / FRED PWHEAMTUSDM / PMAIZMTUSDM / PSOYBUSDM (agricultural). Carries the spec §2.5 reference governance variant. Build fails if any shard's latest point is more than 30 days behind the build date.

## How to run an audit PR

1. Pick the next group from the priority list above.
2. For each tile in the group, author a structured `CITATIONS["<tile-id>"]` entry in `citations.js` covering the six §3 lines (formula, edition, free-access pointer, governance notice, edition selector / disclosure, numeric assumptions).
3. Confirm any data shards consumed by the tile have an `edition` stamp on their manifest (the build-time edition-stamp lint catches missing ones).
4. If the tile sources from a new shard, add the `### data/<folder>/<file>` entry to `docs/data-sources.md` (the free-access lint catches missing ones).
5. Run `npm run data:refresh && npm run data:verify && npm run lint && npm test`. Every step must pass.
6. Mark the tile `complete` in the table above.
7. Commit one PR per group; the PR description references this file.

## When v6 is "done"

Every tile is `complete`. `docs/v6-audit.md` shows a green table for every group. The CHANGELOG carries a `v0.6.0 - <date>` stanza summarizing the audit pass. No new features are in v6; the deliverable is the discipline.

## Audit completion (2026-05-07)

All sixteen groups (A–H plus J–Q) carry "citation authored" status for every tile. `test/unit/citations.test.js` enforces this with a "v6 audit complete: every tile id in app.js has a CITATIONS entry" coverage check that fails the build if a future tile is added without a structured citation. Per-group governance assertions ensure every tile uses the spec §2.5 variant verbatim. The structured §3 reference block renders under every audited tile via the dynamic `citations.js` import in `app.js`, and the "Copy answer with full reference block" button writes the §3 plain-text form to the clipboard via `clipboard.copyText`.

## Per-group status reconciliation (2026-05-12)

The sixteen per-group `Status:` lines above were updated from `in progress` to `complete`. Each group has had its citations.js entries authored, the per-tile §3 reference block content written, and the renderer-side `renderCitationBlock` UI wired for many months; the `in progress` markers were carryovers from the initial-landing language ("Awaiting reference-block UI component to be wired through the renderer") that never got flipped after the UI shipped. The two affected entries (Group A line and Group B line) had that trailing sentence replaced with a description of the now-shipped wiring. No code or citation content changed in this reconciliation — only the status keyword and the explanatory tail on those two entries.

### Group R - Accounting, Tax, and Small-Business (calc-accounting.js) - priority 12 (v5)

Status: **complete** - citations.js populated for all twelve Group R tiles (utilities 234-245). Cites IRS Publication 946 (MACRS Tables A-1) by table number only; IRS Publication 15-T (percentage method) by name; IRS annual revenue procedures and IRC 179 / 168(k) for the Section 179 cap and bonus depreciation phase-down; SSA annual wage-base announcement and IRC 3101(b)(2) for SE tax; IRC 6654(d)(1)(B) and Form 1040-ES schedule for estimated tax; standard amortization formula and CVP / working-capital identities for breakeven, CCC, inventory turnover; U.S. Census ARTS / SBA medians for industry benchmarks; IRS standard mileage rate notice for the mileage roll-up. Every tile carries the spec-v5.md tax-law governance variant ("Estimate only. Tax law changes.") via `GOVERNANCE.tax` (or `GOVERNANCE.small_business` for the pure-arithmetic CVP / loan tiles).

### Group S - Legal Plain-English and Statutory Math (calc-legal.js) - priority 13 (v5)

Status: **complete** - citations.js populated for all nine Group S tiles (utilities 246-254). Cites per-state judgment-interest statute (e.g., Cal. Civ. Proc. Code 685.010) by section number; Story v. Livingston (1839) for the U.S. Rule on partial payments; Fed. R. Civ. P. 6(a)(1) / (a)(2) / (a)(3) / (a)(6) for court-day computation; per-state code section for SOTL / landlord-tenant / small-claims; 29 USC 207 / 203(m) FLSA + per-state minimum-wage statute; IRS Rev. Rul. 87-41 (20-factor test) and Dynamex Operations W. v. Superior Court (ABC test). Reference pages (contract clauses, lease terms) carry original-creative-work attribution. Every tile carries the spec-v5.md legal-information governance variant via `GOVERNANCE.legal`.

### Group T - Bench Science and Laboratory Math (calc-lab.js) - priority 14 (v5)

Status: **complete** - citations.js populated for all ten Group T tiles (utilities 255-264). Cites IUPAC Standard Atomic Weights 2021 by year; CRC Handbook 95th ed. and Good et al. Biochemistry 5(2):467 (1966) for buffer pKa values; manufacturer-published rotor specifications (Eppendorf, Beckman Coulter, Thermo Fisher) for centrifuge radii. First-principles formulas (C1V1=C2V2, RCF, Beer-Lambert, Henderson-Hasselbalch, hemocytometer chamber geometry) cite by name only. Every tile carries the spec-v5.md bench-science governance variant via `GOVERNANCE.lab`.

### Group H v5 extensions - Knowledge References (calc-references.js) - priority 15 (v5)

Status: **complete** - citations.js populated for the four v5 reference tiles (utilities 265-268). IRS Form Quick-Read Index cites each form by IRS-published number and title; Sales Tax Nexus cites each state's department-of-revenue statute or administrative code post-Wayfair (138 S. Ct. 2080, 2018); OSHA Recordkeeping cites 29 CFR 1904 by section; Lab Safety Quick-Read cites UN GHS Rev. 9 pictograms and OSHA HazCom 29 CFR 1910.1200. Per-id notice overrides route `irs-form-index` to `GOVERNANCE.tax` and `sales-tax-nexus` to `GOVERNANCE.legal`; the lab-safety tile carries an inlined hardened safety notice on top of `GOVERNANCE.worker_safety`.

### v5 expansion close (2026-05-08)

Tile counts at v5 audit close: 271 spec-numbered utilities (was 233); 35 new visible tiles across Groups R, S, T, and H extensions plus the v5 platform features (utilities 269-271 are platform-level, not visible tiles). Every new tile has a `CITATIONS` entry; every entry covers the six §3 fields; every entry uses one of the eighteen GOVERNANCE variants (the original fifteen plus three new v5 variants: `tax`, `small_business`, `legal`, `lab`). The `test/unit/citations.test.js` "v6 audit complete" coverage check fails the build if any future tile is added without a structured citation, so v5 expansion held the v6 audit invariant throughout.

Tile counts at audit close: 233 spec-numbered utilities; 221 visible tiles in the catalog (a few v3 utilities ship as platform affordances rather than tiles). Every visible tile has a `CITATIONS` entry; every entry covers the six §3 fields; every entry uses one of the fifteen GOVERNANCE variants verbatim.
