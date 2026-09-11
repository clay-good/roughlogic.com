# roughlogic.com Specification v1793 -- Waste Collection Route Time and Truck Count (`calc-waste.js`, Group J Trucking and Logistics, solid waste collection and transfer, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A collection route is a day that either fits in a shift or does not, and the stops are only part of it. The trips to the disposal site are a step function: one more load costs a fixed hour, and it arrives without warning when setout weight creeps up.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive stop count, time per stop, setout weight, payload, or shift length, or negative haul, tipping, or fixed times returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the route time balance and published collection productivity ranges with the hauler's own time studies and route records named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`waste collection route time`, `refuse route stops per day`, `collection productivity stops per hour`, `route balancing solid waste`, `disposal trips per route`.

## 2. The tile

### 2.1 `collection-route-productivity` -- Waste Collection Route Time and Truck Count

```
collection time  stops x seconds per stop, where the per-stop figure INCLUDES the
                 travel between stops; 15 to 20 s for an automated side loader on
                 a dense route and 30 s or more for rear-load with a helper
route tonnage    stops x average setout weight
loads            ceil(tonnage / truck payload) -- a STEP, not a proportion
                 (`collection-vehicle-payload` sets the payload)
haul and tip     loads x (round trip time + time at the tipping face)
fixed time       pre-trip and post-trip inspection, fuelling, yard time, and the
                 contractual break
route day        collection + haul + tip + fixed, against the shift length
max stops        (shift - everything but collection) x 3600 / seconds per stop
the cliff        crossing into an extra load adds the whole round trip at once
```

Route balancing is arithmetic about a fixed shift, and the fixed items have to be subtracted before the
variable one is sized. Everything except the collecting is essentially constant for a given route and disposal
site -- the trips, the tipping, the inspections, the break -- so the stops the route can carry is whatever the
remaining time divides by. A route built by driving it and seeing how it goes will find the same number the
hard way.

The load count is the item that behaves badly, because it is a ceiling function. Setout weight drifts up
slowly with season, with a community's habits, or with a change in what is collected separately, and for a
long time nothing happens; then one week the route crosses a payload boundary and the day grows by a whole
round trip. Nothing in the route changed that morning, and the crew is an hour late.

That is why payload and route length are one decision. A route sized to finish comfortably at two loads has
substantial slack against setout drift; the same route sized to just fit two loads has none, and the cost of
discovering it is overtime on an open-ended basis. Sites and haulers manage this by watching tons per route
rather than stops per route, because tons is the quantity that trips the step.

**Inputs:** the stop count and seconds per stop, the average setout weight, the truck payload, the round trip haul time, the time at the tipping face, and the fixed and break time in the shift

**Outputs:** the collection time, the route tonnage, the number of disposal loads, the haul and tipping time, the total route day, the overtime or slack against the shift, the maximum stops the shift allows, and the route day if the tonnage crossed into another load

## 3. Worked example

A 900 stop automated route at 22 s per stop, 40 lb average setout, a 12 ton truck, and a
45 minute round trip to disposal:

```
collection = 900 x 22 / 3600 = 5.50 h
tonnage    = 900 x 40 / 2000 = 18.0 tons
loads      = ceil(18.0 / 12) = 2
haul       = 2 x 45 min = 1.50 h
tipping    = 2 x 15 min = 0.50 h
fixed      = 0.5 + 0.5 = 1.0 h
route day  = 8.50 h
```

**8.50 hours against an 8 hour shift -- 30 minutes of overtime, every day.** The route is very
slightly too long, which is the most common condition a route is found in, because nobody rebuilds a route
over half an hour.

**The stop count that actually fits:**

```
available for collecting = 8 - 1.50 - 0.50 - 1.0 = 5.00 h
max stops = 5.00 x 3600 / 22 = 818
```

**818 stops, not 900.** The route is 82 stops over -- about 10 percent -- and moving that
many houses to an adjacent route is the fix.

**Now the cliff.** Let setout weight drift up until the route crosses 24 tons and needs a third trip:

```
loads     = 3
haul+tip  = 3 x (45 + 15) min = 3.00 h
route day = 9.50 h
```

**1.00 hours added in a single step**, from a tonnage increase of less than 34 percent. **The day did not
get gradually longer; it got an hour longer overnight**, and the only warning was tons per route creeping
toward a multiple of the payload.

**Which is why routes are watched in tons, not stops.** Stops per hour is the productivity measure; tons per
route is the one that predicts the next bad Monday.

## 4. Scope and non-goals

A route time estimate for planning and balancing. Seconds per stop is the dominant input and is a measured property of a particular route, body type, and crew -- it varies with housing density, setout compliance, cart placement, parked cars, weather, and traffic, and a figure taken from another route or another city is a guess. It does not route or sequence the collection, which is a vehicle routing problem that commercial software solves and which produces a different and usually better answer than a manually built route. It does not address bulky items, missed stops and go-backs, cart delivery and maintenance, or the seasonal swings in yard waste that move setout weight far more than the annual average suggests. It does not size the fleet across a service area, address spare ratio and maintenance downtime, or account for the disposal site's own queueing, which can add substantially to the tipping time at peak. It takes no position on hours of service, collective bargaining provisions, or the safety considerations that govern how a route is worked. The hauler's own time studies and route records, the applicable hours of service and labour provisions, and the operations manager govern.
