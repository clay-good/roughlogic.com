# roughlogic.com Specification v137 -- Trapped Ceiling-Cavity Water Load and Collapse Screen (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 620, package 0.75.0). Batch spec-v136..v140.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration safety screen for the bulging, water-filled
> ceiling a tech meets before any drying starts. Adds one tile to **`calc-restoration.js`** (Group
> D); no new module, group, or dependency. Inherits spec.md through spec-v136.md.
>
> **The gap, and the evidence for it.** The catalog's `standing-water` tile gives the gallons and
> weight of water on the **floor** to extract. It says nothing about water trapped **overhead** in a
> sagging ceiling cavity, which is the hazard that hurts people: a saturated gypsum ceiling fails at
> its fasteners well below any structural rating and drops its whole load at once. The load is a clean
> function of depth -- a foot of water is 62.4 lb over every square foot, so an inch is 5.2 psf -- and
> wet gypsum board carries only a few psf before the screws let go. No tile turns the visible bulge
> into the weight overhead and the drain-before-you-enter call.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
pooled plan area is `L^2`, the trapped depth is `L`, the resulting distributed load is `M/L^2`
(lb/ft^2), the total trapped weight is `M`, and the volume is `L^3` (reported in gallons). The
62.4 lb/ft^3 and 8.34 lb/gal water densities and 7.48 gal/ft^3 are dimensioned constants drawn from
`pure-math.js` convention. The v18/v21 contract: any non-finite input, or a non-positive area or
depth, returns `{ error }`; the only division is the editable, guarded-positive threshold compare.
Citation discipline (v19/v22): `GOVERNANCE.general` over the water density and the hydrostatic load
`load_psf = depth_ft x 62.4`, by name; the threshold is an **editable screen value, not a code
capacity** -- the actual fastening, span, and a structural engineer govern. This is a screen to
decide whether to punch-drain from a safe distance before anyone works beneath the bulge.

## 2. The tile

### 2.1 `ceiling-water-load` -- Trapped Ceiling-Cavity Water Load and Collapse Screen

```
inputs:
  pooled_area_ft2   L^2            plan area of the saturated / bulging ceiling region
  avg_depth_in      L              average trapped water depth above the ceiling
  threshold_psf     M/L^2          editable drain-first screen load (default 5; not a code rating)

water_volume_gal = pooled_area_ft2 x (avg_depth_in / 12) x 7.48
water_weight_lb  = pooled_area_ft2 x (avg_depth_in / 12) x 62.4    # = volume_gal x 8.34
load_psf         = (avg_depth_in / 12) x 62.4                      # distributed load, depth-only
drain_first      = load_psf > threshold_psf                        # punch-drain before entry beneath
```

**Pinned worked example.** A 20 ft^2 bulge averaging 2 in deep:
`load_psf = (2/12) x 62.4 = 10.4 lb/ft^2`; `weight = 20 x 10.4 = 208 lb`; `10.4 > 5` -> **drain from a
safe distance before working beneath**.
**Cross-check (gallons path agrees).** `volume = 20 x (2/12) x 7.48 = 24.9 gal`; `24.9 x 8.34 = 208
lb` -- the same 208 lb the depth-only load path produces, confirming the constants. At 0.5 in depth
the load is `(0.5/12) x 62.4 = 2.6 psf` (52 lb), below the 5 psf screen -- still verify the fastening;
the threshold is editable and conservative, not a rating.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the hydrostatic load and water densities, `editionNote`
naming ANSI/IICRC S500 safety practice and the threshold-is-not-a-code-capacity caveat, the
drain-before-entry scope); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`ceiling-water-load` -> `computeCeilingWaterLoad` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `standing-water` / `flood-cut-takeoff`
/ `evaporation-load`); `data/search/aliases.json` ("ceiling collapse", "trapped water", "bulging
ceiling", "ceiling load", "punch drain", "water weight overhead"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams
(non-finite, area/depth <= 0). Raise the `calc-restoration.js` size cap by ~20 percent if needed
(dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the load, weight, and
drain-first flag wrap on a phone); render-no-nan + a11y sweep, output read to the value (20 ft^2 / 2
in -> 10.4 psf, 208 lb, drain-first true) with the safety flag visible.

## 5. Roadmap position

Adds the overhead-hazard screen the floor-water tile never covered, completing the on-arrival safety
read with the flood-cut takeoff (v136). Further Group D growth stays evidence-driven.
