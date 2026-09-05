# roughlogic.com Specification v1597 -- Directional Bore Minimum Bend Radius and Entry Angle (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Every bore path has a minimum bend radius, and it is set by whichever is tighter: the drill rod's own limit or the product pipe's. Designing a path on the rod's radius and then pulling a steel pipe through it is how a bore succeeds and the product fails.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe diameter or radius, or an entry angle at or beyond ninety degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the pipe and rod minimum bend radius conventions with ASTM F1962 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hdd bend radius`, `minimum bend radius drill path`, `entry angle hdd`, `sag bend length bore`, `steel pipe bend radius 100d`.

## 2. The tile

### 2.1 `hdd-bend-radius` -- Directional Bore Minimum Bend Radius and Entry Angle

```
drill rod         minimum radius from the rod manufacturer, commonly 100 to 150 ft
steel pipe        R_min = the radius at which bending stress stays within the allowable
                  a common rule is R = 100 x D (D in inches, R in feet)
HDPE              far more flexible; bend radius typically 20 to 40 times the OD
governing         the LARGEST of the rod, the product pipe, and any casing
entry angle       8 to 16 degrees typical; steeper entry needs more depth to flatten out
sag bend length   the horizontal distance consumed turning from entry angle to level
```

The rule that matters on a job is that the pipe, not the rig, usually sets the radius -- and by a lot. A 12 inch
steel pipe wants roughly a 1,060 ft radius, where the drill rod may be happy at 150 ft. A path laid out on the
rod's capability will bend the steel past its allowable stress during pullback, and the damage is not always
visible.

The consequence people underestimate is how much horizontal distance a large radius consumes. Turning from a
12 degree entry to horizontal on a 1,000 ft radius takes over 200 feet of horizontal run and puts the bore
deeper than a short-radius path would -- so the bend radius decides the entry setback, the depth under the
crossing, and often whether the bore fits between the obstacles at all.

HDPE is the opposite case and it is why HDPE dominates smaller bores: a 12 inch HDPE pipe bends comfortably on a
radius of 20 to 40 feet, so the rod becomes the constraint again and the path can be much tighter.

**Inputs:** product pipe diameter and material, the drill rod minimum radius, the entry and exit angles, the required depth under the crossing, and the available setback

**Outputs:** the minimum radius for the rod, the product pipe, and the governing value; the horizontal distance consumed by the sag bend at the entry angle; the depth reached at the end of the sag; and the total bore length for the crossing

## 3. Worked example

A 12.75 in steel product pipe. The 100 x D rule gives:

```
R_min = 100 x 12.75 in = 1,275 in = 106 ft
```

**106 ft radius**, against a drill rod that might allow 150 ft. The pipe governs by a factor of seven.

Now what that costs in layout. Entering at 12 degrees and flattening to horizontal on that radius:

```
horizontal run = R x sin(12 deg) = 106 x 0.2079 = 22 ft
depth gained   = R x (1 - cos(12 deg)) = 106 x 0.02185 = 2.3 ft
```

The sag bend alone consumes 22 ft of horizontal distance and only reaches
2 ft deep. A crossing needing 25 ft of cover requires a steeper entry, a
longer approach, or a deeper profile -- and the setback on both sides has to accommodate it.

The same pipe in HDPE at a 30 x OD radius bends on `30 x 12.75/12` = 32 ft, and the entire layout problem
disappears. That is the argument for HDPE on a constrained site, and it is a bend-radius argument rather than a
cost one.

## 4. Scope and non-goals

A geometric screen using radius limits the user supplies. The 100 x D rule for steel is a common convention and
not a stress calculation; the actual allowable radius depends on the pipe's grade, wall thickness, and the
combined loading from bending, tension, and external pressure during pullback, and a fitness-for-purpose check
against those combined stresses is what a designed bore uses. Rod bend radius is manufacturer and size specific.
It does not design a bore path, which must also satisfy depth of cover, clearance to existing utilities and
structures, geology, and the exit location, and it does not evaluate whether the path is drillable in the ground
present. It does not compute pullback force (`hdd-pullback-force`) or annular pressure
(`hdd-annular-pressure`), both of which are affected by the profile chosen. ASTM F1962, the pipe and rod
manufacturers' limits, the geotechnical investigation, and the drilling contractor's engineer govern.
