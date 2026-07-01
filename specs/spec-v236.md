# roughlogic.com Specification v236 -- Battery Time-of-Use Arbitrage Value (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v236..v238 (the grid-tied battery-economics trio -- the value a storage
> system returns and the power it can actually deliver: time-of-use energy arbitrage, demand-charge peak shaving, and the
> C-rate power-and-duration limit that bounds both). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the storage business case is scoped and installed
> by the solar and electrical trade. Adds one tile to **`calc-solar.js`** (Group A, beside `battery-runtime` and the PV
> tiles); no new module, group, or dependency. Inherits spec.md through spec-v235.md.
>
> **The gap, and the evidence for it.** The catalog sizes a battery for off-grid autonomy (`off-grid-battery`, IEEE 1013)
> and computes its runtime (`battery-runtime`), but nothing values the most common reason a grid-tied customer buys
> storage: shifting energy in time. A battery charges when power is cheap (off-peak, or from surplus solar) and
> discharges when it is expensive (on-peak), and the daily value is the usable energy sold at the peak price minus the
> larger amount that had to be bought at the off-peak price to store it, because the round trip loses fifteen percent or
> so. That round-trip penalty is the catch every arbitrage pitch skips: the peak price has to beat the off-peak price by
> more than the round-trip loss just to break even. The catalog can size a battery but cannot tell a customer what a
> time-of-use spread actually pays them for it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nameplate and usable
capacities are an energy (kWh); the prices are a currency per energy (USD/kWh); the daily and annual values are currency
figures (USD, as the existing economic tiles carry them); the depth of discharge, the round-trip efficiency, and the
break-even price ratio are `dimensionless`; the cycles per year are a `dimensionless` count. The v18/v21 contract: any
non-finite input, a non-positive nameplate capacity, a depth of discharge or round-trip efficiency outside 0 (exclusive)
to 1, a negative price, or a non-positive cycles-per-year, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the arbitrage relations by name; `editionNote` names the standard **energy-arbitrage value**
(`daily = usable * peak - (usable / RTE) * offpeak`, usable `= nameplate * DoD`, break-even when
`peak > offpeak / RTE`) and the **NREL battery round-trip / degradation** framing, and states that **the round-trip
efficiency is the AC-to-AC value (inverter plus cells; a DC-coupled solar charge avoids one conversion), the depth of
discharge is the warranty-usable fraction, one cycle per day is the common assumption but a battery cannot capture two
non-overlapping peaks it does not have the energy for, throughput degrades the cells (a cost this value figure does not
net out), and this is a gross arbitrage value, not a financed payback** -- a spread-value aid, not a guaranteed return.

## 2. The tile

### 2.1 `battery-tou-arbitrage` -- Time-of-Use Energy Arbitrage Value

```
inputs:
  nameplate_kwh   kWh            battery nameplate energy, kWh
  dod             dimensionless  usable depth of discharge, 0-1 (default 0.90)
  rte             dimensionless  AC-to-AC round-trip efficiency, 0-1 (default 0.86)
  peak_price      USD/kWh        on-peak energy price, $/kWh
  offpeak_price   USD/kWh        off-peak (charging) energy price, $/kWh
  cycles_per_year dimensionless  full cycles per year (default 365)

usable_kwh       = nameplate_kwh * dod
charge_kwh       = usable_kwh / rte                      # more must be bought than is delivered
daily_value      = usable_kwh * peak_price - charge_kwh * offpeak_price
annual_value     = daily_value * cycles_per_year
breakeven_ratio  = 1 / rte                               # peak must exceed offpeak by this factor to profit
```

**Pinned worked example (13.5 kWh home battery, strong spread).** A 13.5 kWh battery, 90 percent usable, 90 percent
round-trip, on a time-of-use plan with a $0.45/kWh peak and a $0.15/kWh off-peak, cycled daily:
`usable = 13.5 * 0.90 = 12.15 kWh`; `charge = 12.15 / 0.90 = 13.5 kWh`;
`daily = 12.15 * 0.45 - 13.5 * 0.15 = 5.468 - 2.025 = $3.44`; `annual = 3.44 * 365 = ` **$1,257 per year**; and the
peak must beat the off-peak by `1 / 0.90 = 1.11x` (it beats it by 3x, so the arbitrage is strongly positive).
**Cross-check (flat spread).** The same battery where the peak is only $0.28 and the off-peak $0.18:
`daily = 12.15 * 0.28 - 13.5 * 0.18 = 3.402 - 2.430 = $0.97`; `annual = ` **$355 per year**. A spread that looks like a
tempting 1.56x ratio nets almost nothing once the round-trip loss is paid: the battery buys 13.5 kWh to sell 12.15, so
the effective break-even ratio is 1.11 and most of the headline spread is eaten before it reaches the customer. That
round-trip haircut, invisible in a raw peak-minus-off-peak pitch, is the whole reason arbitrage economics have to be
calculated, not estimated.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical","solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the arbitrage relations, `editionNote` naming the energy-arbitrage value and NREL
round-trip/degradation framing with the AC-to-AC-RTE / warranty-DoD / one-cycle / degradation-not-netted / gross-value
caveats); `test/fixtures/worked-examples.json` (the strong-spread example + the flat-spread cross-check);
`test/fixtures/compute-map.js` (`battery-tou-arbitrage` -> `computeBatteryTouArbitrage` in `../../calc-solar.js`);
`scripts/related-tiles.mjs` (-> `battery-peak-shaving` / `off-grid-battery` / `pv-energy-yield`);
`data/search/aliases.json` ("battery arbitrage", "time of use battery", "tou arbitrage", "energy shifting", "battery
self consumption", "peak off peak battery", "storage value", "round trip loss"); the id appended to the existing solar
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples and error seams (non-finite, nameplate <= 0, DoD / RTE out of 0 to 1, negative price,
non-positive cycles). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the break-even-ratio path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the usable / daily / annual / break-even stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (13.5 kWh / $0.45 / $0.15 -> $3.44/day, $1,257/yr).

## 5. Roadmap position

Opens the grid-tied battery-economics batch (v236..v238). Sits beside `off-grid-battery` (the off-grid autonomy sizing)
and `battery-runtime`, and pairs with `battery-peak-shaving` (v237) as the second value stream; the deliverable power in
`battery-c-rate` (v238) bounds how much of each can be captured. A degradation-throughput cost and a DC-coupled-solar
single-conversion mode are deliberate future follow-ons.
