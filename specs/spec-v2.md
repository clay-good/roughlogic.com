# roughlogic.com Specification v2 — Expansion Pack

> **Implementation status (2026-05-08): complete in v0.2.0.** See [../CHANGELOG.md](../CHANGELOG.md) for the build-progress notes for this spec. The constraints below remain in force for any future work.

This document is the v2 spec for roughlogic.com. It defines an additional set of utilities to be added on top of the v1 specification (`spec.md`). The v1 spec remains the architectural and legal source of truth; v2 inherits all of its principles, constraints, and patterns. This document only describes new utilities, the data they need, and the build prompts to add them.

Repository: github.com/clay-good/roughlogic.com

## 1. Inheritance from v1

Every constraint in `spec.md` continues to hold:

- 100% client-side, single-page static web application on Cloudflare Pages.
- No server, no account, no analytics, no telemetry, no AI inference, no API key, no localStorage / sessionStorage / cookies / IndexedDB. URL hash is the only state mechanism.
- CSP `default-src 'self'`, `connect-src 'self'`, `worker-src 'self'`, etc. (spec section 7).
- WCAG 2.2 Level AA, 48 px touch targets, voice input compatibility, single h1 per view (spec section 9).
- No emojis, no em-dashes, no decorative icons (spec section 8). The brand mark in `favicon.svg` is the only graphic.
- No reproduction of NEC, IPC, IRC, IECC, IFC, IBC, ASHRAE Fundamentals, ACCA Manual J/D/S, NFPA standards, AWC Wood Design Manual, or any other licensed code text. Calculations derive from public physics and public-domain data; data values are physical facts or U.S. government / manufacturer-attributed sources cleared for redistribution (spec section 5).
- Per-view inline notice ("This is a math aid for verification...") on every calculator; SOP-and-incident-command variant on fire-ground utilities.
- Live-render pattern with 50 ms debounce, no submit buttons, aria-live="polite" output regions, "Test with example" button, Copy and Copy-all affordances, inline citation, inline data-source stamp on reference utilities, hash-bookmarkable inputs (spec section 11).
- Lazy-loaded calculator modules per spec section 11.1 (home-view payload under 100 KB).
- 220+ unit tests; lint, grep, n-gram fuzzy detector, integrity check, Lighthouse, axe-core all green per spec section 13.
- Public changelog, semantic versioning, no A/B testing, no flags, no tracking, no email capture, no notifications. 90-day deprecation notice for any utility being removed (spec section 11.8).

If any v2 entry below would violate a v1 constraint, the v1 constraint wins; the v2 entry is dropped or rewritten until it complies.

## 2. New Utilities (numbered continuing from v1)

The v1 spec defines utilities 1 through 64 in seven groups (A through G). v2 adds utilities 65 through 116, organized into the same groups plus one new group H for "Knowledge References" (reference pages without numeric inputs) and one new group I for "Cross-cutting platform" affordances that are not standalone utilities but enhance the existing site.

### Group A extensions: Electrical (utilities 65 through 71)

- 65. Service Load Calculation (Residential) — sum general lighting (3 W/ft²), small-appliance (1500 W × 2 minimum), laundry (1500 W), fixed appliances, range, dryer, HVAC; apply standard demand factors; output service ampacity at 240 V. First-principles arithmetic over public demand factors. Inline notice "AHJ governs final service sizing."
- 66. Generator Sizing — table of running watts per appliance, with multiplier 3× on the largest motor's running watts for surge. Output: minimum continuous kW + minimum surge kW.
- 67. Solar PV String Sizing — module Voc, Vmp, Voc temperature coefficient (% per °C), record low and high site temperatures, inverter MPPT min/max, inverter Vdc max. Output: max series count from cold-Voc, min series from hot-Vmp. First-principles temperature math.
- 68. Battery Runtime — battery Ah, system V, depth-of-discharge percent, load watts, optional Peukert exponent. Output: hours of runtime. With Peukert correction: t = C/I^k.
- 69. Voltage Imbalance — three line voltages. Output: percent imbalance = max deviation / average × 100; motor derate (0.95 at 1%, 0.90 at 2%, 0.85 at 3%, etc.).
- 70. GFCI/AFCI Requirements Reference — original plain-English summaries by occupancy area (kitchen, bath, garage, outdoor receptacles, bedrooms, dwelling-unit branch circuits). References NEC sections by number only.
- 71. Lighting Density (W/ft²) — area, occupancy class. Output: target watts using public engineering benchmarks (e.g., 1.0 W/ft² office, 0.5 W/ft² warehouse). Cite the benchmarks generally.

### Group B extensions: Plumbing and Gas (utilities 72 through 78)

