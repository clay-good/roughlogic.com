# roughlogic.com Specification v1398 -- Slope and Grade from Contour Lines (calc-field.js, Group P, field, backcountry, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-field.js`**
> (Group P, field, backcountry, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P has avalanche slope-angle risk and hiking time but nothing that gets the slope angle off the map in the first place. Counting contours between two points and dividing by the scaled horizontal distance is how every route, every fire line, and every search segment gets its slope, and it is not in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive contour interval, interval count, or map distance, or a representative fraction at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the contour-interval rise-over-run relation and its conversion to percent grade, degrees, and slope ratio, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `contour-slope` -- Slope and Grade from Contour Lines

```
rise            = contour interval x number of intervals crossed
horizontal run  = measured map distance x RF / 12
grade percent   = rise / run x 100
slope angle     = atan(rise / run)
slope ratio     = run / rise, expressed as "run : 1"
slope distance  = sqrt(run^2 + rise^2)
```

Count the contour lines a route crosses, multiply by the interval, and that is the rise. Scale the map distance
and that is the run. Everything else is one arctangent. The tile reports the answer four ways because four
different trades ask for it four different ways: a grading contractor wants percent, a hiker or an avalanche
forecaster wants degrees, an earthwork crew wants the ratio, and anyone estimating time or rope wants the actual
slope distance rather than the map distance.

The relationship between percent and degrees is worth having in front of you, because they diverge: 100% grade is
45 degrees, not 90, and the 30 degrees that matters most to an avalanche forecaster is a 58% grade. Reading one
scale as if it were the other is a genuine safety error in steep terrain.

**Inputs:** contour interval (ft), number of intervals crossed, measured map distance (in), representative
fraction; or a rise and run entered directly.

**Outputs:** rise, horizontal run, grade percent, slope angle in degrees, slope ratio, and true slope distance.

## 3. Worked example

Five contour intervals crossed at 40 ft each on a 1:24,000 quad, over a map distance that scales to 1,300 ft:

```
rise          = 5 x 40                = 200 ft
run           = 1,300 ft
grade         = 200 / 1,300 x 100     = 15.4%
angle         = atan(200/1300)        = 8.75 deg
ratio         = 1,300 / 200           = 6.5 : 1
slope distance= sqrt(1300^2 + 200^2)  = 1,315.3 ft
```

Note how little the slope distance exceeds the map distance at this grade -- 15 feet out of 1,300, about 1%.
That stays true up to surprisingly steep ground: even at a 30% grade the slope distance is only 4.4% longer than
the map distance. It is elevation gain, not path length, that makes steep ground slow, which is exactly the
premise Naismith's rule is built on.

## 4. Scope and non-goals

The average slope between two points, which is not the steepest slope along the route -- a line crossing five
evenly spaced contours and a line crossing five bunched into a third of the distance give the same average and
very different ground. For avalanche, rockfall, or equipment-stability decisions the *maximum* local slope is what
matters, and that means measuring the tightest contour spacing, not the endpoints. Contour intervals vary between
map series and sometimes within a sheet; supplementary contours are drawn at a different interval. Contours are
generalized and are least reliable in exactly the terrain where slope matters most. The map and the person
standing on the ground govern.
