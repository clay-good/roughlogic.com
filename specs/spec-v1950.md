# roughlogic.com Specification v1950 -- Pool Evaporation Rate (`calc-pool.js`, Group M, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group M, the
> pool and spa bench in `calc-pool.js`, no new dependency and no network call.
>
> **The gap.** `pool-cover-evaporation` says its evaporation rate "is ENTERED because it depends on wind, humidity
> and the water-to-air temperature difference"; nothing estimated it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive area, a
water temperature outside 32-140 F, an air temperature outside -40-140 F, humidity outside 0-100%, an activity factor
outside (0, 1.5], or a negative wind returns `{ error }`. Citation: ASHRAE Handbook -- HVAC Applications Ch. 6 by name,
GOVERNANCE.general. Aliases: `pool evaporation rate`, `natatorium evaporation`, `pool water loss from evaporation`,
`how much water does my pool evaporate`, `pool dehumidification load`.

## 2. The tile

### 2.1 `pool-evaporation-rate`

| Quantity | Relation |
|---|---|
| Indoor | W = 0.1 A (pw - pa) Fa lb/h (Fa 0.5 / 0.65 / 0.8 / 1.0 / 1.5) |
| Outdoor | W = A (pw - pa)(95 + 0.425 V)/Y, V fpm, Y = 1,046 BTU/lb |
| Vapor pressures | Magnus e_s(T) in hPa / 33.86389 = in. Hg; pa = RH x e_s(T_air) |
| Conversions | gal/day = 24 W/8.34; in/day = gal/day / 7.481 / A x 12; latent = 1,046 W |
| Condensing | pa >= pw: no evaporation, reported as 0 |

## 3. Worked examples (registry rows)

- 1,000 sq ft hotel pool (Fa 0.8), 82 F water, 84 F 50% air: 41.06 lb/h, 118.2 gal/day, 0.190 in/day.
- Same pool outdoors, 5 mph wind: 138.4 lb/h, 0.639 in/day.
