# roughlogic.com Specification v1312 -- Frustum (Truncated Cone) Volume and Surface (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication), no new module or dependency. Inherits spec.md through spec-v1311.md.
>
> **The gap.** `cone-flat-pattern` develops the flat pattern of a cone, but nothing gives the **volume** of a
> frustum -- a truncated cone, the shape of a hopper, a bucket, a tapered footing or pier, a stockpile with a flat
> top, or a round-to-round transition. This adds the frustum volume (in ft^3, gallons, and yd^3) plus its slant
> height and lateral surface area.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive height, or a negative diameter returns `{ error }`; the top diameter may be 0 (a full cone); no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the conical frustum volume
`V = (pi h/12)(D^2 + D d + d^2)` and lateral surface `pi(R + r) L` (standard solid geometry; Machinery's Handbook),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `frustum-volume` -- Frustum (Truncated Cone) Volume and Surface

```
V = (pi h / 12)(D^2 + D d + d^2)        volume (D, d the two diameters, h the height)
L = sqrt(h^2 + (R - r)^2)               slant height (R = D/2, r = d/2)
lateral area = pi (R + r) L             the sloped side (no ends)
```

`D` and `d` are the large and small diameters and `h` the vertical height. Setting the top diameter `d = 0` gives a
full cone, `V = pi D^2 h/12`; setting `d = D` gives a cylinder. The volume is reported in cubic feet, US gallons,
and cubic yards so it serves a liquid fill, a concrete pour, or a material takeoff.

**Inputs:** large diameter D (ft), small diameter d (ft, 0 for a full cone), height h (ft).

**Outputs:** volume (ft^3, gallons, yd^3), slant height (ft), and lateral surface area (ft^2).

## 3. Worked example

A hopper 6 ft across the top, 2 ft across the bottom, 4 ft tall:

```
V = (pi x 4 / 12)(6^2 + 6 x 2 + 2^2) = (pi x 4 / 12)(52) = 54.45 ft^3 = 407 gal = 2.02 yd^3
L = sqrt(4^2 + (3 - 1)^2) = 4.47 ft,  lateral area = pi(3 + 1)(4.47) = 56.2 ft^2
```

The hopper holds 54.5 ft^3 -- 407 gallons of liquid, or just over 2 cubic yards if you were pouring it in concrete
-- and its sloped wall is 56 ft^2 of plate. Note the volume is more than the average-diameter guess (pi x 4^2 x 4/4
= 50.3 ft^3): the frustum formula, not the mean diameter, is the right one.

## 4. Scope and non-goals

The volume, slant height, and lateral (side-only) surface of a right conical frustum; the end-disk areas, wall
thickness, an eccentric (offset) cone, and a pyramidal (flat-sided) hopper are separate. A takeoff aid; verify
against the drawing.
