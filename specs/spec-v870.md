# roughlogic.com Specification v870 -- Masonry Control-Joint Layout (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v869.md. Masonry sweep, beside `masonry-count` and
> `control-joint-spacing`.
>
> **The gap, and the evidence for it.** The catalog spaces concrete slab joints (`control-joint-spacing`) but nothing lays
> out **masonry control joints**, where the empirical rule caps the spacing near 1.5 times the wall height and at a project
> maximum. Grep confirmed no masonry-control-joint tile. The number this settles: an 80 ft CMU wall 16 ft tall is capped at
> 24 ft, so it takes **4 panels** of 20 ft with **3 control joints** -- the layout that keeps shrinkage cracking in the
> joints, not the field.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
masonry siblings (`masonry-count`, `control-joint-spacing`): the wall length, height, spacing cap, and panel length carry
`L`, and the panel and joint counts are dimensionless. The v18/v21 contract: a non-finite or non-positive wall length,
wall height, or spacing cap returns `{ error }`. Citation discipline (v19/v22): the masonry control-joint identity by name
(max spacing = min(1.5 x wall height, cap); panels = ceil(wall length / max spacing); joints = panels - 1),
`GOVERNANCE.general`; the note states that the rule is the NCMA empirical guideline (spacing no more than 1.5 times the
wall height and no more than a project cap, commonly 25 ft and adjusted by the horizontal reinforcement -- the cap is
entered here), that control joints also go at openings and at changes in wall height or thickness, and that this is
distinct from the concrete-slab `control-joint-spacing`.

## 2. The tile

### 2.1 `masonry-control-joint-layout` -- Masonry Control-Joint Layout

```
inputs:
  wall_length_ft     wall length (ft)
  wall_height_ft     wall height (ft)
  max_spacing_cap_ft project spacing cap (ft, default 25)

max_spacing_ft  = min(1.5 * wall_height_ft, max_spacing_cap_ft)
panels          = ceil(wall_length_ft / max_spacing_ft)
joints          = panels - 1
panel_length_ft = wall_length_ft / panels
```

**Pinned worked example.** Wall 80 ft long, 16 ft high, cap 25 ft:
`max spacing = min(1.5*16, 25) = min(24, 25) = ` **24 ft**; `panels = ceil(80/24) = ` **4** (20 ft each);
`joints = 4 - 1 = ` **3**. Cross-check: a longer 120 ft wall at the same 24 ft spacing is `ceil(120/24) = ` **5 panels**,
**4 joints** at 24 ft -- the height sets the spacing, the length sets the count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry", "construction"]`, inside the `// Group E` construction block near
`control-joint-spacing`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (max spacing = min(1.5 height, cap); panels = ceil(length/spacing) [NCMA], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the longer-wall cross-check); `test/fixtures/compute-map.js`
(`masonry-control-joint-layout` -> `computeMasonryControlJointLayout`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `control-joint-spacing` / `masonry-count` / `cmu-grout-volume`);
`data/search/aliases.json` (5 collision-checked aliases: "masonry control joint layout", "cmu control joint spacing",
"masonry crack control joint", "block wall control joints", "masonry expansion joint"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `control-joint-spacing` renderer (non-exported, so no DOM-sentinel dims row),
and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the max spacing, panels,
joints, panel length, and the error seams (non-positive wall length, height, cap). The calc-construction.js gzip cap is
watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from
home first paint. Home tile count 1,318 -> 1,319.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(80/min(24,25)) -> 4 panels, 3 joints).

## 5. Roadmap position

Masonry layout tile beside `masonry-count` and the concrete `control-joint-spacing`, serving the mason (masonry /
construction). Stays evidence-driven; the project standard and NCMA guidance set the cap.
