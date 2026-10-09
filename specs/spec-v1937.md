# roughlogic.com Specification v1937 -- Fatigue Notch Factor Kf (Notch Sensitivity) (`calc-machining.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> fatigue bench in `calc-machining.js`, no new dependency and no network call.
>
> **The gap.** `fatigue-safety-factor`, `endurance-limit-marin`, and `fatigue-finite-life` all take a nominal stress
> and said notch Kf was separate. A shoulder, groove, or hole is where shafts fail in fatigue.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: Kt below 1, a
non-positive radius, Sut in kpsi, Sut outside 50,000 to 250,000 psi, or an unknown load type returns `{ error }`.
Citation: Shigley Ch. 6 Eqs. 6-32 to 6-35 by name, GOVERNANCE.general. Aliases: `notch sensitivity`,
`fatigue stress concentration factor kf`, `kt to kf`, `neuber notch sensitivity`,
`how much does a fillet radius help fatigue`.

## 2. The tile

### 2.1 `fatigue-notch-sensitivity` -- Fatigue Notch Factor Kf

| Quantity | Relation |
|---|---|
| Neuber constant, bending/axial | sqrt(a) = 0.246 - 3.08e-3 Sut + 1.51e-5 Sut^2 - 2.67e-8 Sut^3 (Sut kpsi, sqrt(in)) |
| Neuber constant, torsion | sqrt(a) = 0.190 - 2.51e-3 Sut + 1.35e-5 Sut^2 - 2.67e-8 Sut^3 |
| Notch sensitivity | q = 1/(1 + sqrt(a)/sqrt(r)) |
| Factor | Kf = 1 + q (Kt - 1) |

## 3. Worked example (registry row)

Shigley Example 6-6: Sut 690 MPa (100 kpsi), 3 mm fillet (0.1181 in), Kt 1.65. Printed: sqrt(a) = 0.0622 sqrt(in),
Kf = 1.55. Computed: 0.0623, q = 0.847, Kf = 1.550.
