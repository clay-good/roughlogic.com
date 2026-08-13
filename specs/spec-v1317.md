# roughlogic.com Specification v1317 -- Truncated Pyramid (Rectangular Frustum) Volume (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/construction), no new module or dependency. Inherits spec.md through spec-v1316.md.
>
> **The gap.** `frustum-volume` (spec-v1312) gives the volume of a truncated *cone* (round), but nothing handles a
> truncated *pyramid* (rectangular) -- the exact shape of a tapered concrete pier or spread-footing pedestal, a
> rectangular hopper or bin, or a round-to-rectangular transition's rectangular part. This adds the prismatoid
> volume, reported for a concrete pour or a material takeoff.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive height, a negative dimension, or a top dimension exceeding the bottom returns `{ error }`; a top of
0 x 0 is a full pyramid; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the truncated-pyramid
volume `V = (h/3)(A1 + A2 + sqrt(A1 A2))` (the prismatoid formula; standard solid geometry; Machinery's Handbook),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `pyramid-frustum-volume` -- Truncated Pyramid (Rectangular Frustum) Volume

```
A1 = Lb x Wb        A2 = Lt x Wt            bottom and top areas
V = (h/3)(A1 + A2 + sqrt(A1 A2))
```

`Lb, Wb` are the bottom length and width, `Lt, Wt` the top, and `h` the vertical height. The `sqrt(A1 A2)` middle
term is what makes it exact -- averaging the two areas (or the two footprints) understates the volume. A top of
0 x 0 gives a full pyramid (`V = A1 h/3`); equal top and bottom give a rectangular prism (`A1 h`).

**Inputs:** bottom length and width, top length and width, height (all ft).

**Outputs:** volume in cubic feet, cubic yards, and US gallons.

## 3. Worked example

A tapered pier: 6 x 6 ft at the base, 2 x 2 ft at the top, 4 ft tall:

```
A1 = 36,  A2 = 4
V = (4/3)(36 + 4 + sqrt(36 x 4)) = (4/3)(36 + 4 + 12) = (4/3)(52) = 69.33 ft^3 = 2.57 yd^3
```

The pier takes 69.3 ft^3 -- 2.57 cubic yards of concrete. Averaging the footprints (a 4 x 4 mean, 16 ft^2 x 4 =
64 ft^3) would short the pour by 5 ft^3; the prismatoid formula is the right one. Drop the top to 0 x 0 and it
becomes a full pyramid at 48 ft^3.

## 4. Scope and non-goals

The volume of a right truncated rectangular pyramid (a rectangular frustum); the round (conical) frustum is
`frustum-volume`, and an offset (oblique) pyramid, wall thickness, and surface area are separate. A takeoff aid;
verify against the drawing.
