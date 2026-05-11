# roughlogic.com Specification v10 — Platform Refinements, Citation Hygiene, and Long-Run Maintainability

> **Implementation status (drafted 2026-05-10): in progress.** Phase A.1
> + A.2 + A.3 (citation-freshness lint, free-access URL probe,
> citation-strings generator with in-sync check), Phase B.1 + B.2
> starter + B.3 partial (limitation-banner shared component, per-tile
> meta-object registry with starter set + lint, plus wiring on Manual J
> cooling, Manual J heating, outdoor-air-mix, septic-drainfield,
> service-load, slope-avalanche, stair-stringer, arc-flash-screen
> (v9 §A.3), outdoor-air-ventilation (v9 §B.2), and sous-vide-
> pasteurization (v9 §H.6 on 2026-05-11) - all 9 §4.3 simplified-
> screening tiles are now in TOOLS and wired),
> Phase C.1 + C.2 (worked-example registry starter set + schema linter;
> coverage migration ongoing), Phase D.1 + D.2 (search aliases and
> companion-tile shards plus the discoverability lint), Phase F.1 / F.2
> (edition-rollover and edition-amendment runbooks), Phase G.1 / G.2 /
> G.3 (hash-schema version pin, regression suite, `docs/hash-state.md`),
> Phase B.2 (per-tile meta-object registry covering all 280 tiles, with
> the inverse-lint that prevents shipping a tile without a meta row),
> Phase E source-text parity audits (the lite/static counterpart to the
> Playwright-driven E.1 / E.2 / E.3 audits: every renderer file sets
> citationEl + uses makeOutputLine; no module uses innerHTML setter,
> eval, or new Function; index.html invariants), the `npm run audit`
> single-shot pre-PR gate (spec-v10 §2 / §14: lint -> test -> build ->
> data:verify, short-circuit on first failure, per-stage banners and a
> summary), Phase E.4 (per-tile a11y_verified_on signature with
> 180-day staleness
> warn), Phase H.1 (per-module gzipped-size lint with explicit budgets)
> + H.2 (per-asset payload sub-budgets) + H.4 (service-worker freshness
> audit unit tests), and Phase I.1 / I.2 / I.3
> (maintainer quickstart, contributor checklist, audit trail) all landed
> 2026-05-10 (with §B.3 closing 2026-05-11). Remaining phases pending:
> A.3 runtime alignment closed (52 of 52 citation-discipline rows match
> the renderer source verbatim; the two long-standing orphans cook-
> temps / vent-sizing were removed from the discipline doc 2026-05-11);
> C runner expansion (136 tiles / 135 fixtures wired into the runner -
> worked-example coverage 43.5% of TOOLS),
> E.1 / E.2 / E.3 Playwright e2e parity audits (the source-text lite
> versions are shipped), H.3 (first-paint timing audit; needs
> Playwright). See
> [../CHANGELOG.md](../CHANGELOG.md) for build-progress notes. The
> constraints below remain in force for any future work.

> Foreword, in the voice of someone who has maintained a public
> utility long enough to see the citations go stale, the editions
> roll over, the federal agency reorganize, and a free-access URL
> 404 in the middle of a thunderstorm.
>
> v6 set the citation discipline. v8 applied it tile-by-tile. v9
> shipped the next layer of new tiles. v10 is the maintenance
> layer: the automation that catches drift before users do, the
> shared components that keep new tiles consistent with old, the
> playbook that turns a triennial code rollover from a panic into a
> Tuesday afternoon, and the small per-tile polish that distinguishes
> "shipped" from "shipped and trusted."
>
> Every constraint in this spec is about reducing future labor for
> the maintainer and increasing trust for the user. No new tiles, no
> new groups, no new external dependencies. Just the platform under
> the tiles.

This document is the v10 spec. It inherits everything from spec.md,
spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md, spec-v6.md, spec-v7.md,
spec-v8.md, and spec-v9.md. If anything below conflicts with an
earlier spec, the earlier spec wins; rewrite the v10 entry until it
complies.

Repository: github.com/clay-good/roughlogic.com

US standards only. Assume all visitors are in the United States.

## 1. Inheritance

Every constraint from prior specs continues without exception. v10
adds no new groups, no new utilities, no new licenses, no new third-
party dependencies, no new storage keys, and no new state-mechanism.
v10 is a platform-only refinement pass. Every change in this spec is
either (a) new automation in `scripts/`, (b) a shared helper module
applied across existing tiles, (c) a documentation pattern, or (d) a
small per-tile UI polish that respects every existing constraint.

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

