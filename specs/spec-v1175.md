# roughlogic.com Specification v1175 -- ADA Stair Treads and Risers (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 92 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1174.md.
>
> **The gap.** `stair-stringer-layout` lays out a flight and `guard-handrail-check` does the building-code
> guard and handrail. Neither checks the ADA dimensions, which are tighter than the building code in both
> directions and are the reason a code-legal stair fails an accessibility review.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
open-riser flag, a non-positive riser, tread, or total rise, a negative nosing projection or radius, or a
riser slope outside 0 to 90 degrees return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 504.2, 504.3, 504.5, and 504.6. A US federal standard
in the public domain, quoted directly.

## 2. The tile

### 2.1 `ada-stair-check` -- ADA Stair Treads and Risers (504)

```
inputs:  riser_height_in, tread_depth_in, total_rise_in, open_risers,
         nosing_projection_in, leading_edge_radius_in, riser_slope_deg
compute: riser 4 to 7 in;  tread >= 11 in;  open risers not permitted
         leading-edge radius <= 1/2 in;  nosing projection <= 1 1/2 in;
         riser slope <= 30 degrees from vertical
         compliance cost at a fixed total rise:
           risers = ceil(total rise / 7);  run = (risers - 1) x 11 in
outputs: riser_ok, riser_too_tall, riser_deficit_in, tread_ok, tread_deficit_in, open_ok,
         radius_ok, nosing_ok, slope_ok, risers_as_built, risers_required, compliant_riser_in,
         risers_added, treads_as_built, treads_required, run_as_built_in, run_required_in,
         run_added_in, passes, note
```

**A code-legal stair can fail the ADA, and the ordinary one does.** 504.2 wants risers 4 to 7 in and treads
11 in minimum; the IRC commonly allows 7 3/4 in on a 10 in tread, so a residential-style flight misses
**both** numbers at once. The riser is a window, not a maximum -- under 4 in fails too, which is what
shallow entry flights and transitions run into, and the tile distinguishes the two directions.

**The compliance cost is the tile's real contribution.** The total rise is fixed by the building, so
bringing the riser down to 7 in *adds* risers, and every added riser adds a tread, and every tread adds 11
in of run. The default example's 108 1/2 in rise goes from 14 risers and **130 in** of run to 16 risers at
6.781 in and **165 in** -- 35 in, nearly 3 ft, longer. That is a floor-plan problem rather than a carpentry
one. The fuzzer checks at six total rises that the required count is `ceil(rise / 7)`, that the derived
riser never exceeds 7 in, and that the derived risers sum back to the total rise exactly.

**Open risers are absolute.** They fail a flight that is otherwise perfect -- a stair to rebuild rather
than a dimension to adjust. The leading-edge radius, the nosing projection, and the riser slope each fail
on their own and each pass at their boundary.

## 3. Scope

A stair dimension screen, not a stair design. Not checked: handrails, which 504.6 requires complying with
505 and which is `handrail-geometry`; the tread surface under 504.4; landings, headroom, width, and guards,
which are building-code questions; uniformity of risers and treads within a flight, which the building code
polices and an inspector will measure; whether the stair is on an accessible route or serves as an
alternative to an elevator, which decides whether 504 applies at all; and state and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `handrail-geometry`,
`stair-stringer-layout`, `guard-handrail-check`, and `landing-check`. The tools-data row sits inside the
parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the riser window at
six heights with both failure directions and the short-side deficit measured to 4 in, the tread minimum
inclusive at its seam, the compliance cost at six total rises with the derived risers summing back to the
rise, a compliant flight adding no run, a shorter-than-needed riser not reducing the count below the
ceiling, a generous tread producing a negative run change, open risers failing a perfect flight, all three
nosing rules failing alone and passing at their boundaries, and every error seam.
