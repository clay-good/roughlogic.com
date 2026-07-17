# roughlogic.com Specification v885 -- Under-Slab Vapor Barrier Rolls and Seam Tape (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v884.md. Concrete / waterproofing sweep, beside the
> flatwork tiles.
>
> **The gap, and the evidence for it.** Nothing takes off the **under-slab vapor barrier** -- the poly rolls with lap and
> waste, and the seam tape. Grep confirmed no vapor-barrier tile. The number this settles: a 3,000 sf slab on 10-mil rolls
> (1,000 sf each) with 6 in laps and waste takes **4 rolls** and about **300 LF** of seam tape -- the order under the slab
> before the rebar goes down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the roll-takeoff
siblings (`roof-underlayment-rolls`, `insulation-batt-coverage`): the slab area and roll coverage carry `L^2`, the
overlap/waste is dimensionless, the roll width carries `L`, the roll count is dimensionless, and the seam-tape length is
`L`. The v18/v21 contract: a non-finite or non-positive slab area, roll coverage, or roll width returns `{ error }`; a
negative overlap/waste returns `{ error }`. Citation discipline (v19/v22): the roll-takeoff identity by name (rolls =
ceil(area x (1 + overlap + waste) / roll coverage); seam tape = area / roll width), `GOVERNANCE.general`; the note states
that under-slab vapor retarders follow ASTM E1745 (a Class A membrane is common under conditioned slabs), that the laps
(about 6 in) are taped, that the seam-tape estimate is one seam per roll width and the penetrations and perimeter seal are
added separately, and that the design and AHJ set the class.

## 2. The tile

### 2.1 `vapor-barrier-rolls` -- Under-Slab Vapor Barrier Rolls and Seam Tape

```
inputs:
  area_sf           slab area (ft^2)
  roll_coverage_sf  coverage per roll (ft^2, default 1000)
  overlap_waste_pct overlap + waste allowance (percent, default 10)
  roll_width_ft     roll width (ft, default 10)

rolls        = ceil(area_sf * (1 + overlap_waste_pct/100) / roll_coverage_sf)
seam_tape_lf = area_sf / roll_width_ft
```

**Pinned worked example.** Area 3,000 sf, 1,000 sf rolls, 10% overlap and waste, 10 ft roll:
`rolls = ceil(3000*1.10/1000) = ceil(3.3) = ` **4**; `seam tape = 3000/10 = ` **300 LF**. Cross-check: a 6,000 sf slab is
`ceil(6600/1000) = ` **7 rolls** and `6000/10 = ` **600 LF** of tape -- both track the area, and a wider roll cuts the
seams.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`concrete`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (rolls = ceil(area(1+overlap+waste)/coverage); seam = area/roll width, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-slab cross-check); `test/fixtures/compute-map.js`
(`vapor-barrier-rolls` -> `computeVaporBarrierRolls`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `roof-underlayment-rolls` / `concrete` / `welded-wire-mesh`); `data/search/aliases.json` (5 collision-checked
aliases: "vapor barrier rolls", "under slab vapor barrier", "poly vapor retarder", "vapor barrier tape", "slab vapor
barrier takeoff"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `roof-underlayment-rolls`
renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the roll count, seam-tape length, and the error seams (non-positive area, coverage,
roll width; negative overlap/waste). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,333 -> 1,334.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(3000*1.10/1000) -> 4 rolls, 300 LF tape).

## 5. Roadmap position

Concrete / waterproofing takeoff beside `concrete` and `welded-wire-mesh`, serving the concrete contractor (concrete /
construction). Stays evidence-driven; the AHJ sets the vapor-retarder class.
