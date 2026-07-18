# roughlogic.com Specification v986 -- Ballasted Roof Ballast Weight and Order (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v985.md. Roofing-takeoff sweep, beside
> `membrane-roof-takeoff` and `roofing-squares`.
>
> **The gap, and the evidence for it.** The catalog has membrane, underlayment, and insulation-fastener takeoffs, and a
> PV-array ballast screen, but nothing for the LOOSE STONE on a ballasted single-ply roof -- its dead load and its
> order quantity. Grep confirmed no roof-ballast tile (`pv-ballast-weight` is a solar-array screen). The number this
> settles: 5,000 sf at 12 psf is **60,000 lb (30 tons)**, or about **22 cubic yards** of gravel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, like the sibling takeoff tiles), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive area,
ballast rate, or stone density returns `{ error }`. Citation discipline (v19/v22): the ballasted single-ply roof
ballast weight and order by name (ANSI/SPRI RP-4), `GOVERNANCE.general`; the note stresses that RP-4 sets the ballast
RATE by building height, roof-edge/parapet condition, and wind zone (corners and perimeter heavier), and that this is a
dead-load and ordering screen, not a wind-uplift design -- RP-4 and the structural engineer govern.

## 2. The tile

### 2.1 `roof-ballast-weight` -- Ballasted Roof Ballast Weight and Order

```
inputs:
  roof_area_sqft     roof area (sq ft), default 5000
  ballast_psf        ballast rate (psf, per RP-4 zone), default 12
  stone_density_pcf  stone loose bulk density (pcf), default 100

total_ballast_lb = roof_area_sqft x ballast_psf
total_tons       = total_ballast_lb / 2000
stone_depth_in   = ballast_psf / stone_density_pcf x 12
volume_cy        = total_ballast_lb / stone_density_pcf / 27
```

**Pinned worked example.** 5,000 sf at 12 psf, 100 pcf gravel: `total = 60,000 lb` = **30 tons**; `volume = 60000 /
100 / 27 = ` **22.2 cu yd**, spread `12/100 x 12 = ` **1.44 in** deep. Cross-check: a 10,000 sf roof at a 15 psf
high-wind-zone rate with 95 pcf stone: `total = 150,000 lb` = **75 tons**, `volume = ` **58.5 cu yd**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing"]`, beside `foundation-waterproofing-takeoff`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (ANSI/SPRI RP-4 ballast weight and order, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the high-wind cross-check, pinning weight, tons, volume,
and depth); `test/fixtures/compute-map.js` (`roof-ballast-weight` -> `computeRoofBallastWeight`, module
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `membrane-roof-takeoff` / `roof-insulation-fasteners` /
`roofing-squares`); `data/search/aliases.json` (5 collision-checked aliases: "roof ballast", "ballasted roof",
"ballast weight", "roof gravel", "epdm ballast"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by
the `_simpleRenderer` factory in the `CONSTRUCTION_RENDERERS` map, and the id added to the calc-construction declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the area/rate/density monotonic directions,
and the error seams. The calc-construction.js gzip cap and the Group E group shell are watched at build (cap raised for
this tile). Home tile count 1,434 -> 1,435.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5,000 sf x 12 psf -> 60,000 lb, 22.2 cu yd).

## 5. Roadmap position

Roofing takeoff beside `membrane-roof-takeoff`, serving the roofer / estimator (roofing). Deliberately the dead-load
and ordering screen; ANSI/SPRI RP-4 and the structural engineer set the ballast rate and the corner/perimeter zone
layout, and the deck capacity governs. Stays evidence-driven. Continues the roofing-takeoff sweep at 1 new spec (v986).
