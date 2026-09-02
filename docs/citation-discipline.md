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
| wire-ampacity | "Citation: a physics-based ESTIMATE, not a table lookup. This tile solves a steady-state thermal balance (I^2 R heating against convective and radiative loss from the conductor surface) with the effective coefficient calibrated to a 75 C THWN #12 in 30 C ambient, then applies the NEC 310.15(C)(1) conductor-count adjustment. It is NOT NEC 2023 Table 310.16: the free-air model scales roughly as area^0.75, so it reads progressively HIGH against the table as the conductor gets larger, and reading high on ampacity means undersizing the wire. Size conductors from NEC 2023 Table 310.16 in the AHJ-adopted edition; for table-based work use the ambient/fill adjustment tile, which takes the Table 310.16 ampacity as an input. Free at nfpa.org/freeaccess." |
| conduit-fill | "Citation: per NEC 2023 Chapter 9, Table 4 (conduit areas) and Chapter 9, Table 5 (conductor areas). Fill thresholds 53% (1 conductor), 31% (2 conductors), 40% (>= 3 conductors). AHJ governs. Free at nfpa.org/freeaccess." |
| box-fill | "Citation: per NEC 2023 §314.16 (volume allowances by conductor size; devices count twice the largest conductor; internal clamps count once). AHJ governs. Free at nfpa.org/freeaccess." |
| service-load | "Citation: per NEC 2023 §220.12 (general lighting 3 VA/ft^2), §220.42 (dwelling demand 3000 / 35% / 25% schedule), §220.82 (optional method). AHJ governs final service sizing. Free at nfpa.org/freeaccess." |
| breaker-sizing | "Citation: per NEC 2023 §215.3, §230.79, §408.36. Continuous-load 125% rule per §210.20(A). Standard breaker sizes per §240.6. AHJ governs. Free at nfpa.org/freeaccess." |
| motor-fla | "Citation: NEC 2023 430.6(A)(1) -- size conductors and overcurrent protection from the Table 430.247-430.250 value, not from the nameplate and not from these figures. 430.6(A)(2): the nameplate FLA is what sizes the overload device. The values below are typical published figures across NEMA-aligned manufacturer bulletins, for a sanity check on magnitude. Free at nfpa.org/freeaccess." |
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
| disinfection-ct | "Citation: Per USEPA Surface Water Treatment Rule Guidance Manual EPA 815-R-99-014 Table A-1 (free chlorine 3-log Giardia inactivation, ≤0.4 mg/L band, 6 temperature x 4 pH grid). 4-log virus pass inferred from the Giardia result (free-chlorine 3-log Giardia is more stringent than 4-log virus; no separate Table E-1 lookup). State primacy agency governs CT compliance; this tile is a planning check, not a compliance report. Free at epa.gov/dwreginfo/surface-water-treatment-rules." |
| noise-dose | "Citation: Per OSHA 29 CFR 1910.95(b) Appendix A and Table G-16a. NIOSH 98-126 recommends a 3 dB exchange rate; this calculator implements the OSHA 5 dB rule because OSHA is the regulatory record. AHJ governs. Free at ecfr.gov and at cdc.gov/niosh." |

### calc-plumbing.js (Group B)

