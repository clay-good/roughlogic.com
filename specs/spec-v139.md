# roughlogic.com Specification v139 -- S500 Class-of-Loss Screen by Wetted-Surface Fraction (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 620, package 0.75.0). Batch spec-v136..v140.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile that turns the wetted-surface read of a
> room into a candidate S500 Class of water intrusion, the input every drying-load tile already
> assumes. Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency.
> Inherits spec.md through spec-v138.md.
>
> **The gap, and the evidence for it.** The catalog's `evaporation-load`, `air-movers`, and
> `dehumidifier` tiles all take a water **Class** as an input, and the existing `water-classes` tile
> is a reference card listing what the four Classes mean -- but nothing turns the field observation
> (how much of the floor and wall is wet, how high it wicked, whether the wet materials are
> low-evaporation) into the Class to feed the others. S500 keys the Class to the affected surface
> area, the wick height above 24 in, and the presence of low-evaporation assemblies (hardwood,
> plaster, lightweight concrete, masonry -> specialty Class 4). The classification is the inspector's
> judgment; a deterministic screen from the fractions gives a defensible starting point, not a verdict.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
floor and wall wetted fractions are `dimensionless` and bounded 0..1; the wick height is `L`; the
low-evaporation flag is `dimensionless` (0/1); the output Class is a `dimensionless` integer 1..4.
The v18/v21 contract: any non-finite input, a fraction outside [0, 1], or a negative wick height
returns `{ error }`; there is no division. Citation discipline (v19/v22): `GOVERNANCE.general` over
the S500 Class definitions and the 24 in wick threshold, by name; the **inspector's classification
governs** and a moisture map must confirm it -- this is a screen that proposes a Class and states the
rationale, it does not certify one. Thresholds are deterministic and editable where S500 leaves a
judgment band.

## 2. The tile

### 2.1 `class-of-loss-screen` -- S500 Class of Water Loss by Wetted-Surface Fraction

```
inputs:
  floor_wet_fraction   dimensionless  0..1 portion of floor area wet
  wall_wet_fraction    dimensionless  0..1 portion of wall area wet
  wick_height_ft       L              highest wicking up the walls
  low_evap_materials   dimensionless  hardwood / plaster / lightweight concrete / masonry wet, 0/1

# deterministic screen, evaluated top-down (first match wins):
class = 4  if low_evap_materials                                    # specialty drying
        3  if wick_height_ft > 2.0  or  wall_wet_fraction >= 0.40   # >24 in wick / much wall + overhead
        2  if floor_wet_fraction >= 0.40                            # whole-room floor + pad wet, low wick
        1  otherwise                                                # small affected area, low porosity
# output: class, a rationale string, and the matching per-class evaporation factor to feed evaporation-load
```

**Pinned worked example.** Whole-floor loss, modest wall wetting, low wick, ordinary materials --
`floor 1.0`, `wall 0.30`, `wick 1.5 ft`, `low_evap 0`: not low-evaporation, wick `<= 2.0` and wall
`< 0.40`, floor `>= 0.40` -> **Class 2** ("entire floor and pad wet, wicking under 24 in").
**Cross-check (height and material each escalate).** Raise the wick to `3.0 ft` (> 2.0) -> **Class
3**; instead flag a wet oak floor (`low_evap 1`) -> **Class 4** regardless of the fractions, the
specialty-drying case the desiccant tile (v140) serves. The screen proposes; the moisture map and the
inspector confirm.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the S500 Class definitions and the 24 in threshold,
`editionNote` naming ANSI/IICRC S500 and the inspector-governs caveat, the screen-not-a-verdict
scope); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`class-of-loss-screen` -> `computeWaterClassScreen` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `water-classes` / `evaporation-load` / `air-movers`);
`data/search/aliases.json` ("class of water", "water loss class", "class 1 2 3 4", "wicking
height", "specialty drying", "category vs class"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, the four class branches,
and error seams (non-finite, fraction outside [0,1], negative wick). Raise the `calc-restoration.js`
size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, all four branches exercised); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
class verdict and rationale wrap on a phone); render-no-nan + a11y sweep, output read to the value
(floor 1.0 / wall 0.30 / wick 1.5 / low_evap 0 -> Class 2 with rationale).

## 5. Roadmap position

Becomes the computed front-door of the drying family: it produces the Class the load, air-mover, and
dehumidifier tiles consume, and routes Class 4 losses to desiccant (v140). Further Group D growth stays
evidence-driven.
