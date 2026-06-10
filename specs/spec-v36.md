# roughlogic.com Specification v36 — calc-cross.js Module Split (Housekeeping)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.36.1, a patch).**
> v36 is a **platform-only / housekeeping** spec in the spirit of spec-v10. It
> inherits everything from spec.md through spec-v35.md, **adds no tiles, removes
> no tiles, and changes no calculator output**. The catalog stays at **560
> tiles**; only the on-disk module layout changes.
>
> **The problem.** `calc-cross.js` (Group G, Cross-Trade Utilities) had grown to
> ~39.6 KB gzipped, 96.6% of its 41 KB cap, after the v26–v33 additions. Its cap
> comment had flagged a per-tile split as the preferred long-term remediation
> since v26. Three other modules (`calc-mechanic.js`, `calc-agriculture.js`,
> `tools-data.js`) are also near cap; the cap pressure had become systemic, and
> continued cap-bumping was deferring the real fix.
>
> **The change.** The spec-v26+ block of `calc-cross.js` — eight cohesive,
> self-contained fabrication / layout tiles — is extracted into a new module
> `calc-fab.js` (Fabrication & Layout bench). The moved tiles:
> `pipe-fitting-takeout`, `pipe-miter-cut`, `pipe-template-wrap`,
> `flange-bolt-torque` (the spec-v26 pipefitter's bench), `center-of-gravity-
> 2point` (the spec-v27 rigger's bench), `bolt-circle` (spec-v32), and
> `decimal-to-fraction` (spec-v33). All remain **Group G** tiles (a tile's group
> letter is independent of its module — the spec-v28 precedent); their ids,
> citations, worked examples, and behavior are byte-for-byte unchanged.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. What moved and what stayed

- **Moved to `calc-fab.js`** (with their renderers and local helpers
  `_V26_UNC_TENSILE_AREA` / `_V26_8UN_TENSILE_AREA` / `_V26_CROSS_SEQ` /
  `_bcGcd`): the seven exported compute functions and seven renderers above,
  populating a new `FAB_RENDERERS` map. The module imports the same ui-fields
  helpers and carries its own copy of the non-exported `_finiteGuard`.
- **Stayed in `calc-cross.js`**: the v1–v15 general utilities (unit-converter,
  geometry, haversine, the v3 OSHA/ergonomics pack, the v15 pump/hydraulic/
  V-belt/gear set) and `rolling-offset` (v24), with the `CROSS_RENDERERS` map.

After the split: `calc-cross.js` is ~31 KB (86% of a lowered 36 KB cap, headroom
restored) and `calc-fab.js` is ~9.8 KB (62% of a 16 KB cap).

## 2. Re-wiring (every reference repointed; all gated)

- **`app.js`**: the `CROSS_RENDERERS` declare list lost the seven moved ids; a
  new `declare("./calc-fab.js", "FAB_RENDERERS", [...])` block carries them.
- **`scripts/build.mjs`** `FILES` and **`sw.js`** `SHELL_ASSETS`: `calc-fab.js`
  added (the `check-sw-precache` and `check-wiring` gates enforce both).
- **`scripts/check-module-sizes.mjs`**: `calc-cross.js` cap 41 KB → 36 KB; new
  `calc-fab.js` cap 16 KB.
- **`test/fixtures/compute-map.js`**, **`test/unit/bounds-fuzzer.test.js`**,
  **`test/unit/calc-v26.test.js`**, **`test/unit/calc-v27.test.js`**: the seven
  moved compute functions repointed from `../../calc-cross.js` to
  `../../calc-fab.js` (rolling-offset and the v7–v15 functions stay on
  calc-cross).
- **v14 corpus + tile-index** regenerated (the moved functions' file attribution
  in `docs/derivations.md` changed).

## 3. As-landed verification

`npm run lint` (every gate; the wiring lint reports **28 renderer modules / 560
tile-id entries**, sw-precache **49 calc-*/support .js entries**), `npm test`
(5,497 unit tests), `npm run build`, `npm run data:verify` (123), `check:dist`,
`check:shells`, and the 320px shell audit all green. A browser smoke-test
confirmed the moved tiles (`flange-bolt-torque`, `bolt-circle`,
`decimal-to-fraction`) render correctly from the new module and the kept tiles
(`rolling-offset`, `pump-tdh`) still render from calc-cross, with no console
errors.

## 4. Roadmap position

This relieves the most-pressed module so Group G can grow again. The remaining
near-cap modules (`calc-mechanic.js`, `calc-agriculture.js`) and the
`tools-data.js` registry (which grows one row per tile) remain on the watch
list for the same treatment as the catalog continues to grow.
