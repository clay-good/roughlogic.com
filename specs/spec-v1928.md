# roughlogic.com Specification v1928 -- Prying Action in Tee and Angle Flanges (AISC Manual Part 9) (`calc-steelpanelzone.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-07. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> steel-connection module `calc-steelpanelzone.js`, no new dependency and no network call.
>
> **The gap.** The bolt-tension tiles (`steel-bolt-tension-shear`, `slip-critical-with-tension`) take the tension per
> bolt at face value, and the slip-critical note says prying "is not modeled here and matters most on thin end
> plates and tees". No tile computed it, though it decides the flange of every WT hanger and tee connection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive tension,
bolt strength, diameter, length, thickness, or Fu; a hole smaller than the bolt; p not greater than the hole; b not
greater than half the bolt; or a method other than LRFD/ASD returns `{ error }`. Citation: AISC Manual Part 9 by name,
worked as AISC Design Example II.D-1 (free), GOVERNANCE.general. Aliases: `prying action`, `bolt prying force`,
`tee flange prying`, `wt hanger flange thickness`, `angle prying tension`.

## 2. The tile

### 2.1 `bolt-prying-action` -- Prying Action in Tee and Angle Flanges (AISC Manual Part 9)

| Quantity | Relation |
|---|---|
| Geometry | b' = b - d/2; a' = min(a, 1.25 b) + d/2; rho = b'/a'; delta = 1 - d'/p |
| Minimum thickness | t_min = sqrt(k T b' / (p Fu (1 + delta alpha'))); alpha' = 1 if beta >= 1, else min(1, beta / (delta (1 - beta))); beta = (B/T - 1) / rho |
| Prying negligible | t = sqrt(k T b' / (p Fu)) |
| Available tension at t | t_c = sqrt(k B b' / (p Fu)); alpha = ((t_c/t)^2 - 1) / (delta (1 + rho)); B when alpha < 0, B (t/t_c)^2 (1 + delta alpha) to alpha = 1, B (t/t_c)^2 (1 + delta) beyond |

k = 4/0.90 (LRFD) or 4 x 1.67 (ASD). The hole defaults to d + 1/16 in.

## 3. Worked example (registry row)

AISC Design Example II.D-1 (LRFD): WT8x28.5, b 1.79 in, a 1.56 in, 3/4 in bolts in 13/16 in holes at p = 4 in,
T 20 kip and B 29.8 kip per bolt, Fu 65 ksi. Printed: rho 0.732, delta 0.797, alpha' 1.0, t_min 0.521 in, 0.696 in for
negligible prying. The tile gives 0.519 and 0.696 (b' unrounded, 4/0.90 for 4.44); ASD reproduces 0.521 and 0.698.
