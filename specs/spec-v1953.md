# roughlogic.com Specification v1953 -- Glycol Fluid Factor (`calc-hvacsystems.js`, Group C, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group C, the
> HVAC systems bench in `calc-hvacsystems.js`, no new dependency and no network call.
>
> **The gap.** `hydronic-gpm-deltat`, `coil-capacity-verification` and `secondary-glycol-loop` take the fluid
> factor, specific heat or gravity of a glycol loop as entered, and `hydronic-gpm-deltat` hinted "about 485 at
> 30% PG", which the manufacturer's data does not support (468 to 476).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a concentration
outside 30-60% by volume, a temperature outside 40-325 F, or a negative load or temperature difference returns
`{ error }`. Citation: The Dow Chemical Company, DOWFROST HD Heat Transfer Fluid, Engineering Specifications for
Closed-Loop HVAC Systems, Form No. 180-01273-402AMS (April 2002), sections 4.2 and 4.3, by name,
GOVERNANCE.general. Aliases: `glycol fluid factor`, `glycol correction factor`, `propylene glycol specific heat`,
`glycol gpm correction`, `how much more flow does glycol need`.

## 2. The tile

### 2.1 `glycol-fluid-factor`

| Quantity | Relation |
|---|---|
| Specific heat, density, viscosity | the printed grid (30/40/50/60% by volume x 40/180/325 F), interpolated linearly; viscosity on its logarithm |
| Fluid factor | 60 x density / 7.4805 x specific heat (BTU/hr per gpm per F; 500 for water) |
| Flow multiplier | 500 / factor |
| Flow | GPM = Q / (factor x dT) |
| Freeze point | 8 / -7 / -28 / -60 F at 30 / 40 / 50 / 60%, interpolated |

## 3. Worked examples (registry rows, from the manufacturer's table)

- 40% at 40 F: specific heat 0.847, density 66.03, factor 448.6; 240,000 BTU/hr at 10 F takes 53.5 gpm (48 for water).
- 30% at 180 F: 0.947 and 62.60. 50% at 180 F: 0.878 and 63.50. 60% at 325 F: 0.936 and 58.59. 30% at 40 F: 0.894 and 65.30.
