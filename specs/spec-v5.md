# roughlogic.com Specification v5 — The Quiet Office, the Law Library, and the Bench

> **Implementation status (2026-05-08): complete in v0.9.0, landed on roughlogic.com.** See [../CHANGELOG.md](../CHANGELOG.md) "Build progress (v5)" entries (batches 1-10) for the build-progress notes. The original heading proposed splitting these groups into separate sites; on review, "rough logic / tools for the trade" comfortably extends to law, bench science, and office work, so Groups R / S / T landed here as utilities 234-271. The constraints below remain in force for any future work.

> Foreword, in the voice of someone who has been on enough job sites to know
> that the dirtiest work in this country does not always happen in the dirt.
>
> Pull up a chair. We have spent four specifications worth of time on the folks
> with mud on their boots and grease under their nails, and that was the right
> place to start, because nobody else was building for them. But there is a
> second tier of work in this country that gets paywalled, gatekept, and
> billed by the hour, and the people stuck on the wrong side of that paywall
> are not lazy and they are not stupid. They are a small-business owner who
> needs to know whether her new oven is a five-year MACRS asset or a seven.
> They are a tenant trying to read a lease. They are a graduate student doing
> her fortieth dilution of the day on a budget that does not include a
> twelve-hundred-dollar lab software license. They are a paralegal counting
> court days around three federal holidays. They are a freelancer trying to
> figure out what she actually owes in self-employment tax before the April
> deadline turns into a problem.
>
> Every one of those folks is doing real math, with real consequences, on a
> real clock. And every one of them, when they reach for a website, gets a
> banner ad, a chatbot, a "talk to our experts" form, and a price they
> cannot see until they hand over an email.
>
> v5 is for them. Same rules. No accounts. No telemetry. No AI. No phone-home.
> Just the formula, the citation, the source stamp, and the clipboard. The
> math does not change because somebody bought a domain. The MACRS tables do
> not change because the IRS got a new logo. The judgment-interest rate in
> Ohio is still the judgment-interest rate in Ohio whether or not a law firm
> wants to bill three hundred dollars to look it up. Build it the way the
> rest of the site is built. One tile, one calculation, one citation, one
> copy. Then get out of the way.

This document is the v5 spec. It inherits everything from spec.md, spec-v2.md,
spec-v3.md, and spec-v4.md. If anything below conflicts with v1 through v4,
v1 through v4 win; rewrite the v5 entry until it complies.

Repository: github.com/clay-good/roughlogic.com

## 1. Inheritance from v1, v2, v3, and v4

Every constraint in spec.md, spec-v2.md, spec-v3.md, and spec-v4.md continues
to hold without exception:

- 100 percent client-side, single-page static web application on Cloudflare
  Pages. No server, no account, no analytics, no telemetry, no AI inference,
  no API key, no third-party fetch beyond same-origin static assets.
- No localStorage / sessionStorage / cookies / IndexedDB beyond the existing
  rl-theme key and the v3-blessed rl-bigbuttons key. URL hash is the only
  state mechanism for tool inputs.
- CSP default-src 'self', connect-src 'self', worker-src 'self'.
- WCAG 2.2 Level AA, 48 px touch targets, voice-input compatibility, single
  h1 per view. v3's Big Buttons mode and High-Contrast theme remain
  available on every v5 utility.
- No emojis, no em-dashes, no decorative icons.
- No reproduction of licensed code text. No reproduction of paywalled
  databases. No reproduction of bar association practice guides, CCH or RIA
  tax-research text, Westlaw or Lexis annotations, or any commercial legal
  publisher content. Calculations derive from public physics, U.S.
  government publications (IRS forms and publications, federal and state
  statutes, court rules), explicitly redistributable manufacturer or
  standards-body data, or original plain-English summaries written by the
  project author.
- Per-view inline notice on every calculator. The v5 additions introduce
  three new notice variants:
    - Tax-law variant on every Group R utility: "Estimate only. Tax law
      changes. Confirm with the current IRS publication or a licensed CPA
      before filing."
    - Legal-information variant on every Group S utility: "This is legal
      information, not legal advice. Statutes and court rules change. Verify
      with current state code and a licensed attorney before relying on
      this for a filing or a deadline."
    - Bench-science variant on every Group T utility: "Verify protocol
      against your lab's SOP before pipetting. A miscalculated dilution can
      ruin a run or a sample."
- Live-render, 50 ms debounce, aria-live polite output, "Test with example,"
  Copy and Copy-all, inline citation, source stamp, hash-bookmarkable inputs.
- Lazy-loaded calculator modules. Home-view payload budget under 100 KB
  after gzip remains the binding constraint. New modules dynamic-import on
  first use.
- Public changelog, semver, no A/B, no flags, no tracking. 90-day deprecation.
- The v3 prohibition and the v4 reaffirmation on live-data alerts, push
  notifications, SMS callbacks, server-side state, and any "phone home"
  feature still hold without exception. v5 adds nothing that needs a server.

