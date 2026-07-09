# roughlogic.com Specification v563 -- Basal Area per Acre (Prism Cruise) (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v562.md.
>
> **The gap, and the evidence for it.** `timber-cruise` gives board-foot volume from a log rule, but the field method a
> forester actually uses to measure stand density -- the variable-radius prism (angle-gauge) plot -- is absent. With a
> wedge prism of a given basal-area factor (BAF), the cruiser spins in place and counts the trees that appear "in," and
> the stand basal area per acre is simply the BAF times the count. The catch that surprises newcomers is that the prism
> counts a tree by its **angular** size, not its distance: a big far tree and a small near tree can both count "in," and
> the basal area per acre is completely independent of any plot radius. Borderline trees must be checked with the
> limiting distance, and only "in" trees count. The tile takes the BAF, the in-tree count, and a tree's DBH, and returns
> the basal area per acre, the per-tree basal area, and the trees-per-acre one in-tree represents -- the core numbers of
> a point-sample cruise.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The basal-area factor and
the basal area per acre are `L^2 L^-2` (ft^2 per acre, carried as `dimensionless` with the acre convention); the DBH is
a length (`L`, in inches); the per-tree basal area is an area (`L^2`, in ft^2); the tree count and trees-per-acre are
`dimensionless` (counts); the `0.005454` constant is `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive BAF, a negative in-tree count, or a non-positive DBH returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the point-sampling relations by name (USDA Forest Service mensuration; Bitterlich variable-
radius plots); `editionNote` names the **prism (variable-radius) basal-area cruise**, prints
`basal_area_per_acre = BAF x in_tree_count`, `per_tree_ba = 0.005454 x DBH^2`, and
`trees_per_acre = BAF / per_tree_ba`, and states that **the prism counts a tree by angular size not distance (a big far
tree and a small near tree both count in), the basal area per acre is independent of plot radius, borderline trees must
be checked with the limiting distance (plot-radius factor times DBH) and only in trees count, and a qualified cruise and
the forester govern** -- a field estimate, not a full inventory.

## 2. The tile

### 2.1 `basal-area-prism` -- Stand Density From an Angle-Gauge Count (Distance Does Not Matter)

```
inputs:
  baf              ft2/ac   basal-area factor of the prism/gauge (e.g. 10)
  in_tree_count    -        number of trees counted "in" at the point
  dbh_in           in       DBH of a tree (for the per-tree expansion)

basal_area_per_acre = baf x in_tree_count            [ft2/ac]
per_tree_ba         = 0.005454 x dbh_in^2             [ft2]
trees_per_acre      = baf / per_tree_ba               [trees/ac per in-tree of this DBH]
```

**Pinned worked example (a BAF-10 prism, 8 trees counted in, a 14 in DBH tree).** The stand basal area is
`10 x 8 = ` **80 ft^2 per acre** -- a moderately stocked stand -- regardless of how far away any tree stood. A single
14 in tree occupies `0.005454 x 14^2 = 1.069 ft^2` of basal area, so one in-tree of that size represents
`10 / 1.069 = ` **9.4 trees per acre**. **Cross-check (a bigger BAF counts fewer trees for the same stand).** Using a
BAF-20 prism on the same stand would count about 4 trees in (`80 / 20`), giving the same `80 ft^2/ac` -- the factor and
the count trade off, which is why the BAF is chosen for a workable tally, not the answer. The tile returns the basal
area per acre, the per-tree basal area, and the trees-per-acre expansion.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["forester", "timber"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the BAF-10 example + the
BAF-20 cross-check); `test/fixtures/compute-map.js` (`basal-area-prism` -> `computeBasalAreaPrism` in
`../../calc-arborist.js`); `scripts/related-tiles.mjs` (-> `timber-cruise` / `reineke-sdi` / `log-limb-weight`);
`data/search/aliases.json` ("basal area", "prism cruise", "variable radius plot", "baf", "angle gauge", "bitterlich",
"point sampling forestry", "stand density basal area"); the id appended to the arborist renderers declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the BAF x count relation, the per-tree basal-area formula, the trees-per-acre expansion, and the error seams (non-
finite, non-positive BAF / DBH, negative count). Hand-writes its renderer (mirroring the calc-arborist.js
`timber-cruise` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the BA/ac / per-tree / TPA stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the BAF-10 example -> 80 ft^2/ac).

## 5. Roadmap position

Adds the point-sample density cruise beside `timber-cruise` (log volume) and feeds `reineke-sdi` (which uses stand
density). A trees-per-acre summation across multiple DBH classes and a limiting-distance (borderline-tree) checker are
deliberate future follow-ons. Further Group L growth stays evidence-driven.
