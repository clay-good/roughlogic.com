# roughlogic.com Specification v1756 -- Shade Cloth Percentage and Transmitted Light (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A shade cloth is sold by a percentage that describes the fabric alone, while the crop lives under the fabric and the glazing together. The two multiply, and the system number is always lower than the label -- often low enough to put a summer house below its own light target.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive outdoor light figure, a transmission or shade fraction outside 0 to 1, or a non-positive target returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the multiplicative transmission relation with the shade fabric manufacturer's data and the crop producer guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`shade cloth percent transmission`, `greenhouse shading light loss`, `shade fabric dli`, `summer shade greenhouse`, `glazing plus shade transmission`.

## 2. The tile

### 2.1 `shade-cloth-transmission` -- Shade Cloth Percentage and Transmitted Light

```
fabric rating    a "50% shade" cloth transmits about 50% of the light striking it;
                 the rating is the SHADE, so transmission = 1 - shade
system           the glazing and the cloth multiply: T_system = T_glazing x (1 - shade)
two layers       a second layer multiplies again: (1 - shade)^2, not 2 x shade
inside DLI       outdoor DLI x T_system (`ppfd-daily-light-integral`)
solar gain       the same fraction applies to the solar heat entering the house, which
                 is the reason the cloth was pulled in the first place
required shade   to land on a target DLI: shade = 1 - target / (outdoor DLI x T_glazing)
energy screen    a screen used at night for heat retention is a different product and a
                 different calculation (`thermal-screen-energy-saving`)
```

Shading is a light decision disguised as a temperature decision. A grower pulls the cloth because the house is
hot, and the house cools because less radiation enters -- but the crop loses exactly the same fraction of the
light it was using to grow. That trade is unavoidable and it is why shade percentage is chosen so carefully:
the cloth that makes the house comfortable at noon can hold the crop below its light target for the whole day.

The multiplication is the arithmetic most often got wrong, and it runs in the grower's disfavour. A house
whose glazing already passes only two thirds of the light does not deliver half of the outdoor light under a
50 percent cloth; it delivers half of two thirds. The label describes the fabric in isolation and the crop
never sees the fabric in isolation.

Two layers compound rather than add, and the difference is large. Growers who pull an energy screen and a
shade cloth at the same time, or who leave a retracted screen partially deployed under a fixed cloth, are
multiplying two fractions and can arrive at a quarter of the light they intended. The same rule makes a light
retractable cloth over a light fixed one a poor substitute for one correctly chosen cloth.

**Inputs:** the outdoor daily light integral or solar intensity, the glazing transmission, the shade cloth percentage, optionally a second layer, and the crop's target daily light integral

**Outputs:** the system transmission, the daily light integral reaching the crop, the figure under two layers, the shortfall or surplus against the crop target, the shade percentage that would land exactly on the target, and the reduction in transmitted solar heat

## 3. Worked example

A house whose glazing passes 65 percent, under a 50 percent shade cloth, on a day with an outdoor daily light
integral of 45 mol/m^2/day:

```
T_system  = 0.65 x (1 - 0.50) = 0.325
inside DLI = 45 x 0.325 = 14.62 mol/m^2/day
```

**The label says 50 percent shade and the crop receives 32.5 percent of the outdoor light, not 50 percent.** The
glazing took its share first, and the two fractions multiplied.

**Against a 20 mol target the house is now short.** 14.6 is 5.4 mol/m^2/day below the target -- **the cloth that
fixed the temperature has put the crop under its own light requirement**, which is the trade nobody prices
when the cloth is ordered. The shade percentage that would land exactly on 20 is:

```
required T = 20 / (45 x 0.65) = 0.684
shade      = 1 - 0.684 = 31.6%
```

so a 32 percent cloth, not a 50 percent one.

**Add a second layer and it compounds.** Two 50 percent layers transmit 25 percent of what reaches them --
a quarter of the light, where adding the two shade percentages would have said none was left at all:

```
inside DLI = 45 x 0.65 x (1 - 0.50)^2 = 7.31 mol/m^2/day
```

**7.3 mol/m^2/day is 37 percent of the target** -- a propagation light level under what was meant to be a
production crop, reached by deploying two ordinary cloths at once.

**The heat side is the reason the cloth exists, and it is real.** Outdoor peak of 290 Btu/h per square foot
arrives as 188 through the glazing and 94 under the cloth, so across 2,880 sq ft the cloth removes
271,440 Btu/h of solar gain from the ventilation system's job -- about 23 tons. That is a large number, and it
is bought with exactly the light the crop lost.

## 4. Scope and non-goals

A transmission and light-integral calculation. Shade ratings are a nominal fabric property measured under specific conditions and the field value varies with fabric age, dirt, weave, sun angle, and whether the cloth is inside or outside the glazing -- an exterior cloth rejects heat before it enters and outperforms the same fabric hung inside, and this does not distinguish the two. It does not compute the resulting house temperature, which depends on ventilation and the crop's transpiration (`fan-pad-evaporative-cooling`, `greenhouse-transpiration-water`), nor does it address the diffuse-light benefit some fabrics claim or the spectral selectivity of photoselective films. It does not schedule or control the cloth, and it takes no position on structural loads or fire ratings of the fabric. The fabric manufacturer's data, the crop's producer guide, and the greenhouse designer govern.