## 2. New utilities (numbered continuing from v4)

v4 ended at utility 233 (Historical Pricing Context). v5 picks up at 234 and
runs through 271. Three new groups: R for the small-business accounting and
tax math, S for plain-English legal reference and statutory math, T for
bench-science laboratory math. Plus a short Group H extension for two new
reference pages and a short Group I extension for one new platform feature
that the v5 utilities make worthwhile.

### 2.1 Group R: Accounting, Tax, and Small-Business (utilities 234 through 245)

The audience is the woman running a dry cleaner, the guy with three landscape
trucks, the freelancer with one laptop and a Schedule C, the bookkeeper who
just wants to verify a number before sending the file to the CPA. Not a
hedge fund. Not a startup founder. The math is unglamorous and well known;
the only reason it is hard to find is that everyone selling tax software
would rather you not see it for free.

- 234. Straight-Line Depreciation. Inputs: asset cost, salvage value, useful
  life in years, in-service date, year of interest. Output: annual
  depreciation, accumulated depreciation through the year of interest, and
  remaining book value. First principles: (cost minus salvage) over life.
  Cite the published IRS Publication 946 chapter on straight-line method by
  name only.
- 235. MACRS Depreciation. Inputs: asset cost, MACRS class life selector
  (3, 5, 7, 10, 15, 20 year), convention selector (half-year or
  mid-quarter), in-service date, year of interest. Output: depreciation per
  year through the recovery period, accumulated depreciation, and remaining
  book value. Use the published IRS MACRS percentage tables (Table A-1
  through Table A-9 of Publication 946) bundled in a new
  data/accounting/macrs-tables.json shard. Cite Publication 946 by name and
  table number only; do not reproduce the surrounding text.
- 236. Section 179 and Bonus Depreciation Estimator. Inputs: asset cost,
  business-use percent, taxable income before the deduction, current-year
  Section 179 cap and phase-out threshold (driven by a small dated
  parameters file in data/accounting/section-179-limits.json), bonus
  depreciation percent for the placed-in-service year. Output: allowable
  Section 179 deduction, bonus depreciation amount, and the residual basis
  rolled into utility 235 for the remainder. Notice: tax-law variant.
- 237. Self-Employment Tax (Schedule SE). Inputs: net self-employment
  earnings, optional W-2 wages already subject to Social Security in the
  same tax year. Output: 92.35 percent net earnings subject to SE tax, the
  Social Security portion capped at the published wage base for the year,
  the Medicare portion at 2.9 percent, the Additional Medicare 0.9 percent
  above the threshold, total SE tax, and the deductible half. Bundle the
  current and prior-year Social Security wage bases and Additional Medicare
  thresholds in data/accounting/se-tax-parameters.json from published SSA
  and IRS announcements. Cite SSA and IRS by publication date.
- 238. Quarterly Estimated Tax Worksheet. Inputs: projected annual taxable
  income, filing status, prior-year total tax, current-year withholding to
  date. Output: required annual payment under the safe-harbor rules
  (smaller of 90 percent of current-year tax or 100/110 percent of prior
  year), per-quarter installment, and the next due date from the published
  IRS Form 1040-ES schedule. Bundle the current-year due dates in
  data/accounting/estimated-tax-due-dates.json. Notice: tax-law variant.
- 239. Payroll Tax Withholding (Simplified). Inputs: gross wages per pay
  period, pay frequency, filing status, allowances or W-4 step-2 selection,
  state selector. Output: federal income tax withholding using the
  published IRS Publication 15-T percentage method, employee FICA (6.2
  percent Social Security up to the wage base, 1.45 percent Medicare,
  Additional Medicare above the threshold), and a placeholder for state
  withholding that defers to a per-state shard for the small set of states
  where the formula is publishable as a simple percentage with brackets.
  Bundle the federal percentage tables in
  data/accounting/pub-15-t-tables.json. Cite Publication 15-T by name.
- 240. Loan Amortization Schedule. Inputs: principal, annual rate, term in
  months, optional extra principal payment per month, optional first
  payment date. Output: full month-by-month amortization with principal,
  interest, and balance per row, total interest, payoff date, and the
  effect of the extra payment if supplied. First principles: standard
  amortization payment formula. No login. No "talk to a loan officer."
- 241. Breakeven Analysis. Inputs: fixed costs per period, variable cost per
  unit, sale price per unit. Output: breakeven units, breakeven revenue,
  contribution margin per unit, contribution margin ratio, and a margin of
  safety given a target sales volume.
- 242. Sales Tax Compounding and Reverse Sales Tax. Inputs: pre-tax amount
  or post-tax amount, combined tax rate, optional second tier (city plus
  state). Output: the missing side and the implied tax. Reuses the existing
  state-tax-rates crosswalk where applicable. No live lookups.
