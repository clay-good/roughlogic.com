# Data Sources (build-time)

This file is the running record of where each dataset shipped in `data/` came from at build time. It mirrors `docs/data-sources.md` with the additional detail of the canonical URL or in-tree authoritative source the build pipeline reads from.

## Pipeline overview

`scripts/build-data.mjs` is a Node 20 standalone script using only built-ins. It reads authoritative inputs (committed in-tree as part of this project; verified by hash where downloaded from a canonical URL), produces sharded JSON in `data/<folder>/<file>.json`, writes a `manifest.json` per folder with version and SHA-256 hashes, and emits `scripts/expected-hashes.json` for `scripts/verify-integrity.mjs` and the runtime startup integrity check.

The pipeline never runs in production. It runs in CI on a tiered schedule per spec-v12 Phase H: a monthly lane (`.github/workflows/data-refresh.yml`, `0 12 1 * *`) for shards stamped monthly-or-longer and a weekly lane (`.github/workflows/data-refresh-weekly.yml`, `0 12 * * 1`) for shards stamped weekly. The per-shard cadence lives in each manifest's `refresh_cadence` field (§H.2) with `scripts/refresh-cadence.json` as the schema source of truth. After each run the lane appends a per-source stanza to the `## Last-diff log` section below (§H.3).

## Source-by-source

