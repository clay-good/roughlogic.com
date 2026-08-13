# roughlogic.com Specification v1316 -- Parabolic Segment Area and Arc Length (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1315.md.
>
> **The gap.** `circular-segment-area` gives the area under a circular arc, but nothing handles a **parabolic**
> segment -- the shape of a parabolic arch, a road or deck crown, the sag of a uniformly loaded cable or a suspension
> span, or a parabolic reflector cross-section. This adds the parabolic segment area (the tidy 2/3 of the enclosing
> rectangle) and the true arc length of the curve.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive base (span) or height (rise) returns `{ error }`; no numeric field is ever `Infinity`. Citation
discipline (v19/v22): the parabolic segment area `(2/3) b h` and the exact parabolic arc length
`(1/2) sqrt(b^2 + 16 h^2) + (b^2/(8h)) ln((4h + sqrt(b^2 + 16 h^2))/b)` (standard geometry; Machinery's Handbook),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `parabolic-segment` -- Parabolic Segment Area and Arc Length

```
area = (2/3) b h                        b the base (span/chord), h the height (rise) at midspan
root = sqrt(b^2 + 16 h^2)
arc length = (1/2) root + (b^2/(8h)) ln((4h + root)/b)
```

`b` is the span (the straight chord) and `h` the rise at the middle. The area is exactly two-thirds of the `b x h`
rectangle that boxes the segment -- Archimedes' result -- so it always beats the triangle (1/2) and loses to the
rectangle. The arc length is the exact length of the curved edge; as the rise goes to zero it approaches the chord.

**Inputs:** base / span b, height / rise h (same length unit).

**Outputs:** segment area, curved arc length, and the chord (= base) for comparison.

## 3. Worked example

A parabolic arch spanning 20 ft with a 5 ft rise:

```
area = (2/3)(20)(5) = 66.67 ft^2
root = sqrt(20^2 + 16 x 5^2) = sqrt(800) = 28.28
arc = (1/2)(28.28) + (20^2/(8 x 5)) ln((20 + 28.28)/20) = 14.14 + 10 x 0.881 = 22.96 ft
```

The arch encloses 66.7 ft^2 and its curved edge runs 22.96 ft over a 20 ft chord -- the numbers to lay out the form,
takeoff the sheathing, or cut the rib. Flatten the rise toward zero and the arc length collapses to the 20 ft chord,
as it must.

## 4. Scope and non-goals

The area and arc length of a parabolic segment (a symmetric parabola on a chord); a circular segment is
`circular-segment-area`, a true catenary (a hanging chain, slightly different from a parabola) and the enclosed
volume of a parabolic dish are separate. Plane figure only. A shop and layout aid; verify critical dimensions on the
work.
