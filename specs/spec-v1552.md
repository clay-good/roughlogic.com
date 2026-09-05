# roughlogic.com Specification v1552 -- Wind Shear Power-Law Speed at Hub Height (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Wind measured at a met tower is not the wind at the hub, and the extrapolation between them is a power law whose exponent depends on the terrain. Because power goes as the cube of speed, a small error in the shear exponent becomes a large error in the energy estimate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive reference height, target height, or wind speed, or a negative shear exponent returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the power-law shear relation with typical exponents by terrain, and IEC 61400-12 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`wind shear power law`, `hub height wind speed`, `alpha shear exponent`, `extrapolate wind speed height`, `met tower to hub height`.

## 2. The tile

### 2.1 `wind-shear-hub-height` -- Wind Shear Power-Law Speed at Hub Height

```
power law     v2 = v1 x (z2 / z1)^alpha
alpha         0.10 water and smooth ground; 0.14 the open-country default;
              0.20 crops and scattered obstacles; 0.25 to 0.40 woodland and suburbs
log law       the alternative form, using a roughness length z0
energy effect power goes as v^3, so an error in alpha is amplified threefold
```

The exponent is the whole calculation and it is site-specific. The 1/7 (0.14) value that gets used as a default
belongs to flat open country in neutral stability; over crops, brush, or trees the profile is much steeper, and
over water much flatter. Getting it from measurement -- two anemometer heights on the same tower -- is worth far
more than any table, and it is the reason met masts carry multiple levels.

The amplification is what makes it consequential. Because power is cubic, a shear exponent that is wrong by 0.05
produces a wind speed error of a few percent and an ENERGY error of roughly three times that. On a
twenty-year project that difference is the whole margin, which is why bankable energy assessments measure shear
rather than assume it, and increasingly measure at hub height directly with remote sensing.

Shear also varies through the day and the year. Nights are typically far more sheared than afternoons because the
atmosphere stabilizes, so a short measurement campaign taken in one season can mislead in both directions.

**Inputs:** measured wind speed and its measurement height, the target hub height, and the shear exponent (or two measured speeds at two heights to derive it)

**Outputs:** the extrapolated wind speed at the target height, the shear exponent derived from two measurements when both are entered, the ratio of energy at the two heights, and the sensitivity of energy to a stated change in the exponent

## 3. Worked example

A met tower reading 15 mph at 160 ft, extrapolated to a 330 ft hub, with alpha = 0.2:

```
v2 = 15 x (330 / 160)^0.2 = 15 x 1.1558 = 17.34 mph
energy ratio = (17.34 / 15)^3      = 1.544
```

17.3 mph at the hub, and **54% more energy** than at the measurement height -- from height
alone. That is the economic case for taller towers in one line.

Now the sensitivity that matters. Assume alpha = 0.14 instead of 0.2 for the same tower:

```
v2 = 15 x (2.062)^0.14 = 16.60 mph
energy vs the alpha=0.2 case = (16.60 / 17.34)^3 = 0.878
```

A shear exponent wrong by 0.06 costs 12% of the energy estimate. On a
project financed against that estimate, that is not a rounding difference.

## 4. Scope and non-goals

A power-law extrapolation with a single exponent. Real wind profiles are not power laws: they change with
atmospheric stability through the day and season, they distort over complex terrain and near forest canopies
where the profile can be displaced upward or even reversed, and a single annual-average exponent hides large
diurnal variation. Extrapolating far above the measurement height compounds all of it, and extrapolating more
than roughly twice the measurement height is not defensible for an energy assessment. The tile does not compute
turbulence intensity, wind veer across the rotor, or the inflow angle, all of which affect both energy and
loads. It does not produce an energy estimate, which needs a full distribution (`weibull-capacity-factor`) and a
power curve. A bankable assessment uses measured hub-height data or remote sensing to IEC 61400-12 and an
independent energy assessor, which govern.
