# roughlogic.com Specification v1657 -- Elevator Overspeed Governor Tripping Speed (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An overspeed governor is the device that decides a car is running away, and its tripping speed is set as a margin above contract speed with a hard ceiling. It is tested, not assumed, and the two speeds -- when it trips the switch and when it sets the safety -- are different numbers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rated speed, or a tripping speed below the code minimum or above the code maximum for that speed returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASME A17.1 governor tripping speed limits by name with the elevator authority and licensed mechanic named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator governor tripping speed`, `overspeed governor setting`, `115 percent rated speed`, `governor test elevator`, `safety application speed`.

## 2. The tile

### 2.1 `governor-tripping-speed` -- Elevator Overspeed Governor Tripping Speed

```
electrical trip   the governor overspeed switch operates first, removing power and
                  applying the brake; set below the mechanical trip
mechanical trip   the governor grips the rope and sets the car safety
minimum trip      at least 115% of rated speed for the mechanical trip
maximum trip      a ceiling that falls as rated speed rises, per ASME A17.1
                  higher speeds get proportionally tighter margins
governor rope     runs at car speed regardless of the suspension roping ratio
testing           tripping speed is verified by test, at intervals set by code
```

Two devices operate at two speeds and the order matters. The electrical overspeed switch trips first, cutting
power and setting the brake, which stops most overspeed events without the safety ever engaging. Only if the car
continues to accelerate does the governor mechanically grip its rope and pull the safety, which wedges the car
against the guide rails -- a violent event that takes the car out of service and requires inspection afterward.
A governor with the two settings inverted, or with the electrical trip inoperative, removes the gentle stop and
leaves only the violent one.

The margin band is bounded at both ends for good reasons. The minimum -- 115 percent of rated speed -- ensures the
governor does not trip on normal operation, including the modest overspeed that occurs on a heavily loaded down
run. The maximum exists because a safety must engage before the car reaches a speed at which the buffers below it
cannot absorb the impact (`buffer-stroke-speed`), so governor trip, safety type, and buffer stroke are a set
rather than independent choices.

The governor rope runs at car speed regardless of the suspension roping, which is worth stating because a
mechanic used to thinking in 2:1 terms can misread what the governor is seeing.

**Inputs:** rated car speed, the electrical and mechanical tripping speeds, the code minimum and maximum for that rated speed, the safety type, and the last test date

**Outputs:** the minimum and maximum permitted tripping speeds for the entered rated speed, the electrical and mechanical settings against those limits, the margin above rated speed as a percentage, a pass or fail on the ordering of the two trips, and the buffer speed the mechanical trip implies

## 3. Worked example

A car with a 500 fpm contract speed:

```
minimum mechanical trip = 1.15 x 500 = 575 fpm
```

The maximum permitted trip comes from the code's table and is tighter as a percentage at higher rated speeds --
so a 500 fpm car has a wider permitted band than a 1,200 fpm car does.

The electrical switch is set below the mechanical trip, commonly a modest margin under it. A governor found with
its electrical trip set ABOVE its mechanical trip has lost the gentle stop entirely: any overspeed goes straight
to a safety application, which stops the car violently, takes it out of service, and requires inspection of the
safeties and the rails afterward.

**The chain this sits in**: the mechanical trip speed sets the maximum speed at which the car can strike the
buffers, which sets the buffer stroke required (`buffer-stroke-speed`). Raising a governor's trip speed to stop
nuisance trips therefore invalidates the buffer selection below it, which is why governor settings are not a
field adjustment.

Verification is by test, at the intervals the code requires -- a governor is a mechanical device with springs and
pivots that age, and a setting recorded on a tag is not evidence of a setting that still holds.

## 4. Scope and non-goals

A limit comparison against code values the user supplies. The minimum and maximum tripping speeds, the
relationship between the electrical and mechanical settings, and the testing intervals are set by the adopted
edition of ASME A17.1 and by the jurisdiction, and the values above describe the common case rather than the
rule. Governor setting and testing are performed by licensed elevator personnel using prescribed procedures, and
a governor is typically required to be tested and, at intervals, removed and calibrated by an authorized facility
-- a field adjustment of tripping speed is not maintenance. It does not evaluate the safety itself, its type
(instantaneous, Type A, Type B), its condition, or its capacity for the car and load, and it does not size buffers
(`buffer-stroke-speed`). It does not address ascending car overspeed protection or unintended movement
protection, which are separate required devices. This is a life-safety system: ASME A17.1 and A17.2, the
equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.
