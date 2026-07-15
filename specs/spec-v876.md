# roughlogic.com Specification v876 -- Spray Foam Board-Feet and Set Count (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v875.md. Insulation sweep, beside
> `insulation-batt-coverage`.
>
> **The gap, and the evidence for it.** The catalog covers batts and blown insulation but nothing sizes **spray foam** in
> the board-feet and sets it is ordered by. Grep confirmed no spray-foam / board-feet tile. The number this settles:
> 2,000 sf at 3 in of closed-cell is **6,000 board-feet**, which on a 4,800 board-foot set (with waste) is **2 sets** --
> and open-cell at a thicker 5.5 in still fits in **1 set** because it yields far more per set.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
insulation siblings (`insulation-batt-coverage`, `blown-insulation-coverage`): the area carries `L^2`, the thickness `L`,
the set yield `L^3` (a board-foot is a square-foot-inch), the waste is dimensionless, the board-feet is `L^3`, and the set
count is dimensionless. The v18/v21 contract: a non-finite or non-positive area, thickness, or set yield returns
`{ error }`; a negative waste returns `{ error }`. Citation discipline (v19/v22): the board-feet identity by name
(board-feet = area x thickness; sets = ceil(board-feet x (1 + waste) / set yield)), `GOVERNANCE.general`; the note states
that a board-foot is one square foot one inch thick, that the set yield comes from the product (closed-cell about 4,800
board-feet, open-cell far more, both less in the field), that temperature and substrate cut the yield, and that this is
distinct from `insulation-batt-coverage`.

## 2. The tile

### 2.1 `spray-foam-board-feet` -- Spray Foam Board-Feet and Set Count

```
inputs:
  area_sf              area to spray (ft^2)
  thickness_in         applied thickness (in)
  yield_bd_ft_per_set  board-feet per set (default 4800 for closed-cell)
  waste_pct            waste allowance (percent, default 10)

board_feet = area_sf * thickness_in
sets       = ceil(board_feet * (1 + waste_pct/100) / yield_bd_ft_per_set)
```

**Pinned worked example.** Area 2,000 sf, thickness 3 in, 4,800 bd-ft/set, 10% waste:
`board-feet = 2000*3 = ` **6,000**; `sets = ceil(6000*1.10/4800) = ceil(1.375) = ` **2**. Cross-check: open-cell at a
5.5 in fill on a 16,000 bd-ft set is `2000*5.5 = 11,000 bd-ft`, `ceil(11000*1.10/16000) = ceil(0.756) = ` **1 set** --
open-cell's higher yield covers the thicker fill in fewer sets.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["insulation", "construction"]`, inside the `// Group E` construction block near
`insulation-batt-coverage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (board-feet = area x thickness; sets = ceil(bd-ft(1+waste)/yield), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the open-cell cross-check); `test/fixtures/compute-map.js`
(`spray-foam-board-feet` -> `computeSprayFoamBoardFeet`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `insulation-batt-coverage` / `blown-insulation-coverage` / `assembly-r-value`); `data/search/aliases.json` (5
collision-checked aliases: "spray foam board feet", "spf set count", "spray foam sets", "closed cell foam quantity",
"spray foam coverage"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring a simple output renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the board-feet, the set count, and the error seams (non-positive area, thickness,
set yield; negative waste). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,324 -> 1,325.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2000*3*1.10/4800) -> 2 sets).

## 5. Roadmap position

Insulation takeoff beside `insulation-batt-coverage` and `blown-insulation-coverage`, serving the spray-foam installer
(insulation / construction). Stays evidence-driven; the product set yield governs.
