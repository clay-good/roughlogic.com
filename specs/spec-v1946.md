# roughlogic.com Specification v1946 -- Minimum Weld Preheat (CET Method) (`calc-fab.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> welding bench in `calc-fab.js`, no new dependency and no network call.
>
> **The gap.** `carbon-equivalent` gives a weldability band; `weld-cooling-rate-t85` and `interpass-temperature-control`
> take the preheat as given. Nothing computed the minimum preheat from chemistry, thickness, hydrogen, and heat input.

Repository: github.com/clay-good/roughlogic.com -- US standards only (this is the European CET method, disclosed as such).

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a negative element,
an efficiency outside (0, 1], or CET, thickness, hydrogen, or effective heat input outside the method's ranges returns
`{ error }`. Citation: EN 1011-2 Annex C Method B as published by Dillinger, GOVERNANCE.general. Aliases:
`weld preheat temperature`, `cet preheat`, `hydrogen cracking preheat`, `en 1011-2 preheat`,
`what preheat do i need for this steel`.

## 2. The tile

### 2.1 `weld-preheat-cet`

| Quantity | Relation |
|---|---|
| CET | C + (Mn + Mo)/10 + (Cr + Cu)/20 + Ni/40 |
| Effective heat input | Q = arc energy x efficiency / 25.4 kJ/mm |
| Preheat | Tp = 697 CET + 160 tanh(d/35) + 62 HD^0.35 + (53 CET - 32) Q - 328 degC |

## 3. Worked example (registry row, first principles)

0.18 C, 1.4 Mn, 0.2 Cu, 0.1 Ni; 1-1/4 in; HD 5; 40 kJ/in at 0.8: CET 0.3325, Q 1.26 kJ/mm, Tp 109.7 degC (229 F).
