# roughlogic.com Specification v8 — Audit, Citation Polish, and Field-Reality Refinements

> Foreword, in the voice of someone who has watched a journeyman pull a tool
> off his phone at the top of a ladder and put it back two seconds later
> because it asked him three questions he did not have answers to.
>
> v1 through v4 built the calculators. v6 set the citation discipline. v7
> added twenty more tools. v8 is the audit pass: the math is right, the
> tests pass, the architecture is honest. What is left is the last ten
> percent that separates a correct tool from a tool a tradesperson reaches
> for first. Smart defaults. Companion outputs the user asks next anyway.
> Round-to-next-standard-part. Context bands so the answer comes with a
> sense of "is this normal." Costs added to the quantity tools that were
> a mental-math step short of useful. And finally, the v6 citation
> discipline applied tile by tile to the code-derived utilities that
> still cite by name only.
>
> Build it the way the rest of the site is built. One tile, one
> calculation, one citation, one copy. Then get out of the user's way.

This document is the v8 spec. It inherits everything from spec.md, spec-v2.md,
spec-v3.md, spec-v4.md, spec-v6.md, and spec-v7.md. (spec-v5.md was scoped
out and belongs to other public-utility sites; spec-v6 was a citation
discipline pass with no new utilities.) If anything below conflicts with
v1 through v4 or v6 or v7, the earlier spec wins; rewrite the v8 entry
until it complies.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States.

## 1. Inheritance

Every constraint from prior specs continues without exception. v8 adds
no new groups, no new licenses, no new third-party dependencies, no new
storage keys, and no new state-mechanism. v8 is a refinement pass:
small additions to existing tools, plus five new utilities that are
obvious gaps given what is already shipped.

The hard limits still bind:

- 100 percent client-side, single-page static, Cloudflare Pages, no
  server, no account, no telemetry, no AI, no API key, no third-party
  fetch beyond same-origin static assets.
- No localStorage / sessionStorage / cookies / IndexedDB beyond
  rl-theme and rl-bigbuttons. URL hash is the only state mechanism.
- CSP default-src 'self', connect-src 'self', worker-src 'self'.
- WCAG 2.2 AA, 48 px touch targets, voice input, single h1, Big
  Buttons mode, High-Contrast theme.
- No emojis, no em-dashes, no decorative icons.
- Home-view payload budget under 100 KB after gzip.
- Public changelog, semver, no flags, 90-day deprecation.

## 2. Audit summary (informational)

A May 2026 deep correctness audit of all 16 calc modules and 206
exported compute functions found **no critical math or logic bugs.**
Every formula, constant, unit conversion, and table lookup checked
against a published reference is correct. Edge-case guards
(divide-by-zero, non-negative validation, table bounds) are in place.
The 1802 unit tests are not hiding anything material.

A parallel usefulness audit found that the math is right but the user
experience leaves field-actionable improvements on the table. Those
improvements are the v8 punch list below.

A parallel citation audit found that the v6 discipline (edition stamp,
section number, AHJ-governs notice, free-access pointer) has not yet
been applied tile-by-tile to the code-derived utilities. v8 closes
that gap.

## 3. Phase A — Data manifest discipline

Every `data/*/manifest.json` shard must declare its source publication
and an `edition` (for code-locked data) or `asOf` (for date-stamped
data) field per spec-v6 §7.

### A.1 Manifests requiring an edition field

| Manifest | Required field |
| --- | --- |
| `data/electrical/manifest.json` | `"edition": "NEC 2023"` |
| `data/plumbing/manifest.json` | `"edition": "IPC 2021"` (and `"ifgc": "IFGC 2021"` where applicable) |
| `data/hvac/manifest.json` | `"edition": "ASHRAE 62.1-2022, 90.1-2022, 15-2022; IMC 2021"` |
| `data/fire/manifest.json` | `"edition": "NFPA 13-2022; IFC 2021"` |
| `data/construction/manifest.json` | `"edition": "IRC 2021; IBC 2021; AWC NDS-2018; ACI 318-19"` |

