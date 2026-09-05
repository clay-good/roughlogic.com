# roughlogic.com Specification v1651 -- Elevator Buffer Stroke and Impact Speed (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A buffer at the bottom of a hoistway has to stop a descending car without hurting anyone in it, and the stroke it needs comes from the impact speed and the deceleration a person can take. Speed is squared in that relation, which is why fast cars need long buffers or oil ones.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive impact speed or retardation, or a stroke at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the buffer stroke relation and the ASME A17.1 retardation limits by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator buffer stroke`, `oil buffer sizing`, `spring buffer speed limit`, `buffer impact speed governor`, `retardation 1 g elevator`.

## 2. The tile

### 2.1 `buffer-stroke-speed` -- Elevator Buffer Stroke and Impact Speed

```
impact speed      the governor tripping speed, not the contract speed
spring buffer     stroke from the impact speed; permitted only up to a stated car speed
oil buffer        stroke s = v^2 / (2 a), with a the average retardation
retardation       limited to 1 g average, with a short-duration peak limit
free fall         s = v^2 / 2g gives the stroke for a 1 g average retardation
implication       stroke grows with the SQUARE of speed; doubling speed quadruples it
```

The square law is what separates buffer types. A slow car striking a buffer at a modest speed needs a short
stroke and a spring will do; double the speed and the stroke required quadruples, which quickly exceeds what a
spring can practically provide and pushes the design to an oil buffer that dissipates the energy rather than
storing it. The code reflects this by permitting spring buffers only up to a stated car speed.

The speed that matters is not the contract speed. A car reaching the buffer has already overspeeded past the
governor's mechanical trip, so the buffer is sized on the governor tripping speed -- which is why raising a
governor's setting invalidates a buffer selection made beneath it, and why the two are designed as a pair.

The retardation limit is a human limit rather than a structural one. The buffer could stop the car in a much
shorter distance and the code does not allow it, because the occupants have to survive the stop -- an average of
1 g with a bounded peak, which is what sets the stroke. That is also why an oil buffer's orifice profile matters:
a buffer that stops the car in the right distance but with a spike at the start of the stroke fails the peak
criterion even though the average is correct.

**Inputs:** contract speed, the governor mechanical tripping speed, the buffer type, the buffer rated stroke and rated speed, and the permitted average retardation

**Outputs:** the impact speed in fps, the stroke required at the entered retardation, the stroke at a 1 g average, the buffer rated stroke against the requirement, the retardation the installed buffer imposes at the impact speed, and the speed at which the installed buffer reaches the retardation limit

## 3. Worked example

A 500 fpm car whose governor trips mechanically at 575 fpm:

```
impact speed = 575 fpm = 9.58 ft/s
stroke at 1 g = v^2 / (2 x 32.174) = 91.84 / 64.35 = 1.427 ft = 17.1 in
```

About 17.1 in of stroke at a 1 g average retardation.

**Now double the car speed** to 1,000 fpm, tripping at 1,150 fpm:

```
impact = 19.17 ft/s
stroke = 68.5 in
```

68.5 in -- **four times the stroke for twice the speed**, which is the square law
and which is why spring buffers run out of applicability quickly and oil buffers take over.

The dependency worth carrying: this stroke was computed from the GOVERNOR tripping speed. Raise the governor's
setting by 10 percent to stop nuisance trips and the required stroke rises by
21% -- so the buffer that was correct is now short, and the change that seemed like a governor
adjustment has invalidated equipment two floors below.

## 4. Scope and non-goals

A kinematic stroke calculation. Buffer selection is governed by ASME A17.1, which sets the permitted buffer
types by car speed, the required strokes, the retardation limits including a bounded peak in addition to the
average, and the testing requirements; the code's tables and the buffer manufacturer's rated stroke and speed
govern rather than this calculation. Oil buffers have a rated striking speed and a rated load range, and applying
one outside that range does not produce the rated retardation. It does not address counterweight buffers, which
are sized separately, the pit depth and clearances the buffer arrangement requires, or buffer support and
mounting. It does not address the governor setting (`governor-tripping-speed`) that determines the impact speed,
or the safeties that should have stopped the car before it reached the buffer. This is a life-safety system: ASME
A17.1 and A17.2, the buffer manufacturer's ratings, the elevator authority having jurisdiction, and a licensed
elevator mechanic govern.
