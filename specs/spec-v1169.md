# roughlogic.com Specification v1169 -- Changes in Level and Floor Surfaces (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 86 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1168.md.
>
> **The gap.** A dupe scan for "changes in level", "carpet pile", and "beveled" returned zero hits.
> `ada-ramp-slope` starts where a ramp is already required; nothing covered the far more common case of
> deciding whether one is required at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
opening flag, a negative level change, run, pile, or opening, or a non-positive ramp ratio return
`{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 302.2, 302.3, 303.2, 303.3, and 303.4. A US federal
standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `floor-level-change` -- Changes in Level and Floor Surfaces (302, 303)

```
inputs:  level_change_in, bevel_run_in, ramp_run_per_rise, carpet_pile_in,
         opening_size_in, opening_elongated, opening_perpendicular
compute: <= 1/4 in            -> may be vertical, no transition required
         > 1/4 in to 1/2 in   -> beveled at 1:2 or flatter; required run = 2 x rise
         > 1/2 in             -> ramped under 405/406; run = rise x ramp ratio
         carpet pile <= 1/2 in; openings pass no sphere over 1/2 in and, if elongated,
         run perpendicular to the dominant direction of travel
outputs: category, needs_bevel, needs_ramp, required_bevel_run_in, bevel_run_deficit_in,
         bevel_slope_run_per_rise, bevel_ok, ramp_run_required_in, bevel_run_if_under_in,
         cliff_multiple, over_by_in, has_carpet, carpet_ok, has_opening, opening_size_ok,
         opening_orientation_ok, opening_ok, level_ok, vertical_allowance_in, passes, note
```

**The arithmetic people skip is that 1:2 means twice the rise.** A 1/2 in change needs a full inch of run.
The default example provides 1/2 in -- a 1:1 strip that looks beveled and is half of what the slope
requires. The fuzzer pins the required run at five heights in the band, a hundredth short failing and
flatter passing.

**The third threshold is a cliff, and pricing it is the point of the tile.** The cross-check fixture is
0.625 in, an eighth past the line, which must be ramped: **7.5 in of run at 1:12** against the **1 in** a
1/2 in change would have taken as a bevel, 7.5 times as much. And the run is the small part -- a ramp
brings landings top and bottom, edge protection, and handrails where the rise exceeds 6 in, none of which a
bevel needs. Grinding or shimming the change down to 1/2 in almost always beats ramping it, and that is the
decision the tile makes visible rather than implying.

**Outside each band the corresponding outputs are `null`,** not numbers nobody must meet: no bevel figures
below 1/4 in or above 1/2 in, no ramp figures at or below 1/2 in. Both seams are pinned on the correct
side, and a 1/4 in change passes with zero run.

**Two surface rules ride along and fail independently.** Carpet pile at 1/2 in maximum -- with the note
observing that a thick pad under a compliant carpet defeats it just as surely, because the rule is about
what a wheel sinks into. And openings passing no sphere over 1/2 in, with an elongated opening required to
run *perpendicular* to travel, which is the orientation that decides whether a grate catches a caster or a
cane tip. Orientation is checked only where the opening is elongated.

## 3. Scope

A surface screen, not a floor detail. Not checked: whether the surface is stable, firm, and slip resistant
under 302.1, which no dimension captures; the ramp itself where one is required, which is 405 and a
separate tile; door thresholds, which have their own 1/2 in rule and bevel exception at 404.2.5; grating
placement at curb ramps and crossings; carpet padding; the accessible route the surface sits on; and state
and local accessibility law. The ramp ratio is editable; 1:12 is the 405.2 maximum for new construction.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `ada-ramp-slope`,
`accessible-route-width`, `door-clear-width`, and `flooring-takeoff`. The tools-data row sits inside the
parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, all three bands with
both seams on the correct side, the 1:2 arithmetic at five heights with a hundredth short failing, `null`
outside each band, the ramp run at five change-and-ratio pairs with the comparison always against the 1/2
in bevel, carpet at its seam, both opening rules failing independently with orientation checked only when
elongated, that all three checks fail on their own, and every error seam.
