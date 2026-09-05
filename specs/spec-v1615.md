# roughlogic.com Specification v1615 -- Equivalent Single Axle Loads (ESAL) Traffic Loading (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Pavement damage goes as roughly the FOURTH power of axle load, which means one loaded truck does the damage of thousands of cars. ESALs convert a mixed traffic stream into equivalent 18,000 lb axles, and that conversion is why a road's truck percentage matters far more than its total volume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive axle load, traffic volume, or design life, or a truck percentage or distribution factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the AASHTO load equivalency concept and the fourth-power approximation with the agency design manual named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`esal calculation`, `load equivalency factor`, `fourth power law pavement`, `design esals pavement`, `truck traffic pavement damage`.

## 2. The tile

### 2.1 `esal-traffic-loading` -- Equivalent Single Axle Loads (ESAL) Traffic Loading

```
load equivalency  LEF ~ (axle load / 18,000)^4      (the fourth-power approximation)
per vehicle       sum the LEFs of all its axles
design ESALs      ESAL = AADT x truck % x trucks/day factor x LEF x growth x lanes x years
directional       apply the directional and lane distribution factors
growth            compounded over the design life
consequence       a car's LEF is about 0.0001; a loaded 5-axle truck's is about 1.0
```

The fourth power is the fact that reorders every intuition about pavement. A 2,000 lb car axle has an
equivalency factor of about `(2,000/18,000)^4` = 0.00015 -- so roughly seven thousand car axles equal one standard
truck axle. A road carrying 20,000 cars and 200 trucks a day gets nearly all its damage from the 1% that are
trucks, and widening it for cars does nothing for its pavement life.

Overload is the same fact pointed at enforcement. An axle at 22,000 lb rather than 18,000 does
`(22/18)^4` = 2.23 times the damage -- more than double for a 22% overload. That is the arithmetic behind weight
enforcement, and it is why a few overloaded vehicles can consume a pavement's design life quickly.

The growth term compounds and is easy to understate. Two percent annual growth over a 20 year design life is a
factor of 1.22 on the final-year traffic but a factor of about 24.3 on the cumulative ESALs relative to one
year's, and using first-year traffic without growth badly undersizes a pavement.

**Inputs:** AADT, truck percentage and classification, axle loads and configurations, directional and lane distribution factors, annual growth rate, and design life

**Outputs:** the load equivalency factor for each axle and vehicle type, the ESALs per truck, the design lane ESALs over the design life, the growth factor applied, the share of total damage from each vehicle class, and the ESAL effect of a stated axle overload

## 3. Worked example

A road with 12,000 AADT, 6% trucks, a 0.5 directional factor, a 0.9 lane factor, 2% growth, 20 year design
life, and an average of 1.2 ESALs per truck:

```
trucks per day in the design lane = 12,000 x 0.06 x 0.5 x 0.9 = 324
first year ESALs                  = 324 x 1.2 x 365 = 141,912
growth factor, 2% over 20 years   = ((1.02^20) - 1) / 0.02 = 24.30
design ESALs                      = 141,912 x 24.30 = 3,448,462
```

About 3.4 million ESALs. Note what the 11,280 cars a day contribute:

```
car axles: 11,280 x 2 x 0.5 x 0.9 x 0.00015 x 365 x 24.30 = about 13,500 ESALs
```

**Under half a percent of the total**, from 94% of the vehicles. The pavement is designed for the trucks and
essentially ignores the cars, which is the fourth-power law in one comparison.

Overload: if a fraction of those trucks run a 22,000 lb axle instead of 18,000, each such axle does
`(22,000/18,000)^4` = {(22/18)**4:.2f} times the damage. Ten percent of trucks running that overload adds roughly
{0.10*((22/18)**4-1)*100:.0f}% to the total ESALs -- and consumes design life accordingly.

## 4. Scope and non-goals

An ESAL estimate using factors the user supplies. The fourth-power approximation is a simplification; the
AASHTO load equivalency factors depend on axle configuration (single, tandem, tridem), the pavement's structural
number, and the terminal serviceability, and the published tables give different values than a plain fourth
power. Truck classification and axle load distributions should come from weigh-in-motion or classification counts
rather than from assumed averages, because a site's actual loading spectrum drives the answer. Growth rates
projected over a 20 year life are uncertain. It does not design a pavement (`pavement-structural-number`), and
mechanistic-empirical design does not use ESALs at all -- it uses the load spectrum directly, which is one reason
agencies are moving away from this method. The agency's pavement design manual, the traffic data, and the
pavement engineer govern.
