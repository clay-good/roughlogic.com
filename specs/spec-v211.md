# roughlogic.com Specification v211 -- Sod Takeoff (Slabs and Pallets) (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v207..v211 (landscape irrigation and planting -- the install-side
> cluster the catalog never had: precipitation rate, zone runtime, drip flow, plant spacing, sod takeoff).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-agriculture.js`** (Group L); no new module, group, or dependency. Inherits spec.md through
> spec-v210.md. This closes the v207..v211 landscape cluster.
>
> **The gap, and the evidence for it.** The catalog does the area-plus-waste-to-units takeoff for fence
> pickets, pavers, flooring, and tile, but not for sod -- the one a landscaper orders by the slab and the
> pallet on nearly every install. A lawn area carries a cut/waste allowance for the curves and edges, then
> divides into slabs (sold by the piece) and pallets (sold by the skid), the same shape as `fence-estimate`
> or `flooring-takeoff` but for turf, which the catalog never had.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The lawn area,
the slab area, and the pallet area are `L^2` (ft^2); the waste allowance is `dimensionless` percent; the
ordered area is `L^2` (ft^2) reported also in square yards; the slab and pallet counts are `dimensionless`.
Slab and pallet sizes are inputs (defaults noted in the renderer: a slab is commonly ~10 ft^2 and a pallet
~450 ft^2, but both vary by farm and grass), because they are regional. The v18/v21 contract: any non-finite
input, a non-positive lawn / slab / pallet area, or a negative waste allowance, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the area-plus-waste takeoff relation by name;
`editionNote` names the **turfgrass producer / landscape estimating** references and states that **the slab
and pallet coverage are the supplier's published piece and skid sizes (user-supplied here, they vary by
farm), the waste allowance covers cuts and edges, and this is a material takeoff, not a site-prep or
establishment plan** -- an ordering aid, not an agronomic spec.

## 2. The tile

### 2.1 `sod-takeoff` -- Sod Slabs and Pallets From Lawn Area

```
inputs:
  lawn_ft2     L^2            area to sod, ft^2
  waste_pct    dimensionless  cut / edge allowance, percent
  slab_ft2     L^2            coverage of one slab, ft^2   (default ~10)
  pallet_ft2   L^2            coverage of one pallet, ft^2 (default ~450)

order_ft2 = lawn_ft2 x (1 + waste_pct / 100)
order_syd = order_ft2 / 9
slabs     = ceil(order_ft2 / slab_ft2)
pallets   = ceil(order_ft2 / pallet_ft2)
```

**Pinned worked example (residential lawn).** A 2500 ft^2 lawn at 5 percent waste, 10 ft^2 slabs, 450 ft^2
pallets: `order = 2500 x 1.05 = 2625 ft^2` (`= 291.7 syd`); `slabs = ceil(2625 / 10) = ` **263 slabs**;
`pallets = ceil(2625 / 450) = ceil(5.83) = ` **6 pallets**.
**Cross-check (small irregular yard, higher waste).** A 900 ft^2 yard at 12 percent waste (lots of curves):
`order = 900 x 1.12 = 1008 ft^2`; `slabs = ceil(1008 / 10) = 101`; `pallets = ceil(1008 / 450) = ceil(2.24) =
3 pallets`. The curve-heavy yard pays the higher waste, and the partial third pallet rounds up.

## 3. Wiring

A `tools-data.js` row (group `L`, trade `["landscaping","agriculture"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`GOVERNANCE.general`, the area-plus-waste takeoff relation, `editionNote` naming the
turfgrass producer / estimating references and the regional-coverage caveat);
`test/fixtures/worked-examples.json` (residential example + irregular-yard cross-check);
`test/fixtures/compute-map.js` (`sod-takeoff` -> `computeSodTakeoff` in `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `plant-spacing-count` / `square-footage` / `sprinkler-precip-rate`);
`data/search/aliases.json` ("sod", "sod takeoff", "sod pallets", "turf order", "sod rolls", "lawn install");
the id appended to the existing agriculture renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams
(non-finite, lawn/slab/pallet <= 0, negative waste). Raise the `calc-agriculture.js` size cap by ~20 percent
if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the slabs / pallets pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (2500 ft^2 / 5 percent -> 263 slabs, 6 pallets).

## 5. Roadmap position

Closes the v207..v211 landscape install cluster (precipitation rate, runtime, drip flow, plant count, sod).
Pairs with `plant-spacing-count` for the bed side. A seed-and-straw alternative (lbs of seed and bales of
straw per area) is a deliberate future tile.
