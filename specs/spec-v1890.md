# roughlogic.com Specification v1890 -- Generator Fleet Fuel Resupply (`calc-reliefpower.js`, Group J Trucking and Logistics, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** After a hurricane, a county's temporary power is dozens of generators of different sizes at hospitals, lift stations, shelters, and cell sites, and they all run dry on their own schedules. `generator-fuel-runtime` answers for one tank; no tile totals a fleet's daily fuel, the tanker trips it takes, or the shortest refuel interval that sets the route.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive unit count, kW rating, tank size, burn rate, or truck capacity returns `{ error }`; a usable fraction outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): EPA, *Power Resilience Guide for Water and Wastewater Utilities* (2023), Section 4, which records the U.S. Army Corps of Engineers rule of thumb of 0.07 gallons per hour per kW, named as the default basis, each unit's published fuel curve named as governing where known, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`generator fleet fuel`, `generator refueling schedule`, `diesel delivery trips generators`, `emergency generator fuel logistics`, `usace generator fuel rule of thumb`.

## 2. The tile

### 2.1 `generator-fleet-fuel-resupply` -- Generator Fleet Fuel Resupply

```
burn, per unit   0.07 gal/h x kW rating (USACE rule, full load), or the unit's
                 own gph at its actual load where known
daily fleet      sum over units of count x burn x 24 h
trips per day    ceil(daily fleet / truck deliverable gallons)
refuel interval  per unit: tank gal x usable fraction / burn (h)
route cycle      the SHORTEST interval in the fleet sets how often the route
                 must come back around
load basis       the USACE figure assumes full load; the EPA guide notes a
                 utility practice of stocking for 70% load, shown as a
                 comparison
```

A generator fleet is a fuel logistics problem wearing an electrical label. The USACE rule of thumb -- 0.07 gallons
an hour per kilowatt of rating -- is a full-load figure and deliberately conservative, which is what a fuel plan wants
when the loads are not yet known. Summed across the fleet and multiplied by twenty-four, it gives the gallons a day
the fuel contractor has to deliver, and dividing by the truck's deliverable volume gives the trips.

The daily total is not the constraint that usually bites. The constraint is the unit that runs dry first. Small
generators on day tanks and large generators on sub-base tanks can have similar intervals -- in the worked example a
60 kW unit on a 100 gallon tank and a 300 kW unit on a 500 gallon tank both last 21.4 hours -- and the route has to
reach every one of them inside that interval, with road closures and curfews in the way. The tile reports each size's
interval and names the shortest.

Where a unit's actual load and fuel curve are known, the tile uses them in place of the rule of thumb, because a
fleet running at half load burns a little over half the full-load figure (2.5 against 4.6 gph on the C60D6R
curve in `generator-part-load-fuel`), and the difference is a truck a day.
The 70% comparison line is there to show that range without asking for data a planner does not yet have.

**Inputs:** for each generator size, the count, the kW rating, the tank size, the usable fraction, and optionally the actual burn rate; the fuel truck's deliverable gallons

**Outputs:** the burn rate per size, the fleet's daily fuel at full load and at 70%, the truck trips per day, each size's refuel interval, and the shortest interval

## 3. Worked example

A county's temporary power fleet: four 60 kW units on 100 gal tanks, six 150 kW units on 300 gal tanks, two 300 kW
units on 500 gal tanks, 90% usable; a 2,400 gal tank truck:

```
fleet kW     4 x 60 + 6 x 150 + 2 x 300 = 1,740 kW
daily fuel   0.07 x 1,740 x 24 = 2,923 gal/day      (at 70% load: 2,046)
trips        2,923 / 2,400 = 1.22 -> 2 trips/day
intervals    60 kW:  4.2 gph -> 90 / 4.2  = 21.4 h
             150 kW: 10.5 gph -> 270 / 10.5 = 25.7 h
             300 kW: 21.0 gph -> 450 / 21.0 = 21.4 h
```

**About 2,900 gallons a day and two truck trips -- but the route must come back around every 21.4 hours**, set jointly
by the smallest and largest units. A route that services the fleet once a day misses both.

**If the fleet actually runs near 70% load,** the daily fuel falls to about 2,050 gallons, which still takes 2 trips
but leaves room for growth; the intervals stretch by the same proportion.

## 4. Scope and non-goals

A fleet fuel-demand and resupply estimate. The USACE rule is a planning figure at full load and overstates the fuel of lightly loaded units; each unit's fuel curve (`generator-part-load-fuel`) governs where known. It does not route trucks, account for travel time, road access, or curfews, schedule deliveries, or address fuel storage rules, spill containment, fuel quality and polishing, or the contracting of fuel supply. It does not size generators (`generator-sizing`). The EPA guide, the fuel supplier, the generator manufacturers' data, and the incident's logistics section govern.
