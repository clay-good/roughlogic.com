# roughlogic.com Specification v1545 -- Turnout Frog Number, Lead, and Closure Geometry (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A turnout is described by its frog number, and that single number sets the frog angle, the diverging speed, and how much track the turnout consumes. Laying one out, or checking whether one fits, starts with converting the number into an angle and a length.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a frog number below one, or a non-positive distance when computing separation returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the frog-number geometry relations with 49 CFR 213 and the railroad standard plans named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`turnout frog number angle`, `frog angle from number`, `turnout clearance point`, `switch geometry railroad`, `diverging track separation`.

## 2. The tile

### 2.1 `turnout-frog-lead` -- Turnout Frog Number, Lead, and Closure Geometry

```
frog angle       F = 2 arcsin( 1 / (2 N) )      (exact); approximately 1/N in radians
diverging speed  rises with frog number; a higher number is a flatter, faster turnout
lead             the distance from the point of switch to the half-inch point of frog
                 (from the railroad standard plan for that turnout, not a formula)
offset at a point  a diverging track separates at roughly 1/N per unit of distance
clearance point  where the two tracks are far enough apart to occupy both safely
```

The frog number is a slope: a number 10 frog spreads one unit sideways for every ten units along, which makes
the angle a shade under six degrees. Higher numbers are flatter, faster, and longer, and that length is the
practical constraint -- a number 20 turnout is a great deal of track, which is why yards use low numbers and main
line crossovers use high ones.

The number a track crew actually needs on the ground is the separation at a distance: how far from the frog do
the two tracks stand apart by a given amount. That is what locates the clearance point, which is where a car may
stand on the diverging track without fouling the main, and getting it wrong is how a car gets sideswiped. The
approximate rule -- separation grows by about 1/N per foot beyond the frog -- is good enough to find it with a
tape.

Lead and the other layout dimensions come from the railroad's standard plan for that turnout and are not
computed here; they depend on switch point length, closure curve, and the specific design.

**Inputs:** frog number, the distance beyond the frog for a separation check, the required separation at the clearance point, and the lead and other dimensions from the standard plan for comparison

**Outputs:** the frog angle in degrees and as a ratio, the separation at any stated distance beyond the frog, the distance to a required separation (the clearance point), and the approximate diverging speed band for the frog number

## 3. Worked example

A number 10 turnout:

```
frog angle = 2 x arcsin( 1 / (2 x 10) ) = 5.732 degrees = 343.9 minutes
slope                                    = 1 in 10
```

Just under six degrees. Now the field question: where is the clearance point, taking 13 ft between track centres
as the requirement?

```
distance beyond the frog ~ 13 x 10 = 130 ft
```

About 130 ft past the frog. On a number 20 turnout the same requirement puts the clearance point
260 ft out -- more than twice as far -- which is exactly why high-number turnouts consume so much real
estate and why a yard track built with them runs out of room.

The reverse check a crew makes with a tape: standing 150 ft beyond the frog on this number 10 turnout, the
tracks are about `150 / 10` = 15 ft apart, which is short of 13 ft -- so a car standing there is
fouling.

## 4. Scope and non-goals

Frog angle and approximate separation geometry. It does not lay out a turnout: lead, switch point length,
closure curve radius, guard rail and frog dimensions, and tie spacing all come from the railroad's standard plan
for the specific turnout design, and no formula substitutes for that plan. The separation relation is a
straight-line approximation that ignores the closure curve and is adequate for locating a clearance point with a
tape but not for design. It does not determine diverging speed, which is set by the railroad and by the turnout
design rather than by frog number alone, and it does not address turnout geometry limits, switch point condition,
guard rail check gauge, or frog wear -- all of which are inspected under their own criteria. It does not evaluate
turnouts in curved track, which have their own geometry entirely. The railroad's standard plans, the FRA Track
Safety Standards at 49 CFR 213 including the turnout and crossing requirements, and the track owner govern.
