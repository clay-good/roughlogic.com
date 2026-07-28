# roughlogic.com Specification v1172 -- Knee and Toe Clearance (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 89 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1171.md.
>
> **The gap is self-declared.** `turning-clear-floor-space` (spec-v1170) names knee and toe clearance under
> 306 as a thing it does not check and that changes what counts as clear. A dupe scan for "knee clearance"
> and "toe clearance" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
underside height or clear width, or a negative knee or toe depth, return `{ error }`. Renderer: this
module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 306.2.1 through 306.2.5 and 306.3.1 through 306.3.5.
A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `knee-toe-clearance` -- Knee and Toe Clearance (306)

```
inputs:  apron_height_in, knee_depth_at_9_in, knee_depth_at_27_in, toe_depth_in, clear_width_in
compute: knee zone exists only where the underside is at or above 27 in
         knee depth >= 11 in at 9 in AND >= 8 in at 27 in
         taper between them <= 1 in per 6 in of height  (3 in over the 18 in zone)
         toe depth >= 17 in;  both zones <= 25 in deep and >= 30 in wide
outputs: has_knee_zone, apron_shortfall_in, knee_height_available_in,
         required_knee_depth_at_9_in, required_knee_depth_at_27_in, taper_allowed_in,
         actual_taper_in, taper_ok, knee_9_ok, knee_27_ok, knee_depth_over_max,
         knee_deficit_in, knee_ok, toe_ok, toe_deficit_in, toe_over_max, width_ok,
         width_deficit_in, passes, note
```

**The 27 in figure decides the job, and it is absolute.** The default example is an underside at 26 in,
which does not have *shallow* knee clearance -- it has **none**, and no depth below can rescue it. The toe
depth and the width both pass in that fixture, which is exactly why the failure survives a walkthrough:
everything under the fixture looks open. The fuzzer pins that 25 in of depth at both heights still fails
when the underside is at 26 in.

**Knee depth is not one number.** 11 in at 9 in above the floor and 8 in at 27 in, with the space between
permitted to reduce at 1 in per 6 in of height and no faster. Over the 18 in of the zone that rate allows
exactly 3 in -- exactly the 11-to-8 the section states -- so the two depths and the rate are the same rule
read two ways, and the tile asserts that reconciliation directly.

**The taper is a separate failure from the depths.** The cross-check fixture has 17 in at 9 in and 12 in at
27 in: both minimums are cleared and it still fails, because it loses 5 in where 3 is the limit. That is
what a slanted apron or a bowl hanging below the counter does -- it eats depth in the middle of the zone
while the numbers at each end look fine. Gaining depth with height is not a violation of a *reduction* rate,
which is pinned too.

**The width is the other quiet failure**: 30 in minimum, taken out on one side by a pedestal, a trap arm, or
a cabinet gable without changing the apparent opening.

## 3. Scope

A clearance screen, not a fixture rough-in. Not checked: whether knee and toe clearance are required at this
element at all, which turns on the element and on whether a forward approach is required, since a parallel
approach needs neither; the 306.2.4 rule that space extending more than 6 in beyond the available knee
clearance at 9 in does not count as toe clearance, which requires the two zones to be read together and a
section drawn; the clear floor space in front, which is a separate tile; pipe insulation and protection
against contact; the element's own rim height and reach ranges; and state and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `turning-clear-floor-space`, `reach-range`,
`fixture-clearance-check`, and `cabinet-linear-feet`. The tools-data row sits inside the parsed Group E
block, which has no exact count assertion. Fuzzer pins both fixtures, the 27-in gate at five heights with
`null` knee outputs below it and no depth rescuing it, both knee depths failing alone at their seams with
exact deficits, the taper as an independent failure across six depth pairs, the rate reconciling to the two
stated depths, a gain in depth not counting as a violation, the 25-in maximum in both zones, toe and width
at their seams with exact non-negative deficits, every check failing independently, and every error seam.
