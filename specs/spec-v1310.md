# roughlogic.com Specification v1310 -- Triangle Solver: Three Sides (SSS) (calc-layout.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-layout.js`**
> (Group G, layout), no new module or dependency. Inherits spec.md through spec-v1309.md.
>
> **The gap.** `triangle-sas` (spec-v1309) solves two sides and the included angle; its companion is the other
> everyday case -- **three measured sides, find the angles**. It is how you check whether a corner is square from a
> tape (the 3-4-5), read the angle of a brace or a lot line from three lengths, or get the area of any triangular
> patch (Heron's formula). This adds the SSS solve.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive side, or three sides that violate the triangle inequality (one side >= the sum of the other two)
returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the law of cosines solved
for the angles `A = acos((b^2 + c^2 - a^2)/(2bc))` and Heron's area formula (standard trigonometry), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `triangle-sss` -- Triangle Solver (Three Sides)

```
A = acos((b^2 + c^2 - a^2)/(2bc))      angle opposite a (law of cosines), likewise B, C
s = (a + b + c)/2                       semiperimeter
area = sqrt(s (s - a)(s - b)(s - c))    Heron's formula
```

Enter the three side lengths (same unit); the tile returns the angle opposite each and the area. A right angle
(90 degrees) opposite the longest side means the corner is square -- the 3-4-5 tape check made general. The three
sides must satisfy the triangle inequality or no triangle exists.

**Inputs:** side a, side b, side c (any consistent length unit).

**Outputs:** angles A, B, C (opposite a, b, c), and the area, with a note when a corner is square.

## 3. Worked example

Three measured sides of 10, 8, and 9.165:

```
A = acos((8^2 + 9.165^2 - 10^2)/(2 x 8 x 9.165)) = 70.9 deg
B = 49.1 deg,  C = 180 - 70.9 - 49.1 = 60.0 deg
s = 13.583,  area = sqrt(13.583 x 3.583 x 5.583 x 4.418) = 34.64
```

The three sides open 70.9, 49.1, and 60.0 degrees -- the same triangle `triangle-sas` produced from sides 10 and 8
at 60 degrees, so the two tiles agree. Measure 3, 4, and 5 instead and the angle opposite the 5 comes out exactly
90 degrees: the framer's square-corner check, generalized.

## 4. Scope and non-goals

The SSS solve (three sides); the SAS case is `triangle-sas`, and ASA/AAS (a side and two angles) and the ambiguous
SSA are separate. Plane triangles only. A layout aid; verify critical dimensions on the work.
