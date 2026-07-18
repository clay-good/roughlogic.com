# roughlogic.com Specification v921 -- Concrete Isolation-Joint Filler Takeoff (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v920.md. Concrete slab-on-grade takeoff sweep,
> beside the accepted `concrete-sawcut-footage` (control-joint) tile.
>
> **The gap, and the evidence for it.** The catalog takes off the sawn CONTROL joints (`concrete-sawcut-footage`) but
> nothing counts the ISOLATION-joint filler. Grep confirmed no isolation-joint tile (the only "isolation" hit is a
> pipefitting EJMA guide). Every slab-on-grade is isolated from its columns and perimeter. The number this settles: a 40
> x 30 ft slab around six 12 in columns takes **164 LF** of filler (17 ten-foot strips).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
concrete-joint tile: the slab dimensions, perimeters, and filler carry `L`, and the column count and strips are
dimensionless. The v18/v21 contract: a non-finite or non-positive slab dimension or strip length, or a negative column
count or column perimeter, returns `{ error }`. Citation discipline (v19/v22): the isolation-joint takeoff by name
(filler = 2 x (L + W) + columns x column-perimeter; strips = ceil(filler / strip length)), `GOVERNANCE.general`; the note
states that pre-molded filler (usually 1/2 in fiber or foam) wraps a slab wherever it abuts a rigid element -- the
perimeter against walls and footings plus the full perimeter of each column, pier, or pad the slab surrounds -- that this
is DISTINCT from the sawn control joints that relieve shrinkage within the field, and that the ACI 302 / ACI 360
slab-on-grade details govern the joint locations and the filler type.

## 2. The tile

### 2.1 `concrete-isolation-joint` -- Concrete Isolation-Joint Filler Takeoff

```
inputs:
  slab_length_ft       slab length (ft)
  slab_width_ft        slab width (ft)
  num_columns          columns / piers the slab surrounds (default 6)
  column_perimeter_ft  perimeter per column (ft, 12 in square = 4, default 4)
  strip_length_ft      filler strip length (ft, default 10)

slab_perimeter_ft   = 2 x (slab_length_ft + slab_width_ft)
column_isolation_ft = round(num_columns) x column_perimeter_ft
filler_lf           = slab_perimeter_ft + column_isolation_ft
strips              = ceil(filler_lf / strip_length_ft)
```

**Pinned worked example.** 40 x 30 ft slab, six 12 in columns (4 ft perimeter each), 10 ft strips:
`perimeter = 2 x (40 + 30) = 140`; `columns = 6 x 4 = 24`; `filler = ` **164 LF**; `strips = ceil(164/10) = ` **17**.
Cross-check: a 50 x 40 ft slab with no interior columns is `2 x (50 + 40) = ` **180 LF**, 18 strips -- the columns add a
full perimeter of filler each, on top of the slab perimeter.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, beside `curing-compound-coverage`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (isolation-joint takeoff, ACI 302 / 360, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the with-columns example plus the no-column cross-check, pinning the filler LF and
strips); `test/fixtures/compute-map.js` (`concrete-isolation-joint` -> `computeConcreteIsolationJoint`, module
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `concrete-sawcut-footage` / `control-joint-spacing` /
`sealant-joint-yield`); `data/search/aliases.json` (5 collision-checked aliases: "isolation joint filler", "concrete
isolation joint", "expansion joint filler", "slab isolation joint", "isolation joint takeoff"), then
`node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `CONCRETE_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-concrete declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the perimeter, column isolation, filler, and strips across the two cases and the error seams (non-positive slab
dims / strip length, negative columns / column perimeter, non-finite). The calc-concrete.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,369 -> 1,370.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2 x (40 + 30) + 6 x 4 -> 164 LF, 17 strips).

## 5. Roadmap position

Concrete slab-on-grade takeoff beside `concrete-sawcut-footage`, serving the concrete finisher / GC (concrete /
construction). Deliberately a material takeoff; ACI 302 / ACI 360 and the structural detail govern the joint locations
and the filler type. Stays evidence-driven. Continues the slab-on-grade takeoff sweep at 1 new spec (v921).
