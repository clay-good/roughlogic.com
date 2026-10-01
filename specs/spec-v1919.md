# roughlogic.com Specification v1919 -- Points of Distribution Lanes, Types, Staff, and Footprint (`calc-relief.js`, Group J Trucking and Logistics, relief logistics, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-relief.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A point of distribution is a drive-through, and its capacity is set by lanes: one lane with three loading points moves about 140 cars an hour. The USACE typing standard turns lanes into site types, staff, and a footprint, and a county needs the number before it can pick parking lots. `dock-door-count-throughput` counts truck doors; no tile sizes a POD.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive population, household size, lane rate, or operating hours returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA IS-26, *Guide to Points of Distribution* (2008), USACE Tier II POD typing (Type III: 5,000 people/day, 1 lane, 3 loading points, 150 x 300 ft, staff 19 day and 4 night; Type II: 10,000, 2 lanes, 6 points, 250 x 300 ft, 34 and 6; Type I: 20,000, 4 lanes, 12 points, 250 x 500 ft, 78 and 10; one vehicle per household of 3), and Missouri SEMA, *Annex C, Points of Distribution* (one lane with 3 loading points serves 140 cars per hour), named as the method, the local emergency management agency named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`point of distribution size`, `pod type i ii iii`, `pod lanes staff`, `drive through distribution site`, `how many pods do we need`.

## 2. The tile

### 2.1 `pod-site-configuration` -- Points of Distribution Lanes, Types, Staff, and Footprint

```
vehicles/day    people served / 3 (one vehicle per household of 3)
vehicles/hour   vehicles per day / operating hours (12 h default)
lanes           ceil(vehicles per hour / 140)
                (one lane: 140 x 12 x 3 = about 5,000 people per day)
types           Type III = 1 lane   Type II = 2 lanes   Type I = 4 lanes
mix             any combination with the same total lanes; the tile shows the
                fewest sites and the all-Type-III option
staff           day / night per site: III 19/4, II 34/6, I 78/10
footprint       III 150 x 300 ft, II 250 x 300 ft, I 250 x 500 ft;
                loading point 80 x 40 ft
```

A POD is sized by throughput, not by the commodities it holds. Cars arrive, drive past three loading points where
water, ice, meals, and tarps are loaded into the trunk, and leave, and one lane of that moves about 140 cars an hour.
At one car per household of three and a twelve-hour day, a lane serves about 5,000 people -- which is exactly the Type III
POD's rating, and the three types are one, two, and four lanes.

The lane count is fixed by the population; the site count is a choice. Ten lanes can be ten small Type III sites
spread across a county or two Type I sites and a Type II in the metro area, and the choice trades travel distance for
staff and management. The tile reports the fewest-sites combination and the all-Type-III alternative so both are on the
table. Type I PODs are used only in large metropolitan areas.

Staff and footprint follow from the types. The staffing numbers are for the distribution operation itself --
loaders, traffic control, a manager -- and they are the figure that a county short of volunteers and guardsmen feels
first. The footprint is what decides whether a given parking lot works.

**Inputs:** the people to be served per day (from `relief-commodity-truckloads` or entered), the household size, the operating hours, and the lane rate

**Outputs:** the vehicles per day and per hour, the lanes required, the fewest-sites type mix and the all-Type-III option, the day and night staff, and the total footprint

## 3. Worked example

48,000 people a day, 12 operating hours:

```
vehicles    48,000 / 3 = 16,000/day -> 1,333/h
lanes       ceil(1,333 / 140) = ceil(9.52) = 10
fewest      2 Type I (8 lanes) + 1 Type II (2 lanes) = 3 sites
            staff 2 x 78 + 34 = 190 day, 2 x 10 + 6 = 26 night
            area 2 x 125,000 + 75,000 = 325,000 sq ft = 7.46 acres
all III     10 sites, staff 190 day, 40 night, 450,000 sq ft = 10.33 acres
```

**Ten lanes -- as three large sites or ten small ones.** The day staff is 190 either way; the small sites need 14 more
people at night and nearly 3 more acres, and put a distribution point within reach of more of the county.

## 4. Scope and non-goals

A sizing aid from the USACE POD typing standard, which FEMA notes is widely used but not a national standard. It does not select sites, design traffic control, address accessibility, security, or lighting, or plan resupply beyond the pairing with truckloads (`relief-commodity-truckloads`). Throughput drops with walk-up traffic, bad weather, and inexperienced crews. The local emergency management agency, the state, and FEMA govern.
