# roughlogic.com Specification v1934 -- Natural Gas Compressibility Factor Z (Sutton, Wichert-Aziz, Dranchuk-Abou-Kassem) (`calc-oilgas.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> oil, gas and pipeline bench in `calc-oilgas.js`, no new dependency and no network call.
>
> **The gap.** `gas-pipeline-flow` and `separator-retention-sizing` take the compressibility factor Z as an ENTERED
> input, and no tile computed it. Assuming 1.0 at line pressure understates pipeline flow and misstates separator gas
> velocity.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a gravity outside
(0.55, 2), negative or 100%+ CO2/H2S, only one of the two pseudo-criticals entered, or a pseudo-reduced point outside
the DAK range (1.0 < Tpr <= 3.0, Ppr <= 30) returns `{ error }`. Citation: Sutton (SPE 14265, 1985), Wichert-Aziz
(1972), Dranchuk-Abou-Kassem (1975) by name, GOVERNANCE.general. Aliases: `gas z factor`,
`natural gas compressibility factor`, `dranchuk abou-kassem`, `standing katz z factor`,
`what z factor do i use for natural gas`.

## 2. The tile

### 2.1 `gas-z-factor` -- Natural Gas Compressibility Factor Z

| Step | Relation |
|---|---|
| Pseudo-criticals | Tpc = 169.2 + 349.5 G - 74.0 G^2 degR, Ppc = 756.8 - 131.0 G - 3.6 G^2 psia, unless both are entered |
| Sour gas | epsilon = 120 (A^0.9 - A^1.6) + 15 (B^0.5 - B^4); T'pc = Tpc - epsilon; P'pc = Ppc T'pc / (Tpc + B(1 - B) epsilon) |
| Z | DAK eleven-constant equation, rho_r = 0.27 Ppr / (Z Tpr), solved by bisection |
| Extras | density = P M / (Z R T); Bg = Z T Psc / (P Tsc) at 14.696 psia, 60 F |

## 3. Worked examples (registry rows)

Mahmud, Elmabrouk and Sbiga, IEOM 2018 (free PDF), Table 8, Sutton column (Tpc 396.60 degR, Ppc 677.48 psia):
Z = 0.95530 / 0.91207 / 0.93634 at 716.48 / 2,123.3 / 3,500 psia, matching the paper to 5 decimals at all nine
pressures. The paper prints no temperature; 742.1 degR (282.44 F) reproduces its closed-form Papay column to 6 digits,
and the DAK values then follow independently. Wichert-Aziz for 5% CO2 and 10% H2S gives epsilon = 20.735 degR.