- 72. Water Hammer Arrestor Sizing — fixture units, pipe length, pipe diameter. Output: AA-A-RR designation per the public PDI WH-201 method (the method, not the published text).
- 73. Hot Water Recirculation Pump Head — pipe length one-way, fittings count, target flow gpm. Output: pump head ft using the existing Hazen-Williams + equivalent-length helpers.
- 74. Septic Tank Sizing — bedrooms or daily flow gpd. Output: minimum tank gallons from the standard 150 gpd/bedroom rule of thumb.
- 75. Trap Arm Length and Slope — drainage trap arm length given trap-to-vent fall and pipe diameter. Output: maximum permitted length from public plumbing engineering practice.
- 76. Pipe Thermal Expansion — material (copper / PEX / PVC / CPVC / steel), length ft, ΔT °F. Output: expansion ΔL in inches using ΔL = α·L·ΔT.
- 77. Tankless Water Heater GPM — incoming groundwater temperature (NOAA station data), target outlet temperature. Output: GPM per kBTU input.
- 78. Gas Leak Rate (orifice flow) — orifice diameter, upstream gauge pressure, gas. Output: leak rate cfh from Q = c·A·√(2·ΔP/ρ).

### Group C extensions: HVAC (utilities 79 through 85)

- 79. Refrigerant Charge Weighing — line-set length ft, line diameter, refrigerant. Output: charge in oz using published oz/ft per refrigerant per diameter (manufacturer-attributed in the data shard).
- 80. Approach and Δ-T Diagnostics — outdoor air temp, condenser saturation temp, supply air temp, return air temp. Output: condenser approach, Δ-T, with normal-range banding.
- 81. Outdoor Air Mix — return air temp + RH, outdoor air temp + RH, OA fraction. Output: mixed dry-bulb and humidity ratio. Uses existing psychrometric helpers.
- 82. Equivalent Length of Fittings — element type (90° elbow, 45° elbow, tee branch, gate valve...) with counts. Output: total equivalent feet using public engineering equivalent-length tables.
- 83. Wet-Bulb / Sling Psychrometer — dry-bulb and wet-bulb. Output: RH, dew point, GPP. Companion to the existing psychrometric calculator.
- 84. Pipe Insulation Thickness — pipe OD, ambient temp, surface temp limit, insulation k. Output: required thickness from Q = 2π·k·L·ΔT/ln(r₂/r₁) iterated for desired surface temp.
- 85. Latent Heat for Evaporative Cooling — air temp, water temp, evaporation rate. Output: cooling effect BTU/hr from Q = ṁ·hfg.

### Group D extensions: Restoration (utilities 86 through 89)

- 86. Standing Water Volume — affected area ft², depth in inches. Output: gallons (1 ft³ = 7.48 gal).
- 87. Negative Air Machine Sizing — room volume ft³, target air changes per hour. Output: required CFM = volume × ACH / 60. Recommend NAM count by typical 500/1000/2000 CFM units.
- 88. HEPA Scrubber Filter Life Estimator — runtime hours/day, CFM, particulate loading category. Output: estimated filter days based on typical loading curves.
- 89. Thermal Imager Δ-T Threshold Reference — original plain-English summary of typical surface-temperature differentials that suggest moisture, missing insulation, electrical hotspot.

### Group E extensions: Carpentry and Construction (utilities 90 through 99)

- 90. Stair Stringer Length — total rise, total run, tread cut depth. Output: diagonal stringer length using Pythagorean over rise + run, plus a board-foot estimate.
- 91. Joist Mid-Span Deflection — uniform load w (plf), span L (ft), E (psi), I (in⁴). Output: δ in inches at midspan = 5wL⁴/(384·E·I); flag if exceeds L/360 or L/240. Reuses existing beam helpers.
- 92. Footing Area for Soil Bearing — column load lb, allowable bearing pressure psf by soil class. Output: required footing area ft² (load / pressure) and side dimension. Soil classes from USGS.
- 93. Tile Count and Grout Volume — area ft², tile size in × in, grout joint width. Output: tile count with waste, grout cubic inches estimate.
- 94. Paint Coverage — area ft², coats, primer-needed flag, surface porosity (smooth / textured / rough). Output: gallons per coat using typical 350/250/175 ft²/gal benchmarks.
- 95. Excavation Volume — length, width, depth, side-slope angle. Output: cubic yards including the prism formed by the slope.
- 96. Brick and CMU Count — wall area ft², unit nominal size, mortar joint thickness. Output: unit count with 5% waste.
- 97. Wind Load Pressure (basic) — basic wind speed V (mph), exposure category, roof type. Output: velocity pressure q = 0.00256·V² and a worked Cp for windward/leeward walls per public ASCE 7 formula (formula only, no text reproduction).
- 98. Snow Load (ground / flat-roof) — ground snow load Pg, exposure, thermal, importance factors. Output: flat-roof snow load Pf = 0.7·Ce·Ct·Is·Pg (formula only, public).
- 99. Anchor Bolt Embedment — uplift load lb, bolt diameter, concrete strength fc. Output: minimum embedment depth from public published bond-strength formulas.

### Group F extensions: Fire-Ground Engineering (utilities 100 through 104)

