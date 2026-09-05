# roughlogic.com Specification v1611 -- Speed Hump and Table Geometry (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A speed hump's height and length set the speed a driver finds comfortable, and getting the proportions wrong produces either a device nobody slows for or one that bottoms out a fire truck. The geometry is a parabola or a circular arc and the design speed follows from it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive height or length, or a design speed at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the speed hump and table geometry conventions with ITE traffic calming guidance and the agency standard drawings named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`speed hump geometry`, `speed table design speed`, `traffic calming device height`, `speed cushion dimensions`, `hump versus table`.

## 2. The tile

### 2.1 `speed-hump-geometry` -- Speed Hump and Table Geometry

```
speed hump      12 to 14 ft long, 3 to 4 in high; design speed roughly 15 to 20 mph
speed table     flat-topped, 22 ft or longer overall; design speed 25 to 30 mph
                the flat top lets a long wheelbase sit level
raised crossing a speed table with a crosswalk on the flat top
profile         parabolic or circular; the approach ramp slope is what drivers feel
vertical accel  the discomfort a driver feels scales with height and inversely with
                the square of the length at a given speed
emergency access longer, flatter devices delay fire apparatus far less than short humps
```

Height and length work against each other, and length is the variable that separates a device from a hazard. A
3 inch hump over 12 feet produces enough vertical acceleration at 25 mph to make a driver slow to 15; the same 3
inches over 22 feet is gentle enough that a driver takes it at 25 and a fire truck takes it at speed. That is why
the choice between a hump and a table is really a choice about what speed you want and what emergency response
delay you will accept.

The wheelbase issue is the reason speed tables exist. A short hump lifts one axle at a time, which is what makes
it uncomfortable; a flat top long enough for a whole vehicle to sit on removes that, so a table can be higher
without being harsher on long vehicles and without grounding low ones.

Emergency access is the constraint that usually decides the argument in a neighbourhood. Each short hump costs a
fire apparatus several seconds; a corridor with six of them costs meaningful response time, and fire departments
routinely and legitimately object. Tables and cushions -- which let wide-track apparatus straddle the gap -- are
the compromises, and they come from this same geometry.

**Inputs:** device height, total length and flat-top length, the profile shape, the target design speed, the design vehicle wheelbase and ground clearance, and the emergency response route status

**Outputs:** the approach ramp slope, the design speed the geometry implies, the vertical acceleration at a stated crossing speed, the ground clearance check for the entered design vehicle, and the geometry required for a target design speed

## 3. Worked example

A classic 12 ft speed hump, 3 in high, parabolic:

```
average approach slope = 3 in over 6 ft = 3.5%
design speed           ~ 15 to 20 mph
```

Now a 22 ft speed table with a 10 ft flat top, also 3 in high:

```
ramp length            = (22 - 10) / 2 = 6 ft each side
approach slope         = 3 in over 6 ft = 3.5%   (the SAME ramp slope)
design speed           ~ 25 to 30 mph
```

Same height, same ramp slope, and a design speed 10 mph higher -- because the flat top lets a whole vehicle sit
level instead of pitching. **The flat top, not the height, is what makes it tolerable**, and that is the design
insight the arithmetic carries.

Ground clearance: a vehicle with a 120 in wheelbase and 5 in of clearance crossing the 12 ft hump has its
midpoint elevated relative to its axles by an amount that a short wheelbase handles and a long low vehicle does
not. On the 22 ft table with a 10 ft flat top, a 120 in wheelbase sits entirely on the flat and clears
comfortably.

Emergency access: the hump costs a fire apparatus roughly 8 to 10 seconds each; the table roughly 2 to 3. On a
corridor with six devices that is a minute of response time, and it is why fire departments prefer tables and
cushions.

## 4. Scope and non-goals

A geometric screen. It does not design a traffic calming installation: device selection, spacing, placement
relative to driveways, intersections, drainage, and bus and emergency routes, signing and marking, and the public
process are all part of a program that this arithmetic supports rather than replaces. Device dimensions are set
by the agency's standard drawings and by ITE traffic calming guidance, and they vary; using dimensions from
another jurisdiction is a common source of devices that do not perform as expected. It does not evaluate
drainage, which a hump across a gutter line disrupts, or pavement construction and durability. It does not
quantify emergency response delay, which requires the fire department's own apparatus and route data. It does not
address speed cushions, chicanes, or the other calming devices. The agency's standard drawings, ITE traffic
calming guidance, the fire department, and the adopted MUTCD for signing and marking govern.
