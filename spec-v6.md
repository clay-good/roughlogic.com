# roughlogic.com Specification v6 — Citations That Earn Their Keep

> Foreword, in the voice of someone who has been handed a bad number on a
> job site and had to eat it.
>
> A citation is not a footnote. It is the difference between a tool a
> working person can stake a job on and a tool that is just confident
> typography. When a journeyman pulls up an ampacity calculator at the top
> of a ladder, the answer matters, but the answer plus "per NEC 310.16
> (2023)" plus the ambient and termination assumptions is what lets him
> defend the pull to an inspector who shows up with a different code book.
> When a plumber sizes a vent stack, "per IPC 2021 Table 906.1" tells him
> which jurisdiction's adoption matters. When a hotshot driver checks his
> bridge weight, "per 23 CFR 658.17, federal limit; state may be lower"
> tells him the next call is to the state DOT, not to a lawyer.
>
> v1 through v4 built the calculators and the data. v6 holds every one of
> them to a single citation discipline so the references are useful to
> the person on the clock, not just legally clean for the maintainer.
> Every tile cites the edition it was sourced from. Every tile says
> what governs when the math and the AHJ disagree (the AHJ does). Every
> tile gives the reader a place to go look it up themselves, free, in a
> public source, in under thirty seconds.
>
> The rule is the one we already settled on for the NEC, applied
> everywhere: cite the section and edition, reproduce the numeric values
> needed for the math, do not paste the code's prose, and note the
> edition because jurisdictions adopt different cycles.
>
> Build it the way the rest was built. Then get out of the way.

