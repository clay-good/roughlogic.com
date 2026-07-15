# roughlogic.com Specification v899 -- Pool Gunite Shell and Plaster Volume (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v898.md. Pool sweep, beside `pool-volume` and
> `pool-tile-coping-perimeter`.
>
> **The gap, and the evidence for it.** `pool-volume` gives the water but nothing gives the **shell and plaster** -- the
> gunite for the structure and the plaster for the finish, both driven by the interior surface area. Grep confirmed no
> pool-shell / pool-plaster tile. The number this settles: a 15 x 30 ft pool averaging 5.5 ft deep has **945 sf** of
> interior, so an 8 in gunite shell is **26.8 cy** and a 3/8 in plaster coat is **1.1 cy** -- the two pours a pool takes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group M pool
siblings (`pool-volume`, `pool-tile-coping-perimeter`): the length, width, average depth, and thicknesses carry `L`, the
waste is dimensionless, the interior area is `L^2`, and the volumes are `L^3`. The v18/v21 contract: a non-finite or
non-positive length, width, average depth, shell thickness, or plaster thickness returns `{ error }`; a negative waste
returns `{ error }`. Citation discipline (v19/v22): the interior-finish identity by name (interior = length x width +
2 x (length + width) x average depth; gunite = interior x shell / 27 x (1 + waste); plaster = interior x plaster / 27),
`GOVERNANCE.general`; the note states that the shell (gunite or shotcrete) and plaster thicknesses come from the spec,
that gunite rebound is on top of the neat volume (see `shotcrete-rebound-quantity`), that the average depth is the
volumetric average of the shallow and deep ends, and that this is distinct from the water `pool-volume`.

## 2. The tile

### 2.1 `pool-interior-finish-volume` -- Pool Gunite Shell and Plaster Volume

```
inputs:
  length_ft             pool length (ft)
  width_ft              pool width (ft)
  avg_depth_ft          average depth (ft)
  shell_thickness_in    gunite shell thickness (in, default 8)
  plaster_thickness_in  plaster thickness (in, default 0.375)
  waste_pct             gunite waste allowance (percent, default 15)

interior_area_sf = length_ft * width_ft + 2 * (length_ft + width_ft) * avg_depth_ft
gunite_cy        = interior_area_sf * (shell_thickness_in/12) / 27 * (1 + waste_pct/100)
plaster_cy       = interior_area_sf * (plaster_thickness_in/12) / 27
```

**Pinned worked example.** Pool 15 x 30 ft, average 5.5 ft, 8 in shell, 3/8 in plaster, 15% waste:
`interior = 15*30 + 2*(15+30)*5.5 = 450 + 495 = ` **945 sf**; `gunite = 945*(8/12)/27*1.15 = ` **26.8 cy**;
`plaster = 945*(0.375/12)/27 = ` **1.09 cy**. Cross-check: a deeper 7 ft average grows the interior to
`450 + 2*45*7 = 1,080 sf` and the gunite to `1080*(8/12)/27*1.15 = ` **30.6 cy** -- the wall area, and so the shell,
climbs with depth.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service", "construction"]`, inside the `// Group M` block beside
`pool-tile-coping-perimeter`) -- the Group M citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`M`);
a `citations.js` entry (interior = floor + perimeter x avg depth; gunite = interior x shell / 27, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the deeper-pool cross-check); `test/fixtures/compute-map.js`
(`pool-interior-finish-volume` -> `computePoolInteriorFinishVolume`, module `../../calc-treatment.js`);
`scripts/related-tiles.mjs` (-> `pool-volume` / `pool-tile-coping-perimeter` / `shotcrete-rebound-quantity`);
`data/search/aliases.json` (5 collision-checked aliases: "pool gunite volume", "pool shell concrete", "pool plaster
volume", "pool shotcrete cy", "pool interior finish"); a hand-written renderer in the `TREATMENT_RENDERERS` map mirroring
a simple output renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-treatment declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning the interior area, gunite and plaster volumes, and the error seams (non-positive
length, width, avg depth, shell, plaster; negative waste). The calc-treatment.js gzip cap is watched at build. Verify at
build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile
count 1,347 -> 1,348.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group M audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((450 + 495)*(8/12)/27*1.15 -> 26.8 cy gunite).

## 5. Roadmap position

Pool takeoff beside `pool-volume` (water) and `pool-tile-coping-perimeter` (perimeter), serving the pool builder
(pool-service / construction), and links to `shotcrete-rebound-quantity` for the gunite rebound. Stays evidence-driven;
the spec sets the thicknesses.
