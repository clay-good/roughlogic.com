# roughlogic.com Specification v893 -- Roof Board Fastener and Plate Count by Zone (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v892.md. Roofing sweep, beside `membrane-roof-takeoff`
> and `tapered-roof-insulation`.
>
> **The gap, and the evidence for it.** Nothing counts the **fasteners and plates** for mechanically-attached roof
> insulation, where the field, perimeter, and corner zones get denser patterns. Grep confirmed no roof-fastener tile
> (`shingle-nails` is field shingles, `metal-roof-panels` is panel screws). The number this settles: 100 field boards at
> 8, 20 perimeter at 12, and 5 corner at 16 is **1,120 fasteners** and plates -- the box count the uplift design drives.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
roofing siblings (`membrane-roof-takeoff`, `metal-roof-panels`): the board counts and per-board rates are dimensionless,
and the fastener and plate totals are dimensionless. The v18/v21 contract: a non-finite or negative board count or
per-board rate returns `{ error }`. Citation discipline (v19/v22): the fastener identity by name (fasteners = field
boards x field rate + perimeter boards x perimeter rate + corner boards x corner rate; plates = fasteners),
`GOVERNANCE.general`; the note states that the field, perimeter, and corner fastening densities come from the
manufacturer's wind-uplift design (FM or UL -- the user enters the pattern, no copyrighted uplift table reproduced), that
mechanically-attached membrane and board use one plate per fastener, and that this is distinct from the shingle and
panel fastener tiles.

## 2. The tile

### 2.1 `roof-insulation-fasteners` -- Roof Board Fastener and Plate Count by Zone

```
inputs:
  field_boards        boards in the field zone (count)
  field_per_board     fasteners per field board (count, default 8)
  perimeter_boards    boards in the perimeter zone (count)
  perimeter_per_board fasteners per perimeter board (count, default 12)
  corner_boards       boards in the corner zone (count)
  corner_per_board    fasteners per corner board (count, default 16)

fasteners = field_boards*field_per_board + perimeter_boards*perimeter_per_board + corner_boards*corner_per_board
plates    = fasteners
```

**Pinned worked example.** 100 field boards at 8, 20 perimeter at 12, 5 corner at 16:
`fasteners = 100*8 + 20*12 + 5*16 = 800 + 240 + 80 = ` **1,120**; `plates = ` **1,120**. Cross-check: a high-wind design
that raises the field pattern to 12 gives `100*12 + 240 + 80 = ` **1,520 fasteners** -- the field zone is the largest, so
its pattern dominates the box count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "construction"]`, inside the `// Group E` construction block near
`membrane-roof-takeoff`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (fasteners = sum of zone boards x zone rate; plates = fasteners, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the high-wind cross-check); `test/fixtures/compute-map.js`
(`roof-insulation-fasteners` -> `computeRoofInsulationFasteners`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `membrane-roof-takeoff` / `tapered-roof-insulation` / `metal-roof-panels`);
`data/search/aliases.json` (5 collision-checked aliases: "roof insulation fasteners", "iso board fasteners", "roof
fastener plate count", "membrane fasteners by zone", "roof board screws"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring a count renderer (non-exported, so no DOM-sentinel dims row), and the id added to
the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the fastener and plate totals and the
error seams (negative board counts or rates). The calc-construction.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,341 -> 1,342.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100*8 + 20*12 + 5*16 -> 1,120 fasteners).

## 5. Roadmap position

Roofing fastener takeoff beside `membrane-roof-takeoff` and `tapered-roof-insulation`, serving the commercial roofer
(roofing / construction). Stays evidence-driven; the manufacturer's uplift design sets the pattern.
