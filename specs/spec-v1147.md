# roughlogic.com Specification v1147 -- Egress Window Well (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1146.md.
>
> **The gap, self-declared.** `egress-window-check` (spec-v1131) lists what it does not check, and the
> first item is "a window well where the sill is below grade, with its own minimum area and projection and
> a ladder or steps where it is deeper than 44 in." This is that.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
well dimension or a negative ladder dimension returns `{ error }`. Renderer: this module's
`_simpleRenderer`.

## 2. The tile

### 2.1 `egress-window-well` -- Egress Window Well (IRC R310.2.3)

```
inputs:  well_width_in, well_projection_in, well_depth_in, opening_fully_opens,
         has_ladder, ladder_inside_width_in, ladder_projection_in, ladder_spacing_in
compute: area = width x projection / 144
         pass = area >= 9 sq ft AND width >= 36 AND projection >= 36 AND opens fully
         projection needed = max(36, 1296 / width);  width needed = max(36, 1296 / projection)
         ladder required where depth > 44 in: >= 12 in inside width, >= 3 in projection,
                                              <= 18 in vertical spacing
outputs: area_sf, area_ok, area_deficit_sf, width_ok, projection_ok, projection_needed_in,
         width_needed_in, ladder_required, ladder_present_ok, ladder_width_ok,
         ladder_proj_ok, ladder_spacing_ok, ladder_ok, fully_opens, tangent,
         minimums_area_sf, passes, note
```

**Same shape as the opening it serves: tangent minimums.** 36 x 36 is *precisely* 9 sq ft, so the smallest
compliant well is square and neither minimum has any margin. A well narrower than 36 in can never pass,
however far it projects -- the fuzzer proves that at 36, 60, and 200 in of projection. The tile reports
the partner dimension in both directions and the fuzzer feeds it back to confirm the advice produces a
pass.

**The condition with no number is the one that catches people.** The well must let the escape opening open
**fully**. An outward-swinging sash or a hopper can foul the well wall in a shallow projection and leave
an opening that measures perfectly compliant and does not open. The fuzzer pins a well with generous area,
width, and projection failing on this alone.

**Two ladder details worth stating.** The trigger is depth *greater than* 44 in, so 44 exactly needs none.
And the code lets the ladder **encroach into the required dimensions** -- discovering one is needed is not
a reason to enlarge the well. Rungs sit on two minima (12 in inside width, 3 in projection) and one
maximum (18 in spacing), all three of which pass exactly at the limit.

## 3. Scope

Not checked: the escape opening itself (`egress-window-check`); covers and grates and whether they release
from inside without tools; **drainage**, which is what actually fails these wells in service, since a well
that fills with water is a hazard rather than an exit; the structural design of the well wall against soil
pressure; guards at grade; and whether the room requires an escape opening at all.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `egress-window-check`, `landing-check`,
and `smoke-alarm-placement`. `check-module-sizes` cap for calc-construction.js raised 205000 -> 215000, and `check-shells` GROUP_GZIP_CAP 92 -> 100 KB. Fuzzer pins both fixtures, the tangency, all three ladder rung seams, that a
narrow well cannot be rescued by projection, the partner-dimension round trip, the exact `> 44 in` ladder
trigger with `null` below it, the full-opening condition failing alone, and every error seam.
