# roughlogic.com Specification v847 -- Soil Stabilization (Lime / Cement) Quantity (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v846.md. Subgrade sweep, beside `relative-compaction`
> and `water-for-compaction`.
>
> **The gap, and the evidence for it.** Nothing takes off **lime or cement** for subgrade stabilization -- the spread rate
> (lb/sy) and tonnage from a percent-by-weight mix design. Grep confirmed no stabilization tile. The number this settles: a
> 6% lime treatment 8 in deep in 110 pcf soil is **39.6 lb/sy**, so a 10,000 sy pad needs **198 tons** of lime -- the order
> that has to land before the reclaimer starts, and the geotech sets the percent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`relative-compaction`, `aggregate`): the application percent is dimensionless, the soil density carries
`M L^-3`, the treatment depth `L`, the treated area `L^2`, the spread rate is `M L^-2` (lb/sy), and the tonnage is `M`. The
v18/v21 contract: a non-finite or non-positive application percent, soil density, depth, or area returns `{ error }`.
Citation discipline (v19/v22): the stabilizer quantity identity by name (spread lb/sy = percent/100 x density x depth/12 x
9; tons = spread x area / 2000), `GOVERNANCE.general`; the note states that the application percent is by dry soil weight
from the geotech's mix design (lime for plastic clays, cement for granular subgrades), that the factor of 9 converts
square feet to square yards, that the field spread rate is verified by a check (a scale pan or a bag count over a known
area), and that the geotech governs the percent.

## 2. The tile

### 2.1 `soil-stabilization-quantity` -- Soil Stabilization (Lime / Cement) Quantity

```
inputs:
  application_pct   stabilizer content by dry soil weight (percent)
  soil_density_pcf  soil dry density (pcf, default 110)
  depth_in          treatment depth (in, default 8)
  area_sy           treated area (sy)

spread_lb_per_sy = application_pct/100 * soil_density_pcf * (depth_in/12) * 9
tons             = spread_lb_per_sy * area_sy / 2000
```

**Pinned worked example.** 6% lime, 110 pcf, 8 in, 10,000 sy:
`spread = 0.06 * 110 * (8/12) * 9 = ` **39.6 lb/sy**; `tons = 39.6 * 10000 / 2000 = ` **198 tons**. Cross-check: a 4%
cement treatment on a granular subgrade at the same depth is `0.04 * 110 * 0.667 * 9 = ` **26.4 lb/sy** and **132 tons** --
the percent the geotech specifies is the lever on the whole order.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`relative-compaction`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (spread = percent/100 x density x depth/12 x 9; tons = spread x area / 2000, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned lime example plus the cement cross-check); `test/fixtures/compute-map.js`
(`soil-stabilization-quantity` -> `computeSoilStabilizationQuantity`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `relative-compaction` / `water-for-compaction` / `aggregate`);
`data/search/aliases.json` (5 collision-checked aliases: "soil stabilization quantity", "lime treatment rate", "cement
stabilization tonnage", "subgrade stabilizer rate", "lime cement lb per sy"); a hand-written renderer in the
`EARTHWORK_RENDERERS` map mirroring the `aggregate` renderer (non-exported, so no DOM-sentinel dims row), and the id added
to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the spread rate, the tonnage, and the
error seams (non-positive percent, density, depth, area). The calc-earthwork.js gzip cap is watched at build. Verify at
build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile
count 1,295 -> 1,296.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.06 * 110 * (8/12) * 9 -> 39.6 lb/sy, 198 tons).

## 5. Roadmap position

Subgrade tile beside `relative-compaction` and `water-for-compaction`, serving the reclaimer / stabilization crew
(construction / surveying). Stays evidence-driven; the geotech's mix design sets the percent.
