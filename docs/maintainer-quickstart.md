# Maintainer's quickstart

> Implementation status: introduced by spec-v10 §I.1.

One page. Every recurring task a maintainer performs and the command
for each. Read top to bottom for orientation; jump by section header
for routine work.

## Repo layout (one-line orientation)

The site is one `index.html`, one `styles.css`, one `app.js`, a
service worker (`sw.js`), per-group calc modules (`calc-*.js`), and
a sharded `data/` folder. Specs live in `specs/`. Per-area docs
live in `docs/`. Build / lint / data scripts live in `scripts/`.
Tests live in `test/unit/` and `test/integration/`.

## Recurring tasks

### "I want to ship a new tile"

1. Pick the group (A through Y per [../README.md](../README.md); v12
   added U Veterinary / V EMS / W Pilots / X Real Estate / Y Educators
   on top of A-T) and the next utility number per the active spec.
2. Implement the exported `compute<Name>` function plus its renderer
   and a `<NAME>_RENDERERS["id"] = render<Name>` registration in
   `calc-<group>.js` (or the group's shared module). Put a `// dims:`
   annotation immediately above the exported compute function (the
   Phase C dimensional-analysis lint requires one per exported
   function), and export a `<name>Example` object.
3. Wire the tile into the registries (each is a one-line add; the
   lint gates below enforce that none is missed):
   - `{ id, name, group, trades, desc }` row in the `TOOLS` array in
     [../tools-data.js](../tools-data.js) (the catalog registry,
     lazy-loaded out of `app.js` per spec-v17 §H.2 -- NOT in app.js).
   - `[id, group]` row in `_TILES` in [../tile-meta.js](../tile-meta.js).
   - the tile id in the matching `declare("./calc-<group>.js",
     "<NAME>_RENDERERS", [...])` list in [../app.js](../app.js) (the
     `check-wiring` lint fails if a `TOOLS` id has no declared renderer).
   - `{ module, fn }` entry in
     [../test/fixtures/compute-map.js](../test/fixtures/compute-map.js).
   - a 3-6 id entry in [../scripts/related-tiles.mjs](../scripts/related-tiles.mjs)
     (`check-related-tiles`).
   - 3-5 search aliases in [../data/search/aliases.json](../data/search/aliases.json)
     (`check-discoverability`; terms must be unique catalog-wide).
4. Add tests + fixtures:
   - At least one worked-example fixture row in
     [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
     (the spec-v10 Phase C.1 registry; coverage is enforced by
     `scripts/check-worked-examples.mjs` in `npm run lint`).
   - A `test()` block in
     [../test/unit/bounds-fuzzer.test.js](../test/unit/bounds-fuzzer.test.js)
     pinning the worked example (both directions / unit systems where
     the tile solves both) and the degenerate-input error seams. This
     is the current per-tile cross-check + bounds-fuzzer coverage row
     the Phase D lint requires; the older
     [../test/unit/first-principles.test.js](../test/unit/first-principles.test.js)
     still runs but recent tiles pin in bounds-fuzzer.
   - Edge cases: zero, negative, max, missing input.
5. Add the source-stamp string to [citation-discipline.md](citation-discipline.md)
   and the inline entry (formula / edition / freeAccess / governance)
   in [../citations.js](../citations.js); both agree
   (`check-citation-coverage`).
6. Regenerate the v14 corpus + tile-index (`node scripts/build-corpus.mjs`
   and `node scripts/build-tile-index.mjs`; the `--check` forms run in
   `npm run lint`). Update the affected `data/<folder>/manifest.json`
   (`edition`, `asOf`) and run `npm run data:refresh` only if the tile
   uses a bundled dataset.
7. Run the full gate: `npm run audit` (six stages: lint -> test ->
   build -> check:dist -> check:shells -> data:verify, per spec-v12
   §G.3 + spec-v13 Phase G). Update the README catalog counts (the
   `check-readme-counts` gate verifies the tile/module/group/sitemap
   totals, including the Mermaid-diagram nodes).
8. Add a CHANGELOG stanza under "Unreleased" naming the tile, the
   group, the citation, and the worked example.
9. Per-module gzipped-size check: enforced by
   [../scripts/check-module-sizes.mjs](../scripts/check-module-sizes.mjs)
   (part of `npm run lint`). Each `calc-*.js` module carries an
   explicit cap (current v12 caps in [performance.md](performance.md)
   §"v12 per-module budgets"); the lint warns within 10 % of cap.
   The spec-v10 §H.1 5 KB *per-tile* cap remains the design target
   for the tile's contribution to its module.
10. If the tile is in Group U (Veterinary) or Group V (EMS /
    Pre-hospital), wire the spec-v10 §B.1 limitation banner with
    the spec-v12 §13.1 override governance language ("veterinarian
    governs" / "medical director and receiving facility govern")
    via a CANONICAL entry in [../limitation-banner.js](../limitation-banner.js).
    Group W / X / Y tiles use cite-strong governance verbiage in
    the source-stamp instead of a banner. The Phase F.2
    mobile-responsive sweep at 320 / 375 / 414 / 760 px per
    [mobile-responsive.md](mobile-responsive.md) is required for
    every new tile.

### "I want to roll a code edition"

Use [edition-rollover.md](edition-rollover.md). Quick version:

1. `scripts/sources-cycle.json` — bump the standard's edition.
2. `npm run lint` — work through the warnings.
3. Per-tile citation strings + per-folder manifest editions.
4. CHANGELOG stanza per standard rolled.

### "I want to ship a mid-cycle amendment"

Use [edition-amendment.md](edition-amendment.md). Quick version:

1. Triage: language only, math correction, or parallel jurisdiction.
2. Update citation; for a math change, update calc + worked-
   example fixture.
3. CHANGELOG patch stanza naming the publisher reference.

### "I want to retire a tile"

The 90-day deprecation per spec.md §10:

1. Add a CHANGELOG entry naming the tile, the planned removal date
   (today + 90 days), and the rationale.
2. Add a soft notice in the tile's renderer: "Scheduled for removal
   on YYYY-MM-DD."
3. Wait 90 days.
4. Remove the tile from the `TOOLS` array in [../tools-data.js](../tools-data.js)
   and from the `declare(...)` renderer list in [../app.js](../app.js).
5. Add a URL-hash redirect in [../routing.js](../routing.js) so
   stale bookmarks land on the closest replacement (or home, with
   a banner).
6. Remove the calc renderer, the unit tests, and the citation row.
7. CHANGELOG entry recording the removal.

### "I want to update bundled data"

1. Edit the canonical inline source in
   [../scripts/build-data.mjs](../scripts/build-data.mjs) (this is
   the build-time owner of every shard's content).
2. `npm run data:refresh` — regenerates the shards on disk and
   re-stamps `scripts/expected-hashes.json`.
3. `npm run data:verify` — confirms every shard hash matches.
4. Bump the affected `data/<folder>/manifest.json` `asOf` and
   per-entry `verifiedOn` dates.
5. CHANGELOG stanza naming the dataset and the source.
6. Run the full gate (`npm run audit`).

### "I want to refresh the WMM coefficient bundle"

WMM rolls every 5 years. The check-citation-freshness lint warns
within 6 months of expiry and hard-fails after.

1. Download the new WMM coefficients from
   ncei.noaa.gov/products/world-magnetic-model.
2. Update the bundled coefficients at
   [../data/field/wmm/coefficients.json](../data/field/wmm/coefficients.json)
   (the v9 §F.1 magnetic-declination tile's shard; the
   [../data/field/manifest.json](../data/field/manifest.json)
   `edition` line records the cycle).
3. Update [../scripts/sources-cycle.json](../scripts/sources-cycle.json):
   bump `current_edition`, `current_release`, `expires_on`.
4. Update the manifest `edition` string.
5. Add WMM round-trip worked-example tests for at least three known
   declination values from the new coefficient set.
6. CHANGELOG stanza naming the cycle (e.g., WMM2025 → WMM2030).

### "I want to commission an outside review"

Annual minimum per spec-v10 §14. Append a row to
[audit-trail.md](audit-trail.md) with date, reviewer, scope, and
outcome. The audit trail is append-only and public.

## Standard commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Local dev server (no build step). |
| `npm run build` | Produces `dist/` for deployment. |
| `npm test` | Full unit-test suite under Node's test runner. |
| `npm run test:unit` | Same as `npm test`. |
| `npm run test:e2e` | Playwright integration tests. |
| `npm run test:a11y` | axe-core accessibility tests. |
| `npm run lint` | grep checks, ngram bans, v6 discipline, v8 manifest discipline, v10 citation freshness, citation-strings sync check, discoverability, worked-examples coverage, tile-meta coverage, v12 G.2 wiring + G.4 renderer-export lints, module sizes, home payload budget. |
| `npm run check:dist` | spec-v12 G.3 dist/-vs-runtime cross-check. Walks every shipped HTML / JS / CSS / JSON under `dist/` and resolves every same-origin reference; dangling references fail. Wired into `npm run audit` as the fourth stage. |
| `npm run data:refresh` | Run the data pipeline. Regenerates shards and `expected-hashes.json`. |
| `npm run data:verify` | Verifies shard SHA-256 hashes against `expected-hashes.json`. |
| `npm run clean` | Removes `dist/`. |
| `npm run audit` | Single-shot pre-PR gate (spec-v10 §2 / §14; six stages as of spec-v13 Phase G): chains lint -> test -> build -> check:dist -> check:shells -> data:verify with per-stage banners. Short-circuits on first failure. |

## Per-release ritual

For every minor or patch release:

1. `npm run audit` — must report all 6 stages OK (lint -> test -> build -> check:dist -> check:shells -> data:verify).
2. Confirm home-view payload is under cap (current
   `check-home-payload` budget: 100 KB gzipped, with the v10 §H.2
   per-asset sub-budgets HTML 20 KB / CSS 25 KB / JS 45 KB enforced
   by `npm run lint`).
3. CHANGELOG stanza: dated, lists every change, names every tile
   touched.
4. `package.json` version bump per semver: patch for bug fixes and
   data refreshes, minor for new tiles or new platform features,
   major only with 90-day deprecation notice.

## Performance budgets at a glance

| Asset | Budget |
| ----- | ------ |
| Home-view total (gzipped) | 100 KB (HTML 20 / CSS 25 / JS 45 KB sub-budgets per spec-v10 §H.2) |
| Per-module dynamic-imported `calc-*.js` (spec-v12 §14.3 caps) | enforced by [../scripts/check-module-sizes.mjs](../scripts/check-module-sizes.mjs); live caps in [performance.md](performance.md). spec-v10 §H.1 5 KB-per-tile remains the design target. |
| First Contentful Paint (slow-3G) | 1.5 s |
| Largest Contentful Paint (slow-3G) | 2.5 s |
| Total Blocking Time | 200 ms |
| Cumulative Layout Shift | 0.05 |

## Hard rules (do not break)

- 100% client-side. No server, no account, no telemetry, no AI.
- No localStorage / sessionStorage / cookies / IndexedDB beyond
  `rl-theme`. URL hash is the only state mechanism. (The
  `rl-bigbuttons` key was retired in spec-v11.)
- CSP `default-src 'self'`, `connect-src 'self'`,
  `worker-src 'self'`.
- WCAG 2.2 AA, 48 px touch targets, single h1, voice input.
- No emojis, no em-dashes, no decorative icons in shipped UI.
- Plain ASCII in source-stamp strings.
- 90-day deprecation for any utility removed or formula changed.

## See also

- [contributor-checklist.md](contributor-checklist.md) — the PR
  checklist this quickstart compresses to a one-page form.
- [edition-rollover.md](edition-rollover.md) and
  [edition-amendment.md](edition-amendment.md).
- [citation-discipline.md](citation-discipline.md) — citation
  source of truth.
- [hash-state.md](hash-state.md) — URL-hash encoding spec.
- [audit-trail.md](audit-trail.md) — outside reviews.
- [../specs/spec.md](../specs/spec.md) — original v1 spec; every
  later spec inherits this.