- 243. Inventory Turnover and Days Sales of Inventory. Inputs: cost of
  goods sold for the period, beginning inventory, ending inventory, period
  length in days. Output: inventory turnover ratio, days sales of
  inventory, and a simple comparison against bundled industry-median
  benchmarks from public Census / SBA data in
  data/accounting/inventory-benchmarks.json. Cite the source publication
  and date.
- 244. Cash Conversion Cycle. Inputs: days sales outstanding, days inventory
  outstanding, days payable outstanding. Output: cash conversion cycle in
  days and the per-component contribution. Pure arithmetic over the three
  industry-standard formulas; cite by name.
- 245. Mileage Log Roll-Up (Schedule C / Form 2106). Inputs: list of trip
  rows with date, business miles, purpose, and start/end odometer; the
  current-year IRS standard mileage rate from
  data/accounting/standard-mileage-rates.json. Output: total business
  miles, deductible amount at the standard rate, and the implied total
  mileage if odometer fields are filled. Companion to v3 utility 107.
  Notice: tax-law variant.

### 2.2 Group S: Legal Plain-English and Statutory Math (utilities 246 through 254)

The audience is the small-business owner reading a contract, the tenant
reading a lease, the paralegal who just wants to verify a deadline, the
self-represented litigant in small claims court who cannot afford four
hundred dollars an hour to be told what day Friday is. All content is
either statutory math from a public formula, a per-state parameters file
sourced from the state's own published statutes and court rules, or an
original plain-English summary written by the project author. No
reproduction of bar-association practice guides. No "legal advice." Every
Group S utility carries the legal-information variant notice.

