# roughlogic.com Specification v1133 -- Stairway and Door Landing Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec. Tile 50 of the +100 campaign -- halfway.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1132.md.
>
> **The gap.** `stair-stringer-layout` lays out the flight and the stair-code tile checks riser and
> tread. Neither checks the flat part at each end, which has its own rules and its own classic failures.
> A dupe scan for "landing size" and "ramp landing" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
depth, width, or served width, a negative threshold drop, a non-positive minimum depth, or a negative
maximum drop return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `landing-check` -- Stairway and Exterior-Door Landing Check

```
inputs:  kind (stair|door), landing_depth_in, landing_width_in, flight_width_in,
         threshold_drop_in, min_depth_in (36), max_threshold_drop_in (1.5)
compute: depth ok    <- depth in the direction of travel >= 36 in
         width ok    <- landing width >= the flight or door width served
         threshold   <- door only: landing not more than 1.5 in below the threshold
         smallest compliant landing = min depth x served width
outputs: depth_ok, width_ok, drop_ok, is_door, passes, depth_deficit_in, width_deficit_in,
         drop_excess_in, min_landing_area_sf, provided_area_sf, note
```

**Area is the wrong test, and the tile shows why.** A 30 x 48 in landing has **10.00 sq ft** against a
9.00 sq ft minimum, and it is wider than the 36-in door it serves -- and it **fails**, because the 36 in
is measured along the path a person actually walks and the landing is only 30 in that way. Both fixtures
report the provided and minimum areas side by side precisely so the comparison is visible rather than
implied.

**The threshold rule is the one that catches people.** At a required exit door the floor may not sit more
than 1.5 in below the top of the threshold. A landing set a full step down is a fall, not a step, and it
fails whether or not the landing itself is big enough. The cross-check fixture pins a 7.5-in drop failing
by 6 in.

**It is a door rule only.** On a stairway landing the tile returns `null` for the threshold rather than a
pass or a fail, and the fuzzer pins that a 12-in drop on a stairway landing is not treated as a failure
while the other two rules stay identical between the two modes.

**Boundaries are compliant.** The code says *not less than* and *not more than*, so 36 in and a 1.5-in
drop both pass; the fuzzer pins each seam and its neighbour a tenth away.

## 3. Scope

The straight-run case: a landing where the stair turns has its own geometry and this number does not carry
over. Both minimums are editable because IBC stairway landings follow their own section, local amendments
exist, and an accessible route under ANSI A117.1 and the ADA Standards requires more than either. Not
checked: whether a landing is required at all in the configuration (including the common exception for a
door at the top of an interior flight), guards and handrail extensions, headroom, exterior slope and
drainage, and the framing that carries it.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `stair-stringer-layout`,
`guard-handrail-check`, `egress-window-check`, and `ada-ramp-slope`. Fuzzer pins both fixtures, the
area-versus-depth trap, all three seams with their compliant boundary values, that the threshold rule is
door-only while the other two are mode-independent, that width is measured against the served opening and
the minimum area follows it, exact non-negative deficits across a 48-case sweep, editable minimums, and
every error seam.
