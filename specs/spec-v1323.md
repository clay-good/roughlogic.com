# roughlogic.com Specification v1323 -- Spherical Zone (Segment of Two Bases) Volume (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1322.md.
>
> **The gap.** `spherical-cap-volume` gives the volume of a sphere up to one flat face, and its own note flags the
> rest: "a spherical zone between two levels ... are separate." This adds the **spherical zone** -- the slice of a
> sphere between two parallel planes -- the incremental volume between two levels in a spherical tank, a spherical
> band, or a dome zone.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive height, both base radii zero, or a negative radius returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the spherical-zone prismatoid volume `(pi h/6)(3 r1^2 + 3 r2^2 + h^2)`
(standard solid geometry; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `spherical-zone-volume` -- Spherical Zone (Segment of Two Bases) Volume

```
V = (pi h/6)(3 r1^2 + 3 r2^2 + h^2)
```

`r1` and `r2` are the radii of the two flat circular faces and `h` the perpendicular distance between the two
parallel planes. This is the prismatoid rule, so it needs only the two face radii and the height, **not** the parent
sphere's radius. When the top base `r2 = 0` it collapses to the spherical cap `(pi h^2/3)(3R - h)` (proven below),
so it cross-checks against `spherical-cap-volume`.

**Inputs:** lower base radius r1 (ft), upper base radius r2 (ft), zone height h (ft).

**Outputs:** zone volume (ft^3 and gal).

## 3. Worked example

A spherical zone with `r1 = 4 ft`, `r2 = 3 ft`, `h = 2 ft`:

```
V = (pi x 2/6)(3 x 16 + 3 x 9 + 2^2) = (pi/3)(48 + 27 + 4) = (pi/3)(79) = 82.73 ft^3 = 619 gal
```

Cap reduction: on a sphere of radius `R = 5 ft`, a cap of depth `h = 3 ft` has a face radius
`r1 = sqrt(2Rh - h^2) = sqrt(21)`. The zone with `r2 = 0` gives `(pi x 3/6)(3 x 21 + 9) = 113.10 ft^3`, exactly the
spherical-cap-volume of the same sphere and depth -- the built-in cross-check.

## 4. Scope and non-goals

The spherical zone (segment of two bases). One base zero is the spherical cap (`spherical-cap-volume`); the lateral
zone surface `2 pi R h` (which needs the sphere radius), and an ellipsoidal or off-axis zone, are separate. A
takeoff aid; verify against the tank chart or drawing.
