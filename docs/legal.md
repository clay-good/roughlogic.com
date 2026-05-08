# Legal and Data Sourcing Posture

This document is the project's legal posture. It restates spec.md section 5 and explains how the implementation honors it. The MIT license under which this project is published does not waive the rights of third-party copyright holders. The project deliberately avoids reproducing any licensed code text, table, or publication.

## Non-negotiable rules

Every dataset and every reference shipped with this project satisfies one of the following:

1. It is in the public domain.
2. It is a mathematical or physical fact and is therefore not copyrightable.
3. It is published by a United States government agency without copyright restriction.
4. It is licensed under terms permitting redistribution in an MIT open-source project.

If a candidate dataset does not satisfy one of these conditions, it does not ship.

## What this project does not bundle

The following copyrighted publications are not bundled, summarized at length, or paraphrased so closely as to constitute derivative work:

- NEC (NFPA 70)
- IPC (International Plumbing Code)
- UPC (Uniform Plumbing Code)
- IRC (International Residential Code)
- IECC, IFC, IBC
- ASHRAE Handbook of Fundamentals
- ACCA Manual J, Manual D, Manual S
- NFPA standards beyond what is publicly summarized
- AWC Wood Design Manual or any commercial code body's published code text

Where the project references one of these documents, it does so by name and number ("see NFPA 13 for sprinkler design") so the user can consult the authoritative source.

## The first-principles approach

The numeric facts that drive the trades are physical, not legal: the resistance of copper at temperature, water density, refrigerant pressure-temperature relationships, friction coefficients, gas constants. These values are facts and are not copyrightable. A calculation performed using these facts produces the same numbers as the licensed code tables for the same inputs because both are computing the same physics.

This project implements those calculations from first principles in original code. The result is original work that produces equivalent output, not a reproduction of a licensed table. docs/derivations.md documents how each first-principles calculator was derived, with citations to the underlying physics references.

## Original plain-English summaries

The narrative copy on each calculator and the reference summaries (water classes, mold conditions, backflow, smoke reading) are original work by the project author. They are written without reference to copyrighted code text and without paraphrasing licensed publications.

## Specific guidance per dataset

### Wire ampacity

The temperature rise of a conductor at a given current depends on the conductor's resistance, the heat capacity, and the heat dissipation to the surrounding insulation and air. Computing ampacity from these inputs and from the insulation's published temperature rating produces the same answers as the NEC tables for the same inputs. The implementation cites the underlying physics and the insulation temperature rating, not the NEC table.

### Friction loss

Hazen-Williams (water, 1905) and Darcy-Weisbach (gases and water) are public physical equations. The project uses them directly. Manning's equation for open-channel flow is similarly public.

### Refrigerant pressure-temperature data

Refrigerant P-T relationships are physical facts, published by manufacturers (DuPont, Honeywell, Chemours, Arkema) in technical bulletins. The project bundles a curated table of common refrigerants and cites the publishing manufacturer per entry. Each manufacturer's bulletin is reviewed for redistribution permission before its values are added.

### Lumber span calculations

The AWC Wood Design Manual is licensed by the American Wood Council. The project does not reproduce its tables. Instead, it implements span calculations from first principles using simple-span beam mechanics (moment of inertia, allowable bending stress, modulus of elasticity, deflection limit) and bundled lumber material properties (allowable bending stress and modulus of elasticity by species and grade from public engineering references). The output is verified against AWC table values within tolerance for representative cases; this is verification of correctness, not reproduction.

### Manual J cooling and heating loads

ACCA holds copyright on the published Manual J. The underlying methodology (sensible heat gain from solar, conductive, latent loads) is engineering practice. The project implements a simplified load estimator from the underlying engineering principles, with an inline notice on every Manual J view that the result is a simplified estimate, not a Manual J load, and that a code-compliant load calculation requires Manual J. The climate inputs come from NOAA (public domain).

### IICRC S500 (water damage)

The IICRC standard itself is licensed. The project's water-classes, mold-conditions, drying-times, and PPE selection content is original plain-English summary work and references the IICRC standard by name without reproducing its text.

### NFPA standards

NFPA standards are licensed. The project references them by number where appropriate ("see NFPA 13 for sprinkler design") without reproducing their text.

### Manufacturer-specific product data

Used cautiously and only when the manufacturer's technical bulletin permits redistribution. A motor full-load amps table compiled from manufacturer data is acceptable when attributed; a reproduction of a specific manufacturer's catalog page is not.

### v2 additions

The v2 expansion (utilities 65 through 124, per spec-v2.md) introduces additional datasets, all under the same four-condition rule:

