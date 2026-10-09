# roughlogic.com Specification v1942 -- Grinding and Crushing Energy (Bond Work Index) (`calc-mining.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> mining and processing bench in `calc-mining.js`, no new dependency and no network call.
>
> **The gap.** `crusher-reduction-ratio` sizes the stages of a reduction but not the energy behind it; nothing gave a
> mill or crusher motor from the ore's work index.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive work
index or size, a product not finer than the feed, or a negative feed rate returns `{ error }`. Citation: Bond (1952,
1961) by name, GOVERNANCE.general. Aliases: `bond work index`, `ball mill power`, `grinding energy kwh per ton`,
`bonds law comminution`, `how much power to grind ore`.

## 2. The tile

### 2.1 `bond-work-index-power`

| Quantity | Relation |
|---|---|
| Specific energy | W = 10 Wi (1/sqrt(P80) - 1/sqrt(F80)) kWh per short ton, sizes in microns |
| Power | kW = W x short tons per hour; hp = kW / 0.7457 |

## 3. Worked example (registry row, first principles)

Wi 13 kWh/st, F80 1,000 microns, P80 75 microns: W = 10.90 kWh/st; at 100 st/h, 1,090 kW (1,462 hp).
