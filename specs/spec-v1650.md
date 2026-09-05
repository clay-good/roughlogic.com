# roughlogic.com Specification v1650 -- Elevator Suspension Rope Factor of Safety (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Elevator suspension ropes carry people, and their factor of safety is checked against the total suspended load with a minimum that rises with car speed. Like a mine hoist, the ropes' own weight is part of the load and is the term most often dropped.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rope breaking strength, count, or suspended load, or a rope length at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the suspended-load factor of safety with ASME A17.1 speed-dependent minimums and rope retirement criteria named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator rope factor of safety`, `suspension rope safety factor`, `a17.1 rope fs`, `hoist rope weight elevator`, `rope retirement broken wires elevator`.

## 2. The tile

### 2.1 `rope-safety-factor` -- Elevator Suspension Rope Factor of Safety

```
total suspended load  W = car + rated load + travelling cable + rope weight below the sheave
factor of safety      FS = (number of ropes x breaking strength) / W
minimum FS            set by ASME A17.1 as a function of rope speed; higher speeds
                      require higher factors
rope weight           length x weight per foot x number of ropes; significant on a tall rise
retirement            by broken wires per lay, diameter reduction, and other criteria
                      independent of the calculated factor of safety
```

The factor of safety required rises with speed because a faster car imposes higher dynamic loads and because
the consequences of a failure scale with it. So a rope set entirely adequate for a slow freight elevator can be
below the requirement for a high-speed passenger car, and the applicable minimum comes from the code's table
against the actual contract speed.

Rope weight is the term that grows with the building. On a low rise it is a footnote; on a high-rise installation
the suspension ropes hanging below the sheave can be a substantial fraction of the total suspended load, and it
is carried at the top where the factor is checked. That is also why compensation exists -- to offset the shifting
rope weight as the car travels -- and why an installation without it sees a different load at the top and bottom
of its run.

The retirement criteria are the part that actually removes ropes from service. Broken wires per rope lay,
reduction in diameter, corrosion, and distortion each condemn a rope regardless of what the arithmetic says, and
the inspection is performed on a mandated schedule by a qualified person. A rope set with a comfortable
calculated factor and a failing broken-wire count comes out.

**Inputs:** car weight, rated load, travelling cable weight, rope count, size, weight per foot and breaking strength, the travel and rise, the contract speed, and the code minimum factor of safety for that speed

**Outputs:** the rope weight at the worst position, the total suspended load, the factor of safety, the code minimum for the entered speed, the margin, and the rated load or rise at which the factor reaches the minimum

## 3. Worked example

A 5-rope installation on a 220 ft rise, ropes at 0.68 lb/ft each, car 12,000 lb, rated load 3,500 lb,
travelling cable 200 lb, each rope breaking at 17,900 lb:

```
rope weight    = 5 x 220 x 0.68           = 748 lb
suspended load = 12,000 + 3,500 + 200 + 748 = 16,448 lb
breaking       = 5 x 17,900                = 89,500 lb
FS             = 89,500 / 16,448   = 5.44
```

FS 5.44, against a code minimum that depends on the contract speed -- higher speeds
demand more.

**Leaving the rope weight out** gives `89,500 / 15,700` =
5.70 -- which looks better than the truth by
0.26. On this modest rise the difference is small; on a 700
ft rise the rope weight would be `5 x 700 x 0.68` = 2,380 lb and the factor would fall to
4.95, which is a different conversation entirely.

And separately: a rope set with this factor still comes out of service if the broken-wire count, diameter
reduction, or corrosion criteria are met. The arithmetic does not extend a rope's life.

## 4. Scope and non-goals

A static factor-of-safety calculation. It does not model dynamic loads from acceleration, emergency stops,
safety application, or buffer engagement, all of which exceed the static load and which the code's factors are
partly there to cover. It does not evaluate traction, sheave groove pressure, or the bending fatigue that
actually determines rope life through the sheave diameter to rope diameter ratio. It does not perform the
statutory rope inspection: broken wires per lay, diameter reduction, corrosion, distortion, and the equalization
of tension between ropes are the criteria that retire a rope, they are assessed by a qualified person on a
mandated schedule, and a passing factor of safety does not extend a rope's service. It does not address governor
ropes, compensation, or the suspension means on machine-room-less and belt-suspended installations, which follow
different provisions. Elevator equipment is life-safety: ASME A17.1 and A17.2, the equipment manufacturer, the
elevator authority having jurisdiction, and a licensed elevator mechanic govern.
