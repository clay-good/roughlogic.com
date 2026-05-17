# Mid-cycle edition-amendment runbook

> Implementation status: introduced by spec-v10 §F.2.

This runbook documents the steps for a mid-cycle amendment: an OSHA
Federal Register update, an ASHRAE continuous-maintenance addendum,
a USEPA guidance reissue, an IRS revenue procedure update, an FMCSA
49 CFR amendment, etc. These are not full triennial rollovers. They
are smaller and arrive at irregular intervals. The runbook is small
because the work usually is.

## Triage: scope of the amendment

Before changing any code or data, classify the amendment:

1. **Language only** (clarifications, typos, cross-references).
   - No tile output changes.
   - Update the citation string, ship a patch release.
2. **Math change that matters**: a coefficient, a threshold, a
   formula.
   - Evaluate whether the prior formula was wrong (correction) or
     whether both are valid under different jurisdictions (parallel
     paths).
3. **Math change with negligible effect**: a formula whose new
   output differs from the old by less than the spec-v8 §10
   quarterly-recheck threshold for that tile.
   - Update the citation; do not change the formula. Add a note in
     [v6-audit.md](v6-audit.md) recording the divergence and the
     reason it is below the threshold.

## Steps for a language-only amendment

1. Identify the affected tile(s) by grep on the standard name in
   [../citations.js](../citations.js) and the calc-*.js modules.
2. Edit the citation string in [citation-discipline.md](citation-discipline.md)
   and regenerate `docs/citation-strings.generated.json` via
   `npm run docs:citation-strings` (the spec-v10 Phase A.3 generator
   landed in v0.10; the `--check` mode is wired into `npm run lint`
   and fails the build on out-of-sync edits). The runtime
   [../citations.js](../citations.js) source-stamp string for the
   tile also needs the same edit.
3. Update the affected `data/<folder>/manifest.json` `edition` field
   to mention the amendment date in parentheses, e.g.,
   `"OSHA 29 CFR 1910.95 (Federal Register amendment 2026-MM-DD)"`.
4. Bump `asOf` to today.
5. Add a CHANGELOG patch stanza naming the amendment, citing the
   Federal Register / publisher reference, and listing the affected
   tile(s).
6. Cut a patch release.

## Steps for a math-change correction

When the amendment shows the prior formula was wrong:

1. Capture the prior formula and the new formula in a scratch note
   alongside the worked-example fixture (Phase C.1) so a future
   reviewer can see the diff.
2. Update the calc module, the unit test, and the worked-example
   fixture. Use the publisher's worked example (or a textbook
   example that derives from the new formula) as the regression
   test.
3. Add a CHANGELOG patch stanza acknowledging the correction with
   exact wording: "Corrected formula in tile X to match the
   publisher's amended formula (Y) effective Z. Prior outputs for
   matching inputs differed by up to N%; users who saved a
   bookmark before this release should rerun the calculation."
4. Run the full test suite and the citation-freshness lint.
5. Cut a patch release.

## Steps for parallel-jurisdiction math

When the amendment introduces a formula that runs alongside the
prior formula because different AHJs accept different versions:

1. Add the new formula as an alternative input path on the tile
   (typically a select that defaults to the AHJ-most-common
   version).
2. Keep the prior formula. Document the choice in the tile's
   inline notice and in [derivations.md](derivations.md).
3. Update the citation to list both source references.
4. Add a worked-example fixture for both paths.
5. Add a CHANGELOG minor-release stanza naming the new path.
6. Cut a minor release.

## Standard-specific notes

### OSHA (29 CFR)

- Amendments arrive via the Federal Register at irregular
  intervals.
- Tiles affected: Group F (fire-ground), Group A (electrical
  safety, arc-flash screen), Group L (agriculture / forestry),
  Group P (field / SAR). Heat- and cold-stress tiles in
  cross-trade utilities also reference OSHA.
- Free-access source: ecfr.gov.

### USEPA guidance

- Amendments arrive via guidance reissues at irregular intervals.
- Tiles affected: septic-tank, septic-drainfield, stormwater-
  rational. State primacy agency governs final design; AHJ
  language stays.
- Free-access source: epa.gov.

### IRS revenue procedures and notices

- Annual cadence: Section 179 cap, standard mileage rate, payroll
  percentage method tables, SSA wage-base.
- Tiles affected: Group R (accounting / tax). Typically reissued
  in November–January for the next tax year.
- Free-access source: irs.gov.

### FMCSA 49 CFR

- Amendments at irregular intervals.
- Tiles affected: Group J (trucking). HOS, bridge formula, DOT
  reference tiles.
- Free-access source: ecfr.gov.

### ASHRAE addenda (continuous maintenance)

- Between full cycles, ASHRAE publishes addenda to 62.1 / 62.2 /
  90.1. The Standards Committee posts the approved addenda; the
  triennial cycle then incorporates them.
- Tiles affected: outdoor-air-ventilation. Confirm the addendum
  changes the table value the tile uses; many addenda touch
  language only.

### FHFA Conforming Loan Limits (Group X, spec-v12 §8)

- Annual reissue, typically late November for the following
  calendar year. The FHFA publishes the baseline conforming
  limit and the per-county high-cost ceiling.
