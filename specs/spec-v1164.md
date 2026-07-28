# roughlogic.com Specification v1164 -- Accessible Route Width, Pinch Points, and Passing Spaces (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 81 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1163.md.
>
> **The gap.** A dupe scan for "route width", "passing space", and "clear width at turn" returned zero
> hits. `protruding-object-check` (spec-v1163) says what may reduce a route's width; nothing said what the
> width had to be.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
pinch or turn flag, a non-positive clear width or route length, a non-positive pinch dimension where a
pinch is present, a negative separation, or a non-positive turn dimension where a turn is present return
`{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 403.5.1 and its exception, 403.5.2 and its
exception, and 403.5.3. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `accessible-route-width` -- Accessible Route Width, Pinch Points, and Passing Spaces (403.5)

```
inputs:  clear_width_in, route_length_ft, pinch_present, pinch_width_in, pinch_length_in,
         separation_length_in, turn_present, turn_element_width_in, approach_width_in,
         at_turn_width_in
compute: width  <- >= 36 in
         pinch  <- >= 32 in wide AND <= 24 in long AND separated by >= 48 in   (all three)
         turn   <- where the element is < 48 in wide: 42 in approaching, 48 in at the turn,
                   unless the turn itself is >= 60 in
         passing spaces <- required where the width < 60 in; count = max(0, ceil(L/200) - 1)
outputs: width_ok, width_deficit_in, pinch_width_ok, pinch_length_ok, pinch_separation_ok,
         pinch_length_excess_in, pinch_ok, turn_applies, turn_relieved, required_approach_in,
         required_at_turn_in, turn_approach_ok, turn_at_ok, turn_ok, passing_required,
         passing_spaces_required, longest_stretch_ft, passes, note
```

**The 32 in people quote is not a width.** It is a pinch: 32 in minimum for **24 in of length maximum**,
and only where the reduced segments are separated by segments 48 in long and 36 in wide -- three
conditions, not one. The default example satisfies the width and the separation and fails on length by 6
in, at which point the reduction has stopped being a pinch and become the width of the route. A hall built
at 32 in is not a hall with an exception. Each of the three conditions is pinned failing alone.

**The turn is the rule that surprises people, because nothing about the corridor changed.** Doubling back
around an element narrower than 48 in demands **42 in approaching and 48 in at the turn** -- so the
cross-check fixture's compliant 36-in corridor is suddenly 6 and 12 in short. The trigger is the *element*
width, and the relief is a single number: 60 in at the turn takes the section out entirely, at which point
the tile reports `null` for the required dimensions rather than numbers nobody must meet.

**Passing spaces are the thing nobody draws.** Any route under 60 in wide owes them at intervals of 200 ft
maximum, which takes in nearly every corridor. The tile reports the minimum count keeping every stretch
inside the interval -- `max(0, ceil(L/200) - 1)` -- and says plainly in both the note and the citation that
the standard states an *interval*, not a count, and that placement is a layout question. The fuzzer checks
the count at eight lengths and asserts the resulting longest stretch never exceeds 200 ft. The count is
informational and never flips the verdict.

## 3. Scope

A width screen, not a route design. Not checked: running slope, cross slope, changes in level, and
surface; whether this is an accessible route at all and where one is required; doors, their clear opening
width, and maneuvering clearances, which routinely govern a corridor before its width does; turning space
at the ends; protruding objects, which reduce the clear width separately; handrails and guards; and state
and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `protruding-object-check`,
`ada-ramp-slope`, `egress-capacity`, and `landing-check`. The tools-data row sits inside the parsed Group E
block, which has no exact count assertion. Fuzzer pins both fixtures, the 36-in seam, each of the three
pinch conditions failing alone and passing at its boundary, exact length excesses, `null` throughout where
no pinch is entered, the turn trigger at the element-width seam, the relief at the 60-in seam with `null`
required dimensions, both turn dimensions failing independently, the passing-space trigger at 60 in, the
count at eight lengths with the longest stretch always inside the interval, that the count never flips the
verdict, and every error seam.
