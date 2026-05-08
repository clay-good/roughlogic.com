# Citation discipline - source-stamp strings

Single source of truth for the user-visible source-stamp strings shipped on each calculator tile. v8 Phase B (spec-v8.md §4) drove the polish pass that applied the v6 discipline (edition stamp + section number + AHJ-governs notice + free-access URL) to every code-derived utility. When an edition rolls (NEC 2026, IPC 2024, IRC 2024, IFC 2024, NFPA 13-2025, NFPA 14-2025, ASHRAE 62.1-2025, FDA Food Code 2026, etc.), update this file and propagate to the renderers.

The structured §3 reference block in `citations.js` is the deeper source - this file tracks the inline source-stamp strings that the renderer shows immediately next to the result. Both must agree.

## Conventions

- The string starts with "Citation:" or "Notice:" depending on whether the tile is a code-compliance tool (Citation) or a math-aid / advisory tool (Notice + Citation).
- Edition is named with the year. Section is named with the section number. AHJ-governs language is sized to the stakes per spec §2.5.
- The free-access URL is bare (no protocol, no trailing slash) and points at the publisher's own free-access portal.
- No em-dashes, no emojis, no decorative characters. Plain ASCII per the global typographic policy.

## Free-access URLs by source

| Source | Edition | Free-access URL |
| --- | --- | --- |
| NEC | 2023 | nfpa.org/freeaccess |
| NFPA 13 | 2022 | nfpa.org/freeaccess |
| NFPA 14 | 2022 | nfpa.org/freeaccess |
| IPC | 2021 | codes.iccsafe.org |
| IFGC | 2021 | codes.iccsafe.org |
| IRC | 2021 | codes.iccsafe.org |
| IBC | 2021 | codes.iccsafe.org |
| IMC | 2021 | codes.iccsafe.org |
| IFC | 2021 | codes.iccsafe.org |
| ASHRAE 15 / 62.1 / 90.1 | 2022 | ashrae.org |
| ACCA Manual J | 8th ed. | acca.org (membership; no free-access portal - cite by edition only) |
| AWC NDS | 2018 | awc.org |
| FDA Food Code | 2022 | fda.gov |
| FMCSA 49 CFR 395 | current | ecfr.gov |
| 23 CFR 658.17 | current | ecfr.gov |
| FAA AC 91-23A | current | faa.gov/regulations_policies/advisory_circulars |
| EPA Onsite Wastewater Treatment Manual | EPA/625/R-00/008 | epa.gov/septic |

## Per-tile source-stamp strings

### calc-electrical.js (Group A)

| Tile | Source-stamp |
| --- | --- |
| wire-ampacity | "Citation: per NEC 2023 Table 310.16 (75 C column) with §310.15(B) ambient/conduit-fill adjustments. AHJ-adopted edition governs. Free at nfpa.org/freeaccess." |
| conduit-fill | "Citation: per NEC 2023 Chapter 9, Table 4 (conduit areas) and Chapter 9, Table 5 (conductor areas). AHJ governs. Free at nfpa.org/freeaccess." |
| box-fill | "Citation: per NEC 2023 §314.16. AHJ governs. Free at nfpa.org/freeaccess." |
| service-load | "Citation: per NEC 2023 §220.12 (general lighting), §220.42 (dwelling demand), §220.82 (optional method). AHJ governs final service sizing." |
| breaker-sizing | "Citation: per NEC 2023 §215.3, §230.79, §408.36. Continuous-load 125% rule per §210.20(A). Standard breaker sizes per §240.6. AHJ governs. Free at nfpa.org/freeaccess." |
| motor-fla | "Citation: Use motor nameplate FLA where available. Reference values per NEC 2023 Tables 430.247-430.250 and NEMA-aligned manufacturer technical bulletins. Free at nfpa.org/freeaccess." |
| egc | "Citation: per NEC 2023 Table 250.122. AHJ governs. Free at nfpa.org/freeaccess." |
| lighting-density | "Citation: per ASHRAE 90.1-2022 Table 9.5.1 by occupancy. AHJ governs adopted edition." |
| gfci-afci-reference | "Citation: per NEC 2023 §210.8 (GFCI), §210.12 (AFCI), §406.4. AHJ governs. Free at nfpa.org/freeaccess." |

### calc-plumbing.js (Group B)

