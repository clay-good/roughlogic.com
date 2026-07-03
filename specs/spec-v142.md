# roughlogic.com Specification v142 -- Extraction-vs-Dehumidification Trade and Extraction Time (calc-restoration.js, Group D, 1 New Tile)

> **Status: CUT as overlapping (2026-07-01, the 0.89.0 dupe vet: covered by the live evaporation-load plus dry-time-projection tiles; will not be built; was PROPOSED 2026-06-23, DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v141..v145.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile that quantifies the S500 first principle --
> extract water, do not evaporate it -- by converting gallons pulled by the wand into the
> dehumidifier-days they save and the time the extraction takes. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v141.md.
>
> **The gap, and the evidence for it.** `standing-water` gives the gallons and weight of water on the
> floor, and the dehumidifier tiles size the evaporation phase, but nothing connects them. S500 is
> explicit that mechanical extraction removes liquid water vastly more efficiently than
> dehumidification, and that aggressive extraction is the single highest-leverage action on a loss --
> a gallon left for the dehus to pull is days of equipment time. The conversion is arithmetic
> (8 pints per gallon, divided by effective dehumidifier output) plus extraction time from the
> extractor's flow, yet no tile shows the tech what each gallon extracted is worth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
extracted volume is `L^3` (gallons); the equivalent pints are `M/T`-free volume reported as pints; the
effective dehumidifier output is `M/T` (pints/day); the extractor flow is `L^3/T` (gal/min); the saved
dehumidifier-unit-days and the extraction time are derived. The 8 pints per US gallon is a dimensioned
constant from `pure-math.js` convention. The v18/v21 contract: any non-finite input, or a non-positive
gallons, dehumidifier output, or extractor flow returns `{ error }`; the divisions are by the
guarded-positive output and flow. Citation discipline (v19/v22): `GOVERNANCE.general` over the
extract-before-you-evaporate principle and the pint equivalence, by name; the dehumidifier-days figure
uses the operator's **effective** field output (see the derate tile), not a nameplate -- this is a
screen quantifying the trade, the loss conditions govern.

## 2. The tile

### 2.1 `extraction-efficiency` -- Extraction vs Dehumidification Trade and Time

```
inputs:
  gallons_extracted     L^3            liquid water recovered by the wand / pump
  dehu_pints_per_day    M/T            effective dehumidifier output for the equivalence (default 130)
  extractor_gpm         L^3/T          extraction flow at the wand (default 5)

pints_extracted       = gallons_extracted x 8
dehu_unit_days_saved  = pints_extracted / dehu_pints_per_day
extraction_time_min   = gallons_extracted / extractor_gpm
```

**Pinned worked example.** 50 gallons recovered, against a 130 ppd effective dehumidifier, 5 gpm
extractor: `pints = 50 x 8 = 400`; `dehu_unit_days_saved = 400 / 130 = 3.1 unit-days`;
`extraction_time = 50 / 5 = 10 min`. Ten minutes of extraction removes water a dehumidifier would
spend about three unit-days pulling -- the leverage S500 points at.
**Cross-check (it scales linearly).** Double the loss to 100 gallons: `800 pints`,
`800 / 130 = 6.2 unit-days saved`, `100 / 5 = 20 min`. Use the effective dehumidifier output, not the
nameplate; the loss conditions govern.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the extraction-vs-evaporation principle and the 8 pints/gal
equivalence, `editionNote` naming ANSI/IICRC S500 and the use-effective-output caveat, the screen
scope); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`extraction-efficiency` -> `computeExtractionEfficiency` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `standing-water` / `dehumidifier-derate` / `evaporation-load`);
`data/search/aliases.json` ("extraction", "extract vs dehumidify", "wand", "gallons recovered",
"dehumidifier days", "water removal efficiency"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams
(non-finite, gallons/output/flow <= 0). Raise the `calc-restoration.js` size cap by ~20 percent if
needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the pints, unit-days, and time
lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (50 gal / 130 ppd / 5 gpm
-> 400 pints, 3.1 unit-days, 10 min).

## 5. Roadmap position

Bridges the floor-water tile to the drying family and makes the S500 extraction principle quantitative.
Pairs with the derate tile (v138) whose effective output it consumes. Further Group D growth stays
evidence-driven.
