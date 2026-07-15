# roughlogic.com Specification v880 -- Non-Shrink Grout Volume Under a Base Plate (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v879.md. Anchoring / steel-erection sweep, beside
> `anchor-epoxy-volume` and `annular-grout-volume`.
>
> **The gap, and the evidence for it.** Nothing gives the **non-shrink grout** under a column base plate -- the volume in
> the gap minus the steel footprint, and the bags. Grep confirmed no baseplate-grout tile (`annular-grout-volume` is a
> pipe casing). The number this settles: an 18 x 18 in plate over an 8 x 8 in column on a 1.5 in grout bed is **390 in^3**
> -- **1 bag** of non-shrink grout with waste -- and a big 24 x 24 in plate at 2 in takes 2.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
grout siblings (`annular-grout-volume`, `anchor-epoxy-volume`): the plate dimensions and grout thickness carry `L`, the
column area is `L^2`, the bag yield is `L^3`, the waste is dimensionless, the grout volumes are `L^3`, and the bag count
is dimensionless. The v18/v21 contract: a non-finite or non-positive plate length, width, grout thickness, or bag yield
returns `{ error }`; a column area at or above the plate area (a non-positive net) returns `{ error }`; a negative column
area or waste returns `{ error }`. Citation discipline (v19/v22): the grout-volume identity by name (grout = (plate length
x plate width - column area) x thickness; bags = ceil(grout / bag yield)), `GOVERNANCE.general`; the note states that the
column area is the steel footprint (or the leave-out for a grout hole), that the grout is placed with a head and dam so it
flows fully under the plate, that the bag yield comes from the product, and that this is distinct from the pipe-casing
`annular-grout-volume`.

## 2. The tile

### 2.1 `baseplate-grout-volume` -- Non-Shrink Grout Volume Under a Base Plate

```
inputs:
  plate_length_in     base plate length (in)
  plate_width_in      base plate width (in)
  column_area_in2     column steel footprint (in^2)
  grout_thickness_in  grout bed thickness (in)
  bag_yield_ft3       bag yield (ft^3, default 0.45)
  waste_pct           waste allowance (percent, default 10)

grout_in3 = (plate_length_in * plate_width_in - column_area_in2) * grout_thickness_in
grout_ft3 = grout_in3 / 1728 * (1 + waste_pct/100)
bags      = ceil(grout_ft3 / bag_yield_ft3)
```

**Pinned worked example.** Plate 18 x 18 in, column 64 in^2, grout 1.5 in, 0.45 ft^3/bag, 10% waste:
`grout = (324 - 64)*1.5 = ` **390 in^3**; `ft^3 = 390/1728*1.10 = ` **0.248 ft^3**; `bags = ceil(0.248/0.45) = ` **1**.
Cross-check: a 24 x 24 in plate over a 100 in^2 column at 2 in is `(576-100)*2 = 952 in^3`, `0.606 ft^3`, and
`ceil(0.606/0.45) = ` **2 bags** -- plate area and bed thickness both drive it.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "concrete"]`, inside the `// Group E` construction block near
`anchor-epoxy-volume`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (grout = (plate area - column area) x thickness; bags = ceil(grout/yield), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-plate cross-check); `test/fixtures/compute-map.js`
(`baseplate-grout-volume` -> `computeBaseplateGroutVolume`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `anchor-epoxy-volume` / `annular-grout-volume` / `column-base-plate`);
`data/search/aliases.json` (5 collision-checked aliases: "base plate grout volume", "non shrink grout bags", "column
grout volume", "baseplate grout quantity", "grout under base plate"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the grout volumes, bag
count, and the error seams (non-positive plate dims, thickness, bag yield; column area >= plate; negative column area or
waste). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,328 -> 1,329.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil((324-64)*1.5/1728*1.10/0.45) -> 1 bag).

## 5. Roadmap position

Anchoring / steel-erection takeoff beside `anchor-epoxy-volume` and the `column-base-plate` design tile, serving the steel
erector and concrete contractor (construction / concrete). Stays evidence-driven; the product bag yield governs.
