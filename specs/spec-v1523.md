# roughlogic.com Specification v1523 -- Mine Hoist Rope Factor of Safety and Duty (`calc-mining.js`, Group E Carpentry and Construction, underground, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A hoist rope carries people, and its factor of safety is checked against a load that includes the rope's own weight -- which on a deep shaft is a large share of the total and is the term most often left out. The check is a division, and the rope is also on a mandatory retirement schedule that no factor of safety overrides.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rope breaking strength, rope length, or weight per foot, or a negative payload or conveyance weight returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the suspended-load factor-of-safety relation with MSHA hoisting requirements and rope retirement criteria named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hoist rope factor of safety`, `mine hoist rope safety factor`, `shaft rope suspended load`, `personnel hoisting rope fs`, `rope retirement broken wires`.

## 2. The tile

### 2.1 `hoist-rope-safety-factor` -- Mine Hoist Rope Factor of Safety and Duty

```
total suspended load  W = conveyance + payload + rope weight below the sheave
factor of safety      FS = total breaking strength / W
statutory minimum     varies by service and depth; personnel hoisting carries the highest
rope weight           w_rope = length x weight per foot x number of ropes
retirement            by broken wires per lay, diameter loss, corrosion, or elapsed time
```

On a shallow shaft the rope's own weight is a footnote; on a deep one it can exceed the payload, and because
it hangs from the sheave the whole of it is carried at the top where the factor of safety is checked. A
calculation that includes cage and people but not rope produces a comfortable-looking number that is simply
wrong, and it is wrong in the unsafe direction and by more as the shaft gets deeper.

The second half matters more in practice. A rope with an adequate factor of safety can still be due for
retirement, because ropes are retired on CONDITION and on TIME rather than on calculated stress: broken wires per
rope lay, loss of diameter, corrosion, distortion, and in many jurisdictions a maximum service life regardless of
condition. A hoist rope that passes this arithmetic and fails the broken-wire count comes out of service, and no
factor of safety argument changes that. The tile reports both so the two are never confused.

**Inputs:** conveyance weight, payload, rope length, weight per foot and number of ropes, the rope breaking strength, the service type (personnel or material), and the statutory minimum factor of safety

**Outputs:** the rope weight, the total suspended load with the rope share shown as a percentage, the factor of safety, the margin against the entered statutory minimum, the maximum payload at that minimum, and the depth at which the factor of safety reaches the limit

## 3. Worked example

A four-rope friction hoist, 1400 ft of rope at 1.8 lb/ft per rope, cage 4,200 lb, eight people at
180 lb each, each rope breaking at 128,000 lb:

```
rope weight   = 4 x 1400 x 1.8   = 2,520 lb
payload       = 8 x 180            = 1,440 lb
total load    = 4,200 + 1,440 + 2,520 = 8,160 lb
rope share of load                 = 31%
breaking      = 4 x 128,000       = 512,000 lb
FS            = 512,000 / 8,160    = 62.7
```

FS 62.7. The rope is **31% of the suspended load** -- leaving it out would have given
`512,000 / 5,640` = 90.8, which looks far safer than the truth and is the error this
tile exists to prevent.

Double the shaft depth to 2,800 ft and the rope weight doubles to 5,040 lb, total load becomes
10,680 lb, and the factor of safety falls to 47.9 for the same cage and
the same eight people. Depth, not payload, is what consumes the margin.

## 4. Scope and non-goals

A static factor-of-safety calculation. It does not model dynamic loads from acceleration, deceleration,
emergency braking, or shock, all of which add substantially and which the statutory factors are partly there to
cover; it does not evaluate friction hoist traction (whether the ropes will slip on the drive sheave, which is a
separate and governing check on a Koepe installation), rope stretch, sheave and drum diameter-to-rope-diameter
ratios and their effect on rope life, attachments and terminations, or the brake system. It does not perform the
statutory rope inspection: broken wires per lay, diameter reduction, corrosion, distortion, and maximum service
life are the criteria that actually retire a rope, they are checked by a competent person on a mandated schedule,
and a passing factor of safety does not extend a rope's life by one day. Hoisting people is among the most
heavily regulated activities in mining: MSHA, the applicable ASME and state hoisting requirements, the hoist and
rope manufacturers, and the mine's hoisting plan govern.
