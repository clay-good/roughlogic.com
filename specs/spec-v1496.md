# roughlogic.com Specification v1496 -- Minimum Ventilation vs Building Tightness Limit (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Air sealing a house past a certain point requires adding mechanical ventilation, and the building tightness limit is where that point sits. Sealing below it without ventilating is how a weatherization job produces a moisture and indoor-air-quality problem that did not exist before.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, floor area, occupant count, or LBL factor returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ASHRAE 62.2 by name and the LBL simplified infiltration factor, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`building tightness limit`, `btl weatherization`, `minimum ventilation air sealing`, `ashrae 62.2 tightness`, `when to add ventilation`.

## 2. The tile

### 2.1 `building-tightness-limit` -- Minimum Ventilation vs Building Tightness Limit

```
minimum ventilation   Q_min from ASHRAE 62.2 for the house
tightness limit       BTL = the CFM50 whose natural infiltration equals Q_min
natural infiltration  Q_nat = CFM50 / N     (N the LBL climate and height factor)
so                    BTL = Q_min x N
verdict               tested CFM50 below BTL -> mechanical ventilation required
```

The logic runs backwards from the ventilation requirement. A house needs a certain outdoor air rate; a leaky
house gets some of that for free through infiltration; the tightness limit is the leakage below which the free
share no longer covers the requirement. Above the limit, sealing is pure benefit. Below it, sealing without
adding a fan trades energy for air quality, and that is not a trade a contractor should make silently.

The `N` factor is what ties the limit to place and building: a windy cold climate drives far more natural
infiltration through the same hole than a mild one, and a two-storey house more than a ranch. So the same CFM50
that is comfortably leaky in Minnesota can be below the limit in Georgia, and a national rule of thumb gets it
wrong in both directions. Note also that infiltration is not ventilation in any real sense -- it is unfiltered,
uncontrolled, weather-dependent, and often drawn through a crawl space -- which is why current practice increasingly
ventilates mechanically regardless of the limit.

**Inputs:** conditioned floor area, volume, number of bedrooms or occupants, climate zone and building height for the LBL factor, and the tested CFM50

**Outputs:** the ASHRAE 62.2 minimum ventilation rate, the LBL factor, the building tightness limit in CFM50 and ACH50, the tested value against it, and the mechanical ventilation capacity required if the house is below the limit

## 3. Worked example

A 2,400 sq ft, 3-bedroom house, 19,200 cu ft, testing 1,850 CFM50, with an LBL factor N of 17 for a
one-storey house in a moderate climate:

```
ASHRAE 62.2 rate = 0.03 x 2,400 + 7.5 x (3 + 1) = 72 + 30   = 102 cfm
BTL              = 102 x 17                                  = 1,734 CFM50
tested                                                        = 1,850 CFM50
ACH50            = 1,850 x 60 / 19,200                          = 5.78
```

The house sits 116 CFM50 **above** the limit, so as tested it is still drawing enough air naturally. But
the margin is 7%, which means a modest air-sealing job -- one afternoon of can lights, top plates,
and rim joist -- puts it below, and the scope of work should include the ventilation fan rather than discovering
the need afterward.

Estimated natural infiltration today: `1,850 / 17` = 109 cfm, against a 102 cfm requirement.

## 4. Scope and non-goals

A screen comparing tested leakage against the ventilation requirement. It uses the LBL simplified
infiltration model, whose factor is a climate and height approximation rather than a measurement, and estimated
natural infiltration from it is indicative only; real infiltration swings by a factor of several between a calm
mild day and a windy cold one, which is precisely the argument against relying on it. It does not size, select,
or locate the ventilation system, evaluate distribution, or address whether the ventilation air is filtered,
tempered, or dehumidified. It does not perform the combustion safety testing that must accompany any air sealing
in a house with atmospherically vented appliances -- that is `caz-depressurization-limit`, and it is not
optional. The adopted energy code, ASHRAE 62.2, and the weatherization program standards govern.
