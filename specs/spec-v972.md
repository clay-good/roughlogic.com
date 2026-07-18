# roughlogic.com Specification v972 -- Battery Bank Series/Parallel Configuration (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A), no
> new module, group, or dependency. Inherits spec.md through spec-v971.md. Battery-storage sweep, beside the accepted
> `off-grid-battery` and `battery-runtime` tiles.
>
> **The gap, and the evidence for it.** `off-grid-battery` sizes the required Wh/Ah, but nothing lays out the physical
> SERIES/PARALLEL wiring. Grep confirmed the only series/parallel mention is a warning string inside off-grid-battery. An
> off-grid / RV / marine installer wiring a bank needs it. The number this settles: a 48 V bus of 12.8 V modules is a
> **4S** string.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing V, Ah, and a fraction), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive bus /
module voltage / capacity, a parallel count below 1, or a DoD outside (0,1] returns `{ error }`. Citation discipline
(v19/v22): the series/parallel configuration by name, `GOVERNANCE.general`; the note states that the actual bus lands on
a module-nominal multiple (must fit the inverter window), that modules on a bus must never mix chemistry / age /
capacity, gives the LFP (~12.8 V/80% DoD) and flooded lead-acid (~12.0 V/50%) numbers, and states that the battery/BMS
limits and NEC 706 govern.

## 2. The tile

### 2.1 `battery-series-parallel` -- Battery Bank Series/Parallel Configuration

```
inputs:
  target_bus_v       target DC bus voltage (V), default 48
  module_v           module nominal voltage (V), default 12.8
  module_ah          module capacity (Ah), default 100
  parallel_strings   number of parallel strings, default 2
  depth_of_discharge usable depth of discharge (0-1), default 0.8

series_count = max(1, round(target_bus_v / module_v))
actual_bus_v = series_count x module_v
total_ah     = round(parallel_strings) x module_ah
usable_kwh   = series_count x parallel_strings x module_v x module_ah x depth_of_discharge / 1000
```

**Pinned worked example.** 48 V bus, 12.8 V / 100 Ah LFP, 2 parallel, 80% DoD: series = `round(48/12.8) = round(3.75) =
` **4** (a **4S2P** bank), bus = `4 x 12.8 = ` **51.2 V**, capacity = `2 x 100 = ` **200 Ah**, usable = `4 x 2 x 12.8 x
100 x 0.8 / 1000 = ` **8.19 kWh**. Cross-check: a 24 V bus of 12 V lead-acid modules is **2S**, and doubling the parallel
count to 4 doubles the capacity to 400 Ah.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `ev-range-per-hour`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (series/parallel config / NEC 706, `GOVERNANCE.general`); `test/fixtures/
worked-examples.json` (the 4S2P LFP example plus the 24 V lead-acid cross-check, pinning the counts, bus, and energy);
`test/fixtures/compute-map.js` (`battery-series-parallel` -> `computeBatterySeriesParallel`, module `../../calc-
solar.js`); `scripts/related-tiles.mjs` (-> `off-grid-battery` / `battery-runtime` / `dc-shunt-sizing`); `data/search/
aliases.json` (5 collision-checked aliases: "battery series parallel", "battery bank configuration", "battery bank
wiring", "series parallel battery", "battery string count"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `SOLAR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-solar
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the series/parallel counts, bus, capacity, and usable energy,
the parallel/DoD scaling, the series-at-least-1 floor, and the error seams. The calc-solar.js gzip cap is watched at
build (cap raised for this tile). Home tile count 1,420 -> 1,421.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(48 V / 12.8 V / 100 Ah / 2 / 0.8 -> 4S2P, 51.2 V, 200 Ah, 8.19 kWh).

## 5. Roadmap position

Battery storage beside `off-grid-battery`, serving the off-grid / RV / marine / solar installer (solar / electrical).
Deliberately the configuration arithmetic; the battery and BMS manufacturer's series/parallel limits, the inverter
voltage window, the chemistry-matching rule, and NEC Article 706 govern the actual bank. Stays evidence-driven.
Continues the battery-storage sweep at 1 new spec (v972).