- Standard residential demand factors (`data/electrical/demand-factors.json`) and lighting power density benchmarks (`data/electrical/lighting-density.json`). NEC sections 220.42, 220.54, 220.55, and 220.82 and ASHRAE 90.1 are referenced by section or name only; no table text is bundled.
- Pipe thermal expansion coefficients (`data/plumbing/material-expansion.json`) and septic sizing rules (`data/plumbing/septic-rules.json`). Material-property facts and EPA / state-published rules.
- Refrigerant charge per foot (`data/hvac/charge-per-foot.json`), fitting equivalent lengths (`data/hvac/equivalent-lengths.json`), and insulation conductivity (`data/hvac/insulation.json`). Manufacturer-attributed where applicable; engineering-practice consensus values otherwise.
- HEPA loading rates (`data/restoration/hepa-loading.json`). Manufacturer technical bulletin values.
- Soil bearing capacities (`data/construction/soil-bearing.json`) and wind / snow design data (`data/construction/wind-snow-zones.json`). USGS / NOAA / engineering-practice values; ASCE 7 formulas applied without reproducing licensed text.
- IRS standard mileage (`data/crosswalks/irs-mileage.json`) and GSA per-diem rates (`data/crosswalks/gsa-perdiem.json`). U.S. government publications, public domain.
- v2 reference summaries (`data/summaries/v2-references.json`). Original plain-English summaries by the project author for the GFCI/AFCI reference, color codes, knot reference, inspection prep checklists, emergency contacts, tool maintenance intervals, and the thermal-imager delta-T reference. No code text is reproduced.
- v3 reference summaries (`data/summaries/v3-references.json`). Original plain-English summaries by the project author for hand signals, OSHA Top 10, lockout/tagout, defensible space, FEMA P-320, and START triage. Codes and frameworks are referenced by name and section number only.
- v4 trucking shards (`data/trucking/dim-divisors.json`, `data/trucking/reefer-burn.json`). Carrier-attributed dimensional-weight divisors and manufacturer-attributed reefer-fuel benchmarks. Cited by carrier or manufacturer name; tariff and bulletin text not reproduced.
- v4 historical commodity shards (`data/historical/commodities/*.json`). Bundled monthly history sourced from public BLS PPI / EIA / USDA NASS / FRED federal series. Series IDs are reproduced verbatim because they are factual identifiers; the surrounding agency prose, methodology, and seasonal-adjustment commentary are not. Each shard records the agency, series ID, units, and the build (fetched) date. The build script enforces a 30-day staleness limit so a stale-committed shard fails the build rather than reaching the user. No runtime fetch, no alerts, no subscriptions, no telemetry.
- v5 accounting shards (`data/accounting/*.json`). IRS Publication 946 MACRS percentage tables (Tables A-1) bundled to four-decimal precision; IRS annual revenue procedures for the Section 179 cap and phase-out threshold; SSA wage-base announcements; IRS Form 1040-ES quarterly schedule; IRS Publication 15-T percentage-method brackets; IRS standard mileage rate annual notice; Census ARTS / SBA published industry-median inventory turnover. All sources are U.S. federal publications, public domain. Per-year shards carry a `verified_on` ISO date driving the recheck workflow. Calculators cite each source by name and table / form number only; no IRS publication text or instructions are reproduced.
- v5 legal shards (`data/legal/*.json`). Per-state judgment-interest rates (50 + DC), statutes of limitations (50 + DC, eight claim types each), landlord-tenant notice and cure-period rules (50 + DC, four notice types each), minimum-wage and tipped-employee cash wage (50 + FED + DC), small-claims jurisdictional max and filing-fee range (50 + DC), and post-Wayfair sales-tax economic-nexus thresholds (46 sales-tax states + DC; DE / MT / NH / OR omitted as no-tax states). Federal Rules of Civil Procedure 6(a) and 5 USC 6103 bundled federal court holidays for the current and next two calendar years. Each entry cites its state code section, court rule, or department-of-revenue guidance by section number / URL only; no statute text or bar-association commentary is reproduced. All summaries are original plain-English work by the project author. Per-state entries carry a `verified_on` ISO date driving the quarterly recheck cadence per docs/data-sources.md.
- v5 lab shards (`data/lab/*.json`). IUPAC Standard Atomic Weights 2021 are public reference values. Common-laboratory buffer pKa values cite Good et al. (Biochemistry 5(2): 467, 1966) and CRC Handbook 95th ed. by name only; CRC Handbook is a commercial reference book whose text is not reproduced - only the public physical-constant pKa values are bundled. Centrifuge rotor radii are manufacturer-published technical specifications cited per row (Eppendorf, Beckman Coulter, Thermo Fisher); the specifications themselves are factual measurements, not creative work.
- v5 cross / glossary shard (`data/cross/glossary.json`). Plain-English definitions for v5 field-name jargon (MACRS, FICA, Section 179, statute of limitations, molarity, RCF, etc.). Original creative work authored by the project, MIT-licensed.

The cross-cutting platform affordances introduced by spec-v2 (Recents, Project Bundle, Print/PDF view, Offline indicator, Example deep-link, Copy share link) are pure UI / state mechanisms over the same URL-hash state model. They do not introduce additional data dependencies and they do not change the legal posture of the bundled data.

## Disclaimers and liability posture

A persistent footer disclaimer appears on every utility view (spec.md section 10): "roughlogic.com provides math and reference information from public physical principles, manufacturer specifications, and original summaries. It is not a substitute for code interpretation, professional engineering, or the authority having jurisdiction. Verify all values against authoritative sources and applicable codes before relying on them for any installation or design."

Each calculator view carries the section 9 inline notice. Fire-ground utilities carry the SOP-and-incident-command variant.

Under the MIT license, the software is provided "as is" without warranty. This document does not constitute legal advice. Operators of derivative deployments are responsible for their own compliance review.

## Adding a new dataset

When a new dataset is added, the same pull request must update docs/data-sources.md and, if the dataset implies a new derivation, docs/derivations.md. The reviewer confirms that the dataset satisfies one of the four non-negotiable conditions above.
