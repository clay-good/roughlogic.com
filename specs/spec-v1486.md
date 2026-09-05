# roughlogic.com Specification v1486 -- Evaporator TD, Capacity, and Coil Humidity Effect (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Coil TD -- the difference between room temperature and evaporator saturation -- is the single design choice that sets both capacity and room humidity, and the two pull opposite ways. A high TD buys capacity cheaply and dries the product out; a low TD holds humidity and costs coil surface. Nothing in the catalog puts the trade in front of the designer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load, UA, or TD, or an evaporator saturation temperature at or above the room temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the UA x TD coil relation and the customary TD ranges by application as standard refrigeration practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`evaporator td`, `coil td humidity`, `refrigeration td selection`, `evaporator temperature difference`, `coil surface humidity`.

## 2. The tile

### 2.1 `evaporator-td-selection` -- Evaporator TD, Capacity, and Coil Humidity Effect

```
capacity        Q = U A x TD          (capacity is linear in TD)
TD              TD = T_room - T_sat,evap
approximate RH  higher TD -> lower coil surface temperature -> more dehumidification
typical TD      10 degF for high-humidity produce, 12 to 15 degF general storage,
                6 to 8 degF for very high humidity, 8 to 10 degF for freezers
```

A coil's capacity is very nearly proportional to TD, so halving the TD doubles the coil surface needed for the
same load. That is why the cheap design is a high TD. What it costs is water: a colder coil surface condenses
and freezes more moisture out of the room air, the room's relative humidity falls, and the product loses weight.
For a produce cooler that weight loss is the revenue, which is why high-humidity rooms are designed at 8 to 10
degF TD and sometimes lower.

In a freezer the same physics appears as frost. A high TD frosts the coil faster, which drives more defrost
cycles, and each defrost puts heat into the room that the plant then removes again. So a high-TD freezer coil is
not only drying the product, it is paying an energy penalty twice. The tile reports the surface area implied at
each TD so the capital cost of a lower TD is visible next to what it buys.

**Inputs:** room temperature, evaporator saturation temperature or the desired TD, the design load, the coil UA or published capacity at a reference TD, and the target relative humidity

**Outputs:** the TD, the coil capacity at that TD, the capacity at the coil published rating TD for comparison, the surface area or coil count implied, and the TD required to meet the load with a given coil

## 3. Worked example

A 35 degF produce cooler with a 96,000 BTU/h load. A candidate coil is published at 60,000 BTU/h at 10 degF TD,
so its UA is 6,000 BTU/h per degF:

```
at 10 degF TD (25 degF suction):  6,000 x 10 = 60,000 BTU/h -> 1.6 coils, high humidity
at 15 degF TD (20 degF suction):  6,000 x 15 = 90,000 BTU/h -> 1.07 coils, drier room
at  8 degF TD (27 degF suction):  6,000 x  8 = 48,000 BTU/h -> 2.0 coils, highest humidity
```

Two coils at 8 degF TD instead of one at 16 degF is double the evaporator capital, and for leafy produce it is
routinely the right call: shrink at low humidity can cost more per season than the second coil costs once. The
suction pressure moves with the choice too -- 27 degF suction instead of 20 degF is meaningfully less compressor
work for the same load, so the low-TD design partly pays for itself in operating cost.

## 4. Scope and non-goals

A linear UA x TD screen for coil selection and the humidity trade behind it. It does not predict room relative
humidity, which depends on the load's moisture content, infiltration, product respiration, defrost water, and
air change rate as much as on coil TD, and any humidity figure taken from TD alone is indicative only. It does
not select a coil, compute frost accumulation or defrost intervals, account for the capacity loss as frost builds
between defrosts, or size the air throw and distribution, which determine whether the room is uniform. Coil
published capacities are at stated conditions and refrigerants and must be corrected before use. Room load is a
separate calculation. The coil manufacturer's selection data, IIAR, and the refrigeration system designer
govern.