## 2. Motivation (informational)

A site that ships in 2026 cannot answer questions in 2030 unless
someone keeps the citations current. Every tile in this repository
quotes an edition, a section, or a regulatory citation. Any of those
will eventually go stale:

- **NEC** rolls every three years (2023 -> 2026 -> 2029). State
  adoption is uneven; some jurisdictions still enforce NEC 2017.
- **IPC, IRC, IBC, IMC, IFC** roll every three years (2021 -> 2024 ->
  2027). State adoption uneven.
- **NFPA standards** roll every three to five years per standard.
- **ASHRAE 62.1, 62.2, 90.1** roll every three years.
- **FDA Food Code** rolls every four years (2022 -> 2026 due).
- **NOAA WMM** rolls every five years (WMM2025 valid 2025 to 2030).
- **AASHTO Green Book** rolls roughly every seven years.
- **OSHA regulations** are amended at irregular intervals;
  publication in the Federal Register is the only signal.
- **USEPA guidance** is amended at irregular intervals.

A second concern is consistency across tiles. v8 applied the v6
citation discipline to most tiles; v9 applied it to thirty-one new
tiles. v10 codifies the discipline as automation, so a future tile
cannot be merged that violates it.

A third concern is long-term URL stability. The hash-state encoding
in [../hash-state.js](../hash-state.js) is the durable identifier for
every shared link. If a future spec changes the encoding, deep-links
shared today break. v10 introduces a hash-schema version pin so a
future format migration can be done without breaking shared bookmarks.

A fourth concern is discoverability. Two hundred seventy-one tiles
is more than any user scrolls through. Search and tag-based
discovery already exist; v10 adds aliasing (industry vocabulary
to tile name) and a "what users typically open next" companion-tile
suggestion that is computed at build time, not at runtime, so the
runtime stays purely deterministic.

A fifth concern is the launch-checklist gates. v3, v8, and v9 each
defined per-spec gates. v10 promotes the recurring portion of those
gates into a single, automated `npm run audit` command that any
contributor can run before opening a pull request.

## 3. Phase A — Citation freshness automation

### A.1 Edition-staleness lint

Add `scripts/check-citation-freshness.mjs`. The script reads:

- `data/*/manifest.json` `edition` and `asOf` fields.
- A new bundled `scripts/sources-cycle.json` with one row per
  cited standard listing the standard, the current edition, the
  cycle in years, the next-expected edition release date (best
  estimate), and a free-access URL.

The script then warns (does not fail CI) when:

- A manifest's `edition` is more than one cycle behind the current
  publication of that standard.
- An `asOf` date is more than 365 days old for any state-keyed or
  rate-keyed shard.
- A WMM (or other model) coefficient bundle is within 6 months of
  its expiration date.

The script fails CI when:

- Any manifest in a shard touched by the current PR is missing
  `edition` or `asOf`.
- Any new tile shipped in the current PR lacks a citation entry in
  `docs/citation-discipline.md`.
- The WMM (or other date-bounded model) bundle is past its
  expiration date.

The lint runs as part of `npm run lint` (added after the existing
v8 manifest checks).

### A.2 Free-access URL probe

Add `scripts/check-free-access.mjs`. The script reads every tile's
source-stamp string in [../citations.js](../citations.js) and
verifies that any URL referenced (nfpa.org/freeaccess,
codes.iccsafe.org, ecfr.gov, epa.gov, etc.) is reachable with HTTP
200. The script is opt-in (`npm run check:free-access`) and warns
on failure rather than failing CI, since a free-access URL going
4xx may be temporary or may indicate the standard's body has
restructured the site. A non-200 response triggers a manual review
log entry in `scripts/sources.md`.

### A.3 Citation-source-of-truth promotion

`docs/citation-discipline.md` (introduced in spec-v8) becomes the
single source of truth for every per-tile source-stamp string. The
runtime [../citations.js](../citations.js) imports the strings from
a generated file `docs/citation-strings.generated.json` produced
at build time from the markdown table. A unit test in
`test/unit/citations.test.js` asserts that the strings in
[../citations.js](../citations.js) match the generated file
verbatim. This means a triennial edition rollover is a single-file
edit (`docs/citation-discipline.md`), and CI catches every tile
that needs to be republished.

