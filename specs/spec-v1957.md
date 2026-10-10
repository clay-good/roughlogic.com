# roughlogic.com Specification v1957 -- Train Resistance on Level Track (`calc-rail.js`, Group J, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group J, the
> rail bench in `calc-rail.js`, no new dependency and no network call.
>
> **The gap.** `tonnage-rating-grade` takes rolling resistance as entered and said it "does not compute the Davis
> or any other speed-dependent resistance formula"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a car weight outside
(0, 400] tons, an axle count that is not a whole number from 2 to 12, a speed outside 0 to 150 mph, an air
coefficient outside (0, 1], or a car count that is not a whole number from 1 to 1,000 returns `{ error }`. The
module's form factory draws number fields only, so the air coefficient is entered and its three usual values are
in the label. Citation: Davis (1926), the 1970 modified Davis equation (AREMA Manual Chapter 16) and AAR RP-548, by
name, GOVERNANCE.general. Aliases: `train resistance lb per ton`, `davis formula train resistance`,
`modified davis equation`, `davis equation`, `train rolling resistance`, `railcar rolling resistance`,
`how much horsepower to pull a train`.

## 2. The tile

### 2.1 `train-resistance-davis`

Pounds per ton; w = tons per axle, n = axles per car, V = mph.

| Form | Relation |
|---|---|
| Modified Davis, 1970 (the answer) | 0.6 + 20/w + 0.01 V + K V^2/(w n) |
| AAR RP-548 | 1.3 + 72.5/(w n) + 0.015 V + 0.055 V^2/(w n), four axles; 18.125 lb per axle otherwise |
| Davis, 1926, freight cars | 1.3 + 29/w + 0.045 V + 0.0005 A V^2/(w n), A = 110 sq ft |
| Train pull, lb | R x car tons x cars |
| Power at the rail, hp | pull x V / 375 |
| Equivalent grade, % | R / 20 |

## 3. Worked examples (registry rows)

- A hundred 132-ton four-axle cars at 30 mph, K 0.07: 1.983 lb/ton, 26,180 lb, 2,094 hp, 0.099% grade.
- Szanto (CORE 2016) Table 1, RP-548, 80 tonne wagon: 11.9 N/t at 20 km/h and 26.9 N/t at 100 km/h; the tile
  gives 11.8 and 26.8.
