# roughlogic.com Specification v1936 -- Finite-Life Fatigue Strength and Life (S-N Line) (`calc-machining.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> fatigue bench in `calc-machining.js`, no new dependency and no network call.
>
> **The gap.** `fatigue-safety-factor` and `endurance-limit-marin` stop at infinite life, and both said finite-life
> S-N was separate. A part that must last a known number of cycles, or one stressed above Se, had no answer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive Sut or
Se, Sut entered in kpsi, f outside (0, 1], cycles outside 10^3 to 10^6, neither cycles nor stress entered, f Sut at or
below Se, or Sut above 200 kpsi with f blank returns `{ error }`. Citation: Shigley, Mischke and Budynas Ch. 6 by name,
GOVERNANCE.general. Aliases: `s-n curve calculator`, `finite life fatigue strength`, `fatigue life cycles to failure`,
`basquin equation`, `how many cycles will this part last`.

## 2. The tile

### 2.1 `fatigue-finite-life` -- Finite-Life Fatigue Strength and Life (S-N Line)

| Quantity | Relation |
|---|---|
| f | entered, or 1.06 - 2.8e-3 Sut + 6.9e-6 Sut^2 (kpsi, 70 to 200), 0.9 below 70 kpsi |
| Line | a = (f Sut)^2/Se, b = -(1/3) log10(f Sut/Se) |
| Strength | Sf = a N^b, 10^3 <= N <= 10^6 |
| Life | N = (sigma_a/a)^(1/b) for Se < sigma_a <= f Sut; infinite at or below Se; low-cycle above f Sut |

## 3. Worked example (registry row)

Shigley Example 6-2, 1050 HR steel: Sut 90 kpsi, Se' 45 kpsi, f 0.86. Printed: a 133.1 kpsi, b -0.0785,
Sf(10^4) 64.6 kpsi, life at 55 kpsi 77,500 cycles. Computed: 133,128 psi, -0.07851, 64,600 psi, 77,614 cycles
(the book rounds a and b before raising to the 1/b power).