### A.2 Manifests requiring an asOf field

| Manifest | Required field |
| --- | --- |
| `data/crosswalks/manifest.json` | `"asOf": "<verification date>"` per state-tax-rates and IRS mileage entries |
| `data/plumbing/manning-roughness.json` | `"asOf": "<verification date>"` |
| All manufacturer-attributed shards (rotor charts, backflow curves, glycol curves) | `"asOf": "<verification date>"` |

### A.3 Lint enforcement

Add a check to `scripts/grep-checks.mjs` (or a new
`scripts/check-manifests.mjs`) that fails CI if any
`data/*/manifest.json` is missing `edition` or `asOf`. The check should
also verify that every state-keyed entry in `data/legal/*` (if it
existed) carries a per-entry `verifiedOn` date — currently moot, since
no `data/legal/` exists in this repo, but the lint future-proofs
against drift.

## 4. Phase B — Citation discipline applied tile-by-tile

Each tool below has the math right but the user-visible source-stamp
incomplete. Update the source-stamp string adjacent to the result
(not just the code comment) to include: code edition, section number,
AHJ-governs notice, and a free-access URL.

### B.1 calc-electrical.js

| Tool | Add to source-stamp |
| --- | --- |
| wire-ampacity | "per NEC 2023 Table 310.16 (75°C column) with §310.15(B) ambient/conduit-fill adjustments. AHJ-adopted edition governs. Free at nfpa.org/freeaccess." |
| conduit-fill | "per NEC 2023 Chapter 9, Table 4 (conduit areas) and Chapter 9, Table 5 (conductor areas). AHJ governs. Free at nfpa.org/freeaccess." |
| box-fill | "per NEC 2023 §314.16. AHJ governs. Free at nfpa.org/freeaccess." |
| service-load | "per NEC 2023 §220.12 (general lighting), §220.42 (dwelling demand), §220.82 (optional method). AHJ governs final service sizing." |
| breaker-sizing | "per NEC 2023 §215.3, §230.79, §408.36. Continuous-load 125% rule per §210.20(A). AHJ governs." |
| motor-fla | "Use motor nameplate FLA where available. Reference values per NEC 2023 Tables 430.247–430.250. Free at nfpa.org/freeaccess." |
| egc | "per NEC 2023 Table 250.122. AHJ governs. Free at nfpa.org/freeaccess." |
| lighting-density | "per ASHRAE 90.1-2022 Table 9.5.1 by occupancy. AHJ governs adopted edition." |
| gfci-afci-reference | "per NEC 2023 §210.8 (GFCI), §210.12 (AFCI), §406.4. AHJ governs. Free at nfpa.org/freeaccess." |

### B.2 calc-plumbing.js

| Tool | Add to source-stamp |
| --- | --- |
| pipe-sizing (Hunter) | "per IPC 2021 Table 422.1 (fixture units); Hunter (1940) curve. AHJ governs. Free at codes.iccsafe.org." |
| gas-pipe-sizing | "per IFGC 2021 Table 402.4 (NFPA 54). AHJ governs. Free at codes.iccsafe.org." |
| friction-loss | "Hazen-Williams (1905, public domain). IPC 2021 referenced for application." |
| vent-sizing | "per IPC 2021 Table 906.1. AHJ governs. Free at codes.iccsafe.org." |
| septic-tank | "EPA Onsite Wastewater Treatment Manual (EPA/625/R-00/008). State primacy agency governs final design." |
| grease-trap | "per IPC 2021 Table 1003.2; PDI WD-G201 by name. AHJ governs." |

### B.3 calc-hvac.js

| Tool | Add to source-stamp |
| --- | --- |
| manual-j-cooling, manual-j-heating | "Simplified screening estimate. Code-compliant load calc requires ACCA Manual J (8th ed.). Licensed HVAC designer and AHJ govern." |
| duct-sizing | "per IMC 2021 §603 and Darcy-Weisbach with Colebrook-White. AHJ governs. Free at codes.iccsafe.org." |
| refrigerant-pt | "Manufacturer P-T table by attribution. ASHRAE 15-2022 governs refrigerant safety; manufacturer technical bulletin governs charge." |
| combustion-air | "per IMC 2021 §304. AHJ governs. Free at codes.iccsafe.org." |

