# roughlogic.com Specification v1027 -- Siding Course Layout / Story Pole (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1026.md.
>
> **The gap, and the evidence for it.** `siding-takeoff` returns squares and lap linear footage and its
> note defers layout: course count and trim are "taken off separately." Nothing computed the course count
> or -- the part with actual judgment in it -- the ADJUSTED exposure that makes the top course land full.
> Discovery batch 3 flagged the courses-and-layout tile as defensible; this is it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
dimensions, a target exposure above the board-minus-overlap ceiling, or an overlap eating the whole board
return `{ error }`. Citation discipline: layout arithmetic, no standard claimed; the exposure ceiling is
the manufacturer's stated minimum headlap, entered (1-in default). Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `siding-course-layout` -- Siding Course Layout (Story Pole)

```
inputs:  wall_height_ft, wall_length_ft, target_exposure_in (7), board_height_in (8), min_overlap_in (1)
compute: max_exposure = board - min_overlap; target must not exceed it
         courses = ceil(height / target)
         adjusted_exposure = height / courses      -- the story-pole mark
         sliver = the top-course remainder the raw target would have left
         starter_lf = wall length; total_course_lf = courses x length
outputs: courses, adjusted_exposure_in, max_exposure_in, sliver_in, starter_lf, total_course_lf, note
```

**The invariant that makes the adjustment safe (stated in the note, pinned by the fuzzer):** shrinking the
exposure only ever INCREASES the headlap, so an adjusted layout can never violate the manufacturer minimum
that the raw target already cleared. The check happens once, on the target.

**Worked example (pinned).** A 9-ft wall at a 7-in target on 8-in board: 16 courses at an adjusted 6.75 in
-- versus a 3-in sliver at the frieze if the crew ran the raw target. 40-ft wall: 40 ft of starter, 640 ft
of courses.

## 3. Scope limits

Layout only -- squares, waste, and material LF are `siding-takeoff`; window head/sill alignment is a
judgment the note names but does not automate. The manufacturer's exposure limits and installation
instructions govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example, the exact ceiling seam
(target = max exposure passes, over it errors), adjusted <= target always, adjusted > target never, the
whole-course identity courses x adjusted == height exactly, and error seams.
