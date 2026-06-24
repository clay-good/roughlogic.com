# roughlogic.com Specification v136 -- Wicking-Height Flood Cut and Demolition Takeoff (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 620, package 0.75.0). Batch spec-v136..v140.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile turning a measured wicking line into the
> flood-cut demolition takeoff a tech writes on the wall before the saw comes out. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v135.md.
>
> **The gap, and the evidence for it.** The catalog sizes the drying (dehumidifier, air-movers,
> evaporation-load) but never the demolition that precedes it. Gypsum board wicks water above the
> standing line; S500 practice is to cut a few inches above the highest moisture reading, at a
> consistent 12 / 24 / 48 in flood-cut line, and pull the wet cavity insulation and baseboard behind
> it. The linear feet of cut, square feet of board removed, replacement sheet count, insulation area,
> and baseboard run are pure geometry off the wall perimeter and the cut height -- yet on the job they
> are eyeballed, so the dumpster and the board order are guessed. No tile estimates them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Wall
perimeter, cut height, and wicking height are `L`; removed-board and insulation areas are `L^2`; the
4x8 sheet area is `L^2`; the removed-face count and the insulation/baseboard flags are
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive perimeter or cut height,
or a removed-face count below 1 returns `{ error }`; there is no unguarded division (the sheet count
divides by the fixed 32 ft^2 sheet area). Citation discipline (v19/v22): `GOVERNANCE.general` over the
flood-cut practice, by name; the cut height is a screen and the **moisture meter governs** -- cut a
few inches above the highest reading, not at a round number. Standard 4x8 board is 32 ft^2 per
`standard-sizes.js` convention.

## 2. The tile

### 2.1 `flood-cut-takeoff` -- Wicking-Height Flood Cut and Demolition Takeoff

```
inputs:
  wall_perimeter_ft   L              affected wall run measured at the floor
  cut_height_in       L              flood-cut line above the floor (default 24; 12 / 24 / 48 common)
  removed_faces       dimensionless  board faces opened on the wet cavity (default 1; 2 for a wet partition)
  has_insulation      dimensionless  cavity insulation present, 0/1 (default 1)
  has_baseboard       dimensionless  baseboard / trim to pull, 0/1 (default 1)

cut_line_lf      = wall_perimeter_ft                                  # horizontal score cut to snap a chalk line
drywall_sf       = wall_perimeter_ft x (cut_height_in / 12) x removed_faces
drywall_sheets   = ceil(drywall_sf / 32)                             # 4x8 replacement sheets
insulation_sf    = has_insulation ? wall_perimeter_ft x (cut_height_in / 12) : 0
baseboard_lf     = has_baseboard  ? wall_perimeter_ft : 0
```

**Pinned worked example.** A 60 ft wall run, 24 in flood cut, one face open, insulation and baseboard
present: `cut_line = 60 lf`; `drywall = 60 x (24/12) x 1 = 120 ft^2`; `sheets = ceil(120/32) = 4`;
`insulation = 60 x 2 = 120 ft^2`; `baseboard = 60 lf`.
**Cross-check (lower line halves the board).** The same wall cut at the 12 in line:
`drywall = 60 x (12/12) x 1 = 60 ft^2`, `sheets = ceil(60/32) = 2` -- half the board and dumpster for
half the cut, as expected. The moisture meter sets the line; these are the resulting quantities.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the flood-cut takeoff geometry and the 32 ft^2 sheet,
`editionNote` naming ANSI/IICRC S500 and the meter-governs caveat, the cut-height-is-a-screen scope);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`flood-cut-takeoff` -> `computeFloodCutTakeoff` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `standing-water` / `evaporation-load` / `air-movers`);
`data/search/aliases.json` ("flood cut", "tear out", "demolition takeoff", "drywall removal",
"wicking height", "cut height", "baseboard removal"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams
(non-finite, perimeter/cut height <= 0, removed_faces < 1). Raise the `calc-restoration.js` size cap
by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the four takeoff lines wrap on
a phone); render-no-nan + a11y sweep, output read to the value (60 lf / 24 in / 1 face -> 120 ft^2, 4
sheets, 120 ft^2 insulation, 60 lf base).

## 5. Roadmap position

Opens the demolition front of the water family ahead of the drying tiles. Pairs with the structural
collapse screen (v137) and feeds the class screen (v139). Further Group D growth stays evidence-driven.
