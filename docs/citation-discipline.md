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
| conduit-fill | "Citation: per NEC 2023 Chapter 9, Table 4 (conduit areas) and Chapter 9, Table 5 (conductor areas). Fill thresholds 53% (1 conductor), 31% (2 conductors), 40% (>= 3 conductors). AHJ governs. Free at nfpa.org/freeaccess." |
| box-fill | "Citation: per NEC 2023 §314.16 (volume allowances by conductor size; devices count twice the largest conductor; internal clamps count once). AHJ governs. Free at nfpa.org/freeaccess." |
| service-load | "Citation: per NEC 2023 §220.12 (general lighting 3 VA/ft^2), §220.42 (dwelling demand 3000 / 35% / 25% schedule), §220.82 (optional method). AHJ governs final service sizing. Free at nfpa.org/freeaccess." |
| breaker-sizing | "Citation: per NEC 2023 §215.3, §230.79, §408.36. Continuous-load 125% rule per §210.20(A). Standard breaker sizes per §240.6. AHJ governs. Free at nfpa.org/freeaccess." |
| motor-fla | "Citation: Use motor nameplate FLA where available. Reference values per NEC 2023 Tables 430.247-430.250 and NEMA-aligned manufacturer technical bulletins. Free at nfpa.org/freeaccess." |
| egc-sizing | "Citation: per NEC 2023 Table 250.122 (EGC size by upstream OCPD). AHJ governs. Free at nfpa.org/freeaccess." |
| lighting-density | "Citation: per ASHRAE 90.1-2022 Table 9.5.1 (lighting power density by occupancy). AHJ governs adopted edition. Free at ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards." |
| gfci-afci-reference | "Citation: per NEC 2023 §210.8 (GFCI), §210.12 (AFCI), §406.4 (receptacle requirements). Original plain-English summaries by the project author; no code text reproduced. AHJ governs. Free at nfpa.org/freeaccess." |
| arc-flash-screen | "Citation: Ralph Lee (1982) closed-form, public, pre-IEEE-1584. NFPA 70E-2024 §130.5 requires an arc-flash risk assessment by a qualified person before energized work. Free at nfpa.org/freeaccess for NFPA 70E TOC and Annex D." |
| motor-branch-from-nameplate | "Citation: Computed from nameplate. NEC 2023 §430.6(A)(1) requires using the table FLA values (430.247, 430.248, 430.250) for branch-circuit conductor and overcurrent sizing where motor nameplate is not the reference. Continuous-load 125 percent rule per §430.22. AHJ governs. Free at nfpa.org/freeaccess." |
| grounding-electrode | "Citation: Per IEEE 142-2007 (Green Book) §4. Dwight (1936) closed-form for driven rods. NEC 2023 §250.53 governs adoption. Soil resistivity varies seasonally; field megger reading is the authoritative value at the time of inspection. Free at standards.ieee.org for IEEE bibliographic data." |
| outdoor-air-ventilation | "Citation: Per ASHRAE 62.1-2022 §6.2.2.1 (single-zone breathing-zone procedure). Rp and Ra values per Table 6-1 of the AHJ-adopted edition; the tile does not bundle the table. AHJ governs adopted edition. Free at ashrae.org for TOC." |
| hood-exhaust | "Citation: Per IMC 2021 §507.13 (Type I grease hoods) and §507.20 (Type II vapor-only hoods). Duty multipliers (200 / 300 / 400 / 550 cfm/ft for wall-canopy) are formula coefficients per the published IMC. NFPA 96-2024 governs grease-handling exhaust system design. Makeup air per IMC 508. AHJ governs final equipment selection. Free at codes.iccsafe.org for IMC TOC and at nfpa.org/freeaccess for NFPA 96 TOC." |
| recirc-loop-sizing | "Citation: Per ASPE Data Book Vol. 4 (Plumbing Engineering Design Handbook) Chapter 6 simplified per-foot heat-loss method. Friction head via Hazen-Williams (C=140 for copper). Annual cost = standing heat loss x runtime / heater efficiency / (100,000 BTU/therm gas or 3,412 BTU/kWh electric) x fuel price. ASHRAE 90.1-2022 §7.4.4 governs recirculation control requirements where adopted. AHJ governs. Free at aspe.org for TOC." |
| shr-latent | "Citation: Per ASHRAE Fundamentals 2021 Chapter 1 (psychrometrics) and Chapter 18 (nonresidential cooling and heating load calculations). Sea-level coefficients (1.08 sensible, 4840 latent) per ASHRAE Handbook; altitude correction via the standard atmosphere density ratio. Field measurement is the verdict; the rated total capacity is one input among several. Free at ashrae.org for TOC; full handbook is licensed." |
| spl-atmospheric | "Citation: Inverse-square law for far-field distance attenuation. Atmospheric absorption per ANSI S1.26-2014 (R2019) - per-octave-band alpha (dB/m) at the operator-supplied temperature / RH / pressure, applied multiplicatively over distance. For closed venues, room acoustics dominate over inverse-square. AHJ governs final coverage. Free at ansi.org for TOC." |
| drying-log | "Citation: Per IICRC S500-2021 (Standard for Professional Water Damage Restoration). IICRC certification governs. Boundary-humidity test - chamber GPP must trend below ambient GPP for drying to be in progress - is the public method; the standard governs acceptance. Free at iicrc.org for TOC; full standard is licensed." |
| confined-space-vent | "Citation: Per OSHA 29 CFR 1910.146 (Permit-Required Confined Spaces) and NIOSH 80-106 (Working in Confined Spaces). Pre-entry atmospheric monitoring with a calibrated 4-gas meter is required by 1910.146(d)(5); ventilation does not substitute for the meter. AHJ governs. Free at ecfr.gov and at cdc.gov/niosh." |
| scba-cylinder-time | "Citation: Per NFPA 1981-2019 (Open-Circuit SCBA for Emergency Services) and NIOSH 42 CFR 84. Manufacturer cylinder rating governs absolute scf. Field consumption varies with work rate; this is a planning estimate. Free at nfpa.org/freeaccess and ecfr.gov." |
| nfpa-1142-water-supply | "Citation: Per NFPA 1142-2022 (Standard on Water Supplies for Suburban and Rural Firefighting) §5. AHJ governs final water-supply requirement. Free at nfpa.org/freeaccess." |
| excavation-bench-plan | "Citation: Per OSHA 29 CFR 1926 Subpart P Appendix B (soil classification and slope) and §1926.652. Competent person on-site governs the final plan; this calculator outputs geometry only. Free at ecfr.gov." |
| stopping-sight-distance | "Citation: Per AASHTO Green Book (Policy on Geometric Design of Highways and Streets, 7th ed.) Chapter 3 stopping sight distance. AASHTO publishes design SSD tables; this calculator outputs the underlying physics. AHJ (state DOT) governs roadway design. Free at transportation.org for TOC." |
| lightning-countdown | "Citation: Per NOAA / NWS lightning safety. The 30-30 rule is an NWS public guideline. Speed of sound ~ 1125 ft/s; 5 s ~ 1 mi. Free at weather.gov/safety/lightning." |
| thi-livestock | "Citation: Per USDA-ARS livestock heat-stress research publications and Kansas State University Cooperative Extension. Public domain. Free at usda.gov and at K-State Research and Extension." |
| sprayer-calibration | "Citation: Per USDA Cooperative Extension Service public 1/128-acre calibration method. Pesticide label rates govern application; pesticide-applicator license governs use. Free at extension.org and at land-grant university extension offices." |
| sous-vide-pasteurization | "Citation: Per FDA Food Code Annex 6 Table A 6.5-log Salmonella reduction values. Come-up time from the slab-form thermal-diffusion approximation (Heisler chart at centerline, Fo ~ 0.4). Bundled food-thermal-diffusivity values per public engineering references (Baldwin Practical Guide to Sous Vide Cooking). Local food-safety authority and a qualified processing authority govern commercial-kitchen use. Free at fda.gov/food/retail-food-protection/fda-food-code." |
| svi-sludge-index | "Citation: Per USEPA Wastewater Operator Training (public domain) and WEF Manual of Practice No. 11 by name. State primacy agency NPDES permit governs effluent limits. Companion F:M ratio in the srt-fm-ratio tile. Free at epa.gov." |
| disinfection-ct | "Citation: Per USEPA Surface Water Treatment Rule Guidance Manual EPA 815-R-99-014 Table A-1 (free chlorine 3-log Giardia inactivation, ≤0.4 mg/L band, 6 temperature x 4 pH grid). 4-log virus credit per SWTR Table E-1 simplified contact-time formula. State primacy agency governs CT compliance; this tile is a planning check, not a compliance report. Free at epa.gov/dwreginfo/surface-water-treatment-rules." |
| noise-dose | "Citation: Per OSHA 29 CFR 1910.95(b) Appendix A and Table G-16a. NIOSH 98-126 recommends a 3 dB exchange rate; this calculator implements the OSHA 5 dB rule because OSHA is the regulatory record. AHJ governs. Free at ecfr.gov and at cdc.gov/niosh." |

