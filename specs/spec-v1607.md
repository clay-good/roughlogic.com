# roughlogic.com Specification v1607 -- Water Pressure Zone HGL and Service Pressure (`calc-water.js`, Group M Water and Wastewater Operations, municipal water, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; municipal water and collection systems), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Service pressure anywhere in a distribution system is the hydraulic grade line minus the ground elevation, times 0.433. That one line explains every pressure complaint, sizes every pressure zone, and locates every PRV -- and it is arithmetic an operator can do standing at the meter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hydraulic grade line, or a ground elevation at or above the hydraulic grade line returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the 0.433 psi-per-foot relation and the conventional 40 to 80 psi service band with the plumbing code named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`water pressure from elevation`, `hydraulic grade line psi`, `pressure zone elevation band`, `why is my water pressure low`, `0.433 psi per foot`.

## 2. The tile

### 2.1 `pressure-zone-hgl` -- Water Pressure Zone HGL and Service Pressure

```
static pressure    P = (HGL - ground elevation) x 0.433      (psi, feet)
HGL                the tank overflow elevation at static; lower under flow by the friction
zone limits        commonly 40 psi minimum service and 80 psi maximum at the customer
                   (above 80 psi the plumbing code requires a pressure reducing valve)
zone boundary      the elevation band a single tank can serve within those limits
elevation span     the band is (80 - 40) / 0.433 = about 92 ft of elevation
```

The whole structure of a distribution system falls out of the elevation span. With a 40 psi floor and an 80 psi
ceiling, one pressure zone can cover roughly 92 feet of ground elevation -- so a town on a hillside with 300 feet
of relief needs at least three zones, and where the zone boundaries fall is a consequence of that arithmetic
rather than of anything else.

Under flow the HGL drops by the friction losses to the point in question, so the pressure at a customer during a
fire flow or a peak-hour demand is lower than the static number. That is why the low corner of a zone is checked
at peak flow and the high corner at static: the two limits bind at opposite conditions, and a zone that passes
both at the same condition has not been checked properly.

For an operator taking a complaint, the value is diagnostic. A customer at 640 ft elevation who should see
{(780-640)*0.433:.0f} psi statically and reads 38 psi has a problem between the tank and their meter -- a closed
valve, a plugged service, a failed PRV -- and the arithmetic is what turns "low pressure" into a locatable
fault.

**Inputs:** tank overflow or hydraulic grade line elevation, ground elevation at the point of interest, the friction loss to that point at the flow of interest, and the minimum and maximum service pressure limits

**Outputs:** the static pressure at the entered elevation, the pressure under the entered flow condition, the elevation band the zone can serve within the pressure limits, the highest and lowest ground elevation servable, and the pressure at the zone extremes

## 3. Worked example

A tank with its overflow at 780 ft serving a customer at 620 ft:

```
static pressure = (780 - 620) x 0.433 = 160 x 0.433 = 69.3 psi
```

69 psi static -- comfortable. Now the zone extremes at 40 and 80 psi:

```
lowest servable elevation  = 780 - 80 / 0.433 = 595 ft   (below this, over 80 psi)
highest servable elevation = 780 - 40 / 0.433 = 688 ft   (above this, under 40 psi)
elevation band                                      = 92 ft
```

**One zone covers about 92 ft of elevation.** A service area spanning 250 ft of relief needs
three zones, and this tank serves the band from 595 to 688 ft. A house at 600 ft is
below the band and will see `(780 - 600) x 0.433` = 78 psi -- over the 80 psi limit, and the
plumbing code requires a PRV at that service.

Under fire flow, if friction to the low corner is 35 ft, the HGL there falls to 745 ft and the pressure at
620 ft becomes `(745 - 620) x 0.433` = 54 psi. The 20 psi regulatory minimum
during fire flow is the check that actually binds on the low end.

## 4. Scope and non-goals

A static and single-point pressure calculation. It does not model the distribution system: the hydraulic grade
line under flow comes from a network analysis, not from a single friction figure, and the HGL varies across a
zone. It does not evaluate fire flow availability (`required-fire-flow`, `hydrant-available-flow`), the 20 psi
minimum residual that regulations impose during fire flow, or transient pressures. It does not size pressure
zones, locate PRV or booster stations, or evaluate tank sizing and turnover. The 40 and 80 psi figures are
conventional service limits; the 80 psi PRV requirement is a plumbing code provision and the minimum service
pressure is set by the state primacy agency, and both vary. It does not address pressure-driven leakage or the
water quality consequences of pressure management. The state drinking water regulations, the adopted plumbing
code, the utility's distribution model, and the design engineer govern.
