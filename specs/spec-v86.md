# roughlogic.com Specification v86 -- calc-plumbing.js Cap-Relief Split (Onsite-Wastewater / Septic Bench)

> **Implementation status: CLOSED 2026-06-16 (package stamped 0.64.1, a patch;
> catalog holds at 634 tiles, 25 groups; modules 45 -> 46).** v86 inherits
> everything from spec.md through spec-v85.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v82 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** The thirteen-spec v70-v82 cap-relief run
> had restored headroom to every calculator module, which is exactly why the
> v83-v85 expansion could land +10 tiles without a single new module. But v83
> added its three onsite-septic pressure-distribution tiles to
> `calc-plumbing.js`, and that pushed the module to **98.9% of its 53 KB gzip
> cap (52412 B)** -- the tightest calculator module in the repo, and the one
> where the next Group B tile would break the build. Restoring headroom there is
> what keeps onsite-wastewater and the rest of Group B unblocked without another
> cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **onsite-wastewater / septic bench** -- five tiles that together
model the septic side of a building's plumbing, distinct from the supply, DWV,
drainage, and hydronic tiles that stay behind -- is extracted from
`calc-plumbing.js` into a new module `calc-septic.js` (`SEPTIC_RENDERERS`). The
bench spans three eras of the file (the v2 static-tank tile, the v7 drainfield
tile, and the v83 pressure-distribution trio), unified by domain rather than by
contiguity.

| Tile id | Name | Source |
|---|---|---|
| `septic-tank` | Static septic-tank sizing, EPA 150-gpd-per-bedroom rule with a 1000-gal floor and a `>= 2 x daily flow` recommendation | spec-v2 |
| `septic-drainfield` | Soil-absorption (drainfield) area and trench length from the design flow and the code application rate | spec-v7 |
| `septic-dose-tank` | Timed-dose working volume and daily cycle count: net dose = daily flow / doses, pumped-per-cycle = net dose + drainback, and the dose-to-void ratio with a sub-5 flag | spec-v83 |
| `septic-pumpout-interval` | Years between pump-outs = tank x fill fraction / (occupants x per-capita accumulation), loud that a sludge-judge measurement and any mandatory state interval govern | spec-v83 |
| `septic-lpp-orifice` | The orifice-discharge `Q = 19.63 x Cd x d^2 x sqrt(h)` per-orifice flow, total orifice count, and system flow for a low-pressure-pipe or mound lateral | spec-v83 |

**All five KEEP `group: "B"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v82 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside the `./ui-fields.js` helpers it imports
and the per-module **`_finiteGuard`** (copied verbatim, non-exported so it adds
no v14 derivation-corpus row; the helper also remains in `calc-plumbing.js`,
which still uses it for its ~31 other tiles, so the split leaves **no
cross-module import**). The four standard renderers use the plain `ui-fields.js`
names (`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeOutputLine`,
`attachExampleButton`, `fmt`); the v7-era `septic-drainfield` renderer keeps its
aliased `_v7p_` import set (`_V7P_DEB`, `_v7p_debounce`, `_v7p_fmt`,
`_v7p_makeNumber`, `_v7p_attachEx`, `_v7p_makeOut`) verbatim, so its source is
unchanged. The drainfield renderer is the only consumer of the
`./limitation-banner.js` import (`renderLimitationBanner`, `getLimitationCopy`);
it moves with the renderer, and the now-orphaned import is **dropped from
`calc-plumbing.js`**. The septic tiles use no `pure-math.js` import, no
module-local lookup table, and no `makeSelect`/`makeTextarea`/`makeCheckbox`, so
nothing else in `calc-plumbing.js` is affected. The remaining Group B plumbing
tiles (the v1 supply/DWV core, the v2 water-hammer / recirc / trap / tankless
set, the v3 stormwater / Manning / hydrostatic / grease-trap / glycol /
expansion-tank / backflow-loss bench, the v7 water-hammer-surge /
pump-operating-point / pipe-expansion-loop set, the v9 recirc-loop, the v16
water-heater / DWV bench, the v20 thermal-expansion / vent-sizing pair, the v23
trap-seal / water-meter pair, the v26 mixing-valve / well-tank / pipe-velocity
set, and the v61 wsfu-demand / supply-pressure-budget pair) stay in
`calc-plumbing.js`.

## 2. As-landed sizes

- `calc-plumbing.js`: **52412 B -> 48645 B** gzipped; cap lowered 53000 ->
  **52000** to lock in the freed space (now ~93.5% of the new cap).
- `calc-septic.js` (new): **~5.7 KB** gzipped (5741 B); cap **7000** (current +
  ~22% headroom). Lazy-loaded on first open of one of its tiles, so it is **not
  in the home-view first-paint payload** (the spec-v10 §H.2 budget is
  unaffected; it ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the five ids move from the `PLUMBING_RENDERERS` declare to a new
`SEPTIC_RENDERERS` declare for `./calc-septic.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-septic.js`, since the moved functions carry
full `// dims:` annotations); `test/fixtures/compute-map.js` (the five ids ->
`../../calc-septic.js`); `test/unit/bounds-fuzzer.test.js` (the focused imports
for the five moved compute fns and `renderSepticTank` repointed to a new
`../../calc-septic.js` import); `test/unit/calc-plumbing-v2.test.js`
(`computeSepticTank`, `septicTankExample` repointed); `test/unit/calc-plumbing-v7.test.js`
(`computeSepticDrainfield`, `septicDrainfieldExample`, and the renderer-registry
assertion -- `septic-drainfield` now lives in `SEPTIC_RENDERERS`, so the v7
registry test drops it and a new test asserts it in the new module);
`test/unit/cross-tile-invariants.test.js` (the focused `computeSepticTank` /
`computeSepticDrainfield` imports repointed); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **46 modules**; the wiring lint reports **46
renderer modules / 634 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,537 unit tests, unchanged -- the bounds-fuzzer, calc-plumbing-v2,
calc-plumbing-v7, and cross-tile-invariants rows now import the five moved
functions from the new module); `npm run build` (634 tile shells, 25 group
shells, 661-URL sitemap); `npm run data:verify`; the full-catalog render-no-nan
Chromium sweep, the a11y gate, and the 320 px shell-mobile / responsive-stress
sweeps on both Chromium and WebKit (the five moved tiles render identically from
the new module). The moved tiles' pinned worked examples (septic-tank 3 bedrooms
-> 450 gpd / 1000-gal floor; septic-drainfield 600 gpd at 0.6 gpd/ft^2 / 3 ft
-> 1000 ft^2 / 333.3 ft; septic-dose-tank 600 gpd / 4 doses / 5 gal drainback
-> 150 gal net dose; septic-pumpout-interval 1000 gal / 4 people; septic-lpp-orifice
0.25 in / 5 ft / Cd 0.6) re-verify to the digit.

## 5. Roadmap position

v86 is housekeeping, not growth. After it, `calc-plumbing.js` has headroom for
the next Group B tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `tools-data.js`, and
`citations.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-agriculture.js`,
`calc-electrical.js`, and `calc-construction.js` (now among the tightest renderer
modules at ~93-95% of cap). Further catalog growth should be evidence-driven (a
named gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