### calc-plumbing.js (Group B)

| Tile | Source-stamp |
| --- | --- |
| pipe-sizing | "Citation: per IPC 2021 Table 422.1 (fixture units); Hunter's Curve (1940; NBS BMS65) public-domain methodology. AHJ governs. Free at codes.iccsafe.org." |
| gas-pipe-sizing | "Citation: per IFGC 2021 Table 402.4 (NFPA 54). Spitzglass low-pressure gas formula Q = 3550 * sqrt(d^5 * dP / (SG * L)). AHJ governs. Free at codes.iccsafe.org." |
| friction-loss | "Citation: Hazen-Williams (1905, public domain). IPC 2021 referenced for application." |
| septic-tank | "Citation: EPA Onsite Wastewater Treatment Manual (EPA/625/R-00/008). 150 gpd per bedroom rule of thumb; tank floor 1000 gal; tank gallons >= 2 * daily flow. State primacy agency governs final design. Free at epa.gov/septic." |
| grease-trap | "Citation: per IPC 2021 Table 1003.2 and PDI G101 by name. Volume = peak_flow * retention * loading_factor. AHJ governs. Free at codes.iccsafe.org." |
| trap-arm | "Citation: Standard trap-arm length table (public plumbing engineering practice). The trap weir must not drain through the vent; total fall limited to one pipe diameter." |

