# roughlogic.com Specification v1324 -- Oval (Obround) Tank Volume from Dipstick (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1323.md.
>
> **The gap.** `tank-volume` gauges a round (cylindrical) tank, but the ubiquitous residential heating-oil tank is
> **oval** -- an obround (stadium) cross-section, rounded on top and bottom -- which the round tile cannot do. This
> adds the partial volume of a horizontal oval tank from a dipstick depth: the "how many gallons of oil do I have"
> calc.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive dimension, a height below the width, or a negative depth returns `{ error }`; a depth beyond the
height clamps to the full tank; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the piecewise
circular-segment wetted area (the circular-segment relation as in Machinery's Handbook), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `oval-tank-volume` -- Oval (Obround) Tank Volume from Dipstick

```
r = W/2,  s = H - W                          (semicircle radius; straight middle run)
seg(t) = r^2 acos((r-t)/r) - (r-t) sqrt(2 r t - t^2)     (circular segment of radius r to height t)
wetted area(h) =  seg(h)                         for 0 <= h <= r        (bottom rounded end)
              =  pi r^2/2 + W (h - r)            for r < h <= r + s     (half-round + rectangle)
              =  (pi r^2 + W s) - seg(H - h)     for r + s < h <= H     (full minus empty top)
volume = wetted area x length
```

`W` is the inside width across the flats, `H` the inside height (rounded top to bottom), `L` the inside length, and
`h` the dipstick depth. The cross-section is a **stadium**: a rectangle capped top and bottom by semicircles. The
full area is `pi r^2 + W s`. The three regions join continuously (`seg(r) = pi r^2/2`).

**Inputs:** width W (in), height H (in), length L (in), dipstick depth h (in).

**Outputs:** liquid volume (gal, ft^3, in^3), percent full, and full-tank volume.

## 3. Worked example

A nominal 275-gallon oil tank, `W = 27 in`, `H = 44 in`, `L = 60 in`, dipstick at `22 in` (half height):

```
r = 13.5,  s = 17
full area = pi(13.5)^2 + 27 x 17 = 572.6 + 459 = 1031.6 in^2  ->  full = 61,896 in^3 = 268 gal
at h = 22 (= r + s/2, mid straight run): area = pi r^2/2 + 27(22 - 13.5) = 286.3 + 229.5 = 515.8 in^2
volume = 515.8 x 60 = 30,948 in^3 = 134 gal = 50.0% full
```

The full tank is 268 gallons -- the nominal "275" -- and by the up/down symmetry of the oval the half-height mark is
exactly half. That is the number a homeowner or a delivery driver reads off the tank stick.

## 4. Scope and non-goals

A horizontal oval (obround) tank standing with its rounded ends top and bottom, flat heads. A round tank is the
`tank-volume` tile; a wider-than-tall tank rotates the dimensions; dished heads and the exact factory strapping
chart are separate. A dipstick / takeoff aid; the tank's own chart governs custody transfer.
