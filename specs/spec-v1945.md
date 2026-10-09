# roughlogic.com Specification v1945 -- Pulp Density and Percent Solids (Marcy Scale) (`calc-mining.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> mining and processing bench in `calc-mining.js`, no new dependency and no network call.
>
> **The gap.** The slurry tiles take density as an input; nothing converted a Marcy-scale pulp reading to percent
> solids or a target percent solids to the water a circuit needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive liquid
SG, solids no denser than the liquid, both or neither of percent solids and pulp SG entered, percent solids of 100 or
more, a pulp SG outside the liquid-to-solids range, or a negative rate returns `{ error }`. Citation: the Marcy-scale
relations (Wills) by name, GOVERNANCE.general. Aliases: `pulp density`, `percent solids slurry`, `marcy scale`,
`pulp specific gravity to percent solids`, `how much water to add to make slurry`.

## 2. The tile

### 2.1 `pulp-density-solids`

| Quantity | Relation |
|---|---|
| Pulp SG | 1/SG_p = w/SG_s + (1 - w)/SG_l |
| Percent solids | w = SG_s (SG_p - SG_l)/(SG_p (SG_s - SG_l)) |
| Water | dry rate x (1 - w)/w |
| Slurry flow | mass over pulp density, in gpm |

## 3. Worked example (registry row, first principles)

40% solids, SG 2.7, 100 st/h dry: pulp SG 1.337, 19.8% solids by volume, 150 st/h water, 747 gpm of slurry.
