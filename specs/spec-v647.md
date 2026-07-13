# roughlogic.com Specification v647 -- PV Array Size from a Target Annual Energy (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`**
> (Group A, solar/electrical), no new module, group, or dependency. Inherits spec.md through spec-v646.md.
>
> **The gap, and the evidence for it.** The `pv-energy-yield` tile (spec-v221) runs the PVWatts model forward:
> array kW -> annual kWh. The customer's actual starting point is the other direction -- "I use 12,000 kWh a year;
> what size array offsets it?" That is the same model solved for the DC nameplate, `DC = target_annual_kWh /
> (PSH x 365 x PR)`. Pure algebra; the PVWatts default `PR = 0.77` and the `E = P_dc x PSH x 365 x PR` relation
> are already in the sibling. The pinned example: to offset **12,000 kWh/yr** at 5 peak-sun-hours and a 0.77
> performance ratio takes an **8.54 kW DC** array (specific yield 1,405 kWh/kWp).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Mirroring the sibling,
`target_annual_kwh` and `monthly_kwh_avg` are energy (`M L^2 T^-2`), `psh` is `T`, `perf_ratio` is `dimensionless`,
and `dc_kw` is power (`M L^2 T^-3`); `specific_yield` is `T`. The `365` days and the PVWatts `PR` default 0.77 are
the same constants the `pv-energy-yield` sibling uses. The v18/v21 contract: any non-finite input, a non-positive
target energy or peak-sun-hours, or a performance ratio outside `(0, 1]` returns `{ error }`. Citation discipline
(v19/v22): the PVWatts model inverted for the array size, by name; the note states that **DC = target_annual /
(PSH x 365 x PR), the specific yield PSH x 365 x PR is the site's kWh per installed kWp, the peak-sun-hours is the
plane-of-array irradiation from NREL NSRDB / PVWatts, and the array must be oversized slightly for degradation** --
a pre-design estimate, not a bankable production model.

## 2. The tile

### 2.1 `pv-array-sizing` -- The DC Array Size Needed to Hit a Target Annual Energy

```
inputs:
  target_annual_kwh   kWh/yr    annual production to offset (> 0; monthly bill x 12)
  psh                 kWh/m2/day peak-sun-hours (> 0)
  perf_ratio          -         performance ratio (0 < PR <= 1; PVWatts default 0.77)

specific_yield  = psh x 365 x perf_ratio        [kWh/kWp]
dc_kw           = target_annual_kwh / specific_yield
monthly_kwh_avg = target_annual_kwh / 12
```

**Pinned worked example.** `target = 12,000 kWh/yr`, `PSH = 5`, `PR = 0.77`: `specific yield = 5 x 365 x 0.77 =
1,405.25 kWh/kWp`, so `DC = 12,000 / 1,405.25 = ` **8.54 kW**.
**Cross-check (exact inverse of the energy tile).** The `pv-energy-yield` desert example (8 kW, 6.5 PSH, 0.75 PR)
produces 14,235 kWh; feeding 14,235 kWh back here at the same PSH and PR sizes the array to **8.00 kW** exactly.
**Cross-check (PR is the lever).** Dropping the performance ratio from 0.77 to 0.70 raises the required array for the
same 12,000 kWh target -- a lossier site needs more nameplate.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `pv-energy-yield`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (PVWatts inverted, the note per §1); `test/fixtures/worked-examples.json`
(the pinned example plus the round-trip cross-check); `test/fixtures/compute-map.js` (`pv-array-sizing` ->
`computePvArraySizing`); `scripts/related-tiles.mjs` (<-> `pv-energy-yield`, `pv-inverter-ratio`, `off-grid-
battery`, `solar-times`); `data/search/aliases.json` ("pv array sizing", "solar array size", "how many kw of solar
do i need", plus question rows, all collision-checked); `SOLAR_RENDERERS["pv-array-sizing"]` via a hand-written
renderer registered in the map literal beside `pv-energy-yield` (the module's `makeNumber` / `makeOutputLine` /
`attachExampleButton` / `debounce` / `fmt` helpers, mirroring `pv-energy-yield`) and the id added to the calc-solar
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning the example, the exact inverse round-trip through `computePvEnergyYield`,
the PR sensitivity, and the error seams. The two `index.html` home-count spots go 1,095 -> 1,096
(check-readme-counts gates them). The calc-solar.js gzip cap is expected to hold (verify at build). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 8.54 kW DC, 1,405 kWh/kWp).

## 5. Roadmap position

Completes the PV production pair: `pv-energy-yield` (size -> energy) and now `pv-array-sizing` (target energy ->
size), exact inverses through the same PVWatts model. Further Group A / solar growth stays evidence-driven.