## 4. Phase B — Limitation-banner standardization

Every tile already carries a footer disclaimer per spec.md and
spec-v6. Several tiles (notably the simplified Manual J in
[../calc-hvac.js](../calc-hvac.js) and the simplified Lee arc-flash
introduced in spec-v9 §3.3) carry an additional banner stating
explicitly what the tile is NOT. v10 generalizes the pattern.

### B.1 The "what this is not" component

Add a shared helper in [../app.js](../app.js) (or a new
`limitation-banner.js`) that renders a tile-specific banner above
the inputs when the tile is in the simplified-screening category.
The component takes:

- `headline`: short string ("Not an IEEE 1584 study", "Not a Manual J
  load calculation", etc.)
- `replacement`: what code-compliance actually requires.
- `who_governs`: short string identifying the AHJ, licensed
  professional, or competent person who governs.
- `link`: optional free-access URL to the full standard's TOC.

The component is visually distinct from the citation footer and
the result-area context band. Color follows the High-Contrast
theme palette already in [../styles.css](../styles.css).

### B.2 Tile manifest

Add a `simplified: true` flag to each tile's metadata where
applicable. The flag drives the rendering of the banner. The tile
manifest is already implicit in the tile's calc module; v10
formalizes a small `meta` object per tile that includes:

- `id`
- `group`
- `simplified` (bool)
- `requires_field_meter` (bool, for tiles whose answer needs an
  actual meter reading rather than a calculation)
- `companion_tiles` (array of tile IDs, see Phase D)
- `expected_inputs` and `expected_outputs` for build-time
  validation

The manifest does not introduce runtime state. It is read at
build time and at tile-render time.

### B.3 Tiles that get the simplified banner

At minimum:

- Manual J cooling and Manual J heating ([../calc-hvac.js](../calc-hvac.js))
- Arc-flash incident-energy screen (v9 §3.3)
- ASHRAE 62.1 outdoor-air ventilation (v9 §4.2; the user-supplied
  Rp/Ra design pattern needs prominent banner)
- Stair stringer geometry (v9 §9.1; user-supplied limits pattern)
- Avalanche slope-angle screen (v9 §8.3; safety-critical
  screening, not training)
- Sous-vide pasteurization (v9 §10.6; food-safety screening)
- Septic drainfield (v9 §4.5; state primacy agency governs)
- Service / demand load (existing, per spec-v8)
- Any tile flagged in [../docs/launch-checklist.md](../docs/launch-checklist.md)
  as a screening tool

## 5. Phase C — Test-fixture and worked-example discipline

### C.1 Worked-example registry

Add `test/fixtures/worked-examples.json` listing, per tile, at
least one worked example from a primary public source with:

- Tile id
- Source citation (manual title, edition, page, equation number)
- Inputs as a JSON object
- Expected outputs with tolerance bands (absolute or percent)

The unit-test runner reads the registry and asserts the tile's
output matches the worked-example expectation within tolerance.
This converts the "find a textbook example" obligation in spec-v3
and later from per-test boilerplate to a single registry entry.

### C.2 Worked-example provenance

Each worked-example row carries:

- `source_publisher` (USEPA, NFPA, ASHRAE, AASHTO, FAA, FDA, etc.)
- `source_title`
- `source_edition_or_year`
- `source_section_or_page`
- `verified_by` (initials)
- `verified_on` (ISO date)

A linter (`scripts/check-worked-examples.mjs`) fails CI if any tile
lacks at least one worked-example row, or if any row is older than
its standard's current cycle.

### C.3 Numeric-tolerance discipline

Every worked-example expectation declares a tolerance. Defaults:

- Code-table-derived values: 1 percent or 1 unit of least precision,
  whichever is larger.
- First-principles physics with public coefficients: 0.5 percent.
- Statistical or model-derived values (THI, WMM declination): the
  cited model's published tolerance (typically 0.5 to 1 deg for
  WMM declination; 1 unit for THI).
- Standard-rounded sizes (kVA, breaker amps, lumber sizes): exact
  match required.

## 6. Phase D — Discoverability

Two refinements that improve the path from "user has a question" to
"user is looking at the right tile."

### D.1 Search aliases

Add `data/search/aliases.json`. One row per alias mapping a free-
text term to a tile ID. Aliases come from three sources:

