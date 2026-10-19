# roughlogic.com Specification v1986 -- Foundation Drainage Grade Check (IRC R401.3) (`calc-construction.js`, Group E Carpentry and Construction, landscaping, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the IRC code-check bench in `calc-construction.js`, serving the landscaper,
> the waterproofer and the home inspector, no new dependency and no network call.
>
> **The gap.** The catalog has `slope` for drain pipe, `ramp-slope` for the ADA, `contour-slope` for a map and
> `slope-from-level` for a digital level, and nothing for the one slope every wet basement starts with: the ground
> against the foundation. R401.3 asks for 6 in of fall in the first 10 ft, and 2 percent on a patio or walk within 10
> ft of the house; a landscaper with a 4 ft level and a tape can check it in a minute if the arithmetic is in front
> of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive run,
a negative fall, or a run over 100 ft returns `{ error }`. Citation: IRC 2024 R401.3 by name (the 6 in in 10 ft rule,
its exception for barriers, and the 2 percent rule for impervious surfaces), free at codes.iccsafe.org,
GOVERNANCE.general. Aliases: `grade away from foundation 6 inches in 10 feet`, `slope away from house`, `R401.3
drainage grade`, `patio slope away from house 2 percent`, `how much fall in 10 feet from the foundation`.

## 2. The tile

### 2.1 `foundation-grade-slope-check` -- Foundation Drainage Grade Check (IRC R401.3)

```
pervious ground   the grade falls at least 6 in within the first 10 ft from the
                  foundation wall: 5 percent, 0.6 in per ft
measured          slope = fall / run; fall available over the first 10 ft = fall x
                  min(10, run) / run when the measurement is over a shorter run
short run         where a lot line, wall, slope or other barrier stops the 10 ft, the
                  exception allows a drain or swale instead; the tile reports the fall
                  achieved in the run available and the shortfall against 6 in
impervious        a patio, walk or drive within 10 ft of the foundation slopes at least
surface           2 percent away: 0.24 in per ft; fall needed = 0.02 x width
level reading     from a level of length L and a bubble offset or a digital reading,
                  slope = rise / L (slope-from-level does the digital case)
```

Water that lands beside a house has to leave, and the code's answer is a 5 percent grade for 10 ft. The tile checks
it from the two numbers a tape gives: the fall and the run it was measured over. A 4 in drop over 10 ft is 3.3
percent and 2 in short; an 8 in drop is 6.7 percent and passes with 2 in to spare. Measured over a shorter run the
tile scales to the first 10 ft, and where the run is short because something is in the way it names the exception
rather than failing the lot.

A patio or walk is held to a different number, 2 percent, because it sheds everything that lands on it and a 5
percent slab is uncomfortable. An 8 ft wide patio needs 1.92 in of fall across it; a 12 ft drive apron needs 2.88 in.

**Inputs:** the surface (pervious ground or impervious surface), the fall measured, the run it was measured over, and
whether a barrier stops the 10 ft short

**Outputs:** the slope in percent and inches per foot, the fall required over the run entered and over the first 10
ft, the shortfall or margin, pass/fail, and the exception sentence when a barrier is declared

## 3. Worked example

Pervious ground, 4 in of fall measured over 10 ft, no barrier:

```
slope     = 4 / (10 x 12) = 3.3 percent = 0.40 in per ft
required  = 6 in in the first 10 ft (5.0 percent)
measured  = 4 in in 10 ft
shortfall = 2 in            FAIL: regrade, or add 2 in of fall
```

**Eight inches over 10 ft is 6.7 percent and passes.** Three inches over a 6 ft run stopped by a property wall is 4.2
percent, 0.6 in short of the 3.6 in the 5 percent grade needs in 6 ft; the barrier exception applies, and a swale or
drain is the code's answer. An 8 ft patio needs 0.02 x 96 = 1.92 in of fall away from the house.

## 4. Scope and non-goals

A check against the code's grade, not a drainage design. It does not size a swale, French drain or footing drain
(R405), evaluate soil, downspout discharge or roof runoff, check crawl-space or basement waterproofing
(`foundation-waterproofing-takeoff`), or address local amendments that ask for more. The adopted edition and the AHJ
govern; free at codes.iccsafe.org.
