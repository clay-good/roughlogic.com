# roughlogic.com Specification v70 -- calc-construction.js Cap-Relief Split (Earthwork Module)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.1, a patch;
> catalog holds at 624 tiles, 25 groups; modules 32 -> 33).** v70 inherits
> everything from spec.md through spec-v69.md and changes none of it. It is a
> platform-only / housekeeping spec in the spirit of spec-v10, spec-v36, and
> spec-v39: it **adds no tiles, removes no tiles, and changes no calculator
> output** -- only the on-disk module layout changes.
>
> **The gap, and the evidence for it.** After the v62-v69 dirty-jobs expansion,
> `calc-construction.js` had grown to **68.3 KB gzipped -- 97.6% of its 70 KB
> cap** (the v69 close had already bumped that cap 67000 -> 70000). It was the
> most cap-pressured calculator module in the repo and one of eight `calc-*`
> modules over 95%; continued cap-bumping defers the real fix its own cap
> comment has flagged since v30 ("per-tile split is the preferred long-term
> remediation for this module"). Group E (Carpentry and Construction) is one of
> the most actively-deepened benches (v67 earthwork and v69 coatings both landed
> here), so restoring headroom is what unblocks the next evidence-driven Group E
> tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v67 earthwork / excavation production bench** -- five
contiguous, self-contained tiles -- is extracted from `calc-construction.js`
into a new module `calc-earthwork.js` (`EARTHWORK_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `soil-swell-shrink` | Bank / Loose / Compacted Volume Conversion | spec-v67 |
| `haul-cycle-production` | Truck/Loader Haul-Cycle Production and Fleet Match | spec-v67 |
| `dewatering-rate` | Excavation Dewatering Pump Rate | spec-v67 |
| `spoil-setback` | Spoil Pile Setback and Surcharge (OSHA 1926.651) | spec-v67 |
| `pipe-bedding-backfill` | Trench Bedding / Embedment / Backfill (ASTM D2321) | spec-v67 |

**All five KEEP `group: "E"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 precedent).
Their ids, citations, worked examples, dimensional annotations, and behavior are
byte-for-byte unchanged. The v25 earthwork tiles (`earthwork-end-area`,
`slope-stake-cut-fill`) and the v25 civil-curve tiles remain in
`calc-construction.js` (the `fillet-weld-strength` welding tile sits between them
and the v67 block, so a single clean contiguous cut takes only the v67 bench;
consolidating the rest is a future split if the module fills again).

## 2. As-landed sizes

- `calc-construction.js`: **68.3 KB -> 62.7 KB** gzipped; cap lowered 70000 ->
  **66000** to lock in the headroom (now ~95%).
- `calc-earthwork.js` (new): **~7.0 KB** gzipped; cap **8500** (current + ~20%
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in
  the home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected).

## 3. Wiring repointed (every reference gated)

`app.js` (the five ids move from the `CONSTRUCTION_RENDERERS` declare to a new
`EARTHWORK_RENDERERS` declare for `./calc-earthwork.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `test/fixtures/compute-map.js` (the
five ids -> `../../calc-earthwork.js`); `test/unit/bounds-fuzzer.test.js` (the
five compute-fn imports repointed); and the regenerated v14 corpus (the moved
functions change file attribution; the tile-index is tile-id-keyed and unchanged).
`tools-data.js`, `tile-meta.js`, `citations.js`, `test/fixtures/worked-examples.json`,
and `scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **33 modules**; the wiring lint reports
**33 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, corpus, and README-count gates); `npm test` (5,534 unit
tests, unchanged -- the bounds-fuzzer block now imports from the new module);
`npm run build` (624 tile shells, 25 group shells, regenerated sitemap);
`npm run data:verify`; the full-catalog render-no-nan Chromium sweep, the a11y
gate, and the 320 px shell-mobile / responsive-stress sweeps on both Chromium and
WebKit (the five moved tiles render identically from the new module). The five
moved tiles' pinned worked examples (soil-swell-shrink 100 bank @ 25% swell /
15% shrink -> 125 loose / 0.80 LF / 85 compacted, etc.) re-verify to the digit.

## 5. Roadmap position

v70 is housekeeping, not growth. After it, `calc-construction.js` has headroom
for the active Group E bench again. The standing module-cap watch continues on
the next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and `calc-field.js`, `calc-electrical.js`, `calc-plumbing.js`,
`calc-hvac.js` (the next calc-module split candidates). Further catalog growth
should be evidence-driven (a named gap a working tradesperson hits), not
catalog-filling, per the spec-v69 §5 guidance.
