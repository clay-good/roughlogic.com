# roughlogic.com Specification v920 -- Cement Board (Tile Backer) Sheet and Screw Takeoff (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v919.md. Tile-substrate material-takeoff sweep,
> beside the accepted `thinset-coverage` and `tile-count` tiles.
>
> **The gap, and the evidence for it.** The catalog takes off thin-set and tile but nothing counts the **cement backer
> board** and its screws. Grep confirmed no backer-board tile (drywall-fastener-takeoff is gypsum). Every wet-area tile
> job starts with a backer substrate. The number this settles: a 120 sf tub surround at 10% waste takes **9 sheets** and
> about 315 backer screws.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling tile
tiles: the backer area and sheet area carry `L^2`, and the waste, screws-per-sheet, sheet count, and screw count are
dimensionless. The v18/v21 contract: a non-finite or non-positive area, sheet area, or screws-per-sheet, or a negative
waste, returns `{ error }`. Citation discipline (v19/v22): the takeoff identity by name (sheets = ceil(area x (1 + waste)
/ sheet area); screws = sheets x per-sheet), `GOVERNANCE.general`; the note states that a 3x5 board is 15 sf, that
corrosion-resistant backer screws run about 30 to 40 per sheet at 8 in on center, that mesh tape and thin-set fill the
joints (not counted) and the board sets over a moisture barrier per the wet-area detail, and that this is distinct from
the gypsum drywall takeoff -- ANSI A108, the TCNA Handbook, and the board manufacturer govern the fastener schedule and
the wet-area assembly.

## 2. The tile

### 2.1 `cement-board-takeoff` -- Cement Board (Tile Backer) Sheet and Screw Takeoff

```
inputs:
  area_sf           backer area (sf)
  sheet_area_sf     one sheet's area (sf, 3x5 = 15, default 15)
  waste_pct         waste / cuts (%, default 10)
  screws_per_sheet  fasteners per sheet (~30-40, default 35)

sheets = ceil(area_sf x (1 + waste_pct/100) / sheet_area_sf)
screws = sheets x round(screws_per_sheet)
```

**Pinned worked example.** 120 sf tub surround, 15 sf sheets, 10% waste, 35 screws/sheet:
`sheets = ceil(120 x 1.10 / 15) = ceil(8.8) = ` **9**; `screws = 9 x 35 = ` **315**. Cross-check: a 200 sf floor at the
same sheet size and waste is `ceil(200 x 1.10 / 15) = ceil(14.67) = ` **15 sheets** -- the sheet count scales with the
area over the board size, plus the waste rounding.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["tile", "carpentry", "construction"]`, beside `thinset-coverage`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (cement-board takeoff, ANSI A108 / TCNA, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the tub-surround example plus the floor cross-check, pinning the sheets and
screws); `test/fixtures/compute-map.js` (`cement-board-takeoff` -> `computeCementBoardTakeoff`, module
`../../calc-finish.js`); `scripts/related-tiles.mjs` (-> `thinset-coverage` / `tile-count` / `drywall-fastener-takeoff`);
`data/search/aliases.json` (5 collision-checked aliases: "cement board takeoff", "backer board takeoff", "tile backer
sheets", "cement board sheets", "durock takeoff"), then `node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the
`FINISH_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-finish declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the sheet and screw counts across the two cases and the error seams (non-positive
area / sheet / screws, negative waste, non-finite). The calc-finish.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,368 -> 1,369.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(120 x 1.10 / 15) -> 9 sheets, 315 screws).

## 5. Roadmap position

Tile-substrate material takeoff beside `thinset-coverage`, serving the tile setter / carpenter (tile / carpentry).
Deliberately a material estimate; ANSI A108, the TCNA Handbook, and the board manufacturer govern the fastener schedule
and the wet-area assembly. Stays evidence-driven. Continues the tile-substrate takeoff sweep at 1 new spec (v920).
