# roughlogic.com Specification v1322 -- Horizontal Tank Volume with Dished Heads (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1321.md.
>
> **The gap.** `tank-volume` gauges a horizontal or vertical cylinder from a dipstick reading but assumes **flat
> ends**, and its own note flags it: "dished or hemispherical heads hold more and need a head-type correction."
> Real fuel, chemical, and propane storage tanks have **dished heads**. This adds the partial volume of a horizontal
> tank whose two heads are 2:1 semi-elliptical (the common ASME dished head) or hemispherical.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive diameter or shell length, or a negative depth, returns `{ error }`; a depth beyond the diameter
clamps to the full tank; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the circular-segment
prism shell and the affine-scaled spherical-cap head fill (standard tank-gauging geometry; Machinery's Handbook;
API 2551 strapping practice), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `tank-volume-dished-heads` -- Horizontal Tank Volume with Dished Heads (Dipstick)

```
R = D/2
shell = [R^2 acos((R-h)/R) - (R-h) sqrt(2Rh - h^2)] x L      (the flat-end tank-volume shell)
b = R/2  (2:1 semi-elliptical head)   or   b = R  (hemispherical head)
heads = (b/R)(pi h^2/3)(3R - h)                              (the two heads form an ellipsoid; affine-scaled cap)
volume = shell + heads
full   = pi R^2 L + (b/R)(4/3) pi R^3
percent full = 100 x volume/full
```

`D` is the inside diameter, `L` the **straight-shell (seam-to-seam) length**, and `h` the liquid depth. The two
dished heads back-to-back form an ellipsoid of revolution, so the partial fill of the pair is the sphere's
spherical cap `(pi h^2/3)(3R - h)` scaled by the head-depth ratio `b/R`. Flat heads (`b = 0`) add nothing and are
the `tank-volume` tile.

**Inputs:** head type (2:1 elliptical / hemispherical), diameter D (ft), straight-shell length L (ft), depth h (ft).

**Outputs:** liquid volume (ft^3 and gal), percent full, the shell/heads split, and the full-tank volume.

## 3. Worked example

An 8 ft diameter, 20 ft straight-shell tank with 2:1 elliptical heads, filled to 4 ft (half the diameter):

```
shell = [4^2 acos(0) - 0] x 20 = 16 x (pi/2) x 20 = 502.65 ft^3
heads = 0.5 x (pi 4^2/3)(3 x 4 - 4) = 0.5 x 134.04 = 67.02 ft^3
volume = 569.68 ft^3 = 4,261 gal,  percent full = 50.0%
```

Half the diameter is exactly half the tank (569.68 of 1,139.35 ft^3). The same tank with hemispherical heads holds
4,763 gal (the heads add a full sphere), and with flat ends only 3,760 gal -- the dished heads add 13% to 27% of
the flat-end reading, the difference between a right and a wrong tank chart.

## 4. Scope and non-goals

A horizontal cylinder with two 2:1 semi-elliptical or two hemispherical heads. Flat heads are the `tank-volume`
tile; a vertical tank with a dished bottom, a torispherical (ASME flanged-and-dished) head (slightly shallower than
a true 2:1 ellipse, so this is a close approximation), and a partially dished single-head tank are separate. A
takeoff / dipstick aid; the tank's strapping chart governs custody transfer.
