# roughlogic.com Specification v1951 -- Bare Flat Surface Heat Loss (`calc-hvacsystems.js`, Group C, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group C, the
> HVAC systems bench in `calc-hvacsystems.js`, no new dependency and no network call.
>
> **The gap.** `bare-pipe-heat-loss` covers a horizontal cylinder. Nothing computed the loss from a flat surface
> (a tank wall, an equipment panel, the top or underside of a duct), and the insulation calculators take the surface
> film coefficient as entered.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive
dimension, an emissivity outside (0, 1], equal surface and air temperatures, an unknown orientation, or a Rayleigh
number above 1e13 returns `{ error }`. Citation: Incropera Ch. 9 by name, GOVERNANCE.general. Aliases:
`flat surface heat loss`, `tank wall heat loss`, `bare surface heat loss`, `natural convection flat plate`,
`how much heat does an uninsulated tank lose`.

## 2. The tile

### 2.1 `flat-surface-heat-loss`

| Quantity | Relation |
|---|---|
| Vertical plate (L = height) | Nu = 0.68 + 0.670 Ra^(1/4)/[1 + (0.492/Pr)^(9/16)]^(4/9) to Ra 1e9; above, the all-range Churchill-Chu form |
| Horizontal, buoyancy-assisted (hot up / cold down), L = A/P | Nu = 0.54 Ra^(1/4) to Ra 1e7, else 0.15 Ra^(1/3) |
| Horizontal, stable (hot down / cold up) | Nu = 0.27 Ra^(1/4) |
| Radiation | h_rad = eps sigma (Ts^4 - Ta^4)/(Ts - Ta) |
| Loss | q = (h_conv + h_rad) A (Ts - Ta) |

## 3. Worked examples (registry rows)

- 8 by 10 ft painted wall, 180 F in 70 F air: 18,810 BTU/hr (h_conv 0.893, h_rad 1.244 BTU/hr ft2 F).
- Incropera Example 9.3 (0.75 by 0.3 m duct, 45 C in 15 C air): top 5.47, underside 2.07, sides 4.23 W/m2 K,
  each reproduced within 1.5% with the tile's own air properties.