| Tile | Source-stamp |
| --- | --- |
| pipe-sizing | "Citation: per IPC 2021 Table 422.1 (fixture units); Hunter (1940) curve. AHJ governs. Free at codes.iccsafe.org." |
| gas-pipe-sizing | "Citation: per IFGC 2021 Table 402.4 (NFPA 54). AHJ governs. Free at codes.iccsafe.org." |
| friction-loss | "Citation: Hazen-Williams (1905, public domain). IPC 2021 referenced for application." |
| vent-sizing | "Citation: per IPC 2021 Table 906.1. AHJ governs. Free at codes.iccsafe.org." |
| septic-tank | "Citation: EPA Onsite Wastewater Treatment Manual (EPA/625/R-00/008). State primacy agency governs final design. Free at epa.gov/septic." |
| grease-trap | "Citation: per IPC 2021 Table 1003.2; PDI WD-G201 by name. AHJ governs. Free at codes.iccsafe.org." |
| trap-arm | "Citation: per IPC 2021 §909, Table 909.1 (max trap-arm length by trap size). AHJ governs. Free at codes.iccsafe.org." |

### calc-hvac.js (Group C)

| Tile | Source-stamp |
| --- | --- |
| manual-j-cooling, manual-j-heating | "Notice: Simplified screening estimate. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern." |
| duct-sizing | "Citation: per IMC 2021 §603 and Darcy-Weisbach with Colebrook-White friction factor on standard galvanized-steel duct. Equivalent rectangular diameter per Huebscher. AHJ governs. Free at codes.iccsafe.org." |
| refrigerant-pt | "Citation: Manufacturer P-T table by attribution. ASHRAE 15-2022 governs refrigerant safety; manufacturer technical bulletin governs charge." |
| combustion-air | "Citation: per IMC 2021 §304 (combustion air). 50 ft^3 per 1000 BTU/hr by volume; outdoor opening 1 in^2 per 1000 BTU/hr or indoor opening 1 in^2 per 4000 BTU/hr. AHJ governs. Free at codes.iccsafe.org." |

### calc-fire.js (Group F)

| Tile | Source-stamp |
| --- | --- |
| sprinkler-density | "Citation: per NFPA 13-2022 Table 12.1 (hazard density). AHJ governs. Free at nfpa.org/freeaccess." |
| required-fire-flow | "Citation: per IFC 2021 Table B105.1 (ISO needed-fire-flow method). AHJ governs. Free at codes.iccsafe.org." |
| pdp | "Citation: per NFPA 13-2022 §8.3 (pressure calculations). AHJ governs." |
| standpipe-friction | "Citation: per NFPA 14-2022 (standpipes). AHJ governs. Free at nfpa.org/freeaccess." |

### calc-construction.js (Group E)

| Tile | Source-stamp |
| --- | --- |
| lumber-spans | "Citation: per IRC 2021 Tables R502.5, R602.5 (header spans, framing). AWC NDS-2018 governs by reference. Free at codes.iccsafe.org and awc.org." |
| rafter | "Citation: per IRC 2021 Table R802.5.1 (rafter spans). AHJ governs. Free at codes.iccsafe.org." |
| stairs | "Citation: per IRC 2021 §R311.7 (stair dimensions). AHJ governs final inspection. Free at codes.iccsafe.org." |
| footing-area | "Citation: per IRC 2021 §R401-R403 (foundations). Soil-bearing values per IBC 2021 Table 1806.2. AHJ governs. Free at codes.iccsafe.org." |

### calc-kitchen.js, calc-trucking.js, calc-mechanic.js (Groups O, J, K)

| Tile | Source-stamp |
| --- | --- |
| cook-temps | "Citation: per FDA Food Code 2022 §3-401.11. Local health code adopts and may modify. The thermometer on the food is the verdict. Free at fda.gov." |
| hos-math | "Notice: Math aid for personal verification. The ELD on the truck is the legal record. Citation: per FMCSA 49 CFR 395 (Hours of Service). Free at ecfr.gov." |
| bridge-formula | "Citation: per 23 CFR 658.17 (Federal Bridge Formula). W = 500 (LN/(N-1) + 12N + 36) for any consecutive axle group N >= 2. State limits may be lower than federal. Free at ecfr.gov." |
| weight-balance | "Notice: Pilot-in-command and the airplane flight manual govern. Math aid only; verify against the AFM loading graph or table. Citation: per FAA AC 91-23A (Pilot's Weight and Balance Handbook). Free at faa.gov/regulations_policies/advisory_circulars." |

## Edition-roll workflow

1. Pick the source whose edition is rolling (NEC 2023 -> NEC 2026, etc.).
2. Update the row in this file with the new edition year and section numbers if they shifted.
3. Update the corresponding source-stamp string in the renderer.
4. Update the structured `CITATIONS["<tile-id>"]` entry in `citations.js` (formula / edition / freeAccess fields).
5. If the data shard changed, update the `edition` field in `scripts/build-data.mjs` and the per-shard entry in `docs/data-sources.md`.
6. Update string assertions in tests that pin the edition year.
7. Run `npm run lint && npm test`. Both must pass.

## What this file is not

This file is not a copy of the code text. The code book itself remains under copyright; we cite by edition + section number + free-access URL only. The structured `CITATIONS` map and the source-stamp strings here are original prose authored to point at - not reproduce - the underlying source.
