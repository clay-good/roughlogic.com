# roughlogic.com Specification v898 -- Pool Waterline Tile and Coping Perimeter Takeoff (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v897.md. Pool sweep, beside `pool-volume`.
>
> **The gap, and the evidence for it.** `pool-volume` gives the water but nothing takes off the **waterline tile and
> coping** around the perimeter. Grep confirmed no pool-tile / coping tile. The number this settles: a 16 x 32 ft pool has
> a 96 ft perimeter, so a single course of 6 in tile is **192 tiles** and 12 in coping is **96 units** (about 212 and 106
> with waste) -- the perimeter material order.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group M pool
sibling (`pool-volume`): the pool length, width, tile length, and coping length carry `L`, the courses and waste are
dimensionless, the perimeter is `L`, and the tile and coping counts are dimensionless. The v18/v21 contract: a non-finite
or non-positive length, width, tile length, courses, or coping length returns `{ error }`; a negative waste returns
`{ error }`. Citation discipline (v19/v22): the perimeter-takeoff identity by name (perimeter = 2 x (length + width);
tiles = ceil(perimeter / tile length x courses x (1 + waste)); coping = ceil(perimeter / coping length x (1 + waste))),
`GOVERNANCE.general`; the note states that the perimeter is the rectangular case (a freeform pool is measured on the
tape), that the waterline tile runs in courses (commonly one course of 6 in tile), that coping caps the bond beam, that
the waste covers cuts at corners and steps, and that this is distinct from the water-volume `pool-volume`.

## 2. The tile

### 2.1 `pool-tile-coping-perimeter` -- Pool Waterline Tile and Coping Perimeter Takeoff

```
inputs:
  length_ft        pool length (ft)
  width_ft         pool width (ft)
  tile_length_in   waterline tile length (in, default 6)
  courses          waterline tile courses (count, default 1)
  coping_length_in coping unit length (in, default 12)
  waste_pct        waste allowance (percent, default 10)

perimeter_ft    = 2 * (length_ft + width_ft)
waterline_tiles = ceil(perimeter_ft / (tile_length_in/12) * courses * (1 + waste_pct/100))
coping_units    = ceil(perimeter_ft / (coping_length_in/12) * (1 + waste_pct/100))
```

**Pinned worked example.** Pool 16 x 32 ft, 6 in tile, 1 course, 12 in coping, 10% waste:
`perimeter = 2*(16+32) = ` **96 ft**; `tiles = ceil(96/0.5*1*1.10) = ceil(211.2) = ` **212** (192 neat);
`coping = ceil(96/1*1.10) = ceil(105.6) = ` **106** (96 neat). Cross-check: a second tile course doubles the tile count to
`ceil(96/0.5*2*1.10) = ` **423** while the coping holds at 106 -- courses drive the tile, not the coping.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service", "construction"]`, inside the `// Group M` block beside
`pool-volume`) -- the Group M citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`M`); a
`citations.js` entry (perimeter = 2(L+W); tiles = perimeter/tile x courses, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the two-course cross-check); `test/fixtures/compute-map.js`
(`pool-tile-coping-perimeter` -> `computePoolTileCopingPerimeter`, module `../../calc-treatment.js`);
`scripts/related-tiles.mjs` (-> `pool-volume` / `pool-interior-finish-volume` / `tile-count`);
`data/search/aliases.json` (5 collision-checked aliases: "pool waterline tile", "pool coping takeoff", "pool tile
count", "pool perimeter tile", "waterline tile coping"); a hand-written renderer in the `TREATMENT_RENDERERS` map
mirroring a count renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-treatment declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the perimeter, tile and coping counts, and the error seams
(non-positive length, width, tile length, courses, coping length; negative waste). The calc-treatment.js gzip cap is
watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from
home first paint. Home tile count 1,346 -> 1,347.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group M audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2*(16+32)/0.5*1.10) -> 212 tiles, 106 coping).

## 5. Roadmap position

Opens the pool install-ops vein beside `pool-volume`, serving the pool builder (pool-service / construction), and pairs
with the coming `pool-interior-finish-volume`. Stays evidence-driven; the layout governs.
