# roughlogic.com Specification v1556 -- Gin-Pole and Uptower Component Lift Load (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Changing a gearbox component 300 ft up is done with a gin pole or a davit mounted to the nacelle, and the load it imposes is not just the part's weight -- the pole is a lever working against its own mounting, and the reaction into the structure is what governs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load or pole length, or a line angle at or beyond ninety degrees from vertical returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the single-line rigging statics with the turbine manufacturer lifting provisions named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`gin pole load turbine`, `uptower lift rigging`, `nacelle davit capacity`, `tower crane alternative lift`, `uptower component change`.

## 2. The tile

### 2.1 `gin-pole-uptower-lift` -- Gin-Pole and Uptower Component Lift Load

```
line pull        T = W / cos(theta)      (theta the line's angle from vertical)
pole compression C = W + T cos(alpha)     (the pole carries the load plus its own line)
mount reaction   the moment at the base is T x the offset from the mount
side load        T sin(theta) -- the horizontal component the mount must resist
wind             a suspended load adds wind area; a load and its swing are `wind-on-load`
```

A gin pole is a strut in compression with a line running over its head, and the two forces at the head -- the
load hanging on one side and the hoist line pulling on the other -- combine into a resultant that the pole carries
axially and a moment that the mount carries. That mount is the part that fails: it is a bracket bolted to a
casting or a frame that was designed for it, and the reaction depends on geometry the crew sets in the field
rather than on anything the manufacturer fixed.

The angle is the lever. A line hauled at an angle off vertical raises the tension above the weight by
`1/cos(theta)`, and it does so quickly: fifteen degrees is only 3.5% but forty-five degrees is 41%. On an
uptower lift the crew has limited control over that angle because the ground rigging is 300 ft below and the
wind is moving the load, which is why uptower lifts have tight wind limits.

The tile's field job is the same as any rigging check: the load, the resulting line pull, and whether the
mounting rating covers the reaction. Everything above that -- the specific davit, its rated capacity, the bolt
pattern -- belongs to the turbine manufacturer.

**Inputs:** component weight including rigging, the line angle from vertical, the pole or davit geometry and mounting offset, the mounting rated capacity, and the wind speed with the load area

**Outputs:** the line pull, the pole axial compression, the horizontal side load, the moment at the mounting, the margin against the entered mounting rating, and the maximum load the mounting supports at the entered geometry

## 3. Worked example

A 3,800 lb component (including rigging) hauled with the line 15 degrees off vertical:

```
line pull  = 3,800 / cos(15 deg) = 3,800 / 0.9659 = 3,934 lb
side load  = 3,934 x sin(15 deg)  = 1,018 lb horizontal
```

3,934 lb in the line for a 3,800 lb part -- 134 lb of it bought purely by the angle. The
1,018 lb horizontal component is what the mounting has to resist, and it is the
number a bracket rating has to cover.

Let the angle grow, which is what wind and a swinging load do:

```
25 deg -> line pull 4,193 lb, side load 1,772 lb
40 deg -> line pull 4,961 lb, side load 3,189 lb
```

At forty degrees the side load has more than tripled. That is why the wind limit on an uptower lift is low and
why tag lines matter more here than on the ground -- there is no way to correct a swinging load 300 ft up.

## 4. Scope and non-goals

A statics screen for a single-line lift at one geometry. It does not design or rate a gin pole, davit, or its
mounting: the turbine manufacturer supplies the uptower lifting provisions with their rated capacities, allowable
geometries, and permitted wind speeds, and those ratings govern absolutely. It does not evaluate the pole in
buckling, the mounting bolts, the nacelle structure the mount attaches to, or the hoist and its rigging. It does
not model dynamic amplification from starting and stopping the hoist, which on a long line is significant, or the
wind load and swing on a suspended component (`wind-on-load` and `max-wind-for-swing`). It does not address rescue
and personnel arrangements. Uptower lifting is a fall-and-dropped-object hazard at height: the turbine
manufacturer's service instructions and rated lifting provisions, the site lift plan, a qualified rigger, and
OSHA govern.
