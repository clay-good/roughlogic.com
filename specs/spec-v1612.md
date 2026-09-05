# roughlogic.com Specification v1612 -- Intersection Sight Triangle and Departure Distance (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A driver waiting to pull out needs to see far enough along the through road to complete their manoeuvre before a vehicle arrives. That distance is a time gap times the through speed, and the triangle it defines is what has to stay clear of signs, landscaping, and parked cars.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive major road speed or time gap, or a negative setback returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the AASHTO departure sight distance relation and time gap values by name with the Green Book cited, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`intersection sight triangle`, `departure sight distance`, `sight distance stop controlled intersection`, `clear sight triangle landscaping`, `aashto time gap`.

## 2. The tile

### 2.1 `intersection-sight-triangle` -- Intersection Sight Triangle and Departure Distance

```
departure sight distance  b = 1.47 x V_major x t_g       (feet, mph, seconds)
time gap t_g              AASHTO values: 7.5 s for a passenger car turning left from
                          a stop onto a two-lane road, longer for trucks and more lanes
add per lane              0.5 s for each additional lane crossed
the triangle              legs of the decision point setback along the minor road and
                          b along the major road in each direction
clear                     nothing above about 3 ft or below about 8 ft may obstruct it
```

The time gap is the whole design and it is a behavioural number rather than a physical one: it is how long a
driver needs to start, accelerate, and clear the through lane without making an approaching driver slow. It grows
with the number of lanes crossed and grows substantially for trucks, which is why an intersection that works for
cars can be inadequate for the farm or the plant it also serves.

The sight distance itself is then just speed times time, and it is longer than intuition suggests: 7.5 seconds at
45 mph is nearly 500 feet in each direction. The triangle those legs define is a large area, and keeping it clear
is a maintenance obligation as much as a design one -- landscaping grows, snow banks accumulate, and a permitted
sign or a parked truck can defeat a properly designed intersection years after it was built.

The vertical window is the detail people miss. Obstruction is judged between roughly three feet and eight feet
above the road, because that is the band between a driver's eye and an approaching vehicle's roof; a low wall or
a high canopy may sit inside the triangle legally, while a hedge at four feet does not.

**Inputs:** major road design speed, the manoeuvre and design vehicle for the time gap, the number of lanes crossed, the minor road decision point setback, and the available sight distance measured in each direction

**Outputs:** the required departure sight distance in each direction, the triangle legs, the available distance against the requirement, the shortfall where one exists, the speed at which the available distance would suffice, and the vertical clear window

## 3. Worked example

A stop-controlled minor approach onto a 45 mph two-lane road, passenger car turning left, time gap
7.5 s:

```
b = 1.47 x 45 x 7.5 = 496 ft in each direction
```

**496 feet** of clear sight along the major road, both ways, from a decision point about 15 ft back from the
edge of the travelled way. That triangle is roughly 496 ft by 15 ft on each side, and it must stay clear
between 3 and 8 ft above the pavement.

Now a truck making the same manoeuvre. AASHTO's time gap for a single-unit truck is longer -- about 9.5 s:

```
b = 1.47 x 45 x 9.5 = 628 ft
```

132 ft further. An intersection serving a quarry, a farm, or a distribution site is designed on the
truck gap, and one designed on the car gap and later serving trucks is deficient without anything having changed
on the ground.

The maintenance point: if the available distance measures 380 ft because a row of arborvitae has grown in, the
intersection is 116 ft short for cars and 248 ft short for trucks. The fix is vegetation
management, and it is cheaper than every alternative.

## 4. Scope and non-goals

A sight distance calculation using AASHTO time gaps the user supplies. The gap values depend on the manoeuvre
(left turn, right turn, crossing), the design vehicle, the number and width of lanes crossed, and the approach
grade, and the AASHTO Green Book tables govern. It does not evaluate approach sight distance, decision sight
distance, or intersection sight distance for other control types -- signalized, yield-controlled, and
roundabout intersections each have their own criteria. It does not address the horizontal and vertical geometry
that may obstruct sight independently of objects, or measure the available distance, which is a field
measurement from the actual driver eye height and object height. It does not address the legal status of
obstructions within the triangle, which depends on right-of-way, easements, and local ordinance. The AASHTO Green
Book, the agency's design standards, and the roadway engineer govern.