- 100. Reverse-Lay Supply Friction Loss — supply hose length, diameter, gpm, two-pump operation flag. Output: pressure drop with one-pump and tandem-pump scenarios.
- 101. Sprinkler GPM Density — area of operation ft², density gpm/ft². Output: total gpm for the design area.
- 102. Standpipe Friction Loss — riser length, outlet count, gpm per outlet. Output: total friction + elevation pressure.
- 103. Ladder Pipe Reach — set angle, extension, nozzle pressure. Output: horizontal reach using existing aerial-ladder geometry plus stream-reach scaling.
- 104. Vehicle Braking Distance — speed mph, road friction coefficient, grade percent. Output: stopping distance ft = v²/(2·μ·g) with grade adjustment.

### Group G extensions: Cross-Trade (utilities 105 through 113)

- 105. Loan Payment — principal, APR, term months. Output: monthly payment from P·r/(1−(1+r)^−n), total interest, amortization sample.
- 106. Upgrade ROI / Payback — incremental cost, annual savings. Output: simple payback years and 10-year NPV at user-supplied discount rate.
- 107. Mileage and Fuel Cost — round-trip miles, MPG, fuel price per gallon. Output: gallons used, fuel cost, optional federal mileage reimbursement (using bundled IRS standard rate per data shard, government-published).
- 108. Overtime Hours — total hours, regular rate, overtime multiplier (default 1.5×), double-time multiplier and threshold. Output: gross pay breakdown.
- 109. Per-Diem (federal GSA) — state, lodging or M&IE selector. Output: per-diem rate from bundled GSA-published rates (data/crosswalks/gsa-perdiem.json).
- 110. Geometry Pack — circle (circumference, area, sector), ellipse perimeter (Ramanujan), hexagon area, polygon perimeter, sphere volume.
- 111. Dilution / Mixing Ratio — concentrate strength (%), target strength (%), final volume. Output: concentrate volume + diluent volume.
- 112. Slope from Digital Level — input degrees or percent or in/ft. Output: the other two units. Companion to utility 18.
- 113. GPS Distance (haversine) — two lat/lon coordinate pairs. Output: distance miles and km, plus initial bearing.

### Group H (NEW): Knowledge References (utilities 114 through 118)

Each of these is a reference page with original plain-English summaries. No numeric inputs. They follow the existing reference-utility pattern (water-classes, smoke-reading) with inline citation and source-stamp.

- 114. Wire / Pipe / Gas Color Codes Reference — original plain-English summary of IEC and ANSI conventions, with cite-by-name only. No code-text reproduction.
- 115. Knot Reference — original plain-English summary of common rigging and rescue knots, with typical strength reduction (cite NFA / public sources).
- 116. Inspection Prep Checklist — original plain-English checklists per trade for rough-in and final inspections.
- 117. Utility Locator and Emergency Contacts — original plain-English list of universal numbers (811, 1-800-222-1222, OSHA hotline). No commercial directories.
- 118. Tool Maintenance Intervals Reference — original plain-English maintenance schedule for common tools (sharpening, oil change, blade replacement).

### Group I (NEW): Cross-cutting Platform Affordances (utilities 119 through 124)

These are not standalone utilities; they enhance the existing site. Each follows the spec section 11 and 11.5 architecture: hash-state, deterministic, no localStorage.

- 119. Compare Two Refrigerants — side-by-side P-T view at a chosen pressure or temperature for any two refrigerants from `data/hvac/refrigerants.json`.
- 120. Recent Tools — append-only ring of the last 10 tool ids visited, encoded into a separate hash key `r=...` so it remains shareable. Surfaced as a "Recents" section above "Pinned" on the home view when non-empty.
- 121. Project Bundle (URL or JSON) — one-click "Bundle this state" that encodes the current pinned set + multiple calculator inputs into a long URL hash, plus a "Download as JSON" affordance that emits a same-origin Blob URL (no server). "Load from JSON" reverses the operation.
- 122. Print / PDF View — per-calculator print stylesheet that hides nav, filters, and Copy buttons; preserves citation, source stamp, inputs, and outputs. Adds a "Print this calculator" button to the tool view header.
- 123. Offline Status Indicator — small "Offline" pill shown in the footer when navigator.onLine is false and hidden otherwise. Listens for `online`/`offline` events.
- 124. Example Deep-Link — calculator hash format extension `#tool?example=1` runs the example button on load. Already wired implicitly via stateful inputs; this exposes an explicit example flag and adds a "Copy share link" button on the tool view.

## 3. Out of Scope (still)

- HazMat content. Belongs on a future hazardous-materials reference site or sophiewell as a field-medicine extension.
- Commercial pricing databases. License-restricted, drift quickly, and conflict with the no-ongoing-cost stability commitment.
- Code-compliance verdicts ("does this pass inspection in my jurisdiction"). Explicitly excluded by spec.md section 3.
- Anything requiring a server, a third-party API, an account, or a recurring fetch beyond the same-origin static assets.
- AI / LLM / probabilistic anything (per spec.md section 2 and the README).

## 4. Data Posture for v2

The v1 legal posture (`spec.md` section 5 and `docs/legal.md`) governs every v2 utility. New data shards must satisfy the same four conditions: public domain, physical fact, U.S. government publication, or explicitly redistributable manufacturer / standards-body data.

