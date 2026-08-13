# roughlogic.com Specification v1326 -- Tapered (Frustum) Tank Volume from Level (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1325.md.
>
> **The gap.** `frustum-volume` gives a full truncated cone, but a tapered silo, hopper, or process tank needs the
> **gallons at a dipstick level**. This adds the partial volume of a straight-tapered (frustum) tank from a depth
> measured up from the bottom -- closing out the tank partial-volume family (round, dished-head, oval, cone-bottom,
> tapered).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive dimension or a negative depth returns `{ error }`; a depth beyond the height clamps to the full tank;
no numeric field is ever `Infinity`. Citation discipline (v19/v22): the frustum partial volume (standard solid
geometry; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `tapered-tank-volume` -- Tapered (Frustum) Tank Volume from Level

```
R1 = D1/2 (bottom),  R2 = D2/2 (top)
r(h) = R1 + (R2 - R1) h/H
volume(h) = (pi h/3)(R1^2 + R1 r(h) + r(h)^2)          0 <= h <= H
full      = (pi H/3)(R1^2 + R1 R2 + R2^2)
```

`D1` is the inside bottom diameter, `D2` the top diameter, `H` the height, and `h` the dipstick depth up from the
bottom. The liquid up to `h` is itself a cone frustum, so the same frustum rule applies with the local top radius
`r(h)`. A widening tank (`R2 > R1`) fills fastest near the top; a narrowing hopper (`R2 < R1`) fills fastest near the
bottom; equal diameters give a straight cylinder.

**Inputs:** bottom diameter D1 (ft), top diameter D2 (ft), height H (ft), depth h (ft).

**Outputs:** liquid volume (ft^3 and gal), percent full, and full-tank volume.

## 3. Worked example

A tank tapering from 4 ft at the bottom to 10 ft at the top over 12 ft, dipstick at 6 ft:

```
R1 = 2, R2 = 5;  r(6) = 2 + (5 - 2)(6/12) = 3.5
volume = (pi x 6/3)(2^2 + 2 x 3.5 + 3.5^2) = 2 pi (4 + 7 + 12.25) = 146.1 ft^3 = 1,093 gal
full   = (pi x 12/3)(4 + 10 + 25) = 4 pi (39) = 490.1 ft^3 = 3,666 gal  ->  29.8% full
```

The tank holds 3,666 gallons full, yet is only 29.8% full at its halfway height -- because a widening tank packs most
of its volume up top, the stick reads far below half at the midpoint.

## 4. Scope and non-goals

A right (concentric) cone frustum with flat top and bottom. A bottom cone under a straight cylinder is the
`cone-bottom-tank-volume` tile; a pure cylinder is `tank-volume`; a dished or offset shape is separate. A dipstick /
takeoff aid; the tank's own chart governs custody transfer.
