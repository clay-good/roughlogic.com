# roughlogic.com Specification v368 -- Masonry Wall Dead Load (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.129.0). Batch spec-v368..v370 (the masonry loading/detailing trio -- the weight
> and detail numbers the structural CMU member tiles assume: the masonry wall dead load (this spec), the brick-veneer
> anchor spacing (v369), and the arching-action load on a masonry lintel (v370).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the `cmu-wall-*` tiles design masonry members and
> `masonry-count`/`mortar-mix` take off materials, but nothing computes the wall's own dead load -- the pounds per square
> foot a foundation, a lintel, or a floor must carry, which depends on the unit weight class and how much of the wall is
> grouted. Adds one tile to the existing **`calc-masonry.js`** module (Group E); no new group, trade, or dependency.
> Inherits spec.md through spec-v367.md.
>
> **The gap, and the evidence for it.** A masonry wall's weight is the hollow-unit wall weight plus the grout in the grouted
> cells: `wall_psf = hollow_psf + grout_adder_psf x (cell_spacing / grout_spacing)`, where the hollow wall weight (per NCMA
> tables, ~33-55 psf for 8 in CMU by density class) and the full-grout adder (~29 psf for 8 in) come from the unit data, and
> the grout term scales with how closely the cells are grouted (full grout at the 8 in cell spacing, less at wider
> reinforcement spacing). For an 8 in normal-weight CMU wall (`55 psf` hollow, `29 psf` full-grout adder) grouted at 48 in
> on center, the grout adds `29 x 8/48 = 4.8 psf` for `59.8 psf`; fully grouted it is `84 psf`. Times the wall height, that
> is the line load a lintel or footing carries -- a 10 ft tall fully grouted wall puts `840 lb/ft` on its support. The member
> tiles size the wall; this tile weighs it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The hollow wall weight, the
full-grout adder, and the resulting wall weight are pressures (psf); the cell and grout spacings are lengths (in); the wall
height is a length (ft); the line load is a force per length (lb/ft); the wall area (optional) gives a total force (lb). The
v18/v21 contract: any non-finite input, or a weight or spacing at or below zero, returns `{ error }`; a grout spacing
tighter than the cell spacing is capped at full grout. Citation discipline (v19/v22): `GOVERNANCE.general` over the masonry
dead-load buildup by name; `editionNote` names **the wall weight `hollow_psf + grout_adder_psf x (cell_spacing/grout_spacing)`
(capped at full grout), the NCMA TEK 14-13 hollow and grouted wall weights by unit thickness and density class (lightweight/
medium/normal), the ~140 pcf grout density, and the line load `= wall_psf x height`**, and states that **this returns the
masonry wall dead load per area, per linear foot, and total -- it uses the entered NCMA table values for the unit weight
class (get them from the table for the actual unit) and a uniform grout spacing, and does not add finishes, veneer, or the
self-weight of bond beams beyond the grout term; and this is a load-takeoff aid, not a structural design** -- the structural
engineer of record and the unit data govern.

## 2. The tile

### 2.1 `masonry-wall-weight` -- Masonry Wall Dead Load

```
inputs:
  hollow_psf     psf   hollow wall weight (NCMA table, by thickness/density)
  grout_adder    psf   full-grout weight adder (NCMA table)
  cell_spacing   in    grouted-cell spacing at full grout (8 for CMU)
  grout_spacing  in    grout/reinforcement spacing (or "full"/"none")
  height_ft      ft    wall height (for line load)
  area_ft2       ft^2  wall area (optional, for total)

grout_term = grout_adder * min(cell_spacing/grout_spacing, 1)   ; 0 if ungrouted
wall_psf = hollow_psf + grout_term
line_load = wall_psf * height_ft                                  ; lb/ft
total_lb  = wall_psf * area_ft2                                   ; lb (if area given)
```

**Pinned worked example (8 in normal-weight CMU, grouted at 48 in o.c., 10 ft tall).** `hollow = 55`, `grout_adder = 29`,
`cell = 8`, `grout_spacing = 48`: `grout_term = 29 x 8/48 = 4.8 psf`; `wall = 59.8 psf`; line load `= 59.8 x 10 = 598 lb/ft`.
**Cross-check (fully grout the same wall).** `grout_spacing = 8` (full): `grout_term = 29 psf` (capped); `wall = 84 psf`;
line load `= 840 lb/ft` -- fully grouting adds 40% to the wall's weight and its load on the footing, the trade a designer
makes between reinforcement/strength and dead load. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry","construction"]`, matching the `cmu-wall-*` tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the masonry dead-load buildup, `editionNote` naming the
wall-weight formula, the NCMA TEK 14-13 basis, the grout density, the line load, and the enter-table-values, no-finishes
caveats); `test/fixtures/worked-examples.json` (the partial-grout example + the full-grout cross-check);
`test/fixtures/compute-map.js` (`masonry-wall-weight` -> `computeMasonryWallWeight` in `../../calc-masonry.js`);
`scripts/related-tiles.mjs` (-> `cmu-wall-axial` / `cmu-grout-volume` / `masonry-count` / `masonry-lintel-loading`);
`data/search/aliases.json` ("masonry wall weight", "CMU wall dead load", "block wall psf", "masonry dead load", "grouted
wall weight", "wall load per foot", "CMU pounds per square foot", "masonry self weight", "wall weight foundation"); the id
appended to the existing masonry renderers block in `app.js`; the `// dims:` annotation (weights pressure, spacings length,
height length, line load force/length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the grout-spacing term and full-grout cap, the line load, and the non-positive / non-finite error seams. No new
module; re-pin `calc-masonry.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the grout-cap assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `wall_psf` / line load / total stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (8 in NW at 48 in o.c. -> 59.8 psf, 598 lb/ft).

## 5. Roadmap position

Opens the masonry loading/detailing batch (v368..v370) in `calc-masonry.js`, weighing the wall the member tiles design.
The brick-veneer anchor spacing (v369) and the lintel arching load (v370) follow. An NCMA unit-weight-class table lookup by
thickness and density, a finishes/veneer add-on, and a chain into `cmu-wall-axial` for the self-weight axial demand are the
deliberate next follow-ons once the trio lands.
