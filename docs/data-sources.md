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

### data/electrical/conduit-fill-tables.json

- Source: Conductor cross-sectional area per insulation type from manufacturer cable catalogs and ASTM dimensions; the threshold percentages (40, 31, 53) are referenced, not reproduced.
- License: Dimensional facts; thresholds cited.
- Cadence: Annual review.

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

### data/crosswalks/state-tax-rates.json

- Source: Each state revenue department's published rate.
- License: Government-published rates.
- Cadence: Monthly refresh; states change rates occasionally.

### data/summaries/v2-references.json (v2)

- Source: Original plain-English summaries written by the project author for v2 reference utilities. NEC, IPC, and similar code documents referenced by section number only; no code text reproduced.
- License: MIT, original creative work.
- Cadence: Updated as v2 reference content changes.

### data/summaries/summaries.json

- Source: Original plain-English summaries written by the project author for every utility.
- License: MIT, original creative work.
- Cadence: Updated as utilities change.

## Manifest format

Every per-trade folder ships a manifest.json with at minimum:

- name: human readable dataset name
- version: ISO date or semver
- fetched: ISO date the data was last fetched or regenerated
- shards: array of relative paths
- hashes: SHA-256 hex of each shard

The hashes are checked at build time and the shipped values are recorded in scripts/expected-hashes.json. The application verifies each manifest at startup.
