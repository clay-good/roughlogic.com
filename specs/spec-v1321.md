# roughlogic.com Specification v1321 -- Circular Sector Area and Arc (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1320.md.
>
> **The gap.** `circular-segment-area` gives the area between a chord and its arc, but nothing gives the **sector** --
> the pie slice between two radii and the arc. It is a curved patio or bed, a sprinkler's coverage wedge, a gear or
> cam sector, a fan-shaped ramp, or any "part of a circle" set by a radius and an angle. This adds the sector area,
> arc length, chord, and perimeter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive radius, or a central angle outside 0-360 degrees returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the circular sector area `(1/2) r^2 theta` and arc length `r theta`
(standard plane geometry; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `circular-sector` -- Circular Sector (Pie Slice) Area and Arc

```
theta_rad = angle x pi/180
area = (1/2) r^2 theta_rad = (angle/360) pi r^2
arc length = r theta_rad
chord = 2 r sin(theta/2)
perimeter = arc + 2 r
```

`r` is the radius and `angle` the central angle. The sector is the fraction `angle/360` of the whole circle, so its
area and arc scale straight with the angle. A full 360 degrees gives the circle (`pi r^2`, `2 pi r`); the chord is
the straight distance across the open mouth.

**Inputs:** radius r, central angle (deg).

**Outputs:** sector area, arc length, chord, and perimeter (arc plus the two radii).

## 3. Worked example

A 5 ft radius sector opening 60 degrees:

```
area = (60/360) pi (5^2) = 13.09 ft^2
arc = 5 x (pi/3) = 5.236 ft,  chord = 2 x 5 sin30 = 5.00 ft
perimeter = 5.236 + 2 x 5 = 15.24 ft
```

The wedge covers 13.1 ft^2 with a 5.24 ft curved edge and a 5.0 ft chord across the mouth -- the numbers to sod the
bed, run the border, or lay out a fan of pavers. Open it to the full 360 degrees and it becomes the circle,
78.5 ft^2 and a 31.4 ft circumference.

## 4. Scope and non-goals

The circular sector (bounded by two radii and the arc); the segment (bounded by a chord and the arc) is
`circular-segment-area`, and the volume of a cylindrical wedge is separate. Plane figure only. A shop and layout
aid; verify critical dimensions on the work.