| Tile | Source-stamp |
| --- | --- |
| pipe-sizing | "Citation: WSFU per IPC 2021 Table 604.3 and DFU per Table 709.1; Hunter's Curve (1940; NBS BMS65) public-domain methodology converts water-supply fixture units to gpm. AHJ governs. Free at codes.iccsafe.org." |
| gas-pipe-sizing | "Citation: per IFGC 2021 Table 402.4 (NFPA 54). Spitzglass low-pressure gas formula Q = 3550 * sqrt(d^5 * dP / (SG * L * (1 + 3.6/d + 0.03*d))), the diameter-correction term included as the tile computes it. AHJ governs. Free at codes.iccsafe.org." |
| friction-loss | "Citation: Hazen-Williams (1905, public domain). IPC 2021 referenced for application. Darcy-Weisbach with Colebrook-White for general fluid use. Free at codes.iccsafe.org." |
| septic-tank | "Citation: EPA Onsite Wastewater Treatment Manual (EPA/625/R-00/008). 150 gpd per bedroom rule of thumb; tank floor 1000 gal; tank gallons >= 2 * daily flow. State primacy agency governs final design. Free at epa.gov/septic." |
| grease-trap | "Citation: per IPC 2021 Table 1003.2 and PDI G101 by name. Volume = peak_flow * retention * loading_factor. AHJ governs. Free at codes.iccsafe.org." |
| trap-arm | "Citation: Standard trap-arm length table (public plumbing engineering practice). The trap weir must not drain through the vent; total fall limited to one pipe diameter." |

### calc-hvac.js (Group C)

| Tile | Source-stamp |
| --- | --- |
| manual-j-cooling | "Citation: Simplified screening estimate from envelope conductance, infiltration, internal gains, solar, and latent loads. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern. Free at codes.iccsafe.org for IMC references." |
| manual-j-heating | "Citation: Simplified screening estimate from envelope conductance and infiltration. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern. Free at codes.iccsafe.org for IMC references." |
| duct-sizing | "Citation: per IMC 2021 §603 and Darcy-Weisbach with Colebrook-White friction factor on standard galvanized-steel duct. Equivalent rectangular diameter per Huebscher. AHJ governs. Free at codes.iccsafe.org." |
| refrigerant-pt | "Citation: Manufacturer-published P-T tables for common refrigerants. Each refrigerant attributes its publishing manufacturer." |
| combustion-air | "Citation: per IMC 2021 §304 (combustion air). 50 ft^3 per 1000 BTU/hr by volume; outdoor opening 1 in^2 per 4000 BTU/hr or the larger indoor opening 1 in^2 per 1000 BTU/hr. This is the FREE AREA; each opening's smallest dimension must also be at least 3 in (IFGC 304.6 -- a long narrow opening is blocked by leaves and lint), which a free-area figure cannot enforce. AHJ governs. Free at codes.iccsafe.org." |

### calc-fire.js (Group F)

| Tile | Source-stamp |
| --- | --- |
| sprinkler-density | "Citation: per NFPA 13-2022 Table 12.1 (hazard density). total_gpm = area * density (gpm/ft^2). AHJ governs. Free at nfpa.org/freeaccess." |
| required-fire-flow | "Citation: per IFC 2021 Table B105.1 (ISO needed-fire-flow method). NFF = C * O * X * P; C = 18 * F * sqrt(A). AHJ governs. Free at codes.iccsafe.org." |
| pdp | "Citation: per NFPA 13-2022 §8.3 (pressure calculations). PDP = nozzle pressure + friction loss + elevation + appliance loss. Elevation applies the NFA / IFSTA fire-ground shortcut of 0.5 psi/ft, NOT the exact 0.434 psi/ft water column -- it runs about 15% high by design; the elevation-pressure-loss tile shows both side by side. AHJ governs. Free at nfpa.org/freeaccess." |
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

### Retired: calc-vet.js (Group U), calc-ems.js (Group V), calc-aviation.js (Group W)

Removed 2026-08-30. All three modules and their groups were retired; the sections
here had stood since, each with an empty source-stamp table under a paragraph
describing governance for tiles that no longer exist.

### calc-realestate.js (Group X, v12 §8)

Group X does not render the §B.1 limitation banner; the lender-governs and appraiser-governs verbiage names the records-of-record directly.

