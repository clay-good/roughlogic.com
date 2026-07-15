# roughlogic.com Specification v897 -- PV Flat-Roof Ballast Weight and Roof PSF Screen (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v896.md. Solar install-ops sweep, beside
> `pv-rail-clamp-takeoff`.
>
> **The gap, and the evidence for it.** Nothing totals the **ballast weight** of a flat-roof PV array or screens the
> dead load it adds against the allowable roof pressure. Grep confirmed no PV ballast tile. The number this settles: 30
> modules at 50 lb plus 40 lb of ballast each on a 150 lb rack is **2,850 lb** over 630 sf -- **4.5 psf**, under a 5 psf
> allowable -- but push the ballast up and it crosses the line, and the engineer has to re-check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A solar
sibling (`pv-rail-clamp-takeoff`): the module count is dimensionless, the per-item weights are forces `M L T^-2`, the
array area is `L^2`, the allowable pressure is `M L^-1 T^-2`, the total weight is a force, the added pressure is
`M L^-1 T^-2`, and the pass flag is boolean. The v18/v21 contract: a non-finite or non-positive module count, module
weight, array area, or allowable pressure returns `{ error }`; a negative ballast or racking weight returns `{ error }`.
Citation discipline (v19/v22): the load-screen identity by name (total = modules x (module weight + ballast) + racking;
added pressure = total / array area), `GOVERNANCE.general`; the note states plainly that this is a dead-load SCREEN, not a
design -- the ballast quantity per module and the allowable roof pressure come from the PE-stamped ballast plan and the
structural engineer (entered here) -- that it totals and distributes the given ballast rather than sizing it, that wind
uplift and the roof structure govern, and that a value over the allowable means re-check with the engineer.

## 2. The tile

### 2.1 `pv-ballast-weight` -- PV Flat-Roof Ballast Weight and Roof PSF Screen

```
inputs:
  modules                module count (count)
  module_wt_lb           module weight (lb, default 50)
  ballast_per_module_lb  ballast per module (lb)
  racking_wt_lb          total racking weight (lb, default 0)
  array_area_sf          array footprint area (ft^2)
  allowable_psf          allowable added roof pressure (psf)

total_wt_lb = modules * (module_wt_lb + ballast_per_module_lb) + racking_wt_lb
added_psf   = total_wt_lb / array_area_sf
pass        = added_psf <= allowable_psf
```

**Pinned worked example.** 30 modules, 50 lb each, 40 lb ballast each, 150 lb rack, 630 sf, 5 psf allowable:
`total = 30*(50+40) + 150 = ` **2,850 lb**; `added = 2850/630 = ` **4.52 psf** (<= 5, pass). Cross-check: raising the
ballast to 60 lb gives `30*(50+60)+150 = 3,450 lb`, `3450/630 = ` **5.48 psf** -- over the allowable, so it fails and the
ballast or the roof has to be re-evaluated by the engineer.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar"]`, inside the `// Group A` solar block beside `pv-rail-clamp-takeoff`)
-- the Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (added
= total / array area, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned pass example plus the
over-allowable cross-check); `test/fixtures/compute-map.js` (`pv-ballast-weight` -> `computePvBallastWeight`, module
`../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `pv-rail-clamp-takeoff` / `pv-row-spacing` / `snow-load`);
`data/search/aliases.json` (5 collision-checked aliases: "pv ballast weight", "solar roof load psf", "ballasted array
weight", "pv dead load screen", "flat roof solar ballast"); a hand-written renderer in the `SOLAR_RENDERERS` map mirroring
a verdict renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-solar declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the total weight, added pressure, pass flag, and the error seams (non-positive
modules, module weight, array area, allowable; negative ballast or racking). The calc-solar.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,345 -> 1,346.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((30*(50+40)+150)/630 -> 4.52 psf, pass).

## 5. Roadmap position

Solar dead-load screen beside `pv-rail-clamp-takeoff`, serving the solar installer (solar). Deliberately a screen; the
PE-stamped ballast plan and the structural engineer govern. Stays evidence-driven.
