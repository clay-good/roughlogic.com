# roughlogic.com Specification v1318 -- Torus Volume and Surface Area (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1317.md.
>
> **The gap.** The catalog now has cylinder, cone, frustum, pyramid, and sphere volumes, but no **torus** -- the
> doughnut shape of an O-ring, an inner tube or toroidal float, a ring-shaped (doughnut) tank, or a coil of tubing.
> This adds the torus volume and surface area from the ring's centerline diameter and the tube diameter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive center or tube diameter, or a tube diameter exceeding the centerline diameter (a self-intersecting
torus) returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the torus volume
`V = 2 pi^2 R r^2` and surface area `4 pi^2 R r` (Pappus's theorem / standard solid geometry; Machinery's Handbook),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `torus-volume` -- Torus (Doughnut) Volume and Surface Area

```
R = Dc/2 (ring centerline radius),  r = dt/2 (tube radius)
V = 2 pi^2 R r^2
surface area = 4 pi^2 R r
```

`Dc` is the diameter of the ring's centerline (through the middle of the tube all the way around) and `dt` the
diameter of the tube itself. Both follow from Pappus's theorem: the tube's cross-section area `pi r^2` (or its
circumference `2 pi r`) swept around the ring path of circumference `2 pi R`. The tube must be no fatter than the
ring (`dt <= Dc`) or the doughnut closes its hole.

**Inputs:** ring centerline diameter Dc (in), tube diameter dt (in).

**Outputs:** volume (in^3, ft^3, and US gallons) and surface area (in^2).

## 3. Worked example

An O-ring / small tube ring, 12 in centerline diameter, 2 in tube:

```
R = 6,  r = 1
V = 2 pi^2 (6)(1^2) = 118.4 in^3 = 0.513 gal
surface area = 4 pi^2 (6)(1) = 236.9 in^2
```

The ring holds 118 in^3 (about half a gallon) and wraps 237 in^2 of surface. Scale it up to a 36 in ring of 6 in
tube -- a doughnut float or toroidal tank -- and it jumps to 3,198 in^3 (13.8 gal), the cube-ish growth of any
solid with size.

## 4. Scope and non-goals

The volume and surface of a ring (non-self-intersecting) torus of circular cross-section; a partial fill of a
toroidal tank, an elliptical or square tube cross-section, and wall thickness are separate. A takeoff aid; verify
against the drawing.
