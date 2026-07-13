# roughlogic.com Specification v645 -- Consolidation Degree from Elapsed Time (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, construction/geotech), no new module, group, or dependency. Inherits spec.md through spec-v644.md.
>
> **The gap, and the evidence for it.** The `consolidation-time-rate` tile (spec-v414) computes the *time* to
> reach a target degree of consolidation U from Terzaghi's time factor. The field/monitoring question is the
> reverse: "the surcharge has been down 200 days -- how consolidated is it *now*?" That is the same Terzaghi
> series inverted for U given the elapsed time, `Tv = cv t / Hdr^2`, then the two-branch `U(Tv)`. Every constant
> (`pi/4`, `1.781`, `0.933`) already lives in the sibling's code, so this is a pure algebraic inversion of an
> equation already in the repo. The pinned example: `cv = 0.1 ft^2/day`, `Hdr = 10 ft`, `t = 848 days` gives
> `Tv = 0.848` and **U = 90%** -- exactly the sibling's own worked example, run the other way.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Mirroring the sibling's
dimensional convention, `cv_ft2_day` and `t_days` are `dimensionless` and `hdr_ft` is `L`; the outputs `tv` and
`u_percent` are `dimensionless`. The Terzaghi series constants are the same ones `consolidation-time-rate` already
uses. The v18/v21 contract: any non-finite input, or a non-positive `cv`, `Hdr`, or elapsed time, returns
`{ error }`. Citation discipline (v19/v22): the Terzaghi time factor inverted for U, by name; the note states that
**Tv = cv t / Hdr^2, U = 100 sqrt(4 Tv/pi) for Tv <= 0.283 (U <= 60%) and 100 - 10^((1.781 - Tv)/0.933) above, Hdr
is the longest drainage path (full layer single, half double), and U approaches 100% asymptotically** -- a design
aid, not a substitute for the engineer of record.

## 2. The tile

### 2.1 `consolidation-degree` -- The Degree of Consolidation Reached After a Given Time

```
inputs:
  cv_ft2_day   ft^2/day   coefficient of consolidation (> 0)
  hdr_ft       ft         longest drainage path (> 0; full layer single, half double)
  t_days       days       elapsed time (> 0)

Tv = cv_ft2_day x t_days / hdr_ft^2
U  = 100 sqrt(4 Tv / pi)                     for Tv <= (pi/4)(0.6)^2 = 0.283   (U <= 60%)
U  = 100 - 10^((1.781 - Tv)/0.933)           for Tv > 0.283                     (60% < U < 100%)
```

**Pinned worked example.** `cv = 0.1, Hdr = 10, t = 848 days`: `Tv = 0.1 x 848 / 100 = 0.848 > 0.283`, so
`U = 100 - 10^((1.781 - 0.848)/0.933) = 100 - 10^1.000 = ` **90%**.
**Cross-check (lower branch).** At `t = 196 days`: `Tv = 0.196 <= 0.283`, so `U = 100 sqrt(4 x 0.196 / pi) = `
**~50%** -- the decelerating curve, the same layer half-consolidated in under a quarter of the 90% time.
**Cross-check (exact inverse of the time tile).** The fuzzer feeds U = 40, 60, 90 through the forward
`consolidation-time-rate` to get the time, then recovers the same U here to 1e-6 across both branches.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `consolidation-time-rate`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Terzaghi inverted for U, Das, the note per §1); `test/fixtures/worked-
examples.json` (the pinned example plus the lower-branch cross-check); `test/fixtures/compute-map.js`
(`consolidation-degree` -> `computeConsolidationDegree`); `scripts/related-tiles.mjs` (<-> `consolidation-time-
rate`, the settlement tiles); `data/search/aliases.json` ("consolidation degree", "degree of consolidation", "how
consolidated is my fill", plus question rows, all collision-checked); `GEOTECH_RENDERERS["consolidation-degree"]`
via the `_simpleRenderer` factory (field DOM ids = the input keys) and the id added to the calc-geotech declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, both branches, the exact inverse round-trip through
`computeConsolidationTimeRate` at U = 40/60/90, the sub-100% asymptote, and the error seams. The two `index.html`
home-count spots go 1,093 -> 1,094 (check-readme-counts gates them). The calc-geotech.js gzip cap is expected to
hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Tv 0.848, U 90%).

## 5. Roadmap position

Completes the consolidation pair: `consolidation-time-rate` (target U -> time) and now `consolidation-degree`
(elapsed time -> U), exact inverses through the same Terzaghi series. Further Group E growth stays evidence-driven.