- `data/physical-constants/constants.json` — NIST Reference on Constants, Units, and Uncertainty (https://physics.nist.gov/cuu/Constants/). Public domain.
- `data/physical-constants/material-properties.json` — Public physics and engineering reference works (CRC Handbook, NIST tables). Physical facts, not copyrightable.
- `data/electrical/conductor-properties.json` — Generated from the standard AWG geometric definition (`d_in = 0.005 * 92^((36 - n)/39)`); resistivity values from `material-properties.json`. Physical facts.
- `data/electrical/ampacity-physics.json` — First-principles heat-balance methodology (see `docs/derivations.md` section 2). No NEC table reproduction.
- `data/electrical/motor-fla.json` — Compiled from NEMA-aligned manufacturer technical bulletins (typical published values across publishing manufacturers). Manufacturer technical data, attributed at use site.
- `data/electrical/conduit-fill-tables.json` — Conductor cross-sectional areas from insulation manufacturer dimensional data and ASTM dimensions; thresholds (40, 31, 53 percent) referenced, not reproduced.
- `data/electrical/demand-factors.json` (v2) — Standard residential demand factors. NEC sections 220.42, 220.54, 220.55, 220.82 referenced by section number; values are engineering-practice consensus.
- `data/electrical/lighting-density.json` (v2) — Public engineering benchmarks for lighting power density. ASHRAE 90.1 referenced by name only.
- `data/electrical/cable-bend-radius.json` (v3) — Manufacturer technical bulletins (Southwire, AFC Cable Systems, Belden, Corning); each row attributes the publishing manufacturer. Quarterly attribution-and-link recheck.
- `data/electrical/poe-classes.json` (v3) — IEEE 802.3 publication metadata cited by name only; Cat5e / 6 / 6A loop resistance from Belden / CommScope manufacturer benchmarks. Quarterly attribution-and-link recheck.
- `data/plumbing/runoff-coefficients.json` (v3) — Public engineering practice; rational-method runoff coefficients by surface.
- `data/plumbing/manning-roughness.json` (v3) — Public engineering tables; Manning's n by pipe material.
- `data/plumbing/glycol-curves.json` (v3) — Dow Dowfrost / Dowtherm SR-1 technical bulletins. Quarterly attribution-and-link recheck.
- `data/plumbing/backflow-curves.json` (v3) — Watts Series 909 RP / 909 DCV / 800 PVB / Series 8 AVB technical bulletins. Quarterly attribution-and-link recheck.
- `data/hvac/affinity-laws.json` (v3) — Public fan affinity laws; example shard.
- `data/hvac/baseboard-output.json` (v3) — Slant/Fin Fine Line 30 typical curve and generic high-output reference. Quarterly attribution-and-link recheck.
- `data/hvac/geothermal-soil.json` (v3) — DOE technical reports (public domain) for IGSHPA-style BTU/ft benchmarks.
- `data/trucking/dim-divisors.json` (v4) — Carrier-published DIM divisors (UPS, FedEx, USPS, DHL, LTL freight). Cited by carrier name only; tariff text not reproduced. Quarterly recheck.
- `data/trucking/reefer-burn.json` (v4) — Manufacturer technical bulletins (Thermo King SB-series, Carrier Transicold Vector). Each entry attributes the publishing manufacturer. Quarterly recheck.
- `data/fire/iso-nff.json` (v7) - ISO PPC NFF construction-class F factors and Oi multipliers. Cited by ISO name only. Annual recheck.
- `data/crosswalks/fall-protection-benchmarks.json` (v7) - Manufacturer connector-decel benchmarks (3M, MSA, Honeywell-Miller). Quarterly recheck.
- `data/construction/rebar-unit-weights.json` (v7) - ASTM A615 + CRSI nominal weights and bar diameters. Cited by name. Annual recheck.
- `data/construction/apa-span-ratings.json` (v7) - APA span-rating tables (cited by APA name only). Annual recheck.
- `data/construction/helical-pile-kt.json` (v7) - ICC-ES AC358 + manufacturer Kt benchmarks. Quarterly recheck.
- `data/hvac/duct-roughness.json` (v7) - Absolute roughness for common duct materials. ASHRAE Fundamentals duct-design by name. Annual recheck.
- `data/hvac/duct-fittings.json` (v7) - Fitting loss-coefficient C_o library. Engineering-practice consensus. Annual recheck.
- `data/hvac/refrigerant-pt-tables.json` (v7) - Manufacturer-attributed P-T tables (DuPont / Honeywell / Chemours / Arkema). Quarterly recheck.
- `data/hvac/insulation-k-values.json` (v7) - Manufacturer-attributed insulation k-values. ASHRAE Fundamentals chapter 25 by name. Quarterly recheck.
- `data/plumbing/pipe-elastic-properties.json` (v7) - Pipe Young's-modulus values + water bulk modulus / density + Schedule 40 D / t. Cited by engineering reference. Annual recheck.
- `data/plumbing/pump-curves.json` (v7) - Pump head-vs-flow polylines. Replace composite curves with manufacturer-attributed curves before relying for selection. Quarterly recheck.
- `data/plumbing/thermal-expansion-coefficients.json` (v7) - Per-material alpha + E + S_a for the guided-cantilever expansion-loop method. ASME B31.1 / B31.9 by name. Annual recheck.
- `data/electrical/conductor-c-values.json` (v7) — Eaton/Bussmann SPD point-to-point C-value table. Cited by name only. Annual recheck.
- `data/electrical/nema-mg1-code-letters.json` (v7) — NEMA MG-1 code-letter starting kVA per HP. Cited by NEMA MG-1 by name only. Annual recheck.
- `data/electrical/dwelling-demand.json` (v7) — Dwelling demand-factor parameters (NEC 2023 Article 220). Numeric thresholds only. Annual recheck.
- `data/historical/commodities/*.json` (v4, utility 233) — BLS PPI / EIA / USDA NASS / FRED public federal series (copper WPU10250115, aluminum WPU102301, structural steel WPU101707, rebar WPU101706, framing lumber WPU081, OSB WPU0832, drywall WPU1322, asphalt WPU0581, diesel PET.EMD_EPD2D_PTE_NUS_DPG.M, gasoline PET.EMM_EPMR_PTE_NUS_DPG.M, natural gas NG.N3050US3.M, wheat PWHEAMTUSDM, corn PMAIZMTUSDM, soybeans PSOYBUSDM). Series IDs reproduced verbatim; agency prose not reproduced. Build fails if any shard's latest point is more than 30 days behind the build date. Monthly recheck during the build.
- `data/construction/aci-211-curves.json` (v3) — ACI 211 published curve points cited by name only.
- `data/construction/bolt-grades.json` (v3) — ASTM / SAE proof-load benchmarks cited by name only.
- `data/construction/sfm-table.json` (v3) — Engineering consensus speeds and feeds (Machinery's Handbook equivalent values).
- `data/construction/aws-deposition.json` (v3) — AWS deposition-efficiency benchmarks cited by name only.
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

### v5 datasets (Groups R / S / T plus H / I extensions)

- `data/accounting/macrs-tables.json` (v5) — IRS Publication 946 Tables A-1 (200% / 150% DB, half-year convention). U.S. government publication, public domain. Cited by table number only. Recheck cadence: annual (each January when the IRS posts the new tax year).
- `data/accounting/section-179-limits.json` (v5) — IRS annual revenue procedures (e.g., Rev. Proc. 2024-40) for the Section 179 cap and phase-out threshold; TCJA bonus depreciation phase-down per IRC 168(k). Per-year entries with `verified_on`. Recheck cadence: annual.
- `data/accounting/se-tax-parameters.json` (v5) — SSA annual wage-base announcement (ssa.gov/oact/cola/cbb.html); IRC 3101(b)(2) Additional Medicare 0.9% threshold by filing status. Per-year entries with `verified_on`. Recheck cadence: annual (each October when SSA posts the COLA announcement).
- `data/accounting/estimated-tax-due-dates.json` (v5) — IRS Form 1040-ES quarterly schedule. Per-year arrays of four ISO dates. Recheck cadence: annual.
- `data/accounting/standard-mileage-rates.json` (v5) — IRS annual standard-mileage-rate notice. Per-year business / medical / charitable rates. Recheck cadence: annual (each December / January).
- `data/accounting/inventory-benchmarks.json` (v5) — U.S. Census Annual Retail Trade Survey (ARTS), Annual Survey of Manufactures (ASM), and SBA / industry-association published medians. Recheck cadence: quarterly.
- `data/accounting/pub-15-t-tables.json` (v5) — IRS Publication 15-T Worksheet 1A (Percentage Method), single-filer brackets, illustrative for the v5 starter. Recheck cadence: annual.
- `data/legal/judgment-interest-rates.json` (v5) — Per-state judgment-interest statute, cited per entry by section number. Coverage: 50 states + DC. Recheck cadence: quarterly per spec-v5.md §8.
- `data/legal/court-holidays.json` (v5) — Federal court holidays per Fed. R. Civ. P. 6(a)(6) and 5 USC 6103, current and next two calendar years. Recheck cadence: annual roll-forward each January.
- `data/legal/statute-of-limitations.json` (v5) — Per-state code section, cited by section number only. Original plain-English summary. Coverage: 50 states + DC, full 8-claim-type schema each. Recheck cadence: quarterly.
- `data/legal/landlord-tenant-notice.json` (v5) — Per-state landlord-tenant code, cited by section number only. Original plain-English summary. Coverage: 50 states + DC, full 4-notice-type schema each. Recheck cadence: quarterly.
- `data/legal/state-minimum-wage.json` (v5) — Per-state labor department published minimum wage and tipped-employee cash wage; FLSA federal floor (29 USC 206 / 203(m)). Coverage: 50 states + FED + DC. Recheck cadence: quarterly.
- `data/legal/small-claims.json` (v5) — Per-state small-claims statute or court rule, cited by section number only. Filing-fee range from each state court system's published fee schedule. Coverage: 50 states + DC. Recheck cadence: quarterly.
- `data/legal/sales-tax-nexus.json` (v5) — Per-state department of revenue published nexus guidance, post-South Dakota v. Wayfair, Inc., 138 S. Ct. 2080 (2018). Coverage: 46 sales-tax states + DC (DE / MT / NH / OR omitted as no-tax states). Recheck cadence: quarterly.
- `data/lab/iupac-atomic-weights.json` (v5) — IUPAC Standard Atomic Weights 2021 (Pure and Applied Chemistry). Public reference. Recheck cadence: every 2-4 years (per IUPAC publication).
- `data/lab/buffer-pka.json` (v5) — Good et al., Biochemistry 5(2): 467 (1966), and CRC Handbook of Chemistry and Physics 95th ed. for common laboratory buffer pKa values. Cited by published source.
- `data/lab/centrifuge-rotors.json` (v5) — Manufacturer-published rotor specifications (Eppendorf, Beckman Coulter, Thermo Fisher). Cited per row. Recheck cadence: quarterly against the manufacturer catalog.
- `data/cross/glossary.json` (v5) — Original plain-English definitions for v5 field-name jargon (MACRS, FICA, statute of limitations, molarity, RCF, etc.). MIT-licensed creative work.
- `data/field/wmm/coefficients.json` (v9 §F.1, magnetic-declination) — NOAA NCEI World Magnetic Model 2025 (WMM2025.COF), bundled verbatim. 90 Schmidt semi-normalized spherical-harmonic rows to degree 12 with `(g, h, dg, dh)` in nT and nT/yr; manifest carries `edition: "WMM2025 (2025-2030)"`, `valid_from: 2025-01-01`, `valid_until: 2029-12-31`, `expires_on: 2030-01-01`. Public domain (NOAA NCEI / NGA); no license, no fee. Recheck cadence: 5-year quinquennial (next release WMM2030 expected 2029-12); `scripts/sources-cycle.json` drives the freshness lint warning when expiry is within 6 months. Free at ncei.noaa.gov/products/world-magnetic-model.
- `data/realestate/loan-limits.json` (v12 §8, X.8 loan-limits) — FHFA Conforming Loan Limit Values (annual, published November 2025 for calendar 2026) and HUD FHA Single-Family Mortgage Limits (annual, published December 2025 for calendar 2026); VA full-entitlement no-cap policy per the Blue Water Navy Vietnam Veterans Act of 2019. Bundled snapshot includes baseline + a representative subset of high-cost counties (CA / NY / DC / MA / WA / CO / HI / AK). Manifest carries `edition: "2026 annual cycle"`, `asOf: 2026-05-16`, `refresh_cadence: "annual"`. Public-domain federal data; no license, no fee. Recheck cadence: annual rollover each November (FHFA) / December (HUD). Free at fhfa.gov/data/loan-limit-values and entp.hud.gov/idapp/html/hicostlook.cfm.
- `data/realestate/hud-fmr.json` (v12 §8, X.10 hud-fmr) — HUD Office of Policy Development and Research, Fair Market Rents for FY2026 (effective 2025-10-01 through 2026-09-30). 40th-percentile rent of recent-mover units in the HUD-defined FMR Area per 24 CFR Part 888. Bundled snapshot includes ~19 representative HUD Metro FMR Areas / MSAs; the canonical per-county lookup is at huduser.gov. Manifest carries `edition: "FY2026"`, `asOf: 2026-05-16`, `refresh_cadence: "annual"`. Public-domain federal data; no license, no fee. Recheck cadence: annual rollover each October. Free at huduser.gov/portal/datasets/fmr.html.

### v5 inlined-data references (canonical source: code, not shard)

The four v5 reference utilities (265-268) and the v5 platform glossary (271) currently keep their canonical source as exported constants in code. The on-disk JSON shards mirror these for the build-data integrity pipeline; the runtime reads from the inlined consts. Promotion to fetch-on-load shards is queued behind the existing v3 reference pattern (which also inlines).

- `IRS_FORM_INDEX` in [calc-references.js](../calc-references.js) — original plain-English summaries by the project author for nine commonly used IRS forms (1040, Schedule C / SE / E, Form 4562, 941, W-9, 1099-NEC, 1099-K). MIT.
- `OSHA_RECORDKEEPING` in [calc-references.js](../calc-references.js) — original plain-English summaries by the project author of the 29 CFR 1904 rules. Cited by section number only.
- `GHS_PICTOGRAMS` and `SPILL_DECISION_TREE` in [calc-references.js](../calc-references.js) — original plain-English summaries by the project author of the UN GHS Rev. 9 pictograms and a four-step spill decision tree. Cited by name only.

## Recheck log (v5)

Per spec-v5.md §8, every state-keyed shard recheck against the state source page is logged here with the date and the reviewer. The "verified on" date in each entry drives the prioritization (oldest first).

- 2025-01-15 (initial v5 starter): Clay Good. JI / SOTL / LT-notice / minimum-wage / small-claims / nexus initial bundling complete. State coverage: full 50 states + DC on each per-state shard at this checkpoint (sales-tax-nexus excludes DE / MT / NH / OR by design).
- _Next quarterly recheck due 2025-04-15. Prioritize states whose statutes were amended in calendar Q1 2025; refresh `verified_on` per entry. Replace with author-of-record on the actual recheck PR._

## Free-access probe review log (v10 §3.2)

Per spec-v10.md §3.2, a `check:free-access` WARN (4xx / 5xx / network error on a cited free-access URL) is logged here after manual review.

- 2026-07-05: Clay Good. Probe run: 24 OK / 2 WARN, both on `ncei.noaa.gov` (apex and `/products/world-magnetic-model`; `fetch failed` network error in the probe environment). Manual recheck the same day: `https://www.ncei.noaa.gov` returns 200 and the apex `https://ncei.noaa.gov` returns a 301 to www, with the WMM product page live at `https://www.ncei.noaa.gov/products/world-magnetic-model`. The source (NOAA NCEI, World Magnetic Model — `data/field/wmm/coefficients.json`) remains free and public; the WARN was an apex-host fetch quirk, not a paywall or takedown. No action needed; recheck on the next probe run.

## Adding a new dataset

1. Add the authoritative input to `scripts/build-data.mjs` (or to a new in-tree input file under `scripts/`).
2. Add a `DATASETS` entry mapping the input to one or more shards.
3. Update `docs/data-sources.md` and this file with the source, license, and cadence.
4. If a new physics derivation is implied, update `docs/derivations.md`.
5. Run `npm run data:refresh && npm run data:verify` and commit the resulting `data/` and `scripts/expected-hashes.json`.

## Last-diff log

### 2026-07-13

- run: data-refresh (build-data.mjs + integrity verify)
- shards inspected: 103
- shards changed: 29

- `accounting/estimated-tax-due-dates.json` (fab72ce16c10 -> f99a076ee82e): 2 keys modified
- `accounting/inventory-benchmarks.json` (cbbf0fa390d7 -> b0c4827394fa): 2 keys modified
- `accounting/macrs-tables.json` (46d67def7ecd -> a6fe2977bb6d): 2 keys modified
- `accounting/pub-15-t-tables.json` (89061c2ce4ab -> 04619970856a): 2 keys modified
- `accounting/se-tax-parameters.json` (463491c1ec7e -> 34e800e6bcbb): 2 keys modified
- `accounting/section-179-limits.json` (8b697baa6855 -> b0a45ba9ab43): 2 keys modified
- `accounting/standard-mileage-rates.json` (b0595fe266d1 -> 56f373fce5e2): 2 keys modified
- `construction/aci-211-curves.json` (ca22e2509e45 -> ca22e2509e45): no change
- `construction/apa-span-ratings.json` (6ce521275c75 -> 6ce521275c75): no change
- `construction/aws-deposition.json` (fdd589d4fdb1 -> fdd589d4fdb1): no change
- `construction/bolt-grades.json` (2ae7ee4788d3 -> 2ae7ee4788d3): no change
- `construction/concrete-mixes.json` (4c302a4012fa -> 4c302a4012fa): no change
- `construction/helical-pile-kt.json` (a746fd863663 -> a746fd863663): no change
- `construction/lumber-properties.json` (907d33373362 -> 907d33373362): no change
- `construction/rebar-unit-weights.json` (aa9d90af63d3 -> aa9d90af63d3): no change
- `construction/sfm-table.json` (c91bd6e512ce -> c91bd6e512ce): no change
- `construction/soil-bearing.json` (c479e27f0a86 -> c479e27f0a86): no change
- `construction/span-derivations.json` (50d4f50c6dcd -> 98eb4884a314): 1 key modified
- `construction/wind-snow-zones.json` (4b7d5d2b3094 -> 4b7d5d2b3094): no change
- `cross/glossary.json` (aae755e0e261 -> 57a7e7fff472): 2 keys modified
- `crosswalks/fall-protection-benchmarks.json` (abf9d6c944d0 -> abf9d6c944d0): no change
- `crosswalks/gsa-perdiem.json` (a7578ff49317 -> a7578ff49317): no change
- `crosswalks/heat-cold-stress.json` (b869cc9f7ecb -> b869cc9f7ecb): no change
- `crosswalks/irs-mileage.json` (76c4d0e863fd -> 76c4d0e863fd): no change
- `crosswalks/niosh-coupling.json` (ceb2d1f4928d -> ceb2d1f4928d): no change
- `crosswalks/osha-trench.json` (48a2a605c8b9 -> 48a2a605c8b9): no change
- `crosswalks/state-tax-rates.json` (2f39a76bfedf -> 599cab2ccd7a): 1 key modified
- `crosswalks/unit-conversions.json` (9a30ff3dd2f4 -> 9a30ff3dd2f4): no change
- `electrical/ampacity-physics.json` (ee06e7a3364d -> ee06e7a3364d): no change
- `electrical/cable-bend-radius.json` (86e27ac2c14c -> 86e27ac2c14c): no change
- `electrical/conductor-c-values.json` (d791e1bdee6d -> d791e1bdee6d): no change
- `electrical/conductor-properties.json` (6338b2a4c733 -> 6338b2a4c733): no change
- `electrical/conduit-fill-tables.json` (f9f57a6fbfd9 -> f9f57a6fbfd9): no change
- `electrical/demand-factors.json` (8f5b31ced991 -> 8f5b31ced991): no change
- `electrical/dwelling-demand.json` (7e49f0ef7184 -> 7e49f0ef7184): no change
- `electrical/lighting-density.json` (eadd8967e4cc -> eadd8967e4cc): no change
- `electrical/motor-fla.json` (28215fa1458e -> 28215fa1458e): no change
- `electrical/nema-mg1-code-letters.json` (8c66b1680f33 -> 8c66b1680f33): no change
- `electrical/poe-classes.json` (32b6d4885f04 -> 32b6d4885f04): no change
- `field/wmm/coefficients.json` (0e2a631c6b09 -> 0e2a631c6b09): no change
- `fire/fire-flow-formulas.json` (b2b4a1de0eb3 -> b2b4a1de0eb3): no change
- `fire/hose-friction.json` (61ea899b5920 -> 61ea899b5920): no change
- `fire/iso-nff.json` (b2ca30cd7a44 -> b2ca30cd7a44): no change
- `historical/commodities/aluminum.json` (edc066a7efae -> b375bada5d37): 1 key modified
- `historical/commodities/asphalt.json` (f0f1100e1ff5 -> a16bb567dc5a): 1 key modified
- `historical/commodities/copper.json` (0334b215854e -> a484c9301278): 1 key modified
- `historical/commodities/corn.json` (58057daebdb5 -> 8d6022888b70): 1 key modified
- `historical/commodities/diesel.json` (99ca3c08ad04 -> 15e513231aaf): 1 key modified
- `historical/commodities/drywall.json` (e68367cb16ee -> f3f1c918fca0): 1 key modified
- `historical/commodities/framing-lumber.json` (f6d1d26f004a -> f93332a1381f): 1 key modified
- `historical/commodities/gasoline.json` (ce959cc20d45 -> 8104258e43ef): 1 key modified
- `historical/commodities/natural-gas.json` (dabb40c8771a -> f5b19670aa66): 1 key modified
- `historical/commodities/osb.json` (740493c17ba6 -> 1f8e3499044e): 1 key modified
- `historical/commodities/rebar.json` (58a083727911 -> 42cad5272281): 1 key modified
- `historical/commodities/soybeans.json` (146225356dbf -> 304f8277400b): 1 key modified
- `historical/commodities/structural-steel.json` (44e23e44c7e7 -> a2d27dcefb7a): 1 key modified
- `historical/commodities/wheat.json` (cf6bd64b75c2 -> 5296b35179cf): 1 key modified
- `hvac/affinity-laws.json` (659a61a606e1 -> 659a61a606e1): no change
- `hvac/baseboard-output.json` (7208d9ea6ed0 -> 7208d9ea6ed0): no change
- `hvac/charge-per-foot.json` (b10b873f3ce4 -> b10b873f3ce4): no change
- `hvac/climate-data.json` (f6ba8aad7d05 -> f6ba8aad7d05): no change
- `hvac/duct-fittings.json` (a55e7eddff68 -> a55e7eddff68): no change
- `hvac/duct-friction.json` (6125423dd611 -> 6125423dd611): no change
- `hvac/duct-roughness.json` (2d2a810a3640 -> 2d2a810a3640): no change
- `hvac/equivalent-lengths.json` (af8029560010 -> af8029560010): no change
- `hvac/geothermal-soil.json` (11da9b836cc7 -> 11da9b836cc7): no change
- `hvac/insulation-k-values.json` (56ed59c744fe -> 56ed59c744fe): no change
- `hvac/insulation.json` (efe3fdaaf22b -> efe3fdaaf22b): no change
- `hvac/refrigerant-pt-tables.json` (70e912b32176 -> 70e912b32176): no change
- `hvac/refrigerants.json` (381e90279841 -> 381e90279841): no change
- `lab/buffer-pka.json` (77471cefd382 -> b885b98a8d84): 2 keys modified
- `lab/centrifuge-rotors.json` (f41296953858 -> 9a0e0efe3572): 2 keys modified
- `lab/iupac-atomic-weights.json` (86c3468f3d47 -> 6607f2881121): 2 keys modified
- `legal/sales-tax-nexus.json` (9ab0a73966e8 -> c5232a45f63b): 2 keys modified
- `physical-constants/constants.json` (94153d714b42 -> 94153d714b42): no change
- `physical-constants/material-properties.json` (4dbfa160213e -> 4dbfa160213e): no change
- `plumbing/backflow-curves.json` (2429ca0cbad8 -> 2429ca0cbad8): no change
- `plumbing/fixture-units.json` (041663c5b574 -> 041663c5b574): no change
- `plumbing/gas-pipe-capacity.json` (d3b332e0d44f -> d3b332e0d44f): no change
- `plumbing/glycol-curves.json` (c41b74c5334e -> c41b74c5334e): no change
- `plumbing/manning-roughness.json` (0ebd989b23bd -> 0ebd989b23bd): no change
- `plumbing/material-expansion.json` (747c92e4f334 -> 747c92e4f334): no change
- `plumbing/pipe-elastic-properties.json` (70e8ee39a251 -> 70e8ee39a251): no change
- `plumbing/pipe-properties.json` (2f2108960852 -> 2f2108960852): no change
- `plumbing/pump-curves.json` (3c98ba39bfb9 -> 3c98ba39bfb9): no change
- `plumbing/runoff-coefficients.json` (0392e72c7fc9 -> 0392e72c7fc9): no change
- `plumbing/septic-rules.json` (11793e82d2a0 -> 11793e82d2a0): no change
- `plumbing/thermal-expansion-coefficients.json` (900b61a8add7 -> 900b61a8add7): no change
- `realestate/hud-fmr.json` (f35cf6bf5495 -> f35cf6bf5495): no change
- `realestate/loan-limits.json` (d56ebbf45518 -> d56ebbf45518): no change
- `restoration/drying-times.json` (7b74eda4574a -> 7b74eda4574a): no change
- `restoration/hepa-loading.json` (a8e75891c9f2 -> a8e75891c9f2): no change
- `restoration/mold-conditions.json` (023951c9bc1c -> 023951c9bc1c): no change
- `restoration/psychrometrics.json` (077cbd125415 -> 077cbd125415): no change
- `restoration/water-classes.json` (6eaecad7f3a3 -> 6eaecad7f3a3): no change
- `search/aliases.json` (- -> 2067d1e2fe7a): added (new shard)
- `search/preview-map.json` (121051f5db38 -> 121051f5db38): no change
- `search/slots.json` (b5135e22912b -> b5135e22912b): no change
- `summaries/summaries.json` (9034915769ce -> 9034915769ce): no change
- `summaries/v2-references.json` (d18e2662a73b -> d18e2662a73b): no change
- `summaries/v3-references.json` (8e42d88b1e5b -> 8e42d88b1e5b): no change
- `trucking/dim-divisors.json` (840f02d743f0 -> 840f02d743f0): no change
- `trucking/reefer-burn.json` (0c7a826df5e8 -> 0c7a826df5e8): no change

### 2026-07-06

- run: data-refresh (build-data.mjs + integrity verify)
- shards inspected: 101
- shards changed: 28

- `accounting/estimated-tax-due-dates.json` (304480499d2f -> fab72ce16c10): 2 keys modified
- `accounting/inventory-benchmarks.json` (58a4e65f6ea2 -> cbbf0fa390d7): 2 keys modified
- `accounting/macrs-tables.json` (3b4047e4f124 -> 46d67def7ecd): 2 keys modified
- `accounting/pub-15-t-tables.json` (803202558ec5 -> 89061c2ce4ab): 2 keys modified
- `accounting/se-tax-parameters.json` (c0482bb77afc -> 463491c1ec7e): 2 keys modified
- `accounting/section-179-limits.json` (21ae5fc03917 -> 8b697baa6855): 2 keys modified
- `accounting/standard-mileage-rates.json` (45ef1d4ee98c -> b0595fe266d1): 2 keys modified
- `construction/aci-211-curves.json` (ca22e2509e45 -> ca22e2509e45): no change
- `construction/apa-span-ratings.json` (6ce521275c75 -> 6ce521275c75): no change
- `construction/aws-deposition.json` (fdd589d4fdb1 -> fdd589d4fdb1): no change
- `construction/bolt-grades.json` (2ae7ee4788d3 -> 2ae7ee4788d3): no change
- `construction/concrete-mixes.json` (4c302a4012fa -> 4c302a4012fa): no change
- `construction/helical-pile-kt.json` (a746fd863663 -> a746fd863663): no change
- `construction/lumber-properties.json` (907d33373362 -> 907d33373362): no change
- `construction/rebar-unit-weights.json` (aa9d90af63d3 -> aa9d90af63d3): no change
- `construction/sfm-table.json` (c91bd6e512ce -> c91bd6e512ce): no change
- `construction/soil-bearing.json` (c479e27f0a86 -> c479e27f0a86): no change
- `construction/span-derivations.json` (1d5e444d20ce -> 50d4f50c6dcd): 1 key modified
- `construction/wind-snow-zones.json` (4b7d5d2b3094 -> 4b7d5d2b3094): no change
- `cross/glossary.json` (79f774770c0f -> aae755e0e261): 2 keys modified
- `crosswalks/fall-protection-benchmarks.json` (abf9d6c944d0 -> abf9d6c944d0): no change
- `crosswalks/gsa-perdiem.json` (a7578ff49317 -> a7578ff49317): no change
- `crosswalks/heat-cold-stress.json` (b869cc9f7ecb -> b869cc9f7ecb): no change
- `crosswalks/irs-mileage.json` (76c4d0e863fd -> 76c4d0e863fd): no change
- `crosswalks/niosh-coupling.json` (ceb2d1f4928d -> ceb2d1f4928d): no change
- `crosswalks/osha-trench.json` (48a2a605c8b9 -> 48a2a605c8b9): no change
- `crosswalks/state-tax-rates.json` (751b33585fcc -> 2f39a76bfedf): 1 key modified
- `crosswalks/unit-conversions.json` (9a30ff3dd2f4 -> 9a30ff3dd2f4): no change
- `electrical/ampacity-physics.json` (ee06e7a3364d -> ee06e7a3364d): no change
- `electrical/cable-bend-radius.json` (86e27ac2c14c -> 86e27ac2c14c): no change
- `electrical/conductor-c-values.json` (d791e1bdee6d -> d791e1bdee6d): no change
- `electrical/conductor-properties.json` (6338b2a4c733 -> 6338b2a4c733): no change
- `electrical/conduit-fill-tables.json` (f9f57a6fbfd9 -> f9f57a6fbfd9): no change
- `electrical/demand-factors.json` (8f5b31ced991 -> 8f5b31ced991): no change
- `electrical/dwelling-demand.json` (7e49f0ef7184 -> 7e49f0ef7184): no change
- `electrical/lighting-density.json` (eadd8967e4cc -> eadd8967e4cc): no change
- `electrical/motor-fla.json` (28215fa1458e -> 28215fa1458e): no change
- `electrical/nema-mg1-code-letters.json` (8c66b1680f33 -> 8c66b1680f33): no change
- `electrical/poe-classes.json` (32b6d4885f04 -> 32b6d4885f04): no change
- `field/wmm/coefficients.json` (0e2a631c6b09 -> 0e2a631c6b09): no change
- `fire/fire-flow-formulas.json` (b2b4a1de0eb3 -> b2b4a1de0eb3): no change
- `fire/hose-friction.json` (61ea899b5920 -> 61ea899b5920): no change
- `fire/iso-nff.json` (b2ca30cd7a44 -> b2ca30cd7a44): no change
- `historical/commodities/aluminum.json` (bc4deb8a8f72 -> edc066a7efae): 1 key modified
- `historical/commodities/asphalt.json` (dcb43a7ecea8 -> f0f1100e1ff5): 1 key modified
- `historical/commodities/copper.json` (dde31c463d69 -> 0334b215854e): 1 key modified
- `historical/commodities/corn.json` (d533d6eb24a6 -> 58057daebdb5): 1 key modified
- `historical/commodities/diesel.json` (ae564b499c85 -> 99ca3c08ad04): 1 key modified
- `historical/commodities/drywall.json` (86e8e267a6a1 -> e68367cb16ee): 1 key modified
- `historical/commodities/framing-lumber.json` (a382dade6311 -> f6d1d26f004a): 1 key modified
- `historical/commodities/gasoline.json` (1fc6102f5aec -> ce959cc20d45): 1 key modified
- `historical/commodities/natural-gas.json` (4634d1f1bc11 -> dabb40c8771a): 1 key modified
- `historical/commodities/osb.json` (af4120465456 -> 740493c17ba6): 1 key modified
- `historical/commodities/rebar.json` (803b6eaa0d2f -> 58a083727911): 1 key modified
- `historical/commodities/soybeans.json` (26a6bf8a4bec -> 146225356dbf): 1 key modified
- `historical/commodities/structural-steel.json` (3089172a07f6 -> 44e23e44c7e7): 1 key modified
- `historical/commodities/wheat.json` (30a5afc3d2e1 -> cf6bd64b75c2): 1 key modified
- `hvac/affinity-laws.json` (659a61a606e1 -> 659a61a606e1): no change
- `hvac/baseboard-output.json` (7208d9ea6ed0 -> 7208d9ea6ed0): no change
- `hvac/charge-per-foot.json` (b10b873f3ce4 -> b10b873f3ce4): no change
- `hvac/climate-data.json` (f6ba8aad7d05 -> f6ba8aad7d05): no change
- `hvac/duct-fittings.json` (a55e7eddff68 -> a55e7eddff68): no change
- `hvac/duct-friction.json` (6125423dd611 -> 6125423dd611): no change
- `hvac/duct-roughness.json` (2d2a810a3640 -> 2d2a810a3640): no change
- `hvac/equivalent-lengths.json` (af8029560010 -> af8029560010): no change
- `hvac/geothermal-soil.json` (11da9b836cc7 -> 11da9b836cc7): no change
- `hvac/insulation-k-values.json` (56ed59c744fe -> 56ed59c744fe): no change
- `hvac/insulation.json` (efe3fdaaf22b -> efe3fdaaf22b): no change
- `hvac/refrigerant-pt-tables.json` (70e912b32176 -> 70e912b32176): no change
- `hvac/refrigerants.json` (381e90279841 -> 381e90279841): no change
- `lab/buffer-pka.json` (1a49d9431cfe -> 77471cefd382): 2 keys modified
- `lab/centrifuge-rotors.json` (3d0161259a78 -> f41296953858): 2 keys modified
- `lab/iupac-atomic-weights.json` (5a44d00682a2 -> 86c3468f3d47): 2 keys modified
- `legal/sales-tax-nexus.json` (a6021668b22f -> 9ab0a73966e8): 2 keys modified
- `physical-constants/constants.json` (94153d714b42 -> 94153d714b42): no change
- `physical-constants/material-properties.json` (4dbfa160213e -> 4dbfa160213e): no change
- `plumbing/backflow-curves.json` (2429ca0cbad8 -> 2429ca0cbad8): no change
- `plumbing/fixture-units.json` (041663c5b574 -> 041663c5b574): no change
- `plumbing/gas-pipe-capacity.json` (d3b332e0d44f -> d3b332e0d44f): no change
- `plumbing/glycol-curves.json` (c41b74c5334e -> c41b74c5334e): no change
- `plumbing/manning-roughness.json` (0ebd989b23bd -> 0ebd989b23bd): no change
- `plumbing/material-expansion.json` (747c92e4f334 -> 747c92e4f334): no change
- `plumbing/pipe-elastic-properties.json` (70e8ee39a251 -> 70e8ee39a251): no change
- `plumbing/pipe-properties.json` (2f2108960852 -> 2f2108960852): no change
- `plumbing/pump-curves.json` (3c98ba39bfb9 -> 3c98ba39bfb9): no change
- `plumbing/runoff-coefficients.json` (0392e72c7fc9 -> 0392e72c7fc9): no change
- `plumbing/septic-rules.json` (11793e82d2a0 -> 11793e82d2a0): no change
- `plumbing/thermal-expansion-coefficients.json` (900b61a8add7 -> 900b61a8add7): no change
- `realestate/hud-fmr.json` (f35cf6bf5495 -> f35cf6bf5495): no change
- `realestate/loan-limits.json` (d56ebbf45518 -> d56ebbf45518): no change
- `restoration/drying-times.json` (7b74eda4574a -> 7b74eda4574a): no change
- `restoration/hepa-loading.json` (a8e75891c9f2 -> a8e75891c9f2): no change
- `restoration/mold-conditions.json` (023951c9bc1c -> 023951c9bc1c): no change
- `restoration/psychrometrics.json` (077cbd125415 -> 077cbd125415): no change
- `restoration/water-classes.json` (6eaecad7f3a3 -> 6eaecad7f3a3): no change
- `search/aliases.json` (ae1e6e3eff90 -> ae1e6e3eff90): no change
- `summaries/summaries.json` (9034915769ce -> 9034915769ce): no change
- `summaries/v2-references.json` (d18e2662a73b -> d18e2662a73b): no change
- `summaries/v3-references.json` (8e42d88b1e5b -> 8e42d88b1e5b): no change
- `trucking/dim-divisors.json` (840f02d743f0 -> 840f02d743f0): no change
- `trucking/reefer-burn.json` (0c7a826df5e8 -> 0c7a826df5e8): no change

Appended after each `data:refresh` CI run per spec-v12 §H.3. One stanza per run date with one bullet per shard (old-hash -> new-hash + one-sentence summary; `no change` when SHA-256 matched the previous commit).
### 2026-05-16

- run: data-refresh (build-data.mjs + integrity verify)
- shards inspected: 107
- shards changed: 0

- `accounting/estimated-tax-due-dates.json` (082a93afcdd8 -> 082a93afcdd8): no change
- `accounting/inventory-benchmarks.json` (7edfff8c00a3 -> 7edfff8c00a3): no change
- `accounting/macrs-tables.json` (f56da1ff791a -> f56da1ff791a): no change
- `accounting/pub-15-t-tables.json` (5059d5aa5026 -> 5059d5aa5026): no change
- `accounting/se-tax-parameters.json` (b9085041c670 -> b9085041c670): no change
- `accounting/section-179-limits.json` (9004cb87b41c -> 9004cb87b41c): no change
- `accounting/standard-mileage-rates.json` (1b95d802f8d7 -> 1b95d802f8d7): no change
- `construction/aci-211-curves.json` (ca22e2509e45 -> ca22e2509e45): no change
- `construction/apa-span-ratings.json` (6ce521275c75 -> 6ce521275c75): no change
- `construction/aws-deposition.json` (fdd589d4fdb1 -> fdd589d4fdb1): no change
- `construction/bolt-grades.json` (2ae7ee4788d3 -> 2ae7ee4788d3): no change
- `construction/concrete-mixes.json` (4c302a4012fa -> 4c302a4012fa): no change
- `construction/helical-pile-kt.json` (a746fd863663 -> a746fd863663): no change
- `construction/lumber-properties.json` (907d33373362 -> 907d33373362): no change
- `construction/rebar-unit-weights.json` (aa9d90af63d3 -> aa9d90af63d3): no change
- `construction/sfm-table.json` (c91bd6e512ce -> c91bd6e512ce): no change
- `construction/soil-bearing.json` (c479e27f0a86 -> c479e27f0a86): no change
- `construction/span-derivations.json` (e449387ee384 -> e449387ee384): no change
- `construction/wind-snow-zones.json` (4b7d5d2b3094 -> 4b7d5d2b3094): no change
- `cross/glossary.json` (4e1eb7dece08 -> 4e1eb7dece08): no change
- `crosswalks/fall-protection-benchmarks.json` (abf9d6c944d0 -> abf9d6c944d0): no change
- `crosswalks/gsa-perdiem.json` (a7578ff49317 -> a7578ff49317): no change
- `crosswalks/heat-cold-stress.json` (b869cc9f7ecb -> b869cc9f7ecb): no change
- `crosswalks/irs-mileage.json` (76c4d0e863fd -> 76c4d0e863fd): no change
- `crosswalks/niosh-coupling.json` (ceb2d1f4928d -> ceb2d1f4928d): no change
- `crosswalks/osha-trench.json` (48a2a605c8b9 -> 48a2a605c8b9): no change
- `crosswalks/state-tax-rates.json` (9a0a1aacd970 -> 9a0a1aacd970): no change
- `crosswalks/unit-conversions.json` (9a30ff3dd2f4 -> 9a30ff3dd2f4): no change
- `electrical/ampacity-physics.json` (ee06e7a3364d -> ee06e7a3364d): no change
- `electrical/cable-bend-radius.json` (86e27ac2c14c -> 86e27ac2c14c): no change
- `electrical/conductor-c-values.json` (d791e1bdee6d -> d791e1bdee6d): no change
- `electrical/conductor-properties.json` (6338b2a4c733 -> 6338b2a4c733): no change
- `electrical/conduit-fill-tables.json` (f9f57a6fbfd9 -> f9f57a6fbfd9): no change
- `electrical/demand-factors.json` (8f5b31ced991 -> 8f5b31ced991): no change
- `electrical/dwelling-demand.json` (7e49f0ef7184 -> 7e49f0ef7184): no change
- `electrical/lighting-density.json` (eadd8967e4cc -> eadd8967e4cc): no change
- `electrical/motor-fla.json` (28215fa1458e -> 28215fa1458e): no change
- `electrical/nema-mg1-code-letters.json` (8c66b1680f33 -> 8c66b1680f33): no change
- `electrical/poe-classes.json` (32b6d4885f04 -> 32b6d4885f04): no change
- `field/wmm/coefficients.json` (0e2a631c6b09 -> 0e2a631c6b09): no change
- `fire/fire-flow-formulas.json` (b2b4a1de0eb3 -> b2b4a1de0eb3): no change
- `fire/hose-friction.json` (61ea899b5920 -> 61ea899b5920): no change
- `fire/iso-nff.json` (b2ca30cd7a44 -> b2ca30cd7a44): no change
- `historical/commodities/aluminum.json` (4c396c8709ba -> 4c396c8709ba): no change
- `historical/commodities/asphalt.json` (f7dd60926148 -> f7dd60926148): no change
- `historical/commodities/copper.json` (7ede8571c76c -> 7ede8571c76c): no change
- `historical/commodities/corn.json` (44a2816d4434 -> 44a2816d4434): no change
- `historical/commodities/diesel.json` (1a740c11c311 -> 1a740c11c311): no change
- `historical/commodities/drywall.json` (d527991372c1 -> d527991372c1): no change
- `historical/commodities/framing-lumber.json` (a5a337dfb1f0 -> a5a337dfb1f0): no change
- `historical/commodities/gasoline.json` (c34335405d9b -> c34335405d9b): no change
- `historical/commodities/natural-gas.json` (56eddd4676f6 -> 56eddd4676f6): no change
- `historical/commodities/osb.json` (f5c77c903019 -> f5c77c903019): no change
- `historical/commodities/rebar.json` (d70307210789 -> d70307210789): no change
- `historical/commodities/soybeans.json` (ec403d421726 -> ec403d421726): no change
- `historical/commodities/structural-steel.json` (c5b053d566fe -> c5b053d566fe): no change
- `historical/commodities/wheat.json` (1be460550f8f -> 1be460550f8f): no change
- `hvac/affinity-laws.json` (659a61a606e1 -> 659a61a606e1): no change
- `hvac/baseboard-output.json` (7208d9ea6ed0 -> 7208d9ea6ed0): no change
- `hvac/charge-per-foot.json` (b10b873f3ce4 -> b10b873f3ce4): no change
- `hvac/climate-data.json` (f6ba8aad7d05 -> f6ba8aad7d05): no change
- `hvac/duct-fittings.json` (a55e7eddff68 -> a55e7eddff68): no change
- `hvac/duct-friction.json` (6125423dd611 -> 6125423dd611): no change
- `hvac/duct-roughness.json` (2d2a810a3640 -> 2d2a810a3640): no change
- `hvac/equivalent-lengths.json` (af8029560010 -> af8029560010): no change
- `hvac/geothermal-soil.json` (11da9b836cc7 -> 11da9b836cc7): no change
- `hvac/insulation-k-values.json` (56ed59c744fe -> 56ed59c744fe): no change
- `hvac/insulation.json` (efe3fdaaf22b -> efe3fdaaf22b): no change
- `hvac/refrigerant-pt-tables.json` (70e912b32176 -> 70e912b32176): no change
- `hvac/refrigerants.json` (381e90279841 -> 381e90279841): no change
- `lab/buffer-pka.json` (0d7db05b0054 -> 0d7db05b0054): no change
- `lab/centrifuge-rotors.json` (e0422db01019 -> e0422db01019): no change
- `lab/iupac-atomic-weights.json` (37b363a12600 -> 37b363a12600): no change
- `legal/court-holidays.json` (34e833334ace -> 34e833334ace): no change
- `legal/judgment-interest-rates.json` (44f88cd59208 -> 44f88cd59208): no change
- `legal/landlord-tenant-notice.json` (b0e6f16f180f -> b0e6f16f180f): no change
- `legal/sales-tax-nexus.json` (5992effe933c -> 5992effe933c): no change
- `legal/small-claims.json` (e660a584afbe -> e660a584afbe): no change
- `legal/state-minimum-wage.json` (7e3bb3cc57ae -> 7e3bb3cc57ae): no change
- `legal/statute-of-limitations.json` (7d07547d1348 -> 7d07547d1348): no change
- `physical-constants/constants.json` (94153d714b42 -> 94153d714b42): no change
- `physical-constants/material-properties.json` (4dbfa160213e -> 4dbfa160213e): no change
- `plumbing/backflow-curves.json` (2429ca0cbad8 -> 2429ca0cbad8): no change
- `plumbing/fixture-units.json` (041663c5b574 -> 041663c5b574): no change
- `plumbing/gas-pipe-capacity.json` (d3b332e0d44f -> d3b332e0d44f): no change
- `plumbing/glycol-curves.json` (c41b74c5334e -> c41b74c5334e): no change
- `plumbing/manning-roughness.json` (0ebd989b23bd -> 0ebd989b23bd): no change
- `plumbing/material-expansion.json` (747c92e4f334 -> 747c92e4f334): no change
- `plumbing/pipe-elastic-properties.json` (70e8ee39a251 -> 70e8ee39a251): no change
- `plumbing/pipe-properties.json` (2f2108960852 -> 2f2108960852): no change
- `plumbing/pump-curves.json` (3c98ba39bfb9 -> 3c98ba39bfb9): no change
- `plumbing/runoff-coefficients.json` (0392e72c7fc9 -> 0392e72c7fc9): no change
- `plumbing/septic-rules.json` (11793e82d2a0 -> 11793e82d2a0): no change
- `plumbing/thermal-expansion-coefficients.json` (900b61a8add7 -> 900b61a8add7): no change
- `realestate/hud-fmr.json` (f35cf6bf5495 -> f35cf6bf5495): no change
- `realestate/loan-limits.json` (d56ebbf45518 -> d56ebbf45518): no change
- `restoration/drying-times.json` (7b74eda4574a -> 7b74eda4574a): no change
- `restoration/hepa-loading.json` (a8e75891c9f2 -> a8e75891c9f2): no change
- `restoration/mold-conditions.json` (023951c9bc1c -> 023951c9bc1c): no change
- `restoration/psychrometrics.json` (077cbd125415 -> 077cbd125415): no change
- `restoration/water-classes.json` (6eaecad7f3a3 -> 6eaecad7f3a3): no change
- `search/aliases.json` (caa10636e2a4 -> caa10636e2a4): no change
- `summaries/summaries.json` (9034915769ce -> 9034915769ce): no change
- `summaries/v2-references.json` (d18e2662a73b -> d18e2662a73b): no change
- `summaries/v3-references.json` (8e42d88b1e5b -> 8e42d88b1e5b): no change
- `trucking/dim-divisors.json` (840f02d743f0 -> 840f02d743f0): no change
- `trucking/reefer-burn.json` (0c7a826df5e8 -> 0c7a826df5e8): no change

