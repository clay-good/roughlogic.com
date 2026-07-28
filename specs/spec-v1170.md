# roughlogic.com Specification v1170 -- Turning Space and Clear Floor Space (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 87 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1169.md.
>
> **The gap.** A dupe scan for "turning space" and "clear floor space" returned zero hits. Every other ADA
> tile in the catalog -- reach ranges, toilet compartments, door clearances -- presumes one of these spaces
> is present, and none of them checked it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
approach or turning type, a non-positive clear-floor dimension, a negative alcove depth, a non-positive
circle diameter where circular, or a non-positive/negative T dimension where T-shaped return `{ error }`.
Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 304.3.1, 304.3.2, 304.4, 305.3, 305.5, 305.7.1, and
305.7.2. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `turning-clear-floor-space` -- Turning Space and Clear Floor Space (304, 305)

```
inputs:  cfs_width_in, cfs_depth_in, approach (forward|parallel), alcove_depth_in,
         turning_type (circular|t-shaped|none), turning_diameter_in,
         t_square_in, t_arm_width_in, t_arm_clear_in, t_base_clear_in
compute: clear floor space 30 x 48, with the 48 following the approach direction
         alcove: > 24 in deep forward -> 36 in wide;  > 15 in deep parallel -> 60 in wide
         turning: 60 in circle, OR a T in a 60 in square with 36 in arms,
                  arms clear 12 in each direction and the base clear 24 in
outputs: cfs_short_side_in, cfs_long_side_in, cfs_size_ok, cfs_depth_ok, cfs_width_ok,
         cfs_oriented_ok, alcove_trigger_in, is_alcove, required_alcove_width_in,
         alcove_width_ok, alcove_width_deficit_in, other_required_width_in, turning_ok,
         circle_deficit_in, t_square_ok, t_arm_width_ok, t_arm_clear_ok, t_base_clear_ok,
         passes, note
```

**They are two different spaces.** A compliant clear floor space is not somewhere anyone can turn around,
so satisfying 305 says nothing about 304. The tile reports them separately and says so.

**Orientation is the failure that gets drawn most often**, because on a plan the area looks right. The
default example is a textbook 30 wide by 48 deep on a *parallel* approach, where 305.5 puts the 48 in along
the element -- so the right area turned the wrong way is not compliant. The fuzzer pins that the same two
numbers pass one approach and fail the other, in both directions, while reporting identical short and long
sides.

**The alcove rules get skipped entirely, and the parallel case is brutal.** Confinement 20 in deep is past
the 15-in parallel trigger, at which point the space must be **60 in wide** -- double the bare 30, triggered
by a depth barely greater than an appliance. That is why a washer squeezed between two walls fails where the
same washer on an open wall passes. The approach direction, not the geometry, decides which rule applies,
and the tile reports what the *other* approach would have demanded of the same nook. Where there is no
alcove the outputs are `null` rather than a pass.

**The T has four conditions and the base carries a different number from the arms.** The cross-check fixture
is a 60-in square with 36-in arms and 12 in of arm clearance that still fails, because the base needs 24 in.
Each of the four is pinned failing alone.

## 3. Scope

A space screen, not a plan review. Not checked: whether either space is required at this location, which
turns on the element and the space type; knee and toe clearance under 306, which a T-shaped space may
include at the end of the base or one arm and which changes what counts as clear; the surface and its
slope; protruding objects into either space; the element being reached; door maneuvering clearances, which
overlap these spaces and are governed separately; and state and local accessibility law. Doors are
permitted to swing into a turning space, which the note states because layouts get redrawn to avoid it.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `accessible-route-width`, `reach-range`,
`door-maneuvering-clearance`, and `accessible-toilet-compartment`. The tools-data row sits inside the parsed
Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the orientation trap in all
four combinations with identical reported side lengths, size seams, both alcove triggers on the correct side
with the widths that follow and `null` where there is none, the same nook flipping between approaches, exact
non-negative alcove deficits at five widths, the circle at its seam, all four T conditions failing alone
including the base-versus-arm distinction, `null` for the unused turning family and for "none", that an
absent turning space is not a failure, that the three checks fail independently, and every error seam.
