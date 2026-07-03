# roughlogic.com Specification v155 -- Hardwood Floor Drying-Mat System Sizing (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED (2026-07-01, package 0.89.0; was PROPOSED 2026-06-23, DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v151..v156.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one specialty water-restoration tile sizing a hardwood-floor drying-mat
> system, the Class 4 deep-drying method the catalog routes to but never sizes. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v154.md.
>
> **The gap, and the evidence for it.** The class screen (v139) flags wet hardwood as Class 4 specialty
> drying, and the desiccant tile (v140) handles the air side, but saving a wet wood floor without
> tearing it out is done with a mat system: panels laid on the floor and pulled by a suction unit that
> draws moisture up through the boards. The job is sized by floor area against per-mat coverage and the
> number of mats a suction unit can drive. No tile gives the mat and unit count, so the specialty job
> the catalog identifies has no equipment sizing to land on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The floor
area and the per-mat coverage are `L^2`; the mats-per-unit, mats-needed, and suction-unit counts are
`dimensionless`. The per-mat coverage and mats-per-unit defaults are editable to the system in use. The
v18/v21 contract: any non-finite input, or a non-positive floor area, mat coverage, or mats-per-unit
returns `{ error }`; the divisions are by the guarded-positive mat coverage and mats-per-unit.
Citation discipline (v19/v22): `GOVERNANCE.general` over the mat-system sizing, by name; `editionNote`
names ANSI/IICRC S500 Class 4 specialty drying and states that **the mat-system manufacturer's coverage
and unit ratings govern** and that subfloor construction and finish affect feasibility -- this is a
screen.

## 2. The tile

### 2.1 `hardwood-floor-drying-mat` -- Mat System Sizing

```
inputs:
  floor_area_ft2    L^2            wet hardwood floor area
  mat_coverage_ft2  L^2            area one drying mat covers (default 6)
  mats_per_unit     dimensionless  mats a single suction unit drives (default 16)

mats_needed   = ceil(floor_area_ft2 / mat_coverage_ft2)
suction_units = ceil(mats_needed / mats_per_unit)
```

**Pinned worked example.** A 120 ft^2 wet oak floor, 6 ft^2 per mat, 16 mats per unit:
`mats_needed = ceil(120/6) = 20`; `suction_units = ceil(20/16) = 2`.
**Cross-check (a small room fits one unit).** A 60 ft^2 floor: `mats_needed = ceil(60/6) = 10`;
`suction_units = ceil(10/16) = 1`. The manufacturer's mat coverage and unit ratings govern; this sizes
the system.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the mat-system sizing, `editionNote` naming ANSI/IICRC S500
Class 4 specialty drying and the manufacturer-ratings-govern caveat); `test/fixtures/worked-
examples.json` (example + cross-check); `test/fixtures/compute-map.js` (`hardwood-floor-drying-mat` ->
`computeHardwoodFloorDryingMat` in `../../calc-restoration.js`); `scripts/related-tiles.mjs` (->
`class-of-loss-screen` / `desiccant-airflow-sizing` / `wood-emc`); `data/search/aliases.json`
("hardwood drying", "floor mat system", "specialty drying", "wood floor water", "panel drying", "class
4"); the id appended to the existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example,
cross-check, and error seams (non-finite, area / coverage / mats-per-unit <= 0). Raise the
`calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the mats and units lines wrap on
a phone); render-no-nan + a11y sweep, output read to the value (120 ft^2 / 6 / 16 -> 20 mats, 2 units).

## 5. Roadmap position

Gives the Class 4 specialty case (flagged by v139) its floor-side equipment sizing, beside the desiccant
air-side tile (v140). Further Group D growth stays evidence-driven.
