# roughlogic.com Specification v1144 -- Auxiliary Condensate Drain Pan (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-hvacservice.js`** (Group C), no new module, group, or dependency. Inherits spec.md through
> spec-v1143.md.
>
> **The gap.** `condensate-drain` sizes the primary line and `condensate-trap-depth` sets the trap.
> Nothing covered the **overflow protection** that has to sit behind them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
method, or a non-positive unit or pan dimension when a pan method is selected, return `{ error }`.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `condensate-overflow-pan` -- Auxiliary Condensate Drain Pan (IRC M1411.3.1)

```
inputs:  method, unit_width_in, unit_length_in, pan_width_in, pan_length_in, pan_depth_in
compute: required pan = unit + 3 in in WIDTH and in LENGTH   (overall, not per side)
         minimum depth 1.5 in
         pan checks apply only to the two methods that use a pan
outputs: method_text, needs_pan, required_width_in, required_length_in, width_ok, length_ok,
         depth_ok, width_deficit_in, length_deficit_in, depth_deficit_in, pan_area_sf,
         misread_width_in, misread_length_in, oversized, passes, note
```

**One sentence carries the tile.** The pan shall be not less than 3 in larger than the unit or coil in
**width and length** -- 3 in on the *overall* dimension, not 3 in of clearance per side. A 21-in air
handler wants a **24-in** pan, not 27. The misreading runs in the expensive direction, in an attic where
the space and the money are not free, so the tile prints what the per-side reading would have demanded
and flags a pan that was evidently sized that way as compliant-but-oversized.

**Only two of the four methods use a pan at all.** The others rely on a separate overflow line connected
to the equipment pan **above** the primary connection (connect it level or below and it drains
continuously instead of signalling a blockage), or a UL 508 water-level device positioned above the
primary connection and below the overflow rim -- too low trips on normal operation, too high lets the pan
overflow before it acts. In a tight attic a device is frequently the practical answer, so a tile that only
knew about pans would push people the wrong way. Those methods skip the dimension checks entirely and
return `null` rather than a false verdict.

**And where a pan drain is used, "conspicuous" is the requirement.** The point is that an occupant sees
water somewhere odd and calls; a secondary drain routed quietly into the same place as the primary defeats
the method while appearing to satisfy it.

**The prior question, named and not answered:** the section applies where damage may occur from condensate
overflow -- in practice, equipment above a finished space.

## 3. Scope

Not checked: primary drain size and slope (the `condensate-drain` tile), material and support, trap
requirements and depth (`condensate-trap-depth`), where the discharge may legally terminate, pan material
and corrosion resistance, whether the pan must also catch a humidifier or water heater, and the listing of
any specific device.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `condensate-drain` (which now links
forward), `condensate-trap-depth`, and `cfm-per-ton`. Fuzzer pins both fixtures, the overall-margin rule
and the +6 misread figure across nine unit sizes with both seams exact, that depth is independent of the
footprint, non-negative deficits, that an oversized pan needs *both* dimensions oversized to be flagged,
that the two non-pan methods skip the checks and return `null`, that `pan-with-device` still needs a pan,
and every error seam.
