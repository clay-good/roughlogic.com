# roughlogic.com Specification v988 -- Foundation Drainage Board (Dimple Mat) Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v987.md. Beside
> `foundation-waterproofing-takeoff` in the below-grade-waterproofing sweep.
>
> **The gap, and the evidence for it.** The catalog has the fluid-membrane takeoff (in gallons), but the drainage
> board that goes OVER it -- a separate material ordered by the roll -- is only mentioned in passing. Grep confirmed no
> drainage-board / dimple-mat tile. The number this settles: a 150 ft perimeter, 8 ft below grade needs **7 rolls** of
> 4x50 ft board.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, like the sibling takeoff tiles), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive
perimeter, height, roll width, or roll length, or a negative waste, returns `{ error }`. Citation discipline
(v19/v22): the foundation drainage board (dimple mat) material takeoff by name, `GOVERNANCE.general`; the note stresses
that the dimples face the WALL (air gap against the membrane), that it relieves hydrostatic pressure to the footing
drain (IRC R405), and that the product roll size and lap, the assembly detail, and the AHJ govern.

## 2. The tile

### 2.1 `drainage-board-takeoff` -- Foundation Drainage Board (Dimple Mat) Takeoff

```
inputs:
  perimeter_ft          foundation perimeter (ft), default 150
  below_grade_height_ft average below-grade height (ft), default 8
  roll_width_ft         drainage board roll width (ft), default 4
  roll_length_ft        drainage board roll length (ft), default 50
  waste_pct             waste allowance (%), default 10

wall_area_sf     = perimeter_ft x below_grade_height_ft
roll_coverage_sf = roll_width_ft x roll_length_ft
rolls            = ceil(wall_area_sf x (1 + waste_pct/100) / roll_coverage_sf)
termination_lf   = perimeter_ft
```

**Pinned worked example.** 150 ft perimeter, 8 ft below grade, 4x50 ft rolls (200 sf), 10% waste: `area = 1,200 sf`;
`rolls = ceil(1200 x 1.1 / 200) = ceil(6.6) = ` **7 rolls**, plus **150 lf** of termination bar. Cross-check: a 200 ft
perimeter, 9 ft below grade: `area = 1,800 sf`; `rolls = ceil(1800 x 1.1 / 200) = ceil(9.9) = ` **10 rolls**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["waterproofing", "construction"]`, beside
`foundation-waterproofing-takeoff`); a `tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (drainage board
takeoff, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the base example plus the larger-wall
cross-check, pinning area, rolls, and termination bar); `test/fixtures/compute-map.js` (`drainage-board-takeoff` ->
`computeDrainageBoardTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`foundation-waterproofing-takeoff` / `footing-area` / `vapor-barrier-rolls`); `data/search/aliases.json` (5
collision-checked aliases: "drainage board", "dimple mat", "dimple board", "foundation drainage board", "drainage
mat"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the
`CONSTRUCTION_RENDERERS` map, and the id added to the calc-construction declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the ceil boundary, the bigger-roll / more-waste directions, and
the error seams. The calc-construction.js gzip cap and the Group E group shell are watched at build (headroom
available; no raise needed). Home tile count 1,436 -> 1,437.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(150 ft x 8 ft / 200 sf roll -> 7 rolls).

## 5. Roadmap position

Below-grade waterproofing beside `foundation-waterproofing-takeoff`, serving the waterproofing / foundation
contractor (waterproofing, construction). Deliberately the material-ordering estimate; the product roll size and lap,
the full assembly detail (membrane below, footing drain per IRC R405), and the AHJ govern. Stays evidence-driven.
Continues the below-grade-waterproofing sweep at 1 new spec (v988).
