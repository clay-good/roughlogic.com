# roughlogic.com Specification v895 -- Housewrap (WRB) Rolls, Cap Fasteners, and Seam Tape (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v894.md. Weatherization sweep, beside `siding-takeoff`
> and `vapor-barrier-rolls`.
>
> **The gap, and the evidence for it.** Nothing takes off **housewrap** (weather-resistive barrier) -- the wall rolls with
> lap and waste, the cap fasteners, and the seam tape. Grep confirmed no housewrap tile (`vapor-barrier-rolls` is
> horizontal under-slab). The number this settles: 4,000 sf of wall on 9 ft x 150 ft rolls (1,350 sf) at 10% is **4 rolls**,
> about **2,000 cap fasteners**, and **444 LF** of seam tape -- the drainage-plane order behind the siding.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the roll-takeoff
siblings (`vapor-barrier-rolls`, `roof-underlayment-rolls`): the wall area and roll coverage carry `L^2`, the overlap/waste
is dimensionless, the fasteners-per-square-foot is an area density (`L^-2`), the roll width carries `L`, the roll and
fastener counts are dimensionless, and the seam-tape length is `L`. The v18/v21 contract: a non-finite or non-positive
wall area, roll coverage, fasteners-per-sf, or roll width returns `{ error }`; a negative overlap/waste returns
`{ error }`. Citation discipline (v19/v22): the takeoff identity by name (rolls = ceil(area x (1 + overlap + waste) / roll
coverage); cap fasteners = ceil(area x fasteners per sf); seam tape = area / roll width), `GOVERNANCE.general`; the note
states that the WRB is the drainage plane behind the cladding per the manufacturer and code, that the cap-nail or
cap-staple spacing follows the manufacturer (about a 12 to 18 in grid, tighter in high wind), that seam and penetration
tape follow the manufacturer's flashing details, and that this is distinct from the under-slab `vapor-barrier-rolls`.

## 2. The tile

### 2.1 `housewrap-rolls` -- Housewrap (WRB) Rolls, Cap Fasteners, and Seam Tape

```
inputs:
  wall_area_sf      wall area (ft^2)
  roll_coverage_sf  coverage per roll (ft^2, default 1350)
  overlap_waste_pct overlap + waste allowance (percent, default 10)
  fasteners_per_sf  cap fasteners per ft^2 (default 0.5)
  roll_width_ft     roll width / height (ft, default 9)

rolls         = ceil(wall_area_sf * (1 + overlap_waste_pct/100) / roll_coverage_sf)
cap_fasteners = ceil(wall_area_sf * fasteners_per_sf)
seam_tape_lf  = wall_area_sf / roll_width_ft
```

**Pinned worked example.** Wall 4,000 sf, 9 x 150 ft rolls (1,350 sf), 10% overlap and waste, 0.5 fasteners/sf, 9 ft roll:
`rolls = ceil(4000*1.10/1350) = ceil(3.26) = ` **4**; `cap fasteners = ceil(4000*0.5) = ` **2,000**;
`seam tape = 4000/9 = ` **444 LF**. Cross-check: an 8,000 sf job doubles to **8 rolls**, **4,000 fasteners**, and
**889 LF** of tape -- everything tracks the wall area.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`siding-takeoff`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (rolls = ceil(area(1+overlap+waste)/coverage); tape = area/roll width, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-job cross-check); `test/fixtures/compute-map.js`
(`housewrap-rolls` -> `computeHousewrapRolls`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `siding-takeoff` / `vapor-barrier-rolls` / `roof-underlayment-rolls`); `data/search/aliases.json` (5
collision-checked aliases: "housewrap rolls", "weather resistive barrier", "wrb rolls", "housewrap fasteners", "house
wrap takeoff"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `vapor-barrier-rolls` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the roll count, cap fasteners, seam-tape length, and the error seams (non-positive
area, coverage, fasteners/sf, roll width; negative overlap/waste). The calc-construction.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,343 -> 1,344.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(4000*1.10/1350) -> 4 rolls, 2,000 fasteners).

## 5. Roadmap position

Weatherization takeoff beside `siding-takeoff` (the cladding) and `vapor-barrier-rolls`, serving the carpenter / siding
installer (carpentry / construction). Stays evidence-driven; the manufacturer sets the fastening and flashing.