### New data shards introduced by v2

| Shard | Source | Notes |
| --- | --- | --- |
| `data/electrical/demand-factors.json` | Public engineering practice (NEC numbers cited by section, not text) | Standard demand-factor numerics are physical / regulatory facts. |
| `data/electrical/lighting-density.json` | Public engineering benchmarks (ASHRAE 90.1 referenced by name only) | The benchmarks are widely cited values; cite by name not text. |
| `data/electrical/pv-temp-coefficients.json` | Manufacturer technical bulletins (per module) | Attribute manufacturer per entry; verify redistribution permission per bulletin. |
| `data/plumbing/material-expansion.json` | NIST and manufacturer thermal-expansion coefficients | Physical facts. |
| `data/plumbing/septic-rules.json` | EPA and state-published septic sizing rules | Government publications. |
| `data/hvac/charge-per-foot.json` | Manufacturer line-set charge tables per refrigerant per diameter | Attribute manufacturer per entry. |
| `data/hvac/equivalent-lengths.json` | Public engineering equivalent-length tables | Engineering-practice consensus values. |
| `data/construction/soil-bearing.json` | USGS soil-class allowable bearing pressures | Public domain. |
| `data/construction/wind-snow-zones.json` | NOAA wind speed and ground-snow loads by ZIP | Public domain. |
| `data/construction/lumber-equiv-lengths.json` | Public engineering tables | Engineering consensus. |
| `data/crosswalks/gsa-perdiem.json` | GSA-published per-diem rates | U.S. government publication. |
| `data/crosswalks/irs-mileage.json` | IRS-published standard mileage rate | U.S. government publication. |
| `data/summaries/v2-references.json` | Original plain-English Group H summaries | Original creative work, MIT-licensed. |

Every new shard receives an entry in `docs/data-sources.md`, `scripts/sources.md`, the build-data pipeline, and `data/integrity.json`.

### Derivations that need a new section in `docs/derivations.md`

- PV string sizing (cold-temperature Voc inflation; warm-temperature Vmp depression).
- Pipe expansion (linear-thermal-expansion ΔL).
- Pipe insulation thickness (cylindrical heat conduction).
- Wind velocity pressure q = 0.00256·V² (public ASCE 7 formula).
- Snow load Pf = 0.7·Ce·Ct·Is·Pg (public ASCE 7 formula).
- Vehicle braking v²/(2μg) with grade.
- Haversine.

## 5. UI Patterns

All new utilities follow the v1 patterns exactly: live-render, debounce 50 ms, aria-live output, "Test with example", per-output Copy + Copy all, inline citation, inline data-source stamp where reference-style, hash-bookmarkable inputs, 48 px touch targets.

The Group I additions introduce **two new home-view sections** above "Pinned":

- **Recents** (when non-empty): rendered the same as the Pinned grid, with a "Clear recents" affordance.
- **Bundles** is not a separate section; the bundle / share affordances live on the tool view header next to "Pin to home".

## 6. Build, Test, and Deployment

Same as v1 (spec.md section 13). All new pure-math functions land in `pure-math.js`. All new compute functions land in `calc-electrical.js`, `calc-plumbing.js`, `calc-hvac.js`, `calc-restoration.js`, `calc-construction.js`, `calc-fire.js`, `calc-cross.js` (existing modules) and a new `calc-references.js` for Group H. Cross-cutting Group I lives in either `app.js` or its own small module per affordance.

Each new utility ships with at least 10 unit-test cases (spec section 13). Each first-principles calculation gets a section in `docs/derivations.md` and an entry in `test/unit/first-principles.test.js`.

The home-view payload budget remains 100 KB after gzip; new modules are dynamic-imported on first use.

## 7. Step-by-Step Build Instructions and Claude Code Prompts

These prompts continue the numbering from `spec.md` section 14 (which ends at step 22). Paste each prompt into Claude Code with the repo as the working directory. Each step assumes prior steps are complete and tests are green.

### Step 23: Group A v2 — Electrical Expansion (utilities 65 through 71)

