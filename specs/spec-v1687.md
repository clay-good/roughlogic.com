# roughlogic.com Specification v1687 -- Mast Climbing Work Platform Load Distribution (`calc-construction.js`, Group E Carpentry and Construction, scaffold, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; scaffold and shoring), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A mast climbing work platform carries its load on a cantilever from the mast, so where the load sits matters as much as how much there is. The rated capacity is a distribution as well as a total, and loading one end is what overturns them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive platform length or capacity, or a load position beyond the platform extents returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the moment and zone loading concepts with the manufacturer load charts and OSHA 1926 Subpart L named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mast climber platform capacity`, `mcwp load distribution`, `mast climbing scaffold loading`, `platform zone load chart`, `mast climber tie spacing`.

## 2. The tile

### 2.1 `mast-climber-platform-load` -- Mast Climbing Work Platform Load Distribution

```
total capacity     the platform's rated live load, from the manufacturer
distribution       the rating is stated with a load distribution; concentrating load at
                   the outboard end or one end of a long platform is a different case
moment about mast  load x distance from the mast; the mast and its ties carry it
cantilever ends    extensions beyond the mast bay have sharply reduced capacity
material staging   masonry units staged on a platform are a large concentrated load
wind               the platform and any sheeting add wind load to the mast and ties
tie spacing        the mast is tied to the structure at intervals; the ties carry the moment
```

A mast climber is a cantilever, and the manufacturer's capacity is stated for a defined load distribution.
Placing the same total load at the outboard edge, or all of it on one cantilevered end, produces a moment the
platform and mast were not rated for even though the scale says the load is within capacity. That distinction is
the difference between the rated number and a safe load, and it is why manufacturers publish load charts by zone
rather than a single figure.

Masonry work is the case that stresses it. A platform staged with cubes of block and a mixer is carrying a very
large concentrated load, placed by a forklift at whatever spot is convenient, and it is easy to exceed a zone's
rating while the total remains under the platform's. Marking the platform with its zone limits, and staging to
them, is what keeps that from being a judgment made by whoever is driving the lift.

The mast ties are where the moment ends up. Everything the platform carries, and everything the wind pushes,
becomes a load in the ties to the building at their spacing -- so a tie pattern is part of the load path and not
an incidental. Ties anchored into cladding rather than structure, or spaced beyond the manufacturer's interval,
are the failure that the load chart cannot see.

**Inputs:** the platform rated capacity and its load distribution basis, the platform and cantilever dimensions, each load with its weight and position, the mast tie spacing and capacity, and the wind exposure and any sheeting

**Outputs:** the total load against the rated capacity, the load in each zone against its zone rating, the moment about the mast, the moment against the mast and tie capacity, the maximum load permitted at a stated position, and a flag where a zone is exceeded while the total is within capacity

## 3. Worked example

A 40 ft platform with a 6,000 lb rated live load, mast at the centre, 8 ft cantilever ends.

A crew stages four cubes of block totalling 5,200 lb -- within the 6,000 lb rating -- and the forklift places them
all on one cantilever end because that is the accessible corner.

```
total load        5,200 lb  vs 6,000 lb rated  -> appears acceptable
position          all of it on an 8 ft cantilever
```

**The total passes and the zone does not.** Cantilever ends carry a small fraction of the platform's rating,
because the load there acts on a long moment arm and is carried by a section designed for a fraction of the
central bay's load. The manufacturer's chart gives that zone's limit and it will be far below 5,200 lb.

The moment: 5,200 lb at a mean distance of, say, 24 ft from the mast is `5,200 x 24` = {5200*24:,.0f} ft-lb into
the mast and from there into the ties.

Distribute the same 5,200 lb evenly across the platform and the moment about the mast is close to zero, and every
zone is within its rating. **Same weight, same platform, entirely different structure.**

That is why platforms are marked with zone limits and why staging is planned rather than left to whoever is
driving the lift -- and why the material delivery sequence on a mast climber job is a safety document.

## 4. Scope and non-goals

A screening calculation. Mast climbing work platform capacity, load distribution, zone limits, cantilever
ratings, mast tie spacing and capacity, and the permitted wind conditions for operation and for leaving a
platform in place are all set by the manufacturer for the specific configuration, and the manufacturer's load
charts and erection drawings govern absolutely -- a platform is engineered as an assembly and its capacity is not
a general calculation. It does not address erection, climbing, and dismantling procedures, base support and
foundation, the structure the ties anchor to, or the qualified and competent person requirements. It does not
address the wind load on the platform and any sheeting, which must be evaluated by a qualified person. Mast
climber collapses are fatal: OSHA 1926 Subpart L, ANSI A92 as applicable, the manufacturer's instructions and
load charts, and the qualified person who designed the installation govern.