### B.4 calc-fire.js

| Tool | Add to source-stamp |
| --- | --- |
| sprinkler-density | "per NFPA 13-2022 Table 12.1 (hazard density). AHJ governs. Free at nfpa.org/freeaccess." |
| required-fire-flow | "per IFC 2021 Table B105.1 (ISO needed-fire-flow method). AHJ governs. Free at codes.iccsafe.org." |
| pdp | "per NFPA 13-2022 §8.3 (pressure calculations). AHJ governs." |
| standpipe-friction | "per NFPA 14-2022 (standpipes). AHJ governs." |

### B.5 calc-construction.js

| Tool | Add to source-stamp |
| --- | --- |
| lumber-spans | "per IRC 2021 Tables R502.5, R602.5 (header spans, framing). AWC NDS-2018 governs by reference. Free at codes.iccsafe.org and awc.org." |
| rafter | "per IRC 2021 Table R802.5.1 (rafter spans). AHJ governs. Free at codes.iccsafe.org." |
| stair-riser/tread | "per IRC 2021 §R311.7 (stair dimensions). AHJ governs final inspection. Free at codes.iccsafe.org." |
| footing-area | "per IRC 2021 §R401–R403 (foundations). Soil-bearing values per IBC 2021 Table 1806.2. AHJ governs." |

### B.6 calc-kitchen.js, calc-trucking.js, calc-mechanic.js

| Tool | Add to source-stamp |
| --- | --- |
| cook-temps | "per FDA Food Code 2022 §3-401.11. Local health code adopts and may modify. Free at fda.gov." |
| hos-math | "per FMCSA 49 CFR 395. ELD on the truck is the legal record. Free at ecfr.gov." |
| bridge-formula | "per 23 CFR 658.17 (federal). State limits may be lower. Free at ecfr.gov." |
| weight-balance | "per FAA AC 91-23A. Pilot-in-command and AFM govern. Free at faa.gov/regulations_policies/advisory_circulars." |

## 5. Phase C — Highest-leverage per-tool UX refinements

### C.1 calc-electrical.js

- **wire-ampacity**: default insulation to 75°C and ambient to 30°C.
  Add preset chips for ambient: "indoor 30°C", "field 45°C",
  "extreme 60°C". Cuts the common-case input from four taps to one.
- **conduit-fill**: accept shorthand entries like "12 THHN ×20" so a
  user listing 20 identical conductors does it in one row, not
  twenty. Show explicit "PASS" or "FAIL" badge before the percent.
- **breaker-sizing**: accept watts + volts + power factor as
  alternative input, compute current internally, then show breaker
  size. Show the continuous-load-derated size separately from the
  raw load.
- **voltage-drop**: add "voltage at load" as a companion output
  (source minus drop). Flag drop > 3% (NEC advisory) and > 5%
  (limit).
- **transformer-sizing**: show calculated kVA AND the recommended
  next standard ANSI/IEEE size (15, 30, 45, 75, 112.5, 150, 225,
  300, 500, 750, 1000 kVA).
