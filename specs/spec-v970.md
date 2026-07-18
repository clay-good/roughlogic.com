# roughlogic.com Specification v970 -- Foundation Waterproofing / Dampproofing Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v969.md. Waterproofing takeoff sweep, beside the
> accepted `housewrap-rolls` and `coating-coverage-dft` tiles.
>
> **The gap, and the evidence for it.** The catalog has housewrap, vapor barrier, and generic coating (SSPC PA 2)
> takeoffs, but nothing for below-grade foundation waterproofing/dampproofing. Grep confirmed no waterproofing /
> dampproofing tile. Every waterproofer and foundation crew takes it off. The number this settles: a 150 ft perimeter,
> 8 ft below grade wall at 50 sf/gal takes **27 gallons**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a count from feet and a coverage rate), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive perimeter /
height / coverage, or a negative waste returns `{ error }`. Citation discipline (v19/v22): the waterproofing takeoff by
name, `GOVERNANCE.general`; the note stresses that coverage varies widely between DAMPPROOFING (~40-60 sf/gal, IRC
R406.1) and a fluid-applied WATERPROOFing membrane at a wet-mil thickness (IRC R406.2), that sheet membrane is ordered by
the roll, and that the product data sheet, the assembly detail, and IRC R406 and the AHJ govern.

## 2. The tile

### 2.1 `foundation-waterproofing-takeoff` -- Foundation Waterproofing / Dampproofing Takeoff

```
inputs:
  perimeter_ft          foundation perimeter (ft), default 150
  below_grade_height_ft average below-grade wall height (ft), default 8
  coverage_sf_per_gal   product coverage (sf/gal, from the data sheet), default 50
  waste_pct             waste (percent), default 10

wall_area_sf = perimeter_ft x below_grade_height_ft
gallons      = ceil(wall_area_sf x (1 + waste_pct/100) / coverage_sf_per_gal)
pails_5gal   = ceil(gallons / 5)
```

**Pinned worked example.** 150 ft perimeter, 8 ft below grade, 50 sf/gal, 10% waste: area = `150 x 8 = ` **1,200 sf**,
gallons = `ceil(1200 x 1.10/50) = ceil(26.4) = ` **27 gal** (6 five-gallon pails). Cross-check: a thicker fluid membrane
at **25 sf/gal** doubles the product to `ceil(1200 x 1.10/25) = ` **53 gal**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["waterproofing", "construction"]`, beside `concrete-sawcut-footage`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (waterproofing takeoff / IRC R406, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 50 sf/gal example plus the thicker-membrane cross-check, pinning the area and
gallons); `test/fixtures/compute-map.js` (`foundation-waterproofing-takeoff` -> `computeFoundationWaterproofingTakeoff`,
module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `housewrap-rolls` / `coating-coverage-dft` /
`concrete`); `data/search/aliases.json` (5 collision-checked aliases: "foundation waterproofing", "dampproofing
takeoff", "waterproofing gallons", "below grade coating", "foundation coating"), then `node scripts/build-alias-
shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the `CONSTRUCTION_RENDERERS` map, and the id added
to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the area/gallons/pails, the lower-coverage
and bigger-wall directions, the zero-waste count, and the error seams. The calc-construction.js gzip cap and the Group E
group shell are watched at build (cap raised for this tile). Home tile count 1,418 -> 1,419.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(150 / 8 / 50 / 10% -> 1,200 sf, 27 gal).

## 5. Roadmap position

Waterproofing takeoff beside `housewrap-rolls`, serving the waterproofer / foundation crew (waterproofing /
construction). Deliberately the fluid-applied gallons estimate; the product data sheet coverage, the dampproofing-vs-
waterproofing code distinction (IRC R406), the sheet-membrane roll alternative, the full assembly detail, and the AHJ
govern. Stays evidence-driven. Continues the waterproofing takeoff sweep at 1 new spec (v970).
