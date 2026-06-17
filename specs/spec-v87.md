# roughlogic.com Specification v87 -- calc-agriculture.js Cap-Relief Split (Tree-Care / Arborist Bench)

> **Implementation status: CLOSED 2026-06-16 (package stamped 0.64.2, a patch;
> catalog holds at 634 tiles, 25 groups; modules 46 -> 47).** v87 inherits
> everything from spec.md through spec-v86.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v86 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk
> module layout changes.
>
> **The gap, and the evidence for it.** After the v83-v85 expansion and the
> v86 calc-plumbing split, `calc-agriculture.js` was the tightest remaining
> calculator module at **95.1% of its 37 KB gzip cap (35200 B)** -- the named
> next renderer-split candidate in the spec-v86 §5 roadmap. Restoring headroom
> there keeps Group L unblocked for the next evidence-driven agriculture or
> forestry tile without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **tree-care / arborist-rigging bench** -- five tiles that model
the tree-removal and rigging side of Group L, distinct from the crop, soil,
irrigation, livestock, forestry-cruise, and sprayer tiles that stay behind --
is extracted from `calc-agriculture.js` into a new module `calc-arborist.js`
(`ARBORIST_RENDERERS`). The bench is the contiguous spec-v68 block, unified by
domain (the chainsaw-and-rope side of the trade) rather than by spec era.

| Tile id | Name | Source |
|---|---|---|
| `log-limb-weight` | Green log / limb weight: frustum volume times a bundled USDA FPL green density by species | spec-v68 |
| `tree-rigging-shock` | Dynamic (shock) load on a rigging point: `peak = static x (1 + sqrt(1 + 2 x drop / rope stretch))` | spec-v68 |
| `felling-notch-hinge` | Open-face felling notch and hinge geometry per ANSI Z133-2017 (notch depth, hinge thickness ~10%, hinge width ~80%) | spec-v68 |
| `porta-wrap-friction` | Friction-device hold force by wrap count, the capstan / Euler-Eytelwein relation `hold = load x exp(-mu x wraps x 2pi)` | spec-v68 |
| `chipper-debris` | Brush chip loose volume and haul-load count from green weight and chip bulk density | spec-v68 |

**All five KEEP `group: "L"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v86 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside the `./ui-fields.js` helpers it imports
(`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeSelect`, `makeOutputLine`,
`attachExampleButton`, `fmt`) and the per-module **`_finiteGuard`** (copied
verbatim, non-exported so it adds no v14 derivation-corpus row; the helper also
remains in `calc-agriculture.js`, which still uses it for its ~21 other tiles, so
the split leaves **no cross-module import**). The `log-limb-weight` tile owns its
module-local `GREEN_DENSITY` species table, which moves with it (no other tile
reads it). The bench uses no `pure-math.js` import, no `./limitation-banner.js`
import, and no `makeText`/`makeCheckbox`/`makeTextarea`, so nothing else in
`calc-agriculture.js` is affected. The remaining Group L tiles (the v4 chemical-
application / timber-cruise / seed-rate / drawbar / uniformity / bulk-density /
crop-yield core, the v9 THI / sprayer-calibration pair, the v17 irrigation /
stocking / grain-bin / NPK / tank-mix set, the v20 GDD / Pearson-square /
livestock-water trio, the v23 pesticide REI/PHI tile, the v35 two-stroke-mix
tile, and the v84 sprayer nozzle / drift / field-capacity bench) stay in
`calc-agriculture.js`.

## 2. As-landed sizes

- `calc-agriculture.js`: **35200 B -> 30024 B** gzipped; cap lowered 37000 ->
  **32000** to lock in the freed space (now ~93.8% of the new cap).
- `calc-arborist.js` (new): **~6.7 KB** gzipped (6687 B); cap **8000** (current +
  ~19% headroom). Lazy-loaded on first open of one of its tiles, so it is **not
  in the home-view first-paint payload** (the spec-v10 §H.2 budget is
  unaffected; it ticks only from the `app.js` declare change, 38388 B -> 38491 B,
  37.5% -> 37.6% of the 100 KB budget).

## 3. Wiring repointed (every reference gated)

`app.js` (the five ids move from the `AGRICULTURE_RENDERERS` declare to a new
`ARBORIST_RENDERERS` declare for `./calc-arborist.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-arborist.js`, since the moved functions carry
full `// dims:` annotations); `test/fixtures/compute-map.js` (the five ids ->
`../../calc-arborist.js`); `test/unit/bounds-fuzzer.test.js` (the focused import
for the five moved compute fns repointed to a new `../../calc-arborist.js`
import); and the regenerated v14 corpus (`docs/derivations.md` -- the moved
functions change file attribution; the tile-index is tile-id-keyed and
unchanged). `tools-data.js`, `tile-meta.js`, `citations.js`,
`test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **47 modules**; the wiring lint reports **47
renderer modules / 634 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,538 unit tests, unchanged -- the bounds-fuzzer row now imports the
five moved functions from the new module); `npm run build` (634 tile shells, 25
group shells, 661-URL sitemap; 865 dist files, +1 for the new module);
`npm run data:verify`; the full-catalog render-no-nan Chromium sweep, the a11y
gate, and the 320 px shell-mobile / responsive-stress sweeps on both Chromium and
WebKit (the five moved tiles render identically from the new module). The moved
tiles' pinned worked examples (log-limb-weight 16/16 in red oak 8 ft -> 11.17
ft^3 / 715 lb; tree-rigging-shock 500 lb / 3 ft drop / 30 ft rope / 5% -> peak
1618 lb / 3.24x; felling-notch-hinge 20 in / 22% / 70 deg -> 4.40 in notch, 2.00 in
hinge, 16.00 in width; porta-wrap-friction 800 lb / mu 0.20 / 3 wraps -> 18.46 lb
hand force; chipper-debris 4400 lb / 550 lcy / 15 cy -> 8.0 loose cy / 1 load)
re-verify to the digit.

## 5. Roadmap position

v87 is housekeeping, not growth. After it, `calc-agriculture.js` has headroom for
the next Group L tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `citations.js` (~98.8% of cap) and
`tools-data.js` (~97.8%), the flat per-tile registries relieved by documented cap
bumps when a tile lands, and the next calc-module split candidates
`calc-construction.js`, `calc-cross.js`, and `calc-electrical.js` (now among the
tightest renderer modules at ~93-95% of cap). Further catalog growth should be
evidence-driven (a named gap a working tradesperson hits), not catalog-filling,
per the spec-v69 §5 guidance.
