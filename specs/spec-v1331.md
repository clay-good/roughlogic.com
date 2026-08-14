# roughlogic.com Specification v1331 -- Barrel / Cask Volume (Bulged Sides) (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1330.md.
>
> **The gap.** The whole tank-volume family assumes STRAIGHT cylinder walls. A barrel, cask, bulged steel drum, or
> rain barrel swells to a larger middle (bung) diameter than its ends -- a shape none of the straight-wall tiles
> capture. This adds the classic barrel volume (Kepler's barrel rule).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive dimension, or a head diameter greater than the bung diameter (not a barrel), returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the parabolic-staves and circular-staves barrel
volumes (standard solid geometry; Kepler's barrel rule; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `barrel-volume` -- Barrel / Cask Volume (Bulged Sides)

```
Parabolic staves (exact for a parabolic profile):  V = (pi L/15)(2 D^2 + D d + 3/4 d^2)
Circular-arc staves (Kepler's approximation):      V = (pi L/12)(2 D^2 + d^2)
```

`D` is the bung (middle, maximum) diameter, `d` the head (end) diameter, and `L` the length, all inside dimensions in
inches. A real barrel's stave profile lies between a parabola and a circular arc, so the two forms **bracket** the
true volume (typically under 1% apart). Both reduce **exactly** to the straight cylinder `pi (D/2)^2 L` when
`D = d`, so a nearly straight drum reads like a cylinder. Reported in US gallons (231 in^3) and cubic feet.

**Inputs:** bung (middle) diameter D (in), head (end) diameter d (in), length L (in).

**Outputs:** parabolic volume (gal, ft^3, in^3), circular-arc estimate (gal).

## 3. Worked example

A barrel with bung `D = 27 in`, head `d = 24 in`, length `L = 36 in`:

```
Parabolic:  V = (pi x 36/15)(2 x 27^2 + 27 x 24 + 3/4 x 24^2) = (pi x 2.4)(1458 + 648 + 432) = 19,136 in^3 = 82.84 gal
Circular:   V = (pi x 36/12)(2 x 27^2 + 24^2)                 = (pi x 3)(1458 + 576)          = 19,170 in^3 = 82.99 gal
```

The parabolic form matches a direct numerical integration of the parabolic profile to six figures; the two forms
differ by 0.18%. Collapse check: with `D = d = 24 in`, both give `pi (12)^2 (36) = 16,286 in^3 = 70.50 gal`, the
straight cylinder.

## 4. Scope and non-goals

The idealized staved barrel (bung diameter >= head diameter). The straight-wall tank is the `tank-volume` tile and a
conical taper is `tapered-tank-volume`; a partial (dipstick) fill of a barrel, and the exact profile of a specific
cooperage, are separate. A takeoff aid; a strapping chart or a water fill governs custody transfer.
