# roughlogic.com Specification v891 -- Polymeric Paver Joint Sand Bag Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v890.md. Hardscape sweep, beside `paver-patio`.
>
> **The gap, and the evidence for it.** `paver-patio` takes off the pavers and base but nothing counts the **polymeric
> joint sand**, whose coverage per bag swings with the joint width and paver size. Grep confirmed no polymeric-sand tile.
> The number this settles: a 400 sf patio at 75 sf per bag is **6 bags**, but wide joints around big pavers drop the
> coverage and push it toward 10 -- the difference between finishing the job and a second trip.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
hardscape siblings (`paver-patio`, `thinset-coverage`): the area and coverage per bag carry `L^2`, the waste is
dimensionless, and the bag count is dimensionless. The v18/v21 contract: a non-finite or non-positive area or coverage
per bag returns `{ error }`; a negative waste returns `{ error }`. Citation discipline (v19/v22): the bag-count identity
by name (bags = ceil(area x (1 + waste) / coverage per bag)), `GOVERNANCE.general`; the note states that the coverage per
bag comes from the product chart and drops sharply with wider joints and larger pavers, that polymeric sand is swept in,
compacted, and activated with a light water mist, and that this is distinct from the paver and base takeoff in
`paver-patio`.

## 2. The tile

### 2.1 `polymeric-sand-bags` -- Polymeric Paver Joint Sand Bag Count

```
inputs:
  area_sf              paver surface area (ft^2)
  coverage_per_bag_sf  coverage per bag (ft^2, default 75)
  waste_pct            waste allowance (percent, default 5)

bags = ceil(area_sf * (1 + waste_pct/100) / coverage_per_bag_sf)
```

**Pinned worked example.** Area 400 sf, 75 sf/bag, 5% waste:
`bags = ceil(400*1.05/75) = ceil(5.6) = ` **6**. Cross-check: wide joints around large-format pavers cut the coverage to
45 sf/bag, so `ceil(400*1.05/45) = ceil(9.3) = ` **10 bags** -- the joint width, through the product's coverage, is the
lever.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["landscaping", "construction"]`, inside the `// Group E` construction block
near `paver-patio`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (bags = ceil(area(1+waste)/coverage per bag), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wide-joint cross-check); `test/fixtures/compute-map.js`
(`polymeric-sand-bags` -> `computePolymericSandBags`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `paver-patio` / `retaining-wall-block` / `aggregate`); `data/search/aliases.json` (5 collision-checked aliases:
"polymeric sand bags", "paver joint sand", "polymeric sand coverage", "paver sand bag count", "joint stabilizing sand");
a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `paver-patio` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the bag count and the error seams (non-positive area or coverage; negative waste). The calc-construction.js gzip
cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,339 -> 1,340.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(400*1.05/75) -> 6 bags).

## 5. Roadmap position

Hardscape takeoff beside `paver-patio` and `retaining-wall-block`, serving the hardscape installer (landscaping /
construction). Stays evidence-driven; the product coverage governs.
