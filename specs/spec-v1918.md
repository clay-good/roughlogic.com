# roughlogic.com Specification v1918 -- Relief Commodity Demand and Truckloads (`calc-relief.js`, Group J Trucking and Logistics, relief logistics, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-relief.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** The first logistics order after a disaster is water, meals, ice, and tarps by the truckload, sized from the number of people without power and a set of federal planning factors. `backcountry-needs` covers one person's water on a trip and `pallet-loadout` covers trailer fit; no tile turns a population into daily commodity demand and truckloads.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive population, per-person rate, or truckload capacity returns `{ error }`; a visit factor outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA, *Distribution Management Plan Guide 2.0* (2022), Section 1.3 (two meals and three liters of water per person per day), and the USACE planning model as published in Missouri SEMA, *Annex C, Points of Distribution* (2011) (40% visit factor; truckloads of 18,000 L water, 21,744 meals, 40,000 lb ice, 4,400 tarps; shelter mixed loads), named as the method, the state and FEMA logistics sections named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`disaster water truckloads`, `how much water for disaster population`, `mre truckloads`, `ice truckloads disaster`, `commodity distribution planning`.

## 2. The tile

### 2.1 `relief-commodity-truckloads` -- Relief Commodity Demand and Truckloads

```
people served   population without power x visit factor (USACE model 40%),
                or an entered impacted population
water           3 L per person per day (FEMA); truck = 18,000 L = 4,750 gal
                (20 pallets of 900 L, about 1,900 lb each)
meals           2 per person per day (FEMA); truck = 21,744 (1,812 cases of 12)
ice             8 lb per person per day (USACE model); truck = 40,000 lb
                (20 pallets of 2,000 lb)
tarps           truck = 4,400 (typically 20 x 25 ft), one per damaged home
shelters        a mixed load of 3 pallets water, 1 ice, 1 meals per 500 people
days            each commodity x the planning period (72 or 96 h common)
```

The planning factors are small and the multipliers are large. Three litres of water and two meals a person a day, times
the people who will come to a distribution point, times the days until power or stores return, is a number that
decides how many trucks are staged before landfall. The USACE model applies a 40% factor to the population without
power, because most households do not come to a distribution point -- they have supplies, family, or a generator -- and
the tile applies it by default while allowing an entered impacted population instead.

Each commodity ships in its own truckload unit, and the tile reports truckloads rather than tons because that is how
they are ordered and how the receiving sites are sized. One water truck serves about 5,000 people a day at three litres
each; one meals truck serves about 10,000; one ice truck, 5,000. Those ratios are also why the USACE model pairs one
distribution lane with one truckload of water and ice per day (`pod-site-configuration`).

The source document that publishes the truckload figures has two slips the tile does not repeat: it gives "1,744"
meals per truck where its own case count and a later page give 21,744, and it equates three litres with a gallon,
which is 3.79 litres. The tile uses 21,744 and keeps litres and gallons distinct.

**Inputs:** the population without power (or the impacted population), the visit factor, the per-person rates (defaults as above), the planning days, and the number of shelter residents

**Outputs:** the people served, the daily and period quantities of water, meals, ice, and tarps, the truckloads of each, and the shelter mixed loads

## 3. Worked example

120,000 people without power after a hurricane, 40% visit factor, a 72-hour planning period:

```
served   120,000 x 0.40 = 48,000 people/day
water    48,000 x 3 L = 144,000 L/day -> 144,000 / 18,000 = 8.0 trucks/day
meals    48,000 x 2 = 96,000/day -> 96,000 / 21,744 = 4.42 -> 5 trucks/day
ice      48,000 x 8 lb = 384,000 lb/day -> 9.6 -> 10 trucks/day
72 h     water 24 trucks, meals 14, ice 29
```

**Eight water trucks, five meal trucks, and ten ice trucks every day** -- 23 trucks a day for three days, before tarps and
shelter loads.

**A million gallons of water is 211 trucks** (1,000,000 / 4,750 = 210.5), not the 212 the source prints.

## 4. Scope and non-goals

A planning estimate from federal and USACE factors. Actual demand depends on the event, the season, how long power and water are out, and the population's needs; FEMA's current guidance, the state's logistics plan, and the incident's logistics section set the real order. It does not address infant formula, medical supplies, pet supplies, or cultural and dietary needs, and it does not route trucks or size warehouses (`relief-storage-floor-load`). Distribution sites are `pod-site-configuration`. FEMA, the state, and the incident logistics section govern.
