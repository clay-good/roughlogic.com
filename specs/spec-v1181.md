# roughlogic.com Specification v1181 -- Water Closet Location and Seat Height (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 98 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1180.md.
>
> **The gap.** `grab-bar-layout` does the bars, `accessible-toilet-compartment` does the stall around the
> fixture, and `fixture-clearance-check` does the IPC minimums. None of them places the water closet
> itself, which is where the conflict between the two codes actually bites.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown flush
side or ambulatory flag, a non-positive centerline or seat height, or a negative clearance return
`{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 604.2, 604.3.1, 604.4, and 604.6. A US federal
standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `water-closet-location` -- Water Closet Location and Seat Height (604)

```
inputs:  centerline_in, seat_height_in, clear_side_in, clear_rear_in, flush_side, ambulatory
compute: centerline 16 to 18 in from the side wall or partition
         seat 17 to 19 in to the TOP of the seat
         clearance 60 in from the side wall and 56 in from the rear
         flush controls on the open side, except in an ambulatory compartment
outputs: centerline_ok, centerline_too_close, centerline_deficit_in, meets_ipc_only, seat_ok,
         seat_too_low, seat_deficit_in, clearance_entered, side_ok, rear_ok, side_deficit_in,
         rear_deficit_in, clearance_ok, clear_area_sf, required_area_sf, flush_rule_applies,
         flush_ok, passes, note
```

**The plumbing code's minimum is outside the ADA window, and the tile says so by name.** 16 to 18 in is a
window; the IPC's 15 in is a full inch below it. The default example is that rough-in -- code-compliant and
ADA-noncompliant simultaneously -- and the tile flags the `meets_ipc_only` case explicitly, because the
plumber met a code, just not this one. Between the two codes there are three inches of rough-in and two of
them do not work.

**Both dimensions fail from the generous side too.** The cross-check fixture's 20 in centerline is 2 in past
the maximum, because the grab bar has to be within reach from the seat, and its 20 in seat is over the 19 in
maximum, because a transfer works in both directions. The seat is measured to the **top of the seat** rather
than the rim, so a thick seat moves a compliant bowl either way -- a standard 15 in bowl can land under, a
comfort-height bowl over.

**The clearance is clearance, not a compartment outline.** 60 in from the side wall by 56 in from the rear
must be clear of *everything*, which is why a lavatory that fits the room comfortably can still fail by
standing in it. It is optional input and reports `null` rather than a pass when omitted.

**Flush controls are a purchasing decision.** They go on the open side except in an ambulatory compartment,
and handing is chosen when the fixture is ordered rather than when it is set.

## 3. Scope

A fixture location screen, not a rough-in drawing. Not checked: grab bars, whose required reaches interact
with the centerline; the toilet compartment, which has its own tile; whether the flush control meets the
operable-parts requirements; dispensers, which routinely intrude into the clearance; the clear floor space;
the fixture's own rough-in and carrier; children's-use dimensions; and state and local law and the plumbing
code, whose 15 in is a minimum rather than a target.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `grab-bar-layout`,
`accessible-toilet-compartment`, `fixture-clearance-check`, and `knee-toe-clearance`. The tools-data row
sits inside the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the
centerline window at seven points with the too-close flag and the IPC-only flag both tracked, exact
non-negative deficits on both sides of each window, the seat window with too-high proven not to be
too-low, the clearance at five pairs with each side failing alone and the area arithmetic, optional
clearance returning `null` with either dimension counting as entered, the flush rule and its lifting in an
ambulatory compartment, that every check fails independently, and every error seam.
