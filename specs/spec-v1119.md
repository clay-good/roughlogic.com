# roughlogic.com Specification v1119 -- Masonry Fireplace Flue Area (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1118.md.
>
> **The gap.** The catalog's two chimney tiles are both about **pressure**: `chimney-draft` gives the
> theoretical draft from the density difference, and `chimney-height-for-draft` inverts it. Neither asks
> whether the flue is big enough in **cross section** for the fireplace it serves -- the first thing a
> mason or inspector checks, and the one that has a prescriptive code answer. Discovery batch 8: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
opening dimensions, a non-positive chimney height, or a missing flue dimension for the selected shape
return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Verification.** The three ratios were read from two independent code sources that agree word for word --
IRC R1003.15.1 and IBC 2113.16.1 -- and the 15-ft height condition from the older IRC 1001.12 phrasing,
which states it explicitly ("shall be permitted for chimneys that are a minimum of 15 feet in height").
My initial recall of the ratios was **wrong** (I had round at 1/10); checking caught it.

## 2. The tile

### 2.1 `fireplace-flue-area` -- Masonry Fireplace Flue Area (IRC R1003.15.1)

```
inputs:  opening_width_in, opening_height_in, flue_shape (rectangular|round),
         flue_inside_a_in, flue_inside_b_in, flue_inside_dia_in, chimney_height_ft
compute: opening   = w x h
         required  = opening / 12  round
                   = opening / 10  square, or rectangular under 2:1
                   = opening / 8   rectangular 2:1 or greater
         actual    = pi d^2/4  |  a x b
         min round dia = sqrt(4 (opening/12) / pi);  min square side = sqrt(opening/10)
outputs: opening_area_sqin, required_area_sqin, actual_area_sqin, surplus_sqin, adequate,
         ratio_actual, aspect_ratio, divisor, min_round_dia_in, min_square_side_in,
         height_ok, note
```

**Why shape changes the number.** A round flue moves smoke with the least loss and is allowed the smallest
fraction. A narrow rectangle wastes part of its cross section in the corners and the boundary layer, so at
2:1 or worse the code demands half again as much area. The tile classifies the shape from the dimensions
rather than asking the user to.

**The two traps it exists to catch.**
1. **Nominal is not net.** A "12-inch" clay liner is 12 in on the *outside*; inside it is about 11.5 x 11.5
   = 132 sq in, not 144. Sizing off the nominal number overstates the flue by 9%. The tile takes actual
   inside dimensions and says why.
2. **The 15-ft condition.** All three ratios are conditional on a chimney at least 15 ft from the firebox
   **floor** to the top of the flue. Below that, the code's Option 2 figure governs and wants more area.
   The tile flags it rather than returning a false pass.

**Worked examples (pinned).** A 36 x 29 in opening is 1,044 sq in. A 12-in nominal square liner nets
132.25 and clears the 104.4 required. A **10-in round pipe fails the same opening** -- 78.54 sq in against
87.0 required -- even though round gets the most generous fraction, which is exactly why 10-in round is the
classic undersize on a 36-in fireplace. The tile reports 10.52 in as the smallest compliant round diameter.

## 3. What is deliberately not here

The code's Option 2 sizing **figure** (R1003.15.2) and the clay flue liner area **tables** (R1003.14) are
code-document tables and are not reproduced. This is a flue-**area** screen only: a flue that passes can
still smoke from a short chimney, a bad termination, no combustion-air path, or a throat and smoke chamber
built wrong. The note says all of that, and links the draft tiles for the pressure side.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `chimney-draft`,
`chimney-height-for-draft`, `masonry-wall-weight`, and `step-flashing-count`. `check-module-sizes` cap for calc-masonry.js raised 15000 -> 18000. Fuzzer pins all three
ratios, the exact 2:1 aspect seam (2.00 takes the stricter 1/8, 1.999 does not), a/b interchangeability,
that the reported minimum sizes are precisely the sizes that make each shape break even, that they depend
only on the opening, the 15-ft seam and that height gates applicability without changing the ratio,
linearity in opening area, and every error seam.
