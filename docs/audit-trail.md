# Audit trail

> Implementation status: introduced by spec-v10 §I.3.

Every external review or audit performed on the site is recorded
below with date, reviewer, scope, and outcome. The audit trail is
**append-only and public**. It is not a substitute for the
authority having jurisdiction; it is evidence that the site takes
its "AHJ-governs" promise seriously enough to invite outside
review.

## How to append a row

When an external review completes:

1. Add a new section header under the appropriate year.
2. Record:
   - **Date**: ISO 8601 (YYYY-MM-DD).
   - **Reviewer**: name, role, organization.
   - **Scope**: which subsystems were reviewed (citations,
     accessibility, security / threat model, data-pipeline,
     specific groups of tiles).
   - **Method**: what the reviewer actually did (live testing,
     code read, axe-core run, threat-model walkthrough).
   - **Findings**: numbered list. Use plain language. Cite the
     specific tile, file, or line where applicable.
   - **Disposition**: per-finding, what was done. "Fixed in
     commit ABC", "Documented as known limitation in X", "No
     change; finding is informational."
3. Do not delete or revise prior entries. If a finding turns out
   to be incorrect, note that in a follow-up entry rather than
   editing the original.

## Cadence

- **Annual minimum** per spec-v10 §14: commission at least one
  outside review per year and append the result.
- **Per major or minor release**: a self-audit is implicit in
  the per-release ritual ([maintainer-quickstart.md](maintainer-quickstart.md));
  it is not recorded here. This document is for outside
  reviewers only.
- **Ad hoc**: any review commissioned in response to a specific
  incident (citation challenge, accessibility complaint,
  security report) is recorded here regardless of cadence.

## What an outside review covers

Suggested review tracks. A single reviewer may cover one track or
several depending on scope.

- **Citation track**: spot-check N tiles' source-stamp strings
  against the cited edition/section. Verify free-access URLs
  resolve. Verify that the prior-edition row in
  [citation-discipline.md](citation-discipline.md) matches the
  AHJ-most-common edition for at least one US state.
- **Accessibility track**: axe-core in every theme (default /
  light / dark / high-contrast; Big Buttons retired in spec-v11).
  Keyboard-only navigation through every tile. Screen-reader
  walkthrough on a representative subset.
- **Security track**: threat-model walkthrough against
  [threat-model.md](threat-model.md). Verify CSP headers in
  `_headers`. Verify the absence of outbound network calls in
  the runtime bundle.
- **Data-pipeline track**: `npm run data:verify` on a clean
  clone. Spot-check N shards against their canonical sources.
  Verify the per-state coverage matrix matches the manifest.