### calc-hvac.js (Group C)

| Tile | Source-stamp |
| --- | --- |
| manual-j-cooling | "Citation: Simplified screening estimate from envelope conductance, infiltration, internal gains, solar, and latent loads. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern. Free at codes.iccsafe.org for IMC references." |
| manual-j-heating | "Citation: Simplified screening estimate from envelope conductance and infiltration. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern. Free at codes.iccsafe.org for IMC references." |
| duct-sizing | "Citation: per IMC 2021 §603 and Darcy-Weisbach with Colebrook-White friction factor on standard galvanized-steel duct. Equivalent rectangular diameter per Huebscher. AHJ governs. Free at codes.iccsafe.org." |
| refrigerant-pt | "Citation: Manufacturer P-T table by attribution. ASHRAE 15-2022 governs refrigerant safety; manufacturer technical bulletin governs charge." |
| combustion-air | "Citation: per IMC 2021 §304 (combustion air). 50 ft^3 per 1000 BTU/hr by volume; outdoor opening 1 in^2 per 4000 BTU/hr or the larger indoor opening 1 in^2 per 1000 BTU/hr. AHJ governs. Free at codes.iccsafe.org." |

### calc-fire.js (Group F)

| Tile | Source-stamp |
| --- | --- |
| sprinkler-density | "Citation: per NFPA 13-2022 Table 12.1 (hazard density). total_gpm = area * density (gpm/ft^2). AHJ governs. Free at nfpa.org/freeaccess." |
| required-fire-flow | "Citation: per IFC 2021 Table B105.1 (ISO needed-fire-flow method). NFF = C * O * X * P; C = 18 * F * sqrt(A). AHJ governs. Free at codes.iccsafe.org." |
| pdp | "Citation: per NFPA 13-2022 §8.3 (pressure calculations). PDP = nozzle pressure + friction loss + elevation (0.434 psi/ft of water) + appliance loss. AHJ governs. Free at nfpa.org/freeaccess." |
| standpipe-friction | "Citation: per NFPA 14-2022 (standpipes). Elevation 0.434 psi/ft of water; CQ^2L friction per outlet hose section. AHJ governs. Free at nfpa.org/freeaccess." |

### calc-construction.js (Group E)

