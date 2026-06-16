# roughlogic.com Specification v76 -- calc-mechanic.js Cap-Relief Split (Machining Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.7, a patch;
> catalog holds at 624 tiles, 25 groups; modules 38 -> 39).** v76 inherits
> everything from spec.md through spec-v75.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v75 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v75 relieved `calc-water.js`, the
> standing module-cap watch (spec-v75 §5) named `calc-mechanic.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **95.6% of its 19.5 KB gzip cap (18633 B)**. Restoring headroom is
> what keeps the next Group K mechanic/machining tile unblocked without another
> cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **machining bench** -- two contiguous, self-contained tiles that sit
at the very end of the source file -- is extracted from `calc-mechanic.js` into a
new module `calc-machining.js` (`MACHINING_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `cutting-speed-rpm` | Machining Speed and Feed (spindle `RPM = 12 x SFM / (pi x diameter)`; feed `IPM = RPM x flutes x chip load`) | spec-v31 K.4 |
| `drill-point-depth` | Drill Point Depth / Tip Allowance (`point length = (diameter / 2) / tan(point angle / 2)`) | spec-v34 K.5 |

**Both KEEP `group: "K"`** -- a tile's group letter is independent of the module
that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 / spec-v70
.. spec-v75 precedent). Their ids, citations, worked examples, dimensional
annotations, and behavior are byte-for-byte unchanged. The cut is clean: the
bench reaches nothing outside its **own scoped `./ui-fields.js` import block**
(`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeOutputLine`, `attachExampleButton`,
`fmt`) and the per-module **`_finiteGuard`** -- which is copied verbatim into the
new module (non-exported, so it adds no v14 derivation-corpus row), exactly as the
v72/v73 benches did. The moved compute functions are verbatim. The remaining
Group K tiles (the v4 auto/marine/aviation core -- weight-balance, prop-slip,
displacement-cr, bolt-stretch, driveshaft-crit, fuel-range, tire-gearing,
brake-pad-life -- and the v20/v23 valve-flow-coefficient, screw-conveyor,
hp-from-torque, volumetric-efficiency, gear-mph-rpm bench) stay in
`calc-mechanic.js`.

## 2. As-landed sizes

- `calc-mechanic.js`: **18633 B -> 16808 B** gzipped; cap lowered 19500 ->
  **18000** to lock in the freed space (now ~93.4% of the new cap).
- `calc-machining.js` (new): **~3.1 KB** (3076 B) gzipped; cap **4000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in the
  home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected; it
  ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the two ids move from the `MECHANIC_RENDERERS` declare to a new
`MACHINING_RENDERERS` declare for `./calc-machining.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-machining.js`, since the moved functions carry
full dimensional annotations); `test/fixtures/compute-map.js` (the two ids ->
`../../calc-machining.js`); `test/unit/bounds-fuzzer.test.js` (the focused
two-compute-fn import repointed); `test/unit/calc-mechanic.test.js` (the two
compute-fn imports and the renderer-presence assertion repointed to the new
module's `MACHINING_RENDERERS`); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The moved tiles use no `makeTextarea`
field, so `scripts/check-multiline-inputs.mjs` needs no attribution update. The
README catalog-count gate (`check-readme-counts`) agrees at **39 modules**; the
wiring lint reports **39 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer and `calc-mechanic`
rows now import the two moved functions from the new module); `npm run build`
(624 tile shells, 25 group shells, regenerated sitemap); `npm run data:verify`;
the full-catalog render-no-nan Chromium sweep, the a11y gate, and the 320 px
shell-mobile / responsive-stress sweeps on both Chromium and WebKit (the two
moved tiles render identically from the new module). The moved tiles' pinned
worked examples (cutting-speed-rpm 100 SFM x 0.5 in dia -> 763.94 RPM, 2 flutes x
0.002 in chip load -> 3.056 IPM; drill-point-depth 0.5 in dia at a 118-degree
point -> 0.1502 in point length, 1.1502 in tip depth to a 1.0 in full depth)
re-verify to the digit.

## 5. Roadmap position

v76 is housekeeping, not growth. After it, `calc-mechanic.js` has headroom for the
next Group K tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-restoration.js`,
`calc-plumbing.js`, and `calc-electrical.js` (now among the tightest renderer
modules at ~95% of cap). Further catalog growth should be evidence-driven (a
named gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
