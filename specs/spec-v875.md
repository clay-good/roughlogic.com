# roughlogic.com Specification v875 -- Spray Fireproofing (SFRM) Material Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v874.md. Fireproofing sweep.
>
> **The gap, and the evidence for it.** Nothing takes off **spray-applied fire-resistive material** (SFRM) -- the volume,
> weight, and bags for a coverage at the design thickness. Grep confirmed no SFRM / spray-fireproofing tile
> (`char-depth-capacity` is wood char design). The number this settles: 5,000 sf of steel at a 1.5 in design thickness in
> 15 pcf material is **625 ft^3** and **9,375 lb** -- about **246 44-lb bags** with the high SFRM waste -- the order for a
> fireproofing pass.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
takeoff pattern: the area carries `L^2`, the thickness `L`, the density `M L^-3`, the bag weight and material weight carry
`M`, the waste is dimensionless, the volume is `L^3`, and the bag count is dimensionless. The v18/v21 contract: a
non-finite or non-positive area, thickness, density, or bag weight returns `{ error }`; a negative waste returns
`{ error }`. Citation discipline (v19/v22): the SFRM takeoff identity by name (volume = area x thickness / 12; weight =
volume x density; bags = ceil(weight / bag weight x (1 + waste))), `GOVERNANCE.general`; the note states that the design
thickness comes from the UL/ULC assembly for the required hourly rating (entered here -- no rating table reproduced), that
the density comes from the product, that SFRM carries high in-place waste from overspray and rebound, and that this is
distinct from the wood `char-depth-capacity`.

## 2. The tile

### 2.1 `sfrm-takeoff` -- Spray Fireproofing (SFRM) Material Takeoff

```
inputs:
  area_sf      area to spray (ft^2)
  thickness_in design thickness (in)
  density_pcf  material density (pcf, default 15)
  bag_lb       bag weight (lb, default 44)
  waste_pct    in-place waste / overspray (percent, default 15)

volume_ft3 = area_sf * thickness_in / 12
weight_lb  = volume_ft3 * density_pcf
bags       = ceil(weight_lb / bag_lb * (1 + waste_pct/100))
```

**Pinned worked example.** Area 5,000 sf, thickness 1.5 in, density 15 pcf, 44-lb bags, 15% waste:
`volume = 5000*1.5/12 = ` **625 ft^3**; `weight = 625*15 = ` **9,375 lb**; `bags = ceil(9375/44*1.15) = ceil(245.0) = `
**246**. Cross-check: a heavier 2 in design thickness is `5000*2/12 = 833 ft^3`, `12,500 lb`, and `ceil(12500/44*1.15) = `
**327 bags** -- the design thickness, set by the fire rating, drives the whole order.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["fireproofing", "construction"]`, inside the `// Group E` construction block)
-- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry
(bags = ceil(area x thickness / 12 x density / bag x (1 + waste)), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the thicker-design cross-check); `test/fixtures/compute-map.js`
(`sfrm-takeoff` -> `computeSfrmTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `char-depth-capacity` / `shotcrete-rebound-quantity` / `coating-coverage-dft`); `data/search/aliases.json` (5
collision-checked aliases: "sfrm takeoff", "spray fireproofing quantity", "fireproofing bags", "spray applied fire
resistive", "fireproofing material takeoff"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring a
simple output renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning the volume, weight, bag count, and the error seams (non-positive area, thickness,
density, bag weight; negative waste). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,323 -> 1,324.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(5000*1.5/12*15/44*1.15) -> 246 bags).

## 5. Roadmap position

Fireproofing takeoff sharing the rebound-heavy pattern with `shotcrete-rebound-quantity`, serving the fireproofing
applicator (fireproofing / construction). Stays evidence-driven; the UL assembly sets the thickness.
