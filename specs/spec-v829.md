# roughlogic.com Specification v829 -- Hydroseed Slurry Mix and Tank Count (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,277 -> 1,278 tiles). Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v828.md. Erosion-control sweep (entry 8), the final-
> stabilization companion to `erosion-blanket-coverage`.
>
> **The gap, and the evidence for it.** Nothing sizes a **hydroseed** job -- the seed, mulch, and tackifier for an area,
> and the tank loads to shoot it, where the mulch dominates the solids and the machine's loading limit sets the tank count.
> Grep confirmed no hydroseed tile (`seed-rate` is agricultural planting density, not slurry loading). The number this
> settles: a 3-acre stabilization at 2,000 lb/acre mulch is **6,165 lb** of solids, which in a 3,000-gallon tank at
> 0.4 lb/gallon takes **6 tank loads** -- the day's shooting plan.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings and the material-takeoff pattern: the area carries `L^2` (acres), the per-acre rates and the tank
loading are dimensionless coefficients, the tank volume is `L^3` (gallons), the component and total weights are `M`, and
the tank count is dimensionless. The v18/v21 contract: a non-finite or non-positive area, tank volume, or tank loading
returns `{ error }`; a negative seed, mulch, or tackifier rate returns `{ error }`. Citation discipline (v19/v22): the
slurry loading identity by name (solids = area x (seed + mulch + tackifier rates); tanks = ceil(solids / (tank gallons x
loading))), `GOVERNANCE.general`; the note states that the seed, mulch, and tackifier rates come from the spec or
agronomist (a bonded fiber matrix on a steep slope runs a much higher mulch rate), that the maximum solids loading is an
agitation limit of the machine, and that the seed rate here is a slurry weight, not an agricultural planting density.

## 2. The tile

### 2.1 `hydroseed-mix` -- Hydroseed Slurry Mix and Tank Count

```
inputs:
  area_ac              area to hydroseed (acres)
  seed_rate_lb_ac      seed rate (lb/acre, default 5)
  mulch_rate_lb_ac     mulch rate (lb/acre, default 2000)
  tackifier_rate_lb_ac tackifier rate (lb/acre, default 50)
  tank_gal             hydroseeder tank capacity (gal, default 3000)
  max_load_lb_per_gal  max solids loading (lb/gal, default 0.4)

seed_lb         = area_ac * seed_rate_lb_ac
mulch_lb        = area_ac * mulch_rate_lb_ac
tackifier_lb    = area_ac * tackifier_rate_lb_ac
total_solids_lb = seed_lb + mulch_lb + tackifier_lb
tanks           = ceil(total_solids_lb / (tank_gal * max_load_lb_per_gal))
```

**Pinned worked example.** Area 3 acres, 5 lb/ac seed, 2,000 lb/ac mulch, 50 lb/ac tackifier, 3,000 gal tank, 0.4 lb/gal:
`seed = 15`, `mulch = 6,000`, `tackifier = 150`, `solids = ` **6,165 lb**; `tanks = ceil(6165 / (3000*0.4)) =
ceil(5.14) = ` **6 tanks**. Cross-check: a steep-slope bonded-fiber rate of 3,000 lb/ac mulch pushes solids to 9,165 lb
and `ceil(9165/1200) = ` **8 tanks** -- the mulch rate, set by the slope, is the lever.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "landscaping"]`, inside the `// Group E` earthwork block near
`erosion-blanket-coverage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (solids = area x rates; tanks = ceil(solids / (gal x loading)), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the steep-slope cross-check); `test/fixtures/compute-map.js`
(`hydroseed-mix` -> `computeHydroseedMix`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `erosion-blanket-coverage` / `rusle-soil-loss` / `seed-rate`); `data/search/aliases.json` (5 collision-checked
aliases: "hydroseed mix", "hydroseeder tank count", "hydroseed slurry", "hydromulch quantity", "hydroseed seed mulch");
a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction` (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
component weights, the total solids, the tank count, and the error seams (non-positive area, tank, loading; negative
rates). The calc-earthwork.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,277 -> 1,278.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil((3*(5+2000+50)) / (3000*0.4)) -> 6 tanks).

## 5. Roadmap position

Eighth erosion-control tile: final stabilization beside `erosion-blanket-coverage`, closing the RUSLE-driven BMP set,
serving the erosion-control and landscaping crew (construction / landscaping). Distinct from the agricultural `seed-rate`.
Stays evidence-driven; the spec sets the rates.
