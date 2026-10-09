# roughlogic.com Specification v1941 -- Clutch or Brake Engagement Energy and Heat (`calc-machining.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> clutch and brake bench in `calc-machining.js`, no new dependency and no network call.
>
> **The gap.** `disk-clutch-torque` gives the torque a clutch can carry and said the heat of engagement was separate.
> A clutch or brake that slips too often or too long overheats long before it runs out of torque.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive inertia,
a negative speed, torque, or weight, equal speeds, or a weight without a positive specific heat returns `{ error }`.
Citation: Shigley Ch. 16, energy considerations, by name, GOVERNANCE.general. Aliases: `clutch engagement energy`,
`clutch heat per engagement`, `brake heat dissipation`, `clutch slip time`, `how hot does a clutch get`.

## 2. The tile

### 2.1 `clutch-engagement-energy`

| Quantity | Relation |
|---|---|
| Inertia | I = WR^2 / g |
| Energy | E = I1 I2 (w1 - w2)^2 / (2 (I1 + I2)), BTU = ft lb / 778.169 |
| Common speed | (WR1^2 n1 + WR2^2 n2)/(WR1^2 + WR2^2) |
| Slip time | t = I1 I2 (w1 - w2)/(T (I1 + I2)) |
| Temperature rise | dT = E/(C m) |

## 3. Worked example (registry row, first principles)

20 lb ft2 drive at 1,800 rpm picking up a 10 lb ft2 load from rest: E = 3,681 ft lb (4.73 BTU), common speed 1,200 rpm,
0.391 s at 100 lb ft of slip torque, 2.63 F rise in 15 lb of steel.
