# roughlogic.com Specification v1661 -- Unibody Frame Diagonal Measurement and Tolerance (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, auto body, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; auto body and refinishing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A unibody that has been hit is checked by measuring diagonals, and if the two diagonals of a rectangle are equal the rectangle is square. It is the oldest check in the trade and it still finds damage that a visual inspection misses, because a few millimetres of diagonal difference is a visible steering pull.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive measured length, or a tolerance at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the diagonal and symmetry check methods with the vehicle manufacturer body dimension chart named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`unibody diagonal measurement`, `frame diamond damage check`, `body dimension tolerance`, `symmetry measurement collision`, `x check frame`.

## 2. The tile

### 2.1 `frame-diagonal-tolerance` -- Unibody Frame Diagonal Measurement and Tolerance

```
diagonal check    on a rectangle, equal diagonals means square
                  a difference means the shape is a parallelogram -- diamond damage
symmetry          left and right measurements from a centreline should match
datum             underbody dimensions are given from a datum plane in three axes
tolerance         manufacturers commonly specify a few millimetres; the specification governs
three dimensions  length, width, and height (datum) each have their own tolerances
sag and mash      vertical and longitudinal collapse, checked against datum rather than
                  by diagonals
```

The diagonal check catches diamond damage -- one side of the structure driven rearward relative to the other --
which is the failure that a straight-on visual inspection is worst at seeing. A vehicle can look square from every
angle and be several millimetres out on the diagonals, and the driver experiences it as a pull, uneven tyre wear,
or an inability to align the wheels within specification.

Symmetry measurements catch the same thing from the other direction: paired points left and right of the
centreline should be equidistant, and a difference localizes where the structure moved. Together the two find
lateral damage; neither finds sag or mash, which are vertical and longitudinal collapse and are only visible
against the datum dimensions in the manufacturer's body dimension chart.

The reason to measure rather than judge is that modern unibody tolerances are tight -- a few millimetres -- and
the structure is designed to deform in a controlled way. A vehicle pulled back to within tolerance in all three
axes and a vehicle that looks straight are different things, and the difference shows up in wheel alignment,
in how the next collision performs, and in whether the repair can be certified.

**Inputs:** the two diagonal measurements of each bay, the paired left and right symmetry measurements from the centreline, the manufacturer specified dimensions and tolerance, and the datum measurements for sag and mash

**Outputs:** the difference between each pair of diagonals, each against the tolerance, the symmetry difference for each paired point, a square or out-of-square verdict per bay, and the direction the structure has moved

## 3. Worked example

A cowl-to-strut-tower bay measured corner to corner:

```
diagonal A = 1,412 mm
diagonal B = 1,405 mm
difference = 7 mm
tolerance  = 3 mm
```

**7 mm out against a 3 mm tolerance** -- the bay is a parallelogram, not a rectangle, and the structure has
diamond damage. Which diagonal is short tells the technician which corner has moved rearward.

Symmetry confirms it. Measuring from the centreline to paired points:

```
left  strut tower to datum point = 684 mm
right strut tower to datum point = 691 mm
difference                       = 7 mm
```

The same 7 mm, on the same side, so the diagnosis is consistent: the left front has been driven back.

What neither check finds: if this vehicle also sits 6 mm low at the front cross-member -- sag -- the diagonals
can be perfect and the symmetry perfect while the structure is still out. That is a datum measurement in the
vertical axis against the manufacturer's body dimension chart, and it needs a measuring system rather than a
tape.

The consequence of stopping at "looks straight": a vehicle 7 mm out on this bay will not align within
specification, and if it can be made to align by adjusting camber and caster to their limits, it is a vehicle
whose suspension geometry is compensating for a bent structure.

## 4. Scope and non-goals

A geometric check against dimensions and tolerances the user supplies. Body dimensions, datum planes, measuring
points, and tolerances are specific to the vehicle and come from the manufacturer's body dimension chart or the
measuring system's database; generic tolerances are not usable. A diagonal check finds lateral (diamond) damage
only -- it does not find sag, mash, twist, or damage that is symmetric about the centreline, all of which require
three-dimensional measurement against datum. It does not evaluate whether damage is repairable, which depends on
the vehicle maker's repair procedures, the materials involved (high-strength and ultra-high-strength steels,
aluminium, and composites each have their own rules, and many may not be straightened at all), and sectioning
restrictions. It does not address restraint system inspection after a collision. The vehicle manufacturer's body
repair manual and dimension charts, and the manufacturer's position statements on repairability, govern.