- 246. Statutory Judgment Interest. Inputs: judgment principal, state
  selector, judgment date, accrual-through date, optional partial payments
  with dates. Output: simple or compound interest accrued (per the
  state's rule), running balance, and per-day accrual rate. Bundle each
  state's statutory rate, simple-versus-compound flag, and citation in
  data/legal/judgment-interest-rates.json. Each entry cites the state
  statute by section number only and includes a "verified on" date.
- 247. Court-Day and Calendar-Day Deadline Calculator. Inputs: trigger date,
  number of days, day-type selector (calendar days versus court days), state
  or federal selector, optional weekend / holiday rollover rule. Output: the
  computed deadline, the list of skipped days, and the citation to the
  applicable court rule (Fed. R. Civ. P. 6, state equivalent). Bundle
  federal and state holiday calendars in data/legal/court-holidays.json
  for the current and next two calendar years.
- 248. Statute of Limitations Quick-Read. Inputs: state selector, claim type
  selector (contract written, contract oral, personal injury, property
  damage, fraud, debt collection, wage claim, medical malpractice). Output:
  the published limitation period, the start-of-clock rule (accrual,
  discovery, last payment), and the citation to the state code section. All
  content is original plain-English summary; do not reproduce statute text.
  Bundle in data/legal/statute-of-limitations.json with per-state
  attribution and a "verified on" date.
- 249. Small Claims Court Threshold and Filing Fee Reference. Inputs: state
  selector, optional county selector for the handful of states with
  county-level variation. Output: jurisdictional dollar maximum, filing fee
  range from the published court fee schedule, service-of-process options,
  and whether attorneys are permitted under state rule. Original
  plain-English summary; cite the state court system's published fee
  schedule by URL on the source-stamp.
- 250. Tenant Notice and Cure-Period Quick-Read. Inputs: state selector,
  notice type (non-payment of rent, lease violation, no-cause termination,
  month-to-month termination). Output: the published statutory notice
  period, the cure-period rule if applicable, and the citation to the
  state's landlord-tenant code. Original plain-English summary in
  data/legal/landlord-tenant-notice.json. Notice: legal-information
  variant, plus the worker-safety equivalent for self-help eviction
  ("Do not change the locks. The state procedure is the procedure.").
- 251. Wage and Hour Math (FLSA Overtime, Tipped, Salary Threshold). Inputs:
  hourly rate, hours worked in the week, tipped-employee selector with cash
  tips received, optional state minimum wage selector. Output: regular
  hours pay, overtime pay at 1.5x for hours over 40, tipped-employee
  shortfall under the FLSA tip credit if any, and the higher of state and
  federal minimum wage. Bundle current state minimum wages in
  data/legal/state-minimum-wage.json from each state's published labor
  department page; cite by URL and date.
- 252. Independent Contractor versus Employee Quick-Read (IRS 20-Factor and
  ABC Test). Inputs: a checklist of factors (behavioral control, financial
  control, relationship type for the IRS test; A, B, C prongs for the ABC
  test), state selector to determine whether the state uses the ABC test or
  a common-law test. Output: a deterministic categorical result for each
  test based on the checklist, plus the citation to the applicable IRS
  guidance and state code. Original plain-English summary of each factor.
  Notice: legal-information variant.
- 253. Plain-English Contract Clause Reference. A reference page with
  original plain-English summaries of common boilerplate clauses
  (indemnification, limitation of liability, assignment, choice of law,
  arbitration, force majeure, severability, integration, notice). No
  drafting suggestions, no model clauses, no "fill in the blank." Just
  what the clause does and what to look for. Notice: legal-information
  variant.
- 254. Plain-English Lease Term Reference. Companion to utility 253 for
  residential and small-commercial leases: rent, security deposit, common
  area maintenance, holdover, subletting, repair-and-deduct,
  attorney-fees-prevailing-party, jury-trial waiver. Original plain-English
  summary only. No model lease.

### 2.3 Group T: Bench Science and Laboratory Math (utilities 255 through 264)

The audience is the graduate student, the technician, the high-school
chemistry teacher, the small-shop biotech engineer who has done these
calculations a thousand times and still wants a deterministic tool that
does not require a license, an account, or a desktop install. All formulas
are public physics or public chemistry; the data shards bundle physical
constants and standard tables.

- 255. Molarity and Dilution (C1V1 = C2V2). Inputs: any three of stock
  concentration, stock volume, final concentration, final volume; unit
  selectors (M, mM, uM, nM; L, mL, uL). Output: the missing fourth value,
  plus the diluent volume to add. First principles. Cite the dilution
  formula by name.
- 256. Serial Dilution Planner. Inputs: starting concentration, target
  concentration, dilution factor per step (default 10), volume per tube,
  number of steps. Output: per-tube transfer volume, per-tube diluent
  volume, and the resulting concentration at each step.
- 257. Molecular Weight from Formula. Inputs: a chemical formula string
  (for example, NaCl, C6H12O6, K2HPO4, (NH4)2SO4). Output: molecular
  weight from the bundled IUPAC standard atomic weights in
  data/lab/iupac-atomic-weights.json. Parse the formula client-side; no
  network call. Cite IUPAC by name.
- 258. Mass-to-Moles and Moles-to-Mass. Inputs: any two of mass, moles,
  molecular weight. Output: the missing third. Companion to utility 257
  (the formula entry can drive the molecular weight).
- 259. Centrifuge RPM to RCF (and back). Inputs: rotor radius in
  millimeters, RPM (or RCF). Output: the other from RCF = 1.118 times
  10^-5 times r times N^2 with r in cm and N in RPM. Bundle a small
  reference table of common rotor radii in
  data/lab/centrifuge-rotors.json with manufacturer attribution.
- 260. Resuspension Volume. Inputs: lyophilized mass, target concentration,
  unit selectors. Output: diluent volume to add. Trivial arithmetic, but
  the unit handling is where most mistakes happen, so the tool is the
  fixture, not the formula.
- 261. PCR Master Mix. Inputs: number of reactions, per-reaction volume of
  each component (template, primers, dNTPs, polymerase, buffer, water),
  pipetting fudge-factor percent (default 10). Output: total volume per
  component for the master mix, with a column showing per-reaction and
  total. Pure arithmetic; the fixture is what makes it useful.
- 262. Beer-Lambert Concentration. Inputs: absorbance, path length in cm,
  molar extinction coefficient. Output: concentration from A = epsilon
  times c times L solved for c. Cite Beer-Lambert by name.
- 263. Henderson-Hasselbalch Buffer. Inputs: pKa of the acid, target pH,
  total buffer concentration, total volume. Output: ratio of conjugate
  base to acid from pH = pKa + log10([A-] over [HA]) and the moles of each
  to weigh. Bundle pKa values for common laboratory buffers (Tris, HEPES,
  MES, MOPS, phosphate, acetate, bicarbonate) in
  data/lab/buffer-pka.json with citation to the published source.
- 264. Hemocytometer Cell Count. Inputs: cells counted across the four
  large corner squares (or a user-selected count of squares), dilution
  factor, optional trypan-blue viability count. Output: cells per
  milliliter from (average count per square) times 10^4 times dilution
  factor, plus viability percent if the dead-cell field is filled. Cite
  the hemocytometer method by name.

### 2.4 Group H extensions: Knowledge References (utilities 265 through 268)

Each is a reference page. Original plain-English summaries by the project
author. No numeric inputs. Same pattern as v3 utilities 174 through 179.

- 265. IRS Form Quick-Read Index. Original plain-English summary of what
  each commonly used IRS form is for: 1040, Schedule C, Schedule SE,
  Schedule E, Form 4562 (depreciation), Form 941 (employer quarterly), Form
  W-9, Form 1099-NEC, Form 1099-K. One paragraph each. Cite each form by
  number and the IRS published title. No reproduction of form instructions.
- 266. State Sales Tax Nexus Quick-Read. Original plain-English summary of
  the post-Wayfair economic-nexus rules by state, sourced from each state's
  published nexus guidance. Bundle thresholds in
  data/legal/sales-tax-nexus.json with per-state citation and "verified on"
  date. Notice: legal-information variant.
- 267. OSHA Recordkeeping Quick-Read. Original plain-English summary of the
  29 CFR 1904 recordkeeping rules: who must keep, what counts as
  recordable, the 300, 300A, 301 forms, the posting period. Cite 29 CFR
  1904 by section number only.
- 268. Public-Domain Lab Safety Quick-Read. Original plain-English summary
  of GHS pictograms and signal words, plus a one-paragraph chemical-spill
  decision tree (assess, evacuate, contain, report) sourced from public
  OSHA Hazard Communication and EPA emergency-response guidance. No
  reproduction of safety data sheets.

### 2.5 Group I extension: Cross-cutting platform (utilities 269 through 271)

These extend the v3 platform affordances. All are deterministic, hash-stated,
zero-network, and motivated by the new utilities: the accounting and lab
tools produce more rows of output than the trade calculators, and the user
needs a way to keep them straight.

- 269. CSV Export of Tabular Output. A small button on tool views whose
  output is a table (utilities 240 amortization, 245 mileage roll-up, 261
  PCR master mix, anything that emits multiple rows) that triggers a
  client-side CSV download via a same-origin Blob URL. No third-party
  formatter. The CSV header row mirrors the visible table header. The
  filename includes the tool id and a deterministic hash of the inputs.
- 270. Print-Optimized Table View. A CSS adjustment so that the existing
  print view (utility 122) renders multi-row tables (240, 245, 261) with
  proper page-break-inside:avoid on table rows and a repeating thead on
  every printed page. CSS only; no behavior change.
- 271. Inline Glossary Hover. A small tooltip pattern on Group R, S, and T
  tools that defines the field-name jargon (MACRS, FICA, statute of
  limitations, molarity, RCF) on hover and on focus, sourced from a single
  data/cross/glossary.json shard of original plain-English definitions
  written by the project author. Hover and focus only; no click required.
  Verifies WCAG 2.2 AA tooltip behavior.

## 3. Out of scope (still and forever)

- Any utility that constitutes the practice of law, the practice of medicine,
  the practice of accounting, or any other state-licensed profession. v5
  utilities are reference and arithmetic. They do not file, advise, or
  represent.
- Any utility that requires a paid tax-research database (CCH, RIA, Bloomberg
  BNA, Westlaw, Lexis, PLI). The v5 line is what is published by the
  agency, by the legislature, by the court, or by the project author from
  scratch.
- Any utility that produces a number whose validity changes faster than the
  90-day deprecation window can absorb. The Section 179 cap is fine because
  it changes once a year; live mortgage rates are not.
- Live tax-rate lookups by zip code. Sales-tax-rate aggregation is a paid
  database business; we do not compete on currency, only on math.
- HazMat content. Stays on the future hazardous-materials site.
- Live drug-dosing or clinical decision support. Stays on sophiewell.com.
- Third-party APIs, accounts, fetches beyond same-origin static assets.
- AI / LLM / probabilistic anything.
- Any tool that requires an account to use.

## 4. Data posture for v5

Every new shard satisfies the same four conditions as v1 through v4: public
domain (federal publications, state code, court rules), physical fact,
explicitly redistributable standards-body data, or original creative work
authored by the project. No reproduction of paywalled databases or licensed
publisher annotations.

### New data shards introduced by v5

| Shard | Source | Notes |
| --- | --- | --- |
| data/accounting/macrs-tables.json | IRS Publication 946 Tables A-1 through A-9 | Public domain. Cite table number per entry. |
| data/accounting/section-179-limits.json | IRS annual revenue procedures | Public domain. Per-year entries with citation. |
| data/accounting/se-tax-parameters.json | SSA wage-base announcements, IRS Additional Medicare guidance | Public domain. Per-year entries. |
| data/accounting/estimated-tax-due-dates.json | IRS Form 1040-ES schedule | Public domain. Per-year entries. |
| data/accounting/pub-15-t-tables.json | IRS Publication 15-T percentage method | Public domain. Cite by year. |
| data/accounting/inventory-benchmarks.json | U.S. Census, SBA published industry medians | Public domain. Cite source and date per entry. |
| data/accounting/standard-mileage-rates.json | IRS annual standard mileage rate notices | Public domain. Per-year entries. |
| data/legal/judgment-interest-rates.json | Per-state statute | Cite section number per state; "verified on" date. |
| data/legal/court-holidays.json | Federal and per-state court rules | Cite court rule per entry; covers current plus next two years. |
| data/legal/statute-of-limitations.json | Per-state code | Original plain-English summary; cite section number. |
| data/legal/landlord-tenant-notice.json | Per-state landlord-tenant code | Original plain-English summary; cite section number. |
| data/legal/state-minimum-wage.json | Per-state labor department publications | Cite URL and date per entry. |
| data/legal/sales-tax-nexus.json | Per-state department of revenue published guidance | Cite URL and date per entry. |
| data/lab/iupac-atomic-weights.json | IUPAC standard atomic weights | Public reference. Cite IUPAC publication year. |
| data/lab/centrifuge-rotors.json | Manufacturer rotor specifications | Attribute per manufacturer. |
| data/lab/buffer-pka.json | Public chemistry references | Cite by published source. |
| data/cross/glossary.json | Original plain-English definitions | Original creative work, MIT-licensed. |

Every new shard receives an entry in docs/data-sources.md, scripts/sources.md,
the build-data pipeline, and data/integrity.json. State-keyed shards
(judgment-interest, statute-of-limitations, landlord-tenant, minimum-wage,
sales-tax-nexus) each carry a per-entry "verified on" date so the recheck
workflow can prioritize stale entries.

### Derivations that need a new section in docs/derivations.md

- Straight-line depreciation formula.
- MACRS percentage-table application by class life and convention.
- Section 179 phase-out and bonus-depreciation interaction.
- Schedule SE: 92.35 percent net-earnings adjustment, Social Security cap,
  Additional Medicare threshold, deductible-half computation.
- Quarterly estimated tax safe-harbor rule (smaller of 90 percent current or
  100/110 percent prior).
- Standard amortization payment formula and amortization-schedule recurrence.
- Breakeven and contribution-margin algebra.
- Cash conversion cycle from DSO + DIO - DPO.
- Statutory judgment-interest accrual (simple and compound) with partial
  payments applied per state rule.
- Court-day computation: trigger-day exclusion, weekend rollover, holiday
  skip per Fed. R. Civ. P. 6.
- Beer-Lambert solve for concentration.
- Henderson-Hasselbalch buffer-ratio solve.
- RPM-to-RCF conversion with rotor-radius units.
- Hemocytometer cell-count formula.

## 5. UI patterns

All v5 calculators follow the v1 through v4 patterns. No new patterns are
introduced except the three Group I additions (CSV export, print-table CSS,
glossary tooltip), which are platform features. The glossary tooltip is a
single shared component bound to any field that declares a glossary key in
its definition; it does not touch business logic.

Multi-row output utilities (240 amortization, 245 mileage roll-up, 261 PCR
master mix) use a virtualized table only if their row count can exceed
five hundred; otherwise a plain table is fine and lighter.

Group R, S, and T utilities ship with a stricter "Test with example" button:
the worked example for each utility cites a concrete published source for
the inputs (an IRS example, a state court rule example, a textbook problem)
so that a user can independently verify the math against an external
reference. The citation appears in the example chip itself, not just the
source-stamp.

## 6. Build, test, and deployment

Same as v1 through v4. New compute functions land in three new per-group
modules: calc-accounting.js, calc-legal.js, calc-lab.js. Group H reference
utilities extend calc-references.js. Group I features land in app.js or a
small new module per affordance. Each new utility ships with at least 10
unit-test cases. Each first-principles calculation gets a section in
docs/derivations.md and an entry in test/unit/first-principles.test.js. The
home-view payload budget remains 100 KB after gzip. The new calc modules
dynamic-import on first use.

Special test requirements for v5:

- Group R: include at least one IRS-published worked example as a test
  fixture per utility (Pub 946 Appendix A example for MACRS, Schedule SE
  Form 1040 instructions example for utility 237, Pub 505 example for
  utility 238).
- Group S: include at least one state-statute-published worked example per
  utility where the statute provides one. For utility 247 court-day,
  include the canonical Fed. R. Civ. P. 6 examples plus three state
  variants. For utility 246 judgment-interest, include one simple-interest
  state and one compound-interest state, both with partial payments.
- Group T: include the textbook worked examples for utilities 255, 259,
  262, 263 from public chemistry references; verify to four significant
  figures.
- Group I utility 269 CSV export: include a Playwright test that
  downloads the CSV from a live amortization tool and asserts the row
  count and header line.

## 7. Step-by-step build instructions and Claude Code prompts

These prompts continue the numbering from spec-v4.md section 7 (which ends
at step 57). Paste each prompt into Claude Code with the repo as the working
directory. Each prompt assumes prior steps are complete and tests are green.
No code is supplied below; the prompts are the specification.

### Step 58: Group R — Accounting and Tax (utilities 234 through 245)

> Implement utilities 234 through 245 from spec-v5.md section 2.1 in a new
> calc-accounting.js. For each utility, add the compute function, an
> Example export with at least one IRS-published worked example as the
> default fixture, the renderer, and the renderer registration in
> ACCOUNTING_RENDERERS. Add the new tool entries to the TOOLS registry in
> app.js with group "R" and tags "accounting", "small-business", "tax".
> Carry the tax-law variant inline notice on every tool. Add the seven
> new accounting data shards to scripts/build-data.mjs, data/integrity.json,
> docs/data-sources.md, and scripts/sources.md, with per-year entries where
> applicable and a "verified on" date on every parameter file. Implement
> utility 235 MACRS by indexing into data/accounting/macrs-tables.json by
> class life, convention, and year-of-recovery; verify against the
> Publication 946 Appendix A worked example to four-decimal precision.
> Implement utility 237 SE tax with the 92.35 percent adjustment, the
> Social Security wage-base cap from data/accounting/se-tax-parameters.json,
> and the Additional Medicare threshold; verify against the Schedule SE
> instructions example. Implement utility 240 amortization with optional
> extra-principal payment; verify the total interest against a published
> mortgage-calculator example. Add docs/derivations.md sections for every
> Group R derivation listed in section 4. Add 10+ unit tests per utility
> in test/unit/calc-accounting.test.js, including an edge case where the
> input crosses a tax-law parameter boundary (Social Security wage base,
> Additional Medicare threshold, Section 179 phase-out). Run npm test, npm
> run lint, npm run data:verify. The home-view payload budget must stay
> under 100 KB after gzip; verify with the build output. Update CHANGELOG.md
> under Unreleased > Build progress (v5).

### Step 59: Group S — Legal Plain-English and Statutory Math (utilities 246 through 254)

> Implement utilities 246 through 254 from spec-v5.md section 2.2 in a new
> calc-legal.js. Carry the legal-information variant inline notice on every
> tool. Add the six new legal data shards to the build pipeline; each
> state-keyed entry must have a citation to the state statute or court
> rule by section number and a "verified on" date. For utility 246
> judgment-interest, support both simple and compound accrual per the
> per-state flag; apply partial payments under the United States Rule
> (interest first, then principal) by default and document the choice in
> the inline notice. For utility 247 court-day, implement the Fed. R. Civ.
> P. 6 trigger-day exclusion and weekend rollover, then the per-state
> variant where supplied; bundle federal and per-state court holidays for
> the current and next two calendar years in
> data/legal/court-holidays.json. For utilities 248, 250, 253, 254, all
> content is original plain-English summary written from scratch by the
> project author; do not reproduce statute text or bar-association
> commentary. For utility 251 wage-and-hour, take the higher of state and
> federal minimum wage and apply the FLSA tip-credit makeup rule. For
> utility 252 contractor-versus-employee, return a deterministic
> categorical result for both the IRS 20-factor checklist and the ABC
> test; the user picks the test, the tool does not opine. Add
> docs/derivations.md sections for utilities 246 and 247. Add 10+ unit
> tests per utility in test/unit/calc-legal.test.js, including the canonical
> Fed. R. Civ. P. 6 examples for utility 247 and at least one
> simple-interest state plus one compound-interest state with partial
> payments for utility 246. Run the full suite, update CHANGELOG.md.

### Step 60: Group T — Bench Science (utilities 255 through 264)

> Implement utilities 255 through 264 from spec-v5.md section 2.3 in a new
> calc-lab.js. Carry the bench-science variant inline notice on every tool.
> Add data/lab/iupac-atomic-weights.json, data/lab/centrifuge-rotors.json,
> and data/lab/buffer-pka.json to the build pipeline. For utility 257
> molecular-weight, implement a small client-side formula parser that
> handles parentheses and subscripts (Na2SO4, (NH4)2SO4, Ca(OH)2,
> Fe2(SO4)3); reject unknown element symbols with a clear error. For
> utility 259 RPM-to-RCF, support both directions and unit-convert rotor
> radius from millimeters to centimeters internally; verify against three
> manufacturer-published rotor charts. For utility 262 Beer-Lambert and
> utility 263 Henderson-Hasselbalch, verify against textbook problems to
> four significant figures. For utility 261 PCR master mix, accept an
> arbitrary number of components and compute per-component total =
> per-reaction volume times (number of reactions times (1 + fudge factor)).
> Add docs/derivations.md sections for utilities 257, 259, 262, 263, 264.
> Add 10+ unit tests per utility in test/unit/calc-lab.test.js, with at
> least one textbook worked example per analytical utility. Run the full
> suite, update CHANGELOG.md.

### Step 61: Group H v5 — Reference Pages (utilities 265 through 268)

> Extend calc-references.js with utilities 265 through 268. All content is
> original plain-English summaries by the project author and stored in a
> new data/summaries/v5-references.json. Each utility renders an h2 plus
> dl pair following the existing reference-utility pattern. Utility 266
> sales-tax-nexus carries the legal-information variant notice. Utility
> 268 lab-safety carries a hardened safety notice: "If a chemical spill
> exceeds your lab's spill-kit capacity or involves an unknown agent,
> stop, evacuate, and call your environmental health and safety office
> or 911." Register all four in REFERENCE_RENDERERS and add to
> TOOL_MODULES in app.js. Add the four tools to TOOLS in group H with
> appropriate trade tags ("legal", "tax", "lab", "compliance"). Add 5+
> tests per utility. Run the full suite, update docs/data-sources.md and
> CHANGELOG.md.

### Step 62: Group I v5 — CSV Export, Print Tables, Glossary Tooltip (utilities 269 through 271)

> Utility 269 CSV export: add a Copy CSV button to any tool view whose
> renderer registers itself as a tabular-output tool (240, 245, 261). On
> click, build a CSV in memory from the rendered table headers and rows,
> create a same-origin Blob URL, trigger a download with a filename of
> the form "rl-<tool-id>-<inputhash>.csv", and revoke the URL. No
> third-party CSV library. Verify with a Playwright test that downloads
> the file and asserts row count and header line. Utility 270
> print-table CSS: extend the existing print stylesheet (utility 122)
> with table { page-break-inside: auto; } tr { page-break-inside: avoid;
> page-break-after: auto; } thead { display: table-header-group; }, plus
> a small wrapper class for tabular tools so the rules do not affect the
> non-tabular print pages. Verify visually with a 500-row amortization in
> the print preview. Utility 271 glossary tooltip: add a single shared
> tooltip component bound to any input or label that declares a glossary
> key. Source the definitions from a new data/cross/glossary.json shard
> of original plain-English definitions written by the project author.
> Tooltip opens on hover and on keyboard focus, closes on blur and on
> Escape; verify WCAG 2.2 AA tooltip behavior with axe-core. Add 10+ unit
> tests for the CSV builder, the formula parser fixture (utility 257),
> and the glossary tooltip behavior. Run the full suite, update
> CHANGELOG.md.

### Step 63: Documentation, integrity, and final review for v5

> Update docs/data-sources.md, docs/derivations.md, docs/legal.md,
> docs/threat-model.md, docs/launch-checklist.md, and docs/accessibility.md
> to reflect every v5 utility, every new shard, every new derivation, and
> every new accessibility consideration (the glossary tooltip pattern, the
> CSV export download). Add a new docs/notice-variants.md section that
> enumerates all five inline notice variants now in use (general, SOP,
> AHJ-governs, worker-safety, tax-law, legal-information, bench-science).
> Run npm run data:refresh to regenerate data/integrity.json for all new
> shards. Run npm run lint, npm test, npm run test:e2e, npm run test:a11y,
> npm run build. All must pass. Confirm the home-view payload remains
> under 100 KB after gzip with the new tools added; the home-view should
> still be far under the cap because all new calc files are
> dynamic-imported. Confirm Lighthouse CI still scores 95 or higher across
> performance, accessibility, best practices, and SEO. Update CHANGELOG.md
> with a v0.5.0 release stanza summarizing the v5 expansion. Bump
> package.json version to 0.5.0. Update the README's tool-count claim to
> reflect the new total (two hundred seventy one utilities) and the group
> list to mention the v5 additions: Accounting, Legal, Lab. Produce a
> written launch checklist diff vs docs/launch-checklist.md showing
> exactly what changed. The release is ready when every item in this
> step passes.

## 8. Operations and ongoing maintenance (v5 addendum)

Same as v1 through v4. The v5 shards introduce two new recheck cadences:

- Annual cadence (every January): IRS-driven shards
  (macrs-tables, section-179-limits, se-tax-parameters,
  estimated-tax-due-dates, pub-15-t-tables, standard-mileage-rates) get a
  full review against the IRS publications for the new tax year.
  Inventory benchmarks (Census / SBA) follow their own publication
  schedule; recheck quarterly.
- Quarterly cadence: state-keyed legal shards
  (judgment-interest-rates, statute-of-limitations, landlord-tenant-notice,
  state-minimum-wage, sales-tax-nexus) get a recheck against the state
  source page. The "verified on" date in each entry drives the
  prioritization: oldest first. Court-holidays.json gets an annual roll
  forward, but the year that is "current minus one" stays in the file
  for the 90-day deprecation window.

Track every recheck in scripts/sources.md with the date and the reviewer.
A failed recheck (URL moved, statute amended, table changed) results in a
CHANGELOG entry, a shard update, and a re-run of the full data-integrity
hash chain.

## 9. Closing note, in the voice from the foreword

I have watched a freelance graphic designer in a coffee shop, on the back
of an envelope, try to figure out what she actually owes in self-employment
tax with three weeks left until the deadline, because the tax-software
company wants ninety dollars to tell her the same number that the IRS
publishes for free. I have watched a tenant with a notice in his hand
scroll past four "we use cookies" banners and a chatbot trying to sell him
a paralegal subscription before he could find out whether the
fourteen-day cure period in his state is actually fourteen days. I have
watched a graduate student do her fortieth dilution of the day on a
forty-nine-dollar pocket calculator because the lab software her PI bought
took eight minutes to launch.

The point of this site is the same as it has always been. The math should
be there when those folks reach for it, and nothing else should be. No
banner. No login. No "talk to our experts." Just the answer, the source,
and the clipboard.

v5 keeps that promise and widens the net into the offices, the law
libraries, and the labs. Every utility above is something a real person
on a real clock will ask a real question about, and the answer is
deterministic, sourced, dated, and free. Build it the way the rest of it
was built. One tile, one calculation, one citation, one copy.

Then get out of the user's way.

