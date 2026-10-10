# roughlogic.com Specification v1956 -- Clock Time to Solar Time (`calc-solarfield.js`, Group A, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group A, the
> solar field bench in `calc-solarfield.js`, no new dependency and no network call.
>
> **The gap.** `solar-altitude-angle` and `solar-azimuth-angle` take hours from solar noon and say the equation of
> time "is separate"; nothing converted a clock time.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a clock hour outside
0 to 23, a minute outside 0 to 59, a day outside 1 to 366, a longitude outside -180 to 180, or a UTC offset
outside -12 to +14 returns `{ error }`. Longitude and offset are negative west of Greenwich, as in `solar-times`.
Citation: Spencer (1971) as given in Duffie and Beckman eqs. 1.5.2 and 1.5.3, by name, GOVERNANCE.general.
Aliases: `equation of time`, `solar time from clock time`, `local solar time`, `apparent solar time`,
`hours from solar noon`, `when is solar noon`, `what time is solar noon`.

## 2. The tile

### 2.1 `solar-time-correction`

| Quantity | Relation |
|---|---|
| Equation of time, min | E = 229.2 (0.000075 + 0.001868 cos B - 0.032077 sin B - 0.014615 cos 2B - 0.04089 sin 2B), B = (n - 1) 360/365 |
| Longitude correction, min | 4 (longitude - 15 x UTC offset) |
| Solar time | clock time + longitude correction + E |
| Hours from solar noon | solar time - 12 |
| Solar noon on the clock | 12:00 - (longitude correction + E) |

A longitude correction over two hours is flagged as a probable sign error.

## 3. Worked examples (registry rows)

- Duffie and Beckman Example 1.5.1: Madison (89.4 W), February 3, 10:30 Central Standard. E = -13.5 min,
  correction -11.1 min, solar time 10:19.
- Denver (105 W) on daylight time, day 180: longitude correction -60 min, solar noon at 13:03 on the clock.
