# roughlogic.com Specification v604 -- Center-Pivot Percent-Timer to Depth (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, the agriculture bench); no new module, group, or dependency. Inherits spec.md through spec-v603.md.
>
> **The gap, and the evidence for it.** Spec-v568 (`center-pivot-runtime`) names this tile as a deliberate follow-on:
> "a percent-timer-to-depth converter." The runtime tile goes from a target depth to the hours a pass takes; the number
> the operator actually turns at the panel is the **end-tower percent timer**, and it works the other way. The timer
> sets what fraction of each cycle the outer tower's motor runs: at 100% it runs continuously (fastest, thinnest
> application), and at a lower setting it stops more, so the machine takes `100 / timer%` times as long to come around
> and lays down `100 / timer%` times the water. An operator who drops the timer from 100% to 50% does not cut the depth
> in half -- they **double** it, and irrigators get this backwards constantly. The converter closes the loop: from the
> machine's revolution time at full speed and the system flow and irrigated area, it gives the revolution time, the
> gross depth per pass, and the days per pass at any timer setting, so the operator can dial in the depth they want
> instead of guessing and coming back to a soaked or a dry field.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The system flow is
`L^3 T^-1` (gpm), the irrigated area `L^2` (acres), the full-speed and computed revolution times `T` (hr), the timer a
`dimensionless` percent, the gross depth `L` (in), and the pass duration `T` (days), all carried dimensionless to the
parse-only lint alongside the `center-pivot-runtime` sibling. The v18/v21 contract: any non-finite input, a
non-positive flow, area, or full-speed revolution time, or a timer setting outside 0 (exclusive) to 100 returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the percent-timer/depth relation by name
(USDA-NRCS center-pivot design / university extension, matching the `center-pivot-runtime` sibling); `editionNote`
prints `revolution_hr = revolution_100_hr x 100 / timer_pct`, `depth_in = flow_gpm x revolution_hr / (452.6 x
area_acres)`, and `pass_days = revolution_hr / 24`, and states that **the timer sets the outer-tower speed so the depth
is inversely proportional to the setting (halving the timer doubles the depth), the 452.6 factor converts acre-inches
to gallons over minutes, the full-speed revolution time is the machine's rated maximum-speed pass, and the pivot
design, the actual field area under the machine, and the panel calibration govern** -- an operating aid, not a
uniformity or scheduling design.

## 2. The tile

### 2.1 `pivot-timer-depth` -- Depth and Pass Time From the End-Tower Percent Timer

```
inputs:
  system_flow_gpm       gpm    system flow Q
  area_acres            acres  irrigated area under the machine
  revolution_100_hr     hr     revolution time at 100% timer (full speed)
  timer_pct             %      end-tower percent-timer setting (0-100)

revolution_hr = revolution_100_hr x 100 / timer_pct              [hr]
depth_in      = system_flow_gpm x revolution_hr / (452.6 x area_acres)   [in]
pass_days     = revolution_hr / 24                                [days]
```

**Pinned worked example (an 800-gpm pivot on 125 ac, 20-hr full-speed revolution, timer at 50%).**
`revolution = 20 x 100 / 50 = ` **40 hr**, `depth = 800 x 40 / (452.6 x 125) = ` **0.566 in**, and
`pass_days = 40 / 24 = ` **1.67 days**. At 100% the same machine turns in 20 hr and lays down only 0.283 in -- so
dropping the timer to 50% did not halve the depth, it doubled it, the mistake the tile exists to prevent.
**Cross-check (the same machine at 75%).** `revolution = 20 x 100 / 75 = ` **26.7 hr**,
`depth = 800 x 26.7 / (452.6 x 125) = ` **0.377 in**, `pass_days = ` **1.11 days** -- confirming the depth tracks
`1 / timer%` exactly (50% gives twice the depth of 100%, 75% gives one-and-a-third times).

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["irrigation", "agriculture"]`, placed inside the `// Group L: Agriculture`
comment block beside `center-pivot-runtime` and `pivot-application-rate` -- the `citations.test.js` **Group L audit
count bumps 28 -> 29**); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote`
per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`pivot-timer-depth` ->
`computePivotTimerDepth` in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `center-pivot-runtime` /
`pivot-application-rate` / `irrigation-requirement`); `data/search/aliases.json` ("percent timer depth", "pivot timer
setting", "center pivot timer", "timer to depth", "pivot speed depth", plus question rows); the id appended to the
calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the inverse-timer relation, and the error
seams (non-finite, non-positive flow / area / revolution, timer out of 0-100). Renderer hand-written mirroring
`center-pivot-runtime` (`makeNumber` / `makeOutputLine`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group L audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 50%-timer example
-> 0.566 in / 1.67 days).

## 5. Roadmap position

Closes the center-pivot cluster spec-v568 opened: `center-pivot-runtime` (depth to hours), `pivot-application-rate`
(the outer-span runoff check), and this converter (timer to depth). No further center-pivot follow-on is named; further
Group L growth stays evidence-driven.
