# roughlogic.com Specification v1920 -- Congregate Shelter Capacity and Sanitation (`calc-relief.js`, Group G Cross-Trade Utilities, relief logistics, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-relief.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A school gym becomes a shelter overnight, and the facility crew has to know how many cots fit and how many toilets, sinks, and showers that many people need -- and the answer halves when a one-night evacuation becomes a two-week stay. `occupant-load` and `plumbing-fixture-count` apply the building code's design bases; no tile applies the operational shelter standard.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive floor area or occupant count returns `{ error }`; a space-per-person below 20 sq ft returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): American Red Cross, *Mass Care Standards and Indicators* (as reproduced in the Florida State Emergency Shelter Plan, 2018, Appendix F) -- 20 sq ft of sleeping space for 24-48 hour evacuation shelters, 40-60+ sq ft of usable space for longer stays, 1 toilet and 1 hand-washing lavatory per 20 persons, 1 shower per 25, sewage capacity of 1.5 gal per person per day, solid waste of 5 lb per person per day, one 30 gal container per 10 persons -- named as the standard, the building official's occupant load named as a cap, the shelter manager and the AHJ named as governing, GOVERNANCE.general.

**Relationship to existing tiles, disclosed.** `occupant-load` (IBC area per occupant) and `plumbing-fixture-count` (IBC Table 2902.1) compute the same kinds of numbers on code design bases. This tile is kept because the shelter standard is an operational basis that differs from both, and the building's code occupant load still caps it -- which the tile reports.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`shelter capacity square feet per person`, `emergency shelter toilets`, `red cross shelter standards`, `gym shelter cots`, `evacuation shelter planning`.

## 2. The tile

### 2.1 `shelter-capacity-sanitation` -- Congregate Shelter Capacity and Sanitation

```
capacity     usable sleeping area / space per person
             evacuation (24-48 h): 20 sq ft
             post-disaster (longer stays): 40 to 60+ sq ft
toilets      1 per 20 persons          lavatories  1 per 20 persons
showers      1 per 25 persons (a 15 min shower opportunity for each resident)
sewage       1.5 gal per person per day of disposal capacity
solid waste  5 lb per person per day; one 30 gal lidded container per 10
cap          the building's code occupant load still applies
```

A shelter's capacity is floor area divided by the space each person gets, and the space depends on how long they will
stay. Twenty square feet is enough for a cot and a bag for a night or two; a stay of weeks needs forty to sixty for
belongings, circulation, and some privacy. The same gym holds twice as many evacuees the night before landfall as it
does residents the week after, and the tile reports both so that the transition is planned rather than discovered.

The sanitation ratios follow the population, and they are the part of a shelter that fails first. A school built for a
daytime population has too few toilets for an overnight one and usually no showers; the tile counts what is needed so
the gap can be filled with portable units and trailers. Sewage capacity matters when the building is on a septic system
or the municipal system is down, and solid waste accumulates faster than a building's normal collection handles.

The building's code occupant load is not suspended by an emergency. The tile reports it alongside the shelter capacity
when it is entered, and flags a shelter population that exceeds it.

**Inputs:** the usable sleeping floor area, the shelter type (evacuation or post-disaster) or an entered space per person, and optionally the code occupant load and the existing fixtures

**Outputs:** the shelter capacity, the toilets, lavatories, and showers required, the sewage and solid-waste quantities, the waste containers, the shortfall against existing fixtures, and the occupant-load check

## 3. Worked example

A 9,600 sq ft school gym:

```
evacuation     9,600 / 20 = 480 people
post-disaster  9,600 / 40 = 240 people (160 at 60 sq ft)
```

**480 for the night of the storm, 240 once it becomes a shelter for the displaced.** At 240 residents:

```
toilets 12   lavatories 12   showers ceil(240 / 25) = 10
sewage  240 x 1.5 = 360 gal/day      waste 240 x 5 = 1,200 lb/day
containers 24 x 30 gal
```

**Twelve toilets and ten showers** -- more than the restrooms and locker rooms near most school gyms provide, and the
gap a shower trailer and a row of portable units close. Ten showers at fifteen minutes each give 240
residents their turn in six hours of continuous use.

## 4. Scope and non-goals

A capacity and sanitation aid under the Red Cross mass care standards. It does not address accessibility and functional-needs space (which increases area per person), medical, feeding, or pet sheltering areas, security, or HVAC and generator loads for the shelter, and it does not replace the building official's occupant load or the fire marshal's review. Hurricane and tornado refuge areas are a different standard (`safe-room-capacity`); worker camps are `responder-camp-sanitation`. The American Red Cross standards, the shelter manager, and the AHJ govern.