- **Math-derivation track**: spot-check derivations in
  [derivations.md](derivations.md) against published worked
  examples. Verify worked-example fixtures in
  [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
  (the spec-v10 Phase C.1 registry; coverage enforced by
  `scripts/check-worked-examples.mjs` in `npm run lint`) match
  the publisher's example to the declared tolerance.

## Reviewers we want

The site is a public utility. Reviewers from any of the
following categories are welcome:

- Working tradespeople in any of the represented trades.
- Code officials and AHJ representatives.
- Accessibility specialists with WCAG 2.2 AA experience.
- Security researchers with a focus on web app threat models.
- Engineering educators using public worked examples.
- Independent open-source community reviewers.
- **Working DVMs and RVT / LVTs** (Group U, spec-v12 §5) for the
  veterinary math-aid review track. Plumb's / AAHA / AAFP
  familiarity preferred.
- **Practicing paramedics and EMS medical directors** (Group V,
  spec-v12 §6) for the field-protocol math-aid review track.
  PALS / ATLS / NRP familiarity preferred.
- **Current general-aviation pilots and CFIs** (Group W,
  spec-v12 §7) for the preflight / weather / performance review
  track. POH-to-AC 00-45 familiarity preferred.
- **Licensed real-estate brokers, appraisers, and lenders**
  (Group X, spec-v12 §8) for the financing-math review track.
  Familiarity with FHFA / HUD / VA underwriting preferred.
- **Practicing classroom teachers and curriculum specialists**
  (Group Y, spec-v12 §9) for the readability / grading-math
  review track. Familiarity with state Lexile-band bulletins
  preferred.

A reviewer's name appears in this document only with their
explicit consent. Anonymous-by-request reviews are recorded with
a generic identifier (e.g., "Reviewer A, WCAG specialist").

---

## 2026

_No external reviews on file yet. This document was introduced by
spec-v10 §I.3 in the v0.10 release cycle. Solicit the first
review during the v0.11 release window._

### 2026-06-05 — spec-v18 hardening pass 1: tile-contract sweep (maintainer self-audit)

- **Reviewer**: Maintainer (automated `check-tile-contract` sweep + manual fix review).
- **Scope**: The spec-v18 §2 output contract over all 442 registered
  compute functions (the `worked-examples.json` fixtures), driving each
  finite-numeric input slot to `0 / -1 / NaN / Infinity` and asserting the
  result is all-finite-or-`{error}`, pure, and non-mutating, with hangs and
  OOMs caught by running the sweep under a worker heap cap + timeout.
- **Method**: `node scripts/check-tile-contract.mjs` (worker-isolated),
  red-then-green regression test per fix in
  [../test/unit/tile-contract.test.js](../test/unit/tile-contract.test.js).
- **Findings**: 7 Tier-1 crashers (a perturbed input that hung, exhausted
  memory, or threw rather than returning `{error}`) and a Tier-2 backlog of
  889 perturbed-input non-finite *output* leaks across the catalog.
  1. `upgrade-roi` (`computeUpgradeROI`): `years = Infinity` looped the NPV
     accumulation forever. calc-cross.js.
  2. `loan-amortization` (`computeAmortization`): `term_months = Infinity`
     built an unbounded schedule array (OOM). calc-accounting.js.
  3. `macrs` (`computeMacrs`): `year_of_interest = NaN` indexed the schedule
     with `NaN`, throwing on `.year` of `undefined`. calc-accounting.js.
  4. `serial-dilution` (`computeSerialDilution`): `number_of_steps = Infinity`
     built an unbounded tube array (OOM). calc-lab.js.
  5. `hip-valley-rafter` (`computeHipValleyRafter`): `run_ft = Infinity` (or a
     non-positive jack spacing) looped the jack-rafter generator forever.
     calc-construction.js.
  6. `court-deadline` (`computeDeadline`): `days = Infinity` threw "Invalid
     time value" on the calendar path and looped on the court-day path.
     calc-legal.js.
  7. `solar-times` (`computeSolarTimes`): `tz_offset_hours = Infinity` spun
     the 1440-minute wrap loop forever. calc-field.js.
- **Disposition**:
  1. All 7 Tier-1 crashers fixed (finite-input guards / sane magnitude
     caps); Tier-1 backlog is now **0** and gated by `check-tile-contract`
     plus the `tile-contract.test.js` regression suite.
  2. The 889-entry Tier-2 backlog is grandfathered in
     [../test/fixtures/contract-baseline.json](../test/fixtures/contract-baseline.json);
     the gate fails on any *new* leak and the baseline is tightened
     module-by-module per spec-v18 §7.
  3. Separately, `check-shell-mobile` (promoted to a standing gate) caught
     the client-rendered changelog overflowing 320 px on long file-path /
     URL tokens; fixed with `overflow-wrap` on `#changelog-content`.

### Open solicitations for v0.11 / v0.12 (spec-v12 §15 gate 10)

Per spec-v12 §15 gate 10 the following external reviews are
solicited for the v0.11 / v0.12 release window. Both belong to
the spec-v12 §13.1 clinical-utility override scope, and the
override renewal clause in [profession-overrides.md](profession-overrides.md)
gates on these reviews landing.

- **Group U (Veterinary).** Sought reviewer: a working DVM or RVT
  with current Plumb's / AAHA / AAFP familiarity. Scope: the
  eighteen U.* tiles in [../calc-vet.js](../calc-vet.js), the
  professional-governs limitation banners, and the worked-example
  fixtures (RER, fluid maintenance, toxicity thresholds in
  particular).
- **Group V (EMS / Pre-hospital).** Sought reviewer: a current
  paramedic or EMS medical director with PALS / ATLS protocol
  familiarity. Scope: the twenty V.* tiles in
  [../calc-ems.js](../calc-ems.js), the receiving-facility
  governance verbiage, and the worked-example fixtures (Parkland,
  GCS, NIHSS, START / JumpSTART in particular).

Append the review under a new dated heading per the template
below when the signoff arrives.

### Open solicitations for v0.14 (spec-v14 §12 per-group signoff)

Per spec-v14 §12 the v0.14 close-out adds one signoff row per
active group A through Y (24 rows total). The v12 solicitations
above for Group U (Veterinary) and Group V (EMS) are the seed.
The remaining 22 group solicitations are appended here as they
are opened; each signoff is renewed on the v6 quarterly cadence
(90 days from review date) per spec-v14 §12.3 and §18.3.

The credential sought per group (spec-v14 §12.1):

- Group A Electrical, B Plumbing, C HVAC, D Restoration,
  E Construction, F Fire-ground, G Cross-trade, J Trucking,
  K Mechanic, L Agriculture, M Water, N Stage, O Kitchen,
  P Field: PE or equivalent trade certification.
- Group R Accounting: CPA.
- Group S Legal: JD.
- Group T Lab: PhD / MS in the relevant discipline.
- Group U Veterinary: DVM or RVT / LVT (v12 §13.1 override
  scope).
- Group V EMS: RN, MD, or paramedic with current protocol
  familiarity (v12 §13.1 override scope).
- Group W Pilots: ATP or CFI.
- Group X Real Estate: licensed broker, appraiser, or lender.
- Group Y Educators: working classroom teacher or curriculum
  specialist.
- Group H References and Group Q Historical: no signoff
  required (reference tiles use the v6 source-stamp recheck
  cadence; see [v6-audit.md](v6-audit.md)).

The signoff scope per group is the per-tile derivation rows in
[derivations.md](derivations.md), the worked-example fixtures
in [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json),
the per-group citations in [../citations.js](../citations.js),
and the per-tile dimension annotations in the source. See
[correctness.md](correctness.md) §"Per-group reviewer signoff"
for the operational summary.

### Per-group signoff status (v0.14)

The table below records the spec-v14 §12 signoff state per active
catalog group. Status values: **open** (no reviewer engaged yet),
**under-review** (reviewer engaged; signoff pending), **signed-off**
(signoff appended below under a YYYY-MM-DD section heading),
**renewal-due** (signoff older than the v6 quarterly cadence;
90-day window per §12.3 / §18.3). Groups H References and Q
Historical are **exempt** per spec-v14 §12.1 paragraph 2 (reference
tiles use the v6 source-stamp recheck cadence in
[v6-audit.md](v6-audit.md)).

This table is the structured state-machine the spec-v14 §12 / §18.3
quarterly-renewal lint reads. A row whose status remains **open**
past the v0.14 release does not block the release per spec-v14 §12,
but the v0.14 release announcement cannot carry the "audited" label
until every non-exempt row reaches **signed-off**.

| Group | Letter | Credential sought | Status | Last review | Next renewal | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Electrical | A | PE or equivalent trade certification | open | — | — | 33 tiles in [../calc-electrical.js](../calc-electrical.js); NEC 2023 primary source. |
| Plumbing | B | PE or equivalent trade certification | open | — | — | 28 tiles in [../calc-plumbing.js](../calc-plumbing.js); IPC 2021 primary source. |
| HVAC | C | PE or equivalent trade certification | open | — | — | 33 tiles in [../calc-hvac.js](../calc-hvac.js); ACCA Manual J / D + ASHRAE Fundamentals primary sources. |
| Restoration | D | PE or equivalent IICRC certification | open | — | — | 15 tiles in [../calc-restoration.js](../calc-restoration.js); IICRC S500 primary source. |
| Construction | E | PE or equivalent trade certification | open | — | — | 41 tiles in [../calc-construction.js](../calc-construction.js); IRC / IBC 2021 + ASCE 7 + AWC NDS primary sources. |
| Fire-ground | F | PE or fire-officer / instructor certification | open | — | — | 20 tiles in [../calc-fire.js](../calc-fire.js); NFPA 13 / 14 / 54 / 1142 / 1962 / 1981 + ISO PPC primary sources. |
| Cross-trade | G | PE or equivalent trade certification | open | — | — | 27 tiles in [../calc-cross.js](../calc-cross.js); NIST + NIOSH + OSHA primary sources. |
| References | H | (exempt per §12.1) | exempt | — | — | 15 reference tiles; v6 source-stamp recheck cadence applies. |
| Trucking | J | PE or equivalent trade certification (CDL instructor acceptable) | open | — | — | 8 tiles in [../calc-trucking.js](../calc-trucking.js); FMCSA primary source. |
| Mechanic | K | PE or ASE master certification | open | — | — | 8 tiles in [../calc-mechanic.js](../calc-mechanic.js). |
| Agriculture | L | PE or USDA NRCS technical service provider | open | — | — | 9 tiles in [../calc-agriculture.js](../calc-agriculture.js); USDA NRCS + FAO 56 + ASABE D497 primary sources. |
| Water | M | PE or AWWA grade-4 operator | open | — | — | 9 tiles in [../calc-water.js](../calc-water.js); AWWA primary source. |
| Stage | N | PE or IATSE / ESTA technical director | open | — | — | 7 tiles in [../calc-stage.js](../calc-stage.js); ESTA / ANSI E1.X primary sources. |
| Kitchen | O | PE or ServSafe / FDA-Food-Code-trained chef | open | — | — | 6 tiles in [../calc-kitchen.js](../calc-kitchen.js); FDA Food Code primary source. |
| Field | P | PE or equivalent trade certification | open | — | — | 8 tiles in [../calc-field.js](../calc-field.js). |
| Historical | Q | (exempt per §12.1) | exempt | — | — | 1 reference tile; v6 source-stamp recheck cadence applies. |
| Accounting | R | CPA | open | — | — | 12 tiles in [../calc-accounting.js](../calc-accounting.js); IRS + AICPA primary sources. |
| Legal | S | JD | open | — | — | 9 tiles in [../calc-legal.js](../calc-legal.js); FRCP + state-keyed shards primary sources. |
| Lab | T | PhD / MS in the relevant discipline | open | — | — | 10 tiles in [../calc-lab.js](../calc-lab.js); CRC Handbook + Numerical Recipes primary sources. |
| Veterinary | U | DVM or RVT / LVT (v12 §13.1 override scope) | open | — | — | 18 tiles in [../calc-vet.js](../calc-vet.js); Plumb's + AAHA + AAFP primary sources. v12 solicitation seed (see above). |
| EMS | V | RN, MD, or paramedic with current protocol familiarity (v12 §13.1 override scope) | open | — | — | 20 tiles in [../calc-ems.js](../calc-ems.js); AHA / ACLS + NIH + ACEP primary sources. v12 solicitation seed (see above). |
| Aviation | W | ATP or CFI | open | — | — | 18 tiles in [../calc-aviation.js](../calc-aviation.js); FAA H-8083 + 14 CFR primary sources. |
| Real Estate | X | Licensed broker, appraiser, or lender | open | — | — | 15 tiles in [../calc-realestate.js](../calc-realestate.js); FNMA / FHFA / HUD / CFPB primary sources. |
| Educators | Y | Working classroom teacher or curriculum specialist | open | — | — | 15 tiles in [../calc-edu.js](../calc-edu.js); OpenIntro Stats + NIST + IUPAC primary sources. |

Counts: 24 active groups (22 non-exempt; 2 exempt H / Q). At
2026-05-22: 0 signed-off, 22 open, 2 exempt.

---

## Template

When appending, copy the block below and fill in the fields.

```markdown
### YYYY-MM-DD — Short scope title

- **Reviewer**: Name (role, organization).
- **Scope**: e.g., "Citation track on Group A (Electrical) tiles 1–25."
- **Method**: e.g., "Live spot-check against NEC 2023 free-access TOC."
- **Findings**:
  1. Description. Reference: file:line or tile id.
  2. Description.
- **Disposition**:
  1. Fixed in commit ABC123 (link).
  2. Documented as known limitation in CHANGELOG.md / docs/legal.md (cite the actual file the maintainer used).
- **Reviewer comment** (optional, in their words).
```

## See also

- [../specs/spec-v10.md](../specs/spec-v10.md) §I.3 — the spec.
- [maintainer-quickstart.md](maintainer-quickstart.md) — the
  per-release self-audit ritual.
- [contributor-checklist.md](contributor-checklist.md) — the PR
  gate.
