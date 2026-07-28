# roughlogic.com Specification v1176 -- Tactile Sign Mounting Height and Location (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 93 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1175.md.
>
> **The gap is self-declared.** `sign-character-height` (spec-v1161) sizes *visual* characters and states
> in its own scope note that the raised-character requirements and their mounting range are not checked.
> This is that range.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown sign
position or door-arc flag, a non-positive baseline height or clear-space dimension, or a negative block
height return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 703.4.1 and 703.4.2. A US federal standard in the
public domain, quoted directly.

## 2. The tile

### 2.1 `tactile-sign-mounting` -- Tactile Sign Mounting Height and Location (703.4)

```
inputs:  lowest_baseline_in, tactile_block_height_in, sign_position,
         clear_space_width_in, clear_space_depth_in, beyond_door_arc
compute: lowest baseline >= 48 in AND (lowest + block) <= 60 in
         permitted window for the lowest baseline = 48 to (60 - block);  none above a 12 in block
         position: alongside the door at the latch side, on the inactive leaf, or right of the
                   right-hand door;  not on the leaf and not the hinge side
         clear floor space 18 x 18 in, beyond the door swing arc to 45 degrees
outputs: highest_baseline_in, window_height_in, mountable, lowest_min_in, lowest_max_in,
         usable_range_in, low_ok, high_ok, low_deficit_in, high_excess_in, height_ok,
         position_ok, space_size_ok, space_deficit_in, beyond_arc, space_ok, passes, note
```

**It reads like a range and it is not one.** The two limits are measured from *different characters*, so
the 12 in between them is the total vertical budget and the tactile block consumes it. The default example
is a 4 in block set at 60 in, which puts the highest baseline at **64 in** -- 4 in over -- when the lowest
may in fact sit anywhere from 48 to **56 in**, a usable window of 8 in. The fuzzer checks at six block
heights that the window is exactly 12 in less the block, that *both* ends of the reported window comply, and
that a tenth past either end does not.

**A block over 12 in cannot be mounted compliantly at any height.** The cross-check fixture is 14 in, and
the tile reports `null` for the permitted position rather than a number -- raising it to clear 48 at the
bottom pushes the top past 60, and lowering it to clear 60 at the top drops the bottom under 48. The answer
is a shorter sign or fewer tactile lines, and the note says so. The fuzzer sweeps five heights for each of
three oversized blocks and asserts none passes.

**The location rule has its own logic.** A tactile sign at a door goes *alongside* the door at the latch
side, not on the leaf, because a person reading it by touch has to stand still while the door stays shut --
a sign on the door moves away the moment anyone opens it. The hinge side puts a reader in the swing. And
the 18 x 18 in clear floor space must sit **beyond the arc** of the door swing between closed and 45
degrees open, which rules out the wall a door swings back against; the fuzzer pins that a big enough space
inside the arc still fails, because it is a location problem rather than a size problem.

## 3. Scope

A mounting screen, not a signage package. Not checked: whether the sign requires tactile characters at all,
which turns on what it identifies -- a room designation needs them, a directional sign does not; raised
character height, style, case, stroke, and spacing; Braille, which must duplicate the tactile characters
and has its own position and spacing rules; visual character requirements, which are `sign-character-height`;
pictograms and their fields; finish, contrast, and glare; the additional content required at exits and
stairs; and state and local accessibility law.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `sign-character-height`,
`door-clear-width`, `door-maneuvering-clearance`, and `turning-clear-floor-space`. The tools-data row sits
inside the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the window
arithmetic at six block heights with both ends round-tripped and a tenth past either end failing, three
oversized blocks failing at five heights each with `null` reported, both height ends failing independently
with exact non-negative deficits, all five sign positions with the three permitted ones passing and the two
prohibited ones failing, the clear-space size and swing-arc position failing independently, and every error
seam.