> Implement utilities 65 through 71 from `spec-v2.md` section 2 in `calc-electrical.js`. For each, add the compute function, an `<id>Example` export, the renderer, and the renderer registration in `ELECTRICAL_RENDERERS`. Add the new tool entries to the `TOOLS` registry in `app.js` with the right group and trade tags. For utility 65 Service Load Calculation, sum general lighting (3 W/ft²), small-appliance (2 × 1500 W), laundry (1500 W), fixed appliances (sum input W), range (use first 8 kW at 100% then 40% of remainder, conservative), dryer (5 kW or input), HVAC (larger of cooling vs heating), then divide by 240 V to get amps; output minimum service ampacity rounded up to the next standard size from `[60, 100, 125, 150, 175, 200, 225, 250, 300, 400]`. For utility 66 Generator Sizing, accept a list of `{ name, running_watts, starting_watts }` rows; running total = sum of running_watts; surge total = running_total + max(0, max(starting_watts) − running_watts of that same item); output continuous kW and surge kW. For utility 67 Solar PV String Sizing, given module Voc, module Vmp, Voc temp coefficient (% per °C), record-low and record-high site temperatures (°C), and inverter MPPT min/max + Vdc max, compute cold Voc = Voc × (1 + |coeff| × (25 − T_low)/100), warm Vmp = Vmp × (1 − |coeff| × (T_high − 25)/100), then max series = floor(Vdc_max / cold Voc), min series = ceil(MPPT_min / warm Vmp); flag if min > max. For utility 68 Battery Runtime, runtime hours = (Ah × V × DoD/100) / load_W; if a Peukert exponent k > 1 is supplied, use t = C × (C/I)^(k−1) per the standard Peukert form. For utility 69 Voltage Imbalance, given three line voltages, percent imbalance = max(|V_i − V_avg|) / V_avg × 100; motor derate factor = 1 − 2·(imbalance/100)² (public NEMA derating). For utility 70 GFCI/AFCI Reference, render an original-summary list from `data/summaries/v2-references.json` keyed by occupancy area; cite NEC by section number only. For utility 71 Lighting Density, occupancy class selector with bundled W/ft² benchmarks; output target watts = area × W/ft². Add `data/electrical/demand-factors.json` and `data/electrical/lighting-density.json` to `scripts/build-data.mjs`, then to `docs/data-sources.md`, `scripts/sources.md`, and `data/integrity.json`. Update `app.js` `TOOL_DATA_SOURCES` for the reference-style ones (70 and 71). Add at least 10 unit tests per utility in a new `test/unit/calc-electrical-v2.test.js` (or extend the existing electrical test). Run `npm test`, `npm run lint`, `npm run data:verify`. The build must stay green; the home-view payload budget stays under 100 KB. Update `CHANGELOG.md` under Unreleased > Build progress (v2). Do not modify any v1 utility unless it is broken.

### Step 24: Group B v2 — Plumbing and Gas Expansion (utilities 72 through 78)

> Implement utilities 72 through 78 in `calc-plumbing.js`. For utility 72 Water Hammer Arrestor, accept fixture units (WSFU) and pipe length; map FU to PDI WH-201 size designations AA-A through AA-F per the public PDI method (do not reproduce the published text). For utility 73 Hot Water Recirculation Pump Head, sum pipe friction (Hazen-Williams via existing pure-math) and equivalent-length fittings (from new `data/hvac/equivalent-lengths.json`), output total head ft and a target pump GPM. For utility 74 Septic Tank Sizing, allow either bedrooms input (multiply by 150 gpd) or direct gpd; recommend tank gallons per the standard tank ≥ 2 × daily flow rule and a minimum 1000 gal floor. For utility 75 Trap Arm Length, given trap-to-vent fall (in/ft) and pipe diameter, output max length per the standard table values (public plumbing engineering practice). For utility 76 Pipe Thermal Expansion, ΔL_in = α × L_ft × 12 × ΔT_F where α is in 1/°F from new `data/plumbing/material-expansion.json` (copper 9.4e-6, PEX 1.1e-4, PVC 3.0e-5, CPVC 3.7e-5, steel 6.5e-6). For utility 77 Tankless Water Heater GPM, GPM = kBTU × 1000 / (8.33 × 60 × ΔT) using inlet from a NOAA inlet-temperature lookup by climate zone in `data/hvac/climate-data.json` (zone selector). For utility 78 Gas Leak Rate, Q (cfh) = 3550 × c × A × √(ΔP/ρ), with c (discharge coefficient, default 0.7), A (orifice area in²), ΔP (psi) — using gas density from `data/plumbing/gas-pipe-capacity.json`. Add new shards `data/plumbing/material-expansion.json` and `data/plumbing/septic-rules.json` to `build-data.mjs`. Add `docs/derivations.md` section for utility 76. Add 10+ tests per utility under `test/unit/calc-plumbing-v2.test.js`. Add `TOOL_DATA_SOURCES` entries for 72, 75, 78 (reference-style). Run the full suite. Update `CHANGELOG.md`.

### Step 25: Group C v2 — HVAC Expansion (utilities 79 through 85)

