# roughlogic.com Specification v210 -- Plant Spacing Count (Square and Triangular) (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v207..v211 (landscape irrigation and planting -- the install-side
> cluster the catalog never had: precipitation rate, zone runtime, drip flow, plant spacing, sod takeoff).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-agriculture.js`** (Group L); no new module, group, or dependency. Inherits spec.md through
> spec-v209.md.
>
> **The gap, and the evidence for it.** The catalog estimates pavers, fence pickets, tile, and flooring per
> area, but never the plant count for a bed at a given on-center spacing -- the daily takeoff for any planting
> or groundcover job. And it is not just `area / spacing^2`: a triangular (staggered) layout, the way
> groundcover is actually planted, packs about 15 percent more plants into the same bed than a square grid
> because the offset rows sit closer. The catalog can count hard goods by area but not the living material
> the landscaper is actually there to install.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bed area is
`L^2` (ft^2); the on-center spacing is a length (`L`, in); the plant counts are `dimensionless`. The
triangular factor 0.866 is `sqrt(3)/2`, the row offset of an equilateral (60-degree) staggered grid. The
v18/v21 contract: any non-finite input, or a non-positive area or spacing, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the square- and triangular-grid relations by name;
`editionNote` names the **nursery / landscape estimating** references for the staggered-grid 0.866 factor and
states that **the spacing comes from the plant's mature spread or the planting plan, edge plants are rounded
up so the bed is covered, and this is a planting-density count, not an irrigation or fertilization rate** --
a takeoff aid, not a horticultural plan.

## 2. The tile

### 2.1 `plant-spacing-count` -- Plants From Bed Area and On-Center Spacing

```
inputs:
  bed_ft2     L^2   bed area to plant, ft^2
  spacing_in  L     on-center spacing, in

s_ft        = spacing_in / 12
square_n    = ceil(bed_ft2 / (s_ft^2))            # rows and columns square
triangular_n = ceil(bed_ft2 / (0.866 x s_ft^2))   # staggered 60-degree rows, ~15% more
```

**Pinned worked example (1 ft on center).** A 200 ft^2 bed at 12 in on center (`s_ft = 1.0`): `square = ceil(200
/ 1.0) = ` **200 plants**; `triangular = ceil(200 / 0.866) = ceil(230.9) = ` **231 plants** -- the staggered
layout adds 31 plants for full coverage.
**Cross-check (18 in groundcover).** A 500 ft^2 bed at 18 in on center (`s_ft = 1.5`, `s_ft^2 = 2.25`):
`square = ceil(500 / 2.25) = ceil(222.2) = 223`; `triangular = ceil(500 / (0.866 x 2.25)) = ceil(500 / 1.9485)
= ceil(256.6) = ` **257 plants**. Wider spacing, same 15 percent triangular premium.

## 3. Wiring

A `tools-data.js` row (group `L`, trade `["landscaping","agriculture"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`GOVERNANCE.general`, the square / triangular relations, `editionNote` naming the
nursery estimating references and the spacing-from-mature-spread caveat);
`test/fixtures/worked-examples.json` (1 ft example + 18 in cross-check); `test/fixtures/compute-map.js`
(`plant-spacing-count` -> `computePlantSpacingCount` in `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `sod-takeoff` / `square-footage` / `material-quantity`);
`data/search/aliases.json` ("plant spacing", "plant count", "groundcover spacing", "on center planting",
"triangular spacing", "plants per square foot"); the id appended to the existing agriculture renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples and error seams (non-finite, area/spacing <= 0). Raise the `calc-agriculture.js`
size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the square / triangular pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (200 ft^2 / 12 in -> 200 square, 231 triangular).

## 5. Roadmap position

The planting-takeoff member of the install cluster; pairs with `sod-takeoff` (v211) for the turf side and
with the existing `square-footage` for the bed area. A flats-of-annuals (cells per flat) sub-mode is a
deliberate future follow-on.
