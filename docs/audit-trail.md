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

A reviewer's name appears in this document only with their
explicit consent. Anonymous-by-request reviews are recorded with
a generic identifier (e.g., "Reviewer A, WCAG specialist").

---

## 2026

_No external reviews on file yet. This document was introduced by
spec-v10 §I.3 in the v0.10 release cycle. Solicit the first
review during the v0.11 release window._

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
