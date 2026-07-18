# roughlogic.com Specification v943 -- Gravity Oil/Water Separator Surface Area (calc-treatment.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v942.md. Water / wastewater install-ops sweep,
> beside the accepted `clarifier-surface-loading`, `grease-interceptor-flow-capacity`, and `detention-time` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes clarifiers (surface loading), grease interceptors (flow
> capacity), and detention basins, but nothing sizes a **gravity oil/water separator** -- the API 421 unit an industrial
> plumber / water operator installs to strip free oil off a wash-bay, shop, or process discharge before the sewer or
> permit point. Grep confirmed no oil/water-separator tile. The number this settles: at 50 gpm with a 150 micron design
> droplet of 0.85-SG oil in 60 F water, the separator needs about **24 ft^2** of horizontal surface.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive flow / droplet / viscosity, or an oil SG outside `(0, 1)` returns `{ error }`. Citation
discipline (v19/v22): the API 421 gravity-separator method by name (Stokes' law rise velocity; horizontal area = F x Q /
Vt with a turbulence factor F ~ 1.2), `GOVERNANCE.water`; the note states that only FREE oil gravity-separates (an
emulsified or dissolved fraction needs coalescing / DAF / downstream treatment), that colder water and smaller droplets
demand more area, and that this is a screen -- API 421, the separator manufacturer, and the engineer / AHJ and the
discharge permit govern.

## 2. The tile

### 2.1 `oil-water-separator-sizing` -- Gravity Oil/Water Separator Surface Area (API 421)

```
inputs:
  flow_gpm            design flow (gpm), default 50
  oil_sg              oil specific gravity (0 < SG < 1), default 0.85
  droplet_micron      design oil droplet diameter (micron), default 150
  water_viscosity_cp  water dynamic viscosity (cP), default 1.1 (~60 F)

Vt (Stokes, SI)        = 9.81 x (rho_w - rho_o) x d_m^2 / (18 x mu)   [rho_w = 62.3 lb/ft^3 x 16.0185; rho_o = SG x rho_w; mu in Pa.s]
rise_velocity_ftmin    = Vt x 3.28084 x 60
horizontal_area_ft2    = 1.2 x (flow_gpm x 0.133681) / rise_velocity_ftmin
```

**Pinned worked example.** 50 gpm, 0.85 SG oil, 150 micron droplet, 1.1 cP water: the droplet rises at `Vt = ` **0.328
ft/min**; horizontal area = `1.2 x (50 x 0.133681) / 0.328 = ` **24.4 ft^2**. Cross-check: doubling the flow to **100
gpm** doubles the area to **48.8 ft^2** (the rise velocity is a droplet property, unchanged by flow), while halving the
droplet to 75 micron roughly quadruples the area (Vt goes as d^2).

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water", "plumbing"]`, beside `pool-interior-finish-volume`); a `tile-meta.js`
`_TILES` entry (`M`); a `citations.js` entry (API 421 Stokes method, `GOVERNANCE.water`); `test/fixtures/worked-
examples.json` (the 50 gpm example plus the 100 gpm cross-check, pinning the rise velocity and area); `test/fixtures/
compute-map.js` (`oil-water-separator-sizing` -> `computeOilWaterSeparatorSizing`, module `../../calc-treatment.js`);
`scripts/related-tiles.mjs` (-> `detention-time` / `grease-interceptor-flow-capacity` / `filter-loading`); `data/search/
aliases.json` (5 collision-checked aliases: "oil water separator", "oil water separator sizing", "api 421 separator",
"gravity separator area", "ows sizing"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`TREATMENT_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-treatment declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the Stokes rise, the linear-in-flow area, the d^2 droplet scaling, the
lighter-oil-rises-faster monotonicity, and the error seams. The Group M citation audit count moves 37 -> 38. The
calc-treatment.js gzip cap and the Group M group shell are watched at build. Home tile count 1,391 -> 1,392.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, Group M audit 38); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (50 gpm -> 0.328 ft/min,
24.4 ft^2).

## 5. Roadmap position

Water / wastewater install-ops beside `clarifier-surface-loading`, serving the industrial plumber / water operator
(water / plumbing). Deliberately a sizing screen; API 421, the manufacturer, and the engineer / AHJ and the discharge
permit govern. Only free oil separates -- an emulsified fraction is out of gravity scope. Stays evidence-driven.
Continues the water install-ops sweep at 1 new spec (v943).
