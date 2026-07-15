# roughlogic.com Specification v884 -- Portland-Cement Plaster (Stucco) Material Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v883.md. Plaster sweep, beside `mortar-mix` and
> `thinset-coverage`.
>
> **The gap, and the evidence for it.** Nothing takes off **stucco** (portland-cement plaster) -- the bags for a multi-coat
> thickness over an area. Grep confirmed no stucco / plaster tile. The number this settles: 1,000 sf of a three-coat 7/8 in
> system, on an 80-lb bag yielding 10.1 square-foot-inches, is about **96 bags** with waste -- and a two-coat 5/8 in system
> drops to **69**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
plaster siblings (`mortar-mix`, `thinset-coverage`): the area carries `L^2`, the total thickness `L`, the bag yield `L^3`
(square-foot-inch), the waste is dimensionless, and the bag count is dimensionless. The v18/v21 contract: a non-finite or
non-positive area, thickness, or bag yield returns `{ error }`; a negative waste returns `{ error }`. Citation discipline
(v19/v22): the bag-count identity by name (bags = ceil(area x thickness / bag yield x (1 + waste))),
`GOVERNANCE.general`; the note states that the coat thicknesses (scratch, brown, finish -- about 3/8 + 3/8 + 1/8 = 7/8 in
over metal lath) come from the spec, that the bag yield is the product's coverage at a reference thickness, that the sand
and lime are batched per the mix design, and that this is distinct from the masonry `mortar-mix` and `thinset-coverage`.

## 2. The tile

### 2.1 `stucco-coverage` -- Portland-Cement Plaster (Stucco) Material Takeoff

```
inputs:
  area_sf            area to plaster (ft^2)
  total_thickness_in total coat thickness (in, default 0.875 for 3-coat)
  bag_yield_sf_in    bag yield (square-foot-inches, default 10.1)
  waste_pct          waste allowance (percent, default 10)

bags = ceil(area_sf * total_thickness_in / bag_yield_sf_in * (1 + waste_pct/100))
```

**Pinned worked example.** Area 1,000 sf, 7/8 in three-coat, 10.1 sf-in bag yield, 10% waste:
`bags = ceil(1000*0.875/10.1*1.10) = ceil(95.3) = ` **96**. Cross-check: a two-coat 5/8 in system is
`ceil(1000*0.625/10.1*1.10) = ceil(68.1) = ` **69 bags** -- the total thickness, set by the number of coats, drives the
order.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry", "construction"]`, inside the `// Group E` construction block near
`mortar-mix`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (bags = ceil(area x thickness / bag yield x (1 + waste)), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned three-coat example plus the two-coat cross-check);
`test/fixtures/compute-map.js` (`stucco-coverage` -> `computeStuccoCoverage`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `mortar-mix` / `thinset-coverage` / `masonry-count`); `data/search/aliases.json` (5
collision-checked aliases: "stucco coverage", "portland cement plaster", "stucco bag count", "three coat stucco",
"plaster material takeoff"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `mortar-mix`
renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the bag count and the error seams (non-positive area, thickness, bag yield; negative
waste). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,332 -> 1,333.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(1000*0.875/10.1*1.10) -> 96 bags).

## 5. Roadmap position

Plaster takeoff beside `mortar-mix` and `thinset-coverage`, serving the plasterer (masonry / construction). Stays
evidence-driven; the spec sets the coats and the mix.