> Implement utilities 79 through 85 in `calc-hvac.js`. For utility 79 Refrigerant Charge Weighing, oz = sum over each line section of (ft × oz_per_ft) using new `data/hvac/charge-per-foot.json` (per refrigerant, per line diameter; values attributed to manufacturer bulletins — verify each entry is cleared for redistribution). For utility 80 Approach and Δ-T Diagnostics, output (Tsat_cond − T_outdoor) and (T_return − T_supply) with banded labels (normal / low / high) using public engineering banding. For utility 81 Outdoor Air Mix, mixed_T = OA_fraction × OA_T + (1 − OA_fraction) × RA_T; mixed_W computed via the existing psychrometric helpers (mass mixing ratio). For utility 82 Equivalent Length, accept a list of fitting rows `{ type, count, diameter }`; sum × per-fitting equivalent ft from `data/hvac/equivalent-lengths.json`. For utility 83 Wet-Bulb Psychrometer, given dry-bulb T and wet-bulb Tw, solve psychrometric equations to produce RH, dew point, GPP (use the existing August-Roche-Magnus saturation pressure plus the standard psychrometric wet-bulb relation). For utility 84 Pipe Insulation Thickness, iterate on r2 to reach a target surface temperature using Q = 2π·k·L·ΔT/ln(r2/r1) and the published k of common insulations from a new `k_insulations` table in `data/hvac/duct-friction.json` (or a new `data/hvac/insulation.json`). For utility 85 Latent Heat Evaporative Cooling, Q = ṁ × hfg with hfg from the existing physical-constants shard. Add `data/hvac/charge-per-foot.json`, `data/hvac/equivalent-lengths.json`, and `data/hvac/insulation.json` to the build-data pipeline. Add the corresponding entries to `docs/data-sources.md` and `data/integrity.json`. Add the manual-j-worker.js patches if any of these benefit from off-thread compute (probably none of them; keep them in-thread). Add `docs/derivations.md` sections for utilities 81 (mixing), 84 (cylindrical conduction). 10+ tests per utility under `test/unit/calc-hvac-v2.test.js`. `TOOL_DATA_SOURCES` for 79, 82, 84. Run the full suite, update `CHANGELOG.md`.

### Step 26: Group D v2 — Restoration Expansion (utilities 86 through 89)

> Implement utilities 86 through 89 in `calc-restoration.js`. Utility 86 Standing Water Volume: gallons = area_ft² × depth_in / 12 × 7.48052. Utility 87 NAM Sizing: required_CFM = volume_ft³ × ACH / 60; recommend NAM count from typical published unit sizes [500, 1000, 2000] CFM. Utility 88 HEPA Filter Life: filter_days = capacity_loading / (CFM × hours_per_day × loading_per_CFM_hour) using bundled per-category loading values (low/medium/high) from a new `data/restoration/hepa-loading.json`. Utility 89 Thermal Imager Δ-T Reference: reference list of typical surface-temperature differentials with original plain-English summary (moisture intrusion 2-5 °F, missing insulation 3-10 °F, electrical hotspot 10-50 °F+) - cite NFA / OSHA training generally. Add `TOOL_DATA_SOURCES` entry for 89. 10+ tests per utility. Run the full suite, update `CHANGELOG.md`.

### Step 27: Group E v2 — Carpentry and Construction Expansion (utilities 90 through 99)

> Implement utilities 90 through 99 in `calc-construction.js`. This is the highest-value v2 group. Utility 90 Stair Stringer: stringer_ft = √(rise_ft² + run_ft²); plus board-foot estimate using the existing helpers. Utility 91 Joist Mid-Span Deflection: δ = 5wL⁴/(384EI), reuse `pure-math.js`. Flag against L/360 (live-load) and L/240 (total-load) limits. Utility 92 Footing Area: area_required_ft² = column_load_lb / allowable_bearing_psf (input from new `data/construction/soil-bearing.json` with USGS-derived class values: clay/silty/sandy/gravel/rock); side dimension = √area; round to next standard 6 in increment. Utility 93 Tile Count: tiles = ceil(area_ft² × 144 / (tile_w × tile_h)) × 1.10 waste; grout volume in³ ≈ joints × joint_w × tile thickness using a simple grid-pattern model. Utility 94 Paint Coverage: gallons = area / (coverage × surface_factor) per coat; surface_factor smooth=1.0, textured=0.7, rough=0.5. Utility 95 Excavation Volume: prism + side-slope wedges. Output cubic yards. Utility 96 Brick / CMU Count: units = ceil(area_ft² / unit_face_ft²) × 1.05; mortar joint affects unit_face. Utility 97 Wind Pressure: q = 0.00256 × V² (public ASCE 7 formula); display Cp coefficients for windward/leeward walls (+0.8 / −0.5 typical) without reproducing licensed text. Utility 98 Snow Load: Pf = 0.7 × Ce × Ct × Is × Pg per public ASCE 7 formula. Utility 99 Anchor Bolt Embedment: pull-out capacity per public bond strength formula T = 0.7 × √fc × π × d × ld; solve for ld given target T. Add new shards `data/construction/soil-bearing.json` and `data/construction/wind-snow-zones.json`. Add `docs/derivations.md` sections for utilities 91, 95, 97, 98, 99. Add `TOOL_DATA_SOURCES` for 92, 97, 98. 10+ tests per utility. Run the full suite, update `CHANGELOG.md`.

### Step 28: Group F v2 — Fire-Ground Expansion (utilities 100 through 104)

