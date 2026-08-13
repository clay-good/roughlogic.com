# roughlogic.com Specification v1329 -- Paraboloid of Revolution Volume (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1328.md.
>
> **The gap.** `parabolic-segment` gives the 2D area and arc of a parabola and its own note flags the rest: "the
> volume of a parabolic dish are separate." This adds that solid of revolution -- a spun-cast dish, a parabolic
> reflector blank, a dished or parabolic vessel bottom, or the paraboloid the free surface of a spinning liquid takes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive base diameter or height, or a negative fill depth, returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the paraboloid-of-revolution volume `(1/2) pi R^2 H` and the apex-up
partial fill `pi R^2 y^2/(2H)` (standard solid geometry, Pappus / integration; Machinery's Handbook), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `paraboloid-volume` -- Paraboloid of Revolution Volume

```
Full:   V = (1/2) pi R^2 H
Fill:   V(y) = pi R^2 y^2 / (2H)   (measured up from the apex),   r(y) = R sqrt(y/H)
```

`R` is the base (rim) radius, `H` the height from rim to apex, and `y` the liquid depth measured up from the apex.
The full volume is **exactly half** the cylinder of the same base and height that boxes it -- halfway between the
cone's 1/3 and the cylinder's 1. Because a parabola runs the axial coordinate in proportion to `r^2`, the wetted
radius grows as `r(y) = R sqrt(y/H)` and the volume as `pi R^2 y^2/(2H)`: the dish fills as the **square** of the
depth, so `percent full = (y/H)^2`. A fill depth of or beyond `H` clamps to the full volume.

**Inputs:** base (rim) diameter D (ft), height rim-to-apex H (ft), fill depth from the apex y (ft, optional).

**Outputs:** full volume (ft^3 and gal), fill volume and percent full, liquid-surface radius at that depth.

## 3. Worked example

A dish with `D = 4 ft` (`R = 2 ft`), `H = 3 ft`, filled `y = 1.5 ft` from the apex:

```
Full:  V = (1/2) pi (2^2)(3) = 6 pi = 18.85 ft^3 = 141.0 gal
Fill:  V = pi (2^2)(1.5^2)/(2 x 3) = pi (4)(2.25)/6 = 1.5 pi = 4.71 ft^3 = 35.3 gal
       percent = (1.5/3)^2 = 25%   (half the height, a quarter of the volume)
```

Half-cylinder check: a `D = 10 ft`, `H = 6 ft` paraboloid holds `(1/2) pi (5^2)(6) = 235.62 ft^3 = 1,762.6 gal`,
exactly half the `pi (5^2)(6) = 471.24 ft^3` cylinder that encloses it.

## 4. Scope and non-goals

A paraboloid of revolution about its axis. A circular (spherical-cap) dish is the `spherical-cap-volume` tile; a
cone is `frustum-volume` with a zero top; a torispherical (ASME F&D) head is `vessel-head-volume`. An off-axis or
tilted paraboloid is separate. A shop and takeoff aid; verify critical dimensions on the work.
