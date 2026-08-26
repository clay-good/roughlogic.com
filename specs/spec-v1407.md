# roughlogic.com Specification v1407 -- Press Brake Bending Tonnage, Die Opening, and Flange Limits (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes bend allowance and multi-bend flat patterns, but not whether the brake can make the bend. Tonnage, the die opening that sets it, the minimum flange the die opening permits, and the inside radius the die produces are one linked set of numbers, and getting the first one wrong bends the machine instead of the part.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive thickness, die opening, bend length, or material factor, or a die opening below the material thickness, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the air-bending tonnage relation P = 575 t^2 / V for mild steel with a material factor, and the die-opening rules of thumb for minimum flange and natural inside radius, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `press-brake-tonnage` -- Press Brake Bending Tonnage, Die Opening, and Flange Limits

```
tons per foot   = 575 x t^2 / V x material factor      (t and V in inches)
total tonnage   = tons per foot x bend length in feet
die opening     = commonly 8 x t for mild steel up to about 1/4 in
minimum flange  = about 0.75 x V
inside radius   = about 0.156 x V   (air bending, mild steel)
```

Air bending tonnage rises with the *square* of thickness and falls inversely with the die opening. Both halves
matter. Doubling material thickness quadruples the tonnage; opening the die halves it. That trade -- more tonnage
in a narrow die, less in a wide one -- is the central decision at the brake, and it is not free, because the die
opening also sets the inside radius and the smallest flange the part can have.

The minimum flange is the constraint that surprises people. A flange shorter than roughly three quarters of the
die opening will not sit on both die shoulders, so it will not bend -- it slips into the vee and the part is
scrap. On thick material in a wide die that minimum can be well over an inch, and a design with a half-inch
flange in quarter-inch plate is simply not air-bendable in the ordinary way.

**Inputs:** material thickness, die opening (or the multiplier to derive it), bend length, material factor
relative to mild steel, and the target inside radius.

**Outputs:** tons per foot, total tonnage, die opening, minimum flange, natural inside radius, and the ratio of
the achieved radius to the material thickness.

## 3. Worked example

A 4 ft bend in 0.250 in mild steel in an 8t (2.000 in) die:

```
tons per foot  = 575 x 0.250^2 / 2.000  = 17.97 tons/ft
total tonnage  = 17.97 x 4              = 71.9 tons
minimum flange = 0.75 x 2.000           = 1.50 in
inside radius  = 0.156 x 2.000          = 0.312 in   (1.25 x material thickness)
```

Seventy-two tons for a four-foot bend in quarter-inch plate, which most shop brakes will do. Now try to hold a
tighter radius by moving to a 1.000 in die: the tonnage doubles to 35.9 tons per foot and 144 tons total -- past
many brakes -- while the inside radius comes in to 0.156 in and the minimum flange drops to 0.75 in. And in the
other direction, stainless at a material factor near 1.5 takes 108 tons in the original die, half again as much,
for exactly the same geometry.

## 4. Scope and non-goals

Air bending, the common case. Bottoming and coining take several times the tonnage -- coining can take five to
ten times -- and are not covered by this relation. The 575 coefficient is the customary-unit constant for mild
steel of about 60,000 psi tensile; the material factor scales it, and it should come from the material's actual
tensile strength rather than a remembered figure. Springback is not modeled and is real, particularly on
high-strength material. The tile does not check the brake's tonnage-per-inch limit at the ram, which can be
exceeded by a short heavy bend even when the total tonnage is fine, and does not address tooling capacity, part
handling, or bend sequence. The press brake manufacturer's tonnage chart and the tooling supplier govern.
