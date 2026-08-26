# roughlogic.com Specification v1449 -- Floating Floor Row Layout, Balanced Rip, and Expansion Gap (calc-finish.js, Group E, finish trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E, finish trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog takes off carpet seams, tile counts, and hardwood quantities but nothing for a floating floor, where the layout decision that matters is made before the first plank goes down: how wide the last row will be. A layout that leaves a one-inch sliver at the wall is the most common and most visible mistake in the trade, and it is one division away from being avoided.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive room dimension, plank dimension, or expansion gap, a total expansion gap at or beyond the room dimension, or a waste factor below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the floating-floor balanced-rip layout convention (splitting the remainder between the first and last rows) and the manufacturer expansion-gap requirement, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `laminate-flooring-layout` -- Floating Floor Row Layout, Balanced Rip, and Expansion Gap

```
usable width  = room width - 2 x expansion gap
full rows     = floor(usable width / plank width)
last row      = usable width - full rows x plank width
balanced rip  = (last row + plank width) / 2      when the last row is too narrow
planks needed = ceil(area x (1 + waste factor) / plank area)
boxes         = ceil(area x (1 + waste factor) / coverage per box)
```

Two things are being solved and only one of them is quantity. The **quantity** half is ordinary: area, waste,
boxes. The **layout** half is the one that shows: divide the usable width by the plank width and look at the
remainder. If it comes out to a decent fraction of a plank, start with a full row and finish with the remainder.
If it comes out to a sliver -- under about two inches, or under a third of a plank -- rip *both* the first and the
last row to the average of the two, so the floor is symmetric and neither edge looks like an accident.

The expansion gap is not optional and it is not decorative. A floating floor is not fastened down; it grows and
shrinks with humidity as a single sheet, and if it reaches the wall it has nowhere to go but up. The gap is
covered by base or shoe, which is fastened to the *wall* and never to the floor -- pinning the floor through the
base is the same failure by another route.

**Inputs:** room width and length, plank width and length, required expansion gap, minimum acceptable last-row
width, coverage per box, waste factor.

**Outputs:** usable width, full rows, last-row width, whether a balanced rip is needed and the resulting first
and last row widths, plank count, and box count.

## 3. Worked example

A 12 ft x 15 ft room (180 sq ft), planks 7.5 in x 48 in (2.5 sq ft each), 1/4 in expansion gap, 8% waste, boxes
covering 20 sq ft:

```
usable width = 144 - 0.5              = 143.5 in
full rows    = floor(143.5 / 7.5)     = 19 rows
last row     = 143.5 - 142.5          = 1.0 in    -> far too narrow
balanced rip = (1.0 + 7.5) / 2        = 4.25 in for the first AND last row
planks       = ceil(180 x 1.08 / 2.5) = 78 planks
boxes        = ceil(194.4 / 20)       = 10 boxes
```

Nineteen full rows between two 4.25 in ripped rows, instead of nineteen full rows and a one-inch sliver -- the
same material, the same labor, and a floor that looks intentional. Note also the box rounding: 10 boxes is 200 sq
ft for a 180 sq ft room, so there is a full box of attic stock, which is exactly what should happen. A floating
floor cannot be patched from a later dye lot.

## 4. Scope and non-goals

Rectangular rooms, one at a time. It does not lay out across a doorway into an adjoining room, where the rows have
to be continuous and the layout is driven by the largest space or by the transition, and it does not handle
diagonal or herringbone layouts, which carry much higher waste. End-joint stagger, which the manufacturer
specifies as a minimum offset and which drives how the cut-off from each row is reused, is not modeled and it
changes the effective waste factor. The tile does not address subfloor flatness and moisture, which is what
actually causes most floating floor failures, underlayment, transitions, or the maximum uninterrupted run length
that manufacturers impose before an expansion joint is required. The flooring manufacturer's installation
instructions -- which are also the warranty terms -- govern.
