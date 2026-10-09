# roughlogic.com Specification v1948 -- Shaft Critical Speed (Rayleigh Method) (`calc-millwright.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> millwright bench in `calc-millwright.js`, no new dependency and no network call.
>
> **The gap.** `driveshaft-crit` gives the critical speed of a uniform shaft and `centrifugal-force` called the whirl
> speed separate; nothing handled a shaft carrying rotors, wheels, or sheaves.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a negative weight,
deflection, or speed, a mass without its deflection (or the reverse), or no mass at all returns `{ error }`. Citation:
Rayleigh's method (Shigley Ch. 7) by name, GOVERNANCE.general. Aliases: `shaft critical speed`,
`rayleigh critical speed`, `whirl speed`, `rotor critical speed`, `is my shaft running near critical`.

## 2. The tile

### 2.1 `shaft-critical-speed-rayleigh`

| Quantity | Relation |
|---|---|
| First critical | omega = sqrt(g sum(w y)/sum(w y^2)), N = 60 omega/(2 pi) |
| One mass | N = 187.7/sqrt(y in) |
| Ratio | operating / N, flagged within 80%-120% |

## 3. Worked example (registry row, first principles)

100 lb at 0.002 in, 60 lb at 0.0015 in: 4,368.5 rpm; at 3,600 rpm the ratio is 0.824 (in the resonance band).
