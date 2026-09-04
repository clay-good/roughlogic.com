# Data Sources

Every dataset shipped in data/ is listed here with its canonical source, license or public-domain status, update cadence, and shard layout. New datasets are added to this file in the same pull request that adds them.

The principle from spec.md section 5 governs every entry: the data is either public domain, a physical or mathematical fact (not copyrightable), a U.S. government publication, a manufacturer technical specification cleared for redistribution, or original creative work by the project author. Licensed code text (NEC, IPC, IRC, ASHRAE Fundamentals, ACCA Manual J, NFPA standards) is never bundled.

## What the date fields mean

Two dates on a shard answer two different questions, and only one of them is the build's to answer.

| Field | Means | Written by |
| --- | --- | --- |
| `fetched` | This file was regenerated on this date. | `scripts/build-data.mjs`, every run. |
| `verified_on` | A human last checked this value against the publisher on this date. | [`scripts/sources-cycle.json`](../scripts/sources-cycle.json), for every shard that file names. |

`verified_on` used to be written by the generator as the build date, which meant every refresh re-certified the whole catalog and the stamp could not go stale. It is now taken from the ledger's `last_verified` -- the **oldest** entry when more than one row names the same file, because a file is only as verified as its least-verified part -- and `check-verified-on-ledger` fails any tracked shard whose stamp disagrees. **Do not hand-edit a tracked shard's `verified_on`**: update the ledger row to record what was actually checked, then re-run `npm run data:refresh`.

A folder's `manifest.json` carries an `edition` string that names the same kind of date in prose. Those are committed constants, not build dates, for the same reason -- with one exception: `data/historical` says *"built <date>"*, and that series really is materialized at build time. `check-manifests` fails any manifest whose `edition` is not exactly what [`scripts/build-data.mjs`](../scripts/build-data.mjs) produces, so the wording lives in the generator and nowhere else.

`check-verified-on-ledger` prints this set on every run and ratchets it, so a sixth unbacked stamp fails the build. Five shards outside the ledger still carry a generator-written `verified_on`: `data/accounting/inventory-benchmarks.json`, `data/cross/glossary.json`, and the three under `data/lab/`. Adding a ledger row for each is open maintainer work, and the way to close one is to read the source and record what was read -- not to re-stamp. `macrs-tables.json` and `estimated-tax-due-dates.json` were closed that way on 2026-09-03 against `irs.gov/pub/irs-pdf/p946.pdf` and `f1040es.pdf`; both PDFs fetch cleanly, so that check is repeatable in minutes.

## Standards the site cites

[`scripts/sources-cycle.json`](../scripts/sources-cycle.json) tracks the published edition of every standard this site cites. `check-citation-freshness` compares those rows against the `edition` string of each folder manifest, so **a row is only checked if some manifest names it** -- and six rows named nothing, which is why four superseded editions went undisclosed. Where a bundled value follows an older edition on purpose, the manifest says so in these words:

> IMC 2021 cited by section number (IMC 2024 is the current published edition; bundled values follow 2021 and the tile citations disclose it)

A standard the tiles cite but no shard holds data from has no manifest to appear in. Those rows carry `citation_only: true` and a `citation_only_reason`, and the gate fails if the reason is missing. Adding a row without either a manifest mention or that exemption fails the build rather than passing silently.

## Datasets

### data/physical-constants/constants.json

- Source: National Institute of Standards and Technology (NIST) Reference on Constants, Units, and Uncertainty.
- Canonical URL: https://physics.nist.gov/cuu/Constants/
- License: U.S. government publication, public domain.
- Cadence: Annual review. Values rarely change.
- Shard layout: A single object keyed by symbol (e.g., "c", "h", "k_B") with value, unit, uncertainty, and source URL.

### data/physical-constants/material-properties.json

- Source: Public physics and engineering reference works for density, specific heat, thermal conductivity, electrical resistivity, and viscosity of common materials.
- License: Physical facts, not copyrightable.
- Cadence: Annual review.
- Shard layout: One entry per material with property name, value, unit, and reference.

### data/electrical/conductor-properties.json

- Source: Resistivity of copper and aluminum from NIST and standard physics references; AWG cross-sectional areas from ASTM B258 (specifications publicly summarized; the dimensional facts are not copyrightable).
- License: Physical facts.
- Cadence: Annual review.
- Shard layout: AWG size keyed; circular mils, mm^2, resistance per kft at 20 C, and temperature coefficient.

### data/electrical/ampacity-physics.json

- Source: First-principles derivation in docs/derivations.md from conductor resistance and insulation temperature rating.
- License: Original work; physical derivation.
- Cadence: As the underlying physics references update.
- Shard layout: Insulation rating keyed (60, 75, 90 C) with the parameters of the heat-balance computation.

### data/electrical/motor-fla.json

- Source: Compiled from manufacturer technical bulletins for typical NEMA motors. Each entry attributes its publishing manufacturer.
- **Not the NEC table values.** NEC 430.6(A)(1) requires the Table 430.247-430.250 value -- not the nameplate, and not a manufacturer figure -- for sizing conductors and overcurrent protection, and 430.6(A)(2) requires the nameplate FLA for the overload device. Those tables are licensed text this project does not reproduce, so the tile bundles typical published figures for a magnitude check and carries a limitation banner saying exactly this. The citation said the bundled figures stood "in lieu of" the tables until 2026-09-02, which is the opposite of what 430.6 says.
- License: Manufacturer technical data with attribution; verify each bulletin permits redistribution before adding.
- Cadence: Annual review.
- Shard layout: Horsepower keyed, with voltage and phase variants and the publishing manufacturer.

### data/electrical/demand-factors.json (v2)

- Source: Standard residential demand factors. NEC sections 220.42, 220.54, 220.55, and 220.82 referenced by section number; values reflect long-standing engineering practice.
- License: Engineering-practice consensus values; no NEC table text is bundled.
- Cadence: Annual review.
- Shard layout: Flat object with constants (general lighting W/ft^2, small-appliance W, demand factor break points) and the standard service ampacities array.

### data/electrical/lighting-density.json (v2)

- Source: Public engineering benchmarks for lighting power density. ASHRAE 90.1 referenced by name only.
- License: Engineering-practice consensus values; no standard table text is bundled.
- Cadence: Annual review.
- Shard layout: Object keyed by occupancy class with W/ft^2 benchmark.

