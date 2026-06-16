# roughlogic.com Specification v75 -- calc-water.js Cap-Relief Split (Treatment Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.6, a patch;
> catalog holds at 624 tiles, 25 groups; modules 37 -> 38).** v75 inherits
> everything from spec.md through spec-v74.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70, spec-v71,
> spec-v72, spec-v73, and spec-v74 (and spec-v10, spec-v36, spec-v39, spec-v42):
> it **adds no tiles, removes no tiles, and changes no calculator output** -- only
> the on-disk module layout changes.
>
> **The gap, and the evidence for it.** After v74 relieved `calc-hvac.js`, the
> standing module-cap watch (spec-v74 §5) named `calc-water.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **95.8% of its 23.5 KB gzip cap (22522 B)**. Restoring headroom is
> what keeps the next Group M water/wastewater tile unblocked without another cap
> bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v20 Phase M bench** -- three contiguous, self-contained tiles
that sit at the very end of the source file -- is extracted from `calc-water.js`
into a new module `calc-treatment.js` (`TREATMENT_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `weir-flow` | Weir / Flume Open-Channel Flow (USBR V-notch and Francis rectangular equations) | spec-v20 M.1 |
| `langelier-index` | Langelier Saturation Index (water-stabilization tendency per Standard Methods) | spec-v20 M.2 |
| `chemical-feed-pump` | Chemical Metering-Pump Setting (AWWA pounds-formula -> % / GPD / mL per min) | spec-v20 M.3 |

**All three KEEP `group: "M"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 / spec-v71 / spec-v72 / spec-v73 / spec-v74 precedent). Their ids,
citations, worked examples, dimensional annotations, and behavior are
byte-for-byte unchanged. The cut is clean: the bench reaches nothing outside its
**own scoped `./ui-fields.js` import block** (`DEBOUNCE_MS`, `debounce`,
`makeNumber`, `makeSelect`, `makeOutputLine`, `attachExampleButton`, `fmt`) and,
unlike the v72/v73 benches, **never calls `_finiteGuard`** -- each compute
function does its own positive/finite guards inline -- so no guard helper is
copied and the moved code is verbatim. The remaining Group M tiles (the
pounds-formula / filter-loading / detention-time core, the v8/v9 coagulant /
SVI / disinfection bench, the v16 pool/well/cooling/chlorine bench, and the v23
`backflow-test-psi` tile) stay in `calc-water.js`.

## 2. As-landed sizes

- `calc-water.js`: **22522 B -> 19039 B** gzipped (the dist measurement); cap
  lowered 23500 -> **21000** to lock in the freed space and clear the WARN (now
  ~90.7% of the new cap).
- `calc-treatment.js` (new): **~4.6 KB** (4636 B) gzipped; cap **6000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in the
  home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected; it
  ticks 37467 B -> 37572 B only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the three ids move from the `WATER_RENDERERS` declare to a new
`TREATMENT_RENDERERS` declare for `./calc-treatment.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-treatment.js`, since the moved functions carry
full dimensional annotations); `test/fixtures/compute-map.js` (the three ids ->
`../../calc-treatment.js`); `test/unit/bounds-fuzzer.test.js` (the focused
three-compute-fn import repointed); `test/unit/calc-v20.test.js` (the three
compute-fn imports repointed); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The moved tiles use no `makeTextarea`
field, so `scripts/check-multiline-inputs.mjs` needs no attribution update. The
README catalog-count gate (`check-readme-counts`) agrees at **38 modules**; the
wiring lint reports **38 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer and `calc-v20` rows
now import from the new module); `npm run build` (624 tile shells, 25 group
shells, regenerated sitemap); `npm run data:verify`; the full-catalog
render-no-nan Chromium sweep, the a11y gate, and the 320 px shell-mobile /
responsive-stress sweeps on both Chromium and WebKit (the three moved tiles
render identically from the new module). The moved tiles' pinned worked examples
(weir-flow 90-degree V-notch at H = 0.5 ft -> Q = 2.49 x 0.5^2.48 ~ 0.45 cfs ~ 200
GPM; langelier-index pH 7.5 / 25 C / Ca 200 / alkalinity 150 / TDS 320 -> a finite
LSI with pHs; chemical-feed-pump 0.5 MGD x 8 mg/L of 12.5% NaOCl at SG 1.16 into a
50 GPD pump -> a positive % setting) re-verify to the digit.

## 5. Roadmap position

v75 is housekeeping, not growth. After it, `calc-water.js` has headroom for the
next Group M tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-mechanic.js`,
`calc-restoration.js`, and `calc-stage.js` (now among the tightest renderer
modules at ~93-95% of cap). Further catalog growth should be evidence-driven (a
named gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
