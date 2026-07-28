# roughlogic.com Specification v1165 -- Door Clear Width, Thresholds, and Doors in Series (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 82 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1164.md.
>
> **The gap.** `door-maneuvering-clearance` does the wall space beside a door and `rough-opening-size`
> sizes the framing. Neither checks the opening itself. A dupe scan for "clear opening", "threshold
> height", and "doors in series" found only the egress-window and maneuvering rows.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
alteration or bevel flag, a non-positive leaf width, thickness, or opening depth, or a negative measured
width, latch projection, threshold height, or series dimension return `{ error }`. Renderer: this module's
`_simpleRenderer`. `check-module-sizes` cap for calc-construction.js raised 235000 -> 260000 (the ADA batch took the module to 234,304 B gz, 99.7%).

**Source.** 2010 ADA Standards for Accessible Design, 404.2.3 with its exceptions, 404.2.5 with its
exception, and 404.2.6. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `door-clear-width` -- Door Clear Width, Thresholds, and Doors in Series (404.2)

```
inputs:  leaf_width_in, door_thickness_in, measured_clear_width_in (0 = use the estimate),
         opening_depth_in, is_alteration, latch_stop_projection_in,
         threshold_height_in, threshold_beveled, series_spacing_in, series_door_width_in
compute: estimated clear = leaf - thickness - 1/2 in stop        [an ESTIMATE; measured governs]
         required = 32 in, or 36 in where the opening is more than 24 in deep
         effective = clear - (latch projection beyond the allowance; allowance = 5/8 in only in
                     alterations, zero in new construction)
         threshold limit = 1/2 in, or 3/4 in only where altered AND beveled at 1:2 or flatter
         doors in series = 48 in + the width of doors swinging into the space
outputs: estimated_clear_width_in, used_measured, clear_width_in, is_deep, required_clear_width_in,
         latch_allowance_in, latch_projection_ok, effective_clear_in, clear_width_ok,
         clear_width_deficit_in, leaf_needed_in, threshold_limit_in, threshold_ok,
         threshold_excess_in, has_series, required_series_spacing_in, series_ok,
         series_deficit_in, passes, note
```

**32 in is the clear opening, not the door**, and that is the whole of the confusion. Measured between the
face of the door open 90 degrees and the stop, a 32-in leaf 1 3/4 in thick nets **29.75 in** -- 2.25 in
short -- because the leaf blocks its own thickness and the stop takes the rest. The tile names the smallest
leaf that would deliver the requirement, **34.25 in** here, which is why 36 in is the practical answer; the
fuzzer feeds that named leaf back in at six leaf and thickness combinations and asserts it complies. The
estimate is labelled an estimate in the note, the citation, and the output, and a measured value overrides
it.

**Two rules ride along and get skipped.** An opening more than **24 in deep** owes 36 in rather than 32, so
the cross-check fixture's 36-in door fails purely for sitting in a 30-in wall -- the door did not change,
the wall thickness did. And the 5/8-in latch-side stop projection everyone quotes is an **alterations**
exception: in new construction it is not available and the whole projection comes off the required width.
The fuzzer pins both directions.

**Thresholds need two conditions for the larger number**, not one: 1/2 in maximum, and 3/4 in only where
the threshold is existing or altered *and* beveled on each side at 1:2 or flatter. All four combinations
are pinned. **Doors in series need 48 in plus the width of doors swinging into the space** -- the additive
term is the one that gets dropped, which is why a vestibule laid out at a flat 48 in fails whenever either
door swings into it.

## 3. Scope

A doorway screen, not a hardware schedule. Not checked: maneuvering clearances on each side, which are
asymmetric and routinely govern before the width does; hardware type, height, and one-hand operation;
opening force and closing speed; the smooth surface at the bottom of the door; vision lights; automatic and
power-assisted doors; two-leaf doors, where one leaf must provide the full clear width on its own; changes
in level at the threshold beyond its height; and state and local accessibility law and the fire-door and
egress requirements at the same opening.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `door-maneuvering-clearance`,
`accessible-route-width`, `rough-opening-size`, and `landing-check`. The tools-data row sits inside the
parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the leaf-to-clear loss
at six combinations with the named leaf round-tripped, the 34.25-in seam, the measured override in both
directions, the 24-in depth seam, the alterations-only latch allowance including that no allowance exists
in new construction, all four threshold combinations with their seams and the threshold failing the doorway
alone, the series formula at four spacings with `null` where none is entered, and every error seam.