### data/electrical/cable-bend-radius.json (v3)

- Source: Manufacturer technical bulletins (Southwire, AFC Cable Systems, Belden, Corning); each row attributes the publishing manufacturer.
- License: Manufacturer technical data, used with attribution.
- Cadence: Quarterly attribution-and-link recheck.
- Shard layout: List of cable types with multiple-of-OD and attribution string.

### data/electrical/poe-classes.json (v3)

- Source: IEEE 802.3 publication metadata (cited by name only); Cat5e / Cat6 / Cat6A loop resistance from Belden / CommScope manufacturer benchmarks at 20 C; copper alpha 0.00393 per K.
- License: IEEE cited by name; manufacturer values attributed.
- Cadence: Quarterly attribution-and-link recheck.
- Shard layout: classes[] (af / at / bt3 / bt4 with pse_W, pd_min_W, pse_min_V), cable_loop_ohms_per_100m, copper_alpha_per_K.

### data/electrical/conductor-c-values.json (v7)

- Source: Eaton/Bussmann SPD published point-to-point C-value table. Cited by Eaton/Bussmann SPD by name only; tariff text not reproduced.
- License: Manufacturer-attributed numeric values.
- Cadence: Annual recheck.
- Shard layout: Per-conductor C-values keyed by class (copper_steel / copper_nonmag / aluminum_steel) and AWG / kcmil size.

### data/electrical/nema-mg1-code-letters.json (v7)

- Source: NEMA MG-1 (Motors and Generators) code-letter starting-kVA-per-HP table. Cited by NEMA MG-1 by name only.
- License: Engineering-practice consensus values.
- Cadence: Annual recheck (NEMA MG-1 tables stable across decades).
- Shard layout: per_hp keyed by code letter A through V, lower bound of each range.

### data/electrical/dwelling-demand.json (v7)

- Source: NEC 2023 Article 220 (Branch-Circuit, Feeder, and Service Load Calculations) by section. Numeric thresholds only; no code text reproduced.
- License: Numeric thresholds derivable from public AHJ outreach materials.
- Cadence: Annual recheck against NEC publication cycle.
- Shard layout: VA-per-ft² lighting density, small-appliance / laundry per-circuit values, general-demand breakpoints, fixed-appliance demand %, dryer minimum, range breakpoints, largest-motor adder %, and service-ladder ampacities.

### data/electrical/conduit-fill-tables.json

- Source: Conductor cross-sectional area per insulation type from manufacturer cable catalogs and ASTM dimensions; the threshold percentages (40, 31, 53) are referenced, not reproduced.
- License: Dimensional facts; thresholds cited.
- Cadence: Annual review.

### data/construction/rebar-unit-weights.json (v7)

