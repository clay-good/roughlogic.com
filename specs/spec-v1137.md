# roughlogic.com Specification v1137 -- ADA Grab Bar Layout (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1136.md.
>
> **The gap, self-declared.** `fixture-clearance-check` (spec-v1132) ends by saying its IPC numbers are
> the floor and that "ANSI A117.1 and the ADA Standards require substantially more... and grab-bar
> blocking." This is that. A dupe scan for "grab bar" returned no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.
The 2010 ADA Standards are a US federal regulation, published in full at no cost -- so unlike an ICC
table, the actual provisions can be cited directly.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
height, bar length, or load, or a negative position, standoff, or spacing return `{ error }`.
Hand-written renderer, matching this module's convention.

## 2. The tile

### 2.1 `grab-bar-layout` -- ADA Grab Bar Layout and Blocking Load

```
inputs:  bar_height_in, side_bar_length_in, side_bar_from_rear_in, rear_bar_length_in,
         rear_toward_side_in, rear_toward_open_in, load_lb (250), standoff_in,
         fastener_spacing_in
compute: 609.4    33 <= height <= 36 in to the TOP of the gripping surface
         604.5.1  side bar >= 42 in, <= 12 in from the rear wall
                  rear bar >= 36 in, >= 12 in toward the side, >= 24 in toward the open side
                  AND rear bar length >= the sum of the two reaches
         609.8    prying moment = 250 x standoff; outer fastener = moment / flange spacing
outputs: height_ok, side_length_ok, side_position_ok, rear_length_ok, rear_side_ok,
         rear_open_ok, rear_span_needed_in, rear_span_ok, layout_ok, pull_out_lb,
         prying_moment_inlb, fastener_force_lb, force_multiplier, note
```

**The minimum rear bar is exactly tangent.** 12 in toward the side wall plus 24 in toward the open side is
**exactly** the 36-in minimum length. So the minimum bar just fits, and any layout that pushes either
reach even slightly wider needs a longer bar -- while every individual dimension still reads compliant.
The cross-check fixture pins 14 + 26 = 40 in of span on a 36-in bar, with both reaches *exceeding* their
own minimums.

**609.8 is a load path, not a fastener count.** The bar **and its mounting** must sustain 250 lbf. A bar
standing 1.5 in off the wall converts that straight pull into **375 in-lb** of prying moment, and
resolving it across a 3-in flange spacing puts **125 lb** on the outer fastener before the direct pull-out
is counted. That is why grab bars fail at the anchor rather than the bar: toggles and plastic anchors do
not carry it, and the answer is solid blocking or a steel backing plate installed **before** the board
goes up -- which is also why a retrofit usually means opening the wall.

**Height is a window, not a minimum.** 33 to 36 in; too high fails just as too low does, and the fuzzer
pins both ends. The side bar mixes a length *minimum* with a distance *maximum*, in opposite directions,
which is its own easy mistake.

## 3. Scope

Standard water-closet configuration with a side wall and a rear wall. Ambulatory-accessible stalls,
bathtubs, and roll-in and transfer showers each have their own bar layouts under 604.8, 607, and 608 and
are not this. Not checked: clear floor space, the 16-18 in centerline, seat height, flush-control side,
dispenser locations, the 1-1/4 to 2 in gripping diameter, or the 1-1/2 in clearance behind the bar. The
2010 ADA Standards and ANSI A117.1 differ in places and a state may adopt either.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fixture-clearance-check`,
`shower-compartment-check`, `ada-ramp-slope`, and `guard-post-load`. Fuzzer pins both fixtures, the exact
tangent span and that individual reaches can pass while the span fails, both ends of the height window,
the opposite-direction side-bar seams, the load path across 27 load/standoff/spacing combinations
including the zero-standoff case, that load inputs never move the layout verdict, the `null` path when no
fastener spacing is given, and every error seam.
