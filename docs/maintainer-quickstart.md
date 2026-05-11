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

1. Pick the group (A through T per [../README.md](../README.md)) and
   the next utility number per the active spec.
2. Implement the renderer in `calc-<group>.js` or a new shared
   module if one exists for the group.
3. Add the tile id to the `TOOLS` array in [../app.js](../app.js)
   with `{ id, name, group, trades, desc }`.
4. Add unit tests in `test/unit/calc-<group>-vN.test.js` covering:
   - At least one worked-example fixture (Phase C.1, when
     [../test/fixtures/worked-examples.json](../test/fixtures/worked-examples.json)
     exists; until then, inline in the test file).
   - First-principles cross-check (one row in
     [../test/unit/first-principles.test.js](../test/unit/first-principles.test.js)).
   - Edge cases: zero, negative, max, missing input.
5. Add the source-stamp string to [citation-discipline.md](citation-discipline.md)
   and [../citations.js](../citations.js).
6. Update the affected `data/<folder>/manifest.json`: `edition`,
   `asOf`, any new shard with `gzip_size_bytes`. Run
   `npm run data:refresh` if the tile uses a bundled dataset; the
   pipeline regenerates `scripts/expected-hashes.json`.
7. Run the full gate: `npm run lint && npm test && npm run build`.
8. Add a CHANGELOG stanza under "Unreleased" naming the tile, the
   group, the citation, and the worked example.
9. Per-tile gzipped-size check: the v10 §H.1 cap is 5 KB
   (when Phase H lands).

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
4. Remove the tile from the `TOOLS` array in [../app.js](../app.js).
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
6. Run the full gate (`lint && test && build`).

### "I want to refresh the WMM coefficient bundle"

WMM rolls every 5 years. The check-citation-freshness lint warns
within 6 months of expiry and hard-fails after.

1. Download the new WMM coefficients from
   ncei.noaa.gov/products/world-magnetic-model.
2. Update the bundled coefficients in
   [../data/physical-constants/](../data/physical-constants/) (or
   the v9 location once that lands).
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
| `npm run lint` | grep checks, ngram bans, v6 discipline, v8 manifest discipline, v10 citation freshness, home payload budget. |
| `npm run data:refresh` | Run the data pipeline. Regenerates shards and `expected-hashes.json`. |
| `npm run data:verify` | Verifies shard SHA-256 hashes against `expected-hashes.json`. |
| `npm run clean` | Removes `dist/`. |
| `npm run audit` | Single-shot pre-PR gate (spec-v10 §2 / §14): chains lint -> test -> build -> data:verify with per-stage banners. Short-circuits on first failure. |

## Per-release ritual

For every minor or patch release:

1. `npm run lint && npm test && npm run build` — must all pass.
2. `npm run data:verify` — must report all shards OK.
3. Confirm home-view payload is under cap (current
   `check-home-payload` budget: 100 KB gzipped, with v10 §H.2 sub-
   budgets when that phase lands).
4. CHANGELOG stanza: dated, lists every change, names every tile
   touched.
5. `package.json` version bump per semver: patch for bug fixes and
   data refreshes, minor for new tiles or new platform features,
   major only with 90-day deprecation notice.

## Performance budgets at a glance

| Asset | Budget |
| ----- | ------ |
| Home-view total (gzipped) | 100 KB |
| Per-tile dynamic-imported module (post-v10 §H.1) | 5 KB gzipped |
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
