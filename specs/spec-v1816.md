# roughlogic.com Specification v1816 -- Dock Door Count from Truck Arrivals and Turn Time (`calc-warehouse.js`, Group J Trucking and Logistics, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A dock door is a server and a trailer is a customer, so the door count follows from arrivals times service time. Sizing on the daily average gives a dock that works on paper and queues trailers in the yard every afternoon.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive truck count, operating window, turn time, or peak window, or a utilisation or peak share outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the door-hour service capacity relation and published dock utilisation planning ranges with the facility's own measured turn times and arrival profile named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dock door count sizing`, `truck turn time dock`, `loading dock capacity trucks per day`, `dock utilization peak arrivals`, `trailer yard queueing`.

## 2. The tile

### 2.1 `dock-door-count-throughput` -- Dock Door Count from Truck Arrivals and Turn Time

```
door-hours       trucks x turn time in hours; the total service the dock must
                 deliver in the day
turn time        the whole time a trailer occupies the door: spotting, securing,
                 unloading or loading, paperwork, and release -- not just the
                 handling
doors at 100%    door-hours / operating hours, which no dock ever achieves
utilisation      a practical planning figure is 60 to 70%; arrivals are uneven and
                 a door held by a late trailer serves no one
doors required   doors at 100% / utilisation, rounded up
peak             the hours when most arrivals land; sizing on the daily average
                 understates the requirement by the peaking factor
the consequence  too few doors is trailers queueing in the yard or on the road,
                 detention charges, and a dock that runs into a second shift
```

A dock is a queueing system and the daily average is the least useful statistic it has. Trucks do not arrive
evenly: inbound freight clusters in the morning, outbound builds toward the cut-off, and a dock sized on
twenty-four hours' worth of work divided by the hours open will be idle at one end of the day and gridlocked
at the other. The peak is what the doors have to serve.

Turn time is the term most often understated because only part of it is visible as work. The trailer is
occupying the door from the moment it backs in until it pulls out, and that includes spotting, chocking or
restraining, opening, the handling itself, counting and paperwork, closing, and release. A dock measuring
handling time and calling it turn time will be short of doors by the difference.

Utilisation below one hundred percent is not slack, it is what makes the dock work at all. A door is unusable
while it waits for the next trailer, while a driver hunts for paperwork, while a load is being counted, and
whenever an arrival is late. Planning to full utilisation assumes a perfectly scheduled dock, and the cost of
being wrong is paid in detention, in overtime, and in trailers parked where they should not be.

**Inputs:** the trucks per day, the operating window, the average turn time, the practical utilisation, the share of arrivals landing in the peak, and the peak window length

**Outputs:** the door-hours required, the doors at full utilisation, the doors required at the entered utilisation, the peak-hour door-hours, the doors the peak requires, and the difference between an average-based and a peak-based count

## 3. Worked example

A dock handling 60 trucks a day over a 10 hour window, at a 55 minute average turn:

```
door-hours   = 60 x 55 / 60 = 55.0
at 100% use  = 55.0 / 10 = 5.50 doors
at 65% use   = 5.50 / 0.65 = 8.46 -> 9 doors
```

**9 doors on a daily average basis.** Now look at when the trucks actually come:

```
40% of arrivals in a 3 hour window = 24 trucks
door-hours   = 24 x 55 / 60 = 22.0
at 100% use  = 22.0 / 3 = 7.33 doors
at 65% use   = 12 doors
```

**12 doors to serve the peak against 9 from the daily average -- 3 more.** A dock built to the
average figure is short by that many for 3 hours every day, and **the shortfall does not appear as a slow
dock; it appears as trailers in the yard**, detention charges, and work pushed into a second shift.

**Turn time is the lever with the most leverage on the answer.** Cutting it from 55 to 40 minutes:

```
peak doors = ceil(24 x 40/60 / 3 / 0.65) = 9
```

**3 doors saved by 15 minutes of turn time** -- which is scheduling, paperwork, and restraint
discipline rather than construction, and it is very much cheaper than a door. **The dock's capacity is as much
a process property as a building one.**

## 4. Scope and non-goals

A deterministic capacity estimate for planning. It is not a queueing model: arrivals are stochastic and bunch, turn times vary widely between a live unload and a drop-and-hook, and the waiting a dock actually generates depends on that variability as much as on the averages -- a discrete-event simulation is what a design of any size should be checked against, and it will call for more doors than this does. Turn time must be measured, including every minute the trailer occupies the door, and it differs substantially between inbound and outbound, between floor-loaded and palletised freight, and between carriers. It does not address the yard: trailer parking, spotting, shunting, and the yard's own capacity are frequently the real constraint, and a dock with enough doors and nowhere to stage trailers does not work. It does not address door assignment and whether doors are dedicated to inbound or outbound, appointment scheduling, the staging area depth behind the doors -- which limits the dock as often as the doors do -- levelers and restraints (`dock-leveler-slope`), or the labour available to work the doors. The facility's own measured turn times and arrival profile, a discrete-event analysis for a design of any size, and the operations manager govern.
