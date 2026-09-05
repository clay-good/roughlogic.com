# roughlogic.com Specification v1546 -- Railcar Load Limit and Light Weight (`calc-rail.js`, Group J Trucking and Logistics, rail logistics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group J, Trucking and Logistics -- the existing category, hub `/groups/trucking/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Every freight car carries its own limits stencilled on the side: light weight, load limit, and gross rail load. Overloading past the load limit is a violation and a bearing failure risk, and the arithmetic is a subtraction that a shipper has to get right before the car leaves.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gross rail load or light weight, a light weight at or above the gross rail load, or a negative net weight returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the load limit relation with the AAR loading rules and the carrier route limits named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`railcar load limit`, `gross rail load 286k`, `car light weight capacity`, `railcar overload check`, `freight car capacity stencil`.

## 2. The tile

### 2.1 `railcar-load-limit` -- Railcar Load Limit and Light Weight

```
load limit      LL = gross rail load - light weight
net weight      the lading actually loaded
utilization     net / load limit
gross on rail   light weight + net; must not exceed the gross rail load
GRL classes     commonly 220,000, 263,000, 286,000, and 315,000 lb
route limit     the ROUTE's maximum gross rail load may be below the car's
```

The car's stencil gives light weight and load limit; their sum is the gross rail load the car is built for.
Load limit is what the shipper may put in, and it is a function of the specific car, because light weights differ
between cars of the same nominal class -- a repaired or rebuilt car can be several hundred pounds heavier than its
sister and has that much less capacity.

The constraint that gets missed is the ROUTE. A 286,000 lb car is not permitted everywhere: bridges and track
on light-density lines and on many short lines are rated below it, and a car loaded to its own limit can be
refused or restricted. So the governing gross rail load is the lower of the car's and the route's, and a shipper
loading to the stencil without checking the route can find the car stopped.

The other everyday output is volumetric: a car has a cubic capacity as well as a weight limit, and light,
bulky lading fills the car before it reaches the load limit while dense lading reaches the limit with the car
half empty. Knowing which one governs is what sizes a shipment.

**Inputs:** gross rail load, light weight, the lading net weight, the cubic capacity and lading density, and the route maximum gross rail load

**Outputs:** the load limit, the gross weight on rail at the entered lading, utilization against both the car and the route limits, a pass or overload verdict, the remaining capacity, and whether weight or cube governs for the entered lading density

## 3. Worked example

A 286,000 lb class car stencilled with a 63,000 lb light weight:

```
load limit = 286,000 - 63,000 = 223,000 lb
```

223,000 lb of lading. Load 200,000 lb and the car is at
90% of its limit, grossing `63,000 + 200,000` = 263,000 lb on rail --
inside 286,000.

Now the route. If part of the routing is restricted to 263,000 lb gross rail load:

```
allowable lading on that route = 263,000 - 63,000 = 200,000 lb
```

The car's own limit is 223,000 lb and the route permits 200,000 -- **23,000 lb less**.
A shipper loading to the stencil has overloaded the route, not the car, and that distinction is invisible on the
car itself.

Cube versus weight: at 30 lb per cubic foot in a 5,200 cu ft car, the car fills at
`5,200 x 30` = 156,000 lb -- well under the load limit, so **cube governs** and the weight capacity is
irrelevant for that commodity.

## 4. Scope and non-goals

A capacity subtraction from stencilled and route values the user supplies. It does not determine the route's
gross rail load limit, which comes from the railroads involved and can change with embargoes, bridge condition,
and seasonal restrictions, and it does not address clearance restrictions, which are separate
(`clearance-plate-envelope`). It does not evaluate load distribution within the car, which matters: a car within
its gross limit can still overload a truck, an axle, or one end, and lading must be distributed and secured to
the AAR loading rules. It does not address securement, blocking and bracing, hazardous materials requirements,
or the weighing and certification the tariff requires. The AAR Open Top Loading Rules and General Rules, the
serving carriers' published limits, and the car's own stencilled data govern.