- Tiles affected: X.* loan-limit / conforming / jumbo tiles; the
  bundled shard at [../data/realestate/loan-limits.json](../data/realestate/loan-limits.json)
  carries `refresh_cadence: "annual"`.
- Free-access source: fhfa.gov/DataTools/Downloads.
- Handling: the rollover is shape-stable (cap numbers move, file
  schema does not). Treat as a math-change correction step, with
  the prior-year cap row preserved as a per-tile history entry
  for AHJs that still cite the prior year.

### HUD FHA Single-Family Mortgage Limits + HUD PD&R Fair Market Rents (Group X, spec-v12 §8)

- HUD FHA limits: annual, typically December for the following
  calendar year.
- HUD FMR: annual, October for the federal fiscal year.
- Tiles affected: X.* FHA-limit and HUD-FMR tiles; the bundled
  shard at [../data/realestate/hud-fmr.json](../data/realestate/hud-fmr.json)
  carries `refresh_cadence: "annual"`.
- Free-access source: hud.gov/program_offices/housing/sfh/lender/originate
  (FHA limits) and huduser.gov/portal/datasets/fmr.html (FMR).
- Handling: math-change correction with prior-year row preserved.

### 14 CFR Part 91 + FAA AC amendments (Group W, spec-v12 §7)

- 14 CFR Part 91 amendments arrive via the Federal Register at
  irregular intervals; the FAA Advisory Circular changes (AC
  00-45, AC 91-79A, AC 120-92B, etc.) similarly.
- Tiles affected: W.* preflight / weather / performance tiles
  that reference Part 91 minimums or AC formatting conventions.
- Free-access source: ecfr.gov and
  faa.gov/regulations_policies/advisory_circulars.
- Handling: most amendments are language-only. Re-walk the
  referenced section TOC before classifying as math-change.

### AHA scales (Group V, spec-v12 §6)

- AHA Get With The Guidelines and the NIH Stroke Scale (NIHSS)
  are stable; the AHA publishes biennial scientific statements
  that may revise scoring anchors. Biennial recheck per
  spec-v12 §16.
- Tiles affected: V.* NIHSS, RACE, Cincinnati FAST, and the
  STEMI-onset timing tile.
- Free-access source: stroke.nih.gov and
  professional.heart.org/en/guidelines-and-statements.
- Handling: language-only the majority of the time; treat as
  math-change only when an anchor or sub-score weighting moves.

### AAHA / AAFP veterinary guidelines (Group U, spec-v12 §5)

- AAHA / AAFP reissue at irregular intervals (life-stage
  guidelines roughly every 5-10 years; nutrition and dental
  guidelines on their own clocks). Quarterly recheck per
  spec-v12 §16 because the reissue calendar is unpublished.
- Tiles affected: U.* RER / MER, life-stage, dental, and pain-
  scale tiles.
- Free-access source: aaha.org/practice-resources/guidelines and
  catvets.com.
- Handling: typically a language-only amendment that updates the
  free-access URL or the anchor descriptions; treat as math-
  change only when the activity-factor or anchor scoring moves.

## Recheck protocol (spec-v8 §10 + spec-v12 §H.2)

Independent of any specific amendment, the spec-v8 §10 protocol
schedules a periodic recheck of state-keyed and rate-keyed
shards. The check-citation-freshness lint reads the per-folder
`refresh_cadence` field (spec-v12 §H.2) on every per-folder
`manifest.json` and the matching `max_age_days` row in
[../scripts/refresh-cadence.json](../scripts/refresh-cadence.json)
to size the staleness window per shard (quarterly state-keyed
shards trip at 100 days, annual federal-publication shards trip
at 400-730 days, etc.). A folder with no row in
`scripts/refresh-cadence.json` falls back to the legacy flat
365-day window and emits a WARN naming the missing row; a
brand-new folder must add its row in the same PR or the
freshness lint fails.

The recheck log lives in
[../scripts/sources.md](../scripts/sources.md) under the "Recheck
log" section. Append a row per dataset with the date and the
reviewer. The per-source last-diff log (spec-v12 §H.3) appended
by [../scripts/append-source-diff-log.mjs](../scripts/append-source-diff-log.mjs)
on every data-refresh CI run lives in the same file under the
"Last-diff log" section and complements the manual recheck log.

## Anti-patterns

- **Bumping the formula without bumping the citation.** Users see
  a number that does not match the cited source.
- **Bumping the citation without bumping the formula.** The lint
  goes green, but the tile still computes using a prior
  coefficient. The worked-example regression catches this when
  the publisher's worked example uses the new coefficient.
- **Adding a parallel formula behind a flag.** Spec.md prohibits
  feature flags. If both formulas are valid under different AHJs,
  the input path is a labeled select, not a hidden toggle.
- **Skipping the CHANGELOG note for a "small" amendment.** The
  public utility commitment is that every change to a cited
  source is visible to users.

## See also

- [edition-rollover.md](edition-rollover.md) — the runbook for
  full triennial rollovers.
- [citation-discipline.md](citation-discipline.md) — the per-tile
  source-stamp registry.
- [../scripts/sources.md](../scripts/sources.md) — the data-pipeline
  records and recheck log.
- [../specs/spec-v10.md](../specs/spec-v10.md) §F.2 — the spec.
