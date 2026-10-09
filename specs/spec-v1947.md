# roughlogic.com Specification v1947 -- Underwater Lift Bag Sizing (`calc-diving.js`, Group G, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group G, the
> diving bench in `calc-diving.js`, no new dependency and no network call.
>
> **The gap.** The diving bench sized gas supply, chambers, and decompression but had nothing for the most common
> working-diver lift: how much bag and how much air to raise an object.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive weight, an
object no denser than the water, a water density outside 60-66 lb/cu ft, or a negative depth, rating, or breakout returns `{ error }`.
Citation: Archimedes and Boyle as the U.S. Navy Salvage Manual applies them, GOVERNANCE.general. Aliases: `lift bag`,
`lift bag size`, `underwater lifting buoyancy`, `salvage lift air volume`, `how big a lift bag do i need`.

## 2. The tile

### 2.1 `lift-bag-sizing`

| Quantity | Relation |
|---|---|
| In-water weight | W (1 - rho_water / rho_object) |
| Lift needed | in-water weight + breakout |
| Bag displacement | lift / rho_water (64 sea, 62.4 fresh lb/cu ft) |
| Free air at depth | displacement x (D + Dw)/Dw, Dw = 2,116.2/rho_water ft (33.07 sea, 33.9 fresh) |
| Bags | ceil(lift / rating) |

## 3. Worked example (registry row, first principles)

1,000 lb steel (490 lb/cu ft) at 66 ft in seawater: 869.4 lb in water, 13.58 cu ft of bag, 40.70 cu ft of free air,
2 bags at 500 lb.
