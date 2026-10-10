# roughlogic.com Specification v1955 -- Add-a-Hole Zone Leakage (`calc-buildingperf.js`, Group C, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group C, the
> building-performance bench in `calc-buildingperf.js`, no new dependency and no network call.
>
> **The gap.** `zonal-pressure-diagnostics` reports only the ratio of a zone's two planes and said the add-a-hole
> refinement "is not computed here"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive house
pressure, a zone reading outside the house pressure, a starting reading at either end, a reading that moves the
wrong way for the plane opened, a flow that does not rise, or a path flow above the starting blower-door flow
returns `{ error }`. Citation: the add-a-hole and open-a-door methods (Blasnik and Fitzgerald) as charted in The
Energy Conservatory's ZPD Trainer guide, by name, GOVERNANCE.general. Aliases: `add a hole test`,
`add a hole method`, `open a door method zone leakage`, `zone leakage cfm50`, `attic bypass leakage cfm`,
`house to garage leakage`, `how much air leaks through the attic`.

## 2. The tile

### 2.1 `zonal-add-a-hole`

P is the house pressure and z the zone pressure, both to outside; n = 0.65; dQ is the rise in blower-door flow.

| Quantity | Relation |
|---|---|
| Series balance before the hole | C_hz (P - z1)^n = C_zo z1^n |
| Hole between house and zone | C_zo = dQ / (z2^n - z1^n) |
| Hole between zone and outside | C_hz = dQ / ((P - z2)^n - (P - z1)^n) |
| Flow through the zone before the hole | C_hz (P - z1)^n |
| Each plane alone at house pressure | C P^n |

A zone that moves less than a tenth of the house pressure is flagged as too small a change to trust.

## 3. Worked examples (registry rows)

- Energy Conservatory ZPD Trainer guide p. 8: garage 5 Pa to outside (45 Pa to the house), door to the house
  opened, 3,595 to 4,503 CFM50. Printed 280 / 1,170 / 262 CFM50 and 7.3%; the tile returns 280.5 / 1,169.9 /
  261.9 and 7.29%.
- A vent opened to outside, simulated forward from planes of 30 and 80 CFM/Pa^0.65 and recovered exactly.