| Tile | Source-stamp |
| --- | --- |
| lumber-spans | "Citation: per IRC 2021 Tables R502.5, R602.5 (joist / header / framing spans); AWC NDS-2018 governs by reference. M = w*L^2/8; sigma = Mc/I; delta = 5wL^4/(384*E*I). AHJ governs. Free at codes.iccsafe.org and awc.org." |
| rafter | "Citation: per IRC 2021 Table R802.5.1 (rafter spans). Rafter = horizontal span * sqrt(1 + (rise/run)^2) by Pythagoras. AHJ governs. Free at codes.iccsafe.org." |
| stairs | "Citation: per IRC 2021 §R311.7 (stair dimensions). Riser height = total rise / risers; default tread depth 10 in. AHJ governs final inspection. Free at codes.iccsafe.org." |
| footing-area | "Citation: per IRC 2021 §R401-R403 (foundations); allowable soil-bearing values per IBC 2021 Table 1806.2. required_area = load / allowable_bearing. AHJ governs. Free at codes.iccsafe.org." |

### calc-kitchen.js, calc-trucking.js, calc-mechanic.js (Groups O, J, K)

| Tile | Source-stamp |
| --- | --- |
| hos-math | "Notice: Math aid for personal verification. The ELD on the truck is the legal record. Citation: per FMCSA 49 CFR 395 (Hours of Service). Free at ecfr.gov." |
| bridge-formula | "Citation: per 23 CFR 658.17 (Federal Bridge Formula). W = 500 (LN/(N-1) + 12N + 36) for any consecutive axle group N >= 2. State limits may be lower than federal. Free at ecfr.gov." |

### calc-vet.js (Group U, v12 §5)

Per spec-v12 §13.1 every Group U tile renders the v10 §B.1 limitation banner naming the attending veterinarian as the governance authority. Source-stamp strings are representative; the deeper per-tile reference block lives in [../citations.js](../citations.js) under `CITATIONS["vet-*"]`.

| Tile | Source-stamp |
| --- | --- |

### calc-ems.js (Group V, v12 §6)

Per spec-v12 §13.1 every Group V tile renders the v10 §B.1 limitation banner naming the EMS medical director and the receiving facility as the governance authority. The cite-strong receiving-facility verbiage is in the source-stamp; the medical-director notice is in the banner.

| Tile | Source-stamp |
| --- | --- |

### calc-aviation.js (Group W, v12 §7)

Group W does not render the §B.1 limitation banner; the cite-strong aviation governance verbiage names the pilot-in-command (PIC) and the airplane flight manual (AFM) / pilot's operating handbook (POH) directly.

| Tile | Source-stamp |
| --- | --- |

### calc-realestate.js (Group X, v12 §8)

Group X does not render the §B.1 limitation banner; the lender-governs and appraiser-governs verbiage names the records-of-record directly.

| Tile | Source-stamp |
| --- | --- |
| piti | "Citation: Standard monthly P&I annuity identity. Tax + insurance + HOA + PMI per simple division. Lender governs final underwriting. Appraiser governs final value. No copyrighted source." |
| amortization-schedule | "Citation: Standard period-by-period amortization. Total interest = total paid - principal. Extra principal accelerates payoff. Lender governs. No copyrighted source." |
| dti | "Citation: Front-end and back-end DTI per FNMA Single-Family Selling Guide and FHA Handbook 4000.1. Conventional <= 36 / 43; FHA <= 31 / 43; VA <= 41. Lender governs final underwriting. Free at singlefamily.fanniemae.com and hud.gov." |
| ltv | "Citation: LTV = loan / value. PMI threshold per FNMA / FHLMC servicing guides (PMI cancellable at 80 percent LTV under Homeowners Protection Act of 1998). Lender governs. Free at fanniemae.com and ftc.gov." |
| cap-rate-dscr | "Citation: Cap rate = NOI / value; DSCR = NOI / annual debt service. Standard CRE underwriting ratios. Appraiser and lender govern. No copyrighted source." |
| exchange-1031-timeline | "Citation: Per 26 USC 1031(a)(3) and Treasury Regulation 1.1031(k)-1. 45-day identification window; 180-day exchange-close window. Federal-holiday rollover per the v5 court-deadline helper. Qualified intermediary required; tax professional and attorney govern. Free at uscode.house.gov and ecfr.gov." |
| section-121-exclusion | "Citation: Per IRC 121 (principal-residence exclusion). $250,000 single / $500,000 MFJ. Two-of-five-years occupancy test. CPA governs final return. Free at uscode.house.gov." |
| loan-limits | "Citation: Per FHFA Conforming Loan Limit Values (annual) and HUD FHA Single-Family Mortgage Limits (annual). VA full-entitlement cap removed 2020-01-01 per Blue Water Navy Vietnam Veterans Act of 2019. Lender governs. Free at fhfa.gov and entp.hud.gov." |
| hud-fmr | "Citation: Per HUD PD&R Fair Market Rents (federal fiscal year, effective each October 1). Free at huduser.gov/portal/datasets/fmr.html." |
| rental-worksheet | "Citation: IRS Schedule E (Form 1040) Part I worksheet shape. NOI = EGI - operating expenses. Taxable rental income = NOI - depreciation. Cap rate and cash-on-cash for context. CPA governs final return. Free at irs.gov/forms-pubs." |

