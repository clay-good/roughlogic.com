# roughlogic.com Specification v1315 -- Spherical Cap / Dome Volume (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1314.md.
>
> **The gap.** The catalog has cylinder, cone, and frustum volumes but no **sphere** volume -- and specifically no
> spherical cap, the partial fill of a spherical tank, the volume of a dome or a dished tank bottom, or a
> hemispherical vessel. This adds the spherical-cap volume, the full-sphere volume, and the percent full, from the
> sphere diameter and a fill depth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive sphere diameter, a non-positive fill depth, or a fill depth exceeding the diameter returns
`{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the spherical-cap volume
`V = (pi h^2/3)(3R - h)` and the full-sphere volume `(4/3) pi R^3` (standard solid geometry; Machinery's Handbook),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `spherical-cap-volume` -- Spherical Cap / Dome / Partial-Fill Volume

```
R = D/2
V_cap = (pi h^2 / 3)(3R - h)            cap (or fill) of depth h up from the bottom
V_full = (4/3) pi R^3                    the whole sphere
percent full = V_cap / V_full
```

`D` is the sphere diameter and `h` the depth measured from the bottom of the sphere up to the liquid line (or the
height of a dome). At `h = R` the cap is a hemisphere (exactly half the sphere); at `h = D` it is the full sphere.
Volume is reported in cubic feet and US gallons for a dipstick or a takeoff.

**Inputs:** sphere diameter D (ft), fill depth / cap height h (ft).

**Outputs:** cap volume (ft^3 and gallons), full-sphere volume, and the percent full.

## 3. Worked example

A 10 ft diameter spherical tank filled to a 3 ft depth:

```
R = 5,  V_cap = (pi x 3^2 / 3)(3 x 5 - 3) = (pi x 3)(12) = 113.1 ft^3 = 846 gal
V_full = (4/3) pi 5^3 = 523.6 ft^3,  percent full = 113.1 / 523.6 = 21.6%
```

Three feet of liquid in a 10 ft sphere is only 846 gallons -- 21.6% full, not 30%, because the sphere is narrow near
the bottom. Fill it to the 5 ft centerline and it is exactly half (1,958 gal); to the top, the full 3,917 gal. That
curvature is why a spherical (or dished-bottom) tank needs this formula, not a straight-sided estimate.

## 4. Scope and non-goals

The spherical-cap volume (a partial sphere, dome, or dished bottom) and the full-sphere volume; a spherical zone
between two levels, an ellipsoidal (2:1) tank head, and the surface area are separate. A takeoff / dipstick aid;
verify against the tank chart or drawing.
