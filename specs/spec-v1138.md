# roughlogic.com Specification v1138 -- Door Maneuvering Clearance (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1137.md.
>
> **The gap.** A dupe scan for "door swing clearance" and "maneuvering clearance" returned zero hits.
> Completes the accessible-fixture trio started by `fixture-clearance-check` and `grab-bar-layout`.

Repository: github.com/clay-good/roughlogic.com -- US standards only. The 2010 ADA Standards are a US
federal regulation published in full at no cost, so the provisions can be cited directly.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
depth, door width, or minimum, or a negative latch-side clearance, return `{ error }`. Renderer: this
module's `_simpleRenderer`.

## 2. The tile

### 2.1 `door-maneuvering-clearance` -- Door Maneuvering Clearance, Front Approach

```
inputs:  side (pull|push), clear_perpendicular_in, clear_latch_side_in, door_clear_width_in,
         min_pull_perpendicular_in (60), min_pull_latch_in (18),
         min_push_perpendicular_in (48)
compute: pull  -> depth >= 60 in AND >= 18 in clear beyond the latch side
         push  -> depth >= 48 in, no latch-side strip (no closer, no latch)
         footprint = depth x (door width + latch-side clearance)
outputs: pull, required_perpendicular_in, required_latch_in, perp_ok, latch_ok, passes,
         perpendicular_deficit_in, latch_deficit_in, required_width_in, required_area_sf,
         other_area_sf, area_ratio, note
```

**The asymmetry is the point, and the tile puts a number on it.** A 32-in door needs a 60 x 50 in
footprint on the pull side -- **20.83 sq ft** -- and 48 x 32 on the push side, **10.67 sq ft**. Nearly a
factor of two for the same door. A layout that clears on the push side tells you nothing about the pull
side, and both faces have to work. The fuzzer pins that the two faces' `area_ratio` values are exact
reciprocals, and that a push-side-legal clearance fails the pull side.

**The latch-side strip is the thing people forget**, because it is empty *wall* rather than door and does
not read as part of the opening on a plan. It is exactly where a corner, a corridor wall, a vanity, or a
light switch kills a legal door -- and the common 12 in that gets left is **6 in short** of the 18
required. The default example is that failure: full depth, short strip.

## 3. Scope, stated rather than glossed

**Only the front approach is reproduced.** Table 404.2.4.1 also covers hinge-side and latch-side
approaches, which are different and generally larger, and it **adds** clearance where a door has both a
closer and a latch -- including on the push side, where none is otherwise required. A door with a closer
is the ordinary commercial case, so the push-side numbers here do not apply to it, and the note says to
read the table rather than pretending otherwise.

Also not checked: the 32-in clear width at 90 degrees, the level and unobstructed clearance floor and its
1:48 slope limit, opening force and closing speed, threshold height, hardware, doors in series, and the
route to the door. The 2010 ADA Standards and ANSI A117.1 differ in places, which is why the minimums are
editable.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `landing-check`, `ada-ramp-slope`,
`grab-bar-layout`, and `rough-opening-size`. Fuzzer pins both fixtures, the reciprocal area ratio between
the faces, that push-side-legal fails the pull side, all three seams with their compliant boundary values,
that the push side never demands a latch strip whatever is entered, the footprint identities across six
side/width combinations, editable minimums, and every error seam.