- **Industry vocabulary**: "amps" -> breaker-sizing, "footers" ->
  footing-area, "perc test" -> septic-drainfield, "bridge law" ->
  bridge-formula, "30-30 rule" -> lightning-countdown.
- **Tool-name redirects**: misspellings, abbreviations, regional
  names (e.g., "drywall mud" -> material-quantity, "sheetrock" ->
  drywall, "joint compound" -> drywall, "yard math" ->
  concrete-volume).
- **Adjacent question redirects**: "what size breaker" ->
  breaker-sizing; "how cold can my pipes get" -> pipe-freeze (if
  that tile exists), otherwise a no-result with an explanation.

The aliases are merged into the home-view search index at build
time. The index does not grow the home-view payload past the
100 KB gzip cap; if it would, aliases are split into a lazy-loaded
shard and the search resolves them after first keystroke.

### D.2 Companion-tile suggestions

For each tile, the build computes a static list of companion tiles
("after this, you probably want X") from a curated mapping in
`data/search/companions.json`. Examples:

- After **conduit-fill**, suggest **wire-ampacity** and
  **voltage-drop**.
- After **manual-j-cooling**, suggest **cfm-per-ton**,
  **duct-sizing**, **outdoor-air-ventilation**.
- After **bridge-formula**, suggest **dim-weight**,
  **stopping-sight-distance**.
- After **slope-angle (avalanche)**, suggest **lightning-countdown**
  and **wind-chill**.

The suggestions render as inline links below the calculator's
result. The links route via the existing routing.js without
losing the current tile's input state. Companion suggestions are
build-time data; they do not produce any runtime fetch.

### D.3 No personalization, no telemetry

The companion list is the same for every user. No "users like
you also opened" inference, no cookie, no usage tracking. The
curated list is editable in `data/search/companions.json` and
reviewed once per minor release.

## 7. Phase E — Print, CSV, and accessibility parity audits

### E.1 Print parity audit

Every new tile shipping in v9 (and going forward) must render
cleanly in the print view introduced in spec-v2. The audit:

- Adds a Playwright test under `test/integration/print.test.js`
  that loads each tile by ID, fills the test-with-example inputs,
  switches to print view, and asserts the rendered HTML contains
  the citation footer, the source stamp, the inputs as a labeled
  list, and the outputs with units.
- Adds a `npm run check:print` task to `npm run lint`.
- Failure of any tile blocks the release.

### E.2 CSV export parity audit

The v5 CSV export (utility 269) was not extended to every new
tile. v10 closes the gap:

- Every tile with at least one quantity output exports a row per
  output to CSV via the existing helper.
- Tiles that compute many derived values (Manual J, Manual D,
  duct-sizing) export a primary row plus a "show your work"
  section.
- A Playwright test asserts the CSV header row matches the tile's
  output names and the body rows contain the expected values to
  the worked-example tolerance.

### E.3 Accessibility parity audit

Every tile passes axe-core with zero violations:

- At default theme, light theme, dark theme, High-Contrast theme.
- At default size and Big Buttons mode.
- With voice input simulated (no input event from a keyboard
  required for any input).
- With keyboard-only navigation (every interactive element
  reachable in tab order, with visible focus ring).
- With screen-reader landmarks (single h1, labeled regions,
  associated input labels).

The Playwright `a11y:` grep pattern (already used in
`test/integration/a11y.test.js`) is extended to cover every tile
ID in a parameterized loop.

### E.4 Per-tile a11y signature

Each tile carries an `a11y_verified_on` ISO date in its meta
object (added in Phase B.2). A lint warning fires when a tile's
verification is more than 180 days old; the contributor reruns
axe-core and updates the date.

## 8. Phase F — Edition rollover playbook

### F.1 The triennial-rollover runbook

`docs/edition-rollover.md` (new) documents the exact steps for a
triennial code rollover (e.g., NEC 2023 -> NEC 2026):

1. Update `scripts/sources-cycle.json` with the new edition's
   release date.
2. Read the new edition's TOC at the free-access URL; identify
   any section-numbering changes from the previous edition.
3. Update `docs/citation-discipline.md` for every tile that cites
   the rolling standard. Keep the prior-edition row in the
   per-tile history table for users on jurisdictions that
   haven't adopted yet.
4. Run `npm run lint` (the check-citation-freshness lint will
   highlight every manifest needing update).
