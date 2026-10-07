# roughlogic.com Specification v1927 -- CIPP Liner Thickness, Fully Deteriorated Host (ASTM F1216) (`calc-trenchless.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-07. Single-tile spec.** Completes the design pair that [spec-v1603](spec-v1603.md) started.
> In scope under the spec-v106 trades-only charter: Group E, `calc-trenchless.js`, no new dependency and no network call.
>
> **The gap.** `cipp-liner-thickness` computes only the partially deteriorated case and says so: the fully
> deteriorated case "needs the soil modulus, the live load, and the water buoyancy factor" and was left out rather
> than approximated. That case is the one a liner in a collapsing host is designed to, and it is usually the thicker.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive
diameter, cover, modulus, or strength; ovality outside 0 to 100; groundwater above the ground surface; or an initial
modulus below the long-term one returns `{ error }`. Citation: ASTM F1216 Appendix X1 by name, worked as in the Iowa
SUDAS Design Manual Section 14C-2 (free), GOVERNANCE.general. Aliases: `fully deteriorated cipp`, `cipp fully
deteriorated design`, `astm f1216 fully deteriorated`, `cipp liner soil load`, `host pipe not structural liner`.

## 2. The tile

### 2.1 `cipp-fully-deteriorated` -- CIPP Liner Thickness, Fully Deteriorated Host (ASTM F1216)

| Check | Relation |
|---|---|
| X1.3 load | t = [0.375 (N q_t / C)^2 D^3 / (E_L R_w B' E's)]^(1/3); q_t = 0.433 H_w + w H_s R_w / 144 + W_s; R_w = 1 - 0.33 H_w / H_s, not under 0.67; B' = 1 / (1 + 4 e^(-0.065 H_s)) |
| X1.4 stiffness | E I / D^3 at least 0.093 on the initial modulus: t = D (1.116 / E)^(1/3) |
| X1.1 buckling | the partially deteriorated groundwater relation (only with groundwater above the pipe) |
| X1.2 bending | 1.5 (q/100)(1 + q/100) DR^2 - 0.5 (1 + q/100) DR = sigma_L / (P_w N), solved for DR (only with ovality and groundwater) |

The answer is the greatest of the four, named. Outputs: each check's thickness, the governing one and its DR, the
load breakdown, and the ovality bending stress at the governing thickness.

## 3. Worked example (registry row)

Iowa SUDAS 14C-2 Figure 14C-2.03: 12 in VCP, 5 ft of 120 pcf cover, 2 ft of groundwater, HS-20 at 2 psi, 5% ovality,
E 300,000 / E_L 150,000 / E's 1,000 psi, N 2. The manual gives P_t 6.5 psi, t 0.199 in, minimum 0.186 in. The tile
gives 0.1996 in (B' unrounded). The manual's bending step uses 0.4 psi of water where its Step 1 gives 0.87; the
tile uses 0.87 (439 psi, against 2,500 psi allowed).
