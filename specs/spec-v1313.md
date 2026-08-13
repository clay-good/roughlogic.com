# roughlogic.com Specification v1313 -- Regular Polygon Geometry (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1312.md.
>
> **The gap.** `polygon-miter` gives the miter angle to cut a regular polygon, and `bolt-circle` places holes, but
> nothing gives the **geometry** of a regular polygon -- the apothem, the across-flats and across-corners sizes, the
> interior angle, and the area. It is the everyday shop-and-layout math for a hex or octagon: a nut or stock across
> the flats, a gazebo or tank footprint, the reach of a polygonal frame.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a side count below 3, or a non-positive side length returns `{ error }`; no numeric field is ever `Infinity`.
Citation discipline (v19/v22): the regular-polygon relations -- apothem `s/(2 tan(pi/n))`, circumradius
`s/(2 sin(pi/n))`, area `n s^2/(4 tan(pi/n))` (standard plane geometry; Machinery's Handbook), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `regular-polygon` -- Regular Polygon (Apothem, Across Flats/Corners, Area)

```
interior angle = (n - 2) 180 / n
apothem a = s / (2 tan(pi/n))          center to the middle of a side
circumradius R = s / (2 sin(pi/n))     center to a corner
across flats = 2 a       across corners = 2 R       perimeter = n s
area = n s^2 / (4 tan(pi/n)) = (1/2)(perimeter)(apothem)
```

`n` is the number of sides and `s` the side length. The across-flats is the wrench size of a nut or the width of
hex stock; the across-corners is the diagonal; the apothem is the inradius (a circle that just touches each side).

**Inputs:** number of sides n, side length s (any length unit).

**Outputs:** interior angle (deg), apothem, circumradius, across-flats, across-corners, perimeter, and area.

## 3. Worked example

A regular hexagon with a 2 in side:

```
interior angle = (6 - 2) 180 / 6 = 120 deg
apothem = 2 / (2 tan30) = 1.732 in,  across flats = 3.464 in
circumradius = 2 / (2 sin30) = 2.000 in,  across corners = 4.000 in
area = 6 x 2^2 / (4 tan30) = 10.39 in^2
```

A 2 in hex measures 3.464 in across the flats and 4.000 in across the corners, with a 10.39 in^2 area -- the numbers
for cutting hex stock, laying out a six-sided frame, or checking a wrench opening. An octagon of the same 2 in side
opens 135 degrees and 4.828 in across the flats.

## 4. Scope and non-goals

The geometry of a regular (equal-sided, equal-angled) convex polygon; irregular polygons, the miter/bevel to cut it
(`polygon-miter`), and a bolt pattern on it (`bolt-circle`) are separate. Plane figures only. A shop and layout aid;
verify critical dimensions on the work.
