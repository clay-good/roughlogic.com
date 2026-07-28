# roughlogic.com Specification v1122 -- Carpet Seam and Drop Layout (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1121.md.
>
> **The gap, self-declared.** `carpet-takeoff`'s own description says it applies *"higher waste for seam
> layout and pattern"* -- as a flat percentage. It never computes either. `wallpaper-rolls` does pattern
> repeat, but for walls. `flooring-takeoff` is plank and tile, not roll goods. Discovery batch 8: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
room or roll dimensions, a negative repeat or minimum strip, or waste outside 0-50% return `{ error }`.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `carpet-seam-layout` -- Carpet Seam and Drop Layout

```
inputs:  room_length_ft, room_width_ft, roll_width_ft (12/15), pattern_repeat_in,
         waste_pct (5), min_fill_strip_in (6)
compute: for EACH orientation:
           drops   = ceil(across / roll width)
           fill    = last drop's width, reported as 0 when the drops divide evenly
           cut     = ceil(run x 12 / repeat) x repeat / 12    whole repeats, or run if plain
           running = drops x cut;  seams = drops - 1;  seam length = seams x run
         pick the orientation needing less roll; report the other for comparison
outputs: drops, fill_strip_in, seam_count, seam_length_ft, cut_length_ft, running_ft,
         order_running_ft, roll_sf, with_waste_sf, sy, room_sf, waste_sf, waste_actual_pct,
         lengthwise_better, narrow_fill, seamless, alt_drops, alt_seam_count, alt_running_ft, note
```

**The number worth seeing is the real waste.** Carpet comes in one fixed width, so waste is set by how
the room divides into that width, not by a trim allowance. A 30 x 20 ft room off a 12-ft roll needs 60
linear feet -- 720 sq ft of carpet for a 600 sq ft room, **26% over**, against the 5% a takeoff would
apply. No amount of careful cutting recovers that. A 15-ft roll on the same room drops it to **6.3%**.
Both are pinned as fixtures, side by side, because the roll width is the decision that matters.

**The orientation is computed, not assumed.** On the 12-ft roll both directions need exactly 60 LF, so
the choice is *entirely* about seams -- one lengthwise versus two crosswise -- and not about material at
all. When they differ the tile reports both and declines to pick, because a seam in the wrong place costs
more than the yardage saved. A pattern repeat can flip which orientation wins; the fuzzer pins that a
27-in repeat does exactly that on the example room.

**Two details that bite.** A patterned carpet must be cut to whole repeats to match across a seam, so the
cut length rounds *up* and the order grows with it. And when the drops divide evenly the last drop is a
full-width drop, not a fill strip -- an early version reported a 12-ft "fill strip," which the fuzzer
caught.

## 3. What the geometry cannot decide

Rectangular room; no credit for doorways, closets, bays, stairs, or transitions. Seam **placement** is a
craft decision: seams run with the traffic and the light, never across a doorway, and nap direction must
be consistent across every drop or the seams read as a color change. The note says all of this and defers
to the installer's seam diagram.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `carpet-takeoff` (which now links back),
`flooring-takeoff`, `wallpaper-rolls`, and `self-leveler-bags`. Fuzzer pins both published-arithmetic
fixtures, then sweeps 90 room/roll combinations asserting seams = drops - 1, a fill strip within the roll
width, that the chosen orientation never needs more roll than the alternative, that the order never falls
below the room area, and the area/SY/linear-foot identities. It also pins the seamless single-drop case,
the exact even-division boundary, that a repeat only lengthens the cut and lands on a whole repeat, that
a repeat can flip the orientation, the narrow-fill flag including a strip exactly at the minimum being
acceptable, that the waste allowance scales the order but never the geometry, and every error seam.
