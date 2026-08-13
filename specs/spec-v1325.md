# roughlogic.com Specification v1325 -- Cone-Bottom Tank Volume from Dipstick (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1324.md.
>
> **The gap.** `tank-volume` gauges a flat-bottom cylinder, but the poly, process, and feed tank has a **conical
> (hopper) bottom** so it drains clean. This adds the partial volume of a vertical cone-bottom tank from a dipstick
> depth measured up from the apex -- the "gallons at this level" calc the flat-bottom tile cannot give.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive dimension or a negative depth returns `{ error }`; a depth beyond the total height clamps to the full
tank; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the cone-plus-cylinder partial volume
(standard solid geometry; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `cone-bottom-tank-volume` -- Cone-Bottom Tank Volume from Dipstick

```
R = D/2
volume(h) =  (pi R^2/(3 Hc^2)) h^3                 for 0 <= h <= Hc     (cone from the apex, r(h) = R h/Hc)
          =  (1/3) pi R^2 Hc + pi R^2 (h - Hc)     for Hc < h <= Hc+Hcyl (full cone + straight cylinder)
full      =  (1/3) pi R^2 Hc + pi R^2 Hcyl
```

`D` is the inside diameter, `Hc` the cone (bottom) height, `Hcyl` the straight-side (cylinder) height, and `h` the
dipstick depth measured up from the bottom apex. The two regions join continuously at `h = Hc` (both give the full
cone). Because the cone volume grows as `h^3`, the tank fills slowly near the tip and the reading is very non-linear
low in the cone.

**Inputs:** diameter D (ft), cone height Hc (ft), cylinder height Hcyl (ft), depth from apex h (ft).

**Outputs:** liquid volume (ft^3 and gal), percent full, and full-tank volume.

## 3. Worked example

A 6 ft tank with a 3 ft cone and an 8 ft straight side, dipstick at 6 ft (3 ft up into the cylinder):

```
R = 3;  cone full = (1/3) pi (9)(3) = 28.27 ft^3;  full = 28.27 + pi(9)(8) = 254.5 ft^3 = 1,904 gal
at h = 6:  28.27 + pi(9)(6 - 3) = 28.27 + 84.82 = 113.1 ft^3 = 846 gal = 44.4% full
```

The full tank is 1,904 gallons. Low in the cone the cube law bites: 1.5 ft (half the cone height) holds
`(pi R^2/(3 Hc^2))(1.5)^3 = 3.53 ft^3` (26 gal), exactly an eighth of the full cone -- a straight-side guess would
badly over-read a low stick.

## 4. Scope and non-goals

A vertical tank with a right conical bottom concentric with the cylinder, apex down, and an open (flat) top. A
flat-bottom tank is the `tank-volume` tile; a dished or sloped bottom, an offset cone, and the exact factory
strapping chart are separate. A dipstick / takeoff aid; the tank's own chart governs custody transfer.
