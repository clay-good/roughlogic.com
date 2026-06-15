# roughlogic.com Specification v73 -- calc-plumbing.js Cap-Relief Split (Storm-Drainage Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.4, a patch;
> catalog holds at 624 tiles, 25 groups; modules 35 -> 36).** v73 inherits
> everything from spec.md through spec-v72.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70, spec-v71,
> and spec-v72 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk
> module layout changes.
>
> **The gap, and the evidence for it.** After v72 relieved `calc-electrical.js`,
> the standing module-cap watch (spec-v72 §5) named `calc-plumbing.js` as the
> next calc-module split candidate. It was the tightest remaining calculator
> module in the repo at **96.2% of its 60 KB gzip cap (57722 B)**. Restoring
> headroom is what keeps the next Group B plumbing tile unblocked without
> another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v62 storm-drainage bench** -- two contiguous, self-contained
tiles -- is extracted from `calc-plumbing.js` into a new module
`calc-drainage.js` (`DRAINAGE_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `roof-drain-sizing` | Roof Area to Storm GPM and Leader Size (IPC 1106 capacity tables) | spec-v62 |
| `sump-basin-sizing` | Basin Drawdown and Pump-Cycle Check (IPC 712 sumps and ejectors) | spec-v62 |

**Both KEEP `group: "B"`** -- a tile's group letter is independent of the module
that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 / spec-v71 / spec-v72 precedent). Their ids, citations, worked
examples, dimensional annotations, and behavior are byte-for-byte unchanged. The
cut is clean: the bench owns its IPC 1106 capacity tables (`ROOF_LEADER_TABLE`,
`ROOF_HORIZ_TABLE`, `ROOF_SLOPE_COL`) and its `_roofMonotonic` / `_roofSmallestPipe`
helpers, imports its own UI helpers from `./ui-fields.js`, and reaches nothing
outside it but the per-module `_finiteGuard` (copied into the new module,
non-exported, no v14 derivation-corpus row). The remaining Group B plumbing tiles
(including the spec-v63/v64 benches that followed it in the source) stay in
`calc-plumbing.js`.

## 2. As-landed sizes

- `calc-plumbing.js`: **57722 B -> 54531 B** gzipped (the dist measurement);
  cap lowered 60000 -> **57500** to lock in the headroom (now ~95%).
- `calc-drainage.js` (new): **~4.5 KB** (4477 B) gzipped; cap **6000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in
  the home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected).

## 3. Wiring repointed (every reference gated)

`app.js` (the two ids move from the `PLUMBING_RENDERERS` declare to a new
`DRAINAGE_RENDERERS` declare for `./calc-drainage.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-drainage.js`, since the moved functions carry
full dimensional annotations); `test/fixtures/compute-map.js` (the two ids ->
`../../calc-drainage.js`); `test/unit/bounds-fuzzer.test.js` (the two compute-fn
imports repointed); and the regenerated v14 corpus (`docs/derivations.md` -- the
moved functions change file attribution; the tile-index is tile-id-keyed and
unchanged). `tools-data.js`, `tile-meta.js`, `citations.js`,
`test/fixtures/worked-examples.json`, and `scripts/related-tiles.mjs` reference
tiles by **id** (group-keyed, not module-keyed) and need **no change**. The
moved tiles use no `makeTextarea` field, so `scripts/check-multiline-inputs.mjs`
needs no attribution update. The README catalog-count gate (`check-readme-counts`)
agrees at **36 modules**; the wiring lint reports **36 renderer modules / 624
tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the two bounds-fuzzer rows now import
from the new module); `npm run build` (624 tile shells, 25 group shells,
regenerated sitemap); `npm run data:verify`; the full-catalog render-no-nan
Chromium sweep, the a11y gate, and the 320 px shell-mobile / responsive-stress
sweeps on both Chromium and WebKit (the two moved tiles render identically from
the new module). The moved tiles' pinned worked examples (roof-drain-sizing
5000 ft^2 at 4 in/hr, 1/4 in/ft -> 208.0 GPM; sump-basin-sizing 24 in basin,
12 in band, 10 GPM in / 30 GPM pump -> 23.5 gal drawdown, 70.5 s run) re-verify
to the digit.

## 5. Roadmap position

v73 is housekeeping, not growth. After it, `calc-plumbing.js` has headroom for
the active Group B bench again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and `calc-hvac.js` (the next calc-module split candidate, now
the tightest renderer module). Further catalog growth should be evidence-driven
(a named gap a working tradesperson hits), not catalog-filling, per the spec-v69
§5 guidance.
