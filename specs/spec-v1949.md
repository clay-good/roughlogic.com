# roughlogic.com Specification v1949 -- Orifice Discharge Coefficient (Reader-Harris/Gallagher) (`calc-velocity.js`, Group C, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group C, the
> differential-pressure flow bench in `calc-velocity.js`, no new dependency and no network call.
>
> **The gap.** `dp-flow-meter`, `gas-dp-flow-meter` and `orifice-pressure-loss` all take the orifice discharge
> coefficient as an entered number (0.61 by default); nothing computed it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive pipe,
bore, Reynolds number, flow or viscosity, a bore not smaller than the pipe, or an unknown tap position returns
`{ error }`. Citation: ISO 5167-2:2003 (ASME MFC-3M) by name, GOVERNANCE.general. Aliases:
`orifice discharge coefficient`, `reader-harris gallagher`, `orifice plate coefficient`, `iso 5167 orifice`,
`what discharge coefficient does my orifice plate have`.

## 2. The tile

### 2.1 `orifice-discharge-coefficient`

| Quantity | Relation |
|---|---|
| Discharge coefficient | Reader-Harris/Gallagher: C = 0.5961 + 0.0261 b^2 - 0.216 b^8 + 0.000521 (1e6 b/Re)^0.7 + (0.0188 + 0.0063 A) b^3.5 (1e6/Re)^0.3 + (0.043 + 0.080 e^-10L1 - 0.123 e^-7L1)(1 - 0.11 A) b^4/(1 - b^4) - 0.031 (M2 - 0.8 M2^1.1) b^1.3 |
| Tap terms | corner L1 = L2 = 0; D and D/2 L1 = 1, L2 = 0.47; flange L1 = L2 = 1 in/D |
| Small pipe | + 0.011 (0.75 - b)(2.8 - D in) under 2.8 in |
| Flow coefficient | C/sqrt(1 - b^4) |
| Reynolds number | entered, or 4Q/(pi D nu) from gpm and cSt |
| Limits of use | bore >= 12.5 mm, 50 <= D <= 1,000 mm, 0.1 <= b <= 0.75, Re >= 5,000 (16,000 b^2 above b 0.56; 170 b^2 D(mm) for flange taps), flagged |

## 3. Worked examples (registry rows)

- 4.026 in pipe, 2.013 in bore, flange taps, Re 200,000: C = 0.60489, flow coefficient 0.62472, C at infinite Re 0.60114.
- The fluids library's `C_Reader_Harris_Gallagher` docstring case (D = 0.07391 m, Do = 0.0222 m, flange taps,
  Re 111,742): C = 0.5990326, matched to seven digits.
- 100 gpm of water (1 cSt) in the 4.026 in pipe: Re = 78,553.
