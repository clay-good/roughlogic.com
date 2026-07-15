# roughlogic.com Specification v828 -- Erosion Blanket (RECP) Roll and Staple Takeoff (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v827.md. Erosion-control sweep (entry 7), the cover
> BMP that drops the RUSLE C factor.
>
> **The gap, and the evidence for it.** Nothing takes off an **erosion control blanket** (RECP) -- the rolls and staples a
> crew installs on a slope, where the side and end overlaps drive the roll count. Grep confirmed no blanket / RECP tile.
> The number this settles: an 18,000 sf slope with 10% overlap and 100 sy rolls needs **22 rolls** and, at 1.5 staples per
> square yard, about **3,000 staples** -- the order that lets the cover BMP actually get installed the day it is needed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
takeoff siblings (`welded-wire-mesh`, `roofing-squares`): the slope area and coverage carry `L^2`, the overlap percent and
staple rate are dimensionless, the roll dimensions carry `L`, and the roll and staple counts are dimensionless. The
v18/v21 contract: a non-finite or non-positive area, roll width, roll length, or staple rate returns `{ error }`; a
negative overlap returns `{ error }`. Citation discipline (v19/v22): the lapped-roll takeoff identity by name (rolls =
ceil(area x (1 + overlap) / roll area); staples = ceil(area x staples per sy)), `GOVERNANCE.general`; the note states that
the overlap and the staple pattern come from the manufacturer's installation guide (steeper and higher-flow slopes take
more staples), that the roll is anchored in a trench at the top of the slope, and that the count is a purchase quantity.

## 2. The tile

### 2.1 `erosion-blanket-coverage` -- Erosion Blanket (RECP) Roll and Staple Takeoff

```
inputs:
  area_sf         slope area to cover (ft^2)
  overlap_pct     side/end overlap allowance (percent, default 10)
  roll_width_ft   blanket roll width (ft, default 8)
  roll_length_ft  blanket roll length (ft, default 112.5)
  staples_per_sy  staples per square yard (default 1.5)

coverage_sy = area_sf / 9
roll_sy     = roll_width_ft * roll_length_ft / 9
rolls       = ceil(coverage_sy * (1 + overlap_pct/100) / roll_sy)
staples     = ceil(coverage_sy * staples_per_sy)
```

**Pinned worked example.** Area 18,000 sf, overlap 10%, roll 8 x 112.5 ft (100 sy), 1.5 staples/sy:
`coverage = 18000 / 9 = 2,000 sy`; `roll = 8*112.5/9 = 100 sy`; `rolls = ceil(2000*1.10 / 100) = ` **22 rolls**;
`staples = ceil(2000 * 1.5) = ` **3,000 staples**. Cross-check: a steeper slope at 15% overlap needs
`ceil(2000*1.15 / 100) = ` **23 rolls** -- the overlap, not the nominal roll area, sets the last roll.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "landscaping"]`, inside the `// Group E` earthwork block near
`rusle-soil-loss`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (rolls = ceil(area (1+overlap)/roll area); staples = ceil(area x rate), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the steeper-overlap cross-check);
`test/fixtures/compute-map.js` (`erosion-blanket-coverage` -> `computeErosionBlanketCoverage`, module
`../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `rusle-soil-loss` / `hydroseed-mix` / `geotextile-takeoff`);
`data/search/aliases.json` (5 collision-checked aliases: "erosion blanket rolls", "recp takeoff", "erosion control
blanket", "slope blanket staples", "erosion mat coverage"); a hand-written renderer in the `EARTHWORK_RENDERERS` map
mirroring the `welded-wire-mesh` count renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the coverage, roll count, staple count, and the
error seams (non-positive area, roll dims, staple rate; negative overlap). The calc-earthwork.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,276 -> 1,277.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2000*1.10/100) -> 22 rolls, 3,000 staples).

## 5. Roadmap position

Seventh erosion-control tile: the cover BMP takeoff that pairs with `hydroseed-mix` to drop the RUSLE C factor, serving
the erosion-control and landscaping crew (construction / landscaping). Stays evidence-driven; the manufacturer's guide
sets the staple pattern.
