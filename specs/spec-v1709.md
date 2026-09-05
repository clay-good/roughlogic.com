# roughlogic.com Specification v1709 -- Extrusion Output Rate and Line Speed (`calc-process.js`, Group G Cross-Trade Utilities, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An extrusion line's output is the cross-section it makes times how fast it makes it, and matching the extruder, the die, and the haul-off speed is what a line startup is. The arithmetic connects pounds per hour to feet per minute through the product's own cross-section.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive cross-sectional area, line speed, or melt density returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the mass balance relation between output and line speed with the material supplier processing data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`extrusion output rate`, `pounds per hour to feet per minute`, `extruder line speed calculation`, `draw down ratio extrusion`, `extrusion cooling limited`.

## 2. The tile

### 2.1 `extrusion-output-rate` -- Extrusion Output Rate and Line Speed

```
cross-sectional area  from the product geometry
volumetric output     Q = area x line speed
mass output           lb/h = Q x melt density, converted
line speed            v = mass output / (area x density)
draw-down             the die is larger than the product; the ratio matters for
                      orientation and for dimensional control
balance               extruder output, die design, cooling capacity, and haul-off speed
                      must all agree; the slowest one governs
```

The relation is a mass balance and its value is in converting between the two units the trade uses: the
extruder is rated in pounds per hour and the line runs in feet per minute, and the bridge is the product's
cross-section. A line making a heavy profile runs slowly at high output; one making thin film runs fast at low
output, and the same extruder does both.

The constraint that actually limits most lines is cooling rather than output. An extruder can push more material
than the cooling can solidify, so pushing the screw faster produces product that has not set by the haul-off and
deforms -- which appears as dimensional drift rather than as an obvious failure. Cooling capacity is what sets
line speed on most profile and pipe lines, and adding extruder output without adding cooling buys nothing.

Draw-down is the other half of the geometry. The die opening is larger than the finished product and the material
is drawn down to size between the die and the calibrator or the haul-off, which orients the polymer and affects
properties as well as dimensions. The draw ratio is a process setting with consequences beyond size, and changing
line speed without changing output changes it.

**Inputs:** the product cross-sectional dimensions, the material density, the extruder output in pounds per hour, the line speed, the die opening dimensions, and the cooling capacity

**Outputs:** the cross-sectional area, the line speed for the entered mass output, the mass output at the entered line speed, the draw-down ratio from the die to the product, the material consumed per hour and per shift, and the output the entered cooling capacity supports

## 3. Worked example

A pipe 2.5 in outside diameter with a 0.1 in wall, running at 45 ft/min:

```
cross-sectional area = pi x 2.5 x 0.1 = 0.785 sq in    (thin-wall approximation)
volumetric rate      = 0.785 x 45 x 12 = 424 cu in/min
at 0.0347 lb/cu in (HDPE) = 14.7 lb/min = 883 lb/h
```

**883 pounds an hour** at 45 ft/min on this product.

Work it the other way. If the extruder is rated 400 lb/h:

```
line speed = 400 / (60 x 0.785 x 12 x 0.0347) = 20.4 ft/min
```

20.4 ft/min -- and whether the line can actually run there depends on the cooling.

**Cooling is usually what governs.** If the water bath can only remove the heat from 45 ft/min of this
product, pushing the extruder to 400 lb/h delivers pipe that has not solidified by the haul-off. It leaves the
bath soft, ovalizes under the puller, and the dimensions drift -- and the operator's instinct to slow the line
without slowing the screw makes it worse by increasing the material per foot.

Adding extruder output to a cooling-limited line buys nothing. That is the diagnosis this arithmetic supports.

Draw-down: if the die opening is 3.0 in OD for a 2.5 in product, the material is drawn down between die and
calibrator, which orients it and affects properties as well as size -- so line speed and output are not
independently adjustable without changing that ratio.

## 4. Scope and non-goals

A mass balance. It uses a thin-wall area approximation and a single melt density; the actual density at melt
temperature differs from the solid density and the correct value comes from the material supplier. It does not
address the extruder's own output characteristic, which depends on screw design, barrel temperatures, head
pressure, and the die's resistance, and which is not a fixed number. It does not model cooling capacity, which
usually governs line speed and which depends on bath length and temperature, product thickness, and the material's
thermal properties. It does not address die design, draw-down and draw resonance, calibration, or the dimensional
control system. It does not address the material's melt strength, which limits how much draw-down is possible.
The material supplier's processing data, the extruder and die manufacturers, and the process engineer govern.
