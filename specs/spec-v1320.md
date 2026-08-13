# roughlogic.com Specification v1320 -- Annulus (Ring) Area (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1319.md.
>
> **The gap.** The catalog has the area of a full circle, an ellipse, and a polygon, but no **annulus** -- the ring
> between two circles. It is the metal cross-section area of a pipe or tube (the number behind its weight and stress),
> the face area of a washer, gasket, or ring flange, and the area of a circular border or track. This adds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive outer diameter, a negative inner diameter, or an inner diameter not smaller than the outer returns
`{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the annulus area
`(pi/4)(D^2 - d^2)` (standard plane geometry; Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `annulus-area` -- Annulus (Ring) Area

```
ring area = (pi/4)(D^2 - d^2) = pi(R^2 - r^2)
outer area = (pi/4) D^2       bore area = (pi/4) d^2       wall = (D - d)/2
```

`D` is the outer diameter and `d` the inner (bore) diameter. The ring area is the outer circle minus the hole -- the
material left in a tube wall, a washer, or a flange face. When `d = 0` it is a full circle.

**Inputs:** outer diameter D, inner (bore) diameter d (same length unit).

**Outputs:** ring (annulus) area, the outer and bore circle areas, and the wall thickness.

## 3. Worked example

A 6.625 in OD, 6.065 in ID pipe (NPS 6, schedule 40):

```
ring area = (pi/4)(6.625^2 - 6.065^2) = (pi/4)(43.89 - 36.78) = 5.58 in^2
outer = 34.47 in^2,  bore = 28.89 in^2,  wall = (6.625 - 6.065)/2 = 0.280 in
```

The pipe metal cross-section is 5.58 in^2 -- the published value for 6 in schedule-40 pipe, and the number you
multiply by the steel density (0.2836 lb/in^3) to get its 19 lb/ft weight or by the allowable stress to get its
tension capacity. The bore area 28.89 in^2 is the flow area.

## 4. Scope and non-goals

The area of a flat annulus (concentric ring); an eccentric ring, a partial (sector) ring, and the volume of a tube
(ring area x length) are separate. Plane figure only. A shop and layout aid; verify critical dimensions on the work.
