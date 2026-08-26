# roughlogic.com Specification v1400 -- Helicopter Landing Zone Size, Slope, and Approach (calc-field.js, Group P, field, backcountry, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-field.js`**
> (Group P, field, backcountry, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P plans searches, tracks sweep width, and computes searcher-hours, but nothing sizes the landing zone a ground team has to select and secure. LZ selection is three independent checks -- clear area, ground slope, and an obstruction-free approach path -- and the approach one is the geometric calculation that decides whether a clearing that looks big enough actually is.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive rotor diameter, obstacle height, or approach ratio, or a slope limit outside 0-45 degrees, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the landing-zone sizing practice of a clear square keyed to rotor diameter, the manufacturer's slope-landing limit, and the obstruction-clearance approach ratio, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `helicopter-lz-sizing` -- Helicopter Landing Zone Size, Slope, and Approach

```
clear area side  = size factor x rotor diameter        (commonly 2x for day, more at night)
touchdown pad    = a firm, level area within that clear square
slope limit      = manufacturer's limit, in degrees; percent = tan(limit) x 100
approach length  = tallest obstacle height x approach ratio, measured beyond the obstacle
```

Three checks, and a clearing has to pass all of them. The **size** check is a clear square keyed to rotor
diameter -- roughly twice the rotor for a routine daytime landing, larger at night, in dust or snow, or with a
sling load. The **slope** check is the aircraft's published limit, usually somewhere under 10 degrees and often
less across the roll axis than the pitch axis, and it is what disqualifies most hillside clearings.

The **approach** check is the one a ground team miscalculates. The aircraft cannot descend vertically into a hole
by preference; it wants a shallow approach and departure path into the wind, commonly 10:1 or shallower, and that
path has to clear every obstacle. A 40 ft tree line on the approach end does not cost you 40 feet of clearing --
it costs 400 feet of clear approach beyond it. That is why a clearing that measures fine on the ground is refused
from the air.

**Inputs:** aircraft rotor diameter (ft), size factor for the conditions, measured clear area, ground slope
(degrees or percent), aircraft slope limit, tallest obstacle height on the approach (ft), approach ratio.

**Outputs:** required clear-area dimension, pass or fail on area, slope limit in both degrees and percent, pass
or fail on slope, required approach length beyond the obstacle, and total clear distance required end to end.

## 3. Worked example

A 50 ft rotor aircraft, daytime, 2x size factor, on ground measuring 6 degrees, with a 40 ft tree line at the
approach end and a 10:1 approach:

```
clear area   = 2 x 50            = 100 x 100 ft required
slope        = 6 deg measured against an 8 deg limit -> passes; 8 deg = 14.1% grade
approach     = 40 x 10           = 400 ft of clear approach beyond the trees
```

The clearing itself is a hundred feet on a side and the ground slope is acceptable, but the site needs 400 feet
of unobstructed approach past that tree line -- and if there is a second tree line 300 feet out, the LZ fails on
approach even though it passed on area and slope. Doubling the tree height to 80 ft doubles the approach
requirement to 800 ft: the approach requirement is linear in obstacle height and unforgiving.

## 4. Scope and non-goals

A ground-team screening aid, not an aviation decision. **The pilot in command decides whether to land, and no
calculation overrides that.** Size factors, approach ratios, and slope limits vary by aircraft, by operator
policy, and by conditions -- density altitude, gross weight, wind, dust or snow, and night vision goggles all
change what is acceptable, and a hot-and-high LZ that works in winter may not work in July (the catalog has a
density-altitude tile). The tile does not address surface firmness, loose debris that will become foreign object
damage, wires -- which are the single greatest hazard and are frequently invisible from the ground -- LZ marking,
or communications and control. The pilot in command, the operator's policy, and the incident air operations
branch govern.