5. Update each affected `data/*/manifest.json` `edition` field.
6. Verify `docs/citation-strings.generated.json` regenerates and
   the citation-string unit test passes.
7. Update `CHANGELOG.md` with one stanza per standard rolled.
8. Cut a minor release; the rollover is non-breaking unless the
   new edition introduces a section-numbering change that
   requires a deprecation notice.

### F.2 The mid-cycle amendment runbook

`docs/edition-amendment.md` (new) documents the steps for a
mid-cycle amendment (e.g., an OSHA Federal Register update, an
ASHRAE addendum, a USEPA guidance reissue):

1. Identify the amendment scope. If it introduces a new formula
   or value, evaluate whether it changes any tile's output by
   more than the spec-v8 §10 quarterly recheck threshold.
2. If the amendment changes only language (clarifications,
   typos, references), update the citation string and ship a
   patch release.
3. If the amendment changes math, evaluate whether the prior
   formula was wrong (in which case ship a patch release with a
   CHANGELOG note acknowledging the correction) or whether both
   are valid under different jurisdictions (in which case keep
   the prior formula and add the new one as an alternative input
   path).

### F.3 The edition-deprecation policy

A tile's source-stamp may carry up to two editions side-by-side
during the deprecation window:

- Newest published edition (default).
- Most-commonly-adopted edition (for the user whose AHJ has not
  yet adopted the newest).

When state-adoption surveys show the new edition has surpassed
50 percent adoption (state by state, weighted by population), the
older edition is removed. The 90-day deprecation notice in
spec.md applies; the CHANGELOG carries the planned removal date.

## 9. Phase G — URL-hash schema versioning

### G.1 The hash-version pin

[../hash-state.js](../hash-state.js) currently encodes tile inputs
in a URL fragment. v10 adds a leading `v=1` segment to every newly-
generated hash. Old hashes without `v=` are interpreted as `v=1`
(no change in behavior).

A future hash-format change can add `v=2` and the parser routes
based on the version. This means a deep-link shared today still
resolves correctly five years from now, even if the underlying
encoding evolves.

### G.2 Hash-schema regression suite

Add `test/unit/hash-state-schema.test.js` with at least 50 known
hashes from real shared links (collected from CHANGELOG examples
and from `docs/launch-checklist.md` worked examples). Every hash
must continue to resolve to the same tile and the same input
state, in every release. The test runs as part of `npm test` and
the dataset is append-only.

### G.3 Hash-version document

`docs/hash-state.md` (new) documents the encoding for each
version. v10 is `v=1` (which is the current encoding). The
document explains:

- The fragment grammar.
- The encoding for numeric inputs (precision rules).
- The encoding for select inputs.
- The encoding for multi-row inputs (the noise-dose,
  drying-log, and SHR tools introduced in v9).
- The reserved characters and escape rules.
- The migration policy when introducing `v=2`.

## 10. Phase H — Performance and payload audit per-tile

### H.1 Per-tile gzipped-size cap

Every dynamic-imported tile module is capped at 5 KB gzipped after
minification. Larger modules (Manual J, duct-sizing, the
psychrometric helper) are exempt and tracked individually in
`docs/performance.md`. The build (`scripts/build.mjs`) fails when
a non-exempt tile exceeds the cap. The cap is a guard against the
slow accretion of utility code into a single module that exceeds
its purpose.

### H.2 Home-view payload monitor

`scripts/check-home-payload.mjs` already enforces the 100 KB
gzipped budget per spec-v8 §9.3. v10 extends it to:

- Print a per-asset table to stdout showing how the budget is
  spent (HTML, CSS, the home-view JS shard, the data manifest
  for the search index, the alias index, the companion-tile
  index).
- Fail when the gzipped HTML exceeds 20 KB, the gzipped CSS
  exceeds 25 KB, or the home-view JS exceeds 40 KB. (These are
  per-asset sub-budgets that sum to less than 100 KB to leave
  slack for future growth.)
- Print the change in budget consumed since the previous
  release, computed by reading the prior dist artifacts in CI.

### H.3 First-paint timing audit

Add a Playwright test that loads the home view on a throttled
network (slow-3G profile) and asserts:

- First Contentful Paint under 1.5 s.
- Largest Contentful Paint under 2.5 s.
- Total Blocking Time under 200 ms.
- Cumulative Layout Shift under 0.05.

The site is static and tiny; these targets are achievable. The
test fails the build if any target is exceeded by more than 10
percent over the prior release.

