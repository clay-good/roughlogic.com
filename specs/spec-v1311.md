# roughlogic.com Specification v1311 -- Triangle Solver: Two Angles + Included Side (ASA) (calc-layout.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-layout.js`**
> (Group G, layout), no new module or dependency. Inherits spec.md through spec-v1310.md.
>
> **The gap.** `triangle-sas` (two sides + angle) and `triangle-sss` (three sides) leave the **triangulation** case:
> a measured baseline and the two angles to a point you cannot reach directly. It is how a surveyor or layout hand
> finds the distance to an inaccessible corner, tower, or bank -- sight the target from both ends of a known
> baseline and turn the two angles. This adds the ASA solve (law of sines), completing the triangle-solver family.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive baseline, a non-positive angle, or two angles that sum to 180 degrees or more returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the law of sines `a/sin(A) = c/sin(C)` with
`C = 180 - A - B` (standard trigonometry), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `triangle-asa` -- Triangle Solver (Two Angles and the Included Side)

```
C = 180 - A - B                        the third (far) angle
a = c sin(A)/sin(C)                     side opposite A (law of sines)
b = c sin(B)/sin(C)                     side opposite B
area = (1/2) a b sin(C)
```

`A` and `B` are the two angles turned at the ends of the known baseline `c` (the side between them); `a` and `b` are
the distances from those two ends to the far point. The two angles must sum to less than 180 degrees or the sight
lines never meet. This is the plane-triangulation solve; for the other cases see `triangle-sas` and `triangle-sss`.

**Inputs:** angle A (deg), angle B (deg), included side (baseline) c.

**Outputs:** the third angle C, side a (opposite A), side b (opposite B), and the area.

## 3. Worked example

From a 9.165 ft baseline, the target is sighted at 70.89 degrees from one end and 49.11 degrees from the other:

```
C = 180 - 70.89 - 49.11 = 60.0 deg
a = 9.165 sin(70.89)/sin(60) = 10.00 ft
b = 9.165 sin(49.11)/sin(60) = 8.00 ft,  area = (1/2)(10)(8) sin60 = 34.64
```

The far point is 10.0 ft from one baseline end and 8.0 ft from the other -- the same 10-8-9.165 triangle
`triangle-sas` and `triangle-sss` produce, so all three solvers agree. That is triangulation: two angles off a
measured baseline reach a distance you never had to tape.

## 4. Scope and non-goals

The ASA/AAS solve (two angles and a side) by the law of sines; the SAS and SSS cases are `triangle-sas` and
`triangle-sss`, and the ambiguous SSA (two sides and a non-included angle) is separate. Plane triangles only. A
layout aid; verify critical dimensions on the work.
