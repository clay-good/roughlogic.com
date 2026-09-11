# roughlogic.com Specification v1794 -- Transfer Station Throughput and Trailer Loadout (`calc-waste.js`, Group J Trucking and Logistics, solid waste collection and transfer, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A transfer station exists to convert many small loads into few large ones, and it succeeds or fails on whether the trailers keep up with the collection fleet. When they do not, the difference accumulates on the tipping floor at a known rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tonnage, operating hours, vehicle or trailer payload, round trip time, density, or pile depth, or a peak hour share outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the transfer station throughput balance and published peak-hour and loose density ranges with the operating permit and the station's own scale records named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`transfer station throughput`, `tipping floor sizing`, `transfer trailer loads per day`, `unloading positions transfer station`, `waste transfer fleet`.

## 2. The tile

### 2.1 `transfer-station-throughput` -- Transfer Station Throughput and Trailer Loadout

```
peak hour        collection arrives in a burst, not evenly; the peak hour commonly
                 carries 12 to 20% of the day's tonnage
vehicle arrivals vehicles per hour = peak tonnage / average collection payload
unloading        positions = arrivals per hour x minutes on the floor / 60,
positions        rounded up; a queue outside the building is the failure mode
trailer loads    ceil(daily tonnage / transfer trailer payload)
trailers needed  ceil(loads per day / (operating hours / round trip hours))
floor surge      tons on the floor = hours the loadout is behind x average tons
                 per hour
floor area       surge tons / loose density, converted to cubic yards, divided by a
                 workable pile depth, then multiplied for pushing and manoeuvring
the constraint   the trailer fleet and the round trip, not the building
```

A transfer station is a buffer between two rates and the buffer is the tipping floor. Collection vehicles
arrive on a schedule set by routes and traffic; trailers leave on a schedule set by the round trip to the
disposal site. When the two match, the floor stays clean and small. When the outbound rate falls behind -- a
trailer down, traffic on the highway, a queue at the landfill scale -- the difference piles up at a rate that
is simply the inbound tonnage per hour, and the floor has to be big enough to hold it until the trailers catch
up.

The round trip is the term that decides the fleet, and it is mostly outside the operator's control. Distance
to the disposal site, highway conditions, and the turnaround at the landfill all go into it, and a thirty
minute deterioration in the round trip removes a partial load from every trailer's day. That is why a station
serving a distant landfill needs disproportionately more trailers than one serving a near site with the same
tonnage.

Peak hour, not daily average, sizes the inbound side. A station handling its tonnage comfortably on an average
basis can still back vehicles onto the road for an hour each afternoon, because collection routes finish
together. Unloading positions are sized on the burst, and the cost of getting it wrong is a queue on a public
street rather than anything inside the building.

**Inputs:** the daily tonnage, the operating hours, the peak hour share, the average collection vehicle payload and time on the floor, the transfer trailer payload and round trip time, the loose density of tipped waste, the workable pile depth, and a manoeuvring factor

**Outputs:** the peak hour tonnage and vehicle arrivals, the unloading positions required, the trailer loads per day, the loads each trailer can make, the trailer fleet size, the tonnage accumulating on the floor per hour of loadout delay, and the floor area that surge requires

## 3. Worked example

A station handling 800 tons a day over 10 operating hours:

```
peak hour   = 800 x 0.15 = 120 tons
arrivals    = 120 / 8 = 15.0 vehicles per hour
positions   = 15.0 x 6 / 60 = 1.50 -> 2 unloading positions
```

**2 positions for a 15 vehicle peak hour.** Sized on the daily average of
10.0 vehicles per hour instead, the station would show 1.00 positions -- **one** -- and
would queue collection trucks onto the street every afternoon when the routes come in together.

**The outbound side:**

```
trailer loads    = ceil(800 / 22) = 37 per day
loads per trailer = 10 h / 3.0 h round trip = 3.33
trailers         = ceil(37 / 3.33) = 12
```

**12 trailers for 37 loads**, and the round trip is doing most of the work in that number. Lengthen it by
30 minutes and each trailer makes 2.86 loads instead of 3.33, so the fleet becomes
13 -- **one more trailer and driver for half an hour of highway.**

**Now size the floor for the day the trailers fall behind:**

```
average inbound = 800 / 10 = 80 tons per hour
2 hours behind  = 160 tons on the floor
volume          = 160 x 2000 / 400 lb/cy = 800 cy
footprint       = 800 x 27 / 8 ft deep = 2,700 sq ft
with manoeuvring x3 = 8,100 sq ft
```

**8,100 square feet of tipping floor to absorb a 2 hour loadout delay.** The building is not sized on
the tonnage it handles; **it is sized on how long the trailers can be late**, and that is a judgement about the
highway rather than about the waste.

## 4. Scope and non-goals

A capacity and fleet estimate for planning. The peak hour share is entered and is a property of the service area's route structure; a station serving many small haulers behaves differently from one serving a single municipal fleet on fixed routes. Vehicle time on the floor includes queueing, positioning, tipping, and clearing, and varies with the body type and the floor layout. It does not simulate the station: arrivals are stochastic and bunch in ways a peak-hour average cannot represent, and a discrete-event simulation is what a design of any size should be checked against. It does not design the building, the push walls, the floor slab and its wear surface, the hoppers or compactors where those are used, or the ventilation, odour, dust, and fire protection systems that dominate a station's permitting. It does not address scale house throughput and queueing, which is frequently the real constraint, the handling of unacceptable waste, or the recovery operations many stations now run alongside transfer. It takes no position on the operating permit, traffic access approvals, or the host community agreements that govern hours and tonnage. The operating permit and its tonnage limits, a discrete-event analysis for a design of any size, and the station engineer govern.
