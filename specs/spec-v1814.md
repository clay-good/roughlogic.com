# roughlogic.com Specification v1814 -- Dock Leveler Ramp Slope and Truck Bed Range (`calc-warehouse.js`, Group J Trucking and Logistics, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A dock leveler bridges the gap between a fixed dock and trailer beds that are never the same height, and the grade it creates is the difference divided by its length. A short leveler across an ordinary bed-height spread produces a ramp steeper than a pallet truck should climb.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dock height, leveler length, or service range, or a bed height range that does not bracket a usable differential returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the dock ramp grade relation and published practical grade guidance with the leveler manufacturer's selection data and the applicable OSHA requirements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dock leveler slope`, `truck bed height range dock`, `dock leveler length selection`, `loading dock grade forklift`, `dock height service range`.

## 2. The tile

### 2.1 `dock-leveler-slope` -- Dock Leveler Ramp Slope and Truck Bed Range

```
the geometry     the leveler spans from the dock face to the trailer bed; the
                 grade is the height difference over the leveler's length
bed heights      vary by trailer type and by how loaded the trailer is; a fleet of
                 mixed equipment presents a range, not a number
differential     dock height - bed height, positive when the trailer is low
grade            differential / leveler length
service range    a leveler is rated to work a stated distance above and below the
                 dock, commonly about 12 in each way
guidance         roughly 10% is a common practical maximum for powered equipment
                 and 7% or less is preferred; a manual pallet truck struggles
                 well before a forklift does
length           the only real remedy -- a longer leveler halves the grade for the
                 same differential
also             trailer creep, dock lock, and the trailer settling as it is loaded
                 all change the differential during the operation
```

The dock height is a single number and the fleet is not, which is the whole problem. A dock is poured at one
elevation and then serves whatever arrives -- a loaded van trailer riding low, an empty one riding high, a
refrigerated unit with a thicker floor, a drop-frame, a straight truck with a liftgate. The differential the
leveler has to bridge is a range, and the design case is the extreme of that range rather than the average.

Grade is the quantity that actually matters and it is decided by length. A leveler's service range says
whether it can reach a given bed height at all; the grade says whether equipment can work across it once it
does. Those are different questions, and a leveler comfortably within its service range can still present a
ramp too steep to run pallets over safely -- particularly with a manual pallet truck, which has no power to
climb and no brake to descend.

The differential also moves during the operation, which the static calculation does not capture. A trailer
settles on its suspension as it is loaded, rises as it is unloaded, and can creep away from the dock under the
push of a lift truck. Restraints and wheel chocks address the creep; the settling is simply a reason the grade
at the end of a load is not the grade at the start.

**Inputs:** the dock height, the range of trailer bed heights served, the leveler length and its rated service range above and below the dock, and the practical grade guideline

**Outputs:** the differential at the low and high ends of the bed range, whether each is within the leveler's service range, the ramp grade at each end for the entered length, the grade a longer leveler would produce, and the check against the grade guideline

## 3. Worked example

A 48 in dock serving trailer beds from 40 to 56 in, with a 6 ft leveler:

```
low trailer:  differential = 48 - 40 = 8 in below dock
high trailer: differential = 56 - 48 = 8 in above dock
service range = +/- 12 in -- both ends reachable
grade (low)   = 8 / 72 = 11.1%
```

**11.1% against a 10% guideline.** The leveler reaches the trailer comfortably and the ramp is steeper than
powered equipment should work across -- **two different questions, and the service range answered only the
first one.**

**Length is the whole remedy:**

```
10 ft leveler: grade = 8 / 120 = 6.7%
```

**6.7% -- inside the guideline, from the same dock, the same trailer, and the same 8 in of differential.**
Nothing but the leveler changed, and **a longer leveler is the only intervention that reduces grade without
moving the dock.**

**Now add a drop-frame trailer at 36 in to the fleet:**

```
differential = 48 - 36 = 12 in -- at the edge of a 12 in service range
grade on the 6 ft leveler  = 16.7%
grade on the 10 ft leveler = 10.0%
```

**16.7% is a ramp nobody should run a pallet truck down**, and even the long leveler is at 10.0%, right on the
guideline. **One trailer type at the edge of the fleet sets the requirement for the whole dock**, which is why
bed heights are surveyed across the actual fleet before a dock elevation is poured -- it is the one dimension
that cannot be changed afterwards.

**And the differential moves while the work is happening.** A trailer settles on its suspension as it loads and
rises as it empties, so the grade at the end of a load is not the grade at the start, and **a trailer can creep
away from the dock under the push of a lift truck** -- which is what restraints and chocks are for, and is a
life-safety matter rather than a grade one.

## 4. Scope and non-goals

A geometry calculation. Leveler selection is made from the manufacturer's capacity and service-range data for a specific model, and the capacity rating depends on the lift truck and load weight, the number of crossings per day, and the impact the equipment delivers -- a leveler correct on grade can be under-rated on capacity. Bed heights must be surveyed across the actual fleet in loaded and empty condition rather than taken from a table, since they vary by trailer type, suspension, tyre condition, and load. It does not address the leveler's lip length and the bed engagement it requires, the approach grade of the dock apron -- which adds to or subtracts from the effective grade and is frequently the larger term on a sloped site -- the dock seal or shelter, the pit design, or the leveler's own operation and maintenance. It does not address trailer restraints, wheel chocks, communication and interlock systems, or trailer creep and separation, which are the loading dock's principal hazards and are governed by OSHA requirements and the operator's own procedures. The leveler manufacturer's selection data, the applicable OSHA requirements, and the facility designer govern.
