# roughlogic.com Specification v1618 -- Concrete Boom Pump Reach and Setup Radius (`calc-concrete.js`, Group E Carpentry and Construction, concrete, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; concrete placement and tilt-up), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A boom pump's advertised reach is a vertical number and a horizontal number that cannot both be achieved at once. What a crew needs on a site visit is whether the boom reaches the far corner from the only place the truck can set up -- which is a triangle, and then a ground bearing question.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive boom reach or required distance, or a required height exceeding the vertical reach returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the reach geometry approximation with the manufacturer reach diagram and OSHA 1926.1408 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`concrete boom pump reach`, `boom reach at height`, `pump truck setup radius`, `boom pump outrigger load`, `concrete placement reach check`.

## 2. The tile

### 2.1 `boom-pump-reach` -- Concrete Boom Pump Reach and Setup Radius

```
vertical reach    the maximum height, straight up
horizontal reach  the maximum distance from the boom centre, at low elevation
reach at a height r_h = sqrt(R^2 - h^2) as a first approximation for a single-radius boom
                  (real multi-section booms follow a published reach diagram, not a circle)
setup radius      the boom centre is offset from the truck; outriggers extend further
ground bearing    outrigger loads are large and concentrated (`crane-ground-bearing`)
clearance         power lines govern the setup independently of reach
```

The circle approximation is a screening tool and the manufacturer's reach diagram is the truth: a multi-section
boom's envelope is not a circle, it has dead zones close in and near the mast, and its reach at a given height
depends on which unfolding configuration is used. But the circle is good enough to answer the site-visit question
of whether a pour is plausible from a given setup, and it is much faster than pulling out the chart.

The two constraints that decide a setup are almost never reach. Outrigger ground bearing is the first: boom pump
outrigger loads are concentrated and large, and setting up over a utility vault, a basement wall, or soft backfill
is how a pump goes over. Cribbing and mats are sized from the outrigger load, and it is the same calculation the
catalog already does for cranes.

Power line clearance is the second and it is absolute. A boom is a long conductor swinging near overhead lines,
and the required clearances under OSHA 1926.1408 apply to concrete pumps as they do to cranes. A setup that
reaches beautifully and puts the boom inside the clearance envelope is not a setup.

**Inputs:** boom vertical and horizontal reach, the required placement distance and height from the setup point, the boom centre offset from the truck, the outrigger spread and load, and the distance to overhead power lines

**Outputs:** the approximate reach available at the required height, the required distance against it, the margin, the maximum height reachable at the required horizontal distance, the outrigger load for a ground bearing check, and a power line clearance flag

## 3. Worked example

A boom pump with 110 ft of reach, placing at 45 ft above the boom centre:

```
horizontal reach at 45 ft ~ sqrt(110^2 - 45^2) = sqrt(10,075) = 100 ft
```

About 100 ft horizontally at that height, against 110 ft at low level -- **10 ft of reach
lost to elevation**, which is the number that surprises people reading a spec sheet.

If the far corner of the pour is 95 ft from the only available setup point and 45 ft up, this boom has
5 ft to spare and it works. At 105 ft it does not, and the options are a different setup point, a
larger pump, or line from the boom tip.

Then the two checks that actually decide it:

**Ground bearing.** If each outrigger can see 40,000 lb and the pad is 2 ft by 2 ft, the bearing pressure is
`40,000 / 4` = 10,000 psf -- far beyond most soils, so mats are required and their size comes from the allowable
bearing. Set an outrigger over a backfilled trench or a utility vault and no mat saves it.

**Power lines.** A boom working 45 ft up near overhead conductors is subject to the same clearance requirements
as a crane, and those clearances are not negotiable regardless of what the reach diagram permits.

## 4. Scope and non-goals

A circle approximation for screening only. Real boom envelopes are published as reach diagrams with
configuration-dependent limits, dead zones, and reduced capacities in certain positions, and the manufacturer's
diagram governs. It does not evaluate boom capacity or the effect of line and concrete weight in the boom, wind
limits on boom operation, or the stability of the machine, all of which are manufacturer limits. It does not size
outrigger mats or evaluate ground bearing, which is `crane-ground-bearing` and requires the actual outrigger
loads from the manufacturer and an allowable bearing pressure from a geotechnical assessment -- and setting up
over unknown subsurface conditions is a leading cause of pump overturns. It does not address power line clearance,
which is governed absolutely by OSHA 1926.1408 and the utility. It does not address line pressure
(`concrete-pump-line-pressure`). The pump manufacturer's reach and load charts, OSHA, and the contractor's
competent person govern.
