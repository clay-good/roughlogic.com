# roughlogic.com Specification v144 -- Category 3 Porous-Material Removal Scope and Disposal (calc-restoration.js, Group D, 1 New Tile)

> **Status: CUT as overlapping (2026-07-01, the 0.89.0 dupe vet: covered by the live flood-cut-quantity, carpet-restore-replace, and demo-debris tiles; will not be built; was PROPOSED 2026-06-23, DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v141..v145.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile sizing the full porous-material removal and
> disposal a Category 3 (grossly contaminated) loss requires, distinct from the wicking-height flood
> cut of a clean loss. Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or
> dependency. Inherits spec.md through spec-v143.md.
>
> **The gap, and the evidence for it.** The flood-cut takeoff (v136) sizes a partial-height cut for a
> Category 1 or 2 loss that will be dried in place. A Category 3 loss is different in kind: S500 calls
> for removing and disposing of contaminated porous materials -- carpet and pad, full-height affected
> drywall, batt insulation, and a saturated ceiling -- not drying them. The removed square footage by
> material and the disposal volume drive the dumpster, the bags, and the labor, yet no tile turns the
> room dimensions and the contamination call into that scope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Room
perimeter and ceiling height are `L`; floor area, removed drywall, flooring, and ceiling areas are
`L^2`; the 4x8 sheet area (32 ft^2) is `L^2`; the disposal volume is `L^3` (cubic yards); the
ceiling-removal flag is `dimensionless` (0/1). The loose-debris factor (cubic yards per 100 ft^2 of
mixed demolition) is an editable rule-of-thumb input. The v18/v21 contract: any non-finite input, or a
non-positive perimeter, height, or floor area returns `{ error }`; the only divisions are by the fixed
32 ft^2 sheet and the editable guarded-positive 100 ft^2 normalizer. Citation discipline (v19/v22):
`GOVERNANCE.general` over the S500 Category 3 remove-and-dispose practice, by name; the porous-material
scope, full PPE, and disposal regulation govern the actual job -- this is a quantity screen, not a
remediation protocol, and `mold-remediation-level` and `ppe` carry the safety side.

## 2. The tile

### 2.1 `category3-removal-scope` -- Category 3 Porous Removal and Disposal

```
inputs:
  room_perimeter_ft    L              affected wall run at the floor
  ceiling_height_ft    L              floor-to-ceiling (default 8) -- full-height drywall removal
  floor_area_ft2       L^2            carpet + pad + flooring footprint to remove
  remove_ceiling       dimensionless  saturated ceiling pulled, 0/1 (default 0)
  cy_per_100sf         L^3            editable disposal rule of thumb (default 1.0 cubic yard / 100 ft^2)

drywall_sf      = room_perimeter_ft x ceiling_height_ft         # full-height, affected faces
flooring_sf     = floor_area_ft2
ceiling_sf      = remove_ceiling ? floor_area_ft2 : 0
total_porous_sf = drywall_sf + flooring_sf + ceiling_sf
drywall_sheets  = ceil(drywall_sf / 32)                         # 4x8 replacement count
disposal_cy     = total_porous_sf / 100 x cy_per_100sf
```

**Pinned worked example.** A 40 ft perimeter room, 8 ft ceiling, 100 ft^2 floor, ceiling sound:
`drywall = 40 x 8 = 320 ft^2`; `flooring = 100 ft^2`; `ceiling = 0`; `total = 420 ft^2`;
`sheets = ceil(320/32) = 10`; `disposal = 420/100 x 1.0 = 4.2 cubic yards`.
**Cross-check (a saturated ceiling adds a floor's worth).** Set `remove_ceiling = 1`: `ceiling = 100
ft^2`, `total = 520 ft^2`, `disposal = 5.2 cubic yards` -- one floor area more of porous debris, as
expected. The contamination call and disposal rules govern; this is the quantity screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the Category 3 remove-and-dispose scope and the 32 ft^2
sheet, `editionNote` naming ANSI/IICRC S500, the porous-material caveat, and the not-a-protocol scope);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`category3-removal-scope` -> `computeCategory3Removal` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `flood-cut-takeoff` / `water-classes` / `ppe`);
`data/search/aliases.json` ("category 3", "black water", "sewage cleanup", "porous removal",
"disposal", "tear out scope"); the id appended to the existing `RESTORATION_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, the ceiling branch, and error seams (non-finite,
perimeter/height/floor area <= 0). Raise the `calc-restoration.js` size cap by ~20 percent if needed
(dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the ceiling branch); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-
material areas, sheet count, and cubic yards wrap on a phone); render-no-nan + a11y sweep, output read
to the value (40 ft / 8 ft / 100 ft^2 -> 420 ft^2, 10 sheets, 4.2 cubic yards).

## 5. Roadmap position

Completes the demolition front for the contaminated case, pairing the partial-height clean-loss cut
(v136) with the full porous removal of Category 3, and routing the safety side to `ppe`. Further Group D
growth stays evidence-driven.
