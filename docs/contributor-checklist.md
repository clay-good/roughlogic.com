# Contributor's checklist

> Implementation status: introduced by spec-v10 §I.2.

A checklist (not a guide) that a pull-request description can paste
verbatim. Tick each item before requesting review. The checklist is
deliberately terse; the deeper guidance lives in
[maintainer-quickstart.md](maintainer-quickstart.md) and the per-
phase docs ([edition-rollover.md](edition-rollover.md),
[edition-amendment.md](edition-amendment.md),
[citation-discipline.md](citation-discipline.md),
[hash-state.md](hash-state.md)).

## New tile

- [ ] Tile renders without console warnings or errors.
- [ ] Tile id is added to the `TOOLS` array in [../tools-data.js](../tools-data.js)
  (the catalog registry; lazy-loaded out of `app.js` per spec-v10 §H.2).
- [ ] Tile renderer is wired into the per-group `<NAME>_RENDERERS`
  dispatch table in `calc-<group>.js`, and the tile id is added to
  the matching `declare("./calc-<group>.js", "<NAME>_RENDERERS",
  [...])` list in [../app.js](../app.js) (the `check-wiring` lint
  fails if a `TOOLS` id has no declared renderer).
- [ ] A `// dims:` dimensional-analysis annotation sits immediately
  above the exported compute function (the Phase C lint requires one
  per exported function).
- [ ] Tile is wired into the supporting registries (each enforced by
  a lint gate): `[id, group]` in `_TILES`
  [../tile-meta.js](../tile-meta.js); `{ module, fn }` in
  [../test/fixtures/compute-map.js](../test/fixtures/compute-map.js);
  a 3-6 id entry in [../scripts/related-tiles.mjs](../scripts/related-tiles.mjs);
  and 3-5 unique search aliases in
  [../data/search/aliases.json](../data/search/aliases.json).
- [ ] v14 corpus + tile-index regenerated (`node
  scripts/build-corpus.mjs`, `node scripts/build-tile-index.mjs`; the
  `--check` forms run in `npm run lint`).
- [ ] Unit tests cover happy path, at least one edge case, and a
  worked-example fixture from a primary public source.
- [ ] Per-tile cross-check + bounds-fuzzer row added to
  [../test/unit/bounds-fuzzer.test.js](../test/unit/bounds-fuzzer.test.js)
  pinning the worked example and the degenerate-input error seams
  (the Phase D coverage lint requires one row per exported corpus
  function; the older
  [../test/unit/first-principles.test.js](../test/unit/first-principles.test.js)
  still runs but recent tiles pin in the bounds-fuzzer).
- [ ] Citation source-stamp string added to
  [citation-discipline.md](citation-discipline.md) and
  [../citations.js](../citations.js); both agree.
- [ ] Affected `data/<folder>/manifest.json` carries `edition` and
  `asOf`. Per-state shards carry per-entry `verifiedOn`.
- [ ] Citation includes a free-access URL where one exists.
- [ ] Tile passes axe-core in default theme, light, dark, High-
  Contrast, and keyboard-only navigation. (Big Buttons mode was
  retired in spec-v11.)
- [ ] Tile renders cleanly in print view (citation footer + source
  stamp + inputs as labeled list + outputs with units).
- [ ] Tile exports CSV (one row per quantity output, plus the
  show-your-work section for derived-value tiles).
- [ ] Tile's URL-hash round-trips (input → hash → applyHashState →
  same input). Add a fixture to
  [../test/unit/hash-state-schema.test.js](../test/unit/hash-state-schema.test.js)
  if the tile introduces a new key shape.
- [ ] Tile's dynamic-imported module stays under its per-module
  gzipped cap as enforced by
  [../scripts/check-module-sizes.mjs](../scripts/check-module-sizes.mjs)
  (caps listed in the "v12 per-module budgets" table in
  [performance.md](performance.md); spec-v10 §H.1 names 5 KB per
  tile as the design target). A new tile that pushes its calc-*
  module over the cap requires either a tile-level diet or a
  documented cap bump in the same PR with a CHANGELOG note.
- [ ] Home-view payload remains under the 100 KB gzipped cap.
- [ ] CHANGELOG stanza added under "Unreleased" naming the tile,
  group, citation, and worked example.
- [ ] If the tile is in Group U (Veterinary) or Group V (EMS /
  Pre-hospital), it renders the spec-v10 §B.1 limitation banner
  with the professional-governs notice (veterinarian governs /
  medical director and receiving facility govern) per the
  spec-v12 §13.1 override and a CANONICAL banner entry in
  [../limitation-banner.js](../limitation-banner.js).
