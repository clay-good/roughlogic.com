# roughlogic.com Specification v1314 -- Ellipse Area and Perimeter (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1313.md.
>
> **The gap.** The catalog has circle and polygon geometry but no **ellipse**. The area and perimeter of an oval come
> up constantly -- an elliptical planter or lawn bed, a running-track lane, an oval tabletop or arch, an elliptical
> tank head or oval duct footprint. The area is exact; the perimeter has no elementary closed form, so this uses the
> standard Ramanujan approximation (good to a few parts per million for ordinary ovals).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive major or minor axis returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ellipse area `pi a b` and Ramanujan's perimeter approximation `pi[3(a+b) - sqrt((3a+b)(a+3b))]`
(standard geometry; Ramanujan 1914), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `ellipse-area-perimeter` -- Ellipse Area and Perimeter

```
a = major/2,  b = minor/2               semi-axes
area = pi a b
perimeter ~= pi[3(a + b) - sqrt((3a + b)(a + 3b))]     Ramanujan approximation
eccentricity = sqrt(1 - (b/a)^2)        (with a the larger semi-axis)
```

Enter the full major and minor axis lengths (the long and short widths). When they are equal the ellipse is a
circle: the area becomes `pi r^2` and the perimeter `2 pi r`. The Ramanujan perimeter is not exact -- no simple
formula is -- but it is within a few millionths for any ordinary oval.

**Inputs:** major axis (full long width), minor axis (full short width), same length unit.

**Outputs:** area, perimeter, the two semi-axes, and the eccentricity.

## 3. Worked example

An oval 10 ft long and 6 ft wide:

```
a = 5,  b = 3
area = pi x 5 x 3 = 47.12 ft^2
perimeter = pi[3(5 + 3) - sqrt((15 + 3)(5 + 9))] = pi x 8.126 = 25.53 ft
eccentricity = sqrt(1 - (3/5)^2) = 0.80
```

The oval covers 47.1 ft^2 and its edge runs 25.5 ft -- the numbers for sodding the bed, edging the border, or
cutting the rim. Make the two axes equal (say 8 by 8) and it collapses to a circle: 50.3 ft^2 and 25.1 ft, exactly
`pi r^2` and `2 pi r`.

## 4. Scope and non-goals

The area (exact) and perimeter (Ramanujan approximation) of an ellipse; a partial (segment) area, an elliptical
tank's partial-fill volume, and a true elliptic-integral perimeter are separate. Plane figure only. A shop and
layout aid; verify critical dimensions on the work.
