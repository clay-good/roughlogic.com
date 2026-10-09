# roughlogic.com Specification v1933 -- Triangle Solver: Two Sides and a Non-Included Angle (SSA, the Ambiguous Case) (`calc-layout.js`, Group G, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group G, the
> triangle-solver family in `calc-layout.js`, no new dependency and no network call.
>
> **The gap.** `triangle-sas`, `triangle-sss`, and `triangle-asa` each said the ambiguous SSA case was separate, and
> no tile solved it. A layout hand who knows two sides and an angle that is not between them needs to know whether
> zero, one, or two triangles fit before trusting a third side.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive angle or
side, an angle of 180 degrees or more, or a combination that fits no triangle returns `{ error }` saying why. Citation:
the law of sines with the ambiguous-case test, first-principles plane trigonometry by name, GOVERNANCE.general.
Aliases: `ambiguous case triangle`, `ssa triangle solver`, `law of sines ambiguous case`,
`two sides and a non included angle`, `why does my triangle have two answers`.

## 2. The tile

### 2.1 `triangle-ssa` -- Triangle Solver (Two Sides and a Non-Included Angle, the Ambiguous Case)

| Case | Triangles |
|---|---|
| A < 90, a < b sin A | none (error) |
| A < 90, a = b sin A | one, B = 90 |
| A < 90, b sin A < a < b | two: B1 = asin(b sin A / a), B2 = 180 - B1 |
| A < 90, a >= b | one |
| A >= 90 | one if a > b, else none (error) |

Then C = 180 - A - B, c = a sin C / sin A, area = (1/2) a b sin C for each triangle.

## 3. Worked examples (registry rows)

| Inputs (A, a, b) | Result |
|---|---|
| 49.11, 8, 10 | two: B 70.90 / C 59.99 / c 9.164 (the sibling solvers' 10-8-9.165 triangle) and B 109.10 / C 21.79 / c 3.929 |
| 30, 5, 10 | one right triangle: B 90, c 8.660 |
| 40, 12, 10 | one: B 32.39 |