### H.4 Service-worker freshness

The service worker [../sw.js](../sw.js) caches the application
shell. v10 audits the cache-update flow:

- A new release bumps the cache version.
- On next visit, the user receives the fresh shell within one
  page load (stale-while-revalidate with a hard-refresh prompt
  when the new version differs in a way the user should know).
- The "fresh shell available" indicator is unobtrusive and does
  not interrupt a calculation in progress.

A Playwright test simulates the upgrade path and asserts the
indicator appears, the calculation in progress is preserved, and
the URL hash is preserved across the refresh.

## 11. Phase I — Documentation polish

### I.1 The maintainer's quickstart

`docs/maintainer-quickstart.md` (new) lists, in one page, every
recurring task a maintainer performs and the command for each:

- "I want to ship a new tile" -> file layout, test scaffolding,
  CHANGELOG stanza, citation entry, manifest update, axe-core
  pass, payload-budget check.
- "I want to roll a code edition" -> the Phase F.1 runbook.
- "I want to retire a tile" -> the spec.md 90-day deprecation
  process, the URL-hash redirect, the CHANGELOG language.
- "I want to update bundled data" -> the data-pipeline command
  set, the integrity hash refresh, the manifest verifiedOn.

### I.2 The contributor's checklist

`docs/contributor-checklist.md` (new) is a checklist (not a
guide) that a PR description can reference:

- [ ] Tile passes its unit tests.
- [ ] Tile carries a worked-example fixture.
- [ ] Tile's citation row exists in citation-discipline.md.
- [ ] Tile's manifest has edition (or asOf).
- [ ] Tile passes axe-core in default and Big-Buttons modes.
- [ ] Tile renders in print view.
- [ ] Tile exports CSV.
- [ ] Tile's URL-hash round-trips.
- [ ] Tile is under the 5 KB gzipped per-tile cap.
- [ ] Home-view payload remains under 100 KB gzipped.
- [ ] CHANGELOG stanza added.

### I.3 The audit-trail document

`docs/audit-trail.md` (new) records every external review or
audit performed on the site, with date, reviewer, scope, and
outcome. The audit trail is append-only and public. It is not a
substitute for the AHJ; it is evidence the site takes its
"AHJ-governs" promise seriously enough to invite outside review.

## 12. Out of scope

- New tiles. v10 is platform-only. New tiles belong to v9 and to
  any future tile-expansion spec.
- New groups. The 19 existing groups (A through T, with the
  reserved-letter gaps) are stable.
- Telemetry of any kind. The companion-tile suggestions in Phase D
  are static, build-time, and identical for every user. There is
  no "what users like you opened" mechanism.
- Personalization. No accounts, no preferences beyond rl-theme and
  rl-bigbuttons.
- A/B testing. Spec.md prohibits A/B testing forever.
- Server-rendered anything. The site is and will remain a static
  bundle.
- Live data of any kind. No fuel prices, no tax rates, no weather,
  no court calendars.
- LLM, AI, or probabilistic anything.

## 13. Build, test, deployment

### 13.1 Phase order

v10 is incremental and most phases are independent. Suggested
order (each phase ships as its own minor or patch release):

1. **Phase A (citation freshness automation)**, ship as v0.10.x
   alongside or shortly after the v9 Phase A new tiles. The
   automation is tightest when the citation discipline is fresh
   in mind. Approx 200 lines of script code, zero runtime impact.
2. **Phase G (URL-hash schema versioning)**, ship as v0.10.x.
   Backward-compatible; no migration. Approx 50 lines of edit to
   [../hash-state.js](../hash-state.js).
3. **Phase B (limitation-banner standardization)**, ship as
   v0.11.x. Touches several existing tiles (Manual J, arc-flash,
   ASHRAE 62.1, stair-stringer, avalanche, sous-vide, septic,
   service-load). Approx 150 lines of new shared component plus
   per-tile manifest entries.
4. **Phase C (worked-example registry)**, ship as v0.11.x.
   Migrates existing per-test fixtures into the registry over
   time. Approx 30 KB of registry data; lives in test/, not
   shipped to the runtime.
5. **Phase H (performance and payload audit)**, ship as v0.11.x.
   Per-tile cap may require splitting one or two existing tiles
   into shared helpers; flag in CHANGELOG.
6. **Phase D (discoverability)**, ship as v0.12.x. Approx 5 KB
   gzipped of alias data, lazy-loaded after first keystroke.
