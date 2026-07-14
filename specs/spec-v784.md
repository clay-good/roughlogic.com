# roughlogic.com Specification v784 -- Floor Area Ratio (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-realestate.js`** (Group X),
> no new module, group, or dependency. Inherits spec.md through spec-v783.md. Explore sweep #20 (entry 4).
>
> **The gap, and the evidence for it.** Every feasibility and site-selection decision in real estate starts with **how
> much can be built on the lot**, and the zoning number that answers it is the **floor area ratio (FAR)**: gross building
> floor area divided by lot area, capped by the ordinance. No tile does it. `FAR = building floor area / lot area`;
> `max buildable = FAR_limit x lot area`. The number this settles: a **30,000 SF** building on a **20,000 SF** lot is
> **FAR 1.5**; under a **2.0** cap the lot allows **40,000 SF**, so **10,000 SF** of capacity remains. Grep confirmed no
> FAR or lot-coverage tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group X
real-estate siblings (`commercial-load-factor`): the building floor area and lot area carry `L^2`, the FAR and the limit
are dimensionless, and the max-buildable and remaining areas carry `L^2`. The v18/v21 contract: a non-finite input (via
`_finiteGuard`), a non-positive lot area, a negative building area, or a negative FAR limit returns `{ error }`; a FAR
limit of 0 is the "skip the cap" branch (the cap and remaining outputs are `null`, the FAR is still computed). Citation
discipline (v19/v22): floor area ratio by name, `GOVERNANCE.general` matching the `commercial-load-factor` sibling (AHJ
and licensed professional govern); the note states that FAR caps bulk without dictating footprint or height, that the
maximum buildable floor area = FAR_limit x lot area, and -- the one municipal-variation flag -- that what counts as
"floor area" (parking, basements, mechanical, balconies) differs by municipality, so the user enters the gross figure
the local code defines as countable. It stays first-principles because the area is user-entered, not a hidden table.

## 2. The tile

### 2.1 `floor-area-ratio` -- Floor Area Ratio (Zoning)

```
inputs:
  building_floor_area_sf   gross building floor area (SF)
  lot_area_sf              lot area (SF)
  far_limit                zoning FAR cap (0 = skip the cap check)

far           = building_floor_area_sf / lot_area_sf
max_buildable = far_limit x lot_area_sf         (when far_limit > 0)
remaining     = max_buildable - building_floor_area_sf
within        = far <= far_limit
```

**Pinned worked example.** Building 30,000 SF, lot 20,000 SF, FAR limit 2.0: `far = 30000/20000 = ` **1.5**;
`max_buildable = 2.0 x 20000 = ` **40,000 SF**; `remaining = 40000 - 30000 = ` **10,000 SF**; `within = true` (1.5 <=
2.0). A 50,000 SF building on the same lot is FAR 2.5, over the cap (negative remaining). With `far_limit = 0` the cap
outputs are null and only the FAR is reported.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate"]`) beside `blended-mortgage-rate` (Group X is not exact-count-
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (floor area ratio, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example, three pinned outputs); `test/fixtures/compute-map.js`
(`floor-area-ratio` -> `computeFloorAreaRatio`); `scripts/related-tiles.mjs` (-> `square-footage` /
`commercial-load-factor` / `required-face-rent`); `data/search/aliases.json` (5 collision-checked aliases: "floor area
ratio", "how much can i build on my lot", "max buildable square footage", ...); the calc-realestate
`REALESTATE_RENDERERS` map entry via a hand-written renderer (non-exported, so no DOM-sentinel row) and the id added to
the calc-realestate declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the over-cap branch, the
no-limit branch, and the error seams. The calc-realestate.js gzip cap is unchanged (the addition fits under the current
cap). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,232 ->
1,233.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (30,000 SF on 20,000 SF -> FAR 1.5, 40,000 SF max,
10,000 SF remaining).

## 5. Roadmap position

Adds the zoning-feasibility starting point -- floor area ratio and the buildable area it caps -- to the real-estate
bench. Continues the post-inverse forward-coverage vein (Explore sweep #20). A lot-coverage-ratio (footprint / lot) and a
parking-ratio (stalls per 1,000 SF) tile are the clean zoning-geometry siblings; they stay evidence-driven.
