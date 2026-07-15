# roughlogic.com Specification v892 -- Rigid / Continuous Insulation Board Count (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v891.md. Insulation sweep, beside
> `insulation-batt-coverage` and `spray-foam-board-feet`.
>
> **The gap, and the evidence for it.** Nothing counts **rigid continuous insulation** boards, where a multi-layer install
> with staggered seams doubles the board count. Grep confirmed no rigid-foam-board tile. The number this settles: a
> 1,600 sf wall in 4 x 8 boards at 8% waste is 54 boards a layer, so a two-layer continuous-insulation assembly is **108
> boards** -- the order the energy code's continuous-insulation requirement drives.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
insulation siblings (`insulation-batt-coverage`, `spray-foam-board-feet`): the area and board area carry `L^2`, the
layers and waste are dimensionless, and the board count is dimensionless. The v18/v21 contract: a non-finite or
non-positive area, board area, or layers returns `{ error }`; a negative waste returns `{ error }`. Citation discipline
(v19/v22): the board-count identity by name (boards = ceil(area x (1 + waste) / board area) x layers),
`GOVERNANCE.general`; the note states that this is continuous rigid insulation (XPS, polyiso, or EPS), that the layers
cover a multi-layer install with offset seams for the continuous-insulation requirement, that the fasteners, plates, and
tape are taken off separately per the wind zone, and that this is distinct from `spray-foam-board-feet` and
`insulation-batt-coverage`.

## 2. The tile

### 2.1 `rigid-foam-board-count` -- Rigid / Continuous Insulation Board Count

```
inputs:
  area_sf       area to insulate (ft^2)
  board_area_sf board area (ft^2, default 32)
  layers        number of layers (count, default 1)
  waste_pct     waste allowance (percent, default 8)

boards = ceil(area_sf * (1 + waste_pct/100) / board_area_sf) * layers
```

**Pinned worked example.** Area 1,600 sf, 4 x 8 boards (32 sf), 2 layers, 8% waste:
`per layer = ceil(1600*1.08/32) = ceil(54.0) = 54`; `boards = 54 * 2 = ` **108**. Cross-check: a single-layer install of the
same wall is `54 * 1 = ` **54 boards** -- the layer count, set by the required continuous-insulation R, is the multiplier.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["insulation", "construction"]`, inside the `// Group E` construction block near
`spray-foam-board-feet`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (boards = ceil(area(1+waste)/board area) x layers, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned two-layer example plus the single-layer cross-check);
`test/fixtures/compute-map.js` (`rigid-foam-board-count` -> `computeRigidFoamBoardCount`, module
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `insulation-batt-coverage` / `spray-foam-board-feet` /
`assembly-r-value`); `data/search/aliases.json` (5 collision-checked aliases: "rigid foam board count", "continuous
insulation boards", "xps board count", "polyiso board count", "rigid insulation quantity"); a hand-written renderer in
the `CONSTRUCTION_RENDERERS` map mirroring the `insulation-batt-coverage` renderer (non-exported, so no DOM-sentinel dims
row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the board count
and the error seams (non-positive area, board area, layers; negative waste). The calc-construction.js gzip cap is watched
at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home
first paint. Home tile count 1,340 -> 1,341.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(1600*1.08/32)*2 -> 108 boards).

## 5. Roadmap position

Insulation takeoff beside `spray-foam-board-feet` and `insulation-batt-coverage`, serving the insulator (insulation /
construction). Stays evidence-driven; the energy code sets the continuous-insulation layers.
