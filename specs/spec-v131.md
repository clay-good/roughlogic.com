# roughlogic.com Specification v131 -- Transverse Weld Shrinkage and Pre-Set Allowance (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v129..v135.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fabrication tile from the published Blodgett transverse-
> shrinkage relation, fabricator-and-mock-up governed, redo-not-harm. Adds one tile to
> **`calc-fab.js`** (Group E); no new module, group, or dependency. Inherits spec.md through
> spec-v130.md.
>
> **The gap, and the evidence for it.** The catalog computes heat input, deposit volume, and weld
> strength, but never the dimension that ruins a fit-up: how far the work pulls in transversely as a
> weld cools. The transverse component is the predictable one (Blodgett's weld-area-over-thickness
> relation), and knowing it lets a fabricator pre-set the parts apart so the assembly cools to size.
> No tile estimates it; on the floor it is guessed or learned by scrapping a part.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Weld cross-section is `L^2`, plate thickness and the resulting shrinkage are `L`, and the weld
count is `dimensionless`; the bundled 0.2 Blodgett coefficient is dimensionless (weld-area-over-
thickness already carries the length) and is an annotated editable field. The v18/v21 contract: any
non-finite input, a non-positive weld area or thickness, or a weld count below 1, returns
`{ error }`; the only division is by a guarded-positive thickness. Citation discipline (v19/v22):
`GOVERNANCE.general` over the Blodgett transverse-shrinkage relation `shrink = 0.2 x A_w / t`, by
name; the joint restraint, fixturing, sequence, and a mock-up govern the actual movement -- this is
a screen, and longitudinal and angular distortion (restraint-dominated) are out of scope.

## 2. The tile

### 2.1 `weld-transverse-shrinkage` -- Blodgett Transverse Shrinkage and Pre-Set

```
inputs:
  weld_area_in2     L^2            weld cross-sectional area (from weld-metal-volume)
  thickness_in      L              plate thickness across the joint
  weld_count        dimensionless  parallel weld lines pulling the same dimension (default 1)

shrink_per_weld_in = 0.2 x weld_area_in2 / thickness_in
total_shrink_in    = shrink_per_weld_in x weld_count
recommended_preset_in = total_shrink_in      # set the parts apart / pre-bow by this
```

**Pinned worked example.** A butt weld of cross-section 0.10 in^2 in 1/2 in (0.5) plate:
`shrink_per_weld = 0.2 x 0.10 / 0.5 = 0.040 in`. Across an assembly crossed by 3 such welds:
`total = 0.040 x 3 = 0.120 in` -> lay the parts out 0.120 in wide so they cool to size.
**Cross-check (thicker plate restrains).** The same 0.10 in^2 weld in 1 in plate:
`shrink = 0.2 x 0.10 / 1.0 = 0.020 in` -- half the shrinkage, the expected effect of the thicker,
stiffer section. Restraint, sequence, and a mock-up govern; longitudinal and angular distortion are
not estimated here.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding", "fabrication"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the Blodgett transverse-shrinkage formula and
the 0.2 coefficient, `editionNote` noting Blodgett "Design of Welded Structures" by name, the
screen scope, and the out-of-scope longitudinal/angular components); `test/fixtures/worked-
examples.json` (example + cross-check); `test/fixtures/compute-map.js` (`weld-transverse-shrinkage`
-> `computeWeldTransverseShrinkage` in `../../calc-fab.js`); `scripts/related-tiles.mjs` (->
`weld-metal-volume` / `weld-heat-input` / `metal-weight`); `data/search/aliases.json` ("weld
shrinkage", "distortion", "transverse shrinkage", "weld pull", "pre-set", "blodgett"); the id
appended to the existing `FAB_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error
seams (non-finite, area/thickness <= 0, weld_count < 1). Raise the `calc-fab.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-weld and total-
shrinkage lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (0.10 in^2 /
0.5 in -> 0.040 in per weld, 0.120 in over 3).

## 5. Roadmap position

Adds the fit-up consequence to the weld-estimating family (deposit v129, deposition v130). Further
Group E growth stays evidence-driven.
