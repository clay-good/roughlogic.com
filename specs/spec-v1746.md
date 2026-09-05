# roughlogic.com Specification v1746 -- Radon Sub-Slab Suction Pit and Field Extension (`calc-cross.js`, Group B Plumbing and Gas, plumbing, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; cross-trade gap fills), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A suction pit under a slab is a void that lets the fan draw from a wide area instead of a small hole, and its size is what determines how far the suction field extends. Digging a bigger pit is usually cheaper than adding a second suction point.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pit volume or slab area, or a suction point count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the sub-slab communication test method with the ANSI/AARST mitigation standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`radon suction pit size`, `sub slab communication test`, `suction field extension radon`, `multiple suction points`, `sub slab compartment footing`.

## 2. The tile

### 2.1 `radon-suction-pit` -- Radon Sub-Slab Suction Pit and Field Extension

```
pit volume        material excavated below the slab at the suction point
                  commonly 5 to 15 gallons of material removed
purpose           reduces the entry resistance so the fan's pressure goes into
                  extending the field rather than into the hole itself
field extension   measured at test holes; a good sub-slab may extend 30 to 50 ft,
                  a poor one only a few feet
communication test  a vacuum applied at a proposed point with readings at test holes;
                  it establishes how many points are needed BEFORE the system is built
multiple points   where the field will not extend far enough, additional points rather
                  than a larger fan
subdivisions      footings, grade beams, and interior walls divide the sub-slab into
                  compartments that must each be served
```

The pit works by removing the entry restriction. Without one, the fan is drawing through the area of the pipe
where it meets the sub-slab material, and the pressure loss at that small interface consumes most of what the fan
develops -- so very little is left to extend the field. Excavating a pit turns that small interface into a large
one, and the fan's pressure goes into pulling from a distance instead.

The communication test is the design step and it is what separates a mitigation that works from one that is
guessed. A vacuum is applied at a proposed suction location and readings are taken at test holes drilled at
various distances; the pattern shows how far the field extends and therefore how many points the building needs.
Doing it before the system is built is the difference between installing the right system and installing a system
and then adding to it.

Subdivisions are the finding a communication test reveals that nothing else does. Footings, grade beams, and
interior bearing walls poured through the slab divide the sub-slab into compartments, and a field in one
compartment does not reach the next. A building that appears to be a single slab can be four independent
compartments, each needing its own suction point, and no amount of fan capacity crosses a footing.

The order of remedies follows: pit first, because it is cheap; more points second; a larger fan last, because a
fan cannot push a field through material that will not pass it.

**Inputs:** the slab area and its subdivisions, the sub-slab material, the pit volume, the number and location of suction points, and the communication test vacuum readings at each test hole

**Outputs:** the pit volume, the estimated field extension for the entered sub-slab material, the slab area served per suction point, the number of points the entered area and subdivisions require, and the communication test interpretation from the entered test hole readings

## 3. Worked example

A 1,600 sq ft slab on clean gravel, with a communication test at a proposed pit location:

```
test hole 10 ft away:  measurable vacuum        -> field reaches
test hole 25 ft away:  measurable vacuum        -> field reaches
test hole 40 ft away:  no measurable vacuum     -> field does NOT reach
```

The field extends somewhere between 25 and 40 ft, so **one suction point serves a radius of about 25 to 30 ft**
-- and a 1,600 sq ft slab is covered by one point if it is compact, or needs two if it is long and narrow.

**Now the same test on a slab over compacted fines:**

```
test hole 6 ft away:   marginal vacuum
test hole 12 ft away:  none
```

A field of a few feet. This building needs several points regardless of fan size -- **and that is the finding the
communication test exists to produce, before anything is installed** rather than after a single-point system
fails its post-mitigation test.

**The pit is the first remedy** because it is the cheapest. Excavating 10 gallons of material below the pipe
turns a small entry restriction into a large one and lets the fan's pressure go into extending the field rather
than into the hole. It costs an hour.

**Subdivisions are the finding nothing else reveals.** If a test hole 15 ft away on the other side of an interior
bearing wall shows nothing while one 25 ft away on the same side shows good vacuum, the slab is compartmented by
a footing -- and the far compartment needs its own point. No fan crosses a footing.

Order of remedies: **pit, then more points, then a bigger fan** -- and the fan is last because it cannot push a
field through material that will not pass it.

## 4. Scope and non-goals

A design framework around communication test results the user supplies. Sub-slab communication testing is the
diagnostic that establishes suction point requirements and it is performed with a vacuum source and a micromanometer
by a trained person; the field extension it reveals is site-specific and cannot be predicted from slab area or
material type alone. It does not size the fan (`radon-fan-static`), design the piping, or address the routing,
discharge, labelling, and monitoring requirements of the mitigation standards. It does not address slab sealing,
sump and drain tile connections, crawl space membranes, or the other foundation types that require different
approaches entirely. It does not address the depressurization the system creates and its effect on combustion
appliances. Post-mitigation testing is what demonstrates the system works. ANSI/AARST mitigation standards, the
state radon program, and a certified radon mitigation professional govern.
