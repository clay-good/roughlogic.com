# roughlogic.com Specification v1309 -- Triangle Solver: Two Sides + Included Angle (calc-layout.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-layout.js`**
> (Group G, layout), no new module or dependency. Inherits spec.md through spec-v1308.md.
>
> **The gap.** The only "triangle" tile is the electrical `power-triangle`; there is no general **oblique-triangle**
> solver. The everyday layout question -- two sides and the angle between them, what is the third side? -- is the
> law of cosines, used for a corner brace, a hip or valley rafter, a guy from a known spread, or a survey leg. This
> adds that solve (SAS): third side, the other two angles, and the area.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive side, or an included angle outside 0-180 degrees returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the law of cosines `c^2 = a^2 + b^2 - 2ab cos(C)` and the SAS area
`(1/2) ab sin(C)` (standard trigonometry), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `triangle-sas` -- Triangle Solver (Two Sides and the Included Angle)

```
c = sqrt(a^2 + b^2 - 2ab cos(C))       third side (law of cosines)
A = acos((b^2 + c^2 - a^2)/(2bc))      angle opposite side a
B = 180 - C - A                         angle opposite side b
area = (1/2) ab sin(C)
```

`a` and `b` are the two known sides and `C` the angle between them. When `C = 90` degrees this reduces to the
Pythagorean theorem, `c = sqrt(a^2 + b^2)`; for any other angle it is the general triangle. The sides carry whatever
length unit you enter, and the result is in the same unit.

**Inputs:** side a, side b (any consistent length unit), included angle C (deg).

**Outputs:** third side c, angle A (opposite a), angle B (opposite b), and the triangle area.

## 3. Worked example

Two sides of 10 and 8 with a 60-degree angle between them:

```
c = sqrt(10^2 + 8^2 - 2 x 10 x 8 cos60) = sqrt(84) = 9.165
A = acos((8^2 + 9.165^2 - 10^2)/(2 x 8 x 9.165)) = 70.9 deg
B = 180 - 60 - 70.9 = 49.1 deg,  area = (1/2)(10)(8) sin60 = 34.64
```

The third side is 9.165 units and the corner opens 70.9 and 49.1 degrees. Set the included angle to 90 and the same
10 and 8 give exactly 12.806 -- the 3-4-5-style hypotenuse -- confirming the general solve collapses to Pythagoras
at a square corner.

## 4. Scope and non-goals

The SAS solve (two sides and the included angle); the other cases -- SSS (three sides, for angles), ASA/AAS (a side
and two angles), and the ambiguous SSA -- are separate. Plane triangles only. A layout aid; verify critical
dimensions on the work.
