# roughlogic.com Specification v1915 -- Debris Management Site Acreage and Volume Reduction (`calc-debris.js`, Group E Carpentry and Construction, debris management, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-debris.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Debris goes first to a temporary site where it is stacked, sorted, ground, or burned, and the site's acreage and the time to process the pile follow from the Corps model's stack height, land-use factor, and reduction ratios. `chipper-debris` converts wood weight to chips; no tile sizes a site or its reduction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, stack height, processing rate, machine count, or operating hours returns `{ error }`; a land-use fraction outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA-325, *Public Assistance Debris Management Guide* (2007), Appendix B, USACE model Steps 2 and 3 (10 ft stack, 60% land use, 16,117 cy per acre, 1.66 factor, site cycling, 95% burn and 75% grind reduction, about 200 cy/h), Chapter 8 (100 acres per million cubic yards), and Chapter 9 (tub grinder rates of 100-150 cy/h reduced output, up to 250 clean), named as the method, the state environmental agency and the applicant's plan named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`debris site acreage`, `temporary debris storage and reduction site`, `tdsrs sizing`, `debris grinding time`, `debris burn volume reduction`.

## 2. The tile

### 2.1 `debris-management-site-sizing` -- Debris Management Site Acreage and Volume Reduction

```
storage      acres = volume / (4,840 sy/ac x stack height in yd)
             10 ft stack -> 3.33 yd -> 16,117 cy/ac (the guide's figure;
             exactly 10/3 yd gives 16,133)
gross site   storage acres / 0.60 land use = x 1.66 (roads, buffers, burn
             pits, household hazardous waste)
check        about 100 acres per 1,000,000 cy (Chapter 8)
cycling      a site turned over every 45-60 days serves more than its
             standing capacity: acres / cycles in the recovery period
reduction    burning leaves 5% (95% reduction); grinding leaves 25% (4 to 1)
time         machine-hours = woody volume / rate (default 125 cy/h; about
             200 cy/h in the model; up to 250 clean)
             days = machine-hours / (machines x hours per day)
```

A debris site is a stacking problem. The model stacks debris ten feet high, which puts about sixteen thousand cubic
yards on an acre, and then adds two-thirds again for everything a site needs besides piles: haul roads, fire breaks,
burn pits, sorting areas, and the household hazardous waste collection. The Chapter 8 rule of thumb -- a hundred acres
per million cubic yards -- lands within a few percent, and the tile shows both as a cross-check.

Sites rarely hold the whole event at once. Debris arrives, is reduced, and leaves as mulch or ash, so a site cycled
every six to eight weeks can process several times its standing volume over a recovery, and the guide sizes for that.
The reduction ratios show why reduction is the whole strategy: grinding cuts woody debris to a quarter of its volume,
burning to a twentieth, and the remainder is what has to be hauled away.

Processing time is set by the grinders, and their published rates are optimistic. The guide warns that manufacturers'
logs show engine hours at ideal feed, and that contaminated debris fed slowly averages 100 to 150 cubic yards an hour.
The tile defaults to the middle of that range and reports the days for a stated number of machines and hours.

**Inputs:** the debris volume (or the woody and C&D volumes from `hurricane-debris-estimate`), the stack height, the land-use fraction, the site cycles, the reduction method, the processing rate, the number of machines, and the operating hours per day

**Outputs:** the storage acres, the gross site acres, the Chapter 8 cross-check, the acres with cycling, the reduced volume, the machine-hours, and the days to process

## 3. Worked example

The 659,100 cy estimate from `hurricane-debris-estimate`, 197,730 cy of it clean woody:

```
storage    659,100 / 16,117 = 40.9 acres
gross      40.9 x 1.66 = 67.9 acres     (Chapter 8 check: 65.9 acres)
ground     197,730 x 0.25 = 49,433 cy of mulch
burned     197,730 x 0.05 = 9,887 cy of ash
grinding   197,730 / 125 = 1,582 machine-hours
           4 grinders x 10 h/day -> 40 days
```

**About 68 acres to hold the event at once, and 40 days of grinding with four machines.** Cycling the site twice cuts the
land to about 34 acres, at the cost of keeping the grinders ahead of the trucks.

**Burning the woody debris instead leaves under 10,000 cy of ash against nearly 50,000 of mulch** -- the reason burning
is attractive, and the reason its air permits are the first thing the state asks about.

## 4. Scope and non-goals

A site-sizing and processing-time estimate from the USACE model's published factors. It does not select or permit a site, address air, water, and soil permits, ash testing and disposal, mulch fire risk (the guide limits mulch piles to 15 ft), site restoration, or the environmental baseline sampling a site requires. Grinder rates vary widely and monitored production governs. It does not forecast the debris (`hurricane-debris-estimate`) or haul it (`dump-truck-loads`, `haul-cycle-production`). FEMA-325, the state environmental agency, and the applicant's debris management plan govern.
