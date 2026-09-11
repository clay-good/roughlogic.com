# roughlogic.com Specification v1847 -- Plow Route Cycle Time and Truck Count (`calc-winterops.js`, Group J Trucking and Logistics, snow and ice management, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-winterops.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A plow route's cycle time is how long snow lies between passes, so the service level is a statement about cycle time and the truck count follows from it. Tightening the promise from two hours to eighty minutes is not a small change.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive route length, speed, system length, or cycle target, an overhead factor below 1, or a negative snowfall rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the route cycle time and fleet sizing relations with the operation's own route timing records and the applicable service standard named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`plow route cycle time`, `snow plow truck count`, `service level cycle time snow`, `lane miles per truck`, `accumulation between plow passes`.

## 2. The tile

### 2.1 `plow-route-cycle-time` -- Plow Route Cycle Time and Truck Count

```
cycle time       route lane-miles / effective plowing speed; it is the interval
                 between passes over any given point
effective speed  plowing speed divided by an overhead factor covering turns,
                 intersections, traffic, and reloads -- 1.2 to 1.5 is ordinary
accumulation     snowfall rate x cycle time in hours, the depth that lies between
                 passes and the number the service level is really about
service level    stated as a cycle time or as a maximum accumulation; the two are
                 the same statement divided by the snowfall rate
lane-miles per   effective speed x cycle time target
truck
trucks required  system lane-miles / lane-miles per truck, rounded up
the sensitivity  the count is inversely proportional to the cycle target, so
                 tightening the promise raises the fleet in direct proportion
reloads          a cold event doubles the material rate and the reload trips,
                 lengthening the cycle (`salt-application-rate`)
```

Cycle time is the service level and everything else is bookkeeping. A customer or a council does not
experience lane-miles or truck counts; they experience how deep the snow is when the plow comes back, and that
is the snowfall rate times the cycle. Every winter operations argument reduces to that one number, and stating
the promise as a cycle time rather than as an effort makes it checkable.

The overhead factor is where a plan meets a city. A truck does not plow at its plowing speed for the length of
a route: it turns at the ends, slows through intersections, waits behind traffic, lifts the blade across
crossings, and goes back for material. On an open highway route the overhead is small; on a dense residential
grid with short blocks it can exceed the plowing time itself, and a fleet sized on the map rather than on the
route will be short.

The fleet scales inversely with the cycle target, which makes service level decisions expensive in a very
legible way. Halving the cycle time doubles the trucks, the drivers, the maintenance, and the yard space, and
it does so for a promise that is only tested a handful of times a winter. That is the trade a public works
budget is actually making when it states a plowing standard.

**Inputs:** the route lane-miles, the plowing speed, the overhead factor, the system lane-miles, the cycle time target or the maximum accumulation, and the snowfall rate

**Outputs:** the effective plowing speed, the cycle time for one route, the accumulation between passes at the entered snowfall rate, the lane-miles one truck covers at the cycle target, the trucks required, and the same figures at a tighter target

## 3. Worked example

A 30 lane-mile route at 25 mph with a 1.2 overhead factor:

```
effective speed = 25 / 1.2 = 20.83 lane-miles per hour
cycle time      = 30 / 20.83 = 86 minutes
```

**86 minutes between passes**, and in a 1.5 in/h storm that is 2.2 in of accumulation on the ground when
the plow returns.

**Now size the fleet for a whole system of 300 lane-miles, against two service levels:**

```
2 hour cycle:  one truck covers 41.7 lane-miles -> 8 trucks
80 min cycle:  one truck covers 27.8 lane-miles -> 11 trucks
```

**3 more trucks -- 38 percent more fleet -- for forty minutes of cycle time.** And forty minutes of
cycle time is worth exactly this much snow:

```
at 1.5 in/h: 80 min = 2.0 in;  120 min = 3.0 in
```

**1.0 in of accumulation, bought with 3 trucks, 3 drivers, their maintenance, and their yard
space.** That is the trade a plowing standard is making, and stating it as a cycle time rather than as an
effort is what makes it visible.

**The overhead factor is where the plan meets the city.** At 1.2 this route cycles in 86 minutes; at
1.5 -- an ordinary figure for a dense residential grid with short blocks and frequent turns -- it cycles in
108 minutes, **22 minutes longer**, and the fleet sized from the map is short by
1 trucks at the two-hour standard.

**And a cold event lengthens the cycle without anyone deciding to.** The material rate roughly doubles below 20
degF, which doubles the reload trips (`salt-application-rate`) -- **time that comes straight out of the cycle
the standard was written around.**

## 4. Scope and non-goals

A planning estimate. The overhead factor carries the whole answer and must come from the operation's own route timing records rather than from an assumption: turns, intersections, traffic, parked cars, driveway aprons, blade lifts, and reload trips all differ by route type, and a residential grid and an arterial route are not comparable. It treats plowing speed as constant, which it is not -- speed varies with snow depth and type, and deep or wet snow slows a truck substantially at exactly the moment the cycle matters most. It does not address the sequencing of routes by priority, which every real operation does and which means the lowest-priority streets have a cycle time far longer than any published standard, or the shift structure, hours of service limits, and driver fatigue that govern a multi-day event. It does not address equipment availability and spare ratio, which is what actually determines how many trucks are on the road during a long storm, or the interaction between plowing and material application. It takes no position on what service level is appropriate. The operation's own route timing records, the applicable hours of service provisions, and the public works or contract standard govern.
