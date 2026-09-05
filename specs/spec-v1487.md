# roughlogic.com Specification v1487 -- Refrigerated Display Case Load and Infiltration (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A supermarket display case's refrigeration load is mostly not the product. It is infiltration through the open front, plus lights, fans, defrost, and anti-sweat heaters -- and those internal loads are a large share that a box-load calculation misses entirely.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative load component, a non-positive case length, or a run-hours fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the case load summation with the 3.412 BTU/h per watt internal-load conversion as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`display case load`, `refrigerated case heat load`, `anti sweat heater load`, `case infiltration load`, `supermarket case refrigeration`.

## 2. The tile

### 2.1 `refrigerated-case-load` -- Refrigerated Display Case Load and Infiltration

```
total load     Q = Q_infiltration + Q_transmission + Q_product + Q_internal
internal       Q_internal = lights + evaporator fans + anti-sweat + defrost recovery
infiltration   open vertical cases: the dominant term, driven by air curtain performance
electrical     every watt of internal electric load becomes refrigeration load, 3.412 BTU/h per W
```

The rule that makes this tile useful is that every watt consumed inside the refrigerated envelope has to be
removed twice: once as electricity paid at the meter, once as heat paid at the compressor. Case lights, fan
motors, and anti-sweat heaters therefore cost roughly their own wattage again in refrigeration, and on a
low-temperature case the compressor's poor efficiency at low suction makes that second payment worse than the
first.

That is why LED retrofits and anti-sweat controls pay back faster in refrigeration than the lighting arithmetic
alone suggests, and why the sum matters more than any single term. Infiltration through the air curtain of an
open vertical case is usually the largest line of all and the hardest to improve without doors -- which is the
real argument for doors, and the tile makes it by showing the split.

**Inputs:** case length and type, infiltration and transmission loads per foot, product pull-down load, lighting, fan, anti-sweat and defrost wattages with their run fractions, and the suction temperature

**Outputs:** each load component in BTU/h, the total case load, the internal electric load expressed as both kW and BTU/h, the percent of total that is internal, and the load reduction from a stated internal-load retrofit

## 3. Worked example

A 12 ft open vertical medium-temperature case: infiltration 780 BTU/h per ft, transmission 95 BTU/h per ft,
product 1,200 BTU/h. Internal electric: lights 240 W, evaporator fans 310 W, anti-sweat 180 W at a 60% run
fraction.

```
infiltration  12 x 780 = 9,360 BTU/h
transmission  12 x  95 = 1,140 BTU/h
product                 = 1,200 BTU/h
lights        240 W x 3.412           =   819 BTU/h
fans          310 W x 3.412           = 1,058 BTU/h
anti-sweat    180 W x 0.60 x 3.412    =   369 BTU/h
total                                 = 13,946 BTU/h
```

Internal electric is 2,246 BTU/h, **16% of the case load**, and it is the only part that responds to a retrofit
that touches no refrigeration equipment. Swap the lights for LED at 90 W and add anti-sweat control cutting the
run fraction to 20%: internal drops to 1,608 BTU/h, the case load falls to 13,308, and the store also stops
paying for 270 W of electricity at the meter -- the saving is collected twice.

## 4. Scope and non-goals

A load summation for one case from component figures the user supplies. It does not compute infiltration from
first principles, which depends on air curtain design, store humidity, aisle air velocity, and case
maintenance, and which is the largest and most uncertain term; manufacturer case load data at stated store
conditions is far better than any calculation here and is what should be entered. It does not correct for store
relative humidity, which drives both infiltration latent load and anti-sweat demand strongly. Defrost heat
recovery, case-to-case interaction, and night curtains are not modeled. It does not size the rack, the suction
group, or the piping. The case manufacturer's published load data at the actual store conditions and the
refrigeration system designer govern.
