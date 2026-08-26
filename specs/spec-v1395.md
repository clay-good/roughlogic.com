# roughlogic.com Specification v1395 -- Slope Stake Catch Point (calc-survey.js, Group P, field, survey, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P, field, survey, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P has differential leveling, traverse closure, and grade-to-ground reduction, but the everyday grading-crew calculation -- where the design slope daylights into existing ground -- is not there. The flat-ground version is trivial and wrong; the real one has to account for the cross slope of the ground, which is what moves the stake.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive half-width, side-slope ratio, or vertical offset, or a ground cross slope that equals the inverse of the side-slope ratio (the slope never catches), returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the slope-stake catch-point geometry with a sloping original ground surface (standard highway construction staking), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `slope-staking` -- Slope Stake Catch Point

```
d = half-width + H x s / (1 - s x g)

H = cut or fill depth at the hinge point
s = side-slope ratio (run per unit rise, so 2 for a 2:1 slope)
g = ground cross slope (rise per run, positive when the ground rises away from centerline)
vertical at catch = H + g x (d - half-width)
```

The design slope leaves the hinge point at the shoulder and runs out at its ratio until it meets the ground. If
the ground were level, the catch would be a half-width plus depth times the ratio and no tile would be needed.
The ground is never level, and a cross slope that rises away from the centerline pushes the catch point *farther*
out on a cut -- the ground is climbing toward the slope while the slope is climbing toward the ground, so they
take longer to meet.

The denominator carries the whole correction, and it also carries the warning. As `s x g` approaches 1 -- a ground
cross slope as steep as the design side slope -- the denominator goes to zero and the slope never catches at all.
That is a real condition on side-hill work, and the answer is a retaining structure or a slope change, not a
longer tape.

**Inputs:** roadway or pad half-width (ft), cut or fill depth at the hinge (ft), side-slope ratio, ground cross
slope, and whether the section is cut or fill.

**Outputs:** distance from centerline to the catch point, vertical distance from the hinge to the catch, the
slope-stake marking (distance out and cut or fill at the stake), and the flat-ground distance for comparison.

## 3. Worked example

A 24 ft roadway (12 ft half-width) in a 6 ft cut at the hinge, 2:1 side slopes, ground rising away from centerline
at 10%:

```
d = 12 + 6 x 2 / (1 - 2 x 0.10) = 12 + 12/0.80 = 12 + 15.0 = 27.0 ft out
vertical at catch = 6 + 0.10 x 15.0 = 7.5 ft
check the ratio: 15.0 / 7.5 = 2.0                    the slope is right
flat-ground answer would have been 12 + 12 = 24.0 ft
```

Three feet of difference on a 10% cross slope, and it grows fast: at 20% cross slope the same section catches at
32.0 ft, eight feet past the flat-ground answer. At 50% cross slope, `s x g = 1.0` and the 2:1 cut slope runs
parallel to the ground -- it never daylights, and the section has to be redesigned.

## 4. Scope and non-goals

A single-section, straight-cross-slope calculation. Real ground is not a plane, so the catch is found by trial in
the field -- the crew sets a stake, measures the actual ground at that offset, recomputes, and moves in or out
until it closes. This tile does the arithmetic for one iteration of that loop. It does not handle benched slopes,
compound slopes, ditches, transitions, superelevation, or the difference between the template and the finished
subgrade. It does not stake, and it is not a substitute for the plan set. The engineer's plans, the grade sheet,
and the party chief govern.
