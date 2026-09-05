# roughlogic.com Specification v1469 -- Shaft Alignment Offset and Angularity (Rim-and-Face) (`calc-millwright.js`, Group S, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group S, millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Shaft misalignment is the largest single cause of premature coupling, seal, and bearing failure on rotating equipment, and the rim-and-face method is how most of it still gets corrected in the field. Two dial readings become four shim and move numbers through arithmetic that is easy to invert by a sign and that no tile in the catalog does.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive face diameter or foot distance, or a foot distance ordering that puts the rear foot closer than the front returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the rim-and-face geometry as standard millwright practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rim and face alignment`, `shaft alignment dial indicator`, `coupling offset angularity`, `alignment shim calculation`, `millwright alignment move`.

## 2. The tile

### 2.1 `shaft-alignment-rim-face` -- Shaft Alignment Offset and Angularity (Rim-and-Face)

```
offset at coupling    O = rim TIR / 2
angularity            A = face TIR / face diameter        (in/in)
front foot move       M1 = O + A x L1
rear foot move        M2 = O + A x L2
                      (L measured from the coupling face to each foot)
```

The rim reading sees pure offset and reads twice it, because the indicator crosses the misalignment on both
sides of the sweep -- forgetting the divide-by-two is the classic doubling error. The face reading sees pure
angularity, expressed as a slope once divided by the diameter the indicator swept.

Both then project out to the feet, and that projection is why a small angularity is worse than a large offset:
angularity multiplies by the distance to the foot, so a 0.001 in/in slope becomes 0.020 in of shim at a foot 20
in away. Correct the angle first and the offset second, because moving to fix an angle changes the offset but not
the reverse.

**Inputs:** rim total indicator reading, face total indicator reading, the diameter the face indicator swept, and the distance from the coupling face to the front and rear feet of the movable machine

**Outputs:** the offset at the coupling, the angularity as a slope and in mils per inch, the vertical move required at each foot with sign, and the shim to add or remove at each foot

## 3. Worked example

A rim TIR of -0.020 in and a face TIR of +0.006 in swept on a 6 in diameter, with the movable machine's
front foot 8 in and rear foot 20 in from the coupling face:

```
O  = -0.020 / 2        = -0.0100 in
A  = +0.006 / 6        = +0.00100 in/in = 1.00 mils/in
M1 = -0.0100 + 0.00100 x 8 = -0.0020 in at the front foot
M2 = -0.0100 + 0.00100 x 20 = +0.0100 in at the rear foot
```

Both feet come UP, the rear one by 0.0100 in and the front by -0.0020 in -- a difference of
0.0120 in, which is the angle. Note how the angularity dominates at the rear foot: of that
0.0100 in, only -0.0100 in is offset and 0.0200 in is the projected angle. A crew that shimmed both
feet equally to the offset would leave the entire angular error in place.

## 4. Scope and non-goals

Vertical (shim) correction for a two-machine train with a single coupling, rim-and-face bracket setup. It does
not handle the horizontal move, which is the same arithmetic on a second set of readings taken at the sides. It
does not correct for bracket sag, which on a long bracket is easily larger than the misalignment being measured
and must be measured on a pipe and subtracted before any of this is valid. It assumes the coupling faces are
square to their shafts and the shafts are straight; a bent shaft or a face runout reads as misalignment and is
not. Soft foot must be corrected first (`soft-foot-correction`) or every number here is fiction, and thermal
growth (`alignment-thermal-growth`) must be applied as a deliberate cold offset. The coupling manufacturer's
alignment tolerance and the machine manufacturer's installation instructions govern.
