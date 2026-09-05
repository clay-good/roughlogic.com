# roughlogic.com Specification v1547 -- Locomotive Tonnage Rating on a Ruling Grade (`calc-rail.js`, Group J Trucking and Logistics, rail logistics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group J, Trucking and Logistics -- the existing category, hub `/groups/trucking/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** How much a locomotive can pull is set by the ruling grade, not by the flat, and the resistance arithmetic is two terms: grade resistance at twenty pounds per ton per percent, plus rolling resistance. Everything about train makeup follows from it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tractive effort or total resistance, or a negative grade, rolling resistance, or curvature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the 20 lb/ton per percent grade resistance and adhesion-limit relations as standard railroad practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`locomotive tonnage rating`, `ruling grade resistance`, `20 pounds per ton per percent`, `train resistance calculation`, `helper district tonnage`.

## 2. The tile

### 2.1 `tonnage-rating-grade` -- Locomotive Tonnage Rating on a Ruling Grade

```
grade resistance    R_g = 20 lb/ton per 1% of grade
rolling resistance  R_r = 3 to 5 lb/ton at speed on level, more at low speed
curve resistance    R_c ~ 0.8 lb/ton per degree of curve
total               R = 20 G + R_r + 0.8 D
tonnage rating      T = tractive effort / R
adhesion limit      TE cannot exceed adhesion x locomotive weight on drivers
```

Twenty pounds per ton per percent of grade is the number to carry: it is just the component of weight along the
slope, and it dwarfs everything else. On the level a train resists at three to five pounds per ton; put it on a
1% grade and grade resistance alone adds twenty, so a modest hill multiplies the required pull by a factor of
five. That is why the ruling grade -- the steepest sustained grade on the route, curve resistance included --
determines the tonnage rating for the whole run, and why a single short hill sets the makeup for hundreds of
level miles.

The second constraint is adhesion. A locomotive cannot deliver more tractive effort than friction between wheel
and rail allows, roughly 25 to 35% of the weight on its drivers with modern adhesion control and much less on wet
or contaminated rail. A tonnage rating that assumes tractive effort the locomotive cannot put down is a train
that stalls, and the fall-back on a rated hill is helpers or doubling the hill -- both of which are planned from
this arithmetic.

**Inputs:** available tractive effort, ruling grade, rolling resistance per ton, curvature on the ruling grade, locomotive weight on drivers, and the adhesion factor

**Outputs:** the grade, rolling, and curve resistance components and the total in lb/ton, the tonnage rating, the adhesion-limited tractive effort, whichever of the two governs, and the tonnage rating on an alternative grade

## 3. Worked example

A consist with 140,000 lb of tractive effort on a 1.2% ruling grade with 3 lb/ton rolling resistance
and a 3 degree curve on the hill:

```
grade resistance = 20 x 1.2       = 24 lb/ton
rolling                            = 3 lb/ton
curve            = 0.8 x 3         = 2.4 lb/ton
total                              = 29.4 lb/ton
tonnage rating   = 140,000 / 29.4   = 4,762 tons
```

About 4,762 tons over that hill. On level track with the same consist the resistance is only
`3 + 2.4` = 5.4 lb/ton and the same locomotives would move
25,926 tons -- **5.4 times as much**. The hill, not the railroad, sets
the train.

The adhesion check: to put down 140,000 lb at 30% adhesion the locomotives need
`140,000 / 0.30` = 466,667 lb on drivers. Four units at 420,000 lb each give 1,680,000 lb, comfortably
enough dry -- but at 18% adhesion on wet rail the same units deliver only
302,400 lb, and the tonnage rating falls to 10,286 tons.

## 4. Scope and non-goals

A steady-state resistance and rating calculation. It does not model acceleration, which requires additional
tractive effort proportional to the train's mass and to the rotating inertia of its wheels, or starting
resistance, which is much higher than running resistance and which is what actually decides whether a stopped
train on a grade can be restarted. Rolling resistance is speed-dependent and the Davis formula and its variants
give a better value than a single figure. It does not evaluate drawbar and coupler forces, which limit train
length independently of power and which govern on long trains and through curves, or in-train forces during
braking and slack action. It does not address distributed power, helper operation, or dynamic braking on the
descending side, which is often the governing constraint on a mountain grade rather than the ascent. The
railroad's tonnage ratings, timetable and special instructions, and operating rules govern.
