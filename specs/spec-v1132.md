# roughlogic.com Specification v1132 -- Plumbing Fixture Clearances (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1131.md.
>
> **The gap.** `plumbing-fixture-count` says how many fixtures an occupancy needs. Nothing said whether
> they **fit**. A dupe scan for "toilet clearance", "shower size", and "grab bar" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
side or front distance, a negative adjacent distance or compartment dimension, a non-integer or
non-positive fixture count, or a non-positive minimum return `{ error }`. Hand-written renderer, matching
this module's convention.

## 2. The tile

### 2.1 `fixture-clearance-check` -- Plumbing Fixture Clearances (IPC 405.3.1)

```
inputs:  center_to_left_in, center_to_right_in, front_clearance_in, adjacent_center_in,
         fixture_count, compartment_width_in, compartment_depth_in,
         min_side_in (15), min_center_in (30), min_front_in (21)
compute: pass = both sides >= 15 AND front >= 21 AND (no adjacent OR centers >= 30)
                AND (no compartment OR width >= 30 AND depth >= 60)
         minimum row width = 2 x 15 + (n - 1) x 30
outputs: left_ok, right_ok, front_ok, center_ok, has_adjacent, compartment_width_ok,
         compartment_depth_ok, is_compartment, passes, side_deficit_in, front_deficit_in,
         center_deficit_in, min_row_width_in, min_alcove_depth_in, note
```

**The derived width is what settles a layout.** A row of *n* fixtures needs `2 x 15 + (n-1) x 30` inches
of wall. Two want **60 in**; three want **90**. A 5-ft wall holds two and not three, which is exactly
where half-bath and powder-room layouts come apart -- and it is a number you can check before anything is
drawn.

**Three details cause most of the failures**, and all three are in the note. Measure from the fixture
**centerline**, not its edge. The obstruction is *anything* -- a partition, a vanity cabinet, a shower
knee wall, a tub deck -- not just a wall. And the 21 in in front is measured to any wall, fixture, **or
door**: a door swinging into that space is an obstruction just as a wall is, and it is the clearance most
often missed on a plan that otherwise fits.

**What these numbers are not.** They are the plumbing code **floor**. An accessible layout is governed by
ANSI A117.1 and the ADA Standards, which require substantially more -- a centerline *range* off the side
wall rather than a bare minimum, a defined clear floor space rather than a front clearance, and grab-bar
blocking. A fixture laid out to the IPC minimums will not comply with them, and the tile says so rather
than letting a user assume otherwise.

**Every minimum is editable** because state and local amendments exist; the fuzzer pins that tightening
them flips the verdicts and changes the derived row width.

## 3. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `plumbing-fixture-count`,
`rough-opening-size`, and `ada-ramp-slope`. The tools-data row sits outside the parsed Group B block, so
no count assertion moves (that assertion is a `> 20` floor in any case). Fuzzer pins both fixtures, the
row-width formula at five counts, each clearance seam with its compliant boundary value, exact
non-negative deficits across sixteen combinations with the worse side governing, that an omitted adjacent
fixture yields `null` rather than a failure, that compartment checks engage only when given and use the
fixed 30 x 60, editable minimums in both directions, and every error seam.