### calc-edu.js (Group Y, v12 §9)

Group Y does not render the §B.1 limitation banner; the teacher-governs and registrar-governs verbiage names the authority directly.

| Tile | Source-stamp |
| --- | --- |
| readability | "Citation: Per Kincaid, Fishburne, Rogers, and Chissom, 'Derivation of New Readability Formulas,' Naval Technical Training Command Research Branch Report 8-75 (1975). Public-domain federal publication. Free at apps.dtic.mil (NTIS ADA006655)." |
| alternate-readability | "Citation: SMOG per McLaughlin, Journal of Reading 12:8 (1969). Coleman-Liau per Coleman and Liau, Journal of Applied Psychology 60:2 (1975). Gunning Fog per Gunning (1952). ARI per Smith and Senter, AMRL-TR-66-220 (1967). Public-domain or pre-DMCA formula identities." |
| lexile-band | "Notice: 'Lexile' is a registered trademark of MetaMetrics. The grade-band targets here are summarized from publicly published state-DOE bulletins implementing the post-2012 CCSS stretch ranges. Teacher governs final text selection." |
| gpa-calculator | "Citation: Standard US 4.0 / 5.0 scale. Letter-to-point conversion is the AACRAO conventional table. School registrar governs final transcript." |
| statistics-quickread | "Citation: Standard descriptive statistics (mean / median / mode / variance / standard deviation). Sample SD uses Bessel correction (n-1); population SD uses n. No copyrighted source." |
| confidence-interval | "Citation: Wald CI for large n; Clopper-Pearson exact CI for small n. Standard inferential statistics. Free at dlmf.nist.gov for the underlying normal-and-beta-distribution identities." |
| bell-curve-zscore | "Citation: z = (raw - mean) / sd. Percentile from the standard-normal CDF via Abramowitz and Stegun formula 26.2.17 (Handbook of Mathematical Functions, 1964, public-domain federal publication; NIST DLMF successor at dlmf.nist.gov). 68-95-99.7 empirical rule for band labels. Teacher governs final grading." |
| codon-table | "Citation: Per the IUPAC-IUBMB standard genetic code (Table 1 of the NCBI Taxonomy database genetic-code reference). Free at ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi." |
| periodic-element | "Citation: Atomic numbers / symbols per IUPAC. Pauling electronegativity per Pauling, 'The Nature of the Chemical Bond' (1960). Electron configurations and common oxidation states per NIST Atomic Spectra Database. Free at physics.nist.gov/asd." |

## Edition-roll workflow

1. Pick the source whose edition is rolling (NEC 2023 -> NEC 2026, etc.).
2. Update the row in this file with the new edition year and section numbers if they shifted.
3. Update the corresponding source-stamp string in the renderer.
4. Update the structured `CITATIONS["<tile-id>"]` entry in `citations.js` (formula / edition / freeAccess fields).
5. If the data shard changed, update the `edition` field in `scripts/build-data.mjs` and the per-shard entry in `docs/data-sources.md`.
6. Update string assertions in tests that pin the edition year.
7. Run `npm run audit` (six stages: lint -> test -> build -> check:dist -> check:shells -> data:verify per spec-v12 §G.3 + spec-v13 Phase G). All must pass.

## What this file is not

This file is not a copy of the code text. The code book itself remains under copyright; we cite by edition + section number + free-access URL only. The structured `CITATIONS` map and the source-stamp strings here are original prose authored to point at - not reproduce - the underlying source.
