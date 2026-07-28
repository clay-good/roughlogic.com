# roughlogic.com Specification v1131 -- Egress Window Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1130.md.
>
> **The gap.** `guard-handrail-check` does guards, `stair-stringer-layout` and the stair-code tile do
> stairs, `rough-opening-size` sizes the framing. Nothing checked the **emergency escape and rescue
> opening** -- the one bedroom-window dimension a permit actually turns on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
width or height, or a negative sill height or override, return `{ error }`. Renderer: this module's
`_simpleRenderer`. `check-module-sizes` cap for calc-construction.js raised 190000 -> 205000 (the module
had reached 97.7% at 185,543 B gz).

## 2. The tile

### 2.1 `egress-window-check` -- Egress Window (Emergency Escape Opening) Check

```
inputs:  clear_width_in, clear_height_in, sill_height_in, location (above-grade|grade-floor),
         min_area_override_sf
compute: required = 5.7 sq ft (820.8 sq in), or 5.0 (720) at a grade floor, or the override
         pass = width >= 20 AND height >= 24 AND area >= required AND sill <= 44
         width needed  = max(20, required / height)
         height needed = max(24, required / width)
outputs: clear_area_sqin, clear_area_sf, required_area_sf, required_area_sqin, width_ok,
         height_ok, area_ok, sill_ok, passes, area_deficit_sqin, width_needed_in,
         height_needed_in, minimums_area_sqin, minimums_shortfall_sqin, grade_floor, note
```

**The code's own three minimums are mutually unsatisfiable.** 20 in of net clear width by 24 in of net
clear height is 480 sq in, and the same section demands 820.8 -- a **340.8 sq in shortfall**. So one
dimension always has to exceed its minimum, and how far depends on the other: at 24 in tall the width must
reach **34.20 in**; at 20 in wide the height must reach **41.04 in**. Meeting 20 and 24 and stopping there
is the single most common way an egress window fails inspection, so the tile reports the required
**partner dimension** rather than only a verdict. The default example is exactly that failing case.

The fuzzer does more than check the arithmetic: for nine height and width values it feeds the reported
partner dimension straight back in and asserts the result **passes** -- so the advice is verified, not
just computed.

**Measuring the wrong opening is the other recurring error.** Net clear means the actual free hole with
the sash operated normally from the inside -- not the rough opening, not the unit size, not the glass. The
frame, the stops, and a casement's own sash all subtract, and a single-hung loses roughly half its height
to the fixed upper sash, which is why a single-hung that looks generous often will not qualify.

**Boundaries are compliant.** The code says *not less than* and *not greater than*, so 20, 24, and a 44-in
sill all pass. The fuzzer pins each seam and its neighbour a tenth of an inch away.

## 3. Scope

The four dimensional criteria only. Also required and **not** checked: operability from the inside without
keys, tools, or special knowledge and without removing the sash; a window well where the sill is below
grade, with its own minimum area and projection and a ladder or steps where it is deeper than 44 in; bars,
grilles, covers, and screens being releasable from the inside; and which rooms and stories need an opening
at all. The minimum area is overridable because local amendments exist.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `rough-opening-size`,
`guard-handrail-check`, `stair-stringer-layout`, and `header-sizing`. Fuzzer pins both fixtures, the trap,
the partner-dimension round trip, all four pass/fail seams including the compliant boundary values, that
the grade-floor case relaxes only the area, override behaviour including the fallback to the dimensional
minimums, and every error seam.