> Implement utilities 100 through 104 in `calc-fire.js`. All Group F utilities continue to carry the SOP-and-incident-command notice. Utility 100 Reverse-Lay Friction Loss: extends the existing `fireHoseFrictionLoss` helper to handle two-pump tandem operation (split flow approximation: per-pump friction = single-pump friction × (1/n_pumps)² for the parallel section). Utility 101 Sprinkler GPM Density: total_gpm = area_ft² × density_gpm_per_ft²; flag minimums per public NFPA 13 hazard categories (light/ordinary/extra) without reproducing standard text. Utility 102 Standpipe Friction Loss: total = riser elevation (0.434 psi/ft of water column) + per-outlet friction summed. Utility 103 Ladder Pipe Reach: combines existing aerial-ladder geometry with master-stream reach scaling at the tip. Utility 104 Vehicle Braking Distance: d_ft = v_mph² / (30 × (μ ± grade%/100)) where 30 derives from 2g in customary units; additional reaction-time distance = v_mph × 1.467 × t_s. Add `docs/derivations.md` sections for utilities 100 (parallel split), 104. 10+ tests per utility. Run the full suite, update `CHANGELOG.md`.

### Step 29: Group G v2 — Cross-Trade Expansion (utilities 105 through 113)

> Implement utilities 105 through 113 in `calc-cross.js`. Utility 105 Loan Payment: payment = P × r / (1 − (1+r)^−n), monthly r = APR/12; output amortization first 12 rows for sanity. Utility 106 Upgrade ROI: simple_payback_yr = cost / annual_savings; NPV with user discount rate over 10 years. Utility 107 Mileage and Fuel Cost: gallons = miles / mpg; cost = gallons × price; reimbursement = miles × IRS rate from new `data/crosswalks/irs-mileage.json`. Utility 108 Overtime: hrs ≤ 40 reg pay; 40 < hrs ≤ DT_threshold OT pay × 1.5; > DT_threshold double-time × 2.0; output gross. Utility 109 Per-Diem: lookup state and meal vs lodging from new `data/crosswalks/gsa-perdiem.json`. Utility 110 Geometry Pack: a single calculator with shape selector that covers circle (circumference, area, sector area), ellipse perimeter (Ramanujan h = ((a−b)/(a+b))²; perimeter ≈ π(a+b)(1 + 3h/(10+√(4−3h)))), regular hexagon area (3√3/2 × s²), polygon perimeter (sum of side lengths), sphere volume (4/3 π r³). Utility 111 Dilution: V_concentrate = V_final × C_target / C_concentrate; V_diluent = V_final − V_concentrate. Utility 112 Slope From Digital Level: bidirectional between degrees, percent, in/ft, and rise/run (companion to utility 18). Utility 113 GPS Distance: haversine formula a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2); c = 2·atan2(√a, √(1−a)); d = R·c; output miles + km + initial bearing (atan2(sin(Δλ)·cos(φ2), cos(φ1)·sin(φ2) − sin(φ1)·cos(φ2)·cos(Δλ))). Add new shards `data/crosswalks/gsa-perdiem.json` and `data/crosswalks/irs-mileage.json` to the build-data pipeline. Add `docs/derivations.md` section for utility 113 (haversine + bearing). Add `TOOL_DATA_SOURCES` for 107 and 109. 10+ tests per utility. Run the full suite, update `CHANGELOG.md`.

### Step 30: Group H — Knowledge References (utilities 114 through 118)

> Create `calc-references.js` mirroring the structure of `calc-restoration.js`'s reference sub-utilities (water-classes, drying-times, mold). Implement utilities 114 through 118 from `spec-v2.md`. All content is original plain-English summaries written by the project author, stored in `data/summaries/v2-references.json`. Each utility renders an h2 + dl pair (term/description) with the inline citation and source-stamp. Utility 114 Color Codes: dl with one row per code system (NEC residential phase, IEC industrial, gas piping, HVAC piping). Utility 115 Knot Reference: dl with rows for bowline, clove hitch, figure-eight, double fisherman, with typical strength reduction (cite NFA training). Utility 116 Inspection Prep: per-trade dt (Electrical, Plumbing, HVAC, Carpentry) with checklist dd. Utility 117 Utility Locator: dl with 811 (call before you dig), 1-800-222-1222 (poison control, US), OSHA 1-800-321-OSHA, plus original summaries. No commercial directories. Utility 118 Tool Maintenance: dl per tool category. Register `REFERENCE_RENDERERS` in `calc-references.js` and add to `TOOL_MODULES` in `app.js`. Add the five tools to `TOOLS` in group H with appropriate trade tags. Add `TOOL_DATA_SOURCES` entries for all five. 5+ tests per utility (smaller suites because output is data-driven). Run the full suite. Update `docs/data-sources.md` and `CHANGELOG.md`.

### Step 31: Group I — Cross-cutting Platform: Compare Refrigerants and Recents (utilities 119 and 120)

> Utility 119 Compare Two Refrigerants: implement as a new tool in `calc-hvac.js` that takes two refrigerant selectors and a value (pressure or temperature), and renders both saturated values side by side with their manufacturer attributions. Add to `TOOL_MODULES` and `TOOLS`. Utility 120 Recent Tools: in `app.js`, when `renderToolView(id)` runs, prepend `id` to a new `state.recents` ring (capped at 10, no duplicates). Encode recents into the URL hash as `r=...` when on the home view (alongside or instead of `p=...`); update `parseHashRoute` and `decodePinnedList` (or a new `decodeIdList`) accordingly. Render a "Recents" section above "Pinned" on the home view (same tile layout, with a "Clear recents" button). Add unit tests for the encoder/decoder and the cap-at-10 invariant. Run the full suite, update `CHANGELOG.md`.

