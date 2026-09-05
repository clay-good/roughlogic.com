# roughlogic.com Specification v1749 -- Laboratory Air Change Rate and Containment Pressure (`calc-cross.js`, Group C HVAC, laboratory, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; cross-trade gap fills), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A laboratory is kept negative to the corridor so that air flows in rather than out, and the offset between supply and exhaust is what creates it. It is a small number in a large airflow, which is why laboratory pressure relationships drift.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive room volume, air change rate, or airflow, or a supply exceeding exhaust where a negative relationship is required returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the air change and pressure offset relations with ANSI/AIHA Z9.5 and the institution chemical hygiene plan named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lab air change rate`, `laboratory negative pressure offset`, `room pressure relationship lab`, `vav hood supply tracking`, `lab pressure monitoring`.

## 2. The tile

### 2.1 `lab-containment-pressure` -- Laboratory Air Change Rate and Containment Pressure

```
air change rate    from the hazard and the applicable standard; commonly 6 to 12 ACH
                   occupied, sometimes lower unoccupied
airflow            CFM = volume x ACH / 60
pressure offset    exhaust exceeds supply by a modest amount, commonly 5 to 15% or a
                   fixed cfm, to hold the room negative
differential       commonly 0.01 to 0.05 in wc relative to the corridor
door undercut      the offset flows in through the door undercut and any transfer path
                   (`door-undercut-transfer-air`)
hood interaction   a VAV hood's exhaust changes with sash position; the supply must
                   track it or the pressure relationship breaks
drift              filters loading, dampers moving, and the building's own pressure all
                   move the relationship; continuous monitoring is what catches it
```

The offset is a small difference between two large numbers, and that is why laboratory pressure relationships
are fragile. A room exhausting 1,300 cfm and supplied 1,200 holds its 100 cfm offset only as long as both numbers
hold, and a supply filter loading, a damper drifting, or a hood sash moving changes one of them by more than the
offset itself. That is why laboratory pressure is monitored continuously rather than commissioned once.

The hood interaction is the design problem. A variable air volume hood's exhaust swings with sash position by
hundreds of cfm, and the room's supply has to track it to preserve the offset -- so the control system, not the
balance, is what maintains the pressure relationship, and a VAV laboratory with a supply that does not track is
positive to the corridor whenever a sash closes.

The direction matters and it is not always negative. Most chemical laboratories are negative so contaminants stay
in; some laboratories -- clean rooms, certain biological facilities, pharmacy compounding areas -- are positive so
contamination stays out, and some are both at different points in a suite. Getting the direction wrong is not a
degree of error, it is the opposite of the intent, and it is a design decision made from the hazard rather than a
convention.

Air change rate is the other requirement and it is not the same as the pressure offset: a room can hold its
pressure relationship perfectly and be under-ventilated, or be well ventilated and positive to the corridor.

**Inputs:** the room volume, the required air change rate, the total hood and general exhaust, the supply airflow, the required pressure offset and differential, and the door undercut free area

**Outputs:** the airflow for the entered air change rate, the exhaust and supply totals, the offset in cfm and as a percentage, the resulting pressure differential estimate for the entered transfer path, whether the relationship is the intended direction, and the offset that a stated VAV hood swing would disturb

## 3. Worked example

A laboratory of 9,600 cu ft requiring 8 air changes per hour:

```
airflow = 9,600 x 8 / 60 = 1,280 cfm
```

If the hoods exhaust 1,200 cfm and general exhaust adds 80, total exhaust is 1,280 -- above the
1,280 cfm the air change rate requires, so the hoods govern the ventilation rate. Supply is set to hold the
room negative:

```
supply = 1,280 - 100 = 1,180 cfm
offset = 100 cfm, about 8 percent
```

**A 100 cfm offset inside a 1,280 cfm exhaust.** That is the fragility: a supply filter loading by 10 percent
moves the supply by 118 cfm, which is more than the entire offset, and the room goes positive to the corridor
with nothing visibly wrong.

**The VAV hood swing is larger still.** A sash closing takes hood exhaust from 1,200 to perhaps 400 cfm -- an 800
cfm change. If the supply does not track it, the room is 700 cfm positive, and contaminants flow out to the
corridor. **The control system, not the balance, is what holds the relationship**, and a VAV laboratory whose
supply does not track its hoods is positive whenever a sash closes.

**The offset flows in through the door undercut.** From `door-undercut-transfer-air`, 100 cfm through a 36 in
door needs roughly 0.33 sq ft of free area at a reasonable velocity -- a 1.3 in undercut. A tightly weatherstripped
door starves the offset and the differential goes deep without the flow following, which reads as a good pressure
reading and a room that is not actually being swept.

**And the direction is a hazard decision.** Most chemical laboratories are negative. Clean rooms and some
biological and pharmacy areas are positive. Getting it backwards is not an error of degree.

## 4. Scope and non-goals

An airflow and offset calculation. Required air change rates, pressure differentials, and the direction of the
pressure relationship are set by the applicable standard, the institution's chemical hygiene plan, and for
biological and pharmacy facilities by their own governing standards -- and they differ substantially between
laboratory types. It does not compute the pressure differential from the offset, which depends on the room's total
leakage and cannot be predicted from airflow alone; measurement is what establishes it. It does not design the
control system, which is what maintains the relationship in a variable air volume laboratory and which is where
these systems succeed or fail. It does not address the containment performance of the hoods themselves
(`fume-hood-face-velocity`), the exhaust discharge and re-entrainment, emergency power, or the monitoring and
alarm requirements. ANSI/AIHA Z9.5, the applicable biosafety or compounding standard where it governs, the
institution's chemical hygiene plan, and the design engineer govern.