- **service-load**: show the demand factors applied (e.g., "general
  lighting 100%/35%/25% per §220.42 step") so the math is visible,
  not just the bottom line.
- **voltage-imbalance**: add a derate table (1% imbalance → ~2% HP
  derate, 2% → ~4%, 3% → ~9%) so the user sees the cost in
  horsepower.

### C.2 calc-plumbing.js

- **friction-loss**: add velocity to the output. Flag > 5 ft/s
  (noise risk) and > 10 ft/s (erosion risk).
- **pipe-sizing**: add a "typical residential" preset selector
  (3-bed/2-bath, 4-bed/3-bath) that pre-fills the fixture-unit
  list; user tweaks. Show GPM design flow alongside the size.
- **water-hammer-arrestor**: output the air-charge pre-charge
  pressure the tech needs to set, not just the size.
- **expansion-tank**: output the pre-charge pressure (typical 12
  psi or 0.75 × system pressure) and a placement note ("on hot
  water outlet, before the first branch").
- **gas-pipe-sizing**: also output the achieved pressure drop so
  the user knows whether further regulation is needed.

### C.3 calc-hvac.js

- **manual-j-cooling, manual-j-heating**: output BTU/hr and tons
  side-by-side. Add an "I'm replacing an existing N-ton unit"
  preset that runs the load calc and flags significant disagreement.
- **superheat-subcool, approach-delta-t**: flag readings outside
  typical ranges (superheat 5–25°F, subcool 2–10°F, approach 5–15°F)
  with a one-line diagnostic ("high → check coil fouling or low
  charge").
- **refrigerant-pt**: add a "typical superheat for outdoor temp X"
  companion lookup so the field tech sees the answer to the next
  question without reaching for another tool.
- **cfm-per-ton**: convert from a reference into an input tool
  (tons in, CFM out, with a climate selector: standard 400, humid
  350, dry 450).
- **duct-sizing**: show friction-rate benchmark colors (green if
  ≤ 0.08", yellow 0.08–0.12", red > 0.12") for the entered CFM.

### C.4 calc-construction.js

- **concrete-volume**: also output bag count (60 lb and 80 lb
  bags). Accept optional "$/yd³" or "$/bag" and show total cost.
- **lumber-spans**: show actual deflection in inches alongside the
  pass/fail flag. If passing but marginal, recommend the next
  larger nominal size.
- **material-quantity**: add per-assembly unit conversion (square
  feet → drywall sheets, square feet → bundles of shingles, board
  feet → 2× boards) so the output is what the user orders, not
  what the user has to convert.
- **bolt-torque**: show clamp load achieved (lbf) alongside torque,
  since clamping force is the actual goal.
- **roofing-squares**: show bundles per shingle type, not just
  squares.
- **asphalt-tonnage**: show truck loadout (20-ton truck count) and
  paving distance at the entered width.

### C.5 calc-trucking.js, calc-mechanic.js

- **dim-weight**: show the divisor used and the break-even volume
  where dimensional weight crosses actual weight.
- **hos-math**: output the next legal drive start time as an actual
  timestamp, not just remaining hours.
- **pallet-loadout**: show "cube out vs. weigh out" — which limit
  binds first and by how much.
- **reefer-burn**: accept haul distance and show fuel reserve at
  the end of the haul.
- **weight-balance** (aircraft): output CG as a percent of MAC
  alongside inches-aft-of-datum, with the limit as a percent.
- **displacement-cr**: flag CR > 10.5:1 with "likely requires
  premium octane."
- **fuel-range**: accept optional $/gallon and show fuel cost for
  the range.
- **brake-pad-life**: accept optional pad cost and show estimated
  cost per 100,000 miles.

### C.6 calc-restoration.js, calc-water.js, calc-agriculture.js

- **dehumidifier-sizing**: show AHAM and field-method
  recommendations side-by-side; add operational guidance ("at this
  load, one large unit or two smaller for redundancy").
- **air-mover-placement**: output a placement pattern (corners,
  along walls) for the count.
- **hepa-filter-life**: accept job duration and show filters
  needed for the full job, plus optional cost.
- **timber-cruise**: accept optional $/board-foot and show
  estimated stand value.

## 6. Phase D — Cross-cutting platform refinements

These three changes apply across many tools and are best implemented
as shared helpers, not per-tool edits.

### D.1 Optional cost output

Add a shared helper `formatCostOutput(quantity, unitPrice, unitName)`
that any quantity-output tool can call. The helper:

- Renders an optional `$/unit` numeric input (hidden by default;
  expanded via a "Show cost" disclosure to keep mobile clean).
- When populated, outputs total cost formatted as USD with two
  decimals, plus a per-larger-unit cost where useful (e.g., "$3.57
  per sheet").
- Cost is never required, never persisted, never reported.

Apply to: concrete-volume, lumber-spans (board-feet roll-up),
material-quantity, drywall, roofing-squares, asphalt-tonnage,
aggregate, mortar-mix, weld-usage, fuel-range, brake-pad-life,
hepa-filter-life, timber-cruise, and any other tool whose primary
output is a quantity to purchase.

### D.2 Context bands

Add a shared helper `formatContextBand(value, low, high, unit)` that
renders "low / normal / high" beside a numeric output with a typical
range. Apply to:

- Manual J load (BTU/hr per sq ft, typical 15–25)
- CFM per ton (350–450)
- Superheat (5–25°F), subcool (2–10°F), approach (5–15°F)
- Voltage drop (advisory 3%, limit 5%)
- Pipe velocity (5 ft/s noise, 10 ft/s erosion)
- Flow per sq ft of cooling tower fill
- Inventory turnover vs. SBA median (out of scope for v8 — belongs
  to a future site)

### D.3 Round-to-next-standard-part

Add a shared helper `roundToStandard(value, standardSizes)` that
returns both the calculated value and the recommended next standard
size. Apply to: transformer kVA, breaker amps, conduit trade size
(already done implicitly), nominal lumber sizes, pump HP (round to
1/4, 1/3, 1/2, 3/4, 1, 1.5, 2, 3, 5, 7.5, 10 HP), water heater
gallons (40, 50, 75, 80, 100).

## 7. Phase E — New tools

Five tools that fit the ethos and close obvious gaps. Each is a
separate utility, numbered continuing from spec-v7's last utility.
(Numbering placeholder; assign final IDs at implementation time.)

### E.1 Panel Loading and Phase Rebalance

Inputs: list of circuit rows (description, amps, phase A/B/C or
single-leg). Output: load on each phase, percent imbalance, and a
suggested swap list ("move circuit 12 from phase A to phase C") to
minimize imbalance under the existing breaker-position constraints.
First principles only. Cite NEC 2023 §220 by name. Companion to
existing voltage-imbalance tool.

### E.2 Trap Arm Length (IPC)

Inputs: trap size, fixture drainage fixture units, vent location.
Output: maximum trap-arm length per IPC 2021 Table 909.1 with the
slope rule applied. Cite IPC 2021 §909, Table 909.1.

### E.3 Duct Leakage Test-and-Balance

Inputs: design CFM, measured CFM at registers, system static.
Output: estimated leakage percent, leakage class per SMACNA Duct
Leakage Test Manual, and a pass/fail against the design class.
Optional cost-of-lost-efficiency calc using utility 30 (cfm-per-ton)
and a $/kWh input.

### E.4 Residential Framing Package

Inputs: house footprint sq ft, wall height, roof pitch, joist span,
rafter span. Output: stud count (16" o.c. and 24" o.c.), top + bottom
plate board feet, joist count + total board feet, rafter count +
total board feet, ridge board, and a one-line lumber order summary.
Optional cost output via D.1. Cite IRC 2021 Tables R502.5, R602.5,
R802.5.1.

### E.5 Coagulant Dose from Jar Test

Inputs: raw water turbidity (NTU), flow (MGD), coagulant type
(alum, ferric, PAC), jar-test optimal dose (mg/L). Output: pounds
per day of coagulant, gallons per day of liquid stock at standard
strength (alum 48.5%, ferric 12.5% Fe), and a chemical cost given
$/lb input. Cite Metcalf & Eddy / AWWA M37 by name.

## 8. Out of scope

- Anything that crosses into the practice of law, medicine, or
  accounting. (Those belong to the v5 sites.)
- Anything that requires a paid feed (live tax rates, live fuel
  prices, live weather, live sports scores, real-time anything).
- AI / LLM / probabilistic anything.
- Any tool that requires an account.
- Any "what should I buy" recommender that ranks vendors. The
  cost helper (D.1) accepts a user-supplied price and does the
  arithmetic. It does not look up prices.
- Hazmat content (separate site).
- Live drug-dosing or clinical decision support (separate site).
- Anything from the abandoned spec-v5 (accounting, legal,
  laboratory). Those belong on dedicated sites and are not part
  of this repository.

## 9. Build, test, deployment

### 9.1 Phase order

Implement in the order that minimizes blast radius:

1. **Phase A (data manifests)** — pure JSON edits + lint. ~1 hour.
   Zero behavior change. Ship as v0.4.x.
2. **Phase B (citation strings)** — ~25 source-stamp string
   updates. Test changes are string assertions. ~half day. Ship
   as v0.4.x.
3. **Phase C (per-tool refinements)** — one tool per commit.
   Each commit ships with a unit-test update and a CHANGELOG
   entry. Ship as v0.5.0 cumulative.
4. **Phase D (shared helpers)** — three small modules:
   `cost-output.js`, `context-band.js`, `standard-sizes.js`.
   Apply across tools as a follow-on commit per tool. Ship as
   v0.5.x.
5. **Phase E (new tools)** — one utility per commit, in the
   order E.1 → E.5 (lowest blast radius first). Each follows
   the standard 10+ unit tests + CHANGELOG + docs/derivations
   pattern from v3. Ship as v0.6.0 cumulative.

### 9.2 Test requirements

- Phase A: lint test that fails CI if a manifest is missing
  `edition` or `asOf`.
- Phase B: string-presence assertion in each tool's renderer
  test. The user-visible source-stamp must contain the edition
  year and a free-access URL where one was added.
- Phase C: existing unit tests must continue to pass; each
  refinement adds at least one new test for the new behavior
  (preset selection, companion output, context band, etc.).
- Phase D: shared helpers each ship with 10+ unit tests
  exercising boundary conditions (rounding, missing input,
  out-of-range value).
- Phase E: 10+ unit tests per new tool, including the worked
  example each tool's spec section cites.

### 9.3 Payload budget

The home-view payload budget remains 100 KB after gzip. Phase
B is text-only. Phase C and D add small amounts (< 5 KB total
gzipped) to the calc modules they touch — none on the
home-view critical path. Phase E adds new dynamic-imported
modules; the home-view stays well under the cap.

### 9.4 Documentation

- `docs/data-sources.md`: new edition/asOf rows.
- `docs/derivations.md`: derivation entries for the five new
  tools in Phase E.
- `docs/citation-discipline.md` (new): single source of truth
  for the source-stamp strings added in Phase B, so future
  edition rolls (NEC 2026, IPC 2024, IRC 2024) update one
  file and propagate.
- `docs/threat-model.md`: no change (Phase D cost helper is
  client-side; no upload).
- `docs/accessibility.md`: note the new preset-chip pattern
  used in C.1 wire-ampacity and verify chip touch targets at
  48 px.
- `CHANGELOG.md`: one stanza per phase, semver-correct.

## 10. Operations and ongoing maintenance

The v6 quarterly recheck cadence applies to every shard the v8
audit touched. The new `edition` field in each manifest drives the
recheck schedule:

- **NEC**: triennial cycle (next major revision NEC 2026; field
  jurisdictions adopt unevenly — keep NEC 2023 stamp until 50%+
  of state surveys show 2026 adoption).
- **IPC, IRC, IBC, IMC, IFC**: triennial cycle (2021 → 2024).
- **NFPA 13, 14**: triennial cycle (2022 → 2025).
- **ASHRAE 62.1, 90.1**: triennial cycle.
- **FDA Food Code**: quadrennial cycle (2022 → 2026).
- **State-keyed shards**: quarterly recheck on the oldest
  `verifiedOn` first.

Track every recheck in `scripts/sources.md` with date and
reviewer.

## 11. Closing note

The audit found a site that does what it says it does: 206
calculator functions with no critical math bugs, 1802 passing
tests, an honest architecture, and a catalog that respects the
user. v8 is not a redesign. It is the small refinements that turn
"correct" into "the tool a tradesperson reaches for first": one
fewer tap, one more companion output, one more context band, one
more cost line so the user does not finish the math in their head.

Build it the way the rest was built. One tile, one calculation,
one citation, one copy. Then get out of the user's way.