- [ ] If the tile is in Group W / X / Y, it carries cite-strong
  governance verbiage (PIC governs / lender governs / teacher
  governs) in the source-stamp; no §B.1 banner needed.
- [ ] If the tile sweeps mobile at 320 / 375 / 414 / 760 px
  cleanly (no horizontal scroll, `overflow-wrap: anywhere` on
  long URLs, `inputmode` on numeric inputs) per the spec-v12
  Phase F.2 checklist in [mobile-responsive.md](mobile-responsive.md).

## Edition rollover (triennial)

- [ ] [../scripts/sources-cycle.json](../scripts/sources-cycle.json)
  updated with new `current_edition`, `current_release`,
  `next_expected`, and (if applicable) `expires_on`.
- [ ] Per-tile citation strings updated in
  [citation-discipline.md](citation-discipline.md) and
  [../citations.js](../citations.js). Prior-edition row preserved
  in the per-tile history table during the dual-edition window.
- [ ] Each affected `data/<folder>/manifest.json` `edition` updated
  and `asOf` bumped to today.
- [ ] Section-renumbering captured in citation strings as
  parenthetical "(formerly §X in YYYY edition)".
- [ ] CHANGELOG stanza per standard rolled.
- [ ] `npm run lint` clean (no edition-staleness warnings for the
  rolled standard).

## Mid-cycle amendment

- [ ] Triage classification recorded in PR description: language
  only, math correction, or parallel jurisdiction.
- [ ] Citation string updated to name the amendment (Federal
  Register reference, addendum number, revenue procedure number).
- [ ] If math changed: calc module + worked-example fixture +
  CHANGELOG language acknowledges any output diff vs. prior
  formula.
- [ ] Affected `data/<folder>/manifest.json` `edition` mentions
  the amendment date in parentheses; `asOf` bumped.
- [ ] CHANGELOG patch stanza names the publisher reference and
  the affected tile(s).

## Data-pipeline change

- [ ] Canonical inline source updated in
  [../scripts/build-data.mjs](../scripts/build-data.mjs).
- [ ] `npm run data:refresh` run; the pipeline regenerates
  `scripts/expected-hashes.json`.
- [ ] `npm run data:verify` reports all shards OK.
- [ ] Per-folder manifest `asOf` bumped; per-entry `verifiedOn`
  bumped where an individual value moved.
- [ ] Per-folder manifest carries a `refresh_cadence` field (one of
  `daily`, `weekly`, `monthly`, `quarterly`, `annual`, `event-driven`)
  per spec-v12 §H.2; the value matches the central row in
  [../scripts/refresh-cadence.json](../scripts/refresh-cadence.json)
  (the freshness lint fails on disagreement, and a new folder with
  no row in that file fails the build). For a brand-new data folder,
  add the row in the same PR.
- [ ] CHANGELOG stanza naming the dataset and the canonical
  source.

## Tile retirement (90-day deprecation)

- [ ] CHANGELOG entry names the tile, the planned removal date
  (today + 90 days minimum), and the rationale.
- [ ] Tile renderer carries a soft notice with the planned
  removal date.
- [ ] At removal time: `TOOLS` entry removed, calc renderer
  removed, unit tests removed, citation row removed, URL-hash
  redirect added in [../routing.js](../routing.js), CHANGELOG
  records the removal.

## Documentation-only change

- [ ] No code or data files changed.
- [ ] Markdown links resolve relative to `docs/` (no broken
  links).
- [ ] No emojis, no em-dashes, plain ASCII per the global
  typographic policy.
- [ ] CHANGELOG stanza if the change is user-facing (new
  doc, restructured doc); skip if purely internal copy edit.

## Universal gates (every PR)

- [ ] `npm run audit` passes (single-shot gate chains lint -> test ->
  build -> check:dist -> check:shells -> data:verify in the canonical
  order; six stages as of spec-v13 Phase G, which added the shell
  content gate after check:dist). The line items below are what
  `npm run audit` runs; ticking the box at the top is sufficient
  when the gate is green.
- [ ] `npm run lint` clean.
- [ ] `npm test` passing (full unit suite).
- [ ] `npm run build` clean (dist/ produced).
- [ ] No new third-party runtime dependency. No new outbound
  network call. No new storage key beyond `rl-theme`.
- [ ] No emoji, no em-dash, no decorative icon in shipped
  strings.
- [ ] CHANGELOG updated if the change is user-visible.

## See also

- [maintainer-quickstart.md](maintainer-quickstart.md) — the
  one-page orientation behind this checklist.
- [../specs/spec-v10.md](../specs/spec-v10.md) §I.2 — the spec.