| Tile | Source-stamp |
| --- | --- |
| piti | "Citation: Standard mortgage amortization. Monthly P&I = (P * r) / (1 - (1 + r)^-n) where r = APR/12 and n = term months. Tax and insurance are annual line items spread monthly. HOA and PMI pass through from the user's line items. Lender governs final underwriting and the actual PMI rate." |
| amortization-schedule | "Citation: Standard mortgage amortization. Monthly P&I = (P * r) / (1 - (1 + r)^-n). Each row applies the interest first (i = balance * r), then the remaining payment to principal. Extra principal accelerates payoff and is subtracted before the next interest accrual. Lender governs the actual schedule (early-payment posting rules, escrow analysis cycles)." |
| dti | "Citation: Front-end DTI = housing payment / gross monthly income. Back-end DTI = (housing + other debts) / gross monthly income. Conventional thresholds per FNMA Single-Family Selling Guide §B3-6-02 (typical 36/45, up to 50 with compensating factors). FHA per Handbook 4000.1 §II.A.5 (default 31/43). VA per Lenders Handbook M26-7 (back-end 41, no front-end limit). Lender governs final underwriting." |
| ltv | "Citation: LTV = loan amount / value (appraised or purchase, whichever is less, per FNMA Single-Family Selling Guide §B2-1.1-01). PMI generally required at LTV > 80 percent for conventional conforming loans; FHA programs cap LTV at 96.5 percent for purchase. Lender governs final underwriting; appraiser governs final value." |
| cap-rate-dscr | "Citation: Cap rate = NOI / property_value; DSCR = NOI / annual_debt_service. Standard CRE underwriting ratios; bands are common-practice and may differ by lender / market / asset class. NOI is gross income minus operating expenses (excluding debt service, depreciation, income tax). Appraiser governs final value; lender governs underwriting." |
| exchange-1031-timeline | "Citation: Treas. Reg. §1.1031(k)-1(b). The 45-day identification and 180-day exchange-close deadlines are calendar days (no business-day or federal-holiday rollover, in contrast to Fed.R.Civ.P. 6(a)). The replacement-property acquisition deadline is the earlier of 180 days or the taxpayer's federal return due date for the year of the sale. A qualified intermediary is required; attorney and tax professional govern." |
| section-121-exclusion | "Citation: IRC §121 (Exclusion of Gain from Sale of Principal Residence), single cap $250,000 / joint cap $500,000. Two-of-five-year ownership and use test per §121(a). Partial exclusion per §121(c) for unforeseen circumstances. Non-qualified-use reduction per §121(b)(5) for periods after 2008. CPA and the IRS Form 8949 / Schedule D instructions govern the actual return; this tile is an estimate." |
| loan-limits | "Citation: 2026 conforming loan limit per FHFA Conforming Loan Limit Values (annual, fhfa.gov). FHA single-family mortgage limit per HUD (entp.hud.gov / idapp / html / hicostlook.cfm). VA full-entitlement cap removed effective 2020-01-01 per the Blue Water Navy Vietnam Veterans Act. Unknown counties fall back to the baseline; verify against the FHFA / HUD lookup or with the lender." |
| hud-fmr | "Citation: HUD Office of Policy Development and Research, Fair Market Rents (FY2026, effective 2025-10-01). Free at huduser.gov / portal / datasets / fmr. The 40th-percentile rent of recent-mover units in the HUD-defined FMR Area; used for HCV (Section 8) program payment standards, ESG, HOME, and others." |
| rental-worksheet | "Citation: IRS Schedule E (Form 1040), Supplemental Income and Loss, Part I (Income or Loss From Rental Real Estate). Expense categories mirror Schedule E lines 5-19. NOI excludes depreciation (a non-cash, separately-tracked line). Passive-loss rules (26 USC §469) govern whether a taxable rental loss reduces other income. The gross-rent multiplier (GRM = property value / annual gross rent) and the value it implies at a market GRM are the income-approach quick-screen per the Appraisal Institute, The Appraisal of Real Estate. CPA / appraiser governs." |

### calc-edu.js (Group Y, v12 §9)

Group Y does not render the §B.1 limitation banner; the teacher-governs and registrar-governs verbiage names the authority directly.