- Source: ASTM A615 nominal weights and bar diameters; CRSI Manual of Standard Practice. Cited by name only; bend-detail figures not reproduced.
- License: Engineering reference values.
- Cadence: Annual recheck (values stable across decades).
- Shard layout: `unit_weights_lb_per_ft` keyed by bar size (#3-#11); `bar_diameters_in` keyed by bar size; `bend_allowance_in_diameters` for the five bend types.

### data/construction/apa-span-ratings.json (v7)

- Source: APA - The Engineered Wood Association published span-rating tables. Cited by APA name only; numeric load tables redistributed under APA's technical-bulletin reuse policy.
- License: Manufacturer-association numeric values.
- Cadence: Annual recheck.
- Shard layout: `ratings` keyed by span-rating (24/0, 24/16, 32/16, 40/20, 48/24); each carries roof and floor (or null) entries with allowable spacing, live-load, and total-load psf.

### data/construction/helical-pile-kt.json (v7)

- Source: ICC-ES AC358 (helical foundation systems) by name; manufacturer technical bulletins (CHANCE, Magnum, Ram Jack, AB Chance) by name.
- License: Manufacturer-attributed engineering values.
- Cadence: Quarterly recheck.
- Shard layout: `values` keyed by shaft type (Kt, description).

### data/construction/aci-211-curves.json (v3)

- Source: ACI 211 published curve points (cited by name only). Interpolated public-domain reference points for water-to-cement ratio by target strength and exposure class.
- License: Cited by name; values are engineering reference points.
- Cadence: Annual review.

### data/construction/bolt-grades.json (v3)

- Source: ASTM / SAE proof-load benchmarks (cited by name only). Tensile stress areas per ANSI/ASME B1.1 short form.
- License: Cited by name; values are engineering reference points.
- Cadence: Annual review.

### data/construction/sfm-table.json (v3)

- Source: Engineering consensus speeds and feeds (Machinery's Handbook equivalent values). Public engineering practice.
- License: Engineering-practice consensus.
- Cadence: Annual review.

### data/construction/aws-deposition.json (v3)

- Source: AWS deposition-efficiency benchmarks (cited by name only). Steel density 0.283 lb/in^3.
- License: Cited by name; values are engineering reference points.
- Cadence: Annual review.

### data/plumbing/pipe-elastic-properties.json (v7)

- Source: Pipe Young's-modulus values per material from public engineering references; water bulk modulus and density from NIST. Schedule 40 D / t dimensions from ASTM A53 / ASTM D1785 nominal pipe sizes.
- License: Engineering reference values; physical-fact constants.
- Cadence: Annual recheck.
- Shard layout: `values` keyed by material (E_psi, description); `fluids` keyed by water / glycol_30 / glycol_50 (K_psi, rho_slug_ft3, label); `schedule_40_dims` keyed by trade size.

### data/plumbing/pump-curves.json (v7)

- Source: Pump head-vs-flow polylines. Replace with manufacturer-attributed curves before relying on for selection. Composite engineering-practice curves shipped where redistribution-cleared manufacturer curves are not available.
- License: Manufacturer-attributed numeric values per row (when supplied) or composite engineering practice.
- Cadence: Quarterly recheck.
- Shard layout: `curves` keyed by pump model id, each carrying name / attribution / points[gpm, head_ft, eff].

### data/plumbing/thermal-expansion-coefficients.json (v7)

- Source: Per-material alpha (1/F), Young's modulus E (psi), and allowable stress S_a (psi). Cited by ASME B31.1 / B31.9 (guided-cantilever expansion-loop method) and manufacturer technical bulletins by name.
- License: Engineering reference values; manufacturer-attributed where applicable.
- Cadence: Annual recheck.
- Shard layout: `values` keyed by material (alpha_per_F, E_psi, S_a_psi, description).

### data/plumbing/runoff-coefficients.json (v3)

- Source: Public engineering practice (cited generally). Long-standing engineering consensus values keyed by surface type.
- License: Engineering-practice consensus.
- Cadence: Annual review.

### data/plumbing/manning-roughness.json (v3)

- Source: Public engineering tables (Manning's n by pipe material). Engineering consensus values.
- License: Engineering-practice consensus.
- Cadence: Annual review.

### data/plumbing/glycol-curves.json (v3)

- Source: Manufacturer freeze-point curves (Dow Dowfrost, Dow Dowtherm SR-1 technical bulletins). Each glycol type attributes the publishing manufacturer.
- License: Manufacturer technical data, used with attribution.
- Cadence: Quarterly attribution-and-link recheck.

### data/plumbing/backflow-curves.json (v3)

- Source: Manufacturer-published pressure-loss curves (Watts Series 909 RP, 909 DCV, 800 PVB, Series 8 AVB technical bulletins). Each device class attributes the publishing manufacturer.
- License: Manufacturer technical data, used with attribution.
- Cadence: Quarterly attribution-and-link recheck.

### data/plumbing/pipe-properties.json

- Source: Nominal pipe size dimensions per ASTM and manufacturer catalogs; Hazen-Williams roughness coefficients from public engineering references.
- License: Dimensional facts.
- Cadence: Annual review.

### data/plumbing/fixture-units.json

- Source: Hunter's Curve method as published in public-domain plumbing engineering texts. Fixture unit values are the consensus engineering values cited to public sources, not copied from a current code edition.
- License: Public-domain methodology.
- Cadence: Annual review.

### data/plumbing/material-expansion.json (v2)

- Source: Linear thermal expansion coefficients (1/F) from NIST and pipe manufacturer technical bulletins.
- License: Physical / material facts.
- Cadence: Annual review.
- Shard layout: Object keyed by material with alpha (1/F).

### data/plumbing/septic-rules.json (v2)

- Source: U.S. EPA on-site wastewater treatment manual and state-published septic sizing rules.
- License: U.S. government publication / state publications.
- Cadence: Annual review.
- Shard layout: Flat object with daily flow per bedroom, tank floor, tank multiplier.

### data/plumbing/gas-pipe-capacity.json

- Source: Gas-flow capacity computed from Spitzglass, Weymouth, or IGT formulas (public engineering equations) using published gas properties.
- License: Public formulas.
- Cadence: Annual review.

### data/hvac/refrigerants.json

- Source: Manufacturer-published refrigerant pressure-temperature tables (DuPont, Honeywell, Chemours, Arkema). Each entry attributes the publishing manufacturer.
- License: Manufacturer technical data with attribution.
- Cadence: Annual review.
- Shard layout: Refrigerant ID keyed (R-410A, R-32, R-22, R-134a, R-404A, R-407C) with P-T pairs and source.

### data/hvac/duct-friction.json

- Source: Standard duct surface roughness values from public engineering references; Darcy-Weisbach inputs.
- License: Physical facts.
- Cadence: Annual review.

### data/hvac/charge-per-foot.json (v2)

- Source: Manufacturer line-set charge tables (oz per foot per refrigerant per line diameter). Each entry attributes the publishing manufacturer.
- License: Manufacturer technical data with attribution.
- Cadence: Annual review.
- Shard layout: Object keyed by refrigerant id then line diameter with oz/ft.

### data/hvac/equivalent-lengths.json (v2)

- Source: Public engineering equivalent-length tables for common fittings and valves.
- License: Engineering-practice consensus values.
- Cadence: Annual review.
- Shard layout: Object keyed by fitting type then nominal diameter (in) with equivalent feet.

### data/hvac/insulation.json (v2)

- Source: Public engineering reference values for insulation thermal conductivity (BTU * in / hr / ft^2 / F) and the outside-film coefficient for still air on a horizontal pipe.
- License: Material property facts.
- Cadence: Annual review.
- Shard layout: Object keyed by insulation material with k value plus the outside-film coefficient.

### data/hvac/duct-roughness.json (v7)

- Source: Absolute roughness values for common duct materials. Engineering-practice consensus values; ASHRAE Handbook Fundamentals duct-design chapter cited by name.
- License: Engineering reference values.
- Cadence: Annual recheck.
- Shard layout: `values_ft` keyed by material (galv smooth / general; flex extended / compressed; fiberboard; flex metal).

### data/hvac/duct-fittings.json (v7)

- Source: Fitting loss-coefficient library. Engineering-practice consensus values; ASHRAE Handbook Fundamentals fittings tables cited by name.
- License: Engineering reference values.
- Cadence: Annual recheck.
- Shard layout: `C_o` keyed by fitting kind (elbow / tee / reducer / damper / filter / diffuser / grille).

### data/hvac/refrigerant-pt-tables.json (v7)

- Source: Manufacturer-attributed refrigerant pressure-temperature tables for R-410A, R-32, R-454B, R-22 (legacy reference), and R-134a. Cited by manufacturer name (DuPont, Honeywell Solstice, Chemours Opteon, Arkema Forane).
- License: Manufacturer-attributed numeric values. Pressures in psia; psig converts via psia = psig + 14.696.
- Cadence: Quarterly recheck.
- Shard layout: `tables` keyed by refrigerant id; each table is an array of `{psia, T_F}` rows.

### data/hvac/insulation-k-values.json (v7)

- Source: Manufacturer-attributed thermal-conductivity k values for common pipe / duct insulation types. ASHRAE Handbook Fundamentals chapter 25 cited by name.
- License: Manufacturer-attributed numeric values.
- Cadence: Quarterly recheck.
- Shard layout: `values` keyed by insulation type (k_BTU_in_per_hr_ft2_F, description).

### data/hvac/affinity-laws.json (v3)

- Source: Classical fan and pump affinity laws (Hydraulic Institute / AMCA by name). Example shard demonstrating the Q1/Q2 = N1/N2 cube-square-linear ratios.
- License: Engineering-practice consensus values; physics formulas free in published texts.
- Cadence: Annual review (formulas stable; example values may be tuned).



- Source: Public engineering (fan affinity laws). Mostly an example shard with tested motor/fan data points.
- License: Engineering-practice consensus.
- Cadence: Annual review.

### data/hvac/baseboard-output.json (v3)

- Source: Manufacturer baseboard technical bulletins (Slant/Fin Fine Line 30 typical 1 gpm; generic high-output reference). Each model attributes the publishing manufacturer.
- License: Manufacturer technical data, used with attribution.
- Cadence: Quarterly attribution-and-link recheck.

### data/hvac/geothermal-soil.json (v3)

- Source: DOE technical reports on ground-source heat pump design (public domain). IGSHPA-style benchmarks for BTU per linear foot of loop.
- License: Public domain.
- Cadence: Annual review.

### data/hvac/climate-data.json

- Source: NOAA design temperature data by location and ASHRAE climate zone.
- Canonical URL: https://www.ncei.noaa.gov/
- License: U.S. government publication, public domain.
- Cadence: Monthly refresh; values change slowly.

### data/restoration/psychrometrics.json

- Source: Psychrometric equations from physics; constants for water vapor.
- License: Physical facts.
- Cadence: Annual review.

### data/restoration/water-classes.json

- Source: Original plain-English summaries of IICRC S500 categories and classes. The IICRC standard itself is licensed and is not reproduced.
- License: Original work.
- Cadence: Annual review against the latest IICRC consensus.

### data/restoration/drying-times.json

- Source: Original plain-English notes on typical drying behavior of common building materials.
- License: Original work.
- Cadence: Annual review.

### data/restoration/hepa-loading.json (v2)

- Source: Typical commercial HEPA pre-filter loading values from manufacturer technical bulletins.
- License: Engineering-practice consensus values.
- Cadence: Annual review.
- Shard layout: Loading rate (g per CFM-hour) per particulate category (low/medium/high) plus a default capacity in grams.

### data/restoration/mold-conditions.json

- Source: Public mold-growth research literature summarized in original plain English.
- License: Original work.
- Cadence: Annual review.

### data/construction/lumber-properties.json

- Source: Allowable bending stress, modulus of elasticity, and other species and grade properties from public engineering references and lumber grading agency published basic-design values.
- License: Material property facts; cite the underlying mechanics.
- Cadence: Annual review.

### data/construction/soil-bearing.json (v2)

- Source: U.S. Geological Survey soil engineering references and IBC Table 1806.2 mirrored values.
- License: U.S. government / engineering-practice consensus.
- Cadence: Annual review.
- Shard layout: Object keyed by soil class with allowable psf.

### data/construction/wind-snow-zones.json (v2)

- Source: NOAA basic wind speeds and ground snow loads (public domain). Public ASCE 7 formulas q = 0.00256 * V^2 and Pf = 0.7 * Ce * Ct * Is * Pg.
- License: U.S. government data; public formulas.
- Cadence: Annual review.
- Shard layout: Object with basic wind speeds (mph) and ground snow loads (psf) keyed by region.

### data/construction/concrete-mixes.json

- Source: Standard concrete mix proportions and yields from public engineering references.
- License: Engineering practice.
- Cadence: Annual review.

### data/construction/span-derivations.json

- Source: First-principles outputs of the lumber-span calculator. The shipped values are the outputs of our derivation, not a reproduction of the AWC table.
- License: Original work derived from physics and material properties.
- Cadence: Regenerated when material properties or methodology change.

### data/fire/hose-friction.json

- Source: National Fire Academy training materials. CQ^2L coefficients per hose diameter.
- License: U.S. government publication, public domain.
- Cadence: Annual review.

### data/fire/fire-flow-formulas.json

- Source: ISO Public Protection Classification published formulas; verify each formula's licensing before bundling. Where in doubt, derive from first principles plus a published structural-fire-load reference.
- License: Public formulas.
- Cadence: Annual review.

### data/crosswalks/unit-conversions.json

- Source: NIST Special Publication 811 (Guide for the Use of the International System of Units).
- License: U.S. government publication, public domain.
- Cadence: Annual review.

### data/crosswalks/irs-mileage.json (v2)

- Source: IRS-published standard mileage rate (U.S. government publication).
- License: U.S. government publication, public domain.
- Cadence: Annual update, and re-checked whenever the IRS issues a mid-year revision. The bundled value is $0.76/mi, the business rate effective 2026-07-01 (IR-2026-29); the first half of 2026 was $0.725/mi (Notice 2026-10).
- Shard layout: Flat object with rate per mile in dollars, plus `edition`, `effective_from` and `verified_on` naming the period the value covers. The rate is an input on the tile, so miles driven in an earlier period are entered at that period's rate.

### data/crosswalks/gsa-perdiem.json (v2)

- Source: U.S. General Services Administration per-diem rates (public domain).
- **Per-state, which is not how GSA publishes.** GSA sets per-diem by locality (county or city): one standard CONUS rate plus several hundred non-standard localities set above it. The bundled values approximate standard CONUS, raised where a state is broadly above it. A traveller to a non-standard locality is owed more than this tile shows, so the tile carries a limitation banner and its citation points at the GSA lookup.
- **M&IE tiers are GSA's published values; the tier a state sits in is the approximation.** FY2026 tiers are $68 / $74 / $80 / $86 / $92 with standard CONUS at $110 lodging / $68 M&IE. The shard carried the FY2023 tiers ($64 / $69 / $74 / $79 / $84) until 2026-09-02 while stamped as the FY2026 cycle, which ran every reader $4 to $8 a day low.
- License: U.S. government publication, public domain.
- Cadence: Annual update (federal fiscal year).
- Shard layout: Object keyed by state (50 + DC) with lodging and m_and_ie rates.

### data/crosswalks/fall-protection-benchmarks.json (v7)

- Source: Manufacturer connector-decel benchmarks (3M / Capital Safety, MSA, Honeywell-Miller). Cited by manufacturer name; OSHA 29 CFR 1926.502 by section.
- License: Manufacturer-attributed numeric values.
- Cadence: Quarterly recheck.
- Shard layout: `values` keyed by connector type (decel_ft, free_fall_ft, description).

### data/fire/iso-nff.json (v7)

- Source: ISO Public Protection Classification (PPC) Schedule by name. Numeric F factors and Oi multipliers only; the surrounding ISO PPC commentary is not reproduced.
- License: Engineering-practice consensus values.
- Cadence: Annual recheck.
- Shard layout: `construction_F` keyed by class 1-6 (F, label); `occupancy_Oi` by combustible category; `rounding` (floor/cap/increment in gpm).

### data/crosswalks/state-tax-rates.json

- Source: Each state revenue department's published rate.
- License: Government-published rates.
- Cadence: Monthly refresh; states change rates occasionally.

### data/crosswalks/niosh-coupling.json (v3)

- Source: NIOSH 1991 Lifting Equation - coupling-multiplier table from the NIOSH Applications Manual for the Revised NIOSH Lifting Equation.
- License: U.S. government publication, public domain. Free at cdc.gov/niosh.
- Cadence: Annual review; the equation has been stable since 1991 publication.

### data/crosswalks/heat-cold-stress.json (v3)

- Source: NWS heat-index formula and OSHA cold-stress / wind-chill values. Public engineering formulas.
- License: U.S. government publications, public domain. Free at weather.gov and osha.gov.
- Cadence: Annual review.

### data/crosswalks/osha-trench.json (v3)

- Source: OSHA 29 CFR 1926 Subpart P trench-sloping requirements. Cited by section number.
- License: U.S. government publication, public domain. Free at ecfr.gov.
- Cadence: Annual review.

### data/summaries/v2-references.json (v2)

- Source: Original plain-English summaries written by the project author for v2 reference utilities. NEC, IPC, and similar code documents referenced by section number only; no code text reproduced.
- License: MIT, original creative work.
- Cadence: Updated as v2 reference content changes.

### data/summaries/summaries.json

- Source: Original plain-English summaries written by the project author for every utility.
- License: MIT, original creative work.
- Cadence: Updated as utilities change.

### data/summaries/v3-references.json (v3)

- Source: Original plain-English summaries written by the project author for v3 reference utilities (hand signals, OSHA Top 10, LOTO, defensible space, FEMA P-320 storm shelter, START triage). Codes and frameworks referenced by name and section number only; no source text reproduced.
- License: MIT, original creative work.
- Cadence: Updated as v3 reference content changes.

### data/trucking/dim-divisors.json (v4)

- Source: Carrier-published dimensional-weight divisors (UPS, FedEx, USPS, DHL, LTL freight). Cited by carrier name only; tariff text not reproduced.
- License: Carrier-attributed numeric values.
- Cadence: Semi-annual recheck (carriers update at the start of each calendar year).
- Shard layout: Object keyed by carrier-tier with divisor (in^3 / lb) and attribution string.

### data/trucking/reefer-burn.json (v4)

- Source: Manufacturer technical bulletins (Thermo King SB-series, Carrier Transicold Vector). Each entry attributes the publishing manufacturer.
- License: Manufacturer-attributed engineering benchmarks.
- Cadence: Quarterly recheck.
- Shard layout: Object keyed by mode (continuous / cycle) with GPH benchmark and ambient-factor object.

### data/historical/commodities/*.json (v4, utility 233)

- Source: U.S. government publications. BLS Producer Price Index series for industrial commodities (copper WPU10250115, aluminum WPU102301, structural steel WPU101707, rebar WPU101706, framing lumber WPU081, OSB WPU0832, drywall WPU1322, asphalt WPU0581). EIA retail series for diesel (PET.EMD_EPD2D_PTE_NUS_DPG.M), gasoline (PET.EMM_EPMR_PTE_NUS_DPG.M), and natural gas city-gate (NG.N3050US3.M). USDA NASS / FRED series for wheat (PWHEAMTUSDM), corn (PMAIZMTUSDM), and soybeans (PSOYBUSDM). Series IDs are reproduced verbatim; the prose / methodology of the issuing publication is not.
- License: U.S. government publications, public domain.
- Cadence: Monthly refresh during the build. The build fails if any shard's latest point is more than 30 days behind the build date.
- Shard layout: One file per commodity under `data/historical/commodities/`. Each shard carries `agency`, `series_id`, `units`, `basis` (`"modeled"`), `built` / `fetched` (the build date), `cadence` ("monthly"), and a `points` array of `{date: "YYYY-MM", value}` entries covering the last 36 months.
- **The points are modeled, not transcribed.** The build fetches nothing (`check-build-hermetic`), so these shards cannot be downloads. A maintainer commits a recent reading per series plus a drift and a fixed monthly pattern, and `buildHistoricalShard` materializes 36 backdated points from them at build time. The series IDs are real and named so a reader can look up the series of record; the individual monthly values are not those of the published series. The tile, its citation and the shard `source` all say so. Read the tile for magnitude and spread, never for a particular month.
- Privacy: No runtime fetch. The tool view loads the same-origin shard on first commodity selection and computes percentile bands client-side. No telemetry, no alerts, no subscriptions.

### data/accounting/*.json (v5, utilities 234-245)

- Source: IRS publications (Pub 946 MACRS tables, Pub 15-T percentage method, annual Rev. Proc. for the Section 179 cap, Form 1040-ES due dates, annual standard-mileage-rate notice). SSA annual wage-base announcement. U.S. Census Annual Retail Trade Survey (ARTS) and SBA published industry medians for inventory benchmarks.
- License: Public domain (federal publications).
- Cadence: Annual recheck each January for the IRS-driven shards (refresh when the IRS posts the new tax year). Quarterly recheck for inventory benchmarks.
- Shards: `macrs-tables.json` (per-class-life percentages), `section-179-limits.json` (per-year cap / phase-out / bonus pct; 2025 onward follows the One Big Beautiful Bill Act -- $2,500,000 / $4,000,000 for 2025 and $2,560,000 / $4,090,000 for 2026, with bonus a permanent 100% for property acquired after 2025-01-19 -- not the TCJA phase-down), `se-tax-parameters.json` (per-year SS wage base + Additional Medicare threshold by filing status; the 2026 base is $184,500 per IRS Topic 751 and the SSA COLA announcement), `estimated-tax-due-dates.json` (per-year four ISO dates), `standard-mileage-rates.json` (per-year business / medical / charitable rates; a year the IRS revises mid-year carries a `periods` list, as 2026 does), `inventory-benchmarks.json` (per-industry turnover median), `pub-15-t-tables.json` (single-filer annualized brackets).
- `pub-15-t-tables.json` carries `edition: 2025` and `verified_on: 2025-12-01`, the date the ledger records for it. It previously read `verified_on: 2026-09-02` -- a build date, not a verification -- over the same 2025-edition brackets. The tile discloses the year and that the brackets are single-filer and illustrative; the honest stamp is the point, not a claim that the figures are current.
- Privacy: No runtime fetch. All shards bundled at build time.

### data/legal/*.json (utility 266)

- Post-v107 scope. Spec-v107 retired the Legal group (S) under the trades-only charter, and the follow-up data cut removed the six Legal-only shards (judgment-interest, court-holidays, state-minimum-wage, statute-of-limitations, landlord-tenant-notice, small-claims). Only the post-Wayfair sales-tax shard survives, because its tile moved to the reference group (Group H) rather than being cut: `sales-tax-nexus` in `calc-references.js`. The folder is kept (rather than renamed) so existing shard hashes and the `data/integrity.json` manifest entry stay stable.
- Source: Per-state department of revenue guidance for post-Wayfair economic-nexus thresholds (sales and transaction counts). Each entry links the state's published guidance by URL and stamps a `verified_on` date; no statute text reproduced.
- License: U.S. and state government publications, public domain. Original plain-English summaries authored by the project (MIT licensed).
- Each row carries a `combine` field saying whether the two thresholds are joined by OR or by AND. **New York and Connecticut are conjunctive** -- both must be met -- and the tile prints the rule, because stating the wrong one inverts the answer for a seller over the dollar threshold with few transactions. `null` means the state has no transaction prong.
- **Re-checked 2026-09-03 (14 of 47 rows):** Eight were read against the state's own code text and found **correct**, needing no change -- OH, VA, MN, NE, WV, VT, HI, DC -- with their citations tightened to the subsection that actually carries the two thresholds. Finding a row right is a verification too, and the only kind that lets a stamp move. The other six: LA, UT, IL and KY had transaction thresholds their legislatures repealed (2023 La. Acts 375 eff. 2023-08-01; Utah S.B. 47 eff. 2025-07-01; Ill. P.A. 104-0006 eff. 2026-01-01; 2026 Ky. Acts ch. 161 eff. 2026-08-01). NY and CT gained their conjunctive rule. The remaining 33 rows keep `verified_on: 2025-01-15` and the folder keeps warning, because re-stamping an unread row is the failure the freshness gates exist to prevent. The 7 unread rows that still carry a transaction prong are the highest-yield place to look next: AR, GA, MD, MI, NV, NJ, RI. **New Jersey was deliberately left unstamped**: only the 2018 session law (P.L.2018, c.132) was reachable, and an enacting text does not prove the section has not been amended since. justia.com and dfa.arkansas.gov refuse automated fetches, and the Maryland and Rhode Island pages tried do not carry the threshold text: the trend since 2023 is states repealing it. Read the enrolled act or the code section, not a summary chart -- state bill PDFs bracket deleted text, which is unambiguous.
- Cadence: Quarterly recheck against the state source page (oldest `verified_on` first). **Currently past that cadence and acknowledged as such:** 33 of the 47 rows still carry `verified_on` 2025-01-15, and `data/legal/manifest.json` holds a `staleness_note` saying so. That note is **generated from the stamps** by `scripts/staleness-notes.mjs`, not hand-written: it went false the day the first fourteen rows were re-verified and still told readers of the public manifest that none had been. `check-manifests` warns from one cadence period and fails at four unless the manifest's note is exactly what the generator produces from the current stamps -- a note that has drifted no longer buys the folder a pass. The tile prints each row's citation and verified-on date and tells the reader to confirm with the state before filing.
- Shards: `sales-tax-nexus.json` (the sole surviving shard; 47 rows -- the 46 sales-tax states plus DC, with DE / MT / NH / OR omitted as no-tax states). A row's `combine` field is what the tile turns into "BOTH must be met" or "EITHER one is enough", and the renderer treats anything that is not the exact string `"and"` as OR -- so a conjunctive state added without it would state the wrong rule, which is what shipped for NY and CT. Three unit invariants now hold the shape: a transaction prong obliges an explicit `"and"`/`"or"`, a `combine` obliges a prong to combine, and the four states that repealed their prong (IL, KY, LA, UT) must keep the `combine_note` that says so -- it is the only place a reader learns the prong was repealed rather than never existed. Every row carries its own `verified_on`, gated per row by `check-manifests`; the `by_state.verifiedOn` rollup must equal the oldest of them, so the summary can never claim more than the rows beneath it. The build pipeline (`scripts/build-data.mjs`) writes it as a derivative artifact from the in-tree constant in [calc-references.js](../calc-references.js), which stays the source of truth so the renderer runs synchronously without a network hop on first calculation.
- Privacy: No runtime fetch. The reference tile carries the standard inline limitation notice (verify the current threshold with the state department of revenue before relying on it for filing).

### data/lab/*.json (v5, utilities 255-264)

- Source: IUPAC Standard Atomic Weights 2021. CRC Handbook of Chemistry and Physics 95th ed. and Good et al. (Biochemistry 5(2): 467, 1966) for buffer pKa values. Manufacturer-published rotor specifications (Eppendorf, Beckman Coulter, Thermo Fisher).
- License: IUPAC and manufacturer reference data, used by name-only attribution. Original chemistry formulas are first principles.
- Cadence: IUPAC publishes adjustments roughly every 2-4 years; quarterly recheck against manufacturer catalogs.
- Shards: `iupac-atomic-weights.json` (symbol -> g/mol), `buffer-pka.json` (Tris, HEPES, MES, MOPS, PIPES, phosphate, acetate, bicarbonate), `centrifuge-rotors.json` (manufacturer-attributed rotor radii).
- Privacy: No runtime fetch. Group T tiles carry the bench-science variant inline notice.

### data/search/aliases.json (v10 §6.1, Phase D.1)

- Source: Original project-authored mapping of free-text terms (industry vocabulary, regional names, misspellings, adjacent-question redirects) to existing tile ids.
- License: MIT-licensed creative work. Not derived from any external standard or commercial taxonomy.
- Cadence: Reviewed once per minor release. New tiles add aliases as part of the contributor checklist.
- Shard layout: `{ aliases: [{ term, target, kind }] }` where `kind` is `industry`, `redirect`, `adjacent`, or (since spec-v590) `question`.
- Privacy: No runtime fetch. Per spec-v10 §13.3 the data is bounded to fit lazy-loaded after first keystroke. No personalization, no telemetry.

### data/search/aliases-*.json (spec-v590 per-group split)

- Source: Generated runtime shards, one per tile group, derived from `data/search/aliases.json` (the authoring master above) by `scripts/build-alias-shards.mjs`. Same rows, keyed by the target tile's group; no independent content.
- License: MIT-licensed creative work, identical to the master.
- Cadence: Regenerated whenever the master or the group roster changes; `node scripts/build-alias-shards.mjs --check` fails CI on any drift.
- Shard layout: `{ _updated, aliases: [{ term, target, kind }] }`, row shape identical to the master.
- Privacy: Lazy parallel fetch on first search interaction (the master is never fetched at runtime). No personalization, no telemetry.

### data/search/slots.json (spec-v591)

- Source: Original project-authored quantity-slot tables mapping unit spellings typed in a search query to a tile's own input ids, so a picked result arrives with the typed numbers prefilled.
- License: MIT-licensed creative work. Not derived from any external standard or commercial taxonomy.
- Cadence: Grows in review-sized batches under spec-v591; `scripts/check-slots.mjs` fails CI when a row targets a renamed input or a deleted tile.
- Shard layout: `{ version: 1, tiles: [{ tile, slots: [{ param, units }] }] }` where `param` is the tile's DOM input id and `units` are lowercase unit spellings, unique per tile.
- Privacy: No runtime fetch beyond the same lazy load as the aliases shard. No free text enters the hash; values are parser-canonical decimal strings.

### data/search/preview-map.json (spec-v592)

- Source: Original project-authored answer-preview map, generated by `scripts/build-preview-map.mjs` from `test/fixtures/compute-map.js` plus a hand-authored headline table. Covers the spec-v591 slot-seeded tiles.
- License: MIT-licensed creative work. Not derived from any external standard.
- Cadence: Regenerated when the slot seed grows; `scripts/check-slots.mjs` fails CI when a preview entry references a renamed compute export or output key.
- Shard layout: `{ version: 1, tiles: { <tile-id>: { module, fn, args, defaults, headline } } }` -- `args` maps DOM input ids to compute argument names; `headline` lists `{ key, label, unit, decimals }` output lines.
- Privacy: No runtime fetch beyond the same lazy load as the aliases shard. The preview calls the same exported compute functions the tile calls, offline.

### data/fields/*.json (spec-v1339 field index)

- Source: Generated runtime shards projecting each tile's own input descriptors -- the `render.schema.inputs` the declarative renderers carry, and the statically-extracted `BESPOKE_SCHEMAS` for the hand-written ones -- into a form the browser can read. Tiles with neither are projected from their compute parameters, named by the caption the calculator prints beside the field, which is how the index reaches 1,764 of 1,804 rather than the 1,725 that carry a schema. Derived data with no independent content: the renderers stay authoritative and these shards regenerate from them by `scripts/build-field-index.mjs`.
- License: MIT-licensed creative work, identical to the renderers it is projected from. Not derived from any external standard or commercial taxonomy.
- Cadence: Regenerated whenever a tile's inputs change; `node scripts/build-field-index.mjs --check` fails CI on any drift, and the build fails outright if a shard passes 24 KB gzip.
- Shard layout: `{ version: 1, bucket, tiles: { <tile-id>: [{ d, l, k, u, o }] } }` -- `d` is the field key, which in this catalog is also the DOM input id; `l` is the label with its trailing unit stripped; `k` is the kind; `u` is the canonical unit the label declares, omitted when it declares none; `o` lists a select's allowed values; `r` marks a field the tile cannot answer without. A field with no human label is omitted rather than indexed under its machine key, and a field whose verified example holds something a numeric extractor must not guess at -- a list, a date, a coded token -- is indexed with its label but marked unfillable, so it is named to the reader rather than filled from a stray number.
- Sharding: One shard per tile group, matching the `aliases-<letter>.json` convention, so the browser derives the filename from the group it already knows and never fetches a manifest to find one. Group E is split in two (`e-1`, `e-2`) because a single shard gzips to 31.7 KB; the split rule lives in `field-bucket.js` and is imported by both the writer and the reader so they cannot disagree. The shard set is not fixed -- a group gains a shard the first time one of its tiles is indexed -- so `scripts/check-sw-precache.mjs` checks the service worker's precache list against the files on disk in both directions.
- Privacy: Lazy fetch on first use, cached per session, never at first paint. Nothing about a query is recorded or transmitted; the extraction is regex and table lookup running locally.

### data/cross/glossary.json (v5, utility 271)

- Source: Original plain-English definitions written by the project author. MIT licensed.
- Cadence: Updated when a new field-name jargon term is added to a v5 calculator.
- Shard layout: Object under `terms` mapping glossary key to a one-paragraph definition.
- Privacy: No runtime fetch (currently inlined in v5-platform.js for first-render performance; the JSON shard is the canonical source on disk).

### data/field/wmm/coefficients.json (v9 F.1, magnetic-declination)

- Source: NOAA NCEI World Magnetic Model 2025 (WMM2025) coefficient file (WMM2025.COF), bundled verbatim from the official distribution at [ncei.noaa.gov/products/world-magnetic-model](https://www.ncei.noaa.gov/products/world-magnetic-model).
- License: Public domain (NOAA NCEI / NGA). No fee, no account.
- Cadence: 5-year quinquennial release. WMM2025 covers 2025-01-01 through 2029-12-31; the next release (WMM2030) is expected in 2029-12 and the bundle's `expires_on` is set to 2030-01-01. The `scripts/sources-cycle.json` entry for `wmm` drives the freshness lint warning when expiry is within 6 months.
- Shard layout: `{ model, epoch, release_date, valid_from, valid_until, expires_on, max_degree, source, coefficients: [{ n, m, g, h, dg, dh }, ...] }`. 90 coefficient rows to degree 12 (g and h gauss coefficients in nT; dg and dh secular variation in nT/yr). The bundled NCEI test-value table is mirrored at [test/fixtures/wmm2025-testvalues.txt](../test/fixtures/wmm2025-testvalues.txt); the v9 §F.1 unit test in [test/unit/calc-field-v9.test.js](../test/unit/calc-field-v9.test.js) asserts agreement to within 0.05 deg D/I and 1 nT H/F over all 100 vectors.
- Privacy: No runtime fetch of upstream data. The bundle is same-origin and loads once per session on first open of the magnetic-declination tile.

### data/realestate/loan-limits.json (v12 §8, X.8 loan-limits)

- **Re-verified 2026-09-02.** The shard was stamped `year: 2026`, `verified_on: 2026-05-16`, and carried the **2025** figures throughout ($806,500 conforming, $524,225 FHA floor, a $1,209,750 ceiling). It now carries the published 2026 baseline: $832,750 / $1,066,250 / $1,288,800 / $1,601,750 conforming, FHA floor $541,287, ceiling $1,249,125. Bundled county rows cover only counties **at** the national ceiling; the four that sat between the floor and the ceiling were removed rather than guessed, and route to the FHFA / HUD lookup.

- Source: Federal Housing Finance Agency, Conforming Loan Limit Values (annual; 2026 values published November 2025) at [fhfa.gov/data/loan-limit-values](https://www.fhfa.gov/data/loan-limit-values). HUD Single-Family Mortgage Limits (annual; 2026 values published December 2025) at [entp.hud.gov/idapp/html/hicostlook.cfm](https://entp.hud.gov/idapp/html/hicostlook.cfm). VA full-entitlement no-cap policy per the Blue Water Navy Vietnam Veterans Act of 2019 (Public Law 116-23).
- License: Public-domain federal data. No fee, no account.
- Cadence: Annual rollover each November (FHFA) / December (HUD). Per-shard `refresh_cadence: "annual"` per spec-v12 §H.2.
- Shard layout: `{ source, edition, fetched, verified_on, free_access, year, baseline: { conforming_one_unit_usd, fha_floor_one_unit_usd, fha_ceiling_one_unit_usd, ceiling_high_cost_one_unit_usd, ... }, va: { full_entitlement_cap_removed_since, ... }, high_cost_counties_one_unit: [{ state, county_name, county_fips, conforming_usd, fha_usd }, ...], unknown_county_message }`. Bundled snapshot covers ~28 high-cost counties (CA / NY / DC / MA / WA / CO / HI / AK); the unknown-county fallback uses the 48-state baseline and points the user at the FHFA / HUD canonical lookup.
- Privacy: No runtime fetch of upstream data. The bundle is same-origin and loads once per session on first open of the loan-limits tile.

### data/realestate/hud-fmr.json (v12 §8, X.10 hud-fmr)

- Source: U.S. Department of Housing and Urban Development, Office of Policy Development and Research. Fair Market Rents for FY2026 (effective 2025-10-01 through 2026-09-30). Methodology per 24 CFR Part 888. Free at [huduser.gov/portal/datasets/fmr.html](https://www.huduser.gov/portal/datasets/fmr.html); per-area lookup at the FY2026 selector.
- License: Public-domain federal data. No fee, no account.
- Cadence: Annual rollover each October (federal fiscal year). Per-shard `refresh_cadence: "annual"` per spec-v12 §H.2.
- Shard layout: `{ source, edition, fetched, verified_on, free_access, fiscal_year, areas: [{ name, state, fips, fmr_0br, fmr_1br, fmr_2br, fmr_3br, fmr_4br }, ...], unknown_area_message }`. Bundled snapshot covers ~19 representative HUD Metro FMR Areas / MSAs; canonical per-county lookup is at huduser.gov. The 40th-percentile rent of recent-mover units in the HUD-defined FMR Area, used as the program payment standard for the Housing Choice Voucher (Section 8) program and several HUD subsidies.
- Privacy: No runtime fetch of upstream data. The bundle is same-origin and loads once per session on first open of the hud-fmr tile.

## v12 pure-math groups (Educators)

Spec-v12 §5 / §6 / §7 / §9 added Groups U / V / W / Y as pure-math /
reference tiles. Spec-v107 later retired three of them under the
trades-only charter -- U (Veterinary), V (EMS), and W (Aviation), along
with their `calc-vet.js` / `calc-ems.js` / `calc-aviation.js` modules --
so Group Y (Educators) is the one v12 pure-math group still live. These
groups deliberately ship **no `data/<folder>/` shards**; every bundled
table the surviving Educators tiles use (IUPAC atomic data, the Kincaid /
SMOG / Coleman-Liau readability constants, the Abramowitz-Stegun
standard-normal CDF coefficients) lives inline in the renderer module
([calc-edu.js](../calc-edu.js)). This keeps the integrity-check surface
limited to the existing sharded folders (`physical-constants`,
`historical`, `accounting`, `legal`, `lab`, `realestate`, etc.) while
still letting the pure-math tiles cite a primary public-domain source
per the v6 §3 discipline. Group X (Real Estate) is the one v12 group
that ships shards (the FHFA / HUD-FMR rows above) because the county /
MSA lookup is keyed data, not a formula.

## Manifest format

Every per-trade folder ships a manifest.json with at minimum:

- name: human readable dataset name
- version: ISO date or semver
- fetched: ISO date the data was last fetched or regenerated
- edition: human-readable edition stamp per spec-v6 §3 (NEC 2023, IPC 2021, FHFA 2026 cycle, etc.)
- asOf: ISO date the bundle was last verified against canonical source per spec-v8 §3
- refresh_cadence: one of `daily`, `weekly`, `monthly`, `quarterly`, `annual`, `event-driven` per spec-v12 §H.2; must match the central row in [scripts/refresh-cadence.json](../scripts/refresh-cadence.json) (the freshness lint fails on disagreement)
- shards: array of relative paths
- hashes: SHA-256 hex of each shard

The hashes are checked at build time and the shipped values are recorded in scripts/expected-hashes.json. The application verifies each manifest at startup.
