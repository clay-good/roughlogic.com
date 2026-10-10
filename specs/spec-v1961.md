# roughlogic.com Specification v1961 -- Compressed Air Moisture and Condensate (`calc-millwright.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> millwright bench in `calc-millwright.js`, no new dependency and no network call.
>
> **The gap.** `air-dryer-sizing` sizes the dryer and said it "does not compute the moisture load itself"; nothing
> did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive flow,
an intake temperature outside 32 to 130 F, a relative humidity outside 0 to 100%, an atmosphere outside 8 to 16
psia, a line pressure outside (0, 1,000] psig, or a line temperature or dryer dew point outside 32 to 250 F
returns `{ error }`. Air that is not saturated at the line temperature condenses nothing, which is an answer.
Citation: the psychrometric humidity ratio (ASHRAE Fundamentals, by name) with IAPWS-IF97 saturation pressure,
GOVERNANCE.general. Aliases: `compressed air condensate`, `compressed air moisture`, `compressor water per day`,
`air compressor condensate gallons per day`, `pressure dew point water removal`,
`how much water does an air compressor make`.

## 2. The tile

### 2.1 `compressed-air-condensate`

W = 0.621945 Pw / (P - Pw); dry air = scfm x 0.075 x 60 lb/hr.

| Quantity | Relation |
|---|---|
| Water vapor in | dry air x W at intake (Pw = RH x Psat, P = atmosphere) |
| Held after cooling | the lesser of W in and Ws at the line temperature and absolute line pressure |
| Condensate in the line | dry air x (W in - held) |
| Removed by the dryer | dry air x (held - Ws at the pressure dew point), not below zero |
| Vapor left | dry air x W leaving the dryer |
| Gallons per day | lb/hr x 24 / 8.34 |

## 3. Worked examples (registry rows)

- 100 scfm, 75 F and 75% RH intake, 100 psig at 100 F, 38 F dryer: 6.28 lb/hr in, 3.94 condensed, 2.06 at the
  dryer, 0.275 left; 17.3 gal/day to drain.
