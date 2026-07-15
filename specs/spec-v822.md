# roughlogic.com Specification v822 -- RUSLE Annual Soil Loss (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v821.md. Opens the erosion-control / SWPPP vein
> (entry 1) -- the catalog has deep stormwater hydrology but no erosion-BMP tiles.
>
> **The gap, and the evidence for it.** Nothing estimates **soil loss** -- the tons per acre a disturbed site sheds each
> year, the number that drives the whole SWPPP and every BMP downstream. Grep confirmed no soil-loss / erosion-rate /
> RUSLE tile. RUSLE (A = R K LS C P) is the public-domain USDA method, and every factor is user-entered, so no copyrighted
> chart is reproduced. The number this settles: a bare 5-acre site with R 150, K 0.32, LS 1.5 loses **72 tons/acre/yr** --
> **360 tons/yr** across the site -- and dropping the cover factor C with mulch or a blanket is what pulls it back down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`relative-compaction`, `soil-swell-shrink`): the five RUSLE factors are dimensionless, the area
carries `L^2` (acres), and both soil-loss figures are `M` (tons, per-acre-year implicit on the unit rate). The v18/v21
contract: a non-finite or negative R, K, LS, C, P, or acreage returns `{ error }` (a zero factor is allowed -- full cover
gives zero loss). Citation discipline (v19/v22): the RUSLE identity by name (A = R x K x LS x C x P), `GOVERNANCE.general`;
the note states that RUSLE is the USDA public-domain replacement for USLE, that every factor comes from the SWPPP designer
or published state guidance the user enters (this tile reproduces no isoerodent map or nomograph), that it estimates
long-term average sheet-and-rill loss only (not gully or channel erosion), and that the permitting AHJ governs the plan.

## 2. The tile

### 2.1 `rusle-soil-loss` -- RUSLE Annual Soil Loss

```
inputs:
  r_factor   rainfall-runoff erosivity R
  k_factor   soil erodibility K
  ls_factor  slope length-steepness LS
  c_factor   cover-management C
  p_factor   support-practice P
  acres      disturbed area (acres)

a_tons_ac_yr = r_factor * k_factor * ls_factor * c_factor * p_factor
site_tons_yr = a_tons_ac_yr * acres
```

**Pinned worked example.** R 150, K 0.32, LS 1.5, C 1.0 (bare), P 1.0, 5 acres:
`A = 150 * 0.32 * 1.5 * 1.0 * 1.0 = ` **72 tons/acre/yr**; `site = 72 * 5 = ` **360 tons/yr**. Cross-check: rolling an
erosion blanket over the slope to drop C to 0.10 cuts A to `150*0.32*1.5*0.10 = ` **10.8 tons/acre/yr** and the site to
**54 tons/yr** -- the cover factor is the lever a contractor actually controls.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`soil-swell-shrink`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (A = R K LS C P, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example plus
the blanketed cross-check); `test/fixtures/compute-map.js` (`rusle-soil-loss` -> `computeRusleSoilLoss`, module
`../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `erosion-blanket-coverage` / `silt-fence-spacing` /
`sediment-basin-volume`); `data/search/aliases.json` (5 collision-checked aliases: "rusle soil loss", "annual soil loss",
"erosion rate estimate", "usle a factor", "sheet rill erosion"); a hand-written renderer in the `EARTHWORK_RENDERERS` map
mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the per-acre and site soil loss and the error seams
(negative any factor or acreage). The calc-earthwork.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,270 -> 1,271.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(150*0.32*1.5*1.0*1.0 -> 72 tons/acre/yr).

## 5. Roadmap position

Opens the erosion-control / SWPPP vein: `rusle-soil-loss` is the driver that sizes the BMPs to follow -- silt fence,
sediment basin, check dams, erosion blanket, hydroseed, construction entrance. Serves the erosion-control crew and site
superintendent (construction / surveying). Stays evidence-driven; the permitting AHJ governs the plan.