This document is the v6 spec. It inherits everything from spec.md,
spec-v2.md, spec-v3.md, and spec-v4.md. (There is no spec-v5.md;
numbering jumped at the maintainer's request.) If anything below
conflicts with v1 through v4, the earlier spec wins; rewrite the v6
entry until it complies.

Repository: github.com/clay-good/roughlogic.com

## 1. Inheritance from v1 through v4

Every constraint from prior specs continues without exception. v6 adds
no new utilities, no new data shards by itself, and no new UI patterns.
v6 is a discipline pass: it tightens the citation, edition, and
reference behavior of every tile already in the catalog (utilities 1
through 233 across groups A through Q) and locks the rule for every
tile added afterward.

The hard limits still bind:

- 100 percent client-side, single-page static web application on
  Cloudflare Pages. No server, no account, no analytics, no telemetry,
  no AI inference, no API key, no third-party fetch at runtime. Same-
  origin static assets only.
- No reproduction of NEC, IPC, IRC, IECC, IFC, IBC, ASHRAE, ACCA, NFPA,
  AWC, ASCE, ASTM, ANSI, OSHA training materials, FMCSA driver-handbook
  text, FAA AC text, USDA bulletin text, AWWA training materials, NMFTA
  NMFC text, FDA Food Code text, ICC Incoterms text, or any other
  licensed code text. Numeric values needed for a calculation are facts
  and are reproduced. Prose, commentary, and table headings are not.
- Per-view inline notice on every calculator. AHJ-governs, label-is-
  the-law, pilot-in-command-governs, ELD-is-the-legal-record, and
  thermometer-is-the-verdict variants apply where v3 and v4 already set
  them. v6 makes the variant explicit on every tile rather than
  implicit.
- Public changelog, semver, no A/B, no flags, no tracking. The
  prohibition on live-data alerts, push notifications, SMS callbacks,
  premium tiers, and email gates still holds.

## 2. The citation rule (the v6 rule)

Every tile in the catalog must satisfy the following six points. The
audit in section 6 walks every existing utility against these. New
tiles added after v6 cannot ship without them.

### 2.1 Cite the section and edition

The reference line on a tile must name the source by section number (or
table number, or formula name) and by published edition or year. Not
"per NEC." Not "per the plumbing code." The form is:

- "per NEC 310.16 (2023)"
- "per IPC 2021, Table 709.1"
- "per IRC 2021, Section R602.10"
- "per IECC 2021, Table C402.1.3"
- "per ASHRAE 62.1-2022, Table 6-1"
- "per ACCA Manual J, 8th edition"
- "per FMCSA 49 CFR 395.3"
- "per 23 CFR 658.17 (Federal Bridge Formula)"
- "per FAA AC 91-23A"
- "per ASABE D497.7"
- "per AWWA M11, 5th edition"
- "per NSF/ANSI 61"
- "per ICC Incoterms 2020"
- "per NFPA 13 (2022), Section 11.2"
- "per OSHA 1926.501"
- "per USDA FoodData Central, accessed YYYY-MM-DD"
- "per NOAA Solar Calculator (USNO algorithm)"
- "per USGS Krueger series"
- "per DOE EERE Alternative Fuels Data Center, accessed YYYY-MM-DD"
- "per BLS PPI series WPU0571, retrieved at build time"

For physics derivations, cite the named law or formula and the public
source it comes from:

- "per Bernoulli equation, public physics."
- "per Manning equation, n from USGS WSP-2339."
- "per Hazen-Williams, C from AWWA M11."
- "per Euler-Bernoulli beam theory."
- "per kinetic-energy theorem, classical mechanics."

### 2.2 Note the edition because jurisdictions vary

This is the bite of the rule. The same code section can have different
numbers in 2017, 2020, and 2023. A residential job in a state that has
adopted the 2020 NEC pulls different ampacity ambient corrections than
a job under 2023. The tile is responsible for telling the user which
edition the bundled values came from, so the user knows whether to
trust them on his job.

Required behavior on every code-derived tile:

- A clearly visible "Edition:" line in the reference block, e.g.,
  "Edition: NEC 2023."
- An "AHJ governs" or "Your jurisdiction may have adopted a different
  edition" note adjacent to the result, not buried in the footer.
- For codes that are routinely jurisdiction-shifted (NEC, IPC, IRC,
  IECC, IFC, IBC, IMC, IFGC, NFPA 13, NFPA 70, NFPA 101), an "Editions
  available" note that lists which editions the bundled data covers.
  v6 does not require multi-edition data shards on day one. It
  requires the tile to disclose what edition it is showing.
- Where multi-edition shards already exist or are added later, an
  edition selector at the top of the tile, defaulting to the most
  recently published edition.

### 2.3 Reproduce values, not prose

A number is a fact. "Per NEC 310.16 (2023), 75°C column, 8 AWG copper:
50 A" is a fact and may be displayed. The surrounding sentences from
the code book are prose and may not. Same for IPC fixture-unit values,
IRC stud-spacing tables, ASHRAE ventilation rates, NMFTA density
brackets, and FMCSA hour limits. Numbers in. Prose out.

The build pipeline (scripts/build-data.mjs) gets a new lint pass that
flags any data shard whose JSON values include sentence-form strings
longer than a configurable threshold (default: 140 characters of plain
prose), so a careless edit cannot quietly paste code text into a
shard.

### 2.4 Useful references, not legal cover

A citation that names "NFPA" with no section is legal cover. It is
useless to the person on the job. Every reference line must give the
user enough to find the underlying value in a public source in under
thirty seconds. Where a free public version exists, the tile points to
it by name (not by hyperlink at runtime; same-origin still binds):

- NFPA codes: "Free read-only access at nfpa.org/freeaccess."
- ICC codes (IBC, IRC, IPC, IMC, IFGC, IECC, IFC): "Free read-only
  access at codes.iccsafe.org."
- ASHRAE 62.1, 90.1, 15: "Free read-only access at ashrae.org/
  technical-resources/standards-and-guidelines/read-only-versions-of-
  ashrae-standards."
- 49 CFR (FMCSA), 23 CFR (FHWA), 29 CFR (OSHA): "Free at ecfr.gov."
- USDA FoodData Central: "Free at fdc.nal.usda.gov."
- DOE EERE Alternative Fuels Data Center: "Free at afdc.energy.gov."
- BLS PPI, CPI, ECI: "Free at bls.gov/data."
- USGS water and topographic data: "Free at usgs.gov."
- NOAA solar, weather, tides: "Free at noaa.gov."
- FAA Advisory Circulars: "Free at faa.gov/regulations_policies/
  advisory_circulars."
- USCG navigation rules and stability: "Free at uscg.mil."
- FCC radio rules (47 CFR): "Free at ecfr.gov."

The tile names the publication by name and points to the free public
location by plain text. No outbound links at runtime. The user copies
the name and goes there themselves on the device of their choice.

### 2.5 Say what governs when the math disagrees

Every tile carries the appropriate one of these governance notices,
sized to the stakes:

- General trades and physics tiles: "Estimate. AHJ and licensed
  professional govern."
- Electrical (NEC-derived): "Estimate. AHJ and licensed electrician
  govern. Verify against the edition adopted in your jurisdiction."
- Plumbing and gas (IPC, IFGC, IRC P-chapters): "Estimate. AHJ and
  licensed plumber / gas fitter govern. Verify against the edition
  adopted in your jurisdiction."
- Structural (IRC, IBC, ASCE, AWC): "Estimate. AHJ and licensed
  structural engineer govern."
- Mechanical / HVAC (IMC, ASHRAE, ACCA): "Estimate. AHJ and licensed
  mechanical contractor govern. ACCA Manual J / D / S supersede rules
  of thumb."
- Fire (IFC, NFPA 13, NFPA 72, NFPA 25): "Estimate. AHJ and licensed
  fire protection engineer govern."
- Pesticide / herbicide application (utility 203 and similar): "Read
  and follow the product label. The label is the law (FIFRA)."
- Trucking (FMCSA, FHWA): "Math aid for personal verification. The
  ELD on the truck and the carrier tariff are the legal record. State
  limits may be lower than federal."
- Aviation (FAA): "Pilot-in-command and the airplane flight manual
  govern. Verify against the AFM loading graph or table."
- Marine (USCG): "Vessel master governs. Verify against the stability
  letter and USCG-approved loading manual."
- Food service (FDA Food Code, USDA): "The thermometer on the food is
  the verdict. Local health department governs."
- Water and wastewater (AWWA, EPA, state primacy agency): "Estimate.
  Operator of record and primacy agency govern."
- Stage / rigging (ANSI E1, OSHA 1926, manufacturer load charts):
  "Estimate. Head rigger and manufacturer working-load-limit charts
  govern. Inspect every piece of hardware before the show."
- Field / SAR (USGS, NOAA, AIARE): "Geometry is not forecasting.
  Avalanche advisory and incident commander govern."

The governance notice sits adjacent to the result, not in a collapsed
footer. It is part of the answer.

### 2.6 Date the source

Every reference line carries a date. For codes and standards: the
edition year. For datasets and benchmarks: the build date or the
upstream "as of" date. The date is what tells the user whether the
tile knows about a change that affects his job. v6 makes the date
mandatory and visible on the tile, not just inside the data-sources
doc.

## 3. Reference block — required structure on every tile

Every calculator tile renders a reference block in this order, beneath
the result and above the copy buttons. No exceptions.

1. **Formula or table cited.** "Ampacity from NEC 310.16, 75°C
   column." Or: "Pressure drop from Hazen-Williams, C = 130."
2. **Edition / source date.** "NEC 2023." Or: "USDA FoodData Central,
   build date 2026-04-30."
3. **Public free-access pointer.** "Free read-only access at
   codes.iccsafe.org" or equivalent for the relevant publisher.
4. **What governs.** The governance notice from section 2.5.
5. **Edition selector or disclosure.** The selector if multi-edition,
   the disclosure if single-edition.
6. **Numeric assumptions.** Every constant the tile applied that the
   user did not enter: ambient temperature, termination temperature,
   conductor count, pipe roughness, fluid density, ambient pressure,
   air-handler efficiency, soil bearing, default Cd, default Cv,
   wind exposure category, seismic site class. Listed by name and
   value, with the source citation if not user-supplied. The point is
   that an inspector or a senior tradesperson should be able to
   reproduce the answer from the assumption list.

The block is built into the existing v3 inline-notice slot and the v3
"Copy citation" affordance. v6 expands "Copy citation" to "Copy
answer with full reference block," which puts the formula, edition,
governance notice, and assumption list on the clipboard alongside the
number. That string is what a tradesperson actually pastes into a job
log, an RFI, a permit application, or a text to the foreman.

## 4. Reference taxonomy by trade (what to cite, where to point)

This is the working list the audit in section 6 uses. Maintainers add
to it; they do not subtract.

### 4.1 Electrical (Group D, utilities in calc-electrical.js)

- NEC 2017, 2020, 2023 (NFPA 70). Free read-only at nfpa.org/freeaccess.
- Specific tables that v6 tiles must name by number when used: 220.12
  (general lighting loads), 220.42 / 220.82 (dwelling demand), 250.66
  (grounding electrode), 250.122 (equipment grounding), 310.16
  (ampacity, 0–2000V), 310.15(B)(1) (ambient correction), 310.15(C)(1)
  (adjustment for >3 CCCs), 310.12 (dwelling services), 314.16 (box
  fill), 358.30 (EMT support), 408.36 (panel ratings), 430.52 (motor
  branch protection), Chapter 9 Tables 1, 4, 5, 8 (conduit fill, raceway
  dimensions, conductor properties, conductor resistance/reactance).
- IEEE 141 (Red Book) for voltage drop derivation.
- ANSI C84.1 for service voltage tolerance.
- POE: IEEE 802.3bt class power and current limits (factual).
- Cable bend radius: manufacturer mins (Southwire, Encore Wire, General
  Cable). Attribute per entry in the new shard data/electrical/cable-
  bend-radius.json (already added in working tree).

### 4.2 Plumbing and gas (Group E)

- IPC 2018, 2021, 2024. Free read-only at codes.iccsafe.org.
- Sections that v6 tiles cite by number: 604 (pipe sizing), 709 (DFU
  values), 906 (vent sizing), 1003 (grease interceptors), 1106 (storm
  drainage).
- IRC 2021 Chapter 25–33 for residential plumbing.
- IFGC 2021 / NFPA 54 for fuel-gas pipe sizing tables.
- ASPE Plumbing Engineering Design Handbook (cite by name).
- Hazen-Williams: C values from AWWA M11 (cite by name).
- Manning: n values from USGS WSP-2339 (public domain, redistribute).
  Already added in working tree as data/plumbing/manning-roughness.json.
- Glycol curves, backflow curves, runoff coefficients (already added in
  working tree): cite the manufacturer or the public hydrology source
  per entry.

### 4.3 Structural and framing (Group F)

- IRC 2021, IBC 2021. Free read-only at codes.iccsafe.org.
- Specific tables: IRC R602.10 (bracing), R802.5 (rafter spans),
  R502.5 (header tables), R301.2 (climatic and geographic criteria).
- AWC NDS 2018 for sawn-lumber design values.
- AWC Span Calculator (free, cite by name) for cross-check.
- ASCE 7-22 for wind, snow, seismic loads.
- AISI S240 for cold-formed steel framing.

### 4.4 Mechanical and HVAC (Group G)

- IMC 2021. Free read-only at codes.iccsafe.org.
- ASHRAE 62.1-2022 (ventilation), 90.1-2022 (energy), 15-2022
  (refrigerant safety), 55-2020 (thermal comfort). Free read-only at
  ashrae.org.
- ACCA Manual J 8th edition (residential load), Manual D (duct),
  Manual S (equipment selection), Manual T (registers). Cite by name.
- AHRI 210/240 for unitary equipment ratings.
- Affinity laws: classical pump theory (already added in working tree
  as data/hvac/affinity-laws.json).
- Geothermal soil properties: ASHRAE Handbook — HVAC Applications,
  Chapter 35. Already added in working tree as data/hvac/geothermal-
  soil.json.
- Baseboard output: manufacturer tables (Slant/Fin, Burnham, etc.).
  Already added in working tree as data/hvac/baseboard-output.json.

### 4.5 Fire protection (Group H)

- NFPA 13 (sprinklers), NFPA 14 (standpipes), NFPA 25 (inspection),
  NFPA 72 (alarm), NFPA 80 (door assemblies), NFPA 101 (Life Safety),
  NFPA 1 (Fire Code). Free read-only at nfpa.org/freeaccess.
- IFC 2021. Free read-only at codes.iccsafe.org.
- Hose-stream and density-area derivations from NFPA 13 numeric
  values (facts), not prose.

### 4.6 Restoration (Group I, calc-restoration.js)

- IICRC S500 (water damage), S520 (mold), S540 (trauma), S700
  (carpet). Cite by name and edition.
- Psychrometrics: ASHRAE Handbook — Fundamentals.
- EPA mold guidance and lead-RRP rule (40 CFR 745). Free at ecfr.gov.

### 4.7 Construction estimating and takeoff (calc-construction.js)

- RSMeans and Craftsman Costbook are NOT redistributed; tiles compute
  from user-supplied unit costs and from public productivity rates
  (BLS, USACE UFC). Cite by name.
- Span derivations (already added as data/construction/span-derivations
  .json) cite AWC NDS by name and reproduce numeric span values only.

### 4.8 Trucking and logistics (Group J)

- 49 CFR 395 (HOS), 49 CFR 393 (parts and accessories), 49 CFR 397
  (hazmat routing). Free at ecfr.gov.
- 23 CFR 658 (Federal Bridge Formula and length/weight). Free at
  ecfr.gov.
- FHWA Bridge Formula calculator (cite by name).
- NMFTA density bracket (numeric facts; cite by name).
- ICC Incoterms 2020 (name only; original plain-English summaries).
- Carrier DIM divisors: cite the carrier and the effective-date page.

### 4.9 Mechanic — auto, marine, aviation (Group K)

- FAA AC 91-23A (weight and balance). Free at faa.gov.
- USCG NVIC and stability letters (vessel-specific; cite generally).
- Public engine-build formulas (CR, displacement, bolt stretch).
- DOE EERE fuel properties. Free at afdc.energy.gov.
- Tire sizing: ETRTO / Tire and Rim Association public geometry.

### 4.10 Agriculture and forestry (Group L)

- USDA NRCS technical notes. Public domain. Free at nrcs.usda.gov.
- USDA Forest Service GTRs (Doyle, Scribner, International). Public
  domain. Free at fs.usda.gov.
- ASABE D497 (tractive efficiency). Cite by name.
- EPA FIFRA pesticide labeling. Free at epa.gov. The label is the law.
- USDA NASS for crop and livestock benchmarks. Free at nass.usda.gov.

### 4.11 Water and wastewater (Group M)

- AWWA M11 (steel pipe), M22 (sizing service lines), M32 (computer
  modeling). Cite by name.
- 10 States Standards (Recommended Standards for Water Works /
  Wastewater Facilities). Free PDF at health.state.mn.us. Cite by
  name.
- EPA SDWA primacy regulations. Free at ecfr.gov (40 CFR 141).
- State primacy agency (CA SWRCB, TX TCEQ, etc.) governs above EPA
  minimums.

### 4.12 Stage, rigging, and audio (Group N)

- ANSI E1.2, E1.6, E1.21 (entertainment rigging). Cite by name.
- OSHA 29 CFR 1926 Subpart H (rigging) and Subpart V (overhead).
  Free at ecfr.gov.
- ASME B30.9 (slings), B30.26 (rigging hardware). Cite by name.
- Manufacturer WLL tables (Crosby, Columbus McKinnon, etc.).
  Attribute per entry.
- IEC 60268 / AES audio standards (SPL, time alignment).

### 4.13 Kitchen, food service, and brewing (Group O)

- FDA Food Code 2022. Free at fda.gov. Local health code adopts and
  may modify.
- USDA FSIS guidance for meat and poultry. Free at fsis.usda.gov.
- USDA FoodData Central (densities, water activity). Public domain.
- TTB (alcohol gauging, proof, tax). Free at ttb.gov. Cite the
  Gauging Manual by part number.

### 4.14 Field, SAR, and outdoor (Group P)

- USGS topographic and UTM. Public domain. Free at usgs.gov.
- NOAA Solar Calculator and tides. Public domain. Free at noaa.gov.
- AIARE and CAA avalanche education materials (cite by name; do not
  reproduce text). The avalanche advisory governs.
- USCG nav rules (33 CFR / 72 COLREGS). Free at ecfr.gov.

### 4.15 Historical reference (Group Q, utility 233)

- BLS PPI, CPI, ECI series, by series ID, retrieved at build time.
- EIA energy series, by series ID.
- USDA NASS Quick Stats series, by series ID.
- FRED for federal-funds rate, Treasury yields, by series ID.
- Each historical shard carries the series ID, the as-of date, and
  the build date. The tile shows all three.

## 5. Crosswalks (data/crosswalks/) — the v6 expansion

The crosswalks tree in the working tree (data/crosswalks/) is the right
place to land jurisdictional and tariff variation. v6 formalizes its
purpose:

- **state-tax-rates.json** (already in working tree, M-status) carries
  source attribution per row (which state agency publishes the rate)
  and a retrieval date per row.
- **code-edition-by-state.json** (new, optional, ship when ready)
  lists the currently adopted edition of NEC, IPC, IRC, IBC, IECC,
  IMC, IFGC, IFC, NFPA 13, and NFPA 101 by state, with effective
  date and the state agency or statute that adopted it. Sources:
  state building-code agency websites, ICC Code Adoption Maps (cite
  by name), NFPA Code Adoption Maps (cite by name). Refreshed
  semi-annually at build time. Tiles use this shard to render an
  "In your state, the adopted edition is X" line when the user
  supplies a state in the URL hash or the tile's state selector.
- **awwa-state-primacy.json** (new, optional, ship when ready) maps
  state to drinking-water primacy agency for the SDWA tiles.
- **fmcsa-state-overlays.json** (new, optional, ship when ready)
  maps state to overlay rules where state HOS, weight, or length
  limits diverge from federal. Sources: state DOT and state PUC
  publications, cited per row.

These crosswalks are advisory. Tiles never claim "in your jurisdiction
this is the answer." Tiles say "in your jurisdiction the adopted
edition appears to be X as of date Y; verify with your AHJ." The user
gets the pointer; the AHJ gets the final word.

## 6. The audit — every existing tile gets a v6 pass

A maintenance task replays every utility from group A through group Q
against section 2 and section 3. The audit is checklist-driven. For
each tile:

- [ ] Reference block present in the order from section 3.
- [ ] Edition or source date visible on the tile.
- [ ] Free public-access pointer named.
- [ ] Governance notice from section 2.5 sized to the stakes.
- [ ] Numeric assumptions list complete and source-stamped.
- [ ] "Copy answer with full reference block" affordance wired.
- [ ] Data shard scanned for prose paste-ins (build-time lint).
- [ ] docs/data-sources.md entry up to date.
- [ ] scripts/sources.md entry up to date.
- [ ] data/integrity.json hash refreshed.

Tiles with the highest stakes and the highest jurisdictional drift get
audited first, in this order:

1. NEC-derived tiles in calc-electrical.js (utilities under group D).
2. IPC / IFGC tiles in calc-plumbing.js (group E).
3. NFPA 13 / IFC tiles in calc-construction.js and group H.
4. ACCA / ASHRAE tiles in calc-hvac.js (group G).
5. IRC / IBC / AWC tiles in calc-construction.js (group F).
6. FMCSA / FHWA tiles in group J.
7. FAA / USCG tiles in group K.
8. FDA / USDA tiles in group O.
9. EPA / SDWA / AWWA tiles in group M.
10. IICRC tiles in calc-restoration.js (group I).
11. Everything else.

The audit is tracked as one PR per group. Each PR ships the reference
block updates and the data-shard lint together so the maintainer never
has to remember a half-finished pass.

## 7. Build-pipeline changes

scripts/build-data.mjs gains:

- **Prose-lint.** Any string value in a data shard exceeding the
  configured plain-prose threshold is flagged. Threshold default 140
  characters of running prose; override per-shard via a sibling
  .lint.json. Numeric arrays, short labels, and citation strings are
  exempt.
- **Edition-stamp lint.** Every shard manifest (data/*/manifest.json)
  must carry an "edition" or "asOf" field. Build fails if missing.
- **Free-access lint.** Every entry in docs/data-sources.md must
  include a publisher name and, where one exists, a free-public-
  access pointer. Build fails if a shard has been added to a
  manifest but not to docs/data-sources.md.
- **Citation-string lint.** App.js and each calc-*.js renders the
  reference block from a structured citation object, not from
  inline strings. The lint pass scans for inline reference strings
  in calc-*.js and flags them. The intent is that the citation is
  data, not view code, so an audit edits one place.

scripts/expected-hashes.json is regenerated as part of every audit
PR. data/integrity.json is regenerated by the build. Neither is
hand-edited.

## 8. UI patterns

No new patterns. Two refinements to existing patterns:

- The reference block from section 3 replaces the v3 "inline citation"
  with a structured six-line block. The block is collapsed by default
  on the home view but expanded by default inside any opened tile.
- The "Copy citation" affordance from v3 becomes "Copy answer with
  full reference block." The v3 "Copy" (answer only) and "Copy all"
  (every input and output) affordances remain unchanged.

Big Buttons mode (v3) and High-Contrast theme (v3) render the
reference block at the same scale as the answer, not smaller. The
reference is part of the answer.

## 9. Out of scope for v6

- No new utilities. v6 is a discipline pass, not a feature pass.
- No outbound runtime links. The same-origin / no-runtime-fetch rule
  from v1 still binds. Free-access pointers are plain text the user
  copies.
- No "verify this with one click" button to a third-party site. That
  would break the trust model.
- No live code-adoption tracker. The crosswalk shards refresh at
  build time, semi-annually, and stamp their date. A user looking
  for live adoption status goes to the state agency.
- No automated AHJ lookup by lat/long. ZIP and state are the most
  granular the tile gets, and only because state adoption is the
  thing that changes the math.
- No premium tier, ever. No email gate, ever. No telemetry, ever.

## 10. Operations and ongoing maintenance (v6 addendum)

In addition to the v3 quarterly recheck and the v4 semi-annual
carrier-divisor recheck:

- Code-edition crosswalks (NEC, IPC, IRC, IBC, IECC, IMC, IFGC, IFC,
  NFPA 13, NFPA 101) are rechecked semi-annually. State adoption
  cycles are slow but not stable; new adoption usually clusters in
  the first half of the year.
- The build-time prose-lint runs on every push, not only on release.
  A failed lint blocks the deploy.
- The audit checklist from section 6 lives in the repo as
  docs/v6-audit.md and is checked off PR by PR until every tile is
  green. v6 is "done" only when every tile passes.

## 11. Closing note, in the voice from the foreword

A working person reaches for a tool because the answer matters and
the clock is running. The number on the screen is the start of his
trust, not the end. What lets him stake a job on it is the line
underneath: where the number came from, which edition of which book,
what the assumed ambient was, who has the final word if the
inspector disagrees, and where to go look it up himself for free in
the next ten minutes if he has to. That is what a citation is for.
Not legal cover. Not academic decoration. A pointer the user can
follow back to ground.

v1 through v4 built the math. v6 makes sure every answer comes with
the receipt. The sawyer pulling Doyle on a hundred trees, the
journeyman on top of a ladder with an inspector behind him, the
plumber sizing a vent in a jurisdiction that adopted IPC 2018 while
the state next door is on 2021, the head rigger flying a half-million
dollars of steel over a sold-out arena — every one of them gets the
same thing from this site. The number, the source, the edition, the
date, the assumption list, what governs, where to verify, and a
button that puts all of it on the clipboard.

Then we get out of the way.

Stay dirty.