7. **Phase E (print, CSV, a11y parity audits)**, ship across
   v0.12.x and v0.13.x as backfill completes. Some existing
   tiles may need touch-up to pass.
8. **Phase F (edition rollover playbook)**, ship as v0.12.x. The
   playbook is documentation; the implementation is the next
   actual edition rollover.
9. **Phase I (documentation polish)**, ship as v0.12.x.

### 13.2 Test requirements

Every phase ships with the test scaffolding it introduces:

- Phase A: lint scripts run as part of `npm run lint`. Unit
  tests for the lint scripts themselves under
  `test/unit/check-citation-freshness.test.js`.
- Phase B: rendering tests for the limitation banner under
  `test/unit/limitation-banner.test.js`. Per-tile assertion that
  the banner is present where `simplified: true`.
- Phase C: registry-driven assertion in every tile's existing
  unit-test file.
- Phase D: alias-resolution and companion-routing unit tests.
- Phase E: Playwright tests under `test/integration/`, one per
  audit (print, CSV, a11y).
- Phase F: no runtime tests; the runbook is exercised at the
  next actual rollover.
- Phase G: the schema-regression suite at
  `test/unit/hash-state-schema.test.js`.
- Phase H: Playwright timing test + per-tile size lint.
- Phase I: docs-only; no runtime tests.

### 13.3 Payload budget

v10 adds zero runtime payload to the home view. The discoverability
data (Phase D) is lazy-loaded after first keystroke and is bounded
at 5 KB gzipped. The limitation-banner shared component (Phase B)
is part of the existing app bundle and replaces ad-hoc strings
already present in tile sources, so the net effect is roughly
neutral or slightly negative.

### 13.4 Documentation

v10 adds these new docs files:

- `docs/citation-strings.generated.json` (build artifact;
  generated from `docs/citation-discipline.md`).
- `docs/edition-rollover.md`
- `docs/edition-amendment.md`
- `docs/hash-state.md`
- `docs/maintainer-quickstart.md`
- `docs/contributor-checklist.md`
- `docs/audit-trail.md`

It updates these existing docs:

- `docs/citation-discipline.md` (becomes the source of truth for
  citation strings).
- `docs/launch-checklist.md` (the recurring portion is promoted
  into `npm run audit`).
- `docs/performance.md` (adds the per-tile and per-asset budgets
  from Phase H).
- `docs/accessibility.md` (adds the per-tile a11y signature
  pattern from Phase E.4).
- `docs/data-sources.md` (adds the `data/search/aliases.json`
  and `data/search/companions.json` shards from Phase D).

## 14. Operations and ongoing maintenance

The recurring maintenance footprint after v10 ships:

- **Daily** (no action; the site stays live).
- **Weekly** (no action).
- **Monthly**: review any failing free-access URL probes from
  Phase A.2; update `scripts/sources.md`.
- **Quarterly**: review any state-keyed shard with `asOf` more
  than 90 days old; refresh and recompute manifest hashes per
  spec-v6 §6.
- **Annually**: review `docs/audit-trail.md`; commission an
  outside review (citation, accessibility, security) at least
  once per year and append the result.
- **Per release**: run `npm run audit` (added by v10), confirm
  every gate passes, write the CHANGELOG stanza.
- **Per code edition rollover**: the Phase F.1 runbook.
- **Per WMM cycle (5 years)**: bundle the new coefficient set,
  bump the manifest edition, ship.

The point of v10 is to turn maintenance into a sequence of
documented, audited, mostly-automated steps so the site continues
to deserve user trust ten years from now without depending on the
heroics of any single maintainer.

## 15. Closing note

v9 is what users see. v10 is what keeps v9 working in 2030. It
adds no tiles, no dependencies, no storage, no telemetry. It adds
the lint that catches a stale citation before a user does, the
shared component that makes the next simplified-screening tile
look like the last one, the runbook that turns a triennial code
rollover from a panic into a Tuesday afternoon, the URL-hash
version pin that means a link shared today still resolves five
years from now, and the documentation that lets a future
maintainer pick up the work without reading the entire git
history.

The site is a public utility. Public utilities outlive the
people who build them. v10 is the work that makes that possible.

Build it the way the rest was built. One tile, one calculation,
one citation, one copy. Then get out of the user's way, and
make sure the citation is still right ten years from now.
