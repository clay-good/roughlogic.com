# roughlogic.com Specification v1256 -- Distance-Distance (Swing-Tie) Intersection (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v1255.md.
>
> **The gap.** `cogo-forward-point` locates by bearing + distance (polar) and `cogo-inverse-locate` reduces two points to
> a bearing/distance, but nothing locates a point from two measured distances to two known points -- the swing-tie method.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite coordinates, a non-positive distance, coincident control points, distances too short to meet (d > r0 + r1),
or one circle inside the other (d < |r0 - r1|) return `{ error }`. Citation discipline (v19/v22): first-principles
Euclidean geometry / trilateration (Ghilani & Wolf, Elementary Surveying), `GOVERNANCE.general`.

## 2. The tile

### 2.1 `distance-distance-intersection` -- Distance-Distance (Swing-Tie) Intersection

```
d  = |P1 - P0|
a  = (r0^2 - r1^2 + d^2) / (2 d)          foot of the crossing chord from P0
h  = sqrt(r0^2 - a^2)                     half-chord (real iff |r0-r1| <= d <= r0+r1)
Pm = P0 + a (P1 - P0)/d
solutions = Pm +/- h * (unit perpendicular to P0->P1)
```

**Inputs:** point 1 N/E (ft) and distance from it, point 2 N/E (ft) and distance from it.

**Outputs:** the two solution coordinates (N, E), the distance between control points, the chord offset h, and a tangent
flag.

## 3. Worked example

`P0 = N5000/E5000, r0 = 70.711 ft; P1 = N5000/E5100, r1 = 70.711 ft`:

```
d  = 100 ft;  a = (70.711^2 - 70.711^2 + 100^2)/(2*100) = 50;  h = sqrt(70.711^2 - 50^2) = 50
midpoint N5000/E5050;  solutions N4950/E5050 and N5050/E5050 (each 70.711 ft from both points)
```

Cross-check (tangent): points 100 ft apart, 40 ft and 60 ft measured, d = 40 + 60 so h = 0 and the single point is
N40/E0. Impossible readings (d > r0 + r1, or d < |r0 - r1|) are flagged.

## 4. Scope and non-goals

Two mirror-image solutions across the line between the control points; the field sketch or a third tie resolves the
side. Plane grid northing/easting geometry; grid scale factor and elevation are separate. A computational aid; the
project control and datum govern. calc-survey.js cap raised 17500 -> 20000 B.
