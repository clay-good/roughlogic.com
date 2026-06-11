# roughlogic.com Specification v39 — calc-electrical.js Cap Relief (Housekeeping)

> **Implementation status: LANDED 2026-06-11 (stamps package 0.38.1, a patch).**
> v39 is a **platform-only / housekeeping** spec in the spirit of spec-v10 and
> spec-v36. It inherits everything from spec.md through spec-v38.md, **adds no
> tiles, removes no tiles, and changes no calculator output**. The catalog stays
> at **562 tiles**; only the on-disk module layout changes.
>
> **The problem.** `calc-electrical.js` (Group A, the founding electrical trade)
> had reached ~65.5 KB gzipped, **99.3% of its 66 KB cap** — the single most
> pressed module in the catalog after `calc-plumbing.js` (98.9%). It is the
> largest, most-depended-on module, so the next electrical tile, or even a
> citation reword, would have broken the build. Continued cap-bumping was
> deferring the documented real fix.
>
> **The change.** The spec-v24 **conduit-bending suite** — three cohesive,
> self-contained, first-principles bend/layout geometry tiles — is extracted from
> `calc-electrical.js` into the existing `calc-fab.js` (the cross-trade
> Fabrication & Layout bench). The moved tiles: `conduit-offset`,
> `conduit-saddle`, and `conduit-90-stub`. All remain **Group A** tiles (a tile's
> group letter is independent of its module — the spec-v28 / spec-v36 precedent);
> their ids, citations, worked examples, and behavior are byte-for-byte
> unchanged.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. What moved and why calc-fab

- **Moved to `calc-fab.js`**: the three exported compute functions
  (`computeConduitOffset`, `computeConduitSaddle`, `computeConduit90Stub`), their
  three renderers, and their `*Example` constants, re-pointed onto the existing
  `FAB_RENDERERS` map. The block references only the ui-fields helpers
  (`makeNumber` / `makeSelect` / `makeOutputLine` / `attachExampleButton` /
  `debounce` / `fmt` / `DEBOUNCE_MS`) — already imported by calc-fab — and the
  module-local `_finiteGuard`, which calc-fab already defines, so no import
  changes were needed. The cleavage was confirmed clean by grepping the moved
  region for references to symbols defined above the cut in calc-electrical
  (zero, the same self-containment test the v36 split used).
- **Why calc-fab (not a new module).** Conduit bending is first-principles
  bend/layout geometry — the conduit analog of the `pipe-miter-cut` and
  `pipe-template-wrap` tiles already in this bench. calc-fab is therefore the
  natural cross-trade home for bend/layout math across pipe **and** conduit, and
  reusing it avoids the four extra wiring points a new module needs
  (`build.mjs`, `sw.js` precache, a new size cap, a new declare block). The three
  tiles keep `group: "A"`; calc-fab now hosts both Group G (pipe/fab) and Group A
  (conduit) layout tiles, exactly as `calc-lowvoltage.js` holds Group A tiles in
  a non-matching module.

## 2. Re-wiring (every reference repointed; all gated)

- **`app.js`**: the three conduit ids moved from the `ELECTRICAL_RENDERERS`
  declare list to the `FAB_RENDERERS` declare list.
- **`test/fixtures/compute-map.js`**: the three tiles' `module` path repointed
  from `../../calc-electrical.js` to `../../calc-fab.js`.
- **`test/unit/bounds-fuzzer.test.js`** and **`test/unit/calc-v24-v25.test.js`**:
  the conduit compute-function imports repointed to `../../calc-fab.js` (the
  other functions in those files stay on calc-electrical).
- **`scripts/check-module-sizes.mjs`**: `calc-electrical.js` cap 66000 → 64500 B
  (locks in the relief; now 96.7%), `calc-fab.js` cap 16000 → 20000 B (the bench
  grew into its bend/layout role; now 78.3%). calc-fab is lazy-loaded and not in
  the spec-v10 §H.2 home-view first-paint payload, so its cap bump is safe.
- **v14 corpus** regenerated (the three moved functions' file attribution in
  `docs/derivations.md` changed). `tools-data.js`, `tile-meta.js`,
  `citations.js`, and the worked-example fixtures reference tiles by **id** and
  are group-keyed, so they needed no change.
- `scripts/build.mjs` `FILES` and `sw.js` `SHELL_ASSETS` already list both
  modules; no change (the `check-wiring` and `check-sw-precache` gates confirm).

## 3. As-landed verification

`npm run lint` (every gate; the wiring lint reports **28 renderer modules / 562
tile-id entries**, sw-precache **49 calc-*/support .js entries**, module sizes
both green), `npm test` (5,499 unit tests, including the three conduit unit
tests now importing from calc-fab), `npm run build`, `npm run data:verify`
(123), and the tile-contract sweep (567 tiles, 0 Tier-1 / 0 Tier-2) all green. A
browser smoke-test confirmed the moved tiles (`conduit-offset`,
`conduit-saddle`, `conduit-90-stub`) render correctly from the new module and a
kept electrical tile (`voltage-drop`) still renders from calc-electrical, with
no console errors; the full-catalog responsive sweep (Chromium + WebKit, 320px)
stays clean.

## 4. Roadmap position

This relieves the most-pressed module (electrical 99.3% → 96.7%) so Group A can
grow again, and grows the calc-fab bend/layout bench into its cross-trade role.
The next near-cap modules — `calc-plumbing.js` (98.9%), `tools-data.js` (96.7%,
grows one row per tile), `calc-agriculture.js`, `calc-hvac.js`, `calc-water.js`,
`calc-mechanic.js` — remain on the watch list for the same treatment (a
self-contained-block extraction) as the catalog continues to grow.
