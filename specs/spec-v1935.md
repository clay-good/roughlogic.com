# roughlogic.com Specification v1935 -- Eccentrically Loaded Column (Secant Formula) (`calc-machining.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> machine-design bench in `calc-machining.js`, no new dependency and no network call.
>
> **The gap.** `euler-johnson-column` covers a centered load and said the secant formula (eccentric load) was
> separate; no tile computed it. A strut, push rod, or post loaded off center fails well below its Euler load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive load,
fiber distance, modulus, I, A, or length, a negative eccentricity or yield strength, a modulus entered in ksi, or a
load at or above the Euler load returns `{ error }`. Citation: Beer, Johnston and DeWolf Sec. 10.6 and Shigley Ch. 4 by
name, GOVERNANCE.general. Aliases: `secant formula column`, `eccentric column load`,
`eccentrically loaded column stress`, `column load off center`, `how much does an off center load weaken a column`.

## 2. The tile

### 2.1 `column-secant-formula` -- Eccentrically Loaded Column (Secant Formula)

| Quantity | Relation |
|---|---|
| Euler load | Pcr = pi^2 E I/(K L)^2, K by end condition as in `euler-johnson-column` |
| Peak stress | sigma_max = (P/A)[1 + (e c/r^2) sec((pi/2) sqrt(P/Pcr))], r^2 = I/A |
| Deflection | y_max = e[sec((pi/2) sqrt(P/Pcr)) - 1] |
| Load at first yield | solve sigma_max(P) = Sy by bisection on (0, Pcr), when Sy is entered |

## 3. Worked example (registry row)

Beer and Johnston Sample Problem 10.2 (3rd ed.; free course slides from Benha University): an 8 ft fixed-free tube,
I = 8.0 in^4, A = 3.54 in^2, c = 2 in, E = 29e6 psi, Pcr = 62.1 kips, P = 31.1 kips at e = 0.75 in. Printed:
y = 0.939 in, sigma = 22.0 ksi. Computed: 0.942 in, 21,939 psi (P entered as the rounded 31,100 lbf).