| Tile | Source-stamp |
| --- | --- |
| readability | "Citation: Flesch-Kincaid Grade Level per Kincaid, Fishburne, Rogers, and Chissom, 'Derivation of New Readability Formulas,' Naval Technical Training Command Research Branch Report 8-75 (1975), public-domain. Flesch Reading Ease per Flesch, 'A New Readability Yardstick,' Journal of Applied Psychology 32:3 (1948). Syllable counter is a vowel-cluster heuristic with silent-e and -le adjustments; differs from a dictionary syllable count by roughly 5 percent on edge cases (proper nouns, technical jargon)." |
| alternate-readability | "Citation: SMOG per McLaughlin, 'SMOG Grading: A New Readability Formula,' Journal of Reading 12:8 (1969). Coleman-Liau per Coleman and Liau, 'A computer readability formula designed for machine scoring,' Journal of Applied Psychology 60:2 (1975). Gunning Fog per Gunning, 'The Technique of Clear Writing' (1952). Automated Readability Index (ARI) per Smith and Senter, 'Automated Readability Index,' AMRL-TR-66-220, U.S. Air Force Aerospace Medical Research Laboratories (1967), public-domain federal publication." |
| lexile-band | "Citation: Common Core State Standards Appendix A (June 2010), Section III ('Quantitative Measures of Text Complexity'), and state-DOE bulletins implementing the CCSS stretch ranges (Smarter Balanced / PARCC consortium states). 'Lexile' is a registered trademark of MetaMetrics. Grade-band targets here are summarized from publicly published state-DOE guidance; the MetaMetrics text-measure tool itself is not bundled. Teacher governs final text selection." |
| gpa-calculator | "Citation: Standard US 4.0 / 5.0 GPA scale. Letter-to-point per the common registrar convention (A=4.0, A-=3.7, ..., F=0). Weighted GPA adds the per-course track bonus (honors +0.5, AP / IB / dual-enrollment +1.0) to passing grades only. School registrar governs final transcript; this is a planning aid only." |
| statistics-quickread | "Citation: Standard descriptive statistics. Mean = sum/n; sample variance s^2 = sum((x_i - mean)^2)/(n-1); population variance sigma^2 = sum((x_i - mean)^2)/n. The mode list is empty when every value is unique." |
| confidence-interval | "Citation: Wald confidence interval. For a proportion: phat +/- z * sqrt(phat * (1-phat) / n). For a mean: xbar +/- z * (sd / sqrt(n)). z critical values from the standard normal: 80% = 1.2816, 90% = 1.6449, 95% = 1.96, 98% = 2.3263, 99% = 2.5758. The Wald interval under-covers when n*phat < 10 (use Wilson or Clopper-Pearson) and is z-based for the mean (use a t-interval for small n with unknown sigma)." |
| bell-curve-zscore | "Citation: Standard normal CDF via Abramowitz + Stegun, Handbook of Mathematical Functions, formula 26.2.17 (1965; National Bureau of Standards Applied Mathematics Series 55). Public domain. Curve bands per the empirical 68-95-99.7 rule applied to grading: a common pre-CCSS convention. Teacher governs whether a normative curve is appropriate (CCSS-aligned standards-based grading does NOT curve)." |
| codon-table | "Citation: Standard genetic code (universal). Mitochondrial and a handful of bacterial / protozoan codes differ at specific codons and are NOT covered by this tile. The amino-acid three-letter / one-letter codes follow IUPAC-IUB nomenclature. Reading frame starts at position 1 of the entered sequence; this tile does not search for an internal AUG." |
| periodic-element | "Citation: IUPAC atomic numbers and element names (current IUPAC nomenclature). Pauling electronegativity values per Pauling, 'The Nature of the Chemical Bond' (3rd ed., 1960) and the modern IUPAC + Allred-Rochow consolidations. Electron configurations per NIST Atomic Spectra Database. Common oxidation states per the published Greenwood + Earnshaw, 'Chemistry of the Elements' (2nd ed., 1997) and Cotton + Wilkinson references." |

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
