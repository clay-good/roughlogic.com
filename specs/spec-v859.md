# roughlogic.com Specification v859 -- Duct Wrap / Liner Material Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v858.md. HVAC sheet-metal sweep, beside
> `duct-metal-weight`.
>
> **The gap, and the evidence for it.** `duct-metal-weight` takes off the metal but nothing takes off the **duct wrap** --
> the external insulation area and rolls, where the overlap and corner compression add to the bare surface. Grep confirmed
> no duct-wrap tile. The number this settles: a 20 x 12 in duct, 40 ft long, needs **245 sf** of wrap once the overlap is
> counted -- **3 rolls** of 100 sf -- beside the metal order.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
sheet-metal siblings (`duct-metal-weight`, `insulation-batt-coverage`): the width, height, and length carry `L`, the
overlap/waste factor is dimensionless, the roll coverage is `L^2`, the perimeter is `L`, the wrap area is `L^2`, and the
roll count is dimensionless. The v18/v21 contract: a non-finite or non-positive width, height, length, overlap/waste
factor, or roll coverage returns `{ error }`. Citation discipline (v19/v22): the wrap-takeoff identity by name (perimeter =
2 x (width + height); wrap = perimeter x length x factor; rolls = ceil(wrap / coverage)), `GOVERNANCE.general`; the note
states that the overlap/waste factor (about 1.15) covers the stapled and taped 2 in overlap and compression at the
corners, that the roll coverage is the product's installed coverage (less than its nominal square feet), and that this is
external wrap -- internal liner is taken off on the interior perimeter.

## 2. The tile

### 2.1 `duct-wrap-takeoff` -- Duct Wrap / Liner Material Takeoff

```
inputs:
  width_in              duct width (in)
  height_in             duct height (in)
  length_ft             run length (ft)
  overlap_waste_factor  overlap + waste multiplier (dimensionless, default 1.15)
  roll_coverage_sf      installed coverage per roll (ft^2, default 100)

perimeter_ft = 2 * (width_in + height_in) / 12
wrap_sf      = perimeter_ft * length_ft * overlap_waste_factor
rolls        = ceil(wrap_sf / roll_coverage_sf)
```

**Pinned worked example.** Width 20 in, height 12 in, length 40 ft, factor 1.15, 100 sf rolls:
`perimeter = 2*(20+12)/12 = ` **5.33 ft**; `wrap = 5.33*40*1.15 = ` **245 sf**; `rolls = ceil(245/100) = ` **3**.
Cross-check: a larger 30 x 20 in duct is `2*(30+20)/12 = 8.33 ft`, `8.33*40*1.15 = ` **383 sf** and **4 rolls** -- the
perimeter, not the length, drives the wrap once the run is fixed.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["sheet-metal", "hvac"]`, inside the `// Group E` construction block beside
`duct-metal-weight`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (wrap = perimeter x length x factor; rolls = ceil(wrap/coverage), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-duct cross-check); `test/fixtures/compute-map.js`
(`duct-wrap-takeoff` -> `computeDuctWrapTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `duct-metal-weight` / `insulation-batt-coverage` / `duct-hanger-load`); `data/search/aliases.json` (5
collision-checked aliases: "duct wrap takeoff", "duct insulation rolls", "duct wrap coverage", "duct liner takeoff",
"ductwork insulation"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `duct-metal-weight`
renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the perimeter, wrap area, roll count, and the error seams (non-positive width,
height, length, factor, coverage). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,307 -> 1,308.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2*(20+12)/12 * 40 * 1.15 -> 245 sf, 3 rolls).

## 5. Roadmap position

HVAC sheet-metal tile beside `duct-metal-weight` (metal) and `duct-hanger-load` (support), serving the sheet-metal worker
and insulator (sheet-metal / hvac). Stays evidence-driven; the product coverage governs.
