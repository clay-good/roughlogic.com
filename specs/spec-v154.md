# roughlogic.com Specification v154 -- Contents Pack-Out Volume, Boxes, and Storage (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.85.0; was PROPOSED 2026-06-23). Vetted-novel subset of the fire & smoke restoration batch. Batch spec-v151..v156.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one restoration estimating tile turning an affected room's contents
> into the boxes, storage volume, and truck loads a pack-out requires. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v153.md.
>
> **The gap, and the evidence for it.** Serious fire and water losses begin with a pack-out: the
> contents come out so the structure can be cleaned and dried, and the estimator has to forecast the
> boxes to bring, the climate storage to reserve, and the truck loads to schedule. Those follow from
> the contents volume (commonly estimated as a density per floor area) divided by box and truck
> capacities, with a stacking allowance for the warehouse. The catalog sizes demolition and cleaning
> but has nothing for the contents side of the job.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The floor
area is `L^2`; the contents density is `L` (ft^3 of contents per ft^2 of floor); the contents, box,
storage, and truck volumes are `L^3`; the stacking factor is `dimensionless`; the box and truck counts
are `dimensionless`. The defaults (2 ft^3/ft^2 contents, 3 ft^3 box, 1.5 stacking, 1,000 ft^3 truck)
are editable estimating rules of thumb. The v18/v21 contract: any non-finite input, or a non-positive
floor area, density, box volume, stacking factor, or truck volume returns `{ error }`; the divisions
are by the guarded-positive box and truck volumes. Citation discipline (v19/v22): `GOVERNANCE.general`
over the volume-based pack-out estimating method, by name; `editionNote` notes that **the actual
inventory and the box mix govern** and the densities are starting rules of thumb -- this is an
estimating screen.

## 2. The tile

### 2.1 `contents-packout-inventory` -- Pack-Out Volume, Boxes, and Storage

```
inputs:
  floor_area_ft2          L^2            affected room / structure floor area
  contents_ft3_per_ft2    L              contents volume per floor area (default 2.0)
  box_volume_ft3          L^3            usable volume per box (default 3.0)
  stacking_factor         dimensionless  warehouse aisle / stacking allowance (default 1.5)
  truck_volume_ft3        L^3            box-truck cargo volume (default 1000)

contents_volume_ft3 = floor_area_ft2 x contents_ft3_per_ft2
boxes               = ceil(contents_volume_ft3 / box_volume_ft3)
storage_volume_ft3  = contents_volume_ft3 x stacking_factor
truck_loads         = ceil(storage_volume_ft3 / truck_volume_ft3)
```

**Pinned worked example.** A 200 ft^2 furnished living room at 2.0 ft^3/ft^2, 3 ft^3 boxes, 1.5
stacking, 1,000 ft^3 truck: `contents = 200 x 2.0 = 400 ft^3`; `boxes = ceil(400/3) = 134`;
`storage = 400 x 1.5 = 600 ft^3`; `truck_loads = ceil(600/1000) = 1`.
**Cross-check (scales to a whole house).** A 1,500 ft^2 home at the same rates: `contents = 3,000
ft^3`; `boxes = ceil(3000/3) = 1,000`; `storage = 4,500 ft^3`; `truck_loads = ceil(4500/1000) = 5`. The
actual inventory governs; this is the estimating screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the volume-based pack-out method, `editionNote` naming
restoration estimating practice and the inventory-governs / rules-of-thumb caveat);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`contents-packout-inventory` -> `computeContentsPackoutInventory` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `soot-cleaning-takeoff` / `category3-removal-scope` / `ppe`);
`data/search/aliases.json` ("pack out", "packout", "contents", "box count", "storage volume", "truck
loads"); the id appended to the existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example,
cross-check, and error seams (non-finite, area / density / box / stacking / truck <= 0). Raise the
`calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the contents, boxes, storage,
and truck lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (200 ft^2 / 2.0
/ 3 / 1.5 / 1000 -> 400 ft^3, 134 boxes, 600 ft^3, 1 truck).

## 5. Roadmap position

Adds the contents side of the loss alongside the structural demolition and cleaning takeoffs. Further
Group D growth stays evidence-driven.