### Step 32: Group I — Project Bundle (URL or JSON) (utility 121)

> Add a new module `bundle.js` exporting `encodeBundle(state)` and `decodeBundle(text|url)`. The bundle shape is JSON: `{ version: 1, pinned: [...ids], recents: [...ids], inputs: { [toolId]: { ...key/value } } }`. The tool view header gets a "Bundle" submenu with three actions: "Copy share URL" (writes the current bundle as a long `#b=...` hash via base64-url-encoded JSON, then copies to clipboard), "Download JSON" (creates a same-origin Blob URL containing the bundle and triggers an `<a download>` click), "Load JSON" (file input that reads a bundle and replays it via the existing `applyHashState` and pinned/recents wiring). The bundle hash form `#b=<base64url>` is handled in `parseHashRoute` and applied via a new `applyBundle(state)` function. CSP must continue to allow `connect-src 'self'`; Blob URLs are same-origin and acceptable. Add unit tests for round-trip encode/decode, malformed input handling, and the size cap (reject bundles over 32 KB). Run the full suite, update `CHANGELOG.md`.

### Step 33: Group I — Print / PDF View (utility 122)

> Add a print-only stylesheet section to `styles.css` (extending the existing `@media print` block) that hides `.site-header`, `.search-region`, `.filter-row`, `.primary-nav`, `.skip-link`, `.tile-pin`, `.view-pin`, `.copy-btn`, `.copy-all-btn`, `.tile-actions`, the integrity banner, and the example button. Preserve the inline notice, citation, input region (with values), output region (with values), and source stamp. Add a "Print this calculator" button to the tool view header that calls `window.print()`. Add a Playwright integration test that opens `ohms-law`, fills inputs, calls `window.print` (or asserts the print-only CSS is present), and screenshots the print preview if the test runner supports it. Run the full suite, update `CHANGELOG.md`.

### Step 34: Group I — Offline Status Indicator (utility 123)

> In `app.js`, listen for the `online` and `offline` events on `window`. Add an `<span id="offline-pill" hidden>Offline</span>` to the footer in `index.html` (CSS rule in `styles.css`: small inverted pill, monochrome). Toggle `hidden` based on `navigator.onLine`. The service worker continues to serve the shell when offline, so this pill is purely informational. Add a Playwright test that simulates `offline` via `context.setOffline(true)` and asserts the pill is visible. Run the full suite, update `CHANGELOG.md`.

### Step 35: Group I — Example Deep-Link and Share Link (utility 124)

> Extend `parseHashRoute` to recognize a special `example=1` param: when present, the renderer's example button is programmatically clicked after the renderer runs (use the existing `attachExampleButton` return value to get the button ref; have each renderer return or expose it). Add a "Copy share link" button to the tool view header that copies `window.location.href` to the clipboard via `clipboard.copyText`. Add unit tests covering example=1 dispatch, fall-through when the calculator has no example button, and the share-link copy. Run the full suite, update `CHANGELOG.md`.

### Step 36: Documentation, Integrity, and Final Review

> Update `docs/data-sources.md`, `docs/derivations.md`, `docs/legal.md`, `docs/threat-model.md`, and `docs/launch-checklist.md` to reflect every v2 utility, every new shard, every new derivation, and every new threat consideration (none expected; all v2 work is same-origin static). Run `npm run data:refresh` to regenerate `data/integrity.json` for all new shards. Run `npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:a11y`, `npm run build` — all must pass. Confirm the home-view payload remains under 100 KB after gzip with the new tools added (the count should still be ~52 KB because all new calc files are dynamic-imported). Confirm Lighthouse CI still scores >= 95 across performance / accessibility / best practices / SEO. Update `CHANGELOG.md` with a v0.2.0 release stanza summarizing the v2 expansion. Bump `package.json` `version` to `0.2.0`. Update the README's tool-count claim from "sixty-four" to "one hundred eighteen" and the group list to include Group H Knowledge References plus the Group I cross-cutting affordances. Produce a written launch checklist diff vs `docs/launch-checklist.md` showing what changed. The release is ready when every item in this step passes.

## 8. Operations and Ongoing Maintenance (v2 addendum)

Same as v1 (spec.md section 15). The v2 data shards inherit the same monthly refresh cadence; the GSA per-diem and IRS mileage shards may update annually but are pulled monthly to be safe.

## 9. Closing Note

v2 stays inside the v1 envelope. Every utility is a deterministic function over public physics, public data, manufacturer-attributed values, or original creative work. Nothing here requires a server, an account, an analytics pixel, an AI model, or a fetch to a third-party origin. The site grows from sixty-four tools to one hundred eighteen, plus six cross-cutting platform affordances, while staying free to operate, free of charge to use, and durable across years.

Build it the same way: a single tile, a single calculation, a single citation, a single copy of the answer to the clipboard. The user goes back to work.