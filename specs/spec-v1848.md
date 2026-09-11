# roughlogic.com Specification v1848 -- Snow Storage Stacking Area and Haul-Off Trigger (`calc-winterops.js`, Group G Cross-Trade Utilities, snow and ice management, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-winterops.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Plowed snow has to go somewhere on the lot, and a windrow with a workable height takes far more ground than people expect. After three events the storage is measured in parking spaces, and that is when hauling starts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive lot area, accumulation, density, or pile height, a piled density at or below the fresh density, or a non-positive area per parking space returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the snow densification and windrow geometry relations with the site's snow plan and the applicable accessibility, fire access, and disposal requirements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`snow storage stacking area`, `snow pile footprint parking lot`, `snow haul off trigger`, `plowed snow density`, `parking spaces lost to snow`.

## 2. The tile

### 2.1 `snow-stacking-area` -- Snow Storage Stacking Area and Haul-Off Trigger

```
snow volume      lot area x accumulation depth, as it fell
densification    plowed and piled snow compacts; fresh snow runs 5 to 10 lb per
                 cu ft and a worked pile 20 to 30, so the pile is a fraction of
                 the fallen volume
pile volume      fallen volume x fresh density / pile density
pile shape       a cone is impractical above a modest size; real storage is a
                 WINDROW, a prism with sloped sides at about 45 degrees
cross-section    0.5 x base width x height, with base = 2 x height at 45 degrees
length           pile volume / cross-section
footprint        length x base width
height limit     set by sight lines at drive aisles, wind, and the reach of the
                 equipment -- commonly 10 to 15 ft
spaces lost      footprint / the area per parking space including its aisle
haul trigger     when the accumulated pile exceeds the area allocated to it
```

Snow storage is a land-use problem disguised as a weather problem. The volume that falls on a lot has to be
put somewhere on the same lot, and unlike water it does not drain away on any useful timescale. What makes it
tractable at all is densification: a worked pile is several times denser than the snow that fell, so the pile
occupies a fraction of the fallen volume -- and what makes it difficult again is the height limit, because
without one a pile would be a cone and with one it becomes a long low windrow that eats ground.

The height limit is not a preference and it is what turns a small volume into a large footprint. A pile at a
drive aisle blocks sight lines for drivers pulling out; a pile above the reach of a loader or a pusher cannot
be built or maintained; and a tall pile in an exposed lot is a wind problem and a melt-and-refreeze problem
underneath. Somewhere between ten and fifteen feet is where operations settle, and the footprint follows.

The haul trigger is a planning decision that is almost always made too late. Storage capacity is fixed by the
area allocated when the site was laid out, accumulation is not, and the moment the pile exceeds the allocation
the choices are to consume parking, to block circulation, or to haul. Hauling is expensive and slow and needs
a permitted disposal site; a lot whose snow plan was written in advance knows which event triggers it, and one
without a plan discovers it during the event.

**Inputs:** the lot area, the accumulation per event and the number of events, the fresh and piled snow densities, the pile height limit and side slope, the area per parking space, and the area allocated to snow storage

**Outputs:** the fallen volume, the pile volume after densification, the windrow cross-section and length, the footprint after one event and after several, the footprint as a share of the lot, the parking spaces consumed, the stored volume the allocation holds, and the volume to haul

## 3. Worked example

A 100,000 sq ft lot taking 12 in of snow:

```
fallen volume = 100,000 x 1 ft = 100,000 cu ft
pile volume   = 100,000 x 7 / 25 = 28,000 cu ft
```

**72 percent of the volume disappears into densification**, which is the only reason snow storage on a
lot is possible at all.

**Stack it as a windrow 12 ft high with 45 degree sides:**

```
base width    = 2 x 12 = 24 ft
cross-section = 0.5 x 24 x 12 = 144 sq ft
length        = 28,000 / 144 = 194 ft
footprint     = 194 x 24 = 4,667 sq ft = 4.7% of the lot
spaces lost   = 4,667 / 300 = 16
```

**16 parking spaces from one twelve-inch event.**

**Now run three events with no melting between them:**

```
pile volume = 84,000 cu ft
length      = 583 ft
footprint   = 14,000 sq ft = 14.0% of the lot
spaces lost = 47
```

**14% of the lot and 47 spaces.** A winter without a thaw does not consume storage gradually -- it
consumes it linearly, and the tenant notices at about the second event.

**Which is when hauling starts.** With 5% of the lot allocated to snow:

```
allocated area holds = 30,000 cu ft of pile
after three events   = 84,000 cu ft
to haul              = 54,000 cu ft = 2,000 cy = 100 truck loads
```

**100 loads to a permitted disposal site**, which is slow, expensive, and needs a site arranged before
the storm rather than during it. **A snow plan written in advance knows which event triggers the haul**; one
written during the event discovers it with the loader already running.

**And the height limit is what made the footprint large.** As a free cone, one event's 28,000 cu ft would stand
30 ft tall on 2,809 sq ft -- **40 percent less ground than the windrow** -- but it would stand
30 ft tall, block every sight line near it, and exceed the reach of the equipment that has to build it.
**The 12 ft height limit is what converts a compact pile into a long one**, and the 1,858 sq ft of difference is
the price of being able to see past it and to build it at all.

## 4. Scope and non-goals

A volume and footprint estimate. Snow densities are entered and vary enormously: fresh snow ranges from very light dry powder to heavy wet snow at several times that density, and a worked pile densifies further with handling, melt and refreeze, and the dirt and gravel it picks up -- a late-season pile is substantially denser and dirtier than the arithmetic suggests. It assumes no melting between events, which is the design case rather than the typical one; a lot's real storage requirement depends on the local pattern of events and thaws and is better established from a season's records. It does not address where storage may be placed: drainage and where meltwater goes, sight lines and traffic circulation, fire lanes and hydrant access, accessible parking and routes that may not be blocked, landscaping and pavement damage from piled snow, and the chloride and sediment load in the melt are all site constraints, and several are regulatory. It does not address hauling logistics, loading rates, or the permitting and acceptance requirements of a snow disposal site, which vary by jurisdiction and are increasingly restricted. The site's own snow plan, the applicable accessibility and fire access requirements, the local snow disposal regulations, and the property manager govern.
