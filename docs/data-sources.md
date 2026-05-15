# Data Sources

Every dataset shipped in data/ is listed here with its canonical source, license or public-domain status, update cadence, and shard layout. New datasets are added to this file in the same pull request that adds them.

The principle from spec.md section 5 governs every entry: the data is either public domain, a physical or mathematical fact (not copyrightable), a U.S. government publication, a manufacturer technical specification cleared for redistribution, or original creative work by the project author. Licensed code text (NEC, IPC, IRC, ASHRAE Fundamentals, ACCA Manual J, NFPA standards) is never bundled.

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
- Cadence: Annual update.
- Shard layout: Flat object with rate per mile in dollars.

### data/crosswalks/gsa-perdiem.json (v2)

- Source: U.S. General Services Administration per-diem rates (public domain).
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
- Shard layout: One file per commodity under `data/historical/commodities/`. Each shard carries `agency`, `series_id`, `units`, `fetched` (the build date), `cadence` ("monthly"), and a `points` array of `{date: "YYYY-MM", value}` entries (most recent ~36 months).
- Privacy: No runtime fetch. The tool view loads the same-origin shard on first commodity selection and computes percentile bands client-side. No telemetry, no alerts, no subscriptions.

### data/accounting/*.json (v5, utilities 234-245)

- Source: IRS publications (Pub 946 MACRS tables, Pub 15-T percentage method, annual Rev. Proc. for the Section 179 cap, Form 1040-ES due dates, annual standard-mileage-rate notice). SSA annual wage-base announcement. U.S. Census Annual Retail Trade Survey (ARTS) and SBA published industry medians for inventory benchmarks.
- License: Public domain (federal publications).
- Cadence: Annual recheck each January for the IRS-driven shards (refresh when the IRS posts the new tax year). Quarterly recheck for inventory benchmarks.
- Shards: `macrs-tables.json` (per-class-life percentages), `section-179-limits.json` (per-year cap / phase-out / bonus pct), `se-tax-parameters.json` (per-year SS wage base + Additional Medicare threshold by filing status), `estimated-tax-due-dates.json` (per-year four ISO dates), `standard-mileage-rates.json` (per-year business / medical / charitable rates), `inventory-benchmarks.json` (per-industry turnover median), `pub-15-t-tables.json` (single-filer annualized brackets).
- Privacy: No runtime fetch. All shards bundled at build time.

### data/legal/*.json (v5, utilities 246-254)

- Source: Per-state code sections (judgment-interest statute, statutes of limitations, landlord-tenant code, minimum-wage statute). Federal Rules of Civil Procedure 6(a) and 5 USC 6103 for federal court holidays. Per-state department of revenue guidance for post-Wayfair sales-tax-nexus thresholds. Each entry cites the section number only; no statute text reproduced.
- License: U.S. and state government publications, public domain. Original plain-English summaries authored by the project (MIT licensed).
- Cadence: Quarterly recheck against the state source page (oldest `verified_on` first). Court-holidays roll forward annually each January.
- Shards: `judgment-interest-rates.json`, `court-holidays.json`, `state-minimum-wage.json`, `sales-tax-nexus.json`, `statute-of-limitations.json`, `landlord-tenant-notice.json`, `small-claims.json`. Eight shards in total; all 50 states + DC covered on the per-state shards. The build pipeline (`scripts/build-data.mjs`) reads the canonical inlined `const` exports in [calc-legal.js](../calc-legal.js) and writes the shards as derivative artifacts (the inline exports stay the source of truth so the renderer can run synchronously without a network hop on first calculation).
- Privacy: No runtime fetch. Group S tiles carry the legal-information variant inline notice.

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
- Shard layout: `{ aliases: [{ term, target, kind }] }` where `kind` is `industry`, `redirect`, or `adjacent`.
- Privacy: No runtime fetch. Per spec-v10 §13.3 the data is bounded to fit lazy-loaded after first keystroke. No personalization, no telemetry.

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

## Manifest format

Every per-trade folder ships a manifest.json with at minimum:

- name: human readable dataset name
- version: ISO date or semver
- fetched: ISO date the data was last fetched or regenerated
- shards: array of relative paths
- hashes: SHA-256 hex of each shard

The hashes are checked at build time and the shipped values are recorded in scripts/expected-hashes.json. The application verifies each manifest at startup.
