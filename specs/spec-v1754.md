# roughlogic.com Specification v1754 -- Vapor Pressure Deficit from Air and Leaf Temperature (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Relative humidity tells a grower almost nothing on its own, because the same percentage means a different drying power at every temperature. Vapor pressure deficit is the quantity that actually drives transpiration, and it is computed from the leaf's temperature, not the air's.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive absolute temperature, a relative humidity outside 0 to 100 percent, or a temperature outside the correlation's valid range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Tetens saturation-vapour-pressure correlation and the deficit definition with the horticultural literature and the crop producer guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`vapor pressure deficit`, `vpd greenhouse`, `leaf vpd calculation`, `transpiration driving force`, `humidity deficit kpa`.

## 2. The tile

### 2.1 `vapor-pressure-deficit` -- Vapor Pressure Deficit from Air and Leaf Temperature

```
saturation       es(T) = 0.6108 x exp(17.27 T / (T + 237.3)) kPa, with T in degrees C
air vapour       e_air = RH/100 x es(T_air)
leaf VPD         VPD = es(T_leaf) - e_air -- the deficit the leaf actually sees
air VPD          es(T_air) - e_air -- the deficit a room sensor reports, which is
                 NOT the same number
leaf temperature a transpiring leaf runs below air temperature, commonly 1 to 4 degF,
                 and above it under strong light with the stomata closed
target band      roughly 0.4 to 0.8 kPa for propagation, 0.8 to 1.2 for vegetative
                 growth, and up to about 1.5 for fruiting crops
consequence      too low and the leaf cannot transpire, calcium does not move, and
                 disease pressure rises; too high and the stomata close and growth
                 stops with water in the tank
```

Relative humidity is a ratio and vapor pressure deficit is a force. Seventy percent relative humidity at 60
degF and 70 percent at 85 degF describe very different greenhouses -- the warm one has roughly twice the
drying power, because saturation vapor pressure rises steeply and non-linearly with temperature while the
percentage stays put. Every grower who has moved a crop between a spring and a summer house has felt that
difference, and the deficit is the number that names it.

The leaf temperature is what makes this a real calculation rather than a psychrometric conversion. The vapor
inside the leaf is saturated at the leaf's temperature, not the air's, and a transpiring leaf under moderate
light sits below the air. Using air temperature on both sides overstates the deficit, which is the direction
that matters: a house reading a comfortable deficit from a room sensor may be pushing the crop harder than the
number suggests, or less hard, depending on which way the leaf has gone.

The failure at both ends is worth stating plainly because they look nothing alike. A deficit that is too low
stalls transpiration, and since calcium moves only with the transpiration stream, the symptom is a calcium
disorder -- tipburn, blossom end rot -- in a house with plenty of calcium in the feed. A deficit that is too
high closes the stomata, and photosynthesis stops even though the roots are wet and the light is good.

**Inputs:** the air temperature, the relative humidity, and the leaf temperature or the leaf-to-air temperature offset

**Outputs:** the saturation vapor pressure at air and leaf temperature, the actual vapor pressure, the leaf-based vapor pressure deficit, the air-based deficit for comparison, and where the result falls against the entered crop target band

## 3. Worked example

A house at 75 degF and 65 percent relative humidity, with the leaf 2 degF below air at 73 degF:

```
T_air  = 75 degF = 23.89 C   es(T_air)  = 2.9641 kPa
T_leaf = 73 degF = 22.78 C   es(T_leaf) = 2.7719 kPa
e_air  = 65/100 x 2.9641 = 1.9266 kPa
VPD    = 2.7719 - 1.9266 = 0.8452 kPa
```

**0.85 kPa sits in the vegetative band and the house is in good shape.** The number a room sensor would have
reported is different:

```
air VPD = 2.9641 - 1.9266 = 1.0374 kPa
```

**The air-based figure is 1.23 times the leaf-based one -- 23 percent high** -- from a leaf that is only 2 degF
cooler than the air. That is the whole reason leaf temperature belongs in the calculation, and an infrared
leaf reading is a cheap instrument for a correction of that size.

**Now put the leaf above the air instead.** Under strong light with the stomata closing, the same leaf can run
3 degF warmer than the air at 78 degF, and the deficit becomes:

```
VPD = es(78 degF) - 1.9266 = 1.3475 kPa
```

The air and the humidity did not move at all, and the deficit the leaf sees has gone from 0.85 to 1.35 kPa --
**a 59 percent increase from a temperature the room sensor cannot see.** This is the runaway that closes
stomata on a bright afternoon in a house whose humidity reading looks fine.

**And the humidity lever is weaker than it feels.** Raising relative humidity from 65 to 80 percent at the same
temperatures takes the leaf deficit only to 0.40 kPa, a 53 percent reduction -- real, but far less than the
swing a few degrees of leaf temperature produced.

## 4. Scope and non-goals

A psychrometric calculation of a driving force. It does not compute transpiration rate, which depends on stomatal conductance, radiation, air movement, and leaf area in ways a deficit alone cannot carry (`greenhouse-transpiration-water` estimates water use from the energy balance instead). It does not measure or predict leaf temperature, which must be entered or offset -- an infrared thermometer is the field instrument, and the offset varies with light, air movement, and whether the stomata are open. The target bands are a starting range from the horticultural literature and vary by crop, growth stage, and production system; the crop's producer guide governs. It does not address the control sequence that holds a deficit, the interaction with carbon dioxide enrichment, or condensation and disease risk on the crop or the glazing. The crop's producer guide and a calibrated leaf and air sensor govern.
