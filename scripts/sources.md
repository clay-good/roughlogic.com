# Data Sources (build-time)

This file is the running record of where each dataset shipped in `data/` came from at build time. It mirrors `docs/data-sources.md` with the additional detail of the canonical URL or in-tree authoritative source the build pipeline reads from.

## Pipeline overview

`scripts/build-data.mjs` is a Node 20 standalone script using only built-ins. It reads authoritative inputs (committed in-tree as part of this project; verified by hash where downloaded from a canonical URL), produces sharded JSON in `data/<folder>/<file>.json`, writes a `manifest.json` per folder with version and SHA-256 hashes, and emits `scripts/expected-hashes.json` for `scripts/verify-integrity.mjs` and the runtime startup integrity check.

The pipeline never runs in production. It runs in CI on a monthly schedule (`.github/workflows/data-refresh.yml`).

## Source-by-source

- `data/physical-constants/constants.json` — NIST Reference on Constants, Units, and Uncertainty (https://physics.nist.gov/cuu/Constants/). Public domain.
- `data/physical-constants/material-properties.json` — Public physics and engineering reference works (CRC Handbook, NIST tables). Physical facts, not copyrightable.
- `data/electrical/conductor-properties.json` — Generated from the standard AWG geometric definition (`d_in = 0.005 * 92^((36 - n)/39)`); resistivity values from `material-properties.json`. Physical facts.
- `data/electrical/ampacity-physics.json` — First-principles heat-balance methodology (see `docs/derivations.md` section 2). No NEC table reproduction.
- `data/electrical/motor-fla.json` — Compiled from NEMA-aligned manufacturer technical bulletins (typical published values across publishing manufacturers). Manufacturer technical data, attributed at use site.
- `data/electrical/conduit-fill-tables.json` — Conductor cross-sectional areas from insulation manufacturer dimensional data and ASTM dimensions; thresholds (40, 31, 53 percent) referenced, not reproduced.
- `data/electrical/demand-factors.json` (v2) — Standard residential demand factors. NEC sections 220.42, 220.54, 220.55, 220.82 referenced by section number; values are engineering-practice consensus.
- `data/electrical/lighting-density.json` (v2) — Public engineering benchmarks for lighting power density. ASHRAE 90.1 referenced by name only.
- `data/plumbing/pipe-properties.json` — Nominal pipe size dimensions per ASTM and manufacturer catalogs; Hazen-Williams roughness coefficients from public engineering references.
- `data/plumbing/fixture-units.json` — Hunter's Curve method (Hunter 1940; NBS BMS65). Public-domain methodology.
- `data/plumbing/gas-pipe-capacity.json` — Spitzglass / Weymouth public formulas with bundled gas properties. Public physical equations.
- `data/plumbing/material-expansion.json` (v2) — Linear thermal expansion coefficients (1/F) from NIST and pipe manufacturer technical bulletins.
- `data/plumbing/septic-rules.json` (v2) — U.S. EPA on-site wastewater treatment manual and state-published septic sizing rules.
- `data/hvac/refrigerants.json` — Manufacturer-published P-T tables (DuPont, Honeywell, Chemours, Arkema). Each entry attributes its publishing manufacturer.
- `data/hvac/duct-friction.json` — Standard duct surface roughness from public engineering references.
- `data/hvac/climate-data.json` — NOAA NCEI design temperature data. Public domain.
- `data/hvac/charge-per-foot.json` (v2) — Manufacturer line-set charge tables (oz per foot per refrigerant per diameter). Manufacturer-attributed.
- `data/hvac/equivalent-lengths.json` (v2) — Public engineering equivalent-length tables for common fittings and valves.
- `data/hvac/insulation.json` (v2) — Public engineering reference values for insulation thermal conductivity and outside-film coefficient.
- `data/restoration/psychrometrics.json` — August-Roche-Magnus saturation vapor pressure approximation; standard psychrometric definitions.
- `data/restoration/water-classes.json` — Original plain-English summaries by the project author. References IICRC S500 by name; standard text not reproduced.
- `data/restoration/drying-times.json` — Original plain-English notes on typical drying behavior of common building materials.
- `data/restoration/mold-conditions.json` — Public mold-growth research literature summarized in original plain English.
- `data/restoration/hepa-loading.json` (v2) — Typical commercial HEPA pre-filter loading values from manufacturer technical bulletins.
- `data/construction/lumber-properties.json` — Allowable bending stress and modulus of elasticity from public engineering references and lumber grading agency basic-design values.
- `data/construction/concrete-mixes.json` — Standard concrete mix proportions and yields from public engineering references.
- `data/construction/span-derivations.json` — First-principles outputs of the lumber-spans calculator using bundled material properties.
- `data/construction/soil-bearing.json` (v2) — USGS / IBC-mirrored allowable soil bearing values.
- `data/construction/wind-snow-zones.json` (v2) — NOAA basic wind speeds and ground snow loads. Public domain; public ASCE 7 formulas applied.
- `data/fire/hose-friction.json` — National Fire Academy hydraulics training materials. U.S. government, public domain.
- `data/fire/fire-flow-formulas.json` — ISO Public Protection Classification published formulas.
- `data/crosswalks/unit-conversions.json` — NIST SP 811. Public domain.
- `data/crosswalks/state-tax-rates.json` — State revenue department published rates. Government-published rates.
- `data/crosswalks/irs-mileage.json` (v2) — IRS-published standard mileage rate. U.S. government publication.
- `data/crosswalks/gsa-perdiem.json` (v2) — U.S. General Services Administration per-diem rates. Public domain.
- `data/summaries/summaries.json` — Original plain-English summaries written by the project author. MIT.
- `data/summaries/v2-references.json` (v2) — Original plain-English summaries for v2 reference utilities. MIT. Code documents referenced by section number only.

## Adding a new dataset

1. Add the authoritative input to `scripts/build-data.mjs` (or to a new in-tree input file under `scripts/`).
2. Add a `DATASETS` entry mapping the input to one or more shards.
3. Update `docs/data-sources.md` and this file with the source, license, and cadence.
4. If a new physics derivation is implied, update `docs/derivations.md`.
5. Run `npm run data:refresh && npm run data:verify` and commit the resulting `data/` and `scripts/expected-hashes.json`.
